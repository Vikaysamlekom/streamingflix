-- 005_create_site_settings.sql
-- Pengaturan situs berbentuk key-value.

CREATE TABLE IF NOT EXISTS `site_settings` (
  `key`        VARCHAR(100) NOT NULL,
  `value`      TEXT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nilai awal (default) pengaturan situs.
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
