const CACHE_NAME = 'daryeelka-aabe-v2';
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

// ============================================================
// IndexedDB: waxaan ku kaydinnaa nuqul ka mid ah jadwalka iyo
// dejinta (week, customSchedule, intervals), maadaama Service
// Worker-ku uusan gali karin localStorage-ka bogga.
// ============================================================
const IDB_NAME = 'daryeelka-aabe-db';
const IDB_STORE = 'config';

function idbOpen(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSaveConfig(config){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(config, 'current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetConfig(){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ============================================================
// Nuqulka jadwalka + xisaabta (isla mid ah tan index.html) si
// Service Worker-ku uu isagu u xisaabin karo qofka joogitaanka
// ah, xitaa haddii bogga la xidho.
// ============================================================
const days = ["Sabti", "Axad", "Isniin", "Talaado", "Arbaco", "Khamiis", "Jimce"];
const jsDayToIndex = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 }; // Sat=0 ... Fri=6

const baseSchedule = {
  "Sabti":   { maalin: "Ibraheem Abdulkader", galab: "Mustafe", habeen: "Cumar" },
  "Axad":    { maalin: "Haaruun", galab: "Cumar", habeen: "Ugaas Maxamuud" },
  "Isniin":  { maalin: "Cumar", galab: "Ibraheem Abdulkader", habeen: "Ibraheem Abdulkader" },
  "Talaado": { maalin: "Mustafe", galab: "Ciise", habeen: "Haaruun" },
  "Arbaco":  { maalin: "Cumar", galab: "Mustafe", habeen: "Ciise" },
  "Khamiis": { maalin: "Haaruun", galab: "Cumar", habeen: "Mustafe" },
  "Jimce":   { maalin: "Ciise", galab: "Ciise", habeen: null }
};

function getSchedule(week, customSchedule){
  if(customSchedule && customSchedule[String(week)]){
    return JSON.parse(JSON.stringify(customSchedule[String(week)]));
  }
  const sched = JSON.parse(JSON.stringify(baseSchedule));
  sched["Jimce"].habeen = (week == 1) ? "Dr. Xaaris" : "Dr. Yaxye";
  return sched;
}

function getCurrentShiftInfo(week, customSchedule){
  const now = new Date();
  const jsDay = now.getDay();
  const idx = jsDayToIndex[jsDay];
  const dayName = days[idx];
  const h = now.getHours() + now.getMinutes() / 60;

  let shift, shiftLabel;
  if(h >= 8.5 && h < 14){ shift = "maalin"; shiftLabel = "🌞 Maalin (8:30 AM–2:00 PM)"; }
  else if(h >= 14 && h < 18){ shift = "galab"; shiftLabel = "🌇 Galab (2:00 PM–6:00 PM)"; }
  else { shift = "habeen"; shiftLabel = "🌙 Habeen (Seexasho — laga bilaabo 6:00 PM)"; }

  // Xisaabta Islaamka: maalintu waxay isbadashaa Magrib (6:00 PM).
  let scheduleDayName = dayName;
  if(shift === "habeen" && h >= 18){
    const nextIdx = (idx + 1) % 7;
    scheduleDayName = days[nextIdx];
  }

  const sched = getSchedule(week, customSchedule);
  const person = sched[scheduleDayName] ? sched[scheduleDayName][shift] : null;

  return { dayName, scheduleDayName, shift, shiftLabel, person, now };
}

// ============================================================
// Fariimaha ka imanaya bogga (index.html)
// ============================================================
self.addEventListener('message', (event) => {
  const data = event.data || {};

  if(data.type === 'SHOW_NOTIFICATION'){
    self.registration.showNotification(data.title || 'Jadwalka Daryeelka Aabe', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      requireInteraction: true,
      tag: 'daryeelka-aabe'
    });
  }

  if(data.type === 'SYNC_CONFIG' && data.config){
    event.waitUntil(idbSaveConfig(data.config));
  }
});

// ============================================================
// Periodic Background Sync — u shaqeeya kaliya PWA-yada la
// rakibay ee Chrome/Android, oo ogolaanshahoodu la siiyay.
// Marka la wado, wuxuu isaguu xisaabinayaa qofka joogitaanka ah
// (adiga oo aan u baahnayn in app-ku furan yahay) oo u soo
// diraya ogeysiin leh magaciisa saxda ah.
// ============================================================
self.addEventListener('periodicsync', (event) => {
  if(event.tag === 'daryeelka-aabe-check'){
    event.waitUntil(
      idbGetConfig().then((config) => {
        const week = (config && config.week) || "1";
        const customSchedule = config && config.customSchedule;
        const info = getCurrentShiftInfo(week, customSchedule);
        if(info.person){
          return self.registration.showNotification("👤 Qofka Joogitaanka Ah: " + info.person, {
            body: info.shiftLabel + " — " + info.dayName,
            icon: './icon-192.png',
            badge: './icon-192.png',
            requireInteraction: true,
            tag: 'daryeelka-aabe'
          });
        }
      }).catch(() => {
        // Haddii aan weli config la kaydin (bogga aan weli la furin marnaba),
        // u dir fariin guud.
        return self.registration.showNotification('🕊️ Jadwalka Daryeelka Aabe', {
          body: 'Fur app-ka si aad u aragto qofka joogitaanka ah hadda.',
          icon: './icon-192.png',
          tag: 'daryeelka-aabe-periodic'
        });
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.some((c) => {
        if('focus' in c){ c.focus(); return true; }
        return false;
      });
      if(!hadWindow && self.clients.openWindow){
        return self.clients.openWindow('./index.html');
      }
    })
  );
});
