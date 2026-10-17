# Deployment — StreamFlix

Panduan langkah demi langkah men-deploy StreamFlix: database, backend, frontend, strategi
domain + HTTPS untuk cookie, keamanan produksi, dan checklist pasca-deploy.

> ⚠️ **Catatan**: Dokumen ini adalah **panduan**. Tidak ada deployment yang benar-benar
> dijalankan dalam pembuatan dokumentasi ini. Ganti semua nilai contoh dengan nilai milik Anda.

## 0. Ringkasan Arsitektur Produksi

| Komponen | Target hosting (contoh) | Catatan |
|---|---|---|
| Frontend (SPA) | Vercel service `web` (atau Netlify/host statis klasik) | SPA rewrite + cache aset di `vercel.json` root (`services.web`) |
| Backend (API) | Vercel service `api` (`framework: express`), atau host Node lain | Entry `backend/src/index.ts`; publik di `/api/*` via rewrite top-level |
| Database | MySQL 8 terkelola (mis. Aiven free tier) atau self-hosted | InnoDB, utf8mb4; layanan cloud umumnya mewajibkan TLS → `DB_SSL=1` |
| Domain | Satu domain (mode Services), atau `app.domain` + `api.domain` | Satu origin membuat cookie sederhana (§4 strategi 2 mode klasik) |

Versi acuan: **Node.js >= 20**, **MySQL 8.x**.

---

## 1. Database

### 1.1 Buat database

```sql
CREATE DATABASE streamflix
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 1.2 Buat user dengan hak minimum (least privilege)

Buat user khusus aplikasi — **jangan** memakai `root` di produksi.

```sql
CREATE USER 'streamflix_app'@'%' IDENTIFIED BY '<PASSWORD_KUAT>';
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, REFERENCES
  ON streamflix.* TO 'streamflix_app'@'%';
FLUSH PRIVILEGES;
```

> Jika migrasi dijalankan oleh akun terpisah, cukup berikan hak DDL (`CREATE`, `ALTER`,
> `INDEX`, `REFERENCES`) kepada akun migrasi, dan hak DML (`SELECT/INSERT/UPDATE/DELETE`)
> kepada akun runtime aplikasi.

### 1.3 Jalankan migrasi

Setelah `backend/.env` (atau variabel lingkungan) menunjuk ke database produksi:

```bash
npm run db:migrate
```

Sumber migrasi tunggal: `database/migrations/`. Runner mencatatnya di `schema_migrations`.

> Layanan MySQL cloud (mis. Aiven) umumnya **mewajibkan koneksi TLS**. Set `DB_SSL=1`
> di environment migrasi agar pool & koneksi bootstrap memakai TLS. Koneksi lokal
> XAMPP tidak menoleransi TLS — di dev biarkan `DB_SSL` kosong.

> Alternatif: impor `database/schema.sql` (berisi `CREATE DATABASE` + `USE`) melalui klien
> MySQL. Pastikan `schema.sql` **sinkron** dengan `migrations/`.

### 1.4 Buat admin pertama

```bash
npm run admin:create
```

Ikuti prompt untuk email & password. Password akan di-hash dengan bcryptjs.

### 1.5 (Opsional) Seed data demo

```bash
# Impor database/seeds/dev-demo.sql via klien MySQL
```

> ⚠️ **DEV ONLY.** Jangan menjalankan seed demo di produksi. Gunakan data nyata/berlisensi.

---

## 2. Backend

### 2.1 Variabel environment produksi

Setel pada panel hosting atau file `.env` (jangan di-commit ke repo):

| Variabel | Contoh / Catatan |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (atau sesuai host) |
| `FRONTEND_URL` | `https://app.domain` (untuk CORS) |
| `DB_HOST` | `db.internal` |
| `DB_PORT` | `3306` |
| `DB_NAME` | `streamflix` |
| `DB_USER` | `streamflix_app` |
| `DB_PASSWORD` | `<PASSWORD_KUAT>` |
| `DB_CONNECTION_LIMIT` | `10` (sesuaikan kapasitas DB) |
| `DB_SSL` | `1` bila host DB mewajibkan TLS (Aiven dll.); kosong/`0` untuk MySQL lokal |
| `SESSION_SECRET` | **acak, minimal 32 karakter** (wajib di produksi) |
| `SESSION_MAX_AGE_HOURS` | `8` |
| `COOKIE_SAMESITE` | `lax` / `strict` / `none` (lihat bagian 4) |
| `COOKIE_DOMAIN` | `.domain` (bila cross-subdomain) |
| `COOKIE_SECURE` | `true` (otomatis `true` bila `NODE_ENV=production`) |
| `ALLOWED_VIDEO_HOSTS` | `cdn.domain,*.video-domain` (opsional) |
| `TRUST_PROXY` | `1` bila di belakang reverse proxy/LB, jika tidak `0` |
| `LOG_LEVEL` | `info` (produksi) |

