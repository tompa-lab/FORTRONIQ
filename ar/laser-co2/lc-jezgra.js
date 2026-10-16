// FORTRONIQ · CO₂ laser · jezgra simulatora LaserCut 5.3
// DXF uvoz (LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE, INSERT), slojevi po bojama,
// putanja (Optimize: Inner-to-outer, najbliži sljedeći), vremenski profil gibanja (Worktable), DXF izvoz.
// Koordinate u mm, ishodište dolje lijevo radnog polja, Y prema stražnjoj strani stroja.

// ── boje: AutoCAD Color Index (ACI) ───────────────────────────────────
const ACI_OSN = { 1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF', 5: '#0000FF', 6: '#FF00FF', 7: '#000000', 8: '#808080', 9: '#C0C0C0' };
export function aciHex(i) {
  if (ACI_OSN[i]) return ACI_OSN[i];
  if (i >= 250) { const g = Math.round(51 + (i - 250) * 40.8); return '#' + g.toString(16).padStart(2, '0').repeat(3); }
  if (i < 10 || i > 249) return '#000000';
  const h = Math.floor((i - 10) / 10) * 15, k = (i - 10) % 10;
  const v = [1, 1, 0.8, 0.8, 0.6, 0.6, 0.5, 0.5, 0.3, 0.3][k], s = k % 2 ? 0.5 : 1;
  const f = n => { const kk = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(kk, 4 - kk, 1)); };
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
// paleta na dnu prozora LaserCuta (redom kao u programu: crna, plava, crvena, zelena, žuta …)
export const PALETA = [7, 5, 1, 3, 2, 6, 4, 30, 8, 9, 10, 20, 40, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230, 14, 34, 54, 94, 134, 174, 214];
export const imeBoje = i => ({ 7: 'crna', 5: 'plava', 1: 'crvena', 3: 'zelena', 2: 'žuta', 6: 'magenta', 4: 'cijan', 30: 'narančasta', 8: 'siva', 9: 'svijetlosiva' }[i] || 'boja ' + i);

// ── geometrija ─────────────────────────────────────────────────────────
export function uPoligonu(p, x, y) {
  let u = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) u = !u;
  }
  return u;
}
export function okvir(pts) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; }
  return { x0: a, y0: b, x1: c, y1: d };
}
export function duljina(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
function lukTocke(cx, cy, r, a0, a1, tol = 0.05) {
  let da = a1 - a0;
  const korak = 2 * Math.acos(Math.max(-1, 1 - tol / Math.max(r, 1e-6)));
  const n = Math.max(2, Math.min(720, Math.ceil(Math.abs(da) / Math.max(korak, 0.005))));
  const p = [];
  for (let i = 0; i <= n; i++) { const a = a0 + da * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}
function bulge(p0, p1, b) { // luk između dvije točke s „bulge” vrijednošću (LWPOLYLINE)
  const [x0, y0] = p0, [x1, y1] = p1;
  const th = 4 * Math.atan(b), d = Math.hypot(x1 - x0, y1 - y0);
  if (d < 1e-9 || Math.abs(b) < 1e-9) return [p1];
  const r = d / (2 * Math.sin(th / 2));
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const h = Math.sqrt(Math.max(0, r * r - d * d / 4)) * Math.sign(b) * (Math.abs(th) > Math.PI ? -1 : 1);
  const nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
  const cx = mx + nx * h, cy = my + ny * h;
  const a0 = Math.atan2(y0 - cy, x0 - cx);
  let a1 = Math.atan2(y1 - cy, x1 - cx);
  if (b > 0) { while (a1 <= a0) a1 += 2 * Math.PI; } else { while (a1 >= a0) a1 -= 2 * Math.PI; }
  return lukTocke(cx, cy, Math.abs(r), a0, a1).slice(1);
}
function deBoor(k, x, t, c, p, w) { // racionalni B-spline
  const d = [];
  for (let j = 0; j <= p; j++) { const q = c[j + k - p], ww = w ? w[j + k - p] : 1; d.push([q[0] * ww, q[1] * ww, ww]); }
  for (let r = 1; r <= p; r++) for (let j = p; j >= r; j--) {
    const den = t[j + 1 + k - r] - t[j + k - p];
    const al = den === 0 ? 0 : (x - t[j + k - p]) / den;
    for (let m = 0; m < 3; m++) d[j][m] = (1 - al) * d[j - 1][m] + al * d[j][m];
  }
  return [d[p][0] / d[p][2], d[p][1] / d[p][2]];
}
function splineTocke(deg, cvor, kont, tez, fit) {
  if (kont.length < 2) return fit.length > 1 ? fit : [];
  const p = Math.min(deg, kont.length - 1);
  let t = cvor;
  if (t.length !== kont.length + p + 1) { t = []; for (let i = 0; i < kont.length + p + 1; i++) t.push(i < p + 1 ? 0 : i > kont.length - 1 ? kont.length - p : i - p); }
  const a = t[p], b = t[kont.length];
  const n = Math.max(24, kont.length * 12), out = [];
  for (let i = 0; i <= n; i++) {
    const x = a + (b - a) * i / n;
    let k = p; while (k < kont.length - 1 && x >= t[k + 1]) k++;
    out.push(deBoor(k, Math.min(x, b - 1e-12 * (b - a)), t, kont, p, tez && tez.length === kont.length ? tez : null));
  }
  out[out.length - 1] = deBoor(kont.length - 1, b - 1e-9 * (b - a), t, kont, p, tez && tez.length === kont.length ? tez : null);
  return out;
}

// ── DXF uvoz ───────────────────────────────────────────────────────────
export function citajDXF(tekst) {
  const red = tekst.split(/\r\n|\r|\n/);
  const P = [];
  for (let i = 0; i + 1 < red.length; i += 2) P.push([parseInt(red[i].trim(), 10), red[i + 1].trim()]);
  const bojaSloja = {}, blokovi = {}, upoz = new Set();
  let jedinice = 4;
  // HEADER: $INSUNITS
  for (let i = 0; i < P.length; i++) if (P[i][0] === 9 && P[i][1] === '$INSUNITS' && P[i + 1]) jedinice = parseInt(P[i + 1][1], 10) || 4;
  // TABLES: LAYER → boja
  for (let i = 0; i < P.length; i++) {
    if (P[i][0] === 0 && P[i][1] === 'LAYER') {
      let ime = null, b = 7;
      for (let j = i + 1; j < P.length && P[j][0] !== 0; j++) { if (P[j][0] === 2) ime = P[j][1]; if (P[j][0] === 62) b = Math.abs(parseInt(P[j][1], 10)) || 7; }
      if (ime !== null) bojaSloja[ime] = b;
    }
  }
  // rastavi na entitete (popis grupa koda)
  function entiteti(od, do_) {
    const E = []; let cur = null;
    for (let i = od; i < do_; i++) {
      const [c, v] = P[i];
      if (c === 0) { if (cur) E.push(cur); cur = { tip: v, g: [] }; } else if (cur) cur.g.push([c, v]);
    }
    if (cur) E.push(cur);
    return E;
  }
  let iEnt = -1, iEntK = P.length, iBlk = -1, iBlkK = -1;
  for (let i = 0; i < P.length - 1; i++) {
    if (P[i][0] === 0 && P[i][1] === 'SECTION' && P[i + 1][0] === 2) {
      let k = i + 2; while (k < P.length && !(P[k][0] === 0 && P[k][1] === 'ENDSEC')) k++;
      if (P[i + 1][1] === 'ENTITIES') { iEnt = i + 2; iEntK = k; }
      if (P[i + 1][1] === 'BLOCKS') { iBlk = i + 2; iBlkK = k; }
    }
  }
  if (iBlk >= 0) {
    const E = entiteti(iBlk, iBlkK); let cur = null;
    for (const e of E) {
      if (e.tip === 'BLOCK') { const ime = (e.g.find(g => g[0] === 2) || [0, ''])[1]; const bx = +(e.g.find(g => g[0] === 10) || [0, 0])[1], by = +(e.g.find(g => g[0] === 20) || [0, 0])[1]; cur = { ime, bx, by, E: [] }; blokovi[ime] = cur; }
      else if (e.tip === 'ENDBLK') cur = null; else if (cur) cur.E.push(e);
    }
  }
  const objekti = [];
  function boja(e, bojaRod) {
    const c = e.g.find(g => g[0] === 62); const sl = (e.g.find(g => g[0] === 8) || [0, '0'])[1];
    let b = c ? parseInt(c[1], 10) : 256;
    if (b === 256) b = bojaSloja[sl] ?? 7; else if (b === 0) b = bojaRod ?? 7;
    return Math.abs(b) || 7;
  }
  const br = (e, c, d = 0) => { const g = e.g.find(x => x[0] === c); return g ? parseFloat(g[1]) : d; };
  function obradi(E, T, bojaRod, dubina) {
    let poly = null;
    for (const e of E) {
      const b = boja(e, bojaRod);
      if (e.tip === 'LINE') dodaj([[br(e, 10), br(e, 20)], [br(e, 11), br(e, 21)]], b, T);
      else if (e.tip === 'CIRCLE') { const r = br(e, 40); dodaj(lukTocke(br(e, 10), br(e, 20), r, 0, 2 * Math.PI), b, T, true); }
      else if (e.tip === 'ARC') { let a0 = br(e, 50) * Math.PI / 180, a1 = br(e, 51) * Math.PI / 180; while (a1 <= a0) a1 += 2 * Math.PI; dodaj(lukTocke(br(e, 10), br(e, 20), br(e, 40), a0, a1), b, T); }
      else if (e.tip === 'ELLIPSE') {
        const cx = br(e, 10), cy = br(e, 20), mx = br(e, 11), my = br(e, 21), q = br(e, 40, 1); let t0 = br(e, 41, 0), t1 = br(e, 42, 2 * Math.PI);
        while (t1 <= t0) t1 += 2 * Math.PI;
        const a = Math.hypot(mx, my), fi = Math.atan2(my, mx), n = Math.max(24, Math.ceil((t1 - t0) / (2 * Math.PI) * 120)), p = [];
        for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n, x = a * Math.cos(t), y = a * q * Math.sin(t); p.push([cx + x * Math.cos(fi) - y * Math.sin(fi), cy + x * Math.sin(fi) + y * Math.cos(fi)]); }
        dodaj(p, b, T, Math.abs(t1 - t0 - 2 * Math.PI) < 1e-6);
      }
      else if (e.tip === 'LWPOLYLINE') {
        const zatv = (br(e, 70) & 1) === 1; const v = []; let zad = null;
        for (const [c, val] of e.g) { if (c === 10) { zad = [parseFloat(val), 0, 0]; v.push(zad); } else if (c === 20 && zad) zad[1] = parseFloat(val); else if (c === 42 && zad) zad[2] = parseFloat(val); }
        dodaj(lomljena(v, zatv), b, T, zatv);
      }
      else if (e.tip === 'POLYLINE') { poly = { b, zatv: (br(e, 70) & 1) === 1, v: [] }; }
      else if (e.tip === 'VERTEX' && poly) { if (!(br(e, 70) & 16)) poly.v.push([br(e, 10), br(e, 20), br(e, 42)]); }
      else if (e.tip === 'SEQEND' && poly) { dodaj(lomljena(poly.v, poly.zatv), poly.b, T, poly.zatv); poly = null; }
      else if (e.tip === 'SPLINE') {
        const deg = br(e, 71, 3); const cv = [], kont = [], tez = [], fit = []; let z = null, zf = null;
        for (const [c, val] of e.g) {
          if (c === 40) cv.push(parseFloat(val)); else if (c === 41) tez.push(parseFloat(val));
          else if (c === 10) { z = [parseFloat(val), 0]; kont.push(z); } else if (c === 20 && z) z[1] = parseFloat(val);
          else if (c === 11) { zf = [parseFloat(val), 0]; fit.push(zf); } else if (c === 21 && zf) zf[1] = parseFloat(val);
        }
        const p = splineTocke(deg, cv, kont, tez, fit); dodaj(p, b, T, (br(e, 70) & 1) === 1);
      }
      else if (e.tip === 'INSERT' && dubina < 8) {
        const bl = blokovi[(e.g.find(g => g[0] === 2) || [0, ''])[1]]; if (!bl) continue;
        const sx = br(e, 41, 1), sy = br(e, 42, 1), rot = br(e, 50, 0) * Math.PI / 180, ix = br(e, 10), iy = br(e, 20);
        const c = Math.cos(rot), s = Math.sin(rot);
        const T2 = ([x, y]) => { const X = (x - bl.bx) * sx, Y = (y - bl.by) * sy; return T([ix + X * c - Y * s, iy + X * s + Y * c]); };
        obradi(bl.E, T2, b, dubina + 1);
      }
      else if (['TEXT', 'MTEXT', 'HATCH', 'DIMENSION', 'SOLID', '3DFACE'].includes(e.tip)) upoz.add(e.tip);
    }
  }
  function lomljena(v, zatv) {
    if (!v.length) return [];
    const p = [[v[0][0], v[0][1]]];
    const n = zatv ? v.length : v.length - 1;
    for (let i = 0; i < n; i++) { const a = v[i], b = v[(i + 1) % v.length]; if (a[2]) p.push(...bulge([a[0], a[1]], [b[0], b[1]], a[2])); else p.push([b[0], b[1]]); }
    return p;
  }
  const mj = jedinice === 1 ? 25.4 : jedinice === 5 ? 10 : jedinice === 6 ? 1000 : 1;
  function dodaj(pts, b, T, zatv = false) {
    if (!pts || pts.length < 2) return;
    let q = pts.map(T).map(([x, y]) => [x * mj, y * mj]);
    const z = zatv || Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]) < 1e-6;
    if (z && Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]) > 1e-9) q.push([q[0][0], q[0][1]]);
    objekti.push({ pts: q, zatv: z, aci: b });
  }
  if (iEnt < 0) throw new Error('U datoteci nema odjeljka ENTITIES — nije DXF ili je oštećen.');
  obradi(entiteti(iEnt, iEntK), p => p, 7, 0);
  return { objekti, upozorenja: [...upoz], jedinice };
}

