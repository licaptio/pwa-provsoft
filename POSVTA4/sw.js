const CACHE_NAME = 'provsoft-pos-v1';
const STATIC_ASSETS = [
  './',
  './POSV4PASS.html',     // ✅ Nombre real del archivo
  './manifest.json',
  './logo_proveedora.webp',
  './html5-qrcode.min.js',
  './geoHelper.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable_icon.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap'
];

// 🧩 Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        STATIC_ASSETS.map(url =>
          fetch(url)
            .then(res => {
              if (!res.ok) throw new Error(`❌ No se pudo cachear ${url}`);
              return cache.put(url, res);
            })
            .catch(err => console.warn("⚠️", err.message))
        )
      )
    )
  );
  self.skipWaiting();
});
