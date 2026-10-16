-- 003_create_movies.sql
-- Tabel film. Video diputar dari URL MP4 eksternal.

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
