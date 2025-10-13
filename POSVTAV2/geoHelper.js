// ===============================
// 🌍 GEOLOCALIZACIÓN ROBUSTA PROVSOFT v2.8
// Combina GPS, Google API, IP pública, caché y validación de zona segura
// ===============================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null,
    lon: null,
    precision: null,
    direccion: null,
    metodo: "desconocido",
    fuera_ruta: false // nuevo flag
  };

  const MAX_REINTENTOS = 3;
  const RADIO_VALIDO_KM = 20;  // Rango máximo de movimiento aceptado respecto a la última válida
  const ZONA_BASE = { lat: 24.859, lon: -99.567 }; // Linares centro
  const RADIO_ZONA_SEGURA_KM = 25; // radio máximo desde Linares permitido
  const GOOGLE_API_KEY = "AIzaSyDj-feD_jhqKIKgZLHZ9xpejG5Nx4UiiSE"; // 🔑 Agrega tu API key de Google

  const historial = cargarHistorialUbicaciones();
  let ultimaValida = historial[0] || ZONA_BASE;

  // ============================
  // 🔹 Intento GPS directo
  // ============================
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      console.log(`🛰️ Intento ${intento} de geolocalización...`);
      const pos = await obtenerCoordenadasAltaPrecision();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const precision = pos.coords.accuracy || 9999;

      const distancia = distanciaKm(lat, lon, ultimaValida.lat, ultimaValida.lon);
      console.log(`📏 Distancia respecto última válida: ${distancia.toFixed(1)} km`);

      if (distancia > RADIO_VALIDO_KM || precision > 200) {
        console.warn("⚠️ Coordenada imprecisa o fuera de rango, reintentando...");
        await esperar(1500);
        continue;
      }

      resultado.lat = lat;
      resultado.lon = lon;
      resultado.precision = precision;
      resultado.metodo = "gps";
      resultado.direccion = await obtenerDireccionLegible(lat, lon);

      // ✅ Validar si está dentro de la zona segura
      resultado.fuera_ruta = !estaDentroDeZona(lat, lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);
      if (resultado.fuera_ruta) {
        mostrarToast("🚧 Venta fuera de la zona de Linares");
        console.warn("⚠️ Coordenada fuera del perímetro autorizado:", resultado);
      }

      guardarUbicacionHistorial(lat, lon, precision);
      mostrarToast(`📍 GPS válido (${precision.toFixed(0)} m)`);
      return resultado;

    } catch (e) {
      console.warn(`⚠️ Intento ${intento} fallido: ${e.message}`);
      await esperar(1000);
    }
  }

  // ============================
  // 🔁 Fallback 1: Google Geolocation API
  // ============================
  console.warn("📡 Intentando ubicación por Google Geolocation API...");
  const googleUbic = await obtenerUbicacionGoogle(GOOGLE_API_KEY);
  if (googleUbic?.lat && googleUbic?.lon) {
    googleUbic.fuera_ruta = !estaDentroDeZona(googleUbic.lat, googleUbic.lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);
    if (googleUbic.fuera_ruta) mostrarToast("🚧 Venta fuera de la zona de Linares");
    guardarUbicacionHistorial(googleUbic.lat, googleUbic.lon, googleUbic.precision);
    return googleUbic;
  }

  // ============================
  // 🔁 Fallback 2: IP pública
  // ============================
  console.warn("🌐 Intentando ubicación por IP...");
  const ipUbic = await obtenerUbicacionPorIP();
  if (ipUbic.lat && ipUbic.lon) {
    ipUbic.fuera_ruta = !estaDentroDeZona(ipUbic.lat, ipUbic.lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);
    if (ipUbic.fuera_ruta) mostrarToast("🚧 Venta fuera de la zona de Linares");
    guardarUbicacionHistorial(ipUbic.lat, ipUbic.lon, ipUbic.precision);
    return ipUbic;
  }

  // ============================
  // 🔁 Fallback 3: Caché local
  // ============================
  console.warn("♻️ Usando última ubicación válida o por defecto");
  mostrarToast("♻️ Usando última ubicación válida");
  return { ...ultimaValida, metodo: "cache", fuera_ruta: false };
}

// === Alta precisión con timeout ===
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

// === Google Geolocation API ===
async function obtenerUbicacionGoogle(API_KEY) {
  try {
    const r = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${API_KEY}`, { method: "POST" });
    const d = await r.json();
    if (d.location) {
      const u = {
        lat: d.location.lat,
        lon: d.location.lng,
        precision: d.accuracy || 50,
        metodo: "google_api",
        direccion: await obtenerDireccionLegible(d.location.lat, d.location.lng)
      };
      console.log("✅ Ubicación Google API:", u);
      mostrarToast("📶 Ubicación por red (Google API)");
      return u;
    }
  } catch (e) {
    console.warn("❌ Google API falló:", e.message);
  }
  return null;
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

// === Validación de zona segura (Linares) ===
function estaDentroDeZona(lat, lon, base, radioKm) {
  const d = distanciaKm(lat, lon, base.lat, base.lon);
  return d <= radioKm;
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

// === Historial local ===
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
  setTimeout(()=>t.style.opacity="0",2500);
  setTimeout(()=>t.remove(),3000);
}
