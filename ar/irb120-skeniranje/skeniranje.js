// skeniranje.js — IRB 120 snima predmet web-kamerom Logitech C920 (u držaču iz stanice M. Mudrija) za fotogrametriju.
// Predmet stoji na okretnom stolu; robot vodi kameru po kuglastoj mreži položaja (visine × kutovi), stol se okreće.
// Virtualni sken: iz svakog položaja kamere predmet se snimi (dubina po pikselu) i točke se skupe u oblak točaka,
// koji se uspoređuje s CAD modelom (pokrivenost površine). Izvedeno iz ispis.js (ar/irb120-ispis).
// Moduli: kinematika.js (FK/IK), putanje.js (čitanje STL/OBJ, pripremiModel). Podaci: window.FTQ_ALATI, window.FTQ_PRIMJER_STL.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as K from './kinematika.js';
import * as P from './putanje.js';

const $ = id => document.getElementById(id);
const AL = window.FTQ_ALATI;
const ALAT = { kamera: K.alatIz(AL.tcp.kamera.p, AL.tcp.kamera.R) };
const VIS = 0.81;                                                // visina stola M. Mudrija (baza robota na stolu)
const g3 = (p) => new THREE.Vector3(p[0], p[2], -p[1]);        // baza (Z gore) -> scena (Y gore), lokalno na stolu
const g3w = (p) => g3(p).add(new THREE.Vector3(0, VIS, 0));     // isto, u sceni
const D2R = Math.PI / 180;
const C920 = { hfov: 70.42, vfov: 43.3, sir: 1920, vis: 1080 };   // Logitech C920 pri 1080p (tvornički podaci, dijagonala 78°)


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

// ---------------- okretni stol s predmetom ----------------
// PL: r, fi = os okretnog stola od osi robota; hd = visina plohe tanjura nad stolom; d = promjer tanjura (mm)
const PL = { r: 420, fi: 0, hd: 60, d: 160 };
const stalak = new THREE.Group(); naStolu.add(stalak);          // ishodište = središte plohe tanjura
const tijeloStola = new THREE.Group(); stalak.add(tijeloStola);
const tanjur = new THREE.Group(); stalak.add(tanjur);              // okreće se oko osi Y (scena) = Z (baza)
const predmetG = new THREE.Group(); predmetG.rotation.x = -Math.PI / 2; predmetG.scale.setScalar(0.001); tanjur.add(predmetG);   // KS predmeta (mm, Z gore)
const matStalak = new THREE.MeshStandardMaterial({ color: 0x30353a, roughness: 0.5, metalness: 0.45 });
const matTanjur = new THREE.MeshStandardMaterial({ color: 0xd9dcde, roughness: 0.55, metalness: 0.1 });
let theta = 0;                                                       // zakret tanjura (°)
function sredisteStola() { const f = PL.fi * D2R; return [PL.r / 1000 * Math.cos(f), PL.r / 1000 * Math.sin(f), PL.hd / 1000]; }
function oznakeTanjura() {                                           // kutna skala na tanjuru (svakih 15°), bez teksta
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const cx = cv.getContext('2d');
  cx.fillStyle = '#d9dcde'; cx.beginPath(); cx.arc(256, 256, 256, 0, 7); cx.fill();
  cx.strokeStyle = '#2b3036'; cx.lineWidth = 3;
  for (let a = 0; a < 360; a += 15) { const r1 = a % 90 ? 236 : 210, c = Math.cos(a * D2R), s = Math.sin(a * D2R); cx.beginPath(); cx.moveTo(256 + 252 * c, 256 + 252 * s); cx.lineTo(256 + r1 * c, 256 + r1 * s); cx.stroke(); }
  cx.fillStyle = '#c8202a'; cx.beginPath(); cx.arc(256 + 230, 256, 10, 0, 7); cx.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texTanjur = oznakeTanjura();
function gradiStol() {
  const C = sredisteStola(); stalak.position.copy(g3(C));
  while (tijeloStola.children.length) { const c = tijeloStola.children.pop(); c.geometry.dispose(); }
  const R = PL.d / 2000, h = PL.hd / 1000;
  const noga = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, Math.max(0.005, h - 0.02), 32), matStalak);
  noga.position.y = -h / 2 - 0.01; noga.castShadow = noga.receiveShadow = true; tijeloStola.add(noga);
  const kuc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 40), matStalak); kuc.position.y = -0.016; tijeloStola.add(kuc);
  while (tanjur.children.length > 1) { const c = tanjur.children.pop(); c.geometry && c.geometry.dispose(); }
  const ploca = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.01, 72), [matTanjur, new THREE.MeshStandardMaterial({ map: texTanjur, roughness: 0.6 }), matTanjur]);
  ploca.position.y = -0.005; ploca.castShadow = ploca.receiveShadow = true; tanjur.add(ploca);
  $('pl-info').innerHTML = 'Os okretnog stola ' + Math.round(PL.r * Math.cos(PL.fi * D2R)) + ' mm ispred i ' + Math.round(PL.r * Math.sin(PL.fi * D2R)) + ' mm lijevo od osi robota; ploha tanjura ' +
    Math.round(PL.hd) + ' mm iznad stola, promjer ' + Math.round(PL.d) + ' mm. Crvena točka = 0° tanjura.';
}
function postaviTheta(t) { theta = t; tanjur.rotation.y = t * D2R; }

