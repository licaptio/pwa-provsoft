// ===============================
// 🌎 Función robusta de geolocalización
// Compatible con POS industriales y móviles Android
// ===============================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null,
    lon: null,
    precision: null,
    direccion: null,
    metodo: "desconocido"
  };

  try {
    // 🔍 1️⃣ Verificar permiso actual
    if ("permissions" in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        console.log("🔒 Permiso actual GPS:", perm.state);

        if (perm.state === "denied") {
          alert("⚠️ Activa el permiso de ubicación en el navegador o ajustes del dispositivo.");
          return resultado;
        }
      } catch (e) {
        console.warn("No se pudo verificar permisos:", e.message);
      }
    }

    // 🛰️ 2️⃣ Intentar obtener coordenadas precisas (GPS)
    const pos = await new Promise((resolve, reject) => {
      if (!("geolocation" in navigator))
        return reject(new Error("Geolocalización no disponible"));

      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });

    resultado.lat = pos.coords.latitude;
    resultado.lon = pos.coords.longitude;
    resultado.precision = pos.coords.accuracy;
    resultado.metodo = "gps";

    // 🌐 3️⃣ Obtener dirección legible (nominatim)
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${resultado.lat}&lon=${resultado.lon}&format=json`
      );
      const data = await resp.json();
      resultado.direccion = data.display_name || null;
    } catch (e) {
      console.warn("No se pudo obtener dirección legible:", e.message);
    }

    console.log("✅ Ubicación obtenida por GPS:", resultado);
    mostrarToast(`GPS activo 📡 (${resultado.precision.toFixed(1)} m)`);

    return resultado;
  } catch (gpsErr) {
    console.warn("⚠️ Falló GPS, intentando IP:", gpsErr.message);

    // 🌐 4️⃣ Fallback: ubicación por IP pública
    try {
      const ipResp = await fetch("https://ipapi.co/json/");
      const data = await ipResp.json();
      resultado.lat = data.latitude;
      resultado.lon = data.longitude;
      resultado.precision = 5000; // estimada
      resultado.direccion = data.city + ", " + data.region + ", " + data.country_name;
      resultado.metodo = "ip";

      console.log("✅ Ubicación obtenida por IP:", resultado);
      mostrarToast("Ubicación por IP 🌐");

      return resultado;
    } catch (ipErr) {
      console.error("❌ No se pudo obtener ubicación por IP:", ipErr.message);
      mostrarToast("No se pudo obtener ubicación ❌");
      return resultado;
    }
  }
}

// ===============================
// 🔔 Toast para mensajes rápidos
// ===============================
function mostrarToast(mensaje) {
  const toast = document.createElement("div");
  toast.textContent = mensaje;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,128,0,0.9)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: "600",
    zIndex: "3000",
    boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
    opacity: "1",
    transition: "opacity 0.5s ease"
  });
  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "0"), 2500);
  setTimeout(() => toast.remove(), 3000);
}
