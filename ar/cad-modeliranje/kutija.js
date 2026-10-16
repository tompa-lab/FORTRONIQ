// FORTRONIQ · CAD modeliranje · Sheet Metal · kartonska kutija za sat (samozaključna, tip „pizza")
// Geometrija razvijenog oblika (Flat-Pattern), pregibi, rezovi, DXF R12.
// Koordinate u mm, ishodište u donjem lijevom kutu dna, x udesno, y prema prednjoj stijenci.
// Uzor: Tomislavova kutija 265 × 265 × 50 (SolidWorks Sheet Metal → DXF → LaserCut 5.3).

export const ZADANO = {
  L: 265, D: 265, H: 50,      // dno i visina po pregibima (kao u DXF-u)
  T: 3,                       // debljina kartona
  K: 0.5, R: 0.5,             // K-faktor i unutarnji polumjer savijanja (za usporedbu s SolidWorksom)
  perfRez: 15, perfMost: 15,  // perforacija pregiba: rez / most
  prozor: 200,                // promjer prozora u poklopcu (0 = bez prozora)
  usi: 100,                   // duljina ušiju (najviše 0,38 L)
  preklopi: true,             // bočni preklopi poklopca
  drzaci: 2,                  // broj držača (izrezuju se unutar prozora)
  sat: 250, satDeb: 5         // promjer i debljina sata (za 3D)
};

const r2 = v => Math.round(v * 1000) / 1000;
const klamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── pomoćne: zaobljeni kut kao niz točaka ─────────────────────────────
function luk(cx, cy, r, a0, a1, n) {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}
const PI = Math.PI;

// pravokutnik sa zaobljenim kutovima (kutovi: dl, dd, gd, gl = donji lijevi, donji desni, gornji desni, gornji lijevi)
function pravokutnik(x0, y0, x1, y1, r = 0, kutovi = '') {
  const p = [];
  const k = c => kutovi.includes(c) && r > 0;
  if (k('dl')) p.push(...luk(x0 + r, y0 + r, r, PI, 1.5 * PI, 6)); else p.push([x0, y0]);
  if (k('dd')) p.push(...luk(x1 - r, y0 + r, r, 1.5 * PI, 2 * PI, 6)); else p.push([x1, y0]);
  if (k('gd')) p.push(...luk(x1 - r, y1 - r, r, 0, 0.5 * PI, 6)); else p.push([x1, y1]);
  if (k('gl')) p.push(...luk(x0 + r, y1 - r, r, 0.5 * PI, PI, 6)); else p.push([x0, y1]);
  return p;
}
function zrcali(p, L) { return p.map(([x, y]) => [L - x, y]).reverse(); }
function pomakni(p, dx, dy) { return p.map(([x, y]) => [x + dx, y + dy]); }

// izvađeni („inner") bridovi: popis segmenata koji su unutarnji rez
// Svaki dio: { ime, poly, rupe:[poly], unutarnji:[[a,b],...], roditelj, sarka:[a,b], kut, oznaka }

