import BaseRepository from './baseRepository.js';
import type { WorkOrder, CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrderStatus } from '../types/index.js';

class WorkOrderRepository extends BaseRepository<WorkOrder> {
  constructor() {
    super('work_orders');
  }

  create(data: CreateWorkOrderInput): WorkOrder {
    const now = new Date().toISOString();
    return super.create({
      ...data,
      status: 'pending' as WorkOrderStatus,
      createdAt: now,
    } as Partial<WorkOrder>);
  }

  update(id: string, data: UpdateWorkOrderInput): WorkOrder | null {
    return super.update(id, data as Partial<WorkOrder>);
  }

  findByReporter(reporterId: string): WorkOrder[] {
    return this.findAll({
      where: 'reporterId = ?',
      params: [reporterId],
      orderBy: 'createdAt DESC',
    });
  }

  findByAssignee(assigneeId: string): WorkOrder[] {
    return this.findAll({
      where: 'assigneeId = ?',
      params: [assigneeId],
      orderBy: 'createdAt DESC',
    });
  }

  findByDevice(deviceId: string): WorkOrder[] {
    return this.findAll({
      where: 'deviceId = ?',
      params: [deviceId],
      orderBy: 'createdAt DESC',
    });
  }

  findByStatus(status: WorkOrderStatus): WorkOrder[] {
    return this.findAll({
      where: 'status = ?',
      params: [status],
      orderBy: 'createdAt ASC',
    });
  }

  findPendingAndUnassigned(): WorkOrder[] {
    return this.findAll({
      where: "status = 'pending' AND assigneeId IS NULL",
      orderBy: 'createdAt ASC',
    });
  }

  findBetweenDates(startDate: string, endDate: string, status?: WorkOrderStatus): WorkOrder[] {
    const params: unknown[] = [startDate, endDate];
    let sql = 'SELECT * FROM work_orders WHERE createdAt >= ? AND createdAt <= ?';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY createdAt DESC';
    return this.db.prepare(sql).all(...params) as WorkOrder[];
  }

  assign(workOrderId: string, assigneeId: string): WorkOrder | null {
    return this.update(workOrderId, {
      status: 'assigned',
      assigneeId,
      assignedAt: new Date().toISOString(),
    } as UpdateWorkOrderInput);
  }

  startProcessing(workOrderId: string): WorkOrder | null {
    return this.update(workOrderId, {
      status: 'processing',
    } as UpdateWorkOrderInput);
  }

  complete(workOrderId: string, confirmCode: string, rating?: number): WorkOrder | null {
    return this.update(workOrderId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      confirmCode,
      rating,
    } as UpdateWorkOrderInput);
  }

  cancel(workOrderId: string): WorkOrder | null {
    return this.update(workOrderId, {
      status: 'cancelled',
    } as UpdateWorkOrderInput);
  }

  getStatsByStatus(startDate?: string, endDate?: string): Record<string, number> {
    const params: unknown[] = [];
    let sql = "SELECT status, COUNT(*) as count FROM work_orders";
    if (startDate && endDate) {
      sql += ' WHERE createdAt >= ? AND createdAt <= ?';
      params.push(startDate, endDate);
    }
    sql += ' GROUP BY status';
    const rows = this.db.prepare(sql).all(...params) as Array<{ status: string; count: number }>;
    const result: Record<string, number> = {
      pending: 0,
      assigned: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };
    rows.forEach((r) => {
      result[r.status] = r.count;
    });
    return result;
  }

  getAverageProcessingTime(startDate: string, endDate: string): number {
    const sql = `
      SELECT AVG(julianday(completedAt) - julianday(createdAt)) * 24 as avgHours
      FROM work_orders
      WHERE status = 'completed'
        AND createdAt >= ?
        AND createdAt <= ?
    `;
    const result = this.db.prepare(sql).get(startDate, endDate) as { avgHours: number | null };
    return result.avgHours ? Math.round(result.avgHours * 100) / 100 : 0;
  }
}

export const workOrderRepository = new WorkOrderRepository();
export default workOrderRepository;
