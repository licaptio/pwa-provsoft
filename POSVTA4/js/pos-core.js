// ===============================
// POS CORE – PROVSOFT
// Manejo de carrito, totales y UI
// ===============================

// --------- VARIABLES GLOBALES ---------
export let carrito = [];
export let catalogo = [];
export let departamentos = {};
export let rutaId = null;
export let USUARIO_LOGUEADO = null;
export let clienteSeleccionado = null;

export const money = n => "$" + (Number(n) || 0).toFixed(2);

export const $ = s => document.querySelector(s);

export const productosMayoreo = [
  "08339412","08346917","75001315","75001322","75001476","75016777",
  "75021597","75031053","75035259","75046521","75046781","75052836",
  "75056308","75059514","75063801","75064648","75066345","75068738",
  "75068745","75068776","75068783","75068844","75069902","75071295",
  "75071776","75080495","7501020540666"
];

// ========= BEEP UNIVERSAL =========
export function beep(freq = 800, duration = 0.1) {
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
}

// ========= TOAST UNIVERSAL =========
export function toast(msg, color = "#0c6cbd") {
  const d = document.createElement("div");
  d.textContent = msg;
  d.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:${color};color:white;padding:8px 12px;border-radius:12px;
    font-size:14px;z-index:99999;opacity:0;transition:opacity .3s;
  `;
  document.body.appendChild(d);
  setTimeout(() => (d.style.opacity = 1), 30);
  setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 400); }, 2200);
}

// ========= PRECIO POR CANTIDAD =========
export function obtenerPrecioSegunCantidad(prod, cant) {
  if (!productosMayoreo.includes(String(prod.codigo))) {
    return Number(prod.precioPublico || 0);
  }
  if (cant >= 5 && prod.mayoreo) {
    return Number(prod.mayoreo);
  }
  return Number(prod.precioPublico || 0);
}

// ========= AGREGAR PRODUCTO =========
export function addProduct(prod, cant = 1) {
  if (!prod) return;

  cant = parseFloat(cant);
  const existe = carrito.find(x => x.id === prod.id);

  const precioCorrecto = obtenerPrecioSegunCantidad(prod, existe ? existe.cantidad + cant : cant);

  if (existe) {
    existe.cantidad += cant;
    existe.precioUnit = precioCorrecto;
    existe.importe = existe.cantidad * precioCorrecto;
  } else {
    carrito.push({
      ...prod,
      cantidad: cant,
      precioUnit: precioCorrecto,
      importe: cant * precioCorrecto
    });
  }

  renderDebounced();
  beep(850);
}

// ========= ELIMINAR PRODUCTO =========
export function delItem(id) {
  carrito = carrito.filter(p => p.id !== id);
  renderDebounced();
}

// ========= ACTUALIZAR CANTIDAD =========
export function actualizarCantidad(id, nueva) {
  const it = carrito.find(x => x.id === id);
  if (!it) return;

  const cant = parseFloat(nueva);
  if (isNaN(cant) || cant <= 0) return;

  it.cantidad = cant;
  it.precioUnit = obtenerPrecioSegunCantidad(it, cant);
  it.importe = cant * it.precioUnit;

  renderDebounced();
}

// ========= CALCULAR TOTALES =========
export function calcularTotales(desc = 0) {
  let subtotal = 0;

  carrito.forEach(it => subtotal += it.importe);

  const descMonto = subtotal * (desc / 100);
  const total = subtotal - descMonto;

  return {
    subtotal: subtotal.toFixed(2),
    descuento: descMonto.toFixed(2),
    total: total.toFixed(2),
    impuestos: 0
  };
}

// ========= RENDER =========
export function render(desc = 0) {
  const tbody = $("#tbody");
  tbody.innerHTML = carrito
    .map(it => `
      <tr>
        <td>${it.nombre}</td>
        <td><input type="number" value="${it.cantidad}"
              onchange="actualizarCantidad('${it.id}',this.value)"
              style="width:60px;text-align:center;"></td>
        <td style="text-align:right;">${money(it.importe)}</td>
        <td><button onclick="delItem('${it.id}')">×</button></td>
      </tr>
    `)
    .join("");

  const t = calcularTotales(desc);
  $("#lblSubtotal").textContent = money(t.subtotal);
  $("#lblTotal").textContent = money(t.total);
}

let timer;
export function renderDebounced() {
  clearTimeout(timer);
  timer = setTimeout(render, 50);
}

// Exponer para HTML
window.addProduct = addProduct;
window.render = render;
window.actualizarCantidad = actualizarCantidad;
window.delItem = delItem;
