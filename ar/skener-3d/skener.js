// skener.js — 3D skeniranje: virtualni MakerBot Digitizer (laserska triangulacija na okretnom stolu), sken mobitelom (fotogrametrija),
// dorada skena (mjerilo, orijentacija, rezanje podloge, otočići, rupe, pojednostavljenje), usporedba skena s CAD modelom (poravnanje ICP,
// karta odstupanja) i izvoz STL/PLY/OBJ te prijenos na stranicu Prusa MK3S. Koordinate modela: mm, Z gore. Scena: metri, Y gore.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshBVH } from 'three/addons/libs/three-mesh-bvh.module.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as CIT from '../prusa-mk3s/citac.js?v=01';
import { edgeTable, triTable } from './mc_tablice.js';

const $ = id => document.getElementById(id);
const D2R = Math.PI / 180;
const br = (v, d = 1) => { if (!isFinite(v)) return '–'; const s = Math.abs(v).toFixed(d).replace('.', ','); const [c, dec] = s.split(','); const cc = c.length > 4 ? c.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : c; return (v < 0 && +s.replace(',', '.') !== 0 ? '−' : '') + cc + (dec != null ? ',' + dec : ''); };
function preuzmi(ime, data, tip) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: tip || 'application/octet-stream' })); a.download = ime; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const mmZgore = g => { g.rotation.x = -Math.PI / 2; g.scale.setScalar(0.001); return g; };   // grupa u mm (Z gore) unutar scene u metrima

function scena3d(el, opc) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
  el.insertBefore(renderer.domElement, el.firstChild);
  const scena = new THREE.Scene(), kamera = new THREE.PerspectiveCamera(36, 1, 0.002, 20), upr = new OrbitControls(kamera, renderer.domElement);
  upr.enableDamping = true; upr.minDistance = 0.03; upr.maxDistance = 5; upr.maxPolarAngle = Math.PI * (opc && opc.ispod ? 1 : 0.495);
  scena.add(new THREE.HemisphereLight(0xffffff, 0x8899a0, 1.6));
  const sunce = new THREE.DirectionalLight(0xffffff, 1.7); sunce.position.set(0.5, 1.2, 0.8); sunce.castShadow = true; sunce.shadow.mapSize.set(2048, 2048);
  Object.assign(sunce.shadow.camera, { left: -0.4, right: 0.4, top: 0.4, bottom: -0.4, near: 0.1, far: 4 }); scena.add(sunce);
  const dop = new THREE.DirectionalLight(0xffffff, 0.7); dop.position.set(-0.8, 0.6, -0.5); scena.add(dop);
  const korijen = new THREE.Group(); scena.add(korijen);
  const pod = new THREE.Mesh(new THREE.CircleGeometry(1, 72), new THREE.ShadowMaterial({ opacity: 0.16 })); pod.rotation.x = -Math.PI / 2; pod.receiveShadow = true; korijen.add(pod);
  const mreza = new THREE.GridHelper(1, 20); mreza.material.transparent = true; mreza.material.opacity = 0.22; korijen.add(mreza);
  const vel = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); };
  new ResizeObserver(vel).observe(el); vel();
  function pogledaj(centar, rad, smjer) {
    const fov = Math.min(kamera.fov, 2 * Math.atan(Math.tan(kamera.fov * D2R / 2) * kamera.aspect) / D2R) * D2R, dist = rad / Math.sin(fov / 2) * 1.08;
    kamera.position.copy(centar).add(smjer.clone().normalize().multiplyScalar(dist)).add(korijen.position); upr.target.copy(centar).add(korijen.position); upr.update();
  }
  return { renderer, scena, kamera, upr, korijen, pod, mreza, pogledaj };
}

// =====================================================================================================
// 1) VIRTUALNI MAKERBOT DIGITIZER
// =====================================================================================================
const D = scena3d($('scena-d'));
const S_UR = 0.117;   // m po jedinici modela (širina kućišta 47,5 cm prema tehničkim podacima)
const ur = { pivot: new THREE.Group(), vrh: 0, laseri: [], kam: new THREE.Vector3(), ucitan: false };
D.korijen.add(ur.pivot);
const predmet = mmZgore(new THREE.Group()); ur.pivot.add(predmet);   // predmet na okretnom stolu (mm, Z gore)
const matPredmet = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.75, metalness: 0 });
const mPredmet = new THREE.Mesh(new THREE.BufferGeometry(), matPredmet); mPredmet.castShadow = true; predmet.add(mPredmet);
const oblak = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0.0011, vertexColors: true, sizeAttenuation: true })); predmet.add(oblak);
oblak.frustumCulled = false;
const lepeze = new THREE.Group(); D.korijen.add(lepeze);   // laserske ravnine (svjetlo)
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('makerbot_digitizer.glb', g => {
  const k = g.scene; k.scale.setScalar(S_UR); D.korijen.add(k); k.updateMatrixWorld(true);
  const box = n => new THREE.Box3().setFromObject(n);
  let stol = null; const lece = [];
  k.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
    const ime = o.material && o.material.name;
    if (/gnome/i.test(ime) || ime === 'shadow') o.visible = false;      // predmet iz izvornog modela ne koristimo; sjenu daje scena
    if (ime === 'base') stol = o;
    if (ime === 'laser_lens') lece.push(o);
    if (ime === 'camera') box(o).getCenter(ur.kam);
    if (ime === 'body') o.material.color.multiplyScalar(1.6);          // tamno kućište malo posvijetli da se vide oblici
  });
  const bs = box(stol); ur.vrh = bs.max.y; const c = bs.getCenter(new THREE.Vector3());
  ur.pivot.position.set(c.x, 0, c.z); ur.pivot.attach(stol);
  predmet.position.set(0, ur.vrh + 0.0002, 0);
  ur.laseri = lece.map(l => box(l).getCenter(new THREE.Vector3())).sort((a, b) => a.x - b.x);
  ur.ucitan = true; $('ucitavanje-d').remove();
  D.pogledaj(new THREE.Vector3(c.x, 0.1, c.z + 0.08), 0.3, new THREE.Vector3(0.6, 0.65, 1));
  primjerPredmeta($('d-primjer').value);
}, undefined, e => { console.error(e); $('ucitavanje-d').textContent = 'Model skenera se nije mogao učitati.'; });

// predmet za skeniranje: trokuti (mm, Z gore, dno na 0, središte na osi stola)
const P = { T: null, ime: '', bvh: null, geo: null };
function postaviPredmet(T, ime) {
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], T[i + k]); hi[k] = Math.max(hi[k], T[i + k]); }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]], d = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  const T2 = new Float32Array(T.length); for (let i = 0; i < T.length; i += 3) { T2[i] = T[i] - c[0]; T2[i + 1] = T[i + 1] - c[1]; T2[i + 2] = T[i + 2] - c[2]; }
  P.T = T2; P.ime = ime; P.dim = d; lepezeGotove = false;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(T2, 3)); g.computeVertexNormals();
  mPredmet.geometry.dispose(); mPredmet.geometry = g; P.geo = g; P.bvh = new MeshBVH(g);
  const R = Math.hypot(d[0], d[1]) / 2;
  $('d-info').innerHTML = '<b>' + ime.replace(/</g, '&lt;') + '</b> · ' + br(d[0]) + ' × ' + br(d[1]) + ' × ' + br(d[2]) + ' mm · ' + br(T.length / 9, 0) + ' trokuta' +
    (R > 101.5 || d[2] > 203 ? ' · <span class="upoz">veći od radnog prostora Ø 203 × 203 mm</span>' : '');
  ponistiSken();
}
function primjerPredmeta(k) {
  const p = window.FTQ_PRIMJERI && window.FTQ_PRIMJERI[k]; if (!p) return;
  const T = new Float32Array(p.f.length * 3); for (let i = 0; i < p.f.length; i++) for (let j = 0; j < 3; j++) T[3 * i + j] = p.v[3 * p.f[i] + j];
  postaviPredmet(T, p.ime);
}
$('d-primjer').addEventListener('change', e => { if (e.target.value) primjerPredmeta(e.target.value); });
$('d-datoteka').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  $('d-info').textContent = 'Učitavam ' + f.name + '…';
  try { const r = await CIT.ucitaj(f); if (!r.T) throw new Error('Za skeniranje treba model (STL, OBJ, 3MF, STEP…), ne G-kod.'); postaviPredmet(r.T, f.name); }
  catch (err) { $('d-info').innerHTML = '<span class="upoz">' + (err.message || err) + '</span>'; }
});

