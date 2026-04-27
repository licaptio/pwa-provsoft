import { db } from "./config.js";

import {
  collection,
  addDoc,
  setDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  money,
  toast,
  beep,
  guardarCarritoLocal,
  cargarCarritoLocal,
  limpiarCarritoLocal,
  guardarCatalogoLocal,
  cargarCatalogoLocal,
  guardarVentaPendiente,
  cargarVentasPendientes,
  guardarVentasPendientes,
  contarVentasPendientes,
  abrirOpciones,
  cerrarOpciones,
  cerrarSesionLocal,
  imprimirTestPrinter,
  enviarAImpresora,
  reenviarUltimoTicket,
  bloquearDuplicadoFactory
} from "./pos-utils.js";

/* ===========================================================
   VARIABLES
=========================================================== */

const $ = s => document.querySelector(s);

let carrito = [];
let catalogo = [];
let rutaId = null;
let USUARIO_LOGUEADO = null;

let descuentoAutorizado = 0;
let ventaEnProceso = false;
let deferredInstallPrompt = null;

const TIENDA_ID = "RUTA1";
const COLECCION_VENTAS = "VENTAS";

const codeIndex = new Map();
const catalogoById = new Map();

const bloquearDuplicado = bloquearDuplicadoFactory(300);

/* ===========================================================
   PRODUCTOS MAYOREO
=========================================================== */

const productosMayoreo = [
  "08339412","08346917","75001315","75001322","75001476","75016777",
  "75021597","75031053","75035259","75046521","75046781","75052836",
  "75056308","75059514","75063801","75064648","75066345","75068738",
  "75068745","75068776","75068783","75068844","75069902","75071295",
  "75071776","75080495","7501020540666"
];

function permiteDescuentoPorCodigo(prod) {
  const codigo = String(prod.codigo || prod.codigoBarra || "").trim();
  if (productosMayoreo.includes(codigo)) return false;
  return prod.permite_descuento !== false;
}

function obtenerPrecioSegunCantidad(prod, cantidad) {
  const codigo = String(prod.codigo || "").trim();

  if (!productosMayoreo.includes(codigo)) {
    return Number(prod.precioPublico || 0);
  }

  if (cantidad >= 5 && prod.mayoreo) {
    return Number(prod.mayoreo);
  }

  return Number(prod.precioPublico || 0);
}

/* ===========================================================
   LOGIN
=========================================================== */

async function loginUsuario() {
  const u = $("#loginUsuario").value.trim();
  const p = $("#loginPassword").value.trim();
  const msg = $("#loginMsg");

  if (!u || !p) {
    msg.textContent = "Introduce usuario y contraseña.";
    return;
  }

  msg.textContent = "Verificando usuario...";

  try {
    const q = query(
      collection(db, "usuarios_ruta"),
      where("usuario", "==", u),
      where("password", "==", p),
      where("activo", "==", true)
    );

    const snap = await getDocs(q);

if (snap.empty) {
  msg.textContent = "Usuario o contraseña incorrectos.";
  toast("❌ Acceso incorrecto", "#dc2626");
  return;
}

const data = snap.docs[0].data();

const usuariosPermitidos = ["JUAN", "LIZANDRO", "GERARDO"];
const usuarioNormalizado = String(data.usuario || "").trim().toUpperCase();

if (!usuariosPermitidos.includes(usuarioNormalizado)) {
  msg.textContent = "Usuario no autorizado para esta aplicación.";
  toast("⛔ Usuario no autorizado", "#dc2626");
  return;
}

USUARIO_LOGUEADO = {
  id: snap.docs[0].id,
  ...data
};

    rutaId = data.rutaId || null;

    localStorage.setItem("usuario_ruta", JSON.stringify(USUARIO_LOGUEADO));

    activarApp();
    await cargarCatalogo();

    carrito = cargarCarritoLocal();
    render();

    toast("✅ Sesión iniciada", "#1e8e3e");

  } catch (e) {
    console.error(e);
    msg.textContent = "Error de conexión.";
    toast("⚠️ Error de conexión", "#d97706");
  }
}

