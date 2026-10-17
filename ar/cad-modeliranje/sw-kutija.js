// FORTRONIQ · CAD modeliranje · SolidWorks Sheet Metal: kartonska kutija za sat (stablo značajki korak po korak)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { izracun, ZADANO } from './kutija.js?v=03';

const $ = s => document.querySelector(s);
const P = Object.assign({}, ZADANO);
const K = izracun(P);
const T = P.T, L = P.L, D = P.D, k3 = T / 3;

// ── koraci = značajke u stablu (FeatureManager) ─────────────────────────
// dijelovi: koji se dijelovi savijaju u tom koraku; kut: ciljni kut; slika: snimka iz SolidWorksa 2017
const KORACI = [
  { z: 'Sketch1', n: 'Skica razvijenog oblika na ravnini Top Plane', slika: '01_skica_razvijenog_oblika', pm: [['Ravnina', 'Top Plane'], ['Sadržaj', 'vanjski obris, 6 utora u dnu, 2 utora uz prednji rub, prorez 50 × 4 u poklopcu, prozor Ø 200'], ['Izvor', 'DXF izvornika, samo sloj s obrisom (bez crta pregiba i teksta)']], o: 'Razvijeni oblik je već nacrtan u laserskom programu, pa se u SolidWorks uvozi kao 2D geometrija (*.DXF). Skica mora imati samo zatvorene obrise: vanjski obris i unutarnje rupe. Isprekidane crte pregiba (mjesta savijanja) ne idu u ovu skicu.' },
  { z: 'Base-Flange1', n: 'Osnovna prirubnica iz zatvorene skice', slika: '02_base_flange', pmSlika: 'pm_base_flange', pm: [['Naredba', 'Sheet Metal → Base Flange/Tab'], ['Sheet Metal Parameters', 'T1 = 3.00mm, Reverse direction ☐'], ['Bend Allowance', 'K-Factor 0.5'], ['Auto Relief', 'Rectangular, Use relief ratio ☑, Ratio 0.5']], o: 'Iz zatvorene skice nastaje ploča debljine 3 mm. U stablu se automatski pojave Sheet-Metal (parametri lima) i Flat-Pattern (razvijena ploha). Unutarnji zatvoreni obrisi postaju rupe.' },
  { z: 'Sheet-Metal', n: 'Parametri lima: polumjer savijanja 0,5 mm', slikaPm: true, slika: 'pm_sheet_metal', pm: [['Naredba', 'desni klik na Sheet-Metal → Edit Feature'], ['Bend Parameters', 'Bend radius 0.50mm, Thickness 3.00mm'], ['Bend Allowance', 'K-Factor 0.5'], ['Auto Relief', 'Rectangular, 0.5']], o: 'Polumjer savijanja zadaje se jednom, prije prvog savijanja. Svako savijanje s kvačicom „Use default radius" ga nasljeđuje. S polumjerom 0,7366 mm (zadano u predlošku) treće savijanje nije prošlo, jer su se zone savijanja preklopile.' },
  { z: 'Cut-Extrude1', n: 'Rez jezička brave', slika: '03_cut_extrude', pmSlika: 'pm_cut_extrude', pm: [['Naredba', 'Sheet Metal → Extruded Cut'], ['From', 'Sketch Plane'], ['Direction 1', 'Blind, Link to thickness ☑, Normal cut ☑'], ['Skica', 'U-crta jezička kao prorez širine 0,2 mm (širina reza lasera)']], o: 'Jezičac brave odvaja se od unutarnjeg prednjeg sloja U-rezom. Otvorena crta ne može biti dio osnovne prirubnice, pa se reže posebnom značajkom, kao prorez širine reza.', obiljezi: ['f1'], crte: 'jez' },
  { z: 'Cut-Extrude2', n: 'Rasterećenja na sjecištima pregiba', slika: '03_cut_extrude', pm: [['Naredba', 'Sheet Metal → Extruded Cut'], ['Direction 1', 'Blind, Link to thickness ☑'], ['Skica', '12 krugova: R 2,5 mm (90°), R 2,7 mm (prednji kut), R 3,6 mm (uz porub 180°)']], o: 'Gdje se dva pregiba sastaju, zone savijanja se preklapaju. Kružno rasterećenje izreže materijal na sjecištu, da se svaki pregib može saviti zasebno.', crte: 'rast' },
  { z: 'Sketched Bend1', n: 'Porubi 180°: unutarnji slojevi stijenki', slika: '04_sb_porubi', pmSlika: 'pm_sketched_bend_180', dijelovi: ['w2L', 'w2D', 'f2'], pm: [['Naredba', 'Sheet Metal → Sketched Bend'], ['Skica', '3 crte savijanja (lijevo, desno, naprijed — prekinuta oko jezička)'], ['Fixed face', 'Face<1> (dno)'], ['Bend position', 'Bend Centerline'], ['Bend angle', '180.00deg, Use default radius ☑']], o: 'Unutarnji sloj bočnih i prednje stijenke savija se za 180° preko vanjskog sloja. Jezičac brave ne savija se, jer crta savijanja na njemu prestaje.', crte: 'sb1' },
  { z: 'Sketched Bend2', n: 'Uši 90°', slika: '05_sb_usi', pmSlika: 'pm_sketched_bend_usi', dijelovi: ['upL', 'upD', 'usL', 'usD'], pm: [['Skica', '4 crte na krajevima bočnih stijenki'], ['Fixed face', 'Face<1> (dno)'], ['Bend position', 'Bend Centerline'], ['Bend angle', '90.00deg']], o: 'Četiri uha savijaju se za 90° dok su bočne stijenke još ravne. Nakon što se stijenke podignu, uši leže uz prednju i stražnju stijenku.', crte: 'sb2' },
  { z: 'Sketched Bend3', n: 'Bočni preklopi poklopca 90°', slika: '06_sb_preklopi', dijelovi: ['ppL', 'ppD'], pm: [['Skica', '2 crte uz bočne rubove poklopca'], ['Fixed face', 'dno'], ['Bend angle', '90.00deg']], o: 'Bočni preklopi poklopca savijaju se dok je poklopac još ravan.', crte: 'sb3' },
  { z: 'Sketched Bend4', n: 'Prednji preklop poklopca 90°', slika: '06_sb_preklopi', dijelovi: ['tk'], pm: [['Skica', '1 crta, preko proreza 50 × 4'], ['Fixed face', 'dno'], ['Bend angle', '90.00deg']], o: 'Prednji preklop ulazi iza prednje stijenke. Crta savijanja prolazi kroz prorez brave, pa je prorez na samom pregibu.', crte: 'sb4' },
  { z: 'Sketched Bend5', n: 'Poklopac 90°', slika: '07_sb_poklopac', dijelovi: ['pok'], pm: [['Skica', '1 crta između stražnje stijenke i poklopca'], ['Fixed face', 'dno'], ['Bend angle', '90.00deg']], o: 'Poklopac se savija prema stražnjoj stijenci, zajedno s već savijenim preklopima.', crte: 'sb5' },
  { z: 'Sketched Bend6', n: 'Bočne stijenke 90°', slika: '08_sb_bocne', dijelovi: ['w1L', 'w1D'], pm: [['Skica', '2 crte uz bočne rubove dna'], ['Fixed face', 'dno'], ['Bend angle', '90.00deg']], o: 'Bočne stijenke se podižu zajedno s porubima i ušima.', crte: 'sb6' },
  { z: 'Sketched Bend7', n: 'Prednja i stražnja stijenka 90°', slika: '09_sb_prednja_strazna', dijelovi: ['f1', 'b'], pm: [['Skica', '2 crte uz prednji i stražnji rub dna'], ['Fixed face', 'dno'], ['Bend angle', '90.00deg']], o: 'Posljednje savijanje zatvara kutiju: stražnja stijenka podiže poklopac, prednja stijenka nosi jezičac brave.', crte: 'sb7' },
  { z: 'Flat-Pattern', n: 'Razvijena ploha i izvoz DXF', slika: '10_flat_pattern', pm: [['Naredba', 'Sheet Metal → Flatten; desni klik Flat-Pattern → Export to DXF/DWG'], ['Export', 'Sheet metal, Geometry ☑'], ['Za rezanje', 'Bend lines ☐ (samo obris)'], ['Za oznaku pregiba', 'Bend lines ☑ (zasebna datoteka)']], o: 'Flatten vraća model u razvijeno stanje. DXF za laser sadrži samo vanjski obris i rupe, u mjerilu 1 : 1. Obrazovna inačica SolidWorksa u DXF dodaje tekst koji se prije rezanja briše.', crte: 'svi' }
];
const N = KORACI.length - 1;
const POCETAK = {}; // dio → korak u kojem se savija
KORACI.forEach((k, i) => (k.dijelovi || []).forEach(d => { POCETAK[d] = i; }));
const sglatko = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);

