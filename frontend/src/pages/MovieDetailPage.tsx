import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Star, Clock, Calendar, ChevronLeft } from 'lucide-react';
import { Poster } from '@/components/movies/Poster';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/States';
import { MovieRow } from '@/components/movies/MovieRow';
import { PosterCard } from '@/components/movies/PosterCard';
import { MyListButton } from '@/features/my-list/MyListButton';
import { useMovie, useMovies } from '@/features/movies/hooks/use-catalog';
import { formatDuration, formatViews } from '@/utils/format';

export function MovieDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: movie, isLoading, isError, refetch } = useMovie(slug);

  const primaryCategory = movie?.categories[0]?.slug;
  const { data: relatedData } = useMovies({
    category: primaryCategory,
    limit: 12,
    sort: 'popular',
  });

  useEffect(() => {
    document.title = movie ? `${movie.title} - StreamFlix` : 'StreamFlix';
  }, [movie]);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !movie) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          title="Film tidak ditemukan"
          description="Film yang Anda cari tidak tersedia atau telah dihapus."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const related = (relatedData?.data ?? []).filter((m) => m.slug !== movie.slug);

  return (
    <div>
      {/* Banner */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 h-[420px] overflow-hidden">
          {movie.bannerUrl || movie.posterUrl ? (
            <img
              src={movie.bannerUrl ?? movie.posterUrl ?? ''}
              alt=""
              className="size-full object-cover opacity-40"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        </div>

        <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
          <Link
            to="/movies"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-accent"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Kembali ke katalog
          </Link>

          <div className="flex flex-col gap-8 pb-10 sm:flex-row sm:items-end">
            <div className="mx-auto w-44 shrink-0 sm:mx-0 sm:w-60">
              <Poster
                title={movie.title}
                alt={`Poster ${movie.title}`}
                src={movie.posterUrl}
                className="shadow-2xl"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
                {movie.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
                {movie.rating !== null ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-warning">
                    <Star className="size-4 fill-current" aria-hidden="true" />
                    {movie.rating.toFixed(1)}
                  </span>
                ) : null}
                {movie.releaseYear ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-4" aria-hidden="true" />
                    {movie.releaseYear}
                  </span>
                ) : null}
                {movie.durationMinutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4" aria-hidden="true" />
                    {formatDuration(movie.durationMinutes)}
                  </span>
                ) : null}
                <span>{formatViews(movie.viewCount)} ditonton</span>
                {movie.ageRating ? (
                  <Badge variant="outline">{movie.ageRating}</Badge>
                ) : null}
              </div>

              {movie.categories.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {movie.categories.map((c) => (
                    <Link key={c.id} to={`/movies?category=${c.slug}`}>
                      <Badge>{c.name}</Badge>
                    </Link>
                  ))}
                </div>
              ) : null}

              {movie.synopsis ? (
                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
                  {movie.synopsis}
                </p>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to={`/watch/${movie.slug}`}>
                  <Button size="lg" leftIcon={<Play className="size-5 fill-current" />}>
                    Putar Sekarang
                  </Button>
                </Link>
                <MyListButton slug={movie.slug} title={movie.title} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Film serupa */}
      {related.length > 0 ? (
        <div className="mx-auto max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-8">
          <MovieRow title="Film Serupa">
            {related.map((m) => (
              <PosterCard key={m.id} movie={m} />
            ))}
          </MovieRow>
        </div>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 sm:flex-row">
        <Skeleton className="mx-auto h-80 w-44 rounded-[var(--radius-card)] sm:mx-0 sm:w-60" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    </div>
  );
}
