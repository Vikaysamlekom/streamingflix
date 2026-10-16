import { AppError } from '../../utils/app-error';
import { ERROR_CODES, ERROR_MESSAGES } from '../../utils/error-code';
import { withTransaction } from '../../config/database';
import { slugify } from '../../utils/slug';
import { validateImageUrl, validateVideoUrl } from '../../utils/video-url';
import { buildPaginationMeta } from '../../utils/pagination';
import * as repository from './movie.repository';
import type {
  AdminMovieDto,
  MovieDetailDto,
  MovieSummaryDto,
} from './movie.types';
import type {
  AdminMovieListQuery,
  MovieListQuery,
  MoviePayload,
} from './movie.schema';

/** Konstanta dataset beranda. */
const HOME_LIMITS = {
  hero: 6,
  trending: 12,
  newReleases: 12,
  topGenres: 3,
  moviesPerGenre: 12,
};

/* ------------------------------ Publik -------------------------------- */

export async function listPublic(query: MovieListQuery) {
  const { items, total, page, limit } = await repository.listMovies({
    filters: {
      q: query.q,
      categorySlug: query.category,
      onlyPublished: true,
    },
    page: query.page,
    limit: query.limit,
    sort: query.sort ?? 'newest',
  });

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getPublicDetail(slug: string): Promise<MovieDetailDto> {
  const movie = await repository.findPublishedBySlug(slug);
  if (!movie) {
    throw AppError.notFound('Film tidak ditemukan');
  }
  return movie;
}

export async function recordView(slug: string): Promise<void> {
  const ok = await repository.incrementViewCount(slug);
  if (!ok) {
    throw AppError.notFound('Film tidak ditemukan');
  }
}

/**
 * Ringkasan beberapa film berdasarkan slug.
 * Mengembalikan hasil dalam urutan yang sama dengan slug yang diminta.
 */
export async function getSummariesBySlugs(
  slugs: string[],
): Promise<MovieSummaryDto[]> {
  const unique = [...new Set(slugs)];
  const found = await repository.findSummariesBySlugs(unique);
  const bySlug = new Map(found.map((m) => [m.slug, m]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((m): m is MovieSummaryDto => Boolean(m));
}

export async function getHomeData() {
  const [hero, trending, newReleases, top10, genreRows] = await Promise.all([
    repository.getFeatured(HOME_LIMITS.hero),
    repository.getTrending(HOME_LIMITS.trending),
    repository.getNewReleases(HOME_LIMITS.newReleases),
    repository.getTop10(),
    repository.getTopGenres(HOME_LIMITS.topGenres, HOME_LIMITS.moviesPerGenre),
  ]);

  // Fallback hero: bila tidak ada film unggulan, pakai rilis terbaru.
  const heroFinal =
    hero.length > 0 ? hero : newReleases.slice(0, HOME_LIMITS.hero);

  return {
    hero: heroFinal,
    trending,
    newReleases,
    top10,
    genreRows,
  };
}

/* ------------------------------- Admin -------------------------------- */

export async function adminList(query: AdminMovieListQuery) {
  const { items, total, page, limit } = await repository.listMovies({
    filters: {
      q: query.q,
      categorySlug: query.category,
      status: query.status,
    },
    page: query.page,
    limit: query.limit,
    sort: query.sort ?? 'newest',
  });

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function adminGet(id: number): Promise<AdminMovieDto> {
  const movie = await repository.findAdminById(id);
  if (!movie) throw AppError.notFound('Film tidak ditemukan');
  return movie;
}

/** Validasi URL video & gambar; lempar AppError bila tidak valid. */
function validateUrls(payload: MoviePayload): {
  videoUrl: string;
  posterUrl: string | null;
  bannerUrl: string | null;
} {
  const video = validateVideoUrl(payload.videoUrl);
  if (!video.ok) {
    const isHostIssue = video.reason?.toLowerCase().includes('domain');
    throw new AppError(
      422,
      isHostIssue
        ? ERROR_CODES.VIDEO_HOST_NOT_ALLOWED
        : ERROR_CODES.INVALID_VIDEO_URL,
      video.reason ?? ERROR_MESSAGES[ERROR_CODES.INVALID_VIDEO_URL],
    );
  }

  const poster = validateImageUrl(payload.posterUrl ?? '');
  if (!poster.ok) {
    throw AppError.validation(poster.reason ?? 'URL poster tidak valid', [
      { field: 'posterUrl', message: poster.reason ?? 'URL poster tidak valid' },
    ]);
  }

  const banner = validateImageUrl(payload.bannerUrl ?? '');
  if (!banner.ok) {
    throw AppError.validation(banner.reason ?? 'URL banner tidak valid', [
      { field: 'bannerUrl', message: banner.reason ?? 'URL banner tidak valid' },
    ]);
  }

  return {
    videoUrl: video.normalizedUrl!,
    posterUrl: poster.normalizedUrl || null,
    bannerUrl: banner.normalizedUrl || null,
  };
}

/** Pastikan kategori yang dikirim benar-benar ada. */
async function validateCategories(categoryIds: number[]): Promise<number[]> {
  if (categoryIds.length === 0) return [];
  const unique = [...new Set(categoryIds)];
  const valid = await repository.findValidCategoryIds(unique);
  if (valid.length !== unique.length) {
    const missing = unique.filter((id) => !valid.includes(id));
    throw AppError.validation('Beberapa kategori tidak ditemukan', [
      {
        field: 'categoryIds',
        message: `Kategori tidak ditemukan: ${missing.join(', ')}`,
      },
    ]);
  }
  return unique;
}

/** Tentukan slug final & cek keunikan. */
async function resolveSlug(
  payload: MoviePayload,
  excludeId?: number,
): Promise<string> {
  const base = payload.slug && payload.slug.trim() ? payload.slug : payload.title;
  const slug = slugify(base);
  if (!slug) {
    throw AppError.validation('Slug tidak valid', [
      { field: 'slug', message: 'Slug tidak dapat dihasilkan dari judul' },
    ]);
  }
  const exists = await repository.slugExists(slug, excludeId);
  if (exists) {
    throw AppError.conflict(
      ERROR_MESSAGES[ERROR_CODES.SLUG_TAKEN],
      ERROR_CODES.SLUG_TAKEN,
    );
  }
  return slug;
}

export async function adminCreate(
  payload: MoviePayload,
): Promise<AdminMovieDto> {
  const urls = validateUrls(payload);
  const categoryIds = await validateCategories(payload.categoryIds);
  const slug = await resolveSlug(payload);

  // Operasi multi-tabel (film + kategori) dijalankan dalam satu transaksi.
  const id = await withTransaction((conn) =>
    repository.insertMovie(conn, {
      title: payload.title,
      slug,
      synopsis: payload.synopsis || null,
      posterUrl: urls.posterUrl,
      bannerUrl: urls.bannerUrl,
      videoUrl: urls.videoUrl,
      releaseYear: payload.releaseYear ?? null,
      durationMinutes: payload.durationMinutes ?? null,
      rating: payload.rating ?? null,
      ageRating: payload.ageRating || null,
      status: payload.status,
      isFeatured: payload.isFeatured,
      categoryIds,
    }),
  );

  return adminGet(id);
}

export async function adminUpdate(
  id: number,
  payload: MoviePayload,
): Promise<AdminMovieDto> {
  const existing = await repository.findAdminById(id);
  if (!existing) throw AppError.notFound('Film tidak ditemukan');

  const urls = validateUrls(payload);
  const categoryIds = await validateCategories(payload.categoryIds);
  const slug = await resolveSlug(payload, id);
  const wasPublished = existing.publishedAt !== null;

  await withTransaction((conn) =>
    repository.updateMovie(
      conn,
      id,
      {
        title: payload.title,
        slug,
        synopsis: payload.synopsis || null,
        posterUrl: urls.posterUrl,
        bannerUrl: urls.bannerUrl,
        videoUrl: urls.videoUrl,
        releaseYear: payload.releaseYear ?? null,
        durationMinutes: payload.durationMinutes ?? null,
        rating: payload.rating ?? null,
        ageRating: payload.ageRating || null,
        status: payload.status,
        isFeatured: payload.isFeatured,
        categoryIds,
      },
      wasPublished,
    ),
  );

  return adminGet(id);
}

export async function adminUpdateStatus(
  id: number,
  status: 'draft' | 'published',
): Promise<AdminMovieDto> {
  const existing = await repository.findAdminById(id);
  if (!existing) throw AppError.notFound('Film tidak ditemukan');
  await repository.updateStatus(id, status);
  return adminGet(id);
}

export async function adminDelete(id: number): Promise<void> {
  const existing = await repository.findAdminById(id);
  if (!existing) throw AppError.notFound('Film tidak ditemukan');
  await repository.deleteMovie(id);
}

export type { MovieSummaryDto };
