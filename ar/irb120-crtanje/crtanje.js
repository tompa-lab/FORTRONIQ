// crtanje.js — IRB 120 s Robo Xmas prihvatnicom crta flomasterom po whiteboard ploči
// Moduli: kinematika.js (FK/IK), putanje.js (znak, tekst, slika, DXF). Podaci: window.FTQ_ALATI,
// window.FTQ_FONT, window.FTQ_ZNAK, window.FTQ_PRIMJER_DXF.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as K from './kinematika.js';
import * as P from './putanje.js';

const $ = id => document.getElementById(id);
const AL = window.FTQ_ALATI;
const ALAT = {
  flomaster: K.alatIz(AL.tcp.flomaster.p, AL.tcp.flomaster.R),
  prsti: K.alatIz(AL.tcp.prsti.p, AL.tcp.prsti.R),
};
function alatSisaljka(Lm) {
  const s = AL.sisaljka, d = s.smjer, L = Lm + s.meh;
  const p = [s.poc[0] + d[0] * L, s.poc[1] + d[1] * L, s.poc[2] + d[2] * L];
  // z = smjer kraka, x = okomito
  const z = K.unit(d), x0 = Math.abs(z[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const x = K.unit(K.sub(x0, K.mul(z, K.dot(x0, z)))), y = K.cross(z, x);
  return { p, R: [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]] };
}
const g3 = (p) => new THREE.Vector3(p[0], p[2], -p[1]);        // baza (Z gore) -> scena (Y gore)

// ---------------- scena ----------------
const kut = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
kut.insertBefore(renderer.domElement, kut.firstChild);
const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
kamera.position.set(1.35, 1.05, 1.25);
const upr = new OrbitControls(kamera, renderer.domElement);
upr.target.set(0.3, 0.3, 0); upr.enableDamping = true; upr.minDistance = 0.3; upr.maxDistance = 5;
upr.maxPolarAngle = Math.PI * 0.495;
scena.add(new THREE.HemisphereLight(0xffffff, 0x8899a0, 1.5));
const sunce = new THREE.DirectionalLight(0xffffff, 2.0);
sunce.position.set(1.2, 2.4, 1.4); sunce.castShadow = true; sunce.shadow.mapSize.set(2048, 2048);
Object.assign(sunce.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 6 });
scena.add(sunce);
const dop = new THREE.DirectionalLight(0xffffff, 0.6); dop.position.set(-1.5, 1, -1); scena.add(dop);
const pod = new THREE.Mesh(new THREE.CircleGeometry(2.2, 72), new THREE.ShadowMaterial({ opacity: 0.16 }));
pod.rotation.x = -Math.PI / 2; pod.receiveShadow = true;
const korijen = new THREE.Group(); scena.add(korijen); korijen.add(pod);   // sjena ide s robotom (u AR-u na stol)         // robot, plo\u010da i dio — u AR-u se postavlja kao cjelina
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

// ---------------- ploča ----------------
const PL = { w: 500, h: 400, t: 18, r: 420, fi: 0, psi: 0, hd: 150, alfa: 0, hg: 550, nacinNagiba: 'kut' };
const ploca = { grupa: new THREE.Group(), U: null, V: null, Nn: null, R0: null };
korijen.add(ploca.grupa);
const matPloca = new THREE.MeshStandardMaterial({ color: 0xfbfbfa, roughness: 0.35, metalness: 0.0 });
const matOkvir = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.35, metalness: 0.6 });
const matNoga = new THREE.MeshStandardMaterial({ color: 0x6b737b, roughness: 0.5, metalness: 0.4 });
let tinta = null, plan = null, karta = null, podloga = null;          // { cv, cx, tex, s }
function platno(wmm, hmm, gustoca) {
  const s = Math.min(gustoca, 2048 / Math.max(wmm, hmm));
  const cv = document.createElement('canvas'); cv.width = Math.round(wmm * s); cv.height = Math.round(hmm * s);
  const cx = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { cv, cx, tex, s, w: wmm, h: hmm };
}
function uPlatno(pl, u, v) { return [(u + pl.w / 2) * pl.s, (pl.h / 2 - v) * pl.s]; }

function okvirPloce() {           // KS ploče u bazi (m): R0 = sredina donjeg ruba na plohi za pisanje
  const r = PL.r / 1000, fi = PL.fi * Math.PI / 180, psi = PL.psi * Math.PI / 180;
  let alfa = PL.alfa;
  if (PL.nacinNagiba === 'visina') {
    const c = Math.max(-1, Math.min(1, (PL.hg - PL.hd) / PL.h)); alfa = Math.acos(c) * 180 / Math.PI;
  }
  const a = alfa * Math.PI / 180;
  const R0 = [r * Math.cos(fi), r * Math.sin(fi), PL.hd / 1000];
  const n0 = [-Math.cos(fi + psi), -Math.sin(fi + psi), 0];
  const U = K.unit(K.cross(K.mul(n0, -1), [0, 0, 1]));
  const V = K.add(K.mul([0, 0, 1], Math.cos(a)), K.mul(n0, -Math.sin(a)));
  const Nn = K.cross(U, V);
  return { R0, U, V, Nn, alfa };
}
function tockaNaPloci(o, u, vc, w = 0) {   // u, vc od središta ploče (mm), w uzduž normale (mm)
  const v = vc + PL.h / 2;
  return K.add(K.add(K.add(o.R0, K.mul(o.U, u / 1000)), K.mul(o.V, v / 1000)), K.mul(o.Nn, w / 1000));
}
function gradiPlocu() {
  const o = okvirPloce(); Object.assign(ploca, o);
  const G = ploca.grupa; while (G.children.length) { const c = G.children.pop(); c.geometry && c.geometry.dispose(); }
  const W = PL.w / 1000, H = PL.h / 1000, T = PL.t / 1000;
  // KS grupe: x = U, y = V, z = N (u sceni), ishodište = središte plohe za pisanje
  const C = tockaNaPloci(o, 0, 0);
  const m = new THREE.Matrix4().makeBasis(g3(o.U), g3(o.V), g3(o.Nn)); m.setPosition(g3(C));
  G.matrixAutoUpdate = false; G.matrix.copy(m); G.matrixWorldNeedsUpdate = true;
  const tijelo = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), matPloca); tijelo.position.z = -T / 2;
  tijelo.castShadow = tijelo.receiveShadow = true; G.add(tijelo);
  const ok = 0.014;
  [[W + 2 * ok, ok, 0, H / 2 + ok / 2], [W + 2 * ok, ok, 0, -H / 2 - ok / 2], [ok, H, -W / 2 - ok / 2, 0], [ok, H, W / 2 + ok / 2, 0]].forEach(([a, b, x, y]) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(a, b, T + 0.006), matOkvir); r.position.set(x, y, -T / 2 + 0.002); r.castShadow = true; G.add(r);
  });
  // slojevi: plan putanje, tinta, karta dosega
  [plan, tinta, karta].forEach(pl => pl && pl.tex.dispose());
  [podloga].forEach(pl => pl && pl.tex.dispose());
  podloga = platno(PL.w, PL.h, 2);
  plan = platno(PL.w, PL.h, 2); tinta = platno(PL.w, PL.h, 2.5); karta = platno(PL.w, PL.h, 1);
  [[podloga, 0.0002], [plan, 0.0004], [tinta, 0.0006], [karta, 0.0008]].forEach(([pl, dz]) => {
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: pl.tex, transparent: true, depthWrite: false }));
    mm.position.z = dz; G.add(mm); pl.mesh = mm;
  });
  karta.mesh.visible = $('karta-dosega').checked;
  primijeniPrikaz();
  // noge stalka: od donjih kutova okomito na pod
  for (const s of [-1, 1]) {
    const p = tockaNaPloci(o, s * (PL.w / 2 - 30), -PL.h / 2 + 10, -PL.t / 2);
    if (p[2] > 0.01) {
      const L = p[2];
      const noga = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, L, 16), matNoga);
      noga.matrixAutoUpdate = false;
      const svijet = new THREE.Matrix4().makeTranslation(p[0], L / 2, -p[1]);
      noga.matrix.copy(new THREE.Matrix4().copy(m).invert().multiply(svijet)); noga.castShadow = true; G.add(noga);
      const stopa = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.32), matNoga);
      stopa.matrixAutoUpdate = false;
      const ang = Math.atan2(o.Nn[1], o.Nn[0]);
      const sm = new THREE.Matrix4().makeRotationY(ang).setPosition(p[0], 0.006, -p[1]);
      stopa.matrix.copy(new THREE.Matrix4().copy(m).invert().multiply(sm)); stopa.receiveShadow = true; G.add(stopa);
    }
  }
  // ispis izračunatih veličina
  const Cc = K.add(C, K.mul(o.Nn, -PL.t / 2000));
  const hg = PL.hd + PL.h * Math.cos(o.alfa * Math.PI / 180);
  $('pl-info').innerHTML = 'Težište ploče: x = ' + mm(Cc[0]) + ', y = ' + mm(Cc[1]) + ', z = ' + mm(Cc[2]) + ' mm<br>' +
    'Gornji rub na visini ' + Math.round(hg) + ' mm · nagib ' + o.alfa.toFixed(1) + '° od okomice<br>' +
    'Sredina donjeg ruba: ' + Math.round(PL.r * Math.cos(PL.fi * Math.PI / 180)) + ' mm ispred i ' + Math.round(PL.r * Math.sin(PL.fi * Math.PI / 180)) + ' mm lijevo od osi robota';
  if (PL.nacinNagiba === 'visina') { $('pl-alfa').value = o.alfa.toFixed(1); }
}
let srediste = [0, 0], velCrt = 300;
function pogled(vrsta) {
  if (vrsta === 'crtez') {
    const C = tockaNaPloci(ploca, srediste[0], srediste[1]);
    const d = K.unit(K.add(K.add(K.mul(ploca.Nn, 0.85), K.mul(ploca.U, -0.35)), K.mul(ploca.V, -0.35)));
    const dist = Math.max(0.25, velCrt / 1000 * 2.2);
    kamera.position.copy(g3(K.add(C, K.mul(d, dist)))); upr.target.copy(g3(C)); upr.update(); return;
  }
  const C = tockaNaPloci(ploca, 0, 0);
  let d;
  if (vrsta === 'ploca') d = K.add(K.mul(ploca.Nn, 0.78), K.mul(ploca.U, -0.62));
  else if (vrsta === 'odozgo') d = [0.05, -0.05, 1];
  else d = K.add(K.mul(ploca.Nn, -0.2), K.mul(ploca.U, 1));
  d = K.unit(d);
  const dist = Math.max(1.55, Math.max(PL.w, PL.h) / 1000 * 2.9);
  const cam = K.add(C, K.add(K.mul(d, dist), [0, 0, vrsta === 'odozgo' ? 0.4 : 0.25]));
  const tgt = K.mul(K.add(C, [C[0] * -0.35, C[1] * -0.35, 0]), 1);
  kamera.position.copy(g3(cam)); upr.target.copy(g3(tgt)); upr.update();
}
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
const mm = v => Math.round(v * 1000);

