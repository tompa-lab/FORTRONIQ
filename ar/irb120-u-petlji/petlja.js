// petlja.js — Industrijski robot ABB IRB 120 u petlji (sim-to-real)
// Scena (three.js), kinematika i planiranje gibanja, kontroler IRC5 (stanja, događaji, izvođenje RAPID-a),
// virtualni FlexPendant (RobotWare 6), vodič kroz korake A–J, pretvarač G-kod → RAPID i sučelje FTQ_SIM.
// Moduli: kinematika.js (FK/IK), rapid.js (parser i izvođenje RAPID-a), podaci.js (početni moduli i USB),
// stanica.js (traka, okretni stol, paleta, ploča, postav), plc.js (emulirani PLC i ladder), hmi.js (GTO2315),
// kamera.js (C920), signali.js (jedna tablica signala robot ↔ PLC).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as K from './kinematika.js';
import * as R from './rapid.js';
import * as D from './podaci.js';
import { Stanica, POSTAV, PRESETI } from './stanica.js';
import { PLC, plcPanel } from './plc.js';
import { HMI } from './hmi.js';
import { KameraC920 } from './kamera.js';
import { SIGNALI, ROBOT_IO, PROFILI, adresa, signal as signalPLC } from './signali.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const D2R = Math.PI / 180;
const lc = s => String(s).toLowerCase();
const f2 = v => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const minus = s => String(s).replace(/^-/, '−');

// =====================================================================================
// 1. Geometrija radnog mjesta (KS baze robota: Z gore, metri; stol je na z = 0)
// =====================================================================================
const AL = window.FTQ_ALATI;
const ALAT_FLO = K.alatIz(AL.tcp.flomaster.p, AL.tcp.flomaster.R);      // vrh flomastera u bočnom držaču
const ALAT_HVAT = { p: [0.213, 0, 0], R: K.TOOL0.R };                    // središte kockice među prstima (141 mm ispod prirubnice)
const PAPIR = { x0: 0.285, x1: 0.495, y0: -0.1885, y1: 0.1085, z: 0.012 }; // A4 (210 × 297 mm) na okviru visine 12 mm
const SILJAK = { x: 0.445, y: 0.215, h: 0.100, vrh: 0.130 };               // referentni blok sa šiljcima X/Y/Z
const KOCKA = { a: 0.100, b: 0.060, h: 0.018 };                            // drvene kockice 100 × 60 × 18 mm
const g3 = (p) => new THREE.Vector3(p[0], p[2], -p[1]);                    // baza (Z gore) -> scena (Y gore)
const OS = [['y', 1], ['z', -1], ['z', -1], ['x', 1], ['z', -1], ['x', 1]];
const MAX_OS = [250, 250, 250, 320, 320, 420];                             // najveće brzine osi IRB 120 (°/s)

// =====================================================================================
// 2. Scena
// =====================================================================================
const kut = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
kut.insertBefore(renderer.domElement, kut.firstChild);
const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(36, 1, 0.01, 50);
const upr = new OrbitControls(kamera, renderer.domElement);
upr.enableDamping = true; upr.minDistance = 0.25; upr.maxDistance = 5; upr.maxPolarAngle = Math.PI * 0.495;
scena.add(new THREE.HemisphereLight(0xffffff, 0x8899a0, 1.45));
const sunce = new THREE.DirectionalLight(0xffffff, 1.9);
sunce.position.set(1.0, 2.4, 1.3); sunce.castShadow = true; sunce.shadow.mapSize.set(2048, 2048);
Object.assign(sunce.shadow.camera, { left: -1.0, right: 1.0, top: 1.0, bottom: -1.0, near: 0.5, far: 6 });
scena.add(sunce);
const dop = new THREE.DirectionalLight(0xffffff, 0.55); dop.position.set(-1.5, 1, -1); scena.add(dop);

// stol s utorima
function teksturaStola() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const c = cv.getContext('2d');
  c.fillStyle = '#C3C9CD'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) { const y = 18 + i * 36; c.fillStyle = '#8E979D'; c.fillRect(0, y, 512, 7); c.fillStyle = '#D5DADD'; c.fillRect(0, y + 7, 512, 2); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const stol = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 1.3), [
  new THREE.MeshStandardMaterial({ color: 0xA9B1B6, roughness: 0.6, metalness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0xA9B1B6, roughness: 0.6, metalness: 0.3 }),
  new THREE.MeshStandardMaterial({ map: teksturaStola(), roughness: 0.55, metalness: 0.25 }), new THREE.MeshStandardMaterial({ color: 0x8E979D }),
  new THREE.MeshStandardMaterial({ color: 0xA9B1B6, roughness: 0.6, metalness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0xA9B1B6, roughness: 0.6, metalness: 0.3 })]);
stol.position.set(0.22, -0.02, 0); stol.receiveShadow = true; scena.add(stol);
const noge = new THREE.MeshStandardMaterial({ color: 0x5E676D, roughness: 0.5, metalness: 0.4 });
for (const [x, z] of [[-0.3, -0.6], [-0.3, 0.6], [0.74, -0.6], [0.74, 0.6]]) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), noge); n.position.set(x, -0.39, z); scena.add(n); }

// ploha za pisanje: papir u okviru na stolu (vodoravno) ili papir na ploči na stalku (okomito).
// PLOHA: p0 = donji lijevi kut papira (baza, m), ex/ey/ez = desno/gore/normala prema robotu, w × h papira.
// Tinta se crta u platno; grupa papira se postavlja matricom iz te baze.
const g3v = v => new THREE.Vector3(v[0], v[2], -v[1]);
const papirGrupa = new THREE.Group(); papirGrupa.matrixAutoUpdate = false; scena.add(papirGrupa);
let PLOHA = { vrsta: 'vodoravno', p0: [PAPIR.x0, PAPIR.y0, PAPIR.z], ex: [1, 0, 0], ey: [0, 1, 0], ez: [0, 0, 1], w: PAPIR.x1 - PAPIR.x0, h: PAPIR.y1 - PAPIR.y0 };
const tinta = { cv: document.createElement('canvas'), mm: 4, tex: null, duljina: 0, zadnja: null };
tinta.cx = tinta.cv.getContext('2d');
let okvirPapira = null, papir = null;
function obrisiPapir() {
  const c = tinta.cx; c.fillStyle = '#FBFBF7'; c.fillRect(0, 0, tinta.cv.width, tinta.cv.height);
  c.strokeStyle = 'rgba(23,101,110,.18)'; c.lineWidth = 2; c.strokeRect(20, 20, tinta.cv.width - 40, tinta.cv.height - 40);
  tinta.tex && (tinta.tex.needsUpdate = true); tinta.duljina = 0; tinta.zadnja = null;
}
function postaviPlohu(P) {
  const nova = !PLOHA || P.w !== PLOHA.w || P.h !== PLOHA.h || P.vrsta !== PLOHA.vrsta || !papir;
  PLOHA = P;
  if (nova) {
    tinta.cv.width = Math.round(P.w * 1000 * tinta.mm); tinta.cv.height = Math.round(P.h * 1000 * tinta.mm);
    obrisiPapir();
    if (tinta.tex) tinta.tex.dispose();
    tinta.tex = new THREE.CanvasTexture(tinta.cv); tinta.tex.colorSpace = THREE.SRGBColorSpace; tinta.tex.anisotropy = 4;
    if (papir) { papirGrupa.remove(papir); papirGrupa.remove(okvirPapira); papir.geometry.dispose(); okvirPapira.geometry.dispose(); }
    const rub = P.vrsta === 'okomito' ? 0.04 : 0.02;
    okvirPapira = new THREE.Mesh(new THREE.BoxGeometry(P.w + rub, 0.0118, P.h + rub), new THREE.MeshStandardMaterial({ color: P.vrsta === 'okomito' ? 0xF2F4F5 : 0x3B4247, roughness: 0.7 }));
    okvirPapira.position.set(P.w / 2, -0.0061, -P.h / 2); okvirPapira.castShadow = true; okvirPapira.receiveShadow = true; papirGrupa.add(okvirPapira);
    papir = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.h), new THREE.MeshStandardMaterial({ map: tinta.tex, roughness: 0.92 }));
    papir.rotation.x = -Math.PI / 2; papir.position.set(P.w / 2, 0.0001, -P.h / 2); papir.receiveShadow = true; papirGrupa.add(papir);
  }
  const M = new THREE.Matrix4().makeBasis(g3v(P.ex), g3v(P.ez), g3v(K.mul(P.ey, -1))); M.setPosition(g3(P.p0));
  papirGrupa.matrix.copy(M); papirGrupa.updateMatrixWorld(true);
}
postaviPlohu(PLOHA);
function plohaPiksel(u, v) { return [u * 1000 * tinta.mm, (PLOHA.h - v) * 1000 * tinta.mm]; }
// vrh flomastera u koordinatama plohe: u (desno), v (gore), dz (iznad plohe)
function naPlohi(p) { const d = K.sub(p, PLOHA.p0); return { u: K.dot(d, PLOHA.ex), v: K.dot(d, PLOHA.ey), dz: K.dot(d, PLOHA.ez) }; }

// referentni blok sa šiljcima (vrh Z služi za mjerenje TCP-a)
(function () {
  const g = new THREE.Group();
  const blok = new THREE.Mesh(new THREE.BoxGeometry(0.08, SILJAK.h, 0.08), new THREE.MeshStandardMaterial({ color: 0x4F6B80, roughness: 0.5, metalness: 0.3 }));
  blok.position.y = SILJAK.h / 2; blok.castShadow = true; g.add(blok);
  const crv = new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.4, metalness: 0.2 });
  const z = new THREE.Mesh(new THREE.ConeGeometry(0.005, SILJAK.vrh - SILJAK.h, 20), crv); z.position.y = (SILJAK.h + SILJAK.vrh) / 2; g.add(z);
  const x = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.03, 20), crv); x.rotation.z = -Math.PI / 2; x.position.set(0.055, 0.06, 0); g.add(x);
  const y = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.03, 20), crv); y.rotation.x = -Math.PI / 2; y.position.set(0, 0.06, -0.055); g.add(y);
  g.position.copy(g3([SILJAK.x, SILJAK.y, 0])); scena.add(g);
})();

// oznake na stolu (stog i paleta) i drvene kockice
function teksturaDrva() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = '#D9B47C'; c.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 26; i++) { c.strokeStyle = 'rgba(140,96,45,' + (0.15 + Math.random() * 0.2) + ')'; c.lineWidth = 1 + Math.random() * 1.5; c.beginPath(); const y = Math.random() * 64; c.moveTo(0, y); c.bezierCurveTo(80, y + 6 * Math.random() - 3, 170, y + 6 * Math.random() - 3, 256, y); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const matDrvo = new THREE.MeshStandardMaterial({ map: teksturaDrva(), roughness: 0.75 });
const kockice = [];          // { mesh, drzi, ime, stanica?, nosac?, s?, lat?, kut? }
let STOG = null, PALETA = null; // { x, y, psi } iz programa paletizacije
const oznake = [];           // oznake STOG i PALETA (skrivene u načinu stanice)
function oznakaNaStolu(x, y, psi, tekst) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 192; const c = cv.getContext('2d');
  c.clearRect(0, 0, 256, 192); c.lineWidth = 10;
  for (let i = 0; i < 16; i++) { c.strokeStyle = i % 2 ? '#222' : '#F2C200'; c.beginPath(); const p = i * 56; c.moveTo(p - 40, 0); c.lineTo(p, 0); c.stroke(); }
  c.strokeStyle = '#F2C200'; c.strokeRect(5, 5, 246, 182);
  c.fillStyle = 'rgba(30,30,30,.65)'; c.font = 'bold 22px sans-serif'; c.fillText(tekst, 14, 180 - 12);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, psi); m.position.copy(g3([x, y, 0.0004])); scena.add(m); oznake.push(m);
}
function novaKockica(ime) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(KOCKA.a, KOCKA.h, KOCKA.b), matDrvo);
  m.castShadow = true; m.receiveShadow = true; scena.add(m);
  const k = { mesh: m, drzi: false, ime, nosac: null }; kockice.push(k); return k;
}
function ukloniKockicu(k) {
  if (k.drzi) { k.drzi = false; }
  if (k.mesh.parent) k.mesh.parent.remove(k.mesh);
  const i = kockice.indexOf(k); if (i >= 0) kockice.splice(i, 1);
}
// tri kockice na stogu iz programa od ranije (samo u načinu „samo robot“)
function postaviKockice() {
  kockice.filter(k => !k.stanica).forEach(ukloniKockicu);
  if (POSTAV.rezim === 'stanica') return;
  for (let i = 0; i < 3; i++) {
    const k = novaKockica('kockica ' + (i + 1));
    k.mesh.position.copy(g3([STOG.x, STOG.y, KOCKA.h / 2 + i * KOCKA.h])); k.mesh.rotation.set(0, STOG.psi, 0);
  }
}

// =====================================================================================
// 3. Robot (GLB iz simulatora crtanja), prsti prihvatnice, TCP
// =====================================================================================
const zgl = []; const N = {};
let q = D.POCETNA_POZA.slice();
let prsti = { o: 0.008, cilj: 0.008 };      // otvorenost po prstu (m): 8 mm otvoreno, 0 zatvoreno
function postaviModel() {
  for (let i = 0; i < 6; i++) { const z = zgl[i]; if (!z) continue; z.rotation.set(0, 0, 0); z.rotation[OS[i][0]] = OS[i][1] * q[i] * D2R; }
  if (N.prst_p) { const s = AL.prst_smjer_p, d = new THREE.Vector3(s[0], s[2], -s[1]); N.prst_p.position.copy(d).multiplyScalar(prsti.o); N.prst_n.position.copy(d).multiplyScalar(-prsti.o); }
}
let tcpTroj = null;
function tcpOznaka(al) {                     // koordinatni sustav odabranog alata (jogging)
  if (!N.j6) return;
  if (!tcpTroj) { tcpTroj = new THREE.AxesHelper(0.06); tcpTroj.material.depthTest = false; tcpTroj.renderOrder = 9; N.j6.add(tcpTroj); }
  const c = k => new THREE.Vector3(al.R[k], al.R[6 + k], -al.R[3 + k]);
  const m = new THREE.Matrix4().makeBasis(c(0), c(1), c(2)); m.setPosition(new THREE.Vector3(al.p[0], al.p[2], -al.p[1]));
  tcpTroj.matrixAutoUpdate = false; tcpTroj.matrix.copy(m);
}

// pogledi kamere
function postaviKameru(P, C) { kamera.position.copy(g3(P)); upr.target.copy(g3(C)); upr.update(); }
function pogled(vrsta) {
  let C, P;
  if (vrsta === 'ploca' && PLOHA.vrsta === 'okomito') { const c = K.add(PLOHA.p0, K.add(K.mul(PLOHA.ex, PLOHA.w / 2), K.mul(PLOHA.ey, PLOHA.h / 2))); C = c; P = K.add(c, K.add(K.mul(PLOHA.ez, 0.42), K.add(K.mul(PLOHA.ex, 0.72), [0, 0, 0.28]))); }
  else if (vrsta === 'ploca') { C = [0.37, -0.02, 0.02]; P = [0.80, -0.42, 0.36]; }
  else if (vrsta === 'paleta') { C = POSTAV.rezim === 'stanica' ? [0.26, -0.3, 0.05] : [0.24, 0, 0.1]; P = POSTAV.rezim === 'stanica' ? [0.95, -0.75, 0.6] : [1.05, 0.0, 0.78]; }
  else if (vrsta === 'stanica') { C = [0.3, 0.05, 0.05]; P = [-0.8, 1.4, 1.55]; }
  else if (vrsta === 'stol') { const c = stanica.srediste(POSTAV.stol); C = [c[0], c[1], POSTAV.stol.h / 1000]; P = [c[0] + 0.5, c[1] + 0.55, 0.65]; }
  else if (vrsta === 'traka') { const k = stanica.krajTrake(); C = [k[0], k[1], k[2] + 0.05]; const d = stanica.smjerTrake(); P = [k[0] - d[0] * 0.45 + 0.55, k[1] - d[1] * 0.45 + 0.35, k[2] + 0.55]; }
  else { C = [0.2, 0, 0.44]; P = [1.45, -1.06, 1.08]; }
  postaviKameru(P, C);
  document.querySelectorAll('[data-pogled]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pogled === vrsta ? 'true' : 'false'));
}
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));

// =====================================================================================
// 4. Kinematika alata, radnih objekata i robtargeta
// =====================================================================================
function alatKin(td) {                          // tooldata -> alat u KS j6 (za K.fk)
  const t = td[1][0], r = td[1][1];
  return { p: K.add(K.TOOL0.p, K.mulRv(K.TOOL0.R, t.map(v => v / 1000))), R: K.mulR(K.TOOL0.R, K.kvatUMat(r)) };
}
function wobjPoza(wd) {                         // uframe ∘ oframe u bazi (m)
  const u = wd[3], o = wd[4], Ru = K.kvatUMat(u[1]), Ro = K.kvatUMat(o[1]);
  return { p: K.add(u[0].map(v => v / 1000), K.mulRv(Ru, o[0].map(v => v / 1000))), R: K.mulR(Ru, Ro) };
}
function ciljUBazi(rt, wd) { const W = wobjPoza(wd); return { p: K.add(W.p, K.mulRv(W.R, rt[0].map(v => v / 1000))), R: K.mulR(W.R, K.kvatUMat(rt[1])) }; }
function robtargetIz(qq, td, wd) {              // trenutna poza kao robtarget (mm, kvaternion, confdata)
  const f = K.fk(qq, alatKin(td)), W = wobjPoza(wd), Wt = K.transR(W.R);
  const p = K.mulRv(Wt, K.sub(f.p, W.p)), Rr = K.mulR(Wt, f.R);
  return [p.map(v => +(v * 1000).toFixed(2)), K.matUKvat(Rr).map(v => +v.toFixed(6)), K.konfiguracija(qq), [9e9, 9e9, 9e9, 9e9, 9e9, 9e9]];
}
const uGranicama = (qq, tol = 1e-6) => qq.every((v, i) => v >= K.GRANICE[i][0] - tol && v <= K.GRANICE[i][1] + tol);
const kvadranti = qq => [K.kvadrant(qq[0]), K.kvadrant(qq[3]), K.kvadrant(qq[5])];

// IK s konfiguracijom robtargeta (ConfJ\On): rješenje u istim kvadrantima osi 1, 4, 6, najbliže trenutnom q
function ikKonf(cilj, cf, alat, q0) {
  const rj = [];
  const prilagodi = (qq) => {                   // ±360° za osi 4 i 6 da se pogodi kvadrant
    if (!cf) return qq;
    for (const [j, c] of [[0, cf[0]], [3, cf[1]], [5, cf[2]]]) for (const k of [0, 360, -360]) { const v = qq[j] + k; if (K.kvadrant(v) === c && v >= K.GRANICE[j][0] && v <= K.GRANICE[j][1]) { qq[j] = v; break; } }
    return qq;
  };
  const odgovara = qq => uGranicama(qq, 0.01) && (!cf || (K.kvadrant(qq[0]) === cf[0] && K.kvadrant(qq[3]) === cf[1] && K.kvadrant(qq[5]) === cf[2]));
  const probaj = s => { const r = K.ikPuna(cilj, s, alat, { granice: false, iter: 120 }); if (r.ok) { const qq = prilagodi(r.q.slice()); rj.push(qq); return qq; } return null; };
  const prvi = probaj(q0);
  if (prvi && odgovara(prvi) && (!cf || K.konfiguracija(prvi)[3] === cf[3])) return { q: prvi };
  const a1 = Math.atan2(cilj.p[1], cilj.p[0]) / D2R;
  const q1s = [a1, a1 + 180, a1 - 180].filter(v => v >= -165 && v <= 165);
  const q4s = cf ? [cf[1] * 90 + 45, cf[1] * 90 + 8, cf[1] * 90 + 82] : [0, 150, -150];
  const q6s = cf ? [cf[2] * 90 + 45] : [q0[5]];
  const q5s = cf ? ((cf[3] & 1) ? [-60, -100] : [60, 100]) : [60, -60];
  for (const q1 of q1s) for (const q4 of q4s) for (const q5 of q5s) for (const [q2, q3] of [[20, 20], [45, -5], [-10, -60]]) for (const q6 of q6s) probaj([q1, q2, q3, q4, q5, q6]);
  let naj = null, najD = 1e9;
  for (const qq of rj) {
    if (!odgovara(qq)) continue;
    let d = 0; for (let j = 0; j < 6; j++) d += Math.abs(qq[j] - q0[j]);
    if (cf && K.konfiguracija(qq)[3] !== cf[3]) d += 2000;
    if (d < najD) { najD = d; naj = qq; }
  }
  if (naj) return { q: naj };
  return { greska: rj.some(x => uGranicama(x, 0.01)) ? 'konf' : 'doseg' };
}

// =====================================================================================
// 5. Planiranje gibanja (MoveL, MoveJ, Go To, Regain)
// =====================================================================================
function trajanjeJ(q0, q1, vTcp, alat) {
  let t = 0; for (let i = 0; i < 6; i++) t = Math.max(t, Math.abs(q1[i] - q0[i]) / (MAX_OS[i] * 0.35));
  const d = K.norm(K.sub(K.fk(q1, alat).p, K.fk(q0, alat).p)) * 1000;
  return Math.max(0.15, t, d / Math.min(vTcp || 250, 250));
}
function planJ(q0, q1, vTcp, alat) { return { put: [q0.slice(), q1.slice()], T: trajanjeJ(q0, q1, vTcp, alat) }; }
function osNaGranici(qq, tol) { for (let j = 0; j < 6; j++) { const g = K.GRANICE[j]; if (qq[j] - g[0] < tol || g[1] - qq[j] < tol) return j; } return -1; }
// linearno gibanje: pravac + slerp orijentacije, IK korak po korak (kontinuitet konfiguracije)
function planL(q0, cilj, alat, cf, confL, v) {
  const greska = (broj, extra) => ({ greska: Object.assign({ broj }, extra || {}) });
  if (confL && cf) {
    const g4 = K.GRANICE[3];
    if (q0[3] - g4[0] < 2 || g4[1] - q0[3] < 2) return greska(50436, { razlog: 'os4' });
  }
  const a = K.fk(q0, alat);
  const d = K.norm(K.sub(cilj.p, a.p)), ang = K.kutIzmedu(a.R, cilj.R);
  const n = Math.min(1800, Math.max(2, Math.ceil(d / 0.002), Math.ceil(ang / 0.012)));
  let qq = q0.slice(); const put = [q0.slice()]; let uspjeh = true;
  for (let i = 1; i <= n; i++) {
    const t = i / n, pp = K.add(a.p, K.mul(K.sub(cilj.p, a.p), t)), RR = K.slerpR(a.R, cilj.R, t);
    const r = K.ikPuna({ p: pp, R: RR }, qq, alat, { granice: false, iter: 50 });
    if (!r.ok) { uspjeh = false; break; }
    let skok = 0; for (let j = 0; j < 6; j++) skok = Math.max(skok, Math.abs(r.q[j] - qq[j]));
    if (skok > 8) { uspjeh = false; break; }
    qq = r.q; put.push(qq);
  }
  const T = Math.max(0.12, d * 1000 / Math.min(v || 250, 250), ang / D2R / 120);
  if (uspjeh) {
    const izvan = put.findIndex(x => !uGranicama(x, 0.01));
    if (izvan < 0) {
      const kraj = put[put.length - 1];
      if (confL && cf) {
        const k = kvadranti(kraj);
        if (k[0] !== cf[0] || k[1] !== cf[1] || k[2] !== cf[2]) return greska(50436, { razlog: 'kvadrant' });
        for (const j of [0, 3, 5]) if (Math.abs(kraj[j] - q0[j]) > 90) return greska(50436, { razlog: 'preokret' });
      }
      return { put, T };
    }
    // put izlazi iz radnog područja osi koja je već na granici: 50028 (os bi morala ići dalje)
    const j = put[izvan].findIndex((x, i) => x < K.GRANICE[i][0] || x > K.GRANICE[i][1]);
    if (j >= 0 && (q0[j] - K.GRANICE[j][0] < 0.5 || K.GRANICE[j][1] - q0[j] < 0.5)) return greska(50028, { os: j + 1 });
  }
  // pravac nije rješiv kontinuirano (singularno područje ili granica osi)
  const rk = ikKonf(cilj, confL ? cf : null, alat, q0);
  if (rk.greska) return greska(rk.greska === 'konf' && confL ? 50436 : 50050, { razlog: 'nema' });
  const k0 = kvadranti(q0), k1 = kvadranti(rk.q);
  if (confL && cf && (k0[0] !== k1[0] || k0[1] !== k1[1] || k0[2] !== k1[2])) return greska(50436, { razlog: 'promjena' });
  return { put: [q0.slice(), rk.q], T: Math.max(T, trajanjeJ(q0, rk.q, v, alat)), zglobno: true };
}

