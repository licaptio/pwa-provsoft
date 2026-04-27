export const CARRITO_TMP_KEY = "provsoft_carrito_tmp";
export const DESC_KEY = "desc_porcentaje";
export const money = n => "$" + (Number(n) || 0).toFixed(2);

export function toast(msg, color = "#111827", tiempo = 1800) {
  const anterior = document.getElementById("toastFlotante");
  if (anterior) anterior.remove();

  const div = document.createElement("div");
  div.id = "toastFlotante";
  div.className = "toast-flotante";
  div.style.background = color;
  div.textContent = msg;

  document.body.appendChild(div);
  setTimeout(() => div.classList.add("show"), 40);

  setTimeout(() => {
    div.classList.remove("show");
    setTimeout(() => div.remove(), 260);
  }, tiempo);
}

export function beep(freq = 800, duration = 0.1) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function guardarCarritoLocal(carrito) {
  localStorage.setItem(CARRITO_TMP_KEY, JSON.stringify(carrito || []));
}

export function cargarCarritoLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(CARRITO_TMP_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function limpiarCarritoLocal() {
  localStorage.removeItem(CARRITO_TMP_KEY);
}

export function abrirOpciones() {
  const p = document.getElementById("pantallaOpciones");
  if (p) p.style.display = "block";
}

export function cerrarOpciones() {
  const p = document.getElementById("pantallaOpciones");
  if (p) p.style.display = "none";
}

export function cerrarSesionLocal() {
  localStorage.removeItem("usuario_ruta");
  localStorage.removeItem(DESC_KEY);
  location.reload();
}

/* ===========================================================
   🖨️ IMPRESIÓN RAW
   =========================================================== */

export function imprimirTestPrinter() {
  const ahora = new Date();

  const texto = `
PROVEEDORA DE DULCES Y DESECHABLES
POS 2026

*** PRUEBA DE IMPRESORA ***

Fecha: ${ahora.toLocaleDateString("es-MX")}
Hora: ${ahora.toLocaleTimeString("es-MX", { hour12:true })}

Bluetooth / Printer OK
Sistema listo para vender

------------------------------
`;

  enviarAImpresora(texto);
}

export function enviarAImpresora(texto) {
  const contenido = String(texto || "");

  if (!contenido.trim()) {
    toast("⚠️ Ticket vacío", "#d97706");
    return false;
  }

  // Android WebView / app wrapper
  if (window.AndroidPrinter && typeof window.AndroidPrinter.print === "function") {
    window.AndroidPrinter.print(contenido);
    toast("🖨️ Enviado a impresora", "#1e8e3e");
    return true;
  }

  // App wrapper alternativo
  if (window.NativePrinter && typeof window.NativePrinter.print === "function") {
    window.NativePrinter.print(contenido);
    toast("🖨️ Enviado a impresora", "#1e8e3e");
    return true;
  }

  // Web Bluetooth futuro
  if (navigator.bluetooth) {
    console.log("PRINT RAW PENDIENTE BLUETOOTH:\n", contenido);
    toast("🔵 Bluetooth disponible, falta conectar RAW", "#0c6cbd", 2600);
    return false;
  }

  console.log("PRINT RAW:\n", contenido);
  toast("⚠️ Impresora no conectada", "#d97706", 2600);
  return false;
}

export function bloquearDuplicadoFactory(ms = 300) {
  let ultimoCodigo = null;
  let ultimoTiempo = 0;

  return function bloquearDuplicado(codigo) {
    const ahora = Date.now();
    const limpio = String(codigo || "").trim();

    if (limpio === ultimoCodigo && ahora - ultimoTiempo < ms) {
      return true;
    }

    ultimoCodigo = limpio;
    ultimoTiempo = ahora;
    return false;
  };
}