// prusa.js — Original Prusa i3 MK3S u pregledniku: učitaj model (STL, OBJ, 3MF, PLY, GLB, STEP, G-kod), postavi ga na podlogu,
// izreži ga postavkama stvarnog MK3S profila, pogledaj ispis sloj po sloj na 3D modelu pisača i pročitaj trajanje, filament, masu,
// cijenu i energiju. Procjena trajanja = planer gibanja kao u PrusaSliceru (provjereno na stvarnom G-kodu za MK3S: 50 min 17 s prema 50 min 15 s).
// Koordinate pisača (mm): X udesno, Y od prednjeg ruba podloge prema natrag, Z gore. Scena (three.js, metri): (x, z, −y).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as CIT from './citac.js?v=01';

const $ = id => document.getElementById(id);
const D2R = Math.PI / 180;
const POS = window.FTQ_POSTAVKE, PROC = window.FTQ_PROCJENA;
const br = (v, d = 1) => { if (!isFinite(v)) return '–'; const s = Math.abs(v).toFixed(d).replace('.', ','); const [c, dec] = s.split(','); const cc = c.length > 4 ? c.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : c; return (v < 0 && +s.replace(',', '.') !== 0 ? '−' : '') + cc + (dec != null ? ',' + dec : ''); };
const vrijeme = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return h ? h + ' h ' + String(m).padStart(2, '0') + ' min' : m ? m + ' min ' + String(ss).padStart(2, '0') + ' s' : ss + ' s'; };
const sat = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

// ---------------- geometrija pisača (iz CAD modela, mm u koordinatama STL-a: Z gore, prednja strana −Y) ----------------
const CAD = { podX0: -124.24, podY0: -163.11, podZ: 75.43, mlaznica: [-21.65, -47.47, 179.78], podMinZ: 5.88 };
const HOME = { X: CAD.mlaznica[0] - CAD.podX0, Y: CAD.mlaznica[1] - CAD.podY0, Z: CAD.mlaznica[2] - CAD.podZ };   // položaj osi u kojem je CAD model
const RADNI = POS.PISAC;   // 250 × 210 × 210

// ---------------- scena ----------------
const kut = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
kut.insertBefore(renderer.domElement, kut.firstChild);
const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(38, 1, 0.005, 30);
const upr = new OrbitControls(kamera, renderer.domElement);
upr.enableDamping = true; upr.minDistance = 0.06; upr.maxDistance = 6; upr.maxPolarAngle = Math.PI * 0.495;
scena.add(new THREE.HemisphereLight(0xffffff, 0x8899a0, 1.5));
const sunce = new THREE.DirectionalLight(0xffffff, 1.8);
sunce.position.set(0.6, 1.4, 0.9); sunce.castShadow = true; sunce.shadow.mapSize.set(2048, 2048); sunce.shadow.bias = -0.0004; sunce.shadow.normalBias = 0.0015;
Object.assign(sunce.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.2, far: 4 });
scena.add(sunce); scena.add(sunce.target);
const dop = new THREE.DirectionalLight(0xffffff, 0.6); dop.position.set(-1, 0.8, -0.6); scena.add(dop);
const korijen = new THREE.Group(); scena.add(korijen);
const pod = new THREE.Mesh(new THREE.CircleGeometry(1.2, 72), new THREE.ShadowMaterial({ opacity: 0.16 }));
pod.rotation.x = -Math.PI / 2; pod.receiveShadow = true; korijen.add(pod);
const mreza = new THREE.GridHelper(2, 20); mreza.material.transparent = true; mreza.material.opacity = 0.22; korijen.add(mreza);

const pisac = new THREE.Group(); pisac.position.y = -CAD.podMinZ / 1000; korijen.add(pisac);
const osY = new THREE.Group(), osZ = new THREE.Group(), osX = new THREE.Group();
pisac.add(osY); pisac.add(osZ); osZ.add(osX);
// stol: koordinatni sustav pisača u mm (x, y, z) -> (x, z, −y) na podlozi koja se giba po Y
const stol = new THREE.Group();
stol.position.set(CAD.podX0 / 1000, CAD.podZ / 1000 + 0.00015, -CAD.podY0 / 1000);
stol.rotation.x = -Math.PI / 2; stol.scale.setScalar(0.001); osY.add(stol);
function radnoPodrucje() {   // obris radnog prostora 250 × 210 i mreža svakih 50 mm
  const L = [], g = (x0, y0, x1, y1) => L.push(x0, y0, 0, x1, y1, 0);
  g(0, 0, RADNI.x, 0); g(RADNI.x, 0, RADNI.x, RADNI.y); g(RADNI.x, RADNI.y, 0, RADNI.y); g(0, RADNI.y, 0, 0);
  for (let x = 50; x < RADNI.x; x += 50) g(x, 0, x, RADNI.y);
  for (let y = 50; y < RADNI.y; y += 50) g(0, y, RADNI.x, y);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2ECAD4, transparent: true, opacity: 0.55 })); m.renderOrder = 1; return m;
}
stol.add(radnoPodrucje());
let osi = { X: HOME.X, Y: HOME.Y, Z: HOME.Z };
function postaviOsi(X, Y, Z) {
  osi = { X, Y, Z };
  osX.position.x = (X - HOME.X) / 1000; osZ.position.y = (Z - HOME.Z) / 1000; osY.position.z = (Y - HOME.Y) / 1000;
}
const vrhMlaznice = new THREE.Vector3();
function mlaznicaSvijet() { return vrhMlaznice.set(CAD.mlaznica[0] / 1000, CAD.mlaznica[2] / 1000, -CAD.mlaznica[1] / 1000).add(osX.position).add(osZ.position).applyMatrix4(pisac.matrixWorld); }

// ---------------- model pisača (CAD, Swesen, CC BY 4.0) ----------------
const glbLoader = new GLTFLoader(); glbLoader.setMeshoptDecoder(MeshoptDecoder);
let pisacUcitan = false;
glbLoader.load('prusa_mk3s.glb', g => {
  pisac.add(g.scene); g.scene.updateMatrixWorld(true);
  const premjesti = [];
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } if (o.name && /^os_[xyz]_/.test(o.name)) premjesti.push(o); });
  premjesti.forEach(o => ({ os_y: osY, os_z: osZ, os_x: osX })[o.name.slice(0, 4)].attach(o));
  osY.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; } });
  // čelična ploča za ispis: puna ploha 252 × 241 mm preko ploče iz CAD-a (tanka ploča s urezanim natpisima u CAD-u ima šupljine nakon pojednostavljenja)
  const ploca = new THREE.Mesh(new THREE.BoxGeometry(252, 241, 1.0), new THREE.MeshStandardMaterial({ color: 0x8f9396, roughness: 0.55, metalness: 0.35 }));
  ploca.position.set(125, 105, -0.52); ploca.receiveShadow = true; stol.add(ploca);
  const natpis = document.createElement('canvas'); natpis.width = 1024; natpis.height = 980;
  { const c = natpis.getContext('2d'); c.fillStyle = '#8f9396'; c.fillRect(0, 0, 1024, 980); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.strokeRect(4 + 1 * 1024 / 252, 4 + 15.5 * 980 / 241, 250 * 1024 / 252 - 8, 210 * 980 / 241 - 8);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '600 34px IBM Plex Sans, Arial'; c.fillText('ORIGINAL PRUSA i3 MK3S', 600, 940); c.font = '26px IBM Plex Sans, Arial'; c.fillText('Print area 250 × 210', 30, 940); }
  const tx = new THREE.CanvasTexture(natpis); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  ploca.material = [ploca.material, ploca.material, ploca.material, ploca.material, new THREE.MeshStandardMaterial({ map: tx, roughness: 0.55, metalness: 0.35 }), ploca.material];
  pisacUcitan = true; $('ucitavanje').remove(); postaviOsi(HOME.X, HOME.Y, HOME.Z);
  pogled('pisac'); window.FTQ_SPREMNO = true;
}, undefined, () => { $('ucitavanje').textContent = 'Model pisača se nije mogao učitati. Stranicu otvori preko poslužitelja, ne izravno iz datoteke.'; });

