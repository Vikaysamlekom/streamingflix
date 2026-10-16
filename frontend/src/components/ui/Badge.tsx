import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant =
  | 'default'
  | 'accent'
  | 'draft'
  | 'published'
  | 'rating'
  | 'outline'
  | 'danger';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-text-muted border border-border',
  accent: 'bg-accent/15 text-accent border border-accent/30',
  draft: 'bg-surface-elevated text-text-muted border border-border',
  published: 'bg-accent/15 text-accent border border-accent/30',
  rating: 'bg-black/60 text-rating border border-white/10',
  outline: 'bg-transparent text-text-muted border border-border',
  danger: 'bg-danger/15 text-danger border border-danger/30',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
