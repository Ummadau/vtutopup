import {
  findUserByIdentifier,
  createFirestoreUser,
  verifyPassword,
  verifyFirebaseIdToken,
  verifyFirebasePassword,
  extractBearerToken,
  sanitizeUser,
  SUPER_ADMIN_USER,
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

    const { identifier, password, idToken } = body;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }
    if (!password && !idToken) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (password === 'google_oauth_authenticated' && !idToken) {
      return res.status(401).json({ error: 'Valid Google ID token is required' });
    }

    const clean = String(identifier).trim().toLowerCase();
    let userToken = idToken || extractBearerToken(req);

    // Verify Google / Firebase ID token if supplied
    let verifiedToken = null;
    if (idToken) {
      verifiedToken = await verifyFirebaseIdToken(idToken);
      if (!verifiedToken || verifiedToken.email !== clean) {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
      }
    }

    // 1. Super Admin check
    if (clean === 'naeemummadau@gmail.com' || clean === '08000000001') {
      const adminSecret = process.env.ADMIN_DEFAULT_PASSWORD || 'naeem1234';
      const isGoogleAdmin = verifiedToken && verifiedToken.email === 'naeemummadau@gmail.com';
      if (isGoogleAdmin || password === adminSecret) {
        const liveAdmin = await findUserByIdentifier('usr_admin_01', userToken);
        return res.status(200).json({ success: true, user: sanitizeUser(liveAdmin || SUPER_ADMIN_USER) });
      }
      return res.status(401).json({ error: 'Incorrect administrator password' });
    }

    // 2. Find in Firestore (using service account or Firebase ID token)
    let user = await findUserByIdentifier(clean, userToken);
    if (!user && verifiedToken?.uid) {
      user = await findUserByIdentifier(verifiedToken.uid, userToken);
    }

    // 3. Google verified user creation if first-time login
    if (!user) {
      if (verifiedToken) {
        const newId = verifiedToken.uid || `usr_${Date.now()}`;
        user = {
          id: newId,
          name: verifiedToken.displayName || clean.split('@')[0],
          email: verifiedToken.email,
          phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
          role: verifiedToken.email === 'ahmadnaim2877@gmail.com' ? 'admin' : 'customer',
          status: 'active',
          isVerified: true,
          referralCode: 'REF' + Math.floor(1000 + Math.random() * 9000),
          walletBalance: 0,
          totalSavings: 0,
          referralEarnings: 0,
          totalTransactionsCount: 0,
          transactionPin: '1234',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          virtualAccounts: [],
        };
        await createFirestoreUser(user, userToken);
        return res.status(200).json({ success: true, user: sanitizeUser(user) });
      }
      return res.status(404).json({ error: 'No account found with this email or phone number. Please register or sign in with Google.' });
    }

    // 4. Verify password for non-token logins
    if (!verifiedToken) {
      if (user.passwordHash) {
        if (!verifyPassword(password, user.passwordHash)) {
          return res.status(401).json({ error: 'Incorrect password' });
        }
      } else if (user.email) {
        const fbCheck = await verifyFirebasePassword(user.email, password);
        if (!fbCheck || !fbCheck.ok) {
          return res.status(401).json({ error: 'Incorrect password' });
        }
      } else {
        return res.status(401).json({ error: 'Incorrect credentials' });
      }
    }

    return res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login API Error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
}