// ---------------- prikaz: prozirnost slojeva, boja ploce ----------------
function primijeniPrikaz() {
  const v = id => (+$(id).value) / 100;
  const set = (pl, a) => { if (pl && pl.mesh) { pl.mesh.material.opacity = a; pl.mesh.visible = a > 0.001 && (pl !== karta || $('karta-dosega').checked); } };
  set(podloga, v('pr-slika')); set(plan, v('pr-plan')); set(tinta, v('pr-tinta')); set(karta, v('pr-karta'));
  if (modelMesh) { modelMesh.material.opacity = v('pr-model'); modelMesh.visible = v('pr-model') > 0.001; modelMesh.material.depthWrite = v('pr-model') > 0.95; }
  matPloca.color.set($('pr-ploca').value);
  document.querySelectorAll('[data-pr]').forEach(o => { o.textContent = $(o.dataset.pr).value + ' %'; });
}
['pr-slika', 'pr-plan', 'pr-tinta', 'pr-karta', 'pr-model', 'pr-ploca'].forEach(id => $(id).addEventListener('input', primijeniPrikaz));
$('pr-ploca-izbor').addEventListener('change', () => { $('pr-ploca').value = $('pr-ploca-izbor').value; primijeniPrikaz(); });
// slika bez svijetle pozadine (svijetlo -> prozirno), da se vidi na svakoj boji ploce
let slikaPoz = null, slikaPozIzvor = null;
function slikaBezPozadine() {
  if (slikaPoz && slikaPozIzvor === slikaImg) return slikaPoz;
  const m = 900, k = Math.min(1, m / Math.max(slikaImg.width, slikaImg.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(slikaImg.width * k); cv.height = Math.round(slikaImg.height * k);
  const cx = cv.getContext('2d'); cx.drawImage(slikaImg, 0, 0, cv.width, cv.height);
  const d = cx.getImageData(0, 0, cv.width, cv.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const y = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]; a[i + 3] = Math.round(a[i + 3] * Math.min(1, (255 - y) / 160)); }
  cx.putImageData(d, 0, 0); slikaPoz = cv; slikaPozIzvor = slikaImg; return cv;
}
// slika u pozadini crteza (samo za izvor Slika): isto mjerilo, pomak i zakret kao potezi
function crtajPodlogu(pl) {
  if (!podloga) return;
  const cx = podloga.cx; cx.clearRect(0, 0, podloga.cv.width, podloga.cv.height);
  if (izvor() === 'slika' && slikaImg && slikaMreza && pl && pl.transf) {
    const w = slikaMreza.w, h = slikaMreza.h, c0 = pl.transf([w / 2, h / 2]), k = pl.mjerilo, rot = (+$('zakret-crteza').value || 0) * Math.PI / 180;
    const [x, y] = uPlatno(podloga, c0[0], c0[1]);
    cx.save(); cx.translate(x, y); cx.rotate(-rot);
    cx.drawImage(slikaBezPozadine(), -w * k * podloga.s / 2, -h * k * podloga.s / 2, w * k * podloga.s, h * k * podloga.s); cx.restore();
  }
  podloga.tex.needsUpdate = true;
}

// ---------------- karta dosega ----------------
const STANJE = { OK: 0, DOSEG: 1, SUDAR: 2 };
function provjeriSudar(rez, o) {
  const tocke = [rez.ish[2], rez.ish[3], rez.ish[4], rez.j6.p,
    K.mul(K.add(rez.ish[1], rez.ish[2]), 0.5), K.mul(K.add(rez.ish[2], rez.ish[4]), 0.5)];
  for (const k in AL.tocke_kolizije) tocke.push(K.tockaUj6(rez, AL.tocke_kolizije[k]));
  for (const p of tocke) {
    if (p[2] < -0.005) return true;                               // ispod plohe na kojoj stoji robot
    const d = K.sub(p, ploca.R0), w = K.dot(d, ploca.Nn), u = K.dot(d, ploca.U), v = K.dot(d, ploca.V);
    if (w < 0.004 && w > -(PL.t / 1000 + 0.03) && Math.abs(u) < PL.w / 2000 + 0.02 && v > -0.02 && v < PL.h / 1000 + 0.02) return true;
  }
  return false;
}
function stanjeTocke(u, vc, q0, alat = ALAT.flomaster) {
  const p = tockaNaPloci(ploca, u, vc), z = K.mul(ploca.Nn, -1);
  let r = q0 ? K.ik({ p, z }, q0, alat, { iter: 40 }) : null;
  if (!r || !r.ok) r = K.ikSiroko({ p, z }, alat, q0);
  if (!r || !r.ok) return { s: STANJE.DOSEG, q: q0 };
  const rez = K.fk(r.q, alat);
  if (provjeriSudar(rez, ploca)) {
    // pokušaj s drugim zakretom zgloba
    return { s: STANJE.SUDAR, q: r.q };
  }
  return { s: STANJE.OK, q: r.q };
}
let kartaPodaci = null;
function racunajKartu() {
  const nu = Math.max(8, Math.min(26, Math.round(PL.w / 22))), nv = Math.max(6, Math.min(20, Math.round(PL.h / 22)));
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
  $('karta-info').innerHTML = '<b>Radni prostor:</b> ' + Math.round(100 * ok / n) + ' % ploče &middot; <b>kolizijski prostor:</b> ' +
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
  omotac.visible = $('omotac').checked; korijen.add(omotac);
  $('omotac-info').textContent = 'Najveći doseg središta zgloba 5: ' + Math.round(rmax * 1000 + 0) + ' mm od osi 2 (ABB: doseg 580 mm). Raspon visine: ' +
    Math.round(zmin * 1000) + ' do ' + Math.round(zmax * 1000) + ' mm.';
}

// ---------------- izvori crteža ----------------
let crtez = null;            // { slojevi:[{ime,potezi,vrsta,debljina}], potezi, jedinica_mm, ime }
let slikaMreza = null;
function izvor() { return document.querySelector('input[name="izvor"]:checked').value; }
function znakSlojevi() {
  const Z = window.FTQ_ZNAK;
  return { ime: 'ForTroniQ znak', jedinica_mm: Z.mm_po_jedinici, potezi: Z.potezi,
    slojevi: Z.slojevi.map(s => ({ ime: s.ime, potezi: Z.potezi.slice(s.od, s.do), vrsta: '01', debljina: s.debljina })) };
}
function ucitajCrtez() {
  const iz = izvor();
  document.querySelectorAll('[data-izvor]').forEach(el => el.hidden = el.dataset.izvor !== iz);
  if (iz === 'znak') crtez = znakSlojevi();
  else if (iz === 'tekst') { crtez = P.tekstOkvir($('tekst').value || ' ', window.FTQ_FONTOVI, opcTeksta()); pregledTeksta(crtez); }
  else if (iz === 'slika') { crtez = slikaMreza ? P.mrezaUPoteze(slikaMreza, { nacin: $('slika-nacin').value, korak_px: korakSrafure() }) : null; if (crtez) crtez.datoteka = slikaImg._ime; }
  else if (iz === 'dxf') crtez = dxfCrtez;
  else if (iz === 'model') crtez = modelCrtez();
  const jeModel = iz === 'model';
  $('stvarno').disabled = jeModel; if (jeModel) $('stvarno').checked = true;
  $('velicina').disabled = $('stvarno').checked;
  gradiSlojeve();
  obrisiPlocu();
  pripremi();
}
// ---------------- slojevi (boja, vrsta i debljina crte po ISO 128) ----------------
const BOJE = [['crni', '#1E1E1E'], ['plavi', '#1D4FA3'], ['crveni', '#C8202A'], ['zeleni', '#1E7B3A'], ['narančasti', '#E07B1A'], ['ljubičasti', '#6B3FA0'], ['smeđi', '#7A4B2A']];
const ACI = { 1: '#C8202A', 2: '#E07B1A', 3: '#1E7B3A', 4: '#1D4FA3', 5: '#1D4FA3', 6: '#6B3FA0', 7: '#1E1E1E' };
const slojStanje = {};          // ime sloja -> { crtaj, boja, vrsta, debljina }
const DEBLJINE = [['debela', 'debela (skupina)'], ['tanka', 'tanka (skupina)'], ['vrlo debela', 'vrlo debela (skupina)'],
  ['0.25', '0,25 mm ISO'], ['0.35', '0,35 mm ISO'], ['0.5', '0,5 mm ISO'], ['0.7', '0,7 mm ISO'], ['1', '1 mm ISO / fini flomaster'], ['1.4', '1,4 mm ISO'], ['2', '2 mm ISO / okrugli vrh'],
  ['2.5', '2,5 mm flomaster (Maxx 290)'], ['3', '3 mm flomaster'], ['4', '4 mm kosi vrh'], ['5', '5 mm kosi vrh']];
function debljinaMm(deb) { if (!isNaN(parseFloat(deb))) return parseFloat(deb); const D = +$('skupina').value; return deb === 'tanka' ? D / 2 : deb === 'vrlo debela' ? D * 2 : D; }
function gradiSlojeve() {
  const tb = $('slojevi'); tb.innerHTML = '';
  if (!crtez || !crtez.slojevi) return;
  crtez.slojevi.forEach((s, i) => {
    const kljuc = (crtez.ime || '') + '|' + s.ime;
    if (!slojStanje[kljuc]) slojStanje[kljuc] = { crtaj: true, boja: s.aci && ACI[s.aci] ? ACI[s.aci] : BOJE[[0, 1, 2, 3, 4, 5, 6][i % 7]][1], vrsta: s.vrsta || '01', debljina: s.debljina || 'debela' };
    const st = slojStanje[kljuc]; s.stanje = st;
    const tr = document.createElement('tr');

    const vrste = Object.entries(P.VRSTE_CRTA).map(([k, v]) => '<option value="' + k + '"' + (k === st.vrsta ? ' selected' : '') + '>' + k + ' ' + v.ime + '</option>').join('');
    const deb = DEBLJINE.map(([v, t]) => '<option value="' + v + '"' + (v === st.debljina ? ' selected' : '') + '>' + t + '</option>').join('');
    tr.innerHTML = '<td><input type="checkbox"' + (st.crtaj ? ' checked' : '') + ' aria-label="Crtaj sloj"></td><td><span class="kvadrat" style="background:' + st.boja + '"></span>' + s.ime + ' <small>(' + s.potezi.length + ')</small></td>' +
      '<td><input type="color" value="' + st.boja + '" aria-label="Boja flomastera"></td><td><select aria-label="Vrsta crte">' + vrste + '</select></td><td><select aria-label="Debljina">' + deb + '</select></td>';
    const [cb, sb, sv, sd] = tr.querySelectorAll('input,select');
    cb.addEventListener('change', () => { st.crtaj = cb.checked; pripremi(); });
    sb.addEventListener('input', () => { st.boja = sb.value; tr.querySelector('.kvadrat').style.background = sb.value; pripremi(); });
    sv.addEventListener('change', () => { st.vrsta = sv.value; pripremi(); });
    sd.addEventListener('change', () => { st.debljina = sd.value; if (izvor() === 'slika') ucitajCrtez(); else pripremi(); });
    tb.appendChild(tr);
  });
}
function korakSrafure() {             // razmak šrafure = debljina tanke crte, preveden u piksele slike
  if (!slikaMreza) return 2;
  const ef = Math.min((PL.w - 60) / slikaMreza.w, (PL.h - 60) / slikaMreza.h) * (+$('velicina').value / 100);
  const st = slojStanje['Slika|Šrafura'];
  return Math.max(1, (debljinaMm(st ? st.debljina : 'tanka') * 0.9) / ef);
}
let slikaImg = null;
$('slika-dat').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image(); img.onload = () => { slikaImg = img; slikaImg._ime = f.name; obradiSliku(); }; img.src = URL.createObjectURL(f);
});
function obradiSliku() {
  if (!slikaImg) return;
  const pr = $('slika-auto').checked ? 'auto' : +$('slika-prag').value;
  slikaMreza = P.slikaUMrezu(slikaImg, { prag: pr, obrni: $('slika-obrni').checked, maks: 360 });
  if ($('slika-auto').checked) $('slika-prag').value = slikaMreza.prag;
  $('slika-prag-out').textContent = slikaMreza.prag;
  const pv = $('slika-pregled'), cx = pv.getContext('2d'); pv.width = slikaMreza.w; pv.height = slikaMreza.h;
  const id = cx.createImageData(slikaMreza.w, slikaMreza.h);
  for (let i = 0; i < slikaMreza.m.length; i++) { const v = slikaMreza.m[i] ? 20 : 250; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  cx.putImageData(id, 0, 0); pv.hidden = false;
  ucitajCrtez();
}
['slika-nacin', 'slika-obrni', 'slika-auto'].forEach(id => $(id).addEventListener('change', obradiSliku));
$('slika-prag').addEventListener('input', () => { $('slika-auto').checked = false; obradiSliku(); });
let dxfCrtez = null;
function ucitajDxf(tekstDat, ime) {
  try {
    dxfCrtez = P.dxf(tekstDat); dxfCrtez.datoteka = ime;
    const b = P.okvir(dxfCrtez.potezi), k = dxfCrtez.jedinica_mm;
    $('dxf-info').textContent = ime + ': ' + dxfCrtez.potezi.length + ' poteza u ' + dxfCrtez.slojevi.length + mnozina(dxfCrtez.slojevi.length, ' sloju, ', ' sloja, ', ' slojeva, ') + Math.round((b[2] - b[0]) * k) + ' × ' + Math.round((b[3] - b[1]) * k) + ' mm' +
      (dxfCrtez.upozorenja.length ? '. Preskočeno: ' + dxfCrtez.upozorenja.join(', ') + ' (pretvori tekst i šrafure u linije).' : '.');
  } catch (e) { dxfCrtez = null; $('dxf-info').textContent = 'DXF se nije mogao pročitati: ' + e.message; }
  ucitajCrtez();
}
$('dxf-dat').addEventListener('change', e => { const f = e.target.files[0]; if (f) f.text().then(t => ucitajDxf(t, f.name)); });
$('dxf-primjer').addEventListener('click', () => ucitajDxf(window.FTQ_PRIMJER_DXF, 'primjer_ploca.dxf'));
// ---------------- 3D model na ploči ----------------
let modelTri = null, modelIme = '', modelMesh = null;
function ucitajModelDat(buf, ime) {
  try { modelTri = P.citajModel(buf, ime); modelIme = ime; $('model-info').textContent = ime + ': ' + (modelTri.length / 9) + ' trokuta.'; }
  catch (e) { modelTri = null; $('model-info').textContent = 'Model se nije mogao pročitati: ' + e.message; }
  ucitajCrtez();
}
$('model-dat').addEventListener('change', e => { const f = e.target.files[0]; if (f) f.arrayBuffer().then(b => ucitajModelDat(b, f.name)); });
$('model-primjer').addEventListener('click', () => {
  const bin = Uint8Array.from(atob(window.FTQ_PRIMJER_STL), c => c.charCodeAt(0)); ucitajModelDat(bin.buffer, 'primjer_nosac.stl');
});
['model-os', 'model-jed', 'model-razmak'].forEach(id => $(id).addEventListener('change', ucitajCrtez));
function modelCrtez() {
  if (!modelTri) return null;
  const M = P.pripremiModel(modelTri, { os: $('model-os').value, mm: +$('model-jed').value });
  const c = P.modelUPoteze(M, { razmak: +$('model-razmak').value, ime: modelIme });
  c.datoteka = modelIme;
  $('model-info').textContent = modelIme + ': ' + (modelTri.length / 9) + ' trokuta, ' + Math.round(M.w) + ' × ' + Math.round(M.h) + ' × ' + Math.round(M.visina) + ' mm.' + (Math.abs(okvirPloce().alfa - 90) > 20 ? ' Savjet: za komad koji leži na ploči postavi nagib 90° (vodoravna ploča).' : '');
  return c;
}
function postaviModelNaPlocu(pl) {
  if (modelMesh && modelMesh.parent) modelMesh.parent.remove(modelMesh);
  modelMesh = null;
  if (!crtez || !crtez.model) return;
  const M = crtez.model, T = pl.transf, n = M.P.length / 3, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const q = T([M.P[i * 3], M.P[i * 3 + 1], M.P[i * 3 + 2]]); pos[i * 3] = q[0] / 1000; pos[i * 3 + 1] = q[1] / 1000; pos[i * 3 + 2] = q[2] / 1000 + 0.0002; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals();
  modelMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9aa4ad, roughness: 0.45, metalness: 0.5, flatShading: true, transparent: true }));
  primijeniPrikaz();
  modelMesh.castShadow = modelMesh.receiveShadow = true; ploca.grupa.add(modelMesh);
}
document.querySelectorAll('input[name="izvor"]').forEach(r => r.addEventListener('change', ucitajCrtez));
let tTekst = 0;
// ---------------- alat Tekst: font, B/I/U, poravnanje, okvir (kao u Wordu, oblikovanje za cijeli tekst) ----------------
const TS = { deb: false, kurziv: false, podcrtano: false, poravnanje: 'lijevo' };
(function () {
  const sel = $('t-font');
  for (const k in window.FTQ_FONTOVI) { const o = document.createElement('option'); o.value = k; o.textContent = window.FTQ_FONTOVI[k].ime; sel.appendChild(o); }
})();
function opcTeksta() {
  return { font: $('t-font').value, deb: TS.deb, kurziv: TS.kurziv, podcrtano: TS.podcrtano, poravnanje: TS.poravnanje,
    visina: +$('tekst-h').value || 30, prored: +$('t-prored').value || 1.6, razmak: +$('t-razmak').value,
    sirina: +$('t-sirina').value || 0, visinaOkvira: +$('t-visina').value || 0, margina: +$('t-margina').value || 0,
    okvir: $('t-okvir').checked, prilagodi: $('t-prilagodi').checked };
}
function osvjeziGumbe() {
  $('t-b').setAttribute('aria-pressed', TS.deb); $('t-i').setAttribute('aria-pressed', TS.kurziv); $('t-u').setAttribute('aria-pressed', TS.podcrtano);
  document.querySelectorAll('[data-por]').forEach(b => b.setAttribute('aria-pressed', b.dataset.por === TS.poravnanje));
}
function promjenaTeksta(odmah) { clearTimeout(tTekst); tTekst = setTimeout(ucitajCrtez, odmah ? 0 : 300); }
$('t-b').addEventListener('click', () => { TS.deb = !TS.deb; osvjeziGumbe(); promjenaTeksta(true); });
$('t-i').addEventListener('click', () => { TS.kurziv = !TS.kurziv; osvjeziGumbe(); promjenaTeksta(true); });
$('t-u').addEventListener('click', () => { TS.podcrtano = !TS.podcrtano; osvjeziGumbe(); promjenaTeksta(true); });
document.querySelectorAll('[data-por]').forEach(b => b.addEventListener('click', () => { TS.poravnanje = b.dataset.por; osvjeziGumbe(); promjenaTeksta(true); }));
$('tekst').addEventListener('keydown', e => {          // prečaci kao u Wordu
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase(), por = { l: 'lijevo', e: 'sredina', r: 'desno', j: 'obostrano' }[k];
  if (k === 'b') TS.deb = !TS.deb; else if (k === 'i') TS.kurziv = !TS.kurziv; else if (k === 'u') TS.podcrtano = !TS.podcrtano;
  else if (por) TS.poravnanje = por; else return;
  e.preventDefault(); osvjeziGumbe(); promjenaTeksta(true);
});
['tekst', 'tekst-h', 't-razmak', 't-sirina', 't-visina', 't-margina'].forEach(id => $(id).addEventListener('input', () => promjenaTeksta()));
['t-font', 't-prored', 't-okvir', 't-prilagodi'].forEach(id => $(id).addEventListener('change', () => promjenaTeksta(true)));
$('t-razmak').addEventListener('input', () => { $('t-razmak-out').textContent = (+$('t-razmak').value).toFixed(2); });
function pregledTeksta(c) {               // pregled jednopoteznog teksta ispod polja za upis
  const sv = $('t-pregled'); if (!c || !c.potezi.length) { sv.innerHTML = ''; return; }
  const b = P.okvir(c.potezi), w = Math.max(1, b[2] - b[0]), h = Math.max(1, b[3] - b[1]), m = Math.max(w, h) * 0.03;
  sv.setAttribute('viewBox', (b[0] - m) + ' ' + (-b[3] - m) + ' ' + (w + 2 * m) + ' ' + (h + 2 * m));
  const sw = Math.max(w, h) / 260;
  sv.innerHTML = c.slojevi.map(s => '<g stroke-width="' + (s.ime === 'Tekst' ? sw : sw * 0.7) + '">' + s.potezi.map(p => '<polyline points="' + p.map(([x, y]) => x.toFixed(2) + ',' + (-y).toFixed(2)).join(' ') + '"/>').join('') + '</g>').join('');
  $('t-info').textContent = c.redova + (c.redova === 1 ? ' red' : c.redova < 5 ? ' reda' : ' redova') + ', visina slova ' + c.visinaSlova.toFixed(1) + ' mm' + ($('t-prilagodi').checked ? ' (prilagođeno okviru)' : '') + ', blok ' + Math.round(w) + ' × ' + Math.round(h) + ' mm.';
}
osvjeziGumbe();
let tekstPrviPut = true;
document.querySelector('input[name="izvor"][value="tekst"]').addEventListener('change', () => {
  if (tekstPrviPut) { tekstPrviPut = false; $('stvarno').checked = true; $('velicina').disabled = true; }
});
['pomak-x', 'pomak-y', 'zakret-crteza'].forEach(id => $(id).addEventListener('change', pripremi));
$('skupina').addEventListener('change', () => { if (izvor() === 'slika') ucitajCrtez(); else pripremi(); });

