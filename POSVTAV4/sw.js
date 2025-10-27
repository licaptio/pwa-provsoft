// ==== PROVSOFT Service Worker (modo offline básico) ====
const CACHE_NAME = "provsoft-pos-v4";
const FILES_TO_CACHE = [
  "./",
  "./POS_RUTA_PROVSOFT_V4_DESC.html",
  "./manifest.json",
  "./logo_proveedora.webp"
];

// Instalación y cache inicial
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activación y limpieza
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Respuesta desde caché
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
