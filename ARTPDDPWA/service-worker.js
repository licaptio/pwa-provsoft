const CACHE_NAME = "buscador-cache-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/html5-qrcode.min.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Instalar y cachear
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

// Activar y limpiar caches viejos
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Interceptar peticiones
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
