// projekt.js — „Projektni zadatak: od slike do završnog modela” (aditivne tehnologije).
// 1) imena datoteka i mapa za predaju iz prezimena, imena i oznake zadatka; 2) kontrolni popis predaje (pamti se u pregledniku);
// 3) slojeviti model za CO₂ laser: presjeci modela na debljini kartona, slaganje dijelova na ploče, gravura broja sloja i obrisa
//    sljedećeg sloja, izvoz DXF (R12, mm, slojevi REZ / GRAVURA / OKVIR) i SVG, 3D prikaz složenih slojeva.
// Presjeci i pomaci: ClipperLib preko FTQ_REZAC (ar/prusa-mk3s/rezac.js). Koordinate modela: mm, Z gore.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CIT from '../prusa-mk3s/citac.js?v=01';

const $ = id => document.getElementById(id);
const br = (v, d = 1) => { if (!isFinite(v)) return '–'; let s = Math.abs(v).toFixed(d).replace('.', ','); const [c, dec] = s.split(','); const cc = c.length > 4 ? c.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : c; return (v < 0 && +Math.abs(v).toFixed(d) !== 0 ? '−' : '') + cc + (dec ? ',' + dec : ''); };
function preuzmi(ime, data, tip) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: tip || 'application/octet-stream' })); a.download = ime; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
const spremi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const procitaj = (k, z) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? z : v; } catch (e) { return z; } };
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#10394A';

// =====================================================================================================
// 1) IMENA DATOTEKA I MAPA ZA PREDAJU
// =====================================================================================================
const KLJ_IME = 'ftq-ar-od-slike-do-modela-ime';
const bezRazmaka = s => s.trim().replace(/\s+/g, '_');
const STAVKE = [
  ['sldprt', 'SLDPRT', 'CAD model iz SolidWorksa (parametarski, izvornik)'],
  ['step', 'STEP', 'univerzalni CAD model (AP214)'],
  ['stl', 'STL', 'model za 3D ispis (binarni, mm)'],
  ['3mf', '3MF', 'projekt PrusaSlicera (model + postavke)'],
  ['gcode', 'GCODE', 'program ispisa za MK3S'],
  ['sken', 'STL', 'skenirani model (MakerBot Digitizer; uz to i .MBJ ako postoji)'],
  ['dxf', 'DXF', 'slojevi za CO₂ laser (LaserCut 5.3)'],
  ['docx', 'DOCX', 'tehnička dokumentacija (prema predlošku)'],
  ['pptx', 'PPTX', 'prezentacija (prilaže se u mapu)'],
  ['mp4', 'MP4', 'video prikaz cijelog postupka']
];
function osvjeziImena() {
  const P = bezRazmaka($('i-prezime').value) || 'Prezime', I = bezRazmaka($('i-ime').value) || 'Ime', Z = $('i-zadatak').value, G = $('i-godina').value.trim() || '2025-2026';
  spremi(KLJ_IME, { p: $('i-prezime').value, i: $('i-ime').value, z: Z, g: G });
  const osn = 'AT_' + G + '_' + P + '_' + I + '_' + Z;
  const ime = s => s[0] === 'sken' ? osn + '_sken.' + s[1] : osn + '.' + s[1];
  $('i-popis').innerHTML = STAVKE.map(s => '<tr><td><code>' + ime(s) + '</code>' + s[2] + '</td></tr>').join('');
  const stablo = [P + '_' + I + '/', '└── Projektni_zadatak/',
    '    ├── ' + osn + '.docx', '    ├── ' + osn + '.SLDPRT', '    ├── ' + osn + '.STEP', '    ├── ' + osn + '.STL', '    ├── ' + osn + '.3MF  i  ' + osn + '.GCODE',
    '    ├── ' + osn + '_sken.STL  (i .MBJ)', '    ├── ' + osn + '.DXF',
    '    ├── Slike/', '    │    ├── 1_CAD_model.jpg', '    │    ├── 2_3D_ispis.jpg', '    │    ├── 3_Skeniranje.jpg', '    │    ├── 4_Laseri_kartoni.jpg', '    │    └── 5_Zavrsni_model.jpg',
    '    ├── Video/', '    │    └── Prezentacija.mp4', '    └── Prezentacija/', '         └── ' + osn + '.pptx'].join('\n');
  $('i-stablo').textContent = stablo;
  document.querySelectorAll('[data-dat]').forEach(el => { const s = STAVKE.find(x => x[0] === el.dataset.dat); if (s) el.textContent = ime(s); });
  window.FTQ_PROJEKT.osnova = osn;
}
(function () {
  const sel = $('i-zadatak'); for (let i = 1; i <= 23; i++) { const o = document.createElement('option'); o.value = o.textContent = 'P' + String(i).padStart(2, '0'); sel.appendChild(o); }
  const z = procitaj(KLJ_IME, null);
  if (z) { $('i-prezime').value = z.p || ''; $('i-ime').value = z.i || ''; if (z.z) sel.value = z.z; if (z.g) $('i-godina').value = z.g; }
  ['i-prezime', 'i-ime', 'i-zadatak', 'i-godina'].forEach(id => $(id).addEventListener('input', osvjeziImena));
  $('i-kopiraj').addEventListener('click', async () => {
    const t = $('i-stablo').textContent;
    try { await navigator.clipboard.writeText(t); $('i-poruka').textContent = 'Struktura mape je kopirana.'; } catch (e) { $('i-poruka').textContent = 'Kopiranje nije dopušteno — označi tekst i kopiraj ručno.'; }
  });
})();

