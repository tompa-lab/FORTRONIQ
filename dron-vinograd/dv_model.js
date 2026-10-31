/* FORTRONIQ · Dron nad vinogradom — model (radi u pregledniku i u Node-u).
   Vinograd (trsovi sa stvarnim stanjem), misija „kosilica", kamera (GSD, otisak, zamućenje, razmak okidanja),
   energija baterije s vjetrom, pokrivenost, mjereni NDVI (miješanje s tlom i šum), karta tretmana i pokazatelji.
   Os x uzduž redova (zapad → istok), y poprijeko; vjetar puše sa zapada (+x). © ForTroniQ d.o.o. */
import { P, SCENARIJI, ZADANA_MISIJA, ZADANA_KARTA } from './dv_podaci.js';

export function rng(sjeme) {
  let a = sjeme >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r) => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* ---------------------------------------------------------------- vinograd */
export function napraviVinograd(S) {
  const r = rng(S.sjeme);
  const nRed = Math.round(P.sirina / P.razmakRed), nTrs = Math.round(P.duljina / P.razmakTrs);
  const trs = [];
  const zarista = [];
  for (let i = 0; i < S.nalaz.zarista; i++) zarista.push({ x: 12 + r() * (P.duljina - 24), y: 8 + r() * (P.sirina - 16), rr: 3 + r() * 4 });
  const pepelnica = [];
  for (let i = 0; i < S.nalaz.pepelnica; i++) pepelnica.push({ red: Math.floor(r() * nRed), k: Math.floor(r() * nTrs) });
  for (let j = 0; j < nRed; j++) {
    const y = P.razmakRed / 2 + j * P.razmakRed;
    for (let i = 0; i < nTrs; i++) {
      const x = P.razmakTrs / 2 + i * P.razmakTrs;
      let stanje = 'zdrav', ndvi = P.ndviZdrav + gauss(r) * 0.015;
      if (S.nalaz.stres && y > P.sirina * 0.62) {
        const f = Math.min(1, (y - P.sirina * 0.62) / (P.sirina * 0.15));
        if (r() < 0.35 + 0.6 * f) { stanje = 'stres'; ndvi = P.ndviStres + gauss(r) * 0.02; }
      }
      const nB = S.nalaz.rana ? P.ndviRana : P.ndviBolest, simp = S.nalaz.rana ? P.simptomRan : P.simptomRazvijen;
      for (const z of zarista) if (Math.hypot(x - z.x, (y - z.y) * 0.8) < z.rr && r() < 0.85) { stanje = 'bolest'; ndvi = nB + gauss(r) * 0.02; }
      for (const pz of pepelnica) if (pz.red === j && Math.abs(pz.k - i) <= 1) { stanje = 'bolest'; ndvi = nB + 0.02 + gauss(r) * 0.02; }
      if (r() < S.nalaz.nedostaje) { stanje = 'nema'; ndvi = P.ndviTlo + gauss(r) * 0.02; }
      trs.push({ x, y, red: j, k: i, stanje, ndvi, simp: stanje === 'bolest' ? simp : 0 });
    }
  }
  return { trs, nRed, nTrs, zarista };
}

/* ---------------------------------------------------------------- kamera i misija */
export function kamera(visina) {
  const sir = visina * P.senzorS / P.zarisna, duz = visina * P.senzorV / P.zarisna;
  return { sir, duz, gsd: sir / P.pikselS };
}

