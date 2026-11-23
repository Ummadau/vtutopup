import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import type {
  User,
  DataPlan,
  AirtimeDiscount,
  ElectricityDisco,
  CablePackage,
  ExamPin,
  Transaction,
  WalletLedgerEntry,
  SupportTicket,
  NotificationItem,
  ProviderConfig,
  SystemSettings,
  AuditLog,
  VirtualAccount,
  VTUNaijaConfig,
  NCWalletConfig,
  UnityBillsConfig,
  ServiceRoutingConfig,
  ManualFundingConfig,
  ManualFundingRequest,
} from '../src/types/index.ts';

export type TombstoneCollection =
  | 'users'
  | 'dataPlans'
  | 'electricityDiscos'
  | 'cablePackages'
  | 'examPins';

export interface MysqlDatabaseAdapter {
  users: Map<string, User & { passwordHash?: string }>;
  dataPlans: Map<string, DataPlan>;
  airtimeDiscounts: Map<string, AirtimeDiscount>;
  electricityDiscos: Map<string, ElectricityDisco>;
  cablePackages: Map<string, CablePackage>;
  examPins: Map<string, ExamPin>;
  transactions: Map<string, Transaction>;
  ledger: WalletLedgerEntry[];
  tickets: Map<string, SupportTicket>;
  notifications: Map<string, NotificationItem>;
  providers: Map<string, ProviderConfig>;
  vtuNaijaConfig: VTUNaijaConfig;
  ncWalletConfig: NCWalletConfig;
  unityBillsConfig: UnityBillsConfig;
  serviceRouting: ServiceRoutingConfig;
  settings: SystemSettings;
  manualFundingConfig: ManualFundingConfig;
  manualFundingRequests: Map<string, ManualFundingRequest>;
  deletedIds: Record<TombstoneCollection, string[]>;
  catalogBootstrapped: boolean;
  auditLogs: AuditLog[];
  virtualAccounts: Map<string, VirtualAccount[]>;
  saveToDisk: () => void;
}

let poolInstance: Pool | null = null;
let schemaInitialized = false;
let mysqlAvailable = false;

export function isMysqlConfigured(): boolean {
  const host = (process.env.MYSQL_HOST || '').trim();
  const socketPath = (process.env.MYSQL_SOCKET_PATH || '').trim();
  const user = (process.env.MYSQL_USER || '').trim();
  const database = (process.env.MYSQL_DATABASE || '').trim();
  return Boolean((host || socketPath) && user && database);
}

export function isMysqlActive(): boolean {
  return isMysqlConfigured() && mysqlAvailable;
}

