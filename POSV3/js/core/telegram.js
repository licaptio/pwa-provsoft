/* ===========================================================
   📲 PROVSOFT POS – TELEGRAM CORE (V3 ULTRA)
   ===========================================================
   RESPONSABILIDAD ÚNICA:
   - Enviar ticket a Telegram
   - Enviar ubicación si existe
   - NO bloquear venta si falla
   -----------------------------------------------------------
   ❌ NO calcula
   ❌ NO cobra
   ❌ NO guarda ventas
   ✅ Ultra rápido
   ✅ Seguro
   =========================================================== */


/* ===========================================================
   🧠 SECCIÓN 1: CONFIGURACIÓN
   =========================================================== */

// ⚠️ En producción: mover a backend / env
const TG_BOT_TOKEN = "TU_BOT_TOKEN_AQUI";
const TG_CHAT_ID  = "TU_CHAT_ID_AQUI";

// Cola local offline
const TG_COLA_KEY = "provsoft_telegram_pendientes_v3";


/* ===========================================================
   📦 SECCIÓN 2: UTILIDADES
   =========================================================== */

const fmt = n => (Number(n || 0)).toLocaleString("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function leerColaTG() {
  try {
    return JSON.parse(localStorage.getItem(TG_COLA_KEY) || "[]");
  } catch {
    return [];
  }
}

function guardarColaTG(lista) {
  localStorage.setItem(TG_COLA_KEY, JSON.stringify(lista));
}


/* ===========================================================
   🧾 SECCIÓN 3: CONSTRUIR TEXTO DEL MENSAJE
   =========================================================== */

function construirMensajeTelegram(venta) {
  let txt = `
🧾 *VENTA PROVSOFT*
--------------------------------
*Folio:* ${venta.folio}
*Fecha:* ${venta.fecha}
*Cliente:* ${venta.cliente}
--------------------------------
`;

  venta.detalle.forEach(p => {
    txt += `${p.nombre.substring(0, 28)}\n`;
    txt += `Cant:${p.cantidad}  $${fmt(p.importe)}\n`;
  });

  txt += `
--------------------------------
*Subtotal:* $${fmt(venta.totales.subtotal)}
*Desc:* $${fmt(venta.totales.descuento)}
*Imp:* $${fmt(venta.totales.impuestos)}
*TOTAL:* $${fmt(venta.totales.total)}
--------------------------------
*Cajero:* ${venta.cajero}
`;

  return txt.trim();
}


/* ===========================================================
   🚀 SECCIÓN 4: ENVÍO A TELEGRAM
   =========================================================== */

async function enviarTelegram(venta) {
  const mensaje = construirMensajeTelegram(venta);

  if (!navigator.onLine) {
    encolarTelegram(venta);
    return;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: mensaje,
          parse_mode: "Markdown"
        })
      }
    );

    if (!res.ok) throw new Error(res.statusText);

    // 📍 Enviar ubicación si existe
    if (venta.ubicacion?.lat && venta.ubicacion?.lng) {
      await fetch(
        `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendLocation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TG_CHAT_ID,
            latitude: venta.ubicacion.lat,
            longitude: venta.ubicacion.lng
          })
        }
      );
    }

    console.log("✅ Telegram enviado:", venta.folio);

  } catch (err) {
    console.warn("⚠️ Telegram falló, encolando:", err);
    encolarTelegram(venta);
  }
}


/* ===========================================================
   📦 SECCIÓN 5: COLA OFFLINE TELEGRAM
   =========================================================== */

function encolarTelegram(venta) {
  const cola = leerColaTG();
  cola.push({
    ...venta,
    _tgPendiente: true,
    _timestamp: Date.now()
  });
  guardarColaTG(cola);
}


/* ===========================================================
   🔁 SECCIÓN 6: REINTENTO AUTOMÁTICO
   =========================================================== */

async function reenviarTelegramPendiente() {
  if (!navigator.onLine) return;

  const cola = leerColaTG();
  if (!cola.length) return;

  const restantes = [];

  for (const venta of cola) {
    try {
      await enviarTelegram(venta);
    } catch {
      restantes.push(venta);
    }
  }

  guardarColaTG(restantes);

  if (!restantes.length) {
    toast("📲 Telegram sincronizado", "#16a34a");
  }
}


/* ===========================================================
   🌐 SECCIÓN 7: EVENTOS DE RED
   =========================================================== */

window.addEventListener("online", () => {
  setTimeout(reenviarTelegramPendiente, 1200);
});


/* ===========================================================
   🌍 SECCIÓN 8: EXPOSICIÓN CONTROLADA
   =========================================================== */

window.enviarTelegram = enviarTelegram;
window.reenviarTelegramPendiente = reenviarTelegramPendiente;
