// Vercel Serverless Function - Live Firestore + Fallback Catalog Provider
import fs from 'fs';
import path from 'path';
import { extractBearerToken, fsGetDoc, fsRunQuery } from '../_firestore.js';

let catalogCache = null;

function loadCatalog() {
  if (catalogCache) return catalogCache;
  try {
    const dbPath = path.resolve(process.cwd(), 'server', 'persisted_db.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      catalogCache = JSON.parse(raw);
      return catalogCache;
    }
  } catch (err) {
    console.warn('Could not load persisted_db.json, using defaults:', err.message);
  }

  catalogCache = {
    dataPlans: [
      { id: 'mtn_sme_500mb', name: 'MTN SME Data', network: 'mtn', size: '500MB', validity: '30 Days', customerPrice: 170, resellerPrice: 155, planType: 'SME', isActive: true, plan_id: '304', planCode: '304' },
      { id: 'mtn_sme_1gb', name: 'MTN SME Data', network: 'mtn', size: '1GB', validity: '30 Days', customerPrice: 295, resellerPrice: 280, planType: 'SME', isActive: true, plan_id: '121', planCode: '121' },
      { id: 'mtn_sme_2gb', name: 'MTN SME Data', network: 'mtn', size: '2GB', validity: '30 Days', customerPrice: 590, resellerPrice: 560, planType: 'SME', isActive: true, plan_id: '122', planCode: '122' },
      { id: 'mtn_sme_3gb', name: 'MTN SME Data', network: 'mtn', size: '3GB', validity: '30 Days', customerPrice: 885, resellerPrice: 840, planType: 'SME', isActive: true, plan_id: '123', planCode: '123' },
      { id: 'mtn_sme_5gb', name: 'MTN SME Data', network: 'mtn', size: '5GB', validity: '30 Days', customerPrice: 1475, resellerPrice: 1400, planType: 'SME', isActive: true, plan_id: '124', planCode: '124' },
      { id: 'mtn_sme_10gb', name: 'MTN SME Data', network: 'mtn', size: '10GB', validity: '30 Days', customerPrice: 2950, resellerPrice: 2800, planType: 'SME', isActive: true, plan_id: '13', planCode: '13' },
      { id: 'airtel_cg_1gb', name: 'Airtel CG Data', network: 'airtel', size: '1GB', validity: '30 Days', customerPrice: 310, resellerPrice: 295, planType: 'Corporate', isActive: true, plan_id: '29', planCode: '29' },
      { id: 'airtel_cg_2gb', name: 'Airtel CG Data', network: 'airtel', size: '2GB', validity: '30 Days', customerPrice: 620, resellerPrice: 590, planType: 'Corporate', isActive: true, plan_id: '30', planCode: '30' },
      { id: 'airtel_cg_5gb', name: 'Airtel CG Data', network: 'airtel', size: '5GB', validity: '30 Days', customerPrice: 1550, resellerPrice: 1475, planType: 'Corporate', isActive: true, plan_id: '32', planCode: '32' },
      { id: 'glo_cg_1gb', name: 'Glo CG Data', network: 'glo', size: '1GB', validity: '30 Days', customerPrice: 280, resellerPrice: 265, planType: 'Corporate', isActive: true, plan_id: '21', planCode: '21' },
      { id: 'glo_cg_2gb', name: 'Glo CG Data', network: 'glo', size: '2GB', validity: '30 Days', customerPrice: 560, resellerPrice: 530, planType: 'Corporate', isActive: true, plan_id: '24', planCode: '24' },
      { id: '9mobile_sme_1gb', name: '9Mobile SME Data', network: '9mobile', size: '1GB', validity: '30 Days', customerPrice: 250, resellerPrice: 230, planType: 'SME', isActive: true, plan_id: '491', planCode: '491' },
    ],
    airtimeDiscounts: [
      { network: 'mtn', discountPercentage: 2.5, resellerDiscountPercentage: 3.5, isActive: true },
      { network: 'airtel', discountPercentage: 2.0, resellerDiscountPercentage: 3.0, isActive: true },
      { network: 'glo', discountPercentage: 4.0, resellerDiscountPercentage: 5.5, isActive: true },
      { network: '9mobile', discountPercentage: 4.5, resellerDiscountPercentage: 6.0, isActive: true },
    ],
    electricityDiscos: [
      { id: 'ikeja', name: 'Ikeja Electric (IKEDC)', code: 'IKEDC', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
      { id: 'eko', name: 'Eko Electricity (EKEDC)', code: 'EKEDC', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
      { id: 'abuja', name: 'Abuja Electricity (AEDC)', code: 'AEDC', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
      { id: 'kano', name: 'Kano Electricity (KEDCO)', code: 'KEDCO', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
      { id: 'ibadan', name: 'Ibadan Electricity (IBEDC)', code: 'IBEDC', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
      { id: 'portharcourt', name: 'Port Harcourt Electric (PHEDC)', code: 'PHEDC', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
      { id: 'jos', name: 'Jos Electricity (JEDC)', code: 'JEDC', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
      { id: 'kaduna', name: 'Kaduna Electricity (KAEDCO)', code: 'KAEDCO', minAmount: 500, maxAmount: 100000, fee: 100, isActive: true },
    ],
    cablePackages: [
      { id: 'dstv_padi', provider: 'dstv', name: 'DStv Padi', price: 4400, fee: 50, isActive: true },
      { id: 'dstv_yanga', provider: 'dstv', name: 'DStv Yanga', price: 6000, fee: 50, isActive: true },
      { id: 'dstv_confam', provider: 'dstv', name: 'DStv Confam', price: 11000, fee: 50, isActive: true },
      { id: 'gotv_smallie', provider: 'gotv', name: 'GOtv Smallie', price: 1900, fee: 50, isActive: true },
      { id: 'gotv_jinja', provider: 'gotv', name: 'GOtv Jinja', price: 3900, fee: 50, isActive: true },
      { id: 'gotv_jolli', provider: 'gotv', name: 'GOtv Jolli', price: 5800, fee: 50, isActive: true },
      { id: 'gotv_max', provider: 'gotv', name: 'GOtv Max', price: 8500, fee: 50, isActive: true },
      { id: 'startimes_nova', provider: 'startimes', name: 'StarTimes Nova', price: 2100, fee: 50, isActive: true },
      { id: 'startimes_basic', provider: 'startimes', name: 'StarTimes Basic', price: 3700, fee: 50, isActive: true },
      { id: 'startimes_classic', provider: 'startimes', name: 'StarTimes Classic', price: 5500, fee: 50, isActive: true },
    ],
    examPins: [
      { id: 'waec', examType: 'WAEC', name: 'WAEC Scratch Card / Result Checker', price: 3800, quantityAvailable: 250, isActive: true },
      { id: 'neco', examType: 'NECO', name: 'NECO Result Token', price: 1600, quantityAvailable: 400, isActive: true },
      { id: 'nabteb', examType: 'NABTEB', name: 'NABTEB Result Checker Pin', price: 1500, quantityAvailable: 150, isActive: true },
    ],
    settings: {
      platformName: 'NPay',
      siteName: 'NPay',
      supportEmail: 'naeemummadau@gmail.com',
      supportPhone: '+2348069417241',
      whatsappSupport: '+2348069417241',
      resellerUpgradeFee: 3000,
      referralBonus: 500,
      minWalletFund: 100,
      maxWalletFund: 500000,
      maintenanceMode: false,
    },
  };

  return catalogCache;
}

export function detectNetwork(phone) {
  const clean = (phone || '').replace(/\D/g, '');
  let prefix = clean;
  if (clean.startsWith('234')) {
    prefix = '0' + clean.slice(3, 6);
  } else if (clean.startsWith('0')) {
    prefix = clean.slice(0, 4);
  }

  const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
  const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'];
  const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
  const nineMobile = ['0809', '0817', '0818', '0909', '0908'];

  if (mtn.includes(prefix)) return 'mtn';
  if (airtel.includes(prefix)) return 'airtel';
  if (glo.includes(prefix)) return 'glo';
  if (nineMobile.includes(prefix)) return '9mobile';
  return null;
}

export async function handleDataPlans(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const network = urlObj.searchParams.get('network');
  let plans = [];

  const liveRes = await fsRunQuery('dataPlans', [], 300).catch(() => null);
  if (liveRes?.ok && liveRes.documents.length > 0) {
    plans = liveRes.documents.filter(p => p.isActive !== false);
  } else {
    plans = loadCatalog().dataPlans || [];
  }

  if (network) {
    plans = plans.filter(p => (p.network || '').toLowerCase() === network.toLowerCase());
  }
  return res.status(200).json({ success: true, plans });
}

export async function handleAirtimeDiscounts(req, res) {
  let discounts = [];
  const liveRes = await fsRunQuery('airtimeDiscounts', [], 50).catch(() => null);
  if (liveRes?.ok && liveRes.documents.length > 0) {
    discounts = liveRes.documents;
  } else {
    discounts = loadCatalog().airtimeDiscounts || [];
  }
  return res.status(200).json({ success: true, discounts });
}

export function handleDetectNetwork(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const phone = urlObj.searchParams.get('phone') || '';
  const network = detectNetwork(phone);
  return res.status(200).json({ success: true, network });
}

export async function handleElectricityDiscos(req, res) {
  let discos = [];
  const liveRes = await fsRunQuery('electricityDiscos', [], 50).catch(() => null);
  if (liveRes?.ok && liveRes.documents.length > 0) {
    discos = liveRes.documents.filter(d => d.isActive !== false);
  } else {
    discos = loadCatalog().electricityDiscos || [];
  }
  return res.status(200).json({ success: true, discos });
}

export async function handleCablePackages(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const provider = urlObj.searchParams.get('provider');
  let packages = [];

  const liveRes = await fsRunQuery('cablePackages', [], 200).catch(() => null);
  if (liveRes?.ok && liveRes.documents.length > 0) {
    packages = liveRes.documents.filter(p => p.isActive !== false);
  } else {
    packages = loadCatalog().cablePackages || [];
  }

  if (provider) {
    packages = packages.filter(p => (p.provider || '').toLowerCase() === provider.toLowerCase());
  }
  return res.status(200).json({ success: true, packages });
}

export async function handleExamPins(req, res) {
  let pins = [];
  const liveRes = await fsRunQuery('examPins', [], 50).catch(() => null);
  if (liveRes?.ok && liveRes.documents.length > 0) {
    pins = liveRes.documents.filter(p => p.isActive !== false);
  } else {
    pins = loadCatalog().examPins || [];
  }
  return res.status(200).json({ success: true, pins });
}

export async function handleSettings(req, res) {
  const userToken = extractBearerToken(req);
  const liveGeneral = await fsGetDoc('systemSettings/general', userToken).catch(() => null);
  const livePlatform = !liveGeneral?.ok ? await fsGetDoc('systemSettings/platform_settings', userToken).catch(() => null) : null;
  const settings = liveGeneral?.data || livePlatform?.data || loadCatalog().settings || {};
  return res.status(200).json({ success: true, settings });
}

export function handleWalletSummary(req, res) {
  const userId = req.headers['x-user-id'] || req.headers['authorization'];
  return res.status(200).json({
    success: true,
    balance: 0,
    totalSavings: 0,
    referralEarnings: 0,
    totalTransactionsCount: 0,
    userId: userId || null,
  });
}
