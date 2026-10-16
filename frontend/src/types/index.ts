/**
 * Tipe data bersama untuk StreamFlix.
 * Selaras dengan skema respons backend (bagian 9 master prompt).
 */

/** Amplop respons sukses dari API */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Amplop respons error dari API */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: FieldErrorDetail[];
  };
}

export interface FieldErrorDetail {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Status publikasi film */
export type MovieStatus = 'draft' | 'published';

/**
 * Representasi film di API publik.
 * `videoUrl` hanya dikirim pada endpoint detail/tonton, bukan pada daftar.
 */
export interface Movie {
  id: number;
  title: string;
  slug: string;
  synopsis: string | null;
  posterUrl: string | null;
  bannerUrl: string | null;
  videoUrl?: string;
  videoType: 'mp4';
  releaseYear: number | null;
  durationMinutes: number | null;
  rating: number | null;
  ageRating: string | null;
  viewCount: number;
  status: MovieStatus;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}

/** Film ringkas untuk kartu/daftar */
export interface MovieSummary {
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
  categories: Category[];
}

/** Kartu film dengan peringkat (untuk Top 10) */
export interface RankedMovie extends MovieSummary {
  rank: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  movieCount?: number;
}

export interface GenreRow {
  category: Category;
  movies: MovieSummary[];
}

/** Data beranda lengkap dari GET /api/home */
export interface HomeData {
  hero: MovieSummary[];
  continueWatchingHint?: never;
  trending: MovieSummary[];
  newReleases: MovieSummary[];
  top10: RankedMovie[];
  genreRows: GenreRow[];
}

/** Statistik dashboard admin */
export interface DashboardStats {
  totalMovies: number;
  publishedMovies: number;
  draftMovies: number;
  totalCategories: number;
  featuredMovies: number;
  totalViews: number;
  recentlyUpdated: MovieSummary[];
  topViewed: MovieSummary[];
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  role: 'admin';
  lastLoginAt: string | null;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  seoDescription: string;
  heroSlideLimit: number;
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialYoutube: string;
}

export interface SystemInfo {
  appVersion: string;
  databaseConnected: boolean;
  allowedVideoHosts: string[];
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptime: number;
  database: 'connected' | 'disconnected';
  timestamp: string;
}
