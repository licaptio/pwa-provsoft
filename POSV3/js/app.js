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
  .filter(p => p.activo === true)
  .map(x => ({
    id: x.codigoBarra,
    nombre: x.concepto || "SIN NOMBRE",
    codigo: String(x.codigoBarra || "").trim(),
    precioPublico: Number(x.precioPublico || 0),
    mayoreo: Number(x.mayoreo || 0),
    medioMayoreo: Number(x.medioMayoreo || 0),
    costoUnit: Number(x.costoSinImpuesto || x.costo || 0),
    ivaTasa: Number(x.ivaTasa || 0),
    iepsTasa: Number(x.iepsTasa || 0),
    equivalentes: Array.isArray(x.codigosEquivalentes)
      ? x.codigosEquivalentes.map(e => String(e).trim())
      : [],
    claveSat: x.claveSat || null,
    unidadMedidaSat: x.unidadMedidaSat || null,
    departamento_id: x.departamento_id || null,
    raw: x
  }));

window.catalogo = productosNormalizados;
window.catalogoDepartamentos = departamentos;

indexarCatalogoUltra(window.catalogo);

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

