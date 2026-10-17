import type { Express } from 'express';
import { createApp } from './app';

/**
 * Entry point untuk deployment Vercel (Express zero-configuration).
 *
 * Vercel mendeteksi otomatis file `src/index.ts` yang memuat `from 'express'`
 * dan mengekspor aplikasi Express sebagai *default export*, lalu menjalankannya
 * sebagai satu Vercel Function (Fluid compute) — tanpa `app.listen()` dan tanpa
 * folder `api/` maupun file `vercel.json` di backend.
 *
 * Entry point CLI/local TIDAK berubah: `npm run dev` / `npm start` tetap
 * memakai `src/server.ts` (yang memanggil `app.listen`).
 *
 * Referensi: https://vercel.com/docs/frameworks/backend/express
 */
const app: Express = createApp();

export default app;
