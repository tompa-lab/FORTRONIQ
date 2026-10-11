// emir3d.js — eMIR na poligonu: 3D simulator mobilnog robota iz doktorata.
// Jezgra (poligoni, kinematika, LiDAR, neuronska mreža, ocjena, GA) je jezgra.js (window.EMIR), ista kao u radniku bazena (radnik.js).
// Svijet: poligon 4 × 2 m, x desno, y gore (sjever), θ od osi x suprotno kazaljci. Scena (three.js): X = x − 2, Y gore, Z = 1 − y.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as KOD from './kod.js';

const E = window.EMIR, PD = window.FTQ_EMIR || {};
const $ = id => document.getElementById(id);
const D2R = Math.PI / 180;
const br = (v, d = 1) => { const s = Math.abs(v).toFixed(d).replace('.', ','); return (v < 0 && +s.replace(',', '.') !== 0 ? '−' : '') + s; };
const tis = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, v >= 10000 ? ' ' : '');
const s3 = (x, y, h = 0) => new THREE.Vector3(x - 2, h, 1 - y);

// ---------------- scena ----------------
const kut = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
kut.insertBefore(renderer.domElement, kut.firstChild);
const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(40, 1, 0.02, 60);
const upr = new OrbitControls(kamera, renderer.domElement);
upr.enableDamping = true; upr.minDistance = 0.3; upr.maxDistance = 14; upr.maxPolarAngle = Math.PI * 0.495;
scena.add(new THREE.HemisphereLight(0xffffff, 0x8a9aa0, 1.5));
const sunce = new THREE.DirectionalLight(0xffffff, 1.7);
sunce.position.set(1.5, 4, 2.5); sunce.castShadow = true; sunce.shadow.mapSize.set(2048, 2048);
Object.assign(sunce.shadow.camera, { left: -2.6, right: 2.6, top: 1.8, bottom: -1.8, near: 0.5, far: 10 }); sunce.shadow.bias = -0.0005;
scena.add(sunce);
const dop = new THREE.DirectionalLight(0xffffff, 0.45); dop.position.set(-3, 2.5, -2); scena.add(dop);
const korijen = new THREE.Group(); scena.add(korijen);          // poligon s robotom — u AR-u se postavlja na pod kao cjelina

// ---------------- poligon ----------------
const polG = new THREE.Group(); korijen.add(polG);
const matPod = new THREE.MeshStandardMaterial({ color: 0xf5f7f7, roughness: 0.92 });
const pod = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), matPod); pod.rotation.x = -Math.PI / 2; pod.receiveShadow = true; polG.add(pod);
let sahTex = null;
function sahovnica(da) {   // pod kao u CoppeliaSimu (svijetla šahovnica 0,5 m)
  if (da && !sahTex) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#d9dcdc' : '#c9cdcd'; g.fillRect(i * 64, j * 64, 64, 64); }
    sahTex = new THREE.CanvasTexture(c); sahTex.colorSpace = THREE.SRGBColorSpace;
  }
  matPod.map = da ? sahTex : null; matPod.color.set(da ? 0xffffff : 0xf5f7f7); matPod.needsUpdate = true;
}
const mrezaPod = (() => {   // crte svakih 0,5 m
  const p = []; for (let x = 0.5; x < 4; x += 0.5) p.push(s3(x, 0, 0.001), s3(x, 2, 0.001)); for (let y = 0.5; y < 2; y += 0.5) p.push(s3(0, y, 0.001), s3(4, y, 0.001));
  const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0xc5d0d4, transparent: true, opacity: 0.9 })); polG.add(l); return l;
})();
const matZid = new THREE.MeshStandardMaterial({ color: 0xeef1f1, roughness: 0.8 }), matRub = new THREE.MeshStandardMaterial({ color: 0x24292c, roughness: 0.6 });
[[2, -0.01, 4.04, 0.02], [2, 2.01, 4.04, 0.02], [-0.01, 1, 0.02, 2], [4.01, 1, 0.02, 2]].forEach(([x, y, w, h]) => {   // zidovi 200 mm, crni rub (str. 38, 67)
  const z = new THREE.Mesh(new THREE.BoxGeometry(w, 0.19, h), matZid); z.position.copy(s3(x, y, 0.095)); z.castShadow = z.receiveShadow = true; polG.add(z);
  const r = new THREE.Mesh(new THREE.BoxGeometry(w + 0.001, 0.01, h + 0.001), matRub); r.position.copy(s3(x, y, 0.195)); polG.add(r);
});
// apsolutni koordinatni sustav (O, X, Y) u donjem lijevom kutu (sl. 26b)
(() => {
  const o = s3(0, 0, 0.003), osX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), o, 0.3, 0xd23b32, 0.06, 0.035), osY = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), o, 0.3, 0x2f9a45, 0.06, 0.035);
  polG.add(osX, osY);
})();
const objG = new THREE.Group(); polG.add(objG);
const startG = new THREE.Group(); polG.add(startG);
const BOJE = { stv: { tri: 0x2f6fd6, cir: 0x2f9a45, sq: 0xd23b32, L: 0x2b3034, J: 0x2b3034 }, sim: { tri: 0x2f6fd6, cir: 0x2f9a45, sq: 0xd23b32, L: 0xf2f4f4, J: 0xf2f4f4 } };
function gradiPoligon() {
  objG.clear(); startG.clear();
  const c = E.CONFIGS[stanje.pol], bo = BOJE[$('o-boje').value];
  c.obj.forEach(o => {
    const sh = new THREE.Shape(o.poly.map(p => new THREE.Vector2(p[0] - 2, p[1] - 1)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: bo[o.k], roughness: 0.55 })); m.castShadow = m.receiveShadow = true; objG.add(m);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: 0x1b2023, transparent: true, opacity: 0.55 })); objG.add(ed);
  });
  c.start.forEach((s, i) => {   // početni položaji 1–4 (sl. 5c): krug i strelica
    const g = new THREE.Group(); g.position.copy(s3(s[0], s[1], 0.002)); g.rotation.y = s[2];
    const sel = i === stanje.poz, col = sel ? 0xE0533D : 0x9aa9ae;
    const k = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col })); g.add(k);
    const st = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0.2, 0), new THREE.Vector2(0.13, 0.035), new THREE.Vector2(0.13, -0.035)])).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col })); g.add(st);
    startG.add(g);
  });
}

