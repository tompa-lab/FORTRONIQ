/* FORTRONIQ · Industrijski robot IRB 120 — izravna i inverzna kinematika uživo na 3D modelu.
   Račun: kin_irb120.js (standardni DH, analitička IK sa sfernim zapešćem). © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { napraviIRB120 } from './irb120_model.js?v=01';
import { fk, ik, LIM, rotZYX, zyx, kvaternion } from './kin_irb120.js?v=01';

const $ = (id) => document.getElementById(id);
const f1 = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1).replace('.', ',').replace('-', '−');
const f4 = (v) => (Math.abs(v) < 5e-5 ? 0 : v).toFixed(4).replace('.', ',').replace('-', '−');
const NAZ = ['os 1 · okretanje', 'os 2 · donja ruka', 'os 3 · gornja ruka', 'os 4 · zakret zapešća', 'os 5 · nagib zapešća', 'os 6 · prirubnica'];
const LIM6 = [-180, 180];                                    /* klizač osi 6 (stvarni opseg ±400°) */
let q = [0, 0, 0, 0, 90, 0];

/* ---------------------------------------------------------------- scena */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 30);
camera.position.set(1.05, 0.75, 1.25);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.target.set(0.2, 0.35, 0); controls.maxDistance = 5; controls.minDistance = 0.2;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1.2, 2.6, 1.8); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-2, 1.2, -1.6); scene.add(sun2);
const mreza = new THREE.GridHelper(1.6, 16, 0x8aa0aa, 0xc5d2d8); mreza.material.transparent = true; mreza.material.opacity = 0.5; scene.add(mreza);

let R;
try { R = await napraviIRB120(THREE, GLTFLoader, { glb: '../ar/irb120/irb120.glb', ormar: false, privjesak: false, kabel: false }); }
catch (e) { $('ucitavanje').textContent = 'Model robota nije se učitao (' + (e && e.message ? e.message : e) + ').'; throw e; }
scene.add(R.korijen); $('ucitavanje').hidden = true;
if (R.prihvatnica) R.prihvatnica(false);

/* robot (mm, z gore) → scena (m, y gore): x_s = x, y_s = z, z_s = −y */
const uScenu = (p) => new THREE.Vector3(p[0] / 1000, p[2] / 1000, -p[1] / 1000);
function okvir(duljina) {
  const g = new THREE.Group(); const boje = [0xd9534f, 0x3fa34d, 0x2f6fd6];
  for (let i = 0; i < 3; i++) { const d = new THREE.Vector3(); d.setComponent(i, 1); g.add(new THREE.ArrowHelper(d, new THREE.Vector3(), duljina, boje[i], duljina * 0.22, duljina * 0.12)); }
  return g;
}
const okBaza = okvir(0.12), okZap = okvir(0.06), okAlat = okvir(0.08);
const okviri = new THREE.Group(); okviri.add(okBaza, okZap, okAlat); scene.add(okviri);
function postaviOkvir(o, T) {                       /* T: 4×4 u KS robota (mm) */
  const m = new THREE.Matrix4().set(T[0], T[1], T[2], T[3] / 1000, T[4], T[5], T[6], T[7] / 1000, T[8], T[9], T[10], T[11] / 1000, 0, 0, 0, 1);
  const k = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);     /* robot → scena */
  m.premultiply(k); m.decompose(o.position, o.quaternion, o.scale);
}
const tragTocke = []; const tragGeo = new THREE.BufferGeometry(); const trag = new THREE.Line(tragGeo, new THREE.LineBasicMaterial({ color: 0x17656e })); scene.add(trag); trag.visible = false;

/* ---------------------------------------------------------------- izravna */
const klizaci = $('klizaci');
klizaci.innerHTML = NAZ.map((n, i) => { const l = i === 5 ? LIM6 : LIM[i]; return '<label class="kin-kl"><span>q' + (i + 1) + ' <small>' + n + '</small></span><input type="range" min="' + l[0] + '" max="' + l[1] + '" step="0.5" value="' + q[i] + '" data-i="' + i + '" aria-label="Kut osi ' + (i + 1) + '"><output id="o' + i + '">' + f1(q[i]) + '°</output></label>'; }).join('');
klizaci.addEventListener('input', (e) => { const i = +e.target.dataset.i; if (Number.isNaN(i)) return; q[i] = +e.target.value; cilj = null; osvjezi(); });
function sinkKlizace() { klizaci.querySelectorAll('input').forEach((el, i) => { el.value = Math.max(+el.min, Math.min(+el.max, q[i])); $('o' + i).textContent = f1(q[i]) + '°'; }); }

