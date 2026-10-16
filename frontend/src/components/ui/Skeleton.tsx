import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface-elevated',
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** Placeholder kartu poster 2:3 */
export function PosterSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      <Skeleton className="aspect-[2/3] w-full rounded-[var(--radius-card)]" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

/** Placeholder baris poster */
export function RowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[150px] shrink-0 sm:w-[170px]">
          <PosterSkeleton />
        </div>
      ))}
    </div>
  );
}
