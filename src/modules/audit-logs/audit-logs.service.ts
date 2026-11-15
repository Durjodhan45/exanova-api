import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { ExamActivityLog } from './entities/exam-activity-log.entity.js';
import { AuditAction } from '../../shared/enums/index.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(ExamActivityLog)
    private readonly activityRepo: Repository<ExamActivityLog>,
  ) {}

  async log(params: {
    action: AuditAction;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    try {
      // Sensitive fields sanitize
      const sanitizedDetails = params.details ? { ...params.details } : undefined;
      if (sanitizedDetails) {
        delete sanitizedDetails['password'];
        delete sanitizedDetails['token'];
        delete sanitizedDetails['refreshToken'];
        delete sanitizedDetails['passwordHash'];
      }

      const logEntry = this.auditRepo.create({
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: sanitizedDetails,
        userId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      return await this.auditRepo.save(logEntry);
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
      return {} as AuditLog;
    }
  }

  async logExamActivity(params: {
    attemptId: string;
    testId: string;
    studentId: string;
    eventType: string;
    eventData?: Record<string, unknown>;
  }): Promise<ExamActivityLog> {
    const entry = this.activityRepo.create(params);
    return await this.activityRepo.save(entry);
  }

  async findAll(query: PaginationQueryDto & { action?: AuditAction; entityType?: string; userId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere('audit.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.userId) {
      qb.andWhere('audit.userId = :userId', { userId: query.userId });
    }
    if (query.search) {
      qb.andWhere('(audit.entityType ILIKE :search OR audit.entityId ILIKE :search)', {
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

  async getRecentActivities(limit = 10) {
    return await this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { user: true },
    });
  }
}
