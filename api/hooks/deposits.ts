import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForVercelServerless12345",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-studio-naeemdatasub-8bb16184.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "ai-studio-naeemdatasub-8bb16184-21be-4bcb-bf84-6a9163fbd9db",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-studio-naeemdatasub-8bb16184.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "837753811837",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:837753811837:web:8bb1618421be4bcbbf846a",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req: any, res: any) {
  // CORS & Content-Type Headers to guarantee HTTP 200 OK directly to UnityBills
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS' || req.method === 'HEAD' || req.method === 'GET') {
    return res.status(200).json({
      success: true,
      status: 'successful',
      message: 'UnityBills deposit webhook listener active on Vercel',
      timestamp: new Date().toISOString(),
    });
  }

  const logId = `whlog_vc_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const ip = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim();

  const logPayload = {
    id: logId,
    path: '/hooks/deposits',
    method: req.method,
    headers: req.headers,
    body: req.body || null,
    query: req.query || null,
    ip,
    host: req.headers.host || 'vercel.app',
    timestamp: new Date().toISOString(),
  };

  // Log to Firestore 'webhook_logs'
  try {
    const logDocRef = doc(db, 'webhook_logs', logId);
    await setDoc(logDocRef, logPayload);
    console.log(`[Vercel Webhook] Logged ${req.method} to 'webhook_logs' (${logId})`);
  } catch (err: any) {
    console.warn('[Vercel Webhook Firestore Log Error]:', err?.message || err);
  }

  const body = req.body || {};
  const data = body.data || body;

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
    data.account ||
    data.settlementDestination ||
    body.virtualAccount ||
    body.accountNumber ||
    body.account_number ||
    body.account ||
    ''
  ).trim();

  return res.status(200).json({
    success: true,
    status: 'successful',
    message: 'Deposit webhook received and logged to Firestore webhook_logs successfully on Vercel',
    log_id: logId,
    data: {
      reference,
      virtualAccount: accountNumber,
      amountReceived: amount,
    },
  });
}
