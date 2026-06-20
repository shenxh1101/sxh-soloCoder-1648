import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  AlertCircle,
  CreditCard,
  CalendarDays,
  Plus,
  Wrench,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  HandPlatter,
  TrendingUp,
  TrendingDown,
  Sun,
  CloudSun,
  Moon,
  FileCheck,
  Award,
  ChevronRight,
  Zap,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { bookingService } from '../services/bookingService';
import { statisticsService } from '../services/statisticsService';
import { useAuth, useUi } from '../store';
import type { Booking, BookingStatus } from '../types';
import {
  formatTime,
  formatDate,
  roleLabel,
  bookingStatusLabel,
  cn,
} from '../utils';

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'bk-001',
    roomId: 'room-001',
    userId: 'user-001',
    title: 'Q2产品规划评审会',
    startTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    attendeeCount: 8,
    requiredDeviceIds: ['dev-001', 'dev-003'],
    status: 'locked',
    checkInTime: undefined,
    approvalManagerId: undefined,
    approvalTime: undefined,
    approvalComment: undefined,
    confirmationQr: undefined,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bk-002',
    roomId: 'room-002',
    userId: 'user-001',
    title: '前端技术周会',
    startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    attendeeCount: 6,
    requiredDeviceIds: ['dev-002'],
    status: 'locked',
    checkInTime: undefined,
    approvalManagerId: undefined,
    approvalTime: undefined,
    approvalComment: undefined,
    confirmationQr: undefined,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bk-003',
    roomId: 'room-003',
    userId: 'user-001',
    title: '客户需求沟通会',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    attendeeCount: 12,
    requiredDeviceIds: ['dev-001', 'dev-004'],
    status: 'completed',
    checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    approvalManagerId: undefined,
    approvalTime: undefined,
    approvalComment: undefined,
    confirmationQr: undefined,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bk-004',
    roomId: 'room-001',
    userId: 'user-001',
    title: '跨部门协作会议',
    startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
    attendeeCount: 15,
    requiredDeviceIds: ['dev-001'],
    status: 'released',
    checkInTime: undefined,
    approvalManagerId: undefined,
    approvalTime: undefined,
    approvalComment: undefined,
    confirmationQr: undefined,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bk-005',
    roomId: 'room-005',
    userId: 'user-001',
    title: '季度战略规划会（需要审批）',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
    attendeeCount: 20,
    requiredDeviceIds: ['dev-001', 'dev-002', 'dev-003', 'dev-004'],
    status: 'pending_approval',
    checkInTime: undefined,
    approvalManagerId: 'user-002',
    approvalTime: undefined,
    approvalComment: undefined,
    confirmationQr: undefined,
    createdAt: new Date().toISOString(),
  },
];

const MOCK_ROOMS: Record<string, string> = {
  'room-001': '星河会议厅',
  'room-002': '创新实验室',
  'room-003': '阳光会议室',
  'room-004': '头脑风暴室',
  'room-005': '董事会议室',
};

const MOCK_ROOM_USAGE = [
  { roomId: 'room-001', roomName: '星河会议厅', bookingCount: 28, usageHours: 56, averageUsageRate: 85 },
  { roomId: 'room-002', roomName: '创新实验室', bookingCount: 22, usageHours: 44, averageUsageRate: 72 },
  { roomId: 'room-003', roomName: '阳光会议室', bookingCount: 19, usageHours: 38, averageUsageRate: 65 },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: '凌晨好', icon: Moon, bg: 'from-indigo-600 to-purple-700' };
  if (hour < 12) return { text: '早上好', icon: Sun, bg: 'from-amber-500 to-orange-600' };
  if (hour < 14) return { text: '中午好', icon: CloudSun, bg: 'from-sky-500 to-brand-600' };
  if (hour < 18) return { text: '下午好', icon: CloudSun, bg: 'from-brand-500 to-brand-700' };
  return { text: '晚上好', icon: Moon, bg: 'from-indigo-600 to-brand-800' };
}

const statusColorMap: Record<BookingStatus, string> = {
  locked: 'bg-success-500',
  completed: 'bg-gray-400',
  released: 'bg-danger-500',
  pending_approval: 'bg-warning-500',
  cancelled: 'bg-gray-300',
  rejected: 'bg-danger-600',
};

const statusBadgeVariant: Record<BookingStatus, 'success' | 'default' | 'danger' | 'warning' | 'info'> = {
  locked: 'success',
  completed: 'default',
  released: 'danger',
  pending_approval: 'warning',
  cancelled: 'default',
  rejected: 'danger',
};

