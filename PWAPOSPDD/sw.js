const CACHE_NAME = "provpos-v3";
const ASSETS = [
    "./",
  "./index.html",
  "./manifest.json",
  "./logo_proveedora.webp",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png"
];

// 📦 Instalar y cachear los archivos base
self.addEventListener("install", (event) => {
  console.log("📦 Instalando Service Worker...");
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// 🚀 Activar y limpiar versiones viejas
self.addEventListener("activate", (event) => {
  console.log("🚀 Activando Service Worker...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  return self.clients.claim();
});

// 🌐 Estrategia: cache-first, fallback a red
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match("/POSMOVIL/index.html"))
    )
  );
});
