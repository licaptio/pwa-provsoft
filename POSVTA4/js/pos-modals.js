// ==========================================================
// POS-MODALS — PROVSOFT (Versión Final 2025)
// ==========================================================

const toast = window.toast;
const beep = window.beep;
const calcularTotales = window.calcularTotales;
const guardarEImprimir = window.guardarEImprimir;

// DOM
const $ = s => document.querySelector(s);
const modalCobro = $("#modalCobro");
const lblTotal = $("#cobroTotal");
const btnCancelarCobro = $("#btnCancelarCobro");
const btnConfirmar = $("#btnConfirmarCobro");
const inputMonto = $("#montoRecibido");
const lblCambio = $("#montoCambio");

// ==========================================================
// 🔥 Control global de bloqueo POS
// ==========================================================
window.MODO_COBRO = false;

// ==========================================================
// 🔵 ABRIR MODAL
// ==========================================================
function abrirModalCobro() {
  window.MODO_COBRO = true;

  const tot = calcularTotales();
  lblTotal.textContent = "$" + Number(tot.total).toFixed(2);

  modalCobro.style.display = "flex";
  inputMonto.value = "";
  lblCambio.textContent = "$0.00";

  beep(900);

  setTimeout(() => {
    inputMonto.focus();
    inputMonto.select();
  }, 80);
}

// ==========================================================
// 🔴 CERRAR MODAL
// ==========================================================
function cerrarModalCobro() {
  window.MODO_COBRO = false;
  modalCobro.style.display = "none";
}

// ==========================================================
// 🔢 Cambio en tiempo real
// ==========================================================
inputMonto?.addEventListener("input", () => {
  const recibido = Number(inputMonto.value) || 0;
  const tot = Number(calcularTotales().total);
  const cambio = recibido - tot;

  lblCambio.textContent = "$" + cambio.toFixed(2);
});

// ==========================================================
// BUTTONS
// ==========================================================
btnCancelarCobro?.addEventListener("click", cerrarModalCobro);

btnConfirmar?.addEventListener("click", async () => {
  cerrarModalCobro();
  await guardarEImprimir("EFECTIVO");
});

// EXPONER
window.abrirModalCobro = abrirModalCobro;
window.cerrarModalCobro = cerrarModalCobro;

// ==========================================================
// ⛔ BLOQUEO CONDICIONAL — SOLO LO NECESARIO
// ==========================================================

document.addEventListener("keydown", e => {

  if (!window.MODO_COBRO) return;

  // Permitir operación normal dentro del input
  if (document.activeElement === inputMonto) {
    const permitido = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"];
    if (/^[0-9]$/.test(e.key)) return;
    if (permitido.includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Fuera del input → bloquear
  e.preventDefault();
  e.stopPropagation();
}, true);

