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
import { CoursesService } from './courses.service.js';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Academic - Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create course with automatic semester initialization (Admin only)' })
  async create(@Body() dto: CreateCourseDto, @CurrentUser('id') adminId: string) {
    const course = await this.coursesService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_CREATE,
      entityType: 'Course',
      entityId: course.id,
      details: { name: course.name, code: course.code },
      userId: adminId,
    });
    return course;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('departmentId') departmentId?: string,
  ) {
    return await this.coursesService.findAll({ ...query, departmentId });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.coursesService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update course (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.coursesService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_UPDATE,
      entityType: 'Course',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete course (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) {
    const result = await this.coursesService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_DELETE,
      entityType: 'Course',
      entityId: id,
      userId: adminId,
    });
    return result;
  }
}
