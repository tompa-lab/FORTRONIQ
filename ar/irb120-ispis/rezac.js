// rezac.js — jednostavni rezač (slicer) za 3D ispis robotom i čitač G-koda (PrusaSlicer, Marlin).
// Ulaz: trokuti u mm (Float32Array, 9 brojeva po trokutu; z od 0 prema gore, model centriran u x, y).
// Izlaz: slojevi [{ z, h, puni, putevi: [{ tip: 'perimetar'|'vanjski'|'ispuna', t: [[x,y],...], zatvoren }] }].
// Pojednostavljeno u odnosu na pravi rezač: perimetri pomakom vrhova (miter), ispuna ravnim linijama ±45°,
// puni slojevi samo na dnu i vrhu modela (ne iznad unutarnjih prepusta), bez potpora i bez mosta.

const EPS = 1e-6;

// ---------- presjek ravninom z ----------
function presjek(P, z) {
  const seg = [], n = P.length / 9;
  for (let t = 0; t < n; t++) {
    const o = t * 9, v = [[P[o], P[o + 1], P[o + 2]], [P[o + 3], P[o + 4], P[o + 5]], [P[o + 6], P[o + 7], P[o + 8]]];
    const d = v.map(p => p[2] - z);
    const iznad = d.map(x => x > 0);
    const br = iznad.filter(Boolean).length;
    if (br === 0 || br === 3) continue;
    const pts = [];
    for (let k = 0; k < 3; k++) {
      const a = v[k], b = v[(k + 1) % 3], da = d[k], db = d[(k + 1) % 3];
      if ((da > 0) !== (db > 0)) { const s = da / (da - db); pts.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]); }
    }
    if (pts.length === 2) {
      // smjer segmenta: normala trokuta prema van (desno od smjera kretanja je materijal izvana) — orijentacija se ionako popravlja kasnije
      seg.push(pts[0], pts[1]);
    }
  }
  return seg;
}
function kljuc(p) { return Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4); }
function ulancaj(seg) {
  const mapa = new Map(), n = seg.length / 2, kor = new Uint8Array(n);
  const dodaj = (k, i) => { if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(i); };
  for (let i = 0; i < n; i++) { dodaj(kljuc(seg[2 * i]), i); dodaj(kljuc(seg[2 * i + 1]), i); }
  const petlje = [];
  for (let s = 0; s < n; s++) {
    if (kor[s]) continue;
    kor[s] = 1; const L = [seg[2 * s], seg[2 * s + 1]];
    let kraj = seg[2 * s + 1], start = kljuc(seg[2 * s]);
    for (let g = 0; g < n; g++) {
      const k = kljuc(kraj); if (k === start) break;
      const kand = (mapa.get(k) || []).find(i => !kor[i]); if (kand == null) break;
      kor[kand] = 1;
      const a = seg[2 * kand], b = seg[2 * kand + 1];
      kraj = kljuc(a) === k ? b : a; L.push(kraj);
    }
    if (L.length >= 4 && kljuc(L[L.length - 1]) === start) { L.pop(); petlje.push(L); }
  }
  return petlje;
}
export function povrsina(L) { let a = 0; for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function unutra(pt, L) {
  let c = false;
  for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
    const a = L[i], b = L[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function pojednostavi(L, tol) {           // uklanja gotovo kolinearne i vrlo bliske vrhove zatvorene petlje
  if (L.length < 4) return L;
  let out = L.slice(), prom = true;
  while (prom && out.length > 3) {
    prom = false;
    for (let i = 0; i < out.length && out.length > 3; i++) {
      const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const abx = c[0] - a[0], aby = c[1] - a[1], l = Math.hypot(abx, aby) || 1;
      const dist = Math.abs((b[0] - a[0]) * aby - (b[1] - a[1]) * abx) / l;
      if (dist < tol || Math.hypot(b[0] - a[0], b[1] - a[1]) < tol) { out.splice(i, 1); i--; prom = true; }
    }
  }
  return out;
}
// petlje s ispravnom orijentacijom: vanjske suprotno od kazaljke (CCW, materijal lijevo), rupe u smjeru kazaljke
function orijentiraj(petlje) {
  return petlje.map((L, i) => {
    let dub = 0; for (let j = 0; j < petlje.length; j++) if (j !== i && unutra(L[0], petlje[j])) dub++;
    const ccw = povrsina(L) > 0, treba = dub % 2 === 0;
    return { t: ccw === treba ? L : L.slice().reverse(), rupa: !treba };
  });
}
// pomak petlje ulijevo (u materijal) za d; vraća null ako se petlja uruši
function pomakni(L, d) {
  const n = L.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = L[(i - 1 + n) % n], b = L[i], c = L[(i + 1) % n];
    let e1 = [b[0] - a[0], b[1] - a[1]], e2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
    e1 = [e1[0] / l1, e1[1] / l1]; e2 = [e2[0] / l2, e2[1] / l2];
    const n1 = [-e1[1], e1[0]], n2 = [-e2[1], e2[0]];
    let m = [n1[0] + n2[0], n1[1] + n2[1]]; const lm = Math.hypot(...m);
    if (lm < 1e-9) m = n1; else m = [m[0] / lm, m[1] / lm];
    const cos = Math.max(0.35, m[0] * n1[0] + m[1] * n1[1]);   // ograniči šiljak
    out.push([b[0] + m[0] * d / cos, b[1] + m[1] * d / cos]);
  }
  const a0 = povrsina(L), a1 = povrsina(out);
  if (Math.sign(a0) !== Math.sign(a1) || Math.abs(a1) < Math.abs(d) * 2) return null;
  // vanjska se petlja pri pomaku unutra smanjuje, rupa se povećava (po apsolutnoj površini)
  if (a0 > 0 && a1 > a0) return null;
  if (a0 < 0 && a1 < a0 && Math.abs(a1) > Math.abs(a0) * 50) return null;
  return out;
}
function rotiraj(p, c, s) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
// ravne linije ispune unutar skupa petlji (pravilo par-nepar), razmak r, kut a (rad)
function ispuna(petlje, r, a) {
  const c = Math.cos(-a), s = Math.sin(-a);
  const R = petlje.map(L => L.map(p => rotiraj(p, c, s)));
  let y0 = Infinity, y1 = -Infinity; R.forEach(L => L.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }));
  const linije = []; let smjer = 0;
  for (let y = Math.ceil(y0 / r) * r + r * 0.5; y < y1; y += r) {
    const xs = [];
    R.forEach(L => { for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; if ((p[1] > y) !== (q[1] > y)) xs.push(p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1])); } });
    xs.sort((u, v) => u - v);
    const dio = [];
    for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] - xs[k] > r * 0.3) dio.push([xs[k], xs[k + 1]]);
    if (smjer) dio.reverse();
    for (const [xa, xb] of dio) {
      const pa = rotiraj(smjer ? [xb, y] : [xa, y], Math.cos(a), Math.sin(a)), pb = rotiraj(smjer ? [xa, y] : [xb, y], Math.cos(a), Math.sin(a));
      linije.push([pa, pb]);
    }
    smjer ^= 1;
  }
  return linije;
}
// poredaj otvorene putove (linije ispune) najbližim susjedom, od točke start
function poredajLinije(linije, start) {
  const out = [], kor = new Uint8Array(linije.length); let p = start;
  for (let n = 0; n < linije.length; n++) {
    let best = -1, bd = Infinity, obrni = false;
    for (let i = 0; i < linije.length; i++) {
      if (kor[i]) continue;
      const [a, b] = linije[i], da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
      if (da < bd) { bd = da; best = i; obrni = false; } if (db < bd) { bd = db; best = i; obrni = true; }
    }
    kor[best] = 1; const L = obrni ? [linije[best][1], linije[best][0]] : linije[best]; out.push(L); p = L[1];
  }
  return out;
}

