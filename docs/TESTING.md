# Testing — StreamFlix

Dokumen ini menjelaskan cara menjalankan test, cakupan (coverage), hal yang **tidak**
tercakup, penyiapan database test, pembuatan fixture video untuk pengujian, dan daftar perintah.

- **Runner unit & integrasi backend**: Vitest (+ Supertest untuk HTTP)
- **Runner E2E**: Playwright
- **Unit frontend** (util/hook): Vitest

## 1. Strategi Testing

| Lapisan | Alat | Sasaran |
|---|---|---|
| Unit | Vitest | Util murni & skema Zod |
| Integrasi | Vitest + Supertest | Endpoint API terhadap database MySQL test |
| E2E | Playwright | Alur pengguna di browser (publik & admin) |

Prinsip:

- Test **tidak** memakai data/cabang produksi.
- Test integrasi memakai **database MySQL terpisah** (`streamflix_test`).
- Test tidak bergantung pada sumber video pihak ketiga (lihat bagian 5).

## 2. Perintah

Dari **akar proyek**:

| Perintah | Menjalankan |
|---|---|
| `npm test` | Test backend **dan** frontend (Vitest) |
| `npm run test:frontend` | Test frontend saja (Vitest + Testing Library) |
| `npm run test:unit` | Test unit backend saja (`backend/tests/unit`) |
| `npm run test:integration` | Test integrasi backend saja (`backend/tests/integration`) |
| `npm run test:e2e` | Test E2E frontend (Playwright) |
| `npm run typecheck` / `npm run lint` | Typecheck & ESLint kedua workspace |

Dari **`backend/`**:

| Perintah | Menjalankan |
|---|---|
| `npm test` | `vitest run` (semua) |
| `npm run test:watch` | Vitest mode watch |
| `npm run test:unit` | `vitest run tests/unit` |
| `npm run test:integration` | `vitest run tests/integration` |

Dari **`frontend/`**:

| Perintah | Menjalankan |
|---|---|
| `npm test` | `vitest run` (unit hook/util, environment `jsdom`) |
| `npm run test:watch` | Vitest mode watch |
| `npm run test:e2e` | `playwright test` |

