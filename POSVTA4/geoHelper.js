// ===========================================================
// 🌍 GEOHELPER PROVSOFT v3 — TURBO EXPRESS (2 segundos máx)
// Ultra rápido, cero bloqueos, sin reintentos
// ===========================================================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null,
    lon: null,
    precision: null,
    direccion: null,
    metodo: "cache",
    fuera_ruta: false
  };

  const ZONA_BASE = { lat: 24.859, lon: -99.567 }; // Linares
  const RADIO_ZONA_SEGURA_KM = 25;

  // 1️⃣ Cargar última ubicación válida
  const historial = cargarHistorialUbicaciones();
  const ultimaValida = historial[0] || ZONA_BASE;

  try {
    console.log("🛰️ Intento único de GPS (2s max)...");
    const pos = await obtenerCoordenadasTurbo(); // 2 segundos

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const precision = pos.coords.accuracy || 9999;

    // Validar precisión básica (< 300 m)
    if (precision > 300) {
      console.warn("⚠️ Precisión baja, usando última válida.");
      return usarUltimaValida(ultimaValida);
    }

    const fuera = !estaDentroDeZona(lat, lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);

    const dato = {
      lat,
      lon,
      precision,
      metodo: "gps",
      direccion: null,
      fuera_ruta: fuera
    };

    guardarUbicacionHistorial(lat, lon, precision);

    // Dirección ligera (no bloqueante)
    obtenerDireccionLigera(lat, lon)
      .then(txt => dato.direccion = txt)
      .catch(() => {});

    return dato;

  } catch (e) {
    console.warn("⚠️ GPS falló, usando última válida:", e.message);
    return usarUltimaValida(ultimaValida);
  }
}

// ===========================================================
// 🔹 Intento GPS ultrarrápido (2 segundos timeout)
// ===========================================================
function obtenerCoordenadasTurbo() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("No hay geolocalización"));

    const timeout = setTimeout(() => rej(new Error("Timeout 2s")), 2000);

    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(timeout); res(p); },
      (err) => { clearTimeout(timeout); rej(err); },
      { enableHighAccuracy: true, timeout: 2000, maximumAge: 0 }
    );
  });
}

// ===========================================================
// 🧭 Validación zona segura
// ===========================================================
function estaDentroDeZona(lat, lon, base, radioKm) {
  return distanciaKm(lat, lon, base.lat, base.lon) <= radioKm;
}

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI)/180;
  const dLon = ((lon2 - lon1) * Math.PI)/180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) *
            Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ===========================================================
// 🗺️ Dirección ligera (no bloqueante, sin crash)
// ===========================================================
async function obtenerDireccionLigera(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "User-Agent": "ProvSoftPOS" } }
    );
    const d = await r.json();
    return d.display_name || null;
  } catch {
    return null;
  }
}

// ===========================================================
// 🧠 Historial local de ubicaciones
// ===========================================================
function cargarHistorialUbicaciones() {
  try { return JSON.parse(localStorage.getItem("historial_ubicaciones") || "[]"); }
  catch { return []; }
}

function guardarUbicacionHistorial(lat, lon, precision) {
  const arr = cargarHistorialUbicaciones();
  arr.unshift({ lat, lon, precision, ts: Date.now() });
  if (arr.length > 5) arr.pop(); // mantenerlo ligero
  localStorage.setItem("historial_ubicaciones", JSON.stringify(arr));
}

// ===========================================================
// ♻️ Retornar última ubicación válida
// ===========================================================
function usarUltimaValida(ultima) {
  return {
    lat: ultima.lat,
    lon: ultima.lon,
    precision: ultima.precision || 9999,
    metodo: "cache",
    direccion: ultima.direccion || null,
    fuera_ruta: false
  };
}
