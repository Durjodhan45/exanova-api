import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { Semester } from '../semesters/entities/semester.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Semester)
    private readonly semesterRepo: Repository<Semester>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  async create(dto: CreateCourseDto): Promise<Course> {
    const existing = await this.courseRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Course with code '${dto.code}' already exists`);
    }

    const course = this.courseRepo.create(dto);
    const savedCourse = await this.courseRepo.save(course);

    // Automatically initialize semesters
    const totalSemesters = dto.totalSemesters || 8;
    const semesters: Semester[] = [];
    for (let i = 1; i <= totalSemesters; i++) {
      semesters.push(
        this.semesterRepo.create({
          courseId: savedCourse.id,
          semesterNumber: i,
          name: `Semester ${i}`,
        }),
      );
    }
    await this.semesterRepo.save(semesters);

    return savedCourse;
  }

  async findAll(query: PaginationQueryDto & { departmentId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.department', 'dept')
      .orderBy('course.name', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.departmentId) {
      qb.andWhere('course.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    if (query.search) {
      qb.andWhere('(course.name ILIKE :search OR course.code ILIKE :search)', {
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

  async findById(id: string): Promise<Course> {
    const course = await this.courseRepo.findOne({
      where: { id },
      relations: { department: true, semesters: true },
    });
    if (!course) throw new NotFoundException(`Course not found`);
    return course;
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.findById(id);

    if (dto.code && dto.code !== course.code) {
      const exists = await this.courseRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException(`Course with code '${dto.code}' already exists`);
      course.code = dto.code;
    }
    if (dto.name) course.name = dto.name;
    if (dto.departmentId) course.departmentId = dto.departmentId;
    if (dto.durationYears) course.durationYears = dto.durationYears;
    if (dto.totalSemesters) course.totalSemesters = dto.totalSemesters;
    if (dto.isActive !== undefined) course.isActive = dto.isActive;

    return await this.courseRepo.save(course);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const course = await this.findById(id);

    const examCount = await this.examRepo.count({ where: { courseId: id } });
    if (examCount > 0) {
      throw new BadRequestException(
        `Cannot delete course '${course.name}' because it is referenced by ${examCount} historical examination record(s). Deactivate it instead.`,
      );
    }

    const studentCount = await this.studentRepo.count({ where: { courseId: id } });
    if (studentCount > 0) {
      throw new BadRequestException(
        `Cannot delete course '${course.name}' because ${studentCount} student(s) are enrolled in it.`,
      );
    }

    // Remove semesters then course
    await this.semesterRepo.delete({ courseId: id });
    await this.courseRepo.remove(course);
    return { deleted: true };
  }
}
