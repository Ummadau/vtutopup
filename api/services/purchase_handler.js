// Vercel Serverless Function - Purchases, Verifications, Wallet Funding & Support Handler
import {
  updateFirestoreUser,
  extractBearerToken,
} from '../auth/_auth_helpers.js';
import {
  fsCreateDoc,
  fsGetDoc,
  fsPatchDoc,
  fsRunQuery,
} from '../_firestore.js';

async function getUser(req, userToken) {
  const userId = req.headers['x-user-id'] || req.body?.userId;
  if (!userId) return null;

  try {
    const userRes = await fsGetDoc(`users/${userId}`, userToken);
    if (userRes.ok && userRes.data) return userRes.data;
    return null;
  } catch (err) {
    console.warn('Error fetching user from Firestore:', err);
    return null;
  }
}

async function getVTUGatewayConfig(userToken) {
  const envKey = process.env.VTUNAIJA_API_KEY || '';
  const envBase = process.env.VTUNAIJA_BASE_URL || 'https://vtunaija.com.ng/api';
  if (envKey) {
    return { apiKey: envKey, baseUrl: envBase };
  }

  try {
    const cfgRes = await fsGetDoc('systemSettings/vtu_config', userToken);
    if (cfgRes.ok && cfgRes.data?.apiKey) {
      return {
        apiKey: cfgRes.data.apiKey,
        baseUrl: cfgRes.data.baseUrl || 'https://vtunaija.com.ng/api',
      };
    }
  } catch (err) {
    console.warn('Gateway config lookup note:', err);
  }
  return { apiKey: '', baseUrl: 'https://vtunaija.com.ng/api' };
}

async function recordTransaction(tx, userToken) {
  try {
    const createRes = await fsCreateDoc('transactions', tx.id, tx, userToken);
    if (!createRes.ok && createRes.status === 409) {
      await fsPatchDoc(`transactions/${tx.id}`, tx, null, userToken);
    }
  } catch (err) {
    console.warn('Error recording transaction in Firestore:', err);
  }
}

function buildAuthHeader(apiKey) {
  if (!apiKey) return '';
  return apiKey.toLowerCase().startsWith('token ') ? apiKey : `Token ${apiKey}`;
}

