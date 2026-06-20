import { bookingRepository } from '../repository/bookingRepository.js';
import { roomRepository } from '../repository/roomRepository.js';
import { deviceRepository } from '../repository/deviceRepository.js';
import { workOrderRepository } from '../repository/workOrderRepository.js';
import { maintenanceRepository } from '../repository/maintenanceRepository.js';
import { creditRepository } from '../repository/creditRepository.js';
import { userRepository } from '../repository/userRepository.js';
import type { DailyReport, StatisticsQueryParams, BookingStatus } from '../types/index.js';

class StatisticsService {
  getOverview(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -7).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
    } = params;

    const totalBookings = bookingRepository.count(
      'createdAt >= ? AND createdAt <= ?',
      [startDate, endDate],
    );
    const completedBookings = bookingRepository.count(
      "status = 'completed' AND createdAt >= ? AND createdAt <= ?",
      [startDate, endDate],
    );
    const cancelledBookings = bookingRepository.count(
      "status IN ('cancelled', 'released') AND createdAt >= ? AND createdAt <= ?",
      [startDate, endDate],
    );

    const totalRooms = roomRepository.count();
    const activeRooms = roomRepository.count("status = 'active'");

    const totalDevices = deviceRepository.count();
    const faultyDevices = deviceRepository.count("status = 'faulty'");

    const totalWorkOrders = workOrderRepository.count(
      'createdAt >= ? AND createdAt <= ?',
      [startDate, endDate],
    );
    const completedWorkOrders = workOrderRepository.count(
      "status = 'completed' AND createdAt >= ? AND createdAt <= ?",
      [startDate, endDate],
    );

    const totalUsers = userRepository.count();

    const activeWorkOrders = workOrderRepository.count(
      "status IN ('pending', 'assigned', 'in_progress')",
    );
    const pendingApprovals = bookingRepository.count("status = 'pending_approval'");

    return {
      totalRooms,
      totalBookings,
      completedBookings,
      releasedBookings: cancelledBookings,
      averageUsageRate: totalRooms > 0
        ? Math.round(((completedBookings / (totalRooms * 14)) * 100 * 7) / 7)
        : 0,
      deviceFaultCount: faultyDevices,
      deviceRepairRate: totalWorkOrders > 0 ? Math.round((completedWorkOrders / totalWorkOrders) * 100) : 0,
      activeWorkOrders,
      pendingApprovals,
    };
  }

  getDailyReport(date?: string): DailyReport {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = this.getStartOfDay(targetDate);
    const endOfDay = this.getEndOfDay(targetDate);
    const dateStr = startOfDay.toISOString().split('T')[0];

    const bookings = bookingRepository.findBetweenDates(
      startOfDay.toISOString(),
      endOfDay.toISOString(),
    );
    const rooms = roomRepository.findAll();
    const workOrders = workOrderRepository.findBetweenDates(
      startOfDay.toISOString(),
      endOfDay.toISOString(),
    );

    const completedBookings = bookings.filter((b) => b.status === 'completed');
    const releasedBookings = bookings.filter((b) => b.status === 'released');
    const totalRooms = rooms.length;
    const deviceFaultCount = workOrders.length;

    const deviceRepaired = workOrders.filter((w) => w.status === 'completed').length;

    const heatmap = this.buildRoomUsageHeatmap(bookings, rooms);

    const roomUsageCounts = new Map<string, { roomId: string; roomName: string; count: number }>();
    bookings.forEach((b) => {
      const room = rooms.find((r) => r.id === b.roomId);
      if (!room) return;
      const existing = roomUsageCounts.get(b.roomId) || {
        roomId: b.roomId,
        roomName: room.name,
        count: 0,
      };
      existing.count++;
      roomUsageCounts.set(b.roomId, existing);
    });

    const topOverused = Array.from(roomUsageCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalPossibleHours = totalRooms * 12;
    const bookedHours = completedBookings.reduce((sum, b) => {
      const hours =
        (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3600000;
      return sum + hours;
    }, 0);
    const averageUsageRate = totalPossibleHours > 0
      ? Math.round((bookedHours / totalPossibleHours) * 100)
      : 0;

    return {
      date: dateStr,
      totalRooms,
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      releasedBookings: releasedBookings.length,
      averageUsageRate,
      deviceFaultCount,
      deviceRepairRate: deviceFaultCount > 0
        ? Math.round((deviceRepaired / deviceFaultCount) * 100)
        : 0,
      roomUsageHeatmap: heatmap,
      topOverusedRooms: topOverused,
    };
  }

  getBookingTrend(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -30).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
    } = params;

    const bookings = bookingRepository.findBetweenDates(startDate, endDate);
    const byStatus = new Map<string, Record<BookingStatus, number>>();

    const statuses: BookingStatus[] = [
      'pending_approval',
      'locked',
      'completed',
      'released',
      'cancelled',
      'rejected',
    ];

    bookings.forEach((b) => {
      const date = b.createdAt.split('T')[0];
      if (!byStatus.has(date)) {
        byStatus.set(date, {
          pending_approval: 0, locked: 0, completed: 0, released: 0, cancelled: 0, rejected: 0 });
      }
      const entry = byStatus.get(date)!;
      entry[b.status] = (entry[b.status] || 0) + 1;
    });

    return {
      labels: Array.from(byStatus.keys()).sort(),
      datasets: statuses.map((s) => ({
        status: s,
        data: Array.from(byStatus.keys()).sort().map((d) => byStatus.get(d)![s] || 0),
      })),
    };
  }

  getRoomUsage(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -30).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
      roomId,
    } = params;

    const rooms = roomId
      ? [roomRepository.findById(roomId)].filter(Boolean)
      : roomRepository.findAll();

    return rooms.map((room) => {
      const stats = roomRepository.getRoomUsageStats(room!.id, startDate, endDate);
      const availableHours = 30 * 12;
      const averageUsageRate = availableHours > 0 ? Math.round((stats.totalHours / availableHours) * 100) : 0;
      return {
        roomId: room!.id,
        roomName: room!.name,
        bookingCount: stats.totalBookings,
        usageHours: stats.totalHours,
        averageUsageRate,
      };
    });
  }

  getWorkOrderStats(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -30).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
    } = params;

    return workOrderRepository.getStatsByStatus(startDate, endDate);
  }

  getMaintenanceStats(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -30).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
    } = params;

    return maintenanceRepository.getStatsByStatus(startDate, endDate);
  }

  getCreditStats(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -30).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
    } = params;

    const records = creditRepository.findBetweenDates(startDate, endDate);
    const changes = records.reduce(
      (acc, r) => {
      acc.total += r.change;
      if (r.change > 0) acc.positive += r.change;
      else acc.negative += Math.abs(r.change);
      return acc;
    },
      { total: 0, positive: 0, negative: 0 },
    );

    return {
      totalRecords: records.length,
      netChange: changes.total,
      positive: changes.positive,
      negative: changes.negative,
      distribution: creditRepository.getCreditDistribution(),
      topDeducted: creditRepository.getTopDeductedUsers(startDate, endDate, 5),
    };
  }

  getDeviceFaultRanking(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -30).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
      limit = 10,
    } = params;

    const workOrders = workOrderRepository.findBetweenDates(startDate, endDate);
    const deviceMap = new Map<string, {
      deviceId: string;
      deviceName: string;
      faultCount: number;
      totalRepairHours: number;
      repairCount: number;
    }>();

    const devices = deviceRepository.findAll();

    workOrders.forEach((wo) => {
      const device = devices.find((d) => d.id === wo.deviceId);
      if (!device) return;
      const existing = deviceMap.get(wo.deviceId) || {
        deviceId: wo.deviceId,
        deviceName: device.name,
        faultCount: 0,
        totalRepairHours: 0,
        repairCount: 0,
      };
      existing.faultCount++;
      if (wo.status === 'completed' && wo.completedAt) {
        const hours =
          (new Date(wo.completedAt).getTime() - new Date(wo.createdAt).getTime()) / 3600000;
        existing.totalRepairHours += hours;
        existing.repairCount++;
      }
      deviceMap.set(wo.deviceId, existing);
    });

    const result = Array.from(deviceMap.values())
      .map((item) => {
        const device = devices.find((d) => d.id === item.deviceId);
        return {
          deviceId: item.deviceId,
          deviceName: item.deviceName,
          deviceType: device?.type || 'other',
          faultCount: item.faultCount,
          avgRepairTime: item.repairCount > 0
            ? Math.round((item.totalRepairHours / item.repairCount) * 10) / 10
            : 0,
        };
      })
      .sort((a, b) => b.faultCount - a.faultCount)
      .slice(0, typeof limit === 'number' ? limit : parseInt(limit as string, 10));

    return result;
  }

  getTimeSlotDistribution(params: StatisticsQueryParams = {}) {
    const today = new Date();
    const {
      startDate = this.getStartOfDay(today, -30).toISOString(),
      endDate = this.getEndOfDay(today).toISOString(),
    } = params;

    const bookings = bookingRepository.findBetweenDates(startDate, endDate)
      .filter((b) => ['completed', 'locked'].includes(b.status));

    const hours = Array.from({ length: 12 }, (_, i) => i + 8);
    const totalDays = Math.max(
      1,
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const rooms = roomRepository.count();

    return hours.map((hour) => {
      const count = bookings.filter((b) => {
        const startHour = new Date(b.startTime).getHours();
        const endHour = new Date(b.endTime).getHours();
        return hour >= startHour && hour < endHour;
      }).length;
      const maxPossible = totalDays * rooms;
      const rate = maxPossible > 0 ? Math.round((count / maxPossible) * 100) : 0;
      return { hour, count, rate };
    });
  }

  private buildRoomUsageHeatmap(
    bookings: Array<{ startTime: string; endTime: string; roomId: string; status: string }>,
    rooms: Array<{ id: string }>,
  ): DailyReport['roomUsageHeatmap'] {
    const result: DailyReport['roomUsageHeatmap'] = [];
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);

    rooms.forEach((room) => {
      hours.forEach((hour) => {
        const hourBookings = bookings.filter((b) => {
          if (b.roomId !== room.id) return false;
          if (!['completed', 'locked'].includes(b.status)) return false;
          const startHour = new Date(b.startTime).getHours();
          const endHour = new Date(b.endTime).getHours();
          return hour >= startHour && hour < endHour;
        });

        result.push({
          roomId: room.id,
          hour,
          rate: hourBookings.length > 0 ? 1 : 0,
        });
      });
    });

    return result;
  }

  private getStartOfDay(date: Date, daysOffset: number = 0): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}

export const statisticsService = new StatisticsService();
export default statisticsService;
