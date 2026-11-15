import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SemestersService } from './semesters.service.js';
import { CreateSemesterDto, UpdateSemesterDto } from './dto/create-semester.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Academic - Semesters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('semesters')
export class SemestersController {
  constructor(
    private readonly semestersService: SemestersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create semester (Admin only)' })
  async create(@Body() dto: CreateSemesterDto, @CurrentUser('id') adminId: string) {
    const sem = await this.semestersService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_CREATE,
      entityType: 'Semester',
      entityId: sem.id,
      details: { name: sem.name, number: sem.semesterNumber },
      userId: adminId,
    });
    return sem;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get all semesters by course ID' })
  async findByCourseId(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return await this.semestersService.findByCourseId(courseId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get(':id')
  @ApiOperation({ summary: 'Get semester by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.semestersService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update semester (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSemesterDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.semestersService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_UPDATE,
      entityType: 'Semester',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete semester (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) {
    const result = await this.semestersService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_DELETE,
      entityType: 'Semester',
      entityId: id,
      userId: adminId,
    });
    return result;
  }
}
