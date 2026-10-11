// ispis.js — IRB 120 ispisuje 3D (FDM): ekstruder (približni model po uzoru na Original Prusa i3 MK3S) u držaču
// iz stanice M. Mudrija (Schunk + držač), grijana podloga 250 × 210 mm na originalnom stolu.
// Izvedeno iz glodanje.js (ar/irb120-glodanje) — iste funkcije (karta dosega, KS W, G-kod, AR sa sidrom),
// samo robot ne gloda nego nanosi materijal sloj po sloj. Moduli: kinematika.js (FK/IK), putanje.js (čitanje STL/OBJ),
// rezac.js (slojevi, perimetri, ispuna, čitanje G-koda). Podaci: window.FTQ_ALATI, window.FTQ_PRIMJER_STL.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as K from './kinematika.js';
import * as P from './putanje.js';
import * as R from './rezac.js';

const $ = id => document.getElementById(id);
const AL = window.FTQ_ALATI;
const ALAT = { ekstruder: K.alatIz(AL.tcp.ekstruder.p, AL.tcp.ekstruder.R) };
const VIS = 0.81;                                                // visina stola M. Mudrija (baza robota na stolu)
const g3 = (p) => new THREE.Vector3(p[0], p[2], -p[1]);        // baza (Z gore) -> scena (Y gore), lokalno na stolu
const g3w = (p) => g3(p).add(new THREE.Vector3(0, VIS, 0));     // isto, u sceni (za kameru)


// ---------------- scena ----------------
const kut = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
kut.insertBefore(renderer.domElement, kut.firstChild);
const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
kamera.position.set(1.45, 1.75, 1.35);
const upr = new OrbitControls(kamera, renderer.domElement);
upr.target.set(0.25, 0.95, 0); upr.enableDamping = true; upr.minDistance = 0.3; upr.maxDistance = 5;
upr.maxPolarAngle = Math.PI * 0.495;
scena.add(new THREE.HemisphereLight(0xffffff, 0x8899a0, 1.5));
const sunce = new THREE.DirectionalLight(0xffffff, 2.0);
sunce.position.set(1.2, 2.4, 1.4); sunce.castShadow = true; sunce.shadow.mapSize.set(2048, 2048);
Object.assign(sunce.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 6 });
scena.add(sunce);
const dop = new THREE.DirectionalLight(0xffffff, 0.6); dop.position.set(-1.5, 1, -1); scena.add(dop);
const pod = new THREE.Mesh(new THREE.CircleGeometry(2.2, 72), new THREE.ShadowMaterial({ opacity: 0.16 }));
pod.rotation.x = -Math.PI / 2; pod.receiveShadow = true;
const korijen = new THREE.Group(); scena.add(korijen); korijen.add(pod);   // stol, robot, škripac — u AR-u se postavlja kao cjelina na pod
const naStolu = new THREE.Group(); naStolu.position.y = VIS; korijen.add(naStolu);   // KS baze robota (ploha stola)
const mreza = new THREE.PolarGridHelper(1.2, 12, 6, 72); mreza.material.transparent = true; mreza.material.opacity = 0.3; scena.add(mreza);
function boje() {
  const c = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#17656E');
  mreza.material.color = c; if (mreza.material.vertexColors) { mreza.material.vertexColors = false; mreza.material.needsUpdate = true; }
}
boje(); new MutationObserver(boje).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ---------------- robot ----------------
const OS = [['y', 1], ['z', -1], ['z', -1], ['x', 1], ['z', -1], ['x', 1]];
const zgl = []; let q = [0, 0, 0, 0, 0, 0];
const N = {};
function postavi(qq) {
  q = qq.slice();
  for (let i = 0; i < 6; i++) { const z = zgl[i]; if (!z) continue; z.rotation.set(0, 0, 0); z.rotation[OS[i][0]] = OS[i][1] * q[i] * Math.PI / 180; }
  klizaci.forEach((k, i) => { k.value = q[i]; ispis(i, q[i]); });
}
const klizaci = Array.from(document.querySelectorAll('[data-os]'));
function stupanj(v) { v = Math.round(v); return (v < 0 ? '−' + (-v) : String(v)) + '°'; }
function ispis(i, v) { const o = $('os' + (i + 1) + '-out'); if (o) o.textContent = stupanj(v); }
klizaci.forEach((k, i) => k.addEventListener('input', () => { stani(); const qq = q.slice(); qq[i] = +k.value; postavi(qq); }));

// ---------------- grijana podloga za ispis (u kodu i dalje "ploča": ploha na koju robot nanosi materijal) ----------------
// PL: w × h = podloga (mm); r, fi = sredina bližeg ruba podloge od osi robota; psi = zakret oko Z; hd = visina plohe nad stolom
const PL = { w: 250, h: 210, t: 3, r: 230, fi: 0, psi: 0, hd: 60, alfa: 90, hg: 60, nacinNagiba: 'kut' };
const ploca = { grupa: new THREE.Group(), U: null, V: null, Nn: null, R0: null };
naStolu.add(ploca.grupa);
const matPloca = new THREE.MeshStandardMaterial({ color: 0x2c302e, roughness: 0.62, metalness: 0.2 });   // PEI list
const matAlu = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.35, metalness: 0.75 });    // grijana ploča
const matStalak = new THREE.MeshStandardMaterial({ color: 0x30353a, roughness: 0.5, metalness: 0.45 });
let karta = null, podloga = null;          // { cv, cx, tex, s }
function platno(wmm, hmm, gustoca) {
  const s = Math.min(gustoca, 2048 / Math.max(wmm, hmm));
  const cv = document.createElement('canvas'); cv.width = Math.round(wmm * s); cv.height = Math.round(hmm * s);
  const cx = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { cv, cx, tex, s, w: wmm, h: hmm };
}
function uPlatno(pl, u, v) { return [(u + pl.w / 2) * pl.s, (pl.h / 2 - v) * pl.s]; }

