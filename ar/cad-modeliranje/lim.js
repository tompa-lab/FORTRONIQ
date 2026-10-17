// FORTRONIQ · CAD modeliranje · modul Sheet Metal · kartonska kutija za sat
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { izracun, dxf, putanjaReza, slojevi, ZADANO } from './kutija.js?v=02';

const $ = s => document.querySelector(s);
const fmt = (v, d = 1) => Number(v).toLocaleString('hr-HR', { minimumFractionDigits: d, maximumFractionDigits: d });
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

// ── stanje ─────────────────────────────────────────────────────────────
let P = Object.assign({}, ZADANO);
let K = izracun(P);
const PRIMJERI = {
  sat265: { naziv: 'Kutija za sat 265 × 265 × 50', p: { L: 264.6, D: 264.1, H: 50, T: 3, prozor: 200, drzaci: 1, usi: 101, sat: 250, preklopi: true } },
  pizza32: { naziv: 'Pizza 32 cm, bez prozora', p: { L: 340, D: 340, H: 42, T: 3, prozor: 0, drzaci: 0, usi: 101, sat: 0, preklopi: true } },
  sat300: { naziv: 'Kutija za sat Ø 300', p: { L: 318, D: 318, H: 50, T: 3, prozor: 240, drzaci: 1, usi: 101, sat: 300, preklopi: true } }
};

// ── koraci sastavljanja (prema videu „Bending" i „Assembly" i fotografijama kutije) ──
const KORACI = [
  { t: 'Izrezana mreža na stolu', o: 'Laser je izrezao utore, držač, prozor, perforacije i obris. Otpad iz prozora se izvadi, a držač istisne iz kruga.' },
  { t: 'Biganje', o: 'Svaki pregib se prelomi rukom i vrati. Perforacija (rez 15 mm, most 15 mm, na krajevima 20 mm) vodi pregib točno po crti.' },
  { t: 'Bočne stijenke gore', o: 'Vanjske bočne stijenke se podignu za 90°. Uši na njihovim krajevima ostaju ravne.' },
  { t: 'Prednje uši prema unutra', o: 'Prednje uši savijaju se za 90° prema unutra, uz mjesto gdje će stajati prednja stijenka.' },
  { t: 'Prednja i stražnja stijenka gore', o: 'Prednja stijenka podiže se preko prednjih ušiju, a stražnja zajedno s poklopcem.' },
  { t: 'Unutarnji prednji sloj, jezičci u utore', o: 'Unutarnji sloj prednje stijenke savija se za 180° preko prednjih ušiju i jezičci ulaze u utore uz prednji rub dna. Jezičac brave ostaje uspravan.' },
  { t: 'Unutarnji bočni slojevi, jezičci u utore', o: 'Unutarnji bočni slojevi savijaju se za 180° (porub). Jezičci ulaze u utore uz rub dna i zaključavaju kutiju bez ljepila.' },
  { t: 'Sat na dno', o: 'Sat se položi na dno kutije.' },
  { t: 'Stražnje uši preko ruba sata', o: 'Stražnje uši savijaju se koso u kutove. Puni dio uha stoji na dnu uz kut, a suženi dio prelazi preko ruba sata i drži ga da se ne pomiče (kutni jezičci).' },
  { t: 'Držač preko kazaljki', o: 'Kazaljke se poravnaju s prorezom i držač se položi preko njih, da se u prijevozu ne savinu. Položaj držača u 3D-u je procjena.' },
  { t: 'Preklopi poklopca', o: 'Bočni preklopi i prednji preklop poklopca savijaju se za 90°.' },
  { t: 'Zatvaranje, brava u prorez', o: 'Poklopac se spusti, prednji preklop uđe iza prednje stijenke, a jezičac brave u prorez na pregibu poklopca. Kutija je gotova.' }
];
const N = KORACI.length - 1;
const sglatko = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);
function kutDijela(ime, cilj, s) {
  const pocetak = { w1: 2, up: 3, f1: 4, b: 4, f2: 5, w2: 6, us: 8, pp: 10, tk: 10, pok: 11 };
  const i = pocetak[ime.replace(/[LD]$/, '')];
  if (!i) return 0;
  const f = sglatko(s - (i - 1));                       // korak i traje od s = i − 1 do s = i
  const big = s > 0 && s < 1 ? 30 * Math.sin(Math.PI * s) : 0; // biganje: prelomi i vrati
  return Math.max(f * cilj, big);
}