// crte savijanja po značajkama (koordinate razvijenog oblika, mm)
const m = K.mjere, yE = D + k3, yP = -51, yT = -315.1;
const CRTE = {
  sb1: [[[-50, 0], [-50, yE]], [[L + 50, 0], [L + 50, yE]], [[0, m.yF], [m.bx0, m.yF]], [[m.bx1, m.yF], [L, m.yF]]],
  sb2: [[[-50, yE], [0, yE]], [[L, yE], [L + 50, yE]], [[-50, 0], [0, 0]], [[L, 0], [L + 50, 0]]],
  sb3: [[[0, yT], [0, yP]], [[L, yT], [L, yP]]],
  sb4: [[[0, yT], [L, yT]]],
  sb5: [[[0, yP], [L, yP]]],
  sb6: [[[0, 0], [0, D]], [[L, 0], [L, D]]],
  sb7: [[[0, 0], [L, 0]], [[0, D], [L, D]]]
};
const RAST = [[0, 0, 2.5], [L, 0, 2.5], [0, D + k3 / 2, 2.7], [L, D + k3 / 2, 2.7], [-50, 0, 3.6], [L + 50, 0, 3.6], [-50, yE, 3.6], [L + 50, yE, 3.6], [0, yP, 2.5], [L, yP, 2.5], [0, yT, 2.5], [L, yT, 2.5]];