// ---------------- model na podlozi ----------------
const M = { ime: '', T0: null, rot: new THREE.Matrix4(), rz: 0, mj: 100, x: RADNI.x / 2, y: RADNI.y / 2, kopije: 1, T: null, an: null, postavke3mf: null };
const duh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x2ECAD4, transparent: true, opacity: 0.35, roughness: 0.6, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
duh.renderOrder = 2; stol.add(duh);
function postavljeniTrokuti() {
  const T0 = M.T0; if (!T0) return null;
  const m = new THREE.Matrix4().makeRotationZ(M.rz * D2R).multiply(M.rot), e = m.elements, s = M.mj / 100;
  const n = T0.length / 3, P = new Float32Array(T0.length);
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (let i = 0; i < n; i++) {
    const x = T0[3 * i], y = T0[3 * i + 1], z = T0[3 * i + 2];
    const X = (e[0] * x + e[4] * y + e[8] * z) * s, Y = (e[1] * x + e[5] * y + e[9] * z) * s, Z = (e[2] * x + e[6] * y + e[10] * z) * s;
    P[3 * i] = X; P[3 * i + 1] = Y; P[3 * i + 2] = Z;
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; if (Z < z0) z0 = Z; if (Z > z1) z1 = Z;
  }
  const w = x1 - x0, d = y1 - y0, k = Math.max(1, Math.min(9, M.kopije | 0)), stup = Math.ceil(Math.sqrt(k)), red = Math.ceil(k / stup), razmak = 6;
  const W = stup * w + (stup - 1) * razmak, D = red * d + (red - 1) * razmak;
  const out = new Float32Array(P.length * k);
  for (let c = 0; c < k; c++) {
    const ox = M.x - W / 2 + (c % stup) * (w + razmak) - x0, oy = M.y - D / 2 + Math.floor(c / stup) * (d + razmak) - y0;
    for (let i = 0; i < n; i++) { out[(c * n + i) * 3] = P[3 * i] + ox; out[(c * n + i) * 3 + 1] = P[3 * i + 1] + oy; out[(c * n + i) * 3 + 2] = P[3 * i + 2] - z0; }
  }
  return { T: out, dim: [w, d, z1 - z0], uk: [W, D, z1 - z0] };
}
function obnoviModel(bezRezanja) {
  const r = postavljeniTrokuti(); if (!r) return;
  M.T = r.T; M.dim = r.dim; M.uk = r.uk;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(r.T, 3)); g.computeVertexNormals();
  duh.geometry.dispose(); duh.geometry = g;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < r.T.length; i += 3) { x0 = Math.min(x0, r.T[i]); x1 = Math.max(x1, r.T[i]); y0 = Math.min(y0, r.T[i + 1]); y1 = Math.max(y1, r.T[i + 1]); }
  const stane = x0 >= -0.01 && y0 >= -0.01 && x1 <= RADNI.x + 0.01 && y1 <= RADNI.y + 0.01 && r.uk[2] <= RADNI.z + 0.01;
  M.stane = stane;
  $('stane').textContent = 'Model ' + br(r.dim[0]) + ' × ' + br(r.dim[1]) + ' × ' + br(r.dim[2]) + ' mm' + (M.kopije > 1 ? ' · ' + M.kopije + ' kom. zauzimaju ' + br(r.uk[0]) + ' × ' + br(r.uk[1]) + ' mm' : '') +
    (stane ? ' — stane u radni prostor 250 × 210 × 210 mm.' : ' — NE stane u radni prostor 250 × 210 × 210 mm: smanji mjerilo, okreni ili pomakni model.');
  $('stane').className = 'pom' + (stane ? '' : ' upoz');
  analiziraj();
  if (!bezRezanja) zakaziRezanje();
}

// ---------------- radnik: rezanje, G-kod, procjena ----------------
const radnik = new Worker('radnik.js?v=01');
let posao = 0, rez = null, gkodTekst = '', gkodRedovi = null, izvor = 'nema';
radnik.onmessage = e => {
  const d = e.data;
  if (d.vrsta === 'napredak') { if (d.id === posao) { $('rez-napredak').value = d.u; $('rez-txt').textContent = d.p + '…'; } return; }
  if (d.vrsta === 'analiza') { if (d.id === anPosao) { M.an = d.a; prikaziAnalizu(); } return; }
  if (d.vrsta === 'greska') { if (d.id === posao) { $('rez-txt').textContent = 'Greška: ' + d.poruka; $('rez-napredak').value = 0; } return; }
  if (d.vrsta === 'gotovo' && d.id === posao) {
    rez = d.r; gkodTekst = d.gkod; gkodRedovi = null; izvor = d.izvor;
    $('rez-napredak').value = 1;
    $('rez-txt').textContent = (izvor === 'rezac' ? 'Izrezano' : 'G-kod pročitan') + ' za ' + br(d.ms / 1000, 1) + ' s: ' + rez.slojevi.length + ' slojeva, ' + br(rez.tip.length, 0) + ' pomaka, ' + br(rez.redaka, 0) + ' redaka G-koda.';
    noviPutevi(); podaci(); grafSlojeva(); tablicaVrsta(); postaviT(rez.ukupno.t, true); gumbIspis();
    $('gk-izvoz').disabled = false;
    if (izvor === 'rezac') duh.visible = $('pr-model').checked;
  }
};
function postavke() {
  const S = JSON.parse(JSON.stringify(POS.ZADANO)), v = id => parseFloat(String($(id).value).replace(',', '.'));
  S.h = v('s-sloj'); S.h1 = 0.2; S.perimetri = v('s-perimetri') | 0; S.gornji = v('s-gornji') | 0; S.donji = v('s-donji') | 0;
  S.ispuna = v('s-ispuna'); S.uzorak = $('s-uzorak').value; S.potpore = $('s-potpore').value; S.potporeKut = v('s-kut');
  S.brim = v('s-brim'); S.obrub = v('s-obrub') | 0;
  const mat = POS.MATERIJALI[$('s-materijal').value];
  S.materijal = $('s-materijal').value; S.gustoca = mat.rho; S.ventilator = mat.ventilator;
  S.tMlaznica = S.tMlaznica1 = v('s-tm'); S.tPodloga = S.tPodloga1 = v('s-tp'); S.cijena = v('s-cijena');
  ['perimetar', 'vanjski', 'ispuna', 'gornja', 'prvi', 'hod'].forEach(k => { const x = v('v-' + k); if (x > 0) S.brzine[k] = x; });
  S.brzine.puna = S.brzine.ispuna; S.brzine.potpora = Math.min(50, S.brzine.ispuna); S.brzine.malo = Math.min(25, S.brzine.perimetar);
  S.maxVol = v('v-maxvol') || mat.maxVol;
  return S;
}
let odgoda = 0;
function zakaziRezanje() {
  if (!M.T || izvor === 'gkod-zakljucan') return;
  clearTimeout(odgoda); $('rez-txt').textContent = 'Promjena — režem ponovno…';
  odgoda = setTimeout(rezi, 650);
}
function rezi() {
  if (!M.T) return;
  if (!M.stane) { $('rez-txt').textContent = 'Model ne stane u radni prostor — rezanje čeka.'; return; }
  zaustavi(); posao++;
  $('rez-napredak').value = 0; $('rez-txt').textContent = 'Režem…';
  const T = M.T.slice();
  radnik.postMessage({ vrsta: 'rezi', id: posao, T, S: postavke() }, [T.buffer]);
}
let anPosao = 0;
function analiziraj() { if (!M.T) return; anPosao++; const T = M.T.slice(); radnik.postMessage({ vrsta: 'analiza', id: anPosao, T, kut: +$('s-kut').value || 55 }, [T.buffer]); }

