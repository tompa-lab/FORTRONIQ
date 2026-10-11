// tello.js — DJI Tello leti po programu: naredbe Tello SDK-a, plan leta, model „kao stvarni Tello”, zapisi CoppeliaSima i stvarnog leta,
// izvoz u Python (djitellopy) za pravi dron i u Lua za CoppeliaSim (isti program, dva drona). Model drona je sken mobitelom (tello.glb).
// Koordinate leta: x naprijed (smjer nosa pri polijetanju), y lijevo, z gore [m]; kut CCW pozitivan. Scena (three.js): (x, z, −y).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const D2R = Math.PI / 180, DT = 0.05;
const ZAP = window.FTQ_TELLO_ZAPISI || {};
// kut iz CoppeliaSima je u rasponu ±180°: razmotaj ga u zbroj okretanja
Object.keys(ZAP).filter(k => k.startsWith('sim_')).forEach(k => { let p = null, d = 0; ZAP[k].forEach(r => { if (p !== null) { let x = r[4] - p; x -= 360 * Math.round(x / 360); d += x; } else d = r[4]; p = r[4]; r[4] = d; }); });
const w3 = (x, y, z) => new THREE.Vector3(x, z, -y);
const br = (v, d = 1) => { const s = Math.abs(v).toFixed(d).replace('.', ','); return (v < 0 && +s.replace(',', '.') !== 0 ? '−' : '') + s; };
const BOJA = { plan: '#17656E', model: '#E0533D', sim: '#3B82C4', stv: '#D9A21B' };

// ---------------- scena ----------------
const kut = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
kut.insertBefore(renderer.domElement, kut.firstChild);
const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(42, 1, 0.02, 80);
const upr = new OrbitControls(kamera, renderer.domElement);
upr.enableDamping = true; upr.minDistance = 0.25; upr.maxDistance = 25; upr.maxPolarAngle = Math.PI * 0.495;
scena.add(new THREE.HemisphereLight(0xffffff, 0x8899a0, 1.6));
const sunce = new THREE.DirectionalLight(0xffffff, 1.9);
sunce.castShadow = true; sunce.shadow.mapSize.set(2048, 2048);
Object.assign(sunce.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
scena.add(sunce); scena.add(sunce.target);
const dop = new THREE.DirectionalLight(0xffffff, 0.5); dop.position.set(-3, 4, -2); scena.add(dop);
const korijen = new THREE.Group(); scena.add(korijen);             // sve što se u AR-u postavlja na pod
const pod = new THREE.Mesh(new THREE.CircleGeometry(6, 72), new THREE.ShadowMaterial({ opacity: 0.18 }));
pod.rotation.x = -Math.PI / 2; pod.receiveShadow = true; korijen.add(pod);
const mreza = new THREE.GridHelper(12, 24); mreza.material.transparent = true; mreza.material.opacity = 0.28; korijen.add(mreza);
// križ za polijetanje i slijetanje (0,5 m krakovi) i strelica smjera nosa
const matKriz = new THREE.MeshBasicMaterial({ color: 0xE0533D });
[[0.5, 0.04], [0.04, 0.5]].forEach(([a, b]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(a, b), matKriz); m.rotation.x = -Math.PI / 2; m.position.y = 0.002; korijen.add(m); });
const strelica = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0.42, 0), new THREE.Vector2(0.32, 0.05), new THREE.Vector2(0.32, -0.05)])), matKriz);
strelica.rotation.x = -Math.PI / 2; strelica.position.y = 0.002; korijen.add(strelica);
function boje() {
  const cs = getComputedStyle(document.documentElement);
  const c = new THREE.Color(cs.getPropertyValue('--teal').trim() || '#17656E');
  mreza.material.color = c; mreza.material.vertexColors = false; mreza.material.needsUpdate = true;
  BOJA.plan = cs.getPropertyValue('--teal').trim() || '#17656E';
  if (crte.plan) crte.plan.material.color.set(BOJA.plan);
  crtajGrafove();
}

// ---------------- dron (sken mobitelom) ----------------
const dron = new THREE.Group(); korijen.add(dron);
const propeleri = [];
const matProp = new THREE.MeshBasicMaterial({ color: 0x9fb4bc, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
[47.8, -47.8, 131.4, -131.4].forEach(a => {   // osi motora na skenu: 72 mm od središta, kutovi od nosa
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.036, 28).rotateX(-Math.PI / 2), matProp);
  d.position.set(0.072 * Math.cos(a * D2R), 0.038, -0.072 * Math.sin(a * D2R)); dron.add(d); propeleri.push(d);
});
// kamera drona (sprijeda, gleda naprijed); Tello: vidno polje 82,6° (dijagonala) -> okomito ~47° pri 16:9
const camDron = new THREE.PerspectiveCamera(46.6, 16 / 9, 0.03, 60);
camDron.position.set(0.05, 0.02, 0); camDron.rotation.set(0, -Math.PI / 2, 0); dron.add(camDron);

