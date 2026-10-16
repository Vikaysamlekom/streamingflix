import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { Request } from 'express';
import { AppError } from '../../utils/app-error';
import { ERROR_CODES, ERROR_MESSAGES } from '../../utils/error-code';
import { logger } from '../../utils/logger';
import * as repository from './auth.repository';
import type { AdminPublic } from './auth.repository';
import type { LoginInput, ChangePasswordInput } from './auth.schema';

/**
 * Autentikasi admin.
 * - Verifikasi kredensial dengan bcrypt.
 * - Pesan login gagal generik agar tidak membocorkan keberadaan akun.
 * - Regenerasi session ID setelah login (mencegah session fixation).
 */

/** Waktu bcrypt untuk hash demo (agar login tidak lambat). */
const BCRYPT_SALT_ROUNDS = 10;

/** Delay kecil agar waktu respons login gagal setara dengan sukses. */
const GENERIC_FAILURE_DELAY_MS = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function failLogin(): Promise<never> {
  await sleep(GENERIC_FAILURE_DELAY_MS);
  throw new AppError(
    401,
    ERROR_CODES.INVALID_CREDENTIALS,
    ERROR_MESSAGES[ERROR_CODES.INVALID_CREDENTIALS],
  );
}

export async function login(
  req: Request,
  input: LoginInput,
): Promise<{ admin: AdminPublic; csrfToken: string }> {
  const admin = await repository.findByEmail(input.email);

  if (!admin) {
    // Bandingkan dengan hash palsu agar waktu setara (anti timing attack).
    await bcrypt.compare(input.password, '$2a$10$invalidinvalidinvalidinvalid123456789012345678');
    return failLogin();
  }

  if (!admin.is_active) {
    logger.warn({ adminId: admin.id }, 'Login attempt on inactive account');
    throw new AppError(
      403,
      ERROR_CODES.ACCOUNT_INACTIVE,
      ERROR_MESSAGES[ERROR_CODES.ACCOUNT_INACTIVE],
    );
  }

  const match = await bcrypt.compare(input.password, admin.password_hash);
  if (!match) {
    return failLogin();
  }

  // Regenerasi session ID setelah login sukses (mencegah session fixation).
  await regenerateSession(req);

  req.session.adminId = admin.id;
  req.session.lastSeenAt = Date.now();

  // Buat token CSRF baru setelah regenerasi sesi, kirim ke klien.
  const csrfToken = randomBytes(32).toString('hex');
  req.session.csrfToken = csrfToken;

  await repository.updateLastLogin(admin.id);

  logger.info({ adminId: admin.id }, 'Admin login successful');

  return { admin: repository.toAdminPublic(admin), csrfToken };
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function logout(req: Request): Promise<void> {
  const adminId = req.session.adminId;
  await destroySession(req);
  logger.info({ adminId }, 'Admin logout');
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Dapatkan info admin dari sesi (dipakai endpoint /me). */
export async function getMe(adminId: number): Promise<AdminPublic> {
  const admin = await repository.findById(adminId);
  if (!admin) {
    throw AppError.unauthorized();
  }
  return repository.toAdminPublic(admin);
}

export async function changePassword(
  adminId: number,
  input: ChangePasswordInput,
): Promise<void> {
  const admin = await repository.findById(adminId);
  if (!admin) {
    throw AppError.unauthorized();
  }

  const match = await bcrypt.compare(input.currentPassword, admin.password_hash);
  if (!match) {
    throw new AppError(
      401,
      ERROR_CODES.INVALID_CREDENTIALS,
      'Password lama tidak sesuai',
    );
  }

  if (input.newPassword === input.currentPassword) {
    throw AppError.validation('Password baru harus berbeda dari password lama');
  }

  const hash = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);
  await repository.updatePassword(adminId, hash);
  logger.info({ adminId }, 'Admin password changed');
}

/** Hash password untuk pembuatan admin (dipakai CLI). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}