// trenutno gibanje: { put, T, t, vrsta: 'prog'|'goto'|'regain'|'nazad'|'precac', gotovo() }
let gib = null;
function profil(u) { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u); }
function uzorak(put, s) {
  const f = s * (put.length - 1), i = Math.min(put.length - 2, Math.floor(f)), t = f - i;
  if (put.length < 2) return put[0].slice();
  return put[i].map((v, j) => v + (put[i + 1][j] - v) * t);
}

// =====================================================================================
// 6. Kontroler: stanje, događaji, I/O, USB
// =====================================================================================
const prog = new R.Program();
const KS = {
  enabling: 'pusteno', kvar90211: false, pustenoU: 0, restart: false,
  izvodi: false, korakMod: false, korakIzvrsen: false,
  gen: null, pp: null, mp: null, cekanje: null, korijen: null, spremljeniPoziv: null,
  brzina: 100, rezim: 'single', confL: true, confJ: true, singArea: 'Off',
  io: Object.fromEntries(ROBOT_IO.map(s => [s.ime, 0])),   // DI i DO robota (IRC5 I/O ploča), imena iz signali.js
  jog: { mod: 'osi13', ks: 'base', alat: 'tPen', wobj: 'wobj0' },
  tockaStopa: null, ispis: [], povijest: [], simVrijeme: 0, ubrzanje: 1,
  savija: false, granica50028: {}, pokretanja: [],
};
prog.signali = new Set(Object.keys(KS.io).map(lc));
const motoriOn = () => KS.enabling === 'pola' && !KS.kvar90211 && !KS.restart;

// ---------- virtualni disk: /USB i /hd0a ----------
const mapa = (djeca = {}, extra = {}) => Object.assign({ tip: 'mapa', djeca }, extra);
const datoteka = (tekst) => ({ tip: 'dat', tekst, vrijeme: new Date() });
const DISK = mapa({
  USB: mapa({ 'Nova mapa': mapa(), 'System Volume Information': mapa({ 'IndexerVolumeGuid': datoteka('{SIM}') }) }),
  hd0a: mapa({ BACKUP: mapa({ WritingWorks: mapa({}, { stari: true }), tcpWobjGrrr: mapa({}, { stari: true }) }), '120-SIM': mapa({ HOME: mapa() }) }),
});
for (const ime in D.USB) DISK.djeca.USB.djeca[ime] = datoteka(D.USB[ime]);
function cvor(put) { let c = DISK; for (const d of put.split('/').filter(Boolean)) { if (!c || c.tip !== 'mapa') return null; c = c.djeca[d]; } return c || null; }
function datumKopije() { const d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }

// ---------- preuzimanje datoteke na računalo ----------
async function preuzmi(ime, tekst) {
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) { try { await dl.save({ filename: ime + '.txt', data: tekst }); return 'Spremljeno na računalo kao ' + ime + '.txt (makni .txt).'; } catch (e) { return 'Preuzimanje otkazano.'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/plain' }));
  a.download = ime; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  return 'Preuzeto na računalo: ' + ime;
}

// ---------- događaji (Event Log) ----------
const DOG = []; let dogId = 0;
function opisDogadjaja(broj, a = {}) {
  const ref = a.ref ? '\nProgram ref. ' + a.ref + '.' : '';
  switch (broj) {
    case 10010: return { vrsta: 'info', naslov: 'Motors OFF state', opis: 'The system is in the Motors OFF state.', hr: 'Motori su isključeni.' };
    case 10011: return { vrsta: 'info', naslov: 'Motors ON state', opis: 'The system is in the Motors ON state.', hr: 'Enabling device je do pola: motori su uključeni i robot se smije gibati.' };
    case 10012: return { vrsta: 'info', naslov: 'Safety guard stop state', opis: 'The system is in the Guard Stop state. The enabling device has been released.', hr: 'Enabling device je pušten. Program i pomicanje stoje.' };
    case 20051: return { vrsta: 'greska', naslov: 'Not allowed command', opis: 'The command is only allowed when the client is in control of the resource (program/motion).', posljedice: 'The command was not executed.', uzroci: 'The system is not in the Motors ON state (enabling device not pressed, Guard Stop), or another client (for example RobotStudio) holds write access.', radnje: 'Press the enabling device to the middle position and keep it pressed (Motors ON), then repeat the command. Release write access in RobotStudio if it is connected.', hr: 'Naredba ' + (a.naredba || 'Go To / Start') + ' zadana je bez Motors On. Na stvarnom robotu: prvo enabling device do pola, dok gore ne piše Motors On, tek onda Go To ili Start.' };
    case 50028: return { vrsta: 'greska', naslov: 'Jog in wrong direction', opis: 'Position for ROB_1 joint rob1_' + a.os + ' is out of working range.', posljedice: 'The robot does not move in this direction.', uzroci: 'The joint has reached the limit of its working range.', radnje: 'Use the joystick to move the joint in opposite direction.', hr: (a.goto ? 'Go To nije izveden: os ' + a.os + ' je na granici radnog područja (' + minus(f2(q[a.os - 1])) + '°). Kao na stvarnom robotu s osi 4 na −159,8°: Axis 4–6, joystick u suprotnom smjeru, zatim ostale osi u početnu pozu.' : 'Os ' + a.os + ' je na granici radnog područja. Odaberi Axis 1–3 ili 4–6 i nagni joystick u suprotnom smjeru; robot u blokiranom smjeru ne krene.') };
    case 50436: return { vrsta: 'greska', naslov: 'Robot configuration error', opis: 'Task: T_ROB1.\nIt is not possible to reach the programmed position with given robot configuration.' + ref, posljedice: 'The program execution is stopped.', uzroci: 'The robot configuration (cf1, cf4, cf6, cfx) of the current position differs from the configuration of the programmed position, or axis 4 or 6 is close to its working range limit. A linear movement cannot change the configuration of the wrist.', radnje: 'Move the robot to the programmed configuration (jog the axes, then Go to position), or use ConfL\\Off, or modify the position.', hr: 'MoveL ne smije promijeniti konfiguraciju zgloba. Robot je ostao u pozi za flomaster (zglob okrenut, os 4 blizu −160°). Rješenje: osi u početnu pozu (Axis 4–6, pa 1–3), u kodu dotakni p10 → Debug → Go to position.' };
    case 50050: return { vrsta: 'greska', naslov: 'Position outside reach', opis: 'Position for ROB_1 is outside working area.' + ref, posljedice: 'The program execution is stopped.', uzroci: 'The programmed position cannot be reached with the robot and the tool, or the path goes through a singularity.', radnje: 'Check the position, the tool and the work object.', hr: 'Robot ne može doći do točke s ovim alatom i radnim objektom.' };
    case 50026: return { vrsta: 'upoz', naslov: 'Close to singularity', opis: 'Robot ROB_1 is too close to a singularity.', posljedice: 'Jogging stopped.', radnje: 'Jog the robot with Axis 1-3 or Axis 4-6 away from the singularity.', hr: 'Zglob 5 je blizu 0° ili je središte zgloba na osi 1: linearno pomicanje se zaustavlja. Pomakni os 5 u načinu Axis 4–6.' };
    case 90211: return { vrsta: 'greska', naslov: 'Two channel fault, Enable Chain', opis: 'A switch in the enable chain has opened only one of its two channels. The enabling device has been pressed fully (panic position) or unevenly.', posljedice: 'The system goes to the Motors OFF state.', uzroci: 'Enabling device pressed to the end position, or released and pressed too quickly.', radnje: 'Release the enabling device completely, wait a few seconds, acknowledge the message, then press the enabling device gently to the middle position.', hr: 'Enabling device pritisnut do kraja (panika). Pusti ga potpuno, pričekaj barem 2 s, pa Acknowledge; zatim mekani pritisak samo do pola.' };
    case 40001: return { vrsta: 'greska', naslov: 'Syntax error', opis: 'Load error in ' + (a.dat || 'file') + ', line ' + (a.linija || '?') + ': ' + (a.tekst || 'syntax error') + '.', posljedice: 'The module was not loaded.', radnje: 'Check that the file is a RAPID module (MODULE ... ENDMODULE).', hr: 'Datoteka nije RAPID modul ili ima grešku u pisanju. G-kod (.nc) robot ne razumije: najprije ga pretvori u .mod.' };
    case 40010: return { vrsta: 'greska', naslov: a.tekst, opis: a.tekst + '.', posljedice: 'The program cannot be started until the error is corrected.', uzroci: 'Two global routines have the same name (RAPID does not distinguish upper and lower case).', radnje: 'Rename one of the routines (Program Editor → Routines → File → Rename...), then Debug → Check Program.', hr: 'Dodatni modul ima PROC main(), a main već postoji u MainModule. Rješenje: Routines → označi main() u modulu ' + (a.modul || '') + ' → File → Rename… (Change Declaration ima sivo ime).' };
    case 40011: return { vrsta: 'greska', naslov: 'Module name ' + a.ime + ' ambiguous', opis: 'Error in T_ROB1 - ' + a.prikaz + ': Module name ' + a.ime + ' ambiguous. The module has been loaded as ' + a.prikaz + '.', posljedice: 'The program cannot be started until the error is corrected.', uzroci: 'A routine or data in the task has the same name as the module, or the module is already loaded.', radnje: 'Rename the routine, or delete the module that was loaded twice.', hr: 'Ime rutine jednako je imenu modula (FTQ_Proba = FTQ_PROBA, velika i mala slova se ne razlikuju) ili je datoteka učitana dvaput. Preimenuj rutinu (Rename) pa se modul sam vrati na ime ' + a.ime + '.' };
    case 40012: return { vrsta: 'greska', naslov: a.tekst, opis: a.tekst + '.', posljedice: 'The program cannot be started until the error is corrected.', radnje: 'Rename or delete one of the declarations.', hr: 'Isto ime podatka postoji u dva modula. Najčešće je ista datoteka učitana dvaput.' };
    case 40300: return { vrsta: 'greska', naslov: a.naslov || 'Execution error', opis: (a.tekst || '') + ref, posljedice: 'The program execution is stopped.', radnje: 'Correct the program.', hr: 'Greška pri izvođenju RAPID-a.' };
    case 10100: return { vrsta: 'info', naslov: 'Backup completed', opis: 'Backup of the system was saved to ' + a.put + '.', hr: 'Sigurnosna kopija je spremljena. Na stvarnom robotu: 120-102663_Backup_20261013_1 na USB-u.' };
    case 10101: return { vrsta: 'info', naslov: 'Restore completed', opis: 'The system was restored from ' + a.put + ' and restarted.', hr: 'Program i moduli su vraćeni iz kopije. Robot se nije pomaknuo.' };
    case 10102: return { vrsta: 'info', naslov: 'Module loaded', opis: 'Module ' + a.ime + ' loaded from ' + a.put + '.', hr: 'Modul je učitan. Program pointer je izgubljen.' };
    case 'SIM-1': return { vrsta: 'upoz', naslov: 'Flomaster se savija', opis: 'Vrh flomastera je ' + a.mm + ' mm ispod površine papira.', posljedice: 'Flomaster i držač su opterećeni; crta je debela i neravna.', radnje: 'Podigni robota (Linear, Z) ili povećaj zProba u koracima od 0,5 mm.', hr: 'Poruka simulatora (ne postoji na stvarnom kontroleru). Na stvarnom robotu pritisak se popravlja u koracima od 0,5 mm, nikad više od 1 mm odjednom.' };
  }
  return { vrsta: 'info', naslov: String(broj), opis: '', hr: '' };
}
function dogadjaj(broj, a) {
  const o = opisDogadjaja(broj, a);
  const e = Object.assign({ id: ++dogId, broj, vrijeme: new Date(), potvrdjen: o.vrsta === 'info', a: a || {} }, o);
  DOG.unshift(e); if (DOG.length > 200) DOG.pop();
  zamkaVidjena(broj, a);
  if (!e.potvrdjen) prikazi();
  else if (FP.aktivni === 'dog') prikazi();
  return e;
}
const nepotvrdjeni = () => DOG.filter(e => !e.potvrdjen);
function potvrdi(e) {
  if (e.broj === 90211 && (KS.enabling !== 'pusteno' || performance.now() - KS.pustenoU < 2000)) { toast(KS.enabling !== 'pusteno' ? 'Acknowledge nije moguć: enabling device još nije pušten.' : 'Pričekaj još malo (barem 2 s nakon puštanja).'); return; }
  e.potvrdjen = true;
  if (e.broj === 90211) { KS.kvar90211 = false; oznaci('e90211'); }
  prikazi();
}

// ---------- I/O robota: DO (Set/Reset iz RAPID-a) i DI (postavlja ih PLC) ----------
function postaviIO(ime, v) {
  const k = Object.keys(KS.io).find(x => lc(x) === lc(ime));
  if (!k) throw new R.RapidGreska(40300, 'Reference error', 'Signal ' + ime + ' is not defined.');
  if (k.startsWith('DI_')) throw new R.RapidGreska(40300, 'Execution error', 'Signal ' + k + ' is a digital input and cannot be set from the program.');
  KS.io[k] = v ? 1 : 0;
  if (k === 'DO_0_gripper') { prsti.cilj = v ? 0.0 : 0.008; if (v) uhvati(); else pusti(); }
  const sig = SIGNALI.find(x => x.robot === k);                 // žica prema PLC-u (I_RobotUzeo, I_RobotSpreman, ...)
  if (sig) plc.pisi(sig.id, KS.io[k]);
  if (FP.aktivni === 'io') prikazi();
}
function postaviDI(ime, v) { if (ime in KS.io) { KS.io[ime] = v ? 1 : 0; if (FP.aktivni === 'io') prikazi(); } }
function hvatiste() { return K.fk(q, ALAT_HVAT); }
function uhvati() {
  const h = hvatiste().p;
  let naj = null, nd = 1e9;
  for (const k of kockice) {
    if (k.drzi) continue;
    const c = new THREE.Vector3(); k.mesh.getWorldPosition(c);
    const b = [c.x, -c.z, c.y], dxy = Math.hypot(b[0] - h[0], b[1] - h[1]), dz = Math.abs(b[2] - h[2]);
    if (dxy < 0.025 && dz < 0.012 && dxy + dz < nd) { nd = dxy + dz; naj = k; }
  }
  if (naj) { if (naj.nosac === 'traka' && KS.izvodi) oznaci('st_pick'); N.j6.attach(naj.mesh); naj.drzi = true; naj.nosac = null; }
}
function pusti() {
  for (const k of kockice) {
    if (!k.drzi) continue;
    scena.attach(k.mesh); k.drzi = false;
    const c = k.mesh.position, b = [c.x, -c.z];
    // oslonac: stol robota, traka, okretni stol, paleta ili gornja ploha kockice ispod
    const o = stanica.oslonac(b[0], b[1], c.y);
    let osl = o.z;
    for (const d of kockice) { if (d === k || d.drzi) continue; const p = new THREE.Vector3(); d.mesh.getWorldPosition(p); if (Math.hypot(p.x - c.x, p.z - c.z) < 0.045 && p.y + KOCKA.h / 2 <= c.y + 0.004) osl = Math.max(osl, p.y + KOCKA.h / 2); }
    const e = new THREE.Euler().setFromQuaternion(k.mesh.quaternion, 'YXZ');
    k.mesh.rotation.set(0, e.y, 0); c.y = osl + KOCKA.h / 2;
    k.nosac = o.nosac;
    if (o.nosac === 'traka') { k.s = o.s; k.lat = o.lat; k.kut = e.y - POSTAV.traka.psi * D2R; }
    if (o.parent) o.parent.attach(k.mesh);
    if (PALETA && Math.hypot(b[0] - PALETA.x, b[1] - PALETA.y) < 0.03 && KS.izvodi) oznaci('paleta');
  }
}

// ---------- tinta flomastera na papiru ----------
function tintaKorak() {
  const v = K.fk(q, ALAT_FLO).p;
  const l = naPlohi(v);
  const naPapiru = l.u > 0.002 && l.u < PLOHA.w - 0.002 && l.v > 0.002 && l.v < PLOHA.h - 0.002;
  const dz = l.dz;
  if (gib && gib.vrsta === 'precac') { tinta.zadnja = null; return { v, dz, naPapiru }; }   // prečac simulatora: bez tinte i bez poruke o savijanju
  if (naPapiru && dz <= 0.0005) {
    const p = plohaPiksel(l.u, l.v);
    const c = tinta.cx; c.strokeStyle = '#1B2440'; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = tinta.mm * (dz < -0.0008 ? 1.6 : 1.0);
    c.beginPath(); if (tinta.zadnja) { c.moveTo(tinta.zadnja[0], tinta.zadnja[1]); tinta.duljina += Math.hypot(p[0] - tinta.zadnja[0], p[1] - tinta.zadnja[1]) / tinta.mm; } else c.moveTo(p[0] - 0.01, p[1]);
    c.lineTo(p[0], p[1]); c.stroke(); tinta.tex.needsUpdate = true; tinta.zadnja = p;
    if (dz < -0.002 && !KS.savija) { KS.savija = true; dogadjaj('SIM-1', { mm: (-dz * 1000).toFixed(1).replace('.', ',') }); }
    if (tinta.duljina > 40 && POSTAV.rezim === 'stanica') oznaci('st_tinta');
  } else tinta.zadnja = null;
  if (dz > 0.001) KS.savija = false;
  return { v, dz, naPapiru };
}

// =====================================================================================
// 7. RAPID program u robotu: početni moduli, sinkronizacija PERS, učitavanje
// =====================================================================================
prog.dodajModul(D.MODUL_BASE, { datoteka: 'BASE.sys' });
prog.dodajModul(D.MODUL_USER, { datoteka: 'user.sys' });
prog.dodajModul(D.MODUL_MAIN, { datoteka: 'MainModule.mod' });
const kontrolerRapid = {
  io: (ime, v) => postaviIO(ime, v),
  ispis: (t) => { if (t === null) KS.ispis = []; else { KS.ispis.push({ t, v: new Date() }); if (KS.ispis.length > 60) KS.ispis.shift(); toast('TPWrite: ' + t); } if (FP.aktivni === 'proizvodnja') prikazi(); },
  postavka: (k, v) => { KS[k] = v; },
  crobt: (tool, wobj) => robtargetIz(q, tool || podatak('tool0'), wobj || podatak('wobj0')),
  cjointt: () => [q.slice(), [9e9, 9e9, 9e9, 9e9, 9e9, 9e9]],
  doutput: (ime) => { const k = Object.keys(KS.io).find(x => lc(x) === lc(ime)); return k ? KS.io[k] : 0; },
  dinput: (ime) => { const k = Object.keys(KS.io).find(x => lc(x) === lc(ime)); if (!k) throw new R.RapidGreska(40300, 'Reference error', 'Signal ' + ime + ' is not defined.'); return KS.io[k]; },
};
function podatak(ime) { const d = prog.podatak(ime); return d ? d.vrijednost : null; }

// PERS i promijenjene vrijednosti vraćaju se u tekst modula (kao na kontroleru: Save Module As piše trenutne vrijednosti)
function linijaDeklaracije(d) {
  const M = d.modul, i = d.linija - 1, st = M.linije[i];
  const m = /^(\s*)((?:LOCAL\s+)?(?:TASK\s+)?)(CONST|PERS|VAR)\s+(\w+)\s+(\w+)\s*:=.*;\s*(!.*)?$/i.exec(st || '');
  if (!m || lc(m[5]) !== lc(d.ime)) return;
  M.linije[i] = m[1] + m[2] + m[3] + ' ' + m[4] + ' ' + m[5] + ':=' + R.uTekst(d.vrijednost) + ';' + (m[6] ? ' ' + m[6] : '');
}
function sinkronizirajPers() {
  for (const M of prog.moduli) for (const d of M.deklaracije) if (d.vrsta === 'PERS' && d.promjena && d.promjena !== d.sink) { linijaDeklaracije(d); d.sink = d.promjena; }
}
function tekstModula(M) { sinkronizirajPers(); return M.linije.join('\r\n') + '\r\n'; }
// novi tekst modula (Rename, Delete Routine, promjena deklaracije): isti objekt, nova sintaksna stabla
function zamijeniTekst(M, tekst) {
  sinkronizirajPers();
  const n = R.parsirajModul(tekst);
  for (const k of ['ime', 'linija', 'atributi', 'deklaracije', 'rutine', 'krajLinija', 'linije', 'sustavni', 'samoCitanje']) M[k] = n[k];
  prog.osvjeziImena(); prog.inicijaliziraj(M); M.promijenjen = true;
  if ((KS.pp && KS.pp.m === M) || (KS.korijen && KS.korijen.m === M)) izgubiPP();
}
function izgubiPP() { KS.gen = null; KS.pp = null; KS.cekanje = null; KS.korijen = null; KS.spremljeniPoziv = null; KS.povijest = []; }

// učitavanje modula iz datoteke (Load Module)
function ucitajModul(put, ime) {
  const c = cvor(put + '/' + ime);
  if (!c || c.tip !== 'dat') return;
  let M;
  try { M = prog.dodajModul(c.tekst, { datoteka: ime }); }
  catch (e) { dogadjaj(40001, { dat: ime, linija: e.linija, tekst: e.opis || e.message }); return; }
  izgubiPP();
  dogadjaj(10102, { ime: M.ime, put: put + '/' + ime });
  provjeriNakonUcitavanja(M);
  if (lc(M.ime) === 'ftq_irb120_tekst_v01') oznaci('load1');
  if (M.rutine.some(r => /_nula$/i.test(r.ime)) && M.deklaracije.some(d => lc(d.ime) === 'pnula')) { oznaci('load_proba'); if (POSTAV.rezim === 'stanica') oznaci('st_pisanje'); }
  if (M.rutine.some(r => lc(r.ime) === 'paletizacija')) oznaci('st_rapid');
  FP.ur.modul = M; FP.ur.pogled = 'moduli';
  return M;
}
function provjeriNakonUcitavanja(M) {
  if (M.dvoznacno) dogadjaj(40011, { ime: M.ime, prikaz: M.prikaz });
  for (const g of prog.provjeri()) {
    if (g.modul !== M) continue;
    if (/Global routine name/.test(g.kratko)) dogadjaj(40010, { tekst: g.tekst, modul: M.prikaz });
    else if (/Global data name/.test(g.kratko)) dogadjaj(40012, { tekst: g.tekst });
  }
}
function snimka() { sinkronizirajPers(); return prog.moduli.map(M => ({ tekst: M.linije.join('\n') + '\n', datoteka: M.datoteka, sustavni: M.sustavni })); }
function vratiSnimku(s) {
  prog.moduli = [];
  for (const m of s) { try { prog.dodajModul(m.tekst, { datoteka: m.datoteka }); } catch (e) { /* preskoči */ } }
  izgubiPP(); FP.ur.modul = null; FP.ur.kod = null;
}

// =====================================================================================
// 8. Izvođenje programa (PP, Start, Step, Stop, Regain)
// =====================================================================================
function napraviGen(r, m, put) { return prog.izvrsiRutinu(r, m, put, kontrolerRapid); }
// postavi PP na početak rutine (ili na zadani put unutar nje) i pomakni generator do prve naredbe
function postaviPP(r, m, vrsta, put) {
  if (vrsta !== 'poziv') { KS.confL = true; KS.confJ = true; KS.singArea = 'Off'; }   // kao na kontroleru: pri postavljanju PP-a vrijede zadane postavke
  KS.gen = napraviGen(r, m, put || null); KS.korijen = { r, m, vrsta }; KS.cekanje = null; KS.spremljeniPoziv = vrsta === 'poziv' ? KS.spremljeniPoziv : null;
  try {
    const y = KS.gen.next();
    if (y.done) { KS.pp = { s: { l: r.linija }, m, r }; KS.gen = null; return; }
    KS.pp = y.value;
  } catch (e) { greskaIzvodjenja(e); }
  prikazi();
}
function ppNaMain() {
  if (KS.izvodi) { toast('Najprije zaustavi program (Stop).'); return false; }
  const g = prog.provjeri(); if (g.length) { dijalogGresaka(g, 'PP to Main is not possible. The program contains errors.'); return false; }
  const n = prog.rutina('main'); if (!n) { dijalog({ naslov: 'PP to Main', ikona: 'greska', html: '<p>Routine main is missing in the program.</p>', gumbi: [{ t: 'OK' }] }); return false; }
  KS.povijest = []; postaviPP(n.r, n.m, 'main'); oznaci('pp_main');
  return true;
}
function ppNaRutinu(r, m) { if (KS.izvodi) { toast('Najprije zaustavi program (Stop).'); return; } KS.povijest = []; postaviPP(r, m, 'rutina'); if (/_pisi$/i.test(r.ime)) oznaci('pp_rutina'); }

function start(korak) {
  if (KS.restart) return;
  if (!motoriOn()) { dogadjaj(20051, { naredba: korak ? 'Step' : 'Start' }); return; }
  if (KS.izvodi || gib) return;
  const g = prog.provjeri(); if (g.length) { dijalogGresaka(g, 'The program cannot be started. Check Program found errors:'); return; }
  if (!KS.gen || !KS.pp) { dijalog({ naslov: 'Program pointer', ikona: 'upoz', html: '<p>The program pointer (PP) is not set. Use PP to Main or PP to Routine in the Program Editor.</p><div class="hr-obj"><b>Hrvatski:</b> nakon Load Module program pointer je izgubljen. Program Editor → Debug → PP to Main (ili PP to Routine).</div>', gumbi: [{ t: 'OK' }] }); return; }
  if (KS.tockaStopa && KS.tockaStopa.some((v, i) => Math.abs(v - q[i]) > 0.1)) { regain(korak); return; }
  pokreni(korak);
}
function regain(korak) {
  dijalog({ naslov: 'Regain Request', ikona: 'pitanje', html: '<p>Do you want the robot to regain the path at program start?</p><div class="hr-obj"><b>Hrvatski:</b> Yes vraća robota na točku na kojoj je program zadnji put stao (kod nas: poza iz probe s flomasterom, ne p10). Ako je robot već na ciljnoj točki (nakon Go to position): No, pa Yes.</div>', gumbi: [
    { t: 'Yes', fp: 'regain-da', fn: () => { const st = KS.tockaStopa.slice(); gib = { put: [q.slice(), st], T: trajanjeJ(q, st, 100, K.TOOL0), t: 0, vrsta: 'regain', gotovo: () => { KS.tockaStopa = null; pokreni(korak); } }; zamkaVidjena('regain'); } },
    { t: 'No', fp: 'regain-ne', fn: () => setTimeout(() => dijalog({ naslov: 'Regain Request', ikona: 'upoz', html: '<p><b>Starting the program without regaining the path is a dangerous operation!</b></p><p>The robot will move directly from its current position to the next programmed position.</p><p>Are you sure you want to start the program without regaining the path?</p>', gumbi: [{ t: 'Yes', fp: 'regain-ne-da', fn: () => { KS.tockaStopa = null; zamkaVidjena('regain'); pokreni(korak); } }, { t: 'No' }] }), 0) },
    { t: 'Cancel' }] });
}
function pokreni(korak) {
  if (!motoriOn()) { dogadjaj(20051, { naredba: 'Start' }); return; }
  KS.izvodi = true; KS.korakMod = !!korak; KS.korakIzvrsen = true; KS.tockaStopa = null;
  KS.pokretanja.push({ rutina: KS.korijen && KS.korijen.r.ime, z: podatak('zProba') });
  if (vodicStanje.st_tinta && KS.korijen && /^(paletizacija|main)$/i.test(KS.korijen.r.ime)) oznaci('st_povratak');
  prikazi();
}
function zaustavi() {
  if (!KS.izvodi) return;
  KS.izvodi = false;
  if (gib && gib.vrsta === 'prog') { gib = null; if (KS.cekanje && KS.cekanje.vrsta === 'gibanje') { KS.cekanje.poceto = false; KS.povijest.pop(); } }
  KS.tockaStopa = q.slice();
  sinkronizirajPers(); prikazi();
}
function greskaIzvodjenja(e) {
  const pp = KS.pp;
  KS.izvodi = false;
  const ref = pp && pp.m && pp.r ? '/' + pp.m.prikaz + '/' + pp.r.ime + '/' + (pp.s.t === 'poziv' ? pp.s.ime : pp.s.t) + '/' + pp.s.l : '';
  dogadjaj(40300, { naslov: e.naslov || 'Execution error', tekst: e.opis || e.message, ref });
  // generator je završio s greškom: PP ostaje na naredbi (novi generator na istom mjestu)
  if (pp && pp.r) { const put = prog.putDoRetka(pp.r, pp.s.l); KS.gen = null; if (put) { const kv = KS.korijen ? KS.korijen.vrsta : 'rutina'; postaviPP(pp.r, pp.m, kv === 'main' && lc(pp.r.ime) === 'main' ? 'main' : 'rutina', put); } }
  KS.tockaStopa = q.slice();
}
function krajRutine() {
  const k = KS.korijen; if (!k) { KS.izvodi = false; return; }
  biljeziKraj(k.r);
  if (k.vrsta === 'poziv' && KS.spremljeniPoziv) {
    const s = KS.spremljeniPoziv; KS.spremljeniPoziv = null;
    KS.gen = s.gen; KS.pp = s.pp; KS.korijen = s.korijen; KS.cekanje = s.cekanje;
    zaustavi(); return;
  }
  if (k.vrsta === 'main' && KS.rezim === 'continuous' && KS.izvodi && !KS.korakMod) { postaviPP(k.r, k.m, 'main'); KS.korakIzvrsen = true; return; }
  postaviPP(k.r, k.m, k.vrsta);          // PP se vrati na prvi redak rutine, status Stopped
  if (k.vrsta === 'rutina') zamkaVidjena('pp_kraj');
  zaustavi();
}
function biljeziKraj(r) {
  if (/_pisi$/i.test(r.ime)) {
    const z = podatak('zProba'), pn = podatak('pNula');
    if (pn && (pn[0][0] || pn[0][1] || pn[0][2])) {
      if (z >= 20) oznaci('zrak');
      else if (z > 0.5 && z <= 10) oznaci('z5');
      else if (z <= 0.5 && tinta.duljina > 40) oznaci('ispis');
    }
  }
}
// izvršavanje u svakom okviru
function izvrsavanje() {
  let budzet = 400;
  while (KS.izvodi && budzet-- > 0) {
    const c = KS.cekanje;
    if (c) {
      if (c.vrsta === 'gibanje') {
        if (!c.poceto) {
          c.poceto = true;
          const plan = planirajNaredbu(c);
          if (plan.greska) { c.poceto = false; zaustavi(); javiGreskuGibanja(plan.greska, c); return; }
          KS.mp = c; KS.povijest.push({ qOd: q.slice(), put: plan.put, c, korijen: KS.korijen });
          gib = Object.assign(plan, { t: 0, vrsta: 'prog' }); return;
        }
        if (gib) return;
        KS.cekanje = null; continue;
      }
      if (c.vrsta === 'cekaj') { if (KS.simVrijeme < c.do) return; KS.cekanje = null; continue; }
      if (c.vrsta === 'cekajSignal' || c.vrsta === 'cekajUvjet') {
        let ok;
        try { ok = c.vrsta === 'cekajUvjet' ? c.uvjet() : ((c.ulaz ? kontrolerRapid.dinput(c.ime) : kontrolerRapid.doutput(c.ime)) === c.v); }
        catch (e) { greskaIzvodjenja(e); return; }
        if (ok) { if (c.cekao && c.ulaz && lc(c.ime) === 'di_1_predmet') oznaci('st_waitdi'); KS.cekanje = null; continue; }
        c.cekao = true;
        if (c.maxT !== null && c.maxT !== undefined && KS.simVrijeme > c.od + c.maxT) { greskaIzvodjenja(new R.RapidGreska(40308, 'Execution error', (c.vrsta === 'cekajUvjet' ? 'WaitUntil' : 'WaitDI ' + c.ime) + ': MaxTime expired (no ERROR handler).')); return; }
        return;
      }
    }
    let r;
    try { r = KS.gen.next(); } catch (e) { greskaIzvodjenja(e); return; }
    if (r.done) { krajRutine(); continue; }
    const y = r.value;
    if (y.vrsta === 'redak') {
      KS.pp = y; sinkronizirajPers();
      if (FP.aktivni === 'urednik' || FP.aktivni === 'proizvodnja') prikazi();
      if (KS.korakMod && KS.korakIzvrsen) { zaustavi(); return; }
      KS.korakIzvrsen = true; continue;
    }
    if (y.vrsta === 'gibanje') { KS.cekanje = y; y.poceto = false; continue; }
    if (y.vrsta === 'cekaj') { KS.cekanje = { vrsta: 'cekaj', do: KS.simVrijeme + y.t }; continue; }
    if (y.vrsta === 'cekajSignal' || y.vrsta === 'cekajUvjet') { KS.cekanje = Object.assign({ od: KS.simVrijeme, cekao: false }, y); continue; }
    if (y.vrsta === 'stop') { zaustavi(); return; }
    if (y.vrsta === 'exit') { KS.izvodi = false; KS.tockaStopa = q.slice(); izgubiPP(); toast('EXIT: program je završio, PP nije postavljen.'); prikazi(); return; }
  }
}
function planirajNaredbu(c) {
  const alat = alatKin(c.alat || podatak('tool0'));
  if (c.tip === 'A') {
    const qc = c.cilj[0].slice();
    if (!uGranicama(qc, 0.01)) { const j = qc.findIndex((x, i) => x < K.GRANICE[i][0] || x > K.GRANICE[i][1]); return { greska: { broj: 50028, os: j + 1 } }; }
    return planJ(q, qc, c.v, alat);
  }
  const cilj = ciljUBazi(c.cilj, c.wobj || podatak('wobj0'));
  const cf = c.cilj[2] && Math.abs(c.cilj[2][0]) < 10 ? c.cilj[2] : null;
  if (c.tip === 'L') return planL(q, cilj, alat, cf, KS.confL, c.v);
  // MoveJ: rješenje s konfiguracijom robtargeta (ConfJ\On)
  const rk = ikKonf(cilj, KS.confJ ? cf : null, alat, q);
  if (rk.greska) return { greska: { broj: rk.greska === 'konf' ? 50436 : 50050 } };
  return planJ(q, rk.q, c.v, alat);
}
function referenca(c) { return '/' + c.m.prikaz + '/' + c.r.ime + '/' + c.s.ime + '/' + c.s.l; }
function javiGreskuGibanja(g, c) {
  const ref = c ? referenca(c) : '';
  if (g.broj === 50028) dogadjaj(50028, { os: g.os, ref });
  else dogadjaj(g.broj, { ref });
}

// Step Backward: robot se vraća po putanji zadnjeg gibanja, PP na tu naredbu
function korakNazad() {
  if (KS.izvodi || gib) return;
  if (!motoriOn()) { dogadjaj(20051, { naredba: 'Step Backward' }); return; }
  const h = KS.povijest.pop();
  if (!h) { toast('Step Backward: nema prethodnog gibanja.'); return; }
  const put = h.put.slice().reverse();
  gib = { put, T: Math.max(0.3, trajanjeJ(q, h.qOd, 250, K.TOOL0)), t: 0, vrsta: 'nazad', gotovo: () => {
    const pr = prog.putDoRetka(h.c.r, h.c.s.l);
    if (pr) postaviPP(h.c.r, h.c.m, h.korijen && h.korijen.r === h.c.r ? h.korijen.vrsta : 'rutina', pr);
    KS.tockaStopa = null;
  } };
}

// Go To (Debug → Go to position, Jogging → Go To): tipka se drži
let drziGoTo = false;
function pripremiGoTo(ime, td, wd) {
  if (!motoriOn()) { dogadjaj(20051, { naredba: 'Go To' }); zamkaVidjena(20051); return; }
  if (KS.izvodi) return;
  const d = prog.podatak(ime); if (!d || d.tip !== 'robtarget') return;
  const j0 = osNaGranici(q, 0.5);
  if (j0 >= 0) { dogadjaj(50028, { os: j0 + 1, goto: true }); zamkaVidjena('goto50028'); return; }
  const alat = alatKin(td), cilj = ciljUBazi(d.vrijednost, wd), cf = d.vrijednost[2];
  const rk = ikKonf(cilj, Math.abs(cf[0]) < 10 ? cf : null, alat, q);
  if (rk.greska) { dogadjaj(rk.greska === 'konf' ? 50436 : 50050, {}); return; }
  gib = { put: [q.slice(), rk.q], T: trajanjeJ(q, rk.q, 250, alat), t: 0, vrsta: 'goto', ime, gotovo: () => {
    toast('Go To: robot je na ' + ime + '.'); if (lc(ime) === 'p10') oznaci('goto');
    FP.dijalog = null; prikazi();
  } };
  dijalog({ naslov: 'Go to position', ikona: 'info', html: '<p>Press and hold <b>Go To</b> to move the robot to <b>' + esc(ime) + '</b>. Release the button to stop the movement.</p><button type="button" class="goto-gumb" data-fp="goto-drzi">Go To</button><div class="hr-obj"><b>Hrvatski:</b> drži enabling device do pola i drži tipku Go To dok robot ne stane. Pušteni gumb zaustavlja robota.</div>', gumbi: [{ t: 'Close', fn: () => { if (gib && gib.vrsta === 'goto') gib = null; } }] });
}

// =====================================================================================
// 9. Ručno pomicanje (jogging) joystickom
// =====================================================================================
const JOY = { gd: 0, ld: 0, zk: 0, tipke: {} };
let jogPoruka = 0;
function jogAlat() { return prog.podatak(KS.jog.alat) ? podatak(KS.jog.alat) : podatak('tool0'); }
function jogWobj() { return prog.podatak(KS.jog.wobj) ? podatak(KS.jog.wobj) : podatak('wobj0'); }
const MAPA_JOY = { osi13: ['2', '1', '3'], osi46: ['5', '4', '6'], linear: ['Y', 'X', 'Z'], reorient: ['Y', 'X', 'Z'] };
function jogKorak(dt) {
  const v = [JOY.gd, JOY.ld, JOY.zk];
  if (Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]) < 0.03) return;
  if (KS.restart) return;
  if (!motoriOn()) { hint(KS.kvar90211 ? '90211: pusti enabling device, pričekaj 2 s i potvrdi poruku (Acknowledge).' : 'Robot se ne giba: enabling device drži do pola (Motors On).'); return; }
  if (KS.izvodi || gib) { hint('Za vrijeme izvođenja programa joystick ne pomiče robota.'); return; }
  const faktor = KS.brzina / 100;
  const mod = KS.jog.mod, staro = q.slice();
  if (mod === 'osi13' || mod === 'osi46') {
    const osi = mod === 'osi13' ? [1, 0, 2] : [4, 3, 5];
    for (let k = 0; k < 3; k++) {
      if (Math.abs(v[k]) < 0.03) continue;
      const j = osi[k], g = K.GRANICE[j];
      let nq = q[j] + v[k] * 36 * faktor * dt;
      if (nq < g[0] || nq > g[1]) {
        nq = Math.max(g[0], Math.min(g[1], nq));
        if (!DOG.some(e => !e.potvrdjen && e.broj === 50028 && e.a.os === j + 1)) { dogadjaj(50028, { os: j + 1 }); KS.granica50028[j] = true; }
      }
      q[j] = nq;
      if (KS.granica50028[j] && q[j] - g[0] > 1 && g[1] - q[j] > 1) { KS.granica50028[j] = false; oznaci('e50028'); }
    }
  } else {
    const al = alatKin(jogAlat()), f = K.fk(q, al);
    let X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
    if (KS.jog.ks === 'tool') { X = K.stupac(f.R, 0); Y = K.stupac(f.R, 1); Z = K.stupac(f.R, 2); }
    else if (KS.jog.ks === 'wobj') { const W = wobjPoza(jogWobj()); X = K.stupac(W.R, 0); Y = K.stupac(W.R, 1); Z = K.stupac(W.R, 2); }
    let cilj;
    if (mod === 'linear') {
      const s = 0.25 * faktor * dt;
      cilj = { p: K.add(f.p, K.add(K.add(K.mul(Y, v[0] * s), K.mul(X, v[1] * s)), K.mul(Z, v[2] * s))), R: f.R };
    } else {
      const w = K.add(K.add(K.mul(Y, v[0]), K.mul(X, v[1])), K.mul(Z, v[2])), n = K.norm(w);
      const Rr = K.rotOs(K.unit(w), n * 35 * faktor * dt * D2R);
      cilj = { p: f.p, R: K.mulR(Rr, f.R) };
    }
    const r = K.ikPuna(cilj, q, al, { granice: false, iter: 30 });
    let skok = 0; for (let j = 0; j < 6; j++) skok = Math.max(skok, Math.abs(r.q[j] - q[j]));
    // velik skok osi za mali pomak = blizu singulariteta
    if (!r.ok || skok > 4 + 120 * dt) { if (performance.now() - jogPoruka > 1500) { jogPoruka = performance.now(); dogadjaj(50026); } return; }
    const izvan = r.q.findIndex((x, j) => x < K.GRANICE[j][0] || x > K.GRANICE[j][1]);
    if (izvan >= 0) { if (!DOG.some(e => !e.potvrdjen && e.broj === 50028 && e.a.os === izvan + 1)) dogadjaj(50028, { os: izvan + 1 }); return; }
    q = r.q;
  }
  if (q.some((x, i) => x !== staro[i])) { KS.jogPomaknut = true; oznaci('motors'); if (lc(KS.jog.alat) === 'tool0') oznaci('tool0'); }
}
function hint(t) { const h = $('fp-hint'); if (h.textContent !== t) h.textContent = t; clearTimeout(hint.t); hint.t = setTimeout(() => { h.textContent = ''; }, 2500); }

