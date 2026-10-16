import { allowedVideoHosts, isProduction, isTest } from '../config/env';

/**
 * Validasi URL video sebelum disimpan di database.
 *
 * Keamanan:
 * - Hanya skema http/https yang diterima (javascript:, data:, file: ditolak).
 * - Di produksi wajib https.
 * - Opsional allowlist host (ALLOWED_VIDEO_HOSTS).
 *
 * PENTING: backend TIDAK pernah membuat proxy yang mengambil URL dari browser
 * (risiko SSRF). Backend hanya menyimpan & mengembalikan URL.
 */

export interface VideoUrlValidationResult {
  ok: boolean;
  normalizedUrl?: string;
  reason?: string;
}

const ALLOWED_SCHEMES_PROD = ['https:'];
const ALLOWED_SCHEMES_DEV = ['http:', 'https:'];

export function validateVideoUrl(raw: string): VideoUrlValidationResult {
  const value = raw.trim();
  if (!value) {
    return { ok: false, reason: 'URL video wajib diisi' };
  }

  if (value.length > 2048) {
    return { ok: false, reason: 'URL video terlalu panjang (maks 2048 karakter)' };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'URL video tidak valid' };
  }

  const allowedSchemes = isProduction ? ALLOWED_SCHEMES_PROD : ALLOWED_SCHEMES_DEV;

  if (!allowedSchemes.includes(url.protocol)) {
    return {
      ok: false,
      reason: isProduction
        ? 'URL video wajib memakai HTTPS'
        : 'URL video tidak valid',
    };
  }

  if (!url.hostname) {
    return { ok: false, reason: 'URL video tidak valid' };
  }

  if (allowedVideoHosts.length > 0) {
    const allowed = allowedVideoHosts.some((host) => {
      if (host.startsWith('*.')) {
        const base = host.slice(2);
        return url.hostname === base || url.hostname.endsWith(`.${base}`);
      }
      return url.hostname === host || url.hostname.endsWith(`.${host}`);
    });

    if (!allowed) {
      return { ok: false, reason: `Domain video tidak diizinkan: ${url.hostname}` };
    }
  }

  return { ok: true, normalizedUrl: url.toString() };
}

/**
 * Validasi URL gambar (poster/banner) — lebih longgar daripada video,
 * karena bisa berasal dari berbagai host CDN. Hanya http/https.
 */
export function validateImageUrl(raw: string): VideoUrlValidationResult {
  const value = raw.trim();
  if (!value) return { ok: true, normalizedUrl: '' };

  if (value.length > 2048) {
    return { ok: false, reason: 'URL gambar terlalu panjang' };
  }

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { ok: false, reason: 'URL gambar harus http atau https' };
    }
    return { ok: true, normalizedUrl: url.toString() };
  } catch {
    return { ok: false, reason: 'URL gambar tidak valid' };
  }
}

void isTest;
