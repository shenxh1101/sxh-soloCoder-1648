import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal, { ModalFooter } from '../components/common/Modal';
import FormInput from '../components/common/FormInput';
import FormSelect from '../components/common/FormSelect';
import { useUi, useAuth } from '../store';
import { workOrderService } from '../services/workOrderService';
import { deviceService } from '../services/deviceService';
import { formatDateTime } from '../utils';
import type { WorkOrder, WorkOrderStatus, Device } from '../types';
import {
  FileText,
  Plus,
  Wrench,
  Clock,
  CheckCircle,
  ListOrdered,
  AlertCircle,
  Package,
  User,
  Calendar,
  QrCode,
  Eye,
  ChevronRight,
  ClipboardList,
  CircleDot,
  CircleCheck,
  ArrowRight,
} from 'lucide-react';

interface WorkOrderWithDetails extends WorkOrder {
  deviceName?: string;
  reporterName?: string;
  assigneeName?: string;
}

const mockDevices: Device[] = [
  { id: 'dev-001', name: 'EPSON投影仪-3F-A', type: 'projector', status: 'normal', faultCount: 1, roomId: 'room-001' },
  { id: 'dev-002', name: 'SmartBoard白板-3F-B', type: 'whiteboard', status: 'normal', faultCount: 0, roomId: 'room-002' },
  { id: 'dev-003', name: 'Polycom视频会议-3F-A', type: 'video-conference', status: 'faulty', faultCount: 3, roomId: 'room-001' },
  { id: 'dev-004', name: 'Yealink麦克风-3F-A', type: 'microphone', status: 'maintenance', faultCount: 2, roomId: 'room-003' },
  { id: 'dev-005', name: '咖啡机-5F', type: 'other', status: 'normal', faultCount: 0, roomId: 'room-003' },
  { id: 'dev-007', name: '投影仪-2F', type: 'projector', status: 'faulty', faultCount: 4, roomId: 'room-005' },
];

const mockWorkOrders: WorkOrderWithDetails[] = [
  {
    id: 'wo-001',
    deviceId: 'dev-003',
    reporterId: 'user-002',
    assigneeId: 'user-101',
    faultType: '网络问题',
    description: '视频会议系统无法连接到服务器，提示网络错误',
    status: 'processing',
    createdAt: '2026-06-20T09:15:00',
    assignedAt: '2026-06-20T09:30:00',
    deviceName: 'Polycom视频会议-3F-A',
    reporterName: '李四',
    assigneeName: '运维-李工',
  },
  {
    id: 'wo-002',
    deviceId: 'dev-007',
    reporterId: 'user-003',
    faultType: '显示异常',
    description: '投影仪画面偏黄，色彩失真严重',
    status: 'pending',
    createdAt: '2026-06-20T10:45:00',
    deviceName: '投影仪-2F',
    reporterName: '王五',
  },
  {
    id: 'wo-003',
    deviceId: 'dev-004',
    reporterId: 'user-004',
    assigneeId: 'user-102',
    faultType: '声音问题',
    description: '麦克风有杂音，对方听不清我们的声音',
    status: 'completed',
    createdAt: '2026-06-20T08:00:00',
    assignedAt: '2026-06-20T08:15:00',
    completedAt: '2026-06-20T09:45:00',
    confirmCode: '872361',
    deviceName: 'Yealink麦克风-3F-A',
    reporterName: '赵六',
    assigneeName: '运维-王工',
  },
  {
    id: 'wo-004',
    deviceId: 'dev-001',
    reporterId: 'user-005',
    faultType: '无法开机',
    description: '投影仪按电源键无反应，指示灯不亮',
    status: 'pending',
    createdAt: '2026-06-20T11:20:00',
    deviceName: 'EPSON投影仪-3F-A',
    reporterName: '钱七',
  },
  {
    id: 'wo-005',
    deviceId: 'dev-005',
    reporterId: 'user-006',
    assigneeId: 'user-102',
    faultType: '其他',
    description: '咖啡机出水量小，怀疑水垢堵塞',
    status: 'assigned',
    createdAt: '2026-06-20T07:30:00',
    assignedAt: '2026-06-20T08:00:00',
    deviceName: '咖啡机-5F',
    reporterName: '孙八',
    assigneeName: '运维-王工',
  },
  {
    id: 'wo-006',
    deviceId: 'dev-002',
    reporterId: 'user-002',
    assigneeId: 'user-103',
    faultType: '显示异常',
    description: '白板触摸不灵敏，部分区域无反应',
    status: 'processing',
    createdAt: '2026-06-19T14:00:00',
    assignedAt: '2026-06-19T14:30:00',
    deviceName: 'SmartBoard白板-3F-B',
    reporterName: '李四',
    assigneeName: '运维-张工',
  },
  {
    id: 'wo-007',
    deviceId: 'dev-003',
    reporterId: 'user-007',
    assigneeId: 'user-101',
    faultType: '网络问题',
    description: '远程参与方无法听到我方声音',
    status: 'completed',
    createdAt: '2026-06-18T10:00:00',
    assignedAt: '2026-06-18T10:15:00',
    completedAt: '2026-06-18T11:30:00',
    confirmCode: '452189',
    deviceName: 'Polycom视频会议-3F-A',
    reporterName: '周九',
    assigneeName: '运维-李工',
  },
];

