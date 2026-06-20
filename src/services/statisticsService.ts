import { api } from './api';
import type { DailyReport } from '../types';

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
  getOverview: () => api.get<StatisticsOverview>('/statistics/overview'),

  getDailyReport: (date?: string) =>
    api.get<DailyReport>('/statistics/daily-report', {
      params: date ? { date } : undefined,
    }),

  getWeeklyReport: (startDate: string, endDate: string) =>
    api.get<DailyReport[]>('/statistics/weekly', {
      params: { startDate, endDate },
    }),

  getRoomUsageRanking: (startDate?: string, endDate?: string, limit?: number) =>
    api.get<RoomUsageStats[]>('/statistics/room-usage', {
      params: { startDate, endDate, limit },
    }),

  getDeviceFaultRanking: (startDate?: string, endDate?: string, limit?: number) =>
    api.get<DeviceFaultStats[]>('/statistics/device-faults', {
      params: { startDate, endDate, limit },
    }),

  getTimeSlotDistribution: (startDate?: string, endDate?: string) =>
    api.get<TimeSlotUsage[]>('/statistics/time-slots', {
      params: { startDate, endDate },
    }),

  getDepartmentStats: (startDate?: string, endDate?: string) =>
    api.get<
      { department: string; bookingCount: number; avgAttendees: number }[]
    >('/statistics/departments', { params: { startDate, endDate } }),

  getTimeoutTrend: (days?: number) =>
    api.get<TimeoutTrendItem[]>('/statistics/timeout-trend', {
      params: days !== undefined ? { days } : undefined,
    }),

  getTimeoutByDepartment: () =>
    api.get<DepartmentTimeoutItem[]>('/statistics/timeout-by-department'),

  getTopTimeoutRooms: (limit?: number) =>
    api.get<RoomTimeoutItem[]>('/statistics/top-timeout-rooms', {
      params: limit !== undefined ? { limit } : undefined,
    }),
};

export default statisticsService;