function okvirPloce() {           // KS plohe podloge u bazi (m): R0 = sredina bližeg ruba
  const r = PL.r / 1000, fi = PL.fi * Math.PI / 180, psi = PL.psi * Math.PI / 180;
  const a = PL.alfa * Math.PI / 180;
  const R0 = [r * Math.cos(fi), r * Math.sin(fi), PL.hd / 1000];
  const n0 = [-Math.cos(fi + psi), -Math.sin(fi + psi), 0];
  const U = K.unit(K.cross(K.mul(n0, -1), [0, 0, 1]));
  const V = K.add(K.mul([0, 0, 1], Math.cos(a)), K.mul(n0, -Math.sin(a)));
  const Nn = K.cross(U, V);
  return { R0, U, V, Nn, alfa: PL.alfa };
}
function tockaNaPloci(o, u, vc, w = 0) {   // u, vc od središta podloge (mm), w uzduž normale (mm, plus = iznad podloge)
  const v = vc + PL.h / 2;
  return K.add(K.add(K.add(o.R0, K.mul(o.U, u / 1000)), K.mul(o.V, v / 1000)), K.mul(o.Nn, w / 1000));
}
function kutija(G, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; G.add(m); return m;
}
function crtajMrezu() {            // bijela mreža na PEI listu, svakih 50 mm, kao na podlozi pisača
  const p = podloga, cx = p.cx; cx.clearRect(0, 0, p.cv.width, p.cv.height);
  cx.strokeStyle = 'rgba(235,235,230,0.75)'; cx.lineWidth = Math.max(1, 0.35 * p.s); cx.setLineDash([2 * p.s, 1.5 * p.s]);
  cx.beginPath();
  for (let x = 50; x < PL.w; x += 50) { const a = uPlatno(p, x - PL.w / 2, -PL.h / 2), b = uPlatno(p, x - PL.w / 2, PL.h / 2); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); }
  for (let y = 50; y < PL.h; y += 50) { const a = uPlatno(p, -PL.w / 2, y - PL.h / 2), b = uPlatno(p, PL.w / 2, y - PL.h / 2); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); }
  cx.stroke(); cx.setLineDash([]);
  cx.strokeRect(3 * p.s, 3 * p.s, (PL.w - 6) * p.s, (PL.h - 6) * p.s);
  cx.fillStyle = 'rgba(235,235,230,0.8)'; cx.font = '600 ' + Math.round(5 * p.s) + 'px "IBM Plex Sans", Arial, sans-serif';
  cx.textAlign = 'right'; cx.fillText('ForTroniQ · ' + PL.w + ' × ' + PL.h + ' mm', (PL.w - 6) * p.s, (PL.h - 7) * p.s);
  p.tex.needsUpdate = true;
}
function gradiPlocu() {
  const o = okvirPloce(); Object.assign(ploca, o);
  const G = ploca.grupa; while (G.children.length) { const c = G.children.pop(); c.geometry && c.geometry.dispose(); }
  const W = PL.w / 1000, H = PL.h / 1000;
  // KS grupe: x = U, y = V (od robota), z = N (gore), ishodište = središte plohe podloge
  const C = tockaNaPloci(o, 0, 0);
  const m = new THREE.Matrix4().makeBasis(g3(o.U), g3(o.V), g3(o.Nn)); m.setPosition(g3(C));
  G.matrixAutoUpdate = false; G.matrix.copy(m); G.matrixWorldNeedsUpdate = true;
  kutija(G, matPloca, W, H, 0.0015, 0, 0, -0.00075);                       // PEI list
  kutija(G, matAlu, W + 0.006, H + 0.006, 0.003, 0, 0, -0.003);            // grijana ploča
  const vis = Math.max(0.01, PL.hd / 1000 - 0.0045);
  kutija(G, matStalak, W * 0.5, H * 0.75, vis, 0, 0, -0.0045 - vis / 2);    // nosač podloge do stola
  [karta, podloga].forEach(pl => pl && pl.tex.dispose());
  podloga = platno(PL.w, PL.h, 4); karta = platno(PL.w, PL.h, 2);
  [[podloga, 0.0002], [karta, 0.0008]].forEach(([pl, dz]) => {
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: pl.tex, transparent: true, depthWrite: false }));
    mm.position.z = dz; G.add(mm); pl.mesh = mm;
  });
  crtajMrezu();
  karta.mesh.visible = $('karta-dosega').checked;
  primijeniPrikaz();
  $('pl-info').innerHTML = 'Ploha podloge ' + Math.round(PL.hd) + ' mm iznad stola · sredina bližeg ruba ' + Math.round(PL.r * Math.cos(PL.fi * Math.PI / 180)) + ' mm ispred i ' +
    Math.round(PL.r * Math.sin(PL.fi * Math.PI / 180)) + ' mm lijevo od osi robota · ishodište W (0, 0) u bližem lijevom kutu, kao na pisaču.';
}

const mm = v => Math.round(v * 1000);
function pogled(vrsta) {
  if (vrsta === 'crtez') {
    const C = tockaNaPloci(ploca, srediste[0], srediste[1]);
    const d = K.unit(K.add(K.add(K.mul(ploca.Nn, 0.62), K.mul(ploca.U, -0.3)), K.mul(ploca.V, 0.72)));   // sa suprotne strane od robota
    const dist = Math.max(0.16, velCrt / 1000 * 2.6);
    kamera.position.copy(g3w(K.add(C, K.mul(d, dist)))); upr.target.copy(g3w(C)); upr.update(); return;
  }
  const C = tockaNaPloci(ploca, 0, 0);
  let d;
  if (vrsta === 'ploca') d = K.add(K.add(K.mul(ploca.Nn, 0.7), K.mul(ploca.U, -0.45)), K.mul(ploca.V, 0.55));   // podloga sa suprotne strane od robota
  else if (vrsta === 'odozgo') d = [0.05, -0.05, 1];
  else d = K.add(K.mul(ploca.Nn, 0.25), K.mul(ploca.U, 1));
  d = K.unit(d);
  const dist = vrsta === 'strana' || vrsta === 'odozgo' ? 1.6 : Math.max(1.15, Math.max(PL.w, PL.h) / 1000 * 5);
  const cam = K.add(C, K.add(K.mul(d, dist), [0, 0, vrsta === 'odozgo' ? 0.4 : 0.15]));
  const tgt = vrsta === 'ploca' ? K.add(K.mul(C, 0.6), [0, 0, 0.2]) : K.add(C, [C[0] * -0.35, C[1] * -0.35, 0.15]);
  kamera.position.copy(g3w(cam)); upr.target.copy(g3w(tgt)); upr.update();
}
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
// ---------------- prikaz: ispisani materijal, putanja, karta, model, stanica ----------------
let putPregled = null, ispisano = null, tockeLose = null, modelMesh = null;
function stanicaPrikaz() {
  const s = $('pr-stanica').value;
  if (N.stol) N.stol.visible = s !== 'robot';
  ploca.grupa.visible = s === 'sve';
}
function primijeniPrikaz() {
  const v = id => (+$(id).value) / 100;
  if (karta && karta.mesh) { karta.mesh.material.opacity = v('pr-karta'); karta.mesh.visible = v('pr-karta') > 0.001 && $('karta-dosega').checked; }
  if (putPregled) { putPregled.material.opacity = 0.85 * v('pr-plan'); putPregled.visible = v('pr-plan') > 0.001; }
  if (ispisano) { ispisano.material.color.set($('pr-filament').value); ispisano.material.opacity = v('pr-tinta'); ispisano.material.transparent = v('pr-tinta') < 0.99; ispisano.visible = v('pr-tinta') > 0.001; }
  if (modelMesh) { modelMesh.material.opacity = v('pr-model'); modelMesh.visible = v('pr-model') > 0.001; modelMesh.material.depthWrite = v('pr-model') > 0.95; }
  stanicaPrikaz();
  document.querySelectorAll('[data-pr]').forEach(o => { o.textContent = $(o.dataset.pr).value + ' %'; });
}
['pr-plan', 'pr-tinta', 'pr-karta', 'pr-model', 'pr-filament'].forEach(id => $(id).addEventListener('input', primijeniPrikaz));
$('pr-filament-izbor').addEventListener('change', () => { $('pr-filament').value = $('pr-filament-izbor').value; primijeniPrikaz(); });
$('pr-stanica').addEventListener('change', primijeniPrikaz);

// ---------------- karta dosega ----------------
const STANJE = { OK: 0, DOSEG: 1, SUDAR: 2 };
let okvirIspisa = null;                       // [u0, v0, u1, v1] ispisanog dijela (mm od središta podloge)
function provjeriSudar(rez, zIsp = 0) {
  // točke robota i alata (grijač, hladnjak, tijelo ekstrudera, držač, Schunk) — mlaznica smije do podloge, ništa drugo
  const tocke = [rez.ish[2], rez.ish[3], rez.ish[4], rez.j6.p,
    K.mul(K.add(rez.ish[1], rez.ish[2]), 0.5), K.mul(K.add(rez.ish[2], rez.ish[4]), 0.5)];
  for (const k in AL.tocke_kolizije) tocke.push(K.tockaUj6(rez, AL.tocke_kolizije[k]));
  const H = PL.h / 1000, W2 = PL.w / 2000;
  for (const p of tocke) {
    if (p[2] < -0.005) return true;                               // ispod plohe stola
    const d = K.sub(p, ploca.R0), w = K.dot(d, ploca.Nn), u = K.dot(d, ploca.U), v = K.dot(d, ploca.V);
    if (Math.abs(u) < W2 + 0.005 && v > -0.005 && v < H + 0.005 && w < 0.002) return true;                       // podloga
    if (w < -0.004 && Math.abs(u) < W2 * 0.5 + 0.01 && v > H * 0.125 - 0.01 && v < H * 0.875 + 0.01) return true;  // nosač podloge
    if (zIsp > 0 && okvirIspisa) {                                                                                 // već ispisani dio
      const vc = (v - H / 2) * 1000, um = u * 1000;
      if (w < zIsp / 1000 + 0.001 && um > okvirIspisa[0] - 3 && um < okvirIspisa[2] + 3 && vc > okvirIspisa[1] - 3 && vc < okvirIspisa[3] + 3) return true;
    }
  }
  return false;
}
function stanjeTocke(u, vc, q0, alat = ALAT.ekstruder) {
  const p = tockaNaPloci(ploca, u, vc), z = K.mul(ploca.Nn, -1);
  let r = q0 ? K.ik({ p, z }, q0, alat, { iter: 40 }) : null;
  if (!r || !r.ok) r = K.ikSiroko({ p, z }, alat, q0);
  if (!r || !r.ok) return { s: STANJE.DOSEG, q: q0 };
  const rez = K.fk(r.q, alat);
  if (provjeriSudar(rez)) return { s: STANJE.SUDAR, q: r.q };
  return { s: STANJE.OK, q: r.q };
}

