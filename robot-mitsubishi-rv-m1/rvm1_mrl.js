/* FORTRONIQ · Mitsubishi Movemaster EX RV-M1 — interpreter jezika Movemaster i stroj stanja upravljačke jedinice DUM1
   (izravne naredbe s računala, program s brojevima redaka, privjesak, SIM RV / vanjski I/O, pogreške I. i II. vrste).
   Čisti ES modul bez DOM-a: radi u Node-u i pregledniku. Kinematiku dobiva kao parametar `kin` (ugovor rvm1_kin.js),
   sve brojeve i tekstove iz `podaci` (rvm1_podaci.js; zadano rvm1_jezik_podaci.js).
   Jedinice: q u radijanima, stanje.tl u metrima, pozicije i odgovori kao na robotu (mm, °, 0,1).
   Ugovor: API_RVM1.md. © ForTroniQ d.o.o. */
import * as JP from './rvm1_jezik_podaci.js';

const RAD = Math.PI / 180;
const ORG_ZADANO_DEG = [0, 90, -90, -90, 0];
const GRANICE_ZADANO_DEG = [[-150, 150], [-30, 100], [-110, 0], [-90, 90], [-180, 180]];
const VMAX_ZADANO = [120, 72, 109, 100, 163];
const CITANJE = new Set(['CR', 'DR', 'ER', 'LR', 'PR', 'WH']);

/* ================================================================== pomoćne funkcije */
const pad = (n, d) => String(Math.max(0, Math.trunc(n))).padStart(d, '0').slice(-d);
const wrap16 = (v) => { v = ((v % 65536) + 65536) % 65536; return v > 32767 ? v - 65536 : v; };
const r01 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const kopijaPoz = (t) => (t ? { x: t.x, y: t.y, z: t.z, p: t.p, r: t.r, oc: t.oc ?? null } : t);

/** broj u zapisu odgovora: +250.0 / -90.0 / +0.0 */
export function fmtBroj(v, dec = 1) {
  const f = 10 ** dec;
  let r = Math.round(v * f) / f;
  if (Object.is(r, -0) || r === 0) r = 0;
  return (r >= 0 ? '+' : '-') + Math.abs(r).toFixed(dec);
}
/** pozicija u zapisu odgovora na WH/PR (format iz podaci.FORMAT_ODGOVORA) */
export function fmtPozicija(t, format = JP.FORMAT_ODGOVORA) {
  const f = (format && format.pozicija) || { decimale: 1, razdjelnik: ',' };
  return [t.x, t.y, t.z, t.p, t.r].map((v) => fmtBroj(v, f.decimale ?? 1)).join(f.razdjelnik ?? ',');
}

/** kutovi iz podataka (stupnjevi ili radijani, polje ili objekt) → radijani */
function uRad(v, zadanoDeg) {
  let arr = null, deg = false;
  if (Array.isArray(v)) arr = v;
  else if (v && typeof v === 'object') {
    for (const k of ['q', 'rad', 'kutovi', 'polozaj']) if (Array.isArray(v[k])) { arr = v[k]; break; }
    if (!arr) for (const k of ['deg', 'stupnjevi', 'qDeg', 'kutoviDeg', 'polozajDeg']) if (Array.isArray(v[k])) { arr = v[k]; deg = true; break; }
  }
  if (!arr || arr.length < 5 || arr.some((a) => typeof a !== 'number')) return zadanoDeg.map((d) => d * RAD);
  if (deg || arr.some((a) => Math.abs(a) > 2 * Math.PI + 1e-6)) return arr.slice(0, 5).map((d) => d * RAD);
  return arr.slice(0, 5);
}

/* ================================================================== pogreška II (interno) */
class G2 extends Error {
  constructor(kod, poruka) { super(poruka); this.kod = kod; }
}
const g2 = (kod, poruka) => { throw new G2(kod, poruka); };

/* ================================================================== parser */
function mapaNaredbi(n) {
  if (!n) return JP.NAREDBA_PO_KODU;
  if (Array.isArray(n)) return Object.fromEntries(n.map((x) => [x.kod, x]));
  return n;
}

/**
 * Raščlanjuje jedan redak („MO 5, C”, „10 MO 20”, „' komentar”).
 * → { broj?, kod, arg:[], tekst, greska? }   greska = { tip:2, kod:'II-…', poruka }
 * arg: cijeli/decimalni → broj, O/C i H/L → slovo, ±bit → { znak:'+'|'-', bit }
 */
