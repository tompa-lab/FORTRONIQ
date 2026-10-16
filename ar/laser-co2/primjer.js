// FORTRONIQ · CO₂ laser · primjeri: rezanje iz DXF-a i sastavljanje u 3D-u
// Podaci dolaze iz window.PRIMJER (zasebna datoteka po modelu).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PR = window.PRIMJER;
const $ = s => document.querySelector(s);
const fmt = (v, d = 1) => Number(v).toLocaleString('hr-HR', { minimumFractionDigits: d, maximumFractionDigits: d });
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
const N = PR.koraci.length - 1;
const sglatko = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);

// ── 3D ─────────────────────────────────────────────────────────────────
const scena = $('#scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
scena.appendChild(renderer.domElement);
const svijet = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(35, 1, 1, 50000);
const kontrole = new OrbitControls(kamera, renderer.domElement);
kontrole.enableDamping = true;
svijet.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.15));
const sunce = new THREE.DirectionalLight(0xffffff, 1.5); sunce.position.set(500, 1200, 700); svijet.add(sunce);
const sunce2 = new THREE.DirectionalLight(0xffffff, 0.5); sunce2.position.set(-600, 400, -500); svijet.add(sunce2);

const dijelovi = [];
const mat0 = new THREE.Matrix4(), mat1 = new THREE.Matrix4();
for (const d of PR.dijelovi) {
  const m = PR.materijali[d.mat];
  const sh = new THREE.Shape(d.obris.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of d.rupe) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: m.T, bevelEnabled: false, curveSegments: 24 });
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: m.boja3d, roughness: 0.75, side: THREE.DoubleSide }));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: m.rub3d || 0x6b4a26 })));
  mesh.matrixAutoUpdate = false;
  svijet.add(mesh);
  mat0.fromArray(d.M0); mat1.fromArray(d.M1);
  const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), s0 = new THREE.Vector3();
  const p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), s1 = new THREE.Vector3();
  mat0.decompose(p0, q0, s0); mat1.decompose(p1, q1, s1);
  dijelovi.push({ d, mesh, p0, q0, p1, q1, korak: d.korak });
}
for (const x of (PR.dodatno || [])) {
  const geo = x.tip === 'stozac' ? new THREE.ConeGeometry(x.r, x.h, x.seg || 8, 1) : new THREE.CylinderGeometry(x.r, x.r, x.h, x.seg || 16);
  if (x.tip === 'stozac') geo.rotateY(Math.PI / (x.seg || 8));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: x.boja, roughness: 0.85, flatShading: x.tip === 'stozac' }));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0x5a4020 })));
  mesh.matrixAutoUpdate = false; svijet.add(mesh);
  mat0.fromArray(x.M0); mat1.fromArray(x.M1);
  const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), s0 = new THREE.Vector3(), p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), s1 = new THREE.Vector3();
  mat0.decompose(p0, q0, s0); mat1.decompose(p1, q1, s1);
  dijelovi.push({ d: x, mesh, p0, q0, p1, q1, korak: x.korak });
}
const stol = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ color: 0x9aa7ad, roughness: 1, transparent: true, opacity: 0.16 }));
stol.rotation.x = -Math.PI / 2; stol.position.y = -0.3; svijet.add(stol);

