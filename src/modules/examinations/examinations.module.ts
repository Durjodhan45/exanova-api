import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Examination } from './entities/examination.entity.js';
import { ExamEligibleStudent } from './entities/exam-eligible-student.entity.js';
import { ExamAssignment } from '../exam-assignments/entities/exam-assignment.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { ExaminationsService } from './examinations.service.js';
import { ExaminationsController } from './examinations.controller.js';
import { FacultyModule } from '../faculty/faculty.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Examination,
      ExamEligibleStudent,
      ExamAssignment,
      Question,
      ExamAttempt,
      Student,
    ]),
    FacultyModule,
  ],
  controllers: [ExaminationsController],
  providers: [ExaminationsService],
  exports: [ExaminationsService],
})
export class ExaminationsModule {}
