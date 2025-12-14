/* ===========================================================
   📦 CARGA DE CATÁLOGO OFFLINE (PRODUCTOS + DEPTOS)
   =========================================================== */

async function cargarCatalogoOffline() {
  const [prodRes, depRes] = await Promise.all([
    fetch("./data/productos.json"),
    fetch("./data/departamentos.json")
  ]);

  const productos = await prodRes.json();
  const departamentos = await depRes.json();

  // ✅ NORMALIZAR PRODUCTOS (ÚNICA FUENTE DE VERDAD)
  const productosNormalizados = productos
    .filter(p => p.activo)
    .map(p => ({
      id: p.codigoBarra,
      codigo: String(p.codigoBarra).trim(),
      nombre: p.concepto,
      precio: Number(p.precioPublico || 0),
      ivaTasa: Number(p.ivaTasa || 0),
      iepsTasa: Number(p.iepsTasa || 0),
      equivalentes: Array.isArray(p.codigosEquivalentes)
        ? p.codigosEquivalentes.map(e => String(e).trim())
        : [],
      raw: p
    }));

  // 🔑 SOLO ESTO
  window.catalogoProductos = productosNormalizados;
  window.catalogoDepartamentos = departamentos;

  // 🔥 INDEXAR SOLO UNA VEZ Y CON DATOS CORRECTOS
  indexarCatalogoUltra(productosNormalizados);

  console.log("✅ Catálogo offline normalizado:", productosNormalizados.length);
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
  document.getElementById("btnConfirmarCobro")
  ?.addEventListener("click", () => {
    const pago = obtenerPagoActual(); // o como lo tengas
    window.onVentaConfirmada(pago);
  });

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

  mostrarToast("✅ Venta completada", "#16a34a");
};

/* ===========================================================
   🧮 FOLIO SIMPLE (MEJORABLE)
   =========================================================== */

function generarFolio() {
  return "V3-" + Date.now().toString().slice(-6);
}

