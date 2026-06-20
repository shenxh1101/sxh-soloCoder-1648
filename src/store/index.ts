import { create } from 'zustand';
import type { User } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface AuthSlice {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | Partial<User>) => void;
  updateCreditScore: (newScore: number) => void;
}

interface UiSlice {
  sidebarCollapsed: boolean;
  toasts: ToastMessage[];
  globalLoading: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setGlobalLoading: (loading: boolean) => void;
}

export type AppStore = AuthSlice & UiSlice;

const mockUser: User = {
  id: 'user-001',
  name: '张三',
  email: 'zhangsan@example.com',
  role: 'admin',
  department: '信息技术部',
  creditScore: 95,
  avatar: undefined,
};

const createAuthSlice = (): AuthSlice => ({
  user: mockUser,
  token: 'mock-jwt-token-for-preview',
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    useAppStore.setState({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    useAppStore.setState({ user: null, token: null });
  },
  setUser: (nextUser) => {
    useAppStore.setState((state) => {
      if (!state.user) return { user: state.user };
      const isFullUpdate = 'id' in nextUser && 'name' in nextUser;
      return {
        user: isFullUpdate
          ? { ...(nextUser as User) }
          : { ...state.user, ...nextUser },
      };
    });
  },
  updateCreditScore: (newScore) => {
    useAppStore.setState((state) => {
      if (!state.user) return { user: state.user };
      return {
        user: { ...state.user, creditScore: newScore },
      };
    });
  },
});

const createUiSlice = (): UiSlice => ({
  sidebarCollapsed: false,
  toasts: [],
  globalLoading: false,
  toggleSidebar: () => {
    useAppStore.setState((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
  setSidebarCollapsed: (collapsed) => {
    useAppStore.setState({ sidebarCollapsed: collapsed });
  },
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast = { ...toast, id, duration: toast.duration ?? 3000 };
    useAppStore.setState((state) => ({ toasts: [...state.toasts, newToast] }));
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        useAppStore.getState().removeToast(id);
      }, newToast.duration);
    }
  },
  removeToast: (id) => {
    useAppStore.setState((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => {
    useAppStore.setState({ toasts: [] });
  },
  setGlobalLoading: (loading) => {
    useAppStore.setState({ globalLoading: loading });
  },
});

export const useAppStore = create<AppStore>((...args) => ({
  ...createAuthSlice(),
  ...createUiSlice(),
}));

export const useAuth = () => {
  const { user, token, login, logout, setUser, updateCreditScore } = useAppStore();
  return { user, token, login, logout, setUser, updateCreditScore };
};

export const useUi = () => {
  const {
    sidebarCollapsed,
    toasts,
    globalLoading,
    toggleSidebar,
    setSidebarCollapsed,
    addToast,
    removeToast,
    clearToasts,
    setGlobalLoading,
  } = useAppStore();
  return {
    sidebarCollapsed,
    toasts,
    globalLoading,
    toggleSidebar,
    setSidebarCollapsed,
    addToast,
    removeToast,
    clearToasts,
    setGlobalLoading,
  };
};
