import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal, { ModalFooter } from '../components/common/Modal';
import FormInput from '../components/common/FormInput';
import FormSelect from '../components/common/FormSelect';
import { useUi, useAuth } from '../store';
import { deviceService } from '../services/deviceService';
import { roomService } from '../services/roomService';
import { formatDate, formatDateTime } from '../utils';
import type { Device, DeviceType, DeviceStatus, MeetingRoom, MaintenanceRecord, MaintenanceType, MaintenanceStatus } from '../types';
import {
  AlertTriangle,
  Wrench,
  Search,
  Filter,
  Plus,
  Edit3,
  ShieldAlert,
  CalendarClock,
  ListChecks,
  ListOrdered,
  Projector,
  Presentation,
  MonitorSpeaker,
  Radio,
  Package,
  MapPin,
  AlertCircle,
  Clock,
  User,
  StickyNote,
  CheckCircle2,
  XCircle,
  Clock3,
} from 'lucide-react';

interface DeviceWithRoom extends Device {
  roomName?: string;
}

interface MaintenanceWithDetails extends MaintenanceRecord {
  deviceName?: string;
  operatorName?: string;
}

const mockDevices: DeviceWithRoom[] = [
  {
    id: 'dev-001',
    name: 'EPSON投影仪-3F-A',
    type: 'projector',
    roomId: 'room-001',
    status: 'normal',
    faultCount: 1,
    lastMaintenanceDate: '2026-05-15',
    nextMaintenanceDate: '2026-07-15',
    roomName: '星辰会议室',
  },
  {
    id: 'dev-002',
    name: 'SmartBoard白板-3F-B',
    type: 'whiteboard',
    roomId: 'room-002',
    status: 'normal',
    faultCount: 0,
    lastMaintenanceDate: '2026-05-20',
    nextMaintenanceDate: '2026-07-20',
    roomName: '云端会议室',
  },
  {
    id: 'dev-003',
    name: 'Polycom视频会议-3F-A',
    type: 'video-conference',
    roomId: 'room-001',
    status: 'faulty',
    faultCount: 3,
    lastMaintenanceDate: '2026-04-10',
    nextMaintenanceDate: '2026-06-25',
    roomName: '星辰会议室',
  },
  {
    id: 'dev-004',
    name: 'Yealink麦克风-3F-A',
    type: 'microphone',
    roomId: 'room-003',
    status: 'maintenance',
    faultCount: 2,
    lastMaintenanceDate: '2026-06-10',
    nextMaintenanceDate: '2026-08-10',
    roomName: '绿洲会议室',
  },
  {
    id: 'dev-005',
    name: '咖啡机-5F',
    type: 'other',
    roomId: 'room-003',
    status: 'normal',
    faultCount: 0,
    lastMaintenanceDate: '2026-06-01',
    nextMaintenanceDate: '2026-07-01',
    roomName: '绿洲会议室',
  },
  {
    id: 'dev-006',
    name: '智能照明系统-1F',
    type: 'other',
    roomId: 'room-004',
    status: 'normal',
    faultCount: 1,
    lastMaintenanceDate: '2026-05-28',
    nextMaintenanceDate: '2026-07-28',
    roomName: '创智报告厅',
  },
  {
    id: 'dev-007',
    name: '投影仪-2F',
    type: 'projector',
    roomId: 'room-005',
    status: 'faulty',
    faultCount: 4,
    lastMaintenanceDate: '2026-03-15',
    nextMaintenanceDate: '2026-06-22',
    roomName: '灵感站',
  },
];