export function rezi(P, opc) {
  const h = opc.h || 0.2, h1 = opc.h1 || h, w = opc.w || 0.45, np = Math.max(1, opc.perimetri ?? 2);
  const gust = Math.max(0, Math.min(100, opc.ispuna ?? 15)) / 100, pd = opc.puniDolje ?? 3, pg = opc.puniGore ?? 3;
  let zmax = 0; for (let i = 2; i < P.length; i += 3) zmax = Math.max(zmax, P[i]);
  const slojevi = []; let z = h1, i = 0;
  const N = Math.max(1, Math.floor((zmax - h1) / h + 1e-6) + 1);
  for (; i < N; i++) {
    z = h1 + i * h; const zr = Math.min(zmax - 1e-3, z - (i ? h : h1) / 2);
    const petlje = ulancaj(presjek(P, zr)).map(L => pojednostavi(L, 0.02)).filter(L => L.length >= 3 && Math.abs(povrsina(L)) > w * w);
    const or = orijentiraj(petlje);
    const putevi = []; let unutarnje = [];
    or.forEach(({ t: L, rupa }) => {
      const per = [];
      for (let k = 0; k < np; k++) { const o = pomakni(L, w * (k + 0.5)); if (!o) break; per.push(o); }
      // vanjski perimetar zadnji (bolja površina), unutarnji prvi
      per.reverse().forEach((o, k) => putevi.push({ tip: k === per.length - 1 ? 'vanjski' : 'perimetar', t: o, zatvoren: true, rupa }));
      const un = pomakni(L, w * (np - 0.15)); if (un) unutarnje.push(un);
    });
    const puni = i < pd || i >= N - pg;
    const r = puni ? w : (gust > 0.001 ? w / gust : 0);
    if (r > 0 && unutarnje.length) {
      const kut = (puni ? (i % 2 ? 45 : -45) : (i % 2 ? 45 : -45)) * Math.PI / 180;
      const start = putevi.length ? putevi[putevi.length - 1].t[0] : [0, 0];
      poredajLinije(ispuna(unutarnje, r, kut), start).forEach(l => putevi.push({ tip: 'ispuna', t: l, zatvoren: false }));
    }
    slojevi.push({ z: +z.toFixed(4), h: i ? h : h1, puni, putevi });
  }
  return { slojevi, visina: zmax };
}

