import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Monitor,
  UserCheck,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  RefreshCw,
  MapPinned,
  Building,
  CalendarClock,
  Hash,
  UserCircle,
  Timer,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { useAppStore } from '@/store';
import { bookingService } from '@/services/bookingService';
import { deviceService } from '@/services/deviceService';
import {
  bookingStatusLabel,
  formatDate,
  formatTime,
  formatDateTime,
  getDurationHours,
} from '@/utils';
import { cn } from '@/utils';
import type { BookingStatus, Booking } from '@/types';

interface RequiredDevice {
  id: string;
  name: string;
}

interface EnrichedBooking extends Omit<Booking, 'startTime' | 'endTime' | 'createdAt' | 'approvalTime'> {
  roomName?: string;
  floor?: string;
  capacity?: number;
  userName?: string;
  approvalManagerName?: string;
  requiredDevices: RequiredDevice[];
  startTime: Date;
  endTime: Date;
  createdAt: Date | null;
  approvalTime: Date | null;
}

function QRCodeSVG({ value, size = 180 }: { value: string; size?: number }) {
  const gridSize = 25;
  const cellSize = size / gridSize;

  const pattern = useMemo(() => {
    const cells: boolean[][] = [];
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    const rand = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    };
    const rng = rand(hash || 12345);
    for (let y = 0; y < gridSize; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < gridSize; x++) {
        const isFinder =
          (x < 7 && y < 7) ||
          (x >= gridSize - 7 && y < 7) ||
          (x < 7 && y >= gridSize - 7);
        if (isFinder) {
          const fx = x >= gridSize - 7 ? x - (gridSize - 7) : x;
          const fy = y >= gridSize - 7 ? y - (gridSize - 7) : y;
          const isBorder = fx === 0 || fx === 6 || fy === 0 || fy === 6;
          const isCenter = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
          row.push(isBorder || isCenter);
        } else if (
          (x < 8 && y < 8) ||
          (x >= gridSize - 8 && y < 8) ||
          (x < 8 && y >= gridSize - 8)
        ) {
          row.push(false);
        } else {
          row.push(rng() > 0.5);
        }
      }
      cells.push(row);
    }
    return cells;
  }, [value]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect width={size} height={size} fill="#fff" rx={8} />
      {pattern.map((row, y) =>
        row.map((filled, x) =>
          filled ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0F1F33"
              rx={cellSize * 0.2}
            />
          ) : null,
        ),
      )}
      <rect
        x={size / 2 - 18}
        y={size / 2 - 18}
        width={36}
        height={36}
        fill="#fff"
        rx={6}
      />
      <rect
        x={size / 2 - 12}
        y={size / 2 - 12}
        width={24}
        height={24}
        fill="#2E5FA6"
        rx={4}
      />
      <path
        d={`M ${size / 2 - 5} ${size / 2} L ${size / 2 - 1} ${size / 2 + 4} L ${size / 2 + 6} ${size / 2 - 3}`}
        stroke="#fff"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const statusBadgeVariant: Record<BookingStatus, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  locked: 'info',
  pending_approval: 'warning',
  completed: 'success',
  released: 'default',
  cancelled: 'danger',
  rejected: 'danger',
};

