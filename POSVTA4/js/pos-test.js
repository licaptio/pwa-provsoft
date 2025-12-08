// ==========================================================
// POS-TEST — PROVSOFT
// Panel de pruebas: GPS, impresora, corte, navegación
// ==========================================================

// Usamos funciones globales
const beep = window.beep;
const toast = window.toast;

const pantallaVenta = document.getElementById("pantallaVenta");
const pantallaTest = document.getElementById("pantallaTest");
const testResult = document.getElementById("testResult");
const carritoContainer = document.getElementById("carrito-container");

// ===============================
// 🔵 ABRIR MODO TEST
// ===============================
document.getElementById("btnVerCarrito")?.addEventListener("click", () => {
  pantallaVenta.style.display = "none";
  if (carritoContainer) carritoContainer.style.display = "none";

  pantallaTest.style.display = "block";

  if (beep) beep(900);
  if (toast) toast("🧪 Modo Test Activo", "#f59e0b");
});

// ===============================
// 🔵 VOLVER AL POS
// ===============================
document.getElementById("btnVolverVenta")?.addEventListener("click", () => {
  pantallaTest.style.display = "none";
  pantallaVenta.style.display = "flex";

  if (carritoContainer) carritoContainer.style.display = "block";

  if (beep) beep(870);
  if (toast) toast("Regresando al POS", "#16a34a");
});

// ===============================
// 🖨 TEST IMPRESORA
// ===============================
document.getElementById("btnTestPrinter")?.addEventListener("click", () => {
  testResult.innerHTML = "🖨 Enviando ticket de prueba...";

  const ticket = `
*** PRUEBA IMPRESORA ***
Fecha: ${new Date().toLocaleString()}
Sucursal: PROVSOFT
-----------------------------
Artículo         Cant  Precio
PRUEBA IMPRESIÓN 1.00   $1.00
-----------------------------
TOTAL: $1.00
-----------------------------
`;

  try {
    // InnerPrinter (Android)
    if (window.InnerPrinter?.printText) {
      window.InnerPrinter.printText(ticket);
      testResult.innerHTML = "✅ InnerPrinter OK";
      if (beep) beep(600);
      return;
    }

    // RawBT (Android)
    if (/Android/i.test(navigator.userAgent)) {
      const enc = encodeURIComponent(ticket);
      window.location.href = `rawbt:print?data=${enc}`;
      testResult.innerHTML = "✅ RawBT OK";
      if (beep) beep(600);
      return;
    }

    // Impresión por navegador (PC)
    const w = window.open("", "_blank");
    w.document.write(`<pre>${ticket}</pre>`);
    w.print();
    w.close();

    testResult.innerHTML = "🖨 Impreso por navegador";
  } catch (e) {
    testResult.innerHTML = "❌ Error al imprimir";
  }
});

// ===============================
// 📍 TEST GPS
// ===============================
document.getElementById("btnTestGPS")?.addEventListener("click", () => {
  testResult.innerHTML = "📡 Obteniendo ubicación...";

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;

      testResult.innerHTML = `
        ✅ Ubicación:<br>
        Lat: ${latitude.toFixed(6)}<br>
        Lng: ${longitude.toFixed(6)}<br>
        <a href="https://maps.google.com/?q=${latitude},${longitude}" target="_blank">
          🌎 Ver en Google Maps
        </a>`;

      if (beep) beep(900);
    },
    () => {
      testResult.innerHTML = "❌ GPS no disponible";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ===============================
// 📊 CORTE DE RUTA
// ===============================
document.getElementById("btnCorteRuta")?.addEventListener("click", () => {
  window.location.href = "corterutamovil.html";
});
