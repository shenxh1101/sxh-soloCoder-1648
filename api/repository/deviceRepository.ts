import BaseRepository from './baseRepository.js';
import type { Device, CreateDeviceInput, UpdateDeviceInput, DeviceStatus, DeviceType } from '../types/index.js';

class DeviceRepository extends BaseRepository<Device> {
  constructor() {
    super('devices');
  }

  findByRoom(roomId: string): Device[] {
    return this.findAll({ where: 'roomId = ?', params: [roomId], orderBy: 'type, name' });
  }

  findByStatus(status: DeviceStatus): Device[] {
    return this.findAll({ where: 'status = ?', params: [status], orderBy: 'name' });
  }

  findByType(type: DeviceType): Device[] {
    return this.findAll({ where: 'type = ?', params: [type], orderBy: 'name' });
  }

  findUnassigned(): Device[] {
    return this.findAll({ where: 'roomId IS NULL', orderBy: 'name' });
  }

  create(data: CreateDeviceInput): Device {
    return super.create(data as Partial<Device>);
  }

  update(id: string, data: UpdateDeviceInput): Device | null {
    return super.update(id, data as Partial<Device>);
  }

  assignToRoom(deviceId: string, roomId: string): Device | null {
    return this.update(deviceId, { roomId } as UpdateDeviceInput);
  }

  unassignFromRoom(deviceId: string): Device | null {
    const sql = 'UPDATE devices SET roomId = NULL, updatedAt = ? WHERE id = ?';
    this.db.prepare(sql).run(new Date().toISOString(), deviceId);
    return this.findById(deviceId);
  }

  incrementFaultCount(deviceId: string): Device | null {
    const sql = 'UPDATE devices SET faultCount = faultCount + 1, updatedAt = ? WHERE id = ?';
    this.db.prepare(sql).run(new Date().toISOString(), deviceId);
    return this.findById(deviceId);
  }

  updateStatus(deviceId: string, status: DeviceStatus): Device | null {
    return this.update(deviceId, { status } as UpdateDeviceInput);
  }

  findDevicesNeedingMaintenance(): Device[] {
    const sql = `
      SELECT * FROM devices
      WHERE nextMaintenanceDate IS NOT NULL
        AND nextMaintenanceDate <= datetime('now', '+7 days')
        AND status = 'normal'
      ORDER BY nextMaintenanceDate ASC
    `;
    return this.db.prepare(sql).all() as Device[];
  }

  updateMaintenanceDates(deviceId: string, lastDate: string, nextDate: string): Device | null {
    const sql = 'UPDATE devices SET lastMaintenanceDate = ?, nextMaintenanceDate = ?, updatedAt = ? WHERE id = ?';
    this.db.prepare(sql).run(lastDate, nextDate, new Date().toISOString(), deviceId);
    return this.findById(deviceId);
  }
}

export const deviceRepository = new DeviceRepository();
export default deviceRepository;