// ---------------- predmet (STL / OBJ) ----------------
let predmet = null, predmetMesh = null, predmetIme = '', modelTri = null;
const matPredmet = new THREE.MeshStandardMaterial({ color: 0xe8641e, roughness: 0.55, metalness: 0.05, transparent: true });
const matTekstura = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, transparent: true });
let uvPrimjer = null; // UV po vrhu trokuta za primjer sa skena (tekstura iz mobitela)
function ucitajModelDat(buf, ime) {
  try { modelTri = P.citajModel(buf, ime); predmetIme = ime; postaviPredmet(); }
  catch (e) { $('model-info').textContent = 'Model se nije mogao pročitati: ' + e.message; }
}
function postaviPredmet() {
  if (!modelTri) return;
  const M = P.pripremiModel(modelTri, { os: $('model-os').value, mm: +$('model-jed').value });
  const s = Math.max(1, +$('model-mj').value || 100) / 100; for (let i = 0; i < M.P.length; i++) M.P[i] *= s;
  predmet = { P: M.P, w: M.w * s, h: M.h * s, visina: M.visina * s };
  if (predmetMesh) { predmetG.remove(predmetMesh); predmetMesh.geometry.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(predmet.P, 3)); g.computeVertexNormals(); g.computeBoundingBox();
  const imaUV = !!(uvPrimjer && matTekstura.map && uvPrimjer.length === predmet.P.length / 3 * 2);
  if (imaUV) g.setAttribute('uv', new THREE.BufferAttribute(uvPrimjer, 2));
  predmetMesh = new THREE.Mesh(g, imaUV ? matTekstura : matPredmet); predmetMesh.castShadow = predmetMesh.receiveShadow = true; predmetG.add(predmetMesh);
  uzorciPovrsine();
  $('model-info').textContent = predmetIme + ': ' + (modelTri.length / 9) + ' trokuta, ' + Math.round(predmet.w) + ' × ' + Math.round(predmet.h) + ' × ' + predmet.visina.toFixed(1) +
    ' mm; površina ' + Math.round(povrsinaUk / 100) + ' cm².' + (Math.max(predmet.w, predmet.h) > PL.d ? ' Predmet je širi od tanjura.' : '');
  obrisiOblak(); pripremi(); primijeniPrikaz();
}
$('model-dat').addEventListener('change', e => { const f = e.target.files[0]; uvPrimjer = null; if (f) f.arrayBuffer().then(b => ucitajModelDat(b, f.name)); });
$('model-primjer').addEventListener('click', () => {
  if ($('model-primjer-izbor').value === 'dron') {
    $('model-info').textContent = 'Učitavam sken mini drona…';
    const dohvati = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ': HTTP ' + r.status); return r.arrayBuffer(); });
    const tekstura = new Promise(ok => new THREE.TextureLoader().load('primjeri/mini_dron_tekstura.jpg', t => ok(t), undefined, () => ok(null)));
    Promise.all([dohvati('primjeri/mini_dron_iphone17pro.stl'), dohvati('primjeri/mini_dron_uv.bin').catch(() => null), tekstura])
      .then(([b, uv, t]) => {
        if (t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (matTekstura.map) matTekstura.map.dispose(); matTekstura.map = t; matTekstura.needsUpdate = true; }
        uvPrimjer = uv && t ? new Float32Array(uv) : null;
        ucitajModelDat(b, 'mini_dron_iphone17pro.stl');
      }).catch(e => { $('model-info').textContent = 'Sken se nije mogao učitati: ' + e.message; });
    return;
  }
  uvPrimjer = null;
  const bin = Uint8Array.from(atob(window.FTQ_PRIMJER_STL), c => c.charCodeAt(0)); ucitajModelDat(bin.buffer, 'primjer_nosac.stl');
});
['model-os', 'model-jed', 'model-mj'].forEach(id => $(id).addEventListener('change', postaviPredmet));

// uzorci po površini CAD modela (za pokrivenost): jednoliko po površini, ~1 uzorak na 2 mm²
let uzorci = null, povrsinaUk = 0;
function uzorciPovrsine() {
  const Pp = predmet.P, nt = Pp.length / 9, A = new Float64Array(nt); let uk = 0;
  for (let t = 0; t < nt; t++) {
    const o = t * 9, ax = Pp[o + 3] - Pp[o], ay = Pp[o + 4] - Pp[o + 1], az = Pp[o + 5] - Pp[o + 2], bx = Pp[o + 6] - Pp[o], by = Pp[o + 7] - Pp[o + 1], bz = Pp[o + 8] - Pp[o + 2];
    uk += Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2; A[t] = uk;
  }
  povrsinaUk = uk;
  const n = Math.min(40000, Math.max(3000, Math.round(uk / 2))), U = new Float32Array(n * 3);
  let sjeme = 12345; const rnd = () => (sjeme = (sjeme * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < n; i++) {
    const x = rnd() * uk; let lo = 0, hi = nt - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] < x) lo = m + 1; else hi = m; }
    const o = lo * 9; let a = rnd(), b = rnd(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
    for (let k = 0; k < 3; k++) U[i * 3 + k] = Pp[o + k] + a * (Pp[o + 3 + k] - Pp[o + k]) + b * (Pp[o + 6 + k] - Pp[o + k]);
  }
  uzorci = U;
}