function osvjezi() {
  R.postavi(q);
  const r = fk(q), T = r.T;
  postaviOkvir(okBaza, r.okv[0]);
  const pw = [T[3] - 72 * T[2], T[7] - 72 * T[6], T[11] - 72 * T[10]];
  postaviOkvir(okZap, [T[0], T[1], T[2], pw[0], T[4], T[5], T[6], pw[1], T[8], T[9], T[10], pw[2], 0, 0, 0, 1]);
  postaviOkvir(okAlat, T);
  const e = zyx(T), k = kvaternion(T);
  /* provjera: položaj tool0 iz modela (GLB) i iz DH računa */
  R.korijen.updateMatrixWorld(true); const w = new THREE.Vector3(); R.tcp.getWorldPosition(w);
  const odst = Math.hypot(w.x * 1000 - T[3], -w.z * 1000 - T[7], w.y * 1000 - T[11]);
  $('izl-izravna').innerHTML =
    '<tr><th scope="row">Položaj x, y, z</th><td>' + f1(T[3]) + ' · ' + f1(T[7]) + ' · ' + f1(T[11]) + ' mm</td></tr>' +
    '<tr><th scope="row">Središte zapešća</th><td>' + f1(pw[0]) + ' · ' + f1(pw[1]) + ' · ' + f1(pw[2]) + ' mm</td></tr>' +
    '<tr><th scope="row">Euler ZYX (rz, ry, rx)</th><td>' + f1(e[0]) + '° · ' + f1(e[1]) + '° · ' + f1(e[2]) + '°</td></tr>' +
    '<tr><th scope="row">Kvaternion q1…q4 (RAPID)</th><td>' + k.map(f4).join(' · ') + '</td></tr>' +
    '<tr><th scope="row">Model ↔ račun</th><td>odstupanje ' + odst.toFixed(2).replace('.', ',') + ' mm</td></tr>';
  const M = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (j === 3 && i < 3 ? f1(T[i * 4 + j]) : f4(T[i * 4 + j])).padStart(9)).join(' ')).join('\n');
  $('matrica').textContent = M;
  if (trag.visible) { tragTocke.push(uScenu([T[3], T[7], T[11]])); if (tragTocke.length > 600) tragTocke.shift(); tragGeo.setFromPoints(tragTocke); }
}
const POZE = { nula: [0, 0, 0, 0, 0, 0], pocetna: [0, 0, 0, 0, 90, 0] };
document.querySelectorAll('[data-poza]').forEach((b) => b.addEventListener('click', () => {
  const p = b.dataset.poza; const cil = p === 'nasumicna' ? LIM.map(([a, z], i) => (i === 5 ? -170 + 340 * Math.random() : a * 0.85 + (z - a) * 0.85 * Math.random())) : POZE[p];
  animiraj(cil);
}));

/* ---------------------------------------------------------------- animacija zglobova */
let anim = null;
function animiraj(cil, trajanje = 1.4) { anim = { od: q.slice(), do: cil.slice(), t0: performance.now(), T: trajanje * 1000 }; }

