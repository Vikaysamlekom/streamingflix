import session from 'express-session';
import mysqlSessionModuleImport from 'express-mysql-session';
import type { RequestHandler } from 'express';
import { env, cookieSecure, isProduction, isTest } from './env';
import { getDatabaseSslOptions } from './database';

/**
 * Konfigurasi session-based authentication dengan session store MySQL.
 * - Cookie HttpOnly; Secure otomatis di produksi (atau COOKIE_SECURE=true).
 * - SameSite sesuai deployment (lax/strict/none). Lihat docs/DEPLOYMENT.md.
 * - Sesi punya masa kedaluwarsa; store membersihkan sesi lama otomatis.
 */

const maxAgeMs = env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000;

/**
 * express-mysql-session@3 mengekspor PABRIK (bukan konstruktor):
 *   const MySQLStore = require('express-mysql-session')(session)
 * Kelas Store hanya valid setelah modul `express-session` diteruskan ke pabrik.
 * Memanggil `new MySQLStore(options)` langsung = crash "superCtor undefined".
 */
type MySQLStoreConstructor = new (options: Record<string, unknown>) => session.Store;
type MySQLStoreFactory = (sessionModule: unknown) => MySQLStoreConstructor;

const createMySQLStoreClass = mysqlSessionModuleImport as unknown as MySQLStoreFactory;
const MySQLStore = createMySQLStoreClass(session as unknown);

export function createSessionMiddleware(): RequestHandler {
  const sessionOptions: session.SessionOptions = {
    name: 'streamflix.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: env.COOKIE_SAMESITE,
      maxAge: maxAgeMs,
      domain: env.COOKIE_DOMAIN || undefined,
      path: '/',
    },
  };

  // Di mode test, gunakan MemoryStore agar test tidak bergantung DB session.
  if (isTest) {
    return session({ ...sessionOptions, store: new session.MemoryStore() });
  }

  const store = new MySQLStore({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: getDatabaseSslOptions(),
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000, // bersihkan tiap 15 menit
    expiration: maxAgeMs,
    createDatabaseTable: false, // tabel dibuat oleh migrasi 007
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data',
      },
    },
  });

  return session({ ...sessionOptions, store });
}

/** Konfigurasi default cookie sesi (dipakai untuk destroy). */
export const sessionCookieName = 'streamflix.sid';
export const sessionCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: env.COOKIE_SAMESITE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
} as const;

void isProduction;
