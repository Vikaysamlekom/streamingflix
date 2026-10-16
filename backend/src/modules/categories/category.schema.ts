import { z } from 'zod';
import { isValidSlugFormat } from '../../utils/slug';

/** Skema body kategori (create/update). */
export const categoryPayloadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nama kategori wajib diisi')
      .max(100, 'Nama maksimal 100 karakter'),
    slug: z
      .string()
      .trim()
      .max(120, 'Slug maksimal 120 karakter')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.slug && data.slug.length > 0 && !isValidSlugFormat(data.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slug'],
        message: 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)',
      });
    }
  });

export type CategoryPayload = z.infer<typeof categoryPayloadSchema>;

export const categoryIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const categorySlugParamsSchema = z.object({
  slug: z.string().min(1).max(120),
});

export const categoryMoviesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z
    .enum(['newest', 'oldest', 'title', 'popular', 'rating'])
    .optional(),
});

export type CategoryMoviesQuery = z.infer<typeof categoryMoviesQuerySchema>;
