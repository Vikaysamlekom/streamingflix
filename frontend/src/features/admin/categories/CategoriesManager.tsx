import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { adminCategoriesApi } from '@/services/api/categories.api';
import { ApiRequestError } from '@/services/api/client';
import type { Category } from '@/types';

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama wajib diisi')
    .max(100, 'Nama maksimal 100 karakter'),
  slug: z
    .string()
    .trim()
    .max(100, 'Slug maksimal 100 karakter')
    .regex(/^[a-z0-9-]*$/, 'Gunakan huruf kecil, angka, dan tanda hubung'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesManager() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminCategoriesApi.list(),
  });
  const categories = categoriesQuery.data?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (!modalOpen) return;
    reset({ name: editing?.name ?? '', slug: editing?.slug ?? '' });
  }, [modalOpen, editing, reset]);

  const invalidateCategories = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim() || undefined,
      };
      return editing
        ? adminCategoriesApi.update(editing.id, payload)
        : adminCategoriesApi.create(payload);
    },
    onSuccess: () => {
      invalidateCategories();
      success(editing ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err) => {
      showError(
        err instanceof ApiRequestError
          ? err.message
          : 'Gagal menyimpan kategori.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCategoriesApi.remove(id),
    onSuccess: () => {
      invalidateCategories();
      success('Kategori berhasil dihapus.');
      setDeleteTarget(null);
    },
    onError: (err) => {
      if (err instanceof ApiRequestError && err.code === 'CATEGORY_IN_USE') {
        // Pesan backend sudah menyertakan jumlah film yang memakai kategori.
        showError(err.message);
      } else {
        showError(
          err instanceof ApiRequestError
            ? err.message
            : 'Gagal menghapus kategori.',
        );
      }
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setModalOpen(true);
  };

  const onSubmit = handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Kategori</h1>
        <Button
          variant="primary"
          leftIcon={<Plus className="size-4" />}
          onClick={openCreate}
        >
          Tambah Kategori
        </Button>
      </div>

      {categoriesQuery.isError ? (
        <ErrorState
          title="Gagal memuat kategori"
          description="Daftar kategori tidak dapat dimuat saat ini."
          onRetry={() => {
            void categoriesQuery.refetch();
          }}
        />
      ) : categoriesQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tags className="size-8" />}
          title="Belum ada kategori"
          description="Buat kategori untuk mengelompokkan film di katalog."
          action={
            <Button
              variant="primary"
              leftIcon={<Plus className="size-4" />}
              onClick={openCreate}
            >
              Tambah Kategori
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Jumlah Film</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {category.name}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{category.slug}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {category.movieCount ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ubah"
                        title="Ubah"
                        onClick={() => openEdit(category)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus"
                        title="Hapus"
                        className="text-danger hover:bg-danger/10"
                        onClick={() => setDeleteTarget(category)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Ubah Kategori' : 'Tambah Kategori'}
        description={
          editing
            ? 'Perbarui nama atau slug kategori.'
            : 'Buat kategori baru untuk film Anda.'
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Nama"
            required
            placeholder="Contoh: Aksi"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Slug"
            placeholder="aksi"
            hint="Opsional. Kosongkan untuk membuat otomatis."
            error={errors.slug?.message}
            {...register('slug')}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="Hapus kategori"
        description={`Yakin ingin menghapus kategori "${deleteTarget?.name ?? ''}"?`}
        confirmLabel="Hapus"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
