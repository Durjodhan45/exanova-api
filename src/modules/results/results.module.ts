import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Result } from './entities/result.entity.js';
import { ResultRelease } from './entities/result-release.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { ResultsService } from './results.service.js';
import { ResultsController } from './results.controller.js';
import { StudentResultsController } from './student-results.controller.js';
import { PdfScorecardService } from './services/pdf-scorecard.service.js';
import { FeedbackModule } from '../feedback/feedback.module.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Result, ResultRelease, Examination, ExamAttempt, Student]),
    FeedbackModule,
    StudentsModule,
  ],
  controllers: [ResultsController, StudentResultsController],
  providers: [ResultsService, PdfScorecardService],
  exports: [ResultsService, PdfScorecardService],
})
export class ResultsModule {}