// ---------- čitač G-koda (FDM) ----------
export function citajGkod(tekst) {
  let abs = true, absE = true, x = 0, y = 0, z = 0, e = 0, F = 1200;
  const slojevi = new Map(); let put = null, zad = null, nPom = 0, nIzv = 0;
  const kraj = () => { if (put && put.t.length > 1) { if (!slojevi.has(put.z)) slojevi.set(put.z, []); slojevi.get(put.z).push(put); } put = null; };
  for (const red0 of tekst.split(/\r?\n/)) {
    const red = red0.split(';')[0].trim().toUpperCase(); if (!red) continue;
    const r = {}; red.replace(/([A-Z])([-+]?[\d.]+)/g, (_, k, v) => { if (!(k in r)) r[k] = +v; return ''; });
    const kod = red.match(/^[GM]\d+/)?.[0];
    if (kod === 'G90') abs = true; else if (kod === 'G91') abs = false;
    else if (kod === 'M82') absE = true; else if (kod === 'M83') absE = false;
    else if (kod === 'G92') { if ('E' in r) e = r.E; if ('X' in r) x = r.X; if ('Y' in r) y = r.Y; if ('Z' in r) z = r.Z; }
    else if (kod === 'G0' || kod === 'G1') {
      nPom++;
      const nx = 'X' in r ? (abs ? r.X : x + r.X) : x, ny = 'Y' in r ? (abs ? r.Y : y + r.Y) : y, nz = 'Z' in r ? (abs ? r.Z : z + r.Z) : z;
      let de = 0; if ('E' in r) { de = absE ? r.E - e : r.E; e = absE ? r.E : e + r.E; }
      if ('F' in r) F = r.F;
      const pomak = Math.hypot(nx - x, ny - y) > 1e-6;
      if (de > 1e-6 && pomak) {
        const zk = +nz.toFixed(3);
        if (!put || put.z !== zk || zad !== kljuc([x, y])) { kraj(); put = { z: zk, tip: 'gkod', t: [[x, y]], zatvoren: false, F }; }
        put.t.push([nx, ny]); nIzv++; zad = kljuc([nx, ny]);
      } else if (pomak || Math.abs(nz - z) > 1e-6) { kraj(); zad = null; }
      x = nx; y = ny; z = nz;
    }
  }
  kraj();
  const zs = [...slojevi.keys()].sort((a, b) => a - b);
  let zp = 0;
  const out = zs.map(zz => { const s = { z: zz, h: +(zz - zp).toFixed(4), puni: false, putevi: slojevi.get(zz) }; zp = zz; return s; });
  return { slojevi: out, visina: zs.length ? zs[zs.length - 1] : 0, pomaka: nPom, izvlacenja: nIzv };
}
export function okvirSlojeva(slojevi) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  slojevi.forEach(s => s.putevi.forEach(p => p.t.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); })));
  return [x0, y0, x1, y1];
}
