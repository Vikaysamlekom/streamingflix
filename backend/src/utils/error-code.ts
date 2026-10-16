/**
 * Pemetaan kode error API (untuk docs/ERROR-MAP.md & konsistensi respons).
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_INVALID: 'CSRF_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SLUG_TAKEN: 'SLUG_TAKEN',
  CATEGORY_IN_USE: 'CATEGORY_IN_USE',
  INVALID_VIDEO_URL: 'INVALID_VIDEO_URL',
  VIDEO_HOST_NOT_ALLOWED: 'VIDEO_HOST_NOT_ALLOWED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  INVALID_SORT: 'INVALID_SORT',
  RATE_LIMITED: 'RATE_LIMITED',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DB_ERROR: 'DB_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Data yang dikirim tidak valid',
  UNAUTHORIZED: 'Anda belum masuk',
  FORBIDDEN: 'Akses ditolak',
  CSRF_INVALID: 'Token keamanan tidak valid. Muat ulang halaman dan coba lagi.',
  NOT_FOUND: 'Data tidak ditemukan',
  CONFLICT: 'Data bentrok',
  SLUG_TAKEN: 'Slug sudah digunakan oleh film lain',
  CATEGORY_IN_USE: 'Kategori masih dipakai oleh beberapa film',
  INVALID_VIDEO_URL: 'URL video tidak valid',
  VIDEO_HOST_NOT_ALLOWED: 'Domain video tidak diizinkan',
  INVALID_CREDENTIALS: 'Email atau password salah',
  SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  ACCOUNT_INACTIVE: 'Akun Anda tidak aktif',
  INVALID_SORT: 'Urutan tidak valid',
  RATE_LIMITED: 'Terlalu banyak permintaan. Coba lagi nanti.',
  BAD_REQUEST: 'Permintaan tidak valid',
  INTERNAL_ERROR: 'Terjadi kesalahan pada server',
  DB_ERROR: 'Terjadi gangguan pada basis data',
};