function activarApp() {
  $("#loginScreen").style.display = "none";
  $("#posApp").style.display = "flex";
$("#btnOpcionesInline").style.display = "block";

  document.body.classList.add("sesion-activa");

  $("#usuarioBar").textContent =
    `Usuario: ${USUARIO_LOGUEADO?.nombre || USUARIO_LOGUEADO?.usuario || "—"}`;

  setTimeout(() => $("#buscador")?.focus(), 300);
}

async function recuperarSesion() {
  const guardado = localStorage.getItem("usuario_ruta");
  if (!guardado) return;

  try {
    USUARIO_LOGUEADO = JSON.parse(guardado);
    rutaId = USUARIO_LOGUEADO?.rutaId || null;

    activarApp();
    await cargarCatalogo();

    carrito = cargarCarritoLocal();
    render();

    if (carrito.length > 0) {
      toast("🛒 Venta recuperada", "#0c6cbd", 2200);
    }

  } catch {
    localStorage.removeItem("usuario_ruta");
  }
}

/* ===========================================================
   CATÁLOGO
=========================================================== */

async function cargarCatalogo() {
  const local = cargarCatalogoLocal();

  if (local && local.length > 0) {
    catalogo = local;
    reconstruirIndices();
    toast(`✅ Catálogo local listo: ${catalogo.length}`, "#1e8e3e", 1500);

    if (!catalogoDebeActualizarse()) {
      return;
    }
  }

  if (!navigator.onLine) {
    if (catalogo.length > 0) {
      toast(`📦 Sin internet: usando catálogo local`, "#d97706", 2200);
    } else {
      toast("❌ Sin catálogo offline disponible", "#dc2626", 3000);
    }
    return;
  }

  toast("🔄 Actualizando catálogo...", "#0c6cbd", 1200);

  try {
    const snap = await getDocs(
      query(collection(db, "productos"), where("activo", "==", true))
    );

    catalogo = snap.docs.map(d => {
      const x = d.data();

      return {
        id: d.id,
        nombre: x.nombre || x.concepto || "SIN NOMBRE",
        codigo: String(x.codigo || x.codigoBarra || "").trim(),
        precioPublico: Number(x.precioPublico || 0),
        mayoreo: Number(x.mayoreo || 0),
        medioMayoreo: Number(x.medioMayoreo || 0),
        ivaTasa: Number(x.ivaTasa || 0),
        iepsTasa: Number(x.iepsTasa || 0),
        equivalentes: Array.isArray(x.equivalentes) ? x.equivalentes : [],
        claveSat: x.claveSat || null,
        unidadMedidaSat: x.unidadSat || x.unidadMedidaSat || null,
        departamento_id: x.departamento_id || null,
        departamento: x.departamento || null,
        costoUnit: Number(x.costoUnit || x.costoSinImpuesto || 0),
        permite_descuento: x.permite_descuento !== false,
        comision_tipo: x.comision_tipo || null,
        comision_valor: Number(x.comision_valor || 0)
      };
    });

    guardarCatalogoLocal(catalogo);
    localStorage.setItem("catalogo_ruta1_actualizado_en", Date.now().toString());

    reconstruirIndices();

    toast(`✅ Catálogo online actualizado: ${catalogo.length}`, "#1e8e3e", 1800);

  } catch (e) {
    console.warn("No se pudo cargar catálogo online:", e);

    if (catalogo.length > 0) {
      toast(`⚡ Usando catálogo local: ${catalogo.length}`, "#d97706", 2600);
    } else {
      toast("❌ Sin catálogo disponible", "#dc2626", 3000);
    }
  }
}

function catalogoDebeActualizarse() {
  const ultima = Number(localStorage.getItem("catalogo_ruta1_actualizado_en") || 0);

  if (!ultima) return true;

  const horas = (Date.now() - ultima) / 1000 / 60 / 60;

  return horas >= 12;
}


