export type UserRole = 'customer' | 'reseller' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  avatar?: string;
  referralCode: string;
  referredBy?: string;
  walletBalance: number;
  totalSavings: number;
  referralEarnings: number;
  totalTransactionsCount: number;
  transactionPin?: string;
  biometricCredentialId?: string;
  nin?: string;
  bvn?: string;
  virtualAccounts?: VirtualAccount[];
  createdAt: string;
  updatedAt?: string;
}

export interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankId?: '9PSB' | 'SAFEHAVEN' | 'PROVIDUS' | 'PALMPAY';
  reference?: string;
  createdAt?: string;
  provider?: 'billstack' | 'manual';
  depositFee?: number;
}

export interface BillStackConfig {
  secretKey: string;
  baseUrl: string;
  defaultBanks: Array<'9PSB' | 'SAFEHAVEN' | 'PROVIDUS' | 'PALMPAY'>;
  isLive: boolean;
  webhookSecret?: string;
  webhookUrl?: string;
  lastTested?: string;
  lastStatus?: string;
}

export type NetworkType = 'mtn' | 'airtel' | 'glo' | '9mobile';

export interface DataPlan {
  id: string;
  plan_id?: string;
  network: NetworkType;
  name: string;
  size: string;
  validity: string;
  planCode: string;
  planType: 'SME' | 'Gifting' | 'Corporate' | 'Direct';
  providerCost: number;
  customerPrice: number;
  resellerPrice: number;
  isActive: boolean;
}

export interface AirtimeDiscount {
  network: NetworkType;
  plan_id?: string;
  customerDiscountPercent: number;
  resellerDiscountPercent: number;
  providerCostPercent: number;
  isActive: boolean;
}

export interface ElectricityDisco {
  id: string;
  plan_id?: string;
  planId?: string;
  network_id?: string;
  networkId?: string;
  name: string;
  code: string;
  shortName: string;
  serviceFee: number;
  isActive: boolean;
}

export interface CablePackage {
  id: string;
  plan_id?: string;
  planId?: string;
  network_id?: string;
  networkId?: string;
  provider: 'dstv' | 'gotv' | 'startimes' | string;
  name: string;
  code: string;
  price: number;
  providerCost: number;
  isActive: boolean;
}

export interface ExamPin {
  id: string;
  plan_id?: string;
  planId?: string;
  network_id?: string;
  networkId?: string;
  exam: 'WAEC' | 'NECO' | 'JAMB' | string;
  name: string;
  code?: string;
  price: number;
  providerCost: number;
  stockAvailable: number;
  isActive: boolean;
}

export type TransactionStatus = 'successful' | 'pending' | 'failed' | 'reversed';
export type ServiceType = 
  | 'data' 
  | 'airtime' 
  | 'electricity' 
  | 'cable' 
  | 'exam_pin' 
  | 'wallet_fund' 
  | 'referral_bonus'
  | 'admin_adjustment';

export interface Transaction {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userRole: UserRole;
  serviceType: ServiceType;
  network?: NetworkType | string;
  network_id?: string;
  networkId?: string;
  plan_id?: string;
  planId?: string;
  recipient: string;
  planName?: string;
  amount: number;
  providerCost: number;
  profit: number;
  status: TransactionStatus;
  token?: string;
  providerReference?: string;
  date: string;
  failureReason?: string;
  paymentMethod?: string;
}

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  reference: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'Transaction' | 'Wallet' | 'Account' | 'Technical' | 'General';
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    sender: 'user' | 'admin';
    senderName: string;
    message: string;
    timestamp: string;
  }>;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'promo';
  read: boolean;
  createdAt: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  isPrimary: boolean;
  isBackup: boolean;
  isLive: boolean; // false = DEMO, true = LIVE
  balance: number;
  status: 'connected' | 'error' | 'dormant';
  lastPing: string;
}

export interface ServicesEnabled {
  data: boolean;
  airtime: boolean;
  electricity: boolean;
  cable: boolean;
  exam: boolean;
}

export interface SystemSettings {
  platformName: string;
  tagline: string;
  supportPhone: string;
  supportEmail: string;
  supportWhatsapp: string;
  minWalletFunding: number;
  referralBonusPercent: number;
  maintenanceMode: boolean;
  demoMode: boolean; // Global demo vs live toggle
  notificationBanner: string;
  servicesEnabled?: ServicesEnabled;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
  ip: string;
}

export type GatewayProvider = 'vtunaija' | 'ncwallet' | 'unitybills';

export interface ServiceRoutingConfig {
  data: GatewayProvider;
  airtime: GatewayProvider;
  electricity: GatewayProvider;
  cable: GatewayProvider;
  exam: GatewayProvider;
  exam_pin?: GatewayProvider;
}

export interface VTUNaijaConfig {
  apiKey: string;
  baseUrl: string;
  dataEndpoint: string;
  airtimeEndpoint: string;
  cableEndpoint: string;
  cableVerifyEndpoint?: string;
  electricityEndpoint: string;
  electricityVerifyEndpoint?: string;
  examEndpoint: string;
  balanceEndpoint: string;
  networkIds: {
    mtn: string;
    glo: string;
    nineMobile: string;
    airtel: string;
  };
  isLive: boolean;
  lastTested?: string;
  lastStatus?: string;
  balance?: number;
}

export interface NCWalletConfig {
  apiKey: string;
  baseUrl: string;
  dataEndpoint: string;
  airtimeEndpoint: string;
  cableEndpoint: string;
  cableVerifyEndpoint?: string;
  electricityEndpoint: string;
  electricityVerifyEndpoint?: string;
  examEndpoint: string;
  balanceEndpoint: string;
  networkIds: {
    mtn: string;
    glo: string;
    nineMobile: string;
    airtel: string;
  };
  isLive: boolean;
  lastTested?: string;
  lastStatus?: string;
  balance?: number;
}

export interface UnityBillsConfig {
  apiKey: string;
  baseUrl: string;
  dataEndpoint: string;
  airtimeEndpoint: string;
  cableEndpoint: string;
  cableVerifyEndpoint?: string;
  electricityEndpoint: string;
  electricityVerifyEndpoint?: string;
  examEndpoint: string;
  balanceEndpoint: string;
  virtualAccountEndpoint: string;
  networkIds: {
    mtn: string;
    glo: string;
    nineMobile: string;
    airtel: string;
  };
  isLive: boolean;
  lastTested?: string;
  lastStatus?: string;
  balance?: number;
}

export interface ManualFundingConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
  supportWhatsapp: string;
  instructions: string;
}

export interface ManualFundingRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  amount: number;
  senderName: string;
  senderBank: string;
  paymentReference: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

