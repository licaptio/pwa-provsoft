// 🧠 PROVSOFT – Service Worker Offline & Sync
const CACHE_NAME = "provsoft-pos-v4-cache";
const OFFLINE_QUEUE = "ventas_pendientes";
const STATIC_ASSETS = [
  "./",
  "./POS_RUTA_PROVSOFT_V4_DESC.html",
  "./manifest.json",
  "./logo_proveedora.webp",
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://unpkg.com/html5-qrcode"
];

// 🔹 Instalar y cachear recursos base
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
  console.log("✅ Service Worker instalado");
});

// 🔹 Activar y limpiar versiones viejas
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
  console.log("♻️ Service Worker activado y limpio");
});

// 🔹 Interceptar peticiones
self.addEventListener("fetch", (e) => {
  const req = e.request;

  // No interferir con peticiones de Firebase
  if (req.url.includes("firestore.googleapis.com")) return;

  // Estrategia: Cache first, fallback a red
  e.respondWith(
    caches.match(req).then(res => {
      return (
        res ||
        fetch(req)
          .then(netRes => {
            // cache dinámico
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(req, netRes.clone());
              return netRes;
            });
          })
          .catch(() => {
            // fallback offline básico
            if (req.destination === "document") {
              return caches.match("./POS_RUTA_PROVSOFT_V4_DESC.html");
            }
          })
      );
    })
  );
});

// =============================
// 🧩 MODO OFFLINE DE VENTAS
// =============================

// Guardar venta cuando no hay red
self.addEventListener("message", async (e) => {
  if (e.data?.type === "guardarVentaOffline") {
    const venta = e.data.venta;
    const db = await openDB();
    const tx = db.transaction(OFFLINE_QUEUE, "readwrite");
    tx.objectStore(OFFLINE_QUEUE).add(venta);
    await tx.done;
    console.log("💾 Venta guardada offline:", venta.folio);
  }

  if (e.data?.type === "sincronizarVentas") {
    sincronizarVentas();
  }
});

// Base IndexedDB para ventas
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("provsoft-pos-db", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE)) {
        db.createObjectStore(OFFLINE_QUEUE, { keyPath: "folio" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

// Reintentar ventas pendientes cuando hay conexión
async function sincronizarVentas() {
  const db = await openDB();
  const tx = db.transaction(OFFLINE_QUEUE, "readonly");
  const store = tx.objectStore(OFFLINE_QUEUE);
  const req = store.getAll();

  req.onsuccess = async () => {
    const ventas = req.result;
    if (!ventas.length) return console.log("✅ No hay ventas pendientes.");

    for (const v of ventas) {
      try {
        await fetch("https://firestore.googleapis.com/v1/projects/inventariopv-643f1/databases/(default)/documents/rutas_venta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: v })
        });
        console.log("📤 Venta sincronizada:", v.folio);
        // Borrar después de sincronizar
        const delTx = db.transaction(OFFLINE_QUEUE, "readwrite");
        delTx.objectStore(OFFLINE_QUEUE).delete(v.folio);
        await delTx.done;
      } catch (err) {
        console.warn("⚠️ No se pudo sincronizar:", v.folio, err);
      }
    }
  };
}
