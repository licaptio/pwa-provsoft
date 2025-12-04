/* ===========================================================
   🛰️ SERVICE WORKER – PROVSOFT POS 2025
   Optimizado para carga instantánea + cache persistente
   =========================================================== */

const VERSION = "v7-prosoft-pos";
const CACHE = VERSION;

// Archivos críticos
const ASSETS = [
  "./",
  "./POSV4PASS.html",
  "./manifest.json",
  "./offline.html",
  "./logo_proveedora.webp",
  "./html5-qrcode.min.js",
  "./geoHelper.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable_icon.png",

  // Firebase
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",

  // jsPDF
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",

  // Google Fonts (CSS)
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap",
];

/* ===========================================================
   📦 INSTALL — Cache first, no revalidación
   =========================================================== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const asset of ASSETS) {
        try {
          const res = await fetch(asset, { cache: "no-store" });
          if (res.ok) cache.put(asset, res.clone());
        } catch (err) {
          console.warn("⚠ No se pudo cachear:", asset);
        }
      }
    })
  );
  self.skipWaiting();
});

/* ===========================================================
   🧹 ACTIVATE — Limpia versiones viejas
   =========================================================== */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE && caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ===========================================================
   ⚡ FETCH — Estrategia OFFLINE-FIRST para todo
   =========================================================== */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Ignorar API externas (Telegram, Firestore, etc.)
  if (
    req.url.includes("googleapis.com") ||
    req.url.includes("gstatic.com") ||
    req.url.includes("firestore") ||
    req.url.includes("googleusercontent") ||
    req.url.includes("telegram")
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      // Si existe en caché → usar ya
      if (cached) return cached;

      // Si no → descargar y guardar
      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") return caches.match("./offline.html");
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

/* ===========================================================
   🔁 SYNC — Reenviar ventas pendientes
   =========================================================== */
self.addEventListener("sync", async (event) => {
  if (event.tag === "sync-ventas-pendientes") {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ action: "sincronizar" }));
  }
});
