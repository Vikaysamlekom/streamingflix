import type { RowDataPacket } from 'mysql2';

/** Baris film dari database. */
export interface MovieRow extends RowDataPacket {
  id: number;
  title: string;
  slug: string;
  synopsis: string | null;
  poster_url: string | null;
  banner_url: string | null;
  video_url: string;
  video_type: 'mp4';
  release_year: number | null;
  duration_minutes: number | null;
  rating: string | number | null;
  age_rating: string | null;
  view_count: number;
  status: 'draft' | 'published';
  is_featured: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  total_count?: number;
}

export interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  movie_count?: number;
}

/** Kontrak respons film publik (ringkas, tanpa videoUrl). */
export interface MovieSummaryDto {
  id: number;
  title: string;
  slug: string;
  posterUrl: string | null;
  bannerUrl: string | null;
  releaseYear: number | null;
  durationMinutes: number | null;
  rating: number | null;
  ageRating: string | null;
  viewCount: number;
  publishedAt: string | null;
  categories: { id: number; name: string; slug: string }[];
}

/** Kontrak respons film publik (detail, dengan videoUrl). */
export interface MovieDetailDto extends MovieSummaryDto {
  synopsis: string | null;
  videoUrl: string;
  videoType: 'mp4';
  status: 'draft' | 'published';
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Kontrak film untuk admin (selalu lengkap). */
export interface AdminMovieDto extends MovieDetailDto {
  categoryIds: number[];
}

export function toNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toIso(value: Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
