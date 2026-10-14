/* ================================================================
   CANVAS / ESTADO
================================================================ */
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const W=900,H=260;
let tipo='flexible',metodo='esal',calculado=false;
let animT=0,nubeOff=0;

let pf={
  W18:5e6,R:90,So:0.45,deltaPSI:1.9,pt:2.0,p0:4.2,Mr:69,
  SN_req:0,SN_prov:0,
  capas:[
    {nom:"Carpeta AC",a:0.44,m:1.0,D:150,col:'#2a2a2f'},
    {nom:"Base granular",a:0.14,m:1.0,D:200,col:'#8b6f3a'},
    {nom:"Subbase gran.",a:0.11,m:1.0,D:180,col:'#c4a46a'}
  ]
};
let pr={
  W18:5e6,R:90,So:0.35,deltaPSI:2.3,pt:2.0,p0:4.5,
  Ec:27579,Sc:4.5,Cd:1.0,J:3.2,k:54.0,D_losa:250,D_base:150,
  bCarril:3.65,nCarriles:2,Ltramo:0,fyAcero:420,fa:1.5,sDow:0,jn:null
};
let transito={TPD:5000,factorCamion:0.15,factorCrec:0.03,anios:20,factorEjes:0.8,carril:0.5};
let vehiculos={bus:200,c2:150,c3:100,c4:80,c5:60,c6:40};

/* ================================================================
   BASE DE DATOS — AASHTO M288-00 (geotextiles)
================================================================ */
const M288 = {
  tabla1: {
    'Clase 1': {
      elong_menor_50: { grab:1400, costura:1260, rasgado:500, punzonado:500 },
      elong_mayor_50: { grab: 900, costura: 810, rasgado:350, punzonado:350 }
    },
    'Clase 2': {
      elong_menor_50: { grab:1100, costura: 990, rasgado:400, punzonado:400 },
      elong_mayor_50: { grab: 700, costura: 630, rasgado:250, punzonado:250 }
    },
    'Clase 3': {
      elong_menor_50: { grab: 800, costura: 720, rasgado:300, punzonado:300 },
      elong_mayor_50: { grab: 500, costura: 450, rasgado:180, punzonado:180 }
    }
  },
  tabla2: {
    id:'M288-T2', titulo:'Drenaje Subsuperficial', ref:'AASHTO M288-00 § 7.2 — Tabla 2',
    funcion:'Filtración', clase:'Clase 2',
    requerimientos:{
      '% pasa Tamiz No. 200 < 15':      { permitividad:0.5, TAA:0.43 },
      '15 ≤ % pasa Tamiz No. 200 ≤ 50': { permitividad:0.2, TAA:0.25 },
      '% pasa Tamiz No. 200 > 50':      { permitividad:0.1, TAA:0.22 }
    },
    UV:'50% retención después de 500 h (ASTM D4355)',
    notas:[
      'No se aceptan geotextiles tejidos de película cortada (listones planos).',
      'Los valores de TAA son máximos promedios por rollo (VMPR).',
      'Para suelos cohesivos con IP > 7, TAA máximo = 0.30 mm.',
      'El Ingeniero puede especificar Clase 3 si demuestra supervivencia suficiente.'
    ]
  },
  tabla3: {
    id:'M288-T3', titulo:'Separación', ref:'AASHTO M288-00 § 7.3 — Tabla 3',
    funcion:'Separación entre subrasante y agregado', clase:'Clase 2',
    aplica:'CBR ≥ 3 (τ ≈ 90 kPa)',
    requerimientos:{
      'Permitividad':{ valor:0.02, unidad:'s⁻¹', metodo:'ASTM D4491' },
      'TAA':         { valor:0.60, unidad:'mm máx prom/rollo', metodo:'ASTM D4751' },
      'UV':          { valor:'50% después de 500 h', metodo:'ASTM D4355' }
    },
    notas:[
      'Aplicable a subrasantes NO saturadas.',
      'Función principal: separación (evitar contaminación de capas).',
      'El Ingeniero puede especificar Clase 3 si demuestra supervivencia en campo.'
    ]
  },
  tabla4: {
    id:'M288-T4', titulo:'Estabilización', ref:'AASHTO M288-00 § 7.4 — Tabla 4',
    funcion:'Separación + Filtración + Refuerzo', clase:'Clase 1',
    aplica:'1 < CBR < 3 (30 kPa < τ < 90 kPa)',
    requerimientos:{
      'Permitividad':{ valor:0.05, unidad:'s⁻¹', metodo:'ASTM D4491' },
      'TAA':         { valor:0.43, unidad:'mm máx prom/rollo', metodo:'ASTM D4751' },
      'UV':          { valor:'50% después de 500 h', metodo:'ASTM D4355' }
    },
    notas:[
      'Aplicable a subrasantes saturadas (nivel freático alto o humedad prolongada).',
      'NO aplica para refuerzo de terraplenes con fallas globales.',
      'El Ingeniero puede especificar Clase 2 o 3 con justificación.'
    ]
  },
  tabla5: {
    id:'M288-T5', titulo:'Control Permanente de Erosión', ref:'AASHTO M288-00 § 7.5 — Tabla 5',
    funcion:'Filtración',
    requerimientos:{
      '>50% pasa Tamiz 200 — Geotextiles Tejidos Monofilamento':
        { clase:'Clase 2', permitividad:0.7, TAA:0.43 },
      '>50% pasa Tamiz 200 — Todos los demás geotextiles':
        { clase:'Clase 1', permitividad:0.2, TAA:0.25 },
      '≤50% pasa Tamiz 200':
        { clase:'Clase 1', permitividad:0.1, TAA:0.22 }
    },
    UV:'50% retención después de 500 h (ASTM D4355)',
    notas:[
      'No se admiten geotextiles tejidos de película cortada.',
      'El Ingeniero puede reducir requisitos si se demuestra menor daño constructivo.'
    ]
  },
  tabla6: {
    id:'M288-T6', titulo:'Barreras Temporales contra Sedimentos', ref:'AASHTO M288-00 § 8 — Tabla 6',
    funcion:'Filtración + sedimentación',
    requerimientos:{
      'Con soporte — Elong ≥ 50%': { grab_MD:400, grab_XD:400, permitividad:0.05, TAA:0.60, UV:'70%/500h', postes:'1.2 m', enterrado:150 },
      'Con soporte — Elong < 50%': { grab_MD:550, grab_XD:450, permitividad:0.05, TAA:0.60, UV:'70%/500h', postes:'1.2 m', enterrado:150 },
      'Sin soporte'              : { grab_MD:550, grab_XD:450, permitividad:0.05, TAA:0.60, UV:'70%/500h', postes:'2.0 m', enterrado:150 }
    },
    notas:[
      'Altura mínima sobre el piso: 750 mm.',
      'Profundidad mínima de enterrado: 150 mm.',
      'Área máxima por defensa: 90 m² por cada 3 m de cerca.',
      'UV más exigente: 70% (vs 50% de Tablas 2–5).'
    ]
  },
  tabla7: {
    id:'M288-T7', titulo:'Geotextil de Pavimentación', ref:'AASHTO M288-00 § 9 — Tabla 7',
    funcion:'Membrana impermeable / aliviadora de esfuerzos',
    requerimientos:[
      { prop:'Resistencia Grab',          metodo:'ASTM D4632', unidad:'N',    valor:450 },
      { prop:'Elongación en Rotura',      metodo:'ASTM D4632', unidad:'%',    valor:'≥ 50' },
      { prop:'Masa por Unidad de Área',   metodo:'ASTM D5261', unidad:'g/m²', valor:140 },
      { prop:'Punto de Fusión',           metodo:'ASTM D276',  unidad:'°C',   valor:150 }
    ],
    notas:[
      'Se satura con cemento asfáltico (tasa según fabricante).',
      'Temperatura del cemento asfáltico: 145°C mín, 160°C máx.',
      'Temperatura ambiente: ≥ 10°C (cementos) o ≥ 15°C (emulsiones).',
      'Traslape de juntas: 150 mm máx; segunda aplicación de sellador en traslapes.'
    ]
  },
  tablaA1: [
    { condicion:'CBR > 3',                       traslape:'300 – 450 mm',     nota:'—' },
    { condicion:'1 < CBR < 3',                   traslape:'0.60 – 1.00 m',    nota:'—' },
    { condicion:'0.5 < CBR < 1',                 traslape:'1.00 m o costura', nota:'—' },
    { condicion:'CBR < 0.5',                     traslape:'Costura',          nota:'Requerida' },
    { condicion:'Todos los extremos de rollos',  traslape:'1.00 m o costura', nota:'—' }
  ]
};

/* ================================================================
   BASE DE DATOS — ESTABILIZACIÓN QUÍMICA (AASHTO)
================================================================ */
const QUIMICA = {
  tablaSuelos: {
    'A-1-a': { descripcion:'Grava bien gradada, fragmentos de piedra, arena', IP:'NP',  pasa200:'≤ 50%', cal:'No aplica', cemento:'3 – 5%',   materiaOrganica:'≤ 1.5%' },
    'A-1-b': { descripcion:'Grava mal gradada, arena gruesa',                 IP:'NP',  pasa200:'≤ 50%', cal:'No aplica', cemento:'5 – 8%',   materiaOrganica:'≤ 1.5%' },
    'A-2-4': { descripcion:'Grava arenosa limosa',                            IP:'≤ 10', pasa200:'≤ 35%', cal:'No aplica', cemento:'5 – 9%',   materiaOrganica:'≤ 1.5%' },
    'A-2-5': { descripcion:'Grava arenosa limosa elástica',                   IP:'≤ 10', pasa200:'≤ 35%', cal:'No aplica', cemento:'5 – 9%',   materiaOrganica:'≤ 1.5%' },
    'A-2-6': { descripcion:'Grava arenosa arcillosa',                         IP:'≥ 11', pasa200:'≤ 35%', cal:'3 – 10%',   cemento:'8 – 12%',  materiaOrganica:'≤ 1.5%' },
    'A-2-7': { descripcion:'Grava arcillosa elástica',                        IP:'≥ 11', pasa200:'≤ 35%', cal:'3 – 10%',   cemento:'8 – 12%',  materiaOrganica:'≤ 1.5%' },
    'A-3':   { descripcion:'Arena fina de playa',                             IP:'NP',  pasa200:'≤ 10%', cal:'No aplica', cemento:'7 – 10%',  materiaOrganica:'≤ 1.5%' },
    'A-4':   { descripcion:'Suelo limoso',                                    IP:'≤ 10', pasa200:'≥ 36%', cal:'8 – 12%',   cemento:'8 – 12%',  materiaOrganica:'≤ 1.5%' },
    'A-5':   { descripcion:'Suelo limoso elástico',                           IP:'≥ 11', pasa200:'≥ 36%', cal:'8 – 12%',   cemento:'10 – 14%', materiaOrganica:'≤ 1.5%' },
    'A-6':   { descripcion:'Suelo arcilloso',                                 IP:'≥ 11', pasa200:'≥ 36%', cal:'5 – 10%',   cemento:'10 – 16%', materiaOrganica:'≤ 1.5%' },
    'A-7-5': { descripcion:'Suelo arcilloso (LL > 40)',                       IP:'≥ 11', pasa200:'≥ 36%', cal:'6 – 12%',   cemento:'10 – 16%', materiaOrganica:'≤ 1.5%' },
    'A-7-6': { descripcion:'Suelo arcilloso (LL ≤ 40)',                       IP:'≥ 11', pasa200:'≥ 36%', cal:'6 – 12%',   cemento:'10 – 16%', materiaOrganica:'≤ 1.5%' }
  },
  ensayos: {
    cal: [
      { ensayo:'Granulometría',                        norma:'AASHTO T 88',         proposito:'Determinar % pasa Tamiz N° 200' },
      { ensayo:'Límite líquido e índice plástico',     norma:'AASHTO T 90',         proposito:'Clasificar suelo y verificar IP ≥ 10%' },
      { ensayo:'Compactación Proctor estándar',        norma:'AASHTO T 99',         proposito:'Obtener densidad seca máxima y OCH' },
      { ensayo:'Compactación Proctor modificado',      norma:'AASHTO T 180',        proposito:'Para tránsito alto (> 10M ESAL)' },
      { ensayo:'Resistencia a compresión inconfinada', norma:'ASTM D 5102 / T 220', proposito:'Verificar resistencia ≥ 690 kPa a 7 días' },
      { ensayo:'pH Eades-Grim',                        norma:'ASTM D 6276',         proposito:'Estimar dosificación óptima de cal' },
      { ensayo:'Contenido de materia orgánica',        norma:'AASHTO T 267',        proposito:'Verificar ≤ 1.5%' },
      { ensayo:'Sulfatos solubles',                    norma:'AASHTO T 290',        proposito:'Verificar SO₄ ≤ 0.2%' }
    ],
    cemento: [
      { ensayo:'Granulometría',                        norma:'AASHTO T 88',         proposito:'Determinar % pasa Tamiz N° 200' },
      { ensayo:'Límite líquido e índice plástico',     norma:'AASHTO T 90',         proposito:'Verificar IP ≤ 15%' },
      { ensayo:'Equivalente de arena',                 norma:'AASHTO T 176',        proposito:'Verificar equivalente ≥ 25' },
      { ensayo:'Compactación Proctor modificado',      norma:'AASHTO T 180',        proposito:'Diseño de mezcla y control de campo' },
      { ensayo:'Resistencia a compresión inconfinada', norma:'ASTM D 1633 / T 220', proposito:'Verificar resistencia ≥ 1.4 MPa a 7 días' },
      { ensayo:'Contenido de materia orgánica',        norma:'AASHTO T 267',        proposito:'Verificar ≤ 1.5%' },
      { ensayo:'Sulfatos solubles',                    norma:'AASHTO T 290',        proposito:'Verificar SO₄ ≤ 0.2%' }
    ]
  },
  notas: {
    cal: [
      'La cal viva debe cumplir AASHTO M216 (ASTM C977) con 82% de CaO disponible.',
      'La cal hidratada debe cumplir AASHTO M216 (ASTM C977) con 65% de CaO disponible.',
      'Dosificación usual: 3% a 10% en peso de suelo seco.',
      'Compactación mínima: 95% de la MDS según AASHTO T 180.',
      'Curado mínimo: 7 días con humedad controlada antes de colocar capas superiores.',
      'Resistencia mínima a compresión a 7 días: 690 kPa (100 psi) según AASHTO T 220.',
      'Suelos con IP ≥ 10% y contenido de arcilla > 10% son aptos para cal.',
      'No se permite estabilización con cal si la materia orgánica > 1.5%.'
    ],
    cemento: [
      'El cemento Portland debe cumplir AASHTO M85 (ASTM C150) Tipo I, II o III.',
      'Índice plástico máximo permitido: 15%.',
      'Equivalente de arena mínimo (AASHTO T 176): 25.',
      'Dosificación usual: 6% a 16% en peso de suelo seco.',
      'Compactación mínima: 95% de la MDS según AASHTO T 180.',
      'Curado mínimo: 7 días con humedad controlada.',
      'Resistencia mínima a compresión a 7 días: 1.4 MPa (200 psi) para subbase.',
      'No se permite estabilización con cemento si la materia orgánica > 1.5%.',
      'Para suelos A-6 y A-7, considerar tratamiento combinado cal + cemento.'
    ]
  }
};

/* ================================================================
   CORRELACIONES EMPÍRICAS
================================================================ */
function cbrDesdeMr(Mr_MPa){ return (Mr_MPa * 145.038) / 1500; }
function cbrDesdeK(k_MN_m3){ return (k_MN_m3 * 3.6839) / 10; }

/* ================================================================
   SELECCIÓN DE APLICACIÓN SEGÚN CBR (M288-00)
================================================================ */
function seleccionarAplicacion(cbr){
  if(cbr >= 3) return {id:'separacion',       tabla:M288.tabla3, label:'Separación (CBR ≥ 3)'};
  if(cbr >  1) return {id:'estabilizacion',   tabla:M288.tabla4, label:'Estabilización (1 < CBR < 3)'};
  return        {id:'estabilizacion_critica', tabla:M288.tabla4, label:'Estabilización crítica (CBR ≤ 1) — REQUIERE COSTURA'};
}

