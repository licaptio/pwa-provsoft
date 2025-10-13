// ===============================
// 🌍 GEOLOCALIZACIÓN ROBUSTA PROVSOFT v2.7-Lite
// Solo GPS + IP pública + validación de zona Linares
// ===============================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null,
    lon: null,
    precision: null,
    direccion: null,
    metodo: "desconocido",
    fuera_ruta: false
  };

  const MAX_REINTENTOS = 3;
  const RADIO_VALIDO_KM = 20;   // Rango máximo de movimiento válido
  const ZONA_BASE = { lat: 24.859, lon: -99.567 }; // Linares base
  const RADIO_ZONA_SEGURA_KM = 25;

  const historial = cargarHistorialUbicaciones();
  let ultimaValida = historial[0] || ZONA_BASE;

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      console.log(`🛰️ Intento ${intento} de geolocalización (GPS)...`);
      const pos = await obtenerCoordenadasAltaPrecision();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const precision = pos.coords.accuracy || 9999;

      const distancia = distanciaKm(lat, lon, ultimaValida.lat, ultimaValida.lon);
      console.log(`📏 Distancia respecto última válida: ${distancia.toFixed(1)} km`);

      // Si se mueve demasiado o es imprecisa, intenta de nuevo
      if (distancia > RADIO_VALIDO_KM || precision > 500) {
        console.warn("⚠️ Coordenada imprecisa o fuera de rango, reintentando...");
        await esperar(1500);
        continue;
      }

      // ✅ GPS válido
      resultado.lat = lat;
      resultado.lon = lon;
      resultado.precision = precision;
      resultado.metodo = "gps";
      resultado.direccion = await obtenerDireccionLegible(lat, lon);

      // 🚧 Validación de zona Linares
      resultado.fuera_ruta = !estaDentroDeZona(lat, lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);
      if (resultado.fuera_ruta) mostrarToast("🚧 Venta fuera de la zona de Linares");

      guardarUbicacionHistorial(lat, lon, precision);
      mostrarToast(`📍 GPS válido (${precision.toFixed(0)} m)`);
      return resultado;

    } catch (e) {
      console.warn(`⚠️ Intento ${intento} fallido: ${e.message}`);
      await esperar(1000);
    }
  }

  // 🔁 Fallback: IP pública (por red)
  console.warn("🌐 Intentando ubicación aproximada por red...");
  const ipUbic = await obtenerUbicacionPorIP();
  if (ipUbic?.lat && ipUbic?.lon) {
    mostrarToast("🌐 Ubicación aproximada (IP)");
    guardarUbicacionHistorial(ipUbic.lat, ipUbic.lon, ipUbic.precision);
    return ipUbic;
  }

  // 🔁 Última válida o base
  console.warn("♻️ Usando última ubicación válida o base Linares");
  mostrarToast("♻️ Usando última ubicación válida");
  return { ...ultimaValida, metodo: "cache" };
}

// === Alta precisión con timeout ===
function obtenerCoordenadasAltaPrecision() {
  return new Promise((res, rej) => {
    if (!("geolocation" in navigator)) return rej(new Error("Sin geolocalización"));
    const timeout = setTimeout(() => rej(new Error("Timeout 15 s")), 15000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(timeout); res(p); },
      (e) => { clearTimeout(timeout); rej(e); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// === IP pública ===
async function obtenerUbicacionPorIP() {
  try {
    const r = await fetch("https://ipapi.co/json/");
    const d = await r.json();
    return {
      lat: d.latitude,
      lon: d.longitude,
      precision: 5000,
      direccion: `${d.city}, ${d.region}, ${d.country_name}`,
      metodo: "ip"
    };
  } catch (e) {
    console.error("❌ Fallback IP falló:", e);
    return null;
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
function estaDentroDeZona(lat, lon, base, radioKm) {
  const d = distanciaKm(lat, lon, base.lat, base.lon);
  return d <= radioKm;
}
function cargarHistorialUbicaciones() {
  try { return JSON.parse(localStorage.getItem("historial_ubicaciones") || "[]"); }
  catch { return []; }
}
function guardarUbicacionHistorial(lat, lon, precision) {
  const arr = cargarHistorialUbicaciones();
  arr.unshift({ lat, lon, precision, ts: Date.now() });
  if (arr.length > 10) arr.pop();
  localStorage.setItem("historial_ubicaciones", JSON.stringify(arr));
}
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
