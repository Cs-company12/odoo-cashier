const CACHE_NAME = 'daryeelka-aabe-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
  );
});

// Messages from the page asking us to show a notification (works even if
// the tab is backgrounded, since the Service Worker stays alive longer).
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Jadwalka Daryeelka Aabe', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      requireInteraction: true,
      tag: 'daryeelka-aabe'
    });
  }
});

// Best-effort periodic background sync (only supported in some installed,
// Android/Chrome PWAs). Full shift logic lives in the page's JS, so this is
// a general nudge to reopen the app and check who is currently on duty.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daryeelka-aabe-check') {
    event.waitUntil(
      self.registration.showNotification('🕊️ Jadwalka Daryeelka Aabe', {
        body: 'Fur app-ka si aad u aragto qofka joogitaanka ah hadda.',
        icon: './icon-192.png',
        requireInteraction: false,
        tag: 'daryeelka-aabe-periodic'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.some((c) => {
        if ('focus' in c) { c.focus(); return true; }
        return false;
      });
      if (!hadWindow && self.clients.openWindow) {
        return self.clients.openWindow('./index.html');
      }
    })
  );
});
