import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Film,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { Poster } from '@/components/movies/Poster';
import { adminCategoriesApi } from '@/services/api/categories.api';
import { ApiRequestError } from '@/services/api/client';
import { adminMoviesApi } from '@/services/api/movies.api';
import type { MovieSummary } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDateTime } from '@/utils/format';

const LIMIT = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'Semua status' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

export function MoviesTable() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<MovieSummary | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category]);

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminCategoriesApi.list(),
  });
  const categories = categoriesQuery.data?.data ?? [];

  const moviesQuery = useQuery({
    queryKey: ['admin', 'movies', { q: debouncedSearch, status, category, page }],
    queryFn: () =>
      adminMoviesApi.list({
        q: debouncedSearch || undefined,
        status: status || undefined,
        category: category || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const movies = moviesQuery.data?.data ?? [];
  const meta = moviesQuery.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const invalidateMovies = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'movies'] });
    void queryClient.invalidateQueries({ queryKey: ['home'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      nextStatus,
    }: {
      id: number;
      nextStatus: 'draft' | 'published';
    }) => adminMoviesApi.updateStatus(id, nextStatus),
    onSuccess: (res, variables) => {
      invalidateMovies();
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'movies', res.data.id],
      });
      success(
        variables.nextStatus === 'published'
          ? 'Film berhasil dipublikasikan.'
          : 'Film berhasil diubah menjadi draft.',
      );
    },
    onError: (err) => {
      showError(
        err instanceof ApiRequestError
          ? err.message
          : 'Gagal mengubah status film.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminMoviesApi.remove(id),
    onSuccess: () => {
      invalidateMovies();
      success('Film berhasil dihapus.');
      setDeleteTarget(null);
    },
    onError: (err) => {
      showError(
        err instanceof ApiRequestError ? err.message : 'Gagal menghapus film.',
      );
    },
  });

  const renderActions = (movie: MovieSummary) => {
    const published = Boolean(movie.publishedAt);
    return (
      <div className="flex items-center justify-end gap-1">
        <Link
          to={`/admin/movies/${movie.id}/edit`}
          className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] text-text-primary transition-colors hover:bg-surface-elevated"
          aria-label="Ubah"
          title="Ubah"
        >
          <Pencil className="size-4" />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={published ? 'Jadikan draft' : 'Publikasikan'}
          title={published ? 'Jadikan draft' : 'Publikasikan'}
          disabled={statusMutation.isPending}
          onClick={() =>
            statusMutation.mutate({
              id: movie.id,
              nextStatus: published ? 'draft' : 'published',
            })
          }
        >
          {published ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Hapus"
          title="Hapus"
          className="text-danger hover:bg-danger/10"
          onClick={() => setDeleteTarget(movie)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Film</h1>
        <Link to="/admin/movies/new">
          <Button variant="primary" leftIcon={<Plus className="size-4" />}>
            Tambah Film
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            name="search"
            label="Cari"
            placeholder="Cari judul film..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          name="status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          wrapperClassName="sm:w-44"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          name="category"
          label="Kategori"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          wrapperClassName="sm:w-52"
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {moviesQuery.isError ? (
        <ErrorState
          title="Gagal memuat film"
          description="Daftar film tidak dapat dimuat saat ini."
          onRetry={() => {
            void moviesQuery.refetch();
          }}
        />
      ) : moviesQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          icon={<Film className="size-8" />}
          title="Belum ada film"
          description="Tambahkan film pertama Anda untuk mulai membangun katalog."
          action={
            <Link to="/admin/movies/new">
              <Button variant="primary" leftIcon={<Plus className="size-4" />}>
                Tambah Film
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Poster</th>
                  <th className="px-4 py-3 font-medium">Judul</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Diperbarui</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((movie) => (
                  <tr
                    key={movie.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Poster
                        src={movie.posterUrl}
                        alt={movie.title}
                        title={movie.title}
                        className="w-10"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {movie.title}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{movie.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {movie.categories.length > 0 ? (
                          movie.categories.map((c) => (
                            <Badge key={c.id} variant="outline">
                              {c.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={movie.publishedAt ? 'published' : 'draft'}
                      >
                        {movie.publishedAt ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {movie.publishedAt
                        ? formatDateTime(movie.publishedAt)
                        : '-'}
                    </td>
                    <td className="px-4 py-3">{renderActions(movie)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3"
              >
                <Poster
                  src={movie.posterUrl}
                  alt={movie.title}
                  title={movie.title}
                  className="w-12 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary">
                    {movie.title}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {movie.slug}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant={movie.publishedAt ? 'published' : 'draft'}>
                      {movie.publishedAt ? 'Published' : 'Draft'}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {movie.publishedAt
                        ? formatDateTime(movie.publishedAt)
                        : '-'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {movie.categories.map((c) => (
                      <Badge key={c.id} variant="outline">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">{renderActions(movie)}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ChevronLeft className="size-4" />}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ChevronRight className="size-4" />}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="Hapus film"
        description={`Yakin ingin menghapus "${deleteTarget?.title ?? ''}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