const mockMaintenance: MaintenanceWithDetails[] = [
  {
    id: 'mt-001',
    deviceId: 'dev-003',
    scheduledDate: '2026-06-22',
    type: 'corrective',
    operatorId: 'user-101',
    notes: '视频会议系统无法连接，需要检修',
    status: 'scheduled',
    deviceName: 'Polycom视频会议-3F-A',
    operatorName: '运维-李工',
  },
  {
    id: 'mt-002',
    deviceId: 'dev-004',
    scheduledDate: '2026-06-20',
    type: 'corrective',
    operatorId: 'user-102',
    notes: '麦克风出现杂音，更换音频线缆',
    completedDate: '2026-06-20',
    status: 'completed',
    deviceName: 'Yealink麦克风-3F-A',
    operatorName: '运维-王工',
  },
  {
    id: 'mt-003',
    deviceId: 'dev-007',
    scheduledDate: '2026-06-18',
    type: 'preventive',
    operatorId: 'user-101',
    notes: '季度预防性维护，清洁镜头和更换滤网',
    status: 'overdue',
    deviceName: '投影仪-2F',
    operatorName: '运维-李工',
  },
  {
    id: 'mt-004',
    deviceId: 'dev-001',
    scheduledDate: '2026-07-15',
    type: 'preventive',
    operatorId: 'user-103',
    notes: '季度例行检查',
    status: 'scheduled',
    deviceName: 'EPSON投影仪-3F-A',
    operatorName: '运维-张工',
  },
  {
    id: 'mt-005',
    deviceId: 'dev-005',
    scheduledDate: '2026-07-01',
    type: 'preventive',
    operatorId: 'user-102',
    notes: '清洁和除垢',
    status: 'scheduled',
    deviceName: '咖啡机-5F',
    operatorName: '运维-王工',
  },
];

const deviceTypeMap: Record<DeviceType, { label: string; icon: typeof Projector; color: string }> = {
  projector: { label: '投影仪', icon: Projector, color: 'text-indigo-600' },
  whiteboard: { label: '白板', icon: Presentation, color: 'text-sky-600' },
  'video-conference': { label: '视频会议', icon: MonitorSpeaker, color: 'text-emerald-600' },
  microphone: { label: '麦克风', icon: Radio, color: 'text-amber-600' },
  other: { label: '其他', icon: Package, color: 'text-brand-600' },
};

const deviceStatusMap: Record<DeviceStatus, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  normal: { label: '正常', variant: 'success' },
  faulty: { label: '故障', variant: 'danger' },
  maintenance: { label: '维护中', variant: 'warning' },
};

const maintenanceTypeMap: Record<MaintenanceType, { label: string; color: string }> = {
  preventive: { label: '预防性', color: 'text-brand-600 bg-brand-50' },
  corrective: { label: '修复性', color: 'text-danger-600 bg-danger-50' },
};

const maintenanceStatusMap: Record<MaintenanceStatus, { label: string; variant: 'warning' | 'success' | 'danger'; icon: typeof Clock3 }> = {
  scheduled: { label: '待处理', variant: 'warning', icon: Clock3 },
  completed: { label: '已完成', variant: 'success', icon: CheckCircle2 },
  overdue: { label: '逾期', variant: 'danger', icon: XCircle },
};

interface DeviceFormData {
  id?: string;
  name: string;
  type: DeviceType;
  roomId: string;
}

interface MaintenanceFormData {
  deviceId: string;
  type: MaintenanceType;
  scheduledDate: string;
  operatorId: string;
  notes: string;
}