// =====================================================================================
// 10. Vodič (koraci A–J) i zamke
// =====================================================================================
const VODIC = [
  ['A', 'backup', 'Sigurnosna kopija sustava na USB', 'Backup and Restore → Backup Current System… → mapa 120-102663_Backup_20261013_1 na USB-u.'],
  ['A', 'brzina25', 'Brzina spuštena na 25 %', 'Quickset (ROB_1) → Speed → 25 %. Na početku je bilo 100 %.'],
  ['C', 'gkod', 'G-kod pretvoren u RAPID modul', 'gkod2rapid.html na računalu; modul u korijen USB sticka, ne u podmapu.'],
  ['D', 'load1', 'FTQ_IRB120_TEKST_V01 učitan s Load Module', 'Modules → File → Load Module… → Yes (program pointer) → /USB → provjeri File name → OK.'],
  ['D', 'main_rename', 'Zamka main: rutina preimenovana', 'Routines → main() u retku s modulom FTQ_IRB120_TEKST_V01 → File → Rename… → FTQ_Crtaj (Shift + - je _).'],
  ['D', 'check_ok', 'Check Program: No errors found', 'Debug → Check Program.'],
  ['E', 'tool0', 'Pomicanje s alatom tool0', 'Quickset ili Jogging: Tool = tool0, ne stari alat tPen.'],
  ['E', 'motors', 'Motors On i ručno pomicanje', 'Enabling device do pola, joystick lagano; raspored osi u okviru Joystick directions.'],
  ['E', 'e50028', '50028: os vraćena iz granice', 'Acknowledge → Axis 1–3 ili 4–6 → joystick u suprotnom smjeru.'],
  ['E', 'okomito', 'Flomaster okomito prema papiru', 'Zglob okrenut tako da flomaster gleda dolje (os 4 na −159,8°); orijentacija se više ne mijenja.'],
  ['F', 'load_proba', 'FTQ_PROBA učitan', 'Load Module… → /USB → FTQ_PROBA.mod (provjeri polje File name).'],
  ['F', 'proba_rename', 'FTQ_PROBA#2 riješen preimenovanjem', 'FTQ_PROBA#2 → Routines → FTQ_Proba() → File → Rename… → FTQ_Pisi; modul se vrati na FTQ_PROBA.'],
  ['G', 'pnula', 'pNula naučena na papiru (Modify Position)', 'Linear, tool0, wobj0; vrh na papiru; FTQ_Nula → dotakni pNula → Modify Position → Modify.'],
  ['H', 'pp_rutina', 'PP to Routine → FTQ_Pisi', 'Debug → PP to Routine… → FTQ_Pisi → OK; ponovno Debug da se izbornik zatvori.'],
  ['H', 'zrak', 'Proba u zraku (zProba = 30)', 'Enabling device do pola → Start; robot piše 30 mm iznad papira.'],
  ['H', 'z5', 'Prolaz 5 mm iznad papira (zProba = 5)', 'Program Data → num → zProba = 5 → PP to Routine → Start; flomaster nigdje ne dira.'],
  ['H', 'ispis', 'Ispis na papir (zProba = 0)', 'zProba = 0 → PP to Routine → FTQ_Pisi → Start; tinta na papiru.'],
  ['I', 'save', 'Modul s naučenom točkom spremljen na USB', 'Modules → FTQ_PROBA → File → Save Module As… → /USB → OK (Yes za prepisivanje).'],
  ['J', 'pp_main', 'PP to Main', 'T_ROB1 MainModule → Debug → PP to Main.'],
  ['J', 'osi', 'Osi vraćene u početnu pozu', 'Axis 4–6 pa 1–3 dok Position ne pokaže 6,01 / −5,67 / −88,18 / −0,77 / 53,03 / −23,01 (±3°).'],
  ['J', 'goto', 'Go to position p10', 'U kodu dotakni p10 → Debug → Go to position → drži enabling device i Go To.'],
  ['J', 'paleta', 'Ciklus paletizacije završen', 'Step Forward red po red, zatim Start; kockica na paleti.'],
];
// grana „Stanica“ (S): postav, PLC, HMI, paletizacija s traka, okretni stol, prelazak na pisanje i povratak
const VODIC_ST = [
  ['S', 'st_postav', 'Postav stanice odabran (Stanica A ili B)', 'U stvarnosti: traka, stol i paleta postavljeni i pričvršćeni; mjere zapisane.'],
  ['S', 'st_plc', 'PLC profil odabran', 'Isti program: M262 ili M241 u Machine Expertu, S7-1200 u TIA Portalu.'],
  ['S', 'st_io', 'Ulazi robota pregledani (Inputs and Outputs → DI)', 'Na FlexPendantu: Inputs and Outputs → View → Digital Inputs; DI_1_predmet mora reagirati na PLC.'],
  ['S', 'st_rapid', 'RAPID paletizacije generiran i učitan (FTQ_STANICA)', 'Postav → Generiraj RAPID → na USB → Load Module; točke pPrihvat i pPaleta naučiti s Modify Position.'],
  ['S', 'st_hmi_start', 'Ciklus pokrenut s HMI-ja (Start)', 'GTO2315: Start; zelena lampa; PLC pušta traku.'],
  ['S', 'st_senzor', 'Fotoćelija zaustavila traku', 'Predmet prekrije zraku na kraju trake, PLC isključi ATV320 (Q_TrakaNaprijed = 0).'],
  ['S', 'st_waitdi', 'Robot čeka WaitDI DI_1_predmet i nastavlja kad PLC postavi signal', 'U Production Windowu PP stoji na WaitDI dok PLC ne postavi Q_PredmetSpreman.'],
  ['S', 'st_pick', 'Prvi predmet uzet s trake (DO_0_gripper, PulseDO DO_1_uzeo)', 'Prsti zatvoreni na kraju trake; PLC broji komad i ponovno pušta traku.'],
  ['S', 'st_stol', 'Okretni stol indeksiran na zahtjev robota (Stanica B)', 'PulseDO DO_3_stol_indeks → M262/Lexium okreće 360°/N → WaitDI DI_2_stol_u_poz.'],
  ['S', 'st_paleta', 'Paleta puna: svi predmeti rastera odloženi', 'FOR petlje po rasteru s Offs(pPaleta, i*px, j*py, k*pz).'],
  ['S', 'st_pisanje', 'Prebačeno na pisanje: modul za ploču učitan', 'Nakon paletizacije: Load Module s modulom pisanja (pNula, zProba) uz postojeće module.'],
  ['S', 'st_okomito', 'Flomaster okomito na plohu za pisanje', 'Zglob okrenut (Axis 4–6) tako da flomaster gleda u ploču; orijentacija se više ne mijenja.'],
  ['S', 'st_pnula', 'pNula naučena na ploči (Modify Position)', 'Linear, tool0 i wobj iz retka; vrh flomastera dodiruje ploču; Modify Position.'],
  ['S', 'st_tinta', 'Tinta na ploči (zProba = 0)', 'Proba u zraku (30), prolaz 5 mm, pa 0: tinta na ploči.'],
  ['S', 'st_povratak', 'Povratak na paletizaciju (PP to Routine / PP to Main, Start)', 'Osi u početnu pozu, PP na Paletizacija ili main, Start; robot opet čeka WaitDI.'],
];
const ZAMKE = [
  [40010, 'Global routine name main ambiguous', 'Dodatni modul ima PROC main(). Rješenje: Rename, ne Change Declaration.'],
  ['okomito', 'Alat koji se „ne vidi“: flomaster okomit na prirubnicu', 'TCP (default orient.) uzima os prirubnice. Zglob okrenut, orijentacija stalna, Offs s tool0.'],
  [50028, '50028 Jog in wrong direction', 'Os na granici; joystick u suprotnom smjeru.'],
  [40011, 'Module name FTQ_PROBA ambiguous (FTQ_PROBA#2)', 'Ime rutine = ime modula ili dvostruko učitavanje.'],
  ['pp_kraj', '„Program nije krenuo“', 'Nakon PP to Routine PP se vrati na prvi redak; gledaj položaj robota.'],
  [50436, '50436 Robot configuration error', 'MoveL p10 iz poze za flomaster; osi u početnu pozu, Go to position.'],
  [20051, '20051 Not allowed command', 'Go To ili Start bez Motors On.'],
  ['goto50028', '50028 za os 4 na −159,8° (Go To)', 'Os 4 prema 0° u Axis 4–6, zatim ostale osi.'],
  [90211, '90211 Two channel fault, Enable Chain', 'Enabling device do kraja; pusti, pričekaj, Acknowledge.'],
  ['regain', 'Regain Request', 'Robot pomaknut nakon zaustavljanja; na cilju No pa Yes.'],
];
const vodicStanje = {}; const zamkeStanje = {};
function oznaci(id) {
  if (vodicStanje[id]) return;
  if (!VODIC.some(v => v[1] === id) && !VODIC_ST.some(v => v[1] === id)) return;
  vodicStanje[id] = true; crtajVodic();
}
function zamkaVidjena(k) {
  const z = ZAMKE.find(x => x[0] === k); if (!z || zamkeStanje[k]) return;
  zamkeStanje[k] = true; crtajVodic();
}
function crtajVodic() {
  const popis = (L, broj, traka, el) => {
    const n = L.filter(v => vodicStanje[v[1]]).length;
    $(broj).textContent = n + ' / ' + L.length;
    $(traka).style.width = (100 * n / L.length) + '%';
    $(el).innerHTML = L.map(v => '<li class="' + (vodicStanje[v[1]] ? 'gotovo' : '') + '" data-vodic="' + v[1] + '"><span class="kv" aria-hidden="true"></span><span><span class="k">' + v[0] + '</span> <b>' + esc(v[2]) + '</b>' + (vodicStanje[v[1]] ? ' <span class="pom" style="display:inline">(gotovo)</span>' : '') + '</span><small><em>Na stvarnom robotu:</em> ' + esc(v[3]) + '</small></li>').join('');
  };
  popis(VODIC, 'vodic-broj', 'vodic-traka', 'vodic-popis');
  popis(VODIC_ST, 'vodic-st-broj', 'vodic-st-traka', 'vodic-st-popis');
  const zv = ZAMKE.filter(z => zamkeStanje[z[0]]).length;
  $('zamke-broj').textContent = zv + ' viđeno';
  $('zamke-popis').innerHTML = ZAMKE.map((z, i) => '<li class="' + (zamkeStanje[z[0]] ? 'vidjeno' : '') + '"><span class="kv" aria-hidden="true"></span><span><span class="k">' + (i + 1) + '</span> <b>' + esc(z[1]) + '</b></span><small>' + esc(z[2]) + '</small></li>').join('');
}
function provjeriStanjaVodica(fl) {
  if (fl && fl.dz !== undefined) {
    const z = K.stupac(K.fk(q, ALAT_FLO).R, 2);
    if (z[2] < -0.9986) { oznaci('okomito'); zamkaVidjena('okomito'); }       // unutar 3° od okomice
    if (POSTAV.rezim === 'stanica' && K.dot(z, PLOHA.ez) < -0.9986) oznaci('st_okomito');
  }
  const P = D.POCETNA_POZA; if (vodicStanje.goto || vodicStanje.pp_main) { if (q.every((v, i) => Math.abs(v - P[i]) < 3) && (vodicStanje.ispis || vodicStanje.zrak || vodicStanje.okomito)) oznaci('osi'); }
}