let korakS = 0;
const tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3(1, 1, 1);
function postaviKorak(s) {
  korakS = s;
  for (const x of dijelovi) {
    const f = sglatko(s - (x.korak - 1));
    tp.lerpVectors(x.p0, x.p1, f); tp.y += Math.sin(Math.PI * f) * (PR.dizanje || 120);
    tq.slerpQuaternions(x.q0, x.q1, f);
    x.mesh.matrix.compose(tp, tq, ts);
  }
  const i = Math.min(N, Math.round(s));
  $('#korak-br').textContent = `${i} / ${N}`;
  $('#korak-naslov').textContent = PR.koraci[i].t;
  $('#korak-opis').textContent = PR.koraci[i].o;
  $('#klizac').value = s;
  document.querySelectorAll('#koraci-popis li').forEach((li, j) => li.classList.toggle('aktivan', j === i));
  for (const x of dijelovi) { const akt = x.korak === i && i > 0 && s < N - 0.001; x.mesh.material.emissive.setHex(akt ? 0x2ECAD4 : 0); x.mesh.material.emissiveIntensity = akt ? 0.35 : 0; }
}
function pogled(v) {
  const c = new THREE.Vector3(...PR.pogled.cilj), r = PR.pogled.r;
  if (v === 'sprijeda') kamera.position.set(c.x, c.y + r * 0.15, c.z + r * 1.6);
  else if (v === 'gore') kamera.position.set(c.x, c.y + r * 2, c.z + 0.01);
  else if (v === 'ploce') { const cl = new THREE.Vector3(...PR.pogled.ploce); kontrole.target.copy(cl); kamera.position.set(cl.x, PR.pogled.rp * 1.6, cl.z + PR.pogled.rp * 0.9); return; }
  else kamera.position.set(c.x + r * 0.9, c.y + r * 0.7, c.z + r * 1.25);
  kontrole.target.copy(c);
}
function velicina() { const w = scena.clientWidth, h = scena.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scena);
let svira = false, zadnje = 0;
function petlja(t) {
  requestAnimationFrame(petlja);
  const dt = Math.min(0.05, (t - zadnje) / 1000); zadnje = t;
  if (svira) {
    let s = korakS + dt * 0.5 * Number($('#brzina').value || 1);
    if (s >= N) { s = N; svira = false; $('#sviraj').setAttribute('aria-pressed', 'false'); $('#sviraj').textContent = 'Sastavi'; }
    postaviKorak(s);
  }
  kontrole.update(); renderer.render(svijet, kamera);
}
requestAnimationFrame(petlja);

