import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Users, Building2, CalendarCheck, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import FormInput from '../components/common/FormInput';
import Badge from '../components/common/Badge';
import { authService } from '../services/authService';
import { useAuth, useUi } from '../store';
import { validateEmail, cn } from '../utils';

const TEST_ACCOUNTS = [
  { role: 'admin', name: '系统管理员', email: 'admin@company.com', password: '123456', color: 'danger' as const },
  { role: 'manager', name: '部门经理', email: 'manager@company.com', password: '123456', color: 'warning' as const },
  { role: 'employee', name: '普通员工', email: 'zhangsan@company.com', password: '123456', color: 'info' as const },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setGlobalLoading, addToast } = useUi();

  const [email, setEmail] = useState('zhangsan@company.com');
  const [password, setPassword] = useState('123456');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    const emailResult = validateEmail(email);
    if (!emailResult.valid) newErrors.email = emailResult.message;
    if (!password) newErrors.password = '请输入密码';
    else if (password.length < 6) newErrors.password = '密码至少6位';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setGlobalLoading(true);
      const result = await authService.login({ email, password });
      login(result.user, result.token);
      if (remember) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      addToast({ type: 'success', message: `欢迎回来，${result.user.name}！` });
      navigate('/dashboard');
    } catch {
      addToast({ type: 'error', message: '登录失败，请检查账号密码' });
    } finally {
      setGlobalLoading(false);
    }
  };

  const fillAccount = (account: typeof TEST_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div
        className={cn(
          'relative z-10 w-full max-w-5xl mx-4 transition-all duration-700 ease-out',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        )}
      >
        <Card className="p-0 overflow-hidden shadow-2xl border-white/10 bg-white/95">
          <div className="grid md:grid-cols-2 gap-0 min-h-[560px]">
            <div className="relative p-10 md:p-12 bg-gradient-to-br from-brand-600 to-brand-800 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <CalendarCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-wide">智会通</h1>
                    <p className="text-xs text-brand-200 mt-0.5">Smart Meeting Platform</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-3xl font-bold mb-4 leading-tight">
                    让每一次会议
                    <br />
                    都高效有序
                  </h2>
                  <p className="text-brand-200 text-base leading-relaxed mb-8 max-w-sm">
                    智能会议室预约管理平台，集成设备管理、信用体系、审批流程，助力企业协作效率提升。
                  </p>

                  <div className="space-y-4">
                    {[
                      { icon: CalendarCheck, text: '一键预约，智能推荐会议室', color: 'bg-success-500' },
                      { icon: Building2, text: '设备报修，实时跟进处理进度', color: 'bg-warning-500' },
                      { icon: Users, text: '多级审批，规范企业会议管理', color: 'bg-brand-300' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 group">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
                            item.color,
                          )}
                        >
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-brand-100">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-2 text-xs text-brand-300">
                  <Sparkles className="w-4 h-4" />
                  <span>© 2024 智会通 · 企业级会议管理解决方案</span>
                </div>
              </div>
            </div>

            <div className="p-10 md:p-12 flex flex-col">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-brand-800 mb-2">欢迎登录</h2>
                <p className="text-sm text-brand-500">请输入您的账号信息以继续</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 flex-1">
                <FormInput
                  label="邮箱地址"
                  type="email"
                  name="email"
                  placeholder="zhangsan@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email}
                  autoComplete="email"
                />

                <FormInput
                  label="登录密码"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-brand-400 hover:text-brand-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={errors.password}
                  autoComplete="current-password"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-brand-300 text-brand-500 focus:ring-brand-200"
                    />
                    <span className="text-sm text-brand-600 group-hover:text-brand-800 transition-colors">
                      记住账号
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm text-brand-500 hover:text-brand-700 transition-colors"
                    onClick={(e) => e.preventDefault()}
                  >
                    忘记密码？
                  </a>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  登 录
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-brand-100">
                <p className="text-xs text-brand-500 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse" />
                  测试账号（点击快速填入）
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TEST_ACCOUNTS.map((account) => (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => fillAccount(account)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                        account.color === 'danger' &&
                          'border-danger-200 bg-danger-50/50 hover:bg-danger-50 hover:border-danger-300',
                        account.color === 'warning' &&
                          'border-warning-200 bg-warning-50/50 hover:bg-warning-50 hover:border-warning-300',
                        account.color === 'info' &&
                          'border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300',
                      )}
                    >
                      <Badge variant={account.color} dot className="mb-1.5">
                        {account.name}
                      </Badge>
                      <p className="text-[11px] text-brand-600 font-mono leading-tight truncate">
                        {account.email.split('@')[0]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
