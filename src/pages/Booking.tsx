import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Projector,
  PenTool,
  Video,
  Mic,
  Building2,
  CalendarDays,
  Search,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Info,
  FileCheck,
  Zap,
  Loader2,
  CalendarCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import FormInput from '../components/common/FormInput';
import FormSelect from '../components/common/FormSelect';
import FormDatePicker from '../components/common/FormDatePicker';
import Modal from '../components/common/Modal';
import { roomService } from '../services/roomService';
import { bookingService } from '../services/bookingService';
import { useAuth, useUi } from '../store';
import type { MeetingRoom, RoomStatus, Booking, BookingConflict } from '../types';
import {
  getWeekDates,
  formatDate,
  formatTime,
  getDurationHours,
  cn,
} from '../utils';

const MIN_CREDIT_SCORE = 60;

const DEVICE_OPTIONS = [
  { value: 'projector', label: '投影仪', icon: Projector },
  { value: 'whiteboard', label: '白板', icon: PenTool },
  { value: 'video-conference', label: '视频会议', icon: Video },
  { value: 'microphone', label: '麦克风', icon: Mic },
];

const FLOOR_OPTIONS = [
  { value: '', label: '全部楼层' },
  { value: '1F', label: '1楼' },
  { value: '2F', label: '2楼' },
  { value: '3F', label: '3楼' },
  { value: '4F', label: '4楼' },
  { value: '5F', label: '5楼' },
];

const CAPACITY_OPTIONS = [
  { value: '', label: '不限人数' },
  { value: '5', label: '5人以下' },
  { value: '10', label: '10人以下' },
  { value: '20', label: '20人以下' },
  { value: '50', label: '50人以下' },
];

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 20) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
  }
}

const ROOM_GRADIENT = [
  'from-brand-400 via-brand-500 to-brand-600',
  'from-purple-400 via-purple-500 to-indigo-600',
  'from-sky-400 via-cyan-500 to-teal-600',
  'from-rose-400 via-pink-500 to-fuchsia-600',
  'from-amber-400 via-orange-500 to-red-500',
  'from-emerald-400 via-green-500 to-teal-600',
];



interface BookingFormData {
  room: MeetingRoom | null;
  startTime: Date | null;
  endTime: Date | null;
  attendeeCount: number;
  title: string;
  requiredDevices: string[];
  note: string;
}

const INITIAL_FORM: BookingFormData = {
  room: null,
  startTime: null,
  endTime: null,
  attendeeCount: 5,
  title: '',
  requiredDevices: [],
  note: '',
};

