/**
 * Utilitas pagination & allowlist sort (mencegah injeksi SQL pada ORDER BY).
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function normalizePagination(
  page?: number,
  limit?: number,
): PaginationParams {
  const p = Math.max(1, Math.floor(page ?? DEFAULT_PAGE));
  const l = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT)));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Allowlist kolom sort. Input pengguna TIDAK pernah masuk ke SQL.
 * Tambahkan varian baru hanya di sini.
 */
export const SORT_MAP = {
  newest: 'm.published_at DESC, m.id DESC',
  oldest: 'm.published_at ASC, m.id ASC',
  title: 'm.title ASC',
  popular: 'm.view_count DESC, m.id DESC',
  rating: 'm.rating DESC, m.view_count DESC, m.id DESC',
} as const;

export type SortKey = keyof typeof SORT_MAP;

export function isSortKey(value: string): value is SortKey {
  return Object.prototype.hasOwnProperty.call(SORT_MAP, value);
}

/** Dapatkan ekspresi ORDER BY yang aman (atau null bila tidak valid). */
export function getSortExpression(
  sort: string | undefined,
  fallback: SortKey = 'newest',
): string {
  if (sort && isSortKey(sort)) return SORT_MAP[sort];
  return SORT_MAP[fallback];
}