export function getMysqlPool(): Pool | null {
  if (!isMysqlConfigured()) return null;
  if (poolInstance) return poolInstance;

  const host = (process.env.MYSQL_HOST || 'localhost').trim();
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10) || 3306;
  const socketPath = (process.env.MYSQL_SOCKET_PATH || '').trim();
  const user = (process.env.MYSQL_USER || '').trim();
  const password = process.env.MYSQL_PASSWORD || '';
  const database = (process.env.MYSQL_DATABASE || '').trim();
  const useSsl = ['true', '1', 'yes'].includes((process.env.MYSQL_SSL || '').trim().toLowerCase());

  poolInstance = mysql.createPool({
    ...(socketPath ? { socketPath } : { host, port }),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    connectTimeout: 5000,
    charset: 'utf8mb4',
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  return poolInstance;
}

export function getActiveMysqlPool(): Pool | null {
  return isMysqlActive() ? getMysqlPool() : null;
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeLogMysqlWarning(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[MySQL ${scope}]: ${message}`);
}

const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`phone\` VARCHAR(64) NOT NULL DEFAULT '',
    \`role\` VARCHAR(32) NOT NULL DEFAULT 'customer',
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
    \`is_verified\` TINYINT(1) NOT NULL DEFAULT 1,
    \`avatar\` TEXT NULL,
    \`referral_code\` VARCHAR(64) NOT NULL DEFAULT '',
    \`referred_by\` VARCHAR(64) NULL,
    \`wallet_balance\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`total_savings\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`referral_earnings\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`total_transactions_count\` INT NOT NULL DEFAULT 0,
    \`transaction_pin\` VARCHAR(16) NOT NULL DEFAULT '1234',
    \`password_hash\` VARCHAR(255) NULL,
    \`biometric_credential_id\` TEXT NULL,
    \`nin\` VARCHAR(64) NULL,
    \`bvn\` VARCHAR(64) NULL,
    \`created_at\` VARCHAR(64) NOT NULL,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`idx_users_email\` (\`email\`),
    KEY \`idx_users_phone\` (\`phone\`),
    KEY \`idx_users_referral_code\` (\`referral_code\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`virtual_accounts\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`user_id\` VARCHAR(191) NOT NULL,
    \`bank_name\` VARCHAR(191) NOT NULL,
    \`bank_id\` VARCHAR(64) NULL,
    \`account_number\` VARCHAR(64) NOT NULL,
    \`account_name\` VARCHAR(191) NOT NULL,
    \`reference\` VARCHAR(191) NULL,
    \`deposit_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    \`provider\` VARCHAR(64) NOT NULL DEFAULT 'billstack',
    \`created_at\` VARCHAR(64) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`idx_virtual_user_acct\` (\`user_id\`, \`account_number\`),
    KEY \`idx_virtual_acct_num\` (\`account_number\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`data_plans\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`plan_id\` VARCHAR(128) NOT NULL,
    \`network\` VARCHAR(32) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`size\` VARCHAR(64) NOT NULL,
    \`validity\` VARCHAR(64) NOT NULL,
    \`plan_code\` VARCHAR(128) NOT NULL,
    \`plan_type\` VARCHAR(64) NOT NULL DEFAULT 'SME',
    \`provider_cost\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`customer_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`reseller_price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_data_plans_network\` (\`network\`),
    KEY \`idx_data_plans_active\` (\`is_active\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`airtime_discounts\` (
    \`network\` VARCHAR(64) NOT NULL,
    \`plan_id\` VARCHAR(128) NULL,
    \`customer_discount_percent\` DECIMAL(6,2) NOT NULL DEFAULT 2.00,
    \`reseller_discount_percent\` DECIMAL(6,2) NOT NULL DEFAULT 3.50,
    \`provider_cost_percent\` DECIMAL(6,2) NOT NULL DEFAULT 4.50,
    \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`network\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`electricity_discos\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`plan_id\` VARCHAR(128) NULL,
    \`network_id\` VARCHAR(128) NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(64) NOT NULL,
    \`short_name\` VARCHAR(128) NOT NULL,
    \`service_fee\` DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`cable_packages\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`plan_id\` VARCHAR(128) NULL,
    \`network_id\` VARCHAR(128) NULL,
    \`provider\` VARCHAR(64) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(128) NOT NULL,
    \`price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`provider_cost\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_cable_provider\` (\`provider\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`exam_pins\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`plan_id\` VARCHAR(128) NULL,
    \`network_id\` VARCHAR(128) NULL,
    \`exam\` VARCHAR(64) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`code\` VARCHAR(128) NULL,
    \`price\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`provider_cost\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`stock_available\` INT NOT NULL DEFAULT 0,
    \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`transactions\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`reference\` VARCHAR(191) NOT NULL,
    \`provider_reference\` VARCHAR(191) NULL,
    \`user_id\` VARCHAR(191) NOT NULL,
    \`user_name\` VARCHAR(191) NOT NULL,
    \`user_email\` VARCHAR(191) NOT NULL,
    \`user_phone\` VARCHAR(64) NOT NULL DEFAULT '',
    \`user_role\` VARCHAR(32) NOT NULL DEFAULT 'customer',
    \`service_type\` VARCHAR(64) NOT NULL,
    \`network\` VARCHAR(64) NULL,
    \`network_id\` VARCHAR(64) NULL,
    \`plan_id\` VARCHAR(128) NULL,
    \`recipient\` VARCHAR(191) NOT NULL,
    \`plan_name\` VARCHAR(191) NULL,
    \`amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`provider_cost\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`profit\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`status\` VARCHAR(32) NOT NULL,
    \`token\` TEXT NULL,
    \`payment_method\` VARCHAR(128) NULL,
    \`failure_reason\` TEXT NULL,
    \`description\` TEXT NULL,
    \`date\` VARCHAR(64) NOT NULL,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_tx_user_id\` (\`user_id\`),
    KEY \`idx_tx_reference\` (\`reference\`),
    KEY \`idx_tx_status\` (\`status\`),
    KEY \`idx_tx_date\` (\`date\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`wallet_ledger\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`user_id\` VARCHAR(191) NOT NULL,
    \`reference\` VARCHAR(191) NOT NULL,
    \`type\` VARCHAR(16) NOT NULL,
    \`amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`balance_before\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`balance_after\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`description\` TEXT NOT NULL,
    \`timestamp\` VARCHAR(64) NOT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_ledger_user\` (\`user_id\`),
    KEY \`idx_ledger_reference\` (\`reference\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`support_tickets\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`user_id\` VARCHAR(191) NOT NULL,
    \`user_name\` VARCHAR(191) NOT NULL,
    \`user_email\` VARCHAR(191) NOT NULL,
    \`subject\` VARCHAR(191) NOT NULL,
    \`category\` VARCHAR(64) NOT NULL,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'open',
    \`priority\` VARCHAR(32) NOT NULL DEFAULT 'medium',
    \`messages_json\` LONGTEXT NOT NULL,
    \`created_at\` VARCHAR(64) NOT NULL,
    \`updated_at\` VARCHAR(64) NOT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_tickets_user\` (\`user_id\`),
    KEY \`idx_tickets_status\` (\`status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`manual_funding_requests\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`user_id\` VARCHAR(191) NOT NULL,
    \`user_name\` VARCHAR(191) NOT NULL,
    \`user_email\` VARCHAR(191) NOT NULL,
    \`user_phone\` VARCHAR(64) NOT NULL DEFAULT '',
    \`amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`sender_name\` VARCHAR(191) NOT NULL,
    \`sender_bank\` VARCHAR(191) NOT NULL,
    \`payment_reference\` VARCHAR(191) NOT NULL,
    \`note\` TEXT NULL,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'pending',
    \`rejection_reason\` TEXT NULL,
    \`created_at\` VARCHAR(64) NOT NULL,
    \`updated_at\` VARCHAR(64) NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_mfr_user\` (\`user_id\`),
    KEY \`idx_mfr_status\` (\`status\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`notifications\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`user_id\` VARCHAR(191) NOT NULL,
    \`title\` VARCHAR(191) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`type\` VARCHAR(32) NOT NULL DEFAULT 'info',
    \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
    \`created_at\` VARCHAR(64) NOT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_notif_user\` (\`user_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`providers\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`base_url\` VARCHAR(255) NOT NULL,
    \`api_key\` TEXT NOT NULL,
    \`secret_key\` TEXT NULL,
    \`is_primary\` TINYINT(1) NOT NULL DEFAULT 0,
    \`is_backup\` TINYINT(1) NOT NULL DEFAULT 0,
    \`is_live\` TINYINT(1) NOT NULL DEFAULT 1,
    \`balance\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    \`status\` VARCHAR(32) NOT NULL DEFAULT 'connected',
    \`last_ping\` VARCHAR(64) NOT NULL,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`system_settings\` (
    \`setting_key\` VARCHAR(128) NOT NULL,
    \`value_json\` LONGTEXT NOT NULL,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`setting_key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`audit_logs\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`admin_email\` VARCHAR(191) NOT NULL,
    \`action\` VARCHAR(128) NOT NULL,
    \`target\` VARCHAR(191) NOT NULL,
    \`details\` TEXT NOT NULL,
    \`ip\` VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
    \`timestamp\` VARCHAR(64) NOT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_audit_timestamp\` (\`timestamp\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`webhook_logs\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`path\` VARCHAR(191) NOT NULL,
    \`url\` VARCHAR(255) NOT NULL,
    \`method\` VARCHAR(16) NOT NULL,
    \`headers_json\` LONGTEXT NULL,
    \`body_json\` LONGTEXT NULL,
    \`query_json\` LONGTEXT NULL,
    \`ip\` VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
    \`timestamp\` VARCHAR(64) NOT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_whlog_timestamp\` (\`timestamp\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`deleted_tombstones\` (
    \`collection_name\` VARCHAR(64) NOT NULL,
    \`item_id\` VARCHAR(191) NOT NULL,
    \`deleted_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`collection_name\`, \`item_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export async function ensureMysqlSchema(): Promise<boolean> {
  const pool = getMysqlPool();
  if (!pool) return false;
  if (schemaInitialized) return true;

  try {
    for (const ddl of SCHEMA_STATEMENTS) {
      await pool.query(ddl);
    }
    schemaInitialized = true;
    return true;
  } catch (err) {
    safeLogMysqlWarning('Schema Init', err);
    return false;
  }
}

export async function mysqlTestConnection(): Promise<boolean> {
  const pool = getMysqlPool();
  if (!pool) {
    mysqlAvailable = false;
    return false;
  }
  try {
    await pool.query('SELECT 1 AS ok');
    mysqlAvailable = true;
    return true;
  } catch {
    mysqlAvailable = false;
    return false;
  }
}

export async function mysqlMarkDeleted(collection: TombstoneCollection, id: string): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !id) return;
  try {
    await pool.execute(
      'INSERT IGNORE INTO `deleted_tombstones` (`collection_name`, `item_id`) VALUES (?, ?)',
      [collection, id]
    );
  } catch (err) {
    safeLogMysqlWarning('MarkDeleted', err);
  }
}

export async function mysqlUnmarkDeleted(collection: TombstoneCollection, id: string): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !id) return;
  try {
    await pool.execute(
      'DELETE FROM `deleted_tombstones` WHERE `collection_name` = ? AND `item_id` = ?',
      [collection, id]
    );
  } catch (err) {
    safeLogMysqlWarning('UnmarkDeleted', err);
  }
}

export async function mysqlUpsertUser(user: User & { passwordHash?: string }): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !user?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`users\` (
        \`id\`, \`name\`, \`email\`, \`phone\`, \`role\`, \`status\`, \`is_verified\`, \`avatar\`,
        \`referral_code\`, \`referred_by\`, \`wallet_balance\`, \`total_savings\`, \`referral_earnings\`,
        \`total_transactions_count\`, \`transaction_pin\`, \`password_hash\`, \`biometric_credential_id\`,
        \`nin\`, \`bvn\`, \`created_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`email\` = VALUES(\`email\`),
        \`phone\` = VALUES(\`phone\`),
        \`role\` = VALUES(\`role\`),
        \`status\` = VALUES(\`status\`),
        \`is_verified\` = VALUES(\`is_verified\`),
        \`avatar\` = VALUES(\`avatar\`),
        \`referral_code\` = VALUES(\`referral_code\`),
        \`referred_by\` = VALUES(\`referred_by\`),
        \`wallet_balance\` = VALUES(\`wallet_balance\`),
        \`total_savings\` = VALUES(\`total_savings\`),
        \`referral_earnings\` = VALUES(\`referral_earnings\`),
        \`total_transactions_count\` = VALUES(\`total_transactions_count\`),
        \`transaction_pin\` = VALUES(\`transaction_pin\`),
        \`password_hash\` = COALESCE(VALUES(\`password_hash\`), \`password_hash\`),
        \`biometric_credential_id\` = COALESCE(VALUES(\`biometric_credential_id\`), \`biometric_credential_id\`),
        \`nin\` = COALESCE(VALUES(\`nin\`), \`nin\`),
        \`bvn\` = COALESCE(VALUES(\`bvn\`), \`bvn\`)`,
      [
        user.id,
        user.name || '',
        (user.email || '').toLowerCase(),
        user.phone || '',
        user.role || 'customer',
        user.status || 'active',
        user.isVerified ? 1 : 0,
        user.avatar ?? null,
        user.referralCode || '',
        user.referredBy ?? null,
        Number(user.walletBalance || 0),
        Number(user.totalSavings || 0),
        Number(user.referralEarnings || 0),
        Number(user.totalTransactionsCount || 0),
        user.transactionPin || '1234',
        user.passwordHash ?? null,
        user.biometricCredentialId ?? null,
        user.nin ?? null,
        user.bvn ?? null,
        user.createdAt || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertUser', err);
  }
}

export async function mysqlDeleteUser(userId: string): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !userId) return;
  try {
    await mysqlMarkDeleted('users', userId);
    await pool.execute('DELETE FROM `virtual_accounts` WHERE `user_id` = ?', [userId]);
    await pool.execute('DELETE FROM `users` WHERE `id` = ?', [userId]);
  } catch (err) {
    safeLogMysqlWarning('DeleteUser', err);
  }
}

