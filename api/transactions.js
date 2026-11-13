// Vercel Serverless Function - User & Admin Transactions
import { extractBearerToken, fsRunQuery } from './_firestore.js';
import { findUserByIdentifier, verifyFirebaseIdToken } from './auth/_auth_helpers.js';

const ADMIN_EMAILS = ['naeemummadau@gmail.com', 'ahmadnaim2877@gmail.com'];

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
    const verified = userToken ? await verifyFirebaseIdToken(userToken).catch(() => null) : null;
    const lookupId = verified?.uid || userId || verified?.email;
    const user = lookupId ? await findUserByIdentifier(lookupId, userToken).catch(() => null) : null;
    const isAdmin =
      Boolean(user && user.role === 'admin') ||
      Boolean(verified?.email && ADMIN_EMAILS.includes(verified.email.toLowerCase()));

    const effectiveUserId = String(user?.id || userId || verified?.uid || '');
    const filters = isAdmin || !effectiveUserId ? [] : [{ field: 'userId', value: effectiveUserId }];
    const qRes = await fsRunQuery('transactions', filters, 200, userToken);
    if (qRes.ok && Array.isArray(qRes.documents)) {
      transactions = qRes.documents;
      if (!isAdmin && effectiveUserId) {
        transactions = transactions.filter(t => t.userId === effectiveUserId);
      }

      const urlObj = new URL(req.url || '/api/transactions', 'http://localhost');
      const status = urlObj.searchParams.get('status');
      const service = urlObj.searchParams.get('service');
      const search = urlObj.searchParams.get('search');

      if (status && status !== 'all') {
        transactions = transactions.filter(t => (t.status || '').toLowerCase() === status.toLowerCase());
      }
      if (service && service !== 'all') {
        transactions = transactions.filter(t => (t.serviceType || '').toLowerCase() === service.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        transactions = transactions.filter(
          t =>
            (t.reference || '').toLowerCase().includes(q) ||
            (t.recipient || '').toLowerCase().includes(q) ||
            (t.userName || '').toLowerCase().includes(q) ||
            (t.planName || '').toLowerCase().includes(q)
        );
      }

      transactions.sort(
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