// ── DXF izvoz (R12, LINE po bojama, kao „Export → DXF-AutoCAD”) ──────
export function pisiDXF(objekti) {
  const L = []; const w = (c, v) => { L.push(String(c)); L.push(String(v)); };
  const boje = [...new Set(objekti.map(o => o.aci))];
  w(0, 'SECTION'); w(2, 'HEADER'); w(9, '$ACADVER'); w(1, 'AC1009'); w(9, '$INSUNITS'); w(70, 4); w(0, 'ENDSEC');
  w(0, 'SECTION'); w(2, 'TABLES'); w(0, 'TABLE'); w(2, 'LAYER'); w(70, boje.length + 1);
  w(0, 'LAYER'); w(2, '0'); w(70, 0); w(62, 7); w(6, 'CONTINUOUS');
  for (const b of boje) { w(0, 'LAYER'); w(2, 'BOJA_' + b); w(70, 0); w(62, b); w(6, 'CONTINUOUS'); }
  w(0, 'ENDTAB'); w(0, 'ENDSEC'); w(0, 'SECTION'); w(2, 'ENTITIES');
  const f = v => v.toFixed(4);
  for (const o of objekti) {
    w(0, 'POLYLINE'); w(8, 'BOJA_' + o.aci); w(62, o.aci); w(66, 1); w(10, '0.0'); w(20, '0.0'); w(30, '0.0'); w(70, o.zatv ? 1 : 0);
    const p = o.zatv ? o.pts.slice(0, -1) : o.pts;
    for (const [x, y] of p) { w(0, 'VERTEX'); w(8, 'BOJA_' + o.aci); w(10, f(x)); w(20, f(y)); w(30, '0.0'); }
    w(0, 'SEQEND'); w(8, 'BOJA_' + o.aci);
  }
  w(0, 'ENDSEC'); w(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}

// ── Unite lines: spajanje dodirnih linija u lance (tolerancija u mm) ───
export function spojiLinije(objekti, tol = 0.01) {
  const out = [], poBoji = new Map();
  for (const o of objekti) { if (o.zatv) { out.push(o); continue; } if (!poBoji.has(o.aci)) poBoji.set(o.aci, []); poBoji.get(o.aci).push(o); }
  const kljuc = (x, y) => Math.round(x / Math.max(tol, 1e-4)) + ',' + Math.round(y / Math.max(tol, 1e-4));
  for (const [aci, lista] of poBoji) {
    const krajevi = new Map(); // ključ → [{i, kraj}]
    const reg = (i, k, p) => { for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) { const kk = (Math.round(p[0] / Math.max(tol, 1e-4)) + dx) + ',' + (Math.round(p[1] / Math.max(tol, 1e-4)) + dy); if (!krajevi.has(kk)) krajevi.set(kk, []); krajevi.get(kk).push({ i, k }); } };
    lista.forEach((o, i) => { reg(i, 0, o.pts[0]); reg(i, 1, o.pts[o.pts.length - 1]); });
    const kor = new Array(lista.length).fill(false);
    const nadji = (p, osim) => {
      const c = krajevi.get(kljuc(p[0], p[1])) || [];
      for (const { i, k } of c) { if (kor[i] || i === osim) continue; const q = k === 0 ? lista[i].pts[0] : lista[i].pts[lista[i].pts.length - 1]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) <= tol + 1e-9) return { i, k }; }
      return null;
    };
    for (let s = 0; s < lista.length; s++) {
      if (kor[s]) continue; kor[s] = true;
      let lanac = lista[s].pts.slice();
      for (let smjer = 0; smjer < 2; smjer++) {
        for (;;) {
          const kraj = lanac[lanac.length - 1];
          const n = nadji(kraj, -1); if (!n) break;
          kor[n.i] = true;
          const p = n.k === 0 ? lista[n.i].pts : lista[n.i].pts.slice().reverse();
          lanac.push(...p.slice(1));
          if (Math.hypot(lanac[0][0] - lanac[lanac.length - 1][0], lanac[0][1] - lanac[lanac.length - 1][1]) <= tol) break;
        }
        if (Math.hypot(lanac[0][0] - lanac[lanac.length - 1][0], lanac[0][1] - lanac[lanac.length - 1][1]) <= tol) break;
        lanac.reverse();
      }
      const z = lanac.length > 2 && Math.hypot(lanac[0][0] - lanac[lanac.length - 1][0], lanac[0][1] - lanac[lanac.length - 1][1]) <= tol;
      if (z) lanac[lanac.length - 1] = [lanac[0][0], lanac[0][1]];
      out.push({ pts: lanac, zatv: z, aci });
    }
  }
  return out;
}

