CREATE TABLE IF NOT EXISTS app_owner (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT app_owner_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(191) NOT NULL PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_identity_profiles (
  tip4serv_user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  tip4serv_username VARCHAR(191) NULL,
  email VARCHAR(191) NULL,
  discord_id VARCHAR(64) NULL UNIQUE,
  discord_username VARCHAR(191) NULL,
  discord_global_name VARCHAR(191) NULL,
  eos_id VARCHAR(191) NULL,
  server_key VARCHAR(191) NULL,
  eos_acknowledged_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX player_identity_profiles_eos_idx (eos_id),
  INDEX player_identity_profiles_server_idx (server_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_identity_sync_outbox (
  tip4serv_user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  status ENUM('pending', 'synced', 'blocked') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  last_error_code VARCHAR(64) NULL,
  next_attempt_at DATETIME NULL,
  synced_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX player_identity_sync_outbox_status_idx (status, next_attempt_at),
  CONSTRAINT player_identity_sync_outbox_profile_fk
    FOREIGN KEY (tip4serv_user_id) REFERENCES player_identity_profiles(tip4serv_user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vip_checkout_coupons (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tip4serv_user_id BIGINT UNSIGNED NOT NULL,
  tip4serv_coupon_id BIGINT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  discount_percent INT NOT NULL DEFAULT 20,
  product_ids TEXT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX vip_checkout_coupons_user_idx (tip4serv_user_id),
  INDEX vip_checkout_coupons_expires_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlists (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(191) NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY wishlists_user_product_unique (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_stats (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id INT NOT NULL UNIQUE,
  view_count INT NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX product_stats_product_id_idx (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rcon_servers (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  map_name VARCHAR(191) NOT NULL,
  host VARCHAR(191) NOT NULL,
  rcon_port INT NOT NULL,
  rcon_password TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add RCON servers from your private production database/admin tooling.
-- Do not commit real hosts or passwords to this schema file.
