// ======================================================
// POS-QR — PROVSOFT
// Cámara, QR Scanner y captura de códigos rápidos
// ======================================================

// Tomamos funciones globales desde window
const ejecutarBusqueda = window.ejecutarBusqueda;
const beep = window.beep;
const toast = window.toast;

let scanner = null;
let cameraActivo = false;

const $ = s => document.querySelector(s);

// Crear contenedor de cámara si no existe
let camDiv = document.getElementById("qrCamDiv");

if (!camDiv) {
  camDiv = document.createElement("div");
  camDiv.id = "qrCamDiv";
  camDiv.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.85);
    display: none;
    z-index: 99999;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  `;
  document.body.appendChild(camDiv);

  camDiv.innerHTML = `
    <div id="reader" style="width:85%;max-width:380px;"></div>
    <button id="btnCerrarQR"
      style="margin-top:15px;padding:10px 16px;border:none;border-radius:8px;
             background:#c0392b;color:white;font-size:16px;">
       Cerrar Cámara
    </button>
  `;
}

// ======================================================
// 🚀 ACTIVAR LA CÁMARA PARA ESCANEAR QR
// ======================================================
function activarQR() {
  if (cameraActivo) return;

  camDiv.style.display = "flex";
  cameraActivo = true;

  try {
    scanner = new Html5Qrcode("reader");

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },

      // 🎯 Cuando se detecta el código
      code => {
        console.log("QR detectado:", code);
        beep(900);

        $("#buscador").value = code;

        if (typeof ejecutarBusqueda === "function") {
          ejecutarBusqueda();
        }

        cerrarQR();
      },

      // Error silencioso para no saturar pantalla
      err => {}
    );

  } catch (err) {
    console.error("❌ Error activando cámara:", err);
    toast("No se pudo activar la cámara", "#c0392b");
    cerrarQR();
  }
}

// ======================================================
// ❌ CERRAR QR
// ======================================================
function cerrarQR() {
  camDiv.style.display = "none";
  cameraActivo = false;

  if (scanner) {
    scanner.stop()
      .catch(() => {})
      .finally(() => {
        scanner.clear();
        scanner = null;
      });
  }
}

// Botón cerrar
document.getElementById("btnCerrarQR")?.addEventListener("click", cerrarQR);

// Exponer globalmente para otros módulos
window.activarQR = activarQR;
window.cerrarQR = cerrarQR;
