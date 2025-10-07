const CACHE_NAME = "provpos-v2"; // cambia versión si actualizas
const ASSETS = [
  "./",
  "./index.html",
  "./logo_proveedora.webp",
  "./manifest.json"
];

// 📦 Instalar y cachear archivos base
self.addEventListener("install", e => {
  console.log("📦 Instalando Service Worker...");
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// 🚀 Activar SW
self.addEventListener("activate", e => {
  console.log("🚀 Activando Service Worker...");
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))
      )
    )
  );
  return self.clients.claim();
});

// 🌐 Interceptar peticiones y servir desde cache primero
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    caches.match(req).then(res =>
      res ||
      fetch(req).then(resp => {
        // No cachear llamadas a Firebase
        if (req.url.startsWith("http") && !req.url.includes("firebase")) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match("./index.html"))
    )
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
