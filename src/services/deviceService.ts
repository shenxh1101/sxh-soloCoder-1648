import { api } from './api';
import type { Device, DeviceStatus, DeviceType } from '../types';
import type { ApiResult } from './api';

export interface CreateDeviceRequest {
  name: string;
  type: DeviceType;
  roomId?: string;
}

export interface GetDevicesQuery {
  page?: number;
  pageSize?: number;
  type?: DeviceType;
  status?: DeviceStatus;
  roomId?: string;
  search?: string;
}

export interface DevicesListResponse {
  items: Device[];
  total: number;
  page: number;
  pageSize: number;
}

export const deviceService = {
  getDevices: (params?: GetDevicesQuery): Promise<ApiResult<DevicesListResponse>> =>
    api.get<DevicesListResponse>('/devices', { params }),

  getDevice: (id: string): Promise<ApiResult<Device>> =>
    api.get<Device>(`/devices/${id}`),

  createDevice: (data: CreateDeviceRequest): Promise<ApiResult<Device>> =>
    api.post<Device>('/devices', data),

  updateDevice: (id: string, data: Partial<CreateDeviceRequest>): Promise<ApiResult<Device>> =>
    api.put<Device>(`/devices/${id}`, data),

  deleteDevice: (id: string): Promise<ApiResult<void>> =>
    api.delete<void>(`/devices/${id}`),

  updateDeviceStatus: (id: string, status: DeviceStatus): Promise<ApiResult<Device>> =>
    api.patch<Device>(`/devices/${id}/status`, { status }),

  assignToRoom: (deviceId: string, roomId: string): Promise<ApiResult<Device>> =>
    api.post<Device>(`/devices/${deviceId}/assign`, { roomId }),

  unassignFromRoom: (deviceId: string): Promise<ApiResult<Device>> =>
    api.post<Device>(`/devices/${deviceId}/unassign`),

  scheduleMaintenance: (id: string, scheduledDate: string, type: 'preventive' | 'corrective'): Promise<ApiResult<void>> =>
    api.post<void>(`/devices/${id}/maintenance`, { scheduledDate, type }),

  getMaintenanceHistory: (id: string): Promise<ApiResult<unknown[]>> =>
    api.get<unknown[]>(`/devices/${id}/maintenance-history`),
};

export default deviceService;
