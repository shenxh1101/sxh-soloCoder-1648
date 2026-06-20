import { api } from './api';
import type { User } from '../types';
import type { ApiResult } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  department: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: (data: LoginRequest): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>('/auth/login', data, { skipAuth: true }),

  register: (data: RegisterRequest): Promise<ApiResult<LoginResponse>> =>
    api.post<LoginResponse>('/auth/register', data, { skipAuth: true }),

  logout: (): Promise<ApiResult<void>> =>
    api.post<void>('/auth/logout'),

  getCurrentUser: (): Promise<ApiResult<User>> =>
    api.get<User>('/auth/me'),

  updateProfile: (data: Partial<User>): Promise<ApiResult<User>> =>
    api.put<User>('/auth/profile', data),

  changePassword: (oldPassword: string, newPassword: string): Promise<ApiResult<void>> =>
    api.post<void>('/auth/password', { oldPassword, newPassword }),
};

export default authService;
