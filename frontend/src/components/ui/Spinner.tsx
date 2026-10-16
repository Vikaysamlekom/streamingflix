import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="status">
      <Loader2
        className={cn('size-5 animate-spin text-accent', className)}
        aria-hidden="true"
      />
      {label ? <span className="text-sm text-text-muted">{label}</span> : null}
      <span className="sr-only">Memuat...</span>
    </div>
  );
}
