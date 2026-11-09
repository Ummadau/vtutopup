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

  // 4. Default Safe JSON fallback for any unhandled endpoint
  return res.status(200).json({
    success: true,
    status: 'active',
    message: 'NAEEM DATA SUB Vercel Serverless API Service',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}
