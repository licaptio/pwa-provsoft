// ======================================================
// POS-BUSQUEDA — PROVSOFT
// Búsqueda local + Firestore + balanza + FIXES FULL
// ======================================================

const $ = s => document.querySelector(s);
const inputBuscador = $("#buscador");
const resultadosDiv = $("#resultados");

import { db } from "./pos-firebase.js";

let cacheProductos = new Map();

// ======================================================
// NORMALIZACIÓN UNIVERSAL
// ======================================================
function normalizarProducto(prod, idForzado = null) {
  if (!prod) return null;

  return {
    id: idForzado || prod.id || prod.codigo || prod.codigoBarra || "",
    nombre: prod.nombre || prod.concepto || prod.descripcion || "SIN NOMBRE",
    precioPublico: prod.precioPublico || prod.precio || 0,
    codigo: prod.codigo || prod.codigoBarra || prod.clave || "",
    clave: prod.clave || prod.codigo || prod.codigoBarra || idForzado || null,
    mayoreo: prod.mayoreo ?? null,
    medioMayoreo: prod.medioMayoreo ?? null,
    departamento: prod.departamento || "",
    departamento_id: prod.departamento_id || "",
    marca: prod.marca || ""
  };
}

// ======================================================
// FIX — BLOQUEO TOTAL DURANTE COBRO
// ======================================================
function bloqueoCobro() {
  return window.MODO_COBRO === true;
}

function buscadorActivo() {
  if (bloqueoCobro()) return false;
  return document.activeElement === inputBuscador;
}

// ======================================================
// BÚSQUEDA LOCAL
// ======================================================
window.buscarLocal = function (texto) {
  if (!texto) return [];

  texto = texto.toLowerCase();

  return window.catalogo.filter(p => {
    if (p.codigo === texto) return true;
    if (p.clave === texto) return true;
    if (p.nombre?.toLowerCase().includes(texto)) return true;
    return false;
  });
};

// ======================================================
// FIRESTORE
// ======================================================
async function buscarProductoFirestore(codigo) {
  if (!codigo || codigo.length < 3) return null;

  if (cacheProductos.has(codigo)) {
    return cacheProductos.get(codigo);
  }

  try {
    const ref = db.collection("productos").where("codigoBarra", "==", codigo);
    const snap = await ref.get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const prod = normalizarProducto(doc.data(), doc.id);

    cacheProductos.set(codigo, prod);
    return prod;

  } catch (err) {
    console.error("🔥 Error Firestore:", err);
    return null;
  }
}

// ======================================================
// BALANZA
// ======================================================
function esBalanza(code) {
  return code.length >= 13 && code.startsWith("20");
}

function parsearBalanza(code) {
  return {
    clave: code.substring(2, 7),
    pesoKg: Number(code.substring(7, 12)) / 1000
  };
}

// ======================================================
// SELECCIONAR PRODUCTO
// ======================================================
function seleccionarProducto(prod, cantidad = 1) {
  if (!prod) return;
  const p = normalizarProducto(prod);
  window.addProduct(p, cantidad);
  ocultarResultados();
}

// ======================================================
// OCULTAR RESULTADOS
// ======================================================
function ocultarResultados() {
  resultadosDiv.innerHTML = "";
  resultadosDiv.style.display = "none";
}

// ======================================================
// MOSTRAR LISTA
// ======================================================
function mostrarLista(list, texto) {
  resultadosDiv.innerHTML = "";
  resultadosDiv.style.display = "block";

  const regex = new RegExp(texto, "ig");

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "result-item";

    div.innerHTML = `
      <span>${p.nombre.replace(regex, m => `<b style='color:#0c6cbd'>${m}</b>`)}</span>
      <small>${window.money(p.precioPublico)}</small>
    `;

    div.addEventListener("click", () => {
      window.beep(900);
      seleccionarProducto(p);
    });

    resultadosDiv.appendChild(div);
  });
}

// ======================================================
// EJECUTAR BÚSQUEDA
// ======================================================
window.ejecutarBusqueda = async function () {

  if (bloqueoCobro()) return;
  if (!buscadorActivo()) return;

  const texto = inputBuscador.value.trim();
  if (!texto) {
    ocultarResultados();
    return;
  }

  // BALANZA
  if (esBalanza(texto)) {
    const { clave, pesoKg } = parsearBalanza(texto);
    let prod = window.catalogo.find(p => p.codigo === clave || p.clave === clave);

    if (!prod) {
      window.toast("Producto de balanza no existe", "#dc2626");
      return;
    }

    seleccionarProducto(prod, pesoKg);
    inputBuscador.value = "";
    window.beep(900);
    return;
  }

  // LOCAL
  let resultados = window.buscarLocal(texto);

  // FIRESTORE
  if (resultados.length === 0) {
    const prodFS = await buscarProductoFirestore(texto);
    if (prodFS) resultados = [prodFS];
  }

  // RESULTADOS
  if (resultados.length === 1) {
    seleccionarProducto(resultados[0]);
    window.beep(900);
    return;
  }

  if (resultados.length > 1) {
    mostrarLista(resultados, texto);
    window.beep(700);
    return;
  }

  resultadosDiv.innerHTML = "<div class='result-item'>Sin coincidencias</div>";
  resultadosDiv.style.display = "block";
  window.beep(500);
};

// ======================================================
// ESCÁNER POR TECLADO
// ======================================================
let bufferScanner = "";
let scannerTimer = null;

document.addEventListener("keydown", e => {

  if (bloqueoCobro()) return;
  if (document.activeElement !== inputBuscador) return;

  if (e.key === "Enter") {
    const code = bufferScanner;
    bufferScanner = "";
    if (code.length > 3) procesarScanner(code);
    return;
  }

  if (/^[0-9]$/.test(e.key)) {
    bufferScanner += e.key;
    clearTimeout(scannerTimer);
    scannerTimer = setTimeout(() => bufferScanner = "", 120);
  }
});

function procesarScanner(code) {
  inputBuscador.value = code;
  window.ejecutarBusqueda();
}

// ======================================================
// INPUT DEBOUNCE
// ======================================================
let typingTimer = null;

inputBuscador?.addEventListener("input", () => {
  if (bloqueoCobro()) return;

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    window.ejecutarBusqueda();
  }, 200);
});

// ======================================================
// BOTÓN MANUAL
// ======================================================
$("#btnBuscarManual")?.addEventListener("click", () => {
  if (bloqueoCobro()) return;
  window.ejecutarBusqueda();
});

// ======================================================
// QR
// ======================================================
$("#btnCam")?.addEventListener("click", () => {
  if (bloqueoCobro()) return;
  import("./pos-qr.js").then(m => m.activarQR());
});
