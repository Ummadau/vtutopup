// Vercel Serverless Function - User Referrals, Reseller Stats & Admin Firestore Router
import {
  extractBearerToken,
  fsCreateDoc,
  fsDeleteDoc,
  fsGetDoc,
  fsPatchDoc,
  fsRunQuery,
} from './_firestore.js';
import {
  findUserByIdentifier,
  sanitizeUser,
  verifyFirebaseIdToken,
} from './auth/_auth_helpers.js';

const ADMIN_EMAILS = ['naeemummadau@gmail.com', 'ahmadnaim2877@gmail.com'];

function maskSecret(val) {
  if (!val || typeof val !== 'string') return '';
  if (val.length <= 8) return '****';
  return `${val.slice(0, 4)}****${val.slice(-4)}`;
}

async function resolveActor(req) {
  const userToken = extractBearerToken(req);
  const userId = req.headers['x-user-id'];
  let verified = null;
  if (userToken) {
    verified = await verifyFirebaseIdToken(userToken);
  }
  const lookupId = verified?.uid || userId || verified?.email;
  const user = lookupId ? await findUserByIdentifier(lookupId, userToken) : null;
  const isAdmin =
    Boolean(user && user.role === 'admin') ||
    Boolean(verified && ADMIN_EMAILS.includes(verified.email));
  return { user, userToken, isAdmin, userId: user?.id || verified?.uid || userId };
}

export async function handleUserReferrals(req, res) {
  const { user, userToken, userId } = await resolveActor(req);
  if (!user && !userId) return res.status(401).json({ error: 'Authentication required' });

  const referralCode = user?.referralCode;
  let referredUsers = [];
  if (referralCode) {
    const qRes = await fsRunQuery('users', [{ field: 'referredBy', value: referralCode }], 100, userToken);
    if (qRes.ok) {
      referredUsers = qRes.documents.map(u => ({
        id: u.id,
        name: u.name || 'Referred User',
        email: u.email || '',
        phone: u.phone || '',
        createdAt: u.createdAt || new Date().toISOString(),
        status: u.status || 'active',
        totalTransactionsCount: u.totalTransactionsCount || 0,
        commissionEarned: u.referralEarnings || 0,
      }));
    }
  }
  return res.status(200).json({ success: true, referredUsers });
}

export async function handleResellerStats(req, res) {
  const { user, userToken, userId } = await resolveActor(req);
  if (!user && !userId) return res.status(401).json({ error: 'Authentication required' });

  const qRes = await fsRunQuery('transactions', [{ field: 'userId', value: userId }], 200, userToken);
  const txs = qRes.ok ? qRes.documents : [];
  const successful = txs.filter(t => t.status === 'successful');
  const totalVolume = successful.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return res.status(200).json({
    success: true,
    stats: {
      totalTransactions: txs.length,
      successfulTransactions: successful.length,
      totalVolume,
      walletBalance: Number(user?.walletBalance || 0),
      totalSavings: Number(user?.totalSavings || 0),
    },
  });
}

