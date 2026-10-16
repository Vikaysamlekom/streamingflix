-- 007_create_sessions.sql
-- Tabel session store untuk express-mysql-session.
-- Struktur mengikuti skema default express-mysql-session.

CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) NOT NULL,
  `expires`    INT UNSIGNED NOT NULL,
  `data`       MEDIUMTEXT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_sessions_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
