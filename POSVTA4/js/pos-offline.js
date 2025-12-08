// ==========================================================
// POS-OFFLINE — PROVSOFT
// Manejo profesional de ventas sin internet + reintentos
// ==========================================================

import { toast } from "./pos-core.js";

const STORAGE_KEY = "ventas_pendientes";

// -------------------------------------------
// 📦 OBTENER COLA DE VENTAS PENDIENTES
// -------------------------------------------
export function obtenerPendientes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

// -------------------------------------------
// 💾 GUARDAR COLA ACTUALIZADA
// -------------------------------------------
export function guardarPendientes(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// -------------------------------------------
// ➕ AGREGAR UNA VENTA A LA COLA OFFLINE
// (si falló en Firebase)
// -------------------------------------------
export function agregarVentaOffline(venta) {
  const arr = obtenerPendientes();
  arr.push(venta);
  guardarPendientes(arr);
  toast("Venta guardada en modo offline", "#f59e0b");
}

// -------------------------------------------
// 🚀 REENVIAR TODAS LAS VENTAS PENDIENTES
// -------------------------------------------
export async function reenviarVentasPendientes() {
  const pendientes = obtenerPendientes();

  if (pendientes.length === 0) return;

  console.log(`📡 Intentando enviar ${pendientes.length} ventas pendientes...`);

  // Intentar enviar una por una
  const nuevasPendientes = [];

  for (const venta of pendientes) {
    const ok = await enviarVentaFirebase(venta);

    if (!ok) {
      nuevasPendientes.push(venta); // aún no se pudo enviar
    }
  }

  guardarPendientes(nuevasPendientes);

  if (nuevasPendientes.length === 0) {
    toast("Todas las ventas pendientes fueron sincronizadas", "#16a34a");
  } else {
    toast(`Quedan ${nuevasPendientes.length} ventas sin enviar`, "#f39c12");
  }
}

// -------------------------------------------
// 📤 INTENTA ENVIAR UNA VENTA A FIREBASE
// (El core de la sincronización)
// -------------------------------------------
async function enviarVentaFirebase(venta) {
  try {
    const res = await fetch("/firebase-proxy/guardarVenta", {
      method: "POST",
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
// 🌐 SI VUELVE EL INTERNET → REINTENTO
// -------------------------------------------
window.addEventListener("online", () => {
  console.log("📶 Conexión restaurada, enviando ventas pendientes...");
  reenviarVentasPendientes();
});

// -------------------------------------------
// 🔁 MENSAJES DESDE EL SERVICE WORKER
// -------------------------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data && event.data.action === "sincronizar") {
      console.log("📩 SW pidió sincronización");
      reenviarVentasPendientes();
    }
  });
}

// Exponer por si se requiere desde otros módulos
window.reenviarVentasPendientes = reenviarVentasPendientes;
window.agregarVentaOffline = agregarVentaOffline;
