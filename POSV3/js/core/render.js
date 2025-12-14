/* ===========================================================
   🖥️ PROVSOFT POS – RENDER CORE (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Pintar el carrito
   - Pintar totales
   - Actualizar UI con el MENOR DOM posible
   -----------------------------------------------------------
   PRINCIPIOS:
   ❌ Nada de lógica de negocio
   ❌ Nada de Firestore
   ❌ Nada de cálculos aquí
   ✅ Render incremental
   ✅ Mobile first
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: REFERENCIAS DE DOM (CACHEADAS)
   -----------------------------------------------------------
   Se buscan UNA SOLA VEZ.
   =========================================================== */

const DOM = {
  lista: document.getElementById("listaCarrito"),
  subtotal: document.getElementById("subtotalVenta"),
  total: document.getElementById("totalVenta")
};



/* ===========================================================
   🔢 SECCIÓN 2: FORMATEO RÁPIDO
   =========================================================== */

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}


/* ===========================================================
   🧩 SECCIÓN 3: TEMPLATE DE ITEM
   -----------------------------------------------------------
   HTML mínimo, sin listeners aquí.
   =========================================================== */

function templateItem(item) {
  return `
    <div class="item" data-id="${item.id}">
      <div class="i-nombre">${item.nombre}</div>

      <div class="i-detalle">
        <span>${item.cantidad}</span>
        <span>×</span>
        <span>${money(item.precioUnit)}</span>
      </div>

      <div class="i-importe">${money(item.importe)}</div>
    </div>
  `;
}


/* ===========================================================
   🛒 SECCIÓN 4: RENDER DEL CARRITO
   -----------------------------------------------------------
   Un solo innerHTML.
   =========================================================== */

function renderCarrito() {
  if (!DOM.lista) return;

  let html = "";
  for (const item of window.carrito) {
    html += templateItem(item);
  }

  DOM.lista.innerHTML = html;
}


/* ===========================================================
   🧮 SECCIÓN 5: RENDER DE TOTALES
   =========================================================== */

function renderTotales() {
  const tot = calcularTotales(window.carrito, window.descuentoActual || null);

  if (DOM.subtotal) DOM.subtotal.textContent = money(tot.subtotal);
  if (DOM.total) DOM.total.textContent = money(tot.total);
}



/* ===========================================================
   🎯 SECCIÓN 6: RENDER GENERAL
   -----------------------------------------------------------
   Único punto llamado por requestRender().
   =========================================================== */

function render() {
  renderCarrito();
  renderTotales();
}


/* ===========================================================
   🌍 SECCIÓN 7: EXPOSICIÓN CONTROLADA
   =========================================================== */

window.render = render;