let kartaPodaci = null;
function racunajKartu() {
  const nu = Math.max(8, Math.min(26, Math.round(PL.w / 8))), nv = Math.max(6, Math.min(20, Math.round(PL.h / 8)));
  const du = PL.w / nu, dv = PL.h / nv; const S = new Uint8Array(nu * nv);
  let q0 = null, ok = 0;
  for (let j = 0; j < nv; j++) {
    for (let ii = 0; ii < nu; ii++) {
      const i = j % 2 ? nu - 1 - ii : ii;
      const u = -PL.w / 2 + du * (i + 0.5), v = -PL.h / 2 + dv * (j + 0.5);
      const r = stanjeTocke(u, v, q0);
      S[j * nu + i] = r.s; if (r.s === STANJE.OK) { q0 = r.q; ok++; }
    }
  }
  kartaPodaci = { nu, nv, S, du, dv };
  const cx = karta.cx; cx.clearRect(0, 0, karta.cv.width, karta.cv.height);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const s = S[j * nu + i];
    cx.fillStyle = s === STANJE.OK ? 'rgba(46,170,90,0.17)' : (s === STANJE.SUDAR ? 'rgba(214,60,40,0.42)' : 'rgba(214,60,40,0.30)');
    const [x, y] = uPlatno(karta, -PL.w / 2 + du * i, -PL.h / 2 + dv * (j + 1));
    cx.fillRect(x, y, du * karta.s + 0.5, dv * karta.s + 0.5);
    if (s === STANJE.SUDAR) {
      cx.strokeStyle = 'rgba(160,30,20,0.55)'; cx.lineWidth = 1; cx.beginPath();
      cx.moveTo(x, y); cx.lineTo(x + du * karta.s, y + dv * karta.s); cx.stroke();
    }
  }
  karta.tex.needsUpdate = true;
  const n = nu * nv, sud = S.reduce((a, s) => a + (s === STANJE.SUDAR), 0);
  $('karta-info').innerHTML = '<b>Radni prostor:</b> ' + Math.round(100 * ok / n) + ' % podloge za ispis &middot; <b>kolizijski prostor:</b> ' +
    Math.round(100 * (n - ok) / n) + ' % (' + (n - ok - sud) + ' ćelija izvan dosega, ' + sud + ' u sudaru)';
}

// ---------------- omotač radnog prostora (središte zgloba 5, prema kinematici ABB IRB 120) ----------------
let omotac = null;
function gradiOmotac() {
  const res = 0.01, R0 = 0, Rm = 0.62, Z0 = -0.30, Zm = 1.05;
  const w = Math.round((Rm - R0) / res), h = Math.round((Zm - Z0) / res);
  const m = new Uint8Array(w * h);
  let rmax = 0, zmax = -9, zmin = 9;
  for (let a = -110; a <= 110; a += 1) for (let b = -110; b <= 70; b += 1) {
    const p = K.srediste5(a, b), r = Math.abs(p[0]), z = p[2];
    rmax = Math.max(rmax, Math.hypot(p[0], p[2] - 0.290)); zmax = Math.max(zmax, z); zmin = Math.min(zmin, z);
    const ix = Math.floor((r - R0) / res), iy = Math.floor((Zm - z) / res);
    if (ix >= 0 && ix < w && iy >= 0 && iy < h) m[iy * w + ix] = 1;
  }
  // zatvori sitne rupe
  const m2 = m.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!m[y * w + x]) {
    let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += m[(y + dy) * w + x + dx];
    if (n >= 4) m2[y * w + x] = 1;
  }
  const obr = P.obrisi(m2, w, h).sort((a, b) => b.length - a.length);
  if (!obr.length) return;
  const prof = P.pojednostavi(obr[0], 0.7).map(([x, y]) => new THREE.Vector2(Math.max(0, R0 + x * res), Zm - y * res));
  const geo = new THREE.LatheGeometry(prof, 96, Math.PI * 1.5 + 15 * Math.PI / 180, Math.PI * 2 * 330 / 360);
  omotac = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2eaa5a, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 }));
  omotac.visible = $('omotac').checked; naStolu.add(omotac);
  $('omotac-info').textContent = 'Najveći doseg središta zgloba 5: ' + Math.round(rmax * 1000 + 0) + ' mm od osi 2 (ABB: doseg 580 mm). Raspon visine: ' +
    Math.round(zmin * 1000) + ' do ' + Math.round(zmax * 1000) + ' mm.';
}
// ---------------- izvor: 3D model (rezač na stranici) ili G-kod iz PrusaSlicera ----------------
let modelTri = null, modelIme = '', gkodIzvor = null, gkodIme = '';
let srediste = [0, 0], velCrt = 120;
function izvor() { return document.querySelector('input[name="izvor"]:checked').value; }
function osvjeziIzvor() { const iz = izvor(); document.querySelectorAll('[data-izvor]').forEach(el => el.hidden = el.dataset.izvor !== iz); }
document.querySelectorAll('input[name="izvor"]').forEach(r => r.addEventListener('change', () => { osvjeziIzvor(); pripremi(); }));
function ucitajModelDat(buf, ime) {
  try { modelTri = P.citajModel(buf, ime); modelIme = ime; }
  catch (e) { modelTri = null; $('model-info').textContent = 'Model se nije mogao pročitati: ' + e.message; }
  pripremi();
}
$('model-dat').addEventListener('change', e => { const f = e.target.files[0]; if (f) f.arrayBuffer().then(b => ucitajModelDat(b, f.name)); });
$('model-primjer').addEventListener('click', () => {
  const bin = Uint8Array.from(atob(window.FTQ_PRIMJER_STL), c => c.charCodeAt(0)); ucitajModelDat(bin.buffer, 'primjer_nosac.stl');
});
$('gk-dat').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => {
    try {
      gkodIzvor = R.citajGkod(t); gkodIme = f.name;
      const b = R.okvirSlojeva(gkodIzvor.slojevi);
      $('gk-info').textContent = f.name + ': ' + gkodIzvor.slojevi.length + ' slojeva, visina ' + gkodIzvor.visina.toFixed(2) + ' mm, ' + gkodIzvor.izvlacenja + ' pomaka s ispisom; X ' +
        b[0].toFixed(1) + '–' + b[2].toFixed(1) + ', Y ' + b[1].toFixed(1) + '–' + b[3].toFixed(1) + ' mm.';
    } catch (err) { gkodIzvor = null; $('gk-info').textContent = 'G-kod se nije mogao pročitati: ' + err.message; }
    pripremi();
  });
});
let tPrip = 0;
function pripremiKasnije() { clearTimeout(tPrip); tPrip = setTimeout(pripremi, 250); }
['model-os', 'model-jed', 'model-mj', 'pomak-x', 'pomak-y', 'zakret-crteza', 'is-h', 'is-h1', 'is-w', 'is-per', 'is-isp', 'is-pd', 'is-pg', 'is-zhop', 'is-mat', 'brzina']
  .forEach(id => $(id).addEventListener('change', pripremiKasnije));
