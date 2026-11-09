import { NetworkType } from '../src/types/index.ts';
import { db } from './db.ts';
import {
  dispatchVTUPurchase,
  dispatchVTUNaijaPurchase,
  getFirestoreVTUConfig,
  saveFirestoreVTUConfig,
  getFirestoreNCWalletConfig,
  saveFirestoreNCWalletConfig,
  getFirestoreServiceRouting,
  saveFirestoreServiceRouting,
  getGatewayForService,
  getGatewayNetworkId,
} from './vtu-dispatcher.ts';

// Auto-detect Nigerian network prefix
export function detectNigerianNetwork(phoneNumber: string): NetworkType | null {
  const clean = phoneNumber.replace(/\D/g, '');
  let prefix = clean;
  if (clean.startsWith('234')) {
    prefix = '0' + clean.slice(3, 6);
  } else if (clean.startsWith('0')) {
    prefix = clean.slice(0, 4);
  }

  const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
  const airtelPrefixes = ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'];
  const gloPrefixes = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
  const nineMobilePrefixes = ['0809', '0817', '0818', '0909', '0908'];

  if (mtnPrefixes.includes(prefix)) return 'mtn';
  if (airtelPrefixes.includes(prefix)) return 'airtel';
  if (gloPrefixes.includes(prefix)) return 'glo';
  if (nineMobilePrefixes.includes(prefix)) return '9mobile';

  return null;
}

export interface VerificationResult {
  valid: boolean;
  customerName?: string;
  address?: string;
  currentPackage?: string;
  dueAmount?: number;
  message?: string;
}

