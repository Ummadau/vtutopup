import crypto from 'crypto';
import {
  FIRESTORE_BASE,
  FIREBASE_API_KEY,
  extractBearerToken,
  unwrapFirestoreDoc,
  unwrapFirestoreValue,
  wrapFirestoreDoc,
  wrapFirestoreValue,
  fsGetDoc,
  fsCreateDoc,
  fsPatchDoc,
  fsRunQuery,
} from '../_firestore.js';

export {
  FIRESTORE_BASE,
  FIREBASE_API_KEY as FIRESTORE_KEY,
  extractBearerToken,
  unwrapFirestoreDoc,
  unwrapFirestoreValue,
  wrapFirestoreDoc,
  wrapFirestoreValue,
};

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !String(storedHash).includes(':')) return false;
  try {
    const [salt, keyHex] = String(storedHash).split(':');
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derived = crypto.scryptSync(String(password), salt, 64);
    if (keyBuf.length !== derived.length) return false;
    return crypto.timingSafeEqual(keyBuf, derived);
  } catch {
    return false;
  }
}

export function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return user;
  const { passwordHash, password, ...safe } = user;
  return safe;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const fbUser = data?.users?.[0];
    if (!fbUser?.email) return null;
    return {
      uid: fbUser.localId,
      email: String(fbUser.email).toLowerCase(),
      displayName: fbUser.displayName || '',
      emailVerified: !!fbUser.emailVerified,
    };
  } catch {
    return null;
  }
}

export async function verifyFirebasePassword(email, password) {
  if (!email || !password) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    if (!res.ok) return { ok: false, error: (await res.json().catch(() => ({})))?.error?.message };
    const data = await res.json();
    return { ok: true, localId: data.localId, email: data.email, idToken: data.idToken };
  } catch {
    return null;
  }
}

export function normalizePhone(phone = '') {
  const p = String(phone).replace(/\D/g, '');
  if (p.startsWith('234') && p.length === 13) return '0' + p.slice(3);
  if (p.startsWith('0') && p.length === 11) return p;
  if (p.length === 10) return '0' + p;
  return p;
}

export const SUPER_ADMIN_USER = {
  id: 'usr_admin_01',
  name: 'Naeem Ummadau',
  email: 'naeemummadau@gmail.com',
  phone: '08000000001',
  role: 'admin',
  status: 'active',
  isVerified: true,
  referralCode: 'ADMIN01',
  walletBalance: 250000,
  totalSavings: 0,
  referralEarnings: 0,
  totalTransactionsCount: 520,
  transactionPin: '1234',
  createdAt: '2025-12-01T08:00:00Z',
};

export async function findUserByIdentifier(identifier = '', userToken = null) {
  const clean = String(identifier).trim().toLowerCase();
  const cleanPhone = normalizePhone(clean);

  // Check admin identity
  if (clean === 'naeemummadau@gmail.com' || cleanPhone === '08000000001' || clean === 'usr_admin_01') {
    const adminDoc = await fsGetDoc('users/usr_admin_01', userToken);
    if (adminDoc.ok && adminDoc.data) {
      return adminDoc.data;
    }
    return { ...SUPER_ADMIN_USER };
  }

  // 1. Try finding by email
  if (clean.includes('@')) {
    const qRes = await fsRunQuery('users', [{ field: 'email', value: clean }], 1, userToken);
    if (qRes.ok && qRes.documents.length > 0) {
      return qRes.documents[0];
    }
  }

  // 2. Try finding by phone
  if (cleanPhone && cleanPhone.length >= 10) {
    const qRes = await fsRunQuery('users', [{ field: 'phone', value: cleanPhone }], 1, userToken);
    if (qRes.ok && qRes.documents.length > 0) {
      return qRes.documents[0];
    }
  }

  // 3. Try direct document ID get (preserve case for Firebase UIDs)
  const rawId = String(identifier).trim();
  if (rawId) {
    const docRes = await fsGetDoc(`users/${rawId}`, userToken);
    if (docRes.ok && docRes.data) {
      return docRes.data;
    }
  }

  return null;
}

export async function createFirestoreUser(user, userToken = null) {
  const res = await fsCreateDoc('users', user.id, user, userToken);
  if (res.ok) return { ok: true, status: res.status };
  // If document already exists (409), patch/merge
  if (res.status === 409) {
    const patchRes = await fsPatchDoc(`users/${user.id}`, user, null, userToken);
    return { ok: patchRes.ok, status: patchRes.status, error: patchRes.error };
  }
  return { ok: false, status: res.status, error: res.error };
}

export async function updateFirestoreUser(userId, fields, userToken = null) {
  const res = await fsPatchDoc(`users/${userId}`, fields, Object.keys(fields), userToken);
  return res.ok;
}
