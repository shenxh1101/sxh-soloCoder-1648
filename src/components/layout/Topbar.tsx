import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  LogOut,
  UserCircle,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { roleLabel } from '../../utils';

export default function Topbar() {
  const { sidebarCollapsed, user, logout, addToast } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    addToast({ type: 'info', message: '已退出登录' });
    setShowUserMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasUnreadNotifications = true;

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 border-b border-brand-100 bg-white/80 backdrop-blur-xl transition-all duration-300 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
            <input
              type="text"
              placeholder="搜索会议室、设备、预订..."
              className="w-full rounded-xl border border-brand-100 bg-brand-50/50 py-2.5 pl-10 pr-4 text-sm text-brand-800 placeholder:text-brand-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-brand-600 hover:bg-brand-50 transition-colors"
            title="通知"
          >
            <Bell className="h-5 w-5" />
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
            )}
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 rounded-xl border border-brand-100 bg-white py-1.5 pl-1.5 pr-3 hover:border-brand-200 hover:bg-brand-50/50 transition-all shadow-card"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-semibold">
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-brand-800 leading-tight">
                  {user?.name ?? '未登录'}
                </p>
                <p className="text-[11px] text-brand-500 leading-tight">
                  {user?.role ? roleLabel(user.role) : ''}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-brand-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-brand-100 bg-white p-2 shadow-card-hover animate-fade-up">
                <div className="border-b border-brand-100 p-3">
                  <p className="text-sm font-semibold text-brand-800">{user?.name}</p>
                  <p className="text-xs text-brand-500">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UserCircle className="h-4 w-4" />
                    个人中心
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    设置
                  </button>
                </div>
                <div className="border-t border-brand-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-danger-500 hover:bg-danger-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
