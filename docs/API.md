# API StreamFlix

REST API StreamFlix berprefiks **`/api`**. Semua respons JSON memakai **amplop (envelope)**
yang konsisten. Autentikasi admin berbasis **sesi** (cookie) dan dilindungi **CSRF**.

- **Base URL (dev)**: `http://localhost:3000/api`
- **Base URL (produksi)**: `<domain-api>/api`
- **Format**: JSON (`Content-Type: application/json`)
- **Versi**: 1.0

## 1. Amplop Respons (Envelope)

### 1.1 Sukses

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

- `meta` bersifat opsional dan muncul pada endpoint terpaginasi.
- `data` dapat berupa objek, array, atau `undefined` (untuk `204 No Content`).

### 1.2 Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid pada data",
    "details": [{ "field": "title", "message": "Judul wajib diisi" }]
  }
}
```

- `details` hanya muncul pada `VALIDATION_ERROR`.

### 1.3 Kode Status HTTP

| Status | Arti |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### 1.4 Daftar Kode Error

`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `CSRF_INVALID`, `NOT_FOUND`, `CONFLICT`,
`SLUG_TAKEN`, `CATEGORY_IN_USE`, `INVALID_VIDEO_URL`, `VIDEO_HOST_NOT_ALLOWED`,
`INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `ACCOUNT_INACTIVE`, `INVALID_SORT`, `RATE_LIMITED`,
`BAD_REQUEST`, `INTERNAL_ERROR`, `DB_ERROR`.

## 2. Autentikasi & CSRF (Ringkas)

- **Login** membuat sesi (cookie `streamflix.sid`, HttpOnly) dan mengembalikan `csrfToken`.
- Semua endpoint admin memerlukan `requireAdmin()`.
- Endpoint admin yang **mengubah data** (POST/PUT/PATCH/DELETE) juga memerlukan header
  **`x-csrf-token`** yang nilainya sama dengan token pada sesi.
- Jika token belum ada, ambil lewat **`GET /api/auth/csrf-token`**.
- Klien menyertakan cookie dengan `credentials: 'include'`.

Contoh header admin untuk request tulis:

```
Cookie: streamflix.sid=<session-id>
x-csrf-token: <token-32-byte-hex>
Content-Type: application/json
```

## 3. Endpoint Publik

Endpoints publik **tidak** memerlukan autentikasi.

---

### GET `/api/health`

Cek kesehatan layanan & database.

- **Auth**: tidak
- **Params**: —

**Respons 200**

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

Jika database tidak sehat: `status: "degraded"`, `database: "disconnected"`.

---

### GET `/api/home`

Data beranda lengkap.

- **Auth**: tidak
- **Params**: —

**Respons 200**

```json
{
  "success": true,
  "data": {
    "hero": [
      {
        "id": 3,
        "title": "Ruang Tanpa Waktu",
        "slug": "ruang-tanpa-waktu",
        "posterUrl": null,
        "bannerUrl": null,
        "releaseYear": 2025,
        "durationMinutes": 145,
        "rating": 8.7,
        "ageRating": "17+",
        "viewCount": 21050,
        "publishedAt": "2026-01-10T00:00:00.000Z",
        "categories": [{ "id": 4, "name": "Fiksi Ilmiah", "slug": "fiksi-ilmiah" }]
      }
    ],
    "trending": [],
    "newReleases": [],
    "top10": [
      {
        "id": 3,
        "title": "Ruang Tanpa Waktu",
        "slug": "ruang-tanpa-waktu",
        "posterUrl": null,
        "bannerUrl": null,
        "releaseYear": 2025,
        "durationMinutes": 145,
        "rating": 8.7,
        "ageRating": "17+",
        "viewCount": 21050,
        "publishedAt": "2026-01-10T00:00:00.000Z",
        "categories": [],
        "rank": 1
      }
    ],
    "genreRows": [
      { "category": { "id": 1, "name": "Aksi", "slug": "aksi" }, "movies": [] }
    ]
  }
}
```

- `hero`: film unggulan untuk carousel.
- `trending`, `newReleases`: daftar ringkas.
- `top10`: `RankedMovie[]` dengan `rank` 1–10.
- `genreRows`: array `{ category, movies }`.

**Error**: `500 INTERNAL_ERROR`.

---

### GET `/api/movies`

Daftar film publik (terpaginasi, filter, urut).

- **Auth**: tidak

**Query params**

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `q` | string | — | Kata kunci (title/synopsis) |
| `category` | string | — | Slug kategori |
| `page` | number | 1 | Halaman (≥ 1) |
| `limit` | number | 20 | Per halaman (1–100) |
| `sort` | enum | `newest` | `newest`, `oldest`, `title`, `popular`, `rating` |

**Respons 200**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Jejak Sang Penjaga",
      "slug": "jejak-sang-penjaga",
      "posterUrl": null,
      "bannerUrl": null,
      "releaseYear": 2024,
      "durationMinutes": 118,
      "rating": 8.2,
      "ageRating": "13+",
      "viewCount": 15230,
      "publishedAt": "2026-01-10T00:00:00.000Z",
      "categories": [{ "id": 1, "name": "Aksi", "slug": "aksi" }]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

**Error**: `400 INVALID_SORT` (bila `sort` divalidasi ketat), `500 INTERNAL_ERROR`.

---

### GET `/api/movies/:slug`

Detail film (termasuk `videoUrl`).

- **Auth**: tidak

**Path params**: `slug` (string, 1–255)

**Respons 200**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Jejak Sang Penjaga",
    "slug": "jejak-sang-penjaga",
    "synopsis": "Seorang penjaga hutan menemukan rahasia lama...",
    "posterUrl": null,
    "bannerUrl": null,
    "videoUrl": "https://cdn.example.com/movies/jejak-sang-penjaga.mp4",
    "videoType": "mp4",
    "releaseYear": 2024,
    "durationMinutes": 118,
    "rating": 8.2,
    "ageRating": "13+",
    "viewCount": 15230,
    "status": "published",
    "isFeatured": true,
    "publishedAt": "2026-01-10T00:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-10T00:00:00.000Z",
    "categories": [{ "id": 1, "name": "Aksi", "slug": "aksi" }]
  }
}
```

