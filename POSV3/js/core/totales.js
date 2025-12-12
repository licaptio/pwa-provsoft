/* ===========================================================
   🧮 PROVSOFT POS – TOTALES CORE (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Calcular subtotales
   - Calcular IVA e IEPS
   - Aplicar descuento (monto o porcentaje)
   - Entregar totales finales
   -----------------------------------------------------------
   PRINCIPIOS:
   ❌ Nada de DOM
   ❌ Nada de Firestore
   ❌ Nada de render
   ✅ Precisión fiscal
   ✅ Ultra rápido (loops simples)
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: CONFIGURACIÓN GENERAL
   =========================================================== */

const CONFIG_TOTALES = {
  redondeo: 2   // decimales finales
};


/* ===========================================================
   🔢 SECCIÓN 2: UTILIDADES INTERNAS
   -----------------------------------------------------------
   Evitan errores de coma flotante.
   =========================================================== */

function redondear(n, dec = CONFIG_TOTALES.redondeo) {
  return Number(Number(n).toFixed(dec));
}


/* ===========================================================
   🧾 SECCIÓN 3: CÁLCULO POR ITEM
   -----------------------------------------------------------
   Calcula impuestos por renglón.
   =========================================================== */

function calcularItem(item) {
  const cantidad = Number(item.cantidad || 0);
  const precioUnit = Number(item.precioUnit || 0);

  const importe = cantidad * precioUnit;

  // IEPS (si aplica)
  const ieps = item.iepsTasa
    ? importe * Number(item.iepsTasa)
    : 0;

  // IVA (si aplica, puede ir sobre base + IEPS)
  const baseIVA = importe + ieps;
  const iva = item.ivaTasa
    ? baseIVA * Number(item.ivaTasa)
    : 0;

  return {
    importe: redondear(importe),
    ieps: redondear(ieps),
    iva: redondear(iva)
  };
}


/* ===========================================================
   🧮 SECCIÓN 4: CÁLCULO GLOBAL DE TOTALES
   -----------------------------------------------------------
   Punto ÚNICO de cálculo financiero del POS.
   =========================================================== */

function calcularTotales(carrito, descuento = null) {
  let subtotal = 0;
  let totalIVA = 0;
  let totalIEPS = 0;

  // 🔹 Recorrido único del carrito
  for (const item of carrito) {
    const calc = calcularItem(item);

    subtotal += calc.importe;
    totalIVA += calc.iva;
    totalIEPS += calc.ieps;
  }

  subtotal = redondear(subtotal);
  totalIVA = redondear(totalIVA);
  totalIEPS = redondear(totalIEPS);

  let totalAntesDescuento = subtotal + totalIVA + totalIEPS;

  // =======================================================
  // 💸 DESCUENTOS (MONTO O PORCENTAJE)
  // =======================================================
  let descuentoMonto = 0;

  if (descuento) {

    // 🔹 Descuento porcentual { tipo: 'porcentaje', valor: 10 }
    if (descuento.tipo === "porcentaje") {
      descuentoMonto = totalAntesDescuento * (Number(descuento.valor) / 100);
    }

    // 🔹 Descuento fijo { tipo: 'monto', valor: 50 }
    if (descuento.tipo === "monto") {
      descuentoMonto = Number(descuento.valor);
    }
  }

  descuentoMonto = Math.min(descuentoMonto, totalAntesDescuento);
  descuentoMonto = redondear(descuentoMonto);

  // =======================================================
  // 🧾 TOTAL FINAL
  // =======================================================
  const total = redondear(
    totalAntesDescuento - descuentoMonto
  );

  return {
    subtotal,
    iva: totalIVA,
    ieps: totalIEPS,
    descuento: descuentoMonto,
    total
  };
}


/* ===========================================================
   🌍 SECCIÓN 5: EXPOSICIÓN CONTROLADA
   =========================================================== */

window.calcularTotales = calcularTotales;
