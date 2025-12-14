/* ===========================================================
   🔊 BEEP ULTRA (feedback sonoro)
   =========================================================== */
function beep(freq = 900, dur = 0.06){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = freq;

    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(
      0.00001,
      ctx.currentTime + dur
    );

    o.stop(ctx.currentTime + dur);
  }catch(e){}
}


/* ===========================================================
   ⚡ PROVSOFT POS – SCANNER CORE (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Capturar códigos del escáner (USB / Bluetooth / HID)
   - Resolver:
       • Código normal
       • Código equivalente
       • Código de balanza
   - Enviar DIRECTO al carrito
   -----------------------------------------------------------
   PRINCIPIOS:
   ❌ No Firestore
   ❌ No async / await
   ❌ No loops pesados en tiempo de venta
   ✅ Map en RAM (O(1))
   ✅ 1 render por frame
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: ÍNDICES EN MEMORIA (RAM)
   -----------------------------------------------------------
   Se cargan UNA SOLA VEZ cuando el catálogo ya está listo.
   Todas las búsquedas durante la venta salen de aquí.
   =========================================================== */

const IDX = {
  porCodigo: new Map(),        // codigo principal  → producto
  porEquivalente: new Map()   // codigo alterno    → producto
};


/* ===========================================================
   ⚙️ SECCIÓN 2: INDEXACIÓN DEL CATÁLOGO
   -----------------------------------------------------------
   Convierte el catálogo completo en índices ultra rápidos.
   Se ejecuta SOLO al iniciar sesión / cargar catálogo.
   =========================================================== */

function indexarCatalogoUltra(catalogo) {
  IDX.porCodigo.clear();
  IDX.porEquivalente.clear();

  for (const prod of catalogo) {
    const codigo = normalizarCodigo(prod.codigoBarra);

    if (!codigo) {
      console.warn("⛔ Producto sin codigoBarra:", prod);
      continue;
    }

    IDX.porCodigo.set(codigo, prod);
  }

  console.log(
    "⚡ Scanner indexado:",
    IDX.porCodigo.size,
    "códigos |",
    IDX.porEquivalente.size,
    "equivalentes"
  );

  console.log("📌 Códigos cargados:", [...IDX.porCodigo.keys()]);
}


/* ===========================================================
   🔍 SECCIÓN 3: BÚSQUEDA INSTANTÁNEA
   -----------------------------------------------------------
   Devuelve el producto en O(1).
   NO usa async, NO consulta backend.
   =========================================================== */

function buscarProductoUltra(codigo) {
  const limpio = normalizarCodigo(codigo);
  return IDX.porCodigo.get(limpio) || IDX.porEquivalente.get(limpio) || null;
}

/* ===========================================================
   ⚖️ SECCIÓN 4: DECODIFICADOR DE BALANZA
   -----------------------------------------------------------
   Formato típico:
   2 + 6 dígitos producto + 5 dígitos peso
   Ejemplo:
   2000123450678
   =========================================================== */

function decodificarBalanzaUltra(codigo) {
  // Validación rápida
  if (!codigo.startsWith("2") || codigo.length < 13) return null;

  const codigoProducto = codigo.slice(0, 7);
  const pesoKg = Number(codigo.slice(7, 12)) / 1000;

  if (pesoKg <= 0) return null;

  const producto = buscarProductoUltra(codigoProducto);
  if (!producto) return null;

  return {
    producto,
    cantidad: pesoKg
  };
}


/* ===========================================================
   🛒 SECCIÓN 5: PROCESADOR CENTRAL DE CÓDIGOS
   -----------------------------------------------------------
   ÚNICO punto de entrada para TODO escaneo.
   =========================================================== */

function procesarCodigoUltra(codigo) {
  codigo = codigo.trim();
  if (!codigo) return;

  // 1️⃣ Intentar como balanza
  const balanza = decodificarBalanzaUltra(codigo);
  if (balanza) {
    addProduct(balanza.producto, balanza.cantidad);
    if (typeof requestRender === "function") {
  requestRender();
}
    beep(950, 0.08);
    return;
  }

  // 2️⃣ Producto normal o equivalente
  const producto = buscarProductoUltra(codigo);
  if (producto) {
    addProduct(producto, 1);
    if (typeof requestRender === "function") {
  requestRender();
}
    beep(900, 0.06);
    return;
  }

  // 3️⃣ No encontrado
  beep(400, 0.12);
  // ❌ toast(...)
console.warn("❌ Producto no encontrado:", codigo);
}


/* ===========================================================
   ⌨️ SECCIÓN 6: CAPTURA DE ESCÁNER HID
   -----------------------------------------------------------
   Optimizado para pistolas reales:
   - Detecta velocidad de tecleo
   - Ignora escritura humana lenta
   =========================================================== */

let bufferScan = "";
let ultimoTiempo = 0;

document.addEventListener("keydown", e => {
  const ahora = Date.now();

  // Si el tiempo entre teclas es alto → reset (humano)
  if (ahora - ultimoTiempo > 40) {
    bufferScan = "";
  }
  ultimoTiempo = ahora;

  // Enter marca fin de escaneo
  if (e.key === "Enter") {
    procesarCodigoUltra(bufferScan);
    bufferScan = "";
    e.preventDefault();
    return;
  }

  // Solo caracteres válidos
  if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    bufferScan += e.key;
  }
});


/* ===========================================================
   🎯 SECCIÓN 7: RENDER CONTROLADO (1 POR FRAME)
   -----------------------------------------------------------
   Evita múltiples render() consecutivos.
   =========================================================== */

let renderPendiente = false;

function requestRender() {
  if (renderPendiente) return;

  renderPendiente = true;
  requestAnimationFrame(() => {
    renderPendiente = false;
    render(); // ← función existente del POS
  });
}
function normalizarCodigo(codigo) {
  return String(codigo).replace(/\D/g, "");
}


/* ===========================================================
   🌍 SECCIÓN 8: EXPOSICIÓN CONTROLADA
   -----------------------------------------------------------
   Solo lo estrictamente necesario al scope global.
   =========================================================== */

window.indexarCatalogoUltra = indexarCatalogoUltra;
window.procesarCodigoUltra = procesarCodigoUltra;

/* ===========================================================
   🎯 ENGANCHE DIRECTO DEL INPUT SCANNER
   =========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("inputScanner");
  if (!input) return;

  console.log("🎯 inputScanner enganchado");

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const codigo = input.value;
      input.value = "";
      procesarCodigoUltra(codigo);
      e.preventDefault();
    }
  });
});