// ── 3D ─────────────────────────────────────────────────────────────────
const scena = $('#scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
scena.appendChild(renderer.domElement);
const svijet = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
const kontrole = new OrbitControls(kamera, renderer.domElement);
kontrole.enableDamping = true;
svijet.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1));
const sunce = new THREE.DirectionalLight(0xffffff, 1.6); sunce.position.set(400, 900, 500); svijet.add(sunce);
const stol = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x9aa7ad, roughness: 1, transparent: true, opacity: 0.18 }));
stol.rotation.x = -Math.PI / 2; stol.position.y = -0.5; svijet.add(stol);

const KRAFT = 0xC8A26E, KRAFT_RUB = 0x7A5A33;
let korijen = null, pivoti = {}, meshevi = {}, satGrupa = null, drzGrupa = null;
let korakS = 0;

function oblik(poly, rupe, krug) {
  const sh = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of rupe) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  if (krug) { const p = new THREE.Path(); p.absarc(krug.cx, krug.cy, krug.r, 0, Math.PI * 2, true); sh.holes.push(p); }
  return sh;
}
function gradi3D() {
  if (korijen) { svijet.remove(korijen); korijen.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  pivoti = {}; meshevi = {};
  const T = P.T;
  korijen = new THREE.Group(); korijen.rotation.x = -Math.PI / 2; // ravnina mreže x-y → stol
  const mat = new THREE.MeshStandardMaterial({ color: KRAFT, roughness: 0.9, side: THREE.DoubleSide });
  const matRub = new THREE.LineBasicMaterial({ color: KRAFT_RUB });
  const poImenu = Object.fromEntries(K.dijelovi.map(d => [d.ime, d]));
  const sidro = {};
  for (const d of K.dijelovi) {
    const g = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(oblik(d.poly, d.rupe, d.krug), { depth: T, bevelEnabled: false, curveSegments: 48 });
    const m = new THREE.Mesh(geo, mat.clone()); m.userData.dio = d.ime;
    const rub = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), matRub); m.add(rub);
    let p0 = [0, 0, 0];
    if (d.sarka) p0 = [d.sarka[0][0], d.sarka[0][1], T];
    sidro[d.ime] = p0;
    m.position.set(-p0[0], -p0[1], -p0[2]);
    g.add(m);
    if (d.roditelj) {
      const rp = sidro[d.roditelj];
      g.position.set(p0[0] - rp[0], p0[1] - rp[1], p0[2] - rp[2]);
      pivoti[d.roditelj].add(g);
      // os i smjer savijanja „prema gore"
      const [a, b] = d.sarka; const u = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize();
      let cx = 0, cy = 0; d.poly.forEach(([x, y]) => { cx += x; cy += y; }); cx /= d.poly.length; cy /= d.poly.length;
      const v = new THREE.Vector3(cx - a[0], cy - a[1], 0);
      const zz = u.x * v.y - u.y * v.x;
      g.userData = { os: u, znak: zz > 0 ? 1 : -1, cilj: d.kut };
    } else korijen.add(g);
    pivoti[d.ime] = g; meshevi[d.ime] = m;
  }
  svijet.add(korijen);
  // sat i držači (u koordinatama dna)
  satGrupa = new THREE.Group(); drzGrupa = new THREE.Group();
  pivoti.dno.add(satGrupa); pivoti.dno.add(drzGrupa);
  if (P.sat > 0) gradiSat(satGrupa);
  gradiDrzace(drzGrupa);
  postaviKorak(korakS);
  okvirKamere();
}
function gradiSat(g) {
  const T = P.T, R = Math.min(P.sat / 2, Math.min(K.unutarnje.L, K.unutarnje.D) / 2 - 2), h = P.satDeb;
  const drvo = new THREE.MeshStandardMaterial({ color: 0xE6CFA3, roughness: 0.7 });
  const tamno = new THREE.MeshStandardMaterial({ color: 0x8A5A2B, roughness: 0.8 });
  const crno = new THREE.MeshStandardMaterial({ color: 0x1E2326, roughness: 0.5 });
  const zM = 13; // mehanizam: ploča sata mora ostati ispod suženog dijela stražnjih ušiju
  const meh = new THREE.Mesh(new THREE.BoxGeometry(56, 56, zM), crno); meh.position.set(0, 0, zM / 2); g.add(meh);
  const ploca = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 96), drvo); ploca.rotation.x = Math.PI / 2; ploca.position.z = zM + h / 2; g.add(ploca);
  const prsten = new THREE.Mesh(new THREE.RingGeometry(R - 9, R - 7, 96), tamno); prsten.position.z = zM + h + 0.2; g.add(prsten);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, d = i % 3 === 0 ? 16 : 9;
    const c = new THREE.Mesh(new THREE.BoxGeometry(i % 3 === 0 ? 4 : 2.5, d, 0.6), tamno);
    c.position.set(Math.sin(a) * (R - 26), Math.cos(a) * (R - 26), zM + h + 0.3); c.rotation.z = -a; g.add(c);
  }
  const ruka = (dl, s, a, z, m) => { const r = new THREE.Mesh(new THREE.BoxGeometry(s, dl, 1), m); r.geometry.translate(0, dl / 2 - 8, 0); r.position.z = z; r.rotation.z = -a; g.add(r); };
  ruka(R * 0.55, 5, 1.5 * Math.PI, zM + h + 1, crno); ruka(R * 0.8, 3.5, 0.5 * Math.PI, zM + h + 1.6, crno);
  const sek = new THREE.MeshStandardMaterial({ color: 0xD8322A }); ruka(R * 0.85, 1.2, 1.5 * Math.PI, zM + h + 2.2, sek);
  g.userData.vrh = zM + h + 2.6;
  g.position.set(P.L / 2, P.D / 2, P.T);
  g.userData.cilj = g.position.z;
}
function gradiDrzace(g) {
  if (!P.drzaci || !K.drzaci.length) return;
  const T = P.T, m = K.mjere;
  const mat = new THREE.MeshStandardMaterial({ color: KRAFT, roughness: 0.9 });
  const vrh = (satGrupa && satGrupa.userData.vrh) || 20;
  // držač leži preko kazaljki (poravnatih na 9:15), prorez uzduž kazaljki — procjena
  K.drzaci.forEach((d, i) => {
    const sh = new THREE.Shape(d.poly.map(([x, y]) => new THREE.Vector2(x - d.cx, y - d.cy)));
    sh.holes.push(new THREE.Path(d.prorez.map(([x, y]) => new THREE.Vector2(x - d.cx, y - d.cy))));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 16 });
    const b = new THREE.Mesh(geo, mat);
    b.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: KRAFT_RUB })));
    b.position.set(P.L / 2, P.D / 2 + (i - (K.drzaci.length - 1) / 2) * (m.hw + 6), T + vrh);
    g.add(b);
  });
}
function postaviKorak(s) {
  korakS = s;
  for (const [ime, g] of Object.entries(pivoti)) {
    const u = g.userData; if (!u || !u.os) continue;
    const k = kutDijela(ime, u.cilj, s);
    g.quaternion.setFromAxisAngle(u.os, u.znak * k * Math.PI / 180);
  }
  // sat pada odozgo u koraku 7, držači nakon njega
  if (satGrupa) {
    const f = sglatko(s - 6);
    satGrupa.visible = f > 0;
    satGrupa.position.z = P.T + (1 - f) * (P.H * 4);
  }
  if (drzGrupa) { const f = sglatko(s - 8); drzGrupa.visible = f > 0; drzGrupa.position.z = (1 - f) * P.H * 3; }
  const i = Math.min(N, Math.round(s));
  $('#korak-br').textContent = `${i} / ${N}`;
  $('#korak-naslov').textContent = KORACI[i].t;
  $('#korak-opis').textContent = KORACI[i].o;
  $('#klizac').value = s;
  document.querySelectorAll('#koraci-popis li').forEach((li, j) => li.classList.toggle('aktivan', j === i));
}
function okvirKamere() {
  const r = Math.max(K.granice.w, K.granice.h);
  kontrole.target.set(P.L / 2, P.H / 2, -P.D / 2);
  kamera.position.set(P.L / 2 + r * 0.6, r * 0.85, -P.D - r * 0.75);
  kamera.near = 1; kamera.far = r * 20; kamera.updateProjectionMatrix();
}
function velicina() {
  const w = scena.clientWidth, h = scena.clientHeight;
  renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix();
}
new ResizeObserver(velicina).observe(scena);
let svira = false, zadnje = 0;
function petlja(t) {
  requestAnimationFrame(petlja);
  const dt = Math.min(0.05, (t - zadnje) / 1000); zadnje = t;
  if (svira) {
    let s = korakS + dt * 0.45 * Number($('#brzina').value || 1);
    if (s >= N) { s = N; svira = false; $('#sviraj').setAttribute('aria-pressed', 'false'); $('#sviraj').textContent = 'Sastavi'; }
    postaviKorak(s);
  }
  kontrole.update();
  renderer.render(svijet, kamera);
}
requestAnimationFrame(petlja);

