import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function loadAppletConfig() {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    // Fallback to defaults below
  }
  return {};
}

const appletConfig = loadAppletConfig();

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  appletConfig.projectId ||
  'gen-lang-client-0376919977';

export const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  process.env.FIREBASE_DATABASE_ID ||
  appletConfig.firestoreDatabaseId ||
  'ai-studio-naeemdatasub-8bb16184-21be-4bcb-bf84-6a9163fbd9db';

export const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  appletConfig.apiKey ||
  'AIzaSyBqaJeymaKiXVij6eypZQJFgK2dOH5CoTA';

export const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;

let cachedSaToken = null;
let cachedSaExpiry = 0;

function parseServiceAccountCredentials() {
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    '';

  if (rawJson) {
    try {
      const trimmed = rawJson.trim();
      const decoded = trimmed.startsWith('{')
        ? trimmed
        : Buffer.from(trimmed, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
        };
      }
    } catch (err) {
      console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format:', err?.message || err);
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (clientEmail && privateKey) {
    return {
      clientEmail: clientEmail.trim(),
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

export function isServiceAccountConfigured() {
  return Boolean(parseServiceAccountCredentials());
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function getServiceAccountAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedSaToken && cachedSaExpiry > now + 60) {
    return cachedSaToken;
  }

  const creds = parseServiceAccountCredentials();
  if (!creds) return null;

  try {
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64UrlEncode(
      JSON.stringify({
        iss: creds.clientEmail,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    );

    const signingInput = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer
      .sign(creds.privateKey)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const assertion = `${signingInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      console.warn('OAuth2 token exchange failed:', tokenRes.status, errText);
      return null;
    }

    const tokenData = await tokenRes.json();
    if (tokenData.access_token) {
      cachedSaToken = tokenData.access_token;
      cachedSaExpiry = now + Number(tokenData.expires_in || 3600);
      return cachedSaToken;
    }
  } catch (err) {
    console.warn('Service account token generation error:', err?.message || err);
  }
  return null;
}

export function extractBearerToken(req) {
  if (!req || !req.headers) return null;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token.length > 20) return token;
  }
  const customToken = req.headers['x-firebase-token'];
  if (typeof customToken === 'string' && customToken.trim().length > 20) {
    return customToken.trim();
  }
  return null;
}

async function resolveFirestoreHeaders(userBearerToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  const saToken = await getServiceAccountAccessToken();
  if (saToken) {
    headers['Authorization'] = `Bearer ${saToken}`;
    return { headers, useApiKey: false, authMode: 'service_account' };
  }
  if (userBearerToken) {
    headers['Authorization'] = `Bearer ${userBearerToken}`;
    return { headers, useApiKey: true, authMode: 'user_token' };
  }
  return { headers, useApiKey: true, authMode: 'unauthenticated' };
}

export function unwrapFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
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
  if (!obj.id && typeof doc.name === 'string') {
    const parts = doc.name.split('/');
    obj.id = parts[parts.length - 1];
  }
  return obj;
}

export function wrapFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(wrapFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = wrapFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function wrapFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) {
      fields[k] = wrapFirestoreValue(v);
    }
  }
  return { fields };
}

function encodeDocPath(docPath) {
  return String(docPath)
    .split('/')
    .filter(Boolean)
    .map(seg => encodeURIComponent(seg))
    .join('/');
}

export async function fsGetDoc(docPath, userToken = null) {
  const { headers, useApiKey } = await resolveFirestoreHeaders(userToken);
  const qs = useApiKey ? `?key=${encodeURIComponent(FIREBASE_API_KEY)}` : '';
  const url = `${FIRESTORE_BASE}/${encodeDocPath(docPath)}${qs}`;
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, data: null, error: errBody?.error?.message || res.statusText };
    }
    const raw = await res.json();
    return { ok: true, status: res.status, data: unwrapFirestoreDoc(raw), error: null };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || 'Network error' };
  }
}

export async function fsCreateDoc(collectionName, documentId, data, userToken = null) {
  const { headers, useApiKey } = await resolveFirestoreHeaders(userToken);
  const params = new URLSearchParams();
  if (documentId) params.set('documentId', documentId);
  if (useApiKey) params.set('key', FIREBASE_API_KEY);
  const url = `${FIRESTORE_BASE}/${encodeURIComponent(collectionName)}?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(wrapFirestoreDoc(data)),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, error: errBody?.error?.message || res.statusText };
    }
    const raw = await res.json().catch(() => null);
    return { ok: true, status: res.status, data: raw ? unwrapFirestoreDoc(raw) : data, error: null };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || 'Network error' };
  }
}

export async function fsPatchDoc(docPath, data, fieldMask = null, userToken = null) {
  const { headers, useApiKey } = await resolveFirestoreHeaders(userToken);
  const params = new URLSearchParams();
  const keys = Array.isArray(fieldMask) && fieldMask.length > 0 ? fieldMask : Object.keys(data || {});
  keys.forEach(k => params.append('updateMask.fieldPaths', k));
  if (useApiKey) params.set('key', FIREBASE_API_KEY);
  const url = `${FIRESTORE_BASE}/${encodeDocPath(docPath)}?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(wrapFirestoreDoc(data)),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, error: errBody?.error?.message || res.statusText };
    }
    const raw = await res.json().catch(() => null);
    return { ok: true, status: res.status, data: raw ? unwrapFirestoreDoc(raw) : data, error: null };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || 'Network error' };
  }
}

export async function fsDeleteDoc(docPath, userToken = null) {
  const { headers, useApiKey } = await resolveFirestoreHeaders(userToken);
  const qs = useApiKey ? `?key=${encodeURIComponent(FIREBASE_API_KEY)}` : '';
  const url = `${FIRESTORE_BASE}/${encodeDocPath(docPath)}${qs}`;
  try {
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, error: errBody?.error?.message || res.statusText };
    }
    return { ok: true, status: res.status, error: null };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || 'Network error' };
  }
}

export async function fsRunQuery(collectionId, filters = [], limit = 200, userToken = null) {
  const { headers, useApiKey } = await resolveFirestoreHeaders(userToken);
  const qs = useApiKey ? `?key=${encodeURIComponent(FIREBASE_API_KEY)}` : '';
  const url = `${FIRESTORE_BASE}:runQuery${qs}`;

  const structuredQuery = {
    from: [{ collectionId }],
    limit,
  };

  if (Array.isArray(filters) && filters.length === 1) {
    const f = filters[0];
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: f.field },
        op: f.op || 'EQUAL',
        value: wrapFirestoreValue(f.value),
      },
    };
  } else if (Array.isArray(filters) && filters.length > 1) {
    structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: filters.map(f => ({
          fieldFilter: {
            field: { fieldPath: f.field },
            op: f.op || 'EQUAL',
            value: wrapFirestoreValue(f.value),
          },
        })),
      },
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ structuredQuery }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        documents: [],
        error: errBody?.error?.message || res.statusText,
      };
    }
    const rows = await res.json();
    const documents = Array.isArray(rows)
      ? rows.filter(r => r && r.document).map(r => unwrapFirestoreDoc(r.document)).filter(Boolean)
      : [];
    return { ok: true, status: res.status, documents, error: null };
  } catch (err) {
    return { ok: false, status: 0, documents: [], error: err?.message || 'Network error' };
  }
}
