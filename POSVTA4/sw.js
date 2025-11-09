/* ===========================================================
   🛰️ SERVICE WORKER – PROVSOFT POS
   Autor: Gerardo Ríos Quesada
   Fecha: 02-Nov-2025
   Descripción: Cache inteligente + sincronización ventas
   =========================================================== */

const CACHE_NAME = 'provsoft-pos-v2';
const STATIC_ASSETS = [
  './',
  './POSV4PASS.html',                // HTML principal
  './manifest.json',
  './logo_proveedora.webp',
  './html5-qrcode.min.js',
  './geoHelper.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable_icon.png',
  './offline.html',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap'
];

/* ===========================================================
   📦 INSTALACIÓN: cachea los archivos base
   =========================================================== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const url of STATIC_ASSETS) {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) await cache.put(url, res.clone());
            else console.warn(`⚠️ No se pudo cachear: ${url} (${res.status})`);
          } catch (err) {
            console.warn(`⚠️ Error cacheando ${url}:`, err.message);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

/* ===========================================================
   ⚙️ ACTIVACIÓN: limpia versiones antiguas
   =========================================================== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ===========================================================
   ⚡️ FETCH: estrategia mixta “stale-while-revalidate + network first”
   =========================================================== */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // ⛔ Ignorar peticiones a Firestore, Telegram o HTTP externos no seguros
  if (
    req.url.includes('firestore') ||
    req.url.includes('telegram') ||
    req.url.startsWith('chrome-extension') ||
    req.url.startsWith('data:')
  ) return;

  // 🧱 Archivos estáticos → cache first
  if (
    req.url.endsWith('.js') ||
    req.url.endsWith('.css') ||
    req.url.endsWith('.png') ||
    req.url.endsWith('.webp') ||
    req.url.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchAndUpdate = fetch(req).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return res;
        }).catch(() => cached); // si falla la red, devuelve el caché
        return cached || fetchAndUpdate;
      })
    );
    return;
  }

  // 🌐 Resto de peticiones → network first con fallback offline
  event.respondWith(
    fetch(req)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      })
      .catch(() => {
        // Si es navegación y no hay red, mostrar página offline
        if (req.mode === 'navigate') return caches.match('./offline.html');
        return caches.match(req);
      })
  );
});

/* ===========================================================
   🔁 SINCRONIZACIÓN EN SEGUNDO PLANO
   =========================================================== */
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-ventas-pendientes') {
    console.log('🔁 Sincronizando ventas pendientes...');
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) =>
      client.postMessage({ action: 'sincronizar' })
    );
  }
});

/* ===========================================================
   📡 RECONEXIÓN AUTOMÁTICA
   =========================================================== */
self.addEventListener('online', async () => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) =>
    client.postMessage({ action: 'sincronizar' })
  );
});

/* ===========================================================
   ✅ CONFIRMACIÓN DE REGISTRO
   =========================================================== */
console.log("🛰️ Service Worker PROVSOFT POS activo:", CACHE_NAME);
