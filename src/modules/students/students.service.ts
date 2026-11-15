import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import * as argon2 from 'argon2';
import { Student } from './entities/student.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { CreateStudentDto, UpdateStudentDto, UpdateStudentProfileDto } from './dto/create-student.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { UserRole, UserStatus } from '../../shared/enums/index.js';
import { BRANDING } from '../../common/constants/branding.constants.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateStudentDto): Promise<Student> {
    const existingStudent = await this.studentRepo.findOne({
      where: { rollNumber: dto.rollNumber },
    });
    if (existingStudent) {
      throw new ConflictException(`Student with roll number '${dto.rollNumber}' already exists`);
    }

    // Create user with roll number as username and mustChangePassword = true
    const user = await this.usersService.create({
      username: dto.rollNumber,
      email: dto.email,
      password: dto.password,
      role: UserRole.STUDENT,
      mustChangePassword: true, // Non-negotiable requirement: Force students to change initial password!
    });

    const student = this.studentRepo.create({
      userId: user.id,
      rollNumber: dto.rollNumber,
      registrationNumber: dto.registrationNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      departmentId: dto.departmentId,
      courseId: dto.courseId,
      currentSemesterId: dto.currentSemesterId,
      academicSessionId: dto.academicSessionId,
    });

    return await this.studentRepo.save(student);
  }

  async findAll(
    query: PaginationQueryDto & {
      departmentId?: string;
      courseId?: string;
      semesterId?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.studentRepo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.department', 'dept')
      .leftJoinAndSelect('student.course', 'course')
      .leftJoinAndSelect('student.currentSemester', 'semester')
      .leftJoinAndSelect('student.academicSession', 'session')
      .orderBy('student.rollNumber', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.departmentId) {
      qb.andWhere('student.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    if (query.courseId) {
      qb.andWhere('student.courseId = :courseId', { courseId: query.courseId });
    }
    if (query.semesterId) {
      qb.andWhere('student.currentSemesterId = :semesterId', { semesterId: query.semesterId });
    }
    if (query.search) {
      qb.andWhere(
        '(student.rollNumber ILIKE :search OR student.firstName ILIKE :search OR student.lastName ILIKE :search)',
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

  async findById(id: string): Promise<Student> {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: {
        user: true,
        department: true,
        course: true,
        currentSemester: true,
        academicSession: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async findByUserId(userId: string): Promise<Student> {
    const student = await this.studentRepo.findOne({
      where: { userId },
      relations: {
        department: true,
        course: true,
        currentSemester: true,
        academicSession: true,
      },
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.findById(id);

    if (dto.firstName) student.firstName = dto.firstName;
    if (dto.lastName) student.lastName = dto.lastName;
    if (dto.phone !== undefined) student.phone = dto.phone;
    if (dto.currentSemesterId) student.currentSemesterId = dto.currentSemesterId;
    if (dto.academicSessionId) student.academicSessionId = dto.academicSessionId;

    return await this.studentRepo.save(student);
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto): Promise<Student> {
    const student = await this.findByUserId(userId);
    if (dto.phone !== undefined) student.phone = dto.phone;
    return await this.studentRepo.save(student);
  }

  /**
   * Bulk import students from in-memory Excel file buffer.
   * File is never saved to disk.
   */
  async importFromBuffer(
    buffer: Buffer,
    defaultMeta: {
      departmentId: string;
      courseId: string;
      semesterId: string;
      academicSessionId: string;
    },
  ) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel file contains no worksheets');
    }

    const results = {
      totalRows: 0,
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; rollNumber?: string; error: string }>,
    };

    // Columns: [1: Roll Number, 2: First Name, 3: Last Name, 4: Email, 5: Phone, 6: Password]
    const rowsToProcess: Array<{
      rowNumber: number;
      rollNumber: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      password?: string;
    }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const rollNumber = row.getCell(1).text?.trim();
      const firstName = row.getCell(2).text?.trim();
      const lastName = row.getCell(3).text?.trim();
      const email = row.getCell(4).text?.trim();
      const phone = row.getCell(5).text?.trim();
      const password = row.getCell(6).text?.trim();

      if (!rollNumber && !firstName) return; // empty row
      results.totalRows++;

      if (!rollNumber || !firstName || !lastName || !email) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          rollNumber,
          error: 'Missing required columns (Roll Number, First Name, Last Name, Email)',
        });
        return;
      }

      rowsToProcess.push({
        rowNumber,
        rollNumber,
        firstName,
        lastName,
        email,
        phone,
        password: password || 'ExaNova@2026',
      });
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const rowData of rowsToProcess) {
        const existingStudent = await queryRunner.manager.findOne(Student, {
          where: { rollNumber: rowData.rollNumber },
        });
        if (existingStudent) {
          results.failed++;
          results.errors.push({
            row: rowData.rowNumber,
            rollNumber: rowData.rollNumber,
            error: `Student roll number '${rowData.rollNumber}' already exists`,
          });
          continue;
        }

        const existingUser = await queryRunner.manager.findOne(User, {
          where: [{ username: rowData.rollNumber }, { email: rowData.email }],
        });
        if (existingUser) {
          results.failed++;
          results.errors.push({
            row: rowData.rowNumber,
            rollNumber: rowData.rollNumber,
            error: `User account with roll number or email '${rowData.email}' already exists`,
          });
          continue;
        }

        const passwordHash = await argon2.hash(rowData.password || 'ExaNova@2026', {
          type: argon2.argon2id,
        });

        const user = queryRunner.manager.create(User, {
          username: rowData.rollNumber,
          email: rowData.email,
          passwordHash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          mustChangePassword: true,
        });
        const savedUser = await queryRunner.manager.save(user);

        const student = queryRunner.manager.create(Student, {
          userId: savedUser.id,
          rollNumber: rowData.rollNumber,
          firstName: rowData.firstName,
          lastName: rowData.lastName,
          phone: rowData.phone,
          departmentId: defaultMeta.departmentId,
          courseId: defaultMeta.courseId,
          currentSemesterId: defaultMeta.semesterId,
          academicSessionId: defaultMeta.academicSessionId,
        });
        await queryRunner.manager.save(student);
        results.imported++;
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Failed to import students: ${(err as Error).message}`);
    } finally {
      await queryRunner.release();
    }

    return results;
  }

  /**
   * Generates student import template in memory.
   */
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = BRANDING.appName;
    workbook.lastModifiedBy = BRANDING.developer;

    const worksheet = workbook.addWorksheet('Students Import Template');
    worksheet.columns = [
      { header: 'Roll Number (Required)', key: 'rollNumber', width: 25 },
      { header: 'First Name (Required)', key: 'firstName', width: 20 },
      { header: 'Last Name (Required)', key: 'lastName', width: 20 },
      { header: 'Email (Required)', key: 'email', width: 30 },
      { header: 'Phone (Optional)', key: 'phone', width: 18 },
      { header: 'Initial Password (Optional)', key: 'password', width: 25 },
    ];

    // Style Header Row with ExaNova Midnight Navy (#101B3F) and Gold font
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF101B3F' },
    };

    // Add example rows
    worksheet.addRow({
      rollNumber: '230002',
      firstName: 'Rohan',
      lastName: 'Das',
      email: 'rohan.das@exanova.edu',
      phone: '+919876543211',
      password: 'Student@12345',
    });
    worksheet.addRow({
      rollNumber: '230003',
      firstName: 'Ananya',
      lastName: 'Roy',
      email: 'ananya.roy@exanova.edu',
      phone: '+919876543212',
      password: 'Student@12345',
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }
}
