import { roomRepository } from '../repository/roomRepository.js';
import { deviceRepository } from '../repository/deviceRepository.js';
import { bookingRepository } from '../repository/bookingRepository.js';
import type { MeetingRoom, CreateRoomInput, UpdateRoomInput, RoomStatus, PaginationParams, PaginationResult } from '../types/index.js';

class RoomService {
  findById(id: string): MeetingRoom | null {
    const room = roomRepository.findById(id);
    if (room) {
      return this.enrichRoomWithDevices(room);
    }
    return null;
  }

  findAll(filters?: { status?: RoomStatus; floor?: string }): MeetingRoom[] {
    let where = '';
    const params: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      params.push(filters.status);
    }
    if (filters?.floor) {
      where = where ? `${where} AND floor = ?` : 'floor = ?';
      params.push(filters.floor);
    }

    const rooms = roomRepository.findAll({
      where: where || undefined,
      params,
      orderBy: 'floor, name',
    });
    return rooms.map((r) => this.enrichRoomWithDevices(r));
  }

  paginate(
    params: PaginationParams,
    filters?: { status?: RoomStatus; floor?: string; keyword?: string },
  ): PaginationResult<MeetingRoom> {
    let where = '';
    const whereParams: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      whereParams.push(filters.status);
    }
    if (filters?.floor) {
      where = where ? `${where} AND floor = ?` : 'floor = ?';
      whereParams.push(filters.floor);
    }
    if (filters?.keyword) {
      const like = `%${filters.keyword}%`;
      where = where ? `${where} AND (name LIKE ? OR description LIKE ?)` : '(name LIKE ? OR description LIKE ?)';
      whereParams.push(like, like);
    }

    const result = roomRepository.paginate(params, {
      where: where || undefined,
      whereParams,
      orderBy: 'floor, name',
    });

    return {
      ...result,
      items: result.items.map((r) => this.enrichRoomWithDevices(r)),
    };
  }

  create(input: CreateRoomInput): MeetingRoom {
    const room = roomRepository.create({
      ...input,
      status: input.status || 'active',
      equipmentIds: input.equipmentIds || [],
    });
    return this.enrichRoomWithDevices(room);
  }

  update(id: string, input: UpdateRoomInput): MeetingRoom | null {
    const room = roomRepository.update(id, input);
    if (room) {
      return this.enrichRoomWithDevices(room);
    }
    return null;
  }

  delete(id: string): boolean {
    const devices = deviceRepository.findByRoom(id);
    devices.forEach((d) => deviceRepository.unassignFromRoom(d.id));
    return roomRepository.delete(id);
  }

  findAvailableRooms(startTime: string, endTime: string, capacity?: number): MeetingRoom[] {
    let rooms = roomRepository.findAvailableRooms(startTime, endTime);
    if (capacity) {
      rooms = rooms.filter((r) => r.capacity >= capacity);
    }
    return rooms.map((r) => this.enrichRoomWithDevices(r));
  }

  updateStatus(id: string, status: RoomStatus): MeetingRoom | null {
    return roomRepository.update(id, { status } as UpdateRoomInput);
  }

  getRoomUsageStats(roomId: string, startDate: string, endDate: string) {
    return roomRepository.getRoomUsageStats(roomId, startDate, endDate);
  }

  getAvailableSlots(roomId: string, date: string): Array<{ start: string; end: string }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = bookingRepository.findByRoom(roomId, {
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    }).filter((b) => ['locked', 'pending_approval', 'completed'].includes(b.status));

    const slots: Array<{ start: string; end: string }> = [];
    let currentTime = new Date(startOfDay);
    currentTime.setHours(8, 0, 0, 0);
    const endTime = new Date(startOfDay);
    endTime.setHours(20, 0, 0, 0);

    const sortedBookings = [...bookings].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    for (const booking of sortedBookings) {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      if (currentTime < bookingStart) {
        slots.push({
          start: currentTime.toISOString(),
          end: bookingStart.toISOString(),
        });
      }
      if (bookingEnd > currentTime) {
        currentTime = bookingEnd;
      }
    }

    if (currentTime < endTime) {
      slots.push({
        start: currentTime.toISOString(),
        end: endTime.toISOString(),
      });
    }

    return slots;
  }

  private enrichRoomWithDevices(room: MeetingRoom): MeetingRoom {
    const devices = deviceRepository.findByRoom(room.id);
    return {
      ...room,
      equipmentIds: devices.map((d) => d.id),
    };
  }
}

export const roomService = new RoomService();
export default roomService;
