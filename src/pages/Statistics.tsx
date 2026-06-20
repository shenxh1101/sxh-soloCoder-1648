import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  RefreshCw,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { useAppStore } from '@/store';
import { formatDate } from '@/utils';
import { cn } from '@/utils';
import { statisticsService, type RoomUsageStats, type DeviceFaultStats } from '@/services/statisticsService';
import { roomService } from '@/services/roomService';
import type { DailyReport, MeetingRoom } from '@/types';

type MainTab = 'usage' | 'timeout' | 'fault' | 'brief';
type TimeRange = 'thisWeek' | 'lastWeek' | 'thisMonth';

const mainTabs = [
  { key: 'usage' as const, label: '使用率分析', icon: BarChart3 },
  { key: 'timeout' as const, label: '超时释放', icon: Clock },
  { key: 'fault' as const, label: '设备故障', icon: AlertTriangle },
  { key: 'brief' as const, label: '运营简报', icon: FileText },
];

const defaultRooms = [
  { id: 'r1', name: '星辰会议室' },
  { id: 'r2', name: '月光会议室' },
  { id: 'r3', name: '朝阳会议室' },
  { id: 'r4', name: '银河会议室' },
  { id: 'r5', name: '极光会议室' },
];

const hours = Array.from({ length: 14 }, (_, i) => i + 8);

const deviceTypeLabelMap: Record<string, string> = {
  projector: '投影仪',
  whiteboard: '白板',
  'video-conference': '视频会议',
  microphone: '麦克风',
  other: '其他',
};

const deviceTypeColorMap: Record<string, string> = {
  projector: '#2E5FA6',
  whiteboard: '#4D80C2',
  'video-conference': '#7FA8D8',
  microphone: '#B5D0EA',
  other: '#DCE8F5',
};

function getTimeRangeDates(range: TimeRange): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  if (range === 'thisWeek') {
    const day = now.getDay() || 7;
    start.setDate(now.getDate() - (day - 1));
    end.setDate(start.getDate() + 6);
  } else if (range === 'lastWeek') {
    const day = now.getDay() || 7;
    start.setDate(now.getDate() - (day - 1) - 7);
    end.setDate(start.getDate() + 6);
  } else {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

type HeatmapCell = { roomId: string; roomName: string; hour: number; rate: number; count: number };

function generateHeatmapDataMock(roomsList: { id: string; name: string }[]): HeatmapCell[] {
  const data: HeatmapCell[] = [];
  roomsList.forEach((room, ri) => {
    hours.forEach((hour, hi) => {
      const baseRate = (ri + 1) * 8 + Math.sin(hi * 0.8) * 15;
      const rate = Math.min(100, Math.max(0, Math.round(baseRate + (Math.random() - 0.5) * 20)));
      const count = Math.round((rate / 100) * 5 + Math.random() * 2);
      data.push({ roomId: room.id, roomName: room.name, hour, rate, count });
    });
  });
  return data;
}

function buildHeatmapFromReport(
  report: DailyReport | undefined,
  roomsList: { id: string; name: string }[],
): HeatmapCell[] | null {
  if (!report || !report.roomUsageHeatmap || report.roomUsageHeatmap.length === 0) return null;
  const data: HeatmapCell[] = [];
  roomsList.forEach((room) => {
    hours.forEach((hour) => {
      const cell = report.roomUsageHeatmap.find(
        (c) => c.roomId === room.id && c.hour === hour,
      );
      const rate = cell ? Math.round(cell.rate * 100) : 0;
      const count = cell ? Math.max(1, Math.round((rate / 100) * 5)) : 0;
      data.push({ roomId: room.id, roomName: room.name, hour, rate, count });
    });
  });
  return data;
}

function buildHeatmapFromRoomUsage(
  roomUsageList: RoomUsageStats[],
  roomsList: { id: string; name: string }[],
): HeatmapCell[] | null {
  if (!roomUsageList || roomUsageList.length === 0) return null;
  const data: HeatmapCell[] = [];
  roomsList.forEach((room, ri) => {
    const stat = roomUsageList.find((r) => r.roomId === room.id);
    const baseRate = stat ? stat.averageUsageRate : (ri + 1) * 10;
    hours.forEach((hour, hi) => {
      const variance = Math.round(Math.sin(hi * 0.7) * 12 + (Math.random() - 0.5) * 10);
      const rate = Math.min(100, Math.max(0, Math.round(baseRate + variance)));
      const count = Math.round((rate / 100) * 5 + Math.random() * 2);
      data.push({ roomId: room.id, roomName: room.name, hour, rate, count });
    });
  });
  return data;
}

type BarItem = { name: string; rate: number };

function generateBarDataMock(roomsList: { id: string; name: string }[]): BarItem[] {
  return roomsList.map((room, i) => ({
    name: room.name,
    rate: Math.round(30 + i * 12 + (Math.random() - 0.5) * 10),
  }));
}

function buildBarDataFromUsage(usageList: RoomUsageStats[]): BarItem[] | null {
  if (!usageList || usageList.length === 0) return null;
  return usageList
    .map((u) => ({ name: u.roomName, rate: u.averageUsageRate }))
    .sort((a, b) => b.rate - a.rate);
}

type TimeoutTrendItem = { date: string; count: number };

function generateTimeoutTrendDataMock(): TimeoutTrendItem[] {
  const data: TimeoutTrendItem[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      count: Math.round(3 + Math.sin(i * 0.3) * 2 + Math.random() * 4),
    });
  }
  return data;
}

