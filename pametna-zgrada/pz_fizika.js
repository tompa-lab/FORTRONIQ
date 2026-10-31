/* FORTRONIQ · Pametna zgrada — model zgrade (fizika) i program PLC-a.
   Bez ovisnosti o pregledniku: radi isto u pregledniku i u Node-u (testovi).
   Sve brojke modela su pretpostavke iz pz_podaci.js (PRETP); jednadžbe su standardne inženjerske aproksimacije:
   – Sunce: deklinacija (Cooper), satni kut, zračenje vedrog neba (Haurwitz), naoblaka (Kasten–Czeplak),
     difuzni udio linearno s naoblakom, izotropni model nebeskog svoda za nagnutu plohu.
   – Zgrada: jedan toplinski čvor  C·dT/dt = Q_DT + Q_unutr + Q_sol − (H_tr + H_vent)·(T − T_van).
   – Dizalica topline: COP = 0,42 · Carnotov COP (polazna voda 35 °C grijanje / 18 °C hlađenje).
   – CO₂: dC/dt = (N·q_CO₂ − V·(C − C_van)) / V_zraka.
   – Solarni krug: kolektor kao čvor s toplinskim kapacitetom, spremnik kao čvor; diferencijalni termostat u PLC-u.
   Korak integracije 30 s (eksplicitni Euler). © ForTroniQ d.o.o. */

import { PRETP, ZGRADA, SCENARIJI, PARAMETRI } from './pz_podaci.js';

export const KORAK = 30;                       /* s */
const DEG = Math.PI / 180;
const cl = (x, a, b) => Math.min(b, Math.max(a, x));

/* ================================================================== sunce i vrijeme */
export function sunce(dan, satSat, naoblaka, sirina = ZGRADA.sirina) {
  /* ljetno računanje vremena (približno 29. 3. – 25. 10.): sunčano podne u 13 h */
  const ljetno = dan >= 88 && dan <= 298;
  const solarni = satSat - (ljetno ? 1 : 0) - (15.98 - 15) / 15;   /* Zagreb ≈ 16° E, meridijan zone 15° E */
  const dekl = 23.45 * Math.sin(2 * Math.PI * (284 + dan) / 365) * DEG;
  const om = 15 * (solarni - 12) * DEG;
  const fi = sirina * DEG;
  const sinh = Math.sin(fi) * Math.sin(dekl) + Math.cos(fi) * Math.cos(dekl) * Math.cos(om);
  if (sinh <= 0.01) return { sinh: Math.max(0, sinh), ghi: 0, poaFN: 0, poaKol: 0, juzna: 0, difVert: 0 };
  const vedro = 1098 * sinh * Math.exp(-0.057 / sinh);
  const ghi = vedro * (1 - 0.75 * Math.pow(cl(naoblaka, 0, 1), 3.4));
  const kd = cl(0.14 + 0.82 * naoblaka, 0.14, 1);
  const gb = ghi * (1 - kd), gd = ghi * kd;
  const nagnuto = (beta) => {
    const b = beta * DEG;
    const cosT = Math.sin(dekl) * Math.sin(fi - b) + Math.cos(dekl) * Math.cos(fi - b) * Math.cos(om);
    const rb = Math.min(5, Math.max(0, cosT) / Math.max(sinh, 0.087));
    return Math.max(0, gb * rb + gd * (1 + Math.cos(b)) / 2 + ghi * 0.2 * (1 - Math.cos(b)) / 2);
  };
  return { sinh, ghi, poaFN: nagnuto(15), poaKol: nagnuto(45), juzna: nagnuto(90), difVert: gd * 0.5 + ghi * 0.1 };
}

/* vanjska temperatura: najniža u 5 h, najviša u 15 h (kosinusni luk) */
export function tVani(sat, tMin, tMax) {
  let t = sat; if (t < 5) t += 24;
  const a = tMax - tMin;
  if (t <= 15) return tMin + a * (0.5 - 0.5 * Math.cos(Math.PI * (t - 5) / 10));
  return tMin + a * (0.5 + 0.5 * Math.cos(Math.PI * (t - 15) / 14));
}

