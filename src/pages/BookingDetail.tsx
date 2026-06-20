import { useMemo, useState, useEffect } from 'react';
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
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { useAppStore } from '@/store';
import { bookingService } from '@/services/bookingService';
import {
  bookingStatusLabel,
  formatDate,
  formatTime,
  formatDateTime,
  getDurationHours,
} from '@/utils';
import { cn } from '@/utils';
import type { BookingStatus, Booking } from '@/types';

const mockBooking = {
  id: 'BK20260620001',
  title: '2026 Q2 产品战略评审会议',
  status: 'locked' as BookingStatus,
  roomId: 'r1',
  roomName: '星辰会议室',
  floor: '3F - 东区',
  capacity: 20,
  userId: 'user-001',
  userName: '张三',
  startTime: new Date(Date.now() + 1000 * 60 * 30),
  endTime: new Date(Date.now() + 1000 * 60 * 60 * 2.5),
  attendeeCount: 15,
  requiredDevices: [
    { id: 'd1', name: '智能投影仪' },
    { id: 'd2', name: '视频会议终端' },
    { id: 'd3', name: '无线麦克风' },
    { id: 'd4', name: '电子白板' },
  ],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  approvalManagerId: 'user-002',
  approvalManagerName: '李经理',
  approvalTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.5),
};

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
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const loadBooking = async () => {
      try {
        setLoading(true);
        const result = await bookingService.getBooking(id);
        if (result) {
          const enrichedBooking = {
            ...result,
            roomName: (result as any).roomName || mockBooking.roomName,
            floor: (result as any).floor || mockBooking.floor,
            capacity: (result as any).capacity || mockBooking.capacity,
            userName: (result as any).userName || mockBooking.userName,
            approvalManagerName: (result as any).approvalManagerName || mockBooking.approvalManagerName,
            requiredDevices: (result as any).requiredDevices || result.requiredDeviceIds?.map((did: string, idx: number) => ({
              id: did,
              name: mockBooking.requiredDevices[idx % mockBooking.requiredDevices.length]?.name || did,
            })) || mockBooking.requiredDevices,
            startTime: new Date(result.startTime),
            endTime: new Date(result.endTime),
            createdAt: result.createdAt ? new Date(result.createdAt) : mockBooking.createdAt,
            approvalTime: result.approvalTime ? new Date(result.approvalTime) : mockBooking.approvalTime,
          };
          setBooking(enrichedBooking);
        } else {
          setBooking(null);
        }
      } catch {
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    loadBooking();
  }, [id]);

  const displayBooking = booking || mockBooking;
  const bookingId = id || mockBooking.id;

  const duration = getDurationHours(displayBooking.startTime, displayBooking.endTime);

  const now = new Date();
  const canCheckIn =
    displayBooking.status === 'locked' &&
    now >= new Date(displayBooking.startTime.getTime() - 1000 * 60 * 15) &&
    now <= displayBooking.startTime;

  const canCancel = displayBooking.status === 'locked' || displayBooking.status === 'pending_approval';

  const handleCheckIn = () => {
    addToast({ type: 'success', message: '签到成功！祝您会议顺利' });
  };

  const handleCancel = () => {
    if (confirm('确定要取消此预订吗？')) {
      addToast({ type: 'info', message: '预订已取消' });
    }
  };

  const handleRefresh = () => {
    addToast({ type: 'info', message: '状态已刷新' });
  };

  const handleDownload = () => {
    window.print();
  };

  const isSameDay =
    formatDate(displayBooking.startTime) === formatDate(displayBooking.endTime);

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
                  statusGradient[displayBooking.status],
                )}
              >
                {displayBooking.status === 'locked' && <MapPinned className="h-4 w-4" />}
                {displayBooking.status === 'pending_approval' && <Clock className="h-4 w-4" />}
                {displayBooking.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                {(displayBooking.status === 'released' || displayBooking.status === 'cancelled' || displayBooking.status === 'rejected') && (
                  <XCircle className="h-4 w-4" />
                )}
                {bookingStatusLabel(displayBooking.status)}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-brand-800 mb-2 leading-tight">
              {displayBooking.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-brand-500 mb-8 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                {bookingId}
              </span>
              <span className="w-1 h-1 rounded-full bg-brand-300" />
              <span className="inline-flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5" />
                预订人：{displayBooking.userName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <MapPin className="h-5 w-5 text-brand-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-brand-500 mb-1">会议室</div>
                  <div className="font-semibold text-brand-800">{displayBooking.roomName}</div>
                  <div className="text-sm text-brand-600 mt-0.5 flex items-center gap-1.5">
                    <Building className="h-3 w-3" />
                    {displayBooking.floor}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <Users className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <div className="text-xs text-brand-500 mb-1">容量</div>
                  <div className="font-semibold text-brand-800">{displayBooking.capacity} 人</div>
                  <div className="text-sm text-brand-600 mt-0.5">
                    参会：{displayBooking.attendeeCount} 人
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
                    {formatDate(displayBooking.startTime)}
                    {!isSameDay && ` - ${formatDate(displayBooking.endTime)}`}
                  </div>
                  <div className="text-sm text-brand-600 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(displayBooking.startTime)} - {formatTime(displayBooking.endTime)}
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
                    {displayBooking.requiredDevices.map((d: any) => (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-brand-700 text-sm rounded-xl border border-brand-100 shadow-sm font-medium"
                      >
                        <Monitor className="h-3.5 w-3.5 text-brand-500" />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <CalendarClock className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <div className="text-xs text-brand-500 mb-1">提交时间</div>
                  <div className="font-medium text-brand-800 text-sm">
                    {formatDateTime(displayBooking.createdAt)}
                  </div>
                </div>
              </div>

              {displayBooking.approvalManagerName && (
                <div className="flex items-start gap-4 p-4 bg-brand-50/60 rounded-2xl">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <UserCheck className="h-5 w-5 text-success-500" />
                  </div>
                  <div>
                    <div className="text-xs text-brand-500 mb-1">审批人</div>
                    <div className="font-medium text-brand-800 text-sm">
                      {displayBooking.approvalManagerName}
                    </div>
                    {displayBooking.approvalTime && (
                      <div className="text-xs text-brand-500 mt-0.5">
                        {formatDateTime(displayBooking.approvalTime)}
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
                    {formatDate(displayBooking.startTime).slice(5)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-500 mb-0.5">时间</div>
                  <div className="text-sm font-semibold text-brand-800">
                    {formatTime(displayBooking.startTime)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-500 mb-0.5">会议室</div>
                  <div className="text-sm font-semibold text-brand-800">
                    {displayBooking.roomName}
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
          <Button size="lg" leftIcon={<CheckCircle className="h-4 w-4" />} onClick={handleCheckIn}>
            立即签到
          </Button>
        )}
        {canCancel && (
          <Button
            size="lg"
            variant="danger"
            leftIcon={<XCircle className="h-4 w-4" />}
            onClick={handleCancel}
          >
            取消预订
          </Button>
        )}
        <Button
          size="lg"
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={handleRefresh}
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