// ---------------- program crtanja ----------------
const prog = { P: null, D: null, T: null, Q: null, OK: null, n: 0, t: 0, aktivan: false, iTinta: 0, gotovo: false };
const DIZANJE = 15;                  // mm iznad ploče (ili iznad najviše točke dijela) za prijelaze
let tinta3d = null;                  // crte na 3D dijelu
function pripremi() {
  stani(); prog.n = 0; prog.t = 0; prog.iTinta = 0; prog.gotovo = false;
  const cx = plan.cx; cx.clearRect(0, 0, plan.cv.width, plan.cv.height); plan.tex.needsUpdate = true;
  $('crtaj').disabled = true; obrisi3d();
  if (!crtez || !crtez.potezi || !crtez.potezi.length) { $('prog-info').textContent = 'Odaberi ili učitaj crtež.'; prikaziGkod([]); postaviModelNaPlocu(null); crtajPodlogu(null); return; }
  const stvarno = $('stvarno').checked && crtez.jedinica_mm;
  const pl = P.naPlocu(crtez, { w: PL.w, h: PL.h }, { velicina: +$('velicina').value, stvarno, rub: 30, dx: +$('pomak-x').value || 0, dy: +$('pomak-y').value || 0, zakret: +$('zakret-crteza').value || 0 });
  postaviModelNaPlocu(pl);
  crtajPodlogu(pl);
  // slojevi za crtanje, s crticama po ISO 128
  const slojevi = pl.slojevi.map((s, i) => ({ s, st: (crtez.slojevi[i] && crtez.slojevi[i].stanje) || { crtaj: true, boja: '#1E1E1E', vrsta: '01', debljina: 'debela' } }))
    .filter(x => x.st.crtaj && x.s.potezi.length)
    .map(x => { const d = debljinaMm(x.st.debljina); return { ime: x.s.ime, boja: x.st.boja, vrsta: x.st.vrsta, d, potezi: x.s.potezi.flatMap(p => P.crtkaj(p, x.st.vrsta, d)) }; });
  const svi = slojevi.flatMap(s => s.potezi);
  if (!svi.length) { $('prog-info').textContent = 'Nijedan sloj nije uključen.'; prikaziGkod([]); return; }
  // nul-točka crteža W: donji lijevi kut okvira crteža na ploči; X = U, Y = V, Z = normala ploče
  const ok = P.okvir(svi), u0 = ok[0], v0 = ok[1];
  srediste = [(ok[0] + ok[2]) / 2, (ok[1] + ok[3]) / 2]; velCrt = Math.max(ok[2] - ok[0], ok[3] - ok[1]);
  postaviKSCrteza(u0, v0);
  let wMax = 0; for (const s of svi) for (const p of s) wMax = Math.max(wMax, p[2] || 0);
  const ZS = DIZANJE + wMax;
  // uzorkovanje + G-kod (svaka točka putanje pamti svoj redak G-koda i sloj)
  const Pp = [], Dd = [], Lg = [], Sl = [], Pz = [];
  const korakC = 2, korakP = 6, v = +$('brzina').value;
  const G = [], f3 = x => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3);
  const gx = p => 'X' + f3(p[0] - u0) + ' Y' + f3(p[1] - v0) + (p.length > 2 ? ' Z' + f3(p[2]) : '');
  G.push('; ForTroniQ - ABB IRB 120, crtanje flomasterom (testna stranica v01)');
  G.push('; Izvor: ' + (crtez.ime || 'crtez') + (crtez.datoteka && crtez.datoteka !== crtez.ime ? ' (' + crtez.datoteka + ')' : ''));
  G.push('; Nul-tocka W: donji lijevi kut crteza na ploci; X udesno, Y prema gore po ploci, Z okomito od ploce');
  G.push('; Velicina: ' + (ok[2] - ok[0]).toFixed(1) + ' x ' + (ok[3] - ok[1]).toFixed(1) + ' mm, mjerilo ' + pl.mjerilo.toFixed(4) + '; skupina crta ' + $('skupina').selectedOptions[0].text);
  G.push('; Flomaster gore Z' + ZS.toFixed(3) + ', dolje Z = povrsina; posmak crtanja F' + Math.round(v * 60) + ' mm/min');
  slojevi.forEach((s, i) => G.push('; T' + (i + 1) + ' = sloj "' + s.ime + '", ' + nazivBoje(s.boja) + ', crta ' + s.vrsta + ' ' + P.VRSTE_CRTA[s.vrsta].ime + ', d = ' + s.d.toFixed(2) + ' mm'));
  G.push('G21 G90 G17'); G.push('G0 Z' + f3(ZS));
  function linija(a, b, wa, wb, dolje, korak, gl, sl) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], wb - wa), n = Math.max(1, Math.ceil(L / korak));
    for (let k = 1; k <= n; k++) { const t = k / n; Pp.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, wa + (wb - wa) * t]); Dd.push(dolje); Lg.push(gl); Sl.push(sl); Pz.push(0); }
  }
  let zad = null; const F = 'F' + Math.round(v * 60), w = p => p[2] || 0;
  slojevi.forEach((sl, si) => {
    G.push('; --- sloj ' + (si + 1) + ': ' + sl.ime);
    G.push('T' + (si + 1) + ' M6 ; ' + nazivBoje(sl.boja) + ' flomaster, d = ' + sl.d.toFixed(2) + ' mm');
    if (si > 0) G.push('M0 ; zamijeni flomaster');
    const zamjena = si > 0 && Pp.length;
    if (zamjena) { Pp.push(Pp[Pp.length - 1].slice()); Dd.push(0); Lg.push(G.length - 1); Sl.push(si); Pz.push(1.2); }   // stanka za promjenu flomastera
    for (const s of sl.potezi) {
      const p0 = s[0];
      G.push('G0 ' + 'X' + f3(p0[0] - u0) + ' Y' + f3(p0[1] - v0));
      if (!zad) { Pp.push([p0[0], p0[1], ZS]); Dd.push(0); Lg.push(G.length - 1); Sl.push(si); Pz.push(0); }
      else linija(zad, p0, ZS, ZS, 0, korakP, G.length - 1, si);
      G.push('G1 Z' + f3(w(p0)) + ' ' + F);
      linija(p0, p0, ZS, w(p0), 0, 3, G.length - 1, si);
      for (let k = 1; k < s.length; k++) { G.push('G1 ' + gx(s[k])); linija(s[k - 1], s[k], w(s[k - 1]), w(s[k]), 1, korakC, G.length - 1, si); }
      if (s.length === 1) { Pp.push([p0[0], p0[1], w(p0)]); Dd.push(1); Lg.push(G.length - 1); Sl.push(si); Pz.push(0); }
      G.push('G0 Z' + f3(ZS));
      const pk = s[s.length - 1]; linija(pk, pk, w(pk), ZS, 0, 3, G.length - 1, si);
      zad = [pk[0], pk[1]];
    }
  });
  G.push('G0 X0.000 Y0.000'); G.push('M2');
  prikaziGkod(G);
  // vrijeme
  const n = Pp.length;
  const T = new Float32Array(n); T[0] = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(Pp[i][0] - Pp[i - 1][0], Pp[i][1] - Pp[i - 1][1], Pp[i][2] - Pp[i - 1][2]);
    const vv = (Dd[i] || Pp[i][2] !== Pp[i - 1][2]) ? v : v * 2.5;
    T[i] = T[i - 1] + d / vv + Pz[i];
  }
  // IK za sve točke
  const Q = new Float32Array(n * 6), OK = new Uint8Array(n);
  let q0 = null, losih = 0, sudara = 0, zadnjiSiroki = -99;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const p = tockaNaPloci(ploca, Pp[i][0], Pp[i][1], Pp[i][2]), z = K.mul(ploca.Nn, -1);
    let r = q0 ? K.ik({ p, z }, q0, ALAT.flomaster, { iter: 30 }) : null;
    if ((!r || !r.ok) && (i - zadnjiSiroki > 15 || !q0)) { r = K.ikSiroko({ p, z }, ALAT.flomaster, q0); zadnjiSiroki = i; }
    let okk = r && r.ok;
    if (okk && (i % 4 === 0 || !q0) && provjeriSudar(K.fk(r.q, ALAT.flomaster), ploca)) { okk = false; sudara++; }
    if (okk) { q0 = r.q; } else losih++;
    const qq = okk ? r.q : (q0 || [0, 0, 0, 0, 0, 0]);
    for (let j = 0; j < 6; j++) Q[i * 6 + j] = qq[j];
    OK[i] = okk ? 1 : 0;
  }
  Object.assign(prog, { P: Pp, D: Dd, T, Q, OK, n, Lg, Sl, slojevi });
  // plan na ploči: tanko crtkano u boji sloja, nedohvatljivo crveno
  cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.lineWidth = Math.max(1, 0.5 * plan.s); cx.setLineDash([2.5 * plan.s, 2 * plan.s]);
  slojevi.forEach((sl, si) => {
    cx.strokeStyle = sl.boja; cx.globalAlpha = 0.4; cx.beginPath();
    for (let i = 1; i < n; i++) if (Dd[i] && Sl[i] === si && Pp[i - 1][2] <= wMax + 0.01 && Dd[i - 1] !== undefined) { const a = uPlatno(plan, Pp[i - 1][0], Pp[i - 1][1]), b = uPlatno(plan, Pp[i][0], Pp[i][1]); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); }
    cx.stroke();
  });
  cx.globalAlpha = 1; cx.setLineDash([]);
  cx.fillStyle = 'rgba(214,60,40,0.85)';
  for (let i = 0; i < n; i++) if (!OK[i] && Dd[i]) { const a = uPlatno(plan, Pp[i][0], Pp[i][1]); cx.fillRect(a[0] - 1.5, a[1] - 1.5, 3, 3); }
  plan.tex.needsUpdate = true;
  const Lc = svi.reduce((a, s) => a + P.duljina(s), 0);
  $('prog-info').innerHTML = '<b>' + (crtez.ime || 'Crtež') + '</b>: ' + Math.round(ok[2] - ok[0]) + ' × ' + Math.round(ok[3] - ok[1]) + ' mm' + (wMax > 0.01 ? ' × ' + Math.round(wMax) + ' mm visine' : '') + ', ' +
    slojevi.length + mnozina(slojevi.length, ' sloj, ', ' sloja, ', ' slojeva, ') + svi.length + ' poteza, ' + (Lc / 1000).toFixed(1) + ' m linije, oko ' + vrijeme(T[n - 1]) + ' pri ' + v + ' mm/s.' +
    (losih ? ' <span class="upoz">' + Math.round(100 * losih / n) + ' % putanje je u kolizijskom prostoru' + (sudara ? ' (sudar s pločom)' : '') + '; ondje se flomaster podiže.</span>' : ' Cijela putanja je u radnom prostoru.') +
    (pl.izvan ? ' <span class="upoz">Crtež izlazi izvan ploče.</span>' : '');
  $('crtaj').disabled = false; napredak();
  window.FTQ_PROG = { n, losih, sudara, trajanje: T[n - 1], ms: Math.round(performance.now() - t0), poteza: svi.length, slojeva: slojevi.length, wMax };
}
function mnozina(n, a, b, c) { const d = n % 10, s = n % 100; return d === 1 && s !== 11 ? a : (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? b : c; }
function nazivBoje(c) { const b = BOJE.find(x => x[1].toLowerCase() === String(c).toLowerCase()); return b ? b[0] : 'boja ' + c; }
function vrijeme(s) { s = Math.round(s); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + (s % 60) + ' s'; }
function napredak() {
  const T = prog.T; const uk = prog.n ? T[prog.n - 1] : 0;
  $('napredak').value = uk ? Math.min(1, prog.t / uk) : 0;
  let s = uk ? vrijeme(prog.t) + ' / ' + vrijeme(uk) : '';
  if (uk && prog.slojevi && prog.Sl) { const sl = prog.slojevi[prog.Sl[indeks(prog.t)]]; if (sl) s += ' · ' + sl.ime + ' (' + nazivBoje(sl.boja) + ')'; }
  $('napredak-txt').textContent = s;
}
function obrisi3d() { if (tinta3d) { tinta3d.forEach(o => { o.parent && o.parent.remove(o); o.geometry.dispose(); }); } tinta3d = []; }
function obrisiPlocu() { if (!tinta) return; tinta.cx.clearRect(0, 0, tinta.cv.width, tinta.cv.height); tinta.tex.needsUpdate = true; prog.iTinta = 0; obrisi3d(); }
let qPrijelaz = null, tPrijelaz = 0;
function stani() { prog.aktivan = false; $('crtaj').textContent = 'Crtaj'; $('crtaj').setAttribute('aria-pressed', 'false'); }
$('crtaj').addEventListener('click', () => {
  if (prog.aktivan) { stani(); return; }
  if (!prog.n) return;
  if (prog.gotovo || prog.t >= prog.T[prog.n - 1]) { prog.t = 0; prog.iTinta = 0; prog.gotovo = false; obrisiPlocu(); }
  const i0 = indeks(prog.t); const qc = Array.from(prog.Q.slice(i0 * 6, i0 * 6 + 6));
  qPrijelaz = { od: q.slice(), do: qc, t: 0, dur: Math.max(0.4, Math.max(...qc.map((v, j) => Math.abs(v - q[j]))) / 60) };
  prog.aktivan = true; $('crtaj').textContent = 'Pauza'; $('crtaj').setAttribute('aria-pressed', 'true');
});
$('obrisi').addEventListener('click', () => { obrisiPlocu(); prog.t = 0; prog.gotovo = false; napredak(); });
$('pocetni').addEventListener('click', () => { stani(); qPrijelaz = { od: q.slice(), do: [0, 0, 0, 0, 0, 0], t: 0, dur: 1.2, samo: true }; });
function indeks(t) { const T = prog.T; let lo = 0, hi = prog.n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T[m] <= t) lo = m; else hi = m - 1; } return lo; }
function crta3d(a, b, sl) {             // tinta na dijelu (iznad plohe ploče)
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0] / 1000, a[1] / 1000, a[2] / 1000 + 0.0006), new THREE.Vector3(b[0] / 1000, b[1] / 1000, b[2] / 1000 + 0.0006)]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: sl.boja })); ploca.grupa.add(l); tinta3d.push(l);
}
function korakPrograma(dt) {
  const T = prog.T, n = prog.n, uk = T[n - 1];
  prog.t = Math.min(uk, prog.t + dt * (+$('ubrzanje').value));
  const i = indeks(prog.t), j = Math.min(n - 1, i + 1);
  const a = T[j] > T[i] ? (prog.t - T[i]) / (T[j] - T[i]) : 0;
  const qq = []; for (let k = 0; k < 6; k++) qq.push(prog.Q[i * 6 + k] + (prog.Q[j * 6 + k] - prog.Q[i * 6 + k]) * a);
  postavi(qq);
  // tinta: završeni segmenti od zadnjeg crtanja (u boji i debljini sloja); na dijelu kao 3D crta
  const cx = tinta.cx; cx.lineCap = 'round'; cx.lineJoin = 'round';
  const Pp = prog.P, D = prog.D, OK = prog.OK, Sl = prog.Sl; let crtano = false;
  for (let k = Math.max(1, prog.iTinta); k <= i; k++) {
    if (!(D[k] && OK[k] && OK[k - 1])) continue;
    const sl = prog.slojevi[Sl[k]], a0 = Pp[k - 1], a1 = Pp[k];
    if ((a0[2] || 0) > 0.05 || (a1[2] || 0) > 0.05) { crta3d(a0, a1, sl); continue; }
    cx.strokeStyle = sl.boja; cx.lineWidth = Math.max(0.6, sl.d * tinta.s); cx.beginPath();
    const p0 = uPlatno(tinta, a0[0], a0[1]), p1 = uPlatno(tinta, a1[0], a1[1]); cx.moveTo(p0[0], p0[1]); cx.lineTo(p1[0], p1[1]); cx.stroke(); crtano = true;
  }
  if (crtano) tinta.tex.needsUpdate = true;
  prog.iTinta = i + 1 > prog.iTinta ? i + 1 : prog.iTinta;
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
  const g = new THREE.Group(); const L = 0.09;
  [[[1, 0, 0], 0xd23c28, 'X'], [[0, 1, 0], 0x2a9d4b, 'Y'], [[0, 0, 1], 0x2563c9, 'Z']].forEach(([d, b, t]) => {
    const a = new THREE.ArrowHelper(new THREE.Vector3(...d), new THREE.Vector3(0, 0, 0), L, b, 0.02, 0.012);
    a.traverse(o => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } }); g.add(a);
    const o = oznaka(t, '#' + b.toString(16).padStart(6, '0'));
    o.position.set(d[0] * (L + 0.006), d[1] * (L + 0.006), d[2] * (L + 0.006)); g.add(o);
  });
  const w = oznaka('W (0, 0)', '#17656E', 0.022); w.position.set(0.006, -0.02, 0.002); g.add(w);
  g.position.set(u0 / 1000, v0 / 1000, 0.0012); g.visible = $('ks-crteza').checked;
  ploca.grupa.add(g); ksCrteza = g;
  // položaj W u KS robota (kao wobj: uframe) — kvaternion iz osi U, V, N
  const p = tockaNaPloci(ploca, u0, v0), U = ploca.U, V = ploca.V, Nn = ploca.Nn;
  const qq = kvaternion(U, V, Nn);
  $('ks-info').innerHTML = '<b>Nul-točka crteža W</b> (donji lijevi kut crteža): ' + Math.round(u0 + PL.w / 2) + ' mm od lijevog i ' + Math.round(v0 + PL.h / 2) +
    ' mm od donjeg ruba ploče.<br>U KS robota: x = ' + mm(p[0]) + ', y = ' + mm(p[1]) + ', z = ' + mm(p[2]) + ' mm; kvaternion [' + qq.map(x => x.toFixed(5)).join(', ') + '] (osi X, Y, Z crteža).';
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
  const b = (crtez && (crtez.datoteka || crtez.ime) || 'crtez').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  return 'IRB120_' + b + '_v01';
}
$('gkod-izvoz').addEventListener('click', async () => {
  if (!gkod.length) return;
  const tekst = gkod.join('\r\n') + '\r\n', poruka = $('gkod-poruka');
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) {                                   // pregled na claude.ai: preglednik dopušta samo .txt
    try { await dl.save({ filename: imeDatoteke() + '.nc.txt', data: tekst }); poruka.textContent = 'Spremljeno. Ekstenziju .txt makni pa ostaje .nc.'; }
    catch (e) { poruka.textContent = e && e.code === 'declined' ? 'Spremanje otkazano.' : 'Spremanje ovdje nije dostupno; kopiraj G-kod.'; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/plain' }));
  a.download = imeDatoteke() + '.nc'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  poruka.textContent = 'Spremljeno kao ' + a.download + '.';
});
$('gkod-kopiraj').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(gkod.join('\n')); $('gkod-poruka').textContent = 'G-kod je kopiran.'; }
  catch (e) {
    const r = document.createRange(); r.selectNodeContents($('gkod')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    $('gkod-poruka').textContent = 'Oznaceno — kopiraj s Ctrl+C.';
  }
});

