import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Poster } from './Poster';
import { AgeBadge, RatingBadge } from './RatingBadge';
import type { MovieSummary } from '@/types';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/format';

interface PosterCardProps {
  movie: MovieSummary;
  className?: string;
  /** Tampilkan tombol tambah/aktif di Daftar Saya (opsional, dari parent) */
  overlayAction?: React.ReactNode;
  /** Bila true, lebar mengikuti kontainer (untuk grid) alih-alih lebar tetap (untuk baris). */
  fluid?: boolean;
}

/**
 * Kartu poster potret (2:3) untuk baris konten dan grid.
 * Hover: sedikit membesar, bayangan, overlay play.
 */
export function PosterCard({ movie, className, overlayAction, fluid }: PosterCardProps) {
  const genre = movie.categories[0]?.name;
  const meta = [genre, movie.releaseYear].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/movies/${movie.slug}`}
      className={cn(
        'group/card relative block snap-start',
        fluid ? 'w-full' : 'w-[150px] shrink-0 sm:w-[172px]',
        'transition-transform duration-200 hover:z-10 hover:-translate-y-1',
        className,
      )}
    >
      <div className="relative">
        <Poster
          src={movie.posterUrl}
          alt={`Poster ${movie.title}`}
          title={movie.title}
          className="shadow-[var(--shadow-card)] transition-shadow duration-200 group-hover/card:shadow-[var(--shadow-elevated)]"
        />

        {/* Overlay play saat hover */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] bg-black/0 opacity-0 transition-all duration-200 group-hover/card:bg-black/40 group-hover/card:opacity-100">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-lg">
            <Play className="size-5 translate-x-[1px] fill-current" />
          </span>
        </div>

        {/* Rating badge pojok kanan atas */}
        <RatingBadge
          rating={movie.rating}
          className="absolute right-2 top-2"
        />

        {/* Aksi tambahan (mis. tombol Daftar Saya) */}
        {overlayAction ? (
          <div className="absolute left-2 top-2">{overlayAction}</div>
        ) : null}
      </div>

      <div className="mt-2.5 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
          {movie.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
          <span className="truncate">{meta}</span>
          {movie.durationMinutes ? (
            <span className="shrink-0">
              {formatDuration(movie.durationMinutes)}
            </span>
          ) : null}
          <AgeBadge age={movie.ageRating} />
        </div>
      </div>
    </Link>
  );
}
