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
};

export default statisticsService;
