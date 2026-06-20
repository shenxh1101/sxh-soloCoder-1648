import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal, { ModalFooter } from '../components/common/Modal';
import FormInput from '../components/common/FormInput';
import { useUi, useAuth } from '../store';
import { approvalService } from '../services/approvalService';
import { roomService } from '../services/roomService';
import { formatDateTime, formatTime, getDurationHours } from '../utils';
import type { Booking, MeetingRoom } from '../types';
import {
  Clock,
  CheckCircle,
  XCircle,
  FileCheck,
  Users,
  MapPin,
  Calendar,
  ListTodo,
  History,
  AlertTriangle,
} from 'lucide-react';

interface ApprovalWithRoom extends Booking {
  roomName?: string;
  userName?: string;
}

interface ApprovalStats {
  pending: number;
  todayApproved: number;
  todayRejected: number;
}

export default function Approvals() {
  const { user } = useAuth();
  const { addToast } = useUi();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingList, setPendingList] = useState<ApprovalWithRoom[]>([]);
  const [historyList, setHistoryList] = useState<ApprovalWithRoom[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({
    pending: 0,
    todayApproved: 0,
    todayRejected: 0,
  });
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ApprovalWithRoom | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);

  const roomMap = useMemo(() => {
    const map: Record<string, string> = {};
    rooms.forEach((r) => {
      map[r.id] = r.name;
    });
    return map;
  }, [rooms]);

  const formatUserName = (userId: string) => {
    return userId.length > 3 ? `员工 ${userId.slice(-3)}` : `员工 ${userId}`;
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const roomsRes = await roomService.getRooms({ pageSize: 100 });
    if (roomsRes.ok && roomsRes.data) {
      setRooms(roomsRes.data.items);
    } else {
      setRooms([]);
    }

    let realPending: ApprovalWithRoom[] = [];
    let realHistory: ApprovalWithRoom[] = [];

    const pendingResult = await approvalService.getPendingApprovals({ pageSize: 50 });
    if (pendingResult.ok && pendingResult.data) {
      realPending = pendingResult.data.items.map((b) => ({
        ...b,
        roomName: roomMap[b.roomId] || b.roomId,
        userName: formatUserName(b.userId),
      }));
    }
    setPendingList(realPending);

    const historyResult = await approvalService.getMyApprovalHistory({ pageSize: 50 });
    const historyListData: ApprovalWithRoom[] = [];
    if (historyResult.ok && historyResult.data) {
      realHistory = historyResult.data.items.map((b) => ({
        ...b,
        roomName: roomMap[b.roomId] || b.roomId,
        userName: formatUserName(b.userId),
      }));
      historyListData.push(...realHistory);
    }
    setHistoryList(realHistory);

    const today = new Date().toISOString().slice(0, 10);
    const todayApproved = historyListData.filter(
      (b) => (b.status === 'locked' || b.status === 'completed') && (b.approvalTime ? b.approvalTime.slice(0, 10) === today : false),
    ).length;
    const todayRejected = historyListData.filter(
      (b) => b.status === 'rejected' && (b.approvalTime ? b.approvalTime.slice(0, 10) === today : false),
    ).length;

    setStats({
      pending: realPending.length,
      todayApproved,
      todayRejected,
    });

    setLoading(false);
  }

  const hasAccess = user?.role === 'manager' || user?.role === 'admin';

  async function handleApprove(booking: ApprovalWithRoom) {
    setApprovingId(booking.id);
    const result = await approvalService.approve(booking.id);
    if (result.ok) {
      addToast({ type: 'success', message: '已通过审批' });
      await loadData();
    } else {
      addToast({ type: 'error', message: result.message || '审批失败' });
    }
    setApprovingId(null);
  }

  function openRejectModal(booking: ApprovalWithRoom) {
    setSelectedBooking(booking);
    setRejectReason('');
    setRejectModalOpen(true);
  }

  async function handleConfirmReject() {
    if (!selectedBooking) return;
    if (!rejectReason.trim()) {
      addToast({ type: 'warning', message: '请输入驳回理由' });
      return;
    }
    setRejecting(true);
    const result = await approvalService.reject(selectedBooking.id, { comment: rejectReason });
    if (result.ok) {
      addToast({ type: 'success', message: '已驳回申请' });
      setRejectModalOpen(false);
      setSelectedBooking(null);
      await loadData();
    } else {
      addToast({ type: 'error', message: result.message || '驳回失败' });
    }
    setRejecting(false);
  }

  function getStatusBadge(status: Booking['status']) {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="warning" dot>待审批</Badge>;
      case 'locked':
      case 'completed':
        return <Badge variant="success" dot>已通过</Badge>;
      case 'rejected':
        return <Badge variant="danger" dot>已驳回</Badge>;
      case 'cancelled':
        return <Badge variant="default" dot>已取消</Badge>;
      case 'released':
        return <Badge variant="default" dot>已释放</Badge>;
      default:
        return <Badge variant="warning" dot>待审批</Badge>;
    }
  }

  const currentList = activeTab === 'pending' ? pendingList : historyList;

  if (!hasAccess) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-warning-500 mb-4" />
            <h2 className="text-xl font-semibold text-brand-800 mb-2">无访问权限</h2>
            <p className="text-brand-500">该页面仅经理和管理员可访问</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">审批管理</h1>
            <p className="text-sm text-brand-500 mt-1">管理会议室预订审批流程</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-500/10 text-warning-600">
                <ListTodo className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">待审批数</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-500/10 text-success-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">今日已通过</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.todayApproved}</p>
              </div>
            </CardContent>
          </Card>
          <Card hover>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-500/10 text-danger-500">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-brand-500">今日已驳回</p>
                <p className="text-2xl font-bold text-brand-800 mt-0.5">{stats.todayRejected}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1 bg-brand-50 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'pending'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-brand-500 hover:text-brand-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  待审批
                  {pendingList.length > 0 && (
                    <Badge variant="warning" className="ml-1">{pendingList.length}</Badge>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-brand-500 hover:text-brand-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  已处理
                </span>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">会议主题</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">预订人</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">会议室</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">时间</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">参会人数</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">提交时间</th>
                    {activeTab === 'history' && (
                      <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">状态</th>
                    )}
                    <th className="text-left py-3 px-4 text-xs font-medium text-brand-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={activeTab === 'history' ? 8 : 7} className="py-12 text-center text-brand-500">
                        加载中...
                      </td>
                    </tr>
                  ) : currentList.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'history' ? 8 : 7} className="py-12 text-center text-brand-500">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    currentList.map((booking) => {
                      const duration = getDurationHours(booking.startTime, booking.endTime);
                      const isLongBooking = duration > 2;
                      return (
                        <tr
                          key={booking.id}
                          className={`border-b border-brand-50 transition-colors ${
                            isLongBooking && activeTab === 'pending' ? 'bg-warning-500/5' : 'hover:bg-brand-50/50'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {isLongBooking && activeTab === 'pending' && (
                                  <Badge variant="warning">长期预订</Badge>
                                )}
                                <span className="font-medium text-brand-800">{booking.title}</span>
                              </div>
                              <div className="text-xs text-brand-500">
                                发起人：{booking.userName || booking.userId}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-brand-700">{booking.userName || booking.userId}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 text-sm text-brand-700">
                              <MapPin className="h-3.5 w-3.5 text-brand-400" />
                              {booking.roomName}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              <div className="flex items-center gap-1.5 text-brand-700">
                                <Calendar className="h-3.5 w-3.5 text-brand-400" />
                                {formatDateTime(booking.startTime)}
                              </div>
                              <div className="flex items-center gap-1.5 text-brand-500 mt-1">
                                <Clock className="h-3.5 w-3.5 text-brand-400" />
                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                                <span className="text-brand-400">（{duration}小时）</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 text-sm text-brand-700">
                              <Users className="h-3.5 w-3.5 text-brand-400" />
                              {booking.attendeeCount}人
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-brand-500">{formatDateTime(booking.createdAt)}</span>
                          </td>
                          {activeTab === 'history' && (
                            <td className="py-4 px-4">{getStatusBadge(booking.status)}</td>
                          )}
                          <td className="py-4 px-4">
                            {activeTab === 'pending' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  leftIcon={<CheckCircle className="h-4 w-4" />}
                                  onClick={() => handleApprove(booking)}
                                  loading={approvingId === booking.id}
                                  disabled={approvingId !== null}
                                >
                                  通过
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  leftIcon={<XCircle className="h-4 w-4" />}
                                  onClick={() => openRejectModal(booking)}
                                  disabled={approvingId !== null}
                                >
                                  驳回
                                </Button>
                              </div>
                            )}
                            {activeTab === 'history' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leftIcon={<FileCheck className="h-4 w-4" />}
                                >
                                  详情
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={rejectModalOpen}
        onClose={() => !rejecting && setRejectModalOpen(false)}
        title="驳回审批"
        size="md"
        footer={
          <ModalFooter
            onCancel={() => setRejectModalOpen(false)}
            onConfirm={handleConfirmReject}
            confirmText="确认驳回"
            confirmVariant="danger"
            confirmLoading={rejecting}
          />
        }
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50 p-4">
              <p className="text-sm font-medium text-brand-800">{selectedBooking.title}</p>
              <p className="text-xs text-brand-500 mt-1">
                {selectedBooking.roomName} · {formatDateTime(selectedBooking.startTime)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-800 mb-1.5">
                驳回理由<span className="text-danger-500 ml-0.5">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="请输入驳回理由，该理由将通知给预订人"
                className="w-full rounded-xl border border-brand-200 px-4 py-3 text-sm text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 hover:border-brand-300 transition-all"
              />
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