// model: orijentacija i jedinica (putanje.js), mjerilo, zakret oko Z i pomak na podlozi (mm od središta podloge)
function modelNaPlocu() {
  const M = P.pripremiModel(modelTri, { os: $('model-os').value, mm: +$('model-jed').value });
  const s = Math.max(1, +$('model-mj').value || 100) / 100, a = (+$('zakret-crteza').value || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  const dx = +$('pomak-x').value || 0, dy = +$('pomak-y').value || 0, Q = new Float32Array(M.P.length);
  for (let i = 0; i < M.P.length; i += 3) {
    const x = M.P[i] * s, y = M.P[i + 1] * s;
    Q[i] = x * c - y * sn + dx; Q[i + 1] = x * sn + y * c + dy; Q[i + 2] = M.P[i + 2] * s;
  }
  return { P: Q, w: M.w * s, h: M.h * s, visina: M.visina * s };
}
function postaviModelNaPlocu(M) {
  if (modelMesh && modelMesh.parent) modelMesh.parent.remove(modelMesh);
  if (modelMesh) modelMesh.geometry.dispose();
  modelMesh = null;
  if (!M) return;
  const pos = new Float32Array(M.P.length); for (let i = 0; i < pos.length; i++) pos[i] = M.P[i] / 1000;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals();
  modelMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9fb6c8, roughness: 0.6, metalness: 0.1, flatShading: true, transparent: true }));
  ploca.grupa.add(modelMesh); primijeniPrikaz();
}

