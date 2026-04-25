import fs from "fs";
import path from "path";
import { db } from "./config.js";
import {
  collection,
  getDocs,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

const RUTA = "C:/python/SucAll/SucAll";
const COLECCION = "productos";

const archivos = {
  productos: path.join(RUTA, "articulos.txt"),
  precios: path.join(RUTA, "precant.txt"),
  equivalentes: path.join(RUTA, "equiv.txt"),
};

let firebaseMap = new Map();

function leerArchivo(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`No existe: ${ruta}`);
  return fs.readFileSync(ruta, "utf8");
}

function resetArchivo(ruta) {
  fs.writeFileSync(ruta, "");
}

function tokenizarLinea(linea) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(linea)) !== null) {
    out.push(m[1] !== undefined ? m[1] : m[2]);
  }
  return out;
}

function toNumber(v) {
  if (v === undefined || v === null || v === "" || v === "?") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBoolYesNo(v) {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function normalizarCodigo(x) {
  return String(x ?? "").trim();
}

function valid(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

function equal(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 0.000001;
  }
  return String(a ?? "") === String(b ?? "");
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

function lineasValidas(texto) {
  return texto.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
}

async function descargarCatalogo() {
  firebaseMap = new Map();

  const snap = await getDocs(collection(db, COLECCION));

  snap.forEach(ds => {
    const d = { id: ds.id, ref: ds.ref, ...ds.data() };

    const docId = String(ds.id || "").trim();
    if (docId) firebaseMap.set(docId, d);

    const codigoBarra = String(d.codigoBarra || "").trim();
    if (codigoBarra) firebaseMap.set(codigoBarra, d);
  });

  return snap.size;
}

function extraerProducto(cols) {
  return {
    codigoBarra: normalizarCodigo(cols[0]),
    concepto: String(cols[1] || "").trim(),
    costoSinImpuesto: toNumber(cols[2]),
    precioPublico: toNumber(cols[8]),
    medioMayoreo: toNumber(cols[4]),
    mayoreo: toNumber(cols[26]),
    activo: toBoolYesNo(cols[20]),
    departamento_id: cols[9] != null ? String(cols[9]).trim() : "",
    claveSat: String(cols[34] || "").trim(),
    unidadMedidaSat: String(cols[35] || "").trim()
  };
}

async function actualizarPorLotes(rows) {
  let actualizados = 0;

  for (let i = 0; i < rows.length; i += 400) {
    const slice = rows.slice(i, i + 400);
    const batch = writeBatch(db);

    for (const r of slice) {
      batch.update(r.ref, {
        ...r.payload,
        actualizadoEn: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    }

    await batch.commit();
    actualizados += slice.length;
  }

  return actualizados;
}

async function procesarProductos(texto) {
  const lines = lineasValidas(texto);
  if (!lines.length) {
    return { leidos: 0, cambios: 0, actualizados: 0, detalle: "Archivo vacío" };
  }

  const fields = [
    "concepto",
    "costoSinImpuesto",
    "precioPublico",
    "medioMayoreo",
    "mayoreo",
    "claveSat",
    "unidadMedidaSat",
    "activo",
    "departamento_id"
  ];

  const map = new Map();

  for (const line of lines) {
    const cols = tokenizarLinea(line);
    if (cols.length >= 36) {
      const p = extraerProducto(cols);
      if (p.codigoBarra) map.set(p.codigoBarra, p);
    }
  }

  const updates = [];

  for (const nuevo of map.values()) {
    const actual = firebaseMap.get(nuevo.codigoBarra);
    if (!actual) continue;

    const payload = {};

    for (const f of fields) {
      const nuevoValor = nuevo[f];
      const actualValor = actual[f];

      if (!valid(nuevoValor)) continue;

      if (!equal(actualValor, nuevoValor)) {
        payload[f] = nuevoValor;
      }
    }

    if (Object.keys(payload).length > 0) {
      updates.push({
        ref: actual.ref,
        codigo: nuevo.codigoBarra,
        payload
      });
    }
  }

  const actualizados = await actualizarPorLotes(updates);

  return {
    leidos: map.size,
    cambios: updates.length,
    actualizados,
    detalle: `${map.size} productos leídos, ${updates.length} con cambios`
  };
}

function precioArrayDesdeCols(cols) {
  const codigo = normalizarCodigo(cols[0]);
  const c1 = toNumber(cols[1]);
  const t1 = toNumber(cols[5]);
  const c2 = toNumber(cols[7]);
  const t2 = toNumber(cols[8]);
  const arr = [];

  if (c1 && t1) {
    arr.push({
      cantidadMinima: c1,
      precioUnitario: redondear(t1 / c1),
      precioTotal: t1
    });
  }

  if (c2 && t2) {
    arr.push({
      cantidadMinima: c2,
      precioUnitario: redondear(t2 / c2),
      precioTotal: t2
    });
  }

  return { codigo, arr };
}

function normalizarPrecios(arr = []) {
  if (!Array.isArray(arr)) return [];

  return arr
    .map(x => ({
      cantidadMinima: Number(x.cantidadMinima),
      precioUnitario: redondear(Number(x.precioUnitario)),
      precioTotal: redondear(Number(x.precioTotal))
    }))
    .filter(x =>
      Number.isFinite(x.cantidadMinima) &&
      Number.isFinite(x.precioUnitario) &&
      Number.isFinite(x.precioTotal)
    )
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima);
}

function arraysPreciosIguales(a, b) {
  return JSON.stringify(normalizarPrecios(a)) === JSON.stringify(normalizarPrecios(b));
}

async function procesarPrecios(texto) {
  const lines = lineasValidas(texto);
  if (!lines.length) {
    return { leidos: 0, cambios: 0, actualizados: 0, detalle: "Archivo vacío" };
  }

  const preciosMap = new Map();

  for (const line of lines) {
    const cols = tokenizarLinea(line);
    if (cols.length >= 9) {
      const { codigo, arr } = precioArrayDesdeCols(cols);
      if (codigo && arr.length) {
        preciosMap.set(codigo, arr.sort((a, b) => a.cantidadMinima - b.cantidadMinima));
      }
    }
  }

  const updates = [];

  for (const [codigo, nuevoArr] of preciosMap.entries()) {
    const actual = firebaseMap.get(codigo);
    if (!actual) continue;

    const actualArr = normalizarPrecios(actual.preciosPorCantidad || []);

    if (!arraysPreciosIguales(actualArr, nuevoArr)) {
      updates.push({
        ref: actual.ref,
        codigo,
        payload: {
          preciosPorCantidad: nuevoArr
        }
      });
    }
  }

  const actualizados = await actualizarPorLotes(updates);

  return {
    leidos: preciosMap.size,
    cambios: updates.length,
    actualizados,
    detalle: `${preciosMap.size} precios leídos, ${updates.length} con cambios`
  };
}

function normalizarEquiv(arr = []) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => normalizarCodigo(x)).filter(Boolean))].sort();
}

