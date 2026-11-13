// Shared Zero-Crash, High-Speed Vercel Webhook Handler for Deposit Notifications
import { fsCreateDoc, fsPatchDoc, fsRunQuery } from './_firestore.js';

export async function handleUnityBillsWebhookRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS' || req.method === 'HEAD' || req.method === 'GET') {
    return res.status(200).json({
      success: true,
      status: 'successful',
      message: 'Deposit webhook listener active on Vercel',
      url: req.url,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    } else if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf-8')); } catch {}
    } else if (!req.body && req.readable && !req.readableEnded) {
      body = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({}), 400);
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          clearTimeout(timeout);
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
          } catch {
            resolve({});
          }
        });
        req.on('error', () => {
          clearTimeout(timeout);
          resolve({});
        });
      });
    }

    const data = (body && typeof body === 'object' && body.data) ? body.data : (body || {});

    const reference = String(
      data.reference ||
      data.sessionId ||
      data.externalReference ||
      data.transaction_ref ||
      data.id ||
      body.reference ||
      body.sessionId ||
      body.externalReference ||
      body.id ||
      ''
    ).trim();

    const rawAmount =
      data.amountReceived ??
      data.amount ??
      data.settledAmount ??
      data.totalAmount ??
      body.amountReceived ??
      body.amount;

    const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount || 0);

    const accountNumber = String(
      data.virtualAccount ||
      data.accountNumber ||
      data.account_number ||
      data.settlementDestination ||
      data.account ||
      body.virtualAccount ||
      body.accountNumber ||
      body.account_number ||
      body.settlementDestination ||
      body.account ||
      ''
    ).trim();

    const bankName = data.sourceBankName || data.bank_name || data.bankName || 'Partner Bank';
    const customerName = data.sourceAccountName || data.accountName || body.sourceAccountName || 'Valued Customer';
    const customerEmail = String(data.emailAddress || data.email || body.emailAddress || body.email || '').trim().toLowerCase();

    const logId = `whlog_ub_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    let creditedUserId = null;
    let balanceUpdated = false;

    try {
      const syncTask = async () => {
        // 1. Log raw payload to 'webhook_logs'
        await fsCreateDoc('webhook_logs', logId, {
          id: logId,
          path: req.url || '/api/webhooks/unitybills',
          method: req.method || 'POST',
          body: typeof body === 'string' ? body : JSON.stringify(body),
          timestamp: new Date().toISOString(),
        }).catch(() => null);

        // 2. Check idempotency if reference is provided
        if (amount > 0) {
          if (reference) {
            const dupRes = await fsRunQuery('transactions', [{ field: 'reference', value: reference }], 1).catch(() => null);
            if (dupRes?.ok && Array.isArray(dupRes.documents) && dupRes.documents.length > 0) {
              creditedUserId = dupRes.documents[0].userId || null;
              return;
            }
          }

          // 3. Find matching user by email or virtual account number
          let matchedUser = null;
          if (customerEmail) {
            const emailRes = await fsRunQuery('users', [{ field: 'email', value: customerEmail }], 1);
            if (emailRes.ok && emailRes.documents.length > 0) {
              matchedUser = emailRes.documents[0];
            }
          }
          if (!matchedUser && accountNumber) {
            const usersRes = await fsRunQuery('users', [], 300);
            if (usersRes.ok && Array.isArray(usersRes.documents)) {
              matchedUser = usersRes.documents.find(u =>
                Array.isArray(u.virtualAccounts) &&
                u.virtualAccounts.some(va => String(va.accountNumber || '').trim() === accountNumber)
              );
            }
          }

          if (matchedUser) {
            const currentBal = Number(matchedUser.walletBalance || 0);
            const newBal = currentBal + amount;
            creditedUserId = matchedUser.id;

            const patchRes = await fsPatchDoc(
              `users/${matchedUser.id}`,
              {
                walletBalance: newBal,
                updatedAt: new Date().toISOString(),
              },
              ['walletBalance', 'updatedAt']
            );
            balanceUpdated = Boolean(patchRes.ok);

            const txId = `tx_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
            const nowIso = new Date().toISOString();
            await fsCreateDoc('transactions', txId, {
              id: txId,
              reference: reference || txId,
              providerReference: reference || '',
              userId: matchedUser.id,
              userName: matchedUser.name || customerName,
              userEmail: matchedUser.email || customerEmail,
              userPhone: matchedUser.phone || '',
              userRole: matchedUser.role || 'customer',
              serviceType: 'wallet_fund',
              recipient: `${bankName} (${accountNumber || 'Virtual Account'})`,
              amount,
              providerCost: 0,
              profit: 0,
              status: 'successful',
              paymentMethod: `Bank Transfer (${bankName})`,
              date: nowIso,
              createdAt: nowIso,
            }).catch(() => null);

            const notifId = `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
            await fsCreateDoc('notifications', notifId, {
              id: notifId,
              userId: matchedUser.id,
              title: 'Wallet Credited!',
              message: `₦${amount.toLocaleString()} deposit via ${bankName} (${accountNumber || 'Virtual Account'}) has been credited to your wallet.`,
              type: 'success',
              read: false,
              createdAt: nowIso,
            }).catch(() => null);
          }
        }
      };

      await Promise.race([
        syncTask(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 2500)),
      ]);
    } catch (syncErr) {
      console.warn('Vercel webhook sync note:', syncErr?.message || syncErr);
    }

    return res.status(200).json({
      success: true,
      status: 'successful',
      message: 'Deposit processed',
      log_id: logId,
      data: {
        reference,
        virtualAccount: accountNumber,
        amountReceived: amount,
        creditedUserId,
        balanceUpdated,
      },
    });
  } catch (err) {
    console.error('Vercel Webhook Handler Catch Error:', err);
    return res.status(200).json({
      success: true,
      status: 'successful',
      message: 'Webhook handled on Vercel',
      error: err?.message || 'Handled error',
    });
  }
}