/* prisutnost (radni dan) i potrošnja PTV-a, L/h */
export function osobe(sat, radni) {
  if (!radni) return 0;
  const N = PRETP.osobe.v;
  if (sat >= 7.5 && sat < 15) return N;
  if (sat >= 7 && sat < 7.5) return Math.round(N * 0.25);
  if (sat >= 15 && sat < 16) return Math.round(N * 0.2);
  if (sat >= 16 && sat < 18) return 4;                /* čišćenje */
  return 0;
}
export const nastava = (sat) => sat >= 7.5 && sat < 15;
export function ptvLh(sat, radni) {
  if (!radni) return 0;
  const d = PRETP.ptv.v / 450;
  if (sat >= 7 && sat < 8) return 40 * d;
  if (sat >= 9 && sat < 12) return (200 / 3) * d;
  if (sat >= 12 && sat < 14) return 80 * d;
  if (sat >= 14 && sat < 16) return 25 * d;
  return 0;
}

/* ================================================================== oprema */
const POV = PRETP.povrsina.v, VZR = PRETP.volumen.v;
const C_ZG = PRETP.Cef.v * 3.6e6;                     /* J/K */
const PROTOK = [0, 1200, 2400, 3600];                 /* m³/h po stupnju */
const C_KOL = PRETP.kolektori.v * 10e3;               /* J/K */
const MCP_KOL = PRETP.kolektori.v * 40 / 3600 * 4186; /* W/K, 40 L/(h·m²) */
const C_SPR = PRETP.spremnik.v * 4186;                /* J/K */

export function copGrij(tVan) { return cl(0.42 * (35 + 273.15) / Math.max(35 - tVan, 8), 1.6, 6.5); }
export function eerHlad(tVan) { return cl(0.38 * (18 + 273.15) / Math.max(tVan - 18, 6), 2.2, 7); }
export function ucinGrij(tVan) { return PRETP.dtGrij.v * cl(1 + 0.022 * (tVan - 7), 0.55, 1.25) * 1000; }
export function ucinHlad(tVan) { return PRETP.dtHlad.v * cl(1 - 0.012 * (tVan - 35), 0.8, 1.2) * 1000; }

export function fnSnaga(poa, tVan) {
  const tc = tVan + 0.03 * poa;
  const dc = PRETP.fnSnaga.v * (poa / 1000) * (1 - 0.004 * (tc - 25)) * 0.93;
  return Math.max(0, Math.min(PRETP.izmj.v, dc * 0.96));
}

/* ================================================================== zadani parametri */
export function zadaniParametri() { const p = {}; PARAMETRI.forEach((x) => { p[x.id] = x.v; }); return p; }

/* ================================================================== PLC
   m: izmjereni ulazi, p: parametri, z: zapamćena stanja (SR bistabili), sat: vrijeme dana.
   Vraća izlaze i opis aktivnih uvjeta po pravilu (za ljestvičasti prikaz). */
