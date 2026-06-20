import { useState, useEffect, useMemo } from 'react';
import {
  Gauge,
  MessageSquare,
  Activity,
  Bell,
  CheckCircle,
  Info,
  CalendarPlus,
  Wrench,
  MapPin,
  AlertCircle,
  ShieldCheck,
  Building2,
  Mail,
  CheckCheck,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import FormInput from '@/components/common/FormInput';
import { useAuth, useUi } from '@/store';
import { roleLabel, formatDateTime } from '@/utils';
import { cn } from '@/utils';
import { MIN_CREDIT_SCORE } from '../../shared';

type ProfileTab = 'credit' | 'message' | 'log';

const profileTabs = [
  { key: 'credit' as const, label: '信用分面板', icon: Gauge },
  { key: 'message' as const, label: '消息中心', icon: MessageSquare },
  { key: 'log' as const, label: '操作记录', icon: Activity },
];

function generateCreditRecords() {
  const base = new Date();
  return [
    { id: 'c1', date: new Date(base.getTime() - 7200000), change: 5, reason: '按时签到', after: 95 },
    { id: 'c2', date: new Date(base.getTime() - 86400000), change: 10, reason: '准时完成会议', after: 90 },
    { id: 'c3', date: new Date(base.getTime() - 259200000), change: -10, reason: '超时未到被释放', after: 80 },
    { id: 'c4', date: new Date(base.getTime() - 432000000), change: 5, reason: '按时签到', after: 90 },
    { id: 'c5', date: new Date(base.getTime() - 604800000), change: 5, reason: '准时完成会议', after: 85 },
    { id: 'c6', date: new Date(base.getTime() - 864000000), change: -5, reason: '临近取消预订', after: 80 },
    { id: 'c7', date: new Date(base.getTime() - 1209600000), change: 5, reason: '按时签到', after: 85 },
  ];
}

function generateMessages() {
  const base = new Date();
  return [
    { id: 'm1', type: 'reminder', title: '会议开始提醒', content: '您预订的"星辰会议室"将于15分钟后开始，请准时参加', time: new Date(base.getTime() - 900000), isRead: false },
    { id: 'm2', type: 'approval', title: '预订审批通过', content: '您的预订申请【季度总结会】已通过审批，请及时签到', time: new Date(base.getTime() - 7200000), isRead: false },
    { id: 'm3', type: 'system', title: '信用分变动', content: '因按时签到，信用分+5，当前95分，等级：优秀', time: new Date(base.getTime() - 18000000), isRead: true },
    { id: 'm4', type: 'reminder', title: '设备维修完成', content: '您报修的投影仪-A1已完成维修，可正常使用', time: new Date(base.getTime() - 86400000), isRead: true },
    { id: 'm5', type: 'approval', title: '审批待处理', content: '李四下了一个审批申请需要您审批', time: new Date(base.getTime() - 172800000), isRead: true },
    { id: 'm6', type: 'system', title: '系统维护通知', content: '系统将于本周日凌晨2-4点进行维护升级', time: new Date(base.getTime() - 259200000), isRead: true },
    { id: 'm7', type: 'reminder', title: '超时提醒', content: '您上次的会议将在10分钟后超时，请及时续约或结束', time: new Date(base.getTime() - 432000000), isRead: true },
  ];
}

function generateOperationLogs() {
  const base = new Date();
  return [
    { id: 'l1', time: new Date(base.getTime() - 1800000), type: 'checkin', detail: '星辰会议室 - 产品评审会', result: 'success' },
    { id: 'l2', time: new Date(base.getTime() - 10800000), type: 'booking', detail: '预订朝阳会议室 14:00-16:00', result: 'success' },
    { id: 'l3', time: new Date(base.getTime() - 28800000), type: 'approval', detail: '审批：王五的会议室预订', result: 'success' },
    { id: 'l4', time: new Date(base.getTime() - 86400000), type: 'repair', detail: '报修：月光会议室 投影仪', result: 'success' },
    { id: 'l5', time: new Date(base.getTime() - 172800000), type: 'booking', detail: '取消预订：银河会议室', result: 'cancelled' },
    { id: 'l6', time: new Date(base.getTime() - 259200000), type: 'checkin', detail: '月光会议室 - 团队周会', result: 'success' },
    { id: 'l7', time: new Date(base.getTime() - 345600000), type: 'booking', detail: '预订极光会议室 09:00-11:00', result: 'success' },
    { id: 'l8', time: new Date(base.getTime() - 518400000), type: 'approval', detail: '审批：赵六的设备报修', result: 'rejected' },
  ];
}

const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  reminder: { icon: Bell, label: '提醒', color: 'bg-brand-500' },
  approval: { icon: ShieldCheck, label: '审批', color: 'bg-warning-500' },
  system: { icon: Info, label: '系统', color: 'bg-success-500' },
};

