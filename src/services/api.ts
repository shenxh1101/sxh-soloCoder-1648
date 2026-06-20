import type { ApiResponse } from '../types';
import { useAppStore } from '../store';

export const BASE_URL = '/api';

export interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

function getToken(): string | null {
  const token = useAppStore.getState().token;
  if (token) return token;
  return localStorage.getItem('token');
}

async function request<T>(url: string, config: RequestConfig = {}): Promise<T> {
  const { params, skipAuth, headers: customHeaders, ...rest } = config;

  let fullUrl = `${BASE_URL}${url}`;
  if (params && Object.keys(params).length > 0) {
    const query = buildQueryString(params);
    fullUrl += `?${query}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(fullUrl, {
      ...rest,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        useAppStore.getState().logout();
        window.location.href = '/login';
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as ApiResponse<T>;

    if (result.code !== 200 && result.code !== 0) {
      useAppStore.getState().addToast({
        type: 'error',
        message: result.message || '请求失败',
      });
      throw new Error(result.message || '请求失败');
    }

    return result.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'TypeError') {
      useAppStore.getState().addToast({
        type: 'error',
        message: '网络连接失败，请检查网络',
      });
    }
    throw error;
  }
}

export const api = {
  get: <T>(url: string, config?: RequestConfig) =>
    request<T>(url, { ...config, method: 'GET' }),

  post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>(url, {
      ...config,
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>(url, {
      ...config,
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string, config?: RequestConfig) =>
    request<T>(url, { ...config, method: 'DELETE' }),
};

export default api;