// ---------------- položaji kamere (kuglasta mreža) ----------------
function cilj() { const C = sredisteStola(); return K.add(C, [0, 0, (predmet ? predmet.visina : 40) / 2000]); }
function prema(C) { return K.unit([-C[0], -C[1], 0]); }      // vodoravno od predmeta prema robotu
function visine() { return String($('sk-vis').value).split(/[;, ]+/).map(Number).filter(v => isFinite(v) && v > -60 && v < 90); }
function pozeKamere() {
  const R = Math.max(80, +$('sk-R').value || 260) / 1000, n = Math.max(1, Math.round(+$('sk-n').value || 24)), O = cilj(), d0 = prema(O), nacin = $('sk-nacin').value;
  const out = [];
  for (const e of visine()) {
    const ce = Math.cos(e * D2R), se = Math.sin(e * D2R);
    if (nacin === 'stol') {
      const p = K.add(O, K.add(K.mul(d0, R * ce), [0, 0, R * se]));
      for (let k = 0; k < n; k++) out.push({ p, z: K.unit(K.sub(O, p)), el: e, az: 0, theta: 360 * k / n, nova: k === 0 });
    } else {
      const a0 = Math.atan2(d0[1], d0[0]);
      for (let k = 0; k < n; k++) {
        const a = a0 + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 2 * Math.PI / n;     // od strane robota naizmjence lijevo-desno
        const p = K.add(O, [R * ce * Math.cos(a), R * ce * Math.sin(a), R * se]);
        out.push({ p, z: K.unit(K.sub(O, p)), el: e, az: Math.round(((a - a0) / D2R + 540) % 360 - 180), theta: 0, nova: true });
      }
    }
  }
  return out;
}
function provjeriSudar(rez) {
  const tocke = [rez.ish[2], rez.ish[3], rez.ish[4], rez.j6.p, K.mul(K.add(rez.ish[1], rez.ish[2]), 0.5), K.mul(K.add(rez.ish[2], rez.ish[4]), 0.5)];
  for (const k in AL.tocke_kolizije) tocke.push(K.tockaUj6(rez, AL.tocke_kolizije[k]));
  const C = sredisteStola(), rs = PL.d / 2000 + 0.01, rp = predmet ? Math.hypot(predmet.w, predmet.h) / 2000 + 0.01 : 0.05, hp = (predmet ? predmet.visina : 40) / 1000 + 0.01;
  for (const p of tocke) {
    if (p[2] < -0.005) return true;
    const rh = Math.hypot(p[0] - C[0], p[1] - C[1]);
    if (rh < rs && p[2] < C[2] + 0.002) return true;                 // tanjur i nosač
    if (rh < rp && p[2] < C[2] + hp) return true;                     // predmet (obuhvatni valjak)
  }
  return false;
}

// ---------------- prikaz ----------------
let oblak = null, rupe = null, oznakePoza = null;
const camSnimka = new THREE.PerspectiveCamera(C920.vfov, 16 / 9, 0.02, 4);
function primijeniPrikaz() {
  const v = id => (+$(id).value) / 100, s = $('pr-stanica').value;
  if (N.stol) N.stol.visible = s !== 'robot';
  stalak.visible = s !== 'robot';
  matPredmet.opacity = matTekstura.opacity = v('pr-predmet'); matPredmet.depthWrite = matTekstura.depthWrite = v('pr-predmet') > 0.95; if (predmetMesh) predmetMesh.visible = v('pr-predmet') > 0.001;
  if (oblak) { oblak.material.opacity = v('pr-oblak'); oblak.visible = v('pr-oblak') > 0.001; }
  if (rupe) rupe.visible = $('pr-rupe').checked;
  if (oznakePoza) oznakePoza.visible = $('pr-poze').checked;
  document.querySelectorAll('[data-pr]').forEach(o => { o.textContent = $(o.dataset.pr).value + ' %'; });
}
['pr-predmet', 'pr-oblak'].forEach(id => $(id).addEventListener('input', primijeniPrikaz));
['pr-stanica', 'pr-rupe', 'pr-poze', 'pr-kamera'].forEach(id => $(id).addEventListener('change', primijeniPrikaz));

