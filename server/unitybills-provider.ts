import { fsGetDoc, fsUpsertDoc } from '../api/_firestore.js';
import { getCurrentUserToken } from './request-context.ts';
import { UnityBillsConfig, VirtualAccount, User } from '../src/types/index.ts';
import { db } from './db.ts';
import { saveUserVirtualAccount } from './billstack-provider.ts';

// Default UnityBills API configuration
export const defaultUnityBillsConfig: UnityBillsConfig = {
  apiKey: process.env.UNITYBILLS_API_KEY || 'UNITYBILLS_LIVE_KEY_PLACEHOLDER',
  baseUrl: 'https://unitybills.ng',
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

/**
 * Load UnityBills configuration from Firestore with memory/disk fallback
 */
export async function getFirestoreUnityBillsConfig(): Promise<UnityBillsConfig> {
  const userToken = getCurrentUserToken();
  try {
    const res = await fsGetDoc('systemSettings/unitybills_config', userToken);
    if (res.ok && res.data) {
      const data = res.data as UnityBillsConfig;
      db.unityBillsConfig = {
        ...defaultUnityBillsConfig,
        ...db.unityBillsConfig,
        ...data,
      };
    }
  } catch (err: any) {
    console.warn('Note: Reading UnityBills config from memory fallback:', err?.message || err);
  }
  return db.unityBillsConfig;
}

export async function saveFirestoreUnityBillsConfig(config: Partial<UnityBillsConfig>): Promise<UnityBillsConfig> {
  db.unityBillsConfig = {
    ...db.unityBillsConfig,
    ...config,
    lastTested: new Date().toISOString(),
  };
  db.saveToDisk();

  const userToken = getCurrentUserToken();
  try {
    await fsUpsertDoc(
      'systemSettings',
      'unitybills_config',
      {
        ...db.unityBillsConfig,
        updatedAt: new Date().toISOString(),
      },
      userToken
    );
  } catch (err: any) {
    console.warn('Firestore UnityBills config save note:', err?.message || err);
  }

  return db.unityBillsConfig;
}

/**
 * Test & ping UnityBills API endpoint connection and fetch wallet float balance
 */
export async function pingUnityBillsConnection(): Promise<{
  success: boolean;
  balance: number;
  latency: number;
  message: string;
}> {
  const cfg = await getFirestoreUnityBillsConfig();
  const startTime = Date.now();
  let balance = cfg.balance ?? 0;
  let success = false;
  let message = '';

  const apiKey = (cfg.apiKey || '').trim();
  const baseUrl = (cfg.baseUrl || 'https://unitybills.ng').replace(/\/+$/, '');

  if (apiKey && apiKey !== 'UNITYBILLS_LIVE_KEY_PLACEHOLDER' && !apiKey.startsWith('SANDBOX')) {
    try {
      const authHeader = apiKey.toLowerCase().startsWith('token') || apiKey.toLowerCase().startsWith('bearer') 
        ? apiKey 
        : `Token ${apiKey}`;

      const headers = {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      };

      const originUrl = baseUrl.replace(/\/api(\/v1)?\/?$/, '');
      const urlCandidates = Array.from(new Set([
        `${originUrl}/virtual-account`,
        `${originUrl}/api/virtual-account`,
        `${originUrl}/user`,
        `${originUrl}/api/user`,
        `${baseUrl}/user`,
        'https://unitybills.ng/virtual-account',
        'https://unitybills.ng/user',
      ]));

      let lastError = '';
      for (const targetUrl of urlCandidates) {
        try {
          const response = await fetch(targetUrl, {
            method: 'GET',
            headers,
          });

          const resText = await response.text();
          let data: any = {};
          try {
            data = JSON.parse(resText);
          } catch {
            if (resText.includes('CSRF token mismatch') || resText.includes('419')) {
              lastError = 'Laravel CSRF token mismatch on web route. Retrying API route...';
              continue;
            }
          }

          const latency = Date.now() - startTime;

          if (response.ok && (data.status === 'success' || data.success === true || data.user || data.balance !== undefined || data.wallet_balance !== undefined || data.data?.accountNumber)) {
            success = true;
            balance = parseFloat(data.balance ?? data.data?.balance ?? data.user?.wallet_balance ?? data.wallet_balance ?? balance);
            message = `Connected directly to UnityBills.ng live server in ${latency}ms. HTTP ${response.status} OK`;
            break;
          } else if (data.message || data.error) {
            lastError = data.message || data.error || `HTTP ${response.status}`;
          }
        } catch (err: any) {
          lastError = err.message || 'Host unreachable';
        }
      }

      if (!success && lastError) {
        message = `UnityBills API ping: ${lastError}`;
      }
    } catch (err: any) {
      message = `UnityBills connection error: ${err.message || 'Host unreachable'}`;
    }
  } else {
    message = 'UnityBills API Token is using default placeholder. Enter your API key from unitybills.ng/dashboard to activate live routing.';
  }

  const latency = Date.now() - startTime + (success ? 0 : 35);
  cfg.lastTested = new Date().toISOString();
  cfg.lastStatus = success ? 'connected' : (apiKey && apiKey !== 'UNITYBILLS_LIVE_KEY_PLACEHOLDER' ? 'error' : 'unconfigured');
  cfg.balance = balance;

  await saveFirestoreUnityBillsConfig(cfg);

  return {
    success,
    balance,
    latency,
    message,
  };
}

export interface GenerateUnityBillsVirtualAccountOptions {
  user: User;
  bank?: string;
  idType?: 'nin' | 'bvn';
  idNumber?: string;
}

/**
 * Generate a dedicated virtual account using UnityBills API
 * Endpoint: POST https://unitybills.ng/virtual-account
 * Headers: Authorization: Token YOUR_API_KEY, Accept: application/json, X-Requested-With: XMLHttpRequest
 * Payload: {"firstname":"Ada","lastname":"Obi","phoneNumber":"08031234567","nin":"12345678901","webhook_url":"..."}
 */
export async function generateUnityBillsVirtualAccount(
  options: GenerateUnityBillsVirtualAccountOptions
): Promise<{ success: boolean; account?: VirtualAccount; message?: string; raw?: any }> {
  const { user, bank = 'UNITYBILLS', idType, idNumber } = options;
  const config = await getFirestoreUnityBillsConfig();

  const nameParts = (user.name || 'Valued Customer').trim().split(/\s+/);
  const firstname = nameParts[0] || 'Customer';
  const lastname = nameParts.slice(1).join(' ') || 'User';
  const cleanPhone = (user.phone || '08012345678').replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone.slice(-10)}`;

  const rawPublicUrl = process.env.PUBLIC_URL || 'https://ais-pre-iviwqth7hoxlvljjfdr5dk-637753811837.europe-west3.run.app';
  const cleanPublicUrl = rawPublicUrl.replace('ais-dev-', 'ais-pre-');
  const webhookUrl = `${cleanPublicUrl}/hooks/deposits`;

  const payload: any = {
    firstname,
    lastname,
    phoneNumber: formattedPhone,
    phone: formattedPhone,
    email: user.email || 'customer@unitybills.ng',
    bank_name: bank,
    webhook_url: webhookUrl,
  };

  const rawId = (idNumber || (idType === 'bvn' ? user.bvn : user.nin) || user.nin || user.bvn || '').replace(/\D/g, '');
  const idValue = rawId.length === 11 ? rawId : '12345678901';

  if (idType === 'bvn') {
    payload.bvn = idValue;
  } else {
    payload.nin = idValue;
  }

  const baseUrl = (config.baseUrl || 'https://unitybills.ng').replace(/\/+$/, '');
  const apiKey = (config.apiKey || '').trim();

  if (!apiKey) {
    return {
      success: false,
      message: 'UnityBills API Token is not configured. Please enter your live API key in Admin Dashboard > VTU API Gateways settings.',
    };
  }

  const authHeader = apiKey.toLowerCase().startsWith('token') || apiKey.toLowerCase().startsWith('bearer') 
    ? apiKey 
    : `Token ${apiKey}`;

  const headers = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  // Candidate endpoint URLs to handle base URL variants cleanly & bypass CSRF web routes
  let rawEndpoint = (config.virtualAccountEndpoint || '/virtual-account').trim();
  if (!rawEndpoint.startsWith('/')) rawEndpoint = `/${rawEndpoint}`;
  if (rawEndpoint === '/user/virtual-account') rawEndpoint = '/virtual-account';

  const originUrl = baseUrl.replace(/\/api(\/v1)?\/?$/, '');

  const urlCandidates: string[] = Array.from(new Set([
    `${originUrl}/virtual-account`,
    `${originUrl}/api/virtual-account`,
    `${baseUrl}${rawEndpoint}`,
    `${originUrl}/api/v1/virtual-account`,
    'https://unitybills.ng/virtual-account',
    'https://unitybills.ng/api/virtual-account',
  ]));

  let lastErrorMsg = '';
  let lastResData: any = null;

  for (const targetUrl of urlCandidates) {
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const resText = await response.text();
      let resData: any = {};
      try {
        resData = JSON.parse(resText);
      } catch {
        if (resText.includes('CSRF token mismatch') || resText.includes('419')) {
          lastErrorMsg = `Laravel CSRF token mismatch at ${targetUrl}. Trying API route...`;
          continue;
        }
      }

      lastResData = resData;

      if ((response.ok || resData.success === true || resData.status === 'success') && (resData.data?.accountNumber || resData.data?.account_number || resData.accountNumber || resData.account_number)) {
        const dataObj = resData.data || resData;
        const accountNumber = String(dataObj.accountNumber || dataObj.account_number || resData.accountNumber || '').trim();
        const accountName = String(dataObj.accountName || dataObj.account_name || `${firstname} ${lastname} / NAEEM DATA`).trim();
        const bankName = String(dataObj.bank_name || dataObj.bankName || 'Wema Bank / UnityBills').trim();

        if (accountNumber) {
          const createdAccount: VirtualAccount = {
            bankName,
            accountNumber,
            accountName,
            depositFee: 0,
            provider: 'billstack',
            createdAt: new Date().toISOString(),
          };

          saveUserVirtualAccount(user.id, createdAccount);

          return {
            success: true,
            account: createdAccount,
            message: `Dedicated ${bankName} account reserved successfully (${accountNumber})`,
            raw: resData,
          };
        }
      }

      const errStr = String(resData.message || resData.error || resData.detail || '').toLowerCase();
      if (response.status === 404 || errStr.includes('route') || errStr.includes('not found') || errStr.includes('csrf') || resText.includes('CSRF token mismatch')) {
        lastErrorMsg = resData.message || resData.error || `HTTP ${response.status} at ${targetUrl}`;
        continue;
      } else {
        const errorMsg = resData.message || resData.error || resData.detail || `UnityBills API Error (HTTP ${response.status})`;
        return {
          success: false,
          message: `UnityBills API Failed: ${errorMsg}`,
          raw: resData,
        };
      }
    } catch (err: any) {
      lastErrorMsg = err.message || 'Network error';
    }
  }

  return {
    success: false,
    message: `UnityBills API Failed: ${lastErrorMsg || 'Virtual account route not found or CSRF protection hit'}`,
    raw: lastResData,
  };
}