export function parsiraj(redak, naredbe) {
  const NAR = mapaNaredbi(naredbe);
  const maxDulj = (JP.JEZIK && JP.JEZIK.maxDuljinaRetka) || 127;
  const out = { broj: undefined, kod: null, arg: [], tekst: '' };
  const greska = (kod, poruka) => { out.greska = { tip: 2, kod, poruka }; return out; };
  let s = String(redak ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!s) { out.prazno = true; return out; }
  const m = /^(\d+)(?:\s+|(?=')|$)(.*)$/.exec(s);
  if (m) {
    out.broj = parseInt(m[1], 10);
    if (!(out.broj >= 1 && out.broj <= 2048)) return greska('II-REDAK', 'broj retka ' + m[1] + ' izvan 1–2048');
    s = m[2].trim();
    if (!s) { out.brisi = true; return out; }
  }
  if (s.length > maxDulj) return greska('II-REDAK', 'redak je dulji od ' + maxDulj + ' znakova');
  if (s[0] === "'") { out.kod = "'"; out.arg = [s.slice(1).trim()]; out.tekst = s; return out; }
  const up = s.toUpperCase();
  const km = /^([A-Z]{2})\s*(.*)$/.exec(up);
  if (!km) return greska('II-NAREDBA', 'nepoznata naredba: ' + s.slice(0, 12));
  const kod = km[1], def = NAR[kod];
  if (!def) return greska('II-NAREDBA', 'nepoznata naredba ' + kod);
  out.kod = kod;
  const ostatak = km[2].trim();
  const tok = ostatak === '' ? [] : ostatak.split(',').map((t) => t.trim());
  if (tok.some((t) => t === '')) return greska('II-FORMAT', kod + ': prazan argument');
  const argDef = def.argumenti || [];
  if (tok.length > argDef.length) return greska('II-FORMAT', kod + ': previše argumenata (najviše ' + argDef.length + ')');
  const obvezno = argDef.filter((a) => !a.opcionalno).length;
  if (tok.length < obvezno) return greska('II-FORMAT', kod + ': nedostaje argument (' + def.sintaksa + ')');
  for (let i = 0; i < tok.length; i++) {
    const a = argDef[i], t = tok[i];
    let v;
    if (a.tip === 'cijeli') {
      if (/^[+-]?\d+$/.test(t)) v = parseInt(t, 10);
      else if (a.hex && /^&[0-9A-F]{1,4}$/.test(t)) v = wrap16(parseInt(t.slice(1), 16));
      else return greska('II-FORMAT', kod + ': „' + t + '” nije cijeli broj (' + a.ime + ')');
      if (v < a.min || v > a.max) return greska('II-RASPON', kod + ': ' + a.ime + ' = ' + v + ' izvan ' + a.min + '…' + a.max);
    } else if (a.tip === 'decimalni') {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return greska('II-FORMAT', kod + ': „' + t + '” nije broj (' + a.ime + ')');
      v = r01(parseFloat(t));
      if (v < a.min || v > a.max) return greska('II-RASPON', kod + ': ' + a.ime + ' = ' + v + ' izvan ' + a.min + '…' + a.max);
    } else if (a.tip === 'oc') {
      if (t !== 'O' && t !== 'C') return greska('II-FORMAT', kod + ': očekuje se O ili C');
      v = t;
    } else if (a.tip === 'hl') {
      if (t !== 'H' && t !== 'L') return greska('II-FORMAT', kod + ': očekuje se H ili L');
      v = t;
    } else if (a.tip === 'bitZnak') {
      const bm = /^([+-]?)(\d+)$/.exec(t);
      if (!bm) return greska('II-FORMAT', kod + ': očekuje se ±broj bita');
      v = { znak: bm[1] === '-' ? '-' : '+', bit: parseInt(bm[2], 10) };
      if (v.bit < a.min || v.bit > a.max) return greska('II-RASPON', kod + ': bit ' + v.bit + ' izvan ' + a.min + '…' + a.max);
    } else v = t;
    out.arg.push(v);
  }
  out.tekst = kod + (tok.length ? ' ' + tok.join(', ') : '');
  return out;
}

/* ================================================================== stroj stanja DUM1 */
export function napraviDUM1({ kin, podaci } = {}) {
  if (!kin || typeof kin.ik !== 'function' || typeof kin.fk !== 'function') throw new Error('napraviDUM1: potreban je parametar kin (rvm1_kin.js)');
  const P = { ...JP, ...(podaci || {}) };
  const Z = { ...JP.UPRAVLJANJE_ZADANO, ...(P.UPRAVLJANJE_ZADANO || {}) };
  const NAR = mapaNaredbi(P.NAREDBE);
  const FORMAT = P.FORMAT_ODGOVORA || JP.FORMAT_ODGOVORA;
  const PAL = P.PALETA || JP.PALETA;
  const ORGQ = uRad(P.ORG, ORG_ZADANO_DEG);
  const NESTQ = uRad(P.NEST, [ORG_ZADANO_DEG[0], ORG_ZADANO_DEG[1], ORG_ZADANO_DEG[2], ORG_ZADANO_DEG[3], 179.9]);
  const tlP = typeof P.TL_ZADANO === 'number' ? P.TL_ZADANO : 107;
  const TL0 = tlP > 1 ? tlP / 1000 : tlP;
  const SP0 = (P.BRZINE && Number.isInteger(P.BRZINE.zadano)) ? P.BRZINE.zadano : Z.sp;
  const IO_BITA = (P.KONFIG && P.KONFIG.ioKartica === 'A16B16') ? 16 : 8;
  const IO_MASKA = (1 << IO_BITA) - 1;
  const OSI_GR = Array.isArray(P.OSI) && P.OSI.length >= 5 && P.OSI.every((o) => typeof o.min === 'number')
    ? P.OSI.slice(0, 5).map((o) => (Math.max(Math.abs(o.min), Math.abs(o.max)) > 2 * Math.PI + 1e-6 ? [o.min * RAD, o.max * RAD] : [o.min, o.max]))
    : GRANICE_ZADANO_DEG.map(([a, b]) => [a * RAD, b * RAD]);
  const VMAX = Array.isArray(P.OSI) && P.OSI.length >= 5 && P.OSI.every((o) => typeof o.vMax === 'number')
    ? P.OSI.slice(0, 5).map((o) => o.vMax * RAD) : VMAX_ZADANO.map((v) => v * RAD);
  const sw1Zadano = [null, ...(P.DUM1_PLOCA || JP.DUM1_PLOCA).sw1.map((b) => !!b.zadano)];

  /* ---- kinematika s rezervnim funkcijama ---- */
  const K = {
    fk: (q, tl) => kin.fk(q, tl),
    ik: (t, tl, qRef) => kin.ik(t, tl, qRef || st.q),
    uTocku: kin.uTocku ? (q, tl, oc) => kin.uTocku(q, tl, oc) : (q, tl, oc) => { const f = kin.fk(q, tl); return { x: f.p[0] * 1000, y: f.p[1] * 1000, z: f.p[2] * 1000, p: f.P / RAD, r: f.R / RAD, oc }; },
    izTocke: kin.izTocke ? (t) => kin.izTocke(t) : (t) => ({ x: t.x / 1000, y: t.y / 1000, z: t.z / 1000, P: t.p * RAD, R: t.r * RAD }),
    linearno: kin.linearno ? (a, b, s) => kin.linearno(a, b, s) : (a, b, s) => { const o = {}; for (const k of ['x', 'y', 'z', 'P', 'R']) o[k] = a[k] + (b[k] - a[k]) * s; return o; },
    trajanje: kin.trajanje ? (a, b, sp, ub) => kin.trajanje(a, b, sp, ub || null) : (a, b, sp) => { let t = 0; for (let i = 0; i < 5; i++) t = Math.max(t, Math.abs(b[i] - a[i]) / (VMAX[i] * (sp + 1) / 10)); return t; },
    uGranicama: kin.uGranicama ? (q) => kin.uGranicama(q) : (q) => { for (let i = 0; i < 5; i++) if (q[i] < OSI_GR[i][0] - 1e-9 || q[i] > OSI_GR[i][1] + 1e-9) return { ok: false, os: i }; return { ok: true, os: -1 }; },
    interp: kin.interpolirajZglobno ? (a, b, s) => kin.interpolirajZglobno(a, b, s) : (a, b, s) => a.map((v, i) => v + (b[i] - v) * s)
  };

  /* ---- stanje ---- */
  const st = {
    napajanje: false, servo: false, nestGotov: false,
    greska: { tip: 0, led: null, kod: null, poruka: '', redak: null },
    izvodi: false, redak: null, privjesakON: false,
    sp: SP0, ubrzanje: Z.ubrzanje, tl: TL0,
    prihvatnica: { zatvorena: false, otvorenost: 1, sila: { ...Z.gp } },
    gf: Z.gf || 0,
    q: ORGQ.slice(),
    pozicije: new Map(), program: new Map(),
    brojila: new Array(100).fill(0), registar: 0,
    ulazi: 0, izlazi: 0,
    signali: { STB: 0, ACK: 0, RDY: 0, BUSY: 0 },
    rc: [], gs: [], prekidi: new Map(), palete: new Map(),
    eprom: { program: new Map(), pozicije: new Map(), upisano: false },
    preklopnici: { sw1: sw1Zadano.slice(), st1: (P.DUM1_PLOCA || JP.DUM1_PLOCA).st1.zadano, st2: false, hand: 'DC' },
    led: { power: false, error: false, execute: false, LED1: false, LED2: false, LED3: false, LED4: false, LED5: false },
    emg: { dum1: false, privjesak: false, vanjski: false },
    pokazivacPozicije: 0, org: ORGQ.slice(), nacin: 'PTP', kocniceOtpustene: false,
    vrijeme: 0, aktivnost: null
  };
  Object.defineProperty(st, 'usporedni', { get: () => st.registar, enumerable: true });

  /* ---- događaji ---- */
  const slusaci = {};
  function emit(d, x) {
    (slusaci[d] || []).slice().forEach((fn) => { try { fn(x); } catch (e) { if (typeof console !== 'undefined') console.error(e); } });
  }
  function na(d, fn) { (slusaci[d] = slusaci[d] || []).push(fn); return () => { slusaci[d] = (slusaci[d] || []).filter((f) => f !== fn); }; }

  /* ---- program: sortirani redci ---- */
  let redci = [];
  const osvjeziRedke = () => { redci = [...st.program.keys()].sort((a, b) => a - b); };
  const prviRedak = () => (redci.length ? redci[0] : null);
  const sljedeciRedak = (ln) => { for (const r of redci) if (r > ln) return r; return null; };
  const prviOd = (ln) => { for (const r of redci) if (r >= ln) return r; return null; };

  const prog = { sljedeci: null, trenutni: null, do: null, korak: false, stop: false };
  let akt = null;            // tekuća aktivnost: gibanje, čekanje, rukovanje, prihvatnica
  const red = [];            // naredbe s PC-a koje čekaju
  let uTecenju = false;

  /* ---- prikaz na privjesku ---- */
  let zaslonTekst = '    ';
  function postaviZaslon(t) {
    t = String(t).padEnd(4, ' ').slice(0, 4);
    if (t !== zaslonTekst) { zaslonTekst = t; emit('zaslon', t); }
  }

  /* ---- LED i zujalo ---- */
  function zujalo(vrsta, ukljuceno) { if (st.preklopnici.sw1[8] || vrsta === 'tipka' || vrsta === 'kratko') emit('zvuk', { vrsta, ukljuceno }); }
  function osvjeziLED() {
    const L = st.led, prije = JSON.stringify(L);
    L.power = st.napajanje;
    L.execute = st.napajanje && (!!akt || st.izvodi);
    const T = Z.treptanjeError || 0.5;
    L.error = st.greska.tip === 2 ? true : st.greska.tip === 1 ? Math.floor(st.vrijeme / T) % 2 === 0 : false;
    if (JSON.stringify(L) !== prije) emit('led', { ...L });
  }

  /* ---- pogreške ---- */
  function greskaII(kod, poruka, redak) {
    const ln = redak !== undefined ? redak : (st.izvodi ? prog.trenutni : null);
    st.greska = { tip: 2, led: null, kod, poruka, redak: ln ?? null };
    st.izvodi = false; prog.korak = false; prog.stop = false;
    if (akt && akt.vrsta === 'gibanje') emit('gibanje', { faza: 'prekid', naredba: akt.naredba });
    akt = null; st.aktivnost = null; red.length = 0;
    if (ln != null) postaviZaslon(pad(ln, 4));
    emit('greska', { ...st.greska });
    zujalo('neprekidno', true);
    osvjeziLED();
    return { ...st.greska };
  }
  function greskaI(led, poruka) {
    if (!st.napajanje) return null;
    st.greska = { tip: 1, led, kod: 'I-' + led, poruka, redak: st.izvodi ? prog.trenutni : null };
    st.servo = false; st.nestGotov = false; st.izvodi = false; prog.korak = false; prog.stop = false;
    if (akt && akt.vrsta === 'gibanje') emit('gibanje', { faza: 'prekid', naredba: akt.naredba });
    akt = null; st.aktivnost = null; red.length = 0; tb.jog.clear(); tb.unos = null;
    st.led[led] = true;
    emit('greska', { ...st.greska });
    zujalo('isprekidano', true);
    osvjeziLED();
    return { ...st.greska };
  }
  function ponistiII() {
    if (st.greska.tip !== 2) return false;
    st.greska = { tip: 0, led: null, kod: null, poruka: '', redak: null };
    prog.sljedeci = prviRedak(); prog.trenutni = null; st.redak = null; st.rc = []; st.gs = [];
    emit('greska', { ...st.greska });
    zujalo('neprekidno', false);
    postaviZaslon('    ');
    osvjeziLED();
    return true;
  }

  /* ---- položaj ---- */
  function trenutnaTocka() {
    const t = K.uTocku(st.q, st.tl, st.prihvatnica.zatvorena ? 'C' : 'O');
    return { x: r01(t.x), y: r01(t.y), z: r01(t.z), p: r01(t.p), r: r01(t.r), oc: st.prihvatnica.zatvorena ? 'C' : 'O' };
  }
  function trenutnoKart() { const f = K.fk(st.q, st.tl); return { x: f.p[0], y: f.p[1], z: f.p[2], P: f.P, R: f.R }; }
  function poz(a) { const t = st.pozicije.get(a); if (!t) g2('II-POZICIJA', 'pozicija ' + a + ' nije definirana'); return t; }
  function qZaKart(T, opis, qRef) {
    const r = K.ik(T, st.tl, qRef);
    if (!r || !r.uspjeh || !r.q) g2('II-DOHVAT', (opis || 'točka') + ' nije dohvatljiva' + (r && r.razlog ? ' (' + r.razlog + ')' : ''));
    const g = K.uGranicama(r.q);
    if (!g.ok) g2('II-DOHVAT', (opis || 'točka') + ': J' + (g.os + 1) + ' izvan raspona');
    return r.q.slice(0, 5);
  }
  const qZa = (t, opis) => qZaKart(K.izTocke(t), opis);
  function trebaNest() { if (!st.nestGotov) g2('II-NEST', 'gibanje prije NEST-a (najprije NT)'); }
  const zbroji = (a, b) => ({ x: r01(a.x + b.x), y: r01(a.y + b.y), z: r01(a.z + b.z), p: r01(a.p + b.p), r: r01(a.r + b.r), oc: a.oc ?? null });

  /* ---- aktivnosti ---- */
  const ease = (u) => u * u * (3 - 2 * u);
  function postaviAkt(a) { akt = a; st.aktivnost = a ? a.vrsta : null; }

  /** gibanje kroz jedan ili više poteza; potez = niz zglobnih položaja koji se prelazi neprekinuto */
  function gibaj(potezi, opt = {}) {
    const sp = opt.sp ?? st.sp;
    const pz = [];
    for (const qs of potezi) {
      let ts = [];
      for (let i = 0; i + 1 < qs.length; i++) ts.push(Math.max(0, K.trajanje(qs[i], qs[i + 1], sp, null)));
      let T = ts.reduce((s, x) => s + x, 0);
      if (T > 1e-9) {
        /* vrijeme ubrzanja i usporenja (H/L) dodaje se jednom po potezu, ne po međutočki */
        const k = ts.findIndex((x) => x > 0);
        const dod = Math.max(0, K.trajanje(qs[k], qs[k + 1], sp, st.ubrzanje) - ts[k]);
        if (dod > 0) { const f = (T + dod) / T; ts = ts.map((x) => x * f); T += dod; }
        pz.push({ qs: qs.map((q) => q.slice()), ts, T });
      }
      else if (qs.length) st.q = qs[qs.length - 1].slice();
    }
    if (opt.pokazivac != null) st.pokazivacPozicije = opt.pokazivac;
    const a = { vrsta: 'gibanje', potezi: pz, i: 0, t: 0, naredba: opt.naredba || '', nakon: opt.nakon, izvor: opt.izvor };
    const ukupno = pz.reduce((s, x) => s + x.T, 0);
    if (!pz.length) { postaviAkt(a); zavrsiAkt(); return 0; }
    postaviAkt(a);
    emit('gibanje', { faza: 'pocetak', naredba: a.naredba, trajanje: ukupno, cilj: pz[pz.length - 1].qs.slice(-1)[0].slice() });
    return ukupno;
  }
  function postaviPrihvatnicu(zatvori, izvor) {
    if (st.prihvatnica.zatvorena === zatvori && st.prihvatnica.otvorenost === (zatvori ? 0 : 1)) return false;
    st.prihvatnica.zatvorena = zatvori;
    const T = zatvori ? Math.max(Z.trajanjeZatvaranjaMin || 0.3, (st.prihvatnica.sila.vrijeme || 0) * 0.1) : (Z.trajanjeOtvaranja || 0.4);
    postaviAkt({ vrsta: 'prihvatnica', od: st.prihvatnica.otvorenost, do: zatvori ? 0 : 1, T, t: 0, izvor });
    emit('prihvatnica', { zatvorena: zatvori, otvorenost: st.prihvatnica.otvorenost, faza: 'pocetak', trajanje: T });
    return true;
  }
  const nakonGibanjaOC = (oc, izvor) => (oc === 'O' || oc === 'C') ? () => { postaviPrihvatnicu(oc === 'C', izvor); } : undefined;

  function zavrsiAkt() {
    const a = akt;
    postaviAkt(null);
    if (!a) return;
    if (a.vrsta === 'gibanje') emit('gibanje', { faza: 'kraj', naredba: a.naredba, q: st.q.slice() });
    if (a.vrsta === 'prihvatnica') emit('prihvatnica', { zatvorena: st.prihvatnica.zatvorena, otvorenost: st.prihvatnica.otvorenost, faza: 'kraj' });
    if (a.nakon) a.nakon();
    if (akt) { if (akt.izvor == null) akt.izvor = a.izvor; return; }
    if (a.izvor === 'program') nakonRetka();
  }

  /** napreduje tekuću aktivnost za dt; vraća neiskorišteno vrijeme (kad aktivnost završi) */
  function napreduj(dt) {
    const a = akt;
    if (!a) return dt;
    if (a.vrsta === 'gibanje') {
      const pz = a.potezi[a.i];
      a.t += dt;
      if (a.t >= pz.T) {
        const ost = a.t - pz.T;
        st.q = pz.qs[pz.qs.length - 1].slice();
        a.i++; a.t = 0;
        if (a.i >= a.potezi.length) zavrsiAkt();
        return ost;
      }
      let tt = ease(a.t / pz.T) * pz.T, k = 0;
      while (k < pz.ts.length - 1 && tt > pz.ts[k]) { tt -= pz.ts[k]; k++; }
      const s = pz.ts[k] > 0 ? Math.min(1, tt / pz.ts[k]) : 1;
      st.q = K.interp(pz.qs[k], pz.qs[k + 1], s);
      return 0;
    }
    if (a.vrsta === 'cekanje' || a.vrsta === 'prihvatnica') {
      a.t += dt;
      if (a.vrsta === 'prihvatnica') st.prihvatnica.otvorenost = a.t >= a.T ? a.do : a.od + (a.do - a.od) * (a.t / a.T);
      if (a.t >= a.T) { const ost = a.t - a.T; zavrsiAkt(); return ost; }
      return 0;
    }
    if (a.vrsta === 'in' || a.vrsta === 'ot') { rukovanje(); return akt === a ? 0 : dt; }
    return 0;
  }

  /* ---- rukovanje IN / OT (pretpostavka: SIMRV_SIGNALI.slijed) ---- */
  function postaviSignal(ime, v) {
    if (st.signali[ime] === v) return;
    st.signali[ime] = v;
    emit('izlaz', { izlazi: st.izlazi, RDY: st.signali.RDY, BUSY: st.signali.BUSY, signal: ime });
  }
  function rukovanje() {
    const a = akt;
    if (!a || (a.vrsta !== 'in' && a.vrsta !== 'ot')) return;
    const S = st.signali;
    if (a.vrsta === 'in') {
      if (a.faza === 0 && S.STB) { st.registar = st.ulazi & IO_MASKA; postaviSignal('BUSY', 1); a.faza = 1; }
      if (a.faza === 1 && !S.STB) { postaviSignal('BUSY', 0); zavrsiAkt(); }
    } else {
      if (a.faza === 0 && S.ACK) { postaviSignal('RDY', 0); a.faza = 1; }
      if (a.faza === 1 && !S.ACK) zavrsiAkt();
    }
  }

  /* ---- prekidi EA ---- */
  function provjeriPrekide() {
    if (!st.izvodi || !st.prekidi.size) return false;
    for (const [bit, p] of st.prekidi) {
      if (((st.ulazi >> bit) & 1) === p.stanje) {
        st.prekidi.delete(bit);
        if (!st.program.has(p.redak)) { greskaII('II-PROGRAM', 'EA: redak ' + p.redak + ' ne postoji'); return true; }
        if (akt) {
          if (akt.vrsta === 'gibanje') emit('gibanje', { faza: 'prekid', naredba: akt.naredba, q: st.q.slice() });
          if (akt.vrsta === 'prihvatnica') st.prihvatnica.otvorenost = akt.do;
          if (akt.vrsta === 'in') postaviSignal('BUSY', 0);
          if (akt.vrsta === 'ot') postaviSignal('RDY', 0);
          postaviAkt(null);
        }
        prog.sljedeci = p.redak;
        emit('redak', { redak: prog.trenutni, prekid: bit, skok: p.redak });
        return true;
      }
    }
    return false;
  }

  /* ---- izvršavanje programa ---- */
  function nakonRetka() {
    if (prog.korak) { st.izvodi = false; prog.korak = false; }
    if (prog.stop) { st.izvodi = false; prog.stop = false; }
  }
  function krajPrograma() {
    st.izvodi = false; prog.korak = false; prog.stop = false;
    prog.sljedeci = prviRedak();
    emit('redak', { redak: null, kraj: true });
  }
  function izvrsiRedakPrograma(ln) {
    prog.trenutni = ln; st.redak = ln;
    const tekst = st.program.get(ln);
    prog.sljedeci = sljedeciRedak(ln);
    emit('redak', { redak: ln, tekst });
    postaviZaslon(pad(ln, 4));
    const p = parsiraj(tekst, NAR);
    if (p.greska) { greskaII(p.greska.kod, p.greska.poruka, ln); return; }
    if (p.prazno) { nakonRetka(); return; }
    izvrsi(p, 'program');
    if (st.greska.tip === 0 && !akt) nakonRetka();
  }
  function teci() {
    if (uTecenju) return;
    uTecenju = true;
    try {
      let n = 0;
      while (!akt && st.napajanje && st.greska.tip === 0 && n < (Z.maxNaredbiPoKoraku || 2000)) {
        if (st.izvodi) {
          if (prog.stop) { st.izvodi = false; prog.stop = false; break; }
          if (provjeriPrekide()) { n++; continue; }
          const ln = prog.sljedeci;
          if (ln == null || (prog.do != null && ln >= prog.do)) { krajPrograma(); continue; }
          izvrsiRedakPrograma(ln); n++;
        } else if (red.length && !st.privjesakON) {
          obradiPC(red.shift()); n++;
        } else break;
      }
    } finally { uTecenju = false; }
    osvjeziLED();
  }
  function pokreniProgram(od, doRetka) {
    if (!st.program.size) g2('II-PROGRAM', 'nema programa');
    const start = od == null ? prviRedak() : prviOd(od);
    if (start == null) g2('II-PROGRAM', 'nema retka od ' + od + ' nadalje');
    prog.sljedeci = start; prog.do = doRetka ?? null; prog.korak = false; prog.stop = false;
    st.rc = []; st.gs = []; st.prekidi.clear();
    st.izvodi = true;
  }

  /* ---- izvršavanje jedne naredbe ---- */
  function izvrsi(p, izvor) {
    try { return izvrsiNaredbu(p, izvor) || {}; } catch (e) {
      if (e instanceof G2) return { greska: greskaII(e.kod, e.message, izvor === 'program' ? prog.trenutni : null) };
      throw e;
    }
  }
  function odgovor(t) { emit('odgovor', t); return { odgovor: t }; }

  function izvrsiNaredbu(p, izvor) {
    const a = p.arg, uProgramu = izvor === 'program';
    const skok = (ln) => {
      if (!uProgramu) return;
      if (!st.program.has(ln)) g2('II-PROGRAM', 'redak ' + ln + ' ne postoji');
      prog.sljedeci = ln;
    };
    const def = NAR[p.kod];
    if (uProgramu && def && def.samoIzravno) g2('II-IZRAVNO', p.kod + ' se izvršava samo izravno');
    if (def && def.pomice && def.grupa === 'gibanje' && p.kod !== 'NT' && !st.servo) g2('II-NEST', 'servo je isključen');
    switch (p.kod) {
      /* ---------------- A. gibanje ---------------- */
      case 'MO': { trebaNest(); const t = poz(a[0]); const q1 = qZa(t, 'pozicija ' + a[0]);
        gibaj([[st.q, q1]], { naredba: p.tekst, pokazivac: a[0], izvor, nakon: nakonGibanjaOC(a[1] ?? t.oc, izvor) }); return; }
      case 'MA': { trebaNest(); const t1 = poz(a[0]), t2 = poz(a[1]); const t = zbroji(t1, t2); const q1 = qZa(t, 'MA ' + a[0] + ' + ' + a[1]);
        gibaj([[st.q, q1]], { naredba: p.tekst, pokazivac: a[0], izvor, nakon: nakonGibanjaOC(a[2] ?? t1.oc, izvor) }); return; }
      case 'MT': { trebaNest(); const t = poz(a[0]); const d = a[1];
        const th = Math.hypot(t.x, t.y) > 1e-6 ? Math.atan2(t.y, t.x) : st.q[0], Pp = t.p * RAD;
        const c = { x: r01(t.x + d * Math.cos(Pp) * Math.cos(th)), y: r01(t.y + d * Math.cos(Pp) * Math.sin(th)), z: r01(t.z + d * Math.sin(Pp)), p: t.p, r: t.r };
        const q1 = qZa(c, 'MT ' + a[0] + ', ' + d);
        gibaj([[st.q, q1]], { naredba: p.tekst, pokazivac: a[0], izvor, nakon: nakonGibanjaOC(a[2] ?? t.oc, izvor) }); return; }
      case 'MS': { trebaNest(); const t = poz(a[0]); const n = a[1];
        const T0 = trenutnoKart(), T1 = K.izTocke(t); const qs = [st.q.slice()];
        for (let i = 1; i <= n + 1; i++) qs.push(qZaKart(K.linearno(T0, T1, i / (n + 1)), 'međutočka ' + i + ' od ' + (n + 1), qs[qs.length - 1]));
        gibaj([qs], { naredba: p.tekst, pokazivac: a[0], izvor, nakon: nakonGibanjaOC(a[2] ?? t.oc, izvor) }); return; }
      case 'MC': { trebaNest(); const [p1, p2] = [a[0], a[1]];
        if (p1 === p2 || Math.abs(p2 - p1) > 99) g2('II-RASPON', 'MC: raspon pozicija mora biti 2–100');
        const korak = p2 > p1 ? 1 : -1, niz = [];
        for (let k = p1; k !== p2 + korak; k += korak) niz.push(poz(k));
        const qs = [st.q.slice()]; let Tprije = trenutnoKart();
        for (let k = 0; k < niz.length; k++) {
          const Tc = K.izTocke(niz[k]);
          const dist = Math.hypot(Tc.x - Tprije.x, Tc.y - Tprije.y, Tc.z - Tprije.z);
          const dijelova = Math.max(1, Math.min(20, Math.ceil(dist / 0.01)));
          for (let i = 1; i <= dijelova; i++) qs.push(qZaKart(K.linearno(Tprije, Tc, i / dijelova), 'MC: put do pozicije ' + (p1 + k * korak), qs[qs.length - 1]));
          Tprije = Tc;
        }
        gibaj([qs], { naredba: p.tekst, pokazivac: p2, izvor, nakon: nakonGibanjaOC(a[2] ?? niz[niz.length - 1].oc, izvor) }); return; }
      case 'MP': { trebaNest(); const q1 = qZa({ x: a[0], y: a[1], z: a[2], p: a[3], r: a[4] }, 'MP točka');
        gibaj([[st.q, q1]], { naredba: p.tekst, izvor }); return; }
      case 'DW': { trebaNest(); const c = trenutnaTocka(); const t = { x: r01(c.x + a[0]), y: r01(c.y + a[1]), z: r01(c.z + a[2]), p: c.p, r: c.r };
        const q1 = qZa(t, 'DW točka'); gibaj([[st.q, q1]], { naredba: p.tekst, izvor }); return; }
      case 'MJ': { trebaNest(); const q1 = st.q.map((v, i) => v + a[i] * RAD); const g = K.uGranicama(q1);
        if (!g.ok) g2('II-DOHVAT', 'MJ: J' + (g.os + 1) + ' bi izašao iz raspona');
        gibaj([[st.q, q1]], { naredba: p.tekst, izvor }); return; }
      case 'IP': case 'DP': { trebaNest(); const n = st.pokazivacPozicije + (p.kod === 'IP' ? 1 : -1);
        if (n < 1 || n > 629) g2('II-POZICIJA', p.kod + ': pozicija ' + n + ' ne postoji');
        const t = poz(n); const q1 = qZa(t, 'pozicija ' + n);
        gibaj([[st.q, q1]], { naredba: p.tekst, pokazivac: n, izvor, nakon: nakonGibanjaOC(t.oc, izvor) }); return; }
      case 'NT': {
        if (!st.servo) g2('II-NEST', 'servo je isključen');
        const q0 = st.q.slice(), qa = [q0[0], NESTQ[1], NESTQ[2], NESTQ[3], q0[4]];
        gibaj([[q0, qa], [qa, NESTQ.slice()]], { naredba: 'NT', sp: Z.nestSp, izvor, nakon: () => { st.nestGotov = true; st.pokazivacPozicije = 0; emit('gibanje', { faza: 'nest', q: st.q.slice() }); } });
        return; }
      case 'OG': { trebaNest(); gibaj([[st.q, st.org.slice()]], { naredba: 'OG', izvor }); return; }
      case 'HE': { trebaNest(); st.pozicije.set(a[0], trenutnaTocka()); return; }
      case 'HO': { if (!st.preklopnici.sw1[4]) g2('II-HO', 'HO nije dopušten (SW1 bit 4 dolje)'); trebaNest(); st.org = st.q.slice(); return; }
      case 'PA': { st.palete.set(a[0], { j: a[1], k: a[2] }); return; }
      case 'PT': { const i = a[0]; const pal = st.palete.get(i); if (!pal) g2('II-POZICIJA', 'paleta ' + i + ' nije definirana (PA)');
        const b = PAL.baza * i; const [A0, B, C, D] = PAL.kutovi.map((kk) => poz(b + kk.pomak));
        const ci = st.brojila[b + PAL.brojilaStupac], ri = st.brojila[b + PAL.brojilaRed];
        if (ci < 1 || ci > pal.j || ri < 1 || ri > pal.k) g2('II-RASPON', 'PT: točka (' + ci + ', ' + ri + ') izvan rešetke ' + pal.j + ' × ' + pal.k);
        const u = pal.j > 1 ? (ci - 1) / (pal.j - 1) : 0, v = pal.k > 1 ? (ri - 1) / (pal.k - 1) : 0;
        const bl = (k) => r01(A0[k] * (1 - u) * (1 - v) + B[k] * u * (1 - v) + C[k] * (1 - u) * v + D[k] * u * v);
        st.pozicije.set(i, { x: bl('x'), y: bl('y'), z: bl('z'), p: bl('p'), r: bl('r'), oc: A0.oc ?? null }); return; }
      case 'PC': { const [x, y] = [a[0], a[1] ?? a[0]]; for (let k = Math.min(x, y); k <= Math.max(x, y); k++) st.pozicije.delete(k); return; }
      case 'PD': { st.pozicije.set(a[0], { x: a[1], y: a[2], z: a[3], p: a[4], r: a[5], oc: st.gf ? 'C' : 'O' }); return; }
      case 'PL': { st.pozicije.set(a[0], kopijaPoz(poz(a[1]))); return; }
      case 'PX': { const t1 = poz(a[0]), t2 = poz(a[1]); st.pozicije.set(a[0], kopijaPoz(t2)); st.pozicije.set(a[1], kopijaPoz(t1)); return; }
      case 'SF': { const t1 = poz(a[0]), t2 = poz(a[1]); st.pozicije.set(a[0], zbroji(t1, t2)); return; }
      case 'SP': { st.sp = a[0]; if (a[1]) st.ubrzanje = a[1]; return; }
      case 'TI': { if (a[0] > 0) postaviAkt({ vrsta: 'cekanje', T: a[0] * 0.1, t: 0, izvor }); return; }
      case 'TL': { st.tl = a[0] / 1000; return; }
      /* ---------------- B. program ---------------- */
      case 'CP': st.registar = st.brojila[a[0]]; return;
      case 'DA': st.prekidi.delete(a[0]); return;
      case 'DC': st.brojila[a[0]] = wrap16(st.brojila[a[0]] - 1); return;
      case 'IC': st.brojila[a[0]] = wrap16(st.brojila[a[0]] + 1); return;
      case 'SC': st.brojila[a[0]] = a[1]; return;
      case 'DL': { if (st.izvodi) g2('II-ZAUZETO', 'DL dok se izvodi program'); const [x, y] = [a[0], a[1] ?? a[0]];
        for (let k = Math.min(x, y); k <= Math.max(x, y); k++) st.program.delete(k); osvjeziRedke(); emit('program', { redci: redci.length }); return; }
      case 'EA': { if (uProgramu && !st.program.has(a[1])) g2('II-PROGRAM', 'EA: redak ' + a[1] + ' ne postoji');
        st.prekidi.set(a[0].bit, { stanje: a[0].znak === '+' ? 1 : 0, redak: a[1] }); return; }
      case 'ED': if (uProgramu) krajPrograma(); return;
      case 'EQ': if (st.registar === a[0]) skok(a[1]); return;
      case 'NE': if (st.registar !== a[0]) skok(a[1]); return;
      case 'LG': if (st.registar > a[0]) skok(a[1]); return;
      case 'SM': if (st.registar < a[0]) skok(a[1]); return;
      case 'GT': skok(a[0]); return;
      case 'GS': { if (!uProgramu) return; if (st.gs.length >= (Z.stogGS || 9)) g2('II-PROGRAM', 'GS: prepun stog potprograma');
        if (!st.program.has(a[0])) g2('II-PROGRAM', 'redak ' + a[0] + ' ne postoji');
        st.gs.push(prog.sljedeci); prog.sljedeci = a[0]; return; }
      case 'RT': { if (!uProgramu) return; if (!st.gs.length) g2('II-PROGRAM', 'RT bez GS');
        const r = st.gs.pop(); if (r == null) krajPrograma(); else prog.sljedeci = r; return; }
      case 'RC': { if (!uProgramu) return; if (st.rc.length >= (Z.stogRC || 9)) g2('II-PROGRAM', 'RC: previše ugniježđenih petlji');
        st.rc.push({ pocetak: prog.sljedeci, preostalo: a[0] }); return; }
      case 'NX': { if (!uProgramu) return; const v = st.rc[st.rc.length - 1]; if (!v) g2('II-PROGRAM', 'NX bez RC');
        v.preostalo--; if (v.preostalo > 0) { if (v.pocetak == null) g2('II-PROGRAM', 'RC je posljednji redak'); prog.sljedeci = v.pocetak; } else st.rc.pop(); return; }
      case 'NW': { if (st.izvodi && !uProgramu) g2('II-ZAUZETO', 'NW dok se izvodi program'); if (uProgramu) g2('II-ZAUZETO', 'NW u programu');
        st.program.clear(); st.pozicije.clear(); osvjeziRedke(); prog.sljedeci = null; emit('program', { redci: 0 }); return; }
      case 'RN': { if (uProgramu) g2('II-IZRAVNO', 'RN u programu'); pokreniProgram(a[0], a[1]); return; }
      /* ---------------- C. prihvatnica ---------------- */
      case 'GO': postaviPrihvatnicu(false, izvor); return;
      case 'GC': postaviPrihvatnicu(true, izvor); return;
      case 'GF': st.gf = a[0]; return;
      case 'GP': st.prihvatnica.sila = { pocetna: a[0], drzanja: a[1], vrijeme: a[2] }; return;
      /* ---------------- D. ulazi i izlazi ---------------- */
      case 'ID': st.registar = st.ulazi & IO_MASKA; return;
      case 'IN': postaviAkt({ vrsta: 'in', faza: 0, izvor }); rukovanje(); return;
      case 'OB': { const b = a[0].bit; const prije = st.izlazi;
        st.izlazi = a[0].znak === '+' ? (st.izlazi | (1 << b)) : (st.izlazi & ~(1 << b));
        if (st.izlazi !== prije) emit('izlaz', { izlazi: st.izlazi, bit: b, RDY: st.signali.RDY, BUSY: st.signali.BUSY }); return; }
      case 'OD': { const v = a[0] & IO_MASKA; if (v !== st.izlazi) { st.izlazi = v; emit('izlaz', { izlazi: v, RDY: st.signali.RDY, BUSY: st.signali.BUSY }); } return; }
      case 'OT': { const v = a[0] & IO_MASKA; st.izlazi = v; emit('izlaz', { izlazi: v, RDY: st.signali.RDY, BUSY: st.signali.BUSY });
        postaviAkt({ vrsta: 'ot', faza: 0, izvor }); postaviSignal('RDY', 1); rukovanje(); return; }
      case 'TB': if (((st.ulazi >> a[0].bit) & 1) === (a[0].znak === '+' ? 1 : 0)) skok(a[1]); return;
      /* ---------------- E. čitanje ---------------- */
      case 'CR': return odgovor(String(st.brojila[a[0]]));
      case 'DR': return odgovor(String(st.registar));
      case 'ER': return odgovor(String(st.greska.tip));
      case 'LR': return odgovor(st.program.has(a[0]) ? a[0] + ' ' + st.program.get(a[0]) : '');
      case 'PR': return odgovor(fmtPozicija(poz(a[0]), FORMAT));
      case 'WH': return odgovor(fmtPozicija(trenutnaTocka(), FORMAT));
      /* ---------------- F. ostalo ---------------- */
      case 'RS': ponistiII(); return;
      case 'TR': { st.program = new Map(st.eprom.program); st.pozicije = new Map([...st.eprom.pozicije].map(([k, v]) => [k, kopijaPoz(v)])); osvjeziRedke();
        prog.sljedeci = prviRedak(); emit('program', { redci: redci.length, izvor: 'EPROM' }); return; }
      case 'WR': { st.eprom = { program: new Map(st.program), pozicije: new Map([...st.pozicije].map(([k, v]) => [k, kopijaPoz(v)])), upisano: true };
        postaviAkt({ vrsta: 'cekanje', T: Z.trajanjeWR || 2, t: 0, izvor, naredba: 'WR' }); return; }
      case "'": return;
      default: g2('II-NAREDBA', 'naredba ' + p.kod + ' nije podržana');
    }
  }

  /* ---- naredba s računala ---- */
  function obradiPC(tekst) {
    const p = parsiraj(tekst, NAR);
    if (p.prazno) return {};
    if (p.greska) return { greska: greskaII(p.greska.kod, p.greska.poruka, p.broj ?? null) };
    if (p.broj != null) {
      if (st.izvodi) return { greska: greskaII('II-ZAUZETO', 'upis retka dok se izvodi program', null) };
      if (p.brisi) { st.program.delete(p.broj); osvjeziRedke(); emit('program', { redak: p.broj, brisano: true }); return { upisano: true }; }
      const def = NAR[p.kod];
      if ((def && def.samoIzravno) || p.kod === 'RN') return { greska: greskaII('II-IZRAVNO', p.kod + ' se ne može upisati u program', p.broj) };
      st.program.set(p.broj, p.tekst); osvjeziRedke();
      prog.sljedeci = prviRedak(); /* izmjena programa vraća pokazivač na početak */
      emit('program', { redak: p.broj, tekst: p.tekst });
      return { upisano: true };
    }
    const r = izvrsi(p, 'pc');
    if (akt) r.uTijeku = true;
    return r;
  }

  function posalji(tekst) {
    if (!st.napajanje) return { odbijeno: 'DUM1 je isključen' };
    const p0 = parsiraj(tekst, NAR);
    if (st.greska.tip === 1) {
      if (!p0.greska && p0.broj == null && p0.kod === 'ER') return odgovor('1');
      return { odbijeno: 'pogreška I. vrste — isključi i uključi DUM1, zatim NEST', greska: { ...st.greska } };
    }
    if (st.privjesakON) return { greska: greskaII('II-PRIVJESAK', 'privjesak je ON — za rad s računala prebaci ga na OFF', null) };
    if (st.greska.tip === 2) {
      const dop = Z.citanjeTijekomPogreske || ['RS', 'ER'];
      if (!p0.greska && p0.broj == null && dop.includes(p0.kod)) { const r = izvrsi(p0, 'pc'); teci(); return r; }
      return { odbijeno: 'pogreška II. vrste — pošalji RS ili pritisni RESET', greska: { ...st.greska } };
    }
    if (akt || st.izvodi || red.length) { red.push(String(tekst)); return { cekanje: true, uRedu: red.length }; }
    const r = obradiPC(tekst);
    teci();
    return r;
  }

  /* ---- napajanje, tipke DUM1, STOP u nuždi ---- */
  function ukljuci() {
    if (st.napajanje) return;
    st.napajanje = true; st.servo = true; st.nestGotov = false;
    st.greska = { tip: 0, led: null, kod: null, poruka: '', redak: null };
    for (const l of ['LED1', 'LED2', 'LED3', 'LED4', 'LED5']) st.led[l] = false;
    st.sp = SP0; st.ubrzanje = Z.ubrzanje; st.tl = TL0; st.prihvatnica.sila = { ...Z.gp }; st.gf = Z.gf || 0;
    st.brojila.fill(0); st.registar = 0; st.izlazi = 0; st.signali.RDY = 0; st.signali.BUSY = 0;
    st.rc = []; st.gs = []; st.prekidi.clear(); st.palete.clear(); st.pokazivacPozicije = 0; st.org = ORGQ.slice();
    st.nacin = 'PTP'; tb.unos = null; tb.jog.clear(); tb.stepRedak = null;
    if (st.preklopnici.st2) izvrsi({ kod: 'TR', arg: [], tekst: 'TR' }, 'sustav');
    prog.sljedeci = prviRedak(); prog.trenutni = null; prog.korak = false; prog.stop = false; st.izvodi = false; st.redak = null;
    postaviZaslon('    ');
    osvjeziLED();
    emit('izlaz', { izlazi: 0, RDY: 0, BUSY: 0 });
    if (st.emg.dum1 || st.emg.vanjski) greskaI('LED3', 'STOP u nuždi je pritisnut pri uključenju');
    else if (st.emg.privjesak) greskaI('LED4', 'STOP u nuždi na privjesku je pritisnut pri uključenju');
  }
  function iskljuci() {
    if (!st.napajanje) return;
    const bilaGreska = st.greska.tip;
    if (akt && akt.vrsta === 'gibanje') emit('gibanje', { faza: 'prekid', naredba: akt.naredba });
    postaviAkt(null); red.length = 0;
    st.napajanje = false; st.servo = false; st.izvodi = false; st.nestGotov = false; st.kocniceOtpustene = false;
    st.greska = { tip: 0, led: null, kod: null, poruka: '', redak: null };
    for (const l of ['LED1', 'LED2', 'LED3', 'LED4', 'LED5']) st.led[l] = false;
    st.izlazi = 0; st.signali.RDY = 0; st.signali.BUSY = 0;
    tb.unos = null; tb.jog.clear();
    if (bilaGreska) { emit('greska', { ...st.greska }); zujalo(bilaGreska === 1 ? 'isprekidano' : 'neprekidno', false); }
    emit('izlaz', { izlazi: 0, RDY: 0, BUSY: 0 });
    postaviZaslon('    ');
    osvjeziLED();
  }
  function hitniStop(izvor = 'dum1', aktivan = true) {
    const k = izvor === 'privjesak' ? 'privjesak' : izvor === 'vanjski' ? 'vanjski' : 'dum1';
    st.emg[k] = !!aktivan;
    if (aktivan && st.napajanje && st.greska.tip !== 1) {
      return greskaI(k === 'privjesak' ? 'LED4' : 'LED3', k === 'privjesak' ? 'STOP u nuždi na privjesku' : k === 'vanjski' ? 'vanjski STOP u nuždi (EXT EMG STP)' : 'STOP u nuždi na DUM1');
    }
    return null;
  }
  function sklopovskaGreska(led, poruka) {
    const opis = (P.POGRESKE || JP.POGRESKE).I.find((x) => x.led === led);
    return greskaI(led, poruka || (opis ? opis.uzrok : 'sklopovska pogreška'));
  }
  function resetTipka() {
    if (!st.napajanje || st.greska.tip === 1) return false;
    if (st.greska.tip === 2) return ponistiII();
    if (st.izvodi) return false;
    prog.sljedeci = prviRedak(); prog.trenutni = null; st.redak = null; st.rc = []; st.gs = []; prog.stop = false;
    postaviZaslon('    ');
    return true;
  }
  function startTipka(izvana = false) {
    if (!st.napajanje || st.greska.tip !== 0 || st.privjesakON || st.izvodi || akt) return false;
    if (!!st.preklopnici.sw1[5] !== !!izvana) return false;
    if (!st.program.size) { greskaII('II-PROGRAM', 'nema programa', null); return false; }
    if (prog.sljedeci == null || !st.program.has(prog.sljedeci)) prog.sljedeci = prviRedak();
    prog.do = null; prog.korak = false; prog.stop = false; st.izvodi = true;
    teci();
    return true;
  }
  function zaustavi() {
    if (st.izvodi) { if (akt) prog.stop = true; else st.izvodi = false; }
    red.length = 0;
    osvjeziLED();
  }
  function pokreni(od, doRetka) {
    if (!st.napajanje || st.greska.tip !== 0 || st.izvodi || akt || st.privjesakON) return false;
    const r = izvrsi({ kod: 'RN', arg: [od, doRetka], tekst: 'RN' }, 'pc');
    if (r.greska) return false;
    teci();
    return true;
  }
  function korak() {
    if (!st.napajanje || st.greska.tip !== 0 || st.izvodi || akt) return false;
    if (!st.program.size) { greskaII('II-PROGRAM', 'nema programa', null); return false; }
    if (prog.sljedeci == null || !st.program.has(prog.sljedeci)) prog.sljedeci = prviRedak();
    prog.do = null; prog.korak = true; prog.stop = false; st.izvodi = true;
    teci();
    return true;
  }
  function namjenskiUlaz(ime, v = true) {
    if (!v) return false;
    if (ime === 'START') return startTipka(true);
    if (ime === 'STOP') { zaustavi(); return true; }
    if (ime === 'RESET') return resetTipka();
    return false;
  }

  /* ---- vanjski ulazi / izlazi (SIM RV, PLC) ---- */
  function postaviUlaz(bit, v) {
    v = v ? 1 : 0;
    if (bit === 'STB' || bit === 'ACK') st.signali[bit] = v;
    else if (Number.isInteger(bit) && bit >= 0 && bit < 16) st.ulazi = v ? (st.ulazi | (1 << bit)) : (st.ulazi & ~(1 << bit));
    else return;
    if (akt && (akt.vrsta === 'in' || akt.vrsta === 'ot')) rukovanje();
    if (st.izvodi && provjeriPrekide()) { /* skok na prekidni redak */ }
    teci();
  }
  function postaviUlaze(bajt) { st.ulazi = bajt & 0xffff; if (st.izvodi) provjeriPrekide(); teci(); }
  function ulaz(bit) { return bit === 'STB' || bit === 'ACK' ? st.signali[bit] : (st.ulazi >> bit) & 1; }
  function izlaz(bit) { return bit === 'RDY' || bit === 'BUSY' ? st.signali[bit] : (st.izlazi >> bit) & 1; }

  /* ================================================================== privjesak */
  const tb = { unos: null, jog: new Map(), stepRedak: null };
  const ALIAS = { 'B+': 'X+', 'B-': 'X-', 'S+': 'Y+', 'S-': 'Y-', 'E+': 'Z+', 'E-': 'Z-', PS: 'P.S', PC: 'P.C', '+OPTION': 'OPT+', '-OPTION': 'OPT-', 'OPTION+': 'OPT+', 'OPTION-': 'OPT-', 'EMG STOP': 'EMG' };
  const TIPKE = (P.PRIVJESAK || JP.PRIVJESAK).tipke;
  const PO_ID = Object.fromEntries(TIPKE.map((t) => [t.id, t]));
  const PO_BROJCI = Object.fromEntries(TIPKE.filter((t) => t.brojka != null).map((t) => [String(t.brojka), t.id]));
  const JOG = { 'X+': [0, 1], 'X-': [0, -1], 'Y+': [1, 1], 'Y-': [1, -1], 'Z+': [2, 1], 'Z-': [2, -1], 'P+': [3, 1], 'P-': [3, -1], 'R+': [4, 1], 'R-': [4, -1], 'OPT+': [5, 1], 'OPT-': [5, -1] };
  function normId(id) {
    let s = String(id).replace(/−/g, '-').toUpperCase().trim();
    if (ALIAS[s]) s = ALIAS[s];
    if (PO_BROJCI[s]) s = PO_BROJCI[s];
    return s;
  }
  function tbIzvrsi(fn) {
    try { fn(); return true; } catch (e) {
      if (e instanceof G2) { zujalo('kratko', true); return false; }
      throw e;
    }
  }
  function izvrsiUnos() {
    const u = tb.unos;
    if (!u) return;
    const n = u.znamenke === '' ? null : parseInt(u.znamenke, 10);
    const prikaz3 = (z, x) => postaviZaslon(z + pad(x ?? 0, 3));
    switch (u.funkcija) {
      case 'P.S': { if (n == null || n < 1 || n > 629 || !st.nestGotov) { prikaz3('!', n); zujalo('kratko', true); break; }
        st.pozicije.set(n, trenutnaTocka()); prikaz3('-', n); emit('program', { pozicija: n }); break; }
      case 'P.C': { if (n == null || n < 1 || n > 629) { prikaz3('!', n); zujalo('kratko', true); break; }
        st.pozicije.delete(n); prikaz3('-', n); emit('program', { pozicija: n, brisano: true }); break; }
      case 'MOV': { const ok = n != null && n >= 1 && n <= 629 && st.nestGotov && tbIzvrsi(() => {
          const t = poz(n); const q1 = qZa(t, 'pozicija ' + n);
          gibaj([[st.q, q1]], { naredba: 'MOV ' + n, sp: Z.movSp || 4, pokazivac: n, izvor: 'privjesak', nakon: nakonGibanjaOC(t.oc, 'privjesak') });
        });
        prikaz3(ok ? '-' : '!', n); if (!ok) zujalo('kratko', true); break; }
      case 'INC': case 'DEC': { const m = st.pokazivacPozicije + (u.funkcija === 'INC' ? 1 : -1);
        const ok = st.nestGotov && m >= 1 && m <= 629 && tbIzvrsi(() => {
          const t = poz(m); const q1 = qZa(t, 'pozicija ' + m);
          gibaj([[st.q, q1]], { naredba: u.funkcija, sp: Z.movSp || 4, pokazivac: m, izvor: 'privjesak', nakon: nakonGibanjaOC(t.oc, 'privjesak') });
        });
        prikaz3(ok ? '-' : '!', Math.max(0, m)); if (!ok) zujalo('kratko', true); break; }
      case 'NST': { const ok = tbIzvrsi(() => izvrsiNaredbu({ kod: 'NT', arg: [], tekst: 'NT' }, 'privjesak')); postaviZaslon(ok ? '-   ' : '!   '); break; }
      case 'ORG': { const ok = tbIzvrsi(() => izvrsiNaredbu({ kod: 'OG', arg: [], tekst: 'OG' }, 'privjesak')); postaviZaslon(ok ? '-   ' : '!   '); if (!ok) zujalo('kratko', true); break; }
      case 'TRN': { izvrsiNaredbu({ kod: 'TR', arg: [], tekst: 'TR' }, 'privjesak'); postaviZaslon('-   '); break; }
      case 'WRT': { izvrsiNaredbu({ kod: 'WR', arg: [], tekst: 'WR' }, 'privjesak'); postaviZaslon('-   '); break; }
      case 'STEP': {
        let ln = null;
        if (n != null) ln = prviOd(n);
        else if (tb.stepRedak != null) ln = prog.sljedeci;
        if (ln == null) { postaviZaslon('!' + pad(n ?? 0, 3)); zujalo('kratko', true); break; }
        prog.sljedeci = ln; tb.stepRedak = ln;
        prog.do = null; prog.korak = true; prog.stop = false; st.izvodi = true;
        teci();
        if (st.greska.tip === 0) postaviZaslon(pad(ln, 4));
        break;
      }
      default: break;
    }
    tb.unos = null;
  }
  function tipka(id, pritisnuto = true) {
    const k = normId(id);
    if (k === 'EMG') { hitniStop('privjesak', pritisnuto); return true; }
    if (!st.napajanje) return false;
    if (k === 'ENT') {
      const otpust = pritisnuto && !st.servo && !!st.preklopnici.sw1[6] && st.privjesakON;
      if (otpust !== st.kocniceOtpustene) { st.kocniceOtpustene = otpust; emit('zvuk', { vrsta: 'kocnice', ukljuceno: otpust }); }
    }
    if (!st.privjesakON) return false;
    if (!pritisnuto) { if (tb.jog.delete(k)) emit('gibanje', { faza: 'rucnoKraj', tipka: k, q: st.q.slice() }); return true; }
    if (!PO_ID[k]) return false;
    zujalo('tipka', true);
    if (st.greska.tip !== 0 || st.izvodi || akt) return false;
    const def = PO_ID[k];
    if (tb.unos && tb.unos.trebaBroj && def.brojka != null) {
      tb.unos.znamenke = (tb.unos.znamenke + def.brojka).slice(-tb.unos.duljina);
      const v = parseInt(tb.unos.znamenke, 10);
      postaviZaslon(tb.unos.duljina === 4 ? pad(v, 4) : ' ' + pad(v, 3));
      return true;
    }
    switch (k) {
      case 'PTP': case 'XYZ': case 'TOOL': st.nacin = k; tb.unos = null; return true;
      case 'INC': case 'DEC': { tb.unos = { funkcija: k, znamenke: '', trebaBroj: false };
        postaviZaslon(' ' + pad(Math.max(0, st.pokazivacPozicije + (k === 'INC' ? 1 : -1)), 3)); return true; }
      case 'NST': case 'ORG': case 'TRN': case 'WRT': tb.unos = { funkcija: k, znamenke: '', trebaBroj: false }; postaviZaslon('    '); return true;
      case 'P.S': case 'P.C': case 'MOV': tb.unos = { funkcija: k, znamenke: '', trebaBroj: true, duljina: 3 }; postaviZaslon(' 000'); return true;
      case 'STEP': tb.unos = { funkcija: 'STEP', znamenke: '', trebaBroj: true, duljina: 4 };
        postaviZaslon(tb.stepRedak != null && prog.sljedeci != null ? pad(prog.sljedeci, 4) : '0000'); return true;
      case 'ENT': izvrsiUnos(); return true;
      case 'O': case 'C': tb.unos = null; postaviPrihvatnicu(k === 'C', 'privjesak'); return true;
      default: break;
    }
    if (JOG[k]) {
      tb.unos = null;
      if (JOG[k][0] === 5) { zujalo('kratko', true); return false; } /* opcijska os nije ugrađena */
      if (!st.servo) return false;
      if (st.nacin !== 'PTP' && !st.nestGotov) { postaviZaslon('!   '); zujalo('kratko', true); return false; }
      tb.jog.set(k, true);
      emit('gibanje', { faza: 'rucno', tipka: k, nacin: st.nacin });
      return true;
    }
    return false;
  }
  function rucnoVodi(dt) {
    if (!tb.jog.size || !st.privjesakON || !st.servo || akt || st.izvodi || st.greska.tip !== 0 || dt <= 0) return;
    for (const k of [...tb.jog.keys()]) {
      const [os, zn] = JOG[k];
      if (st.nacin === 'PTP') {
        const q = st.q.slice();
        q[os] += zn * VMAX[os] * (Z.jogZglobni || 0.15) * dt;
        const [lo, hi] = OSI_GR[os];
        if (q[os] < lo || q[os] > hi) { q[os] = Math.min(hi, Math.max(lo, q[os])); tb.jog.delete(k); zujalo('kratko', true); }
        st.q = q;
      } else {
        const T = trenutnoKart();
        const v = (Z.jogLinearni || 0.02) * dt, w = (Z.jogKutni || 15 * RAD) * dt;
        if (st.nacin === 'TOOL' && os === 2) {
          const th = st.q[0];
          T.x += zn * v * Math.cos(T.P) * Math.cos(th); T.y += zn * v * Math.cos(T.P) * Math.sin(th); T.z += zn * v * Math.sin(T.P);
        } else if (os <= 2) T[['x', 'y', 'z'][os]] += zn * v;
        else if (os === 3) T.P += zn * w;
        else T.R += zn * w;
        const r = K.ik(T, st.tl);
        if (!r || !r.uspjeh || !r.q || !K.uGranicama(r.q).ok) { tb.jog.delete(k); zujalo('kratko', true); continue; }
        st.q = r.q.slice(0, 5);
      }
    }
  }

  const privjesak = {
    ukljuci(on) {
      st.privjesakON = !!on;
      tb.unos = null; tb.jog.clear();
      if (on && st.izvodi) prog.stop = true;
      if (!on) { tb.stepRedak = null; teci(); }
      postaviZaslon('    ');
      return st.privjesakON;
    },
    tipka,
    zaslon: () => zaslonTekst,
    get nacin() { return st.nacin; },
    get unos() { return tb.unos ? { ...tb.unos } : null; },
    get vodi() { return [...tb.jog.keys()]; }
  };

  /* ---- glavna petlja ---- */
  function azuriraj(dt) {
    dt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    st.vrijeme += dt;
    teci();
    let ost = dt, n = 0;
    while (ost > 0 && akt && n++ < 100000) {
      if (st.izvodi && provjeriPrekide()) { teci(); continue; }
      ost = napreduj(ost);
      if (!akt) teci();
    }
    if (!akt) teci();
    rucnoVodi(dt);
    osvjeziLED();
    return st.q.slice();
  }

  /* ---- pomoćno za stranice ---- */
  function ispisPrograma() { return redci.map((r) => r + ' ' + st.program.get(r)).join('\n'); }
  function ucitaj(tekst) {
    const rez = [];
    for (const l of String(tekst).split(/\r?\n/)) { if (!l.trim()) continue; rez.push(posalji(l)); if (st.greska.tip) break; }
    return rez;
  }
  function postaviPreklopnik(ime, vrijednost, bit) {
    if (ime === 'SW1') st.preklopnici.sw1[bit] = !!vrijednost;
    else if (ime === 'ST1') st.preklopnici.st1 = vrijednost;
    else if (ime === 'ST2') st.preklopnici.st2 = !!vrijednost;
    else if (ime === 'HAND') st.preklopnici.hand = vrijednost;
  }

  return {
    stanje: st,
    ukljuci, iskljuci, posalji,
    pokreni, korak, zaustavi, stopTipka: zaustavi, resetTipka, startTipka, hitniStop, sklopovskaGreska, namjenskiUlaz,
    privjesak,
    postaviUlaz, postaviUlaze, ulaz, izlaz,
    azuriraj, na,
    parsiraj: (t) => parsiraj(t, NAR),
    tocka: () => trenutnaTocka(),
    zauzet: () => !!akt || st.izvodi || red.length > 0,
    aktivnost: () => (akt ? akt.vrsta : null),
    uRedu: () => red.length,
    ispisPrograma, ucitaj, postaviPreklopnik,
    fmtPozicija: (t) => fmtPozicija(t, FORMAT)
  };
}