// ---------------- program: naredbe ----------------
const NAR = {
  takeoff: { n: 0 }, land: { n: 0 },
  up: { n: 1, lo: [20], hi: [500] }, down: { n: 1, lo: [20], hi: [500] }, left: { n: 1, lo: [20], hi: [500] },
  right: { n: 1, lo: [20], hi: [500] }, forward: { n: 1, lo: [20], hi: [500] }, back: { n: 1, lo: [20], hi: [500] },
  cw: { n: 1, lo: [1], hi: [360] }, ccw: { n: 1, lo: [1], hi: [360] },
  go: { n: 4, lo: [-500, -500, -500, 10], hi: [500, 500, 500, 100] },
  speed: { n: 1, lo: [10], hi: [100] },
  wait: { n: 1, lo: [0.1], hi: [60], dec: true },
  rc: { n: 5, lo: [-100, -100, -100, -100, 0.1], hi: [100, 100, 100, 100, 30], dec: true },
  spirala: { n: 4, lo: [60, 2, 0.25, 0.3], hi: [600, 60, 10, 3], dec: true }
};
function citajProgram(tekst) {
  const cmds = [], greske = []; let leti = false, sletio = false;
  tekst.split(/\r?\n/).forEach((red, i) => {
    const r = red.replace(/#.*/, '').trim(); if (!r) return;
    const d = r.split(/\s+/), k = d[0].toLowerCase(), N = NAR[k];
    if (!N) { greske.push('Red ' + (i + 1) + ': nepoznata naredba „' + d[0] + '”.'); return; }
    if (d.length - 1 !== N.n) { greske.push('Red ' + (i + 1) + ': „' + k + '” traži ' + N.n + ' broj' + (N.n === 1 ? '' : 'a') + '.'); return; }
    const a = d.slice(1).map(Number);
    if (a.some(v => !isFinite(v))) { greske.push('Red ' + (i + 1) + ': broj nije ispravan.'); return; }
    for (let j = 0; j < a.length; j++) if (a[j] < N.lo[j] || a[j] > N.hi[j]) { greske.push('Red ' + (i + 1) + ': ' + k + ' — vrijednost ' + a[j] + ' izvan raspona ' + N.lo[j] + '…' + N.hi[j] + '.'); return; }
    if (!N.dec && a.some(v => v !== Math.round(v))) { greske.push('Red ' + (i + 1) + ': ' + k + ' prima cijele brojeve.'); return; }
    if (k === 'go' && Math.abs(a[0]) < 20 && Math.abs(a[1]) < 20 && Math.abs(a[2]) < 20) { greske.push('Red ' + (i + 1) + ': go — barem jedan pomak mora biti 20 cm ili više.'); return; }
    if (k === 'takeoff') { if (leti) { greske.push('Red ' + (i + 1) + ': dron već leti.'); return; } leti = true; sletio = false; }
    else if (k === 'land') { if (!leti) { greske.push('Red ' + (i + 1) + ': land prije takeoff.'); return; } leti = false; sletio = true; }
    else if (!['speed', 'wait'].includes(k) && !leti) { greske.push('Red ' + (i + 1) + ': „' + k + '” prije takeoff' + (sletio ? ' (dron je već sletio)' : '') + '.'); return; }
    cmds.push({ k, a, red: i + 1, txt: r });
  });
  if (!cmds.some(c => c.k === 'takeoff')) greske.push('Program nema takeoff.');
  return { cmds, greske };
}

// ---------------- simulacija: plan i model „kao stvarni Tello” ----------------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function opcije() {
  return {
    mrak: $('m-mrak').checked, strop: +$('m-strop').value / 100, sPut: +$('m-put').value / 100, sBok: +$('m-bok').value / 100,
    sKut: +$('m-kut').value / 100, leb: +$('m-leb').value / 100, sjeme: +$('m-sjeme').value | 0
  };
}
function simuliraj(cmds, tello, o) {
  const R = rng(o.sjeme || 1), N = () => { let u = 0; for (let i = 0; i < 6; i++) u += R(); return u - 3; };   // ~N(0, 0,7)
  const s = { t: 0, x: 0, y: 0, z: 0, yaw: 0, mot: false }, U = [], L = [];
  let v = 0.5, prekid = false, naredba = '';
  const zapisi = () => U.push({ t: s.t, x: s.x, y: s.y, z: s.z, yaw: s.yaw, mot: s.mot, n: naredba });
  const log = (txt, vr = '') => L.push({ t: s.t, txt, vr });
  zapisi();
  function drift(T) { if (!tello || !s.mot || s.z < 0.05) return; const k = o.leb * Math.sqrt(DT); for (let i = 0; i < T / DT; i++) { s.x += N() * k; s.y += N() * k; } }
  function idi(x, y, z, yaw, T) {         // glatko (smoothstep) do cilja u vremenu T
    const p = { x: s.x, y: s.y, z: s.z, yaw: s.yaw }, n = Math.max(1, Math.round(T / DT));
    for (let i = 1; i <= n; i++) {
      const u = i / n, w = u * u * (3 - 2 * u);
      s.x = p.x + (x - p.x) * w; s.y = p.y + (y - p.y) * w; s.z = p.z + (z - p.z) * w; s.yaw = p.yaw + (yaw - p.yaw) * w; s.t += DT;
      if (tello && s.mot && s.z > 0.05) { const k = o.leb * Math.sqrt(DT); s.x += N() * k * 0.5; s.y += N() * k * 0.5; }
      zapisi();
    }
  }
  const stoj = T => { const n = Math.max(1, Math.round(T / DT)); for (let i = 0; i < n; i++) { s.t += DT; drift(DT); zapisi(); } };
  const VZ = 0.4, WY = 60 * D2R;
  function okomito(dz) {                  // up/down s mogućim stropom (noću donja kamera ne vidi tlo)
    let cilj = s.z + dz;
    if (tello && o.mrak && dz > 0 && cilj > o.strop + 0.05) {
      idi(s.x, s.y, Math.max(s.z, o.strop), s.yaw, Math.max(0.6, Math.abs(o.strop - s.z) / VZ)); stoj(7);
      log(naredba + ' → nema odgovora 7 s (strop ~' + br(o.strop, 1) + ' m)', 'upoz');
      log('dron sam slijeće: auto land', 'upoz');
      idi(s.x, s.y, 0, s.yaw, Math.max(1, s.z / 0.5)); s.mot = false; stoj(0.5); prekid = true; return false;
    }
    if (cilj < 0.2) cilj = 0.2;
    idi(s.x, s.y, cilj, s.yaw, Math.max(0.6, Math.abs(cilj - s.z) / VZ)); return true;
  }
  function vodoravno(dx, dy, dz, brzina) {   // pomak u KS drona (x naprijed, y lijevo)
    const d = Math.hypot(dx, dy);
    if (tello && d > 0) { const f = 1 + N() * o.sPut, b = N() * o.sBok * d; const ux = dx / d, uy = dy / d; dx = dx * f - uy * b; dy = dy * f + ux * b; }
    const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
    let z = s.z + dz; if (tello && o.mrak && z > o.strop) { z = o.strop; log(naredba + ' → visina ograničena na ~' + br(o.strop, 1) + ' m', 'upoz'); }
    idi(s.x + dx * c - dy * sn, s.y + dx * sn + dy * c, Math.max(0.2, z), s.yaw, Math.max(0.6, Math.hypot(d, dz) / brzina));
  }
  function spirala(vis, T, okr, D) {         // = dron_spirala.py: naprijed + okretanje (krug r = v/ω) + dizanje
    const om0 = 2 * Math.PI * okr / T, v0 = Math.PI * D * okr / T;
    const om = tello ? om0 * (712 / 720) : om0, r = (tello ? 0.8 : 1) * v0 / om0;   // Tello 8. 10.: 712° od 720°, promjer ≈ 0,8 m od 1 m (procjena)
    const z0 = s.z, z1 = vis / 100; let ok = true;
    const n = Math.round(T / DT);
    for (let i = 1; i <= n; i++) {
      s.t += DT; s.yaw -= om * DT;
      s.x += r * om * Math.cos(s.yaw) * DT; s.y += r * om * Math.sin(s.yaw) * DT;
      let zc = z0 + (z1 - z0) * i / n;
      if (tello) { zc = Math.min(zc, s.z + 0.27 * DT * (zc > s.z ? 1 : 10)); if (o.mrak && zc > o.strop) { zc = o.strop; ok = false; } }
      s.z = zc; drift(DT); zapisi();
    }
    if (tello && s.z < z1 - 0.2) {
      const tt = Math.min(10, (z1 - s.z) / 0.27);
      for (let i = 0; i < 10 / DT; i++) { s.t += DT; let zc = s.z + 0.27 * DT; if (o.mrak && zc > o.strop) { zc = o.strop; ok = false; } s.z = Math.min(zc, z1); drift(DT); zapisi(); if (s.z >= z1 - 0.2) break; }
      log(ok ? 'spirala → visina dostignuta nakon ' + br(tt, 1) + ' s' : 'spirala → visina nije dostignuta u roku (stala na ~' + br(s.z, 1) + ' m) — prekid uspona', ok ? '' : 'upoz');
    } else log('spirala → ' + br(okr * (tello ? 712 / 720 : 1) * 360, 0) + '° okretanja, vrh ' + br(s.z, 2) + ' m');
    stoj(1.0);
  }
  for (const c of cmds) {
    if (prekid) break;
    naredba = c.txt; const a = c.a;
    switch (c.k) {
      case 'takeoff': {
        s.mot = true; stoj(0.6); const h = tello ? 0.75 + 0.15 * R() : 0.8;
        idi(s.x, s.y, h, s.yaw, h / VZ); stoj(1.0); log('takeoff → ok' + (tello ? ' (lebdi na ~' + Math.round(h * 100) + ' cm)' : '')); break;
      }
      case 'land': idi(s.x, s.y, 0, s.yaw, Math.max(1, s.z / 0.5)); s.mot = false; stoj(0.5); log('land → ok'); break;
      case 'up': if (okomito(a[0] / 100)) { stoj(0.5); log(c.txt + ' → ok'); } break;
      case 'down': okomito(-a[0] / 100); stoj(0.5); log(c.txt + ' → ok'); break;
      case 'forward': vodoravno(a[0] / 100, 0, 0, v); stoj(0.5); log(c.txt + ' → ok'); break;
      case 'back': vodoravno(-a[0] / 100, 0, 0, v); stoj(0.5); log(c.txt + ' → ok'); break;
      case 'left': vodoravno(0, a[0] / 100, 0, v); stoj(0.5); log(c.txt + ' → ok'); break;
      case 'right': vodoravno(0, -a[0] / 100, 0, v); stoj(0.5); log(c.txt + ' → ok'); break;
      case 'go': vodoravno(a[0] / 100, a[1] / 100, a[2] / 100, a[3] / 100); stoj(0.5); log(c.txt + ' → ok'); break;
      case 'cw': case 'ccw': {
        const sm = c.k === 'cw' ? -1 : 1, kk = a[0] * D2R * (tello ? 1 + N() * o.sKut : 1);
        idi(s.x, s.y, s.z, s.yaw + sm * kk, Math.max(0.5, a[0] * D2R / WY)); stoj(0.5); log(c.txt + ' → ok'); break;
      }
      case 'speed': v = a[0] / 100; log(c.txt + ' → ok'); break;
      case 'wait': stoj(a[0]); break;
      case 'rc': {   // procjena: ±100 = 1 m/s vodoravno, 0,6 m/s okomito, 120 °/s okretanje
        const n = Math.round(a[4] / DT);
        for (let i = 0; i < n; i++) {
          s.t += DT; s.yaw -= a[3] / 100 * 120 * D2R * DT;
          const vx = a[1] / 100, vy = -a[0] / 100, c2 = Math.cos(s.yaw), s2 = Math.sin(s.yaw);
          s.x += (vx * c2 - vy * s2) * DT; s.y += (vx * s2 + vy * c2) * DT;
          let z = s.z + a[2] / 100 * 0.6 * DT; if (tello && o.mrak) z = Math.min(z, o.strop); s.z = Math.max(0.2, z); drift(DT); zapisi();
        }
        stoj(0.3); log(c.txt + ' → rc 0 0 0 0'); break;
      }
      case 'spirala': spirala(a[0], a[1], a[2], a[3]); break;
    }
  }
  if (s.mot) { naredba = 'land'; log('program je završio u zraku → land (u Pythonu: finally)', 'upoz'); idi(s.x, s.y, 0, s.yaw, Math.max(1, s.z / 0.5)); s.mot = false; stoj(0.5); }
  return { U, L, prekid, T: s.t };
}