export async function mysqlSaveVirtualAccounts(userId: string, accounts: VirtualAccount[]): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !userId) return;
  try {
    for (const acc of accounts) {
      if (!acc?.accountNumber) continue;
      await pool.execute(
        `INSERT INTO \`virtual_accounts\` (
          \`user_id\`, \`bank_name\`, \`bank_id\`, \`account_number\`, \`account_name\`,
          \`reference\`, \`deposit_fee\`, \`provider\`, \`created_at\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`bank_name\` = VALUES(\`bank_name\`),
          \`bank_id\` = VALUES(\`bank_id\`),
          \`account_name\` = VALUES(\`account_name\`),
          \`reference\` = VALUES(\`reference\`),
          \`deposit_fee\` = VALUES(\`deposit_fee\`),
          \`provider\` = VALUES(\`provider\`)`,
        [
          userId,
          acc.bankName || '',
          acc.bankId ?? null,
          acc.accountNumber,
          acc.accountName || '',
          acc.reference ?? null,
          Number(acc.depositFee || 0),
          acc.provider || 'billstack',
          acc.createdAt || new Date().toISOString(),
        ]
      );
    }
  } catch (err) {
    safeLogMysqlWarning('SaveVirtualAccounts', err);
  }
}

export async function mysqlUpsertDataPlan(plan: DataPlan): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !plan?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`data_plans\` (
        \`id\`, \`plan_id\`, \`network\`, \`name\`, \`size\`, \`validity\`,
        \`plan_code\`, \`plan_type\`, \`provider_cost\`, \`customer_price\`, \`reseller_price\`, \`is_active\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`plan_id\` = VALUES(\`plan_id\`),
        \`network\` = VALUES(\`network\`),
        \`name\` = VALUES(\`name\`),
        \`size\` = VALUES(\`size\`),
        \`validity\` = VALUES(\`validity\`),
        \`plan_code\` = VALUES(\`plan_code\`),
        \`plan_type\` = VALUES(\`plan_type\`),
        \`provider_cost\` = VALUES(\`provider_cost\`),
        \`customer_price\` = VALUES(\`customer_price\`),
        \`reseller_price\` = VALUES(\`reseller_price\`),
        \`is_active\` = VALUES(\`is_active\`)`,
      [
        plan.id,
        String(plan.plan_id || plan.planCode || plan.id),
        plan.network || 'mtn',
        plan.name || '',
        plan.size || '',
        plan.validity || '30 Days',
        String(plan.planCode || plan.plan_id || plan.id),
        plan.planType || 'SME',
        Number(plan.providerCost || 0),
        Number(plan.customerPrice || 0),
        Number(plan.resellerPrice || 0),
        plan.isActive !== false ? 1 : 0,
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertDataPlan', err);
  }
}

export async function mysqlDeleteDataPlan(planId: string): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !planId) return;
  try {
    await mysqlMarkDeleted('dataPlans', planId);
    await pool.execute('DELETE FROM `data_plans` WHERE `id` = ?', [planId]);
  } catch (err) {
    safeLogMysqlWarning('DeleteDataPlan', err);
  }
}