**Error**: `404 NOT_FOUND` (tidak ada atau bukan `published`).

---

### GET `/api/movies/by-slugs`

Ringkasan banyak film sekaligus berdasarkan slug (dipakai halaman **Daftar Saya**
dan **Lanjutkan Menonton** agar tidak melakukan N+1 request).

- **Auth**: tidak
- **Path params**: —
- **Query params**:
  - `slugs` (wajib) — daftar slug dipisah koma, maksimal **100** slug. Slug yang
    tidak ditemukan / bukan `published` otomatis dilewati.

**Respons 200** — array `MovieSummary` tanpa `meta`, urut mengikuti urutan `slugs`
yang diminta:

```json
{
  "success": true,
  "data": [
    { "id": 2, "slug": "drama-hujan", "title": "Hujan di Bulan Juni" }
  ]
}
```

**Error**: `400 VALIDATION_ERROR` (format `slugs` tidak valid).

---

### POST `/api/movies/:slug/view`

Menambah `view_count`. Tanpa body. **Rate-limited** (per IP + film).

- **Auth**: tidak
- **CSRF**: tidak
- **Body**: —

**Respons 200**

```json
{ "success": true, "data": { "recorded": true } }
```

**Error**: `404 NOT_FOUND`, `429 RATE_LIMITED`.

---

### GET `/api/categories`

Daftar kategori beserta jumlah film.

- **Auth**: tidak

