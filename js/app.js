
// Acceso publico: la calculadora no requiere contrasena ni registro.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const W = 900, H = 260;

let tipo = 'flexible';
let metodo = 'esal';
let calculado = false;
let animT = 0, nubeOff = 0;

let pf = {
  W18: 5e6, R: 90, So: 0.45, deltaPSI: 1.9,
  pt: 2.0, p0: 4.2, Mr: 69,
  SN_req: 0, SN_prov: 0,
  capas: [
    { nom: "Carpeta AC", a: 0.44, m: 1.0, D: 150, col: '#2a2a2f' },
    { nom: "Base granular", a: 0.14, m: 1.0, D: 200, col: '#8b6f3a' },
    { nom: "Subbase gran.", a: 0.11, m: 1.0, D: 180, col: '#c4a46a' },
  ]
};

let pr = {
  W18: 5e6, R: 90, So: 0.35, deltaPSI: 2.3,
  pt: 2.0, p0: 4.5,
  Ec: 27579, Sc: 4.5, Cd: 1.0, J: 3.2, k: 54.0,
  D_losa: 250, D_base: 150
};

let transito = {
    TPD: 5000,
    factorCamion: 0.15,
    factorCrec: 0.03,
    anios: 20,
    factorEjes: 0.8,
    factorDireccional: 0.50,
    carril: 0.50
};

let vehiculos = {
    bus: 200,
    c2: 150,
    c3: 100,
    c4: 80,
    c5: 60,
    c6: 40
};

let factoresEjes = {
  bus: 0.80,
  c2: 0.80,
  c3: 0.80,
  c4: 0.80,
  c5: 0.80,
  c6: 0.80
};

let resumenTransito = null;
function setStatus(msg, cls) {
  const el = document.getElementById('status-txt');
  el.innerHTML = cls ? `<span class="${cls}">${msg}</span>` : msg;
}

function setTipo(t) {
  tipo = t;
  calculado = false;
  document.getElementById('btn-flex').classList.toggle('active', t === 'flexible');
  document.getElementById('btn-rig').classList.toggle('active', t === 'rigido');
  document.getElementById('hdr-tipo').textContent = t.toUpperCase();
  setStatus('Modo cambiado a: ' + t.toUpperCase(), 'info');
  const pp = document.getElementById('params-panel');
  if (pp.style.display === 'block') renderParams();
  document.getElementById('results-panel').style.display = 'none';
}

function setMetodo(m) {
  metodo = m;
  document.getElementById('metodo-esal').classList.toggle('active', m === 'esal');
  document.getElementById('metodo-transito').classList.toggle('active', m === 'transito');
  document.getElementById('transito-params').style.display = (m === 'transito') ? 'block' : 'none';
  renderParams();
  setStatus('Método: ' + (m === 'esal' ? 'ESAL (W18)' : 'Tránsito → ESAL'), 'info');
}

function togglePanel(id) {
  const el = document.getElementById(id);
  const open = el.style.display === 'block';
  el.style.display = open ? 'none' : 'block';
  if (!open && id === 'params-panel') renderParams();
  if (!open && id === 'results-panel') {
    if (!calculado) { setStatus('Primero presione Calcular.', 'err'); el.style.display = 'none'; return; }
    renderResults();
  }
}

function entrarApp() {
  document.getElementById('app')?.scrollIntoView({behavior:'smooth', block:'start'});
}