/* ================================================================
   OBTENER SUGERENCIA GEOTEXTIL
================================================================ */
function obtenerSugerencia(){
  let cbr, parametroBase;
  if(tipo==='flexible'){ cbr = cbrDesdeMr(pf.Mr); parametroBase = 'Mr = ' + pf.Mr + ' MPa (≈ CBR ' + cbr.toFixed(2) + ')'; }
  else                 { cbr = cbrDesdeK(pr.k);   parametroBase = 'k = ' + pr.k + ' MN/m³ (≈ CBR ' + cbr.toFixed(2) + ')'; }

  const app = seleccionarAplicacion(cbr);
  const claseSeleccionada = app.tabla.clase;
  const especifClase1 = M288.tabla1[claseSeleccionada];

  let traslape;
  if(cbr > 3) traslape = '300 – 450 mm';
  else if(cbr > 1) traslape = '0.60 – 1.00 m';
  else if(cbr > 0.5) traslape = '1.00 m o costura';
  else traslape = 'Costura';

  let requerimientosApp = '';
  if(app.id === 'separacion'){
    const r = app.tabla.requerimientos;
    requerimientosApp =
      '<tr><td class="prop">Permitividad</td><td class="metodo">ASTM D4491</td><td class="val">' + r['Permitividad'].valor + ' s⁻¹</td></tr>' +
      '<tr><td class="prop">TAA</td><td class="metodo">ASTM D4751</td><td class="val">' + r['TAA'].valor + ' mm</td></tr>' +
      '<tr><td class="prop">Estabilidad UV</td><td class="metodo">ASTM D4355</td><td class="val">' + r['UV'].valor + '</td></tr>';
  } else {
    const r = app.tabla.requerimientos;
    requerimientosApp =
      '<tr><td class="prop">Permitividad</td><td class="metodo">ASTM D4491</td><td class="val">' + r['Permitividad'].valor + ' s⁻¹</td></tr>' +
      '<tr><td class="prop">TAA</td><td class="metodo">ASTM D4751</td><td class="val">' + r['TAA'].valor + ' mm</td></tr>' +
      '<tr><td class="prop">Estabilidad UV</td><td class="metodo">ASTM D4355</td><td class="val">' + r['UV'].valor + '</td></tr>';
  }

  let color, emoji, titulo, resumen;
  if(app.id === 'separacion'){
    color='#22c55e'; emoji='✅';
    titulo='Separación — Geotextil Clase 2 (M288-00 Tabla 3)';
    resumen='Subrasante con CBR ≈ ' + cbr.toFixed(2) + ' (≥ 3). Aplicación de separación entre subrasante y base/sub-base. Función principal: evitar contaminación entre capas.';
  } else if(app.id === 'estabilizacion'){
    color='#f59e0b'; emoji='🔶';
    titulo='Estabilización — Geotextil Clase 1 (M288-00 Tabla 4)';
    resumen='Subrasante con 1 < CBR < 3 (≈ ' + cbr.toFixed(2) + '). Se requiere estabilización con funciones simultáneas de separación + filtración.';
  } else {
    color='#ef4444'; emoji='⚠️';
    titulo='Estabilización crítica — Clase 1 + Costura (M288-00 § A1)';
    resumen='Subrasante con CBR ≤ 1 (≈ ' + cbr.toFixed(2) + '). Requiere estabilización con geotextil Clase 1 Y uniones cosidas obligatorias (no se permite traslape simple).';
  }

  return { cbr, parametroBase, app, claseSeleccionada, especifClase1, traslape, requerimientosApp, color, emoji, titulo, resumen };
  /* ================================================================
   DESCRIPCIÓN TÉCNICA DEL GEOTEXTIL RECOMENDADO
================================================================ */
function descripcionTecnicaGeotextil(app){
  const base = {
    separacion: {
      tipo: 'Geotextil NO TEJIDO punzonado por agujas (o tejido monofilamento de alta tenacidad)',
      polimero: 'Polipropileno (PP) o Poliéster (PET) — 100% sintético, cadenas largas (≥ 95% poliolefina/poliéster)',
      funcion: 'Separación entre subrasante y capa granular',
      caracteristicas: [
        'Resistencia Grab mínima: 700 N (elongación ≥ 50%) o 1100 N (elongación < 50%)',
        'Resistencia al punzonado: 250 N mínimo (ASTM D4833)',
        'Resistencia al rasgado trapezoidal: 250 N mínimo (ASTM D4533)',
        'Permitividad: ≥ 0.02 s⁻¹ (ASTM D4491)',
        'Tamaño de Apertura Aparente (TAA): ≤ 0.60 mm (ASTM D4751)',
        'Estabilización UV: 50% retención después de 500 h (ASTM D4355)',
        'Ancho de rollo típico: 3.0 – 5.8 m',
        'Masa por unidad de área típica: 200 – 300 g/m²'
      ],
      colocacion: [
        'Preparar la subrasante: limpia, sin raíces, sin material suelto ni escombros.',
        'Extender el geotextil SIN ARRUGAS, sin dobleces y en contacto íntimo con el suelo.',
        'Traslape longitudinal y transversal: 300 – 450 mm (Tabla A1, CBR > 3).',
        'Fijar con grapas o pasadores cada 1.5 – 2.0 m en la dirección del tráfico.',
        'Colocar la capa granular SOBRE el geotextil con equipo de descarga desde el borde.',
        'NO permitir tráfico directo sobre el geotextil: mínimo 150 mm de agregado antes de circular.',
        'NO girar vehículos sobre la primera capa de compactación.'
      ]
    },
    estabilizacion: {
      tipo: 'Geotextil NO TEJIDO punzonado por agujas de ALTA RESISTENCIA (o tejido monofilamento reforzado)',
      polimero: 'Polipropileno (PP) de alto módulo o Poliéster (PET) de alta tenacidad',
      funcion: 'Separación + Filtración + Refuerzo en subrasante saturada',
      caracteristicas: [
        'Resistencia Grab mínima: 900 N (elongación ≥ 50%) o 1400 N (elongación < 50%)',
        'Resistencia al punzonado: 500 N mínimo (ASTM D4833)',
        'Resistencia al rasgado trapezoidal: 500 N mínimo (ASTM D4533)',
        'Permitividad: ≥ 0.05 s⁻¹ (ASTM D4491)',
        'Tamaño de Apertura Aparente (TAA): ≤ 0.43 mm (ASTM D4751)',
        'Estabilización UV: 50% retención después de 500 h (ASTM D4355)',
        'Ancho de rollo típico: 3.0 – 5.8 m',
        'Masa por unidad de área típica: 270 – 400 g/m²'
      ],
      colocacion: [
        'Preparar la subrasante: eliminar puntos blandos, rellenar con material seleccionado.',
        'Extender el geotextil suelto, SIN ARRUGAS, en la dirección del tráfico de construcción.',
        'Traslape longitudinal y transversal: 0.60 – 1.00 m (Tabla A1, 1 < CBR < 3).',
        'Curvas: doblar o cortar el geotextil y fijar con grapas o material de relleno.',
        'Colocar la sub-base descargando desde los bordes, NUNCA en contacto directo con las llantas.',
        'Primera capa granular mínima: 300 mm antes de permitir compactación vibratoria.',
        'NO usar vibro-compactadores en la primera pasada (daña el geotextil).',
        'Inspección visual antes de cubrir: sin agujeros, rasgaduras ni uniones sueltas.'
      ]
    },
    estabilizacion_critica: {
      tipo: 'Geotextil NO TEJIDO punzonado por agujas de MUY ALTA RESISTENCIA — CLASE 1',
      polimero: 'Polipropileno (PP) de alto módulo con fibra continua',
      funcion: 'Refuerzo + Separación + Filtración en subrasante MUY BLANDA (CBR ≤ 1)',
      caracteristicas: [
        'Resistencia Grab mínima: 900 N (elong ≥ 50%) o 1400 N (elong < 50%)',
        'Resistencia al punzonado: 500 N mínimo (ASTM D4833)',
        'Resistencia al rasgado trapezoidal: 500 N mínimo (ASTM D4533)',
        'Resistencia de costura: ≥ 90% de la resistencia Grab especificada',
        'Permitividad: ≥ 0.05 s⁻¹ (ASTM D4491)',
        'Tamaño de Apertura Aparente (TAA): ≤ 0.43 mm (ASTM D4751)',
        'Estabilización UV: 50% retención después de 500 h (ASTM D4355)',
        'Masa por unidad de área típica: 350 – 600 g/m²',
        'Hilo de costura: Polipropileno o Poliéster de alta resistencia (NO nailon)'
      ],
      colocacion: [
        'Preparar la subrasante: excavar puntos blandos y rellenar con material granular.',
        'Extender el geotextil SIN ARRUGAS, en la dirección del tráfico.',
        '⚠️ UNIR POR COSTURA OBLIGATORIA — NO se permite traslape simple (Tabla A1, CBR ≤ 1).',
        'Costura en campo: hilo PP/PET de alta resistencia, color contrastante.',
        'Suministrar 2 m de junta cosida de muestra al Ingeniero antes de instalar.',
        'Descargar el agregado desde los bordes con equipo de bajo contacto.',
        'Extender el espesor total del agregado INMEDIATAMENTE después del descargue.',
        'Primera capa mínima: 300 mm de agregado suelto antes de compactar.',
        'NO girar vehículos sobre la primera capa.',
        'Reparar daños con parches que se extiendan ≥ 300 mm más allá del área afectada.'
      ]
    }
  };
  return base[app.id];
}

/* ================================================================
   OBTENER ESTABILIZACIÓN QUÍMICA
================================================================ */
function obtenerEstabilizacionQuimica(cbr){
  let clasificacion, ipEstimado, pasa200Estimado;

  if(cbr >= 30)      { clasificacion='A-1-a'; ipEstimado=0;  pasa200Estimado=30; }
  else if(cbr >= 20) { clasificacion='A-1-b'; ipEstimado=0;  pasa200Estimado=40; }
  else if(cbr >= 15) { clasificacion='A-2-4'; ipEstimado=5;  pasa200Estimado=30; }
  else if(cbr >= 10) { clasificacion='A-3';   ipEstimado=0;  pasa200Estimado=8;  }
  else if(cbr >= 8)  { clasificacion='A-2-6'; ipEstimado=15; pasa200Estimado=30; }
  else if(cbr >= 6)  { clasificacion='A-4';   ipEstimado=8;  pasa200Estimado=50; }
  else if(cbr >= 4)  { clasificacion='A-5';   ipEstimado=15; pasa200Estimado=55; }
  else if(cbr >= 3)  { clasificacion='A-6';   ipEstimado=18; pasa200Estimado=60; }
  else if(cbr >= 1.5){ clasificacion='A-7-5'; ipEstimado=25; pasa200Estimado=65; }
  else               { clasificacion='A-7-6'; ipEstimado=30; pasa200Estimado=70; }

  const suelo = QUIMICA.tablaSuelos[clasificacion];

  const requiereCal = ipEstimado >= 10 || clasificacion.indexOf('A-6') !== -1 || clasificacion.indexOf('A-7') !== -1 || clasificacion === 'A-5' || clasificacion === 'A-4';
  const requiereCemento = cbr < 20;
  const requiereCombinado = clasificacion.indexOf('A-7') !== -1 && ipEstimado > 20;

  let tratamiento, dosificacion, resistencia, ensayos, notas, color, emoji;

  if(requiereCombinado){
    tratamiento = 'Cal + Cemento Portland (combinado)';
    dosificacion = 'Cal: 4 – 6% + Cemento: 6 – 10% (en peso de suelo seco)';
    resistencia = '≥ 1.4 MPa a 7 días (ASTM D 1633 / AASHTO T 220)';
    ensayos = QUIMICA.ensayos.cal.concat(QUIMICA.ensayos.cemento);
    notas = QUIMICA.notas.cal.slice(0,3).concat(QUIMICA.notas.cemento.slice(0,4));
    notas.push('El tratamiento combinado es especialmente eficaz para suelos A-6 y A-7 con alta plasticidad.');
    color = '#ef4444'; emoji = '⚠️';
  } else if(requiereCal && ipEstimado >= 10){
    tratamiento = 'Cal (viva o hidratada) — AASHTO M216';
    dosificacion = suelo.cal !== 'No aplica' ? suelo.cal : '5 – 10%';
    resistencia = '≥ 690 kPa a 7 días (ASTM D 5102 / AASHTO T 220)';
    ensayos = QUIMICA.ensayos.cal;
    notas = QUIMICA.notas.cal;
    color = '#f59e0b'; emoji = '🔶';
  } else if(requiereCemento){
    tratamiento = 'Cemento Portland — AASHTO M85';
    dosificacion = suelo.cemento || '8 – 12%';
    resistencia = '≥ 1.4 MPa a 7 días para subbase (ASTM D 1633 / AASHTO T 220)';
    ensayos = QUIMICA.ensayos.cemento;
    notas = QUIMICA.notas.cemento;
    color = '#f59e0b'; emoji = '🔶';
  } else {
    tratamiento = 'No requiere estabilización química';
    dosificacion = '—';
    resistencia = '—';
    ensayos = [];
    notas = ['El suelo presenta CBR ≥ 20 y plasticidad baja. No se requiere tratamiento químico.'];
    color = '#22c55e'; emoji = '✅';
  }

  return { clasificacion, suelo, ipEstimado, pasa200Estimado, requiereCal, requiereCemento, requiereCombinado,
           tratamiento, dosificacion, resistencia, ensayos, notas, color, emoji };
}

/* ================================================================
   RENDER PANEL M288
================================================================ */
function renderM288(){
  const cont=document.getElementById('m288-content');
  if(!calculado){
    cont.innerHTML='<div style="padding:20px;color:var(--text3);font-family:var(--mono);font-size:12px;text-align:center;background:var(--bg3);border-radius:8px;border:1px dashed var(--border2);">' +
      'Primero presione <strong style="color:var(--accent2)">Calcular</strong> para obtener la especificación de geotextiles según AASHTO M288-00.' +
    '</div>';
    return;
  }

  const s = obtenerSugerencia();
  const dg = descripcionTecnicaGeotextil(s.app);
  const t1 = M288.tabla1[s.claseSeleccionada];

  cont.innerHTML =
    '<div class="m288-card" style="border-left-color:' + s.color + '">' +
      '<div class="m288-head">' +
        '<div class="m288-title">' + s.emoji + ' ' + s.titulo + '</div>' +
        '<div class="m288-badge">AASHTO M288-00</div>' +
      '</div>' +
      '<div class="m288-sub">' + s.resumen + '</div>' +
      '<div class="m288-grid-info">' +
        '<div class="m288-info-box"><div class="k">Parámetro base</div><div class="v">' + s.parametroBase + '</div></div>' +
        '<div class="m288-info-box"><div class="k">Aplicación</div><div class="v hl">' + s.app.label + '</div></div>' +
        '<div class="m288-info-box"><div class="k">Clase geotextil</div><div class="v">' + s.claseSeleccionada + '</div></div>' +
        '<div class="m288-info-box"><div class="k">Traslape mínimo</div><div class="v">' + s.traslape + '</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="m288-card" style="border-left-color:' + s.color + '">' +
      '<div class="m288-head">' +
        '<div class="m288-title">📋 Descripción técnica del geotextil a especificar</div>' +
        '<div class="m288-badge">Producto recomendado</div>' +
      '</div>' +
      '<div class="m288-grid-info">' +
        '<div class="m288-info-box"><div class="k">Tipo de producto</div><div class="v">' + dg.tipo + '</div></div>' +
        '<div class="m288-info-box"><div class="k">Polímero</div><div class="v">' + dg.polimero + '</div></div>' +
        '<div class="m288-info-box"><div class="k">Función principal</div><div class="v">' + dg.funcion + '</div></div>' +
      '</div>' +
      '<div style="margin-top:10px;">' +
        '<div style="font-family:var(--mono);font-size:10px;color:var(--accent2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">⚙️ Características técnicas mínimas</div>' +
        '<ul style="margin-left:16px;font-size:11px;color:var(--text2);line-height:1.8;">' +
          dg.caracteristicas.map(function(c){return '<li>'+c+'</li>';}).join('') +
        '</ul>' +
      '</div>' +
      '<div style="margin-top:12px;">' +
        '<div style="font-family:var(--mono);font-size:10px;color:var(--accent2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">🏗️ Método de colocación (AASHTO M288-00 Apéndice A)</div>' +
        '<ol style="margin-left:18px;font-size:11px;color:var(--text2);line-height:1.8;">' +
          dg.colocacion.map(function(c){return '<li>'+c+'</li>';}).join('') +
        '</ol>' +
      '</div>' +
      '<div class="m288-notas" style="margin-top:12px;">' +
        '<strong>Ejemplos comerciales típicos</strong> (equivalentes, no exclusivos):<br>' +
        '• <strong>Clase 1:</strong> Mirafi 140N, TenCate Geotex 401, Propex 2000, GSE HD-20, Polyfelt PEC-200, Typar 3401<br>' +
        '• <strong>Clase 2:</strong> Mirafi 500X, TenCate Geotex 315ST, Propex 2044, GSE HD-10, Polyfelt TS-60<br>' +
        '• <strong>Clase 3:</strong> Mirafi 180N, TenCate Geotex 211, Propex 151, GSE HD-5<br>' +
        '<em style="color:var(--text3);">La selección final debe basarse en los valores VMPR certificados por el fabricante según AASHTO M288-00 § 4.</em>' +
      '</div>' +
    '</div>' +

    '<div class="m288-card" style="border-left-color:var(--accent)">' +
      '<div class="m288-head">' +
        '<div class="m288-title">📏 Tabla 1 — Requerimientos de Resistencia (' + s.claseSeleccionada + ')</div>' +
        '<div class="m288-badge">VMPR dirección más débil</div>' +
      '</div>' +
      '<div class="m288-sub">Valores mínimos promedio por rollo (N). Resistencia de costura ≥ 90% de Grab cuando apliquen uniones cosidas (§ 7.1.2).</div>' +
      '<table class="m288-table">' +
        '<thead><tr><th>Propiedad</th><th>Método</th><th>Elong &lt; 50%</th><th>Elong ≥ 50%</th></tr></thead>' +
        '<tbody>' +
          '<tr><td class="prop">Resistencia Grab</td><td class="metodo">ASTM D4632</td><td class="val">' + t1.elong_menor_50.grab + ' N</td><td class="val">' + t1.elong_mayor_50.grab + ' N</td></tr>' +
          '<tr><td class="prop">Resistencia Costura</td><td class="metodo">ASTM D4632</td><td class="val">' + t1.elong_menor_50.costura + ' N</td><td class="val">' + t1.elong_mayor_50.costura + ' N</td></tr>' +
          '<tr><td class="prop">Resistencia al Rasgado</td><td class="metodo">ASTM D4533</td><td class="val">' + t1.elong_menor_50.rasgado + ' N</td><td class="val">' + t1.elong_mayor_50.rasgado + ' N</td></tr>' +
          '<tr><td class="prop">Resistencia al Punzonado</td><td class="metodo">ASTM D4833</td><td class="val">' + t1.elong_menor_50.punzonado + ' N</td><td class="val">' + t1.elong_mayor_50.punzonado + ' N</td></tr>' +
        '</tbody>' +
      '</table>' +
    '</div>' +

    '<div class="m288-card" style="border-left-color:' + s.color + '">' +
      '<div class="m288-head">' +
        '<div class="m288-title">🔬 ' + s.app.tabla.titulo + ' — ' + s.app.tabla.ref + '</div>' +
        '<div class="m288-badge">' + s.app.tabla.clase + '</div>' +
      '</div>' +
      '<div class="m288-sub">' + s.app.tabla.funcion + ' · Aplica: ' + (s.app.tabla.aplica || 'según % pasa Tamiz 200') + '</div>' +
      '<table class="m288-table">' +
        '<thead><tr><th>Propiedad</th><th>Método</th><th>Valor requerido</th></tr></thead>' +
        '<tbody>' + s.requerimientosApp + '</tbody>' +
      '</table>' +
      '<div class="m288-notas">' +
        '<strong>Notas normativas:</strong>' +
        '<ul style="margin-left:16px;margin-top:4px;">' +
          s.app.tabla.notas.map(function(n){return '<li>'+n+'</li>';}).join('') +
        '</ul>' +
      '</div>' +
    '</div>' +

    '<div class="m288-card" style="border-left-color:var(--accent)">' +
      '<div class="m288-head">' +
        '<div class="m288-title">📐 Tabla A1 — Traslapes mínimos según CBR</div>' +
        '<div class="m288-badge">Apéndice A</div>' +
      '</div>' +
      '<table class="m288-table">' +
        '<thead><tr><th>CBR del suelo</th><th>Traslape mínimo</th><th>Observación</th></tr></thead>' +
        '<tbody>' +
          M288.tablaA1.map(function(r){
            const activo = (r.condicion==='CBR > 3' && s.cbr>3) ||
                           (r.condicion.indexOf('1 < CBR') !== -1 && s.cbr>1 && s.cbr<=3) ||
                           (r.condicion.indexOf('0.5 < CBR') !== -1 && s.cbr>0.5 && s.cbr<=1) ||
                           (r.condicion.indexOf('CBR < 0.5') !== -1 && s.cbr<=0.5);
            return '<tr style="' + (activo?'background:rgba(59,130,246,0.08);':'') + '">' +
              '<td class="prop">' + r.condicion + '</td>' +
              '<td class="val">' + r.traslape + '</td>' +
              '<td class="metodo">' + r.nota + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>' +

    '<div class="m288-card" style="border-left-color:var(--purple)">' +
      '<div class="m288-head">' +
        '<div class="m288-title">📚 Otras aplicaciones M288-00</div>' +
        '<div class="m288-badge">Referencia</div>' +
      '</div>' +
      '<div class="tabs-m288">' +
        '<button class="tab-m288 active" onclick="showTabM288(this,\'t2\')">Tabla 2 · Drenaje</button>' +
        '<button class="tab-m288" onclick="showTabM288(this,\'t5\')">Tabla 5 · Erosión</button>' +
        '<button class="tab-m288" onclick="showTabM288(this,\'t6\')">Tabla 6 · Sedimentos</button>' +
        '<button class="tab-m288" onclick="showTabM288(this,\'t7\')">Tabla 7 · Pavimentación</button>' +
      '</div>' +
      '<div id="tab-m288-content">' + tabM288HTML('t2') + '</div>' +
    '</div>';
}

function showTabM288(btn,id){
  document.querySelectorAll('.tab-m288').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  document.getElementById('tab-m288-content').innerHTML = tabM288HTML(id);
}

function tabM288HTML(id){
  if(id==='t2'){
    const t=M288.tabla2;
    return '<div class="m288-sub">' + t.ref + ' · ' + t.funcion + '</div>' +
      '<table class="m288-table"><thead><tr><th>% pasa Tamiz 200</th><th>Permitividad (s⁻¹)</th><th>TAA (mm)</th><th>Clase</th></tr></thead>' +
      '<tbody>' + Object.keys(t.requerimientos).map(function(k){
        const v=t.requerimientos[k];
        return '<tr><td class="prop">'+k+'</td><td class="val">'+v.permitividad+'</td><td class="val">'+v.TAA+'</td><td class="metodo">'+t.clase+'</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="m288-notas"><strong>UV:</strong> ' + t.UV + '</div>';
  }
  if(id==='t5'){
    const t=M288.tabla5;
    return '<div class="m288-sub">' + t.ref + ' · ' + t.funcion + '</div>' +
      '<table class="m288-table"><thead><tr><th>Categoría</th><th>Permitividad (s⁻¹)</th><th>TAA (mm)</th><th>Clase</th></tr></thead>' +
      '<tbody>' + Object.keys(t.requerimientos).map(function(k){
        const v=t.requerimientos[k];
        return '<tr><td class="prop">'+k+'</td><td class="val">'+v.permitividad+'</td><td class="val">'+v.TAA+'</td><td class="metodo">'+v.clase+'</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="m288-notas"><strong>UV:</strong> ' + t.UV + '</div>';
  }
  if(id==='t6'){
    const t=M288.tabla6;
    return '<div class="m288-sub">' + t.ref + ' · ' + t.funcion + '</div>' +
      '<table class="m288-table"><thead><tr><th>Configuración</th><th>Grab MD (N)</th><th>Grab XD (N)</th><th>Perm. (s⁻¹)</th><th>TAA (mm)</th><th>Postes</th><th>UV</th></tr></thead>' +
      '<tbody>' + Object.keys(t.requerimientos).map(function(k){
        const v=t.requerimientos[k];
        return '<tr><td class="prop">'+k+'</td><td class="val">'+v.grab_MD+'</td><td class="val">'+v.grab_XD+'</td><td class="val">'+v.permitividad+'</td><td class="val">'+v.TAA+'</td><td class="metodo">'+v.postes+'</td><td class="metodo">'+v.UV+'</td></tr>';
      }).join('') + '</tbody></table>';
  }
  if(id==='t7'){
    const t=M288.tabla7;
    return '<div class="m288-sub">' + t.ref + ' · ' + t.funcion + '</div>' +
      '<table class="m288-table"><thead><tr><th>Propiedad</th><th>Método</th><th>Unidad</th><th>Valor</th></tr></thead>' +
      '<tbody>' + t.requerimientos.map(function(r){
        return '<tr><td class="prop">'+r.prop+'</td><td class="metodo">'+r.metodo+'</td><td class="metodo">'+r.unidad+'</td><td class="val">'+r.valor+'</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="m288-notas"><strong>Notas:</strong><ul style="margin-left:16px;">' + t.notas.map(function(n){return '<li>'+n+'</li>';}).join('') + '</ul></div>';
  }
  return '';
}

/* ================================================================
   RENDER PANEL QUÍMICA
================================================================ */
function renderQuimica(){
  const cont=document.getElementById('quimica-content');
  if(!calculado){
    cont.innerHTML='<div style="padding:20px;color:var(--text3);font-family:var(--mono);font-size:12px;text-align:center;background:var(--bg3);border-radius:8px;border:1px dashed var(--border2);">' +
      'Primero presione <strong style="color:var(--accent2)">Calcular</strong> para obtener el diseño de estabilización química.' +
    '</div>';
    return;
  }

  const s = obtenerSugerencia();
  const q = obtenerEstabilizacionQuimica(s.cbr);

  cont.innerHTML =
    '<div class="m288-card" style="border-left-color:' + q.color + '">' +
      '<div class="m288-head">' +
        '<div class="m288-title">' + q.emoji + ' ' + q.tratamiento + '</div>' +
        '<div class="m288-badge">AASHTO M216 / M85 / T220</div>' +
      '</div>' +
      '<div class="m288-sub">Clasificación AASHTO estimada: <strong>' + q.clasificacion + '</strong> · IP ≈ ' + q.ipEstimado + '% · Pasa N° 200 ≈ ' + q.pasa200Estimado + '% · CBR ≈ ' + s.cbr.toFixed(2) + '</div>' +
      '<div class="m288-grid-info">' +
        '<div class="m288-info-box"><div class="k">Tratamiento</div><div class="v">' + q.tratamiento + '</div></div>' +
        '<div class="m288-info-box"><div class="k">Dosificación</div><div class="v hl">' + q.dosificacion + '</div></div>' +
        '<div class="m288-info-box"><div class="k">Resistencia mín.</div><div class="v">' + q.resistencia + '</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="m288-card" style="border-left-color:var(--accent)">' +
      '<div class="m288-head">' +
        '<div class="m288-title">📋 Clasificación AASHTO del suelo (' + q.clasificacion + ')</div>' +
        '<div class="m288-badge">AASHTO T 88 / T 90</div>' +
      '</div>' +
      '<table class="m288-table">' +
        '<thead><tr><th>Parámetro</th><th>Valor</th></tr></thead>' +
        '<tbody>' +
          '<tr><td class="prop">Clasificación AASHTO</td><td class="val">' + q.clasificacion + '</td></tr>' +
          '<tr><td class="prop">Descripción</td><td class="val">' + q.suelo.descripcion + '</td></tr>' +
          '<tr><td class="prop">Índice plástico (IP)</td><td class="val">' + q.suelo.IP + ' (estimado: ' + q.ipEstimado + '%)</td></tr>' +
          '<tr><td class="prop">% pasa Tamiz N° 200</td><td class="val">' + q.suelo.pasa200 + ' (estimado: ' + q.pasa200Estimado + '%)</td></tr>' +
          '<tr><td class="prop">Dosificación con cal</td><td class="val">' + q.suelo.cal + '</td></tr>' +
          '<tr><td class="prop">Dosificación con cemento</td><td class="val">' + q.suelo.cemento + '</td></tr>' +
          '<tr><td class="prop">Materia orgánica máx.</td><td class="val">' + q.suelo.materiaOrganica + '</td></tr>' +
        '</tbody>' +
      '</table>' +
    '</div>' +

    (q.ensayos.length > 0 ?
    '<div class="m288-card" style="border-left-color:var(--purple)">' +
      '<div class="m288-head">' +
        '<div class="m288-title">🔬 Ensayos requeridos para diseño de mezcla</div>' +
        '<div class="m288-badge">Laboratorio</div>' +
      '</div>' +
      '<table class="m288-table">' +
        '<thead><tr><th>Ensayo</th><th>Norma AASHTO/ASTM</th><th>Propósito</th></tr></thead>' +
        '<tbody>' +
          q.ensayos.map(function(e){
            return '<tr><td class="prop">'+e.ensayo+'</td><td class="metodo">'+e.norma+'</td><td class="val">'+e.proposito+'</td></tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>' : '') +

    '<div class="m288-card" style="border-left-color:' + q.color + '">' +
      '<div class="m288-head">' +
        '<div class="m288-title">📝 Notas normativas de construcción</div>' +
        '<div class="m288-badge">AASHTO M216 / M85</div>' +
      '</div>' +
      '<ul style="margin-left:18px;font-size:11px;color:var(--text2);line-height:1.8;">' +
        q.notas.map(function(n){return '<li>'+n+'</li>';}).join('') +
      '</ul>' +
    '</div>';
}

/* ================================================================
   UTILIDADES
================================================================ */
function setStatus(msg,cls){
  const el=document.getElementById('status-txt');
  el.innerHTML=cls?'<span class="'+cls+'">'+msg+'</span>':msg;
}

function setTipo(t){
  tipo=t;calculado=false;
  document.getElementById('btn-flex').classList.toggle('active',t==='flexible');
  document.getElementById('btn-rig').classList.toggle('active',t==='rigido');
  document.getElementById('hdr-tipo').textContent=t.toUpperCase();
  setStatus('Modo cambiado a: '+t.toUpperCase(),'info');
  const pp=document.getElementById('params-panel');
  if(pp.style.display==='block')renderParams();
  document.getElementById('results-panel').style.display='none';
  document.getElementById('juntas-panel').style.display='none';
  document.getElementById('m288-panel').style.display='none';
  document.getElementById('quimica-panel').style.display='none';
}

function setMetodo(m){
  metodo=m;
  document.getElementById('metodo-esal').classList.toggle('active',m==='esal');
  document.getElementById('metodo-transito').classList.toggle('active',m==='transito');
  document.getElementById('transito-params').style.display=(m==='transito')?'block':'none';
  renderParams();
  setStatus('Método: '+(m==='esal'?'ESAL (W18)':'Tránsito → ESAL'),'info');
}

function togglePanel(id){
  const el=document.getElementById(id);
  const open=el.style.display==='block';
  el.style.display=open?'none':'block';
  if(!open && id==='params-panel') renderParams();
  if(!open && id==='results-panel'){
    if(!calculado){setStatus('Primero presione Calcular.','err');el.style.display='none';return;}
    renderResults();
  }
  if(!open && id==='juntas-panel'){
    if(tipo!=='rigido'){setStatus('Juntas y acero solo aplica al pavimento Rígido.','err');el.style.display='none';return;}
    if(!calculado){setStatus('Primero presione Calcular.','err');el.style.display='none';return;}
    renderJuntas();
  }
  if(!open && id==='m288-panel') renderM288();
  if(!open && id==='quimica-panel') renderQuimica();
}

function entrarApp(){
  document.getElementById('portada').classList.add('hidden');
  document.getElementById('app').style.display='block';
  drawScene();
}

/* ================================================================
   CÁLCULO DE ESAL DESDE TRÁNSITO
================================================================ */
function calcularESALdesdeTransito(){
  const t=transito.factorCrec,n=transito.anios;
  const factorCrec=t>0?((Math.pow(1+t,n)-1)/t):n;
  const totalComerciales=Object.keys(vehiculos).reduce(function(a,k){return a+vehiculos[k];},0);
  return Math.round(totalComerciales*365*transito.factorCamion*transito.factorEjes*transito.carril*factorCrec);
}

/* ================================================================
   RENDER PARÁMETROS
================================================================ */
function renderParams(){
  const grid=document.getElementById('params-grid'),fbox=document.getElementById('formula-box');
  document.getElementById('params-title').textContent='Parámetros – '+tipo;
  let fields=[];
  const mostrarW18=(metodo==='esal');

  if(tipo==='flexible'){
    fields=[
      {k:'W18',label:'W18 — Ejes equivalentes (ESAL)',val:pf.W18,cb:function(v){pf.W18=v;},hidden:!mostrarW18},
      {k:'R',label:'R — Confiabilidad (%)',val:pf.R,cb:function(v){pf.R=v;}},
      {k:'So',label:'So — Desviación estándar combinada',val:pf.So,cb:function(v){pf.So=v;}},
      {k:'dPSI',label:'ΔPSI — Pérdida de serviciabilidad',val:pf.deltaPSI,cb:function(v){pf.deltaPSI=v;}},
      {k:'Mr',label:'Mr — Módulo resiliente subrasante (MPa)',val:pf.Mr,cb:function(v){pf.Mr=v;}},
      {k:'a1',label:'a₁ — Coef. capa 1 (AC)',val:pf.capas[0].a,cb:function(v){pf.capas[0].a=v;}},
      {k:'a2',label:'a₂ — Coef. capa 2 (base)',val:pf.capas[1].a,cb:function(v){pf.capas[1].a=v;}},
      {k:'a3',label:'a₃ — Coef. capa 3 (subbase)',val:pf.capas[2].a,cb:function(v){pf.capas[2].a=v;}},
      {k:'m1',label:'m₁ — Coef. drenaje capa 1',val:pf.capas[0].m,cb:function(v){pf.capas[0].m=v;}},
      {k:'m2',label:'m₂ — Coef. drenaje capa 2',val:pf.capas[1].m,cb:function(v){pf.capas[1].m=v;}},
      {k:'m3',label:'m₃ — Coef. drenaje capa 3',val:pf.capas[2].m,cb:function(v){pf.capas[2].m=v;}}
    ];
    fbox.innerHTML='<h4>Ecuación AASHTO-93 — Pavimento Flexible</h4>' +
      '<p>log(W18) = ZR·So + 9.36·log(SN+1) − 0.20 + log(ΔPSI/2.7) / [0.40 + 1094/(SN+1)⁵·¹⁹] + 2.32·log(Mr) − 8.07</p>';
  } else {
    fields=[
      {k:'W18',label:'W18 — Ejes equivalentes (ESAL)',val:pr.W18,cb:function(v){pr.W18=v;},hidden:!mostrarW18},
      {k:'R',label:'R — Confiabilidad (%)',val:pr.R,cb:function(v){pr.R=v;}},
      {k:'So',label:'So — Desviación estándar combinada',val:pr.So,cb:function(v){pr.So=v;}},
      {k:'dPSI',label:'ΔPSI — Pérdida de serviciabilidad',val:pr.deltaPSI,cb:function(v){pr.deltaPSI=v;}},
      {k:'Ec',label:'Ec — Módulo elástico concreto (MPa)',val:pr.Ec,cb:function(v){pr.Ec=v;}},
      {k:'Sc',label:'Sc — Módulo de rotura (MPa)',val:pr.Sc,cb:function(v){pr.Sc=v;}},
      {k:'k',label:'k — Reacción de subrasante (MN/m³)',val:pr.k,cb:function(v){pr.k=v;}},
      {k:'J',label:'J — Coef. transferencia de carga',val:pr.J,cb:function(v){pr.J=v;}},
      {k:'Cd',label:'Cd — Coef. drenaje',val:pr.Cd,cb:function(v){pr.Cd=v;}},
      {k:'bCarril',label:'B — Ancho de carril (m)',val:pr.bCarril,cb:function(v){pr.bCarril=v;}},
      {k:'nCarriles',label:'N — Número de carriles (juntas long. = N−1)',val:pr.nCarriles,cb:function(v){pr.nCarriles=Math.max(2,Math.round(v));}},
      {k:'Ltramo',label:'L — Tramo entre juntas (m) · 0 = automático',val:pr.Ltramo,cb:function(v){pr.Ltramo=v;}},
      {k:'sDow',label:'Separación pasadores (mm) · 0 = 300',val:pr.sDow,cb:function(v){pr.sDow=v;}},
      {k:'fyAcero',label:'fy — Acero de amarre (MPa)',val:pr.fyAcero,cb:function(v){pr.fyAcero=v;}},
      {k:'fa',label:'fa — Fricción losa–base (amarres)',val:pr.fa,cb:function(v){pr.fa=v;}}
    ];
    fbox.innerHTML='<h4>Ecuación AASHTO-93 — Pavimento Rígido</h4>' +
      '<p>log(W18) = ZR·So + 7.35·log(D+1) − 0.06 + log(ΔPSI/3.0) / [1 + 1.624×10⁷/(D+1)⁸·⁴⁶] + (4.22 − 0.32·pt)·log[ Sc·Cd·(D⁰·⁷⁵−1.132) / (215.63·J·(D⁰·⁷⁵ − 18.42/(Ec/k)⁰·²⁵)) ]</p>';
  }

  grid.innerHTML='';
  fields.forEach(function(f){
    if(f.hidden){
      const d=document.createElement('div');d.className='param-row';d.style.display='none';
      d.innerHTML='<label>'+f.label+'</label><input type="number" value="'+f.val+'" step="any">';
      grid.appendChild(d);
      d.querySelector('input').addEventListener('change',function(e){const v=parseFloat(e.target.value);if(!isNaN(v))f.cb(v);});
      return;
    }
    const d=document.createElement('div');d.className='param-row';
    d.innerHTML='<label>'+f.label+'</label><input type="number" value="'+f.val+'" step="any">';
    grid.appendChild(d);
    d.querySelector('input').addEventListener('change',function(e){const v=parseFloat(e.target.value);if(!isNaN(v))f.cb(v);});
  });
  if(tipo==='rigido'){
    fbox.innerHTML+='<p style="margin-top:8px;">Juntas: L ≤ mín(24·D ; 4.5 m ; 1.25·B) · Pasadores Ø ≈ D/8, L = 450 mm @ 300 mm · Barras de amarre: As = 1000·fa·γc·D·b / fs, fs = 0.67·fy</p>';
  }
  renderTransitoParams();
  renderVehiculosGrid();
}

function renderTransitoParams(){
  const grid=document.getElementById('transito-grid');
  const fields=[
    {k:'factorCamion',label:'% de camiones (ponderado)',val:transito.factorCamion*100,cb:function(v){transito.factorCamion=v/100;}},
    {k:'factorCrec',label:'Tasa crecimiento anual (%)',val:transito.factorCrec*100,cb:function(v){transito.factorCrec=v/100;}},
    {k:'anios',label:'Período de diseño (años)',val:transito.anios,cb:function(v){transito.anios=v;}},
    {k:'factorEjes',label:'Factor de ejes equivalentes',val:transito.factorEjes,cb:function(v){transito.factorEjes=v;}},
    {k:'carril',label:'Factor distribución por carril',val:transito.carril,cb:function(v){transito.carril=v;}}
  ];
  grid.innerHTML='';
  fields.forEach(function(f){
    const d=document.createElement('div');d.className='param-row';
    d.innerHTML='<label>'+f.label+'</label><input type="number" value="'+f.val+'" step="any">';
    grid.appendChild(d);
    d.querySelector('input').addEventListener('change',function(e){const v=parseFloat(e.target.value);if(!isNaN(v))f.cb(v);});
  });
}

function renderVehiculosGrid(){
  const grid=document.getElementById('vehiculos-grid');
  const tipos=[{k:'bus',label:'Bus'},{k:'c2',label:'C2'},{k:'c3',label:'C3'},{k:'c4',label:'C4'},{k:'c5',label:'C5'},{k:'c6',label:'C6'}];
  grid.innerHTML='';
  tipos.forEach(function(t){
    const d=document.createElement('div');d.className='param-row';
    d.innerHTML='<label>'+t.label+'</label><input type="number" value="'+vehiculos[t.k]+'" step="1" min="0">';
    grid.appendChild(d);
    d.querySelector('input').addEventListener('change',function(e){vehiculos[t.k]=parseInt(e.target.value)||0;actualizarTotalVehiculos();});
  });
  actualizarTotalVehiculos();
}

function actualizarTotalVehiculos(){
  const total=Object.keys(vehiculos).reduce(function(a,k){return a+vehiculos[k];},0);
  document.getElementById('total-vehiculos').textContent='Total vehículos comerciales: '+total;
}

function getZR(R){
  const map={50:0,75:-0.674,80:-0.842,85:-1.036,90:-1.282,91:-1.340,92:-1.405,93:-1.476,94:-1.555,95:-1.645,96:-1.751,97:-1.881,98:-2.054,99:-2.326,99.9:-3.090};
  const keys=Object.keys(map).map(Number).sort(function(a,b){return a-b;});
  for(let i=keys.length-1;i>=0;i--){if(R>=keys[i])return map[keys[i]];}
  return -1.282;
}

/* ================================================================
   CÁLCULOS PRINCIPALES
================================================================ */
function calcular(){
  if(metodo==='transito'){
    const esal=calcularESALdesdeTransito();
    if(tipo==='flexible')pf.W18=esal; else pr.W18=esal;
    setStatus('ESAL calculado desde tránsito: '+esal.toExponential(2),'info');
  }
  if(tipo==='flexible')calcularFlexible();
  else calcularRigido();
  calculado=true;
  if(document.getElementById('results-panel').style.display==='block')renderResults();
  if(document.getElementById('m288-panel').style.display==='block')renderM288();
  if(document.getElementById('quimica-panel').style.display==='block')renderQuimica();
  if(document.getElementById('juntas-panel').style.display==='block'){
    if(tipo==='rigido')renderJuntas(); else document.getElementById('juntas-panel').style.display='none';
  }
  setStatus('✅ Cálculo completado.','ok');
}

function calcularFlexible(){
  const ZR=getZR(pf.R);
  const logW18=Math.log10(pf.W18);
  const logMr=Math.log10(pf.Mr*145.038);
  let SN=4.0;
  for(let i=0;i<500;i++){
    const rhs=ZR*pf.So+9.36*Math.log10(SN+1)-0.20+Math.log10(pf.deltaPSI/2.7)/(0.40+1094/Math.pow(SN+1,5.19))+2.32*logMr-8.07;
    const err=rhs-logW18;
    if(Math.abs(err)<0.0005)break;
    SN-=err*0.35;
    if(SN<0.5)SN=0.5;
  }
  pf.SN_req=Math.max(1.0,parseFloat(SN.toFixed(3)));
  const a1=pf.capas[0].a,a2=pf.capas[1].a,a3=pf.capas[2].a;
  const m1=pf.capas[0].m,m2=pf.capas[1].m,m3=pf.capas[2].m;
  const D1_in=Math.ceil((pf.SN_req*0.45)/(a1*m1)*10)/10;
  const D1_mm=Math.max(50,Math.ceil(D1_in*25.4/5)*5);
  const SN1=a1*m1*(D1_mm/25.4);
  const SN_rem1=Math.max(0,pf.SN_req-SN1);
  const D2_in=SN_rem1>0?Math.ceil(SN_rem1/(a2*m2)*10)/10:0;
  const D2_mm=Math.max(100,Math.ceil(D2_in*25.4/5)*5);
  const SN2=a2*m2*(D2_mm/25.4);
  const SN_rem2=Math.max(0,pf.SN_req-SN1-SN2);
  const D3_in=SN_rem2>0?Math.ceil(SN_rem2/(a3*m3)*10)/10:0;
  const D3_mm=Math.max(100,Math.ceil(D3_in*25.4/5)*5);
  pf.capas[0].D=D1_mm;pf.capas[1].D=D2_mm;pf.capas[2].D=D3_mm;
  pf.SN_prov=parseFloat((a1*m1*(D1_mm/25.4)+a2*m2*(D2_mm/25.4)+a3*m3*(D3_mm/25.4)).toFixed(3));
}

function calcularRigido(){
  const ZR=getZR(pr.R);
  const logW18=Math.log10(pr.W18);
  const Sc_psi=pr.Sc*145.038,Ec_psi=pr.Ec*145.038,k_pci=pr.k*3.6839;
  let D=9.0;
  for(let i=0;i<500;i++){
    const PSI_term=Math.log10(pr.deltaPSI/(4.5-1.5));
    const denom1=1+1.624e7/Math.pow(D+1,8.46);
    const inner=Sc_psi*pr.Cd*(Math.pow(D,0.75)-1.132)/(215.63*pr.J*(Math.pow(D,0.75)-18.42/Math.pow(Ec_psi/k_pci,0.25)));
    if(inner<=0){D+=0.5;continue;}
    const rhs=ZR*pr.So+7.35*Math.log10(D+1)-0.06+PSI_term/denom1+(4.22-0.32*pr.pt)*Math.log10(inner);
    const err=rhs-logW18;
    if(Math.abs(err)<0.0005)break;
    D-=err*0.3;
    if(D<4)D=4;
  }
  pr.D_losa=Math.max(100,Math.ceil(D*25.4/5)*5);
  pr.D_base=150;
  calcularJuntas();
}

/* ================================================================
   JUNTAS, PASADORES (DÓVELAS) Y BARRAS DE AMARRE — PAVIMENTO RÍGIDO
   Predimensionamiento (AASHTO-93 / PCA / ACPA). Verificar con la
   especificación del proyecto (p. ej. INVÍAS Art. 500).
================================================================ */
const BARRAS_AMARRE=[
  {d:12.7,txt:'#4 (1/2")'},{d:15.9,txt:'#5 (5/8")'},
  {d:19.1,txt:'#6 (3/4")'},{d:25.4,txt:'#8 (1")'}
];
function pasadorPorEspesor(D){
  if(D<=175)return {d:19.1,txt:'3/4"'};
  if(D<=200)return {d:25.4,txt:'1"'};
  if(D<=250)return {d:31.8,txt:'1-1/4"'};
  if(D<=300)return {d:38.1,txt:'1-1/2"'};
  return {d:44.5,txt:'1-3/4"'};
}

function calcularJuntas(){
  const RHO=7850,GAMMA_C=23.5;
  const D=pr.D_losa;
  const B=(pr.bCarril>0)?pr.bCarril:3.65;
  const N=Math.max(2,Math.round(pr.nCarriles||2));
  const fy=(pr.fyAcero>0)?pr.fyAcero:420;
  const fa=(pr.fa>0)?pr.fa:1.5;
  const avisos=[];

  /* ---- tramos (separación entre juntas transversales) ---- */
  const Lmax=Math.min(24*D/1000,4.5,1.25*B);
  const Lauto=Math.max(1.5,Math.floor(Lmax/0.25)*0.25);
  const manual=pr.Ltramo>0;
  const L=manual?pr.Ltramo:Lauto;
  if(L>Lmax+1e-6)avisos.push('El tramo L = '+L.toFixed(2)+' m supera el máximo recomendado ('+Lmax.toFixed(2)+' m): riesgo de fisuración transversal intermedia.');
  if(L/B>1.25+1e-6)avisos.push('Relación L/B = '+(L/B).toFixed(2)+' > 1.25: losas alargadas, mayor riesgo de fisuras.');

  /* ---- pasadores (dóvelas) ---- */
  const pd=pasadorPorEspesor(D);
  const Ld=(pd.d<=32)?450:500;
  const sdManual=pr.sDow>0;
  const sd=sdManual?pr.sDow:300;
  const edgeMin=150;
  let nd=Math.floor((B*1000-2*edgeMin)/sd)+1;if(nd<2)nd=2;
  const margenD=(B*1000-(nd-1)*sd)/2;
  const mDow=Math.PI/4*Math.pow(pd.d/1000,2)*(Ld/1000)*RHO;
  if(sd>400)avisos.push('Separación de pasadores > 400 mm: se reduce la eficiencia de transferencia de carga.');

  /* ---- barras de amarre (juntas longitudinales) ---- */
  const W=GAMMA_C*D/1000;                 /* kPa */
  const b=Math.floor(N/2)*B;              /* m al borde libre */
  const fs=0.67*fy;                       /* MPa */
  const AsReq=1000*fa*W*b/fs;             /* mm2/m */
  let barra=BARRAS_AMARRE[BARRAS_AMARRE.length-1],sDes=0.10;
  for(let i=0;i<BARRAS_AMARRE.length;i++){
    const A=Math.PI/4*Math.pow(BARRAS_AMARRE[i].d,2);
    const s=Math.min(0.75,Math.floor(A/AsReq*1000/25)*25/1000);
    if(s>=0.45||i===BARRAS_AMARRE.length-1){barra=BARRAS_AMARRE[i];sDes=Math.max(0.10,s);break;}
  }
  const Abar=Math.PI/4*barra.d*barra.d;
  const mu=2.4;
  const Lt=Math.ceil((fs*barra.d/(2*mu)+75)/50)*50;
  const kt=Math.max(2,Math.ceil(L/sDes));
  const st=L/kt;
  const primera=st/2;
  const AsProv=Abar/st;
  const mTie=Abar/1e6*(Lt/1000)*RHO;
  if(primera*1000<300)avisos.push('La primera barra de amarre queda a '+(primera*1000).toFixed(0)+' mm de la junta transversal (< 300 mm): revisar separación.');
  if(sDes<0.45)avisos.push('Acero de amarre muy exigente (separación < 450 mm): considere mayor diámetro, menos carriles tied o menor fa.');

  /* ---- cantidades por km ---- */
  const juntasKm=1000/L;
  const dowKm=juntasKm*nd*N;
  const tieKm=(N-1)*kt*juntasKm;
  pr.jn={D:D,B:B,N:N,fy:fy,fa:fa,L:L,Lmax:Lmax,Lauto:Lauto,manual:manual,LB:L/B,
    pd:pd,Ld:Ld,sd:sd,sdManual:sdManual,nd:nd,margenD:margenD,mDow:mDow,
    W:W,b:b,fs:fs,AsReq:AsReq,barra:barra,Abar:Abar,Lt:Lt,kt:kt,st:st,primera:primera,
    AsProv:AsProv,mTie:mTie,juntasKm:juntasKm,dowKm:dowKm,tieKm:tieKm,
    dowKg:dowKm*mDow,tieKg:tieKm*mTie,avisos:avisos};
}

function jnFilas(){
  const j=pr.jn;
  const G1='TRAMOS Y JUNTAS TRANSVERSALES',G2='PASADORES (DÓVELAS) — acero liso',
        G3='BARRAS DE AMARRE — acero corrugado',G4='CANTIDADES (por km, '+j.N+' carriles)';
  return [
    [G1,'Espaciamiento entre juntas (tramo) L',j.L.toFixed(2)+' m'+(j.manual?' (manual)':' (automático)'),'L máx = mín(24·D ; 4.5 m ; 1.25·B) = '+j.Lmax.toFixed(2)+' m'],
    [G1,'Relación L/B',j.LB.toFixed(2),'≤ 1.25 (losa casi cuadrada)'],
    [G1,'Aserrado de la junta','prof. D/4 = '+Math.round(j.D/4)+' mm · ancho 3–6 mm','D/3 = '+Math.round(j.D/3)+' mm si la base es estabilizada; luego sellar'],
    [G2,'Diámetro','Ø '+j.pd.d+' mm ('+j.pd.txt+')','Ø ≈ D/8 (tabla por espesor de losa)'],
    [G2,'Longitud',j.Ld+' mm','≈ '+(j.Ld/2)+' mm embebidos a cada lado de la junta'],
    [G2,'Separación centro a centro',j.sd+' mm',j.sdManual?'Definida por el usuario':'Práctica usual: 300 mm'],
    [G2,'Pasadores por carril y por junta',String(j.nd),'n = ⌊(B − 2·150 mm) / s⌋ + 1'],
    [G2,'Margen al borde del carril',j.margenD.toFixed(0)+' mm','≥ 150 mm; distribución simétrica'],
    [G2,'Posición vertical','D/2 = '+(j.D/2).toFixed(0)+' mm','Paralelos al eje de la vía y a la superficie'],
    [G2,'Tratamiento','Mitad engrasada / pintada (libre)','Permite el movimiento horizontal de la junta'],
    [G2,'Masa por pasador',j.mDow.toFixed(2)+' kg','ρ acero = 7850 kg/m³'],
    [G3,'Datos de cálculo','b = '+j.b.toFixed(2)+' m · fa = '+j.fa+' · W = '+j.W.toFixed(2)+' kPa · fs = 0.67·'+j.fy+' = '+j.fs.toFixed(0)+' MPa','b: distancia de la junta al borde libre; W = γc·D (γc = 23.5 kN/m³)'],
    [G3,'As requerida',j.AsReq.toFixed(0)+' mm²/m','As = 1000·fa·W·b / fs'],
    [G3,'Barra','Ø '+j.barra.d+' mm '+j.barra.txt,'Menor diámetro con separación ≥ 450 mm'],
    [G3,'Separación centro a centro',(j.st*1000).toFixed(0)+' mm','Máx. 750 mm; ajustada para repartir tramos completos'],
    [G3,'Barras por tramo (por junta longitudinal)',String(j.kt),'k = ⌈L / s⌉'],
    [G3,'Primera barra desde la junta transversal',(j.primera*1000).toFixed(0)+' mm','≥ 300 mm (no interferir con los pasadores)'],
    [G3,'Longitud',j.Lt+' mm','Lt = fs·d / (2μ) + 75 mm, μ = 2.4 MPa; redondeo a 50 mm'],
    [G3,'As provista',j.AsProv.toFixed(0)+' mm²/m','≥ As requerida'],
    [G3,'Posición vertical','D/2 = '+(j.D/2).toFixed(0)+' mm','Perpendiculares a la junta longitudinal'],
    [G3,'Masa por barra',j.mTie.toFixed(2)+' kg','ρ acero = 7850 kg/m³'],
    [G4,'Juntas transversales por km',j.juntasKm.toFixed(0),'1000 / L'],
    [G4,'Pasadores',j.dowKm.toFixed(0)+' u · '+j.dowKg.toFixed(0)+' kg','n · N carriles · juntas/km'],
    [G4,'Barras de amarre',j.tieKm.toFixed(0)+' u · '+j.tieKg.toFixed(0)+' kg','(N−1) · k · juntas/km'],
    [G4,'Acero total',(j.dowKg+j.tieKg).toFixed(0)+' kg','']
  ];
}

function jnPosiciones(){
  const j=pr.jn,pd=[],pt=[];
  for(let i=0;i<j.nd;i++)pd.push(Math.round(j.margenD+i*j.sd));
  for(let t=0;t<j.kt;t++)pt.push(Math.round((t+0.5)*j.st*1000));
  return {pd:pd,pt:pt};
}

function jnNotas(){
  return [
    'Pasadores: acero liso, paralelos al eje de la vía y a la superficie; engrasar o pintar una mitad y fijarlos con canastillas (silletas) antes del vaciado.',
    'Barras de amarre: acero corrugado (ASTM A615, NTC 2289 en Colombia) solo en juntas longitudinales; no se doblan en obra ni se usan en juntas transversales.',
    'Aserrar las juntas en el momento oportuno (concreto ya resistente al aserrado, antes de la fisuración por retracción) y sellarlas.',
    'Con pasadores el coeficiente J usual es ≈ 3.2 (berma asfáltica); sin ellos J aumenta de forma importante.',
    'Predimensionamiento: no incluye verificación del esfuerzo de apoyo del pasador ni diseño de juntas de expansión o de construcción. Verifique con la especificación del proyecto (p. ej. INVÍAS Art. 500).'
  ];
}

function jnCards(){
  const j=pr.jn;if(!j)return '';
  return '<div class="res-card"><div class="lbl">Tramo L (juntas)</div><div class="val">'+j.L.toFixed(2)+' m</div><div class="sub">L/B = '+j.LB.toFixed(2)+'</div></div>' +
    '<div class="res-card"><div class="lbl">Pasadores (dóvelas)</div><div class="val" style="font-size:12px;">Ø'+j.pd.d+' × '+j.Ld+' @ '+j.sd+'</div><div class="sub">n = '+j.nd+' por carril</div></div>' +
    '<div class="res-card"><div class="lbl">Barras de amarre</div><div class="val" style="font-size:12px;">Ø'+j.barra.d+' × '+j.Lt+' @ '+(j.st*1000).toFixed(0)+'</div><div class="sub">'+j.kt+' por tramo</div></div>';
}
  /* ---------------- DIAGRAMA (corte longitudinal, corte transversal, planta) ---------------- */
function drawJuntasDiagram(c,Wd,Hd,theme){
  const j=pr.jn;if(!j)return;
  const T=(theme==='light')?{
    bg:'#ffffff',panel:'#f8fafc',panel2:'#ffffff',border:'#cbd5e1',txt:'#0f172a',txt2:'#475569',
    accent:'#1e40af',dim:'#334155',conc:'#cbd5e1',onConc:'#0f172a',edge:'#334155',base:'#d6b980',
    sub:'#a8b58f',notch:'#0f172a',dowel:'#d97706',dowelLube:'#fcd34d',dowelEdge:'#7c2d12',
    tie:'#dc2626',tieDark:'#7f1d1d',joint:'#0369a1',jline:'#334155'
  }:{
    bg:'#0b1220',panel:'#111a2b',panel2:'#0e1626',border:'rgba(255,255,255,0.16)',txt:'#e2e8f0',txt2:'#94a3b8',
    accent:'#60a5fa',dim:'#cbd5e1',conc:'#9aa4b2',onConc:'#0b1220',edge:'#1f2937',base:'#8b6f3a',
    sub:'#4a5a3a',notch:'#0b1220',dowel:'#f59e0b',dowelLube:'#fde68a',dowelEdge:'#78350f',
    tie:'#ef4444',tieDark:'#7f1d1d',joint:'#38bdf8',jline:'#1e293b'
  };
  const MONO='"IBM Plex Mono",Menlo,Consolas,"Courier New",monospace';
  c.save();
  c.fillStyle=T.bg;c.fillRect(0,0,Wd,Hd);
  c.textBaseline='middle';

  function txt(s,x,y,col,sz,al,b){c.fillStyle=col||T.txt;c.font=(b?'bold ':'')+(sz||11)+'px '+MONO;c.textAlign=al||'left';c.fillText(s,x,y);}
  function line(x1,y1,x2,y2,col,lw,dash){c.strokeStyle=col;c.lineWidth=lw||1;c.setLineDash(dash||[]);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);}
  function rect(x,y,w,h,fill,stroke,lw){if(fill){c.fillStyle=fill;c.fillRect(x,y,w,h);}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||1;c.setLineDash([]);c.strokeRect(x,y,w,h);}}
  function panel(x,y,w,h,title){rect(x,y,w,h,T.panel,T.border,1);txt(title,x+10,y+14,T.accent,11,'left',true);}
  function head(x,y,ang,col){const s=5;c.fillStyle=col;c.beginPath();c.moveTo(x,y);
    c.lineTo(x-s*Math.cos(ang-0.4),y-s*Math.sin(ang-0.4));c.lineTo(x-s*Math.cos(ang+0.4),y-s*Math.sin(ang+0.4));c.closePath();c.fill();}
  function dimH(x1,x2,y,label,col,below){col=col||T.dim;line(x1,y,x2,y,col,1);head(x1,y,Math.PI,col);head(x2,y,0,col);
    line(x1,y-5,x1,y+5,col,1);line(x2,y-5,x2,y+5,col,1);if(label)txt(label,(x1+x2)/2,y+(below?11:-8),col,10,'center');}
  function dimV(x,y1,y2,label,col,left){col=col||T.dim;line(x,y1,x,y2,col,1);head(x,y1,-Math.PI/2,col);head(x,y2,Math.PI/2,col);
    line(x-5,y1,x+5,y1,col,1);line(x-5,y2,x+5,y2,col,1);
    if(label){c.save();c.translate(x+(left?-9:9),(y1+y2)/2);c.rotate(-Math.PI/2);txt(label,0,0,col,10,'center');c.restore();}}
  function hatch(x,y,w,h,col,gap){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    for(let i=-h;i<w;i+=gap)line(x+i,y+h,x+i+h,y,col,1);c.restore();}

  /* ---- título ---- */
  txt('DETALLE DE JUNTAS Y ACERO — PAVIMENTO RÍGIDO',14,18,T.txt,14,'left',true);
  txt('D = '+j.D+' mm · B = '+j.B.toFixed(2)+' m · L = '+j.L.toFixed(2)+' m · '+j.N+' carriles',Wd-14,18,T.txt2,11,'right');

  /* ---- franja general de un corte ---- */
  function franja(sL,sR,tY){
    const dS=26,bS=14,gS=12;
    rect(sL,tY,sR-sL,dS,T.conc,null);
    rect(sL,tY+dS,sR-sL,bS,T.base,null);
    rect(sL,tY+dS+bS,sR-sL,gS,T.sub,null);
    hatch(sL,tY+dS+bS,sR-sL,gS,'rgba(0,0,0,0.25)',6);
    rect(sL,tY,sR-sL,dS+bS+gS,null,T.edge,1);
    txt('losa',sL+4,tY+dS/2,T.onConc,9,'left');
    txt('base',sL+4,tY+dS+bS/2,T.onConc,9,'left');
    txt('subrasante',sL+4,tY+dS+bS+gS/2,T.txt,9,'left');
    return {dS:dS,bS:bS,gS:gS};
  }
  /* ---- detalle a escala de una junta con una barra a mitad de espesor ---- */
  function detalle(fx,fy,fw,fh,titulo,barLen,barD,barCol,corrug,lbl1,lbl2,lblJunta,dimLabel,lubricada){
    rect(fx,fy,fw,fh,T.panel2,T.border,1);
    txt(titulo,fx+8,fy+12,T.joint,10,'left',true);
    const slabL=fx+56,slabR=fx+fw-48,icx=(slabL+slabR)/2;
    const kd=Math.min(0.4,80/j.D,(slabR-slabL-30)/barLen);
    const Dd=j.D*kd,iTop=fy+34,nd=Dd/4,yM=iTop+Dd/2;
    const Lp=barLen*kd,dp=Math.max(4,barD*kd);
    rect(slabL,iTop,slabR-slabL,Dd,T.conc,T.edge,1);
    rect(icx-4,iTop,8,nd,T.notch,null);
    line(icx,iTop+nd,icx,iTop+Dd,T.edge,1.2,[3,2]);
    txt(lblJunta,icx,iTop-7,T.txt2,9,'center');
    if(lubricada){
      rect(icx-Lp/2,yM-dp/2,Lp/2,dp,T.dowelLube,T.dowelEdge,1);
      rect(icx,yM-dp/2,Lp/2,dp,barCol,T.dowelEdge,1);
      txt('engrasada',icx-Lp/4,yM-dp/2-8,T.onConc,9,'center');
      txt('empotrada',icx+Lp/4,yM-dp/2-8,T.onConc,9,'center');
    }else{
      rect(icx-Lp/2,yM-dp/2,Lp,dp,barCol,T.tieDark,1);
      if(corrug)for(let x=icx-Lp/2+3;x<icx+Lp/2-1;x+=5)line(x,yM-dp/2,x,yM+dp/2,T.tieDark,1);
      txt('corrugada',icx-Lp/4,yM-dp/2-8,T.onConc,9,'center');
      txt('corrugada',icx+Lp/4,yM-dp/2-8,T.onConc,9,'center');
    }
    function tb(s,y,sz,b){c.font=(b?'bold ':'')+sz+'px '+MONO;const wt=c.measureText(s).width+8;rect(icx-wt/2,y-7,wt,14,T.conc,null);txt(s,icx,y,T.onConc,sz,'center',b);}
    tb(lbl1,yM+dp/2+14,10,true);
    if(Dd>=65)tb(lbl2,yM+dp/2+27,9,false);
    dimV(slabL-18,iTop,iTop+Dd,'D = '+j.D+' mm',T.dim,true);
    dimV(slabR+16,iTop,yM,'D/2 = '+(j.D/2).toFixed(0),T.dim,false);
    dimV(icx+12,iTop,iTop+nd,'',T.onConc,false);
    txt('aserrado D/4 = '+Math.round(j.D/4)+' mm',icx+19,iTop+nd/2,T.onConc,9,'left');
    dimH(icx-Lp/2,icx+Lp/2,iTop+Dd+16,dimLabel,T.dim,true);
  }

  /* ================= VISTA A: corte longitudinal ================= */
  (function(){
    const x0=14,y0=44,w=480,h=292;
    panel(x0,y0,w,h,'A · CORTE A-A LONGITUDINAL — junta transversal con pasadores');
    const sx=Math.min(80,(w-170)/Math.max(j.L,1.5));
    const sL=x0+16,sR=x0+w-16;
    const jL=x0+w/2-j.L*sx/2,jR=jL+j.L*sx,tY=y0+66;
    txt('SENTIDO DEL TRÁNSITO  →',x0+w/2,y0+30,T.txt2,10,'center');
    const f=franja(sL,sR,tY);
    [jL,jR].forEach(function(jx){
      rect(jx-1.5,tY,3,f.dS/4,T.notch,null);
      line(jx,tY+f.dS/4,jx,tY+f.dS,T.edge,1,[2,2]);
      rect(jx-5,tY+f.dS/2-1.5,10,3,T.dowel,null);
    });
    dimH(jL,jR,tY-8,'L = '+j.L.toFixed(2)+' m  (tramo entre juntas)',T.dim,false);
    c.strokeStyle=T.joint;c.lineWidth=1.5;c.beginPath();c.arc(jL,tY+f.dS/2,14,0,Math.PI*2);c.stroke();
    txt('X',jL,tY+f.dS+f.bS+f.gS+12,T.joint,11,'center',true);
    txt('escala vertical exagerada',x0+w-12,tY+f.dS+f.bS+f.gS+12,T.txt2,9,'right');
    detalle(x0+10,y0+138,w-20,h-146,'X · DETALLE DE JUNTA TRANSVERSAL (a escala)',
      j.Ld,j.pd.d,T.dowel,false,
      'Pasador liso Ø'+j.pd.d+' mm × '+j.Ld+' mm','acero liso · mitad engrasada',
      'junta transversal','L = '+j.Ld+' mm',true);
  })();

  /* ================= VISTA B: corte transversal ================= */
  (function(){
    const x0=506,y0=44,w=480,h=292;
    panel(x0,y0,w,h,'B · CORTE B-B TRANSVERSAL — junta longitudinal con barras de amarre');
    const sL=x0+35,sR=x0+w-35,cx=(sL+sR)/2,tY=y0+66;
    txt('CARRIL 1',(sL+cx)/2,y0+30,T.txt2,10,'center');
    txt('CARRIL 2',(cx+sR)/2,y0+30,T.txt2,10,'center');
    const f=franja(sL,sR,tY);
    rect(cx-1.5,tY,3,f.dS/4,T.notch,null);
    line(cx,tY+f.dS/4,cx,tY+f.dS,T.edge,1,[2,2]);
    rect(cx-9,tY+f.dS/2-1.5,18,3,T.tie,null);
    dimH(sL,cx,tY-8,'B = '+j.B.toFixed(2)+' m',T.dim,false);
    dimH(cx,sR,tY-8,'B = '+j.B.toFixed(2)+' m',T.dim,false);
    c.strokeStyle=T.joint;c.lineWidth=1.5;c.beginPath();c.arc(cx,tY+f.dS/2,14,0,Math.PI*2);c.stroke();
    txt('Y',cx,tY+f.dS+f.bS+f.gS+12,T.joint,11,'center',true);
    txt('borde libre',sL,tY+f.dS+f.bS+f.gS+12,T.txt2,9,'left');
    txt('borde libre',sR,tY+f.dS+f.bS+f.gS+12,T.txt2,9,'right');
    if(j.N>2)txt('N = '+j.N+' → se repite',cx+16,tY+f.dS+f.bS+f.gS+12,T.txt2,9,'left');
    detalle(x0+10,y0+138,w-20,h-146,'Y · DETALLE DE JUNTA LONGITUDINAL (a escala)',
      j.Lt,j.barra.d,T.tie,true,
      'Barra corrugada Ø'+j.barra.d+' mm '+j.barra.txt,'fy = '+j.fy+' MPa',
      'junta longitudinal','Lt = '+j.Lt+' mm',false);
  })();

  /* ================= VISTA C: planta ================= */
  (function(){
    const x0=14,y0=346,w=972,h=358;
    panel(x0,y0,w,h,'C · PLANTA — distribución de pasadores y barras de amarre (3 tramos × 2 carriles)');
    const nT=3,L=j.L,B=j.B;
    const sp=Math.min(500/(nT*L),240/(2*B));
    const px0=x0+54,pyT=y0+62,lw=B*sp,sl=L*sp;
    /* leyenda */
    rect(px0,y0+30,22,4,T.dowel,null);txt('Pasador (liso)',px0+28,y0+32,T.txt,10,'left');
    rect(px0+130,y0+30,22,4,T.tie,null);txt('Barra de amarre (corrugada)',px0+158,y0+32,T.txt,10,'left');
    line(px0+350,y0+32,px0+372,y0+32,T.txt2,1.5,[5,3]);txt('Junta',px0+378,y0+32,T.txt,10,'left');
    txt('SENTIDO DEL TRÁNSITO  →',px0+nT*sl/2,y0+50,T.txt2,10,'center');
    /* losas */
    rect(px0,pyT,nT*sl,2*lw,T.conc,null);
    rect(px0,pyT,nT*sl,2*lw,null,T.edge,2);
    for(let i=0;i<=nT;i++)line(px0+i*sl,pyT,px0+i*sl,pyT+2*lw,T.jline,1.5,[6,3]);
    line(px0,pyT+lw,px0+nT*sl,pyT+lw,T.jline,1.5,[6,3]);
    txt('CARRIL 1',px0+16,pyT+12,T.onConc,10,'left',true);
    txt('CARRIL 2',px0+16,pyT+2*lw-12,T.onConc,10,'left',true);
    /* pasadores */
    const Ldp=j.Ld/1000*sp;
    for(let i=0;i<=nT;i++)for(let ln=0;ln<2;ln++)for(let k=0;k<j.nd;k++){
      const yy=pyT+ln*lw+(j.margenD+k*j.sd)/1000*sp;
      rect(px0+i*sl-Ldp/2,yy-1.3,Ldp,2.6,T.dowel,T.dowelEdge,0.5);
    }
    /* barras de amarre */
    const Ltp=j.Lt/1000*sp,yMid=pyT+lw;
    for(let s=0;s<nT;s++)for(let t=0;t<j.kt;t++){
      const xx=px0+s*sl+(t+0.5)*j.st*sp;
      rect(xx-1.3,yMid-Ltp/2,2.6,Ltp,T.tie,T.tieDark,0.5);
    }
    /* cotas */
    for(let i=0;i<=nT;i++)line(px0+i*sl,pyT+2*lw,px0+i*sl,pyT+2*lw+26,T.dim,0.8,[2,2]);
    for(let s=0;s<nT;s++)dimH(px0+s*sl,px0+(s+1)*sl,pyT+2*lw+22,'L = '+L.toFixed(2)+' m',T.dim,true);
    dimV(px0-14,pyT,pyT+lw,'B = '+B.toFixed(2)+' m',T.dim,true);
    dimV(px0-14,pyT+lw,pyT+2*lw,'B = '+B.toFixed(2)+' m',T.dim,true);
    const i0=(j.kt>=4)?2:0;
    dimH(px0+(i0+0.5)*j.st*sp,px0+(i0+1.5)*j.st*sp,yMid-Ltp/2-12,'s = '+(j.st*1000).toFixed(0)+' mm',T.onConc,false);
    /* cota de pasadores (borde derecho) */
    const xr=px0+nT*sl+18,ya=pyT+j.margenD/1000*sp,yb=pyT+(j.margenD+(j.nd-1)*j.sd)/1000*sp;
    dimV(xr,ya,yb,'n = '+j.nd+' @ '+j.sd+' mm',T.dowel,false);

    /* cuadro de datos */
    const bx=x0+560,by=y0+36,bw=w-570,bh=h-46;
    rect(bx,by,bw,bh,T.panel2,T.border,1);
    const p=jnPosiciones();
    const mm=function(v){return Math.round(v);};
    const L2=[
      ['h','DATOS DE DISTRIBUCIÓN'],
      ['s','TRAMOS / JUNTAS TRANSVERSALES'],
      ['l','L entre juntas = '+L.toFixed(2)+' m ('+(j.manual?'manual':'auto')+') · L/B = '+j.LB.toFixed(2)],
      ['l','Aserrado ≥ D/4 = '+Math.round(j.D/4)+' mm · ancho 3–6 mm'],
      ['d','PASADORES (DÓVELAS) — acero liso'],
      ['l','Ø '+j.pd.d+' mm ('+j.pd.txt+') × '+j.Ld+' mm · '+j.mDow.toFixed(2)+' kg c/u'],
      ['l','@ '+j.sd+' mm c/c · n = '+j.nd+' por carril y por junta'],
      ['l','Margen al borde '+mm(j.margenD)+' mm · prof. D/2 = '+(j.D/2).toFixed(0)+' mm'],
      ['l','Mitad engrasada (libre) · mitad empotrada'],
      ['t','BARRAS DE AMARRE — acero corrugado'],
      ['l','Ø '+j.barra.d+' mm '+j.barra.txt+' × '+j.Lt+' mm · fy = '+j.fy+' MPa'],
      ['l','@ '+(j.st*1000).toFixed(0)+' mm c/c · '+j.kt+' barras por tramo'],
      ['l','1ª barra a '+(j.primera*1000).toFixed(0)+' mm de la junta transversal'],
      ['l','As req = '+j.AsReq.toFixed(0)+' mm²/m · As prov = '+j.AsProv.toFixed(0)+' mm²/m'],
      ['l','b = '+j.b.toFixed(2)+' m · fa = '+j.fa+' · fs = 0.67·fy = '+j.fs.toFixed(0)+' MPa'],
      ['s','CANTIDADES POR km ('+j.N+' carriles)'],
      ['l','Pasadores: '+j.dowKm.toFixed(0)+' u · '+j.dowKg.toFixed(0)+' kg'],
      ['l','Amarres: '+j.tieKm.toFixed(0)+' u · '+j.tieKg.toFixed(0)+' kg · Total '+(j.dowKg+j.tieKg).toFixed(0)+' kg']
    ];
    let yy=by+14;
    L2.forEach(function(r){
      const col=(r[0]==='h')?T.txt:(r[0]==='d')?T.dowel:(r[0]==='t')?T.tie:(r[0]==='s')?T.accent:T.txt;
      txt(r[1],bx+10,yy,col,(r[0]==='l')?10:10.5,'left',r[0]!=='l');
      yy+=(r[0]==='l')?14.5:17;
    });
    /* posiciones */
    txt('Posic. pasadores desde borde (mm): '+p.pd.slice(0,4).join(', ')+(p.pd.length>4?' … '+p.pd[p.pd.length-1]:''),bx+10,by+bh-24,T.txt2,9,'left');
    txt('Posic. amarres desde junta transv. (mm): '+p.pt.slice(0,4).join(', ')+(p.pt.length>4?' … '+p.pt[p.pt.length-1]:''),bx+10,by+bh-10,T.txt2,9,'left');
  })();

  txt('Predimensionamiento · cortes con exageración vertical (detalles X y Y a escala) · verificar con la especificación del proyecto',Wd/2,Hd-8,T.txt2,9,'center');
  c.restore();
}

function juntasDataURL(theme){
  const cnv=document.createElement('canvas');cnv.width=2000;cnv.height=1432;
  const g=cnv.getContext('2d');g.scale(2,2);
  drawJuntasDiagram(g,1000,716,theme);
  return cnv.toDataURL('image/png');
}

function renderJuntas(){
  const j=pr.jn;if(!j)return;
  const cvj=document.getElementById('jn-cv');
  const g=cvj.getContext('2d');
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cvj.width,cvj.height);g.scale(2,2);
  drawJuntasDiagram(g,1000,716,'dark');

  const filas=jnFilas();let grupo='',tb='';
  filas.forEach(function(f){
    if(f[0]!==grupo){grupo=f[0];tb+='<tr><td colspan="3" style="background:rgba(59,130,246,0.10);color:var(--accent2);font-weight:600;">'+grupo+'</td></tr>';}
    tb+='<tr><td class="prop">'+f[1]+'</td><td class="val">'+f[2]+'</td><td class="metodo">'+f[3]+'</td></tr>';
  });
  const p=jnPosiciones();
  const avisos=j.avisos.length?
    '<div class="m288-notas" style="border-top:none;color:var(--amber);"><strong>⚠ Avisos:</strong><ul style="margin-left:18px;">'+j.avisos.map(function(a){return '<li>'+a+'</li>';}).join('')+'</ul></div>':'';
  document.getElementById('jn-content').innerHTML =
    '<div class="res-grid">'+jnCards()+
      '<div class="res-card"><div class="lbl">As amarre req. / prov.</div><div class="val" style="font-size:12px;">'+j.AsReq.toFixed(0)+' / '+j.AsProv.toFixed(0)+'</div><div class="sub">mm²/m</div></div>'+
      '<div class="res-card"><div class="lbl">Acero total / km</div><div class="val">'+(j.dowKg+j.tieKg).toFixed(0)+' kg</div><div class="sub">'+j.N+' carriles</div></div>'+
    '</div>'+
    '<table class="m288-table"><thead><tr><th>Parámetro</th><th>Valor</th><th>Criterio / fórmula</th></tr></thead><tbody>'+tb+'</tbody></table>'+
    '<div class="m288-grid-info" style="margin-top:12px;">'+
      '<div class="m288-info-box"><div class="k">Posición de pasadores desde el borde del carril (mm)</div><div class="v" style="font-size:11px;font-weight:500;word-break:break-word;">'+p.pd.join(' · ')+'</div></div>'+
      '<div class="m288-info-box"><div class="k">Posición de barras de amarre desde la junta transversal (mm)</div><div class="v" style="font-size:11px;font-weight:500;word-break:break-word;">'+p.pt.join(' · ')+'</div></div>'+
    '</div>'+avisos+
    '<div class="m288-notas"><strong>Notas constructivas:</strong><ul style="margin-left:18px;">'+jnNotas().map(function(n){return '<li>'+n+'</li>';}).join('')+'</ul></div>';
}

function descargarJuntasPNG(){
  if(tipo!=='rigido'||!pr.jn){setStatus('Primero calcule un pavimento rígido.','err');return;}
  const a=document.createElement('a');
  a.href=juntasDataURL('light');a.download='Juntas_y_Acero_Pavimento_Rigido.png';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setStatus('✅ Imagen de juntas y acero descargada.','ok');
}

function bloqueJuntasInforme(){
  if(tipo!=='rigido'||!pr.jn)return '';
  const j=pr.jn;
  let grupo='',tb='';
  jnFilas().forEach(function(f){
    if(f[0]!==grupo){grupo=f[0];tb+='<tr><td colspan="3" style="background:#e0e7ff;font-weight:bold;">'+grupo+'</td></tr>';}
    tb+='<tr><td>'+f[1]+'</td><td><strong>'+f[2]+'</strong></td><td>'+f[3]+'</td></tr>';
  });
  const p=jnPosiciones();
  return '<h3>5.1. Juntas, pasadores (dóvelas) y barras de amarre</h3>' +
    '<p>Con el espesor de losa calculado (D = '+j.D+' mm) se predimensionan las juntas transversales con pasadores, la junta longitudinal con barras de amarre y el espaciamiento entre tramos. La figura muestra el corte longitudinal A-A, el corte transversal B-B y la planta con la distribución del acero.</p>' +
    '<img src="'+juntasDataURL('light')+'" alt="Detalle de juntas y acero" style="width:100%;border:1px solid #cbd5e1;margin:8px 0 14px;">' +
    '<table class="info-table"><thead><tr><th>Parámetro</th><th>Valor</th><th>Criterio / fórmula</th></tr></thead><tbody>'+tb+'</tbody></table>' +
    '<p><strong>Posición de pasadores desde el borde del carril (mm):</strong> '+p.pd.join(' · ')+'</p>' +
    '<p><strong>Posición de barras de amarre desde la junta transversal (mm):</strong> '+p.pt.join(' · ')+'</p>' +
    (j.avisos.length?'<h4>Avisos</h4><ul>'+j.avisos.map(function(a){return '<li>'+a+'</li>';}).join('')+'</ul>':'') +
    '<h4>Notas constructivas</h4><ul>'+jnNotas().map(function(n){return '<li>'+n+'</li>';}).join('')+'</ul>';
}

/* ================================================================
   RENDER RESULTADOS
================================================================ */
function renderResults(){
  const grid=document.getElementById('res-grid');
  const tbl=document.getElementById('capas-table');
  const sugDiv=document.getElementById('sugerencia-resultado');
  document.getElementById('res-title').textContent='Resultados — '+tipo+(metodo==='transito'?' (desde tránsito)':'');

  const s=obtenerSugerencia();
  const q=obtenerEstabilizacionQuimica(s.cbr);
  const dg=descripcionTecnicaGeotextil(s.app);

  if(tipo==='flexible'){
    grid.innerHTML=
      '<div class="res-card"><div class="lbl">W18 (ESAL)</div><div class="val">'+pf.W18.toExponential(2)+'</div></div>' +
      '<div class="res-card"><div class="lbl">Confiabilidad</div><div class="val">'+pf.R+'%</div></div>' +
      '<div class="res-card"><div class="lbl">Mr subrasante</div><div class="val">'+pf.Mr+' MPa</div></div>' +
      '<div class="res-card"><div class="lbl">CBR equiv.</div><div class="val">'+s.cbr.toFixed(2)+'</div></div>' +
      '<div class="res-card"><div class="lbl">SN requerido</div><div class="val">'+pf.SN_req.toFixed(3)+'</div></div>' +
      '<div class="res-card"><div class="lbl">SN provisto</div><div class="val highlight">'+pf.SN_prov.toFixed(3)+'</div></div>' +
      '<div class="res-card"><div class="lbl">Estabilización</div><div class="val" style="font-size:11px;color:'+q.color+';">'+q.emoji+' '+q.tratamiento.split('—')[0].trim()+'</div></div>' +
      (metodo==='transito'?'<div class="res-card"><div class="lbl">Método</div><div class="val" style="font-size:12px;color:var(--amber);">Tránsito → ESAL</div></div>':'');
    tbl.innerHTML=
      '<tr><th>Capa</th><th>a</th><th>m</th><th>Espesor</th><th>in</th><th>Aporte SN</th></tr>' +
      pf.capas.map(function(c){
        return '<tr><td><span class="swatch" style="background:'+c.col+'"></span>'+c.nom+'</td>' +
          '<td>'+c.a+'</td><td>'+c.m+'</td>' +
          '<td class="val-mm">'+c.D+' mm</td>' +
          '<td class="val-in">'+(c.D/25.4).toFixed(2)+'</td>' +
          '<td>'+(c.a*c.m*(c.D/25.4)).toFixed(3)+'</td></tr>';
      }).join('') +
      '<tr style="background:rgba(59,130,246,0.05)"><td colspan="5" style="text-align:right;font-weight:600">SN total provisto</td><td style="color:var(--green);font-weight:600">'+pf.SN_prov.toFixed(3)+'</td></tr>';
  } else {
    grid.innerHTML=
      '<div class="res-card"><div class="lbl">W18 (ESAL)</div><div class="val">'+pr.W18.toExponential(2)+'</div></div>' +
      '<div class="res-card"><div class="lbl">Confiabilidad</div><div class="val">'+pr.R+'%</div></div>' +
      '<div class="res-card"><div class="lbl">Ec concreto</div><div class="val">'+pr.Ec+' MPa</div></div>' +
      '<div class="res-card"><div class="lbl">k subrasante</div><div class="val">'+pr.k+' MN/m³</div></div>' +
      '<div class="res-card"><div class="lbl">CBR equiv.</div><div class="val">'+s.cbr.toFixed(2)+'</div></div>' +
      '<div class="res-card"><div class="lbl">D losa</div><div class="val highlight">'+pr.D_losa+' mm</div><div class="sub">'+(pr.D_losa/25.4).toFixed(2)+' in</div></div>' +
      '<div class="res-card"><div class="lbl">D base</div><div class="val">'+pr.D_base+' mm</div></div>' +
      jnCards() +
      '<div class="res-card"><div class="lbl">Estabilización</div><div class="val" style="font-size:11px;color:'+q.color+';">'+q.emoji+' '+q.tratamiento.split('—')[0].trim()+'</div></div>' +
      (metodo==='transito'?'<div class="res-card"><div class="lbl">Método</div><div class="val" style="font-size:12px;color:var(--amber);">Tránsito → ESAL</div></div>':'');
    tbl.innerHTML=
      '<tr><th>Capa</th><th>Descripción</th><th>Espesor (mm)</th><th>in</th><th>Parámetro</th></tr>' +
      '<tr><td><span class="swatch" style="background:#9ca3af"></span>Losa</td><td>Concreto hidráulico</td><td class="val-mm">'+pr.D_losa+' mm</td><td class="val-in">'+(pr.D_losa/25.4).toFixed(2)+'</td><td>Ec = '+pr.Ec+' MPa</td></tr>' +
      '<tr><td><span class="swatch" style="background:#8b6f3a"></span>Base</td><td>Base granular</td><td class="val-mm">'+pr.D_base+' mm</td><td class="val-in">'+(pr.D_base/25.4).toFixed(2)+'</td><td>k = '+pr.k+' MN/m³</td></tr>' +
      '<tr style="background:rgba(59,130,246,0.05)"><td colspan="4" style="text-align:right;font-weight:600">Subrasante</td><td style="color:var(--text2);">k = '+pr.k+' MN/m³</td></tr>';
  }

  sugDiv.innerHTML =
    '<div style="background:'+s.color+'12;border-left:4px solid '+s.color+';padding:16px 18px;border-radius:8px;margin-bottom:16px;">' +
      '<div style="color:'+s.color+';font-weight:600;font-size:13px;margin-bottom:8px;font-family:var(--mono);">'+s.emoji+' Geotextil Recomendado — '+s.titulo+'</div>' +
      '<div style="color:var(--text);font-size:11px;line-height:1.7;margin-bottom:10px;">'+s.resumen+'</div>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px;">' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
          '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Aplicación</div>' +
          '<div style="font-family:var(--mono);font-size:12px;font-weight:600;color:'+s.color+';">'+s.app.label+'</div>' +
        '</div>' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
          '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Clase Geotextil</div>' +
          '<div style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--text);">'+s.claseSeleccionada+'</div>' +
        '</div>' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
          '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Traslape mín.</div>' +
          '<div style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--text);">'+s.traslape+'</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed '+s.color+'50;">' +
        '<div style="font-family:var(--mono);font-size:10px;color:'+s.color+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">📋 Descripción técnica del geotextil a especificar</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:10px;">' +
          '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
            '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Tipo de producto</div>' +
            '<div style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text);">'+dg.tipo+'</div>' +
          '</div>' +
          '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
            '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Polímero</div>' +
            '<div style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text);">'+dg.polimero+'</div>' +
          '</div>' +
          '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
            '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Función principal</div>' +
            '<div style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text);">'+dg.funcion+'</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:10px;">' +
          '<div style="font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">⚙️ Características técnicas mínimas</div>' +
          '<ul style="margin-left:16px;font-size:11px;color:var(--text2);line-height:1.8;">' +
            dg.caracteristicas.map(function(c){return '<li>'+c+'</li>';}).join('') +
          '</ul>' +
        '</div>' +
        '<div style="margin-top:10px;">' +
          '<div style="font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">🏗️ Método de colocación (AASHTO M288-00 Apéndice A)</div>' +
          '<ol style="margin-left:18px;font-size:11px;color:var(--text2);line-height:1.8;">' +
            dg.colocacion.map(function(c){return '<li>'+c+'</li>';}).join('') +
          '</ol>' +
        '</div>' +
        '<div style="margin-top:12px;font-size:10px;color:var(--text3);font-family:var(--mono);padding:8px 10px;background:rgba(59,130,246,0.06);border-radius:6px;border-left:3px solid var(--accent);">' +
          '<strong style="color:var(--accent2);">Ejemplos comerciales típicos</strong> (equivalentes, no exclusivos):<br>' +
          '• <strong>Clase 1:</strong> Mirafi 140N, TenCate Geotex 401, Propex 2000, GSE HD-20, Polyfelt PEC-200, Typar 3401<br>' +
          '• <strong>Clase 2:</strong> Mirafi 500X, TenCate Geotex 315ST, Propex 2044, GSE HD-10, Polyfelt TS-60<br>' +
          '• <strong>Clase 3:</strong> Mirafi 180N, TenCate Geotex 211, Propex 151, GSE HD-5<br>' +
          '<em style="color:var(--text3);">La selección final debe basarse en los valores VMPR certificados por el fabricante según AASHTO M288-00 § 4.</em>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div style="background:'+q.color+'12;border-left:4px solid '+q.color+';padding:16px 18px;border-radius:8px;">' +
      '<div style="color:'+q.color+';font-weight:600;font-size:13px;margin-bottom:8px;font-family:var(--mono);">'+q.emoji+' Estabilización Química — '+q.tratamiento+'</div>' +
      '<div style="color:var(--text);font-size:11px;line-height:1.7;margin-bottom:10px;">' +
        'Suelo estimado: <strong>'+q.clasificacion+'</strong> · IP ≈ '+q.ipEstimado+'% · Pasa N° 200 ≈ '+q.pasa200Estimado+'% · CBR ≈ '+s.cbr.toFixed(2) +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-top:10px;">' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
          '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Tratamiento</div>' +
          '<div style="font-family:var(--mono);font-size:12px;font-weight:600;color:'+q.color+';">'+q.tratamiento+'</div>' +
        '</div>' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
          '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Dosificación</div>' +
          '<div style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--text);">'+q.dosificacion+'</div>' +
        '</div>' +
        '<div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px 10px;">' +
          '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);text-transform:uppercase;">Resistencia mín.</div>' +
          '<div style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--text);">'+q.resistencia+'</div>' +
        '</div>' +
      '</div>' +
      (q.ensayos.length > 0 ?
      '<div style="margin-top:12px;">' +
        '<div style="font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">Ensayos requeridos:</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px;">' +
          q.ensayos.slice(0,6).map(function(e){
            return '<div style="font-family:var(--mono);font-size:10px;color:var(--text2);padding:3px 6px;background:rgba(0,0,0,0.15);border-radius:4px;">• '+e.ensayo+' <span style="color:var(--text3);">('+e.norma+')</span></div>';
          }).join('') +
        '</div>' +
      '</div>' : '') +
      '<div style="margin-top:12px;font-size:10px;color:var(--text3);font-family:var(--mono);">' +
        '→ Abra los paneles <strong style="color:var(--accent2)">🧵 Geotextiles M288</strong> y <strong style="color:var(--accent2)">🧪 Estabilización Química</strong> para especificaciones completas.' +
      '</div>' +
    '</div>';
}

/* ================================================================
   INFORME TÉCNICO (Blob URL + fallback de descarga)
================================================================ */
function generarInforme(){
  try {
    if(!calculado){
      setStatus('⚠️ Primero presione Calcular para generar el informe.','err');
      return;
    }

    const s=obtenerSugerencia();
    const q=obtenerEstabilizacionQuimica(s.cbr);
    const dg=descripcionTecnicaGeotextil(s.app);
    const fecha=new Date().toLocaleString('es-CO',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const t1=M288.tabla1[s.claseSeleccionada];

    let resultadosHTML='',contenidoCapas='',formulaHTML='',metodoTransitoHTML='';

    if(tipo==='flexible'){
      resultadosHTML=
        '<tr><td><strong>W18 (ESAL)</strong></td><td>'+pf.W18.toExponential(4)+'</td></tr>' +
        '<tr><td><strong>Confiabilidad (R)</strong></td><td>'+pf.R+'%</td></tr>' +
        '<tr><td><strong>Desviación estándar (So)</strong></td><td>'+pf.So+'</td></tr>' +
        '<tr><td><strong>ΔPSI</strong></td><td>'+pf.deltaPSI+'</td></tr>' +
        '<tr><td><strong>Mr subrasante</strong></td><td>'+pf.Mr+' MPa</td></tr>' +
        '<tr><td><strong>CBR equivalente</strong></td><td>'+s.cbr.toFixed(2)+'</td></tr>' +
        '<tr><td><strong>SN requerido</strong></td><td>'+pf.SN_req.toFixed(3)+'</td></tr>' +
        '<tr><td><strong>SN provisto</strong></td><td>'+pf.SN_prov.toFixed(3)+'</td></tr>';
      contenidoCapas=
        '<table class="info-table"><thead>' +
          '<tr><th>Capa</th><th>Coef. a</th><th>Coef. m</th><th>Espesor (mm)</th><th>Espesor (in)</th><th>Aporte SN</th></tr>' +
        '</thead><tbody>' +
          pf.capas.map(function(c){
            return '<tr><td>'+c.nom+'</td><td>'+c.a+'</td><td>'+c.m+'</td><td>'+c.D+'</td><td>'+(c.D/25.4).toFixed(2)+'</td><td>'+(c.a*c.m*(c.D/25.4)).toFixed(3)+'</td></tr>';
          }).join('') +
          '<tr style="font-weight:bold;background:#f0f0f0;"><td colspan="5" style="text-align:right;">SN TOTAL PROVISTO</td><td>'+pf.SN_prov.toFixed(3)+'</td></tr>' +
        '</tbody></table>';
      formulaHTML=
        '<p><strong>Ecuación AASHTO-93 para pavimento flexible:</strong></p>' +
        '<p class="formula">log(W18) = ZR·So + 9.36·log(SN+1) − 0.20 + log(ΔPSI/2.7) / [0.40 + 1094/(SN+1)⁵·¹⁹] + 2.32·log(Mr) − 8.07</p>';
    } else {
      resultadosHTML=
        '<tr><td><strong>W18 (ESAL)</strong></td><td>'+pr.W18.toExponential(4)+'</td></tr>' +
        '<tr><td><strong>Confiabilidad (R)</strong></td><td>'+pr.R+'%</td></tr>' +
        '<tr><td><strong>ΔPSI</strong></td><td>'+pr.deltaPSI+'</td></tr>' +
        '<tr><td><strong>Ec concreto</strong></td><td>'+pr.Ec+' MPa</td></tr>' +
        '<tr><td><strong>Sc (módulo de rotura)</strong></td><td>'+pr.Sc+' MPa</td></tr>' +
        '<tr><td><strong>k subrasante</strong></td><td>'+pr.k+' MN/m³</td></tr>' +
        '<tr><td><strong>CBR equivalente</strong></td><td>'+s.cbr.toFixed(2)+'</td></tr>' +
        '<tr><td><strong>J (transferencia)</strong></td><td>'+pr.J+'</td></tr>' +
        '<tr><td><strong>Cd (drenaje)</strong></td><td>'+pr.Cd+'</td></tr>' +
        '<tr><td><strong>Espesor de losa (D)</strong></td><td>'+pr.D_losa+' mm ('+(pr.D_losa/25.4).toFixed(2)+' in)</td></tr>' +
        '<tr><td><strong>Espesor de base</strong></td><td>'+pr.D_base+' mm</td></tr>';
      contenidoCapas=
        '<table class="info-table"><thead>' +
          '<tr><th>Capa</th><th>Descripción</th><th>Espesor (mm)</th><th>Espesor (in)</th><th>Parámetro</th></tr>' +
        '</thead><tbody>' +
          '<tr><td>Losa</td><td>Concreto hidráulico</td><td>'+pr.D_losa+'</td><td>'+(pr.D_losa/25.4).toFixed(2)+'</td><td>Ec = '+pr.Ec+' MPa</td></tr>' +
          '<tr><td>Base</td><td>Base granular</td><td>'+pr.D_base+'</td><td>'+(pr.D_base/25.4).toFixed(2)+'</td><td>k = '+pr.k+' MN/m³</td></tr>' +
          '<tr style="font-weight:bold;background:#f0f0f0;"><td colspan="4" style="text-align:right;">Subrasante</td><td>k = '+pr.k+' MN/m³</td></tr>' +
        '</tbody></table>';
      formulaHTML=
        '<p><strong>Ecuación AASHTO-93 para pavimento rígido:</strong></p>' +
        '<p class="formula">log(W18) = ZR·So + 7.35·log(D+1) − 0.06 + log(ΔPSI/3.0) / [1 + 1.624×10⁷/(D+1)⁸·⁴⁶] + (4.22 − 0.32·pt)·log[ Sc·Cd·(D⁰·⁷⁵−1.132) / (215.63·J·(D⁰·⁷⁵ − 18.42/(Ec/k)⁰·²⁵)) ]</p>';
    }

    if(metodo==='transito'){
      const totalComerciales=Object.keys(vehiculos).reduce(function(a,k){return a+vehiculos[k];},0);
      metodoTransitoHTML=
        '<h2>4. Metodología de Tránsito</h2>' +
        '<table class="info-table"><thead><tr><th>Parámetro</th><th>Valor</th></tr></thead><tbody>' +
          '<tr><td>Total vehículos comerciales (TPD)</td><td>'+totalComerciales+'</td></tr>' +
          '<tr><td>% Camiones ponderado</td><td>'+(transito.factorCamion*100).toFixed(2)+'%</td></tr>' +
          '<tr><td>Tasa de crecimiento anual</td><td>'+(transito.factorCrec*100).toFixed(2)+'%</td></tr>' +
          '<tr><td>Período de diseño</td><td>'+transito.anios+' años</td></tr>' +
          '<tr><td>Factor de ejes equivalentes</td><td>'+transito.factorEjes+'</td></tr>' +
          '<tr><td>Factor de distribución por carril</td><td>'+transito.carril+'</td></tr>' +
          '<tr style="font-weight:bold;background:#f0f0f0;"><td>W18 calculado</td><td>'+(tipo==='flexible'?pf.W18:pr.W18).toExponential(4)+'</td></tr>' +
        '</tbody></table>' +
        '<p class="formula">W18 = TPD × 365 × %Camiones × FactorEjes × FactorCarril × [(1+i)ⁿ − 1] / i</p>';
    } else {
      metodoTransitoHTML=
        '<h2>4. Metodología de Tránsito</h2>' +
        '<p>El valor de W18 fue ingresado directamente como dato de entrada:</p>' +
        '<p class="formula">W18 = '+(tipo==='flexible'?pf.W18:pr.W18).toExponential(4)+' ESAL</p>';
    }

    const bloqueM288=
      '<h2>7. Especificación de Geosintéticos — AASHTO M288-00</h2>' +
      '<p>Basado en el CBR equivalente del suelo de subrasante (<strong>CBR ≈ '+s.cbr.toFixed(2)+'</strong>), se selecciona la siguiente aplicación y clase de geotextil según AASHTO M288-00:</p>' +

      '<div class="sugerencia-box" style="border-left-color:'+s.color+';background:'+s.color+'12;">' +
        '<div class="titulo" style="color:'+s.color+';">'+s.emoji+' '+s.titulo+'</div>' +
        '<div class="subtitulo">'+s.app.tabla.ref+'</div>' +
        '<div class="detalle">'+s.resumen+'</div>' +
      '</div>' +

      '<h3>7.1. Descripción técnica del geotextil recomendado</h3>' +
      '<table class="info-table">' +
        '<thead><tr><th>Característica</th><th>Especificación</th></tr></thead>' +
        '<tbody>' +
          '<tr><td><strong>Tipo de producto</strong></td><td>'+dg.tipo+'</td></tr>' +
          '<tr><td><strong>Polímero</strong></td><td>'+dg.polimero+'</td></tr>' +
          '<tr><td><strong>Función principal</strong></td><td>'+dg.funcion+'</td></tr>' +
          '<tr><td><strong>Aplicación</strong></td><td>'+s.app.label+'</td></tr>' +
          '<tr><td><strong>Clase (Tabla 1)</strong></td><td>'+s.claseSeleccionada+'</td></tr>' +
          '<tr><td><strong>Traslape mínimo</strong></td><td>'+s.traslape+'</td></tr>' +
        '</tbody>' +
      '</table>' +

      '<h4 style="font-size:12px;color:#334155;margin-top:14px;margin-bottom:6px;">Características técnicas mínimas exigibles</h4>' +
      '<ul>'+dg.caracteristicas.map(function(c){return '<li>'+c+'</li>';}).join('')+'</ul>' +

      '<h4 style="font-size:12px;color:#334155;margin-top:14px;margin-bottom:6px;">Método de colocación (AASHTO M288-00 Apéndice A)</h4>' +
      '<ol>'+dg.colocacion.map(function(c){return '<li>'+c+'</li>';}).join('')+'</ol>' +

      '<h4 style="font-size:12px;color:#334155;margin-top:14px;margin-bottom:6px;">Ejemplos comerciales equivalentes (no exclusivos)</h4>' +
      '<ul>' +
        '<li><strong>Clase 1:</strong> Mirafi 140N, TenCate Geotex 401, Propex 2000, GSE HD-20, Polyfelt PEC-200, Typar 3401</li>' +
        '<li><strong>Clase 2:</strong> Mirafi 500X, TenCate Geotex 315ST, Propex 2044, GSE HD-10, Polyfelt TS-60</li>' +
        '<li><strong>Clase 3:</strong> Mirafi 180N, TenCate Geotex 211, Propex 151, GSE HD-5</li>' +
      '</ul>' +
      '<p style="font-size:11px;color:#64748b;"><em>La selección final debe basarse en los valores VMPR certificados por el fabricante según AASHTO M288-00 § 4.</em></p>' +

      '<h3>7.2. Requerimientos de Resistencia (Tabla 1 — '+s.claseSeleccionada+')</h3>' +
      '<table class="info-table">' +
        '<thead><tr><th>Propiedad</th><th>Método</th><th>Elong &lt; 50%</th><th>Elong ≥ 50%</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>Resistencia Grab</td><td>ASTM D4632</td><td>'+t1.elong_menor_50.grab+' N</td><td>'+t1.elong_mayor_50.grab+' N</td></tr>' +
          '<tr><td>Resistencia Costura</td><td>ASTM D4632</td><td>'+t1.elong_menor_50.costura+' N</td><td>'+t1.elong_mayor_50.costura+' N</td></tr>' +
          '<tr><td>Resistencia al Rasgado</td><td>ASTM D4533</td><td>'+t1.elong_menor_50.rasgado+' N</td><td>'+t1.elong_mayor_50.rasgado+' N</td></tr>' +
          '<tr><td>Resistencia al Punzonado</td><td>ASTM D4833</td><td>'+t1.elong_menor_50.punzonado+' N</td><td>'+t1.elong_mayor_50.punzonado+' N</td></tr>' +
        '</tbody>' +
      '</table>' +

      '<h3>7.3. Requerimientos de Filtración — '+s.app.tabla.titulo+'</h3>' +
      '<table class="info-table">' +
        '<thead><tr><th>Propiedad</th><th>Método</th><th>Valor requerido</th></tr></thead>' +
        '<tbody>'+s.requerimientosApp.replace(/class="[^"]*"/g,'')+'</tbody>' +
      '</table>' +

      '<h3>7.4. Traslapes mínimos (Tabla A1)</h3>' +
      '<table class="info-table">' +
        '<thead><tr><th>CBR del suelo</th><th>Traslape mínimo</th></tr></thead>' +
        '<tbody>'+M288.tablaA1.map(function(r){return '<tr><td>'+r.condicion+'</td><td>'+r.traslape+'</td></tr>';}).join('')+'</tbody>' +
      '</table>' +
      '<p><strong>Traslape aplicable a este proyecto:</strong> <span style="color:'+s.color+';font-weight:600;">'+s.traslape+'</span></p>' +

      '<h3>7.5. Notas normativas</h3>' +
      '<ul>'+s.app.tabla.notas.map(function(n){return '<li>'+n+'</li>';}).join('')+'</ul>';

    const bloqueQuimica=
      '<h2>8. Estabilización Química del Suelo — AASHTO</h2>' +
      '<p>Basado en el CBR equivalente (<strong>'+s.cbr.toFixed(2)+'</strong>) y la clasificación estimada del suelo (<strong>'+q.clasificacion+'</strong>), se determina el siguiente tratamiento:</p>' +

      '<div class="sugerencia-box" style="border-left-color:'+q.color+';background:'+q.color+'12;">' +
        '<div class="titulo" style="color:'+q.color+';">'+q.emoji+' '+q.tratamiento+'</div>' +
        '<div class="subtitulo">Clasificación AASHTO: '+q.clasificacion+' · IP ≈ '+q.ipEstimado+'% · CBR ≈ '+s.cbr.toFixed(2)+'</div>' +
        '<div class="detalle">' +
          '<strong>Dosificación:</strong> '+q.dosificacion+'<br>' +
          '<strong>Resistencia mínima:</strong> '+q.resistencia +
        '</div>' +
      '</div>' +

      '<h3>8.1. Clasificación del suelo y aptitud</h3>' +
      '<table class="info-table">' +
        '<thead><tr><th>Parámetro</th><th>Valor</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>Clasificación AASHTO</td><td>'+q.clasificacion+'</td></tr>' +
          '<tr><td>Descripción</td><td>'+q.suelo.descripcion+'</td></tr>' +
          '<tr><td>Índice plástico (IP)</td><td>'+q.suelo.IP+' (estimado: '+q.ipEstimado+'%)</td></tr>' +
          '<tr><td>% pasa Tamiz N° 200</td><td>'+q.suelo.pasa200+' (estimado: '+q.pasa200Estimado+'%)</td></tr>' +
          '<tr><td>Dosificación con cal</td><td>'+q.suelo.cal+'</td></tr>' +
          '<tr><td>Dosificación con cemento</td><td>'+q.suelo.cemento+'</td></tr>' +
          '<tr><td>Materia orgánica máx.</td><td>'+q.suelo.materiaOrganica+'</td></tr>' +
        '</tbody>' +
      '</table>' +

      (q.ensayos.length > 0 ?
      '<h3>8.2. Ensayos requeridos para diseño de mezcla</h3>' +
      '<table class="info-table">' +
        '<thead><tr><th>Ensayo</th><th>Norma AASHTO/ASTM</th><th>Propósito</th></tr></thead>' +
        '<tbody>'+q.ensayos.map(function(e){return '<tr><td>'+e.ensayo+'</td><td>'+e.norma+'</td><td>'+e.proposito+'</td></tr>';}).join('')+'</tbody>' +
      '</table>' : '') +

      '<h3>8.3. Notas normativas de construcción</h3>' +
      '<ul>'+q.notas.map(function(n){return '<li>'+n+'</li>';}).join('')+'</ul>';

    // ============================================================
    // CONSTRUIR EL HTML DEL INFORME (con array.join para evitar problemas de template)
    // ============================================================
    const informeHTML = [
      '<!DOCTYPE html>',
      '<html lang="es"><head><meta charset="UTF-8">',
      '<title>Informe Técnico — Diseño de Pavimento AASHTO-93 + M288-00</title>',
      '<style>',
      '  *{box-sizing:border-box;margin:0;padding:0}',
      '  body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#1a1a1a;line-height:1.7;padding:40px;max-width:900px;margin:0 auto}',
      '  .header{text-align:center;border-bottom:3px solid #1e40af;padding-bottom:20px;margin-bottom:30px}',
      '  .header .institution{font-size:12px;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}',
      '  .header h1{font-size:24px;font-weight:700;color:#1e3a8a;margin-bottom:6px}',
      '  .header .subtitle{font-size:14px;color:#475569;margin-bottom:12px}',
      '  .header .meta{font-size:11px;color:#64748b;font-family:"Courier New",monospace}',
      '  h2{font-size:16px;font-weight:700;color:#1e3a8a;margin-top:30px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #dbeafe}',
      '  h3{font-size:13px;font-weight:600;color:#334155;margin-top:18px;margin-bottom:8px}',
      '  h4{font-size:12px;font-weight:600;color:#334155;margin-top:14px;margin-bottom:6px}',
      '  p{margin-bottom:10px;font-size:13px}',
      '  ul,ol{margin-left:20px;margin-bottom:10px} li{font-size:12px;margin-bottom:4px}',
      '  .info-table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0}',
      '  .info-table th{background:#1e40af;color:#fff;padding:8px 12px;text-align:left;font-weight:600;font-size:11px}',
      '  .info-table td{padding:7px 12px;border-bottom:1px solid #e2e8f0}',
      '  .info-table tr:nth-child(even){background:#f8fafc}',
      '  .formula{background:#f1f5f9;border-left:3px solid #3b82f6;padding:10px 14px;font-family:"Courier New",monospace;font-size:11px;margin:10px 0;overflow-x:auto}',
      '  .sugerencia-box{padding:16px 20px;margin:16px 0;border-radius:4px;border-left:4px solid #3b82f6}',
      '  .sugerencia-box .titulo{font-size:14px;font-weight:700;margin-bottom:8px}',
      '  .sugerencia-box .subtitulo{font-size:12px;font-weight:600;color:#1a1a1a;margin-bottom:8px}',
      '  .sugerencia-box .detalle{font-size:11px;color:#475569;line-height:1.7}',
      '  .firma{margin-top:50px;display:flex;justify-content:space-around}',
      '  .firma div{text-align:center;width:200px}',
      '  .firma .linea{border-top:1px solid #1a1a1a;margin-bottom:6px;padding-top:40px}',
      '  .firma .nombre{font-size:11px;font-weight:600}',
      '  .firma .cargo{font-size:10px;color:#64748b}',
      '  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}',
      '  .print-btn{position:fixed;top:20px;right:20px;background:#1e40af;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-family:"Courier New",monospace;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(30,64,175,.3)}',
      '  .print-btn:hover{background:#1e3a8a}',
      '  @media print{.print-btn{display:none}body{padding:20px}}',
      '</style></head><body>',
      '<button class="print-btn" onclick="window.print()">🖨️ IMPRIMIR / PDF</button>',
      '<div class="header">',
      '  <div class="institution">Fundación Universitaria Tecnológico Comfenalco</div>',
      '  <h1>INFORME TÉCNICO DE DISEÑO DE PAVIMENTO</h1>',
      '  <div class="subtitle">Método AASHTO-93 · Pavimento ' + (tipo==='flexible'?'Flexible':'Rígido') + ' · Geosintéticos M288-00 · Estabilización Química AASHTO M216/M85</div>',
      '  <div class="meta">Generado: ' + fecha + '</div>',
      '</div>',
      '<h2>1. Introducción</h2>',
      '<p>El presente informe documenta el diseño de la estructura de pavimento ' + (tipo==='flexible'?'flexible':'rígido') + ' mediante el método AASHTO-93 (1993), complementado con la especificación de geosintéticos según <strong>AASHTO M288-00</strong> y el diseño de estabilización química del suelo según <strong>AASHTO M216 (cal), M85 (cemento) y T220 (resistencia)</strong>.</p>',
      '<h2>2. Parámetros de Diseño</h2>',
      '<table class="info-table"><thead><tr><th>Parámetro</th><th>Valor</th></tr></thead><tbody>' + resultadosHTML + '</tbody></table>',
      '<h2>3. Metodología de Cálculo</h2>',
      formulaHTML,
      metodoTransitoHTML,
      '<h2>5. Resultados del Diseño</h2>',
      contenidoCapas,
      bloqueJuntasInforme(),
      '<h2>6. Recomendaciones Técnicas — Resumen</h2>',
      '<div class="sugerencia-box" style="border-left-color:' + s.color + ';background:' + s.color + '12;">',
      '  <div class="titulo" style="color:' + s.color + ';">' + s.emoji + ' Geotextil: ' + s.titulo + '</div>',
      '  <div class="detalle">Aplicación: <strong>' + s.app.label + '</strong> · Clase: <strong>' + s.claseSeleccionada + '</strong> · Traslape mín.: <strong>' + s.traslape + '</strong></div>',
      '</div>',
      '<div class="sugerencia-box" style="border-left-color:' + q.color + ';background:' + q.color + '12;">',
      '  <div class="titulo" style="color:' + q.color + ';">' + q.emoji + ' Estabilización: ' + q.tratamiento + '</div>',
      '  <div class="detalle">Dosificación: <strong>' + q.dosificacion + '</strong> · Resistencia mín.: <strong>' + q.resistencia + '</strong></div>',
      '</div>',
      bloqueM288,
      bloqueQuimica,
      '<h2>9. Referencias Normativas</h2>',
      '<ul>',
      '  <li><strong>AASHTO Guide for Design of Pavement Structures</strong>, 1993.</li>',
      '  <li><strong>PCA / ACPA</strong> — Diseño de juntas, pasadores (dóvelas) y barras de amarre en pavimentos de concreto; INVÍAS Art. 500 (verificar edición vigente).</li>',
      '  <li><strong>AASHTO M 288-00</strong> — Standard Specification for Geosynthetic Specification for Highway Applications.</li>',
      '  <li><strong>AASHTO M 216</strong> — Quicklime and Hydrated Lime for Soil Stabilization (ASTM C977).</li>',
      '  <li><strong>AASHTO M 85</strong> — Portland Cement (ASTM C150).</li>',
      '  <li><strong>AASHTO T 220</strong> — Strength of Soil–Lime Mixtures.</li>',
      '  <li><strong>AASHTO T 99 / T 180</strong> — Moisture-Density Relations of Soils.</li>',
      '  <li><strong>AASHTO T 88 / T 90 / T 176 / T 267 / T 290</strong> — Caracterización de suelos.</li>',
      '  <li><strong>ASTM D 5102 / D 1633 / D 6276</strong> — Ensayos de estabilización química.</li>',
      '  <li><strong>ASTM D4632 / D4833 / D4533 / D4491 / D4751 / D4355 / D5261 / D276 / D6140</strong> — Ensayos de geotextiles.</li>',
      '</ul>',
      '<div class="firma">',
      '  <div><div class="linea"></div><div class="nombre">Ing. Responsable</div><div class="cargo">Diseñador de Pavimentos</div></div>',
      '  <div><div class="linea"></div><div class="nombre">Revisor Técnico</div><div class="cargo">Supervisor de Diseño</div></div>',
      '</div>',
      '<div class="footer">',
      '  Informe generado por el Sistema de Diseño AASHTO-93 v5.3 · M288-00 · M216/M85<br>',
      '  Fundación Universitaria Tecnológico Comfenalco · Solo uso académico',
      '</div>',
      '</body></html>'
    ].join('\n');

    // ============================================================
    // ABRIR CON BLOB URL + FALLBACK DE DESCARGA
    // ============================================================
    const blob = new Blob([informeHTML], {type:'text/html;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const ventana = window.open(url, '_blank');

    if(!ventana || ventana.closed || typeof ventana.closed === 'undefined'){
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Informe_Pavimento_AASHTO93_M288_' + new Date().getTime() + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus('⚠️ Popup bloqueado. Informe descargado como archivo HTML.','err');
      setTimeout(function(){URL.revokeObjectURL(url);}, 5000);
    } else {
      setStatus('✅ Informe técnico generado en nueva pestaña.','ok');
      setTimeout(function(){URL.revokeObjectURL(url);}, 10000);
    }

  } catch(err){
    console.error('Error en generarInforme:', err);
    setStatus('❌ Error al generar informe: ' + err.message, 'err');
    alert('Error al generar el informe:\n\n' + err.message + '\n\nRevisa la consola del navegador (F12) para más detalles.');
  }
}

/* ================================================================
   EJEMPLOS
================================================================ */
function ejemploFlex(){
  setTipo('flexible');setMetodo('esal');
  pf.W18=5e6;pf.R=90;pf.So=0.45;pf.deltaPSI=1.9;pf.Mr=69;
  pf.capas[0].a=0.44;pf.capas[1].a=0.14;pf.capas[2].a=0.11;
  pf.capas[0].m=1.0;pf.capas[1].m=1.0;pf.capas[2].m=1.0;
  calcular();
  document.getElementById('results-panel').style.display='block';
  renderResults();
}
function ejemploRig(){
  setTipo('rigido');setMetodo('esal');
  pr.W18=5e6;pr.R=90;pr.So=0.35;pr.deltaPSI=2.3;
  pr.Ec=27579;pr.Sc=4.5;pr.k=54.0;pr.J=3.2;pr.Cd=1.0;
  pr.bCarril=3.65;pr.nCarriles=2;pr.Ltramo=0;pr.fyAcero=420;pr.fa=1.5;pr.sDow=0;
  calcular();
  document.getElementById('results-panel').style.display='block';
  renderResults();
  document.getElementById('juntas-panel').style.display='block';
  renderJuntas();
}

/* ================================================================
   DIBUJO CANVAS
================================================================ */
function drawCloud(cx,cy,s,off){
  let x=cx+off;
  while(x>W+70)x-=W+140;
  while(x<-70)x+=W+140;
  ctx.save();ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x,cy,s,0,Math.PI*2);
  ctx.arc(x+s*0.8,cy-s*0.3,s*0.7,0,Math.PI*2);
  ctx.arc(x-s*0.8,cy-s*0.2,s*0.7,0,Math.PI*2);
  ctx.arc(x+s*0.4,cy+s*0.2,s*0.6,0,Math.PI*2);
  ctx.arc(x-s*0.4,cy+s*0.2,s*0.6,0,Math.PI*2);
  ctx.fill();ctx.restore();
}
function drawTree(x,base,h,w){
  ctx.fillStyle='#3a2a12';ctx.fillRect(x-w*0.08,base-h*0.25,w*0.16,h*0.3);
  ctx.fillStyle='#1e6b1e';ctx.beginPath();ctx.moveTo(x,base-h);ctx.lineTo(x-w/2,base-h*0.33);ctx.lineTo(x+w/2,base-h*0.33);ctx.closePath();ctx.fill();
  ctx.fillStyle='#28882a';ctx.beginPath();ctx.moveTo(x,base-h*1.05);ctx.lineTo(x-w*.4,base-h*0.55);ctx.lineTo(x+w*.4,base-h*0.55);ctx.closePath();ctx.fill();
  ctx.fillStyle='#1a5a1a';ctx.beginPath();ctx.moveTo(x,base-h*0.85);ctx.lineTo(x-w*.35,base-h*0.45);ctx.lineTo(x+w*.35,base-h*0.45);ctx.closePath();ctx.fill();
}
function drawEmoji(x,y,emoji,size,label){
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI);ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=10;ctx.shadowOffsetX=3;ctx.shadowOffsetY=3;ctx.rotate(Math.PI);
  ctx.font=size+'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,0,-2);ctx.restore();
  if(label){
    ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.font='9px "IBM Plex Mono",monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(label,0,-28);ctx.restore();
  }
}

function drawScene(){
  const CY=100;
  const skyGrad=ctx.createLinearGradient(0,0,0,CY);
  skyGrad.addColorStop(0,'#0a1628');skyGrad.addColorStop(0.5,'#1a3a5c');skyGrad.addColorStop(1,'#2a5a7a');
  ctx.fillStyle=skyGrad;ctx.fillRect(0,0,W,H);

  ctx.fillStyle='rgba(20,50,80,0.8)';ctx.beginPath();
  ctx.moveTo(-50,CY+5);ctx.lineTo(W*0.3,CY-80);ctx.lineTo(W*0.55,CY-40);ctx.lineTo(W*0.8,CY-15);ctx.lineTo(W+50,CY+5);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(30,70,100,0.6)';ctx.beginPath();
  ctx.moveTo(-50,CY+5);ctx.lineTo(W*0.15,CY-50);ctx.lineTo(W*0.45,CY-20);ctx.lineTo(W*0.7,CY-5);ctx.lineTo(W+50,CY+5);ctx.closePath();ctx.fill();

  drawCloud(120,22,16,nubeOff);drawCloud(W-100,16,12,nubeOff*0.65);drawCloud(W/2+40,30,10,nubeOff*0.42+150);
  drawTree(25,CY,65,28);drawTree(68,CY,55,22);drawTree(W-35,CY,75,32);drawTree(W-72,CY,60,26);drawTree(W-108,CY,50,20);

  ctx.fillStyle='#3a3a40';ctx.fillRect(0,CY-5,W,5);
  const lh=[30,28,32];

  const speed2=0.50;
  let truckX=W+120-((animT*speed2)%(W+240))-160;

  /* Función de deformación corregida:
     - Bajo el camión: HUNDIMIENTO (Y positivo)
     - Delante/detrás: recuperación elástica (Y negativo) */
  function getDeformacion(x, capaIndex){
    if(capaIndex === 0) return 0;
    const dx = x - truckX;
    const distAbs = Math.abs(dx);
    const anchoOnda = 120;
    let amplitudBase;
    if(capaIndex === 1)      amplitudBase = 10;
    else if(capaIndex === 2) amplitudBase = 7;
    else                     amplitudBase = 4;
    if(distAbs > anchoOnda) return 0;
    const gaussiana  = Math.exp(-Math.pow(dx / (anchoOnda * 0.4), 2));
    const oscilacion = Math.sin(dx * 0.04 + animT * 0.08) * 0.3;
    const valle = amplitudBase * gaussiana;
    const crestaDelantera = (dx > 20 && dx < 100)
      ? -Math.exp(-Math.pow((dx - 60) / 30, 2)) * amplitudBase * 0.4
      : 0;
    const crestaTrasera = (dx < -20 && dx > -100)
      ? -Math.exp(-Math.pow((dx + 60) / 30, 2)) * amplitudBase * 0.3
      : 0;
    return valle + crestaDelantera + crestaTrasera + oscilacion;
  }

  if(tipo==='flexible'){
    const capasInfo=[
      {nom:"CARPETA ASFÁLTICA",color:'#26262b',txcolor:'rgba(255,255,255,0.85)',deformar:false},
      {nom:"BASE GRANULAR",color:'#7a5e30',txcolor:'rgba(255,255,255,0.8)',deformar:true},
      {nom:"SUBBASE GRANULAR",color:'#b08c55',txcolor:'rgba(255,255,255,0.75)',deformar:true}
    ];
    const ds=calculado?[pf.capas[0].D,pf.capas[1].D,pf.capas[2].D]:[150,200,180];
    let yy=CY;
    capasInfo.forEach(function(capa,i){
      ctx.fillStyle=capa.color;
      if(!capa.deformar){
        ctx.fillRect(0,yy,W,lh[i]);
        ctx.fillStyle='rgba(255,255,255,0.03)';
        for(let xx=0;xx<W;xx+=8)ctx.fillRect(xx,yy,1,lh[i]);
        ctx.fillStyle=capa.txcolor;ctx.font='bold 10px "IBM Plex Mono",monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(capa.nom+'  '+ds[i]+' mm',W/2,yy+lh[i]/2);
      }else{
        ctx.beginPath();ctx.moveTo(0,yy);
        for(let x=0;x<=W;x+=2)ctx.lineTo(x,yy+getDeformacion(x,i));
        ctx.lineTo(W,yy+lh[i]);ctx.lineTo(0,yy+lh[i]);ctx.closePath();ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.03)';
        for(let xx=0;xx<W;xx+=8)ctx.fillRect(xx,yy,1,lh[i]);
        ctx.fillStyle=capa.txcolor;ctx.font='bold 10px "IBM Plex Mono",monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(capa.nom+'  '+ds[i]+' mm',W/2,yy+lh[i]/2);
      }
      yy+=lh[i];
    });
    const subrasanteY=yy,subrasanteHeight=H-subrasanteY;
    ctx.fillStyle='#4a5a3a';ctx.beginPath();ctx.moveTo(0,subrasanteY);
    for(let x=0;x<=W;x+=2)ctx.lineTo(x,subrasanteY+getDeformacion(x,3));
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.05)';
    for(let xx=0;xx<W;xx+=12)for(let yS=subrasanteY;yS<H;yS+=8)ctx.fillRect(xx,yS,1,6);

    const s=obtenerSugerencia();
    const W18m=pf.W18/1e6;
    ctx.fillStyle='rgba(255,255,255,0.9)';ctx.font='bold 10px "IBM Plex Mono",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    const cY=subrasanteY+(subrasanteHeight/2)-10;
    ctx.fillText('SUBRASANTE  (Mr = '+pf.Mr+' MPa | CBR ≈ '+s.cbr.toFixed(2)+' | W18 = '+W18m.toFixed(1)+'M)',W/2,cY-12);
    ctx.font='bold 9px "IBM Plex Mono",monospace';ctx.fillStyle=s.color;
    ctx.fillText(s.emoji+' '+s.claseSeleccionada+' — '+s.app.label.split('(')[0].trim(),W/2,cY+12);
  } else {
    const ld=calculado?pr.D_losa:250,bd=calculado?pr.D_base:150;
    ctx.fillStyle='#8a8a82';ctx.fillRect(0,CY,W,32);
    ctx.strokeStyle='rgba(0,0,0,0.25)';ctx.lineWidth=1;
    for(let jx=0;jx<=W;jx+=120){ctx.beginPath();ctx.moveTo(jx,CY);ctx.lineTo(jx,CY+32);ctx.stroke();}
    ctx.fillStyle='#f59e0b';for(let jx=0;jx<=W;jx+=120){ctx.fillRect(jx-9,CY+15,18,3);}
    ctx.fillStyle='rgba(255,255,255,0.85)';ctx.font='bold 10px "IBM Plex Mono",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('LOSA DE CONCRETO  '+ld+' mm',W/2,CY+16);

    ctx.fillStyle='#7a5e30';ctx.beginPath();ctx.moveTo(0,CY+32);
    for(let x=0;x<=W;x+=2)ctx.lineTo(x,CY+32+getDeformacion(x,1));
    ctx.lineTo(W,CY+56);ctx.lineTo(0,CY+56);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.05)';
    for(let xx=0;xx<W;xx+=8)ctx.fillRect(xx,CY+32,1,24);
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 10px "IBM Plex Mono",monospace';
    ctx.fillText('BASE GRANULAR  '+bd+' mm',W/2,CY+44);

    const subrasanteY=CY+56,subrasanteHeight=H-subrasanteY;
    ctx.fillStyle='#4a5a3a';ctx.beginPath();ctx.moveTo(0,subrasanteY);
    for(let x=0;x<=W;x+=2)ctx.lineTo(x,subrasanteY+getDeformacion(x,2));
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.05)';
    for(let xx=0;xx<W;xx+=12)for(let yS=subrasanteY;yS<H;yS+=8)ctx.fillRect(xx,yS,1,6);

    const s=obtenerSugerencia();
    const W18m=pr.W18/1e6;
    ctx.fillStyle='rgba(255,255,255,0.9)';ctx.font='bold 10px "IBM Plex Mono",monospace';
    const cY=subrasanteY+(subrasanteHeight/2)-10;
    ctx.fillText('SUBRASANTE  (k = '+pr.k+' MN/m³ | CBR ≈ '+s.cbr.toFixed(2)+' | W18 = '+W18m.toFixed(1)+'M)',W/2,cY-12);
    ctx.font='bold 9px "IBM Plex Mono",monospace';ctx.fillStyle=s.color;
    ctx.fillText(s.emoji+' '+s.claseSeleccionada+' — '+s.app.label.split('(')[0].trim(),W/2,cY+12);
  }

  const speed1=0.70,speed3=0.40;
  let x1=W+120-((animT*speed1)%(W+240));
  let x3=W+120-((animT*speed3)%(W+240));
  const vehicleY=CY+10;
  drawEmoji(x1,vehicleY,'🚌',48,'🚍 Bus');
  drawEmoji(truckX,vehicleY+2,'🚛',48,'🚚 Tractocamión');
  drawEmoji(x3-300,vehicleY+2,'🚗',40,'🚘 Auto');
}

function loop(){animT+=1;nubeOff=(nubeOff+0.45)%(W+140);drawScene();requestAnimationFrame(loop);}
loop();
setMetodo('esal');
}