// ---------------- robot: 3D CAD i dinamički model (sl. 4a, 4b, 20, 23) ----------------
const robot = new THREE.Group(); korijen.add(robot);
const cadG = new THREE.Group(), dinG = new THREE.Group(); robot.add(cadG, dinG);
const kotaci = [];                       // [lijevi, desni] po modelu, za vrtnju
const OS_X = -0.045;                     // os pogonskih kotača iza točke C (LiDAR) [PROCJENA: d nije u radu]
function obrisPloce() {                  // 300 × 250 mm: sprijeda polukrug, straga ravno, izrezi za kotače
  const s = new THREE.Shape(), r = 0.125, cx = 0.055;
  s.moveTo(-0.12, -0.105); s.quadraticCurveTo(-0.12, -0.125, -0.10, -0.125);
  s.lineTo(-0.085, -0.125); s.lineTo(-0.085, -0.098); s.lineTo(-0.005, -0.098); s.lineTo(-0.005, -0.125);
  s.lineTo(cx, -0.125); s.absarc(cx, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-0.005, 0.125); s.lineTo(-0.005, 0.098); s.lineTo(-0.085, 0.098); s.lineTo(-0.085, 0.125);
  s.lineTo(-0.10, 0.125); s.quadraticCurveTo(-0.12, 0.125, -0.12, 0.105); s.lineTo(-0.12, -0.105);
  return s;
}
function ploca(y, deb, mat) { const g = new THREE.ExtrudeGeometry(obrisPloce(), { depth: deb, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.y = y; m.castShadow = m.receiveShadow = true; return m; }
const matCad = new THREE.MeshStandardMaterial({ color: 0xd3d8da, roughness: 0.45, metalness: 0.05 });
const matCrno = new THREE.MeshStandardMaterial({ color: 0x1d2124, roughness: 0.55 });
const matAlu = new THREE.MeshStandardMaterial({ color: 0x9fa8ad, roughness: 0.35, metalness: 0.6 });
const matGuma = new THREE.MeshStandardMaterial({ color: 0x2a2e30, roughness: 0.9 });
const matCrvena = new THREE.MeshStandardMaterial({ color: 0xb23b2a, roughness: 0.5 });
(function cad() {
  cadG.add(ploca(0.034, 0.006, matCad), ploca(0.097, 0.006, matCad));
  [[-0.105, -0.07], [-0.105, 0.07], [0.02, -0.105], [0.02, 0.105], [0.135, -0.06], [0.135, 0.06]].forEach(([x, z]) => {   // držači između ploča
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.057, 0.02), matAlu); b.position.set(x, 0.0685, z); b.castShadow = true; cadG.add(b);
  });
  [-1, 1].forEach(sm => {   // motor s reduktorom i = 71 (sl. 20b) i pogonski kotač D 80 mm s 6 rupa (sl. 4a)
    const mot = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.075, 24).rotateX(Math.PI / 2), matAlu); mot.position.set(OS_X, 0.04, sm * 0.05); cadG.add(mot);
    const kot = new THREE.Group(); kot.position.set(OS_X, 0.04, sm * 0.112);
    const guma = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.022, 40).rotateX(Math.PI / 2), matGuma); guma.castShadow = true; kot.add(guma);
    const naplatak = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.024, 36).rotateX(Math.PI / 2), matCad); kot.add(naplatak);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, h = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.026, 12).rotateX(Math.PI / 2), matCrno); h.position.set(0.019 * Math.cos(a), 0.019 * Math.sin(a), 0); kot.add(h); }
    const glav = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.027, 16).rotateX(Math.PI / 2), matAlu); kot.add(glav);
    cadG.add(kot); kotaci.push({ m: 'cad', sm, o: kot });
  });
  const vil = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, 0.026), matAlu); vil.position.set(0.128, 0.026, 0); cadG.add(vil);   // okretni kotač sprijeda
  const kk = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 24).rotateX(Math.PI / 2), matCad); kk.position.set(0.118, 0.017, 0); kk.castShadow = true; cadG.add(kk);
  // RPLIDAR A2 u točki C (sl. 23a): podnožje i rotirajuća glava s prozorom
  const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.022, 40), matCrno); l1.position.set(0, 0.114, 0); l1.castShadow = true; cadG.add(l1);
  const gl = new THREE.Group(); gl.position.set(0, 0.125, 0); cadG.add(gl);
  const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.036, 0.018, 40), matCrno); l2.position.y = 0.009; gl.add(l2);
  const pro = new THREE.Mesh(new THREE.TorusGeometry(0.0356, 0.0018, 6, 40, Math.PI * 0.55), matCrvena); pro.rotation.x = Math.PI / 2; pro.position.y = 0.009; gl.add(pro);
  cadG.userData.glava = gl;
  [[-0.1, -0.08], [-0.1, 0.08], [0.06, -0.09], [0.06, 0.09], [0.15, 0]].forEach(([x, z]) => { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.002, 10), matCrno); v.position.set(x, 0.1042, z); cadG.add(v); });
})();
(function dinamicki() {   // CoppeliaSim: kvadar, diskovi kotača, zglobovi (narančasto, plavi krajevi), točka LiDAR-a (sl. 4b)
  const tijelo = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.07, 0.25), new THREE.MeshStandardMaterial({ color: 0xdedfe0, roughness: 0.7 }));
  tijelo.position.set(0.03, 0.075, 0); tijelo.castShadow = tijelo.receiveShadow = true; dinG.add(tijelo);
  const edg = new THREE.LineSegments(new THREE.EdgesGeometry(tijelo.geometry), new THREE.LineBasicMaterial({ color: 0x404548 })); edg.position.copy(tijelo.position); dinG.add(edg);
  const matDisk = new THREE.MeshStandardMaterial({ color: 0xc4c4e6, roughness: 0.6 }), matZgl = new THREE.MeshStandardMaterial({ color: 0xe0602a, roughness: 0.5 }), matKraj = new THREE.MeshStandardMaterial({ color: 0x2a3ad0 });
  [-1, 1].forEach(sm => {
    const kot = new THREE.Group(); kot.position.set(OS_X, 0.04, sm * 0.14);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 40).rotateX(Math.PI / 2), matDisk); d.castShadow = true; kot.add(d);
    const crta = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.003, 0.013), new THREE.MeshStandardMaterial({ color: 0x8a8ab8 })); kot.add(crta);
    dinG.add(kot); kotaci.push({ m: 'din', sm, o: kot });
    const z = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 12).rotateX(Math.PI / 2), matZgl); z.position.set(OS_X, 0.04, sm * 0.12); dinG.add(z);
    const kr = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.016, 10).rotateX(Math.PI / 2), matKraj); kr.position.set(OS_X, 0.04, sm * 0.178); dinG.add(kr);
  });
  const zv = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 12), matZgl); zv.position.set(0.15, 0.06, -0.06); dinG.add(zv);
  const kv = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.016, 10), matKraj); kv.position.set(0.15, 0.128, -0.06); dinG.add(kv);
  const kd = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 24).rotateX(Math.PI / 2), matDisk); kd.position.set(0.15, 0.02, -0.06); dinG.add(kd);
  const mag = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), new THREE.MeshBasicMaterial({ color: 0xd0207a })); mag.position.set(0, 0.112, 0); dinG.add(mag);
})();
function modelRobota() {
  const v = $('o-model').value;
  cadG.visible = v !== 'din'; dinG.visible = v === 'din';
  matCad.color.set(v === 'stv' ? 0xf1f2f0 : 0xd3d8da); matCad.roughness = v === 'stv' ? 0.75 : 0.45;
}

// ---------------- LiDAR zrake, trag, odometrija ----------------
const zrakeGeo = new THREE.BufferGeometry(); zrakeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60), 3));
const zrake = new THREE.LineSegments(zrakeGeo, new THREE.LineBasicMaterial({ color: 0xd0207a, transparent: true, opacity: 0.85 })); korijen.add(zrake);
const tockeGeo = new THREE.BufferGeometry(); tockeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30), 3));
const tockeZ = new THREE.Points(tockeGeo, new THREE.PointsMaterial({ color: 0xd0207a, size: 0.025 })); korijen.add(tockeZ);
function trakCrta(boja, crt) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(3 * 2000); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setDrawRange(0, 0);
  const m = crt ? new THREE.LineDashedMaterial({ color: boja, dashSize: 0.03, gapSize: 0.02 }) : new THREE.LineBasicMaterial({ color: boja });
  const l = new THREE.Line(g, m); korijen.add(l); return { l, g, p, crt };
}
const trag = trakCrta(0x3b4a52, false), tragOdo = trakCrta(0xE0533D, true), tragNaj = trakCrta(0x2f9a45, true);
function postaviTrak(t, pts) {
  const n = Math.min(2000, pts.length);
  for (let i = 0; i < n; i++) { const q = pts[i]; t.p[i * 3] = q[0] - 2; t.p[i * 3 + 1] = 0.004; t.p[i * 3 + 2] = 1 - q[1]; }
  t.g.attributes.position.needsUpdate = true; t.g.setDrawRange(0, n); if (t.crt && n > 1) t.l.computeLineDistances();
}

