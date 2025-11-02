const CACHE_NAME = 'provsoft-pos-v1';
const STATIC_ASSETS = [
  './',
  './POS_RUTA_PROVSOFT_V3_DESC.html',
  './app.js', // 👈 agrega esta línea
  './manifest.json',
  './logo_proveedora.webp',
  './html5-qrcode.min.js',
  './geoHelper.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable_icon.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap'
];

// 📦 INSTALACIÓN DEL SW: cachea todos los archivos base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ⚙️ ACTIVACIÓN: limpia versiones antiguas del cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ⚡️ ESTRATEGIA DE CACHE: “Network first, fallback to cache”
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignorar llamadas a Firestore/Telegram (que requieren conexión)
  if (req.url.includes('firestore') || req.url.includes('telegram')) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// 🛰️ Sincronización en segundo plano (ventas pendientes)
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-ventas-pendientes') {
    console.log('🔁 Sincronizando ventas pendientes...');
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => client.postMessage({ action: 'sincronizar' }));
  }
});

// 🔔 Notificación cuando vuelva la conexión
self.addEventListener('online', async () => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ action: 'sincronizar' }));
});
