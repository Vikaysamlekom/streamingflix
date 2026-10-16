import { api } from './client';
import type { Category, MovieSummary } from '@/types';

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories'),
  movies: (
    slug: string,
    params?: { page?: number; limit?: number; sort?: string },
  ) =>
    api.get<{ category: Category; movies: MovieSummary[] }>(
      `/categories/${slug}/movies`,
      { query: params },
    ),
};

export const adminCategoriesApi = {
  list: () => api.get<Category[]>('/admin/categories'),
  create: (payload: { name: string; slug?: string }) =>
    api.post<Category>('/admin/categories', payload),
  update: (id: number, payload: { name: string; slug?: string }) =>
    api.put<Category>(`/admin/categories/${id}`, payload),
  remove: (id: number) => api.delete<void>(`/admin/categories/${id}`),
};
