// FORTRONIQ · CAD modeliranje · Sheet Metal · kartonska kutija za sat (samozaključna, tip „pizza")
// Geometrija razvijenog oblika (Flat-Pattern), pregibi, rezovi, DXF R12.
// Koordinate u mm, ishodište u donjem lijevom kutu dna, x udesno, y prema prednjoj stijenci.
// Uzor: Tomislavova kutija 265 × 265 × 50 (SolidWorks Sheet Metal → DXF → LaserCut 5.3).

export const ZADANO = {
  L: 264.6, D: 264.1, H: 50,  // dno po pregibima i visina (izvornik: pizzakutijamala7SW.DXF)
  T: 3,                       // debljina kartona
  K: 0.5, R: 0.5,             // K-faktor i unutarnji polumjer savijanja (za usporedbu s SolidWorksom)
  perfRez: 15, perfMost: 15,  // perforacija pregiba: rez / most (bridovi 20 mm na krajevima)
  prozor: 200,                // promjer prozora u poklopcu (0 = bez prozora)
  usi: 101,                   // duljina ušiju (prednje 101, stražnje 100)
  preklopi: true,             // bočni preklopi poklopca
  drzaci: 1,                  // broj držača (izrezuju se iz kruga prozora)
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

// Mjere i oblici prema izvorniku pizzakutijamala7SW.DXF (SolidWorks Sheet Metal, 265 × 265 × 50, karton 3 mm).
// Male mjere izvornika (2,5 mm skošenja, 1,66 mm do utora …) skaliraju se s debljinom kartona: k = T / 3.
export function izracun(p) {
  const P = Object.assign({}, ZADANO, p || {});
  const { L, D, H, T } = P;
  const k = T / 3;
  const W2 = H - k;                  // unutarnji bočni sloj (49)
  const F1 = H + 2 * k, F2 = H - k;  // prednja stijenka (52) i njen unutarnji sloj (49)
  const B = H + k;                   // stražnja stijenka = šarka poklopca (51)
  const Dl = D;                      // dubina poklopca (izvornik 264,0 uz D = 264,1)
  const Tk = H - 5 * k;              // prednji preklop poklopca (45)
  const rz = Math.min(10, H / 5);    // zaobljenja R10
  const jez = 2 * T;                 // visina jezička (6)
  const jezS = 50 * k, utorS = jezS + 2 * k; // jezičac 50, utor 52
  const utorBok = 0.553 * T, utorPr = 0.357 * T; // utor od pregiba: bok 1,66 / sprijeda 1,07
  const cB = [0.25086 * D, 0.75289 * D];          // središta bočnih jezičaca (66,3 / 198,9)
  const cBu = [0.25219 * D, 0.75289 * D];         // središta bočnih utora (66,6 / 198,9)
  const cF = [L / 4, 3 * L / 4];                  // prednji jezičci i utori
  const e = Math.min(P.usi, 0.4 * L, 0.4 * D);    // duljina prednjih ušiju (101)
  const eS = e - k;                               // stražnje uši (100)
  const ux0 = -H + 2.84 * k, ux1 = -0.76 * T;     // uho: od −47,2 do −2,3 (širina 45)
  const sk = 2.5 * k;                             // skošenje pri dnu uha i unutarnjeg sloja
  const wf = P.preklopi ? 0.4 * H : 0;            // bočni preklop poklopca (20)
  const skP = 5 * k;                              // skošenje bočnog preklopa (5)
  const bravaS = 48 * k, bravaV = 20 * k, bravaR = 5 * k; // jezičac brave 48 × 40, R5
  const prorezS = 50 * k, prorezD = 2 * k / 1;    // prorez brave 50 × 4 (po 2 mm s obje strane pregiba)
  const xT0 = 0, xT1 = L;                         // prednji preklop poklopca preko cijele širine

  const dijelovi = [];
  const pregibi = []; // {a, b, dio, perf:{s, rez, most, zabrane:[[t0,t1]], fiksno:[[t0,t1]]}}
  const rezUnutra = [];
  const dodatnaPerf = []; // pregibi bez savijanja u 3D (šarka jezička brave)

  // ── dno s utorima ──
  const rupeDno = [];
  for (const c of cBu) {
    rupeDno.push(pravokutnik(utorBok, c - utorS / 2, utorBok + T, c + utorS / 2));
    rupeDno.push(pravokutnik(L - utorBok - T, c - utorS / 2, L - utorBok, c + utorS / 2));
  }
  for (const c of cF) rupeDno.push(pravokutnik(c - utorS / 2, D - utorPr - T, c + utorS / 2, D - utorPr));
  dijelovi.push({ ime: 'dno', naziv: 'Dno', poly: pravokutnik(0, 0, L, D), rupe: rupeDno, roditelj: null, znacajka: 'base' });
  const zabraneBok = cBu.map(c => [c - utorS / 2, c + utorS / 2]);
  const zabraneFront = cF.map(c => [c - utorS / 2, c + utorS / 2]);

  // ── bočne stijenke, unutarnji slojevi, uši ──
  function bocna(strana) {
    const desna = strana === 'D', X = x => desna ? L - x : x;
    const mir = pts => desna ? zrcali(pts, L) : pts;
    const ime = desna ? 'desna' : 'lijeva';
    dijelovi.push({ ime: 'w1' + strana, naziv: (desna ? 'Desna' : 'Lijeva') + ' bočna stijenka', poly: mir(pravokutnik(-H, 0, 0, D + k)), rupe: [], roditelj: 'dno', sarka: [[X(0), 0], [X(0), D]], kut: 90, znacajka: 'edge1', perf: { zabrane: zabraneBok } });
    // unutarnji sloj: od −H do −H−W2, jezičci do −H−W2−jez, zaobljeni vanjski kutovi, skošenja pri pregibu
    const x0 = -H - W2, y0 = sk, y1 = D - 0.6 * sk;
    const t = [[-H, 0], [-H, D + k], [-H - 1.08 * sk, y1]];
    t.push(...luk(x0 + rz, y1 - rz, rz, 0.5 * PI, PI, 6));
    for (const c of [cB[1], cB[0]]) { t.push([x0, c + jezS / 2], [x0 - jez, c + jezS / 2], [x0 - jez, c - jezS / 2], [x0, c - jezS / 2]); }
    t.push(...luk(x0 + rz, y0 + rz, rz, PI, 1.5 * PI, 6));
    t.push([-H - 1.08 * sk, y0]);
    let w2 = t.slice(); if (povrsina(w2) < 0) w2.reverse();
    dijelovi.push({ ime: 'w2' + strana, naziv: 'Unutarnji sloj, ' + ime + ' (porub)', poly: mir(w2), rupe: [], roditelj: 'w1' + strana, sarka: [[X(-H), 0], [X(-H), D + k]], kut: 180, znacajka: 'hem1' });
    // prednje uho (ostaje uz prednju stijenku, ispod unutarnjeg sloja)
    const yu = D + k;
    let up = [[0, yu], [ux1, yu + sk], ...luk(ux1 - rz, D + e - rz, rz, 0, 0.5 * PI, 6), ...luk(ux0 + rz, D + e - rz, rz, 0.5 * PI, PI, 6), [ux0, yu + sk], [-H, yu]];
    if (povrsina(up) < 0) up.reverse();
    dijelovi.push({ ime: 'up' + strana, naziv: 'Prednje uho, ' + ime, poly: mir(up), rupe: [], roditelj: 'w1' + strana, sarka: [[X(-H), yu], [X(0), yu]], kut: 90, znacajka: 'usi', perf: { usi: desna ? [L - ux1, L - ux0] : [ux0, ux1] } });
    // stražnje uho: puno uz stijenku, dalje suženo (ide preko ruba sata)
    const uz = -wf + ux1;
    let us = [[0, 0], [-H, 0], [ux0, -sk], ...luk(ux0 + rz, -eS + rz, rz, PI, 1.5 * PI, 6), [uz, -eS], [uz, -B], [ux1 - skP, -B], [ux1, -B + skP], [ux1, -sk]];
    if (wf <= 0) us = [[0, 0], [-H, 0], [ux0, -sk], ...luk(ux0 + rz, -eS + rz, rz, PI, 1.5 * PI, 6), ...luk(ux1 - rz, -eS + rz, rz, 1.5 * PI, 2 * PI, 6), [ux1, -sk]];
    if (povrsina(us) < 0) us.reverse();
    dijelovi.push({ ime: 'us' + strana, naziv: 'Stražnje uho, ' + ime + ' (kutni jezičac drži sat)', poly: mir(us), rupe: [], roditelj: 'w1' + strana, sarka: [[X(-H), 0], [X(0), 0]], kut: 135, znacajka: 'usi', perf: { usi: desna ? [L - ux1, L - ux0] : [ux0, ux1] } });
  }
  bocna('L'); bocna('D');

  // ── prednja stijenka s jezičcem brave ──
  const yF = D + F1, bx0 = L / 2 - bravaS / 2, bx1 = L / 2 + bravaS / 2;
  const f1 = [[0, D], [L, D], [L, yF], [bx1, yF], ...luk(bx1 - bravaR, yF + bravaV - bravaR, bravaR, 0, 0.5 * PI, 4), ...luk(bx0 + bravaR, yF + bravaV - bravaR, bravaR, 0.5 * PI, PI, 4), [bx0, yF], [0, yF]];
  dijelovi.push({ ime: 'f1', naziv: 'Prednja stijenka s jezičcem brave', poly: f1, rupe: [], roditelj: 'dno', sarka: [[0, D], [L, D]], kut: 90, znacajka: 'edge2', perf: { zabrane: zabraneFront } });
  rezUnutra.push([[bx0, yF - bravaV], [bx0, yF]], [[bx1, yF - bravaV], [bx1, yF]]);
  // šarka jezička (10 mm crtice) na yF − 20
  const crticeJez = (y) => [[bx0 + 10 * k, bx0 + 20 * k], [bx0 + 28 * k, bx0 + 38 * k]].map(([a, b]) => ({ a: [a, y], b: [b, y] }));
  dodatnaPerf.push(...crticeJez(yF - bravaV), ...crticeJez(yF));
  // unutarnji prednji sloj s izrezom oko jezička i jezičcima u utore
  const yF2 = yF + F2;
  const f2 = [[0, yF], [bx0, yF], [bx0, yF + bravaV - bravaR], ...luk(bx0 + bravaR, yF + bravaV - bravaR, bravaR, PI, 0.5 * PI, 4), ...luk(bx1 - bravaR, yF + bravaV - bravaR, bravaR, 0.5 * PI, 0, 4), [bx1, yF + bravaV - bravaR], [bx1, yF], [L, yF]];
  f2.push(...luk(L - rz, yF2 - rz, rz, 0, 0.5 * PI, 6));
  for (const c of [cF[1], cF[0]]) f2.push([c + jezS / 2, yF2], [c + jezS / 2, yF2 + jez], [c - jezS / 2, yF2 + jez], [c - jezS / 2, yF2]);
  f2.push(...luk(rz, yF2 - rz, rz, 0.5 * PI, PI, 6));
  dijelovi.push({ ime: 'f2', naziv: 'Unutarnji sloj prednje stijenke (porub)', poly: f2, rupe: [], roditelj: 'f1', sarka: [[0, yF], [L, yF]], kut: 180, znacajka: 'hem2', bezPregiba: [[bx0, bx1]], perf: { zabrane: [[bx0, bx1]] } });

  // ── stražnja stijenka, poklopac s prozorom, preklopi ──
  dijelovi.push({ ime: 'b', naziv: 'Stražnja stijenka', poly: pravokutnik(0, -B, L, 0), rupe: [], roditelj: 'dno', sarka: [[0, 0], [L, 0]], kut: 90, znacajka: 'edge2' });
  const yP0 = -B, yP1 = -B - Dl;
  const px0 = L / 2 - prorezS / 2, px1 = L / 2 + prorezS / 2;
  const pok = [[0, yP1], [px0, yP1], [px0, yP1 + prorezD], [px1, yP1 + prorezD], [px1, yP1], [L, yP1], [L, yP0], [0, yP0]];
  const prozor = P.prozor > 0 ? { cx: L / 2, cy: (yP0 + yP1) / 2, r: Math.min(P.prozor, 0.9 * Math.min(L, Dl)) / 2 } : null;
  dijelovi.push({ ime: 'pok', naziv: 'Poklopac s prozorom', poly: pok, rupe: [], krug: prozor, roditelj: 'b', sarka: [[0, yP0], [L, yP0]], kut: 90, znacajka: 'edge3' });
  if (wf > 0) for (const strana of ['L', 'D']) {
    let pp = [[0, yP1], [0, yP0], [-wf, yP0 - skP], [-wf, yP1 + skP]];
    if (povrsina(pp) < 0) pp.reverse();
    if (strana === 'D') pp = zrcali(pp, L);
    const X = x => strana === 'L' ? x : L - x;
    dijelovi.push({ ime: 'pp' + strana, naziv: 'Bočni preklop poklopca', poly: pp, rupe: [], roditelj: 'pok', sarka: [[X(0), yP1], [X(0), yP0]], kut: 90, znacajka: 'edge4' });
  }
  const yT = yP1 - Tk;
  const tuck = [...luk(xT0 + rz, yT + rz, rz, PI, 1.5 * PI, 6), ...luk(xT1 - rz, yT + rz, rz, 1.5 * PI, 2 * PI, 6), [xT1, yP1], [px1, yP1], [px1, yP1 - prorezD], [px0, yP1 - prorezD], [px0, yP1], [xT0, yP1]];
  dijelovi.push({ ime: 'tk', naziv: 'Prednji preklop poklopca (ulazi iza prednje stijenke)', poly: tuck, rupe: [], roditelj: 'pok', sarka: [[xT0, yP1], [xT1, yP1]], kut: 90, znacajka: 'edge4', bezPregiba: [[px0, px1]], perf: { s: 15 * k, rez: 25 * k, most: 27.28 * k, zabrane: [[px0, px1]] } });

  for (const d of dijelovi) { if (povrsina(d.poly) < 0) d.poly.reverse(); d.rupe = d.rupe.map(h => povrsina(h) > 0 ? h.slice().reverse() : h); }

  // ── držači: iz kruga prozora (izvornik: jedan, 100 × 48, R10, prorez 75 × 2,5) ──
  const drzaci = [];
  const hl = Math.min(100 * k, prozor ? 1.0 * prozor.r : 100), hw = 0.48 * hl, hs = 0.75 * hl, hsw = 0.833 * T;
  if (P.drzaci > 0) {
    const n = Math.min(4, P.drzaci);
    const cx0 = prozor ? prozor.cx - 0.16 * hl : L + 2 * H + 30 + hl / 2;
    const cy0 = prozor ? prozor.cy : D / 2;
    const pomaci = n === 1 ? [0.48] : n === 2 ? [0.48, -0.48] : n === 3 ? [0.96, 0, -0.96] : [1.44, 0.48, -0.48, -1.44];
    for (const f of pomaci) {
      const cx = cx0, cy = cy0 + f * hl;
      drzaci.push({ poly: pravokutnik(cx - hl / 2, cy - hw / 2, cx + hl / 2, cy + hw / 2, Math.min(10 * k, hw / 4), 'dlddgdgl'), prorez: pravokutnik(cx - hs / 2, cy - hsw / 2, cx + hs / 2, cy + hsw / 2), cx, cy });
    }
    if (prozor && drzaci.some(d => d.poly.some(([x, y]) => Math.hypot(x - prozor.cx, y - prozor.cy) > prozor.r - 1))) {
      drzaci.forEach((d, i) => { const dx = (L + 2 * H + 30 + hl / 2) - d.cx, dy = (D / 2 + (i - (n - 1) / 2) * (hw + 8)) - d.cy; d.poly = pomakni(d.poly, dx, dy); d.prorez = pomakni(d.prorez, dx, dy); d.cx += dx; d.cy += dy; d.izvan = true; });
    }
  }

  // ── pregibi ──
  for (const d of dijelovi) {
    if (!d.sarka) continue;
    const [a, b] = d.sarka;
    pregibi.push({ a, b, dio: d.ime, perf: d.perf || {}, bez: d.bezPregiba || [] });
  }

  // ── rezovi: bridovi obrisa bez pregiba; unutarnji ako je materijal s obje strane ──
  const segVanjski = [], segUnutra = [];
  for (const d of dijelovi) {
    zaBridove(d.poly, (a, b) => segVanjski.push([a, b]));
    for (const h of d.rupe) zaBridove(h, (a, b) => segUnutra.push([a, b]));
  }
  const pregibiRez = [];
  for (const g of pregibi) {
    if (!g.bez.length) { pregibiRez.push(g); continue; }
    let iv = [[Math.min(g.a[0], g.b[0]), Math.max(g.a[0], g.b[0])]];
    for (const [u0, u1] of g.bez) { const n = []; for (const [s0, s1] of iv) { if (u1 <= s0 || u0 >= s1) n.push([s0, s1]); else { if (u0 > s0) n.push([s0, u0]); if (u1 < s1) n.push([u1, s1]); } } iv = n; }
    for (const [s0, s1] of iv) pregibiRez.push({ a: [s0, g.a[1]], b: [s1, g.a[1]] });
  }
  const rez = spojiRezove(segVanjski, pregibiRez);
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

  // ── perforacija kao u izvorniku: crtice 15 / 15 simetrično od oba kraja (most 20 na krajevima),
  //    bez crtica preko utora i jezička; uši 2 × 15; prednji preklop 25 mm ──
  const perforacija = [];
  for (const g of pregibi) {
    const pf = g.perf;
    if (pf.usi) { perforacija.push(...perfUho(g.a, g.b, pf.usi, P.perfRez, k)); continue; }
    perforacija.push(...perfSim(g.a, g.b, pf.s ?? 20 * k, pf.rez ?? P.perfRez, pf.most ?? P.perfMost, pf.zabrane || []));
  }
  perforacija.push(...dodatnaPerf);

  // granice
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const pl of [...dijelovi.map(d => d.poly), ...drzaci.map(d => d.poly)]) for (const [x, y] of pl) { minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); }

  const dulj = arr => arr.reduce((s, q) => s + Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]), 0);
  const lProzor = prozor ? 2 * PI * prozor.r : 0;
  const duljine = { unutra: dulj(unutra) + dulj(drzProrez), drzaci: dulj(drzRez), prozor: lProzor, perforacija: dulj(perforacija), kontura: dulj(kontura), pregibi: pregibi.reduce((s, g) => s + Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]), 0) };
  const BA90 = PI / 2 * (P.R + P.K * T), OSSB = P.R + T, BD90 = 2 * OSSB - BA90, BA180 = PI * (P.R + P.K * T);
  const unutarnje = { L: L - 4 * T, D: D - 3 * T, H: H - T };
  const vanjske = { L: L + 2 * T, D: D + 2 * T, H: H + T };
  const sw = { BA90, OSSB, BD90, BA180, dnoSW: vanjske.L - BD90, stijenkaSW: H - BD90 / 2 };
  const ins2 = 0, tsB = jezS, tsF = jezS;
  return { P, dijelovi, pregibi, kontura, unutra, drzaci, drzRez, drzProrez, perforacija, prozor, granice: { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny }, duljine, unutarnje, vanjske, sw, mjere: { W2, F1, F2, B, Dl, Tk, e, eS, wf, ins2, jez, tsB, tsF, hl, hw, hs, hsw, xT0, xT1, bx0, bx1, yF, yF2, yP0, yP1, yT, ux0, ux1 } };
}

