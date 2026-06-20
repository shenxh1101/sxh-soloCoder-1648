import { api } from './api';
import type { User } from '../types';

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
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data, { skipAuth: true }),

  register: (data: RegisterRequest) =>
    api.post<LoginResponse>('/auth/register', data, { skipAuth: true }),

  logout: () => api.post<void>('/auth/logout'),

  getCurrentUser: () => api.get<User>('/auth/me'),

  updateProfile: (data: Partial<User>) => api.put<User>('/auth/profile', data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post<void>('/auth/password', { oldPassword, newPassword }),
};

export default authService;
