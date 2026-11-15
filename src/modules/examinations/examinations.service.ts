import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Examination } from './entities/examination.entity.js';
import { ExamEligibleStudent } from './entities/exam-eligible-student.entity.js';
import { ExamAssignment } from '../exam-assignments/entities/exam-assignment.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  CreateExaminationDto,
  UpdateExaminationDto,
  AddEligibleStudentsDto,
  AssignFacultyDto,
} from './dto/create-examination.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import {
  ExaminationStatus,
  NotificationType,
  UserRole,
} from '../../shared/enums/index.js';

@Injectable()
export class ExaminationsService {
  constructor(
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(ExamEligibleStudent)
    private readonly eligibleRepo: Repository<ExamEligibleStudent>,
    @InjectRepository(ExamAssignment)
    private readonly assignmentRepo: Repository<ExamAssignment>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateExaminationDto, facultyId: string): Promise<Examination> {
    const existing = await this.examRepo.findOne({
      where: { examinationCode: dto.examinationCode },
    });
    if (existing) {
      throw new ConflictException(`Examination with code '${dto.examinationCode}' already exists`);
    }

    const exam = this.examRepo.create({
      ...dto,
      createdByFacultyId: facultyId,
      status: ExaminationStatus.DRAFT,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });

    const savedExam = await this.examRepo.save(exam);

    // Automatically assign creating faculty as CREATOR
    await this.assignmentRepo.save(
      this.assignmentRepo.create({
        testId: savedExam.id,
        facultyId,
        role: 'CREATOR',
      }),
    );

    // Automatically make all students of the course/semester eligible
    const matchingStudents = await this.studentRepo.find({
      where: {
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        currentSemesterId: dto.semesterId,
      },
    });

    if (matchingStudents.length > 0) {
      const eligibleEntries = matchingStudents.map((s) =>
        this.eligibleRepo.create({
          testId: savedExam.id,
          studentId: s.id,
          isEligible: true,
        }),
      );
      await this.eligibleRepo.save(eligibleEntries);
    }

    return savedExam;
  }