// perforacija kao u izvorniku: od oba kraja prema sredini, prva crtica nakon mosta s
function perfSim(a, b, s, rez, most, zabrane) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) return [];
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  // zabrane su zadane u apsolutnoj koordinati duž pregiba (x za vodoravne, y za okomite)
  const vod = Math.abs(uy) < 1e-9, t0 = vod ? a[0] : a[1], smjer = vod ? ux : uy;
  const zab = zabrane.map(([p, q]) => { const u = (p - t0) * smjer, v = (q - t0) * smjer; return [Math.min(u, v), Math.max(u, v)]; });
  const iv = [];
  for (let t = s; t + rez <= L / 2 + 1e-6; t += rez + most) { iv.push([t, t + rez]); iv.push([L - t - rez, L - t]); }
  return iv.filter(([p, q]) => !zab.some(([u, v]) => q > u - 1e-6 && p < v + 1e-6))
    .map(([p, q]) => ({ a: [a[0] + ux * p, a[1] + uy * p], b: [a[0] + ux * q, a[1] + uy * q] }));
}
// uho: dvije crtice (15 mm) s mostom 5 mm u sredini širine uha; [xa, xb] je uho u apsolutnim koordinatama
function perfUho(a, b, [xa, xb], rez, k) {
  const y = a[1], c = (xa + xb) / 2, m = 2.5 * k;
  return [{ a: [c - m - rez, y], b: [c - m, y] }, { a: [c + m, y], b: [c + m + rez, y] }];
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