/* Plan: linije „kosilice" (smjer 'uz' = linije uzduž redova, 'poprijeko' = okomito), okidanja na liniji */
export function planiraj(M) {
  const K = kamera(M.visina);
  const uz = M.smjer === 'uz';
  const Lduz = uz ? P.duljina : P.sirina, Lpop = uz ? P.sirina : P.duljina;
  /* kamera: dulja strana otiska poprijeko smjera leta */
  const razmakLin = K.sir * (1 - M.preklopB / 100);
  const nLin = Math.max(1, Math.ceil(Math.max(0, Lpop - K.sir) / razmakLin) + 1);
  const pozLin = nLin === 1 ? [Lpop / 2] : Array.from({ length: nLin }, (_, i) => K.sir / 2 + i * (Lpop - K.sir) / (nLin - 1));
  const stvRazmakLin = nLin > 1 ? (Lpop - K.sir) / (nLin - 1) : 0;
  const zeljeniKorak = K.duz * (1 - M.preklopU / 100);
  const najkraciKorak = M.brzina * P.okidanje;
  const korak = Math.max(zeljeniKorak, najkraciKorak);
  const preko = K.duz / 2;                       /* produžetak linije izvan ruba da i rubni trsovi budu na više snimki */
  const linije = pozLin.map((c, i) => {
    const od = -preko, do_ = Lduz + preko, smjer = i % 2 === 0 ? 1 : -1;
    const n = Math.floor((do_ - od) / korak) + 1;
    const okid = Array.from({ length: n }, (_, k) => (smjer > 0 ? od + k * korak : do_ - k * korak));
    return { c, smjer, od: smjer > 0 ? od : do_, do: smjer > 0 ? do_ : od, okid };
  });
  const zamucenje = M.brzina * P.ekspozicija;
  return { K, uz, Lduz, Lpop, nLin, stvRazmakLin, zeljeniKorak, korak, najkraciKorak, linije, zamucenje, mutno: zamucenje > K.gsd,
    stvPreklopU: Math.max(0, 1 - korak / K.duz) * 100, stvPreklopB: nLin > 1 ? Math.max(0, 1 - stvRazmakLin / K.sir) * 100 : 100 };
}

/* snaga (W) pri zadanoj brzini kroz zrak */
const snaga = (vz) => P.pLebdenje * (1 + P.kBrzina * vz * vz);

/* Let: putanja po segmentima (vrijeme, energija), povratak kući na rezervi. Kuća: (−10, −10) u koordinatama vinograda. */
export function leti(M, vjetar, plan = planiraj(M)) {
  const kuca = { x: -10, y: -10 };
  const tocka = (lin, s) => (plan.uz ? { x: s, y: lin.c } : { x: lin.c, y: s });
  const seg = [];
  const v = M.brzina;
  function let_(a, b, vrsta) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 1e-6) return;
    const ux = dx / d, uy = dy / d;
    /* brzina kroz zrak = brzina nad tlom − vjetar (vjetar puše prema +x) */
    const vz = Math.hypot(v * ux - vjetar, v * uy);
    seg.push({ a, b, d, t: d / v, vz, W: snaga(vz), vrsta });
  }
  const tUspon = M.visina / P.vPenjanje;
  const lebd = (vrsta, t) => seg.push({ a: kuca, b: kuca, d: 0, t, vz: vjetar, W: snaga(vjetar) * 1.1, vrsta });
  lebd('uspon', tUspon);
  let poz = kuca;
  plan.linije.forEach((lin, i) => {
    const p0 = tocka(lin, lin.od), p1 = tocka(lin, lin.do);
    let_(poz, p0, i === 0 ? 'dolazak' : 'okret');
    let_(p0, p1, 'snimanje');
    seg[seg.length - 1].lin = i;
    poz = p1;
  });
  let_(poz, kuca, 'povratak');
  lebd('spuštanje', tUspon);
  /* izvođenje s praćenjem energije: povratak na rezervi */
  const E = P.energija * 3600;      /* J */
  const prag = E * M.rezerva / 100;
  let e = 0, t = 0, zavrsen = true, prekidLin = null, prekidPoz = null;
  const trag = [{ t: 0, b: 100, x: kuca.x, y: kuca.y }];
  const izvedeno = [];
  const potrebnoZaPovratak = (p) => {
    const d = Math.hypot(p.x - kuca.x, p.y - kuca.y);
    if (d < 1e-6) return snaga(vjetar) * 1.1 * tUspon;
    const ux = (kuca.x - p.x) / d, uy = (kuca.y - p.y) / d;
    return snaga(Math.hypot(v * ux - vjetar, v * uy)) * d / v + snaga(vjetar) * 1.1 * tUspon;
  };
  for (let si = 0; si < seg.length; si++) {
    const s = seg[si];
    s.t0 = t;
    if (s.vrsta === 'povratak' || s.vrsta === 'spuštanje') { e += s.W * s.t; t += s.t; izvedeno.push(s); trag.push({ t, b: 100 * (1 - e / E), x: s.b.x, y: s.b.y }); continue; }
    if (s.vz > P.vMax) { zavrsen = false; prekidLin = s.lin ?? null; prekidPoz = s.a; break; }
    /* koliko segmenta stane prije rezerve */
    const korakova = Math.max(1, Math.ceil(s.t / 2));
    let prekinuto = false;
    for (let k = 1; k <= korakova; k++) {
      const f = k / korakova;
      const p = { x: s.a.x + (s.b.x - s.a.x) * f, y: s.a.y + (s.b.y - s.a.y) * f };
      const eN = e + s.W * s.t / korakova;
      if (eN + potrebnoZaPovratak(p) > E - prag && s.vrsta !== 'uspon') {
        zavrsen = false; prekidLin = s.lin ?? null; prekidPoz = { x: s.a.x + (s.b.x - s.a.x) * (k - 1) / korakova, y: s.a.y + (s.b.y - s.a.y) * (k - 1) / korakova };
        if (s.lin !== undefined) izvedeno.push(Object.assign({}, s, { b: prekidPoz, t: s.t * (k - 1) / korakova, dio: (k - 1) / korakova }));
        prekinuto = true; break;
      }
      e = eN; t += s.t / korakova;
      trag.push({ t, b: 100 * (1 - e / E), x: p.x, y: p.y });
    }
    if (prekinuto) break;
    izvedeno.push(s);
  }
  if (!zavrsen) {
    const p = prekidPoz;
    const d = Math.hypot(p.x - kuca.x, p.y - kuca.y);
    const ux = d ? (kuca.x - p.x) / d : 0, uy = d ? (kuca.y - p.y) / d : 0;
    const W = snaga(Math.hypot(v * ux - vjetar, v * uy));
    e += W * d / v + snaga(vjetar) * 1.1 * tUspon; t += d / v + tUspon;
    trag.push({ t, b: 100 * (1 - e / E), x: kuca.x, y: kuca.y });
  }
  const dSnimanje = izvedeno.filter((s) => s.vrsta === 'snimanje').reduce((a, s) => a + s.d * (s.dio ?? 1), 0);
  return { seg, izvedeno, trag, t, e, baterija: 100 * (1 - e / E), zavrsen, prekidLin, dSnimanje,
    vzMax: Math.max(...seg.filter((s) => s.vrsta !== 'uspon' && s.vrsta !== 'spuštanje').map((s) => s.vz)), preVmax: seg.some((s) => s.vz > P.vMax && s.vrsta !== 'uspon' && s.vrsta !== 'spuštanje') };
}