export class VTUProviderGateway {
  // Meter Verification via active Gateway (VTUNaija or NCwallet)
  static async verifyMeter(discoCode: string, meterNumber: string, meterType: 'prepaid' | 'postpaid'): Promise<VerificationResult> {
    const cleanMeter = meterNumber.replace(/\s+/g, '');
    if (cleanMeter.length < 8) {
      return { valid: false, message: 'Invalid meter number length (must be at least 8 digits)' };
    }

    const discoCodeUpper = discoCode.trim().toUpperCase();
    const discoMapToId: Record<string, string> = {
      IKEDC: '1', IKEJA: '1',
      EKEDC: '2', EKO: '2',
      AEDC: '3', ABUJA: '3',
      IBEDC: '4', IBADAN: '4',
      PHED: '5', PORTHARCOURT: '5',
      EEDC: '6', ENUGU: '6',
      KEDCO: '7', KANO: '7',
      JEDC: '8', JOS: '8',
      KAEDCO: '9', KADUNA: '9',
      APLE: '10', ABA: '10',
    };
    const discoNumericId = discoMapToId[discoCodeUpper] || discoCode;

    // 1. Resolve selected gateway for electricity service
    const { provider, providerName, config } = await getGatewayForService('electricity');
    const apiUrl = (config.baseUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();

    if (!apiUrl || !apiKey) {
      return {
        valid: false,
        message: `${providerName} API Key is not configured. Please enter your API Key in Admin Dashboard > Providers.`,
      };
    }

    const authHeader = apiKey.startsWith('Token ') || apiKey.startsWith('Bearer ') ? apiKey : `Token ${apiKey}`;
    const primaryEndpoint = config.electricityVerifyEndpoint || '/billpayment/verify/';
    
    // Candidate endpoints to handle slight vendor variations and prevent 404 errors
    const endpointCandidates = [
      primaryEndpoint,
      '/billpayment/verify/',
      '/validatemeter/',
      '/electricity/verify/',
    ];
    // Deduplicate
    const uniqueCandidates = Array.from(new Set(endpointCandidates.map(e => e.replace(/^\/+/, ''))));

    const payload = {
      disco_name: discoNumericId,
      disco: discoNumericId,
      disconame: discoCodeUpper,
      meter_number: cleanMeter,
      meternumber: cleanMeter,
      MeterType: meterType === 'prepaid' ? 'prepaid' : 'postpaid',
      meter_type: meterType === 'prepaid' ? '1' : '2',
      service_id: discoCodeUpper,
      'request-id': 'VERIFY_' + Date.now(),
    };

    let lastErrorMsg = '';

    for (const ep of uniqueCandidates) {
      const targetUrl = `${apiUrl}/${ep}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.status === 404) {
          // Try next candidate endpoint if 404
          lastErrorMsg = `${providerName} endpoint ${targetUrl} returned 404 Not Found`;
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          return {
            valid: false,
            message: `${providerName} API Key is unauthorized or invalid (HTTP ${res.status}). Please update in Admin Dashboard.`,
          };
        }

        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = { rawText: text };
        }

        if (data) {
          if (data.invalid === true || data.invalid === 'true' || data.status === 'fail' || data.status === 'invalid' || data.status === false || data.Status === 'failed') {
            return {
              valid: false,
              message: data.api_response || data.error || data.message || data.msg || data.detail || `Invalid meter number for ${discoCodeUpper}`,
            };
          }

          const customerName = data.Customer_Name || data.customer_name || data.name || data.customerName || data.data?.customer_name;
          const address = data.Customer_Address || data.address || data.data?.address;

          if (customerName) {
            return {
              valid: true,
              customerName: String(customerName).trim().toUpperCase(),
              address: address ? String(address).trim() : `${discoCodeUpper} Distribution District`,
              dueAmount: meterType === 'postpaid' ? (data.dueAmount || 0) : 0,
              message: `Meter verified successfully via ${providerName}`,
            };
          }

          // If provider returned HTTP 200 without customer name
          return {
            valid: false,
            message: data.api_response && !data.api_response.toLowerCase().includes('successfully')
              ? data.api_response
              : `Meter #${cleanMeter} could not be verified on ${discoCodeUpper}. Please confirm the number.`,
          };
        }
      } catch (err: any) {
        lastErrorMsg = err.name === 'AbortError' ? `Connection timeout to ${targetUrl}` : (err.message || 'Network error');
      }
    }

    return {
      valid: false,
      message: lastErrorMsg || `Meter verification could not reach ${providerName}. Please check provider endpoints in Admin Dashboard.`,
    };
  }

  // Cable Smartcard / IUC Verification via active Gateway (VTUNaija or NCwallet)
  static async verifySmartcard(provider: 'dstv' | 'gotv' | 'startimes' | string, iucNumber: string): Promise<VerificationResult> {
    const cleanIuc = iucNumber.replace(/\s+/g, '');
    if (cleanIuc.length < 8) {
      return { valid: false, message: 'Invalid Smartcard/IUC number (must be at least 8 digits)' };
    }

    const providerLower = provider.trim().toLowerCase();
    const cableMapToId: Record<string, string> = {
      gotv: '1',
      dstv: '2',
      startimes: '3',
      showmax: '4',
    };
    const cableNumericId = cableMapToId[providerLower] || '1';

    // 1. Resolve selected gateway for cable service
    const { provider: gatewayType, providerName, config } = await getGatewayForService('cable');
    const apiUrl = (config.baseUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();

    if (!apiUrl || !apiKey) {
      return {
        valid: false,
        message: `${providerName} API Key is not configured. Please enter your API Key in Admin Dashboard > Providers.`,
      };
    }

    const authHeader = apiKey.startsWith('Token ') || apiKey.startsWith('Bearer ') ? apiKey : `Token ${apiKey}`;
    const primaryEndpoint = config.cableVerifyEndpoint || '/cablesub/verify/';

    const endpointCandidates = [
      primaryEndpoint,
      '/cablesub/verify/',
      '/validateiuc/',
      '/cable/verify/',
    ];
    const uniqueCandidates = Array.from(new Set(endpointCandidates.map(e => e.replace(/^\/+/, ''))));

    const payload = {
      cablename: cableNumericId,
      cable_name: providerLower,
      provider: providerLower,
      smart_card_number: cleanIuc,
      smartcard_number: cleanIuc,
      iucnumber: cleanIuc,
      iuc: cleanIuc,
      'request-id': 'VERIFY_' + Date.now(),
    };

    let lastErrorMsg = '';

    for (const ep of uniqueCandidates) {
      const targetUrl = `${apiUrl}/${ep}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.status === 404) {
          lastErrorMsg = `${providerName} endpoint ${targetUrl} returned 404 Not Found`;
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          return {
            valid: false,
            message: `${providerName} API Key is unauthorized or invalid (HTTP ${res.status}). Please update in Admin Dashboard.`,
          };
        }

        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = { rawText: text };
        }

        if (data) {
          if (data.invalid === true || data.invalid === 'true' || data.status === 'fail' || data.status === 'invalid' || data.status === false || data.Status === 'failed') {
            return {
              valid: false,
              message: data.api_response || data.error || data.message || data.msg || data.detail || `Invalid Smartcard/IUC number for ${provider.toUpperCase()}`,
            };
          }

          const customerName = data.Customer_Name || data.customer_name || data.name || data.customerName || data.data?.customer_name;
          const currentPackage = data.package || data.current_package || data.data?.package;

          if (customerName) {
            return {
              valid: true,
              customerName: String(customerName).trim().toUpperCase(),
              currentPackage: currentPackage ? String(currentPackage).trim() : `${provider.toUpperCase()} Package`,
              message: `Smartcard verified successfully via ${providerName}`,
            };
          }

          // If provider returned HTTP 200 without customer name
          return {
            valid: false,
            message: data.api_response && !data.api_response.toLowerCase().includes('successfully')
              ? data.api_response
              : `Smartcard / IUC #${cleanIuc} could not be verified on ${provider.toUpperCase()}. Please confirm the number.`,
          };
        }
      } catch (err: any) {
        lastErrorMsg = err.name === 'AbortError' ? `Connection timeout to ${targetUrl}` : (err.message || 'Network error');
      }
    }

    return {
      valid: false,
      message: lastErrorMsg || `Smartcard verification could not reach ${providerName}. Please check provider endpoints in Admin Dashboard.`,
    };
  }

  // VTUNaija API Integration Execution
  static async executePurchase(params: {
    serviceType: string;
    amount: number;
    providerCost: number;
    recipient: string;
    network?: string;
    planName?: string;
    metadata?: Record<string, any>;
    user?: any;
  }): Promise<{
    success: boolean;
    providerReference: string;
    token?: string;
    error?: string;
    httpCode?: number;
  }> {
    if (db.settings.maintenanceMode) {
      return {
        success: false,
        providerReference: '',
        error: 'System is currently under maintenance. Please try again later.',
        httpCode: 503,
      };
    }

    const targetUser = params.user || db.users.get('usr_ahmad_01') || {
      id: 'usr_ahmad_01',
      name: 'Ahmad Naim',
      email: 'ahmadnaim2877@gmail.com',
      phone: '08012345678',
      role: 'customer',
      status: 'active',
      walletBalance: 0,
      totalSavings: 0,
      referralEarnings: 0,
      totalTransactionsCount: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await dispatchVTUNaijaPurchase({
      serviceType: params.serviceType as any,
      amount: params.amount,
      providerCost: params.providerCost,
      recipient: params.recipient,
      network: params.network as NetworkType | undefined,
      planName: params.planName,
      metadata: params.metadata,
      user: targetUser,
    });

    return {
      success: result.status,
      providerReference: result.reference,
      token: result.token,
      error: result.status ? undefined : result.message,
      httpCode: result.http_code,
    };
  }
}

export {
  dispatchVTUPurchase,
  dispatchVTUNaijaPurchase,
  getFirestoreVTUConfig,
  saveFirestoreVTUConfig,
  getFirestoreNCWalletConfig,
  saveFirestoreNCWalletConfig,
  getFirestoreServiceRouting,
  saveFirestoreServiceRouting,
  recordUserInFirestore,
  deleteUserFromFirestore,
  saveFirestorePlatformSettings,
  saveFirestoreManualFundingConfig,
  recordManualFundingRequestInFirestore,
  recordDataPlanInFirestore,
  deleteDataPlanFromFirestore,
  recordAirtimeDiscountInFirestore,
  recordElectricityDiscoInFirestore,
  deleteElectricityDiscoFromFirestore,
  recordCablePackageInFirestore,
  deleteCablePackageFromFirestore,
  recordExamPinInFirestore,
  deleteExamPinFromFirestore,
  initializeFirestoreProductCatalog,
  initializeFirestoreData,
  resolveGatewayDataPlanCode,
} from './vtu-dispatcher.ts';

