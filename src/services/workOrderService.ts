import { api } from './api';
import type { WorkOrder, WorkOrderStatus } from '../types';

export interface CreateWorkOrderRequest {
  deviceId: string;
  faultType: string;
  description: string;
}

export interface GetWorkOrdersQuery {
  page?: number;
  pageSize?: number;
  status?: WorkOrderStatus;
  assigneeId?: string;
  reporterId?: string;
}

export interface AssignWorkOrderRequest {
  assigneeId: string;
}

export interface CompleteWorkOrderRequest {
  confirmCode?: string;
  rating?: number;
}

export interface WorkOrdersListResponse {
  items: WorkOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export const workOrderService = {
  getWorkOrders: (params?: GetWorkOrdersQuery) =>
    api.get<WorkOrdersListResponse>('/work-orders', { params }),

  getWorkOrder: (id: string) => api.get<WorkOrder>(`/work-orders/${id}`),

  createWorkOrder: (data: CreateWorkOrderRequest) =>
    api.post<WorkOrder>('/work-orders', data),

  updateWorkOrder: (id: string, data: Partial<CreateWorkOrderRequest>) =>
    api.put<WorkOrder>(`/work-orders/${id}`, data),

  assignWorkOrder: (id: string, data: AssignWorkOrderRequest) =>
    api.post<WorkOrder>(`/work-orders/${id}/assign`, data),

  startWorkOrder: (id: string) => api.post<WorkOrder>(`/work-orders/${id}/start`),

  completeWorkOrder: (id: string, data?: CompleteWorkOrderRequest) =>
    api.post<WorkOrder>(`/work-orders/${id}/complete`, data),

  cancelWorkOrder: (id: string) => api.post<void>(`/work-orders/${id}/cancel`),

  getMyWorkOrders: (params?: GetWorkOrdersQuery) =>
    api.get<WorkOrdersListResponse>('/work-orders/mine', { params }),

  getMyReported: (params?: GetWorkOrdersQuery) =>
    api.get<WorkOrdersListResponse>('/work-orders/reported', { params }),
};

export default workOrderService;
