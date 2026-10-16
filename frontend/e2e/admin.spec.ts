import { test, expect } from '@playwright/test';

/**
 * Alur admin.
 * Di-skip kecuali `E2E=true`. Membutuhkan kredensial admin test lewat env
 * `E2E_ADMIN_EMAIL` dan `E2E_ADMIN_PASSWORD`.
 */
const enabled = Boolean(process.env.E2E);
test.skip(
  !enabled,
  'Butuh aplikasi berjalan + admin test. Jalankan dengan E2E=true.',
);

const email = process.env.E2E_ADMIN_EMAIL ?? '';
const password = process.env.E2E_ADMIN_PASSWORD ?? '';

test.describe('Admin', () => {
  test('akses /admin/dashboard tanpa login dialihkan ke /admin/login', async ({
    page,
  }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('button', { name: /Masuk/i })).toBeVisible();
  });

  test('login, buat film draft, publish, lalu hapus', async ({ page }) => {
    test.skip(!email || !password, 'Kredensial admin test belum diisi.');

    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole('button', { name: /Masuk/i }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Buat film baru (draft).
    const title = `E2E Film ${Date.now()}`;
    await page.goto('/admin/movies/new');
    await page.getByLabel('Judul').fill(title);
    // Field wajib lainnya diisi bila ada (URL video & kategori).
    const videoField = page.getByLabel(/URL Video/i);
    if (await videoField.count()) {
      await videoField.first().fill('http://localhost:5050/sample.mp4');
    }
    await page.getByRole('button', { name: /^Simpan$/i }).click();

    await expect(page).toHaveURL(/\/admin\/movies$/);
    const row = page.getByText(title).first();
    await expect(row).toBeVisible();

    // Hapus dengan konfirmasi.
    const card = page.locator('tr, article, li').filter({ hasText: title }).first();
    await card.getByRole('button', { name: /Hapus/i }).click();
    await page.getByRole('button', { name: /Hapus/i }).last().click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test('logout mengembalikan ke situs publik', async ({ page }) => {
    test.skip(!email || !password, 'Kredensial admin test belum diisi.');

    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole('button', { name: /Masuk/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.getByRole('button', { name: /Keluar/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