// ---- simulacija skeniranja: laserska ravnina kroz os stola, kamera gleda presjek; okreće se stol ----
const SK = { koraci: 400, zraka: 200, sum: 0.5, i: 0, ide: false, toc: [], boje: [], nor: [], izv: [], prazno: [], seed: 1, kut: 0, nagib: 0 };
function laseriULokalno(phi) {   // položaji lasera i kamere u koordinatama predmeta (mm, Z gore) za kut stola phi
  const u = w => { const x = (w.x - ur.pivot.position.x) * 1000, y = -(w.z - ur.pivot.position.z) * 1000, z = (w.y - ur.vrh) * 1000; const c = Math.cos(-phi), s = Math.sin(-phi); return new THREE.Vector3(x * c - y * s, x * s + y * c, z); };
  return { L: ur.laseri.map(u), C: u(ur.kam) };
}
const ray = new THREE.Ray();
function korakSkena() {
  if (!P.bvh || SK.i >= SK.koraci) return false;
  const phi = 2 * Math.PI * SK.i / SK.koraci, { L, C } = laseriULokalno(phi), H = (P.dim ? P.dim[2] : 50) + 10;
  const r = rng(SK.seed * 1000003 + SK.i), koji = $('d-laseri').value;
  L.forEach((l, li) => {
    if (koji !== 'oba' && +koji !== li) return;
    for (let k = 0; k < SK.zraka; k++) {
      const cilj = new THREE.Vector3(0, 0, -25 + (H + 25) * k / (SK.zraka - 1));   // lepeza seže do ploče stola ispred predmeta   // zrake lepeze ciljaju os stola
      ray.origin.copy(l); ray.direction.subVectors(cilj, l).normalize();
      const hit = P.bvh.raycastFirst(ray, THREE.DoubleSide);
      if (!hit) {   // laser pada na stol: prostor do stola je prazan (ako ga kamera vidi)
        if (ray.direction.z >= -1e-6) continue; const t = -l.z / ray.direction.z, sx = l.x + ray.direction.x * t, sy = l.y + ray.direction.y * t;
        if (Math.hypot(sx, sy) > 101.5 || k % 2) continue;
        const st = new THREE.Vector3(sx, sy, 0), dc = st.clone().sub(C), dl = dc.length(); ray.origin.copy(C); ray.direction.copy(dc).multiplyScalar(1 / dl);
        const h3 = P.bvh.raycastFirst(ray, THREE.DoubleSide); if (h3 && h3.distance < dl - 0.5) continue;
        SK.prazno.push(C.x, C.y, C.z, sx, sy, 0, l.x, l.y, l.z, sx, sy, 0); continue;
      }
      const p = hit.point;
      // kamera mora vidjeti osvijetljenu točku (inače je u sjeni ili zaklonjena)
      ray.origin.copy(C); ray.direction.subVectors(p, C); const d = ray.direction.length(); ray.direction.multiplyScalar(1 / d);
      const h2 = P.bvh.raycastFirst(ray, THREE.DoubleSide); if (!h2 || Math.abs(h2.distance - d) > 0.3) continue;
      const s = SK.sum * gauss(r);   // mjerna nesigurnost uzduž zrake kamere
      SK.toc.push(p.x + ray.direction.x * s, p.y + ray.direction.y * s, p.z + ray.direction.z * s);
      const f = 9 * hit.faceIndex, T = P.T, nx = (T[f + 4] - T[f + 1]) * (T[f + 8] - T[f + 2]) - (T[f + 5] - T[f + 2]) * (T[f + 7] - T[f + 1]), ny = (T[f + 5] - T[f + 2]) * (T[f + 6] - T[f]) - (T[f + 3] - T[f]) * (T[f + 8] - T[f + 2]), nz = (T[f + 3] - T[f]) * (T[f + 7] - T[f + 1]) - (T[f + 4] - T[f + 1]) * (T[f + 6] - T[f]);
      let nl = Math.hypot(nx, ny, nz) || 1, sg = ((C.x - p.x) * nx + (C.y - p.y) * ny + (C.z - p.z) * nz) < 0 ? -1 : 1;   // normala prema kameri
      SK.nor.push(sg * nx / nl, sg * ny / nl, sg * nz / nl); SK.izv.push(C.x, C.y, C.z, l.x, l.y, l.z);
      SK.boje.push(li ? 1 : 0.95, li ? 0.55 : 0.12, li ? 0.1 : 0.12);
    }
  });
  SK.i++; return true;
}
let oblakKap = 0, oblakN = 0, zadnjeOsvj = 0;
function osvjeziOblak(sve) {   // točke idu u unaprijed zauzet spremnik; geometrija se ne gradi iznova
  const n = SK.toc.length / 3, sad = performance.now();
  if (!sve && sad - zadnjeOsvj < 120 && n > oblakN) return; zadnjeOsvj = sad;
  if (n > oblakKap || !oblak.geometry.attributes.position) {
    oblakKap = Math.max(n, SK.koraci * SK.zraka * 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(oblakKap * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(oblakKap * 3), 3));
    oblak.geometry.dispose(); oblak.geometry = g; oblakN = 0;
  }
  const pa = oblak.geometry.attributes.position, ca = oblak.geometry.attributes.color;
  if (n < oblakN) oblakN = 0;
  for (let i = oblakN * 3; i < n * 3; i++) { pa.array[i] = SK.toc[i]; ca.array[i] = SK.boje[i]; }
  pa.needsUpdate = true; ca.needsUpdate = true; oblak.geometry.setDrawRange(0, n); oblakN = n;
  $('d-napredak').value = SK.i / SK.koraci;
  $('d-stanje').innerHTML = 'Korak <b>' + SK.i + '</b> / ' + SK.koraci + ' · kut stola ' + br(360 * SK.i / SK.koraci, 1) + '° · točaka <b>' + br(n, 0) + '</b>' +
    ' · vrijeme stvarnog skenera ~' + br(12 * SK.i / 800, 1) + ' min (800 koraka ≈ 12 min)';
}
function ponistiSken() { SK.i = 0; SK.toc = []; SK.boje = []; SK.nor = []; SK.izv = []; SK.prazno = []; SK.ide = false; SK.seed++; ur.pivot.rotation.y = 0; oblakN = 0; osvjeziOblak(true); gumbSken(); $('d-mreza-info').textContent = ''; }
function gumbSken() { $('d-skeniraj').textContent = SK.ide ? 'Pauza' : (SK.i >= SK.koraci ? 'Skeniraj ponovno' : SK.i ? 'Nastavi' : 'Skeniraj'); }
$('d-skeniraj').addEventListener('click', () => {
  if (!P.bvh) return;
  if (SK.ide) { SK.ide = false; gumbSken(); return; }
  if (SK.i >= SK.koraci) ponistiSken();
  SK.koraci = +$('d-koraci').value; SK.zraka = +$('d-zraka').value; SK.sum = +$('d-sum').value;
  SK.ide = true; gumbSken();
});
$('d-ponisti').addEventListener('click', ponistiSken);
$('d-odmah').addEventListener('click', () => { if (!P.bvh) return; if (SK.i >= SK.koraci) ponistiSken(); SK.koraci = +$('d-koraci').value; SK.zraka = +$('d-zraka').value; SK.sum = +$('d-sum').value; while (korakSkena()); SK.ide = false; ur.pivot.rotation.y = 0; osvjeziOblak(true); gumbSken(); });
['d-koraci', 'd-zraka', 'd-sum', 'd-laseri'].forEach(id => $(id).addEventListener('change', ponistiSken));
// laserske lepeze (vizualno) za trenutni korak
const matLep = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
let lepezeGotove = false;
function crtajLepeze() {
  lepeze.visible = !!SK.ide; if (lepezeGotove || !ur.ucitan) return; lepezeGotove = true; lepeze.clear();
  const H = ((P.dim ? P.dim[2] : 50) + 8) / 1000, os = ur.pivot.position;
  ur.laseri.forEach((l, li) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([l.x, l.y, l.z, os.x, ur.vrh - 0.005, os.z, os.x, ur.vrh + H, os.z], 3));
    lepeze.add(new THREE.Mesh(g, matLep));
  });
}
// ---- mreža iz oblaka: volumetrijsko spajanje (TSDF, kao KinectFusion) + izrezivanje praznog prostora ----
// Svaka zraka kamere do izmjerene točke: čvorovi blizu točke dobiju predznačenu udaljenost (ispred +, iza −), a prostor kojim je zraka
// prošla je prazan. Zrake lasera koje padnu na stol također prazne prostor. Ono što nijedna zraka nije vidjela smatra se materijalom.
function mrezaIzOblaka() {
  const n = SK.toc.length / 3; if (n < 200) return null;
  const T = SK.toc, Z = SK.izv, PR = SK.prazno, d = P.dim || [60, 60, 30];
  const v = Math.max(+$('d-dz').value, Math.max(d[0], d[1], d[2]) / 120), mu = 2.5 * v, pad = 4 * v;
  const lo = [-d[0] / 2 - pad, -d[1] / 2 - pad, -v], hi = [d[0] / 2 + pad, d[1] / 2 + pad, d[2] + pad];
  const nx = Math.ceil((hi[0] - lo[0]) / v) + 1, ny = Math.ceil((hi[1] - lo[1]) / v) + 1, nz = Math.ceil((hi[2] - lo[2]) / v) + 1;
  hi[0] = lo[0] + (nx - 1) * v; hi[1] = lo[1] + (ny - 1) * v; hi[2] = lo[2] + (nz - 1) * v;
  const F = new Float32Array(nx * ny * nz), W = new Float32Array(nx * ny * nz), E = new Uint8Array(nx * ny * nz);
  const id = (i, j, k) => (k * ny + j) * nx + i;
  const vox = (x, y, z) => { const i = Math.round((x - lo[0]) / v), j = Math.round((y - lo[1]) / v), k = Math.round((z - lo[2]) / v); return (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? -1 : id(i, j, k); };
  const korak = v * 0.6;
  // presjek zrake s rešetkom (da se ne hoda cijelim putem od kamere)
  const ulaz = (ox, oy, oz, dx, dy, dz, L) => { let t0 = 0, t1 = L; const o = [ox, oy, oz], dd = [dx, dy, dz]; for (let k = 0; k < 3; k++) { if (Math.abs(dd[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) return null; continue; } let a = (lo[k] - o[k]) / dd[k], b = (hi[k] - o[k]) / dd[k]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); } return t0 <= t1 ? [t0, t1] : null; };
  function zraka(ox, oy, oz, px, py, pz, povrsina) {
    let dx = px - ox, dy = py - oy, dz = pz - oz; const L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
    const r = ulaz(ox, oy, oz, dx, dy, dz, L + (povrsina ? mu : 0)); if (!r) return;
    for (let t = r[0]; t <= r[1]; t += korak) {
      const q = vox(ox + dx * t, oy + dy * t, oz + dz * t); if (q < 0) continue;
      const sd = L - t;
      if (!povrsina || sd > mu) { E[q] = 1; continue; }
      if (sd < -mu) break;
      F[q] = (F[q] * W[q] + sd) / (W[q] + 1); W[q] += 1;
    }
  }
  for (let i = 0; i < n; i++) {
    zraka(Z[6 * i], Z[6 * i + 1], Z[6 * i + 2], T[3 * i], T[3 * i + 1], T[3 * i + 2], true);
    zraka(Z[6 * i + 3], Z[6 * i + 4], Z[6 * i + 5], T[3 * i], T[3 * i + 1], T[3 * i + 2], false);   // svjetlo lasera prošlo je praznim prostorom
  }
  for (let i = 0; i < PR.length; i += 6) zraka(PR[i], PR[i + 1], PR[i + 2], PR[i + 3], PR[i + 4], PR[i + 5], false);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const q = id(i, j, k), z = lo[2] + k * v;
    if (z < 0 || i === 0 || j === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) { F[q] = mu; continue; }   // rub rešetke je zrak: mreža se uvijek zatvara                  // ispod plohe stola je „zrak”, pa se dno zatvara na z = 0
    if (W[q] > 0) continue;
    F[q] = E[q] ? mu : -mu;                              // nevidljivo = materijal
  }
  // marching cubes (unutra < 0)
  const V = [], I = [], rubV = new Map();
  const ug = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const br_ = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const vrh = (i, j, k, e) => {
    const [a, b] = br_[e], A = ug[a], B = ug[b], qa = id(i + A[0], j + A[1], k + A[2]), qb = id(i + B[0], j + B[1], k + B[2]);
    const kljuc = qa < qb ? qa + '_' + qb : qb + '_' + qa; let r = rubV.get(kljuc); if (r !== undefined) return r;
    const fa = F[qa], fb = F[qb], t = Math.abs(fa - fb) < 1e-9 ? 0.5 : fa / (fa - fb);
    r = V.length / 3; V.push(lo[0] + (i + A[0] + (B[0] - A[0]) * t) * v, lo[1] + (j + A[1] + (B[1] - A[1]) * t) * v, lo[2] + (k + A[2] + (B[2] - A[2]) * t) * v); rubV.set(kljuc, r); return r;
  };
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0; for (let c = 0; c < 8; c++) if (F[id(i + ug[c][0], j + ug[c][1], k + ug[c][2])] < 0) ci |= 1 << c;
    if (!edgeTable[ci]) continue;
    for (let t = 16 * ci; triTable[t] !== -1; t += 3) I.push(vrh(i, j, k, triTable[t]), vrh(i, j, k, triTable[t + 1]), vrh(i, j, k, triTable[t + 2]));
  }
  // ukloni sitne otočiće (šum): zadrži dijelove s barem 3 % trokuta najvećeg
  const par = new Int32Array(V.length / 3).map((_, i) => i), nadi = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let q = 0; q < I.length; q += 3) { const a = nadi(I[q]), b = nadi(I[q + 1]), c = nadi(I[q + 2]); par[b] = a; par[nadi(c)] = a; }
  const vel = new Map(); for (let q = 0; q < I.length; q += 3) { const r = nadi(I[q]); vel.set(r, (vel.get(r) || 0) + 1); }
  let najv = 0; vel.forEach(x => { if (x > najv) najv = x; }); const I2 = []; for (let q = 0; q < I.length; q += 3) if (vel.get(nadi(I[q])) >= 0.03 * najv) I2.push(I[q], I[q + 1], I[q + 2]);
  const out = new Float32Array(I2.length * 3); for (let q = 0; q < I2.length; q++) { out[3 * q] = V[3 * I2[q]]; out[3 * q + 1] = V[3 * I2[q] + 1]; out[3 * q + 2] = V[3 * I2[q] + 2]; }
  // usmjerenje: volumen mora biti pozitivan
  let vol = 0; for (let t = 0; t < out.length; t += 9) vol += out[t] * (out[t + 4] * out[t + 8] - out[t + 5] * out[t + 7]) - out[t + 1] * (out[t + 3] * out[t + 8] - out[t + 5] * out[t + 6]) + out[t + 2] * (out[t + 3] * out[t + 7] - out[t + 4] * out[t + 6]);
  if (vol < 0) for (let t = 0; t < out.length; t += 9) for (let k = 0; k < 3; k++) { const a = out[t + 3 + k]; out[t + 3 + k] = out[t + 6 + k]; out[t + 6 + k] = a; }
  out.korak = v; return out;
}
$('d-mreza').addEventListener('click', () => {
  const T = mrezaIzOblaka(); if (!T) { $('d-mreza-info').textContent = 'Premalo točaka — prvo skeniraj.'; return; }
  $('d-mreza-info').textContent = 'Mreža iz oblaka: ' + br(T.length / 9, 0) + ' trokuta, rešetka ' + br(T.korak, 2) + ' mm. Prenesena je u dio „Sken” ispod, a skenirani model postavljen je kao CAD za usporedbu.';
  postaviSken({ T, ime: 'digitizer_' + (P.ime || 'sken').replace(/\.[^.]+$/, '') + '.stl', info: 'virtualni Digitizer' });
  postaviCAD(P.T.slice(), P.ime || 'model');
  setTimeout(() => { poravnaj(false); }, 50);
  document.getElementById('k-sken').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('d-ply').addEventListener('click', () => {
  const n = SK.toc.length / 3; if (!n) return;
  const L = ['ply', 'format ascii 1.0', 'comment FORTRONIQ virtualni MakerBot Digitizer, mm', 'element vertex ' + n, 'property float x', 'property float y', 'property float z', 'end_header'];
  for (let i = 0; i < n; i++) L.push(SK.toc[3 * i].toFixed(3) + ' ' + SK.toc[3 * i + 1].toFixed(3) + ' ' + SK.toc[3 * i + 2].toFixed(3));
  preuzmi('oblak_tocaka.ply', L.join('\n') + '\n', 'text/plain');
});
// umetak: što vidi kamera skenera
const camD = new THREE.PerspectiveCamera(32, 4 / 3, 0.01, 3);
function crtajUmetakD() {
  if (!ur.ucitan || !$('d-kamera').checked) return;
  const r = D.renderer, el = $('scena-d'), W = el.clientWidth, H = el.clientHeight, w = Math.round(Math.min(W * 0.32, 260)), h = Math.round(w * 3 / 4), x = W - w - 10, y = 10;
  camD.position.copy(ur.kam); camD.lookAt(ur.pivot.position.x, ur.vrh + 0.04, ur.pivot.position.z);
  r.setScissorTest(true); r.setScissor(x - 2, y - 2, w + 4, h + 4); r.setViewport(x - 2, y - 2, w + 4, h + 4); r.setClearColor(0x17656e, 1); r.clear();
  r.setScissor(x, y, w, h); r.setViewport(x, y, w, h); r.setClearColor(0x101418, 1); r.clear(); r.render(D.scena, camD);
  r.setScissorTest(false); r.setViewport(0, 0, W, H); r.setClearColor(0x000000, 0);
}
document.querySelectorAll('[data-pogled-d]').forEach(b => b.addEventListener('click', () => {
  if (!ur.ucitan) return; const c = ur.pivot.position, v = b.dataset.pogledD;
  if (v === 'stol') D.pogledaj(new THREE.Vector3(c.x, ur.vrh + 0.03, c.z), 0.09, new THREE.Vector3(0.5, 0.7, 1));
  else if (v === 'odozgo') D.pogledaj(new THREE.Vector3(c.x, ur.vrh, c.z), 0.12, new THREE.Vector3(0.001, 1, 0.001));
  else D.pogledaj(new THREE.Vector3(c.x, 0.1, c.z + 0.08), 0.3, new THREE.Vector3(0.6, 0.65, 1));
}));

// =====================================================================================================
// 2) SKEN: UČITAVANJE, DORADA, USPOREDBA S CAD-om
// =====================================================================================================
const E = scena3d($('scena-s'), { ispod: true });
const svijet = mmZgore(new THREE.Group()); E.korijen.add(svijet);
const matSken = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
const mSken = new THREE.Mesh(new THREE.BufferGeometry(), matSken); mSken.castShadow = true; svijet.add(mSken);
const mCad = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x2ECAD4, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
mCad.renderOrder = 2; svijet.add(mCad);
const mjera = new THREE.Group(); svijet.add(mjera);
// stanje skena: P (Float32 xyz po vrhu), I (indeksi), UV (ili null), tex
const SN = { P: null, I: null, UV: null, tex: null, ime: '', boje: null, povijest: [] };
const CAD = { T: null, bvh: null, geo: null, ime: '' };
function zavari(P) {   // kanonski indeks vrha po položaju (za topologiju)
  const mapa = new Map(), W = new Uint32Array(P.length / 3);
  for (let i = 0; i < W.length; i++) { const k = Math.round(P[3 * i] * 1e3) + ',' + Math.round(P[3 * i + 1] * 1e3) + ',' + Math.round(P[3 * i + 2] * 1e3); let v = mapa.get(k); if (v === undefined) { v = i; mapa.set(k, v); } W[i] = v; }
  return W;
}
function izNeindeksiranog(T) {   // trokuti -> indeksirano (zavareno)
  const mapa = new Map(), P = [], I = new Uint32Array(T.length / 3);
  for (let i = 0; i < T.length / 3; i++) { const k = Math.round(T[3 * i] * 1e3) + ',' + Math.round(T[3 * i + 1] * 1e3) + ',' + Math.round(T[3 * i + 2] * 1e3); let v = mapa.get(k); if (v === undefined) { v = P.length / 3; mapa.set(k, v); P.push(T[3 * i], T[3 * i + 1], T[3 * i + 2]); } I[i] = v; }
  return { P: new Float32Array(P), I };
}
function postaviSken(s) {   // s: { T } ili { P, I, UV, tex }
  if (s.T) { const r = izNeindeksiranog(s.T); SN.P = r.P; SN.I = r.I; SN.UV = null; SN.tex = null; }
  else { SN.P = s.P; SN.I = s.I; SN.UV = s.UV || null; SN.tex = s.tex || null; }
  SN.ime = s.ime; SN.povijest = []; SN.boje = null; SN.izvor = s.info || '';
  naPodlogu(); prikaziSken(); E.pogledaj(new THREE.Vector3(0, centarSkena()[2] / 1000, 0), Math.max(0.05, velicinaSkena() / 1000 * 0.75), new THREE.Vector3(0.6, 0.6, 1));
  $('s-ime').innerHTML = '<b>' + s.ime.replace(/</g, '&lt;') + '</b>' + (s.info ? ' · ' + s.info : '');
  odstupanja(true);
}
function kopijaStanja() { SN.povijest.push({ P: SN.P.slice(), I: SN.I.slice(), UV: SN.UV ? SN.UV.slice() : null }); if (SN.povijest.length > 12) SN.povijest.shift(); }
$('s-natrag').addEventListener('click', () => { const s = SN.povijest.pop(); if (!s) return; Object.assign(SN, s); SN.boje = null; prikaziSken(); odstupanja(true); });
function granice() { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; const P = SN.P; for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); } return { lo, hi }; }
function centarSkena() { const { lo, hi } = granice(); return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; }
function velicinaSkena() { const { lo, hi } = granice(); return Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); }
function naPodlogu() { const { lo, hi } = granice(), c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]]; for (let i = 0; i < SN.P.length; i += 3) { SN.P[i] -= c[0]; SN.P[i + 1] -= c[1]; SN.P[i + 2] -= c[2]; } }
function prikaziSken() {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(SN.P, 3)); g.setIndex(new THREE.BufferAttribute(SN.I, 1));
  if (SN.UV) g.setAttribute('uv', new THREE.BufferAttribute(SN.UV, 2));
  if (SN.boje) g.setAttribute('color', new THREE.BufferAttribute(SN.boje, 3));
  g.computeVertexNormals(); mSken.geometry.dispose(); mSken.geometry = g;
  const karta = SN.boje && $('s-prikaz').value === 'odstupanje';
  matSken.map = !karta && SN.tex && $('s-prikaz').value !== 'siva' ? SN.tex : null; matSken.vertexColors = !!karta; matSken.color.set(karta || matSken.map ? 0xffffff : 0xcfc7b8); matSken.needsUpdate = true;
  statistikaSkena();
}
function statistikaSkena() {
  const { lo, hi } = granice(), W = zavari(SN.P), rub = new Map(); let V = 0;
  const I = SN.I, P = SN.P;
  for (let f = 0; f < I.length; f += 3) {
    const a = I[f], b = I[f + 1], c = I[f + 2];
    V += (P[3 * a] * (P[3 * b + 1] * P[3 * c + 2] - P[3 * b + 2] * P[3 * c + 1]) - P[3 * a + 1] * (P[3 * b] * P[3 * c + 2] - P[3 * b + 2] * P[3 * c]) + P[3 * a + 2] * (P[3 * b] * P[3 * c + 1] - P[3 * b + 1] * P[3 * c])) / 6;
    [[W[a], W[b]], [W[b], W[c]], [W[c], W[a]]].forEach(([p, q]) => { const k = p < q ? p + '_' + q : q + '_' + p; rub.set(k, (rub.get(k) || 0) + 1); });
  }
  let otv = 0; rub.forEach(v => { if (v === 1) otv++; });
  const komp = komponente().n;
  SN.otvoreni = otv;
  $('s-stat').innerHTML = '<tbody><tr><th>Mjere</th><td>' + br(hi[0] - lo[0], 1) + ' × ' + br(hi[1] - lo[1], 1) + ' × ' + br(hi[2] - lo[2], 1) + ' mm</td></tr>' +
    '<tr><th>Trokuta / vrhova</th><td>' + br(I.length / 3, 0) + ' / ' + br(P.length / 3, 0) + '</td></tr>' +
    '<tr><th>Otvoreni rubovi</th><td>' + br(otv, 0) + (otv ? ' — mreža nije zatvorena (rupe)' : ' — zatvorena mreža') + '</td></tr>' +
    '<tr><th>Odvojenih dijelova</th><td>' + br(komp, 0) + (komp > 1 ? ' — vjerojatno smeće iz okoline' : '') + '</td></tr>' +
    '<tr><th>Volumen</th><td>' + (otv ? 'nije određen (otvorena mreža)' : br(Math.abs(V) / 1000, 2) + ' cm³') + '</td></tr>' +
    '<tr><th>Tekstura</th><td>' + (SN.tex ? 'da' : 'ne') + '</td></tr></tbody>';
}
function komponente() {
  const W = zavari(SN.P), par = new Int32Array(SN.P.length / 3).map((_, i) => i);
  const nadi = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let f = 0; f < SN.I.length; f += 3) { const a = nadi(W[SN.I[f]]), b = nadi(W[SN.I[f + 1]]), c = nadi(W[SN.I[f + 2]]); par[b] = a; par[nadi(c)] = a; }
  const lica = new Map(); for (let f = 0; f < SN.I.length; f += 3) { const r = nadi(W[SN.I[f]]); lica.set(r, (lica.get(r) || 0) + 1); }
  return { n: lica.size, lica, nadi, W };
}
function zadrziLica(uvjet) {   // zadrži lica za koja je uvjet(f) istina; očisti nekorištene vrhove
  const novo = []; for (let f = 0; f < SN.I.length; f += 3) if (uvjet(f)) novo.push(SN.I[f], SN.I[f + 1], SN.I[f + 2]);
  const mapa = new Int32Array(SN.P.length / 3).fill(-1), P = [], UV = SN.UV ? [] : null;
  const I = new Uint32Array(novo.length);
  for (let i = 0; i < novo.length; i++) { const v = novo[i]; if (mapa[v] < 0) { mapa[v] = P.length / 3; P.push(SN.P[3 * v], SN.P[3 * v + 1], SN.P[3 * v + 2]); if (UV) UV.push(SN.UV[2 * v], SN.UV[2 * v + 1]); } I[i] = mapa[v]; }
  SN.P = new Float32Array(P); SN.I = I; SN.UV = UV ? new Float32Array(UV) : null;
}
// ---- alati dorade ----
function promijeni(fn) { if (!SN.P) return; kopijaStanja(); fn(); SN.boje = null; prikaziSken(); odstupanja(true); }
function okreni(m) { promijeni(() => { const e = m.elements; for (let i = 0; i < SN.P.length; i += 3) { const x = SN.P[i], y = SN.P[i + 1], z = SN.P[i + 2]; SN.P[i] = e[0] * x + e[4] * y + e[8] * z; SN.P[i + 1] = e[1] * x + e[5] * y + e[9] * z; SN.P[i + 2] = e[2] * x + e[6] * y + e[10] * z; } naPodlogu(); }); }
$('a-rx').addEventListener('click', () => okreni(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
$('a-ry').addEventListener('click', () => okreni(new THREE.Matrix4().makeRotationY(Math.PI / 2)));
$('a-rz').addEventListener('click', () => okreni(new THREE.Matrix4().makeRotationZ(Math.PI / 2)));
$('a-dno').addEventListener('click', () => {   // ravnina kroz najniže točke (podloga) postaje vodoravna
  if (!SN.P) return;
  const n = SN.P.length / 3, z = []; for (let i = 0; i < n; i++) z.push(SN.P[3 * i + 2]); z.sort((a, b) => a - b);
  const prag = z[Math.floor(n * 0.06)], pts = []; for (let i = 0; i < n; i++) if (SN.P[3 * i + 2] <= prag) pts.push([SN.P[3 * i], SN.P[3 * i + 1], SN.P[3 * i + 2]]);
  // najmanji kvadrati z = a x + b y + c
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0; const m = pts.length;
  pts.forEach(([x, y, zz]) => { sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; sxz += x * zz; syz += y * zz; sz += zz; });
  const A = new THREE.Matrix3().set(sxx, sxy, sx, sxy, syy, sy, sx, sy, m).invert(), v = new THREE.Vector3(sxz, syz, sz).applyMatrix3(A);
  const nrm = new THREE.Vector3(-v.x, -v.y, 1).normalize(), q = new THREE.Quaternion().setFromUnitVectors(nrm, new THREE.Vector3(0, 0, 1));
  okreni(new THREE.Matrix4().makeRotationFromQuaternion(q));
  $('a-poruka').textContent = 'Dno poravnato prema ' + br(m, 0) + ' najnižih točaka (nagib ispravljen za ' + br(Math.acos(Math.min(1, nrm.z)) / D2R, 1) + '°).';
});
$('a-rezi').addEventListener('click', () => {
  const h = +$('a-rezi-h').value; if (!SN.P) return;
  promijeni(() => { zadrziLica(f => Math.max(SN.P[3 * SN.I[f] + 2], SN.P[3 * SN.I[f + 1] + 2], SN.P[3 * SN.I[f + 2] + 2]) > h); naPodlogu(); });
  $('a-poruka').textContent = 'Odrezano sve ispod ' + br(h, 1) + ' mm (podloga, stol).';
});
$('a-otoci').addEventListener('click', () => {
  if (!SN.P) return; const K = komponente(); let naj = -1, br_ = 0; K.lica.forEach((v, k) => { if (v > br_) { br_ = v; naj = k; } });
  const prag = +$('a-otoci-p').value / 100 * br_;
  promijeni(() => { const W = K.W; zadrziLica(f => { const r = K.nadi(W[SN.I[f]]); return r === naj || K.lica.get(r) >= prag; }); naPodlogu(); });
  $('a-poruka').textContent = 'Uklonjeni odvojeni dijelovi manji od ' + $('a-otoci-p').value + ' % najvećeg (bilo ih je ' + (K.n - 1) + ').';
});
$('a-rupe').addEventListener('click', () => {
  if (!SN.P) return;
  promijeni(() => {
    const W = zavari(SN.P), usmj = new Map();
    for (let f = 0; f < SN.I.length; f += 3) for (let e = 0; e < 3; e++) { const a = W[SN.I[f + e]], b = W[SN.I[f + (e + 1) % 3]]; usmj.set(a + '_' + b, (usmj.get(a + '_' + b) || 0) + 1); }
    const sljedeci = new Map(); usmj.forEach((v, k) => { const [a, b] = k.split('_').map(Number); if (!usmj.has(b + '_' + a)) sljedeci.set(b, a); });   // rubni brid obrnut (za ispravnu orijentaciju zakrpe)
    const P = Array.from(SN.P), I = Array.from(SN.I), UV = SN.UV ? Array.from(SN.UV) : null, vid = new Set(); let rupa = 0, max = +$('a-rupe-n').value;
    for (const s of sljedeci.keys()) {
      if (vid.has(s)) continue; const L = []; let v = s;
      for (let g = 0; g < 100000; g++) { if (vid.has(v)) break; vid.add(v); L.push(v); const n = sljedeci.get(v); if (n === undefined) break; v = n; }
      if (v !== s || L.length < 3 || L.length > max) continue;
      const c = [0, 0, 0]; L.forEach(i => { c[0] += P[3 * i] / L.length; c[1] += P[3 * i + 1] / L.length; c[2] += P[3 * i + 2] / L.length; });
      const ci = P.length / 3; P.push(...c); if (UV) UV.push(UV[2 * L[0]], UV[2 * L[0] + 1]);
      for (let k = 0; k < L.length; k++) I.push(L[k], L[(k + 1) % L.length], ci);
      rupa++;
    }
    SN.P = new Float32Array(P); SN.I = new Uint32Array(I); SN.UV = UV ? new Float32Array(UV) : null;
    $('a-poruka').textContent = 'Zatvoreno rupa: ' + rupa + ' (do ' + max + ' rubnih bridova). Veće rupe (npr. dno nakon rezanja) zatvori povećanjem granice.';
  });
});
$('a-pojed').addEventListener('click', () => {
  if (!SN.P) return; const h = +$('a-pojed-h').value;
  promijeni(() => {
    const n = SN.P.length / 3, celija = new Map(), mapa = new Int32Array(n), P = [], UV = SN.UV ? [] : null, broj = [];
    for (let i = 0; i < n; i++) {
      const k = Math.floor(SN.P[3 * i] / h) + ',' + Math.floor(SN.P[3 * i + 1] / h) + ',' + Math.floor(SN.P[3 * i + 2] / h);
      let c = celija.get(k); if (c === undefined) { c = P.length / 3; celija.set(k, c); P.push(0, 0, 0); broj.push(0); if (UV) UV.push(SN.UV[2 * i], SN.UV[2 * i + 1]); }
      P[3 * c] += SN.P[3 * i]; P[3 * c + 1] += SN.P[3 * i + 1]; P[3 * c + 2] += SN.P[3 * i + 2]; broj[c]++; mapa[i] = c;
    }
    for (let c = 0; c < broj.length; c++) { P[3 * c] /= broj[c]; P[3 * c + 1] /= broj[c]; P[3 * c + 2] /= broj[c]; }
    const I = []; for (let f = 0; f < SN.I.length; f += 3) { const a = mapa[SN.I[f]], b = mapa[SN.I[f + 1]], c = mapa[SN.I[f + 2]]; if (a !== b && b !== c && a !== c) I.push(a, b, c); }
    const prije = SN.I.length / 3; SN.P = new Float32Array(P); SN.I = new Uint32Array(I); SN.UV = UV ? new Float32Array(UV) : null;
    $('a-poruka').textContent = 'Pojednostavljeno ćelijom ' + br(h, 2) + ' mm: ' + br(prije, 0) + ' → ' + br(I.length / 3, 0) + ' trokuta.';
  });
});
// ---- mjerenje i mjerilo ----
let mjeriMod = false, tockeMjere = [], zadnjaMjera = null;
$('a-mjeri').addEventListener('click', () => { mjeriMod = !mjeriMod; tockeMjere = []; mjera.clear(); $('a-mjeri').setAttribute('aria-pressed', mjeriMod); $('a-mjeri').textContent = mjeriMod ? 'Klikni dvije točke na skenu' : 'Izmjeri udaljenost'; });
const rc = new THREE.Raycaster();
E.renderer.domElement.addEventListener('click', e => {
  if (!mjeriMod || !SN.P) return;
  const r = E.renderer.domElement.getBoundingClientRect();
  rc.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), E.kamera);
  const h = rc.intersectObject(mSken)[0]; if (!h) return;
  const p = svijet.worldToLocal(h.point.clone()); tockeMjere.push(p);
  const kug = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.6, velicinaSkena() / 200), 12, 8), new THREE.MeshBasicMaterial({ color: 0xE0533D })); kug.position.copy(p); mjera.add(kug);
  if (tockeMjere.length === 2) {
    const g = new THREE.BufferGeometry().setFromPoints(tockeMjere); mjera.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xE0533D })));
    zadnjaMjera = tockeMjere[0].distanceTo(tockeMjere[1]);
    $('a-mjera').innerHTML = 'Izmjereno na skenu: <b>' + br(zadnjaMjera, 2) + ' mm</b>. Upiši stvarnu mjeru (pomična mjerka) i klikni „Primijeni mjerilo”.';
    $('a-stvarno').value = br(zadnjaMjera, 2).replace(',', '.');
    mjeriMod = false; $('a-mjeri').setAttribute('aria-pressed', 'false'); $('a-mjeri').textContent = 'Izmjeri udaljenost'; tockeMjere = [];
  }
});
$('a-mjerilo').addEventListener('click', () => {
  if (!SN.P || !zadnjaMjera) { $('a-mjera').textContent = 'Prvo izmjeri udaljenost dviju točaka na skenu.'; return; }
  const k = parseFloat(String($('a-stvarno').value).replace(',', '.')) / zadnjaMjera; if (!(k > 0)) return;
  promijeni(() => { for (let i = 0; i < SN.P.length; i++) SN.P[i] *= k; naPodlogu(); });
  mjera.clear(); $('a-mjera').innerHTML = 'Mjerilo promijenjeno ×' + br(k, 4) + ' (' + br((k - 1) * 100, 2) + ' %).'; zadnjaMjera = null;
});
$('a-xyz').addEventListener('click', () => {   // mjerilo prema poznatoj mjeri po osi
  if (!SN.P) return; const os = +$('a-os').value, { lo, hi } = granice(), sad = hi[os] - lo[os], cilj = parseFloat(String($('a-os-mm').value).replace(',', '.'));
  if (!(cilj > 0) || !(sad > 0)) return; const k = cilj / sad;
  promijeni(() => { for (let i = 0; i < SN.P.length; i++) SN.P[i] *= k; naPodlogu(); });
  $('a-mjera').innerHTML = 'Mjerilo ×' + br(k, 4) + ' (' + 'XYZ'[os] + ' = ' + br(cilj, 2) + ' mm).';
});

