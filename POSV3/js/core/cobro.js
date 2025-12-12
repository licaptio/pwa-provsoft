/* ===========================================================
   💳 PROVSOFT POS – COBRO CORE (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Abrir / cerrar cobro
   - Validar pago
   - Bloquear doble confirmación
   - Coordinar flujo de venta
   -----------------------------------------------------------
   ❌ NO calcula totales
   ❌ NO guarda en Firestore
   ❌ NO imprime
   ✅ Ultra rápido
   ✅ Mobile-first
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: ESTADO GLOBAL DEL COBRO
   =========================================================== */

let cobroActivo = false;
let cobroBloqueado = false;


/* ===========================================================
   🔓 SECCIÓN 2: ABRIR MODAL DE COBRO
   =========================================================== */

function abrirCobro() {
  if (!window.carrito || carrito.length === 0) {
    toast("🛒 Agrega productos primero");
    return;
  }

  if (cobroActivo) return;

  cobroActivo = true;
  cobroBloqueado = false;

  const modal = document.getElementById("modalCobro");
  if (modal) modal.style.display = "flex";

  const inputPago = document.getElementById("montoRecibido");
  if (inputPago) {
    inputPago.value = "";
    setTimeout(() => inputPago.focus(), 60);
  }

  beep(900, 0.12);
}


/* ===========================================================
   🔒 SECCIÓN 3: CERRAR COBRO
   =========================================================== */

function cerrarCobro() {
  cobroActivo = false;
  cobroBloqueado = false;

  const modal = document.getElementById("modalCobro");
  if (modal) modal.style.display = "none";
}


/* ===========================================================
   💰 SECCIÓN 4: VALIDAR PAGO
   -----------------------------------------------------------
   Devuelve objeto con resultado del cobro
   =========================================================== */

function validarPago() {
  const recibido = parseFloat(
    document.getElementById("montoRecibido")?.value || 0
  );

  const totales = window.calcularTotalesUltra?.() || {};
  const total = Number(totales.total || 0);

  if (recibido <= 0) {
    toast("💵 Ingresa monto recibido");
    return null;
  }

  if (recibido < total) {
    toast("⚠️ Monto insuficiente");
    beep(400, 0.15);
    return null;
  }

  return {
    recibido,
    cambio: +(recibido - total).toFixed(2),
    total
  };
}


/* ===========================================================
   ✅ SECCIÓN 5: CONFIRMAR COBRO (ANTI DOBLE CLICK)
   =========================================================== */

async function confirmarCobro() {
  if (cobroBloqueado) return;
  cobroBloqueado = true;

  const pago = validarPago();
  if (!pago) {
    cobroBloqueado = false;
    return;
  }

  beep(950, 0.12);

  // 🔐 Bloquear UI
  bloquearUI(true);

  try {
    // 🔔 Evento central (venta confirmada)
    if (typeof window.onVentaConfirmada === "function") {
      await window.onVentaConfirmada(pago);
    }
  } catch (err) {
    console.error("❌ Error en cobro:", err);
    toast("❌ Error al procesar cobro");
  } finally {
    bloquearUI(false);
    cerrarCobro();
    cobroBloqueado = false;
  }
}


/* ===========================================================
   🚧 SECCIÓN 6: BLOQUEO VISUAL GLOBAL
   =========================================================== */

function bloquearUI(estado) {
  let overlay = document.getElementById("overlayBloqueo");

  if (estado) {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "overlayBloqueo";
    overlay.innerHTML = `
      <div style="
        position:fixed;inset:0;background:rgba(0,0,0,.75);
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        color:#fff;z-index:99999;
        font-size:18px;font-weight:700;
      ">
        <div style="
          width:64px;height:64px;
          border:5px solid #fff;
          border-top-color:#0c6cbd;
          border-radius:50%;
          animation:spin 1s linear infinite;
          margin-bottom:14px;
        "></div>
        PROCESANDO VENTA…
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
    `;
    document.body.appendChild(overlay);
  } else {
    if (overlay) overlay.remove();
  }
}


/* ===========================================================
   🌍 SECCIÓN 7: EXPOSICIÓN CONTROLADA
   =========================================================== */

window.abrirCobro = abrirCobro;
window.cerrarCobro = cerrarCobro;
window.confirmarCobro = confirmarCobro;
window.cobroActivo = () => cobroActivo;
