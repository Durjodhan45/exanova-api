import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from './entities/result.entity.js';
import { ResultRelease } from './entities/result-release.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PdfScorecardService } from './services/pdf-scorecard.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { NotificationType, PassFailStatus, ResultStatus, UserRole } from '../../shared/enums/index.js';
import { roundToPrecision } from '../../common/utils/index.js';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,
    @InjectRepository(ResultRelease)
    private readonly releaseRepo: Repository<ResultRelease>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly pdfScorecardService: PdfScorecardService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: PaginationQueryDto & { testId?: string; studentId?: string; status?: ResultStatus }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.resultRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.examination', 'exam')
      .leftJoinAndSelect('res.student', 'student')
      .orderBy('res.finalMarks', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.testId) {
      qb.andWhere('res.testId = :testId', { testId: query.testId });
    }
    if (query.studentId) {
      qb.andWhere('res.studentId = :studentId', { studentId: query.studentId });
    }
    if (query.status) {
      qb.andWhere('res.status = :status', { status: query.status });
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

  async findById(id: string): Promise<Result> {
    const result = await this.resultRepo.findOne({
      where: { id },
      relations: {
        examination: { subject: true, department: true, course: true },
        student: { department: true, course: true },
        attempt: true,
      },
    });
    if (!result) throw new NotFoundException('Result record not found');
    return result;
  }

  async findByTestId(testId: string) {
    return await this.resultRepo.find({
      where: { testId },
      relations: { student: true },
      order: { finalMarks: 'DESC' },
    });
  }

  async calculateExamResults(testId: string) {
    const exam = await this.examRepo.findOne({ where: { id: testId } });
    if (!exam) throw new NotFoundException('Examination not found');

    // Assign ranks
    const results = await this.resultRepo.find({
      where: { testId },
      order: { finalMarks: 'DESC' },
    });

    for (let i = 0; i < results.length; i++) {
      results[i].rank = i + 1;
    }
    await this.resultRepo.save(results);

    return {
      success: true,
      testId,
      calculatedResultsCount: results.length,
    };
  }

  async releaseResults(testId: string, releasedByUserId: string, remarks?: string) {
    const exam = await this.examRepo.findOne({ where: { id: testId } });
    if (!exam) throw new NotFoundException('Examination not found');

    // Calculate ranks first
    await this.calculateExamResults(testId);

    // Update examination result visibility
    exam.resultVisibility = true;
    await this.examRepo.save(exam);

    // Mark results as PUBLISHED
    await this.resultRepo.update({ testId }, { status: ResultStatus.PUBLISHED, releasedAt: new Date() });

    // Record release
    const release = this.releaseRepo.create({
      testId,
      releasedByUserId,
      releasedAt: new Date(),
      remarks,
    });
    await this.releaseRepo.save(release);

    // Notify all participating students
    const results = await this.resultRepo.find({
      where: { testId },
      relations: { student: { user: true } },
    });

    for (const r of results) {
      if (r.student?.user?.id) {
        await this.notificationsService.create({
          userId: r.student.user.id,
          type: NotificationType.RESULT_RELEASED,
          title: `Examination Results Released: ${exam.title}`,
          message: `The results for '${exam.title}' have been officially released. Your Score: ${r.finalMarks}/${r.maximumMarks} (${r.percentage}%), Grade: ${r.grade}.`,
          metadata: { testId, resultId: r.id },
        });
      }
    }

    return {
      success: true,
      message: `Results released successfully for examination ${exam.examinationCode}`,
      releasedCount: results.length,
    };
  }

  async withholdResults(testId: string) {
    const exam = await this.examRepo.findOne({ where: { id: testId } });
    if (!exam) throw new NotFoundException('Examination not found');

    exam.resultVisibility = false;
    await this.examRepo.save(exam);

    await this.resultRepo.update({ testId }, { status: ResultStatus.WITHHELD });

    return { success: true, message: 'Results withheld successfully' };
  }

  async getRankList(testId: string) {
    await this.calculateExamResults(testId);
    const results = await this.resultRepo.find({
      where: { testId },
      relations: { student: true },
      order: { finalMarks: 'DESC' },
    });

    return results.map((r) => ({
      rank: r.rank,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      rollNumber: r.student.rollNumber,
      mcqScore: r.netMcqScore,
      descriptiveScore: r.descriptiveScore,
      finalMarks: r.finalMarks,
      percentage: r.percentage,
      grade: r.grade,
      status: r.passFailStatus,
    }));
  }

  async getPassFailStatistics(testId: string) {
    const results = await this.resultRepo.find({ where: { testId } });
    const total = results.length;
    const passCount = results.filter((r) => r.passFailStatus === PassFailStatus.PASS).length;
    const failCount = total - passCount;
    const passPercentage = total > 0 ? roundToPrecision((passCount / total) * 100) : 0;

    const grades: Record<string, number> = {};
    results.forEach((r) => {
      grades[r.grade] = (grades[r.grade] || 0) + 1;
    });

    return {
      testId,
      totalStudentsEvaluated: total,
      passed: passCount,
      failed: failCount,
      passPercentage: `${passPercentage}%`,
      gradeDistribution: grades,
    };
  }

  // Student Result methods
  async getStudentResults(studentId: string) {
    // Only return released results to students!
    return await this.resultRepo.find({
      where: { studentId, status: ResultStatus.PUBLISHED },
      relations: {
        examination: { subject: true },
      },
      order: { calculatedAt: 'DESC' },
    });
  }

  async getStudentResultById(resultId: string, studentId: string) {
    const result = await this.resultRepo.findOne({
      where: { id: resultId, studentId },
      relations: {
        examination: { subject: true, department: true, course: true },
        student: { department: true, course: true },
      },
    });
    if (!result) throw new NotFoundException('Result not found');

    if (result.status !== ResultStatus.PUBLISHED) {
      throw new ForbiddenException('Results for this examination have not been released yet');
    }

    return result;
  }

  async generatePdfScorecard(resultId: string, studentId?: string): Promise<Buffer> {
    const result = await this.findById(resultId);

    // If student requested, ensure it belongs to them and is released!
    if (studentId) {
      if (result.studentId !== studentId) {
        throw new ForbiddenException('Access denied');
      }
      if (result.status !== ResultStatus.PUBLISHED) {
        throw new ForbiddenException('Results for this examination have not been released yet');
      }
    }

    return await this.pdfScorecardService.generateScorecardBuffer(result);
  }
}
