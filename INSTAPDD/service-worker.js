const CACHE_NAME = "instapdd-cache-v4";  // <-- sube versión para forzar actualización

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./upload.html",
  "./viewer.html",
  "./manifest.json"
];

// INSTALACIÓN
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // <-- fuerza a reemplazar el SW sin esperar
});

// ACTIVACIÓN
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  clients.claim(); // <-- activa inmediatamente
});

// RESPONDER PETICIONES
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
