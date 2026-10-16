import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border bg-surface/40 px-6 py-12 text-center ${className ?? ''}`}
    >
      {icon ? <div className="text-text-muted">{icon}</div> : null}
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Terjadi kesalahan',
  description = 'Kami tidak dapat memuat data saat ini. Silakan coba lagi.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-danger/30 bg-danger/5 px-6 py-12 text-center ${className ?? ''}`}
      role="alert"
    >
      <span className="rounded-full bg-danger/15 p-3 text-danger">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="max-w-md text-sm text-text-muted">{description}</p>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-4" />}
        >
          Coba Lagi
        </Button>
      ) : null}
    </div>
  );
}
