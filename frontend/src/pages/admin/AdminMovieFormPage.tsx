import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ErrorState } from '@/components/feedback/States';
import { MovieForm } from '@/features/admin/movies/MovieForm';
import { adminMoviesApi, type MoviePayload } from '@/services/api/movies.api';

export default function AdminMovieFormPage() {
  const { id } = useParams<{ id?: string }>();
  const movieId = id !== undefined ? Number(id) : undefined;
  const isEdit = movieId !== undefined && !Number.isNaN(movieId);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success } = useToast();

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Film - Admin StreamFlix'
      : 'Tambah Film - Admin StreamFlix';
  }, [isEdit]);

  const movieQuery = useQuery({
    queryKey: ['admin', 'movies', movieId],
    queryFn: () => adminMoviesApi.get(movieId as number),
    enabled: isEdit,
  });

  const invalidateCatalog = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'movies'] });
    void queryClient.invalidateQueries({ queryKey: ['home'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: MoviePayload) => adminMoviesApi.create(payload),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: MoviePayload) =>
      adminMoviesApi.update(movieId as number, payload),
  });

  const handleCreate = async (payload: MoviePayload) => {
    await createMutation.mutateAsync(payload);
    invalidateCatalog();
    success('Film berhasil dibuat');
    navigate('/admin/movies');
  };

  const handleUpdate = async (payload: MoviePayload) => {
    await updateMutation.mutateAsync(payload);
    invalidateCatalog();
    success('Film berhasil diperbarui');
    navigate('/admin/movies');
  };

  if (isEdit) {
    if (movieQuery.isLoading) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner label="Memuat film..." />
        </div>
      );
    }

    if (movieQuery.isError || !movieQuery.data) {
      return (
        <ErrorState
          title="Gagal memuat film"
          description="Data film tidak dapat dimuat saat ini."
          onRetry={() => {
            void movieQuery.refetch();
          }}
        />
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-text-primary">Edit Film</h1>
        <MovieForm
          mode="edit"
          initial={movieQuery.data.data}
          onSubmit={handleUpdate}
          submitting={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text-primary">Tambah Film</h1>
      <MovieForm
        mode="create"
        onSubmit={handleCreate}
        submitting={createMutation.isPending}
      />
    </div>
  );
}
