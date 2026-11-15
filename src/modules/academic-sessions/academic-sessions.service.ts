import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AcademicSession } from './entities/academic-session.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { CreateAcademicSessionDto, UpdateAcademicSessionDto } from './dto/create-academic-session.dto.js';

@Injectable()
export class AcademicSessionsService {
  constructor(
    @InjectRepository(AcademicSession)
    private readonly sessionRepo: Repository<AcademicSession>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
  ) {}

  async create(dto: CreateAcademicSessionDto): Promise<AcademicSession> {
    const existing = await this.sessionRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Academic session '${dto.name}' already exists`);
    }

    if (dto.isCurrent) {
      await this.sessionRepo.update({}, { isCurrent: false });
    }

    const session = this.sessionRepo.create({
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isCurrent: dto.isCurrent ?? false,
    });

    return await this.sessionRepo.save(session);
  }

  async findAll(): Promise<AcademicSession[]> {
    return await this.sessionRepo.find({
      order: { startDate: 'DESC' },
    });
  }

  async getCurrent(): Promise<AcademicSession | null> {
    return await this.sessionRepo.findOne({
      where: { isCurrent: true },
    });
  }

  async findById(id: string): Promise<AcademicSession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Academic session not found`);
    return session;
  }

  async update(id: string, dto: UpdateAcademicSessionDto): Promise<AcademicSession> {
    const session = await this.findById(id);

    if (dto.name && dto.name !== session.name) {
      const exists = await this.sessionRepo.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException(`Academic session '${dto.name}' already exists`);
      session.name = dto.name;
    }
    if (dto.startDate) session.startDate = new Date(dto.startDate);
    if (dto.endDate) session.endDate = new Date(dto.endDate);

    if (dto.isCurrent) {
      await this.sessionRepo.update({ id: Not(id) }, { isCurrent: false });
      session.isCurrent = true;
    } else if (dto.isCurrent === false) {
      session.isCurrent = false;
    }

    return await this.sessionRepo.save(session);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const session = await this.findById(id);

    const examCount = await this.examRepo.count({ where: { academicSessionId: id } });
    if (examCount > 0) {
      throw new BadRequestException(
        `Cannot delete academic session '${session.name}' because it is referenced by ${examCount} historical examination record(s).`,
      );
    }

    await this.sessionRepo.remove(session);
    return { deleted: true };
  }
}