// ---------------- stanje i upravljanje ----------------
const stanje = { pol: 0, poz: 0, st: null, ide: false, upr: 'nn', g: null, n: 10, lin: false, rucno: [6, 6], best: null, bestSt: null, iter: 0 };
function opcStvarni() {
  const sv = $('s-stvarni').checked;
  return sv ? { sumL: +$('s-sum').value / 1000, klizL: +$('s-kliz').value / 100, klizR: +$('s-kliz').value / 100, dR: +$('s-dr').value / 1000, kartaOdo: $('s-odo').checked, sjeme: +$('s-sjeme').value | 0 } : {};
}
function upravljac() {
  if (stanje.upr === 'rucno') return () => stanje.rucno.slice();
  const g = stanje.g, n = stanje.n, lin = stanje.lin;
  return d => { const r = E.forward(g, n, d, lin, true); stanje.akt = r; return r.out; };
}
function novaVoznja() {
  stanje.st = E.newState(E.CONFIGS[stanje.pol], stanje.poz, Object.assign(opcStvarni(), { bezZaustavljanja: stanje.upr === 'rucno', nmax: stanje.upr === 'rucno' ? 100000 : 1000 }));
  stanje.ide = false; stanje.akt = null; stanje.kraj = '';
  const L = E.lidar(E.CONFIGS[stanje.pol], stanje.st); stanje.st.lid = L;
  if (stanje.upr !== 'rucno' && stanje.g) stanje.akt = E.forward(stanje.g, stanje.n, L.d, stanje.lin, true);
  osvjezi(true); gumbKreni();
}
function korak() {
  const st = stanje.st; if (!st || st.end) return false;
  const ok = E.step(E.CONFIGS[stanje.pol], st, upravljac(), stanje.upr === 'rucno');
  if (!ok) { stanje.ide = false; zavrsetak(); gumbKreni(); }
  return ok;
}
function zavrsetak() {
  const st = stanje.st, sc = E.score(st);
  stanje.kraj = st.end;
  if (stanje.upr !== 'rucno' && (!stanje.bestSt || sc.sum > E.score(stanje.bestSt).sum)) { stanje.bestSt = st; postaviTrak(tragNaj, st.path); }
  osvjezi(true);
  dnevnik('Vožnja završena: ' + st.end + ' · ' + st.n + ' iteracija · ocjena ' + tis(sc.sum) + ' · istraženo ' + tis(st.ex) + ' ćelija');
}
function gumbKreni() { $('kreni').textContent = stanje.ide ? 'Stani' : (stanje.st && stanje.st.end ? 'Nova vožnja' : 'Jedna vožnja'); $('kreni').setAttribute('aria-pressed', stanje.ide ? 'true' : 'false'); }
$('kreni').addEventListener('click', () => {
  if (stanje.upr === 'nn' && !stanje.g) { dnevnik('Nema mreže: odaberi primjer mreže ili pokreni učenje.'); return; }
  if (stanje.st && stanje.st.end) novaVoznja();
  stanje.ide = !stanje.ide; gumbKreni();
});
$('reset').addEventListener('click', novaVoznja);
$('korak').addEventListener('click', () => { stanje.ide = false; korak(); osvjezi(); gumbKreni(); });
function dnevnik(t) { const el = $('dnevnik'), d = document.createElement('div'); d.textContent = t; el.prepend(d); while (el.children.length > 60) el.lastChild.remove(); }

// ---------------- prikaz stanja ----------------
function osvjezi(sve) {
  const st = stanje.st; if (!st) return;
  robot.position.copy(s3(st.x, st.y, 0)); robot.rotation.y = st.th;
  const L = st.lid;
  if (L) {
    const p = zrakeGeo.attributes.position.array, q = tockeGeo.attributes.position.array, h = 0.122;
    const px = $('s-odo').checked && $('s-stvarni').checked ? st.x : st.x, py = st.y;
    for (let i = 0; i < 10; i++) {
      const a = st.th + i * 36 * D2R, d = Math.min(L.d[i], 6), ex = px + Math.cos(a) * d, ey = py + Math.sin(a) * d;
      p.set([px - 2, h, 1 - py, ex - 2, h, 1 - ey], i * 6); q.set([ex - 2, h, 1 - ey], i * 3);
    }
    zrakeGeo.attributes.position.needsUpdate = true; tockeGeo.attributes.position.needsUpdate = true;
  }
  postaviTrak(trag, st.path.concat([[st.x, st.y]]));
  postaviTrak(tragOdo, $('s-stvarni').checked ? st.opath.concat([[st.ox, st.oy]]) : []);
  const sc = E.score(st);
  $('i-n').textContent = st.n; $('napredak').value = st.n; $('napredak').max = stanje.upr === 'rucno' ? Math.max(1000, st.n) : 1000;
  $('napredak-txt').textContent = 'iteracija ' + st.n + ' / 1000 · t = ' + br(st.n * E.DT, 1) + ' s';
  $('prog-info').innerHTML = 'x <b>' + br(st.x, 3) + '</b> m · y <b>' + br(st.y, 3) + '</b> m · θ <b>' + br(((st.th / D2R) % 360 + 540) % 360 - 180, 0) + '°</b> · ω<sub>L</sub> <b>' + br(st.wl, 2) + '</b> ω<sub>R</sub> <b>' + br(st.wr, 2) + '</b> rad/s · v <b>' + br((st.v || 0) * 1000, 0) + '</b> mm/s · ω <b>' + br((st.w || 0) / D2R, 0) + '</b> °/s' +
    (L ? ' · najbliže <b>' + br(Math.min(...L.d), 3) + ' m</b>' : '') + (st.end ? ' · <span class="upoz">' + st.end + '</span>' : '');
  if ($('s-stvarni').checked) $('prog-info').innerHTML += ' · odometrija griješi <b>' + br(Math.hypot(st.x - st.ox, st.y - st.oy) * 100, 1) + ' cm</b>';
  ocjenaTablica(sc);
  if (sve || st.n % 3 === 0 || st.end) { crtajKartu(); crtajMrezu(); govor(); }
}
function ocjenaTablica(sc) {
  const r = (ime, raw, val) => '<tr><th>' + ime + '</th><td>' + raw + '</td><td>' + tis(val) + '</td></tr>';
  $('ocjena').innerHTML = '<thead><tr><th>Član jedn. (18)</th><th>Iznos</th><th>Bodovi</th></tr></thead><tbody>' +
    r('A·V̄ brzina (A = 50)', br(sc.Vr, 2), sc.V) + r('B·ω̄ razlika (B = 50)', br(sc.Difr, 2), sc.Dif) + r('C<sup>ex</sup> istraženost (C = 1,000488)', tis(sc.exr) + ' ćel.', sc.ex) +
    r('petlje n/2', sc.nr, sc.n) + r('udaljenost d/2', br(sc.dr, 0) + ' cm', sc.d) + r('D·ᾱ kut (D = 1)', br(sc.ar, 2), sc.a) + '</tbody><tfoot><tr><th>Ukupno</th><td></td><td><b>' + tis(sc.sum) + '</b></td></tr></tfoot>';
}

