// ==========================================================
// POS-MODALS — PROVSOFT
// Manejo del modal de cobro y bloqueo total del POS
// ==========================================================

const toast = window.toast;
const beep = window.beep;
const calcularTotales = window.calcularTotales;
const guardarEImprimir = window.guardarEImprimir;
const $ = s => document.querySelector(s);

// ==========================================================
// 🔥 CONTROL GLOBAL PARA BLOQUEAR TODA LA PANTALLA
// ==========================================================
window.MODO_COBRO = false;

const modalCobro = $("#modalCobro");
const lblTotal = $("#cobroTotal");
const btnCancelarCobro = $("#btnCancelarCobro");
const btnConfirmar = $("#btnConfirmarCobro");
const inputMonto = $("#montoRecibido");
const lblCambio = $("#montoCambio");

// ==========================================================
// 🔵 ABRIR MODAL DE COBRO
// ==========================================================
function abrirModalCobro() {

  window.MODO_COBRO = true; // Bloqueo global

  const tot = calcularTotales();
  lblTotal.textContent = "$" + Number(tot.total).toFixed(2);

  modalCobro.style.display = "flex";
  inputMonto.value = "";
  lblCambio.textContent = "$0.00";

  beep(900);

  setTimeout(() => {
    inputMonto.focus();
    inputMonto.select();
  }, 100);
}

// ==========================================================
// 🔴 CERRAR MODAL DE COBRO
// ==========================================================
function cerrarModalCobro() {
  window.MODO_COBRO = false; // Reactivar POS

  modalCobro.style.display = "none";
}

// ==========================================================
// 🧮 CALCULAR CAMBIO
// ==========================================================
inputMonto?.addEventListener("input", () => {
  const recibido = Number(inputMonto.value) || 0;
  const tot = Number(calcularTotales().total);
  const cambio = recibido - tot;

  lblCambio.textContent = "$" + cambio.toFixed(2);
});

// ==========================================================
// ❌ CANCELAR COBRO
// ==========================================================
btnCancelarCobro?.addEventListener("click", () => {
  cerrarModalCobro();
});

// ==========================================================
// ✅ CONFIRMAR COBRO → GUARDAR E IMPRIMIR
// ==========================================================
btnConfirmar?.addEventListener("click", async () => {
  cerrarModalCobro();
  await guardarEImprimir("EFECTIVO");
});

// ==========================================================
// 📦 EXPONER
// ==========================================================
window.abrirModalCobro = abrirModalCobro;
window.cerrarModalCobro = cerrarModalCobro;

// ==========================================================
// ⚠️ BLOQUEO TOTAL DEL POS DURANTE COBRO
// ==========================================================

// 🛑 Bloquear clics fuera del modal
document.addEventListener("click", e => {
  if (!window.MODO_COBRO) return;

  if (!modalCobro.contains(e.target)) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

// 🛑 Bloquear scroll
document.addEventListener("wheel", e => {
  if (window.MODO_COBRO) {
    e.preventDefault();
    e.stopPropagation();
  }
}, { passive: false });

// 🛑 Bloqueo del teclado SOLO si el modal es realmente visible
document.addEventListener("keydown", e => {

  // Verificar visibilidad real del modal (no solo MODO_COBRO)
  const modalVisible = modalCobro && modalCobro.offsetParent !== null;

  if (!modalVisible) return;  // Modal cerrado → NO bloquear nada

  // Si está dentro del input monto → permitir números
  if (document.activeElement === inputMonto) {

    const permitido = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"];

    if (/^[0-9]$/.test(e.key)) return;
    if (permitido.includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Si modal abierto y fuera del input → BLOQUEAR TODO
  e.preventDefault();
  e.stopPropagation();
}, true);


