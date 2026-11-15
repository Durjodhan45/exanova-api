import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { QuestionImportsService } from './question-imports.service.js';
import { TemplateGeneratorService } from './parsers/template-generator.service.js';
import { UpdateStagedQuestionDto } from './dto/update-staged-question.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@ApiTags('Question Imports (Word & Excel)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('question-imports')
export class QuestionImportsController {
  constructor(
    private readonly importsService: QuestionImportsService,
    private readonly templateService: TemplateGeneratorService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('templates/mcq')
  @ApiOperation({ summary: 'Download Excel template for MCQ questions' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="exanova_mcq_template.xlsx"')
  async getMcqTemplate(@Res() res: Response) {
    const buffer = await this.templateService.generateMcqTemplate();
    res.send(buffer);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('templates/descriptive')
  @ApiOperation({ summary: 'Download Excel template for Descriptive questions' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="exanova_descriptive_template.xlsx"')
  async getDescriptiveTemplate(@Res() res: Response) {
    const buffer = await this.templateService.generateDescriptiveTemplate();
    res.send(buffer);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('templates/mixed')
  @ApiOperation({ summary: 'Download Excel template for Mixed questions' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="exanova_mixed_template.xlsx"')
  async getMixedTemplate(@Res() res: Response) {
    const buffer = await this.templateService.generateMixedTemplate();
    res.send(buffer);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post('upload')
  @ApiOperation({
    summary: 'Upload DOCX or XLSX question paper (Processed directly from memory buffer, no file storage)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        testId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // STRICT: Memory storage only! No persistent files!
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Body('testId') testId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Word (.docx) or Excel (.xlsx) file is required');
    }
    if (!testId) {
      throw new BadRequestException('testId is required');
    }

    const result = await this.importsService.processUpload({
      testId,
      userId,
      file,
    });

    await this.auditLogsService.log({
      action: AuditAction.QUESTION_IMPORT_UPLOAD,
      entityType: 'QuestionImport',
      entityId: result.importId,
      details: {
        testId,
        filename: file.originalname,
        totalQuestions: result.totalQuestions,
        valid: result.validQuestions,
        invalid: result.invalidQuestions,
      },
      userId,
    });

    return result;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':importId')
  @ApiOperation({ summary: 'Get question import metadata and details' })
  async getImport(@Param('importId', ParseUUIDPipe) importId: string) {
    return await this.importsService.getImport(importId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':importId/preview')
  @ApiOperation({ summary: 'Get question import preview from PostgreSQL staging records' })
  async getPreview(@Param('importId', ParseUUIDPipe) importId: string) {
    return await this.importsService.getPreview(importId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':importId/errors')
  @ApiOperation({ summary: 'Get question import validation errors' })
  async getErrors(@Param('importId', ParseUUIDPipe) importId: string) {
    return await this.importsService.getErrors(importId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Patch(':importId/questions/:questionId')
  @ApiOperation({ summary: 'Edit and correct a staged question in PostgreSQL' })
  async updateStagedQuestion(
    @Param('importId', ParseUUIDPipe) importId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateStagedQuestionDto,
  ) {
    return await this.importsService.updateStagedQuestion(importId, questionId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Delete(':importId/questions/:questionId')
  @ApiOperation({ summary: 'Delete an invalid staged question' })
  async deleteStagedQuestion(
    @Param('importId', ParseUUIDPipe) importId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return await this.importsService.deleteStagedQuestion(importId, questionId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':importId/confirm')
  @ApiOperation({
    summary:
      'Confirm import: Commit validated staged questions into permanent PostgreSQL tables within a transaction',
  })
  async confirmImport(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.importsService.confirmImport(importId);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_IMPORT_CONFIRM,
      entityType: 'QuestionImport',
      entityId: importId,
      details: { testId: result.testId, questionsImported: result.questionsImported },
      userId,
    });
    return result;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':importId/cancel')
  @ApiOperation({ summary: 'Cancel import and clean up staged records' })
  async cancelImport(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.importsService.cancelImport(importId);
    await this.auditLogsService.log({
      action: AuditAction.QUESTION_IMPORT_CANCEL,
      entityType: 'QuestionImport',
      entityId: importId,
      userId,
    });
    return result;
  }
}
