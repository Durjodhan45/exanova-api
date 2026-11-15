import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.deptRepo.findOne({
      where: [{ name: dto.name }, { code: dto.code }],
    });
    if (existing) {
      if (existing.name === dto.name) throw new ConflictException(`Department name '${dto.name}' already exists`);
      throw new ConflictException(`Department code '${dto.code}' already exists`);
    }

    const dept = this.deptRepo.create(dto);
    return await this.deptRepo.save(dept);
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.deptRepo.createQueryBuilder('dept').orderBy('dept.name', 'ASC').skip(skip).take(limit);

    if (query.search) {
      qb.andWhere('(dept.name ILIKE :search OR dept.code ILIKE :search)', {
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

  async findById(id: string): Promise<Department> {
    const dept = await this.deptRepo.findOne({
      where: { id },
      relations: { courses: true },
    });
    if (!dept) throw new NotFoundException(`Department not found`);
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.findById(id);

    if (dto.name && dto.name !== dept.name) {
      const exists = await this.deptRepo.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException(`Department name '${dto.name}' already exists`);
      dept.name = dto.name;
    }
    if (dto.code && dto.code !== dept.code) {
      const exists = await this.deptRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException(`Department code '${dto.code}' already exists`);
      dept.code = dto.code;
    }
    if (dto.description !== undefined) dept.description = dto.description;
    if (dto.isActive !== undefined) dept.isActive = dto.isActive;

    return await this.deptRepo.save(dept);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const dept = await this.findById(id);

    // Guard: Prevent deletion of academic records referenced by historical examination records
    const examCount = await this.examRepo.count({ where: { departmentId: id } });
    if (examCount > 0) {
      throw new BadRequestException(
        `Cannot delete department '${dept.name}' because it is referenced by ${examCount} historical examination record(s). Deactivate it instead.`,
      );
    }

    const courseCount = await this.courseRepo.count({ where: { departmentId: id } });
    if (courseCount > 0) {
      throw new BadRequestException(
        `Cannot delete department '${dept.name}' because it contains ${courseCount} course(s). Remove or reassign courses first.`,
      );
    }

    await this.deptRepo.remove(dept);
    return { deleted: true };
  }
}
