// Vercel Serverless Function - Wallet Summary
import { extractBearerToken, fsGetDoc } from '../_firestore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'];
  const userToken = extractBearerToken(req);
  let balance = 0;
  let totalSavings = 0;
  let referralEarnings = 0;
  let totalTransactionsCount = 0;
  let virtualAccounts = [];

  if (userId) {
    try {
      const userRes = await fsGetDoc(`users/${userId}`, userToken);
      if (userRes.ok && userRes.data) {
        const user = userRes.data;
        balance = Number(user.walletBalance || 0);
        totalSavings = Number(user.totalSavings || 0);
        referralEarnings = Number(user.referralEarnings || 0);
        totalTransactionsCount = Number(user.totalTransactionsCount || 0);
        if (Array.isArray(user.virtualAccounts)) {
          virtualAccounts = user.virtualAccounts;
        }
      }
    } catch (err) {
      console.warn('Error reading wallet summary from Firestore:', err);
    }
  }

  return res.status(200).json({
    success: true,
    balance,
    totalSavings,
    referralEarnings,
    totalTransactionsCount,
    virtualAccounts,
    userId: userId || null,
  });
}
