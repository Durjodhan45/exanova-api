import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttempt } from './entities/exam-attempt.entity.js';
import { AttemptQuestion } from './entities/attempt-question.entity.js';
import { StudentAnswer } from '../exam-submissions/entities/student-answer.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { ExamEligibleStudent } from '../examinations/entities/exam-eligible-student.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { QuestionOption } from '../questions/entities/question-option.entity.js';
import { DescriptiveEvaluation } from '../evaluations/entities/descriptive-evaluation.entity.js';
import { Result } from '../results/entities/result.entity.js';
import { ExamAttemptsService } from './exam-attempts.service.js';
import { ExamAttemptsController } from './exam-attempts.controller.js';
import { StudentExaminationsController } from './student-examinations.controller.js';
import { NegativeMarkingService } from '../exam-submissions/services/negative-marking.service.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamAttempt,
      AttemptQuestion,
      StudentAnswer,
      Examination,
      ExamEligibleStudent,
      Question,
      QuestionOption,
      DescriptiveEvaluation,
      Result,
    ]),
    StudentsModule,
  ],
  controllers: [ExamAttemptsController, StudentExaminationsController],
  providers: [ExamAttemptsService, NegativeMarkingService],
  exports: [ExamAttemptsService, NegativeMarkingService],
})
export class ExamAttemptsModule {}