> Aturan validasi `backend/src/config/env.ts`:
> - `SESSION_SECRET` **minimal 32 karakter** di produksi (minimal 16 di non-produksi).
> - `COOKIE_SAMESITE=none` **mewajibkan** `COOKIE_SECURE=true` di produksi.
> Bila aturan ini dilanggar, proses akan berhenti saat startup dengan pesan jelas.

Buat `SESSION_SECRET` yang kuat:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2.2 Build backend

```bash
# Dari akar
npm run build:backend
# atau dari backend/
npm run build          # tsc -p tsconfig.build.json → dist/
```

Output: `backend/dist/server.js` (CommonJS).

### 2.3 Jalankan

```bash
node dist/server.js
# atau
npm run start
```

Aplikasi berjalan di `http://<host>:<PORT>`. Pastikan proses dikelola process manager
(mis. `systemd`, PM2, atau supervisor platform) agar restart otomatis.

### 2.4 Health check

```bash
curl -s https://api.domain/api/health
```

Respons sehat:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "database": "connected",
    "uptime": 1234,
    "timestamp": "2026-01-15T08:00:00.000Z"
  }
}
```

Gunakan endpoint ini untuk liveness/readiness probe. Bila `database: "disconnected"`,
periksa koneksi DB.

### 2.5 `TRUST_PROXY`

- Bila backend berada di belakang reverse proxy / load balancer / CDN (umum di produksi),
  set `TRUST_PROXY=1` agar Express mempercayai header `X-Forwarded-*` (penting untuk
  **IP rate limiting** dan cookie `Secure`).
- Bila backend diekspos langsung tanpa proxy, biarkan `0`.
- Jangan set ke nilai yang terlalu permisif tanpa memahami topologi Anda.

### 2.6 CORS

- `FRONTEND_URL` dipakai untuk mengizinkan origin frontend.
- Klien mengirim cookie → server harus mengizinkan **credentials** (cookie) untuk origin
  frontend. Pastikan hanya origin frontend yang diizinkan (bukan `*`, karena `*` tidak
  kompatibel dengan credential).
- Bila frontend dan backend berada di **satu origin** (via reverse proxy), CORS nyaris tidak
  menjadi masalah dan pengaturan cookie menjadi lebih sederhana (lihat bagian 4).

### 2.7 Cookie (konfigurasi sesi)

Sesi admin memakai cookie `streamflix.sid`:

- `httpOnly: true` (tidak dapat diakses JavaScript).
- `secure`: otomatis `true` di produksi (atau via `COOKIE_SECURE=true`).
- `sameSite`: sesuai deployment.
- `domain`: opsional (`COOKIE_DOMAIN`).
- `maxAge`: dari `SESSION_MAX_AGE_HOURS`.

---

## 3. Frontend

### 3.1 Variabel environment

| Variabel | Contoh |
|---|---|
| `VITE_API_BASE_URL` | `https://api.domain/api` |

> Nilai `VITE_*` di-*bake* saat build. Set sebelum menjalankan `vite build`.
>
> Default build produksi (`frontend/.env.production`): `VITE_API_BASE_URL=/api` —
> same-origin, pas untuk mode Services (satu domain). Bila frontend & API dipisah domain,
> set env project pada Vercel untuk menimpanya.

### 3.2 Build

