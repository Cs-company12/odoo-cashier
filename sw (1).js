const CACHE_NAME = 'daryeelka-aabe-v1';
const FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES)).catch(()=>{})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Show a persistent notification triggered from the page (works even if the
// tab is in the background, as long as the browser process is alive).
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Xasuusin', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      requireInteraction: true,
      tag: 'daryeelka-aabe-shift',
      renotify: true,
      vibrate: [200, 100, 200]
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});

// Best-effort: Periodic Background Sync (Chrome/Android, installed PWA only).
// Most browsers do not support this yet — the page-based timer is the
// reliable mechanism while the app tab is open.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daryeelka-aabe-check') {
    event.waitUntil(
      self.registration.showNotification('Jadwalka Daryeelka Aabe', {
        body: 'Fadlan fur app-ka si aad u hubiso qofka joogitaanka ah.',
        icon: './icon-192.png',
        requireInteraction: true
      })
    );
  }
});
