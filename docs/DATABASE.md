# Database StreamFlix

Dokumen ini menjelaskan skema database MySQL 8, indeks, kebijakan penghapusan (delete policy),
sistem migrasi, cara menjalankan migrasi, dan cara mengimpor `schema.sql` ke XAMPP phpMyAdmin.

- **DBMS**: MySQL 8.x
- **Storage engine**: InnoDB
- **Charset/Collation**: `utf8mb4` / `utf8mb4_unicode_ci`
- **Nama database**: `streamflix`

## 1. Daftar Tabel

| Tabel | Fungsi |
|---|---|
| `schema_migrations` | Mencatat migrasi yang sudah dijalankan (idempotensi runner) |
| `admins` | Akun admin dashboard (autentikasi) |
| `categories` | Kategori/genre film |
| `movies` | Data film |
| `movie_categories` | Relasi banyak-ke-banyak film ↔ kategori |
| `site_settings` | Pengaturan situs berbentuk key-value |
| `sessions` | Session store `express-mysql-session` |

## 2. Detail Tabel

### 2.1 `schema_migrations`

Mencatat setiap migrasi yang berhasil diterapkan. Runner migrasi memeriksa tabel ini agar
migrasi tidak dijalankan dua kali.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | INT UNSIGNED | PK, AUTO_INCREMENT | Identitas baris |
| `migration` | VARCHAR(255) | NOT NULL, UNIQUE (`uq_schema_migrations_migration`) | Nama berkas migrasi |
| `applied_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Waktu penerapan |

### 2.2 `admins`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Identitas admin |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE (`uq_admins_email`) | Selalu disimpan lowercase |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash bcryptjs (tidak pernah plaintext) |
| `display_name` | VARCHAR(120) | NULL | Nama tampilan |
| `role` | ENUM('admin') | NOT NULL, DEFAULT 'admin' | Peran (saat ini hanya `admin`) |
| `is_active` | TINYINT(1) | NOT NULL, DEFAULT 1 | 1 = aktif, 0 = nonaktif |
| `last_login_at` | TIMESTAMP | NULL | Waktu login terakhir |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Dibuat |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Diubah |

Catatan: `admins` berdiri sendiri (standalone) untuk keperluan autentikasi; tidak memiliki relasi FK.

### 2.3 `categories`

Istilah "kategori" dan "genre" merujuk tabel yang sama.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Identitas kategori |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE (`uq_categories_name`) | Nama kategori |
| `slug` | VARCHAR(120) | NOT NULL, UNIQUE (`uq_categories_slug`) | Slug URL |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Dibuat |

### 2.4 `movies`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Identitas film |
| `title` | VARCHAR(255) | NOT NULL | Judul |
| `slug` | VARCHAR(255) | NOT NULL, UNIQUE (`uq_movies_slug`) | Slug URL unik |
| `synopsis` | TEXT | NULL | Sinopsis |
| `poster_url` | VARCHAR(2048) | NULL | URL poster |
| `banner_url` | VARCHAR(2048) | NULL | URL banner |
| `video_url` | VARCHAR(2048) | NOT NULL | URL video MP4 |
| `video_type` | ENUM('mp4') | NOT NULL, DEFAULT 'mp4' | Jenis video |
| `release_year` | SMALLINT UNSIGNED | NULL | Tahun rilis |
| `duration_minutes` | SMALLINT UNSIGNED | NULL | Durasi (menit) |
| `rating` | DECIMAL(3,1) | NULL | Rating 0.0–10.0 |
| `age_rating` | VARCHAR(10) | NULL | Batas usia (mis. SU, 13+, 17+) |
| `view_count` | INT UNSIGNED | NOT NULL, DEFAULT 0 | Jumlah tontonan |
| `status` | ENUM('draft','published') | NOT NULL, DEFAULT 'draft' | Status publikasi |
| `is_featured` | TINYINT(1) | NOT NULL, DEFAULT 0 | 1 = film unggulan |
| `published_at` | TIMESTAMP | NULL | Waktu publikasi |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Dibuat |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Diubah |

### 2.5 `movie_categories`

Tabel pivot banyak-ke-banyak.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `movie_id` | BIGINT UNSIGNED | PK (komposit), FK → `movies.id` | Bagian dari PK |
| `category_id` | BIGINT UNSIGNED | PK (komposit), FK → `categories.id` | Bagian dari PK |

Foreign key:

| Nama | Kolom | Referensi | ON DELETE | ON UPDATE |
|---|---|---|---|---|
| `fk_mc_movie` | `movie_id` | `movies(id)` | **CASCADE** | CASCADE |
| `fk_mc_category` | `category_id` | `categories(id)` | **RESTRICT** | CASCADE |

### 2.6 `site_settings`

Pengaturan key-value. Kunci yang dikenal:

| Key | Deskripsi |
|---|---|
| `site_name` | Nama situs |
| `tagline` | Tagline situs |
| `seo_description` | Deskripsi SEO |
| `hero_slide_limit` | Jumlah maksimum slide hero |
| `social_facebook` | URL Facebook |
| `social_instagram` | URL Instagram |
| `social_twitter` | URL Twitter/X |
| `social_youtube` | URL YouTube |

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `key` | VARCHAR(100) | PK | Nama pengaturan |
| `value` | TEXT | NULL | Nilai |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Diubah |

### 2.7 `sessions`

Session store untuk `express-mysql-session` (dibuat oleh migrasi 007, runner memakai
`createDatabaseTable: false`).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `session_id` | VARCHAR(128) | PK | ID sesi |
| `expires` | INT UNSIGNED | NOT NULL | Unix timestamp kedaluwarsa |
| `data` | MEDIUMTEXT | NULL | Data sesi terserialisasi |

## 3. Indeks

Selain PK/UNIQUE, `movies` memiliki indeks untuk mempercepat query umum:

| Nama indeks | Kolom | Tujuan |
|---|---|---|
| `idx_movies_status_published_at` | (`status`, `published_at`) | Daftar terbaru (published) |
| `idx_movies_status_featured` | (`status`, `is_featured`) | Film unggulan |
| `idx_movies_status_view_count` | (`status`, `view_count`) | Trending/popular |
| `idx_movies_updated_at` | (`updated_at`) | Baru diubah (dashboard admin) |
| `idx_movies_title` | (`title`) | Pencarian judul/urutan |
| `ft_movies_title_synopsis` | FULLTEXT (`title`, `synopsis`) | Pencarian teks (`MATCH ... AGAINST`) |

Pada `movie_categories` terdapat `idx_movie_categories_category_id` (`category_id`) untuk
mempercepat pencarian film berdasarkan kategori (FK tidak otomatis membuat indeks untuk arah ini).

Pada `sessions` terdapat `idx_sessions_expires` (`expires`) untuk pembersihan sesi kedaluwarsa.

## 4. Kebijakan Penghapusan (Delete Policies)

### 4.1 Menghapus film → CASCADE

`movie_categories.movie_id` memakai `ON DELETE CASCADE`. Menghapus baris di `movies`
otomatis menghapus seluruh baris relasi di `movie_categories`.

- Efek: film terhapus bersih tanpa menyisakan relasi menggantung.
- Implementasi: operasi `DELETE FROM movies WHERE id = ?`; MySQL menangani pembersihan relasi.

### 4.2 Menghapus kategori → RESTRICT → HTTP 409

`movie_categories.category_id` memakai `ON DELETE RESTRICT`. Kategori yang masih dipakai
satu film pun **tidak dapat dihapus**.

- Jika admin mencoba menghapus kategori yang masih terpakai, MySQL melempar error foreign key
  (errno 1451). Backend mengubahnya menjadi respons:

  ```json
  {
    "success": false,
    "error": {
      "code": "CATEGORY_IN_USE",
      "message": "Kategori masih dipakai oleh beberapa film"
    }
  }
  ```

  dengan **HTTP 409 Conflict**.

- Handler error memetakan errno 1451/1452 → `409 CATEGORY_IN_USE`
  (lihat `backend/src/middlewares/error-handler.ts`).
- Alur aman bagi admin: lepaskan kategori dari semua film terlebih dahulu, lalu hapus kategori.

### 4.3 Duplikasi slug → HTTP 409 SLUG_TAKEN

Jika `INSERT`/`UPDATE` melanggar UNIQUE (`movies.slug`, `categories.slug`/`name`,
`admins.email`), MySQL melempar errno 1062. Handler memetakannya menjadi:

```json
{ "success": false, "error": { "code": "SLUG_TAKEN", "message": "Slug sudah digunakan oleh film lain" } }
```

> Catatan: karena `admins.email` dan `categories.name` juga UNIQUE, bentrok pada kolom tersebut
> saat ini juga dipetakan ke 409 dengan pesan kategori/slug yang sesuai konteks endpoint.

## 5. Sistem Migrasi

### 5.1 Satu Sumber Migrasi (Single Source of Truth)

- **Sumber tunggal** migrasi adalah `database/migrations/*.sql`.
- **Runner** migrasi adalah `backend/src/database/migrate.ts` (dijalankan via `tsx`), yang
  membaca berkas-berkas di folder tersebut secara berurutan (001, 002, ...).
- Runner melacak migrasi yang sudah dijalankan pada tabel `schema_migrations` sehingga
  **idempoten**: menjalankan ulang tidak akan menerapkan migrasi yang sama dua kali.
- Skrip npm: `npm run db:migrate` (dari root) memanggil `npm run db:migrate --workspace=backend`.

### 5.2 Daftar Migrasi

| Berkas | Isi |
|---|---|
| `001_create_admins.sql` | Tabel `admins` |
| `002_create_categories.sql` | Tabel `categories` |
| `003_create_movies.sql` | Tabel `movies` |
| `004_create_movie_categories.sql` | Tabel pivot + foreign key |
| `005_create_site_settings.sql` | Tabel `site_settings` + nilai default |
| `006_create_indexes.sql` | Indeks `movies` & FULLTEXT |
| `007_create_sessions.sql` | Tabel `sessions` |

### 5.3 `schema.sql` vs `migrations/`

- `schema.sql` adalah **gabungan** dari semua migrasi, ditambah `CREATE DATABASE IF NOT EXISTS`
  dan `USE streamflix`, sehingga bisa diimpor langsung sebagai satu berkas.
- `schema.sql` **harus selalu sinkron** dengan folder `migrations/`. Bila ada migrasi baru,
  perbarui `schema.sql` (dapat dibantu `npm run db:generate-schema` di backend) agar keduanya
  konsisten.
- **Rekomendasi**: gunakan `schema.sql` untuk setup awal/cepat (mis. XAMPP), dan `migrations/`
  untuk evolusi skema yang terlacak.

## 6. Menjalankan Migrasi

### 6.1 Prasyarat

1. MySQL 8 sudah berjalan (mis. lewat XAMPP Control Panel → Start MySQL).
2. Database `streamflix` sudah dibuat (migrasi runner dapat membuatnya bila belum ada).
3. `backend/.env` terisi: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

### 6.2 Langkah

```bash
# Dari akar proyek
npm run db:migrate

# Atau langsung dari folder backend
cd backend
npm run db:migrate
```

Migrasi yang berhasil akan tercatat di tabel `schema_migrations`. Untuk melihatnya di
phpMyAdmin, buka database `streamflix` → tabel `schema_migrations`.

> Migrasi **tidak** mengisi data contoh. Untuk data demo development, lihat
> `database/seeds/dev-demo.sql` (hanya untuk development).

## 7. Import `schema.sql` ke XAMPP phpMyAdmin (Langkah demi Langkah)

1. **Jalankan XAMPP.** Buka XAMPP Control Panel, klik **Start** pada **Apache** dan **MySQL**.
2. **Buka phpMyAdmin.** Kunjungi <http://localhost/phpmyadmin> di browser.
3. **(Opsional) Login** dengan user MySQL Anda (default XAMPP: user `root`, password kosong).
4. **Buka tab Import.** Pada bilah atas phpMyAdmin, klik tab **Import**.
5. **Pilih berkas.** Klik **Choose File** lalu pilih `E:\streamflix\database\schema.sql`.
   - Karena `schema.sql` sudah berisi `CREATE DATABASE IF NOT EXISTS streamflix` dan
     `USE streamflix`, Anda **tidak perlu** membuat database secara manual terlebih dahulu.
6. **Format berkas.** Pastikan format terdeteksi sebagai **SQL**.
7. **Jalankan.** Klik tombol **Go** / **Import** di bagian bawah.
8. **Verifikasi.** Setelah selesai, di panel kiri akan muncul database `streamflix` dengan
   tabel: `admins`, `categories`, `movie_categories`, `movies`, `schema_migrations`,
   `sessions`, `site_settings`.
9. **(Opsional) Isi data demo.** Pilih database `streamflix` di panel kiri → tab **Import** →
   pilih `E:\streamflix\database\seeds\dev-demo.sql` → **Go**.
   > ⚠️ **Hanya untuk development.** Jangan jalankan seed di produksi.
10. **(Wajib) Buat akun admin pertama.** Seed tidak membuat admin. Jalankan:

    ```bash
    npm run admin:create
    ```

### 7.1 Jika import gagal

| Gejala | Kemungkinan penyebab | Solusi |
|---|---|---|
| "Access denied for user" | Kredensial MySQL salah | Sesuaikan user/password di langkah login phpMyAdmin |
| "Table already exists" | Database sudah pernah diimpor | Aman diabaikan; atau drop tabel lalu impor ulang |
| "Specified key was too long" | Versi MySQL lama / charset berbeda | Pastikan MySQL 8.x dan `innodb_large_prefix` aktif |
| Timeout pada berkas besar | Batas unggah PHP | Naikkan `upload_max_filesize`/`post_max_size`, atau pakai `npm run db:migrate` |

## 8. Setup Database untuk Test

Test integrasi backend membutuhkan database MySQL terpisah (mis. `streamflix_test`) agar tidak
mengganggu data pengembangan. Buat database kosong, arahkan variabel `DB_NAME` pada konfigurasi
test, lalu jalankan migrasi terhadap database tersebut. Lihat [`TESTING.md`](./TESTING.md).

## 9. Referensi Cepat

```sql
-- Melihat migrasi yang sudah diterapkan
SELECT * FROM schema_migrations ORDER BY id;

-- Melihat film terbit terbaru
SELECT id, title, published_at FROM movies
WHERE status = 'published' ORDER BY published_at DESC LIMIT 10;

-- Melihat kategori beserta jumlah film
SELECT c.name, COUNT(mc.movie_id) AS movie_count
FROM categories c
LEFT JOIN movie_categories mc ON mc.category_id = c.id
GROUP BY c.id ORDER BY c.name;
```

Dokumen terkait: [`ERD.md`](./ERD.md) · [`DEPLOYMENT.md`](./DEPLOYMENT.md) ·
[`../database/README.md`](../database/README.md).
