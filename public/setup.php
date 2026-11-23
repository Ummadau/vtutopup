<?php
declare(strict_types=1);

/**
 * NAEEM DATA SUB / NPay Shared Hosting (public_html) Automated Installer
 * Supports PHP 7.4+ / 8.x with mysqli on cPanel / Apache / LiteSpeed.
 * Access at: https://yourdomain.com/setup.php
 */

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');

$isHttps = (
    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
    (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) ||
    (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

if (empty($_SESSION['setup_csrf_token']) || !is_string($_SESSION['setup_csrf_token'])) {
    $_SESSION['setup_csrf_token'] = bin2hex(random_bytes(32));
}
$csrfToken = $_SESSION['setup_csrf_token'];

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function sanitizeEnvValue(string $value): string
{
    $clean = str_replace(["\r", "\n", "\0"], '', $value);
    $clean = str_replace(['\\', '"', '$'], ['\\\\', '\\"', '\\$'], $clean);
    return '"' . $clean . '"';
}

function hashPasswordNodeCompatible(string $password): string
{
    $salt = bin2hex(random_bytes(16));
    $derived = hash_pbkdf2('sha256', $password, $salt, 100000, 64, false);
    return 'pbkdf2:sha256:100000:' . $salt . ':' . $derived;
}

function verifyCsrf(?string $submitted): bool
{
    if (!is_string($submitted) || empty($_SESSION['setup_csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['setup_csrf_token'], $submitted);
}

$currentDir = __DIR__;
$parentDir = dirname(__DIR__);
$lockFileCurrent = $currentDir . DIRECTORY_SEPARATOR . '.install.lock';
$lockFileParent = $parentDir . DIRECTORY_SEPARATOR . '.install.lock';
$isLocked = is_file($lockFileCurrent) || is_file($lockFileParent);

$flashError = '';
$flashSuccess = '';
$installSummary = null;
$testResult = null;
$selfDeleted = false;

// Handle one-click self-deletion after install
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_installer') {
    if (!verifyCsrf($_POST['csrf_token'] ?? null)) {
        $flashError = 'Security token mismatch. Please refresh this page and try again.';
    } else {
        $deleted = @unlink(__FILE__);
        if ($deleted) {
            $selfDeleted = true;
        } else {
            $flashError = 'Could not delete setup.php automatically due to file permissions. Please delete it manually in cPanel File Manager.';
        }
    }
}

// Form defaults (never hardcode database credentials)
$form = [
    'db_host' => trim((string)($_POST['db_host'] ?? 'localhost')),
    'db_port' => (int)($_POST['db_port'] ?? 3306),
    'db_socket' => trim((string)($_POST['db_socket'] ?? '')),
    'db_name' => trim((string)($_POST['db_name'] ?? '')),
    'db_user' => trim((string)($_POST['db_user'] ?? '')),
    'db_ssl' => isset($_POST['db_ssl']),
    'env_target' => ($_POST['env_target'] ?? 'current') === 'parent' ? 'parent' : 'current',
    'platform_name' => trim((string)($_POST['platform_name'] ?? 'NAEEM DATA SUB')),
    'tagline' => trim((string)($_POST['tagline'] ?? 'Fast, Affordable & Reliable Digital Services.')),
    'support_email' => trim((string)($_POST['support_email'] ?? 'support@naeemdatasub.ng')),
    'support_phone' => trim((string)($_POST['support_phone'] ?? '+234 801 234 5678')),
    'support_whatsapp' => trim((string)($_POST['support_whatsapp'] ?? '+2348069417241')),
    'admin_name' => trim((string)($_POST['admin_name'] ?? 'Naeem Ummadau')),
    'admin_email' => strtolower(trim((string)($_POST['admin_email'] ?? 'naeemummadau@gmail.com'))),
    'admin_phone' => trim((string)($_POST['admin_phone'] ?? '08000000001')),
    'admin_pin' => trim((string)($_POST['admin_pin'] ?? '1234')),
    'bank_name' => trim((string)($_POST['bank_name'] ?? 'Opay Digital Services')),
    'account_number' => trim((string)($_POST['account_number'] ?? '8069417241')),
    'account_name' => trim((string)($_POST['account_name'] ?? 'NAIM UMMADAU HARUNA')),
    'seed_demo_accounts' => isset($_POST['seed_demo_accounts']),
];

function openMysqlConnection(array $cfg, string $password): array
{
    if (!extension_loaded('mysqli')) {
        return [null, 'The PHP mysqli extension is not enabled on this hosting account. Enable mysqli in cPanel Select PHP Version.'];
    }
    $host = $cfg['db_host'] ?: 'localhost';
    $port = ($cfg['db_port'] >= 1 && $cfg['db_port'] <= 65535) ? $cfg['db_port'] : 3306;
    $socket = $cfg['db_socket'] !== '' ? $cfg['db_socket'] : null;

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = mysqli_init();
    if (!$conn) {
        return [null, 'Unable to initialize MySQLi client.'];
    }
    @$conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 8);

    $flags = $cfg['db_ssl'] ? MYSQLI_CLIENT_SSL : 0;
    $connected = @$conn->real_connect(
        $host,
        $cfg['db_user'],
        $password,
        $cfg['db_name'],
        $port,
        $socket,
        $flags
    );

    if (!$connected || $conn->connect_errno) {
        $errMsg = $conn->connect_error ?: 'Connection failed';
        @$conn->close();
        return [null, 'MySQL connection failed: ' . $errMsg];
    }

    @$conn->set_charset('utf8mb4');
    return [$conn, ''];
}

function buildSchemaStatements(): array
{
    return [
        "CREATE TABLE IF NOT EXISTS `users` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `virtual_accounts` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `data_plans` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `airtime_discounts` (
          `network` VARCHAR(64) NOT NULL,
          `plan_id` VARCHAR(128) NULL,
          `customer_discount_percent` DECIMAL(6,2) NOT NULL DEFAULT 2.00,
          `reseller_discount_percent` DECIMAL(6,2) NOT NULL DEFAULT 3.50,
          `provider_cost_percent` DECIMAL(6,2) NOT NULL DEFAULT 4.50,
          `is_active` TINYINT(1) NOT NULL DEFAULT 1,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`network`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `electricity_discos` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `cable_packages` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `exam_pins` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `transactions` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `wallet_ledger` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `support_tickets` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `manual_funding_requests` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `notifications` (
          `id` VARCHAR(191) NOT NULL,
          `user_id` VARCHAR(191) NOT NULL,
          `title` VARCHAR(191) NOT NULL,
          `message` TEXT NOT NULL,
          `type` VARCHAR(32) NOT NULL DEFAULT 'info',
          `is_read` TINYINT(1) NOT NULL DEFAULT 0,
          `created_at` VARCHAR(64) NOT NULL,
          PRIMARY KEY (`id`),
          KEY `idx_notif_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `providers` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `system_settings` (
          `setting_key` VARCHAR(128) NOT NULL,
          `value_json` LONGTEXT NOT NULL,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`setting_key`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `audit_logs` (
          `id` VARCHAR(191) NOT NULL,
          `admin_email` VARCHAR(191) NOT NULL,
          `action` VARCHAR(128) NOT NULL,
          `target` VARCHAR(191) NOT NULL,
          `details` TEXT NOT NULL,
          `ip` VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
          `timestamp` VARCHAR(64) NOT NULL,
          PRIMARY KEY (`id`),
          KEY `idx_audit_timestamp` (`timestamp`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `webhook_logs` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `deleted_tombstones` (
          `collection_name` VARCHAR(64) NOT NULL,
          `item_id` VARCHAR(191) NOT NULL,
          `deleted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`collection_name`, `item_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
}

function seedSystemData(mysqli $conn, array $cfg, string $adminPasswordHash, string $vtuApiKey): array
{
    $now = gmdate('Y-m-d\TH:i:s\Z');
    $counts = [
        'tables' => 17,
        'users' => 0,
        'dataPlans' => 0,
        'airtimeDiscounts' => 0,
        'electricityDiscos' => 0,
        'cablePackages' => 0,
        'examPins' => 0,
        'settings' => 0,
    ];

    // 1. Seed Super Admin (+ optional sample accounts)
    $userStmt = $conn->prepare(
        "INSERT INTO `users` (
            `id`, `name`, `email`, `phone`, `role`, `status`, `is_verified`, `avatar`,
            `referral_code`, `referred_by`, `wallet_balance`, `total_savings`, `referral_earnings`,
            `total_transactions_count`, `transaction_pin`, `password_hash`, `biometric_credential_id`,
            `nin`, `bvn`, `created_at`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            `name` = VALUES(`name`),
            `email` = VALUES(`email`),
            `phone` = VALUES(`phone`),
            `transaction_pin` = VALUES(`transaction_pin`),
            `password_hash` = COALESCE(VALUES(`password_hash`), `password_hash`)"
    );
    if (!$userStmt) {
        throw new RuntimeException('Failed to prepare users insert: ' . $conn->error);
    }

    $users = [
        [
            'usr_admin_01',
            $cfg['admin_name'],
            $cfg['admin_email'],
            $cfg['admin_phone'],
            'admin',
            'active',
            1,
            null,
            'ADMIN01',
            null,
            250000.00,
            0.00,
            0.00,
            0,
            $cfg['admin_pin'],
            $adminPasswordHash,
            null,
            null,
            null,
            $now,
        ],
    ];

    if ($cfg['seed_demo_accounts']) {
        $users[] = [
            'usr_ahmad_01',
            'Ahmad Naim',
            'ahmadnaim2877@gmail.com',
            '08012345678',
            'customer',
            'active',
            1,
            null,
            'NAEEM88',
            null,
            12500.00,
            8200.00,
            1200.00,
            32,
            '1234',
            null,
            null,
            null,
            null,
            $now,
        ];
        $users[] = [
            'usr_reseller_02',
            'Musa Ibrahim VTU',
            'reseller@naeemdatasub.ng',
            '08098765432',
            'reseller',
            'active',
            1,
            null,
            'MUSA_VTU',
            'NAEEM88',
            45000.00,
            28400.00,
            6500.00,
            148,
            '1234',
            null,
            null,
            null,
            null,
            $now,
        ];
    }

    foreach ($users as $u) {
        $userStmt->bind_param(
            'ssssssisssdddissssss',
            $u[0], $u[1], $u[2], $u[3], $u[4], $u[5], $u[6], $u[7], $u[8], $u[9],
            $u[10], $u[11], $u[12], $u[13], $u[14], $u[15], $u[16], $u[17], $u[18], $u[19]
        );
        if (!$userStmt->execute()) {
            throw new RuntimeException('Failed to seed user: ' . $userStmt->error);
        }
        $counts['users']++;
    }
    $userStmt->close();

    // 2. Seed Data Plans (21 plans matching server/db.ts)
    $plans = [
        ['mtn_dir_1gb', '2', 'mtn', 'MTN 1GB', '1GB', '30 Days', '2', 'Direct', 850, 1000, 950, 1],
        ['mtn_dir_2gb', '264', 'mtn', 'MTN 2GB', '2GB', '30 Days', '264', 'Direct', 1550, 1800, 1700, 1],
        ['mtn_dir_5gb', '5', 'mtn', 'MTN 5GB', '5GB', '30 Days', '5', 'Direct', 4000, 4500, 4300, 1],
        ['mtn_dir_10gb', '6', 'mtn', 'MTN 10GB', '10GB', '30 Days', '6', 'Direct', 7800, 8500, 8100, 1],
        ['mtn_sme_500mb', '304', 'mtn', 'MTN SME 500MB', '500MB', '30 Days', '304', 'SME', 135, 160, 145, 1],
        ['mtn_sme_1gb', '121', 'mtn', 'MTN SME 1GB', '1GB', '30 Days', '121', 'SME', 260, 290, 275, 1],
        ['mtn_sme_2gb', '122', 'mtn', 'MTN SME 2GB', '2GB', '30 Days', '122', 'SME', 520, 580, 550, 1],
        ['mtn_sme_3gb', '123', 'mtn', 'MTN SME 3GB', '3GB', '30 Days', '123', 'SME', 780, 870, 825, 1],
        ['mtn_sme_5gb', '124', 'mtn', 'MTN SME 5GB', '5GB', '30 Days', '124', 'SME', 1300, 1450, 1375, 1],
        ['mtn_sme_10gb', '13', 'mtn', 'MTN SME 10GB', '10GB', '30 Days', '13', 'SME', 2600, 2900, 2750, 1],
        ['airtel_cg_1gb', '29', 'airtel', 'Airtel CG 1GB', '1GB', '30 Days', '29', 'Corporate', 280, 320, 300, 1],
        ['airtel_cg_2gb', '30', 'airtel', 'Airtel CG 2GB', '2GB', '30 Days', '30', 'Corporate', 560, 640, 600, 1],
        ['airtel_cg_5gb', '32', 'airtel', 'Airtel CG 5GB', '5GB', '30 Days', '32', 'Corporate', 1400, 1600, 1500, 1],
        ['airtel_cg_10gb', '33', 'airtel', 'Airtel CG 10GB', '10GB', '30 Days', '33', 'Corporate', 2800, 3200, 3000, 1],
        ['glo_cg_1gb', '21', 'glo', 'Glo CG 1GB', '1GB', '30 Days', '21', 'Corporate', 240, 275, 255, 1],
        ['glo_cg_2gb', '24', 'glo', 'Glo CG 2GB', '2GB', '30 Days', '24', 'Corporate', 480, 550, 510, 1],
        ['glo_cg_5gb', '26', 'glo', 'Glo CG 5GB', '5GB', '30 Days', '26', 'Corporate', 1200, 1375, 1275, 1],
        ['glo_cg_10gb', '27', 'glo', 'Glo CG 10GB', '10GB', '30 Days', '27', 'Corporate', 2400, 2750, 2550, 1],
        ['9mobile_sme_1gb', '491', '9mobile', '9mobile SME 1GB', '1GB', '30 Days', '491', 'SME', 210, 250, 230, 1],
        ['9mobile_sme_2gb', '491', '9mobile', '9mobile SME 2GB', '2GB', '30 Days', '491', 'SME', 420, 500, 460, 1],
        ['9mobile_sme_5gb', '498', '9mobile', '9mobile SME 5GB', '5GB', '30 Days', '498', 'SME', 1050, 1250, 1150, 1],
    ];
    $planStmt = $conn->prepare(
        "INSERT IGNORE INTO `data_plans` (
            `id`, `plan_id`, `network`, `name`, `size`, `validity`, `plan_code`, `plan_type`,
            `provider_cost`, `customer_price`, `reseller_price`, `is_active`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    foreach ($plans as $p) {
        $planStmt->bind_param(
            'ssssssssdddi',
            $p[0], $p[1], $p[2], $p[3], $p[4], $p[5], $p[6], $p[7],
            $p[8], $p[9], $p[10], $p[11]
        );
        $planStmt->execute();
        $counts['dataPlans']++;
    }
    $planStmt->close();

    // 3. Seed Airtime Discounts
    $discounts = [
        ['mtn', null, 2.0, 3.5, 4.5, 1],
        ['airtel', null, 2.0, 3.5, 4.5, 1],
        ['glo', null, 3.0, 5.0, 6.0, 1],
        ['9mobile', null, 3.0, 5.0, 6.0, 1],
    ];
    $discStmt = $conn->prepare(
        "INSERT IGNORE INTO `airtime_discounts` (
            `network`, `plan_id`, `customer_discount_percent`, `reseller_discount_percent`, `provider_cost_percent`, `is_active`
        ) VALUES (?, ?, ?, ?, ?, ?)"
    );
    foreach ($discounts as $d) {
        $discStmt->bind_param('ssdddi', $d[0], $d[1], $d[2], $d[3], $d[4], $d[5]);
        $discStmt->execute();
        $counts['airtimeDiscounts']++;
    }
    $discStmt->close();

    // 4. Seed Electricity Discos
    $discos = [
        ['ikedc', null, null, 'Ikeja Electric (IKEDC)', 'IKEDC', 'Ikeja', 50, 1],
        ['ekedc', null, null, 'Eko Electricity (EKEDC)', 'EKEDC', 'Eko', 50, 1],
        ['aedc', null, null, 'Abuja Electricity (AEDC)', 'AEDC', 'Abuja', 50, 1],
        ['ibedc', null, null, 'Ibadan Electricity (IBEDC)', 'IBEDC', 'Ibadan', 50, 1],
        ['phed', null, null, 'Port Harcourt Electric (PHED)', 'PHED', 'Port Harcourt', 50, 1],
        ['eedc', null, null, 'Enugu Electricity (EEDC)', 'EEDC', 'Enugu', 50, 1],
        ['kedco', null, null, 'Kano Electricity (KEDCO)', 'KEDCO', 'Kano', 50, 1],
        ['jedc', null, null, 'Jos Electricity (JEDC)', 'JEDC', 'Jos', 50, 1],
    ];
    $discoStmt = $conn->prepare(
        "INSERT IGNORE INTO `electricity_discos` (
            `id`, `plan_id`, `network_id`, `name`, `code`, `short_name`, `service_fee`, `is_active`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    foreach ($discos as $e) {
        $discoStmt->bind_param('ssssssdi', $e[0], $e[1], $e[2], $e[3], $e[4], $e[5], $e[6], $e[7]);
        $discoStmt->execute();
        $counts['electricityDiscos']++;
    }
    $discoStmt->close();

    // 5. Seed Cable Packages
    $cables = [
        ['dstv_padi', null, null, 'dstv', 'DStv Padi', 'dstv-padi', 3600, 3550, 1],
        ['dstv_yanga', null, null, 'dstv', 'DStv Yanga', 'dstv-yanga', 5100, 5000, 1],
        ['dstv_confam', null, null, 'dstv', 'DStv Confam', 'dstv-confam', 9300, 9150, 1],
        ['dstv_compact', null, null, 'dstv', 'DStv Compact', 'dstv-compact', 15700, 15450, 1],
        ['dstv_compact_plus', null, null, 'dstv', 'DStv Compact Plus', 'dstv-compact-plus', 25000, 24600, 1],
        ['dstv_premium', null, null, 'dstv', 'DStv Premium', 'dstv-premium', 37000, 36400, 1],
        ['gotv_smallie', null, null, 'gotv', 'GOtv Smallie', 'gotv-smallie', 1575, 1550, 1],
        ['gotv_jinja', null, null, 'gotv', 'GOtv Jinja', 'gotv-jinja', 3300, 3250, 1],
        ['gotv_jolli', null, null, 'gotv', 'GOtv Jolli', 'gotv-jolli', 4850, 4775, 1],
        ['gotv_max', null, null, 'gotv', 'GOtv Max', 'gotv-max', 7200, 7080, 1],
        ['gotv_supa', null, null, 'gotv', 'GOtv Supa', 'gotv-supa', 9600, 9450, 1],
        ['star_nova', null, null, 'startimes', 'StarTimes Nova', 'star-nova', 1700, 1660, 1],
        ['star_basic', null, null, 'startimes', 'StarTimes Basic', 'star-basic', 3000, 2940, 1],
        ['star_classic', null, null, 'startimes', 'StarTimes Classic', 'star-classic', 4500, 4410, 1],
        ['star_super', null, null, 'startimes', 'StarTimes Super', 'star-super', 7000, 6860, 1],
    ];
    $cableStmt = $conn->prepare(
        "INSERT IGNORE INTO `cable_packages` (
            `id`, `plan_id`, `network_id`, `provider`, `name`, `code`, `price`, `provider_cost`, `is_active`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    foreach ($cables as $c) {
        $cableStmt->bind_param('ssssssddi', $c[0], $c[1], $c[2], $c[3], $c[4], $c[5], $c[6], $c[7], $c[8]);
        $cableStmt->execute();
        $counts['cablePackages']++;
    }
    $cableStmt->close();

    // 6. Seed Exam PINs
    $exams = [
        ['exam_waec', null, null, 'WAEC', 'WAEC Result Checker PIN', 'WAEC', 3800, 3650, 150, 1],
        ['exam_neco', null, null, 'NECO', 'NECO Result Token', 'NECO', 1200, 1100, 280, 1],
        ['exam_jamb_nomock', null, null, 'JAMB', 'JAMB UTME (Without Mock)', 'JAMB', 6200, 6000, 85, 1],
        ['exam_jamb_mock', null, null, 'JAMB', 'JAMB UTME (With Mock)', 'JAMB_MOCK', 7700, 7450, 60, 1],
    ];
    $examStmt = $conn->prepare(
        "INSERT IGNORE INTO `exam_pins` (
            `id`, `plan_id`, `network_id`, `exam`, `name`, `code`, `price`, `provider_cost`, `stock_available`, `is_active`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    foreach ($exams as $ex) {
        $examStmt->bind_param('ssssssddii', $ex[0], $ex[1], $ex[2], $ex[3], $ex[4], $ex[5], $ex[6], $ex[7], $ex[8], $ex[9]);
        $examStmt->execute();
        $counts['examPins']++;
    }
    $examStmt->close();

    // 7. Seed Providers
    $prvStmt = $conn->prepare(
        "INSERT IGNORE INTO `providers` (
            `id`, `name`, `base_url`, `api_key`, `secret_key`, `is_primary`, `is_backup`, `is_live`, `balance`, `status`, `last_ping`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $providers = [
        ['prv_vtunaija_01', 'VTUNaija API Gateway', 'https://vtunaija.com.ng/api', $vtuApiKey, '', 1, 0, 1, 0.00, 'connected', $now],
        ['prv_vtu_02', 'VTUNaija Sandbox / Backup', 'https://sandbox.vtunaija.com.ng/api', '', '', 0, 1, 0, 0.00, 'connected', $now],
    ];
    foreach ($providers as $pr) {
        $prvStmt->bind_param('sssssiiidss', $pr[0], $pr[1], $pr[2], $pr[3], $pr[4], $pr[5], $pr[6], $pr[7], $pr[8], $pr[9], $pr[10]);
        $prvStmt->execute();
    }
    $prvStmt->close();

    // 8. Seed System Settings JSON rows
    $settingsData = [
        'general' => [
            'platformName' => $cfg['platform_name'],
            'tagline' => $cfg['tagline'],
            'supportPhone' => $cfg['support_phone'],
            'supportEmail' => $cfg['support_email'],
            'supportWhatsapp' => $cfg['support_whatsapp'],
            'minWalletFunding' => 100,
            'referralBonusPercent' => 5,
            'maintenanceMode' => false,
            'demoMode' => false,
            'notificationBanner' => 'Welcome to ' . $cfg['platform_name'] . '! Get instant discounts on all Data and Airtime purchases.',
            'servicesEnabled' => [
                'data' => true,
                'airtime' => true,
                'electricity' => true,
                'cable' => true,
                'exam' => true,
            ],
        ],
        'manual_funding' => [
            'bankName' => $cfg['bank_name'],
            'accountNumber' => $cfg['account_number'],
            'accountName' => $cfg['account_name'],
            'supportWhatsapp' => $cfg['support_whatsapp'],
            'instructions' => 'Transfer to the admin bank account above, then submit your payment reference for instant admin verification.',
        ],
        'vtu_config' => [
            'apiKey' => $vtuApiKey,
            'baseUrl' => 'https://vtunaija.com.ng/api',
            'dataEndpoint' => '/data/',
            'airtimeEndpoint' => '/topup/',
            'cableEndpoint' => '/cablesub/',
            'cableVerifyEndpoint' => '/cablesub/verify/',
            'electricityEndpoint' => '/billpayment/',
            'electricityVerifyEndpoint' => '/billpayment/verify/',
            'examEndpoint' => '/epin/',
            'balanceEndpoint' => '/user/',
            'networkIds' => ['mtn' => '1', 'glo' => '2', 'nineMobile' => '3', 'airtel' => '4'],
            'isLive' => true,
            'lastTested' => $now,
            'lastStatus' => 'connected',
            'balance' => 0,
        ],
        'nc_config' => [
            'apiKey' => '',
            'baseUrl' => 'https://ncwallet.ng/api',
            'dataEndpoint' => '/data/',
            'airtimeEndpoint' => '/topup/',
            'cableEndpoint' => '/cablesub/',
            'cableVerifyEndpoint' => '/cablesub/verify/',
            'electricityEndpoint' => '/billpayment/',
            'electricityVerifyEndpoint' => '/billpayment/verify/',
            'examEndpoint' => '/epin/',
            'balanceEndpoint' => '/user/',
            'networkIds' => ['mtn' => '1', 'glo' => '2', 'nineMobile' => '3', 'airtel' => '4'],
            'isLive' => true,
            'lastTested' => $now,
            'lastStatus' => 'connected',
            'balance' => 0,
        ],
        'unitybills_config' => [
            'apiKey' => '',
            'baseUrl' => 'https://www.unitybills.ng/api/v1',
            'dataEndpoint' => '/bill/data',
            'airtimeEndpoint' => '/bill/airtime',
            'cableEndpoint' => '/bill/cable',
            'cableVerifyEndpoint' => '/bill/cable/verify',
            'electricityEndpoint' => '/bill/electricity',
            'electricityVerifyEndpoint' => '/bill/electricity/verify',
            'examEndpoint' => '/bill/exam',
            'balanceEndpoint' => '/user',
            'virtualAccountEndpoint' => '/virtual-account',
            'networkIds' => ['mtn' => 'mtn', 'glo' => 'glo', 'nineMobile' => '9mobile', 'airtel' => 'airtel'],
            'isLive' => true,
            'lastTested' => $now,
            'lastStatus' => 'connected',
            'balance' => 0,
        ],
        'service_routing' => [
            'data' => 'vtunaija',
            'airtime' => 'vtunaija',
            'electricity' => 'vtunaija',
            'cable' => 'vtunaija',
            'exam' => 'vtunaija',
        ],
        'catalog_meta' => [
            'bootstrapped' => true,
            'updatedAt' => $now,
            'installedVia' => 'public_html/setup.php',
        ],
    ];

    $setStmt = $conn->prepare(
        "INSERT INTO `system_settings` (`setting_key`, `value_json`)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`)"
    );
    foreach ($settingsData as $key => $val) {
        $json = json_encode($val, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $setStmt->bind_param('ss', $key, $json);
        $setStmt->execute();
        $counts['settings']++;
    }
    $setStmt->close();

    // 9. Record Initial Audit Log
    $audId = 'aud_setup_' . time();
    $audAction = 'PUBLIC_HTML_SETUP_INSTALL';
    $audTarget = 'MYSQL_DATABASE';
    $audDetails = 'Automated system & MySQL database installation completed via setup.php.';
    $audIp = (string)($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $audStmt = $conn->prepare(
        "INSERT IGNORE INTO `audit_logs` (`id`, `admin_email`, `action`, `target`, `details`, `ip`, `timestamp`)
        VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $audStmt->bind_param('sssssss', $audId, $cfg['admin_email'], $audAction, $audTarget, $audDetails, $audIp, $now);
    $audStmt->execute();
    $audStmt->close();

    return $counts;
}

function writeSecurityHtaccess(string $dir): bool
{
    $htaccessPath = $dir . DIRECTORY_SEPARATOR . '.htaccess';
    $rules = <<<'HTACCESS'
# NAEEM DATA SUB / NPay Shared Hosting (public_html) Security & Routing Rules

Options -Indexes

# Block direct HTTP access to sensitive configuration, database dumps, and lock files
<FilesMatch "^(\.env.*|\.install\.lock|persisted_db\.json|package(-lock)?\.json|bun\.lock|composer\.(json|lock)|.*\.sql|.*\.ts|.*\.tsx)$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^(api|hooks|webhooks)(/|$) - [L]

  RewriteCond %{DOCUMENT_ROOT}/index.html -f
  RewriteRule ^ index.html [L]
</IfModule>
HTACCESS;

    $written = @file_put_contents($htaccessPath, $rules . "\n");
    return $written !== false;
}

if (!$isLocked && !$selfDeleted && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? '');

    if (!verifyCsrf($_POST['csrf_token'] ?? null)) {
        $flashError = 'Invalid or expired security token. Please reload the page and submit again.';
    } elseif ($action === 'test_connection') {
        $dbPassword = (string)($_POST['db_password'] ?? '');
        if ($form['db_name'] === '' || $form['db_user'] === '') {
            $flashError = 'Please provide both Database Name and Database Username before testing.';
        } else {
            [$conn, $connErr] = openMysqlConnection($form, $dbPassword);
            if ($conn instanceof mysqli) {
                $serverInfo = $conn->server_info ?: 'MySQL Connected';
                $res = @$conn->query('SHOW TABLES');
                $tableCount = $res ? (int)$res->num_rows : 0;
                if ($res instanceof mysqli_result) {
                    $res->free();
                }
                $conn->close();
                $testResult = [
                    'ok' => true,
                    'server' => $serverInfo,
                    'existingTables' => $tableCount,
                ];
                $flashSuccess = 'Database connection succeeded! MySQL server version: ' . $serverInfo . ' (existing tables: ' . $tableCount . ').';
            } else {
                $flashError = $connErr;
            }
        }
    } elseif ($action === 'install') {
        $dbPassword = (string)($_POST['db_password'] ?? '');
        $adminPassword = (string)($_POST['admin_password'] ?? '');
        $vtuApiKey = trim((string)($_POST['vtu_api_key'] ?? ''));
        $billstackSecret = trim((string)($_POST['billstack_secret'] ?? ''));
        $billstackPublic = trim((string)($_POST['billstack_public'] ?? ''));

        if ($form['db_name'] === '' || $form['db_user'] === '') {
            $flashError = 'Database Name and Database Username are required.';
        } elseif (!filter_var($form['admin_email'], FILTER_VALIDATE_EMAIL)) {
            $flashError = 'Please enter a valid Admin Email address.';
        } elseif (strlen($adminPassword) < 8) {
            $flashError = 'Admin Password must be at least 8 characters long.';
        } elseif (!preg_match('/^\d{4}$/', $form['admin_pin'])) {
            $flashError = 'Admin Transaction PIN must be exactly 4 digits.';
        } else {
            [$conn, $connErr] = openMysqlConnection($form, $dbPassword);
            if (!$conn instanceof mysqli) {
                $flashError = $connErr;
            } else {
                try {
                    foreach (buildSchemaStatements() as $ddl) {
                        if (!$conn->query($ddl)) {
                            throw new RuntimeException('Schema creation error: ' . $conn->error);
                        }
                    }

                    $adminHash = hashPasswordNodeCompatible($adminPassword);
                    $counts = seedSystemData($conn, $form, $adminHash, $vtuApiKey);
                    $conn->close();

                    // Safely select target directory for .env (restricted whitelist)
                    $envDir = $form['env_target'] === 'parent' ? $parentDir : $currentDir;
                    $envPath = $envDir . DIRECTORY_SEPARATOR . '.env';
                    $envLines = [
                        '# Generated by NAEEM DATA SUB public_html installer on ' . gmdate('Y-m-d\TH:i:s\Z'),
                        'NODE_ENV="production"',
                        'PORT="3000"',
                        'MYSQL_HOST=' . sanitizeEnvValue($form['db_host']),
                        'MYSQL_PORT=' . sanitizeEnvValue((string)$form['db_port']),
                        'MYSQL_SOCKET_PATH=' . sanitizeEnvValue($form['db_socket']),
                        'MYSQL_USER=' . sanitizeEnvValue($form['db_user']),
                        'MYSQL_PASSWORD=' . sanitizeEnvValue($dbPassword),
                        'MYSQL_DATABASE=' . sanitizeEnvValue($form['db_name']),
                        'MYSQL_SSL=' . sanitizeEnvValue($form['db_ssl'] ? 'true' : 'false'),
                        'ADMIN_DEFAULT_PASSWORD=' . sanitizeEnvValue($adminPassword),
                    ];
                    if ($vtuApiKey !== '') {
                        $envLines[] = 'VTUNAIJA_API_KEY=' . sanitizeEnvValue($vtuApiKey);
                    }
                    if ($billstackSecret !== '') {
                        $envLines[] = 'BILLSTACK_SECRET_KEY=' . sanitizeEnvValue($billstackSecret);
                    }
                    if ($billstackPublic !== '') {
                        $envLines[] = 'BILLSTACK_PUBLIC_KEY=' . sanitizeEnvValue($billstackPublic);
                    }

                    $envWritten = @file_put_contents($envPath, implode("\n", $envLines) . "\n");
                    if ($envWritten !== false) {
                        @chmod($envPath, 0600);
                    }

                    $htaccessWritten = writeSecurityHtaccess($currentDir);

                    $lockPayload = json_encode([
                        'installed' => true,
                        'installedAt' => gmdate('Y-m-d\TH:i:s\Z'),
                        'platformName' => $form['platform_name'],
                        'database' => $form['db_name'],
                        'adminEmail' => $form['admin_email'],
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                    @file_put_contents($lockFileCurrent, $lockPayload . "\n");
                    @chmod($lockFileCurrent, 0600);

                    $isLocked = true;
                    $installSummary = [
                        'counts' => $counts,
                        'envWritten' => $envWritten !== false,
                        'envLocation' => $form['env_target'] === 'parent' ? '../.env' : './.env',
                        'htaccessWritten' => $htaccessWritten,
                        'adminEmail' => $form['admin_email'],
                    ];
                    $flashSuccess = 'System and all 17 MySQL tables installed and seeded successfully!';
                } catch (Throwable $ex) {
                    if ($conn instanceof mysqli) {
                        @$conn->close();
                    }
                    $flashError = 'Installation error: ' . $ex->getMessage();
                }
            }
        }
    }
}

$phpOk = version_compare(PHP_VERSION, '7.4.0', '>=');
$mysqliOk = extension_loaded('mysqli');
$dirWritable = is_writable($currentDir);
$parentWritable = is_writable($parentDir);
$frontendPresent = is_file($currentDir . DIRECTORY_SEPARATOR . 'index.html');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NAEEM DATA SUB — System &amp; MySQL Installer</title>
  <style>
    :root {
      --bg: #f4f7f5;
      --card: #ffffff;
      --ink: #0f172a;
      --muted: #475569;
      --border: #e2e8f0;
      --brand: #059669;
      --brand-dark: #047857;
      --brand-soft: #ecfdf5;
      --danger: #dc2626;
      --danger-soft: #fef2f2;
      --warn: #d97706;
      --warn-soft: #fffbeb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.5;
      padding: 24px 16px 64px;
    }
    .wrap { max-width: 860px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #064e3b, #059669);
      color: #fff;
      border-radius: 18px;
      padding: 28px;
      margin-bottom: 20px;
      box-shadow: 0 12px 30px rgba(5, 150, 105, 0.16);
    }
    .header h1 { margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 0; color: rgba(255,255,255,0.88); font-size: 14px; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 18px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }
    .card h2 { margin: 0 0 14px; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .ok { background: var(--brand-soft); color: var(--brand-dark); }
    .bad { background: var(--danger-soft); color: var(--danger); }
    .checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
    .check-item {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
    label { display: block; font-size: 12.5px; font-weight: 600; color: var(--muted); margin-bottom: 5px; }
    input[type="text"], input[type="email"], input[type="password"], input[type="number"], select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 14px;
      background: #fff;
      color: var(--ink);
    }
    input:focus, select:focus {
      outline: none;
      border-color: var(--brand);
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.14);
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 13.5px;
      color: var(--ink);
    }
    .alert {
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 18px;
      font-size: 14px;
      font-weight: 500;
    }
    .alert-err { background: var(--danger-soft); color: #991b1b; border: 1px solid #fecaca; }
    .alert-ok { background: var(--brand-soft); color: #065f46; border: 1px solid #a7f3d0; }
    .alert-warn { background: var(--warn-soft); color: #92400e; border: 1px solid #fde68a; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
    .btn {
      appearance: none;
      border: 0;
      border-radius: 10px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-primary { background: var(--brand); color: #fff; }
    .btn-primary:hover { background: var(--brand-dark); }
    .btn-secondary { background: #e2e8f0; color: var(--ink); }
    .btn-danger { background: var(--danger); color: #fff; }
    .summary-list { margin: 12px 0 0; padding-left: 18px; font-size: 14px; color: var(--muted); }
    .summary-list li { margin-bottom: 5px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 5px; font-size: 12.5px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>NAEEM DATA SUB — cPanel Automated Installer</h1>
      <p>Automatically creates all 17 MySQL database tables, seeds service catalogs, secures <code>.htaccess</code>, writes <code>.env</code>, and provisions your Super Admin account.</p>
    </div>

    <?php if ($flashError !== ''): ?>
      <div class="alert alert-err"><?php echo e($flashError); ?></div>
    <?php endif; ?>

    <?php if ($flashSuccess !== ''): ?>
      <div class="alert alert-ok"><?php echo e($flashSuccess); ?></div>
    <?php endif; ?>

    <?php if ($selfDeleted): ?>
      <div class="card">
        <h2>Installer Removed</h2>
        <p><code>setup.php</code> has been permanently deleted from your <code>public_html</code> folder. Your system is locked and ready.</p>
        <div class="actions">
          <a class="btn btn-primary" href="/">Open Platform Home</a>
        </div>
      </div>
    <?php elseif ($isLocked): ?>
      <div class="card">
        <h2>System Installed &amp; Protected</h2>
        <?php if ($installSummary !== null): ?>
          <p>Your MySQL database and platform settings have been provisioned:</p>
          <ul class="summary-list">
            <li><strong>17 MySQL Tables Created:</strong> <code>users</code>, <code>data_plans</code>, <code>airtime_discounts</code>, <code>electricity_discos</code>, <code>cable_packages</code>, <code>exam_pins</code>, <code>transactions</code>, <code>wallet_ledger</code>, <code>virtual_accounts</code>, <code>support_tickets</code>, <code>manual_funding_requests</code>, <code>notifications</code>, <code>providers</code>, <code>system_settings</code>, <code>audit_logs</code>, <code>webhook_logs</code>, <code>deleted_tombstones</code></li>
            <li><strong>Seeded Catalogs:</strong> <?php echo (int)$installSummary['counts']['dataPlans']; ?> Data Plans, <?php echo (int)$installSummary['counts']['airtimeDiscounts']; ?> Airtime Networks, <?php echo (int)$installSummary['counts']['electricityDiscos']; ?> Electricity Discos, <?php echo (int)$installSummary['counts']['cablePackages']; ?> Cable Packages, <?php echo (int)$installSummary['counts']['examPins']; ?> Exam PINs</li>
            <li><strong>Super Admin Created:</strong> <code><?php echo e($installSummary['adminEmail']); ?></code></li>
            <li><strong>Environment File:</strong> <?php echo $installSummary['envWritten'] ? 'Saved cleanly at <code>' . e($installSummary['envLocation']) . '</code> (chmod 0600)' : 'Could not write .env automatically — copy your MySQL vars into .env'; ?></li>
            <li><strong>Apache Rules:</strong> <?php echo $installSummary['htaccessWritten'] ? 'Updated <code>.htaccess</code> to block web access to <code>.env*</code>, <code>*.sql</code>, and <code>.install.lock</code>' : 'Please verify <code>.htaccess</code> protection in <code>public_html</code>'; ?></li>
          </ul>
        <?php else: ?>
          <p>An installation lock file (<code>.install.lock</code>) is already present. Re-running setup is disabled to protect your live database.</p>
          <p style="font-size:13px; color:var(--muted);">If you intentionally want to re-run installation, delete <code>.install.lock</code> via cPanel File Manager first.</p>
        <?php endif; ?>

        <div class="alert alert-warn" style="margin-top:16px; margin-bottom:0;">
          <strong>Security Recommendation:</strong> Delete <code>setup.php</code> from <code>public_html</code> right now so nobody else can access the installer link.
        </div>

        <form method="post" class="actions">
          <input type="hidden" name="csrf_token" value="<?php echo e($csrfToken); ?>" />
          <input type="hidden" name="action" value="delete_installer" />
          <a class="btn btn-primary" href="/">Go to Platform</a>
          <button type="submit" class="btn btn-danger">Delete setup.php Now</button>
        </form>
      </div>
    <?php else: ?>
      <div class="card">
        <h2>1. Hosting Environment Check</h2>
        <div class="checks">
          <div class="check-item">
            <span>PHP <?php echo e(PHP_VERSION); ?></span>
            <span class="badge <?php echo $phpOk ? 'ok' : 'bad'; ?>"><?php echo $phpOk ? 'Ready' : 'Upgrade PHP'; ?></span>
          </div>
          <div class="check-item">
            <span>MySQLi Extension</span>
            <span class="badge <?php echo $mysqliOk ? 'ok' : 'bad'; ?>"><?php echo $mysqliOk ? 'Enabled' : 'Missing'; ?></span>
          </div>
          <div class="check-item">
            <span>public_html Writable</span>
            <span class="badge <?php echo $dirWritable ? 'ok' : 'bad'; ?>"><?php echo $dirWritable ? 'Writable' : 'Read-Only'; ?></span>
          </div>
          <div class="check-item">
            <span>App Frontend</span>
            <span class="badge <?php echo $frontendPresent ? 'ok' : 'bad'; ?>"><?php echo $frontendPresent ? 'Detected' : 'Upload dist/*'; ?></span>
          </div>
        </div>
      </div>

      <form method="post" autocomplete="off">
        <input type="hidden" name="csrf_token" value="<?php echo e($csrfToken); ?>" />

        <div class="card">
          <h2>2. MySQL Database Credentials</h2>
          <div class="grid">
            <div>
              <label for="db_host">MySQL Host</label>
              <input id="db_host" type="text" name="db_host" value="<?php echo e($form['db_host']); ?>" placeholder="localhost" required />
            </div>
            <div>
              <label for="db_port">Port</label>
              <input id="db_port" type="number" name="db_port" value="<?php echo (int)$form['db_port']; ?>" min="1" max="65535" required />
            </div>
            <div>
              <label for="db_socket">Unix Socket (optional)</label>
              <input id="db_socket" type="text" name="db_socket" value="<?php echo e($form['db_socket']); ?>" placeholder="/var/lib/mysql/mysql.sock" />
            </div>
            <div>
              <label for="db_name">Database Name</label>
              <input id="db_name" type="text" name="db_name" value="<?php echo e($form['db_name']); ?>" placeholder="cpaneluser_dbname" required />
            </div>
            <div>
              <label for="db_user">Database Username</label>
              <input id="db_user" type="text" name="db_user" value="<?php echo e($form['db_user']); ?>" placeholder="cpaneluser_dbuser" required />
            </div>
            <div>
              <label for="db_password">Database Password</label>
              <input id="db_password" type="password" name="db_password" value="" placeholder="Enter MySQL password" />
            </div>
            <div>
              <label for="env_target">.env Output Location</label>
              <select id="env_target" name="env_target">
                <option value="current" <?php echo $form['env_target'] === 'current' ? 'selected' : ''; ?>>Inside current folder (protected by .htaccess)</option>
                <?php if ($parentWritable): ?>
                  <option value="parent" <?php echo $form['env_target'] === 'parent' ? 'selected' : ''; ?>>Parent folder above public_html (../.env)</option>
                <?php endif; ?>
              </select>
            </div>
          </div>
          <label class="checkbox-row">
            <input type="checkbox" name="db_ssl" <?php echo $form['db_ssl'] ? 'checked' : ''; ?> />
            <span>Enable SSL/TLS for remote MySQL host (leave unchecked for cPanel <code>localhost</code>)</span>
          </label>
          <div class="actions">
            <button type="submit" name="action" value="test_connection" class="btn btn-secondary" formnovalidate>Test MySQL Connection</button>
          </div>
        </div>

        <div class="card">
          <h2>3. Platform Branding &amp; Super Admin Account</h2>
          <div class="grid">
            <div>
              <label for="platform_name">Platform Name</label>
              <input id="platform_name" type="text" name="platform_name" value="<?php echo e($form['platform_name']); ?>" required />
            </div>
            <div>
              <label for="tagline">Tagline</label>
              <input id="tagline" type="text" name="tagline" value="<?php echo e($form['tagline']); ?>" required />
            </div>
            <div>
              <label for="support_email">Support Email</label>
              <input id="support_email" type="email" name="support_email" value="<?php echo e($form['support_email']); ?>" required />
            </div>
            <div>
              <label for="support_phone">Support Phone</label>
              <input id="support_phone" type="text" name="support_phone" value="<?php echo e($form['support_phone']); ?>" required />
            </div>
            <div>
              <label for="admin_name">Super Admin Name</label>
              <input id="admin_name" type="text" name="admin_name" value="<?php echo e($form['admin_name']); ?>" required />
            </div>
            <div>
              <label for="admin_email">Super Admin Email</label>
              <input id="admin_email" type="email" name="admin_email" value="<?php echo e($form['admin_email']); ?>" required />
            </div>
            <div>
              <label for="admin_phone">Super Admin Phone</label>
              <input id="admin_phone" type="text" name="admin_phone" value="<?php echo e($form['admin_phone']); ?>" required />
            </div>
            <div>
              <label for="admin_pin">Admin Transaction PIN (4 digits)</label>
              <input id="admin_pin" type="text" name="admin_pin" maxlength="4" pattern="\d{4}" value="<?php echo e($form['admin_pin']); ?>" required />
            </div>
            <div>
              <label for="admin_password">Super Admin Password (min 8 chars)</label>
              <input id="admin_password" type="password" name="admin_password" minlength="8" placeholder="Create strong admin password" required />
            </div>
          </div>
          <label class="checkbox-row">
            <input type="checkbox" name="seed_demo_accounts" <?php echo $form['seed_demo_accounts'] ? 'checked' : ''; ?> />
            <span>Include sample customer &amp; reseller starter accounts in database</span>
          </label>
        </div>

        <div class="card">
          <h2>4. Payment &amp; VTU Gateway Settings (Optional)</h2>
          <div class="grid">
            <div>
              <label for="bank_name">Manual Funding Bank Name</label>
              <input id="bank_name" type="text" name="bank_name" value="<?php echo e($form['bank_name']); ?>" />
            </div>
            <div>
              <label for="account_number">Manual Funding Account Number</label>
              <input id="account_number" type="text" name="account_number" value="<?php echo e($form['account_number']); ?>" />
            </div>
            <div>
              <label for="account_name">Manual Funding Account Name</label>
              <input id="account_name" type="text" name="account_name" value="<?php echo e($form['account_name']); ?>" />
            </div>
            <div>
              <label for="vtu_api_key">VTUNaija API Key (optional)</label>
              <input id="vtu_api_key" type="password" name="vtu_api_key" placeholder="Configure now or later in Admin" />
            </div>
            <div>
              <label for="billstack_secret">BillStack Secret Key (optional)</label>
              <input id="billstack_secret" type="password" name="billstack_secret" placeholder="Optional" />
            </div>
            <div>
              <label for="billstack_public">BillStack Public Key (optional)</label>
              <input id="billstack_public" type="password" name="billstack_public" placeholder="Optional" />
            </div>
          </div>

          <div class="actions">
            <button type="submit" name="action" value="install" class="btn btn-primary">Install System &amp; Create All Database Tables</button>
          </div>
        </div>
      </form>
    <?php endif; ?>
  </div>
</body>
</html>
