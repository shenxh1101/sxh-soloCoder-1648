import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal, { ModalFooter } from '../components/common/Modal';
import FormInput from '../components/common/FormInput';
import FormSelect from '../components/common/FormSelect';
import { useUi, useAuth } from '../store';
import { roomService } from '../services/roomService';
import type { MeetingRoom, RoomStatus } from '../types';
import {
  Building2,
  Users,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Power,
  AlertTriangle,
  Projector,
  Presentation,
  MonitorSpeaker,
  Wifi,
  Coffee,
  Lightbulb,
  Check,
  LayoutGrid,
  Wrench,
} from 'lucide-react';



const equipmentOptions = [
  { value: 'dev-001', label: '投影仪', icon: Projector },
  { value: 'dev-002', label: '电子白板', icon: Presentation },
  { value: 'dev-003', label: '视频会议系统', icon: MonitorSpeaker },
  { value: 'dev-004', label: '会议麦克风', icon: Wifi },
  { value: 'dev-005', label: '咖啡机', icon: Coffee },
  { value: 'dev-006', label: '智能照明', icon: Lightbulb },
];

const gradientMap: Record<string, { from: string; to: string }> = {
  'room-001': { from: 'from-indigo-500', to: 'to-purple-500' },
  'room-002': { from: 'from-sky-500', to: 'to-cyan-500' },
  'room-003': { from: 'from-emerald-500', to: 'to-teal-500' },
  'room-004': { from: 'from-rose-500', to: 'to-orange-500' },
  'room-005': { from: 'from-amber-500', to: 'to-yellow-500' },
  'room-006': { from: 'from-violet-500', to: 'to-fuchsia-500' },
};

function getStatusBadge(status: RoomStatus) {
  switch (status) {
    case 'active':
      return <Badge variant="success" dot>可用</Badge>;
    case 'maintenance':
      return <Badge variant="warning" dot>维护中</Badge>;
    case 'disabled':
      return <Badge variant="danger" dot>已停用</Badge>;
  }
}

interface RoomFormData {
  id?: string;
  name: string;
  floor: string;
  capacity: string;
  status: RoomStatus;
  equipmentIds: string[];
  description: string;
  image: string;
}

const defaultFormData: RoomFormData = {
  name: '',
  floor: '1F',
  capacity: '10',
  status: 'active',
  equipmentIds: [],
  description: '',
  image: '',
};

