// ==========================================
// POS-BÚSQUEDA — PROVSOFT
// Maneja búsqueda, equivalentes y balanza
// ==========================================

// Todo se toma de window, no imports
const $ = s => document.querySelector(s);

const inputBuscador = $("#buscador");
const resultadosDiv = $("#resultados");


// ------------------------------
// 🔎 BÚSQUEDA LOCAL
// ------------------------------
window.buscarLocal = function (texto) {
  if (!texto) return [];

  texto = texto.toLowerCase();

  return window.catalogo.filter(p =>
    p.nombre?.toLowerCase().includes(texto) ||
    p.codigo?.includes(texto) ||
    p.clave?.includes(texto)
  );
};


// -----------------------------------
// 🌐 BÚSQUEDA REMOTA DE EQUIVALENTES
// -----------------------------------
window.buscarEquivalenteRemoto = async function (texto) {
  try {
    const url = `https://us-east-1.aws.data.mongodb-api.com/...buscar=${texto}`;
    const res = await fetch(url);
    const data = await res.json();
    return data || [];
  } catch (err) {
    console.error("❌ Error buscando equivalente remoto:", err);
    return [];
  }
};


// ---------------------------------------------
// ⚖️ DETECCIÓN DE CÓDIGOS DE BALANZA
// ---------------------------------------------
function esBalanza(codigo) {
  return codigo.length >= 13 && codigo.startsWith("20");
}

function parsearBalanza(codigo) {
  const clave = codigo.substring(2, 7);
  const pesoEnGr = Number(codigo.substring(7, 12));
  return { clave, pesoKg: pesoEnGr / 1000 };
}


// ----------------------------------
// 🎯 SELECCIONAR PRODUCTO
// ----------------------------------
function seleccionarProducto(prod, cantidad = 1) {
  if (!prod) return;

  window.addProduct(prod, cantidad);
  ocultarResultados();
}


// ------------------------------
// 🟦 OCULTAR RESULTADOS
// ------------------------------
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
      window.beep(950);
      seleccionarProducto(p);
    });

    resultadosDiv.appendChild(item);
  });
}


// --------------------------------------------
// 🔍 BÚSQUEDA PRINCIPAL
// --------------------------------------------
window.ejecutarBusqueda = async function () {
  const texto = inputBuscador.value.trim();

  if (!texto) {
    ocultarResultados();
    return;
  }

  // -------- ⚖️ CÓDIGO DE BALANZA --------
  if (esBalanza(texto)) {
    const { clave, pesoKg } = parsearBalanza(texto);

    const prod = window.catalogo.find(p =>
      p.codigo === clave || p.clave === clave
    );

    if (!prod) {
      window.toast("❌ Producto de balanza no encontrado", "#dc2626");
      return;
    }

    seleccionarProducto(prod, pesoKg);
    inputBuscador.value = "";
    window.beep(900);
    return;
  }

  // -------- 🔍 LOCAL --------
  let resultados = window.buscarLocal(texto);

  // -------- 🌐 REMOTO --------
  if (resultados.length === 0) {
    resultados = await window.buscarEquivalenteRemoto(texto);
  }

  // -------- ACCIÓN FINAL --------
  if (resultados.length === 1) {
    window.beep(950);
    seleccionarProducto(resultados[0]);
  } else if (resultados.length > 1) {
    window.beep(700);
    mostrarLista(resultados, texto);
  } else {
    resultadosDiv.innerHTML = "<div style='padding:10px;color:#999;'>Sin coincidencias</div>";
    resultadosDiv.style.display = "block";
    window.beep(500);
  }
};


// ========================================
// 🧩 LECTOR DE BARRAS (TECLADO)
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


function procesarCodigoScanner(code) {
  inputBuscador.value = code;
  window.ejecutarBusqueda();
}


// ========================================
// 🎯 INPUT MANUAL
// ========================================
inputBuscador.addEventListener("input", () => {
  window.ejecutarBusqueda();
});


// =====================================
// 🧩 BOTÓN LUPA
// =====================================
$("#btnBuscarManual")?.addEventListener("click", window.ejecutarBusqueda);


// =====================================
// 📷 BOTÓN CÁMARA QR
// =====================================
$("#btnCam")?.addEventListener("click", () => {
  // carga dinámica sin imports reales
  window.activarQR && window.activarQR();
});