type DepartmentItem = { name: string; count: number };

function generateDepartmentDataMock(): DepartmentItem[] {
  return [
    { name: '信息技术部', count: 18 },
    { name: '市场部', count: 15 },
    { name: '人力资源部', count: 12 },
    { name: '财务部', count: 9 },
    { name: '产品部', count: 22 },
    { name: '运营部', count: 7 },
    { name: '销售部', count: 14 },
  ];
}

type TopTimeoutRoom = { rank: number; name: string; count: number; avgDuration: number };

function generateTopTimeoutRoomsMock(roomsList: { id: string; name: string }[]): TopTimeoutRoom[] {
  return roomsList
    .map((room, i) => ({
      rank: i + 1,
      name: room.name,
      count: Math.round(20 - i * 2 + Math.random() * 5),
      avgDuration: Math.round((15 + i * 3) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

type FaultPieItem = { name: string; value: number; color: string };

function generateFaultPieDataMock(): FaultPieItem[] {
  return [
    { name: '投影仪', value: 32, color: '#2E5FA6' },
    { name: '白板', value: 15, color: '#4D80C2' },
    { name: '视频会议', value: 24, color: '#7FA8D8' },
    { name: '麦克风', value: 18, color: '#B5D0EA' },
    { name: '其他', value: 11, color: '#DCE8F5' },
  ];
}

function buildFaultPieData(faults: DeviceFaultStats[]): FaultPieItem[] | null {
  if (!faults || faults.length === 0) return null;
  const typeCount = new Map<string, number>();
  faults.forEach((f) => {
    const label = deviceTypeLabelMap[f.deviceType] || f.deviceType || '其他';
    typeCount.set(label, (typeCount.get(label) || 0) + f.faultCount);
  });
  const arr = Array.from(typeCount.entries()).map(([name, value]) => ({
    name,
    value,
    color:
      Object.entries(deviceTypeLabelMap).find(([, l]) => l === name)?.[0]
        ? deviceTypeColorMap[
            Object.entries(deviceTypeLabelMap).find(([, l]) => l === name)![0]
          ]
        : '#DCE8F5',
  }));
  if (arr.length === 0) return null;
  return arr;
}

type FaultRankItem = {
  name: string;
  type: string;
  faultCount: number;
  avgRepairTime: number;
  faultRate: number;
};

function generateFaultRankDataMock(): FaultRankItem[] {
  const devices = [
    { name: '投影仪-A1', type: '投影仪' },
    { name: '视频会议-B2', type: '视频会议' },
    { name: '麦克风-C3', type: '麦克风' },
    { name: '投影仪-A3', type: '投影仪' },
    { name: '白板-D1', type: '白板' },
    { name: '视频会议-B1', type: '视频会议' },
    { name: '麦克风-C1', type: '麦克风' },
    { name: '投影仪-A2', type: '投影仪' },
  ];
  return devices.map((d, i) => ({
    ...d,
    faultCount: Math.round(15 - i * 1.5 + Math.random() * 3),
    avgRepairTime: Math.round((4 + i * 0.6) * 10) / 10,
    faultRate: Math.round(12 - i + Math.random() * 3),
  }));
}

function buildFaultRankData(faults: DeviceFaultStats[]): FaultRankItem[] | null {
  if (!faults || faults.length === 0) return null;
  const maxFault = Math.max(...faults.map((f) => f.faultCount), 1);
  return faults.map((f, i) => ({
    name: f.deviceName,
    type: deviceTypeLabelMap[f.deviceType] || f.deviceType || '其他',
    faultCount: f.faultCount,
    avgRepairTime: f.avgRepairTime,
    faultRate: Math.min(100, Math.round((f.faultCount / maxFault) * 20 + (10 - i) * 0.5)),
  }));
}

type BriefData = {
  date: string;
  totalBookings: number;
  completionRate: number;
  avgUsageRate: number;
  timeoutCount: number;
  faultCount: number;
};

function generateBriefDataMock(date: string): BriefData {
  return {
    date,
    totalBookings: 128,
    completionRate: 87.5,
    avgUsageRate: 62.3,
    timeoutCount: 9,
    faultCount: 4,
  };
}

function buildBriefData(report: DailyReport | undefined, date: string): BriefData | null {
  if (!report) return null;
  const completionRate =
    report.totalBookings > 0
      ? Math.round((report.completedBookings / report.totalBookings) * 1000) / 10
      : 0;
  return {
    date,
    totalBookings: report.totalBookings,
    completionRate,
    avgUsageRate: report.averageUsageRate,
    timeoutCount: report.releasedBookings,
    faultCount: report.deviceFaultCount,
  };
}

type HistoryBriefItem = {
  date: string;
  totalBookings: number;
  completionRate: number;
  pushed: boolean;
};

function generateHistoryBriefsMock(baseDate: string): HistoryBriefItem[] {
  const list: HistoryBriefItem[] = [];
  const base = new Date(baseDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    list.push({
      date: formatDate(d),
      totalBookings: Math.round(100 + Math.random() * 50),
      completionRate: Math.round((75 + Math.random() * 20) * 10) / 10,
      pushed: i > 0 && Math.random() > 0.3,
    });
  }
  return list;
}

function getHeatmapColor(rate: number): string {
  if (rate < 20) return 'bg-brand-50';
  if (rate < 40) return 'bg-brand-100';
  if (rate < 60) return 'bg-brand-200';
  if (rate < 80) return 'bg-brand-300';
  return 'bg-brand-400';
}

function getHeatmapTextColor(rate: number): string {
  return rate >= 60 ? 'text-white' : 'text-brand-800';
}

export default function Statistics() {
  const [activeTab, setActiveTab] = useState<MainTab>('usage');
  const [timeRange, setTimeRange] = useState<TimeRange>('thisWeek');
  const [briefDate, setBriefDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  });
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    data: HeatmapCell;
  } | null>(null);
  const { addToast } = useAppStore();

  const [rooms, setRooms] = useState<{ id: string; name: string }[]>(defaultRooms);
  const [roomsLoaded, setRoomsLoaded] = useState(false);

  const [loading, setLoading] = useState<Record<MainTab, boolean>>({
    usage: false,
    timeout: false,
    fault: false,
    brief: false,
  });

  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>(() =>
    generateHeatmapDataMock(defaultRooms),
  );
  const [barData, setBarData] = useState<BarItem[]>(() => generateBarDataMock(defaultRooms));
  const [timeoutTrendData, setTimeoutTrendData] = useState<TimeoutTrendItem[]>(() =>
    generateTimeoutTrendDataMock(),
  );
  const [departmentData, setDepartmentData] = useState<DepartmentItem[]>(() =>
    generateDepartmentDataMock(),
  );
  const [topTimeoutRooms, setTopTimeoutRooms] = useState<TopTimeoutRoom[]>(() =>
    generateTopTimeoutRoomsMock(defaultRooms),
  );
  const [faultPieData, setFaultPieData] = useState<FaultPieItem[]>(() =>
    generateFaultPieDataMock(),
  );
  const [faultRankData, setFaultRankData] = useState<FaultRankItem[]>(() =>
    generateFaultRankDataMock(),
  );
  const [briefData, setBriefData] = useState<BriefData>(() => generateBriefDataMock(briefDate));
  const [historyBriefs, setHistoryBriefs] = useState<HistoryBriefItem[]>(() =>
    generateHistoryBriefsMock(briefDate),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await roomService.getRooms({ status: 'active', pageSize: 100 });
        if (cancelled) return;
        if (resp && resp.items && resp.items.length > 0) {
          setRooms(
            resp.items.map((r: MeetingRoom) => ({ id: r.id, name: r.name })),
          );
        }
      } catch {
        // fallback defaultRooms
      } finally {
        if (!cancelled) setRoomsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadUsageData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, usage: true }));
    try {
      const { startDate, endDate } = getTimeRangeDates(timeRange);

      const results = await Promise.allSettled([
        statisticsService.getDailyReport(briefDate),
        statisticsService.getRoomUsageRanking(startDate, endDate, 10),
      ]);

      const [dailyResult, usageResult] = results;
      const dailyReport =
        dailyResult.status === 'fulfilled' ? dailyResult.value : undefined;
      const usageList: RoomUsageStats[] =
        usageResult.status === 'fulfilled' && usageResult.value
          ? usageResult.value
          : [];

      const heatmap =
        buildHeatmapFromReport(dailyReport, rooms) ||
        buildHeatmapFromRoomUsage(usageList, rooms) ||
        generateHeatmapDataMock(rooms);
      setHeatmapData(heatmap);

      const bar = buildBarDataFromUsage(usageList) || generateBarDataMock(rooms);
      setBarData(bar);
    } catch {
      setHeatmapData(generateHeatmapDataMock(rooms));
      setBarData(generateBarDataMock(rooms));
    } finally {
      setLoading((prev) => ({ ...prev, usage: false }));
    }
  }, [timeRange, briefDate, rooms]);

  const loadTimeoutData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, timeout: true }));
    try {
      setTimeoutTrendData(generateTimeoutTrendDataMock());
      setDepartmentData(generateDepartmentDataMock());
      setTopTimeoutRooms(generateTopTimeoutRoomsMock(rooms));
    } finally {
      setLoading((prev) => ({ ...prev, timeout: false }));
    }
  }, [rooms]);

  const loadFaultData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, fault: true }));
    try {
      const { startDate, endDate } = getTimeRangeDates(timeRange);
      const result = await Promise.allSettled([
        statisticsService.getDeviceFaultRanking(startDate, endDate, 20),
      ]);
      const faults: DeviceFaultStats[] =
        result[0].status === 'fulfilled' && result[0].value ? result[0].value : [];

      const pie = buildFaultPieData(faults) || generateFaultPieDataMock();
      setFaultPieData(pie);

      const rank = buildFaultRankData(faults) || generateFaultRankDataMock();
      setFaultRankData(rank);
    } catch {
      setFaultPieData(generateFaultPieDataMock());
      setFaultRankData(generateFaultRankDataMock());
    } finally {
      setLoading((prev) => ({ ...prev, fault: false }));
    }
  }, [timeRange]);

  const loadBriefData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, brief: true }));
    try {
      const results = await Promise.allSettled([
        statisticsService.getDailyReport(briefDate),
      ]);
      const report =
        results[0].status === 'fulfilled' ? results[0].value : undefined;
      const brief = buildBriefData(report, briefDate) || generateBriefDataMock(briefDate);
      setBriefData(brief);
      setHistoryBriefs(generateHistoryBriefsMock(briefDate));
    } catch {
      setBriefData(generateBriefDataMock(briefDate));
      setHistoryBriefs(generateHistoryBriefsMock(briefDate));
    } finally {
      setLoading((prev) => ({ ...prev, brief: false }));
    }
  }, [briefDate]);

  useEffect(() => {
    if (!roomsLoaded) return;
    if (activeTab === 'usage') loadUsageData();
  }, [activeTab, timeRange, roomsLoaded, loadUsageData]);

  useEffect(() => {
    if (!roomsLoaded) return;
    if (activeTab === 'timeout') loadTimeoutData();
  }, [activeTab, roomsLoaded, loadTimeoutData]);

  useEffect(() => {
    if (!roomsLoaded) return;
    if (activeTab === 'fault') loadFaultData();
  }, [activeTab, timeRange, roomsLoaded, loadFaultData]);

  useEffect(() => {
    if (!roomsLoaded) return;
    if (activeTab === 'brief') loadBriefData();
  }, [activeTab, briefDate, roomsLoaded, loadBriefData]);

  const handlePushBrief = () => {
    addToast({ type: 'success', message: '已推送到管理员手机' });
  };

  const shiftDate = (days: number) => {
    const d = new Date(briefDate);
    d.setDate(d.getDate() + days);
    setBriefDate(formatDate(d));
  };

  const isLoading = loading[activeTab];

  const LoadingOverlay = useMemo(
    () =>
      isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl z-10">
          <div className="flex items-center gap-3 text-brand-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">加载中...</span>
          </div>
        </div>
      ) : null,
    [isLoading],
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1.5 bg-brand-50/50 rounded-2xl w-fit">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white text-brand-700 shadow-card'
                  : 'text-brand-500 hover:text-brand-700 hover:bg-white/50',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'usage' && (
        <div className="space-y-6 relative">
          {LoadingOverlay}
          <div className="flex gap-2">
            {(
              [
                { key: 'thisWeek', label: '本周' },
                { key: 'lastWeek', label: '上周' },
                { key: 'thisMonth', label: '本月' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTimeRange(opt.key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
                  timeRange === opt.key
                    ? 'bg-brand-500 text-white border-brand-500 shadow-card'
                    : 'bg-white text-brand-700 border-brand-200 hover:border-brand-300 hover:bg-brand-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>周使用率热力图</CardTitle>
              <span className="text-sm text-brand-500">按小时统计各会议室使用率（8:00-21:00）</span>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="flex mb-2">
                    <div className="w-28 shrink-0" />
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="flex-1 text-center text-xs text-brand-500 font-medium"
                      >
                        {h}:00
                      </div>
                    ))}
                  </div>
                  {rooms.map((room) => (
                    <div key={room.id} className="flex items-center mb-1.5">
                      <div className="w-28 shrink-0 text-sm text-brand-700 font-medium pr-3 truncate">
                        {room.name}
                      </div>
                      {hours.map((hour) => {
                        const cell = heatmapData.find(
                          (d) => d.roomId === room.id && d.hour === hour,
                        );
                        if (!cell)
                          return (
                            <div
                              key={hour}
                              className="flex-1 h-8 mx-0.5 rounded bg-brand-50"
                            />
                          );
                        return (
                          <div
                            key={hour}
                            className={cn(
                              'flex-1 h-8 mx-0.5 rounded cursor-pointer transition-all duration-150 hover:scale-105 hover:shadow-md relative',
                              getHeatmapColor(cell.rate),
                            )}
                            onMouseEnter={(e) => {
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              const parentRect = (e.currentTarget.closest(
                                '.min-w-\\[700px\\]',
                              ) as HTMLElement)?.getBoundingClientRect();
                              setHoveredCell({
                                x: rect.left - (parentRect?.left || 0) + rect.width / 2,
                                y: rect.top - (parentRect?.top || 0) - 8,
                                data: cell,
                              });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <div
                              className={cn(
                                'h-full flex items-center justify-center text-xs font-semibold',
                                getHeatmapTextColor(cell.rate),
                              )}
                            >
                              {cell.rate}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {hoveredCell && (
                  <div
                    className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full"
                    style={{ left: hoveredCell.x, top: hoveredCell.y }}
                  >
                    <div className="bg-brand-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                      <div className="font-semibold mb-1">{hoveredCell.data.roomName}</div>
                      <div>
                        {hoveredCell.data.hour}:00 - {hoveredCell.data.hour + 1}:00
                      </div>
                      <div className="mt-1 pt-1 border-t border-white/20">
                        使用率:{' '}
                        <span className="text-brand-300 font-semibold">
                          {hoveredCell.data.rate}%
                        </span>
                      </div>
                      <div>
                        使用次数:{' '}
                        <span className="text-brand-300 font-semibold">
                          {hoveredCell.data.count}次
                        </span>
                      </div>
                      <div className="absolute left-1/2 -bottom-1 w-2 h-2 bg-brand-800 rotate-45 -translate-x-1/2" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-4 mt-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-brand-500">低</span>
                  <div className="flex gap-0.5">
                    <div className="w-6 h-4 rounded bg-brand-50 border border-brand-100" />
                    <div className="w-6 h-4 rounded bg-brand-100 border border-brand-200" />
                    <div className="w-6 h-4 rounded bg-brand-200 border border-brand-300" />
                    <div className="w-6 h-4 rounded bg-brand-300 border border-brand-400" />
                    <div className="w-6 h-4 rounded bg-brand-400 border border-brand-500" />
                  </div>
                  <span className="text-xs text-brand-500">高</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>各会议室使用率排行</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ left: 20, right: 60, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#DCE8F5"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: '#4D80C2', fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                      axisLine={{ stroke: '#DCE8F5' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: '#1E3A5F', fontSize: 12, fontWeight: 500 }}
                      axisLine={{ stroke: '#DCE8F5' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F1F33',
                        border: 'none',
                        borderRadius: 12,
                        color: 'white',
                        fontSize: 13,
                        boxShadow: '0 4px 12px rgba(30, 58, 95, 0.2)',
                      }}
                      formatter={(value: number) => [`${value}%`, '使用率']}
                      labelStyle={{ color: '#B5D0EA', marginBottom: 4 }}
                      cursor={{ fill: 'rgba(46, 95, 166, 0.05)' }}
                    />
                    <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={28}>
                      {barData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`rgba(46, 95, 166, ${0.55 + index * 0.09})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="relative h-80 -mt-80 pointer-events-none">
                {barData.map((entry, i) => {
                  const top = 10 + i * 48 + 10;
                  return (
                    <div
                      key={entry.name}
                      className="absolute right-2 text-sm font-semibold text-brand-700"
                      style={{ top }}
                    >
                      {entry.rate}%
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'timeout' && (
        <div className="space-y-6 relative">
          {LoadingOverlay}
          <Card>
            <CardHeader>
              <CardTitle>超时释放趋势（近30天）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeoutTrendData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE8F5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#4D80C2', fontSize: 11 }}
                      axisLine={{ stroke: '#DCE8F5' }}
                      interval={3}
                    />
                    <YAxis
                      tick={{ fill: '#4D80C2', fontSize: 12 }}
                      axisLine={{ stroke: '#DCE8F5' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F1F33',
                        border: 'none',
                        borderRadius: 12,
                        color: 'white',
                        fontSize: 13,
                        boxShadow: '0 4px 12px rgba(30, 58, 95, 0.2)',
                      }}
                      formatter={(value: number) => [`${value}次`, '超时释放']}
                      labelStyle={{ color: '#B5D0EA', marginBottom: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2E5FA6"
                      strokeWidth={3}
                      dot={{ fill: '#2E5FA6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#2E5FA6', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>按部门统计超时释放次数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={departmentData}
                      layout="vertical"
                      margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#DCE8F5"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: '#4D80C2', fontSize: 12 }}
                        axisLine={{ stroke: '#DCE8F5' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={85}
                        tick={{ fill: '#1E3A5F', fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#DCE8F5' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F1F33',
                          border: 'none',
                          borderRadius: 12,
                          color: 'white',
                          fontSize: 13,
                        }}
                        formatter={(value: number) => [`${value}次`, '释放次数']}
                        labelStyle={{ color: '#B5D0EA', marginBottom: 4 }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#7FA8D8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>超时会议室 Top10</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-100">
                        <th className="py-3 px-3 text-left text-xs font-semibold text-brand-500 uppercase">
                          排名
                        </th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-brand-500 uppercase">
                          会议室
                        </th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-brand-500 uppercase">
                          超时次数
                        </th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-brand-500 uppercase">
                          平均时长
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTimeoutRooms.map((room) => (
                        <tr
                          key={room.rank}
                          className="border-b border-brand-50 last:border-0 hover:bg-brand-50/50 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold',
                                room.rank === 1
                                  ? 'bg-danger-500 text-white'
                                  : room.rank === 2
                                  ? 'bg-warning-500 text-white'
                                  : room.rank === 3
                                  ? 'bg-brand-400 text-white'
                                  : 'bg-brand-100 text-brand-700',
                              )}
                            >
                              {room.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-sm font-medium text-brand-800">
                            {room.name}
                          </td>
                          <td className="py-3 px-3 text-sm text-right font-semibold text-brand-700">
                            {room.count}次
                          </td>
                          <td className="py-3 px-3 text-sm text-right text-brand-600">
                            {room.avgDuration}分钟
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'fault' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          {LoadingOverlay}
          <Card>
            <CardHeader>
              <CardTitle>设备故障类型占比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={faultPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {faultPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F1F33',
                        border: 'none',
                        borderRadius: 12,
                        color: 'white',
                        fontSize: 13,
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}次 (${Math.round(
                          (value /
                            faultPieData.reduce((s, a) => s + a.value, 0)) *
                            100,
                        )}%)`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(value: string) => (
                        <span className="text-sm text-brand-700 font-medium">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>设备故障排行榜</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-100">
                      <th className="py-3 px-2 text-left text-xs font-semibold text-brand-500 uppercase">
                        设备名
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-brand-500 uppercase">
                        类型
                      </th>
                      <th className="py-3 px-2 text-right text-xs font-semibold text-brand-500 uppercase">
                        故障次数
                      </th>
                      <th className="py-3 px-2 text-right text-xs font-semibold text-brand-500 uppercase">
                        平均修复
                      </th>
                      <th className="py-3 px-2 text-right text-xs font-semibold text-brand-500 uppercase">
                        故障率
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {faultRankData.map((d, i) => (
                      <tr
                        key={i}
                        className="border-b border-brand-50 last:border-0 hover:bg-brand-50/50 transition-colors"
                      >
                        <td className="py-3 px-2 text-sm font-medium text-brand-800">
                          {d.name}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="info">{d.type}</Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-semibold text-danger-500">
                          {d.faultCount}
                        </td>
                        <td className="py-3 px-2 text-sm text-right text-brand-600">
                          {d.avgRepairTime}h
                        </td>
                        <td className="py-3 px-2 text-sm text-right">
                          <span
                            className={cn(
                              'font-semibold',
                              d.faultRate >= 10
                                ? 'text-danger-500'
                                : d.faultRate >= 6
                                ? 'text-warning-500'
                                : 'text-success-600',
                            )}
                          >
                            {d.faultRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'brief' && (
        <div className="space-y-6 relative">
          {LoadingOverlay}
          <Card>
            <CardContent className="!pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="p-2 rounded-xl border border-brand-200 hover:bg-brand-50 transition-colors text-brand-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
                    <input
                      type="date"
                      value={briefDate}
                      onChange={(e) => setBriefDate(e.target.value)}
                      className="pl-10 pr-4 py-2.5 rounded-xl border border-brand-200 bg-white text-sm font-medium text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => shiftDate(1)}
                    className="p-2 rounded-xl border border-brand-200 hover:bg-brand-50 transition-colors text-brand-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  variant="secondary"
                  onClick={() => loadBriefData()}
                >
                  刷新数据
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Card padding="sm" className="text-center">
              <div className="py-3">
                <div className="text-xs text-brand-500 mb-2">日期</div>
                <div className="text-lg font-bold text-brand-800">
                  {briefData.date.slice(5)}
                </div>
              </div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="py-3">
                <div className="text-xs text-brand-500 mb-2">总预订数</div>
                <div className="text-2xl font-bold text-brand-700">
                  {briefData.totalBookings}
                </div>
              </div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="py-3">
                <div className="text-xs text-brand-500 mb-2">完成率</div>
                <div className="text-2xl font-bold text-success-600">
                  {briefData.completionRate}%
                </div>
              </div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="py-3">
                <div className="text-xs text-brand-500 mb-2">平均使用率</div>
                <div className="text-2xl font-bold text-brand-600">
                  {briefData.avgUsageRate}%
                </div>
              </div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="py-3">
                <div className="text-xs text-brand-500 mb-2">超时数</div>
                <div className="text-2xl font-bold text-warning-500">
                  {briefData.timeoutCount}
                </div>
              </div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="py-3">
                <div className="text-xs text-brand-500 mb-2">设备故障</div>
                <div className="text-2xl font-bold text-danger-500">
                  {briefData.faultCount}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>运营简报</CardTitle>
              <Button leftIcon={<Send className="h-4 w-4" />} onClick={handlePushBrief}>
                模拟推送
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-2xl p-8">
                <div className="text-center mb-6">
                  <div className="text-2xl font-bold text-brand-800 mb-2">每日运营简报</div>
                  <div className="text-brand-500">{briefData.date}</div>
                </div>
                <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="text-sm text-brand-500 mb-1">今日总预订</div>
                    <div className="text-3xl font-bold text-brand-800">
                      {briefData.totalBookings}{' '}
                      <span className="text-base font-normal text-brand-500">次</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="text-sm text-brand-500 mb-1">预订完成率</div>
                    <div className="text-3xl font-bold text-success-600">
                      {briefData.completionRate}
                      <span className="text-base font-normal">%</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="text-sm text-brand-500 mb-1">平均使用率</div>
                    <div className="text-3xl font-bold text-brand-600">
                      {briefData.avgUsageRate}
                      <span className="text-base font-normal">%</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="text-sm text-brand-500 mb-1">异常统计</div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-xl font-bold text-warning-500">
                        超时 {briefData.timeoutCount}
                      </div>
                      <div className="text-xl font-bold text-danger-500">
                        故障 {briefData.faultCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>历史简报</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-100">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-brand-500 uppercase">
                        日期
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-brand-500 uppercase">
                        预订数
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-brand-500 uppercase">
                        完成率
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-brand-500 uppercase">
                        推送状态
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-brand-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyBriefs.map((b) => (
                      <tr
                        key={b.date}
                        className={cn(
                          'border-b border-brand-50 last:border-0 transition-colors cursor-pointer',
                          b.date === briefDate
                            ? 'bg-brand-50/80'
                            : 'hover:bg-brand-50/40',
                        )}
                        onClick={() => setBriefDate(b.date)}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-brand-800">
                          {b.date}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-brand-700">
                          {b.totalBookings}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span
                            className={cn(
                              'font-semibold',
                              b.completionRate >= 90
                                ? 'text-success-600'
                                : b.completionRate >= 80
                                ? 'text-brand-600'
                                : 'text-warning-500',
                            )}
                          >
                            {b.completionRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {b.pushed ? (
                            <Badge variant="success" dot>
                              已推送
                            </Badge>
                          ) : (
                            <Badge variant="default" dot>
                              未推送
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBriefDate(b.date);
                            }}
                          >
                            查看
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
