/* ===========================================================
   🔒 PROVSOFT POS – SERVICE WORKER V3 (STABLE)
   =========================================================== */

const CACHE_NAME = "provsoft-pos-v3.1.1";

// ⚠️ RUTAS RELATIVAS A POSV3
const APP_SHELL = [
  "./",
  "./index.html",
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

// Datos offline reales (YA EXISTEN)
const DATA_CACHE = [
  "./data/productos.json",
  "./data/departamentos.json"
];

/* ================= INSTALL ================= */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([...APP_SHELL, ...DATA_CACHE])
    )
  );
  self.skipWaiting();
});

/* ================= ACTIVATE ================= */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ================= FETCH ================= */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
