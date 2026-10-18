/* FORTRONIQ · Festo MPS linija s robotom RV-M1 — logika linije (bez DOM-a; radi u pregledniku i u Node-u).
   Svaka stanica je stroj stanja (čeka RESET → inicijalizacija → spremna → radi → stop / nužni stop) i slijed koraka
   pisan kao generator: izlaz (Q) pokreće aktuator, aktuator mijenja senzor (I), slijed čeka senzor — kao program u PLC-u.
   Robot izvodi pravi program u jeziku Movemaster u interpreteru DUM1 (../robot-mitsubishi-rv-m1/rvm1_mrl.js);
   s linijom ga vežu samo ulazi i izlazi I/O kartice (mps_podaci.ROBOT_SUCELJE). Hvat i odlaganje izratka slijede
   stvarni položaj vrha alata (kinematika rvm1_kin.js), pa izmijenjen program ima stvarne posljedice.
   Svi brojevi, mjere, vremena i signali dolaze iz mps_podaci.js. KS linije: x uz liniju, y prema stražnjoj strani, z gore (m).
   © ForTroniQ d.o.o. */
import * as P from './mps_podaci.js';
import * as KIN from '../robot-mitsubishi-rv-m1/rvm1_kin.js';
import { napraviDUM1 } from '../robot-mitsubishi-rv-m1/rvm1_mrl.js';
import * as RP from '../robot-mitsubishi-rv-m1/rvm1_podaci.js';

const DT = 0.02;                                  /* korak simulacije (s) */
const RAD = Math.PI / 180;
const KORAK_STOLA = Math.PI / 3;
const ZASTOJ_NAKON = 2.5;                         /* čekanje dulje od ovoga = zastoj (lampica Q2) */
const lerp = (a, b, t) => a + (b - a) * t;
const ogr = (v, a, b) => Math.max(a, Math.min(b, v));
const kutN = (a) => { a %= 2 * Math.PI; if (a < 0) a += 2 * Math.PI; return a; };

/* ------------------------------------------------------------------ pomoćno: slijed koraka */
const cekaj = (dok, opis) => ({ dok, opis });
const pauza = (t, opis) => ({ t, opis });
function korakGen(ctx, dt) {
  for (let n = 0; n < 60; n++) {
    if (!ctx.cur) {
      const r = ctx.g.next();
      if (r.done) { ctx.done = true; ctx.opis = ''; return; }
      ctx.cur = r.value || {}; ctx.curT = 0; ctx.cekaT = 0;
      if (ctx.cur.par) ctx.cur.djeca = ctx.cur.par.map((g) => ({ g, cur: null, done: false, opis: '', cekaT: 0 }));
    }
    const c = ctx.cur;
    if (c.par) {
      let sve = true;
      for (const d of c.djeca) if (!d.done) { korakGen(d, dt); if (!d.done) sve = false; }
      if (sve) { ctx.cur = null; continue; }
      const ak = c.djeca.filter((d) => !d.done);
      ctx.opis = ak.map((d) => d.opis).join(' · '); ctx.cekaT = Math.min(...ak.map((d) => d.cekaT));
      return;
    }
    if (c.t != null) { ctx.opis = c.opis; ctx.cekaT = 0; if (ctx.curT >= c.t - 1e-9) { ctx.cur = null; continue; } ctx.curT += dt; return; }
    if (c.dok) {
      if (c.dok()) { ctx.cur = null; continue; }
      ctx.opis = typeof c.opis === 'function' ? c.opis() : c.opis; ctx.cekaT += dt; return;
    }
    ctx.cur = null;
  }
}
/* aktuator: položaj 0…1, cilj, trajanje punog hoda */
const A = (T, poz = 0) => ({ poz, cilj: poz, T });
function pomakni(a, dt) {
  if (a.poz < a.cilj) a.poz = Math.min(a.cilj, a.poz + dt / a.T);
  else if (a.poz > a.cilj) a.poz = Math.max(a.cilj, a.poz - dt / a.T);
}

