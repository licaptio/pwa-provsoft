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

// 🔹 CLIENTE SUPABASE (ANTI-DUPLICADO)
window._supabaseClient = window._supabaseClient || 
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

var supabase = window._supabaseClient;

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
   PASO 2.2 – DESCARGAR CER / KEY (SEGURO)
================================ */

async function descargarArchivosCSD(){
  log('📥 Descargando archivos CSD...');

  try {
    const cerBlob = await descargarArchivoSeguro(CSD_CONFIG.cer_file);
    const keyBlob = await descargarArchivoSeguro(CSD_CONFIG.key_file);

    CSD_CONFIG.cer_blob = cerBlob;
    CSD_CONFIG.key_blob = keyBlob;

    log('✅ CER y KEY descargados');

    await leerCertificado();
    await leerKeyBasico();
    prepararPKCS8Placeholder();
    estadoCSD();

  } catch (e) {
    console.error(e);
    log('❌ Error descargando archivos CSD');
  }
}

async function descargarArchivoSeguro(nombreArchivo){
  const { data } = supabase.storage
    .from(CSD_BUCKET)
    .getPublicUrl(nombreArchivo);

  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener URL pública');
  }

  const res = await fetch(data.publicUrl);
  if (!res.ok) throw new Error('Error fetch archivo');

  return await res.blob();
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

function obtenerDatosFacturaDemo(){
  return {
    serie: 'A',
    folio: '1',
    fecha: new Date().toISOString().replace('Z','')
    forma_pago: '01',
    metodo_pago: 'PUE',
    tipo_comprobante: 'I',
    moneda: 'MXN',
    lugar_expedicion: CSD_CONFIG.codigo_postal,

    receptor: {
      rfc: 'XAXX010101000',
      nombre: 'PUBLICO EN GENERAL',
      regimen_fiscal: '616',
      domicilio_fiscal: '67700',
      uso_cfdi: 'S01'
    },

    conceptos: [
      {
        clave_sat: '01010101',
        descripcion: 'VENTA DE MERCANCÍA',
        cantidad: 1,
        unidad: 'PIEZA',
        clave_unidad: 'H87',
        valor_unitario: 100,
        objeto_imp: '02',
        impuestos: {
          traslados: [
            { impuesto:'002', tipo:'Tasa', tasa:0.16 }
          ]
        }
      }
    ]
  };
}

function generarXML(){
  clearLog();
  log('🧩 Generando XML CFDI 4.0 (sin sello)...');

  if(!CSD_CONFIG){
    log('❌ CSD no cargado');
    return;
  }

  const data = obtenerDatosFacturaDemo();

  let subtotal = 0;
  let totalImpuestos = 0;

  data.conceptos.forEach(c=>{
    subtotal += c.cantidad * c.valor_unitario;
    c.impuestos.traslados.forEach(t=>{
      totalImpuestos += (c.cantidad * c.valor_unitario) * t.tasa;
    });
  });

  const total = subtotal + totalImpuestos;

  const xml = `
<cfdi:Comprobante
 xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 Version="4.0"
 Serie="${data.serie}"
 Folio="${data.folio}"
 Fecha="${data.fecha}"
 FormaPago="${data.forma_pago}"
 MetodoPago="${data.metodo_pago}"
 TipoDeComprobante="${data.tipo_comprobante}"
 Moneda="${data.moneda}"
 SubTotal="${subtotal.toFixed(2)}"
 Total="${total.toFixed(2)}"
 LugarExpedicion="${data.lugar_expedicion}"
 Exportacion="01"
>

<cfdi:Emisor
 Rfc="${CSD_CONFIG.rfc}"
 Nombre="${CSD_CONFIG.razon_social}"
 RegimenFiscal="${CSD_CONFIG.regimen_fiscal}"
/>

<cfdi:Receptor
 Rfc="${data.receptor.rfc}"
 Nombre="${data.receptor.nombre}"
 DomicilioFiscalReceptor="${data.receptor.domicilio_fiscal}"
 RegimenFiscalReceptor="${data.receptor.regimen_fiscal}"
 UsoCFDI="${data.receptor.uso_cfdi}"
/>

<cfdi:Conceptos>
${data.conceptos.map(c=>`
  <cfdi:Concepto
    ClaveProdServ="${c.clave_sat}"
    Cantidad="${c.cantidad}"
    ClaveUnidad="${c.clave_unidad}"
    Unidad="${c.unidad}"
    Descripcion="${c.descripcion}"
    ValorUnitario="${c.valor_unitario.toFixed(2)}"
    Importe="${(c.cantidad*c.valor_unitario).toFixed(2)}"
    ObjetoImp="${c.objeto_imp}"
  >
    <cfdi:Impuestos>
      <cfdi:Traslados>
        ${c.impuestos.traslados.map(t=>`
        <cfdi:Traslado
          Base="${(c.cantidad*c.valor_unitario).toFixed(2)}"
          Impuesto="${t.impuesto}"
          TipoFactor="${t.tipo}"
          TasaOCuota="${t.tasa.toFixed(6)}"
          Importe="${((c.cantidad*c.valor_unitario)*t.tasa).toFixed(2)}"
        />`).join('')}
      </cfdi:Traslados>
    </cfdi:Impuestos>
  </cfdi:Concepto>
`).join('')}
</cfdi:Conceptos>

<cfdi:Impuestos TotalImpuestosTrasladados="${totalImpuestos.toFixed(2)}">
  <cfdi:Traslados>
    <cfdi:Traslado
      Impuesto="002"
      TipoFactor="Tasa"
      TasaOCuota="0.160000"
      Importe="${totalImpuestos.toFixed(2)}"
    />
  </cfdi:Traslados>
</cfdi:Impuestos>

</cfdi:Comprobante>
`;

  XML_PREVIO = xml.trim();
  log('✅ XML CFDI 4.0 generado (sin sello)');
  console.log(XML_PREVIO);
}


