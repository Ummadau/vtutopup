import { DataPlan, ElectricityDisco, CablePackage, ExamPin } from '../types/index.ts';

export const FALLBACK_DATA_PLANS: DataPlan[] = [
  // MTN Data Plans
  { id: 'mtn_sme_500mb', planCode: '221', network: 'mtn', name: 'MTN 500MB SME', size: '500MB', validity: '30 Days', planType: 'SME', providerCost: 130, customerPrice: 150, resellerPrice: 140, isActive: true },
  { id: 'mtn_sme_1gb', planCode: '222', network: 'mtn', name: 'MTN 1GB SME', size: '1GB', validity: '30 Days', planType: 'SME', providerCost: 250, customerPrice: 290, resellerPrice: 275, isActive: true },
  { id: 'mtn_sme_2gb', planCode: '223', network: 'mtn', name: 'MTN 2GB SME', size: '2GB', validity: '30 Days', planType: 'SME', providerCost: 500, customerPrice: 580, resellerPrice: 550, isActive: true },
  { id: 'mtn_sme_3gb', planCode: '224', network: 'mtn', name: 'MTN 3GB SME', size: '3GB', validity: '30 Days', planType: 'SME', providerCost: 750, customerPrice: 870, resellerPrice: 825, isActive: true },
  { id: 'mtn_sme_5gb', planCode: '225', network: 'mtn', name: 'MTN 5GB SME', size: '5GB', validity: '30 Days', planType: 'SME', providerCost: 1250, customerPrice: 1450, resellerPrice: 1375, isActive: true },
  { id: 'mtn_sme_10gb', planCode: '226', network: 'mtn', name: 'MTN 10GB SME', size: '10GB', validity: '30 Days', planType: 'SME', providerCost: 2500, customerPrice: 2900, resellerPrice: 2750, isActive: true },

  // GLO Data Plans
  { id: 'glo_corp_1gb', planCode: '301', network: 'glo', name: 'GLO 1GB Corporate', size: '1GB', validity: '30 Days', planType: 'Corporate', providerCost: 240, customerPrice: 280, resellerPrice: 265, isActive: true },
  { id: 'glo_corp_2gb', planCode: '302', network: 'glo', name: 'GLO 2GB Corporate', size: '2GB', validity: '30 Days', planType: 'Corporate', providerCost: 480, customerPrice: 560, resellerPrice: 530, isActive: true },
  { id: 'glo_corp_3gb', planCode: '303', network: 'glo', name: 'GLO 3GB Corporate', size: '3GB', validity: '30 Days', planType: 'Corporate', providerCost: 720, customerPrice: 840, resellerPrice: 795, isActive: true },
  { id: 'glo_corp_5gb', planCode: '305', network: 'glo', name: 'GLO 5GB Corporate', size: '5GB', validity: '30 Days', planType: 'Corporate', providerCost: 1200, customerPrice: 1400, resellerPrice: 1325, isActive: true },
  { id: 'glo_corp_10gb', planCode: '310', network: 'glo', name: 'GLO 10GB Corporate', size: '10GB', validity: '30 Days', planType: 'Corporate', providerCost: 2400, customerPrice: 2800, resellerPrice: 2650, isActive: true },

  // Airtel Data Plans
  { id: 'airtel_cg_1gb', planCode: '401', network: 'airtel', name: 'Airtel 1GB Corporate Gifting', size: '1GB', validity: '30 Days', planType: 'Gifting', providerCost: 255, customerPrice: 295, resellerPrice: 280, isActive: true },
  { id: 'airtel_cg_2gb', planCode: '402', network: 'airtel', name: 'Airtel 2GB Corporate Gifting', size: '2GB', validity: '30 Days', planType: 'Gifting', providerCost: 510, customerPrice: 590, resellerPrice: 560, isActive: true },
  { id: 'airtel_cg_5gb', planCode: '405', network: 'airtel', name: 'Airtel 5GB Corporate Gifting', size: '5GB', validity: '30 Days', planType: 'Gifting', providerCost: 1275, customerPrice: 1475, resellerPrice: 1400, isActive: true },
  { id: 'airtel_cg_10gb', planCode: '410', network: 'airtel', name: 'Airtel 10GB Corporate Gifting', size: '10GB', validity: '30 Days', planType: 'Gifting', providerCost: 2550, customerPrice: 2950, resellerPrice: 2800, isActive: true },

  // 9Mobile Data Plans
  { id: 'nine_sme_1gb', planCode: '501', network: '9mobile', name: '9Mobile 1GB SME', size: '1GB', validity: '30 Days', planType: 'SME', providerCost: 220, customerPrice: 260, resellerPrice: 245, isActive: true },
  { id: 'nine_sme_2gb', planCode: '502', network: '9mobile', name: '9Mobile 2GB SME', size: '2GB', validity: '30 Days', planType: 'SME', providerCost: 440, customerPrice: 520, resellerPrice: 490, isActive: true },
  { id: 'nine_sme_5gb', planCode: '505', network: '9mobile', name: '9Mobile 5GB SME', size: '5GB', validity: '30 Days', planType: 'SME', providerCost: 1100, customerPrice: 1300, resellerPrice: 1225, isActive: true },
  { id: 'nine_sme_10gb', planCode: '510', network: '9mobile', name: '9Mobile 10GB SME', size: '10GB', validity: '30 Days', planType: 'SME', providerCost: 2200, customerPrice: 2600, resellerPrice: 2450, isActive: true },
];

