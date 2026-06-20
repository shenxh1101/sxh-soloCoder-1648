import BaseRepository from './baseRepository.js';
import type { MaintenanceRecord, CreateMaintenanceInput, UpdateMaintenanceInput, MaintenanceStatus } from '../types/index.js';

class MaintenanceRepository extends BaseRepository<MaintenanceRecord> {
  constructor() {
    super('maintenance_records');
  }

  create(data: CreateMaintenanceInput): MaintenanceRecord {
    return super.create({
      ...data,
      status: 'scheduled' as MaintenanceStatus,
    } as Partial<MaintenanceRecord>);
  }

  update(id: string, data: UpdateMaintenanceInput): MaintenanceRecord | null {
    return super.update(id, data as Partial<MaintenanceRecord>);
  }

  findByDevice(deviceId: string): MaintenanceRecord[] {
    return this.findAll({
      where: 'deviceId = ?',
      params: [deviceId],
      orderBy: 'scheduledDate DESC',
    });
  }

  findByOperator(operatorId: string): MaintenanceRecord[] {
    return this.findAll({
      where: 'operatorId = ?',
      params: [operatorId],
      orderBy: 'scheduledDate DESC',
    });
  }

  findByStatus(status: MaintenanceStatus): MaintenanceRecord[] {
    return this.findAll({
      where: 'status = ?',
      params: [status],
      orderBy: 'scheduledDate ASC',
    });
  }

  findBetweenDates(startDate: string, endDate: string, status?: MaintenanceStatus): MaintenanceRecord[] {
    const params: unknown[] = [startDate, endDate];
    let sql = 'SELECT * FROM maintenance_records WHERE scheduledDate >= ? AND scheduledDate <= ?';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY scheduledDate ASC';
    return this.db.prepare(sql).all(...params) as MaintenanceRecord[];
  }

  findOverdue(): MaintenanceRecord[] {
    const sql = `
      SELECT * FROM maintenance_records
      WHERE status = 'scheduled'
        AND scheduledDate < datetime('now')
      ORDER BY scheduledDate ASC
    `;
    return this.db.prepare(sql).all() as MaintenanceRecord[];
  }

  findUpcoming(days: number = 7): MaintenanceRecord[] {
    const sql = `
      SELECT * FROM maintenance_records
      WHERE status = 'scheduled'
        AND scheduledDate >= datetime('now')
        AND scheduledDate <= datetime('now', '+${days} days')
      ORDER BY scheduledDate ASC
    `;
    return this.db.prepare(sql).all() as MaintenanceRecord[];
  }

  complete(id: string, notes?: string): MaintenanceRecord | null {
    return this.update(id, {
      status: 'completed',
      completedDate: new Date().toISOString(),
      notes,
    } as UpdateMaintenanceInput);
  }

  markOverdue(): number {
    const sql = `
      UPDATE maintenance_records
      SET status = 'overdue'
      WHERE status = 'scheduled'
        AND scheduledDate < datetime('now')
    `;
    return this.db.prepare(sql).run().changes;
  }

  getStatsByStatus(startDate?: string, endDate?: string): Record<string, number> {
    const params: unknown[] = [];
    let sql = "SELECT status, COUNT(*) as count FROM maintenance_records";
    if (startDate && endDate) {
      sql += ' WHERE scheduledDate >= ? AND scheduledDate <= ?';
      params.push(startDate, endDate);
    }
    sql += ' GROUP BY status';
    const rows = this.db.prepare(sql).all(...params) as Array<{ status: string; count: number }>;
    const result: Record<string, number> = {
      scheduled: 0,
      completed: 0,
      overdue: 0,
    };
    rows.forEach((r) => {
      result[r.status] = r.count;
    });
    return result;
  }
}

export const maintenanceRepository = new MaintenanceRepository();
export default maintenanceRepository;