// ── Worktable i rezne postavke (vrijednosti iz videa „MACHINE SET UP”, LC1390N) ──
export function zadaniWorktable(stroj) {
  const lc = stroj === 'LC1390N';
  return {
    xMove: lc ? 31.75 : 24, xPuls: 5000, yMove: lc ? 31.75 : 45.501, yPuls: 5000,
    xRange: lc ? 1300 : 500, yRange: lc ? 900 : 300, xDatum: 'P Dir', yDatum: 'P Dir', autoDatum: true,
    startSpeed: 1, quickSpeed: 200, workAcc: 200, spaceAcc: 500,
    datumSpeed: 80, constSpeed: 10, testFast: 200, testSlow: 190, laserSpace: 0, xJump: 20, yJump: 20,
    // Feeding (Z, stol s podizanjem) — samo LC1390N
    zRange: lc ? 180 : 0, zMove: 4, zPuls: 1600, zDatumSpeed: 5, zStart: 1, zAcc: 50, zTestFast: 10, zTestSlow: 5, zDatumDist: 0,
    // Engrave (procjena — nije s tvog stroja)
    gravAcc: 2000, gravStart: 20
  };
}
export const MODOVI = ['Cut', 'Engrave', 'GradeEngrave', 'Hole'];
export function noviSloj(aci, prema) {
  return Object.assign({ aci, mod: 'Cut', v: 30, p: 65, kp: 60, prek: 0, puh: 'uvijek', n: 1, izlaz: true, razmak: 0.1, bidir: true, minP: 10, sirina: 1, zracenje: 0.1 }, prema || {});
}

