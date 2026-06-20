import type {
  User,
  MeetingRoom,
  Device,
  Booking,
  WorkOrder,
  MaintenanceRecord,
  CreditRecord,
  Notification,
  BookingStatus,
  RoomStatus,
  DeviceStatus,
  DeviceType,
  WorkOrderStatus,
  MaintenanceType,
  MaintenanceStatus,
  UserRole,
  BookingConflict,
  DailyReport,
} from '../../shared/index.js';

export interface UserWithPassword extends User {
  password: string;
}

export interface AuthToken {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface LoginResult {
  user: User;
  token: string;
  expiresAt: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BookingWithRelations extends Booking {
  room?: MeetingRoom;
  user?: User;
  devices?: Device[];
}

export interface WorkOrderWithRelations extends WorkOrder {
  device?: Device;
  reporter?: User;
  assignee?: User;
}

export interface MaintenanceRecordWithRelations extends MaintenanceRecord {
  device?: Device;
  operator?: User;
}

export interface CreateBookingInput {
  roomId: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeCount: number;
  requiredDeviceIds?: string[];
}

export interface UpdateBookingInput extends Partial<CreateBookingInput> {
  status?: BookingStatus;
  checkInTime?: string;
  approvalManagerId?: string;
  approvalTime?: string;
  approvalComment?: string;
}

export interface CreateWorkOrderInput {
  deviceId: string;
  reporterId: string;
  faultType: string;
  description: string;
}

export interface UpdateWorkOrderInput {
  status?: WorkOrderStatus;
  assigneeId?: string;
  assignedAt?: string;
  completedAt?: string;
  confirmCode?: string;
  rating?: number;
}

export interface CreateDeviceInput {
  name: string;
  type: DeviceType;
  roomId?: string;
  status?: DeviceStatus;
  faultCount?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export interface UpdateDeviceInput extends Partial<CreateDeviceInput> {
  faultCount?: number;
}

export interface CreateRoomInput {
  name: string;
  floor: string;
  capacity: number;
  equipmentIds?: string[];
  status?: RoomStatus;
  image?: string;
  description?: string;
}

export interface UpdateRoomInput extends Partial<CreateRoomInput> {}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

export interface CreateMaintenanceInput {
  deviceId: string;
  scheduledDate: string;
  type: MaintenanceType;
  operatorId: string;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  completedDate?: string;
  status?: MaintenanceStatus;
  notes?: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  content: string;
}

export interface CreateCreditInput {
  userId: string;
  change: number;
  reason: string;
}

export interface StatisticsQueryParams {
  startDate?: string;
  endDate?: string;
  roomId?: string;
  limit?: number | string;
}

export type {
  User,
  MeetingRoom,
  Device,
  Booking,
  WorkOrder,
  MaintenanceRecord,
  CreditRecord,
  Notification,
  BookingStatus,
  RoomStatus,
  DeviceStatus,
  DeviceType,
  WorkOrderStatus,
  MaintenanceType,
  MaintenanceStatus,
  UserRole,
  BookingConflict,
  DailyReport,
};
