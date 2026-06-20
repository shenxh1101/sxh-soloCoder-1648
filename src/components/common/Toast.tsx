import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore, type ToastMessage } from '../../store';
import { cn } from '../../utils';

const toastStyles: Record<ToastMessage['type'], { bg: string; icon: typeof CheckCircle2; border: string }> = {
  success: {
    bg: 'bg-success-500/10 border-success-500/30 text-success-700',
    icon: CheckCircle2,
    border: 'border-l-success-500',
  },
  error: {
    bg: 'bg-danger-500/10 border-danger-500/30 text-danger-700',
    icon: XCircle,
    border: 'border-l-danger-500',
  },
  warning: {
    bg: 'bg-warning-500/10 border-warning-500/30 text-warning-700',
    icon: AlertTriangle,
    border: 'border-l-warning-500',
  },
  info: {
    bg: 'bg-brand-50 border-brand-200 text-brand-700',
    icon: Info,
    border: 'border-l-brand-500',
  },
};

export default function Toast() {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="fixed top-20 right-6 z-[60] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map((toast) => {
        const styles = toastStyles[toast.type];
        const Icon = styles.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border border-l-4 px-4 py-3 shadow-card-hover backdrop-blur-sm animate-fade-up',
              styles.bg,
              styles.border,
            )}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