function arraysEquivIguales(a, b) {
  return JSON.stringify(normalizarEquiv(a)) === JSON.stringify(normalizarEquiv(b));
}

async function procesarEquivalentes(texto) {
  const lines = lineasValidas(texto);
  if (!lines.length) {
    return { leidos: 0, cambios: 0, actualizados: 0, detalle: "Archivo vacío" };
  }

  const mapSets = new Map();

  for (const line of lines) {
    const cols = tokenizarLinea(line);
    if (cols.length >= 2) {
      const principal = normalizarCodigo(cols[0]);
      const equiv = normalizarCodigo(cols[1]);

      if (principal && equiv && principal !== equiv) {
        if (!mapSets.has(principal)) mapSets.set(principal, new Set());
        mapSets.get(principal).add(equiv);
      }
    }
  }

  const updates = [];

  for (const [codigo, set] of mapSets.entries()) {
    const actual = firebaseMap.get(codigo);
    if (!actual) continue;

    const actuales = normalizarEquiv(actual.codigosEquivalentes || []).filter(x => x !== codigo);
    const nuevos = normalizarEquiv([...set]).filter(x => x !== codigo);

    const mezclado = normalizarEquiv([...actuales, ...nuevos]).filter(x => x !== codigo);

    if (!arraysEquivIguales(actuales, mezclado)) {
      updates.push({
        ref: actual.ref,
        codigo,
        payload: {
          codigosEquivalentes: mezclado
        }
      });
    }
  }

  const actualizados = await actualizarPorLotes(updates);

  return {
    leidos: mapSets.size,
    cambios: updates.length,
    actualizados,
    detalle: `${mapSets.size} productos con equivalentes, ${updates.length} con cambios`
  };
}

async function procesar() {
  console.log("=== INICIANDO PROCESO ===");

  const productosTxt = leerArchivo(archivos.productos);
  const preciosTxt = leerArchivo(archivos.precios);
  const equivalentesTxt = leerArchivo(archivos.equivalentes);

  const totalCatalogo = await descargarCatalogo();

  const rProductos = await procesarProductos(productosTxt);
  const rPrecios = await procesarPrecios(preciosTxt);
  const rEquiv = await procesarEquivalentes(equivalentesTxt);

  const totalActualizados =
    rProductos.actualizados +
    rPrecios.actualizados +
    rEquiv.actualizados;

  resetArchivo(archivos.productos);
  resetArchivo(archivos.precios);
  resetArchivo(archivos.equivalentes);

  console.log("=== PROCESO COMPLETADO ===");

  return {
    ok: true,
    mensaje: "Proceso completado correctamente",
    resumen: {
      productosLeidos: rProductos.leidos,
      preciosLeidos: rPrecios.leidos,
      equivalentesLeidos: rEquiv.leidos,
      productosCambios: rProductos.cambios,
      preciosCambios: rPrecios.cambios,
      equivCambios: rEquiv.cambios,
      actualizados: totalActualizados,
      archivosReset: true
    },
    detalle: [
      {
        etapa: "Catálogo Firebase",
        estado: "OK",
        detalle: `${totalCatalogo} documentos descargados`
      },
      {
        etapa: "Productos",
        estado: "OK",
        detalle: rProductos.detalle
      },
      {
        etapa: "Precios por cantidad",
        estado: "OK",
        detalle: rPrecios.detalle
      },
      {
        etapa: "Equivalentes",
        estado: "OK",
        detalle: rEquiv.detalle
      },
      {
        etapa: "Reset",
        estado: "OK",
        detalle: "Archivos reseteados a 0 bytes"
      }
    ]
  };
}

export { procesar };