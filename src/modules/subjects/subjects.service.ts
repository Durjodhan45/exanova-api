import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
  ) {}

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const existing = await this.subjectRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Subject code '${dto.code}' already exists`);
    }

    const subject = this.subjectRepo.create(dto);
    return await this.subjectRepo.save(subject);
  }

  async findAll(query: PaginationQueryDto & { courseId?: string; semesterId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.subjectRepo
      .createQueryBuilder('subj')
      .leftJoinAndSelect('subj.course', 'course')
      .leftJoinAndSelect('subj.semester', 'semester')
      .orderBy('subj.name', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.courseId) {
      qb.andWhere('subj.courseId = :courseId', { courseId: query.courseId });
    }
    if (query.semesterId) {
      qb.andWhere('subj.semesterId = :semesterId', { semesterId: query.semesterId });
    }
    if (query.search) {
      qb.andWhere('(subj.name ILIKE :search OR subj.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Subject> {
    const subject = await this.subjectRepo.findOne({
      where: { id },
      relations: { course: true, semester: true },
    });
    if (!subject) throw new NotFoundException(`Subject not found`);
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findById(id);

    if (dto.code && dto.code !== subject.code) {
      const exists = await this.subjectRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException(`Subject code '${dto.code}' already exists`);
      subject.code = dto.code;
    }
    if (dto.name) subject.name = dto.name;
    if (dto.courseId) subject.courseId = dto.courseId;
    if (dto.semesterId) subject.semesterId = dto.semesterId;
    if (dto.credits) subject.credits = dto.credits;
    if (dto.description !== undefined) subject.description = dto.description;
    if (dto.isActive !== undefined) subject.isActive = dto.isActive;

    return await this.subjectRepo.save(subject);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const subject = await this.findById(id);

    const examCount = await this.examRepo.count({ where: { subjectId: id } });
    if (examCount > 0) {
      throw new BadRequestException(
        `Cannot delete subject '${subject.name}' because it is referenced by ${examCount} historical examination record(s). Deactivate it instead.`,
      );
    }

    await this.subjectRepo.remove(subject);
    return { deleted: true };
  }
}
