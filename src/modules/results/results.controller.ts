import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResultsService } from './results.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, ResultStatus, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@ApiTags('Results Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get()
  @ApiOperation({ summary: 'Get all examination results with filtering' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('testId') testId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: ResultStatus,
  ) {
    return await this.resultsService.findAll({ ...query, testId, studentId, status });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('examinations/:testId')
  @ApiOperation({ summary: 'Get all results for a specific examination' })
  async findByTestId(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.resultsService.findByTestId(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('examinations/:testId/statistics')
  @ApiOperation({ summary: 'Get pass/fail and grade statistics for examination' })
  async getStatistics(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.resultsService.getPassFailStatistics(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('examinations/:testId/rank-list')
  @ApiOperation({ summary: 'Get merit rank list for examination' })
  async getRankList(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.resultsService.getRankList(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('examinations/:testId/pass-fail')
  @ApiOperation({ summary: 'Get pass/fail summary for examination' })
  async getPassFail(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.resultsService.getPassFailStatistics(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post('examinations/:testId/calculate')
  @ApiOperation({ summary: 'Calculate and rank results for examination' })
  async calculateResults(@Param('testId', ParseUUIDPipe) testId: string, @CurrentUser('id') userId: string) {
    const result = await this.resultsService.calculateExamResults(testId);
    await this.auditLogsService.log({
      action: AuditAction.RESULT_CALCULATE,
      entityType: 'Examination',
      entityId: testId,
      userId,
    });
    return result;
  }

  @Roles(UserRole.ADMIN)
  @Post('examinations/:testId/release')
  @ApiOperation({ summary: 'Publish and release examination results to students (Admin only)' })
  async releaseResults(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body('remarks') remarks: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.resultsService.releaseResults(testId, userId, remarks);
    await this.auditLogsService.log({
      action: AuditAction.RESULT_RELEASE,
      entityType: 'Examination',
      entityId: testId,
      details: { remarks },
      userId,
    });
    return result;
  }

  @Roles(UserRole.ADMIN)
  @Post('examinations/:testId/withhold')
  @ApiOperation({ summary: 'Withhold examination results from student view (Admin only)' })
  async withholdResults(@Param('testId', ParseUUIDPipe) testId: string, @CurrentUser('id') userId: string) {
    const result = await this.resultsService.withholdResults(testId);
    await this.auditLogsService.log({
      action: AuditAction.RESULT_WITHHOLD,
      entityType: 'Examination',
      entityId: testId,
      userId,
    });
    return result;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':id')
  @ApiOperation({ summary: 'Get specific result by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.resultsService.findById(id);
  }
}
