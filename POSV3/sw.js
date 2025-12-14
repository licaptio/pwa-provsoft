const CACHE = "provsoft-pos-v3.2";

/* STATIC */
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo_proveedora.webp",
  "./js/app.js",
  "./js/core/scanner.js",
  "./js/core/carrito.js",
  "./js/core/render.js",
  "./js/core/totales.js",
  "./js/core/descuento.js",
  "./js/core/cobro.js",
  "./js/core/persistencia.js",
  "./js/core/ticket.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // 🔥 DATOS DE NEGOCIO → NETWORK FIRST
  if (url.pathname.includes("/data/")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 🧱 APP SHELL → CACHE FIRST
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
