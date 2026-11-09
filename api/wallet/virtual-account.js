// Vercel Serverless Function: Get Virtual Accounts
import { findUserByIdentifier } from '../auth/_auth_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'] || 'usr_ahmad_01';
  try {
    const user = await findUserByIdentifier(userId);
    const virtualAccounts = (user && Array.isArray(user.virtualAccounts)) ? user.virtualAccounts : [];
    return res.status(200).json({ success: true, virtualAccounts });
  } catch (err) {
    return res.status(200).json({ success: true, virtualAccounts: [] });
  }
}
