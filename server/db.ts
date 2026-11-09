import fs from 'fs';
import path from 'path';
import {
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
  GatewayProvider
} from '../src/types/index.ts';

const DB_FILE_PATH = path.resolve(process.cwd(), 'server', 'persisted_db.json');

class Database {
  users: Map<string, User> = new Map();
  dataPlans: Map<string, DataPlan> = new Map();
  airtimeDiscounts: Map<string, AirtimeDiscount> = new Map();
  electricityDiscos: Map<string, ElectricityDisco> = new Map();
  cablePackages: Map<string, CablePackage> = new Map();
  examPins: Map<string, ExamPin> = new Map();
  transactions: Map<string, Transaction> = new Map();
  ledger: WalletLedgerEntry[] = [];
  tickets: Map<string, SupportTicket> = new Map();
  notifications: Map<string, NotificationItem> = new Map();
  providers: Map<string, ProviderConfig> = new Map();
  vtuNaijaConfig: VTUNaijaConfig;
  ncWalletConfig: NCWalletConfig;
  unityBillsConfig: UnityBillsConfig;
  serviceRouting: ServiceRoutingConfig;
  settings: SystemSettings;
  auditLogs: AuditLog[] = [];
  virtualAccounts: Map<string, VirtualAccount[]> = new Map();

  constructor() {
    this.vtuNaijaConfig = {
      apiKey: process.env.VTUNAIJA_API_KEY || '1789c19b08d4a97405e3b6d21ecf42964b58495c',
      baseUrl: 'https://vtunaija.com.ng/api',
      dataEndpoint: '/data/',
      airtimeEndpoint: '/topup/',
      cableEndpoint: '/cablesub/',
      cableVerifyEndpoint: '/cablesub/verify/',
      electricityEndpoint: '/billpayment/',
      electricityVerifyEndpoint: '/billpayment/verify/',
      examEndpoint: '/epin/',
      balanceEndpoint: '/user/',
      networkIds: {
        mtn: '1',
        glo: '2',
        nineMobile: '3',
        airtel: '4',
      },
      isLive: true,
      lastTested: new Date().toISOString(),
      lastStatus: 'connected',
      balance: 185000,
    };

    this.ncWalletConfig = {
      apiKey: process.env.NCWALLET_API_KEY || '',
      baseUrl: 'https://ncwallet.ng/api',
      dataEndpoint: '/data/',
      airtimeEndpoint: '/topup/',
      cableEndpoint: '/cablesub/',
      cableVerifyEndpoint: '/cablesub/verify/',
      electricityEndpoint: '/billpayment/',
      electricityVerifyEndpoint: '/billpayment/verify/',
      examEndpoint: '/epin/',
      balanceEndpoint: '/user/',
      networkIds: {
        mtn: '1',
        glo: '2',
        nineMobile: '3',
        airtel: '4',
      },
      isLive: true,
      lastTested: new Date().toISOString(),
      lastStatus: 'connected',
      balance: 0,
    };

    this.unityBillsConfig = {
      apiKey: process.env.UNITYBILLS_API_KEY || '',
      baseUrl: 'https://www.unitybills.ng/api/v1',
      dataEndpoint: '/bill/data',
      airtimeEndpoint: '/bill/airtime',
      cableEndpoint: '/bill/cable',
      cableVerifyEndpoint: '/bill/cable/verify',
      electricityEndpoint: '/bill/electricity',
      electricityVerifyEndpoint: '/bill/electricity/verify',
      examEndpoint: '/bill/exam',
      balanceEndpoint: '/user',
      virtualAccountEndpoint: '/virtual-account',
      networkIds: {
        mtn: 'mtn',
        glo: 'glo',
        nineMobile: '9mobile',
        airtel: 'airtel',
      },
      isLive: true,
      lastTested: new Date().toISOString(),
      lastStatus: 'connected',
      balance: 0,
    };

    this.serviceRouting = {
      data: 'vtunaija',
      airtime: 'vtunaija',
      electricity: 'vtunaija',
      cable: 'vtunaija',
      exam: 'vtunaija',
    };

    this.settings = {
      platformName: 'NAEEM DATA SUB',
      tagline: 'Fast, Affordable & Reliable Digital Services.',
      supportPhone: '+234 801 234 5678',
      supportEmail: 'support@naeemdatasub.ng',
      supportWhatsapp: '+2348012345678',
      minWalletFunding: 100,
      referralBonusPercent: 5,
      maintenanceMode: false,
      demoMode: false, // Default LIVE simulation with provider toggle
      notificationBanner: '🎉 Welcome to NAEEM DATA SUB! Get 2% discount on all MTN and Airtel Airtime today.',
      servicesEnabled: {
        data: true,
        airtime: true,
        electricity: true,
        cable: true,
        exam: true,
      },
    };

    const loaded = this.loadFromDisk();
    if (!loaded) {
      this.seed();
      this.saveToDisk();
    }
  }

