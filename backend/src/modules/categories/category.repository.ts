import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../../config/database';

export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
  movieCount?: number;
}

export interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  movie_count?: number;
  created_at: Date;
}

/** Daftar kategori dengan jumlah film Published (untuk publik). */
export async function listWithPublishedCount(): Promise<CategoryDto[]> {
  const [rows] = await getPool().query<CategoryRow[]>(
    `SELECT c.id, c.name, c.slug,
            COUNT(DISTINCT CASE WHEN m.status = 'published' THEN m.id END) AS movie_count
     FROM categories c
     LEFT JOIN movie_categories mc ON mc.category_id = c.id
     LEFT JOIN movies m ON m.id = mc.movie_id
     GROUP BY c.id, c.name, c.slug
     ORDER BY c.name ASC`,
    [],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    movieCount: Number(r.movie_count ?? 0),
  }));
}

/** Daftar kategori dengan jumlah seluruh film (untuk admin). */
export async function listWithTotalCount(): Promise<CategoryDto[]> {
  const [rows] = await getPool().query<CategoryRow[]>(
    `SELECT c.id, c.name, c.slug,
            COUNT(mc.movie_id) AS movie_count
     FROM categories c
     LEFT JOIN movie_categories mc ON mc.category_id = c.id
     GROUP BY c.id, c.name, c.slug
     ORDER BY c.name ASC`,
    [],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    movieCount: Number(r.movie_count ?? 0),
  }));
}

export async function findBySlug(slug: string): Promise<CategoryRow | null> {
  const [rows] = await getPool().query<CategoryRow[]>(
    'SELECT id, name, slug, created_at FROM categories WHERE slug = ? LIMIT 1',
    [slug],
  );
  return rows.length ? rows[0] : null;
}

export async function findById(id: number): Promise<CategoryRow | null> {
  const [rows] = await getPool().query<CategoryRow[]>(
    'SELECT id, name, slug, created_at FROM categories WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length ? rows[0] : null;
}

/** Cek bentrok nama atau slug (kecuali id tertentu). */
export async function findConflict(
  name: string,
  slug: string,
  excludeId?: number,
): Promise<CategoryRow | null> {
  const [rows] = await getPool().query<CategoryRow[]>(
    excludeId
      ? 'SELECT id, name, slug, created_at FROM categories WHERE (name = ? OR slug = ?) AND id <> ? LIMIT 1'
      : 'SELECT id, name, slug, created_at FROM categories WHERE name = ? OR slug = ? LIMIT 1',
    excludeId ? [name, slug, excludeId] : [name, slug],
  );
  return rows.length ? rows[0] : null;
}

/** Hitung berapa film memakai kategori ini. */
export async function countUsage(categoryId: number): Promise<number> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM movie_categories WHERE category_id = ?',
    [categoryId],
  );
  return Number((rows[0] as { c: number }).c ?? 0);
}

export async function insertCategory(
  name: string,
  slug: string,
): Promise<number> {
  const [result] = await getPool().execute(
    'INSERT INTO categories (name, slug) VALUES (?, ?)',
    [name, slug],
  );
  return (result as { insertId: number }).insertId;
}

export async function updateCategory(
  id: number,
  name: string,
  slug: string,
): Promise<void> {
  await getPool().execute(
    'UPDATE categories SET name = ?, slug = ? WHERE id = ?',
    [name, slug, id],
  );
}

export async function deleteCategory(id: number): Promise<void> {
  await getPool().execute('DELETE FROM categories WHERE id = ?', [id]);
}