// ---------------- prihvatnica ----------------
function postaviPrihvatnicu() {
  const L = +$('krak').value / 1000; $('krak-out').textContent = Math.round(L * 1000) + ' mm';
  if (N.krak) {
    N.krak.scale.x = L / AL.sisaljka.L0;
    const d = new THREE.Vector3(1, 0, 0).applyQuaternion(N.krak.quaternion);
    N.sisaljka.position.copy(N.krak.position).addScaledVector(d, L - AL.sisaljka.L0);
  }
  const o = +$('prsti').value / 1000; $('prsti-out').textContent = Math.round(o * 1000) + ' mm';
  if (N.prst_p) {
    const s = AL.prst_smjer_p, d = new THREE.Vector3(s[0], s[2], -s[1]);
    N.prst_p.position.copy(d).multiplyScalar(o); N.prst_n.position.copy(d).multiplyScalar(-o);
  }
  const a = document.querySelector('input[name="alat"]:checked').value;
  const al = a === 'sisaljka' ? alatSisaljka(L) : ALAT[a];
  const rez = K.fk(q, al);
  $('tcp-info').textContent = 'TCP (' + a + ') u nultom položaju: x = ' + mm(rez.p[0]) + ', y = ' + mm(rez.p[1]) + ', z = ' + mm(rez.p[2]) + ' mm; od prirubnice ' +
    Math.round(1000 * Math.hypot(...K.sub(K.tockaUj6(K.fk([0, 0, 0, 0, 0, 0]), al.p), [0.374, 0, 0.630]))) + ' mm';
  tcpOznaka(al);
}
let tcpTroj = null;
function tcpOznaka(al) {
  if (!N.j6) return;
  if (!tcpTroj) { tcpTroj = new THREE.AxesHelper(0.05); tcpTroj.material.depthTest = false; tcpTroj.renderOrder = 9; N.j6.add(tcpTroj); }
  // lokalno j6 (GLB): pozicija = yup(al.p), osi = yup stupaca al.R
  const c = k => new THREE.Vector3(al.R[k], al.R[6 + k], -al.R[3 + k]);
  const m = new THREE.Matrix4().makeBasis(c(0), c(1), c(2)); m.setPosition(new THREE.Vector3(al.p[0], al.p[2], -al.p[1]));
  tcpTroj.matrixAutoUpdate = false; tcpTroj.matrix.copy(m);
}
['krak', 'prsti'].forEach(id => $(id).addEventListener('input', postaviPrihvatnicu));
document.querySelectorAll('input[name="alat"]').forEach(r => r.addEventListener('change', postaviPrihvatnicu));

