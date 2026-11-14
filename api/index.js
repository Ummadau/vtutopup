// Master Vercel Serverless Function & API Router
import { handleUnityBillsWebhookRequest } from './_webhook_handler.js';
import healthHandler from './_routes/health.js';
import { handleAdminRoutes, handleResellerStats, handleUserReferrals } from './_routes/admin.js';
import loginHandler from './_routes/auth/login.js';
import registerHandler from './_routes/auth/register.js';
import pinLoginHandler from './_routes/auth/pin-login.js';
import otpLoginHandler from './_routes/auth/otp-login.js';
import switchUserHandler from './_routes/auth/switch-user.js';
import setPinHandler from './_routes/auth/set-pin.js';
import meHandler from './_routes/auth/me.js';
import generateVirtualAccountHandler from './_routes/wallet/virtual-account/generate.js';
import getVirtualAccountHandler from './_routes/wallet/virtual-account.js';
import manualFundConfigHandler from './_routes/wallet/manual-fund/config.js';
import manualFundSubmitHandler from './_routes/wallet/manual-fund/submit.js';
import walletSummaryHandler from './_routes/wallet/summary.js';
import transactionsHandler from './_routes/transactions.js';
import notificationsHandler from './_routes/notifications.js';
import {
  handleDataPlans,
  handleAirtimeDiscounts,
  handleDetectNetwork,
  handleElectricityDiscos,
  handleCablePackages,
  handleExamPins,
  handleSettings,
} from './_routes/services/catalog.js';
import {
  handleDataPurchase,
  handleAirtimePurchase,
  handleVerifyMeter,
  handleVerifyCable,
  handleElectricityPurchase,
  handleCablePurchase,
  handleExamPurchase,
  handleWalletFundInitiate,
  handleWalletFundVerify,
  handleSupportTickets,
} from './_routes/services/purchase_handler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const url = (req.url || '').split('?')[0];

  // 0. Health Check
  if (url === '/api/health' || url === '/api/firebase-health') {
    return healthHandler(req, res);
  }

  // 1. Webhook endpoints
  if (
    url.includes('/webhooks/unitybills') ||
    url.includes('/unitybills/webhook') ||
    url.includes('/hooks/deposits') ||
    url.includes('/webhooks/billstack')
  ) {
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
  if (url.includes('/wallet/fund/initiate')) return handleWalletFundInitiate(req, res);
  if (url.includes('/wallet/fund/verify')) return handleWalletFundVerify(req, res);
  if (url.includes('/wallet/summary')) return walletSummaryHandler(req, res);

  // 4. Purchases & Verifications
  if (url.includes('/services/data/purchase')) return handleDataPurchase(req, res);
  if (url.includes('/services/airtime/purchase')) return handleAirtimePurchase(req, res);
  if (url.includes('/services/electricity/verify-meter')) return handleVerifyMeter(req, res);
  if (url.includes('/services/electricity/purchase')) return handleElectricityPurchase(req, res);
  if (url.includes('/services/cable/verify-card')) return handleVerifyCable(req, res);
  if (url.includes('/services/cable/purchase')) return handleCablePurchase(req, res);
  if (url.includes('/services/exam/purchase')) return handleExamPurchase(req, res);

  // 5. Product Services & Catalogs
  if (url.includes('/services/data/plans')) return handleDataPlans(req, res);
  if (url.includes('/services/airtime/discounts')) return handleAirtimeDiscounts(req, res);
  if (url.includes('/services/detect-network')) return handleDetectNetwork(req, res);
  if (url.includes('/services/electricity/discos')) return handleElectricityDiscos(req, res);
  if (url.includes('/services/cable/packages')) return handleCablePackages(req, res);
  if (url.includes('/services/exam/pins')) return handleExamPins(req, res);
  if (url.includes('/settings')) {
    if (req.method === 'PUT') return handleAdminRoutes(req, res);
    return handleSettings(req, res);
  }

  // 6. User, Reseller, Admin & Activity endpoints
  if (url.includes('/user/referrals')) return handleUserReferrals(req, res);
  if (url.includes('/reseller/stats')) return handleResellerStats(req, res);
  if (url.includes('/admin/')) return handleAdminRoutes(req, res);
  if (url.includes('/support/tickets')) {
    if (req.method === 'PUT' && url.includes('/status')) {
      return handleAdminRoutes(req, res);
    }
    return handleSupportTickets(req, res);
  }
  if (url.includes('/transactions')) return transactionsHandler(req, res);
  if (url.includes('/notifications')) return notificationsHandler(req, res);

  // 7. Default 404 JSON response for unhandled routes
  return res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    url: req.url,
    method: req.method,
  });
}