// =====================================================================================================
// 2) KONTROLNI POPIS PREDAJE
// =====================================================================================================
const KLJ_POPIS = 'ftq-ar-od-slike-do-modela-popis';
function osvjeziPopis() {
  const k = [...document.querySelectorAll('#k-popis input[type=checkbox]')], n = k.filter(x => x.checked).length;
  $('p-napredak').value = n / k.length; $('p-stanje').textContent = 'Gotovo ' + n + ' od ' + k.length + (n === k.length ? ' — mapa je spremna za predaju.' : '.');
  spremi(KLJ_POPIS, k.map(x => x.checked));
}
(function () {
  const k = [...document.querySelectorAll('#k-popis input[type=checkbox]')], z = procitaj(KLJ_POPIS, []);
  k.forEach((x, i) => { x.checked = !!z[i]; x.addEventListener('change', osvjeziPopis); });
  $('p-ponisti').addEventListener('click', () => { k.forEach(x => { x.checked = false; }); osvjeziPopis(); });
  osvjeziPopis();
})();

// =====================================================================================================
// 3) SLOJEVITI MODEL ZA CO₂ LASER
// =====================================================================================================
const RZ = () => window.FTQ_REZAC, AL = () => window.FTQ_REZAC.alati;
const M = { T: null, ime: '', dim: [0, 0, 0], slojevi: [], dijelovi: [], ploce: 0, rez: 0, grav: 0, upoz: [] };

function postaviModel(T, ime, info) {
  // spusti na z = 0 i centriraj u XY
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { if (T[i + k] < lo[k]) lo[k] = T[i + k]; if (T[i + k] > hi[k]) hi[k] = T[i + k]; }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]];
  const T2 = new Float32Array(T.length); for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) T2[i + k] = T[i + k] - c[k];
  M.T = T2; M.ime = ime; M.dim = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  $('l-model').innerHTML = '<b>' + ime + '</b> · ' + br(M.dim[0]) + ' × ' + br(M.dim[1]) + ' × ' + br(M.dim[2]) + ' mm · ' + br(T.length / 9, 0) + ' trokuta' + (info ? ' · ' + info : '');
  izracunaj();
}
function primjer(k) {
  const p = window.FTQ_PRIMJERI && window.FTQ_PRIMJERI[k]; if (!p) return;
  const T = new Float32Array(p.f.length * 3); for (let i = 0; i < p.f.length; i++) for (let j = 0; j < 3; j++) T[3 * i + j] = p.v[3 * p.f[i] + j];
  postaviModel(T, p.ime, 'primjer');
}
$('l-primjer').addEventListener('change', e => primjer(e.target.value));
$('l-datoteka').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  $('l-model').textContent = 'Učitavam ' + f.name + '…';
  try { const r = await CIT.ucitaj(f); if (!r.T) throw new Error('U datoteci nema 3D modela.'); postaviModel(r.T, f.name, r.info); }
  catch (err) { $('l-model').innerHTML = '<span class="upoz">' + (err.message || err) + '</span>'; }
});

