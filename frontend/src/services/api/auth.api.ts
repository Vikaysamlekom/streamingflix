import { api } from './client';
import type { AdminUser } from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ admin: AdminUser; csrfToken: string }>('/auth/login', {
      email,
      password,
    }),
  logout: () => api.post<{ ok: boolean }>('/auth/logout'),
  me: () => api.get<{ admin: AdminUser }>('/auth/me'),
};
