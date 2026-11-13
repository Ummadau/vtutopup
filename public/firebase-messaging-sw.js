// Firebase Cloud Messaging Web Push Service Worker for NPay
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBqaJeymaKiXVij6eypZQJFgK2dOH5CoTA",
  projectId: "gen-lang-client-0376919977",
  messagingSenderId: "648850599034",
  appId: "1:648850599034:web:294766b8a12c33eb805fc3",
});

const messaging = firebase.messaging();

// Background Push Notification Handler
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM Service Worker Background Message]:', payload);
  const title = payload.notification?.title || payload.data?.title || 'NPay Push Notification';
  const body = payload.notification?.body || payload.data?.body || 'You have received a new transaction or wallet alert.';
  
  const options = {
    body,
    icon: '/public/assets/aistudio/file_000000008bcc8243a78738db4143d576_09f5ebcf.png',
    badge: '/public/assets/aistudio/file_000000008bcc8243a78738db4143d576_09f5ebcf.png',
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});
