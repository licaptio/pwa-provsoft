// ======================================================
// POS-BUSQUEDA — PROVSOFT
// Búsqueda local + Firestore + balanza
// ======================================================

// ------------------------------------
// Acceso rápido al DOM
// ------------------------------------
const $ = s => document.querySelector(s);
const inputBuscador = $("#buscador");
const resultadosDiv = $("#resultados");

import { db } from "./pos-firebase.js";

// ------------------------------------
// 🟦 Cache Firestore
// ------------------------------------
let cacheProductos = new Map();

// ======================================================
// 🔍 BÚSQUEDA LOCAL
// ======================================================
window.buscarLocal = function (texto) {
  if (!texto) return [];

  texto = texto.toLowerCase();

  return window.catalogo.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
    (p.codigo && p.codigo.includes(texto)) ||
    (p.clave && p.clave.includes(texto))
  );
};

// ======================================================
// 🔥 BUSCAR PRODUCTO EN FIRESTORE POR CÓDIGO DE BARRAS
// ======================================================
async function buscarProductoFirestore(codigo) {
  if (!codigo || codigo.length < 3) return null;

  // 1. Revisar cache
  if (cacheProductos.has(codigo)) {
    console.log("🔵 Producto desde cache Firestore");
    return cacheProductos.get(codigo);
  }

  try {
    const ref = db.collection("productos")
      .where("codigoBarra", "==", codigo);

    const snap = await ref.get();

    if (snap.empty) {
      return null;
    }

    let doc = snap.docs[0];
    let data = doc.data();

    // Guardar en cache
    cacheProductos.set(codigo, data);

    console.log("🟢 Producto Firestore:", data);
    return data;

  } catch (err) {
    console.error("🔥 Error Firestore:", err);
    return null;
  }
}

// ======================================================
// ⚖️ CÓDIGOS DE BALANZA
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
// ✔ SELECCIONAR PRODUCTO
// ======================================================
function seleccionarProducto(prod, cantidad = 1) {
  if (!prod) return;
  window.addProduct(prod, cantidad);
  ocultarResultados();
}

// ======================================================
// ✔ OCULTAR RESULTADOS
// ======================================================
function ocultarResultados() {
  resultadosDiv.innerHTML = "";
  resultadosDiv.style.display = "none";
}

// ======================================================
// ✔ MOSTRAR LISTA
// ======================================================
function mostrarLista(list, texto) {
  resultadosDiv.innerHTML = "";
  resultadosDiv.style.display = "block";

  const regex = new RegExp(texto, "ig");

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "result-item";

    div.innerHTML = `
      <span>${p.concepto?.replace(regex, m => `<b style='color:#0c6cbd'>${m}</b>`) || p.nombre}</span>
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
// 🔎 EJECUTAR BÚSQUEDA PRINCIPAL
// ======================================================
window.ejecutarBusqueda = async function () {
  const texto = inputBuscador.value.trim();

  if (!texto) {
    ocultarResultados();
    return;
  }

  // -----------------------------
  // 1) CÓDIGO DE BALANZA
  // -----------------------------
  if (esBalanza(texto)) {
    const { clave, pesoKg } = parsearBalanza(texto);
    const prod = window.catalogo.find(p =>
      p.codigo === clave || p.clave === clave
    );

    if (!prod) {
      window.toast("Producto de balanza no existe", "#dc2626");
      return;
    }

    seleccionarProducto(prod, pesoKg);
    inputBuscador.value = "";
    window.beep(900);
    return;
  }

  // -----------------------------
  // 2) BÚSQUEDA LOCAL
  // -----------------------------
  let resultados = window.buscarLocal(texto);

  // -----------------------------
  // 3) FIRESTORE si no está local
  // -----------------------------
  if (resultados.length === 0) {
    const prodFS = await buscarProductoFirestore(texto);
    if (prodFS) resultados = [prodFS];
  }

  // -----------------------------
  // 4) RESULTADOS
  // -----------------------------
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
// 🔠 ESCÁNER POR TECLADO (LECTOR DE BARRAS)
// ======================================================
let bufferScanner = "";
let scannerTimer = null;

document.addEventListener("keydown", e => {
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
// 🔍 EVENTO DE INPUT
// ======================================================
inputBuscador?.addEventListener("input", () => {
  window.ejecutarBusqueda();
});

// ======================================================
// 🔍 BOTÓN MANUAL
// ======================================================
$("#btnBuscarManual")?.addEventListener("click", () => {
  window.ejecutarBusqueda();
});

// ======================================================
// 📷 QR
// ======================================================
$("#btnCam")?.addEventListener("click", () => {
  import("./pos-qr.js").then(m => m.activarQR());
});
