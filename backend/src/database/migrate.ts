import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import { env } from '../config/env';

/**
 * Runner migrasi database (sumber migrasi TUNGGAL: database/migrations/).
 *
 * - Membuat database bila belum ada.
 * - Membuat tabel `schema_migrations`.
 * - Menjalankan file .sql yang belum pernah diterapkan, berurutan.
 * - Idempoten: migrasi yang sudah tercatat dilewati.
 *
 * Jalankan: npm run db:migrate
 */

const MIGRATIONS_DIR = resolve(__dirname, '../../../database/migrations');

async function ensureDatabase(): Promise<void> {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`,
  );
  await conn.end();
}

async function ensureMigrationsTable(
  conn: mysql.Connection,
): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      migration VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_migration (migration)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getApplied(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT migration FROM schema_migrations',
  );
  return new Set(rows.map((r) => r.migration as string));
}

async function run(): Promise<void> {
  console.log(`\n[db:migrate] Database: ${env.DB_NAME} @ ${env.DB_HOST}:${env.DB_PORT}`);

  await ensureDatabase();

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4_unicode_ci',
  });

  try {
    await ensureMigrationsTable(conn);
    const applied = await getApplied(conn);

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      console.warn('[db:migrate] Tidak ada file migrasi ditemukan.');
      return;
    }

    let executed = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  - dilewati (sudah diterapkan): ${file}`);
        continue;
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  - menerapkan: ${file}`);

      try {
        await conn.query(sql);
        await conn.query(
          'INSERT INTO schema_migrations (migration) VALUES (?)',
          [file],
        );
        executed++;
      } catch (err) {
        console.error(`\n[db:migrate] GAGAL pada ${file}:`);
        console.error(err instanceof Error ? err.message : err);
        throw err;
      }
    }

    console.log(
      `\n[db:migrate] Selesai. ${executed} migrasi baru diterapkan, ${files.length - executed} dilewati.\n`,
    );
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('[db:migrate] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
