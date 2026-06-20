export type UserRole = 'employee' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  creditScore: number;
  avatar?: string;
}

export type RoomStatus = 'active' | 'maintenance' | 'disabled';

export interface MeetingRoom {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  equipmentIds: string[];
  status: RoomStatus;
  image?: string;
  description?: string;
}

export type DeviceType = 'projector' | 'whiteboard' | 'video-conference' | 'microphone' | 'other';
export type DeviceStatus = 'normal' | 'faulty' | 'maintenance';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId?: string;
  status: DeviceStatus;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  faultCount: number;
}

export type BookingStatus =
  | 'pending_approval'
  | 'locked'
  | 'completed'
  | 'released'
  | 'cancelled'
  | 'rejected';

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeCount: number;
  requiredDeviceIds: string[];
  status: BookingStatus;
  checkInTime?: string;
  approvalManagerId?: string;
  approvalTime?: string;
  approvalComment?: string;
  confirmationQr?: string;
  createdAt: string;
}

export type WorkOrderStatus =
  | 'pending'
  | 'assigned'
  | 'processing'
  | 'completed'
  | 'cancelled';

export interface WorkOrder {
  id: string;
  deviceId: string;
  reporterId: string;
  assigneeId?: string;
  faultType: string;
  description: string;
  status: WorkOrderStatus;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  confirmCode?: string;
  rating?: number;
}

export type MaintenanceType = 'preventive' | 'corrective';
export type MaintenanceStatus = 'scheduled' | 'completed' | 'overdue';

export interface MaintenanceRecord {
  id: string;
  deviceId: string;
  scheduledDate: string;
  completedDate?: string;
  type: MaintenanceType;
  operatorId: string;
  notes?: string;
  status: MaintenanceStatus;
}

export interface CreditRecord {
  id: string;
  userId: string;
  change: number;
  reason: string;
  createdAt: string;
  balanceAfter: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface DailyReport {
  date: string;
  totalRooms: number;
  totalBookings: number;
  completedBookings: number;
  releasedBookings: number;
  averageUsageRate: number;
  deviceFaultCount: number;
  deviceRepairRate: number;
  roomUsageHeatmap: { roomId: string; hour: number; rate: number }[];
  topOverusedRooms: { roomId: string; roomName: string; count: number }[];
}

export interface BookingConflict {
  type: 'time' | 'device';
  conflictingBookingId?: string;
  roomName?: string;
  deviceName?: string;
  suggestedAlternatives?: {
    roomId: string;
    roomName: string;
    availableSlots: { start: string; end: string }[];
  }[];
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
