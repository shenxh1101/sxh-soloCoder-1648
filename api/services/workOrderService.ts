import { workOrderRepository } from '../repository/workOrderRepository.js';
import { deviceRepository } from '../repository/deviceRepository.js';
import { userRepository } from '../repository/userRepository.js';
import { notificationService } from './notificationService.js';
import { creditService } from './creditService.js';
import type {
  WorkOrder,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderStatus,
  WorkOrderWithRelations,
  PaginationParams,
  PaginationResult,
  User,
} from '../types/index.js';

class WorkOrderService {
  findById(id: string): WorkOrderWithRelations | null {
    const order = workOrderRepository.findById(id);
    if (!order) return null;
    return this.enrichWorkOrder(order);
  }

  findAll(filters?: {
    status?: WorkOrderStatus;
    reporterId?: string;
    assigneeId?: string;
    deviceId?: string;
    startDate?: string;
    endDate?: string;
  }): WorkOrderWithRelations[] {
    let where = '';
    const params: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      params.push(filters.status);
    }
    if (filters?.reporterId) {
      where = where ? `${where} AND reporterId = ?` : 'reporterId = ?';
      params.push(filters.reporterId);
    }
    if (filters?.assigneeId) {
      where = where ? `${where} AND assigneeId = ?` : 'assigneeId = ?';
      params.push(filters.assigneeId);
    }
    if (filters?.deviceId) {
      where = where ? `${where} AND deviceId = ?` : 'deviceId = ?';
      params.push(filters.deviceId);
    }
    if (filters?.startDate) {
      where = where ? `${where} AND createdAt >= ?` : 'createdAt >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      where = where ? `${where} AND createdAt <= ?` : 'createdAt <= ?';
      params.push(filters.endDate);
    }

