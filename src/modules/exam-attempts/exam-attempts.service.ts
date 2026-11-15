import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ExamAttempt } from './entities/exam-attempt.entity.js';
import { AttemptQuestion } from './entities/attempt-question.entity.js';
import { StudentAnswer } from '../exam-submissions/entities/student-answer.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { ExamEligibleStudent } from '../examinations/entities/exam-eligible-student.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { QuestionOption } from '../questions/entities/question-option.entity.js';
import { DescriptiveEvaluation } from '../evaluations/entities/descriptive-evaluation.entity.js';
import { Result } from '../results/entities/result.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NegativeMarkingService } from '../exam-submissions/services/negative-marking.service.js';
import { SaveAnswerDto } from './dto/save-answer.dto.js';
import {
  AttemptStatus,
  EvaluationStatus,
  ExaminationStatus,
  NegativeMarkingType,
  NotificationType,
  PassFailStatus,
  QuestionAttemptStatus,
  QuestionType,
  ResultStatus,
} from '../../shared/enums/index.js';
import { roundToPrecision, shuffleArray } from '../../common/utils/index.js';

@Injectable()
export class ExamAttemptsService {
  constructor(
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(AttemptQuestion)
    private readonly attemptQuestionRepo: Repository<AttemptQuestion>,
    @InjectRepository(StudentAnswer)
    private readonly answerRepo: Repository<StudentAnswer>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(ExamEligibleStudent)
    private readonly eligibleRepo: Repository<ExamEligibleStudent>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly optionRepo: Repository<QuestionOption>,
    @InjectRepository(DescriptiveEvaluation)
    private readonly evaluationRepo: Repository<DescriptiveEvaluation>,
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,
    private readonly negativeMarkingService: NegativeMarkingService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async getInstructions(testId: string, studentId: string) {
    const exam = await this.examRepo.findOne({
      where: { id: testId },
      relations: { subject: true, department: true, course: true },
    });
    if (!exam) throw new NotFoundException('Examination not found');

    const eligible = await this.eligibleRepo.findOne({
      where: { testId, studentId, isEligible: true },
    });
    if (!eligible) {
      throw new ForbiddenException('You are not registered or eligible for this examination');
    }

    const previousAttempts = await this.attemptRepo.count({
      where: { testId, studentId },
    });

    const questionCount = await this.questionRepo.count({ where: { testId } });

    return {
      testId: exam.id,
      title: exam.title,
      code: exam.examinationCode,
      subjectName: exam.subject?.name,
      examinationType: exam.examinationType,
      durationMinutes: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      totalQuestions: questionCount,
      instructions: exam.instructions,
      negativeMarkingType: exam.negativeMarkingType,
      negativeMarkingValue: exam.negativeMarkingValue,
      allowNegativeMarksBelowZero: exam.allowNegativeMarksBelowZero,
      maxAttempts: exam.maxAttempts,
      previousAttempts,
      remainingAttempts: Math.max(0, exam.maxAttempts - previousAttempts),
      startDate: exam.startDate,
      endDate: exam.endDate,
      canStart:
        (exam.status === ExaminationStatus.PUBLISHED || exam.status === ExaminationStatus.LIVE) &&
        new Date() >= new Date(exam.startDate) &&
        new Date() <= new Date(exam.endDate) &&
        previousAttempts < exam.maxAttempts,
    };
  }

  async startExam(params: {
    testId: string;
    studentId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExamAttempt> {
    const { testId, studentId, ipAddress, userAgent } = params;

    const exam = await this.examRepo.findOne({ where: { id: testId } });
    if (!exam) throw new NotFoundException('Examination not found');

    if (exam.status !== ExaminationStatus.PUBLISHED && exam.status !== ExaminationStatus.LIVE) {
      throw new BadRequestException(`Examination is not currently active (status: ${exam.status})`);
    }

    const now = new Date();
    if (now < new Date(exam.startDate)) {
      throw new BadRequestException(`Examination has not started yet. Starts at: ${exam.startDate.toISOString()}`);
    }
    if (now > new Date(exam.endDate)) {
      throw new BadRequestException('Examination window has closed');
    }

    // Eligibility check
    const eligible = await this.eligibleRepo.findOne({
      where: { testId, studentId, isEligible: true },
    });
    if (!eligible) {
      throw new ForbiddenException('You are not registered or eligible for this examination');
    }

    // Check existing in-progress attempt (connection recovery!)
    const activeAttempt = await this.attemptRepo.findOne({
      where: { testId, studentId, status: AttemptStatus.IN_PROGRESS },
    });
    if (activeAttempt) {
      // Check if time expired while disconnected
      if (now.getTime() > activeAttempt.expiresAt.getTime()) {
        await this.submitExam(activeAttempt.id, studentId);
        throw new BadRequestException('Your examination attempt time has expired');
      }
      return activeAttempt;
    }

    // Check attempt limit
    const attemptsCount = await this.attemptRepo.count({
      where: { testId, studentId },
    });
    if (attemptsCount >= exam.maxAttempts) {
      throw new BadRequestException(`You have reached the maximum allowed attempts (${exam.maxAttempts})`);
    }

    // Fetch questions to freeze sequence
    let questions = await this.questionRepo.find({
      where: { testId },
      relations: { options: true },
      order: { questionOrder: 'ASC' },
    });

    if (questions.length === 0) {
      throw new BadRequestException('This examination has no questions configured');
    }

    // Question randomization if configured
    if (exam.randomizeQuestions) {
      questions = shuffleArray(questions);
    }

    const startedAt = new Date();
    // Server-side authoritative timer deadline
    const expiresAt = new Date(startedAt.getTime() + exam.duration * 60 * 1000);

    const attempt = this.attemptRepo.create({
      testId,
      studentId,
      attemptNumber: attemptsCount + 1,
      status: AttemptStatus.IN_PROGRESS,
      startedAt,
      expiresAt,
      totalQuestions: questions.length,
      answeredCount: 0,
      ipAddress,
      userAgent,
    });

    const savedAttempt = await this.attemptRepo.save(attempt);

    // Freeze question order and option order in attempt_questions table
    const attemptQuestions: AttemptQuestion[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let optionOrderJson: string[] | undefined = undefined;

      if (exam.randomizeOptions && q.options && q.options.length > 0) {
        const shuffled = shuffleArray(q.options);
        optionOrderJson = shuffled.map((o) => o.id);
      }

      attemptQuestions.push(
        this.attemptQuestionRepo.create({
          attemptId: savedAttempt.id,
          questionId: q.id,
          sequenceOrder: i + 1,
          optionOrderJson,
          status: QuestionAttemptStatus.NOT_VISITED,
        }),
      );
    }
    await this.attemptQuestionRepo.save(attemptQuestions);

    return savedAttempt;
  }

  async getAttemptQuestions(attemptId: string, studentId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: { examination: true },
    });
    if (!attempt) throw new NotFoundException('Examination attempt not found');

    // Auto-submit if server deadline has elapsed
    if (attempt.status === AttemptStatus.IN_PROGRESS && Date.now() > attempt.expiresAt.getTime()) {
      await this.submitExam(attemptId, studentId);
      throw new BadRequestException('Examination time has expired. Your answers have been submitted automatically.');
    }

    // Fetch frozen question sequence
    const attemptQuestions = await this.attemptQuestionRepo.find({
      where: { attemptId },
      relations: { question: { options: true } },
      order: { sequenceOrder: 'ASC' },
    });

    // Fetch student's existing answers
    const studentAnswers = await this.answerRepo.find({
      where: { attemptId },
    });
    const answerMap = new Map(studentAnswers.map((a) => [a.questionId, a]));

    const questionsList = attemptQuestions.map((aq) => {
      const q = aq.question;
      const existingAnswer = answerMap.get(q.id);

      // Order options according to frozen sequence if present
      let optionsList: any[] = [];
      if (q.options && q.options.length > 0) {
        if (aq.optionOrderJson && aq.optionOrderJson.length > 0) {
          const optMap = new Map(q.options.map((o) => [o.id, o]));
          optionsList = aq.optionOrderJson
            .map((optId) => optMap.get(optId))
            .filter((o): o is QuestionOption => Boolean(o));
        } else {
          optionsList = [...q.options].sort((a, b) => a.optionOrder - b.optionOrder);
        }

        // NON-NEGOTIABLE SECURITY: Strip isCorrect from student response!
        optionsList = optionsList.map((o) => ({
          id: o.id,
          optionLabel: o.optionLabel,
          optionText: o.optionText,
          optionOrder: o.optionOrder,
        }));
      }

      return {
        questionId: q.id,
        sequenceOrder: aq.sequenceOrder,
        questionText: q.questionText,
        questionType: q.questionType,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        topic: q.topic,
        difficulty: q.difficulty,
        answerInstructions: q.answerInstructions, // Descriptive instructions visible to student
        // SECURITY: evaluationCriteria and expectedAnswer NEVER exposed!
        options: optionsList,
        studentAnswer: existingAnswer
          ? {
              selectedOptionId: existingAnswer.selectedOptionId,
              selectedOptionLabel: existingAnswer.selectedOptionLabel,
              descriptiveAnswer: existingAnswer.descriptiveAnswer,
              isAnswered: existingAnswer.isAnswered,
              isMarkedForReview: existingAnswer.isMarkedForReview,
            }
          : null,
        status: aq.status,
      };
    });

    return {
      attemptId: attempt.id,
      testId: attempt.testId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      timeRemainingSeconds: Math.max(0, Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000)),
      totalQuestions: attempt.totalQuestions,
      answeredCount: attempt.answeredCount,
      questions: questionsList,
    };
  }