export function plc(m, p, z, sat) {
  const r = {};                                       /* uvjeti po pravilu, za prikaz */
  const uNastavi = sat >= 6.5 && sat < 15;            /* uključivo predgrijavanje od 6:30 */
  const visakFN = p.visak && m.P_MR < -1;
  let spG = p.spG - (uNastavi ? 0 : p.nocno);
  let spH = p.spH;
  if (p.visak && m.P_MR < -4) { if (m.T_VAN < 15) spG += 1; if (m.T_VAN > 22) spH -= 1; }   /* predgrijavanje / pothlađivanje viškom FN-a */
  r.spG = spG; r.spH = spH;

  /* 1 grijanje (SR s histerezom, blokada hlađenjem i greškom DT) */
  const gS = m.T_UN < spG - p.hist, gR = m.T_UN > spG + p.hist;
  if (gS) z.grij = true; if (gR) z.grij = false;
  /* 2 hlađenje */
  const hS = m.T_UN > spH + p.hist, hR = m.T_UN < spH - p.hist;
  if (hS) z.hlad = true; if (hR) z.hlad = false;
  const GRIJ = z.grij && !z.hlad && !m.DT_ERR;
  const HLAD = z.hlad && !z.grij && !m.DT_ERR;
  r.grij = { gS, gR, mem: z.grij, err: m.DT_ERR };
  r.hlad = { hS, hR, mem: z.hlad, err: m.DT_ERR };

  /* 4 noćno hlađenje (obilazni vod) */
  const bypUv = m.T_UN > p.byp && m.T_VAN < m.T_UN - 2 && !GRIJ;
  const BYP = bypUv;
  r.byp = { iznad: m.T_UN > p.byp, hladnije: m.T_VAN < m.T_UN - 2, bezGrij: !GRIJ };

  /* 3 ventilacija prema CO₂ (histereza 50 ppm) */
  let st = 1;
  if (m.PRIS) {
    if (m.CO2 >= p.co2b || (z.vent === 3 && m.CO2 > p.co2b - 50)) st = 3;
    else if (m.CO2 >= p.co2a || (z.vent >= 2 && m.CO2 > p.co2a - 50)) st = 2;
  } else if (BYP) st = 3;
  z.vent = st;
  r.vent = { pris: m.PRIS, a: m.CO2 >= p.co2a, b: m.CO2 >= p.co2b, byp: BYP && !m.PRIS };

  /* 5 žaluzine */
  const ZAL = m.G_SUN > p.zalG && m.T_UN > p.zalT;
  r.zal = { g: m.G_SUN > p.zalG, t: m.T_UN > p.zalT };

  /* 6 rasvjeta prema dnevnom svjetlu (I-regulator na izmjerenu osvijetljenost) */
  let rasv = z.rasv || 0;
  if (!m.PRIS) rasv = 0;
  else rasv = cl(rasv + (p.lux - m.E_LUX) / p.lux * 25, 0, 100);
  z.rasv = rasv;
  r.rasv = { pris: m.PRIS, malo: m.E_LUX < p.lux - 20 };

  /* 7 solarna crpka (diferencijalni termostat, zaštita spremnika) */
  const dT = m.T_KOL - m.T_SPR;
  if (dT > p.dTon) z.spump = true;
  if (dT < p.dToff) z.spump = false;
  const zast = m.T_SPR > 85;
  const SPUMP = z.spump && !zast;
  r.spump = { on: dT > p.dTon, off: dT < p.dToff, mem: z.spump, zast };

  /* 8 dogrijavanje PTV-a (SR: ispod praga uključi, +5 K isključi) i višak FN-a */
  if (m.T_SPR < p.ptvMin) z.egrij = true;
  if (m.T_SPR > p.ptvMin + 5) z.egrij = false;
  if (p.visak) {
    if (m.P_MR < -6.5 && m.T_SPR < 65) z.evisak = true;
    if (m.P_MR > 1 || m.T_SPR >= 65) z.evisak = false;
  } else z.evisak = false;
  const EGRIJ = (z.egrij || z.evisak) && m.T_SPR < 85;
  r.egrij = { malo: m.T_SPR < p.ptvMin, mem: z.egrij, visak: !!z.evisak };

  return { izlazi: { GRIJ, HLAD, VENT: st, BYP, ZAL, RASV: Math.round(rasv), SPUMP, EGRIJ }, uvjeti: r, visakFN };
}