// ---- vlastito pismo za gravuru brojeva (crte, visina 1, širina 0,6) ----
const ZNAMENKE = {
  0: [[[0, 0], [0.6, 0], [0.6, 1], [0, 1], [0, 0]]], 1: [[[0.15, 0.8], [0.35, 1], [0.35, 0]], [[0.1, 0], [0.6, 0]]],
  2: [[[0, 1], [0.6, 1], [0.6, 0.5], [0, 0.5], [0, 0], [0.6, 0]]], 3: [[[0, 1], [0.6, 1], [0.6, 0], [0, 0]], [[0.15, 0.5], [0.6, 0.5]]],
  4: [[[0, 1], [0, 0.5], [0.6, 0.5]], [[0.6, 1], [0.6, 0]]], 5: [[[0.6, 1], [0, 1], [0, 0.5], [0.6, 0.5], [0.6, 0], [0, 0]]],
  6: [[[0.6, 1], [0, 1], [0, 0], [0.6, 0], [0.6, 0.5], [0, 0.5]]], 7: [[[0, 1], [0.6, 1], [0.25, 0]]],
  8: [[[0, 0], [0.6, 0], [0.6, 1], [0, 1], [0, 0]], [[0, 0.5], [0.6, 0.5]]], 9: [[[0.6, 0.5], [0, 0.5], [0, 1], [0.6, 1], [0.6, 0], [0, 0]]]
};
function crteBroja(n, x, y, h) {   // središte (x, y), visina h → otvorene crte u mm
  const s = String(n), w = h * 0.6, raz = h * 0.3, uk = s.length * w + (s.length - 1) * raz, out = [];
  [...s].forEach((d, i) => { const x0 = x - uk / 2 + i * (w + raz); ZNAMENKE[d].forEach(L => out.push(L.map(p => [x0 + p[0] * h, y - h / 2 + p[1] * h]))); });
  return out;
}