/* snimke: središta okidanja na izvedenom dijelu misije */
export function snimke(plan, L, v) {
  const out = [];
  plan.linije.forEach((lin, i) => {
    const s = L.izvedeno.find((x) => x.lin === i);
    if (!s) return;
    const dio = s.dio ?? 1;
    const granica = lin.od + (lin.do - lin.od) * dio;
    lin.okid.forEach((q) => {
      const unutra = lin.smjer > 0 ? q <= granica + 1e-9 : q >= granica - 1e-9;
      const ts = s.t0 + Math.abs(q - lin.od) / v;
      if (unutra) out.push(plan.uz ? { x: q, y: lin.c, lin: i, t: ts } : { x: lin.c, y: q, lin: i, t: ts });
    });
  });
  return out;
}

/* pokrivenost i mjereni NDVI po trsu */
export function mjeri(V, plan, snim, sjeme) {
  const r = rng(sjeme * 7 + 3);
  const K = plan.K;
  const hx = (plan.uz ? K.duz : K.sir) / 2, hy = (plan.uz ? K.sir : K.duz) / 2;
  const ostro = !plan.mutno;
  const gsdCm = K.gsd * 100;
  const fTlo = Math.min(0.5, 0.5 * K.gsd / P.krosnja);   /* rubni pikseli krošnje: pola lista, pola tla */
  const rez = V.trs.map((t) => {
    let n = 0;
    if (ostro) for (const s of snim) if (Math.abs(t.x - s.x) <= hx && Math.abs(t.y - s.y) <= hy) n++;
    let m = null;
    if (n >= P.minSnimki) {
      /* simptom manji od piksela: kontrast prema zdravom lišću razmjerno manji */
      const vid = t.simp ? Math.min(1, t.simp / gsdCm) : 1;
      const ndvi = t.simp ? P.ndviZdrav + (t.ndvi - P.ndviZdrav) * vid : t.ndvi;
      const tlo = t.stanje === 'nema' ? 0 : fTlo;
      m = (1 - tlo) * ndvi + tlo * P.ndviTlo + gauss(r) * P.sum / Math.sqrt(Math.min(n, 9) / 4);
    }
    return { n, m };
  });
  return { rez, fTlo, gsdCm };
}

