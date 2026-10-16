import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../../config/database';
import type { SqlParam } from '../../config/database';
import {
  buildPaginationMeta,
  getSortExpression,
  normalizePagination,
  type SortKey,
} from '../../utils/pagination';
import type {
  AdminMovieDto,
  CategoryRow,
  MovieDetailDto,
  MovieRow,
  MovieSummaryDto,
} from './movie.types';
import { toIso, toNumber } from './movie.types';

/* ------------------------------- Helpers ------------------------------- */

interface MovieFilters {
  q?: string;
  categorySlug?: string;
  status?: 'draft' | 'published';
  onlyPublished?: boolean;
}

/** Membangun klausa WHERE + parameter secara parameterized (aman dari injeksi). */
function buildWhere(filters: MovieFilters): {
  clause: string;
  params: SqlParam[];
} {
  const conditions: string[] = [];
  const params: SqlParam[] = [];

  if (filters.onlyPublished) {
    conditions.push('m.status = ?');
    params.push('published');
  } else if (filters.status) {
    conditions.push('m.status = ?');
    params.push(filters.status);
  }

  if (filters.q) {
    conditions.push('m.title LIKE ?');
    params.push(`%${filters.q}%`);
  }

  if (filters.categorySlug) {
    conditions.push(
      'EXISTS (SELECT 1 FROM movie_categories mc JOIN categories c ON c.id = mc.category_id WHERE mc.movie_id = m.id AND c.slug = ?)',
    );
    params.push(filters.categorySlug);
  }

  const clause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

const MOVIE_COLUMNS = `
  m.id, m.title, m.slug, m.synopsis, m.poster_url, m.banner_url, m.video_url,
  m.video_type, m.release_year, m.duration_minutes, m.rating, m.age_rating,
  m.view_count, m.status, m.is_featured, m.published_at, m.created_at, m.updated_at
`;

/** Ambil kategori untuk sekumpulan movie_id, kembalikan map. */
async function fetchCategoriesForMovies(
  movieIds: number[],
): Promise<Map<number, { id: number; name: string; slug: string }[]>> {
  const map = new Map<number, { id: number; name: string; slug: string }[]>();
  if (movieIds.length === 0) return map;

  const placeholders = movieIds.map(() => '?').join(',');
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT mc.movie_id, c.id, c.name, c.slug
     FROM movie_categories mc
     JOIN categories c ON c.id = mc.category_id
     WHERE mc.movie_id IN (${placeholders})
     ORDER BY c.name ASC`,
    movieIds,
  );

  for (const row of rows as { movie_id: number; id: number; name: string; slug: string }[]) {
    const list = map.get(row.movie_id) ?? [];
    list.push({ id: row.id, name: row.name, slug: row.slug });
    map.set(row.movie_id, list);
  }
  return map;
}

/** Konversi baris DB -> DTO ringkas. */
function toSummary(
  row: MovieRow,
  categories: { id: number; name: string; slug: string }[],
): MovieSummaryDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    posterUrl: row.poster_url,
    bannerUrl: row.banner_url,
    releaseYear: row.release_year,
    durationMinutes: row.duration_minutes,
    rating: toNumber(row.rating),
    ageRating: row.age_rating,
    viewCount: row.view_count,
    publishedAt: toIso(row.published_at),
    categories,
  };
}

function toDetail(
  row: MovieRow,
  categories: { id: number; name: string; slug: string }[],
): MovieDetailDto {
  return {
    ...toSummary(row, categories),
    synopsis: row.synopsis,
    videoUrl: row.video_url,
    videoType: row.video_type,
    status: row.status,
    isFeatured: row.is_featured === 1,
    createdAt: toIso(row.created_at) ?? '',
    updatedAt: toIso(row.updated_at) ?? '',
  };
}

/* ------------------------------ Queries ------------------------------- */

/** Daftar film (publik atau admin) dengan pagination. */
export async function listMovies(options: {
  filters: MovieFilters;
  page?: number;
  limit?: number;
  sort?: SortKey;
}): Promise<{
  items: MovieSummaryDto[];
  total: number;
  page: number;
  limit: number;
}> {
  const { page, limit, offset } = normalizePagination(options.page, options.limit);
  const { clause, params } = buildWhere(options.filters);
  const orderBy = getSortExpression(options.sort, 'newest');

  const [countRows] = await getPool().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM movies m ${clause}`,
    params,
  );
  const total = (countRows[0] as { total: number }).total ?? 0;

  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const categoriesMap = await fetchCategoriesForMovies(rows.map((r) => r.id));
  const items = rows.map((r) => toSummary(r, categoriesMap.get(r.id) ?? []));

  return { items, total, page, limit };
}

