import { findUserByIdentifier, createFirestoreUser, normalizePhone } from './_auth_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const { name, phone, email, referralCode } = body;
    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);

    // Check if user already exists
    const existing = await findUserByIdentifier(cleanEmail) || await findUserByIdentifier(cleanPhone);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email or phone number already exists' });
    }

    const newId = `usr_${Date.now()}`;
    const generatedRefCode = name.replace(/\s+/g, '').slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);

    const newUser = {
      id: newId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: String(phone).trim(),
      role: (cleanEmail === 'naeemummadau@gmail.com' || cleanEmail === 'ahmadnaim2877@gmail.com') ? 'admin' : 'customer',
      status: 'active',
      isVerified: true,
      referralCode: generatedRefCode,
      referredBy: referralCode || null,
      walletBalance: 0,
      totalSavings: 0,
      referralEarnings: 0,
      totalTransactionsCount: 0,
      transactionPin: '1234',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      virtualAccounts: [],
    };

    await createFirestoreUser(newUser);

    return res.status(200).json({ success: true, user: newUser });
  } catch (err) {
    console.error('Register API Error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
}
