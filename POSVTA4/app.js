// ======================================================
// PROVSOFT POS – Módulo de control offline / sincronización
// ======================================================

// === TOAST ===
function mostrarToast(mensaje, color = "rgba(0,0,0,0.8)") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: color,
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "20px",
      fontSize: "14px",
      opacity: "0",
      transition: "opacity 0.3s",
      zIndex: "5000",
    });
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.style.opacity = "1";
  setTimeout(() => (toast.style.opacity = "0"), 3500);
}

// === SESIÓN ===
window.addEventListener("DOMContentLoaded", () => {
  const usuario = JSON.parse(localStorage.getItem("usuario_ruta"));
  if (usuario) {
    console.log("🧠 Sesión restaurada:", usuario.nombre);
    mostrarToast(`Bienvenido ${usuario.nombre}`, "#0c6cbd");
  } else {
    console.warn("⚠️ No hay sesión previa guardada");
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    mostrarToast("🧠 Reanudando sesión desde caché", "#1e8e3e");
  }
});

// ======================================================
// 🔋 BASE LOCAL: IndexedDB para ventas offline
// ======================================================
let db;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("ventasPendientesDB", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("ventas"))
        db.createObjectStore("ventas", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function guardarVentaLocal(venta) {
  if (!db) db = await abrirDB();
  const tx = db.transaction("ventas", "readwrite");
  tx.objectStore("ventas").add(venta);
  mostrarToast("💾 Venta guardada localmente (sin conexión)", "rgba(255,140,0,0.9)");
}

async function obtenerVentasPendientes() {
  if (!db) db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("ventas", "readonly");
    const req = tx.objectStore("ventas").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function borrarVentaPendiente(id) {
  if (!db) db = await abrirDB();
  const tx = db.transaction("ventas", "readwrite");
  tx.objectStore("ventas").delete(id);
  return tx.complete;
}

// ======================================================
// 🔄 SINCRONIZACIÓN AUTOMÁTICA
// ======================================================
async function sincronizarVentasPendientes() {
  try {
    const pendientes = await obtenerVentasPendientes();
    if (!pendientes.length) {
      console.log("✅ No hay ventas pendientes");
      return;
    }

    for (const venta of pendientes) {
      try {
        // 🔧 Simulación de subida al servidor (reemplazar con Firestore/addDoc)
        console.log("📤 Subiendo venta:", venta);
        await new Promise((res) => setTimeout(res, 800));
        await borrarVentaPendiente(venta.id);
        console.log(`✅ Venta ${venta.id} sincronizada`);
      } catch (err) {
        console.error("❌ Error al subir venta:", err);
      }
    }

    mostrarToast("✅ Ventas pendientes sincronizadas", "#1e8e3e");
  } catch (err) {
    console.error("⚠️ Error sincronizando:", err);
    mostrarToast("❌ Error de sincronización", "rgba(255,0,0,0.8)");
  }
}

// ======================================================
// 🌐 DETECCIÓN DE CONEXIÓN
// ======================================================
window.addEventListener("online", () => {
  mostrarToast("🌐 Conexión restablecida, sincronizando ventas…", "#0c6cbd");
  sincronizarVentasPendientes();
});

window.addEventListener("offline", () => {
  mostrarToast("🚫 Sin conexión, guardando ventas localmente", "rgba(255,140,0,0.9)");
});

// ======================================================
// 💾 EJEMPLO DE GUARDADO DE VENTA
// ======================================================
// Llama a esta función cuando confirmes una venta
async function registrarVenta(folio, total, cliente) {
  const venta = {
    id: Date.now(),
    folio,
    total,
    cliente,
    fecha: new Date().toISOString(),
  };

  if (navigator.onLine) {
    try {
      console.log("📡 Enviando venta online:", venta);
      mostrarToast("✅ Venta enviada al servidor", "#1e8e3e");
    } catch (err) {
      await guardarVentaLocal(venta);
    }
  } else {
    await guardarVentaLocal(venta);
  }
}

// ======================================================
// 🔁 ESCUCHA MENSAJES DEL SERVICE WORKER
// ======================================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.action === "sincronizar") {
      console.log("📨 Recibido mensaje del SW para sincronizar");
      sincronizarVentasPendientes();
    }
  });
}
