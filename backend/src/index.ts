/**
 * Entry point untuk deployment Vercel (Express zero-configuration).
 *
 * Vercel mendeteksi otomatis file yang memuat `from 'express'` (dalam praktik
 * dipilih `app.ts`, di-build menjadi `app.js`) dan mengekspor aplikasi Express
 * sebagai *default export* dari `app.ts`.
 *
 * File ini hanya meneruskan default export tersebut agar tetap ada satu
 * instance aplikasi (tidak membuat instance kedua) bila Vercel memilih
 * `index.ts` sebagai entry.
 *
 * Entry point CLI/local TIDAK berubah: `npm run dev` / `npm start` tetap
 * memakai `src/server.ts` (yang memanggil `app.listen`).
 *
 * Referensi: https://vercel.com/docs/frameworks/backend/express
 */
export { default } from './app';