// ---------------- crte putanja ----------------
const crte = {};
function crta(ime, tocke, boja, crtkano) {
  if (crte[ime]) { korijen.remove(crte[ime]); crte[ime].geometry.dispose(); }
  if (!tocke || tocke.length < 2) { crte[ime] = null; return; }
  const g = new THREE.BufferGeometry().setFromPoints(tocke);
  const m = crtkano ? new THREE.LineDashedMaterial({ color: boja, dashSize: 0.06, gapSize: 0.04 }) : new THREE.LineBasicMaterial({ color: boja });
  const l = new THREE.Line(g, m); if (crtkano) l.computeLineDistances(); korijen.add(l); crte[ime] = l;
}
const trag = (() => {   // trag modela koji raste tijekom leta
  const MAX = 20000, g = new THREE.BufferGeometry(), p = new Float32Array(MAX * 3);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setDrawRange(0, 0);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: BOJA.model })); korijen.add(l);
  return { l, g, p, n: 0, MAX };
})();

// ---------------- stanje stranice ----------------
let program = { cmds: [], greske: [] }, rez = { plan: null, model: null }, igra = { t: 0, ide: false };
const PRESET = {
  kvadrat: { naslov: 'Kvadrat 1 × 1 m na +50 cm', izvor: 'dron_TELLO_let.py', sim: 'sim_kvadrat', stv: null,
    txt: '# Kvadrat 1 × 1 m na +50 cm (dron_TELLO_let.py)\ntakeoff\nup 50\nforward 100\ncw 90\nforward 100\ncw 90\nforward 100\ncw 90\nforward 100\ncw 90\nland' },
  spirala: { naslov: 'Spirala: 2 kruga, promjer 1 m, do 4 m u 10 s', izvor: 'dron_spirala.py', sim: 'sim_spirala', stv: 'tello_spirala',
    txt: '# Spirala: 2 kruga, promjer 1 m, do 4 m u 10 s (dron_spirala.py)\n# spirala <visina cm> <trajanje s> <okretaja> <promjer m> — naredba stranice, u Pythonu je to petlja s rc\ntakeoff\nspirala 400 10 2 1.0\nland' },
  visine: { naslov: 'Visine 3 – 2 – 5 – 4 – 6 – 3 – 5 m', izvor: 'dron_visine.py', sim: 'sim_visine', stv: null,
    txt: '# Visine iznad tla 3-2-5-4-6-3-5 m (dron_visine.py); nakon takeoff dron lebdi na ~80 cm\ntakeoff\nup 220\ndown 100\nup 300\ndown 100\nup 200\ndown 300\nup 200\nland' },
  tocke: { naslov: 'Let po točkama (go x y z brzina)', izvor: 'dron_let_po_tockama.py', sim: null, stv: null,
    txt: '# Let po točkama: kvadrat 1 × 1 m naredbom go (x naprijed, y lijevo, z gore, cm; brzina cm/s)\ntakeoff\nup 50\ngo 100 0 0 50\ngo 0 100 0 50\ngo -100 0 0 50\ngo 0 -100 0 50\ndown 50\nland' },
  vlastiti: { naslov: 'Vlastiti program', izvor: '', sim: null, stv: null, txt: null }
};
function presetSada() { return PRESET[$('p-izbor').value] || PRESET.vlastiti; }

function izracunaj() {
  program = citajProgram($('p-tekst').value);
  const gr = $('p-greske');
  if (program.greske.length) { gr.hidden = false; gr.innerHTML = program.greske.map(g => '<span class="upoz">' + g + '</span>').join('<br>'); }
  else gr.hidden = true;
  const o = opcije();
  rez.plan = program.cmds.length ? simuliraj(program.cmds, false, o) : null;
  rez.model = program.cmds.length ? simuliraj(program.cmds, $('m-nacin').value === 'tello', o) : null;
  crta('plan', rez.plan && rez.plan.U.map(u => w3(u.x, u.y, u.z)), BOJA.plan, true);
  const ps = presetSada(), Zs = ps.sim && ZAP[ps.sim];
  crta('sim', $('o-sim').checked && Zs ? Zs.map(r => w3(r[1], r[2], r[3])) : null, BOJA.sim, false);
  if (crte.sim) crte.sim.visible = true;
  $('o-sim-red').hidden = !Zs; $('o-stv-red').hidden = !(ps.stv && ZAP[ps.stv]);
  postaviT(0); igra.ide = false; gumbLeti();
  ispisDnevnika(); crtajGrafove(); rezultati(); izvozi();
}
function uzorak(r, t) {
  if (!r || !r.U.length) return null;
  const U = r.U, i = Math.min(U.length - 1, Math.max(0, Math.floor(t / DT)));
  return U[i];
}
function postaviT(t) {
  const r = rez.model; igra.t = Math.max(0, Math.min(t, r ? r.T : 0));
  const u = uzorak(r, igra.t);
  if (u) { dron.position.copy(w3(u.x, u.y, u.z)); dron.rotation.set(0, u.yaw, 0); matProp.opacity = u.mot ? 0.32 : 0; }
  else { dron.position.set(0, 0, 0); dron.rotation.set(0, 0, 0); matProp.opacity = 0; }
  // trag
  if (r) {
    const n = Math.min(trag.MAX, Math.floor(igra.t / DT) + 1);
    for (let i = 0; i < n; i++) { const q = r.U[i]; trag.p[i * 3] = q.x; trag.p[i * 3 + 1] = q.z; trag.p[i * 3 + 2] = -q.y; }
    trag.g.attributes.position.needsUpdate = true; trag.g.setDrawRange(0, n); trag.l.material.color.set(BOJA.model);
  } else trag.g.setDrawRange(0, 0);
  const T = r ? r.T : 0;
  $('napredak').max = Math.max(T, 0.001); $('napredak').value = igra.t;
  $('napredak-txt').textContent = br(igra.t, 1) + ' s / ' + br(T, 1) + ' s';
  $('prog-info').innerHTML = u ? 'Visina <b>' + br(u.z, 2) + ' m</b> · kut <b>' + br(-u.yaw / D2R, 0) + '°</b> (CW +) · položaj od križa <b>' + br(u.x * 100, 0) + ' / ' + br(u.y * 100, 0) + ' cm</b> (naprijed / lijevo)' + (u.n ? ' · naredba: <code>' + u.n + '</code>' : '') : 'Upiši program ili odaberi vježbu.';
  oznakaGrafa();
}
function gumbLeti() { $('leti').textContent = igra.ide ? 'Zaustavi' : (rez.model && igra.t >= rez.model.T - 1e-6 ? 'Ponovi let' : 'Leti'); $('leti').setAttribute('aria-pressed', igra.ide ? 'true' : 'false'); }
$('leti').addEventListener('click', () => {
  if (!rez.model) return;
  if (!igra.ide && igra.t >= rez.model.T - 1e-6) postaviT(0);
  igra.ide = !igra.ide; gumbLeti();
});
$('pocetak').addEventListener('click', () => { igra.ide = false; postaviT(0); gumbLeti(); });
$('napredak').addEventListener('click', e => { if (!rez.model) return; const b = e.target.getBoundingClientRect(); postaviT((e.clientX - b.left) / b.width * rez.model.T); });

