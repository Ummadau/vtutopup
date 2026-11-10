// Vercel Serverless Function - User Transactions
import { unwrapFirestoreDoc } from './auth/_auth_helpers.js';

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0376919977/databases/ai-studio-naeemdatasub-8bb16184-21be-4bcb-bf84-6a9163fbd9db/documents';
const FIRESTORE_KEY = 'AIzaSyBqaJeymaKiXVij6eypZQJFgK2dOH5CoTA';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'] || req.headers['authorization'];
  let transactions = [];

  try {
    const url = `${FIRESTORE_BASE}/transactions?key=${FIRESTORE_KEY}&pageSize=50`;
    const fRes = await fetch(url);
    if (fRes.ok) {
      const data = await fRes.json();
      if (data.documents && Array.isArray(data.documents)) {
        transactions = data.documents.map(unwrapFirestoreDoc).filter(Boolean);
        if (userId) {
          transactions = transactions.filter(t => t.userId === userId || !t.userId);
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching transactions from Firestore:', err);
  }

  return res.status(200).json({
    success: true,
    transactions,
  });
}
