import { Inbox, Search } from 'lucide-react';
import { cn } from '../../utils';
import Button from './Button';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: 'default' | 'search';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function Empty({
  title = '暂无数据',
  description = '当前没有相关内容，稍后再来看看吧',
  icon = 'default',
  action,
  className,
}: EmptyProps) {
  const Icon = icon === 'search' ? Search : Inbox;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className,
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 mb-5">
        <Icon className="h-10 w-10 text-brand-400" />
      </div>
      <h3 className="text-base font-semibold text-brand-800 mb-1.5">{title}</h3>
      <p className="text-sm text-brand-500 mb-5 max-w-xs">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
