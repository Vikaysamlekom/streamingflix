import { api } from './client';
import type { HomeData, Movie, MovieSummary } from '@/types';

export interface MovieListParams {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface MoviePayload {
  title: string;
  slug: string;
  synopsis: string;
  posterUrl: string;
  bannerUrl: string;
  videoUrl: string;
  releaseYear: number | null;
  durationMinutes: number | null;
  rating: number | null;
  ageRating: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  categoryIds: number[];
}

/** API publik untuk film & beranda. */
export const moviesApi = {
  getHome: () => api.get<HomeData>('/home'),
  list: (params: MovieListParams) =>
    api.get<MovieSummary[]>('/movies', { query: { ...params } }),
  detail: (slug: string) => api.get<Movie>(`/movies/${slug}`),
  recordView: (slug: string) => api.postPublic<{ recorded: boolean }>(`/movies/${slug}/view`),
  bySlugs: (slugs: string[]) =>
    api.get<MovieSummary[]>('/movies/by-slugs', {
      query: { slugs: slugs.slice(0, 100).join(',') },
    }),
};

/** API admin untuk film. */
export const adminMoviesApi = {
  list: (params: MovieListParams & { status?: string }) =>
    api.get<MovieSummary[]>('/admin/movies', { query: { ...params } }),
  get: (id: number) => api.get<Movie>(`/admin/movies/${id}`),
  create: (payload: MoviePayload) => api.post<Movie>('/admin/movies', payload),
  update: (id: number, payload: MoviePayload) =>
    api.put<Movie>(`/admin/movies/${id}`, payload),
  updateStatus: (id: number, status: 'draft' | 'published') =>
    api.patch<Movie>(`/admin/movies/${id}/status`, { status }),
  remove: (id: number) => api.delete<void>(`/admin/movies/${id}`),
};