// ── laser: ploče, redoslijed, animacija ───────────────────────────────
const platno = $('#mreza'), ctx = platno.getContext('2d');
const BRZ_PRAZNO = 200;
const putevi = []; // {mat, ploca, tocke, unutra}
for (const d of PR.dijelovi) {
  const pl = PR.ploce[d.ploca];
  const pom = p => [p[0] + d.cx + pl.x, p[1] + d.cy + pl.y];
  for (const h of d.rupe) putevi.push({ d, mat: d.mat, ploca: d.ploca, unutra: true, tocke: h.map(pom) });
  putevi.push({ d, mat: d.mat, ploca: d.ploca, unutra: false, tocke: d.obris.map(pom) });
}
for (const g of (PR.gravura || [])) { const pl = PR.ploce[g.ploca]; putevi.push({ mat: g.mat, ploca: g.ploca, unutra: true, gravura: true, tocke: g.tocke.map(p => [p[0] + pl.x, p[1] + pl.y]) }); }
// redoslijed: po pločama, najprije unutarnji rezovi, onda obrisi; najbliži sljedeći
const red = [];
let poz = [0, 0], t = 0;
const duljina = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
for (let k = 0; k < PR.ploce.length; k++) {
  for (const faza of [true, false]) {
    const ost = putevi.filter(q => q.ploca === k && q.unutra === faza);
    while (ost.length) {
      let bi = 0, bd = 1e18, bj = 0;
      ost.forEach((q, i) => q.tocke.forEach((p, j) => { const dd = (p[0] - poz[0]) ** 2 + (p[1] - poz[1]) ** 2; if (dd < bd) { bd = dd; bi = i; bj = j; } }));
      const q = ost.splice(bi, 1)[0];
      const tk = q.tocke.slice(bj).concat(q.tocke.slice(0, bj + 1));
      const m = PR.materijali[q.mat];
      const lp = Math.sqrt(bd), lr = duljina(q.tocke);
      const v = m.brzina;
      red.push({ q, tk, od: poz, t0: t, tp: lp / BRZ_PRAZNO, t1: t + lp / BRZ_PRAZNO + lr / v, v, m });
      t += lp / BRZ_PRAZNO + lr / v; poz = tk[tk.length - 1];
    }
  }
}
const ukupno = t;
let laserT = 0, laserSvira = false;
$('#laser-klizac').max = ukupno;
const sveW = Math.max(...PR.ploce.map(p => p.x + p.w)), sveH = Math.max(...PR.ploce.map(p => p.y + p.h));
function crtaj() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = platno.clientWidth, h = platno.clientHeight;
  platno.width = w * dpr; platno.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const m = 10, s = Math.min((w - 2 * m) / sveW, (h - 2 * m) / sveH);
  const ox = (w - sveW * s) / 2, oy = (h - sveH * s) / 2;
  const X = x => ox + x * s, Y = y => h - oy - y * s;
  for (const p of PR.ploce) {
    const mm = PR.materijali[p.mat];
    ctx.fillStyle = mm.boja2d; ctx.globalAlpha = 0.5; ctx.fillRect(X(p.x), Y(p.y + p.h), p.w * s, p.h * s); ctx.globalAlpha = 1;
    ctx.fillStyle = css('--body'); ctx.font = '11px IBM Plex Sans, sans-serif'; ctx.fillText(p.naziv, X(p.x) + 4, Y(p.y + p.h) + 13);
  }
  const ink = css('--ink');
  const put = (pts, zatv) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); if (zatv) ctx.closePath(); };
  ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
  for (const q of putevi) { ctx.strokeStyle = q.gravura ? '#E0533D' : q.unutra ? '#3B82C4' : ink; put(q.tocke, !q.gravura); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.lineWidth = 1.8;
  let glava = null, rez = false, akt = null;
  for (const r of red) {
    if (laserT <= r.t0) break;
    ctx.strokeStyle = r.q.gravura ? '#E0533D' : r.q.unutra ? '#3B82C4' : ink;
    if (laserT >= r.t1) { put(r.tk, false); ctx.stroke(); glava = r.tk[r.tk.length - 1]; continue; }
    akt = r;
    if (laserT < r.t0 + r.tp) { const f = (laserT - r.t0) / r.tp; glava = [r.od[0] + (r.tk[0][0] - r.od[0]) * f, r.od[1] + (r.tk[0][1] - r.od[1]) * f]; break; }
    let ost = (laserT - r.t0 - r.tp) * r.v; const dio = [r.tk[0]];
    for (let i = 1; i < r.tk.length; i++) {
      const a = r.tk[i - 1], b = r.tk[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (ost >= l) { dio.push(b); ost -= l; } else { const f = ost / l; dio.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); break; }
    }
    put(dio, false); ctx.stroke(); glava = dio[dio.length - 1]; rez = true; break;
  }
  if (glava && laserT < ukupno) {
    ctx.fillStyle = rez ? '#E0533D' : css('--body'); ctx.beginPath(); ctx.arc(X(glava[0]), Y(glava[1]), rez ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill();
  }
  const sek = Math.floor(laserT), hh = Math.floor(sek / 3600), mi = Math.floor(sek / 60) % 60, ss = sek % 60;
  $('#lcd-time').textContent = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  $('#lcd-power').textContent = akt ? `${akt.m.snaga}/${akt.m.snaga}%` : (laserT >= ukupno && laserT > 0 ? '0/0%' : '0/0%');
  $('#lcd-sloj').textContent = akt ? (akt.q.gravura ? 'ENGRAVE' : akt.q.unutra ? 'UNUTRA' : 'OBRIS') : (laserT >= ukupno && laserT > 0 ? 'GOTOVO' : '—');
  $('#laser-klizac').value = laserT;
  $('#laser-info').textContent = `${fmt(laserT / 60, 1)} / ${fmt(ukupno / 60, 1)} min`;
}
let zL = 0;
function petljaL(ts) {
  requestAnimationFrame(petljaL);
  const dt = Math.min(0.05, (ts - zL) / 1000); zL = ts;
  if (laserSvira) { laserT += dt * Number($('#laser-brzina').value); if (laserT >= ukupno) { laserT = ukupno; laserSvira = false; $('#laser-start').textContent = 'Start'; } crtaj(); }
}
requestAnimationFrame(petljaL);
new ResizeObserver(crtaj).observe(platno);
new MutationObserver(crtaj).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── DXF (R12): obrisi kao LINE, unutarnji rezovi na zasebnom sloju (reže se prvi) ──
function dxf() {
  const L = []; const w = (c, v) => { L.push(String(c)); L.push(String(v)); };
  const sl = [['UNUTARNJI', 5]];
  for (const [k, m] of Object.entries(PR.materijali)) sl.push(['OBRIS_' + k.toUpperCase(), m.dxfBoja || 7]);
  if (PR.gravura) sl.unshift(['GRAVURA', 1]);
  w(0, 'SECTION'); w(2, 'HEADER'); w(9, '$ACADVER'); w(1, 'AC1009'); w(0, 'ENDSEC');
  w(0, 'SECTION'); w(2, 'TABLES'); w(0, 'TABLE'); w(2, 'LAYER'); w(70, sl.length);
  for (const [n, c] of sl) { w(0, 'LAYER'); w(2, n); w(70, 0); w(62, c); w(6, 'CONTINUOUS'); }
  w(0, 'ENDTAB'); w(0, 'ENDSEC'); w(0, 'SECTION'); w(2, 'ENTITIES');
  const f = v => v.toFixed(3);
  for (const q of putevi) {
    const sloj = q.gravura ? ['GRAVURA', 1] : q.unutra ? ['UNUTARNJI', 5] : ['OBRIS_' + q.mat.toUpperCase(), PR.materijali[q.mat].dxfBoja || 7];
    const p = q.tocke, n = q.gravura ? p.length - 1 : p.length;
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % p.length]; w(0, 'LINE'); w(8, sloj[0]); w(62, sloj[1]); w(10, f(a[0])); w(20, f(a[1])); w(30, '0.0'); w(11, f(b[0])); w(21, f(b[1])); w(31, '0.0'); }
  }
  w(0, 'ENDSEC'); w(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}

