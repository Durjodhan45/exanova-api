import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicSession } from './entities/academic-session.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { AcademicSessionsService } from './academic-sessions.service.js';
import { AcademicSessionsController } from './academic-sessions.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicSession, Examination])],
  controllers: [AcademicSessionsController],
  providers: [AcademicSessionsService],
  exports: [AcademicSessionsService],
})
export class AcademicSessionsModule {}
