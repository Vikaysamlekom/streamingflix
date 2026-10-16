import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Compass } from 'lucide-react';
import { PosterCard } from '@/components/movies/PosterCard';
import { PosterSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';
import { useMyList } from '@/features/my-list/use-my-list';
import { useMoviesBySlugs } from '@/features/movies/hooks/use-catalog';

/** Halaman Daftar Saya: grid film yang disimpan di localStorage. */
export function MyListPage() {
  const { slugs, retainOnly } = useMyList();
  const { data, isLoading, isError, refetch } = useMoviesBySlugs(slugs);

  useEffect(() => {
    document.title = 'Daftar Saya - StreamFlix';
  }, []);

  // Urutkan sesuai urutan penyimpanan (terbaru dulu).
  const ordered = useMemo(() => {
    if (!data) return [];
    const bySlug = new Map(data.map((m) => [m.slug, m]));
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [data, slugs]);

  // Bersihkan slug yang sudah tidak ada di katalog.
  useEffect(() => {
    if (!data || slugs.length === 0) return;
    const valid = data.map((m) => m.slug);
    if (valid.length !== slugs.length) {
      retainOnly(valid);
    }
  }, [data, slugs, retainOnly]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Bookmark className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            Daftar Saya
          </h1>
          <p className="text-sm text-text-muted">
            {slugs.length > 0
              ? `${slugs.length} film disimpan di peramban ini`
              : 'Film yang Anda simpan akan muncul di sini'}
          </p>
        </div>
      </header>

      {slugs.length === 0 ? (
        <EmptyState
          icon={<Compass className="size-8" />}
          title="Daftar Saya masih kosong"
          description="Jelajahi katalog dan tekan tombol Daftar Saya pada film untuk menyimpannya di sini."
          action={
            <Link to="/movies">
              <Button leftIcon={<Compass className="size-4" />}>
                Jelajahi Film
              </Button>
            </Link>
          }
        />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <EmptyState
          title="Film tidak tersedia"
          description="Film yang Anda simpan sudah tidak tersedia di katalog."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {ordered.map((movie) => (
            <PosterCard key={movie.id} movie={movie} fluid />
          ))}
        </div>
      )}
    </div>
  );
}
