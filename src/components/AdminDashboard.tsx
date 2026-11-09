import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  CreditCard,
  TrendingUp,
  Settings,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Activity,
  Layers,
  Save,
  RefreshCw,
  Clock,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Server,
  Phone,
  Zap,
  Tv,
  GraduationCap,
  Percent,
  Check,
  Copy,
  Radio,
  Landmark,
  UserPlus
} from 'lucide-react';
import {
  User,
  DataPlan,
  AirtimeDiscount,
  ElectricityDisco,
  CablePackage,
  ExamPin,
  ProviderConfig,
  SystemSettings,
  Transaction,
  AuditLog,
  VTUNaijaConfig,
  NCWalletConfig,
  UnityBillsConfig,
  ServiceRoutingConfig,
  GatewayProvider,
  BillStackConfig,
  ManualFundingConfig,
  ManualFundingRequest
} from '../types/index.ts';
import { TransactionStatusBadge } from './TransactionStatusBadge.tsx';

interface AdminDashboardProps {
  currentAdmin: User;
  onRefreshUser: () => void;
}

type AdminTab = 'overview' | 'users' | 'plans' | 'airtime' | 'bills' | 'providers' | 'transactions' | 'manual_funding' | 'settings' | 'audit';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentAdmin,
  onRefreshUser,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [billsSubTab, setBillsSubTab] = useState<'electricity' | 'cable' | 'exam'>('electricity');
  const [stats, setStats] = useState<any>({
    totalUsers: 3,
    totalResellers: 1,
    totalWalletLiabilities: 307500,
    totalDeposits: 350000,
    totalSales: 42500,
    totalTransactions: 6,
    totalProfit: 1250,
    failedCount: 0,
    pendingCount: 0,
    providerBalance: 240900,
  });

  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [airtimeDiscounts, setAirtimeDiscounts] = useState<AirtimeDiscount[]>([]);
  const [electricityDiscos, setElectricityDiscos] = useState<ElectricityDisco[]>([]);
  const [cablePackages, setCablePackages] = useState<CablePackage[]>([]);
  const [examPins, setExamPins] = useState<ExamPin[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    platformName: 'NAEEM DATA SUB',
    tagline: 'Fast, Affordable & Reliable Digital Services.',
    supportPhone: '+234 801 234 5678',
    supportEmail: 'support@naeemdatasub.ng',
    supportWhatsapp: '+2348012345678',
    minWalletFunding: 100,
    referralBonusPercent: 5,
    maintenanceMode: false,
    demoMode: false,
    notificationBanner: '',
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Search and filter states
  const [userSearch, setUserSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // VTUNaija API gateway configuration state
  const [vtuConfig, setVtuConfig] = useState<VTUNaijaConfig>({
    apiKey: '',
    baseUrl: 'https://vtunaija.com.ng/api',
    dataEndpoint: '/data/',
    airtimeEndpoint: '/topup/',
    cableEndpoint: '/cablesub/',
    electricityEndpoint: '/billpayment/',
    examEndpoint: '/epin/',
    balanceEndpoint: '/user/',
    networkIds: {
      mtn: '1',
      glo: '2',
      nineMobile: '3',
      airtel: '4',
    },
    isLive: true,
    lastTested: '',
    lastStatus: 'connected',
    balance: 185000,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingVtu, setIsSavingVtu] = useState(false);
  const [isTestingVtu, setIsTestingVtu] = useState(false);
  const [vtuTestResult, setVtuTestResult] = useState<string | null>(null);

  // Service Gateway Routing state (VTUNaija vs NCwallet)
  const [serviceRouting, setServiceRouting] = useState<ServiceRoutingConfig>({
    data: 'vtunaija',
    airtime: 'vtunaija',
    electricity: 'vtunaija',
    cable: 'vtunaija',
    exam: 'vtunaija',
    exam_pin: 'vtunaija',
  });
  const [isSavingRouting, setIsSavingRouting] = useState(false);

  // NCwallet API gateway configuration state
  const [ncWalletConfig, setNcWalletConfig] = useState<NCWalletConfig>({
    apiKey: '',
    baseUrl: 'https://ncwallet.ng/api',
    dataEndpoint: '/data/',
    airtimeEndpoint: '/topup/',
    cableEndpoint: '/cablesub/',
    electricityEndpoint: '/billpayment/',
    examEndpoint: '/epin/',
    cableVerifyEndpoint: '/cablesub/verify/',
    electricityVerifyEndpoint: '/billpayment/verify/',
    balanceEndpoint: '/user/',
    networkIds: {
      mtn: '1',
      glo: '2',
      nineMobile: '3',
      airtel: '4',
    },
    isLive: true,
    lastTested: '',
  });
  const [showNcApiKey, setShowNcApiKey] = useState(false);
  const [isSavingNcWallet, setIsSavingNcWallet] = useState(false);
  const [isTestingNcWallet, setIsTestingNcWallet] = useState(false);
  const [ncWalletTestResult, setNcWalletTestResult] = useState<string | null>(null);

  // UnityBills.ng API gateway configuration state
  const [unityBillsConfig, setUnityBillsConfig] = useState<UnityBillsConfig>({
    apiKey: '',
    baseUrl: 'https://www.unitybills.ng/api/v1',
    dataEndpoint: '/bill/data',
    airtimeEndpoint: '/bill/airtime',
    cableEndpoint: '/bill/cable',
    electricityEndpoint: '/bill/electricity',
    examEndpoint: '/bill/exam',
    cableVerifyEndpoint: '/bill/cable/verify',
    electricityVerifyEndpoint: '/bill/electricity/verify',
    balanceEndpoint: '/user',
    virtualAccountEndpoint: '/user/virtual-account',
    networkIds: {
      mtn: 'mtn',
      glo: 'glo',
      nineMobile: '9mobile',
      airtel: 'airtel',
    },
    isLive: true,
    lastTested: '',
    lastStatus: 'unconfigured',
    balance: 0,
  });
  const [showUnityApiKey, setShowUnityApiKey] = useState(false);
  const [isSavingUnityBills, setIsSavingUnityBills] = useState(false);
  const [isTestingUnityBills, setIsTestingUnityBills] = useState(false);
  const [unityBillsTestResult, setUnityBillsTestResult] = useState<string | null>(null);
  const [isSimulatingUnityBills, setIsSimulatingUnityBills] = useState(false);

  // Firestore Webhook Diagnostic Logs State
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isLoadingWebhookLogs, setIsLoadingWebhookLogs] = useState(false);

  const fetchWebhookLogs = async () => {
    setIsLoadingWebhookLogs(true);
    try {
      const res = await fetch('/api/admin/webhook-logs', {
        headers: {
          'Accept': 'application/json',
          'x-user-id': currentAdmin?.id || 'usr_ahmad_01',
        },
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        console.warn('Webhook logs non-JSON response');
        return;
      }
      if (data.success && Array.isArray(data.logs)) {
        setWebhookLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching webhook logs:', err);
    } finally {
      setIsLoadingWebhookLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'providers') {
      fetchWebhookLogs();
    }
  }, [activeTab]);

  // BillStack Payment Gateway configuration state
  const [billstackConfig, setBillstackConfig] = useState<BillStackConfig>({
    secretKey: 'Bill_Stack-SEC-KEY-live_demo_key_9psb_safehaven_providus',
    baseUrl: 'https://api.billstack.co/v2',
    defaultBanks: ['9PSB', 'SAFEHAVEN', 'PROVIDUS'],
    isLive: true,
    webhookSecret: '',
    lastStatus: 'connected',
    lastTested: '',
  });
  const [showBillstackKey, setShowBillstackKey] = useState(false);
  const [isSavingBillstack, setIsSavingBillstack] = useState(false);
  const [isTestingBillstack, setIsTestingBillstack] = useState(false);
  const [billstackTestResult, setBillstackTestResult] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<any | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // User wallet adjustment modal state
  const [adjustTargetUser, setAdjustTargetUser] = useState<User | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Data plan modal states
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DataPlan | null>(null);
  const [newPlan, setNewPlan] = useState<Partial<DataPlan>>({
    network: 'mtn',
    name: 'MTN 1.5GB (30 Days)',
    size: '1.5GB',
    validity: '30 Days',
    planCode: 'sme_1.5gb',
    plan_id: 'sme_1.5gb',
    planType: 'SME',
    providerCost: 390,
    customerPrice: 450,
    resellerPrice: 420,
    isActive: true,
  });

  // Airtime discount modal states
  const [editingAirtimeDiscount, setEditingAirtimeDiscount] = useState<AirtimeDiscount | null>(null);

  // Electricity Disco modal states
  const [isAddingDisco, setIsAddingDisco] = useState(false);
  const [editingDisco, setEditingDisco] = useState<ElectricityDisco | null>(null);
  const [newDisco, setNewDisco] = useState<Partial<ElectricityDisco>>({
    name: 'Ikeja Electric (IKEDC)',
    code: 'ikedc',
    plan_id: 'ikedc',
    network_id: 'IKEDC',
    shortName: 'IKEDC',
    serviceFee: 50,
    isActive: true,
  });

  // Cable package modal states
  const [isAddingCable, setIsAddingCable] = useState(false);
  const [editingCable, setEditingCable] = useState<CablePackage | null>(null);
  const [newCable, setNewCable] = useState<Partial<CablePackage>>({
    provider: 'dstv',
    name: 'DStv Yanga',
    code: 'dstv-yanga',
    plan_id: 'dstv-yanga',
    network_id: 'dstv',
    price: 4200,
    providerCost: 4050,
    isActive: true,
  });

  // Exam PIN modal states
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamPin | null>(null);
  const [newExam, setNewExam] = useState<Partial<ExamPin>>({
    exam: 'WAEC',
    name: 'WAEC Scratch Card / Result Checker',
    code: 'waec',
    plan_id: 'waec',
    network_id: 'WAEC',
    price: 3600,
    providerCost: 3400,
    stockAvailable: 99,
    isActive: true,
  });

  // User registration modal state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer' as 'customer' | 'reseller' | 'agent' | 'admin',
    walletBalance: 0,
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // In-app Confirmation & Prompt Modals (replacing blocked window.confirm & window.prompt)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'plan' | 'disco' | 'cable' | 'exam' | 'user';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [rejectTargetReq, setRejectTargetReq] = useState<{
    requestId: string;
    reason: string;
  } | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const [refundTargetTx, setRefundTargetTx] = useState<{
    tx: Transaction;
    reason: string;
  } | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  // Safe fetch helper for parallel Promise.all endpoints
  const safeFetchJson = async (url: string, options?: RequestInit, fallback: any = {}) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) return fallback;
      const data = await res.json();
      return data ?? fallback;
    } catch (err) {
      console.warn(`SafeFetch error for ${url}:`, err);
      return fallback;
    }
  };

  // Fetch admin stats & datasets
  const fetchAllData = async () => {
    try {
      const headers = { 'x-user-id': currentAdmin.id };
      const [sRes, uRes, pRes, airRes, discRes, cabRes, exRes, prvRes, tRes, setRes, aRes, vtuRes, bsRes, routeRes, ncRes, unityRes] = await Promise.all([
        safeFetchJson('/api/admin/stats', { headers }, {}),
        safeFetchJson('/api/admin/users', { headers }, { users: [] }),
        safeFetchJson('/api/admin/data-plans', { headers }, { plans: [] }),
        safeFetchJson('/api/admin/airtime-discounts', { headers }, { discounts: [] }),
        safeFetchJson('/api/admin/electricity-discos', { headers }, { discos: [] }),
        safeFetchJson('/api/admin/cable-packages', { headers }, { packages: [] }),
        safeFetchJson('/api/admin/exam-pins', { headers }, { pins: [] }),
        safeFetchJson('/api/admin/providers', { headers }, { providers: [] }),
        safeFetchJson('/api/transactions', { headers }, { transactions: [] }),
        safeFetchJson('/api/settings', {}, { settings: null }),
        safeFetchJson('/api/admin/audit-logs', { headers }, { auditLogs: [] }),
        safeFetchJson('/api/admin/vtu-naija/config', { headers }, {}),
        safeFetchJson('/api/admin/billstack/config', { headers }, {}),
        safeFetchJson('/api/admin/gateway/routing', { headers }, {}),
        safeFetchJson('/api/admin/ncwallet/config', { headers }, {}),
        safeFetchJson('/api/admin/unitybills/config', { headers }, {}),
      ]);

      if (sRes && Object.keys(sRes).length > 0) setStats(sRes);
      if (uRes.users) setUsers(uRes.users);
      if (pRes.plans) setPlans(pRes.plans);
      if (airRes.discounts) setAirtimeDiscounts(airRes.discounts);
      if (discRes.discos) setElectricityDiscos(discRes.discos);
      if (cabRes.packages) setCablePackages(cabRes.packages);
      if (exRes.pins) setExamPins(exRes.pins);
      if (prvRes.providers) setProviders(prvRes.providers);
      if (tRes.transactions) setTransactions(tRes.transactions);
      if (setRes.settings) setSettings(setRes.settings);
      if (aRes.auditLogs) setAuditLogs(aRes.auditLogs);
      if (vtuRes.config) setVtuConfig(vtuRes.config);
      if (bsRes.config) setBillstackConfig(bsRes.config);
      if (routeRes.routing) setServiceRouting(routeRes.routing);
      if (ncRes.config) setNcWalletConfig(ncRes.config);
      if (unityRes.config) setUnityBillsConfig(unityRes.config);
      fetchManualFundingData();
    } catch (err) {
      console.error('fetchAllData error:', err);
    }
  };

  // Manual Funding state
  const [manualFundingConfig, setManualFundingConfig] = useState<ManualFundingConfig>({
    bankName: 'Moniepoint Microfinance Bank',
    accountNumber: '8123456789',
    accountName: 'NAEEM DATA SUB OFFICIAL',
    supportWhatsapp: '+2348012345678',
    instructions: 'Transfer to the admin bank account above, then submit your payment reference for instant admin verification.',
  });
  const [manualRequests, setManualRequests] = useState<ManualFundingRequest[]>([]);
  const [isSavingManualConfig, setIsSavingManualConfig] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const fetchManualFundingData = async () => {
    try {
      const headers = { 'x-user-id': currentAdmin.id };
      const [cRes, rRes] = await Promise.all([
        safeFetchJson('/api/wallet/manual-fund/config', {}, {}),
        safeFetchJson('/api/admin/manual-fund/requests', { headers }, { requests: [] }),
      ]);
      if (cRes.config) setManualFundingConfig(cRes.config);
      if (rRes.requests) setManualRequests(rRes.requests);
    } catch (e) {
      console.warn('Manual funding fetch error:', e);
    }
  };

  const handleSaveManualConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingManualConfig(true);
    try {
      const res = await fetch('/api/admin/manual-fund/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(manualFundingConfig),
      });
      const data = await res.json();
      if (data.success) {
        flashMessage('✓ Manual Bank Account details updated successfully!');
      } else {
        flashMessage(data.error || 'Failed to update manual account config');
      }
    } catch (err: any) {
      flashMessage(`Error updating manual account details: ${err.message}`);
    } finally {
      setIsSavingManualConfig(false);
    }
  };

  const handleApproveManualRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const res = await fetch('/api/admin/manual-fund/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (data.success) {
        flashMessage(data.message || '✓ Request approved & user wallet credited!');
        fetchManualFundingData();
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to approve request');
      }
    } catch (err: any) {
      flashMessage(`Error approving request: ${err.message}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectManualRequest = (requestId: string) => {
    setRejectTargetReq({
      requestId,
      reason: 'Payment proof could not be verified by Admin.',
    });
  };

  const executeRejectManualRequest = async () => {
    if (!rejectTargetReq) return;
    setProcessingRequestId(rejectTargetReq.requestId);
    setIsRejecting(true);
    try {
      const res = await fetch('/api/admin/manual-fund/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ requestId: rejectTargetReq.requestId, reason: rejectTargetReq.reason }),
      });
      const data = await res.json();
      if (data.success) {
        flashMessage('Manual funding request rejected');
        setRejectTargetReq(null);
        fetchManualFundingData();
      } else {
        flashMessage(data.error || 'Failed to reject request');
      }
    } catch (err: any) {
      flashMessage(`Error rejecting request: ${err.message}`);
    } finally {
      setProcessingRequestId(null);
      setIsRejecting(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const flashMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Save BillStack Gateway Credentials
  const handleSaveBillstackConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billstackConfig.secretKey || billstackConfig.secretKey.trim().length < 8) {
      flashMessage('BillStack Secret Key is required (e.g. Bearer Bill_Stack-SEC-KEY-...)');
      return;
    }

    setIsSavingBillstack(true);
    try {
      const res = await fetch('/api/admin/billstack/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(billstackConfig),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setBillstackConfig(data.config);
        flashMessage('BillStack configuration saved successfully! Running verification ping...');

        // Ping BillStack gateway
        handleTestBillstackConnection();
      } else {
        flashMessage(data.error || 'Failed to save BillStack configuration');
      }
    } catch (err: any) {
      flashMessage(`Error saving BillStack config: ${err.message}`);
    } finally {
      setIsSavingBillstack(false);
    }
  };

  // Ping BillStack API Connection
  const handleTestBillstackConnection = async () => {
    setIsTestingBillstack(true);
    setBillstackTestResult(null);
    try {
      const res = await fetch('/api/admin/billstack/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
      });
      const data = await res.json();
      if (data.success) {
        setBillstackTestResult(`✓ Connected! Latency: ${data.latency}ms | ${data.message} | Dedicated Banks: ${billstackConfig.defaultBanks.join(', ')}`);
        flashMessage(`BillStack connection active: ${data.latency}ms`);
      } else {
        setBillstackTestResult(`✗ Warning: ${data.message || 'Handshake failed'}`);
      }
    } catch (err: any) {
      setBillstackTestResult(`✗ Connection error: ${err.message}`);
    } finally {
      setIsTestingBillstack(false);
    }
  };

  // Test BillStack Webhook Handshake & Auto-credit
  const handleTestWebhookSimulation = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch('/api/admin/billstack/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ amount: 2500, bank: '9PSB' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWebhookTestResult(data);
        flashMessage('✓ BillStack Webhook handshake successful: HTTP 200 {"status": true, "message": "successful"}');
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to test BillStack webhook');
      }
    } catch (err: any) {
      flashMessage(`Webhook test error: ${err.message}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Copy Webhook URL
  const handleCopyWebhookUrl = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/billstack` : 'https://naeemdatasub.ng/api/webhooks/billstack';
    navigator.clipboard.writeText(url);
    setCopiedWebhookUrl(true);
    flashMessage('✓ BillStack Webhook URL copied to clipboard!');
    setTimeout(() => setCopiedWebhookUrl(false), 2500);
  };

  // Test & Simulate UnityBills Webhook Payload (Exact Production Structure)
  const handleSimulateUnityBillsWebhook = async () => {
    setIsSimulatingUnityBills(true);
    const testReference = `UNITYBILLSNGUMMADAUIBRAHIM_${Date.now()}`;
    const testPayload = {
      event: "collection",
      reference: testReference,
      virtualAccount: "9819132449",
      amountReceived: 100,
      sessionId: `1000042611092011011769837${Math.floor(10000 + Math.random() * 90000)}`,
      sourceCurrency: "NGN",
      destinationCurrency: "NGN",
      status: "successful",
      sourceAccountNumber: "XXXXXX7241",
      sourceAccountName: "NAIM UMMADAU HARUNA",
      sourceBankCode: "",
      sourceBankName: "OPay Digital Services Limited (OPay)",
      remarks: "8069417241/9819132449/UNITYBILLSNG/UM",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settlementDestination: "9819132449"
    };

    try {
      const res = await fetch('/api/webhooks/unitybills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.status === 'successful' || data.status === true)) {
        flashMessage(`✓ UnityBills Webhook Processed! ₦100 credited to account 9819132449 (Ref: ${testReference})`);
        fetchAllData();
        fetchWebhookLogs();
        if (onRefreshUser) onRefreshUser();
      } else {
        flashMessage(data.message || data.error || 'Failed to simulate UnityBills webhook');
      }
    } catch (err: any) {
      flashMessage(`Webhook simulation error: ${err.message}`);
    } finally {
      setIsSimulatingUnityBills(false);
    }
  };

  // Dynamic Credential Validation
  const validateVtuConfig = (): string | null => {
    if (!vtuConfig.apiKey || vtuConfig.apiKey.trim().length < 8) {
      return 'VTUNaija API Token is required and must be at least 8 characters long.';
    }
    if (vtuConfig.apiKey.toLowerCase().includes('placeholder') || vtuConfig.apiKey.toLowerCase().includes('your_token')) {
      return 'Please replace placeholder with your actual VTUNaija API token from your provider dashboard.';
    }
    try {
      const parsedUrl = new URL(vtuConfig.baseUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return 'Base API URL must start with http:// or https://';
      }
    } catch {
      return 'Please enter a valid Base API URL (e.g., https://vtunaija.com.ng/api)';
    }

    const endpoints = [
      { name: 'Data', val: vtuConfig.dataEndpoint },
      { name: 'Airtime', val: vtuConfig.airtimeEndpoint },
      { name: 'Electricity', val: vtuConfig.electricityEndpoint },
      { name: 'Cable TV', val: vtuConfig.cableEndpoint },
      { name: 'Exam PIN', val: vtuConfig.examEndpoint },
    ];
    for (const ep of endpoints) {
      if (!ep.val || !ep.val.startsWith('/')) {
        return `${ep.name} endpoint must start with a leading slash (e.g. /data/, /topup/).`;
      }
    }

    if (!vtuConfig.networkIds.mtn || !vtuConfig.networkIds.glo || !vtuConfig.networkIds.airtel || !vtuConfig.networkIds.nineMobile) {
      return 'All four Nigerian network IDs (MTN, Glo, 9mobile, Airtel) must be configured.';
    }

    return null;
  };

  // Save VTUNaija API Credentials & Config with Dynamic Validation & Immediate Sync Ping
  const handleSaveVtuConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateVtuConfig();
    if (validationError) {
      flashMessage(`Validation Error: ${validationError}`);
      return;
    }

    setIsSavingVtu(true);
    try {
      const res = await fetch('/api/admin/vtu-naija/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(vtuConfig),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setVtuConfig(data.config);
        flashMessage('VTUNaija API credentials saved! Initiating immediate synchronization test...');

        // Immediately ping the backend to verify the updated credentials
        setIsTestingVtu(true);
        try {
          const pingRes = await fetch('/api/admin/vtu-naija/ping', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentAdmin.id,
            },
          });
          const pingData = await pingRes.json();
          if (pingData.success) {
            setVtuConfig(prev => ({
              ...prev,
              lastTested: pingData.lastTested,
              lastStatus: pingData.status,
              balance: pingData.balance ?? prev.balance,
            }));
            setVtuTestResult(`✓ Synchronized & Verified! Latency: ${pingData.latency}ms | Total API Wallet Balance: ₦${(pingData.balance || 0).toLocaleString()} | ${pingData.message}`);
            flashMessage(`API synchronized and verified: ${pingData.latency}ms`);
          } else {
            setVtuTestResult(`✗ Warning: Config saved, but gateway ping failed: ${pingData.error || pingData.message}`);
          }
        } catch (pingErr: any) {
          setVtuTestResult(`✗ Warning: Config saved, but failed to reach gateway: ${pingErr.message}`);
        } finally {
          setIsTestingVtu(false);
        }
      } else {
        flashMessage(data.error || 'Failed to save VTUNaija configuration');
      }
    } catch (err: any) {
      flashMessage(`Error saving settings: ${err.message}`);
    } finally {
      setIsSavingVtu(false);
    }
  };

  // Test and Ping Live VTUNaija Server
  const handleTestVtuConnection = async () => {
    setIsTestingVtu(true);
    setVtuTestResult(null);
    try {
      const res = await fetch('/api/admin/vtu-naija/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
      });
      const data = await res.json();
      if (data.success) {
        setVtuConfig(prev => ({
          ...prev,
          lastTested: data.lastTested,
          lastStatus: data.status,
          balance: data.balance ?? prev.balance,
        }));
        setVtuTestResult(`✓ Connected! Latency: ${data.latency}ms | Provider Balance: ₦${(data.balance || 0).toLocaleString()} | ${data.message}`);
        flashMessage(`VTUNaija connection active: ${data.latency}ms`);
      } else {
        setVtuTestResult(`✗ Ping error: ${data.error || data.message || 'Connection failed'}`);
      }
    } catch (err: any) {
      setVtuTestResult(`✗ Network error: ${err.message}`);
    } finally {
      setIsTestingVtu(false);
    }
  };

  // Auto-sync VTUNaija API Wallet Balance every 30 seconds
  useEffect(() => {
    handleTestVtuConnection();
    const syncInterval = setInterval(() => {
      handleTestVtuConnection();
      fetchAllData();
    }, 30000);
    return () => clearInterval(syncInterval);
  }, []);

  // Save Service Gateway Routing (VTUNaija vs NCwallet)
  const handleSaveServiceRouting = async (newRouting: ServiceRoutingConfig) => {
    setIsSavingRouting(true);
    try {
      const res = await fetch('/api/admin/gateway/routing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(newRouting),
      });
      const data = await res.json();
      if (data.success && data.routing) {
        setServiceRouting(data.routing);
        flashMessage('Gateway routing updated successfully!');
      } else {
        flashMessage(data.error || 'Failed to update gateway routing');
      }
    } catch (err: any) {
      flashMessage(`Error updating routing: ${err.message}`);
    } finally {
      setIsSavingRouting(false);
    }
  };

  const handleRouteAllServices = async (gateway: GatewayProvider) => {
    const updated: ServiceRoutingConfig = {
      data: gateway,
      airtime: gateway,
      electricity: gateway,
      cable: gateway,
      exam: gateway,
      exam_pin: gateway,
    };
    setServiceRouting(updated);
    await handleSaveServiceRouting(updated);
  };

  const handleRouteService = async (service: keyof ServiceRoutingConfig, gateway: GatewayProvider) => {
    const updated: ServiceRoutingConfig = {
      ...serviceRouting,
      [service]: gateway,
    };
    if (service === 'exam_pin') {
      updated.exam = gateway;
    } else if (service === 'exam') {
      updated.exam_pin = gateway;
    }
    setServiceRouting(updated);
    await handleSaveServiceRouting(updated);
  };

  // Save NCwallet API Credentials & Config
  const handleSaveNcWalletConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNcWallet(true);
    try {
      const res = await fetch('/api/admin/ncwallet/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(ncWalletConfig),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setNcWalletConfig(data.config);
        flashMessage('NCwallet configuration saved! Testing connection...');
        await handleTestNcWalletConnection();
      } else {
        flashMessage(data.error || 'Failed to save NCwallet configuration');
      }
    } catch (err: any) {
      flashMessage(`Error saving NCwallet: ${err.message}`);
    } finally {
      setIsSavingNcWallet(false);
    }
  };

  // Test and Ping Live NCwallet Server
  const handleTestNcWalletConnection = async () => {
    setIsTestingNcWallet(true);
    setNcWalletTestResult(null);
    try {
      const res = await fetch('/api/admin/ncwallet/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
      });
      const data = await res.json();
      if (data.success) {
        setNcWalletConfig(prev => ({
          ...prev,
          lastTested: data.lastTested,
          lastStatus: data.status,
          balance: data.balance ?? prev.balance,
        }));
        setNcWalletTestResult(`✓ Connected! Latency: ${data.latency}ms | Provider Balance: ₦${(data.balance || 0).toLocaleString()} | ${data.message}`);
        flashMessage(`NCwallet connection active: ${data.latency}ms`);
      } else {
        setNcWalletTestResult(`✗ Ping note: ${data.message || data.error || 'Connection failed'}`);
      }
    } catch (err: any) {
      setNcWalletTestResult(`✗ Network error: ${err.message}`);
    } finally {
      setIsTestingNcWallet(false);
    }
  };

  // Save UnityBills.ng API Credentials & Config
  const handleSaveUnityBillsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUnityBills(true);
    try {
      const res = await fetch('/api/admin/unitybills/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(unityBillsConfig),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setUnityBillsConfig(data.config);
        flashMessage('UnityBills.ng configuration saved! Testing connection...');
        await handleTestUnityBillsConnection();
      } else {
        flashMessage(data.error || 'Failed to save UnityBills configuration');
      }
    } catch (err: any) {
      flashMessage(`Error saving UnityBills: ${err.message}`);
    } finally {
      setIsSavingUnityBills(false);
    }
  };

  // Test and Ping Live UnityBills Server
  const handleTestUnityBillsConnection = async () => {
    setIsTestingUnityBills(true);
    setUnityBillsTestResult(null);
    try {
      const res = await fetch('/api/admin/unitybills/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUnityBillsConfig(prev => ({
          ...prev,
          lastTested: data.lastTested,
          lastStatus: data.status,
          balance: data.balance ?? prev.balance,
        }));
        setUnityBillsTestResult(`✓ Connected! Latency: ${data.latency}ms | Provider Balance: ₦${(data.balance || 0).toLocaleString()} | ${data.message}`);
        flashMessage(`UnityBills connection active: ${data.latency}ms`);
      } else {
        setUnityBillsTestResult(`✗ Ping note: ${data.message || data.error || 'Connection failed'}`);
      }
    } catch (err: any) {
      setUnityBillsTestResult(`✗ Network error: ${err.message}`);
    } finally {
      setIsTestingUnityBills(false);
    }
  };

  // Adjust User Wallet
  const handleWalletAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser) return;
    try {
      const res = await fetch(`/api/admin/users/${adjustTargetUser.id}/wallet-adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({
          type: adjustType,
          amount: parseFloat(adjustAmount),
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      flashMessage(`Wallet adjusted successfully. New balance: ₦${data.newBalance.toLocaleString()}`);
      setAdjustTargetUser(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchAllData();
      onRefreshUser();
    } catch (err: any) {
      flashMessage(`Error: ${err.message}`);
    }
  };

  // Toggle User Status / Role
  const handleUpdateUserStatus = async (user: User, newStatus: 'active' | 'suspended') => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        flashMessage(`User status updated to ${newStatus}`);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpgradeToReseller = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ role: 'reseller' }),
      });
      if (res.ok) {
        flashMessage(`${user.name} upgraded to Reseller tier!`);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Data Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/data-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(newPlan),
      });
      if (res.ok) {
        flashMessage('Data plan created successfully');
        setIsAddingPlan(false);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Data Plan
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      const res = await fetch(`/api/admin/data-plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(editingPlan),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage(`Data plan "${editingPlan.name}" updated successfully!`);
        setEditingPlan(null);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to update data plan');
      }
    } catch (err: any) {
      flashMessage(`Error updating plan: ${err.message}`);
    }
  };

  // Toggle Plan Active Status
  const handleTogglePlanActive = async (plan: DataPlan) => {
    try {
      const updatedStatus = !plan.isActive;
      const res = await fetch(`/api/admin/data-plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ isActive: updatedStatus }),
      });
      if (res.ok) {
        flashMessage(`Plan "${plan.name}" is now ${updatedStatus ? 'Active' : 'Inactive'}`);
        fetchAllData();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Delete Data Plan
  const handleDeletePlan = (id: string) => {
    const plan = plans.find(p => p.id === id);
    setDeleteConfirmTarget({
      type: 'plan',
      id,
      name: plan ? `${plan.network} - ${plan.name}` : `Data Plan #${id}`,
    });
  };

  // Update Airtime Discount & plan_id
  const handleUpdateAirtimeDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAirtimeDiscount) return;
    try {
      const res = await fetch(`/api/admin/airtime-discounts/${editingAirtimeDiscount.network}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(editingAirtimeDiscount),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage(`Airtime configuration for ${editingAirtimeDiscount.network.toUpperCase()} updated successfully!`);
        setEditingAirtimeDiscount(null);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to update airtime configuration');
      }
    } catch (err: any) {
      flashMessage(`Error updating airtime: ${err.message}`);
    }
  };

  // Toggle Airtime Active
  const handleToggleAirtimeActive = async (disc: AirtimeDiscount) => {
    try {
      const updatedStatus = !disc.isActive;
      const res = await fetch(`/api/admin/airtime-discounts/${disc.network}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ ...disc, isActive: updatedStatus }),
      });
      if (res.ok) {
        flashMessage(`${disc.network.toUpperCase()} airtime is now ${updatedStatus ? 'Active' : 'Inactive'}`);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Electricity Disco
  const handleCreateDisco = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/electricity-discos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(newDisco),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage('Electricity disco added successfully');
        setIsAddingDisco(false);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to add electricity disco');
      }
    } catch (err: any) {
      flashMessage(`Error: ${err.message}`);
    }
  };

  // Update Electricity Disco
  const handleUpdateDisco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisco) return;
    try {
      const res = await fetch(`/api/admin/electricity-discos/${editingDisco.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(editingDisco),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage(`Disco "${editingDisco.name}" updated successfully!`);
        setEditingDisco(null);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to update disco');
      }
    } catch (err: any) {
      flashMessage(`Error: ${err.message}`);
    }
  };

  // Delete Electricity Disco
  const handleDeleteDisco = (id: string) => {
    const disco = electricityDiscos.find(d => d.id === id);
    setDeleteConfirmTarget({
      type: 'disco',
      id,
      name: disco ? disco.name : `Disco #${id}`,
    });
  };

  // Create Cable Package
  const handleCreateCable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/cable-packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(newCable),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage('Cable package created successfully');
        setIsAddingCable(false);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to add cable package');
      }
    } catch (err: any) {
      flashMessage(`Error: ${err.message}`);
    }
  };

  // Update Cable Package
  const handleUpdateCable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCable) return;
    try {
      const res = await fetch(`/api/admin/cable-packages/${editingCable.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(editingCable),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage(`Cable package "${editingCable.name}" updated successfully!`);
        setEditingCable(null);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to update package');
      }
    } catch (err: any) {
      flashMessage(`Error: ${err.message}`);
    }
  };

  // Delete Cable Package
  const handleDeleteCable = (id: string) => {
    const pkg = cablePackages.find(p => p.id === id);
    setDeleteConfirmTarget({
      type: 'cable',
      id,
      name: pkg ? `${pkg.provider.toUpperCase()} - ${pkg.name}` : `Bouquet #${id}`,
    });
  };

  // Create Exam PIN
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/exam-pins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(newExam),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage('Exam PIN package created successfully');
        setIsAddingExam(false);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to add exam PIN package');
      }
    } catch (err: any) {
      flashMessage(`Error: ${err.message}`);
    }
  };

  // Update Exam PIN
  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;
    try {
      const res = await fetch(`/api/admin/exam-pins/${editingExam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(editingExam),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage(`Exam PIN "${editingExam.name}" updated successfully!`);
        setEditingExam(null);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to update exam PIN');
      }
    } catch (err: any) {
      flashMessage(`Error: ${err.message}`);
    }
  };

  // Delete Exam PIN
  const handleDeleteExam = (id: string) => {
    const pin = examPins.find(p => p.id === id);
    setDeleteConfirmTarget({
      type: 'exam',
      id,
      name: pin ? `${pin.exam} - ${pin.name}` : `Exam PIN #${id}`,
    });
  };

  const handleDeleteUser = (user: User) => {
    setDeleteConfirmTarget({
      type: 'user',
      id: user.id,
      name: `${user.name} (${user.email})`,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(newUserForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMessage(data.message || `User "${newUserForm.name}" registered successfully!`);
        setIsAddingUser(false);
        setNewUserForm({
          name: '',
          email: '',
          phone: '',
          role: 'customer',
          walletBalance: 0,
        });
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      flashMessage(`Error registering user: ${err.message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Centralized in-app deletion execution
  const executeDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      let endpoint = '';
      let successMsg = '';
      if (deleteConfirmTarget.type === 'plan') {
        endpoint = `/api/admin/data-plans/${deleteConfirmTarget.id}`;
        successMsg = `Data plan "${deleteConfirmTarget.name}" deleted`;
      } else if (deleteConfirmTarget.type === 'disco') {
        endpoint = `/api/admin/electricity-discos/${deleteConfirmTarget.id}`;
        successMsg = `Electricity disco "${deleteConfirmTarget.name}" deleted`;
      } else if (deleteConfirmTarget.type === 'cable') {
        endpoint = `/api/admin/cable-packages/${deleteConfirmTarget.id}`;
        successMsg = `Cable bouquet "${deleteConfirmTarget.name}" deleted`;
      } else if (deleteConfirmTarget.type === 'exam') {
        endpoint = `/api/admin/exam-pins/${deleteConfirmTarget.id}`;
        successMsg = `Exam PIN package "${deleteConfirmTarget.name}" deleted`;
      } else if (deleteConfirmTarget.type === 'user') {
        endpoint = `/api/admin/users/${deleteConfirmTarget.id}`;
        successMsg = `User "${deleteConfirmTarget.name}" deleted`;
      }

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'x-user-id': currentAdmin.id },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        flashMessage(successMsg);
        setDeleteConfirmTarget(null);
        fetchAllData();
      } else {
        flashMessage(data.error || 'Failed to delete item');
      }
    } catch (err: any) {
      flashMessage(`Error deleting item: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Refund Transaction in-app modal prompt
  const handleRefundTx = (tx: Transaction) => {
    setRefundTargetTx({
      tx,
      reason: 'Customer service resolution',
    });
  };

  const executeRefundTx = async () => {
    if (!refundTargetTx) return;
    setIsRefunding(true);
    try {
      const res = await fetch(`/api/admin/transactions/refund/${refundTargetTx.tx.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify({ reason: refundTargetTx.reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        flashMessage('Transaction refunded and wallet credited!');
        setRefundTargetTx(null);
        fetchAllData();
      } else {
        flashMessage(`Error: ${data.error || 'Refund failed'}`);
      }
    } catch (err: any) {
      flashMessage(`Error refunding transaction: ${err.message}`);
    } finally {
      setIsRefunding(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentAdmin.id,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        flashMessage('Platform settings saved successfully');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone.includes(userSearch)
  );

  const filteredTransactions = transactions.filter(t =>
    t.reference.toLowerCase().includes(txSearch.toLowerCase()) ||
    t.recipient.toLowerCase().includes(txSearch.toLowerCase()) ||
    t.userName.toLowerCase().includes(txSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner - API Wallet Balance with Auto-Sync */}
      <div className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950 text-white shadow-2xl border border-slate-800">
        <div className="space-y-2.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-400/30">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              SUPER ADMINISTRATOR CONSOLE
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              API Wallet Auto-Sync Active (30s)
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
              VTUNaija Gateway API Wallet Balance
            </span>
            <div className="flex flex-wrap items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                ₦{(vtuConfig.balance ?? stats.providerBalance ?? 185000).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Gateway Status: <strong className="text-emerald-400 font-bold uppercase">{vtuConfig.lastStatus || 'Connected'}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-xl">
            Real-time management of users, financial ledgers, VTU API gateway balance & live product pricing.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={async () => {
              await handleTestVtuConnection();
              await fetchAllData();
            }}
            disabled={isTestingVtu}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isTestingVtu ? 'animate-spin' : ''}`} />
            <span>{isTestingVtu ? 'Syncing API Balance...' : 'Sync Balance Now'}</span>
          </button>
        </div>

        {/* Background glow styling */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {statusMessage && (
        <div className="p-4 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 rounded-2xl text-purple-900 dark:text-purple-200 text-xs font-bold animate-fade-in">
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview & Financials', icon: TrendingUp },
          { id: 'users', label: 'User Accounts', icon: Users },
          { id: 'plans', label: 'Data Plans', icon: Layers },
          { id: 'airtime', label: 'Airtime API & Discounts', icon: Phone },
          { id: 'bills', label: 'Bills Payment API', icon: Zap },
          { id: 'providers', label: 'VTU API Gateways', icon: Activity },
          { id: 'transactions', label: 'All Transactions', icon: CreditCard },
          { id: 'manual_funding', label: 'Manual Funding Requests', icon: Landmark },
          { id: 'settings', label: 'System Settings', icon: Settings },
          { id: 'audit', label: 'Audit Trail', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-2xl whitespace-nowrap transition ${
                isActive
                  ? 'bg-purple-700 text-white shadow-md shadow-purple-900/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & FINANCIALS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main 9 Financial & Operating Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Users</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">
                {stats.totalUsers}
              </span>
              <span className="text-[11px] text-purple-600 font-semibold">{stats.totalResellers} Certified Resellers</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Wallet Liabilities</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">
                ₦{stats.totalWalletLiabilities.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400">Total customer credit in app</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Sales</span>
              <span className="text-3xl font-black text-purple-700 dark:text-purple-400 mt-1 block">
                ₦{stats.totalSales.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400">Gross VTU services delivered</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Net Platform Profit</span>
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                ₦{stats.totalProfit.toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">After provider wholesale costs</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Deposits</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                ₦{stats.totalDeposits.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400">Via Paystack & Bank Transfers</span>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white border border-purple-700/60 shadow-lg col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-200 font-bold uppercase tracking-wider block">VTUNaija API Wallet</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  Live Float
                </span>
              </div>
              <span className="text-3xl font-black text-white mt-1 block">
                ₦{(vtuConfig.balance ?? stats.providerBalance ?? 185000).toLocaleString()}
              </span>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-800/80 text-[11px] text-purple-200">
                <span>Upstream API Balance</span>
                <button
                  onClick={handleTestVtuConnection}
                  disabled={isTestingVtu}
                  className="font-bold underline text-white hover:text-purple-200 transition"
                >
                  {isTestingVtu ? 'Syncing...' : 'Sync Balance'}
                </button>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Transactions</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {stats.totalTransactions}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">All channels</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Pending / Failed</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-black text-amber-500">{stats.pendingCount}</span>
                <span className="text-slate-400">/</span>
                <span className="text-2xl font-black text-rose-500">{stats.failedCount}</span>
              </div>
              <span className="text-[11px] text-slate-400">Retryable with 1-click</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Registered Users</h2>
              <p className="text-xs text-slate-400">Manage user roles, register new users, verify statuses, and audit wallet balances</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name, email, phone..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <button
                onClick={() => setIsAddingUser(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-sm whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register User</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Wallet Balance</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Txs</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{u.name}</span>
                        <span className="text-[11px] text-slate-400">{u.email} • {u.phone}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        u.role === 'admin'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : u.role === 'reseller'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                      ₦{u.walletBalance.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 font-bold">{u.totalTransactionsCount}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAdjustTargetUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-[11px]"
                        >
                          Adjust Wallet
                        </button>
                        {u.role === 'customer' && (
                          <button
                            onClick={() => handleUpgradeToReseller(u)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]"
                          >
                            Make Reseller
                          </button>
                        )}
                        {u.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateUserStatus(u, 'suspended')}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateUserStatus(u, 'active')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px]"
                          >
                            Activate
                          </button>
                        )}
                        {u.email.toLowerCase() !== 'naeemummadau@gmail.com' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Register New User Modal */}
          {isAddingUser && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <form onSubmit={handleCreateUser} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-700 dark:text-purple-300">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Register New User</h3>
                  </div>
                  <button type="button" onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.name}
                      onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                      placeholder="e.g. Ibrahim Abubakar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={newUserForm.email}
                        onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        placeholder="e.g. ibrahim@gmail.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={newUserForm.phone}
                        onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                        placeholder="08012345678"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Account Role</label>
                      <select
                        value={newUserForm.role}
                        onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="customer">Customer (Standard)</option>
                        <option value="reseller">Reseller (Discount Rates)</option>
                        <option value="agent">Agent (Partner)</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Initial Wallet (₦)</label>
                      <input
                        type="number"
                        min="0"
                        value={newUserForm.walletBalance}
                        onChange={e => setNewUserForm({ ...newUserForm, walletBalance: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-[11px] text-purple-900 dark:text-purple-300 space-y-0.5">
                  <p className="font-bold">⚡ Direct Firestore Persistence</p>
                  <p className="text-slate-500 dark:text-slate-400">User account will be stored directly in Firebase Firestore and synced across devices.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    {isCreatingUser ? 'Registering...' : 'Register User'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Wallet Adjustment Modal */}
          {adjustTargetUser && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleWalletAdjustSubmit} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Audited Wallet Adjustment
                  </h3>
                  <button type="button" onClick={() => setAdjustTargetUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-purple-900 dark:text-purple-300">Target User: {adjustTargetUser.name}</p>
                  <p className="text-slate-600 dark:text-slate-400">Current Balance: ₦{adjustTargetUser.walletBalance.toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`py-2 rounded-xl text-xs font-bold ${adjustType === 'credit' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Credit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`py-2 rounded-xl text-xs font-bold ${adjustType === 'debit' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Debit (-)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Mandatory Audit Reason</label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    placeholder="e.g. Bank dispute reversal or bonus"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustTargetUser(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                  >
                    Save & Apply Audit Log
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DATA PLANS & PRICING */}
      {activeTab === 'plans' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Data Plans & Dynamic Pricing</h2>
              <p className="text-xs text-slate-400">Configure provider purchase costs, retail prices and reseller margins</p>
            </div>
            <button
              onClick={() => setIsAddingPlan(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Data Plan</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Network</th>
                  <th className="pb-3">Plan Name</th>
                  <th className="pb-3">Plan ID / Code</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Provider Cost</th>
                  <th className="pb-3">Customer Price</th>
                  <th className="pb-3">Reseller Price</th>
                  <th className="pb-3">Est. Profit</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plans.map(p => {
                  const profit = p.customerPrice - p.providerCost;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-bold uppercase">{p.network}</td>
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">
                        {p.name}
                        <span className="block text-[10px] text-slate-400">{p.size} • {p.validity}</span>
                      </td>
                      <td className="py-3 font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded inline-block">
                        {p.planCode || p.id}
                      </td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">{p.planType}</span></td>
                      <td className="py-3 font-mono text-slate-500">₦{p.providerCost.toLocaleString()}</td>
                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">₦{p.customerPrice.toLocaleString()}</td>
                      <td className="py-3 font-mono font-bold text-purple-600">₦{p.resellerPrice.toLocaleString()}</td>
                      <td className="py-3 font-mono font-bold text-emerald-600">+₦{profit.toLocaleString()}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleTogglePlanActive(p)}
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition ${
                            p.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingPlan(p)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                            title="Edit Plan & Plan ID"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Plan Modal */}
          {isAddingPlan && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreatePlan} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Create New Data Plan</h3>
                  <button type="button" onClick={() => setIsAddingPlan(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Network</label>
                    <select
                      value={newPlan.network}
                      onChange={e => setNewPlan({ ...newPlan, network: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="mtn">MTN</option>
                      <option value="airtel">Airtel</option>
                      <option value="glo">Glo</option>
                      <option value="9mobile">9mobile</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Category</label>
                    <select
                      value={newPlan.planType}
                      onChange={e => setNewPlan({ ...newPlan, planType: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="SME">SME</option>
                      <option value="Corporate">Corporate Gifting</option>
                      <option value="Direct">Direct / Promo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Plan Display Name</label>
                    <input
                      type="text"
                      required
                      value={newPlan.name}
                      onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                      placeholder="e.g. MTN 1.5GB (30 Days)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={newPlan.planCode || ''}
                      onChange={e => setNewPlan({ ...newPlan, planCode: e.target.value })}
                      placeholder="e.g. sme_1gb or 1000"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Size (e.g. 1.5GB)</label>
                    <input
                      type="text"
                      required
                      value={newPlan.size || ''}
                      onChange={e => setNewPlan({ ...newPlan, size: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Validity (e.g. 30 Days)</label>
                    <input
                      type="text"
                      required
                      value={newPlan.validity || ''}
                      onChange={e => setNewPlan({ ...newPlan, validity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Provider Cost (₦)</label>
                    <input
                      type="number"
                      required
                      value={newPlan.providerCost !== undefined && !Number.isNaN(newPlan.providerCost) ? newPlan.providerCost : ''}
                      onChange={e => setNewPlan({ ...newPlan, providerCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Customer Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={newPlan.customerPrice !== undefined && !Number.isNaN(newPlan.customerPrice) ? newPlan.customerPrice : ''}
                      onChange={e => setNewPlan({ ...newPlan, customerPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Reseller Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={newPlan.resellerPrice !== undefined && !Number.isNaN(newPlan.resellerPrice) ? newPlan.resellerPrice : ''}
                      onChange={e => setNewPlan({ ...newPlan, resellerPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPlan(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                  >
                    Save Plan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Plan Modal */}
          {editingPlan && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleUpdatePlan} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Data Plan & VTU Plan ID</h3>
                  <button type="button" onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Network</label>
                    <select
                      value={editingPlan.network}
                      onChange={e => setEditingPlan({ ...editingPlan, network: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="mtn">MTN</option>
                      <option value="airtel">Airtel</option>
                      <option value="glo">Glo</option>
                      <option value="9mobile">9mobile</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Category</label>
                    <select
                      value={editingPlan.planType}
                      onChange={e => setEditingPlan({ ...editingPlan, planType: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="SME">SME</option>
                      <option value="Corporate">Corporate Gifting</option>
                      <option value="Direct">Direct / Promo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Plan Display Name</label>
                    <input
                      type="text"
                      required
                      value={editingPlan.name}
                      onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={editingPlan.planCode}
                      onChange={e => setEditingPlan({ ...editingPlan, planCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Size (e.g. 1.5GB)</label>
                    <input
                      type="text"
                      required
                      value={editingPlan.size}
                      onChange={e => setEditingPlan({ ...editingPlan, size: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Validity (e.g. 30 Days)</label>
                    <input
                      type="text"
                      required
                      value={editingPlan.validity}
                      onChange={e => setEditingPlan({ ...editingPlan, validity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Provider Cost (₦)</label>
                    <input
                      type="number"
                      required
                      value={editingPlan.providerCost !== undefined && !Number.isNaN(editingPlan.providerCost) ? editingPlan.providerCost : ''}
                      onChange={e => setEditingPlan({ ...editingPlan, providerCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Customer Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={editingPlan.customerPrice !== undefined && !Number.isNaN(editingPlan.customerPrice) ? editingPlan.customerPrice : ''}
                      onChange={e => setEditingPlan({ ...editingPlan, customerPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Reseller Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={editingPlan.resellerPrice !== undefined && !Number.isNaN(editingPlan.resellerPrice) ? editingPlan.resellerPrice : ''}
                      onChange={e => setEditingPlan({ ...editingPlan, resellerPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editPlanActive"
                    checked={editingPlan.isActive}
                    onChange={e => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300"
                  />
                  <label htmlFor="editPlanActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Plan Available / Active for Customers & Resellers
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Update Plan
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB: AIRTIME API & DISCOUNTS */}
      {activeTab === 'airtime' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Airtime API & Margin Discounts</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    Endpoint: {vtuConfig.baseUrl}{vtuConfig.airtimeEndpoint}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure wholesale provider cost percentages, customer retail discounts, reseller commissions, and VTUNaija plan_id / network codes
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAllData}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Rates</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Network</th>
                    <th className="pb-3">Network Plan ID (VTU)</th>
                    <th className="pb-3">Provider Cost (%)</th>
                    <th className="pb-3">Customer Discount (%)</th>
                    <th className="pb-3">Reseller Discount (%)</th>
                    <th className="pb-3">Gross Margin</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {airtimeDiscounts.map(disc => {
                    const margin = disc.customerDiscountPercent - disc.providerCostPercent;
                    return (
                      <tr key={disc.network} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-bold uppercase flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                          <span>{disc.network}</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded inline-block">
                          {disc.plan_id || (vtuConfig.networkIds as any)[disc.network === '9mobile' ? 'nineMobile' : disc.network] || '—'}
                        </td>
                        <td className="py-3 font-mono text-slate-500">{disc.providerCostPercent}%</td>
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">{disc.customerDiscountPercent}%</td>
                        <td className="py-3 font-mono font-bold text-purple-600">{disc.resellerDiscountPercent}%</td>
                        <td className="py-3 font-mono font-bold text-emerald-600">
                          {margin >= 0 ? `+${margin.toFixed(1)}%` : `${margin.toFixed(1)}%`}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleToggleAirtimeActive(disc)}
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition ${
                              disc.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'
                            }`}
                          >
                            {disc.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setEditingAirtimeDiscount({ ...disc, plan_id: disc.plan_id || (vtuConfig.networkIds as any)[disc.network === '9mobile' ? 'nineMobile' : disc.network] || '' })}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition inline-flex items-center gap-1 font-bold"
                            title="Configure Rates & Plan ID"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Rate</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Airtime Discount Modal */}
          {editingAirtimeDiscount && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleUpdateAirtimeDiscount} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                      {editingAirtimeDiscount.network} Airtime Configuration
                    </h3>
                    <p className="text-xs text-slate-400">Map plan_id and configure wholesale & retail margin</p>
                  </div>
                  <button type="button" onClick={() => setEditingAirtimeDiscount(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Network Plan ID / Code (VTUNaija Topup)</label>
                    <input
                      type="text"
                      required
                      value={editingAirtimeDiscount.plan_id || ''}
                      onChange={e => setEditingAirtimeDiscount({ ...editingAirtimeDiscount, plan_id: e.target.value })}
                      placeholder="e.g. 1 (MTN), 2 (GLO), 3 (9Mobile), 4 (Airtel)"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                    <span className="text-[10px] text-slate-400">Sent to VTUNaija topup payload as plan_id & network</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Provider Cost (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={editingAirtimeDiscount.providerCostPercent}
                        onChange={e => setEditingAirtimeDiscount({ ...editingAirtimeDiscount, providerCostPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">Customer Disc (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={editingAirtimeDiscount.customerDiscountPercent}
                        onChange={e => setEditingAirtimeDiscount({ ...editingAirtimeDiscount, customerDiscountPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">Reseller Disc (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={editingAirtimeDiscount.resellerDiscountPercent}
                        onChange={e => setEditingAirtimeDiscount({ ...editingAirtimeDiscount, resellerDiscountPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="editAirtimeActive"
                      checked={editingAirtimeDiscount.isActive}
                      onChange={e => setEditingAirtimeDiscount({ ...editingAirtimeDiscount, isActive: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300"
                    />
                    <label htmlFor="editAirtimeActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Airtime Topup Active for Customers
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAirtimeDiscount(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Save Airtime Config
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB: BILLS PAYMENT API (ELECTRICITY, CABLE, EXAM PINS) */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          {/* Subtabs for Bills Payment */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {[
              { id: 'electricity', label: 'Electricity Discos', icon: Zap, count: electricityDiscos.length },
              { id: 'cable', label: 'Cable TV Bouquets', icon: Tv, count: cablePackages.length },
              { id: 'exam', label: 'Examination PINs', icon: GraduationCap, count: examPins.length },
            ].map(sub => {
              const Icon = sub.icon;
              const isCurrent = billsSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setBillsSubTab(sub.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isCurrent ? 'bg-purple-900 text-purple-200' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {sub.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subtab 1: Electricity Discos */}
          {billsSubTab === 'electricity' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Electricity Distribution Companies (Discos)</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      API: {vtuConfig.baseUrl}{vtuConfig.electricityEndpoint}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Manage disco plan IDs, service convenience fees, and active routing status</p>
                </div>
                <button
                  onClick={() => setIsAddingDisco(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Disco</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Disco Name</th>
                      <th className="pb-3">Short Name</th>
                      <th className="pb-3">Plan ID & Network ID</th>
                      <th className="pb-3">Service Fee (₦)</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {electricityDiscos.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-slate-900 dark:text-white">{d.name}</td>
                        <td className="py-3 font-bold uppercase text-purple-600">{d.shortName}</td>
                        <td className="py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded text-[11px] w-fit">
                              Plan: {d.plan_id || d.code}
                            </span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded text-[10px] w-fit">
                              Net: {d.network_id || d.shortName || d.code}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-slate-600 dark:text-slate-300">₦{d.serviceFee}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            d.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {d.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingDisco(d)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                              title="Edit Disco"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDisco(d.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title="Delete Disco"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 2: Cable TV Packages */}
          {billsSubTab === 'cable' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Cable TV Subscription Bouquets</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      API: {vtuConfig.baseUrl}{vtuConfig.cableEndpoint}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Map DStv, GOtv, and StarTimes packages with VTUNaija plan_ids and pricing</p>
                </div>
                <button
                  onClick={() => setIsAddingCable(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Bouquet</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Provider</th>
                      <th className="pb-3">Bouquet Name</th>
                      <th className="pb-3">Plan ID & Network ID</th>
                      <th className="pb-3">Provider Cost</th>
                      <th className="pb-3">Customer Price</th>
                      <th className="pb-3">Profit Margin</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cablePackages.map(pkg => {
                      const profit = pkg.price - pkg.providerCost;
                      return (
                        <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 font-bold uppercase text-purple-600">{pkg.provider}</td>
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">{pkg.name}</td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded text-[11px] w-fit">
                                Plan: {pkg.plan_id || pkg.code}
                              </span>
                              <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded text-[10px] w-fit">
                                Net: {pkg.network_id || pkg.provider}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-slate-500">₦{pkg.providerCost.toLocaleString()}</td>
                          <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">₦{pkg.price.toLocaleString()}</td>
                          <td className="py-3 font-mono font-bold text-emerald-600">+₦{profit.toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              pkg.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}>
                              {pkg.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingCable(pkg)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                                title="Edit Bouquet"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCable(pkg.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                title="Delete Bouquet"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 3: Exam PINs */}
          {billsSubTab === 'exam' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Exam PINs & Result Checker Packages</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      API: {vtuConfig.baseUrl}{vtuConfig.examEndpoint}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Configure WAEC, NECO, and JAMB PIN rates, stock levels, and VTUNaija plan_ids</p>
                </div>
                <button
                  onClick={() => setIsAddingExam(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Exam Package</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Examination Body</th>
                      <th className="pb-3">Package Title</th>
                      <th className="pb-3">Plan ID & Network ID</th>
                      <th className="pb-3">Wholesale Cost</th>
                      <th className="pb-3">Retail Price</th>
                      <th className="pb-3">Stock Available</th>
                      <th className="pb-3">Profit Margin</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {examPins.map(pin => {
                      const profit = pin.price - pin.providerCost;
                      return (
                        <tr key={pin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 font-black text-purple-700 dark:text-purple-300">{pin.exam}</td>
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">{pin.name}</td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded text-[11px] w-fit">
                                Plan: {pin.plan_id || pin.code || pin.exam}
                              </span>
                              <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded text-[10px] w-fit">
                                Net: {pin.network_id || pin.exam}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-slate-500">₦{pin.providerCost.toLocaleString()}</td>
                          <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">₦{pin.price.toLocaleString()}</td>
                          <td className="py-3 font-mono text-slate-700 dark:text-slate-300">{pin.stockAvailable} units</td>
                          <td className="py-3 font-mono font-bold text-emerald-600">+₦{profit.toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              pin.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}>
                              {pin.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingExam(pin)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                                title="Edit Exam PIN"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExam(pin.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                title="Delete Exam PIN"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Electricity Disco Modal */}
          {isAddingDisco && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreateDisco} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add Electricity Disco</h3>
                  <button type="button" onClick={() => setIsAddingDisco(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Disco Full Name</label>
                  <input
                    type="text"
                    required
                    value={newDisco.name || ''}
                    onChange={e => setNewDisco({ ...newDisco, name: e.target.value })}
                    placeholder="e.g. Abuja Electricity Distribution Company"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Short Name</label>
                    <input
                      type="text"
                      required
                      value={newDisco.shortName || ''}
                      onChange={e => setNewDisco({ ...newDisco, shortName: e.target.value.toUpperCase() })}
                      placeholder="e.g. AEDC"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={newDisco.plan_id || ''}
                      onChange={e => setNewDisco({ ...newDisco, plan_id: e.target.value, code: e.target.value })}
                      placeholder="e.g. aedc"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Network ID (VTUNaija / Provider)</label>
                  <input
                    type="text"
                    value={newDisco.network_id || ''}
                    onChange={e => setNewDisco({ ...newDisco, network_id: e.target.value })}
                    placeholder="e.g. AEDC or 1"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Service Convenience Fee (₦)</label>
                  <input
                    type="number"
                    required
                    value={newDisco.serviceFee || 0}
                    onChange={e => setNewDisco({ ...newDisco, serviceFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingDisco(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Create Disco
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Electricity Disco Modal */}
          {editingDisco && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleUpdateDisco} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Electricity Disco</h3>
                  <button type="button" onClick={() => setEditingDisco(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Disco Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingDisco.name}
                    onChange={e => setEditingDisco({ ...editingDisco, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Short Name</label>
                    <input
                      type="text"
                      required
                      value={editingDisco.shortName}
                      onChange={e => setEditingDisco({ ...editingDisco, shortName: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={editingDisco.plan_id || editingDisco.code}
                      onChange={e => setEditingDisco({ ...editingDisco, plan_id: e.target.value, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Network ID (VTUNaija / Provider)</label>
                  <input
                    type="text"
                    value={editingDisco.network_id || ''}
                    onChange={e => setEditingDisco({ ...editingDisco, network_id: e.target.value })}
                    placeholder="e.g. AEDC or 1"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Service Convenience Fee (₦)</label>
                  <input
                    type="number"
                    required
                    value={editingDisco.serviceFee}
                    onChange={e => setEditingDisco({ ...editingDisco, serviceFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editDiscoActive"
                    checked={editingDisco.isActive}
                    onChange={e => setEditingDisco({ ...editingDisco, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300"
                  />
                  <label htmlFor="editDiscoActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active for Bill Payments
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingDisco(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Update Disco
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Cable Package Modal */}
          {isAddingCable && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreateCable} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add Cable Bouquet</h3>
                  <button type="button" onClick={() => setIsAddingCable(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Provider</label>
                    <select
                      value={newCable.provider}
                      onChange={e => setNewCable({ ...newCable, provider: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="dstv">DStv</option>
                      <option value="gotv">GOtv</option>
                      <option value="startimes">StarTimes</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={newCable.plan_id || ''}
                      onChange={e => setNewCable({ ...newCable, plan_id: e.target.value, code: e.target.value })}
                      placeholder="e.g. dstv-yanga or 101"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Network ID (VTUNaija / Provider)</label>
                  <input
                    type="text"
                    value={newCable.network_id || ''}
                    onChange={e => setNewCable({ ...newCable, network_id: e.target.value })}
                    placeholder="e.g. dstv or 1"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Bouquet Name</label>
                  <input
                    type="text"
                    required
                    value={newCable.name || ''}
                    onChange={e => setNewCable({ ...newCable, name: e.target.value })}
                    placeholder="e.g. DStv Yanga Bouquet"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Provider Wholesale Cost (₦)</label>
                    <input
                      type="number"
                      required
                      value={newCable.providerCost || 0}
                      onChange={e => setNewCable({ ...newCable, providerCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Customer Retail Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={newCable.price || 0}
                      onChange={e => setNewCable({ ...newCable, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCable(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Add Bouquet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Cable Package Modal */}
          {editingCable && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleUpdateCable} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Cable Bouquet</h3>
                  <button type="button" onClick={() => setEditingCable(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Provider</label>
                    <select
                      value={editingCable.provider}
                      onChange={e => setEditingCable({ ...editingCable, provider: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="dstv">DStv</option>
                      <option value="gotv">GOtv</option>
                      <option value="startimes">StarTimes</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={editingCable.plan_id || editingCable.code}
                      onChange={e => setEditingCable({ ...editingCable, plan_id: e.target.value, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Network ID (VTUNaija / Provider)</label>
                  <input
                    type="text"
                    value={editingCable.network_id || ''}
                    onChange={e => setEditingCable({ ...editingCable, network_id: e.target.value })}
                    placeholder="e.g. dstv or 1"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Bouquet Name</label>
                  <input
                    type="text"
                    required
                    value={editingCable.name}
                    onChange={e => setEditingCable({ ...editingCable, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Provider Wholesale Cost (₦)</label>
                    <input
                      type="number"
                      required
                      value={editingCable.providerCost}
                      onChange={e => setEditingCable({ ...editingCable, providerCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Customer Retail Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={editingCable.price}
                      onChange={e => setEditingCable({ ...editingCable, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editCableActive"
                    checked={editingCable.isActive}
                    onChange={e => setEditingCable({ ...editingCable, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300"
                  />
                  <label htmlFor="editCableActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active for Subscriptions
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCable(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Update Bouquet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Exam PIN Modal */}
          {isAddingExam && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreateExam} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add Exam PIN Package</h3>
                  <button type="button" onClick={() => setIsAddingExam(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Exam Body</label>
                    <select
                      value={newExam.exam}
                      onChange={e => setNewExam({ ...newExam, exam: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="WAEC">WAEC</option>
                      <option value="NECO">NECO</option>
                      <option value="JAMB">JAMB</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={newExam.plan_id || ''}
                      onChange={e => setNewExam({ ...newExam, plan_id: e.target.value, code: e.target.value })}
                      placeholder="e.g. waec or 1"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Network ID (VTUNaija / Provider)</label>
                  <input
                    type="text"
                    value={newExam.network_id || ''}
                    onChange={e => setNewExam({ ...newExam, network_id: e.target.value })}
                    placeholder="e.g. WAEC or 1"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Package Title</label>
                  <input
                    type="text"
                    required
                    value={newExam.name || ''}
                    onChange={e => setNewExam({ ...newExam, name: e.target.value })}
                    placeholder="e.g. WAEC Result Checker PIN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Cost (₦)</label>
                    <input
                      type="number"
                      required
                      value={newExam.providerCost || 0}
                      onChange={e => setNewExam({ ...newExam, providerCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={newExam.price || 0}
                      onChange={e => setNewExam({ ...newExam, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Stock</label>
                    <input
                      type="number"
                      required
                      value={newExam.stockAvailable || 0}
                      onChange={e => setNewExam({ ...newExam, stockAvailable: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingExam(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Add Package
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Exam PIN Modal */}
          {editingExam && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleUpdateExam} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Exam PIN Package</h3>
                  <button type="button" onClick={() => setEditingExam(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Exam Body</label>
                    <select
                      value={editingExam.exam}
                      onChange={e => setEditingExam({ ...editingExam, exam: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="WAEC">WAEC</option>
                      <option value="NECO">NECO</option>
                      <option value="JAMB">JAMB</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-600 dark:text-purple-400">Plan ID / Code (VTUNaija)</label>
                    <input
                      type="text"
                      required
                      value={editingExam.plan_id || editingExam.code || editingExam.exam}
                      onChange={e => setEditingExam({ ...editingExam, plan_id: e.target.value, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-mono font-bold text-purple-900 dark:text-purple-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Network ID (VTUNaija / Provider)</label>
                  <input
                    type="text"
                    value={editingExam.network_id || ''}
                    onChange={e => setEditingExam({ ...editingExam, network_id: e.target.value })}
                    placeholder="e.g. WAEC or 1"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Package Title</label>
                  <input
                    type="text"
                    required
                    value={editingExam.name}
                    onChange={e => setEditingExam({ ...editingExam, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Cost (₦)</label>
                    <input
                      type="number"
                      required
                      value={editingExam.providerCost}
                      onChange={e => setEditingExam({ ...editingExam, providerCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Price (₦)</label>
                    <input
                      type="number"
                      required
                      value={editingExam.price}
                      onChange={e => setEditingExam({ ...editingExam, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Stock</label>
                    <input
                      type="number"
                      required
                      value={editingExam.stockAvailable}
                      onChange={e => setEditingExam({ ...editingExam, stockAvailable: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editExamActive"
                    checked={editingExam.isActive}
                    onChange={e => setEditingExam({ ...editingExam, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300"
                  />
                  <label htmlFor="editExamActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active for PIN Purchases
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingExam(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                  >
                    Update Package
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: VTU API GATEWAYS & SERVICE ROUTING */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          {/* Service Gateway Routing Hub: VTUNaija vs NCwallet */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Live Service Gateway Routing</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                        Zero Fallback Live Engine
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select which upstream API provider fulfills live transactions and verifies customer meters/cards for each service.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingRouting}
                  onClick={() => handleRouteAllServices('vtunaija')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Route ALL to VTUNaija</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingRouting}
                  onClick={() => handleRouteAllServices('ncwallet')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition disabled:opacity-50"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Route ALL to NCwallet</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingRouting}
                  onClick={() => handleRouteAllServices('unitybills')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition disabled:opacity-50"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Route ALL to UnityBills</span>
                </button>
              </div>
            </div>

            {/* Service Routing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Mobile Data */}
              <div className={`p-4 rounded-2xl border transition ${
                serviceRouting.data === 'unitybills'
                  ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                  : serviceRouting.data === 'ncwallet'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Mobile Data</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    serviceRouting.data === 'unitybills'
                      ? 'bg-blue-600 text-white'
                      : serviceRouting.data === 'ncwallet'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 text-white'
                  }`}>
                    {serviceRouting.data === 'unitybills' ? 'UnityBills' : serviceRouting.data === 'ncwallet' ? 'NCwallet' : 'VTUNaija'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  SME, CG, Gifting & Direct data plans for MTN, Glo, 9mobile & Airtel.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('data', 'vtunaija')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.data === 'vtunaija'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.data === 'vtunaija' && <Check className="w-3 h-3 shrink-0" />}
                    <span>VTUNaija</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('data', 'ncwallet')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.data === 'ncwallet'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.data === 'ncwallet' && <Check className="w-3 h-3 shrink-0" />}
                    <span>NCwallet</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('data', 'unitybills')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.data === 'unitybills'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.data === 'unitybills' && <Check className="w-3 h-3 shrink-0" />}
                    <span>UnityBills</span>
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 truncate font-mono">
                  Endpoint: {serviceRouting.data === 'unitybills' ? unityBillsConfig.baseUrl + unityBillsConfig.dataEndpoint : serviceRouting.data === 'ncwallet' ? ncWalletConfig.baseUrl + ncWalletConfig.dataEndpoint : vtuConfig.baseUrl + vtuConfig.dataEndpoint}
                </div>
              </div>

              {/* 2. Airtime VTU */}
              <div className={`p-4 rounded-2xl border transition ${
                serviceRouting.airtime === 'unitybills'
                  ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                  : serviceRouting.airtime === 'ncwallet'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Airtime VTU</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    serviceRouting.airtime === 'unitybills'
                      ? 'bg-blue-600 text-white'
                      : serviceRouting.airtime === 'ncwallet'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 text-white'
                  }`}>
                    {serviceRouting.airtime === 'unitybills' ? 'UnityBills' : serviceRouting.airtime === 'ncwallet' ? 'NCwallet' : 'VTUNaija'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Direct automated topups across all 4 Nigerian networks.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('airtime', 'vtunaija')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.airtime === 'vtunaija'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.airtime === 'vtunaija' && <Check className="w-3 h-3 shrink-0" />}
                    <span>VTUNaija</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('airtime', 'ncwallet')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.airtime === 'ncwallet'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.airtime === 'ncwallet' && <Check className="w-3 h-3 shrink-0" />}
                    <span>NCwallet</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('airtime', 'unitybills')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.airtime === 'unitybills'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.airtime === 'unitybills' && <Check className="w-3 h-3 shrink-0" />}
                    <span>UnityBills</span>
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 truncate font-mono">
                  Endpoint: {serviceRouting.airtime === 'unitybills' ? unityBillsConfig.baseUrl + unityBillsConfig.airtimeEndpoint : serviceRouting.airtime === 'ncwallet' ? ncWalletConfig.baseUrl + ncWalletConfig.airtimeEndpoint : vtuConfig.baseUrl + vtuConfig.airtimeEndpoint}
                </div>
              </div>

              {/* 3. Electricity Bills */}
              <div className={`p-4 rounded-2xl border transition ${
                serviceRouting.electricity === 'unitybills'
                  ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                  : serviceRouting.electricity === 'ncwallet'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Electricity Bills</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    serviceRouting.electricity === 'unitybills'
                      ? 'bg-blue-600 text-white'
                      : serviceRouting.electricity === 'ncwallet'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 text-white'
                  }`}>
                    {serviceRouting.electricity === 'unitybills' ? 'UnityBills' : serviceRouting.electricity === 'ncwallet' ? 'NCwallet' : 'VTUNaija'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Meter verification & prepaid token generation for all Nigerian Discos.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('electricity', 'vtunaija')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.electricity === 'vtunaija'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.electricity === 'vtunaija' && <Check className="w-3 h-3 shrink-0" />}
                    <span>VTUNaija</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('electricity', 'ncwallet')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.electricity === 'ncwallet'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.electricity === 'ncwallet' && <Check className="w-3 h-3 shrink-0" />}
                    <span>NCwallet</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('electricity', 'unitybills')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.electricity === 'unitybills'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.electricity === 'unitybills' && <Check className="w-3 h-3 shrink-0" />}
                    <span>UnityBills</span>
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 truncate font-mono">
                  Verify: {serviceRouting.electricity === 'unitybills' ? unityBillsConfig.baseUrl + (unityBillsConfig.electricityVerifyEndpoint || '/bill/electricity/verify') : serviceRouting.electricity === 'ncwallet' ? ncWalletConfig.baseUrl + (ncWalletConfig.electricityVerifyEndpoint || '/billpayment/verify/') : vtuConfig.baseUrl + (vtuConfig.electricityVerifyEndpoint || '/billpayment/verify/')}
                </div>
              </div>

              {/* 4. Cable TV */}
              <div className={`p-4 rounded-2xl border transition ${
                serviceRouting.cable === 'unitybills'
                  ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                  : serviceRouting.cable === 'ncwallet'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Cable TV</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    serviceRouting.cable === 'unitybills'
                      ? 'bg-blue-600 text-white'
                      : serviceRouting.cable === 'ncwallet'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 text-white'
                  }`}>
                    {serviceRouting.cable === 'unitybills' ? 'UnityBills' : serviceRouting.cable === 'ncwallet' ? 'NCwallet' : 'VTUNaija'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  DSTV, GOTV & Startimes smartcard verification & bouquet subscription.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('cable', 'vtunaija')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.cable === 'vtunaija'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.cable === 'vtunaija' && <Check className="w-3 h-3 shrink-0" />}
                    <span>VTUNaija</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('cable', 'ncwallet')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.cable === 'ncwallet'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.cable === 'ncwallet' && <Check className="w-3 h-3 shrink-0" />}
                    <span>NCwallet</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('cable', 'unitybills')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.cable === 'unitybills'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.cable === 'unitybills' && <Check className="w-3 h-3 shrink-0" />}
                    <span>UnityBills</span>
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 truncate font-mono">
                  Verify: {serviceRouting.cable === 'unitybills' ? unityBillsConfig.baseUrl + (unityBillsConfig.cableVerifyEndpoint || '/bill/cable/verify') : serviceRouting.cable === 'ncwallet' ? ncWalletConfig.baseUrl + (ncWalletConfig.cableVerifyEndpoint || '/cablesub/verify/') : vtuConfig.baseUrl + (vtuConfig.cableVerifyEndpoint || '/cablesub/verify/')}
                </div>
              </div>

              {/* 5. Exam PINs */}
              <div className={`p-4 rounded-2xl border transition ${
                serviceRouting.exam_pin === 'unitybills'
                  ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                  : serviceRouting.exam_pin === 'ncwallet'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Exam PINs</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    serviceRouting.exam_pin === 'unitybills'
                      ? 'bg-blue-600 text-white'
                      : serviceRouting.exam_pin === 'ncwallet'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 text-white'
                  }`}>
                    {serviceRouting.exam_pin === 'unitybills' ? 'UnityBills' : serviceRouting.exam_pin === 'ncwallet' ? 'NCwallet' : 'VTUNaija'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  WAEC, NECO & NABTEB live scratch card and token fulfillment.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('exam_pin', 'vtunaija')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.exam_pin === 'vtunaija'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.exam_pin === 'vtunaija' && <Check className="w-3 h-3 shrink-0" />}
                    <span>VTUNaija</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('exam_pin', 'ncwallet')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.exam_pin === 'ncwallet'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.exam_pin === 'ncwallet' && <Check className="w-3 h-3 shrink-0" />}
                    <span>NCwallet</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRouting}
                    onClick={() => handleRouteService('exam_pin', 'unitybills')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      serviceRouting.exam_pin === 'unitybills'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {serviceRouting.exam_pin === 'unitybills' && <Check className="w-3 h-3 shrink-0" />}
                    <span>UnityBills</span>
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 truncate font-mono">
                  Endpoint: {serviceRouting.exam_pin === 'unitybills' ? unityBillsConfig.baseUrl + unityBillsConfig.examEndpoint : serviceRouting.exam_pin === 'ncwallet' ? ncWalletConfig.baseUrl + ncWalletConfig.examEndpoint : vtuConfig.baseUrl + vtuConfig.examEndpoint}
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Upstream API Float Balances */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. VTUNaija Float Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white border border-purple-700/80 shadow-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                    VTUNaija Float Balance
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {vtuConfig.lastStatus === 'connected' ? 'Active Float' : 'Standby'}
                  </span>
                </div>
                <div className="text-3xl font-black text-white mt-1">
                  ₦{(vtuConfig.balance ?? 185000).toLocaleString()}
                </div>
                <p className="text-xs text-purple-200 mt-1">
                  Direct wallet float on <span className="font-semibold text-white">vtunaija.com.ng</span> for automated data and bills fulfillment.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-purple-800/60">
                <div className="text-xs text-purple-200">
                  <span className="block font-medium">Last Sync:</span>
                  <span className="font-mono font-bold text-white">
                    {vtuConfig.lastTested ? new Date(vtuConfig.lastTested).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTestVtuConnection}
                  disabled={isTestingVtu}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingVtu ? 'animate-spin' : ''}`} />
                  <span>{isTestingVtu ? 'Syncing...' : 'Sync VTUNaija'}</span>
                </button>
              </div>
            </div>

            {/* 2. NCwallet Float Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white border border-emerald-700/80 shadow-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                    NCwallet Float Balance
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    ncWalletConfig.lastStatus === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {ncWalletConfig.lastStatus === 'connected' ? 'Active Float' : (ncWalletConfig.apiKey ? 'Configured' : 'Unconfigured')}
                  </span>
                </div>
                <div className="text-3xl font-black text-white mt-1">
                  ₦{(ncWalletConfig.balance ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-emerald-200 mt-1">
                  Direct wallet float on <span className="font-semibold text-white">ncwallet.ng</span> for automated multi-provider fulfillment.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-emerald-800/60">
                <div className="text-xs text-emerald-200">
                  <span className="block font-medium">Last Sync:</span>
                  <span className="font-mono font-bold text-white">
                    {ncWalletConfig.lastTested ? new Date(ncWalletConfig.lastTested).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTestNcWalletConnection}
                  disabled={isTestingNcWallet}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingNcWallet ? 'animate-spin' : ''}`} />
                  <span>{isTestingNcWallet ? 'Syncing...' : 'Sync NCwallet'}</span>
                </button>
              </div>
            </div>

            {/* 3. UnityBills Float Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-sky-900 to-slate-900 text-white border border-blue-700/80 shadow-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                    UnityBills Float Balance
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    unityBillsConfig.lastStatus === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {unityBillsConfig.lastStatus === 'connected' ? 'Active Float' : (unityBillsConfig.apiKey ? 'Configured' : 'Unconfigured')}
                  </span>
                </div>
                <div className="text-3xl font-black text-white mt-1">
                  ₦{(unityBillsConfig.balance ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  Direct wallet float on <span className="font-semibold text-white">unitybills.ng</span> for automated multi-service fulfillment.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-blue-800/60">
                <div className="text-xs text-blue-200">
                  <span className="block font-medium">Last Sync:</span>
                  <span className="font-mono font-bold text-white">
                    {unityBillsConfig.lastTested ? new Date(unityBillsConfig.lastTested).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTestUnityBillsConnection}
                  disabled={isTestingUnityBills}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingUnityBills ? 'animate-spin' : ''}`} />
                  <span>{isTestingUnityBills ? 'Syncing...' : 'Sync UnityBills'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Editable VTUNaija Configuration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">VTUNaija API Gateway Integration</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    vtuConfig.isLive
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  }`}>
                    {vtuConfig.isLive ? 'Live Production' : 'Sandbox Staging'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure live API credentials, dynamic service endpoints, and Nigerian network ID mappings
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://vtunaija.com.ng/user/integrate_api_documentation.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>API Documentation</span>
                </a>

                <button
                  type="button"
                  onClick={handleTestVtuConnection}
                  disabled={isTestingVtu}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingVtu ? 'animate-spin' : ''}`} />
                  <span>{isTestingVtu ? 'Testing...' : 'Ping Server'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Banner */}
            {vtuTestResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center justify-between ${
                vtuTestResult.startsWith('✓')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <span>{vtuTestResult}</span>
                <button
                  onClick={() => setVtuTestResult(null)}
                  className="text-xs font-bold px-2 py-0.5 opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form for VTUNaija */}
            <form onSubmit={handleSaveVtuConfig} className="space-y-6">
              {/* Row 1: Mode & API Key */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-purple-600" />
                      <span>VTUNaija API Token / Key</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Authorization: Token {'{apiKey}'}</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      value={vtuConfig.apiKey}
                      onChange={e => setVtuConfig({ ...vtuConfig, apiKey: e.target.value })}
                      placeholder="e.g. 1789c19b08d4a97405e3b6d21ecf42964b58495c"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Obtained from your VTUNaija dashboard under Developer / API Integration.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-purple-600" />
                      <span>Base API URL</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVtuConfig({ ...vtuConfig, baseUrl: 'https://vtunaija.com.ng/api', isLive: true })}
                        className="text-[10px] font-bold text-purple-600 hover:underline"
                      >
                        Live Default
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setVtuConfig({ ...vtuConfig, baseUrl: 'https://sandbox.vtunaija.com.ng/api', isLive: false })}
                        className="text-[10px] font-bold text-amber-600 hover:underline"
                      >
                        Sandbox URL
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    required
                    value={vtuConfig.baseUrl}
                    onChange={e => setVtuConfig({ ...vtuConfig, baseUrl: e.target.value })}
                    placeholder="https://vtunaija.com.ng/api"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={vtuConfig.isLive}
                        onChange={e => setVtuConfig({ ...vtuConfig, isLive: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                      />
                      <span>Enable Live Transaction Delivery via this Provider</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 2: Service API Endpoints */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Service API Endpoints (POST / GET)
                  </h3>
                  <span className="text-[11px] text-slate-400">Appended to Base URL</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Data Topup API
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.dataEndpoint}
                      onChange={e => setVtuConfig({ ...vtuConfig, dataEndpoint: e.target.value })}
                      placeholder="/data/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Airtime Topup API
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.airtimeEndpoint}
                      onChange={e => setVtuConfig({ ...vtuConfig, airtimeEndpoint: e.target.value })}
                      placeholder="/topup/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Electricity Bill API
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.electricityEndpoint}
                      onChange={e => setVtuConfig({ ...vtuConfig, electricityEndpoint: e.target.value })}
                      placeholder="/billpayment/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Electricity Verify API
                    </label>
                    <input
                      type="text"
                      value={vtuConfig.electricityVerifyEndpoint || '/billpayment/verify/'}
                      onChange={e => setVtuConfig({ ...vtuConfig, electricityVerifyEndpoint: e.target.value })}
                      placeholder="/billpayment/verify/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Cable TV API
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.cableEndpoint}
                      onChange={e => setVtuConfig({ ...vtuConfig, cableEndpoint: e.target.value })}
                      placeholder="/cablesub/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Cable Smartcard Verify API
                    </label>
                    <input
                      type="text"
                      value={vtuConfig.cableVerifyEndpoint || '/cablesub/verify/'}
                      onChange={e => setVtuConfig({ ...vtuConfig, cableVerifyEndpoint: e.target.value })}
                      placeholder="/cablesub/verify/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Exam PIN API
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.examEndpoint}
                      onChange={e => setVtuConfig({ ...vtuConfig, examEndpoint: e.target.value })}
                      placeholder="/epin/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Wallet / Balance API
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.balanceEndpoint}
                      onChange={e => setVtuConfig({ ...vtuConfig, balanceEndpoint: e.target.value })}
                      placeholder="/user/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: VTUNaija Network ID Mappings */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-purple-50/40 dark:bg-purple-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                    Network ID Codes (VTUNaija Payload Mapping)
                  </h3>
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                    Documentation: 1=MTN, 2=GLO, 3=9Mobile, 4=Airtel
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      MTN Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.networkIds.mtn}
                      onChange={e => setVtuConfig({
                        ...vtuConfig,
                        networkIds: { ...vtuConfig.networkIds, mtn: e.target.value }
                      })}
                      placeholder="1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Glo Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.networkIds.glo}
                      onChange={e => setVtuConfig({
                        ...vtuConfig,
                        networkIds: { ...vtuConfig.networkIds, glo: e.target.value }
                      })}
                      placeholder="2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      9mobile Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.networkIds.nineMobile}
                      onChange={e => setVtuConfig({
                        ...vtuConfig,
                        networkIds: { ...vtuConfig.networkIds, nineMobile: e.target.value }
                      })}
                      placeholder="3"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Airtel Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={vtuConfig.networkIds.airtel}
                      onChange={e => setVtuConfig({
                        ...vtuConfig,
                        networkIds: { ...vtuConfig.networkIds, airtel: e.target.value }
                      })}
                      placeholder="4"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Last Tested: {vtuConfig.lastTested ? new Date(vtuConfig.lastTested).toLocaleString() : 'Never'}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isSavingVtu}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-900/20 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingVtu ? 'Saving...' : 'Save VTUNaija Configuration'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* NCwallet API Gateway Integration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">NCwallet API Gateway Integration</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ncWalletConfig.isLive
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  }`}>
                    {ncWalletConfig.isLive ? 'Live Production' : 'Sandbox Staging'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure live API credentials, dynamic endpoints, verification URLs, and Nigerian network ID mappings for NCwallet
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://ncwallet.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>NCwallet Portal</span>
                </a>

                <button
                  type="button"
                  onClick={handleTestNcWalletConnection}
                  disabled={isTestingNcWallet}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingNcWallet ? 'animate-spin' : ''}`} />
                  <span>{isTestingNcWallet ? 'Testing...' : 'Ping NCwallet'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Banner */}
            {ncWalletTestResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center justify-between ${
                ncWalletTestResult.startsWith('✓')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <span>{ncWalletTestResult}</span>
                <button
                  onClick={() => setNcWalletTestResult(null)}
                  className="text-xs font-bold px-2 py-0.5 opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form for NCwallet */}
            <form onSubmit={handleSaveNcWalletConfig} className="space-y-6">
              {/* Row 1: Mode & API Key */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>NCwallet API Token / Key</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Authorization: Token {'{apiKey}'}</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showNcApiKey ? 'text' : 'password'}
                      required
                      value={ncWalletConfig.apiKey}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, apiKey: e.target.value })}
                      placeholder="e.g. ncwallet_live_token_here"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNcApiKey(!showNcApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNcApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Obtained from your NCwallet dashboard under API Settings.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Base API URL</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNcWalletConfig({ ...ncWalletConfig, baseUrl: 'https://ncwallet.ng/api' })}
                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        Default NCwallet URL
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    required
                    value={ncWalletConfig.baseUrl}
                    onChange={e => setNcWalletConfig({ ...ncWalletConfig, baseUrl: e.target.value })}
                    placeholder="https://ncwallet.ng/api"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={ncWalletConfig.isLive}
                        onChange={e => setNcWalletConfig({ ...ncWalletConfig, isLive: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span>Enable Live Transactions on NCwallet</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 2: Service API Endpoints */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    NCwallet Service API Endpoints (POST / GET)
                  </h3>
                  <span className="text-[11px] text-slate-400">Appended to Base URL</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Data Topup API
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.dataEndpoint}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, dataEndpoint: e.target.value })}
                      placeholder="/data/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Airtime Topup API
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.airtimeEndpoint}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, airtimeEndpoint: e.target.value })}
                      placeholder="/topup/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Electricity Bill API
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.electricityEndpoint}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, electricityEndpoint: e.target.value })}
                      placeholder="/billpayment/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Electricity Verify API
                    </label>
                    <input
                      type="text"
                      value={ncWalletConfig.electricityVerifyEndpoint || '/billpayment/verify/'}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, electricityVerifyEndpoint: e.target.value })}
                      placeholder="/billpayment/verify/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Cable TV API
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.cableEndpoint}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, cableEndpoint: e.target.value })}
                      placeholder="/cablesub/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Cable Smartcard Verify API
                    </label>
                    <input
                      type="text"
                      value={ncWalletConfig.cableVerifyEndpoint || '/cablesub/verify/'}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, cableVerifyEndpoint: e.target.value })}
                      placeholder="/cablesub/verify/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Exam PIN API
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.examEndpoint}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, examEndpoint: e.target.value })}
                      placeholder="/epin/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Wallet / Balance API
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.balanceEndpoint}
                      onChange={e => setNcWalletConfig({ ...ncWalletConfig, balanceEndpoint: e.target.value })}
                      placeholder="/user/"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: NCwallet Network ID Mappings */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    Network ID Codes (NCwallet Payload Mapping)
                  </h3>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Default: 1=MTN, 2=GLO, 3=9Mobile, 4=Airtel
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      MTN Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.networkIds.mtn}
                      onChange={e => setNcWalletConfig({
                        ...ncWalletConfig,
                        networkIds: { ...ncWalletConfig.networkIds, mtn: e.target.value }
                      })}
                      placeholder="1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Glo Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.networkIds.glo}
                      onChange={e => setNcWalletConfig({
                        ...ncWalletConfig,
                        networkIds: { ...ncWalletConfig.networkIds, glo: e.target.value }
                      })}
                      placeholder="2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      9mobile Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.networkIds.nineMobile}
                      onChange={e => setNcWalletConfig({
                        ...ncWalletConfig,
                        networkIds: { ...ncWalletConfig.networkIds, nineMobile: e.target.value }
                      })}
                      placeholder="3"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Airtel Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={ncWalletConfig.networkIds.airtel}
                      onChange={e => setNcWalletConfig({
                        ...ncWalletConfig,
                        networkIds: { ...ncWalletConfig.networkIds, airtel: e.target.value }
                      })}
                      placeholder="4"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Last Tested: {ncWalletConfig.lastTested ? new Date(ncWalletConfig.lastTested).toLocaleString() : 'Never'}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isSavingNcWallet}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-900/20 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingNcWallet ? 'Saving...' : 'Save NCwallet Configuration'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* UnityBills.ng API Gateway Integration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">UnityBills.ng API Gateway Integration</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    unityBillsConfig.isLive
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  }`}>
                    {unityBillsConfig.isLive ? 'Live Production' : 'Sandbox Staging'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure live API credentials, dynamic endpoints, virtual account creation API, and network ID mappings for UnityBills.ng
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://unitybills.ng/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>UnityBills API Docs</span>
                </a>

                <button
                  type="button"
                  onClick={handleTestUnityBillsConnection}
                  disabled={isTestingUnityBills}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingUnityBills ? 'animate-spin' : ''}`} />
                  <span>{isTestingUnityBills ? 'Testing...' : 'Ping UnityBills'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Banner */}
            {unityBillsTestResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center justify-between ${
                unityBillsTestResult.startsWith('✓')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <span>{unityBillsTestResult}</span>
                <button
                  onClick={() => setUnityBillsTestResult(null)}
                  className="text-xs font-bold px-2 py-0.5 opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* UnityBills Webhook Endpoint Banner */}
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                    UnityBills Webhook Endpoints
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateUnityBillsWebhook}
                    disabled={isSimulatingUnityBills}
                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSimulatingUnityBills ? 'animate-spin' : ''}`} />
                    <span>{isSimulatingUnityBills ? 'Simulating...' : 'Test Webhook (₦100)'}</span>
                  </button>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    HTTP 200 Ready
                  </span>
                </div>
              </div>

              {/* 302 Explanation Box */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Why did UnityBills show "HTTP Code 302"?
                </p>
                <p>
                  In your screenshot, the URL was set to <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-bold text-amber-900 dark:text-amber-200">https://ais-dev-...</code>. Any domain starting with <code className="font-bold">ais-dev-</code> is Google Cloud's private developer workspace that requires developer session cookies. External servers (like UnityBills) receive an <strong>HTTP 302 Found</strong> redirecting to Google Accounts login.
                </p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Fix: Paste your live Vercel production URL below into the UnityBills Webhook URL field.
                </p>
              </div>

              {/* Primary Vercel Webhook URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    1. Vercel Webhook URL (Recommended for UnityBills Dashboard):
                  </span>
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                    Root API Function
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="https://vtutopup.vercel.app/api/webhooks/unitybills"
                    className="flex-1 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-blue-900 dark:text-blue-200 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://vtutopup.vercel.app/api/webhooks/unitybills');
                      flashMessage('✓ Vercel UnityBills Webhook URL copied to clipboard!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </button>
                </div>
              </div>

              {/* Alternative Deposits Route */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  2. Alternative Vercel Rewrite URL:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="https://vtutopup.vercel.app/hooks/deposits"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://vtutopup.vercel.app/hooks/deposits');
                      flashMessage('✓ Vercel Deposits URL copied to clipboard!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Firestore Diagnostic Webhook Logs Monitor */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Firestore Live Webhook Logs ('webhook_logs' Collection)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchWebhookLogs}
                  disabled={isLoadingWebhookLogs}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWebhookLogs ? 'animate-spin' : ''}`} />
                  <span>{isLoadingWebhookLogs ? 'Fetching...' : 'Refresh Logs'}</span>
                </button>
              </div>

              {webhookLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  No webhook attempts in 'webhook_logs' collection yet. As soon as UnityBills hits /hooks/deposits or /api/webhooks/unitybills, full headers & body will appear here!
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {webhookLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            log.method === 'POST' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}>
                            {log.method}
                          </span>
                          <span className="font-mono text-emerald-300 font-bold">{log.path}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                          <span className="text-slate-400 font-bold block mb-1">Incoming Headers:</span>
                          <pre className="text-slate-300 text-[10px] whitespace-pre-wrap">{JSON.stringify(log.headers, null, 2)}</pre>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                          <span className="text-slate-400 font-bold block mb-1">Payload / Body:</span>
                          <pre className="text-slate-300 text-[10px] whitespace-pre-wrap">{log.body ? JSON.stringify(log.body, null, 2) : '(Query: ' + JSON.stringify(log.query || {}) + ')'}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form for UnityBills */}
            <form onSubmit={handleSaveUnityBillsConfig} className="space-y-6">
              {/* Row 1: Mode & API Key */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      <span>UnityBills API Token / Key</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Authorization: Token {'{apiKey}'}</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showUnityApiKey ? 'text' : 'password'}
                      required
                      value={unityBillsConfig.apiKey}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, apiKey: e.target.value })}
                      placeholder="e.g. unitybills_token_here"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUnityApiKey(!showUnityApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showUnityApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Obtained from your UnityBills.ng dashboard under API Settings.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Base API URL</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUnityBillsConfig({ ...unityBillsConfig, baseUrl: 'https://www.unitybills.ng/api/v1' })}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Default UnityBills URL
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    required
                    value={unityBillsConfig.baseUrl}
                    onChange={e => setUnityBillsConfig({ ...unityBillsConfig, baseUrl: e.target.value })}
                    placeholder="https://www.unitybills.ng/api/v1"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={unityBillsConfig.isLive}
                        onChange={e => setUnityBillsConfig({ ...unityBillsConfig, isLive: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>Enable Live Transactions on UnityBills</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 2: Service API Endpoints */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    UnityBills Service API Endpoints
                  </h3>
                  <span className="text-[11px] text-slate-400">Appended to Base URL</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Data API
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.dataEndpoint}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, dataEndpoint: e.target.value })}
                      placeholder="/bill/data"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Airtime API
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.airtimeEndpoint}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, airtimeEndpoint: e.target.value })}
                      placeholder="/bill/airtime"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Electricity API
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.electricityEndpoint}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, electricityEndpoint: e.target.value })}
                      placeholder="/bill/electricity"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Electricity Verify API
                    </label>
                    <input
                      type="text"
                      value={unityBillsConfig.electricityVerifyEndpoint || '/bill/electricity/verify'}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, electricityVerifyEndpoint: e.target.value })}
                      placeholder="/bill/electricity/verify"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Cable TV API
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.cableEndpoint}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, cableEndpoint: e.target.value })}
                      placeholder="/bill/cable"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Cable Verify API
                    </label>
                    <input
                      type="text"
                      value={unityBillsConfig.cableVerifyEndpoint || '/bill/cable/verify'}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, cableVerifyEndpoint: e.target.value })}
                      placeholder="/bill/cable/verify"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Exam PIN API
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.examEndpoint}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, examEndpoint: e.target.value })}
                      placeholder="/bill/exam"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Virtual Account API
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.virtualAccountEndpoint || '/user/virtual-account'}
                      onChange={e => setUnityBillsConfig({ ...unityBillsConfig, virtualAccountEndpoint: e.target.value })}
                      placeholder="/user/virtual-account"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Network ID Mappings */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    Network ID Codes (UnityBills Payload Mapping)
                  </h3>
                  <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                    Default: mtn, glo, 9mobile, airtel
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      MTN Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.networkIds.mtn}
                      onChange={e => setUnityBillsConfig({
                        ...unityBillsConfig,
                        networkIds: { ...unityBillsConfig.networkIds, mtn: e.target.value }
                      })}
                      placeholder="mtn"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Glo Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.networkIds.glo}
                      onChange={e => setUnityBillsConfig({
                        ...unityBillsConfig,
                        networkIds: { ...unityBillsConfig.networkIds, glo: e.target.value }
                      })}
                      placeholder="glo"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      9mobile Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.networkIds.nineMobile}
                      onChange={e => setUnityBillsConfig({
                        ...unityBillsConfig,
                        networkIds: { ...unityBillsConfig.networkIds, nineMobile: e.target.value }
                      })}
                      placeholder="9mobile"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Airtel Network ID
                    </label>
                    <input
                      type="text"
                      required
                      value={unityBillsConfig.networkIds.airtel}
                      onChange={e => setUnityBillsConfig({
                        ...unityBillsConfig,
                        networkIds: { ...unityBillsConfig.networkIds, airtel: e.target.value }
                      })}
                      placeholder="airtel"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Last Tested: {unityBillsConfig.lastTested ? new Date(unityBillsConfig.lastTested).toLocaleString() : 'Never'}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isSavingUnityBills}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-900/20 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingUnityBills ? 'Saving...' : 'Save UnityBills Configuration'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* BillStack Payment Gateway Integration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Landmark className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">BillStack Payment Gateway (Virtual Accounts)</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    billstackConfig.isLive
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  }`}>
                    {billstackConfig.isLive ? 'Live Active' : 'Sandbox Test'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dynamic dedicated virtual account creation gateway for automated bank deposits (9PSB, Safehaven MFB, Providus, PalmPay)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://docs.billstack.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>BillStack Docs</span>
                </a>

                <button
                  type="button"
                  onClick={handleTestBillstackConnection}
                  disabled={isTestingBillstack}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingBillstack ? 'animate-spin' : ''}`} />
                  <span>{isTestingBillstack ? 'Pinging...' : 'Ping BillStack'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Banner */}
            {billstackTestResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center justify-between ${
                billstackTestResult.startsWith('✓')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <span>{billstackTestResult}</span>
                <button
                  onClick={() => setBillstackTestResult(null)}
                  className="text-xs font-bold px-2 py-0.5 opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form for BillStack */}
            <form onSubmit={handleSaveBillstackConfig} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-purple-600" />
                      <span>BillStack Secret Key</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Authorization: Bearer Bill_Stack-SEC-KEY-...</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showBillstackKey ? 'text' : 'password'}
                      required
                      value={billstackConfig.secretKey}
                      onChange={e => setBillstackConfig({ ...billstackConfig, secretKey: e.target.value })}
                      placeholder="Bill_Stack-SEC-KEY-xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBillstackKey(!showBillstackKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showBillstackKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Obtained from your BillStack merchant dashboard under API Keys.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-purple-600" />
                      <span>BillStack Base API URL</span>
                    </label>
                    <span className="text-[10px] font-mono text-purple-600 font-bold">https://api.billstack.co/v2</span>
                  </div>
                  <input
                    type="url"
                    required
                    value={billstackConfig.baseUrl}
                    onChange={e => setBillstackConfig({ ...billstackConfig, baseUrl: e.target.value })}
                    placeholder="https://api.billstack.co/v2"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={billstackConfig.isLive}
                        onChange={e => setBillstackConfig({ ...billstackConfig, isLive: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                      />
                      <span>Enable BillStack Dynamic Virtual Accounts as Primary Funding Gateway</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Supported Banks Row */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-purple-50/40 dark:bg-purple-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                    Supported Dedicated Virtual Account Partner Banks
                  </h3>
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                    Documentation: 9PSB, Safehaven MFB, Providus Bank, PalmPay
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: '9PSB', name: '9PSB Bank', desc: 'Instant dedicated account' },
                    { id: 'SAFEHAVEN', name: 'Safehaven MFB', desc: 'High reliability virtual' },
                    { id: 'PROVIDUS', name: 'Providus Bank', desc: 'Commercial banking rail' },
                    { id: 'PALMPAY', name: 'PalmPay Bank', desc: 'Requires NIN or BVN' },
                  ].map(b => {
                    const isChecked = billstackConfig.defaultBanks.includes(b.id as any);
                    return (
                      <label
                        key={b.id}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                          isChecked
                            ? 'bg-white dark:bg-slate-800 border-purple-400 dark:border-purple-600 shadow-sm'
                            : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const newBanks = e.target.checked
                                ? [...billstackConfig.defaultBanks, b.id as any]
                                : billstackConfig.defaultBanks.filter(x => x !== b.id);
                              setBillstackConfig({ ...billstackConfig, defaultBanks: newBanks });
                            }}
                            className="rounded text-purple-600 w-3.5 h-3.5"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">{b.desc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="border border-purple-200 dark:border-purple-800/80 rounded-2xl p-5 space-y-4 bg-purple-50/40 dark:bg-purple-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      BillStack Webhook URL (Automated Real-Time Funding)
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                      Developer → Webhooks
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      PAYMENT_NOTIFICATION
                    </span>
                  </div>
                </div>

                {/* Live Public Webhook URL with Copy Action */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-purple-700 dark:text-purple-300 select-all break-all shadow-inner">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/billstack` : 'https://naeemdatasub.ng/api/webhooks/billstack'}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow transition shrink-0"
                  >
                    {copiedWebhookUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Documentation Specs & Guide */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">1. Setup in Dashboard</span>
                    <p className="text-[10px] leading-relaxed">
                      Add this endpoint URL in your BillStack merchant dashboard under <strong>Developer → Webhooks</strong>.
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">2. Event Structure</span>
                    <p className="text-[10px] leading-relaxed">
                      Listens for <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-600">PAYMENT_NOTIFICATION</code> with <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-600">RESERVED_ACCOUNT_TRANSACTION</code>.
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">3. Webhook Acknowledgment</span>
                    <p className="text-[10px] leading-relaxed">
                      Responds immediately with HTTP <strong>200</strong> and <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 font-bold">{`{"status": true, "message": "successful"}`}</code>.
                    </p>
                  </div>
                </div>

                {/* Test Webhook Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-purple-200/60 dark:border-purple-800/40">
                  <span className="text-[11px] text-slate-500">
                    Verify that your BillStack webhook receiver properly returns HTTP 200 and auto-credits the test account:
                  </span>
                  <button
                    type="button"
                    disabled={isTestingWebhook}
                    onClick={handleTestWebhookSimulation}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                    <span>{isTestingWebhook ? 'Simulating Webhook...' : 'Simulate Test Webhook (₦2,500)'}</span>
                  </button>
                </div>

                {/* Test Result Inspector */}
                {webhookTestResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Webhook Test Verified: HTTP {webhookTestResult.statusCode} OK</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWebhookTestResult(null)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Response Body: </span>
                        <code className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                          {JSON.stringify(webhookTestResult.billstackResponse)}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400">Credited: </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₦{webhookTestResult.creditedAmount?.toLocaleString()} to {webhookTestResult.creditedUser}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Last Tested: {billstackConfig.lastTested ? new Date(billstackConfig.lastTested).toLocaleString() : 'Never'}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isSavingBillstack}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-900/20 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingBillstack ? 'Saving...' : 'Save BillStack Configuration'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Secondary Gateways & Failover Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Active Gateways & Failover Routing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map(prv => (
                <div key={prv.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{prv.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                      {prv.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Endpoint:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-xs">{prv.baseUrl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gateway Balance:</span>
                      <span className="font-black text-emerald-600">₦{prv.balance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Routing Role:</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400">{prv.isPrimary ? 'Primary Active' : 'Automatic Failover'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALL TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Transaction Ledger</h2>
              <p className="text-xs text-slate-400">Audit all user purchases and process manual refunds</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, recipient, user..."
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Reference / Date</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Service</th>
                  <th className="pb-3">Recipient</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <AnimatePresence initial={false}>
                  {filteredTransactions.map(t => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3">
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">{t.reference}</span>
                          <span className="text-[11px] text-slate-400">{new Date(t.date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{t.userName}</td>
                      <td className="py-3 uppercase font-bold text-purple-700">{t.serviceType}</td>
                      <td className="py-3 font-mono text-slate-700 dark:text-slate-300">{t.recipient}</td>
                      <td className="py-3 font-black text-slate-900 dark:text-white">₦{t.amount.toLocaleString()}</td>
                      <td className="py-3">
                        <TransactionStatusBadge
                          status={t.status}
                          failureReason={t.failureReason}
                          alignTooltip="center"
                        />
                      </td>
                      <td className="py-3 text-right">
                        {t.status === 'successful' && t.serviceType !== 'wallet_fund' && (
                          <button
                            onClick={() => handleRefundTx(t)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: MANUAL FUNDING REQUESTS & ADMIN BANK SETTINGS */}
      {activeTab === 'manual_funding' && (
        <div className="space-y-6">
          {/* Section 1: Set Admin Bank Details */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Admin Manual Funding Bank Account</h2>
              </div>
              <p className="text-xs text-slate-400">
                Configure the Admin Bank details displayed to users in the Fund Wallet modal for manual bank transfers.
              </p>
            </div>

            <form onSubmit={handleSaveManualConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={manualFundingConfig.bankName}
                    onChange={e => setManualFundingConfig({ ...manualFundingConfig, bankName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={manualFundingConfig.accountNumber}
                    onChange={e => setManualFundingConfig({ ...manualFundingConfig, accountNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={manualFundingConfig.accountName}
                    onChange={e => setManualFundingConfig({ ...manualFundingConfig, accountName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Support WhatsApp Line
                  </label>
                  <input
                    type="text"
                    required
                    value={manualFundingConfig.supportWhatsapp}
                    onChange={e => setManualFundingConfig({ ...manualFundingConfig, supportWhatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingManualConfig}
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {isSavingManualConfig ? 'Saving Details...' : 'Save Manual Account Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Incoming Manual Funding Requests List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Incoming Manual Funding Requests ({manualRequests.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Review payment proofs submitted by users and approve to credit their wallet automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchManualFundingData}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Requests</span>
              </button>
            </div>

            {manualRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No manual funding requests submitted yet. User submissions will appear here for Admin review.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3">User Details</th>
                      <th className="pb-3">Amount Paid</th>
                      <th className="pb-3">Sender Details</th>
                      <th className="pb-3">Payment Reference</th>
                      <th className="pb-3">Submitted At</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {manualRequests.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {r.userName}
                          <span className="block text-[10px] text-slate-400 font-normal">{r.userEmail} • {r.userPhone}</span>
                        </td>
                        <td className="py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ₦{r.amount.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{r.senderName}</span>
                          <span className="block text-[10px] text-slate-400">{r.senderBank}</span>
                        </td>
                        <td className="py-3 font-mono text-xs text-slate-700 dark:text-slate-300 select-all">
                          {r.paymentReference}
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : r.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          {r.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={processingRequestId === r.id}
                                onClick={() => handleApproveManualRequest(r.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
                              >
                                Approve & Credit
                              </button>
                              <button
                                type="button"
                                disabled={processingRequestId === r.id}
                                onClick={() => handleRejectManualRequest(r.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Platform System Settings</h2>
            <p className="text-xs text-slate-400">Configure global platform details, contacts and operational modes</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Platform Brand Name</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={e => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Official Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Customer Support WhatsApp</label>
              <input
                type="text"
                value={settings.supportWhatsapp}
                onChange={e => setSettings({ ...settings, supportWhatsapp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Referral Bonus Commission (%)</label>
              <input
                type="number"
                value={settings.referralBonusPercent !== undefined && !Number.isNaN(settings.referralBonusPercent) ? settings.referralBonusPercent : ''}
                onChange={e => setSettings({ ...settings, referralBonusPercent: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Global Demo Simulation Mode</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Instant sandbox simulated fulfillment for all transactions</span>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, demoMode: !settings.demoMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.demoMode ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.demoMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Services Master Control (Enable / Disable Platform Services) */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Services Master Switch (Platform Service Enable / Disable)</span>
              </h3>
              <p className="text-xs text-slate-400">Toggle services ON or OFF platform-wide. Disabling a service blocks user transactions with an admin maintenance alert.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'data', label: 'Data Subscription', desc: 'MTN, Airtel, Glo & 9mobile Data' },
                { key: 'airtime', label: 'Airtime Topup', desc: 'VTU Airtime Sales' },
                { key: 'electricity', label: 'Electricity Bills', desc: 'Prepaid & Postpaid Meter Topup' },
                { key: 'cable', label: 'Cable TV Subscription', desc: 'DSTV, GOTV & StarTimes Packages' },
                { key: 'exam', label: 'Exam Result PINs', desc: 'WAEC, NECO & JAMB PINs' },
              ].map((srv) => {
                const currentServices = settings.servicesEnabled || { data: true, airtime: true, electricity: true, cable: true, exam: true };
                const isEnabled = currentServices[srv.key as keyof typeof currentServices] !== false;

                return (
                  <div key={srv.key} className={`p-4 rounded-2xl border transition flex items-center justify-between gap-2 ${
                    isEnabled
                      ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                  }`}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">{srv.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{srv.desc}</span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                        isEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {isEnabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updatedServices = {
                          ...currentServices,
                          [srv.key]: !isEnabled,
                        };
                        setSettings({
                          ...settings,
                          servicesEnabled: updatedServices,
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings & Service Switches</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Immutable Audit Trail</h2>
            <p className="text-xs text-slate-400">All administrative operations, adjustments, and settings updates</p>
          </div>

          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
                    {log.action}
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold mt-0.5">{log.details}</p>
                  <span className="text-[10px] text-slate-400">Target: {log.target} • Admin: {log.adminEmail}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (In-App Dialog - replaces blocked browser confirm) */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Item</h3>
                <p className="text-xs text-slate-400 capitalize">{deleteConfirmTarget.type} Management</p>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete <span className="font-bold text-slate-900 dark:text-white">"{deleteConfirmTarget.name}"</span>?
              </p>
              <p className="text-[11px] text-rose-500 font-semibold mt-1">This operation cannot be undone and will update Firestore immediately.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Manual Payment Modal (In-App Dialog - replaces blocked window.prompt) */}
      {rejectTargetReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Reject Payment Proof</h3>
                <p className="text-xs text-slate-400">Request #{rejectTargetReq.requestId.slice(-6)}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                value={rejectTargetReq.reason}
                onChange={e => setRejectTargetReq({ ...rejectTargetReq, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                placeholder="State why this bank payment proof could not be verified..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectTargetReq(null)}
                disabled={isRejecting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRejectManualRequest}
                disabled={isRejecting || !rejectTargetReq.reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Transaction Modal (In-App Dialog - replaces blocked window.prompt) */}
      {refundTargetTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-purple-600">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Refund Transaction</h3>
                <p className="text-xs text-slate-400">Ref: {refundTargetTx.tx.reference}</p>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <p className="text-slate-500">Service: <span className="font-bold text-slate-900 dark:text-white uppercase">{refundTargetTx.tx.serviceType}</span></p>
              <p className="text-slate-500">Amount: <span className="font-bold text-emerald-600">₦{refundTargetTx.tx.amount.toLocaleString()}</span></p>
              <p className="text-slate-500">Customer: <span className="font-medium text-slate-900 dark:text-white">{refundTargetTx.tx.userName} ({refundTargetTx.tx.userEmail})</span></p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Refund Reason / Resolution Note
              </label>
              <input
                type="text"
                value={refundTargetTx.reason}
                onChange={e => setRefundTargetTx({ ...refundTargetTx, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                placeholder="e.g. Customer service resolution"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRefundTargetTx(null)}
                disabled={isRefunding}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRefundTx}
                disabled={isRefunding || !refundTargetTx.reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition"
              >
                {isRefunding ? 'Refunding...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