// ── slojevi iz objekata (redoslijed pojavljivanja boja) ─────────────────
export function uskladiSlojeve(objekti, slojevi) {
  const ima = new Set(objekti.map(o => o.aci));
  const sl = slojevi.filter(s => ima.has(s.aci));
  for (const o of objekti) if (!sl.find(s => s.aci === o.aci)) sl.push(noviSloj(o.aci));
  return sl;
}

// ── profil gibanja jednog odsječka (trapez) ────────────────────────────
export function profil(L, vin, vout, vmax, a) {
  if (L <= 1e-12) return { L: 0, t: 0, vin, vout, vp: vin, a, t1: 0, t2: 0, t3: 0, d1: 0, d2: 0 };
  if (!(a > 0) || (Math.abs(vin - vmax) < 1e-9 && Math.abs(vout - vmax) < 1e-9)) return { L, t: L / vmax, vin: vmax, vout: vmax, vp: vmax, a: 0, t1: 0, t2: L / vmax, t3: 0, d1: 0, d2: L };
  let vp = Math.min(vmax, Math.sqrt(Math.max(0, (2 * a * L + vin * vin + vout * vout) / 2)));
  vp = Math.max(vp, vin, vout);
  const d1 = Math.max(0, (vp * vp - vin * vin) / (2 * a)), d3 = Math.max(0, (vp * vp - vout * vout) / (2 * a));
  const d2 = Math.max(0, L - d1 - d3);
  const t1 = (vp - vin) / a, t3 = (vp - vout) / a, t2 = d2 / vp;
  return { L, t: t1 + t2 + t3, vin, vout, vp, a, t1, t2, t3, d1, d2 };
}
export function putUVremenu(pr, t) { // prijeđeni put i trenutna brzina
  if (t <= 0) return [0, pr.vin];
  if (t >= pr.t) return [pr.L, pr.vout];
  if (t < pr.t1) return [pr.vin * t + pr.a * t * t / 2, pr.vin + pr.a * t];
  if (t < pr.t1 + pr.t2) return [pr.d1 + pr.vp * (t - pr.t1), pr.vp];
  const u = t - pr.t1 - pr.t2;
  return [Math.min(pr.L, pr.d1 + pr.d2 + pr.vp * u - pr.a * u * u / 2), pr.vp - pr.a * u];
}