function reconstruirIndices() {
  codeIndex.clear();
  catalogoById.clear();

  catalogo.forEach(p => {
    catalogoById.set(p.id, p);

    if (p.codigo) {
      codeIndex.set(String(p.codigo).trim(), p.id);
    }

    if (Array.isArray(p.equivalentes)) {
      p.equivalentes.forEach(eq => {
        if (eq) codeIndex.set(String(eq).trim(), p.id);
      });
    }
  });
}

function resolverProductoPorCodigo(codigo) {
  const key = String(codigo || "").trim();
  const id = codeIndex.get(key);
  if (!id) return null;
  return catalogoById.get(id) || null;
}

/* ===========================================================
   BALANZA
=========================================================== */

function decodificarBalanza(codigo) {
  const c = String(codigo || "").trim();

  if (!c.startsWith("2")) return { esBalanza:false };
  if (c.length < 13 || c.length > 15) return { esBalanza:false };

  const codigoProducto = c.substring(0, 7);
  const pesoBruto = c.substring(7, 12);
  const pesoKg = parseFloat(pesoBruto) / 1000;

  return {
    esBalanza:true,
    codigoProducto,
    pesoKg
  };
}

/* ===========================================================
   BÚSQUEDA / ESCANEO DIRECTO
=========================================================== */

function buscarLocal(texto) {
  const q = String(texto || "").trim().toLowerCase();
  if (!q) return [];

  const exacto = resolverProductoPorCodigo(q);
  if (exacto) return [exacto];

  return catalogo
    .filter(p => String(p.nombre || "").toLowerCase().includes(q))
    .slice(0, 40);
}

async function ejecutarBusqueda(texto) {
  const codigo = String(texto || "").trim();
  if (!codigo) return;

  if (bloquearDuplicado(codigo)) return;

  // 1. Exacto directo: velocidad máxima
  const directo = resolverProductoPorCodigo(codigo);
  if (directo) {
    addProduct(directo, 1);
    beep(950);
    resetScanner();
    return;
  }

  // 2. Balanza
  const balanza = decodificarBalanza(codigo);
  if (balanza.esBalanza) {
    const prod = resolverProductoPorCodigo(balanza.codigoProducto);

    if (!prod) {
      toast("❌ Producto de balanza no registrado", "#dc2626");
      beep(400);
      resetScanner();
      return;
    }

    addProduct(prod, Number(balanza.pesoKg.toFixed(3)));
    toast(`⚖️ ${prod.nombre} ${balanza.pesoKg.toFixed(3)} kg`, "#1e8e3e");
    beep(950);
    resetScanner();
    return;
  }

  // 3. Búsqueda por texto
  const resultados = buscarLocal(codigo);

  if (resultados.length === 0) {
    toast("❌ Código no encontrado", "#dc2626");
    beep(350);
    resetScanner();
    return;
  }

  if (resultados.length === 1) {
    addProduct(resultados[0], 1);
    beep(950);
    resetScanner();
    return;
  }

  mostrarResultados(resultados, codigo);
}

function mostrarResultados(resultados, texto) {
  const div = $("#resultados");
  div.innerHTML = "";

  resultados.forEach(p => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `
      <span>${p.nombre}</span>
      <small>${money(p.precioPublico)}</small>
    `;

    item.addEventListener("click", () => {
      addProduct(p, 1);
      div.style.display = "none";
      resetScanner();
    });

    div.appendChild(item);
  });

  div.style.display = "block";
}

function resetScanner() {
  const b = $("#buscador");
  if (!b) return;

  b.value = "";
  setTimeout(() => b.focus(), 40);
}

/* ===========================================================
   CARRITO
=========================================================== */

