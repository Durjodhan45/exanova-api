import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DescriptiveEvaluation } from './entities/descriptive-evaluation.entity.js';
import { StudentAnswer } from '../exam-submissions/entities/student-answer.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { Result } from '../results/entities/result.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { EvaluationsService } from './evaluations.service.js';
import { EvaluationsController } from './evaluations.controller.js';
import { FacultyModule } from '../faculty/faculty.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DescriptiveEvaluation,
      StudentAnswer,
      ExamAttempt,
      Result,
      Examination,
    ]),
    FacultyModule,
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
