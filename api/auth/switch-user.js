import { SUPER_ADMIN_USER, findUserByIdentifier } from './_auth_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  const role = body.role || 'customer';

  if (role === 'admin') {
    return res.status(200).json({ success: true, user: SUPER_ADMIN_USER });
  }

  if (role === 'reseller') {
    const resellerUser = {
      id: 'usr_reseller_01',
      name: 'Bello Danladi (VIP Reseller)',
      email: 'bello.reseller@gmail.com',
      phone: '08033333333',
      role: 'reseller',
      status: 'active',
      isVerified: true,
      referralCode: 'BELLORES99',
      walletBalance: 45000,
      totalSavings: 12500,
      referralEarnings: 8200,
      totalTransactionsCount: 142,
      transactionPin: '1234',
      createdAt: '2026-01-10T10:00:00Z',
    };
    return res.status(200).json({ success: true, user: resellerUser });
  }

  // Customer: load ahmad naim
  const ahmad = await findUserByIdentifier('ahmadnaim2877@gmail.com') || {
    id: 'usr_ahmad_01',
    name: 'Ahmad Naim',
    email: 'ahmadnaim2877@gmail.com',
    phone: '08012345678',
    role: 'customer',
    status: 'active',
    isVerified: true,
    referralCode: 'NAEEM88',
    walletBalance: 9972,
    totalSavings: 8352,
    referralEarnings: 1200,
    totalTransactionsCount: 44,
    transactionPin: '1234',
    createdAt: '2026-01-15T10:00:00Z',
  };

  return res.status(200).json({ success: true, user: ahmad });
}
