// ======================================================
// POS-FIREBASE — PROVSOFT
// Login, catálogo, departamentos y guardar ventas
// ======================================================

// Usamos funciones del core desde window (SIN IMPORTS)
const toast = window.toast;
const beep = window.beep;
const render = window.render;
const calcularTotales = window.calcularTotales;

// Variables compartidas del core
const carrito = window.carrito;
const catalogo = window.catalogo;
const departamentos = window.departamentos;

// Offline
const reenviarVentasPendientes = window.reenviarVentasPendientes;

// Atajo para DOM
const $ = window.$;

// -------------------------------
// 🔥 CONFIGURACIÓN FIREBASE
// -------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

// Inicializar Firebase (solo una vez)
if (!firebase.apps?.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// ===============================
// 🔐 LOGIN CORRECTO
// ===============================
$("#btnLogin")?.addEventListener("click", loginUsuario);

async function loginUsuario() {
  const user = $("#loginUsuario").value.trim();
  const pass = $("#loginPassword").value.trim();

  if (!user || !pass) {
    toast("Ingresa usuario y contraseña", "#c0392b");
    return;
  }

  try {
    // Buscar por CAMPO usuario
    const q = await db.collection("usuarios_ruta")
      .where("usuario", "==", user)
      .limit(1)
      .get();

    if (q.empty) {
      toast("Usuario no encontrado", "#c0392b");
      return;
    }

    const usuarioData = q.docs[0].data();

    if (usuarioData.password !== pass) {
      toast("Contraseña incorrecta", "#c0392b");
      return;
    }

    // Guardar sesión
    localStorage.setItem("usuario_ruta", user);
    window.USUARIO_LOGUEADO = user;

    $("#loginScreen").style.display = "none";
    $("#posApp").style.display = "block";

    beep(800);
    toast("Bienvenido " + usuarioData.nombre);

    await cargarCatalogo();
    await cargarDepartamentos();

  } catch (err) {
    console.error("❌ Error login:", err);
    toast("Error iniciando sesión", "#c0392b");
  }
}


// ===============================
// 📦 CARGAR CATÁLOGO
// ===============================
async function cargarCatalogo() {
  try {
    const cache = localStorage.getItem("catalogo_cache");
    const cacheFecha = localStorage.getItem("catalogo_fecha");

    if (cache && cacheFecha && Date.now() - cacheFecha < 86400000) {
      const data = JSON.parse(cache);
      catalogo.length = 0;
      catalogo.push(...data);
      console.log("📦 Catálogo desde cache");
      return;
    }

    const snap = await db.collection("catalogo").get();
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    catalogo.length = 0;
    catalogo.push(...arr);

    localStorage.setItem("catalogo_cache", JSON.stringify(arr));
    localStorage.setItem("catalogo_fecha", Date.now());

    console.log("🔥 Catálogo Firebase");

  } catch (err) {
    console.error("❌ Error catálogo:", err);
    toast("No se pudo cargar catálogo", "#e74c3c");
  }
}

// ===============================
// 🗂️ CARGAR DEPARTAMENTOS (CON CACHE)
// ===============================
async function cargarDepartamentos() {
  try {

    // 1️⃣ Intentar leer cache local
    const cache = localStorage.getItem("departamentos_cache");
    const cacheFecha = localStorage.getItem("departamentos_fecha");

    // Cache válido por 24 horas
    if (cache && cacheFecha && Date.now() - cacheFecha < 86400000) {
      const data = JSON.parse(cache);

      // Limpia el objeto y repuebla
      Object.keys(departamentos).forEach(k => delete departamentos[k]);
      Object.assign(departamentos, data);

      console.log("📁 Departamentos desde cache");
      return;
    }

    // 2️⃣ Si no hay cache o ya expiró → FIREBASE
    const snap = await db.collection("departamentos").get();
    const data = {};

    snap.forEach(d => {
      data[d.id] = d.data();
    });

    // Llenar la variable global
    Object.keys(departamentos).forEach(k => delete departamentos[k]);
    Object.assign(departamentos, data);

    // Guardar cache
    localStorage.setItem("departamentos_cache", JSON.stringify(data));
    localStorage.setItem("departamentos_fecha", Date.now());

    console.log("🔥 Departamentos Firebase");

  } catch (e) {
    console.error("❌ Error departamentos:", e);
  }
}


// ===============================
// 🧾 GUARDAR VENTA
// ===============================
async function guardarVenta(tipoPago = "EFECTIVO") {
  if (carrito.length === 0) {
    toast("Carrito vacío", "#c0392b");
    return;
  }

  const tot = calcularTotales();

  const venta = {
    fecha: new Date(),
    usuario: window.USUARIO_LOGUEADO,
    cliente: $("#cliente").value || "PUBLICO GENERAL",
    tipoPago,
    subtotal: tot.subtotal,
    total: tot.total,
    items: carrito.map(p => ({
      id: p.id,
      nombre: p.nombre,
      cantidad: p.cantidad,
      precio: p.precioUnit,
      importe: p.importe
    }))
  };

  try {
    await db.collection("ventas").add(venta);

    beep(900);
    toast("Venta registrada", "#16a34a");

    carrito.length = 0;
    render();

    reenviarVentasPendientes();

    return venta;

  } catch (err) {
    console.error("❌ Error guardando venta:", err);

    let pendientes = JSON.parse(localStorage.getItem("ventas_pendientes") || "[]");
    pendientes.push(venta);
    localStorage.setItem("ventas_pendientes", JSON.stringify(pendientes));

    toast("Venta guardada offline", "#f39c12");
    return venta;
  }
}

window.guardarVenta = guardarVenta;







