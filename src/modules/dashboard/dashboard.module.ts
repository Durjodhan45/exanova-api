import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Faculty } from '../faculty/entities/faculty.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { DescriptiveEvaluation } from '../evaluations/entities/descriptive-evaluation.entity.js';
import { Result } from '../results/entities/result.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardController } from './dashboard.controller.js';
import { FacultyModule } from '../faculty/faculty.module.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Student,
      Faculty,
      Examination,
      ExamAttempt,
      DescriptiveEvaluation,
      Result,
      AuditLog,
    ]),
    FacultyModule,
    StudentsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
