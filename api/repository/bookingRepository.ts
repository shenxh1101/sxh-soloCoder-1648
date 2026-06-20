import BaseRepository from './baseRepository.js';
import type { Booking, BookingStatus, CreateBookingInput, UpdateBookingInput } from '../types/index.js';

class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super('bookings');
  }

  findById(id: string): Booking | null {
    return super.findById(id, ['requiredDeviceIds']);
  }

  findAll(options: { where?: string; params?: unknown[]; orderBy?: string } = {}): Booking[] {
    return super.findAll({ ...options, jsonFields: ['requiredDeviceIds'] });
  }

  paginate(params: Parameters<BaseRepository<Booking>['paginate']>[0], options: Parameters<BaseRepository<Booking>['paginate']>[1] = {}): ReturnType<BaseRepository<Booking>['paginate']> {
    return super.paginate(params, { ...options, jsonFields: ['requiredDeviceIds'] });
  }

  create(data: CreateBookingInput): Booking {
    const now = new Date().toISOString();
    return super.create(
      {
        ...data,
        status: 'locked' as BookingStatus,
        createdAt: now,
        updatedAt: now,
      } as Partial<Booking>,
      ['requiredDeviceIds'],
    );
  }

  update(id: string, data: UpdateBookingInput): Booking | null {
    return super.update(id, data as Partial<Booking>, ['requiredDeviceIds']);
  }

  findByUser(userId: string, options: { status?: BookingStatus; limit?: number } = {}): Booking[] {
    const { status, limit } = options;
    let sql = 'SELECT * FROM bookings WHERE userId = ?';
    const params: unknown[] = [userId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY startTime DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    const rows = this.db.prepare(sql).all(...params) as Booking[];
    return rows.map((r) => this.parseJsonFields(r, ['requiredDeviceIds']));
  }

  findByRoom(roomId: string, options: { startDate?: string; endDate?: string; status?: BookingStatus } = {}): Booking[] {
    const { startDate, endDate, status } = options;
    const params: unknown[] = [roomId];
    let sql = 'SELECT * FROM bookings WHERE roomId = ?';
    if (startDate) {
      sql += ' AND startTime >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND startTime <= ?';
      params.push(endDate);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY startTime ASC';
    const rows = this.db.prepare(sql).all(...params) as Booking[];
    return rows.map((r) => this.parseJsonFields(r, ['requiredDeviceIds']));
  }

  findConflicts(roomId: string, startTime: string, endTime: string, excludeBookingId?: string): Booking[] {
    const params: unknown[] = [roomId, startTime, endTime];
    let sql = `
      SELECT * FROM bookings
      WHERE roomId = ?
        AND status IN ('locked', 'pending_approval')
        AND NOT (endTime <= ? OR startTime >= ?)
    `;
    if (excludeBookingId) {
      sql += ' AND id != ?';
      params.push(excludeBookingId);
    }
    const rows = this.db.prepare(sql).all(...params) as Booking[];
    return rows.map((r) => this.parseJsonFields(r, ['requiredDeviceIds']));
  }

  findByStatus(status: BookingStatus): Booking[] {
    return this.findAll({ where: 'status = ?', params: [status], orderBy: 'startTime ASC' });
  }

  findPendingApprovals(managerId?: string): Booking[] {
    let sql = "SELECT * FROM bookings WHERE status = 'pending_approval'";
    const params: unknown[] = [];
    if (managerId) {
      sql += ' AND approvalManagerId = ?';
      params.push(managerId);
    }
    sql += ' ORDER BY startTime ASC';
    const rows = this.db.prepare(sql).all(...params) as Booking[];
    return rows.map((r) => this.parseJsonFields(r, ['requiredDeviceIds']));
  }

  findUpcomingBookings(minutesAhead: number = 30): Booking[] {
    const sql = `
      SELECT * FROM bookings
      WHERE status = 'locked'
        AND checkInTime IS NULL
        AND startTime >= datetime('now')
        AND startTime <= datetime('now', ? || ' minutes')
      ORDER BY startTime ASC
    `;
    const rows = this.db.prepare(sql).run ? [] : (this.db.prepare(sql).all(`+${minutesAhead}`) as Booking[]);
    const safeSql = `
      SELECT * FROM bookings
      WHERE status = 'locked'
        AND checkInTime IS NULL
        AND startTime >= datetime('now')
        AND startTime <= datetime('now', '+${minutesAhead} minutes')
      ORDER BY startTime ASC
    `;
    const result = this.db.prepare(safeSql).all() as Booking[];
    return result.map((r) => this.parseJsonFields(r, ['requiredDeviceIds']));
  }

  findOverdueCheckIns(minutesLate: number = 15): Booking[] {
    const sql = `
      SELECT * FROM bookings
      WHERE status = 'locked'
        AND checkInTime IS NULL
        AND startTime <= datetime('now', '-${minutesLate} minutes')
        AND endTime > datetime('now')
      ORDER BY startTime ASC
    `;
    const rows = this.db.prepare(sql).all() as Booking[];
    return rows.map((r) => this.parseJsonFields(r, ['requiredDeviceIds']));
  }

  findBetweenDates(startDate: string, endDate: string, status?: BookingStatus): Booking[] {
    const params: unknown[] = [startDate, endDate];
    let sql = 'SELECT * FROM bookings WHERE startTime >= ? AND startTime <= ?';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY startTime ASC';
    const rows = this.db.prepare(sql).all(...params) as Booking[];
    return rows.map((r) => this.parseJsonFields(r, ['requiredDeviceIds']));
  }

  checkIn(bookingId: string): Booking | null {
    return this.update(bookingId, {
      checkInTime: new Date().toISOString(),
      status: 'completed',
    } as UpdateBookingInput);
  }

  cancel(bookingId: string, comment?: string): Booking | null {
    return this.update(bookingId, {
      status: 'cancelled',
      approvalComment: comment,
    } as UpdateBookingInput);
  }

  release(bookingId: string): Booking | null {
    return this.update(bookingId, {
      status: 'released',
    } as UpdateBookingInput);
  }

  approve(bookingId: string, managerId: string, comment?: string): Booking | null {
    return this.update(bookingId, {
      status: 'locked',
      approvalManagerId: managerId,
      approvalTime: new Date().toISOString(),
      approvalComment: comment || '批准',
    } as UpdateBookingInput);
  }

  reject(bookingId: string, managerId: string, comment: string): Booking | null {
    return this.update(bookingId, {
      status: 'rejected',
      approvalManagerId: managerId,
      approvalTime: new Date().toISOString(),
      approvalComment: comment,
    } as UpdateBookingInput);
  }

  addBookingDevice(bookingId: string, deviceId: string): void {
    const sql = 'INSERT OR IGNORE INTO booking_devices (id, bookingId, deviceId) VALUES (?, ?, ?)';
    this.db.prepare(sql).run(this.generateId(), bookingId, deviceId);
  }

  removeBookingDevices(bookingId: string): void {
    const sql = 'DELETE FROM booking_devices WHERE bookingId = ?';
    this.db.prepare(sql).run(bookingId);
  }

  findDeviceConflicts(deviceIds: string[], startTime: string, endTime: string, excludeBookingId?: string): Array<{ bookingId: string; deviceId: string }> {
    const placeholders = deviceIds.map(() => '?').join(',');
    const params: unknown[] = [...deviceIds, startTime, endTime];
    let sql = `
      SELECT bd.bookingId, bd.deviceId
      FROM booking_devices bd
      JOIN bookings b ON bd.bookingId = b.id
      WHERE bd.deviceId IN (${placeholders})
        AND b.status IN ('locked', 'pending_approval')
        AND NOT (b.endTime <= ? OR b.startTime >= ?)
    `;
    if (excludeBookingId) {
      sql += ' AND bd.bookingId != ?';
      params.push(excludeBookingId);
    }
    return this.db.prepare(sql).all(...params) as Array<{ bookingId: string; deviceId: string }>;
  }
}

export const bookingRepository = new BookingRepository();
export default bookingRepository;
