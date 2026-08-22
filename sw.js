/* Service worker: A2HS + FCM background push for TNIT. */
/* global importScripts, firebase */

importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBIQrLARWje_fe7TX7f2u0Wk7xjFDAyNcs',
  authDomain: 'tnit-6c48d.firebaseapp.com',
  projectId: 'tnit-6c48d',
  storageBucket: 'tnit-6c48d.firebasestorage.app',
  messagingSenderId: '649245917670',
  appId: '1:649245917670:web:dce565a213bade09fc1627'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title)
    || (payload.data && payload.data.title)
    || 'TNIT';
  const body = (payload.notification && payload.notification.body)
    || (payload.data && payload.data.body)
    || '';
  const data = payload.data || {};
  const options = {
    body,
    icon: './assets/heart.png',
    badge: './assets/heart.png',
    data,
    tag: data.tag || 'tnit-push',
    renotify: true
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        await client.focus();
        if (client.navigate && rawUrl) {
          try { await client.navigate(rawUrl); } catch (_) { /* ignore */ }
        }
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(rawUrl);
  })());
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
