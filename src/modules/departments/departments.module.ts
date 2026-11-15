import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { DepartmentsService } from './departments.service.js';
import { DepartmentsController } from './departments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Course, Examination])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
