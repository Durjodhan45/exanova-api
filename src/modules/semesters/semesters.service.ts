import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Semester } from './entities/semester.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';
import { CreateSemesterDto, UpdateSemesterDto } from './dto/create-semester.dto.js';

@Injectable()
export class SemestersService {
  constructor(
    @InjectRepository(Semester)
    private readonly semesterRepo: Repository<Semester>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async create(dto: CreateSemesterDto): Promise<Semester> {
    const existing = await this.semesterRepo.findOne({
      where: { courseId: dto.courseId, semesterNumber: dto.semesterNumber },
    });
    if (existing) {
      throw new ConflictException(`Semester ${dto.semesterNumber} already exists for this course`);
    }

    const semester = this.semesterRepo.create(dto);
    return await this.semesterRepo.save(semester);
  }

  async findByCourseId(courseId: string): Promise<Semester[]> {
    return await this.semesterRepo.find({
      where: { courseId },
      order: { semesterNumber: 'ASC' },
      relations: { subjects: true },
    });
  }

  async findById(id: string): Promise<Semester> {
    const semester = await this.semesterRepo.findOne({
      where: { id },
      relations: { course: true, subjects: true },
    });
    if (!semester) throw new NotFoundException(`Semester not found`);
    return semester;
  }

  async update(id: string, dto: UpdateSemesterDto): Promise<Semester> {
    const semester = await this.findById(id);

    if (dto.name) semester.name = dto.name;
    if (dto.semesterNumber !== undefined && dto.semesterNumber !== semester.semesterNumber) {
      const exists = await this.semesterRepo.findOne({
        where: { courseId: semester.courseId, semesterNumber: dto.semesterNumber },
      });
      if (exists) {
        throw new ConflictException(`Semester ${dto.semesterNumber} already exists for this course`);
      }
      semester.semesterNumber = dto.semesterNumber;
    }

    return await this.semesterRepo.save(semester);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const semester = await this.findById(id);

    const examCount = await this.examRepo.count({ where: { semesterId: id } });
    if (examCount > 0) {
      throw new BadRequestException(
        `Cannot delete semester because it is referenced by ${examCount} historical examination record(s).`,
      );
    }

    const subjectCount = await this.subjectRepo.count({ where: { semesterId: id } });
    if (subjectCount > 0) {
      throw new BadRequestException(
        `Cannot delete semester because it contains ${subjectCount} subject(s).`,
      );
    }

    await this.semesterRepo.remove(semester);
    return { deleted: true };
  }
}
