/* ===========================================================
   🚀 PROVSOFT POS V3 – APP ORQUESTADOR
   =========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 POS V3 iniciado");

  // Render inicial
  if (typeof window.requestRender === "function") {
    requestRender();
  }

  // Botones principales
  document.getElementById("btnCobrar")?.addEventListener("click", abrirCobro);
  document.getElementById("btnConfirmarCobro")?.addEventListener("click", confirmarCobro);
  document.getElementById("btnCancelarCobro")?.addEventListener("click", cerrarCobro);
});


/* ===========================================================
   🔔 EVENTO CENTRAL: VENTA CONFIRMADA
   =========================================================== */

window.onVentaConfirmada = async (pago) => {
  const venta = {
    folio: generarFolio(),           // función simple
    fecha: new Date().toLocaleString("es-MX"),
    cliente: window.clienteActual || "PÚBLICO EN GENERAL",
    detalle: window.carrito || [],
    totales: calcularTotalesUltra(),
    descuento: window.descuentoActual || 0,
    pago: pago.recibido,
    cambio: pago.cambio,
    articulos: window.carrito.length,
    cajero: window.USUARIO_LOGUEADO?.nombre || "—",
    ubicacion: window.ubicacionActual || null
  };

  await guardarVenta(venta);     // persistencia
  imprimirTicket(venta);         // ticket
  enviarTelegram(venta);         // telegram

  // Limpieza final
  window.carrito.length = 0;
  limpiarDescuento();
  requestRender();

  toast("✅ Venta completada", "#16a34a");
};


/* ===========================================================
   🧮 FOLIO SIMPLE (MEJORABLE)
   =========================================================== */

function generarFolio() {
  return "V3-" + Date.now().toString().slice(-6);
}
