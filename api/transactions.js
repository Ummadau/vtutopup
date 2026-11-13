// Vercel Serverless Function - User Transactions
import { extractBearerToken, fsRunQuery } from './_firestore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'];
  const userToken = extractBearerToken(req);
  let transactions = [];

  if (!userId && !userToken) {
    return res.status(200).json({ success: true, transactions: [] });
  }

  try {
    const filters = userId ? [{ field: 'userId', value: String(userId) }] : [];
    const qRes = await fsRunQuery('transactions', filters, 100, userToken);
    if (qRes.ok && Array.isArray(qRes.documents)) {
      transactions = qRes.documents.sort(
        (a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
      );
    }
  } catch (err) {
    console.warn('Error fetching transactions from Firestore:', err);
  }

  return res.status(200).json({
    success: true,
    transactions,
  });
}