// ---------------- dnevnik (ispis kao u Pythonu) ----------------
function ispisDnevnika() {
  const el = $('dnevnik'); el.innerHTML = '';
  const r = rez.model; if (!r) return;
  const dodaj = (t, txt, kl) => { const d = document.createElement('div'); d.innerHTML = '<i>' + br(t, 1) + '</i>' + txt.replace(/&/g, '&amp;').replace(/</g, '&lt;'); if (kl) d.className = kl; el.appendChild(d); };
  dodaj(0, ($('m-nacin').value === 'tello' ? '[model Tello] ' : '[plan] ') + 'spojen, baterija 80 %');
  r.L.forEach(l => dodaj(l.t, l.txt, l.vr === 'upoz' ? 'kom' : ''));
  const k = r.U[r.U.length - 1];
  dodaj(r.T, 'Završno stanje: od križa ' + br(k.x * 100, 0) + ' cm naprijed, ' + br(k.y * 100, 0) + ' cm lijevo, kut ' + br(-k.yaw / D2R, 0) + '°');
}

// ---------------- grafovi: visina i kut kroz vrijeme ----------------
function serije() {
  const S = [], ps = presetSada();
  if (rez.plan) S.push({ ime: 'plan', boja: BOJA.plan, crt: true, h: rez.plan.U.map(u => [u.t, u.z]), k: rez.plan.U.map(u => [u.t, -u.yaw / D2R]) });
  if (rez.model && $('m-nacin').value === 'tello') S.push({ ime: 'model Tello', boja: BOJA.model, h: rez.model.U.map(u => [u.t, u.z]), k: rez.model.U.map(u => [u.t, -u.yaw / D2R]) });
  if ($('o-sim').checked && ps.sim && ZAP[ps.sim]) {   // CoppeliaSim: model počinje lebdeći na 0,5 m; vrijeme pomaknuto na polijetanje plana
    const Zs = ZAP[ps.sim], t0 = rez.plan ? (rez.plan.U.find(u => u.z > 0.5) || { t: 0 }).t : 0;
    S.push({ ime: 'CoppeliaSim', boja: BOJA.sim, h: Zs.map(r => [r[0] + t0, r[3]]), k: Zs.map(r => [r[0] + t0, -r[4]]) });
  }
  if ($('o-stv').checked && ps.stv && ZAP[ps.stv]) {   // stvarni Tello: visina od trenutka nakon polijetanja (+1,6 s), kut = zbroj okretanja
    const Zt = ZAP[ps.stv], t0 = rez.plan ? (rez.plan.U.find(u => u.z > 0.79) || { t: 0 }).t : 0;
    S.push({ ime: 'stvarni Tello', boja: BOJA.stv, h: Zt.map(r => [r[0] + t0, r[1] / 100]), k: Zt.map(r => [r[0] + t0, r[2]]) });
  }
  return S;
}
function graf(cv, S, kljuc, jed) {
  const c = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
  if (!W) return null;
  cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--body').trim() || '#5D7C90', rule = cs.getPropertyValue('--rule').trim() || '#DCE4E8';
  let t1 = 1, y0 = Infinity, y1 = -Infinity;
  S.forEach(s => s[kljuc].forEach(([t, y]) => { t1 = Math.max(t1, t); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  if (!isFinite(y0)) { y0 = 0; y1 = 1; } if (y1 - y0 < 1e-6) { y1 += 1; y0 -= kljuc === 'h' ? 0 : 1; }
  if (kljuc === 'h') y0 = Math.min(0, y0);
  const kor = (r => { const k = Math.pow(10, Math.floor(Math.log10(r / 4))); return [1, 2, 5, 10].map(m => m * k).find(m => r / m <= 6); })(y1 - y0);
  y0 = Math.floor(y0 / kor) * kor; y1 = Math.ceil(y1 / kor) * kor;
  const L = 44, Rr = 10, T = 10, B = 26, X = t => L + (W - L - Rr) * t / t1, Y = y => T + (H - T - B) * (1 - (y - y0) / (y1 - y0));
  c.font = '11px "IBM Plex Sans", sans-serif'; c.fillStyle = ink; c.strokeStyle = rule; c.lineWidth = 1;
  for (let y = y0; y <= y1 + 1e-9; y += kor) { c.beginPath(); c.moveTo(L, Y(y)); c.lineTo(W - Rr, Y(y)); c.stroke(); c.textAlign = 'right'; c.fillText(br(y, kor < 1 ? 1 : 0), L - 6, Y(y) + 4); }
  const kt = [1, 2, 5, 10, 20, 30, 60].find(m => t1 / m <= 8) || 60;
  for (let t = 0; t <= t1 + 1e-9; t += kt) { c.textAlign = 'center'; c.fillText(br(t, 0), X(t), H - B + 16); }
  c.textAlign = 'left'; c.fillText(jed, L + 4, T + 10); c.textAlign = 'right'; c.fillText('t [s]', W - Rr, H - 4);
  S.forEach(s => {
    c.strokeStyle = s.boja; c.lineWidth = s.crt ? 1.6 : 2; c.setLineDash(s.crt ? [6, 4] : []); c.beginPath();
    s[kljuc].forEach(([t, y], i) => i ? c.lineTo(X(t), Y(y)) : c.moveTo(X(t), Y(y))); c.stroke();
  });
  c.setLineDash([]);
  return { X, Y, t1, H, T, B };
}
let osi = {};
function crtajGrafove() {
  const S = serije();
  osi.h = graf($('g-visina'), S, 'h', 'visina [m]'); osi.k = graf($('g-kut'), S, 'k', 'kut [°], CW +');
  $('g-legenda').innerHTML = S.map(s => '<span><i style="background:' + s.boja + '"></i>' + s.ime + '</span>').join('');
  oznakaGrafa();
}
function oznakaGrafa() {
  ['h', 'k'].forEach(k => { const el = $('g-' + (k === 'h' ? 'visina' : 'kut') + '-t'); if (!osi[k] || !rez.model) { el.style.display = 'none'; return; } el.style.display = 'block'; el.style.left = osi[k].X(igra.t) + 'px'; });
}
new ResizeObserver(() => crtajGrafove()).observe($('g-visina'));

// ---------------- rezultati ----------------
function sazetak(r) {
  if (!r) return null;
  const k = r.U[r.U.length - 1]; let zmax = 0; r.U.forEach(u => zmax = Math.max(zmax, u.z));
  let okr = 0; for (let i = 1; i < r.U.length; i++) okr += r.U[i].yaw - r.U[i - 1].yaw;
  return { T: r.T, zmax, kraj: Math.hypot(k.x, k.y), x: k.x, y: k.y, kut: -okr / D2R, prekid: r.prekid };
}
function rezultati() {
  const P = sazetak(rez.plan), M = $('m-nacin').value === 'tello' ? sazetak(rez.model) : null, ps = presetSada();
  let sim = null; if (ps.sim && ZAP[ps.sim]) { const Z = ZAP[ps.sim], a = Z[0], b = Z[Z.length - 1]; sim = { T: b[0], zmax: Math.max(...Z.map(r => r[3])), kraj: Math.hypot(b[1] - a[1], b[2] - a[2]), kut: -(b[4] - a[4]) }; }
  const red = (ime, f) => '<tr><th>' + ime + '</th><td>' + (P ? f(P) : '—') + '</td><td>' + (M ? f(M) : '—') + '</td><td>' + (sim ? f(sim) : '—') + '</td></tr>';
  $('rez-tablica').innerHTML = '<thead><tr><th></th><th>Plan</th><th>Model</th><th>Coppelia­Sim</th></tr></thead><tbody>' +
    red('Trajanje', s => br(s.T, 1) + ' s') + red('Najveća visina', s => br(s.zmax, 2) + ' m') +
    red('Slijetanje od križa', s => br(s.kraj * 100, 1) + ' cm') + red('Ukupno okretanje', s => br(s.kut, 0) + '° CW') + '</tbody>';
  $('rez-poruka').innerHTML = M && M.prekid ? '<span class="upoz">Model: let prekinut (auto land) — vidi ispis programa.</span>' : '';
}

// ---------------- izvoz: Python (pravi Tello) i Lua (CoppeliaSim) ----------------
const PY_MAP = { up: 'move_up', down: 'move_down', left: 'move_left', right: 'move_right', forward: 'move_forward', back: 'move_back', cw: 'rotate_clockwise', ccw: 'rotate_counter_clockwise' };
function pythonKod() {
  const ps = presetSada(), C = program.cmds, imaSp = C.some(c => c.k === 'spirala');
  const L = [];
  L.push('"""', 'DJI Tello: ' + (ps.txt ? ps.naslov : 'vlastiti program') + '. Izvezeno s dos.fortroniq.hr/ar/tello/ (ForTroniQ d.o.o.).',
    'Isti program je na stranici odletio u simulaciji; ovdje ga izvodi pravi dron preko Wi-Fi-ja.', '',
    'PRIPREMA:  py -m pip install djitellopy', '           Tello upaljen, laptop na Wi-Fi mrezi TELLO-xxxxxx (internet preko USB dijeljenja veze s mobitela)',
    '           vatrozid: dolazni UDP 8889, 8890, 11111 dopusten; zatvoriti stare prozore (WinError 10048)',
    'SIGURNOST: stitnici propelera, slobodan prostor, baterija > 50 %, laptop na dohvat ruke (Ctrl+C = slijetanje),', '           nikad emergency s visine, po mraku ne letjeti vani.', '"""');
  L.push('import time, csv' + (imaSp ? ', math' : ''), 'from djitellopy import Tello', '', 'MIN_BATERIJA = 50', 'LOG = "let_log.csv"', '');
  if (imaSp) L.push(
    'def spirala(t, visina_cm, trajanje_s, okretaja, promjer_m, w):',
    '    """Kao dron_spirala.py: stalno naprijed + okretanje (krug r = v/omega) + dizanje regulirano po visini."""',
    '    FB_RC, YAW_RC_FF, UD_FF, DOD_VRIJEME_S, MAX_VISINA_CM = 35, 55, 50, 10, 450',
    '    if visina_cm > MAX_VISINA_CM: print("Spirala previsoka - preskacem."); return',
    '    omega = 360.0 * okretaja / trajanje_s',
    '    print(f"Spirala: {okretaja} kruga u {trajanje_s} s, promjer {promjer_m} m (FB_RC namjestiti mjerenjem), do {visina_cm} cm")',
    '    h0, yaw_prev, yaw_zbroj, t0 = t.get_height(), t.get_yaw(), 0.0, time.time()',
    '    while True:',
    '        tt = time.time() - t0; h = t.get_height(); y = t.get_yaw()',
    '        yaw_zbroj += (y - yaw_prev + 180) % 360 - 180; yaw_prev = y',
    '        if h >= MAX_VISINA_CM: print("SIGURNOST: prekid uspona."); break',
    '        if tt >= trajanje_s and h >= visina_cm - 20: print(f"Cilj dostignut: {h} cm."); break',
    '        if tt >= trajanje_s + DOD_VRIJEME_S: print(f"Visina nije dostignuta u roku ({h} cm) - prekid."); break',
    '        u = min(tt / trajanje_s, 1.0); h_cilj = h0 + (visina_cm - h0) * u',
    '        ud = max(-60, min(100, int(UD_FF + 1.0 * (h_cilj - h))))',
    '        fb, yaw_rc = (FB_RC, max(-100, min(100, int(YAW_RC_FF + 1.0 * (omega * tt - yaw_zbroj))))) if tt < trajanje_s else (0, 0)',
    '        t.send_rc_control(0, fb, ud, yaw_rc)',
    '        w.writerow([round(tt, 2), "spirala", h, round(yaw_zbroj, 1), t.get_battery()])',
    '        time.sleep(0.05)',
    '    t.send_rc_control(0, 0, 0, 0); time.sleep(1.0)', '');
  L.push('def main():', '    t = Tello(); t.connect()', '    bat = t.get_battery(); print(f"[TELLO] spojen, baterija {bat} %")',
    '    if bat < MIN_BATERIJA: print(f"Baterija ispod {MIN_BATERIJA} % - ne letim."); return',
    '    f = open(LOG, "w", newline=""); w = csv.writer(f, delimiter=";")',
    '    w.writerow(["t_s", "naredba", "visina_cm", "kut_deg", "baterija"]); t0 = time.time()',
    '    def zapis(n):', '        h, k = t.get_height(), t.get_yaw()', '        print(f"  {time.time() - t0:5.1f} s  {n:<22} visina {h:4d} cm  kut {k:4d}")',
    '        w.writerow([round(time.time() - t0, 2), n, h, k, t.get_battery()]); f.flush()', '    try:');
  C.forEach(c => {
    const a = c.a, n = c.txt.replace(/"/g, "'");
    if (c.k === 'takeoff') L.push('        t.takeoff(); time.sleep(1.0); zapis("takeoff")');
    else if (c.k === 'land') L.push('        t.land(); zapis("land")');
    else if (PY_MAP[c.k]) L.push('        t.' + PY_MAP[c.k] + '(' + a[0] + '); zapis("' + n + '")');
    else if (c.k === 'go') L.push('        t.go_xyz_speed(' + a.join(', ') + '); zapis("' + n + '")');
    else if (c.k === 'speed') L.push('        t.set_speed(' + a[0] + ')');
    else if (c.k === 'wait') L.push('        time.sleep(' + a[0] + ')');
    else if (c.k === 'rc') L.push('        t.send_rc_control(' + a.slice(0, 4).join(', ') + '); time.sleep(' + a[4] + '); t.send_rc_control(0, 0, 0, 0); zapis("' + n + '")');
    else if (c.k === 'spirala') L.push('        spirala(t, ' + a.join(', ') + ', w); zapis("' + n + '")');
  });
  L.push('    except KeyboardInterrupt:', '        print("\\nPrekid s tipkovnice - slijecem.")',
    '    except Exception as e:', '        print(f"\\nGRESKA: {type(e).__name__}: {e} - slijecem.")',
    '    finally:', '        f.close()', '        if t.is_flying:', '            try:', '                t.land()',
    '            except Exception as e:', '                print("Land nije uspio, pokusavam ponovno:", e); time.sleep(1.0); t.land()   # NE emergency s visine',
    '        print(f"Zapis: {LOG}. Baterija {t.get_battery()} %")', '', 'if __name__ == "__main__":', '    main()');
  return L.join('\n');
}
function luaKod() {
  const C = program.cmds, L = [];
  L.push('-- CoppeliaSim 4.10: isti program kao na DJI Tellu, na modelu Quadcopter (models/robots/mobile/Quadcopter.ttm).',
    '-- Izvezeno s dos.fortroniq.hr/ar/tello/. Skriptu stavi u scenu (npr. na Floor, kao /Floor/LetSkripta) i pokreni simulaciju.',
    '-- Skripta vodi target modela po putanji i svakih 0,05 s zapisuje cilj i stvarni položaj modela u sim_let.csv.',
    "DIR = ''                    -- mapa za zapis, npr. 'C:/Users/Ime/Desktop/' (prazno = radna mapa CoppeliaSima)",
    'DT = 0.05', 'traj = {}', 'local cur = {x=0, y=0, z=0.5, yaw=0}   -- model počinje lebdeći na 0,5 m',
    'local v = 0.5', 'local function dodaj(x, y, z, yaw) traj[#traj+1] = {x, y, z, yaw}; cur = {x=x, y=y, z=z, yaw=yaw} end',
    'local function linija(x, y, z, yaw, trajanje)', '  local s = cur; local n = math.max(1, math.floor(trajanje/DT + 0.5))',
    '  for i = 1, n do local u = i/n', '    dodaj(s.x+(x-s.x)*u, s.y+(y-s.y)*u, s.z+(z-s.z)*u, s.yaw+(yaw-s.yaw)*u) end', 'end',
    'local function stoj(t) linija(cur.x, cur.y, cur.z, cur.yaw, t) end',
    'local function pomak(dx, dy, dz, brz)    -- u KS drona: x naprijed, y lijevo (m)',
    '  local c, s = math.cos(cur.yaw), math.sin(cur.yaw); local d = math.sqrt(dx*dx + dy*dy + dz*dz)',
    '  linija(cur.x + dx*c - dy*s, cur.y + dx*s + dy*c, cur.z + dz, cur.yaw, math.max(0.6, d/brz)) end',
    'local function na_visinu(z, brz) linija(cur.x, cur.y, z, cur.yaw, math.max(0.6, math.abs(z-cur.z)/brz)) end',
    'local function okreni(deg, w) linija(cur.x, cur.y, cur.z, cur.yaw + math.rad(deg), math.abs(deg)/w) end   -- deg > 0 = CCW',
    'local function spirala(z1, T, okr, D)    -- kao dron_spirala.py: krug okretanjem (model to teško prati) ili bez okretanja',
    '  local r, n, z0, x0, y0, k0 = D/2, math.floor(T/DT + 0.5), cur.z, cur.x, cur.y, cur.yaw',
    '  for i = 1, n do local u = i/n; local th = 2*math.pi*okr*u',
    '    local px, py = r*math.sin(th), -r + r*math.cos(th)',
    '    dodaj(x0 + px*math.cos(k0) - py*math.sin(k0), y0 + px*math.sin(k0) + py*math.cos(k0), z0 + (z1-z0)*u, k0) end',
    '  stoj(1.0) end', '', 'function gradi()', '  dodaj(0, 0, 0.5, 0); stoj(1.0)');
  C.forEach(c => {
    const a = c.a, kom = '  -- ' + c.txt;
    if (c.k === 'takeoff') L.push('  na_visinu(0.8, 0.4); stoj(1.0)' + '            -- takeoff: Tello lebdi na ~0,8 m');
    else if (c.k === 'land') L.push('  na_visinu(0.1, 0.5); stoj(2.0)' + kom);
    else if (c.k === 'up' || c.k === 'down') L.push('  na_visinu(cur.z ' + (c.k === 'up' ? '+ ' : '- ') + (a[0] / 100) + ', 0.4); stoj(0.5)' + kom);
    else if (['forward', 'back', 'left', 'right'].includes(c.k)) { const d = a[0] / 100, m = { forward: [d, 0], back: [-d, 0], left: [0, d], right: [0, -d] }[c.k]; L.push('  pomak(' + m[0] + ', ' + m[1] + ', 0, v); stoj(0.5)' + kom); }
    else if (c.k === 'go') L.push('  pomak(' + a[0] / 100 + ', ' + a[1] / 100 + ', ' + a[2] / 100 + ', ' + a[3] / 100 + '); stoj(0.5)' + kom);
    else if (c.k === 'cw' || c.k === 'ccw') L.push('  okreni(' + (c.k === 'cw' ? -a[0] : a[0]) + ', 60); stoj(0.5)' + kom);
    else if (c.k === 'speed') L.push('  v = ' + a[0] / 100 + kom);
    else if (c.k === 'wait') L.push('  stoj(' + a[0] + ')' + kom);
    else if (c.k === 'rc') L.push('  -- ' + c.txt + ': rc nema izravan par u modelu; preskočeno');
    else if (c.k === 'spirala') L.push('  spirala(' + a[0] / 100 + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')' + kom);
  });
  L.push('end', '', 'function sysCall_init()', "  base = sim.getObject('/Quadcopter/base')",
    "  target = sim.getObject('/Quadcopter/base/target', {noError=true})", "  if target == -1 then target = sim.getObject('/target') end",
    '  gradi()', "  f = io.open(DIR..'sim_let.csv', 'w')", "  f:write('t_s;cilj_x;cilj_y;cilj_z;cilj_kut_deg;dron_x;dron_y;dron_z;dron_kut_deg\\n')", '  i = 0', 'end',
    'function sysCall_actuation()', '  i = i + 1', '  local p = traj[math.min(i, #traj)]',
    '  sim.setObjectPosition(target, {p[1], p[2], p[3]}, sim.handle_world)', '  sim.setObjectOrientation(target, {0, 0, p[4]}, sim.handle_world)', 'end',
    'function sysCall_sensing()', '  local p = traj[math.min(i, #traj)]', '  local b = sim.getObjectPosition(base, sim.handle_world)', '  local o = sim.getObjectOrientation(base, sim.handle_world)',
    "  if f then f:write(string.format('%.2f;%.3f;%.3f;%.3f;%.1f;%.3f;%.3f;%.3f;%.1f\\n', sim.getSimulationTime(),",
    '    p[1], p[2], p[3], math.deg(p[4]), b[1], b[2], b[3], math.deg(o[3]))) end', 'end', 'function sysCall_cleanup() if f then f:close() end end');
  return L.join('\n');
}
function prikaziKod(el, tekst) {
  el.innerHTML = '';
  tekst.split('\n').forEach((r, i) => { const d = document.createElement('div'); d.innerHTML = '<i>' + (i + 1) + '</i>'; const sp = document.createElement('span'); sp.textContent = r; if (/^\s*(#|--|""")/.test(r)) sp.className = 'kom'; d.appendChild(sp); el.appendChild(d); });
}
let kodPy = '', kodLua = '';
function izvozi() { kodPy = program.cmds.length ? pythonKod() : ''; kodLua = program.cmds.length ? luaKod() : ''; prikaziKod($('py'), kodPy); prikaziKod($('lua'), kodLua); }
function preuzmi(ime, tekst) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/plain' })); a.download = ime; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function kopiraj(tekst, gumb) { (navigator.clipboard ? navigator.clipboard.writeText(tekst) : Promise.reject()).then(() => { const s = gumb.textContent; gumb.textContent = 'Kopirano'; setTimeout(() => gumb.textContent = s, 1200); }, () => { }); }
const imeDat = () => 'tello_' + ($('p-izbor').value === 'vlastiti' ? 'program' : $('p-izbor').value);
$('py-izvoz').addEventListener('click', () => kodPy && preuzmi(imeDat() + '.py', kodPy));
$('py-kopiraj').addEventListener('click', e => kodPy && kopiraj(kodPy, e.target));
$('lua-izvoz').addEventListener('click', () => kodLua && preuzmi(imeDat() + '_coppeliasim.lua', kodLua));
$('lua-kopiraj').addEventListener('click', e => kodLua && kopiraj(kodLua, e.target));

// ---------------- upravljanje ----------------
function izborVjezbe() {
  const ps = presetSada();
  if (ps.txt) $('p-tekst').value = ps.txt;
  $('p-izvor').textContent = ps.izvor ? 'Kao program ' + ps.izvor + ' s probnih letova 8. 10. 2026.' : 'Upiši naredbe Tello SDK-a, jednu u red.';
  izracunaj();
}
$('p-izbor').addEventListener('change', izborVjezbe);
let odgoda = 0;
$('p-tekst').addEventListener('input', () => { if ($('p-izbor').value !== 'vlastiti') { $('p-izbor').value = 'vlastiti'; $('p-izvor').textContent = 'Vlastiti program (promijenjen iz vježbe).'; } clearTimeout(odgoda); odgoda = setTimeout(izracunaj, 400); });
['m-nacin', 'm-mrak', 'm-strop', 'm-put', 'm-bok', 'm-kut', 'm-leb', 'm-sjeme'].forEach(id => $(id).addEventListener('change', () => { modelPolja(); izracunaj(); }));
['o-sim', 'o-stv'].forEach(id => $(id).addEventListener('change', izracunaj));
$('m-novo').addEventListener('click', () => { $('m-sjeme').value = 1 + Math.floor(Math.random() * 9999); izracunaj(); });
function modelPolja() { const t = $('m-nacin').value === 'tello'; document.querySelectorAll('.samo-tello').forEach(e => e.hidden = !t); $('m-strop').disabled = !$('m-mrak').checked; }
$('pr-plan').addEventListener('change', e => { if (crte.plan) crte.plan.visible = e.target.checked; });
$('pr-trag').addEventListener('change', e => trag.l.visible = e.target.checked);
$('pr-kamera').addEventListener('change', () => { });

// ---------------- pogledi ----------------
let prati = false;
function pogled(v) {
  prati = v === 'prati'; $('prati').setAttribute('aria-pressed', prati ? 'true' : 'false');
  if (prati) return;
  const r = rez.plan; let x0 = -0.3, x1 = 0.3, y0 = -0.3, y1 = 0.3, z1 = 1;
  if (r) r.U.forEach(u => { x0 = Math.min(x0, u.x); x1 = Math.max(x1, u.x); y0 = Math.min(y0, u.y); y1 = Math.max(y1, u.y); z1 = Math.max(z1, u.z); });
  const c = w3((x0 + x1) / 2, (y0 + y1) / 2, z1 / 2), rad = 0.5 * Math.hypot(x1 - x0, y1 - y0, z1) + 0.15;
  const fov = Math.min(kamera.fov, 2 * Math.atan(Math.tan(kamera.fov * D2R / 2) * kamera.aspect) / D2R) * D2R, dist = rad / Math.sin(fov / 2) * 1.05;
  const k = korijen;
  const smjer = v === 'odozgo' ? new THREE.Vector3(0.01, 1, 0.01) : v === 'strana' ? new THREE.Vector3(0, 0.15, 1) : new THREE.Vector3(-1, 0.75, 1);
  kamera.position.copy(c).add(smjer.normalize().multiplyScalar(dist));
  kamera.position.add(k.position); upr.target.copy(c).add(k.position); upr.update();
}
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('prati').addEventListener('click', () => pogled(prati ? 'kosi' : 'prati'));
const zadnjiDron = new THREE.Vector3();
function pratiKorak() {
  const p = dron.getWorldPosition(new THREE.Vector3());
  if (zadnjiDron.lengthSq() === 0) zadnjiDron.copy(p);
  const d = p.clone().sub(zadnjiDron); kamera.position.add(d); upr.target.add(d); zadnjiDron.copy(p);
}

// ---------------- učitavanje modela drona ----------------
new GLTFLoader().load('tello.glb', g => {
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  dron.add(g.scene); $('ucitavanje').remove();
  modelPolja(); izborVjezbe(); pogled('kosi'); boje();
  new MutationObserver(boje).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.FTQ_SPREMNO = true;
}, undefined, () => { $('ucitavanje').textContent = 'Model drona se nije mogao učitati. Stranicu otvori preko poslužitelja, ne izravno iz datoteke.'; });

function velicina() { const w = kut.clientWidth, h = kut.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(kut); velicina();
function crtajUmetak() {   // što vidi kamera drona (donji desni kut)
  if (!$('pr-kamera').checked || renderer.xr.isPresenting) return;
  const W = kut.clientWidth, H = kut.clientHeight, w = Math.round(Math.min(W * 0.34, 300)), h = Math.round(w * 9 / 16), x = W - w - 10, y = 10;
  const vid = dron.visible; dron.visible = false;
  renderer.setScissorTest(true); renderer.setScissor(x - 2, y - 2, w + 4, h + 4); renderer.setViewport(x - 2, y - 2, w + 4, h + 4);
  renderer.setClearColor(0x17656e, 1); renderer.clear();
  renderer.setScissor(x, y, w, h); renderer.setViewport(x, y, w, h); renderer.setClearColor(0xeef1f2, 1); renderer.clear();
  renderer.render(scena, camDron);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); renderer.setClearColor(0x000000, 0);
  dron.visible = vid;
}

// ---------------- proširena stvarnost (WebXR, Chrome na Androidu) ----------------
const krug = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.14, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2ECAD4 }));
krug.matrixAutoUpdate = false; krug.visible = false; scena.add(krug);
let xr = null, xrSmjer = 0, xrZakret = 0;
const sidroP0 = new THREE.Vector3(), sidroSad = new THREE.Matrix4(), sidroInv0 = new THREE.Matrix4(), korM = new THREE.Matrix4(), pomM = new THREE.Matrix4();
function korijenXR() {
  korM.makeRotationY(xrSmjer + xrZakret).setPosition(sidroP0);
  if (xr && xr.sidro && xr.imaPozu) korM.premultiply(pomM.multiplyMatrices(sidroSad, sidroInv0));
  korM.decompose(korijen.position, korijen.quaternion, korijen.scale);
}
const XR_INACICA = 'tello v01';
function stanjeSidra(t) { const el = $('xr-sidro'); if (el && el.textContent !== t) el.textContent = t; }
function presidri() {
  sidroP0.copy(korijen.position);
  const e = new THREE.Euler().setFromQuaternion(korijen.quaternion, 'YXZ'); xrSmjer = e.y - xrZakret;
  pustiSidro(); korijenXR(); xr.trebaSidro = true; xr.slobodno = true; xr.presidreno++;
}
function pustiSidro() { if (xr && xr.sidro) { try { xr.sidro.delete(); } catch (e) { } } if (xr) { xr.sidro = null; xr.imaPozu = false; xr.trebaSidro = false; } }
const sloj = $('xr-sloj'), uputa = $('xr-uputa'), xrGumb = $('xr-gumb');
function sidriUOkviru(frame, ref) {
  xr.trebaSidro = false;
  const gotovo = a => { if (!xr || !xr.postavljen) { try { a.delete(); } catch (e) { } return; } xr.sidro = a; xr.imaPozu = false; xr.izgubljeno = 0; xr.sidroStanje = 'da'; uputa.textContent = 'Križ za polijetanje usidren je na podu. Dodirni Leti; obilazi ga slobodno.'; };
  const nijeUspjelo = () => { if (xr) xr.sidroStanje = 'ne'; if (xr && !xr.presidreno) uputa.textContent = 'Križ je postavljen (uređaj ne podržava sidra, pa može malo plivati). Dodirni Leti.'; };
  try {
    const r = xr.izvor ? frame.getHitTestResults(xr.izvor) : [];
    const hp = r.length ? r[0].getPose(ref) : null;
    if (!xr.slobodno && hp && r[0].createAnchor && Math.hypot(hp.transform.position.x - sidroP0.x, hp.transform.position.y - sidroP0.y, hp.transform.position.z - sidroP0.z) < 0.25) { r[0].createAnchor().then(gotovo, nijeUspjelo); return; }
    if (frame.createAnchor) { frame.createAnchor(new XRRigidTransform({ x: sidroP0.x, y: sidroP0.y, z: sidroP0.z }), ref).then(gotovo, nijeUspjelo); return; }
  } catch (e) { }
  nijeUspjelo();
}
['.xr-vrh', '.xr-dno'].forEach(s => sloj.querySelector(s).addEventListener('beforexrselect', e => e.preventDefault()));
(function () {
  const ua = navigator.userAgent || '';
  const mob = /Android|iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (mob) document.documentElement.classList.add('je-mob');
  const KANON = 'https://dos.fortroniq.hr/ar/tello/';
  const adresa = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.href.split('#')[0] : KANON;
  try { if (window.qrcode) { const qq = qrcode(0, 'M'); qq.addData(adresa); qq.make(); $('qr').innerHTML = qq.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } } catch (e) { }
  $('adresa').textContent = adresa;
  const android = /Android/i.test(ua);
  if (navigator.xr && android) xrGumb.hidden = false;
  if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (ok) { xrGumb.hidden = false; $('ar-poruka').textContent = ''; }
    else if (android) $('ar-poruka').textContent = 'Preglednik javlja da AR nije podržan. Probaj ipak gumb; ako se ne pokrene, provjeri da je instalirana aplikacija Google Play usluge za AR (ARCore).';
  }).catch(e => { if (android) $('ar-poruka').textContent = 'Provjera AR-a nije uspjela (' + (e && e.message || e) + '). Probaj ipak gumb.'; });
  else if (android && !navigator.xr) {
    const a = $('u-chrome'); a.hidden = false;
    a.href = 'intent://' + adresa.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    $('ar-poruka').textContent = 'Ovaj preglednik (npr. Samsung Internet) nema WebXR. Otvori stranicu u Chromeu gumbom iznad.';
  }
  else if (mob && !navigator.xr) $('ar-poruka').textContent = 'Ovaj preglednik nema WebXR. AR radi u Chromeu na Androidu; na iPhoneu Safari to još ne podržava.';
})();
xrGumb.addEventListener('click', () => {
  sloj.hidden = false;
  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'anchors'], domOverlay: { root: sloj } }).then(s => {
    renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
    return renderer.xr.setSession(s).then(() => {
      xr = { s, izvor: null, postavljen: false, sidro: null, imaPozu: false, trebaSidro: false, slobodno: false, izgubljeno: 0, presidreno: 0, sidroStanje: '', okvir: 0 };
      mreza.visible = false; pod.material.opacity = 0.32; korijen.visible = false; prati = false;
      uputa.textContent = 'Usmjeri kameru prema podu i polako pomiči mobitel dok se ne pojavi krug (dronu treba slobodan prostor oko 2 × 2 m).'; stanjeSidra('');
      s.requestReferenceSpace('viewer').then(vs => s.requestHitTestSource({ space: vs })).then(iz => { if (xr) xr.izvor = iz; });
      s.addEventListener('select', () => {
        if (!xr || xr.postavljen || !krug.visible) return;
        sidroP0.setFromMatrixPosition(krug.matrix);
        const c = renderer.xr.getCamera().position;
        xrSmjer = Math.atan2(-(c.z - sidroP0.z), c.x - sidroP0.x) + Math.PI * 0.75;   // korisnik gleda let malo s boka
        pustiSidro(); korijenXR(); korijen.visible = true; xr.postavljen = true; xr.trebaSidro = true; xr.slobodno = false; xr.presidreno = 0; xr.sidroStanje = 'čekam'; krug.visible = false;
        uputa.textContent = 'Križ za polijetanje je postavljen, sidrim ga na pod…';
      });
      s.addEventListener('end', () => {
        if (xr && xr.izvor) xr.izvor.cancel();
        pustiSidro(); xr = null; renderer.xr.enabled = false; sloj.hidden = true;
        korijen.position.set(0, 0, 0); korijen.rotation.set(0, 0, 0); korijen.scale.set(1, 1, 1); korijen.visible = true;
        mreza.visible = true; pod.material.opacity = 0.18; krug.visible = false; velicina(); pogled('kosi');
      });
    });
  }).catch(e => { sloj.hidden = true; $('ar-poruka').textContent = 'Proširena stvarnost se nije mogla pokrenuti (' + (e && e.message ? e.message : e) + ').'; });
});
$('xr-izlaz').addEventListener('click', () => { if (xr) xr.s.end(); });
$('xr-premjesti').addEventListener('click', () => { if (!xr) return; pustiSidro(); stanjeSidra(''); xr.postavljen = false; korijen.visible = false; uputa.textContent = 'Dodirni krug na podu da ponovno postaviš križ za polijetanje.'; });
$('xr-leti').addEventListener('click', () => $('leti').click());
$('xr-pocetak').addEventListener('click', () => $('pocetak').click());
$('xr-zakret').addEventListener('input', e => { xrZakret = +e.target.value * D2R; if (xr && xr.postavljen) korijenXR(); $('xr-zakret-out').textContent = e.target.value + '\u00b0'; });
new MutationObserver(() => { $('xr-leti').textContent = $('leti').textContent; $('xr-leti').setAttribute('aria-pressed', $('leti').getAttribute('aria-pressed')); })
  .observe($('leti'), { childList: true, attributes: true, characterData: true, subtree: true });
