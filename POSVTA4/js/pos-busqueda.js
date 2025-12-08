// ==========================================
// POS-BÚSQUEDA — PROVSOFT
// Maneja búsqueda, equivalentes y balanza
// ==========================================

import { catalogo, toast, beep, addProduct } from "./pos-core.js";

const $ = s => document.querySelector(s);

// Elementos de UI
const inputBuscador = $("#buscador");
const resultadosDiv = $("#resultados");

// ------------------------------
// 🔎 BÚSQUEDA LOCAL SIMPLIFICADA
// ------------------------------
export function buscarLocal(texto) {
  if (!texto) return [];

  texto = texto.toLowerCase();

  return catalogo.filter(p =>
    p.nombre?.toLowerCase().includes(texto) ||
    p.codigo?.includes(texto) ||
    p.clave?.includes(texto)
  );
}

// -----------------------------------
// 🌐 BÚSQUEDA REMOTA DE EQUIVALENTES
// -----------------------------------
export async function buscarEquivalenteRemoto(texto) {
  try {
    const url = `https://us-east-1.aws.data.mongodb-api.com/...buscar=${texto}`;
    const res = await fetch(url);
    const data = await res.json();

    return data || [];
  } catch (err) {
    console.error("❌ Error buscando equivalente remoto:", err);
    return [];
  }
}

// ---------------------------------------------
// ⚖️ DETECCIÓN DE CÓDIGOS DE BALANZA
// EJ: 20 + código + peso
// ---------------------------------------------
function esBalanza(codigo) {
  return (
    codigo.length >= 13 &&
    codigo.startsWith("20")
  );
}

function parsearBalanza(codigo) {
  const clave = codigo.substring(2, 7);     // código real
  const pesoEnGr = Number(codigo.substring(7, 12)); // gramos
  const pesoKg = pesoEnGr / 1000;

  return { clave, pesoKg };
}

// ----------------------------------
// 🎯 SELECCIONAR PRODUCTO ENCONTRADO
// ----------------------------------
function seleccionarProducto(prod, cantidad = 1) {
  if (!prod) return;

  addProduct(prod, cantidad);
  ocultarResultados();
}

// ----------------------------------
// 🟦 OCULTAR RESULTADOS
// ----------------------------------
function ocultarResultados() {
  resultadosDiv.innerHTML = "";
  resultadosDiv.style.display = "none";
}

// ----------------------------------
// 🟧 MOSTRAR LISTA DE RESULTADOS
// ----------------------------------
function mostrarLista(resultados, texto) {
  resultadosDiv.innerHTML = "";
  resultadosDiv.style.display = "block";

  resultados.forEach(p => {
    const item = document.createElement("div");
    item.className = "result-item";

    const regex = new RegExp(texto, "ig");
    const nombreResaltado = p.nombre.replace(
      regex,
      m => `<strong style="color:#0c6cbd">${m}</strong>`
    );

    item.innerHTML = `
      <span>${nombreResaltado}</span>
      <small>$${p.precioPublico}</small>
    `;

    item.addEventListener("click", () => {
      beep(950);
      seleccionarProducto(p);
    });

    resultadosDiv.appendChild(item);
  });
}

// --------------------------------------------
// 🔍 EJECUTAR BÚSQUEDA PRINCIPAL (INPUT)
// --------------------------------------------
export async function ejecutarBusqueda() {
  const texto = inputBuscador.value.trim();

  if (!texto) {
    ocultarResultados();
    return;
  }

  // ----------- ⚖️ BALANZA -----------
  if (esBalanza(texto)) {
    const { clave, pesoKg } = parsearBalanza(texto);

    const prod = catalogo.find(p => p.codigo === clave || p.clave === clave);

    if (!prod) {
      toast("❌ Producto de balanza no encontrado", "#dc2626");
      return;
    }

    seleccionarProducto(prod, pesoKg);
    inputBuscador.value = "";
    beep(900);
    return;
  }

  // --------- 🔍 BÚSQUEDA LOCAL --------
  let resultados = buscarLocal(texto);

  // --------- 🌐 REMOTO SI NO HAY LOCAL --------
  if (resultados.length === 0) {
    resultados = await buscarEquivalenteRemoto(texto);
  }

  // ------------- ACCIONES -------------
  if (resultados.length === 1) {
    beep(950);
    seleccionarProducto(resultados[0]);
    ocultarResultados();
  } else if (resultados.length > 1) {
    beep(700);
    mostrarLista(resultados, texto);
  } else {
    resultadosDiv.innerHTML = "<div style='padding:10px;color:#999;'>Sin coincidencias</div>";
    resultadosDiv.style.display = "block";
    beep(500);
  }
}

// ========================================
// 🧩 SCANNER POR TECLADO (CÓDIGO DE BARRAS)
// ========================================
let bufferScanner = "";
let scannerTimer = null;

document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const code = bufferScanner;
    bufferScanner = "";
    if (code.length > 3) procesarCodigoScanner(code);
    return;
  }

  if (/^[0-9]$/.test(e.key)) {
    bufferScanner += e.key;
    clearTimeout(scannerTimer);
    scannerTimer = setTimeout(() => (bufferScanner = ""), 120);
  }
});

// Proceso final del scanner
function procesarCodigoScanner(code) {
  inputBuscador.value = code;
  ejecutarBusqueda();
}

// ========================================
// 🎯 EVENTO DEL INPUT MANUAL
// ========================================
inputBuscador.addEventListener("input", () => {
  ejecutarBusqueda();
});

// =====================================
// 🧩 BOTÓN BUSCAR MANUAL
// =====================================
$("#btnBuscarManual")?.addEventListener("click", ejecutarBusqueda);

// =====================================
// 📷 BOTÓN ABRIR CÁMARA QR (módulo QR)
// =====================================
$("#btnCam")?.addEventListener("click", () => {
  import("./pos-qr.js").then(m => m.activarQR());
});