function calcularESALdesdeTransito() {

  const TPD = Number(transito.TPD);
  const factorCamion = Number(transito.factorCamion);
  const factorCrec = Number(transito.factorCrec);
  const anios = Number(transito.anios);
  const factorEjes = Number(transito.factorEjes);
  const factorDireccional = Number(transito.factorDireccional);
  const factorCarril = Number(transito.carril);

  // Validacion de datos
  if (
    !Number.isFinite(TPD) ||
    !Number.isFinite(factorCamion) ||
    !Number.isFinite(factorCrec) ||
    !Number.isFinite(anios) ||
    !Number.isFinite(factorEjes) ||
    !Number.isFinite(factorDireccional) ||
    !Number.isFinite(factorCarril)
  ) {
    setStatus('Revise los datos de transito ingresados.', 'err');
    return null;
  }

  if (TPD <= 0) {
    setStatus('El TPD debe ser mayor que cero.', 'err');
    return null;
  }

  if (factorCamion < 0 || factorCamion > 1) {
    setStatus('El porcentaje de vehiculos comerciales debe estar entre 0 y 100%.', 'err');
    return null;
  }

  if (factorCrec <= -1) {
    setStatus('La tasa de crecimiento no puede ser menor o igual a -100%.', 'err');
    return null;
  }

  if (anios <= 0) {
    setStatus('El periodo de diseño debe ser mayor que cero.', 'err');
    return null;
  }

  if (factorEjes <= 0) {
    setStatus('El factor de ejes equivalentes debe ser mayor que cero.', 'err');
    return null;
  }

  if (factorDireccional <= 0 || factorDireccional > 1) {
    setStatus('El factor de distribucion direccional debe estar entre 0 y 1.', 'err');
    return null;
  }

  if (factorCarril <= 0 || factorCarril > 1) {
    setStatus('El factor de distribucion por carril debe estar entre 0 y 1.', 'err');
    return null;
  }

  // Factor de crecimiento acumulado
  let factorCrecimiento;

  if (factorCrec > 0) {
    factorCrecimiento =
      (Math.pow(1 + factorCrec, anios) - 1) / factorCrec;
  } else {
    factorCrecimiento = anios;
  }

  // Vehiculos comerciales diarios
  const vehiculosComercialesDia =
    TPD * factorCamion;

  // W18 acumulado de diseño
  const W18 =
  vehiculosComercialesDia *
  365 *
  factorCrecimiento *
  factorDireccional *
  factorCarril *
  factorEjes;

resumenTransito = {
  TPD: TPD,
  porcentajeComercial: factorCamion,
  vehiculosComercialesDia: vehiculosComercialesDia,
  tasaCrecimiento: factorCrec,
  anios: anios,
  factorCrecimiento: factorCrecimiento,
  factorDireccional: factorDireccional,
  factorCarril: factorCarril,
  factorEjes: factorEjes,
  W18: Math.round(W18)
};

return Math.round(W18);

function renderParams() {
  const grid = document.getElementById('params-grid');
  const fbox = document.getElementById('formula-box');
  document.getElementById('params-title').textContent = 'Parámetros – ' + tipo;

  let fields = [];
  const mostrarW18 = (metodo === 'esal');

  if (tipo === 'flexible') {
    fields = [
      { k: 'W18', label: 'W18 — Ejes equivalentes (ESAL)', val: pf.W18, cb: v => pf.W18 = v, hidden: !mostrarW18 },
      { k: 'R', label: 'R — Confiabilidad (%)', val: pf.R, cb: v => pf.R = v },
      { k: 'So', label: 'So — Desviación estándar combinada', val: pf.So, cb: v => pf.So = v },
      { k: 'dPSI', label: 'ΔPSI — Pérdida de serviciabilidad', val: pf.deltaPSI, cb: v => pf.deltaPSI = v },
      { k: 'Mr', label: 'Mr — Módulo resiliente subrasante (MPa)', val: pf.Mr, cb: v => pf.Mr = v },
      { k: 'a1', label: 'a₁ — Coef. capa 1 (AC)', val: pf.capas[0].a, cb: v => pf.capas[0].a = v },
      { k: 'a2', label: 'a₂ — Coef. capa 2 (base)', val: pf.capas[1].a, cb: v => pf.capas[1].a = v },
      { k: 'a3', label: 'a₃ — Coef. capa 3 (subbase)', val: pf.capas[2].a, cb: v => pf.capas[2].a = v },
      { k: 'm1', label: 'm₁ — Coef. drenaje capa 1', val: pf.capas[0].m, cb: v => pf.capas[0].m = v },
      { k: 'm2', label: 'm₂ — Coef. drenaje capa 2', val: pf.capas[1].m, cb: v => pf.capas[1].m = v },
      { k: 'm3', label: 'm₃ — Coef. drenaje capa 3', val: pf.capas[2].m, cb: v => pf.capas[2].m = v },
    ];
    fbox.innerHTML = `<h4>Ecuación AASHTO-93 — Pavimento Flexible</h4>
<p>log(W18) = ZR·So + 9.36·log(SN+1) − 0.20 + log(ΔPSI/2.7) / [0.40 + 1094/(SN+1)⁵·¹⁹] + 2.32·log(Mr) − 8.07</p>`;
  } else {
    fields = [
      { k: 'W18', label: 'W18 — Ejes equivalentes (ESAL)', val: pr.W18, cb: v => pr.W18 = v, hidden: !mostrarW18 },
      { k: 'R', label: 'R — Confiabilidad (%)', val: pr.R, cb: v => pr.R = v },
      { k: 'So', label: 'So — Desviación estándar combinada', val: pr.So, cb: v => pr.So = v },
      { k: 'dPSI', label: 'ΔPSI — Pérdida de serviciabilidad', val: pr.deltaPSI, cb: v => pr.deltaPSI = v },
      { k: 'Ec', label: 'Ec — Módulo elástico concreto (MPa)', val: pr.Ec, cb: v => pr.Ec = v },
      { k: 'Sc', label: 'Sc — Módulo de rotura (MPa)', val: pr.Sc, cb: v => pr.Sc = v },
      { k: 'k', label: 'k — Reacción de subrasante (MN/m³)', val: pr.k, cb: v => pr.k = v },
      { k: 'J', label: 'J — Coef. transferencia de carga', val: pr.J, cb: v => pr.J = v },
      { k: 'Cd', label: 'Cd — Coef. drenaje', val: pr.Cd, cb: v => pr.Cd = v },
    ];
    fbox.innerHTML = `<h4>Ecuación AASHTO-93 — Pavimento Rígido</h4>
<p>log(W18) = ZR·So + 7.35·log(D+1) − 0.06 + log(ΔPSI/3.0) / [1 + 1.624×10⁷/(D+1)⁸·⁴⁶] + (4.22 − 0.32·pt)·log[ Sc·Cd·(D⁰·⁷⁵−1.132) / (215.63·J·(D⁰·⁷⁵ − 18.42/(Ec/k)⁰·²⁵)) ]</p>`;
  }

  grid.innerHTML = '';
  fields.forEach(f => {
    if (f.hidden) {
      const d = document.createElement('div');
      d.className = 'param-row';
      d.style.display = 'none';
      d.innerHTML = `<label>${f.label}</label><input type="number" value="${f.val}" step="any">`;
      grid.appendChild(d);
      d.querySelector('input').addEventListener('change', e => { const v = parseFloat(e.target.value); if (!isNaN(v)) f.cb(v); });
      return;
    }
    const d = document.createElement('div');
    d.className = 'param-row';
    d.innerHTML = `<label>${f.label}</label><input type="number" value="${f.val}" step="any">`;
    grid.appendChild(d);
    d.querySelector('input').addEventListener('change', e => { const v = parseFloat(e.target.value); if (!isNaN(v)) f.cb(v); });
  });

  renderTransitoParams();
  renderVehiculosGrid();
}

function renderTransitoParams() {
  const grid = document.getElementById('transito-grid');

  if (!grid) return;

  const fields = [
    {
      k: 'TPD',
      label: 'TPD — Tránsito promedio diario (veh/día)',
      val: transito.TPD,
      cb: v => transito.TPD = v
    },
    {
      k: 'factorCamion',
      label: '% de vehículos comerciales',
      val: transito.factorCamion * 100,
      cb: v => transito.factorCamion = v / 100
    },
    {
      k: 'factorCrec',
      label: 'Tasa de crecimiento anual (%)',
      val: transito.factorCrec * 100,
      cb: v => transito.factorCrec = v / 100
    },
    {
      k: 'anios',
      label: 'Período de diseño (años)',
      val: transito.anios,
      cb: v => transito.anios = v
    },
    {
      k: 'factorDireccional',
      label: 'Factor de distribución direccional',
      val: transito.factorDireccional,
      cb: v => transito.factorDireccional = v
    },
    {
      k: 'factorEjes',
      label: 'Factor de ejes equivalentes promedio',
      val: transito.factorEjes,
      cb: v => transito.factorEjes = v
    },
    {
      k: 'carril',
      label: 'Factor de distribución por carril',
      val: transito.carril,
      cb: v => transito.carril = v
    }
  ];

  grid.innerHTML = '';

  fields.forEach(f => {
    const d = document.createElement('div');
    d.className = 'param-row';

    d.innerHTML = `
      <label>${f.label}</label>
      <input
        type="number"
        value="${f.val}"
        step="any"
      >
    `;

    grid.appendChild(d);

    d.querySelector('input').addEventListener('change', e => {
      const v = parseFloat(e.target.value);

      if (!isNaN(v)) {
        f.cb(v);
      }
    });
  });
}
function renderVehiculosGrid() {
  const grid = document.getElementById('vehiculos-grid');
  const tipos = [{ k: 'bus', label: 'Bus' }, { k: 'c2', label: 'C2' }, { k: 'c3', label: 'C3' }, { k: 'c4', label: 'C4' }, { k: 'c5', label: 'C5' }, { k: 'c6', label: 'C6' }];
  grid.innerHTML = '';
  tipos.forEach(t => {
    const d = document.createElement('div');
    d.className = 'param-row';
    d.innerHTML = `<label>${t.label}</label><input type="number" value="${vehiculos[t.k]}" step="1" min="0">`;
    grid.appendChild(d);
    d.querySelector('input').addEventListener('change', e => { vehiculos[t.k] = parseInt(e.target.value) || 0; actualizarTotalVehiculos(); });
  });
  actualizarTotalVehiculos();
}

function actualizarTotalVehiculos() {
  const total = Object.values(vehiculos).reduce((a,b) => a + b, 0);
  document.getElementById('total-vehiculos').textContent = `Total vehículos comerciales: ${total}`;
}

function getZR(R) {
  const map = { 50: 0, 75: -0.674, 80: -0.842, 85: -1.036, 90: -1.282, 91: -1.340, 92: -1.405, 93: -1.476, 94: -1.555, 95: -1.645, 96: -1.751, 97: -1.881, 98: -2.054, 99: -2.326, 99.9: -3.090 };
  const keys = Object.keys(map).map(Number).sort((a,b)=>a-b);
  for (let i = keys.length-1; i >= 0; i--) { if (R >= keys[i]) return map[keys[i]]; }
  return -1.282;
}

function calcular() {
  if (metodo === 'transito') {
    const esal = calcularESALdesdeTransito();
    if (tipo === 'flexible') pf.W18 = esal;
    else pr.W18 = esal;
    setStatus('ESAL calculado desde tránsito: ' + esal.toExponential(2), 'info');
  }
  if (tipo === 'flexible') calcularFlexible();
  else calcularRigido();
  calculado = true;
  const rp = document.getElementById('results-panel');
  if (rp.style.display === 'block') renderResults();
  setStatus('✅ Cálculo completado.', 'ok');
}

function calcularFlexible() {
  const ZR = getZR(pf.R);
  const logW18 = Math.log10(pf.W18);
  const logMr = Math.log10(pf.Mr * 145.038);
  let SN = 4.0;
  for (let i = 0; i < 500; i++) {
    const rhs = ZR * pf.So + 9.36 * Math.log10(SN + 1) - 0.20 + Math.log10(pf.deltaPSI / 2.7) / (0.40 + 1094 / Math.pow(SN + 1, 5.19)) + 2.32 * logMr - 8.07;
    const err = rhs - logW18;
    if (Math.abs(err) < 0.0005) break;
    SN -= err * 0.35;
    if (SN < 0.5) SN = 0.5;
  }
  pf.SN_req = Math.max(1.0, parseFloat(SN.toFixed(3)));
  const [a1,a2,a3] = pf.capas.map(c=>c.a);
  const [m1,m2,m3] = pf.capas.map(c=>c.m);
  const D1_in = Math.ceil((pf.SN_req * 0.45) / (a1 * m1) * 10) / 10;
  const D1_mm = Math.max(50, Math.ceil(D1_in * 25.4 / 5) * 5);
  const SN1 = a1 * m1 * (D1_mm / 25.4);
  const SN_rem1 = Math.max(0, pf.SN_req - SN1);
  const D2_in = SN_rem1 > 0 ? Math.ceil(SN_rem1 / (a2 * m2) * 10) / 10 : 0;
  const D2_mm = Math.max(100, Math.ceil(D2_in * 25.4 / 5) * 5);
  const SN2 = a2 * m2 * (D2_mm / 25.4);
  const SN_rem2 = Math.max(0, pf.SN_req - SN1 - SN2);
  const D3_in = SN_rem2 > 0 ? Math.ceil(SN_rem2 / (a3 * m3) * 10) / 10 : 0;
  const D3_mm = Math.max(100, Math.ceil(D3_in * 25.4 / 5) * 5);
  pf.capas[0].D = D1_mm;
  pf.capas[1].D = D2_mm;
  pf.capas[2].D = D3_mm;
  pf.SN_prov = parseFloat((a1*m1*(D1_mm/25.4) + a2*m2*(D2_mm/25.4) + a3*m3*(D3_mm/25.4)).toFixed(3));
}

function calcularRigido() {
  const ZR = getZR(pr.R);
  const logW18 = Math.log10(pr.W18);
  const Sc_psi = pr.Sc * 145.038;
  const Ec_psi = pr.Ec * 145.038;
  const k_pci = pr.k * 3.6839;
  let D = 9.0;
  for (let i = 0; i < 500; i++) {
    const PSI_term = Math.log10(pr.deltaPSI / (4.5 - 1.5));
    const denom1 = 1 + 1.624e7 / Math.pow(D + 1, 8.46);
    const inner = Sc_psi * pr.Cd * (Math.pow(D, 0.75) - 1.132) / (215.63 * pr.J * (Math.pow(D, 0.75) - 18.42 / Math.pow(Ec_psi / k_pci, 0.25)));
    if (inner <= 0) { D += 0.5; continue; }
    const rhs = ZR * pr.So + 7.35 * Math.log10(D + 1) - 0.06 + PSI_term / denom1 + (4.22 - 0.32 * pr.pt) * Math.log10(inner);
    const err = rhs - logW18;
    if (Math.abs(err) < 0.0005) break;
    D -= err * 0.3;
    if (D < 4) D = 4;
  }
  pr.D_losa = Math.max(100, Math.ceil(D * 25.4 / 5) * 5);
  pr.D_base = 150;
}

function obtenerSugerencia() {
  let sugerencia = "";
  let color = "";
  let detalleNorma = "";
  let especificacion = "";
  let tituloEspecificacion = "";

  if (tipo === 'flexible') {
    const W18_millones = pf.W18 / 1e6;
    
    if (pf.Mr < 30 || (pf.Mr < 50 && W18_millones > 20)) {
      sugerencia = "⚠️ REQUIERE ESTABILIZACIÓN";
      color = "#ef4444";
      tituloEspecificacion = "Estabilización química + Geotextil Clase 4A (AASHTO M 288)";
      especificacion = `
        <strong>1. ESTABILIZACIÓN QUÍMICA:</strong><br>
        • <strong>Cal viva (CaO):</strong> Dosis 2-6% en peso seco. Ensayo: ASTM D6276 (pH Eades-Grim).<br>
        • <strong>Cemento Portland (OPC):</strong> Dosis 6-16% en peso seco. Ensayo: ASTM D1633 (compresión inconfinada).<br>
        • <strong>Resistencia mínima a 7 días:</strong> ≥ 0.7 MPa (cal), ≥ 1.4 MPa (cemento) según AASHTO T 220.<br><br>
        <strong>2. GEOTEXTIL CLASE 4A (AASHTO M 288):</strong><br>
        • Resistencia a la tracción (ASTM D4632): ≥ 700 N<br>
        • Resistencia al punzonamiento (ASTM D4833): ≥ 350 N<br>
        • Resistencia al desgarre trapezoidal (ASTM D4533): ≥ 250 N<br>
        • Elongación (ASTM D4632): ≥ 50%<br>
        • Polímero: Polipropileno (PP) o Poliéster (PET) no tejido<br>
        • Estabilización UV: ≥ 70% retención a 500 h (ASTM D4355)<br>
        • Permeabilidad (ASTM D4491): ≥ 0.02 cm/s
      `;
      detalleNorma = `Suelo con Mr < 30 MPa o Mr < 50 MPa con tránsito > 20M ESAL. Según AASHTO M 288 y ASTM D6276, se requiere estabilización química más Geotextil Clase 4A para separación y refuerzo.`;
    } else if (pf.Mr < 50 || (pf.Mr < 70 && W18_millones > 15)) {
      sugerencia = "🔶 RECOMENDADO GEOSINTÉTICO";
      color = "#f59e0b";
      tituloEspecificacion = "Geomalla Biaxial (ASTM D6637) o Geotextil Clase 2 (AASHTO M 288)";
      especificacion = `
        <strong>OPCIÓN A — GEOMALLA BIAXIAL (ASTM D6637):</strong><br>
        • Resistencia a la tensión al 2% elongación: ≥ 4.1 kN/m (long), ≥ 6.6 kN/m (trans)<br>
        • Resistencia a la tensión al 5% elongación: ≥ 8.5 kN/m (long), ≥ 13.4 kN/m (trans)<br>
        • Resistencia última a la tensión: ≥ 12.4 kN/m (long), ≥ 19.0 kN/m (trans)<br>
        • Resistencia a la tensión de nodos: ≥ 11.5 kN/m (long), ≥ 17.6 kN/m (trans)<br>
        • Módulo de rigidez: ≥ 200 kN/m<br>
        • Abertura de malla: 25-50 mm<br>
        • Polímero: Polipropileno (PP) o Poliéster (PET) recubierto<br><br>
        <strong>OPCIÓN B — GEOTEXTIL CLASE 2 (AASHTO M 288):</strong><br>
        • Resistencia a la tracción (ASTM D4632): ≥ 450 N<br>
        • Resistencia al punzonamiento (ASTM D4833): ≥ 250 N<br>
        • Resistencia al desgarre trapezoidal (ASTM D4533): ≥ 150 N<br>
        • Elongación (ASTM D4632): ≥ 50%<br>
        • Polímero: Polipropileno (PP) no tejido
      `;
      detalleNorma = `Suelo con Mr entre 30-50 MPa o Mr 50-70 MPa con tránsito > 15M ESAL. Según metodología Giroud-Han y AASHTO M 288, se recomienda Geomalla biaxial o Geotextil Clase 2.`;
    } else if (pf.Mr < 70 || W18_millones > 10) {
      sugerencia = "ℹ️ SUGERIDO GEOTEXTIL DE SEPARACIÓN";
      color = "#60a5fa";
      tituloEspecificacion = "Geotextil Clase 3 (AASHTO M 288)";
      especificacion = `
        <strong>GEOTEXTIL CLASE 3 (AASHTO M 288):</strong><br>
        • Resistencia a la tracción (ASTM D4632): ≥ 250 N<br>
        • Resistencia al punzonamiento (ASTM D4833): ≥ 150 N<br>
        • Resistencia al desgarre trapezoidal (ASTM D4533): ≥ 100 N<br>
        • Elongación (ASTM D4632): ≥ 50%<br>
        • Permeabilidad (ASTM D4491): ≥ 0.02 cm/s<br>
        • Tamaño de abertura aparente (ASTM D4751): ≤ 0.43 mm<br>
        • Polímero: Polipropileno (PP) no tejido<br>
        • Estabilización UV: ≥ 70% retención a 500 h (ASTM D4355)
      `;
      detalleNorma = `Suelo con Mr entre 50-70 MPa o tránsito > 10M ESAL. Según AASHTO M 288, se sugiere Geotextil Clase 3 para separación y filtración.`;
    } else {
      sugerencia = "✅ SUELO ADECUADO";
      color = "#22c55e";
      tituloEspecificacion = "No requiere refuerzo";
      especificacion = `Suelo con Mr > 70 MPa. CBR > 15%. No requiere estabilización ni geosintéticos según AASHTO-93.`;
      detalleNorma = `Mr > 70 MPa y tránsito < 10M ESAL. No requiere refuerzo según AASHTO-93. CBR > 15%.`;
    }
  } else {
    const W18_millones_rig = pr.W18 / 1e6;
    
    if (pr.k < 30 || (pr.k < 45 && W18_millones_rig > 20)) {
      sugerencia = "⚠️ REQUIERE ESTABILIZACIÓN";
      color = "#ef4444";
      tituloEspecificacion = "Estabilización química + Geotextil Clase 4A (AASHTO M 288)";
      especificacion = `
        <strong>1. ESTABILIZACIÓN QUÍMICA:</strong><br>
        • <strong>Cal viva (CaO):</strong> Dosis 2-6% en peso seco. Ensayo: ASTM D6276 (pH Eades-Grim).<br>
        • <strong>Cemento Portland (OPC):</strong> Dosis 6-16% en peso seco. Ensayo: ASTM D1633.<br>
        • <strong>Resistencia mínima a 7 días:</strong> ≥ 0.7 MPa (cal), ≥ 1.4 MPa (cemento) según AASHTO T 220.<br><br>
        <strong>2. GEOTEXTIL CLASE 4A (AASHTO M 288):</strong><br>
        • Resistencia a la tracción (ASTM D4632): ≥ 700 N<br>
        • Resistencia al punzonamiento (ASTM D4833): ≥ 350 N<br>
        • Resistencia al desgarre trapezoidal (ASTM D4533): ≥ 250 N<br>
        • Elongación (ASTM D4632): ≥ 50%<br>
        • Polímero: Polipropileno (PP) o Poliéster (PET) no tejido<br>
        • Estabilización UV: ≥ 70% retención a 500 h (ASTM D4355)
      `;
      detalleNorma = `Suelo con k < 30 MN/m³ o k < 45 MN/m³ con tránsito > 20M ESAL. Según AASHTO M 288 y ASTM D6276, se requiere estabilización química más Geotextil Clase 4A.`;
    } else if (pr.k < 45 || (pr.k < 60 && W18_millones_rig > 15)) {
      sugerencia = "🔶 RECOMENDADO GEOSINTÉTICO";
      color = "#f59e0b";
      tituloEspecificacion = "Geomalla Biaxial (ASTM D6637) o Geotextil Clase 2 (AASHTO M 288)";
      especificacion = `
        <strong>OPCIÓN A — GEOMALLA BIAXIAL (ASTM D6637):</strong><br>
        • Resistencia a la tensión al 2% elongación: ≥ 4.1 kN/m (long), ≥ 6.6 kN/m (trans)<br>
        • Resistencia a la tensión al 5% elongación: ≥ 8.5 kN/m (long), ≥ 13.4 kN/m (trans)<br>
        • Resistencia última a la tensión: ≥ 12.4 kN/m (long), ≥ 19.0 kN/m (trans)<br>
        • Resistencia a la tensión de nodos: ≥ 11.5 kN/m (long), ≥ 17.6 kN/m (trans)<br>
        • Módulo de rigidez: ≥ 200 kN/m<br>
        • Abertura de malla: 25-50 mm<br>
        • Polímero: Polipropileno (PP) o Poliéster (PET) recubierto<br><br>
        <strong>OPCIÓN B — GEOTEXTIL CLASE 2 (AASHTO M 288):</strong><br>
        • Resistencia a la tracción (ASTM D4632): ≥ 450 N<br>
        • Resistencia al punzonamiento (ASTM D4833): ≥ 250 N<br>
        • Resistencia al desgarre trapezoidal (ASTM D4533): ≥ 150 N
      `;
      detalleNorma = `Suelo con k entre 30-45 MN/m³ o k 45-60 MN/m³ con tránsito > 15M ESAL. Según Giroud-Han y AASHTO M 288, se recomienda Geomalla biaxial o Geotextil Clase 2.`;
    } else if (pr.k < 60 || W18_millones_rig > 10) {
      sugerencia = "ℹ️ SUGERIDO GEOTEXTIL DE SEPARACIÓN";
      color = "#60a5fa";
      tituloEspecificacion = "Geotextil Clase 3 (AASHTO M 288)";
      especificacion = `
        <strong>GEOTEXTIL CLASE 3 (AASHTO M 288):</strong><br>
        • Resistencia a la tracción (ASTM D4632): ≥ 250 N<br>
        • Resistencia al punzonamiento (ASTM D4833): ≥ 150 N<br>
        • Resistencia al desgarre trapezoidal (ASTM D4533): ≥ 100 N<br>
        • Elongación (ASTM D4632): ≥ 50%<br>
        • Permeabilidad (ASTM D4491): ≥ 0.02 cm/s<br>
        • Tamaño de abertura aparente (ASTM D4751): ≤ 0.43 mm<br>
        • Polímero: Polipropileno (PP) no tejido
      `;
      detalleNorma = `Suelo con k entre 45-60 MN/m³ o tránsito > 10M ESAL. Según AASHTO M 288, se sugiere Geotextil Clase 3.`;
    } else {
      sugerencia = "✅ SUELO ADECUADO";
      color = "#22c55e";
      tituloEspecificacion = "No requiere refuerzo";
      especificacion = `Suelo con k > 60 MN/m³. No requiere estabilización ni geosintéticos según AASHTO-93.`;
      detalleNorma = `k > 60 MN/m³ y tránsito < 10M ESAL. No requiere refuerzo según AASHTO-93.`;
    }
  }
  return { sugerencia, color, detalleNorma, especificacion, tituloEspecificacion };
}

function renderResults() {
  const grid = document.getElementById('res-grid');
  const tbl = document.getElementById('capas-table');
  const sugDiv = document.getElementById('sugerencia-resultado');
  document.getElementById('res-title').textContent = 'Resultados — ' + tipo + (metodo === 'transito' ? ' (desde tránsito)' : '');
  
  const { sugerencia, color, detalleNorma, especificacion, tituloEspecificacion } = obtenerSugerencia();

  if (tipo === 'flexible') {
    grid.innerHTML = `
      <div class="res-card"><div class="lbl">W18 (ESAL)</div><div class="val">${pf.W18.toExponential(2)}</div></div>
      <div class="res-card"><div class="lbl">Confiabilidad</div><div class="val">${pf.R}%</div></div>
      <div class="res-card"><div class="lbl">Mr subrasante</div><div class="val">${pf.Mr} MPa</div></div>
      <div class="res-card"><div class="lbl">ΔPSI</div><div class="val">${pf.deltaPSI}</div></div>
      <div class="res-card"><div class="lbl">SN requerido</div><div class="val">${pf.SN_req.toFixed(3)}</div></div>
      <div class="res-card"><div class="lbl">SN provisto</div><div class="val highlight">${pf.SN_prov.toFixed(3)}</div></div>
      ${metodo === 'transito' ? `<div class="res-card"><div class="lbl">Método</div><div class="val" style="font-size:12px;color:var(--amber);">Tránsito → ESAL</div></div>` : ''}
    `;
    tbl.innerHTML = `
      <tr><th>Capa</th><th>a</th><th>m</th><th>Espesor</th><th>in</th><th>Aporte SN</th></tr>
      ${pf.capas.map(c => `<tr><td><span class="swatch" style="background:${c.col}"></span>${c.nom}</td><td>${c.a}</td><td>${c.m}</td><td class="val-mm">${c.D} mm</td><td class="val-in">${(c.D/25.4).toFixed(2)}</td><td>${(c.a*c.m*(c.D/25.4)).toFixed(3)}</td></tr>`).join('')}
      <tr style="background:rgba(59,130,246,0.05)"><td colspan="5" style="text-align:right;font-weight:600">SN total provisto</td><td style="color:var(--green);font-weight:600">${pf.SN_prov.toFixed(3)}</td></tr>
    `;
  } else {
    grid.innerHTML = `
      <div class="res-card"><div class="lbl">W18 (ESAL)</div><div class="val">${pr.W18.toExponential(2)}</div></div>
      <div class="res-card"><div class="lbl">Confiabilidad</div><div class="val">${pr.R}%</div></div>
      <div class="res-card"><div class="lbl">Ec concreto</div><div class="val">${pr.Ec} MPa</div></div>
      <div class="res-card"><div class="lbl">k subrasante</div><div class="val">${pr.k} MN/m³</div></div>
      <div class="res-card"><div class="lbl">D losa</div><div class="val highlight">${pr.D_losa} mm</div><div class="sub">${(pr.D_losa/25.4).toFixed(2)} in</div></div>
      <div class="res-card"><div class="lbl">D base</div><div class="val">${pr.D_base} mm</div></div>
      ${metodo === 'transito' ? `<div class="res-card"><div class="lbl">Método</div><div class="val" style="font-size:12px;color:var(--amber);">Tránsito → ESAL</div></div>` : ''}
    `;
    tbl.innerHTML = `
      <tr><th>Capa</th><th>Descripción</th><th>Espesor (mm)</th><th>in</th><th>Parámetro</th></tr>
      <tr><td><span class="swatch" style="background:#9ca3af"></span>Losa</td><td>Concreto hidráulico</td><td class="val-mm">${pr.D_losa} mm</td><td class="val-in">${(pr.D_losa/25.4).toFixed(2)}</td><td>Ec = ${pr.Ec} MPa</td></tr>
      <tr><td><span class="swatch" style="background:#8b6f3a"></span>Base</td><td>Base granular</td><td class="val-mm">${pr.D_base} mm</td><td class="val-in">${(pr.D_base/25.4).toFixed(2)}</td><td>k = ${pr.k} MN/m³</td></tr>
      <tr style="background:rgba(59,130,246,0.05)"><td colspan="4" style="text-align:right;font-weight:600">Subrasante</td><td style="color:var(--text2);">k = ${pr.k} MN/m³</td></tr>
    `;
  }

  sugDiv.innerHTML = `
    <div style="color:${color}; font-weight:600; font-size:13px; margin-bottom:8px;">${sugerencia}</div>
    <div style="color:var(--text); font-size:11px; margin-bottom:10px;"><strong>${tituloEspecificacion}</strong></div>
    <div style="color:var(--text2); font-size:10px; line-height:1.7; margin-bottom:12px;">${detalleNorma}</div>
    <div style="color:var(--text2); font-size:10px; line-height:1.8; padding-top:10px; border-top:1px solid ${color}30;">${especificacion}</div>
  `;
  sugDiv.style.background = color + '12';
  sugDiv.style.borderLeft = `4px solid ${color}`;
}

function generarInforme() {
  if (!calculado) {
    setStatus('⚠️ Primero presione Calcular para generar el informe.', 'err');
    return;
  }
  
  const { sugerencia, color, detalleNorma, especificacion, tituloEspecificacion } = obtenerSugerencia();
  const fecha = new Date().toLocaleString('es-CO', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
  
  let contenidoCapas = '';
  let resultadosHTML = '';
  let formulaHTML = '';
  let metodoTransitoHTML = '';
  
  if (tipo === 'flexible') {
    resultadosHTML = `
      <tr><td><strong>W18 (ESAL)</strong></td><td>${pf.W18.toExponential(4)}</td></tr>
      <tr><td><strong>Confiabilidad (R)</strong></td><td>${pf.R}%</td></tr>
      <tr><td><strong>Desviación estándar (So)</strong></td><td>${pf.So}</td></tr>
      <tr><td><strong>ΔPSI</strong></td><td>${pf.deltaPSI}</td></tr>
      <tr><td><strong>Mr subrasante</strong></td><td>${pf.Mr} MPa</td></tr>
      <tr><td><strong>SN requerido</strong></td><td>${pf.SN_req.toFixed(3)}</td></tr>
      <tr><td><strong>SN provisto</strong></td><td>${pf.SN_prov.toFixed(3)}</td></tr>
    `;
    contenidoCapas = `
      <table class="info-table">
        <thead>
          <tr><th>Capa</th><th>Coef. a</th><th>Coef. m</th><th>Espesor (mm)</th><th>Espesor (in)</th><th>Aporte SN</th></tr>
        </thead>
        <tbody>
          ${pf.capas.map(c => `<tr><td>${c.nom}</td><td>${c.a}</td><td>${c.m}</td><td>${c.D}</td><td>${(c.D/25.4).toFixed(2)}</td><td>${(c.a*c.m*(c.D/25.4)).toFixed(3)}</td></tr>`).join('')}
          <tr style="font-weight:bold; background:#f0f0f0;"><td colspan="5" style="text-align:right;">SN TOTAL PROVISTO</td><td>${pf.SN_prov.toFixed(3)}</td></tr>
        </tbody>
      </table>
    `;
    formulaHTML = `
      <p><strong>Ecuación AASHTO-93 para pavimento flexible:</strong></p>
      <p class="formula">log(W18) = ZR·So + 9.36·log(SN+1) − 0.20 + log(ΔPSI/2.7) / [0.40 + 1094/(SN+1)⁵·¹⁹] + 2.32·log(Mr) − 8.07</p>
      <p>Donde:</p>
      <ul>
        <li><strong>W18:</strong> Número de ejes equivalentes de 8.2 t (ESAL)</li>
        <li><strong>ZR:</strong> Desviación normal estándar para el nivel de confiabilidad</li>
        <li><strong>So:</strong> Error estándar combinado de la predicción del tránsito</li>
        <li><strong>ΔPSI:</strong> Pérdida de serviciabilidad (p0 − pt)</li>
        <li><strong>SN:</strong> Número estructural requerido</li>
        <li><strong>Mr:</strong> Módulo resiliente efectivo de la subrasante (psi)</li>
      </ul>
    `;
  } else {
    resultadosHTML = `
      <tr><td><strong>W18 (ESAL)</strong></td><td>${pr.W18.toExponential(4)}</td></tr>
      <tr><td><strong>Confiabilidad (R)</strong></td><td>${pr.R}%</td></tr>
      <tr><td><strong>Desviación estándar (So)</strong></td><td>${pr.So}</td></tr>
      <tr><td><strong>ΔPSI</strong></td><td>${pr.deltaPSI}</td></tr>
      <tr><td><strong>Ec concreto</strong></td><td>${pr.Ec} MPa</td></tr>
      <tr><td><strong>Sc (módulo de rotura)</strong></td><td>${pr.Sc} MPa</td></tr>
      <tr><td><strong>k subrasante</strong></td><td>${pr.k} MN/m³</td></tr>
      <tr><td><strong>J (transferencia de carga)</strong></td><td>${pr.J}</td></tr>
      <tr><td><strong>Cd (drenaje)</strong></td><td>${pr.Cd}</td></tr>
      <tr><td><strong>Espesor de losa (D)</strong></td><td>${pr.D_losa} mm (${(pr.D_losa/25.4).toFixed(2)} in)</td></tr>
      <tr><td><strong>Espesor de base</strong></td><td>${pr.D_base} mm</td></tr>
    `;
    contenidoCapas = `
      <table class="info-table">
        <thead>
          <tr><th>Capa</th><th>Descripción</th><th>Espesor (mm)</th><th>Espesor (in)</th><th>Parámetro</th></tr>
        </thead>
        <tbody>
          <tr><td>Losa</td><td>Concreto hidráulico</td><td>${pr.D_losa}</td><td>${(pr.D_losa/25.4).toFixed(2)}</td><td>Ec = ${pr.Ec} MPa</td></tr>
          <tr><td>Base</td><td>Base granular</td><td>${pr.D_base}</td><td>${(pr.D_base/25.4).toFixed(2)}</td><td>k = ${pr.k} MN/m³</td></tr>
          <tr style="font-weight:bold; background:#f0f0f0;"><td colspan="4" style="text-align:right;">Subrasante</td><td>k = ${pr.k} MN/m³</td></tr>
        </tbody>
      </table>
    `;
    formulaHTML = `
      <p><strong>Ecuación AASHTO-93 para pavimento rígido:</strong></p>
      <p class="formula">log(W18) = ZR·So + 7.35·log(D+1) − 0.06 + log(ΔPSI/3.0) / [1 + 1.624×10⁷/(D+1)⁸·⁴⁶] + (4.22 − 0.32·pt)·log[ Sc·Cd·(D⁰·⁷⁵−1.132) / (215.63·J·(D⁰·⁷⁵ − 18.42/(Ec/k)⁰·²⁵)) ]</p>
      <p>Donde:</p>
      <ul>
        <li><strong>D:</strong> Espesor de la losa de concreto (in)</li>
        <li><strong>Sc:</strong> Módulo de rotura del concreto (psi)</li>
        <li><strong>Cd:</strong> Coeficiente de drenaje</li>
        <li><strong>J:</strong> Coeficiente de transferencia de carga</li>
        <li><strong>Ec:</strong> Módulo elástico del concreto (psi)</li>
        <li><strong>k:</strong> Módulo de reacción de la subrasante (pci)</li>
      </ul>
    `;
  }
  
  if (metodo === 'transito') {
    const totalComerciales = Object.values(vehiculos).reduce((a,b) => a + b, 0);
    metodoTransitoHTML = `
      <h2>4. Metodología de Tránsito</h2>
      <p>El W18 fue calculado a partir del conteo vehicular y los parámetros de tránsito:</p>
      <table class="info-table">
        <thead><tr><th>Parámetro</th><th>Valor</th></tr></thead>
        <tbody>
          <tr><td>Total vehículos comerciales (TPD)</td><td>${totalComerciales}</td></tr>
          <tr><td>% Camiones ponderado</td><td>${(transito.factorCamion*100).toFixed(2)}%</td></tr>
          <tr><td>Tasa de crecimiento anual</td><td>${(transito.factorCrec*100).toFixed(2)}%</td></tr>
          <tr><td>Período de diseño</td><td>${transito.anios} años</td></tr>
          <tr><td>Factor de ejes equivalentes</td><td>${transito.factorEjes}</td></tr>
          <tr><td>Factor de distribución por carril</td><td>${transito.carril}</td></tr>
          <tr style="font-weight:bold; background:#f0f0f0;"><td>W18 calculado</td><td>${(tipo === 'flexible' ? pf.W18 : pr.W18).toExponential(4)}</td></tr>
        </tbody>
      </table>
      <p><strong>Fórmula aplicada:</strong></p>
      <p class="formula">W18 = TPD × 365 × %Camiones × FactorEjes × FactorCarril × [(1+i)ⁿ − 1] / i</p>
    `;
  } else {
    metodoTransitoHTML = `
      <h2>4. Metodología de Tránsito</h2>
      <p>El valor de W18 fue ingresado directamente como dato de entrada:</p>
      <p class="formula">W18 = ${(tipo === 'flexible' ? pf.W18 : pr.W18).toExponential(4)} ESAL</p>
    `;
  }
  
  const informeHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Técnico — Diseño de Pavimento AASHTO-93</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'IBM Plex Sans', sans-serif;
    background: #fff;
    color: #1a1a1a;
    line-height: 1.7;
    padding: 40px;
    max-width: 900px;
    margin: 0 auto;
  }
  
  .header {
    text-align: center;
    border-bottom: 3px solid #1e40af;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }
  
  .header .institution {
    font-size: 12px;
    color: #64748b;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 6px;
  }
  
  .header .subtitle {
    font-size: 14px;
    color: #475569;
    margin-bottom: 12px;
  }
  
  .header .meta {
    font-size: 11px;
    color: #64748b;
    font-family: 'IBM Plex Mono', monospace;
  }
  
  h2 {
    font-size: 16px;
    font-weight: 700;
    color: #1e3a8a;
    margin-top: 30px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #dbeafe;
  }
  
  h3 {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-top: 18px;
    margin-bottom: 8px;
  }
  
  p { margin-bottom: 10px; font-size: 13px; }
  
  ul { margin-left: 20px; margin-bottom: 10px; }
  li { font-size: 12px; margin-bottom: 4px; }
  
  .info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin: 12px 0;
  }
  
  .info-table th {
    background: #1e40af;
    color: #fff;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
  }
  
  .info-table td {
    padding: 7px 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .info-table tr:nth-child(even) { background: #f8fafc; }
  
  .formula {
    background: #f1f5f9;
    border-left: 3px solid #3b82f6;
    padding: 10px 14px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    margin: 10px 0;
    overflow-x: auto;
  }
  
  .sugerencia-box {
    background: ${color}15;
    border-left: 4px solid ${color};
    padding: 16px 20px;
    margin: 16px 0;
    border-radius: 4px;
  }
  
  .sugerencia-box .titulo {
    font-size: 14px;
    font-weight: 700;
    color: ${color};
    margin-bottom: 8px;
  }
  
  .sugerencia-box .subtitulo {
    font-size: 12px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 8px;
  }
  
  .sugerencia-box .detalle {
    font-size: 11px;
    color: #475569;
    line-height: 1.7;
  }
  
  .sugerencia-box .especificacion {
    font-size: 11px;
    color: #334155;
    line-height: 1.8;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${color}40;
  }
  
  .firma {
    margin-top: 50px;
    display: flex;
    justify-content: space-around;
  }
  
  .firma div {
    text-align: center;
    width: 200px;
  }
  
  .firma .linea {
    border-top: 1px solid #1a1a1a;
    margin-bottom: 6px;
    padding-top: 40px;
  }
  
  .firma .nombre {
    font-size: 11px;
    font-weight: 600;
  }
  
  .firma .cargo {
    font-size: 10px;
    color: #64748b;
  }
  
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #94a3b8;
    text-align: center;
  }
  
  .print-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1e40af;
    color: #fff;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(30,64,175,0.3);
  }
  
  .print-btn:hover { background: #1e3a8a; }
  
  @media print {
    .print-btn { display: none; }
    body { padding: 20px; }
  }
</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">🖨️ IMPRIMIR / PDF</button>

<div class="header">
  <div class="institution">Fundación Universitaria Tecnológico Comfenalco</div>
  <h1>INFORME TÉCNICO DE DISEÑO DE PAVIMENTO</h1>
  <div class="subtitle">Método AASHTO-93 · Pavimento ${tipo === 'flexible' ? 'Flexible' : 'Rígido'}</div>
  <div class="meta">Generado: ${fecha}</div>
</div>

<h2>1. Introducción</h2>
<p>El presente informe técnico documenta el diseño de la estructura de pavimento ${tipo === 'flexible' ? 'flexible' : 'rígido'} realizado mediante el método AASHTO-93 (Guide for Design of Pavement Structures, 1993). El diseño se basa en los parámetros de tránsito, las propiedades de los materiales y las condiciones de la subrasante especificadas.</p>

<h2>2. Parámetros de Diseño</h2>
<h3>2.1. Datos de Entrada</h3>
<table class="info-table">
  <thead><tr><th>Parámetro</th><th>Valor</th></tr></thead>
  <tbody>
    ${resultadosHTML}
  </tbody>
</table>

${metodoTransitoHTML}

<h2>5. Metodología de Cálculo</h2>
<h3>5.1. Ecuación de Diseño</h3>
${formulaHTML}

<h3>5.2. Determinación de Espesores</h3>
<p>Los espesores de las capas fueron determinados a partir del número estructural requerido (SN) y los coeficientes de aporte estructural de cada material, siguiendo el procedimiento de diseño por capas del método AASHTO-93.</p>

<h2>6. Resultados del Diseño</h2>
<h3>6.1. Estructura de Pavimento</h3>
${contenidoCapas}

<h2>7. Recomendaciones Técnicas</h2>
<div class="sugerencia-box">
  <div class="titulo">${sugerencia}</div>
  <div class="subtitulo">${tituloEspecificacion}</div>
  <div class="detalle">${detalleNorma}</div>
  <div class="especificacion">${especificacion}</div>
</div>

<h2>8. Referencias Normativas</h2>
<ul>
  <li><strong>AASHTO Guide for Design of Pavement Structures</strong>, 1993. American Association of State Highway and Transportation Officials.</li>
  <li><strong>AASHTO M 288</strong> — Standard Specification for Geosynthetic Specification for Highway Applications.</li>
  <li><strong>ASTM D4632</strong> — Standard Test Method for Grab Breaking Load and Elongation of Geotextiles.</li>
  <li><strong>ASTM D4833</strong> — Standard Test Method for Index Puncture Resistance of Geomembranes and Related Products.</li>
  <li><strong>ASTM D4533</strong> — Standard Test Method for Trapezoid Tearing Strength of Geotextiles.</li>
  <li><strong>ASTM D6637</strong> — Standard Test Method for Determining Tensile Properties of Geogrids.</li>
  <li><strong>ASTM D4491</strong> — Standard Test Methods for Water Permeability of Geotextiles by Permittivity.</li>
  <li><strong>ASTM D4751</strong> — Standard Test Method for Determining Apparent Opening Size of a Geotextile.</li>
  <li><strong>ASTM D4355</strong> — Standard Test Method for Deterioration of Geotextiles by Exposure to Light, Moisture and Heat in a Xenon Arc Type Apparatus.</li>
  <li><strong>ASTM D6276</strong> — Standard Test Method for Using pH to Estimate the Soil-Lime Proportion Requirement.</li>
  <li><strong>ASTM D1633</strong> — Standard Test Methods for Compressive Strength of Molded Soil-Cement Cylinders.</li>
  <li><strong>AASHTO T 220</strong> — Standard Method of Test for Determination of the Strength of Soil-Lime Mixtures.</li>
  <li><strong>Giroud, J.P. & Han, J.</strong> — Design Method for Geogrid-Reinforced Unpaved Roads.</li>
</ul>

<div class="firma">
  <div>
    <div class="linea"></div>
    <div class="nombre">Ing. Responsable</div>
    <div class="cargo">Diseñador de Pavimentos</div>
  </div>
  <div>
    <div class="linea"></div>
    <div class="nombre">Revisor Técnico</div>
    <div class="cargo">Supervisor de Diseño</div>
  </div>
</div>

<div class="footer">
  Informe generado automáticamente por el Sistema de Diseño de Pavimentos AASHTO-93 v4.0<br>
  Fundación Universitaria Tecnológica Comfenalco · Solo uso académico/referencial
</div>

</body>
</html>
  `;
  
  const ventana = window.open('', '_blank');
  ventana.document.write(informeHTML);
  ventana.document.close();
  
  setStatus('✅ Informe técnico generado. Se abrió en nueva pestaña.', 'ok');
}

function ejemploFlex() {
  setTipo('flexible');
  setMetodo('esal');
  pf.W18 = 5e6;
  pf.R = 90;
  pf.So = 0.45;
  pf.deltaPSI = 1.9;
  pf.Mr = 69;
  pf.capas[0].a = 0.44;
  pf.capas[1].a = 0.14;
  pf.capas[2].a = 0.11;
  pf.capas[0].m = 1.0;
  pf.capas[1].m = 1.0;
  pf.capas[2].m = 1.0;
  calcular();
  document.getElementById('results-panel').style.display = 'block';
  renderResults();
}

function ejemploRig() {
  setTipo('rigido');
  setMetodo('esal');
  pr.W18 = 5e6;
  pr.R = 90;
  pr.So = 0.35;
  pr.deltaPSI = 2.3;
  pr.Ec = 27579;
  pr.Sc = 4.5;
  pr.k = 54.0;
  pr.J = 3.2;
  pr.Cd = 1.0;
  calcular();
  document.getElementById('results-panel').style.display = 'block';
  renderResults();
}

// ============================================================
//  VEHÍCULOS CON EMOJIS ROTADOS - PERFIL Y MIRANDO A LA DERECHA
// ============================================================

function drawCloud(cx, cy, s, off) {
  let x = cx + off;
  while (x > W + 70) x -= W + 140;
  while (x < -70) x += W + 140;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, cy, s, 0, Math.PI*2);
  ctx.arc(x+s*0.8, cy-s*0.3, s*0.7, 0, Math.PI*2);
  ctx.arc(x-s*0.8, cy-s*0.2, s*0.7, 0, Math.PI*2);
  ctx.arc(x+s*0.4, cy+s*0.2, s*0.6, 0, Math.PI*2);
  ctx.arc(x-s*0.4, cy+s*0.2, s*0.6, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawTree(x, base, h, w) {
  ctx.fillStyle = '#3a2a12';
  ctx.fillRect(x - w*0.08, base - h*0.25, w*0.16, h*0.3);
  ctx.fillStyle = '#1e6b1e';
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  ctx.lineTo(x - w/2, base - h*0.33);
  ctx.lineTo(x + w/2, base - h*0.33);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#28882a';
  ctx.beginPath();
  ctx.moveTo(x, base - h*1.05);
  ctx.lineTo(x - w*.4, base - h*0.55);
  ctx.lineTo(x + w*.4, base - h*0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a5a1a';
  ctx.beginPath();
  ctx.moveTo(x, base - h*0.85);
  ctx.lineTo(x - w*.35, base - h*0.45);
  ctx.lineTo(x + w*.35, base - h*0.45);
  ctx.closePath();
  ctx.fill();
}

function drawBusEmoji(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.rotate(Math.PI);
  ctx.font = '48px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.fillText('🚌', 0, -2);
  ctx.restore();
  
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('🚍 Bus', 0, -28);
  ctx.restore();
}

function drawTruckEmoji(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.rotate(Math.PI);
  ctx.font = '48px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.fillText('🚛', 0, -2);
  ctx.restore();
  
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('🚚 Tractocamión', 0, -28);
  ctx.restore();
}

function drawCarEmoji(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.rotate(Math.PI);
  ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.fillText('🚗', 0, -2);
  ctx.restore();
  
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('🚘 Auto', 0, -28);
  ctx.restore();
}

// ============================================================
//  DIBUJO DE ESCENA PRINCIPAL CON DEFORMACIÓN TIPO ONDA
//  CAPA 1 (SUPERFICIAL) NO SE DEFORMA - ES EL HORIZONTE
// ============================================================
function drawScene() {
  const CY = 100;
  
  const skyGrad = ctx.createLinearGradient(0,0,0,CY);
  skyGrad.addColorStop(0,'#0a1628');
  skyGrad.addColorStop(0.5,'#1a3a5c');
  skyGrad.addColorStop(1,'#2a5a7a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle='rgba(20,50,80,0.8)';
  ctx.beginPath();
  ctx.moveTo(-50, CY+5);
  ctx.lineTo(W*0.3, CY-80);
  ctx.lineTo(W*0.55, CY-40);
  ctx.lineTo(W*0.8, CY-15);
  ctx.lineTo(W+50, CY+5);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle='rgba(30,70,100,0.6)';
  ctx.beginPath();
  ctx.moveTo(-50, CY+5);
  ctx.lineTo(W*0.15, CY-50);
  ctx.lineTo(W*0.45, CY-20);
  ctx.lineTo(W*0.7, CY-5);
  ctx.lineTo(W+50, CY+5);
  ctx.closePath();
  ctx.fill();

  drawCloud(120, 22, 16, nubeOff);
  drawCloud(W-100, 16, 12, nubeOff*0.65);
  drawCloud(W/2+40, 30, 10, nubeOff*0.42+150);

  drawTree(25,  CY, 65, 28);
  drawTree(68,  CY, 55, 22);
  drawTree(W-35, CY, 75, 32);
  drawTree(W-72, CY, 60, 26);
  drawTree(W-108, CY, 50, 20);

  ctx.fillStyle='#3a3a40';
  ctx.fillRect(0, CY-5, W, 5);

  const lh = [30, 28, 32];

  // ============================================================
  //  DEFORMACIÓN TIPO ONDA VIAJERA
  //  IMPORTANTE: capa 0 (superficial) NO se deforma
  // ============================================================
  const speed2 = 0.50;
  let truckX = W + 120 - ((animT * speed2) % (W + 240)) - 160;
  
  function getDeformacion(x, capaIndex) {
    // La capa 0 (superficial) no se deforma porque es el horizonte
    if (capaIndex === 0) return 0;
    
    const dx = x - truckX;
    const distAbs = Math.abs(dx);
    
    // Ancho total de la onda
    const anchoOnda = 120;
    
    // Amplitud según la capa (más profunda en capas intermedias)
    // capa 1 = base (máxima deformación)
    // capa 2 = subbase
    // capa 3 = subrasante (mínima deformación)
    let amplitudBase;
    if (capaIndex === 1) amplitudBase = 10;
    else if (capaIndex === 2) amplitudBase = 7;
    else amplitudBase = 4;
    
    if (distAbs > anchoOnda) return 0;
    
    // Componente de onda: gaussiana (valle) + oscilación senoidal
    const gaussiana = Math.exp(-Math.pow(dx / (anchoOnda * 0.4), 2));
    const oscilacion = Math.sin(dx * 0.04 + animT * 0.08) * 0.3;
    
    // Valle principal (hundimiento) justo bajo el vehículo
    const valle = -amplitudBase * gaussiana;
    
    // Cresta delantera (elevación delante del vehículo)
    const crestaDelantera = dx > 20 && dx < 100 
      ? Math.exp(-Math.pow((dx - 60) / 30, 2)) * amplitudBase * 0.4 
      : 0;
    
    // Cresta trasera (recuperación elástica detrás del vehículo)
    const crestaTrasera = dx < -20 && dx > -100 
      ? Math.exp(-Math.pow((dx + 60) / 30, 2)) * amplitudBase * 0.3 
      : 0;
    
    return valle + crestaDelantera + crestaTrasera + oscilacion;
  }

  // ============================================================
  //  CAPAS DE PAVIMENTO CON DEFORMACIÓN TIPO ONDA
  // ============================================================
  if (tipo === 'flexible') {
    const capasInfo = [
      { nom: "CARPETA ASFÁLTICA", color: '#26262b', txcolor: 'rgba(255,255,255,0.85)', deformar: false },
      { nom: "BASE GRANULAR", color: '#7a5e30', txcolor: 'rgba(255,255,255,0.8)', deformar: true },
      { nom: "SUBBASE GRANULAR", color: '#b08c55', txcolor: 'rgba(255,255,255,0.75)', deformar: true }
    ];
    
    const ds = calculado ? [pf.capas[0].D, pf.capas[1].D, pf.capas[2].D] : [150, 200, 180];
    
    let yy = CY;
    capasInfo.forEach((capa, i) => {
      ctx.fillStyle = capa.color;
      
      if (!capa.deformar) {
        // Capa superficial: borde superior recto (sin deformación)
        ctx.fillRect(0, yy, W, lh[i]);
        
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let xx=0; xx<W; xx+=8) ctx.fillRect(xx, yy, 1, lh[i]);
        
        ctx.fillStyle = capa.txcolor;
        ctx.font = 'bold 10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const texto = `${capa.nom}  ${ds[i]} mm`;
        ctx.fillText(texto, W/2, yy + lh[i]/2);
      } else {
        // Capas deformables: borde superior con onda
        // El borde superior es la línea que separa esta capa de la anterior
        // La capa anterior (i-1) ya dibujó su borde inferior recto,
        // así que aquí dibujamos el borde superior con la deformación
        const capaAnteriorY = yy; // El borde superior de esta capa
        const capaActualY = yy;   // El borde inferior está en yy + lh[i]
        
        ctx.beginPath();
        ctx.moveTo(0, capaAnteriorY);
        
        // Borde superior con deformación tipo onda
        for (let x = 0; x <= W; x += 2) {
          const def = getDeformacion(x, i);
          ctx.lineTo(x, capaAnteriorY + def);
        }
        
        // Borde inferior recto
        ctx.lineTo(W, capaAnteriorY + lh[i]);
        ctx.lineTo(0, capaAnteriorY + lh[i]);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let xx=0; xx<W; xx+=8) ctx.fillRect(xx, yy, 1, lh[i]);
        
        ctx.fillStyle = capa.txcolor;
        ctx.font = 'bold 10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const texto = `${capa.nom}  ${ds[i]} mm`;
        ctx.fillText(texto, W/2, yy + lh[i]/2);
      }
      
      yy += lh[i];
    });
    
    // ============================================================
    //  CAPA DE SUBRASANTE CON DEFORMACIÓN
    // ============================================================
    const subrasanteY = yy;
    const subrasanteHeight = H - subrasanteY;
    
    ctx.fillStyle = '#4a5a3a';
    ctx.beginPath();
    ctx.moveTo(0, subrasanteY);
    
    for (let x = 0; x <= W; x += 2) {
      const def = getDeformacion(x, 3); // Índice 3 = subrasante
      ctx.lineTo(x, subrasanteY + def);
    }
    
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let xx=0; xx<W; xx+=12) {
      for (let ySub = subrasanteY; ySub < H; ySub += 8) {
        ctx.fillRect(xx, ySub, 1, 6);
      }
    }
    
    const { sugerencia, color } = obtenerSugerencia();
    const W18_millones = pf.W18 / 1e6;
    
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centroY = subrasanteY + (subrasanteHeight / 2) - 10;
    
    ctx.fillText(`SUBRASANTE  (Mr = ${pf.Mr} MPa | W18 = ${W18_millones.toFixed(1)}M)`, W/2, centroY - 12);
    
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillStyle = color;
    ctx.fillText(sugerencia, W/2, centroY + 12);
    
  } else {
    const ld = calculado ? pr.D_losa : 250;
    const bd = calculado ? pr.D_base : 150;
    
    // Losa de concreto: borde superior recto (es el horizonte)
    ctx.fillStyle = '#8a8a82';
    ctx.fillRect(0, CY, W, 32);
    
    ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1;
    for (let jx=0; jx<=W; jx+=120) { 
      ctx.beginPath(); 
      ctx.moveTo(jx,CY); 
      ctx.lineTo(jx,CY+32); 
      ctx.stroke(); 
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`LOSA DE CONCRETO  ${ld} mm`, W/2, CY + 16);
    
    // Base granular con deformación
    ctx.fillStyle = '#7a5e30';
    ctx.beginPath();
    ctx.moveTo(0, CY + 32);
    for (let x = 0; x <= W; x += 2) {
      ctx.lineTo(x, CY + 32 + getDeformacion(x, 1));
    }
    ctx.lineTo(W, CY + 56);
    ctx.lineTo(0, CY + 56);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let xx=0; xx<W; xx+=8) ctx.fillRect(xx, CY+32, 1, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`BASE GRANULAR  ${bd} mm`, W/2, CY + 44);
    
    // Subrasante con deformación
    const subrasanteY = CY + 56;
    const subrasanteHeight = H - subrasanteY;
    
    ctx.fillStyle = '#4a5a3a';
    ctx.beginPath();
    ctx.moveTo(0, subrasanteY);
    for (let x = 0; x <= W; x += 2) {
      ctx.lineTo(x, subrasanteY + getDeformacion(x, 2));
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let xx=0; xx<W; xx+=12) {
      for (let ySub = subrasanteY; ySub < H; ySub += 8) {
        ctx.fillRect(xx, ySub, 1, 6);
      }
    }
    
    const { sugerencia, color } = obtenerSugerencia();
    const W18_millones_rig = pr.W18 / 1e6;
    
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centroYRig = subrasanteY + (subrasanteHeight / 2) - 10;
    
    ctx.fillText(`SUBRASANTE  (k = ${pr.k} MN/m³ | W18 = ${W18_millones_rig.toFixed(1)}M)`, W/2, centroYRig - 12);
    
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillStyle = color;
    ctx.fillText(sugerencia, W/2, centroYRig + 12);
  }

  // ============================================================
  //  VEHÍCULOS
  // ============================================================
  const speed1 = 0.70;
  const speed3 = 0.40;

  let x1 = W + 120 - ((animT * speed1) % (W + 240));
  let x3 = W + 120 - ((animT * speed3) % (W + 240));

  const vehicleY = CY + 10;
  
  drawBusEmoji(x1, vehicleY);
  drawTruckEmoji(truckX, vehicleY + 2);
  drawCarEmoji(x3 - 300, vehicleY + 2);
}

function loop() {
  animT += 1;
  nubeOff = (nubeOff + 0.45) % (W + 140);
  drawScene();
  requestAnimationFrame(loop);
}

loop();
setMetodo('esal');