const operationConfig: Record<string, { icon: typeof CalendarPlus; label: string; labelColor: string }> = {
  booking: { icon: CalendarPlus, label: '预订', labelColor: 'text-brand-600 bg-brand-50' },
  approval: { icon: CheckCircle, label: '审批', labelColor: 'text-warning-600 bg-warning-500/10' },
  repair: { icon: Wrench, label: '报修', labelColor: 'text-danger-600 bg-danger-500/10' },
  checkin: { icon: MapPin, label: '签到', labelColor: 'text-success-600 bg-success-500/10' },
};

function CreditGauge({ value }: { value: number }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const startTime = Date.now();
    const duration = 1200;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(value * easeOut));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const radius = 90;
  const strokeWidth = 16;
  const circumference = Math.PI * radius;
  const progressVal = (animatedValue / 100) * circumference;

  const getColor = (v: number) => {
    if (v < 60) return '#EF4444';
    if (v < 75) return '#F59E0B';
    if (v < 90) return '#4D80C2';
    return '#10B981';
  };

  const color = getColor(value);
  const gradientId = 'credit-gauge-gradient';

  // SVG path helper
  const makeArc = (r: number, sw: number) => {
    const x1 = 240 - sw / 2;
    const y = 140 - sw / 2;
    const x2 = sw / 2;
    return 'M ' + x1 + ' ' + y + ' A ' + r + ' ' + r + ' 0 0 0 ' + x2 + ' ' + y;
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg width="240" height="140" viewBox="0 0 240 140">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#4D80C2" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <path
          d={makeArc(radius, strokeWidth)}
          fill="none"
          stroke="#DCE8F5"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={makeArc(radius, strokeWidth)}
          fill="none"
          stroke={'url(#' + gradientId + ')'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={progressVal + ' ' + circumference}
          style={{ transition: 'stroke-dasharray 0.1s linear' }}
        />
        {[0, 25, 50, 75, 100].map((v, i) => {
          const angle = Math.PI * (1 - v / 100);
          const x = 120 + Math.cos(angle) * (radius + 18);
          const y = 140 - Math.sin(angle) * (radius + 18);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#4D80C2"
              fontSize="10"
              fontWeight="600"
            >
              {v}
            </text>
          );
        })}
        <circle cx="120" cy="140" r="3" fill={color} />
      </svg>
      <div className="absolute bottom-2 flex flex-col items-center">
        <div className="text-5xl font-bold" style={{ color }}>
          {animatedValue}
        </div>
        <div className="text-xs text-brand-500 mt-0.5">当前信用分</div>
      </div>
    </div>
  );
}

