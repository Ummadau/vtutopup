-- NAEEM DATA SUB / NPay Shared Hosting MySQL Schema
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB 10.2+ (cPanel / phpMyAdmin)
-- Character set: utf8mb4_unicode_ci

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(64) NOT NULL DEFAULT '',
  `role` VARCHAR(32) NOT NULL DEFAULT 'customer',
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `avatar` TEXT NULL,
  `referral_code` VARCHAR(64) NOT NULL DEFAULT '',
  `referred_by` VARCHAR(64) NULL,
  `wallet_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_savings` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `referral_earnings` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_transactions_count` INT NOT NULL DEFAULT 0,
  `transaction_pin` VARCHAR(16) NOT NULL DEFAULT '1234',
  `password_hash` VARCHAR(255) NULL,
  `biometric_credential_id` TEXT NULL,
  `nin` VARCHAR(64) NULL,
  `bvn` VARCHAR(64) NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_referral_code` (`referral_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `virtual_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(191) NOT NULL,
  `bank_name` VARCHAR(191) NOT NULL,
  `bank_id` VARCHAR(64) NULL,
  `account_number` VARCHAR(64) NOT NULL,
  `account_name` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NULL,
  `deposit_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `provider` VARCHAR(64) NOT NULL DEFAULT 'billstack',
  `created_at` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_virtual_user_acct` (`user_id`, `account_number`),
  KEY `idx_virtual_acct_num` (`account_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `data_plans` (
  `id` VARCHAR(191) NOT NULL,
  `plan_id` VARCHAR(128) NOT NULL,
  `network` VARCHAR(32) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `size` VARCHAR(64) NOT NULL,
  `validity` VARCHAR(64) NOT NULL,
  `plan_code` VARCHAR(128) NOT NULL,
  `plan_type` VARCHAR(64) NOT NULL DEFAULT 'SME',
  `provider_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `customer_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `reseller_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_data_plans_network` (`network`),
  KEY `idx_data_plans_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `airtime_discounts` (
  `network` VARCHAR(64) NOT NULL,
  `plan_id` VARCHAR(128) NULL,
  `customer_discount_percent` DECIMAL(6,2) NOT NULL DEFAULT 2.00,
  `reseller_discount_percent` DECIMAL(6,2) NOT NULL DEFAULT 3.50,
  `provider_cost_percent` DECIMAL(6,2) NOT NULL DEFAULT 4.50,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`network`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `electricity_discos` (
  `id` VARCHAR(191) NOT NULL,
  `plan_id` VARCHAR(128) NULL,
  `network_id` VARCHAR(128) NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `short_name` VARCHAR(128) NOT NULL,
  `service_fee` DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cable_packages` (
  `id` VARCHAR(191) NOT NULL,
  `plan_id` VARCHAR(128) NULL,
  `network_id` VARCHAR(128) NULL,
  `provider` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(128) NOT NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `provider_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cable_provider` (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exam_pins` (
  `id` VARCHAR(191) NOT NULL,
  `plan_id` VARCHAR(128) NULL,
  `network_id` VARCHAR(128) NULL,
  `exam` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(128) NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `provider_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `stock_available` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NOT NULL,
  `provider_reference` VARCHAR(191) NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `user_name` VARCHAR(191) NOT NULL,
  `user_email` VARCHAR(191) NOT NULL,
  `user_phone` VARCHAR(64) NOT NULL DEFAULT '',
  `user_role` VARCHAR(32) NOT NULL DEFAULT 'customer',
  `service_type` VARCHAR(64) NOT NULL,
  `network` VARCHAR(64) NULL,
  `network_id` VARCHAR(64) NULL,
  `plan_id` VARCHAR(128) NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `plan_name` VARCHAR(191) NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `provider_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `profit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(32) NOT NULL,
  `token` TEXT NULL,
  `payment_method` VARCHAR(128) NULL,
  `failure_reason` TEXT NULL,
  `description` TEXT NULL,
  `date` VARCHAR(64) NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tx_user_id` (`user_id`),
  KEY `idx_tx_reference` (`reference`),
  KEY `idx_tx_status` (`status`),
  KEY `idx_tx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallet_ledger` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NOT NULL,
  `type` VARCHAR(16) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `balance_before` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `balance_after` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `description` TEXT NOT NULL,
  `timestamp` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ledger_user` (`user_id`),
  KEY `idx_ledger_reference` (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `user_name` VARCHAR(191) NOT NULL,
  `user_email` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'open',
  `priority` VARCHAR(32) NOT NULL DEFAULT 'medium',
  `messages_json` LONGTEXT NOT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tickets_user` (`user_id`),
  KEY `idx_tickets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manual_funding_requests` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `user_name` VARCHAR(191) NOT NULL,
  `user_email` VARCHAR(191) NOT NULL,
  `user_phone` VARCHAR(64) NOT NULL DEFAULT '',
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `sender_name` VARCHAR(191) NOT NULL,
  `sender_bank` VARCHAR(191) NOT NULL,
  `payment_reference` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `rejection_reason` TEXT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mfr_user` (`user_id`),
  KEY `idx_mfr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'info',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `providers` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `base_url` VARCHAR(255) NOT NULL,
  `api_key` TEXT NOT NULL,
  `secret_key` TEXT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `is_backup` TINYINT(1) NOT NULL DEFAULT 0,
  `is_live` TINYINT(1) NOT NULL DEFAULT 1,
  `balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(32) NOT NULL DEFAULT 'connected',
  `last_ping` VARCHAR(64) NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(128) NOT NULL,
  `value_json` LONGTEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `admin_email` VARCHAR(191) NOT NULL,
  `action` VARCHAR(128) NOT NULL,
  `target` VARCHAR(191) NOT NULL,
  `details` TEXT NOT NULL,
  `ip` VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
  `timestamp` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `webhook_logs` (
  `id` VARCHAR(191) NOT NULL,
  `path` VARCHAR(191) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `method` VARCHAR(16) NOT NULL,
  `headers_json` LONGTEXT NULL,
  `body_json` LONGTEXT NULL,
  `query_json` LONGTEXT NULL,
  `ip` VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
  `timestamp` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_whlog_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `deleted_tombstones` (
  `collection_name` VARCHAR(64) NOT NULL,
  `item_id` VARCHAR(191) NOT NULL,
  `deleted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`collection_name`, `item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