export default function MeetingRoomManage() {
  const { user } = useAuth();
  const { addToast } = useUi();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formData, setFormData] = useState<RoomFormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<MeetingRoom | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stats = {
    total: rooms.length,
    active: rooms.filter((r) => r.status === 'active').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  };

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    const res = await roomService.getRooms({ pageSize: 100 });
    if (res.ok && res.data) {
      setRooms(res.data.items);
    } else {
      setRooms([]);
    }
    setLoading(false);
  }

  const isAdmin = user?.role === 'admin';

  function openCreateModal() {
    setFormData(defaultFormData);
    setIsEditing(false);
    setFormModalOpen(true);
  }

  function openEditModal(room: MeetingRoom) {
    setFormData({
      id: room.id,
      name: room.name,
      floor: room.floor,
      capacity: String(room.capacity),
      status: room.status,
      equipmentIds: room.equipmentIds,
      description: room.description || '',
      image: room.image || '',
    });
    setIsEditing(true);
    setFormModalOpen(true);
  }

  function openDeleteModal(room: MeetingRoom) {
    setDeletingRoom(room);
    setDeleteModalOpen(true);
  }

  function toggleEquipment(id: string) {
    setFormData((prev) => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(id)
        ? prev.equipmentIds.filter((e) => e !== id)
        : [...prev.equipmentIds, id],
    }));
  }

  async function handleSubmitForm() {
    if (!formData.name.trim()) {
      addToast({ type: 'warning', message: '请输入会议室名称' });
      return;
    }
    if (!formData.capacity || Number(formData.capacity) <= 0) {
      addToast({ type: 'warning', message: '请输入有效的容量' });
      return;
    }
    setSubmitting(true);
    const payload = {
      name: formData.name,
      floor: formData.floor,
      capacity: Number(formData.capacity),
      status: formData.status,
      equipmentIds: formData.equipmentIds,
      description: formData.description,
      image: formData.image,
    };
    let result;
    if (isEditing && formData.id) {
      result = await roomService.updateRoom(formData.id, payload);
    } else {
      result = await roomService.createRoom(payload);
    }
    if (result.ok) {
      addToast({ type: 'success', message: `会议室已${isEditing ? '更新' : '创建'}` });
      await loadRooms();
      setFormModalOpen(false);
    } else {
      addToast({ type: 'error', message: result.message || `${isEditing ? '更新' : '创建'}失败` });
    }
    setSubmitting(false);
  }

  async function handleToggleStatus(room: MeetingRoom) {
    const newStatus: RoomStatus = room.status === 'active' ? 'disabled' : 'active';
    const result = await roomService.updateRoomStatus(room.id, newStatus);
    if (result.ok) {
      addToast({ type: 'success', message: `状态已${newStatus === 'active' ? '启用' : '停用'}` });
      await loadRooms();
    } else {
      addToast({ type: 'error', message: result.message || '操作失败' });
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingRoom) return;
    const result = await roomService.deleteRoom(deletingRoom.id);
    if (result.ok) {
      addToast({ type: 'success', message: '会议室已删除' });
      await loadRooms();
    } else {
      addToast({ type: 'error', message: result.message || '删除失败' });
    }
    setDeleteModalOpen(false);
    setDeletingRoom(null);
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

  const floorOptions = Array.from({ length: 10 }, (_, i) => ({
    value: `${i + 1}F`,
    label: `${i + 1}F`,
  }));

  const statusOptions = [
    { value: 'active', label: '启用' },
    { value: 'maintenance', label: '维护中' },
    { value: 'disabled', label: '停用' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">会议室管理</h1>
            <p className="text-sm text-brand-500 mt-1">管理所有会议室的配置和状态</p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            新建会议室
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">总会议室数</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-500/10 text-success-600">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">可用数</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-500/10 text-warning-600">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">维护中数</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.maintenance}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-16 text-center text-brand-500">加载中...</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => {
              const grad = gradientMap[room.id] || { from: 'from-blue-500', to: 'to-indigo-500' };
              const roomEquipments = equipmentOptions.filter((e) =>
                room.equipmentIds.includes(e.value)
              );
              return (
                <Card key={room.id} hover padding="none" className="overflow-hidden">
                  <div className="relative">
                    {room.image ? (
                      <div className="h-40 w-full">
                        <img
                          src={room.image}
                          alt={room.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`h-40 w-full bg-gradient-to-br ${grad.from} ${grad.to} flex items-center justify-center`}
                      >
                        <Building2 className="h-16 w-16 text-white/80" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">{getStatusBadge(room.status)}</div>
                  </div>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-800">{room.name}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="inline-flex items-center gap-1.5 text-sm text-brand-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {room.floor}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-sm text-brand-500">
                            <Users className="h-3.5 w-3.5" />
                            容纳{room.capacity}人
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {roomEquipments.length > 0 ? (
                          roomEquipments.map((eq) => {
                            const Icon = eq.icon;
                            return (
                              <span
                                key={eq.value}
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs text-brand-600"
                                title={eq.label}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {eq.label}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-brand-400">暂无设备配置</span>
                        )}
                      </div>
                      {room.description && (
                        <p className="text-xs text-brand-500 line-clamp-2">{room.description}</p>
                      )}
                    </div>
                  </CardContent>
                  <div className="flex items-center justify-between gap-2 border-t border-brand-100 px-6 py-4 bg-brand-50/30">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Edit3 className="h-4 w-4" />}
                      onClick={() => openEditModal(room)}
                    >
                      编辑
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Power className="h-4 w-4" />}
                        onClick={() => handleToggleStatus(room)}
                      >
                        {room.status === 'active' ? '停用' : '启用'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => openDeleteModal(room)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={isEditing ? '编辑会议室' : '新建会议室'}
        size="lg"
        footer={
          <ModalFooter
            onCancel={() => setFormModalOpen(false)}
            onConfirm={handleSubmitForm}
            confirmText={isEditing ? '保存修改' : '创建会议室'}
            confirmLoading={submitting}
          />
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="会议室名称"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="如：星辰会议室"
            />
            <FormSelect
              label="楼层"
              required
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value as RoomFormData['floor'] })}
              options={floorOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="容量（人）"
              required
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="10"
            />
            <FormSelect
              label="状态"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
              options={statusOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-800 mb-2">
              设备配置
            </label>
            <div className="grid grid-cols-2 gap-2">
              {equipmentOptions.map((eq) => {
                const Icon = eq.icon;
                const checked = formData.equipmentIds.includes(eq.value);
                return (
                  <button
                    key={eq.value}
                    type="button"
                    onClick={() => toggleEquipment(eq.value)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${
                      checked
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-brand-200 bg-white text-brand-600 hover:border-brand-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{eq.label}</span>
                    {checked && <Check className="h-4 w-4 text-brand-500" />}
                  </button>
                );
              })}
            </div>
          </div>
          <FormInput
            label="描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="会议室用途、特点等"
          />
          <FormInput
            label="图片URL"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="确认删除"
        size="sm"
        footer={
          <ModalFooter
            onCancel={() => setDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            confirmText="确认删除"
            confirmVariant="danger"
          />
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-danger-500/10 p-4">
            <AlertTriangle className="h-6 w-6 text-danger-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-danger-700">确定要删除该会议室吗？</p>
              <p className="text-sm text-danger-600 mt-1">此操作不可撤销，相关预订记录将受影响。</p>
            </div>
          </div>
          {deletingRoom && (
            <div className="rounded-xl bg-brand-50 p-4">
              <p className="font-medium text-brand-800">{deletingRoom.name}</p>
              <p className="text-sm text-brand-500 mt-0.5">
                {deletingRoom.floor} · 容纳{deletingRoom.capacity}人
              </p>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
