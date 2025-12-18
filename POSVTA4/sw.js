/* ===========================================================
   🛰️ SERVICE WORKER – PROVSOFT POS OFFLINE TOTAL (v10)
   Autor: Gerardo Ríos Quesada
   =========================================================== */

const VERSION = "provsoft-cache-v2-xmas";
const CACHE = VERSION;

// Cache estático fundamental
const STATIC_ASSETS = [
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

  // Google Fonts
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap"
];

/* ===========================================================
   📦 INSTALL — Cache estático
   =========================================================== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const res = await fetch(asset, { cache: "no-store" });
          if (res.ok) cache.put(asset, res.clone());
        } catch (e) {
          console.warn("⚠ No se pudo cachear:", asset);
        }
      }
    })
  );
  self.skipWaiting();
});

/* ===========================================================
   🧹 ACTIVATE — Limpieza de versiones viejas
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
   📦 CACHE DINÁMICO — Catálogo, precios, equivalencias, departamentos
   =========================================================== */
const DYNAMIC_KEYS = [
  "/catalogo",
  "/precios",
  "/equivalencias",
  "/departamentos"
];

/* ===========================================================
   ⚡ FETCH OFFLINE FIRST + CACHE DINÁMICO
   =========================================================== */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  // Ignorar Firestore real → solo manejamos catálogo si la app lo manda
  if (url.includes("firestore")) return;

  // Rutas dinámicas (la app las usa con fetch)
  if (DYNAMIC_KEYS.some((key) => url.includes(key))) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
const fetchAndUpdate = fetch(req)
  .then((netRes) => {
    if (
      netRes &&
      netRes.status === 200 &&
      netRes.type === "basic" &&
      req.method === "GET"
    ) {
      caches.open(CACHE).then((cache) =>
        cache.put(req, netRes.clone())
      );
    }
    return netRes;
  })
          .catch(() => cachedRes || new Response("[]"));
        return cachedRes || fetchAndUpdate;
      })
    );
    return;
  }

  // Archivos estáticos → offline first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

return fetch(req)
  .then((res) => {
    if (
      !res ||
      res.status !== 200 ||
      res.type !== "basic" ||
      req.method !== "GET"
    ) {
      return res;
    }

    const resClone = res.clone();
    caches.open(CACHE).then((c) => c.put(req, resClone));
    return res;
  })

        .catch(() => req.mode === "navigate"
          ? caches.match("./offline.html")
          : new Response("Offline", { status: 503 })
        );
    })
  );
});

/* ===========================================================
   🧾 VENTAS OFFLINE — Guardadas en SW para sincronizar
   =========================================================== */
self.addEventListener("sync", async (event) => {
  if (event.tag === "sync-ventas-pendientes") {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ action: "sincronizar" }));
  }
});

