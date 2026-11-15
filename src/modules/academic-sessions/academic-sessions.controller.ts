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
import { AcademicSessionsService } from './academic-sessions.service.js';
import { CreateAcademicSessionDto, UpdateAcademicSessionDto } from './dto/create-academic-session.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Academic - Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic-sessions')
export class AcademicSessionsController {
  constructor(
    private readonly sessionService: AcademicSessionsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create academic session (Admin only)' })
  async create(@Body() dto: CreateAcademicSessionDto, @CurrentUser('id') adminId: string) {
    const session = await this.sessionService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_CREATE,
      entityType: 'AcademicSession',
      entityId: session.id,
      details: { name: session.name },
      userId: adminId,
    });
    return session;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get()
  @ApiOperation({ summary: 'Get all academic sessions' })
  async findAll() {
    return await this.sessionService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get('current')
  @ApiOperation({ summary: 'Get current active academic session' })
  async getCurrent() {
    return await this.sessionService.getCurrent();
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get(':id')
  @ApiOperation({ summary: 'Get academic session by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.sessionService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update academic session (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicSessionDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.sessionService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_UPDATE,
      entityType: 'AcademicSession',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete academic session (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) {
    const result = await this.sessionService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_ENTITY_DELETE,
      entityType: 'AcademicSession',
      entityId: id,
      userId: adminId,
    });
    return result;
  }
}
