import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { FacultyService } from '../faculty/faculty.service.js';
import { StudentsService } from '../students/students.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly facultyService: FacultyService,
    private readonly studentsService: StudentsService,
  ) {}

  // Admin Dashboard
  @Roles(UserRole.ADMIN)
  @Get('admin/overview')
  @ApiOperation({ summary: 'Admin overview dashboard statistics' })
  async getAdminOverview() {
    return await this.dashboardService.getAdminOverview();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/examination-statistics')
  @ApiOperation({ summary: 'Admin examination breakdown statistics' })
  async getAdminExamStats() {
    return await this.dashboardService.getAdminExaminationStats();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/user-statistics')
  @ApiOperation({ summary: 'Admin user distribution statistics' })
  async getAdminUserStats() {
    return await this.dashboardService.getAdminUserStats();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/recent-activities')
  @ApiOperation({ summary: 'Admin recent system activities from audit log' })
  async getAdminRecentActivities(@Query('limit') limit?: number) {
    return await this.dashboardService.getAdminRecentActivities(limit || 10);
  }

  // Faculty Dashboard
  @Roles(UserRole.FACULTY)
  @Get('faculty/overview')
  @ApiOperation({ summary: 'Faculty overview dashboard statistics' })
  async getFacultyOverview(
    @CurrentUser('id') userId: string,
    @CurrentUser('facultyId') tokenFacultyId?: string,
  ) {
    let facultyId = tokenFacultyId;
    if (!facultyId) {
      const fac = await this.facultyService.findByUserId(userId);
      facultyId = fac.id;
    }
    return await this.dashboardService.getFacultyOverview(facultyId);
  }

  @Roles(UserRole.FACULTY)
  @Get('faculty/examinations')
  @ApiOperation({ summary: 'Faculty created examinations' })
  async getFacultyExaminations(
    @CurrentUser('id') userId: string,
    @CurrentUser('facultyId') tokenFacultyId?: string,
  ) {
    let facultyId = tokenFacultyId;
    if (!facultyId) {
      const fac = await this.facultyService.findByUserId(userId);
      facultyId = fac.id;
    }
    return await this.dashboardService.getFacultyExaminations(facultyId);
  }

  @Roles(UserRole.FACULTY)
  @Get('faculty/pending-evaluations')
  @ApiOperation({ summary: 'Faculty pending descriptive evaluations' })
  async getFacultyPendingEvaluations(
    @CurrentUser('id') userId: string,
    @CurrentUser('facultyId') tokenFacultyId?: string,
  ) {
    let facultyId = tokenFacultyId;
    if (!facultyId) {
      const fac = await this.facultyService.findByUserId(userId);
      facultyId = fac.id;
    }
    return await this.dashboardService.getFacultyPendingEvaluations(facultyId);
  }

  // Student Dashboard
  @Roles(UserRole.STUDENT)
  @Get('student/overview')
  @ApiOperation({ summary: 'Student overview dashboard statistics' })
  async getStudentOverview(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') tokenStudentId?: string,
  ) {
    let studentId = tokenStudentId;
    if (!studentId) {
      const student = await this.studentsService.findByUserId(userId);
      studentId = student.id;
    }
    return await this.dashboardService.getStudentOverview(studentId);
  }

  @Roles(UserRole.STUDENT)
  @Get('student/upcoming-examinations')
  @ApiOperation({ summary: 'Student upcoming scheduled examinations' })
  async getStudentUpcoming(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') tokenStudentId?: string,
  ) {
    let studentId = tokenStudentId;
    if (!studentId) {
      const student = await this.studentsService.findByUserId(userId);
      studentId = student.id;
    }
    return await this.dashboardService.getStudentUpcomingExaminations(studentId);
  }

  @Roles(UserRole.STUDENT)
  @Get('student/recent-results')
  @ApiOperation({ summary: 'Student recent released examination results' })
  async getStudentRecentResults(
    @CurrentUser('id') userId: string,
    @CurrentUser('studentId') tokenStudentId?: string,
  ) {
    let studentId = tokenStudentId;
    if (!studentId) {
      const student = await this.studentsService.findByUserId(userId);
      studentId = student.id;
    }
    return await this.dashboardService.getStudentRecentResults(studentId);
  }
}
