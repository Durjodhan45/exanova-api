import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../shared/enums/index.js';

@ApiTags('Reports & Exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN)
  @Get('students')
  @ApiOperation({ summary: 'Student-wise aggregated report (Admin only)' })
  async getStudentsReport(@Query() query: PaginationQueryDto) {
    return await this.reportsService.getStudentsReport(query);
  }

  @Roles(UserRole.ADMIN)
  @Get('faculty')
  @ApiOperation({ summary: 'Faculty activity report (Admin only)' })
  async getFacultyReport(@Query() query: PaginationQueryDto) {
    return await this.reportsService.getFacultyReport(query);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('examinations')
  @ApiOperation({ summary: 'Examinations overview report' })
  async getExaminationsReport(@Query() query: PaginationQueryDto) {
    return await this.reportsService.getExaminationsReport(query);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('results')
  @ApiOperation({ summary: 'Consolidated results report' })
  async getResultsReport(
    @Query() query: PaginationQueryDto,
    @Query('testId') testId?: string,
  ) {
    return await this.reportsService.getResultsReport({ ...query, testId });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('results/export/excel')
  @ApiOperation({
    summary:
      'Export consolidated results to Excel (Buffer generated on the fly, never stored to disk)',
  })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportExcel(@Query('testId') testId: string | undefined, @Res() res: Response) {
    const buffer = await this.reportsService.exportResultsExcel(testId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="exanova_results_report.xlsx"',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('results/export/pdf')
  @ApiOperation({
    summary:
      'Export consolidated results to PDF (Buffer generated on the fly, never stored to disk)',
  })
  @Header('Content-Type', 'application/pdf')
  async exportPdf(@Query('testId') testId: string | undefined, @Res() res: Response) {
    const buffer = await this.reportsService.exportResultsPdf(testId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="exanova_results_report.pdf"',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('examinations/:testId/performance')
  @ApiOperation({ summary: 'Examination performance statistics' })
  async getExamPerformance(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.reportsService.getExamPerformance(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('examinations/:testId/submissions')
  @ApiOperation({ summary: 'Student submissions report for examination' })
  async getExamSubmissions(@Param('testId', ParseUUIDPipe) testId: string) {
    return await this.reportsService.getExamSubmissions(testId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('subjects/:subjectId/results')
  @ApiOperation({ summary: 'Subject-wise historical results' })
  async getSubjectResults(@Param('subjectId', ParseUUIDPipe) subjectId: string) {
    return await this.reportsService.getSubjectResults(subjectId);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('semesters/:semesterId/results')
  @ApiOperation({ summary: 'Semester-wise historical results' })
  async getSemesterResults(@Param('semesterId', ParseUUIDPipe) semesterId: string) {
    return await this.reportsService.getSemesterResults(semesterId);
  }
}
