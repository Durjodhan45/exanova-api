import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Result } from '../results/entities/result.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Faculty } from '../faculty/entities/faculty.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Result, Examination, Student, Faculty, ExamAttempt])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
