import BaseRepository from './baseRepository.js';
import type { MeetingRoom, CreateRoomInput, UpdateRoomInput, RoomStatus } from '../types/index.js';

class RoomRepository extends BaseRepository<MeetingRoom> {
  constructor() {
    super('meeting_rooms');
  }

  findById(id: string): MeetingRoom | null {
    return super.findById(id, ['equipmentIds']);
  }

  findAll(options: { where?: string; params?: unknown[]; orderBy?: string } = {}): MeetingRoom[] {
    return super.findAll({ ...options, jsonFields: ['equipmentIds'] });
  }

  paginate(params: Parameters<BaseRepository<MeetingRoom>['paginate']>[0], options: Parameters<BaseRepository<MeetingRoom>['paginate']>[1] = {}): ReturnType<BaseRepository<MeetingRoom>['paginate']> {
    return super.paginate(params, { ...options, jsonFields: ['equipmentIds'] });
  }

  create(data: CreateRoomInput): MeetingRoom {
    return super.create(data as Partial<MeetingRoom>, ['equipmentIds']);
  }

  update(id: string, data: UpdateRoomInput): MeetingRoom | null {
    return super.update(id, data as Partial<MeetingRoom>, ['equipmentIds']);
  }

  findByStatus(status: RoomStatus): MeetingRoom[] {
    return this.findAll({ where: 'status = ?', params: [status] });
  }

  findByFloor(floor: string): MeetingRoom[] {
    return this.findAll({ where: 'floor = ?', params: [floor] });
  }

  findAvailableRooms(startTime: string, endTime: string, status: RoomStatus = 'active'): MeetingRoom[] {
    const sql = `
      SELECT r.* FROM meeting_rooms r
      WHERE r.status = ?
        AND r.id NOT IN (
          SELECT b.roomId FROM bookings b
          WHERE b.status IN ('locked', 'pending_approval')
            AND NOT (b.endTime <= ? OR b.startTime >= ?)
        )
      ORDER BY r.floor, r.name
    `;
    const rows = this.db.prepare(sql).all(status, startTime, endTime) as MeetingRoom[];
    return rows.map((r) => this.parseJsonFields(r, ['equipmentIds']));
  }

  getRoomUsageStats(roomId: string, startDate: string, endDate: string): { totalBookings: number; completedBookings: number; totalHours: number } {
    const sql = `
      SELECT
        COUNT(*) as totalBookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedBookings,
        ROUND(SUM(CASE WHEN status = 'completed'
          THEN (julianday(endTime) - julianday(startTime)) * 24
          ELSE 0 END), 2) as totalHours
      FROM bookings
      WHERE roomId = ?
        AND startTime >= ?
        AND startTime <= ?
    `;
    const result = this.db.prepare(sql).get(roomId, startDate, endDate) as {
      totalBookings: number;
      completedBookings: number;
      totalHours: number;
    };
    return {
      totalBookings: result.totalBookings || 0,
      completedBookings: result.completedBookings || 0,
      totalHours: result.totalHours || 0,
    };
  }
}

export const roomRepository = new RoomRepository();
export default roomRepository;
