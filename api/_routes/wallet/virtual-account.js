// Vercel Serverless Function: Get Virtual Accounts
import { findUserByIdentifier, extractBearerToken } from '../auth/_auth_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userToken = extractBearerToken(req);
    const user = await findUserByIdentifier(userId, userToken);
    const virtualAccounts = user && Array.isArray(user.virtualAccounts) ? user.virtualAccounts : [];
    return res.status(200).json({ success: true, virtualAccounts });
  } catch {
    return res.status(200).json({ success: true, virtualAccounts: [] });
  }
}
