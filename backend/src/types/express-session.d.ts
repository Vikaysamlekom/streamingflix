import 'express-session';

/**
 * Augmentasi tipe session agar memiliki field adminId & csrfToken.
 * Hanya menyimpan data minimum (lihat bagian 6 master prompt).
 */
declare module 'express-session' {
  interface SessionData {
    adminId?: number;
    csrfToken?: string;
    lastSeenAt?: number;
  }
}