// ---------------- putevi ispisa: trake (pogled odozgo) i crte (pogled sa strane) ----------------
const BOJE = { vanjski: '#FF7D38', perimetar: '#FFD23F', prepust: '#2D5BE3', ispuna: '#B03029', puna: '#9654CC', gornja: '#F04040', most: '#4D80BA', praznine: '#E8E8E8', obrub: '#00876E', potpora: '#3CB043', ostalo: '#8C8C8C', hod: '#6E8A96', povlacenje: '#6E8A96' };
const IME_VRSTE = { vanjski: 'vanjski perimetar', perimetar: 'perimetar', prepust: 'perimetar na prepustu', ispuna: 'ispuna', puna: 'puna ispuna', gornja: 'gornja ploha', most: 'most', praznine: 'popuna praznina', obrub: 'obrub i rub', potpora: 'potpora', ostalo: 'ostalo (uvodna crta)', hod: 'hod (bez ekstrudiranja)', povlacenje: 'povlačenje filamenta' };
const matTraka = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, side: THREE.DoubleSide });
const traka = new THREE.Mesh(new THREE.BufferGeometry(), matTraka); traka.castShadow = false; stol.add(traka);
const crte = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true })); stol.add(crte);
const hodovi = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x6E8A96, transparent: true, opacity: 0.45 })); stol.add(hodovi);
let ekstr = null, hodIdx = null;   // indeksi pomaka koji ekstrudiraju / hodovi (rastući)
function bojaPomaka(i, nacin, c) {
  const kod = rez.kodovi[rez.tip[i]];
  if (nacin === 'brzina') {
    const o = 6 * i, d = Math.hypot(rez.pomaci[o + 3] - rez.pomaci[o], rez.pomaci[o + 4] - rez.pomaci[o + 1], rez.pomaci[o + 5] - rez.pomaci[o + 2]);
    const t = rez.t1[i] - (i ? rez.t1[i - 1] : 0), v = t > 0 ? d / t : 0, u = Math.min(1, v / 200);
    return c.setHSL((1 - u) * 0.66, 0.85, 0.5);
  }
  if (nacin === 'sloj') {
    const s = slojPomaka(i), ts = s >= 0 ? rez.slojevi[s].t1 - rez.slojevi[s].t0 : 0, u = Math.min(1, ts / 120);
    return c.setHSL((1 - u) * 0.66, 0.8, 0.5);
  }
  return c.set(BOJE[kod] || '#888');
}
let slojOd = null;   // za svaki pomak: indeks sloja
function slojPomaka(i) { return slojOd ? slojOd[i] : -1; }
function noviPutevi() {
  const n = rez.tip.length, P = rez.pomaci, K = rez.kodovi;
  slojOd = new Int32Array(n).fill(-1);
  rez.slojevi.forEach((s, k) => { for (let i = s.i0; i <= s.i1; i++) slojOd[i] = k; });
  const ex = [], hd = [];
  for (let i = 0; i < n; i++) { const k = K[rez.tip[i]]; if (k === 'povlacenje') continue; if (k === 'hod') hd.push(i); else if (rez.e[i] > 0) ex.push(i); }
  ekstr = Int32Array.from(ex); hodIdx = Int32Array.from(hd);
  // hodovi
  const H = new Float32Array(hd.length * 6); hd.forEach((i, j) => H.set(P.subarray(6 * i, 6 * i + 6), 6 * j));
  hodovi.geometry.dispose(); hodovi.geometry = new THREE.BufferGeometry(); hodovi.geometry.setAttribute('position', new THREE.BufferAttribute(H, 3));
  obojiPuteve();
  $('sloj').max = Math.max(0, rez.slojevi.length - 1); $('sloj').value = $('sloj').max; slojTekst();
  legenda();
}
function obojiPuteve() {
  if (!rez) return;
  const P = rez.pomaci, nE = ekstr.length, A = Math.PI * 1.75 * 1.75 / 4, nacin = $('boja').value, c = new THREE.Color();
  const trake = nE <= 700000;
  const pos = trake ? new Float32Array(nE * 12) : null, nor = trake ? new Float32Array(nE * 12) : null, col = trake ? new Float32Array(nE * 12) : null;
  const idx = trake ? new Uint32Array(nE * 6) : null;
  const L = new Float32Array(nE * 6), LC = new Float32Array(nE * 6);
  for (let j = 0; j < nE; j++) {
    const i = ekstr[j], o = 6 * i, x0 = P[o], y0 = P[o + 1], z0 = P[o + 2], x1 = P[o + 3], y1 = P[o + 4], z1 = P[o + 5];
    const s = slojOd[i], h = s >= 0 ? Math.max(0.05, rez.slojevi[s].h) : 0.2;
    const d = Math.hypot(x1 - x0, y1 - y0) || 1e-6, pov = rez.e[i] * A / d;
    const w = Math.max(0.15, Math.min(1.5, pov / h + h * (1 - Math.PI / 4)));
    bojaPomaka(i, nacin, c);
    const zc = z1 - h / 2;
    L.set([x0, y0, zc, x1, y1, zc], 6 * j);
    const k = 0.72; LC.set([c.r * k, c.g * k, c.b * k, c.r * k, c.g * k, c.b * k], 6 * j);
    if (trake) {
      const nx = -(y1 - y0) / d * w / 2, ny = (x1 - x0) / d * w / 2;
      pos.set([x0 + nx, y0 + ny, z1, x0 - nx, y0 - ny, z1, x1 + nx, y1 + ny, z1, x1 - nx, y1 - ny, z1], 12 * j);
      for (let q = 0; q < 4; q++) { nor[12 * j + 3 * q + 2] = 1; col.set([c.r, c.g, c.b], 12 * j + 3 * q); }
      const b = 4 * j; idx.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], 6 * j);
    }
  }
  traka.geometry.dispose(); traka.geometry = new THREE.BufferGeometry();
  if (trake) { traka.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); traka.geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); traka.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); traka.geometry.setIndex(new THREE.BufferAttribute(idx, 1)); }
  crte.geometry.dispose(); crte.geometry = new THREE.BufferGeometry(); crte.geometry.setAttribute('position', new THREE.BufferAttribute(L, 3)); crte.geometry.setAttribute('color', new THREE.BufferAttribute(LC, 3));
  [traka, crte].forEach(m => { m.geometry.computeBoundingSphere(); m.frustumCulled = false; });
  hodovi.frustumCulled = false;
  prikaz();
}
function doIndeksa(arr, i) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= i) lo = m + 1; else hi = m; } return lo; }   // broj elemenata ≤ i
function prikaz() {
  if (!rez) return;
  const sl = +$('sloj').value, S = rez.slojevi[sl], jedan = $('pr-jedan').checked;
  let doPomaka = Math.min(igra.i, S ? S.i1 : rez.tip.length - 1);
  if (igra.t >= rez.ukupno.t - 1e-6 && !igra.ide) doPomaka = S ? S.i1 : rez.tip.length - 1;
  const odPomaka = jedan && S ? S.i0 : 0;
  const a = doIndeksa(ekstr, odPomaka - 1), b = doIndeksa(ekstr, doPomaka);
  traka.geometry.setDrawRange(6 * a, 6 * Math.max(0, b - a)); crte.geometry.setDrawRange(2 * a, 2 * Math.max(0, b - a));
  const ha = doIndeksa(hodIdx, odPomaka - 1), hb = doIndeksa(hodIdx, doPomaka);
  hodovi.geometry.setDrawRange(2 * ha, 2 * Math.max(0, hb - ha));
  hodovi.visible = $('pr-hod').checked;
}
function legenda() {
  const nacin = $('boja').value, el = $('legenda');
  if (nacin === 'vrsta') {
    const ima = new Set(); if (rez) for (let i = 0; i < rez.tip.length; i++) ima.add(rez.kodovi[rez.tip[i]]);
    el.innerHTML = Object.keys(BOJE).filter(k => ima.has(k) && k !== 'povlacenje' && k !== 'hod').map(k => '<span><i style="background:' + BOJE[k] + '"></i>' + IME_VRSTE[k] + '</span>').join('') + ($('pr-hod').checked ? '<span><i style="background:#6E8A96"></i>hod</span>' : '');
  } else if (nacin === 'brzina') el.innerHTML = '<span class="ljestvica"><i style="background:linear-gradient(90deg,hsl(240 85% 50%),hsl(120 85% 50%),hsl(0 85% 50%))"></i>0 → 200 mm/s (stvarna prosječna brzina pomaka s ubrzanjima)</span>';
  else el.innerHTML = '<span class="ljestvica"><i style="background:linear-gradient(90deg,hsl(240 80% 50%),hsl(120 80% 50%),hsl(0 80% 50%))"></i>trajanje sloja 0 → 120 s i više (kratki slojevi se usporavaju do 15 s)</span>';
}