// ---- učitavanje skena (mobitel: GLB; OBJ + MTL + PNG; PLY; STL) ----
async function ucitajSken(datoteke) {
  const sve = [...datoteke], glavna = sve.find(f => /\.(glb|gltf|obj|ply|stl|3mf|step|stp)$/i.test(f.name));
  if (!glavna) { $('s-ime').innerHTML = '<span class="upoz">Odaberi GLB, OBJ (s MTL i PNG), PLY ili STL.</span>'; return; }
  $('s-ime').textContent = 'Učitavam ' + glavna.name + '…';
  const url = new Map(sve.map(f => [f.name.toLowerCase(), URL.createObjectURL(f)]));
  const mgr = new THREE.LoadingManager(); mgr.setURLModifier(u => { const ime = decodeURIComponent(u.split('/').pop().split('?')[0]).toLowerCase(); return url.get(ime) || u; });
  const ext = glavna.name.split('.').pop().toLowerCase();
  try {
    let obj = null;
    if (ext === 'glb' || ext === 'gltf') obj = (await new GLTFLoader(mgr).setMeshoptDecoder(MeshoptDecoder).loadAsync(url.get(glavna.name.toLowerCase()))).scene, obj.userData.metri = true;
    else if (ext === 'obj') {
      const mtl = sve.find(f => /\.mtl$/i.test(f.name)); const ol = new OBJLoader(mgr);
      if (mtl) { const m = await new MTLLoader(mgr).loadAsync(url.get(mtl.name.toLowerCase())); m.preload(); ol.setMaterials(m); }
      else { const png = sve.find(f => /\.(png|jpe?g)$/i.test(f.name)); if (png) obj = { tekstura: url.get(png.name.toLowerCase()) }; }
      const o = await ol.loadAsync(url.get(glavna.name.toLowerCase())); if (obj && obj.tekstura) { const t = await new THREE.TextureLoader().loadAsync(obj.tekstura); t.colorSpace = THREE.SRGBColorSpace; t.flipY = true; o.traverse(m => { if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ map: t }); }); } obj = o;
    } else if (ext === 'ply') {
      const g = await new PLYLoader(mgr).loadAsync(url.get(glavna.name.toLowerCase()));
      if (!g.index && g.attributes.position.count && !(g.attributes.position.count % 3 === 0 && g.getAttribute('normal'))) {
        if (!g.index) throw new Error('PLY je oblak točaka bez ploha. Na ovoj stranici iz oblaka mrežu radi virtualni Digitizer; za oblak iz mobitela koristi CloudCompare (Poisson) ili izvezi mrežu (OBJ/GLB).');
      }
      obj = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: !!g.getAttribute('color') }));
    } else {
      const r = await CIT.ucitaj(glavna); if (!r.T) throw new Error('Datoteka nema mrežu.'); postaviSken({ T: r.T, ime: glavna.name, info: r.info }); return;
    }
    obj.updateMatrixWorld(true);
    const P = [], I = [], UV = []; let tex = null, imaUV = true;
    obj.traverse(m => {
      if (!m.isMesh) return; const g = m.geometry, pos = g.attributes.position, uv = g.attributes.uv, idx = g.index, o = P.length / 3, v = new THREE.Vector3();
      if (!uv) imaUV = false; const mat = Array.isArray(m.material) ? m.material[0] : m.material; if (mat && mat.map && !tex) tex = mat.map;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); P.push(v.x, v.y, v.z); UV.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0); }
      if (idx) for (let i = 0; i < idx.count; i++) I.push(o + idx.getX(i)); else for (let i = 0; i < pos.count; i++) I.push(o + i);
    });
    // GLB/glTF: metri i Y gore -> mm i Z gore; OBJ iz skenera (Object Capture) je također u metrima, Y gore
    const PZ = new Float32Array(P.length); let mx = 0;
    for (let i = 0; i < P.length; i += 3) mx = Math.max(mx, Math.abs(P[i]), Math.abs(P[i + 1]), Math.abs(P[i + 2]));
    const k = mx < 5 ? 1000 : 1;   // ako je cijeli model manji od 5 jedinica, to su metri
    for (let i = 0; i < P.length; i += 3) { PZ[i] = P[i] * k; PZ[i + 1] = -P[i + 2] * k; PZ[i + 2] = P[i + 1] * k; }
    postaviSken({ P: PZ, I: new Uint32Array(I), UV: imaUV && tex ? new Float32Array(UV) : null, tex: imaUV ? tex : null, ime: glavna.name, info: ext.toUpperCase() + (k === 1000 ? ', metri → mm' : '') + ', Y gore → Z gore' + (tex && imaUV ? ', s teksturom' : '') });
  } catch (err) { $('s-ime').innerHTML = '<span class="upoz">' + (err.message || err) + '</span>'; }
}
$('s-datoteka').addEventListener('change', e => { if (e.target.files.length) ucitajSken(e.target.files); e.target.value = ''; });
const zona = $('s-ispust');
['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add('iznad'); }));
['dragleave', 'drop'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.remove('iznad'); }));
zona.addEventListener('drop', e => { if (e.dataTransfer.files.length) ucitajSken(e.dataTransfer.files); });
$('s-prikaz').addEventListener('change', prikaziSken);