  async getAttemptStatus(attemptId: string, studentId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
    });
    if (!attempt) throw new NotFoundException('Examination attempt not found');

    const now = Date.now();
    const timeRemainingSeconds = Math.max(0, Math.floor((attempt.expiresAt.getTime() - now) / 1000));

    // Auto-submit if expired
    if (attempt.status === AttemptStatus.IN_PROGRESS && timeRemainingSeconds <= 0) {
      return await this.submitExam(attemptId, studentId);
    }

    const answers = await this.answerRepo.find({ where: { attemptId } });
    const answeredCount = answers.filter((a) => a.isAnswered).length;
    const markedForReviewCount = answers.filter((a) => a.isMarkedForReview).length;

    return {
      attemptId: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      timeRemainingSeconds,
      totalQuestions: attempt.totalQuestions,
      answeredCount,
      markedForReviewCount,
      unansweredCount: attempt.totalQuestions - answeredCount,
    };
  }

  async saveAnswer(
    attemptId: string,
    questionId: string,
    studentId: string,
    dto: SaveAnswerDto,
  ): Promise<StudentAnswer> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(`Cannot save answer. Attempt status is '${attempt.status}'.`);
    }

    // Trusted server-side timer check!
    if (Date.now() > attempt.expiresAt.getTime()) {
      await this.submitExam(attemptId, studentId);
      throw new BadRequestException('Examination time has expired. Changes rejected and exam auto-submitted.');
    }

    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question || question.testId !== attempt.testId) {
      throw new BadRequestException('Question does not belong to this examination');
    }

    let answer = await this.answerRepo.findOne({
      where: { attemptId, questionId },
    });

    const isAnswered = Boolean(
      (dto.selectedOptionId && dto.selectedOptionId.trim().length > 0) ||
      (dto.descriptiveAnswer && dto.descriptiveAnswer.trim().length > 0),
    );

    if (!answer) {
      answer = this.answerRepo.create({
        attemptId,
        testId: attempt.testId,
        questionId,
        selectedOptionId: dto.selectedOptionId,
        selectedOptionLabel: dto.selectedOptionLabel,
        descriptiveAnswer: dto.descriptiveAnswer,
        isAnswered,
        isMarkedForReview: dto.isMarkedForReview ?? false,
      });
    } else {
      if (dto.selectedOptionId !== undefined) answer.selectedOptionId = dto.selectedOptionId;
      if (dto.selectedOptionLabel !== undefined) answer.selectedOptionLabel = dto.selectedOptionLabel;
      if (dto.descriptiveAnswer !== undefined) answer.descriptiveAnswer = dto.descriptiveAnswer;
      if (dto.isMarkedForReview !== undefined) answer.isMarkedForReview = dto.isMarkedForReview;
      answer.isAnswered = isAnswered;
    }

    const savedAnswer = await this.answerRepo.save(answer);

    // Update attempt_question visit status
    let qStatus = QuestionAttemptStatus.UNANSWERED;
    if (savedAnswer.isAnswered && savedAnswer.isMarkedForReview) {
      qStatus = QuestionAttemptStatus.ANSWERED_AND_MARKED_FOR_REVIEW;
    } else if (savedAnswer.isAnswered) {
      qStatus = QuestionAttemptStatus.ANSWERED;
    } else if (savedAnswer.isMarkedForReview) {
      qStatus = QuestionAttemptStatus.MARKED_FOR_REVIEW;
    }

    await this.attemptQuestionRepo.update({ attemptId, questionId }, { status: qStatus });

    // Update total answered count
    const totalAnswered = await this.answerRepo.count({
      where: { attemptId, isAnswered: true },
    });
    await this.attemptRepo.update({ id: attemptId }, { answeredCount: totalAnswered });

    return savedAnswer;
  }

  async saveBulkAnswers(
    attemptId: string,
    studentId: string,
    answers: Array<SaveAnswerDto & { questionId: string }>,
  ) {
    const results = [];
    for (const ans of answers) {
      const res = await this.saveAnswer(attemptId, ans.questionId, studentId, ans);
      results.push(res);
    }
    return results;
  }

  /**
   * Final submit examination:
   * Idempotent submission, automatic MCQ evaluation with negative marking engine,
   * queue descriptive evaluation if needed.
   */
  async submitExam(attemptId: string, studentId: string): Promise<ExamAttempt> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, studentId },
      relations: {
        examination: true,
        answers: { question: { options: true } },
        student: { user: true },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    // Idempotent: If already SUBMITTED or EVALUATED, return current attempt
    if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.EVALUATED) {
      return attempt;
    }

    const exam = attempt.examination;
    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Evaluate MCQs using NegativeMarkingService
      const allQuestions = await queryRunner.manager.find(Question, {
        where: { testId: exam.id },
        relations: { options: true },
      });

      const existingAnswers = await queryRunner.manager.find(StudentAnswer, {
        where: { attemptId },
      });
      const answerMap = new Map(existingAnswers.map((a) => [a.questionId, a]));

      const mcqScoreInputs: Array<{ marksAwarded: number; negativeMarksDeducted: number }> = [];
      let totalCorrect = 0;
      let totalIncorrect = 0;
      let totalUnanswered = 0;
      let hasDescriptiveQuestions = false;

      for (const question of allQuestions) {
        if (question.questionType === QuestionType.MCQ) {
          const answer = answerMap.get(question.id);
          const isAnswered = Boolean(answer && answer.isAnswered && answer.selectedOptionId);

          let isCorrect = false;
          if (isAnswered && answer?.selectedOptionId) {
            const correctOption = question.options?.find((o) => o.isCorrect);
            if (correctOption && correctOption.id === answer.selectedOptionId) {
              isCorrect = true;
              totalCorrect++;
            } else {
              totalIncorrect++;
            }
          } else {
            totalUnanswered++;
          }

          const scoreResult = this.negativeMarkingService.calculateQuestionScore(
            {
              questionMarks: parseFloat(question.marks),
              questionNegativeMarks: parseFloat(question.negativeMarks || '0'),
              isAnswered,
              isCorrect,
            },
            {
              negativeMarkingType: exam.negativeMarkingType,
              negativeMarkingValue: parseFloat(exam.negativeMarkingValue || '0'),
              allowNegativeMarksBelowZero: exam.allowNegativeMarksBelowZero,
            },
          );

          mcqScoreInputs.push(scoreResult);

          if (answer) {
            answer.isCorrect = isCorrect;
            answer.marksAwarded = scoreResult.marksAwarded.toFixed(2);
            answer.negativeMarksDeducted = scoreResult.negativeMarksDeducted.toFixed(2);
            answer.evaluatedAt = new Date();
            await queryRunner.manager.save(answer);
          } else {
            // Save unanswered record
            const newAnswer = queryRunner.manager.create(StudentAnswer, {
              attemptId,
              testId: exam.id,
              questionId: question.id,
              isAnswered: false,
              isCorrect: false,
              marksAwarded: '0.00',
              negativeMarksDeducted: '0.00',
              evaluatedAt: new Date(),
            });
            await queryRunner.manager.save(newAnswer);
          }
        } else {
          // Descriptive question
          hasDescriptiveQuestions = true;
          let answer = answerMap.get(question.id);
          if (!answer) {
            answer = queryRunner.manager.create(StudentAnswer, {
              attemptId,
              testId: exam.id,
              questionId: question.id,
              isAnswered: false,
              marksAwarded: '0.00',
              negativeMarksDeducted: '0.00',
            });
            answer = await queryRunner.manager.save(answer);
          }

          // Create pending descriptive evaluation entry if answered
          const existingEval = await queryRunner.manager.findOne(DescriptiveEvaluation, {
            where: { studentAnswerId: answer.id },
          });
          if (!existingEval) {
            const evaluation = queryRunner.manager.create(DescriptiveEvaluation, {
              testId: exam.id,
              studentAnswerId: answer.id,
              maximumMarks: question.marks,
              marksAwarded: '0.00',
              status: EvaluationStatus.PENDING,
            });
            await queryRunner.manager.save(evaluation);
          }
        }
      }

      // 2. If MCQ only, attempt is immediately EVALUATED and Result calculated!
      if (!hasDescriptiveQuestions) {
        attempt.status = AttemptStatus.EVALUATED;

        const totalMcqScore = this.negativeMarkingService.calculateTotalMcqScore(
          mcqScoreInputs,
          exam.allowNegativeMarksBelowZero,
        );

        const totalMarksNum = parseFloat(exam.totalMarks) || 100;
        const percentage = roundToPrecision((totalMcqScore.netMcqScore / totalMarksNum) * 100);
        const passMarksNum = parseFloat(exam.passingMarks) || 40;
        const passFailStatus =
          totalMcqScore.netMcqScore >= passMarksNum ? PassFailStatus.PASS : PassFailStatus.FAIL;

        let grade = 'F';
        if (percentage >= 90) grade = 'O';
        else if (percentage >= 80) grade = 'E';
        else if (percentage >= 70) grade = 'A';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';

        const resultRecord = queryRunner.manager.create(Result, {
          testId: exam.id,
          studentId,
          attemptId,
          totalQuestions: allQuestions.length,
          correctAnswers: totalCorrect,
          incorrectAnswers: totalIncorrect,
          unansweredCount: totalUnanswered,
          mcqMarksAwarded: totalMcqScore.totalMarksAwarded.toFixed(2),
          negativeMarksDeducted: totalMcqScore.totalNegativeDeducted.toFixed(2),
          netMcqScore: totalMcqScore.netMcqScore.toFixed(2),
          descriptiveScore: '0.00',
          finalMarks: totalMcqScore.netMcqScore.toFixed(2),
          maximumMarks: exam.totalMarks,
          percentage: percentage.toFixed(2),
          grade,
          passFailStatus,
          status: ResultStatus.CALCULATED,
          calculatedAt: new Date(),
        });

        await queryRunner.manager.save(resultRecord);
      }

      const savedAttempt = await queryRunner.manager.save(attempt);
      await queryRunner.commitTransaction();

      // Emit notification to student
      if (attempt.student?.user?.id) {
        await this.notificationsService.create({
          userId: attempt.student.user.id,
          type: NotificationType.SUBMISSION_CONFIRMATION,
          title: `Examination Submitted: ${exam.title}`,
          message: `Your examination submission for '${exam.title}' has been successfully received.`,
          metadata: { testId: exam.id, attemptId: attempt.id },
        });
      }

      return savedAttempt;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Submission failed: ${(err as Error).message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getStudentHistory(studentId: string) {
    return await this.attemptRepo.find({
      where: { studentId },
      relations: {
        examination: { subject: true },
        result: true,
      },
      order: { startedAt: 'DESC' },
    });
  }
}