export async function handleAdminRoutes(req, res) {
  const { isAdmin, userToken } = await resolveActor(req);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Administrator privileges required' });
  }

  const url = (req.url || '').split('?')[0];
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  if (url.endsWith('/admin/stats')) {
    const [uRes, tRes] = await Promise.all([
      fsRunQuery('users', [], 500, userToken),
      fsRunQuery('transactions', [], 500, userToken),
    ]);
    const users = uRes.ok ? uRes.documents : [];
    const txs = tRes.ok ? tRes.documents : [];
    const successful = txs.filter(t => t.status === 'successful');
    return res.status(200).json({
      success: true,
      totalUsers: users.length,
      totalResellers: users.filter(u => u.role === 'reseller').length,
      totalWalletLiabilities: users.reduce((s, u) => s + Number(u.walletBalance || 0), 0),
      totalSales: successful.filter(t => t.serviceType !== 'wallet_fund').reduce((s, t) => s + Number(t.amount || 0), 0),
      totalDeposits: successful.filter(t => t.serviceType === 'wallet_fund').reduce((s, t) => s + Number(t.amount || 0), 0),
      totalTransactions: txs.length,
    });
  }

  if (url.endsWith('/admin/users') && req.method === 'GET') {
    const qRes = await fsRunQuery('users', [], 500, userToken);
    return res.status(200).json({ success: true, users: (qRes.documents || []).map(sanitizeUser) });
  }

  if (url.includes('/admin/users/') && url.endsWith('/wallet-adjust') && req.method === 'POST') {
    const parts = url.split('/');
    const targetId = parts[parts.indexOf('users') + 1];
    const amt = Number(body.amount || 0);
    const type = body.type === 'debit' ? 'debit' : 'credit';
    if (!targetId || !Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Valid target user and positive amount required' });
    }
    const uRes = await fsGetDoc(`users/${targetId}`, userToken);
    if (!uRes.ok || !uRes.data) return res.status(404).json({ error: 'User not found' });
    const currentBal = Number(uRes.data.walletBalance || 0);
    const newBal = type === 'credit' ? currentBal + amt : Math.max(0, currentBal - amt);
    await fsPatchDoc(`users/${targetId}`, { walletBalance: newBal, updatedAt: new Date().toISOString() }, ['walletBalance', 'updatedAt'], userToken);
    const txId = `ADM-ADJ-${Date.now()}`;
    await fsCreateDoc('transactions', txId, {
      id: txId,
      reference: txId,
      userId: targetId,
      userName: uRes.data.name || 'User',
      userEmail: uRes.data.email || '',
      serviceType: 'admin_adjustment',
      amount: amt,
      status: 'successful',
      recipient: uRes.data.phone || '',
      description: `Admin ${type}: ${body.reason || 'Manual adjustment'}`,
      date: new Date().toISOString(),
    }, userToken);
    return res.status(200).json({ success: true, balance: newBal });
  }

  if (url.includes('/admin/users/') && req.method === 'PUT') {
    const targetId = url.split('/').pop();
    const ok = await fsPatchDoc(`users/${targetId}`, { ...body, updatedAt: new Date().toISOString() }, null, userToken);
    return res.status(ok.ok ? 200 : 503).json({ success: ok.ok, error: ok.error });
  }

  if (url.includes('/admin/users/') && req.method === 'DELETE') {
    const targetId = url.split('/').pop();
    const delRes = await fsDeleteDoc(`users/${targetId}`, userToken);
    return res.status(delRes.ok ? 200 : 503).json({ success: delRes.ok });
  }

  if (url.endsWith('/admin/data-plans')) {
    if (req.method === 'GET') {
      const qRes = await fsRunQuery('dataPlans', [], 300, userToken);
      return res.status(200).json({ success: true, plans: qRes.documents || [] });
    }
    if (req.method === 'POST') {
      const planId = body.id || `plan_${Date.now()}`;
      await fsCreateDoc('dataPlans', planId, { ...body, id: planId, updatedAt: new Date().toISOString() }, userToken);
      return res.status(200).json({ success: true });
    }
  }

  if (url.includes('/admin/data-plans/')) {
    const planId = url.split('/').pop();
    if (req.method === 'PUT') {
      await fsPatchDoc(`dataPlans/${planId}`, { ...body, updatedAt: new Date().toISOString() }, null, userToken);
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      await fsDeleteDoc(`dataPlans/${planId}`, userToken);
      return res.status(200).json({ success: true });
    }
  }

  if (url.endsWith('/admin/airtime-discounts')) {
    const qRes = await fsRunQuery('airtimeDiscounts', [], 50, userToken);
    return res.status(200).json({ success: true, discounts: qRes.documents || [] });
  }

  if (url.endsWith('/admin/electricity-discos')) {
    const qRes = await fsRunQuery('electricityDiscos', [], 50, userToken);
    return res.status(200).json({ success: true, discos: qRes.documents || [] });
  }

  if (url.endsWith('/admin/cable-packages')) {
    const qRes = await fsRunQuery('cablePackages', [], 200, userToken);
    return res.status(200).json({ success: true, packages: qRes.documents || [] });
  }

  if (url.endsWith('/admin/exam-pins')) {
    const qRes = await fsRunQuery('examPins', [], 50, userToken);
    return res.status(200).json({ success: true, pins: qRes.documents || [] });
  }

  if (url.endsWith('/admin/manual-fund/requests')) {
    const qRes = await fsRunQuery('manual_funding_requests', [], 200, userToken);
    const list = (qRes.documents || []).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return res.status(200).json({ success: true, requests: list });
  }

  if (url.endsWith('/admin/manual-fund/config') && req.method === 'PUT') {
    await fsPatchDoc('settings/manual_funding', { ...body, updatedAt: new Date().toISOString() }, null, userToken);
    return res.status(200).json({ success: true });
  }

  if (url.endsWith('/admin/manual-fund/approve') && req.method === 'POST') {
    const { requestId } = body;
    const reqDoc = await fsGetDoc(`manual_funding_requests/${requestId}`, userToken);
    if (!reqDoc.ok || !reqDoc.data) return res.status(404).json({ error: 'Request not found' });
    if (reqDoc.data.status === 'approved') return res.status(200).json({ success: true });
    await fsPatchDoc(`manual_funding_requests/${requestId}`, { status: 'approved', updatedAt: new Date().toISOString() }, ['status', 'updatedAt'], userToken);
    const userDoc = await fsGetDoc(`users/${reqDoc.data.userId}`, userToken);
    if (userDoc.ok && userDoc.data) {
      const newBal = Number(userDoc.data.walletBalance || 0) + Number(reqDoc.data.amount || 0);
      await fsPatchDoc(`users/${reqDoc.data.userId}`, { walletBalance: newBal, updatedAt: new Date().toISOString() }, ['walletBalance', 'updatedAt'], userToken);
    }
    return res.status(200).json({ success: true });
  }

  if (url.endsWith('/admin/webhook-logs')) {
    const qRes = await fsRunQuery('webhook_logs', [], 50, userToken);
    const logs = (qRes.documents || []).sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
    return res.status(200).json({ success: true, logs });
  }

  if (url.endsWith('/admin/vtu-naija/config') || url.endsWith('/admin/billstack/config') || url.endsWith('/admin/unitybills/config') || url.endsWith('/admin/ncwallet/config') || url.endsWith('/admin/gateway/routing')) {
    const docName = url.includes('vtu-naija')
      ? 'vtu_config'
      : url.includes('billstack')
      ? 'billstack_config'
      : url.includes('unitybills')
      ? 'unitybills_config'
      : url.includes('ncwallet')
      ? 'nc_config'
      : 'service_routing';

    if (req.method === 'GET') {
      const cfg = await fsGetDoc(`systemSettings/${docName}`, userToken);
      const data = cfg.data ? { ...cfg.data } : {};
      if (data.apiKey) data.apiKey = maskSecret(data.apiKey);
      if (data.secretKey) data.secretKey = maskSecret(data.secretKey);
      return res.status(200).json({ success: true, config: data, routing: docName === 'service_routing' ? data : undefined });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      await fsPatchDoc(`systemSettings/${docName}`, { ...body, updatedAt: new Date().toISOString() }, null, userToken);
      return res.status(200).json({ success: true });
    }
  }

  if (url.endsWith('/settings') && req.method === 'PUT') {
    await fsPatchDoc('systemSettings/general', { ...body, updatedAt: new Date().toISOString() }, null, userToken);
    return res.status(200).json({ success: true });
  }

  return res.status(200).json({ success: true, data: [] });
}
