import { SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  children?: ReactNode;
}

export default function FormSelect({
  label,
  error,
  hint,
  options,
  children,
  className,
  id,
  disabled,
  ...props
}: FormSelectProps) {
  const selectId = id || (props.name ? `select-${props.name}` : undefined);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-brand-800"
        >
          {label}
          {props.required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          className={cn(
            'w-full h-10 appearance-none rounded-xl border bg-white px-4 pr-10 text-sm text-brand-800',
            'transition-all duration-200 focus:outline-none focus:ring-2',
            error
              ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-100'
              : 'border-brand-200 focus:border-brand-400 focus:ring-brand-100 hover:border-brand-300',
            disabled && 'bg-brand-50/50 cursor-not-allowed opacity-70',
            className,
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
      </div>
      {error ? (
        <p className="text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-brand-500">{hint}</p>
      ) : null}
    </div>
  );
}