export const FALLBACK_DISCOS: ElectricityDisco[] = [
  { id: 'ikedc', code: 'IKEDC', name: 'Ikeja Electric (IKEDC)', shortName: 'Ikeja Electric', serviceFee: 100, isActive: true },
  { id: 'ekedc', code: 'EKEDC', name: 'Eko Electricity (EKEDC)', shortName: 'Eko Electric', serviceFee: 100, isActive: true },
  { id: 'aedc', code: 'AEDC', name: 'Abuja Electricity (AEDC)', shortName: 'Abuja Electric', serviceFee: 100, isActive: true },
  { id: 'ibedc', code: 'IBEDC', name: 'Ibadan Electricity (IBEDC)', shortName: 'Ibadan Electric', serviceFee: 100, isActive: true },
  { id: 'kedco', code: 'KEDCO', name: 'Kano Electricity (KEDCO)', shortName: 'Kano Electric', serviceFee: 100, isActive: true },
  { id: 'phedc', code: 'PHEDC', name: 'Port Harcourt Electric (PHEDC)', shortName: 'PH Electric', serviceFee: 100, isActive: true },
  { id: 'kaedco', code: 'KAEDCO', name: 'Kaduna Electric (KAEDCO)', shortName: 'Kaduna Electric', serviceFee: 100, isActive: true },
  { id: 'jedc', code: 'JEDC', name: 'Jos Electricity (JEDC)', shortName: 'Jos Electric', serviceFee: 100, isActive: true },
];

export const FALLBACK_CABLE_PACKAGES: CablePackage[] = [
  { id: 'dstv_padi', provider: 'dstv', name: 'DSTV Padi', code: 'dstv-padi', price: 3600, providerCost: 3500, isActive: true },
  { id: 'dstv_yanga', provider: 'dstv', name: 'DSTV Yanga', code: 'dstv-yanga', price: 5100, providerCost: 4950, isActive: true },
  { id: 'dstv_confam', provider: 'dstv', name: 'DSTV Confam', code: 'dstv-confam', price: 9300, providerCost: 9100, isActive: true },
  { id: 'dstv_compact', provider: 'dstv', name: 'DSTV Compact', code: 'dstv-compact', price: 15700, providerCost: 15400, isActive: true },
  { id: 'gotv_smallie', provider: 'gotv', name: 'GOtv Smallie', code: 'gotv-smallie', price: 1570, providerCost: 1500, isActive: true },
  { id: 'gotv_jinja', provider: 'gotv', name: 'GOtv Jinja', code: 'gotv-jinja', price: 3300, providerCost: 3200, isActive: true },
  { id: 'gotv_jolli', provider: 'gotv', name: 'GOtv Jolli', code: 'gotv-jolli', price: 4850, providerCost: 4700, isActive: true },
  { id: 'gotv_max', provider: 'gotv', name: 'GOtv Max', code: 'gotv-max', price: 7200, providerCost: 7000, isActive: true },
  { id: 'gotv_supa', provider: 'gotv', name: 'GOtv Supa', code: 'gotv-supa', price: 9600, providerCost: 9350, isActive: true },
  { id: 'startimes_nova', provider: 'startimes', name: 'StarTimes Nova', code: 'st-nova', price: 1500, providerCost: 1400, isActive: true },
  { id: 'startimes_basic', provider: 'startimes', name: 'StarTimes Basic', code: 'st-basic', price: 3300, providerCost: 3150, isActive: true },
  { id: 'startimes_smart', provider: 'startimes', name: 'StarTimes Smart', code: 'st-smart', price: 4700, providerCost: 4500, isActive: true },
  { id: 'startimes_super', provider: 'startimes', name: 'StarTimes Classic / Super', code: 'st-super', price: 7000, providerCost: 6750, isActive: true },
];

export const FALLBACK_EXAM_PINS: ExamPin[] = [
  { id: 'waec_pin', exam: 'WAEC', name: 'WAEC Result Checker PIN', code: 'waec', price: 3800, providerCost: 3600, stockAvailable: 99, isActive: true },
  { id: 'neco_pin', exam: 'NECO', name: 'NECO Result Token', code: 'neco', price: 1200, providerCost: 1050, stockAvailable: 99, isActive: true },
  { id: 'jamb_pin', exam: 'JAMB', name: 'JAMB UTME Profile / UTME Pin', code: 'jamb', price: 7200, providerCost: 7000, stockAvailable: 99, isActive: true },
  { id: 'nabteb_pin', exam: 'NABTEB', name: 'NABTEB Result Checker Pin', code: 'nabteb', price: 1500, providerCost: 1350, stockAvailable: 99, isActive: true },
];
