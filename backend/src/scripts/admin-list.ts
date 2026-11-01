import 'dotenv/config';
import { closePool, query } from '../config/database';
import type { RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env';

/**
 * CLI baca-saja untuk memeriksa akun admin (opsi diagnostik).
 * Jalankan: npm run admin:list
 *
 * Kegunaan:
 * - Memastikan admin benar-benar ada di database yang DITUJU (host tercetak di bawah),
 *   misal sebelum login pertama di deployment produksi.
 * - Karena `create-admin` menulis ke database sesuai env aktif, jalankan ini dengan env
 *   yang SAMA agar tidak salah diagnosis ("login invalid padahal admin ke local XAMPP").
 */

interface AdminListRow extends RowDataPacket {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
  is_active: number;
  last_login_at: Date | string | null;
}

function formatDateTime(value: Date | string | null): string {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(`${value}Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

async function main(): Promise<void> {
  console.log('\n=== StreamFlix — Daftar Akun Admin (baca-saja) ===\n');
  console.log(`DB tujuan : ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}\n`);

  let rows: AdminListRow[];
  try {
    rows = await query<AdminListRow[]>(
      'SELECT id, email, display_name, role, is_active, last_login_at FROM admins ORDER BY id',
    );
  } catch (err) {
    console.error(
      'Gagal membaca tabel admins:',
      err instanceof Error ? err.message : err,
    );
    console.error(
      'Kemungkinan tabel belum ada — jalankan migrasi dulu: npm run db:migrate',
    );
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log(
      'Belum ada admin di database ini. Jalankan: npm run admin:create\n' +
        '(pastikan DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD menunjuk database yang sama\n' +
        ' dengan yang dipakai API produksi — lihat docs/DEPLOYMENT.md §9.3)',
    );
    return;
  }

  console.log(
    'ID    ' +
      'EMAIL'.padEnd(36) +
      'NAMA TAMPILAN'.padEnd(22) +
      'ROLE'.padEnd(12) +
      'AKTIF  ' +
      'LOGIN TERAKHIR',
  );
  for (const r of rows) {
    console.log(
      String(r.id).padEnd(6) +
        r.email.padEnd(36) +
        (r.display_name ?? '-').padEnd(22) +
        r.role.padEnd(12) +
        (r.is_active ? 'Ya     ' : 'TIDAK  ') +
        formatDateTime(r.last_login_at),
    );
  }

  const inactive = rows.filter((r) => !r.is_active).length;
  console.log(`\nTotal: ${rows.length} admin${inactive ? `, ${inactive} tidak aktif` : ''}.`);
}

main()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nGagal:', err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