// ---------------- igra: ispis kroz vrijeme ----------------
const igra = { t: 0, i: 0, ide: false };
function indeksVremena(t) { const a = rez.t1; let lo = 0, hi = a.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < t) lo = m + 1; else hi = m; } return lo; }
function postaviT(t, kraj) {
  if (!rez || !rez.tip.length) return;
  igra.t = Math.max(0, Math.min(rez.ukupno.t, t)); const i = indeksVremena(igra.t); igra.i = kraj ? rez.tip.length - 1 : i;
  const o = 6 * i, t0 = i ? rez.t1[i - 1] : 0, u = rez.t1[i] > t0 ? Math.min(1, Math.max(0, (igra.t - t0) / (rez.t1[i] - t0))) : 1, P = rez.pomaci;
  const X = P[o] + (P[o + 3] - P[o]) * u, Y = P[o + 1] + (P[o + 4] - P[o + 1]) * u, Z = P[o + 2] + (P[o + 5] - P[o + 2]) * u;
  postaviOsi(Math.max(-1, Math.min(255, X)), Math.max(-4, Math.min(212, Y)), Math.max(0, Math.min(210, Z)));
  const s = slojPomaka(i);
  if (igra.ide && s >= 0 && +$('sloj').value !== s) { $('sloj').value = s; slojTekst(); }
  $('napredak').value = rez.ukupno.t ? igra.t / rez.ukupno.t : 0;
  $('napredak-txt').textContent = sat(igra.t) + ' / ' + sat(rez.ukupno.t);
  const k = rez.kodovi[rez.tip[i]], d = Math.hypot(P[o + 3] - P[o], P[o + 4] - P[o + 1], P[o + 5] - P[o + 2]), v = rez.t1[i] - t0 > 0 ? d / (rez.t1[i] - t0) : 0;
  $('info-ispis').innerHTML = 'Sloj <b>' + (s >= 0 ? s + 1 : '–') + '</b> / ' + rez.slojevi.length + ' · Z <b>' + br(Z, 2) + '</b> mm · ' + (IME_VRSTE[k] || k) + ' · ' + br(v, 0) + ' mm/s · X ' + br(X, 1) + ' Y ' + br(Y, 1) +
    ' · preostalo <b>' + vrijeme(rez.ukupno.t - igra.t) + '</b>';
  prikaz(); oznaciGraf(s);
  if (performance.now() - zadnjiGk > 180 || !igra.ide) { zadnjiGk = performance.now(); gkodProzor(rez.linija[i]); }
}
let zadnjiGk = 0;
function gumbIspis() { $('ispis').textContent = igra.ide ? 'Pauza' : (rez && igra.t >= rez.ukupno.t - 1e-6 ? 'Ispiši ponovno' : 'Ispiši'); $('ispis').setAttribute('aria-pressed', igra.ide ? 'true' : 'false'); $('xr-ispis').textContent = $('ispis').textContent; }
function zaustavi() { igra.ide = false; gumbIspis(); }
$('ispis').addEventListener('click', () => {
  if (!rez) return;
  if (igra.ide) { zaustavi(); return; }
  if (igra.t >= rez.ukupno.t - 1e-6) { postaviT(0); $('sloj').value = 0; slojTekst(); }
  igra.ide = true; gumbIspis();
});
$('pocetak').addEventListener('click', () => { if (!rez) return; zaustavi(); postaviT(0); $('sloj').value = 0; slojTekst(); prikaz(); });
$('napredak').addEventListener('click', e => { if (!rez) return; const r = e.currentTarget.getBoundingClientRect(); $('sloj').value = $('sloj').max; postaviT((e.clientX - r.left) / r.width * rez.ukupno.t); });
function slojTekst() {
  if (!rez) { $('sloj-txt').textContent = ''; return; }
  const s = rez.slojevi[+$('sloj').value]; if (!s) return;
  $('sloj-txt').textContent = 'do sloja ' + (+$('sloj').value + 1) + ' (Z ' + br(s.z, 2) + ' mm) · sloj traje ' + vrijeme(s.t1 - s.t0);
}
$('sloj').addEventListener('input', () => { if (!rez) return; zaustavi(); const s = rez.slojevi[+$('sloj').value]; slojTekst(); postaviT(s.t1); igra.i = s.i1; prikaz(); oznaciGraf(+$('sloj').value); });
['pr-jedan', 'pr-hod'].forEach(id => $(id).addEventListener('change', () => { prikaz(); legenda(); }));
$('boja').addEventListener('change', () => { obojiPuteve(); legenda(); });
$('pr-model').addEventListener('change', () => { duh.visible = $('pr-model').checked; });
$('pr-pisac').addEventListener('change', () => { const v = $('pr-pisac').checked; pisac.children.forEach(c => { if (c !== osY && c !== osZ) c.visible = v; }); [osZ].forEach(g => g.children.forEach(c => { if (c !== osX) c.visible = v; })); osX.children.forEach(c => c.visible = v); osY.children.forEach(c => { if (c !== stol) c.visible = v; }); });

// ---------------- podaci: trajanje, filament, masa, cijena, energija ----------------
function podaci() {
  if (!rez) return;
  const S = postavke(), u = rez.ukupno;
  const gcfg = rez.rezac.postavke || {};
  const rho = izvor === 'gkod' && gcfg.filament_density ? parseFloat(gcfg.filament_density) : S.gustoca;
  const g = u.cm3 * rho, cijena = g / 1000 * S.cijena;
  let grij = 0; rez.cekanja.forEach(c => grij += PROC.grijanje(c.od, c.na, c.vrsta));
  const kalibr = /G80/.test(gkodTekst.slice(0, 6000)) ? 90 : (/G28/.test(gkodTekst.slice(0, 6000)) ? 20 : 0);
  const tp = izvor === 'gkod' && gcfg.bed_temperature ? parseFloat(gcfg.bed_temperature) : S.tPodloga;
  const snaga = 80 + Math.max(0, Math.min(1, (tp - 60) / 45)) * 40;   // W: MK3S 80 W uz PLA, 120 W uz ABS (proizvođač)
  const tUk = u.t + grij + kalibr, kWh = snaga * tUk / 3600 / 1000;
  const plocica = (n, v, j, pom) => '<div class="plocica"><span class="pn">' + n + '</span><span class="pv">' + v + (j ? ' <small>' + j + '</small>' : '') + '</span>' + (pom ? '<span class="pp">' + pom + '</span>' : '') + '</div>';
  $('podaci').innerHTML =
    plocica('Trajanje ispisa', vrijeme(u.t), '', 'procjena planera gibanja (MK3S, način „normal”)') +
    plocica('S pripremom', vrijeme(tUk), '', 'grijanje ' + vrijeme(grij) + ' + kalibracija ' + vrijeme(kalibr) + ' (procjena)') +
    plocica('Filament', br(u.filament_mm / 1000, 2), 'm', 'Ø ' + br(S.promjer, 2) + ' mm') +
    plocica('Masa', br(g, 1), 'g', br(u.cm3, 2) + ' cm³ · ' + br(rho, 2) + ' g/cm³') +
    plocica('Cijena filamenta', br(cijena, 2), '€', br(S.cijena, 2) + ' €/kg · ' + br(g / 10, 1) + ' % koluta 1 kg') +
    plocica('Energija', br(kWh, 3), 'kWh', '≈ ' + br(snaga, 0) + ' W prosječno (proizvođač: 80 W PLA, 120 W ABS)') +
    plocica('Slojeva', br(u.slojeva, 0), '', 'visina ispisa ' + br(u.visina, 2) + ' mm') +
    plocica('Komada iz koluta', br(g > 0 ? Math.floor(1000 / g) : 0, 0), '', 'kolut 1 kg, bez otpada');
  // usporedba s rezačem koji je napravio G-kod
  const R = rez.rezac, red = [];
  if (R.procjenaS) red.push(['Trajanje ispisa', R.procjena + ' (' + (R.ime || 'rezač') + ')', vrijeme(u.t), br((u.t / R.procjenaS - 1) * 100, 1) + ' %']);
  if (R.filament_mm) red.push(['Filament', br(R.filament_mm / 1000, 2) + ' m', br(u.filament_mm / 1000, 2) + ' m', br((u.filament_mm / R.filament_mm - 1) * 100, 1) + ' %']);
  if (R.filament_g) red.push(['Masa', br(R.filament_g, 2) + ' g', br(g, 2) + ' g', br((g / R.filament_g - 1) * 100, 1) + ' %']);
  $('usporedba').innerHTML = red.length ? '<thead><tr><th>Veličina</th><th>Zapisano u G-kodu</th><th>Ova stranica</th><th>Razlika</th></tr></thead><tbody>' + red.map(r => '<tr><th>' + r.join('</td><td>').replace('</td>', '</th>') + '</td></tr>').join('').replace(/<tr><th>([^<]*)<\/th>/g, '<tr><th>$1</th>') + '</tbody>' : '';
  $('usporedba-omot').hidden = !red.length || izvor !== 'gkod';
  const gk = [];
  if (izvor === 'gkod') {
    if (gcfg.printer_model && gcfg.printer_model !== 'MK3S') gk.push('G-kod je pripremljen za pisač <b>' + gcfg.printer_model + '</b>, ne za MK3S — MK3S bi ga odbio (M862.3).');
    if (gcfg.layer_height) gk.push('Visina sloja ' + gcfg.layer_height + ' mm, perimetara ' + (gcfg.perimeters || '–') + ', ispuna ' + (gcfg.fill_density || '–') + ' (' + (gcfg.fill_pattern || '–') + '), materijal ' + (gcfg.filament_type || '–') + ' ' + (gcfg.temperature || '–') + ' / ' + (gcfg.bed_temperature || '–') + ' °C.');
  }
  $('podaci-gkod').innerHTML = gk.join('<br>');
}
// ---------------- graf: trajanje po slojevima ----------------
let grafSl = null;
function grafSlojeva() {
  const cv = $('g-slojevi'); if (!rez) return;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--body').trim() || '#5D7C90', rule = cs.getPropertyValue('--rule').trim() || '#DCE4E8';
  const S = rez.slojevi, n = S.length; if (!n) return;
  const tt = S.map(s => s.t1 - s.t0), max = Math.max(20, ...tt) * 1.08, L = 40, R = 8, T = 10, B = 24, w = W - L - R, h = H - T - B;
  c.strokeStyle = rule; c.fillStyle = ink; c.font = '11px IBM Plex Sans, sans-serif'; c.lineWidth = 1;
  const korak = max > 600 ? 120 : max > 240 ? 60 : max > 100 ? 20 : max > 40 ? 10 : 5;
  for (let v = 0; v <= max; v += korak) { const y = T + h - v / max * h; c.beginPath(); c.moveTo(L, y); c.lineTo(L + w, y); c.stroke(); c.fillText(v + ' s', 4, y + 4); }
  const bw = w / n;
  for (let i = 0; i < n; i++) { const v = tt[i], y = T + h - v / max * h; c.fillStyle = v < 15.5 && i > 0 ? '#E6B422' : '#17656E'; c.fillRect(L + i * bw, y, Math.max(1, bw - (bw > 3 ? 1 : 0)), T + h - y); }
  const y15 = T + h - 15 / max * h; c.strokeStyle = '#E0533D'; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(L, y15); c.lineTo(L + w, y15); c.stroke(); c.setLineDash([]);
  c.fillStyle = ink; c.fillText('sloj 1', L, H - 6); const tx = 'sloj ' + n; c.fillText(tx, L + w - c.measureText(tx).width, H - 6);
  grafSl = { L, w, n, T, h };
}
function oznaciGraf(s) { const el = $('g-slojevi-t'); if (!grafSl || s < 0) { el.style.display = 'none'; return; } el.style.display = ''; el.style.left = (grafSl.L + (s + 0.5) * grafSl.w / grafSl.n) + 'px'; }
$('g-slojevi').addEventListener('click', e => { if (!grafSl || !rez) return; const r = e.currentTarget.getBoundingClientRect(), s = Math.floor((e.clientX - r.left - grafSl.L) / grafSl.w * grafSl.n); if (s >= 0 && s < rez.slojevi.length) { $('sloj').value = s; $('sloj').dispatchEvent(new Event('input')); } });
function tablicaVrsta() {
  const T = rez.ukupno.t, red = Object.keys(rez.poTipu).filter(k => rez.poTipu[k] > 0.5).sort((a, b) => rez.poTipu[b] - rez.poTipu[a]);
  $('po-vrsti').innerHTML = '<thead><tr><th>Vrsta puta</th><th>Vrijeme</th><th>Udio</th><th>Duljina</th></tr></thead><tbody>' +
    red.map(k => '<tr><th><i class="kv-boja" style="background:' + (BOJE[k] || '#888') + '"></i>' + (IME_VRSTE[k] || k) + '</th><td>' + vrijeme(rez.poTipu[k]) + '</td><td>' + br(100 * rez.poTipu[k] / T, 1) + ' %</td><td>' + (k === 'povlacenje' ? '–' : br(rez.duljPoTipu[k] / 1000, 2) + ' m') + '</td></tr>').join('') + '</tbody>';
}
new ResizeObserver(() => grafSlojeva()).observe($('g-slojevi'));

