import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationFeedback } from './entities/evaluation-feedback.entity.js';
import { FeedbackService } from './feedback.service.js';
import { FeedbackController } from './feedback.controller.js';
import { FacultyModule } from '../faculty/faculty.module.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationFeedback]), FacultyModule, StudentsModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
