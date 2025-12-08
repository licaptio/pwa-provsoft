// ======================================================
// POS-TICKET — PROVSOFT 
// Generador e impresión profesional de tickets
// ======================================================

// Tomamos funciones globales del POS
const money = window.money;
const carrito = window.carrito;

// ------------------------------
// 🔧 Formato 40 columnas
// ------------------------------
function pad(text, length) {
  text = String(text);
  return text.length >= length ? text.substring(0, length) : text + " ".repeat(length - text.length);
}

function center(text, width = 40) {
  const s = Math.floor((width - text.length) / 2);
  return " ".repeat(s) + text;
}

// ======================================================
// 🧾 GENERAR TICKET
// ======================================================
function generarTicket(venta) {
  let out = "";

  out += center("PROVSOFT POS") + "\n";
  out += center("PUNTO DE VENTA MOVIL") + "\n";
  out += "----------------------------------------\n";
  out += `Fecha: ${new Date().toLocaleString()}\n`;
  out += `Usuario: ${venta.usuario}\n`;
  out += `Cliente: ${venta.cliente}\n`;
  out += "----------------------------------------\n";
  out += pad("Producto", 20) + pad("Cant", 6) + pad("Imp", 12) + "\n";
  out += "----------------------------------------\n";

  venta.items.forEach(it => {
    const nom = pad(it.nombre.substring(0, 20), 20);
    const cant = pad(it.cantidad.toFixed(2), 6);
    const imp = pad(money(it.importe), 12);
    out += `${nom}${cant}${imp}\n`;
  });

  out += "----------------------------------------\n";
  out += `SUBTOTAL: ${money(venta.subtotal)}\n`;
  out += `TOTAL:    ${money(venta.total)}\n`;
  out += "----------------------------------------\n";
  out += center("Gracias por su compra") + "\n";
  out += "----------------------------------------\n";

  return out;
}

// ======================================================
// 🖨️ IMPRIMIR TICKET (RawBT, InnerPrinter o navegador)
// ======================================================
function imprimirTicket(venta) {
  const texto = generarTicket(venta);

  try {
    // 1️⃣ InnerPrinter (Android)
    if (window.InnerPrinter?.printText) {
      window.InnerPrinter.printText(texto);
      console.log("🖨️ Impreso vía InnerPrinter");
      return;
    }

    // 2️⃣ RawBT (Android)
    if (/Android/i.test(navigator.userAgent)) {
      const encoded = encodeURIComponent(texto);
      window.location.href = `rawbt:print?data=${encoded}`;
      console.log("🖨️ Ticket enviado a RawBT");
      return;
    }

    // 3️⃣ Impresión por navegador (Fallback PC)
    const w = window.open("", "_blank");
    w.document.write(`<pre>${texto}</pre>`);
    w.print();
    w.close();
    console.log("🖨️ Ticket impreso en navegador");

  } catch (err) {
    console.error("❌ Error de impresión:", err);
    alert("No se pudo imprimir el ticket");
  }
}

// ======================================================
// 🚀 FUNCIÓN DE ALTO NIVEL: GUARDAR + IMPRIMIR
// ======================================================

// Tomamos la función global generada por pos-firebase.js
const guardarVenta = window.guardarVenta;

async function guardarEImprimir(tipoPago = "EFECTIVO") {
  const venta = await guardarVenta(tipoPago);

  if (venta) {
    imprimirTicket(venta);
  }
}

// Exponer global
window.guardarEImprimir = guardarEImprimir;
window.imprimirTicket = imprimirTicket;
