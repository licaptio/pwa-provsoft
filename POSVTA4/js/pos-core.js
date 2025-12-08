// =====================================================
// POS-CORE — PROVSOFT
// Carrito, totales, utilidades globales
// =====================================================

// ---- Variables Globales ----
window.carrito = [];
window.catalogo = [];
window.departamentos = {};
window.USUARIO_LOGUEADO = null;
window.clienteSeleccionado = null;

// --------------------------------
// 🔢 Formateo monetario rápido
// --------------------------------
window.money = n => "$" + (Number(n) || 0).toFixed(2);

// --------------------------------
// Acceso DOM cortito
// --------------------------------
window.$ = s => document.querySelector(s);

// --------------------------------
// Lista de productos con MAYOREO
// --------------------------------
window.productosMayoreo = [
  "08339412","08346917","75001315","75001322","75001476","75016777",
  "75021597","75031053","75035259","75046521","75046781","75052836",
  "75056308","75059514","75063801","75064648","75066345","75068738",
  "75068745","75068776","75068783","75068844","75069902","75071295",
  "75071776","75080495","7501020540666"
];

// --------------------------------
// 🔊 Beep universal
// --------------------------------
window.beep = (freq = 800, duration = 0.1) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
};

// --------------------------------
// 🔥 Toast universal
// --------------------------------
window.toast = (msg, color = "#0c6cbd") => {
  const d = document.createElement("div");
  d.textContent = msg;
  d.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:${color};color:white;padding:10px 14px;border-radius:14px;
    font-size:15px;z-index:99999;opacity:0;transition:opacity .35s;
  `;
  document.body.appendChild(d);
  setTimeout(() => (d.style.opacity = 1), 20);
  setTimeout(() => {
    d.style.opacity = 0;
    setTimeout(() => d.remove(), 400);
  }, 2200);
};

// --------------------------------
// 💰 Precio según cantidad
// --------------------------------
window.obtenerPrecioSegunCantidad = (prod, cant) => {
  if (!window.productosMayoreo.includes(String(prod.codigo))) {
    return Number(prod.precioPublico || 0);
  }
  if (cant >= 5 && prod.mayoreo) return Number(prod.mayoreo);
  return Number(prod.precioPublico || 0);
};

// --------------------------------
// ➕ AGREGAR PRODUCTO
// --------------------------------
window.addProduct = (prod, cant = 1) => {
  if (!prod) return;

  cant = parseFloat(cant);
  const existe = window.carrito.find(x => x.id === prod.id);

  const precioCorrecto = window.obtenerPrecioSegunCantidad(
    prod,
    existe ? existe.cantidad + cant : cant
  );

  if (existe) {
    existe.cantidad += cant;
    existe.precioUnit = precioCorrecto;
    existe.importe = existe.cantidad * precioCorrecto;
  } else {
    window.carrito.push({
      ...prod,
      cantidad: cant,
      precioUnit: precioCorrecto,
      importe: cant * precioCorrecto
    });
  }

  window.renderDebounced();
  window.beep(900);
};

// --------------------------------
// ❌ ELIMINAR PRODUCTO
// --------------------------------
window.delItem = id => {
  window.carrito = window.carrito.filter(p => p.id !== id);
  window.renderDebounced();
};

// --------------------------------
// 🔄 ACTUALIZAR CANTIDAD
// --------------------------------
window.actualizarCantidad = (id, nueva) => {
  const it = window.carrito.find(x => x.id === id);
  if (!it) return;

  const cant = parseFloat(nueva);
  if (isNaN(cant) || cant <= 0) return;

  it.cantidad = cant;
  it.precioUnit = window.obtenerPrecioSegunCantidad(it, cant);
  it.importe = cant * it.precioUnit;

  window.renderDebounced();
};

// --------------------------------
// 🧮 CALCULAR TOTALES
// --------------------------------
window.calcularTotales = (desc = 0) => {
  let subtotal = 0;
  window.carrito.forEach(it => subtotal += it.importe);

  const descMonto = subtotal * (desc / 100);
  const total = subtotal - descMonto;

  return {
    subtotal: subtotal.toFixed(2),
    descuento: descMonto.toFixed(2),
    total: total.toFixed(2),
    impuestos: 0
  };
};

// --------------------------------
// 🖼️ RENDER DEL CARRITO
// --------------------------------
window.render = (desc = 0) => {
  const tbody = $("#tbody");
  if (!tbody) return;

  tbody.innerHTML = window.carrito
    .map(it => `
      <tr>
        <td>${it.nombre}</td>
        <td>
          <input type="number" value="${it.cantidad}"
            onchange="actualizarCantidad('${it.id}',this.value)"
            style="width:60px;text-align:center;">
        </td>
        <td style="text-align:right;">${money(it.importe)}</td>
        <td><button onclick="delItem('${it.id}')" style="background:#ff4444;color:#fff;">×</button></td>
      </tr>
    `)
    .join("");

  const t = window.calcularTotales(desc);

  $("#lblSubtotal").textContent = money(t.subtotal);
  $("#lblTotal").textContent = money(t.total);
};

// Render con debounce
let timer = null;
window.renderDebounced = () => {
  clearTimeout(timer);
  timer = setTimeout(window.render, 35);
};