function izracunaj() {
  if (!M.T || !RZ()) return;
  const t = Math.max(0.5, +$('l-debljina').value || 3), mj = Math.max(0.05, +$('l-mjerilo').value || 1), kerf = Math.max(0, +$('l-kerf').value || 0);
  const W = Math.max(50, +$('l-pw').value || 600), H = Math.max(50, +$('l-ph').value || 400), raz = Math.max(0, +$('l-razmak').value || 3);
  const A = AL(), SK = A.SK;
  // skaliraj model
  const T = new Float32Array(M.T.length); for (let i = 0; i < T.length; i++) T[i] = M.T[i] * mj;
  const visina = M.dim[2] * mj, N = Math.max(1, Math.round(visina / t));
  const zs = []; for (let i = 0; i < N; i++) zs.push(Math.min((i + 0.5) * visina / N, visina - 1e-3));
  const presjeci = RZ().presjeciMm(T, zs, 0);
  M.upoz = [];
  if (Math.abs(N * t - visina) > 0.25 * t) M.upoz.push('Visina modela ' + br(visina) + ' mm nije višekratnik debljine kartona: ' + N + ' slojeva × ' + br(t) + ' mm = ' + br(N * t) + ' mm. Promijeni mjerilo ili debljinu.');
  // svaki sloj: otoci (dijelovi) s rupama; gravura: broj sloja i obris sljedećeg sloja
  const gravObris = $('l-obris').checked, gravBroj = $('l-broj').checked;
  M.slojevi = presjeci.map((P, i) => ({ i, z0: i * visina / N, P }));
  M.dijelovi = [];
  M.slojevi.forEach((s, i) => {
    const otoci = A.otoci(s.P);
    otoci.forEach((o, j) => {
      const cijeli = o.sve;                                     // obris u Clipper koordinatama (bez širine reza)
      const rez = kerf ? A.pomak(cijeli, kerf / 2) : cijeli;    // laser odnese pola širine reza sa svake strane
      const g = A.granice(rez);
      const grav = [];
      if (gravObris && i + 1 < M.slojevi.length && M.slojevi[i + 1].P.length) {
        const otv = M.slojevi[i + 1].P.map(p => p.concat([p[0]]));   // obris sljedećeg sloja, samo dio unutar ovog dijela
        A.odrezi(otv, A.pomak(cijeli, -0.4)).forEach(L => grav.push(A.izC(L)));
      }
      let br_ = null;
      if (gravBroj) {                                            // najdublja točka dijela (uvlačenjem obrisa) za broj sloja
        let zadnji = null, d = 0;
        for (d = 0.5; d < 40; d += 0.5) { const q = A.pomak(cijeli, -d); if (!q.length) break; zadnji = q; }
        const h = Math.min(8, Math.max(0, (d - 0.5) * 1.6));
        if (zadnji && h >= 2.2) {
          const naj = zadnji.reduce((a, b) => Math.abs(A.povrsina([b])) > Math.abs(A.povrsina([a])) ? b : a);
          const gg = A.granice([naj]), cx = (gg[0] + gg[2]) / 2 / SK, cy = (gg[1] + gg[3]) / 2 / SK;
          crteBroja(i + 1, cx, cy, h).forEach(L => grav.push(L));
          br_ = h;
        }
      }
      M.dijelovi.push({ sloj: i, otok: j, nOtoka: otoci.length, rez: rez.map(A.izC), cijeli: cijeli.map(A.izC), grav, x0: g[0] / SK, y0: g[1] / SK, w: (g[2] - g[0]) / SK, h: (g[3] - g[1]) / SK, broj: br_ });
    });
    if (otoci.length > 1) M.upoz.push('Sloj ' + (i + 1) + ' ima ' + otoci.length + ' odvojena dijela — označi ih i pazi pri lijepljenju (obris sljedećeg sloja pomaže).');
  });
  if (gravBroj) { const bez = M.dijelovi.filter(d => !d.broj).length; if (bez) M.upoz.push(bez + ' dijelova je preusko za broj sloja — označi ih olovkom.'); }
  // slaganje na ploče (police): najviši dijelovi prvi; dio koji ne stane okrene se za 90°
  const red = M.dijelovi.map((d, k) => k).sort((a, b) => Math.max(M.dijelovi[b].h, M.dijelovi[b].w) - Math.max(M.dijelovi[a].h, M.dijelovi[a].w));
  let ploca = 0, x = raz, y = raz, polica = 0; M.preveliki = 0;
  for (const k of red) {
    const d = M.dijelovi[k]; d.rot = false;
    let w = d.w, h = d.h;
    if (w > W - 2 * raz && h <= W - 2 * raz && w <= H - 2 * raz) { d.rot = true; [w, h] = [h, w]; }
    if (w > W - 2 * raz || h > H - 2 * raz) { d.ploca = -1; M.preveliki++; continue; }
    if (x + w + raz > W) { x = raz; y += polica + raz; polica = 0; }
    if (y + h + raz > H) { ploca++; x = raz; y = raz; polica = 0; }
    d.ploca = ploca; d.px = x; d.py = y; d.pw = w; d.ph = h; x += w + raz; polica = Math.max(polica, h);
  }
  if (M.preveliki) M.upoz.push(M.preveliki + ' dijelova ne stane na ploču ' + br(W, 0) + ' × ' + br(H, 0) + ' mm — smanji mjerilo ili povećaj ploču.');
  M.ploce = M.dijelovi.length ? Math.max(...M.dijelovi.map(d => d.ploca)) + 1 : 0;
  M.W = W; M.H = H; M.t = t; M.mj = mj; M.N = N; M.visina = visina;
  // duljine
  const dulj = L => { let s = 0; for (let i = 1; i < L.length; i++) s += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); return s; };
  M.rez = 0; M.grav = 0;
  M.dijelovi.forEach(d => { d.rez.forEach(L => { M.rez += dulj(L.concat([L[0]])); }); d.grav.forEach(L => { M.grav += dulj(L); }); });
  const v = Math.max(1, +$('l-brzina').value || 20), vg = Math.max(1, +$('l-brzina-g').value || 150);
  const tR = M.rez / v + M.grav / vg;
  const kart = M.dijelovi.reduce((s, d) => s + Math.abs(d.cijeli.reduce((a, L) => { let A2 = 0; for (let i = 0, j = L.length - 1; i < L.length; j = i++) A2 += (L[j][0] + L[i][0]) * (L[j][1] - L[i][1]); return a + A2 / 2; }, 0)), 0);
  $('l-stat').innerHTML =
    '<tr><th>Slojeva</th><td>' + N + ' × ' + br(t) + ' mm = ' + br(N * t) + ' mm (model ' + br(visina) + ' mm, mjerilo ' + br(mj, 2) + ')</td></tr>' +
    '<tr><th>Dijelova / ploča</th><td>' + M.dijelovi.length + ' / ' + M.ploce + ' (' + br(W, 0) + ' × ' + br(H, 0) + ' mm)</td></tr>' +
    '<tr><th>Duljina reza</th><td>' + br(M.rez / 1000, 2) + ' m</td></tr>' +
    '<tr><th>Duljina gravure</th><td>' + br(M.grav / 1000, 2) + ' m</td></tr>' +
    '<tr><th>Vrijeme lasera</th><td>≈ ' + Math.floor(tR / 60) + ' min ' + Math.round(tR % 60) + ' s <span class="pom">(procjena: rez ' + v + ' mm/s, gravura ' + vg + ' mm/s, bez praznih hodova)</span></td></tr>' +
    '<tr><th>Karton u dijelovima</th><td>' + br(kart / 100, 1) + ' cm² (' + br(100 * kart / (W * H * Math.max(1, M.ploce)), 0) + ' % ploča)</td></tr>';
  $('l-upoz').innerHTML = M.upoz.length ? '<ul class="lista">' + M.upoz.map(u => '<li class="upoz">' + u + '</li>').join('') + '</ul>' : '<p class="pom">Bez upozorenja.</p>';
  $('l-ploca').max = Math.max(0, M.ploce - 1); if (+$('l-ploca').value >= M.ploce) $('l-ploca').value = 0;
  crtajPlocu(); gradi3d();
}
['l-debljina', 'l-mjerilo', 'l-kerf', 'l-pw', 'l-ph', 'l-razmak', 'l-obris', 'l-broj', 'l-brzina', 'l-brzina-g'].forEach(id => $(id).addEventListener('change', izracunaj));
$('l-ploca').addEventListener('input', crtajPlocu); $('l-cijela').addEventListener('change', crtajPlocu);
$('l-karton').addEventListener('change', e => { const [d, w, h] = e.target.value.split(','); if (d) { $('l-debljina').value = d; $('l-pw').value = w; $('l-ph').value = h; izracunaj(); } });