function addProduct(prod, cant = 1) {
  if (!prod || ventaEnProceso) return;

  const productoBase = catalogoById.get(prod.id) || prod;
  const esBalanza = Number(cant) % 1 !== 0;

  const existente = !esBalanza
    ? carrito.find(x => x.id === productoBase.id)
    : null;

  if (existente) {
    existente.cantidad += cant;
    existente.precioUnit = obtenerPrecioSegunCantidad(productoBase, existente.cantidad);
    existente.importe = existente.cantidad * existente.precioUnit;
  } else {
    const precio = obtenerPrecioSegunCantidad(productoBase, cant);

    carrito.push({
      ...productoBase,
      codigo: productoBase.codigo || "",
      cantidad: cant,
      precioUnit: precio,
      importe: cant * precio,
      ivaTasa: productoBase.ivaTasa ?? 0,
      iepsTasa: productoBase.iepsTasa ?? 0,
      costoUnit: Number(productoBase.costoUnit || 0),
      permite_descuento: permiteDescuentoPorCodigo(productoBase)
    });
  }

  guardarCarritoLocal(carrito);
  render();

  toast(`✅ ${cant} × ${productoBase.nombre}`, "#1e8e3e");
}

function delItem(id) {
  carrito = carrito.filter(x => x.id !== id);
  guardarCarritoLocal(carrito);
  render();
}

function actualizarCantidad(id, valor) {
  const item = carrito.find(x => x.id === id);
  if (!item) return;

  const cant = parseFloat(valor);
  if (isNaN(cant) || cant <= 0) return;

  item.cantidad = cant;
  item.precioUnit = obtenerPrecioSegunCantidad(item, cant);
  item.importe = cant * item.precioUnit;

  guardarCarritoLocal(carrito);
  render();
}

window.delItem = delItem;
window.actualizarCantidad = actualizarCantidad;

/* ===========================================================
   TOTALES
=========================================================== */

function calcularTotales(descPorc = 0) {
  let subtotal = 0;
  let iva = 0;
  let ieps = 0;
  let subtotalElegible = 0;

  const descuento = Math.min(100, Math.max(0, descPorc || 0)) / 100;

  carrito.forEach(it => {
    const imp = Number(it.cantidad || 0) * Number(it.precioUnit || 0);

    const ivaT = Number(it.ivaTasa || 0);
    const iepsT = Number(it.iepsTasa || 0);

    let base = imp;

    if (iepsT > 0 && ivaT > 0) {
      base = imp / (1 + iepsT + ivaT * (1 + iepsT));
    } else if (iepsT > 0) {
      base = imp / (1 + iepsT);
    } else if (ivaT > 0) {
      base = imp / (1 + ivaT);
    }

    const ivaCalc = +(base * ivaT).toFixed(2);
    const iepsCalc = +(base * iepsT).toFixed(2);

    it.iva_calculado = ivaCalc;
    it.ieps_calculado = iepsCalc;

    subtotal += base;
    iva += ivaCalc;
    ieps += iepsCalc;

    if (it.permite_descuento) {
      subtotalElegible += base;
    }
  });

  const montoDesc = subtotalElegible * descuento;
  const factorDesc = subtotal > 0 ? (subtotal - montoDesc) / subtotal : 1;

  const subtotalFinal = subtotal - montoDesc;
  const ivaFinal = iva * factorDesc;
  const iepsFinal = ieps * factorDesc;
  const totalFinal = subtotalFinal + ivaFinal + iepsFinal;

  return {
    subtotal:+subtotal.toFixed(2),
    descuento:+montoDesc.toFixed(2),
    impuestos:+(ivaFinal + iepsFinal).toFixed(2),
    total:+totalFinal.toFixed(2),
    factorDesc
  };
}