// ---------------- ulazi ploče ----------------
const POLJA = { 'pl-w': 'w', 'pl-h': 'h', 'pl-r': 'r', 'pl-fi': 'fi', 'pl-psi': 'psi', 'pl-hd': 'hd', 'pl-alfa': 'alfa', 'pl-hg': 'hg' };
let tPloca = 0;
function promjenaPloce(odmah) {
  for (const id in POLJA) PL[POLJA[id]] = +$(id).value;
  PL.nacinNagiba = document.querySelector('input[name="nagib"]:checked').value;
  $('red-alfa').hidden = PL.nacinNagiba !== 'kut'; $('red-hg').hidden = PL.nacinNagiba !== 'visina';
  gradiPlocu();
  clearTimeout(tPloca);
  tPloca = setTimeout(() => { if ($('karta-dosega').checked) racunajKartu(); pripremi(); }, odmah ? 0 : 300);
}
for (const id in POLJA) {
  const el = $(id), sl = $(id + '-r');
  el.addEventListener('input', () => { if (sl) sl.value = el.value; promjenaPloce(); });
  if (sl) sl.addEventListener('input', () => { el.value = sl.value; promjenaPloce(); });
}
document.querySelectorAll('input[name="nagib"]').forEach(r => r.addEventListener('change', () => promjenaPloce()));
$('karta-dosega').addEventListener('change', () => { karta.mesh.visible = $('karta-dosega').checked; if ($('karta-dosega').checked) racunajKartu(); else $('karta-info').textContent = ''; });
$('omotac').addEventListener('change', () => { if (omotac) omotac.visible = $('omotac').checked; });
$('stvarno').addEventListener('change', () => { $('velicina').disabled = $('stvarno').checked; });
['velicina', 'stvarno', 'brzina'].forEach(id => $(id).addEventListener('change', () => { if (izvor() === 'slika' && id === 'velicina') ucitajCrtez(); else pripremi(); }));
$('velicina').addEventListener('input', () => { $('velicina-out').textContent = $('velicina').value + ' %'; });

