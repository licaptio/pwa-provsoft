const CACHE_NAME = "provpos-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo_proveedora.webp",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

// 📦 Instalar y cachear archivos base
self.addEventListener("install", e => {
  console.log("📦 Instalando Service Worker...");
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 🚀 Activar SW y limpiar versiones viejas
self.addEventListener("activate", e => {
  console.log("🚀 Activando Service Worker...");
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 🌐 Interceptar peticiones y servir desde cache primero
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    caches.match(req).then(res => {
      if (res) return res;
      return fetch(req)
        .then(resp => {
          // Evita cachear peticiones dinámicas (Firebase, APIs, etc.)
          if (req.url.startsWith("http") && !req.url.includes("firebase")) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match("/index.html")); // ✅ FIX absoluto
    })
  );
});

// 🔁 Sincronización en background
self.addEventListener("sync", event => {
  if (event.tag === "sync-ventas-pendientes") {
    console.log("🔁 Iniciando sincronización en background...");
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client =>
          client.postMessage({ action: "sincronizar" })
        );
      })
    );
  }
});