const statusGradient: Record<BookingStatus, string> = {
  locked: 'from-brand-500 to-brand-600',
  pending_approval: 'from-warning-500 to-warning-600',
  completed: 'from-success-500 to-success-600',
  released: 'from-gray-400 to-gray-500',
  cancelled: 'from-danger-500 to-danger-600',
  rejected: 'from-danger-500 to-danger-600',
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useAppStore();
  const [booking, setBooking] = useState<EnrichedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const reloadBooking = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await bookingService.getBooking(id);
    if (!(result.ok && result.data)) {
      setBooking(null);
      setLoading(false);
      return;
    }

    const raw = result.data;
    let requiredDevices: RequiredDevice[] = [];
    const resultAny = raw as any;

    if (Array.isArray(resultAny.requiredDevices) && resultAny.requiredDevices.length > 0) {
      requiredDevices = resultAny.requiredDevices.map((d: any) => ({
        id: d.id,
        name: d.name,
      }));
    } else if (Array.isArray(raw.requiredDeviceIds) && raw.requiredDeviceIds.length > 0) {
      const deviceResp = await deviceService.getDevices({ pageSize: 100 });
      const deviceMap = new Map<string, string>();
      if (deviceResp.ok && deviceResp.data) {
        deviceResp.data.items.forEach((d) => {
          deviceMap.set(d.id, d.name);
        });
      }
      requiredDevices = raw.requiredDeviceIds.map((did) => ({
        id: did,
        name: deviceMap.get(did) || did,
      }));
    }

    const enrichedBooking: EnrichedBooking = {
      ...raw,
      roomName: resultAny.roomName,
      floor: resultAny.floor,
      capacity: resultAny.capacity,
      userName: resultAny.userName,
      approvalManagerName: resultAny.approvalManagerName,
      requiredDevices,
      startTime: new Date(raw.startTime),
      endTime: new Date(raw.endTime),
      createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
      approvalTime: raw.approvalTime ? new Date(raw.approvalTime) : null,
    };
    setBooking(enrichedBooking);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reloadBooking();
  }, [reloadBooking]);

  const handleCheckIn = async () => {
    if (!id) return;
    setActionLoading(true);
    const result = await bookingService.checkIn(id);
    if (result.ok) {
      addToast({ type: 'success', message: '签到成功！' });
      await reloadBooking();
    } else {
      addToast({ type: 'error', message: result.message || '签到失败，请稍后重试' });
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('确定要取消此预订吗？')) return;
    setActionLoading(true);
    const result = await bookingService.cancelBooking(id);
    if (result.ok) {
      addToast({ type: 'success', message: '预订已取消' });
      await reloadBooking();
    } else {
      addToast({ type: 'error', message: result.message || '取消失败，请稍后重试' });
    }
    setActionLoading(false);
  };

  const handleRefresh = async () => {
    await reloadBooking();
    addToast({ type: 'info', message: '状态已刷新' });
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-brand-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-brand-500">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 hover:text-brand-700 transition-colors p-1.5 -m-1.5 rounded-lg hover:bg-brand-50"
          >
            <Home className="h-4 w-4" />
            <span>首页</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-brand-800 font-medium">预订详情</span>
        </nav>
        <Card>
          <CardContent className="!pt-16 !pb-16">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-danger-50 flex items-center justify-center mb-6">
                <AlertTriangle className="h-10 w-10 text-danger-500" />
              </div>
              <h2 className="text-2xl font-bold text-brand-800 mb-3">
                「预订不存在或已被删除」
              </h2>
              <p className="text-brand-500 mb-8">
                您访问的预订信息不存在，可能已被取消或删除。请返回列表查看其他预订。
              </p>
              <div className="flex gap-3">
                <Button
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                  variant="secondary"
                  onClick={() => navigate(-1)}
                >
                  返回上一页
                </Button>
                <Button onClick={() => navigate('/bookings')}>
                  前往预订列表
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const duration = getDurationHours(booking.startTime, booking.endTime);
  const bookingId = booking.id;

  const now = new Date();
  const canCheckIn =
    booking.status === 'locked' &&
    now >= new Date(booking.startTime.getTime() - 1000 * 60 * 15) &&
    now <= booking.startTime;

  const canCancel = booking.status === 'locked' || booking.status === 'pending_approval';

  const isSameDay =
    formatDate(booking.startTime) === formatDate(booking.endTime);

  return (
    <div className="space-y-6 print:space-y-4">
      <nav className="flex items-center gap-2 text-sm text-brand-500 print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 hover:text-brand-700 transition-colors p-1.5 -m-1.5 rounded-lg hover:bg-brand-50"
        >
          <Home className="h-4 w-4" />
          <span>首页</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to="/bookings"
          className="hover:text-brand-700 transition-colors p-1.5 -m-1.5 rounded-lg hover:bg-brand-50"
          onClick={(e) => {
            e.preventDefault();
            navigate(-1);
          }}
        >
          预订列表
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-brand-800 font-medium">预订详情</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 print:col-span-full print:shadow-none print:border-print-border">
          <CardContent className="!pt-8">
            <div className="mb-6">
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-lg bg-gradient-to-r',
                  statusGradient[booking.status],
                )}
              >
                {booking.status === 'locked' && <MapPinned className="h-4 w-4" />}
                {booking.status === 'pending_approval' && <Clock className="h-4 w-4" />}
                {booking.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                {(booking.status === 'released' || booking.status === 'cancelled' || booking.status === 'rejected') && (
                  <XCircle className="h-4 w-4" />
                )}
                {bookingStatusLabel(booking.status)}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-brand-800 mb-2 leading-tight">
              {booking.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-brand-500 mb-8 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                {bookingId}
              </span>
              {booking.userName && (
                <>
                  <span className="w-1 h-1 rounded-full bg-brand-300" />
                  <span className="inline-flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5" />
                    预订人：{booking.userName}
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <MapPin className="h-5 w-5 text-brand-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-brand-500 mb-1">会议室</div>
                  <div className="font-semibold text-brand-800">{booking.roomName || '-'}</div>
                  {booking.floor && (
                    <div className="text-sm text-brand-600 mt-0.5 flex items-center gap-1.5">
                      <Building className="h-3 w-3" />
                      {booking.floor}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <Users className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <div className="text-xs text-brand-500 mb-1">容量</div>
                  <div className="font-semibold text-brand-800">{booking.capacity ?? '-'} 人</div>
                  <div className="text-sm text-brand-600 mt-0.5">
                    参会：{booking.attendeeCount} 人
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <CalendarDays className="h-5 w-5 text-brand-500" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-brand-500 mb-1">时间</div>
                  <div className="font-semibold text-brand-800">
                    {formatDate(booking.startTime)}
                    {!isSameDay && ` - ${formatDate(booking.endTime)}`}
                  </div>
                  <div className="text-sm text-brand-600 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-brand-700 font-medium">
                      <Timer className="h-3.5 w-3.5" />
                      {duration} 小时
                    </span>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <Monitor className="h-5 w-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-brand-500 mb-2">所需设备</div>
                  <div className="flex flex-wrap gap-2">
                    {booking.requiredDevices.length > 0 ? (
                      booking.requiredDevices.map((d) => (
                        <span
                          key={d.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-brand-700 text-sm rounded-xl border border-brand-100 shadow-sm font-medium"
                        >
                          <Monitor className="h-3.5 w-3.5 text-brand-500" />
                          {d.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-brand-400">无特殊设备要求</span>
                    )}
                  </div>
                </div>
              </div>

              {booking.createdAt && (
                <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <CalendarClock className="h-5 w-5 text-brand-500" />
                  </div>
                  <div>
                    <div className="text-xs text-brand-500 mb-1">提交时间</div>
                    <div className="font-medium text-brand-800 text-sm">
                      {formatDateTime(booking.createdAt)}
                    </div>
                  </div>
                </div>
              )}

              {booking.approvalManagerName && (
                <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <UserCheck className="h-5 w-5 text-success-500" />
                  </div>
                  <div>
                    <div className="text-xs text-brand-500 mb-1">审批人</div>
                    <div className="font-medium text-brand-800 text-sm">
                      {booking.approvalManagerName}
                    </div>
                    {booking.approvalTime && (
                      <div className="text-xs text-brand-500 mt-0.5">
                        {formatDateTime(booking.approvalTime)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 print:col-span-full print:shadow-none print:border-print-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-500" />
              <CardTitle>电子确认单</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-xs uppercase tracking-widest text-brand-400 mb-1">
                  Confirmation Voucher
                </div>
                <div className="text-lg font-bold text-brand-800 tracking-wide">
                  {bookingId}
                </div>
              </div>

              <div className="flex justify-center py-4">
                <div className="relative">
                  <div className="absolute -inset-3 bg-gradient-to-br from-brand-100 to-brand-50 rounded-3xl -z-10" />
                  <div className="p-3 bg-white rounded-2xl shadow-lg border border-brand-100">
                    <QRCodeSVG value={bookingId} size={180} />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="text-sm font-medium text-brand-700">
                  请在会议开始前出示此确认单
                </div>
                <div className="text-xs text-brand-500">
                  扫描二维码或输入确认单号完成签到
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-brand-100">
                <div className="text-center">
                  <div className="text-xs text-brand-500 mb-0.5">日期</div>
                  <div className="text-sm font-semibold text-brand-800">
                    {formatDate(booking.startTime).slice(5)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-500 mb-0.5">时间</div>
                  <div className="text-sm font-semibold text-brand-800">
                    {formatTime(booking.startTime)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-500 mb-0.5">会议室</div>
                  <div className="text-sm font-semibold text-brand-800">
                    {booking.roomName || '-'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-500 mb-0.5">时长</div>
                  <div className="text-sm font-semibold text-brand-800">
                    {duration}h
                  </div>
                </div>
              </div>

              <div className="pt-1 print:hidden">
                <Button className="w-full" leftIcon={<Download className="h-4 w-4" />} onClick={handleDownload}>
                  下载确认单
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
        {canCheckIn && (
          <Button size="lg" leftIcon={<CheckCircle className="h-4 w-4" />} onClick={handleCheckIn} disabled={actionLoading}>
            {actionLoading ? '处理中...' : '立即签到'}
          </Button>
        )}
        {canCancel && (
          <Button
            size="lg"
            variant="danger"
            leftIcon={<XCircle className="h-4 w-4" />}
            onClick={handleCancel}
            disabled={actionLoading}
          >
            取消预订
          </Button>
        )}
        <Button
          size="lg"
          variant="secondary"
          leftIcon={<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />}
          onClick={handleRefresh}
          disabled={actionLoading}
        >
          刷新状态
        </Button>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:col-span-full { grid-column: 1 / -1 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-print-border { border: 1px solid #e5e7eb !important; }
        }
      `}</style>
    </div>
  );
}
