import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, RequestHandler } from 'express';
import { AppError } from '../utils/app-error';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/error-code';

/**
 * Perlindungan CSRF dengan pola "synchronizer token pattern".
 *
 * - GET /api/auth/csrf-token membuat token acak dan menyimpannya di sesi,
 *   lalu mengembalikannya pada body respons (bukan localStorage).
 * - Semua request admin yang mengubah data (POST/PUT/PATCH/DELETE) wajib
 *   menyertakan header `x-csrf-token` yang cocok dengan token sesi.
 *
 * Token dibandingkan dengan timingSafeEqual untuk menghindari race.
 */

const CSRF_HEADER = 'x-csrf-token';

/** Generate token acak 32 byte, hex-encoded. */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/** Ambil atau buat token CSRF untuk sesi berjalan. */
export function issueCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  return req.session.csrfToken;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Middleware yang memverifikasi token CSRF untuk request yang mengubah data.
 * Pasang SETELAH requireAdmin() pada route admin bertanda tulis.
 */
export function csrfProtect(): RequestHandler {
  return (req, _res, next) => {
    const method = req.method.toUpperCase();
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // Selain request yang mengubah data, lewati.
    if (!mutating) {
      next();
      return;
    }

    const expected = req.session.csrfToken;
    const provided = req.get(CSRF_HEADER);

    if (!expected || !provided || !safeEqual(expected, provided)) {
      next(
        AppError.forbidden(
          ERROR_MESSAGES[ERROR_CODES.CSRF_INVALID],
          ERROR_CODES.CSRF_INVALID,
        ),
      );
      return;
    }

    next();
  };
}
