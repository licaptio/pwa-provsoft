// ==========================================================
// POS-MODALS — PROVSOFT
// Manejo de modal de cantidad, modal de cobro y flujo final
// ==========================================================

import { carrito, calcularTotales, toast, beep, render } from "./pos-core.js";
import { guardarEImprimir } from "./pos-ticket.js";

const $ = s => document.querySelector(s);

// ===============================
// 🔢 MODAL CANTIDAD
// ===============================

const modalCantidad = $("#modalCantidad");
const inputCantidadModal = $("#inputCantidadModal");
let productoActual = null;

export function abrirModalCantidad(prod) {
  productoActual = prod;
  inputCantidadModal.value = prod.cantidad || 1;
  modalCantidad.style.display = "flex";
  inputCantidadModal.focus();
}

function cerrarModalCantidad() {
  modalCantidad.style.display = "none";
  productoActual = null;
}

$("#btnCancelarCant")?.addEventListener("click", cerrarModalCantidad);

$("#btnAceptarCant")?.addEventListener("click", () => {
  const nueva = parseFloat(inputCantidadModal.value);

  if (!nueva || nueva <= 0) {
    toast("Cantidad inválida", "#c0392b");
    return;
  }

  productoActual.cantidad = nueva;
  productoActual.importe = nueva * productoActual.precioUnit;

  cerrarModalCantidad();
  render();
});

// ===============================
// 💵 MODAL COBRAR
// ===============================

const modalCobro = document.createElement("div");
modalCobro.id = "modalCobro";
modalCobro.style.cssText = `
   position:fixed;inset:0;background:rgba(0,0,0,.5);
   display:none;z-index:4000;align-items:center;justify-content:center;
`;
modalCobro.innerHTML = `
  <div style="background:white;padding:20px;border-radius:12px;
              width:85%;max-width:350px;text-align:center;">
    <h3 style="color:#00416A;margin-bottom:10px;">Confirmar Pago</h3>

    <div style="font-size:18px;margin-bottom:10px;">
      Total: <strong id="totalCobroLbl">$0.00</strong>
    </div>

    <button id="pagoEfectivo" class="btn"
       style="margin-top:8px;background:#1e8e3e;width:100%;">
       Efectivo
    </button>

    <button id="pagoTarjeta" class="btn"
       style="margin-top:8px;background:#0c6cbd;width:100%;">
       Tarjeta
    </button>

    <button id="btnCancelarCobro" class="btn"
       style="margin-top:12px;background:#aaa;width:100%;">
       Cancelar
    </button>
  </div>
`;
document.body.appendChild(modalCobro);

function abrirModalCobro() {
  const tot = calcularTotales();
  $("#totalCobroLbl").textContent = "$" + Number(tot.total).toFixed(2);
  modalCobro.style.display = "flex";
}

function cerrarModalCobro() {
  modalCobro.style.display = "none";
}

$("#btnCancelarCobro")?.addEventListener("click", cerrarModalCobro);

// ===============================
// 🧾 COBRAR → GUARDAR → IMPRIMIR
// ===============================

$("#pagoEfectivo")?.addEventListener("click", async () => {
  cerrarModalCobro();
  await guardarEImprimir("EFECTIVO");
});

$("#pagoTarjeta")?.addEventListener("click", async () => {
  cerrarModalCobro();
  await guardarEImprimir("TARJETA");
});

// ===============================
// 🟦 BOTÓN PRINCIPAL "COBRAR"
// ===============================
$("#btnCobrar")?.addEventListener("click", () => {
  if (carrito.length === 0) {
    toast("Carrito vacío", "#c0392b");
    return;
  }
  beep(900);
  abrirModalCobro();
});

// Exponer si se requiere
window.abrirModalCantidad = abrirModalCantidad;