// =====================================================================================
// 11. FlexPendant: prozori, izbornici, dijalozi
// =====================================================================================
const FP = {
  otvoreni: ['proizvodnja'], aktivni: 'proizvodnja', meni: null, dijalog: null, qs: null,
  ur: { pogled: 'moduli', modul: null, rutina: null, kod: null, kursor: null, skrij: false },
  pd: { tip: null, odabran: null },
  jog: { pogled: 'glavni', odabran: null, def: null },
  br: { pogled: 'glavni', ime: '', put: '/USB', izvor: null },
  dog: { odabran: null }, io: { odabran: 'DO_0_gripper', pogled: 'DO' },
  pomaci: {},
};
const PROZORI = {
  proizvodnja: { kratko: 'Production Window', ik: 'PW' },
  urednik: { kratko: 'T_ROB1 ' , ik: 'PE' },
  jogging: { kratko: 'Jogging', ik: 'J' },
  podaci: { kratko: 'Program Data', ik: 'PD' },
  backup: { kratko: 'Backup and Restore', ik: 'BR' },
  dog: { kratko: 'Event Log', ik: 'EL' },
  io: { kratko: 'Inputs and Outputs', ik: 'IO' },
};
function otvori(id) {
  if (!FP.otvoreni.includes(id)) { FP.otvoreni.push(id); if (FP.otvoreni.length > 6) FP.otvoreni.shift(); }
  FP.aktivni = id; FP.meni = null; FP.qs = null; prikazi();
}
function zatvoriAktivni() {
  const i = FP.otvoreni.indexOf(FP.aktivni); if (i >= 0) FP.otvoreni.splice(i, 1);
  FP.aktivni = FP.otvoreni[FP.otvoreni.length - 1] || null; prikazi();
}
let toastT = 0;
function toast(t) { const e = $('fp-toast'); e.textContent = t; e.classList.add('vidi'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('vidi'), 2600); }
function dijalog(o) { FP.dijalog = o; FP.meni = null; prikazi(); }
function dijalogGresaka(g, uvod) {
  dijalog({ naslov: 'Check Program', ikona: 'greska', html: '<p>' + esc(uvod) + '</p>' + g.map(x => '<p style="font-family:ui-monospace,monospace;font-size:.76rem">' + esc(x.tekst) + '</p>').join('') + '<div class="hr-obj"><b>Hrvatski:</b> program s greškom ne može se pokrenuti. Za main ambiguous: Routines → Rename; za modul#2: preimenuj rutinu ili obriši dvaput učitani modul.</div>', gumbi: [{ t: 'OK' }] });
}
function ikona(v) { return '<span class="ik-p ' + v + '">' + (v === 'greska' ? '×' : v === 'upoz' ? '!' : v === 'pitanje' ? '?' : 'i') + '</span>'; }

// ---------- ikone načina gibanja ----------
const SVG_MOD = {
  osi13: '<svg viewBox="0 0 28 22"><path d="M4 18h8l4-9 6-4" fill="none" stroke="currentColor" stroke-width="2"/><text x="17" y="21" font-size="8" fill="currentColor">1-3</text></svg>',
  osi46: '<svg viewBox="0 0 28 22"><circle cx="10" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2"/><text x="17" y="21" font-size="8" fill="currentColor">4-6</text></svg>',
  linear: '<svg viewBox="0 0 28 22"><path d="M4 18V4M4 18h16M4 18l10-8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="0"/><path d="M8 14l9-7" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/></svg>',
  reorient: '<svg viewBox="0 0 28 22"><path d="M6 15a8 8 0 1 1 8 4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 19l-3-3M14 19l-4 1" stroke="currentColor" stroke-width="2"/></svg>',
};
const NAZIV_MOD = { osi13: 'Axis 1 - 3', osi46: 'Axis 4 - 6', linear: 'Linear', reorient: 'Reorient' };
const NAZIV_KS = { world: 'World', base: 'Base', tool: 'Tool', wobj: 'Work object' };

// ---------- crtanje cijelog zaslona ----------
function prikazi() {
  const zaslon = $('fp-zaslon');
  const tij = zaslon.querySelector('.fp-tijelo');
  if (tij && FP.zadnjiPrikaz) FP.pomaci[FP.zadnjiPrikaz] = tij.scrollTop;
  const pr = $('fp-prozor');
  if (!FP.aktivni) pr.innerHTML = '<div class="fp-tijelo" style="display:grid;place-items:center;color:#8B989F;font-size:.85rem">ABB · 120-SIM<br>☰ za glavni izbornik</div>';
  else pr.innerHTML = PRIKAZ[FP.aktivni]();
  const kljuc = FP.aktivni + ':' + (FP.aktivni === 'urednik' ? FP.ur.pogled : FP.aktivni === 'jogging' ? FP.jog.pogled : '');
  const nt = pr.querySelector('.fp-tijelo');
  if (nt) {
    if (FP.skrolajDo) { const el = nt.querySelector(FP.skrolajDo); if (el) nt.scrollTop = Math.max(0, el.offsetTop - nt.clientHeight / 3); FP.skrolajDo = null; }
    else if (FP.pomaci[kljuc] !== undefined) nt.scrollTop = FP.pomaci[kljuc];
    if (KS.izvodi && (FP.aktivni === 'urednik' || FP.aktivni === 'proizvodnja')) { const el = nt.querySelector('.kl.pp'); if (el && (el.offsetTop < nt.scrollTop || el.offsetTop > nt.scrollTop + nt.clientHeight - 40)) nt.scrollTop = Math.max(0, el.offsetTop - nt.clientHeight / 3); }
  }
  FP.zadnjiPrikaz = kljuc;
  // traka otvorenih prozora
  $('fp-zadaci').innerHTML = FP.otvoreni.map(id => '<button type="button" data-fp="otvori:' + id + '" aria-current="' + (id === FP.aktivni) + '">' + esc(kratkoIme(id)) + '</button>').join('');
  $('fp-qs').innerHTML = SVG_MOD[KS.jog.mod] + '<b>ROB_1</b><span>' + KS.brzina + ' %</span>';
  zaslon.querySelector('.fp-abb').setAttribute('aria-expanded', FP.meni && FP.meni.vrsta === 'glavni' ? 'true' : 'false');
  crtajSloj();
  osvjeziStatus(true);
  // sloj izbornika i dijaloga počinje ispod statusne trake (na mobitelu je viša)
  const sl = $('fp-sloj'), vis = zaslon.querySelector('.fp-status').offsetHeight;
  if (sl.style.top !== vis + 'px') sl.style.top = vis + 'px';
}
function kratkoIme(id) {
  if (id === 'urednik') { const m = FP.ur.kod || FP.ur.modul; return 'T_ROB1 ' + (m ? m.prikaz : 'Modules'); }
  return PROZORI[id].kratko;
}
function okvir(naslov, ik, tijelo, naredbe, tabovi) {
  return '<div class="fp-naslov"><span class="ik">' + ik + '</span><span>' + esc(naslov) + '</span></div>' + (tabovi || '') +
    '<div class="fp-tijelo">' + tijelo + '</div>' + (naredbe ? '<div class="fp-naredbe">' + naredbe + '</div>' : '');
}
const gumbN = (t, fp, opc = {}) => '<button type="button" data-fp="' + fp + '"' + (opc.dis ? ' disabled' : '') + (opc.exp !== undefined ? ' aria-expanded="' + !!opc.exp + '"' : '') + '>' + t + '</button>';