**Respons 200**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Aksi", "slug": "aksi", "movieCount": 3 },
    { "id": 2, "name": "Drama", "slug": "drama", "movieCount": 3 }
  ]
}
```

**Error**: `500 INTERNAL_ERROR`.

---

### GET `/api/categories/:slug/movies`

Daftar film dalam kategori (terpaginasi).

- **Auth**: tidak

**Path params**: `slug`
**Query params**: `page`, `limit`, `sort` (lihat `/api/movies`)

**Respons 200**: sama seperti `/api/movies` (array `MovieSummary` + `meta`).

**Error**: `404 NOT_FOUND` (kategori tidak ditemukan), `400 INVALID_SORT`.

---

### GET `/api/settings`

Subset pengaturan situs yang aman untuk publik (dipakai footer & pemutar hero).
Tidak memerlukan autentikasi.

- **Auth**: tidak

**Respons 200**

```json
{
  "success": true,
  "data": {
    "siteName": "StreamFlix",
    "tagline": "Streaming film tanpa ribet",
    "seoDescription": "...",
    "heroSlideLimit": 5,
    "social": {
      "facebook": "",
      "instagram": "",
      "twitter": "",
      "youtube": ""
    }
  }
}
```

**Error**: `500 INTERNAL_ERROR`.

> Catatan: field sosial bernilai string kosong bila belum diisi. Frontend hanya
> menampilkan ikon sosial yang URL-nya tidak kosong.

---

## 4. Endpoint Autentikasi

### POST `/api/auth/login`

Login admin. **Rate-limited** (8 percobaan / 15 menit).

- **Auth**: tidak
- **CSRF**: tidak (belum ada sesi)

**Body**

```json
{ "email": "admin@streamflix.test", "password": "rahasia123456" }
```

**Respons 200**

```json
{
  "success": true,
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@streamflix.test",
      "displayName": "Admin Utama",
      "role": "admin",
      "lastLoginAt": "2026-01-15T08:00:00.000Z"
    },
    "csrfToken": "a1b2c3...<64 hex chars>"
  }
}
```

**Error**:
- `401 INVALID_CREDENTIALS` — email/password salah (pesan generik).
- `403 ACCOUNT_INACTIVE` — akun nonaktif.
- `422 VALIDATION_ERROR` — body tidak valid.
- `429 RATE_LIMITED` — terlalu banyak percobaan.

---

### POST `/api/auth/logout`

Logout admin (menghancurkan sesi).

- **Auth**: sesi (cookie)
- **CSRF**: **wajib** (`x-csrf-token`)

**Respons 200**

```json
{ "success": true, "data": { "ok": true } }
```

**Error**: `403 CSRF_INVALID`.

---

### GET `/api/auth/me`

Info admin dari sesi.

- **Auth**: `requireAdmin`
- **CSRF**: tidak (GET)

**Respons 200**

```json
{
  "success": true,
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@streamflix.test",
      "displayName": "Admin Utama",
      "role": "admin",
      "lastLoginAt": "2026-01-15T08:00:00.000Z"
    }
  }
}
```

**Error**: `401 SESSION_EXPIRED`, `403 ACCOUNT_INACTIVE`, `403 FORBIDDEN`.

---

### GET `/api/auth/csrf-token`

Mengambil/membuat token CSRF untuk sesi berjalan.

- **Auth**: tidak (membuat sesi bila belum ada)
- **CSRF**: tidak

**Respons 200**

```json
{ "success": true, "data": { "csrfToken": "a1b2c3...<64 hex chars>" } }
```

---

### PUT `/api/admin/account/password`

Ganti password admin.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**

> Catatan: rute ini berada di bawah `authRouter` dan terpasang pada path `/admin/account/password`.

**Body**

```json
{ "currentPassword": "rahasiaLama123", "newPassword": "rahasiaBaru1234" }
```

`newPassword` minimal **12 karakter**.

**Respons 200**

```json
{ "success": true, "data": { "ok": true } }
```

**Error**:
- `401 INVALID_CREDENTIALS` — `currentPassword` salah.
- `422 VALIDATION_ERROR` — `newPassword` < 12 karakter atau sama dengan lama.
- `403 CSRF_INVALID`.
- `401 SESSION_EXPIRED`.

---

## 5. Endpoint Admin — Dashboard

### GET `/api/admin/dashboard/stats`

Statistik katalog.

- **Auth**: `requireAdmin`
- **CSRF**: tidak (GET)

**Respons 200**

```json
{
  "success": true,
  "data": {
    "totalMovies": 12,
    "publishedMovies": 11,
    "draftMovies": 1,
    "totalCategories": 8,
    "featuredMovies": 4,
    "totalViews": 90310,
    "recentlyUpdated": [],
    "topViewed": []
  }
}
```

**Error**: `401 SESSION_EXPIRED`, `403 FORBIDDEN`.

---

## 6. Endpoint Admin — Film

Semua endpoint berikut memerlukan `requireAdmin`. Request **tulis** memerlukan CSRF.

### GET `/api/admin/movies`

Daftar film (termasuk draft).

- **Auth**: `requireAdmin`

**Query params**

| Param | Tipe | Keterangan |
|---|---|---|
| `status` | enum | `draft` / `published` |
| `q` | string | Kata kunci |
| `category` | string | Slug kategori |
| `page` | number | Halaman |
| `limit` | number | Per halaman (1–100) |

**Respons 200**: array film + `meta` (seperti `/api/movies`).

**Error**: `401 SESSION_EXPIRED`, `403 FORBIDDEN`.

---

### POST `/api/admin/movies`

Membuat film.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**

**Body**

```json
{
  "title": "Film Baru",
  "slug": "film-baru",
  "synopsis": "Sinopsis singkat film baru.",
  "posterUrl": "https://cdn.example.com/poster.jpg",
  "bannerUrl": "https://cdn.example.com/banner.jpg",
  "videoUrl": "https://cdn.example.com/movies/film-baru.mp4",
  "releaseYear": 2025,
  "durationMinutes": 110,
  "rating": 7.5,
  "ageRating": "13+",
  "status": "draft",
  "isFeatured": false,
  "categoryIds": [1, 4]
}
```

Catatan validasi (Zod): `title` wajib (maks 255); `slug` opsional (format slug);
`videoUrl` wajib (maks 2048); `releaseYear` 1888–(tahun depan); `durationMinutes` 1–1440;
`rating` 0–10; `categoryIds` maks 30; `status` default `draft`; `isFeatured` default `false`.

**Respons 201**

```json
{
  "success": true,
  "data": {
    "id": 13,
    "title": "Film Baru",
    "slug": "film-baru",
    "categoryIds": [1, 4]
  }
}
```

**Error**:
- `422 VALIDATION_ERROR` (mis. `title` kosong).
- `422 INVALID_VIDEO_URL` / `422 VIDEO_HOST_NOT_ALLOWED` (URL video tidak sah).
- `409 SLUG_TAKEN` (slug duplikat).
- `403 CSRF_INVALID`, `401 SESSION_EXPIRED`.

---

### GET `/api/admin/movies/:id`

Detail film untuk admin (selalu lengkap, termasuk `categoryIds`).

- **Auth**: `requireAdmin`

**Respons 200**: objek `AdminMovieDto` (seperti detail publik + `categoryIds`, termasuk draft).

**Error**: `404 NOT_FOUND`, `401 SESSION_EXPIRED`.

---

### PUT `/api/admin/movies/:id`

Memperbarui film.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**
- **Body**: sama seperti `POST /api/admin/movies`

**Respons 200**: film yang diperbarui.

**Error**: `422 VALIDATION_ERROR`, `409 SLUG_TAKEN`, `404 NOT_FOUND`, `403 CSRF_INVALID`.

---

### PATCH `/api/admin/movies/:id/status`

Mengubah status publikasi.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**

**Body**

```json
{ "status": "published" }
```

**Respons 200**: film dengan status baru.

**Error**: `422 VALIDATION_ERROR` (status bukan `draft`/`published`), `404 NOT_FOUND`.

---

### DELETE `/api/admin/movies/:id`

Menghapus film (relasi kategori terhapus otomatis via CASCADE).

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**

**Respons 204** — tanpa body.

**Error**: `404 NOT_FOUND`, `403 CSRF_INVALID`.

---

## 7. Endpoint Admin — Kategori

### GET `/api/admin/categories`

Daftar kategori (dengan `movieCount`).

- **Auth**: `requireAdmin`

**Respons 200**

```json
{
  "success": true,
  "data": [{ "id": 1, "name": "Aksi", "slug": "aksi", "movieCount": 3 }]
}
```

---

### POST `/api/admin/categories`

Membuat kategori.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**

**Body**

```json
{ "name": "Thriller", "slug": "thriller" }
```

`slug` opsional (bila kosong, dibuat otomatis dari `name`).

**Respons 201**

```json
{ "success": true, "data": { "id": 9, "name": "Thriller", "slug": "thriller" } }
```

**Error**: `422 VALIDATION_ERROR`, `409 CONFLICT` / `409 SLUG_TAKEN`.

---

### PUT `/api/admin/categories/:id`

Memperbarui kategori.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**
- **Body**: `{ "name": "Thriller", "slug": "thriller" }`

**Respons 200**: kategori yang diperbarui.

**Error**: `422 VALIDATION_ERROR`, `409 CONFLICT`, `404 NOT_FOUND`.

---

### DELETE `/api/admin/categories/:id`

Menghapus kategori.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**

**Respons 204** — tanpa body.

**Error**: **`409 CATEGORY_IN_USE`** (kategori masih dipakai film; FK `ON DELETE RESTRICT`),
`404 NOT_FOUND`.

---

## 8. Endpoint Admin — Pengaturan Situs

### GET `/api/admin/settings`

Mengambil pengaturan situs + info sistem.

- **Auth**: `requireAdmin`

**Respons 200**

```json
{
  "success": true,
  "data": {
    "settings": {
      "siteName": "StreamFlix",
      "tagline": "Nonton film favoritmu kapan saja, di mana saja.",
      "seoDescription": "StreamFlix - platform streaming film...",
      "heroSlideLimit": 5,
      "socialFacebook": "",
      "socialInstagram": "",
      "socialTwitter": "",
      "socialYoutube": ""
    },
    "system": {
      "appVersion": "1.0.0",
      "databaseConnected": true,
      "allowedVideoHosts": []
    }
  }
}
```

---

### PUT `/api/admin/settings`

Memperbarui pengaturan situs.

- **Auth**: `requireAdmin`
- **CSRF**: **wajib**

**Body** (parsial diperbolehkan)

```json
{
  "siteName": "StreamFlix",
  "tagline": "Streaming tanpa batas.",
  "seoDescription": "Koleksi film terbaik.",
  "heroSlideLimit": 6,
  "socialFacebook": "https://facebook.com/streamflix",
  "socialInstagram": "",
  "socialTwitter": "",
  "socialYoutube": ""
}
```

**Respons 200**: `{ "success": true, "data": { ...settings } }`

**Error**: `422 VALIDATION_ERROR` (mis. `heroSlideLimit` bukan angka), `403 CSRF_INVALID`.

---

## 9. Contoh Alur Permintaan (cURL)

### Publik

```bash
curl -s http://localhost:3000/api/home
curl -s "http://localhost:3000/api/movies?sort=popular&page=1&limit=20"
curl -s http://localhost:3000/api/movies/jejak-sang-penjaga
curl -s -X POST http://localhost:3000/api/movies/jejak-sang-penjaga/view
```

### Admin (login → ambil CSRF → aksi)

```bash
# 1) Simpan cookie ke jar saat login
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@streamflix.test","password":"rahasia123456"}'

# 2) Ambil token CSRF (juga menulis sesi ke jar)
curl -s -b cookies.txt -c cookies.txt http://localhost:3000/api/auth/csrf-token

# 3) Aksi tulis dengan header CSRF
curl -s -b cookies.txt -X POST http://localhost:3000/api/admin/movies \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <TOKEN_DARI_LANGKAH_2>" \
  -d '{"title":"Film Baru","videoUrl":"https://cdn.example.com/m.mp4","status":"draft","categoryIds":[1]}'
```

> Pastikan URL video memenuhi aturan: `https` di produksi, panjang ≤ 2048, dan host (bila
> allowlist aktif) termasuk `ALLOWED_VIDEO_HOSTS`.

Dokumen terkait: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`FLOWCHART.md`](./FLOWCHART.md) ·
[`ERROR-MAP.md`](./ERROR-MAP.md).
