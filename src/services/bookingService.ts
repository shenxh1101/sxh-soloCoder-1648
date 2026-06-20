import { api } from './api';
import type { Booking, BookingConflict } from '../types';

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
  getBookings: (params?: GetBookingsQuery) =>
    api.get<BookingsListResponse>('/bookings', { params }),

  getBooking: (id: string) => api.get<Booking>(`/bookings/${id}`),

  createBooking: (data: CreateBookingRequest) =>
    api.post<Booking>('/bookings', data),

  updateBooking: (id: string, data: Partial<CreateBookingRequest>) =>
    api.put<Booking>(`/bookings/${id}`, data),

  cancelBooking: (id: string) => api.post<void>(`/bookings/${id}/cancel`),

  checkIn: (id: string) => api.post<void>(`/bookings/${id}/check-in`),

  release: (id: string) => api.post<void>(`/bookings/${id}/release`),

  checkConflicts: (data: Omit<CreateBookingRequest, 'title' | 'attendeeCount'>) =>
    api.post<BookingConflict[]>('/bookings/check-conflicts', data),

  getMyBookings: (params?: GetBookingsQuery) =>
    api.get<BookingsListResponse>('/bookings', {
      params: { ...(params || {}), mine: 'true' },
    }),
};

export default bookingService;