// istakni značajku
function istakni(imena) {
  for (const [ime, m] of Object.entries(meshevi)) {
    const da = imena && imena.includes(ime);
    m.material.emissive = new THREE.Color(da ? 0x2ECAD4 : 0x000000);
    m.material.emissiveIntensity = da ? 0.45 : 0;
  }
}

// ── 2D razvijeni oblik + laser ────────────────────────────────────────
const platno = $('#mreza'), ctx = platno.getContext('2d');
const BOJE = { UNUTARNJI: '#3B82C4', DRZACI: '#B04AC4', PROZOR: '#16A6B0', PERFORACIJA: '#2E9E57', KONTURA: null };
let put = null, laserD = 0, laserUkupno = 0, laserSvira = false;
const BRZ_REZ = 50, BRZ_PRAZNO = 200; // mm/s: rez kartona (Tomislavov program 65 % / 50 mm/s), prazni hod (Quick speed 200)
function pripremiLaser() {
  put = putanjaReza(K);
  let t = 0; laserUkupno = 0;
  for (const k of put.koraci) {
    k.lp = Math.hypot(k.prazni[1][0] - k.prazni[0][0], k.prazni[1][1] - k.prazni[0][1]);
    k.lr = k.rez.reduce((s, q) => s + Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]), 0);
    k.t0 = t; t += k.lp / BRZ_PRAZNO + k.lr / BRZ_REZ; k.t1 = t;
  }
  laserUkupno = t;
  $('#laser-klizac').max = laserUkupno; laserD = Math.min(laserD, laserUkupno);
}
function crtajMrezu() {
  if (!put) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = platno.clientWidth, h = platno.clientHeight;
  platno.width = w * dpr; platno.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const g = K.granice, m = 14;
  const s = Math.min((w - 2 * m) / g.w, (h - 2 * m) / g.h);
  const X = x => m + (x - g.minx) * s + ((w - 2 * m) - g.w * s) / 2, Y = y => h - m - (y - g.miny) * s - ((h - 2 * m) - g.h * s) / 2;
  // podloga: karton
  ctx.fillStyle = 'rgba(200,162,110,.22)';
  for (const d of K.dijelovi) { ctx.beginPath(); d.poly.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath(); ctx.fill(); }
  const ink = css('--ink');
  const sl = put.sl;
  const t = laserD;
  // nacrt (blijedo)
  const crtSeg = (q, boja, alfa, deb) => { ctx.strokeStyle = boja; ctx.globalAlpha = alfa; ctx.lineWidth = deb; ctx.beginPath(); ctx.moveTo(X(q.a[0]), Y(q.a[1])); ctx.lineTo(X(q.b[0]), Y(q.b[1])); ctx.stroke(); };
  for (const [i, l] of sl.entries()) {
    const b = BOJE[l.ime] || ink;
    for (const q of l.seg) crtSeg(q, b, 0.32, 1);
    for (const c of (l.krugovi || [])) { ctx.strokeStyle = b; ctx.globalAlpha = 0.32; ctx.beginPath(); ctx.arc(X(c.krug.cx), Y(c.krug.cy), c.krug.r * s, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  // izrezano do vremena t
  let glava = null, rezeSe = false, slojSad = -1;
  for (const k of put.koraci) {
    if (t <= k.t0) break;
    const b = BOJE[sl[k.sloj].ime] || ink;
    const tp = k.lp / BRZ_PRAZNO;
    if (t < k.t0 + tp) { const f = (t - k.t0) / tp; glava = [k.prazni[0][0] + (k.prazni[1][0] - k.prazni[0][0]) * f, k.prazni[0][1] + (k.prazni[1][1] - k.prazni[0][1]) * f]; slojSad = k.sloj; break; }
    let ostatak = (Math.min(t, k.t1) - k.t0 - tp) * BRZ_REZ;
    for (const q of k.rez) {
      const lq = Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]);
      if (ostatak >= lq) { crtSeg(q, b, 1, 2); ostatak -= lq; glava = q.b; }
      else { const f = ostatak / lq; const pt = [q.a[0] + (q.b[0] - q.a[0]) * f, q.a[1] + (q.b[1] - q.a[1]) * f]; crtSeg({ a: q.a, b: pt }, b, 1, 2); glava = pt; rezeSe = true; slojSad = k.sloj; break; }
    }
    if (t < k.t1) { rezeSe = true; slojSad = k.sloj; break; }
  }
  ctx.globalAlpha = 1;
  if (glava && t < laserUkupno) {
    ctx.fillStyle = rezeSe ? '#E0533D' : css('--body');
    ctx.beginPath(); ctx.arc(X(glava[0]), Y(glava[1]), rezeSe ? 5 : 4, 0, Math.PI * 2); ctx.fill();
    if (rezeSe) { ctx.strokeStyle = 'rgba(224,83,61,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(X(glava[0]), Y(glava[1]), 9, 0, Math.PI * 2); ctx.stroke(); }
  }
  // LCD PAD03
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const hh = Math.floor(mm / 60);
  $('#lcd-file').textContent = `KUT${Math.round(P.L)}`.slice(0, 8);
  $('#lcd-power').textContent = slojSad >= 0 || t > 0 ? '65/65%' : '0/0%';
  $('#lcd-time').textContent = `${String(hh).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  $('#lcd-sloj').textContent = slojSad >= 0 ? sl[slojSad].ime : (t >= laserUkupno && t > 0 ? 'GOTOVO' : '—');
  $('#laser-klizac').value = t;
  $('#laser-info').textContent = `${fmt(t / 60, 1)} / ${fmt(laserUkupno / 60, 1)} min`;
}
let zadL = 0;
function petljaL(ts) {
  requestAnimationFrame(petljaL);
  const dt = Math.min(0.05, (ts - zadL) / 1000); zadL = ts;
  if (laserSvira) {
    laserD += dt * Number($('#laser-brzina').value);
    if (laserD >= laserUkupno) { laserD = laserUkupno; laserSvira = false; $('#laser-start').textContent = 'Start'; $('#laser-start').setAttribute('aria-pressed', 'false'); }
    crtajMrezu();
  }
}
requestAnimationFrame(petljaL);
new ResizeObserver(() => crtajMrezu()).observe(platno);
new MutationObserver(() => crtajMrezu()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── proračun i tablice ────────────────────────────────────────────────
function proracun() {
  const k = K, T = P.T, sw = k.sw;
  const plocaW = k.granice.w + 10, plocaH = k.granice.h + 10;
  const stane = (a, b) => (plocaW <= a && plocaH <= b) || (plocaW <= b && plocaH <= a);
  const V = k.unutarnje.L * k.unutarnje.D * k.unutarnje.H / 1e6;
  const lRez = k.duljine.unutra + k.duljine.drzaci + k.duljine.prozor + k.duljine.kontura;
  const red = (a, b, c = '') => `<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td></tr>`;
  $('#proracun').innerHTML =
    red('Debljina kartona T', `${fmt(T, 1)} mm`, 'valoviti karton') +
    red('K-faktor · polumjer R', `${fmt(P.K, 2)} · ${fmt(P.R, 1)} mm`, 'kao u Sheet-Metal1') +
    red('Dodatak savijanja BA (90°)', `${fmt(sw.BA90, 2)} mm`, 'BA = π/2 · (R + K · T)') +
    red('Odbitak savijanja BD (90°)', `${fmt(sw.BD90, 2)} mm`, 'BD = 2 · (R + T) − BA') +
    red('Dno po pregibima', `${fmt(P.L, 1)} × ${fmt(P.D, 1)} mm`, 'mjere u DXF-u') +
    red('Korisni prostor (unutra)', `${fmt(k.unutarnje.L, 0)} × ${fmt(k.unutarnje.D, 0)} × ${fmt(k.unutarnje.H, 0)} mm`, 'L − 4T · D − 3T · H − T') +
    red('Volumen unutra', `${fmt(V, 2)} L`, '') +
    red('Vanjske mjere (približno)', `${fmt(k.vanjske.L, 0)} × ${fmt(k.vanjske.D, 0)} × ${fmt(k.vanjske.H, 0)} mm`, 'L + 2T · D + 2T · H + T') +
    red('SolidWorks: dno iz vanjske mjere', `${fmt(sw.dnoSW, 1)} mm`, `razlika ${fmt(sw.dnoSW - P.L, 1)} mm`) +
    red('Razvijeni oblik', `${fmt(k.granice.w, 0)} × ${fmt(k.granice.h, 0)} mm`, `ploča ${fmt(plocaW, 0)} × ${fmt(plocaH, 0)} mm`) +
    red('Karton', `${fmt(plocaW * plocaH / 1e6, 2)} m²`, '') +
    red('Rez (bez perforacije)', `${fmt(lRez / 1000, 2)} m`, `kontura ${fmt(k.duljine.kontura / 1000, 2)} m`) +
    red('Perforacija', `${fmt(k.duljine.perforacija / 1000, 2)} m`, `pregibi ${fmt(k.duljine.pregibi / 1000, 2)} m`) +
    red('Vrijeme na stroju', `≈ ${fmt(laserUkupno / 60, 1)} min`, 'rez 50 mm/s, prazni hod 200 mm/s') +
    red('G.Weike LG500DM (500 × 300)', stane(500, 300) ? 'stane' : 'ne stane', '') +
    red('G.Weike LC1390N (1300 × 900)', stane(1300, 900) ? 'stane' : 'ne stane', stane(1300, 900) ? `${Math.max(1, Math.floor(1300 / plocaW) * Math.floor(900 / plocaH), Math.floor(900 / plocaW) * Math.floor(1300 / plocaH))} kom. po ploči` : '');
  $('#slojevi').innerHTML = slojevi(K).map((s, i) => `<li><span class="kvadrat" style="background:${BOJE[s.ime] || 'var(--ink)'}"></span><b>${i + 1}. ${s.ime}</b> · DXF boja ${s.boja} · ${s.opis}</li>`).join('');
}

// ── unos ─────────────────────────────────────────────────────────────
function citajUnos() {
  const v = id => Number($(id).value);
  const nacin = $('#nacin').value;
  P.T = v('#u-T'); P.K = v('#u-K'); P.R = v('#u-R');
  P.perfRez = v('#u-pr'); P.perfMost = v('#u-pm');
  P.prozor = v('#u-prozor'); P.drzaci = v('#u-drz'); P.preklopi = $('#u-prekl').checked; P.usi = v('#u-usi');
  const T = P.T;
  if (nacin === 'pregibi') { P.L = v('#u-L'); P.D = v('#u-D'); P.H = v('#u-H'); }
  else if (nacin === 'unutra') { P.L = v('#u-Lu') + 4 * T; P.D = v('#u-Du') + 3 * T; P.H = v('#u-Hu') + T; }
  else if (nacin === 'volumen') { const Hu = v('#u-Hv'), a = Math.sqrt(v('#u-V') * 1e6 / Hu); P.L = a + 4 * T; P.D = a + 3 * T; P.H = Hu + T; }
  else if (nacin === 'sat') { const d = v('#u-sat'), Hu = v('#u-Hs'); P.sat = d; P.L = d + 6 + 4 * T; P.D = d + 6 + 3 * T; P.H = Hu + T; if ($('#u-prozor-auto').checked) { P.prozor = Math.round(0.8 * d / 5) * 5; $('#u-prozor').value = P.prozor; } }
  if (nacin !== 'sat' && P.sat > 0) P.sat = Math.min(P.L, P.D) - 4 * T - 6;
  P.L = Math.round(P.L * 10) / 10; P.D = Math.round(P.D * 10) / 10; P.H = Math.round(P.H * 10) / 10;
}
function pokaziNacin() {
  const n = $('#nacin').value;
  document.querySelectorAll('[data-nacin]').forEach(e => { e.style.display = e.dataset.nacin === n ? 'contents' : 'none'; });
}
function upisiUnos() {
  const T = P.T;
  const s = (id, v) => { const e = $(id); if (e) e.value = Math.round(v * 10) / 10; };
  s('#u-L', P.L); s('#u-D', P.D); s('#u-H', P.H);
  s('#u-Lu', P.L - 4 * T); s('#u-Du', P.D - 3 * T); s('#u-Hu', P.H - T);
  s('#u-T', T); s('#u-K', P.K); s('#u-R', P.R); s('#u-pr', P.perfRez); s('#u-pm', P.perfMost);
  s('#u-prozor', P.prozor); s('#u-drz', P.drzaci); s('#u-usi', P.usi); $('#u-prekl').checked = !!P.preklopi;
  if (P.sat > 0) s('#u-sat', P.sat);
  s('#u-Hs', P.H - T); s('#u-Hv', P.H - T);
  s('#u-V', (P.L - 4 * T) * (P.D - 3 * T) * (P.H - T) / 1e6);
}
let odgoda = null;
function osvjezi(odmah) {
  clearTimeout(odgoda);
  odgoda = setTimeout(() => {
    citajUnos(); K = izracun(P);
    pripremiLaser(); proracun(); crtajMrezu(); gradi3D();
    upisiUnos();
  }, odmah ? 0 : 250);
}
document.querySelectorAll('#unos input, #unos select').forEach(e => e.addEventListener('input', () => { if (e.id === 'nacin') pokaziNacin(); osvjezi(); }));
document.querySelectorAll('[data-primjer]').forEach(b => b.addEventListener('click', () => {
  const pr = PRIMJERI[b.dataset.primjer]; Object.assign(P, ZADANO, pr.p);
  $('#nacin').value = 'pregibi'; pokaziNacin(); upisiUnos(); laserD = 0; osvjezi(true);
}));

// ── gumbi ─────────────────────────────────────────────────────────────
$('#klizac').max = N;
$('#klizac').addEventListener('input', e => { svira = false; postaviKorak(Number(e.target.value)); });
$('#sviraj').addEventListener('click', e => {
  svira = !svira; if (svira && korakS >= N) postaviKorak(0);
  e.target.setAttribute('aria-pressed', String(svira)); e.target.textContent = svira ? 'Zaustavi' : 'Sastavi';
});
$('#natrag').addEventListener('click', () => { svira = false; postaviKorak(Math.max(0, Math.ceil(korakS - 1e-6) - 1)); });
$('#naprijed').addEventListener('click', () => { svira = false; postaviKorak(Math.min(N, Math.floor(korakS + 1e-6) + 1)); });
$('#razvij').addEventListener('click', () => { svira = false; postaviKorak(0); });
$('#savij').addEventListener('click', () => { svira = false; postaviKorak(N); });
$('#koraci-popis').innerHTML = KORACI.map((k, i) => `<li><button type="button" data-k="${i}"><b>${i}.</b> ${k.t}</button></li>`).join('');
$('#koraci-popis').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { svira = false; postaviKorak(Number(b.dataset.k)); } });
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => {
  const r = Math.max(K.granice.w, K.granice.h), cx = P.L / 2, cz = -P.D / 2;
  const v = b.dataset.pogled;
  if (v === 'gore') kamera.position.set(cx, r * 1.7, cz + 0.01);
  else if (v === 'sprijeda') kamera.position.set(cx, P.H * 2.2, cz - r * 1.4);
  else kamera.position.set(cx + r * 0.6, r * 0.85, -P.D - r * 0.75);
  kontrole.target.set(cx, P.H / 2, cz);
}));
// stablo značajki
const ZNACAJKE = {
  sheet: null, base: ['dno'], edge1: ['w1L', 'w1D'], hem1: ['w2L', 'w2D'], tab: ['w2L', 'w2D', 'f2', 'dno'], usi: ['upL', 'upD', 'usL', 'usD'],
  edge2: ['f1', 'b'], hem2: ['f2'], edge3: ['pok'], edge4: ['ppL', 'ppD', 'tk'], cut1: ['pok'], cut2: ['f1', 'f2', 'pok', 'tk'], flat: null
};
document.querySelectorAll('#stablo button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#stablo button').forEach(x => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true');
  const z = b.dataset.z;
  if (z === 'flat') { postaviKorak(0); istakni(null); }
  else if (z === 'sheet') { istakni(Object.keys(meshevi)); }
  else { istakni(ZNACAJKE[z]); if (korakS < 6) postaviKorak(6); }
  $('#stablo-opis').textContent = b.dataset.o;
}));
// laser
$('#laser-start').addEventListener('click', e => {
  laserSvira = !laserSvira; if (laserSvira && laserD >= laserUkupno) laserD = 0;
  e.target.textContent = laserSvira ? 'Pause' : 'Start'; e.target.setAttribute('aria-pressed', String(laserSvira));
});
$('#laser-stop').addEventListener('click', () => { laserSvira = false; laserD = 0; $('#laser-start').textContent = 'Start'; crtajMrezu(); });
$('#laser-klizac').addEventListener('input', e => { laserSvira = false; laserD = Number(e.target.value); $('#laser-start').textContent = 'Start'; crtajMrezu(); });
$('#dxf').addEventListener('click', () => {
  const ime = `kutija_${Math.round(P.L)}x${Math.round(P.D)}x${Math.round(P.H)}_karton${P.T}mm.dxf`;
  const b = new Blob([dxf(K)], { type: 'application/dxf' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = ime; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  $('#dxf-info').textContent = `Preuzeto: ${ime}. U LaserCutu 5.3: File → Import, slojevi po boji, redoslijed Up/Down kao u popisu.`;
});

// start
pokaziNacin(); upisiUnos(); osvjezi(true);
$('#ucitavanje')?.remove();
