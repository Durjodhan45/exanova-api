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
import { QuestionsService } from './questions.service.js';
import {
  BulkQuestionsDto,
  CreateQuestionDto,
  ReorderQuestionsDto,
  UpdateQuestionDto,
} from './dto/create-question.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, QuestionType, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@ApiTags('Question Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post()
  @ApiOperation({ summary: 'Create question associated with Test UUID' })
  async create(@Body() dto: CreateQuestionDto, @CurrentUser('id') userId: string) {
    const question = await this.questionsService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_CREATE,
      entityType: 'Question',
      entityId: question.id,
      details: { testId: question.testId, type: question.questionType },
      userId,
    });
    return question;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create questions for an examination in transaction' })
  async createBulk(@Body() dto: BulkQuestionsDto, @CurrentUser('id') userId: string) {
    const questions = await this.questionsService.createBulk(dto);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_CREATE,
      entityType: 'BulkQuestionCreate',
      details: { testId: dto.testId, count: questions.length },
      userId,
    });
    return questions;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get()
  @ApiOperation({ summary: 'Get all questions with optional Test UUID filter' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('testId') testId?: string,
    @Query('questionType') questionType?: QuestionType,
  ) {
    return await this.questionsService.findAll({ ...query, testId, questionType });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':id')
  @ApiOperation({ summary: 'Get question by ID (includes answer key for faculty)' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionsService.findById(id, true);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder questions within an examination' })
  async reorder(@Body() dto: ReorderQuestionsDto, @CurrentUser('id') userId: string) {
    const result = await this.questionsService.reorder(dto);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_UPDATE,
      entityType: 'QuestionReorder',
      details: { testId: dto.testId, count: dto.orders.length },
      userId,
    });
    return result;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing question' })
  async duplicate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    const duplicated = await this.questionsService.duplicate(id);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_CREATE,
      entityType: 'QuestionDuplicate',
      entityId: duplicated.id,
      details: { originalQuestionId: id },
      userId,
    });
    return duplicated;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Patch(':id')
  @ApiOperation({ summary: 'Update question' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser('id') userId: string,
  ) {
    const updated = await this.questionsService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_UPDATE,
      entityType: 'Question',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId,
    });
    return updated;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete question' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    const result = await this.questionsService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_DELETE,
      entityType: 'Question',
      entityId: id,
      userId,
    });
    return result;
  }
}
