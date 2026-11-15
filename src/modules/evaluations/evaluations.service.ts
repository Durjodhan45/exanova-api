import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DescriptiveEvaluation } from './entities/descriptive-evaluation.entity.js';
import { StudentAnswer } from '../exam-submissions/entities/student-answer.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { Result } from '../results/entities/result.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { EvaluateAnswerDto } from './dto/evaluate-answer.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import {
  AttemptStatus,
  EvaluationStatus,
  PassFailStatus,
  QuestionType,
  ResultStatus,
} from '../../shared/enums/index.js';
import { addDecimals, roundToPrecision, subtractDecimals } from '../../common/utils/index.js';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(DescriptiveEvaluation)
    private readonly evalRepo: Repository<DescriptiveEvaluation>,
    @InjectRepository(StudentAnswer)
    private readonly answerRepo: Repository<StudentAnswer>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    private readonly dataSource: DataSource,
  ) {}

  async getPendingEvaluations(query: PaginationQueryDto & { testId?: string; facultyId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.evalRepo
      .createQueryBuilder('de')
      .leftJoinAndSelect('de.examination', 'exam')
      .leftJoinAndSelect('de.studentAnswer', 'answer')
      .leftJoinAndSelect('answer.question', 'question')
      .leftJoinAndSelect('answer.attempt', 'attempt')
      .leftJoinAndSelect('attempt.student', 'student')
      .where('de.status = :status', { status: EvaluationStatus.PENDING })
      .orderBy('de.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.testId) {
      qb.andWhere('de.testId = :testId', { testId: query.testId });
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

  async findById(id: string): Promise<DescriptiveEvaluation> {
    const evaluation = await this.evalRepo.findOne({
      where: { id },
      relations: {
        examination: true,
        evaluatedByFaculty: true,
        studentAnswer: { question: true, attempt: { student: true } },
      },
    });
    if (!evaluation) throw new NotFoundException('Evaluation record not found');
    return evaluation;
  }

  async findByAttemptId(attemptId: string) {
    const answers = await this.answerRepo.find({
      where: { attemptId },
      relations: {
        question: true,
        descriptiveEvaluation: { evaluatedByFaculty: true },
      },
    });

    return answers
      .filter((a) => a.question.questionType === QuestionType.DESCRIPTIVE)
      .map((a) => ({
        answerId: a.id,
        questionId: a.question.id,
        questionText: a.question.questionText,
        marks: a.question.marks,
        answerInstructions: a.question.answerInstructions,
        evaluationCriteria: a.question.evaluationCriteria,
        expectedAnswer: a.question.expectedAnswer,
        studentAnswer: a.descriptiveAnswer,
        evaluation: a.descriptiveEvaluation,
      }));
  }

  async evaluateAnswer(
    answerId: string,
    dto: EvaluateAnswerDto,
    facultyId: string,
  ): Promise<DescriptiveEvaluation> {
    const answer = await this.answerRepo.findOne({
      where: { id: answerId },
      relations: { question: true, descriptiveEvaluation: true },
    });
    if (!answer) throw new NotFoundException('Student answer not found');

    const maxMarks = parseFloat(answer.question.marks);
    const marksAwardedNum = parseFloat(dto.marksAwarded);

    // Non-negotiable requirement: Marks must never exceed the question's maximum marks!
    if (isNaN(marksAwardedNum) || marksAwardedNum < 0 || marksAwardedNum > maxMarks) {
      throw new BadRequestException(
        `Marks awarded (${dto.marksAwarded}) must be between 0 and maximum marks (${maxMarks})`,
      );
    }

    let evaluation = answer.descriptiveEvaluation;
    if (!evaluation) {
      evaluation = this.evalRepo.create({
        testId: answer.testId,
        studentAnswerId: answer.id,
        maximumMarks: answer.question.marks,
      });
    }

    evaluation.marksAwarded = marksAwardedNum.toFixed(2);
    evaluation.generalFeedback = dto.generalFeedback;
    evaluation.criteriaScoresJson = dto.criteriaScores;
    evaluation.evaluatedByFacultyId = facultyId;
    evaluation.status = EvaluationStatus.COMPLETED;
    evaluation.submittedAt = new Date();

    const savedEvaluation = await this.evalRepo.save(evaluation);

    // Update StudentAnswer marksAwarded
    answer.marksAwarded = marksAwardedNum.toFixed(2);
    answer.evaluatedAt = new Date();
    await this.answerRepo.save(answer);

    // Check if all descriptive evaluations for this attempt are completed!
    await this.recalculateAttemptResult(answer.attemptId);

    return savedEvaluation;
  }

  async updateEvaluation(
    evaluationId: string,
    dto: EvaluateAnswerDto,
    facultyId: string,
  ): Promise<DescriptiveEvaluation> {
    const evaluation = await this.findById(evaluationId);
    return await this.evaluateAnswer(evaluation.studentAnswerId, dto, facultyId);
  }

  async reopenEvaluation(evaluationId: string): Promise<DescriptiveEvaluation> {
    const evaluation = await this.findById(evaluationId);
    evaluation.status = EvaluationStatus.PENDING;
    const saved = await this.evalRepo.save(evaluation);
    await this.recalculateAttemptResult(evaluation.studentAnswer.attemptId);
    return saved;
  }

  /**
   * Recalculates final result for attempt after evaluation changes
   */
  async recalculateAttemptResult(attemptId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: { examination: true, answers: { question: true } },
    });
    if (!attempt) return;

    const exam = attempt.examination;
    const allAnswers = attempt.answers || [];

    // Check if any descriptive answers are still pending evaluation
    const pendingCount = await this.evalRepo
      .createQueryBuilder('de')
      .innerJoin('de.studentAnswer', 'sa')
      .where('sa.attemptId = :attemptId', { attemptId })
      .andWhere('de.status = :status', { status: EvaluationStatus.PENDING })
      .getCount();

    if (pendingCount > 0) {
      // Still pending evaluations
      return;
    }

    // All descriptive evaluations done! Calculate consolidated Result
    attempt.status = AttemptStatus.EVALUATED;
    await this.attemptRepo.save(attempt);

    let mcqAwarded = 0;
    let mcqNegative = 0;
    let netMcq = 0;
    let descriptiveScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    for (const a of allAnswers) {
      if (a.question.questionType === QuestionType.MCQ) {
        if (a.isAnswered) {
          if (a.isCorrect) correctCount++;
          else incorrectCount++;
        } else {
          unansweredCount++;
        }
        mcqAwarded = addDecimals(mcqAwarded, a.marksAwarded || '0');
        mcqNegative = addDecimals(mcqNegative, a.negativeMarksDeducted || '0');
      } else {
        descriptiveScore = addDecimals(descriptiveScore, a.marksAwarded || '0');
      }
    }

    netMcq = subtractDecimals(mcqAwarded, mcqNegative);
    if (!exam.allowNegativeMarksBelowZero && netMcq < 0) {
      netMcq = 0;
    }

    const finalMarks = addDecimals(netMcq, descriptiveScore);
    const maxMarksNum = parseFloat(exam.totalMarks) || 100;
    const percentage = roundToPrecision((finalMarks / maxMarksNum) * 100);
    const passMarksNum = parseFloat(exam.passingMarks) || 40;
    const passFailStatus = finalMarks >= passMarksNum ? PassFailStatus.PASS : PassFailStatus.FAIL;

    let grade = 'F';
    if (percentage >= 90) grade = 'O';
    else if (percentage >= 80) grade = 'E';
    else if (percentage >= 70) grade = 'A';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    let result = await this.resultRepo.findOne({
      where: { attemptId },
    });

    if (!result) {
      result = this.resultRepo.create({
        testId: exam.id,
        studentId: attempt.studentId,
        attemptId,
        totalQuestions: allAnswers.length,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        unansweredCount,
        mcqMarksAwarded: mcqAwarded.toFixed(2),
        negativeMarksDeducted: mcqNegative.toFixed(2),
        netMcqScore: netMcq.toFixed(2),
        descriptiveScore: descriptiveScore.toFixed(2),
        finalMarks: finalMarks.toFixed(2),
        maximumMarks: exam.totalMarks,
        percentage: percentage.toFixed(2),
        grade,
        passFailStatus,
        status: ResultStatus.CALCULATED,
        calculatedAt: new Date(),
      });
    } else {
      result.mcqMarksAwarded = mcqAwarded.toFixed(2);
      result.negativeMarksDeducted = mcqNegative.toFixed(2);
      result.netMcqScore = netMcq.toFixed(2);
      result.descriptiveScore = descriptiveScore.toFixed(2);
      result.finalMarks = finalMarks.toFixed(2);
      result.percentage = percentage.toFixed(2);
      result.grade = grade;
      result.passFailStatus = passFailStatus;
      result.calculatedAt = new Date();
    }

    await this.resultRepo.save(result);
  }

  async getEvaluationStatistics() {
    const totalPending = await this.evalRepo.count({
      where: { status: EvaluationStatus.PENDING },
    });
    const totalCompleted = await this.evalRepo.count({
      where: { status: EvaluationStatus.COMPLETED },
    });

    return {
      pendingEvaluations: totalPending,
      completedEvaluations: totalCompleted,
      totalEvaluations: totalPending + totalCompleted,
    };
  }
}
