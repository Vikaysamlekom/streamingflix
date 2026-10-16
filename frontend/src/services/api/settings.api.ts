import { api } from './client';
import type { SiteSettings, SystemInfo } from '@/types';

export interface PublicSettings {
  siteName: string;
  tagline: string;
  seoDescription: string;
  heroSlideLimit: number;
  social: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };
}

export const settingsApi = {
  public: () => api.get<PublicSettings>('/settings'),
};

export const adminSettingsApi = {
  get: () =>
    api.get<{ settings: SiteSettings; system: SystemInfo }>('/admin/settings'),
  update: (settings: Partial<SiteSettings>) =>
    api.put<SiteSettings>('/admin/settings', settings),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.put<{ ok: boolean }>('/admin/account/password', payload),
};
