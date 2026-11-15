import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Faculty } from '../faculty/entities/faculty.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { DescriptiveEvaluation } from '../evaluations/entities/descriptive-evaluation.entity.js';
import { Result } from '../results/entities/result.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';
import {
  AttemptStatus,
  EvaluationStatus,
  ExaminationStatus,
  ResultStatus,
  UserRole,
  UserStatus,
} from '../../shared/enums/index.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Faculty)
    private readonly facultyRepo: Repository<Faculty>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(DescriptiveEvaluation)
    private readonly evalRepo: Repository<DescriptiveEvaluation>,
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  // Admin Dashboard
  async getAdminOverview() {
    const totalStudents = await this.studentRepo.count();
    const activeStudents = await this.userRepo.count({
      where: { role: UserRole.STUDENT, status: UserStatus.ACTIVE },
    });
    const totalFaculty = await this.facultyRepo.count();

    const totalExaminations = await this.examRepo.count();
    const draftExaminations = await this.examRepo.count({ where: { status: ExaminationStatus.DRAFT } });
    const publishedExaminations = await this.examRepo.count({ where: { status: ExaminationStatus.PUBLISHED } });
    const completedExaminations = await this.examRepo.count({ where: { status: ExaminationStatus.COMPLETED } });

    const totalSubmissions = await this.attemptRepo.count({
      where: [{ status: AttemptStatus.SUBMITTED }, { status: AttemptStatus.EVALUATED }],
    });
    const pendingEvaluations = await this.evalRepo.count({
      where: { status: EvaluationStatus.PENDING },
    });
    const releasedResults = await this.resultRepo.count({
      where: { status: ResultStatus.PUBLISHED },
    });

    return {
      totalStudents,
      activeStudents,
      totalFaculty,
      totalExaminations,
      draftExaminations,
      publishedExaminations,
      completedExaminations,
      totalSubmissions,
      pendingEvaluations,
      releasedResults,
    };
  }

  async getAdminExaminationStats() {
    const statusCounts = await this.examRepo
      .createQueryBuilder('exam')
      .select('exam.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('exam.status')
      .getRawMany();

    const typeCounts = await this.examRepo
      .createQueryBuilder('exam')
      .select('exam.examinationType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('exam.examinationType')
      .getRawMany();

    return {
      byStatus: statusCounts,
      byType: typeCounts,
    };
  }

  async getAdminUserStats() {
    const byRole = await this.userRepo
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const byStatus = await this.userRepo
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    return { byRole, byStatus };
  }

  async getAdminRecentActivities(limit = 10) {
    return await this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { user: true },
    });
  }

  // Faculty Dashboard
  async getFacultyOverview(facultyId: string) {
    const myExamsCount = await this.examRepo.count({ where: { createdByFacultyId: facultyId } });
    const myDraftsCount = await this.examRepo.count({
      where: { createdByFacultyId: facultyId, status: ExaminationStatus.DRAFT },
    });
    const myPublishedCount = await this.examRepo.count({
      where: { createdByFacultyId: facultyId, status: ExaminationStatus.PUBLISHED },
    });

    const pendingEvaluations = await this.evalRepo
      .createQueryBuilder('de')
      .innerJoin('de.examination', 'exam')
      .where('exam.createdByFacultyId = :facultyId', { facultyId })
      .andWhere('de.status = :status', { status: EvaluationStatus.PENDING })
      .getCount();

    return {
      totalCreatedExaminations: myExamsCount,
      draftExaminations: myDraftsCount,
      publishedExaminations: myPublishedCount,
      pendingEvaluations,
    };
  }

  async getFacultyExaminations(facultyId: string) {
    return await this.examRepo.find({
      where: { createdByFacultyId: facultyId },
      relations: { subject: true, course: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getFacultyPendingEvaluations(facultyId: string) {
    return await this.evalRepo
      .createQueryBuilder('de')
      .innerJoinAndSelect('de.examination', 'exam')
      .innerJoinAndSelect('de.studentAnswer', 'answer')
      .innerJoinAndSelect('answer.question', 'question')
      .where('exam.createdByFacultyId = :facultyId', { facultyId })
      .andWhere('de.status = :status', { status: EvaluationStatus.PENDING })
      .orderBy('de.createdAt', 'ASC')
      .getMany();
  }

  // Student Dashboard
  async getStudentOverview(studentId: string) {
    const totalAttempts = await this.attemptRepo.count({ where: { studentId } });
    const completedAttempts = await this.attemptRepo.count({
      where: [{ studentId, status: AttemptStatus.SUBMITTED }, { studentId, status: AttemptStatus.EVALUATED }],
    });
    const releasedResultsCount = await this.resultRepo.count({
      where: { studentId, status: ResultStatus.PUBLISHED },
    });

    return {
      totalAttempts,
      completedAttempts,
      releasedResultsCount,
    };
  }

  async getStudentUpcomingExaminations(studentId: string) {
    const now = new Date();
    return await this.examRepo
      .createQueryBuilder('exam')
      .innerJoin('exam.eligibleStudents', 'es')
      .leftJoinAndSelect('exam.subject', 'subj')
      .where('es.studentId = :studentId', { studentId })
      .andWhere('es.isEligible = true')
      .andWhere('exam.status IN (:...statuses)', {
        statuses: [ExaminationStatus.PUBLISHED, ExaminationStatus.SCHEDULED],
      })
      .andWhere('exam.startDate > :now', { now })
      .orderBy('exam.startDate', 'ASC')
      .getMany();
  }

  async getStudentRecentResults(studentId: string, limit = 5) {
    return await this.resultRepo.find({
      where: { studentId, status: ResultStatus.PUBLISHED },
      relations: { examination: { subject: true } },
      order: { releasedAt: 'DESC' },
      take: limit,
    });
  }
}