/* ---------------------------------------------------------------- inverzna */
let cilj = null, rjesenja = [];
$('t-izravna').addEventListener('click', () => kartica('izravna'));
$('t-inverzna').addEventListener('click', () => kartica('inverzna'));
function kartica(k) {
  $('t-izravna').setAttribute('aria-pressed', String(k === 'izravna')); $('t-inverzna').setAttribute('aria-pressed', String(k === 'inverzna'));
  $('panel-izravna').hidden = k !== 'izravna'; $('panel-inverzna').hidden = k !== 'inverzna';
  $('kin-naslov').textContent = k === 'izravna' ? 'Izravna kinematika: kutovi → alat' : 'Inverzna kinematika: alat → kutovi';
}
function upisiCilj(p, e) { ['c-x', 'c-y', 'c-z'].forEach((id, i) => { $(id).value = Math.round(p[i] * 10) / 10; }); ['c-rz', 'c-ry', 'c-rx'].forEach((id, i) => { $(id).value = Math.round(e[i] * 10) / 10; }); }
$('u-inverznu').addEventListener('click', () => { const T = fk(q).T; upisiCilj([T[3], T[7], T[11]], zyx(T)); kartica('inverzna'); racunaj(); });
const PRIMJERI = { dolje: [[380, 0, 200], [180, 0, 180]], bok: [[150, 330, 400], [0, 0, -90]], daleko: [[700, 0, 300], [180, 0, 180]] };
document.querySelectorAll('[data-cilj]').forEach((b) => b.addEventListener('click', () => { const [p, e] = PRIMJERI[b.dataset.cilj]; upisiCilj(p, e); racunaj(); }));
$('izracunaj').addEventListener('click', racunaj);
function racunaj() {
  const p = ['c-x', 'c-y', 'c-z'].map((id) => +$(id).value), e = ['c-rz', 'c-ry', 'c-rx'].map((id) => +$(id).value);
  const Rm = rotZYX(e[0], e[1], e[2]);
  rjesenja = ik(p, Rm).filter((r) => r.greska < 0.01 && r.greskaOr < 1e-6);
  cilj = p;
  const tb = $('rjesenja'); tb.innerHTML = '';
  if (!rjesenja.length) { $('ik-stanje').textContent = 'Nema rješenja: točka je izvan dosega robota (središte zapešća predaleko od ramena ili preblizu).'; return; }
  const uOp = rjesenja.filter((r) => r.uOpsegu).length;
  $('ik-stanje').textContent = 'Pronađeno ' + rjesenja.length + ' rješenja; u granicama osi: ' + uOp + '. Klikni „Prikaži” — robot se pomakne u to rješenje.';
  rjesenja.forEach((r, n) => {
    const lakatGore = laktGore(r.q);
    const tr = document.createElement('tr'); if (!r.uOpsegu) tr.className = 'kin-izvan';
    tr.innerHTML = '<td>' + (n + 1) + '</td><td>' + (r.sprijeda ? 'naprijed' : 'natrag') + '</td><td>' + (lakatGore ? 'gore' : 'dolje') + '</td><td>q5 ' + (r.q[4] >= 0 ? '+' : '−') + '</td><td class="kin-q">' + r.q.map(f1).join(' · ') + '</td><td>' + (r.uOpsegu ? (r.singularno ? 'u granicama · singularno' : 'u granicama') : 'izvan granica osi') + '</td><td><button type="button" class="gumb tanki" data-rj="' + n + '">Prikaži</button></td>';
    tb.append(tr);
  });
  const prvo = rjesenja.find((r) => r.uOpsegu); if (prvo) animiraj(prvo.q);
}
function laktGore(qq) {                              /* lakat iznad pravca rame–središte zapešća? */
  const o = fk(qq).okv; const s = [o[1][3], o[1][7], o[1][11]], l = [o[2][3], o[2][7], o[2][11]], T = o[6];
  const w = [T[3] - 72 * T[2], T[7] - 72 * T[6], T[11] - 72 * T[10]];
  const t = ((l[2] - s[2]) * 0 + 0); void t;
  const r = (v) => Math.hypot(v[0], v[1]) * (Math.cos(qq[0] * Math.PI / 180) * v[0] + Math.sin(qq[0] * Math.PI / 180) * v[1] >= 0 ? 1 : -1);
  const rs = r(s), rl = r(l), rw = r(w); const u = (rl - rs) / ((rw - rs) || 1e-9); const zLinija = s[2] + (w[2] - s[2]) * u;
  return l[2] >= zLinija;
}
$('rjesenja').addEventListener('click', (e) => { const b = e.target.closest('[data-rj]'); if (!b) return; animiraj(rjesenja[+b.dataset.rj].q); });

$('p-okviri').addEventListener('change', (e) => { okviri.visible = e.target.checked; });
$('p-trag').addEventListener('change', (e) => { trag.visible = e.target.checked; tragTocke.length = 0; tragGeo.setFromPoints([]); });

/* ---------------------------------------------------------------- petlja */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl); velicina();
function petlja(t) {
  if (anim) {
    let u = Math.min(1, (t - anim.t0) / anim.T); const s = u * u * (3 - 2 * u);
    q = anim.od.map((a, i) => a + (anim.do[i] - a) * s); sinkKlizace(); osvjezi();
    if (u >= 1) anim = null;
  }
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(petlja);
}
osvjezi(); upisiCilj([380, 0, 200], [180, 0, 180]);
requestAnimationFrame(petlja);
window.FTQ_KIN = { fk, ik, get q() { return q; }, postavi(qq) { q = qq.slice(); sinkKlizace(); osvjezi(); }, R };
