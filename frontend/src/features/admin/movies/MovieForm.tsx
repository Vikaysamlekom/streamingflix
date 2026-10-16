import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { adminCategoriesApi } from '@/services/api/categories.api';
import { ApiRequestError } from '@/services/api/client';
import type { MoviePayload } from '@/services/api/movies.api';
import type { Movie } from '@/types';
import { cn } from '@/utils/cn';

const CURRENT_YEAR = new Date().getFullYear();

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const optionalHttpUrl = (label: string) =>
  z
    .string()
    .refine((v) => v === '' || isHttpUrl(v), {
      message: `${label} harus berupa URL http/https yang valid`,
    });

const movieFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Judul wajib diisi')
    .max(255, 'Judul maksimal 255 karakter'),
  slug: z
    .string()
    .trim()
    .max(255, 'Slug maksimal 255 karakter')
    .regex(/^[a-z0-9-]*$/, 'Gunakan huruf kecil, angka, dan tanda hubung'),
  synopsis: z.string().max(5000, 'Sinopsis maksimal 5000 karakter'),
  releaseYear: z.string().refine(
    (v) =>
      v === '' ||
      (/^\d{4}$/.test(v) &&
        Number(v) >= 1888 &&
        Number(v) <= CURRENT_YEAR + 1),
    { message: `Tahun rilis harus antara 1888 dan ${CURRENT_YEAR + 1}` },
  ),
  durationMinutes: z.string().refine(
    (v) =>
      v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1440),
    { message: 'Durasi harus antara 1 dan 1440 menit' },
  ),
  rating: z.string().refine(
    (v) =>
      v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 10),
    { message: 'Rating harus antara 0 dan 10' },
  ),
  ageRating: z.string().max(10, 'Age rating maksimal 10 karakter'),
  posterUrl: optionalHttpUrl('URL Poster'),
  bannerUrl: optionalHttpUrl('URL Banner'),
  videoUrl: z
    .string()
    .trim()
    .min(1, 'URL video wajib diisi')
    .refine(isHttpUrl, { message: 'URL video harus berupa URL http/https yang valid' }),
  categoryIds: z.array(z.number()),
  isFeatured: z.boolean(),
  status: z.enum(['draft', 'published']),
});

type MovieFormValues = z.infer<typeof movieFormSchema>;

function toFormValues(movie?: Movie): MovieFormValues {
  return {
    title: movie?.title ?? '',
    slug: movie?.slug ?? '',
    synopsis: movie?.synopsis ?? '',
    releaseYear: movie?.releaseYear != null ? String(movie.releaseYear) : '',
    durationMinutes:
      movie?.durationMinutes != null ? String(movie.durationMinutes) : '',
    rating: movie?.rating != null ? String(movie.rating) : '',
    ageRating: movie?.ageRating ?? '',
    posterUrl: movie?.posterUrl ?? '',
    bannerUrl: movie?.bannerUrl ?? '',
    videoUrl: movie?.videoUrl ?? '',
    categoryIds: movie?.categories?.map((c) => c.id) ?? [],
    isFeatured: movie?.isFeatured ?? false,
    status: movie?.status ?? 'draft',
  };
}

const MOVIE_FIELD_NAMES = new Set<string>(Object.keys(toFormValues()));

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toPayload(values: MovieFormValues): MoviePayload {
  return {
    title: values.title.trim(),
    slug: values.slug.trim(),
    synopsis: values.synopsis.trim(),
    posterUrl: values.posterUrl.trim(),
    bannerUrl: values.bannerUrl.trim(),
    videoUrl: values.videoUrl.trim(),
    releaseYear: values.releaseYear === '' ? null : Number(values.releaseYear),
    durationMinutes:
      values.durationMinutes === '' ? null : Number(values.durationMinutes),
    rating: values.rating === '' ? null : Number(values.rating),
    ageRating: values.ageRating.trim(),
    status: values.status,
    isFeatured: values.isFeatured,
    categoryIds: values.categoryIds,
  };
}

interface ImagePreviewProps {
  url: string;
  label: string;
  className?: string;
}

function ImagePreview({ url, label, className }: ImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [url]);
  const show = url.trim() !== '' && !failed;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-text-muted">{label}</p>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-elevated',
          className,
        )}
      >
        {show ? (
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="p-3 text-center text-xs text-text-muted">
            Belum ada gambar
          </span>
        )}
      </div>
    </div>
  );
}

export interface MovieFormProps {
  mode: 'create' | 'edit';
  initial?: Movie;
  onSubmit: (payload: MoviePayload) => Promise<void>;
  submitting: boolean;
}

