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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS' || req.method === 'HEAD' || req.method === 'GET') {
    return res.status(200).json({
      success: true,
      status: 'successful',
      message: 'NAEEM DATA SUB Vercel API active',
      url: req.url,
      timestamp: new Date().toISOString(),
    });
  }

  const logId = `whlog_vc_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const docRef = doc(db, 'webhook_logs', logId);
    await setDoc(docRef, {
      id: logId,
      path: req.url || '/api',
      method: req.method,
      headers: req.headers,
      body: req.body || null,
      query: req.query || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[Vercel API Firestore Log Error]:', err?.message || err);
  }

  return res.status(200).json({
    success: true,
    status: 'successful',
    message: 'Webhook logged and processed successfully on Vercel',
    log_id: logId,
  });
}
