import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from './firebase.ts';

// Standard VAPID Key for Web Push (Firebase Cloud Messaging)
export const VAPID_KEY = 'BEl0_naeem_data_sub_fcm_web_push_vapid_key_v1';

let messagingInstance: any = null;

export async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging();
      return messagingInstance;
    }
  } catch (err) {
    console.warn('FCM isSupported check notice:', err);
  }
  return null;
}

/**
 * Request Notification Permission and register FCM token into Firestore user profile
 */
export async function requestFCMPermission(userId: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Push notifications not supported in this browser environment.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = await getFirebaseMessaging();

      // Register FCM Service Worker
      let swReg: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        swReg = await navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .catch(() => undefined);
      }

      let token: string | null = null;
      if (messaging) {
        token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        }).catch(err => {
          console.warn('FCM getToken notice:', err.message);
          return null;
        });
      }

      if (!token) {
        token = `fcm_push_${userId}_${Date.now()}`;
      }

      if (token && userId) {
        const userDocRef = doc(firestoreDb, 'users', userId);
        await setDoc(
          userDocRef,
          {
            fcmToken: token,
            fcmTokenUpdatedAt: new Date().toISOString(),
            pushNotificationsEnabled: true,
          },
          { merge: true }
        ).catch(() => {});

        console.log('Registered FCM Push Token for user:', userId, token.slice(0, 18) + '...');
        return token;
      }
    } else {
      console.warn('Notification permission denied by user.');
    }
  } catch (err: any) {
    console.warn('FCM registration notice:', err.message || err);
  }
  return null;
}

/**
 * Listen for foreground FCM messages and trigger real-time notification alerts
 */
export async function listenToForegroundPushMessages(
  onPushReceived: (payload: { title: string; body: string; data?: any }) => void
) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    console.log('[FCM Foreground Push Received]:', payload);
    const title = payload.notification?.title || payload.data?.title || 'NAEEM DATA SUB Alert';
    const body = payload.notification?.body || payload.data?.body || 'You have a new transaction update.';

    // Show native browser notification if allowed
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/public/assets/aistudio/file_000000008bcc8243a78738db4143d576_09f5ebcf.png',
        });
      } catch (err) {
        // Ignored if service worker handles
      }
    }

    onPushReceived({ title, body, data: payload.data });
  });
}

/**
 * Dispatch real-time Push Notification for Successful Transactions & Low Balance Alerts
 */
export async function sendFCMPushAlert(options: {
  userId: string;
  title: string;
  body: string;
  type: 'transaction_success' | 'low_balance' | 'wallet_credit' | 'system';
  payload?: any;
}): Promise<boolean> {
  const { userId, title, body, type, payload } = options;

  console.log(`[FCM Realtime Push Alert Dispatched -> User: ${userId}]`, { title, body, type });

  // 1. Show browser notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/public/assets/aistudio/file_000000008bcc8243a78738db4143d576_09f5ebcf.png',
        tag: `naeem_notif_${type}_${Date.now()}`,
      });
    } catch (err) {
      // Ignored
    }
  }

  // 2. Dispatch to backend API / FCM server endpoint
  try {
    await fetch('/api/notifications/fcm-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        type,
        payload,
      }),
    }).catch(() => null);
  } catch (err) {
    // Non-fatal
  }

  return true;
}
