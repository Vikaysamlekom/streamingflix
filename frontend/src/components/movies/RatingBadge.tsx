import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

interface RatingBadgeProps {
  rating: number | null | undefined;
  className?: string;
}

/** Badge rating bintang (pojok kartu). */
export function RatingBadge({ rating, className }: RatingBadgeProps) {
  if (rating === null || rating === undefined) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/65 px-2 py-0.5 text-xs font-semibold text-rating backdrop-blur-sm',
        className,
      )}
    >
      <Star className="size-3 fill-current" aria-hidden="true" />
      {rating.toFixed(1)}
    </span>
  );
}

interface AgeBadgeProps {
  age: string | null | undefined;
  className?: string;
}

/** Badge batas usia (mis. 13+). */
export function AgeBadge({ age, className }: AgeBadgeProps) {
  if (!age) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-white/25 px-1.5 py-0.5 text-[11px] font-semibold text-white/90',
        className,
      )}
    >
      {age}
    </span>
  );
}
