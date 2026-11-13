import {
  findUserByIdentifier,
  createFirestoreUser,
  extractBearerToken,
  normalizePhone,
  hashPassword,
  sanitizeUser,
} from './_auth_helpers.js';

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

    const { name, phone, email, password, referralCode, uid } = body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields including password' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userToken = extractBearerToken(req);
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);

    // Check if user already exists
    const existing =
      (await findUserByIdentifier(cleanEmail, userToken)) ||
      (await findUserByIdentifier(cleanPhone, userToken));
    if (existing) {
      return res.status(400).json({ error: 'An account with this email or phone number already exists' });
    }

    const safeUid =
      typeof uid === 'string' && /^[a-zA-Z0-9_-]{6,128}$/.test(uid)
        ? uid
        : `usr_${Date.now()}`;
    const generatedRefCode =
      String(name).replace(/\s+/g, '').slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);

    const newUser = {
      id: safeUid,
      name: String(name).trim(),
      email: cleanEmail,
      phone: cleanPhone || String(phone).trim(),
      passwordHash: hashPassword(password),
      role: cleanEmail === 'naeemummadau@gmail.com' || cleanEmail === 'ahmadnaim2877@gmail.com' ? 'admin' : 'customer',
      status: 'active',
      isVerified: true,
      referralCode: generatedRefCode,
      referredBy: referralCode ? String(referralCode).trim() : null,
      walletBalance: 0,
      totalSavings: 0,
      referralEarnings: 0,
      totalTransactionsCount: 0,
      transactionPin: '1234',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      virtualAccounts: [],
    };

    const writeResult = await createFirestoreUser(newUser, userToken);
    if (!writeResult.ok) {
      return res.status(503).json({
        error:
          writeResult.status === 403
            ? 'Database permission denied: configure FIREBASE_SERVICE_ACCOUNT_KEY in Vercel Environment Variables or sign in with Google.'
            : `Unable to save account to database: ${writeResult.error || 'Firestore write failed'}`,
      });
    }

    return res.status(200).json({ success: true, user: sanitizeUser(newUser) });
  } catch (err) {
    console.error('Register API Error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
}