// ---------------- kognitivna karta (200 × 100 ćelija po 2 cm, sl. 25, 27) ----------------
const kc = $('karta'), kx = kc.getContext('2d');
const slikaKarte = kx.createImageData(200, 100);
const HEX = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
function crtajKartu() {
  const st = stanje.st; if (!st) return;
  const nac = $('k-nacin').value, src = nac === 'best' && stanje.bestSt ? stanje.bestSt : st, c = E.CONFIGS[stanje.pol], D = slikaKarte.data;
  const bo = BOJE.stv;
  for (let gy = 0; gy < 100; gy++) for (let gx = 0; gx < 200; gx++) {
    const id = gy * 200 + gx, k = ((99 - gy) * 200 + gx) * 4;
    let col = ((gx >> 3) + (gy >> 3)) % 2 ? [232, 236, 237] : [244, 246, 246];               // šahovnica pozadine (space_map 1/2)
    if (nac !== 'objekti' && src.seen[id]) col = [255, 255, 255];
    if (nac === 'slobodno') { if (src.seen[id]) col = [208, 240, 214]; }
    const o = src.occ[id];
    if (o && nac !== 'slobodno') col = o === 1 ? [40, 44, 46] : HEX(bo[c.obj[o - 2].k]);
    D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = 255;
  }
  const tmp = crtajKartu.tmp || (crtajKartu.tmp = document.createElement('canvas')); tmp.width = 200; tmp.height = 100; tmp.getContext('2d').putImageData(slikaKarte, 0, 0);
  const W = kc.width = kc.clientWidth * (devicePixelRatio || 1), H = kc.height = W / 2, s = W / 4;
  kx.imageSmoothingEnabled = false; kx.drawImage(tmp, 0, 0, W, H);
  kx.strokeStyle = 'rgba(230,140,40,.9)'; kx.lineWidth = Math.max(1, W / 400);   // 3 × 3 područja (sl. 25, 27e)
  [1 / 3, 2 / 3].forEach(f => { kx.beginPath(); kx.moveTo(W * f, 0); kx.lineTo(W * f, H); kx.moveTo(0, H * f); kx.lineTo(W, H * f); kx.stroke(); });
  const X = x => x * s, Y = y => H - y * s;
  if (nac === 'objekti') klasifikacija(src).forEach(r => {
    kx.strokeStyle = '#E0533D'; kx.lineWidth = Math.max(1.5, W / 300); kx.strokeRect(X(r.bb[0]), Y(r.bb[3]), (r.bb[2] - r.bb[0]) * s, (r.bb[3] - r.bb[1]) * s);
    kx.fillStyle = '#10394A'; kx.font = (W / 55) + 'px "IBM Plex Sans", sans-serif'; kx.fillText(r.oznaka + ' ' + br(r.omjer, 2), X(r.bb[0]), Y(r.bb[3]) - 4);
  });
  const path = src.path; kx.strokeStyle = '#3b4a52'; kx.lineWidth = Math.max(1, W / 450); kx.beginPath(); path.forEach((p, i) => i ? kx.lineTo(X(p[0]), Y(p[1])) : kx.moveTo(X(p[0]), Y(p[1]))); kx.stroke();
  if ($('s-stvarni').checked && src.opath) { kx.strokeStyle = '#E0533D'; kx.setLineDash([5, 4]); kx.beginPath(); src.opath.forEach((p, i) => i ? kx.lineTo(X(p[0]), Y(p[1])) : kx.moveTo(X(p[0]), Y(p[1]))); kx.stroke(); kx.setLineDash([]); }
  kx.fillStyle = '#E0533D'; kx.beginPath(); kx.arc(X(src.x), Y(src.y), W / 120, 0, 7); kx.fill();
  $('k-info').textContent = 'Istraženo ' + tis(src.ex) + ' od 20 000 ćelija (' + br(src.ex / 200, 1) + ' %)' + (nac === 'best' ? ' · najbolja vožnja' : '');
}
// klasifikacija objekata (tab. 2): omjer površine obuhvatnog pravokutnika i površine objekta
const NAZIV = { tri: 'trokut', cir: 'krug', sq: 'kvadrat', L: 'L-poligon', J: 'zaobljeni poligon' };
const BOJA_IME = { stv: { tri: 'plavi', cir: 'zeleni', sq: 'crveni', L: 'crni', J: 'crni' } };
function klasifikacija(st) {
  const c = E.CONFIGS[stanje.pol], cnt = c.obj.map(() => 0), tot = c.obj.map(o => Math.round(perimetar(o.poly) / E.CELL));
  for (let i = 0; i < st.occ.length; i++) if (st.occ[i] >= 2) cnt[st.occ[i] - 2]++;
  const out = [];
  c.obj.forEach((o, i) => {
    const vid = cnt[i] / tot[i]; if (vid < 0.12) return;                      // dovoljno ruba viđeno [PROCJENA]
    const om = (o.bb[2] - o.bb[0]) * (o.bb[3] - o.bb[1]) / o.area;
    let kl = 'nepoznat'; for (const k in E.RATIO) if (om >= E.RATIO[k][1] && om <= E.RATIO[k][2]) kl = k;
    out.push({ k: o.k, bb: o.bb, omjer: om, kl, vid, oznaka: kl === 'nepoznat' ? 'nepoznat' : NAZIV[kl], c: o.c });
  });
  return out;
}
function perimetar(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; }
const STRANA = [['jugozapadno', 'južno', 'jugoistočno'], ['zapadno', 'u središtu', 'istočno'], ['sjeverozapadno', 'sjeverno', 'sjeveroistočno']];
function govor() {
  const st = stanje.st; if (!st) return;
  const r = klasifikacija(st), bo = $('o-boje').value === 'sim' ? { tri: 'plavi', cir: 'zeleni', sq: 'crveni', L: 'bijeli', J: 'bijeli' } : BOJA_IME.stv;
  $('govor').textContent = r.length ? r.map(o => {
    const i = Math.min(2, Math.floor(o.c[1] / (2 / 3))), j = Math.min(2, Math.floor(o.c[0] / (4 / 3)));
    const ime = o.kl === 'nepoznat' ? 'nepoznat objekt' : bo[o.k] + ' ' + NAZIV[o.kl];
    return ime.charAt(0).toUpperCase() + ime.slice(1) + ' ' + STRANA[i][j] + ' (omjer ' + br(o.omjer, 2) + ', viđeno ' + Math.round(Math.min(1, o.vid) * 100) + ' % ruba)';
  }).join('\n') : 'eMIR još nije vidio nijedan objekt.';
}
$('k-nacin').addEventListener('change', () => crtajKartu());

// ---------------- neuronska mreža uživo (Show NN) i ulazna funkcija ----------------
const nc = $('nn'), nx = nc.getContext('2d');
function crtajMrezu() {
  const W = nc.width = nc.clientWidth * (devicePixelRatio || 1), H = nc.height = nc.clientHeight * (devicePixelRatio || 1);
  nx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--ink').trim() || '#10394A', body = cs.getPropertyValue('--body').trim() || '#5D7C90';
  const n = stanje.upr === 'rucno' ? 0 : stanje.n, g = stanje.g, a = stanje.akt;
  if (!n || !g) { nx.fillStyle = body; nx.font = (W / 40) + 'px "IBM Plex Sans", sans-serif'; nx.fillText(stanje.upr === 'rucno' ? 'Ručna vožnja: mreža ne upravlja.' : 'Nema mreže.', 20, H / 2); return; }
  const sl = [10, n, n, 2], xs = [0.13, 0.39, 0.64, 0.86].map(f => f * W), pos = sl.map((m, k) => Array.from({ length: m }, (_, i) => [xs[k], H * (0.08 + 0.84 * (m === 1 ? 0.5 : i / (m - 1)))]));
  const vals = a ? [Array.from(a.inp), Array.from(a.h1), Array.from(a.h2), Array.from(a.out)] : null;
  let o = 0; const off = [0, 10 * n + n, 10 * n + n + n * n + n];
  for (let k = 0; k < 3; k++) {
    const m1 = sl[k], m2 = sl[k + 1], base = off[k];
    for (let i = 0; i < m1; i++) for (let j = 0; j < m2; j++) {
      const w = g[base + i * m2 + j], al = Math.min(0.9, Math.abs(w) * 0.5) * (vals ? Math.min(1, 0.25 + Math.abs(vals[k][i]) / 8) : 0.6);
      nx.strokeStyle = w > 0 ? 'rgba(23,101,110,' + al + ')' : 'rgba(224,83,61,' + al + ')'; nx.lineWidth = Math.max(0.5, W / 900);
      nx.beginPath(); nx.moveTo(pos[k][i][0], pos[k][i][1]); nx.lineTo(pos[k + 1][j][0], pos[k + 1][j][1]); nx.stroke();
    }
  }
  const r = Math.max(3, Math.min(H / 40, W / 70));
  pos.forEach((L, k) => L.forEach((p, i) => {
    const v = vals ? vals[k][i] : 0, t = k === 3 ? v / 10 : Math.tanh(Math.abs(v) / 4);
    nx.fillStyle = k === 3 ? 'rgba(46,202,212,' + (0.25 + 0.75 * t) + ')' : v >= 0 ? 'rgba(23,101,110,' + (0.2 + 0.8 * t) + ')' : 'rgba(224,83,61,' + (0.2 + 0.8 * t) + ')';
    nx.strokeStyle = ink; nx.lineWidth = 1; nx.beginPath(); nx.arc(p[0], p[1], r, 0, 7); nx.fill(); nx.stroke();
  }));
  nx.fillStyle = ink; nx.font = Math.max(10, W / 60) + 'px "IBM Plex Sans", sans-serif'; nx.textAlign = 'right';
  if (stanje.st && stanje.st.lid) pos[0].forEach((p, i) => nx.fillText(br(stanje.st.lid.d[i], 2) + ' m', p[0] - r - 4, p[1] + 4));
  nx.textAlign = 'left'; if (vals) pos[3].forEach((p, i) => nx.fillText((i ? 'ωR ' : 'ωL ') + br(vals[3][i], 1), p[0] + r + 4, p[1] + 4));
  nx.textAlign = 'center'; nx.fillStyle = body;
  ['LiDAR 10', n + ' neurona', n + ' neurona', 'kotači'].forEach((t, k) => nx.fillText(t, xs[k], H - 2));
}
function crtajUlaznu() {
  const c = $('ulazna'), x = c.getContext('2d'), W = c.width = c.clientWidth * (devicePixelRatio || 1), H = c.height = c.clientHeight * (devicePixelRatio || 1);
  const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--body').trim(), rule = cs.getPropertyValue('--rule').trim();
  const L = W * 0.1, R = W * 0.97, T = H * 0.08, B = H * 0.84, X = d => L + (R - L) * d / 3, Y = v => B - (B - T) * (v + 8) / 16;
  x.strokeStyle = rule; x.lineWidth = 1; x.font = Math.max(10, W / 45) + 'px "IBM Plex Sans", sans-serif'; x.fillStyle = ink;
  [-8, 0, 8].forEach(v => { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(R, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(String(v).replace('-', '−'), L - 4, Y(v) + 4); });
  [0, 1, 2, 3].forEach(d => { x.textAlign = 'center'; x.fillText(d + ' m', X(d), B + 14); });
  [[false, '#17656E'], [true, '#E0533D']].forEach(([lin, col]) => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 120; i++) { const d = 3 * i / 120, v = E.inF(d, lin); i ? x.lineTo(X(d), Y(v)) : x.moveTo(X(d), Y(v)); } x.stroke(); });
  if (stanje.st && stanje.st.lid) { x.fillStyle = stanje.lin ? '#E0533D' : '#17656E'; Array.from(stanje.st.lid.d).forEach(d => { const dd = Math.min(d, 3); x.beginPath(); x.arc(X(dd), Y(E.inF(d, stanje.lin)), 3, 0, 7); x.fill(); }); }
}

