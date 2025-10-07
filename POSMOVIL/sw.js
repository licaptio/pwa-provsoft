// =========================
// 📦 CONFIGURACIÓN BÁSICA
// =========================
const CACHE_NAME = "pos-ruta-cache-v1";
const URLS_TO_CACHE = [
  "/", 
  "index.html",
  "logo_proveedora.webp",
  "manifest.json",
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
];

// =========================
// 🧱 INSTALACIÓN
// =========================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  console.log("✅ Service Worker instalado");
});

// =========================
// ♻️ ACTIVACIÓN
// =========================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((n) => {
          if (n !== CACHE_NAME) return caches.delete(n);
        })
      )
    )
  );
  console.log("🔁 Service Worker activado");
});

// =========================
// 🌐 INTERCEPTAR PETICIONES
// =========================
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return (
        resp ||
        fetch(event.request).catch(() =>
          new Response("Offline", { status: 503, statusText: "Offline" })
        )
      );
    })
  );
});

// =========================
// 🔁 SINCRONIZACIÓN BACKGROUND
// =========================
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-ventas-pendientes") {
    event.waitUntil(
      (async () => {
        console.log("📡 Intentando sincronizar ventas pendientes...");
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ action: "sincronizar" })
          );
        });
      })()
    );
  }
});

// =========================
// ✉️ ESCUCHAR MENSAJES
// =========================
self.addEventListener("message", async (event) => {
  if (event.data?.action === "enviarTelegram") {
    await enviarTelegram(event.data.mensaje);
  }
});

// =========================
// 🚀 FUNCIÓN: Enviar a Telegram
// =========================
async function enviarTelegram(mensaje) {
  try {
    const BOT_TOKEN = "8272633411:AAE6uKTpEtPW--IPk6ufix_CDGJ0dH6ru4Q";
    const CHAT_ID = "6617988297";

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensaje,
        parse_mode: "Markdown",
      }),
    });

    console.log("✅ Mensaje enviado a Telegram desde SW");
  } catch (err) {
    console.error("❌ Error al enviar mensaje desde SW:", err);
  }
}
