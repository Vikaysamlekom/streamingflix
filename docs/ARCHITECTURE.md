# Arsitektur StreamFlix

Dokumen ini menjelaskan arsitektur sistem, alur data, keputusan teknologi beserta alasannya,
tanggung jawab setiap lapisan, serta struktur folder proyek StreamFlix.

## 1. Ringkasan Sistem

StreamFlix adalah aplikasi streaming film **full-stack** yang terdiri dari tiga bagian utama:

| Bagian | Teknologi | Peran |
|---|---|---|
| Frontend | React 19 + Vite 6 + TypeScript 5.7 + Tailwind CSS v4 | SPA publik (tanpa login pengunjung) + Dashboard admin |
| Backend | Node.js >= 20 + Express 4 + TypeScript 5.7 | REST API berprefiks `/api` |
| Database | MySQL 8.x (InnoDB, utf8mb4_unicode_ci) | Penyimpanan data film, kategori, admin, sesi |

Prinsip utama:

- **Situs publik tanpa login pengunjung.** Fitur "Daftar Saya" dan "Lanjutkan Menonton"
  disimpan di `localStorage` browser, bukan di server.
- **Dashboard admin terpisah** dengan autentikasi berbasis sesi (session-based) dan proteksi CSRF.
- **Satu sumber migrasi** (`database/migrations/`) dengan runner di backend.
- **Amplop respons API yang konsisten** (envelope) untuk seluruh endpoint.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   Browser (Pengunjung)      │        │   Browser (Admin)            │
│   React SPA — situs publik  │        │   React SPA — /admin/*       │
│   localStorage: Daftar Saya │        │   Cookie sesi HttpOnly       │
│   localStorage: Progres     │        │   Header x-csrf-token         │
└───────────────┬─────────────┘        └───────────────┬──────────────┘
                │  HTTPS / JSON (credentials: include)  │
                └───────────────────┬───────────────────┘
                                    ▼
                     ┌──────────────────────────────┐
                     │   Express API  (/api)        │
                     │   Middleware → Routes →      │
                     │   Service → Repository       │
                     └───────────────┬──────────────┘
                                     │ mysql2/promise (connection pool)
                                     ▼
                     ┌──────────────────────────────┐
                     │   MySQL 8 (InnoDB, utf8mb4)  │
                     └──────────────────────────────┘
```

## 2. Alur Data (Data Flow)

### 2.1 Permintaan publik (contoh: membuka Beranda)

1. **Router frontend** (`react-router-dom`) mencocokkan rute `/` ke `HomePage`.
2. `HomePage` memanggil hook TanStack Query yang memanggil `publicApi.getHome()`.
3. `api client` (`frontend/src/services/api/client.ts`) melakukan `fetch` ke
   `${VITE_API_BASE_URL}/home` dengan `credentials: 'include'`.
4. Backend menerima request melalui rantai middleware: Helmet → CORS → body parser →
   logger → rate limiter → route.
5. `healthRouter`/`homeRouter` memanggil **service**, yang memanggil **repository**.
6. **Repository** menjalankan query parameterized (`?` placeholder) ke MySQL via pool `mysql2/promise`.
7. Backend membungkus hasil dalam amplop sukses `{ success, data, meta? }`.
8. Frontend menormalkan respons, menyimpannya di cache TanStack Query, dan merender komponen.

### 2.2 Permintaan admin yang mengubah data (contoh: publish film)

1. Admin sudah login; sesi tersimpan pada cookie `streamflix.sid` (HttpOnly) dan token CSRF
   ada di memory frontend.
2. Frontend memanggil `adminMoviesApi.updateStatus(id, 'published')` → `api.patch(...)`.
3. `api client` menambahkan header `x-csrf-token` (via `ensureCsrfToken()` jika belum ada).
4. Backend menjalankan rantai: `requireAdmin()` → `csrfProtect()` → `validateRequest()` → handler.
5. Service memvalidasi aturan bisnis, repository mengeksekusi `UPDATE` dalam transaksi bila perlu.
6. Respons sukses dikembalikan; cache TanStack Query di-invalidasi agar daftar ter-refresh.

### 2.3 Progres tontonan (tanpa server)

1. `WatchPage` memutar MP4 dari `videoUrl`.
2. Hook `useWatchProgress` menyimpan `{ positionSec, durationSec, updatedAt }` ke
   `localStorage` kunci `streamflix:watch-progress` setiap ±5 detik.
3. Jika `positionSec / durationSec >= 0.95`, entri dihapus (dianggap selesai).
4. Beranda membaca entri tersebut untuk menyusun baris "Lanjutkan Menonton" di sisi klien.

## 3. Keputusan Teknologi (Tech Decisions) & Rasional

### 3.1 Mengapa MySQL 8 + InnoDB + utf8mb4?

- **MySQL 8** adalah database relasional yang sudah dikenal, mudah dijalankan lewat XAMPP
  untuk pengembangan, dan tersedia sebagai layanan terkelola di produksi.
- **InnoDB** dipilih karena mendukung foreign key, transaksi, dan row-level locking —
  penting untuk integritas relasi film–kategori.
- **utf8mb4_unicode_ci** mendukung karakter penuh (termasuk emoji dan aksara non-Latin)
  dan pengurutan yang stabil. Konsisten di seluruh tabel.
- Proyek sengaja **tidak memakai Supabase/Firebase** agar kontrol penuh atas data dan
  tidak bergantung pada vendor BaaS.

### 3.2 Mengapa backend di-compile ke CommonJS?

- `backend/tsconfig.json` memakai `"module": "CommonJS"` dengan output ke `dist/`.
- Alasan:
  1. **Kompatibilitas ekosistem Express 4.** Sebagian besar paket middleware (mis.
     `express-mysql-session`, `cookie-parser`) ditulis sebagai CommonJS. Output CommonJS
     menghindari masalah interop ESM/CJS.
  2. **`require()` sederhana di runtime produksi.** `node dist/server.js` langsung jalan
     tanpa perlu loader ESM tambahan.
  3. **Mudah di-deploy** ke host Node mana pun tanpa konfigurasi tambahan.
- Untuk pengembangan, **`tsx watch`** dipakai agar TypeScript berjalan langsung tanpa build.

### 3.3 Mengapa TypeScript dengan `tsc` (bukan bundler)?

- Backend tidak perlu bundling; `tsc` menghasilkan output 1:1 yang mudah di-debug (`sourceMap: true`).
- `strict: true` menangkap kesalahan tipe lebih awal.
- Konfigurasi terpisah: `tsconfig.json` untuk type-check/test (`noEmit: true`) dan
  `tsconfig.build.json` untuk build produksi.

### 3.4 Mengapa Tailwind CSS v4?

- Tailwind v4 memakai direktif **`@theme`** di `frontend/src/index.css` sebagai satu sumber
  design token (warna, radius, font, shadow, animasi) yang otomatis menjadi utility class.
- Integrasi lewat plugin resmi **`@tailwindcss/vite`** (tanpa konfigurasi PostCSS terpisah).
- Hasilnya: tema gelap sinematik dengan aksen hijau yang konsisten dan bundle CSS minimal
  karena utility di-*purge* otomatis.

### 3.5 Mengapa bcryptjs (bukan Argon2)?

- **`bcryptjs`** adalah implementasi bcrypt murni JavaScript: tanpa dependensi native,
  sehingga tidak perlu compiler C++ saat `npm install` (penting untuk Windows/XAMPP dan CI).
- Algoritma bcrypt sudah mapan untuk hashing password admin; dengan salt rounds 10.
- Trade-off: Argon2id secara teori lebih kuat, tetapi memerlukan binding native yang
  menambah kerumitan build. Untuk kebutuhan dashboard admin internal, bcryptjs adalah
  pilihan seimbang antara keamanan dan kesederhanaan operasional.

### 3.6 Mengapa autentikasi berbasis sesi (session-based), bukan JWT?

- Admin hanya satu peran dan dashboard berada pada origin yang terkontrol, sehingga
  **cookie sesi HttpOnly** lebih aman dari menyimpan token di `localStorage` (yang rentan XSS).
- Sesi disimpan di tabel `sessions` (via `express-mysql-session`), sehingga logout instan
  dapat benar-benar menghapus sesi di server (tidak seperti JWT stateless).
- Pola **synchronizer token** untuk CSRF melengkapi cookie sesi.
- Cookie `HttpOnly`, `Secure` (otomatis di produksi), dan `SameSite` yang dapat dikonfigurasi
  memberi pertahanan berlapis.

### 3.7 Mengapa TanStack Query + React Router v7?

- **TanStack Query** menangani cache, refetch, dan status loading/error secara terpusat,
  mengurangi kode *boilerplate* di komponen.
- **React Router v7** menyediakan rute deklaratif untuk situs publik dan dashboard admin.

## 4. Tanggung Jawab Lapisan (Layer Responsibilities)

### 4.1 Frontend (`frontend/`)

| Lapisan | Folder | Tanggung jawab |
|---|---|---|
| Halaman | `src/pages/` | Komposisi halaman per rute (Home, Movies, Detail, Watch, Search, MyList, Admin, NotFound) |
| Fitur | `src/features/` | Logika domain di sisi klien: `home`, `my-list`, `watch-progress`, `video-player`, `admin` |
| Komponen | `src/components/` | Komponen presentasional: `ui/`, `movies/`, `feedback/` |
| Layanan API | `src/services/api/` | Klien HTTP, amplop respons, penyisipan CSRF, definisi endpoint |
| Utilitas | `src/utils/` | `cn` (gabung class), `storage` (localStorage aman), `format` |
| Tipe | `src/types/` | Kontrak tipe bersama yang selaras dengan backend |
| App | `src/app/` | Provider global (QueryClient, Router, Toast) dan definisi rute |

Aturan:

- Frontend **tidak** pernah menyimpan token/rahasia di `localStorage`.
- Validasi sisi klien memakai **Zod** dan hanya untuk UX; kebenaran data tetap ditegakkan di backend.
- Akses API selalu lewat `services/api`, tidak ada `fetch` liar di komponen.

### 4.2 Backend (`backend/`)

| Lapisan | Folder | Tanggung jawab |
|---|---|---|
| Config | `src/config/` | `env` (validasi env), `database` (pool), `session` (sesi + cookie) |
| Middleware | `src/middlewares/` | `require-admin`, `csrf`, `validate-request`, `error-handler`, `rate-limit`, `not-found` |
| Modul | `src/modules/` | Per-domain: `health`, `auth`, `movies`, `categories`, `settings`, `home`, `dashboard` |
| Utilitas | `src/utils/` | `slug`, `video-url`, `response`, `pagination`, `app-error`, `error-code`, `logger` |
| Tipe | `src/types/` | Augmentasi tipe (mis. `express-session`) |

Pola per modul: **routes → service → repository**.

- **Routes**: pemetaan endpoint, pemasangan middleware, tanpa logika bisnis.
- **Service**: aturan bisnis, orkestrasi, pemetaan DTO, melempar `AppError`.
- **Repository**: akses database murni, selalu **parameterized query** (`?`).

### 4.3 Database (`database/`)

| Berkas/Folder | Tanggung jawab |
|---|---|
| `migrations/*.sql` | **Sumber tunggal** migrasi (dibaca runner backend) |
| `schema.sql` | Gabungan importable (berisi `CREATE DATABASE` + `USE`) |
| `seeds/dev-demo.sql` | Data contoh **khusus development** |

## 5. Struktur Folder

```
streamflix/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/            # providers.tsx, router.tsx
│   │   ├── components/
│   │   │   ├── ui/         # Button, Input, Modal, Toast, dll.
│   │   │   ├── movies/     # Poster, PosterCard, WideCard, Top10Card, MovieRow
│   │   │   └── feedback/   # EmptyState, ErrorState
│   │   ├── features/
│   │   │   ├── home/       # hook & komposisi Beranda
│   │   │   ├── my-list/    # useMyList + schema Zod
│   │   │   ├── watch-progress/  # useWatchProgress + schema Zod
│   │   │   ├── video-player/    # pemutar MP4
│   │   │   └── admin/      # halaman & hook dashboard (movies, categories, settings)
│   │   ├── pages/          # halaman per rute
│   │   ├── services/api/   # client.ts (fetch) + index.ts (definisi endpoint)
│   │   ├── types/          # tipe bersama
│   │   ├── utils/          # cn, storage, format
│   │   ├── index.css       # design token @theme Tailwind v4
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig*.json
├── backend/
│   ├── src/
│   │   ├── config/         # env.ts, database.ts, session.ts
│   │   ├── middlewares/    # require-admin, csrf, validate-request, error-handler, ...
│   │   ├── modules/        # health, auth, movies, categories, settings, home, dashboard
│   │   ├── utils/          # slug, video-url, response, pagination, app-error, error-code, logger
│   │   ├── database/       # migrate.ts (runner migrasi)
│   │   ├── scripts/        # create-admin.ts, generate-schema.ts
│   │   ├── types/          # express-session.d.ts
│   │   ├── app.ts          # susunan Express (middleware + routes)
│   │   └── server.ts       # bootstrap & shutdown
│   ├── tests/              # unit/ & integration/
│   ├── tsconfig.json
│   └── tsconfig.build.json
├── database/
│   ├── migrations/         # 001..007 (SUMBER TUNGGAL)
│   ├── seeds/dev-demo.sql  # DEV ONLY
│   ├── schema.sql          # gabungan importable
│   └── README.md
├── docs/                   # dokumentasi (folder ini)
├── package.json            # workspace root (frontend + backend)
└── README.md
```

Root memakai **npm workspaces** (`frontend`, `backend`) sehingga `npm install` sekali di root
memasang seluruh dependensi, dan skrip root (mis. `npm run dev`) menjalankan keduanya.

## 6. Rute Frontend

### Publik (tanpa login)

| Rute | Halaman |
|---|---|
| `/` | HomePage |
| `/movies` | MoviesPage |
| `/movies/:slug` | MovieDetailPage |
| `/watch/:slug` | WatchPage |
| `/search` | SearchPage |
| `/my-list` | MyListPage |
| `*` | NotFoundPage (404) |

### Admin (memerlukan sesi)

| Rute | Halaman |
|---|---|
| `/admin/login` | LoginPage |
| `/admin/dashboard` | DashboardPage |
| `/admin/movies` | MoviesListPage |
| `/admin/movies/new` | MovieFormPage (buat) |
| `/admin/movies/:id/edit` | MovieFormPage (ubah) |
| `/admin/categories` | CategoriesPage |
| `/admin/settings` | SettingsPage |

## 7. Keamanan (Ringkas)

Lihat `docs/API.md`, `docs/FLOWCHART.md`, dan `docs/DEPLOYMENT.md` untuk detail.

- **Hashing password**: `bcryptjs` (salt rounds 10). Hash tidak pernah dikirim ke klien.
- **Sesi**: `express-session` + `express-mysql-session`, cookie `HttpOnly`; `Secure` otomatis di produksi.
- **CSRF**: pola synchronizer token; token di sesi, dikirim via header `x-csrf-token`, dibandingkan
  dengan `timingSafeEqual`.
- **Helmet**: header keamanan HTTP.
- **Rate limiting**: login ketat (8 / 15 menit), penulisan admin sedang, endpoint view per IP+film.
- **Query parameterized**: seluruh repository memakai placeholder `?` (anti SQL injection).
- **Allowlist sort**: nilai `sort` tidak pernah masuk SQL; dipetakan melalui `SORT_MAP`.
- **Validasi Zod**: body/query/params divalidasi sebelum handler.
- **Logging Pino dengan redaksi**: password, token, cookie, dan rahasia disensor.
- **Tanpa proxy SSRF**: backend hanya menyimpan & mengembalikan URL video, tidak pernah mengambilnya.
- **Validasi URL video**: wajib `https` di produksi; allowlist host opsional via `ALLOWED_VIDEO_HOSTS`.

## 8. Referensi Versi

| Perangkat | Versi |
|---|---|
| Node.js | >= 20 |
| MySQL | 8.x |
| React | 19 |
| Vite | 6 |
| TypeScript | 5.7 |
| Tailwind CSS | 4 |
| Express | 4 |

Dokumen terkait: [`DATABASE.md`](./DATABASE.md) · [`API.md`](./API.md) ·
[`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) · [`FLOWCHART.md`](./FLOWCHART.md) ·
[`ERROR-MAP.md`](./ERROR-MAP.md) · [`DEPLOYMENT.md`](./DEPLOYMENT.md) · [`TESTING.md`](./TESTING.md).
