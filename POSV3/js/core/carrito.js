/* ===========================================================
   🛒 PROVSOFT POS – CARRITO CORE (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD:
   - Mantener el estado del carrito
   - Agregar productos (normal / balanza)
   - Evitar duplicados
   - Calcular importes por renglón
   -----------------------------------------------------------
   PRINCIPIOS:
   ❌ Nada de render aquí
   ❌ Nada de DOM aquí
   ❌ Nada de Firestore aquí
   ✅ Estado limpio y rápido
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: ESTADO DEL CARRITO
   -----------------------------------------------------------
   El carrito vive en memoria (RAM).
   =========================================================== */

const carrito = [];


/* ===========================================================
   💸 SECCIÓN 2: REGLAS DE PRECIO / MAYOREO
   -----------------------------------------------------------
   Centralizamos aquí la lógica de precios.
   =========================================================== */

function obtenerPrecioUnitario(prod, cantidad) {
  // 🔹 Si no es producto de mayoreo, precio público
  if (!Array.isArray(window.productosMayoreo)) {
    return Number(prod.precioPublico || 0);
  }

  const codigo = String(prod.codigo || "");
  const esMayoreo = window.productosMayoreo.includes(codigo);

  // 🔹 Producto normal
  if (!esMayoreo) {
    return Number(prod.precioPublico || 0);
  }

  // 🔹 Regla: 5 o más = mayoreo
  if (cantidad >= 5 && prod.mayoreo) {
    return Number(prod.mayoreo);
  }

  return Number(prod.precioPublico || 0);
}


/* ===========================================================
   ➕ SECCIÓN 3: AGREGAR PRODUCTO
   -----------------------------------------------------------
   Punto único de entrada desde el scanner.
   =========================================================== */

function addProduct(prod, cantidad = 1) {
  cantidad = Number(cantidad);
  if (!prod || cantidad <= 0) return;

  // 🔹 Buscar si ya existe en carrito
  const id = String(prod.codigoBarra || prod.codigo || "").trim();
const existente = carrito.find(p => p.id === id);


  // =======================================================
  // ⚖️ PRODUCTOS DE BALANZA (cantidad < 1)
  // =======================================================
  if (cantidad < 1) {
    carrito.push(crearItem(prod, cantidad));
    return;
  }

  // =======================================================
  // 🧾 PRODUCTOS NORMALES
  // =======================================================
  if (existente) {
    existente.cantidad += cantidad;
    existente.precioUnit = obtenerPrecioUnitario(prod, existente.cantidad);
    existente.importe = existente.cantidad * existente.precioUnit;
    return;
  }

  // Nuevo producto
  carrito.push(crearItem(prod, cantidad));
}


/* ===========================================================
   🧩 SECCIÓN 4: CREAR ITEM DE CARRITO
   -----------------------------------------------------------
   Normaliza la estructura interna.
   =========================================================== */

function crearItem(prod, cantidad) {
  const precioUnit = obtenerPrecioUnitario(prod, cantidad);
  const id = String(prod.codigoBarra || prod.codigo);

  return {
    id,
    nombre: prod.concepto || prod.nombre,
    codigo: id,
    cantidad,
    precioUnit,
    importe: cantidad * precioUnit,

    costoUnit: Number(prod.costoSinImpuesto || 0),

    claveSat: prod.claveSat || null,
    unidadSat: prod.unidadMedidaSat || null,

    ivaTasa: Number(prod.ivaTasa || 0),
    iepsTasa: Number(prod.iepsTasa || 0),

    departamento_id: prod.departamento_id || null
  };
}


/* ===========================================================
   ✏️ SECCIÓN 5: ACTUALIZAR CANTIDAD
   -----------------------------------------------------------
   Usado por spinners o edición manual.
   =========================================================== */

function actualizarCantidad(id, nuevaCantidad) {
  const item = carrito.find(p => p.id === id);
  if (!item) return;

  const cant = Number(nuevaCantidad);
  if (isNaN(cant) || cant < 0) return;

  item.cantidad = cant;
  item.precioUnit = obtenerPrecioUnitario(item, cant);
  item.importe = item.cantidad * item.precioUnit;
}


/* ===========================================================
   ❌ SECCIÓN 6: ELIMINAR ITEM
   =========================================================== */

function eliminarItem(id) {
  const idx = carrito.findIndex(p => p.id === id);
  if (idx >= 0) {
    carrito.splice(idx, 1);
  }
}


/* ===========================================================
   🧹 SECCIÓN 7: LIMPIAR CARRITO
   =========================================================== */

function limpiarCarrito() {
  carrito.length = 0;
}


/* ===========================================================
   📦 SECCIÓN 8: EXPOSICIÓN CONTROLADA
   -----------------------------------------------------------
   Solo lo necesario al scope global.
   =========================================================== */

window.carrito = carrito;
window.addProduct = addProduct;
window.actualizarCantidad = actualizarCantidad;
window.eliminarItem = eliminarItem;
window.limpiarCarrito = limpiarCarrito;

