// Vercel Serverless Function - User Referrals, Reseller Stats & Admin Firestore Router
import {
  extractBearerToken,
  fsCreateDoc,
  fsDeleteDoc,
  fsGetDoc,
  fsPatchDoc,
  fsRunQuery,
  fsUpsertDoc,
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

function stripMaskedSecrets(payload) {
  const clean = { ...(payload || {}) };
  for (const field of ['apiKey', 'secretKey', 'webhookSecret']) {
    if (typeof clean[field] === 'string' && (clean[field].includes('****') || clean[field].trim() === '')) {
      delete clean[field];
    }
  }
  return clean;
}

async function writeCatalogMeta(userToken) {
  await fsUpsertDoc(
    'systemSettings',
    'catalog_meta',
    { bootstrapped: true, updatedAt: new Date().toISOString() },
    userToken
  ).catch(() => null);
}

async function recordAudit(adminEmail, action, target, details, userToken) {
  const audId = `aud_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  await fsCreateDoc(
    'auditLogs',
    audId,
    {
      id: audId,
      adminEmail: adminEmail || 'admin@npay.ng',
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
      ip: 'vercel',
    },
    userToken
  ).catch(() => null);
}

async function recordUserNotification(userId, title, message, type, userToken) {
  if (!userId) return;
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await fsCreateDoc(
    'notifications',
    id,
    {
      id,
      userId,
      title,
      message,
      type: type || 'info',
      read: false,
      createdAt: new Date().toISOString(),
    },
    userToken
  ).catch(() => null);
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
  const actorEmail = verified?.email || user?.email || 'admin@npay.ng';
  return { user, userToken, isAdmin, userId: user?.id || verified?.uid || userId, actorEmail };
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
  const { isAdmin, userToken, actorEmail } = await resolveActor(req);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Administrator privileges required' });
  }

  const url = (req.url || '').split('?')[0].replace(/\/+$/, '');
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

  // ==================== USERS ====================
  if (url.endsWith('/admin/users') && req.method === 'GET') {
    const qRes = await fsRunQuery('users', [], 500, userToken);
    if (!qRes.ok) return res.status(503).json({ success: false, error: qRes.error || 'Failed to load users' });
    return res.status(200).json({ success: true, users: (qRes.documents || []).map(sanitizeUser) });
  }

  if (url.endsWith('/admin/users/create') && req.method === 'POST') {
    const { name, email, phone, role, walletBalance } = body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Full name, email, and phone number are required' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();
    const existingRes = await fsRunQuery('users', [{ field: 'email', value: cleanEmail }], 1, userToken);
    if (existingRes.ok && existingRes.documents.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    const newId = `usr_${Date.now()}`;
    const generatedRefCode = String(name).replace(/\s+/g, '').slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);
    const initialBalance = parseFloat(walletBalance) || 0;
    const newUser = {
      id: newId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: role || 'customer',
      status: 'active',
      isVerified: true,
      referralCode: generatedRefCode,
      walletBalance: initialBalance,
      totalSavings: 0,
      referralEarnings: 0,
      totalTransactionsCount: 0,
      transactionPin: '1234',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const writeRes = await fsCreateDoc('users', newId, newUser, userToken);
    if (!writeRes.ok) {
      return res.status(503).json({ success: false, error: writeRes.error || 'Failed to save user' });
    }
    await recordUserNotification(
      newId,
      'Account Created by Admin',
      `Welcome to NPay! Your account has been registered as ${String(newUser.role).toUpperCase()}.`,
      'success',
      userToken
    );
    await recordAudit(actorEmail, 'CREATE_USER_BY_ADMIN', newUser.email, `Role: ${newUser.role}, Balance: ₦${initialBalance}`, userToken);
    return res.status(200).json({ success: true, user: sanitizeUser(newUser), message: `User "${newUser.name}" registered successfully!` });
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
    if (type === 'debit' && currentBal < amt) {
      return res.status(400).json({ error: `Insufficient balance (₦${currentBal.toLocaleString()})` });
    }
    const newBal = type === 'credit' ? currentBal + amt : Math.max(0, currentBal - amt);
    const patchRes = await fsPatchDoc(`users/${targetId}`, { walletBalance: newBal, updatedAt: new Date().toISOString() }, ['walletBalance', 'updatedAt'], userToken);
    if (!patchRes.ok) {
      return res.status(503).json({ success: false, error: patchRes.error || 'Failed to update wallet balance' });
    }
    const txId = `ADM-ADJ-${Date.now()}`;
    await fsCreateDoc('transactions', txId, {
      id: txId,
      reference: txId,
      userId: targetId,
      userName: uRes.data.name || 'User',
      userEmail: uRes.data.email || '',
      userPhone: uRes.data.phone || '',
      userRole: uRes.data.role || 'customer',
      serviceType: 'admin_adjustment',
      amount: amt,
      providerCost: amt,
      profit: 0,
      status: 'successful',
      recipient: uRes.data.phone || '',
      description: `Admin ${type}: ${body.reason || 'Manual adjustment'}`,
      date: new Date().toISOString(),
    }, userToken);
    await recordUserNotification(
      targetId,
      `Wallet ${type === 'credit' ? 'Credited' : 'Debited'} by Admin`,
      `Your wallet was ${type === 'credit' ? 'credited' : 'debited'} with ₦${amt.toLocaleString()}. Reason: ${body.reason || 'Admin adjustment'}`,
      type === 'credit' ? 'info' : 'warning',
      userToken
    );
    await recordAudit(actorEmail, `WALLET_${type.toUpperCase()}`, uRes.data.email || targetId, `Amount: ₦${amt}, Reason: ${body.reason || ''}`, userToken);
    return res.status(200).json({ success: true, newBalance: newBal, balance: newBal });
  }

  if (url.includes('/admin/users/') && req.method === 'PUT') {
    const targetId = url.split('/').pop();
    const ok = await fsPatchDoc(`users/${targetId}`, { ...body, updatedAt: new Date().toISOString() }, null, userToken);
    if (!ok.ok) return res.status(503).json({ success: false, error: ok.error || 'Update failed' });
    await recordAudit(actorEmail, 'UPDATE_USER', targetId, JSON.stringify(body), userToken);
    return res.status(200).json({ success: true, user: ok.data });
  }

  if (url.includes('/admin/users/') && req.method === 'DELETE') {
    const targetId = url.split('/').pop();
    const existing = await fsGetDoc(`users/${targetId}`, userToken);
    if (existing?.data?.email && String(existing.data.email).toLowerCase() === 'naeemummadau@gmail.com') {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }
    const delRes = await fsDeleteDoc(`users/${targetId}`, userToken);
    if (!delRes.ok) return res.status(503).json({ success: false, error: delRes.error || 'Delete failed' });
    await recordAudit(actorEmail, 'DELETE_USER', targetId, `Deleted user ${targetId}`, userToken);
    return res.status(200).json({ success: true });
  }

  // ==================== DATA PLANS ====================
  if (url.endsWith('/admin/data-plans')) {
    if (req.method === 'GET') {
      const qRes = await fsRunQuery('dataPlans', [], 300, userToken);
      return res.status(200).json({ success: true, plans: qRes.documents || [] });
    }
    if (req.method === 'POST') {
      const planId = (typeof body.id === 'string' && body.id.trim()) ? body.id.trim() : `plan_${Date.now()}`;
      const activePlanId = String(body.plan_id || body.planCode || `p_${Date.now().toString().slice(-4)}`).trim();
      const plan = {
        ...body,
        id: planId,
        plan_id: activePlanId,
        planCode: activePlanId,
        providerCost: parseFloat(body.providerCost) || 250,
        customerPrice: parseFloat(body.customerPrice) || 300,
        resellerPrice: parseFloat(body.resellerPrice) || 280,
        isActive: body.isActive !== false,
        updatedAt: new Date().toISOString(),
      };
      const writeRes = await fsUpsertDoc('dataPlans', planId, plan, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to save data plan' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'CREATE_DATA_PLAN', plan.name || planId, JSON.stringify(plan), userToken);
      return res.status(200).json({ success: true, plan });
    }
  }

  if (url.includes('/admin/data-plans/')) {
    const planId = decodeURIComponent(url.split('/').pop() || '');
    if (req.method === 'PUT') {
      const existing = await fsGetDoc(`dataPlans/${planId}`, userToken);
      const merged = {
        ...(existing?.data || { id: planId }),
        ...body,
        id: planId,
        updatedAt: new Date().toISOString(),
      };
      const writeRes = await fsUpsertDoc('dataPlans', planId, merged, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to update data plan' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'UPDATE_DATA_PLAN', planId, JSON.stringify(body), userToken);
      return res.status(200).json({ success: true, plan: merged });
    }
    if (req.method === 'DELETE') {
      const delRes = await fsDeleteDoc(`dataPlans/${planId}`, userToken);
      if (!delRes.ok) return res.status(503).json({ success: false, error: delRes.error || 'Failed to delete data plan' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'DELETE_DATA_PLAN', planId, `Deleted plan ${planId}`, userToken);
      return res.status(200).json({ success: true });
    }
  }

  // ==================== AIRTIME DISCOUNTS ====================
  if (url.endsWith('/admin/airtime-discounts') && req.method === 'GET') {
    const qRes = await fsRunQuery('airtimeDiscounts', [], 50, userToken);
    return res.status(200).json({ success: true, discounts: qRes.documents || [] });
  }

  if (url.includes('/admin/airtime-discounts/') && req.method === 'PUT') {
    const networkKey = decodeURIComponent(url.split('/').pop() || '').toLowerCase();
    const existing = await fsGetDoc(`airtimeDiscounts/${networkKey}`, userToken);
    const merged = {
      network: networkKey,
      plan_id: `${networkKey}_vtu`,
      customerDiscountPercent: 2,
      resellerDiscountPercent: 3.5,
      providerCostPercent: 4.5,
      isActive: true,
      ...(existing?.data || {}),
      ...body,
      network: networkKey,
      updatedAt: new Date().toISOString(),
    };
    const writeRes = await fsUpsertDoc('airtimeDiscounts', networkKey, merged, userToken);
    if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to save airtime discount' });
    await writeCatalogMeta(userToken);
    await recordAudit(actorEmail, 'UPDATE_AIRTIME_DISCOUNT', networkKey, JSON.stringify(body), userToken);
    return res.status(200).json({ success: true, discount: merged });
  }

  // ==================== ELECTRICITY DISCOS ====================
  if (url.endsWith('/admin/electricity-discos')) {
    if (req.method === 'GET') {
      const qRes = await fsRunQuery('electricityDiscos', [], 50, userToken);
      return res.status(200).json({ success: true, discos: qRes.documents || [] });
    }
    if (req.method === 'POST') {
      const discoId = (typeof body.id === 'string' && body.id.trim()) ? body.id.trim() : `disco_${Date.now()}`;
      const activePlanId = String(body.plan_id || body.code || discoId.toUpperCase()).trim();
      const activeNetworkId = String(body.network_id || body.code || body.shortName || discoId).trim();
      const disco = {
        id: discoId,
        plan_id: activePlanId,
        network_id: activeNetworkId,
        name: body.name || 'New Electricity Disco',
        code: body.code || activePlanId,
        shortName: body.shortName || body.name || 'Disco',
        serviceFee: parseFloat(body.serviceFee) || 50,
        isActive: body.isActive !== false,
        updatedAt: new Date().toISOString(),
      };
      const writeRes = await fsUpsertDoc('electricityDiscos', discoId, disco, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to create disco' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'CREATE_ELECTRICITY_DISCO', disco.name, JSON.stringify(disco), userToken);
      return res.status(200).json({ success: true, disco });
    }
  }

  if (url.includes('/admin/electricity-discos/')) {
    const discoId = decodeURIComponent(url.split('/').pop() || '');
    if (req.method === 'PUT') {
      const existing = await fsGetDoc(`electricityDiscos/${discoId}`, userToken);
      const merged = { ...(existing?.data || { id: discoId }), ...body, id: discoId, updatedAt: new Date().toISOString() };
      const writeRes = await fsUpsertDoc('electricityDiscos', discoId, merged, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to update disco' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'UPDATE_ELECTRICITY_DISCO', discoId, JSON.stringify(body), userToken);
      return res.status(200).json({ success: true, disco: merged });
    }
    if (req.method === 'DELETE') {
      const delRes = await fsDeleteDoc(`electricityDiscos/${discoId}`, userToken);
      if (!delRes.ok) return res.status(503).json({ success: false, error: delRes.error || 'Failed to delete disco' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'DELETE_ELECTRICITY_DISCO', discoId, 'Deleted Disco', userToken);
      return res.status(200).json({ success: true });
    }
  }

  // ==================== CABLE PACKAGES ====================
  if (url.endsWith('/admin/cable-packages')) {
    if (req.method === 'GET') {
      const qRes = await fsRunQuery('cablePackages', [], 200, userToken);
      return res.status(200).json({ success: true, packages: qRes.documents || [] });
    }
    if (req.method === 'POST') {
      const id = (typeof body.id === 'string' && body.id.trim()) ? body.id.trim() : `cable_${Date.now()}`;
      const activePlanId = String(body.plan_id || body.code || `code_${Date.now()}`).trim();
      const activeNetworkId = String(body.network_id || body.provider || 'dstv').trim();
      const pkg = {
        id,
        plan_id: activePlanId,
        network_id: activeNetworkId,
        provider: body.provider || 'dstv',
        name: body.name || 'Cable Package',
        code: body.code || activePlanId,
        price: parseFloat(body.price) || 1000,
        providerCost: parseFloat(body.providerCost) || 950,
        isActive: body.isActive !== false,
        updatedAt: new Date().toISOString(),
      };
      const writeRes = await fsUpsertDoc('cablePackages', id, pkg, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to create cable package' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'CREATE_CABLE_PACKAGE', pkg.name, JSON.stringify(pkg), userToken);
      return res.status(200).json({ success: true, package: pkg });
    }
  }

  if (url.includes('/admin/cable-packages/')) {
    const pkgId = decodeURIComponent(url.split('/').pop() || '');
    if (req.method === 'PUT') {
      const existing = await fsGetDoc(`cablePackages/${pkgId}`, userToken);
      const merged = { ...(existing?.data || { id: pkgId }), ...body, id: pkgId, updatedAt: new Date().toISOString() };
      const writeRes = await fsUpsertDoc('cablePackages', pkgId, merged, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to update cable package' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'UPDATE_CABLE_PACKAGE', pkgId, JSON.stringify(body), userToken);
      return res.status(200).json({ success: true, package: merged });
    }
    if (req.method === 'DELETE') {
      const delRes = await fsDeleteDoc(`cablePackages/${pkgId}`, userToken);
      if (!delRes.ok) return res.status(503).json({ success: false, error: delRes.error || 'Failed to delete cable package' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'DELETE_CABLE_PACKAGE', pkgId, 'Deleted Package', userToken);
      return res.status(200).json({ success: true });
    }
  }

  // ==================== EXAM PINS ====================
  if (url.endsWith('/admin/exam-pins')) {
    if (req.method === 'GET') {
      const qRes = await fsRunQuery('examPins', [], 50, userToken);
      return res.status(200).json({ success: true, pins: qRes.documents || [] });
    }
    if (req.method === 'POST') {
      const id = (typeof body.id === 'string' && body.id.trim()) ? body.id.trim() : `pin_${Date.now()}`;
      const activePlanId = String(body.plan_id || body.code || body.exam || 'WAEC').trim();
      const activeNetworkId = String(body.network_id || body.exam || 'WAEC').trim();
      const pin = {
        id,
        plan_id: activePlanId,
        network_id: activeNetworkId,
        exam: body.exam || 'WAEC',
        name: body.name || 'Result Checker PIN',
        code: body.code || activePlanId,
        price: parseFloat(body.price) || 3000,
        providerCost: parseFloat(body.providerCost) || 2800,
        stockAvailable: parseInt(body.stockAvailable, 10) || 100,
        isActive: body.isActive !== false,
        updatedAt: new Date().toISOString(),
      };
      const writeRes = await fsUpsertDoc('examPins', id, pin, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to create exam PIN' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'CREATE_EXAM_PIN', pin.name, JSON.stringify(pin), userToken);
      return res.status(200).json({ success: true, pin });
    }
  }

  if (url.includes('/admin/exam-pins/')) {
    const pinId = decodeURIComponent(url.split('/').pop() || '');
    if (req.method === 'PUT') {
      const existing = await fsGetDoc(`examPins/${pinId}`, userToken);
      const merged = { ...(existing?.data || { id: pinId }), ...body, id: pinId, updatedAt: new Date().toISOString() };
      const writeRes = await fsUpsertDoc('examPins', pinId, merged, userToken);
      if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to update exam PIN' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'UPDATE_EXAM_PIN', pinId, JSON.stringify(body), userToken);
      return res.status(200).json({ success: true, pin: merged });
    }
    if (req.method === 'DELETE') {
      const delRes = await fsDeleteDoc(`examPins/${pinId}`, userToken);
      if (!delRes.ok) return res.status(503).json({ success: false, error: delRes.error || 'Failed to delete exam PIN' });
      await writeCatalogMeta(userToken);
      await recordAudit(actorEmail, 'DELETE_EXAM_PIN', pinId, 'Deleted Exam PIN', userToken);
      return res.status(200).json({ success: true });
    }
  }

  // ==================== MANUAL FUNDING ====================
  if (url.endsWith('/admin/manual-fund/requests')) {
    const qRes = await fsRunQuery('manual_funding_requests', [], 200, userToken);
    const list = (qRes.documents || []).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return res.status(200).json({ success: true, requests: list });
  }

  if (url.endsWith('/admin/manual-fund/config') && (req.method === 'PUT' || req.method === 'POST')) {
    const writeRes = await fsUpsertDoc('settings', 'manual_funding', { ...body, updatedAt: new Date().toISOString() }, userToken);
    if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to save manual funding config' });
    await recordAudit(actorEmail, 'UPDATE_MANUAL_FUNDING_CONFIG', 'FINANCE', JSON.stringify(body), userToken);
    return res.status(200).json({ success: true, config: writeRes.data });
  }

  if (url.endsWith('/admin/manual-fund/approve') && req.method === 'POST') {
    const { requestId } = body;
    const reqDoc = await fsGetDoc(`manual_funding_requests/${requestId}`, userToken);
    if (!reqDoc.ok || !reqDoc.data) return res.status(404).json({ error: 'Request not found' });
    if (reqDoc.data.status === 'approved') return res.status(400).json({ error: 'Request already approved' });

    const reqPatch = await fsPatchDoc(
      `manual_funding_requests/${requestId}`,
      { status: 'approved', updatedAt: new Date().toISOString() },
      ['status', 'updatedAt'],
      userToken
    );
    if (!reqPatch.ok) return res.status(503).json({ success: false, error: reqPatch.error || 'Failed to update request' });

    const userDoc = await fsGetDoc(`users/${reqDoc.data.userId}`, userToken);
    if (userDoc.ok && userDoc.data) {
      const amt = Number(reqDoc.data.amount || 0);
      const newBal = Number(userDoc.data.walletBalance || 0) + amt;
      await fsPatchDoc(
        `users/${reqDoc.data.userId}`,
        { walletBalance: newBal, updatedAt: new Date().toISOString() },
        ['walletBalance', 'updatedAt'],
        userToken
      );
      const txId = `MANUAL-FUND-${Date.now()}`;
      await fsCreateDoc(
        'transactions',
        txId,
        {
          id: txId,
          reference: txId,
          userId: reqDoc.data.userId,
          userName: userDoc.data.name || reqDoc.data.userName || 'Customer',
          userEmail: userDoc.data.email || reqDoc.data.userEmail || '',
          userPhone: userDoc.data.phone || reqDoc.data.userPhone || '',
          userRole: userDoc.data.role || 'customer',
          serviceType: 'wallet_fund',
          recipient: 'Manual Bank Deposit',
          amount: amt,
          providerCost: 0,
          profit: 0,
          status: 'successful',
          date: new Date().toISOString(),
          paymentMethod: 'Manual Bank Deposit',
        },
        userToken
      ).catch(() => null);
      await recordUserNotification(
        reqDoc.data.userId,
        'Wallet Credited!',
        `Your manual funding request of ₦${amt.toLocaleString()} has been approved and credited to your wallet!`,
        'success',
        userToken
      );
    }
    await recordAudit(actorEmail, 'APPROVE_MANUAL_FUNDING', reqDoc.data.userId, `Approved ₦${reqDoc.data.amount}`, userToken);
    return res.status(200).json({ success: true });
  }

  if (url.endsWith('/admin/manual-fund/reject') && req.method === 'POST') {
    const { requestId, reason } = body;
    const reqDoc = await fsGetDoc(`manual_funding_requests/${requestId}`, userToken);
    if (!reqDoc.ok || !reqDoc.data) return res.status(404).json({ error: 'Request not found' });

    const rejectionReason = reason || 'Payment proof could not be verified by Admin.';
    const patchRes = await fsPatchDoc(
      `manual_funding_requests/${requestId}`,
      { status: 'rejected', rejectionReason, updatedAt: new Date().toISOString() },
      ['status', 'rejectionReason', 'updatedAt'],
      userToken
    );
    if (!patchRes.ok) return res.status(503).json({ success: false, error: patchRes.error || 'Failed to reject request' });
    await recordUserNotification(
      reqDoc.data.userId,
      'Manual Funding Request Rejected',
      `Your manual funding request of ₦${Number(reqDoc.data.amount || 0).toLocaleString()} was not approved. Reason: ${rejectionReason}`,
      'warning',
      userToken
    );
    await recordAudit(actorEmail, 'REJECT_MANUAL_FUNDING', reqDoc.data.userId, rejectionReason, userToken);
    return res.status(200).json({ success: true });
  }

  // ==================== REFUNDS, LOGS, SUPPORT & PROVIDERS ====================
  if (url.includes('/admin/transactions/refund/') && req.method === 'POST') {
    const txId = decodeURIComponent(url.split('/').pop() || '');
    const txDoc = await fsGetDoc(`transactions/${txId}`, userToken);
    if (!txDoc.ok || !txDoc.data) return res.status(404).json({ error: 'Transaction not found' });
    const tx = txDoc.data;
    if (tx.status === 'reversed') return res.status(400).json({ error: 'Transaction already refunded' });

    const reason = body.reason || 'Manual Admin Refund';
    const amt = Number(tx.amount || 0);
    const uDoc = await fsGetDoc(`users/${tx.userId}`, userToken);
    if (!uDoc.ok || !uDoc.data) return res.status(404).json({ error: 'Transaction user not found' });

    const newBal = Number(uDoc.data.walletBalance || 0) + amt;
    const uPatch = await fsPatchDoc(`users/${tx.userId}`, { walletBalance: newBal, updatedAt: new Date().toISOString() }, ['walletBalance', 'updatedAt'], userToken);
    if (!uPatch.ok) return res.status(503).json({ success: false, error: uPatch.error || 'Failed to credit user wallet' });

    await fsPatchDoc(
      `transactions/${txId}`,
      { status: 'reversed', failureReason: reason, updatedAt: new Date().toISOString() },
      ['status', 'failureReason', 'updatedAt'],
      userToken
    );
    await recordUserNotification(
      tx.userId,
      'Transaction Reversed & Refunded',
      `₦${amt.toLocaleString()} has been refunded to your wallet for transaction ${tx.reference || txId}. Reason: ${reason}`,
      'warning',
      userToken
    );
    await recordAudit(actorEmail, 'TRANSACTION_REFUND', txId, reason, userToken);
    return res.status(200).json({ success: true, message: 'Transaction refunded and customer wallet credited' });
  }

  if (url.endsWith('/admin/audit-logs') && req.method === 'GET') {
    const qRes = await fsRunQuery('auditLogs', [], 100, userToken);
    const auditLogs = (qRes.ok ? qRes.documents : []).sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
    return res.status(200).json({ success: true, auditLogs });
  }

  if (url.endsWith('/admin/providers') && req.method === 'GET') {
    const [vtuDoc, ncDoc, ubDoc] = await Promise.all([
      fsGetDoc('systemSettings/vtu_config', userToken).catch(() => null),
      fsGetDoc('systemSettings/nc_config', userToken).catch(() => null),
      fsGetDoc('systemSettings/unitybills_config', userToken).catch(() => null),
    ]);
    const providers = [
      {
        id: 'prv_vtunaija_01',
        name: 'VTUNaija API Gateway',
        baseUrl: vtuDoc?.data?.baseUrl || 'https://vtunaija.com.ng/api',
        apiKey: vtuDoc?.data?.apiKey ? maskSecret(vtuDoc.data.apiKey) : '',
        isPrimary: true,
        isLive: vtuDoc?.data?.isLive !== false,
        balance: Number(vtuDoc?.data?.balance || 0),
        status: vtuDoc?.data?.lastStatus || 'connected',
      },
      {
        id: 'prv_ncwallet_01',
        name: 'NCWallet Gateway',
        baseUrl: ncDoc?.data?.baseUrl || 'https://ncwallet.ng/api',
        apiKey: ncDoc?.data?.apiKey ? maskSecret(ncDoc.data.apiKey) : '',
        isPrimary: false,
        isLive: Boolean(ncDoc?.data?.isLive),
        balance: Number(ncDoc?.data?.balance || 0),
        status: ncDoc?.data?.lastStatus || 'unconfigured',
      },
      {
        id: 'prv_unitybills_01',
        name: 'UnityBills Gateway',
        baseUrl: ubDoc?.data?.baseUrl || 'https://www.unitybills.ng/api/v1',
        apiKey: ubDoc?.data?.apiKey ? maskSecret(ubDoc.data.apiKey) : '',
        isPrimary: false,
        isLive: Boolean(ubDoc?.data?.isLive),
        balance: Number(ubDoc?.data?.balance || 0),
        status: ubDoc?.data?.lastStatus || 'unconfigured',
      },
    ];
    return res.status(200).json({ success: true, providers });
  }

  if (url.endsWith('/admin/webhook-logs')) {
    const qRes = await fsRunQuery('webhook_logs', [], 50, userToken);
    const logs = (qRes.documents || []).sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
    return res.status(200).json({ success: true, logs });
  }

  if ((url.endsWith('/admin/support/tickets') || url.endsWith('/support/tickets')) && req.method === 'GET') {
    const qRes = await fsRunQuery('supportTickets', [], 200, userToken);
    const tickets = (qRes.ok ? qRes.documents : []).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
    return res.status(200).json({ success: true, tickets });
  }

  if (url.includes('/support/tickets/') && url.endsWith('/reply') && req.method === 'POST') {
    const parts = url.split('/');
    const ticketId = decodeURIComponent(parts[parts.indexOf('tickets') + 1] || '');
    const tDoc = await fsGetDoc(`supportTickets/${ticketId}`, userToken);
    if (!tDoc.ok || !tDoc.data) return res.status(404).json({ error: 'Ticket not found' });
    const nowIso = new Date().toISOString();
    const messages = Array.isArray(tDoc.data.messages) ? [...tDoc.data.messages] : [];
    messages.push({
      id: `msg_${Date.now()}`,
      sender: 'admin',
      senderName: 'Naeem Support Admin',
      message: String(body.message || ''),
      timestamp: nowIso,
    });
    const nextStatus = tDoc.data.status === 'open' ? 'in_progress' : tDoc.data.status;
    const patchRes = await fsPatchDoc(
      `supportTickets/${ticketId}`,
      { messages, status: nextStatus, updatedAt: nowIso },
      ['messages', 'status', 'updatedAt'],
      userToken
    );
    if (!patchRes.ok) return res.status(503).json({ success: false, error: patchRes.error || 'Reply failed' });
    return res.status(200).json({ success: true, ticket: { ...tDoc.data, messages, status: nextStatus, updatedAt: nowIso } });
  }

  if (url.includes('/support/tickets/') && url.endsWith('/status') && req.method === 'PUT') {
    const parts = url.split('/');
    const ticketId = decodeURIComponent(parts[parts.indexOf('tickets') + 1] || '');
    const nowIso = new Date().toISOString();
    const patchRes = await fsPatchDoc(
      `supportTickets/${ticketId}`,
      { status: body.status, updatedAt: nowIso },
      ['status', 'updatedAt'],
      userToken
    );
    if (!patchRes.ok) return res.status(503).json({ success: false, error: patchRes.error || 'Status update failed' });
    return res.status(200).json({ success: true, ticket: patchRes.data });
  }

  // ==================== GATEWAY CONFIGS & ROUTING ====================
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
      if (data.webhookSecret) data.webhookSecret = maskSecret(data.webhookSecret);
      return res.status(200).json({ success: true, config: data, routing: docName === 'service_routing' ? data : undefined });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const existing = await fsGetDoc(`systemSettings/${docName}`, userToken).catch(() => null);
      const cleanBody = stripMaskedSecrets(body);
      const merged = {
        ...(existing?.data || {}),
        ...cleanBody,
        updatedAt: new Date().toISOString(),
      };
      const writeRes = await fsUpsertDoc('systemSettings', docName, merged, userToken);
      if (!writeRes.ok) {
        return res.status(503).json({ success: false, error: writeRes.error || 'Failed to save gateway configuration' });
      }
      await recordAudit(actorEmail, `UPDATE_${docName.toUpperCase()}`, docName, JSON.stringify({ ...cleanBody, apiKey: undefined, secretKey: undefined, webhookSecret: undefined }), userToken);
      const safeResp = { ...merged };
      if (safeResp.apiKey) safeResp.apiKey = maskSecret(safeResp.apiKey);
      if (safeResp.secretKey) safeResp.secretKey = maskSecret(safeResp.secretKey);
      if (safeResp.webhookSecret) safeResp.webhookSecret = maskSecret(safeResp.webhookSecret);
      return res.status(200).json({ success: true, config: safeResp, routing: docName === 'service_routing' ? safeResp : undefined });
    }
  }

  // ==================== PLATFORM SETTINGS ====================
  if (url.endsWith('/settings') && req.method === 'PUT') {
    const existing = await fsGetDoc('systemSettings/general', userToken).catch(() => null);
    const merged = {
      ...(existing?.data || {}),
      ...body,
      updatedAt: new Date().toISOString(),
    };
    const writeRes = await fsUpsertDoc('systemSettings', 'general', merged, userToken);
    if (!writeRes.ok) return res.status(503).json({ success: false, error: writeRes.error || 'Failed to save platform settings' });
    await recordAudit(actorEmail, 'UPDATE_SETTINGS', 'SYSTEM', JSON.stringify(body), userToken);
    return res.status(200).json({ success: true, settings: merged });
  }

  return res.status(404).json({ success: false, error: `Admin endpoint not found: ${url}` });
}