export async function mysqlUpsertAirtimeDiscount(discount: AirtimeDiscount): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !discount?.network) return;
  try {
    const netKey = discount.network.toLowerCase();
    await pool.execute(
      `INSERT INTO \`airtime_discounts\` (
        \`network\`, \`plan_id\`, \`customer_discount_percent\`, \`reseller_discount_percent\`,
        \`provider_cost_percent\`, \`is_active\`
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`plan_id\` = VALUES(\`plan_id\`),
        \`customer_discount_percent\` = VALUES(\`customer_discount_percent\`),
        \`reseller_discount_percent\` = VALUES(\`reseller_discount_percent\`),
        \`provider_cost_percent\` = VALUES(\`provider_cost_percent\`),
        \`is_active\` = VALUES(\`is_active\`)`,
      [
        netKey,
        discount.plan_id ?? null,
        Number(discount.customerDiscountPercent || 0),
        Number(discount.resellerDiscountPercent || 0),
        Number(discount.providerCostPercent || 0),
        discount.isActive !== false ? 1 : 0,
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertAirtimeDiscount', err);
  }
}

export async function mysqlUpsertElectricityDisco(disco: ElectricityDisco): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !disco?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`electricity_discos\` (
        \`id\`, \`plan_id\`, \`network_id\`, \`name\`, \`code\`, \`short_name\`, \`service_fee\`, \`is_active\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`plan_id\` = VALUES(\`plan_id\`),
        \`network_id\` = VALUES(\`network_id\`),
        \`name\` = VALUES(\`name\`),
        \`code\` = VALUES(\`code\`),
        \`short_name\` = VALUES(\`short_name\`),
        \`service_fee\` = VALUES(\`service_fee\`),
        \`is_active\` = VALUES(\`is_active\`)`,
      [
        disco.id,
        disco.plan_id ?? disco.code ?? disco.id,
        disco.network_id ?? disco.code ?? disco.shortName ?? disco.id,
        disco.name || '',
        disco.code || '',
        disco.shortName || '',
        Number(disco.serviceFee || 0),
        disco.isActive !== false ? 1 : 0,
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertElectricityDisco', err);
  }
}

export async function mysqlDeleteElectricityDisco(discoId: string): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !discoId) return;
  try {
    await mysqlMarkDeleted('electricityDiscos', discoId);
    await pool.execute('DELETE FROM `electricity_discos` WHERE `id` = ?', [discoId]);
  } catch (err) {
    safeLogMysqlWarning('DeleteElectricityDisco', err);
  }
}

export async function mysqlUpsertCablePackage(pkg: CablePackage): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !pkg?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`cable_packages\` (
        \`id\`, \`plan_id\`, \`network_id\`, \`provider\`, \`name\`, \`code\`, \`price\`, \`provider_cost\`, \`is_active\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`plan_id\` = VALUES(\`plan_id\`),
        \`network_id\` = VALUES(\`network_id\`),
        \`provider\` = VALUES(\`provider\`),
        \`name\` = VALUES(\`name\`),
        \`code\` = VALUES(\`code\`),
        \`price\` = VALUES(\`price\`),
        \`provider_cost\` = VALUES(\`provider_cost\`),
        \`is_active\` = VALUES(\`is_active\`)`,
      [
        pkg.id,
        pkg.plan_id ?? pkg.code ?? pkg.id,
        pkg.network_id ?? pkg.provider ?? 'cable',
        pkg.provider || 'dstv',
        pkg.name || '',
        pkg.code || '',
        Number(pkg.price || 0),
        Number(pkg.providerCost || 0),
        pkg.isActive !== false ? 1 : 0,
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertCablePackage', err);
  }
}

export async function mysqlDeleteCablePackage(packageId: string): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !packageId) return;
  try {
    await mysqlMarkDeleted('cablePackages', packageId);
    await pool.execute('DELETE FROM `cable_packages` WHERE `id` = ?', [packageId]);
  } catch (err) {
    safeLogMysqlWarning('DeleteCablePackage', err);
  }
}

export async function mysqlUpsertExamPin(pin: ExamPin): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !pin?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`exam_pins\` (
        \`id\`, \`plan_id\`, \`network_id\`, \`exam\`, \`name\`, \`code\`, \`price\`,
        \`provider_cost\`, \`stock_available\`, \`is_active\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`plan_id\` = VALUES(\`plan_id\`),
        \`network_id\` = VALUES(\`network_id\`),
        \`exam\` = VALUES(\`exam\`),
        \`name\` = VALUES(\`name\`),
        \`code\` = VALUES(\`code\`),
        \`price\` = VALUES(\`price\`),
        \`provider_cost\` = VALUES(\`provider_cost\`),
        \`stock_available\` = VALUES(\`stock_available\`),
        \`is_active\` = VALUES(\`is_active\`)`,
      [
        pin.id,
        pin.plan_id ?? pin.code ?? pin.exam ?? pin.id,
        pin.network_id ?? pin.exam ?? 'exam',
        pin.exam || 'WAEC',
        pin.name || '',
        pin.code ?? null,
        Number(pin.price || 0),
        Number(pin.providerCost || 0),
        Number(pin.stockAvailable || 0),
        pin.isActive !== false ? 1 : 0,
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertExamPin', err);
  }
}

export async function mysqlDeleteExamPin(pinId: string): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !pinId) return;
  try {
    await mysqlMarkDeleted('examPins', pinId);
    await pool.execute('DELETE FROM `exam_pins` WHERE `id` = ?', [pinId]);
  } catch (err) {
    safeLogMysqlWarning('DeleteExamPin', err);
  }
}

export async function mysqlUpsertTransaction(tx: Transaction): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !tx?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`transactions\` (
        \`id\`, \`reference\`, \`provider_reference\`, \`user_id\`, \`user_name\`, \`user_email\`,
        \`user_phone\`, \`user_role\`, \`service_type\`, \`network\`, \`network_id\`, \`plan_id\`,
        \`recipient\`, \`plan_name\`, \`amount\`, \`provider_cost\`, \`profit\`, \`status\`,
        \`token\`, \`payment_method\`, \`failure_reason\`, \`description\`, \`date\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`provider_reference\` = COALESCE(VALUES(\`provider_reference\`), \`provider_reference\`),
        \`status\` = VALUES(\`status\`),
        \`token\` = COALESCE(VALUES(\`token\`), \`token\`),
        \`failure_reason\` = COALESCE(VALUES(\`failure_reason\`), \`failure_reason\`),
        \`profit\` = VALUES(\`profit\`),
        \`description\` = COALESCE(VALUES(\`description\`), \`description\`)`,
      [
        tx.id,
        tx.reference || tx.id,
        tx.providerReference ?? null,
        tx.userId || '',
        tx.userName || '',
        tx.userEmail || '',
        tx.userPhone || '',
        tx.userRole || 'customer',
        tx.serviceType || 'data',
        tx.network ?? null,
        tx.networkId ?? null,
        tx.plan_id ?? tx.planId ?? null,
        tx.recipient || '',
        tx.planName ?? null,
        Number(tx.amount || 0),
        Number(tx.providerCost || 0),
        Number(tx.profit || 0),
        tx.status || 'pending',
        tx.token ?? null,
        tx.paymentMethod ?? null,
        tx.failureReason ?? null,
        tx.description ?? null,
        tx.date || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertTransaction', err);
  }
}