const workOrderStatusMap: Record<WorkOrderStatus, { label: string; variant: 'warning' | 'info' | 'default' | 'success' | 'danger' }> = {
  pending: { label: '待处理', variant: 'warning' },
  assigned: { label: '已分配', variant: 'info' },
  processing: { label: '处理中', variant: 'default' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'danger' },
};

const faultTypeOptions = [
  { value: '无法开机', label: '无法开机' },
  { value: '显示异常', label: '显示异常' },
  { value: '声音问题', label: '声音问题' },
  { value: '网络问题', label: '网络问题' },
  { value: '其他', label: '其他' },
];

const assigneeOptions = [
  { value: '', label: '未分配' },
  { value: 'user-101', label: '运维-李工' },
  { value: 'user-102', label: '运维-王工' },
  { value: 'user-103', label: '运维-张工' },
];

const assigneeNameMap: Record<string, string> = {
  'user-101': '运维-李工',
  'user-102': '运维-王工',
  'user-103': '运维-张工',
};

interface CreateFormData {
  deviceId: string;
  faultType: string;
  description: string;
}

export default function WorkOrders() {
  const { user } = useAuth();
  const { addToast } = useUi();
  const [workOrders, setWorkOrders] = useState<WorkOrderWithDetails[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormData>({
    deviceId: '',
    faultType: '无法开机',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderWithDetails | null>(null);
  const [assignTo, setAssignTo] = useState<string>('');
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [generatedConfirmCode, setGeneratedConfirmCode] = useState('');

  const isAdmin = user?.role === 'admin';
  const currentUserId = user?.id;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const devicesRes = await deviceService.getDevices({ pageSize: 100 });
      setDevices(devicesRes.items.length > 0 ? devicesRes.items : mockDevices);
    } catch {
      setDevices(mockDevices);
    }

    try {
      const res = isAdmin
        ? await workOrderService.getWorkOrders({ pageSize: 100 })
        : await workOrderService.getMyReported({ pageSize: 100 });
      const deviceNameMap: Record<string, string> = {};
      devices.forEach((d) => (deviceNameMap[d.id] = d.name));
      const enriched = res.items.map((wo) => ({
        ...wo,
        deviceName: deviceNameMap[wo.deviceId] || wo.deviceId,
        reporterName: '提交人',
        assigneeName: wo.assigneeId ? assigneeNameMap[wo.assigneeId] : undefined,
      }));
      setWorkOrders(enriched.length > 0 ? enriched : mockWorkOrders);
    } catch {
      setWorkOrders(mockWorkOrders);
    }
    setLoading(false);
  }

  const displayedOrders = useMemo(() => {
    let list = isAdmin ? workOrders : workOrders.filter((wo) => wo.reporterId === currentUserId);
    if (statusFilter) {
      list = list.filter((wo) => wo.status === statusFilter);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [workOrders, isAdmin, currentUserId, statusFilter]);

  const stats = useMemo(() => {
    const all = isAdmin ? workOrders : workOrders.filter((wo) => wo.reporterId === currentUserId);
    const today = formatDateTime(new Date()).slice(0, 10);
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    return {
      pending: all.filter((wo) => wo.status === 'pending').length,
      processing: all.filter((wo) => wo.status === 'assigned' || wo.status === 'processing').length,
      todayCompleted: all.filter((wo) => {
        if (!wo.completedAt) return false;
        return wo.completedAt.slice(0, 10) === today;
      }).length,
      monthTotal: all.filter((wo) => {
        const d = new Date(wo.createdAt);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length,
    };
  }, [workOrders, isAdmin, currentUserId]);

  function openDetail(order: WorkOrderWithDetails) {
    setSelectedOrder(order);
    setAssignTo(order.assigneeId || '');
    setConfirmCodeInput('');
    setGeneratedConfirmCode(order.confirmCode || '');
    setDetailModalOpen(true);
  }

  async function handleCreateOrder() {
    if (!createForm.deviceId) {
      addToast({ type: 'warning', message: '请选择设备' });
      return;
    }
    if (!createForm.description.trim()) {
      addToast({ type: 'warning', message: '请填写故障描述' });
      return;
    }
    setSubmitting(true);
    try {
      await workOrderService.createWorkOrder(createForm);
      addToast({ type: 'success', message: '报修工单已提交' });
    } catch {
      addToast({ type: 'info', message: '模拟：报修工单已提交' });
      const device = devices.find((d) => d.id === createForm.deviceId);
      const newOrder: WorkOrderWithDetails = {
        id: `wo-${Date.now()}`,
        deviceId: createForm.deviceId,
        reporterId: currentUserId || 'user-001',
        faultType: createForm.faultType,
        description: createForm.description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        deviceName: device?.name,
        reporterName: user?.name,
      };
      setWorkOrders((prev) => [newOrder, ...prev]);
    }
    setCreateForm({ deviceId: '', faultType: '无法开机', description: '' });
    setCreateModalOpen(false);
    setSubmitting(false);
  }

  async function handleAssign(assigneeId: string) {
    if (!selectedOrder) return;
    if (!assigneeId) {
      addToast({ type: 'warning', message: '请选择处理人' });
      return;
    }
    try {
      await workOrderService.assignWorkOrder(selectedOrder.id, { assigneeId });
      addToast({ type: 'success', message: '已分配处理人' });
    } catch {
      addToast({ type: 'info', message: '模拟：已分配处理人' });
    }
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === selectedOrder.id
          ? { ...wo, assigneeId, assigneeName: assigneeNameMap[assigneeId], status: 'assigned', assignedAt: new Date().toISOString() }
          : wo
      )
    );
    setSelectedOrder((prev) =>
      prev ? { ...prev, assigneeId, assigneeName: assigneeNameMap[assigneeId], status: 'assigned', assignedAt: new Date().toISOString() } : prev
    );
  }

  async function handleStatusTransition(targetStatus: 'assigned' | 'processing' | 'completed') {
    if (!selectedOrder) return;
    try {
      if (targetStatus === 'processing') {
        await workOrderService.startWorkOrder(selectedOrder.id);
        addToast({ type: 'success', message: '已开始处理' });
      } else if (targetStatus === 'completed') {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await workOrderService.completeWorkOrder(selectedOrder.id, { confirmCode: code });
        addToast({ type: 'success', message: '工单已完成，确认码已生成' });
        setGeneratedConfirmCode(code);
      }
    } catch {
      if (targetStatus === 'processing') {
        addToast({ type: 'info', message: '模拟：已开始处理' });
      } else if (targetStatus === 'completed') {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        addToast({ type: 'info', message: `模拟：工单已完成，确认码 ${code}` });
        setGeneratedConfirmCode(code);
      }
    }
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id === selectedOrder.id) {
          const updated = { ...wo, status: targetStatus };
          if (targetStatus === 'processing') updated.assignedAt = updated.assignedAt || new Date().toISOString();
          if (targetStatus === 'completed') {
            updated.completedAt = new Date().toISOString();
            updated.confirmCode = generatedConfirmCode || wo.confirmCode;
          }
          return updated;
        }
        return wo;
      })
    );
    setSelectedOrder((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, status: targetStatus };
      if (targetStatus === 'processing') updated.assignedAt = updated.assignedAt || new Date().toISOString();
      if (targetStatus === 'completed') {
        updated.completedAt = new Date().toISOString();
        updated.confirmCode = generatedConfirmCode || prev.confirmCode;
      }
      return updated;
    });
  }

  function handleConfirmCodeSubmit() {
    if (!selectedOrder) return;
    const validCode = selectedOrder.confirmCode || generatedConfirmCode;
    if (confirmCodeInput === validCode) {
      addToast({ type: 'success', message: '确认成功！报修已验证完成' });
      setDetailModalOpen(false);
    } else {
      addToast({ type: 'error', message: '确认码不正确，请重新输入' });
    }
  }

  const statusFilterOptions = [
    { value: '', label: '全部状态' },
    ...Object.entries(workOrderStatusMap).map(([k, v]) => ({ value: k, label: v.label })),
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">报修工单</h1>
            <p className="text-sm text-brand-500 mt-1">
              {isAdmin ? '管理所有报修工单' : '提交和查看我的报修工单'}
            </p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateModalOpen(true)}>
            发起报修
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-500/10 text-warning-600">
                <ListOrdered className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">待处理</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">处理中</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.processing}</p>
              </div>
            </CardContent>
          </Card>
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-500/10 text-success-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">今日完成</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.todayCompleted}</p>
              </div>
            </CardContent>
          </Card>
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">本月总数</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.monthTotal}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-semibold text-brand-800">
                {isAdmin ? '全部工单' : '我的工单'}
              </h3>
              <FormSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusFilterOptions}
                className="w-40"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-brand-500">加载中...</div>
              ) : displayedOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="mx-auto h-16 w-16 text-brand-200 mb-3" />
                  <p className="text-brand-500">暂无工单</p>
                </div>
              ) : (
                displayedOrders.map((order) => {
                  const statusInfo = workOrderStatusMap[order.status];
                  return (
                    <Card
                      key={order.id}
                      hover
                      padding="md"
                      className="cursor-pointer"
                      onClick={() => openDetail(order)}
                    >
                      <CardContent>
                        <div className="flex flex-wrap items-start gap-4">
                          <div className="flex-1 min-w-[240px]">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                                <Package className="h-5 w-5 text-brand-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-brand-800">{order.deviceName}</p>
                                  <Badge variant={statusInfo.variant} dot>{statusInfo.label}</Badge>
                                </div>
                                <p className="text-xs text-brand-500 mt-0.5">
                                  工单编号：{order.id}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 ml-14">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="h-3.5 w-3.5 text-danger-500" />
                                <span className="text-sm font-medium text-danger-600">{order.faultType}</span>
                              </div>
                              <p className="text-sm text-brand-600 line-clamp-2">{order.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[180px]">
                            <div className="flex items-center gap-1.5 text-sm text-brand-500">
                              <User className="h-4 w-4 text-brand-400" />
                              提交人：{order.reporterName || '未知'}
                            </div>
                            {order.assigneeName && (
                              <div className="flex items-center gap-1.5 text-sm text-brand-500">
                                <Wrench className="h-4 w-4 text-brand-400" />
                                处理人：{order.assigneeName}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-sm text-brand-500">
                              <Calendar className="h-4 w-4 text-brand-400" />
                              {formatDateTime(order.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Button size="sm" variant="secondary" rightIcon={<ChevronRight className="h-4 w-4" />}>
                              查看详情
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="发起报修"
        size="md"
        footer={
          <ModalFooter
            onCancel={() => setCreateModalOpen(false)}
            onConfirm={handleCreateOrder}
            confirmText="提交报修"
            confirmLoading={submitting}
          />
        }
      >
        <div className="space-y-4">
          <FormSelect
            label="选择设备"
            required
            value={createForm.deviceId}
            onChange={(e) => setCreateForm({ ...createForm, deviceId: e.target.value })}
            options={[
              { value: '', label: '请选择故障设备' },
              ...devices.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <FormSelect
            label="故障类型"
            required
            value={createForm.faultType}
            onChange={(e) => setCreateForm({ ...createForm, faultType: e.target.value })}
            options={faultTypeOptions}
          />
          <div>
            <label className="block text-sm font-medium text-brand-800 mb-1.5">
              详细描述<span className="text-danger-500 ml-0.5">*</span>
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              rows={4}
              placeholder="请详细描述故障现象，方便运维人员快速定位问题"
              className="w-full rounded-xl border border-brand-200 px-4 py-3 text-sm text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300 transition-all"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="工单详情"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="rounded-xl bg-brand-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-brand-500">工单编号</p>
                  <p className="font-mono text-sm text-brand-700 mt-0.5">{selectedOrder.id}</p>
                </div>
                <Badge variant={workOrderStatusMap[selectedOrder.status].variant} dot className="text-sm">
                  {workOrderStatusMap[selectedOrder.status].label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-brand-100">
                <div>
                  <p className="text-xs text-brand-500">设备</p>
                  <p className="text-sm font-medium text-brand-800 mt-0.5">{selectedOrder.deviceName}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-500">故障类型</p>
                  <p className="text-sm font-medium text-danger-600 mt-0.5">{selectedOrder.faultType}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-500">提交人</p>
                  <p className="text-sm text-brand-700 mt-0.5">{selectedOrder.reporterName}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-500">处理人</p>
                  <p className="text-sm text-brand-700 mt-0.5">{selectedOrder.assigneeName || '未分配'}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-500">提交时间</p>
                  <p className="text-sm text-brand-700 mt-0.5">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                {selectedOrder.completedAt && (
                  <div>
                    <p className="text-xs text-brand-500">完成时间</p>
                    <p className="text-sm text-brand-700 mt-0.5">{formatDateTime(selectedOrder.completedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-brand-800 mb-2">故障描述</p>
              <div className="rounded-xl bg-brand-50 p-4">
                <p className="text-sm text-brand-600">{selectedOrder.description}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-100 p-4 space-y-3">
                  <p className="text-sm font-medium text-brand-800">分配 / 流转</p>
                  <div className="flex items-center gap-3">
                    <FormSelect
                      label=""
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                      options={assigneeOptions}
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleAssign(assignTo)}
                      disabled={selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled'}
                    >
                      分配
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-brand-100">
                    <span className="text-xs text-brand-500 mr-2">状态流转：</span>
                    {selectedOrder.status === 'pending' || selectedOrder.status === 'assigned' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CircleDot className="h-4 w-4" />}
                        onClick={() => handleStatusTransition('processing')}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />接单
                      </Button>
                    ) : null}
                    {selectedOrder.status === 'processing' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<CircleCheck className="h-4 w-4" />}
                        onClick={() => handleStatusTransition('completed')}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />完成
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {(selectedOrder.status === 'completed' || generatedConfirmCode) && (
              <div className="rounded-xl border-2 border-success-500/20 bg-success-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-success-600" />
                  <p className="font-medium text-success-700">扫码确认</p>
                </div>
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0">
                    <div className="w-36 h-36 rounded-xl bg-white border border-brand-200 p-2 shadow-sm flex items-center justify-center">
                      <div className="grid grid-cols-7 grid-rows-7 gap-0.5 w-full h-full">
                        {Array.from({ length: 49 }).map((_, i) => {
                          const seed = (i * 7 + 3) % 5;
                          const filled = seed < 2 || i < 7 || i % 7 === 0 || i % 7 === 6 || i > 41 || (i > 17 && i < 24 && i > 17);
                          return (
                            <div
                              key={i}
                              className={`rounded-sm ${filled ? 'bg-brand-800' : 'bg-transparent'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-center text-brand-500 mt-2">模拟二维码</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="rounded-lg bg-white p-3 border border-brand-100">
                      <p className="text-xs text-brand-500">确认码</p>
                      <p className="font-mono text-xl font-bold text-brand-800 tracking-widest mt-1">
                        {selectedOrder.confirmCode || generatedConfirmCode || '------'}
                      </p>
                    </div>
                    <FormInput
                      label="输入确认码验证"
                      value={confirmCodeInput}
                      onChange={(e) => setConfirmCodeInput(e.target.value)}
                      placeholder="请输入6位确认码"
                      maxLength={6}
                    />
                    <Button
                      variant="primary"
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                      onClick={handleConfirmCodeSubmit}
                      className="w-full"
                    >
                      确认完成
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