function render() {
  const tbody = $("#tbody");
  tbody.innerHTML = "";

  const tot = calcularTotales(descuentoAutorizado);

  carrito.forEach(it => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${acortarNombre(it.nombre)}</td>
      <td style="text-align:center">
        <input
          type="number"
          min="0"
          step="0.01"
          value="${it.cantidad}"
          style="width:68px;text-align:center"
          onchange="actualizarCantidad('${it.id}', this.value)"
        >
      </td>
      <td style="text-align:right">${money(it.cantidad * it.precioUnit)}</td>
      <td class="del-col">
        <button class="del" onclick="delItem('${it.id}')">×</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  $("#lblSubtotal").textContent = money(tot.subtotal);
  $("#lblImpuestos").textContent = money(tot.impuestos);
  $("#lblTotal").textContent = money(tot.total);

  if ($("#modalCobro").style.display === "flex") {
    actualizarCobroVisual();
  }
}

function acortarNombre(nombre) {
  nombre = String(nombre || "");
  return nombre.length > 18 ? nombre.substring(0, 18) + "…" : nombre;
}

/* ===========================================================
   COBRO
=========================================================== */

function abrirCobro() {
  if (carrito.length === 0) {
    toast("Agrega productos antes de cobrar", "#dc2626");
    return;
  }

  descuentoAutorizado = Number(localStorage.getItem("desc_porcentaje") || 0);

  const tot = calcularTotales(descuentoAutorizado);

  $("#cobroTotal").textContent = money(tot.total);
  $("#montoRecibido").value = "";
  $("#montoCambio").textContent = "$0.00";

  $("#modalCobro").style.display = "flex";

  setTimeout(() => $("#montoRecibido").focus(), 200);
}

function cerrarCobro() {
  $("#modalCobro").style.display = "none";
}

function actualizarCobroVisual() {
  const tot = calcularTotales(descuentoAutorizado);
  const recibido = parseFloat($("#montoRecibido").value) || 0;

  $("#cobroTotal").textContent = money(tot.total);
  $("#montoCambio").textContent = money(Math.max(0, recibido - tot.total));

  if (tot.descuento > 0) {
    $("#descuentoInfo").style.display = "block";
    $("#descuentoInfo").textContent = `Descuento aplicado: ${money(tot.descuento)}`;
  } else {
    $("#descuentoInfo").style.display = "none";
  }
}

async function confirmarCobro() {
  if (ventaEnProceso) return;

  const tot = calcularTotales(descuentoAutorizado);
  const pago = parseFloat($("#montoRecibido").value) || 0;

  if (pago < tot.total) {
    toast("⚠️ Monto recibido insuficiente", "#dc2626");
    return;
  }

  ventaEnProceso = true;

  const venta = await construirVenta(tot, pago);

  imprimirTicketVenta(venta);

  carrito = [];
  limpiarCarritoLocal();
  render();
  cerrarCobro();

  toast("🧾 Ticket generado", "#1e8e3e");

  guardarVentaEnSegundoPlano(venta);

  ventaEnProceso = false;
}

async function construirVenta(tot, pago) {
  const hoy = new Date();
  const fechaTag = hoy.toISOString().slice(0,10).replace(/-/g,"");

  const usuarioTag = (USUARIO_LOGUEADO.usuario || "USR")
    .toUpperCase()
    .replace(/\s+/g,"")
    .slice(0,8);

  const folioId = `${usuarioTag}_${fechaTag}`;
  const folioRef = doc(db, "contadores", folioId);

  const snap = await getDoc(folioRef);

  let consecutivo = 1;

  if (snap.exists()) {
    consecutivo = (snap.data().ultimo || 0) + 1;
  }

  const folio = `${usuarioTag}-${fechaTag}-${String(consecutivo).padStart(4,"0")}`;

  await setDoc(folioRef, {
    ultimo: consecutivo,
    fecha: fechaTag,
    usuario: usuarioTag,
    actualizado_en: serverTimestamp()
  }, { merge:true });

  const cambio = +(pago - tot.total).toFixed(2);

  return {
    folio,
    rutaId,
    cliente:"PÚBLICO EN GENERAL",
    moneda:"MXN",
    tipoCambio:1,
    cortado:false,
    descuento_porcentaje:descuentoAutorizado,
    descuento_monto:tot.descuento,
    fecha:serverTimestamp(),
    fecha_txt:hoy.toLocaleString("es-MX", { hour12:true }),
    usuarioId:USUARIO_LOGUEADO.id,
    usuarioNombre:USUARIO_LOGUEADO.nombre || USUARIO_LOGUEADO.usuario,
    recibido:pago,
    cambio:cambio > 0 ? cambio : 0,
    resumen_financiero:{
      subtotal:tot.subtotal,
      descuento:tot.descuento,
      impuestos:tot.impuestos,
      total:tot.total,
      costo_total:+carrito.reduce((s,x)=>s + (x.costoUnit || 0) * x.cantidad,0).toFixed(2)
    },
    detalle:carrito.map(it => ({
      id:it.id,
      nombre:it.nombre,
      codigo:it.codigo,
      cantidad:it.cantidad,
      precio_unit:it.precioUnit,
      importe:+(it.cantidad * it.precioUnit).toFixed(2),
      ivaTasa:it.ivaTasa || 0,
      iepsTasa:it.iepsTasa || 0,
      iva_calculado:it.iva_calculado || 0,
      ieps_calculado:it.ieps_calculado || 0,
      costo_unit:it.costoUnit || 0,
      departamento_id:it.departamento_id || null,
      departamento:it.departamento || null
    }))
  };
}

async function guardarVentaEnSegundoPlano(venta) {
  try {
    await addDoc(
      collection(db, "TIENDAS", TIENDA_ID, COLECCION_VENTAS),
      venta
    );

    toast("💾 Venta guardada", "#0c6cbd", 1200);

  } catch (e) {
    console.error("Error guardando venta:", e);

    guardarVentaPendiente(venta);

    toast("⚠️ Venta guardada en cola offline", "#d97706", 3000);
  }
}

/* ===========================================================
   TICKET
=========================================================== */

function imprimirTicketVenta(v) {
  const lineas = v.detalle.map(it => {
    const nombre = String(it.nombre || "").substring(0, 22);
    const cant = Number(it.cantidad || 0);
    const imp = money(it.importe || 0);

    return `${cant} ${nombre}\n${" ".repeat(Math.max(0, 30 - imp.length))}${imp}`;
  }).join("\n");

  const texto = `
PROVEEDORA DE DULCES Y DESECHABLES
PUNTO VENTA 2026

Folio: ${v.folio}
Fecha: ${v.fecha_txt}
Vendedor: ${v.usuarioNombre}

------------------------------
${lineas}
------------------------------
Subtotal: ${money(v.resumen_financiero.subtotal)}
Impuestos: ${money(v.resumen_financiero.impuestos)}
TOTAL: ${money(v.resumen_financiero.total)}

Recibido: ${money(v.recibido)}
Cambio: ${money(v.cambio)}

GRACIAS POR SU COMPRA

------------------------------
`;

  enviarAImpresora(texto);
}

function esCelular() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function appYaInstalada() {
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone === true;
}

function configurarInstalacionPWA() {
  const btn = document.getElementById("btnInstalarApp");
  if (!btn) return;

  if (!esCelular() || appYaInstalada()) {
    btn.style.display = "none";
    return;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    btn.style.display = "block";
  });

  btn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      toast("Instalación no disponible en este navegador", "#d97706");
      return;
    }

    deferredInstallPrompt.prompt();

    const result = await deferredInstallPrompt.userChoice;

    if (result.outcome === "accepted") {
      toast("📲 App instalada", "#1e8e3e");
      btn.style.display = "none";
    }

    deferredInstallPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    btn.style.display = "none";
    deferredInstallPrompt = null;
    toast("📲 App instalada correctamente", "#1e8e3e");
  });
}
function bloquearPullToRefresh() {
  let startY = 0;

  document.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
  }, { passive:true });

  document.addEventListener("touchmove", (e) => {
    const y = e.touches[0].clientY;
    const scrollTop = document.scrollingElement?.scrollTop || document.documentElement.scrollTop;

    if (scrollTop <= 0 && y > startY) {
      e.preventDefault();
    }
  }, { passive:false });
}
let sincronizandoPendientes = false;