// ---------- status ----------
let zadnjiStatus = '';
function osvjeziStatus(sila) {
  const mot = KS.restart ? 'Restarting' : KS.kvar90211 ? 'Motors Off' : KS.enabling === 'pola' ? 'Motors On' : 'Guard Stop';
  const izv = (KS.izvodi || (gib && gib.vrsta !== 'precac') ? 'Running' : 'Stopped') + ' (Speed ' + KS.brzina + '%)';
  const err = nepotvrdjeni().filter(e => e.vrsta !== 'info').length;
  const s = mot + '|' + izv + '|' + err;
  if (!sila && s === zadnjiStatus) return; zadnjiStatus = s;
  $('st-2').innerHTML = '<span class="' + (mot === 'Motors On' ? 'on' : 'off') + '">' + mot + '</span>';
  $('st-3').textContent = izv;
  $('st-4').innerHTML = err ? '<button type="button" class="fp-err" data-fp="otvori:dog">Error Not Acknowledged</button>' : esc(KS.pp ? 'T_ROB1 · ' + KS.pp.r.ime : 'T_ROB1');
  document.querySelectorAll('.fp-seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.en === KS.enabling ? 'true' : 'false'));
}

// ---------- sloj: izbornici, quickset, dijalozi, poruka o događaju ----------
function crtajSloj() {
  const s = $('fp-sloj'); let h = '';
  if (FP.meni) {
    const m = FP.meni;
    if (m.vrsta === 'glavni') h += crtajGlavni();
    else h += '<div class="fp-meni ' + m.klasa + '" style="' + (m.stil || '') + '">' + m.stavke.map((x, i) => x ? '<button type="button" data-fp="mn:' + i + '"' + (x.dis ? ' disabled' : '') + (x.fp ? ' data-id="' + x.fp + '"' : '') + '>' + esc(x.t) + '</button>' : '').join('') + '</div>';
  }
  if (FP.qs) h += crtajQuickset();
  if (FP.dijalog) {
    const d = FP.dijalog;
    h += '<div class="fp-zastor"><div class="fp-dijalog" role="dialog" aria-label="' + esc(d.naslov) + '"><h3>' + (d.ikona ? ikona(d.ikona) : '') + esc(d.naslov) + '</h3><div class="sad">' + (typeof d.html === 'function' ? d.html() : d.html) + '</div><div class="dg">' +
      d.gumbi.map((g, i) => '<button type="button" data-fp="dg:' + i + '"' + (g.fp ? ' data-id="' + g.fp + '"' : '') + (g.dis ? ' disabled' : '') + (g.glavni ? ' class="glavni"' : '') + '>' + esc(g.t) + '</button>').join('') + '</div></div></div>';
  }
  const e = nepotvrdjeni().find(x => x.vrsta !== 'info');
  if (e) {
    h += '<div class="fp-zastor" style="z-index:9"><div class="fp-dijalog" role="alertdialog" aria-label="Event message"><h3>' + ikona(e.vrsta) + esc(String(e.broj)) + ' &nbsp;' + esc(e.naslov) + '</h3><div class="sad">' + htmlDogadjaja(e) + '</div><div class="dg"><button type="button" data-fp="potvrdi" class="glavni">Acknowledge</button></div></div></div>';
  }
  s.innerHTML = h;
}
function htmlDogadjaja(e) {
  const p = (n, t) => t ? '<div class="dog-polje"><b>' + n + '</b>' + esc(t).replace(/\n/g, '<br>') + '</div>' : '';
  return '<div class="dog-polje"><b>' + e.vrijeme.toLocaleDateString('hr-HR') + ' ' + e.vrijeme.toLocaleTimeString('hr-HR') + '</b></div>' +
    p('Description', e.opis) + p('Consequences', e.posljedice) + p('Probable causes', e.uzroci) + p('Recommended actions', e.radnje) +
    (e.hr ? '<div class="hr-obj"><b>Objašnjenje:</b> ' + esc(e.hr) + '</div>' : '');
}
function crtajGlavni() {
  const L = [['HotEdit', null, 'HE'], ['Backup and Restore', 'backup', 'BR'], ['Inputs and Outputs', 'io', 'IO'], ['Calibration', null, 'CA'], ['Jogging', 'jogging', 'J'], ['Control Panel', null, 'CP'],
    ['Production Window', 'proizvodnja', 'PW'], ['Event Log', 'dog', 'EL'], ['Program Editor', 'urednik', 'PE'], ['FlexPendant Explorer', null, 'FE'], ['Program Data', 'podaci', 'PD'], ['System Info', null, 'SI']];
  return '<div class="fp-meni fp-glavni">' + L.map(([t, id, ik]) => '<button type="button" data-fp="' + (id ? 'otvori:' + id : '') + '"' + (id ? '' : ' disabled') + '><span class="gi">' + ik + '</span>' + t + '</button>').join('') +
    '<div class="dno"><button type="button" disabled>Log Off Default User</button><button type="button" disabled>Restart</button></div></div>';
}
function crtajQuickset() {
  const t = FP.qs.tab;
  const nav = [['meh', 'ROB_1', SVG_MOD[KS.jog.mod]], ['ink', 'Increment', '<svg viewBox="0 0 22 18"><path d="M3 15h4v-4h4V7h4V3h4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'], ['run', 'Run Mode', '<svg viewBox="0 0 22 18"><path d="M5 9a6 6 0 1 0 6-6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 1v4l3-2z" fill="currentColor"/></svg>'], ['step', 'Step Mode', '<svg viewBox="0 0 22 18"><path d="M4 4h10M4 9h10M4 14h10M17 6l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'], ['brz', 'Speed', '<svg viewBox="0 0 22 18"><path d="M3 15a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 15l4-6" stroke="currentColor" stroke-width="1.8"/></svg>']];
  let sad = '';
  if (t === 'meh') {
    const alati = sviPodaciTipa('tooldata'), wobj = sviPodaciTipa('wobjdata');
    sad = '<h4>Mechanical unit: ROB_1</h4><div class="qs-red">' + ['osi13', 'osi46', 'linear', 'reorient'].map(m => '<button type="button" data-fp="qs-mod:' + m + '" aria-pressed="' + (KS.jog.mod === m) + '" title="' + NAZIV_MOD[m] + '">' + SVG_MOD[m] + '</button>').join('') + '</div>' +
      '<div style="font-size:.74rem;margin:-4px 0 8px">' + NAZIV_MOD[KS.jog.mod] + '</div>' +
      '<label style="font-size:.74rem">Tool</label><select class="qs-sel" data-fp-sel="alat">' + alati.map(d => '<option' + (lc(d.ime) === lc(KS.jog.alat) ? ' selected' : '') + '>' + esc(d.ime) + '</option>').join('') + '</select>' +
      '<label style="font-size:.74rem">Work object</label><select class="qs-sel" data-fp-sel="wobj">' + wobj.map(d => '<option' + (lc(d.ime) === lc(KS.jog.wobj) ? ' selected' : '') + '>' + esc(d.ime) + '</option>').join('') + '</select>' +
      (FP.qs.detalji ? '<h4>Coordinate system</h4><div class="qs-red">' + ['world', 'base', 'tool', 'wobj'].map(k => '<button type="button" data-fp="qs-ks:' + k + '" aria-pressed="' + (KS.jog.ks === k) + '">' + NAZIV_KS[k] + '</button>').join('') + '</div>' : '') +
      '<div class="qs-red"><button type="button" data-fp="qs-det">' + (FP.qs.detalji ? 'Hide Details' : 'Show Details') + '</button></div>';
  } else if (t === 'brz') {
    sad = '<h4>Speed</h4><div class="qs-brzina">' + KS.brzina + ' %</div><div class="qs-red">' + [-5, -1, 1, 5].map(d => '<button type="button" data-fp="qs-brz-d:' + d + '">' + (d > 0 ? '+' : '−') + Math.abs(d) + ' %</button>').join('') + '</div><div class="qs-red">' + [0, 25, 50, 100].map(v => '<button type="button" data-fp="qs-brz:' + v + '" aria-pressed="' + (KS.brzina === v) + '">' + v + ' %</button>').join('') + '</div>';
  } else if (t === 'run') {
    sad = '<h4>Run Mode</h4><div class="qs-red"><button type="button" data-fp="qs-run:single" aria-pressed="' + (KS.rezim === 'single') + '">Single Cycle</button><button type="button" data-fp="qs-run:continuous" aria-pressed="' + (KS.rezim === 'continuous') + '">Continuous</button></div><p style="font-size:.74rem;margin:0">Single Cycle: main se izvede jednom i PP se vrati na prvi redak. Continuous: main se ponavlja.</p>';
  } else if (t === 'step') sad = '<h4>Step Mode</h4><div class="qs-red"><button type="button" aria-pressed="true">Step In</button><button type="button" disabled>Step Over</button><button type="button" disabled>Step Out</button></div>';
  else sad = '<h4>Increment</h4><div class="qs-red"><button type="button" aria-pressed="true">None</button><button type="button" disabled>Small</button><button type="button" disabled>Medium</button><button type="button" disabled>Large</button></div>';
  return '<div class="fp-qs-ploca" role="dialog" aria-label="Quickset"><nav>' + nav.map(([id, n, ik]) => '<button type="button" data-fp="qs-tab:' + id + '" aria-current="' + (t === id) + '">' + ik + n + '</button>').join('') + '</nav><div class="fp-qs-sad">' + sad + '</div></div>';
}
function sviPodaciTipa(tip) { const L = []; for (const M of prog.moduli) for (const d of M.deklaracije) if (d.tip === tip) L.push(d); return L; }

// ---------- prozori ----------
const PRIKAZ = {};
PRIKAZ.proizvodnja = () => {
  let tij;
  if (!KS.pp) tij = '<div class="fp-tekst"><p>No program pointer is set in T_ROB1.</p><p style="color:#5B6A72">Program Editor → Debug → PP to Main ili PP to Routine.</p></div>';
  else { const M = KS.pp.m, l = KS.pp.s.l; tij = kodHTML(M, Math.max(1, l - 30), Math.min(M.linije.length, l + 30), false); }
  const op = '<div class="op-prozor" id="op-prozor"><div class="n">Operator Window (TPWrite)</div>' + (KS.ispis.length ? KS.ispis.slice(-8).map(x => '<div>' + esc(x.t) + '</div>').join('') : '<div class="n">—</div>') + '</div>';
  return '<div class="fp-naslov"><span class="ik">PW</span><span>Production Window : ' + esc(KS.pp ? KS.pp.r.ime : '—') + '</span></div><div class="fp-tijelo">' + tij + '</div>' + op +
    '<div class="fp-naredbe">' + gumbN('Load Program...', '', { dis: 1 }) + gumbN('PP to Main', 'pp-main') + gumbN('Debug', '', { dis: 1 }) + '</div>';
};
function tokeniziraj(linija) {
  const i = linija.indexOf('!'); let kod = linija, kom = '';
  // komentar: ! izvan stringa
  let uStr = false; for (let k = 0; k < linija.length; k++) { if (linija[k] === '"') uStr = !uStr; if (linija[k] === '!' && !uStr) { kod = linija.slice(0, k); kom = linija.slice(k); break; } }
  void i;
  let h = ''; const re = /("[^"]*"?)|([A-Za-z_][A-Za-z0-9_]*)|([^A-Za-z_"]+)/g; let m;
  const KW = /^(MODULE|ENDMODULE|PROC|ENDPROC|CONST|PERS|VAR|LOCAL|IF|THEN|ELSE|ELSEIF|ENDIF|WHILE|DO|ENDWHILE|FOR|FROM|TO|STEP|ENDFOR|RETURN|EXIT|AND|OR|NOT|TRUE|FALSE|TEST|CASE|DEFAULT|ENDTEST)$/;
  while ((m = re.exec(kod))) {
    if (m[1]) h += '<span class="str">' + esc(m[1]) + '</span>';
    else if (m[2]) h += '<span class="w' + (KW.test(m[2]) ? ' kw' : '') + '" data-x="' + m.index + '">' + esc(m[2]) + '</span>';
    else h += esc(m[3]);
  }
  if (kom) h += '<span class="kom">' + esc(kom) + '</span>';
  return h;
}
const SVG_PP = '<svg viewBox="0 0 13 12" aria-label="PP"><path d="M0 4h7V0l6 6-6 6V8H0z" fill="#E8A000" stroke="#7A5200" stroke-width=".6"/></svg>';
const SVG_MP = '<svg viewBox="0 0 13 12" aria-label="MP"><path d="M2 11h9M4 11V8h5v3M6.5 8V5l3-3" fill="none" stroke="#2565AE" stroke-width="1.6"/></svg>';
function kodHTML(M, od, doo, kursor) {
  const ppL = KS.pp && KS.pp.m === M ? KS.pp.s.l : -1, mpL = KS.mp && KS.mp.m === M ? KS.mp.s.l : -1;
  const k = kursor && FP.ur.kursor && FP.ur.kursor.m === M ? FP.ur.kursor : null;
  const skrivene = new Set(FP.ur.skrij && kursor ? M.deklaracije.map(d => d.linija) : []);
  let h = '<div class="kod">';
  for (let i = od; i <= doo; i++) {
    let t = tokeniziraj(M.linije[i - 1] || '');
    if (k && k.l === i && k.x !== undefined) t = t.replace('data-x="' + k.x + '"', 'data-x="' + k.x + '" class2').replace(/class="w([^"]*)" data-x="(\d+)" class2/, 'class="w$1 sel" data-x="$2"');
    h += '<div class="kl' + (i === ppL ? ' pp' : '') + (k && k.l === i ? ' kursor' : '') + (skrivene.has(i) ? ' skriven' : '') + '" data-fp="kl" data-l="' + i + '"><i class="kn">' + i + '</i><span class="kpp">' + (i === ppL ? SVG_PP : '') + (i === mpL ? SVG_MP : '') + '</span><span class="kt">' + t + '</span></div>';
  }
  return h + '</div>';
}
function taboviUrednika() {
  const p = FP.ur.pogled;
  return '<div class="fp-tabovi"><button type="button" data-fp="ur:zadaci" aria-current="' + (p === 'zadaci') + '">Tasks and Programs</button><button type="button" data-fp="ur:moduli" aria-current="' + (p === 'moduli') + '">Modules</button><button type="button" data-fp="ur:rutine" aria-current="' + (p === 'rutine' || p === 'kod') + '">Routines</button></div>';
}
PRIKAZ.urednik = () => {
  const u = FP.ur;
  if (u.pogled === 'zadaci') {
    const pm = prog.moduli.find(m => !m.sustavni);
    return okvir('T_ROB1', 'PE', '<table class="fp-tab"><thead><tr><th>Task Name</th><th>Program Name</th><th>Type</th></tr></thead><tbody><tr aria-selected="true"><td>T_ROB1</td><td>' + esc(pm ? pm.ime : '—') + '</td><td>Normal</td></tr></tbody></table>',
      gumbN('File', 'mn-zad', { exp: FP.meni && FP.meni.id === 'zad' }) + gumbN('Show Modules', 'ur:moduli'), taboviUrednika());
  }
  if (u.pogled === 'moduli') {
    const rows = prog.moduli.map((m, i) => '<tr data-fp="mod-sel:' + i + '" aria-selected="' + (u.modul === m) + '"><td>' + esc(m.prikaz) + '</td><td class="siv">' + (m.sustavni ? 'System module' : 'Program module') + '</td><td class="siv">' + (m.promijenjen ? 'Changed' : '') + '</td></tr>').join('');
    return okvir('T_ROB1 — Modules', 'PE', '<table class="fp-tab"><thead><tr><th>Name</th><th>Type</th><th>Changed</th></tr></thead><tbody>' + rows + '</tbody></table>',
      gumbN('File', 'mn-mod', { exp: FP.meni && FP.meni.id === 'mod' }) + gumbN('Refresh', 'ur:moduli') + gumbN('Show Module', 'mod-show', { dis: !u.modul }), taboviUrednika());
  }
  if (u.pogled === 'rutine') {
    const L = prog.sveRutine();
    const rows = L.map(({ r, m }, i) => '<tr data-fp="rut-sel:' + i + '" aria-selected="' + (u.rutina && u.rutina.r === r) + '"><td>' + esc(r.ime) + '()</td><td class="siv">' + esc(m.prikaz) + '</td><td class="siv">' + (r.vrsta === 'PROC' ? 'Procedure' : r.vrsta === 'FUNC' ? 'Function' : 'Trap') + '</td></tr>').join('');
    return okvir('T_ROB1 — Routines', 'PE', '<table class="fp-tab"><thead><tr><th>Name</th><th>Module</th><th>Type</th></tr></thead><tbody>' + rows + '</tbody></table>',
      gumbN('File', 'mn-rut', { exp: FP.meni && FP.meni.id === 'rut' }) + gumbN('Show Routine', 'rut-show', { dis: !u.rutina }) + gumbN('Back', 'ur:moduli'), taboviUrednika());
  }
  // pogled koda
  const M = u.kod; if (!M || !prog.moduli.includes(M)) { u.pogled = 'moduli'; return PRIKAZ.urednik(); }
  const k = u.kursor && u.kursor.m === M ? u.kursor : null;
  const rIme = k ? (prog.rutinaURetku(M, k.l) || {}).ime : (KS.pp && KS.pp.m === M ? KS.pp.r.ime : '');
  const odabrano = k && k.rijec ? prog.podatak(k.rijec, M) : null;
  const rt = odabrano && odabrano.tip === 'robtarget';
  return okvir('T_ROB1/' + M.prikaz + (rIme ? '/' + rIme : ''), 'PE', kodHTML(M, 1, M.linije.length, true),
    gumbN('Add Instruction', '', { dis: 1 }) + gumbN('Edit', '', { dis: 1 }) + gumbN('Debug', 'mn-debug', { exp: FP.meni && FP.meni.id === 'debug' }) + gumbN('Modify Position', 'modpos', { dis: !rt }) + gumbN(FP.ur.skrij ? 'Show Declarations' : 'Hide Declarations', 'skrij'), taboviUrednika());
};
PRIKAZ.jogging = () => {
  const j = FP.jog;
  if (j.pogled === 'mod') return okvir('Jogging - Motion mode', 'J', '<div class="fp-mreza">' + ['osi13', 'osi46', 'linear', 'reorient'].map(m => '<button type="button" data-fp="jog-mod:' + m + '" aria-pressed="' + (KS.jog.mod === m) + '">' + SVG_MOD[m] + NAZIV_MOD[m] + '</button>').join('') + '</div>', gumbN('OK', 'jog:glavni'));
  if (j.pogled === 'ks') return okvir('Jogging - Coordinate system', 'J', '<div class="fp-mreza">' + ['world', 'base', 'tool', 'wobj'].map(k => '<button type="button" data-fp="jog-ks:' + k + '" aria-pressed="' + (KS.jog.ks === k) + '">' + NAZIV_KS[k] + '</button>').join('') + '</div>', gumbN('OK', 'jog:glavni'));
  if (j.pogled === 'alat' || j.pogled === 'wobj') {
    const tip = j.pogled === 'alat' ? 'tooldata' : 'wobjdata', L = sviPodaciTipa(tip), akt = j.pogled === 'alat' ? KS.jog.alat : KS.jog.wobj;
    const sel = j.odabran || akt;
    return okvir('Jogging - ' + (j.pogled === 'alat' ? 'Tool' : 'Work object'), 'J', '<table class="fp-tab"><thead><tr><th>' + (j.pogled === 'alat' ? 'Tool' : 'Work object') + ' name</th><th>Module</th><th>Scope</th></tr></thead><tbody>' +
      L.map(d => '<tr data-fp="jog-izb:' + esc(d.ime) + '" aria-selected="' + (lc(d.ime) === lc(sel)) + '"><td>' + esc(d.ime) + '</td><td class="siv">RAPID/T_ROB1/' + esc(d.modul.prikaz) + '</td><td class="siv">' + (d.lokalno ? 'Local' : 'Global') + '</td></tr>').join('') + '</tbody></table>',
      gumbN('New...', '', { dis: 1 }) + (j.pogled === 'alat' ? gumbN('Edit', 'mn-alat', { exp: FP.meni && FP.meni.id === 'alat' }) : gumbN('Edit', '', { dis: 1 })) + gumbN('OK', 'jog-ok') + gumbN('Cancel', 'jog:glavni'));
  }
  if (j.pogled === 'define') {
    const d = j.def;
    const red = (i) => '<tr data-fp="def-sel:' + i + '" aria-selected="' + (d.i === i) + '"><td>Point ' + (i + 1) + '</td><td class="siv">' + (d.t[i] ? 'Modified' : '-') + '</td></tr>';
    return okvir('Program Data - tooldata - Define', 'J', '<div class="fp-tekst" style="padding-bottom:4px"><p><b>Tool Frame Definition</b><br>Tool: ' + esc(d.alat) + '</p><p>Select a method, modify positions and tap OK.</p>' +
      '<div class="fp-polje"><span>Method:</span><span class="vr">TCP (default orient.)</span><span></span></div><div class="fp-polje"><span>No. of points:</span><span class="vr">4</span><span></span></div></div>' +
      '<table class="fp-tab"><thead><tr><th>Point</th><th>Status</th></tr></thead><tbody>' + [0, 1, 2, 3].map(red).join('') + '</tbody></table>',
      gumbN('Modify Position', 'def-mod') + gumbN('Positions', '', { dis: 1 }) + gumbN('OK', 'def-ok', { dis: d.t.some(x => !x) }) + gumbN('Cancel', 'jog:alat'));
  }
  // glavni prozor Jogging
  const sv = (n, v, akc) => '<div class="sv' + (akc ? '' : ' mrtvo') + '"' + (akc ? ' data-fp="' + akc + '"' : '') + '><span>' + n + '</span><b>' + esc(v) + '</b></div>';
  const smj = MAPA_JOY[KS.jog.mod];
  const svg1 = '<svg viewBox="0 0 26 26"><path d="M13 3v20M13 3l-4 5M13 3l4 5M13 23l-4-5M13 23l4-5" fill="none" stroke="#2565AE" stroke-width="2"/></svg>';
  const svg2 = '<svg viewBox="0 0 26 26"><path d="M3 13h20M3 13l5-4M3 13l5 4M23 13l-5-4M23 13l-5 4" fill="none" stroke="#2565AE" stroke-width="2"/></svg>';
  const svg3 = '<svg viewBox="0 0 26 26"><path d="M6 17a8 8 0 1 1 13 0" fill="none" stroke="#2565AE" stroke-width="2"/><path d="M19 17l-1-5M19 17l-5-1" stroke="#2565AE" stroke-width="2"/></svg>';
  return okvir('Jogging', 'J', '<div class="fp-jog"><div class="svojstva">' +
    sv('Mechanical unit:', 'ROB_1...', '') + sv('Absolute accuracy:', 'Off', '') + sv('Motion mode:', NAZIV_MOD[KS.jog.mod] + '...', 'jog:mod') + sv('Coordinate system:', NAZIV_KS[KS.jog.ks] + '...', 'jog:ks') +
    sv('Tool:', KS.jog.alat + '...', 'jog:alat') + sv('Work object:', KS.jog.wobj + '...', 'jog:wobj') + sv('Payload:', 'load0...', '') + sv('Joystick lock:', 'None...', '') + sv('Increment:', 'None...', '') +
    '</div><div class="fp-poz"><h4 id="poz-naslov">Position</h4><table id="poz-tablica"></table><h4>Joystick directions</h4><div class="smjerovi"><div>' + svg1 + '<b>' + smj[0] + '</b></div><div>' + svg2 + '<b>' + smj[1] + '</b></div><div>' + svg3 + '<b>' + smj[2] + '</b></div></div></div></div>',
    gumbN('Align...', '', { dis: 1 }) + gumbN('Go To...', '', { dis: 1 }) + gumbN('Activate...', '', { dis: 1 }));
};
function osvjeziPoziciju() {
  const t = document.getElementById('poz-tablica'); if (!t) return;
  let h = '';
  if (KS.jog.mod === 'osi13' || KS.jog.mod === 'osi46') {
    $('poz-naslov').textContent = 'Position (Degrees)';
    for (let i = 0; i < 6; i++) h += '<tr><td>' + (i + 1) + ':</td><td>' + minus(f2(q[i])) + ' °</td></tr>';
  } else {
    const rt = robtargetIz(q, jogAlat(), KS.jog.ks === 'wobj' ? jogWobj() : podatak('wobj0'));
    $('poz-naslov').textContent = 'Position (' + (KS.jog.ks === 'wobj' ? 'Work object' : KS.jog.ks === 'tool' ? 'Base' : NAZIV_KS[KS.jog.ks]) + ', ' + KS.jog.alat + ')';
    ['X', 'Y', 'Z'].forEach((n, i) => { h += '<tr><td>' + n + ':</td><td>' + minus(f2(rt[0][i])) + ' mm</td></tr>'; });
    ['q1', 'q2', 'q3', 'q4'].forEach((n, i) => { h += '<tr><td>' + n + ':</td><td>' + minus(rt[1][i].toFixed(5)) + '</td></tr>'; });
    h += '<tr><td>Cfg:</td><td>' + rt[2].join(' ') + '</td></tr>';
  }
  if (t.innerHTML !== h) t.innerHTML = h;
}
PRIKAZ.podaci = () => {
  const p = FP.pd;
  if (!p.tip) {
    const tipovi = [...new Set(prog.moduli.flatMap(m => m.deklaracije.map(d => d.tip)))].sort();
    return okvir('Program Data - Used data types', 'PD', '<div class="fp-tekst" style="padding-bottom:0"><p>Select a data type from the list.<br><span style="color:#5B6A72">Scope: RAPID/T_ROB1</span></p></div><div class="fp-mreza">' + tipovi.map(t => '<button type="button" data-fp="pd-tip:' + t + '">' + t + '</button>').join('') + '</div>',
      gumbN('Show Data', '', { dis: 1 }) + gumbN('View', '', { dis: 1 }));
  }
  const L = sviPodaciTipa(p.tip);
  return okvir('Program Data - ' + p.tip, 'PD', '<div class="fp-tekst" style="padding:6px 10px"><p style="margin:0">Data Type: ' + p.tip + ' &nbsp; Select data. &nbsp; Scope: RAPID/T_ROB1</p></div><table class="fp-tab"><thead><tr><th>Name</th><th>Value</th><th>Module</th></tr></thead><tbody>' +
    L.map((d, i) => '<tr data-fp="pd-sel:' + i + '" aria-selected="' + (p.odabran === d) + '"><td>' + esc(d.ime) + '</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">' + esc(R.uTekst(d.vrijednost)) + '</td><td class="siv">' + esc(d.modul.prikaz) + '</td></tr>').join('') + '</tbody></table>',
    gumbN('Filter', '', { dis: 1 }) + gumbN('New...', '', { dis: 1 }) + gumbN('Edit', 'pd-edit', { dis: !p.odabran }) + gumbN('Refresh', 'pd-refresh') + gumbN('View Data Types', 'pd-tipovi'));
};
PRIKAZ.backup = () => {
  const b = FP.br;
  if (b.pogled === 'backup') {
    return okvir('Backup and Restore - Backup Current System', 'BR', '<div class="fp-tekst"><p>All modules and system parameters will be stored in a backup folder. Select a folder or accept the default and tap Backup.</p>' +
      '<div class="fp-polje"><span>Backup folder:</span><span class="vr">' + esc(b.ime) + '</span><button type="button" data-fp="br-ime">ABC...</button></div>' +
      '<div class="fp-polje"><span>Backup path:</span><span class="vr">' + esc(b.put) + '/</span><button type="button" data-fp="br-put">...</button></div>' +
      '<p style="margin-top:10px">The entire backup will be created to:<br><b>' + esc(b.put + '/' + b.ime) + '/</b></p></div>',
      gumbN('Backup', 'br-backup') + gumbN('Cancel', 'br:glavni'));
  }
  if (b.pogled === 'restore') {
    return okvir('Backup and Restore - Restore System', 'BR', '<div class="fp-tekst"><p>When restoring the system, the current system data is replaced and the controller restarts. The robot does not move.</p>' +
      '<div class="fp-polje"><span>Backup folder:</span><span class="vr' + (b.izvor ? '' : ' sivo') + '">' + esc(b.izvor || 'not selected') + '</span><button type="button" data-fp="br-izvor">...</button></div>' +
      '<div class="hr-obj"><b>Hrvatski:</b> Restore nije gumb za poništavanje: vraća program i postavke iz kopije i ponovno pokreće kontroler, ali ne pomiče robota. Greške od položaja robota (npr. 50436) ostaju.</div></div>',
      gumbN('Restore', 'br-restore', { dis: !b.izvor }) + gumbN('Cancel', 'br:glavni'));
  }
  return okvir('Backup and Restore', 'BR', '<div class="fp-mreza" style="grid-template-columns:1fr 1fr;padding:18px"><button type="button" data-fp="br:backup" style="min-height:110px"><svg viewBox="0 0 28 22"><path d="M4 4h14l6 6v10H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 8v8M10 12l4 4 4-4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>Backup Current System...</button><button type="button" data-fp="br:restore" style="min-height:110px"><svg viewBox="0 0 28 22"><path d="M4 4h14l6 6v10H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 16V8M10 12l4-4 4 4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>Restore System...</button></div>');
};
PRIKAZ.dog = () => {
  const o = FP.dog.odabran && DOG.find(e => e.id === FP.dog.odabran);
  if (o) return okvir('Event Log - Event Message', 'EL', '<div class="fp-tekst"><p><span class="dot ' + o.vrsta + '"></span> <b>' + esc(String(o.broj)) + ' ' + esc(o.naslov) + '</b></p>' + htmlDogadjaja(o) + '</div>', gumbN('OK', 'dog-natrag'));
  return okvir('Event Log - Common', 'EL', '<table class="fp-tab"><thead><tr><th></th><th>Code</th><th>Title</th><th>Date and time</th></tr></thead><tbody>' +
    (DOG.length ? DOG.map(e => '<tr class="dog-red" data-fp="dog-sel:' + e.id + '"><td><span class="dot ' + e.vrsta + '"></span></td><td>' + esc(String(e.broj)) + '</td><td style="white-space:normal">' + esc(e.naslov) + (e.potvrdjen ? '' : ' <b style="color:#C62E1C">!</b>') + '</td><td class="siv">' + e.vrijeme.toLocaleTimeString('hr-HR') + '</td></tr>').join('') : '<tr><td colspan="4" class="siv">No events.</td></tr>') + '</tbody></table>',
    gumbN('Delete all', 'dog-brisi') + gumbN('View: Common', '', { dis: 1 }));
};
PRIKAZ.io = () => {
  const tip = FP.io.pogled, L = ROBOT_IO.filter(s => s.tip === tip);
  if (tip === 'DI' && POSTAV.rezim === 'stanica') oznaci('st_io');
  const od = ROBOT_IO.find(s => s.ime === FP.io.odabran), plcSig = od && SIGNALI.find(x => x.robot === od.ime);
  const tab = '<div class="fp-tabovi"><button type="button" data-fp="io-pogled:DI" aria-current="' + (tip === 'DI') + '">Digital Inputs</button><button type="button" data-fp="io-pogled:DO" aria-current="' + (tip === 'DO') + '">Digital Outputs</button></div>';
  return okvir('Inputs and Outputs - ' + (tip === 'DI' ? 'Digital Inputs' : 'Digital Outputs'), 'IO', '<table class="fp-tab"><thead><tr><th>Name</th><th>Value</th><th>Type</th><th>Device</th></tr></thead><tbody>' +
    L.map(s => '<tr data-fp="io-sel:' + s.ime + '" aria-selected="' + (FP.io.odabran === s.ime) + '"><td>' + s.ime + '</td><td>' + KS.io[s.ime] + '</td><td class="siv">' + s.tip + '</td><td class="siv">d652</td></tr>').join('') + '</tbody></table><div class="fp-tekst"><p style="color:#5B6A72">' +
    (od ? esc(od.ime) + ': ' + esc(od.opis) + (plcSig ? ' PLC: ' + esc(plcSig.id) + ' (' + esc(adresa(plcSig, plc.profil)) + ').' : '') : '') + (tip === 'DI' ? ' Ulaze postavlja PLC; u simulatoru ih možeš forsirati u panelu PLC-a.' : '') + '</p></div>',
    gumbN('0', 'io-0', { dis: tip === 'DI' }) + gumbN('1', 'io-1', { dis: tip === 'DI' }) + gumbN('View', '', { dis: 1 }), tab);
};