// ---------------- G-kod: prozor oko trenutnog retka, izvoz ----------------
function gkodProzor(linija) {
  if (!gkodTekst) return;
  if (!gkodRedovi) gkodRedovi = gkodTekst.split('\n');
  const a = Math.max(0, linija - 8), b = Math.min(gkodRedovi.length, a + 26), esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let h = '';
  for (let i = a; i < b; i++) {
    const r = gkodRedovi[i], j = r.indexOf(';'), kod = j < 0 ? r : r.slice(0, j), kom = j < 0 ? '' : r.slice(j);
    h += '<div' + (i === linija ? ' class="sad"' : '') + '><span class="br">' + (i + 1) + '</span>' + esc(kod) + (kom ? '<span class="kom">' + esc(kom) + '</span>' : '') + '</div>';
  }
  $('gk').innerHTML = h;
}
function imeGkoda() {
  const S = postavke(), osnova = (M.ime || 'model').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  const t = rez ? Math.round(rez.ukupno.t / 60) : 0, hm = t >= 60 ? Math.floor(t / 60) + 'h' + (t % 60) + 'm' : t + 'm';
  return izvor === 'gkod' ? osnova + '.gcode' : osnova + '_' + S.h.toFixed(2) + 'mm_' + S.materijal + '_MK3S_' + hm + '.gcode';
}
$('gk-izvoz').addEventListener('click', () => {
  if (!gkodTekst) return;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([gkodTekst], { type: 'text/x-gcode' })); a.download = imeGkoda();
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
});

