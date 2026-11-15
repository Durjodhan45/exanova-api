import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Question } from './entities/question.entity.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import {
  BulkQuestionsDto,
  CreateQuestionDto,
  ReorderQuestionsDto,
  UpdateQuestionDto,
} from './dto/create-question.dto.js';
import { ExaminationStatus, QuestionType } from '../../shared/enums/index.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly optionRepo: Repository<QuestionOption>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    private readonly dataSource: DataSource,
  ) {}

  private async assertExamEditable(testId: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({ where: { id: testId } });
    if (!exam) {
      throw new NotFoundException(`Examination with Test ID '${testId}' not found`);
    }
    if (exam.status !== ExaminationStatus.DRAFT && exam.status !== ExaminationStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot modify questions. Examination is currently in '${exam.status}' status.`,
      );
    }
    return exam;
  }

  async create(dto: CreateQuestionDto): Promise<Question> {
    await this.assertExamEditable(dto.testId);

    // Validate MCQ requirements
    if (dto.questionType === QuestionType.MCQ) {
      if (!dto.options || dto.options.length < 2) {
        throw new BadRequestException('MCQ questions must have at least 2 options');
      }
      const hasCorrect = dto.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        throw new BadRequestException('MCQ questions must have at least 1 correct option');
      }
    }

    const question = this.questionRepo.create({
      testId: dto.testId,
      questionText: dto.questionText,
      questionType: dto.questionType,
      marks: dto.marks,
      negativeMarks: dto.negativeMarks || '0.00',
      topic: dto.topic,
      difficulty: dto.difficulty,
      questionOrder: dto.questionOrder || 1,
      answerInstructions: dto.answerInstructions,
      evaluationCriteria: dto.evaluationCriteria,
      expectedAnswer: dto.expectedAnswer,
    });

    const savedQuestion = await this.questionRepo.save(question);

    if (dto.questionType === QuestionType.MCQ && dto.options) {
      const options = dto.options.map((opt, idx) =>
        this.optionRepo.create({
          questionId: savedQuestion.id,
          optionLabel: opt.optionLabel,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          optionOrder: opt.optionOrder || idx + 1,
        }),
      );
      savedQuestion.options = await this.optionRepo.save(options);
    }

    return savedQuestion;
  }

  async createBulk(dto: BulkQuestionsDto): Promise<Question[]> {
    await this.assertExamEditable(dto.testId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedQuestions: Question[] = [];

      for (let i = 0; i < dto.questions.length; i++) {
        const qDto = dto.questions[i];
        const question = queryRunner.manager.create(Question, {
          testId: dto.testId,
          questionText: qDto.questionText,
          questionType: qDto.questionType,
          marks: qDto.marks,
          negativeMarks: qDto.negativeMarks || '0.00',
          topic: qDto.topic,
          difficulty: qDto.difficulty,
          questionOrder: qDto.questionOrder || i + 1,
          answerInstructions: qDto.answerInstructions,
          evaluationCriteria: qDto.evaluationCriteria,
          expectedAnswer: qDto.expectedAnswer,
        });

        const saved = await queryRunner.manager.save(question);

        if (qDto.questionType === QuestionType.MCQ && qDto.options) {
          const options = qDto.options.map((opt, idx) =>
            queryRunner.manager.create(QuestionOption, {
              questionId: saved.id,
              optionLabel: opt.optionLabel,
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              optionOrder: opt.optionOrder || idx + 1,
            }),
          );
          saved.options = await queryRunner.manager.save(options);
        }
        savedQuestions.push(saved);
      }

      await queryRunner.commitTransaction();
      return savedQuestions;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Failed to save bulk questions: ${(err as Error).message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: PaginationQueryDto & { testId?: string; questionType?: QuestionType }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const qb = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.options', 'options')
      .orderBy('q.questionOrder', 'ASC')
      .addOrderBy('options.optionOrder', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.testId) {
      qb.andWhere('q.testId = :testId', { testId: query.testId });
    }
    if (query.questionType) {
      qb.andWhere('q.questionType = :type', { type: query.questionType });
    }
    if (query.search) {
      qb.andWhere('q.questionText ILIKE :search', { search: `%${query.search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, includeProtected = true): Promise<Question> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: { options: true, examination: true },
      order: { options: { optionOrder: 'ASC' } },
    });
    if (!question) {
      throw new NotFoundException(`Question with ID '${id}' not found`);
    }

    if (!includeProtected) {
      // Security: Strip answer keys for student views!
      if (question.options) {
        question.options = question.options.map((o) => {
          const { isCorrect, ...safeOption } = o;
          return safeOption as QuestionOption;
        });
      }
      delete question.evaluationCriteria;
      delete question.expectedAnswer;
    }

    return question;
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findById(id);
    await this.assertExamEditable(question.testId);

    if (dto.questionText) question.questionText = dto.questionText;
    if (dto.marks) question.marks = dto.marks;
    if (dto.negativeMarks !== undefined) question.negativeMarks = dto.negativeMarks;
    if (dto.topic !== undefined) question.topic = dto.topic;
    if (dto.difficulty !== undefined) question.difficulty = dto.difficulty;
    if (dto.questionOrder) question.questionOrder = dto.questionOrder;
    if (dto.answerInstructions !== undefined) question.answerInstructions = dto.answerInstructions;
    if (dto.evaluationCriteria !== undefined) question.evaluationCriteria = dto.evaluationCriteria;
    if (dto.expectedAnswer !== undefined) question.expectedAnswer = dto.expectedAnswer;

    const saved = await this.questionRepo.save(question);

    // Update options if provided
    if (question.questionType === QuestionType.MCQ && dto.options) {
      await this.optionRepo.delete({ questionId: id });
      const newOptions = dto.options.map((opt, idx) =>
        this.optionRepo.create({
          questionId: id,
          optionLabel: opt.optionLabel,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          optionOrder: opt.optionOrder || idx + 1,
        }),
      );
      saved.options = await this.optionRepo.save(newOptions);
    }

    return saved;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const question = await this.findById(id);
    await this.assertExamEditable(question.testId);
    await this.questionRepo.remove(question);
    return { deleted: true };
  }

  async duplicate(id: string): Promise<Question> {
    const original = await this.findById(id);
    await this.assertExamEditable(original.testId);

    const highestOrder = await this.questionRepo
      .createQueryBuilder('q')
      .where('q.testId = :testId', { testId: original.testId })
      .select('MAX(q.questionOrder)', 'max')
      .getRawOne();

    const newOrder = (highestOrder?.max || 0) + 1;

    const duplicateQuestion = this.questionRepo.create({
      testId: original.testId,
      questionText: `${original.questionText} (Copy)`,
      questionType: original.questionType,
      marks: original.marks,
      negativeMarks: original.negativeMarks,
      topic: original.topic,
      difficulty: original.difficulty,
      questionOrder: newOrder,
      answerInstructions: original.answerInstructions,
      evaluationCriteria: original.evaluationCriteria,
      expectedAnswer: original.expectedAnswer,
    });

    const saved = await this.questionRepo.save(duplicateQuestion);

    if (original.options && original.options.length > 0) {
      const duplicateOptions = original.options.map((opt) =>
        this.optionRepo.create({
          questionId: saved.id,
          optionLabel: opt.optionLabel,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          optionOrder: opt.optionOrder,
        }),
      );
      saved.options = await this.optionRepo.save(duplicateOptions);
    }

    return saved;
  }

  async reorder(dto: ReorderQuestionsDto): Promise<{ success: boolean; updatedCount: number }> {
    await this.assertExamEditable(dto.testId);

    for (const item of dto.orders) {
      await this.questionRepo.update(
        { id: item.questionId, testId: dto.testId },
        { questionOrder: item.order },
      );
    }

    return { success: true, updatedCount: dto.orders.length };
  }
}