// ---------- tipkovnica, brojevi, preglednik datoteka ----------
function tipkovnica(naslov, vrijednost, ok, opis) {
  const st = { v: vrijednost, shift: false };
  const redovi = () => {
    const r1 = st.shift ? '!@#$%^&*()' : '1234567890', r2 = 'qwertyuiop', r3 = 'asdfghjkl', r4 = 'zxcvbnm';
    const t = (c) => '<button type="button" data-fp="tk:' + esc(c) + '">' + esc(st.shift ? c.toUpperCase() : c) + '</button>';
    return [...r1].map(t).join('') + [...r2].map(t).join('') + [...r3].map(t).join('') + '<button type="button" data-fp="tk:' + (st.shift ? '_' : '-') + '">' + (st.shift ? '_' : '-') + '</button>' +
      '<button type="button" class="siroka" data-fp="tk:SHIFT" aria-pressed="' + st.shift + '">Shift</button>' + [...r4].map(t).join('') + '<button type="button" data-fp="tk:.">.</button>' +
      '<button type="button" class="siroka" data-fp="tk:BKSP">←</button><button type="button" class="siroka" data-fp="tk:CLR">Clear</button><button type="button" class="siroka" data-fp="tk: ">Space</button><button type="button" class="siroka" data-fp="tk:LEFT">◂</button><button type="button" class="siroka" data-fp="tk:RIGHT">▸</button>';
  };
  dijalog({ naslov, html: () => (opis || '') + '<input class="fp-unos" id="tk-unos" value="' + esc(st.v) + '" spellcheck="false" autocomplete="off"><div class="fp-tipkovnica">' + redovi() + '</div>', st,
    tipka: (c) => {
      const inp = $('tk-unos'); st.v = inp.value;
      if (c === 'SHIFT') { st.shift = !st.shift; prikazi(); return; }
      if (c === 'BKSP') st.v = st.v.slice(0, -1); else if (c === 'CLR') st.v = ''; else if (c === 'LEFT' || c === 'RIGHT') return;
      else { st.v += st.shift ? c.toUpperCase() : c; if (st.shift) st.shift = false; }
      prikazi(); const i2 = $('tk-unos'); if (i2) { i2.focus(); i2.setSelectionRange(st.v.length, st.v.length); }
    },
    gumbi: [{ t: 'OK', fp: 'tk-ok', glavni: true, fn: () => ok(($('tk-unos') || { value: st.v }).value.trim()) }, { t: 'Cancel' }] });
}
function brojevi(naslov, vrijednost, ok) {
  dijalog({ naslov, html: () => '<input class="fp-unos" id="nb-unos" value="' + esc(vrijednost) + '" inputmode="decimal"><div class="fp-numpad">' + ['7', '8', '9', '←', '4', '5', '6', 'Clear', '1', '2', '3', '+/-', '0', '.', '-', ''].map(c => c ? '<button type="button" data-fp="nb:' + c + '">' + c + '</button>' : '<span></span>').join('') + '</div>',
    tipka: (c) => { const i = $('nb-unos'); let v = i.value; if (c === '←') v = v.slice(0, -1); else if (c === 'Clear') v = ''; else if (c === '+/-') v = v.startsWith('-') ? v.slice(1) : '-' + v; else v += c; i.value = v; },
    gumbi: [{ t: 'OK', fp: 'nb-ok', glavni: true, fn: () => { const v = parseFloat(($('nb-unos').value || '').replace(',', '.')); if (isNaN(v)) { toast('Upiši broj.'); return false; } ok(v); } }, { t: 'Cancel' }] });
}
// preglednik: nacin 'otvori' | 'spremi' | 'mapa'
function preglednik(o) {
  const st = { put: o.put || '/USB', odabrano: o.ime || '', filter: o.filter || 'mod' };
  const popis = () => {
    const c = cvor(st.put);
    if (!c) return '';
    const e = Object.entries(c.djeca).filter(([n, x]) => x.tip === 'mapa' || o.nacin === 'spremi' || st.filter === 'sve' || /\.(mod|sys|modx|prg)$/i.test(n)).sort((a, b) => (a[1].tip === b[1].tip ? a[0].localeCompare(b[0]) : a[1].tip === 'mapa' ? -1 : 1));
    return e.map(([n, x]) => '<tr data-fp="pg:' + esc(n) + '" aria-selected="' + (st.odabrano === n) + '"><td><span class="ikd' + (x.tip === 'dat' ? ' f' : '') + '"></span>' + esc(n) + '</td><td class="siv">' + (x.tip === 'mapa' ? 'Folder' : (x.tekst.length / 1024).toFixed(1) + ' KB') + '</td></tr>').join('') || '<tr><td class="siv" colspan="2">Empty folder</td></tr>';
  };
  dijalog({ naslov: o.naslov, html: () => '<div class="fp-put"><code>' + esc(st.put) + '</code><button type="button" data-fp="pg-gore">Up</button><button type="button" data-fp="pg-usb">USB</button><button type="button" data-fp="pg-hd">hd0a</button></div>' +
      '<div class="fp-dat"><table class="fp-tab"><tbody>' + popis() + '</tbody></table></div>' +
      (o.nacin !== 'mapa' ? '<div class="fp-polje" style="margin-top:8px;grid-template-columns:80px 1fr auto"><span>File name:</span><input class="fp-unos" id="pg-ime" value="' + esc(st.odabrano) + '" spellcheck="false"' + (o.nacin === 'otvori' ? ' readonly' : '') + '><span></span></div>' : '') +
      (o.nacin === 'otvori' ? '<div class="fp-polje" style="grid-template-columns:80px 1fr auto"><span>Files of type:</span><select class="qs-sel" style="margin:0" data-fp-sel="filter"><option value="mod"' + (st.filter === 'mod' ? ' selected' : '') + '>Modules (*.mod; *.sys)</option><option value="sve"' + (st.filter === 'sve' ? ' selected' : '') + '>All files (*.*)</option></select><span></span></div><p style="font-size:.74rem;margin:4px 0 0"><button type="button" data-fp="pg-upload" style="border:1px solid #C3CCD2;background:#F4F6F7;padding:3px 8px;border-radius:2px">Učitaj s računala na USB…</button> <span style="color:#5B6A72">(samo simulator)</span></p>' : ''),
    st, nacin: o.nacin,
    klik: (n) => {
      const c = cvor(st.put + '/' + n);
      if (c && c.tip === 'mapa') { if (o.nacin === 'mapa' && c.backup !== undefined || o.nacin === 'mapa' && c.stari) { st.odabrano = n; } else { st.put = st.put + '/' + n; st.odabrano = ''; } }
      else st.odabrano = n;
      prikazi();
    },
    gumbi: [{ t: 'OK', fp: 'pg-ok', glavni: true, fn: () => { const ime = o.nacin === 'otvori' || o.nacin === 'mapa' ? st.odabrano : ($('pg-ime') || {}).value; if (!ime && o.nacin !== 'mapa') { toast('Odaberi datoteku.'); return false; } return o.ok(st.put, ime); } }, { t: 'Cancel' }] });
}

// =====================================================================================
// 12. Radnje na zaslonu (klikovi)
// =====================================================================================
function meni(id, stavke, klasa, stil) { if (FP.meni && FP.meni.id === id) { FP.meni = null; prikazi(); return; } FP.meni = { id, stavke, klasa: klasa || 'fp-padajuci', stil: stil || 'left:0' }; FP.qs = null; prikazi(); }
function odabraniModul() { return FP.ur.modul && prog.moduli.includes(FP.ur.modul) ? FP.ur.modul : null; }

function radnja(a, el) {
  const [k, p] = a.split(/:(.*)/s);
  switch (k) {
    case 'izbornik': FP.meni = FP.meni && FP.meni.vrsta === 'glavni' ? null : { vrsta: 'glavni' }; FP.qs = null; prikazi(); return;
    case 'otvori': FP.meni = null; if (p === 'dog') FP.dog.odabran = null; otvori(p); return;
    case 'zatvori': FP.meni = null; FP.qs = null; zatvoriAktivni(); return;
    case 'quickset': FP.qs = FP.qs ? null : { tab: 'meh', detalji: false }; FP.meni = null; prikazi(); return;
    case 'qs-tab': FP.qs.tab = p; prikazi(); return;
    case 'qs-mod': KS.jog.mod = p; prikazi(); return;
    case 'qs-ks': KS.jog.ks = p; prikazi(); return;
    case 'qs-det': FP.qs.detalji = !FP.qs.detalji; prikazi(); return;
    case 'qs-brz': postaviBrzinu(+p); return;
    case 'qs-brz-d': postaviBrzinu(KS.brzina + +p); return;
    case 'qs-run': KS.rezim = p; prikazi(); return;
    case 'potvrdi': { const e = nepotvrdjeni().find(x => x.vrsta !== 'info'); if (e) potvrdi(e); return; }
    case 'mn': { const s = FP.meni && FP.meni.stavke[+p]; FP.meni = null; prikazi(); if (s && s.fn && !s.dis) s.fn(); return; }
    case 'dg': { const d = FP.dijalog; if (!d) return; const g = d.gumbi[+p]; if (!g || g.dis) return; const r = g.fn ? g.fn() : undefined; if (r !== false && FP.dijalog === d) { FP.dijalog = null; prikazi(); } return; }
    case 'tk': FP.dijalog && FP.dijalog.tipka && FP.dijalog.tipka(p); return;
    case 'nb': FP.dijalog && FP.dijalog.tipka && FP.dijalog.tipka(p); return;
    case 'pg': FP.dijalog && FP.dijalog.klik(p); return;
    case 'pg-gore': { const st = FP.dijalog.st; const d = st.put.split('/').filter(Boolean); if (d.length > 1) { d.pop(); st.put = '/' + d.join('/'); st.odabrano = ''; prikazi(); } return; }
    case 'pg-usb': FP.dijalog.st.put = '/USB'; FP.dijalog.st.odabrano = ''; prikazi(); return;
    case 'pg-hd': FP.dijalog.st.put = '/hd0a'; FP.dijalog.st.odabrano = ''; prikazi(); return;
    case 'pg-upload': $('usb-ulaz').click(); return;
    case 'pp-main': ppNaMain(); return;
    // ---- Program Editor ----
    case 'ur': FP.ur.pogled = p; FP.meni = null; prikazi(); return;
    case 'mod-sel': FP.ur.modul = prog.moduli[+p]; prikazi(); return;
    case 'mod-show': { const M = odabraniModul(); if (!M) return; FP.ur.kod = M; FP.ur.pogled = 'kod'; FP.skrolajDo = '.kl.pp'; prikazi(); return; }
    case 'rut-sel': { const x = prog.sveRutine()[+p]; FP.ur.rutina = x; FP.ur.modul = x.m; prikazi(); return; }
    case 'rut-show': { const x = FP.ur.rutina; if (!x) return; FP.ur.kod = x.m; FP.ur.pogled = 'kod'; FP.ur.kursor = { m: x.m, l: x.r.linija }; FP.skrolajDo = '.kl[data-l="' + x.r.linija + '"]'; prikazi(); return; }
    case 'kl': return;
    case 'skrij': FP.ur.skrij = !FP.ur.skrij; prikazi(); return;
    case 'mn-mod': meni('mod', [
      { t: 'New Module...', fn: noviModul }, { t: 'Load Module...', fp: 'load-module', fn: ucitajModulDijalog }, { t: 'Save Module As...', fp: 'save-as', fn: spremiModulDijalog, dis: !odabraniModul() },
      { t: 'Change Declaration...', fn: deklaracijaModula, dis: !odabraniModul() }, { t: 'Delete Module...', fp: 'delete-module', fn: obrisiModulDijalog, dis: !odabraniModul() }]); return;
    case 'mn-zad': meni('zad', [{ t: 'Load Program...', fp: 'load-program', fn: ucitajProgramDijalog }, { t: 'Save Program As...', dis: true }, { t: 'Rename Program...', dis: true }]); return;
    case 'mn-rut': meni('rut', [{ t: 'New Routine...', dis: true }, { t: 'Duplicate Routine...', dis: true }, { t: 'Change Declaration...', fp: 'rut-decl', fn: deklaracijaRutine, dis: !FP.ur.rutina }, { t: 'Rename...', fp: 'rut-rename', fn: preimenujRutinu, dis: !FP.ur.rutina }, { t: 'Delete Routine...', fn: obrisiRutinu, dis: !FP.ur.rutina }]); return;
    case 'mn-debug': {
      const k = FP.ur.kursor, M = FP.ur.kod, d = k && k.rijec ? prog.podatak(k.rijec, M) : null;
      meni('debug', [
        { t: 'PP to Main', fp: 'pp-main', fn: ppNaMain }, { t: 'PP to Cursor', fp: 'pp-cursor', fn: ppNaKursor, dis: !k },
        { t: 'PP to Routine...', fp: 'pp-routine', fn: () => izborRutine('PP to Routine', (x) => ppNaRutinu(x.r, x.m)) }, { t: 'Cursor to PP', fn: kursorNaPP, dis: !KS.pp },
        { t: 'Cursor to MP', fn: () => { if (KS.mp) { FP.ur.kod = KS.mp.m; FP.ur.kursor = { m: KS.mp.m, l: KS.mp.s.l }; FP.skrolajDo = '.kl.kursor'; prikazi(); } }, dis: !KS.mp },
        { t: 'Call Routine...', fn: () => izborRutine('Call Routine', pozoviRutinu) }, { t: 'Cancel Call Routine', fn: () => { if (KS.spremljeniPoziv) { const s = KS.spremljeniPoziv; KS.spremljeniPoziv = null; KS.gen = s.gen; KS.pp = s.pp; KS.korijen = s.korijen; prikazi(); } }, dis: !KS.spremljeniPoziv },
        { t: 'View Value', fn: () => dijalog({ naslov: 'View Value', ikona: 'info', html: '<p><b>' + esc(k.rijec) + '</b> := ' + esc(R.uTekst(d.vrijednost)) + '</p>', gumbi: [{ t: 'OK' }] }), dis: !d },
        { t: 'Check Program', fp: 'check', fn: provjeriProgram }, { t: 'View System Data', dis: true },
        { t: 'Search Routine', fn: () => izborRutine('Search Routine', (x) => { FP.ur.kod = x.m; FP.ur.kursor = { m: x.m, l: x.r.linija }; FP.skrolajDo = '.kl.kursor'; prikazi(); }) },
        { t: 'Go to position', fp: 'goto', fn: () => { const n = naredbaURetku(M, k.l); pripremiGoTo(k.rijec, n.alat, n.wobj); }, dis: !(d && d.tip === 'robtarget') }], 'fp-debug'); return;
    }
    case 'modpos': modifyPosition(); return;
    // ---- Jogging ----
    case 'jog': FP.jog.pogled = p; FP.jog.odabran = null; FP.meni = null; prikazi(); return;
    case 'jog-mod': KS.jog.mod = p; FP.jog.pogled = 'glavni'; prikazi(); return;
    case 'jog-ks': KS.jog.ks = p; FP.jog.pogled = 'glavni'; prikazi(); return;
    case 'jog-izb': FP.jog.odabran = p; prikazi(); return;
    case 'jog-ok': if (FP.jog.odabran) { if (FP.jog.pogled === 'alat') { KS.jog.alat = FP.jog.odabran; if (lc(KS.jog.alat) === 'tool0') oznaci('tool0'); } else KS.jog.wobj = FP.jog.odabran; } FP.jog.pogled = 'glavni'; prikazi(); return;
    case 'mn-alat': meni('alat', [{ t: 'Change Declaration...', dis: true }, { t: 'Change Value...', fn: () => { const d = prog.podatak(FP.jog.odabran || KS.jog.alat); dijalog({ naslov: 'Change Value', ikona: 'info', html: '<p>' + esc(d.ime) + ' := ' + esc(R.uTekst(d.vrijednost)) + '</p>', gumbi: [{ t: 'OK' }] }); } }, { t: 'Delete', dis: true }, { t: 'Define...', fp: 'define', fn: definirajAlat }]); return;
    case 'def-sel': FP.jog.def.i = +p; prikazi(); return;
    case 'def-mod': { const d = FP.jog.def; const f = K.fk(q, K.TOOL0); d.t[d.i] = { p: f.p, R: f.R }; if (d.i < 3) d.i++; prikazi(); return; }
    case 'def-ok': izracunajAlat(); return;
    // ---- Program Data ----
    case 'pd-tip': FP.pd.tip = p; FP.pd.odabran = null; prikazi(); return;
    case 'pd-tipovi': FP.pd.tip = null; prikazi(); return;
    case 'pd-refresh': prikazi(); return;
    case 'pd-sel': { FP.pd.odabran = sviPodaciTipa(FP.pd.tip)[+p]; prikazi(); return; }
    case 'pd-edit': urediPodatak(FP.pd.odabran); return;
    // ---- Backup and Restore ----
    case 'br': FP.br.pogled = p; if (p === 'backup') { let n = 1; while (cvor(FP.br.put + '/120-SIM_Backup_' + datumKopije() + '_' + n)) n++; FP.br.ime = '120-SIM_Backup_' + datumKopije() + '_' + n; } prikazi(); return;
    case 'br-ime': tipkovnica('Backup folder', FP.br.ime, (v) => { if (v) FP.br.ime = v; }); return;
    case 'br-put': preglednik({ naslov: 'Select backup path', nacin: 'mapa', put: FP.br.put, ok: (put) => { FP.br.put = put; } }); return;
    case 'br-backup': napraviBackup(); return;
    case 'br-izvor': preglednik({ naslov: 'Select backup folder', nacin: 'mapa', put: '/USB', ok: (put, ime) => { if (!ime) { toast('Odaberi mapu s kopijom.'); return false; } FP.br.izvor = put + '/' + ime; prikazi(); } }); return;
    case 'br-restore': restoreDijalog(); return;
    // ---- Event Log ----
    case 'dog-sel': FP.dog.odabran = +p; prikazi(); return;
    case 'dog-natrag': FP.dog.odabran = null; prikazi(); return;
    case 'dog-brisi': for (let i = DOG.length - 1; i >= 0; i--) if (DOG[i].potvrdjen) DOG.splice(i, 1); prikazi(); return;
    // ---- I/O ----
    case 'io-sel': FP.io.odabran = p; prikazi(); return;
    case 'io-pogled': FP.io.pogled = p; FP.io.odabran = (ROBOT_IO.find(s => s.tip === p) || {}).ime; prikazi(); return;
    case 'io-0': case 'io-1': try { postaviIO(FP.io.odabran, k === 'io-1' ? 1 : 0); } catch (e) { /* */ } prikazi(); return;
  }
}
function postaviBrzinu(v) { KS.brzina = Math.max(0, Math.min(100, Math.round(v))); if (KS.brzina === 25) oznaci('brzina25'); prikazi(); }

