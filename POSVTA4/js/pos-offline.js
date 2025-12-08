// ==========================================================
// POS-OFFLINE — PROVSOFT
// Manejo de ventas offline + reintentos automáticos
// ==========================================================

// Tomamos funciones globales desde window
const toast = window.toast;

// Llave del localStorage
const STORAGE_KEY = "ventas_pendientes";

// -------------------------------------------
// 📦 OBTENER COLA DE VENTAS PENDIENTES
// -------------------------------------------
function obtenerPendientes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

// -------------------------------------------
// 💾 GUARDAR COLA
// -------------------------------------------
function guardarPendientes(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// -------------------------------------------
// ➕ AGREGAR VENTA A COLA OFFLINE
// -------------------------------------------
function agregarVentaOffline(venta) {
  const arr = obtenerPendientes();
  arr.push(venta);
  guardarPendientes(arr);
  toast("Venta guardada sin internet", "#f59e0b");
}

// -------------------------------------------
// 📤 INTENTAR ENVIAR UNA VENTA
// -------------------------------------------
async function enviarVentaFirebase(venta) {
  try {
    // Usamos el mismo flujo del service worker o backend
    const res = await fetch("/firebase-proxy/guardarVenta", {
      method: "POST",
      body: JSON.stringify(venta),
    });

    if (!res.ok) throw new Error("Error enviando venta");

    console.log("🟢 Venta enviada correctamente");
    return true;

  } catch (err) {
    console.warn("🔴 No se pudo enviar (queda pendiente):", err);
    return false;
  }
}

// -------------------------------------------
// 🚀 REENVIAR TODAS LAS VENTAS PENDIENTES
// -------------------------------------------
async function reenviarVentasPendientes() {
  const pendientes = obtenerPendientes();
  if (pendientes.length === 0) return;

  console.log(`📡 Intentando enviar ${pendientes.length} ventas...`);

  const nuevas = [];

  for (const venta of pendientes) {
    const ok = await enviarVentaFirebase(venta);
    if (!ok) nuevas.push(venta);
  }

  guardarPendientes(nuevas);

  if (nuevas.length === 0) {
    toast("Todas las ventas pendientes fueron enviadas", "#16a34a");
  } else {
    toast(`Quedan ${nuevas.length} ventas pendientes`, "#f39c12");
  }
}

// -------------------------------------------
// 🌐 DETECTAR VUELTA DE INTERNET
// -------------------------------------------
window.addEventListener("online", () => {
  console.log("📶 Internet volvió, reintentando...");
  reenviarVentasPendientes();
});

// -------------------------------------------
// 🔁 MENSAJES DESDE EL SERVICE WORKER
// -------------------------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data && event.data.action === "sincronizar") {
      console.log("📩 SW pidió sincronizar ventas");
      reenviarVentasPendientes();
    }
  });
}

// -------------------------------------------
// Exponer funciones para uso global
// -------------------------------------------
window.agregarVentaOffline = agregarVentaOffline;
window.reenviarVentasPendientes = reenviarVentasPendientes;