// ---------------- program snimanja ----------------
const prog = { KF: [], n: 0, t: 0, aktivan: false, gotovo: false, iKF: 0, poze: [], snimljeno: 0 };
let tPrip = 0;
function pripremiKasnije() { clearTimeout(tPrip); tPrip = setTimeout(pripremi, 250); }
['sk-nacin', 'sk-R', 'sk-n', 'sk-vis'].forEach(id => $(id).addEventListener('change', pripremiKasnije));
function pripremi() {
  stani(); prog.KF = []; prog.n = 0; prog.t = 0; prog.gotovo = false; prog.iKF = 0;
  $('crtaj').disabled = true;
  if (!predmet) { $('prog-info').textContent = 'Učitaj predmet (STL ili OBJ) ili primjer.'; return; }
  const poze = pozeKamere(), stol = $('sk-nacin').value === 'stol';
  let q0 = null, qPret = [0, 0, 0, 0, 0, 0], thPret = 0, t = 0, dobrih = 0, sudara = 0, izvan = 0;
  const KF = [{ t: 0, q: qPret.slice(), th: 0, foto: -1 }];
  poze.forEach((pz, i) => {
    if (pz.nova) {
      let r = q0 ? K.ik({ p: pz.p, z: pz.z }, q0, ALAT.kamera, { iter: 60 }) : null;
      if (!r || !r.ok) r = K.ikSiroko({ p: pz.p, z: pz.z }, ALAT.kamera, q0);
      pz.ok = !!(r && r.ok); pz.q = pz.ok ? r.q : null; pz.sudar = false;
      if (pz.ok && provjeriSudar(K.fk(r.q, ALAT.kamera))) { pz.ok = false; pz.sudar = true; }
      if (pz.ok) q0 = r.q;
    } else { const pr = poze[i - 1]; pz.ok = pr.ok; pz.q = pr.q; pz.sudar = pr.sudar; }
    if (!pz.ok) { if (pz.sudar) sudara++; else izvan++; return; }
    dobrih++;
    if (pz.nova || !KF.length) {
      const dq = Math.max(...pz.q.map((v, j) => Math.abs(v - qPret[j])));
      t += Math.max(0.6, dq / 40); KF.push({ t, q: pz.q.slice(), th: thPret, foto: -1 }); t += 0.3; KF.push({ t, q: pz.q.slice(), th: thPret, foto: -1 }); qPret = pz.q;
    }
    if (stol && Math.abs(pz.theta - thPret) > 1e-6) {
      let th = pz.theta; if (th < thPret) th += 360 * Math.ceil((thPret - th) / 360);   // stol se okreće samo naprijed
      t += Math.max(0.2, (th - thPret) / 60); KF.push({ t, q: qPret.slice(), th, foto: -1 }); thPret = th;
    }
    t += 0.4; KF.push({ t, q: qPret.slice(), th: thPret, foto: i });
  });
  t += Math.max(0.8, Math.max(...qPret.map(Math.abs)) / 40); KF.push({ t, q: [0, 0, 0, 0, 0, 0], th: thPret, foto: -1 });
  Object.assign(prog, { KF, n: KF.length, poze });
  crtajOznakePoza(poze);
  programRapid(poze, stol);
  const R = +$('sk-R').value, kad = 2 * R * Math.tan(C920.vfov / 2 * D2R), vel = Math.max(predmet.w, predmet.h, predmet.visina);
  $('prog-info').innerHTML = '<b>' + predmetIme + '</b>: ' + poze.length + ' snimaka (' + visine().length + mnozina(visine().length, ' visina', ' visine', ' visina') + ' × ' + Math.round(+$('sk-n').value) + '), ' +
    dobrih + ' dohvatljivih' + (izvan ? ', ' + izvan + ' izvan dosega' : '') + (sudara ? ', ' + sudara + ' u sudaru' : '') + '; oko ' + vrijeme(t) + '. ' +
    'Kadar C920 na ' + R + ' mm: ' + Math.round(kad * 16 / 9) + ' × ' + Math.round(kad) + ' mm' + (vel > kad * 0.95 ? ' <span class="upoz">Predmet je veći od kadra: povećaj udaljenost.</span>' : (vel < kad * 0.3 ? ' (predmet je sitan u kadru: približi kameru)' : '.')) +
    (izvan + sudara ? ' <span class="upoz">Nedohvatljive snimke se preskaču; ' + (stol ? 'smanji visinu ili približi stol robotu.' : 'u načinu „robot obilazi” robot ne dohvaća stražnju stranu: koristi okretni stol.') + '</span>' : '');
  $('crtaj').disabled = dobrih === 0; napredak();
}
function crtajOznakePoza(poze) {
  if (oznakePoza) { naStolu.remove(oznakePoza); oznakePoza.children.forEach(c => c.geometry.dispose()); }
  oznakePoza = new THREE.Group(); const geo = new THREE.SphereGeometry(0.006, 10, 8);
  const mDa = new THREE.MeshBasicMaterial({ color: 0x2eaa5a }), mNe = new THREE.MeshBasicMaterial({ color: 0xd63c28 });
  const vid = new Set();
  poze.forEach(pz => { const k = pz.p.map(v => v.toFixed(4)).join(); if (vid.has(k)) return; vid.add(k); const m = new THREE.Mesh(geo, pz.ok ? mDa : mNe); m.position.copy(g3(pz.p)); oznakePoza.add(m); });
  naStolu.add(oznakePoza); primijeniPrikaz();
}
function mnozina(n, a, b, c) { const d = n % 10, s = n % 100; return d === 1 && s !== 11 ? a : (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? b : c; }
function vrijeme(s) { s = Math.round(s); if (s < 60) return s + ' s'; const m = Math.floor(s / 60); return m < 60 ? m + ' min ' + (s % 60) + ' s' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
function napredak() {
  const uk = prog.n ? prog.KF[prog.n - 1].t : 0;
  $('napredak').value = uk ? Math.min(1, prog.t / uk) : 0;
  const ukF = prog.poze.filter(p => p.ok).length;
  $('napredak-txt').textContent = uk ? vrijeme(prog.t) + ' / ' + vrijeme(uk) + ' · snimaka ' + prog.snimljeno + ' / ' + ukF + ' · stol ' + Math.round(((theta % 360) + 360) % 360) + '°' : '';
}
function stani() { prog.aktivan = false; $('crtaj').textContent = 'Snimi'; $('crtaj').setAttribute('aria-pressed', 'false'); }
let qPrijelaz = null;
$('crtaj').addEventListener('click', () => {
  if (prog.aktivan) { stani(); return; }
  if (!prog.n) return;
  if (prog.gotovo || prog.t >= prog.KF[prog.n - 1].t) { prog.t = 0; prog.iKF = 0; prog.gotovo = false; obrisiOblak(); postaviTheta(0); }
  const qc = prog.KF[0].q;
  qPrijelaz = { od: q.slice(), do: qc, t: 0, dur: Math.max(0.4, Math.max(...qc.map((v, j) => Math.abs(v - q[j]))) / 60) };
  prog.aktivan = true; $('crtaj').textContent = 'Pauza'; $('crtaj').setAttribute('aria-pressed', 'true');
});
$('obrisi').addEventListener('click', () => { obrisiOblak(); prog.t = 0; prog.iKF = 0; prog.gotovo = false; postaviTheta(0); napredak(); });
$('pocetni').addEventListener('click', () => { stani(); qPrijelaz = { od: q.slice(), do: [0, 0, 0, 0, 0, 0], t: 0, dur: 1.2 }; });
function korakPrograma(dt) {
  const KF = prog.KF, uk = KF[prog.n - 1].t;
  prog.t = Math.min(uk, prog.t + dt * (+$('ubrzanje').value));
  while (prog.iKF < prog.n - 1 && KF[prog.iKF + 1].t <= prog.t) {
    prog.iKF++; const k = KF[prog.iKF];
    if (k.foto >= 0) { postavi(k.q); postaviTheta(k.th); snimi(prog.poze[k.foto]); }
  }
  const a = KF[prog.iKF], b = KF[Math.min(prog.n - 1, prog.iKF + 1)], u = b.t > a.t ? (prog.t - a.t) / (b.t - a.t) : 1;
  postavi(a.q.map((v, j) => v + (b.q[j] - v) * u)); postaviTheta(a.th + (b.th - a.th) * u);
  napredak();
  if (prog.t >= uk) { prog.gotovo = true; stani(); racunajPokrivenost(); $('napredak-txt').textContent += ' · gotovo'; }
}

// ---------------- virtualna snimka: dubina po pikselu -> točke u KS predmeta ----------------
const scenaSken = new THREE.Scene();
const matSken = new THREE.ShaderMaterial({
  uniforms: { uMin: { value: new THREE.Vector3() }, uVel: { value: new THREE.Vector3(1, 1, 1) }, uProlaz: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 uMin; uniform vec3 uVel; uniform float uProlaz; varying vec3 vP;\n' +
    'void main(){ vec3 n = clamp((vP - uMin) / uVel, 0.0, 1.0); vec3 hi = floor(n * 255.0) / 255.0; vec3 lo = fract(n * 255.0); gl_FragColor = vec4(uProlaz < 0.5 ? hi : lo, 1.0); }'
});
const meshSken = new THREE.Mesh(new THREE.BufferGeometry(), matSken); meshSken.matrixAutoUpdate = false; scenaSken.add(meshSken);
const tanjurSken = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
tanjurSken.matrixAutoUpdate = false; tanjurSken.renderOrder = -1; scenaSken.add(tanjurSken);
let rt = null, rtRes = '';
function poloziKameru(cam, qq) {               // kamera iz FK: položaj = TCP, gleda uzduž osi z alata (horizont vodoravan)
  const rez = K.fk(qq, ALAT.kamera), z = K.stupac(rez.R, 2);
  naStolu.updateMatrixWorld(true);
  const p = naStolu.localToWorld(g3(rez.p)), t = naStolu.localToWorld(g3(K.add(rez.p, K.mul(z, 0.1))));
  cam.position.copy(p); cam.up.set(0, 1, 0); if (Math.abs(z[2]) > 0.98) cam.up.copy(g3(K.stupac(rez.R, 0)).normalize());
  cam.lookAt(t); cam.updateMatrixWorld(true);
}
const oblakP = { pos: null, boja: null, n: 0, maks: 1500000 };
function snimi(pz) {
  if (!predmetMesh) return;
  const [w, h] = $('sk-res').value.split('x').map(Number);
  if (rtRes !== $('sk-res').value) { if (rt) rt.dispose(); rt = new THREE.WebGLRenderTarget(w, h); rtRes = $('sk-res').value; }
  poloziKameru(camSnimka, q); camSnimka.aspect = w / h; camSnimka.updateProjectionMatrix();
  predmetMesh.updateMatrixWorld(true);
  meshSken.geometry = predmetMesh.geometry; meshSken.matrix.copy(predmetMesh.matrixWorld); meshSken.matrixWorldNeedsUpdate = true;
  const bb = predmetMesh.geometry.boundingBox;
  matSken.uniforms.uMin.value.copy(bb.min).addScalar(-1); matSken.uniforms.uVel.value.copy(bb.max).sub(bb.min).addScalar(2);
  // tanjur kao zaklon (samo dubina): valjak promjera tanjura, debljine 10 mm ispod plohe
  stalak.updateMatrixWorld(true);
  const Mt = new THREE.Matrix4().compose(new THREE.Vector3(0, -0.005, 0), new THREE.Quaternion(), new THREE.Vector3(PL.d / 2000, 0.01, PL.d / 2000));
  tanjurSken.matrix.multiplyMatrices(tanjur.matrixWorld, Mt); tanjurSken.matrixWorldNeedsUpdate = true;
  const stari = { cc: renderer.getClearColor(new THREE.Color()), ca: renderer.getClearAlpha(), xr: renderer.xr.enabled };
  renderer.xr.enabled = false;
  const A = new Uint8Array(w * h * 4), B = new Uint8Array(w * h * 4);
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0);
  matSken.uniforms.uProlaz.value = 0; renderer.clear(); renderer.render(scenaSken, camSnimka); renderer.readRenderTargetPixels(rt, 0, 0, w, h, A);
  matSken.uniforms.uProlaz.value = 1; renderer.clear(); renderer.render(scenaSken, camSnimka); renderer.readRenderTargetPixels(rt, 0, 0, w, h, B);
  renderer.setRenderTarget(null); renderer.setClearColor(stari.cc, stari.ca); renderer.xr.enabled = stari.xr;
  if (!oblakP.pos) { oblakP.pos = new Float32Array(oblakP.maks * 3); oblakP.boja = new Float32Array(oblakP.maks * 3); }
  const mn = matSken.uniforms.uMin.value, vl = matSken.uniforms.uVel.value, sig = Math.max(0, +$('sk-sum').value || 0), H = predmet.visina || 1;
  let nov = 0;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (let i = 0; i < w * h; i++) {
    if (A[i * 4 + 3] < 255 || oblakP.n >= oblakP.maks) continue;
    const k = oblakP.n * 3;
    for (let c = 0; c < 3; c++) oblakP.pos[k + c] = mn.getComponent(c) + vl.getComponent(c) * (A[i * 4 + c] + B[i * 4 + c] / 255) / 255 + (sig ? gauss() * sig : 0);
    const tz = Math.min(1, Math.max(0, oblakP.pos[k + 2] / H));          // boja po visini: plavo dolje, narančasto gore
    oblakP.boja[k] = 0.11 + 0.8 * tz; oblakP.boja[k + 1] = 0.31 + 0.1 * tz; oblakP.boja[k + 2] = 0.64 - 0.55 * tz;
    oblakP.n++; nov++;
  }
  if (!oblak) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(oblakP.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(oblakP.boja, 3));
    oblak = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true }));
    oblak.frustumCulled = false; predmetG.add(oblak); primijeniPrikaz();
  }
  oblak.geometry.attributes.position.needsUpdate = true; oblak.geometry.attributes.color.needsUpdate = true; oblak.geometry.setDrawRange(0, oblakP.n);
  prog.snimljeno++;
  $('oblak-info').textContent = 'Oblak točaka: ' + oblakP.n.toLocaleString('hr') + ' točaka iz ' + prog.snimljeno + ' snimaka (zadnja: ' + nov + ' točaka, visina ' + pz.el + '°, ' + (pz.theta ? 'stol ' + Math.round(pz.theta) + '°' : 'kut ' + pz.az + '°') + ').';
  if (prog.snimljeno % 12 === 0) racunajPokrivenost();
  bljesak = 0.25;
}
let bljesak = 0;
function obrisiOblak() {
  oblakP.n = 0; prog.snimljeno = 0;
  if (oblak) oblak.geometry.setDrawRange(0, 0);
  if (rupe) { predmetG.remove(rupe); rupe.geometry.dispose(); rupe = null; }
  $('oblak-info').textContent = 'Oblak točaka je prazan. Pokreni snimanje gumbom Snimi.'; $('pokr-info').textContent = '';
}
// pokrivenost: uzorak površine CAD-a je pokriven ako u krugu ~1,5 mm postoji točka oblaka
function racunajPokrivenost() {
  if (!uzorci || !oblakP.n) return;
  const c = 1.0, mapa = new Set(), K3 = (x, y, z) => x + ',' + y + ',' + z;
  for (let i = 0; i < oblakP.n; i++) mapa.add(K3(Math.floor(oblakP.pos[i * 3] / c), Math.floor(oblakP.pos[i * 3 + 1] / c), Math.floor(oblakP.pos[i * 3 + 2] / c)));
  const ns = uzorci.length / 3, R = [];
  let pok = 0, gore = 0, pokGore = 0;
  for (let i = 0; i < ns; i++) {
    const x = Math.floor(uzorci[i * 3] / c), y = Math.floor(uzorci[i * 3 + 1] / c), z = Math.floor(uzorci[i * 3 + 2] / c);
    let ima = false;
    for (let a = -1; a <= 1 && !ima; a++) for (let b = -1; b <= 1 && !ima; b++) for (let d = -1; d <= 1 && !ima; d++) if (mapa.has(K3(x + a, y + b, z + d))) ima = true;
    const jeGore = uzorci[i * 3 + 2] > 0.3; if (jeGore) gore++;
    if (ima) { pok++; if (jeGore) pokGore++; } else R.push(uzorci[i * 3], uzorci[i * 3 + 1], uzorci[i * 3 + 2]);
  }
  if (rupe) { predmetG.remove(rupe); rupe.geometry.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(R), 3));
  rupe = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd63c28, size: 3, sizeAttenuation: false })); rupe.frustumCulled = false; predmetG.add(rupe);
  const posto = 100 * pok / ns;
  $('pokr-info').innerHTML = '<b>Usporedba s CAD-om:</b> pokriveno ' + posto.toFixed(1) + ' % površine modela (' + Math.round(povrsinaUk * posto / 100 / 100) + ' od ' + Math.round(povrsinaUk / 100) +
    ' cm²); bez donje plohe koja leži na tanjuru ' + (gore ? (100 * pokGore / gore).toFixed(1) : '0') + ' %. Crvene točke su dijelovi površine koje kamera nije vidjela' + (posto < 99 ? ' (donja ploha, unutrašnjost provrta i udubljenja; predmet se može okrenuti i snimiti još jednom).' : '.');
  window.FTQ_POKRIVENOST = posto; primijeniPrikaz();
}
// ---------------- RAPID program snimanja ----------------
let rapid = [];
function programRapid(poze, stol) {
  const L = [], f2 = v => v.toFixed(2), ok = poze.filter(p => p.ok);
  L.push('MODULE FTQ_Fotogrametrija'); L.push('  ! ForTroniQ - ABB IRB 120 + Logitech C920: snimanje za fotogrametriju (' + predmetIme + ')');
  L.push('  ! Nacin: ' + (stol ? 'okretni stol (robot drzi kameru na ' + visine().length + ' visina, stol se okrece u ' + $('sk-n').value + ' koraka)' : 'robot obilazi predmet') + '; udaljenost ' + $('sk-R').value + ' mm');
  L.push('  ! TCP = opticko srediste kamere (procjena iz modela) - KALIBRIRATI. Signali su primjer - prilagoditi stanici.');
  L.push('  PERS tooldata tKamera:=[TRUE,[[' + AL.vrh_t0_mm.map(v => v.toFixed(1)).join(',') + '],[0.707107,0,0.707107,0]],[0.6,[40,-60,30],[1,0,0,0],0,0,0]];');
  L.push('  ! doSnimi: impuls PC-u (Python + OpenCV snima sliku s C920); doStolKorak / diStolGotov: okretni stol');
  const jt = [];
  ok.forEach(p => { const k = jt.findIndex(j => j.q === p.q); if (k < 0) jt.push({ q: p.q, pz: [p] }); else jt[k].pz.push(p); });
  jt.forEach((j, i) => L.push('  CONST jointtarget jSnimka' + String(i + 1).padStart(2, '0') + ':=[[' + j.q.map(f2).join(',') + '],[9E9,9E9,9E9,9E9,9E9,9E9]];  ! visina ' + j.pz[0].el + ' st.' + (stol ? '' : ', kut ' + j.pz[0].az + ' st.')));
  L.push('  PROC Snimanje()');
  L.push('    MoveAbsJ [[0,0,0,0,30,0],[9E9,9E9,9E9,9E9,9E9,9E9]]\\NoEOffs,v200,fine,tool0;');
  jt.forEach((j, i) => {
    const ime = 'jSnimka' + String(i + 1).padStart(2, '0');
    L.push('    MoveAbsJ ' + ime + '\\NoEOffs,v100,fine,tKamera;');
    if (stol) {
      L.push('    FOR k FROM 1 TO ' + j.pz.length + ' DO');
      L.push('      WaitTime 0.5;          ! smirivanje'); L.push('      PulseDO\\PLength:=0.2, doSnimi;'); L.push('      WaitTime 0.3;');
      L.push('      PulseDO\\PLength:=0.2, doStolKorak;   ! stol +' + (360 / Math.round(+$('sk-n').value)).toFixed(1) + ' st.'); L.push('      WaitDI diStolGotov, 1;');
      L.push('    ENDFOR');
    } else { L.push('    WaitTime 0.5;'); L.push('    PulseDO\\PLength:=0.2, doSnimi;'); L.push('    WaitTime 0.3;'); }
  });
  L.push('    MoveAbsJ [[0,0,0,0,30,0],[9E9,9E9,9E9,9E9,9E9,9E9]]\\NoEOffs,v200,fine,tool0;');
  L.push('  ENDPROC'); L.push('ENDMODULE');
  rapid = L;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  $('gkod').innerHTML = L.map((l, i) => '<div' + (/^\s*!/.test(l) ? ' class="kom"' : '') + '><i>' + (i + 1) + '</i>' + esc(l) + '</div>').join('');
  $('gkod-info').textContent = L.length + ' redaka, ' + jt.length + ' položaja robota, ' + ok.length + ' snimaka. Kutovi zglobova u stupnjevima (MoveAbsJ).';
}
async function spremi(ime, tekst, poruka) {
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) { try { await dl.save({ filename: ime + '.txt', data: tekst }); poruka.textContent = 'Spremljeno. Ekstenziju .txt makni.'; } catch (e) { poruka.textContent = 'Spremanje otkazano.'; } return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/plain' }));
  a.download = ime; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  poruka.textContent = 'Spremljeno kao ' + ime + '.';
}
const imeOsnova = () => (predmetIme || 'predmet').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_');
$('gkod-izvoz').addEventListener('click', () => { if (rapid.length) spremi('FTQ_Fotogrametrija_' + imeOsnova() + '.mod', rapid.join('\r\n') + '\r\n', $('gkod-poruka')); });
$('gkod-kopiraj').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(rapid.join('\n')); $('gkod-poruka').textContent = 'RAPID je kopiran.'; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($('gkod')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $('gkod-poruka').textContent = 'Označeno — kopiraj s Ctrl+C.'; }
});
$('ply-izvoz').addEventListener('click', () => {
  if (!oblakP.n) { $('ply-poruka').textContent = 'Oblak je prazan.'; return; }
  const L = ['ply', 'format ascii 1.0', 'comment ForTroniQ - virtualni sken IRB 120 + C920, ' + predmetIme + ', mm, KS predmeta', 'element vertex ' + oblakP.n,
    'property float x', 'property float y', 'property float z', 'property uchar red', 'property uchar green', 'property uchar blue', 'end_header'];
  for (let i = 0; i < oblakP.n; i++) { const k = i * 3; L.push(oblakP.pos[k].toFixed(3) + ' ' + oblakP.pos[k + 1].toFixed(3) + ' ' + oblakP.pos[k + 2].toFixed(3) + ' ' + Math.round(oblakP.boja[k] * 255) + ' ' + Math.round(oblakP.boja[k + 1] * 255) + ' ' + Math.round(oblakP.boja[k + 2] * 255)); }
  spremi('FTQ_oblak_' + imeOsnova() + '.ply', L.join('\n') + '\n', $('ply-poruka'));
});

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
// ---------------- pogledi ----------------
function pogled(vrsta) {
  const O = cilj(), d0 = prema(O), bok = [-d0[1], d0[0], 0];
  let d, dist = 1.6, tgt = O;
  if (vrsta === 'crtez') { d = K.add(K.add(K.mul(d0, -0.7), K.mul(bok, 0.5)), [0, 0, 0.5]); dist = Math.max(0.35, (predmet ? Math.max(predmet.w, predmet.h, predmet.visina) : 80) / 1000 * 4); }
  else if (vrsta === 'ploca') { d = K.add(K.add(K.mul(d0, -0.8), K.mul(bok, 0.6)), [0, 0, 0.55]); dist = 1.15; tgt = K.add(K.mul(O, 0.55), [0, 0, 0.12]); }
  else if (vrsta === 'odozgo') { d = [0.05, -0.05, 1]; tgt = K.mul(O, 0.5); }
  else { d = K.add(bok, [0, 0, 0.25]); tgt = K.add(K.mul(O, 0.5), [0, 0, 0.15]); }
  d = K.unit(d);
  kamera.position.copy(g3w(K.add(O, K.mul(d, dist)))); upr.target.copy(g3w(tgt)); upr.update();
}
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
const mm = v => Math.round(v * 1000);

