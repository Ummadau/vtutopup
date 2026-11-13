import crypto from 'crypto';

// Lightweight Firestore REST Authentication Helpers for Vercel
export const FIRESTORE_BASE =
  'https://firestore.googleapis.com/v1/projects/gen-lang-client-0376919977/databases/ai-studio-naeemdatasub-8bb16184-21be-4bcb-bf84-6a9163fbd9db/documents';
export const FIRESTORE_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyBqaJeymaKiXVij6eypZQJFgK2dOH5CoTA';

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
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIRESTORE_KEY}`,
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
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIRESTORE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      }
    );
    if (!res.ok) return { ok: false, error: (await res.json().catch(() => ({})))?.error?.message };
    const data = await res.json();
    return { ok: true, localId: data.localId, email: data.email };
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

export function unwrapFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue !== undefined) return unwrapFirestoreDoc({ fields: v.mapValue.fields || {} });
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(unwrapFirestoreValue);
  return null;
}

export function unwrapFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = unwrapFirestoreValue(v);
  }
  return obj;
}

export function wrapFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(wrapFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = wrapFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function wrapFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = wrapFirestoreValue(v);
  }
  return { fields };
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

export async function findUserByIdentifier(identifier = '') {
  const clean = String(identifier).trim().toLowerCase();
  const cleanPhone = normalizePhone(clean);

  // Check admin identity
  if (clean === 'naeemummadau@gmail.com' || cleanPhone === '08000000001') {
    return { ...SUPER_ADMIN_USER };
  }

  // 1. Try finding by email
  if (clean.includes('@')) {
    try {
      const qRes = await fetch(`${FIRESTORE_BASE}:runQuery?key=${FIRESTORE_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: clean },
              },
            },
            limit: 1,
          },
        }),
      });
      if (qRes.ok) {
        const results = await qRes.json();
        if (results && results[0] && results[0].document) {
          return unwrapFirestoreDoc(results[0].document);
        }
      }
    } catch (e) {
      console.warn('findUser email error:', e);
    }
  }

  // 2. Try finding by phone
  if (cleanPhone) {
    try {
      const qRes = await fetch(`${FIRESTORE_BASE}:runQuery?key=${FIRESTORE_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'phone' },
                op: 'EQUAL',
                value: { stringValue: cleanPhone },
              },
            },
            limit: 1,
          },
        }),
      });
      if (qRes.ok) {
        const results = await qRes.json();
        if (results && results[0] && results[0].document) {
          return unwrapFirestoreDoc(results[0].document);
        }
      }
    } catch (e) {
      console.warn('findUser phone error:', e);
    }
  }

  // 3. Try direct document ID get
  try {
    const docRes = await fetch(`${FIRESTORE_BASE}/users/${clean}?key=${FIRESTORE_KEY}`);
    if (docRes.ok) {
      const docData = await docRes.json();
      return unwrapFirestoreDoc(docData);
    }
  } catch {}

  return null;
}

export async function createFirestoreUser(user) {
  const payload = wrapFirestoreDoc(user);
  const res = await fetch(`${FIRESTORE_BASE}/users?documentId=${encodeURIComponent(user.id)}&key=${FIRESTORE_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function updateFirestoreUser(userId, fields) {
  const updateMaskParams = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const payload = wrapFirestoreDoc(fields);
  const res = await fetch(`${FIRESTORE_BASE}/users/${encodeURIComponent(userId)}?${updateMaskParams}&key=${FIRESTORE_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}
