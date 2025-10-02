const CACHE_NAME = "buscador-cache-v4";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/producto.html",
  "/html5-qrcode.min.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Instalar y cachear
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("📦 Archivos cacheados");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Interceptar peticiones
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => {
      // 🔹 Si existe en caché, úsalo
      if (resp) {
        return resp;
      }
      // 🔹 Si no hay conexión y es navegación, mostrar index.html
      if (e.request.mode === "navigate") {
        return caches.match("/index.html");
      }
      // 🔹 Si no, intenta ir a la red
      return fetch(e.request).catch(() => caches.match("/index.html"));
    })
  );
});
