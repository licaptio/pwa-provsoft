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
  const tot = calcularTotales();

  lblTotal.textContent = "$" + Number(tot.total).toFixed(2);

  modalCobro.style.display = "flex";
  inputMonto.value = "";
  lblCambio.textContent = "$0.00";

  beep(900);

  setTimeout(() => inputMonto.focus(), 150);
}

// --------------------------------------
// 🔴 CERRAR MODAL
// --------------------------------------
function cerrarModalCobro() {
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