// ── popis dijelova ──
const brojac = {};
const grupe = new Map();
for (const d of PR.dijelovi) { const k = [d.poz, d.naziv, d.mat, Math.round(d.w), Math.round(d.h)].join('|'); const g = grupe.get(k); if (g) g.n++; else grupe.set(k, { d, n: 1 }); }
for (const x of (PR.dodatno || [])) { const k = ['', x.naziv, 'x'].join('|'); const g = grupe.get(k); if (g) g.n++; else grupe.set(k, { d: { poz: x.poz || '', naziv: x.naziv, mat: null, w: x.w, h: x.hh, opis: x.materijal }, n: 1 }); }
$('#dijelovi').innerHTML = [...grupe.values()].map(({ d, n }) => { const m = d.mat ? PR.materijali[d.mat] : { naziv: d.opis }; return `<tr><th scope="row">${d.poz || ''}</th><td>${d.naziv}</td><td>${n}</td><td>${m.naziv}</td><td>${fmt(d.w, 0)} × ${fmt(d.h, 0)}</td></tr>`; }).join('');
$('#materijali').innerHTML = Object.values(PR.materijali).map(m => `<li><span class="kvadrat" style="background:${m.boja2d}"></span><b>${m.naziv}</b> · ${m.snaga} % · ${m.brzina} mm/s</li>`).join('');
$('#ukupno').textContent = `${PR.dijelovi.length} dijelova · ${PR.ploce.length} ploč${PR.ploce.length === 1 ? 'a' : PR.ploce.length < 5 ? 'e' : 'a'} · rezanje ≈ ${fmt(ukupno / 60, 1)} min`;

// ── gumbi ──
$('#klizac').max = N;
$('#koraci-popis').innerHTML = PR.koraci.map((k, i) => `<li><button type="button" data-k="${i}"><b>${i}.</b> ${k.t}</button></li>`).join('');
$('#koraci-popis').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { svira = false; postaviKorak(Number(b.dataset.k)); } });
$('#klizac').addEventListener('input', e => { svira = false; postaviKorak(Number(e.target.value)); });
$('#sviraj').addEventListener('click', e => { svira = !svira; if (svira && korakS >= N) postaviKorak(0); e.target.setAttribute('aria-pressed', String(svira)); e.target.textContent = svira ? 'Zaustavi' : 'Sastavi'; });
$('#natrag').addEventListener('click', () => { svira = false; postaviKorak(Math.max(0, Math.ceil(korakS - 1e-6) - 1)); });
$('#naprijed').addEventListener('click', () => { svira = false; postaviKorak(Math.min(N, Math.floor(korakS + 1e-6) + 1)); });
$('#razvij').addEventListener('click', () => { svira = false; postaviKorak(0); pogled('ploce'); });
$('#savij').addEventListener('click', () => { svira = false; postaviKorak(N); pogled('kosi'); });
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('#laser-start').addEventListener('click', e => { laserSvira = !laserSvira; if (laserSvira && laserT >= ukupno) laserT = 0; e.target.textContent = laserSvira ? 'Pause' : 'Start'; });
$('#laser-stop').addEventListener('click', () => { laserSvira = false; laserT = 0; $('#laser-start').textContent = 'Start'; crtaj(); });
$('#laser-klizac').addEventListener('input', e => { laserSvira = false; laserT = Number(e.target.value); $('#laser-start').textContent = 'Start'; crtaj(); });
$('#dxf').addEventListener('click', () => {
  const b = new Blob([dxf()], { type: 'application/dxf' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = PR.dxfIme; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  $('#dxf-info').textContent = `Preuzeto: ${PR.dxfIme}. LaserCut 5.3: File → Import; sloj UNUTARNJI reže se prvi, obrisi zadnji.`;
});
postaviKorak(0); pogled('ploce'); crtaj();
$('#ucitavanje')?.remove();
