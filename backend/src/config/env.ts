import 'dotenv/config';
import { z } from 'zod';

/**
 * Validasi & pemusatan konfigurasi environment.
 * Gagal cepat (fail fast) saat startup bila konfigurasi wajib tidak ada/invalid.
 */

const booleanish = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default('streamflix'),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  DB_SSL: booleanish.optional(),

  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET minimal 16 karakter'),
  SESSION_MAX_AGE_HOURS: z.coerce.number().positive().default(8),

  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: booleanish.optional(),

  ALLOWED_VIDEO_HOSTS: z.string().optional().default(''),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Tampilkan field yang bermasalah tanpa membocorkan nilai rahasia.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`\n[env] Konfigurasi environment tidak valid:\n${issues}\n`);
    process.exit(1);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    if (env.SESSION_SECRET.length < 32) {
      console.error(
        '[env] SESSION_SECRET harus minimal 32 karakter di produksi.',
      );
      process.exit(1);
    }
    if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
      console.error(
        '[env] COOKIE_SAMESITE=none mewajibkan COOKIE_SECURE=true di produksi.',
      );
      process.exit(1);
    }
  }

  return env;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';

/** Cookie secure: eksplisit dari env, atau otomatis true di produksi. */
export const cookieSecure =
  env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : isProduction;

/** Daftar host video yang diizinkan (dari ALLOWED_VIDEO_HOSTS, dipisah koma). */
export const allowedVideoHosts = env.ALLOWED_VIDEO_HOSTS.split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export const appVersion = process.env.npm_package_version ?? '1.0.0';
