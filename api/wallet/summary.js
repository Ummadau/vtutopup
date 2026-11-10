// Vercel Serverless Function - Wallet Summary
import { unwrapFirestoreDoc } from '../auth/_auth_helpers.js';

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0376919977/databases/ai-studio-naeemdatasub-8bb16184-21be-4bcb-bf84-6a9163fbd9db/documents';
const FIRESTORE_KEY = 'AIzaSyBqaJeymaKiXVij6eypZQJFgK2dOH5CoTA';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'] || req.headers['authorization'];
  let balance = 0;
  let totalSavings = 0;
  let referralEarnings = 0;
  let totalTransactionsCount = 0;

  if (userId) {
    try {
      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(userId)}?key=${FIRESTORE_KEY}`;
      const fRes = await fetch(url);
      if (fRes.ok) {
        const doc = await fRes.json();
        const user = unwrapFirestoreDoc(doc);
        if (user) {
          balance = Number(user.walletBalance || 0);
          totalSavings = Number(user.totalSavings || 0);
          referralEarnings = Number(user.referralEarnings || 0);
          totalTransactionsCount = Number(user.totalTransactionsCount || 0);
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
    userId: userId || null,
  });
}
