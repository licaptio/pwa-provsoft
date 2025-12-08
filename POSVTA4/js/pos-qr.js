// ======================================================
// POS-QR — PROVSOFT
// Cámara, QR Scanner y captura de códigos rápidos
// ======================================================

import { ejecutarBusqueda } from "./pos-busqueda.js";
import { beep, toast } from "./pos-core.js";

let scanner = null;
let cameraActivo = false;

const $ = s => document.querySelector(s);

// Contenedor donde aparece la cámara
const camDiv = document.createElement("div");
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

// ======================================================
// 🚀 ACTIVAR LA CÁMARA Y ESCANEAR
// ======================================================
export function activarQR() {
  if (cameraActivo) return;

  camDiv.style.display = "flex";
  cameraActivo = true;

  try {
    // Iniciar lector QR
    scanner = new Html5Qrcode("reader");

    scanner.start(
      { facingMode: "environment" }, // cámara trasera
      { fps: 10, qrbox: { width: 240, height: 240 } },

      // 🎯 Cuando detecta código
      code => {
        console.log("QR detectado:", code);
        beep(900, 0.1);

        // mandar al buscador
        $("#buscador").value = code;
        ejecutarBusqueda();

        cerrarQR();
      },

      // progreso del escaneo
      errorMsg => {
        // Silencioso para no saturar la consola
      }
    );

  } catch (err) {
    console.error("❌ Error activando cámara:", err);
    toast("No se pudo activar la cámara", "#c0392b");
    cerrarQR();
  }
}

// ======================================================
// ❌ CERRAR LA CÁMARA
// ======================================================
export function cerrarQR() {
  camDiv.style.display = "none";
  cameraActivo = false;

  if (scanner) {
    scanner.stop().catch(() => {}).finally(() => {
      scanner.clear();
      scanner = null;
    });
  }
}

$("#btnCerrarQR")?.addEventListener("click", cerrarQR);

// Exponer por si se usa externamente
window.activarQR = activarQR;
window.cerrarQR = cerrarQR;