// ---------------- alat: Logitech C920 u držaču ----------------
function postaviAlat() {
  const rez = K.fk(q, ALAT.kamera);
  $('tcp-info').innerHTML = 'TCP (optičko središte kamere) u nultom položaju: x = ' + mm(rez.p[0]) + ', y = ' + mm(rez.p[1]) + ', z = ' + mm(rez.p[2]) + ' mm.<br>tooldata za RAPID: [TRUE,[[' +
    AL.vrh_t0_mm.map(v => v.toFixed(1)).join(',') + '],[0.707107,0,0.707107,0]],[0.6,[40,-60,30],[1,0,0,0],0,0,0]] (masa i težište procijenjeni).<br>Kadar C920 pri 1080p: ' + C920.hfov + '° × ' + C920.vfov + '° (dijagonala 78°).';
}

// ---------------- ulazi okretnog stola ----------------
const POLJA = { 'pl-r': 'r', 'pl-fi': 'fi', 'pl-hd': 'hd', 'pl-d': 'd' };
let tPloca = 0;
function promjenaStola() {
  for (const id in POLJA) PL[POLJA[id]] = +$(id).value;
  gradiStol(); obrisiOblak();
  clearTimeout(tPloca); tPloca = setTimeout(pripremi, 300);
}
for (const id in POLJA) {
  const el = $(id), sl = $(id + '-r');
  el.addEventListener('input', () => { if (sl) sl.value = el.value; promjenaStola(); });
  if (sl) sl.addEventListener('input', () => { el.value = sl.value; promjenaStola(); });
}
$('omotac').addEventListener('change', () => { if (omotac) omotac.visible = $('omotac').checked; });

