import { InputHTMLAttributes } from 'react';
import { cn } from '../../utils';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function FormInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  id,
  disabled,
  ...props
}: FormInputProps) {
  const inputId = id || (props.name ? `input-${props.name}` : undefined);

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
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl border bg-white text-sm text-brand-800 placeholder:text-brand-400',
            'transition-all duration-200 focus:outline-none focus:ring-2',
            leftIcon ? 'pl-10' : 'pl-4',
            rightIcon ? 'pr-10' : 'pr-4',
            error
              ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-100'
              : 'border-brand-200 focus:border-brand-400 focus:ring-brand-100 hover:border-brand-300',
            'h-10',
            disabled && 'bg-brand-50/50 cursor-not-allowed opacity-70',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-brand-500">{hint}</p>
      ) : null}
    </div>
  );
}