// ── 3D ─────────────────────────────────────────────────────────────────
const scena = $('#scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
scena.appendChild(renderer.domElement);
const svijet = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
const kontrole = new OrbitControls(kamera, renderer.domElement);
kontrole.enableDamping = true;
svijet.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.15));
const sunce = new THREE.DirectionalLight(0xffffff, 1.5); sunce.position.set(400, 900, 500); svijet.add(sunce);

const LIM = 0xA7AEBF, RUB = 0x3A4150, ISTAKNI = 0x2ECAD4;
const korijen = new THREE.Group(); korijen.rotation.x = -Math.PI / 2; svijet.add(korijen);
const pivoti = {}, meshevi = {}, sidro = {};
const matRub = new THREE.LineBasicMaterial({ color: RUB });
function oblik(poly, rupe, krug) {
  const sh = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of rupe) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  if (krug) { const p = new THREE.Path(); p.absarc(krug.cx, krug.cy, krug.r, 0, Math.PI * 2, true); sh.holes.push(p); }
  return sh;
}
for (const d of K.dijelovi) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(oblik(d.poly, d.rupe, d.krug), { depth: T, bevelEnabled: false, curveSegments: 48 });
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: LIM, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide, transparent: true }));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), matRub));
  const p0 = d.sarka ? [d.sarka[0][0], d.sarka[0][1], T] : [0, 0, 0];
  sidro[d.ime] = p0;
  mesh.position.set(-p0[0], -p0[1], -p0[2]);
  g.add(mesh);
  if (d.roditelj) {
    const rp = sidro[d.roditelj];
    g.position.set(p0[0] - rp[0], p0[1] - rp[1], p0[2] - rp[2]);
    pivoti[d.roditelj].add(g);
    const [a, b] = d.sarka; const u = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize();
    let cx = 0, cy = 0; d.poly.forEach(([x, y]) => { cx += x; cy += y; }); cx /= d.poly.length; cy /= d.poly.length;
    const v = new THREE.Vector3(cx - a[0], cy - a[1], 0);
    g.userData = { os: u, znak: (u.x * v.y - u.y * v.x) > 0 ? 1 : -1, cilj: d.ime.startsWith('us') ? 90 : d.kut };
  } else korijen.add(g);
  pivoti[d.ime] = g; meshevi[d.ime] = mesh;
}
// skica (samo crte) i crte savijanja / rasterećenja na razvijenom obliku
const skica = new THREE.Group(); korijen.add(skica);
const ravnoZ = T + 0.4;
function crta(a, b, boja, isp) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], a[1], ravnoZ), new THREE.Vector3(b[0], b[1], ravnoZ)]);
  const l = isp ? new THREE.Line(g, new THREE.LineDashedMaterial({ color: boja, dashSize: 6, gapSize: 4 })) : new THREE.Line(g, new THREE.LineBasicMaterial({ color: boja }));
  if (isp) l.computeLineDistances();
  return l;
}
const obrisSkice = new THREE.Group();
[...K.kontura, ...K.unutra].forEach(s => obrisSkice.add(crta(s.a, s.b, 0x1F6FB2)));
{ const p = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; p.push(new THREE.Vector3(K.prozor.cx + K.prozor.r * Math.cos(a), K.prozor.cy + K.prozor.r * Math.sin(a), ravnoZ)); } obrisSkice.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0x1F6FB2 }))); }
skica.add(obrisSkice);
const crteGrupe = {};
for (const [kljuc, lista] of Object.entries(CRTE)) { const g = new THREE.Group(); lista.forEach(([a, b]) => g.add(crta(a, b, 0xD8322A, true))); crteGrupe[kljuc] = g; skica.add(g); }
const rastGrupa = new THREE.Group();
RAST.forEach(([x, y, r]) => { const p = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2; p.push(new THREE.Vector3(x + r * Math.cos(a), y + r * Math.sin(a), ravnoZ)); } rastGrupa.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0xD8322A }))); });
skica.add(rastGrupa);
const jezGrupa = new THREE.Group();
K.unutra.filter(s => Math.min(s.a[0], s.b[0]) >= m.bx0 - 0.01 && Math.max(s.a[0], s.b[0]) <= m.bx1 + 0.01 && Math.min(s.a[1], s.b[1]) > 250).forEach(s => jezGrupa.add(crta(s.a, s.b, 0xD8322A)));
skica.add(jezGrupa);

