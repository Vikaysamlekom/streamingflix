import { z } from 'zod';
import { isValidSlugFormat } from '../../utils/slug';

/** Tahun rilis minimum film (standar sinema). */
const MIN_YEAR = 1888;

function maxYear(): number {
  return new Date().getFullYear() + 1;
}

/** Skema query untuk daftar film. */
export const movieListQuerySchema = z.object({
  q: z.string().trim().max(255).optional(),
  category: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z
    .enum(['newest', 'oldest', 'title', 'popular', 'rating'])
    .optional(),
});

export type MovieListQuery = z.infer<typeof movieListQuerySchema>;

/** Skema query untuk daftar film admin (termasuk filter status). */
export const adminMovieListQuerySchema = movieListQuerySchema.extend({
  status: z.enum(['draft', 'published']).optional(),
});

export type AdminMovieListQuery = z.infer<typeof adminMovieListQuerySchema>;

/**
 * Skema query untuk mengambil beberapa film sekaligus berdasarkan slug
 * (dipakai halaman Daftar Saya & Lanjutkan Menonton agar tidak N+1 request).
 * `slugs` dipisah koma, maksimal 100 slug.
 */
export const movieSlugsQuerySchema = z.object({
  slugs: z
    .string()
    .max(25500, 'Terlalu banyak slug')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 100),
    ),
});

export type MovieSlugsQuery = z.infer<typeof movieSlugsQuerySchema>;

/** Skema slug pada params. */
export const movieSlugParamsSchema = z.object({
  slug: z.string().min(1).max(255),
});

export const movieIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Skema body untuk create/update film (dipakai admin). */
export const moviePayloadSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Judul wajib diisi')
      .max(255, 'Judul maksimal 255 karakter'),
    slug: z
      .string()
      .trim()
      .max(255, 'Slug maksimal 255 karakter')
      .optional()
      .or(z.literal('')),
    synopsis: z
      .string()
      .trim()
      .max(5000, 'Sinopsis maksimal 5000 karakter')
      .optional()
      .or(z.literal('')),
    posterUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .or(z.literal('')),
    bannerUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .or(z.literal('')),
    videoUrl: z
      .string()
      .trim()
      .min(1, 'URL video wajib diisi')
      .max(2048, 'URL video maksimal 2048 karakter'),
    releaseYear: z
      .union([z.coerce.number().int().min(MIN_YEAR).max(maxYear()), z.null()])
      .optional(),
    durationMinutes: z
      .union([z.coerce.number().int().min(1).max(1440), z.null()])
      .optional(),
    rating: z
      .union([z.coerce.number().min(0).max(10), z.null()])
      .optional(),
    ageRating: z.string().trim().max(10).optional().or(z.literal('')),
    status: z.enum(['draft', 'published']).default('draft'),
    isFeatured: z.boolean().default(false),
    categoryIds: z.array(z.coerce.number().int().positive()).max(30).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.slug && data.slug.length > 0 && !isValidSlugFormat(data.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slug'],
        message:
          'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)',
      });
    }
  });

export type MoviePayload = z.infer<typeof moviePayloadSchema>;

/** Skema update status cepat (publish/unpublish). */
export const movieStatusSchema = z.object({
  status: z.enum(['draft', 'published']),
});