/* karta tretmana po sekcijama prskalice (dijelovi reda duljine P.segment) */
export function tretman(V, Mj, KT) {
  const poSeg = Math.round(P.segment / P.razmakTrs);
  const nSeg = Math.ceil(V.nTrs / poSeg);
  const seg = [];
  for (let j = 0; j < V.nRed; j++) for (let s = 0; s < nSeg; s++) {
    let tret = false, nem = false;
    for (let k = s * poSeg; k < Math.min(V.nTrs, (s + 1) * poSeg); k++) {
      const m = Mj.rez[j * V.nTrs + k].m;
      if (m === null) nem = true;
      else if (m < KT.prag && m >= KT.donja) tret = true;
    }
    if (nem && KT.nemapirano) tret = true;
    seg.push({ red: j, s, tret, nem });
  }
  return { seg, poSeg, nSeg };
}

export function let_i_mjerenje(S, M, V = napraviVinograd(S)) {
  const plan = planiraj(M);
  const L = leti(M, S.vjetar, plan);
  const snim = snimke(plan, L, M.brzina);
  const Mj = mjeri(V, plan, snim, S.sjeme);
  return { V, plan, L, snim, Mj };
}

export function ocijeni(S, M, KT, R) {
  const { V, plan, L, snim, Mj } = R;
  const T = tretman(V, Mj, KT);
  const mapirano = Mj.rez.filter((x) => x.m !== null).length;
  const bolesni = V.trs.filter((t) => t.stanje === 'bolest');
  const tretSeg = new Set(T.seg.filter((s) => s.tret).map((s) => s.red * 1000 + s.s));
  const pogodeno = bolesni.filter((t) => tretSeg.has(t.red * 1000 + Math.floor(t.k / T.poSeg))).length;
  const tretirano = 100 * tretSeg.size / T.seg.length;
  const povrsina = P.duljina * P.sirina / 10000;
  const k = {
    gsd: plan.K.gsd * 100, sirSnimke: plan.K.sir, duzSnimke: plan.K.duz, nLin: plan.nLin, nSnimki: snim.length,
    trajanje: L.t / 60, baterija: L.baterija, zavrsen: L.zavrsen ? 1 : 0, mutno: plan.mutno ? snim.length : 0,
    zamucenje: plan.zamucenje * 100, pokrivenost: 100 * mapirano / V.trs.length, bolesnih: bolesni.length,
    odziv: bolesni.length ? 100 * pogodeno / bolesni.length : 100, tretirano, skropivo: povrsina * P.norma * tretirano / 100,
    skropivoSve: povrsina * P.norma, stvPreklopU: plan.stvPreklopU, stvPreklopB: plan.stvPreklopB, prespora: plan.korak > plan.zeljeniKorak + 1e-9,
    fTlo: Mj.fTlo * 100, vzMax: L.vzMax, preVmax: L.preVmax, povrsina,
  };
  k.bodovi = Math.round(10 * k.pokrivenost * (k.odziv / 100) - 4 * k.tretirano - (k.zavrsen ? 0 : 150) - (k.baterija < M.rezerva - 0.5 ? 100 : 0));
  return { T, k };
}

export function pokazatelji(S, M, KT) {
  const R = let_i_mjerenje(S, M);
  const O = ocijeni(S, M, KT, R);
  return Object.assign(R, O);
}

export function provjeri(S, k) {
  return S.uvjeti.map(([kljuc, op, gr, opis]) => {
    const v = k[kljuc];
    const ok = op === '>=' ? v >= gr - 1e-9 : op === '<=' ? v <= gr + 1e-9 : v === gr;
    return { kljuc, opis, ok, v };
  });
}

export function misijaScenarija(S) { return Object.assign({}, ZADANA_MISIJA, S.misija || {}); }
export function kartaScenarija(S) { return Object.assign({}, ZADANA_KARTA, S.karta || {}); }
export { SCENARIJI };