// ---------------- program ispisa ----------------
const prog = { P: null, D: null, T: null, Q: null, OK: null, n: 0, t: 0, aktivan: false, gotovo: false };
const MAT = { pla: { ime: 'PLA', T: 215, B: 60 }, petg: { ime: 'PETG', T: 240, B: 85 } };
const DF = 1.75, AF = Math.PI * DF * DF / 4;      // promjer i presjek filamenta (mm, mm²)
function obrisiIspis() {
  [putPregled, ispisano, tockeLose].forEach(o => { if (o) { o.parent && o.parent.remove(o); o.geometry.dispose(); o.material.dispose(); } });
  putPregled = ispisano = tockeLose = null;
}
function pripremi() {
  stani(); prog.n = 0; prog.t = 0; prog.gotovo = false;
  $('crtaj').disabled = true; obrisiIspis(); postaviModelNaPlocu(null);
  const iz = izvor();
  const w = Math.max(0.2, +$('is-w').value || 0.45), h = Math.max(0.05, +$('is-h').value || 0.3), h1 = Math.max(0.05, +$('is-h1').value || h);
  const zhop = Math.max(0, +$('is-zhop').value || 0), v = +$('brzina').value || 20, mat = MAT[$('is-mat').value] || MAT.pla;
  let rez = null, izvorOpis = '';
  if (iz === 'model') {
    if (!modelTri) { $('prog-info').textContent = 'Učitaj 3D model (STL ili OBJ) ili primjer.'; prikaziGkod([]); return; }
    const M = modelNaPlocu(); postaviModelNaPlocu(M);
    rez = R.rezi(M.P, { h, h1, w, perimetri: +$('is-per').value, ispuna: +$('is-isp').value, puniDolje: +$('is-pd').value, puniGore: +$('is-pg').value });
    izvorOpis = modelIme + ' · ' + Math.round(M.w) + ' × ' + Math.round(M.h) + ' × ' + M.visina.toFixed(1) + ' mm';
    $('model-info').textContent = modelIme + ': ' + (modelTri.length / 9) + ' trokuta; na podlozi ' + Math.round(M.w) + ' × ' + Math.round(M.h) + ' × ' + M.visina.toFixed(1) + ' mm.';
  } else {
    if (!gkodIzvor) { $('prog-info').textContent = 'Učitaj G-kod (.gcode) iz PrusaSlicera ili drugog rezača.'; prikaziGkod([]); return; }
    // G-kod: koordinate podloge pisača (0, 0 = bliži lijevi kut) -> mm od središta podloge
    rez = { slojevi: gkodIzvor.slojevi.map(s => ({ ...s, putevi: s.putevi.map(p => ({ ...p, t: p.t.map(q => [q[0] - PL.w / 2, q[1] - PL.h / 2]) })) })), visina: gkodIzvor.visina };
    izvorOpis = gkodIme;
  }
  const S = rez.slojevi.filter(s => s.putevi.length);
  if (!S.length) { $('prog-info').textContent = 'Nema ništa za ispis (provjeri model ili G-kod).'; prikaziGkod([]); return; }
  const ok = R.okvirSlojeva(S); okvirIspisa = ok;
  srediste = [(ok[0] + ok[2]) / 2, (ok[1] + ok[3]) / 2]; velCrt = Math.max(ok[2] - ok[0], ok[3] - ok[1], rez.visina);
  const u0 = -PL.w / 2, v0 = -PL.h / 2; postaviKSCrteza(u0, v0);
  // duljina putanje -> korak podjele (najviše ~90 000 točaka za IK)
  let Lis = 0; S.forEach(s => s.putevi.forEach(p => { for (let i = 1; i < p.t.length; i++) Lis += Math.hypot(p.t[i][0] - p.t[i - 1][0], p.t[i][1] - p.t[i - 1][1]); }));
  const korak = Math.max(2, Lis / 70000);
  const Pp = [], Dd = [], Lg = [], Sl = [];
  const G = [], f3 = x => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3), f5 = x => x.toFixed(5);
  const F = 'F' + Math.round(v * 60), FT = 'F' + Math.round(v * 4 * 60), RET = 0.8;
  G.push('; ForTroniQ - ABB IRB 120, 3D ispis (FDM ekstruder u drzacu iz stanice M. Mudrija)');
  G.push('; Izvor: ' + izvorOpis);
  G.push('; Nul-tocka W: blizi lijevi kut podloge ' + PL.w + ' x ' + PL.h + ' mm; X udesno, Y od robota, Z gore (kao na pisacu)');
  G.push('; ' + mat.ime + ' fi ' + DF + ' mm, mlaznica 0.4 mm, sirina linije ' + w + ' mm, slojevi ' + h + ' mm (prvi ' + h1 + ' mm), ' + S.length + ' slojeva');
  G.push('; Brzina ispisa F' + Math.round(v * 60) + ', prazni hod F' + Math.round(v * 4 * 60) + ' mm/min, podizanje Z pri praznom hodu ' + zhop + ' mm, povlacenje ' + RET + ' mm');
  G.push('G21 ; mm'); G.push('G90 ; apsolutne koordinate'); G.push('M83 ; relativni E');
  G.push('M140 S' + mat.B + ' ; podloga'); G.push('M104 S' + mat.T + ' ; mlaznica'); G.push('M190 S' + mat.B); G.push('M109 S' + mat.T);
  G.push('G0 Z' + f3(5) + ' ' + FT);
  function tocka(p, ispis, gl, sl) { Pp.push(p); Dd.push(ispis); Lg.push(gl); Sl.push(sl); }
  function linija(a, b, ispis, gl, sl) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(L / korak));
    for (let k = 1; k <= n; k++) { const t = k / n; tocka([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], ispis, gl, sl); }
  }
  let zad = null, Euk = 0;
  S.forEach((s, si) => {
    G.push(';LAYER:' + si + ' Z' + f3(s.z));
    const he = s.h || h;
    for (const p of s.putevi) {
      const t = p.zatvoren ? p.t.concat([p.t[0]]) : p.t, a = [t[0][0], t[0][1], s.z];
      // prazni hod: povlačenje, podizanje, prijelaz, spuštanje, vraćanje filamenta
      if (zad) {
        const daleko = Math.hypot(a[0] - zad[0], a[1] - zad[1]) > 1.5 || Math.abs(a[2] - zad[2]) > 1e-4;
        if (daleko) {
          G.push('G1 E-' + RET + ' F2100'); G.push('G0 Z' + f3(zad[2] + zhop) + ' ' + FT);
          linija(zad, [zad[0], zad[1], zad[2] + zhop], 0, G.length - 1, si);
          G.push('G0 X' + f3(a[0] - u0) + ' Y' + f3(a[1] - v0)); linija([zad[0], zad[1], zad[2] + zhop], [a[0], a[1], s.z + zhop], 0, G.length - 1, si);
          G.push('G0 Z' + f3(s.z)); linija([a[0], a[1], s.z + zhop], a, 0, G.length - 1, si);
          G.push('G1 E' + RET + ' F2100');
        } else { G.push('G1 X' + f3(a[0] - u0) + ' Y' + f3(a[1] - v0) + ' ' + FT); linija(zad, a, 0, G.length - 1, si); }
      } else {
        G.push('G0 X' + f3(a[0] - u0) + ' Y' + f3(a[1] - v0) + ' ' + FT); tocka([a[0], a[1], s.z + 5], 0, G.length - 1, si);
        G.push('G0 Z' + f3(s.z)); linija([a[0], a[1], s.z + 5], a, 0, G.length - 1, si);
      }
      let pr = a;
      for (let i = 1; i < t.length; i++) {
        const b = [t[i][0], t[i][1], s.z], L = Math.hypot(b[0] - pr[0], b[1] - pr[1]);
        if (L < 1e-4) continue;
        const E = L * w * he / AF; Euk += E;
        G.push('G1 X' + f3(b[0] - u0) + ' Y' + f3(b[1] - v0) + ' E' + f5(E) + (i === 1 ? ' ' + F : ''));
        linija(pr, b, 1, G.length - 1, si); pr = b;
      }
      zad = pr;
    }
  });
  G.push('G1 E-' + RET + ' F2100'); G.push('G0 Z' + f3((zad ? zad[2] : 0) + 10) + ' ' + FT);
  G.push('M104 S0'); G.push('M140 S0'); G.push('M107'); G.push('M2');
  prikaziGkod(G);
  const n = Pp.length;
  const T = new Float32Array(n); T[0] = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(Pp[i][0] - Pp[i - 1][0], Pp[i][1] - Pp[i - 1][1], Pp[i][2] - Pp[i - 1][2]);
    T[i] = T[i - 1] + d / (Dd[i] ? v : v * 4);
  }
  // IK za sve točke; sudar se provjerava sa svakom 4. točkom (podloga, nosač, već ispisani dio ispod trenutnog sloja)
  const Q = new Float32Array(n * 6), OK = new Uint8Array(n);
  let q0 = null, losih = 0, sudara = 0, zadnjiSiroki = -99;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const p = tockaNaPloci(ploca, Pp[i][0], Pp[i][1], Pp[i][2]), z = K.mul(ploca.Nn, -1);
    let r = q0 ? K.ik({ p, z }, q0, ALAT.ekstruder, { iter: 30 }) : null;
    if ((!r || !r.ok) && (i - zadnjiSiroki > 15 || !q0)) { r = K.ikSiroko({ p, z }, ALAT.ekstruder, q0); zadnjiSiroki = i; }
    let okk = r && r.ok;
    if (okk && (i % 4 === 0 || !q0)) { const sl = S[Sl[i]]; if (provjeriSudar(K.fk(r.q, ALAT.ekstruder), Math.max(0, sl.z - (sl.h || h)))) { okk = false; sudara++; } }
    if (okk) { q0 = r.q; } else losih++;
    const qq = okk ? r.q : (q0 || [0, 0, 0, 0, 0, 0]);
    for (let j = 0; j < 6; j++) Q[i * 6 + j] = qq[j];
    OK[i] = okk ? 1 : 0;
  }
  // nanesen materijal: segment i = od točke i-1 do i ako se na putu do i ispisuje; os linije na polovici visine sloja
  const segDo = new Int32Array(n); let ns = 0;
  for (let i = 1; i < n; i++) { if (Dd[i]) ns++; segDo[i] = ns; }
  const pos = new Float32Array(ns * 6); let k = 0;
  for (let i = 1; i < n; i++) if (Dd[i]) {
    const dz = (S[Sl[i]].h || h) / 2;
    pos[k++] = Pp[i - 1][0] / 1000; pos[k++] = Pp[i - 1][1] / 1000; pos[k++] = (Pp[i - 1][2] - dz) / 1000;
    pos[k++] = Pp[i][0] / 1000; pos[k++] = Pp[i][1] / 1000; pos[k++] = (Pp[i][2] - dz) / 1000;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ispisano = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: $('pr-filament').value }));
  ispisano.geometry.setDrawRange(0, 0); ploca.grupa.add(ispisano);
  putPregled = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x17656e, transparent: true, depthWrite: false }));
  ploca.grupa.add(putPregled);
  // točke izvan dosega ili u sudaru (crveno)
  const lose = []; for (let i = 0; i < n; i++) if (!OK[i] && Dd[i]) lose.push(Pp[i][0] / 1000, Pp[i][1] / 1000, Pp[i][2] / 1000);
  if (lose.length) {
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lose), 3));
    tockeLose = new THREE.Points(gl, new THREE.PointsMaterial({ color: 0xd63c28, size: 3, sizeAttenuation: false })); ploca.grupa.add(tockeLose);
  }
  primijeniPrikaz();
  Object.assign(prog, { P: Pp, D: Dd, T, Q, OK, n, Lg, Sl, S, segDo });
  const masa = Euk * AF * 1.24 / 1000;            // g (PLA ≈ 1,24 g/cm³)
  $('prog-info').innerHTML = '<b>' + izvorOpis + '</b>: ' + S.length + mnozina(S.length, ' sloj', ' sloja', ' slojeva') + ', visina ' + rez.visina.toFixed(1) + ' mm, ' +
    (Lis / 1000).toFixed(1) + ' m ispisa, filament ' + (Euk / 1000).toFixed(2) + ' m (oko ' + Math.round(masa) + ' g), oko ' + vrijeme(T[n - 1]) + ' pri ' + v + ' mm/s.' +
    (ok[0] < -PL.w / 2 || ok[2] > PL.w / 2 || ok[1] < -PL.h / 2 || ok[3] > PL.h / 2 ? ' <span class="upoz">Dio izlazi izvan podloge.</span>' : '') +
    (losih ? ' <span class="upoz">' + Math.round(100 * losih / n) + ' % putanje je u kolizijskom prostoru' + (sudara ? ' (sudar alata ili robota s podlogom ili već ispisanim dijelom)' : '') + '.</span>' : ' Cijela putanja je u radnom prostoru.');
  $('crtaj').disabled = false; napredak();
  window.FTQ_PROG = { n, losih, sudara, trajanje: T[n - 1], ms: Math.round(performance.now() - t0), slojeva: S.length, Lis, Euk, korak };
}
function mnozina(n, a, b, c) { const d = n % 10, s = n % 100; return d === 1 && s !== 11 ? a : (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? b : c; }
function vrijeme(s) { s = Math.round(s); if (s < 60) return s + ' s'; const m = Math.floor(s / 60); return m < 60 ? m + ' min ' + (s % 60) + ' s' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
function napredak() {
  const T = prog.T; const uk = prog.n ? T[prog.n - 1] : 0;
  $('napredak').value = uk ? Math.min(1, prog.t / uk) : 0;
  let s = uk ? vrijeme(prog.t) + ' / ' + vrijeme(uk) : '';
  if (uk && prog.S) { const ii = indeks(prog.t), sl = prog.S[prog.Sl[ii]]; if (sl) s += ' · sloj ' + (prog.Sl[ii] + 1) + ' / ' + prog.S.length + ' · Z ' + sl.z.toFixed(2) + ' mm'; }
  $('napredak-txt').textContent = s;
}
function obrisiTrag() { if (ispisano) ispisano.geometry.setDrawRange(0, 0); }
let qPrijelaz = null, tPrijelaz = 0;
function stani() { prog.aktivan = false; $('crtaj').textContent = 'Ispiši'; $('crtaj').setAttribute('aria-pressed', 'false'); }
$('crtaj').addEventListener('click', () => {
  if (prog.aktivan) { stani(); return; }
  if (!prog.n) return;
  if (prog.gotovo || prog.t >= prog.T[prog.n - 1]) { prog.t = 0; prog.gotovo = false; obrisiTrag(); }
  const i0 = indeks(prog.t); const qc = Array.from(prog.Q.slice(i0 * 6, i0 * 6 + 6));
  qPrijelaz = { od: q.slice(), do: qc, t: 0, dur: Math.max(0.4, Math.max(...qc.map((v, j) => Math.abs(v - q[j]))) / 60) };
  prog.aktivan = true; $('crtaj').textContent = 'Pauza'; $('crtaj').setAttribute('aria-pressed', 'true');
});
$('obrisi').addEventListener('click', () => { obrisiTrag(); prog.t = 0; prog.gotovo = false; napredak(); });
$('pocetni').addEventListener('click', () => { stani(); qPrijelaz = { od: q.slice(), do: [0, 0, 0, 0, 0, 0], t: 0, dur: 1.2, samo: true }; });
function indeks(t) { const T = prog.T; let lo = 0, hi = prog.n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T[m] <= t) lo = m; else hi = m - 1; } return lo; }
function korakPrograma(dt) {
  const T = prog.T, n = prog.n, uk = T[n - 1];
  prog.t = Math.min(uk, prog.t + dt * (+$('ubrzanje').value));
  const i = indeks(prog.t), j = Math.min(n - 1, i + 1);
  const a = T[j] > T[i] ? (prog.t - T[i]) / (T[j] - T[i]) : 0;
  const qq = []; for (let k = 0; k < 6; k++) qq.push(prog.Q[i * 6 + k] + (prog.Q[j * 6 + k] - prog.Q[i * 6 + k]) * a);
  postavi(qq);
  if (ispisano) ispisano.geometry.setDrawRange(0, 2 * prog.segDo[i]);
  istakniRedak(prog.Lg[i]);
  napredak();
  if (prog.t >= uk) { prog.gotovo = true; stani(); $('napredak-txt').textContent += ' · gotovo'; }
}


