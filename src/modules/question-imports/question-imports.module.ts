import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionImport } from './entities/question-import.entity.js';
import { QuestionImportItem } from './entities/question-import-item.entity.js';
import { QuestionImportError } from './entities/question-import-error.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { QuestionOption } from '../questions/entities/question-option.entity.js';
import { QuestionImportsService } from './question-imports.service.js';
import { QuestionImportsController } from './question-imports.controller.js';
import { TemplateGeneratorService } from './parsers/template-generator.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionImport,
      QuestionImportItem,
      QuestionImportError,
      Examination,
      Question,
      QuestionOption,
    ]),
  ],
  controllers: [QuestionImportsController],
  providers: [QuestionImportsService, TemplateGeneratorService],
  exports: [QuestionImportsService],
})
export class QuestionImportsModule {}
