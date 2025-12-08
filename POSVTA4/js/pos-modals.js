// ==========================================================
// POS-MODALS — PROVSOFT
// Manejo de modal de cobro y flujo final
// ==========================================================

// Tomamos funciones desde window
const toast = window.toast;
const beep = window.beep;
const calcularTotales = window.calcularTotales;
const guardarEImprimir = window.guardarEImprimir;

// Atajos
const $ = s => document.querySelector(s);

// ==========================================================
// 🛑 BANDERA GLOBAL PARA BLOQUEAR BUSCADOR Y ESCÁNER
// ==========================================================
window.MODO_COBRO = false;   // 🔥 Se activa al abrir cobro y se desactiva al cerrar

// =====================================================================
// 🧾 MODAL DE COBRO (USAMOS EL QUE YA ESTÁ EN TU HTML — NO SE CREA OTRO)
// =====================================================================

const modalCobro = $("#modalCobro");
const lblTotal = $("#cobroTotal");
const btnCancelarCobro = $("#btnCancelarCobro");
const btnConfirmar = $("#btnConfirmarCobro");
const inputMonto = $("#montoRecibido");
const lblCambio = $("#montoCambio");

// --------------------------------------
// 🔵 ABRIR MODAL DE COBRO
// --------------------------------------
function abrirModalCobro() {

  // 🔥 Bloquear buscador y escáner
  window.MODO_COBRO = true;

  const tot = calcularTotales();
  lblTotal.textContent = "$" + Number(tot.total).toFixed(2);

  modalCobro.style.display = "flex";
  inputMonto.value = "";
  lblCambio.textContent = "$0.00";

  beep(900);

  // 🔥 Forzar enfoque al input del cobro
  setTimeout(() => {
    inputMonto.focus();
    inputMonto.select();
  }, 120);
}

// --------------------------------------
// 🔴 CERRAR MODAL
// --------------------------------------
function cerrarModalCobro() {

  // 🔥 Reactivar buscador y escáner
  window.MODO_COBRO = false;

  modalCobro.style.display = "none";
}

// --------------------------------------
// 🧮 CALCULAR CAMBIO EN TIEMPO REAL
// --------------------------------------
inputMonto?.addEventListener("input", () => {
  const recibido = Number(inputMonto.value) || 0;
  const tot = Number(calcularTotales().total);

  const cambio = recibido - tot;
  lblCambio.textContent = "$" + cambio.toFixed(2);
});

// --------------------------------------
// ❌ BOTÓN CANCELAR
// --------------------------------------
btnCancelarCobro?.addEventListener("click", () => {
  cerrarModalCobro();
});

// --------------------------------------
// ✅ CONFIRMAR COBRO → GUARDAR → IMPRIMIR
// --------------------------------------
btnConfirmar?.addEventListener("click", async () => {
  cerrarModalCobro();
  await guardarEImprimir("EFECTIVO");
});

// --------------------------------------
// 📦 EXPONER GLOBALMENTE
// --------------------------------------
window.abrirModalCobro = abrirModalCobro;
window.cerrarModalCobro = cerrarModalCobro;

// --------------------------------------
// 🟦 BOTÓN PRINCIPAL "COBRAR"
// --------------------------------------
$("#btnCobrar")?.addEventListener("click", () => {
  if (window.carrito.length === 0) {
    toast("Carrito vacío", "#c0392b");
    return;
  }
  abrirModalCobro();
});

// ==========================================================
// 🛑 BLOQUEO TOTAL DEL TECLADO CUANDO EL MODAL DE COBRO ESTÁ ABIERTO
// ==========================================================

document.addEventListener("keydown", function(e) {

  // Si el modal NO está visible → no bloquear nada
  if (modalCobro.style.display === "none") return;

  // Si el focus está en el input del monto recibido → PERMITIR SOLO NÚMEROS
  if (document.activeElement === inputMonto) {

    // Permitir: números, borrar, flechas, tab, enter
    const permitido = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"];

    if (/^[0-9]$/.test(e.key)) {
      return; // permitir números
    }

    if (permitido.includes(e.key)) {
      return; // permitir teclas control
    }

    // ❌ cualquier otra tecla queda bloqueada
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // 🔥 Si el focus NO está dentro del input del modal → bloquear TODO
  e.preventDefault();
  e.stopPropagation();
});

