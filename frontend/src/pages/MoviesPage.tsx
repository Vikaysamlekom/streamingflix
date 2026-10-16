import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { PosterCard } from '@/components/movies/PosterCard';
import { PosterSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';
import { useCategories, useMovies } from '@/features/movies/hooks/use-catalog';
import { cn } from '@/utils/cn';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'popular', label: 'Terpopuler' },
  { value: 'rating', label: 'Rating Tertinggi' },
  { value: 'title', label: 'Judul (A-Z)' },
  { value: 'oldest', label: 'Terlama' },
];

const PAGE_SIZE = 24;

/** Halaman katalog film dengan filter kategori & urutan. */
export function MoviesPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? '1') || 1;

  const { data: categories } = useCategories();
  const { data, isLoading, isError, refetch, isFetching } = useMovies({
    category,
    sort,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    document.title = 'Film - StreamFlix';
  }, []);

  const movies = data?.data ?? [];
  const meta = data?.meta;

  const activeCategory = useMemo(
    () => categories?.find((c) => c.slug === category),
    [categories, category],
  );

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
          {activeCategory ? activeCategory.name : 'Jelajahi Film'}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {meta ? `${meta.total} film ditemukan` : 'Menjelajahi katalog film'}
        </p>
      </header>

      {/* Filter */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <FilterChip
            label="Semua"
            active={!category}
            onClick={() => updateParam('category', undefined)}
          />
          {categories?.map((c) => (
            <FilterChip
              key={c.id}
              label={`${c.name}${c.movieCount ? ` (${c.movieCount})` : ''}`}
              active={category === c.slug}
              onClick={() => updateParam('category', c.slug)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Urutkan
          </span>
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            aria-label="Urutkan film"
            className="h-9 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {category || sort !== 'newest' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              leftIcon={<X className="size-4" />}
            >
              Reset filter
            </Button>
          ) : null}
        </div>
      </div>

      {/* Grid */}
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <SkeletonGrid />
      ) : movies.length === 0 ? (
        <EmptyState
          title="Film tidak ditemukan"
          description="Coba ubah filter kategori atau kata kunci pencarian Anda."
        />
      ) : (
        <>
          <div
            className={cn(
              'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
              isFetching && 'opacity-60 transition-opacity',
            )}
          >
            {movies.map((movie) => (
              <PosterCard key={movie.id} movie={movie} fluid />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={meta?.totalPages ?? 1}
            onChange={(p) => updateParam('page', String(p))}
          />
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-border bg-surface text-text-muted hover:border-text-muted hover:text-text-primary',
      )}
    >
      {label}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-2"
      aria-label="Navigasi halaman"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Sebelumnya
      </Button>
      <span className="px-3 text-sm text-text-muted">
        Halaman {page} dari {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Berikutnya
      </Button>
    </nav>
  );
}