export async function mysqlInsertLedgerEntry(entry: WalletLedgerEntry): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !entry?.id) return;
  try {
    await pool.execute(
      `INSERT IGNORE INTO \`wallet_ledger\` (
        \`id\`, \`user_id\`, \`reference\`, \`type\`, \`amount\`,
        \`balance_before\`, \`balance_after\`, \`description\`, \`timestamp\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.userId,
        entry.reference,
        entry.type,
        Number(entry.amount || 0),
        Number(entry.balanceBefore || 0),
        Number(entry.balanceAfter || 0),
        entry.description || '',
        entry.timestamp || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('InsertLedger', err);
  }
}

export async function mysqlUpsertTicket(ticket: SupportTicket): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !ticket?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`support_tickets\` (
        \`id\`, \`user_id\`, \`user_name\`, \`user_email\`, \`subject\`, \`category\`,
        \`status\`, \`priority\`, \`messages_json\`, \`created_at\`, \`updated_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`status\` = VALUES(\`status\`),
        \`priority\` = VALUES(\`priority\`),
        \`messages_json\` = VALUES(\`messages_json\`),
        \`updated_at\` = VALUES(\`updated_at\`)`,
      [
        ticket.id,
        ticket.userId,
        ticket.userName || '',
        ticket.userEmail || '',
        ticket.subject || '',
        ticket.category || 'General',
        ticket.status || 'open',
        ticket.priority || 'medium',
        JSON.stringify(ticket.messages || []),
        ticket.createdAt || new Date().toISOString(),
        ticket.updatedAt || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertTicket', err);
  }
}

export async function mysqlUpsertManualFundingRequest(req: ManualFundingRequest): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !req?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`manual_funding_requests\` (
        \`id\`, \`user_id\`, \`user_name\`, \`user_email\`, \`user_phone\`, \`amount\`,
        \`sender_name\`, \`sender_bank\`, \`payment_reference\`, \`note\`,
        \`status\`, \`rejection_reason\`, \`created_at\`, \`updated_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`status\` = VALUES(\`status\`),
        \`rejection_reason\` = VALUES(\`rejection_reason\`),
        \`updated_at\` = VALUES(\`updated_at\`)`,
      [
        req.id,
        req.userId,
        req.userName || '',
        req.userEmail || '',
        req.userPhone || '',
        Number(req.amount || 0),
        req.senderName || '',
        req.senderBank || '',
        req.paymentReference || '',
        req.note ?? '',
        req.status || 'pending',
        req.rejectionReason ?? null,
        req.createdAt || new Date().toISOString(),
        req.updatedAt ?? null,
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertManualFundingRequest', err);
  }
}

export async function mysqlUpsertNotification(notif: NotificationItem): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !notif?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`notifications\` (
        \`id\`, \`user_id\`, \`title\`, \`message\`, \`type\`, \`is_read\`, \`created_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`is_read\` = VALUES(\`is_read\`)`,
      [
        notif.id,
        notif.userId,
        notif.title || '',
        notif.message || '',
        notif.type || 'info',
        notif.read ? 1 : 0,
        notif.createdAt || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertNotification', err);
  }
}

export async function mysqlUpsertProvider(provider: ProviderConfig): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !provider?.id) return;
  try {
    await pool.execute(
      `INSERT INTO \`providers\` (
        \`id\`, \`name\`, \`base_url\`, \`api_key\`, \`secret_key\`,
        \`is_primary\`, \`is_backup\`, \`is_live\`, \`balance\`, \`status\`, \`last_ping\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`base_url\` = VALUES(\`base_url\`),
        \`api_key\` = VALUES(\`api_key\`),
        \`secret_key\` = VALUES(\`secret_key\`),
        \`is_primary\` = VALUES(\`is_primary\`),
        \`is_backup\` = VALUES(\`is_backup\`),
        \`is_live\` = VALUES(\`is_live\`),
        \`balance\` = VALUES(\`balance\`),
        \`status\` = VALUES(\`status\`),
        \`last_ping\` = VALUES(\`last_ping\`)`,
      [
        provider.id,
        provider.name || '',
        provider.baseUrl || '',
        provider.apiKey || '',
        provider.secretKey || '',
        provider.isPrimary ? 1 : 0,
        provider.isBackup ? 1 : 0,
        provider.isLive !== false ? 1 : 0,
        Number(provider.balance || 0),
        provider.status || 'connected',
        provider.lastPing || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('UpsertProvider', err);
  }
}

export async function mysqlSaveSetting(key: string, value: unknown): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !key) return;
  try {
    await pool.execute(
      `INSERT INTO \`system_settings\` (\`setting_key\`, \`value_json\`)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE \`value_json\` = VALUES(\`value_json\`)`,
      [key, JSON.stringify(value ?? {})]
    );
  } catch (err) {
    safeLogMysqlWarning('SaveSetting', err);
  }
}

export async function mysqlGetSetting<T>(key: string): Promise<T | null> {
  const pool = getActiveMysqlPool();
  if (!pool || !key) return null;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT `value_json` FROM `system_settings` WHERE `setting_key` = ? LIMIT 1',
      [key]
    );
    if (!rows.length) return null;
    return safeJsonParse<T | null>(rows[0].value_json, null);
  } catch (err) {
    safeLogMysqlWarning('GetSetting', err);
    return null;
  }
}

