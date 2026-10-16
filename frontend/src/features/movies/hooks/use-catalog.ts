import { useQuery } from '@tanstack/react-query';
import { moviesApi } from '@/services/api/movies.api';
import { categoriesApi } from '@/services/api/categories.api';
import { settingsApi } from '@/services/api/settings.api';

/** Query: data beranda lengkap. */
export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => moviesApi.getHome().then((r) => r.data),
    staleTime: 120_000,
  });
}

/** Query: daftar film dengan filter. */
export function useMovies(params: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
  sort?: string;
}) {
  return useQuery({
    queryKey: ['movies', params],
    queryFn: () => moviesApi.list(params),
    placeholderData: (prev) => prev,
  });
}

/** Query: detail film berdasarkan slug. */
export function useMovie(slug: string | undefined) {
  return useQuery({
    queryKey: ['movie', slug],
    queryFn: () => moviesApi.detail(slug as string).then((r) => r.data),
    enabled: Boolean(slug),
  });
}

/**
 * Query: ringkasan beberapa film berdasarkan slug.
 * Hasil disusun ulang mengikuti urutan slug yang diminta.
 */
export function useMoviesBySlugs(slugs: string[]) {
  const key = slugs.slice(0, 100).join(',');
  return useQuery({
    queryKey: ['movies-by-slugs', key],
    queryFn: () => moviesApi.bySlugs(slugs.slice(0, 100)).then((r) => r.data),
    enabled: slugs.length > 0,
    staleTime: 60_000,
  });
}

/** Query: daftar genre. */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
    staleTime: 300_000,
  });
}

/** Query: film per genre. */
export function useCategoryMovies(
  slug: string | undefined,
  params?: { page?: number; limit?: number; sort?: string },
) {
  return useQuery({
    queryKey: ['category-movies', slug, params],
    queryFn: () =>
      categoriesApi.movies(slug as string, params).then((r) => r.data),
    enabled: Boolean(slug),
  });
}

/** Query: pengaturan publik (nama situs, sosial, dll). */
export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => settingsApi.public().then((r) => r.data),
    staleTime: 300_000,
  });
}