// ── planiranje brzina po lomljenoj liniji ──────────────────────────────
function planLinije(pts, v, wt, korakT) {
  const n = pts.length - 1; if (n < 1) return [];
  const konst = v <= wt.constSpeed;
  const L = [], u = [];
  for (let i = 0; i < n; i++) { const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy); L.push(l); u.push(l > 1e-12 ? [dx / l, dy / l] : null); }
  // popuni smjer za nulte odsječke
  for (let i = 0; i < n; i++) if (!u[i]) u[i] = u[i - 1] || u.find(x => x) || [1, 0];
  const V = new Array(n + 1);
  if (konst) { for (let i = 0; i <= n; i++) V[i] = v; }
  else {
    const a = wt.workAcc, vs = Math.min(wt.startSpeed, v);
    V[0] = vs; V[n] = vs;
    for (let i = 1; i < n; i++) {
      const dx = Math.abs(u[i][0] - u[i - 1][0]), dy = Math.abs(u[i][1] - u[i - 1][1]);
      let vj = v; if (dx > 1e-9) vj = Math.min(vj, wt.xJump / dx); if (dy > 1e-9) vj = Math.min(vj, wt.yJump / dy);
      V[i] = Math.max(vs, vj);
    }
    for (let i = n - 1; i >= 0; i--) V[i] = Math.min(V[i], Math.sqrt(V[i + 1] * V[i + 1] + 2 * a * L[i]));
    for (let i = 1; i <= n; i++) V[i] = Math.min(V[i], Math.sqrt(V[i - 1] * V[i - 1] + 2 * a * L[i - 1]));
  }
  const out = [];
  for (let i = 0; i < n; i++) out.push(Object.assign(profil(L[i], V[i], V[i + 1], v, konst ? 0 : wt.workAcc), { x0: pts[i][0], y0: pts[i][1], x1: pts[i + 1][0], y1: pts[i + 1][1] }, korakT));
  return out;
}
function prazanHod(x0, y0, x1, y1, wt) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1e-9) return null;
  return Object.assign(profil(L, wt.startSpeed, wt.startSpeed, wt.quickSpeed, wt.spaceAcc), { x0, y0, x1, y1, laser: 0 });
}