    const orders = workOrderRepository.findAll({
      where: where || undefined,
      params,
      orderBy: 'createdAt DESC',
    });
    return orders.map((o) => this.enrichWorkOrder(o));
  }

  paginate(
    params: PaginationParams,
    filters?: {
      status?: WorkOrderStatus;
      reporterId?: string;
      assigneeId?: string;
      deviceId?: string;
      unassigned?: boolean;
    },
  ): PaginationResult<WorkOrderWithRelations> {
    let where = '';
    const whereParams: unknown[] = [];

    if (filters?.status) {
      where = 'status = ?';
      whereParams.push(filters.status);
    }
    if (filters?.reporterId) {
      where = where ? `${where} AND reporterId = ?` : 'reporterId = ?';
      whereParams.push(filters.reporterId);
    }
    if (filters?.assigneeId) {
      where = where ? `${where} AND assigneeId = ?` : 'assigneeId = ?';
      whereParams.push(filters.assigneeId);
    }
    if (filters?.deviceId) {
      where = where ? `${where} AND deviceId = ?` : 'deviceId = ?';
      whereParams.push(filters.deviceId);
    }
    if (filters?.unassigned) {
      where = where ? `${where} AND assigneeId IS NULL` : 'assigneeId IS NULL';
    }

    const result = workOrderRepository.paginate(params, {
      where: where || undefined,
      whereParams,
      orderBy: 'createdAt DESC',
    });

    return {
      ...result,
      items: result.items.map((o) => this.enrichWorkOrder(o)),
    };
  }

  create(input: CreateWorkOrderInput): WorkOrderWithRelations {
    const order = workOrderRepository.create(input);
    deviceRepository.incrementFaultCount(input.deviceId);
    deviceRepository.updateStatus(input.deviceId, 'faulty');

    creditService.addCredit(input.reporterId, 5, '提交设备故障工单');

    const enriched = this.enrichWorkOrder(order);
    this.autoAssign(enriched);

    notificationService.create({
      userId: input.reporterId,
      type: 'work_order',
      title: '工单提交成功',
      content: '您的设备故障工单已提交，将尽快安排处理。',
    });

    return enriched;
  }

  update(id: string, input: UpdateWorkOrderInput): WorkOrderWithRelations | null {
    const updated = workOrderRepository.update(id, input);
    if (!updated) return null;
    return this.enrichWorkOrder(updated);
  }

  delete(id: string): boolean {
    return workOrderRepository.delete(id);
  }

  assign(workOrderId: string, assigneeId: string): WorkOrderWithRelations | null {
    const assignee = userRepository.findById(assigneeId);
    if (!assignee) return null;

    const updated = workOrderRepository.assign(workOrderId, assigneeId);
    if (!updated) return null;

    const enriched = this.enrichWorkOrder(updated);
    notificationService.create({
      userId: assigneeId,
      type: 'work_order',
      title: '新工单分配',
      content: `您有新的设备维修工单待处理：${enriched.device?.name || '未知设备'}`,
    });

    if (enriched.reporterId) {
      notificationService.create({
        userId: enriched.reporterId,
        type: 'work_order',
        title: '工单已分配',
        content: `您提交的工单已分配给 ${assignee.name}，正在处理中。`,
      });
    }

    return enriched;
  }

  autoAssign(order: WorkOrderWithRelations): void {
    if (order.assigneeId) return;

    const admins = userRepository.findByRole('admin');
    if (admins.length === 0) return;

    const workloads = admins.map((a) => ({
      user: a,
      count: workOrderRepository.findByAssignee(a.id).filter(
        (w) => ['pending', 'assigned', 'processing'].includes(w.status),
      ).length,
    }));

    workloads.sort((a, b) => a.count - b.count);
    const selected = workloads[0].user;

    this.assign(order.id, selected.id);
  }

  autoAssignAllPending(): number {
    const pending = workOrderRepository.findPendingAndUnassigned();
    let count = 0;
    pending.forEach((o) => {
      const enriched = this.enrichWorkOrder(o);
      if (!enriched.assigneeId) {
        this.autoAssign(enriched);
        count++;
      }
    });
    return count;
  }

  startProcessing(workOrderId: string, operatorId: string): WorkOrderWithRelations | null {
    const order = workOrderRepository.findById(workOrderId);
    if (!order) return null;
    if (order.assigneeId && order.assigneeId !== operatorId) return null;
    if (!['pending', 'assigned'].includes(order.status)) return null;

    const updated = workOrderRepository.startProcessing(workOrderId);
    if (!updated) return null;

    if (updated.reporterId) {
      notificationService.create({
        userId: updated.reporterId,
        type: 'work_order',
        title: '工单处理中',
        content: '维修人员已开始处理您的设备故障工单。',
      });
    }

    return this.enrichWorkOrder(updated);
  }

  complete(workOrderId: string, operatorId: string, confirmCode: string, rating?: number): WorkOrderWithRelations | null {
    const order = workOrderRepository.findById(workOrderId);
    if (!order) return null;
    if (order.assigneeId && order.assigneeId !== operatorId) return null;
    if (!['assigned', 'processing'].includes(order.status)) return null;

    const updated = workOrderRepository.complete(workOrderId, confirmCode, rating);
    if (!updated) return null;

    if (order.deviceId) {
      deviceRepository.updateStatus(order.deviceId, 'normal');
    }

    if (updated.reporterId) {
      notificationService.create({
        userId: updated.reporterId,
        type: 'work_order',
        title: '工单已完成',
        content: `设备维修已完成，确认码：${confirmCode}，请对服务进行评价。`,
      });
    }

    return this.enrichWorkOrder(updated);
  }

  cancel(workOrderId: string, reporterId: string): WorkOrderWithRelations | null {
    const order = workOrderRepository.findById(workOrderId);
    if (!order) return null;
    if (order.reporterId !== reporterId) return null;
    if (!['pending', 'assigned'].includes(order.status)) return null;

    const updated = workOrderRepository.cancel(workOrderId);
    if (!updated) return null;

    return this.enrichWorkOrder(updated);
  }

  rate(workOrderId: string, reporterId: string, rating: number): WorkOrderWithRelations | null {
    const order = workOrderRepository.findById(workOrderId);
    if (!order) return null;
    if (order.reporterId !== reporterId) return null;
    if (order.status !== 'completed') return null;
    if (rating < 1 || rating > 5) return null;

    const updated = workOrderRepository.update(workOrderId, { rating });
    if (!updated) return null;
    return this.enrichWorkOrder(updated);
  }

  getStats(startDate?: string, endDate?: string) {
    return {
      byStatus: workOrderRepository.getStatsByStatus(startDate, endDate),
      avgProcessingTime: startDate && endDate
        ? workOrderRepository.getAverageProcessingTime(startDate, endDate)
        : 0,
    };
  }

  private enrichWorkOrder(order: WorkOrder): WorkOrderWithRelations {
    const device = deviceRepository.findById(order.deviceId) || undefined;
    const reporter = order.reporterId ? userRepository.findById(order.reporterId) : null;
    const assignee = order.assigneeId ? userRepository.findById(order.assigneeId) : null;

    return {
      ...order,
      device,
      reporter: reporter ? (userRepository.toUser(reporter) as User) : undefined,
      assignee: assignee ? (userRepository.toUser(assignee) as User) : undefined,
    };
  }
}

export const workOrderService = new WorkOrderService();
export default workOrderService;
