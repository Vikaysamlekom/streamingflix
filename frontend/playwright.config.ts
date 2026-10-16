import { defineConfig, devices } from '@playwright/test';

/**
 * Konfigurasi E2E Playwright.
 *
 * Test E2E memerlukan aplikasi yang benar-benar berjalan (backend + MySQL +
 * frontend) dan admin test. Karena itu:
 *   1) Siapkan `.env` backend & impor `database/schema.sql`.
 *   2) Buat admin test: `npm run admin:create`.
 *   3) Jalankan `npm run dev` (backend :3000 + frontend :5173).
 *   4) Jalankan dengan flag: `E2E=true npm run test:e2e`.
 *
 * Tanpa `E2E=true`, seluruh test di-skip secara sengaja agar `npm run test:e2e`
 * tidak gagal di lingkungan tanpa database.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
});
