import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated audit logs (Admin only)' })
  async getAuditLogs(
    @Query() query: PaginationQueryDto,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
  ) {
    return await this.auditLogsService.findAll({ ...query, action, entityType, userId });
  }
}