/** Detail film published berdasarkan slug (untuk publik). */
export async function findPublishedBySlug(
  slug: string,
): Promise<MovieDetailDto | null> {
  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m WHERE m.slug = ? AND m.status = 'published' LIMIT 1`,
    [slug],
  );
  if (rows.length === 0) return null;
  const categoriesMap = await fetchCategoriesForMovies([rows[0].id]);
  return toDetail(rows[0], categoriesMap.get(rows[0].id) ?? []);
}

/**
 * Ambil ringkasan film published berdasarkan sekumpulan slug.
 * Dipakai halaman Daftar Saya & Lanjutkan Menonton (menghindari N+1 request).
 * Urutan hasil tidak dijamin; pemanggil menyesuaikan urutan sesuai kebutuhan.
 */
export async function findSummariesBySlugs(
  slugs: string[],
): Promise<MovieSummaryDto[]> {
  if (slugs.length === 0) return [];
  const placeholders = slugs.map(() => '?').join(',');
  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m
     WHERE m.status = 'published' AND m.slug IN (${placeholders})`,
    slugs,
  );
  return attachCategories(rows);
}

/** Detail film berdasarkan id (admin, semua status). */
export async function findAdminById(id: number): Promise<AdminMovieDto | null> {
  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m WHERE m.id = ? LIMIT 1`,
    [id],
  );
  if (rows.length === 0) return null;
  const categoriesMap = await fetchCategoriesForMovies([rows[0].id]);
  const categories = categoriesMap.get(rows[0].id) ?? [];
  return {
    ...toDetail(rows[0], categories),
    categoryIds: categories.map((c) => c.id),
  };
}

/** Cek keberadaan slug (opsional mengecualikan id tertentu). */
export async function slugExists(
  slug: string,
  excludeId?: number,
): Promise<boolean> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    excludeId
      ? 'SELECT id FROM movies WHERE slug = ? AND id <> ? LIMIT 1'
      : 'SELECT id FROM movies WHERE slug = ? LIMIT 1',
    excludeId ? [slug, excludeId] : [slug],
  );
  return rows.length > 0;
}

export interface MovieInsertData {
  title: string;
  slug: string;
  synopsis: string | null;
  posterUrl: string | null;
  bannerUrl: string | null;
  videoUrl: string;
  releaseYear: number | null;
  durationMinutes: number | null;
  rating: number | null;
  ageRating: string | null;
  status: 'draft' | 'published';
  isFeatured: boolean;
  categoryIds: number[];
}

/** Buat film baru di dalam transaksi (film + relasi kategori). */
export async function insertMovie(
  conn: PoolConnection,
  data: MovieInsertData,
): Promise<number> {
  const publishedAt = data.status === 'published' ? new Date() : null;

  const [result] = await conn.execute(
    `INSERT INTO movies
      (title, slug, synopsis, poster_url, banner_url, video_url, video_type,
       release_year, duration_minutes, rating, age_rating, status, is_featured, published_at)
     VALUES (?, ?, ?, ?, ?, ?, 'mp4', ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.slug,
      data.synopsis,
      data.posterUrl,
      data.bannerUrl,
      data.videoUrl,
      data.releaseYear,
      data.durationMinutes,
      data.rating,
      data.ageRating,
      data.status,
      data.isFeatured ? 1 : 0,
      publishedAt,
    ],
  );

  const movieId = (result as { insertId: number }).insertId;
  await syncCategories(conn, movieId, data.categoryIds);
  return movieId;
}

/** Perbarui film + relasi kategori di dalam transaksi. */
export async function updateMovie(
  conn: PoolConnection,
  id: number,
  data: MovieInsertData,
  wasPublished: boolean,
): Promise<void> {
  // published_at diisi saat PERTAMA kali dipublikasikan, tidak diubah lagi.
  const publishClause =
    data.status === 'published' && !wasPublished
      ? ', published_at = NOW()'
      : data.status === 'published'
        ? ''
        : '';

  await conn.execute(
    `UPDATE movies SET
       title = ?, slug = ?, synopsis = ?, poster_url = ?, banner_url = ?,
       video_url = ?, video_type = 'mp4', release_year = ?, duration_minutes = ?,
       rating = ?, age_rating = ?, status = ?, is_featured = ?${publishClause}
     WHERE id = ?`,
    [
      data.title,
      data.slug,
      data.synopsis,
      data.posterUrl,
      data.bannerUrl,
      data.videoUrl,
      data.releaseYear,
      data.durationMinutes,
      data.rating,
      data.ageRating,
      data.status,
      data.isFeatured ? 1 : 0,
      id,
    ],
  );

  await syncCategories(conn, id, data.categoryIds);
}

/** Sinkronisasi relasi kategori (hapus yang tak dipakai, tambah yang baru). */
async function syncCategories(
  conn: PoolConnection,
  movieId: number,
  categoryIds: number[],
): Promise<void> {
  await conn.execute('DELETE FROM movie_categories WHERE movie_id = ?', [movieId]);
  if (categoryIds.length === 0) return;

  const values = categoryIds.map(() => '(?, ?)').join(', ');
  const params = categoryIds.flatMap((cid) => [movieId, cid]);
  await conn.execute(
    `INSERT INTO movie_categories (movie_id, category_id) VALUES ${values}`,
    params,
  );
}

