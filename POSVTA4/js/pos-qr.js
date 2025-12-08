// ======================================================
// POS-QR — PROVSOFT
// Cámara, QR Scanner y captura de códigos rápidos
// ======================================================

// NO imports. Usamos window.ejecutarBusqueda, window.toast, window.beep

let scanner = null;
let cameraActivo = false;

const $ = s => document.querySelector(s);

// Crear contenedor de cámara si no existe
let camDiv = document.querySelector("#qrCamDiv");
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
// 🚀 ACTIVAR LA CÁMARA Y ESCANEAR
// ======================================================
window.activarQR = function () {
  if (cameraActivo) return;

  camDiv.style.display = "flex";
  cameraActivo = true;

  try {
    scanner = new Html5Qrcode("reader");

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },

      // 🎯 QR DETECTADO
      code => {
        console.log("QR detectado:", code);

        if (window.beep) window.beep(900, 0.1);

        const inp = $("#buscador");
        if (inp) {
          inp.value = code;
          if (window.ejecutarBusqueda) window.ejecutarBusqueda();
        }

        window.cerrarQR();
      },

      // Ignorar errores repetitivos
      () => {}
    );

  } catch (err) {
    console.error("❌ Error al activar cámara:", err);
    if (window.toast) window.toast("No se pudo activar la cámara", "#c0392b");
    window.cerrarQR();
  }
};

// ======================================================
// ❌ CERRAR LA CÁMARA
// ======================================================
window.cerrarQR = function () {
  camDiv.style.display = "none";
  cameraActivo = false;

  if (scanner) {
    scanner.stop().catch(() => {}).finally(() => {
      scanner.clear();
      scanner = null;
    });
  }
};

// Botón cerrar
document.addEventListener("click", e => {
  if (e.target.id === "btnCerrarQR") {
    window.cerrarQR();
  }
});
