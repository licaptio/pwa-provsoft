// ===============================
// 🌍 GEOLOCALIZACIÓN ROBUSTA PROVSOFT v3.0
// Detección de terminales limitadas + contador visual + validación de zona
// ===============================

export async function obtenerUbicacionRobusta() {
  const resultado = {
    lat: null, lon: null, precision: null, direccion: null,
    metodo: "desconocido", fuera_ruta: false,
    gps_limitado: false, precision_categoria: "desconocida"
  };

  const GOOGLE_API_KEY = "AIzaSyDj-feD_jhqKIKgZLHZ9xpejG5Nx4UiiSE";
  const ZONA_BASE = { lat: 24.859, lon: -99.567 }; // Linares
  const RADIO_ZONA_SEGURA_KM = 25;

  let TIMEOUT_GPS = 15000; // base
  if (isDispositivoLimitado()) {
    resultado.gps_limitado = true;
    TIMEOUT_GPS = 20000; // ⏱ más tiempo para H10 y similares
    mostrarToast("⚠️ Terminal con GPS limitado detectada (modo extendido)");
  }

  const historial = cargarHistorialUbicaciones();
  const ultimaValida = historial[0] || ZONA_BASE;

  // === Intentos de geolocalización ===
  for (let intento = 1; intento <= 2; intento++) {
    try {
      console.log(`🛰️ Intento ${intento} de geolocalización...`);
      await mostrarContadorGPS(TIMEOUT_GPS); // ⏱ contador visual

      const pos = await obtenerCoordenadasAltaPrecision(TIMEOUT_GPS);
      const { latitude: lat, longitude: lon, accuracy: precision } = pos.coords;

      resultado.lat = lat;
      resultado.lon = lon;
      resultado.precision = precision;
      resultado.metodo = "gps";
      resultado.direccion = await obtenerDireccionLegible(lat, lon);
      resultado.precision_categoria =
        precision < 50 ? "alta" : precision < 500 ? "media" : "baja";

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

  // === Fallbacks (Google / IP / Caché) ===
  console.warn("📡 Intentando ubicación por Google API...");
  const googleUbic = await obtenerUbicacionGoogle(GOOGLE_API_KEY);
  if (googleUbic?.lat) return googleUbic;

  console.warn("🌐 Intentando ubicación por IP...");
  const ipUbic = await obtenerUbicacionPorIP();
  if (ipUbic?.lat) return ipUbic;

  mostrarToast("♻️ Usando última ubicación válida");
  return { ...ultimaValida, metodo: "cache" };
}

// === Contador visual mientras se busca GPS ===
async function mostrarContadorGPS(tiempoTotal) {
  const segundos = tiempoTotal / 1000;
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "fixed",
    bottom: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "12px",
    fontWeight: "600",
    zIndex: "9999"
  });
  document.body.appendChild(div);

  for (let i = segundos; i >= 0; i--) {
    div.textContent = `🛰 Buscando señal GPS... (${i}s restantes)`;
    await esperar(1000);
  }

  div.textContent = "⌛ Verificando coordenada...";
  setTimeout(() => div.remove(), 1500);
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

// === Dispositivo limitado ===
function isDispositivoLimitado() {
  const ua = navigator.userAgent.toLowerCase();
  return ["h10", "spreadtrum", "unisoc", "mobiwire", "generic"].some(x => ua.includes(x));
}

// === Fallbacks, zona y utilidades ===
async function obtenerUbicacionGoogle(API_KEY){/* igual a v2.9 */}
async function obtenerUbicacionPorIP(){/* igual a v2.9 */}
async function obtenerDireccionLegible(lat,lon){/* igual a v2.9 */}
function estaDentroDeZona(lat,lon,base,radioKm){const d=distanciaKm(lat,lon,base.lat,base.lon);return d<=radioKm;}
function esperar(ms){return new Promise(r=>setTimeout(r,ms));}
function distanciaKm(lat1,lon1,lat2,lon2){const R=6371;const dLat=((lat2-lat1)*Math.PI)/180;const dLon=((lon2-lon1)*Math.PI)/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function cargarHistorialUbicaciones(){try{return JSON.parse(localStorage.getItem("historial_ubicaciones")||"[]");}catch{return[];}}
function guardarUbicacionHistorial(lat,lon,precision){const arr=cargarHistorialUbicaciones();arr.unshift({lat,lon,precision,ts:Date.now()});if(arr.length>10)arr.pop();localStorage.setItem("historial_ubicaciones",JSON.stringify(arr));}
function mostrarToast(m){const t=document.createElement("div");t.textContent=m;Object.assign(t.style,{position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.85)",color:"#fff",padding:"10px 16px",borderRadius:"10px",fontWeight:"600",zIndex:"9999",transition:"opacity .5s"});document.body.appendChild(t);setTimeout(()=>t.style.opacity="0",2500);setTimeout(()=>t.remove(),3000);}
