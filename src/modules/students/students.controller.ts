import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { StudentsService } from './students.service.js';
import { CreateStudentDto, UpdateStudentDto, UpdateStudentProfileDto } from './dto/create-student.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditAction, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@ApiTags('Student Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post('students')
  @ApiOperation({ summary: 'Create single student (Admin only)' })
  async create(@Body() dto: CreateStudentDto, @CurrentUser('id') adminId: string) {
    const student = await this.studentsService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_CREATE,
      entityType: 'Student',
      entityId: student.id,
      details: { rollNumber: student.rollNumber, name: `${student.firstName} ${student.lastName}` },
      userId: adminId,
    });
    return student;
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('students')
  @ApiOperation({ summary: 'Get all students (Admin/Faculty)' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('departmentId') departmentId?: string,
    @Query('courseId') courseId?: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return await this.studentsService.findAll({ ...query, departmentId, courseId, semesterId });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get('students/:id')
  @ApiOperation({ summary: 'Get student by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.studentsService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch('students/:id')
  @ApiOperation({ summary: 'Update student (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser('id') adminId: string,
  ) {
    const updated = await this.studentsService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_UPDATE,
      entityType: 'Student',
      entityId: id,
      details: dto as Record<string, unknown>,
      userId: adminId,
    });
    return updated;
  }

  // Admin student bulk import
  @Roles(UserRole.ADMIN)
  @Get('admin/students/import/template')
  @ApiOperation({ summary: 'Download Excel template for bulk student import' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="exanova_students_import_template.xlsx"')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.studentsService.generateTemplate();
    res.send(buffer);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/students/import')
  @ApiOperation({ summary: 'Bulk import students from Excel file (In-memory only, no disk storage)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        departmentId: { type: 'string', format: 'uuid' },
        courseId: { type: 'string', format: 'uuid' },
        semesterId: { type: 'string', format: 'uuid' },
        academicSessionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Strict requirement: In-memory only!
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async importStudents(
    @UploadedFile() file: Express.Multer.File,
    @Body('departmentId') departmentId: string,
    @Body('courseId') courseId: string,
    @Body('semesterId') semesterId: string,
    @Body('academicSessionId') academicSessionId: string,
    @CurrentUser('id') adminId: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Excel file is required');
    }
    if (!departmentId || !courseId || !semesterId || !academicSessionId) {
      throw new BadRequestException('departmentId, courseId, semesterId, and academicSessionId are required');
    }

    const result = await this.studentsService.importFromBuffer(file.buffer, {
      departmentId,
      courseId,
      semesterId,
      academicSessionId,
    });

    await this.auditLogsService.log({
      action: AuditAction.USER_CREATE,
      entityType: 'BulkStudentImport',
      details: { imported: result.imported, failed: result.failed },
      userId: adminId,
    });

    return result;
  }

  // Student portal endpoints
  @Roles(UserRole.STUDENT)
  @Get('student/profile')
  @ApiOperation({ summary: 'Get current logged in student profile' })
  async getStudentProfile(@CurrentUser('id') userId: string) {
    return await this.studentsService.findByUserId(userId);
  }

  @Roles(UserRole.STUDENT)
  @Patch('student/profile')
  @ApiOperation({ summary: 'Update student profile contact details' })
  async updateStudentProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return await this.studentsService.updateProfile(userId, dto);
  }
}