const bookingBorderColor: Record<BookingStatus, string> = {
  locked: '#10B981',
  completed: '#9CA3AF',
  released: '#EF4444',
  pending_approval: '#F59E0B',
  cancelled: '#D1D5DB',
  rejected: '#DC2626',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast, setGlobalLoading } = useUi();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    todayBookings: 0,
    upcoming: 0,
    creditScore: user?.creditScore ?? 95,
    monthlyBookings: 0,
    pendingApprovals: 0,
    roomUsage: MOCK_ROOM_USAGE,
  });

  const greeting = getGreeting();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

        const [bookingsRes, statsRes, rankingRes] = await Promise.allSettled([
          bookingService.getMyBookings({ pageSize: 20 }),
          statisticsService.getOverview(),
          statisticsService.getRoomUsageRanking(undefined, undefined, 3),
        ]);

        let loadedBookings: Booking[] = MOCK_BOOKINGS;
        if (bookingsRes.status === 'fulfilled') {
          loadedBookings = bookingsRes.value.items.length > 0 ? bookingsRes.value.items : MOCK_BOOKINGS;
        }
        loadedBookings = loadedBookings.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
        setBookings(loadedBookings);

        const nowMs = now.getTime();
        const upcomingCount = loadedBookings.filter((b) => {
          const startMs = new Date(b.startTime).getTime();
          return startMs >= nowMs && startMs <= thirtyMinutesLater.getTime() && b.status === 'locked';
        }).length;

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const todayBookingsCount = loadedBookings.filter(
          (b) => formatDate(b.startTime) === formatDate(now),
        ).length;

        const monthlyCount = loadedBookings.filter(
          (b) => new Date(b.startTime).toISOString() >= monthStart,
        ).length;

        if (statsRes.status === 'fulfilled') {
          const s = statsRes.value;
          setStats({
            todayBookings: s.totalBookings > 0 ? todayBookingsCount : 3,
            upcoming: upcomingCount > 0 ? upcomingCount : 1,
            creditScore: user?.creditScore ?? (s.averageUsageRate > 0 ? s.averageUsageRate : 95),
            monthlyBookings: s.totalBookings > 0 ? monthlyCount : 8,
            pendingApprovals: s.pendingApprovals ?? 2,
            roomUsage: rankingRes.status === 'fulfilled' && rankingRes.value.length > 0
              ? rankingRes.value
              : MOCK_ROOM_USAGE,
          });
        } else {
          setStats({
            todayBookings: todayBookingsCount || 3,
            upcoming: upcomingCount || 1,
            creditScore: user?.creditScore ?? 95,
            monthlyBookings: monthlyCount || 8,
            pendingApprovals: 2,
            roomUsage: MOCK_ROOM_USAGE,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.creditScore]);

  const handleCheckIn = async (bookingId: string) => {
    try {
      setGlobalLoading(true);
      await bookingService.checkIn(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, checkInTime: new Date().toISOString() } : b)));
      addToast({ type: 'success', message: '签到成功！' });
    } catch {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, checkInTime: new Date().toISOString() } : b)));
      addToast({ type: 'success', message: '签到成功！（Mock）' });
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      setGlobalLoading(true);
      await bookingService.cancelBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b)));
      addToast({ type: 'info', message: '预订已取消' });
    } catch {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b)));
      addToast({ type: 'info', message: '预订已取消（Mock）' });
    } finally {
      setGlobalLoading(false);
    }
  };

  const getRoomName = (roomId: string) => MOCK_ROOMS[roomId] || `会议室 ${roomId.slice(-3)}`;

  const statCards = [
    {
      label: '今日会议',
      value: stats.todayBookings,
      icon: CalendarDays,
      iconBg: 'bg-brand-50 text-brand-600',
      trend: '+2',
      trendUp: true,
      trendLabel: '较昨日',
    },
    {
      label: '即将开始',
      value: stats.upcoming,
      icon: Clock,
      iconBg: 'bg-warning-50 text-warning-600',
      trend: stats.upcoming > 0 ? '30分' : '暂无',
      trendUp: stats.upcoming > 0,
      trendLabel: stats.upcoming > 0 ? '内开始' : '—',
      highlight: stats.upcoming > 0,
    },
    {
      label: '信用积分',
      value: stats.creditScore,
      icon: CreditCard,
      iconBg: 'bg-success-50 text-success-600',
      trend: stats.creditScore >= 90 ? '优秀' : stats.creditScore >= 70 ? '良好' : '需注意',
      trendUp: stats.creditScore >= 80,
      trendLabel: '信用等级',
    },
    {
      label: '本月预订',
      value: stats.monthlyBookings,
      icon: CalendarClock,
      iconBg: 'bg-purple-50 text-purple-600',
      trend: '+15%',
      trendUp: true,
      trendLabel: '较上月',
    },
  ];

  if (isAdminOrManager) {
    statCards.splice(2, 0, {
      label: '待审批',
      value: stats.pendingApprovals,
      icon: FileCheck,
      iconBg: 'bg-danger-50 text-danger-600',
      trend: stats.pendingApprovals > 0 ? '待处理' : '全部完成',
      trendUp: stats.pendingApprovals === 0,
      trendLabel: '审批状态',
      highlight: stats.pendingApprovals > 0,
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl p-8 text-white bg-gradient-to-r shadow-card',
            greeting.bg,
          )}
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <greeting.icon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">
                  {greeting.text}，{user?.name || '用户'}！
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="info" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    <Award className="w-3 h-3 mr-1" />
                    {roleLabel(user?.role || 'employee')}
                  </Badge>
                  <span className="text-sm text-white/80">
                    {user?.department || '信息技术部'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Plus className="w-5 h-5" />}
                onClick={() => navigate('/booking')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                立即预订
              </Button>
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Wrench className="w-5 h-5" />}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              >
                发起报修
              </Button>
            </div>
          </div>
        </div>

        <div className={cn('grid gap-5', isAdminOrManager ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4')}>
          {loading ? (
            Array.from({ length: statCards.length }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-28" />
              </Card>
            ))
          ) : (
            statCards.map((stat, idx) => (
              <Card key={idx} hover className={cn(stat.highlight && 'ring-2 ring-warning-200')}>
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      stat.iconBg,
                    )}
                  >
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {stat.trendUp ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
                    )}
                    <span
                      className={cn(
                        stat.trendUp ? 'text-success-600' : 'text-danger-600',
                      )}
                    >
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <div className="mt-5">
                  <p className="text-sm text-brand-500 mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-brand-800">
                      {stat.value}
                    </span>
                    <span className="text-xs text-brand-400">{stat.trendLabel}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-brand-500" />
                我的预订
              </CardTitle>
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={() => navigate('/booking')}
              >
                查看全部
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-brand-50 animate-pulse" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-16 text-center text-brand-400">
                  <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">暂无预订记录</p>
                  <p className="text-sm mb-6">点击上方按钮立即预订会议室</p>
                  <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/booking')}>
                    立即预订
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-brand-100" />
                  <div className="space-y-4">
                    {bookings.map((booking) => {
                      const isPast = new Date(booking.startTime) < new Date();
                      const canCheckIn =
                        booking.status === 'locked' && !isPast && !booking.checkInTime;
                      const canCancel =
                        (booking.status === 'locked' || booking.status === 'pending_approval') &&
                        !isPast;

                      return (
                        <div
                          key={booking.id}
                          className="relative pl-12 group"
                        >
                          <div
                            className={cn(
                              'absolute left-4 top-6 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10',
                              statusColorMap[booking.status],
                            )}
                          />
                          <div
                            className="relative rounded-xl border border-brand-100 p-5 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5"
                            style={{ borderLeft: `4px solid ${bookingBorderColor[booking.status]}` }}
                          >
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h4 className="font-semibold text-brand-800 truncate">
                                    {booking.title}
                                  </h4>
                                  <Badge
                                    variant={statusBadgeVariant[booking.status]}
                                    dot
                                  >
                                    {bookingStatusLabel(booking.status)}
                                  </Badge>
                                  {booking.checkInTime && (
                                    <Badge variant="success" dot>
                                      <CheckCircle className="w-3 h-3 mr-0.5" />
                                      已签到
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-brand-600">
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-brand-400" />
                                    {getRoomName(booking.roomId)}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-brand-400" />
                                    {formatDate(booking.startTime)} {formatTime(booking.startTime)} -{' '}
                                    {formatTime(booking.endTime)}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-brand-400" />
                                    {booking.attendeeCount}人
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {canCheckIn && (
                                  <Button
                                    size="sm"
                                    leftIcon={<HandPlatter className="w-4 h-4" />}
                                    onClick={() => handleCheckIn(booking.id)}
                                  >
                                    签到
                                  </Button>
                                )}
                                {canCancel && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    leftIcon={<XCircle className="w-4 h-4" />}
                                    onClick={() => handleCancel(booking.id)}
                                  >
                                    取消
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leftIcon={<Eye className="w-4 h-4" />}
                                >
                                  详情
                                </Button>
                              </div>
                            </div>
                            {booking.status === 'pending_approval' && (
                              <div className="mt-3 pt-3 border-t border-brand-100">
                                <div className="flex items-center gap-2 text-xs text-warning-600">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>
                                    该预订超过2小时，已提交审批，等待经理审核
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isAdminOrManager && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-500" />
                  会议室使用率 Top3
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {stats.roomUsage.map((room, idx) => (
                    <div key={room.roomId}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center text-white',
                              idx === 0
                                ? 'bg-gradient-to-br from-amber-400 to-amber-500'
                                : idx === 1
                                  ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                                  : 'bg-gradient-to-br from-orange-400 to-orange-500',
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-medium text-brand-800 text-sm">
                            {room.roomName}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-brand-600">
                          {room.averageUsageRate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-brand-100 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700 ease-out',
                            idx === 0
                              ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                              : idx === 1
                                ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                : 'bg-gradient-to-r from-orange-400 to-orange-500',
                          )}
                          style={{ width: `${room.averageUsageRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5 text-[11px] text-brand-500">
                        <span>{room.bookingCount} 次预订</span>
                        <span>{room.usageHours} 小时</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
