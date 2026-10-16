import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Play, Plus, Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useMyList } from '@/features/my-list/use-my-list';
import type { MovieSummary } from '@/types';
import { formatDuration } from '@/utils/format';

interface HeroCarouselProps {
  movies: MovieSummary[];
  /** Batas jumlah slide (dari pengaturan) */
  limit?: number;
}

const AUTOPLAY_MS = 7000;

/**
 * Hero carousel: kartu besar membulat, kartu kiri/kanan terlihat sebagian (peek),
 * titik indikator, autoplay lambat yang berhenti saat hover/fokus,
 * dapat digeser (swipe) dan dinavigasi keyboard.
 */
export function HeroCarousel({ movies, limit = 5 }: HeroCarouselProps) {
  const slides = movies.slice(0, Math.max(1, Math.min(limit, 8)));
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { has, toggle } = useMyList();

  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      const next = (index + count) % count;
      setActive(next);
      const el = scrollerRef.current;
      if (el) {
        const child = el.children[next] as HTMLElement | undefined;
        child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    },
    [count],
  );

  // Autoplay
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % count;
        const el = scrollerRef.current;
        const child = el?.children[next] as HTMLElement | undefined;
        child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <section
      className="relative"
      aria-roledescription="carousel"
      aria-label="Film unggulan"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') goTo(active - 1);
        if (e.key === 'ArrowRight') goTo(active + 1);
      }}
      tabIndex={-1}
    >
      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 sm:px-6 lg:px-8"
      >
        {slides.map((movie, index) => (
          <HeroSlide
            key={movie.id}
            movie={movie}
            active={index === active}
            inList={has(movie.slug)}
            onToggleList={() => toggle(movie.slug)}
          />
        ))}
      </div>

      {/* Titik indikator */}
      {count > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((movie, index) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ke slide ${index + 1}`}
              aria-current={index === active}
              className={cn(
                'h-2 rounded-full transition-all',
                index === active ? 'w-6 bg-accent' : 'w-2 bg-border hover:bg-text-muted',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

interface HeroSlideProps {
  movie: MovieSummary;
  active: boolean;
  inList: boolean;
  onToggleList: () => void;
}

function HeroSlide({ movie, active, inList, onToggleList }: HeroSlideProps) {
  const meta = [
    movie.releaseYear,
    movie.categories.map((c) => c.name).join(', '),
    movie.durationMinutes ? formatDuration(movie.durationMinutes) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={cn(
        'relative w-[88vw] shrink-0 snap-center overflow-hidden rounded-[var(--radius-card)] sm:w-[80vw] lg:w-[76vw] xl:w-[70vw]',
        'h-[380px] sm:h-[440px] lg:h-[500px]',
        'transition-opacity duration-500',
        active ? 'opacity-100' : 'opacity-80',
      )}
    >
      {/* Latar banner */}
      {movie.bannerUrl || movie.posterUrl ? (
        <img
          src={movie.bannerUrl ?? movie.posterUrl ?? ''}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated to-background" />
      )}

      {/* Gradient agar teks terbaca */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-transparent" />

      {/* Konten */}
      <div className="relative flex h-full max-w-2xl flex-col justify-end gap-3 p-6 sm:p-10 lg:p-12">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white text-shadow-hero sm:text-4xl lg:text-5xl">
          {movie.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
          {meta ? <span>{meta}</span> : null}
          {movie.rating !== null ? (
            <span className="inline-flex items-center gap-1 font-semibold text-rating">
              <Star className="size-4 fill-current" aria-hidden="true" />
              {movie.rating.toFixed(1)}
            </span>
          ) : null}
          {movie.ageRating ? (
            <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs font-semibold text-white/90">
              {movie.ageRating}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/watch/${movie.slug}`}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-button)] bg-accent px-6 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            <Play className="size-5 fill-current" aria-hidden="true" />
            Putar
          </Link>
          <button
            type="button"
            onClick={onToggleList}
            aria-pressed={inList}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-button)] border border-white/25 bg-black/40 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            {inList ? (
              <Check className="size-5" aria-hidden="true" />
            ) : (
              <Plus className="size-5" aria-hidden="true" />
            )}
            {inList ? 'Ada di Daftar Saya' : 'Daftar Saya'}
          </button>
        </div>
      </div>
    </article>
  );
}
