import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Star, Clock, Calendar } from 'lucide-react';
import { VideoPlayer } from '@/features/video-player/VideoPlayer';
import { MyListButton } from '@/features/my-list/MyListButton';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/States';
import { MovieRow } from '@/components/movies/MovieRow';
import { PosterCard } from '@/components/movies/PosterCard';
import { useMovie, useMovies } from '@/features/movies/hooks/use-catalog';
import { moviesApi } from '@/services/api/movies.api';
import { useToast } from '@/components/ui/Toast';
import { formatDuration, formatViews } from '@/utils/format';

/**
 * Halaman menonton: memutar video, menyimpan progres, dan mencatat view
 * (satu kali per pemutaran) saat video benar-benar diputar.
 */
export function WatchPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: movie, isLoading, isError, refetch } = useMovie(slug);
  const toast = useToast();
  const viewRecordedRef = useRef(false);

  // Reset penanda saat slug berubah.
  useEffect(() => {
    viewRecordedRef.current = false;
  }, [slug]);

  const primaryCategory = movie?.categories[0]?.slug;
  const { data: relatedData } = useMovies({
    category: primaryCategory,
    limit: 12,
    sort: 'popular',
  });

  useEffect(() => {
    document.title = movie ? `Menonton ${movie.title} - StreamFlix` : 'StreamFlix';
  }, [movie]);

  const handleStarted = () => {
    if (!slug) return;
    if (viewRecordedRef.current) return;
    viewRecordedRef.current = true;
    moviesApi.recordView(slug).catch(() => {
      // Pencatatan view bersifat non-kritis; abaikan kegagalan.
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan disalin ke papan klip');
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="aspect-video w-full rounded-[var(--radius-card)]" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 lg:px-8">
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
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to={`/movies/${movie.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-accent"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Kembali ke detail
      </Link>

      {movie.videoUrl ? (
        <VideoPlayer
          slug={movie.slug}
          title={movie.title}
          src={movie.videoUrl}
          posterUrl={movie.bannerUrl ?? movie.posterUrl}
          onStarted={handleStarted}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface text-sm text-text-muted">
          Sumber video belum tersedia untuk film ini.
        </div>
      )}

      <div className="mt-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          {movie.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <MyListButton slug={movie.slug} title={movie.title} />
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-button)] border border-border bg-surface-elevated px-5 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Salin Tautan
          </button>
        </div>

        {movie.synopsis ? (
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-text-muted">
            {movie.synopsis}
          </p>
        ) : null}
      </div>

      {related.length > 0 ? (
        <div className="mt-12">
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
