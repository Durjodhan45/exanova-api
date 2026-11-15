import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ResultsService } from './results.service.js';
import { FeedbackService } from '../feedback/feedback.service.js';
import { StudentsService } from '../students/students.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Student - Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('student/results')
export class StudentResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly feedbackService: FeedbackService,
    private readonly studentsService: StudentsService,
  ) {}

  private async getStudentId(userId: string, studentIdInToken?: string): Promise<string> {
    if (studentIdInToken) return studentIdInToken;
    const student = await this.studentsService.findByUserId(userId);
    return student.id;
  }

  @Get()
  @ApiOperation({ summary: 'Get released examination results for logged in student' })
  async getMyResults(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    return await this.resultsService.getStudentResults(studentId);
  }

  @Get(':resultId')
  @ApiOperation({ summary: 'Get single released result detail' })
  async getResultDetail(
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    return await this.resultsService.getStudentResultById(resultId, studentId);
  }

  @Get(':resultId/scorecard')
  @ApiOperation({
    summary:
      'Download official ExaNova examination scorecard (PDF generated on the fly into buffer, never saved to disk)',
  })
  @Header('Content-Type', 'application/pdf')
  async downloadScorecard(
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken: string | undefined,
    @Res() res: Response,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const pdfBuffer = await this.resultsService.generatePdfScorecard(resultId, studentId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="exanova_scorecard_${resultId.substring(0, 8)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Get(':resultId/feedback')
  @ApiOperation({ summary: 'Get faculty evaluation feedback for result' })
  async getFeedback(
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') studentIdInToken?: string,
  ) {
    const studentId = await this.getStudentId(userId, studentIdInToken);
    const result = await this.resultsService.getStudentResultById(resultId, studentId);
    return await this.feedbackService.findByAttemptId(result.attemptId);
  }
}