// ---------------- analiza modela ----------------
function prikaziAnalizu() {
  const a = M.an; if (!a) return;
  const red = [['Mjere', br(a.hi[0] - a.lo[0], 1) + ' × ' + br(a.hi[1] - a.lo[1], 1) + ' × ' + br(a.hi[2] - a.lo[2], 1) + ' mm'],
    ['Volumen tijela', br(a.volumen / Math.max(1, M.kopije), 2) + ' cm³' + (M.kopije > 1 ? ' po komadu' : '')], ['Oplošje', br(a.povrsina / Math.max(1, M.kopije), 1) + ' cm²'],
    ['Trokuta', br(a.trokuta, 0)], ['Otvoreni rubovi', br(a.otvoreni, 0)], ['Rubovi s više od dvije plohe', br(a.viseStruki, 0)], ['Krivo okrenute plohe (rubovi)', br(a.krivi, 0)],
    ['Prepusti (tlocrt)', br(a.prepust, 1) + ' cm² pod kutom manjim od ' + $('s-kut').value + '° od vodoravne'], ['Dodir s podlogom', br(a.dodir, 1) + ' cm²']];
  $('analiza').innerHTML = '<tbody>' + red.map(r => '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody>';
  const up = [];
  if (a.otvoreni || a.viseStruki) up.push('Mreža nije zatvorena (' + br(a.otvoreni + a.viseStruki, 0) + ' problematičnih rubova). Rezač to djelomično popravlja; bolje je popraviti model u CAD-u ili u PrusaSliceru (Popravi model) — vidi jedinicu 1.10.');
  if (a.okrenut) up.push('Plohe su okrenute naopako (volumen ispada negativan): normale gledaju prema unutra. Okreni normale u CAD-u ili ponovno izvezi STL.');
  if (a.prepust > 0.5 && $('s-potpore').value === 'ne') up.push('Model ima prepuste od ' + br(a.prepust, 1) + ' cm². Uključi potpore ili pokušaj „Najbolji položaj”.');
  const tl = (a.hi[0] - a.lo[0]) * (a.hi[1] - a.lo[1]) / 100;
  if (a.dodir < Math.max(0.5, 0.08 * tl)) up.push('Mala dodirna površina s podlogom (' + br(a.dodir, 1) + ' cm²). Dodaj rub (brim) od 3–5 mm ili položi model na veću plohu.');
  if (Math.max(...M.dim) < 3) up.push('Model je vrlo malen (' + br(Math.max(...M.dim), 2) + ' mm). Je li izvezen u metrima ili centimetrima? Probaj mjerilo 1000 % ili 100 000 %.');
  $('upozorenja').innerHTML = up.map(t => '<li>' + t + '</li>').join('');
  $('upozorenja').hidden = !up.length;
  $('analiza-ok').hidden = !!up.length;
}

// ---------------- učitavanje modela ----------------
function postaviModel(T, ime, info, postavke3mf) {
  // središte tlocrta na 0, dno na 0 (orijentacija kako je model izvezen: Z gore)
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], T[i + k]); hi[k] = Math.max(hi[k], T[i + k]); }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]];
  const T0 = new Float32Array(T.length); for (let i = 0; i < T.length; i += 3) { T0[i] = T[i] - c[0]; T0[i + 1] = T[i + 1] - c[1]; T0[i + 2] = T[i + 2] - c[2]; }
  Object.assign(M, { ime, T0, rot: new THREE.Matrix4(), rz: 0, mj: 100, x: RADNI.x / 2, y: RADNI.y / 2, kopije: 1, postavke3mf: postavke3mf || null });
  $('p-x').value = M.x; $('p-y').value = M.y; $('p-rz').value = 0; $('p-rz-out').textContent = '0°'; $('p-mj').value = 100; $('p-kopije').value = 1;
  const dim = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]].map(v => br(v, 1)).join(' × ');
  $('model-info').innerHTML = '<b>' + ime.replace(/</g, '&lt;') + '</b> · ' + info + ' · ' + br(T.length / 9, 0) + ' trokuta · ' + dim + ' mm';
  $('s-3mf').hidden = !postavke3mf;
  izvor = 'model'; rez = null; gkodTekst = ''; zaustavi();
  [traka, crte, hodovi].forEach(m => m.geometry.setDrawRange(0, 0));
  duh.visible = true; $('pr-model').checked = true; omoguciPostavke(true);
  obnoviModel();
  if (pisacUcitan) pogled('podloga');
}
function omoguciPostavke(da) { document.querySelectorAll('#k-postavke input, #k-postavke select, #k-polozaj input, #k-polozaj button').forEach(e => e.disabled = !da); $('gk-napomena').hidden = da; }
function ucitajGkod(tekst, ime) {
  zaustavi(); M.ime = ime; izvor = 'gkod'; omoguciPostavke(false);
  duh.visible = false; $('pr-model').checked = false;
  $('model-info').innerHTML = '<b>' + ime.replace(/</g, '&lt;') + '</b> · G-kod · ' + br(tekst.length / 1e6, 2) + ' MB';
  posao++; $('rez-napredak').value = 0.3; $('rez-txt').textContent = 'Čitam G-kod i računam trajanje…';
  radnik.postMessage({ vrsta: 'gkod', id: posao, gkod: tekst, S: postavke() });
}
async function datoteka(f) {
  $('model-info').textContent = 'Učitavam ' + f.name + '…';
  try {
    const r = await CIT.ucitaj(f);
    if (r.gkod != null) ucitajGkod(r.gkod, f.name);
    else postaviModel(r.T, f.name, r.info, r.postavke);
  } catch (e) { $('model-info').innerHTML = '<span class="upoz">' + (e.message || e) + '</span>'; }
}
$('datoteka').addEventListener('change', e => { if (e.target.files[0]) datoteka(e.target.files[0]); e.target.value = ''; });
const zona = $('ispust');
['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add('iznad'); }));
['dragleave', 'drop'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.remove('iznad'); }));
zona.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) datoteka(f); });
document.addEventListener('dragover', e => e.preventDefault()); document.addEventListener('drop', e => { e.preventDefault(); if (e.target.closest && !e.target.closest('#ispust') && e.dataTransfer.files[0]) datoteka(e.dataTransfer.files[0]); });
function primjer(k) {
  const p = window.FTQ_PRIMJERI[k]; if (!p) return;
  const T = new Float32Array(p.f.length * 3); for (let i = 0; i < p.f.length; i++) for (let j = 0; j < 3; j++) T[3 * i + j] = p.v[3 * p.f[i] + j];
  postaviModel(T, p.ime + '.stl', 'primjer', null);
}
$('primjer').addEventListener('change', e => { if (e.target.value) primjer(e.target.value); });
$('primjer-stl').addEventListener('click', () => {   // primjer kao STL datoteka za vježbu (otvori u PrusaSliceru)
  const k = $('primjer').value, p = window.FTQ_PRIMJERI[k]; if (!p) return;
  const n = p.f.length / 3, buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
  dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) { const o = 84 + 50 * i + 12; for (let a = 0; a < 3; a++) for (let j = 0; j < 3; j++) dv.setFloat32(o + 12 * a + 4 * j, p.v[3 * p.f[3 * i + a] + j], true); }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'model/stl' })); a.download = k + '.stl'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
});

// ---------------- postavljanje ----------------
const broj = id => parseFloat(String($(id).value).replace(',', '.'));
$('p-x').addEventListener('change', () => { M.x = broj('p-x'); obnoviModel(); });
$('p-y').addEventListener('change', () => { M.y = broj('p-y'); obnoviModel(); });
$('p-rz').addEventListener('input', () => { $('p-rz-out').textContent = $('p-rz').value + '°'; M.rz = +$('p-rz').value; obnoviModel(true); });
$('p-rz').addEventListener('change', () => zakaziRezanje());
$('p-mj').addEventListener('change', () => { M.mj = Math.max(1, broj('p-mj')); obnoviModel(); });
$('p-kopije').addEventListener('change', () => { M.kopije = Math.max(1, Math.min(9, broj('p-kopije') | 0)); obnoviModel(); });
$('rot-x').addEventListener('click', () => { M.rot.premultiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)); obnoviModel(); });
$('rot-y').addEventListener('click', () => { M.rot.premultiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); obnoviModel(); });
$('centriraj').addEventListener('click', () => { M.x = RADNI.x / 2; M.y = RADNI.y / 2; $('p-x').value = M.x; $('p-y').value = M.y; obnoviModel(); });
function okreniPrema(n) {   // zakreni model tako da normala n gleda prema dolje (−Z)
  const q = new THREE.Quaternion().setFromUnitVectors(n.clone().normalize(), new THREE.Vector3(0, 0, -1));
  M.rot = new THREE.Matrix4().makeRotationFromQuaternion(q); M.rz = 0; $('p-rz').value = 0; $('p-rz-out').textContent = '0°';
}
function nakupine() {   // površina ploha po smjeru normale (izvorna orijentacija)
  const T = M.T0, mapa = new Map();
  for (let i = 0; i < T.length; i += 9) {
    const ux = T[i + 3] - T[i], uy = T[i + 4] - T[i + 1], uz = T[i + 5] - T[i + 2], vx = T[i + 6] - T[i], vy = T[i + 7] - T[i + 1], vz = T[i + 8] - T[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz); if (!l) continue;
    const k = Math.round(nx / l * 20) + ',' + Math.round(ny / l * 20) + ',' + Math.round(nz / l * 20);
    const m = mapa.get(k) || { a: 0, n: new THREE.Vector3() }; m.a += l / 2; m.n.x += nx / 2; m.n.y += ny / 2; m.n.z += nz / 2; mapa.set(k, m);
  }
  return [...mapa.values()].sort((a, b) => b.a - a.a);
}
$('polozi').addEventListener('click', () => { if (!M.T0) return; const n = nakupine(); if (n.length) { okreniPrema(n[0].n); obnoviModel(); } });
function ocjenaOrijentacije(R) {   // prepusti (cm²), dodir (cm²), visina (mm) za rotaciju R
  const T = M.T0, e = R.elements, cosP = Math.cos((90 - (+$('s-kut').value || 55)) * D2R); let zmin = 1e9, zmax = -1e9;
  const Z = new Float32Array(T.length / 3);
  for (let i = 0; i < Z.length; i++) { Z[i] = e[2] * T[3 * i] + e[6] * T[3 * i + 1] + e[10] * T[3 * i + 2]; zmin = Math.min(zmin, Z[i]); zmax = Math.max(zmax, Z[i]); }
  let pre = 0, dod = 0;
  for (let t = 0; t < T.length / 9; t++) {
    const o = 9 * t, p = [0, 1, 2].map(k => new THREE.Vector3(T[o + 3 * k], T[o + 3 * k + 1], T[o + 3 * k + 2]).applyMatrix4(R));
    const n = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0])), a = n.length() / 2; if (!a) continue; n.normalize();
    const zs = (p[0].z + p[1].z + p[2].z) / 3 - zmin;
    if (n.z < -0.999 && zs < 0.05) dod += a; else if (n.z < -cosP && zs > 0.1) pre += a * -n.z;
  }
  return { pre: pre / 100, dod: dod / 100, vis: zmax - zmin };
}
$('najbolji').addEventListener('click', () => {
  if (!M.T0) return;
  const kand = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0)].concat(nakupine().slice(0, 6).map(m => m.n.clone().normalize()));
  let naj = null;
  kand.forEach(n => {
    const q = new THREE.Quaternion().setFromUnitVectors(n.clone().normalize(), new THREE.Vector3(0, 0, -1)), R = new THREE.Matrix4().makeRotationFromQuaternion(q), o = ocjenaOrijentacije(R);
    const bod = o.pre - 0.15 * o.dod + 0.01 * o.vis;
    if (!naj || bod < naj.bod - 1e-6) naj = { bod, R, o };
  });
  M.rot = naj.R; M.rz = 0; $('p-rz').value = 0; $('p-rz-out').textContent = '0°';
  $('najbolji-txt').textContent = 'Odabrano: prepusti ' + br(naj.o.pre, 1) + ' cm², dodir s podlogom ' + br(naj.o.dod, 1) + ' cm², visina ' + br(naj.o.vis, 1) + ' mm (ocijenjeno ' + kand.length + ' položaja).';
  obnoviModel();
});