export function izracun(p) {
  const P = Object.assign({}, ZADANO, p || {});
  const { L, D, H, T } = P;
  const t3 = T / 3;
  const W2 = H - t3;                 // unutarnji bočni sloj
  const F1 = H + t3, F2 = H - t3;    // prednja stijenka i njen unutarnji sloj
  const B = H + t3;                  // stražnja stijenka (šarka poklopca)
  const Dl = D - t3;                 // dubina poklopca
  const Tk = H - 4 * t3;             // preklop poklopca
  const zak = 0.8 * T;               // uvlačenje unutarnjeg bočnog sloja
  const rz = Math.min(10, H / 5);    // zaobljenja
  const jez = 2 * T;                 // visina jezička
  const jezS = v => klamp(0.19 * v, 20, 50);   // širina jezička prema duljini stijenke
  const utorOd = 2 * t3;             // utor od pregiba
  const e = Math.min(P.usi, 0.38 * L, 0.38 * D);
  const wf = P.preklopi ? 0.4 * H : 0; // širina bočnog preklopa poklopca
  const ins2 = 10 / 3 * T;           // uvlačenje unutarnjeg prednjeg sloja
  const bravaS = 48, bravaV = 20, bravaR = 5; // jezičac brave (širina, pola visine, zaobljenje)
  const prorezS = 50, prorezD = 2;   // prorez za bravu na pregibu poklopca (pola dubine)
  const xT0 = 3 * T + 1, xT1 = L - 3 * T - 1; // preklop stane između dvostrukih bočnih stijenki i ušiju

  const dijelovi = [];
  const pregibi = []; // {a:[x,y], b:[x,y], dio}
  const rezUnutra = []; // dodatni unutarnji rezovi (prorezi brave) [a,b]

  // ── dno ──
  const tsB = jezS(D), tsF = jezS(L);
  const rupeDno = [];
  for (const c of [D / 4, 3 * D / 4]) {
    rupeDno.push(pravokutnik(utorOd, c - tsB / 2 - 1, utorOd + T, c + tsB / 2 + 1));
    rupeDno.push(pravokutnik(L - utorOd - T, c - tsB / 2 - 1, L - utorOd, c + tsB / 2 + 1));
  }
  for (const c of [L / 4, 3 * L / 4]) rupeDno.push(pravokutnik(c - tsF / 2 - 1, D - utorOd - T, c + tsF / 2 + 1, D - utorOd));
  dijelovi.push({ ime: 'dno', naziv: 'Dno', poly: pravokutnik(0, 0, L, D), rupe: rupeDno, roditelj: null, znacajka: 'base' });

  // ── bočne stijenke (lijevo, desno zrcalno) ──
  function bocna(strana) {
    const s = strana === 'L' ? 1 : -1, X = x => strana === 'L' ? x : L - x;
    const ime = strana === 'L' ? 'lijeva' : 'desna';
    // vanjski sloj W1
    let w1 = pravokutnik(-H, 0, 0, D);
    if (strana === 'D') w1 = zrcali(w1, L);
    dijelovi.push({ ime: 'w1' + strana, naziv: (strana === 'L' ? 'Lijeva' : 'Desna') + ' bočna stijenka', poly: w1, rupe: [], roditelj: 'dno', sarka: [[X(0), 0], [X(0), D]], kut: 90, znacajka: 'edge1' });
    // unutarnji sloj W2 s jezičcima
    const x0 = -H - W2, y0 = zak, y1 = D - zak;
    const tocke = [];
    tocke.push([-H, y0]);
    tocke.push([-H, y1]);
    tocke.push(...luk(x0 + rz, y1 - rz, rz, 0.5 * PI, PI, 6));
    // rub x0 od gore prema dolje s jezičcima
    for (const c of [3 * D / 4, D / 4]) {
      tocke.push([x0, c + tsB / 2]); tocke.push([x0 - jez, c + tsB / 2]); tocke.push([x0 - jez, c - tsB / 2]); tocke.push([x0, c - tsB / 2]);
    }
    tocke.push(...luk(x0 + rz, y0 + rz, rz, PI, 1.5 * PI, 6));
    let w2 = tocke.slice().reverse(); // CCW
    if (strana === 'D') w2 = zrcali(w2, L);
    dijelovi.push({ ime: 'w2' + strana, naziv: 'Unutarnji sloj, ' + ime + ' (porub)', poly: w2, rupe: [], roditelj: 'w1' + strana, sarka: [[X(-H), y0], [X(-H), y1]], kut: 180, znacajka: 'hem1' });
    // uši
    const ux0 = -H + 2 * t3, ux1 = -t3;
    let up = pravokutnik(ux0, D, ux1, D + e, rz, 'gdgl');
    if (strana === 'D') up = zrcali(up, L);
    dijelovi.push({ ime: 'up' + strana, naziv: 'Prednje uho, ' + ime, poly: up, rupe: [], roditelj: 'w1' + strana, sarka: [[X(ux0), D], [X(ux1), D]], kut: 90, znacajka: 'usi' });
    // stražnje uho (suženo uz bočni preklop poklopca)
    const yb = -B;
    const uz = wf > 0 ? -wf - t3 : ux1;
    let us;
    if (e > B && wf > 0) {
      us = [[ux1, 0], [ux0, 0], ...luk(ux0 + rz, -e + rz, rz, PI, 1.5 * PI, 6), ...luk(uz - rz, -e + rz, rz, 1.5 * PI, 2 * PI, 6), [uz, yb], [ux1, yb]];
    } else {
      us = pravokutnik(ux0, -e, ux1, 0, rz, 'dldd');
    }
    if (povrsina(us) < 0) us.reverse();
    if (strana === 'D') us = zrcali(us, L);
    dijelovi.push({ ime: 'us' + strana, naziv: 'Stražnje uho, ' + ime, poly: us, rupe: [], roditelj: 'w1' + strana, sarka: [[X(ux0), 0], [X(ux1), 0]], kut: 90, znacajka: 'usi' });
  }
  bocna('L'); bocna('D');

  // ── prednja stijenka F1 s jezičcem brave ──
  const yF = D + F1;
  const bx0 = L / 2 - bravaS / 2, bx1 = L / 2 + bravaS / 2;
  const f1 = [[0, D], [L, D], [L, yF], [bx1, yF], ...luk(bx1 - bravaR, yF + bravaV - bravaR, bravaR, 0, 0.5 * PI, 4), ...luk(bx0 + bravaR, yF + bravaV - bravaR, bravaR, 0.5 * PI, PI, 4), [bx0, yF], [0, yF]];
  dijelovi.push({ ime: 'f1', naziv: 'Prednja stijenka', poly: f1, rupe: [], roditelj: 'dno', sarka: [[0, D], [L, D]], kut: 90, znacajka: 'edge2' });
  rezUnutra.push([[bx0, yF - bravaV], [bx0, yF]], [[bx1, yF - bravaV], [bx1, yF]]);
  // unutarnji prednji sloj F2 (s izrezom za jezičac i jezičcima za utore)
  const yF2 = yF + F2;
  const f2 = [];
  f2.push([ins2, yF], [bx0, yF], [bx0, yF + bravaV - bravaR], ...luk(bx0 + bravaR, yF + bravaV - bravaR, bravaR, PI, 0.5 * PI, 4), ...luk(bx1 - bravaR, yF + bravaV - bravaR, bravaR, 0.5 * PI, 0, 4), [bx1, yF + bravaV - bravaR], [bx1, yF], [L - ins2, yF]);
  f2.push(...luk(L - ins2 - rz, yF2 - rz, rz, 0, 0.5 * PI, 6));
  for (const c of [3 * L / 4, L / 4]) { f2.push([c + tsF / 2, yF2], [c + tsF / 2, yF2 + jez], [c - tsF / 2, yF2 + jez], [c - tsF / 2, yF2]); }
  f2.push(...luk(ins2 + rz, yF2 - rz, rz, 0.5 * PI, PI, 6));
  dijelovi.push({ ime: 'f2', naziv: 'Unutarnji sloj prednje stijenke (porub)', poly: f2, rupe: [], roditelj: 'f1', sarka: [[ins2, yF], [L - ins2, yF]], kut: 180, znacajka: 'hem2', bezPregiba: [[bx0, bx1]] });

  // ── stražnja stijenka i poklopac ──
  dijelovi.push({ ime: 'b', naziv: 'Stražnja stijenka', poly: pravokutnik(0, -B, L, 0), rupe: [], roditelj: 'dno', sarka: [[0, 0], [L, 0]], kut: 90, znacajka: 'edge2' });
  const yP0 = -B, yP1 = -B - Dl; // poklopac od yP0 prema dolje do yP1
  const px0 = L / 2 - prorezS / 2, px1 = L / 2 + prorezS / 2;
  const pok = [[0, yP1], [px0, yP1], [px0, yP1 + prorezD], [px1, yP1 + prorezD], [px1, yP1], [L, yP1], [L, yP0], [0, yP0]];
  const rupeP = [];
  const prozor = P.prozor > 0 ? { cx: L / 2, cy: (yP0 + yP1) / 2, r: Math.min(P.prozor, 0.9 * Math.min(L, Dl)) / 2 } : null;
  dijelovi.push({ ime: 'pok', naziv: 'Poklopac', poly: pok, rupe: rupeP, krug: prozor, roditelj: 'b', sarka: [[0, yP0], [L, yP0]], kut: 90, znacajka: 'edge3' });
  if (wf > 0) {
    const d = T;
    for (const strana of ['L', 'D']) {
      let pp = [[0, yP1 + d], [0, yP0 - d], [-wf, yP0 - d - wf], [-wf, yP1 + d + wf]];
      if (povrsina(pp) < 0) pp.reverse();
      if (strana === 'D') pp = zrcali(pp, L);
      const X = x => strana === 'L' ? x : L - x;
      dijelovi.push({ ime: 'pp' + strana, naziv: 'Bočni preklop poklopca', poly: pp, rupe: [], roditelj: 'pok', sarka: [[X(0), yP1 + d], [X(0), yP0 - d]], kut: 90, znacajka: 'edge4' });
    }
  }
  const yT = yP1 - Tk;
  const tuck = [...luk(xT0 + rz, yT + rz, rz, PI, 1.5 * PI, 6), ...luk(xT1 - rz, yT + rz, rz, 1.5 * PI, 2 * PI, 6), [xT1, yP1], [px1, yP1], [px1, yP1 - prorezD], [px0, yP1 - prorezD], [px0, yP1], [xT0, yP1]];
  dijelovi.push({ ime: 'tk', naziv: 'Preklop poklopca (ulazi iza prednje stijenke)', poly: tuck, rupe: [], roditelj: 'pok', sarka: [[xT0, yP1], [xT1, yP1]], kut: 90, znacajka: 'edge4', bezPregiba: [[px0, px1]] });

  // smjer svih vanjskih obrisa CCW
  for (const d of dijelovi) { if (povrsina(d.poly) < 0) d.poly.reverse(); d.rupe = d.rupe.map(h => povrsina(h) > 0 ? h.slice().reverse() : h); }

  // ── držači (izrezuju se iz kruga prozora) ──
  const drzaci = [];
  const hl = Math.min(100, 0.3 * L), hw = 0.48 * hl, hs = 0.75 * hl, hsw = 0.83 * T;
  if (P.drzaci > 0) {
    const n = P.drzaci;
    const cx = prozor ? prozor.cx : L + 2 * H + 20 + hl / 2;
    const cy0 = prozor ? prozor.cy : D / 2;
    const korak = hw + 8;
    for (let i = 0; i < n; i++) {
      const cy = cy0 + (i - (n - 1) / 2) * korak;
      const o = pravokutnik(cx - hl / 2, cy - hw / 2, cx + hl / 2, cy + hw / 2, Math.min(10, hw / 4), 'dlddgdgl');
      const pr = pravokutnik(cx - hs / 2, cy - hsw / 2, cx + hs / 2, cy + hsw / 2);
      drzaci.push({ poly: o, prorez: pr, cx, cy });
    }
    if (prozor) {
      const visina = n * korak;
      if (visina > prozor.r * 2 * 0.86 || hl > prozor.r * 2 * 0.86) { // ne stanu u prozor: pomakni desno od mreže
        drzaci.forEach((d, i) => { const dx = (L + 2 * H + 30 + hl / 2) - d.cx, dy = (D / 2 + (i - (n - 1) / 2) * korak) - d.cy; d.poly = pomakni(d.poly, dx, dy); d.prorez = pomakni(d.prorez, dx, dy); d.cx += dx; d.cy += dy; d.izvan = true; });
      }
    }
  }

  // ── pregibi: šarke dijelova minus zone bez pregiba ──
  for (const d of dijelovi) {
    if (!d.sarka) continue;
    const [a, b] = d.sarka;
    if (d.bezPregiba) {
      // šarka je vodoravna (y konst.)
      let xs = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
      let dijel = [xs];
      for (const [u0, u1] of d.bezPregiba) {
        const nova = [];
        for (const [s0, s1] of dijel) { if (u1 <= s0 || u0 >= s1) nova.push([s0, s1]); else { if (u0 > s0) nova.push([s0, u0]); if (u1 < s1) nova.push([u1, s1]); } }
        dijel = nova;
      }
      for (const [s0, s1] of dijel) pregibi.push({ a: [s0, a[1]], b: [s1, a[1]], dio: d.ime });
    } else pregibi.push({ a, b, dio: d.ime });
  }

  // ── rezovi: svi bridovi obrisa, bez pregiba, spojeni ──
  const segVanjski = [], segUnutra = [];
  for (const d of dijelovi) {
    zaBridove(d.poly, (a, b) => segVanjski.push([a, b]));
    for (const h of d.rupe) zaBridove(h, (a, b) => segUnutra.push([a, b]));
  }
  // F2 izrez oko jezička: bridovi F2 koji su zajednički s jezičcem F1 su unutarnji rez
  const rez = spojiRezove(segVanjski, pregibi);
  // razdvoji: brid je unutarnji ako s obje strane ima materijala (osim rupa)
  const kontura = [], unutra = [...segUnutra.map(s => ({ a: s[0], b: s[1] })), ...rezUnutra.map(s => ({ a: s[0], b: s[1] }))];
  for (const s of rez) {
    const mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
    const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * 0.4, ny = dx / l * 0.4;
    const u1 = uMaterijalu(dijelovi, mx + nx, my + ny), u2 = uMaterijalu(dijelovi, mx - nx, my - ny);
    const uProrezu = mx > px0 - 0.01 && mx < px1 + 0.01 && Math.abs(my - yP1) <= prorezD + 0.01;
    if ((u1 && u2) || uProrezu) unutra.push(s); else kontura.push(s);
  }
  const drzRez = [], drzProrez = [];
  for (const h of drzaci) { zaBridove(h.poly, (a, b) => drzRez.push({ a, b })); zaBridove(h.prorez, (a, b) => drzProrez.push({ a, b })); }

  // perforacija pregiba
  const perforacija = [];
  for (const g of pregibi) perforacija.push(...perforiraj(g.a, g.b, P.perfRez, P.perfMost));

  // granice
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  const sve = [...dijelovi.map(d => d.poly), ...drzaci.map(d => d.poly)];
  for (const pl of sve) for (const [x, y] of pl) { minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); }

  // duljine
  const dulj = arr => arr.reduce((s, q) => s + Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]), 0);
  const lProzor = prozor ? 2 * PI * prozor.r : 0;
  const duljine = {
    unutra: dulj(unutra) + dulj(drzProrez), drzaci: dulj(drzRez), prozor: lProzor,
    perforacija: dulj(perforacija), kontura: dulj(kontura),
    pregibi: pregibi.reduce((s, g) => s + Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]), 0)
  };

  // SolidWorks Sheet Metal: dodatak savijanja i odbitak (za usporedbu)
  const BA90 = PI / 2 * (P.R + P.K * T), OSSB = P.R + T, BD90 = 2 * OSSB - BA90;
  const BA180 = PI * (P.R + P.K * T);
  const unutarnje = { L: L - 4 * T, D: D - 3 * T, H: H - T };
  const vanjske = { L: L + 2 * T, D: D + 2 * T, H: H + T };
  const sw = { BA90, OSSB, BD90, BA180, dnoSW: vanjske.L - BD90, stijenkaSW: H - BD90 / 2 };

  return { P, dijelovi, pregibi, kontura, unutra, drzaci, drzRez, drzProrez, perforacija, prozor, granice: { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny }, duljine, unutarnje, vanjske, sw, mjere: { W2, F1, F2, B, Dl, Tk, e, wf, ins2, jez, tsB, tsF, hl, hw, hs, hsw, xT0, xT1, bx0, bx1, yF, yF2, yP0, yP1, yT } };
}

