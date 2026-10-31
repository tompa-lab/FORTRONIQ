/* FORTRONIQ · Traktor s GPS navigacijom i sijačicom — model (radi u pregledniku i u Node-u).
   Parcela s glavnim prohodima i uvratinama, pogreška položaja (vozač s markerom, EGNOS, RTK, gubitak korekcije),
   spojevi prohoda, krajevi redova na uvratini (sa i bez isključivanja sekcija), singulacija prema brzini,
   norma po zonama tla, prinos, sjeme, vrijeme, gorivo i dobit.
   Os x uzduž prohoda (zapad → istok), y poprijeko (jug → sjever). © ForTroniQ d.o.o. */
import { P, ZONE, ZADANO, SCENARIJI } from './ts_podaci.js';

export function rng(sjeme) {
  let a = sjeme >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r) => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const DX = 2;   /* korak uzorkovanja uzduž prohoda, m */

export const istok = (S, y) => P.duljina - S.kosina * y / P.sirina;   /* istočni rub parcele */
export const zona = (x, y) => (y > 120 ? 'C' : x < 180 ? 'A' : 'B');

export function postavke(S, izmjene = {}) {
  const o = JSON.parse(JSON.stringify(ZADANO));
  Object.assign(o, JSON.parse(JSON.stringify(S.zadano || {})));
  for (const [k, v] of Object.entries(izmjene)) o[k] = k === 'norma' ? Object.assign({}, o.norma, v) : v;
  return o;
}

/* singulacija prema brzini (km/h) — procjena */
export function singulacija(v) {
  const p = Math.max(0, v - 7);
  return { preskoci: 1.5 + 0.35 * p * p, dvojke: 1.0 + 0.25 * p * p };
}

/* OU proces s korakom dt, standardnom devijacijom sigma i vremenom korelacije tau */
function ou(r, n, sigma, tau, dt = 1) {
  const a = Math.exp(-dt / tau), b = sigma * Math.sqrt(1 - a * a);
  const out = new Float64Array(n); let g = sigma * gauss(r);
  for (let i = 0; i < n; i++) { g = a * g + b * gauss(r); out[i] = g; }
  return out;
}

