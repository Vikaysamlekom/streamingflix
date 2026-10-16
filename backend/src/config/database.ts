import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { env, isTest } from './env';

/**
 * Koneksi database MySQL memakai connection pool (mysql2/promise).
 * - Satu pool untuk seluruh aplikasi (tidak membuat koneksi per request).
 * - Kredensial dari environment.
 * - Wajib parameterized query di seluruh repository.
 */

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: env.DB_CONNECTION_LIMIT,
      maxIdle: env.DB_CONNECTION_LIMIT,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      charset: 'utf8mb4_unicode_ci',
      timezone: 'Z',
      dateStrings: false,
      connectTimeout: 10000,
    });
  }
  return pool;
}

/** Nilai parameter SQL yang diterima (parameterized query). */
export type SqlParam =
  | string
  | number
  | bigint
  | boolean
  | Date
  | Buffer
  | null;

/** Menjalankan query dengan parameter (WAJIB pakai placeholders `?`). */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T> {
  const [rows] = await getPool().query<T>(sql, params);
  return rows;
}

/** Menjalankan query yang mengembalikan satu baris (atau null). */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Menjalankan statement yang mengubah data; mengembalikan ResultSetHeader. */
export async function execute(
  sql: string,
  params: SqlParam[] = [],
): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute(sql, params);
  return result as mysql.ResultSetHeader;
}

/**
 * Menjalankan callback di dalam transaksi database.
 * Rollback otomatis bila callback melempar error.
 */
export async function withTransaction<T>(
  callback: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* abaikan error rollback */
    }
    throw err;
  } finally {
    conn.release();
  }
}

/** Cek koneksi database (dipakai health check & info sistem). */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await query('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}

/** Buka koneksi tanpa database (untuk bootstrap/migrasi). */
export function createBootstrapConnection(): Promise<mysql.Connection> {
  return mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4_unicode_ci',
  });
}

/** Tutup pool dengan benar saat shutdown. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Pada mode test, pool tetap diinisialisasi secara lazy oleh pemanggil.
void isTest;
