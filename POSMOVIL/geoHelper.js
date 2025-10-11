// ===============================
// 🌍 GEOLOCALIZACIÓN ROBUSTA PROVSOFT v2.5
// Evita saltos falsos (ej. Saltillo) y valida posición real
// ===============================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null,
    lon: null,
    precision: null,
    direccion: null,
    metodo: "desconocido"
  };

  const MAX_REINTENTOS = 3;
  const RADIO_VALIDO_KM = 30;  // si el punto se mueve >30 km se considera error
  const COORD_POR_DEFECTO = { lat: 24.856, lon: -99.567 }; // Linares centro (ajusta a tu base)
  const historial = cargarHistorialUbicaciones();
  let ultimaValida = historial[0] || COORD_POR_DEFECTO;

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      console.log(`🛰️ Intento ${intento} de geolocalización...`);
      const pos = await obtenerCoordenadasAltaPrecision();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const precision = pos.coords.accuracy || 9999;

      const distancia = distanciaKm(lat, lon, ultimaValida.lat, ultimaValida.lon);
      console.log(`📏 Distancia respecto última válida: ${distancia.toFixed(1)} km`);

      // ⚠️ descarta puntos fuera de rango (>30 km del último o precisión >200m)
      if (distancia > RADIO_VALIDO_KM || precision > 200) {
        console.warn("⚠️ Coordenada fuera de rango o imprecisa, reintentando...");
        await esperar(1500);
        continue;
      }

      resultado.lat = lat;
      resultado.lon = lon;
      resultado.precision = precision;
      resultado.metodo = "gps";
      resultado.direccion = await obtenerDireccionLegible(lat, lon);

      guardarUbicacionHistorial(lat, lon, precision);
      mostrarToast(`📍 GPS válido (${precision.toFixed(0)} m)`);

      return resultado;
    } catch (e) {
      console.warn(`⚠️ Intento ${intento} fallido: ${e.message}`);
      await esperar(1000);
    }
  }

  console.warn("⚠️ GPS falló, intentando IP...");
  const ipUbic = await obtenerUbicacionPorIP();
  if (ipUbic.lat && ipUbic.lon) {
    guardarUbicacionHistorial(ipUbic.lat, ipUbic.lon, ipUbic.precision);
    return ipUbic;
  }

  console.warn("⚠️ Fallback IP falló, usando última válida");
  mostrarToast("♻️ Usando última ubicación válida");
  return { ...ultimaValida, metodo: "cache" };
}

// === Alta precisión con timeout
function obtenerCoordenadasAltaPrecision() {
  return new Promise((res, rej) => {
    if (!("geolocation" in navigator)) return rej(new Error("Sin geolocalización"));
    const timeout = setTimeout(() => rej(new Error("Timeout 10 s")), 10000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(timeout); res(p); },
      (e) => { clearTimeout(timeout); rej(e); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// === Fallback por IP ===
async function obtenerUbicacionPorIP() {
  try {
    const r = await fetch("https://ipapi.co/json/");
    const d = await r.json();
    const u = {
      lat: d.latitude,
      lon: d.longitude,
      precision: 5000,
      direccion: `${d.city}, ${d.region}, ${d.country_name}`,
      metodo: "ip"
    };
    console.log("✅ Ubicación IP:", u);
    mostrarToast("🌐 Ubicación aproximada (IP)");
    return u;
  } catch (e) {
    console.error("❌ Fallback IP falló:", e);
    return {};
  }
}

// === Dirección legible ===
async function obtenerDireccionLegible(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const d = await r.json();
    return d.display_name || "Sin dirección";
  } catch {
    return "Sin dirección";
  }
}

// === Utilidades ===
function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// === Historial local de posiciones ===
function cargarHistorialUbicaciones() {
  try {
    return JSON.parse(localStorage.getItem("historial_ubicaciones") || "[]");
  } catch { return []; }
}
function guardarUbicacionHistorial(lat, lon, precision) {
  const arr = cargarHistorialUbicaciones();
  arr.unshift({ lat, lon, precision, ts: Date.now() });
  if (arr.length > 10) arr.pop();
  localStorage.setItem("historial_ubicaciones", JSON.stringify(arr));
}

// === Toast visual ===
function mostrarToast(m) {
  const t = document.createElement("div");
  t.textContent = m;
  Object.assign(t.style, {
    position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",
    background:"rgba(0,0,0,0.85)",color:"#fff",padding:"10px 16px",
    borderRadius:"10px",fontWeight:"600",zIndex:"9999",transition:"opacity .5s"
  });
  document.body.appendChild(t);
  set
