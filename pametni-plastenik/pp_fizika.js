/* FORTRONIQ · Pametni plastenik — fizikalni model i program PLC-a (bez ovisnosti o pregledniku).
   Toplinska bilanca jedne zone (specifikacija):  C · dT/dt = Q_sunce + Q_grijač − UA·(T − T_van) − ṁ·c_p·(T − T_van)
     Q_sunce = G · A · τ · (1 − zasjena), umanjen za dio koji biljke troše na transpiraciju.
   Vlaga tla: bilanca vode (navodnjavanje +0,5 %/min; evapotranspiracija prema ozračenju, temperaturi i vodi u tlu).
   Vlaga zraka: transpiracija dodaje, izmjena zraka odnosi, iznad zasićenja kondenzira (Magnusova formula).
   Indeks stresa: raste izvan 15–30 °C ili 30–60 % vlage tla; iznad 50 biljke propadaju.
   Sve brojke su procjena prve verzije (pp_podaci.js → PRETP). © ForTroniQ d.o.o. */

import { PRETP, PLASTENIK, SCENARIJI, PARAMETRI, KLIMA } from './pp_podaci.js';

export const KORAK = PRETP.korak.v;                      /* 1 s */
const DEG = Math.PI / 180, cl = (x, a, b) => Math.min(b, Math.max(a, x));
const A = 160, C = PRETP.C.v * 1e6, UA = PRETP.UA.v * 1000, TAU = PRETP.tau.v, CP = 1005;
const M_PROZOR = PRETP.prozor.v, M_VENT = PRETP.ventilator.v, VOL = PRETP.volumen.v;

/* ================================================================== sunce i vrijeme */
export function sunce(dan, sat, obl, sirina = PLASTENIK.sirina) {
  const ljetno = dan >= 88 && dan <= 298;
  const solarni = sat - (ljetno ? 1 : 0) - (17.7 - 15) / 15;
  const dekl = 23.45 * Math.sin(2 * Math.PI * (284 + dan) / 365) * DEG;
  const om = 15 * (solarni - 12) * DEG, fi = sirina * DEG;
  const sinh = Math.sin(fi) * Math.sin(dekl) + Math.cos(fi) * Math.cos(dekl) * Math.cos(om);
  if (sinh <= 0.01) return { sinh: Math.max(0, sinh), G: 0 };
  const vedro = 1098 * sinh * Math.exp(-0.057 / sinh);
  return { sinh, G: vedro * (1 - 0.75 * Math.pow(cl(obl, 0, 1), 3.4)) };
}
export function tVani(sat, tMin, tMax) {
  let t = sat; if (t < 5) t += 24;
  const a = tMax - tMin;
  return t <= 15 ? tMin + a * (0.5 - 0.5 * Math.cos(Math.PI * (t - 5) / 10)) : tMin + a * (0.5 + 0.5 * Math.cos(Math.PI * (t - 15) / 14));
}
export const xSat = (T) => 216.7 * 6.112 * Math.exp(17.62 * T / (243.12 + T)) / (T + 273.15);   /* g/m³ */

export function zadaniParametri() { const p = {}; PARAMETRI.forEach((x) => { p[x.id] = x.v; }); return p; }

/* ================================================================== PLC (zadani program) */
export function plc(m, p, z, sat) {
  const u = {};
  /* 1 navodnjavanje (SR) */
  if (m.TLO < p.tloOn) z.ventil = true;
  if (m.TLO > p.tloOff) z.ventil = false;
  u.ventil = { s: m.TLO < p.tloOn, r: m.TLO > p.tloOff, mem: z.ventil };
  /* 2–3 krovni prozor (SR na temperaturi, motor do krajnjeg prekidača) */
  if (m.T_UN > p.pOtv) z.prozor = true;
  if (m.T_UN < p.pZat) z.prozor = false;
  const OTVORI = z.prozor && !m.P_OTV, ZATVORI = !z.prozor && !m.P_ZAT;
  u.prozor = { s: m.T_UN > p.pOtv, r: m.T_UN < p.pZat, mem: z.prozor };
  /* 4 grijač (SR, samo kad je prozor zatvoren) */
  if (m.T_UN < p.gOn) z.grij = true;
  if (m.T_UN > p.gOff) z.grij = false;
  const GRIJ = z.grij && m.P_ZAT;
  u.grij = { s: m.T_UN < p.gOn, r: m.T_UN > p.gOff, mem: z.grij, zat: m.P_ZAT };
  /* 5 zasjena (SR na ozračenju) */
  if (m.G > p.zOn) z.zas = true;
  if (m.G < p.zOff) z.zas = false;
  u.zas = { s: m.G > p.zOn, r: m.G < p.zOff, mem: z.zas };
  /* 6 ventilator (histereza 1 K / 3 %) */
  const vOn = m.T_UN > p.vT || m.RH > p.vRH;
  const vOff = m.T_UN < p.vT - 1 && m.RH < p.vRH - 3;
  if (vOn) z.vent = true; if (vOff) z.vent = false;
  u.vent = { t: m.T_UN > p.vT, rh: m.RH > p.vRH, mem: z.vent };
  /* 7 dopunska rasvjeta */
  const LED = !!p.led && m.G < 50 && sat >= 6 && sat < 20;
  u.led = { en: !!p.led, tamno: m.G < 50, vrijeme: sat >= 6 && sat < 20 };
  return { izlazi: { VENTIL: !!z.ventil, OTVORI, ZATVORI, GRIJ, ZAS: !!z.zas, VENT: !!z.vent, LED }, uvjeti: u };
}

