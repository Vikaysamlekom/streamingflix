-- ============================================================================
-- StreamFlix - schema.sql
-- ============================================================================
-- File ini adalah GABUNGAN dari seluruh migrasi di database/migrations/.
-- Dibuat untuk memudahkan import manual (mis. lewat phpMyAdmin XAMPP).
--
-- CARA IMPORT DI XAMPP (phpMyAdmin):
--   1. Jalankan Apache & MySQL dari XAMPP Control Panel.
--   2. Buka http://localhost/phpmyadmin
--   3. Klik tab "Import" -> pilih file ini -> klik "Go/Import".
--      (File ini sudah berisi CREATE DATABASE + USE, jadi tidak perlu
--       membuat database manual terlebih dahulu.)
--
-- Catatan: Jika ingin menjalankan migrasi bertahap, gunakan `npm run db:migrate`
--          dari folder backend (sumber migrasi tunggal: database/migrations/).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `streamflix`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `streamflix`;

-- ---------------------------------------------------------------------------
-- Tabel pencatat migrasi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration`  VARCHAR(255) NOT NULL,
  `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schema_migrations_migration` (`migration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 001_create_admins.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name`  VARCHAR(120) NULL,
  `role`          ENUM('admin') NOT NULL DEFAULT 'admin',
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 002_create_categories.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `slug`       VARCHAR(120) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_name` (`name`),
  UNIQUE KEY `uq_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 003_create_movies.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `movies` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`            VARCHAR(255) NOT NULL,
  `slug`             VARCHAR(255) NOT NULL,
  `synopsis`         TEXT NULL,
  `poster_url`       VARCHAR(2048) NULL,
  `banner_url`       VARCHAR(2048) NULL,
  `video_url`        VARCHAR(2048) NOT NULL,
  `video_type`       ENUM('mp4') NOT NULL DEFAULT 'mp4',
  `release_year`     SMALLINT UNSIGNED NULL,
  `duration_minutes` SMALLINT UNSIGNED NULL,
  `rating`           DECIMAL(3,1) NULL,
  `age_rating`       VARCHAR(10) NULL,
  `view_count`       INT UNSIGNED NOT NULL DEFAULT 0,
  `status`           ENUM('draft','published') NOT NULL DEFAULT 'draft',
  `is_featured`      TINYINT(1) NOT NULL DEFAULT 0,
  `published_at`     TIMESTAMP NULL DEFAULT NULL,
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_movies_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 004_create_movie_categories.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `movie_categories` (
  `movie_id`    BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`movie_id`, `category_id`),
  KEY `idx_movie_categories_category_id` (`category_id`),
  CONSTRAINT `fk_mc_movie`
    FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mc_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 005_create_site_settings.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_settings` (
  `key`        VARCHAR(100) NOT NULL,
  `value`      TEXT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `site_settings` (`key`, `value`) VALUES
  ('site_name', 'StreamFlix'),
  ('tagline', 'Nonton film favoritmu kapan saja, di mana saja.'),
  ('seo_description', 'StreamFlix - platform streaming film dengan koleksi unggulan, terbaru, dan populer.'),
  ('hero_slide_limit', '5'),
  ('social_facebook', ''),
  ('social_instagram', ''),
  ('social_twitter', ''),
  ('social_youtube', '')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ---------------------------------------------------------------------------
-- 006_create_indexes.sql
-- ---------------------------------------------------------------------------
CREATE INDEX `idx_movies_status_published_at` ON `movies` (`status`, `published_at`);
CREATE INDEX `idx_movies_status_featured` ON `movies` (`status`, `is_featured`);
CREATE INDEX `idx_movies_status_view_count` ON `movies` (`status`, `view_count`);
CREATE INDEX `idx_movies_updated_at` ON `movies` (`updated_at`);
CREATE INDEX `idx_movies_title` ON `movies` (`title`);
CREATE FULLTEXT INDEX `ft_movies_title_synopsis` ON `movies` (`title`, `synopsis`);

-- ---------------------------------------------------------------------------
-- 007_create_sessions.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) NOT NULL,
  `expires`    INT UNSIGNED NOT NULL,
  `data`       MEDIUMTEXT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_sessions_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Catatan migrasi yang tercatat
-- ---------------------------------------------------------------------------
INSERT INTO `schema_migrations` (`migration`) VALUES
  ('001_create_admins.sql'),
  ('002_create_categories.sql'),
  ('003_create_movies.sql'),
  ('004_create_movie_categories.sql'),
  ('005_create_site_settings.sql'),
  ('006_create_indexes.sql'),
  ('007_create_sessions.sql')
ON DUPLICATE KEY UPDATE `migration` = VALUES(`migration`);

-- ============================================================================
-- Selesai. Untuk mengisi data contoh (development), import
-- database/seeds/dev-demo.sql secara terpisah. JANGAN dijalankan di produksi.
-- ============================================================================
