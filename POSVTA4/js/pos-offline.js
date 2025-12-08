// ==========================================================
// POS-OFFLINE — PROVSOFT
// Manejo profesional de ventas sin internet + reintentos
// ==========================================================

// Usamos window.toast en vez de import
const STORAGE_KEY = "ventas_pendientes";

const $toast = (msg, color) => window.toast(msg, color);

// -------------------------------------------
// 📦 OBTENER COLA DE VENTAS PENDIENTES
// -------------------------------------------
window.obtenerPendientes = function () {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// -------------------------------------------
// 💾 GUARDAR COLA ACTUALIZADA
// -------------------------------------------
window.guardarPendientes = function (arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
};

// -------------------------------------------
// ➕ AGREGAR UNA VENTA A LA COLA OFFLINE
// -------------------------------------------
window.agregarVentaOffline = function (venta) {
  const arr = window.obtenerPendientes();
  arr.push(venta);
  window.guardarPendientes(arr);
  $toast("Venta guardada en modo offline", "#f59e0b");
};

// -------------------------------------------
// 🚀 REENVIAR TODAS LAS VENTAS PENDIENTES
// -------------------------------------------
window.reenviarVentasPendientes = async function () {
  const pendientes = window.obtenerPendientes();

  if (pendientes.length === 0) return;

  console.log(`📡 Intentando enviar ${pendientes.length} ventas pendientes...`);

  const nuevasPendientes = [];

  for (const venta of pendientes) {
    const ok = await enviarVentaFirebase(venta);
    if (!ok) nuevasPendientes.push(venta);
  }

  window.guardarPendientes(nuevasPendientes);

  if (nuevasPendientes.length === 0) {
    $toast("Todas las ventas pendientes fueron sincronizadas", "#16a34a");
  } else {
    $toast(`Quedan ${nuevasPendientes.length} ventas sin enviar`, "#f39c12");
  }
};

// -------------------------------------------
// 📤 INTENTAR ENVIAR UNA VENTA A FIREBASE
// -------------------------------------------
async function enviarVentaFirebase(venta) {
  try {
    const res = await fetch("/firebase-proxy/guardarVenta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venta),
    });

    if (!res.ok) throw new Error("Error enviando venta");

    console.log("🟢 Venta enviada correctamente");
    return true;

  } catch (err) {
    console.warn("🔴 Falló envío, quedará pendiente:", err);
    return false;
  }
}

// -------------------------------------------
// 🌐 SI VUELVE INTERNET → REINTENTAR
// -------------------------------------------
window.addEventListener("online", () => {
  console.log("📶 Conexión restaurada, reintentando sincronización…");
  window.reenviarVentasPendientes();
});

// -------------------------------------------
// 🔁 MENSAJES DEL SERVICE WORKER
// -------------------------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data && event.data.action === "sincronizar") {
      console.log("📩 SW pidió sincronización");
      window.reenviarVentasPendientes();
    }
  });
}
