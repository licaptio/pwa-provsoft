/* ===========================================================
   📦 CARGA DE CATÁLOGO OFFLINE (PRODUCTOS + DEPTOS)
   =========================================================== */

async function cargarCatalogoOffline() {
  const [prodRes, depRes] = await Promise.all([
    fetch("/data/productos.json"),
    fetch("/data/departamentos.json")
  ]);

  const productos = await prodRes.json();
  const departamentos = await depRes.json();

  window.catalogoProductos = productos;
  window.catalogoDepartamentos = departamentos;

  // 🔥 INDEXAR SCANNER (CRÍTICO)
  indexarCatalogoUltra(productos);

  console.log("📦 Catálogo offline cargado:", productos.length);
}

/* ===========================================================
   🚀 PROVSOFT POS V3 – APP ORQUESTADOR
   =========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 POS V3 iniciado");

  // 🔥 Cargar catálogo offline primero
  await cargarCatalogoOffline();

  requestRender();

  document.getElementById("btnCobrar")?.addEventListener("click", abrirCobro);
  document.getElementById("btnConfirmarCobro")?.addEventListener("click", confirmarCobro);
  document.getElementById("btnCancelarCobro")?.addEventListener("click", cerrarCobro);
});


/* ===========================================================
   🔔 EVENTO CENTRAL: VENTA CONFIRMADA
   =========================================================== */

window.onVentaConfirmada = async (pago) => {
  const venta = {
    folio: generarFolio(),
    fecha: new Date().toLocaleString("es-MX"),
    cliente: window.clienteActual || "PÚBLICO EN GENERAL",
    detalle: [...window.carrito],
    totales: calcularTotales(window.carrito, {
      tipo: "porcentaje",
      valor: window.descuentoActual || 0
    }),
    descuento: window.descuentoActual || 0,
    pago: pago.recibido,
    cambio: pago.cambio,
    articulos: window.carrito.length,
    cajero: window.USUARIO_LOGUEADO?.nombre || "—",
    ubicacion: window.ubicacionActual || null
  };

  await guardarVenta(venta);
  imprimirTicket(venta);
  enviarTelegram(venta);

  window.carrito.length = 0;
  limpiarDescuento();
  cerrarCobro();
  requestRender();

  toast("✅ Venta completada", "#16a34a");
};

/* ===========================================================
   🧮 FOLIO SIMPLE (MEJORABLE)
   =========================================================== */

function generarFolio() {
  return "V3-" + Date.now().toString().slice(-6);
}