  async findAll(
    query: PaginationQueryDto & {
      status?: ExaminationStatus;
      departmentId?: string;
      courseId?: string;
      subjectId?: string;
      facultyId?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.department', 'dept')
      .leftJoinAndSelect('exam.course', 'course')
      .leftJoinAndSelect('exam.semester', 'semester')
      .leftJoinAndSelect('exam.subject', 'subj')
      .leftJoinAndSelect('exam.createdByFaculty', 'faculty')
      .orderBy('exam.startDate', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('exam.status = :status', { status: query.status });
    }
    if (query.departmentId) {
      qb.andWhere('exam.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    if (query.courseId) {
      qb.andWhere('exam.courseId = :courseId', { courseId: query.courseId });
    }
    if (query.subjectId) {
      qb.andWhere('exam.subjectId = :subjectId', { subjectId: query.subjectId });
    }
    if (query.facultyId) {
      qb.andWhere('exam.createdByFacultyId = :facultyId', { facultyId: query.facultyId });
    }
    if (query.search) {
      qb.andWhere('(exam.title ILIKE :search OR exam.examinationCode ILIKE :search)', {
        search: `%${query.search}%`,
      });
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

  async findById(testId: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({
      where: { id: testId },
      relations: {
        department: true,
        course: true,
        semester: true,
        subject: true,
        academicSession: true,
        createdByFaculty: true,
        assignments: { faculty: true },
        questions: { options: true },
      },
    });
    if (!exam) {
      throw new NotFoundException(`Examination with Test ID '${testId}' not found`);
    }
    return exam;
  }

  async update(testId: string, dto: UpdateExaminationDto, userRole: UserRole, userId: string): Promise<Examination> {
    const exam = await this.findById(testId);

    // Only DRAFT or SCHEDULED examinations can be modified
    if (exam.status !== ExaminationStatus.DRAFT && exam.status !== ExaminationStatus.SCHEDULED) {
      throw new BadRequestException(
        `Examination cannot be modified because its current status is '${exam.status}'. Questions and configurations are frozen for active/completed tests.`,
      );
    }

    if (dto.examinationCode && dto.examinationCode !== exam.examinationCode) {
      const exists = await this.examRepo.findOne({ where: { examinationCode: dto.examinationCode } });
      if (exists) throw new ConflictException(`Examination code '${dto.examinationCode}' already exists`);
      exam.examinationCode = dto.examinationCode;
    }

    if (dto.title) exam.title = dto.title;
    if (dto.description !== undefined) exam.description = dto.description;
    if (dto.startDate) exam.startDate = new Date(dto.startDate);
    if (dto.endDate) exam.endDate = new Date(dto.endDate);
    if (dto.duration) exam.duration = dto.duration;
    if (dto.totalMarks) exam.totalMarks = dto.totalMarks;
    if (dto.passingMarks) exam.passingMarks = dto.passingMarks;
    if (dto.maxAttempts) exam.maxAttempts = dto.maxAttempts;
    if (dto.randomizeQuestions !== undefined) exam.randomizeQuestions = dto.randomizeQuestions;
    if (dto.randomizeOptions !== undefined) exam.randomizeOptions = dto.randomizeOptions;
    if (dto.negativeMarkingType) exam.negativeMarkingType = dto.negativeMarkingType;
    if (dto.negativeMarkingValue !== undefined) exam.negativeMarkingValue = dto.negativeMarkingValue;
    if (dto.allowNegativeMarksBelowZero !== undefined) exam.allowNegativeMarksBelowZero = dto.allowNegativeMarksBelowZero;
    if (dto.instructions !== undefined) exam.instructions = dto.instructions;

    return await this.examRepo.save(exam);
  }

  async remove(testId: string): Promise<{ deleted: boolean }> {
    const exam = await this.findById(testId);

    const attemptsCount = await this.attemptRepo.count({ where: { testId } });
    if (attemptsCount > 0) {
      throw new BadRequestException(
        `Cannot delete examination because it has ${attemptsCount} student attempt(s). Cancel the exam instead.`,
      );
    }

    await this.examRepo.remove(exam);
    return { deleted: true };
  }

  async publish(testId: string): Promise<Examination> {
    const exam = await this.findById(testId);

    // Verify questions exist
    const questionCount = await this.questionRepo.count({ where: { testId } });
    if (questionCount === 0) {
      throw new BadRequestException('Cannot publish examination with 0 questions');
    }

    exam.status = ExaminationStatus.PUBLISHED;
    const saved = await this.examRepo.save(exam);

    // Notify all eligible students
    const eligibleStudents = await this.eligibleRepo.find({
      where: { testId, isEligible: true },
      relations: { student: { user: true } },
    });

    const userIds = eligibleStudents
      .map((es) => es.student?.user?.id)
      .filter((id): id is string => Boolean(id));

    await this.notificationsService.createForUsers(userIds, {
      type: NotificationType.EXAM_PUBLISHED,
      title: `New Examination Published: ${exam.title}`,
      message: `The examination '${exam.title}' (${exam.examinationCode}) has been published. Start: ${exam.startDate.toISOString()}, Duration: ${exam.duration} minutes.`,
      metadata: { testId: exam.id, code: exam.examinationCode },
    });

    return saved;
  }

  async schedule(testId: string): Promise<Examination> {
    const exam = await this.findById(testId);
    exam.status = ExaminationStatus.SCHEDULED;
    return await this.examRepo.save(exam);
  }

  async cancel(testId: string, reason?: string): Promise<Examination> {
    const exam = await this.findById(testId);
    exam.status = ExaminationStatus.CANCELLED;
    const saved = await this.examRepo.save(exam);

    const eligibleStudents = await this.eligibleRepo.find({
      where: { testId, isEligible: true },
      relations: { student: { user: true } },
    });

    const userIds = eligibleStudents
      .map((es) => es.student?.user?.id)
      .filter((id): id is string => Boolean(id));

    await this.notificationsService.createForUsers(userIds, {
      type: NotificationType.EXAM_CANCELLED,
      title: `Examination Cancelled: ${exam.title}`,
      message: `The examination '${exam.title}' has been cancelled. Reason: ${reason || 'Administrative decision.'}`,
      metadata: { testId: exam.id },
    });

    return saved;
  }

  async getPreview(testId: string): Promise<Examination> {
    return await this.findById(testId);
  }

  async getStatistics(testId: string) {
    const exam = await this.findById(testId);
    const totalAttempts = await this.attemptRepo.count({ where: { testId } });
    const eligibleCount = await this.eligibleRepo.count({ where: { testId, isEligible: true } });
    const questionCount = await this.questionRepo.count({ where: { testId } });

    return {
      testId: exam.id,
      title: exam.title,
      code: exam.examinationCode,
      status: exam.status,
      totalQuestions: questionCount,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      eligibleStudents: eligibleCount,
      totalAttempts,
      participationRate: eligibleCount > 0 ? `${Math.round((totalAttempts / eligibleCount) * 100)}%` : '0%',
    };
  }

  async getEligibleStudents(testId: string) {
    return await this.eligibleRepo.find({
      where: { testId },
      relations: { student: { user: true, department: true, course: true } },
    });
  }

  async addEligibleStudents(testId: string, dto: AddEligibleStudentsDto) {
    const exam = await this.findById(testId);
    const entries: ExamEligibleStudent[] = [];

    for (const studentId of dto.studentIds) {
      const existing = await this.eligibleRepo.findOne({ where: { testId, studentId } });
      if (!existing) {
        entries.push(
          this.eligibleRepo.create({
            testId: exam.id,
            studentId,
            isEligible: true,
          }),
        );
      } else {
        existing.isEligible = true;
        entries.push(existing);
      }
    }

    return await this.eligibleRepo.save(entries);
  }

  async removeEligibleStudent(testId: string, studentId: string) {
    const record = await this.eligibleRepo.findOne({ where: { testId, studentId } });
    if (!record) throw new NotFoundException('Eligible student record not found');
    record.isEligible = false;
    await this.eligibleRepo.save(record);
    return { success: true, message: 'Student eligibility revoked' };
  }

  async assignFaculty(testId: string, dto: AssignFacultyDto) {
    const existing = await this.assignmentRepo.findOne({
      where: { testId, facultyId: dto.facultyId },
    });
    if (existing) {
      existing.role = dto.role || 'EVALUATOR';
      return await this.assignmentRepo.save(existing);
    }

    const assignment = this.assignmentRepo.create({
      testId,
      facultyId: dto.facultyId,
      role: dto.role || 'EVALUATOR',
    });
    return await this.assignmentRepo.save(assignment);
  }
}