// ---------------- postavke ----------------
function materijal() {
  const m = POS.MATERIJALI[$('s-materijal').value];
  $('s-tm').value = m.t; $('s-tp').value = m.tp; $('v-maxvol').value = m.maxVol;
  $('mat-info').textContent = m.ime + ': mlaznica / podloga ' + m.raspon + ', gustoća ' + br(m.rho, 2) + ' g/cm³. ' + m.napomena;
}
$('s-materijal').addEventListener('change', () => { materijal(); zakaziRezanje(); });
$('s-ispuna').addEventListener('input', () => { $('s-ispuna-out').textContent = $('s-ispuna').value + ' %'; });
document.querySelectorAll('#k-postavke input, #k-postavke select').forEach(el => { if (el.id !== 's-materijal') el.addEventListener('change', () => { zakaziRezanje(); if (el.id === 's-kut') analiziraj(); }); });
$('s-cijena').addEventListener('change', () => { if (rez) podaci(); });
$('rezi').addEventListener('click', rezi);
$('s-3mf').addEventListener('click', () => {
  const p = M.postavke3mf; if (!p) return;
  const UZ = { grid: 'resetka', rectilinear: 'linije', alignedrectilinear: 'linije', gyroid: 'giroid', triangles: 'trokuti', stars: 'trokuti', cubic: 'trokuti', concentric: 'koncentricno', honeycomb: 'resetka', '3dhoneycomb': 'resetka' };
  const lh = parseFloat(p.layer_height); if (lh) { const o = [...$('s-sloj').options].map(o => +o.value).reduce((a, b) => Math.abs(b - lh) < Math.abs(a - lh) ? b : a); $('s-sloj').value = o; }
  if (p.perimeters) $('s-perimetri').value = p.perimeters; if (p.top_solid_layers) $('s-gornji').value = p.top_solid_layers; if (p.bottom_solid_layers) $('s-donji').value = p.bottom_solid_layers;
  if (p.fill_density) { $('s-ispuna').value = parseFloat(p.fill_density); $('s-ispuna-out').textContent = parseFloat(p.fill_density) + ' %'; }
  if (p.fill_pattern && UZ[p.fill_pattern]) $('s-uzorak').value = UZ[p.fill_pattern];
  if (p.support_material != null) $('s-potpore').value = p.support_material === '1' ? (p.support_material_buildplate_only === '1' ? 'podloga' : 'svugdje') : 'ne';
  if (p.brim_width) $('s-brim').value = parseFloat(p.brim_width); if (p.skirts) $('s-obrub').value = p.skirts;
  const ft = (p.filament_type || '').replace(/"/g, '').split(';')[0]; if (POS.MATERIJALI[ft]) { $('s-materijal').value = ft; materijal(); }
  if (p.temperature) $('s-tm').value = parseFloat(p.temperature); if (p.bed_temperature) $('s-tp').value = parseFloat(p.bed_temperature);
  $('s-3mf-txt').textContent = 'Primijenjene postavke iz 3MF projekta (PrusaSlicer). Što rezač na ovoj stranici nema (npr. promjenjiva visina sloja), nije preneseno.';
  zakaziRezanje();
});

// ---------------- pogledi ----------------
let prati = false;
function pogled(v) {
  prati = v === 'prati'; $('prati').setAttribute('aria-pressed', prati ? 'true' : 'false');
  pisac.updateMatrixWorld(true);
  const c = new THREE.Vector3(), smjer = new THREE.Vector3(); let dist;
  const fov = Math.min(kamera.fov, 2 * Math.atan(Math.tan(kamera.fov * D2R / 2) * kamera.aspect) / D2R) * D2R;
  if (v === 'podloga' || v === 'prati') {
    const p = stol.localToWorld(new THREE.Vector3(M.T ? M.x : RADNI.x / 2, M.T ? M.y : RADNI.y / 2, 0));
    c.copy(p); const r = M.T ? Math.max(45, Math.hypot(...(M.uk || [80, 80, 30])) * 1.2) / 1000 : 0.16;
    dist = r / Math.sin(fov / 2) * 1.05; smjer.set(-0.25, 1.1, 0.75);
    if (v === 'prati') { c.copy(mlaznicaSvijet()); dist = 0.16; smjer.set(-0.4, 0.55, 1); }
  } else {
    c.set(-0.02, 0.2, 0.05); dist = 0.3 / Math.sin(fov / 2) * 1.05;
    smjer.set(v === 'sprijeda' ? 0 : -0.75, v === 'sprijeda' ? 0.12 : 0.55, 1);
  }
  kamera.position.copy(c).add(smjer.normalize().multiplyScalar(dist)).add(korijen.position); upr.target.copy(c).add(korijen.position); upr.update();
  zadnjaMl.set(0, 0, 0);
}
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('prati').addEventListener('click', () => pogled(prati ? 'podloga' : 'prati'));
const zadnjaMl = new THREE.Vector3();
function pratiKorak() { const p = mlaznicaSvijet().clone(); if (zadnjaMl.lengthSq() === 0) zadnjaMl.copy(p); const d = p.clone().sub(zadnjaMl); kamera.position.add(d); upr.target.add(d); zadnjaMl.copy(p); }
function velicina() { const w = kut.clientWidth, h = kut.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(kut); velicina();

// ---------------- proširena stvarnost (WebXR, Chrome na Androidu) ----------------
const krug = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.14, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2ECAD4 }));
krug.matrixAutoUpdate = false; krug.visible = false; scena.add(krug);
let xr = null, xrSmjer = 0, xrZakret = 0;
const sidroP0 = new THREE.Vector3(), sidroSad = new THREE.Matrix4(), sidroInv0 = new THREE.Matrix4(), korM = new THREE.Matrix4(), pomM = new THREE.Matrix4();
function korijenXR() { korM.makeRotationY(xrSmjer + xrZakret).setPosition(sidroP0); if (xr && xr.sidro && xr.imaPozu) korM.premultiply(pomM.multiplyMatrices(sidroSad, sidroInv0)); korM.decompose(korijen.position, korijen.quaternion, korijen.scale); }
const XR_INACICA = 'prusa v01';
function stanjeSidra(t) { const el = $('xr-sidro'); if (el && el.textContent !== t) el.textContent = t; }
function presidri() { sidroP0.copy(korijen.position); const e = new THREE.Euler().setFromQuaternion(korijen.quaternion, 'YXZ'); xrSmjer = e.y - xrZakret; pustiSidro(); korijenXR(); xr.trebaSidro = true; xr.slobodno = true; xr.presidreno++; }
function pustiSidro() { if (xr && xr.sidro) { try { xr.sidro.delete(); } catch (e) { } } if (xr) { xr.sidro = null; xr.imaPozu = false; xr.trebaSidro = false; } }
const sloj = $('xr-sloj'), uputa = $('xr-uputa'), xrGumb = $('xr-gumb');
function sidriUOkviru(frame, ref) {
  xr.trebaSidro = false;
  const gotovo = a => { if (!xr || !xr.postavljen) { try { a.delete(); } catch (e) { } return; } xr.sidro = a; xr.imaPozu = false; xr.izgubljeno = 0; xr.sidroStanje = 'da'; uputa.textContent = 'Pisač je usidren na stolu ili podu. Dodirni Ispiši; obilazi ga slobodno.'; };
  const nijeUspjelo = () => { if (xr) xr.sidroStanje = 'ne'; if (xr && !xr.presidreno) uputa.textContent = 'Pisač je postavljen (uređaj ne podržava sidra, pa može malo plivati). Dodirni Ispiši.'; };
  try {
    const r = xr.izvor ? frame.getHitTestResults(xr.izvor) : [], hp = r.length ? r[0].getPose(ref) : null;
    if (!xr.slobodno && hp && r[0].createAnchor && Math.hypot(hp.transform.position.x - sidroP0.x, hp.transform.position.y - sidroP0.y, hp.transform.position.z - sidroP0.z) < 0.25) { r[0].createAnchor().then(gotovo, nijeUspjelo); return; }
    if (frame.createAnchor) { frame.createAnchor(new XRRigidTransform({ x: sidroP0.x, y: sidroP0.y, z: sidroP0.z }), ref).then(gotovo, nijeUspjelo); return; }
  } catch (e) { }
  nijeUspjelo();
}
['.xr-vrh', '.xr-dno'].forEach(s => sloj.querySelector(s).addEventListener('beforexrselect', e => e.preventDefault()));
(function () {
  const ua = navigator.userAgent || '', mob = /Android|iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (mob) document.documentElement.classList.add('je-mob');
  const KANON = 'https://dos.fortroniq.hr/ar/prusa-mk3s/';
  const adresa = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.href.split('#')[0] : KANON;
  try { if (window.qrcode) { const qq = qrcode(0, 'M'); qq.addData(adresa); qq.make(); $('qr').innerHTML = qq.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } } catch (e) { }
  $('adresa').textContent = adresa;
  const android = /Android/i.test(ua);
  if (navigator.xr && android) xrGumb.hidden = false;
  if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (ok) { xrGumb.hidden = false; $('ar-poruka').textContent = ''; }
    else if (android) $('ar-poruka').textContent = 'Preglednik javlja da AR nije podržan. Probaj ipak gumb; ako se ne pokrene, provjeri da je instalirana aplikacija Google Play usluge za AR (ARCore).';
  }).catch(() => { });
  else if (android && !navigator.xr) { const a = $('u-chrome'); a.hidden = false; a.href = 'intent://' + adresa.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; $('ar-poruka').textContent = 'Ovaj preglednik (npr. Samsung Internet) nema WebXR. Otvori stranicu u Chromeu gumbom iznad.'; }
  else if (mob && !navigator.xr) $('ar-poruka').textContent = 'Ovaj preglednik nema WebXR. AR radi u Chromeu na Androidu; na iPhoneu Safari to još ne podržava.';
})();
xrGumb.addEventListener('click', () => {
  sloj.hidden = false;
  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'anchors'], domOverlay: { root: sloj } }).then(s => {
    renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
    return renderer.xr.setSession(s).then(() => {
      xr = { s, izvor: null, postavljen: false, sidro: null, imaPozu: false, trebaSidro: false, slobodno: false, izgubljeno: 0, presidreno: 0, sidroStanje: '', okvir: 0 };
      mreza.visible = false; pod.material.opacity = 0.3; korijen.visible = false; prati = false;
      uputa.textContent = 'Usmjeri kameru prema stolu ili podu i polako pomiči mobitel dok se ne pojavi krug (pisaču treba oko 50 × 55 cm).'; stanjeSidra('');
      s.requestReferenceSpace('viewer').then(vs => s.requestHitTestSource({ space: vs })).then(iz => { if (xr) xr.izvor = iz; });
      s.addEventListener('select', () => {
        if (!xr || xr.postavljen || !krug.visible) return;
        sidroP0.setFromMatrixPosition(krug.matrix);
        const c = renderer.xr.getCamera().position;
        xrSmjer = Math.atan2(c.x - sidroP0.x, c.z - sidroP0.z);   // prednja strana pisača prema korisniku
        pustiSidro(); korijenXR(); korijen.visible = true; xr.postavljen = true; xr.trebaSidro = true; xr.slobodno = false; xr.presidreno = 0; xr.sidroStanje = 'čekam'; krug.visible = false;
        uputa.textContent = 'Pisač je postavljen, sidrim ga…';
      });
      s.addEventListener('end', () => {
        if (xr && xr.izvor) xr.izvor.cancel();
        pustiSidro(); xr = null; renderer.xr.enabled = false; sloj.hidden = true;
        korijen.position.set(0, 0, 0); korijen.rotation.set(0, 0, 0); korijen.scale.set(1, 1, 1); korijen.visible = true;
        mreza.visible = true; pod.material.opacity = 0.16; krug.visible = false; velicina(); pogled('pisac');
      });
    });
  }).catch(e => { sloj.hidden = true; $('ar-poruka').textContent = 'Proširena stvarnost se nije mogla pokrenuti (' + (e && e.message ? e.message : e) + ').'; });
});
$('xr-izlaz').addEventListener('click', () => { if (xr) xr.s.end(); });
$('xr-premjesti').addEventListener('click', () => { if (!xr) return; pustiSidro(); stanjeSidra(''); xr.postavljen = false; korijen.visible = false; uputa.textContent = 'Dodirni krug da ponovno postaviš pisač.'; });
$('xr-ispis').addEventListener('click', () => $('ispis').click());
$('xr-pocetak').addEventListener('click', () => $('pocetak').click());
$('xr-zakret').addEventListener('input', e => { xrZakret = +e.target.value * D2R; if (xr && xr.postavljen) korijenXR(); $('xr-zakret-out').textContent = e.target.value + '°'; });
function xrKorak(frame, ref) {
  if (xr.trebaSidro) sidriUOkviru(frame, ref);
  if (xr.sidro) {
    const ap = frame.trackedAnchors && !frame.trackedAnchors.has(xr.sidro) ? null : frame.getPose(xr.sidro.anchorSpace, ref);
    if (ap) { sidroSad.fromArray(ap.transform.matrix); if (!xr.imaPozu) { sidroInv0.copy(sidroSad).invert(); xr.imaPozu = true; } korijenXR(); xr.izgubljeno = 0; }
    else if (xr.imaPozu && ++xr.izgubljeno > 45) presidri();
  }
  if (++xr.okvir % 15 === 0) {
    const vp = frame.getViewerPose(ref);
    stanjeSidra(vp && vp.emulatedPosition ? 'Praćenje kamere je slabo: polako pomiči mobitel i osvijetli prostor.' : xr.sidroStanje === 'da' ? 'Sidro: aktivno' + (xr.presidreno ? ' (obnovljeno ' + xr.presidreno + '×)' : '') + ' · ' + XR_INACICA : xr.sidroStanje === 'ne' ? 'Sidro: preglednik ga ne podržava · ' + XR_INACICA : 'Sidro: postavljam… · ' + XR_INACICA);
    $('xr-napredak').textContent = rez ? $('napredak-txt').textContent : 'Učitaj model na stranici prije ulaska u AR.';
  }
}