/* ================================================================== alarmi */
function alarmi(m, iz, z, st) {
  const a = [];
  if (z.ventilT > 1200 && st.tlo <= z.ventilTlo0 + 1) a.push({ id: 'ventil', t: 'Navodnjavanje: ventil ima nalog ' + Math.round(z.ventilT / 60) + ' min, a vlaga tla ne raste' });
  if (z.otvT > 2 * PRETP.hod.v) a.push({ id: 'prozor', t: 'Krovni prozor: nalog OTVORI, krajnji prekidač „otvoren“ ne javlja' });
  if (z.zatT > 2 * PRETP.hod.v) a.push({ id: 'prozorZ', t: 'Krovni prozor: nalog ZATVORI, krajnji prekidač „zatvoren“ ne javlja' });
  if (z.grijT > 1800 && m.T_UN < z.grijT0 - 0.3) a.push({ id: 'grijac', t: 'Grijač: nalog 30 min, a temperatura i dalje pada' });
  if (m.T_UN > 35) a.push({ id: 'vruce', t: 'Previsoka temperatura zraka: ' + m.T_UN.toFixed(1).replace('.', ',') + ' °C' });
  if (m.T_UN < 3) a.push({ id: 'hladno', t: 'Preniska temperatura zraka: ' + m.T_UN.toFixed(1).replace('.', ',') + ' °C' });
  if (m.TLO < 22) a.push({ id: 'suho', t: 'Tlo presuho: ' + Math.round(m.TLO) + ' %' });
  if (z.rhT > 4 * 3600) a.push({ id: 'rh', t: 'Vlaga zraka iznad 90 % više od 4 h — rizik bolesti' });
  if (st.S > 50) a.push({ id: 'stres', t: 'Biljke u stresu: indeks ' + Math.round(st.S) });
  return a;
}

/* ================================================================== plastenik */
let sjeme = 1;
const slucajno = () => { sjeme = (sjeme * 16807) % 2147483647; return (sjeme - 1) / 2147483646; };