let korakS = 0, svira = false, smjer = 1;
function kutZa(ime, s) {
  const i = POCETAK[ime]; if (i === undefined) return 0;
  const u = pivoti[ime].userData;
  let f = sglatko(s - (i - 1));
  if (s > N - 1) f *= 1 - sglatko(s - (N - 1)); // Flatten: sve se razvija
  return f * u.cilj;
}
function postaviKorak(s) {
  korakS = s;
  for (const [ime, g] of Object.entries(pivoti)) {
    const u = g.userData; if (!u || !u.os) continue;
    g.quaternion.setFromAxisAngle(u.os, u.znak * kutZa(ime, s) * Math.PI / 180);
  }
  const i = Math.min(N, Math.max(0, Math.ceil(s - 1e-6)));
  const kk = KORACI[i];
  // korak 0: samo skica (crte); od Base-Flange1 puno tijelo
  const tijelo = s >= 0.5;
  for (const [ime, mesh] of Object.entries(meshevi)) {
    mesh.visible = tijelo;
    const ist = (kk.dijelovi || kk.obiljezi || []).includes(ime);
    mesh.material.emissive = new THREE.Color(ist ? ISTAKNI : 0x000000);
    mesh.material.emissiveIntensity = ist ? 0.35 : 0;
  }
  obrisSkice.visible = !tijelo;
  const kraj = s > N - 0.05;
  // crte savijanja trenutne značajke leže na plohi koja je još ravna (redoslijed iznutra prema van)
  for (const [kljuc, g] of Object.entries(crteGrupe)) g.visible = kk.crte === kljuc || kraj;
  rastGrupa.visible = i === 4 || kraj;
  jezGrupa.visible = i === 3;
  $('#korak-br').textContent = `${i} / ${N}`;
  $('#korak-z').textContent = kk.z;
  $('#korak-naslov').textContent = kk.n;
  $('#korak-opis').textContent = kk.o;
  $('#klizac').value = s;
  const sl = $('#sw-slika');
  const src = `sw/${kk.slika}.jpg`;
  if (!sl.getAttribute('src') || !sl.getAttribute('src').endsWith(src)) { sl.src = src; sl.alt = `SolidWorks 2017: ${kk.z} — ${kk.n}`; }
  $('#sw-pm').innerHTML = kk.pm.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('');
  const pmLink = $('#sw-pm-slika');
  if (kk.pmSlika) { pmLink.hidden = false; pmLink.href = `sw/${kk.pmSlika}.jpg`; } else pmLink.hidden = true;
  document.querySelectorAll('#stablo-sw li').forEach((li, j) => { li.classList.toggle('aktivan', j === i); li.querySelector('button').setAttribute('aria-pressed', String(j === i)); });
}
function okvir() {
  const r = Math.max(K.granice.w, K.granice.h);
  kontrole.target.set(L / 2, P.H / 2, -D / 2 + 60);
  kamera.position.set(L / 2 + r * 0.7, r * 0.9, -D + r * 0.95);
  kamera.near = 1; kamera.far = r * 20; kamera.updateProjectionMatrix();
}
function velicina() { const w = scena.clientWidth, h = scena.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scena);
let zadnje = 0;
function petlja(t) {
  requestAnimationFrame(petlja);
  const dt = Math.min(0.05, (t - zadnje) / 1000); zadnje = t;
  if (svira) {
    let s = korakS + dt * 0.4 * Number($('#brzina').value || 1);
    if (s >= N) { s = N; svira = false; $('#sviraj').setAttribute('aria-pressed', 'false'); $('#sviraj').textContent = 'Pokreni'; }
    postaviKorak(s);
  }
  kontrole.update(); renderer.render(svijet, kamera);
}
requestAnimationFrame(petlja);

