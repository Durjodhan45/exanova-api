import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Examination } from '../examinations/entities/examination.entity.js';
import { ExamEligibleStudent } from '../examinations/entities/exam-eligible-student.entity.js';
import { ExamAttempt } from './entities/exam-attempt.entity.js';
import { StudentsService } from '../students/students.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AttemptStatus, ExaminationStatus, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Student - Examinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('student/examinations')
export class StudentExaminationsController {
  constructor(
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(ExamEligibleStudent)
    private readonly eligibleRepo: Repository<ExamEligibleStudent>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
    private readonly studentsService: StudentsService,
  ) {}

  private async getStudentId(userId: string, studentIdInToken?: string): Promise<string> {
    if (studentIdInToken) return studentIdInToken;
    const student = await this.studentsService.findByUserId(userId);
    return student.id;
  }

  @Get()
  @ApiOperation({ summary: 'Get all examinations student is eligible for' })
  async getAllEligibleExams(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const eligibleRecords = await this.eligibleRepo.find({
      where: { studentId, isEligible: true },
      relations: {
        examination: { subject: true, department: true, course: true },
      },
    });

    return eligibleRecords.map((er) => er.examination);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active (live) examinations for student' })
  async getActiveExams(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const eligibleRecords = await this.eligibleRepo.find({
      where: { studentId, isEligible: true },
      relations: { examination: { subject: true } },
    });

    const now = new Date();
    const activeExams = eligibleRecords
      .map((er) => er.examination)
      .filter(
        (e) =>
          (e.status === ExaminationStatus.PUBLISHED || e.status === ExaminationStatus.LIVE) &&
          now >= new Date(e.startDate) &&
          now <= new Date(e.endDate),
      );

    return activeExams;
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming examinations scheduled for student' })
  async getUpcomingExams(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const eligibleRecords = await this.eligibleRepo.find({
      where: { studentId, isEligible: true },
      relations: { examination: { subject: true } },
    });

    const now = new Date();
    const upcomingExams = eligibleRecords
      .map((er) => er.examination)
      .filter(
        (e) =>
          (e.status === ExaminationStatus.PUBLISHED || e.status === ExaminationStatus.SCHEDULED) &&
          now < new Date(e.startDate),
      );

    return upcomingExams;
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get completed examination attempts for student' })
  async getCompletedExams(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const completedAttempts = await this.attemptRepo.find({
      where: [
        { studentId, status: AttemptStatus.SUBMITTED },
        { studentId, status: AttemptStatus.EVALUATED },
      ],
      relations: {
        examination: { subject: true },
        result: true,
      },
      order: { submittedAt: 'DESC' },
    });

    return completedAttempts;
  }
}