// ---------------- koordinatni sustav crteža na ploči ----------------
function oznaka(tekst, boja, visina = 0.018) {
  const m = document.createElement('canvas').getContext('2d'); m.font = '600 40px "IBM Plex Sans", Arial, sans-serif';
  const w = Math.ceil(m.measureText(tekst).width + 28);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = 64;
  const cx = cv.getContext('2d'); cx.font = m.font; cx.textBaseline = 'middle';
  cx.fillStyle = 'rgba(255,255,255,0.88)'; cx.fillRect(0, 6, w, 52); cx.fillStyle = boja; cx.fillText(tekst, 14, 33);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(visina * w / 64, visina, 1); s.center.set(0, 0.5); s.renderOrder = 10; return s;
}
let ksCrteza = null;
function postaviKSCrteza(u0, v0) {
  if (ksCrteza && ksCrteza.parent) ksCrteza.parent.remove(ksCrteza);
  const g = new THREE.Group(); const L = 0.05;
  [[[1, 0, 0], 0xd23c28, 'X'], [[0, 1, 0], 0x2a9d4b, 'Y'], [[0, 0, 1], 0x2563c9, 'Z']].forEach(([d, b, t]) => {
    const a = new THREE.ArrowHelper(new THREE.Vector3(...d), new THREE.Vector3(0, 0, 0), L, b, 0.012, 0.007);
    a.traverse(o => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } }); g.add(a);
    const o = oznaka(t, '#' + b.toString(16).padStart(6, '0'), 0.012);
    o.position.set(d[0] * (L + 0.006), d[1] * (L + 0.006), d[2] * (L + 0.006)); g.add(o);
  });
  const w = oznaka('W (0, 0)', '#17656E', 0.014); w.position.set(0.004, -0.012, 0.002); g.add(w);
  g.position.set(u0 / 1000, v0 / 1000, 0.0012); g.visible = $('ks-crteza').checked;
  ploca.grupa.add(g); ksCrteza = g;
  // položaj W u KS robota (kao wobj: uframe) — kvaternion iz osi U, V, N
  const p = tockaNaPloci(ploca, u0, v0), U = ploca.U, V = ploca.V, Nn = ploca.Nn;
  const qq = kvaternion(U, V, Nn);
  $('ks-info').innerHTML = '<b>Nul-točka W</b> (bliži lijevi kut podloge, kao ishodište pisača). U KS robota: x = ' + mm(p[0]) + ', y = ' + mm(p[1]) + ', z = ' + mm(p[2]) + ' mm; kvaternion [' + qq.map(x => x.toFixed(5)).join(', ') + '] (osi X, Y, Z crteža).';
}
function kvaternion(X, Y, Z) {            // matrica [X Y Z] (stupci) -> [q1 q2 q3 q4] kao u ABB RAPID-u (w prvi)
  const m00 = X[0], m11 = Y[1], m22 = Z[2], tr = m00 + m11 + m22; let w, x, y, z;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (Y[2] - Z[1]) / s; y = (Z[0] - X[2]) / s; z = (X[1] - Y[0]) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (Y[2] - Z[1]) / s; x = s / 4; y = (Y[0] + X[1]) / s; z = (Z[0] + X[2]) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (Z[0] - X[2]) / s; x = (Y[0] + X[1]) / s; y = s / 4; z = (Z[1] + Y[2]) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (X[1] - Y[0]) / s; x = (Z[0] + X[2]) / s; y = (Z[1] + Y[2]) / s; z = s / 4; }
  if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
  return [w, x, y, z];
}
$('ks-crteza').addEventListener('change', () => { if (ksCrteza) ksCrteza.visible = $('ks-crteza').checked; });

// ---------------- G-kod: prikaz i izvoz ----------------
let gkod = [], gRedak = -1;
function prikaziGkod(G) {
  gkod = G; gRedak = -1;
  const MAKS = 30000, pr = $('gkod');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const dio = G.slice(0, MAKS).map((l, i) => '<div' + (l[0] === ';' ? ' class="kom"' : '') + '><i>' + (i + 1) + '</i>' + esc(l) + '</div>').join('');
  pr.innerHTML = dio + (G.length > MAKS ? '<div class="kom"><i></i>; … prikazano ' + MAKS + ' od ' + G.length + ' redaka (izvoz sadrži sve)</div>' : '');
  const kb = new Blob([G.join('\n')]).size;
  $('gkod-info').textContent = G.length + ' redaka, ' + (kb / 1024).toFixed(1) + ' kB. Koordinate su u mm od nul-točke W.';
}
function istakniRedak(r) {
  if (r === gRedak || r == null) return;
  const pr = $('gkod'), st = pr.children[gRedak], nv = pr.children[r];
  if (st) st.classList.remove('akt');
  if (nv) { nv.classList.add('akt'); if (!$('k-gkod').hidden) pr.scrollTop = nv.offsetTop - pr.clientHeight / 2; }
  gRedak = r;
}
function imeDatoteke() {
  const b = ((izvor() === 'gkod' ? gkodIme : modelIme) || 'ispis').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  return 'IRB120_ispis_' + b + '_v01';
}
$('gkod-izvoz').addEventListener('click', async () => {
  if (!gkod.length) return;
  const tekst = gkod.join('\r\n') + '\r\n', poruka = $('gkod-poruka');
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) {                                   // pregled na claude.ai: preglednik dopušta samo .txt
    try { await dl.save({ filename: imeDatoteke() + '.gcode.txt', data: tekst }); poruka.textContent = 'Spremljeno. Ekstenziju .txt makni pa ostaje .gcode.'; }
    catch (e) { poruka.textContent = e && e.code === 'declined' ? 'Spremanje otkazano.' : 'Spremanje ovdje nije dostupno; kopiraj G-kod.'; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/plain' }));
  a.download = imeDatoteke() + '.gcode'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  poruka.textContent = 'Spremljeno kao ' + a.download + '.';
});
$('gkod-kopiraj').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(gkod.join('\n')); $('gkod-poruka').textContent = 'G-kod je kopiran.'; }
  catch (e) {
    const r = document.createRange(); r.selectNodeContents($('gkod')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    $('gkod-poruka').textContent = 'Oznaceno — kopiraj s Ctrl+C.';
  }
});

