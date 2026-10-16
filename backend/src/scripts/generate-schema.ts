import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Menghasilkan database/schema.sql dari file migrasi (sumber tunggal).
 * Jalankan: npm run db:generate-schema
 *
 * File hasil dipakai untuk import manual (mis. phpMyAdmin XAMPP).
 * Jaga agar schema.sql selalu konsisten dengan folder migrasi.
 */

const MIGRATIONS_DIR = resolve(__dirname, '../../../database/migrations');
const OUTPUT_FILE = resolve(__dirname, '../../../database/schema.sql');

const HEADER = `-- ============================================================================
-- StreamFlix - schema.sql
-- ============================================================================
-- FILE INI DIHASILKAN OTOMATIS dari database/migrations/ oleh
-- \`npm run db:generate-schema\`. Jangan mengedit manual agar tetap sinkron.
--
-- CARA IMPORT DI XAMPP (phpMyAdmin):
--   1. Jalankan Apache & MySQL dari XAMPP Control Panel.
--   2. Buka http://localhost/phpmyadmin
--   3. Tab "Import" -> pilih file ini -> Go/Import.
--      (Sudah termasuk CREATE DATABASE + USE, tidak perlu buat DB manual.)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS \`streamflix\`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE \`streamflix\`;

CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
  \`id\`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`migration\`  VARCHAR(255) NOT NULL,
  \`applied_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_schema_migrations_migration\` (\`migration\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

function main(): void {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const parts: string[] = [HEADER];

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').trim();
    parts.push(`-- ---------------------------------------------------------------------------\n-- ${file}\n-- ---------------------------------------------------------------------------\n${sql}\n`);
  }

  const recordInsert = `-- ---------------------------------------------------------------------------
-- Catatan migrasi
-- ---------------------------------------------------------------------------
INSERT INTO \`schema_migrations\` (\`migration\`) VALUES
${files.map((f) => `  ('${f}')`).join(',\n')}
ON DUPLICATE KEY UPDATE \`migration\` = VALUES(\`migration\`);
`;

  parts.push(recordInsert);
  parts.push(
    `-- ============================================================================\n-- Selesai. Untuk data contoh (development), import database/seeds/dev-demo.sql\n-- secara terpisah. JANGAN dijalankan di produksi.\n-- ============================================================================\n`,
  );

  writeFileSync(OUTPUT_FILE, parts.join('\n'), 'utf8');
  console.log(`[db:generate-schema] Menulis ${files.length} migrasi ke ${OUTPUT_FILE}`);
}

main();
