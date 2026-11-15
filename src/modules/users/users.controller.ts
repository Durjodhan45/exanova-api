import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AuditAction, UserRole, UserStatus } from '../../shared/enums/index.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create user (Admin only)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    const user = await this.usersService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_CREATE,
      entityType: 'User',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      userId: adminId,
    });
    return user;
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated users (Admin only)' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
  ) {
    return await this.usersService.findAll({ ...query, role, status });
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all users data (Admin only)' })
  async exportUsers(@CurrentUser('id') adminId: string) {
    await this.auditLogsService.log({
      action: AuditAction.REPORT_EXPORT,
      entityType: 'UsersExport',
      userId: adminId,
    });
    return await this.usersService.getAllUsersForExport();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.findByIdSanitized(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.usersService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_UPDATE,
      entityType: 'User',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.usersService.updateStatus(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_STATUS_CHANGE,
      entityType: 'User',
      entityId: id,
      details: { newStatus: dto.status },
      userId: adminId,
    });
    return updated;
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Admin reset user password' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newPassword') newPassword: string | undefined,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.usersService.adminResetPassword(id, newPassword);
    await this.auditLogsService.log({
      action: AuditAction.PASSWORD_RESET_COMPLETE,
      entityType: 'User',
      entityId: id,
      details: { resetByAdmin: true },
      userId: adminId,
    });
    return {
      message: 'Password reset successfully',
      ...result,
    };
  }
}
