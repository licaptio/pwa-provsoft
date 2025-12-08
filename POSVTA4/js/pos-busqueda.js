// ======================================================
// POS-BUSQUEDA — PROVSOFT
// Búsqueda local, remota, balanza y scanner
// ======================================================

// ------------------------------------
// Acceso rápido al DOM
// ------------------------------------
const $ = s => document.querySelector(s);

const inputBuscador = $("#buscador");
const resultadosDiv = $("#resultados");

// ======================================================
// 🔍 BÚSQUEDA LOCAL (SUPER RÁPIDA)
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
// 🌐 BÚSQUEDA REMOTA DE EQUIVALENTES
// ======================================================
window.buscarEquivalenteRemoto = async function (texto) {
  try {
    const url = `https://us-east-1.aws.data.mongodb-api.com/...buscar=${texto}`;
    const res = await fetch(url);
    const data = await res.json();
    return data || [];
  } catch (err) {
    console.warn("Error remoto:", err);
    return [];
  }
};

// ======================================================
// ⚖️ DETECCIÓN DE CÓDIGOS DE BALANZA
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
// ✔ MOSTRAR LISTA DE RESULTADOS
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
// 🔎 BUSCAR (FUNCIÓN PRINCIPAL)
// ======================================================
window.ejecutarBusqueda = async function () {
  const texto = inputBuscador.value.trim();

  if (!texto) {
    ocultarResultados();
    return;
  }

  // ============================
  // ⚖️ 1) CÓDIGO DE BALANZA
  // ============================
  if (esBalanza(texto)) {
    const { clave, pesoKg } = parsearBalanza(texto);
    const prod = window.catalogo.find(
      p => p.codigo === clave || p.clave === clave
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

  // ============================
  // 🔍 2) BÚSQUEDA LOCAL
  // ============================
  let resultados = window.buscarLocal(texto);

  // ============================
  // 🌐 3) EQUIVALENTES REMOTOS
  // ============================
  if (resultados.length === 0) {
    resultados = await window.buscarEquivalenteRemoto(texto);
  }

  // ============================
  // 🎯 4) MANEJO RESULTADOS
  // ============================
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

  resultadosDiv.innerHTML = "<div style='padding:10px;color:#777;'>Sin coincidencias</div>";
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
// 🔍 EVENTO DE INPUT DIRECTO
// ======================================================
inputBuscador?.addEventListener("input", () => {
  window.ejecutarBusqueda();
});

// ======================================================
// 🔍 BOTÓN BUSCAR MANUAL
// ======================================================
$("#btnBuscarManual")?.addEventListener("click", () => {
  window.ejecutarBusqueda();
});

// ======================================================
// 📷 BOTÓN ABRIR QR
// ======================================================
$("#btnCam")?.addEventListener("click", () => {
  import("./pos-qr.js").then(m => m.activarQR());
});
