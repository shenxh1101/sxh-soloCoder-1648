import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  dot?: boolean;
}

const variantClasses: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-success-500/10 text-success-600 border-success-500/20',
  warning: 'bg-warning-500/10 text-warning-600 border-warning-500/20',
  danger: 'bg-danger-500/10 text-danger-500 border-danger-500/20',
  info: 'bg-brand-50 text-brand-600 border-brand-200',
};

const dotColorClasses: Record<string, string> = {
  default: 'bg-gray-400',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-brand-500',
};

export default function Badge({
  children,
  variant = 'default',
  dot = false,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            dotColorClasses[variant],
          )}
        />
      )}
      {children}
    </span>
  );
}