// ---------------- petlja ----------------
let zadnje = 0;
renderer.setAnimationLoop((t, frame) => {
  const dt = zadnje ? Math.min(0.05, (t - zadnje) / 1000) : 0; zadnje = t;
  if (xr && frame) {
    const ref = renderer.xr.getReferenceSpace();
    if (!xr.postavljen && xr.izvor) { const r = frame.getHitTestResults(xr.izvor); if (r.length) { const p = r[0].getPose(ref); krug.visible = true; krug.matrix.fromArray(p.transform.matrix); } else krug.visible = false; }
    xrKorak(frame, ref);
  }
  if (igra.ide && rez) {
    postaviT(igra.t + dt * (+$('ubrzanje').value || 1));
    if (igra.t >= rez.ukupno.t - 1e-6) { igra.ide = false; gumbIspis(); $('sloj').value = $('sloj').max; slojTekst(); prikaz(); }
  }
  if (prati && !xr) pratiKorak();
  if (!xr) upr.update();
  renderer.render(scena, kamera);
});

// ---------------- početak ----------------
materijal();
$('s-ispuna-out').textContent = $('s-ispuna').value + ' %';
legenda();
window.FTQ_PRUSA = { M, igra, get rez() { return rez; }, get gkod() { return gkodTekst; }, postaviT, primjer, datoteka, postaviOsi, HOME, CAD };
(async () => {   // model poslan s druge stranice (npr. skener: ?iz=skener)
  if (/[?&]iz=/.test(location.search) && window.FTQ_PRIJENOS) {
    try { const m = await window.FTQ_PRIJENOS.uzmi(); if (m && m.buf) { const r = CIT.stl(m.buf); postaviModel(r.T, m.ime, 'preneseno sa stranice skenera', null); return; } } catch (e) { }
  }
  primjer('n14');
})();
