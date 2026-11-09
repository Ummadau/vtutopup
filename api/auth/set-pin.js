import { updateFirestoreUser, SUPER_ADMIN_USER } from './_auth_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'] || 'usr_ahmad_01';
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  const { newPin } = body;
  if (!newPin || !/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be 4 digits (e.g. 1234)' });
  }

  try {
    await updateFirestoreUser(userId, { transactionPin: newPin, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'PIN updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update PIN' });
  }
}
