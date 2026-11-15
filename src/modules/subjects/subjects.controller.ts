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
import { SubjectsService } from './subjects.service.js';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Academic - Subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create subject (Admin only)' })
  async create(@Body() dto: CreateSubjectDto, @CurrentUser('id') adminId: string) {
    const subject = await this.subjectsService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_CREATE,
      entityType: 'Subject',
      entityId: subject.id,
      details: { name: subject.name, code: subject.code },
      userId: adminId,
    });
    return subject;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get()
  @ApiOperation({ summary: 'Get all subjects' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('courseId') courseId?: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return await this.subjectsService.findAll({ ...query, courseId, semesterId });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.subjectsService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update subject (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.subjectsService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_UPDATE,
      entityType: 'Subject',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete subject (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) {
    const result = await this.subjectsService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_DELETE,
      entityType: 'Subject',
      entityId: id,
      userId: adminId,
    });
    return result;
  }
}