// položaj točke dijela na ploči
function naPlocu(d, p) {
  const x = p[0] - d.x0, y = p[1] - d.y0;
  return d.rot ? [d.px + y, d.py + (d.w - x)] : [d.px + x, d.py + y];
}

// ---- 2D prikaz ploče ----
function crtajPlocu() {
  const cv = $('l-platno'), ctx = cv.getContext('2d'), k = +$('l-ploca').value || 0;
  const naPl = M.dijelovi.filter(d => d.ploca === k), cijela = $('l-cijela').checked;
  // prikaz: cijela ploča ili samo zauzeti dio (s rubom), da se mali dijelovi vide
  let RW = M.W || 600, RH = M.H || 400;
  if (!cijela && naPl.length) { RW = Math.min(RW, Math.max(RW / 3, Math.max(...naPl.map(d => d.px + d.pw)) + 6)); RH = Math.min(RH, Math.max(RW * 0.3, Math.max(...naPl.map(d => d.py + d.ph)) + 6)); }
  const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = Math.max(120, Math.round(W * RH / RW));
  cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  $('l-ploca-oz').textContent = M.ploce ? 'Ploča ' + (k + 1) + ' / ' + M.ploce + (cijela ? '' : ' · prikazan zauzeti dio ' + Math.round(RW) + ' × ' + Math.round(RH) + ' mm') : '';
  if (!M.dijelovi.length) return;
  const s = Math.min(W / RW, H / RH), Y = y => H - y * s;   // y prema gore
  ctx.fillStyle = css('--tanko'); ctx.fillRect(0, 0, W, H); ctx.strokeStyle = css('--rule'); ctx.lineWidth = 1; ctx.strokeRect(0.5, Y(M.H) + 0.5, M.W * s - 1, M.H * s - 1);
  naPl.forEach(d => {
    ctx.beginPath();
    d.rez.forEach(L => { L.forEach((p, i) => { const q = naPlocu(d, p); i ? ctx.lineTo(q[0] * s, Y(q[1])) : ctx.moveTo(q[0] * s, Y(q[1])); }); ctx.closePath(); });
    ctx.fillStyle = 'rgba(196,160,110,.35)'; ctx.fill('evenodd'); ctx.strokeStyle = '#D1342F'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath();
    d.grav.forEach(L => { L.forEach((p, i) => { const q = naPlocu(d, p); i ? ctx.lineTo(q[0] * s, Y(q[1])) : ctx.moveTo(q[0] * s, Y(q[1])); }); });
    ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 0.9; ctx.stroke();
  });
}
new ResizeObserver(() => crtajPlocu()).observe($('l-platno'));