> **Konfigurasi Vitest**
> - Backend: `backend/vitest.config.ts` (`environment: 'node'`, `include: ['tests/**/*.test.ts']`,
>   `fileParallelism: false`, env `NODE_ENV=test`).
> - Frontend: blok `test` pada `frontend/vite.config.ts` (`environment: 'jsdom'`,
>   `include: ['src/**/*.{test,spec}.{ts,tsx}']`, `exclude: ['e2e']`).
>
> **Konfigurasi E2E**: `frontend/playwright.config.ts` (`testDir: './e2e'`, proyek
> `desktop-chromium` dan `mobile-chromium`, `baseURL` → `http://localhost:5173`).
> Seluruh suite E2E **di-skip otomatis kecuali `E2E=true`**, karena test E2E
> memerlukan aplikasi yang benar-benar berjalan (backend + MySQL + frontend) dan
> kredensial admin test (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`).

## 3. Yang Dicakup (Covered)

### 3.1 Unit (backend)

- **`backend/src/utils/slug.ts`**
  - `slugify()`: lowercase, normalisasi NFKD, buang diakritik & non-ASCII, ganti spasi → `-`.
  - `uniqueSlug()`: fallback `film-<hex>` bila slug kosong.
  - `isValidSlugFormat()`: pola `^[a-z0-9]+(?:-[a-z0-9]+)*$`, panjang ≤ 255.
- **`backend/src/utils/video-url.ts`**
  - Skema hanya `http`/`https`; **wajib https di produksi**.
  - Panjang ≤ 2048.
  - Allowlist host (`ALLOWED_VIDEO_HOSTS`), termasuk wildcard `*.domain`.
  - `validateImageUrl()` menerima `http`/`https`.
- **Skema Zod** (`movie.schema.ts`, `auth.schema.ts`, dan `*_schema` lain)
  - Batas `title`, `slug`, `videoUrl`, `releaseYear` (1888–tahun depan),
    `durationMinutes` (1–1440), `rating` (0–10), `categoryIds` (maks 30).
  - `loginSchema` (email lowercase), `changePasswordSchema` (`newPassword` ≥ 12).
- **`backend/src/utils/pagination.ts`**
  - `normalizePagination()` (batas 1–100), `buildPaginationMeta()`, `SORT_MAP`
    (allowlist urutan).

### 3.2 Unit (frontend)

- **`features/my-list/schema.ts`** & hook `use-my-list`
  - `myListSchema` (array string, maks 200), operasi `add/remove/toggle/retainOnly`.
- **`features/watch-progress/schema.ts`** & hook `use-watch-progress`
  - `progressEntrySchema`, `watchProgressSchema`; ambang selesai
    `COMPLETION_THRESHOLD = 0.95`; interval simpan `SAVE_INTERVAL_SEC = 5`.
- **`utils/storage.ts`** — perilaku aman saat localStorage tidak tersedia.

### 3.3 Integrasi (Vitest + Supertest)

Menjalankan endpoint terhadap database test:

- **Health**: `GET /api/health` mengembalikan `status`/`database`.
- **Auth**: login sukses/gagal, `GET /auth/me`, `GET /auth/csrf-token`, logout.
  - Memverifikasi sesi + CSRF (request tulis tanpa token → `403 CSRF_INVALID`).
- **Movies publik**: `GET /api/movies` (filter/pagination/sort), `GET /api/movies/:slug`
  (404 untuk draft), `POST /api/movies/:slug/view` (view_count bertambah; rate limit).
- **Admin movies**: `POST`/`PUT`/`PATCH status`/`DELETE` (dengan CSRF).
  - `409 SLUG_TAKEN`, `422 VALIDATION_ERROR`, `422 INVALID_VIDEO_URL`.
- **Kategori**: CRUD + **`409 CATEGORY_IN_USE`** saat hapus kategori terpakai.
- **Pengaturan**: `GET`/`PUT /api/admin/settings`.
- **OTORISASI**: akses endpoint admin tanpa sesi → `401 SESSION_EXPIRED`; akun nonaktif →
  `403 ACCOUNT_INACTIVE`.

### 3.4 E2E (Playwright)

- **Pengunjung**: buka Beranda → jelajah katalog → cari → detail → tonton (dengan fixture
  video lokal) → progres tersimpan → Daftar Saya di `/my-list`.
- **Admin**: login → buat film → publish → tampil di publik → edit → hapus.
- **Kategori**: buat, coba hapus yang terpakai (harus gagal `CATEGORY_IN_USE`), lepas lalu hapus.
- **Keamanan sesi**: mengakses `/admin/dashboard` tanpa login dialihkan ke `/admin/login`.

## 4. Yang Tidak Dicakup (Not Covered)

- **Pemutaran video nyata dari pihak ketiga** — tidak diuji (lihat bagian 5).
- **Pengiriman email/notifikasi** — fitur tidak ada.
- **Pembayaran/langganan** — fitur tidak ada.
- **Autentikasi pengunjung** — situs publik memang tanpa login.
- **Performa/load testing** di luar pengujian dasar rate limit.
- **Lintas-browser penuh** — E2E difokuskan pada satu browser utama (perluas bila diperlukan).
- **Uji ketahanan jaringan ekstrem** (offline jangka panjang) — hanya jalur error dasar.
- **Migrasi berurutan dari nol** pada CI (disarankan menambah test migrasi bila perlu).

## 5. Fixture Video untuk Test (WAJIB: milik sendiri/lokal)

> ✅ **Aturan**: fixture video harus **berkas MP4 milik sendiri/lokal** yang disimpan di
> repository test (mis. `tests/fixtures/sample.mp4`), **atau** server statis lokal untuk test.

> ❌ **Jangan** memakai URL video dari layanan pihak ketiga (mis. streaming publik). Alasannya:
> - Menghindari ketergantungan jaringan & kebijakan hak cipta pihak ketiga.
> - Test menjadi tidak deterministik (video bisa hilang/berubah).
> - Tidak menimbulkan trafik ke layanan yang tidak kita kendalikan.

Contoh fixture:

```
backend/tests/fixtures/sample.mp4      # video pendek milik sendiri (~1–2 detik)
frontend/tests/fixtures/sample.mp4     # untuk E2E
```

- Ukuran kecil (beberapa KB), durasi pendek, tanpa audio bila memungkinkan.
- Untuk seed/test data, arahkan `video_url` ke server statis lokal yang menyajikan fixture
  tersebut, atau ke URL `http://localhost:.../sample.mp4` pada mode non-produksi.

Contoh penyajian statis saat E2E (dikelola test runner):

```bash
# Sajikan folder fixtures pada port lokal (contoh)
npx serve -l 5050 tests/fixtures
# video_url test: http://localhost:5050/sample.mp4
```

## 6. Penyiapan Database untuk Test

Test integrasi membutuhkan database MySQL **terpisah** dari pengembangan.

### 6.1 Buat database test

```sql
CREATE DATABASE streamflix_test
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 6.2 Konfigurasi

Arahkan variabel DB ke database test (mis. pada `backend/.env.test` atau variabel lingkungan
saat menjalankan test):

```dotenv
NODE_ENV=test
DB_HOST=localhost
DB_PORT=3306
DB_NAME=streamflix_test
DB_USER=root
DB_PASSWORD=
SESSION_SECRET=test-secret-minimal-16-characters
```

> Pada `NODE_ENV=test`, `backend/src/config/session.ts` memakai `MemoryStore` sehingga test
> tidak bergantung pada tabel `sessions`.

### 6.3 Jalankan migrasi pada DB test

```bash
# Arahkan DB_NAME ke streamflix_test lalu:
npm run db:migrate

# Atau impor schema.sql ke database streamflix_test via phpMyAdmin
```

### 6.4 Isolasi & pembersihan

- `fileParallelism: false` pada `vitest.config.ts` menjalankan berkas test secara berurutan
  agar tidak saling mengganggu data.
- Setiap suite integrasi sebaiknya **membersihkan data** (TRUNCATE/DELETE) atau memakai
  transaksi yang di-*rollback* pada `afterEach`/`afterAll`.

## 7. Menjalankan E2E (Playwright)

1. Pastikan backend dan frontend berjalan (mis. `npm run dev`), atau konfigurasikan
   `webServer` pada `playwright.config` untuk menyalakannya otomatis.
2. Siapkan admin test (`npm run admin:create`) dan (opsional) seed data demo.
3. Aktifkan flag `E2E` lalu jalankan (PowerShell):

```powershell
$env:E2E="true"; npm run test:e2e
```

   atau di bash: `E2E=true npm run test:e2e`

> Tanpa `E2E=true`, seluruh test di-skip sengaja (lihat §2) agar perintah tidak
> gagal pada lingkungan tanpa database.

4. Hasil & trace tersimpan pada folder `test-results/`/`playwright-report/` (sesuai konfigurasi).

> Untuk E2E admin, gunakan kredensial admin **khusus test** (`E2E_ADMIN_EMAIL`,
> `E2E_ADMIN_PASSWORD`). Jangan gunakan kredensial produksi.

## 8. Praktik yang Dianjurkan

- Satu `describe` per modul; nama test dalam bahasa yang jelas.
- Uji **kasus batas** (boundary): slug kosong, URL > 2048, rating 10.1, dsb.
- Untuk integrasi, uji **kode error** (`error.code`) — bukan hanya status HTTP.
- Selalu uji **jalur negatif** keamanan: tanpa sesi, tanpa CSRF, sesi kedaluwarsa.
- Jaga test tetap cepat dan tidak bergantung jaringan luar.

Dokumen terkait: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DATABASE.md`](./DATABASE.md) ·
[`API.md`](./API.md).