// ── upravljanje ────────────────────────────────────────────────────────
$('#klizac').max = N;
$('#stablo-sw').innerHTML = KORACI.map((k, i) => `<li><button type="button" data-k="${i}" aria-pressed="false"><b>${k.z}</b><span>${k.n}</span></button></li>`).join('');
$('#stablo-sw').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { svira = false; postaviKorak(Number(b.dataset.k)); } });
$('#klizac').addEventListener('input', e => { svira = false; postaviKorak(Number(e.target.value)); });
$('#sviraj').addEventListener('click', e => {
  svira = !svira; if (svira && korakS >= N) postaviKorak(0);
  e.target.textContent = svira ? 'Pauza' : 'Pokreni'; e.target.setAttribute('aria-pressed', String(svira));
});
$('#natrag').addEventListener('click', () => { svira = false; postaviKorak(Math.max(0, Math.ceil(korakS - 1e-6) - 1)); });
$('#naprijed').addEventListener('click', () => { svira = false; postaviKorak(Math.min(N, Math.floor(korakS + 1e-6) + 1)); });
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => {
  const r = Math.max(K.granice.w, K.granice.h), cx = L / 2, cz = -D / 2;
  const v = b.dataset.pogled;
  if (v === 'gore') kamera.position.set(cx, r * 1.7, cz + 60.01);
  else if (v === 'sprijeda') kamera.position.set(cx, P.H * 2.2, cz - r * 1.4);
  else { okvir(); return; }
  kontrole.target.set(cx, P.H / 2, cz + 60);
}));
okvir(); postaviKorak(0);
$('#ucitavanje')?.remove();
window.ftqSwKutija = { KORACI, postaviKorak };
