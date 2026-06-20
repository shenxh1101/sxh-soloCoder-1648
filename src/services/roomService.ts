import { api } from './api';
import type { MeetingRoom, RoomStatus } from '../types';
import type { ApiResult } from './api';

export interface CreateRoomRequest {
  name: string;
  floor: string;
  capacity: number;
  equipmentIds?: string[];
  image?: string;
  description?: string;
}

export interface GetRoomsQuery {
  page?: number;
  pageSize?: number;
  status?: RoomStatus;
  floor?: string;
  capacity?: number;
  search?: string;
  startTime?: string;
  endTime?: string;
}

export interface RoomsListResponse {
  items: MeetingRoom[];
  total: number;
  page: number;
  pageSize: number;
}

export const roomService = {
  getRooms: (params?: GetRoomsQuery): Promise<ApiResult<RoomsListResponse>> =>
    api.get<RoomsListResponse>('/rooms', { params }),

  getRoom: (id: string): Promise<ApiResult<MeetingRoom>> =>
    api.get<MeetingRoom>(`/rooms/${id}`),

  createRoom: (data: CreateRoomRequest): Promise<ApiResult<MeetingRoom>> =>
    api.post<MeetingRoom>('/rooms', data),

  updateRoom: (id: string, data: Partial<CreateRoomRequest>): Promise<ApiResult<MeetingRoom>> =>
    api.put<MeetingRoom>(`/rooms/${id}`, data),

  deleteRoom: (id: string): Promise<ApiResult<void>> =>
    api.delete<void>(`/rooms/${id}`),

  updateRoomStatus: (id: string, status: RoomStatus): Promise<ApiResult<MeetingRoom>> =>
    api.patch<MeetingRoom>(`/rooms/${id}/status`, { status }),

  getAvailableRooms: (startTime: string, endTime: string): Promise<ApiResult<MeetingRoom[]>> =>
    api.get<MeetingRoom[]>('/rooms/available', {
      params: { startTime, endTime },
    }),
};

export default roomService;