export default function DeviceManage() {
  const { user } = useAuth();
  const { addToast } = useUi();
  const [activeTab, setActiveTab] = useState<'devices' | 'maintenance'>('devices');
  const [devices, setDevices] = useState<DeviceWithRoom[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceWithDetails[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState<DeviceFormData>({ name: '', type: 'projector', roomId: '' });
  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormData>({
    deviceId: '',
    type: 'preventive',
    scheduledDate: formatDate(new Date()),
    operatorId: 'user-101',
    notes: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const roomsRes = await roomService.getRooms({ pageSize: 100 });
      setRooms(roomsRes.items.length > 0 ? roomsRes.items : [
        { id: 'room-001', name: '星辰会议室', floor: '3F', capacity: 15, equipmentIds: [], status: 'active' },
        { id: 'room-002', name: '云端会议室', floor: '3F', capacity: 10, equipmentIds: [], status: 'active' },
        { id: 'room-003', name: '绿洲会议室', floor: '5F', capacity: 8, equipmentIds: [], status: 'active' },
        { id: 'room-004', name: '创智报告厅', floor: '1F', capacity: 50, equipmentIds: [], status: 'active' },
        { id: 'room-005', name: '灵感站', floor: '2F', capacity: 6, equipmentIds: [], status: 'active' },
      ]);
    } catch {
      setRooms([
        { id: 'room-001', name: '星辰会议室', floor: '3F', capacity: 15, equipmentIds: [], status: 'active' },
        { id: 'room-002', name: '云端会议室', floor: '3F', capacity: 10, equipmentIds: [], status: 'active' },
        { id: 'room-003', name: '绿洲会议室', floor: '5F', capacity: 8, equipmentIds: [], status: 'active' },
        { id: 'room-004', name: '创智报告厅', floor: '1F', capacity: 50, equipmentIds: [], status: 'active' },
        { id: 'room-005', name: '灵感站', floor: '2F', capacity: 6, equipmentIds: [], status: 'active' },
      ]);
    }

    try {
      const devicesRes = await deviceService.getDevices({ pageSize: 100 });
      const roomNameMap: Record<string, string> = {};
      rooms.forEach((r) => (roomNameMap[r.id] = r.name));
      const enriched = devicesRes.items.map((d) => ({
        ...d,
        roomName: d.roomId ? roomNameMap[d.roomId] : '未分配',
      }));
      setDevices(enriched.length > 0 ? enriched : mockDevices);
    } catch {
      setDevices(mockDevices);
    }

    setMaintenance(mockMaintenance);
    setLoading(false);
  }

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (filterType && d.type !== filterType) return false;
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterRoom && d.roomId !== filterRoom) return false;
      return true;
    });
  }, [devices, filterType, filterStatus, filterRoom]);

  const sortedMaintenance = useMemo(() => {
    return [...maintenance].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [maintenance]);

  function openEditDevice(device: DeviceWithRoom) {
    setDeviceForm({
      id: device.id,
      name: device.name,
      type: device.type,
      roomId: device.roomId || '',
    });
    setIsEditingDevice(true);
    setDeviceModalOpen(true);
  }

  function openCreateDevice() {
    setDeviceForm({ name: '', type: 'projector', roomId: '' });
    setIsEditingDevice(false);
    setDeviceModalOpen(true);
  }

  async function handleSubmitDevice() {
    if (!deviceForm.name.trim()) {
      addToast({ type: 'warning', message: '请输入设备名称' });
      return;
    }
    setSubmitting(true);
    try {
      if (isEditingDevice && deviceForm.id) {
        await deviceService.updateDevice(deviceForm.id, deviceForm);
        addToast({ type: 'success', message: '设备已更新' });
      } else {
        await deviceService.createDevice(deviceForm);
        addToast({ type: 'success', message: '设备已创建' });
      }
      await loadData();
      setDeviceModalOpen(false);
    } catch {
      addToast({ type: 'info', message: `模拟：${isEditingDevice ? '已更新' : '已创建'}设备` });
      if (isEditingDevice && deviceForm.id) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceForm.id ? { ...d, ...deviceForm } : d
          )
        );
      } else {
        const newDevice: DeviceWithRoom = {
          id: `dev-${Date.now()}`,
          ...deviceForm,
          status: 'normal',
          faultCount: 0,
          roomName: rooms.find((r) => r.id === deviceForm.roomId)?.name || '未分配',
        };
        setDevices((prev) => [...prev, newDevice]);
      }
      setDeviceModalOpen(false);
    }
    setSubmitting(false);
  }

  async function handleReportFault(device: DeviceWithRoom) {
    try {
      await deviceService.updateDeviceStatus(device.id, 'faulty');
      addToast({ type: 'success', message: '已上报故障' });
    } catch {
      addToast({ type: 'info', message: '模拟：已上报故障' });
    }
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id
          ? { ...d, status: 'faulty', faultCount: d.faultCount + 1 }
          : d
      )
    );
  }

  function openScheduleMaintenance(device?: DeviceWithRoom) {
    setMaintenanceForm({
      deviceId: device?.id || '',
      type: 'preventive',
      scheduledDate: formatDate(new Date()),
      operatorId: 'user-101',
      notes: '',
    });
    setMaintenanceModalOpen(true);
  }

  async function handleSubmitMaintenance() {
    if (!maintenanceForm.deviceId) {
      addToast({ type: 'warning', message: '请选择设备' });
      return;
    }
    if (!maintenanceForm.scheduledDate) {
      addToast({ type: 'warning', message: '请选择计划日期' });
      return;
    }
    setSubmitting(true);
    const device = devices.find((d) => d.id === maintenanceForm.deviceId);
    const newRecord: MaintenanceWithDetails = {
      id: `mt-${Date.now()}`,
      deviceId: maintenanceForm.deviceId,
      scheduledDate: maintenanceForm.scheduledDate,
      type: maintenanceForm.type,
      operatorId: maintenanceForm.operatorId,
      notes: maintenanceForm.notes,
      status: 'scheduled',
      deviceName: device?.name,
      operatorName: '运维-李工',
    };
    try {
      await deviceService.scheduleMaintenance(
        maintenanceForm.deviceId,
        maintenanceForm.scheduledDate,
        maintenanceForm.type
      );
      addToast({ type: 'success', message: '维护计划已创建' });
    } catch {
      addToast({ type: 'info', message: '模拟：维护计划已创建' });
    }
    setMaintenance((prev) => [...prev, newRecord]);
    setMaintenanceModalOpen(false);
    setSubmitting(false);
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-warning-500 mb-4" />
            <h2 className="text-xl font-semibold text-brand-800 mb-2">无访问权限</h2>
            <p className="text-brand-500">该页面仅系统管理员可访问</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const typeOptions = [
    { value: '', label: '全部类型' },
    ...Object.entries(deviceTypeMap).map(([k, v]) => ({ value: k, label: v.label })),
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    ...Object.entries(deviceStatusMap).map(([k, v]) => ({ value: k, label: v.label })),
  ];

  const roomOptions = [
    { value: '', label: '全部会议室' },
    ...rooms.map((r) => ({ value: r.id, label: r.name })),
  ];

  const deviceTypeFormOptions = Object.entries(deviceTypeMap).map(([k, v]) => ({
    value: k,
    label: v.label,
  }));

  const deviceSelectOptions = devices.map((d) => ({ value: d.id, label: d.name }));
  const operatorOptions = [
    { value: 'user-101', label: '运维-李工' },
    { value: 'user-102', label: '运维-王工' },
    { value: 'user-103', label: '运维-张工' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">设备管理</h1>
            <p className="text-sm text-brand-500 mt-1">管理所有设备档案和维护排期</p>
          </div>
          <Button
            leftIcon={activeTab === 'devices' ? <Plus className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            onClick={() => (activeTab === 'devices' ? openCreateDevice() : openScheduleMaintenance())}
          >
            {activeTab === 'devices' ? '新增设备' : '新建维护计划'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1 bg-brand-50 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('devices')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'devices'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-brand-500 hover:text-brand-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  设备档案
                </span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'maintenance'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-brand-500 hover:text-brand-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  维护排期
                </span>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'devices' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 p-4 bg-brand-50/50 rounded-xl">
                  <div className="flex items-center gap-2 text-brand-500">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">筛选：</span>
                  </div>
                  <FormSelect
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    options={typeOptions}
                    className="w-40"
                  />
                  <FormSelect
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    options={statusOptions}
                    className="w-40"
                  />
                  <FormSelect
                    value={filterRoom}
                    onChange={(e) => setFilterRoom(e.target.value)}
                    options={roomOptions}
                    className="w-48"
                  />
                  <div className="flex-1" />
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
                    <input
                      placeholder="搜索设备..."
                      className="h-10 w-64 rounded-xl border border-brand-200 bg-white pl-10 pr-4 text-sm text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-100">
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">设备名称</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">类型</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">所属会议室</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">状态</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">故障次数</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">上次维护</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">下次维护</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-brand-500">加载中...</td>
                        </tr>
                      ) : filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-brand-500">暂无设备</td>
                        </tr>
                      ) : (
                        filteredDevices.map((device) => {
                          const typeInfo = deviceTypeMap[device.type];
                          const TypeIcon = typeInfo.icon;
                          const statusInfo = deviceStatusMap[device.status];
                          return (
                            <tr key={device.id} className="border-b border-brand-50 hover:bg-brand-50/50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 ${typeInfo.color}`}>
                                    <TypeIcon className="h-4.5 w-4.5" />
                                  </div>
                                  <span className="font-medium text-brand-800">{device.name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm text-brand-600">{typeInfo.label}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-1.5 text-sm text-brand-600">
                                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                                  {device.roomName || '未分配'}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <Badge variant={statusInfo.variant} dot>
                                  {statusInfo.label}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`text-sm ${device.faultCount > 2 ? 'text-danger-600 font-medium' : 'text-brand-600'}`}>
                                  {device.faultCount}次
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm text-brand-500">
                                  {device.lastMaintenanceDate || '-'}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-brand-400" />
                                  <span className="text-sm text-brand-500">
                                    {device.nextMaintenanceDate || '-'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    leftIcon={<Edit3 className="h-4 w-4" />}
                                    onClick={() => openEditDevice(device)}
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    leftIcon={<ShieldAlert className="h-4 w-4" />}
                                    onClick={() => handleReportFault(device)}
                                    disabled={device.status === 'faulty'}
                                  >
                                    报修
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    leftIcon={<Wrench className="h-4 w-4" />}
                                    onClick={() => openScheduleMaintenance(device)}
                                  >
                                    安排维护
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {loading ? (
                <div className="py-12 text-center text-brand-500">加载中...</div>
              ) : sortedMaintenance.length === 0 ? (
                <div className="py-12 text-center text-brand-500">暂无维护计划</div>
              ) : (
                sortedMaintenance.map((record) => {
                  const statusInfo = maintenanceStatusMap[record.status];
                  const StatusIcon = statusInfo.icon;
                  const typeInfo = maintenanceTypeMap[record.type];
                  return (
                    <Card key={record.id} padding="md" className="hover:shadow-card-hover transition-shadow">
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                                <Wrench className="h-5 w-5 text-brand-600" />
                              </div>
                              <div>
                                <p className="font-medium text-brand-800">{record.deviceName}</p>
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                                  {typeInfo.label}维护
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-[160px]">
                            <CalendarClock className="h-4 w-4 text-brand-400" />
                            <span className="text-sm text-brand-600">
                              计划：{record.scheduledDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-[140px]">
                            <User className="h-4 w-4 text-brand-400" />
                            <span className="text-sm text-brand-600">
                              {record.operatorName}
                            </span>
                          </div>
                          <div className="min-w-[100px]">
                            <Badge variant={statusInfo.variant} dot>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {record.notes && (
                            <div className="flex items-start gap-1.5 min-w-[200px] max-w-md">
                              <StickyNote className="h-4 w-4 text-brand-400 mt-0.5" />
                              <span className="text-xs text-brand-500 line-clamp-2">
                                {record.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        title={isEditingDevice ? '编辑设备' : '新增设备'}
        size="md"
        footer={
          <ModalFooter
            onCancel={() => setDeviceModalOpen(false)}
            onConfirm={handleSubmitDevice}
            confirmText={isEditingDevice ? '保存修改' : '创建设备'}
            confirmLoading={submitting}
          />
        }
      >
        <div className="space-y-4">
          <FormInput
            label="设备名称"
            required
            value={deviceForm.name}
            onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
            placeholder="如：EPSON投影仪-3F-A"
          />
          <FormSelect
            label="设备类型"
            required
            value={deviceForm.type}
            onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value as DeviceType })}
            options={deviceTypeFormOptions}
          />
          <FormSelect
            label="所属会议室"
            value={deviceForm.roomId}
            onChange={(e) => setDeviceForm({ ...deviceForm, roomId: e.target.value })}
            options={[{ value: '', label: '未分配' }, ...rooms.map((r) => ({ value: r.id, label: r.name }))]}
          />
        </div>
      </Modal>

      <Modal
        open={maintenanceModalOpen}
        onClose={() => setMaintenanceModalOpen(false)}
        title="新建维护计划"
        size="md"
        footer={
          <ModalFooter
            onCancel={() => setMaintenanceModalOpen(false)}
            onConfirm={handleSubmitMaintenance}
            confirmText="创建计划"
            confirmLoading={submitting}
          />
        }
      >
        <div className="space-y-4">
          <FormSelect
            label="选择设备"
            required
            value={maintenanceForm.deviceId}
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, deviceId: e.target.value })}
            options={deviceSelectOptions}
          />
          <FormSelect
            label="维护类型"
            required
            value={maintenanceForm.type}
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value as MaintenanceType })}
            options={[
              { value: 'preventive', label: '预防性维护' },
              { value: 'corrective', label: '修复性维护' },
            ]}
          />
          <FormInput
            label="计划日期"
            type="date"
            required
            value={maintenanceForm.scheduledDate}
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduledDate: e.target.value })}
          />
          <FormSelect
            label="负责人"
            required
            value={maintenanceForm.operatorId}
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, operatorId: e.target.value })}
            options={operatorOptions}
          />
          <div>
            <label className="block text-sm font-medium text-brand-800 mb-1.5">备注</label>
            <textarea
              value={maintenanceForm.notes}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
              rows={3}
              placeholder="维护内容说明..."
              className="w-full rounded-xl border border-brand-200 px-4 py-3 text-sm text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300 transition-all"
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