// ---- 3D prikaz složenih slojeva ----
const el3 = $('scena-l');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
el3.insertBefore(renderer.domElement, el3.firstChild);
const scena = new THREE.Scene(), kamera = new THREE.PerspectiveCamera(36, 1, 1, 5000), upr = new OrbitControls(kamera, renderer.domElement);
upr.enableDamping = true;
scena.add(new THREE.HemisphereLight(0xffffff, 0x8899a0, 1.7));
const sunce = new THREE.DirectionalLight(0xffffff, 1.6); sunce.position.set(200, 400, 300); scena.add(sunce);
const dop = new THREE.DirectionalLight(0xffffff, 0.6); dop.position.set(-300, 200, -200); scena.add(dop);
const grupa = new THREE.Group(); grupa.rotation.x = -Math.PI / 2; scena.add(grupa);   // mm, Z gore
const mreza = new THREE.GridHelper(400, 20); mreza.material.transparent = true; mreza.material.opacity = 0.2; scena.add(mreza);
const vel = () => { const w = el3.clientWidth, h = el3.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); };
new ResizeObserver(vel).observe(el3); vel();
let razmak3 = 0;
function gradi3d() {
  while (grupa.children.length) { const c = grupa.children.pop(); c.geometry && c.geometry.dispose(); }
  if (!M.slojevi.length) return;
  const boje = [0xC9A46E, 0xB78D57];
  M.dijelovi.forEach(d => {
    const L = d.cijeli; if (!L.length) return;
    const van = [L[0]], rupe = L.slice(1);   // otok: prvi obris vanjski, ostali rupe
    van.forEach(V => {
      const sh = new THREE.Shape(V.map(p => new THREE.Vector2(p[0], p[1])));
      rupe.forEach(R => sh.holes.push(new THREE.Path(R.map(p => new THREE.Vector2(p[0], p[1])))));
      const g = new THREE.ExtrudeGeometry(sh, { depth: M.t * 0.97, bevelEnabled: false, curveSegments: 1 });
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: boje[d.sloj % 2], roughness: 0.9 }));
      m.position.z = d.sloj * M.t; m.userData.sloj = d.sloj; grupa.add(m);
    });
  });
  postaviRazmak();
  const r = Math.max(M.dim[0], M.dim[1], M.dim[2]) * M.mj;
  mreza.scale.setScalar(Math.max(0.25, r * 2.5 / 400));
  kamera.near = r / 50; kamera.far = r * 60; kamera.updateProjectionMatrix();
  upr.target.set(0, M.N * M.t / 2, 0); kamera.position.set(r * 1.7, r * 1.5, r * 2.2); upr.update();
}
function postaviRazmak() { razmak3 = +$('l-rastavi').value || 0; grupa.children.forEach(m => { m.position.z = m.userData.sloj * (M.t + razmak3); }); }
$('l-rastavi').addEventListener('input', postaviRazmak);
(function petlja() { requestAnimationFrame(petlja); upr.update(); renderer.render(scena, kamera); })();