```bash
npm run build:frontend
# atau dari frontend/
npm run build           # tsc -b && vite build → dist/
```

Hasil build statis (HTML/CSS/JS) siap di-upload ke CDN/host statis.

### 3.3 Deploy ke Vercel — mode Services (konfigurasi repo ini)

Repo ini memakai **satu project dengan dua service**, dikonfigurasi `vercel.json` di root:

- `api` — folder `backend/`, `framework: "express"`; publik di `/api/*` lewat rewrite
  top-level `{ "source": "/api/(.*)", "destination": { "service": "api" } }`. Entry
  tetap `src/index.ts` (default-export app; zero-config Express). Env produksi (§2.1)
  diset di level **project**; `PORT` tidak perlu; `TRUST_PROXY=1` wajib (di balik proxy).
- `web` — folder `frontend/`, `framework: "vite"`; publik di `/(.*)`. Fallback SPA
  (`/(.*) → /index.html`) dan cache aset `assets/` didefinisikan **di dalam service**,
  karena routing ke sebuah service bersifat final (tidak ada jatuh-balik ke service lain).
- Binding cadangan `web → api` (`API_URL`, internal) dideklarasikan di service `web`.
  Saat ini web statis dan tidak punya kode server-side, jadi `API_URL` belum dibaca siapa
  pun dan browser tetap memanggil `/api` same-origin; bila kelak `web` mendapat runtime
  server-side, bacalah `process.env.API_URL` untuk memanggil API secara internal.

Cara deploy: `vercel link` di root repo → set env project (lihat §9.4) → `vercel --prod`.
`vercel dev` menjalankan kedua service secara lokal bersamaan untuk uji coba; pengembangan
harian tetap `npm run dev` + XAMPP (§dev flow lokal tidak berubah).

**Netlify / deployment klasik (alternatif non-services)**
- Frontend: build `npm run build`, publish `frontend/dist`, SPA rewrite (§3.4).
- Backend: deploy `backend/` sebagai project terpisah (zero-config Express, tanpa folder
  `api/`), atau host Node lain (§2.3) — sesuai §9 versi sebelumnya / prinsip §2–§4.

### 3.4 SPA Rewrite (WAJIB)

Karena routing dilakukan di sisi klien (`react-router-dom`), server harus mengembalikan
`index.html` untuk semua rute yang bukan aset statis — jika tidak, refresh pada `/movies/foo`
akan menghasilkan 404.

Contoh `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

> Mode **Services**: aturan ini sudah hidup di `vercel.json` root, bagian
> `services.web.rewrites` + `headers` (file `frontend/vercel.json` sudah dihapus).
> Snippet di atas tetap berlaku bila frontend di-deploy sebagai project standalone yang
> terpisah dari API (deployment klasik).
```

Contoh `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 4. Strategi Domain + HTTPS untuk Cookie

Cookie sesi memerlukan HTTPS di produksi. Pilih salah satu strategi berikut, dari yang paling
disarankan:

### Strategi 1 (Disarankan) — Subdomain dengan SameSite=Lax

- Frontend: `https://app.domain`
- Backend: `https://api.domain`
- Set:
  - `COOKIE_DOMAIN=.domain`
  - `COOKIE_SAMESITE=lax`
  - `COOKIE_SECURE=true`
- `app.domain` dan `api.domain` berbagi domain induk sehingga cookie dapat dibagikan.

### Strategi 2 (Paling aman untuk cookie) — Satu origin via reverse proxy

- Sajikan API di bawah domain yang sama, mis. `https://domain/api` → proxy ke backend.
- Cookie menjadi first-party sepenuhnya; `SameSite=Lax` cukup.
- Tidak perlu `COOKIE_DOMAIN` (biarkan kosong). CORS minimal.
- Contoh: Nginx/Caddy meneruskan `/api/*` ke service backend.

### Strategi 3 (Pilihan terakhir) — Cross-site SameSite=None

- Gunakan hanya bila frontend dan backend benar-benar lintas situs (berbeda domain induk).
- Set:
  - `COOKIE_SAMESITE=none`
  - `COOKIE_SECURE=true` (**wajib** — divalidasi saat startup)