// ---------------- mreže: primjeri, učitavanje, izvoz težina ----------------
function postaviMrezu(g, n, lin, opis) {
  if (!ucenje.radi && g !== ucenje.najbolja) { ucenje.najbolja = null; }
  stanje.g = g; stanje.n = n; stanje.lin = lin; $('m-opis').textContent = opis + ' · ' + n + '×' + n + ', ' + E.nW(n) + ' težina, ulazna funkcija ' + (lin ? 'linearna' : 'sigmoidna') + '.';
  izvozKoda(); novaVoznja(); gumbiUcenja();
}
function primjer() {
  const k = $('m-primjer').value, P = (PD.mreze || {})[k];
  if (!P) return;
  postaviMrezu(Float64Array.from(P.g), P.n, !!P.lin, P.opis);
}
$('m-primjer').addEventListener('change', primjer);
$('m-ucitaj').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => {
    const v = t.split(/[\s,;]+/).map(Number).filter(x => isFinite(x) && x !== 0 || x === 0).filter((x, i, a) => !isNaN(x));
    const n = [5, 10, 15].find(m => E.nW(m) === v.length);
    if (!n) { dnevnik('Datoteka ima ' + v.length + ' brojeva; mreža 5×5 traži 97, 10×10 242, 15×15 437.'); return; }
    postaviMrezu(Float64Array.from(v), n, $('u-fun').value === 'lin', 'Učitano iz ' + f.name);
  });
});

// ---------------- učenje: neuroevolucija s bazenom računala (Web Workers) ----------------
const ucenje = { radi: false, gen: 0, pop: [], oc: [], dijelovi: [], povijest: [], radnici: [], najbolja: null, druga: null };
function radnici(k) {
  while (ucenje.radnici.length < k) { const w = new Worker('radnik.js?v=01'); ucenje.radnici.push(w); }
  while (ucenje.radnici.length > k) ucenje.radnici.pop().terminate();
}
function zadaci() {   // poligoni za učenje (simultano, str. 85) i početni položaj
  const pol = [0, 1, 2].filter(i => $('u-p' + (i + 1)).checked), poz = $('u-poz').value;
  const z = []; pol.forEach(p => { if (poz === 'svi') for (let s = 0; s < 4; s++) z.push([p, s]); else z.push([p, +poz]); });
  return z.length ? z : [[0, 0]];
}
function ocijeni(mreze, n, lin) {   // raspodjela na radnike (kao na 30 računala, str. 65)
  const k = ucenje.radnici.length, z = zadaci(), dio = Math.ceil(mreze.length / k), t0 = performance.now();
  return Promise.all(ucenje.radnici.map((w, i) => new Promise(ok => {
    const m = mreze.slice(i * dio, (i + 1) * dio); if (!m.length) { ok({ oc: [], dijelovi: [] }); return; }
    w.onmessage = e => ok(e.data); w.postMessage({ id: i, mreze: m, n, lin, zadaci: z });
  }))).then(r => ({ oc: [].concat(...r.map(x => x.oc)), dijelovi: [].concat(...r.map(x => x.dijelovi)), ms: performance.now() - t0, cpu: r.reduce((s, x) => s + (x.ms || 0), 0) }));
}
function mutiraj(g, K, nacin, sig) {
  const m = new Float64Array(g);
  for (let j = 0; j < K; j++) { const i = Math.floor(Math.random() * g.length); m[i] = nacin === 'pomak' ? Math.max(-3, Math.min(3, m[i] + E.gauss(Math.random) * sig)) : E.rnd(); }
  return m;
}
async function uci(novo) {
  if (ucenje.radi) return;
  const n = +$('u-n').value, lin = $('u-fun').value === 'lin', P0 = +$('u-p0').value, P = +$('u-pop').value, K = +$('u-mut').value, nac = $('u-mnacin').value, sig = +$('u-sig').value;
  radnici(+$('u-radnici').value);
  if (novo || !ucenje.najbolja || ucenje.n !== n || ucenje.lin !== lin) {
    ucenje.gen = 0; ucenje.povijest = []; ucenje.n = n; ucenje.lin = lin; ucenje.najbolja = null;
    if (!novo && stanje.g && stanje.n === n && stanje.lin === lin) {   // Continue (sl. 25): nastavak od mreže koja je sada u robotu
      ucenje.pop = [Float64Array.from(stanje.g)]; while (ucenje.pop.length < P) ucenje.pop.push(mutiraj(stanje.g, K, nac, sig));
    } else ucenje.pop = Array.from({ length: P0 }, () => E.randG(n));     // New: 0. generacija, slučajne težine [−0,999; 0,999] (str. 49)
  }
  ucenje.radi = true; gumbiUcenja();
  while (ucenje.radi) {
    $('u-stat').textContent = 'Generacija ' + ucenje.gen + ': ocjenjujem ' + ucenje.pop.length + ' mreža na ' + ucenje.radnici.length + ' radnika…';
    const r = await ocijeni(ucenje.pop, n, lin);
    let idx = r.oc.map((s, i) => i).sort((a, b) => r.oc[b] - r.oc[a]);
    const b = ucenje.pop[idx[0]], s2 = ucenje.pop[idx[1] ?? idx[0]], sb = r.oc[idx[0]], ss = r.oc[idx[1] ?? idx[0]];
    if (!ucenje.najbolja || sb >= ucenje.najboljaOc) { ucenje.najbolja = b; ucenje.najboljaOc = sb; ucenje.dio = r.dijelovi[idx[0]]; }   // elitizam (sl. 15)
    ucenje.druga = s2; ucenje.drugaOc = ss;
    ucenje.povijest.push({ gen: ucenje.gen, best: sb, second: ss, avg: r.oc.reduce((s, x) => s + x, 0) / r.oc.length, dio: r.dijelovi[idx[0]], ms: r.ms, cpu: r.cpu, pop: ucenje.pop.length });
    $('u-stat').innerHTML = 'Generacija <b>' + ucenje.gen + '</b> · populacija ' + ucenje.pop.length + ' · najbolja u generaciji <b>' + tis(sb) + '</b> · druga ' + tis(ss) + ' · najbolja do sada <b>' + tis(ucenje.najboljaOc) + '</b><br>' +
      'Vrijeme generacije ' + br(r.ms / 1000, 1) + ' s na ' + ucenje.radnici.length + ' radnika (jedan radnik: ~' + br(r.cpu / 1000, 1) + ' s, ubrzanje ' + br(r.cpu / r.ms, 1) + '×)';
    grafUcenja();
    postaviMrezu(ucenje.najbolja, n, lin, 'Najbolja mreža iz učenja (generacija ' + ucenje.gen + ', ocjena ' + tis(ucenje.najboljaOc) + ')');
    stanje.ide = $('u-voznja').checked; gumbKreni();
    // sljedeća generacija: križanje najbolje i druge (sl. 14) pa mutacija (sl. 16); n-ta generacija ima P članova (sl. 17)
    const dijete = E.crossover(ucenje.najbolja, s2, Math.max(1, ucenje.najboljaOc), Math.max(1, ss));
    ucenje.pop = [ucenje.najbolja, dijete];
    while (ucenje.pop.length < P) ucenje.pop.push(mutiraj(Math.random() < 0.5 ? dijete : ucenje.najbolja, K, nac, sig));
    ucenje.gen++;
    if (+$('u-gen').value && ucenje.gen >= +$('u-gen').value) ucenje.radi = false;
  }
  gumbiUcenja();
}
function gumbiUcenja() { $('u-novo').disabled = ucenje.radi; $('u-nastavi').disabled = ucenje.radi || !(ucenje.najbolja || stanje.g); $('u-stani').disabled = !ucenje.radi; }
$('u-novo').addEventListener('click', () => uci(true));
$('u-nastavi').addEventListener('click', () => uci(false));
$('u-stani').addEventListener('click', () => { ucenje.radi = false; $('u-stat').textContent += ' · zaustavljam nakon ove generacije'; });
$('u-mnacin').addEventListener('change', () => $('u-sig-red').hidden = $('u-mnacin').value !== 'pomak');
(function () { const c = navigator.hardwareConcurrency || 4, s = $('u-radnici'); for (let i = 1; i <= Math.min(32, Math.max(2, c)); i++) { const o = document.createElement('option'); o.value = i; o.textContent = i + (i === 1 ? ' (jedno računalo)' : ''); s.appendChild(o); } s.value = Math.max(1, Math.min(c - 1, 8)); })();