async function sincronizarVentasPendientes() {
  if (sincronizandoPendientes) return;
  if (!navigator.onLine) return;

  const pendientes = cargarVentasPendientes();

  if (pendientes.length === 0) return;

  sincronizandoPendientes = true;

  const restantes = [];

  toast(`🔄 Sincronizando ${pendientes.length} venta(s)...`, "#0c6cbd", 1800);

  for (const item of pendientes) {
    try {
      await addDoc(
        collection(db, "TIENDAS", TIENDA_ID, COLECCION_VENTAS),
        {
          ...item.venta,
          sincronizada_desde_cola: true,
          id_local: item.id_local,
          sincronizada_en: new Date().toISOString()
        }
      );
} catch (e) {
  item.intentos = Number(item.intentos || 0) + 1;
  item.ultimo_error = String(e?.message || e || "Error desconocido");

  if (item.intentos < 5) {
    restantes.push(item);
  } else {
    console.error("Venta descartada tras 5 intentos:", item);
  }
}

  }

  guardarVentasPendientes(restantes);

  if (restantes.length === 0) {
    toast("✅ Ventas pendientes sincronizadas", "#1e8e3e", 2200);
  } else {
    toast(`⚠️ Quedan ${restantes.length} venta(s) pendientes`, "#d97706", 3000);
  }

  sincronizandoPendientes = false;
}

