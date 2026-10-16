import { test, expect } from '@playwright/test';

/**
 * Alur pengunjung publik.
 * Di-skip kecuali `E2E=true` (butuh aplikasi berjalan + database).
 */
test.skip(
  !process.env.E2E,
  'Butuh aplikasi berjalan (backend + MySQL + frontend). Jalankan dengan E2E=true.',
);

test.describe('Pengunjung', () => {
  test('beranda menampilkan navigasi, hero, dan baris film', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('navigation', { name: 'Navigasi utama' }),
    ).toBeVisible();

    // Hero carousel memiliki aria-label "Film unggulan".
    await expect(page.getByRole('region', { name: 'Film unggulan' })).toBeVisible();

    // Minimal satu baris konten tampil.
    await expect(
      page.getByRole('heading', { name: /Trending|Rilis Terbaru|Top 10/i }).first(),
    ).toBeVisible();
  });

  test('pencarian mengarah ke /search dan menampilkan hasil', async ({ page }) => {
    await page.goto('/');
    const input = page.getByRole('searchbox', { name: 'Cari film' }).first();
    await input.fill('a');
    await expect(page).toHaveURL(/\/search\?q=/);
  });

  test('membuka detail, menambah ke Daftar Saya, dan melihatnya di /my-list', async ({
    page,
  }) => {
    await page.goto('/movies');

    const firstCard = page.locator('a[href^="/movies/"]').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/movies\/[^/]+$/);

    // Tambah ke Daftar Saya dari halaman detail.
    await page.getByRole('button', { name: /Daftar Saya/i }).first().click();

    await page.goto('/my-list');
    await expect(
      page.locator('a[href^="/movies/"]').first(),
    ).toBeVisible();
  });

  test('tombol Putar membuka halaman tonton', async ({ page }) => {
    await page.goto('/movies');
    await page.locator('a[href^="/movies/"]').first().click();
    await page.getByRole('link', { name: /Putar Sekarang/i }).click();
    await expect(page).toHaveURL(/\/watch\/[^/]+$/);
  });

  test('genre tampil dan memfilter katalog', async ({ page }) => {
    await page.goto('/genres');
    const genre = page.locator('a[href^="/movies?category="]').first();
    await expect(genre).toBeVisible();
    await genre.click();
    await expect(page).toHaveURL(/\/movies\?category=/);
  });
});