// ── redoslijed: Optimize Inner-to-outer + najbliži sljedeći ────────────
function poredaj(objekti, start) {
  const n = objekti.length;
  const ok = objekti.map(o => okvir(o.pts));
  const zatv = objekti.map(o => o.zatv && o.pts.length > 3);
  // tko je unutar koga (samo zatvoreni mogu sadržavati)
  const djeca = objekti.map(() => 0), roditelji = objekti.map(() => []);
  const zIdx = objekti.map((o, i) => i).filter(i => zatv[i]);
  for (let i = 0; i < n; i++) {
    const p = objekti[i].pts, tx = (p[0][0] + p[Math.floor(p.length / 2)][0]) / 2, ty = (p[0][1] + p[Math.floor(p.length / 2)][1]) / 2;
    for (const j of zIdx) {
      if (i === j) continue; const a = ok[i], b = ok[j];
      if (a.x0 < b.x0 - 1e-6 || a.y0 < b.y0 - 1e-6 || a.x1 > b.x1 + 1e-6 || a.y1 > b.y1 + 1e-6) continue;
      if ((b.x1 - b.x0) * (b.y1 - b.y0) <= (a.x1 - a.x0) * (a.y1 - a.y0) + 1e-9) continue;
      if (uPoligonu(objekti[j].pts, p[0][0], p[0][1]) || uPoligonu(objekti[j].pts, tx, ty)) { djeca[j]++; roditelji[i].push(j); }
    }
  }
  const gotov = new Array(n).fill(false), red = [];
  let poz = start;
  for (let k = 0; k < n; k++) {
    let bi = -1, bd = Infinity, bj = 0, brev = false;
    for (let i = 0; i < n; i++) {
      if (gotov[i] || djeca[i] > 0) continue;
      const p = objekti[i].pts;
      if (zatv[i]) {
        const korak = Math.max(1, Math.floor(p.length / 400));
        for (let j = 0; j < p.length - 1; j += korak) { const d = (p[j][0] - poz[0]) ** 2 + (p[j][1] - poz[1]) ** 2; if (d < bd) { bd = d; bi = i; bj = j; brev = false; } }
      } else {
        const d0 = (p[0][0] - poz[0]) ** 2 + (p[0][1] - poz[1]) ** 2, d1 = (p[p.length - 1][0] - poz[0]) ** 2 + (p[p.length - 1][1] - poz[1]) ** 2;
        if (d0 < bd) { bd = d0; bi = i; bj = 0; brev = false; } if (d1 < bd) { bd = d1; bi = i; bj = 0; brev = true; }
      }
    }
    if (bi < 0) { // ciklus (ne bi trebao) — uzmi prvi preostali
      bi = gotov.findIndex(g => !g); bj = 0; brev = false;
    }
    gotov[bi] = true; for (const r of roditelji[bi]) djeca[r]--;
    let p = objekti[bi].pts;
    if (zatv[bi]) { const z = p.slice(0, -1); p = [...z.slice(bj), ...z.slice(0, bj), z[bj]]; } else if (brev) p = p.slice().reverse();
    red.push({ o: objekti[bi], pts: p, zatv: zatv[bi] });
    poz = p[p.length - 1];
  }
  return red;
}
function produziPreklop(pts, prek) { // Overlap: nastavi rezati preko početka zatvorenog obrisa
  if (!(prek > 0)) return pts;
  const out = pts.slice(); let ost = prek;
  for (let i = 1; i < pts.length && ost > 0; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0);
    if (l >= ost) { out.push([x0 + (x1 - x0) * ost / l, y0 + (y1 - y0) * ost / l]); ost = 0; } else { out.push([x1, y1]); ost -= l; }
  }
  return out;
}