// ---- CAD za usporedbu, poravnanje (glavne osi + ICP) i odstupanja ----
function postaviCAD(T, ime) {
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], T[i + k]); hi[k] = Math.max(hi[k], T[i + k]); }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]]; for (let i = 0; i < T.length; i += 3) { T[i] -= c[0]; T[i + 1] -= c[1]; T[i + 2] -= c[2]; }
  CAD.T = T; CAD.ime = ime;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(T, 3)); g.computeVertexNormals();
  mCad.geometry.dispose(); mCad.geometry = g; CAD.geo = g; CAD.bvh = new MeshBVH(g);
  $('c-ime').innerHTML = '<b>' + ime.replace(/</g, '&lt;') + '</b> · ' + br(hi[0] - lo[0], 1) + ' × ' + br(hi[1] - lo[1], 1) + ' × ' + br(hi[2] - lo[2], 1) + ' mm';
  mCad.visible = $('c-pokazi').checked;
}
$('c-datoteka').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return; $('c-ime').textContent = 'Učitavam ' + f.name + '…';
  try { const r = await CIT.ucitaj(f); if (!r.T) throw new Error('Za usporedbu treba CAD model (STEP, STL…), ne G-kod.'); postaviCAD(r.T, f.name); }
  catch (err) { $('c-ime').innerHTML = '<span class="upoz">' + (err.message || err) + '</span>'; }
});
$('c-primjer').addEventListener('change', e => { const p = window.FTQ_PRIMJERI[e.target.value]; if (!p) return; const T = new Float32Array(p.f.length * 3); for (let i = 0; i < p.f.length; i++) for (let j = 0; j < 3; j++) T[3 * i + j] = p.v[3 * p.f[i] + j]; postaviCAD(T, p.ime); });
$('c-pokazi').addEventListener('change', () => mCad.visible = $('c-pokazi').checked);
function uzorak(n) { const N = SN.P.length / 3, out = [], r = rng(7); for (let i = 0; i < Math.min(n, N); i++) { const j = N <= n ? i : Math.floor(r() * N); out.push(new THREE.Vector3(SN.P[3 * j], SN.P[3 * j + 1], SN.P[3 * j + 2])); } return out; }
const tmp = {};
function srednjaUdaljenost(tocke) { let s = 0; tocke.forEach(p => { s += CAD.bvh.closestPointToPoint(p, tmp).distance; }); return s / tocke.length; }
function glavneOsi(tocke) {   // težište i svojstveni vektori kovarijance (Jacobi)
  const c = new THREE.Vector3(); tocke.forEach(p => c.add(p)); c.multiplyScalar(1 / tocke.length);
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; tocke.forEach(p => { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; });
  const { vek } = jacobi(C); return { c, osi: vek };
}
function jacobi(A0) {   // svojstvene vrijednosti/vektori simetrične matrice (n×n)
  const n = A0.length, A = A0.map(r => r.slice()), V = A.map((r, i) => r.map((_, j) => i === j ? 1 : 0));
  for (let it = 0; it < 60; it++) {
    let p = 0, q = 1, mx = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(A[i][j]) > mx) { mx = Math.abs(A[i][j]); p = i; q = j; }
    if (mx < 1e-12) break;
    const th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
    for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
    for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
  }
  const vr = A.map((r, i) => r[i]), red = vr.map((v, i) => i).sort((a, b) => vr[b] - vr[a]);
  return { vr: red.map(i => vr[i]), vek: red.map(i => V.map(r => r[i])) };
}
function horn(A, B, sMjerilom) {   // najbolja kruta (i po želji mjerilo) transformacija A -> B (Horn, kvaternioni)
  const ca = new THREE.Vector3(), cb = new THREE.Vector3(); A.forEach(p => ca.add(p)); B.forEach(p => cb.add(p)); ca.multiplyScalar(1 / A.length); cb.multiplyScalar(1 / B.length);
  let S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], na = 0, nb = 0;
  for (let i = 0; i < A.length; i++) { const a = A[i].clone().sub(ca), b = B[i].clone().sub(cb); const aa = [a.x, a.y, a.z], bb = [b.x, b.y, b.z]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r][c] += aa[r] * bb[c]; na += a.lengthSq(); nb += b.lengthSq(); }
  const [[Sxx, Sxy, Sxz], [Syx, Syy, Syz], [Szx, Szy, Szz]] = S;
  const N = [[Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx], [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz], [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy], [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]];
  const q = jacobi(N).vek[0], Q = new THREE.Quaternion(q[1], q[2], q[3], q[0]).normalize();
  const s = sMjerilom ? Math.sqrt(nb / na) : 1;
  const M = new THREE.Matrix4().compose(new THREE.Vector3(), Q, new THREE.Vector3(s, s, s));
  const t = cb.clone().sub(ca.clone().applyMatrix4(M));
  M.setPosition(t); return { M, s };
}
function primijeniNaSken(M) { const e = M.elements; for (let i = 0; i < SN.P.length; i += 3) { const x = SN.P[i], y = SN.P[i + 1], z = SN.P[i + 2]; SN.P[i] = e[0] * x + e[4] * y + e[8] * z + e[12]; SN.P[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; SN.P[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; } }
function poravnaj(grubo) {
  if (!SN.P || !CAD.bvh) { $('c-poruka').textContent = 'Treba i sken i CAD model.'; return; }
  kopijaStanja(); const mjerilo = $('c-mjerilo').checked;
  if (grubo) {   // glavne osi: isprobaj 24 kombinacije smjerova, uzmi najbolju
    const A = uzorak(1500), B = []; const pc = CAD.T; for (let i = 0; i < pc.length; i += 9 * Math.max(1, Math.floor(pc.length / 9 / 1500))) B.push(new THREE.Vector3((pc[i] + pc[i + 3] + pc[i + 6]) / 3, (pc[i + 1] + pc[i + 4] + pc[i + 7]) / 3, (pc[i + 2] + pc[i + 5] + pc[i + 8]) / 3));
    const ga = glavneOsi(A), gb = glavneOsi(B); let naj = null;
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      const ea = ga.osi.map(v => new THREE.Vector3(...v)), eb = gb.osi.map(v => new THREE.Vector3(...v));
      const a3 = ea[0].clone().cross(ea[1]); const b0 = eb[0].clone().multiplyScalar(sx), b1 = eb[1].clone().multiplyScalar(sy), b3 = b0.clone().cross(b1);
      const Ma = new THREE.Matrix4().makeBasis(ea[0], ea[1], a3), Mb = new THREE.Matrix4().makeBasis(b0, b1, b3);
      const R = Mb.clone().multiply(Ma.clone().transpose()), M = new THREE.Matrix4().makeTranslation(gb.c.x, gb.c.y, gb.c.z).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-ga.c.x, -ga.c.y, -ga.c.z));
      const d = srednjaUdaljenost(A.map(p => p.clone().applyMatrix4(M)).filter((_, i) => i % 3 === 0));
      if (!naj || d < naj.d) naj = { d, M };
    }
    primijeniNaSken(naj.M);
  }
  let zadnja = 0, s = 1;
  for (let it = 0; it < 40; it++) {   // ICP: najbliže točke na CAD-u, Horn, ponavljaj
    const A = uzorak(2500), B = A.map(p => CAD.bvh.closestPointToPoint(p, tmp).point.clone());
    const d = A.reduce((z, p, i) => z + p.distanceTo(B[i]), 0) / A.length;
    const r = horn(A, B, mjerilo && it < 30); primijeniNaSken(r.M); s *= r.s;
    if (Math.abs(zadnja - d) < 1e-4) break; zadnja = d;
  }
  SN.boje = null; prikaziSken(); odstupanja(false);
  $('c-poruka').textContent = 'Poravnato (glavne osi' + (grubo ? ' + ' : ', ') + 'ICP)' + (mjerilo ? ', mjerilo ×' + br(s, 4) : '') + '.';
}
$('c-poravnaj').addEventListener('click', () => poravnaj(true));
$('c-fino').addEventListener('click', () => poravnaj(false));
let ODS = null;
function odstupanja(obrisi) {
  if (obrisi || !SN.P || !CAD.bvh) { ODS = null; $('c-stat').innerHTML = ''; crtajHist(); if (SN.boje) { SN.boje = null; } return; }
  const n = SN.P.length / 3, d = new Float32Array(n), p = new THREE.Vector3(), tri = new THREE.Triangle(), nor = new THREE.Vector3(), pos = CAD.geo.attributes.position;
  for (let i = 0; i < n; i++) {
    p.set(SN.P[3 * i], SN.P[3 * i + 1], SN.P[3 * i + 2]); const h = CAD.bvh.closestPointToPoint(p, tmp);
    tri.setFromAttributeAndIndices(pos, 3 * h.faceIndex, 3 * h.faceIndex + 1, 3 * h.faceIndex + 2); tri.getNormal(nor);
    d[i] = Math.sign(p.clone().sub(h.point).dot(nor) || 1) * h.distance;
  }
  ODS = d; bojeOdstupanja(); prikaziSken(); statistikaOdstupanja(); crtajHist();
}
function bojeOdstupanja() {
  if (!ODS) return; const lim = +$('c-raspon').value, tol = +$('c-tol').value, n = ODS.length, C = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const v = ODS[i]; if (Math.abs(v) <= tol) c.setRGB(0.25, 0.75, 0.35); else { const u = Math.max(-1, Math.min(1, v / lim)); c.setHSL(u > 0 ? 0.0 + (1 - u) * 0.12 : 0.6 + (1 + u) * 0.05, 0.85, 0.52); } C.set([c.r, c.g, c.b], 3 * i); }
  SN.boje = C; if ($('s-prikaz').value !== 'odstupanje') $('s-prikaz').value = 'odstupanje';
}
function statistikaOdstupanja() {
  const d = ODS, n = d.length, tol = +$('c-tol').value; let s = 0, s2 = 0, mx = -1e9, mn = 1e9, u = 0;
  for (let i = 0; i < n; i++) { s += d[i]; s2 += d[i] * d[i]; mx = Math.max(mx, d[i]); mn = Math.min(mn, d[i]); if (Math.abs(d[i]) <= tol) u++; }
  const sr = s / n, rms = Math.sqrt(s2 / n), sd = Math.sqrt(Math.max(0, s2 / n - sr * sr));
  $('c-stat').innerHTML = '<tbody><tr><th>Srednje odstupanje</th><td>' + br(sr, 3) + ' mm</td></tr><tr><th>Standardno odstupanje</th><td>' + br(sd, 3) + ' mm</td></tr>' +
    '<tr><th>RMS</th><td>' + br(rms, 3) + ' mm</td></tr><tr><th>Najveće + (višak)</th><td>' + br(mx, 2) + ' mm</td></tr><tr><th>Najveće − (manjak)</th><td>' + br(mn, 2) + ' mm</td></tr>' +
    '<tr><th>Unutar ±' + br(tol, 2) + ' mm</th><td><b>' + br(100 * u / n, 1) + ' %</b> točaka (' + br(n, 0) + ')</td></tr></tbody>';
}
function crtajHist() {
  const cv = $('c-hist'), dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); if (!ODS) return;
  const lim = +$('c-raspon').value, tol = +$('c-tol').value, NB = 41, h = new Array(NB).fill(0);
  ODS.forEach(v => { const k = Math.round((Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim) * (NB - 1)); h[k]++; });
  const mx = Math.max(...h), L = 8, B = 20, w = (W - 2 * L) / NB, ink = getComputedStyle(document.documentElement).getPropertyValue('--body').trim() || '#5D7C90';
  for (let k = 0; k < NB; k++) { const v = -lim + 2 * lim * k / (NB - 1), hh = (H - B - 6) * h[k] / mx; const col = new THREE.Color(); if (Math.abs(v) <= tol) col.setRGB(0.25, 0.75, 0.35); else { const u = v / lim; col.setHSL(u > 0 ? (1 - u) * 0.12 : 0.6 + (1 + u) * 0.05, 0.85, 0.52); } c.fillStyle = '#' + col.getHexString(); c.fillRect(L + k * w, H - B - hh, w - 1, hh); }
  c.fillStyle = ink; c.font = '11px IBM Plex Sans, sans-serif'; c.fillText('−' + br(lim, 1) + ' mm', L, H - 5); const t0 = '0'; c.fillText(t0, W / 2 - 3, H - 5); const t1 = '+' + br(lim, 1) + ' mm'; c.fillText(t1, W - L - c.measureText(t1).width, H - 5);
}
['c-raspon', 'c-tol'].forEach(id => $(id).addEventListener('input', () => { $(id + '-out').textContent = br(+$(id).value, 2) + ' mm'; if (ODS) { bojeOdstupanja(); prikaziSken(); statistikaOdstupanja(); crtajHist(); } }));
$('c-izracunaj').addEventListener('click', () => odstupanja(false));
new ResizeObserver(crtajHist).observe($('c-hist'));

