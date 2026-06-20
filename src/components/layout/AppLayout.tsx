import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Toast from '../common/Toast';
import { useAppStore } from '../../store';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed, globalLoading } = useAppStore();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Topbar />

      <main
        className={`transition-all duration-300 pt-16 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>

      <Toast />

      {globalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-card-hover">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <span className="text-sm font-medium text-brand-700">加载中...</span>
          </div>
        </div>
      )}
    </div>
  );
}
