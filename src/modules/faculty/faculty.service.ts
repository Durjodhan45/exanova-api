import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faculty } from './entities/faculty.entity.js';
import { FacultySubjectAssignment } from './entities/faculty-subject-assignment.entity.js';
import { UsersService } from '../users/users.service.js';
import { UserRole } from '../../shared/enums/index.js';
import { AssignSubjectDto, CreateFacultyDto, UpdateFacultyDto } from './dto/create-faculty.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class FacultyService {
  constructor(
    @InjectRepository(Faculty)
    private readonly facultyRepo: Repository<Faculty>,
    @InjectRepository(FacultySubjectAssignment)
    private readonly assignmentRepo: Repository<FacultySubjectAssignment>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateFacultyDto): Promise<Faculty> {
    const existingFaculty = await this.facultyRepo.findOne({
      where: { employeeId: dto.employeeId },
    });
    if (existingFaculty) {
      throw new ConflictException(`Faculty with Employee ID '${dto.employeeId}' already exists`);
    }

    // Create user account
    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: dto.password,
      role: UserRole.FACULTY,
      mustChangePassword: false,
    });

    const faculty = this.facultyRepo.create({
      userId: user.id,
      employeeId: dto.employeeId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      designation: dto.designation || 'Assistant Professor',
      phone: dto.phone,
      departmentId: dto.departmentId,
    });

    return await this.facultyRepo.save(faculty);
  }

  async findAll(query: PaginationQueryDto & { departmentId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.facultyRepo
      .createQueryBuilder('fac')
      .leftJoinAndSelect('fac.user', 'user')
      .leftJoinAndSelect('fac.department', 'dept')
      .orderBy('fac.firstName', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.departmentId) {
      qb.andWhere('fac.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    if (query.search) {
      qb.andWhere(
        '(fac.firstName ILIKE :search OR fac.lastName ILIKE :search OR fac.employeeId ILIKE :search)',
        { search: `%${query.search}%` },
      );
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

  async findById(id: string): Promise<Faculty> {
    const faculty = await this.facultyRepo.findOne({
      where: { id },
      relations: {
        user: true,
        department: true,
        subjectAssignments: { subject: true, academicSession: true },
      },
    });
    if (!faculty) throw new NotFoundException(`Faculty profile not found`);
    return faculty;
  }

  async findByUserId(userId: string): Promise<Faculty> {
    const faculty = await this.facultyRepo.findOne({
      where: { userId },
      relations: {
        department: true,
        subjectAssignments: { subject: true, academicSession: true },
      },
    });
    if (!faculty) throw new NotFoundException(`Faculty profile not found for user`);
    return faculty;
  }

  async update(id: string, dto: UpdateFacultyDto): Promise<Faculty> {
    const faculty = await this.findById(id);

    if (dto.firstName) faculty.firstName = dto.firstName;
    if (dto.lastName) faculty.lastName = dto.lastName;
    if (dto.designation) faculty.designation = dto.designation;
    if (dto.phone !== undefined) faculty.phone = dto.phone;
    if (dto.departmentId) faculty.departmentId = dto.departmentId;

    return await this.facultyRepo.save(faculty);
  }

  async assignSubject(dto: AssignSubjectDto): Promise<FacultySubjectAssignment> {
    const existing = await this.assignmentRepo.findOne({
      where: {
        facultyId: dto.facultyId,
        subjectId: dto.subjectId,
        academicSessionId: dto.academicSessionId,
      },
    });
    if (existing) {
      throw new ConflictException('Faculty is already assigned to this subject for this session');
    }

    const assignment = this.assignmentRepo.create(dto);
    return await this.assignmentRepo.save(assignment);
  }

  async removeAssignment(id: string): Promise<{ deleted: boolean }> {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assignmentRepo.remove(assignment);
    return { deleted: true };
  }

  async getAssignedSubjects(facultyId: string) {
    return await this.assignmentRepo.find({
      where: { facultyId },
      relations: { subject: true, academicSession: true },
    });
  }
}
