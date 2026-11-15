import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service.js';
import { EvaluateAnswerDto } from './dto/evaluate-answer.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { FacultyService } from '../faculty/faculty.service.js';

@ApiTags('Descriptive Evaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly facultyService: FacultyService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private async getFacultyId(userId: string, tokenFacultyId?: string): Promise<string> {
    if (tokenFacultyId) return tokenFacultyId;
    const faculty = await this.facultyService.findByUserId(userId);
    return faculty.id;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('pending')
  @ApiOperation({ summary: 'Get pending descriptive evaluations queue' })
  async getPending(@Query() query: PaginationQueryDto, @Query('testId') testId?: string) {
    return await this.evaluationsService.getPendingEvaluations({ ...query, testId });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('statistics')
  @ApiOperation({ summary: 'Get descriptive evaluation statistics' })
  async getStatistics() {
    return await this.evaluationsService.getEvaluationStatistics();
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('attempts/:attemptId')
  @ApiOperation({ summary: 'Get all descriptive answers and criteria for an attempt' })
  async getAttemptAnswers(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return await this.evaluationsService.findByAttemptId(attemptId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':id')
  @ApiOperation({ summary: 'Get descriptive evaluation by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.evaluationsService.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':answerId')
  @ApiOperation({ summary: 'Evaluate descriptive answer and award marks' })
  async evaluateAnswer(
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @Body() dto: EvaluateAnswerDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('facultyId') tokenFacultyId?: string,
  ) {
    const facultyId = await this.getFacultyId(userId, tokenFacultyId);
    const evaluated = await this.evaluationsService.evaluateAnswer(answerId, dto, facultyId);

    await this.auditLogsService.log({
      action: AuditAction.DESCRIPTIVE_EVALUATION,
      entityType: 'DescriptiveEvaluation',
      entityId: evaluated.id,
      details: { marksAwarded: dto.marksAwarded },
      userId,
    });

    return evaluated;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Patch(':evaluationId')
  @ApiOperation({ summary: 'Update existing descriptive evaluation' })
  async updateEvaluation(
    @Param('evaluationId', ParseUUIDPipe) evaluationId: string,
    @Body() dto: EvaluateAnswerDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('facultyId') tokenFacultyId?: string,
  ) {
    const facultyId = await this.getFacultyId(userId, tokenFacultyId);
    return await this.evaluationsService.updateEvaluation(evaluationId, dto, facultyId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':evaluationId/submit')
  @ApiOperation({ summary: 'Finalize and submit evaluation' })
  async submitEvaluation(
    @Param('evaluationId', ParseUUIDPipe) evaluationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const evaluation = await this.evaluationsService.findById(evaluationId);
    return evaluation;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':evaluationId/reopen')
  @ApiOperation({ summary: 'Reopen evaluation for re-assessment' })
  async reopenEvaluation(@Param('evaluationId', ParseUUIDPipe) evaluationId: string) {
    return await this.evaluationsService.reopenEvaluation(evaluationId);
  }
}
