// Master Vercel Serverless Function & API Router
import { handleUnityBillsWebhookRequest } from './_webhook_handler.js';
import loginHandler from './auth/login.js';
import registerHandler from './auth/register.js';
import pinLoginHandler from './auth/pin-login.js';
import otpLoginHandler from './auth/otp-login.js';
import switchUserHandler from './auth/switch-user.js';
import setPinHandler from './auth/set-pin.js';
import meHandler from './auth/me.js';
import generateVirtualAccountHandler from './wallet/virtual-account/generate.js';
import getVirtualAccountHandler from './wallet/virtual-account.js';
import manualFundConfigHandler from './wallet/manual-fund/config.js';
import manualFundSubmitHandler from './wallet/manual-fund/submit.js';
import walletSummaryHandler from './wallet/summary.js';
import transactionsHandler from './transactions.js';
import notificationsHandler from './notifications.js';
import {
  handleDataPlans,
  handleAirtimeDiscounts,
  handleDetectNetwork,
  handleElectricityDiscos,
  handleCablePackages,
  handleExamPins,
  handleSettings,
} from './services/catalog.js';
import {
  handleDataPurchase,
  handleAirtimePurchase,
  handleVerifyMeter,
  handleVerifyCable,
} from './services/purchase_handler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const url = req.url || '';

  // 1. Webhook endpoints
  if (url.includes('/webhooks/unitybills') || url.includes('/hooks/deposits')) {
    return handleUnityBillsWebhookRequest(req, res);
  }

  // 2. Auth endpoints
  if (url.includes('/auth/login')) return loginHandler(req, res);
  if (url.includes('/auth/register')) return registerHandler(req, res);
  if (url.includes('/auth/pin-login')) return pinLoginHandler(req, res);
  if (url.includes('/auth/otp-login')) return otpLoginHandler(req, res);
  if (url.includes('/auth/switch-user')) return switchUserHandler(req, res);
  if (url.includes('/auth/set-pin')) return setPinHandler(req, res);
  if (url.includes('/auth/me')) return meHandler(req, res);

  // 3. Wallet & Virtual Account endpoints
  if (url.includes('/wallet/virtual-account/generate')) return generateVirtualAccountHandler(req, res);
  if (url.includes('/wallet/virtual-account')) return getVirtualAccountHandler(req, res);
  if (url.includes('/wallet/manual-fund/config')) return manualFundConfigHandler(req, res);
  if (url.includes('/wallet/manual-fund/submit')) return manualFundSubmitHandler(req, res);
  if (url.includes('/wallet/summary')) return walletSummaryHandler(req, res);

  // 4. Purchases & Verifications
  if (url.includes('/services/data/purchase')) return handleDataPurchase(req, res);
  if (url.includes('/services/airtime/purchase')) return handleAirtimePurchase(req, res);
  if (url.includes('/services/electricity/verify-meter')) return handleVerifyMeter(req, res);
  if (url.includes('/services/cable/verify-card')) return handleVerifyCable(req, res);

  // 5. Product Services & Catalogs
  if (url.includes('/services/data/plans')) return handleDataPlans(req, res);
  if (url.includes('/services/airtime/discounts')) return handleAirtimeDiscounts(req, res);
  if (url.includes('/services/detect-network')) return handleDetectNetwork(req, res);
  if (url.includes('/services/electricity/discos')) return handleElectricityDiscos(req, res);
  if (url.includes('/services/cable/packages')) return handleCablePackages(req, res);
  if (url.includes('/services/exam/pins')) return handleExamPins(req, res);
  if (url.includes('/settings')) return handleSettings(req, res);

  // 6. Activity data endpoints (transactions, notifications)
  if (url.includes('/transactions')) return transactionsHandler(req, res);
  if (url.includes('/notifications')) return notificationsHandler(req, res);

  // 7. Default Safe JSON fallback for any unhandled endpoint
  return res.status(200).json({
    success: true,
    status: 'active',
    message: 'NAEEM DATA SUB Vercel Serverless API Service',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}
