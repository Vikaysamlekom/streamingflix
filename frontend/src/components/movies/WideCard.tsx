import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { Poster } from './Poster';
import { cn } from '@/utils/cn';
import { formatDuration, percent } from '@/utils/format';

interface WideCardProps {
  slug: string;
  title: string;
  posterUrl?: string | null;
  bannerUrl?: string | null;
  positionSec: number;
  durationSec: number;
  onRemove?: (slug: string) => void;
  className?: string;
}

/**
 * Kartu lanskap 16:9 untuk baris "Lanjutkan Menonton".
 * Menampilkan overlay tombol play, progress bar hijau, dan persentase.
 */
export function WideCard({
  slug,
  title,
  posterUrl,
  bannerUrl,
  positionSec,
  durationSec,
  onRemove,
  className,
}: WideCardProps) {
  const pct = Math.round(percent(positionSec, durationSec));

  return (
    <div
      className={cn(
        'group/wc relative w-[260px] shrink-0 snap-start sm:w-[300px]',
        className,
      )}
    >
      <Link to={`/watch/${slug}`} className="block">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
          <Poster
            src={bannerUrl ?? posterUrl}
            alt={`Lanjutkan menonton ${title}`}
            title={title}
            aspect="16/9"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-90 transition-opacity group-hover/wc:opacity-100">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-lg">
              <Play className="size-6 translate-x-[1px] fill-current" />
            </span>
          </span>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-accent"
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white text-shadow-hero">
                {title}
              </p>
              <p className="text-xs text-white/70">
                {pct}% · sisa {formatDuration(Math.max(0, Math.round((durationSec - positionSec) / 60)))} lagi
              </p>
            </div>
          </div>
        </div>
      </Link>

      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(slug)}
          aria-label={`Hapus ${title} dari Lanjutkan Menonton`}
          className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white/80 opacity-0 transition-opacity hover:bg-danger hover:text-white group-hover/wc:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
