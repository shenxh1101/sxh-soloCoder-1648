import type { UserRole, BookingStatus, DeviceStatus } from '../types';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function getWeekDates(date: string | Date = new Date()): Date[] {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dateItem = new Date(monday);
    dateItem.setDate(monday.getDate() + i);
    dates.push(dateItem);
  }
  return dates;
}

export function getDurationHours(startTime: string | Date, endTime: string | Date): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return 0;
  return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
}

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    employee: '普通员工',
    manager: '部门经理',
    admin: '系统管理员',
  };
  return map[role];
}

export function bookingStatusLabel(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    pending_approval: '待审批',
    locked: '已锁定',
    completed: '已完成',
    released: '已释放',
    cancelled: '已取消',
    rejected: '已驳回',
  };
  return map[status];
}

export function bookingStatusColor(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    locked: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    released: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return map[status];
}

export function deviceStatusLabel(status: DeviceStatus): string {
  const map: Record<DeviceStatus, string> = {
    normal: '正常',
    faulty: '故障',
    maintenance: '维护中',
  };
  return map[status];
}

export function deviceStatusColor(status: DeviceStatus): string {
  const map: Record<DeviceStatus, string> = {
    normal: 'bg-green-100 text-green-800 border-green-200',
    faulty: 'bg-red-100 text-red-800 border-red-200',
    maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  return map[status];
}

export function validateBookingTime(
  startTime: string | Date,
  endTime: string | Date,
): { valid: boolean; message?: string } {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

  if (isNaN(start.getTime())) {
    return { valid: false, message: '开始时间无效' };
  }
  if (isNaN(end.getTime())) {
    return { valid: false, message: '结束时间无效' };
  }

  const now = new Date();
  if (start < now) {
    return { valid: false, message: '开始时间不能早于当前时间' };
  }

  if (end <= start) {
    return { valid: false, message: '结束时间必须晚于开始时间' };
  }

  const duration = getDurationHours(start, end);
  if (duration > 8) {
    return { valid: false, message: '单次预订时长不能超过8小时' };
  }

  if (duration < 0.5) {
    return { valid: false, message: '单次预订时长不能少于30分钟' };
  }

  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email) {
    return { valid: false, message: '请输入邮箱地址' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }
  return { valid: true };
}

export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
