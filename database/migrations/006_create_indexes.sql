-- 006_create_indexes.sql
-- Indeks tambahan untuk performa query umum.
-- MySQL tidak mendukung "CREATE INDEX IF NOT EXISTS" secara umum, jadi
-- runner migrasi menangani idempoten lewat tabel schema_migrations.

CREATE INDEX `idx_movies_status_published_at` ON `movies` (`status`, `published_at`);
CREATE INDEX `idx_movies_status_featured` ON `movies` (`status`, `is_featured`);
CREATE INDEX `idx_movies_status_view_count` ON `movies` (`status`, `view_count`);
CREATE INDEX `idx_movies_updated_at` ON `movies` (`updated_at`);
CREATE INDEX `idx_movies_title` ON `movies` (`title`);
CREATE FULLTEXT INDEX `ft_movies_title_synopsis` ON `movies` (`title`, `synopsis`);
