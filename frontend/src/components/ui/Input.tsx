import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

const fieldBase =
  'w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/70 transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-text-primary"
        >
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, wrapperClassName, className, id, required, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        htmlFor={inputId}
        className={wrapperClassName}
      >
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          className={cn(fieldBase, error && 'border-danger', className)}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);
Input.displayName = 'Input';

type PasswordInputProps = InputProps;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(fieldBase, 'pr-10', className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted transition-colors hover:text-text-primary"
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {visible ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, wrapperClassName, className, id, required, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        htmlFor={inputId}
        className={wrapperClassName}
      >
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          className={cn(fieldBase, 'min-h-[96px] resize-y', error && 'border-danger', className)}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, wrapperClassName, className, id, required, children, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        htmlFor={inputId}
        className={wrapperClassName}
      >
        <select
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          className={cn(fieldBase, 'appearance-none bg-[length:0]', error && 'border-danger', className)}
          {...rest}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  },
);
Select.displayName = 'Select';