// ---------------- učitavanje ----------------
function ucitajModel(gotovo, greska) {
  const L = new GLTFLoader();
  if (window.FTQ_GLB_B64) { const bin = Uint8Array.from(atob(window.FTQ_GLB_B64), ch => ch.charCodeAt(0)); L.parse(bin.buffer, '', gotovo, greska); }
  else L.load('irb120_skeniranje.glb', gotovo, undefined, greska);
}
ucitajModel(g => {
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (let i = 1; i <= 6; i++) zgl.push(g.scene.getObjectByName('j' + i));
  N.j6 = g.scene.getObjectByName('j6'); N.stol = g.scene.getObjectByName('l_stol');
  naStolu.add(g.scene);
  $('ucitavanje').remove();
  postaviAlat();
  promjenaStola(); obrisiOblak();
  $('model-primjer').click();
  gradiOmotac();
  pogled('ploca');
  window.FTQ_SPREMNO = true;
}, () => { $('ucitavanje').textContent = 'Model se nije mogao učitati. Stranicu otvori preko poslužitelja, ne izravno iz datoteke.'; });

function velicina() { const w = kut.clientWidth, h = kut.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(kut); velicina();
// umetak: što kamera C920 trenutno vidi (donji desni kut prikaza)
const camUmetak = new THREE.PerspectiveCamera(C920.vfov, 16 / 9, 0.02, 4);
function crtajUmetak() {
  if (!$('pr-kamera').checked || renderer.xr.isPresenting) return;
  const W = kut.clientWidth, H = kut.clientHeight, w = Math.round(Math.min(W * 0.36, 320)), h = Math.round(w * 9 / 16), x = W - w - 10, y = 10;
  poloziKameru(camUmetak, q);
  const vidljivo = oznakePoza ? oznakePoza.visible : false; if (oznakePoza) oznakePoza.visible = false;
  renderer.setScissorTest(true); renderer.setScissor(x - 2, y - 2, w + 4, h + 4); renderer.setViewport(x - 2, y - 2, w + 4, h + 4);
  renderer.setClearColor(bljesak > 0 ? 0xffffff : 0x17656e, 1); renderer.clear();
  renderer.setScissor(x, y, w, h); renderer.setViewport(x, y, w, h); renderer.setClearColor(0xeef1f2, 1); renderer.clear();
  renderer.render(scena, camUmetak);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); renderer.setClearColor(0x000000, 0);
  if (oznakePoza) oznakePoza.visible = vidljivo;
}

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
const XR_INACICA = 'skeniranje v01';
function stanjeSidra(t) { const el = $('xr-sidro'); if (el && el.textContent !== t) el.textContent = t; }
function presidri() {                     // sidro se izgubilo: model ostaje gdje je sada, novo slobodno sidro na tom mjestu
  sidroP0.copy(korijen.position);
  const e = new THREE.Euler().setFromQuaternion(korijen.quaternion, 'YXZ'); xrSmjer = e.y - xrZakret;
  pustiSidro(); korijenXR(); xr.trebaSidro = true; xr.slobodno = true; xr.presidreno++;
}
function pustiSidro() { if (xr && xr.sidro) { try { xr.sidro.delete(); } catch (e) { } } if (xr) { xr.sidro = null; xr.imaPozu = false; xr.trebaSidro = false; } }
function sidriUOkviru(frame, ref) {      // zove se u animacijskom okviru (createAnchor traži aktivan okvir)
  xr.trebaSidro = false;
  const gotovo = a => { if (!xr || !xr.postavljen) { try { a.delete(); } catch (e) { } return; } xr.sidro = a; xr.imaPozu = false; xr.izgubljeno = 0; xr.sidroStanje = 'da'; uputa.textContent = 'Stol s robotom i okretnim stolom usidren je na podu. Dodirni Snimi; obilazi ga slobodno.'; };
  const nijeUspjelo = () => { if (xr) xr.sidroStanje = 'ne'; if (xr && !xr.presidreno) uputa.textContent = 'Stol s robotom je postavljen (uređaj ne podržava sidra, pa može malo plivati). Dodirni Snimi.'; };
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
  const KANON = 'https://dos.fortroniq.hr/ar/irb120-skeniranje/';
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
  else if (mob && !navigator.xr) $('ar-poruka').textContent = 'Ovaj preglednik nema WebXR. AR sa skeniranjem radi u Chromeu na Androidu; na iPhoneu Safari to još ne podržava.';
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
        // okreni cjelinu tako da korisnik gleda okretni stol s predmetom sa suprotne strane od robota
        const d0 = prema(cilj()), d = K.unit([-d0[0] + 0.6 * d0[1], -d0[1] - 0.6 * d0[0], 0]);
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
    if (p) { krug.visible = true; krug.matrix.fromArray(p.transform.matrix); uputa.textContent = 'Dodirni krug da postaviš stol s robotom i okretnim stolom.'; } else krug.visible = false;
  }
  if (frame && xr && xr.postavljen) xrKorak(frame, renderer.xr.getReferenceSpace());
  if (xr) $('xr-napredak').textContent = $('napredak-txt').textContent;
  sunce.position.set(korijen.position.x + 1.2, korijen.position.y + 2.4, korijen.position.z + 1.4); sunce.target.position.copy(korijen.position);
  if (!renderer.xr.isPresenting) upr.update();
  renderer.render(scena, kamera);
  crtajUmetak(); if (bljesak > 0) bljesak -= dt;
});
scena.add(sunce.target);
window.FTQ_SKEN = { korijenXR, K, P, PL, prog, postavi, pripremi, oblakP, racunajPokrivenost, get pokrivenost() { return window.FTQ_POKRIVENOST; }, get q() { return q; }, snimi, pozeKamere };