// ---------------- alat: FDM ekstruder u držaču (stanica M. Mudrija) ----------------
function postaviAlat() {
  const al = ALAT.ekstruder, rez = K.fk(q, al);
  $('tcp-info').innerHTML = 'TCP (vrh mlaznice 0,4 mm) u nultom položaju: x = ' + mm(rez.p[0]) + ', y = ' + mm(rez.p[1]) + ', z = ' + mm(rez.p[2]) + ' mm; od prirubnice ' +
    Math.round(1000 * Math.hypot(...K.sub(K.tockaUj6(K.fk([0, 0, 0, 0, 0, 0]), al.p), [0.374, 0, 0.630]))) + ' mm.<br>tooldata za RAPID: [TRUE,[[' + AL.vrh_t0_mm.map(v => v.toFixed(1)).join(',') + '],[0.707107,0,0.707107,0]],[1.2,[60,-60,60],[1,0,0,0],0,0,0]] (masa i težište procijenjeni).';
  tcpOznaka(al);
}
let tcpTroj = null;
function tcpOznaka(al) {
  if (!N.j6) return;
  if (!tcpTroj) { tcpTroj = new THREE.AxesHelper(0.05); tcpTroj.material.depthTest = false; tcpTroj.renderOrder = 9; N.j6.add(tcpTroj); }
  const c = k => new THREE.Vector3(al.R[k], al.R[6 + k], -al.R[3 + k]);
  const m = new THREE.Matrix4().makeBasis(c(0), c(1), c(2)); m.setPosition(new THREE.Vector3(al.p[0], al.p[2], -al.p[1]));
  tcpTroj.matrixAutoUpdate = false; tcpTroj.matrix.copy(m);
}

// ---------------- ulazi podloge ----------------
const POLJA = { 'pl-w': 'w', 'pl-h': 'h', 'pl-r': 'r', 'pl-fi': 'fi', 'pl-psi': 'psi', 'pl-hd': 'hd' };
let tPloca = 0;
function promjenaPloce(odmah) {
  for (const id in POLJA) PL[POLJA[id]] = +$(id).value;
  gradiPlocu();
  clearTimeout(tPloca);
  tPloca = setTimeout(() => { if ($('karta-dosega').checked) racunajKartu(); pripremi(); }, odmah ? 0 : 300);
}
for (const id in POLJA) {
  const el = $(id), sl = $(id + '-r');
  el.addEventListener('input', () => { if (sl) sl.value = el.value; promjenaPloce(); });
  if (sl) sl.addEventListener('input', () => { el.value = sl.value; promjenaPloce(); });
}
$('karta-dosega').addEventListener('change', () => { primijeniPrikaz(); if ($('karta-dosega').checked) racunajKartu(); else $('karta-info').textContent = ''; });
$('omotac').addEventListener('change', () => { if (omotac) omotac.visible = $('omotac').checked; });


// ---------------- učitavanje ----------------
function ucitajModel(gotovo, greska) {
  const L = new GLTFLoader();
  if (window.FTQ_GLB_B64) { const bin = Uint8Array.from(atob(window.FTQ_GLB_B64), ch => ch.charCodeAt(0)); L.parse(bin.buffer, '', gotovo, greska); }
  else L.load('irb120_ispis.glb', gotovo, undefined, greska);
}
ucitajModel(g => {
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (let i = 1; i <= 6; i++) zgl.push(g.scene.getObjectByName('j' + i));
  ['j6'].forEach(n => N[n] = g.scene.getObjectByName(n)); N.stol = g.scene.getObjectByName('l_stol');
  naStolu.add(g.scene);
  $('ucitavanje').remove();
  postaviAlat();
  promjenaPloce(true);
  osvjeziIzvor(); $('model-primjer').click();
  gradiOmotac();
  pogled('ploca');
  window.FTQ_SPREMNO = true;
}, () => { $('ucitavanje').textContent = 'Model se nije mogao učitati. Stranicu otvori preko poslužitelja, ne izravno iz datoteke.'; });

