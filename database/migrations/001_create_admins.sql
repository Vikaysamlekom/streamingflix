-- 001_create_admins.sql
-- Tabel akun admin untuk autentikasi dashboard.
-- Password disimpan sebagai hash (bcryptjs), tidak pernah plaintext.

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
