import { bookingRepository } from '../repository/bookingRepository.js';
import { roomRepository } from '../repository/roomRepository.js';
import { deviceRepository } from '../repository/deviceRepository.js';
import { userRepository } from '../repository/userRepository.js';
import { notificationService } from './notificationService.js';
import { creditService } from './creditService.js';
import { MIN_CREDIT_SCORE } from '../../shared/index.js';
import type {
  Booking,
  BookingStatus,
  CreateBookingInput,
  UpdateBookingInput,
  BookingConflict,
  BookingWithRelations,
  PaginationParams,
  PaginationResult,
  User,
  Device,
} from '../types/index.js';

class BookingService {
  findById(id: string): BookingWithRelations | null {
    const booking = bookingRepository.findById(id);
    if (!booking) return null;
    return this.enrichBooking(booking);
  }

  findAll(filters?: {
    status?: BookingStatus;
    userId?: string;
    roomId?: string;
    startDate?: string;
    endDate?: string;
  }): BookingWithRelations[] {
    let where = '';
    const params: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      params.push(filters.status);
    }
    if (filters?.userId) {
      where = where ? `${where} AND userId = ?` : 'userId = ?';
      params.push(filters.userId);
    }
    if (filters?.roomId) {
      where = where ? `${where} AND roomId = ?` : 'roomId = ?';
      params.push(filters.roomId);
    }
    if (filters?.startDate) {
      where = where ? `${where} AND startTime >= ?` : 'startTime >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      where = where ? `${where} AND startTime <= ?` : 'startTime <= ?';
      params.push(filters.endDate);
    }