/* ===========================================================
   EVENTOS
=========================================================== */

$("#btnLogin")?.addEventListener("click", loginUsuario);
$("#btnCobrar")?.addEventListener("click", abrirCobro);
$("#btnCancelarCobro")?.addEventListener("click", cerrarCobro);
$("#btnConfirmarCobro")?.addEventListener("click", confirmarCobro);

$("#montoRecibido")?.addEventListener("input", actualizarCobroVisual);

$("#btnSolicitarDescuento")?.addEventListener("click", () => {
  const porc = parseFloat(prompt("Introduce descuento (%)"));

  if (isNaN(porc) || porc <= 0 || porc > 100) {
    toast("Descuento inválido", "#dc2626");
    return;
  }

  const pass = prompt("Contraseña de autorización");

  if (pass !== "MADERO690*") {
    toast("Contraseña incorrecta", "#dc2626");
    return;
  }

  descuentoAutorizado = porc;
  localStorage.setItem("desc_porcentaje", porc);
  actualizarCobroVisual();
  render();

  toast(`Descuento ${porc}% aplicado`, "#0c6cbd");
});

$("#btnOpcionesInline")?.addEventListener("click", abrirOpciones);
$("#btnCerrarOpciones")?.addEventListener("click", cerrarOpciones);
$("#btnLogout")?.addEventListener("click", cerrarSesionLocal);

$("#btnTestPrinter")?.addEventListener("click", () => {
  cerrarOpciones();
  imprimirTestPrinter();
});

$("#btnReimprimirTicket")?.addEventListener("click", () => {
  cerrarOpciones();
  reenviarUltimoTicket();
});

$("#btnCorteRuta")?.addEventListener("click", () => {
  toast("Corte pendiente de conectar", "#0c6cbd");
});

$("#btnResumen")?.addEventListener("click", () => {
  toast("Resumen pendiente de conectar", "#0c6cbd");
});
window.addEventListener("online", () => {
  toast("🌐 Internet recuperado", "#1e8e3e");
  sincronizarVentasPendientes();
});

window.addEventListener("offline", () => {
  toast("📴 Sin internet: modo offline", "#d97706", 2600);
});
$("#buscador")?.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    ejecutarBusqueda(e.target.value);
  }
});

let scanTimer = null;

$("#buscador")?.addEventListener("input", e => {
  const valor = e.target.value.trim();
  if (!valor) return;

  clearTimeout(scanTimer);

  scanTimer = setTimeout(() => {
    ejecutarBusqueda(valor);
  }, 250);
});

$("#btnBuscarManual")?.addEventListener("click", () => {
  const texto = prompt("Buscar producto por nombre o código");
  if (texto) ejecutarBusqueda(texto);
});

$("#btnCam")?.addEventListener("click", () => {
  toast("Cámara pendiente de reconectar", "#d97706");
});

/* ===========================================================
   INICIO
=========================================================== */

configurarInstalacionPWA();
bloquearPullToRefresh();
recuperarSesion();

setTimeout(() => {
  sincronizarVentasPendientes();
}, 2500);