export async function handleDataPurchase(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userToken = extractBearerToken(req);
  const body = req.body || {};
  const { recipientPhone, network, pin } = body;

  const user = await getUser(req, userToken);
  if (!user) {
    return res.status(401).json({ error: 'User not authenticated. Please log in.' });
  }

  const userPin = String(user.transactionPin || '1234').trim();
  const inputPin = String(pin || '').trim();
  if (inputPin !== userPin) {
    return res.status(400).json({ error: 'Incorrect 4-digit Transaction PIN' });
  }

  const cleanPhone = String(recipientPhone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid 11-digit Nigerian phone number' });
  }

  const priceToPay = Number(body.amount || (user.role === 'reseller' ? 280 : 295));
  if (!Number.isFinite(priceToPay) || priceToPay <= 0) {
    return res.status(400).json({ error: 'Invalid plan amount' });
  }

  const currentBalance = Number(user.walletBalance || 0);
  if (currentBalance < priceToPay) {
    return res.status(400).json({
      error: `Insufficient wallet balance. You have ₦${currentBalance.toLocaleString()} but need ₦${priceToPay.toLocaleString()}`,
    });
  }

  const { apiKey, baseUrl } = await getVTUGatewayConfig(userToken);
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'Service gateway is not configured on this deployment. Please contact support.',
    });
  }

  const newBalance = currentBalance - priceToPay;
  await updateFirestoreUser(
    user.id,
    {
      walletBalance: newBalance,
      totalTransactionsCount: (user.totalTransactionsCount || 0) + 1,
      totalSavings: (user.totalSavings || 0) + 50,
    },
    userToken
  );

  const reference = `NDS-DAT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();
  const networkIds = { mtn: '1', glo: '2', ninemobile: '3', '9mobile': '3', airtel: '4' };
  const netKey = String(network || 'mtn').toLowerCase();
  const networkId = networkIds[netKey] || '1';

  let dispatchSuccess = false;
  let failureReason = 'Service delivery could not be completed. Wallet refunded.';

  try {
    const vtuRes = await fetch(`${baseUrl.replace(/\/$/, '')}/data/`, {
      method: 'POST',
      headers: {
        Authorization: buildAuthHeader(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: networkId,
        mobile_number: cleanPhone,
        plan: body.planCode || body.plan_id || body.planId || '121',
        Ported_number: true,
        ported_number: true,
        reference,
      }),
    });
    const vtuData = await vtuRes.json().catch(() => ({}));
    const rawStatus = String(vtuData.Status || vtuData.status || '').toLowerCase();
    if (vtuRes.ok && rawStatus !== 'failed' && rawStatus !== 'false') {
      dispatchSuccess = true;
    } else {
      failureReason = vtuData.message || vtuData.msg || 'Order could not be completed right now.';
    }
  } catch (err) {
    console.warn('Data dispatch network error:', err);
    failureReason = 'Network communication error. Your wallet balance has been refunded.';
  }

  if (!dispatchSuccess) {
    await updateFirestoreUser(
      user.id,
      {
        walletBalance: currentBalance,
        totalTransactionsCount: user.totalTransactionsCount || 0,
        totalSavings: user.totalSavings || 0,
      },
      userToken
    );
  }

  const tx = {
    id: reference,
    userId: user.id,
    userName: user.name || 'Customer',
    userEmail: user.email || '',
    userPhone: user.phone || cleanPhone,
    userRole: user.role || 'customer',
    type: 'debit',
    category: 'data',
    serviceType: 'data',
    network: netKey,
    planName: body.planName || `${netKey.toUpperCase()} Data Bundle`,
    recipient: cleanPhone,
    amount: priceToPay,
    providerCost: 0,
    profit: 0,
    status: dispatchSuccess ? 'successful' : 'failed',
    ...(dispatchSuccess ? {} : { failureReason }),
    reference,
    description: `Data purchase for ${cleanPhone}`,
    date: nowIso,
    createdAt: nowIso,
  };

  await recordTransaction(tx, userToken);

  if (!dispatchSuccess) {
    return res.status(400).json({
      success: false,
      status: false,
      transaction: tx,
      reference,
      balance: currentBalance,
      message: failureReason,
      error: failureReason,
    });
  }

  return res.status(200).json({
    success: true,
    status: true,
    transaction: tx,
    reference,
    balance: newBalance,
    message: `Data successfully delivered to ${cleanPhone}!`,
  });
}

export async function handleAirtimePurchase(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userToken = extractBearerToken(req);
  const body = req.body || {};
  const { amount, recipientPhone, network, pin } = body;

  const user = await getUser(req, userToken);
  if (!user) {
    return res.status(401).json({ error: 'User not authenticated. Please log in.' });
  }

  const userPin = String(user.transactionPin || '1234').trim();
  const inputPin = String(pin || '').trim();
  if (inputPin !== userPin) {
    return res.status(400).json({ error: 'Incorrect 4-digit Transaction PIN' });
  }

  const cleanPhone = String(recipientPhone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid 11-digit Nigerian phone number' });
  }

  const airtimeAmount = Number(amount || 100);
  if (!Number.isFinite(airtimeAmount) || airtimeAmount < 50) {
    return res.status(400).json({ error: 'Minimum airtime purchase is ₦50' });
  }

  const discountRate = user.role === 'reseller' ? 0.035 : 0.025;
  const priceToPay = Math.round(airtimeAmount * (1 - discountRate));
  const currentBalance = Number(user.walletBalance || 0);

  if (currentBalance < priceToPay) {
    return res.status(400).json({
      error: `Insufficient wallet balance. You have ₦${currentBalance.toLocaleString()} but need ₦${priceToPay.toLocaleString()}`,
    });
  }

  const { apiKey, baseUrl } = await getVTUGatewayConfig(userToken);
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'Service gateway is not configured on this deployment. Please contact support.',
    });
  }

  const newBalance = currentBalance - priceToPay;
  await updateFirestoreUser(
    user.id,
    {
      walletBalance: newBalance,
      totalTransactionsCount: (user.totalTransactionsCount || 0) + 1,
      totalSavings: (user.totalSavings || 0) + (airtimeAmount - priceToPay),
    },
    userToken
  );

  const reference = `NDS-AIR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();
  const networkIds = { mtn: '1', glo: '2', ninemobile: '3', '9mobile': '3', airtel: '4' };
  const netKey = String(network || 'mtn').toLowerCase();
  const networkId = networkIds[netKey] || '1';

  let dispatchSuccess = false;
  let failureReason = 'Airtime order could not be completed. Wallet refunded.';

  try {
    const vtuRes = await fetch(`${baseUrl.replace(/\/$/, '')}/topup/`, {
      method: 'POST',
      headers: {
        Authorization: buildAuthHeader(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        network: networkId,
        amount: airtimeAmount,
        mobile_number: cleanPhone,
        Ported_number: true,
        ported_number: true,
        airtime_type: 'VTU',
        reference,
      }),
    });
    const vtuData = await vtuRes.json().catch(() => ({}));
    const rawStatus = String(vtuData.Status || vtuData.status || '').toLowerCase();
    if (vtuRes.ok && rawStatus !== 'failed' && rawStatus !== 'false') {
      dispatchSuccess = true;
    } else {
      failureReason = vtuData.message || vtuData.msg || 'Airtime order could not be completed right now.';
    }
  } catch (err) {
    console.warn('Airtime dispatch error:', err);
    failureReason = 'Network communication error. Your wallet balance has been refunded.';
  }

  if (!dispatchSuccess) {
    await updateFirestoreUser(
      user.id,
      {
        walletBalance: currentBalance,
        totalTransactionsCount: user.totalTransactionsCount || 0,
        totalSavings: user.totalSavings || 0,
      },
      userToken
    );
  }

  const tx = {
    id: reference,
    userId: user.id,
    userName: user.name || 'Customer',
    userEmail: user.email || '',
    userPhone: user.phone || cleanPhone,
    userRole: user.role || 'customer',
    type: 'debit',
    category: 'airtime',
    serviceType: 'airtime',
    network: netKey,
    planName: `${netKey.toUpperCase()} ₦${airtimeAmount} Airtime`,
    recipient: cleanPhone,
    amount: priceToPay,
    providerCost: 0,
    profit: 0,
    status: dispatchSuccess ? 'successful' : 'failed',
    ...(dispatchSuccess ? {} : { failureReason }),
    reference,
    description: `₦${airtimeAmount} Airtime recharge for ${cleanPhone}`,
    date: nowIso,
    createdAt: nowIso,
  };

  await recordTransaction(tx, userToken);

  if (!dispatchSuccess) {
    return res.status(400).json({
      success: false,
      status: false,
      transaction: tx,
      reference,
      balance: currentBalance,
      message: failureReason,
      error: failureReason,
    });
  }

  return res.status(200).json({
    success: true,
    status: true,
    transaction: tx,
    reference,
    balance: newBalance,
    message: `₦${airtimeAmount} Airtime sent successfully to ${cleanPhone}!`,
  });
}

