/* ===========================================================
   🔐 PROVSOFT POS – DESCUENTOS CORE (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Solicitar descuento
   - Validar contraseña
   - Activar / desactivar descuento
   -----------------------------------------------------------
   PRINCIPIOS:
   ❌ Nada de render
   ❌ Nada de cálculos
   ❌ Nada de Firestore
   ✅ Estado simple
   ✅ Ultra rápido
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: CONFIGURACIÓN CENTRAL
   =========================================================== */

// ⚠️ En producción esto debe venir de backend / env
const CLAVE_DESCUENTO = "MADERO690*";

// Máximo permitido
const DESCUENTO_MAX = 50;


/* ===========================================================
   📦 SECCIÓN 2: ESTADO GLOBAL CONTROLADO
   =========================================================== */

window.descuentoActual = 0;


/* ===========================================================
   🔐 SECCIÓN 3: VALIDACIÓN DE CONTRASEÑA
   =========================================================== */

function validarPassword(pass) {
  return pass === CLAVE_DESCUENTO;
}


/* ===========================================================
   📉 SECCIÓN 4: APLICAR DESCUENTO
   -----------------------------------------------------------
   Devuelve true si se aplicó, false si no.
   =========================================================== */

function aplicarDescuento(porcentaje) {
  porcentaje = Number(porcentaje);

  if (isNaN(porcentaje) || porcentaje <= 0) {
    toast("❌ Descuento inválido");
    return false;
  }

  if (porcentaje > DESCUENTO_MAX) {
    toast(`🚫 Máximo ${DESCUENTO_MAX}% permitido`);
    return false;
  }

  const pass = prompt("🔐 Contraseña de autorización");
  if (!pass) return false;

  if (!validarPassword(pass)) {
    toast("❌ Contraseña incorrecta");
    return false;
  }

  window.descuentoActual = porcentaje;

  toast(`✅ Descuento ${porcentaje}% aplicado`, "#16a34a");

  // 🔄 Forzar render (NO calcula aquí)
  if (typeof window.requestRender === "function") {
    window.requestRender();
  }

  return true;
}


/* ===========================================================
   ♻️ SECCIÓN 5: LIMPIAR DESCUENTO
   =========================================================== */

function limpiarDescuento() {
  if (!window.descuentoActual) return;

  window.descuentoActual = 0;
  toast("🔄 Descuento eliminado", "#f59e0b");

  if (typeof window.requestRender === "function") {
    window.requestRender();
  }
}


/* ===========================================================
   🌍 SECCIÓN 6: EXPOSICIÓN CONTROLADA
   =========================================================== */

window.aplicarDescuento = aplicarDescuento;
window.limpiarDescuento = limpiarDescuento;