  loadFromDisk(): boolean {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);

        if (data.users && Array.isArray(data.users)) {
          this.users.clear();
          data.users.forEach((u: User) => this.users.set(u.id, u));
        }
        if (data.dataPlans && Array.isArray(data.dataPlans)) {
          this.dataPlans.clear();
          data.dataPlans.forEach((p: DataPlan) => {
            let liveId: string = p.plan_id || p.planCode || p.id;
            if (p.id === 'mtn_sme_500mb' || p.plan_id === 'sme_500mb') liveId = '304';
            else if (p.id === 'mtn_sme_1gb' || p.plan_id === 'sme_1gb') liveId = '121';
            else if (p.id === 'mtn_sme_2gb' || p.plan_id === 'sme_2gb') liveId = '122';
            else if (p.id === 'mtn_sme_3gb' || p.plan_id === 'sme_3gb') liveId = '123';
            else if (p.id === 'mtn_sme_5gb' || p.plan_id === 'sme_5gb') liveId = '124';
            else if (p.id === 'mtn_sme_10gb' || p.plan_id === 'sme_10gb') liveId = '13';
            else if (p.id === 'mtn_dir_1gb' || p.plan_id === '1000') liveId = '2';
            else if (p.id === 'mtn_dir_2gb' || p.plan_id === '2000') liveId = '264';
            else if (p.id === 'mtn_dir_5gb' || p.plan_id === '5000') liveId = '5';
            else if (p.id === 'mtn_dir_10gb' || p.plan_id === '10000') liveId = '6';
            else if (p.id === 'airtel_cg_1gb' || p.plan_id === 'air_1gb') liveId = '29';
            else if (p.id === 'airtel_cg_2gb' || p.plan_id === 'air_2gb') liveId = '30';
            else if (p.id === 'airtel_cg_5gb' || p.plan_id === 'air_5gb') liveId = '32';
            else if (p.id === 'airtel_cg_10gb' || p.plan_id === 'air_10gb') liveId = '33';
            else if (p.id === 'glo_cg_1gb' || p.plan_id === 'glo_1gb') liveId = '21';
            else if (p.id === 'glo_cg_2gb' || p.plan_id === 'glo_2gb') liveId = '24';
            else if (p.id === 'glo_cg_5gb' || p.plan_id === 'glo_5gb') liveId = '26';
            else if (p.id === 'glo_cg_10gb' || p.plan_id === 'glo_10gb') liveId = '27';
            else if (p.id === '9mobile_sme_1gb' || p.plan_id === '9mob_1gb') liveId = '491';
            else if (p.id === '9mobile_sme_2gb' || p.plan_id === '9mob_2gb') liveId = '491';
            else if (p.id === '9mobile_sme_5gb' || p.plan_id === '9mob_5gb') liveId = '498';

            const cleanPlan: DataPlan = {
              ...p,
              plan_id: liveId,
              planCode: liveId,
            };
            this.dataPlans.set(p.id, cleanPlan);
          });
        }
        if (data.airtimeDiscounts && Array.isArray(data.airtimeDiscounts)) {
          this.airtimeDiscounts.clear();
          data.airtimeDiscounts.forEach((d: AirtimeDiscount) => this.airtimeDiscounts.set(d.network.toLowerCase(), d));
        }
        if (data.electricityDiscos && Array.isArray(data.electricityDiscos)) {
          this.electricityDiscos.clear();
          data.electricityDiscos.forEach((d: ElectricityDisco) => this.electricityDiscos.set(d.id, d));
        }
        if (data.cablePackages && Array.isArray(data.cablePackages)) {
          this.cablePackages.clear();
          data.cablePackages.forEach((c: CablePackage) => this.cablePackages.set(c.id, c));
        }
        if (data.examPins && Array.isArray(data.examPins)) {
          this.examPins.clear();
          data.examPins.forEach((e: ExamPin) => this.examPins.set(e.id, e));
        }
        if (data.transactions && Array.isArray(data.transactions)) {
          this.transactions.clear();
          data.transactions.forEach((t: Transaction) => this.transactions.set(t.id, t));
        }
        if (data.ledger && Array.isArray(data.ledger)) {
          this.ledger = data.ledger;
        }
        if (data.notifications && Array.isArray(data.notifications)) {
          this.notifications.clear();
          data.notifications.forEach((n: NotificationItem) => this.notifications.set(n.id, n));
        }
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
        }
        if (data.vtuNaijaConfig) {
          this.vtuNaijaConfig = { ...this.vtuNaijaConfig, ...data.vtuNaijaConfig };
        }
        if (data.ncWalletConfig) {
          this.ncWalletConfig = { ...this.ncWalletConfig, ...data.ncWalletConfig };
        }
        if (data.serviceRouting) {
          this.serviceRouting = { ...this.serviceRouting, ...data.serviceRouting };
        }
        if (data.virtualAccounts) {
          this.virtualAccounts.clear();
          Object.entries(data.virtualAccounts).forEach(([uid, accs]) => {
            this.virtualAccounts.set(uid, accs as VirtualAccount[]);
          });
        }
        if (data.auditLogs && Array.isArray(data.auditLogs)) {
          this.auditLogs = data.auditLogs;
        }
        return true;
      }
    } catch (e) {
      console.warn('Note loading persisted disk database:', e);
    }
    return false;
  }

  saveToDisk() {
    try {
      const virtObj: Record<string, VirtualAccount[]> = {};
      this.virtualAccounts.forEach((val, key) => {
        virtObj[key] = val;
      });

      const payload = {
        users: Array.from(this.users.values()),
        dataPlans: Array.from(this.dataPlans.values()),
        airtimeDiscounts: Array.from(this.airtimeDiscounts.values()),
        electricityDiscos: Array.from(this.electricityDiscos.values()),
        cablePackages: Array.from(this.cablePackages.values()),
        examPins: Array.from(this.examPins.values()),
        transactions: Array.from(this.transactions.values()),
        ledger: this.ledger,
        notifications: Array.from(this.notifications.values()),
        providers: Array.from(this.providers.values()),
        vtuNaijaConfig: this.vtuNaijaConfig,
        ncWalletConfig: this.ncWalletConfig,
        serviceRouting: this.serviceRouting,
        settings: this.settings,
        auditLogs: this.auditLogs,
        virtualAccounts: virtObj,
      };

      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Note saving database to disk:', e);
    }
  }

  seed() {
    // 1. Seed Users
    const ahmad: User = {
      id: 'usr_ahmad_01',
      name: 'Ahmad Naim',
      email: 'ahmadnaim2877@gmail.com',
      phone: '08012345678',
      role: 'customer',
      status: 'active',
      isVerified: true,
      avatar: '/public/assets/aistudio/file_000000008bcc8243a78738db4143d576_09f5ebcf.png',
      referralCode: 'NAEEM88',
      walletBalance: 12500,
      totalSavings: 8200,
      referralEarnings: 1200,
      totalTransactionsCount: 32,
      transactionPin: '1234',
      createdAt: '2026-01-15T10:00:00Z',
    };

    const musaReseller: User = {
      id: 'usr_reseller_02',
      name: 'Musa Ibrahim VTU',
      email: 'reseller@naeemdatasub.ng',
      phone: '08098765432',
      role: 'reseller',
      status: 'active',
      isVerified: true,
      referralCode: 'MUSA_VTU',
      referredBy: 'NAEEM88',
      walletBalance: 45000,
      totalSavings: 28400,
      referralEarnings: 6500,
      totalTransactionsCount: 148,
      transactionPin: '1234',
      createdAt: '2026-01-20T14:30:00Z',
    };

    const superAdmin: User = {
      id: 'usr_admin_01',
      name: 'Naeem Ummadau',
      email: 'naeemummadau@gmail.com',
      phone: '08000000001',
      role: 'admin',
      status: 'active',
      isVerified: true,
      referralCode: 'ADMIN01',
      walletBalance: 250000,
      totalSavings: 0,
      referralEarnings: 0,
      totalTransactionsCount: 520,
      transactionPin: '1234',
      createdAt: '2025-12-01T08:00:00Z',
    };

    this.users.set(ahmad.id, ahmad);
    this.users.set(musaReseller.id, musaReseller);
    this.users.set(superAdmin.id, superAdmin);

    // Dedicated BillStack virtual bank accounts for Ahmad Naim
    this.virtualAccounts.set(ahmad.id, [
      {
        bankName: '9PSB Bank',
        bankId: '9PSB',
        accountNumber: '9012847291',
        accountName: 'NAEEM - Ahmad Naim',
        reference: 'BSTK-RES-9PSB-AHMAD',
        provider: 'billstack',
        createdAt: '2026-03-01T08:00:00Z',
      },
      {
        bankName: 'Safehaven MFB',
        bankId: 'SAFEHAVEN',
        accountNumber: '6038472910',
        accountName: 'NAEEM - Ahmad Naim',
        reference: 'BSTK-RES-SAFEHAVEN-AHMAD',
        provider: 'billstack',
        createdAt: '2026-03-01T08:00:00Z',
      },
      {
        bankName: 'Providus Bank',
        bankId: 'PROVIDUS',
        accountNumber: '1048291038',
        accountName: 'NAEEM - Ahmad Naim',
        reference: 'BSTK-RES-PROVIDUS-AHMAD',
        provider: 'billstack',
        createdAt: '2026-03-01T08:00:00Z',
      },
    ]);

    // Dedicated BillStack virtual bank accounts for Musa Ibrahim (Reseller)
    this.virtualAccounts.set(musaReseller.id, [
      {
        bankName: '9PSB Bank',
        bankId: '9PSB',
        accountNumber: '9081726354',
        accountName: 'NAEEM - Musa Ibrahim',
        reference: 'BSTK-RES-9PSB-MUSA',
        provider: 'billstack',
        createdAt: '2026-03-01T08:00:00Z',
      },
      {
        bankName: 'Safehaven MFB',
        bankId: 'SAFEHAVEN',
        accountNumber: '6019283745',
        accountName: 'NAEEM - Musa Ibrahim',
        reference: 'BSTK-RES-SAFEHAVEN-MUSA',
        provider: 'billstack',
        createdAt: '2026-03-01T08:00:00Z',
      },
    ]);

    // 2. Seed Data Plans
    const plans: DataPlan[] = [
      // MTN Direct / Special Data Plans matching VTUNaija gateway IDs
      {
        id: 'mtn_dir_1gb',
        plan_id: '2',
        network: 'mtn',
        name: 'MTN 1GB',
        size: '1GB',
        validity: '30 Days',
        planCode: '2',
        planType: 'Direct',
        providerCost: 850,
        customerPrice: 1000,
        resellerPrice: 950,
        isActive: true,
      },
      {
        id: 'mtn_dir_2gb',
        plan_id: '264',
        network: 'mtn',
        name: 'MTN 2GB',
        size: '2GB',
        validity: '30 Days',
        planCode: '264',
        planType: 'Direct',
        providerCost: 1550,
        customerPrice: 1800,
        resellerPrice: 1700,
        isActive: true,
      },
      {
        id: 'mtn_dir_5gb',
        plan_id: '5',
        network: 'mtn',
        name: 'MTN 5GB',
        size: '5GB',
        validity: '30 Days',
        planCode: '5',
        planType: 'Direct',
        providerCost: 4000,
        customerPrice: 4500,
        resellerPrice: 4300,
        isActive: true,
      },
      {
        id: 'mtn_dir_10gb',
        plan_id: '6',
        network: 'mtn',
        name: 'MTN 10GB',
        size: '10GB',
        validity: '30 Days',
        planCode: '6',
        planType: 'Direct',
        providerCost: 7800,
        customerPrice: 8500,
        resellerPrice: 8100,
        isActive: true,
      },
      // MTN SME & DataShare Plans matching VTUNaija live catalog
      {
        id: 'mtn_sme_500mb',
        plan_id: '304',
        network: 'mtn',
        name: 'MTN SME 500MB',
        size: '500MB',
        validity: '30 Days',
        planCode: '304',
        planType: 'SME',
        providerCost: 135,
        customerPrice: 160,
        resellerPrice: 145,
        isActive: true,
      },
      {
        id: 'mtn_sme_1gb',
        plan_id: '121',
        network: 'mtn',
        name: 'MTN SME 1GB',
        size: '1GB',
        validity: '30 Days',
        planCode: '121',
        planType: 'SME',
        providerCost: 260,
        customerPrice: 290,
        resellerPrice: 275,
        isActive: true,
      },
      {
        id: 'mtn_sme_2gb',
        plan_id: '122',
        network: 'mtn',
        name: 'MTN SME 2GB',
        size: '2GB',
        validity: '30 Days',
        planCode: '122',
        planType: 'SME',
        providerCost: 520,
        customerPrice: 580,
        resellerPrice: 550,
        isActive: true,
      },
      {
        id: 'mtn_sme_3gb',
        plan_id: '123',
        network: 'mtn',
        name: 'MTN SME 3GB',
        size: '3GB',
        validity: '30 Days',
        planCode: '123',
        planType: 'SME',
        providerCost: 780,
        customerPrice: 870,
        resellerPrice: 825,
        isActive: true,
      },
      {
        id: 'mtn_sme_5gb',
        plan_id: '124',
        network: 'mtn',
        name: 'MTN SME 5GB',
        size: '5GB',
        validity: '30 Days',
        planCode: '124',
        planType: 'SME',
        providerCost: 1300,
        customerPrice: 1450,
        resellerPrice: 1375,
        isActive: true,
      },
      {
        id: 'mtn_sme_10gb',
        plan_id: '13',
        network: 'mtn',
        name: 'MTN SME 10GB',
        size: '10GB',
        validity: '30 Days',
        planCode: '13',
        planType: 'SME',
        providerCost: 2600,
        customerPrice: 2900,
        resellerPrice: 2750,
        isActive: true,
      },
      // Airtel Corporate Data Plans
      {
        id: 'airtel_cg_1gb',
        plan_id: '29',
        network: 'airtel',
        name: 'Airtel CG 1GB',
        size: '1GB',
        validity: '30 Days',
        planCode: '29',
        planType: 'Corporate',
        providerCost: 280,
        customerPrice: 320,
        resellerPrice: 300,
        isActive: true,
      },
      {
        id: 'airtel_cg_2gb',
        plan_id: '30',
        network: 'airtel',
        name: 'Airtel CG 2GB',
        size: '2GB',
        validity: '30 Days',
        planCode: '30',
        planType: 'Corporate',
        providerCost: 560,
        customerPrice: 640,
        resellerPrice: 600,
        isActive: true,
      },
      {
        id: 'airtel_cg_5gb',
        plan_id: '32',
        network: 'airtel',
        name: 'Airtel CG 5GB',
        size: '5GB',
        validity: '30 Days',
        planCode: '32',
        planType: 'Corporate',
        providerCost: 1400,
        customerPrice: 1600,
        resellerPrice: 1500,
        isActive: true,
      },
      {
        id: 'airtel_cg_10gb',
        plan_id: '33',
        network: 'airtel',
        name: 'Airtel CG 10GB',
        size: '10GB',
        validity: '30 Days',
        planCode: '33',
        planType: 'Corporate',
        providerCost: 2800,
        customerPrice: 3200,
        resellerPrice: 3000,
        isActive: true,
      },
      // Glo Corporate Data Plans
      {
        id: 'glo_cg_1gb',
        plan_id: '21',
        network: 'glo',
        name: 'Glo CG 1GB',
        size: '1GB',
        validity: '30 Days',
        planCode: '21',
        planType: 'Corporate',
        providerCost: 240,
        customerPrice: 275,
        resellerPrice: 255,
        isActive: true,
      },
      {
        id: 'glo_cg_2gb',
        plan_id: '24',
        network: 'glo',
        name: 'Glo CG 2GB',
        size: '2GB',
        validity: '30 Days',
        planCode: '24',
        planType: 'Corporate',
        providerCost: 480,
        customerPrice: 550,
        resellerPrice: 510,
        isActive: true,
      },
      {
        id: 'glo_cg_5gb',
        plan_id: '26',
        network: 'glo',
        name: 'Glo CG 5GB',
        size: '5GB',
        validity: '30 Days',
        planCode: '26',
        planType: 'Corporate',
        providerCost: 1200,
        customerPrice: 1375,
        resellerPrice: 1275,
        isActive: true,
      },
      {
        id: 'glo_cg_10gb',
        plan_id: '27',
        network: 'glo',
        name: 'Glo CG 10GB',
        size: '10GB',
        validity: '30 Days',
        planCode: '27',
        planType: 'Corporate',
        providerCost: 2400,
        customerPrice: 2750,
        resellerPrice: 2550,
        isActive: true,
      },
      // 9mobile Plans
      {
        id: '9mobile_sme_1gb',
        plan_id: '491',
        network: '9mobile',
        name: '9mobile SME 1GB',
        size: '1GB',
        validity: '30 Days',
        planCode: '491',
        planType: 'SME',
        providerCost: 210,
        customerPrice: 250,
        resellerPrice: 230,
        isActive: true,
      },
      {
        id: '9mobile_sme_2gb',
        plan_id: '491',
        network: '9mobile',
        name: '9mobile SME 2GB',
        size: '2GB',
        validity: '30 Days',
        planCode: '491',
        planType: 'SME',
        providerCost: 420,
        customerPrice: 500,
        resellerPrice: 460,
        isActive: true,
      },
      {
        id: '9mobile_sme_5gb',
        plan_id: '498',
        network: '9mobile',
        name: '9mobile SME 5GB',
        size: '5GB',
        validity: '30 Days',
        planCode: '498',
        planType: 'SME',
        providerCost: 1050,
        customerPrice: 1250,
        resellerPrice: 1150,
        isActive: true,
      },
    ];

    plans.forEach(p => this.dataPlans.set(p.id, p));

    // 3. Airtime Discounts
    const discounts: AirtimeDiscount[] = [
      {
        network: 'mtn',
        customerDiscountPercent: 2.0,
        resellerDiscountPercent: 3.5,
        providerCostPercent: 4.5,
        isActive: true,
      },
      {
        network: 'airtel',
        customerDiscountPercent: 2.0,
        resellerDiscountPercent: 3.5,
        providerCostPercent: 4.5,
        isActive: true,
      },
      {
        network: 'glo',
        customerDiscountPercent: 3.0,
        resellerDiscountPercent: 5.0,
        providerCostPercent: 6.0,
        isActive: true,
      },
      {
        network: '9mobile',
        customerDiscountPercent: 3.0,
        resellerDiscountPercent: 5.0,
        providerCostPercent: 6.0,
        isActive: true,
      },
    ];
    discounts.forEach(d => this.airtimeDiscounts.set(d.network, d));

    // 4. Electricity Discos
    const discos: ElectricityDisco[] = [
      { id: 'ikedc', name: 'Ikeja Electric (IKEDC)', code: 'IKEDC', shortName: 'Ikeja', serviceFee: 50, isActive: true },
      { id: 'ekedc', name: 'Eko Electricity (EKEDC)', code: 'EKEDC', shortName: 'Eko', serviceFee: 50, isActive: true },
      { id: 'aedc', name: 'Abuja Electricity (AEDC)', code: 'AEDC', shortName: 'Abuja', serviceFee: 50, isActive: true },
      { id: 'ibedc', name: 'Ibadan Electricity (IBEDC)', code: 'IBEDC', shortName: 'Ibadan', serviceFee: 50, isActive: true },
      { id: 'phed', name: 'Port Harcourt Electric (PHED)', code: 'PHED', shortName: 'Port Harcourt', serviceFee: 50, isActive: true },
      { id: 'eedc', name: 'Enugu Electricity (EEDC)', code: 'EEDC', shortName: 'Enugu', serviceFee: 50, isActive: true },
      { id: 'kedco', name: 'Kano Electricity (KEDCO)', code: 'KEDCO', shortName: 'Kano', serviceFee: 50, isActive: true },
      { id: 'jedc', name: 'Jos Electricity (JEDC)', code: 'JEDC', shortName: 'Jos', serviceFee: 50, isActive: true },
    ];
    discos.forEach(d => this.electricityDiscos.set(d.id, d));

    // 5. Cable Packages
    const cablePackages: CablePackage[] = [
      // DStv
      { id: 'dstv_padi', provider: 'dstv', name: 'DStv Padi', code: 'dstv-padi', price: 3600, providerCost: 3550, isActive: true },
      { id: 'dstv_yanga', provider: 'dstv', name: 'DStv Yanga', code: 'dstv-yanga', price: 5100, providerCost: 5000, isActive: true },
      { id: 'dstv_confam', provider: 'dstv', name: 'DStv Confam', code: 'dstv-confam', price: 9300, providerCost: 9150, isActive: true },
      { id: 'dstv_compact', provider: 'dstv', name: 'DStv Compact', code: 'dstv-compact', price: 15700, providerCost: 15450, isActive: true },
      { id: 'dstv_compact_plus', provider: 'dstv', name: 'DStv Compact Plus', code: 'dstv-compact-plus', price: 25000, providerCost: 24600, isActive: true },
      { id: 'dstv_premium', provider: 'dstv', name: 'DStv Premium', code: 'dstv-premium', price: 37000, providerCost: 36400, isActive: true },
      // GOtv
      { id: 'gotv_smallie', provider: 'gotv', name: 'GOtv Smallie', code: 'gotv-smallie', price: 1575, providerCost: 1550, isActive: true },
      { id: 'gotv_jinja', provider: 'gotv', name: 'GOtv Jinja', code: 'gotv-jinja', price: 3300, providerCost: 3250, isActive: true },
      { id: 'gotv_jolli', provider: 'gotv', name: 'GOtv Jolli', code: 'gotv-jolli', price: 4850, providerCost: 4775, isActive: true },
      { id: 'gotv_max', provider: 'gotv', name: 'GOtv Max', code: 'gotv-max', price: 7200, providerCost: 7080, isActive: true },
      { id: 'gotv_supa', provider: 'gotv', name: 'GOtv Supa', code: 'gotv-supa', price: 9600, providerCost: 9450, isActive: true },
      // StarTimes
      { id: 'star_nova', provider: 'startimes', name: 'StarTimes Nova', code: 'star-nova', price: 1700, providerCost: 1660, isActive: true },
      { id: 'star_basic', provider: 'startimes', name: 'StarTimes Basic', code: 'star-basic', price: 3000, providerCost: 2940, isActive: true },
      { id: 'star_classic', provider: 'startimes', name: 'StarTimes Classic', code: 'star-classic', price: 4500, providerCost: 4410, isActive: true },
      { id: 'star_super', provider: 'startimes', name: 'StarTimes Super', code: 'star-super', price: 7000, providerCost: 6860, isActive: true },
    ];
    cablePackages.forEach(c => this.cablePackages.set(c.id, c));

    // 6. Exam PINs
    const examPins: ExamPin[] = [
      { id: 'exam_waec', exam: 'WAEC', name: 'WAEC Result Checker PIN', price: 3800, providerCost: 3650, stockAvailable: 150, isActive: true },
      { id: 'exam_neco', exam: 'NECO', name: 'NECO Result Token', price: 1200, providerCost: 1100, stockAvailable: 280, isActive: true },
      { id: 'exam_jamb_nomock', exam: 'JAMB', name: 'JAMB UTME (Without Mock)', price: 6200, providerCost: 6000, stockAvailable: 85, isActive: true },
      { id: 'exam_jamb_mock', exam: 'JAMB', name: 'JAMB UTME (With Mock)', price: 7700, providerCost: 7450, stockAvailable: 60, isActive: true },
    ];
    examPins.forEach(e => this.examPins.set(e.id, e));

    // 7. Transactions start clean (no hardcoded demo transactions)
    const sampleTxs: Transaction[] = [];
    sampleTxs.forEach(t => this.transactions.set(t.id, t));

    // 8. Seed Providers - VTUNaija Integration
    const providers: ProviderConfig[] = [
      {
        id: 'prv_vtunaija_01',
        name: 'VTUNaija API Gateway',
        baseUrl: 'https://vtunaija.com.ng/api',
        apiKey: process.env.VTUNAIJA_API_KEY || 'VTUNAIJA_TOKEN_KEY',
        secretKey: '',
        isPrimary: true,
        isBackup: false,
        isLive: true,
        balance: 185000,
        status: 'connected',
        lastPing: new Date().toISOString(),
      },
      {
        id: 'prv_vtu_02',
        name: 'VTUNaija Sandbox / Backup',
        baseUrl: 'https://sandbox.vtunaija.com.ng/api',
        apiKey: 'SANDBOX_TOKEN',
        secretKey: '',
        isPrimary: false,
        isBackup: true,
        isLive: false,
        balance: 92400,
        status: 'connected',
        lastPing: new Date().toISOString(),
      },
    ];
    providers.forEach(p => this.providers.set(p.id, p));

    // 9. Seed Notifications
    const notifs: NotificationItem[] = [
      {
        id: 'notif_01',
        userId: ahmad.id,
        title: 'Transaction Successful',
        message: 'Your MTN 5GB Data purchase for 08012345678 was successful.',
        type: 'success',
        read: false,
        createdAt: '2026-11-01T08:45:00Z',
      },
      {
        id: 'notif_02',
        userId: ahmad.id,
        title: 'Wallet Funded',
        message: 'Your wallet has been credited with ₦15,000.00 via Paystack.',
        type: 'info',
        read: true,
        createdAt: '2026-10-29T14:10:00Z',
      },
      {
        id: 'notif_03',
        userId: ahmad.id,
        title: 'Referral Bonus Received',
        message: 'You earned ₦1,200.00 referral commission from Musa Ibrahim.',
        type: 'promo',
        read: true,
        createdAt: '2026-10-25T16:00:00Z',
      },
    ];
    notifs.forEach(n => this.notifications.set(n.id, n));

    // 10. Seed Support Tickets
    const sampleTicket: SupportTicket = {
      id: 'tkt_01',
      userId: ahmad.id,
      userName: ahmad.name,
      userEmail: ahmad.email,
      subject: 'Inquiry regarding Reseller Upgrade',
      category: 'Account',
      status: 'resolved',
      priority: 'medium',
      createdAt: '2026-10-20T09:00:00Z',
      updatedAt: '2026-10-20T11:30:00Z',
      messages: [
        {
          id: 'msg_01',
          sender: 'user',
          senderName: ahmad.name,
          message: 'Hello, how can I upgrade my account to reseller status to get discounted data prices?',
          timestamp: '2026-10-20T09:00:00Z',
        },
        {
          id: 'msg_02',
          sender: 'admin',
          senderName: 'Naeem Support',
          message: 'Hello Ahmad! You can upgrade instantly from your profile or contact us. Resellers enjoy up to 15% lower data prices.',
          timestamp: '2026-10-20T11:30:00Z',
        },
      ],
    };
    this.tickets.set(sampleTicket.id, sampleTicket);

    // Initial Ledger entries
    this.ledger.push({
      id: 'ledg_01',
      userId: ahmad.id,
      reference: 'NDS-WLT-88392105',
      type: 'credit',
      amount: 15000,
      balanceBefore: 0,
      balanceAfter: 15000,
      description: 'Wallet top-up via Paystack',
      timestamp: '2026-10-29T14:10:00Z',
    });

    this.ledger.push({
      id: 'ledg_02',
      userId: ahmad.id,
      reference: 'NDS-DAT-88392101',
      type: 'debit',
      amount: 4500,
      balanceBefore: 17000,
      balanceAfter: 12500,
      description: 'Payment for MTN 5GB Data to 08012345678',
      timestamp: '2026-11-01T08:45:00Z',
    });

    // Seed Audit Log
    this.auditLogs.push({
      id: 'aud_01',
      adminEmail: 'admin@naeemdatasub.ng',
      action: 'SYSTEM_INITIALIZATION',
      target: 'PLATFORM_BOOTSTRAP',
      details: 'NAEEM DATA SUB Nigerian VTU Core initialized with high availability configuration.',
      timestamp: '2025-12-01T08:00:00Z',
      ip: '127.0.0.1',
    });
  }

  // Double-entry Wallet Debit with atomic check
  debitWallet(userId: string, amount: number, reference: string, description: string): { success: boolean; error?: string; balanceAfter?: number } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.status === 'suspended') return { success: false, error: 'Account suspended. Contact support.' };
    if (user.walletBalance < amount) {
      return { 
        success: false, 
        error: `Insufficient wallet balance. Balance is ₦${user.walletBalance.toLocaleString()}, required ₦${amount.toLocaleString()}. Please fund your wallet.` 
      };
    }

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore - amount;
    user.walletBalance = balanceAfter;
    user.totalTransactionsCount += 1;

    const ledgerEntry: WalletLedgerEntry = {
      id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      reference,
      type: 'debit',
      amount,
      balanceBefore,
      balanceAfter,
      description,
      timestamp: new Date().toISOString(),
    };
    this.ledger.push(ledgerEntry);
    this.saveToDisk();

    return { success: true, balanceAfter };
  }

  // Double-entry Wallet Credit
  creditWallet(userId: string, amount: number, reference: string, description: string): { success: boolean; error?: string; balanceAfter?: number } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore + amount;
    user.walletBalance = balanceAfter;

    const ledgerEntry: WalletLedgerEntry = {
      id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      reference,
      type: 'credit',
      amount,
      balanceBefore,
      balanceAfter,
      description,
      timestamp: new Date().toISOString(),
    };
    this.ledger.push(ledgerEntry);
    this.saveToDisk();

    return { success: true, balanceAfter };
  }

  // Reverse transaction if delivery failed
  reverseTransaction(transactionId: string, reason: string): boolean {
    const tx = this.transactions.get(transactionId);
    if (!tx || tx.status === 'reversed') return false;

    // Credit back
    this.creditWallet(tx.userId, tx.amount, `REV-${tx.reference}`, `Reversal for failed transaction ${tx.reference}: ${reason}`);
    tx.status = 'reversed';
    tx.failureReason = reason;

    // Add notification
    this.addNotification({
      userId: tx.userId,
      title: 'Transaction Reversed & Refunded',
      message: `₦${tx.amount.toLocaleString()} has been refunded to your wallet for failed transaction ${tx.reference}. Reason: ${reason}`,
      type: 'warning',
    });
    this.saveToDisk();

    return true;
  }

  addNotification(item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const full: NotificationItem = {
      ...item,
      id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, full);
    this.saveToDisk();
    return full;
  }

  addAudit(adminEmail: string, action: string, target: string, details: string, ip = '127.0.0.1') {
    const audit: AuditLog = {
      id: `aud_${Date.now()}`,
      adminEmail,
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
      ip,
    };
    this.auditLogs.unshift(audit);
    this.saveToDisk();
  }
}

export const db = new Database();
