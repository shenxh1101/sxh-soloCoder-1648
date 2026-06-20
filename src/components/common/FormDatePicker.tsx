import { InputHTMLAttributes } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../utils';

interface FormDatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  type?: 'date' | 'datetime-local' | 'time';
}

export default function FormDatePicker({
  label,
  error,
  hint,
  type = 'datetime-local',
  className,
  id,
  disabled,
  ...props
}: FormDatePickerProps) {
  const inputId = id || (props.name ? `date-${props.name}` : undefined);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-brand-800"
        >
          {label}
          {props.required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          className={cn(
            'w-full h-10 rounded-xl border bg-white pl-10 pr-4 text-sm text-brand-800',
            'transition-all duration-200 focus:outline-none focus:ring-2',
            error
              ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-100'
              : 'border-brand-200 focus:border-brand-400 focus:ring-brand-100 hover:border-brand-300',
            disabled && 'bg-brand-50/50 cursor-not-allowed opacity-70',
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-brand-500">{hint}</p>
      ) : null}
    </div>
  );
}
