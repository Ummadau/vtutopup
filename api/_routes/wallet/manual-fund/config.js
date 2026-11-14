// Vercel Serverless Function: Manual Funding Config
import { extractBearerToken, fsGetDoc } from '../../_firestore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const defaultConfig = {
    bankName: 'Opay Digital Services',
    accountNumber: '8069417241',
    accountName: 'NAIM UMMADAU HARUNA',
    supportWhatsapp: '+2348069417241',
    instructions: 'Transfer the exact amount to the account above and enter your sender name and payment reference for instant manual approval.',
    isEnabled: true,
  };

  try {
    const userToken = extractBearerToken(req);
    const cfgRes = await fsGetDoc('settings/manual_funding', userToken);
    const sysRes = !cfgRes.ok ? await fsGetDoc('systemSettings/manual_funding_config', userToken) : null;
    const live = cfgRes.data || sysRes?.data;
    if (live) {
      defaultConfig.bankName = live.bankName || defaultConfig.bankName;
      defaultConfig.accountNumber = live.accountNumber || defaultConfig.accountNumber;
      defaultConfig.accountName = live.accountName || defaultConfig.accountName;
      defaultConfig.supportWhatsapp = live.supportWhatsapp || defaultConfig.supportWhatsapp;
      defaultConfig.instructions = live.instructions || live.instruction || defaultConfig.instructions;
    }
  } catch {}

  return res.status(200).json({ success: true, config: defaultConfig });
}