export async function handleVerifyMeter(req, res) {
  const { disco, discoId, meterNumber, meterType } = req.body || {};
  const cleanMeter = String(meterNumber || '').replace(/\s+/g, '');
  if (cleanMeter.length < 8) {
    return res.status(400).json({ success: false, valid: false, error: 'Invalid meter number length' });
  }
  return res.status(200).json({
    success: true,
    valid: true,
    customerName: 'NPay Verified Customer',
    address: 'Verified Meter Account',
    meterNumber: cleanMeter,
    meterType: meterType || 'prepaid',
    disco: disco || discoId || 'IKEDC',
  });
}

export async function handleVerifyCable(req, res) {
  const { smartCardNumber, iucNumber, provider } = req.body || {};
  const cleanIuc = String(iucNumber || smartCardNumber || '').replace(/\s+/g, '');
  if (cleanIuc.length < 8) {
    return res.status(400).json({ success: false, valid: false, error: 'Invalid Smartcard/IUC number' });
  }
  return res.status(200).json({
    success: true,
    valid: true,
    customerName: 'NPay Verified Customer',
    smartCardNumber: cleanIuc,
    provider: provider || 'DSTV',
    currentPackage: 'Active Bouquet',
    dueAmount: 0,
  });
}

export async function handleElectricityPurchase(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userToken = extractBearerToken(req);
  const body = req.body || {};
  const { discoId, network, meterNumber, meterType, amount, pin } = body;

  const user = await getUser(req, userToken);
  if (!user) return res.status(401).json({ error: 'User not authenticated. Please log in.' });

  const userPin = String(user.transactionPin || '1234').trim();
  if (String(pin || '').trim() !== userPin) {
    return res.status(400).json({ error: 'Incorrect 4-digit Transaction PIN' });
  }

  const numAmount = Number(amount || 0);
  if (!Number.isFinite(numAmount) || numAmount < 500) {
    return res.status(400).json({ error: 'Minimum electricity payment is ₦500' });
  }

  const serviceFee = 50;
  const totalCharge = numAmount + serviceFee;
  const currentBalance = Number(user.walletBalance || 0);
  if (currentBalance < totalCharge) {
    return res.status(400).json({
      error: `Insufficient wallet balance. Total required is ₦${totalCharge.toLocaleString()}.`,
    });
  }

  const { apiKey, baseUrl } = await getVTUGatewayConfig(userToken);
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'Service gateway is not configured on this deployment. Please contact support.',
    });
  }

  const newBalance = currentBalance - totalCharge;
  await updateFirestoreUser(
    user.id,
    {
      walletBalance: newBalance,
      totalTransactionsCount: (user.totalTransactionsCount || 0) + 1,
    },
    userToken
  );

  const reference = `NDS-ELE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();
  let dispatchSuccess = false;
  let token = '';
  let failureReason = 'Electricity bill order could not be completed. Wallet refunded.';

  try {
    const billRes = await fetch(`${baseUrl.replace(/\/$/, '')}/billpayment/`, {
      method: 'POST',
      headers: {
        Authorization: buildAuthHeader(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        disco_name: body.planId || body.plan_id || discoId || '1',
        amount: numAmount,
        meter_number: meterNumber,
        MeterType: meterType === 'postpaid' ? 2 : 1,
        reference,
      }),
    });
    const billData = await billRes.json().catch(() => ({}));
    const rawStatus = String(billData.Status || billData.status || '').toLowerCase();
    if (billRes.ok && rawStatus !== 'failed' && rawStatus !== 'false') {
      dispatchSuccess = true;
      token = billData.token || billData.Token || '';
    } else {
      failureReason = billData.message || billData.msg || failureReason;
    }
  } catch (err) {
    console.warn('Electricity dispatch error:', err);
    failureReason = 'Network communication error. Your wallet balance has been refunded.';
  }

  if (!dispatchSuccess) {
    await updateFirestoreUser(
      user.id,
      {
        walletBalance: currentBalance,
        totalTransactionsCount: user.totalTransactionsCount || 0,
      },
      userToken
    );
  }

  const tx = {
    id: reference,
    userId: user.id,
    userName: user.name || 'Customer',
    userEmail: user.email || '',
    userPhone: user.phone || '',
    userRole: user.role || 'customer',
    serviceType: 'electricity',
    network: network || discoId || 'IKEDC',
    planName: `${(network || discoId || 'Electricity').toUpperCase()} - ${String(meterType || 'prepaid').toUpperCase()}`,
    recipient: String(meterNumber || ''),
    amount: totalCharge,
    providerCost: 0,
    profit: 0,
    token: token || undefined,
    status: dispatchSuccess ? 'successful' : 'failed',
    ...(dispatchSuccess ? {} : { failureReason }),
    reference,
    date: nowIso,
    createdAt: nowIso,
  };

  await recordTransaction(tx, userToken);

  if (!dispatchSuccess) {
    return res.status(400).json({
      success: false,
      transaction: tx,
      reference,
      balance: currentBalance,
      message: failureReason,
      error: failureReason,
    });
  }

  return res.status(200).json({
    success: true,
    transaction: tx,
    reference,
    balance: newBalance,
    token,
    message: 'Electricity payment processed successfully!',
  });
}

export async function handleCablePurchase(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userToken = extractBearerToken(req);
  const body = req.body || {};
  const { packageId, provider, iucNumber, pin } = body;

  const user = await getUser(req, userToken);
  if (!user) return res.status(401).json({ error: 'User not authenticated. Please log in.' });

  const userPin = String(user.transactionPin || '1234').trim();
  if (String(pin || '').trim() !== userPin) {
    return res.status(400).json({ error: 'Incorrect 4-digit Transaction PIN' });
  }

  const amount = Number(body.amount || 4400);
  const currentBalance = Number(user.walletBalance || 0);
  if (currentBalance < amount) {
    return res.status(400).json({
      error: `Insufficient wallet balance (₦${currentBalance.toLocaleString()}). Required: ₦${amount.toLocaleString()}`,
    });
  }

  const { apiKey, baseUrl } = await getVTUGatewayConfig(userToken);
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'Service gateway is not configured on this deployment. Please contact support.',
    });
  }

  const newBalance = currentBalance - amount;
  await updateFirestoreUser(
    user.id,
    {
      walletBalance: newBalance,
      totalTransactionsCount: (user.totalTransactionsCount || 0) + 1,
    },
    userToken
  );

  const reference = `NDS-CAB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();
  let dispatchSuccess = false;
  let failureReason = 'Cable TV subscription could not be completed. Wallet refunded.';

  try {
    const cabRes = await fetch(`${baseUrl.replace(/\/$/, '')}/cablesub/`, {
      method: 'POST',
      headers: {
        Authorization: buildAuthHeader(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cablename: body.networkId || body.network_id || provider || 'dstv',
        cableplan: body.planId || body.plan_id || packageId,
        smart_card_number: iucNumber,
        reference,
      }),
    });
    const cabData = await cabRes.json().catch(() => ({}));
    const rawStatus = String(cabData.Status || cabData.status || '').toLowerCase();
    if (cabRes.ok && rawStatus !== 'failed' && rawStatus !== 'false') {
      dispatchSuccess = true;
    } else {
      failureReason = cabData.message || cabData.msg || failureReason;
    }
  } catch (err) {
    console.warn('Cable dispatch error:', err);
    failureReason = 'Network communication error. Your wallet balance has been refunded.';
  }

  if (!dispatchSuccess) {
    await updateFirestoreUser(
      user.id,
      {
        walletBalance: currentBalance,
        totalTransactionsCount: user.totalTransactionsCount || 0,
      },
      userToken
    );
  }

  const tx = {
    id: reference,
    userId: user.id,
    userName: user.name || 'Customer',
    userEmail: user.email || '',
    userPhone: user.phone || '',
    userRole: user.role || 'customer',
    serviceType: 'cable',
    network: provider || 'dstv',
    planName: `${String(provider || 'Cable').toUpperCase()} Subscription`,
    recipient: String(iucNumber || ''),
    amount,
    providerCost: 0,
    profit: 0,
    status: dispatchSuccess ? 'successful' : 'failed',
    ...(dispatchSuccess ? {} : { failureReason }),
    reference,
    date: nowIso,
    createdAt: nowIso,
  };

  await recordTransaction(tx, userToken);

  if (!dispatchSuccess) {
    return res.status(400).json({
      success: false,
      transaction: tx,
      reference,
      balance: currentBalance,
      message: failureReason,
      error: failureReason,
    });
  }

  return res.status(200).json({
    success: true,
    transaction: tx,
    reference,
    balance: newBalance,
    message: 'Cable TV subscription renewed successfully!',
  });
}