/* ================================================================== linija */
export function napraviLiniju(opcije = {}) {
  const M = P.MJERE, V = P.VREMENA, VRH = P.VRH_PLOCE;
  const O = Object.assign({ logika: P.KONFIG.logikaIspitne, nuzniLinija: P.KONFIG.nuzniStopLinija, program: null }, opcije);
  const slusaci = {};
  const emit = (d, x) => (slusaci[d] || []).slice().forEach((f) => { try { f(x); } catch (e) { console.error(e); } });
  const L = {
    t: 0, izradci: new Map(), brojac: 0, logika: O.logika,
    stat: { ubaceno: 0, dobri: 0, skart: 0, sklopljeni: 0, nepotpuni: 0, ispusteni: 0, uklonjeni: 0, ciklusiRobota: 0 },
    dnevnik: [], na(d, fn) { (slusaci[d] = slusaci[d] || []).push(fn); return () => { slusaci[d] = slusaci[d].filter((f) => f !== fn); }; }
  };
  function log(stanica, tekst, vrsta = 'info') {
    const z = { t: L.t, stanica, tekst, vrsta };
    L.dnevnik.push(z); if (L.dnevnik.length > 600) L.dnevnik.shift();
    emit('dnevnik', z);
  }
  /* ---------------- izradci */
  function novi(vrsta, svojstva) {
    const id = vrsta[0].toUpperCase() + (++L.brojac);
    const iz = Object.assign({ id, vrsta, gdje: 'nigdje', p: [0, 0, 0], povijest: [], sklop: null }, svojstva);
    if (vrsta === 'kuciste') iz.sklop = { klip: null, opruga: null, poklopac: null, zabravljen: false };
    L.izradci.set(id, iz);
    return iz;
  }
  const IZ = (id) => (id ? L.izradci.get(id) : null);
  function trag(iz, tekst) { iz.povijest.push({ t: L.t, tekst }); emit('izradak', iz); }
  function visinaDijela(iz) {
    if (iz.vrsta === 'kuciste') return iz.visina;
    if (iz.vrsta === 'klip') return P.IZRADCI.klip.visina;
    if (iz.vrsta === 'opruga') return P.IZRADCI.opruga.visina;
    return P.IZRADCI.poklopac.visina;
  }
  function ukloni(iz, razlog) {
    if (!iz) return;
    if (iz.sklop) ['klip', 'opruga', 'poklopac'].forEach((k) => { if (iz.sklop[k]) { const d = IZ(iz.sklop[k]); if (d) { d.gdje = 'uklonjen'; } } });
    iz.gdje = 'uklonjen'; L.stat.uklonjeni++;
    trag(iz, razlog); log('linija', iz.id + ': ' + razlog, 'upoz');
  }

  /* ================================================================ stanice */
  function S(id) {
    return { id, naziv: P.STANICE[id].naziv, stanje: 'ceka-reset', auto: true, ctx: null, opis: '', zastoj: false, cekaT: 0,
      Q: {}, I: {}, tipka: { START: 0, RESET: 0, STOP: 0 }, gljiva: false, ciklusi: 0, poruka: '' };
  }
  const dist = S('dist'), isp = S('isp'), obr = S('obr'), rob = S('rob');
  const ST = { dist, isp, obr, rob };
  const RED = P.KONFIG.redoslijed.map((k) => ST[k]);
  const sljedeca = (s) => RED[RED.indexOf(s) + 1] || null;

  /* ---------------- distribucijska */
  dist.akt = { izb: A(V.izbacivacSpremnika), ruka: A(V.zakret) };
  dist.vak = 0; dist.spremnik = []; dist.gura = null; dist.naRuci = null;
  dist.Q = { izbacivac: 0, vakuum: 0, otpuh: 0, zakretSpremnik: 0, zakretDalje: 0 };
  const DS = M.dist;
  function rukaVrh(poz) {
    const f = Math.PI * (1 - poz);       /* 180° (spremnik) → 0° (dizalo), preko stražnje strane */
    return [DS.ruka.os[0] + DS.ruka.duljina * Math.cos(f), DS.ruka.os[1] + DS.ruka.duljina * Math.sin(f)];
  }
  function* gDist() {
    for (;;) {
      yield cekaj(() => dist.I.imaIzradaka, 'čeka izradak u spremniku (I0.6 = 0: spremnik prazan)');
      yield cekaj(() => dist.I.rukaSpremnik, 'ruka kod spremnika (I0.4)');
      dist.gura = dist.spremnik.shift(); dist.Q.izbacivac = 1;
      const iz = IZ(dist.gura); iz.gdje = 'izbacivac'; trag(iz, 'izbacivač ga gura iz spremnika');
      yield cekaj(() => dist.I.izbSprijeda, 'izbacivač naprijed (Q0.0 → I0.2)');
      iz.gdje = 'uzimanje';
      dist.Q.vakuum = 1;
      yield cekaj(() => dist.I.vakuumOK, 'vakuum: izradak prihvaćen (Q0.1 → I0.3)');
      iz.gdje = 'ruka'; dist.naRuci = iz.id; dist.gura = null; trag(iz, 'prihvaćen vakuumskom sisaljkom');
      dist.Q.izbacivac = 0;
      yield cekaj(() => dist.I.izbStraga, 'izbacivač natrag (I0.1)');
      yield cekaj(() => dist.I.slPrijem, 'čeka da ispitna stanica bude spremna (StationLink)');
      dist.Q.zakretSpremnik = 0; dist.Q.zakretDalje = 1;
      yield cekaj(() => dist.I.rukaDalje, 'zakret prema ispitnoj stanici (Q0.4 → I0.5)');
      dist.Q.vakuum = 0; dist.Q.otpuh = 1;
      yield pauza(V.otpuhivanje, 'otpuhivanje (Q0.2)');
      iz.gdje = 'dizalo'; dist.naRuci = null; isp.naDizalu = iz.id; trag(iz, 'predan na dizalo ispitne stanice');
      dist.Q.otpuh = 0; dist.Q.zakretDalje = 0; dist.Q.zakretSpremnik = 1;
      yield cekaj(() => dist.I.rukaSpremnik, 'zakret natrag prema spremniku (Q0.3 → I0.4)');
      dist.ciklusi++;
      if (!dist.auto) return;
    }
  }
  function* iDist() {
    if (dist.naRuci) { ukloni(IZ(dist.naRuci), 'uklonjen sa sisaljke pri inicijalizaciji (operater)'); dist.naRuci = null; }
    if (dist.gura) { const iz = IZ(dist.gura); dist.spremnik.unshift(iz.id); iz.gdje = 'spremnik'; dist.gura = null; }
    Object.keys(dist.Q).forEach((k) => { dist.Q[k] = 0; }); dist.Q.zakretSpremnik = 1;
    yield cekaj(() => dist.I.izbStraga && dist.I.rukaSpremnik, 'izbacivač natrag, ruka kod spremnika');
  }

  /* ---------------- ispitna */
  isp.akt = { dizalo: A(V.dizalo), izb: A(V.izbacivacIspitne), mjerni: A(V.mjerniCilindar) };
  isp.naDizalu = null; isp.prijem = false; isp.skart = []; isp.zracni = []; isp.izmjereno = null;
  isp.Q = { dizaloDolje: 0, dizaloGore: 0, izbacivac: 0, zracni: 0, mjerni: 0 };
  const IS = M.isp;
  function* gIsp() {
    for (;;) {
      isp.prijem = true;
      yield cekaj(() => isp.I.prisutan, 'čeka izradak na dizalu (I0.0)');
      isp.prijem = false;
      yield pauza(V.smirivanje, 'smirivanje izratka');
      const iz = IZ(isp.naDizalu);
      iz.ocitano = { nijeCrno: !!isp.I.nijeCrno, metal: !!isp.I.metal };
      trag(iz, 'prepoznavanje: kapacitivni 1, optički ' + (isp.I.nijeCrno ? 1 : 0) + ', induktivni ' + (isp.I.metal ? 1 : 0));
      isp.Q.dizaloDolje = 0; isp.Q.dizaloGore = 1;
      yield cekaj(() => isp.I.dizaloGore, 'dizalo gore (Q0.1 → I0.4)');
      isp.Q.mjerni = 1;
      yield cekaj(() => isp.akt.mjerni.poz >= 0.999, 'mjerni cilindar dolje (Q0.4)');
      yield pauza(V.mjerenje, 'mjerenje visine');
      const ok = !!isp.I.visinaOK;
      isp.izmjereno = iz.visina;
      trag(iz, 'visina ' + (iz.visina * 1000).toFixed(1).replace('.', ',') + ' mm → ' + (ok ? 'dobar' : 'škart'));
      isp.Q.mjerni = 0;
      yield cekaj(() => isp.akt.mjerni.poz <= 0.001, 'mjerni cilindar gore');
      if (ok) {
        yield cekaj(() => isp.I.slPrijem, 'čeka da obradna stanica bude spremna (StationLink)');
        isp.Q.zracni = 1; isp.Q.izbacivac = 1;
        yield cekaj(() => isp.akt.izb.poz >= 0.999, 'izbacivač gura na zračni klizač (Q0.2, Q0.3)');
        iz.gdje = 'zracni'; iz.s = 0; isp.zracni.push(iz.id); isp.naDizalu = null; iz.status = 'dobar'; L.stat.dobri++;
        trag(iz, 'na zračnom klizaču prema obradnoj stanici'); log('isp', iz.id + ' dobar (' + opisIzratka(iz) + ')');
        isp.Q.izbacivac = 0;
        yield cekaj(() => isp.I.izbStraga, 'izbacivač natrag (I0.6)');
        isp.Q.dizaloGore = 0; isp.Q.dizaloDolje = 1;
        yield cekaj(() => isp.I.dizaloDolje, 'dizalo dolje (Q0.0 → I0.5)');
        yield cekaj(() => !isp.zracni.length, 'izradak klizi prema okretnom stolu');
        isp.Q.zracni = 0;
      } else {
        isp.Q.dizaloGore = 0; isp.Q.dizaloDolje = 1;
        yield cekaj(() => isp.I.dizaloDolje, 'dizalo dolje (Q0.0 → I0.5)');
        yield cekaj(() => isp.skart.length < IS.klizacSkarta.kapacitet, 'klizač škarta je pun — isprazni ga');
        isp.Q.izbacivac = 1;
        yield cekaj(() => isp.akt.izb.poz >= 0.999, 'izbacivač gura na klizač škarta (Q0.2)');
        iz.gdje = 'skart'; iz.s = 0; isp.skart.push(iz.id); isp.naDizalu = null; iz.status = 'skart'; L.stat.skart++;
        trag(iz, 'na klizaču škarta'); log('isp', iz.id + ' škart (' + opisIzratka(iz) + ')', 'upoz');
        isp.Q.izbacivac = 0;
        yield cekaj(() => isp.I.izbStraga, 'izbacivač natrag (I0.6)');
      }
      isp.ciklusi++; emit('stat', L.stat);
      if (!isp.auto) return;
    }
  }
  function* iIsp() {
    isp.prijem = false;
    Object.keys(isp.Q).forEach((k) => { isp.Q[k] = 0; }); isp.Q.dizaloDolje = 1;
    yield cekaj(() => isp.I.izbStraga && isp.akt.mjerni.poz <= 0.001 && isp.I.dizaloDolje, 'izbacivač i mjerni cilindar natrag, dizalo dolje');
  }

  /* ---------------- obradna */
  const OS = M.obr;
  obr.akt = { ispitivac: A(V.ispitivac), stez: A(V.stezanje), busilica: A(V.busilicaHod) };
  obr.alfa = Math.PI; obr.okret = null; obr.vreteno = 0; obr.gnijezda = new Array(OS.stol.gnijezda).fill(null); obr.prijem = false;
  obr.Q = { motorStola: 0, motorBusilice: 0, busilicaDolje: 0, busilicaGore: 0, stezanje: 0, ispitivac: 0, zaRobot: 0 };
  const KUT = { ulaz: OS.polozaji.ulaz * RAD, ispitivanje: OS.polozaji.ispitivanje * RAD, busenje: OS.polozaji.busenje * RAD, izlaz: OS.polozaji.izlaz * RAD };
  const nGn = OS.stol.gnijezda, korakGn = 2 * Math.PI / nGn;
  /* indeks gnijezda na mjestu (svjetski kut) uz trenutni zakret stola (gnijezdo n: lokalni kut n·korak) */
  function gnNa(mjesto) {
    const a = kutN(KUT[mjesto] - obr.alfa);
    const n = Math.round(a / korakGn) % nGn;
    return Math.abs(kutN(a - n * korakGn + 0.01) - 0.01) < 0.02 ? n : -1;
  }
  const naMjestu = (mjesto) => { if (obr.okret) return null; const n = gnNa(mjesto); return n < 0 ? null : IZ(obr.gnijezda[n]); };
  const trebaOkret = () => !!(naMjestu('ulaz') || naMjestu('ispitivanje') || naMjestu('busenje')) && !naMjestu('izlaz') && !isp.zracni.length;
  function* gIspitivac(iz) {
    obr.Q.ispitivac = 1;
    yield cekaj(() => obr.akt.ispitivac.poz >= 0.999, 'ispitivač dolje (Q0.5)');
    yield pauza(0.15, 'ispitivač: izradak ispravno položen (I0.5)');
    iz.ispitan = true; trag(iz, 'ispitivač: ispravno položen');
    obr.Q.ispitivac = 0;
    yield cekaj(() => obr.akt.ispitivac.poz <= 0.001, 'ispitivač gore');
  }
  function* gBusenje(iz) {
    obr.Q.stezanje = 1;
    yield cekaj(() => obr.akt.stez.poz >= 0.999, 'stezanje (Q0.4)');
    obr.Q.motorBusilice = 1; obr.Q.busilicaGore = 0; obr.Q.busilicaDolje = 1;
    yield cekaj(() => obr.I.busilicaDolje, 'bušilica dolje (Q0.2 → I0.7)');
    yield pauza(V.busenje, 'bušenje');
    iz.izbusen = true; trag(iz, 'izbušen');
    obr.Q.busilicaDolje = 0; obr.Q.busilicaGore = 1;
    yield cekaj(() => obr.I.busilicaGore, 'bušilica gore (Q0.3 → I0.6)');
    obr.Q.motorBusilice = 0; obr.Q.stezanje = 0;
    yield cekaj(() => obr.akt.stez.poz <= 0.001, 'otpuštanje');
  }
  function* gObr() {
    for (;;) {
      obr.prijem = true;
      yield cekaj(trebaOkret, () => naMjestu('izlaz') ? 'čeka da robot preuzme izradak s izlaznog mjesta' : 'čeka izradak na ulaznom mjestu (I0.0)');
      obr.prijem = false;
      obr.Q.motorStola = 1;
      yield cekaj(() => !obr.I.stolUPolozaju, 'motor stola (Q0.0)');
      yield cekaj(() => obr.I.stolUPolozaju, 'okretanje stola za 60° (I0.4)');
      obr.Q.motorStola = 0;
      const zad = [];
      const a = naMjestu('ispitivanje'), b = naMjestu('busenje');
      if (a && !a.ispitan) zad.push(gIspitivac(a));
      if (b && !b.izbusen) zad.push(gBusenje(b));
      if (zad.length) yield { par: zad };
      const c = naMjestu('izlaz');
      if (c) { trag(c, 'na izlaznom mjestu — čeka robot'); log('obr', c.id + ' na izlaznom mjestu: izradak spreman → robot (Q0.6)'); }
      obr.ciklusi++;
      if (!obr.auto) return;
    }
  }
  function* iObr() {
    obr.prijem = false;
    Object.keys(obr.Q).forEach((k) => { obr.Q[k] = 0; }); obr.Q.busilicaGore = 1;
    if (obr.okret) { obr.okret.nastavi = true; }
    yield cekaj(() => obr.I.busilicaGore && obr.akt.stez.poz <= 0.001 && obr.akt.ispitivac.poz <= 0.001 && !obr.okret, 'bušilica gore, stezanje otpušteno, stol u položaju');
  }

  /* ---------------- robotska i montažna */
  const RS = M.rob;
  const dum = napraviDUM1({ kin: KIN, podaci: RP });
  rob.dum = dum; rob.drzi = null; rob.rHvat = 0; rob.redak = null; rob.dopunaT = 0; rob.programTekst = null; rob.ucitano = null;
  rob.gnijezdo = null; rob.izlaz = [];
  rob.paleta = { crni: new Array(RS.paleta.mjesta).fill(null), srebrni: new Array(RS.paleta.mjesta).fill(null) };
  rob.opruge = { stog: [], uzimanje: null, gura: null, cil: A(V.cilindarSpremnika) };
  rob.poklopci = { stog: [], uzimanje: null, gura: null, cil: A(V.cilindarSpremnika) };
  const PR0 = P.programRobota();
  const ZADANI_PROGRAM = ['NW', ...PR0.pozicije, ...PR0.program].join('\n');
  rob.programTekst = O.program || ZADANI_PROGRAM;
  dum.postaviPreklopnik('SW1', true, 5);
  dum.na('redak', (r) => { rob.redak = r.redak ?? null; });
  dum.na('greska', (g) => { if (g.tip) log('rob', 'DUM1: pogreška ' + (g.tip === 1 ? 'I.' : 'II.') + ' vrste — ' + g.poruka + (g.redak ? ' (redak ' + g.redak + ')' : ''), 'greska'); });
  dum.na('prihvatnica', (e) => {
    if (e.faza === 'kraj' && e.zatvorena) hvataj();
    if (e.faza === 'pocetak' && !e.zatvorena) pusti();
  });
  function tcp() {
    const f = KIN.fk(dum.stanje.q, dum.stanje.tl);
    return [RS.robot.x + f.p[1], RS.robot.y - f.p[0], RS.zBaze + f.p[2]];
  }
  function dijeloviNa() {
    const out = [];
    L.izradci.forEach((iz) => { if (['stol', 'gnijezdo', 'u-kucistu', 'paleta', 'opruga-uzimanje', 'poklopac-uzimanje', 'izlaz', 'ploca'].includes(iz.gdje)) out.push(iz); });
    return out;
  }
  function hvataj() {
    if (rob.drzi) return;
    const T = tcp();
    const kand = dijeloviNa().filter((iz) => {
      if (iz.gdje === 'stol' && obr.okret) return false;
      const d = Math.hypot(iz.p[0] - T[0], iz.p[1] - T[1]);
      const h = visinaDijela(iz);
      return d <= 0.012 && T[2] >= iz.p[2] - 0.003 && T[2] <= iz.p[2] + h + 0.006;
    });
    if (!kand.length) { log('rob', 'prihvatnica se zatvorila naprazno', 'upoz'); return; }
    let iz = kand.find((k) => k.vrsta === 'kuciste' && T[2] <= k.p[2] + k.visina);
    if (!iz) iz = kand.sort((a, b) => b.p[2] - a.p[2])[0];
    /* skidanje s mjesta */
    if (iz.gdje === 'stol') { const n = obr.gnijezda.indexOf(iz.id); if (n >= 0) obr.gnijezda[n] = null; trag(iz, 'robot ga uzima s okretnog stola'); }
    if (iz.gdje === 'gnijezdo') rob.gnijezdo = null;
    if (iz.gdje === 'u-kucistu') { const k = IZ(iz.roditelj); if (k) for (const s of ['klip', 'opruga', 'poklopac']) if (k.sklop[s] === iz.id) k.sklop[s] = null; iz.roditelj = null; }
    if (iz.gdje === 'paleta') { for (const r of ['crni', 'srebrni']) { const i = rob.paleta[r].indexOf(iz.id); if (i >= 0) rob.paleta[r][i] = null; } }
    if (iz.gdje === 'opruga-uzimanje') rob.opruge.uzimanje = null;
    if (iz.gdje === 'poklopac-uzimanje') rob.poklopci.uzimanje = null;
    if (iz.gdje === 'izlaz') rob.izlaz = rob.izlaz.filter((x) => x !== iz.id);
    iz.gdje = 'robot'; iz.dz = T[2] - iz.p[2]; rob.drzi = iz.id; rob.rHvat = dum.stanje.q[4];
  }
  function pusti() {
    const iz = IZ(rob.drzi);
    if (!iz) return;
    rob.drzi = null;
    const T = tcp(), dno = T[2] - iz.dz;
    const blizu = (xy, tol = 0.015) => Math.hypot(xy[0] - T[0], xy[1] - T[1]) <= tol;
    const k = IZ(rob.gnijezdo);
    if (blizu([RS.gnijezdo.x, RS.gnijezdo.y])) {
      if (iz.vrsta === 'kuciste' && !k) { rob.gnijezdo = iz.id; iz.gdje = 'gnijezdo'; trag(iz, 'u montažnom gnijezdu'); return; }
      if (k && iz.vrsta === 'klip' && !k.sklop.klip) {
        k.sklop.klip = iz.id; iz.gdje = 'u-kucistu'; iz.roditelj = k.id;
        const dobar = P.IZRADCI.klip.vrste.find((v) => v.id === iz.boja).zaKuciste.includes(k.boja);
        if (!dobar) { k.pogresanKlip = true; log('rob', k.id + ': pogrešan klip (' + iz.boja + ') za ' + P.vrstaKucista(k.boja).naziv + ' kućište', 'upoz'); }
        trag(k, 'umetnut ' + iz.boja + ' klip'); return;
      }
      if (k && iz.vrsta === 'opruga' && k.sklop.klip && !k.sklop.opruga) { k.sklop.opruga = iz.id; iz.gdje = 'u-kucistu'; iz.roditelj = k.id; trag(k, 'stavljena opruga'); return; }
      if (k && iz.vrsta === 'poklopac' && !k.sklop.poklopac) {
        k.sklop.poklopac = iz.id; iz.gdje = 'u-kucistu'; iz.roditelj = k.id;
        k.sklop.zabravljen = Math.abs(dum.stanje.q[4] - rob.rHvat) >= 60 * RAD;
        trag(k, k.sklop.zabravljen ? 'poklopac stavljen i zabravljen zakretom' : 'poklopac stavljen, ali nije zabravljen'); return;
      }
    }
    if (blizu(RS.izlaz.od, 0.02) && (iz.vrsta === 'kuciste')) {
      if (rob.izlaz.length < RS.izlaz.kapacitet) {
        rob.izlaz.push(iz.id); iz.gdje = 'izlaz'; iz.s = 0; iz.slot = rob.izlaz.length - 1;
        const s = iz.sklop, cijel = s.klip && s.opruga && s.poklopac && s.zabravljen && !iz.pogresanKlip;
        if (cijel) { L.stat.sklopljeni++; trag(iz, 'sklopljeni cilindar na izlaznom klizaču'); log('rob', iz.id + ': cilindar sklopljen (' + opisIzratka(iz) + ')', 'ok'); }
        else { L.stat.nepotpuni++; trag(iz, 'nepotpun sklop na izlaznom klizaču'); log('rob', iz.id + ': na izlazu nepotpun sklop', 'upoz'); }
        L.stat.ciklusiRobota++; emit('stat', L.stat);
        return;
      }
    }
    const nI = gnNa('izlaz');
    if (iz.vrsta === 'kuciste' && !obr.okret && nI >= 0 && !obr.gnijezda[nI] && blizu(P.MJESTA.izlazObradne)) { obr.gnijezda[nI] = iz.id; iz.gdje = 'stol'; trag(iz, 'vraćen na okretni stol'); return; }
    if (iz.vrsta === 'klip') for (const r of ['crni', 'srebrni']) for (let i = 0; i < RS.paleta.mjesta; i++) {
      if (!rob.paleta[r][i] && blizu([RS.paleta.x0 + i * RS.paleta.korak, r === 'crni' ? RS.paleta.yCrni : RS.paleta.ySrebrni], 0.01)) { rob.paleta[r][i] = iz.id; iz.gdje = 'paleta'; return; }
    }
    /* ispušten izvan mjesta: pada na ploču */
    iz.gdje = 'ploca'; iz.p = [T[0], T[1], VRH]; L.stat.ispusteni++;
    trag(iz, 'ispušten izvan mjesta'); log('rob', iz.id + ' ispušten izvan mjesta (x ' + (T[0] * 1000).toFixed(0) + ', y ' + (T[1] * 1000).toFixed(0) + ' mm, visina pada ' + ((dno - VRH) * 1000).toFixed(0) + ' mm)', 'upoz');
  }
  function* iRob() {
    rob.greskaInit = null;
    if (dum.stanje.izvodi) { dum.zaustavi(); yield cekaj(() => !dum.zauzet(), 'robot završava naredbu'); }
    if (rob.drzi) { ukloni(IZ(rob.drzi), 'uklonjen iz prihvatnice pri inicijalizaciji (operater)'); rob.drzi = null; }
    if (rob.gnijezdo) { ukloni(IZ(rob.gnijezdo), 'nedovršen sklop uklonjen iz gnijezda pri inicijalizaciji (operater)'); rob.gnijezdo = null; }
    if (dum.stanje.greska.tip === 1 || !dum.stanje.napajanje) {
      if (dum.stanje.napajanje) { log('rob', 'DUM1 isključen i ponovno uključen (poništavanje pogreške I. vrste)'); dum.iskljuci(); }
      if (dum.stanje.emg.vanjski || dum.stanje.emg.dum1) { rob.greskaInit = 'STOP u nuždi je još pritisnut'; return; }
      dum.ukljuci(); dum.postaviPreklopnik('SW1', true, 5);
    }
    if (dum.stanje.greska.tip === 2) dum.resetTipka();
    if (!dum.stanje.nestGotov) {
      log('rob', 'NEST: traženje mehaničkog ishodišta (NT)');
      dum.posalji('NT');
      yield cekaj(() => !dum.zauzet() || dum.stanje.greska.tip, 'NEST: robot traži ishodište');
    }
    if (rob.ucitano !== rob.programTekst) {
      const rez = dum.ucitaj(rob.programTekst);
      const g = rez.find((r) => r && r.greska);
      if (g || dum.stanje.greska.tip) { rob.greskaInit = 'program nije učitan: ' + (g ? g.greska.poruka + (g.greska.redak ? ' (redak ' + g.greska.redak + ')' : '') : dum.stanje.greska.poruka); dum.resetTipka(); rob.ucitano = null; return; }
      rob.ucitano = rob.programTekst; log('rob', 'program učitan u DUM1 (' + dum.stanje.program.size + ' redaka, ' + dum.stanje.pozicije.size + ' pozicija)');
    }
    dum.resetTipka();
  }
  function opisIzratka(iz) {
    if (iz.vrsta !== 'kuciste') return iz.vrsta;
    return P.vrstaKucista(iz.boja).naziv + ', ' + (iz.visina * 1000).toFixed(1).replace('.', ',') + ' mm';
  }

  /* ================================================================ stroj stanja stanica */
  const GEN = { dist: [gDist, iDist], isp: [gIsp, iIsp], obr: [gObr, iObr], rob: [null, iRob] };
  function nuzniAktivan() { return RED.some((s) => s.gljiva); }
  function postaviStanje(s, st, opis) {
    if (s.stanje === st) return;
    s.stanje = st; s.cekaT = 0; s.zastoj = false;
    if (opis) log(s.id, opis, st === 'nuzni' || st === 'greska' ? 'greska' : 'info');
    emit('stanje', s);
  }
  function reset(s) {
    if (nuzniAktivan()) { log(s.id, 'RESET ne djeluje: nužni stop je pritisnut', 'upoz'); return false; }
    if (!['ceka-reset', 'stop', 'greska', 'spremna', 'nuzni', 'inicijalizacija'].includes(s.stanje)) return false;
    const dalje = sljedeca(s);
    s.ctx = { g: (function* () {
      yield cekaj(() => !dalje || dalje.stanje !== 'inicijalizacija', 'inicijalizacija protiv toka: čeka sljedeću stanicu');
      yield* GEN[s.id][1]();
    })(), cur: null, done: false, opis: '', cekaT: 0 };
    postaviStanje(s, 'inicijalizacija', 'RESET: inicijalizacija');
    return true;
  }
  function start(s) {
    if (s.stanje !== 'spremna') return false;
    if (s.id === 'rob') {
      dum.postaviUlaz(6, rob.auto ? 1 : 0);
      if (!dum.pokreni()) { log('rob', 'DUM1 ne može pokrenuti program', 'greska'); return false; }
      s.ctx = null;
    } else s.ctx = { g: GEN[s.id][0](), cur: null, done: false, opis: '', cekaT: 0 };
    postaviStanje(s, 'radi', 'START (' + (s.auto ? 'AUTO' : 'MAN — jedan ciklus') + ')');
    return true;
  }
  function stop(s) {
    if (!['radi', 'inicijalizacija', 'spremna'].includes(s.stanje)) return false;
    if (s.id === 'rob') dum.zaustavi();
    s.ctx = null;
    postaviStanje(s, 'stop', 'STOP: glavni program zaustavljen — za nastavak RESET pa START');
    return true;
  }
  function nuzniStop(izvor) {
    const stanice = O.nuzniLinija ? RED : [izvor];
    stanice.forEach((s) => {
      s.ctx = null;
      /* izlazi se isključuju: jednostrani ventili vraćaju cilindre, vakuum se gubi, motori staju */
      if (s === dist) {
        dist.Q.izbacivac = 0; dist.Q.vakuum = 0; dist.Q.otpuh = 0;
        if (dist.naRuci) { const iz = IZ(dist.naRuci); const v = rukaVrh(dist.akt.ruka.poz); iz.gdje = 'ploca'; iz.p = [v[0], v[1], VRH]; dist.naRuci = null; L.stat.ispusteni++; trag(iz, 'pao sa sisaljke (nužni stop: vakuum isključen)'); log('dist', iz.id + ' pao sa sisaljke — nema vakuuma', 'upoz'); }
      }
      if (s === isp) { isp.Q.izbacivac = 0; isp.Q.mjerni = 0; isp.Q.zracni = 0; isp.prijem = false; }
      if (s === obr) { obr.Q.motorStola = 0; obr.Q.motorBusilice = 0; obr.Q.stezanje = 0; obr.Q.ispitivac = 0; obr.Q.zaRobot = 0; obr.prijem = false; }
      if (s === rob) dum.hitniStop('vanjski', true);
      postaviStanje(s, 'nuzni', 'NUŽNI STOP (gljiva na stanici: ' + izvor.naziv + ')');
    });
  }
  /** tipke i preklopke upravljačke ploče: el = 'START' | 'STOP' | 'RESET' | 'AUTO' (v = true/false) | 'GLJIVA' (v = pritisnuta) */
  function ploca(id, el, v = true) {
    const s = ST[id]; if (!s) return false;
    if (el === 'START' || el === 'RESET' || el === 'STOP') s.tipka[el] = 0.25;
    if (el === 'AUTO') { s.auto = !!v; log(id, 'ključ ' + (s.auto ? 'AUTO' : 'MAN')); if (id === 'rob') dum.postaviUlaz(6, s.auto ? 1 : 0); return true; }
    if (el === 'GLJIVA') {
      s.gljiva = !!v;
      if (v) nuzniStop(s);
      else {
        log(id, 'gljiva izvučena');
        if (!nuzniAktivan()) {
          if (rob.dum.stanje.emg.vanjski) dum.hitniStop('vanjski', false);
          RED.forEach((x) => { if (x.stanje === 'nuzni') postaviStanje(x, 'ceka-reset', 'nužni stop otpušten — potreban RESET'); });
        }
      }
      return true;
    }
    if (s.stanje === 'nuzni' && el !== 'STOP') { log(id, el + ' ne djeluje: nužni stop', 'upoz'); return false; }
    if (el === 'RESET') return reset(s);
    if (el === 'START') return start(s);
    if (el === 'STOP') return stop(s);
    return false;
  }

  /* ================================================================ fizika i senzori (svaki korak) */
  function fizika(dt) {
    /* --- distribucijska */
    const da = dist.akt;
    if (dist.stanje !== 'stop') {
      da.izb.cilj = dist.Q.izbacivac ? 1 : 0;
      if (dist.Q.zakretDalje && !dist.Q.zakretSpremnik) da.ruka.cilj = 1;
      if (dist.Q.zakretSpremnik && !dist.Q.zakretDalje) da.ruka.cilj = 0;
      pomakni(da.izb, dt); pomakni(da.ruka, dt);
      dist.vak = dist.Q.vakuum ? Math.min(1, dist.vak + dt / V.vakuum) : 0;
    }
    dist.I.izbStraga = da.izb.poz <= 0.001 ? 1 : 0; dist.I.izbSprijeda = da.izb.poz >= 0.999 ? 1 : 0;
    dist.I.vakuumOK = dist.vak >= 1 && (dist.gura || dist.naRuci) ? 1 : 0;
    dist.I.rukaSpremnik = da.ruka.poz <= 0.001 ? 1 : 0; dist.I.rukaDalje = da.ruka.poz >= 0.999 ? 1 : 0;
    dist.I.imaIzradaka = dist.spremnik.length ? 1 : 0;
    /* --- ispitna */
    const ia = isp.akt;
    if (isp.stanje !== 'stop') {
      if (isp.Q.dizaloGore && !isp.Q.dizaloDolje) ia.dizalo.cilj = 1;
      if (isp.Q.dizaloDolje && !isp.Q.dizaloGore) ia.dizalo.cilj = 0;
      ia.izb.cilj = isp.Q.izbacivac ? 1 : 0; ia.mjerni.cilj = isp.Q.mjerni ? 1 : 0;
      pomakni(ia.dizalo, dt); pomakni(ia.izb, dt); pomakni(ia.mjerni, dt);
    }
    const naD = IZ(isp.naDizalu);
    isp.I.prisutan = naD && ia.dizalo.poz <= 0.001 ? 1 : 0;
    isp.I.nijeCrno = naD && ia.dizalo.poz <= 0.001 && !P.vrstaKucista(naD.boja).crno ? 1 : 0;
    isp.I.metal = naD && ia.dizalo.poz <= 0.001 && P.vrstaKucista(naD.boja).metal ? 1 : 0;
    isp.I.barijera = 1;
    isp.I.visinaOK = naD && ia.mjerni.poz >= 0.999 && P.procjenaIspitne(naD.boja, naD.visina, L.logika) ? 1 : 0;
    isp.I.dizaloGore = ia.dizalo.poz >= 0.999 ? 1 : 0; isp.I.dizaloDolje = ia.dizalo.poz <= 0.001 ? 1 : 0;
    isp.I.izbStraga = ia.izb.poz <= 0.001 ? 1 : 0;
    /* zračni klizač: izradak klizi do ulaznog gnijezda (gravitacija + zrak) */
    for (const id of isp.zracni.slice()) {
      const iz = IZ(id);
      iz.s = Math.min(1, iz.s + dt / V.zracniKlizac);
      if (iz.s >= 1) {
        const n = gnNa('ulaz');
        if (!obr.okret && n >= 0 && !obr.gnijezda[n]) {
          obr.gnijezda[n] = id; iz.gdje = 'stol'; isp.zracni = isp.zracni.filter((x) => x !== id);
          iz.ispitan = false; iz.izbusen = false; trag(iz, 'u ulaznom gnijezdu okretnog stola');
        }
      }
    }
    isp.skart.forEach((id, k) => { const iz = IZ(id); iz.slot = k; iz.s = Math.min(1, (iz.s || 0) + dt / V.klizacSkarta); });
    /* --- obradna */
    const oa = obr.akt;
    if (obr.stanje !== 'stop') {
      oa.ispitivac.cilj = obr.Q.ispitivac ? 1 : 0; oa.stez.cilj = obr.Q.stezanje ? 1 : 0;
      if (obr.Q.busilicaDolje && !obr.Q.busilicaGore) oa.busilica.cilj = 1;
      if (obr.Q.busilicaGore && !obr.Q.busilicaDolje) oa.busilica.cilj = 0;
      pomakni(oa.ispitivac, dt); pomakni(oa.stez, dt); pomakni(oa.busilica, dt);
      if (obr.Q.motorBusilice) obr.vreteno += dt * 40;
      /* motor stola: jedan korak od 60° po uključenju (upravljač ga gasi na senzoru položaja) */
      if (obr.Q.motorStola && !obr.okret && !obr.korakGotov) obr.okret = { od: obr.alfa, p: 0 };
      if (!obr.Q.motorStola) obr.korakGotov = false;
      if (obr.okret && (obr.Q.motorStola || obr.okret.nastavi)) {
        obr.okret.p = Math.min(1, obr.okret.p + dt / V.okretStola);
        obr.alfa = obr.okret.od - KORAK_STOLA * obr.okret.p;
        if (obr.okret.p >= 1) { obr.alfa = kutN(obr.okret.od - KORAK_STOLA); obr.okret = null; obr.korakGotov = true; }
      }
    }
    obr.I.stolUPolozaju = obr.okret ? 0 : 1;
    obr.I.naUlazu = naMjestu('ulaz') ? 1 : 0; obr.I.naIspitivanju = naMjestu('ispitivanje') ? 1 : 0;
    obr.I.naBusenju = naMjestu('busenje') ? 1 : 0; obr.I.naIzlazu = naMjestu('izlaz') ? 1 : 0;
    obr.I.ispitivacOK = oa.ispitivac.poz >= 0.999 && naMjestu('ispitivanje') ? 1 : 0;
    obr.I.busilicaGore = oa.busilica.poz <= 0.001 ? 1 : 0; obr.I.busilicaDolje = oa.busilica.poz >= 0.999 ? 1 : 0;
    obr.I.robotPreuzeo = dum.izlaz(0);
    if (obr.stanje === 'radi') obr.Q.zaRobot = obr.I.naIzlazu && !obr.I.robotPreuzeo ? 1 : 0;
    else if (obr.stanje !== 'stop') obr.Q.zaRobot = 0;
    /* --- robotska: ulazi DUM1 */
    const k = IZ(rob.gnijezdo);
    const ul = [obr.Q.zaRobot, k && !P.vrstaKucista(k.boja).crno, !!k, !!rob.opruge.uzimanje, !!rob.poklopci.uzimanje, rob.izlaz.length < RS.izlaz.kapacitet, rob.auto, rob.dopunaT > 0];
    ul.forEach((v, b) => { if (dum.ulaz(b) !== (v ? 1 : 0)) dum.postaviUlaz(b, v ? 1 : 0); });
    rob.dopunaT = Math.max(0, rob.dopunaT - dt);
    dum.azuriraj(dt);
    /* izlazi DUM1 → cilindri spremnika */
    for (const [sp, bit] of [[rob.opruge, 1], [rob.poklopci, 2]]) {
      sp.cil.cilj = dum.izlaz(bit) ? 1 : 0;
      if (sp.cil.cilj === 1 && sp.cil.poz < 1 && !sp.uzimanje && !sp.gura && sp.stog.length) { sp.gura = sp.stog.shift(); IZ(sp.gura).gdje = sp === rob.opruge ? 'opruga-gura' : 'poklopac-gura'; }
      pomakni(sp.cil, dt);
      if (sp.gura && sp.cil.poz >= 0.999) { const iz = IZ(sp.gura); sp.uzimanje = sp.gura; sp.gura = null; iz.gdje = sp === rob.opruge ? 'opruga-uzimanje' : 'poklopac-uzimanje'; }
    }
    rob.izlaz.forEach((id, i) => { const iz = IZ(id); iz.slot = i; iz.s = Math.min(1, (iz.s || 0) + dt / V.izlazniKlizac); });
    /* robotska stanica: kraj programa / pogreška */
    if (rob.stanje === 'radi' && !dum.stanje.izvodi) {
      if (dum.stanje.greska.tip) postaviStanje(rob, 'greska', 'robot zaustavljen pogreškom ' + (dum.stanje.greska.tip === 1 ? 'I.' : 'II.') + ' vrste: ' + dum.stanje.greska.poruka);
      else postaviStanje(rob, 'spremna', 'program robota završen (MAN: jedan ciklus)');
    }
    if (rob.stanje === 'spremna' && dum.stanje.greska.tip) postaviStanje(rob, 'greska', 'DUM1: ' + dum.stanje.greska.poruka);
    /* tipke ploče (trajanje pritiska za prikaz) i StationLink */
    RED.forEach((s) => { for (const t in s.tipka) s.tipka[t] = Math.max(0, s.tipka[t] - dt); });
    isp.I.slOdasiljac = 0; obr.I.slOdasiljac = 0;
    const ispSpremna = isp.stanje === 'radi' && isp.prijem && !isp.naDizalu && isp.I.dizaloDolje && isp.I.izbStraga;
    const obrSpremna = obr.stanje === 'radi' && obr.prijem && !isp.zracni.length && !naMjestu('ulaz');
    isp.Q.slOdasiljac = ispSpremna ? 1 : 0; obr.Q.slOdasiljac = obrSpremna ? 1 : 0;
    dist.I.slPrijem = isp.Q.slOdasiljac; isp.I.slPrijem = obr.Q.slOdasiljac;
    dist.Q.slOdasiljac = 0; obr.I.slPrijem = 0;
  }
  /* položaji izradaka (za prikaz i za hvat robota) */
  function polozaji() {
    const da = dist.akt, sp = DS.spremnik;
    let z = sp.zDno + (dist.gura && da.izb.poz > 0.02 ? IZ(dist.gura).visina : 0);
    for (const id of dist.spremnik) { const iz = IZ(id); iz.p = [sp.x, sp.y, z]; z += iz.visina; }
    if (dist.gura) { const iz = IZ(dist.gura); iz.p = [sp.x, lerp(sp.y, DS.mjestoUzimanja[1], da.izb.poz), sp.zDno]; }
    if (dist.naRuci) { const iz = IZ(dist.naRuci); const v = rukaVrh(da.ruka.poz); iz.p = [v[0], v[1], sp.zDno + 0.012 * Math.sin(Math.PI * da.ruka.poz)]; }
    const di = M.isp.dizalo;
    if (isp.naDizalu) {
      const iz = IZ(isp.naDizalu); const zd = di.zDolje + isp.akt.dizalo.poz * di.hod;
      iz.p = [di.x + 0.045 * isp.akt.izb.poz, di.y, zd];
    }
    const zk = M.isp.zracniKlizac, zTop = di.zDolje + di.hod, zSt = OS.stol.zVrh;
    for (const id of isp.zracni) { const iz = IZ(id); iz.p = [lerp(zk.od[0], zk.do[0], iz.s), lerp(zk.od[1], zk.do[1], iz.s), lerp(zTop, zSt, iz.s)]; }
    const ks = M.isp.klizacSkarta;
    for (const id of isp.skart) {
      const iz = IZ(id); const cilj = 1 - iz.slot * 0.045 / (ks.do[0] - ks.od[0]);
      const u = Math.min(iz.s, 1) * cilj;
      iz.p = [lerp(ks.od[0], ks.do[0], u), ks.od[1], di.zDolje - ks.pad * u];
    }
    obr.gnijezda.forEach((id, n) => { if (!id) return; const iz = IZ(id); const a = obr.alfa + n * korakGn; iz.p = [OS.stol.x + OS.stol.rGnijezda * Math.cos(a), OS.stol.y + OS.stol.rGnijezda * Math.sin(a), zSt]; });
    if (rob.gnijezdo) { const k = IZ(rob.gnijezdo); k.p = [RS.gnijezdo.x, RS.gnijezdo.y, RS.gnijezdo.zDno]; }
    if (rob.drzi) { const iz = IZ(rob.drzi); const T = tcp(); iz.p = [T[0], T[1], T[2] - iz.dz]; }
    /* dijelovi u kućištu prate kućište */
    L.izradci.forEach((iz) => {
      if (iz.vrsta !== 'kuciste' || !iz.sklop) return;
      const b = iz.p, kl = IZ(iz.sklop.klip), op = IZ(iz.sklop.opruga), po = IZ(iz.sklop.poklopac);
      if (kl) kl.p = [b[0], b[1], b[2] + P.MJERE.izradak.dno];
      if (op) op.p = [b[0], b[1], b[2] + P.MJERE.izradak.dno + P.IZRADCI.klip.visina - 0.004];
      if (po) po.p = [b[0], b[1], b[2] + iz.visina];
    });
    rob.paleta.crni.forEach((id, i) => { if (id) IZ(id).p = [RS.paleta.x0 + i * RS.paleta.korak, RS.paleta.yCrni, RS.paleta.zDno]; });
    rob.paleta.srebrni.forEach((id, i) => { if (id) IZ(id).p = [RS.paleta.x0 + i * RS.paleta.korak, RS.paleta.ySrebrni, RS.paleta.zDno]; });
    for (const [s, sp2] of [[rob.opruge, RS.spremnikOpruga], [rob.poklopci, RS.spremnikPoklopaca]]) {
      let zz = sp2.zIzlaz + (s.gura ? visinaDijela(IZ(s.gura)) : 0);
      for (const id of s.stog) { const iz = IZ(id); iz.p = [sp2.x, sp2.y, zz]; zz += visinaDijela(iz); }
      if (s.gura) IZ(s.gura).p = [sp2.x, lerp(sp2.y, sp2.uzimanje[1], s.cil.poz), sp2.zIzlaz];
      if (s.uzimanje) IZ(s.uzimanje).p = [sp2.uzimanje[0], sp2.uzimanje[1], sp2.zIzlaz];
    }
    const izl = RS.izlaz;
    for (const id of rob.izlaz) {
      const iz = IZ(id); const duz = Math.hypot(izl.do[0] - izl.od[0], izl.do[1] - izl.od[1]);
      const cilj = 1 - iz.slot * 0.045 / duz, u = Math.min(iz.s, 1) * cilj;
      iz.p = [lerp(izl.od[0], izl.do[0], u), lerp(izl.od[1], izl.do[1], u), izl.zDno - izl.pad * u];
    }
  }

  /* ================================================================ glavni korak */
  function korak(dt) {
    L.t += dt;
    fizika(dt);
    for (const s of RED) {
      if (!s.ctx || !['radi', 'inicijalizacija'].includes(s.stanje)) { if (s.stanje !== 'radi' || s.id !== 'rob') s.zastoj = false; continue; }
      korakGen(s.ctx, dt);
      s.opis = s.ctx.opis; s.cekaT = s.ctx.cekaT;
      s.zastoj = s.ctx.cekaT > ZASTOJ_NAKON;
      if (s.ctx.done) {
        const bila = s.stanje;
        s.ctx = null; s.opis = '';
        if (s === rob && rob.greskaInit) postaviStanje(s, 'greska', rob.greskaInit);
        else postaviStanje(s, 'spremna', bila === 'inicijalizacija' ? 'inicijalizacija gotova — START svijetli' : 'ciklus gotov (MAN)');
      }
    }
    /* zastoj robota: čeka ulaz predugo (TB-petlja) */
    if (rob.stanje === 'radi') {
      const tb = dum.stanje.program.get(rob.redak);
      rob.opis = rob.redak ? 'redak ' + rob.redak + ': ' + (tb || '') : '';
      rob.cekaT = /^(TB|TI|GT)\b/.test(tb || '') ? rob.cekaT + dt : 0;
      rob.zastoj = rob.cekaT > 6;
    }
    polozaji();
  }
  let ostatak = 0;
  function azuriraj(dt) {
    ostatak += Math.max(0, Math.min(dt, 5));
    let n = 0;
    while (ostatak >= DT - 1e-12 && n++ < 2000) { korak(DT); ostatak -= DT; }
  }

  /* ================================================================ početno punjenje */
  function dodajUSpremnik(vrstaId) {
    if (dist.spremnik.length >= DS.spremnik.kapacitet) return null;
    const v = P.VRSTE_IZRADAKA.find((x) => x.id === vrstaId) || P.VRSTE_IZRADAKA[0];
    const iz = novi('kuciste', { boja: v.boja, visina: v.visina, skartIzradak: v.skart, gdje: 'spremnik' });
    dist.spremnik.push(iz.id); L.stat.ubaceno++;
    trag(iz, 'stavljen u spremnik (' + v.naziv + ')');
    polozaji();
    return iz;
  }
  function napuniSpremnik(lista) { return lista.map(dodajUSpremnik).filter(Boolean); }
  function isprazniSpremnik() { dist.spremnik.forEach((id) => { const iz = IZ(id); iz.gdje = 'uklonjen'; }); dist.spremnik = []; }
  function dopuniPaletu() {
    let n = 0;
    for (const r of ['crni', 'srebrni']) for (let i = 0; i < RS.paleta.mjesta; i++) if (!rob.paleta[r][i]) { const iz = novi('klip', { boja: r, gdje: 'paleta' }); rob.paleta[r][i] = iz.id; n++; }
    rob.dopunaT = 0.6; polozaji();
    if (n) log('rob', 'paleta klipova dopunjena (' + n + ') — impuls na ulaz 7');
    return n;
  }
  function dopuniSpremnike() {
    let n = 0;
    while (rob.opruge.stog.length + (rob.opruge.uzimanje ? 1 : 0) + (rob.opruge.gura ? 1 : 0) < RS.spremnikOpruga.kapacitet) { const iz = novi('opruga', { gdje: 'opruga-stog' }); rob.opruge.stog.push(iz.id); n++; }
    while (rob.poklopci.stog.length + (rob.poklopci.uzimanje ? 1 : 0) + (rob.poklopci.gura ? 1 : 0) < RS.spremnikPoklopaca.kapacitet) { const iz = novi('poklopac', { gdje: 'poklopac-stog' }); rob.poklopci.stog.push(iz.id); n++; }
    polozaji();
    if (n) log('rob', 'spremnici opruga i poklopaca dopunjeni (' + n + ')');
    return n;
  }
  function isprazniSkart() { const n = isp.skart.length; isp.skart.forEach((id) => { IZ(id).gdje = 'uklonjen'; }); isp.skart = []; if (n) log('isp', 'klizač škarta ispražnjen (' + n + ')'); return n; }
  function isprazniIzlaz() { const n = rob.izlaz.length; rob.izlaz.forEach((id) => { const iz = IZ(id); iz.gdje = 'uklonjen'; if (iz.sklop) ['klip', 'opruga', 'poklopac'].forEach((k) => { if (iz.sklop[k]) IZ(iz.sklop[k]).gdje = 'uklonjen'; }); }); rob.izlaz = []; if (n) log('rob', 'izlazni klizač ispražnjen (' + n + ')'); return n; }
  function pocistiPlocu() { let n = 0; L.izradci.forEach((iz) => { if (iz.gdje === 'ploca') { iz.gdje = 'uklonjen'; n++; } }); return n; }
  dopuniPaletu(); rob.dopunaT = 0; dopuniSpremnike();

  /* ================================================================ upiti za stranicu */
  function lampice(id) {
    const s = ST[id], trep = Math.floor(L.t / 0.5) % 2 === 0;
    const traziReset = ['ceka-reset', 'stop', 'greska'].includes(s.stanje) || (s.stanje === 'nuzni' && !nuzniAktivan());
    return {
      start: s.stanje === 'spremna',
      reset: traziReset ? trep : s.stanje === 'inicijalizacija',
      q1: s.stanje === 'radi',
      q2: (s.zastoj || s.stanje === 'greska' || s.stanje === 'nuzni') ? trep : false
    };
  }
  function io(id) {
    const s = ST[id];
    if (id === 'rob') {
      return {
        ulazi: P.ROBOT_SUCELJE.ulazi.map((u) => ({ oz: 'ulaz ' + u.bit, naziv: u.naziv, v: dum.ulaz(u.bit) })),
        izlazi: P.ROBOT_SUCELJE.izlazi.map((u) => ({ oz: 'izlaz ' + u.bit, naziv: u.naziv, v: dum.izlaz(u.bit) }))
      };
    }
    const lam = lampice(id);
    const pan = { tStart: s.tipka.START > 0 ? 1 : 0, tStop: s.tipka.STOP > 0 ? 0 : 1, kAuto: s.auto ? 1 : 0, tReset: s.tipka.RESET > 0 ? 1 : 0, nStop: s.gljiva ? 0 : 1,
      lStart: lam.start ? 1 : 0, lReset: lam.reset ? 1 : 0, lQ1: lam.q1 ? 1 : 0, lQ2: lam.q2 ? 1 : 0 };
    const val = (k, izv) => (k in pan ? pan[k] : (izv[k] ? 1 : 0));
    return {
      ulazi: P.SIGNALI[id].ulazi.map((u) => ({ oz: u.oz, naziv: u.naziv, v: val(u.k, s.I) })),
      izlazi: P.SIGNALI[id].izlazi.map((u) => ({ oz: u.oz, naziv: u.naziv, v: val(u.k, s.Q) }))
    };
  }
  function stanjeModela() {
    const izradci = [];
    L.izradci.forEach((iz) => { if (iz.gdje !== 'uklonjen' && iz.gdje !== 'nigdje' && !iz.gdje.endsWith('-stog-skriven')) izradci.push(iz); });
    return {
      dist: { izb: dist.akt.izb.poz, ruka: dist.akt.ruka.poz, vakuum: dist.vak > 0, otpuh: !!dist.Q.otpuh },
      isp: { dizalo: isp.akt.dizalo.poz, izb: isp.akt.izb.poz, mjerni: isp.akt.mjerni.poz, zracni: !!isp.Q.zracni },
      obr: { alfa: obr.alfa, stez: obr.akt.stez.poz, busilica: obr.akt.busilica.poz, vreteno: obr.vreteno, ispitivac: obr.akt.ispitivac.poz },
      rob: { q: dum.stanje.q.slice(), otvorenost: dum.stanje.prihvatnica.otvorenost ?? (dum.stanje.prihvatnica.zatvorena ? 0 : 1) },
      mont: { opruga: rob.opruge.cil.poz, poklopac: rob.poklopci.cil.poz },
      izradci
    };
  }
  function postaviProgram(tekst) {
    const greske = [];
    String(tekst).split(/\r?\n/).forEach((l, i) => { if (!l.trim()) return; const p = dum.parsiraj(l); if (p.greska) greske.push({ redak: i + 1, tekst: l, poruka: p.greska.poruka }); });
    if (!greske.length) { rob.programTekst = String(tekst); log('rob', 'program izmijenjen — učitava se u DUM1 pri sljedećem RESET-u robotske stanice'); }
    return greske;
  }
  Object.assign(L, {
    stanice: ST, redoslijed: RED, robot: dum, rob, dist, isp, obr,
    ploca, resetLinije() { [...RED].reverse().forEach((s) => reset(s)); }, startLinije() { [...RED].reverse().forEach((s) => start(s)); },
    stopLinije() { RED.forEach((s) => stop(s)); },
    azuriraj, korak, dodajUSpremnik, napuniSpremnik, isprazniSpremnik, dopuniPaletu, dopuniSpremnike, isprazniSkart, isprazniIzlaz, pocistiPlocu,
    lampice, io, stanjeModela, postaviProgram, tcp, zadaniProgram: ZADANI_PROGRAM, opisIzratka,
    postaviLogiku(l) { L.logika = l; log('isp', 'logika ispitne stanice: ' + l); },
    nuzniAktivan
  });
  polozaji();
  return L;
}
