import { AppError } from '../../utils/app-error';
import { ERROR_CODES, ERROR_MESSAGES } from '../../utils/error-code';
import { slugify } from '../../utils/slug';
import { buildPaginationMeta } from '../../utils/pagination';
import * as repository from './category.repository';
import type { CategoryDto } from './category.repository';
import type { CategoryPayload, CategoryMoviesQuery } from './category.schema';
import { listMovies } from '../movies/movie.repository';

/* ------------------------------ Publik -------------------------------- */

export async function listPublic(): Promise<CategoryDto[]> {
  return repository.listWithPublishedCount();
}

export async function listAdmin(): Promise<CategoryDto[]> {
  return repository.listWithTotalCount();
}

/** Film published berdasarkan slug kategori. */
export async function getMoviesByCategory(
  slug: string,
  query: CategoryMoviesQuery,
) {
  const category = await repository.findBySlug(slug);
  if (!category) {
    throw AppError.notFound('Genre tidak ditemukan');
  }

  const { items, total, page, limit } = await listMovies({
    filters: { categorySlug: slug, onlyPublished: true },
    page: query.page,
    limit: query.limit,
    sort: query.sort ?? 'newest',
  });

  return {
    category: { id: category.id, name: category.name, slug: category.slug },
    items,
    meta: buildPaginationMeta(page, limit, total),
  };
}

/* ------------------------------- Admin -------------------------------- */

function resolveSlug(payload: CategoryPayload): string {
  const base = payload.slug && payload.slug.trim() ? payload.slug : payload.name;
  const slug = slugify(base);
  if (!slug) {
    throw AppError.validation('Slug tidak valid', [
      { field: 'slug', message: 'Slug tidak dapat dihasilkan dari nama' },
    ]);
  }
  return slug;
}

export async function create(payload: CategoryPayload): Promise<CategoryDto> {
  const slug = resolveSlug(payload);

  const conflict = await repository.findConflict(payload.name, slug);
  if (conflict) {
    const field = conflict.name === payload.name ? 'name' : 'slug';
    throw AppError.conflict(
      field === 'name'
        ? 'Nama kategori sudah digunakan'
        : 'Slug kategori sudah digunakan',
      ERROR_CODES.CONFLICT,
    );
  }

  const id = await repository.insertCategory(payload.name, slug);
  const created = await repository.findById(id);
  return {
    id,
    name: created?.name ?? payload.name,
    slug: created?.slug ?? slug,
    movieCount: 0,
  };
}

export async function update(
  id: number,
  payload: CategoryPayload,
): Promise<CategoryDto> {
  const existing = await repository.findById(id);
  if (!existing) throw AppError.notFound('Kategori tidak ditemukan');

  const slug = resolveSlug(payload);
  const conflict = await repository.findConflict(payload.name, slug, id);
  if (conflict) {
    throw AppError.conflict('Nama atau slug kategori sudah digunakan');
  }

  await repository.updateCategory(id, payload.name, slug);
  const usage = await repository.countUsage(id);
  return { id, name: payload.name, slug, movieCount: usage };
}

/**
 * Hapus kategori. Bila masih dipakai film, tolak dengan 409 dan
 * sertakan jumlah film yang memakainya (tidak ada penghapusan paksa).
 */
export async function remove(id: number): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) throw AppError.notFound('Kategori tidak ditemukan');

  const usage = await repository.countUsage(id);
  if (usage > 0) {
    throw new AppError(
      409,
      ERROR_CODES.CATEGORY_IN_USE,
      `${ERROR_MESSAGES[ERROR_CODES.CATEGORY_IN_USE]} (${usage} film). Lepaskan kategori dari film terlebih dahulu.`,
      [{ field: 'id', message: `${usage} film masih memakai kategori ini` }],
    );
  }

  await repository.deleteCategory(id);
}
