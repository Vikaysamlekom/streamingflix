# Deployment — StreamFlix

Panduan langkah demi langkah men-deploy StreamFlix: database, backend, frontend, strategi
domain + HTTPS untuk cookie, keamanan produksi, dan checklist pasca-deploy.

> ⚠️ **Catatan**: Dokumen ini adalah **panduan**. Tidak ada deployment yang benar-benar
> dijalankan dalam pembuatan dokumentasi ini. Ganti semua nilai contoh dengan nilai milik Anda.

## 0. Ringkasan Arsitektur Produksi

| Komponen | Target hosting (contoh) | Catatan |
|---|---|---|
| Frontend (SPA) | Vercel / Netlify | Perlu SPA rewrite ke `index.html` |
| Backend (API) | Node host apa pun (VPS, Render, Railway, Fly.io) | Jalankan `node dist/server.js` |
| Database | MySQL 8 terkelola atau self-hosted | InnoDB, utf8mb4 |
| Domain | `app.domain` + `api.domain` (atau satu origin via reverse proxy) | Menentukan strategi cookie |

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

### 3.2 Build

```bash
npm run build:frontend
# atau dari frontend/
npm run build           # tsc -b && vite build → dist/
```

Hasil build statis (HTML/CSS/JS) siap di-upload ke CDN/host statis.

### 3.3 Deploy ke Vercel / Netlify

**Vercel**
- Import repo, set **Root Directory** ke `frontend/` (atau konfigurasikan workspace).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- Tambahkan **SPA rewrite**: semua rute diarahkan ke `index.html`.

**Netlify**
- **Build Command**: `npm run build`
- **Publish Directory**: `frontend/dist`
- Tambahkan file `_redirects` atau aturan rewrite.

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
