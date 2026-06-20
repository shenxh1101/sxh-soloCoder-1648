import { api } from './api';
import type { DailyReport } from '../types';
import type { ApiResult } from './api';

export interface StatisticsOverview {
  totalRooms: number;
  totalBookings: number;
  completedBookings: number;
  releasedBookings: number;
  averageUsageRate: number;
  deviceFaultCount: number;
  deviceRepairRate: number;
  activeWorkOrders: number;
  pendingApprovals: number;
}

export interface RoomUsageStats {
  roomId: string;
  roomName: string;
  bookingCount: number;
  usageHours: number;
  averageUsageRate: number;
}

export interface DeviceFaultStats {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  faultCount: number;
  avgRepairTime: number;
}

export interface TimeSlotUsage {
  hour: number;
  count: number;
  rate: number;
}

export interface TimeoutTrendItem {
  date: string;
  count: number;
}

export interface DepartmentTimeoutItem {
  department: string;
  count: number;
}

export interface RoomTimeoutItem {
  roomId: string;
  roomName: string;
  timeoutCount: number;
  totalBookings: number;
}

export const statisticsService = {
  getOverview: (): Promise<ApiResult<StatisticsOverview>> =>
    api.get<StatisticsOverview>('/statistics/overview'),

  getDailyReport: (date?: string): Promise<ApiResult<DailyReport>> =>
    api.get<DailyReport>('/statistics/daily-report', {
      params: date ? { date } : undefined,
    }),

  getWeeklyReport: (startDate: string, endDate: string): Promise<ApiResult<DailyReport[]>> =>
    api.get<DailyReport[]>('/statistics/weekly', {
      params: { startDate, endDate },
    }),

  getRoomUsageRanking: (startDate?: string, endDate?: string, limit?: number): Promise<ApiResult<RoomUsageStats[]>> =>
    api.get<RoomUsageStats[]>('/statistics/room-usage', {
      params: { startDate, endDate, limit },
    }),

  getDeviceFaultRanking: (startDate?: string, endDate?: string, limit?: number): Promise<ApiResult<DeviceFaultStats[]>> =>
    api.get<DeviceFaultStats[]>('/statistics/device-faults', {
      params: { startDate, endDate, limit },
    }),

  getTimeSlotDistribution: (startDate?: string, endDate?: string): Promise<ApiResult<TimeSlotUsage[]>> =>
    api.get<TimeSlotUsage[]>('/statistics/time-slots', {
      params: { startDate, endDate },
    }),

  getDepartmentStats: (startDate?: string, endDate?: string): Promise<ApiResult<{ department: string; bookingCount: number; avgAttendees: number }[]>> =>
    api.get<
      { department: string; bookingCount: number; avgAttendees: number }[]
    >('/statistics/departments', { params: { startDate, endDate } }),

  getTimeoutTrend: (days?: number): Promise<ApiResult<TimeoutTrendItem[]>> =>
    api.get<TimeoutTrendItem[]>('/statistics/timeout-trend', {
      params: days !== undefined ? { days } : undefined,
    }),

  getTimeoutByDepartment: (): Promise<ApiResult<DepartmentTimeoutItem[]>> =>
    api.get<DepartmentTimeoutItem[]>('/statistics/timeout-by-department'),

  getTopTimeoutRooms: (limit?: number): Promise<ApiResult<RoomTimeoutItem[]>> =>
    api.get<RoomTimeoutItem[]>('/statistics/top-timeout-rooms', {
      params: limit !== undefined ? { limit } : undefined,
    }),
};

export default statisticsService;