// klik u kodu: kursor na riječ
function klikKod(el, ev) {
  const red = el.closest('.kl'); if (!red) return;
  const l = +red.dataset.l, w = ev.target.closest('.w');
  FP.ur.kursor = { m: FP.ur.kod, l, x: w ? +w.dataset.x : undefined, rijec: w ? w.textContent : null };
  if (FP.meni && FP.meni.id === 'debug') FP.meni = null;
  prikazi();
}
function naredbaURetku(M, l) {
  let nadjena = null;
  const trazi = (L) => { for (const s of L) { if (s.l === l && s.t === 'poziv') nadjena = s; if (s.t === 'if') { s.grane.forEach(g => trazi(g.tijelo)); if (s.inace) trazi(s.inace); } if (s.t === 'while' || s.t === 'for') trazi(s.tijelo); } };
  M.rutine.forEach(r => trazi(r.tijelo));
  let alat = podatak('tool0'), wobj = podatak('wobj0'), alatIme = 'tool0', wobjIme = 'wobj0';
  if (nadjena && /^move/i.test(nadjena.ime)) {
    const poz = nadjena.arg.filter(a => !a.opc && !a.ime);
    if (poz[3] && poz[3].izraz.t === 'id') { const d = prog.podatak(poz[3].izraz.ime, M); if (d) { alat = d.vrijednost; alatIme = d.ime; } }
    const w = nadjena.arg.find(a => lc(a.opc || '') === 'wobj'); if (w && w.izraz.t === 'id') { const d = prog.podatak(w.izraz.ime, M); if (d) { wobj = d.vrijednost; wobjIme = d.ime; } }
  }
  return { s: nadjena, alat, wobj, alatIme, wobjIme };
}
function ppNaKursor() {
  const k = FP.ur.kursor; if (!k) return;
  if (KS.izvodi) { toast('Najprije zaustavi program (Stop).'); return; }
  const r = prog.rutinaURetku(k.m, k.l);
  if (!r) { dijalog({ naslov: 'PP to Cursor', ikona: 'upoz', html: '<p>The cursor is not in a routine.</p>', gumbi: [{ t: 'OK' }] }); return; }
  const put = prog.putDoRetka(r, k.l);
  if (!put) { dijalog({ naslov: 'PP to Cursor', ikona: 'upoz', html: '<p>Place the cursor on an instruction.</p>', gumbi: [{ t: 'OK' }] }); return; }
  const g = prog.provjeri(); if (g.length) { dijalogGresaka(g, 'PP to Cursor is not possible. The program contains errors.'); return; }
  postaviPP(r, k.m, lc(r.ime) === 'main' ? 'main' : 'rutina', put);
}
function kursorNaPP() { if (!KS.pp) return; FP.ur.kod = KS.pp.m; FP.ur.pogled = 'kod'; FP.ur.kursor = { m: KS.pp.m, l: KS.pp.s.l }; FP.skrolajDo = '.kl.pp'; prikazi(); }
function izborRutine(naslov, fn) {
  const L = prog.sveRutine().filter(x => x.r.vrsta === 'PROC' && !x.r.parametri.length);
  const st = { i: -1 };
  dijalog({ naslov, html: () => '<p>Select a routine:</p><div class="fp-dat" style="max-height:220px"><table class="fp-tab"><thead><tr><th>Name</th><th>Module</th></tr></thead><tbody>' + L.map((x, i) => '<tr data-fp="pg:' + i + '" aria-selected="' + (st.i === i) + '"><td>' + esc(x.r.ime) + '</td><td class="siv">' + esc(x.m.prikaz) + '</td></tr>').join('') + '</tbody></table></div>',
    klik: (i) => { st.i = +i; prikazi(); },
    gumbi: [{ t: 'OK', fp: 'rut-ok', glavni: true, fn: () => { if (st.i < 0) return false; if (naslov !== 'Search Routine') { const g = prog.provjeri(); if (g.length) { setTimeout(() => dijalogGresaka(g, naslov + ' is not possible. The program contains errors.'), 0); return; } } fn(L[st.i]); } }, { t: 'Cancel' }] });
}
function pozoviRutinu(x) {
  KS.spremljeniPoziv = { gen: KS.gen, pp: KS.pp, korijen: KS.korijen, cekanje: KS.cekanje };
  KS.gen = napraviGen(x.r, x.m, null); KS.korijen = { r: x.r, m: x.m, vrsta: 'poziv' };
  const y = KS.gen.next(); KS.pp = y.done ? null : y.value; prikazi();
}
function provjeriProgram() {
  const g = prog.provjeri();
  if (!g.length) { dijalog({ naslov: 'Check Program', ikona: 'info', html: '<p><b>No errors found.</b></p>', gumbi: [{ t: 'OK', fp: 'check-ok' }] }); if (prog.moduli.some(m => !m.sustavni && lc(m.ime) !== 'mainmodule')) oznaci('check_ok'); }
  else dijalogGresaka(g, 'Errors found in T_ROB1:');
}
function modifyPosition() {
  const k = FP.ur.kursor, M = FP.ur.kod; if (!k || !k.rijec) return;
  const d = prog.podatak(k.rijec, M); if (!d || d.tip !== 'robtarget') return;
  const n = naredbaURetku(M, k.l);
  dijalog({ naslov: 'Confirm Modify Position', ikona: 'pitanje', html: '<p>Modify position <b>' + esc(d.ime) + '</b>?</p><p>Tool: ' + esc(n.alatIme) + ' &nbsp; Work object: ' + esc(n.wobjIme) + '</p><p><b>This operation cannot be undone.</b></p><p style="font-size:.76rem"><label><input type="checkbox" disabled> Don’t show this dialog again</label></p>',
    gumbi: [{ t: 'Modify', fp: 'modify', glavni: true, fn: () => {
      d.vrijednost = robtargetIz(q, n.alat, n.wobj); d.promjena = (d.promjena || 0) + 1; linijaDeklaracije(d); d.sink = d.promjena; d.modul.promijenjen = true;
      toast('Modify Position: ' + d.ime + ' = [' + d.vrijednost[0].map(f2).join(', ') + ']');
      if (lc(d.ime) === 'pnula') { const f = K.fk(q, ALAT_FLO), l = naPlohi(f.p), z = K.stupac(f.R, 2); if (Math.abs(l.dz) < 0.0015 && K.dot(z, PLOHA.ez) < -0.995) { oznaci('pnula'); if (POSTAV.rezim === 'stanica') oznaci('st_pnula'); } }
    } }, { t: 'Cancel' }] });
}
function urediPodatak(d) {
  if (!d) return;
  if (d.vrsta === 'CONST' || d.modul.samoCitanje) { dijalog({ naslov: 'Edit', ikona: 'upoz', html: '<p>' + esc(d.ime) + ' is a constant (CONST) or read-only data and cannot be changed here.</p>', gumbi: [{ t: 'OK' }] }); return; }
  if (d.tip === 'num') brojevi('Edit value: ' + d.ime, R.fmtBroj(d.vrijednost), (v) => { d.vrijednost = v; d.promjena = (d.promjena || 0) + 1; if (d.vrsta === 'PERS') { linijaDeklaracije(d); d.sink = d.promjena; } d.modul.promijenjen = true; prikazi(); });
  else dijalog({ naslov: 'View: ' + d.ime, ikona: 'info', html: '<p style="font-family:ui-monospace,monospace;font-size:.76rem;word-break:break-all">' + esc(d.ime) + ' := ' + esc(R.uTekst(d.vrijednost)) + '</p><p style="color:#5B6A72">U simulatoru se u Program Data mijenjaju brojevi (num). Točke se uče s Modify Position.</p>', gumbi: [{ t: 'OK' }] });
}
// ---- moduli: New, Load, Save As, Change Declaration, Delete, Load Program ----
function noviModul() {
  tipkovnica('New Module - Name', 'Module1', (v) => {
    const g = R.provjeriImeRapid(v); if (g) { toast(g); return; }
    const M = prog.dodajModul('MODULE ' + v + '\nENDMODULE\n', { datoteka: v + '.mod' }); izgubiPP(); provjeriNakonUcitavanja(M); FP.ur.modul = M; prikazi();
  });
}
function ucitajModulDijalog() {
  dijalog({ naslov: 'Load Module', ikona: 'pitanje', html: '<p>By adding a new module you will lose the program pointer.</p><p>Continue?</p><div class="hr-obj"><b>Hrvatski:</b> program se ne briše, samo PP više ne stoji u main. Ovo je Load Module, a ne Load Program (koji bi zamijenio cijeli program).</div>',
    gumbi: [{ t: 'Yes', fp: 'lm-da', glavni: true, fn: () => setTimeout(() => preglednik({ naslov: 'Open - /USB', nacin: 'otvori', put: '/USB', ok: (put, ime) => { const c = cvor(put + '/' + ime); if (!c || c.tip !== 'dat') { toast('Odaberi datoteku.'); return false; } ucitajModul(put, ime); prikazi(); } }), 0) }, { t: 'No' }] });
}
function spremiModulDijalog() {
  const M = odabraniModul(); if (!M) return;
  preglednik({ naslov: 'Save As - ' + M.ime, nacin: 'spremi', put: '/USB', ime: M.ime + (M.sustavni ? '.sys' : '.mod'), ok: (put, ime) => {
    if (!/\.(mod|sys)$/i.test(ime)) ime += '.mod';
    const pisi = () => {
      const tekst = tekstModula(M); const c = cvor(put); c.djeca[ime] = datoteka(tekst); M.promijenjen = false;
      preuzmi(ime, tekst).then(t => toast('Save Module As: ' + put + '/' + ime + '. ' + t));
      if (M.rutine.some(r => /_pisi$/i.test(r.ime))) { const pn = prog.podatak('pNula', M); if (pn && (pn.vrijednost[0][0] || pn.vrijednost[0][1])) oznaci('save'); }
      prikazi();
    };
    if (cvor(put + '/' + ime)) { setTimeout(() => dijalog({ naslov: 'Save As', ikona: 'pitanje', html: '<p>The file ' + esc(ime) + ' already exists.</p><p>Do you want to replace it?</p>', gumbi: [{ t: 'Yes', fp: 'zamijeni-da', glavni: true, fn: pisi }, { t: 'No' }] }), 0); return; }
    pisi();
  } });
}
function deklaracijaModula() {
  const M = odabraniModul(); if (!M) return;
  const st = { ime: M.ime };
  dijalog({ naslov: 'Change Declaration - Module', html: () => '<div class="fp-polje"><span>Name:</span><span class="vr">' + esc(st.ime) + '</span><button type="button" data-fp="dgx-ime">ABC...</button></div><div class="fp-polje"><span>Type:</span><span class="vr">' + (M.sustavni ? 'System' : 'Program') + '</span><span></span></div>',
    akcija: () => tipkovnicaUnutra(st),
    gumbi: [{ t: 'OK', glavni: true, fn: () => {
      if (st.ime === M.ime) return; const g = R.provjeriImeRapid(st.ime); if (g) { toast(g); return false; }
      const t = M.linije.slice(); t[M.linija - 1] = t[M.linija - 1].replace(new RegExp('MODULE\\s+' + M.ime, 'i'), 'MODULE ' + st.ime); zamijeniTekst(M, t.join('\n')); prikazi();
    } }, { t: 'Cancel' }] });
}
function tipkovnicaUnutra(st) {
  const stari = FP.dijalog;
  tipkovnica('Name', st.ime, (v) => { st.ime = v; setTimeout(() => dijalog(stari), 0); });
}
function obrisiModulDijalog() {
  const M = odabraniModul(); if (!M) return;
  if (M.sustavni) { dijalog({ naslov: 'Delete Module', ikona: 'upoz', html: '<p>System module ' + esc(M.ime) + ' cannot be deleted from the FlexPendant in this mode.</p>', gumbi: [{ t: 'OK' }] }); return; }
  dijalog({ naslov: 'Delete Module', ikona: 'pitanje', html: '<p>The module <b>' + esc(M.prikaz) + '</b> will be deleted from the program memory. Unsaved changes will be lost.</p><p>Do you want to delete it?</p><div class="hr-obj"><b>Hrvatski:</b> u RobotWareu 6 nema „Unload“. Delete Module briše modul samo iz memorije robota; datoteka na USB-u ostaje.</div>',
    gumbi: [{ t: 'OK', fp: 'del-ok', glavni: true, fn: () => { prog.ukloniModul(M); if ((KS.pp && KS.pp.m === M) || (KS.korijen && KS.korijen.m === M)) izgubiPP(); FP.ur.modul = null; if (FP.ur.kod === M) FP.ur.kod = null; prikazi(); } }, { t: 'Cancel' }] });
}
function ucitajProgramDijalog() {
  dijalog({ naslov: 'Load Program', ikona: 'upoz', html: '<p><b>Load Program replaces the entire program in T_ROB1.</b> All program modules, including MainModule with the palletizing program, are removed from the program memory. System modules are kept.</p><p>Do you want to continue?</p><div class="hr-obj"><b>Hrvatski:</b> za dodavanje modula koristi Modules → File → Load Module. Load Program bi izbrisao paletizaciju iz memorije (vraća se samo Restoreom ili ponovnim učitavanjem).</div>',
    gumbi: [{ t: 'Yes', fp: 'lp-da', fn: () => setTimeout(() => preglednik({ naslov: 'Load Program - /USB', nacin: 'otvori', put: '/USB', ok: (put, ime) => {
      const c = cvor(put + '/' + ime); if (!c || c.tip !== 'dat') return false;
      try { R.parsirajModul(c.tekst); } catch (e) { dogadjaj(40001, { dat: ime, linija: e.linija, tekst: e.opis || e.message }); return; }
      prog.moduli = prog.moduli.filter(m => m.sustavni); izgubiPP(); ucitajModul(put, ime); prikazi();
    } }), 0) }, { t: 'No', glavni: true }] });
}
// ---- rutine: Change Declaration (namjerno sivo ime), Rename, Delete ----
function deklaracijaRutine() {
  const x = FP.ur.rutina; if (!x) return;
  dijalog({ naslov: 'Change Declaration - Routine', html: '<div class="fp-polje"><span>Name:</span><span class="vr sivo">' + esc(x.r.ime) + '</span><button type="button" disabled data-fp="">ABC...</button></div><div class="fp-polje"><span>Type:</span><span class="vr">Procedure</span><span></span></div><div class="fp-polje"><span>Parameters:</span><span class="vr">No Parameters</span><span></span></div><div class="fp-polje"><span>Data type:</span><span class="vr sivo">num</span><span></span></div><div class="fp-polje"><span>Module:</span><span class="vr">' + esc(x.m.prikaz) + '</span><span></span></div><div class="fp-polje"><span>Local declaration:</span><span class="vr">' + (x.r.lokalno ? 'Yes' : 'No') + '</span><span></span></div><div class="fp-polje"><span>Undo handler:</span><span class="vr">No</span><span></span></div><div class="fp-polje"><span>Error handler:</span><span class="vr">No</span><span></span></div>',
    gumbi: [{ t: 'OK', glavni: true }, { t: 'Cancel' }] });
}
function preimenujRutinu() {
  const x = FP.ur.rutina; if (!x) return;
  tipkovnica('Rename Routine', x.r.ime, (v) => {
    const g = R.provjeriImeRapid(v); if (g) { toast(g); return; }
    if (v === x.r.ime) return;
    const bioMain = lc(x.r.ime) === 'main' && x.m.ime !== 'MainModule', bioDvoznacan = x.m.dvoznacno;
    const t = x.m.linije.slice(); t[x.r.linija - 1] = t[x.r.linija - 1].replace(new RegExp('(PROC|FUNC|TRAP)(\\s+\\w+\\s+)?\\s*' + x.r.ime + '\\b', 'i'), (m0, a, b) => a + (b || ' ') + v);
    zamijeniTekst(x.m, t.join('\n'));
    const nova = x.m.rutine.find(r => r.ime === v); FP.ur.rutina = nova ? { r: nova, m: x.m } : null;
    if (bioMain && !prog.provjeri().some(e => /main ambiguous/.test(e.kratko))) oznaci('main_rename');
    if (bioDvoznacan && !x.m.dvoznacno) oznaci('proba_rename');
    prikazi();
  }, '<p style="margin:0 0 6px">Routine in module ' + esc(x.m.prikaz) + '. Podvlaka _ je Shift + tipka - .</p>');
}
function obrisiRutinu() {
  const x = FP.ur.rutina; if (!x) return;
  dijalog({ naslov: 'Delete Routine', ikona: 'pitanje', html: '<p>Delete the routine <b>' + esc(x.r.ime) + '</b> in module ' + esc(x.m.prikaz) + '?</p>', gumbi: [{ t: 'OK', glavni: true, fn: () => {
    const t = x.m.linije.slice(); t.splice(x.r.linija - 1, x.r.krajLinija - x.r.linija + 1); zamijeniTekst(x.m, t.join('\n')); FP.ur.rutina = null; prikazi();
  } }, { t: 'Cancel' }] });
}
// ---- Backup / Restore ----
function napraviBackup() {
  const put = FP.br.put, ime = FP.br.ime;
  if (cvor(put + '/' + ime)) { dijalog({ naslov: 'Backup', ikona: 'upoz', html: '<p>The folder ' + esc(ime) + ' already exists. Choose another name.</p>', gumbi: [{ t: 'OK' }] }); return; }
  const s = snimka();
  const PROG = {}, SYS = {};
  s.forEach(m => { (m.sustavni ? SYS : PROG)[m.datoteka] = datoteka(m.tekst.replace(/\n/g, '\r\n')); });
  const nova = mapa({ BACKINFO: mapa({ 'backinfo.txt': datoteka('>>SYSTEM_ID:\n120-SIM\n>>PRODUCTS_ID:\nRobotWare 6 (simulator)\n') }), HOME: mapa(), RAPID: mapa({ TASK1: mapa({ PROGMOD: mapa(PROG), SYSMOD: mapa(SYS) }) }), SYSPAR: mapa({ 'MOC.cfg': datoteka(''), 'SYS.cfg': datoteka(''), 'EIO.cfg': datoteka('') }) }, { backup: s });
  dijalog({ naslov: 'Backup', ikona: 'info', html: '<p>Creating backup. Please wait!</p><p>' + esc(put + '/' + ime) + '</p>', gumbi: [] });
  setTimeout(() => {
    cvor(put).djeca[ime] = nova;
    FP.dijalog = null; FP.br.pogled = 'glavni';
    dogadjaj(10100, { put: put + '/' + ime });
    if (put === '/USB') oznaci('backup');
    toast('Backup: ' + put + '/' + ime); prikazi();
  }, 1200);
}
function restoreDijalog() {
  const c = cvor(FP.br.izvor);
  if (!c || (!c.backup && !c.stari)) { dijalog({ naslov: 'Restore System', ikona: 'upoz', html: '<p>The selected folder is not a backup.</p>', gumbi: [{ t: 'OK' }] }); return; }
  if (c.stari) { dijalog({ naslov: 'Restore System', ikona: 'upoz', html: '<p>The backup belongs to another system (120-102663) and cannot be restored in the simulator.</p><div class="hr-obj"><b>Hrvatski:</b> u simulatoru se vraćaju samo kopije napravljene ovdje (Backup Current System).</div>', gumbi: [{ t: 'OK' }] }); return; }
  dijalog({ naslov: 'Restore System', ikona: 'pitanje', html: '<p>Restore the system from <b>' + esc(FP.br.izvor) + '</b>?</p><p>The controller will be restarted. The robot does not move.</p>', gumbi: [{ t: 'Yes', fp: 'rs-da', glavni: true, fn: () => {
    zaustavi(); KS.restart = true; prikazi();
    const z = $('fp-zaslon'), sl = document.createElement('div'); sl.className = 'fp-restart'; sl.innerHTML = '<div>Restarting the controller…</div><i><b></b></i><small>120-SIM · RobotWare 6</small>'; z.appendChild(sl);
    requestAnimationFrame(() => requestAnimationFrame(() => { sl.querySelector('i b').style.width = '100%'; }));
    setTimeout(() => { vratiSnimku(c.backup); KS.restart = false; KS.tockaStopa = null; sl.remove(); FP.otvoreni = ['proizvodnja']; FP.aktivni = 'proizvodnja'; FP.br.pogled = 'glavni'; dogadjaj(10101, { put: FP.br.izvor }); prikazi(); }, 3000);
  } }, { t: 'No' }] });
}
// ---- definiranje alata metodom 4 točke ----
function definirajAlat() {
  const ime = FP.jog.odabran || KS.jog.alat;
  if (lc(ime) === 'tool0') { dijalog({ naslov: 'Define', ikona: 'upoz', html: '<p>tool0 is a system tool and cannot be defined.</p>', gumbi: [{ t: 'OK' }] }); return; }
  FP.jog.def = { alat: ime, t: [null, null, null, null], i: 0 }; FP.jog.pogled = 'define'; prikazi();
}
function izracunajAlat() {
  const d = FP.jog.def, T = d.t;
  // R_i·t + p_i = P  →  [R_i  −I]·[t; P] = −p_i, najmanji kvadrati
  const A = Array.from({ length: 6 }, () => new Array(6).fill(0)), b = new Array(6).fill(0);
  for (const x of T) {
    const Ri = x.R;
    for (let r = 0; r < 3; r++) {
      const red = [Ri[r * 3], Ri[r * 3 + 1], Ri[r * 3 + 2], r === 0 ? -1 : 0, r === 1 ? -1 : 0, r === 2 ? -1 : 0], br = -x.p[r];
      for (let i = 0; i < 6; i++) { b[i] += red[i] * br; for (let j = 0; j < 6; j++) A[i][j] += red[i] * red[j]; }
    }
  }
  const M = A.map((r, i) => r.concat([b[i]])); let sing = false;
  for (let c = 0; c < 6; c++) { let m = c; for (let r = c + 1; r < 6; r++) if (Math.abs(M[r][c]) > Math.abs(M[m][c])) m = r; [M[c], M[m]] = [M[m], M[c]]; if (Math.abs(M[c][c]) < 1e-6) { sing = true; break; } for (let r = c + 1; r < 6; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k < 7; k++) M[r][k] -= f * M[c][k]; } }
  if (sing) { dijalog({ naslov: 'Calculation Result', ikona: 'greska', html: '<p>Calculation error: the orientations of the points are too similar.</p><div class="hr-obj"><b>Hrvatski:</b> svaku od četiri točke dotakni s bitno drukčijom orijentacijom prirubnice (razlika barem 30°).</div>', gumbi: [{ t: 'OK' }] }); return; }
  const x = new Array(6).fill(0); for (let r = 5; r >= 0; r--) { let s = M[r][6]; for (let k = r + 1; k < 6; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  const t = x.slice(0, 3), P = x.slice(3);
  const gr = T.map(z => K.norm(K.sub(K.add(K.mulRv(z.R, t), z.p), P)) * 1000);
  const sr = gr.reduce((a, v) => a + v, 0) / gr.length;
  const tmm = t.map(v => +(v * 1000).toFixed(2));
  dijalog({ naslov: 'Calculation Result', ikona: 'info', html: '<p>Tool: <b>' + esc(d.alat) + '</b><br>Method: TCP (default orient.)</p><table class="fp-tab" style="margin-bottom:8px"><tbody><tr><td>Max error</td><td>' + Math.max(...gr).toFixed(2) + ' mm</td></tr><tr><td>Min error</td><td>' + Math.min(...gr).toFixed(2) + ' mm</td></tr><tr><td>Mean error</td><td><b>' + sr.toFixed(2) + ' mm</b></td></tr><tr><td>X</td><td>' + tmm[0] + ' mm</td></tr><tr><td>Y</td><td>' + tmm[1] + ' mm</td></tr><tr><td>Z</td><td>' + tmm[2] + ' mm</td></tr></tbody></table><p>Tap OK to save the tool frame.</p>',
    gumbi: [{ t: 'OK', glavni: true, fn: () => { const dk = prog.podatak(d.alat); if (dk) { dk.vrijednost[1] = [tmm, [1, 0, 0, 0]]; dk.promjena = (dk.promjena || 0) + 1; if (dk.vrsta === 'PERS') { linijaDeklaracije(dk); dk.sink = dk.promjena; } } FP.jog.pogled = 'glavni'; prikazi(); } }, { t: 'Cancel' }] });
}

// ---------- događaji miša i dodira na zaslonu ----------
const zaslon = $('fp-zaslon');
zaslon.addEventListener('click', (ev) => {
  if (ev.target.closest('.fp-restart')) return;
  const kl = ev.target.closest('[data-fp="kl"]');
  if (kl) { klikKod(kl, ev); return; }
  const el = ev.target.closest('[data-fp]');
  if (!el || el.disabled) {
    if (FP.meni && !ev.target.closest('.fp-meni') && !ev.target.closest('[data-fp^="mn-"]')) { FP.meni = null; prikazi(); }
    return;
  }
  const a = el.dataset.fp; if (!a) return;
  if (a === 'dgx-ime') { FP.dijalog && FP.dijalog.akcija && FP.dijalog.akcija(); return; }
  if (FP.meni && !el.closest('.fp-meni') && !a.startsWith('mn')) FP.meni = null;
  radnja(a, el);
});
zaslon.addEventListener('change', (ev) => {
  const s = ev.target.closest('[data-fp-sel]'); if (!s) return;
  const k = s.dataset.fpSel;
  if (k === 'alat') { KS.jog.alat = s.value; if (lc(s.value) === 'tool0') oznaci('tool0'); prikazi(); }
  if (k === 'wobj') { KS.jog.wobj = s.value; prikazi(); }
  if (k === 'filter' && FP.dijalog) { FP.dijalog.st.filter = s.value; prikazi(); }
});
zaslon.addEventListener('input', (ev) => { if (ev.target.id === 'tk-unos' && FP.dijalog && FP.dijalog.st) FP.dijalog.st.v = ev.target.value; });
zaslon.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && (ev.target.id === 'tk-unos' || ev.target.id === 'nb-unos' || ev.target.id === 'pg-ime')) { const b = zaslon.querySelector('[data-id="tk-ok"],[data-id="nb-ok"],[data-id="pg-ok"]'); if (b) b.click(); } });
// Go To se drži
zaslon.addEventListener('pointerdown', (ev) => { const g = ev.target.closest('[data-fp="goto-drzi"]'); if (g) { drziGoTo = true; g.classList.add('drzi'); g.setPointerCapture(ev.pointerId); ev.preventDefault(); } });
const pustiGoTo = () => { if (drziGoTo) { drziGoTo = false; const g = zaslon.querySelector('[data-fp="goto-drzi"]'); if (g) g.classList.remove('drzi'); } };
addEventListener('pointerup', pustiGoTo); addEventListener('pointercancel', pustiGoTo);

// datoteka s računala na virtualni USB
const usbUlaz = document.createElement('input'); usbUlaz.type = 'file'; usbUlaz.id = 'usb-ulaz'; usbUlaz.accept = '.mod,.sys,.nc,.gcode,.txt'; usbUlaz.hidden = true; document.body.appendChild(usbUlaz);
usbUlaz.addEventListener('change', () => {
  const f = usbUlaz.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => { DISK.djeca.USB.djeca[f.name] = datoteka(String(r.result)); toast('Na USB: ' + f.name); if (FP.dijalog && FP.dijalog.st) { FP.dijalog.st.put = '/USB'; FP.dijalog.st.odabrano = f.name; } prikazi(); usbUlaz.value = ''; };
  r.readAsText(f);
});

// =====================================================================================
// 13. Hardver: enabling device, joystick, tipke
// =====================================================================================
function postaviEnabling(s) {
  if (s === KS.enabling) return;
  const bio = KS.enabling, bioOn = motoriOn();
  KS.enabling = s;
  if (s === 'pusteno') KS.pustenoU = performance.now();
  if (s === 'kraj') { if (!KS.kvar90211) { KS.kvar90211 = true; dogadjaj(90211); } }
  if (s === 'pola' && bio === 'kraj') { /* ostaje kvar dok se ne potvrdi */ }
  if (bioOn && !motoriOn()) { zaustavi(); if (gib && gib.vrsta !== 'precac') gib = null; dogadjaj(s === 'kraj' ? 10010 : 10012); }
  if (!bioOn && motoriOn()) dogadjaj(10011);
  osvjeziStatus(true);
}
document.querySelectorAll('.fp-seg button').forEach(b => b.addEventListener('click', () => postaviEnabling(b.dataset.en)));
document.querySelectorAll('[data-hw]').forEach(b => b.addEventListener('click', () => {
  const h = b.dataset.hw;
  if (h === 'start') start(false);
  else if (h === 'naprijed') start(true);
  else if (h === 'nazad') korakNazad();
  else if (h === 'stop') { if (KS.izvodi) zaustavi(); if (gib && gib.vrsta !== 'precac') gib = null; }
  else if (h === 'linrei') { KS.jog.mod = KS.jog.mod === 'linear' ? 'reorient' : 'linear'; prikazi(); }
  else if (h === 'osi') { KS.jog.mod = KS.jog.mod === 'osi13' ? 'osi46' : 'osi13'; prikazi(); }
  else if (h === 'jedinica') toast('Mechanical unit: ROB_1');
}));
// joystick: ploha (gore-dolje, lijevo-desno) i traka (zakret glave)
(function () {
  const pad = $('fp-pad'), knob = $('fp-knob'), zk = $('fp-zakret'), zknob = $('fp-zknob');
  let aktPad = null, aktZk = null;
  const R0 = 36;
  function padPomak(ev) { const r = pad.getBoundingClientRect(); let dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2); const n = Math.hypot(dx, dy); if (n > R0) { dx *= R0 / n; dy *= R0 / n; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; JOY.ld = dx / R0; JOY.gd = -dy / R0; }
  pad.addEventListener('pointerdown', (ev) => { aktPad = ev.pointerId; pad.setPointerCapture(ev.pointerId); padPomak(ev); ev.preventDefault(); });
  pad.addEventListener('pointermove', (ev) => { if (aktPad === ev.pointerId) padPomak(ev); });
  const pustiPad = (ev) => { if (aktPad !== ev.pointerId) return; aktPad = null; knob.style.transform = ''; JOY.ld = 0; JOY.gd = 0; };
  pad.addEventListener('pointerup', pustiPad); pad.addEventListener('pointercancel', pustiPad);
  function zkPomak(ev) { const r = zk.getBoundingClientRect(); let dx = ev.clientX - (r.left + r.width / 2); const m = r.width / 2 - 16; dx = Math.max(-m, Math.min(m, dx)); zknob.style.transform = 'translateX(' + dx + 'px)'; JOY.zk = dx / m; }
  zk.addEventListener('pointerdown', (ev) => { aktZk = ev.pointerId; zk.setPointerCapture(ev.pointerId); zkPomak(ev); ev.preventDefault(); });
  zk.addEventListener('pointermove', (ev) => { if (aktZk === ev.pointerId) zkPomak(ev); });
  const pustiZk = (ev) => { if (aktZk !== ev.pointerId) return; aktZk = null; zknob.style.transform = ''; JOY.zk = 0; };
  zk.addEventListener('pointerup', pustiZk); zk.addEventListener('pointercancel', pustiZk);
  // tipkovnica: strelice i Q / E dok je joystick u fokusu (Shift = puni otklon)
  const T = {};
  const primijeni = (sh) => { const a = sh ? 1 : 0.5; JOY.gd = ((T.ArrowUp ? 1 : 0) - (T.ArrowDown ? 1 : 0)) * a; JOY.ld = ((T.ArrowRight ? 1 : 0) - (T.ArrowLeft ? 1 : 0)) * a; JOY.zk = ((T.e ? 1 : 0) - (T.q ? 1 : 0)) * a; };
  pad.addEventListener('keydown', (ev) => { const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'q', 'e'].includes(k)) { T[k] = true; primijeni(ev.shiftKey); ev.preventDefault(); } });
  pad.addEventListener('keyup', (ev) => { const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; if (k in T) { T[k] = false; primijeni(ev.shiftKey); } });
  pad.addEventListener('blur', () => { for (const k in T) T[k] = false; JOY.gd = JOY.ld = JOY.zk = 0; });
})();

