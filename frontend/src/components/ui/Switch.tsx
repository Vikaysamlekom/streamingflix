import { cn } from '@/utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-3 select-none',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-surface-elevated border border-border',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {label || description ? (
        <span className="flex flex-col">
          {label ? (
            <span className="text-sm font-medium text-text-primary">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="text-xs text-text-muted">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
