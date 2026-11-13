import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying the firestoreDatabaseId
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline or connecting.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

/**
 * Authenticated fetch wrapper that attaches the active Firebase ID Token
 * on same-origin /api/* requests without mutating global window.fetch.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isLocalApi =
      urlStr.startsWith('/api/') ||
      (typeof window !== 'undefined' &&
        typeof window.location?.origin === 'string' &&
        urlStr.startsWith(`${window.location.origin}/api/`));

    if (isLocalApi && auth.currentUser) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) {
        const token = await auth.currentUser.getIdToken().catch(() => null);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
      return fetch(input, { ...init, headers });
    }
  } catch {
    // Fall through cleanly to native fetch
  }
  return fetch(input, init);
}