// graf: ocjena kroz generacije uz krivulje iz rada (sl. 30, 31)
function grafUcenja() {
  const c = $('g-ucenje'), x = c.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), W = c.clientWidth, H = c.clientHeight;
  c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--body').trim() || '#5D7C90', rule = cs.getPropertyValue('--rule').trim() || '#DCE4E8';
  const n = +$('u-n').value, lin = $('u-fun').value === 'lin', rad = (PD.rad || {})[(lin ? 'lin' : 'sig') + n] || [];
  const P = ucenje.povijest; let gmax = Math.max(6, P.length, rad.length), ymax = 17000;
  const L = 46, R = 10, T = 10, B = 26, X = g => L + (W - L - R) * g / gmax, Y = v => T + (H - T - B) * (1 - v / ymax);
  x.font = '11px "IBM Plex Sans", sans-serif'; x.fillStyle = ink; x.strokeStyle = rule;
  for (let v = 0; v <= ymax; v += 4000) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(W - R, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(tis(v), L - 5, Y(v) + 4); }
  for (let g = 0; g <= gmax; g += Math.max(1, Math.round(gmax / 8))) { x.textAlign = 'center'; x.fillText(g, X(g), H - 8); }
  x.textAlign = 'right'; x.fillText('generacija', W - R, H - 8 - 12);
  const crta = (pts, col, crt) => { x.strokeStyle = col; x.lineWidth = 2; x.setLineDash(crt ? [6, 4] : []); x.beginPath(); pts.forEach(([g, v], i) => i ? x.lineTo(X(g), Y(v)) : x.moveTo(X(g), Y(v))); x.stroke(); x.setLineDash([]); };
  if (rad.length) crta(rad.map((v, i) => [i + 1, v]), '#9aa9ae', true);
  crta(P.map(p => [p.gen, p.avg]), '#C9D3D7', false);
  crta(P.map(p => [p.gen, p.second]), '#2ECAD4', false);
  crta(P.map(p => [p.gen, p.best]), '#17656E', false);
  $('g-ucenje-leg').innerHTML = '<span><i style="background:#17656E"></i>najbolja</span><span><i style="background:#2ECAD4"></i>druga najbolja</span><span><i style="background:#C9D3D7"></i>prosjek populacije</span>' + (rad.length ? '<span><i style="background:#9aa9ae"></i>rad, ' + n + '×' + n + ' ' + (lin ? 'linearna' : 'sigmoidna') + ' (sl. ' + (lin ? 30 : 31) + ', očitano s grafa)</span>' : '');
}
['u-n', 'u-fun'].forEach(id => $(id).addEventListener('change', grafUcenja));

