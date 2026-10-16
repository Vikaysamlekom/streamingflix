import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Sparkles } from 'lucide-react';
import { HeroCarousel } from '@/features/home/HeroCarousel';
import { ContinueWatchingRow } from '@/features/watch-progress/ContinueWatchingRow';
import { MovieRow } from '@/components/movies/MovieRow';
import { PosterCard } from '@/components/movies/PosterCard';
import { Top10Card } from '@/components/movies/Top10Card';
import { RowSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/feedback/States';
import { useHome, usePublicSettings } from '@/features/movies/hooks/use-catalog';

/** Halaman Beranda: hero + baris konten. */
export function HomePage() {
  const { data, isLoading, isError, refetch } = useHome();
  const { data: settings } = usePublicSettings();

  useEffect(() => {
    document.title = `${settings?.siteName ?? 'StreamFlix'} - Nonton Film Streaming`;
  }, [settings?.siteName]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-[380px] w-full rounded-[var(--radius-card)] sm:h-[440px] lg:h-[500px]" />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          title="Gagal memuat beranda"
          description="Kami tidak dapat memuat konten. Pastikan server API berjalan lalu coba lagi."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const isEmpty =
    data.hero.length === 0 &&
    data.trending.length === 0 &&
    data.newReleases.length === 0 &&
    data.top10.length === 0;

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Belum ada film"
          description="Katalog masih kosong. Admin dapat menambahkan film melalui dashboard."
        />
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Hero */}
      <div className="pt-4">
        <HeroCarousel
          movies={data.hero}
          limit={settings?.heroSlideLimit ?? 5}
        />
      </div>

      <div className="mx-auto mt-10 max-w-[1400px] space-y-10 px-4 sm:px-6 lg:px-8">
        {/* Lanjutkan Menonton (localStorage) */}
        <ContinueWatchingRow />

        {/* Trending */}
        {data.trending.length > 0 ? (
          <MovieRow
            title="Trending Sekarang"
            action={
              <Link
                to="/movies?sort=popular"
                className="hidden items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent sm:inline-flex"
              >
                <Flame className="size-4" aria-hidden="true" />
                Lihat semua
              </Link>
            }
          >
            {data.trending.map((movie) => (
              <PosterCard key={movie.id} movie={movie} />
            ))}
          </MovieRow>
        ) : null}

        {/* Rilis Terbaru */}
        {data.newReleases.length > 0 ? (
          <MovieRow
            title="Rilis Terbaru"
            action={
              <Link
                to="/movies?sort=newest"
                className="hidden items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent sm:inline-flex"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Lihat semua
              </Link>
            }
          >
            {data.newReleases.map((movie) => (
              <PosterCard key={movie.id} movie={movie} />
            ))}
          </MovieRow>
        ) : null}

        {/* Top 10 */}
        {data.top10.length > 0 ? (
          <MovieRow title="Top 10 di StreamFlix Hari Ini">
            {data.top10.map((movie) => (
              <Top10Card key={movie.id} movie={movie} />
            ))}
          </MovieRow>
        ) : null}

        {/* Baris per genre */}
        {data.genreRows.map((row) => (
          <MovieRow
            key={row.category.id}
            title={row.category.name}
            action={
              <Link
                to={`/movies?category=${encodeURIComponent(row.category.slug)}`}
                className="hidden text-sm font-medium text-text-muted transition-colors hover:text-accent sm:inline"
              >
                Lihat semua
              </Link>
            }
          >
            {row.movies.map((movie) => (
              <PosterCard key={movie.id} movie={movie} />
            ))}
          </MovieRow>
        ))}
      </div>
    </div>
  );
}
