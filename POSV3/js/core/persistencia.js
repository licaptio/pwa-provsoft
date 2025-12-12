/* ===========================================================
   💾 PROVSOFT POS – PERSISTENCIA (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Guardar venta
   - Cola offline
   - Reintentos seguros
   -----------------------------------------------------------
   ❌ NO render
   ❌ NO cálculo
   ❌ NO impresión
   ✅ Offline-first
   ✅ Ultra rápido
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: CONFIGURACIÓN
   =========================================================== */

const COLA_KEY = "provsoft_ventas_pendientes_v3";


/* ===========================================================
   📦 SECCIÓN 2: COLA LOCAL (LOCALSTORAGE)
   =========================================================== */

function leerCola() {
  try {
    return JSON.parse(localStorage.getItem(COLA_KEY) || "[]");
  } catch {
    return [];
  }
}

function guardarCola(lista) {
  localStorage.setItem(COLA_KEY, JSON.stringify(lista));
}


/* ===========================================================
   ➕ SECCIÓN 3: AGREGAR VENTA A COLA
   =========================================================== */

function encolarVenta(venta) {
  const cola = leerCola();
  cola.push({
    ...venta,
    _pendiente: true,
    _timestamp: Date.now()
  });
  guardarCola(cola);
  toast("📦 Venta guardada (offline)", "#f59e0b");
}


/* ===========================================================
   🚀 SECCIÓN 4: GUARDAR VENTA (ONLINE / OFFLINE)
   =========================================================== */

async function guardarVenta(venta) {
  if (!navigator.onLine) {
    encolarVenta(venta);
    return false;
  }

  try {
    // 🔌 Punto único de guardado (inyectable)
    if (typeof window.guardarVentaRemota === "function") {
      await window.guardarVentaRemota(venta);
      return true;
    }

    throw new Error("guardarVentaRemota no definida");

  } catch (err) {
    console.warn("⚠️ Error guardando, encolando:", err);
    encolarVenta(venta);
    return false;
  }
}


/* ===========================================================
   🔁 SECCIÓN 5: REINTENTAR COLA
   =========================================================== */

async function reenviarCola() {
  if (!navigator.onLine) return;

  const cola = leerCola();
  if (!cola.length) return;

  const restantes = [];

  for (const venta of cola) {
    try {
      await window.guardarVentaRemota(venta);
      console.log("✅ Venta reenviada:", venta.folio);
    } catch (err) {
      console.warn("❌ Reintento fallido:", venta.folio);
      restantes.push(venta);
    }
  }

  guardarCola(restantes);

  if (!restantes.length) {
    toast("✅ Ventas sincronizadas", "#16a34a");
  }
}


/* ===========================================================
   🌐 SECCIÓN 6: EVENTOS DE CONECTIVIDAD
   =========================================================== */

window.addEventListener("online", () => {
  setTimeout(reenviarCola, 800);
});


/* ===========================================================
   🌍 SECCIÓN 7: EXPOSICIÓN CONTROLADA
   =========================================================== */

window.guardarVenta = guardarVenta;
window.reenviarCola = reenviarCola;