    const bookings = bookingRepository.findAll({
      where: where || undefined,
      params,
      orderBy: 'startTime DESC',
    });
    return bookings.map((b) => this.enrichBooking(b));
  }

  paginate(
    params: PaginationParams,
    filters?: {
      status?: BookingStatus;
      userId?: string;
      roomId?: string;
      startDate?: string;
      endDate?: string;
      approvalManagerId?: string;
    },
  ): PaginationResult<BookingWithRelations> {
    let where = '';
    const whereParams: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      whereParams.push(filters.status);
    }
    if (filters?.userId) {
      where = where ? `${where} AND userId = ?` : 'userId = ?';
      whereParams.push(filters.userId);
    }
    if (filters?.roomId) {
      where = where ? `${where} AND roomId = ?` : 'roomId = ?';
      whereParams.push(filters.roomId);
    }
    if (filters?.startDate) {
      where = where ? `${where} AND startTime >= ?` : 'startTime >= ?';
      whereParams.push(filters.startDate);
    }
    if (filters?.endDate) {
      where = where ? `${where} AND startTime <= ?` : 'startTime <= ?';
      whereParams.push(filters.endDate);
    }
    if (filters?.approvalManagerId) {
      where = where ? `${where} AND approvalManagerId = ?` : 'approvalManagerId = ?';
      whereParams.push(filters.approvalManagerId);
    }

    const result = bookingRepository.paginate(params, {
      where: where || undefined,
      whereParams,
      orderBy: 'startTime DESC',
    });

    return {
      ...result,
      items: result.items.map((b) => this.enrichBooking(b)),
    };
  }

  create(input: CreateBookingInput): BookingWithRelations | { conflicts: BookingConflict[] } | { error: string } {
    const user = userRepository.findById(input.userId);
    if (user && user.creditScore < MIN_CREDIT_SCORE) {
      return { error: '信用分不足，禁止预订' };
    }

    const deviceIds = input.requiredDeviceIds || [];
    const conflicts = this.detectConflicts(input.roomId, input.startTime, input.endTime, undefined, deviceIds);
    if (conflicts.length > 0) {
      return { conflicts };
    }

    const room = roomRepository.findById(input.roomId);
    if (!room || room.status !== 'active') {
      return { conflicts: [{ type: 'time', suggestedAlternatives: [] }] };
    }

    if (room.capacity < input.attendeeCount) {
      return { conflicts: [{ type: 'time', suggestedAlternatives: [] }] };
    }

    const durationHours = (new Date(input.endTime).getTime() - new Date(input.startTime).getTime()) / 3600000;
    const needsApproval = durationHours > 2;

    deviceIds.forEach((did) => {
      const device = deviceRepository.findById(did);
      if (device && device.status === 'faulty') {
        return;
      }
    });

    const managers = userRepository.findManagers();
    const approvalManagerId = needsApproval && managers.length > 0 ? managers[0].id : undefined;

    const booking = bookingRepository.create({
      ...input,
      requiredDeviceIds: deviceIds,
    });

    if (needsApproval) {
      bookingRepository.update(booking.id, {
        status: 'pending_approval',
        approvalManagerId,
      } as UpdateBookingInput);
    }

    deviceIds.forEach((d) => bookingRepository.addBookingDevice(booking.id, d));

    const enriched = this.enrichBooking(booking);
    this.notifyBookingCreated(enriched, needsApproval);
    return enriched;
  }

  update(id: string, input: UpdateBookingInput): BookingWithRelations | null {
    const booking = bookingRepository.findById(id);
    if (!booking) return null;

    if (input.roomId && input.startTime && input.endTime) {
      const deviceIds = input.requiredDeviceIds || booking.requiredDeviceIds || [];
      const conflicts = this.detectConflicts(input.roomId, input.startTime, input.endTime, id, deviceIds);
      if (conflicts.length > 0) return null;
    }

    bookingRepository.removeBookingDevices(id);
    if (input.requiredDeviceIds) {
      input.requiredDeviceIds.forEach((d) => bookingRepository.addBookingDevice(id, d));
    }

    const updated = bookingRepository.update(id, input);
    if (!updated) return null;
    return this.enrichBooking(updated);
  }

  delete(id: string): boolean {
    return bookingRepository.delete(id);
  }

  detectConflicts(roomId: string, startTime: string, endTime: string, excludeBookingId?: string, deviceIds?: string[]): BookingConflict[] {
    const conflicts: BookingConflict[] = [];
    const timeConflicts = bookingRepository.findConflicts(roomId, startTime, endTime, excludeBookingId);

    if (timeConflicts.length > 0) {
      const room = roomRepository.findById(roomId);
      const alternatives = this.findAlternativeRooms(startTime, endTime);
      timeConflicts.forEach((cb) => {
        conflicts.push({
          type: 'time',
          conflictingBookingId: cb.id,
          roomName: room?.name,
          suggestedAlternatives: alternatives,
        });
      });
    }

    if (deviceIds && deviceIds.length > 0) {
      const deviceConflicts = this.detectDeviceConflicts(deviceIds, startTime, endTime, excludeBookingId);
      conflicts.push(...deviceConflicts);
    }

    return conflicts;
  }

  detectDeviceConflicts(deviceIds: string[], startTime: string, endTime: string, excludeBookingId?: string): BookingConflict[] {
    const conflicts: BookingConflict[] = [];
    const deviceConflicts = bookingRepository.findDeviceConflicts(deviceIds, startTime, endTime, excludeBookingId);

    deviceConflicts.forEach((dc) => {
      const device = deviceRepository.findById(dc.deviceId);
      conflicts.push({
        type: 'device',
        deviceName: device?.name || dc.deviceId,
        conflictingBookingId: dc.bookingId,
      });
    });

    return conflicts;
  }

  findAlternativeRooms(startTime: string, endTime: string): Array<{
    roomId: string;
    roomName: string;
    availableSlots: Array<{ start: string; end: string }>;
  }> {
    const rooms = roomRepository.findAvailableRooms(startTime, endTime);
    return rooms.slice(0, 3).map((r) => ({
      roomId: r.id,
      roomName: r.name,
      availableSlots: [{ start: startTime, end: endTime }],
    }));
  }

  checkIn(bookingId: string, userId: string): BookingWithRelations | null {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) return null;
    if (booking.userId !== userId) return null;
    if (booking.status !== 'locked') return null;

    const now = new Date();
    const startDate = new Date(booking.startTime);
    const diffMinutes = (now.getTime() - startDate.getTime()) / 60000;

    if (diffMinutes > 15) {
      return null;
    }

    const updated = bookingRepository.checkIn(bookingId);
    if (!updated) return null;

    creditService.addCredit(userId, 1, '准时签到奖励');

    const enriched = this.enrichBooking(updated);
    notificationService.create({
      userId,
      type: 'booking',
      title: '签到成功',
      content: `您已成功签到会议室，祝会议顺利！`,
    });
    return enriched;
  }

  cancel(bookingId: string, userId: string, comment?: string): BookingWithRelations | null {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) return null;
    if (booking.userId !== userId) return null;
    if (['cancelled', 'rejected', 'completed'].includes(booking.status)) return null;

    const now = new Date();
    const startDate = new Date(booking.startTime);
    const diffHours = (startDate.getTime() - now.getTime()) / 3600000;

    if (diffHours < 1 && booking.status === 'locked') {
      creditService.addCredit(userId, -3, '不足1小时取消预订');
    }

    const updated = bookingRepository.cancel(bookingId, comment);
    if (!updated) return null;

    const enriched = this.enrichBooking(updated);
    notificationService.create({
      userId,
      type: 'booking',
      title: '预订已取消',
      content: `您的会议室预订已成功取消。`,
    });
    return enriched;
  }

  release(bookingId: string): BookingWithRelations | null {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) return null;
    if (booking.status !== 'locked') return null;

    const updated = bookingRepository.release(bookingId);
    if (!updated) return null;

    creditService.addCredit(booking.userId, -5, '未签到导致会议室释放');

    const enriched = this.enrichBooking(updated);
    notificationService.create({
      userId: booking.userId,
      type: 'credit',
      title: '预订已自动释放',
      content: '由于未按时签到，您的预订已被释放，信用分已扣除。',
    });
    return enriched;
  }

  approve(bookingId: string, managerId: string, comment?: string): BookingWithRelations | null {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) return null;
    if (booking.status !== 'pending_approval') return null;

    const updated = bookingRepository.approve(bookingId, managerId, comment);
    if (!updated) return null;

    const enriched = this.enrichBooking(updated);
    notificationService.create({
      userId: booking.userId,
      type: 'approval',
      title: '预订审批通过',
      content: `您的会议室预订申请已通过审批。`,
    });
    return enriched;
  }

  reject(bookingId: string, managerId: string, comment: string): BookingWithRelations | null {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) return null;
    if (booking.status !== 'pending_approval') return null;

    const updated = bookingRepository.reject(bookingId, managerId, comment);
    if (!updated) return null;

    const enriched = this.enrichBooking(updated);
    notificationService.create({
      userId: booking.userId,
      type: 'approval',
      title: '预订审批未通过',
      content: `您的会议室预订申请未通过：${comment}`,
    });
    return enriched;
  }

  findPendingApprovals(managerId?: string, page = 1, pageSize = 20): PaginationResult<BookingWithRelations> {
    let where = "status = 'pending_approval'";
    const whereParams: unknown[] = [];
    if (managerId) {
      where += ' AND approvalManagerId = ?';
      whereParams.push(managerId);
    }
    const result = bookingRepository.paginate(
      { page, pageSize },
      { where, whereParams, orderBy: 'startTime ASC' },
    );
    return {
      ...result,
      items: result.items.map((b) => this.enrichBooking(b)),
    };
  }

  findApprovalHistory(managerId: string, page = 1, pageSize = 20): PaginationResult<BookingWithRelations> {
    const where = "approvalManagerId = ? AND status IN ('locked','rejected','completed','cancelled')";
    const result = bookingRepository.paginate(
      { page, pageSize },
      { where, whereParams: [managerId], orderBy: 'approvalTime DESC' },
    );
    return {
      ...result,
      items: result.items.map((b) => this.enrichBooking(b)),
    };
  }

  findUpcomingBookings(minutesAhead: number = 30): BookingWithRelations[] {
    const bookings = bookingRepository.findUpcomingBookings(minutesAhead);
    return bookings.map((b) => this.enrichBooking(b));
  }

  findOverdueCheckIns(minutesLate: number = 15): BookingWithRelations[] {
    const bookings = bookingRepository.findOverdueCheckIns(minutesLate);
    return bookings.map((b) => this.enrichBooking(b));
  }

  private notifyBookingCreated(booking: BookingWithRelations, needsApproval: boolean): void {
    if (needsApproval && booking.approvalManagerId) {
      notificationService.create({
        userId: booking.approvalManagerId,
        type: 'approval',
        title: '新的审批请求',
        content: `${booking.user?.name || '某用户'}提交了会议室预订申请，待您审批。`,
      });
    }
    notificationService.create({
      userId: booking.userId,
      type: 'booking',
      title: needsApproval ? '预订待审批' : '预订成功',
      content: needsApproval
        ? '您的会议室预订已提交，等待主管审批。'
        : `您的会议室预订已确认，时间：${new Date(booking.startTime).toLocaleString()}。`,
    });
  }

  private enrichBooking(booking: Booking): BookingWithRelations {
    const room = roomRepository.findById(booking.roomId);
    const user = userRepository.findById(booking.userId);
    const approvalManager = booking.approvalManagerId
      ? userRepository.findById(booking.approvalManagerId)
      : undefined;
    const devices: Device[] = [];
    (booking.requiredDeviceIds || []).forEach((did) => {
      const d = deviceRepository.findById(did);
      if (d) devices.push(d);
    });

    return {
      ...booking,
      room: room || undefined,
      user: user ? (userRepository.toUser(user) as User) : undefined,
      devices,
      approvalManagerName: approvalManager ? approvalManager.name : undefined,
    };
  }
}

export const bookingService = new BookingService();
export default bookingService;
