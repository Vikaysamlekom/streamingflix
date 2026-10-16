import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Poster } from './Poster';
import { RatingBadge } from './RatingBadge';
import type { RankedMovie } from '@/types';
import { cn } from '@/utils/cn';

interface Top10CardProps {
  movie: RankedMovie;
  className?: string;
}

/**
 * Kartu Top 10: poster dengan angka besar 1-10 berbentuk outline hijau
 * di sisi kiri (efek angka bertumpuk di belakang poster).
 */
export function Top10Card({ movie, className }: Top10CardProps) {
  return (
    <Link
      to={`/movies/${movie.slug}`}
      className={cn(
        'group/top relative flex w-[210px] shrink-0 snap-start items-end sm:w-[240px]',
        className,
      )}
      aria-label={`Peringkat ${movie.rank}: ${movie.title}`}
    >
      {/* Angka besar outline hijau */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none pr-1 text-[120px] font-black leading-[0.75] tracking-tighter text-transparent sm:text-[150px]"
        style={{
          WebkitTextStroke: '2px var(--color-accent)',
        }}
      >
        {movie.rank}
      </span>

      <div className="relative -ml-6 shrink-0 sm:-ml-8">
        <div className="w-[120px] sm:w-[140px]">
          <Poster
            src={movie.posterUrl}
            alt={`Poster ${movie.title}`}
            title={movie.title}
            className="shadow-[var(--shadow-card)] transition-transform duration-200 group-hover/top:-translate-y-1"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] opacity-0 transition-opacity duration-200 group-hover/top:bg-black/40 group-hover/top:opacity-100">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-contrast">
            <Play className="size-5 translate-x-[1px] fill-current" />
          </span>
        </div>
        <RatingBadge rating={movie.rating} className="absolute right-2 top-2" />
      </div>

      <div className="pointer-events-none absolute bottom-0 left-[112px] right-0 sm:left-[128px]">
        <p className="line-clamp-2 text-xs font-semibold text-text-primary text-shadow-hero">
          {movie.title}
        </p>
      </div>
    </Link>
  );
}