// ── graviranje: retci (scanline, even-odd) ─────────────────────────────
function retciGravure(objekti, razmak) {
  const zat = objekti.filter(o => o.zatv);
  if (!zat.length) return [];
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (const o of zat) { const b = okvir(o.pts); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); }
  const korak = Math.max(razmak, (y1 - y0) / 3000);
  const retci = [];
  for (let y = y1 - korak / 2; y > y0; y -= korak) {
    const xs = [];
    for (const o of zat) { const p = o.pts; for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1]; if ((ay > y) !== (by > y)) xs.push(ax + (bx - ax) * (y - ay) / (by - ay)); } }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    const iv = []; for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 1e-6) iv.push([xs[i], xs[i + 1]]);
    if (iv.length) retci.push({ y, iv, xa: iv[0][0], xb: iv[iv.length - 1][1] });
  }
  return { retci, korak, x0, x1 };
}

// ── glavni proračun: od slojeva do vremenske crte ──────────────────────
// Slojevi se izvode od DNA popisa prema vrhu (upute LaserCut 5.3, pogl. 5.1).
export function izracunaj(objekti, slojevi, wt, opcije = {}) {
  const pomak = opcije.pomak || [0, 0];
  const start = opcije.start || [wt.xRange, wt.yRange];
  const koraci = []; let poz = start.slice();
  const st = { rez: 0, prazno: 0, tRez: 0, tPrazno: 0, tGrav: 0, poSloju: [], upozorenja: [] };
  const red = slojevi.map((s, i) => [s, i]).filter(([s]) => s.izlaz).reverse();
  for (const [s, si] of red) {
    const ob = objekti.filter(o => o.aci === s.aci).map(o => ({ ...o, pts: o.pts.map(([x, y]) => [x + pomak[0], y + pomak[1]]) }));
    if (!ob.length) continue;
    const ss = { sloj: si, aci: s.aci, mod: s.mod, rez: 0, t: 0 };
    const t0 = koraci.reduce((a, k) => a + k.t, 0);
    for (let prolaz = 0; prolaz < Math.max(1, s.n | 0); prolaz++) {
      if (s.mod === 'Cut') {
        for (const r of poredaj(ob, poz)) {
          const pts = r.zatv ? produziPreklop(r.pts, s.prek) : r.pts;
          const h = prazanHod(poz[0], poz[1], pts[0][0], pts[0][1], wt); if (h) { koraci.push(h); st.prazno += h.L; st.tPrazno += h.t; }
          const pl = planLinije(pts, s.v, wt, { laser: 1, p: s.p, kp: s.kp, vRez: s.v, sloj: si, aci: s.aci });
          for (const k of pl) { koraci.push(k); st.rez += k.L; ss.rez += k.L; st.tRez += k.t; }
          poz = pts[pts.length - 1];
        }
      } else if (s.mod === 'Engrave' || s.mod === 'GradeEngrave') {
        const g = retciGravure(ob, s.razmak);
        if (!g.retci) { st.upozorenja.push(`Sloj ${imeBoje(s.aci)} (${s.mod}): nema zatvorenih obrisa — graviranje ispunjava samo zatvorene oblike (spoji linije).`); continue; }
        const ov = s.v * s.v / (2 * wt.gravAcc);
        let lijevo = true;
        for (const r of g.retci) {
          const xa = r.xa - ov, xb = r.xb + ov;
          const [xs, xe] = (lijevo || !s.bidir) ? [xa, xb] : [xb, xa];
          const h = prazanHod(poz[0], poz[1], xs, r.y, wt); if (h) { koraci.push(h); st.prazno += h.L; st.tPrazno += h.t; }
          const L = Math.abs(xe - xs);
          const pr = profil(L, wt.gravStart, wt.gravStart, s.v, wt.gravAcc);
          const sm = Math.sign(xe - xs);
          const iv = r.iv.map(([a, b]) => sm > 0 ? [a - xs, b - xs] : [xs - b, xs - a]).sort((p, q) => p[0] - q[0]);
          koraci.push(Object.assign(pr, { x0: xs, y0: r.y, x1: xe, y1: r.y, laser: 2, iv, p: s.p, kp: s.mod === 'GradeEngrave' ? s.minP : s.p, sloj: si, aci: s.aci, sirina: g.korak }));
          st.tGrav += pr.t; ss.rez += r.iv.reduce((a, [p, q]) => a + q - p, 0);
          poz = [xe, r.y];
          if (s.bidir) lijevo = !lijevo;
        }
      } else if (s.mod === 'Hole') {
        for (const r of poredaj(ob.filter(o => o.zatv), poz)) {
          const b = okvir(r.pts), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
          const h = prazanHod(poz[0], poz[1], c[0], c[1], wt); if (h) { koraci.push(h); st.prazno += h.L; st.tPrazno += h.t; }
          koraci.push({ L: 0, t: s.zracenje, vin: 0, vout: 0, vp: 0, a: 0, t1: 0, t2: 0, t3: 0, d1: 0, d2: 0, x0: c[0], y0: c[1], x1: c[0], y1: c[1], laser: 3, p: s.p, kp: s.p, sloj: si, aci: s.aci });
          poz = c;
        }
      }
    }
    ss.t = koraci.reduce((a, k) => a + k.t, 0) - t0;
    st.poSloju.push(ss);
  }
  // povratak na ishodište (stop point)
  const kraj = opcije.kraj || start;
  const h = prazanHod(poz[0], poz[1], kraj[0], kraj[1], wt); if (h) { koraci.push(h); st.prazno += h.L; st.tPrazno += h.t; }
  let t = 0; for (const k of koraci) { k.t0 = t; t += k.t; }
  st.ukupno = t;
  let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
  for (const k of koraci) if (k.laser) { gx0 = Math.min(gx0, k.x0, k.x1); gy0 = Math.min(gy0, k.y0, k.y1); gx1 = Math.max(gx1, k.x0, k.x1); gy1 = Math.max(gy1, k.y0, k.y1); }
  st.okvir = isFinite(gx0) ? { x0: gx0, y0: gy0, x1: gx1, y1: gy1 } : null;
  return { koraci, st };
}