- Banyak browser membatasi cookie pihak ketiga; prioritaskan Strategi 1 atau 2.

**HTTPS**: gunakan sertifikat TLS (Let's Encrypt / penyedia hosting). Redirect semua HTTP ke
HTTPS dan aktifkan HSTS (Helmet sudah memasang header keamanan).

---

## 5. Keamanan Produksi

1. **Rotasi `SESSION_SECRET`**: gunakan nilai acak 48+ byte; rotasi berkala dan rahasiakan.
   Rotasi akan membuat semua sesi lama tidak valid (semua admin harus login ulang).
2. **Jangan pakai `root` DB**: gunakan user hak minimum (bagian 1.2).
3. **Batasi jaringan**: batasi akses database hanya dari backend (security group/firewall).
   Jangan ekspos port MySQL ke publik.
4. **Backup rutin**: jadwalkan backup harian MySQL (`mysqldump`) + uji restore berkala.
5. **Monitoring log**: kumpulkan log Pino terstruktur; pantau `500`, lonjakan `429`, dan
   `401/403` yang mencurigakan. Pastikan redaksi log aktif (password/token disensor).
6. **Rate limiting**: pastikan `TRUST_PROXY` benar agar limit per IP akurat.
7. **Helmet & HTTPS**: aktifkan HSTS; pastikan `COOKIE_SECURE=true`.
8. **Validasi URL video**: di produksi wajib `https`; manfaatkan `ALLOWED_VIDEO_HOSTS`
   untuk membatasi domain video (`*.domain` didukung).
9. **Akun admin**: buat hanya seperlunya; nonaktifkan (`is_active = 0`) akun yang tidak dipakai.
10. **Dependabot/audit**: jalankan `npm audit` berkala dan perbarui dependensi.
11. **Tidak ada proxy SSRF**: backend tidak pernah mengambil URL dari pengguna — pertahankan
    perilaku ini.
12. **CORS ketat**: hanya origin frontend yang diizinkan; jangan gunakan `*` dengan credential.

---

## 6. Migrasi & Rilis (Rollout)

1. Backup database sebelum migrasi skema.
2. Jalankan `npm run db:migrate` (migrasi idempoten, tercatat di `schema_migrations`).
3. Deploy backend baru (`npm run build` → `node dist/server.js`).
4. Deploy frontend baru (build statis + rewrite).
5. Verifikasi `/api/health` dan alur login admin.

> Untuk perubahan skema besar, lakukan uji di staging terlebih dahulu.

---

## 7. Checklist Pasca-Deploy

- [ ] `GET /api/health` mengembalikan `status: "ok"` dan `database: "connected"`.
- [ ] Frontend dapat dimuat di `https://app.domain` dan refresh rute dalam (mis. `/movies/x`)
      **tidak** menghasilkan 404 (SPA rewrite benar).
- [ ] Frontend dapat memanggil API (`VITE_API_BASE_URL` benar, tanpa error CORS).
- [ ] Login admin berhasil; cookie `streamflix.sid` terpasang (`HttpOnly`, `Secure`).
- [ ] Aksi tulis admin (buat film) berhasil dengan CSRF (tidak `403 CSRF_INVALID`).
- [ ] `PUT /api/admin/account/password` berfungsi (uji ganti password).
- [ ] Hapus kategori yang masih dipakai → `409 CATEGORY_IN_USE` (sesuai harapan).
- [ ] Film `published` tampil di Beranda/katalog; film `draft` **tidak** tampil.
- [ ] Pemutaran video memakai `https` dan host diizinkan (bila allowlist aktif).
- [ ] `TRUST_PROXY` sesuai topologi; rate limit menghitung IP dengan benar.
- [ ] `SESSION_SECRET` kuat & tidak ada di repo; `.env` tidak ter-commit.
- [ ] Backup database terjadwal; prosedur restore diuji.
- [ ] Log terpantau; tidak ada kebocoran rahasia pada log.
- [ ] Seed demo **tidak** dijalankan di produksi.

---

## 8. Referensi Perintah Build/Run

```bash
# Build semua (frontend + backend)
npm run build

# Build terpisah
npm run build:frontend
npm run build:backend

# Jalankan backend produksi
npm run start

# Migrasi database
npm run db:migrate

# Buat admin
npm run admin:create
```

Dokumen terkait: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DATABASE.md`](./DATABASE.md) ·
[`API.md`](./API.md) · [`TESTING.md`](./TESTING.md).

---

## 9. Resep Deployment Gratis: Vercel + Aiven MySQL

Resep lengkap dengan layanan **gratis** (limit terverifikasi 2026):

| Layanan | Peran | Limit gratis |
|---|---|---|
| **Vercel — satu project mode Services** | `frontend` + `backend` dari `vercel.json` root, satu domain bersama | 100 GB transfer/bulan, 1 juta request CDN/m |
| **Aiven for MySQL (free)** | Database produksi | 1 GB storage, 1 GB RAM, 1 node, tanpa kartu kredit |
| **Video** (tetap di luar) | URL langsung ke file mp4 | Disarankan Cloudflare R2 (10 GB, egress Rp0) |

> ⚠️ Video **tidak boleh dihosting di Vercel** — 100 GB transfer/bulan akan habis cepat oleh
> streaming. Film diunduh browser dari S3-compatible/news-egress host seperti R2; admin hanya
> menyimpan URL.

### 9.1 Akun & pra-siapa

1. Daftar [vercel.com](https://vercel.com) (gratis) dan [aiven.io](https://aiven.io) (gratis).
2. Windows: `npm i -g vercel` lalu `vercel login` (buka browser untuk OAuth).
3. Satu URL: pilih **nama project yang unik** karena domain produksi Vercel =
   `<nama-project>.vercel.app`, misal `streamflix` → `https://streamflix.vercel.app`.
   Dalam mode Services, **situs dan API berbagi domain ini** (API dilayani di jalur
   `/api/*`) — tidak ada dua URL lagi.
   - Bila nama alias sudah dipakai orang lain, Vercel menggunakan URL berbeda — perbaiki
     `FRONTEND_URL` sesuai URL asli & deploy ulang (lihat §9.7).
   - Deployment **preview** (per-PR) memakai domain unik sendiri → `FRONTEND_URL` produksi
     tidak akan cocok; set env tambahan untuk Preview bila Anda aktif memakai preview.

### 9.2 Aiven MySQL

1. Di Aiven console: **Create service → MySQL**, paket **Free**, region default, lalu aktifkan.
2. Tunggu service `RUNNING`. Salin dari tab **Overview**: `Host`, `Port` (biasanya bukan 3306),
   `User` (`avnadmin`), `Password`, `Database` (`defaultdb`).
3. Catat: limit `max_connections` = **76** pada free tier → jaga `DB_CONNECTION_LIMIT` ≤ 5.

### 9.3 Isi database dari laptop (migrasi + admin pertama)

Jalankan di `E:\streamflix\backend`. Ubah hanya `DB_*` (`DB_SSL=1` wajib untuk Aiven) —
`SESSION_SECRET` tetap dari `backend/.env` lokal (dotenv tidak menimpa env yang sudah diset):

```powershell
cd E:\streamflix\backend
$env:DB_HOST='<host-aiven>'; $env:DB_PORT='<port-aiven>'
$env:DB_NAME='defaultdb'; $env:DB_USER='<user-aiven>'; $env:DB_PASSWORD='<pass-aiven>'
$env:DB_SSL=1; $env:DB_CONNECTION_LIMIT=5
npm run db:migrate
npm run admin:create
```

> Migrasi **tidak** membuat akun admin — `npm run admin:create` wajib dijalankan. Dan jangan
> pernah impor ulang `schema.sql` ke database ini (mengosongkan tabel admin/film).

### 9.4 Deploy project (Vercel)

1. Set environment variables project via Dashboard → **Settings → Environment Variables**
   (Environment = **Production**). Berlaku lintas service:

| Variabel | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://streamflix.vercel.app` — **domain production yang sama** (satu origin); tanpa trailing slash |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | dari Aiven |
| `DB_SSL` | `1` |
| `DB_CONNECTION_LIMIT` | `5` |
| `SESSION_SECRET` | hex acak 64+ karakter (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `COOKIE_SAMESITE` | `lax` — cukup karena browser & API berada di origin yang sama (§4 Strategi 2) |
| `COOKIE_SECURE` | opsional — otomatis `true` di produksi; eksplisit `true` hanya bila memakai `COOKIE_SAMESITE=none` |
| `TRUST_PROXY` | `1` |
| `ALLOWED_VIDEO_HOSTS` | kosong, atau `pub-xxxx.r2.dev` dst. |

2. Deploy dari **root repo** (`E:\streamflix`): `vercel link --project streamflix`, lalu
   `vercel --prod`. Satu perintah membangun kedua service sesuai `vercel.json` (frontend
   Vite + backend Express sebagai fungsi Fluid). `VITE_API_BASE_URL` tidak perlu diset —
   `frontend/.env.production` sudah memakai default same-origin `/api`.
3. Uji: `curl.exe -s https://streamflix.vercel.app/api/health` → `database: "connected"`.
4. Bila gagal, cek log: `vercel logs --prod` (penyebab umum: env salah/`DB_SSL` lupa).

> `FRONTEND_URL` menentukan CORS & CSRF: karena satu origin, nilai ini = domain deployment
> sendiri. Bila nanti Anda memisahkan API ke domain lain, nilai berubah jadi domain frontend
> dan `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` menjadi wajib (lihat §4).

### 9.6 Uji end-to-end

- [ ] `https://streamflix.vercel.app` terbuka; refresh dalam rute misal `/movie/<slug>`
      tidak menghasilkan 404 (fallback SPA di `services.web.rewrites`).
- [ ] Beranda memuat film published dari DB Aiven (API dilayani `/api/*` di domain sama).
- [ ] Login admin di halaman `/admin/login` (kredensial dari §9.3) berhasil.
- [ ] Tambah film dengan URL **direct-link mp4** (mis. dari Cloudflare R2 — lihat catatan
      di atas) → tampil dan dapat diputar.
- [ ] Berpindah halaman tidak memunculkan error CORS / 403 CSRF.

### 9.7 Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Function error saat boot | env hilang/invalid (fail-fast zod) | `vercel logs --prod`; bandingkan dengan daftar §9.4 |
| `ECONNREFUSED` / `Handshake` error | `DB_SSL` tidak diset milik Aiven, host/port salah | `DB_SSL=1`, cek port khusus Aiven (bukan 3306) |
| Login gagal / tidak ada cookie | `FRONTEND_URL` ≠ domain deployment | samakan `FRONTEND_URL` dengan URL produksi sebenarnya (tanpa trailing slash) |
| `403 CSRF_INVALID` | Origin dari frontend tidak diizinkan | `FRONTEND_URL` harus domain production yang digunakan browser (bukan URL preview) |
| Semua 404 di API | service `api` tidak terbentuk | cek `services.api.framework: "express"` di `vercel.json` root; pastikan `backend/src/index.ts` mengekspor app sebagai default |
| Semua 404 refresh frontend | fallback SPA tidak aktif | cek `services.web.rewrites` di `vercel.json` root (bukan file `frontend/vercel.json` — sudah dihapus) |
| Database "auto sleep" | Aiven free mematikan service lama tanpa tindakan | aktifkan via Aiven console (notifikasi dikirim lewat email) |

### 9.8 Catatan gratis-tier

- **Aiven**: service beroperasi selamanya gratis, tetapi dimatikan setelah jangka waktu
  tidak ada aktivitas (pemberitahuan email); tidak ada HA, dukungan hanya via dokumen.
- **Vercel Hobby**: transfer 100 GB/bulan (CDN); kurangi risiko memakai cache aset immutabel
  yang diatur di `services.web.headers` (`vercel.json` root); rate-limit login berbasis
  memori per instance — batas 5 percobaan per jendela 15 menit berlaku per instance
  (lebih longgar di produksi).
- **Region**: fluid function default `iad1` (US). Latensi ke Indonesia ±200 ms per request —
  masih nyaman untuk API standar; region khusus tersedia di paket kelas atas.