function xrKorak(frame, ref) {
  if (xr.trebaSidro) sidriUOkviru(frame, ref);
  if (xr.sidro) {
    const ap = frame.trackedAnchors && !frame.trackedAnchors.has(xr.sidro) ? null : frame.getPose(xr.sidro.anchorSpace, ref);
    if (ap) { sidroSad.fromArray(ap.transform.matrix); if (!xr.imaPozu) { sidroInv0.copy(sidroSad).invert(); xr.imaPozu = true; } korijenXR(); xr.izgubljeno = 0; }
    else if (xr.imaPozu && ++xr.izgubljeno > 45) presidri();
  }
  if (++xr.okvir % 15 === 0) {
    const vp = frame.getViewerPose(ref);
    stanjeSidra(vp && vp.emulatedPosition ? 'Praćenje kamere je slabo: polako pomiči mobitel i osvijetli prostor.'
      : xr.sidroStanje === 'da' ? 'Sidro: aktivno' + (xr.presidreno ? ' (obnovljeno ' + xr.presidreno + '×)' : '') + ' · ' + XR_INACICA
        : xr.sidroStanje === 'ne' ? 'Sidro: preglednik ga ne podržava · ' + XR_INACICA : 'Sidro: postavljam… · ' + XR_INACICA);
  }
}

