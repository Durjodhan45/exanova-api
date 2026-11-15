import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { UserRole, UserStatus } from '../../shared/enums/index.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      if (existing.username === dto.username) {
        throw new ConflictException(`Username '${dto.username}' already in use`);
      }
      throw new ConflictException(`Email '${dto.email}' already in use`);
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
      timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
      parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
    });

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: dto.role || UserRole.STUDENT,
      status: dto.status || UserStatus.ACTIVE,
      mustChangePassword: dto.mustChangePassword ?? false,
    });

    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...result } = saved;
    return result as Omit<User, 'passwordHash'>;
  }

  async findAll(query: PaginationQueryDto & { role?: UserRole; status?: UserStatus }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('user').orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere('(user.username ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    const sanitized = items.map((u) => {
      const { passwordHash: _, ...rest } = u;
      return rest;
    });

    return {
      items: sanitized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { student: true, faculty: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByIdSanitized(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    const { passwordHash: _, ...rest } = user;
    return rest as Omit<User, 'passwordHash'>;
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: [{ email: identifier }, { username: identifier }],
      relations: { student: true, faculty: true },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);

    if (dto.username && dto.username !== user.username) {
      const exists = await this.userRepo.findOne({ where: { username: dto.username } });
      if (exists) throw new ConflictException(`Username '${dto.username}' already in use`);
      user.username = dto.username;
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepo.findOne({ where: { email: dto.email } });
      if (exists) throw new ConflictException(`Email '${dto.email}' already in use`);
      user.email = dto.email;
    }

    if (dto.role) user.role = dto.role;
    if (dto.status) user.status = dto.status;

    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...rest } = saved;
    return rest as Omit<User, 'passwordHash'>;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id);
    user.status = dto.status;
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...rest } = saved;
    return rest as Omit<User, 'passwordHash'>;
  }

  async adminResetPassword(id: string, newPassword?: string): Promise<{ temporaryPassword?: string }> {
    const user = await this.findById(id);
    const passwordToSet = newPassword || `ExaNova@${Math.floor(100000 + Math.random() * 900000)}`;

    user.passwordHash = await argon2.hash(passwordToSet, {
      type: argon2.argon2id,
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
      timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
      parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
    });
    user.mustChangePassword = true;
    await this.userRepo.save(user);

    return { temporaryPassword: passwordToSet };
  }

  async getAllUsersForExport() {
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      relations: { student: true, faculty: true },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      mustChangePassword: u.mustChangePassword,
      name: u.student
        ? `${u.student.firstName} ${u.student.lastName}`
        : u.faculty
          ? `${u.faculty.firstName} ${u.faculty.lastName}`
          : 'N/A',
      rollNumber: u.student?.rollNumber || 'N/A',
      employeeId: u.faculty?.employeeId || 'N/A',
      createdAt: u.createdAt.toISOString(),
    }));
  }
}