export function napraviPlastenik(scen, param, opc = {}) {
  const S = typeof scen === 'string' ? SCENARIJI.find((x) => x.id === scen) : scen;
  const p = Object.assign(zadaniParametri(), param || {});
  const t0 = (opc.odSata !== undefined ? opc.odSata : (S.odSata || 0)) * 3600;
  const sezona = S.sezona || 0;
  const xv0 = xSat(S.start.t) * 0.7;
  const st = {
    t: t0, T: S.start.t, x: xv0, tlo: S.start.tlo, poz: 0, S: 0, zdr: 1,
    z: { ventilT: 0, ventilTlo0: 0, otvT: 0, zatT: 0, grijT: 0, grijT0: 0, rhT: 0 },
    kvarovi: new Set(opc.kvarovi || []), man: {}, alarmBio: new Set(),
  };
  const kvarOd = opc.kvarOd !== undefined ? opc.kvarOd : (S.kvarOd || null);
  st.kvarT = null;
  const program = opc.program || plc;
  const M = { stresMax: 0, vodaL: 0, eGrij: 0, eVent: 0, eLed: 0, eMotor: 0, eCrpka: 0, minT: 99, maxT: -99, minTnoc: 99,
    noc: 0, nocGrij: 0, satiRH90: 0, satiStres: 0, dani: [] };
  const povijest = [];
  let zadnje = null, dan = null;
  sjeme = opc.sjeme || 12345;

  function vrijemeDana(tSek) {
    const d = Math.floor(tSek / 86400);
    if (!dan || dan.d !== d) {
      if (sezona) {
        const doy = S.dan + d, mj = Math.min(11, Math.floor((doy - 1) / 30.5)), f = ((doy - 1) / 30.5) - mj;
        const k1 = KLIMA[mj], k2 = KLIMA[Math.min(11, mj + 1)];
        const pom = (slucajno() - 0.5) * 6;
        const o = Math.pow(slucajno(), 1.3);
        dan = { d, doy, tMin: k1[0] + (k2[0] - k1[0]) * f + pom, tMax: k1[1] + (k2[1] - k1[1]) * f + pom, obl: Array.from({ length: 24 }, () => o), rhVan: 55 + o * 35 };
      } else dan = { d, doy: S.dan + d, tMin: S.tMin, tMax: S.tMax, obl: S.obl, rhVan: S.rhVan };
    }
    return dan;
  }

  function mjeri(fz) {
    const k = st.kvarovi;
    return {
      T_UN: k.has('tzrak') ? 20 : st.T, T_VAN: fz.tVan, RH: Math.min(100, 100 * st.x / xSat(st.T)),
      TLO: k.has('tlo50') ? 50 : st.tlo, G: fz.G, P_OTV: st.poz >= 0.999, P_ZAT: st.poz <= 0.001,
    };
  }

  function korak(dt = KORAK) {
    const sat = (st.t / 3600) % 24;
    if (kvarOd && !st.kvarovi.has(kvarOd.id) && st.t - t0 >= ((kvarOd.sat - t0 / 3600 + 24) % 24) * 3600) { st.kvarovi.add(kvarOd.id); st.kvarT = st.t; }
    const k = st.kvarovi;
    const D = vrijemeDana(st.t);
    const obl = D.obl[Math.min(23, Math.floor(sat))];
    const su = sunce(D.doy, sat, obl);
    const tVan = tVani(sat, D.tMin, D.tMax);
    const prije = zadnje ? zadnje.izlazi : { VENTIL: false, OTVORI: false, ZATVORI: false, GRIJ: false, ZAS: false, VENT: false, LED: false };
    const iz = Object.assign({}, prije);
    for (const key in st.man) if (st.man[key] !== null && st.man[key] !== undefined) iz[key] = st.man[key];

    /* prozor */
    const hod = PRETP.hod.v;
    const motor = !k.has('prozor') && (iz.OTVORI !== iz.ZATVORI);
    if (motor && iz.OTVORI) st.poz = Math.min(1, st.poz + dt / hod);
    if (motor && iz.ZATVORI) st.poz = Math.max(0, st.poz - dt / hod);

    /* toplina */
    const zas = iz.ZAS ? PRETP.zasjena.v / 100 : 0;
    const qSun = su.G * A * TAU * (1 - zas);
    const voda = cl((st.tlo - 15) / 20, 0, 1);
    const fLat = (PRETP.transp.v / 100) * voda;
    const qGrij = iz.GRIJ && !k.has('grijac') ? PRETP.grijac.v * 1000 : 0;
    const qLed = iz.LED ? PRETP.led.v * 1000 * 0.9 : 0;
    const mdot = M_PROZOR * st.poz + (iz.VENT ? M_VENT : 0) + 0.15;          /* + propuštanje pokrova i vrata */
    const nebo = su.G < 20 ? 25 * A * (1 - obl) : 0;                          /* noćno zračenje u vedro nebo */
    const dT = st.T - tVan;
    const qGub = (UA * (1 + Math.max(0, dT - 10) / 20) + mdot * CP) * dT + nebo;   /* uz veliku razliku temperature rastu konvekcija i zračenje pokrova */
    st.T += (qSun * (1 - fLat) + qGrij + qLed - qGub) / C * dt;

    /* vlaga zraka */
    const xVan = xSat(tVan) * D.rhVan / 100;
    const E = qSun * fLat / 2.45e6 * 1000;                                    /* g/s */
    st.x += (E - (mdot / 1.2) * (st.x - xVan)) / VOL * dt;
    st.x = Math.min(st.x, xSat(st.T));

    /* voda u tlu */
    const ventilRadi = iz.VENTIL && !k.has('ventil');
    const gIn = qSun / A;
    const et = (2.5 * gIn / 1000 * (1 + (st.T - 20) / 30) + 0.15) * cl(st.tlo / 30, 0.2, 1);   /* %/h */
    st.tlo += ((ventilRadi ? PRETP.navod.v * 60 : 0) - Math.max(0, et) - (st.tlo > 70 ? 5 : 0)) / 3600 * dt;
    st.tlo = cl(st.tlo, 0, 100);

    /* biljke */
    const dev = Math.max(0, 15 - st.T) / 8 + Math.max(0, st.T - 30) / 3 + Math.max(0, 30 - st.tlo) / 8 + Math.max(0, st.tlo - 60) / 8;
    st.S = cl(st.S + (4 * dev - 3) / 3600 * dt, 0, 100);                       /* biljka se oporavlja 3 boda/h, blago odstupanje podnosi */
    if (st.S > 50) st.zdr -= (st.S - 50) / 50 * 0.06 / 3600 * dt;
    if (st.T < 0) st.zdr -= 0.25 * Math.min(1, -st.T / 3) / 3600 * dt;
    st.zdr = Math.max(0, st.zdr);

    /* nadzor za alarme */
    const z = st.z;
    if (iz.VENTIL) { if (z.ventilT === 0) z.ventilTlo0 = st.tlo; z.ventilT += dt; } else z.ventilT = 0;
    if (iz.OTVORI && !(st.poz >= 0.999)) z.otvT += dt; else z.otvT = 0;
    if (iz.ZATVORI && !(st.poz <= 0.001)) z.zatT += dt; else z.zatT = 0;
    if (iz.GRIJ) { if (z.grijT === 0) z.grijT0 = st.T; z.grijT += dt; } else z.grijT = 0;

    const fz = { tVan, G: su.G };
    const m = mjeri(fz);
    if (m.RH > 90) z.rhT += dt; else z.rhT = 0;
    const out = program(m, p, st.z, sat);
    const al = alarmi(m, iz, st.z, st);
    al.forEach((x) => st.alarmBio.add(x.id));
    const snage = {
      grij: qGrij ? PRETP.grijac.v : 0, vent: iz.VENT ? 0.75 : 0, led: iz.LED ? PRETP.led.v : 0, motor: motor ? 0.2 : 0, crpka: iz.VENTIL ? 0.5 : 0,
      qSun, qGub, fLat, mdot, gIn, et, qGrij,
    };
    snage.uk = snage.grij + snage.vent + snage.led + snage.motor + snage.crpka;
    zadnje = { izlazi: out.izlazi, uvjeti: out.uvjeti, m, iz, al, sat, snage, su, obl, stvarno: { T: st.T, tlo: st.tlo, poz: st.poz }, D };

    /* pokazatelji */
    const h = dt / 3600;
    if (ventilRadi) M.vodaL += PRETP.voda.v * 1000 * h;
    M.eGrij += snage.grij * h; M.eVent += snage.vent * h; M.eLed += snage.led * h; M.eMotor += snage.motor * h; M.eCrpka += snage.crpka * h;
    M.stresMax = Math.max(M.stresMax, st.S); M.minT = Math.min(M.minT, st.T); M.maxT = Math.max(M.maxT, st.T);
    if (su.G < 5) { M.noc += h; if (qGrij) M.nocGrij += h; M.minTnoc = Math.min(M.minTnoc, st.T); }
    if (m.RH > 90) M.satiRH90 += h;
    if (st.S > 50) M.satiStres += h;

    st.t += dt;
    const korakP = sezona ? 3600 : 300;
    if (Math.round(st.t) % korakP === 0) povijest.push({
      t: (st.t - t0) / 3600, T: m.T_UN, Ts: st.T, tVan, RH: m.RH, tlo: m.TLO, tloS: st.tlo, G: su.G, gIn, S: st.S, zdr: st.zdr * 100,
      prozor: st.poz, grij: !!qGrij, ventil: iz.VENTIL,
    });
    if (sezona && Math.round(st.t) % 86400 === 0) M.dani.push({ d: Math.round((st.t - t0) / 86400), S: st.S, zdr: st.zdr * 100, vodaL: M.vodaL, e: M.eGrij + M.eVent + M.eLed + M.eMotor + M.eCrpka });
    return zadnje;
  }

  function pokazatelji() {
    const eUk = M.eGrij + M.eVent + M.eLed + M.eMotor + M.eCrpka;
    return Object.assign({}, M, {
      eUk, vodaM3: M.vodaL / 1000, prezivjele: st.zdr * 100, biljke: Math.round(PRETP.biljke.v * st.zdr),
      grijacUdio: M.noc > 0 ? M.nocGrij / M.noc * 100 : 0, trosak: eUk * PRETP.cijena.v + M.vodaL / 1000 * 1.5,
      alarmVentil: st.alarmBio.has('ventil'), bodovi: Math.round(1000 * st.zdr - (0.1 * M.vodaL + 2 * eUk) / (sezona || 1)),
    });
  }
  const trajanje = (sezona || 1) * 86400;
  function doKraja() { const dt = sezona ? 10 : KORAK; while (st.t - t0 < trajanje - 1e-6) korak(dt); return zadnje; }
  return { S, p, st, t0, trajanje, korak, doKraja, pokazatelji, povijest, get zadnje() { return zadnje; } };
}

export function provjeri(S, pok, dij) {
  return (S.provjera || []).map((c) => {
    let v = c.m === 'dijagnoza' ? dij.uzrok : c.m === 'vrijemeDijag' ? dij.sati : pok[c.m];
    let ok;
    if (v === null || v === undefined) ok = false;
    else if (c.op === '<=') ok = v <= c.v + 1e-9;
    else if (c.op === '>=') ok = v >= c.v - 1e-9;
    else if (c.op === '<') ok = v < c.v;
    else if (c.op === '>') ok = v > c.v;
    else ok = v === c.v;
    return { t: c.t, v, cilj: c.v, op: c.op, ok };
  });
}