function getCreditLevel(score: number) {
  if (score >= 90)
    return {
      level: '优秀',
      color: 'text-success-600',
      bg: 'bg-success-500/10',
      border: 'border-success-500/20',
    };
  if (score >= 75)
    return {
      level: '良好',
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      border: 'border-brand-200',
    };
  if (score >= 60)
    return {
      level: '一般',
      color: 'text-warning-600',
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/20',
    };
  return {
    level: '较差',
    color: 'text-danger-500',
    bg: 'bg-danger-500/10',
    border: 'border-danger-500/20',
  };
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('credit');
  const [messages, setMessages] = useState(generateMessages);
  const { user, setUser } = useAuth();
  const { addToast } = useUi();
  const [isEditingCredit, setIsEditingCredit] = useState(false);
  const [editCreditScore, setEditCreditScore] = useState(0);

  const creditRecords = useMemo(() => generateCreditRecords(), []);
  const operationLogs = useMemo(() => generateOperationLogs(), []);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const handleMarkAllRead = () => {
    setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    addToast({ type: 'success', message: '已全部标记为已读' });
  };

  const handleMarkOneRead = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  };

  const handleStartEditCredit = () => {
    if (user) {
      setEditCreditScore(user.creditScore);
      setIsEditingCredit(true);
    }
  };

  const handleSaveCredit = async () => {
    if (editCreditScore < 0 || editCreditScore > 100) {
      addToast({ type: 'warning', message: '信用分必须在 0-100 之间' });
      return;
    }
    try {
      const updatedUser = { ...user!, creditScore: editCreditScore };
      setUser(updatedUser);
      addToast({ type: 'success', message: `信用分已更新为 ${editCreditScore} 分` });
      setIsEditingCredit(false);
    } catch {
      addToast({ type: 'error', message: '更新信用分失败' });
    }
  };

  const handleCancelEditCredit = () => {
    setIsEditingCredit(false);
  };

  const creditLevel = user ? getCreditLevel(user.creditScore) : null;

  const updateCreditScore = (newScore: number) => {
    if (!user) return;
    setUser({ ...user, creditScore: newScore });
  };

  const handleCreditAdjust = (delta: number) => {
    if (!user) return;
    const newScore = Math.max(0, Math.min(100, user.creditScore + delta));
    updateCreditScore(newScore);
    addToast({
      type: delta > 0 ? 'success' : 'warning',
      message: `信用分已${delta > 0 ? '增加' : '扣除'}${Math.abs(delta)}分，当前${newScore}分${newScore < MIN_CREDIT_SCORE ? '（已低于60分，不可预订）' : ''}`,
    });
  };

  const avatarColors = ['#2E5FA6', '#4D80C2', '#7FA8D8', '#B5D0EA'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left - User Info Card */}
      <div className="lg:col-span-4">
        <Card>
          <CardContent className="!pt-8">
          <div className="flex flex-col items-center text-center">
            <div
              className="relative mb-5"
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, ' + avatarColors[0] + ', ' + avatarColors[2] + ')',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(46, 95, 166, 0.25)',
              }}
            >
              <span className="text-white text-4xl font-bold">
                {user?.name?.charAt(0) || 'U'}
              </span>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md border-2 border-white">
                <div className="w-4 h-4 rounded-full bg-success-500" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-brand-800 mb-1">{user?.name}</h2>
            <div className="mb-3">
              <Badge variant="info">{user ? roleLabel(user.role) : '用户'}</Badge>
            </div>

            <div className="w-full space-y-3 mt-2">
              <div className="flex items-center gap-3 p-3 bg-brand-50/80 rounded-xl text-left">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Building2 className="h-4 w-4 text-brand-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-brand-500">部门</div>
                  <div className="text-sm font-medium text-brand-800 truncate">
                    {user?.department}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-brand-50/80 rounded-xl text-left">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Mail className="h-4 w-4 text-brand-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-brand-500">邮箱</div>
                  <div className="text-sm font-medium text-brand-800 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              {creditLevel && (
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl text-left border',
                    creditLevel.bg,
                    creditLevel.border,
                  )}
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Gauge className={'h-4 w-4 ' + creditLevel.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {!isEditingCredit ? (
                      <>
                        <div className="text-xs text-brand-500">信用等级</div>
                        <div className={'text-sm font-semibold ' + creditLevel.color}>
                          {creditLevel.level + '（' + user?.creditScore + '分）'}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-brand-500">编辑信用分（管理员）</div>
                        <div className="flex items-center gap-2">
                          <FormInput
                            type="number"
                            min={0}
                            max={100}
                            value={editCreditScore}
                            onChange={(e) => setEditCreditScore(parseInt(e.target.value) || 0)}
                            className="!py-1 !px-2 !text-sm"
                          />
                          <span className="text-xs text-brand-600">分</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {user?.role === 'admin' && !isEditingCredit && (
                    <button
                      onClick={handleStartEditCredit}
                      className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-brand-500 hover:text-brand-700 transition-colors"
                      title="编辑信用分（管理员）"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {isEditingCredit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSaveCredit}
                        className="p-1.5 rounded-lg bg-success-500 hover:bg-success-600 text-white transition-colors"
                        title="保存"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEditCredit}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        title="取消"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {user?.role === 'admin' && (
                <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-3 space-y-2">
                  <div className="text-xs font-semibold text-brand-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    管理员快捷调整
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreditAdjust(-5)}
                    >
                      -5
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreditAdjust(-10)}
                    >
                      -10
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreditAdjust(5)}
                    >
                      +5
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreditAdjust(10)}
                    >
                      +10
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateCreditScore(95);
                        addToast({ type: 'success', message: '信用分已重置为95分' });
                      }}
                    >
                      重置
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-brand-500 text-left mb-3">
                信用规则说明
              </div>
              <ul className="space-y-2 text-xs text-slate-600 text-left">
                <li className="flex items-start gap-2">
                  <CheckCheck className="w-3.5 h-3.5 text-success-500 mt-0.5 flex-shrink-0" />
                  <span>按时签到 +5分 / 准时完成会议 +10分</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-danger-500 mt-0.5 flex-shrink-0" />
                  <span>超时15分钟未到 -10分，24h内取消 -5分</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-warning-500 mt-0.5 flex-shrink-0" />
                  <span>信用分低于60分，禁止新预订</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Right - Tabs */}
      <div className="lg:col-span-8 space-y-6">
        {/* Tab Header */}
        <div className="bg-white rounded-2xl p-2 shadow-card border border-slate-100 flex gap-1">
          {profileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-brand-50',
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.key === 'message' && unreadCount > 0 && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-danger-500 text-white',
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Credit Tab */}
        {activeTab === 'credit' && user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">信用分概览</CardTitle>
                {user?.role === 'admin' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleCreditAdjust(-5)}
                      title="测试：扣除5分信用分"
                    >
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                      -5
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleCreditAdjust(5)}
                      title="测试：增加5分信用分"
                      className="from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 focus:ring-success-200"
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      +5
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <CreditGauge value={user.creditScore} />
                {user?.role === 'admin' && (
                  <div className="mt-4 text-xs text-center text-brand-400 bg-brand-50/50 rounded-lg py-2 px-3">
                    管理员测试模式：点击上方按钮调整信用分，实时观察 Booking/Dashboard 按钮状态变化
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">信用分变动记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-200 to-transparent" />
                  <ul className="space-y-5">
                    {creditRecords.map((record) => (
                      <li key={record.id} className="relative pl-12">
                        <div
                          className={cn(
                            'absolute left-2 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md',
                            record.change > 0 ? 'bg-success-500' : 'bg-danger-500',
                          )}
                        >
                          {record.change > 0 ? (
                            <ArrowUpRight className="w-3 h-3 text-white" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex items-center justify-between items-start">
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {record.reason}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {formatDateTime(record.date)}
                            </div>
                          </div>
                          <div
                            className={cn(
                              'text-sm font-bold',
                              record.change > 0 ? 'text-success-600' : 'text-danger-500',
                            )}
                          >
                            {record.change > 0 ? '+' : ''}
                            {record.change}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          变动后：
                          <span className="font-semibold text-slate-700">
                            {record.after}分
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'message' && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-base">消息中心</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkAllRead}
                >
                  全部标为已读
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 -mx-6">
                {messages.map((msg) => {
                  const cfg = typeConfig[msg.type] || typeConfig.system;
                  const MsgIcon = cfg.icon;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleMarkOneRead(msg.id)}
                      className={cn(
                        'flex gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-slate-50',
                        !msg.isRead && 'bg-brand-50/50',
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                          cfg.color + '/10',
                        )}
                        style={{
                          background:
                            msg.type === 'reminder'
                              ? 'rgba(46, 95, 166, 0.1)'
                              : msg.type === 'approval'
                                ? 'rgba(245, 158, 11, 0.1)'
                                : 'rgba(16, 185, 129, 0.1)',
                        }}
                      >
                        <MsgIcon
                          className="w-5 h-5"
                          style={{
                            color:
                              msg.type === 'reminder'
                                ? '#2E5FA6'
                                : msg.type === 'approval'
                                  ? '#F59E0B'
                                  : '#10B981',
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {msg.title}
                          </span>
                          {!msg.isRead && (
                            <span className="w-2 h-2 rounded-full bg-danger-500" />
                          )}
                          <span
                            className="ml-auto text-xs text-slate-400 flex-shrink-0"
                          >
                            {formatDateTime(msg.time)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operation Log Tab */}
        {activeTab === 'log' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">操作记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <th className="py-3 px-5 text-left font-medium">时间</th>
                      <th className="py-3 px-5 text-left font-medium">类型</th>
                      <th className="py-3 px-5 text-left font-medium">详情</th>
                      <th className="py-3 px-5 text-left font-medium">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationLogs.map((log) => {
                      const cfg = operationConfig[log.type] || operationConfig.booking;
                      const OpIcon = cfg.icon;
                      return (
                        <tr
                          key={log.id}
                          className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="py-4 px-5">
                            <div className="text-sm text-slate-500 font-mono">
                              {formatDateTime(log.time)}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                                cfg.labelColor,
                              )}
                            >
                              <OpIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="text-sm text-brand-700">
                              {log.detail}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            {log.result === 'success' && (
                              <Badge variant="success" dot>
                                成功
                              </Badge>
                            )}
                            {log.result === 'cancelled' && (
                              <Badge variant="default" dot>
                                已取消
                              </Badge>
                            )}
                            {log.result === 'rejected' && (
                              <Badge variant="danger" dot>
                                已拒绝
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