export default function Booking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast, setGlobalLoading } = useUi();

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [capacityFilter, setCapacityFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string[]>([]);
  const [floorFilter, setFloorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(formatDate(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [roomBookings, setRoomBookings] = useState<Record<string, Booking[]>>({});
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [formData, setFormData] = useState<BookingFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const weekDates = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId],
  );

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (capacityFilter && room.capacity > parseInt(capacityFilter)) return false;
      if (floorFilter && room.floor !== floorFilter) return false;
      if (deviceFilter.length > 0) {
        const hasAllDevices = deviceFilter.every((d) => room.equipmentIds.includes(d));
        if (!hasAllDevices) return false;
      }
      return true;
    });
  }, [rooms, capacityFilter, floorFilter, deviceFilter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const roomsRes = await roomService.getRooms({ pageSize: 50 });
      const loadedRooms: MeetingRoom[] =
        roomsRes.ok && roomsRes.data ? roomsRes.data.items : [];
      setRooms(loadedRooms);
      if (loadedRooms.length > 0) {
        setSelectedRoomId(loadedRooms[0].id);
      }
      const start = new Date(weekDates[0]);
      const end = new Date(weekDates[6]);
      end.setHours(23, 59, 59, 999);
      const bookingsRes = await bookingService.getMyBookings({
        pageSize: 200,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      if (bookingsRes.ok && bookingsRes.data) {
        const items = bookingsRes.data.items;
        const grouped: Record<string, Booking[]> = {};
        for (const b of items) {
          if (!grouped[b.roomId]) grouped[b.roomId] = [];
          grouped[b.roomId].push(b);
        }
        setRoomBookings(grouped);
      } else {
        setRoomBookings({});
      }
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadWeekBookings = async () => {
      const start = new Date(weekDates[0]);
      const end = new Date(weekDates[6]);
      end.setHours(23, 59, 59, 999);
      const bookingsRes = await bookingService.getMyBookings({
        pageSize: 200,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      if (bookingsRes.ok && bookingsRes.data) {
        const items = bookingsRes.data.items;
        const grouped: Record<string, Booking[]> = {};
        for (const b of items) {
          if (!grouped[b.roomId]) grouped[b.roomId] = [];
          grouped[b.roomId].push(b);
        }
        setRoomBookings(grouped);
      } else {
        setRoomBookings({});
      }
    };
    loadWeekBookings();
  }, [weekOffset, rooms]);

  useEffect(() => {
    const checkConflicts = async () => {
      if (
        !formData.room ||
        !formData.startTime ||
        !formData.endTime ||
        formData.startTime >= formData.endTime
      ) {
        setConflicts([]);
        return;
      }
      setCheckingConflict(true);
      const result = await bookingService.checkConflicts({
        roomId: formData.room.id,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        requiredDeviceIds: formData.requiredDevices,
      });
      if (result.ok) {
        setConflicts(result.data || []);
      } else if (result.status === 409) {
        setConflicts((result.conflicts as BookingConflict[]) || []);
      } else {
        setConflicts([]);
      }
      setCheckingConflict(false);
    };
    const timer = setTimeout(checkConflicts, 300);
    return () => clearTimeout(timer);
  }, [formData.room, formData.startTime, formData.endTime, formData.requiredDevices]);

  const toggleDeviceFilter = (device: string) => {
    setDeviceFilter((prev) =>
      prev.includes(device) ? prev.filter((d) => d !== device) : [...prev, device],
    );
  };

  const handleTimeSlotClick = (roomId: string, date: Date, slotIdx: number) => {
    if (user?.creditScore && user.creditScore < MIN_CREDIT_SCORE) {
      addToast({ type: 'warning', message: '信用分不足（低于60），暂不可预订，请联系管理员恢复' });
      return;
    }
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.status !== 'active') {
      addToast({ type: 'warning', message: '该会议室当前不可用' });
      return;
    }
    setSelectedRoomId(roomId);
    const startTime = new Date(date);
    startTime.setHours(8 + Math.floor(slotIdx / 2), (slotIdx % 2) * 30);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 60);
    setFormData({
      ...INITIAL_FORM,
      room,
      startTime,
      endTime,
      requiredDevices: room.equipmentIds.slice(0, 2),
    });
    setBookingStep(1);
    setFormErrors({});
    setBookingModalOpen(true);
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.room) errors.room = '请选择会议室';
    if (!formData.startTime) errors.startTime = '请选择开始时间';
    if (!formData.endTime) errors.endTime = '请选择结束时间';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.endTime = '结束时间必须晚于开始时间';
    }
    if (formData.attendeeCount <= 0) errors.attendeeCount = '参会人数必须大于0';
    if (formData.room && formData.attendeeCount > formData.room.capacity) {
      errors.attendeeCount = `参会人数超过会议室容量（最大${formData.room.capacity}人）`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = '请输入会议主题';
    if (conflicts.length > 0) {
      return false;
    }
    setFormErrors({ ...formErrors, ...errors });
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setBookingStep(2);
    }
  };

  const handlePrevStep = () => {
    setBookingStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setGlobalLoading(true);
    const result = await bookingService.createBooking({
      roomId: formData.room!.id,
      title: formData.title,
      startTime: formData.startTime!.toISOString(),
      endTime: formData.endTime!.toISOString(),
      attendeeCount: formData.attendeeCount,
      requiredDeviceIds: formData.requiredDevices,
    });
    if (result.ok && result.data) {
      const booking = result.data;
      if (booking.status === 'pending_approval') {
        addToast({
          type: 'warning',
          message: '已提交主管审批，审批通过后生效',
          duration: 5000,
        });
      } else if (booking.status === 'locked') {
        addToast({ type: 'success', message: '预订成功，会议室已锁定' });
      } else {
        addToast({ type: 'success', message: '预订成功' });
      }
      setBookingModalOpen(false);
      if (booking.id) {
        navigate(`/bookings/${booking.id}`);
      }
    } else if (result.status === 409) {
      const conflictList = (result.conflicts as BookingConflict[]) || [];
      const deviceNames = conflictList
        .filter((c) => c.type === 'device')
        .map((c) => c.deviceName || (c as any).deviceId || '未知')
        .filter(Boolean);
      addToast({
        type: 'warning',
        message:
          '存在冲突，请调整后重试：' +
          (deviceNames.length > 0 ? `设备 ${deviceNames.join('、')} 已被占用` : result.message || '存在冲突'),
      });
    } else if (result.status === 403) {
      addToast({
        type: 'warning',
        message: result.message || '信用分不足，暂不可预订',
      });
    } else {
      addToast({
        type: 'error',
        message: result.message || '预订失败，请调整后重试',
      });
    }
    setGlobalLoading(false);
  };

  const getSlotBooking = (roomId: string, date: Date, slotIdx: number): Booking | null => {
    const rb = roomBookings[roomId] || [];
    const slotStart = new Date(date);
    slotStart.setHours(8 + Math.floor(slotIdx / 2), (slotIdx % 2) * 30, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);
    for (const b of rb) {
      const bs = new Date(b.startTime).getTime();
      const be = new Date(b.endTime).getTime();
      if (slotStart.getTime() < be && slotEnd.getTime() > bs) {
        return b;
      }
    }
    return null;
  };

  const isSlotStartOfBooking = (roomId: string, date: Date, slotIdx: number): boolean => {
    const b = getSlotBooking(roomId, date, slotIdx);
    if (!b) return false;
    const slotStart = new Date(date);
    slotStart.setHours(8 + Math.floor(slotIdx / 2), (slotIdx % 2) * 30, 0, 0);
    return Math.abs(slotStart.getTime() - new Date(b.startTime).getTime()) < 60000;
  };

  const getBookingSpanSlots = (roomId: string, date: Date, slotIdx: number): number => {
    const b = getSlotBooking(roomId, date, slotIdx);
    if (!b) return 0;
    const bs = new Date(b.startTime).getTime();
    const be = new Date(b.endTime).getTime();
    const slotStart = new Date(date);
    slotStart.setHours(8, 0, 0, 0);
    const diffStart = Math.max(0, bs - slotStart.getTime());
    const diffEnd = Math.min(TIME_SLOTS.length * 30 * 60000, be - slotStart.getTime());
    const startIdx = Math.floor(diffStart / (30 * 60000));
    const endIdx = Math.ceil(diffEnd / (30 * 60000));
    if (slotIdx !== startIdx) return 0;
    return endIdx - startIdx;
  };

  const duration =
    formData.startTime && formData.endTime
      ? getDurationHours(formData.startTime, formData.endTime)
      : 0;

  const isCreditInsufficient =
    user?.creditScore !== undefined && user.creditScore < MIN_CREDIT_SCORE;

  const getDeviceIcon = (deviceId: string) => {
    const found = DEVICE_OPTIONS.find((d) => d.value === deviceId);
    return found ? found.icon : null;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-brand-500" />
              筛选会议室
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <FormSelect
                label="参会人数"
                options={CAPACITY_OPTIONS}
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
              />
              <FormSelect
                label="楼层"
                options={FLOOR_OPTIONS}
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
              />
              <FormDatePicker
                label="日期"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-brand-800 mb-1.5">
                  设备需求
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEVICE_OPTIONS.map((device) => {
                    const active = deviceFilter.includes(device.value);
                    return (
                      <button
                        key={device.value}
                        type="button"
                        onClick={() => toggleDeviceFilter(device.value)}
                        className={cn(
                          'inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border text-sm transition-all duration-200',
                          active
                            ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                            : 'bg-white text-brand-700 border-brand-200 hover:border-brand-300 hover:bg-brand-50',
                        )}
                      >
                        <device.icon className="w-4 h-4" />
                        {device.label}
                        {active && <Check className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-500" />
              会议室列表
              <span className="ml-2 text-sm font-normal text-brand-500">
                （{filteredRooms.length} 间可用）
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl bg-brand-50 animate-pulse" />
                ))}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-16 text-center text-brand-400">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">没有找到匹配的会议室</p>
                <p className="text-sm">请尝试调整筛选条件</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room, idx) => {
                  const isSelected = selectedRoomId === room.id;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={cn(
                        'group cursor-pointer rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-1',
                        isSelected
                          ? 'ring-2 ring-brand-500 border-brand-400 shadow-card-hover'
                          : 'border-brand-100 shadow-card hover:shadow-card-hover hover:border-brand-200',
                      )}
                    >
                      <div
                        className={cn(
                          'relative h-28 bg-gradient-to-br',
                          ROOM_GRADIENT[idx % ROOM_GRADIENT.length],
                          'overflow-hidden',
                        )}
                      >
                        <div className="absolute inset-0 opacity-20">
                          <CalendarCheck className="absolute -right-4 -bottom-4 w-32 h-32 text-white/30" />
                        </div>
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant={room.status === 'active' ? 'success' : 'warning'}
                            dot
                            className="backdrop-blur-sm"
                          >
                            {room.status === 'active' ? '可预约' : '维护中'}
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-4 text-white">
                          <div className="text-lg font-bold drop-shadow-sm">{room.name}</div>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 text-sm text-brand-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {room.floor}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {room.capacity}人
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {room.equipmentIds.slice(0, 4).map((devId) => {
                            const Icon = getDeviceIcon(devId);
                            return Icon ? (
                              <div
                                key={devId}
                                className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"
                                title={DEVICE_OPTIONS.find((d) => d.value === devId)?.label}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                            ) : null;
                          })}
                          {room.equipmentIds.length > 4 && (
                            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center text-xs font-medium">
                              +{room.equipmentIds.length - 4}
                            </div>
                          )}
                        </div>
                        {room.description && (
                          <p className="mt-3 text-xs text-brand-500 line-clamp-2">
                            {room.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-500" />
                日历视图
                {selectedRoom && (
                  <span className="ml-2 text-sm font-normal text-brand-500">
                    - {selectedRoom.name}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                  onClick={() => setWeekOffset((o) => o - 1)}
                >
                  上周
                </Button>
                <span className="text-sm font-medium text-brand-700 px-3 py-1.5 bg-brand-50 rounded-lg min-w-[180px] text-center">
                  {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setWeekOffset((o) => o + 1)}
                >
                  下周
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedRoom ? (
              <div className="py-16 text-center text-brand-400">
                <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">请先选择会议室</p>
                <p className="text-sm">在上方会议室列表中点击选择</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className="grid" style={{ gridTemplateColumns: `100px repeat(7, minmax(0, 1fr))` }}>
                    <div className="p-3 border-b border-r border-brand-100 bg-brand-50/50 text-xs font-semibold text-brand-500 text-center sticky left-0 bg-white z-10">
                      时间
                    </div>
                    {weekDates.map((date, idx) => {
                      const isToday = formatDate(date) === formatDate(new Date());
                      const isSelected = formatDate(date) === dateFilter;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'p-3 border-b border-brand-100 text-center bg-brand-50/30',
                            idx < 6 && 'border-r',
                            isToday && 'bg-amber-50/50',
                            isSelected && 'bg-brand-100/50',
                          )}
                        >
                          <div className="text-xs text-brand-500 mb-0.5">
                            {['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx]}
                          </div>
                          <div
                            className={cn(
                              'text-sm font-semibold',
                              isToday && 'text-amber-600',
                              isSelected && 'text-brand-600',
                            )}
                          >
                            {date.getMonth() + 1}/{date.getDate()}
                          </div>
                          {isToday && (
                            <Badge variant="warning" dot className="mt-1 text-[10px] py-0 px-1.5">
                              今天
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {TIME_SLOTS.map((_, slotIdx) => (
                    <div
                      key={slotIdx}
                      className="grid"
                      style={{ gridTemplateColumns: `100px repeat(7, minmax(0, 1fr))` }}
                    >
                      <div
                        className={cn(
                          'p-2 border-r border-brand-100 text-xs text-brand-500 text-right pr-3 bg-white sticky left-0 z-10',
                          slotIdx < TIME_SLOTS.length - 1 && 'border-b',
                        )}
                      >
                        {TIME_SLOTS[slotIdx]}
                      </div>
                      {weekDates.map((date, dayIdx) => {
                        const booking = getSlotBooking(selectedRoom.id, date, slotIdx);
                        const isStart = isSlotStartOfBooking(selectedRoom.id, date, slotIdx);
                        const span = isStart ? getBookingSpanSlots(selectedRoom.id, date, slotIdx) : 0;
                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                        return (
                          <div
                            key={dayIdx}
                            className={cn(
                              'relative border-brand-100 min-h-[36px]',
                              dayIdx < 6 && 'border-r',
                              slotIdx < TIME_SLOTS.length - 1 && 'border-b',
                            )}
                          >
                            {isStart && span > 0 ? (
                              <div
                                className={cn(
                                  'absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md z-10',
                                  'bg-gradient-to-r from-brand-400/90 to-brand-500/90 text-white text-[11px] backdrop-blur-sm',
                                )}
                                style={{
                                  top: '2px',
                                  height: `${Math.min(span, 4) * 36 - 6}px`,
                                  overflow: 'hidden',
                                }}
                                title={`${booking!.title}\n${formatTime(booking!.startTime)} - ${formatTime(booking!.endTime)}`}
                              >
                                <div className="font-medium truncate">{booking!.title}</div>
                                {span >= 2 && (
                                  <div className="text-brand-100 text-[10px] opacity-90">
                                    {formatTime(booking!.startTime)}-{formatTime(booking!.endTime)}
                                  </div>
                                )}
                              </div>
                            ) : booking && !isStart ? null : (
                              !isPast && (
                                <button
                                  onClick={() => handleTimeSlotClick(selectedRoom.id, date, slotIdx)}
                                  className="absolute inset-1 rounded-md hover:bg-brand-100/80 transition-colors group"
                                  title="点击创建预订"
                                >
                                  <Plus className="w-3 h-3 text-brand-300 opacity-0 group-hover:opacity-100 absolute inset-0 m-auto transition-opacity" />
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-semibold">预订会议室</h3>
              <div className="flex items-center gap-2 text-xs text-brand-500">
                <span className={cn('w-5 h-5 rounded-full text-[10px] flex items-center justify-center', bookingStep >= 1 ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-500')}>1</span>
                <span className={bookingStep >= 1 ? 'w-8 h-0.5 bg-brand-500' : 'w-8 h-0.5 bg-brand-100'} />
                <span className={cn('w-5 h-5 rounded-full text-[10px] flex items-center justify-center', bookingStep >= 2 ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-500')}>2</span>
                <span className="ml-1">{bookingStep === 1 ? '基本信息' : '会议详情'}</span>
              </div>
            </div>
          </div>
        }
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-brand-500 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              {duration > 2 ? '超过2小时的预订需要审批' : '预订成功后立即生效'}
            </div>
            <div className="flex items-center gap-2">
              {bookingStep === 2 && (
                <Button variant="secondary" onClick={handlePrevStep} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  上一步
                </Button>
              )}
              <Button variant="secondary" onClick={() => setBookingModalOpen(false)}>
                取消
              </Button>
              {bookingStep === 1 ? (
                <Button
                  onClick={handleNextStep}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  disabled={isCreditInsufficient}
                  title={isCreditInsufficient ? '您的信用分不足，暂不可预订' : undefined}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  rightIcon={duration > 2 ? <FileCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  disabled={
                    isCreditInsufficient ||
                    // 有任意冲突（含设备冲突 + 时间冲突）时禁用提交
                    conflicts.length > 0 ||
                    checkingConflict
                  }
                  title={
                    isCreditInsufficient
                      ? '您的信用分不足，暂不可预订'
                      : checkingConflict
                      ? '正在检测冲突...'
                      : conflicts.length > 0
                      ? '存在冲突，请调整后再提交'
                      : undefined
                  }
                >
                  {duration > 2 ? '提交审批' : '确认预订'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-5">
            {bookingStep === 1 && (
              <>
                <FormSelect
                  label="会议室"
                  required
                  value={formData.room?.id || ''}
                  error={formErrors.room}
                  onChange={(e) => {
                    const r = rooms.find((x) => x.id === e.target.value);
                    setFormData({ ...formData, room: r || null });
                  }}
                >
                  <option value="">请选择会议室</option>
                  {rooms.filter((r) => r.status === 'active').map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}（{r.floor}，{r.capacity}人）
                    </option>
                  ))}
                </FormSelect>

                <div className="grid grid-cols-2 gap-4">
                  <FormDatePicker
                    label="开始时间"
                    type="datetime-local"
                    required
                    error={formErrors.startTime}
                    value={
                      formData.startTime
                        ? formData.startTime.toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startTime: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                  />
                  <FormDatePicker
                    label="结束时间"
                    type="datetime-local"
                    required
                    error={formErrors.endTime}
                    value={
                      formData.endTime
                        ? formData.endTime.toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endTime: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <FormInput
                  label="参会人数"
                  type="number"
                  min={1}
                  required
                  error={formErrors.attendeeCount}
                  value={formData.attendeeCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      attendeeCount: parseInt(e.target.value) || 0,
                    })
                  }
                  leftIcon={<Users className="w-4 h-4" />}
                />
              </>
            )}

            {bookingStep === 2 && (
              <>
                <FormInput
                  label="会议主题"
                  required
                  error={formErrors.title}
                  placeholder="请输入会议主题"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  leftIcon={<CalendarDays className="w-4 h-4" />}
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-brand-800">
                    设备需求
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEVICE_OPTIONS.map((device) => {
                      const checked = formData.requiredDevices.includes(device.value);
                      const roomHas = formData.room?.equipmentIds.includes(device.value);
                      const hasDeviceConflict = conflicts.some(
                        (c) =>
                          c.type === 'device' &&
                          (c.deviceId === device.value ||
                            c.deviceName === device.value ||
                            c.deviceName === device.label),
                      );
                      return (
                        <label
                          key={device.value}
                          className={cn(
                            'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all duration-200',
                            checked
                              ? 'bg-brand-50 border-brand-300'
                              : 'bg-white border-brand-100 hover:border-brand-200 hover:bg-brand-50/30',
                            !roomHas && 'opacity-60',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  requiredDevices: [...formData.requiredDevices, device.value],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  requiredDevices: formData.requiredDevices.filter(
                                    (d) => d !== device.value,
                                  ),
                                });
                              }
                            }}
                            className="w-4 h-4 rounded border-brand-300 text-brand-500 focus:ring-brand-200"
                          />
                          <device.icon className="w-4 h-4 text-brand-500" />
                          <span className="text-sm text-brand-700 relative inline-flex items-center gap-1">
                            {device.label}
                            {hasDeviceConflict && (
                              <span className="inline-block w-2 h-2 rounded-full bg-danger-500 shrink-0" title="该设备存在冲突" />
                            )}
                          </span>
                          {!roomHas && (
                            <span className="ml-auto text-[10px] text-warning-600 bg-warning-50 px-1.5 py-0.5 rounded">
                              无此设备
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <FormInput
                  label="备注信息"
                  placeholder="选填，补充其他说明"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/50 to-white p-5 space-y-4 sticky top-4">
              <h4 className="font-semibold text-brand-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-500" />
                实时预览
              </h4>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-brand-500">会议室</p>
                    <p className="text-sm font-medium text-brand-800">
                      {formData.room?.name || '未选择'}
                      {formData.room && (
                        <span className="text-brand-500 font-normal ml-1">
                          · {formData.room.floor} · {formData.room.capacity}人
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-brand-500">会议时间</p>
                    <p className="text-sm font-medium text-brand-800">
                      {formData.startTime && formData.endTime
                        ? `${formatDate(formData.startTime)} ${formatTime(formData.startTime)} - ${formatTime(formData.endTime)}`
                        : '未选择'}
                    </p>
                    {duration > 0 && (
                      <p className="text-xs text-brand-500 mt-0.5">
                        时长：<span className="font-medium text-brand-700">{duration} 小时</span>
                        {duration > 2 && (
                          <span className="text-warning-600 ml-2 flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            超过2小时需审批
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {bookingStep === 2 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-brand-500">参会信息</p>
                      <p className="text-sm font-medium text-brand-800">
                        {formData.title || '未输入主题'}
                      </p>
                      <p className="text-xs text-brand-500">
                        {formData.attendeeCount} 人参加
                        {formData.requiredDevices.length > 0 && (
                          <span className="ml-2">
                            · {formData.requiredDevices.length} 项设备
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-brand-100">
                {checkingConflict ? (
                  <div className="flex items-center gap-2 text-sm text-brand-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在检测冲突...
                  </div>
                ) : conflicts.length > 0 ? (
                  <div className="space-y-2">
                    {conflicts.map((c, idx) => {
                      if (c.type === 'device') {
                        return (
                          <div
                            key={`device-${idx}`}
                            className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-1"
                          >
                            <p className="text-sm font-medium text-orange-700">
                              🟠 设备「{c.deviceName || c.deviceId || '未知'}」已被占用
                            </p>
                            <p className="text-xs text-orange-600">
                              占用时段：{c.startTime ? formatTime(c.startTime) : '--:--'} - {c.endTime ? formatTime(c.endTime) : '--:--'}
                            </p>
                            <p className="text-xs text-orange-600">
                              建议：更换此设备或调整会议时间
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`time-${idx}`}
                          className="rounded-xl border border-danger-200 bg-danger-50 p-3 space-y-1"
                        >
                          <p className="text-sm font-medium text-danger-700">
                            � 会议室「{c.roomName || formData.room?.name || ''}」时间冲突
                          </p>
                          <p className="text-xs text-danger-600">
                            冲突时段：{c.startTime ? formatTime(c.startTime) : '--:--'} - {c.endTime ? formatTime(c.endTime) : '--:--'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : formData.startTime && formData.endTime && formData.room ? (
                  <div className="rounded-xl border border-success-200 bg-success-50 p-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-success-500 shrink-0" />
                      <p className="text-sm font-medium text-success-700">时间可用</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                    <div className="flex items-center gap-2 text-sm text-brand-500">
                      <Info className="w-5 h-5 shrink-0" />
                      选择会议室和时间后检测可用性
                    </div>
                  </div>
                )}
              </div>

              {user && (
                <div className="pt-3 border-t border-brand-100 text-xs text-brand-500">
                  <div className="flex items-center justify-between">
                    <span>预订人</span>
                    <span className="font-medium text-brand-700">{user.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>部门</span>
                    <span className="font-medium text-brand-700">{user.department}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function Plus(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
