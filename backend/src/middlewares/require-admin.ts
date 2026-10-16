import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getPool } from '../config/database';
import { AppError } from '../utils/app-error';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/error-code';
import { sessionCookieOptions } from '../config/session';

/**
 * Middleware otorisasi admin.
 * - Cek sesi memiliki adminId.
 * - Cek admin masih ada & aktif di database (dilakukan di backend).
 * - Cek role = admin.
 * Pemeriksaan sesungguhnya ada di sini, bukan di frontend.
 */
export function requireAdmin(): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const adminId = req.session?.adminId;

      if (typeof adminId !== 'number') {
        throw AppError.unauthorized(
          ERROR_MESSAGES[ERROR_CODES.SESSION_EXPIRED],
          ERROR_CODES.SESSION_EXPIRED,
        );
      }

      const [rows] = await getPool().query(
        'SELECT id, email, display_name, role, is_active FROM admins WHERE id = ? LIMIT 1',
        [adminId],
      );

      const admin = (rows as { id: number; email: string; display_name: string | null; role: string; is_active: number }[])[0];

      if (!admin) {
        // Sesi menunjuk ke admin yang sudah tidak ada -> hancurkan sesi.
        req.session.destroy(() => {});
        throw AppError.unauthorized(
          ERROR_MESSAGES[ERROR_CODES.SESSION_EXPIRED],
          ERROR_CODES.SESSION_EXPIRED,
        );
      }

      if (!admin.is_active) {
        req.session.destroy(() => {});
        throw AppError.forbidden(
          ERROR_MESSAGES[ERROR_CODES.ACCOUNT_INACTIVE],
          ERROR_CODES.ACCOUNT_INACTIVE,
        );
      }

      if (admin.role !== 'admin') {
        throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.FORBIDDEN]);
      }

      // Simpan info admin pada request untuk handler berikutnya.
      (req as unknown as { admin?: unknown }).admin = {
        id: admin.id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Helper untuk mengambil objek admin dari request (setelah requireAdmin). */
export function getAdmin(req: Request): {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
} {
  const admin = (req as unknown as {
    admin?: { id: number; email: string; displayName: string | null; role: string };
  }).admin;
  if (!admin) {
    throw AppError.unauthorized();
  }
  return admin;
}

void sessionCookieOptions;
