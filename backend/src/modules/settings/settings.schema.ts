import { z } from 'zod';

/** Skema pengaturan situs (bagian 13.6 master prompt). */
export const siteSettingsSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, 'Nama situs wajib diisi')
    .max(100, 'Nama situs maksimal 100 karakter'),
  tagline: z.string().trim().max(200, 'Tagline maksimal 200 karakter').optional().or(z.literal('')),
  seoDescription: z
    .string()
    .trim()
    .max(300, 'Deskripsi SEO maksimal 300 karakter')
    .optional()
    .or(z.literal('')),
  heroSlideLimit: z.coerce
    .number()
    .int()
    .min(1, 'Minimal 1 slide')
    .max(8, 'Maksimal 8 slide'),
  socialFacebook: z.string().trim().max(2048).optional().or(z.literal('')),
  socialInstagram: z.string().trim().max(2048).optional().or(z.literal('')),
  socialTwitter: z.string().trim().max(2048).optional().or(z.literal('')),
  socialYoutube: z.string().trim().max(2048).optional().or(z.literal('')),
  // Kode iklan (HTML mentah dari jaringan iklan). Hanya admin yang dapat
  // mengubahnya; script yang dirender berasal dari input admin tepercaya.
  adHeaderCode: z.string().trim().max(20000).optional().or(z.literal('')),
  adHomeTop: z.string().trim().max(20000).optional().or(z.literal('')),
  adHomeMid: z.string().trim().max(20000).optional().or(z.literal('')),
  adWatchBelow: z.string().trim().max(20000).optional().or(z.literal('')),
  adDetailBelow: z.string().trim().max(20000).optional().or(z.literal('')),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

/** Pemetaan key database <-> field API. */
export const SETTINGS_KEY_MAP = {
  siteName: 'site_name',
  tagline: 'tagline',
  seoDescription: 'seo_description',
  heroSlideLimit: 'hero_slide_limit',
  socialFacebook: 'social_facebook',
  socialInstagram: 'social_instagram',
  socialTwitter: 'social_twitter',
  socialYoutube: 'social_youtube',
  adHeaderCode: 'ad_header_code',
  adHomeTop: 'ad_home_top',
  adHomeMid: 'ad_home_mid',
  adWatchBelow: 'ad_watch_below',
  adDetailBelow: 'ad_detail_below',
} as const;