// =====================================================================================
// 14. Prečaci scene (samo simulator)
// =====================================================================================
function pozaFlomaster() {
  // poza iz podaci.js, dotjerana IK-om: vrh flomastera točno na papiru u (340, −50), os flomastera okomito, os 4 fiksna
  let qq = D.POZA_FLOMASTER.slice();
  const f = K.fk(qq, ALAT_FLO);
  const cilj = { p: [0.340, -0.050, PAPIR.z], R: f.R };
  const z = K.stupac(f.R, 2), x = K.unit(K.sub(K.stupac(f.R, 0), K.mul([0, 0, -1], K.dot(K.stupac(f.R, 0), [0, 0, -1]))));
  void z; const y = K.cross([0, 0, -1], x); cilj.R = [x[0], y[0], 0, x[1], y[1], 0, x[2], y[2], -1];
  const r = K.ikPuna(cilj, qq, ALAT_FLO, { iter: 300 });
  if (r.ok) qq = r.q;
  return qq;
}
// poza za flomaster na trenutnoj plohi: na papiru kao prije, na okomitoj ploči okomito na ploču
function pozaFlomasterPloha() {
  if (PLOHA.vrsta !== 'okomito') return pozaFlomaster();
  const p = K.add(K.add(PLOHA.p0, K.mul(PLOHA.ex, 0.07)), K.mul(PLOHA.ey, 0.05)), z = K.mul(PLOHA.ez, -1);
  const sjemena = [D.POCETNA_POZA, [0, 30, 10, 0, 50, 0], [0, 45, -20, 90, -60, 0], [0, 45, -20, -90, 60, 0], [0, 20, 20, 0, 70, 90], D.POZA_FLOMASTER];
  for (const x of [K.mul(PLOHA.ey, -1), PLOHA.ex, K.mul(PLOHA.ex, -1), PLOHA.ey]) {
    const y = K.cross(z, x), Rc = [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
    for (const sj of sjemena) { const r = K.ikPuna({ p, R: Rc }, sj.slice(), ALAT_FLO, { iter: 300 }); if (r.ok && uGranicama(r.q, 0.01)) return r.q; }
  }
  toast('Ploča je izvan dosega za flomaster: približi je ili spusti.'); return q.slice();
}
function precac(qc) { if (KS.izvodi) return; gib = { put: [q.slice(), qc], T: Math.max(0.6, trajanjeJ(q, qc, 250, K.TOOL0) * 0.6), t: 0, vrsta: 'precac', gotovo: () => {} }; }
$('pr-flomaster').addEventListener('click', () => precac(pozaFlomasterPloha()));
$('pr-pocetna').addEventListener('click', () => precac(D.POCETNA_POZA.slice()));
$('pr-kockice').addEventListener('click', () => { if (KS.io.DO_0_gripper) { KS.io.DO_0_gripper = 0; prsti.cilj = 0.008; } if (POSTAV.rezim === 'stanica') { stanica.reset(); toast('Stanica vraćena: predmeti maknuti.'); } else { postaviKockice(); const n = prog.podatak('nKom'); if (n) { n.vrijednost = 0; n.promjena = (n.promjena || 0) + 1; sinkronizirajPers(); } toast('Kockice su na stogu, nKom = 0.'); } prikazi(); });
$('pr-papir').addEventListener('click', obrisiPapir);
$('ubrzanje').addEventListener('change', () => { KS.ubrzanje = +$('ubrzanje').value; });

// =====================================================================================
// 15. PC strana petlje: pretvarač G-kod -> RAPID
// =====================================================================================
let pcModul = null;
function pcRutine() { const p = $('pc-prefiks').value.trim(); $('pc-rutine').textContent = p ? 'Rutine: ' + p + '_Nula (učenje pNula) i ' + p + '_Pisi (pisanje). Datoteka: ' + ($('pc-modul').value.trim() || '?') + '.mod' : ''; }
['pc-modul', 'pc-prefiks'].forEach(id => $(id).addEventListener('input', () => { pcRutine(); $('pc-usb').disabled = true; $('pc-preuzmi').disabled = true; }));
// izbor plohe u pretvaraču: okomita ploča dobiva radni objekt wPloca i druga imena da se ne sudare s FTQ_PROBA
$('pc-ploha').addEventListener('change', () => {
  const ok = $('pc-ploha').value === 'okomito';
  $('pc-modul').value = ok ? 'FTQ_PLOCA' : 'FTQ_PROBA'; $('pc-prefiks').value = ok ? 'PL' : 'FTQ';
  pcRutine(); $('pc-usb').disabled = true; $('pc-preuzmi').disabled = true;
  if (ok && PLOHA.vrsta !== 'okomito') poruka('Ploča u sceni je vodoravna: u panelu Postav → Ploča odaberi „okomito“ da se wPloca poklopi sa scenom.', true);
});
pcRutine();
$('pc-primjer').addEventListener('click', () => { $('pc-gkod').value = D.USB['IRB120_Tekst_v01.nc']; $('pc-gkod').dataset.ime = 'IRB120_Tekst_v01.nc'; poruka('Učitan G-kod IRB120_Tekst_v01.nc (tekst 66,7 × 40 mm iz simulatora crtanja).'); });
$('pc-dat').addEventListener('change', () => { const f = $('pc-dat').files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('pc-gkod').value = String(r.result); $('pc-gkod').dataset.ime = f.name; poruka('Učitano: ' + f.name); }; r.readAsText(f); });
function poruka(t, gr) { const p = $('pc-poruka'); p.textContent = t; p.classList.toggle('greska', !!gr); }
$('pc-pretvori').addEventListener('click', () => {
  const g = $('pc-gkod').value; if (!g.trim()) { poruka('Najprije učitaj ili zalijepi G-kod.', true); return; }
  const d = new Date();
  const okomito = $('pc-ploha').value === 'okomito';
  const Rw = [PLOHA.ex[0], PLOHA.ey[0], PLOHA.ez[0], PLOHA.ex[1], PLOHA.ey[1], PLOHA.ez[1], PLOHA.ex[2], PLOHA.ey[2], PLOHA.ez[2]];
  const wobj = okomito ? { ime: 'wPloca', trans: PLOHA.p0.map(v => +(v * 1000).toFixed(2)), rot: K.matUKvat(Rw).map(v => +v.toFixed(6)) } : null;
  const r = R.gkodURapid(g, { modul: $('pc-modul').value.trim(), prefiks: $('pc-prefiks').value.trim(), zProba: +$('pc-z').value || 0, izvor: $('pc-gkod').dataset.ime || 'G-kod', datum: d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear() + '.', wobj });
  if (r.greske.length) { poruka(r.greske.join(' '), true); $('pc-izlaz').hidden = true; pcModul = null; $('pc-usb').disabled = true; $('pc-preuzmi').disabled = true; return; }
  pcModul = { ime: $('pc-modul').value.trim() + '.mod', tekst: r.tekst };
  $('pc-izlaz').hidden = false; $('pc-izlaz').firstChild.textContent = r.tekst.replace(/\r/g, '');
  $('pc-usb').disabled = false; $('pc-preuzmi').disabled = false;
  poruka('Gotovo: ' + r.n + ' pomaka, rutine ' + r.rutine.join(' i ') + '. Spremi na USB, pa na FlexPendantu Load Module.');
  oznaci('gkod');
});
$('pc-usb').addEventListener('click', () => { if (!pcModul) return; DISK.djeca.USB.djeca[pcModul.ime] = datoteka(pcModul.tekst); poruka('Na virtualnom USB-u: /USB/' + pcModul.ime + '. Na FlexPendantu: Program Editor → Modules → File → Load Module…'); });
$('pc-preuzmi').addEventListener('click', async () => { if (!pcModul) return; poruka(await preuzmi(pcModul.ime, pcModul.tekst)); });

// =====================================================================================
// 16. Petlja okvira
// =====================================================================================
let prosli = performance.now(), zadnjaPoz = 0;
function okvirPetlje(sad) {
  const dtR = Math.min(0.1, (sad - prosli) / 1000); prosli = sad;
  const dt = dtR * KS.ubrzanje;
  KS.simVrijeme += dt;
  // gibanje
  if (!motoriOn()) { if (KS.izvodi) zaustavi(); if (gib && gib.vrsta !== 'precac') gib = null; }
  if (gib) {
    const tece = gib.vrsta === 'precac' || (motoriOn() && (gib.vrsta !== 'goto' || drziGoTo));
    if (tece) {
      const f = gib.vrsta === 'precac' ? 1 : KS.brzina / 100;
      gib.t += dt * Math.max(0.01, f);
      q = uzorak(gib.put, profil(gib.t / gib.T));
      if (gib.t >= gib.T) { q = gib.put[gib.put.length - 1].slice(); const g = gib; gib = null; if (g.vrsta !== 'prog' && g.vrsta !== 'precac') KS.jogPomaknut = true; if (g.vrsta === 'goto' || g.vrsta === 'precac' || g.vrsta === 'nazad') { /* robot pomaknut izvan programa */ } g.gotovo && g.gotovo(); }
    }
  }
  if (!gib) jogKorak(dt);
  if (KS.izvodi && motoriOn()) izvrsavanje();
  // prsti
  if (prsti.o !== prsti.cilj) { const d = 0.04 * dtR; prsti.o = prsti.o < prsti.cilj ? Math.min(prsti.cilj, prsti.o + d) : Math.max(prsti.cilj, prsti.o - d); }
  postaviModel();
  stanica.korak(dt);                                   // traka, fotoćelija, okretni stol, predmeti
  if (POSTAV.rezim === 'stanica' && plc.citaj('M_Ciklus')) oznaci('st_hmi_start');
  const fl = tintaKorak();
  provjeriStanjaVodica(fl);
  if (sad - zadnjaPoz > 120) {
    zadnjaPoz = sad; osvjeziPoziciju(); osvjeziStatus(false);
    const si = $('scena-info'); si.hidden = false;
    const c = KS.cekanje;
    const t = 'Osi: ' + q.map(v => minus(v.toFixed(1))).join('  ') + '\nVrh flomastera: ' + (fl.naPapiru ? minus((fl.dz * 1000).toFixed(1)) + ' mm iznad ' + (PLOHA.vrsta === 'okomito' ? 'ploče' : 'papira') : 'izvan ' + (PLOHA.vrsta === 'okomito' ? 'ploče' : 'papira')) + (KS.io.DO_0_gripper ? '  ·  prsti zatvoreni' : '') +
      (KS.izvodi && c && c.vrsta === 'cekajSignal' ? '\nČeka ' + c.ime + ' = ' + c.v : '');
    if (si.textContent !== t) { si.textContent = t; si.style.whiteSpace = 'pre'; }
  }
  upr.update(); renderer.render(scena, kamera);
  kam.crtaj(sad);                                      // pogled kamere C920 (scissor u kutu platna)
  requestAnimationFrame(okvirPetlje);
}
function velicina() { const w = kut.clientWidth, h = kut.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(kut); velicina();

// =====================================================================================
// 17. Učitavanje modela i početak
// =====================================================================================
function izTocke(ime) { const d = prog.podatak(ime); const c = ciljUBazi(d.vrijednost, podatak('wobj0')); const h = K.add(c.p, K.mulRv(c.R, [0, 0, 0.141])); const xa = K.stupac(c.R, 0); return { x: h[0], y: h[1], psi: Math.atan2(xa[1], xa[0]) }; }
STOG = izTocke('pStog'); PALETA = izTocke('p60');
oznakaNaStolu(STOG.x, STOG.y, STOG.psi, 'STOG'); oznakaNaStolu(PALETA.x, PALETA.y, PALETA.psi, 'PALETA');

// ---- PLC (emulacija), stanica, HMI, kamera ----
// izlazi PLC-a koji idu na robota (Q_PredmetSpreman -> DI_1_predmet ...) postavljaju DI robota: to je „žica“ između I/O ploča
const plc = new PLC({ naIzlaz: (id, v) => { const sg = signalPLC(id); if (sg && sg.robot) postaviDI(sg.robot, v); } });
plc.parametar('P_Brzina', Math.round(POSTAV.traka.v / 2));
const stanica = new Stanica({
  scena, kockice, KOCKA, novaKockica, ukloniKockicu, oznaci, toast, plc,
  pocetnaPoza: () => precac(D.POCETNA_POZA.slice()),
  naPromjenu: (sto) => {
    if (sto === 'preset' || sto === 'ploha') postaviPlohu(stanica.ploha());
    if (sto === 'preset') { postaviKockice(); oznake.forEach(m => { m.visible = POSTAV.rezim !== 'stanica'; }); pogled(POSTAV.rezim === 'stanica' ? 'stanica' : 'robot'); $('pc-ploha').value = POSTAV.ploha.vrsta; $('pc-ploha').dispatchEvent(new Event('change')); }
    if (sto === 'ploha') { $('pc-ploha').value = POSTAV.ploha.vrsta; $('pc-ploha').dispatchEvent(new Event('change')); }
    document.querySelectorAll('[data-pogled="stanica"],[data-pogled="traka"]').forEach(b => { b.hidden = POSTAV.rezim !== 'stanica'; });
    document.querySelector('[data-pogled="stol"]').hidden = !(POSTAV.rezim === 'stanica' && POSTAV.stol.uloga !== 'nema');
    kam.osvjezi();
  },
  naReset: () => { if (KS.io.DO_0_gripper) { KS.io.DO_0_gripper = 0; prsti.cilj = 0.008; } plc.impuls('I_HmiReset'); prikazi(); },
});
const kam = new KameraC920({ renderer, scena, kut, stanica, toast });
const hmi = new HMI(plc, $('hmi'), {
  stanje: () => { const st = stanica.stanje(); return { naPaleti: st.paleta.na, kapacitet: st.paleta.kapacitet, trakaMms: st.traka.vMms, stolKut: st.stol.kut.toFixed(0), stolPoz: st.stol.pozicija, sat: new Date().toLocaleTimeString('hr-HR') }; },
});
const plcUI = plcPanel(plc, $('k-plc'), { naProfil: () => oznaci('st_plc'), vidljiv: () => !$('k-plc').hidden });
stanica.vezi($('k-postav'));
$('kam-prikazi').addEventListener('click', () => { kam.prikazi(!kam.vidljiv); $('kam-prikazi').setAttribute('aria-pressed', String(kam.vidljiv)); });
document.querySelectorAll('[data-pogled="stanica"],[data-pogled="traka"],[data-pogled="stol"]').forEach(b => { b.hidden = true; });
// generiranje RAPID-a paletizacije iz rastera
const pomocnikRapid = {
  pocetnaPoza: D.POCETNA_POZA,
  robtarget: (pt, Rc) => {
    const rk = ikKonf({ p: pt, R: Rc }, null, alatKin(podatak('tool0')), D.POCETNA_POZA.slice());
    if (rk.greska) return null;
    return [pt.map(v => +(v * 1000).toFixed(2)), K.matUKvat(Rc).map(v => +v.toFixed(6)), K.konfiguracija(rk.q), [9e9, 9e9, 9e9, 9e9, 9e9, 9e9]];
  },
};
let rapidStanice = null;
function generirajRapidStanice() {
  const d = new Date();
  const r = stanica.generirajRapid(pomocnikRapid, d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear() + '.');
  const por = $('po-poruka');
  if (r.greske.length) { por.textContent = r.greske.join(' '); por.classList.add('greska'); $('po-rapid').hidden = true; rapidStanice = null; $('po-usb').disabled = true; $('po-preuzmi').disabled = true; return null; }
  rapidStanice = r; $('po-rapid').hidden = false; $('po-rapid').firstChild.textContent = r.tekst.replace(/\r/g, '');
  por.classList.remove('greska'); por.textContent = 'Modul FTQ_STANICA, varijanta ' + r.varijanta + '. Spremi na USB, pa na FlexPendantu Load Module i Debug → PP to Routine → Paletizacija.';
  $('po-usb').disabled = false; $('po-preuzmi').disabled = false;
  return r;
}
$('po-generiraj').addEventListener('click', generirajRapidStanice);
$('po-usb').addEventListener('click', () => { if (!rapidStanice) return; DISK.djeca.USB.djeca[rapidStanice.ime] = datoteka(rapidStanice.tekst); $('po-poruka').textContent = 'Na virtualnom USB-u: /USB/' + rapidStanice.ime + '. Ako je FTQ_STANICA već učitan, najprije Delete Module (inače FTQ_STANICA#2).'; });
$('po-preuzmi').addEventListener('click', async () => { if (!rapidStanice) return; $('po-poruka').textContent = await preuzmi(rapidStanice.ime, rapidStanice.tekst); });
$('po-ploca-poza').addEventListener('click', () => precac(pozaFlomasterPloha()));
// tablica signala na stranici (iz jedne tablice u signali.js), u svim profilima
(function () {
  const t = $('tab-signali'); if (!t) return;
  t.innerHTML = '<thead><tr><th>Signal (simbol)</th><th>Smjer</th><th>Schneider M262 / M241</th><th>Siemens S7-1200</th><th>Generički</th><th>Robot IRC5</th><th>Oprema</th><th>Opis</th></tr></thead><tbody>' +
    SIGNALI.map(sg => '<tr><td><code>' + esc(sg.id) + '</code></td><td>' + (sg.smjer === 'I' ? 'ulaz' : sg.smjer === 'QW' ? 'izlaz (riječ)' : 'izlaz') + '</td><td>' + esc(sg.schneider) + '</td><td>' + esc(sg.siemens) + '</td><td>' + esc(sg.generic) + '</td><td>' + (sg.robot ? '<code>' + esc(sg.robot) + '</code>' : '—') + '</td><td>' + esc(sg.izvor || sg.cilj || '—') + '</td><td>' + esc(sg.opis) + '</td></tr>').join('') + '</tbody>';
})();

postaviKockice();
crtajVodic();
pogled('robot');
prikazi();
new GLTFLoader().load('../irb120-crtanje/irb120_alat.glb', g => {
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (let i = 1; i <= 6; i++) zgl.push(g.scene.getObjectByName('j' + i));
  ['j6', 'krak', 'sisaljka', 'prst_p', 'prst_n'].forEach(n => N[n] = g.scene.getObjectByName(n));
  scena.add(g.scene);
  $('ucitavanje').remove();
  postaviModel(); tcpOznaka(alatKin(jogAlat()));
  window.FTQ_SPREMNO = true;
}, undefined, () => { $('ucitavanje').textContent = 'Model se nije mogao učitati. Stranicu otvori preko poslužitelja, ne izravno iz datoteke.'; });
requestAnimationFrame(okvirPetlje);
setInterval(() => { if (N.j6) tcpOznaka(alatKin(jogAlat())); }, 500);

// =====================================================================================
// 18. Sučelje za automatske testove i snimke (Playwright)
// =====================================================================================
const cekaj = (ms) => new Promise(r => setTimeout(r, ms));
window.FTQ_SIM = {
  stanje() {
    return {
      q: q.map(v => +v.toFixed(3)), enabling: KS.enabling, motori: motoriOn(), kvar90211: KS.kvar90211, izvodi: KS.izvodi, gibanje: gib ? gib.vrsta : null,
      pp: KS.pp ? { modul: KS.pp.m.prikaz, rutina: KS.pp.r.ime, redak: KS.pp.s.l } : null, brzina: KS.brzina, rezim: KS.rezim,
      moduli: prog.moduli.map(m => m.prikaz), greske: prog.provjeri().map(g => g.tekst),
      dogadjaji: DOG.slice(0, 30).map(e => ({ broj: e.broj, naslov: e.naslov, potvrdjen: e.potvrdjen })), nepotvrdjeni: nepotvrdjeni().map(e => e.broj),
      usb: Object.keys(DISK.djeca.USB.djeca), vodic: Object.assign({}, vodicStanje), zamke: Object.assign({}, zamkeStanje),
      tintaMm: +tinta.duljina.toFixed(1), kockice: kockice.map(k => { const p = new THREE.Vector3(); k.mesh.getWorldPosition(p); return { x: +(p.x * 1000).toFixed(1), y: +(-p.z * 1000).toFixed(1), z: +(p.y * 1000).toFixed(1), drzi: k.drzi }; }),
      io: Object.assign({}, KS.io), alat: KS.jog.alat, mod: KS.jog.mod, prozor: FP.aktivni, ispis: KS.ispis.map(x => x.t),
      vrhFlomastera: K.fk(q, ALAT_FLO).p.map(v => +(v * 1000).toFixed(2)),
      cekanje: KS.cekanje ? { vrsta: KS.cekanje.vrsta, ime: KS.cekanje.ime || null, v: KS.cekanje.v } : null,
      ploha: PLOHA.vrsta, rezim: POSTAV.rezim, naPaleti: stanica.naPaleti(),
    };
  },
  stanica() { return stanica.stanje(); },
  plc: {
    profil(p) { if (p) { $('plc-profil').value = p; $('plc-profil').dispatchEvent(new Event('change')); } return plc.profil; },
    signal(ime) { return plc.citaj(ime); },
    forsiraj(ime, v) { plc.forsiraj(ime, v); plcUI.crtaj(true); },
    stanje() { return plc.stanje(); },
  },
  hmi: { start() { hmi.tipka('start'); }, stop() { hmi.tipka('stop'); }, reset() { hmi.tipka('reset'); }, stanje() { return hmi.stanje(); } },
  postav: {
    preset(ime) { stanica.preset(ime); },
    param(g, k, v) { POSTAV[g][k] = v; stanica.reset(); stanica.gradi(); stanica.osvjeziPanel(); if (g === 'ploha') postaviPlohu(stanica.ploha()); kam.osvjezi(); },
    ploha(vrsta) { POSTAV.ploha.vrsta = vrsta; stanica.gradi(); postaviPlohu(stanica.ploha()); $('pc-ploha').value = vrsta; $('pc-ploha').dispatchEvent(new Event('change')); stanica.osvjeziPanel(); },
    generiraj() { return generirajRapidStanice(); },
    naUsb() { $('po-usb').click(); },
    reset() { stanica.reset(); },
    pozaPloca() { return precac(pozaFlomasterPloha()); },
  },
  c920: { prikazi(v) { kam.prikazi(v); $('kam-prikazi').setAttribute('aria-pressed', String(kam.vidljiv)); }, sahovnica(v) { kam.sah.visible = v; kam.el.querySelector('[data-kam="sah"]').setAttribute('aria-pressed', String(v)); }, stanje() { return kam.stanje(); } },
  postaviQ(nq) { q = nq.slice(); postaviModel(); },
  pozaFlomaster() { return pozaFlomaster(); },
  kamera(P, C) { postaviKameru(P, C); },
  enabling(s) { postaviEnabling(s); },
  ubrzanje(k) { KS.ubrzanje = k; },
  async jog(gd, ld, zk, ms) { JOY.gd = gd; JOY.ld = ld; JOY.zk = zk; await cekaj(ms); JOY.gd = JOY.ld = JOY.zk = 0; },
  async precac(qq) { precac(qq); while (gib) await cekaj(30); },
  async cekajMirovanje(maxMs = 120000) { const t0 = performance.now(); while ((KS.izvodi || gib) && performance.now() - t0 < maxMs) await cekaj(50); return !KS.izvodi && !gib; },
  potvrdiSve() { for (const e of nepotvrdjeni()) { if (e.broj === 90211) continue; e.potvrdjen = true; } prikazi(); },
  async korak(ime, arg) {
    switch (ime) {
      case 'pozaFlomaster': return this.precac(pozaFlomasterPloha());
      case 'pocetnaPoza': return this.precac(D.POCETNA_POZA.slice());
      case 'vratiKockice': $('pr-kockice').click(); return;
      case 'zProba': { const d = prog.podatak('zProba'); d.vrijednost = arg; d.promjena = (d.promjena || 0) + 1; sinkronizirajPers(); return; }
      case 'postaviBrzinu': postaviBrzinu(arg); return;
      case 'dijalogOK': { const b = zaslon.querySelector('.fp-dijalog .dg button.glavni') || zaslon.querySelector('.fp-dijalog .dg button'); if (b) b.click(); return; }
    }
  },
};
