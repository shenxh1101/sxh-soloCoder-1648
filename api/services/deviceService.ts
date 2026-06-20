import { deviceRepository } from '../repository/deviceRepository.js';
import { maintenanceRepository } from '../repository/maintenanceRepository.js';
import type { Device, CreateDeviceInput, UpdateDeviceInput, DeviceStatus, DeviceType, PaginationParams, PaginationResult } from '../types/index.js';

class DeviceService {
  findById(id: string): Device | null {
    return deviceRepository.findById(id);
  }

  findAll(filters?: { status?: DeviceStatus; type?: DeviceType; roomId?: string }): Device[] {
    let where = '';
    const params: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      params.push(filters.status);
    }
    if (filters?.type) {
      where = where ? `${where} AND type = ?` : 'type = ?';
      params.push(filters.type);
    }
    if (filters?.roomId) {
      where = where ? `${where} AND roomId = ?` : 'roomId = ?';
      params.push(filters.roomId);
    } else if (filters?.roomId === null) {
      where = where ? `${where} AND roomId IS NULL` : 'roomId IS NULL';
    }

    return deviceRepository.findAll({
      where: where || undefined,
      params,
      orderBy: 'type, name',
    });
  }

  paginate(
    params: PaginationParams,
    filters?: { status?: DeviceStatus; type?: DeviceType; roomId?: string; keyword?: string; unassigned?: boolean },
  ): PaginationResult<Device> {
    let where = '';
    const whereParams: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      whereParams.push(filters.status);
    }
    if (filters?.type) {
      where = where ? `${where} AND type = ?` : 'type = ?';
      whereParams.push(filters.type);
    }
    if (filters?.roomId) {
      where = where ? `${where} AND roomId = ?` : 'roomId = ?';
      whereParams.push(filters.roomId);
    }
    if (filters?.unassigned) {
      where = where ? `${where} AND roomId IS NULL` : 'roomId IS NULL';
    }
    if (filters?.keyword) {
      const like = `%${filters.keyword}%`;
      where = where ? `${where} AND name LIKE ?` : 'name LIKE ?';
      whereParams.push(like);
    }

    return deviceRepository.paginate(params, {
      where: where || undefined,
      whereParams,
      orderBy: 'type, name',
    });
  }

  create(input: CreateDeviceInput): Device {
    return deviceRepository.create({
      ...input,
      status: input.status || 'normal',
      faultCount: 0,
    });
  }

  update(id: string, input: UpdateDeviceInput): Device | null {
    return deviceRepository.update(id, input);
  }

  delete(id: string): boolean {
    return deviceRepository.delete(id);
  }

  assignToRoom(deviceId: string, roomId: string): Device | null {
    return deviceRepository.assignToRoom(deviceId, roomId);
  }

  unassignFromRoom(deviceId: string): Device | null {
    return deviceRepository.unassignFromRoom(deviceId);
  }

  updateStatus(id: string, status: DeviceStatus): Device | null {
    return deviceRepository.updateStatus(id, status);
  }

  reportFault(id: string): Device | null {
    return deviceRepository.incrementFaultCount(id);
  }

  findDevicesNeedingMaintenance(): Device[] {
    return deviceRepository.findDevicesNeedingMaintenance();
  }

  scheduleMaintenance(deviceId: string, operatorId: string, notes?: string) {
    const device = deviceRepository.findById(deviceId);
    if (!device) return null;

    const scheduledDate = device.nextMaintenanceDate || new Date(Date.now() + 7 * 86400000).toISOString();

    return maintenanceRepository.create({
      deviceId,
      scheduledDate,
      type: 'preventive',
      operatorId,
      notes,
    });
  }

  completeMaintenance(maintenanceId: string, notes?: string) {
    const maintenance = maintenanceRepository.complete(maintenanceId, notes);
    if (maintenance && maintenance.completedDate) {
      const nextDate = new Date(maintenance.scheduledDate);
      nextDate.setDate(nextDate.getDate() + 30);
      deviceRepository.updateMaintenanceDates(
        maintenance.deviceId,
        maintenance.completedDate,
        nextDate.toISOString(),
      );
      deviceRepository.updateStatus(maintenance.deviceId, 'normal');
    }
    return maintenance;
  }

  getStatusSummary(): Record<string, number> {
    const all = deviceRepository.findAll();
    const summary: Record<string, number> = {
      normal: 0,
      faulty: 0,
      maintenance: 0,
      total: all.length,
    };
    all.forEach((d) => {
      summary[d.status] = (summary[d.status] || 0) + 1;
    });
    return summary;
  }

  getTypeSummary(): Record<string, number> {
    const all = deviceRepository.findAll();
    const summary: Record<string, number> = {};
    all.forEach((d) => {
      summary[d.type] = (summary[d.type] || 0) + 1;
    });
    return summary;
  }
}

export const deviceService = new DeviceService();
export default deviceService;