// ---- izvoz ----
function trokutiSkena() { const T = new Float32Array(SN.I.length * 3); for (let i = 0; i < SN.I.length; i++) { const v = SN.I[i]; T[3 * i] = SN.P[3 * v]; T[3 * i + 1] = SN.P[3 * v + 1]; T[3 * i + 2] = SN.P[3 * v + 2]; } return T; }
function stlBinarni(T) { const n = T.length / 9, b = new ArrayBuffer(84 + 50 * n), dv = new DataView(b); dv.setUint32(80, n, true); for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) dv.setFloat32(84 + 50 * i + 12 + 4 * k, T[9 * i + k], true); return b; }
const imeBez = () => (SN.ime || 'sken').replace(/\.[^.]+$/, '');
$('x-stl').addEventListener('click', () => { if (SN.P) preuzmi(imeBez() + '_dorada.stl', stlBinarni(trokutiSkena()), 'model/stl'); });
$('x-obj').addEventListener('click', () => {
  if (!SN.P) return; const L = ['# FORTRONIQ dorada skena, mm, Z gore'];
  for (let i = 0; i < SN.P.length; i += 3) L.push('v ' + SN.P[i].toFixed(4) + ' ' + SN.P[i + 1].toFixed(4) + ' ' + SN.P[i + 2].toFixed(4));
  if (SN.UV) for (let i = 0; i < SN.UV.length; i += 2) L.push('vt ' + SN.UV[i].toFixed(5) + ' ' + SN.UV[i + 1].toFixed(5));
  for (let f = 0; f < SN.I.length; f += 3) { const a = SN.I[f] + 1, b = SN.I[f + 1] + 1, c = SN.I[f + 2] + 1; L.push(SN.UV ? 'f ' + a + '/' + a + ' ' + b + '/' + b + ' ' + c + '/' + c : 'f ' + a + ' ' + b + ' ' + c); }
  preuzmi(imeBez() + '_dorada.obj', L.join('\n') + '\n', 'text/plain');
});
$('x-ply').addEventListener('click', () => {
  if (!SN.P) return; const n = SN.P.length / 3, L = ['ply', 'format ascii 1.0', 'comment FORTRONIQ dorada skena, mm' + (ODS ? ', quality = odstupanje od CAD-a [mm]' : ''), 'element vertex ' + n, 'property float x', 'property float y', 'property float z'];
  if (ODS) L.push('property float quality'); L.push('element face ' + SN.I.length / 3, 'property list uchar int vertex_indices', 'end_header');
  for (let i = 0; i < n; i++) L.push(SN.P[3 * i].toFixed(4) + ' ' + SN.P[3 * i + 1].toFixed(4) + ' ' + SN.P[3 * i + 2].toFixed(4) + (ODS ? ' ' + ODS[i].toFixed(4) : ''));
  for (let f = 0; f < SN.I.length; f += 3) L.push('3 ' + SN.I[f] + ' ' + SN.I[f + 1] + ' ' + SN.I[f + 2]);
  preuzmi(imeBez() + '_dorada.ply', L.join('\n') + '\n', 'text/plain');
});
$('x-prusa').addEventListener('click', async () => {   // prijenos na stranicu Prusa MK3S (isti preglednik, IndexedDB)
  if (!SN.P) return;
  try { await window.FTQ_PRIJENOS.spremi(imeBez() + '_dorada.stl', stlBinarni(trokutiSkena())); location.href = '../prusa-mk3s/index.html?iz=skener'; }
  catch (e) { $('a-poruka').textContent = 'Prijenos nije uspio (' + (e.message || e) + '). Izvezi STL i učitaj ga na stranici Prusa.'; }
});

// =====================================================================================================
// petlje
// =====================================================================================================
let zadnje = 0;
D.renderer.setAnimationLoop(t => {
  const dt = zadnje ? Math.min(0.05, (t - zadnje) / 1000) : 0; zadnje = t;
  if (SK.ide) {
    const n = Math.max(1, Math.round(+$('d-brzina').value * dt * 60)); for (let k = 0; k < n; k++) if (!korakSkena()) { SK.ide = false; break; }
    ur.pivot.rotation.y = -2 * Math.PI * SK.i / SK.koraci; osvjeziOblak(!SK.ide); if (!SK.ide) { gumbSken(); }
  }
  crtajLepeze(); D.upr.update(); D.renderer.render(D.scena, D.kamera); crtajUmetakD();
});
E.renderer.setAnimationLoop(() => { E.upr.update(); E.renderer.render(E.scena, E.kamera); });
window.FTQ_SKENER = { P, SK, SN, CAD, korakSkena, poravnaj, odstupanja, postaviSken, postaviCAD, ucitajSken, mrezaIzOblaka, get ODS() { return ODS; } };
window.FTQ_SPREMNO = true;