export async function mysqlInsertAuditLog(audit: AuditLog): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !audit?.id) return;
  try {
    await pool.execute(
      `INSERT IGNORE INTO \`audit_logs\` (
        \`id\`, \`admin_email\`, \`action\`, \`target\`, \`details\`, \`ip\`, \`timestamp\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        audit.id,
        audit.adminEmail || '',
        audit.action || '',
        audit.target || '',
        audit.details || '',
        audit.ip || '127.0.0.1',
        audit.timestamp || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('InsertAuditLog', err);
  }
}

export interface WebhookLogRecord {
  id: string;
  path: string;
  url: string;
  method: string;
  headers: Record<string, unknown>;
  body: Record<string, unknown> | null;
  query: Record<string, unknown> | null;
  ip: string;
  timestamp: string;
}

export async function mysqlInsertWebhookLog(log: WebhookLogRecord): Promise<void> {
  const pool = getActiveMysqlPool();
  if (!pool || !log?.id) return;
  try {
    await pool.execute(
      `INSERT IGNORE INTO \`webhook_logs\` (
        \`id\`, \`path\`, \`url\`, \`method\`, \`headers_json\`, \`body_json\`, \`query_json\`, \`ip\`, \`timestamp\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.path || '',
        log.url || '',
        log.method || 'POST',
        JSON.stringify(log.headers || {}),
        log.body ? JSON.stringify(log.body) : null,
        log.query ? JSON.stringify(log.query) : null,
        log.ip || '127.0.0.1',
        log.timestamp || new Date().toISOString(),
      ]
    );
  } catch (err) {
    safeLogMysqlWarning('InsertWebhookLog', err);
  }
}

export async function mysqlGetWebhookLogs(limit = 50): Promise<WebhookLogRecord[]> {
  const pool = getActiveMysqlPool();
  if (!pool) return [];
  try {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT `id`, `path`, `url`, `method`, `headers_json`, `body_json`, `query_json`, `ip`, `timestamp` FROM `webhook_logs` ORDER BY `timestamp` DESC LIMIT ?',
      [safeLimit]
    );
    return rows.map(r => ({
      id: String(r.id),
      path: String(r.path || ''),
      url: String(r.url || ''),
      method: String(r.method || 'POST'),
      headers: safeJsonParse<Record<string, unknown>>(r.headers_json, {}),
      body: safeJsonParse<Record<string, unknown> | null>(r.body_json, null),
      query: safeJsonParse<Record<string, unknown> | null>(r.query_json, null),
      ip: String(r.ip || '127.0.0.1'),
      timestamp: String(r.timestamp || ''),
    }));
  } catch (err) {
    safeLogMysqlWarning('GetWebhookLogs', err);
    return [];
  }
}

function mapUserRow(row: RowDataPacket, virtualAccountsMap?: Map<string, VirtualAccount[]>): User & { passwordHash?: string } {
  const uid = String(row.id);
  const accs = virtualAccountsMap?.get(uid);
  return {
    id: uid,
    name: String(row.name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    role: (row.role || 'customer') as User['role'],
    status: (row.status || 'active') as User['status'],
    isVerified: Boolean(row.is_verified),
    avatar: row.avatar ? String(row.avatar) : undefined,
    referralCode: String(row.referral_code || ''),
    referredBy: row.referred_by ? String(row.referred_by) : undefined,
    walletBalance: Number(row.wallet_balance || 0),
    totalSavings: Number(row.total_savings || 0),
    referralEarnings: Number(row.referral_earnings || 0),
    totalTransactionsCount: Number(row.total_transactions_count || 0),
    transactionPin: String(row.transaction_pin || '1234'),
    ...(row.password_hash ? { passwordHash: String(row.password_hash) } : {}),
    biometricCredentialId: row.biometric_credential_id ? String(row.biometric_credential_id) : undefined,
    nin: row.nin ? String(row.nin) : undefined,
    bvn: row.bvn ? String(row.bvn) : undefined,
    ...(accs && accs.length > 0 ? { virtualAccounts: accs } : {}),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function mysqlGetUserById(userId: string): Promise<(User & { passwordHash?: string }) | null> {
  const pool = getActiveMysqlPool();
  if (!pool || !userId) return null;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM `users` WHERE `id` = ? LIMIT 1',
      [userId]
    );
    if (!rows.length) return null;
    const [vaRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM `virtual_accounts` WHERE `user_id` = ?',
      [userId]
    );
    const accs: VirtualAccount[] = vaRows.map(v => ({
      bankName: String(v.bank_name || ''),
      bankId: v.bank_id ? (String(v.bank_id) as VirtualAccount['bankId']) : undefined,
      accountNumber: String(v.account_number || ''),
      accountName: String(v.account_name || ''),
      reference: v.reference ? String(v.reference) : undefined,
      depositFee: Number(v.deposit_fee || 0),
      provider: (v.provider || 'billstack') as VirtualAccount['provider'],
      createdAt: String(v.created_at || ''),
    }));
    const vaMap = new Map<string, VirtualAccount[]>([[userId, accs]]);
    return mapUserRow(rows[0], vaMap);
  } catch (err) {
    safeLogMysqlWarning('GetUserById', err);
    return null;
  }
}

export async function mysqlGetUserByEmailOrPhone(email: string, phone: string): Promise<(User & { passwordHash?: string }) | null> {
  const pool = getActiveMysqlPool();
  if (!pool) return null;
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM `users` WHERE `email` = ? OR (`phone` <> \'\' AND `phone` = ?) LIMIT 1',
      [cleanEmail, cleanPhone]
    );
    if (!rows.length) return null;
    return await mysqlGetUserById(String(rows[0].id));
  } catch (err) {
    safeLogMysqlWarning('GetUserByEmailOrPhone', err);
    return null;
  }
}

export async function seedMysqlFromDatabase(store: MysqlDatabaseAdapter): Promise<void> {
  const pool = getMysqlPool();
  if (!pool) return;

  for (const user of store.users.values()) {
    await mysqlUpsertUser(user);
    const accs = store.virtualAccounts.get(user.id);
    if (accs && accs.length > 0) {
      await mysqlSaveVirtualAccounts(user.id, accs);
    }
  }
  for (const plan of store.dataPlans.values()) {
    await mysqlUpsertDataPlan(plan);
  }
  for (const disc of store.airtimeDiscounts.values()) {
    await mysqlUpsertAirtimeDiscount(disc);
  }
  for (const disco of store.electricityDiscos.values()) {
    await mysqlUpsertElectricityDisco(disco);
  }
  for (const pkg of store.cablePackages.values()) {
    await mysqlUpsertCablePackage(pkg);
  }
  for (const pin of store.examPins.values()) {
    await mysqlUpsertExamPin(pin);
  }
  for (const tx of store.transactions.values()) {
    await mysqlUpsertTransaction(tx);
  }
  for (const entry of store.ledger) {
    await mysqlInsertLedgerEntry(entry);
  }
  for (const ticket of store.tickets.values()) {
    await mysqlUpsertTicket(ticket);
  }
  for (const req of store.manualFundingRequests.values()) {
    await mysqlUpsertManualFundingRequest(req);
  }
  for (const notif of store.notifications.values()) {
    await mysqlUpsertNotification(notif);
  }
  for (const prv of store.providers.values()) {
    await mysqlUpsertProvider(prv);
  }
  for (const aud of store.auditLogs) {
    await mysqlInsertAuditLog(aud);
  }
  for (const col of Object.keys(store.deletedIds) as TombstoneCollection[]) {
    for (const itemId of store.deletedIds[col]) {
      await mysqlMarkDeleted(col, itemId);
    }
  }

  await mysqlSaveSetting('general', store.settings);
  await mysqlSaveSetting('manual_funding', store.manualFundingConfig);
  await mysqlSaveSetting('vtu_config', store.vtuNaijaConfig);
  await mysqlSaveSetting('nc_config', store.ncWalletConfig);
  await mysqlSaveSetting('unitybills_config', store.unityBillsConfig);
  await mysqlSaveSetting('service_routing', store.serviceRouting);
  await mysqlSaveSetting('catalog_meta', {
    bootstrapped: true,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadDatabaseFromMysql(store: MysqlDatabaseAdapter): Promise<boolean> {
  const pool = getMysqlPool();
  if (!pool) return false;

  // 1. Load tombstones first
  const [tombRows] = await pool.query<RowDataPacket[]>('SELECT `collection_name`, `item_id` FROM `deleted_tombstones`');
  const nextDeleted: Record<TombstoneCollection, string[]> = {
    users: [],
    dataPlans: [],
    electricityDiscos: [],
    cablePackages: [],
    examPins: [],
  };
  for (const row of tombRows) {
    const col = String(row.collection_name) as TombstoneCollection;
    const itemId = String(row.item_id);
    if (col in nextDeleted && itemId && !nextDeleted[col].includes(itemId)) {
      nextDeleted[col].push(itemId);
    }
  }
  for (const col of Object.keys(nextDeleted) as TombstoneCollection[]) {
    const merged = new Set([...(store.deletedIds[col] || []), ...nextDeleted[col]]);
    store.deletedIds[col] = Array.from(merged);
  }

  // 2. Check if database has already been seeded
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM `users`');
  const userCount = Number(countRows[0]?.cnt || 0);
  const catalogMeta = await mysqlGetSetting<{ bootstrapped?: boolean }>('catalog_meta');
  const hasExistingData = userCount > 0 || Boolean(catalogMeta?.bootstrapped);

  if (!hasExistingData) {
    await seedMysqlFromDatabase(store);
    store.catalogBootstrapped = true;
    store.saveToDisk();
    console.log('[MySQL Sync]: Seeded fresh MySQL database with initial catalog & accounts.');
    return true;
  }

  // 3. Load virtual accounts & users
  const [vaRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `virtual_accounts`');
  const vaMap = new Map<string, VirtualAccount[]>();
  for (const row of vaRows) {
    const uid = String(row.user_id);
    const list = vaMap.get(uid) || [];
    list.push({
      bankName: String(row.bank_name || ''),
      bankId: row.bank_id ? (String(row.bank_id) as VirtualAccount['bankId']) : undefined,
      accountNumber: String(row.account_number || ''),
      accountName: String(row.account_name || ''),
      reference: row.reference ? String(row.reference) : undefined,
      depositFee: Number(row.deposit_fee || 0),
      provider: (row.provider || 'billstack') as VirtualAccount['provider'],
      createdAt: String(row.created_at || ''),
    });
    vaMap.set(uid, list);
  }

  const [userRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `users`');
  store.users.clear();
  store.virtualAccounts.clear();
  for (const row of userRows) {
    const uid = String(row.id);
    if (store.deletedIds.users.includes(uid)) continue;
    const mapped = mapUserRow(row, vaMap);
    store.users.set(uid, mapped);
    store.virtualAccounts.set(uid, vaMap.get(uid) || []);
  }

  // 4. Load catalog collections
  const [planRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `data_plans`');
  store.dataPlans.clear();
  for (const row of planRows) {
    const id = String(row.id);
    if (store.deletedIds.dataPlans.includes(id)) continue;
    store.dataPlans.set(id, {
      id,
      plan_id: String(row.plan_id || row.plan_code || id),
      network: String(row.network || 'mtn') as DataPlan['network'],
      name: String(row.name || ''),
      size: String(row.size || ''),
      validity: String(row.validity || '30 Days'),
      planCode: String(row.plan_code || row.plan_id || id),
      planType: String(row.plan_type || 'SME') as DataPlan['planType'],
      providerCost: Number(row.provider_cost || 0),
      customerPrice: Number(row.customer_price || 0),
      resellerPrice: Number(row.reseller_price || 0),
      isActive: Boolean(row.is_active),
    });
  }

  const [discRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `airtime_discounts`');
  if (discRows.length > 0) {
    store.airtimeDiscounts.clear();
    for (const row of discRows) {
      const net = String(row.network).toLowerCase();
      store.airtimeDiscounts.set(net, {
        network: net as AirtimeDiscount['network'],
        plan_id: row.plan_id ? String(row.plan_id) : undefined,
        customerDiscountPercent: Number(row.customer_discount_percent || 0),
        resellerDiscountPercent: Number(row.reseller_discount_percent || 0),
        providerCostPercent: Number(row.provider_cost_percent || 0),
        isActive: Boolean(row.is_active),
      });
    }
  }

  const [discoRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `electricity_discos`');
  store.electricityDiscos.clear();
  for (const row of discoRows) {
    const id = String(row.id);
    if (store.deletedIds.electricityDiscos.includes(id)) continue;
    store.electricityDiscos.set(id, {
      id,
      plan_id: row.plan_id ? String(row.plan_id) : undefined,
      network_id: row.network_id ? String(row.network_id) : undefined,
      name: String(row.name || ''),
      code: String(row.code || ''),
      shortName: String(row.short_name || ''),
      serviceFee: Number(row.service_fee || 0),
      isActive: Boolean(row.is_active),
    });
  }

  const [cableRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `cable_packages`');
  store.cablePackages.clear();
  for (const row of cableRows) {
    const id = String(row.id);
    if (store.deletedIds.cablePackages.includes(id)) continue;
    store.cablePackages.set(id, {
      id,
      plan_id: row.plan_id ? String(row.plan_id) : undefined,
      network_id: row.network_id ? String(row.network_id) : undefined,
      provider: String(row.provider || 'dstv') as CablePackage['provider'],
      name: String(row.name || ''),
      code: String(row.code || ''),
      price: Number(row.price || 0),
      providerCost: Number(row.provider_cost || 0),
      isActive: Boolean(row.is_active),
    });
  }

  const [examRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `exam_pins`');
  store.examPins.clear();
  for (const row of examRows) {
    const id = String(row.id);
    if (store.deletedIds.examPins.includes(id)) continue;
    store.examPins.set(id, {
      id,
      plan_id: row.plan_id ? String(row.plan_id) : undefined,
      network_id: row.network_id ? String(row.network_id) : undefined,
      exam: String(row.exam || 'WAEC') as ExamPin['exam'],
      name: String(row.name || ''),
      code: row.code ? String(row.code) : undefined,
      price: Number(row.price || 0),
      providerCost: Number(row.provider_cost || 0),
      stockAvailable: Number(row.stock_available || 0),
      isActive: Boolean(row.is_active),
    });
  }

  // 5. Load transactions & ledger
  const [txRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `transactions` ORDER BY `date` DESC LIMIT 2000');
  store.transactions.clear();
  for (const row of txRows) {
    const id = String(row.id);
    store.transactions.set(id, {
      id,
      reference: String(row.reference || ''),
      providerReference: row.provider_reference ? String(row.provider_reference) : undefined,
      userId: String(row.user_id || ''),
      userName: String(row.user_name || ''),
      userEmail: String(row.user_email || ''),
      userPhone: String(row.user_phone || ''),
      userRole: String(row.user_role || 'customer') as Transaction['userRole'],
      serviceType: String(row.service_type || 'data') as Transaction['serviceType'],
      network: row.network ? (String(row.network) as Transaction['network']) : undefined,
      networkId: row.network_id ? String(row.network_id) : undefined,
      plan_id: row.plan_id ? String(row.plan_id) : undefined,
      planId: row.plan_id ? String(row.plan_id) : undefined,
      recipient: String(row.recipient || ''),
      planName: row.plan_name ? String(row.plan_name) : undefined,
      amount: Number(row.amount || 0),
      providerCost: Number(row.provider_cost || 0),
      profit: Number(row.profit || 0),
      status: String(row.status || 'pending') as Transaction['status'],
      token: row.token ? String(row.token) : undefined,
      paymentMethod: row.payment_method ? String(row.payment_method) : undefined,
      failureReason: row.failure_reason ? String(row.failure_reason) : undefined,
      description: row.description ? String(row.description) : undefined,
      date: String(row.date || new Date().toISOString()),
    });
  }

  const [ledgerRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `wallet_ledger` ORDER BY `timestamp` ASC LIMIT 3000');
  store.ledger = ledgerRows.map(row => ({
    id: String(row.id),
    userId: String(row.user_id),
    reference: String(row.reference),
    type: String(row.type) as WalletLedgerEntry['type'],
    amount: Number(row.amount || 0),
    balanceBefore: Number(row.balance_before || 0),
    balanceAfter: Number(row.balance_after || 0),
    description: String(row.description || ''),
    timestamp: String(row.timestamp || ''),
  }));

  // 6. Load support tickets, manual funding requests, notifications, providers, audit logs
  const [ticketRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `support_tickets`');
  store.tickets.clear();
  for (const row of ticketRows) {
    const id = String(row.id);
    store.tickets.set(id, {
      id,
      userId: String(row.user_id),
      userName: String(row.user_name || ''),
      userEmail: String(row.user_email || ''),
      subject: String(row.subject || ''),
      category: String(row.category || 'General') as SupportTicket['category'],
      status: String(row.status || 'open') as SupportTicket['status'],
      priority: String(row.priority || 'medium') as SupportTicket['priority'],
      messages: safeJsonParse(row.messages_json, []),
      createdAt: String(row.created_at || ''),
      updatedAt: String(row.updated_at || ''),
    });
  }

  const [mfrRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `manual_funding_requests`');
  store.manualFundingRequests.clear();
  for (const row of mfrRows) {
    const id = String(row.id);
    store.manualFundingRequests.set(id, {
      id,
      userId: String(row.user_id),
      userName: String(row.user_name || ''),
      userEmail: String(row.user_email || ''),
      userPhone: String(row.user_phone || ''),
      amount: Number(row.amount || 0),
      senderName: String(row.sender_name || ''),
      senderBank: String(row.sender_bank || ''),
      paymentReference: String(row.payment_reference || ''),
      note: row.note ? String(row.note) : '',
      status: String(row.status || 'pending') as ManualFundingRequest['status'],
      rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
      createdAt: String(row.created_at || ''),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    });
  }

  const [notifRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `notifications`');
  store.notifications.clear();
  for (const row of notifRows) {
    const id = String(row.id);
    store.notifications.set(id, {
      id,
      userId: String(row.user_id),
      title: String(row.title || ''),
      message: String(row.message || ''),
      type: String(row.type || 'info') as NotificationItem['type'],
      read: Boolean(row.is_read),
      createdAt: String(row.created_at || ''),
    });
  }

  const [prvRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `providers`');
  if (prvRows.length > 0) {
    store.providers.clear();
    for (const row of prvRows) {
      const id = String(row.id);
      store.providers.set(id, {
        id,
        name: String(row.name || ''),
        baseUrl: String(row.base_url || ''),
        apiKey: String(row.api_key || ''),
        secretKey: row.secret_key ? String(row.secret_key) : '',
        isPrimary: Boolean(row.is_primary),
        isBackup: Boolean(row.is_backup),
        isLive: Boolean(row.is_live),
        balance: Number(row.balance || 0),
        status: String(row.status || 'connected') as ProviderConfig['status'],
        lastPing: String(row.last_ping || ''),
      });
    }
  }

  const [auditRows] = await pool.query<RowDataPacket[]>('SELECT * FROM `audit_logs` ORDER BY `timestamp` DESC LIMIT 500');
  store.auditLogs = auditRows.map(row => ({
    id: String(row.id),
    adminEmail: String(row.admin_email || ''),
    action: String(row.action || ''),
    target: String(row.target || ''),
    details: String(row.details || ''),
    ip: String(row.ip || '127.0.0.1'),
    timestamp: String(row.timestamp || ''),
  }));

  // 7. Load system_settings entries
  const [settingRows] = await pool.query<RowDataPacket[]>('SELECT `setting_key`, `value_json` FROM `system_settings`');
  for (const row of settingRows) {
    const key = String(row.setting_key);
    const parsed = safeJsonParse<Record<string, any>>(row.value_json, {});
    if (key === 'general') {
      store.settings = { ...store.settings, ...parsed };
    } else if (key === 'manual_funding') {
      store.manualFundingConfig = { ...store.manualFundingConfig, ...parsed };
    } else if (key === 'vtu_config') {
      store.vtuNaijaConfig = { ...store.vtuNaijaConfig, ...parsed };
    } else if (key === 'nc_config') {
      store.ncWalletConfig = { ...store.ncWalletConfig, ...parsed };
    } else if (key === 'unitybills_config') {
      store.unityBillsConfig = { ...store.unityBillsConfig, ...parsed };
    } else if (key === 'service_routing') {
      store.serviceRouting = { ...store.serviceRouting, ...parsed };
    } else if (key === 'catalog_meta' && typeof parsed.bootstrapped === 'boolean') {
      store.catalogBootstrapped = parsed.bootstrapped;
    }
  }

  store.saveToDisk();
  console.log(`[MySQL Sync]: Hydrated ${store.users.size} users, ${store.dataPlans.size} data plans, ${store.transactions.size} transactions.`);
  return true;
}

export async function initializeMysqlStorage(store: MysqlDatabaseAdapter): Promise<boolean> {
  if (!isMysqlConfigured()) {
    mysqlAvailable = false;
    return false;
  }
  try {
    const schemaOk = await ensureMysqlSchema();
    if (!schemaOk) {
      mysqlAvailable = false;
      return false;
    }
    mysqlAvailable = true;
    const loaded = await loadDatabaseFromMysql(store);
    if (!loaded) mysqlAvailable = false;
    return loaded;
  } catch (err) {
    mysqlAvailable = false;
    safeLogMysqlWarning('InitializeStorage', err);
    return false;
  }
}