export function povrsina(p) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return s / 2; }
function zaBridove(p, f) { for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-6) f(a, b); } }

export function uPoligonu(p, x, y) {
  let u = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) u = !u;
  }
  return u;
}
function uMaterijalu(dijelovi, x, y) {
  for (const d of dijelovi) {
    if (!uPoligonu(d.poly, x, y)) continue;
    if (d.rupe.some(h => uPoligonu(h, x, y))) continue;
    return true;
  }
  return false;
}

// spajanje kolinearnih bridova i oduzimanje pregiba
function kljucPravca(a, b) {
  let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  if (dx < -1e-9 || (Math.abs(dx) < 1e-9 && dy < 0)) { dx = -dx; dy = -dy; }
  const c = -dy * a[0] + dx * a[1]; // udaljenost pravca
  return { k: r2(dx).toFixed(3) + ',' + r2(dy).toFixed(3) + ',' + (Math.round(c * 100) / 100).toFixed(2), dx, dy };
}
function spojiRezove(seg, pregibi) {
  const grupe = new Map();
  const dodaj = (a, b, tip) => {
    const { k, dx, dy } = kljucPravca(a, b);
    let g = grupe.get(k); if (!g) { g = { dx, dy, o: a, rez: [], pre: [] }; grupe.set(k, g); }
    const t0 = (a[0] - g.o[0]) * g.dx + (a[1] - g.o[1]) * g.dy, t1 = (b[0] - g.o[0]) * g.dx + (b[1] - g.o[1]) * g.dy;
    g[tip].push([Math.min(t0, t1), Math.max(t0, t1)]);
  };
  for (const [a, b] of seg) dodaj(a, b, 'rez');
  for (const p of pregibi) dodaj(p.a, p.b, 'pre');
  const out = [];
  for (const g of grupe.values()) {
    if (!g.rez.length) continue;
    let iv = unija(g.rez);
    for (const [p0, p1] of unija(g.pre)) {
      const n = [];
      for (const [s0, s1] of iv) { if (p1 <= s0 + 1e-6 || p0 >= s1 - 1e-6) n.push([s0, s1]); else { if (p0 > s0 + 1e-6) n.push([s0, p0]); if (p1 < s1 - 1e-6) n.push([p1, s1]); } }
      iv = n;
    }
    for (const [s0, s1] of iv) if (s1 - s0 > 1e-4) out.push({ a: [g.o[0] + g.dx * s0, g.o[1] + g.dy * s0], b: [g.o[0] + g.dx * s1, g.o[1] + g.dy * s1] });
  }
  return out;
}
function unija(iv) {
  const s = iv.slice().sort((p, q) => p[0] - q[0]); const o = [];
  for (const [a, b] of s) { if (o.length && a <= o[o.length - 1][1] + 1e-6) o[o.length - 1][1] = Math.max(o[o.length - 1][1], b); else o.push([a, b]); }
  return o;
}
export function perforiraj(a, b, rez, most) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) return [];
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  let n = Math.floor((L - most) / (rez + most)); // most na oba kraja
  if (n < 1) { const r = L * 0.4; return [{ a: [a[0] + ux * (L - r) / 2, a[1] + uy * (L - r) / 2], b: [a[0] + ux * (L + r) / 2, a[1] + uy * (L + r) / 2] }]; }
  const ukupno = n * rez + (n - 1) * most, o = (L - ukupno) / 2, out = [];
  for (let i = 0; i < n; i++) { const s = o + i * (rez + most); out.push({ a: [a[0] + ux * s, a[1] + uy * s], b: [a[0] + ux * (s + rez), a[1] + uy * (s + rez)] }); }
  return out;
}