/* ================================================================== alarmi (nadzor) */
export function alarmi(m, iz, z, ocekFN) {
  const a = [];
  if (m.G_SUN > 250 && m.P_FN < 0.15 * Math.max(ocekFN, 0.5) && ocekFN > 2) a.push({ id: 'fn', t: 'Fotonapon: zračenje ' + Math.round(m.G_SUN) + ' W/m², a izmjenjivač daje ' + m.P_FN.toFixed(1).replace('.', ',') + ' kW' });
  if (m.DT_ERR) a.push({ id: 'dt', t: 'Dizalica topline: skupna greška' });
  if (m.DP_F > 220) a.push({ id: 'filtar', t: 'Rekuperator: pad tlaka na filtru ' + Math.round(m.DP_F) + ' Pa (zamijeni filtar)' });
  if (m.T_UN < 18 || m.T_UN > 27) a.push({ id: 'tun', t: 'Temperatura u prostoru izvan granica: ' + m.T_UN.toFixed(1).replace('.', ',') + ' °C' });
  if (m.CO2 > 1500) a.push({ id: 'co2', t: 'CO₂ ' + Math.round(m.CO2) + ' ppm — loša kvaliteta zraka' });
  if (m.T_SPR > 85) a.push({ id: 'spr', t: 'Spremnik PTV-a iznad 85 °C — solarna crpka blokirana' });
  if (iz.SPUMP && (z.spumpBezHl || 0) > 600) a.push({ id: 'spump', t: 'Solarni krug: crpka ima nalog, a kolektor se ne hladi (' + Math.round(m.T_KOL) + ' °C)' });
  if (m.T_KOL > 130) a.push({ id: 'stag', t: 'Kolektori u stagnaciji: ' + Math.round(m.T_KOL) + ' °C' });
  return a;
}

