// ======================================================
// POS-FIREBASE — PROVSOFT
// Login, catálogo, departamentos y guardar ventas
// ======================================================

import {
  carrito,
  catalogo,
  departamentos,
  USUARIO_LOGUEADO,
  toast,
  beep,
  render,
  calcularTotales
} from "./pos-core.js";

import { reenviarVentasPendientes } from "./pos-offline.js";

const $ = s => document.querySelector(s);

// -------------------------------
// 🔥 CONFIGURACIÓN FIREBASE
// -------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD9yXXX",
  authDomain: "provsoft.firebaseapp.com",
  projectId: "provsoft",
  storageBucket: "provsoft.appspot.com",
  messagingSenderId: "0000000",
  appId: "1:000000:web:aaaaaa"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===============================
// 🔐 LOGIN
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
    const ref = db.collection("usuarios").doc(user);
    const snap = await ref.get();

    if (!snap.exists) {
      toast("Usuario no encontrado", "#c0392b");
      return;
    }

    const data = snap.data();

    if (data.password !== pass) {
      toast("Contraseña incorrecta", "#c0392b");
      return;
    }

    // Guardamos la sesión
    localStorage.setItem("usuario_ruta", user);

    // Exponemos global
    window.USUARIO_LOGUEADO = user;

    $("#loginScreen").style.display = "none";
    $("#posApp").style.display = "block";

    beep(800);
    toast("Bienvenido " + user);

    await cargarCatalogo();
    await cargarDepartamentos();

  } catch (err) {
    console.error("❌ Error login:", err);
    toast("Error iniciando sesión", "#c0392b");
  }
}

// ===============================
// 📦 CARGAR CATÁLOGO (OPTIMIZADO)
// ===============================
export async function cargarCatalogo() {
  try {
    const cache = localStorage.getItem("catalogo_cache");
    const cacheFecha = localStorage.getItem("catalogo_fecha");

    // Si el cache tiene menos de 24 horas, usarlo
    if (cache && cacheFecha && Date.now() - cacheFecha < 86400000) {
      const data = JSON.parse(cache);
      catalogo.length = 0;
      catalogo.push(...data);
      console.log("📦 Catálogo cargado desde localStorage");
      return;
    }

    // --- Carga Firebase ---
    const snap = await db.collection("catalogo").get();
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    catalogo.length = 0;
    catalogo.push(...arr);

    localStorage.setItem("catalogo_cache", JSON.stringify(arr));
    localStorage.setItem("catalogo_fecha", Date.now());

    console.log("🔥 Catálogo cargado desde Firestore");

  } catch (err) {
    console.error("❌ Error cargando catálogo:", err);
    toast("No se pudo cargar catálogo", "#e74c3c");
  }
}

// ===============================
// 🗂️ CARGAR DEPARTAMENTOS
// ===============================
async function cargarDepartamentos() {
  try {
    const snap = await db.collection("departamentos").get();
    snap.forEach(d => {
      departamentos[d.id] = d.data();
    });

    console.log("🗂️ Departamentos cargados");
  } catch (e) {
    console.error("❌ Error cargando departamentos:", e);
  }
}

// ===============================
// 🧾 GUARDAR VENTA
// ===============================
export async function guardarVenta(tipoPago = "EFECTIVO") {
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

    // limpiar carrito
    carrito.length = 0;
    render();

    // reenviar ventas pendientes
    reenviarVentasPendientes();

    return venta;

  } catch (err) {
    console.error("❌ Error guardando venta:", err);

    // Guardar localmente para enviar después
    let pendientes = JSON.parse(localStorage.getItem("ventas_pendientes") || "[]");
    pendientes.push(venta);
    localStorage.setItem("ventas_pendientes", JSON.stringify(pendientes));

    toast("Venta guardada offline", "#f39c12");
    return venta;
  }
}

// Exponer para otros módulos
window.guardarVenta = guardarVenta;