// ---------------- učitavanje ----------------
function ucitajModel(gotovo, greska) {
  const L = new GLTFLoader();
  if (window.FTQ_GLB_B64) { const bin = Uint8Array.from(atob(window.FTQ_GLB_B64), ch => ch.charCodeAt(0)); L.parse(bin.buffer, '', gotovo, greska); }
  else L.load('irb120_alat.glb', gotovo, undefined, greska);
}
ucitajModel(g => {
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (let i = 1; i <= 6; i++) zgl.push(g.scene.getObjectByName('j' + i));
  ['j6', 'krak', 'sisaljka', 'prst_p', 'prst_n'].forEach(n => N[n] = g.scene.getObjectByName(n));
  korijen.add(g.scene);
  $('ucitavanje').remove();
  postaviPrihvatnicu();
  promjenaPloce(true);
  ucitajCrtez();
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
const XR_INACICA = 'v06';
function stanjeSidra(t) { const el = $('xr-sidro'); if (el && el.textContent !== t) el.textContent = t; }
function presidri() {                     // sidro se izgubilo: model ostaje gdje je sada, novo slobodno sidro na tom mjestu
  sidroP0.copy(korijen.position);
  const e = new THREE.Euler().setFromQuaternion(korijen.quaternion, 'YXZ'); xrSmjer = e.y - xrZakret;
  pustiSidro(); korijenXR(); xr.trebaSidro = true; xr.slobodno = true; xr.presidreno++;
}
function pustiSidro() { if (xr && xr.sidro) { try { xr.sidro.delete(); } catch (e) { } } if (xr) { xr.sidro = null; xr.imaPozu = false; xr.trebaSidro = false; } }
function sidriUOkviru(frame, ref) {      // zove se u animacijskom okviru (createAnchor traži aktivan okvir)
  xr.trebaSidro = false;
  const gotovo = a => { if (!xr || !xr.postavljen) { try { a.delete(); } catch (e) { } return; } xr.sidro = a; xr.imaPozu = false; xr.izgubljeno = 0; xr.sidroStanje = 'da'; uputa.textContent = 'Robot i ploča su usidreni na podlozi. Dodirni Crtaj; obilazi ih slobodno.'; };
  const nijeUspjelo = () => { if (xr) xr.sidroStanje = 'ne'; if (xr && !xr.presidreno) uputa.textContent = 'Robot i ploča su postavljeni (uređaj ne podržava sidra, pa mogu malo plivati). Dodirni Crtaj.'; };
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
  const KANON = 'https://dos.fortroniq.hr/ar/irb120-crtanje/';
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
  else if (mob && !navigator.xr) $('ar-poruka').textContent = 'Ovaj preglednik nema WebXR. AR s crtanjem radi u Chromeu na Androidu; na iPhoneu Safari to još ne podržava.';
})();
xrGumb.addEventListener('click', () => {
  sloj.hidden = false;
  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'anchors'], domOverlay: { root: sloj } }).then(s => {
    renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
    return renderer.xr.setSession(s).then(() => {
      xr = { s, izvor: null, postavljen: false, sidro: null, imaPozu: false, trebaSidro: false, slobodno: false, izgubljeno: 0, presidreno: 0, sidroStanje: '', okvir: 0 };
      mreza.visible = false; pod.material.opacity = 0.32; korijen.visible = false;
      uputa.textContent = 'Usmjeri kameru prema podu ili stolu i polako pomiči mobitel dok se ne pojavi krug.'; stanjeSidra('');
      s.requestReferenceSpace('viewer').then(vs => s.requestHitTestSource({ space: vs })).then(iz => { if (xr) xr.izvor = iz; });
      s.addEventListener('select', () => {
        if (!xr || xr.postavljen || !krug.visible) return;
        sidroP0.setFromMatrixPosition(krug.matrix);
        const c = renderer.xr.getCamera().position;
        // okreni cjelinu tako da korisnik gleda plohu za pisanje (kao gumb Pogled na plocu)
        const d = K.unit(K.add(K.mul(ploca.Nn, 0.78), K.mul(ploca.U, -0.62)));
        xrSmjer = Math.atan2(-(c.z - sidroP0.z), c.x - sidroP0.x) - Math.atan2(d[1], d[0]);
        pustiSidro(); korijenXR(); korijen.visible = true; xr.postavljen = true; xr.trebaSidro = true; xr.slobodno = false; xr.presidreno = 0; xr.sidroStanje = 'čekam'; krug.visible = false;
        uputa.textContent = 'Robot i ploča su postavljeni, sidrim ih na podlogu…';
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
$('xr-premjesti').addEventListener('click', () => { if (!xr) return; pustiSidro(); stanjeSidra(''); xr.postavljen = false; korijen.visible = false; uputa.textContent = 'Dodirni krug na podu ili stolu da ponovno postaviš robota i ploču.'; });
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
    stanjeSidra(vp && vp.emulatedPosition ? 'Praćenje kamere je slabo: polako pomiči mobitel, osvijetli stol ili stavi papir s uzorkom pod robota.'
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
    if (p) { krug.visible = true; krug.matrix.fromArray(p.transform.matrix); uputa.textContent = 'Dodirni krug da postaviš robota i ploču.'; } else krug.visible = false;
  }
  if (frame && xr && xr.postavljen) xrKorak(frame, renderer.xr.getReferenceSpace());
  if (xr) $('xr-napredak').textContent = $('napredak-txt').textContent;
  sunce.position.set(korijen.position.x + 1.2, korijen.position.y + 2.4, korijen.position.z + 1.4); sunce.target.position.copy(korijen.position);
  if (!renderer.xr.isPresenting) upr.update();
  renderer.render(scena, kamera);
});
scena.add(sunce.target);
window.FTQ_CRT = { korijenXR, xrKorak, get xrStanje() { return xr; }, sidroP0, sidroSad, sidroInv0, korijen, set xrTest(v) { xr = v; }, K, P, PL, ploca, prog, postavi, racunajKartu, pripremi, stanjeTocke, get q() { return q; } };
