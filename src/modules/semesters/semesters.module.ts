import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Semester } from './entities/semester.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';
import { SemestersService } from './semesters.service.js';
import { SemestersController } from './semesters.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Semester, Examination, Subject])],
  controllers: [SemestersController],
  providers: [SemestersService],
  exports: [SemestersService],
})
export class SemestersModule {}