## 9. Hasil Verifikasi Terakhir

Dijalankan pada lingkungan pengembangan (Node v24, npm 11, Windows), tanpa MySQL aktif:

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | ✅ 0 error (frontend & backend) |
| `npm run lint` | ✅ 0 error, 0 warning (frontend & backend) |
| `npm test` | ✅ backend **57 lulus + 8 lewat** (5 file lulus, 2 file skip); frontend **22 lulus** |
| `npm run build` | ✅ `vite build` (1718 modul, admin di-code-split) + `tsc -p tsconfig.build.json` |
| `npm run test:e2e` | ⏭️ 16 test **di-skip** (perlu `E2E=true` + aplikasi berjalan) |
| `npm audit` | ✅ **0 vulnerabilities** |

**Catatan jujur / yang belum teruji:**

- **Test integrasi** (`auth-flow.test.ts`, `movies-api.test.ts`) hanya berjalan bila
  `TEST_DB=true` dengan database `streamflix_test` tersedia. MySQL **belum dijalankan** di
  lingkungan pembuatan, jadi 8 test tersebut **lewat (skip)** — bukan lulus.
- **Test E2E Playwright belum pernah dijalankan hingga lulus**, karena memerlukan backend +
  MySQL + frontend berjalan. `npm run test:e2e` tanpa `E2E=true` akan me-skip semua 16 test
  secara sengaja agar perintah tetap sukses di lingkungan tanpa database.
- **Kerentanan** (`npm audit` → **0 vulnerabilities**) diperbaiki lewat:
  1. `overrides.mysql2 = ^3.24.6` di `package.json` akar — sebelumnya ada `mysql2@3.10.2`
     terselip di dalam `express-mysql-session` (1 high + 1 moderate); kini menyatu/dedup ke
     `3.24.6`.
  2. Upgrade `vitest` `3.x → 5.0.5` pada kedua workspace — menghapus 2 critical (`tinypool`)
     dan 1 moderate (`@vitest/mocker`). Semua yang diperbaiki adalah dependensi **dev/test**,
     tidak ikut masuk bundle produksi. Seluruh test tetap lulus setelah upgrade.
- `esbuild` (postinstall) tertahan oleh gerbang `install-scripts` npm, namun **build dan test
  tetap berjalan normal** — untuk menghilangkan peringatan jalankan
  `npm install-scripts approve esbuild`.
