import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { SubjectsService } from './subjects.service.js';
import { SubjectsController } from './subjects.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Subject, Examination])],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
