import type { ApiResponse } from '../types';
import { useAppStore } from '../store';

export const BASE_URL = '/api';

export interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message?: string;
  conflicts?: any[];
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

async function request<T>(url: string, config: RequestConfig = {}): Promise<ApiResult<T>> {
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

    if (response.status === 401) {
      useAppStore.getState().logout();
      window.location.href = '/login';
      return {
        ok: false,
        status: 401,
        data: null,
        message: '未授权，请重新登录',
      };
    }

    let parsed: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        parsed = await response.json();
      } catch {
        parsed = null;
      }
    }

    if (response.ok) {
      const result = parsed as ApiResponse<T>;
      if (result && (result.code === 200 || result.code === 0)) {
        return {
          ok: true,
          status: response.status,
          data: result.data,
        };
      } else {
        return {
          ok: false,
          status: 200,
          data: null,
          message: result?.message || '请求失败',
        };
      }
    }

    if (response.status === 403) {
      return {
        ok: false,
        status: 403,
        data: null,
        message: parsed?.message || '权限不足',
      };
    }

    if (response.status === 409) {
      return {
        ok: false,
        status: 409,
        data: null,
        conflicts: parsed?.conflicts || (parsed?.data?.conflicts ? parsed.data.conflicts : (parsed?.data ? [parsed.data] : undefined)),
        message: parsed?.message || '存在冲突',
      };
    }

    return {
      ok: false,
      status: response.status,
      data: null,
      message: '服务器错误',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TypeError') {
      return {
        ok: false,
        status: 0,
        data: null,
        message: '网络连接失败',
      };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      message: error instanceof Error ? error.message : '请求异常',
    };
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
