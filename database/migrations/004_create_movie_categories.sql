-- 004_create_movie_categories.sql
-- Relasi banyak-ke-banyak film <-> kategori (genre).
-- FK movie_id ON DELETE CASCADE (hapus film -> relasi ikut terhapus).
-- FK category_id ON DELETE RESTRICT (kategori terpakai tidak boleh terhapus).

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
