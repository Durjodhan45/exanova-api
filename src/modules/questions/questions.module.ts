import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { QuestionsService } from './questions.service.js';
import { QuestionsController } from './questions.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Question, QuestionOption, Examination])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