// ---------------- postavke ----------------
function postaviPoligon() { stanje.pol = +$('o-pol').value; stanje.poz = +$('o-poz').value; stanje.bestSt = null; postaviTrak(tragNaj, []); gradiPoligon(); novaVoznja(); }
['o-pol', 'o-poz'].forEach(id => $(id).addEventListener('change', postaviPoligon));
$('o-boje').addEventListener('change', () => { gradiPoligon(); govor(); });
$('o-model').addEventListener('change', modelRobota);
$('o-pod').addEventListener('change', e => sahovnica(e.target.value === 'sah'));
$('o-zrake').addEventListener('change', e => { zrake.visible = tockeZ.visible = e.target.checked; });
$('o-trag').addEventListener('change', e => { trag.l.visible = e.target.checked; tragNaj.l.visible = e.target.checked; });
$('o-upr').addEventListener('change', e => { stanje.upr = e.target.value; document.querySelectorAll('.samo-rucno').forEach(el => el.hidden = stanje.upr !== 'rucno'); novaVoznja(); });
['s-stvarni', 's-sum', 's-kliz', 's-dr', 's-odo', 's-sjeme'].forEach(id => $(id).addEventListener('change', () => { document.querySelectorAll('.samo-stv').forEach(el => el.hidden = !$('s-stvarni').checked); novaVoznja(); }));
['r-l', 'r-d'].forEach((id, i) => $(id).addEventListener('input', e => { stanje.rucno[i] = +e.target.value; $(id + '-out').textContent = br(+e.target.value, 1); }));
const tipke = {};
addEventListener('keydown', e => {
  if (stanje.upr !== 'rucno' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase(); if (!'wasd '.includes(k)) return; tipke[k] = true; e.preventDefault(); rucneTipke();
  if (!stanje.ide) { if (!stanje.st || stanje.st.end) novaVoznja(); stanje.ide = true; gumbKreni(); }
});
addEventListener('keyup', e => { tipke[e.key.toLowerCase()] = false; rucneTipke(); });
function rucneTipke() {
  let l = 0, d = 0; if (tipke.w) { l += 8; d += 8; } if (tipke.s) { l -= 6; d -= 6; } if (tipke.a) { l -= 4; d += 4; } if (tipke.d) { l += 4; d -= 4; }
  if (tipke.w || tipke.s || tipke.a || tipke.d) { stanje.rucno = [Math.max(-10, Math.min(10, l)), Math.max(-10, Math.min(10, d))]; $('r-l').value = stanje.rucno[0]; $('r-d').value = stanje.rucno[1]; $('r-l-out').textContent = br(stanje.rucno[0], 1); $('r-d-out').textContent = br(stanje.rucno[1], 1); }
  else if (!tipke[' ']) { stanje.rucno = [+$('r-l').value, +$('r-d').value]; }
}

// ---------------- pogledi i kamere ----------------
let prati = false;
function pogled(v) {
  prati = v === 'prati'; $('prati').setAttribute('aria-pressed', prati ? 'true' : 'false'); if (prati) return;
  const t = new THREE.Vector3(0, 0.05, 0).add(korijen.position);
  const hf = 2 * Math.atan(Math.tan(kamera.fov * D2R / 2) * kamera.aspect), fov = Math.min(kamera.fov * D2R, hf);
  const smjer = v === 'odozgo' ? new THREE.Vector3(0, 1, 0.002) : v === 'bok' ? new THREE.Vector3(0, 0.3, 1) : new THREE.Vector3(-0.35, 0.95, 1);
  const r = v === 'odozgo' ? Math.max(2.05 / Math.tan(hf / 2) / 1.0, 1.05 / Math.tan(kamera.fov * D2R / 2)) : 2.15 / Math.sin(fov / 2) * (kamera.aspect < 1.2 ? 1.0 : 0.88);
  kamera.position.copy(smjer.normalize().multiplyScalar(r));
  kamera.position.add(korijen.position); upr.target.copy(t); upr.update();
}
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('prati').addEventListener('click', () => pogled(prati ? 'kosi' : 'prati'));
const zadnji = new THREE.Vector3();
const camFPV = new THREE.PerspectiveCamera(55, 16 / 9, 0.02, 20);     // kamera na robotu: 55° stvarna, 120° u simulaciji (str. 39)
camFPV.position.set(0.15, 0.115, 0); camFPV.rotation.set(0, -Math.PI / 2, 0); robot.add(camFPV);
function fpvKut() { const v = +$('o-fpv').value; camFPV.fov = v * 9 / 16 > 0 ? 2 * Math.atan(Math.tan(v * D2R / 2) * 9 / 16) / D2R : 40; camFPV.updateProjectionMatrix(); }
$('o-fpv').addEventListener('change', fpvKut);
function velicina() { const w = kut.clientWidth, h = kut.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(kut); velicina();
function crtajUmetak() {
  if (!$('o-kamera').checked || renderer.xr.isPresenting) return;
  const W = kut.clientWidth, H = kut.clientHeight, w = Math.round(Math.min(W * 0.32, 280)), h = Math.round(w * 9 / 16), x = W - w - 10, y = 10;
  zrake.visible = tockeZ.visible = false; cadG.userData.skriven = true;
  renderer.setScissorTest(true); renderer.setScissor(x - 2, y - 2, w + 4, h + 4); renderer.setViewport(x - 2, y - 2, w + 4, h + 4); renderer.setClearColor(0x17656e, 1); renderer.clear();
  renderer.setScissor(x, y, w, h); renderer.setViewport(x, y, w, h); renderer.setClearColor(0xe9eef0, 1); renderer.clear(); renderer.render(scena, camFPV);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); renderer.setClearColor(0x000000, 0);
  zrake.visible = tockeZ.visible = $('o-zrake').checked;
}

// ---------------- vježbe iz doktorata ----------------
function postaviVjezbu(v) {
  const V = (PD.vjezbe || []).find(x => x.id === v); if (!V) return;
  const p = V.postavke || {};
  Object.keys(p).forEach(id => { const el = $(id); if (!el) return; if (el.type === 'checkbox') el.checked = !!p[id]; else el.value = p[id]; el.dispatchEvent(new Event('change')); });
  $('vj-tekst').innerHTML = V.html; $('vj-tekst').hidden = false;
  document.querySelectorAll('[data-vj]').forEach(b => b.setAttribute('aria-pressed', b.dataset.vj === v ? 'true' : 'false'));
  $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('[data-vj]').forEach(b => b.addEventListener('click', () => postaviVjezbu(b.dataset.vj)));

// ---------------- izvoz: Python, CoppeliaSim, težine ----------------
const IZVOZ = {
  sim: () => KOD.pythonSim(stanje), copp: () => KOD.pythonCoppelia(stanje), lua: () => KOD.luaScena(stanje), tez: () => KOD.tezine(stanje)
};
const DAT = { sim: 'emir_sim.py', copp: 'emir_coppeliasim.py', lua: 'emir_scena_coppeliasim.lua', tez: 'emir_tezine.txt' };
let kodSad = '';
function izvozKoda() {
  const v = $('kod-izbor').value; kodSad = stanje.g || v === 'lua' ? IZVOZ[v]() : '';
  const el = $('kod'); el.innerHTML = '';
  kodSad.split('\n').slice(0, 2000).forEach((r, i) => { const d = document.createElement('div'); d.innerHTML = '<i>' + (i + 1) + '</i>'; const s = document.createElement('span'); s.textContent = r; if (/^\s*(#|--)/.test(r)) s.className = 'kom'; d.appendChild(s); el.appendChild(d); });
  $('kod-opis').innerHTML = KOD.OPIS[v];
}
$('kod-izbor').addEventListener('change', izvozKoda);
$('kod-izvoz').addEventListener('click', () => { if (!kodSad) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([kodSad], { type: 'text/plain' })); a.download = DAT[$('kod-izbor').value]; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); });
$('kod-kopiraj').addEventListener('click', e => { if (!kodSad || !navigator.clipboard) return; navigator.clipboard.writeText(kodSad).then(() => { const s = e.target.textContent; e.target.textContent = 'Kopirano'; setTimeout(() => e.target.textContent = s, 1200); }); });

// ---------------- proširena stvarnost (WebXR): poligon 4 × 2 m na podu ----------------
const krug = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.14, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2ECAD4 }));
krug.matrixAutoUpdate = false; krug.visible = false; scena.add(krug);
let xr = null, xrSmjer = 0, xrZakret = 0, xrMjerilo = 1;
const sidroP0 = new THREE.Vector3(), sidroSad = new THREE.Matrix4(), sidroInv0 = new THREE.Matrix4(), korM = new THREE.Matrix4(), pomM = new THREE.Matrix4();
function korijenXR() {
  korM.makeRotationY(xrSmjer + xrZakret).scale(new THREE.Vector3(xrMjerilo, xrMjerilo, xrMjerilo)).setPosition(sidroP0);
  if (xr && xr.sidro && xr.imaPozu) korM.premultiply(pomM.multiplyMatrices(sidroSad, sidroInv0));
  korM.decompose(korijen.position, korijen.quaternion, korijen.scale);
}
const XR_INACICA = 'emir v01';
function stanjeSidra(t) { const el = $('xr-sidro'); if (el && el.textContent !== t) el.textContent = t; }
function pustiSidro() { if (xr && xr.sidro) { try { xr.sidro.delete(); } catch (e) { } } if (xr) { xr.sidro = null; xr.imaPozu = false; xr.trebaSidro = false; } }
function presidri() { sidroP0.copy(korijen.position); const e = new THREE.Euler().setFromQuaternion(korijen.quaternion, 'YXZ'); xrSmjer = e.y - xrZakret; pustiSidro(); korijenXR(); xr.trebaSidro = true; xr.slobodno = true; xr.presidreno++; }
const sloj = $('xr-sloj'), uputa = $('xr-uputa'), xrGumb = $('xr-gumb');
function sidriUOkviru(frame, ref) {
  xr.trebaSidro = false;
  const gotovo = a => { if (!xr || !xr.postavljen) { try { a.delete(); } catch (e) { } return; } xr.sidro = a; xr.imaPozu = false; xr.izgubljeno = 0; xr.sidroStanje = 'da'; uputa.textContent = 'Poligon je usidren na podu. Dodirni Vožnja; obilazi ga slobodno.'; };
  const nijeUspjelo = () => { if (xr) xr.sidroStanje = 'ne'; if (xr && !xr.presidreno) uputa.textContent = 'Poligon je postavljen (uređaj ne podržava sidra, pa može malo plivati).'; };
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
  const KANON = 'https://dos.fortroniq.hr/ar/emir/', adresa = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.href.split('#')[0] : KANON;
  try { if (window.qrcode) { const qq = qrcode(0, 'M'); qq.addData(adresa); qq.make(); $('qr').innerHTML = qq.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } } catch (e) { }
  $('adresa').textContent = adresa;
  const android = /Android/i.test(ua);
  if (navigator.xr && android) xrGumb.hidden = false;
  if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-ar').then(ok => { if (ok) { xrGumb.hidden = false; $('ar-poruka').textContent = ''; } }).catch(() => { });
  else if (android && !navigator.xr) { const a = $('u-chrome'); a.hidden = false; a.href = 'intent://' + adresa.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; $('ar-poruka').textContent = 'Ovaj preglednik nema WebXR. Otvori stranicu u Chromeu gumbom iznad.'; }
  else if (mob && !navigator.xr) $('ar-poruka').textContent = 'Ovaj preglednik nema WebXR. AR radi u Chromeu na Androidu; na iPhoneu Safari to još ne podržava.';
})();
xrGumb.addEventListener('click', () => {
  sloj.hidden = false;
  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'anchors'], domOverlay: { root: sloj } }).then(s => {
    renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
    return renderer.xr.setSession(s).then(() => {
      xr = { s, izvor: null, postavljen: false, sidro: null, imaPozu: false, trebaSidro: false, slobodno: false, izgubljeno: 0, presidreno: 0, sidroStanje: '', okvir: 0 };
      korijen.visible = false; prati = false;
      uputa.textContent = 'Usmjeri kameru prema podu i polako pomiči mobitel dok se ne pojavi krug (poligon je 4 × 2 m; manji prostor: smanji mjerilo).'; stanjeSidra('');
      s.requestReferenceSpace('viewer').then(vs => s.requestHitTestSource({ space: vs })).then(iz => { if (xr) xr.izvor = iz; });
      s.addEventListener('select', () => {
        if (!xr || xr.postavljen || !krug.visible) return;
        sidroP0.setFromMatrixPosition(krug.matrix); const c = renderer.xr.getCamera().position;
        xrSmjer = Math.atan2(-(c.z - sidroP0.z), c.x - sidroP0.x) - Math.PI / 2;
        pustiSidro(); korijenXR(); korijen.visible = true; xr.postavljen = true; xr.trebaSidro = true; xr.slobodno = false; xr.presidreno = 0; xr.sidroStanje = 'čekam'; krug.visible = false;
        uputa.textContent = 'Poligon je postavljen, sidrim ga na pod…';
      });
      s.addEventListener('end', () => {
        if (xr && xr.izvor) xr.izvor.cancel(); pustiSidro(); xr = null; renderer.xr.enabled = false; sloj.hidden = true;
        korijen.position.set(0, 0, 0); korijen.rotation.set(0, 0, 0); korijen.scale.set(1, 1, 1); korijen.visible = true; krug.visible = false; velicina(); pogled('kosi');
      });
    });
  }).catch(e => { sloj.hidden = true; $('ar-poruka').textContent = 'Proširena stvarnost se nije mogla pokrenuti (' + (e && e.message ? e.message : e) + ').'; });
});
$('xr-izlaz').addEventListener('click', () => { if (xr) xr.s.end(); });
$('xr-premjesti').addEventListener('click', () => { if (!xr) return; pustiSidro(); stanjeSidra(''); xr.postavljen = false; korijen.visible = false; uputa.textContent = 'Dodirni krug na podu da ponovno postaviš poligon.'; });
$('xr-kreni').addEventListener('click', () => $('kreni').click());
$('xr-reset').addEventListener('click', () => $('reset').click());
$('xr-zakret').addEventListener('input', e => { xrZakret = +e.target.value * D2R; if (xr && xr.postavljen) korijenXR(); $('xr-zakret-out').textContent = e.target.value + '°'; });
$('xr-mjerilo').addEventListener('input', e => { xrMjerilo = +e.target.value / 100; if (xr && xr.postavljen) korijenXR(); $('xr-mjerilo-out').textContent = e.target.value + ' %'; });
new MutationObserver(() => { $('xr-kreni').textContent = $('kreni').textContent; }).observe($('kreni'), { childList: true, subtree: true, characterData: true });
function xrKorak(frame, ref) {
  if (xr.trebaSidro) sidriUOkviru(frame, ref);
  if (xr.sidro) {
    const ap = frame.trackedAnchors && !frame.trackedAnchors.has(xr.sidro) ? null : frame.getPose(xr.sidro.anchorSpace, ref);
    if (ap) { sidroSad.fromArray(ap.transform.matrix); if (!xr.imaPozu) { sidroInv0.copy(sidroSad).invert(); xr.imaPozu = true; } korijenXR(); xr.izgubljeno = 0; }
    else if (xr.imaPozu && ++xr.izgubljeno > 45) presidri();
  }
  if (++xr.okvir % 15 === 0) stanjeSidra(xr.sidroStanje === 'da' ? 'Sidro: aktivno · ' + XR_INACICA : xr.sidroStanje === 'ne' ? 'Sidro: preglednik ga ne podržava · ' + XR_INACICA : 'Sidro: postavljam… · ' + XR_INACICA);
}