export function izracunaj(S, O) {
  const r = rng(S.sjeme * 101 + (O.nav === 'rucno' ? 1 : O.nav === 'sbas' ? 2 : 3));
  const v = O.brzina / 3.6;
  const h = P.uvratina;
  const nP = P.prohoda;
  /* ---------------- raspored po vremenu (zidni sat), čekanje kod gubitka RTK-a */
  const prohodi = [];
  let t = 0;
  const duljinaGlavnih = [];
  for (let k = 0; k < nP; k++) {
    const yc = P.zahvat / 2 + k * P.zahvat;
    const x0 = h, x1 = istok(S, yc) - h;
    duljinaGlavnih.push(x1 - x0);
  }
  const nominalno = duljinaGlavnih.reduce((a, b) => a + b, 0) / v + (nP - 1) * P.okret;
  const pad = S.rtkPad && O.nav === 'rtk' ? { od: S.rtkPad.od * nominalno, do: S.rtkPad.od * nominalno + S.rtkPad.trajanje } : null;
  let cekanje = 0;
  for (let k = 0; k < nP; k++) {
    const yc = P.zahvat / 2 + k * P.zahvat;
    const x0 = h, x1 = istok(S, yc) - h;
    const smjer = k % 2 === 0 ? 1 : -1;
    /* vrijeme prolaska kroz uzorke */
    const n = Math.floor((x1 - x0) / DX) + 1;
    const tx = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * DX;
      const s = smjer > 0 ? x - x0 : x1 - x;
      let tt = t + s / v;
      if (pad && O.rtkPravilo === 'cekaj' && tt >= pad.od && t < pad.do) {
        if (cekanje === 0) cekanje = pad.do - pad.od;
        tt += cekanje;
      }
      tx[i] = tt;
    }
    const kraj = t + (x1 - x0) / v + (pad && O.rtkPravilo === 'cekaj' && t + (x1 - x0) / v >= pad.od && t < pad.do && cekanje ? cekanje : 0);
    prohodi.push({ k, yc, x0, x1, smjer, n, tx, t0: t, t1: kraj });
    t = kraj + (k < nP - 1 ? P.okret : 0);
  }
  /* ako je pravilo čekanja primijenjeno, pomak svih kasnijih prohoda već je u tx; t1 poravnaj */
  const tGlavni = t;
  const tUvratine = 4 * P.sirina / v + 3 * P.okret;
  const T = Math.ceil(tGlavni + 10);
  /* ---------------- pogreška položaja */
  const rtk = ou(r, T, P.sigmaRtk, 600);
  const sbas = ou(r, T, P.sigmaSbas, P.tauSbas);
  const volanSigma = P.sigmaVolan + 0.004 * Math.max(0, O.brzina - 10);
  const greskaPolozaja = (tt) => {
    const i = Math.max(0, Math.min(T - 1, Math.floor(tt)));
    if (O.nav === 'sbas') return sbas[i];
    if (O.nav === 'rtk') {
      if (pad && tt >= pad.od && tt < pad.do && O.rtkPravilo !== 'cekaj') return sbas[i] - sbas[Math.floor(pad.od)] + rtk[i];
      return rtk[i];
    }
    return 0;
  };
  /* bočno odstupanje svakog prohoda e_k(x) */
  const sigmaRuc = P.sigmaRucno * Math.pow(O.brzina / 8, 0.7);
  let prethodno = null;
  for (const p of prohodi) {
    const e = new Float64Array(p.n);
    if (O.nav === 'rucno') {
      const d = ou(r, p.n, sigmaRuc, 30 / DX);
      for (let i = 0; i < p.n; i++) e[i] = (prethodno && i < prethodno.length ? prethodno[i] : 0) + (p.k === 0 ? 0 : d[i]);
    } else {
      const s = ou(r, p.n, volanSigma, 15 / DX);
      for (let i = 0; i < p.n; i++) e[i] = greskaPolozaja(p.tx[i]) + s[i];
    }
    p.e = e; prethodno = e;
  }
  /* ---------------- spojevi */
  let nSp = 0, u5 = 0, u10 = 0, prop = 0, dvo = 0, sumA = 0;
  const hist = new Array(25).fill(0);   /* −30 … +30 cm po 2,5 cm */
  const spojevi = [];
  for (let k = 0; k < nP - 1; k++) {
    const a = prohodi[k], b = prohodi[k + 1];
    const n = Math.min(a.n, b.n);
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const dd = P.razmakRed + b.e[i] - a.e[i];
      const dev = dd - P.razmakRed;
      d[i] = dev; nSp++;
      const ad = Math.abs(dev);
      if (ad <= 0.05) u5++;
      if (ad <= 0.10) u10++;
      if (dd > 1.05) prop++;
      if (dd < 0.35) dvo++;
      sumA += ad;
      hist[Math.max(0, Math.min(24, Math.round(dev * 100 / 2.5) + 12))]++;
    }
    spojevi.push({ k, y: a.yc + P.zahvat / 2, x0: a.x0, d });
  }
  /* ---------------- krajevi redova na uvratinama */
  const kraj = [];
  let preklop = 0, propust = 0, duzRed = 0;
  const kas = O.sekcije ? P.kasnjenje - O.komp : P.podizanje;
  for (const p of prohodi) {
    for (let rr = 0; rr < P.redova; rr++) {
      const off = (rr - (P.redova - 1) / 2) * P.razmakRed;
      const yr = p.yc + off + (p.e[0] || 0);
      const xw = h, xe = istok(S, yr) - h;
      duzRed += xe - xw;
      for (const strana of ['z', 'i']) {
        /* granica na toj strani za red i za sredinu sijačice */
        const xbRed = strana === 'z' ? xw : xe;
        const xbSred = strana === 'z' ? h : istok(S, p.yc) - h;
        const ulaz = (p.smjer > 0) === (strana === 'z');      /* sijačica ulazi u glavni dio na ovoj strani */
        let pomak;                                           /* + u smjeru vožnje */
        if (O.sekcije) pomak = v * kas + (O.nav === 'rucno' ? 0.3 : O.nav === 'sbas' ? 0.25 : 0.02) * gauss(r);
        else pomak = (xbSred - xbRed) * p.smjer + v * kas + (O.nav === 'rucno' ? 1.0 : 0.3) * gauss(r);
        /* ulaz: pomak > 0 → sjeme kreće kasno → propust; izlaz: pomak > 0 → kasno staje → preklop u uvratini */
        const s = ulaz ? -pomak : pomak;                    /* + preklop, − propust */
        if (s > 0) preklop += s; else propust += -s;
        kraj.push({ k: p.k, rr, x: xbRed, y: yr, s, strana });
      }
    }
  }
  /* ---------------- sjeme, prinos, dobit */
  const sg = singulacija(O.brzina);
  const povZona = { A: 0, B: 0, C: 0 };
  for (let y = 0.5; y < P.sirina; y += 1) for (let x = 0.5; x < istok(S, y); x += 2) povZona[zona(x, y)] += 2;
  const povrsina = (povZona.A + povZona.B + povZona.C) / 10000;
  const prinosZona = (z, gust) => { const Z = ZONE[z]; const rel = (gust - Z.opt) / Z.opt; return Z.ymax * Math.max(0, 1 - P.gubitakSklop * rel * rel); };
  const fSing = 1 - (0.5 * sg.preskoci + 0.3 * sg.dvojke) / 100;
  const fPropust = 1 - propust / Math.max(1, duzRed);
  let prinos = 0, zrna = 0;
  for (const z of ['A', 'B', 'C']) {
    const ha = povZona[z] / 10000;
    prinos += ha * prinosZona(z, O.norma[z]) * fSing * fPropust;
    zrna += ha * O.norma[z];
  }
  zrna *= 1 + preklop / Math.max(1, duzRed);
  const vrece = zrna / P.vreca;
  const sati = (tGlavni + tUvratine) / 3600;
  const dobit = prinos * P.cijenaZrna - vrece * P.cijenaVrece;
  const k = {
    spoj5: 100 * u5 / nSp, spoj10: 100 * u10 / nSp, propust: 100 * (prop + dvo) / nSp, propRed: 100 * prop / nSp, dvoRed: 100 * dvo / nSp,
    srOdst: 100 * sumA / nSp, preklopU: 100 * preklop / duzRed, propustU: 100 * propust / duzRed, preklopM: preklop, propustM: propust,
    preskoci: sg.preskoci, dvojke: sg.dvojke, singulacija: sg.preskoci + sg.dvojke, povrsina, vrece, zrna, prinos, prinosHa: prinos / povrsina,
    vrijeme: sati, gorivo: sati * P.gorivo, dobit, dobitHa: 0, cekanje: cekanje / 60, rtkPadMin: pad ? (pad.do - pad.od) / 60 : 0,
  };
  k.bodovi = 0;
  return { prohodi, spojevi, kraj, hist, pad, k, O, povZona, tGlavni, tUvratine };
}

export function pokazatelji(S, O) {
  const R = izracunaj(S, O);
  const B = izracunaj(S, Object.assign({}, O, { norma: { A: 72000, B: 72000, C: 72000 } }));
  R.k.dobitHa = (R.k.dobit - B.k.dobit) / R.k.povrsina;
  R.k.bodovi = Math.round(10 * R.k.spoj10 - 50 * R.k.propust - 300 * (R.k.preklopU + R.k.propustU) - 15 * R.k.singulacija + R.k.dobitHa);
  return R;
}

export function provjeri(S, k, dijagnoza) {
  return S.uvjeti.map(([kljuc, op, gr, opis]) => {
    const v = kljuc === 'dijagnoza' ? (dijagnoza ? 1 : 0) : k[kljuc];
    const ok = op === '>=' ? v >= gr - 1e-9 : op === '<=' ? v <= gr + 1e-9 : v === gr;
    return { kljuc, opis, ok, v };
  });
}
export { SCENARIJI };