// ---- izvoz DXF (R12) i SVG ----
function sviPutevi(k) {   // za ploču k: [{sloj:'REZ'|'GRAVURA', zatvoren, tocke}]
  const out = [];
  M.dijelovi.filter(d => d.ploca === k).forEach(d => {
    d.rez.forEach(L => out.push({ sloj: 'REZ', zatvoren: true, t: L.map(p => naPlocu(d, p)) }));
    d.grav.forEach(L => out.push({ sloj: 'GRAVURA', zatvoren: false, t: L.map(p => naPlocu(d, p)) }));
  });
  // gravura prije reza (dio se ne smije pomaknuti prije gravure), unutarnje konture prije vanjskih
  out.sort((a, b) => (a.sloj === 'GRAVURA' ? 0 : 1) - (b.sloj === 'GRAVURA' ? 0 : 1));
  return out;
}
function dxf() {
  const L = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '3'];
  [['REZ', 1], ['GRAVURA', 5], ['OKVIR', 8]].forEach(([n, c]) => L.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', 'CONTINUOUS'));
  L.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  const f = v => (Math.round(v * 1000) / 1000).toString();
  for (let k = 0; k < M.ploce; k++) {
    const ox = k * (M.W + 20);
    const okv = [[0, 0], [M.W, 0], [M.W, M.H], [0, M.H]].map(p => [p[0] + ox, p[1]]);
    const poli = (sloj, T, zat) => { L.push('0', 'POLYLINE', '8', sloj, '66', '1', '10', '0', '20', '0', '30', '0', '70', zat ? '1' : '0'); T.forEach(p => L.push('0', 'VERTEX', '8', sloj, '10', f(p[0]), '20', f(p[1]), '30', '0')); L.push('0', 'SEQEND', '8', sloj); };
    poli('OKVIR', okv, true);
    sviPutevi(k).forEach(p => poli(p.sloj, p.t.map(q => [q[0] + ox, q[1]]), p.zatvoren));
  }
  L.push('0', 'ENDSEC', '0', 'EOF');
  return L.join('\r\n') + '\r\n';
}
function svg() {
  const W = M.ploce * (M.W + 20) - 20, H = M.H, f = v => (Math.round(v * 100) / 100);
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + f(W) + 'mm" height="' + f(H) + 'mm" viewBox="0 0 ' + f(W) + ' ' + f(H) + '">\n';
  s += '<!-- FORTRONIQ slojeviti model: crveno = rez, plavo = gravura, sivo = okvir ploče (ne reže se). mm -->\n';
  for (let k = 0; k < M.ploce; k++) {
    const ox = k * (M.W + 20);
    s += '<g id="ploca-' + (k + 1) + '"><rect x="' + ox + '" y="0" width="' + M.W + '" height="' + M.H + '" fill="none" stroke="#999999" stroke-width="0.2"/>\n';
    sviPutevi(k).forEach(p => {
      const d = p.t.map((q, i) => (i ? 'L' : 'M') + f(q[0] + ox) + ' ' + f(H - q[1])).join(' ') + (p.zatvoren ? ' Z' : '');
      s += '<path d="' + d + '" fill="none" stroke="' + (p.sloj === 'REZ' ? '#FF0000' : '#0000FF') + '" stroke-width="0.1"/>\n';
    });
    s += '</g>\n';
  }
  return s + '</svg>\n';
}
const imeIzvoza = ext => (window.FTQ_PROJEKT.osnova || 'slojeviti_model') + '.' + ext;
$('l-dxf').addEventListener('click', () => { if (M.ploce) preuzmi(imeIzvoza('DXF'), dxf(), 'application/dxf'); });
$('l-svg').addEventListener('click', () => { if (M.ploce) preuzmi(imeIzvoza('svg'), svg(), 'image/svg+xml'); });

// ---- početak ----
window.FTQ_PROJEKT = { M, izracunaj, dxf, svg, primjer, osnova: '' };
osvjeziImena();
(function cekaj(n) { if (window.FTQ_REZAC && window.FTQ_PRIMJERI) { primjer($('l-primjer').value || 'n14'); window.FTQ_SPREMNO = true; } else if (n < 200) setTimeout(() => cekaj(n + 1), 50); })(0);
