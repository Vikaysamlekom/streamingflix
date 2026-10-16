-- ============================================================================
-- StreamFlix - seeds/dev-demo.sql
-- ============================================================================
-- ⚠️  DATA CONTOH UNTUK DEVELOPMENT SAJA. JANGAN DIJALANKAN DI PRODUKSI.
-- ============================================================================
-- Semua judul, sinopsis, dan URL di file ini adalah FIKTIF / PLACEHOLDER.
-- URL video memakai contoh "https://example.com/..." yang BUKAN sumber aktif
-- (tidak akan benar-benar diputar). Ganti dengan URL MP4 milik Anda sendiri.
-- Poster/banner dibiarkan NULL agar placeholder gradient StreamFlix tampil.
--
-- Cara import: phpMyAdmin -> pilih database `streamflix` -> Import -> file ini.
-- ============================================================================

USE `streamflix`;

-- Kategori (genre) contoh
INSERT INTO `categories` (`name`, `slug`) VALUES
  ('Aksi', 'aksi'),
  ('Drama', 'drama'),
  ('Komedi', 'komedi'),
  ('Fiksi Ilmiah', 'fiksi-ilmiah'),
  ('Horor', 'horor'),
  ('Petualangan', 'petualangan'),
  ('Animasi', 'animasi'),
  ('Dokumenter', 'dokumenter')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Film contoh
INSERT INTO `movies`
  (`title`, `slug`, `synopsis`, `video_url`, `release_year`, `duration_minutes`,
   `rating`, `age_rating`, `view_count`, `status`, `is_featured`, `published_at`)
VALUES
  ('Jejak Sang Penjaga', 'jejak-sang-penjaga',
   'Seorang penjaga hutan menemukan rahasia lama yang mengubah hidupnya dan seluruh desa.',
   'https://example.com/demo/jejak-sang-penjaga.mp4', 2024, 118, 8.2, '13+', 15230, 'published', 1, NOW()),
  ('Langit Kedua', 'langit-kedua',
   'Dua penerbang muda bersaing sekaligus bersahabat dalam misi penyelamatan berbahaya.',
   'https://example.com/demo/langit-kedua.mp4', 2023, 132, 7.9, '13+', 9870, 'published', 1, NOW()),
  ('Ruang Tanpa Waktu', 'ruang-tanpa-waktu',
   'Seorang fisikawan terjebak dalam loop waktu dan harus menemukan cara keluar.',
   'https://example.com/demo/ruang-tanpa-waktu.mp4', 2025, 145, 8.7, '17+', 21050, 'published', 1, NOW()),
  ('Kopi di Ujung Senja', 'kopi-di-ujung-senja',
   'Kisah hangat tentang kedai kopi kecil yang menyatukan orang-orang dari berbagai latar.',
   'https://example.com/demo/kopi-di-ujung-senja.mp4', 2024, 96, 7.4, 'SU', 6420, 'published', 1, NOW()),
  ('Bayang-Bayang Kota Tua', 'bayang-bayang-kota-tua',
   'Detektif muda mengungkap konspirasi di balik renovasi kawasan kota tua.',
   'https://example.com/demo/bayang-bayang-kota-tua.mp4', 2022, 124, 7.1, '17+', 4310, 'published', 0, NOW()),
  ('Tarian Hujan', 'tarian-hujan',
   'Petualangan seorang anak yang percaya bahwa hujan bisa memanggil keberuntungan.',
   'https://example.com/demo/tarian-hujan.mp4', 2023, 88, 6.8, 'SU', 3120, 'published', 0, NOW()),
  ('Protokol Nusantara', 'protokol-nusantara',
   'Tim agen rahasia melindungi teknologi energi terbarukan dari tangan yang salah.',
   'https://example.com/demo/protokol-nusantara.mp4', 2025, 138, 8.0, '13+', 11890, 'published', 0, NOW()),
  ('Sekolah Para Bintang', 'sekolah-para-bintang',
   'Komedi tentang sekelompok siswa yang bersaing di kompetisi sains nasional.',
   'https://example.com/demo/sekolah-para-bintang.mp4', 2024, 102, 7.6, 'SU', 7740, 'published', 0, NOW()),
  ('Malam Terakhir di Bandung', 'malam-terakhir-di-bandung',
   'Drama romansa tentang perpisahan dan harapan baru di kota kembang.',
   'https://example.com/demo/malam-terakhir-di-bandung.mp4', 2022, 110, 7.3, '13+', 5210, 'published', 0, NOW()),
  ('Ekspedisi Rimba Utara', 'ekspedisi-rimba-utara',
   'Dokumenter perjalanan menelusuri hutan tropis dan satwa langka.',
   'https://example.com/demo/ekspedisi-rimba-utara.mp4', 2023, 76, 8.4, 'SU', 2680, 'published', 0, NOW()),
  ('Kode Hantu', 'kode-hantu',
   'Programmer menemukan kode misterius yang bisa memprediksi kejadian berikutnya.',
   'https://example.com/demo/kode-hantu.mp4', 2025, 121, 7.8, '17+', 6950, 'published', 0, NOW()),
  ('Draft: Proyek Rahasia', 'draft-proyek-rahasia',
   'Film contoh berstatus draft (tidak tampil di situs publik).',
   'https://example.com/demo/draft-proyek-rahasia.mp4', 2025, 100, 0.0, '13+', 0, 'draft', 0, NULL)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Relasi film <-> kategori
INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'aksi'
WHERE m.`slug` IN ('jejak-sang-penjaga', 'protokol-nusantara', 'bayang-bayang-kota-tua')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'drama'
WHERE m.`slug` IN ('kopi-di-ujung-senja', 'malam-terakhir-di-bandung', 'langit-kedua')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'komedi'
WHERE m.`slug` IN ('sekolah-para-bintang', 'kopi-di-ujung-senja')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'fiksi-ilmiah'
WHERE m.`slug` IN ('ruang-tanpa-waktu', 'kode-hantu', 'protokol-nusantara')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'horor'
WHERE m.`slug` IN ('bayang-bayang-kota-tua', 'kode-hantu')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'petualangan'
WHERE m.`slug` IN ('tarian-hujan', 'langit-kedua')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'dokumenter'
WHERE m.`slug` IN ('ekspedisi-rimba-utara')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

INSERT INTO `movie_categories` (`movie_id`, `category_id`)
SELECT m.`id`, c.`id`
FROM `movies` m
JOIN `categories` c ON c.`slug` = 'animasi'
WHERE m.`slug` IN ('tarian-hujan')
ON DUPLICATE KEY UPDATE `movie_id` = VALUES(`movie_id`);

-- ============================================================================
-- Selesai. Akun admin TIDAK dibuat lewat seed ini.
-- Buat admin dengan: cd backend && npm run admin:create
-- ============================================================================
