import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Booking from '@/pages/Booking';
import BookingDetail from '@/pages/BookingDetail';
import Approvals from '@/pages/Approvals';
import MeetingRoomManage from '@/pages/MeetingRoomManage';
import DeviceManage from '@/pages/DeviceManage';
import WorkOrders from '@/pages/WorkOrders';
import Statistics from '@/pages/Statistics';
import Profile from '@/pages/Profile';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<'employee' | 'manager' | 'admin'>;
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">无权访问</h2>
          <p className="text-slate-500 mb-6">您当前的角色没有权限访问此页面</p>
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['employee', 'manager', 'admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking"
          element={
            <ProtectedRoute roles={['employee', 'manager', 'admin']}>
              <Booking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/:id"
          element={
            <ProtectedRoute roles={['employee', 'manager', 'admin']}>
              <BookingDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute roles={['manager', 'admin']}>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting-rooms"
          element={
            <ProtectedRoute roles={['admin']}>
              <MeetingRoomManage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <ProtectedRoute roles={['admin']}>
              <DeviceManage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-orders"
          element={
            <ProtectedRoute roles={['employee', 'manager', 'admin']}>
              <WorkOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute roles={['manager', 'admin']}>
              <Statistics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={['employee', 'manager', 'admin']}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
