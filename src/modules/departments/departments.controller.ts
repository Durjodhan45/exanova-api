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
import { DepartmentsService } from './departments.service.js';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Academic - Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create department (Admin only)' })
  async create(@Body() dto: CreateDepartmentDto, @CurrentUser('id') adminId: string) {
    const created = await this.departmentsService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_CREATE,
      entityType: 'Department',
      entityId: created.id,
      details: { name: created.name, code: created.code },
      userId: adminId,
    });
    return created;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  async findAll(@Query() query: PaginationQueryDto) {
    return await this.departmentsService.findAll(query);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.departmentsService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update department (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.departmentsService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_UPDATE,
      entityType: 'Department',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete department (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) {
    const result = await this.departmentsService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_DELETE,
      entityType: 'Department',
      entityId: id,
      userId: adminId,
    });
    return result;
  }
}
