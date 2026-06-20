import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Building2,
  Cpu,
  Wrench,
  BarChart3,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../store';
import type { UserRole } from '../../types';
import { roleLabel } from '../../utils';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] },
  { path: '/bookings', label: '预订管理', icon: Calendar, roles: ['employee', 'manager', 'admin'] },
  { path: '/approvals', label: '审批管理', icon: ClipboardCheck, roles: ['manager', 'admin'] },
  { path: '/rooms', label: '会议室', icon: Building2, roles: ['employee', 'manager', 'admin'] },
  { path: '/devices', label: '设备管理', icon: Cpu, roles: ['admin'] },
  { path: '/work-orders', label: '报修工单', icon: Wrench, roles: ['employee', 'manager', 'admin'] },
  { path: '/statistics', label: '统计分析', icon: BarChart3, roles: ['manager', 'admin'] },
  { path: '/profile', label: '个人中心', icon: UserCircle, roles: ['employee', 'manager', 'admin'] },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, user } = useAppStore();
  const userRole = user?.role ?? 'employee';

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-brand-100 bg-white/90 backdrop-blur-xl transition-all duration-300 shadow-card ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-brand-100 px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-700 leading-tight">MeetingHub</p>
              <p className="text-[11px] text-brand-500">会议室管理</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <Building2 className="h-5 w-5" />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-card'
                    : 'text-brand-700 hover:bg-brand-50 hover:text-brand-800'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {!sidebarCollapsed && user && (
        <div className="border-t border-brand-100 p-4">
          <div className="rounded-xl bg-brand-50/50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-800">{user.name}</p>
                <p className="truncate text-xs text-brand-500">{roleLabel(user.role)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={toggleSidebar}
        className="flex h-12 items-center justify-center border-t border-brand-100 text-brand-500 hover:bg-brand-50 hover:text-brand-700 transition-colors"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>
    </aside>
  );
}
