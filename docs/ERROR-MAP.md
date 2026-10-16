# Error Map — StreamFlix

Peta troubleshooting: **gejala → kemungkinan penyebab → lokasi berkas → cara debug**.
Gunakan dokumen ini saat menemukan bug untuk mempercepat menemukan akarnya.

> Tips umum: periksa **Console browser** (Network tab) untuk kode `error.code` dari API,
> lalu cari kode tersebut di tabel error pada [`API.md`](./API.md). Untuk masalah server,
> periksa log Pino backend (format `pino-pretty` di non-produksi).

## 1. Tabel Peta Error (Cepat)

| Gejala | Kemungkinan penyebab | Lokasi terkait | Cara debug |
|---|---|---|---|
| Beranda kosong / baris hilang | `GET /api/home` gagal; `genreRows`/`hero` kosong; backend belum punya film `published` | `frontend/src/pages/HomePage.tsx`, `frontend/src/features/home/` | Periksa Network tab untuk `/api/home`; cek `success: true` dan isi `data`; verifikasi ada film `status='published'` di DB |
| Hero carousel tidak muncul | `hero` kosong atau `hero_slide_limit` = 0 | `frontend/src/features/home/`, `site_settings` | Jalankan `SELECT * FROM site_settings WHERE key='hero_slide_limit'`; cek query hero di service |
| Kartu poster tidak tampil / gambar rusak | `posterUrl` NULL atau salah; placeholder gagal | `frontend/src/components/movies/` (`Poster.tsx`, `PosterCard.tsx`) | Cek nilai `posterUrl` di respons; pastikan fallback placeholder gradient aktif |
| Top 10 tanpa nomor peringkat | `rank` tidak diberikan backend | `frontend/src/components/movies/Top10Card.tsx`, service home | Cek `top10` berisi `rank` 1–10 |
| Baris "Daftar Saya" tidak muncul di `/my-list` | Data `localStorage` rusak/format salah; Zod menolak | `frontend/src/features/my-list/` (`use-my-list.ts`, `schema.ts`) | Buka DevTools → Application → Local Storage → `streamflix:my-list`; validasi array slug ≤ 200 |
| "Lanjutkan Menonton" tidak melanjutkan posisi | Progres tidak tersimpan / entri terhapus (≥95%) | `frontend/src/features/watch-progress/` | Cek `streamflix:watch-progress`; pastikan `save()` dipanggil tiap ~5s dan `durationSec > 0` |
| Video tidak diputar | `videoUrl` invalid / host ditolak / skema bukan https di produksi | `frontend/src/features/video-player/`, `backend/src/utils/video-url.ts` | Cek `videoUrl` di respons detail; cek validasi simpan (422 INVALID_VIDEO_URL / VIDEO_HOST_NOT_ALLOWED) |
| Daftar film tidak memuat (`/movies`) | Query gagal, filter/pagination salah, atau DB down | `backend/src/modules/movies/movie.routes.ts`, `movie.service.ts`, `movie.repository.ts` | Cek `GET /api/movies`; uji `sort` valid; periksa SQL di repository |
| Urutan film tidak berubah saat ganti sort | Nilai `sort` di luar allowlist → fallback `newest` | `backend/src/utils/pagination.ts`, `movie.schema.ts` | Cek `SORT_MAP`; pastikan nilai dikirim salah satu dari `newest/oldest/title/popular/rating` |
| Simpan film gagal di admin | Validasi Zod gagal, slug bentrok, URL video invalid | `frontend/src/features/admin/movies/`, `backend/src/modules/movies/movie.schema.ts` | Cek `422` lalu baca `error.details`; cek `409 SLUG_TAKEN`; cek URL video |
| Publish/unpublish tidak berpengaruh | `PATCH` tanpa CSRF; status tidak valid | `frontend/src/features/admin/movies/`, `backend/src/middlewares/csrf.ts` | Cek header `x-csrf-token`; cek body `{ status }` |
| Login admin selalu gagal | Password salah, akun nonaktif, atau belum ada admin | `backend/src/modules/auth/`, tabel `admins` | Cek `401 INVALID_CREDENTIALS` vs `403 ACCOUNT_INACTIVE`; jalankan `npm run admin:create` |
| Aksi admin tiba-tiba `403 CSRF_INVALID` | Token CSRF kedaluwarsa/tidak cocok setelah sesi diregenerasi | `frontend/src/services/api/client.ts`, `backend/src/middlewares/csrf.ts` | Klien fetch ulang token (kode reset `csrfToken = null`); pastikan `GET /api/auth/csrf-token` mengembalikan token |
| Aksi admin `401 SESSION_EXPIRED` | Sesi kedaluwarsa / cookie tidak terkirim | `backend/src/config/session.ts`, `frontend/src/services/api/client.ts` | Cek cookie `streamflix.sid` ada & `credentials: 'include'`; cek `SESSION_MAX_AGE_HOURS`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN` |
| Admin sudah login tapi tetap diminta login | Cookie cross-domain diblokir (SameSite/Secure) | `backend/src/config/session.ts`, `backend/src/config/env.ts` | Lihat strategi cookie di [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| `500 INTERNAL_ERROR` di mana-mana | Query SQL error, koneksi DB gagal, exception tak tertangani | `backend/src/middlewares/error-handler.ts`, `backend/src/config/database.ts` | Baca log Pino (stack trace hanya di log, tidak ke klien); cek kredensial DB |
| Error konfigurasi saat startup | Env wajib hilang/invalid (mis. `SESSION_SECRET`, `DB_USER`) | `backend/src/config/env.ts` | Baca pesan `[env] Konfigurasi environment tidak valid: ...`; lengkapi `backend/.env` |
| `429 RATE_LIMITED` | Terlalu banyak request (login/view) | `backend/src/middlewares/rate-limit.ts` | Kurangi frekuensi; untuk dev, tunggu jendela rate limit |
| `409 CATEGORY_IN_USE` saat hapus kategori | Kategori masih dipakai film (FK RESTRICT) | `backend/src/middlewares/error-handler.ts`, `database/migrations/004...` | Lepaskan kategori dari film dulu, atau tangani di UI |

---

## 2. Detail per Area

### 2.1 `frontend/src/pages/HomePage.tsx`

- **Tanggung jawab**: merender Beranda (hero, trending, terbaru, top10, baris genre).
- **Gejala umum**: halaman kosong, bagian tertentu hilang, loop `ErrorState` tak berujung.
- **Debug**:
  1. Buka Network tab → periksa `GET /api/home` (status + body).
  2. Pastikan bentuk `data` sesuai: `{ hero, trending, newReleases, top10, genreRows }`.
  3. Cek apakah `ErrorState` menerima `onRetry` yang benar.
  4. Pastikan minimal ada film `published` di DB.

### 2.2 `frontend/src/features/home/`

- **Tanggung jawab**: hook data Beranda, pemetaan `HomeData`, komposisi baris.
- **Gejala umum**: data tidak ter-refresh, `hero_slide_limit` diabaikan, baris genre kosong.
- **Debug**: periksa opsi TanStack Query (staleTime/refetch), pemetaan `genreRows`, dan
  jumlah slide hero terhadap `hero_slide_limit`.

### 2.3 `frontend/src/components/movies/`

- **Tanggung jawab**: `Poster`, `PosterCard`, `WideCard`, `Top10Card`, `RatingBadge`, `MovieRow`.
- **Gejala umum**: gambar rusak, kartu tidak seragam, panah `MovieRow` tidak muncul,
  peringkat Top 10 hilang.
- **Debug**: cek fallback gambar (NULL `posterUrl`), `aspect-ratio` kartu, logika
  `canScrollLeft/Right` pada `MovieRow`, dan keberadaan `rank` pada `Top10Card`.

### 2.4 `frontend/src/features/my-list/`

- **Berkas**: `use-my-list.ts`, `schema.ts`.
- **Tanggung jawab**: Daftar Saya di `localStorage` (maks 200, `streamflix:my-list`).
- **Gejala umum**: daftar tidak tersimpan, slug hantu (film sudah dihapus), sinkronisasi antar-tab gagal.
- **Debug**:
  1. Cek isi `localStorage['streamflix:my-list']` (harus array string).
  2. Validasi dengan `myListSchema` (array string, maks 200).
  3. `retainOnly(validSlugs)` dipanggil untuk membuang slug tak valid.
  4. Event `storage` menangani sinkronisasi antar-tab.

### 2.5 `frontend/src/features/watch-progress/`

- **Berkas**: `use-watch-progress.ts`, `schema.ts`.
- **Tanggung jawab**: progres tontonan di `streamflix:watch-progress`.
- **Gejala umum**: posisi tidak tersimpan, entri tidak terhapus saat selesai.
- **Debug**:
  1. Cek map `slug -> { positionSec, durationSec, updatedAt }`.
  2. Pastikan `durationSec > 0` (jika tidak, `save()` mengabaikan).
  3. Ambang selesai `COMPLETION_THRESHOLD = 0.95`; interval `SAVE_INTERVAL_SEC = 5`.
  4. Validasi dengan `watchProgressSchema`.

### 2.6 `backend/src/modules/movies/movie.routes.ts`

- **Tanggung jawab**: pemetaan endpoint film, pemasangan middleware.
- **Gejala umum**: 404 pada rute yang benar, middleware tidak jalan, CSRF terlewat.
- **Debug**: pastikan urutan `requireAdmin()` → `csrfProtect()` → `validateRequest()` → handler;
  cek prefiks rute (`/movies`, `/admin/movies`).

### 2.7 `backend/src/modules/movies/movie.repository.ts`

- **Tanggung jawab**: akses DB (query parameterized).
- **Gejala umum**: SQL error, hasil tidak lengkap, N+1 query untuk kategori.
- **Debug**:
  1. Jalankan query secara manual di phpMyAdmin dengan parameter tiruan.
  2. Pastikan memakai placeholder `?` (bukan interpolasi string).
  3. Cek `JOIN` `movie_categories`/`categories` untuk melengkapi data kategori.

### 2.8 `backend/src/modules/movies/movie.service.ts`

- **Tanggung jawab**: aturan bisnis, pemetaan DTO, pelemparan `AppError`.
- **Gejala umum**: slug duplikat tidak tertangani, film draft bocor ke publik, DTO salah bentuk.
- **Debug**: cek pembuatan `slug` (`slugify`/`uniqueSlug`), filter `status='published'` untuk
  endpoint publik, dan pemetaan `MovieSummaryDto`/`MovieDetailDto`.

### 2.9 `frontend/src/features/admin/movies/`

- **Tanggung jawab**: daftar film admin, form create/edit, aksi status/hapus.
- **Gejala umum**: form tidak menyimpan, kategori tidak terpilih, error 422 tidak tampil,
  CSRF hilang.
- **Debug**:
  1. Cek payload sesuai `MoviePayload` (kategori sebagai `categoryIds`).
  2. Tampilkan `error.details` (map field → message) di form.
  3. Pastikan request tulis memicu `x-csrf-token` (via `api.post/put/patch/delete`).

### 2.10 `frontend/src/features/video-player/`

- **Tanggung jawab**: pemutar MP4, integrasi progres.
- **Gejala umum**: video tidak play, kontrol tidak muncul, progres tidak tersimpan.
- **Debug**: cek elemen `<video>` dan sumbernya (`videoUrl`), izin autoplay, error event
  video; pastikan `save()` progres terhubung ke `timeupdate`.

### 2.11 `backend/src/utils/video-url.ts`

- **Tanggung jawab**: validasi URL video/gambar.
- **Gejala umum**: `422 INVALID_VIDEO_URL` atau `422 VIDEO_HOST_NOT_ALLOWED` saat menyimpan.
- **Debug**:
  1. Di produksi hanya `https:` yang diterima (http ditolak).
  2. Bila `ALLOWED_VIDEO_HOSTS` diisi, host harus cocok (mendukung wildcard `*.domain`).
  3. Cek panjang ≤ 2048 karakter.

### 2.12 `backend/src/modules/auth/`

- **Berkas**: `auth.routes.ts`, `auth.service.ts`, `auth.repository.ts`, `auth.schema.ts`.
- **Gejala umum**: login gagal, sesi tidak terbentuk, CSRF tidak dikembalikan.
- **Debug**:
  1. `INVALID_CREDENTIALS` (401) vs `ACCOUNT_INACTIVE` (403).
  2. `login()` meregenerasi sesi + membuat `csrfToken`; pastikan respons berisi keduanya.
  3. `changePassword` memerlukan `currentPassword` benar & `newPassword` ≥ 12 karakter.

### 2.13 `backend/src/middlewares/require-admin.ts`

- **Tanggung jawab**: otorisasi admin (sesi + cek DB + status + role).
- **Gejala umum**: `401 SESSION_EXPIRED`, `403 ACCOUNT_INACTIVE`, `403 FORBIDDEN`.
- **Debug**: verifikasi `req.session.adminId`; cek baris admin di DB (`is_active`, `role`);
  perhatikan sesi dihancurkan bila admin tidak ada/nonaktif.

### 2.14 `backend/src/middlewares/csrf.ts`

- **Tanggung jawab**: verifikasi token CSRF (synchronizer pattern).
- **Gejala umum**: `403 CSRF_INVALID` pada POST/PUT/PATCH/DELETE.
- **Debug**:
  1. Pastikan `GET /api/auth/csrf-token` dipanggil dan token disimpan di memory klien.
  2. Pastikan header `x-csrf-token` sama dengan `req.session.csrfToken`.
  3. Perbandingan memakai `timingSafeEqual`.
  4. Klien mereset token saat menerima `403 CSRF_INVALID` (ambil ulang).

### 2.15 `backend/src/config/database.ts`

- **Tanggung jawab**: pool `mysql2/promise`, helper `query`/`queryOne`/`execute`/`withTransaction`.
- **Gejala umum**: koneksi gagal, timeout, pool habis, `DB_ERROR`.
- **Debug**:
  1. Cek `DB_HOST/PORT/USER/PASSWORD/NAME` di `backend/.env`.
  2. Cek `DB_CONNECTION_LIMIT` (default 10) dan status MySQL (XAMPP).
  3. Verifikasi query dengan `?` placeholder; gunakan `withTransaction` untuk operasi berurutan.

### 2.16 `backend/src/middlewares/error-handler.ts`

- **Tanggung jawab**: pemetaan error terpusat.
- **Gejala umum**: `500` alih-alih `409/422`, pesan tidak sesuai.
- **Debug**:
  - `AppError` → status & kode sesuai.
  - `ZodError` → `422 VALIDATION_ERROR` + `details`.
  - MySQL dup (errno 1062) → `409 SLUG_TAKEN`.
  - MySQL FK (errno 1451/1452) → `409 CATEGORY_IN_USE`.
  - JSON rusak → `400 BAD_REQUEST`.
  - Lainnya → `500 INTERNAL_ERROR` (stack trace **tidak** dikirim ke klien).

### 2.17 `backend/src/config/env.ts`

- **Tanggung jawab**: validasi environment (fail fast).
- **Gejala umum**: proses keluar saat startup dengan pesan `[env] ...`.
- **Debug**:
  1. `SESSION_SECRET` minimal 16 karakter (minimal 32 di produksi).
  2. Di produksi: `COOKIE_SAMESITE=none` mewajibkan `COOKIE_SECURE=true`.
  3. Lengkapi variabel wajib (`DB_USER`, `SESSION_SECRET`).

### 2.18 `backend/src/config/session.ts`

- **Tanggung jawab**: konfigurasi sesi + cookie + MySQL store.
- **Gejala umum**: sesi hilang tiap request, cookie tidak terkirim, logout tidak bekerja.
- **Debug**:
  1. `isTest` memakai `MemoryStore`; non-test memakai store MySQL (tabel `sessions`).
  2. Cek `cookie` (`httpOnly`, `secure`, `sameSite`, `domain`) sesuai lingkungan.
  3. `createDatabaseTable: false` → pastikan migrasi 007 sudah dijalankan.

### 2.19 `backend/src/modules/*_schema.ts` (skema Zod)

- **Berkas**: `auth.schema.ts`, `movie.schema.ts`, dan skema modul lain.
- **Gejala umum**: `422 VALIDATION_ERROR` tak terduga, field tertentu selalu ditolak.
- **Debug**:
  1. Baca `error.details` (`field`, `message`) untuk lokasi tepatnya.
  2. Untuk film: cek `releaseYear` (1888–tahun depan), `durationMinutes` (1–1440),
     `rating` (0–10), format `slug`.
  3. Untuk login: email lowercase, password 1–128.

---

## 3. Kode Error → HTTP (Rujukan Cepat)

| Kode | HTTP | Arti singkat |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Input tidak lolos validasi Zod |
| `UNAUTHORIZED` | 401 | Belum login |
| `FORBIDDEN` | 403 | Akses ditolak |
| `CSRF_INVALID` | 403 | Token CSRF tidak valid |
| `NOT_FOUND` | 404 | Data tidak ditemukan |
| `CONFLICT` | 409 | Data bentrok |
| `SLUG_TAKEN` | 409 | Slug duplikat |
| `CATEGORY_IN_USE` | 409 | Kategori masih dipakai film |
| `INVALID_VIDEO_URL` | 422 | URL video tidak valid |
| `VIDEO_HOST_NOT_ALLOWED` | 422 | Host video tidak diizinkan |
| `INVALID_CREDENTIALS` | 401 | Email/password salah |
| `SESSION_EXPIRED` | 401 | Sesi berakhir |
| `ACCOUNT_INACTIVE` | 403 | Akun admin nonaktif |
| `INVALID_SORT` | 400 | Nilai `sort` tidak valid |
| `RATE_LIMITED` | 429 | Terlalu banyak permintaan |
| `BAD_REQUEST` | 400 | Permintaan/JSON tidak valid |
| `INTERNAL_ERROR` | 500 | Kesalahan server |
| `DB_ERROR` | 500 | Gangguan basis data |

Dokumen terkait: [`API.md`](./API.md) · [`FLOWCHART.md`](./FLOWCHART.md) ·
[`DATABASE.md`](./DATABASE.md).
