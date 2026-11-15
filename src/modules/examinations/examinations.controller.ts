import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExaminationsService } from './examinations.service.js';
import {
  CreateExaminationDto,
  UpdateExaminationDto,
  AddEligibleStudentsDto,
  AssignFacultyDto,
} from './dto/create-examination.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, ExaminationStatus, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { FacultyService } from '../faculty/faculty.service.js';

@ApiTags('Examinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('examinations')
export class ExaminationsController {
  constructor(
    private readonly examinationsService: ExaminationsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly facultyService: FacultyService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post()
  @ApiOperation({ summary: 'Create new examination with unique authoritative Test ID (UUID)' })
  async create(
    @Body() dto: CreateExaminationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('facultyId') facultyId: string,
  ) {
    let resolvedFacultyId = facultyId;
    if (!resolvedFacultyId) {
      // In case user is Admin or facultyId is not in token, look up or assign
      const fac = await this.facultyService.findByUserId(userId).catch(() => null);
      if (fac) {
        resolvedFacultyId = fac.id;
      } else {
        // Fetch any existing faculty for admin creation
        const allFaculty = await this.facultyService.findAll({ page: 1, limit: 1 });
        if (allFaculty.items.length === 0) {
          throw new Error('Please create a faculty member first to assign as examination creator');
        }
        resolvedFacultyId = allFaculty.items[0].id;
      }
    }

    const exam = await this.examinationsService.create(dto, resolvedFacultyId);
    await this.auditLogsService.log({
      action: AuditAction.EXAM_CREATE,
      entityType: 'Examination',
      entityId: exam.id,
      details: { title: exam.title, code: exam.examinationCode },
      userId,
    });
    return exam;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get()
  @ApiOperation({ summary: 'Get all examinations with filtering' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: ExaminationStatus,
    @Query('departmentId') departmentId?: string,
    @Query('courseId') courseId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('facultyId') facultyId?: string,
  ) {
    return await this.examinationsService.findAll({
      ...query,
      status,
      departmentId,
      courseId,
      subjectId,
      facultyId,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get(':testId')
  @ApiOperation({ summary: 'Get examination by authoritative Test UUID' })
  async findById(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.examinationsService.findById(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Patch(':testId')
  @ApiOperation({ summary: 'Update examination details (only in DRAFT/SCHEDULED)' })
  async update(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: UpdateExaminationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const updated = await this.examinationsService.update(testId, dto, role, userId);
    await this.auditLogsService.log({
      action: AuditAction.EXAM_UPDATE,
      entityType: 'Examination',
      entityId: testId,
      details: dto as Record<string, unknown>,
      userId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':testId')
  @ApiOperation({ summary: 'Delete examination (Admin only, if no attempts exist)' })
  async remove(@Param('testId', ParseUUIDPipe) testId: string, @CurrentUser('id') userId: string) {
    const result = await this.examinationsService.remove(testId);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_DELETE,
      entityType: 'Examination',
      entityId: testId,
      userId,
    });
    return result;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':testId/publish')
  @ApiOperation({ summary: 'Publish examination and notify eligible students' })
  async publish(@Param('testId', ParseUUIDPipe) testId: string, @CurrentUser('id') userId: string) {
    const published = await this.examinationsService.publish(testId);
    await this.auditLogsService.log({
      action: AuditAction.EXAM_PUBLISH,
      entityType: 'Examination',
      entityId: testId,
      userId,
    });
    return published;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':testId/schedule')
  @ApiOperation({ summary: 'Schedule examination' })
  async schedule(@Param('testId', ParseUUIDPipe) testId: string, @CurrentUser('id') userId: string) {
    const scheduled = await this.examinationsService.schedule(testId);
    await this.auditLogsService.log({
      action: AuditAction.EXAM_SCHEDULE,
      entityType: 'Examination',
      entityId: testId,
      userId,
    });
    return scheduled;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':testId/cancel')
  @ApiOperation({ summary: 'Cancel examination' })
  async cancel(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body('reason') reason: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    const cancelled = await this.examinationsService.cancel(testId, reason);
    await this.auditLogsService.log({
      action: AuditAction.EXAM_CANCEL,
      entityType: 'Examination',
      entityId: testId,
      details: { reason },
      userId,
    });
    return cancelled;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':testId/preview')
  @ApiOperation({ summary: 'Preview examination with questions and answer keys (Faculty/Admin only)' })
  async preview(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.examinationsService.getPreview(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':testId/statistics')
  @ApiOperation({ summary: 'Get examination statistics' })
  async getStatistics(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.examinationsService.getStatistics(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':testId/eligible-students')
  @ApiOperation({ summary: 'Get list of eligible students for examination' })
  async getEligibleStudents(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.examinationsService.getEligibleStudents(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':testId/eligible-students')
  @ApiOperation({ summary: 'Add eligible students to examination' })
  async addEligibleStudents(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: AddEligibleStudentsDto,
  ) {
    return await this.examinationsService.addEligibleStudents(testId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Delete(':testId/eligible-students/:studentId')
  @ApiOperation({ summary: 'Revoke student eligibility for examination' })
  async removeEligibleStudent(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return await this.examinationsService.removeEligibleStudent(testId, studentId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':testId/assign-faculty')
  @ApiOperation({ summary: 'Assign faculty to examination (evaluator/invigilator)' })
  async assignFaculty(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: AssignFacultyDto,
  ) {
    return await this.examinationsService.assignFaculty(testId, dto);
  }
}
