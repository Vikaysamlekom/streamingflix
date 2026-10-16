import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import { requireAdmin } from '../../middlewares/require-admin';
import { csrfProtect } from '../../middlewares/csrf';
import { writeLimiter } from '../../middlewares/rate-limit';
import { getPool, isDatabaseHealthy } from '../../config/database';
import { allowedVideoHosts, appVersion } from '../../config/env';
import { validateRequest, getValidBody } from '../../middlewares/validate-request';
import {
  siteSettingsSchema,
  SETTINGS_KEY_MAP,
  type SiteSettingsInput,
} from './settings.schema';

/** GET/PUT /api/admin/settings */
export const adminSettingsRouter = Router();

adminSettingsRouter.use(requireAdmin());
adminSettingsRouter.use(csrfProtect());

async function loadSettings(): Promise<Record<string, string>> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    'SELECT `key`, `value` FROM site_settings',
  );
  const map: Record<string, string> = {};
  for (const row of rows as { key: string; value: string | null }[]) {
    map[row.key] = row.value ?? '';
  }
  return map;
}

/** Susun objek pengaturan untuk API dari baris key-value. */
function toApiSettings(map: Record<string, string>): SiteSettingsInput {
  const read = (key: keyof typeof SETTINGS_KEY_MAP, fallback: string) =>
    map[SETTINGS_KEY_MAP[key]] ?? fallback;

  const heroLimit = Number(read('heroSlideLimit', '5'));

  return {
    siteName: read('siteName', 'StreamFlix'),
    tagline: read('tagline', ''),
    seoDescription: read('seoDescription', ''),
    heroSlideLimit: Number.isFinite(heroLimit) ? heroLimit : 5,
    socialFacebook: read('socialFacebook', ''),
    socialInstagram: read('socialInstagram', ''),
    socialTwitter: read('socialTwitter', ''),
    socialYoutube: read('socialYoutube', ''),
  };
}

// GET /api/admin/settings
adminSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [map, dbHealthy] = await Promise.all([
      loadSettings(),
      isDatabaseHealthy(),
    ]);

    sendSuccess(res, {
      settings: toApiSettings(map),
      system: {
        appVersion,
        databaseConnected: dbHealthy,
        // Hanya ditampilkan, tidak dapat diubah dari UI.
        allowedVideoHosts,
      },
    });
  }),
);

// PUT /api/admin/settings
adminSettingsRouter.put(
  '/',
  writeLimiter,
  validateRequest({ body: siteSettingsSchema }),
  asyncHandler(async (req, res) => {
    const payload = getValidBody<SiteSettingsInput>(req);

    const entries: [string, string][] = [
      [SETTINGS_KEY_MAP.siteName, payload.siteName],
      [SETTINGS_KEY_MAP.tagline, payload.tagline ?? ''],
      [SETTINGS_KEY_MAP.seoDescription, payload.seoDescription ?? ''],
      [SETTINGS_KEY_MAP.heroSlideLimit, String(payload.heroSlideLimit)],
      [SETTINGS_KEY_MAP.socialFacebook, payload.socialFacebook ?? ''],
      [SETTINGS_KEY_MAP.socialInstagram, payload.socialInstagram ?? ''],
      [SETTINGS_KEY_MAP.socialTwitter, payload.socialTwitter ?? ''],
      [SETTINGS_KEY_MAP.socialYoutube, payload.socialYoutube ?? ''],
    ];

    for (const [key, value] of entries) {
      await getPool().execute(
        `INSERT INTO site_settings (\`key\`, \`value\`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
        [key, value],
      );
    }

    const map = await loadSettings();
    sendSuccess(res, toApiSettings(map));
  }),
);

/* --------------------------- Route publik ----------------------------- */

/**
 * GET /api/settings
 * Subset pengaturan yang aman ditampilkan di situs publik
 * (nama situs, tagline, deskripsi SEO, tautan sosial, batas slide hero).
 */
export const publicSettingsRouter = Router();

publicSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const map = await loadSettings();
    const settings = toApiSettings(map);
    sendSuccess(res, {
      siteName: settings.siteName,
      tagline: settings.tagline,
      seoDescription: settings.seoDescription,
      heroSlideLimit: settings.heroSlideLimit,
      social: {
        facebook: settings.socialFacebook,
        instagram: settings.socialInstagram,
        twitter: settings.socialTwitter,
        youtube: settings.socialYoutube,
      },
    });
  }),
);
