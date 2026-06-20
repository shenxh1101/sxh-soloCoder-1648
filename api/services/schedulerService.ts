import cron from 'node-cron';
import { bookingService } from './bookingService.js';
import { workOrderService } from './workOrderService.js';
import { maintenanceRepository } from '../repository/maintenanceRepository.js';
import { notificationService } from './notificationService.js';
import { statisticsService } from './statisticsService.js';
import { userRepository } from '../repository/userRepository.js';

class SchedulerService {
  private jobs: Array<{ name: string; task: cron.ScheduledTask }> = [];
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.scheduleCheckInReminders();
    this.scheduleAutoRelease();
    this.scheduleDailyReport();
    this.scheduleMaintenanceOverdue();
    this.scheduleAutoAssignWorkOrders();

    console.log('[Scheduler] All scheduled jobs started');
  }

  stop(): void {
    this.jobs.forEach((j) => j.task.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('[Scheduler] All scheduled jobs stopped');
  }

  private scheduleCheckInReminders(): void {
    const task = cron.schedule('*/5 * * * *', () => {
      this.runCheckInReminders();
    });
    this.jobs.push({ name: 'checkInReminders', task });
    console.log('[Scheduler] Check-in reminders job scheduled (every 5 minutes)');
  }

  private scheduleAutoRelease(): void {
    const task = cron.schedule('*/10 * * * *', () => {
      this.runAutoRelease();
    });
    this.jobs.push({ name: 'autoRelease', task });
    console.log('[Scheduler] Auto-release job scheduled (every 10 minutes)');
  }

  private scheduleDailyReport(): void {
    const task = cron.schedule('0 0 0 * * *', () => {
      this.runDailyReport();
    });
    this.jobs.push({ name: 'dailyReport', task });
    console.log('[Scheduler] Daily report job scheduled (every day at 00:00)');
  }

  private scheduleMaintenanceOverdue(): void {
    const task = cron.schedule('0 0 1 * * *', () => {
      this.runMaintenanceOverdue();
    });
    this.jobs.push({ name: 'maintenanceOverdue', task });
    console.log('[Scheduler] Maintenance overdue job scheduled (every day at 01:00)');
  }

  private scheduleAutoAssignWorkOrders(): void {
    const task = cron.schedule('*/30 * * * *', () => {
      this.runAutoAssignWorkOrders();
    });
    this.jobs.push({ name: 'autoAssignWorkOrders', task });
    console.log('[Scheduler] Auto-assign work orders job scheduled (every 30 minutes)');
  }

  async runCheckInReminders(): Promise<void> {
    try {
      const upcoming = bookingService.findUpcomingBookings(30);
      upcoming.forEach((booking) => {
        notificationService.create({
          userId: booking.userId,
          type: 'booking',
          title: '预订即将开始',
          content: `您的会议室预订将在30分钟后开始，请准时签到。会议室：${booking.room?.name || '未知'}，时间：${new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      });
      if (upcoming.length > 0) {
        console.log(`[Scheduler] Sent ${upcoming.length} check-in reminders`);
      }
    } catch (err) {
      console.error('[Scheduler] Check-in reminders error:', err);
    }
  }

  async runAutoRelease(): Promise<void> {
    try {
      const overdue = bookingService.findOverdueCheckIns(15);
      let count = 0;
      overdue.forEach((booking) => {
        const result = bookingService.release(booking.id);
        if (result) count++;
      });
      if (count > 0) {
        console.log(`[Scheduler] Auto-released ${count} bookings`);
      }
    } catch (err) {
      console.error('[Scheduler] Auto-release error:', err);
    }
  }

  async runDailyReport(): Promise<void> {
    try {
      const report = statisticsService.getDailyReport();
      const admins = userRepository.findManagers();

      const summary = this.formatDailyReport(report);

      admins.forEach((admin) => {
        notificationService.create({
          userId: admin.id,
          type: 'system',
          title: '每日运营简报',
          content: summary,
        });
      });

      console.log('[Scheduler] Daily report generated and sent');
    } catch (err) {
        console.error('[Scheduler] Daily report error:', err);
      }
    }

  async runMaintenanceOverdue(): Promise<void> {
    try {
      const count = maintenanceRepository.markOverdue();
      const overdue = maintenanceRepository.findByStatus('overdue');
      const admins = userRepository.findManagers();

      if (overdue.length > 0) {
        admins.forEach((admin) => {
          notificationService.create({
            userId: admin.id,
            type: 'system',
            title: '维护任务逾期提醒',
            content: `当前有 ${overdue.length} 条维护任务已逾期，请及时处理。`,
          });
        });
      }
      if (count > 0) {
        console.log(`[Scheduler] Marked ${count} maintenance records as overdue`);
      }
    } catch (err) {
      console.error('[Scheduler] Maintenance overdue error:', err);
    }
  }

  async runAutoAssignWorkOrders(): Promise<void> {
    try {
      const count = workOrderService.autoAssignAllPending();
      if (count > 0) {
        console.log(`[Scheduler] Auto-assigned ${count} pending work orders`);
      }
    } catch (err) {
      console.error('[Scheduler] Auto-assign work orders error:', err);
    }
  }

  runAllNow(): void {
    console.log('[Scheduler] Running all jobs manually...');
    this.runCheckInReminders();
    this.runAutoRelease();
    this.runAutoAssignWorkOrders();
  }

  private formatDailyReport(report: ReturnType<typeof statisticsService.getDailyReport>): string {
    return (
      `日期：${report.date}\n` +
      `总会议室数：${report.totalRooms}\n` +
      `预订总数：${report.totalBookings}\n` +
      `  - 已完成：${report.completedBookings}\n` +
      `  - 已释放：${report.releasedBookings}\n` +
      `平均使用率：${report.averageUsageRate}%\n` +
      `设备故障数：${report.deviceFaultCount}\n` +
      `维修完成率：${report.deviceRepairRate}%`
    );
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;