/** Ubah status film (publish/unpublish). */
export async function updateStatus(
  id: number,
  status: 'draft' | 'published',
): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    const [rows] = await conn.query<MovieRow[]>(
      'SELECT published_at, status FROM movies WHERE id = ? LIMIT 1',
      [id],
    );
    if (rows.length === 0) return;

    const wasPublished = rows[0].published_at !== null;
    if (status === 'published' && !wasPublished) {
      await conn.execute(
        'UPDATE movies SET status = ?, published_at = NOW() WHERE id = ?',
        [status, id],
      );
    } else {
      await conn.execute('UPDATE movies SET status = ? WHERE id = ?', [status, id]);
    }
  } finally {
    conn.release();
  }
}

/** Hapus film (relasi kategori ikut terhapus via ON DELETE CASCADE). */
export async function deleteMovie(id: number): Promise<number> {
  const [result] = await getPool().execute('DELETE FROM movies WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows;
}

/** Tambah view_count (hanya untuk film published). */
export async function incrementViewCount(slug: string): Promise<boolean> {
  const [result] = await getPool().execute(
    "UPDATE movies SET view_count = view_count + 1 WHERE slug = ? AND status = 'published'",
    [slug],
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

/* --------------------------- Beranda (home) --------------------------- */

export async function getFeatured(limit: number): Promise<MovieSummaryDto[]> {
  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m
     WHERE m.status = 'published' AND m.is_featured = 1
     ORDER BY m.published_at DESC, m.id DESC LIMIT ?`,
    [limit],
  );
  return attachCategories(rows);
}

export async function getNewReleases(limit: number): Promise<MovieSummaryDto[]> {
  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m
     WHERE m.status = 'published'
     ORDER BY m.published_at DESC, m.id DESC LIMIT ?`,
    [limit],
  );
  return attachCategories(rows);
}

export async function getTrending(limit: number): Promise<MovieSummaryDto[]> {
  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m
     WHERE m.status = 'published'
     ORDER BY m.view_count DESC, m.id DESC LIMIT ?`,
    [limit],
  );
  return attachCategories(rows);
}

export async function getTop10(): Promise<
  (MovieSummaryDto & { rank: number })[]
> {
  const [rows] = await getPool().query<MovieRow[]>(
    `SELECT ${MOVIE_COLUMNS} FROM movies m
     WHERE m.status = 'published'
     ORDER BY m.view_count DESC, m.id DESC LIMIT 10`,
    [],
  );
  const summaries = await attachCategories(rows);
  return summaries.map((s, i) => ({ ...s, rank: i + 1 }));
}

export async function getTopGenres(
  genreLimit: number,
  moviesPerGenre: number,
): Promise<
  {
    category: { id: number; name: string; slug: string };
    movies: MovieSummaryDto[];
  }[]
> {
  const [genreRows] = await getPool().query<CategoryRow[]>(
    `SELECT c.id, c.name, c.slug, COUNT(DISTINCT mc.movie_id) AS movie_count
     FROM categories c
     JOIN movie_categories mc ON mc.category_id = c.id
     JOIN movies m ON m.id = mc.movie_id AND m.status = 'published'
     GROUP BY c.id, c.name, c.slug
     HAVING movie_count > 0
     ORDER BY movie_count DESC, c.name ASC
     LIMIT ?`,
    [genreLimit],
  );

  const result = [];
  for (const genre of genreRows) {
    const [movieRows] = await getPool().query<MovieRow[]>(
      `SELECT ${MOVIE_COLUMNS} FROM movies m
       JOIN movie_categories mc ON mc.movie_id = m.id
       WHERE m.status = 'published' AND mc.category_id = ?
       ORDER BY m.published_at DESC, m.id DESC LIMIT ?`,
      [genre.id, moviesPerGenre],
    );
    result.push({
      category: { id: genre.id, name: genre.name, slug: genre.slug },
      movies: await attachCategories(movieRows),
    });
  }
  return result;
}

/** Helper: lampirkan kategori ke sekumpulan baris film. */
async function attachCategories(rows: MovieRow[]): Promise<MovieSummaryDto[]> {
  const map = await fetchCategoriesForMovies(rows.map((r) => r.id));
  return rows.map((r) => toSummary(r, map.get(r.id) ?? []));
}

/**
 * Versi publik helper di atas untuk dipakai modul lain (mis. dashboard).
 * Baris harus memuat kolom minimal yang dibutuhkan toSummary.
 */
export async function attachCategoriesForRows(
  rows: RowDataPacket[],
): Promise<MovieSummaryDto[]> {
  return attachCategories(rows as MovieRow[]);
}

/* ---------------------- Verifikasi kategori valid ---------------------- */

/** Pastikan semua id kategori ada; kembalikan daftar id yang valid. */
export async function findValidCategoryIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id FROM categories WHERE id IN (${placeholders})`,
    ids,
  );
  return (rows as { id: number }[]).map((r) => r.id);
}

export { buildPaginationMeta };