export function MovieForm({
  mode,
  initial,
  onSubmit,
  submitting,
}: MovieFormProps) {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const slugTouched = useRef(mode === 'edit');
  const [showVideo, setShowVideo] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<MovieFormValues>({
    resolver: zodResolver(movieFormSchema),
    defaultValues: toFormValues(initial),
  });

  const title = watch('title');
  const slug = watch('slug');
  const posterUrl = watch('posterUrl');
  const bannerUrl = watch('bannerUrl');
  const videoUrl = watch('videoUrl');
  const categoryIds = watch('categoryIds');
  const isFeatured = watch('isFeatured');
  const status = watch('status');

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminCategoriesApi.list(),
  });
  const categories = categoriesQuery.data?.data ?? [];

  // Slug otomatis dari judul selama belum diedit manual.
  useEffect(() => {
    if (slugTouched.current) return;
    const next = slugify(title);
    if (next !== slug) {
      setValue('slug', next, { shouldDirty: true });
    }
  }, [title, slug, setValue]);

  // Peringatan saat meninggalkan halaman dengan perubahan belum disimpan.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const toggleCategory = (id: number) => {
    const current = categoryIds ?? [];
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    setValue('categoryIds', next, { shouldDirty: true, shouldValidate: true });
  };

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toPayload(values));
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        err.status === 422 &&
        err.details &&
        err.details.length > 0
      ) {
        let mapped = false;
        for (const detail of err.details) {
          if (MOVIE_FIELD_NAMES.has(detail.field)) {
            setError(detail.field as keyof MovieFormValues, {
              type: 'server',
              message: detail.message,
            });
            mapped = true;
          }
        }
        if (!mapped) showError(err.message);
      } else if (err instanceof ApiRequestError) {
        showError(err.message);
      } else {
        showError('Gagal menyimpan film.');
      }
    }
  });

  const handleCancel = () => {
    if (
      isDirty &&
      !window.confirm('Perubahan belum disimpan. Yakin ingin keluar?')
    ) {
      return;
    }
    navigate(-1);
  };

  const loading = submitting || isSubmitting;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom utama */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Informasi Film
            </h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Judul"
                required
                placeholder="Judul film"
                error={errors.title?.message}
                {...register('title')}
              />
              <Input
                label="Slug"
                placeholder="judul-film"
                hint="Kosongkan untuk membuat otomatis dari judul."
                error={errors.slug?.message}
                {...register('slug', {
                  onChange: () => {
                    slugTouched.current = true;
                  },
                })}
              />
              <Textarea
                label="Sinopsis"
                rows={5}
                placeholder="Ringkasan cerita film..."
                error={errors.synopsis?.message}
                {...register('synopsis')}
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Input
                  label="Tahun rilis"
                  type="number"
                  inputMode="numeric"
                  min={1888}
                  max={CURRENT_YEAR + 1}
                  placeholder="2024"
                  error={errors.releaseYear?.message}
                  {...register('releaseYear')}
                />
                <Input
                  label="Durasi (menit)"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  placeholder="120"
                  error={errors.durationMinutes?.message}
                  {...register('durationMinutes')}
                />
                <Input
                  label="Rating"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={0}
                  max={10}
                  placeholder="8.5"
                  error={errors.rating?.message}
                  {...register('rating')}
                />
                <Input
                  label="Age rating"
                  placeholder="13+"
                  error={errors.ageRating?.message}
                  {...register('ageRating')}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Media
            </h2>
            <div className="flex flex-col gap-4">
              <Input
                label="URL Poster"
                type="url"
                placeholder="https://..."
                error={errors.posterUrl?.message}
                {...register('posterUrl')}
              />
              <Input
                label="URL Banner"
                type="url"
                placeholder="https://..."
                error={errors.bannerUrl?.message}
                {...register('bannerUrl')}
              />
              <Input
                label="URL Video MP4"
                required
                type="url"
                placeholder="https://.../film.mp4"
                hint="Harus mengarah ke berkas .mp4 dari host yang diizinkan."
                error={errors.videoUrl?.message}
                {...register('videoUrl')}
              />
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Play className="size-4" />}
                  disabled={videoUrl.trim() === ''}
                  onClick={() => setShowVideo((v) => !v)}
                >
                  {showVideo ? 'Sembunyikan Pemutaran' : 'Uji Pemutaran'}
                </Button>
                {showVideo && videoUrl.trim() !== '' ? (
                  <video
                    controls
                    src={videoUrl}
                    className="mt-3 w-full rounded-[var(--radius-card)] border border-border bg-black"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Kategori
            </h2>
            {categoriesQuery.isLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = (categoryIds ?? []).includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-border bg-surface-elevated text-text-muted hover:text-text-primary',
                      )}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Belum ada kategori. Tambahkan kategori terlebih dahulu.
              </p>
            )}
          </div>
        </div>

        {/* Kolom samping */}
        <div className="flex flex-col gap-5">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Pratinjau
            </h2>
            <div className="flex flex-col gap-4">
              <ImagePreview
                url={posterUrl}
                label="Poster"
                className="aspect-[2/3] w-full"
              />
              <ImagePreview
                url={bannerUrl}
                label="Banner"
                className="aspect-video w-full"
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Publikasi
            </h2>
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 text-sm font-medium text-text-primary">
                  Status
                </p>
                <div className="inline-flex rounded-[var(--radius-button)] border border-border p-0.5">
                  {(['draft', 'published'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setValue('status', value, { shouldDirty: true })
                      }
                      className={cn(
                        'rounded-[calc(var(--radius-button)-2px)] px-3 py-1.5 text-sm transition-colors',
                        status === value
                          ? 'bg-accent font-semibold text-accent-contrast'
                          : 'text-text-muted hover:text-text-primary',
                      )}
                    >
                      {value === 'draft' ? 'Draft' : 'Published'}
                    </button>
                  ))}
                </div>
              </div>

              <Switch
                id="movie-featured"
                checked={isFeatured}
                onChange={(value) =>
                  setValue('isFeatured', value, { shouldDirty: true })
                }
                label="Film Unggulan"
                description="Tampilkan pada bagian hero beranda."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Batal
        </Button>
        <Button type="submit" loading={loading}>
          Simpan
        </Button>
      </div>
    </form>
  );
}
