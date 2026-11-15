import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Faculty } from './entities/faculty.entity.js';
import { FacultySubjectAssignment } from './entities/faculty-subject-assignment.entity.js';
import { FacultyService } from './faculty.service.js';
import { FacultyController } from './faculty.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Faculty, FacultySubjectAssignment]), UsersModule],
  controllers: [FacultyController],
  providers: [FacultyService],
  exports: [FacultyService],
})
export class FacultyModule {}
