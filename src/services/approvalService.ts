import { api } from './api';
import type { Booking } from '../types';

export interface GetApprovalsQuery {
  page?: number;
  pageSize?: number;
  status?: 'pending_approval' | 'approved' | 'rejected';
}

export interface ApprovalDecision {
  comment?: string;
}

export interface ApprovalsListResponse {
  items: Booking[];
  total: number;
  page: number;
  pageSize: number;
}

export const approvalService = {
  getPendingApprovals: (params?: GetApprovalsQuery) =>
    api.get<ApprovalsListResponse>('/approvals/pending', { params }),

  getMyApprovalHistory: (params?: GetApprovalsQuery) =>
    api.get<ApprovalsListResponse>('/approvals/history', { params }),

  approve: (bookingId: string, data?: ApprovalDecision) =>
    api.post<Booking>(`/approvals/${bookingId}/approve`, data),

  reject: (bookingId: string, data?: ApprovalDecision) =>
    api.post<void>(`/approvals/${bookingId}/reject`, data),

  getApproval: (bookingId: string) => api.get<Booking>(`/approvals/${bookingId}`),
};

export default approvalService;