// ---------------- petlja ----------------
let zadnje = 0, akum = 0, okvir = 0;
renderer.setAnimationLoop((t, frame) => {
  const dt = zadnje ? Math.min(0.1, (t - zadnje) / 1000) : 0; zadnje = t;
  if (stanje.ide && stanje.st) {
    akum += dt * (+$('ubrzanje').value || 1); let k = 0, t0 = performance.now();
    while (akum >= E.DT && stanje.ide && k < 400) { akum -= E.DT; korak(); k++; }
    if (k) { stanje.petlja = (performance.now() - t0) / k; osvjezi(); $('i-petlja').textContent = br(stanje.petlja, 2) + ' ms'; }
  } else akum = 0;
  if (stanje.st) kotaci.forEach(w => { w.o.rotation.z -= (w.sm < 0 ? stanje.st.wl : stanje.st.wr) * dt * (stanje.ide ? +$('ubrzanje').value : 0); });
  if (cadG.userData.glava) cadG.userData.glava.rotation.y += dt * 2 * Math.PI * 10 * 0.05;      // LiDAR 10 Hz (usporeno za prikaz)
  if (prati && !renderer.xr.isPresenting) { const p = robot.getWorldPosition(new THREE.Vector3()); if (zadnji.lengthSq() === 0) zadnji.copy(p); const d = p.clone().sub(zadnji); kamera.position.add(d); upr.target.add(d); zadnji.copy(p); } else zadnji.set(0, 0, 0);
  if (frame && xr && !xr.postavljen && xr.izvor) { const r = frame.getHitTestResults(xr.izvor), p = r.length ? r[0].getPose(renderer.xr.getReferenceSpace()) : null; if (p) { krug.visible = true; krug.matrix.fromArray(p.transform.matrix); uputa.textContent = 'Dodirni krug da postaviš poligon (lijevi donji kut poligona = krug).'; } else krug.visible = false; }
  if (frame && xr && xr.postavljen) xrKorak(frame, renderer.xr.getReferenceSpace());
  if (xr) $('xr-napredak').textContent = $('napredak-txt').textContent;
  if (!renderer.xr.isPresenting) upr.update();
  renderer.render(scena, kamera); crtajUmetak();
  if (++okvir % 10 === 0) crtajUlaznu();
});

// ---------------- početak ----------------
function boje() { grafUcenja(); crtajMrezu(); crtajUlaznu(); }
new MutationObserver(boje).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
new ResizeObserver(() => { crtajKartu(); crtajMrezu(); grafUcenja(); }).observe($('karta'));
modelRobota(); gradiPoligon(); fpvKut(); pogled('kosi'); gumbiUcenja();
primjer(); if (!stanje.g) novaVoznja();
grafUcenja(); izvozKoda();
$('ucitavanje').remove();
window.FTQ_EMIR3D = { stanje, ucenje, E, korak, novaVoznja, uci, postaviVjezbu, klasifikacija, KOD };
window.FTQ_SPREMNO = true;
