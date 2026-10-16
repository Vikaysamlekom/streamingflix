import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { PosterCard } from '@/components/movies/PosterCard';
import { PosterSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/use-debounce';
import { useCategories, useMovies } from '@/features/movies/hooks/use-catalog';

const PAGE_SIZE = 24;

/** Halaman pencarian: filter berdasarkan judul + genre. */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const category = params.get('category') ?? undefined;
  const page = Number(params.get('page') ?? '1') || 1;

  const [term, setTerm] = useState(urlQ);
  const debounced = useDebounce(term, 400);
  const { data: categories } = useCategories();

  // Sinkronkan input bila URL berubah dari luar (mis. navbar).
  useEffect(() => {
    setTerm(urlQ);
  }, [urlQ]);

  // Terapkan pencarian yang sudah di-debounce ke URL.
  useEffect(() => {
    const value = debounced.trim();
    if (value === urlQ) return;
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    document.title = urlQ ? `Cari: ${urlQ} - StreamFlix` : 'Cari - StreamFlix';
  }, [urlQ]);

  const { data, isLoading, isError, refetch, isFetching } = useMovies({
    q: urlQ || undefined,
    category,
    page,
    limit: PAGE_SIZE,
  });

  const movies = data?.data ?? [];
  const meta = data?.meta;

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          Cari Film
        </h1>
      </header>

      {/* Input pencarian */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 focus-within:border-accent">
          <SearchIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ketik judul film…"
            aria-label="Cari film berdasarkan judul"
            className="h-full w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/70 focus:outline-none"
          />
        </div>

        <select
          value={category ?? ''}
          onChange={(e) => updateParam('category', e.target.value || undefined)}
          aria-label="Filter genre"
          className="h-11 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">Semua genre</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {urlQ ? (
        <p className="mb-6 text-sm text-text-muted">
          {meta ? `${meta.total} hasil` : 'Mencari'} untuk{' '}
          <span className="font-semibold text-text-primary">“{urlQ}”</span>
        </p>
      ) : null}

      {/* Hasil */}
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <PosterSkeleton key={i} />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          title={
            urlQ
              ? `Tidak ada hasil untuk “${urlQ}”`
              : 'Masukkan kata kunci pencarian'
          }
          description={
            urlQ
              ? 'Coba kata kunci lain atau ubah filter genre.'
              : 'Cari film berdasarkan judul, atau pilih genre untuk menjelajah.'
          }
        />
      ) : (
        <>
          <div
            className={
              isFetching
                ? 'grid grid-cols-2 gap-4 opacity-60 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
            }
          >
            {movies.map((movie) => (
              <PosterCard key={movie.id} movie={movie} fluid />
            ))}
          </div>

          {meta && meta.totalPages && meta.totalPages > 1 ? (
            <nav
              className="mt-10 flex items-center justify-center gap-2"
              aria-label="Navigasi halaman"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                Sebelumnya
              </Button>
              <span className="px-3 text-sm text-text-muted">
                Halaman {page} dari {meta.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                Berikutnya
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
