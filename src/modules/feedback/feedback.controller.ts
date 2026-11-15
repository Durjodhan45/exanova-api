import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { FacultyService } from '../faculty/faculty.service.js';
import { StudentsService } from '../students/students.service.js';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly facultyService: FacultyService,
    private readonly studentsService: StudentsService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post()
  @ApiOperation({ summary: 'Submit feedback for a student attempt' })
  async create(
    @Body()
    dto: {
      attemptId: string;
      studentId: string;
      feedbackText: string;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('facultyId') tokenFacultyId?: string,
  ) {
    let facultyId = tokenFacultyId;
    if (!facultyId) {
      const fac = await this.facultyService.findByUserId(userId);
      facultyId = fac.id;
    }
    return await this.feedbackService.create({
      ...dto,
      facultyId,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @Get('attempt/:attemptId')
  @ApiOperation({ summary: 'Get feedback for specific attempt' })
  async getByAttempt(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return await this.feedbackService.findByAttemptId(attemptId);
  }

  @Roles(UserRole.STUDENT)
  @Get('my-feedback')
  @ApiOperation({ summary: 'Get all feedback received by current student' })
  async getMyFeedback(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') tokenStudentId?: string,
  ) {
    let studentId = tokenStudentId;
    if (!studentId) {
      const student = await this.studentsService.findByUserId(userId);
      studentId = student.id;
    }
    return await this.feedbackService.findByStudentId(studentId);
  }
}
