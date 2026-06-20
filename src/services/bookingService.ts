import { api } from './api';
import type { Booking, BookingConflict } from '../types';
import type { ApiResult } from './api';

export interface CreateBookingRequest {
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeCount: number;
  requiredDeviceIds?: string[];
}

export interface GetBookingsQuery {
  page?: number;
  pageSize?: number;
  roomId?: string;
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface BookingsListResponse {
  items: Booking[];
  total: number;
  page: number;
  pageSize: number;
}

export const bookingService = {
  getBookings: (params?: GetBookingsQuery): Promise<ApiResult<BookingsListResponse>> =>
    api.get<BookingsListResponse>('/bookings', { params }),

  getBooking: (id: string): Promise<ApiResult<Booking>> =>
    api.get<Booking>(`/bookings/${id}`),

  createBooking: (data: CreateBookingRequest): Promise<ApiResult<Booking>> =>
    api.post<Booking>('/bookings', data),

  updateBooking: (id: string, data: Partial<CreateBookingRequest>): Promise<ApiResult<Booking>> =>
    api.put<Booking>(`/bookings/${id}`, data),

  cancelBooking: (id: string): Promise<ApiResult<void>> =>
    api.post<void>(`/bookings/${id}/cancel`),

  checkIn: (id: string): Promise<ApiResult<void>> =>
    api.post<void>(`/bookings/${id}/check-in`),

  release: (id: string): Promise<ApiResult<void>> =>
    api.post<void>(`/bookings/${id}/release`),

  checkConflicts: (data: Omit<CreateBookingRequest, 'title' | 'attendeeCount'>): Promise<ApiResult<BookingConflict[]>> =>
    api.post<BookingConflict[]>('/bookings/check-conflicts', data),

  getMyBookings: (params?: GetBookingsQuery): Promise<ApiResult<BookingsListResponse>> =>
    api.get<BookingsListResponse>('/bookings', {
      params: { ...(params || {}), mine: 'true' },
    }),
};

export default bookingService;
