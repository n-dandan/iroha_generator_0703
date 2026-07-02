-- =====================================================
-- db/schema.sql — users / favorites テーブル定義
-- 実行方法: mysql -u root < db/schema.sql
--          もしくは phpMyAdmin の SQL タブに貼り付けて実行
-- =====================================================

CREATE DATABASE IF NOT EXISTS iroha_generator
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE iroha_generator;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(30)  NOT NULL,        -- 表示名 (trim済み、元の大文字小文字)
  name_key      VARCHAR(30)  NOT NULL,        -- mb_strtolower(trim($name))、一意性/検索キー
  password_hash VARCHAR(255) NOT NULL,
  created_at    INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_users_name_key (name_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  kind       ENUM('color','font') NOT NULL,
  item_id    VARCHAR(191) NOT NULL,          -- クライアント側 item.id (重複排除キー)
  payload    JSON NOT NULL,                   -- お気に入りアイテム全体
  position   SMALLINT UNSIGNED NOT NULL,      -- (user_id, kind) 内の並び順 (0始まり)
  created_at INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_fav_user_kind_item (user_id, kind, item_id),
  KEY idx_fav_user_kind_pos (user_id, kind, position),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
