import { api } from './api';
import type { Device, DeviceStatus, DeviceType } from '../types';

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
  getDevices: (params?: GetDevicesQuery) =>
    api.get<DevicesListResponse>('/devices', { params }),

  getDevice: (id: string) => api.get<Device>(`/devices/${id}`),

  createDevice: (data: CreateDeviceRequest) =>
    api.post<Device>('/devices', data),

  updateDevice: (id: string, data: Partial<CreateDeviceRequest>) =>
    api.put<Device>(`/devices/${id}`, data),

  deleteDevice: (id: string) => api.delete<void>(`/devices/${id}`),

  updateDeviceStatus: (id: string, status: DeviceStatus) =>
    api.patch<Device>(`/devices/${id}/status`, { status }),

  assignToRoom: (deviceId: string, roomId: string) =>
    api.post<Device>(`/devices/${deviceId}/assign`, { roomId }),

  unassignFromRoom: (deviceId: string) =>
    api.post<Device>(`/devices/${deviceId}/unassign`),

  scheduleMaintenance: (id: string, scheduledDate: string, type: 'preventive' | 'corrective') =>
    api.post<void>(`/devices/${id}/maintenance`, { scheduledDate, type }),

  getMaintenanceHistory: (id: string) =>
    api.get<unknown[]>(`/devices/${id}/maintenance-history`),
};

export default deviceService;
