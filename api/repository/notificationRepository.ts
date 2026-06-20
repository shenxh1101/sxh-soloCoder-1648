import BaseRepository from './baseRepository.js';
import type { Notification, CreateNotificationInput } from '../types/index.js';

class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('notifications');
  }

  create(data: CreateNotificationInput): Notification {
    return super.create({
      ...data,
      isRead: false,
    } as Partial<Notification>);
  }

  createMany(items: CreateNotificationInput[]): Notification[] {
    return items.map((item) => this.create(item));
  }

  findByUser(userId: string, options: { isRead?: boolean; limit?: number } = {}): Notification[] {
    const { isRead, limit } = options;
    const params: unknown[] = [userId];
    let sql = 'SELECT * FROM notifications WHERE userId = ?';
    if (isRead !== undefined) {
      sql += ' AND isRead = ?';
      params.push(isRead ? 1 : 0);
    }
    sql += ' ORDER BY createdAt DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    const rows = this.db.prepare(sql).all(...params) as (Notification & { isRead: number | boolean })[];
    return rows.map((r) => ({ ...r, isRead: !!r.isRead }));
  }

  getUnreadCount(userId: string): number {
    const sql = 'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0';
    return (this.db.prepare(sql).get(userId) as { count: number }).count;
  }

  markAsRead(notificationId: string): Notification | null {
    const sql = 'UPDATE notifications SET isRead = 1 WHERE id = ?';
    this.db.prepare(sql).run(notificationId);
    return this.findById(notificationId);
  }

  markAllAsRead(userId: string): number {
    const sql = 'UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0';
    const result = this.db.prepare(sql).run(userId);
    return result.changes;
  }

  deleteByUser(userId: string): boolean {
    return this.deleteBy('userId = ?', [userId]);
  }

  deleteReadByUser(userId: string): boolean {
    return this.deleteBy('userId = ? AND isRead = 1', [userId]);
  }

  findById(id: string): Notification | null {
    const row = super.findById(id) as (Notification & { isRead: number | boolean }) | null;
    if (row) {
      return { ...row, isRead: !!row.isRead };
    }
    return null;
  }

  findAll(options: { where?: string; params?: unknown[]; orderBy?: string } = {}): Notification[] {
    const rows = super.findAll(options) as (Notification & { isRead: number | boolean })[];
    return rows.map((r) => ({ ...r, isRead: !!r.isRead }));
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;
