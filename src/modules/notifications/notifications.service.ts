import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationType } from '../../shared/enums/index.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata,
      isRead: false,
    });
    return await this.notificationRepo.save(notification);
  }

  async createForUsers(
    userIds: string[],
    params: {
      type: NotificationType;
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    const notifications = userIds.map((userId) =>
      this.notificationRepo.create({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata,
        isRead: false,
      }),
    );
    await this.notificationRepo.save(notifications);
  }

  async findForUser(userId: string, query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification not found`);
    }
    notification.isRead = true;
    return await this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updatedCount: result.affected || 0 };
  }

  async delete(id: string, userId: string): Promise<{ deleted: boolean }> {
    const result = await this.notificationRepo.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException(`Notification not found`);
    }
    return { deleted: true };
  }
}
