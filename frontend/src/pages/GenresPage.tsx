import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { useCategories } from '@/features/movies/hooks/use-catalog';

/** Halaman Genre: daftar semua genre sebagai kartu yang menuju katalog terfilter. */
export function GenresPage() {
  const { data: categories, isLoading, isError, refetch } = useCategories();

  useEffect(() => {
    document.title = 'Genre - StreamFlix';
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          Jelajahi Genre
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Pilih genre untuk melihat koleksi filmnya.
        </p>
      </header>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : !categories || categories.length === 0 ? (
        <EmptyState
          title="Belum ada genre"
          description="Genre akan muncul di sini setelah admin menambahkannya."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/movies?category=${encodeURIComponent(c.slug)}`}
              className="group flex h-28 flex-col justify-between rounded-[var(--radius-card)] border border-border bg-gradient-to-br from-surface-elevated to-surface p-5 transition-colors hover:border-accent"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Tag className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-text-primary group-hover:text-accent">
                  {c.name}
                </p>
                {typeof c.movieCount === 'number' ? (
                  <p className="text-xs text-text-muted">{c.movieCount} film</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
