import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../../config/database';

/** Representasi baris admin dari database. */
export interface AdminRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: 'admin';
  is_active: number;
  last_login_at: Date | null;
}

/** Bentuk admin yang aman dikirim ke frontend (tanpa hash). */
export interface AdminPublic {
  id: number;
  email: string;
  displayName: string | null;
  role: 'admin';
  lastLoginAt: string | null;
}

export function toAdminPublic(row: AdminRow): AdminPublic {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
  };
}

/** Cari admin berdasarkan email (lowercase). */
export async function findByEmail(email: string): Promise<AdminRow | null> {
  const [rows] = await getPool().query<AdminRow[]>(
    'SELECT id, email, password_hash, display_name, role, is_active, last_login_at FROM admins WHERE email = ? LIMIT 1',
    [email],
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Cari admin berdasarkan id. */
export async function findById(id: number): Promise<AdminRow | null> {
  const [rows] = await getPool().query<AdminRow[]>(
    'SELECT id, email, password_hash, display_name, role, is_active, last_login_at FROM admins WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Perbarui waktu login terakhir. */
export async function updateLastLogin(id: number): Promise<void> {
  await getPool().execute(
    'UPDATE admins SET last_login_at = NOW() WHERE id = ?',
    [id],
  );
}

/** Ganti password hash admin. */
export async function updatePassword(
  id: number,
  passwordHash: string,
): Promise<void> {
  await getPool().execute('UPDATE admins SET password_hash = ? WHERE id = ?', [
    passwordHash,
    id,
  ]);
}

/** Tambahkan satu admin (dipakai CLI create-admin). */
export async function insertAdmin(input: {
  email: string;
  passwordHash: string;
  displayName: string | null;
}): Promise<number> {
  const [result] = await getPool().execute(
    'INSERT INTO admins (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [input.email, input.passwordHash, input.displayName, 'admin'],
  );
  return (result as { insertId: number }).insertId;
}

/** Hitung jumlah admin (untuk informasi CLI). */
export async function countAdmins(): Promise<number> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM admins',
  );
  return Number((rows[0] as { c: number } | undefined)?.c ?? 0);
}