// ---------------- petlja ----------------
let zadnje = 0, kutProp = 0;
renderer.setAnimationLoop((t, frame) => {
  const dt = zadnje ? Math.min(0.05, (t - zadnje) / 1000) : 0; zadnje = t;
  if (igra.ide && rez.model) {
    postaviT(igra.t + dt * (+$('ubrzanje').value || 1));
    if (igra.t >= rez.model.T - 1e-6) { igra.ide = false; gumbLeti(); }
  }
  kutProp += dt * 40; propeleri.forEach((p, i) => p.rotation.y = (i % 2 ? 1 : -1) * kutProp);
  if (prati && !renderer.xr.isPresenting) pratiKorak(); else zadnjiDron.set(0, 0, 0);
  if (frame && xr && !xr.postavljen && xr.izvor) {
    const r = frame.getHitTestResults(xr.izvor);
    const p = r.length ? r[0].getPose(renderer.xr.getReferenceSpace()) : null;
    if (p) { krug.visible = true; krug.matrix.fromArray(p.transform.matrix); uputa.textContent = 'Dodirni krug da postaviš križ za polijetanje.'; } else krug.visible = false;
  }
  if (frame && xr && xr.postavljen) xrKorak(frame, renderer.xr.getReferenceSpace());
  if (xr) $('xr-napredak').textContent = $('napredak-txt').textContent;
  const dp = dron.getWorldPosition(new THREE.Vector3());
  sunce.position.set(dp.x + 2, dp.y + 5, dp.z + 2.5); sunce.target.position.copy(dp);
  if (!renderer.xr.isPresenting) upr.update();
  renderer.render(scena, kamera);
  crtajUmetak();
});
window.FTQ_TELLO = { simuliraj, citajProgram, get rez() { return rez; }, postaviT, pythonKod, luaKod, igra };
