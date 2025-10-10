// ===============================
// 🌍 GEOLOCALIZACIÓN ROBUSTA PROVSOFT v2.1
// Combina GPS, Network, IP pública, caché y reintento automático
// ===============================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null,
    lon: null,
    precision: null,
    direccion: null,
    metodo: "desconocido"
  };

  const tiempoInicio = Date.now();
  const maxIntentos = 3;
  let intento = 0;
  let ultimoError = null;

  while (intento < maxIntentos) {
    intento++;
    try {
      console.log(`🛰️ Intento ${intento} de geolocalización...`);
      const pos = await obtenerCoordenadasAltaPrecision();
      resultado.lat = pos.coords.latitude;
      resultado.lon = pos.coords.longitude;
      resultado.precision = pos.coords.accuracy;
      resultado.metodo = "gps";
      console.log(`✅ GPS exitoso en intento ${intento}`, resultado);

      // Obtener dirección legible (offline o Nominatim)
      resultado.direccion = await obtenerDireccionLegible(resultado.lat, resultado.lon);
      mostrarToast(`📡 GPS preciso (${resultado.precision.toFixed(1)}m)`);

      // Guardar en caché por 5 minutos (fallback rápido)
      localStorage.setItem("ultima_ubicacion", JSON.stringify({
        ...resultado,
        timestamp: Date.now()
      }));

      return resultado;

    } catch (err) {
      ultimoError = err;
      console.warn(`⚠️ Intento ${intento} fallido: ${err.message}`);
      await esperar(1500);
    }
  }

  // 🚨 Si falla GPS tras varios intentos, usar fallback IP o caché
  console.warn("⚠️ GPS falló, intentando fallback por IP...");
  const fallback = await obtenerUbicacionPorIP();

  if (!fallback.lat || !fallback.lon) {
    console.warn("⚠️ Fallback por IP falló, usando caché local si existe...");
    const cache = localStorage.getItem("ultima_ubicacion");
    if (cache) {
      const data = JSON.parse(cache);
      const antiguedad = (Date.now() - data.timestamp) / 1000;
      if (antiguedad < 300) {
        console.log("♻️ Usando caché de ubicación reciente (<5min)");
        mostrarToast("♻️ Usando ubicación guardada (sin señal GPS)");
        return data;
      }
    }
  }

  const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(1);
  console.warn(`❌ Falló todo el proceso de geolocalización (${tiempoTotal}s)`);
  mostrarToast("No se pudo obtener ubicación ❌");

  return fallback;
}

// === 1️⃣ GPS Alta precisión con timeout de 10s ===
async function obtenerCoordenadasAltaPrecision() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocalización no soportada"));
      return;
    }

    const timeout = setTimeout(() => reject(new Error("Timeout GPS (10s)")), 10000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve(pos);
      },
      (err) => {
        clearTimeout(timeout);
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// === 2️⃣ Fallback IP ===
async function obtenerUbicacionPorIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const ubic = {
      lat: data.latitude,
      lon: data.longitude,
      precision: 5000,
      direccion: `${data.city}, ${data.region}, ${data.country_name}`,
      metodo: "ip"
    };
    console.log("✅ Ubicación por IP:", ubic);
    mostrarToast("🌐 Ubicación aproximada (IP)");
    return ubic;
  } catch (e) {
    console.error("❌ Error en ubicación por IP:", e.message);
    return { metodo: "fallo" };
  }
}

// === 3️⃣ Obtener dirección legible desde coordenadas ===
async function obtenerDireccionLegible(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    return data.display_name || "Sin dirección";
  } catch (e) {
    console.warn("⚠️ No se pudo obtener dirección:", e.message);
    return "Sin dirección";
  }
}

// === 🕒 Utilidad ===
function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// === 🔔 Toast visual ===
function mostrarToast(mensaje) {
  const t = document.createElement("div");
  t.textContent = mensaje;
  Object.assign(t.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: "600",
    zIndex: "9999",
    transition: "opacity 0.5s ease"
  });
  document.body.appendChild(t);
  setTimeout(() => (t.style.opacity = "0"), 2500);
  setTimeout(() => t.remove(), 3000);
}
