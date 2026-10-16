/**
 * Bootstrap environment untuk test.
 *
 * `src/config/env.ts` melakukan validasi ketat dan akan `process.exit(1)`
 * bila DB_USER / SESSION_SECRET tidak tersedia. File ini hanya menyiapkan
 * nilai default yang aman agar modul `src` bisa di-import tanpa database.
 *
 * PENTING: file ini TIDAK boleh meng-import apapun dari `src`.
 * Setiap file test WAJIB meng-import file ini sebagai import PERTAMA:
 *
 *   import '../helpers/env';
 *
 * ES module mengevaluasi dependensi sesuai urutan import, sehingga
 * `src/config/env.ts` baru dievaluasi setelah process.env terisi.
 *
 * Nilai yang sudah ada (mis. dari `.env` asli) tidak akan ditimpa.
 */
import 'dotenv/config';

const setDefault = (key: string, value: string): void => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

// Nilai sementara khusus test (tanpa koneksi DB nyata).
setDefault('NODE_ENV', 'test');
setDefault('DB_HOST', '127.0.0.1');
setDefault('DB_PORT', '3306');
setDefault('DB_NAME', 'streamflix_test');
setDefault('DB_USER', 'test_user');
setDefault('DB_PASSWORD', '');
setDefault('SESSION_SECRET', 'test-session-secret-0123456789abcdef');
setDefault('FRONTEND_URL', 'http://localhost:5173');
