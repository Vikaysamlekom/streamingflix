import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { WideCard } from '@/components/movies/WideCard';
import { MovieRow } from '@/components/movies/MovieRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWatchProgress } from '@/features/watch-progress/use-watch-progress';
import { useMoviesBySlugs } from '@/features/movies/hooks/use-catalog';

/**
 * Baris "Lanjutkan Menonton" (data dari localStorage).
 * Hanya menampilkan film yang masih ada & published di katalog.
 */
export function ContinueWatchingRow() {
  const { progress, remove } = useWatchProgress();

  // Urutkan entri berdasarkan waktu update terbaru.
  const slugs = useMemo(
    () =>
      Object.entries(progress)
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        .slice(0, 12)
        .map(([slug]) => slug),
    [progress],
  );

  const { data, isLoading } = useMoviesBySlugs(slugs);

  // Tidak menampilkan apa pun bila tidak ada progres.
  if (slugs.length === 0) return null;

  const bySlug = new Map((data ?? []).map((m) => [m.slug, m]));
  const ordered = slugs
    .map((slug) => bySlug.get(slug))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // Jika semua slug sudah tidak valid (film dihapus), sembunyikan.
  if (!isLoading && ordered.length === 0) return null;

  return (
    <MovieRow
      title="Lanjutkan Menonton"
      action={
        <Link
          to="/my-list"
          className="hidden items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent sm:inline-flex"
        >
          <History className="size-4" aria-hidden="true" />
          Daftar Saya
        </Link>
      }
    >
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-video w-[260px] shrink-0 rounded-[var(--radius-card)] sm:w-[300px]"
            />
          ))
        : ordered.map((movie) => {
            const entry = progress[movie.slug];
            return (
              <WideCard
                key={movie.slug}
                slug={movie.slug}
                title={movie.title}
                posterUrl={movie.posterUrl}
                bannerUrl={movie.bannerUrl}
                positionSec={entry?.positionSec ?? 0}
                durationSec={entry?.durationSec ?? 1}
                onRemove={remove}
              />
            );
          })}
    </MovieRow>
  );
}