function velicina() { const w = kut.clientWidth, h = kut.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(kut); velicina();
// ---------------- prosirena stvarnost (WebXR, Chrome na Androidu) ----------------
const krug = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.14, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2ECAD4 }));
krug.matrixAutoUpdate = false; krug.visible = false; scena.add(krug);
let xr = null, xrSmjer = 0, xrZakret = 0;
// sidro (WebXR Anchors): robot i ploča ostaju vezani uz stvarnu točku na podu ili stolu dok se obilaze.
// korijen = A_sad · A_0⁻¹ · T(p0) · Ry(smjer + zakret); A_0 je prva poza sidra, A_sad trenutna (ARCore je ispravlja).
const sidroP0 = new THREE.Vector3(), sidroSad = new THREE.Matrix4(), sidroInv0 = new THREE.Matrix4(), korM = new THREE.Matrix4(), pomM = new THREE.Matrix4();
function korijenXR() {
  korM.makeRotationY(xrSmjer + xrZakret).setPosition(sidroP0);
  if (xr && xr.sidro && xr.imaPozu) korM.premultiply(pomM.multiplyMatrices(sidroSad, sidroInv0));
  korM.decompose(korijen.position, korijen.quaternion, korijen.scale);
}
const XR_INACICA = 'ispis v01';
function stanjeSidra(t) { const el = $('xr-sidro'); if (el && el.textContent !== t) el.textContent = t; }
function presidri() {                     // sidro se izgubilo: model ostaje gdje je sada, novo slobodno sidro na tom mjestu
  sidroP0.copy(korijen.position);
  const e = new THREE.Euler().setFromQuaternion(korijen.quaternion, 'YXZ'); xrSmjer = e.y - xrZakret;
  pustiSidro(); korijenXR(); xr.trebaSidro = true; xr.slobodno = true; xr.presidreno++;
}
function pustiSidro() { if (xr && xr.sidro) { try { xr.sidro.delete(); } catch (e) { } } if (xr) { xr.sidro = null; xr.imaPozu = false; xr.trebaSidro = false; } }
function sidriUOkviru(frame, ref) {      // zove se u animacijskom okviru (createAnchor traži aktivan okvir)
  xr.trebaSidro = false;
  const gotovo = a => { if (!xr || !xr.postavljen) { try { a.delete(); } catch (e) { } return; } xr.sidro = a; xr.imaPozu = false; xr.izgubljeno = 0; xr.sidroStanje = 'da'; uputa.textContent = 'Stol s robotom i podlogom usidren je na podu. Dodirni Ispiši; obilazi ga slobodno.'; };
  const nijeUspjelo = () => { if (xr) xr.sidroStanje = 'ne'; if (xr && !xr.presidreno) uputa.textContent = 'Stol s robotom je postavljen (uređaj ne podržava sidra, pa može malo plivati). Dodirni Ispiši.'; };
  try {
    const r = xr.izvor ? frame.getHitTestResults(xr.izvor) : [];
    const hp = r.length ? r[0].getPose(ref) : null;
    if (!xr.slobodno && hp && r[0].createAnchor && Math.hypot(hp.transform.position.x - sidroP0.x, hp.transform.position.y - sidroP0.y, hp.transform.position.z - sidroP0.z) < 0.25) {
      r[0].createAnchor().then(gotovo, nijeUspjelo); return;      // sidro vezano uz plohu (pod, stol)
    }
    if (frame.createAnchor) {
      frame.createAnchor(new XRRigidTransform({ x: sidroP0.x, y: sidroP0.y, z: sidroP0.z }), ref).then(gotovo, nijeUspjelo); return;
    }
  } catch (e) { }
  nijeUspjelo();
}
const sloj = $('xr-sloj'), uputa = $('xr-uputa'), xrGumb = $('xr-gumb');
['.xr-vrh', '.xr-dno'].forEach(s => sloj.querySelector(s).addEventListener('beforexrselect', e => e.preventDefault()));
(function () {
  const ua = navigator.userAgent || '';
  const mob = /Android|iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (mob) document.documentElement.classList.add('je-mob');
  const KANON = 'https://dos.fortroniq.hr/ar/irb120-ispis/';
  const adresa = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.href.split('#')[0] : KANON;
  try { if (window.qrcode) { const qq = qrcode(0, 'M'); qq.addData(adresa); qq.make(); $('qr').innerHTML = qq.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } } catch (e) { }
  $('adresa').textContent = adresa;
  // gumb se na Androidu prikazuje uvijek kad preglednik ima WebXR; provjera podrske samo se ispisuje
  const android = /Android/i.test(ua);
  if (navigator.xr && android) xrGumb.hidden = false;
  if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (ok) { xrGumb.hidden = false; $('ar-poruka').textContent = ''; }
    else if (android) $('ar-poruka').textContent = 'Preglednik javlja da AR nije podržan. Probaj ipak gumb; ako se ne pokrene, provjeri da je instalirana aplikacija Google Play usluge za AR (ARCore) i da stranica nije otvorena u načinu „Web-lokacija za računala”.';
  }).catch(e => { if (android) $('ar-poruka').textContent = 'Provjera AR-a nije uspjela (' + (e && e.message || e) + '). Probaj ipak gumb.'; });
  else if (android && !navigator.xr) {
    const a = $('u-chrome'); a.hidden = false;
    a.href = 'intent://' + adresa.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    $('ar-poruka').textContent = 'Ovaj preglednik (npr. Samsung Internet) nema WebXR. Otvori stranicu u Chromeu gumbom iznad.';
  }
  else if (mob && !navigator.xr) $('ar-poruka').textContent = 'Ovaj preglednik nema WebXR. AR s 3D ispisom radi u Chromeu na Androidu; na iPhoneu Safari to još ne podržava.';
})();
xrGumb.addEventListener('click', () => {
  sloj.hidden = false;
  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'anchors'], domOverlay: { root: sloj } }).then(s => {
    renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
    return renderer.xr.setSession(s).then(() => {
      xr = { s, izvor: null, postavljen: false, sidro: null, imaPozu: false, trebaSidro: false, slobodno: false, izgubljeno: 0, presidreno: 0, sidroStanje: '', okvir: 0 };
      mreza.visible = false; pod.material.opacity = 0.32; korijen.visible = false;
      uputa.textContent = 'Usmjeri kameru prema podu i polako pomiči mobitel dok se ne pojavi krug (stol je visok 81 cm, treba mu mjesta).'; stanjeSidra('');
      s.requestReferenceSpace('viewer').then(vs => s.requestHitTestSource({ space: vs })).then(iz => { if (xr) xr.izvor = iz; });
      s.addEventListener('select', () => {
        if (!xr || xr.postavljen || !krug.visible) return;
        sidroP0.setFromMatrixPosition(krug.matrix);
        const c = renderer.xr.getCamera().position;
        // okreni cjelinu tako da korisnik gleda podlogu sa strane robota (kao gumb Pogled na podlogu)
        const d = K.unit(K.add(K.mul(ploca.Nn, 0.78), K.mul(ploca.U, -0.62)));
        xrSmjer = Math.atan2(-(c.z - sidroP0.z), c.x - sidroP0.x) - Math.atan2(d[1], d[0]);
        pustiSidro(); korijenXR(); korijen.visible = true; xr.postavljen = true; xr.trebaSidro = true; xr.slobodno = false; xr.presidreno = 0; xr.sidroStanje = 'čekam'; krug.visible = false;
        uputa.textContent = 'Stol s robotom je postavljen, sidrim ga na pod…';
      });
      s.addEventListener('end', () => {
        if (xr && xr.izvor) xr.izvor.cancel();
        pustiSidro(); xr = null; renderer.xr.enabled = false; sloj.hidden = true;
        korijen.position.set(0, 0, 0); korijen.rotation.set(0, 0, 0); korijen.scale.set(1, 1, 1); korijen.visible = true;
        mreza.visible = true; pod.material.opacity = 0.16; krug.visible = false; velicina();
      });
    });
  }).catch(e => { sloj.hidden = true; $('ar-poruka').textContent = 'Proširena stvarnost se nije mogla pokrenuti (' + (e && e.message ? e.message : e) + ').'; });
});
$('xr-izlaz').addEventListener('click', () => { if (xr) xr.s.end(); });
$('xr-premjesti').addEventListener('click', () => { if (!xr) return; pustiSidro(); stanjeSidra(''); xr.postavljen = false; korijen.visible = false; uputa.textContent = 'Dodirni krug na podu da ponovno postaviš stol s robotom.'; });
$('xr-crtaj').addEventListener('click', () => $('crtaj').click());
$('xr-obrisi').addEventListener('click', () => $('obrisi').click());
$('xr-zakret').addEventListener('input', e => { xrZakret = +e.target.value * Math.PI / 180; if (xr && xr.postavljen) korijenXR(); else korijen.rotation.y = xrSmjer + xrZakret; $('xr-zakret-out').textContent = e.target.value + '\u00b0'; });
new MutationObserver(() => { $('xr-crtaj').textContent = $('crtaj').textContent; $('xr-crtaj').setAttribute('aria-pressed', $('crtaj').getAttribute('aria-pressed')); })
  .observe($('crtaj'), { childList: true, attributes: true, characterData: true, subtree: true });

function xrKorak(frame, ref) {        // svaki okvir dok je model postavljen: sidro, presidravanje, stanje
  if (xr.trebaSidro) sidriUOkviru(frame, ref);
  if (xr.sidro) {
    const ap = frame.trackedAnchors && !frame.trackedAnchors.has(xr.sidro) ? null : frame.getPose(xr.sidro.anchorSpace, ref);
    if (ap) { sidroSad.fromArray(ap.transform.matrix); if (!xr.imaPozu) { sidroInv0.copy(sidroSad).invert(); xr.imaPozu = true; } korijenXR(); xr.izgubljeno = 0; }
    else if (xr.imaPozu && ++xr.izgubljeno > 45) presidri();      // oko 0,75 s bez sidra
  }
  if (++xr.okvir % 15 === 0) {
    const vp = frame.getViewerPose(ref);
    stanjeSidra(vp && vp.emulatedPosition ? 'Praćenje kamere je slabo: polako pomiči mobitel i osvijetli prostor.'
      : xr.sidroStanje === 'da' ? 'Sidro: aktivno' + (xr.presidreno ? ' (obnovljeno ' + xr.presidreno + '×)' : '') + (xr.izgubljeno ? ', traži plohu…' : '') + ' · ' + XR_INACICA
      : xr.sidroStanje === 'ne' ? 'Sidro: preglednik ga ne podržava · ' + XR_INACICA : 'Sidro: postavljam… · ' + XR_INACICA);
  }
}
let zadnje = 0;
renderer.setAnimationLoop((t, frame) => {
  const dt = zadnje ? Math.min(0.05, (t - zadnje) / 1000) : 0; zadnje = t;
  if (qPrijelaz) {
    qPrijelaz.t += dt; const u = Math.min(1, qPrijelaz.t / qPrijelaz.dur), w = u * u * (3 - 2 * u);
    postavi(qPrijelaz.od.map((v, k) => v + (qPrijelaz.do[k] - v) * w));
    if (u >= 1) { qPrijelaz = null; }
  } else if (prog.aktivan) korakPrograma(dt);
  if (frame && xr && !xr.postavljen && xr.izvor) {
    const r = frame.getHitTestResults(xr.izvor);
    const p = r.length ? r[0].getPose(renderer.xr.getReferenceSpace()) : null;
    if (p) { krug.visible = true; krug.matrix.fromArray(p.transform.matrix); uputa.textContent = 'Dodirni krug da postaviš stol s robotom i podlogom.'; } else krug.visible = false;
  }
  if (frame && xr && xr.postavljen) xrKorak(frame, renderer.xr.getReferenceSpace());
  if (xr) $('xr-napredak').textContent = $('napredak-txt').textContent;
  sunce.position.set(korijen.position.x + 1.2, korijen.position.y + 2.4, korijen.position.z + 1.4); sunce.target.position.copy(korijen.position);
  if (!renderer.xr.isPresenting) upr.update();
  renderer.render(scena, kamera);
});
scena.add(sunce.target);
window.FTQ_ISPIS = window.FTQ_CRT = { korijenXR, xrKorak, get xrStanje() { return xr; }, sidroP0, sidroSad, sidroInv0, korijen, set xrTest(v) { xr = v; }, K, P, R, PL, ploca, prog, postavi, racunajKartu, pripremi, stanjeTocke, get q() { return q; } };