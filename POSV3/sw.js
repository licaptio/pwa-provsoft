/* ===========================================================
   🔒 PROVSOFT POS – SERVICE WORKER V3
   ===========================================================
   OBJETIVO:
   - Cachear app completa
   - Permitir venta offline total
   - Controlar versiones
   =========================================================== */

const CACHE_NAME = "provsoft-pos-v3.0.0";

// Archivos críticos (APP SHELL)
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/build/pos.bundle.min.js",
  "/css/pos.css"
];

// Datos críticos (catálogo offline)
// 👉 estos deben existir como endpoints o JSON local
const DATA_CACHE = [
  "/data/productos.json",
  "/data/departamentos.json"
];

/* ===========================================================
   📦 INSTALL: cache inicial
   =========================================================== */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([...APP_SHELL, ...DATA_CACHE]);
    })
  );
  self.skipWaiting();
});

/* ===========================================================
   🔁 ACTIVATE: limpiar versiones viejas
   =========================================================== */
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

/* ===========================================================
   🌐 FETCH: estrategia híbrida
   =========================================================== */
self.addEventListener("fetch", event => {
  const { request } = event;

  // Solo GET
  if (request.method !== "GET") return;

  // 1️⃣ APP SHELL → CACHE FIRST
  if (APP_SHELL.some(url => request.url.includes(url))) {
    event.respondWith(
      caches.match(request).then(res => res || fetch(request))
    );
    return;
  }

  // 2️⃣ DATOS → NETWORK FIRST / CACHE FALLBACK
  if (DATA_CACHE.some(url => request.url.includes(url))) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3️⃣ TODO LO DEMÁS → NETWORK NORMAL
});
