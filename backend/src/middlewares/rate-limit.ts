import rateLimit from 'express-rate-limit';

/**
 * Rate limiting untuk proteksi endpoint.
 * - Login: sangat ketat (5–10 percobaan / 15 menit per IP).
 * - Penulisan admin: sedang.
 * - Endpoint view: per IP + film (dibuat terpisah di routes).
 */

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
    },
  },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan.' },
  },
});

/** Rate limit generik untuk request publik yang berat. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan.' },
  },
});
