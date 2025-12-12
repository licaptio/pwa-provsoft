/* ===========================================================
   🧾 PROVSOFT POS – TICKET TÉRMICO (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Construir texto del ticket
   - Imprimir (Android / InnerPrinter / Browser)
   -----------------------------------------------------------
   ❌ NO calcula totales
   ❌ NO toca Firestore
   ❌ NO maneja cobro
   ✅ Ultra rápido
   ✅ Térmico real 72mm
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: FORMATEADORES ULTRA
   =========================================================== */

const fmt = n => (Number(n || 0)).toLocaleString("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const pad = (txt, len) => String(txt).padStart(len, " ");


/* ===========================================================
   📦 SECCIÓN 2: GENERAR TEXTO DEL TICKET
   =========================================================== */

function generarTicketTexto(venta) {
  const t = venta.totales || {};
  const descPct = venta.descuento || 0;

  let out = `
PROVEEDORA MATRIZ
MADERO 690 SUR, CENTRO
LINARES, NUEVO LEÓN
RFC: PDD031204KL5
--------------------------------
Venta: ${venta.folio}
Fecha: ${venta.fecha}
Cliente: ${venta.cliente}
--------------------------------
`;

  venta.detalle.forEach(p => {
    const nombre = p.nombre.substring(0, 32);
    const cant = pad(p.cantidad.toFixed(2), 5);
    let precio = p.precioUnit;

    // aplicar descuento prorrateado
    if (descPct > 0) {
      precio = precio * ((100 - descPct) / 100);
    }

    const imp = fmt(precio * p.cantidad);

    out += `${nombre}\n`;
    out += `Cant:${cant}  ${pad(fmt(precio), 8)}  ${pad(imp, 9)}\n`;
  });

  out += `--------------------------------
Subtotal: ${fmt(t.subtotal)}
Desc ${descPct}%: ${fmt(t.descuento)}
Impuestos: ${fmt(t.impuestos)}
TOTAL: ${fmt(t.total)}
Pago: ${fmt(venta.pago)}
Cambio: ${fmt(venta.cambio)}
--------------------------------
Artículos: ${venta.articulos}
Cajero: ${venta.cajero}
--------------------------------
¡GRACIAS POR SU COMPRA!
`;

  return out.trim();
}


/* ===========================================================
   🖨️ SECCIÓN 3: IMPRESIÓN MULTI-PLATAFORMA
   =========================================================== */

function imprimirTicket(venta) {
  const texto = generarTicketTexto(venta);

  // 🖨️ 1) InnerPrinter (Android POS nativo)
  if (window.InnerPrinter?.printText) {
    window.InnerPrinter.printText(texto);
    return;
  }

  // 🖨️ 2) RawBT (Android)
  if (/Android/i.test(navigator.userAgent)) {
    try {
      window.location.href =
        "rawbt:print?data=" + encodeURIComponent(texto);
      return;
    } catch (e) {}
  }

  // 🖨️ 3) Navegador (fallback)
  const w = window.open("", "_blank");
  w.document.write(`<pre style="font-family:monospace">${texto}</pre>`);
  w.document.close();
  w.print();
  w.close();
}


/* ===========================================================
   🌍 SECCIÓN 4: EXPOSICIÓN CONTROLADA
   =========================================================== */

window.imprimirTicket = imprimirTicket;