// ── redoslijed rezanja (kao na stroju): unutarnji → držači → prozor → perforacija → kontura ──
export function slojevi(k) {
  const krug = k.prozor ? [{ krug: k.prozor }] : [];
  return [
    { ime: 'UNUTARNJI', boja: 5, opis: 'utori, prorezi brave i držača', seg: [...k.unutra, ...k.drzProrez] },
    { ime: 'DRZACI', boja: 6, opis: 'obris držača (unutar prozora)', seg: k.drzRez },
    { ime: 'PROZOR', boja: 4, opis: 'krug prozora', seg: [], krugovi: krug },
    { ime: 'PERFORACIJA', boja: 3, opis: 'pregibi: rez / most', seg: k.perforacija },
    { ime: 'KONTURA', boja: 7, opis: 'vanjski obris, zadnji', seg: k.kontura }
  ];
}

// ── DXF R12 (LaserCut 5.3 čita LINE i CIRCLE; slojevi po bojama) ──
export function dxf(k, naslov = 'KUTIJA') {
  const g = k.granice, ox = -g.minx + 5, oy = -g.miny + 5;
  const sl = slojevi(k);
  const L = [];
  const w = (c, v) => { L.push(String(c)); L.push(String(v)); };
  w(0, 'SECTION'); w(2, 'HEADER'); w(9, '$ACADVER'); w(1, 'AC1009'); w(9, '$INSBASE'); w(10, '0.0'); w(20, '0.0'); w(30, '0.0');
  w(9, '$EXTMIN'); w(10, '0.0'); w(20, '0.0'); w(30, '0.0'); w(9, '$EXTMAX'); w(10, (g.w + 10).toFixed(3)); w(20, (g.h + 10).toFixed(3)); w(30, '0.0');
  w(0, 'ENDSEC');
  w(0, 'SECTION'); w(2, 'TABLES'); w(0, 'TABLE'); w(2, 'LAYER'); w(70, sl.length + 1);
  w(0, 'LAYER'); w(2, '0'); w(70, 0); w(62, 7); w(6, 'CONTINUOUS');
  for (const s of sl) { w(0, 'LAYER'); w(2, s.ime); w(70, 0); w(62, s.boja); w(6, 'CONTINUOUS'); }
  w(0, 'ENDTAB'); w(0, 'ENDSEC');
  w(0, 'SECTION'); w(2, 'ENTITIES');
  const f = v => v.toFixed(3);
  for (const s of sl) {
    for (const q of s.seg) { w(0, 'LINE'); w(8, s.ime); w(62, s.boja); w(10, f(q.a[0] + ox)); w(20, f(q.a[1] + oy)); w(30, '0.0'); w(11, f(q.b[0] + ox)); w(21, f(q.b[1] + oy)); w(31, '0.0'); }
    for (const c of (s.krugovi || [])) { w(0, 'CIRCLE'); w(8, s.ime); w(62, s.boja); w(10, f(c.krug.cx + ox)); w(20, f(c.krug.cy + oy)); w(30, '0.0'); w(40, f(c.krug.r)); }
  }
  w(0, 'ENDSEC'); w(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}

// ── putanja reza za animaciju lasera: lanac najbližih segmenata po slojevima ──
export function putanjaReza(k) {
  const sl = slojevi(k), koraci = [];
  let poz = [k.granice.minx, k.granice.miny];
  for (const [si, s] of sl.entries()) {
    const segs = s.seg.map(q => ({ a: q.a, b: q.b }));
    for (const c of (s.krugovi || [])) {
      const n = 96, pts = luk(c.krug.cx, c.krug.cy, c.krug.r, -PI / 2, 1.5 * PI, n);
      const lanac = []; for (let i = 0; i < n; i++) lanac.push({ a: pts[i], b: pts[i + 1] });
      koraci.push({ sloj: si, prazni: [poz, pts[0]], rez: lanac }); poz = pts[0];
    }
    const ostalo = segs.slice();
    while (ostalo.length) {
      let bi = 0, bd = 1e18, obrni = false;
      for (let i = 0; i < ostalo.length; i++) {
        const q = ostalo[i];
        const da = (q.a[0] - poz[0]) ** 2 + (q.a[1] - poz[1]) ** 2, db = (q.b[0] - poz[0]) ** 2 + (q.b[1] - poz[1]) ** 2;
        if (da < bd) { bd = da; bi = i; obrni = false; } if (db < bd) { bd = db; bi = i; obrni = true; }
      }
      let q = ostalo.splice(bi, 1)[0]; if (obrni) q = { a: q.b, b: q.a };
      // nastavi lanac dok se segmenti nadovezuju
      const lanac = [q];
      for (;;) {
        const kraj = lanac[lanac.length - 1].b;
        const j = ostalo.findIndex(z => Math.hypot(z.a[0] - kraj[0], z.a[1] - kraj[1]) < 0.01 || Math.hypot(z.b[0] - kraj[0], z.b[1] - kraj[1]) < 0.01);
        if (j < 0) break;
        let z = ostalo.splice(j, 1)[0]; if (Math.hypot(z.a[0] - kraj[0], z.a[1] - kraj[1]) >= 0.01) z = { a: z.b, b: z.a };
        lanac.push(z);
      }
      koraci.push({ sloj: si, prazni: [poz, lanac[0].a], rez: lanac });
      poz = lanac[lanac.length - 1].b;
    }
  }
  return { sl, koraci };
}