// stanje glave u trenutku t: položaj, brzina, laser, snaga
export function stanjeU(posao, t) {
  const K = posao.koraci; if (!K.length) return null;
  let lo = 0, hi = K.length - 1;
  if (t >= K[hi].t0 + K[hi].t) { const k = K[hi]; return { i: hi, x: k.x1, y: k.y1, v: 0, laser: false, snaga: 0, s: k.L, k }; }
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (K[m].t0 <= t) lo = m; else hi = m - 1; }
  const k = K[lo];
  const [s, v] = putUVremenu(k, t - k.t0);
  const f = k.L > 0 ? s / k.L : 1;
  const x = k.x0 + (k.x1 - k.x0) * f, y = k.y0 + (k.y1 - k.y0) * f;
  let laser = false, snaga = 0;
  if (k.laser === 1) { laser = true; const vr = k.vRez || v; snaga = k.kp + (k.p - k.kp) * Math.min(1, v / Math.max(vr, 1e-6)); }
  else if (k.laser === 2) { for (const [a, b] of k.iv) if (s >= a && s <= b) { laser = true; break; } snaga = laser ? k.p : 0; }
  else if (k.laser === 3) { laser = true; snaga = k.p; }
  return { i: lo, x, y, v, laser, snaga, s, k };
}

// ── procjena prorezivanja (procjena! energija po duljini u odnosu na tvoje parametre) ──
export function prorez(sloj, mat, snagaStroja, fokusFaktor = 1) {
  if (!mat || sloj.mod !== 'Cut') return null;
  const E = snagaStroja * sloj.p / 100 / sloj.v * Math.max(1, sloj.n) * fokusFaktor; // J/mm
  const Eref = 60 * mat.p / 100 / mat.v; // referentno: tvoji parametri na 60 W (procjena — slabiji stroj)
  return E / Eref;
}

// ── leće: promjer žarišne točke i dubina fokusa (procjena, gaussov snop) ──
export function leca(f) {
  const lam = 10.6e-3, D = 7, M2 = 1.3; // mm, promjer snopa na leći (procjena), kvaliteta snopa
  const d0 = 4 * M2 * lam * f / (Math.PI * D);
  const zR = Math.PI * d0 * d0 / (4 * M2 * lam);
  return { d0, dof: 2 * zR };
}

export function vrijeme(s) {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return [h, m, x].map(v => String(v).padStart(2, '0')).join(':');
}
