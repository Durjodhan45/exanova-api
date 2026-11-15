import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity.js';
import { Semester } from '../semesters/entities/semester.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { CoursesService } from './courses.service.js';
import { CoursesController } from './courses.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Semester, Examination, Student])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