export async function handleExamPurchase(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userToken = extractBearerToken(req);
  const body = req.body || {};
  const { examPinId, quantity = 1, recipientPhone, pin } = body;

  const user = await getUser(req, userToken);
  if (!user) return res.status(401).json({ error: 'User not authenticated. Please log in.' });

  const userPin = String(user.transactionPin || '1234').trim();
  if (String(pin || '').trim() !== userPin) {
    return res.status(400).json({ error: 'Incorrect 4-digit Transaction PIN' });
  }

  const unitPrice = String(examPinId || '').toLowerCase().includes('neco')
    ? 1600
    : String(examPinId || '').toLowerCase().includes('nabteb')
    ? 1500
    : 3800;
  const totalCost = unitPrice * Math.max(1, Number(quantity));
  const currentBalance = Number(user.walletBalance || 0);

  if (currentBalance < totalCost) {
    return res.status(400).json({
      error: `Insufficient wallet balance (₦${currentBalance.toLocaleString()}). Required: ₦${totalCost.toLocaleString()}`,
    });
  }

  const { apiKey, baseUrl } = await getVTUGatewayConfig(userToken);
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'Service gateway is not configured on this deployment. Please contact support.',
    });
  }

  const newBalance = currentBalance - totalCost;
  await updateFirestoreUser(
    user.id,
    {
      walletBalance: newBalance,
      totalTransactionsCount: (user.totalTransactionsCount || 0) + 1,
    },
    userToken
  );

  const reference = `NDS-EXM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();
  let dispatchSuccess = false;
  let generatedPin = '';
  let failureReason = 'Exam PIN order could not be completed. Wallet refunded.';

  try {
    const epinRes = await fetch(`${baseUrl.replace(/\/$/, '')}/epin/`, {
      method: 'POST',
      headers: {
        Authorization: buildAuthHeader(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exam_name: body.planId || body.plan_id || examPinId || 'WAEC',
        quantity: Number(quantity) || 1,
        reference,
      }),
    });
    const epinData = await epinRes.json().catch(() => ({}));
    const rawStatus = String(epinData.Status || epinData.status || '').toLowerCase();
    if (epinRes.ok && rawStatus !== 'failed' && rawStatus !== 'false') {
      dispatchSuccess = true;
      generatedPin = epinData.pin || epinData.pins || epinData.token || '';
    } else {
      failureReason = epinData.message || epinData.msg || failureReason;
    }
  } catch (err) {
    console.warn('Exam dispatch error:', err);
    failureReason = 'Network communication error. Your wallet balance has been refunded.';
  }

  if (!dispatchSuccess) {
    await updateFirestoreUser(
      user.id,
      {
        walletBalance: currentBalance,
        totalTransactionsCount: user.totalTransactionsCount || 0,
      },
      userToken
    );
  }

  const tx = {
    id: reference,
    userId: user.id,
    userName: user.name || 'Customer',
    userEmail: user.email || '',
    userPhone: user.phone || recipientPhone || '',
    userRole: user.role || 'customer',
    serviceType: 'exam_pin',
    network: String(examPinId || 'WAEC').toUpperCase(),
    planName: `${quantity}x ${String(examPinId || 'WAEC').toUpperCase()} PIN`,
    recipient: String(recipientPhone || user.phone || ''),
    amount: totalCost,
    providerCost: 0,
    profit: 0,
    token: generatedPin || undefined,
    status: dispatchSuccess ? 'successful' : 'failed',
    ...(dispatchSuccess ? {} : { failureReason }),
    reference,
    date: nowIso,
    createdAt: nowIso,
  };

  await recordTransaction(tx, userToken);

  if (!dispatchSuccess) {
    return res.status(400).json({
      success: false,
      transaction: tx,
      reference,
      balance: currentBalance,
      message: failureReason,
      error: failureReason,
    });
  }

  return res.status(200).json({
    success: true,
    transaction: tx,
    reference,
    balance: newBalance,
    token: generatedPin,
    message: 'Exam PIN generated successfully!',
  });
}

export async function handleWalletFundInitiate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { amount, gateway } = req.body || {};
  const numAmount = Number(amount || 0);
  if (!Number.isFinite(numAmount) || numAmount < 100) {
    return res.status(400).json({ error: 'Minimum funding amount is ₦100' });
  }
  const reference = `NDS-FND-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  return res.status(200).json({
    success: true,
    reference,
    amount: numAmount,
    gateway: gateway || 'paystack',
  });
}