/* ================================================================== zgrada */
export function napraviZgradu(scen, param, opc = {}) {
  const S = typeof scen === 'string' ? SCENARIJI.find((x) => x.id === scen) : scen;
  const p = Object.assign(zadaniParametri(), param || {});
  const st = {
    t: 0, tUn: S.start.tUn, tSpr: S.start.tSpr, tKol: S.tMin, co2: S.start.co2,
    z: { grij: false, hlad: false, vent: 1, rasv: 0, spump: false, egrij: false, evisak: false, spumpBezHl: 0 },
    kvarovi: new Set(opc.kvarovi || []), man: {},
  };
  const kvarOd = opc.kvarOd !== undefined ? opc.kvarOd : (S.kvarOd || null);
  const m0 = { satiHladno: 0, satiToplo: 0, satiCO2: 0, satiPTV: 0, eFN: 0, eFNoc: 0, ePotr: 0, eUvoz: 0, eIzvoz: 0, eDT: 0, eVent: 0, eRasv: 0, eOprema: 0, eEgrij: 0, qGrij: 0, qHlad: 0, qSol: 0, minT: 99, maxT: -99, maxCO2: 0, trosak: 0, kgCO2: 0 };
  const M = Object.assign({}, m0);
  const povijest = [];          /* jedan zapis po 5 min */
  let zadnje = null;

  function mjerenja(fz) {
    const k = st.kvarovi;
    return {
      T_UN: k.has('tun') ? 23.0 : st.tUn, T_VAN: fz.tVan, G_SUN: fz.ghi,
      CO2: k.has('co2') ? 450 : st.co2, E_LUX: fz.lux, PRIS: fz.N > 0,
      T_KOL: st.tKol, T_SPR: st.tSpr, P_FN: fz.pFN, P_MR: fz.pMR, DP_F: fz.dp, DT_ERR: k.has('dt'),
    };
  }

  function korak(dt = KORAK) {
    const sat = st.t / 3600;
    if (kvarOd && !st.kvarovi.has(kvarOd.id) && sat >= kvarOd.sat) st.kvarovi.add(kvarOd.id);
    const k = st.kvarovi;
    const obl = S.obl[Math.min(23, Math.floor(sat))];
    const sun = sunce(S.dan, sat, obl);
    const tVan = tVani(sat, S.tMin, S.tMax);
    const N = osobe(sat, S.radni);

    /* izlazi iz prethodnog ciklusa PLC-a (ulazi se mjere na početku ciklusa) */
    const prije = zadnje ? zadnje.izlazi : { GRIJ: false, HLAD: false, VENT: 1, BYP: false, ZAL: false, RASV: 0, SPUMP: false, EGRIJ: false };
    const iz = Object.assign({}, prije);
    for (const key in st.man) if (st.man[key] !== null && st.man[key] !== undefined) iz[key] = st.man[key];

    /* svjetlo */
    const dnevno = 0.03 * 115 * sun.ghi * (iz.ZAL ? 0.4 : 1);
    const lux = dnevno + (iz.RASV / 100) * p.lux;

    /* električna potrošnja */
    const filtar = k.has('filtar');
    const protok = PROTOK[iz.VENT] * (filtar ? 0.5 : 1);
    const pVent = 0.45 * PROTOK[iz.VENT] * (filtar ? 1.2 : 1) / 1000;          /* kW */
    const dp = PROTOK[iz.VENT] ? 80 * Math.pow(PROTOK[iz.VENT] / 2400, 2) * (filtar ? 3.8 : 1) : 0;
    const pRasv = PRETP.rasvjeta.v * POV / 1000 * iz.RASV / 100;
    const pOprema = 1.5 + PRETP.oprema.v * POV / 1000 * N / PRETP.osobe.v;
    let qDT = 0, pDT = 0;
    const dtRadi = !k.has('dt');
    if (iz.GRIJ && dtRadi && !iz.HLAD) { qDT = ucinGrij(tVan); pDT = qDT / copGrij(tVan) / 1000; }
    else if (iz.HLAD && dtRadi && !iz.GRIJ) { qDT = -ucinHlad(tVan); pDT = -qDT / eerHlad(tVan) / 1000; }
    const pEgrij = iz.EGRIJ && st.tSpr < 85 ? 6 : 0;
    const crpka = iz.SPUMP && !k.has('spump');
    const pCrpka = iz.SPUMP ? 0.08 : 0;
    const pPotr = pVent + pRasv + pOprema + pDT + pEgrij + pCrpka;
    const fnOcek = fnSnaga(sun.poaFN, tVan);
    const pFN = k.has('izmj') ? 0 : fnOcek;
    const pMR = pPotr - pFN;

    /* toplina prostora */
    const g = 0.35, fc = iz.ZAL ? 0.25 : 1;
    const qSol = (PRETP.okna.v / 2 * sun.juzna + PRETP.okna.v / 2 * sun.difVert) * g * fc;
    const qUnutr = N * 80 + (pRasv + pOprema - 0.75) * 1000;   /* pola stalne potrošnje (poslužitelji) je izvan grijanog prostora */
    const eta = iz.BYP ? 0 : PRETP.rekup.v / 100;
    const hVent = 0.34 * protok * (1 - eta);
    const qGub = (PRETP.Htr.v + hVent) * (st.tUn - tVan);
    st.tUn += (qDT + qSol + qUnutr - qGub) / C_ZG * dt;

    /* CO₂ */
    st.co2 += ((N * 0.018 * 1e6) - protok * (st.co2 - 420)) / VZR / 3600 * dt;
    st.co2 = Math.max(420, st.co2);

    /* solarni krug i spremnik */
    const qKolDob = PRETP.kolektori.v * (0.78 * sun.poaKol - 3.5 * (st.tKol - tVan));
    const qPrijenos = crpka ? MCP_KOL * (st.tKol - st.tSpr) : 0;
    st.tKol += (qKolDob - qPrijenos) / C_KOL * dt;
    st.tKol = Math.max(tVan - 3, st.tKol);
    const lh = ptvLh(sat, S.radni);
    const qPotr = lh / 3600 * 4186 * (45 - 12);
    st.tSpr += (Math.max(0, qPrijenos) + pEgrij * 1000 - 3 * (st.tSpr - 20) - qPotr) / C_SPR * dt;
    if (iz.SPUMP && !crpka && st.tKol - st.tSpr > 15) st.z.spumpBezHl += dt; else st.z.spumpBezHl = 0;

    /* mjerenja i ciklus PLC-a za sljedeći korak */
    const fz = { tVan, ghi: sun.ghi, N, lux, pFN, pMR, dp };
    const m = mjerenja(fz);
    const out = plc(m, p, st.z, sat);
    const al = alarmi(m, iz, st.z, fnOcek);
    zadnje = { izlazi: out.izlazi, uvjeti: out.uvjeti, m, iz, al, sat,
      snage: { pFN, fnOcek, pPotr, pMR, pDT, pVent, pRasv, pOprema, pEgrij, pCrpka, qDT, qSol, qUnutr, qGub, qPrijenos, protok, hVent },
      stvarno: { tUn: st.tUn, co2: st.co2, tSpr: st.tSpr, tKol: st.tKol }, sun, obl, N };

    /* pokazatelji */
    const h = dt / 3600;
    M.eFN += pFN * h; M.eFNoc += fnOcek * h; M.ePotr += pPotr * h;
    if (pMR > 0) { M.eUvoz += pMR * h; M.trosak += 0.15 * pMR * h; M.kgCO2 += PRETP.mreza.v * pMR * h; }
    else { M.eIzvoz += -pMR * h; M.trosak -= 0.06 * -pMR * h; }
    M.eDT += pDT * h; M.eVent += pVent * h; M.eRasv += pRasv * h; M.eOprema += pOprema * h; M.eEgrij += pEgrij * h;
    if (qDT > 0) M.qGrij += qDT / 1000 * h; else M.qHlad += -qDT / 1000 * h;
    M.qSol += Math.max(0, qPrijenos) / 1000 * h;
    if (nastava(sat)) {
      if (st.tUn < 20) M.satiHladno += h;
      if (st.tUn > 26) M.satiToplo += h;
      if (st.co2 > 1200) M.satiCO2 += h;
      M.minT = Math.min(M.minT, st.tUn); M.maxT = Math.max(M.maxT, st.tUn); M.maxCO2 = Math.max(M.maxCO2, st.co2);
    }
    if (sat >= 7 && sat < 16 && st.tSpr < 44) M.satiPTV += h;

    st.t += dt;
    if (Math.round(st.t) % 300 === 0) povijest.push({
      t: st.t / 3600, pFN, pPotr, pMR, tUn: m.T_UN, tUnS: st.tUn, tVan, tSpr: st.tSpr, co2: m.CO2, co2S: st.co2,
      rasv: iz.RASV, vent: iz.VENT, grij: iz.GRIJ, hlad: iz.HLAD, ghi: sun.ghi, fnOcek,
    });
    return zadnje;
  }

  function pokazatelji() {
    const vl = M.eFN > 0 ? (M.eFN - M.eIzvoz) / M.eFN * 100 : 0;
    const sd = M.ePotr > 0 ? (M.eFN - M.eIzvoz) / M.ePotr * 100 : 0;
    return Object.assign({}, M, { vlastita: vl, samodostatnost: sd, izgubljeno: M.eFNoc - M.eFN });
  }

  function doKraja(doSat = 24) { while (st.t < doSat * 3600 - 1e-6) korak(); return zadnje; }

  return { S, p, st, korak, doKraja, pokazatelji, povijest, get zadnje() { return zadnje; } };
}

/* ================================================================== provjera cilja scenarija */
export function provjeri(S, pok, dijagnoza, tocno) {
  return (S.provjera || []).map((c) => {
    let v = c.m === 'dijagnoza' ? dijagnoza : pok[c.m];
    const cilj = c.v === '?' ? tocno : c.v;
    let ok;
    if (c.op === '<=') ok = v <= cilj + 1e-9;
    else if (c.op === '>=') ok = v >= cilj - 1e-9;
    else ok = v === cilj;
    return { t: c.t, v, cilj, op: c.op, ok };
  });
}
