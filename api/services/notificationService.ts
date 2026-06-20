import { notificationRepository } from '../repository/notificationRepository.js';
import type { Notification, CreateNotificationInput, PaginationParams, PaginationResult } from '../types/index.js';

class NotificationService {
  findById(id: string): Notification | null {
    return notificationRepository.findById(id);
  }

  findByUser(userId: string, options?: { isRead?: boolean; limit?: number }): Notification[] {
    return notificationRepository.findByUser(userId, options);
  }

  findAll(filters?: { userId?: string; isRead?: boolean }): Notification[] {
    let where = '';
    const params: unknown[] = [];

    if (filters?.userId) {
      where = 'userId = ?';
      params.push(filters.userId);
    }
    if (filters?.isRead !== undefined) {
      where = where ? `${where} AND isRead = ?` : 'isRead = ?';
      params.push(filters.isRead ? 1 : 0);
    }

    return notificationRepository.findAll({
      where: where || undefined,
      params,
      orderBy: 'createdAt DESC',
    });
  }

  paginate(
    params: PaginationParams,
    filters?: { userId?: string; isRead?: boolean; type?: string },
  ): PaginationResult<Notification> {
    let where = '';
    const whereParams: unknown[] = [];

    if (filters?.userId) {
      where = 'userId = ?';
      whereParams.push(filters.userId);
    }
    if (filters?.isRead !== undefined) {
      where = where ? `${where} AND isRead = ?` : 'isRead = ?';
      whereParams.push(filters.isRead ? 1 : 0);
    }
    if (filters?.type) {
      where = where ? `${where} AND type = ?` : 'type = ?';
      whereParams.push(filters.type);
    }

    return notificationRepository.paginate(params, {
      where: where || undefined,
      whereParams,
      orderBy: 'createdAt DESC',
    });
  }

  create(input: CreateNotificationInput): Notification {
    return notificationRepository.create(input);
  }

  createMany(items: CreateNotificationInput[]): Notification[] {
    return notificationRepository.createMany(items);
  }

  markAsRead(notificationId: string): Notification | null {
    return notificationRepository.markAsRead(notificationId);
  }

  markAllAsRead(userId: string): number {
    return notificationRepository.markAllAsRead(userId);
  }

  getUnreadCount(userId: string): number {
    return notificationRepository.getUnreadCount(userId);
  }

  delete(id: string): boolean {
    return notificationRepository.delete(id);
  }

  deleteByUser(userId: string): boolean {
    return notificationRepository.deleteByUser(userId);
  }

  deleteReadByUser(userId: string): boolean {
    return notificationRepository.deleteReadByUser(userId);
  }

  broadcast(notification: Omit<CreateNotificationInput, 'userId'>, userIds: string[]): Notification[] {
    return notificationRepository.createMany(
      userIds.map((uid) => ({ ...notification, userId: uid }))
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
