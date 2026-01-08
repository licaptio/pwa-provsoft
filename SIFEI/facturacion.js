/**************************************************
 * PROVSOFT – MOTOR DE FACTURACIÓN CFDI 4.0
 * ENTORNO: PRUEBAS (SIFEI)
 **************************************************/

/* ===============================
   CONFIGURACIÓN GENERAL
================================ */

// 🔹 SUPABASE (REAL)
const SUPABASE_URL = 'https://cvpbtjlupswbyxenugpz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cGJ0amx1cHN3Ynl4ZW51Z3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MDIxOTQsImV4cCI6MjA2MzI3ODE5NH0.iiJsYM3TtaGPdeCtPcEXwAz3LfFc1uJGECEvOErvrqY';

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// 🔹 STORAGE
const CSD_BUCKET = 'csd_files';

// 🔹 ENTORNO SIFEI (PRUEBAS)
const SIFEI_ENV = 'TEST'; // TEST | PROD

const SIFEI_ENDPOINTS = {
  TEST: 'https://dev.sifei.com.mx:8443/servicioTimbrado?wsdl',
  PROD: 'https://sat.sifei.com.mx/sifei33/servicioTimbrado?wsdl'
};

/* ===============================
   ESTADO EN MEMORIA
================================ */

let CSD_CONFIG = null;
let XML_PREVIO = null;
let XML_TIMBRADO = null;

/* ===============================
   HELPERS UI
================================ */

function log(msg){
  const out = document.getElementById('output');
  out.textContent += `\n${msg}`;
  out.scrollTop = out.scrollHeight;
}

function clearLog(){
  document.getElementById('output').textContent = '';
}

/* ===============================
   PASO 2 – CARGAR CSD (REAL)
================================ */

async function cargarCSD(){
  clearLog();
  log('🔍 Consultando csd_config en Supabase...');

  const { data, error } = await supabase
    .from('csd_config')
    .select(`
      rfc,
      razon_social,
      regimen_fiscal,
      codigo_postal,
      cer_file,
      key_file,
      numero_certificado,
      numero_serie,
      ambiente
    `)
    .limit(1)
    .single();

  if(error){
    console.error(error);
    log('❌ Error leyendo csd_config');
    return;
  }

  CSD_CONFIG = data;

  log('✅ CSD cargado desde BD');
  console.table(CSD_CONFIG);

  await descargarArchivosCSD();
}

/* ===============================
   PASO 2.2 – DESCARGAR CER / KEY
================================ */

async function descargarArchivosCSD(){
  log('📥 Descargando archivos CSD...');

  const { data: cerBlob, error: cerErr } =
    await supabase.storage
      .from(CSD_BUCKET)
      .download(CSD_CONFIG.cer_file);

  if(cerErr){
    log('❌ Error descargando CER');
    return;
  }

  const { data: keyBlob, error: keyErr } =
    await supabase.storage
      .from(CSD_BUCKET)
      .download(CSD_CONFIG.key_file);

  if(keyErr){
    log('❌ Error descargando KEY');
    return;
  }

  CSD_CONFIG.cer_blob = cerBlob;
  CSD_CONFIG.key_blob = keyBlob;

  log('✅ CER y KEY descargados');

  await leerCertificado();
  await leerKeyBasico();
  prepararPKCS8Placeholder();
  estadoCSD();
}

/* ===============================
   PASO 2.3 – LEER CERTIFICADO
================================ */

async function leerCertificado(){
  log('🔎 Leyendo certificado (.cer)...');

  const arrayBuffer = await CSD_CONFIG.cer_blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const cerBase64 = btoa(
    uint8.reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  CSD_CONFIG.cer_base64 = cerBase64;

  log('✅ Certificado convertido a Base64');
}

/* ===============================
   PASO 3 – KEY (.key) / PKCS8
================================ */

async function leerKeyBasico(){
  log('🔐 Leyendo KEY (.key)...');

  const arrayBuffer = await CSD_CONFIG.key_blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  CSD_CONFIG.key_bytes = uint8;
  CSD_CONFIG.key_size = uint8.length;

  log(`✅ KEY cargada (${uint8.length} bytes)`);
}

function prepararPKCS8Placeholder(){
  CSD_CONFIG.pkcs8_ready = false;
  log('🧩 PKCS8 preparado (placeholder)');
}

function estadoCSD(){
  console.table({
    RFC: CSD_CONFIG?.rfc,
    Certificado: CSD_CONFIG?.numero_certificado,
    Serie: CSD_CONFIG?.numero_serie,
    CER_Base64: !!CSD_CONFIG?.cer_base64,
    KEY_Bytes: CSD_CONFIG?.key_size || 0
  });
}


