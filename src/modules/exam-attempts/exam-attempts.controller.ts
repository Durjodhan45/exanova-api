import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ExamAttemptsService } from './exam-attempts.service.js';
import { BulkAnswersDto, SaveAnswerDto } from './dto/save-answer.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { StudentsService } from '../students/students.service.js';

@ApiTags('Student - Examination Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student')
export class ExamAttemptsController {
  constructor(
    private readonly attemptsService: ExamAttemptsService,
    private readonly studentsService: StudentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private async getStudentId(userId: string, studentIdInToken?: string): Promise<string> {
    if (studentIdInToken) return studentIdInToken;
    const student = await this.studentsService.findByUserId(userId);
    return student.id;
  }

  @Roles(UserRole.STUDENT)
  @Get('examinations/:testId/instructions')
  @ApiOperation({ summary: 'Get examination instructions and eligibility' })
  async getInstructions(
    @Param('testId', ParseUUIDPipe) testId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    return await this.attemptsService.getInstructions(testId, studentId);
  }

  @Roles(UserRole.STUDENT)
  @Post('examinations/:testId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Start examination: Initiates server-side authoritative timer, freezes randomized question/option sequences',
  })
  async startExam(
    @Param('testId', ParseUUIDPipe) testId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken: string | undefined,
    @Req() req: Request,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    const attempt = await this.attemptsService.startExam({
      testId,
      studentId,
      ipAddress,
      userAgent,
    });

    await this.auditLogsService.log({
      action: AuditAction.EXAM_ATTEMPT_START,
      entityType: 'ExamAttempt',
      entityId: attempt.id,
      details: { testId, attemptNumber: attempt.attemptNumber },
      userId,
      ipAddress,
      userAgent,
    });

    return attempt;
  }

  @Roles(UserRole.STUDENT)
  @Get('attempts/:attemptId/questions')
  @ApiOperation({
    summary: 'Get questions in frozen sequence for attempt (Answer keys stripped for security)',
  })
  async getQuestions(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    return await this.attemptsService.getAttemptQuestions(attemptId, studentId);
  }

  @Roles(UserRole.STUDENT)
  @Get('attempts/:attemptId/status')
  @ApiOperation({
    summary: 'Get live attempt status and server-side remaining time (auto-submits if time elapsed)',
  })
  async getStatus(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    return await this.attemptsService.getAttemptStatus(attemptId, studentId);
  }

  @Roles(UserRole.STUDENT)
  @Put('attempts/:attemptId/answers/:questionId')
  @ApiOperation({
    summary: 'Autosave student answer (Server deadline checked, rejected if expired)',
  })
  async saveAnswer(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const saved = await this.attemptsService.saveAnswer(attemptId, questionId, studentId, dto);
    return saved;
  }

  @Roles(UserRole.STUDENT)
  @Post('attempts/:attemptId/answers/bulk')
  @ApiOperation({ summary: 'Save multiple answers simultaneously' })
  async saveBulkAnswers(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: BulkAnswersDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    return await this.attemptsService.saveBulkAnswers(attemptId, studentId, dto.answers);
  }

  @Roles(UserRole.STUDENT)
  @Post('attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit examination: Idempotent submission, calculates MCQ score with negative marking engine, queues descriptive answers for evaluation',
  })
  async submitExam(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken: string | undefined,
    @Req() req: Request,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const ipAddress = req.ip || req.socket.remoteAddress;

    const submitted = await this.attemptsService.submitExam(attemptId, studentId);

    await this.auditLogsService.log({
      action: AuditAction.EXAM_SUBMIT,
      entityType: 'ExamAttempt',
      entityId: attemptId,
      userId,
      ipAddress,
    });

    return submitted;
  }

  @Roles(UserRole.STUDENT)
  @Get('examination-history')
  @ApiOperation({ summary: 'Get complete examination attempt history for student' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    return await this.attemptsService.getStudentHistory(studentId);
  }
}
