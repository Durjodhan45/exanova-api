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
import { FacultyService } from './faculty.service.js';
import { AssignSubjectDto, CreateFacultyDto, UpdateFacultyDto } from './dto/create-faculty.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@ApiTags('Faculty Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('faculty')
export class FacultyController {
  constructor(
    private readonly facultyService: FacultyService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create faculty profile and account (Admin only)' })
  async create(@Body() dto: CreateFacultyDto, @CurrentUser('id') adminId: string) {
    const created = await this.facultyService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_CREATE,
      entityType: 'Faculty',
      entityId: created.id,
      details: { employeeId: created.employeeId, name: `${created.firstName} ${created.lastName}` },
      userId: adminId,
    });
    return created;
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all faculty members (Admin only)' })
  async findAll(@Query() query: PaginationQueryDto, @Query('departmentId') departmentId?: string) {
    return await this.facultyService.findAll({ ...query, departmentId });
  }

  @Roles(UserRole.FACULTY)
  @Get('my-subjects')
  @ApiOperation({ summary: 'Get subjects assigned to currently logged in faculty' })
  async getMySubjects(@CurrentUser('facultyId') facultyId: string, @CurrentUser('id') userId: string) {
    let resolvedFacultyId = facultyId;
    if (!resolvedFacultyId) {
      const fac = await this.facultyService.findByUserId(userId);
      resolvedFacultyId = fac.id;
    }
    return await this.facultyService.getAssignedSubjects(resolvedFacultyId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':id')
  @ApiOperation({ summary: 'Get faculty member by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.facultyService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update faculty member (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacultyDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.facultyService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_UPDATE,
      entityType: 'Faculty',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Post('assignments')
  @ApiOperation({ summary: 'Assign faculty to a subject for an academic session (Admin only)' })
  async assignSubject(@Body() dto: AssignSubjectDto, @CurrentUser('id') adminId: string) {
    const assignment = await this.facultyService.assignSubject(dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_CREATE,
      entityType: 'FacultySubjectAssignment',
      entityId: assignment.id,
      details: { facultyId: dto.facultyId, subjectId: dto.subjectId },
      userId: adminId,
    });
    return assignment;
  }

  @Roles(UserRole.ADMIN)
  @Delete('assignments/:id')
  @ApiOperation({ summary: 'Remove faculty-subject assignment (Admin only)' })
  async removeAssignment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) {
    const result = await this.facultyService.removeAssignment(id);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_DELETE,
      entityType: 'FacultySubjectAssignment',
      entityId: id,
      userId: adminId,
    });
    return result;
  }
}
