// Vercel Serverless Function: Submit Manual Funding Request
import { wrapFirestoreDoc } from '../../auth/_auth_helpers.js';

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0376919977/databases/ai-studio-naeemdatasub-8bb16184-21be-4bcb-bf84-6a9163fbd9db/documents';
const FIRESTORE_KEY = 'AIzaSyBqaJeymaKiXVij6eypZQJFgK2dOH5CoTA';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const userId = req.headers['x-user-id'] || 'usr_ahmad_01';
    const amount = Number(body.amount || 0);
    const senderName = String(body.senderName || '').trim();
    const senderBank = String(body.senderBank || '').trim();
    const paymentReference = String(body.paymentReference || '').trim();

    if (!amount || amount <= 0 || !senderName || !paymentReference) {
      return res.status(400).json({ error: 'Please enter valid amount, sender name, and payment reference' });
    }

    const reqId = `mf_${Date.now()}`;
    const newRequest = {
      id: reqId,
      userId,
      amount,
      senderName,
      senderBank,
      paymentReference,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const payload = wrapFirestoreDoc(newRequest);
    await fetch(`${FIRESTORE_BASE}/manualFundingRequests?documentId=${reqId}&key=${FIRESTORE_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({ success: true, request: newRequest });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to submit request' });
  }
}
