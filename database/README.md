# Database StreamFlix

Folder ini berisi skema, migrasi, dan data contoh (seed) untuk database StreamFlix.

- **DBMS**: MySQL 8.x
- **Engine**: InnoDB
- **Charset/Collation**: `utf8mb4` / `utf8mb4_unicode_ci`
- **Nama database**: `streamflix`

## Isi Folder

| Berkas/Folder | Deskripsi |
|---|---|
| `migrations/` | **Sumber tunggal (single source of truth)** migrasi, `001` s/d `007` |
| `schema.sql` | Gabungan seluruh migrasi, siap diimpor langsung (berisi `CREATE DATABASE` + `USE`) |
| `seeds/dev-demo.sql` | Data contoh **HANYA untuk development** |

> ⚠️ **Penting**: `migrations/` adalah sumber tunggal migrasi.
> `schema.sql` **harus selalu sinkron** dengannya. Bila menambah migrasi baru, perbarui juga
> `schema.sql` (dapat dibantu dengan `npm run db:generate-schema` dari folder `backend/`)
> agar keduanya konsisten.

---

## 1. Cara Import `schema.sql` ke XAMPP phpMyAdmin

`schema.sql` sudah memuat `CREATE DATABASE IF NOT EXISTS streamflix` dan `USE streamflix`,
jadi Anda **tidak perlu** membuat database manual terlebih dahulu.

1. **Jalankan XAMPP.** Buka XAMPP Control Panel → klik **Start** pada **Apache** dan **MySQL**.
2. **Buka phpMyAdmin.** Kunjungi <http://localhost/phpmyadmin>.
3. **Login** (default XAMPP: user `root`, password kosong).
4. **Tab Import.** Klik tab **Import** di bilah atas.
5. **Pilih berkas.** Klik **Choose File** → pilih `E:\streamflix\database\schema.sql`.
6. **Format**: pastikan terdeteksi **SQL**.
7. **Jalankan.** Klik **Go** / **Import**.
8. **Verifikasi.** Di panel kiri akan muncul database `streamflix` dengan tabel:
   `admins`, `categories`, `movie_categories`, `movies`, `schema_migrations`, `sessions`,
   `site_settings`.

### Jika ada masalah

| Gejala | Solusi |
|---|---|
| "Access denied" | Sesuaikan user/password saat login phpMyAdmin |
| "Table already exists" | Aman diabaikan (statement `IF NOT EXISTS`), atau drop tabel lalu impor ulang |
| "Specified key was too long" | Pastikan MySQL 8.x dan charset `utf8mb4` |
| Timeout | Naikkan `upload_max_filesize`/`post_max_size` PHP, atau pakai `npm run db:migrate` |

---

## 2. Menjalankan Migrasi (`npm run db:migrate`)

Cara yang **dianjurkan** karena terlacak (idempoten) melalui tabel `schema_migrations`.

**Prasyarat**: `backend/.env` terisi (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

```bash
# Dari akar proyek
npm run db:migrate

# Atau dari folder backend
cd backend
npm run db:migrate
```

- Runner: `backend/src/database/migrate.ts`.
- Runner membaca berkas di `database/migrations/` secara berurutan (001 → 007).
- Migrasi yang sudah dijalankan dicatat di `schema_migrations`, sehingga **tidak diulang**.
- Migrasi **tidak** mengisi data contoh.

Cek migrasi yang sudah diterapkan:

```sql
SELECT * FROM schema_migrations ORDER BY id;
```

---

## 3. Rincian Setiap Migrasi

| Berkas | Isi |
|---|---|
| `001_create_admins.sql` | Tabel `admins` — akun admin dashboard (`email` UNIQUE, `password_hash`, `role`, `is_active`, `last_login_at`) |
| `002_create_categories.sql` | Tabel `categories` — kategori/genre (`name` UNIQUE, `slug` UNIQUE) |
| `003_create_movies.sql` | Tabel `movies` — data film (`slug` UNIQUE, `video_url`, `status`, `is_featured`, `published_at`, dsb.) |
| `004_create_movie_categories.sql` | Tabel pivot `movie_categories` + FK: `movie_id` **ON DELETE CASCADE**, `category_id` **ON DELETE RESTRICT** |
| `005_create_site_settings.sql` | Tabel `site_settings` (key-value) + nilai default (`site_name`, `tagline`, `seo_description`, `hero_slide_limit`, social) |
| `006_create_indexes.sql` | Indeks `movies`: `(status, published_at)`, `(status, is_featured)`, `(status, view_count)`, `(updated_at)`, `(title)`, dan FULLTEXT `(title, synopsis)` |
| `007_create_sessions.sql` | Tabel `sessions` untuk `express-mysql-session` (`session_id`, `expires`, `data`) |

Detail skema lengkap: lihat [`../docs/DATABASE.md`](../docs/DATABASE.md) dan
[`../docs/ERD.md`](../docs/ERD.md).

---

## 4. Menjalankan Seed (`dev-demo.sql`) — DEV ONLY

`seeds/dev-demo.sql` berisi data contoh **fiktif/placeholder** (kategori, film, dan relasi).
Semua URL video pada seed memakai contoh `https://example.com/...` yang **bukan** sumber aktif.

> ⚠️ **JANGAN dijalankan di produksi.**

**Cara import (phpMyAdmin)**:

1. Buka <http://localhost/phpmyadmin>.
2. Pilih database `streamflix` di panel kiri.
3. Tab **Import** → pilih `E:\streamflix\database\seeds\dev-demo.sql` → **Go**.

**Catatan**:

- Seed **tidak** membuat akun admin. Buat admin dengan:

  ```bash
  npm run admin:create
  ```

- Semua `INSERT` memakai `ON DUPLICATE KEY UPDATE` sehingga relatif aman diulang.

---

## 5. Alur Setup Cepat (Development)

```bash
# 1) Import skema (phpMyAdmin) atau jalankan migrasi:
npm run db:migrate

# 2) (Opsional) Import seed demo via phpMyAdmin:
#    database/seeds/dev-demo.sql   (DEV ONLY)

# 3) Buat admin pertama:
npm run admin:create

# 4) Jalankan aplikasi:
npm run dev
```

---

## 6. Kebijakan Penghapusan (Ringkas)

- **Hapus film** → relasi `movie_categories` ikut terhapus (**CASCADE**).
- **Hapus kategori** yang masih dipakai film → **ditolak** (**RESTRICT**) dan API
  mengembalikan **HTTP 409 `CATEGORY_IN_USE`**.
- **Slug/email duplikat** → **HTTP 409 `SLUG_TAKEN`**.

Dokumen terkait: [`../docs/DATABASE.md`](../docs/DATABASE.md) ·
[`../docs/ERD.md`](../docs/ERD.md) · [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).
