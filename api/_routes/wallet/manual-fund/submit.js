// Vercel Serverless Function: Submit Manual Funding Request
import { extractBearerToken, fsCreateDoc } from '../../_firestore.js';

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

    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userToken = extractBearerToken(req);
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

    const writeRes = await fsCreateDoc('manual_funding_requests', reqId, newRequest, userToken);
    if (!writeRes.ok) {
      return res.status(503).json({ error: `Unable to save manual funding request: ${writeRes.error || 'Permission denied'}` });
    }

    return res.status(200).json({ success: true, request: newRequest });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to submit request' });
  }
}
