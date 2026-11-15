import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QuestionImport } from './entities/question-import.entity.js';
import { QuestionImportItem } from './entities/question-import-item.entity.js';
import { QuestionImportError } from './entities/question-import-error.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { QuestionOption } from '../questions/entities/question-option.entity.js';
import { ExcelQuestionParser } from './parsers/excel-question.parser.js';
import { WordQuestionParser } from './parsers/word-question.parser.js';
import { DifficultyLevel, ExaminationStatus, ImportStatus, QuestionType } from '../../shared/enums/index.js';
import { UpdateStagedQuestionDto } from './dto/update-staged-question.dto.js';

@Injectable()
export class QuestionImportsService {
  constructor(
    @InjectRepository(QuestionImport)
    private readonly importRepo: Repository<QuestionImport>,
    @InjectRepository(QuestionImportItem)
    private readonly itemRepo: Repository<QuestionImportItem>,
    @InjectRepository(QuestionImportError)
    private readonly errorRepo: Repository<QuestionImportError>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Upload and parse Word or Excel question document directly in memory.
   * File is never saved to disk or persistent document storage.
   */
  async processUpload(params: {
    testId: string;
    userId: string;
    file: Express.Multer.File;
  }) {
    const { testId, userId, file } = params;

    // 1. Validate examination exists and is editable
    const exam = await this.examRepo.findOne({ where: { id: testId } });
    if (!exam) {
      throw new NotFoundException(`Examination with Test ID '${testId}' not found`);
    }

    if (exam.status !== ExaminationStatus.DRAFT && exam.status !== ExaminationStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot import questions into an examination in '${exam.status}' status. Questions are frozen.`,
      );
    }

    // 2. Validate file type and extension
    const filename = file.originalname.toLowerCase();
    let fileFormat: 'DOCX' | 'XLSX';

    if (filename.endsWith('.docx')) {
      fileFormat = 'DOCX';
    } else if (filename.endsWith('.xlsx')) {
      fileFormat = 'XLSX';
    } else {
      throw new BadRequestException(
        'Unsupported file format. Only Microsoft Word (.docx) and Microsoft Excel (.xlsx) files are supported.',
      );
    }

    // 3. Parse directly from in-memory buffer
    let parseResult: {
      items: Array<any>;
      total: number;
      valid: number;
      invalid: number;
    };

    try {
      if (fileFormat === 'XLSX') {
        parseResult = await ExcelQuestionParser.parseBuffer(file.buffer);
      } else {
        parseResult = await WordQuestionParser.parseBuffer(file.buffer);
      }
    } catch (err) {
      throw new BadRequestException(`Failed to parse ${fileFormat} document: ${(err as Error).message}`);
    }

    if (parseResult.total === 0) {
      throw new BadRequestException('No questions could be extracted from the uploaded document');
    }

    // 4. Temporarily persist validated and extracted question data in PostgreSQL using question_import_items
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const questionImport = queryRunner.manager.create(QuestionImport, {
        testId,
        uploadedByUserId: userId,
        originalFilename: file.originalname, // Informational metadata only - no binary stored!
        fileFormat,
        fileSize: file.size,
        totalQuestions: parseResult.total,
        validQuestions: parseResult.valid,
        invalidQuestions: parseResult.invalid,
        status: parseResult.invalid > 0 ? ImportStatus.PENDING : ImportStatus.VALIDATED,
        validationSummary: {
          total: parseResult.total,
          valid: parseResult.valid,
          invalid: parseResult.invalid,
        },
      });

      const savedImport = await queryRunner.manager.save(questionImport);

      // Save staged items
      const stagedItems: QuestionImportItem[] = [];
      const importErrors: QuestionImportError[] = [];

      for (const item of parseResult.items) {
        const stagedItem = queryRunner.manager.create(QuestionImportItem, {
          importId: savedImport.id,
          testId,
          questionNumber: item.questionNumber,
          questionType: item.questionType,
          questionText: item.questionText,
          marks: item.marks,
          negativeMarks: item.negativeMarks,
          options: item.options,
          correctAnswer: item.correctAnswer,
          answerInstructions: item.answerInstructions,
          evaluationCriteria: item.evaluationCriteria,
          expectedAnswer: item.expectedAnswer,
          topic: item.topic,
          difficulty: item.difficulty,
          isValid: item.isValid,
          validationErrors: item.errors.length > 0 ? item.errors : undefined,
        });
        stagedItems.push(stagedItem);

        for (const err of item.errors) {
          importErrors.push(
            queryRunner.manager.create(QuestionImportError, {
              importId: savedImport.id,
              questionNumber: item.questionNumber,
              errorCode: err.code,
              errorDescription: err.error,
              fieldName: err.field,
              severity: 'ERROR',
            }),
          );
        }
      }

      await queryRunner.manager.save(stagedItems);
      if (importErrors.length > 0) {
        await queryRunner.manager.save(importErrors);
      }

      await queryRunner.commitTransaction();

      return {
        importId: savedImport.id,
        testId,
        fileFormat,
        totalQuestions: parseResult.total,
        validQuestions: parseResult.valid,
        invalidQuestions: parseResult.invalid,
        status: savedImport.status,
        hasErrors: parseResult.invalid > 0,
        errors: importErrors.map((e) => ({
          questionNumber: e.questionNumber,
          field: e.fieldName,
          error: e.errorDescription,
          code: e.errorCode,
        })),
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Failed to persist staging import data: ${(err as Error).message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getImport(importId: string): Promise<QuestionImport> {
    const record = await this.importRepo.findOne({
      where: { id: importId },
      relations: { items: true, errors: true, examination: true },
      order: { items: { questionNumber: 'ASC' } },
    });
    if (!record) {
      throw new NotFoundException(`Question import with ID '${importId}' not found`);
    }
    return record;
  }

  async getPreview(importId: string) {
    const importRecord = await this.getImport(importId);
    return {
      importId: importRecord.id,
      testId: importRecord.testId,
      filename: importRecord.originalFilename,
      fileFormat: importRecord.fileFormat,
      status: importRecord.status,
      totalQuestions: importRecord.totalQuestions,
      validQuestions: importRecord.validQuestions,
      invalidQuestions: importRecord.invalidQuestions,
      questions: importRecord.items,
    };
  }

  async getErrors(importId: string) {
    const errors = await this.errorRepo.find({
      where: { importId },
      order: { questionNumber: 'ASC' },
    });
    return errors;
  }

  async updateStagedQuestion(
    importId: string,
    questionId: string,
    dto: UpdateStagedQuestionDto,
  ): Promise<QuestionImportItem> {
    const importRecord = await this.getImport(importId);
    if (importRecord.status === ImportStatus.CONFIRMED) {
      throw new BadRequestException('Cannot edit questions of an already confirmed import');
    }

    const item = await this.itemRepo.findOne({
      where: { id: questionId, importId },
    });
    if (!item) {
      throw new NotFoundException(`Staged question with ID '${questionId}' not found`);
    }

    if (dto.questionText) item.questionText = dto.questionText;
    if (dto.questionType) item.questionType = dto.questionType;
    if (dto.marks) item.marks = dto.marks;
    if (dto.negativeMarks !== undefined) item.negativeMarks = dto.negativeMarks;
    if (dto.answerInstructions !== undefined) item.answerInstructions = dto.answerInstructions;
    if (dto.evaluationCriteria !== undefined) item.evaluationCriteria = dto.evaluationCriteria;
    if (dto.expectedAnswer !== undefined) item.expectedAnswer = dto.expectedAnswer;
    if (dto.topic !== undefined) item.topic = dto.topic;
    if (dto.difficulty !== undefined) item.difficulty = dto.difficulty;

    if (dto.options) {
      item.options = dto.options.map((o) => ({
        label: o.optionLabel,
        text: o.optionText,
        isCorrect: o.isCorrect,
      }));
    }

    if (dto.correctAnswer) {
      item.correctAnswer = dto.correctAnswer.toUpperCase();
      if (item.options) {
        item.options = item.options.map((o) => ({
          ...o,
          isCorrect: o.label === item.correctAnswer,
        }));
      }
    }

    // Revalidate this item
    const errors: Array<{ field: string; error: string; code?: string }> = [];
    if (!item.questionText) {
      errors.push({ field: 'questionText', error: 'Question text is required' });
    }
    if (item.questionType === QuestionType.MCQ) {
      if (!item.options || item.options.length < 2) {
        errors.push({ field: 'options', error: 'MCQ must have at least 2 options' });
      }
      if (!item.options?.some((o) => o.isCorrect)) {
        errors.push({ field: 'correctAnswer', error: 'At least one correct answer must be selected' });
      }
    }

    item.isValid = errors.length === 0;
    item.validationErrors = errors.length > 0 ? errors : undefined;

    const savedItem = await this.itemRepo.save(item);

    // Refresh import summary
    const allItems = await this.itemRepo.find({ where: { importId } });
    const validCount = allItems.filter((i) => i.isValid).length;
    const invalidCount = allItems.length - validCount;

    importRecord.validQuestions = validCount;
    importRecord.invalidQuestions = invalidCount;
    importRecord.status = invalidCount === 0 ? ImportStatus.VALIDATED : ImportStatus.PENDING;
    await this.importRepo.save(importRecord);

    return savedItem;
  }

  async deleteStagedQuestion(importId: string, questionId: string): Promise<{ deleted: boolean }> {
    const importRecord = await this.getImport(importId);
    if (importRecord.status === ImportStatus.CONFIRMED) {
      throw new BadRequestException('Cannot delete questions of an already confirmed import');
    }

    const item = await this.itemRepo.findOne({ where: { id: questionId, importId } });
    if (!item) throw new NotFoundException('Staged question not found');

    await this.itemRepo.remove(item);
    await this.errorRepo.delete({ importId, questionNumber: item.questionNumber });

    // Refresh import summary
    const allItems = await this.itemRepo.find({ where: { importId } });
    const validCount = allItems.filter((i) => i.isValid).length;
    const invalidCount = allItems.length - validCount;

    importRecord.totalQuestions = allItems.length;
    importRecord.validQuestions = validCount;
    importRecord.invalidQuestions = invalidCount;
    importRecord.status = invalidCount === 0 ? ImportStatus.VALIDATED : ImportStatus.PENDING;
    await this.importRepo.save(importRecord);

    return { deleted: true };
  }

  /**
   * Transactional import confirmation:
   * Validates staged questions, begins database transaction,
   * saves permanent questions & options, associates Test UUID,
   * updates import status to CONFIRMED.
   */
  async confirmImport(importId: string): Promise<{
    confirmed: boolean;
    testId: string;
    questionsImported: number;
  }> {
    const importRecord = await this.getImport(importId);

    if (importRecord.status === ImportStatus.CONFIRMED) {
      throw new BadRequestException('This import has already been confirmed');
    }

    // Ensure examination is still editable
    const exam = await this.examRepo.findOne({ where: { id: importRecord.testId } });
    if (!exam || (exam.status !== ExaminationStatus.DRAFT && exam.status !== ExaminationStatus.SCHEDULED)) {
      throw new BadRequestException('Examination is no longer in editable status');
    }

    // Non-negotiable requirement: Never silently discard invalid questions.
    // If any staged question is invalid, refuse confirmation!
    const stagedItems = await this.itemRepo.find({ where: { importId } });
    const invalidItems = stagedItems.filter((i) => !i.isValid);
    if (invalidItems.length > 0) {
      throw new BadRequestException(
        `Cannot confirm import. There are ${invalidItems.length} invalid questions that must be corrected or removed first.`,
      );
    }

    if (stagedItems.length === 0) {
      throw new BadRequestException('Cannot confirm an import with 0 questions');
    }

    // Get current highest question order in permanent table
    const highestOrder = await this.questionRepo
      .createQueryBuilder('q')
      .where('q.testId = :testId', { testId: importRecord.testId })
      .select('MAX(q.questionOrder)', 'max')
      .getRawOne();
    let currentOrder = highestOrder?.max || 0;

    // Begin database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of stagedItems) {
        currentOrder++;

        const question = queryRunner.manager.create(Question, {
          testId: importRecord.testId,
          questionText: item.questionText,
          questionType: item.questionType,
          marks: item.marks,
          negativeMarks: item.negativeMarks || '0.00',
          topic: item.topic,
          difficulty: item.difficulty as DifficultyLevel,
          questionOrder: currentOrder,
          answerInstructions: item.answerInstructions,
          evaluationCriteria: item.evaluationCriteria,
          expectedAnswer: item.expectedAnswer,
        });

        const savedQuestion = await queryRunner.manager.save(question);

        if (item.questionType === QuestionType.MCQ && item.options) {
          const options = item.options.map((opt, idx) =>
            queryRunner.manager.create(QuestionOption, {
              questionId: savedQuestion.id,
              optionLabel: opt.label,
              optionText: opt.text,
              isCorrect: opt.isCorrect,
              optionOrder: idx + 1,
            }),
          );
          await queryRunner.manager.save(options);
        }
      }

      // Update import status to CONFIRMED
      importRecord.status = ImportStatus.CONFIRMED;
      importRecord.confirmedAt = new Date();
      await queryRunner.manager.save(importRecord);

      await queryRunner.commitTransaction();

      return {
        confirmed: true,
        testId: importRecord.testId,
        questionsImported: stagedItems.length,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Import confirmation failed: ${(err as Error).message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async cancelImport(importId: string): Promise<{ cancelled: boolean }> {
    const importRecord = await this.getImport(importId);
    if (importRecord.status === ImportStatus.CONFIRMED) {
      throw new BadRequestException('Cannot cancel an already confirmed import');
    }

    importRecord.status = ImportStatus.CANCELLED;
    await this.importRepo.save(importRecord);
    await this.itemRepo.delete({ importId });

    return { cancelled: true };
  }
}