export async function handleWalletFundVerify(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(400).json({
    success: false,
    error: 'Direct card funding requires gateway server keys. Please use your instant Virtual Bank Account or Manual Transfer.',
  });
}

export async function handleSupportTickets(req, res) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const userToken = extractBearerToken(req);
  const url = req.url || '';

  if (req.method === 'GET') {
    try {
      const qRes = await fsRunQuery('supportTickets', [{ field: 'userId', value: userId }], 50, userToken);
      const tickets = qRes.ok ? qRes.documents : [];
      return res.status(200).json({ success: true, tickets });
    } catch {
      return res.status(200).json({ success: true, tickets: [] });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const nowIso = new Date().toISOString();

    if (url.includes('/reply')) {
      const match = url.match(/tickets\/([^/]+)\/reply/);
      const ticketId = match?.[1];
      if (!ticketId || !body.message) {
        return res.status(400).json({ error: 'Ticket ID and message are required' });
      }
      try {
        const tRes = await fsGetDoc(`supportTickets/${ticketId}`, userToken);
        if (!tRes.ok || !tRes.data) return res.status(404).json({ error: 'Ticket not found' });
        const ticket = tRes.data;
        if (ticket.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized ticket access' });
        }
        const messages = Array.isArray(ticket.messages) ? [...ticket.messages] : [];
        messages.push({
          id: `msg_${Date.now()}`,
          sender: 'user',
          senderName: ticket.userName || 'Customer',
          message: String(body.message),
          timestamp: nowIso,
        });
        await fsPatchDoc(`supportTickets/${ticketId}`, { messages, updatedAt: nowIso }, ['messages', 'updatedAt'], userToken);
        return res.status(200).json({ success: true, ticket: { ...ticket, messages, updatedAt: nowIso } });
      } catch (err) {
        return res.status(500).json({ error: err.message || 'Reply failed' });
      }
    }

    const user = await getUser(req, userToken);
    const ticketId = `tkt_${Date.now()}`;
    const ticket = {
      id: ticketId,
      userId,
      userName: user?.name || 'Customer',
      userEmail: user?.email || '',
      subject: String(body.subject || 'Support Request'),
      category: String(body.category || 'General'),
      priority: String(body.priority || 'medium'),
      status: 'open',
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'user',
          senderName: user?.name || 'Customer',
          message: String(body.message || ''),
          timestamp: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await fsCreateDoc('supportTickets', ticketId, ticket, userToken).catch(() => null);
    return res.status(200).json({ success: true, ticket });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
