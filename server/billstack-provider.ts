import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestoreDb, auth } from '../src/lib/firebase.ts';
import { BillStackConfig, VirtualAccount, User } from '../src/types/index.ts';
import { db } from './db.ts';

// In-memory fallback config
export const defaultBillStackConfig: BillStackConfig = {
  secretKey: process.env.BILLSTACK_SECRET_KEY || 'Bill_Stack-SEC-KEY-live_demo_key_9psb_safehaven_providus',
  baseUrl: 'https://api.billstack.co/v2',
  defaultBanks: ['9PSB', 'SAFEHAVEN', 'PROVIDUS'],
  isLive: true,
  webhookSecret: process.env.BILLSTACK_WEBHOOK_SECRET || 'whsec_billstack_live_secret',
  lastStatus: 'connected',
  lastTested: new Date().toISOString(),
};

// Live in-memory configuration cache synchronized across backend calls
let memoryBillStackConfig: BillStackConfig = { ...defaultBillStackConfig };

/**
 * Load BillStack configuration from Firestore with memory fallback
 */
export async function getFirestoreBillStackConfig(): Promise<BillStackConfig> {
  if (!auth.currentUser) return memoryBillStackConfig;
  try {
    const docRef = doc(firestoreDb, 'systemSettings', 'billstack_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as BillStackConfig;
      memoryBillStackConfig = {
        ...defaultBillStackConfig,
        ...memoryBillStackConfig,
        ...data,
      };
    }
  } catch (err: any) {
    console.warn('Note: Reading BillStack config from memory fallback due to Firestore:', err?.message || err);
  }
  return memoryBillStackConfig;
}

export async function saveFirestoreBillStackConfig(config: Partial<BillStackConfig>): Promise<BillStackConfig> {
  memoryBillStackConfig = {
    ...memoryBillStackConfig,
    ...config,
    lastTested: new Date().toISOString(),
  };

  if (auth.currentUser) {
    try {
      const docRef = doc(firestoreDb, 'systemSettings', 'billstack_config');
      await setDoc(
        docRef,
        {
          ...memoryBillStackConfig,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn('Firestore BillStack config save note:', err?.message || err);
    }
  }

  return memoryBillStackConfig;
}

export interface GenerateVirtualAccountOptions {
  user: User;
  bank: '9PSB' | 'SAFEHAVEN' | 'PROVIDUS' | 'PALMPAY';
  idType?: 'nin' | 'bvn';
  idNumber?: string;
}

export interface BillStackAccountResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    account?: Array<{
      account_number: string;
      account_name: string;
      bank_name: string;
      bank_id: string;
      created_at: string;
    }>;
    meta?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  error?: string;
}

/**
 * Generate a dedicated virtual bank account for a user using BillStack
 * Endpoint: POST https://api.billstack.co/v2/thirdparty/generateVirtualAccount/
 */
export async function generateBillStackVirtualAccount(
  options: GenerateVirtualAccountOptions
): Promise<{ success: boolean; account?: VirtualAccount; message?: string; raw?: any }> {
  const { user, bank, idType, idNumber } = options;
  const config = await getFirestoreBillStackConfig();

  // Split user name into firstName and lastName
  const nameParts = (user.name || 'Valued Customer').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  const cleanPhone = (user.phone || '08012345678').replace(/\D/g, '');
  const reference = `NDS-BS-${user.id.replace(/[^a-zA-Z0-9]/g, '')}-${bank.toLowerCase()}-${Date.now().toString().slice(-6)}`;

  const payload: any = {
    reference,
    email: user.email || 'customer@naeemdatasub.ng',
    phone: cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone.slice(-10)}`,
    firstName,
    lastName,
    bank,
  };

  if (bank === 'PALMPAY') {
    if (!idType || !idNumber) {
      return {
        success: false,
        message: 'idType (nin or bvn) and idNumber are strictly required when generating PalmPay accounts',
      };
    }
    payload.idType = idType;
    payload.idNumber = idNumber;
  }

  const endpointUrl = `${config.baseUrl.replace(/\/+$/, '')}/thirdparty/generateVirtualAccount/`;

  const apiKey = (config.secretKey || '').trim();
  if (!apiKey) {
    return {
      success: false,
      message: 'BillStack Secret Key is not configured. Please enter your live Secret Key in Admin Dashboard > VTU API Gateways.',
    };
  }

  try {
    const authHeader = apiKey.toLowerCase().startsWith('bearer') ? apiKey : `Bearer ${apiKey}`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as BillStackAccountResponse;

    if (response.ok && data.status && data.data?.account && data.data.account.length > 0) {
      const accInfo = data.data.account[0];
      const newVirtualAccount: VirtualAccount = {
        bankName: accInfo.bank_name || `${bank} Bank`,
        accountNumber: accInfo.account_number,
        accountName: accInfo.account_name || `NAEEM-${firstName} ${lastName}`,
        bankId: bank,
        reference: data.data.reference || reference,
        createdAt: accInfo.created_at || new Date().toISOString(),
        provider: 'billstack',
      };

      // Cache into user's virtual accounts
      saveUserVirtualAccount(user.id, newVirtualAccount);
      return { success: true, account: newVirtualAccount, message: 'Account reserved successfully via BillStack API', raw: data };
    } else {
      const errorMsg = data.message || data.error || `HTTP ${response.status} from BillStack API`;
      return {
        success: false,
        message: `BillStack API Error: ${errorMsg}`,
        raw: data,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `BillStack Gateway connection failed: ${err.message || 'Unknown network error'}`,
    };
  }
}

/**
 * Persist generated virtual accounts to user record in db.virtualAccounts and Firestore
 */
export function saveUserVirtualAccount(userId: string, newAccount: VirtualAccount): VirtualAccount[] {
  const current = db.virtualAccounts.get(userId) || [];
  // Deduplicate by bankId or accountNumber
  const filtered = current.filter(
    a => a.accountNumber !== newAccount.accountNumber && (newAccount.bankId ? a.bankId !== newAccount.bankId : true)
  );
  const updated = [newAccount, ...filtered];
  db.virtualAccounts.set(userId, updated);

  if (auth.currentUser) {
    try {
      const userDocRef = doc(firestoreDb, 'users', userId);
      setDoc(
        userDocRef,
        {
          virtualAccounts: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {
      // Non-fatal
    }
  }

  return updated;
}
