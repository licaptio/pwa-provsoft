// ===============================
// 🌍 GEOLOCALIZACIÓN ROBUSTA PROVSOFT v2.9
// Detección de terminales limitadas + precisión adaptativa + validación de zona
// ===============================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null, lon: null, precision: null, direccion: null,
    metodo: "desconocido", fuera_ruta: false,
    gps_limitado: false, precision_categoria: "desconocida"
  };

  const GOOGLE_API_KEY = "AIzaSyDj-feD_jhqKIKgZLHZ9xpejG5Nx4UiiSE";
  const ZONA_BASE = { lat: 24.859, lon: -99.567 }; // Linares
  const RADIO_VALIDO_KM = 20;
  const RADIO_ZONA_SEGURA_KM = 25;

  let TIMEOUT_GPS = 10000;
  if (isDispositivoLimitado()) {
    resultado.gps_limitado = true;
    TIMEOUT_GPS = 15000;
    mostrarToast("⚠️ Terminal con GPS limitado detectada");
  }

  const historial = cargarHistorialUbicaciones();
  const ultimaValida = historial[0] || ZONA_BASE;

  // === Intentos GPS ===
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`🛰️ Intento ${i} de geolocalización...`);
      const pos = await obtenerCoordenadasAltaPrecision(TIMEOUT_GPS);
      const { latitude: lat, longitude: lon, accuracy: precision } = pos.coords;
      const dist = distanciaKm(lat, lon, ultimaValida.lat, ultimaValida.lon);

      resultado.lat = lat;
      resultado.lon = lon;
      resultado.precision = precision;
      resultado.metodo = "gps";
      resultado.direccion = await obtenerDireccionLegible(lat, lon);
      resultado.precision_categoria =
        precision < 50 ? "alta" : precision < 500 ? "media" : "baja";

      // 📍 Validaciones
      resultado.fuera_ruta = !estaDentroDeZona(lat, lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);
      if (resultado.fuera_ruta) mostrarToast("🚧 Venta fuera de la zona de Linares");

      if (precision > 1000) {
        console.warn("⚠️ GPS impreciso (>1000m), probando Google API...");
        const googleUbic = await obtenerUbicacionGoogle(GOOGLE_API_KEY);
        if (googleUbic?.lat && googleUbic?.lon) {
          Object.assign(resultado, googleUbic, { metodo: "google_api", gps_impreciso: true });
        }
      }

      guardarUbicacionHistorial(lat, lon, precision);
      mostrarToast(`📍 ${resultado.metodo.toUpperCase()} (${precision.toFixed(0)} m)`);
      return resultado;
    } catch (e) {
      console.warn(`⚠️ Intento ${i} fallido: ${e.message}`);
      await esperar(1000);
    }
  }

  // === Fallbacks ===
  const googleUbic = await obtenerUbicacionGoogle(GOOGLE_API_KEY);
  if (googleUbic?.lat) {
    googleUbic.fuera_ruta = !estaDentroDeZona(googleUbic.lat, googleUbic.lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);
    return googleUbic;
  }

  const ipUbic = await obtenerUbicacionPorIP();
  if (ipUbic?.lat) {
    ipUbic.fuera_ruta = !estaDentroDeZona(ipUbic.lat, ipUbic.lon, ZONA_BASE, RADIO_ZONA_SEGURA_KM);
    return ipUbic;
  }

  mostrarToast("♻️ Usando última ubicación válida");
  return { ...ultimaValida, metodo: "cache", fuera_ruta: false };
}

// === Alta precisión con timeout ===
function obtenerCoordenadasAltaPrecision(timeoutMs) {
  return new Promise((res, rej) => {
    if (!("geolocation" in navigator)) return rej(new Error("Sin geolocalización"));
    const timeout = setTimeout(() => rej(new Error("Timeout")), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(timeout); res(p); },
      (e) => { clearTimeout(timeout); rej(e); },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

// === Detección de dispositivo limitado ===
function isDispositivoLimitado() {
  const ua = navigator.userAgent.toLowerCase();
  return ["h10", "spreadtrum", "unisoc", "mobiwire", "generic"].some(x => ua.includes(x));
}

// === Google API / IP / Zona / Utilidades (igual que versión 2.8) ===
async function obtenerUbicacionGoogle(API_KEY) { /* igual que antes */ }
async function obtenerUbicacionPorIP() { /* igual que antes */ }
async function obtenerDireccionLegible(lat, lon) { /* igual que antes */ }
function estaDentroDeZona(lat, lon, base, radioKm) { const d = distanciaKm(lat, lon, base.lat, base.lon); return d <= radioKm; }
function esperar(ms){return new Promise(r=>setTimeout(r,ms));}
function distanciaKm(lat1,lon1,lat2,lon2){const R=6371;const dLat=((lat2-lat1)*Math.PI)/180;const dLon=((lon2-lon1)*Math.PI)/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function cargarHistorialUbicaciones(){try{return JSON.parse(localStorage.getItem("historial_ubicaciones")||"[]");}catch{return[];}}
function guardarUbicacionHistorial(lat,lon,precision){const arr=cargarHistorialUbicaciones();arr.unshift({lat,lon,precision,ts:Date.now()});if(arr.length>10)arr.pop();localStorage.setItem("historial_ubicaciones",JSON.stringify(arr));}
function mostrarToast(m){const t=document.createElement("div");t.textContent=m;Object.assign(t.style,{position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.85)",color:"#fff",padding:"10px 16px",borderRadius:"10px",fontWeight:"600",zIndex:"9999",transition:"opacity .5s"});document.body.appendChild(t);setTimeout(()=>t.style.opacity="0",2500);setTimeout(()=>t.remove(),3000);}
