export const CARRITO_TMP_KEY = "provsoft_carrito_tmp";
export const DESC_KEY = "desc_porcentaje";
export const ULTIMO_TICKET_KEY = "provsoft_ultimo_ticket_raw";
export const CATALOGO_CACHE_KEY = "provsoft_catalogo_cache";
export const CATALOGO_CACHE_TIME_KEY = "provsoft_catalogo_cache_time";
export const VENTAS_PENDIENTES_KEY = "provsoft_ventas_pendientes";
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
export function guardarCatalogoLocal(catalogo) {
  try {
    localStorage.setItem(CATALOGO_CACHE_KEY, JSON.stringify(catalogo || []));
    localStorage.setItem(CATALOGO_CACHE_TIME_KEY, String(Date.now()));
  } catch (e) {
    console.warn("No se pudo guardar catálogo local:", e);
  }
}

export function cargarCatalogoLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(CATALOGO_CACHE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
export function guardarVentaPendiente(venta) {
  try {
    const pendientes = cargarVentasPendientes();

pendientes.push({
  id_local: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
  creada_en_local: new Date().toISOString(),
  intentos: 0,
  ultimo_error: null,
  venta
});

if (pendientes.length > 100) {
  pendientes.shift();
}

localStorage.setItem(VENTAS_PENDIENTES_KEY, JSON.stringify(pendientes));
    
  } catch (e) {
    console.error("No se pudo guardar venta pendiente:", e);
  }
}

export function cargarVentasPendientes() {
  try {
    const data = JSON.parse(localStorage.getItem(VENTAS_PENDIENTES_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function guardarVentasPendientes(lista) {
  localStorage.setItem(VENTAS_PENDIENTES_KEY, JSON.stringify(lista || []));
}

export function contarVentasPendientes() {
  return cargarVentasPendientes().length;
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

  // respaldo antes de intentar imprimir
  localStorage.setItem(ULTIMO_TICKET_KEY, contenido);

  try {
    const encoded = encodeURIComponent(contenido);

    // RawBT por Android Intent
    window.location.href =
      `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;

    toast("🖨️ Enviando a RawBT...", "#1e8e3e");
    return true;

  } catch (err) {
    console.error("Error enviando a RawBT:", err);
    toast("⚠️ Error enviando a RawBT", "#dc2626");
    return false;
  }
}

export function reenviarUltimoTicket() {
  const ticket = localStorage.getItem(ULTIMO_TICKET_KEY);

  if (!ticket || !ticket.trim()) {
    toast("No hay ticket para reimprimir", "#d97706");
    return false;
  }

  enviarAImpresora(ticket);
  return true;
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
