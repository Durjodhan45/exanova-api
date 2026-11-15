import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBank } from './entities/question-bank.entity.js';
import { QuestionBankItem } from './entities/question-bank-item.entity.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { DifficultyLevel, QuestionType } from '../../shared/enums/index.js';

@Injectable()
export class QuestionBanksService {
  constructor(
    @InjectRepository(QuestionBank)
    private readonly bankRepo: Repository<QuestionBank>,
    @InjectRepository(QuestionBankItem)
    private readonly itemRepo: Repository<QuestionBankItem>,
  ) {}

  async create(data: {
    title: string;
    description?: string;
    departmentId: string;
    subjectId: string;
    createdByFacultyId: string;
  }): Promise<QuestionBank> {
    const bank = this.bankRepo.create(data);
    return await this.bankRepo.save(bank);
  }

  async findAll(query: PaginationQueryDto & { departmentId?: string; subjectId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.bankRepo
      .createQueryBuilder('bank')
      .leftJoinAndSelect('bank.department', 'dept')
      .leftJoinAndSelect('bank.subject', 'subj')
      .leftJoinAndSelect('bank.createdByFaculty', 'faculty')
      .orderBy('bank.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.departmentId) {
      qb.andWhere('bank.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    if (query.subjectId) {
      qb.andWhere('bank.subjectId = :subjectId', { subjectId: query.subjectId });
    }
    if (query.search) {
      qb.andWhere('bank.title ILIKE :search', { search: `%${query.search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<QuestionBank> {
    const bank = await this.bankRepo.findOne({
      where: { id },
      relations: { department: true, subject: true, items: true },
    });
    if (!bank) throw new NotFoundException('Question bank not found');
    return bank;
  }

  async addItem(
    bankId: string,
    itemData: {
      questionText: string;
      questionType: QuestionType;
      marks?: string;
      negativeMarks?: string;
      optionsJson?: Array<{ optionLabel: string; optionText: string; isCorrect: boolean }>;
      answerInstructions?: string;
      evaluationCriteria?: string;
      expectedAnswer?: string;
      topic?: string;
      difficulty?: DifficultyLevel;
    },
  ): Promise<QuestionBankItem> {
    await this.findById(bankId);
    const item = this.itemRepo.create({
      questionBankId: bankId,
      ...itemData,
    });
    return await this.itemRepo.save(item);
  }

  async removeItem(itemId: string): Promise<{ deleted: boolean }> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Question bank item not found');
    await this.itemRepo.remove(item);
    return { deleted: true };
  }
}
