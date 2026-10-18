/* FORTRONIQ · Pametna tvornica CP Factory — jezgra simulatora linije: tok nosača i paleta, naš pojednostavljeni MES (nalozi, planovi rada,
   operacije s resursima), stanice ASRS32, BRANCH i RASS, sigurnosni lanac, robot KUKA (kuka_kin: IK, PTP, LIN), Robotino (robotino_kin:
   svesmjerni pogon, odometrija, pristajanje) i UR3e (ur3e_kin). Bez THREE i DOM-a — stranica „Simulator linije” samo čita stanje (st) i crta ga.
   Svi podaci linije dolaze iz cpf_podaci.js, robota iz njihovih podatkovnih modula; vlastiti parametri simulatora su u bloku SIM
   (popisani na stranici pod „Što simulator pojednostavljuje”).
   Vrijeme: nepromjenjivi korak SIM.dt = 10 ms. Procesi stanica su generatori (yield vraća dt) — jedan korak = jedan next(dt).
   KS tlocrta linije: x uz liniju, y prema stražnjoj strani, z gore (metri, radijani).
   © ForTroniQ d.o.o. */
import { KONFIG, MJERE, MES, MATERIJAL, MODULI, UPRAVLJANJE, SCENARIJ, pretpostavke } from './cpf_podaci.js';
import { putevi, tockaPuta } from './cpf_model.js';
import * as KK from '../robot-kuka-kr6-r900/kuka_kin.js';
import { PRIHVATNICE, POLOZAJI as KPOL, MJERE as KMJ } from '../robot-kuka-kr6-r900/kuka_podaci.js';
import * as RK from '../mobilni-robot-robotino/robotino_kin.js';
import { POGON as RPOGON, MJERE as RMJ, DIJELOVI as RDIJ } from '../mobilni-robot-robotino/robotino_podaci.js';
import * as UK from '../kobot-ur3e/ur3e_kin.js';

const PI = Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const glatko = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(PI * u));
const wrap = (x, L) => ((x % L) + L) % L;
const kutRaz = (a) => { let x = (a + PI) % (2 * PI); if (x < 0) x += 2 * PI; return x - PI; };
const brojevi = (s) => (String(s || '').replace(/(\d),(\d)/g, '$1.$2').match(/\d+(\.\d+)?/g) || []).map(Number);
const zarez = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

/* ================================================================== podaci iz drugih modula (bez brojeva „na tvrdo”) */
const BAT_N = RDIJ.filter((d) => /^baterija\d+$/.test(d.id)).length || 1;
const BAT1 = RDIJ.find((d) => d.id === 'baterija1');
const BAT_VA = brojevi(BAT1 && (BAT1.podaci.find((p) => /Napon/.test(p[0])) || [])[1]);
export const E_BAT = BAT_N * (BAT_VA[0] || 18) * (BAT_VA[1] || 5.2);            /* Wh (Robotino) */
const P_STANICA = MODULI.stanica.snaga;                                           /* W (CPF podaci, FAC-248) */
const KAP_PCB = (brojevi(MATERIJAL.kutijaPCB.sadrzaj).reduce((a, b) => a * b, 1)) || 4;   /* „2 × 2 gnijezda” → 4 */
const T_ASRS_P = (SCENARIJ.koraci.find((k) => k.opNo === 212) || {}).trajanje;
const T_RASS_P = (SCENARIJ.koraci.find((k) => k.resurs === 'rass') || {}).trajanje;

/* ================================================================== parametri simulatora (naše pretpostavke — ispisuju se na stranici) */
export const SIM = {
  dt: 0.01,
  vTrake: MJERE.traka.brzinaBrza,      /* pretpostavka iz cpf_podaci (brzina nije objavljena) */
  razmak: 0.19,                        /* najmanji razmak središta nosača na traci (nosač 160 mm + 30 mm) */
  nosaca: 3,                           /* nosača u petlji */
  tRfid: 0.3, tMes: 0.2,               /* čitanje/pisanje RFID-a i odgovor MES-a */
  tSkretnica: 0.6, tReset: 2.0, odmakZaustavljaca: 0.17,
  kuka: { override: 0.4, profil: 1.5, vLin: 0.25, tMin: 0.35, tAlat: 0.5, tHvat: 0.35, tVakuum: 0.3, tKamera: 1.5, iznad: 0.07, prilazAlat: 0.15, odmakAlat: 0.03 },
  robotino: { vMax: RPOGON.ogranicenja.vMax, wMax: RPOGON.ogranicenja.wMax, aLin: 0.5, aKut: 1.5, vPristajanje: 0.08, vPrihvat: 0.1, tHandshake: 0.6,
    tOdrediste: 6, tOdluka: 1.5, prag: 0.2, pMir: 20, pVoznja: 40, ubrzanjeBat: 20, batPocetak: 0.8, odmakPristajanja: 0.35 },
  ur: { faktor: 2.0, tMin: 0.8, tCekaj: 0.6 },
  kutijaPCB: KAP_PCB,
  log: 300
};
export const PROCJENA = { asrs: T_ASRS_P, rass: T_RASS_P };

/* ================================================================== MES: operacije i planovi rada (iz MES.operacije) */
const opPoBroju = (n) => MES.operacije.find((o) => o.opNo === n);
const opPoResursu = (k) => MES.operacije.find((o) => o.resurs === k && o.nedostaje) || MES.operacije.find((o) => o.resurs === k);
const NEDOSTAJE = pretpostavke().filter((p) => p.vrsta === 'nedostaje');
/** prikaz broja operacije: 212 ili „—” s napomenom „nedostaje” (iz podataka) */
export function brojOp(op) {
  if (!op) return { tekst: '—', nedostaje: true, napomena: 'nedostaje' };
  if (op.opNo != null) return { tekst: String(op.opNo), nedostaje: false, napomena: '' };
  const kljuc = { rass: /RASS/, branch: /BRANCH/, robotino: /Robotin/ }[op.resurs];
  const p = NEDOSTAJE.find((x) => kljuc && kljuc.test(x.sto));
  return { tekst: '—', nedostaje: true, napomena: 'nedostaje' + (p ? ' — ' + p.napomena : '') };
}
export const TIPOVI_NALOGA = [
  { id: 'mobitel', naziv: 'Mobitel s PCB-om i osiguračima', opis: 'izdavanje palete (ST1), montaža u RASS-u, pohrana (ST2)', plan: [opPoBroju(212), opPoResursu('rass'), opPoBroju(211)] },
  { id: 'robotino', naziv: 'Mobitel preko Robotina', opis: 'izdavanje, grananje u krak BRANCH-a, vožnja Robotinom i povratak, montaža, pohrana', plan: [opPoBroju(212), opPoResursu('branch'), opPoResursu('robotino'), opPoResursu('rass'), opPoBroju(211)] },
  { id: 'krug', naziv: 'Kontrolni krug palete', opis: 'izdavanje na ST1, puni krug po petlji, pohrana sa ST1', plan: [opPoBroju(212), opPoBroju(210)] }
];
export const BOJE = Object.keys(MATERIJAL.izradak.dijelovi[0].boje);          /* crna, siva, plava, crvena */
export const NAZIV_RESURSA = { asrs: 'ASRS32', branch: 'BRANCH', rass: 'RASS', robotino: 'Robotino', cobot: 'CP-COBOT-M', mes: 'MES' };
const STOPER_OP = { 212: 'asrsST1', 210: 'asrsST1', 213: 'asrsST2', 211: 'asrsST2' };

/* ================================================================== generatori (yield vraća dt) */
function* cekaj(t) { let x = 0; while (x < t - 1e-9) x += yield; }
function* dok(uvjet) { while (!uvjet()) yield; }
function* gibaj(T, f) { let x = 0; f(0); while (x < T - 1e-9) { x += yield; f(Math.min(1, x / T)); } }

/* ================================================================== simulacija */
/**
 * napraviSimulaciju({ tocke, zaustavljaci, asrsMjesta, asrsStoper, mjestaAlata, kukaBaza }) — podatke o geometriji daje model linije (L.tocke,
 * L.zaustavljaci, L.moduli.asrs.mjesta …); bez njih se računaju iz MJERE (isti izrazi kao u cpf_model.js).
 */
export function napraviSimulaciju(G = {}) {
  const P = putevi();
  const PUT = { petlja: P.petlja, bypassRASS: P.bypassRASS, krakBRANCH: P.krakBRANCH };
  const R = KONFIG.raspored, W = MJERE.modul.sirina / 2, Dm = MJERE.modul.dubina / 2;
  const ZT = MJERE.traka.visina, ZP = MJERE.paluba;
  const T = G.tocke;                                    /* L.tocke (obavezno za Robotino i KUKA) */
  const ZAUST = G.zaustavljaci;
  const listeneri = [];

  /* ---------- geometrija RASS-a (tlocrt) iz MJERE — isti izrazi kao u gradiRASS (lokalno → tlocrt: x = rass.x − W + X, y = rass.y − Dm + Y) */
  const S = MJERE.rass, rx = (X) => R.rass.x - W + X, ry = (Y) => R.rass.y - Dm + Y;
  const GEO = {
    alati: G.mjestaAlata || Array.from({ length: S.magazin.broj }, (_, i) => ({ x: rx(S.magazin.x + 0.08), y: ry(S.magazin.y), z: S.magazin.z0 + i * S.magazin.korak })),
    naprava: { x: rx(S.naprava.x), y: ry(S.naprava.y), z: ZP + 0.032 },
    kamera: { x: rx(S.kamera.x), y: ry(S.kamera.y), z: S.kamera.z },
    cijevi: Array.from({ length: S.osiguraci.broj }, (_, i) => ({ x: rx(S.osiguraci.x - 0.03 + i * 0.03), y: ry(S.osiguraci.y), z: ZP + 0.03 + S.osiguraci.visina })),
    kutija: { x: rx(S.trakaKutije.x), y: ry(S.trakaKutije.y0 + MJERE.kutija.duljina / 2 + 0.01), z: S.trakaKutije.z + 0.02 }
  };
  const a = MJERE.kutija.sirina, b = MJERE.kutija.duljina;
  GEO.slotovi = [[-1, -1], [1, -1], [-1, 1], [1, 1]].slice(0, Math.max(1, KAP_PCB)).map(([sx, sy]) => ({ x: GEO.kutija.x + sx * a * 0.22, y: GEO.kutija.y + sy * b * 0.22, z: GEO.kutija.z + 0.033 }));
  GEO.izradak = MJERE.izradak;
  const H_NOSAC = MJERE.nosac.visina + MJERE.paleta.visina;   /* gornja ploha palete iznad remena */

  /* ---------- KUKA: KS robota (baza iz L.tocke.robotKUKA) */
  const BK = T.robotKUKA;
  const uRobot = (x, y, z) => { const dx = x - BK.x, dy = y - BK.y, c = Math.cos(BK.phi), s = Math.sin(BK.phi); return [dx * c + dy * s, -dx * s + dy * c, z - BK.z]; };
  const aRob = (kutPlan) => kutPlan - BK.phi;                 /* zakret alata oko z: kut u tlocrtu → A u KS robota */
  const cilj = (x, y, z, A = PI) => { const [xr, yr, zr] = uRobot(x, y, z); return KK.okvir(xr, yr, zr, A, 0, PI); };
  const alatOkvir = (i) => (i ? KK.okvir(0, 0, PRIHVATNICE[i - 1].tcp.z) : null);
  const HF = KMJ.izmjenjivac.visinaFiksni;

  /* ---------- Robotino: poze (KS tlocrta = KS svijeta robota) */
  const dock = { ...T.robotinoDocking };
  const pun = RK.pozaPristajanja(T.punjenje.x, T.punjenje.y, T.punjenje.phi);
  const C = R.cobot, CW = MJERE.cobot.sirina / 2;
  const tipKraka = tockaPuta(P.krakBRANCH, P.krakBRANCH.L / 2);
  const odmakPrihvata = Math.hypot(tipKraka.x - dock.x, tipKraka.y - dock.y);       /* od središta robota do vrha kraka */
  const RP = {
    dock, preDock: { x: dock.x, y: dock.y - SIM.robotino.odmakPristajanja, phi: dock.phi },
    pun: { x: pun.x, y: pun.y, phi: kutRaz(pun.phi) },
    prePun: { x: pun.x - SIM.robotino.odmakPristajanja * Math.cos(pun.phi), y: pun.y - SIM.robotino.odmakPristajanja * Math.sin(pun.phi), phi: kutRaz(pun.phi) },
    /* odredište iza CP-COBOT-M (inačica M nema docking — samo prikaz vožnje; prihvat okrenut prema modulu; desno je privjesak) */
    odrediste: { x: C.x, y: C.y + MJERE.cobot.dubina / 2 + odmakPrihvata, phi: PI },
    medju: { x: (C.x + dock.x) / 2, y: (C.y + MJERE.cobot.dubina / 2 + odmakPrihvata + dock.y - SIM.robotino.odmakPristajanja) / 2, phi: PI / 2 },
    parking: { x: (dock.x + pun.x) / 2 + 0.2, y: Math.min(dock.y, pun.y) - 0.75, phi: 0 }
  };
  const Z_PRIH = RMJ.prihvat ? RMJ.prihvat.z : 1.02;

  /* ---------- UR3e: KS robota iz L.tocke.robotUR3e */
  const BU = T.robotUR3e;
  const UR_Q0 = [PI, -PI / 2, PI / 2, -PI / 2, -PI / 2, 0];   /* početna poza: ruka okrenuta prema kutijama (os x robota, prema −y tlocrta) */

  /* ================================================================ stanje */
  const st = {};
  function zapis(izvor, tekst, vrsta = 'info') {
    st.log.push({ t: st.t, izvor, tekst, vrsta });
    if (st.log.length > SIM.log) st.log.splice(0, st.log.length - SIM.log);
    st.verzijaLoga++;
  }
  function dogadjaj(e, d) { st.brojac[e] = (st.brojac[e] || 0) + 1; listeneri.forEach((f) => { try { f(e, d); } catch (x) { /* slušač ne ruši simulaciju */ } }); }
  const lanac = UPRAVLJANJE.sigurnosniLanac.redoslijed.map((r) => r.modul);
  const LINIJA = lanac.slice();

  function noviModul(k, nacin) {
    const m = MODULI[k];
    const kon = UPRAVLJANJE.sigurnosniLanac.redoslijed.find((r) => r.modul === k);
    return { kljuc: k, naziv: NAZIV_RESURSA[k], oznaka: m.oznaka, nazivHr: m.nazivHr, resurs: MES.resursi[k] ?? null, nacin, stanje: 'rad', zauzet: 0, gljiva: false,
      tReset: 0, hmi: ['Automatic', 'spreman', ''], greska: '', konektor: kon ? kon.konektor : null };
  }

  function pocetnoStanje(o = {}) {
    Object.keys(st).forEach((k) => delete st[k]);
    Object.assign(st, {
      t: 0, log: [], verzijaLoga: 0, brojac: {}, verzija: 0,
      moduli: { rass: noviModul('rass', 'mes'), branch: noviModul('branch', 'mes'), asrs: noviModul('asrs', 'mes'), cobot: noviModul('cobot', 'samostalno'), robotino: noviModul('robotino', 'mes') },
      nosaci: [], zaust: {}, skretnica: 0, nalozi: [], sljedeciONo: 1001, procesi: [], tTrake: 0,
      asrs: { x: MJERE.asrs.os.xMax, z: MJERE.asrs.os.zMin + 0.3, y: 0, c: 0, otvorena: true, paletaH: null, police: [], verzija: 0, polica: null },
      kuka: { q: KPOL.prirubnicaDolje.slice(), alat: 0, prsti: 1, vakuum: false, gibanje: '—', korak: '' },
      rass: { kuciste: null, pcb: null, slot: null, osig: 0, osigTcp: false, kamera: false, kutijaPCB: KAP_PCB, boja: null, nosac: null, cekaKutiju: false },
      rob: { x: RP.pun.x, y: RP.pun.y, phi: RP.pun.phi, vx: 0, vy: 0, w: 0, m: [0, 0, 0], kotaci: [0, 0, 0], bat: SIM.robotino.batPocetak, stanje: 'na stanici za punjenje', naStanici: true,
        naBranchu: false, nosac: null, traka: 0, i35: false, q35: false, put: 0, cilj: null },
      zahtjevRobotino: null,
      ur: { q: UR_Q0.slice(), demo: false, korak: '' },
      pauza: false
    });
    /* police ASRS-a: isto zadano stanje kao u modelu (1–12 s kućištem, 13–20 i 25–28 prazne palete) ili o.police */
    const pocetno = o.police || ((n) => (n <= 12 ? { izradak: BOJE[n % 4] } : n <= 20 || (n > 24 && n <= 28) ? {} : null));
    for (let n = 1; n <= 32; n++) st.asrs.police.push(pocetno(n));
    /* zaustavljači: tablica iz modela + virtualni zaustavljač na vrhu kraka (mjesto predaje Robotinu) */
    Object.entries(ZAUST).forEach(([id, z]) => { st.zaust[id] = { id, put: z.put, s: z.s, modul: z.modul, gore: true, nosac: null, pusten: null, virtualni: false }; });
    st.zaust.branchPredaja = { id: 'branchPredaja', put: 'krakBRANCH', s: P.krakBRANCH.L / 2, modul: 'branch', gore: true, nosac: null, pusten: null, virtualni: true };
    /* nosači: prazni (bez palete), ravnomjerno po petlji, ne na zaustavljačima */
    const n = o.nosaca ?? SIM.nosaca;
    for (let i = 0; i < n; i++) st.nosaci.push({ id: 'WC' + (i + 1), cid: i + 1, put: 'petlja', s: wrap(0.35 + i * P.petlja.L / n, P.petlja.L), sadrzaj: { paleta: false }, rfid: null, nalog: null, stop: null, skreni: null, prijenos: null });
    if (o.robotino) Object.assign(st.rob, o.robotino);
    st.od = new RK.Odometrija({ x: st.rob.x, y: st.rob.y, phi: st.rob.phi });
    /* procesi stanica */
    proces('asrs', 'asrs', procesASRS);
    proces('rassTok', 'rass', procesRassTok);
    proces('rassRobot', 'rass', procesRassRobot);
    proces('branchGrananje', 'branch', procesGrananje);
    proces('branchTraka1', 'branch', () => procesProlaz('branchTraka1', 'branch'));
    proces('branchPredaja', 'branch', procesPredaja);
    proces('branchTraka4', 'branch', procesTraka4);
    proces('robotino', 'robotino', procesRobotino);
    proces('cobot', 'cobot', procesCobot);
    if (o.robotino && o.robotino.naStanici === false) st.rob.stanje = 'na parkirnom mjestu';
    zapis('MES', 'Linija u načinu MES i Automatic; ' + n + ' prazna nosača kruže po petlji.', 'mes');
  }
  function proces(ime, modul, fn) { const gen = fn(); gen.next(); st.procesi.push({ ime, modul, gen, gotov: false }); }

  /* ================================================================ moduli i sigurnosni lanac */
  const modulRadi = (k) => st.moduli[k] && st.moduli[k].stanje === 'rad';
  function modulNaX(x) { if (x < R.rass.x + W) return 'rass'; if (x < R.branch.x + W) return 'branch'; return 'asrs'; }
  function modulNosaca(c) {
    if (c.put === 'bypassRASS') return 'rass';
    if (c.put === 'krakBRANCH' || c.put === 'prijenos') return 'branch';
    if (c.put === 'robotino') return 'robotino';
    return modulNaX(tockaPuta(P.petlja, c.s).x);
  }
  function hmi(k, ...r) { st.moduli[k].hmi = [r[0] || '', r[1] || '', r[2] || '']; }
  function gljiva(k) {
    const m = st.moduli[k]; if (!m) return;
    m.gljiva = !m.gljiva;
    if (LINIJA.includes(k)) {
      if (m.gljiva) {
        LINIJA.forEach((j) => { const mj = st.moduli[j]; mj.stanje = 'estop'; mj.tReset = 0; hmi(j, 'NUŽNI STOP', 'lanac ' + LINIJA.map((x) => st.moduli[x].konektor).join('–') + ' otvoren', 'aktuatori isključeni'); });
        zapis(NAZIV_RESURSA[k], 'Nužni stop pritisnut — sigurnosni lanac otvoren, svi aktuatori na liniji isključeni.', 'greska');
        dogadjaj('estop', { modul: k });
      } else {
        zapis(NAZIV_RESURSA[k], 'Gljiva nužnog stopa otpuštena.', 'sig'); dogadjaj('gljivaOtpustena', { modul: k });
        if (!LINIJA.some((j) => st.moduli[j].gljiva)) LINIJA.forEach((j) => { const mj = st.moduli[j]; if (mj.stanje === 'estop') { mj.stanje = 'cekaReset'; hmi(j, 'Lanac zatvoren', 'potvrdi tipkom Reset', ''); } });
      }
    } else {
      if (m.gljiva) { m.stanje = 'estop'; hmi(k, 'NUŽNI STOP', 'samo ovaj modul', ''); zapis(NAZIV_RESURSA[k], 'Nužni stop modula (nije u lancu linije).', 'greska'); dogadjaj('estopModul', { modul: k }); }
      else { m.stanje = 'cekaReset'; hmi(k, 'potvrdi tipkom Reset', '', ''); }
    }
    st.verzija++;
  }
  function reset(k) {
    const m = st.moduli[k]; if (!m) return false;
    const grupa = LINIJA.includes(k) ? LINIJA : [k];
    if (grupa.some((j) => st.moduli[j].gljiva)) { zapis(NAZIV_RESURSA[k], 'Reset odbijen: gljiva nužnog stopa je još pritisnuta.', 'greska'); dogadjaj('resetOdbijen', { modul: k }); return false; }
    if (m.stanje === 'greska' && k === 'rass' && st.rass.cekaKutiju) { zapis('RASS', 'Reset odbijen: kutija PCB je prazna — najprije „Box change”.', 'greska'); dogadjaj('resetOdbijen', { modul: k }); return false; }
    if (!['cekaReset', 'greska', 'cekaStart'].includes(m.stanje)) return false;
    m.stanje = 'reset'; m.tReset = SIM.tReset; m.greska = ''; hmi(k, 'Reset', 'referenciranje', '');
    zapis(NAZIV_RESURSA[k], 'Reset: stanica odlazi u početno stanje.', 'sig'); dogadjaj('reset', { modul: k }); st.verzija++;
    return true;
  }
  function start(k) {
    const m = st.moduli[k]; if (!m || m.stanje !== 'cekaStart') return false;
    m.stanje = 'rad'; hmi(k, 'Automatic', m.nacin === 'mes' ? 'MES' : m.nacin === 'default' ? 'Default' : '', '');
    zapis(NAZIV_RESURSA[k], 'Start: automatski rad.', 'sig'); dogadjaj('start', { modul: k }); st.verzija++;
    return true;
  }
  function nacin(k, v) {
    const m = st.moduli[k]; if (!m || !LINIJA.includes(k) || !['mes', 'default'].includes(v) || m.nacin === v) return;
    m.nacin = v; zapis(NAZIV_RESURSA[k], 'Način rada: ' + (v === 'mes' ? 'Automatic — MES (operacije dodjeljuje MES4)' : 'Automatic — Default (stanica radi po vlastitoj tablici, MES joj ne dodjeljuje operacije)') + '.', 'mes');
    dogadjaj('nacin', { modul: k, v }); st.verzija++;
  }
  function greska(k, tekst) { const m = st.moduli[k]; m.stanje = 'greska'; m.greska = tekst; hmi(k, 'GREŠKA', tekst, 'ukloni uzrok, Reset, Start'); zapis(NAZIV_RESURSA[k], 'Greška: ' + tekst, 'greska'); dogadjaj('greska', { modul: k }); st.verzija++; }
  function boxChange() {
    st.rass.kutijaPCB = KAP_PCB; zapis('RASS', 'Box change: nova kutija PCB (PNo ' + MATERIJAL.kutijaPCB.mesPNo + ') s ' + KAP_PCB + ' pločice.', 'sig'); dogadjaj('boxChange');
    if (st.rass.cekaKutiju) { st.rass.cekaKutiju = false; const m = st.moduli.rass; if (m.stanje === 'greska') { m.stanje = 'cekaReset'; hmi('rass', 'Kutija izmijenjena', 'potvrdi tipkom Reset', ''); } }
    st.verzija++;
  }

  /* ================================================================ MES */
  function zaliha() { const z = { boje: {}, prazne: 0, slobodno: 0 }; BOJE.forEach((b) => { z.boje[b] = 0; }); st.asrs.police.forEach((p) => { if (!p) z.slobodno++; else if (p.izradak && !p.rezervirana) z.boje[p.izradak] = (z.boje[p.izradak] || 0) + 1; else if (!p.izradak) z.prazne++; }); return z; }
  function posaljiNalog(o = {}) {
    const tip = TIPOVI_NALOGA.find((t) => t.id === (o.tip || 'mobitel')) || TIPOVI_NALOGA[0];
    const boja = BOJE.includes(o.boja) ? o.boja : BOJE[0];
    const osiguraci = clamp(Math.round(Number(o.osiguraci ?? 2)), 0, 2);
    const ono = st.sljedeciONo++;
    const nal = { ono, tip: tip.id, naziv: tip.naziv, boja, osiguraci, stanje: 'čeka', nosac: null, polica: null, policaSpremanja: null, t0: st.t, t1: null,
      pozicije: tip.plan.map((op, i) => ({ opos: i + 1, op, resurs: op.resurs, stanje: 'čeka', t0: null, t1: null })) };
    st.nalozi.push(nal);
    zapis('MES', 'SetNewOrder: nalog ONo ' + ono + ' „' + tip.naziv + '” (' + boja + ', osigurača ' + osiguraci + '), ' + nal.pozicije.length + ' pozicije plana rada.', 'mes');
    dogadjaj('nalog', { ono, tip: tip.id }); st.verzija++;
    return nal;
  }
  const nalogPo = (ono) => st.nalozi.find((n) => n.ono === ono) || null;
  const tekuca = (nal) => (nal ? nal.pozicije.find((p) => p.stanje !== 'gotovo') || null : null);
  function rfidZapis(c, nal) {
    const p = tekuca(nal);
    c.rfid = nal ? { cid: c.cid, ono: nal.ono, opos: p ? p.opos : null, pno: MATERIJAL.paleta.mesPNo, resurs: p ? MES.resursi[p.resurs] : null, resursK: p ? p.resurs : null, op: p ? brojOp(p.op).tekst : '—' } : null;
  }
  function opStart(nal, poz, k) {
    poz.stanje = 'radi'; poz.t0 = st.t; nal.stanje = 'u radu';
    zapis(NAZIV_RESURSA[k] + ' (' + (MES.resursi[k] ?? '—') + ')', 'OpStart: ONo ' + nal.ono + ' OPos ' + poz.opos + ' · OpNo ' + brojOp(poz.op).tekst + ' ' + poz.op.naziv, 'op');
    dogadjaj('opStart', { ono: nal.ono, opNo: poz.op.opNo, resurs: k }); dogadjaj('opStart:' + (poz.op.opNo ?? k)); st.verzija++;
  }
  function opEnd(nal, poz, k, c) {
    poz.stanje = 'gotovo'; poz.t1 = st.t;
    const sl = tekuca(nal);
    if (c) rfidZapis(c, sl ? nal : null);
    zapis(NAZIV_RESURSA[k] + ' (' + (MES.resursi[k] ?? '—') + ')', 'OpEnd: ONo ' + nal.ono + ' OPos ' + poz.opos + ' (' + zarez(poz.t1 - poz.t0) + ' s)' + (sl ? ' → RFID: sljedeći resurs ' + NAZIV_RESURSA[sl.resurs] + ' (' + (MES.resursi[sl.resurs] ?? '—') + '), OpNo ' + brojOp(sl.op).tekst : ' → nalog završen'), 'op');
    dogadjaj('opEnd', { ono: nal.ono, opNo: poz.op.opNo, resurs: k }); dogadjaj('opEnd:' + (poz.op.opNo ?? k));
    if (!sl) { nal.stanje = 'gotov'; nal.t1 = st.t; if (c) { c.nalog = null; c.rfid = null; } zapis('MES', 'Nalog ONo ' + nal.ono + ' završen za ' + zarez(nal.t1 - nal.t0) + ' s.', 'mes'); dogadjaj('nalogGotov', { ono: nal.ono, tip: nal.tip }); dogadjaj('nalogGotov:' + nal.tip); }
    st.verzija++;
  }

  /* ================================================================ transport nosača */
  const naPutu = (c) => c.put in PUT;
  const udaljenost = (put, s0, s1) => (PUT[put].zatvoren ? wrap(s1 - s0, PUT[put].L) : s1 - s0);
  function prostor(c) {
    const p = PUT[c.put], G = SIM.razmak; let lim = Infinity;
    for (const o of st.nosaci) {
      if (o === c || !naPutu(o)) continue;
      if (o.put === c.put) { const d = udaljenost(c.put, c.s, o.s); if (d > 1e-9) lim = Math.min(lim, d - G); }
    }
    if (!p.zatvoren) {
      /* kraj sporednog puta: spajanje na petlju u „ulaz” */
      const ul = P.spojevi[c.put].ulaz, ost = p.L - c.s;
      for (const o of st.nosaci) {
        if (o === c || o.put !== 'petlja') continue;
        const rel = wrap(o.s - ul, P.petlja.L);
        if (rel < P.petlja.L / 2) lim = Math.min(lim, ost + rel - G);
        else if (P.petlja.L - rel < G) lim = Math.min(lim, ost - 1e-4);           /* nosač na petlji upravo prilazi spoju: pričekaj */
      }
    } else if (c.skreni) {
      const iz = P.spojevi[c.skreni].izlaz, d0 = wrap(iz - c.s, P.petlja.L);
      if (d0 < 0.5) for (const o of st.nosaci) if (o.put === c.skreni) lim = Math.min(lim, d0 + o.s - G);
    }
    return lim;
  }
  function korakTransporta(dt) {
    const v = SIM.vTrake;
    for (const c of st.nosaci) {
      if (!naPutu(c) || c.stop) continue;
      if (!modulRadi(modulNosaca(c))) continue;
      let ds = Math.min(v * dt, Math.max(0, prostor(c)));
      if (ds <= 0) continue;
      let zaustav = null;
      for (const z of Object.values(st.zaust)) {
        if (z.put !== c.put || !z.gore || (z.pusten && z.pusten === c.id)) continue;
        const d = udaljenost(c.put, c.s, z.s);
        if (d > 1e-9 && d <= ds + 1e-12) { if (!zaustav || d < zaustav.d) zaustav = { z, d }; }
      }
      if (zaustav) ds = zaustav.d;
      const p = PUT[c.put];
      let sN = c.s + ds;
      if (p.zatvoren) {
        /* skretanje na sporedni put */
        if (c.skreni && !zaustav) {
          const iz = P.spojevi[c.skreni].izlaz, d0 = wrap(iz - c.s, p.L);
          if (d0 <= ds + 1e-12) {
            const slobodno = !st.nosaci.some((o) => o !== c && o.put === c.skreni && o.s < SIM.razmak) && (c.skreni !== 'krakBRANCH' || st.skretnica > 0.98);
            if (slobodno) { const ime = c.skreni; c.put = ime; c.s = ds - d0; c.skreni = null; dogadjaj('naPut:' + ime, { id: c.id }); if (c.nalog) zapis('Transport', 'Nosač ' + c.cid + ' skreće na ' + (ime === 'bypassRASS' ? 'treću traku RASS-a (bypass)' : 'krak BRANCH-a (traka 3)') + '.', 'rfid'); continue; }
            sN = c.s + Math.max(0, d0 - 1e-4);
          }
        }
        c.s = wrap(sN, p.L);
      } else if (sN >= p.L) {
        /* spajanje na petlju */
        const ul = P.spojevi[c.put].ulaz;
        const zauzeto = st.nosaci.some((o) => o !== c && o.put === 'petlja' && (() => { const r = wrap(o.s - ul, P.petlja.L); return r < SIM.razmak || P.petlja.L - r < SIM.razmak; })());
        if (zauzeto) c.s = p.L - 1e-4;
        else { const staro = c.put; c.put = 'petlja'; c.s = wrap(ul + (sN - p.L), P.petlja.L); dogadjaj('naPetlju:' + staro, { id: c.id }); if (c.nalog) zapis('Transport', 'Nosač ' + c.cid + ' se vraća na glavnu traku.', 'rfid'); }
      } else c.s = sN;
      if (zaustav) { c.stop = zaustav.z.id; zaustav.z.nosac = c.id; dogadjaj('dolazak', { id: c.id, zid: zaustav.z.id }); }
    }
    /* zaustavljači se dižu kad pušteni nosač prođe */
    for (const z of Object.values(st.zaust)) {
      if (!z.pusten) continue;
      const c = st.nosaci.find((o) => o.id === z.pusten);
      if (!c || c.put !== z.put || udaljenost(z.put, z.s, c.s) > SIM.odmakZaustavljaca) { z.gore = true; z.pusten = null; }
    }
    /* trake se vrte dok linija radi */
    if (LINIJA.every((k) => modulRadi(k))) st.tTrake += dt;
  }
  const nosacNa = (zid) => { const z = st.zaust[zid]; return z && z.nosac ? st.nosaci.find((c) => c.id === z.nosac) || null : null; };
  function pusti(zid) {
    const z = st.zaust[zid]; const c = nosacNa(zid); if (!c) return;
    c.stop = null; z.nosac = null; z.gore = false; z.pusten = c.id;
    if (z.virtualni) { z.gore = true; z.pusten = null; c.s = Math.min(PUT[c.put].L, c.s + 1e-3); }
    st.verzija++;
  }
  function* procitaj(zid, k) {
    const c = nosacNa(zid);
    hmi(k, 'RFID ' + zid, 'čitanje…', 'nosač ' + (c ? c.cid : '—'));
    yield* cekaj(SIM.tRfid);
    const r = c && c.rfid;
    const tekst = c ? ('CarrierID ' + c.cid + (r ? ', ONo ' + r.ono + ', OPos ' + r.opos + ', resurs ' + (r.resurs ?? '—') + ', OpNo ' + r.op : ' — prazan nosač' + (c.sadrzaj.paleta ? ' s paletom' : ''))) : '—';
    hmi(k, 'RFID ' + zid, tekst, '');
    if (c && (c.nalog || r)) zapis(NAZIV_RESURSA[k] + ' (' + (MES.resursi[k] ?? '—') + ')', 'RFID na ' + zid + ': ' + tekst, 'rfid');
    dogadjaj('rfid', { zid, id: c && c.id, nalog: c && c.nalog }); dogadjaj('rfid:' + zid + (c && c.nalog ? ':nalog' : ''));
    if (st.moduli[k].nacin === 'mes') yield* cekaj(SIM.tMes);
    return c;
  }
  /** MES: ima li za ovaj nosač na ovom resursu operaciju (GetOpForONoOPos)? */
  function mesOp(k, c, zid) {
    if (st.moduli[k].nacin !== 'mes' || !c || !c.nalog) return null;
    const nal = nalogPo(c.nalog), p = tekuca(nal);
    if (!p || p.resurs !== k) return null;
    if (k === 'asrs' && STOPER_OP[p.op.opNo] !== zid) return null;
    return { nal, poz: p };
  }

  /* ================================================================ ASRS32 (portal: osi X, Z servo; Y, C pneumatski) */
  const OS = MJERE.asrs.os;
  const mjesto = (n) => (G.asrsMjesta ? G.asrsMjesta[n - 1] : null) || { x: MJERE.asrs.regal.x0 + MJERE.asrs.regal.dx * ((n - 1) % 4), z: MJERE.asrs.regal.z0 + MJERE.asrs.regal.dz * Math.floor(((n - 1) % 16) / 4), c: n <= 16 ? 0 : PI };
  const stoper = (k) => (G.asrsStoper ? G.asrsStoper[k] : null) || { x: MJERE.asrs.stoper.x, z: OS.zMin, y: 0, c: k === 2 ? PI : 0 };
  function* osiXZ(x, z) {
    const A = st.asrs, x0 = A.x, z0 = A.z, Tm = Math.max(Math.abs(x - x0) / OS.vX, Math.abs(z - z0) / OS.vZ, 0.05);
    yield* gibaj(Tm * 1.25, (s) => { const e = glatko(s); A.x = x0 + (x - x0) * e; A.z = z0 + (z - z0) * e; });
  }
  function* osY(y) { const A = st.asrs, y0 = A.y; if (Math.abs(y - y0) < 1e-6) return; yield* gibaj(OS.tY, (s) => { A.y = y0 + (y - y0) * glatko(s); }); }
  function* osC(c) { const A = st.asrs, c0 = A.c; if (Math.abs(c - c0) < 1e-6) return; yield* gibaj(OS.tC, (s) => { A.c = c0 + (c - c0) * glatko(s); }); }
  function* hvat(zatvori) { st.asrs.otvorena = !zatvori; yield* cekaj(OS.tHvat); }
  function* asrsIzdaj(c, zid, n) {
    const k = zid === 'asrsST1' ? 1 : 2, m = mjesto(n), sp = stoper(k);
    hmi('asrs', 'Release P' + k + ' · polica ' + n, 'X/Z do police', '');
    yield* osY(0); yield* osC(m.c); yield* osiXZ(m.x, m.z);
    hmi('asrs', 'Release P' + k + ' · polica ' + n, 'Y van, hvatanje', ''); yield* osY(OS.yHod); yield* hvat(true);
    st.asrs.paletaH = { ...(st.asrs.police[n - 1] || {}) }; delete st.asrs.paletaH.rezervirana; st.asrs.police[n - 1] = null; st.asrs.verzija++;
    yield* osiXZ(m.x, m.z + 0.012); yield* osY(0);
    hmi('asrs', 'Release P' + k + ' · polica ' + n, 'C i X/Z do zaustavljača ' + k, ''); yield* osC(sp.c); yield* osiXZ(sp.x, sp.z + 0.03); yield* osiXZ(sp.x, sp.z);
    yield* hvat(false);
    c.sadrzaj = { paleta: true, izradak: st.asrs.paletaH.izradak || null, pcb: !!st.asrs.paletaH.pcb, osiguraci: st.asrs.paletaH.osiguraci || 0 }; st.asrs.paletaH = null; st.verzija++;
    yield* osiXZ(sp.x, sp.z + 0.05);
  }
  function* asrsSpremi(c, zid, n) {
    const k = zid === 'asrsST1' ? 1 : 2, m = mjesto(n), sp = stoper(k);
    hmi('asrs', 'Store P' + k + ' · polica ' + n, 'X/Z do zaustavljača ' + k, '');
    yield* osY(0); yield* osC(sp.c); yield* osiXZ(sp.x, sp.z + 0.03); yield* osiXZ(sp.x, sp.z); yield* hvat(true);
    st.asrs.paletaH = { izradak: c.sadrzaj.izradak || null, pcb: !!c.sadrzaj.pcb, osiguraci: c.sadrzaj.osiguraci || 0 }; c.sadrzaj = { paleta: false }; st.verzija++;
    yield* osiXZ(sp.x, sp.z + 0.03);
    hmi('asrs', 'Store P' + k + ' · polica ' + n, 'C i X/Z do police', ''); yield* osC(m.c); yield* osiXZ(m.x, m.z + 0.012); yield* osY(OS.yHod); yield* osiXZ(m.x, m.z); yield* hvat(false);
    st.asrs.police[n - 1] = { ...st.asrs.paletaH }; st.asrs.paletaH = null; st.asrs.verzija++;
    yield* osY(0);
  }
  function* procesASRS() {
    while (true) {
      yield* dok(() => (nosacNa('asrsST1') || nosacNa('asrsST2')));
      const zid = nosacNa('asrsST1') ? 'asrsST1' : 'asrsST2';
      const m = st.moduli.asrs;
      const c = yield* procitaj(zid, 'asrs');
      if (!c) continue;
      let rad = mesOp('asrs', c, zid);
      /* prazan nosač na ST1: MES dodjeljuje prvi nalog koji čeka izdavanje (212 Release P1) */
      if (!rad && m.nacin === 'mes' && !c.nalog && !c.sadrzaj.paleta) {
        const nal = st.nalozi.find((n) => n.stanje === 'čeka' && !n.nosac && tekuca(n) && STOPER_OP[tekuca(n).op.opNo] === zid && tekuca(n).op.opNo >= 212);
        if (nal) {
          const n = st.asrs.police.findIndex((p) => p && p.izradak === nal.boja && !p.rezervirana) + 1;
          if (n > 0) { st.asrs.police[n - 1].rezervirana = true; nal.polica = n; nal.nosac = c.cid; c.nalog = nal.ono; rad = { nal, poz: tekuca(nal) }; zapis('MES', 'Nalog ONo ' + nal.ono + ' dobiva nosač ' + c.cid + '; paleta s police ' + n + ' (kućište ' + nal.boja + ').', 'mes'); }
          else if (!nal.upozoren) { nal.upozoren = true; zapis('MES', 'Nalog ONo ' + nal.ono + ' čeka: u skladištu nema palete s kućištem boje „' + nal.boja + '”.', 'greska'); }
        }
      }
      if (rad) {
        m.zauzet++; opStart(rad.nal, rad.poz, 'asrs');
        if (rad.poz.op.opNo >= 212) yield* asrsIzdaj(c, zid, rad.nal.polica);
        else {
          const n = st.asrs.police.findIndex((p) => !p) + 1;
          rad.nal.policaSpremanja = n; zapis(NAZIV_RESURSA.asrs + ' (' + MES.resursi.asrs + ')', 'Slobodna polica za pohranu: ' + n + '.', 'op');
          yield* asrsSpremi(c, zid, n);
        }
        opEnd(rad.nal, rad.poz, 'asrs', c); m.zauzet--;
        hmi('asrs', 'Automatic', 'MES', 'gotovo');
      } else if (m.nacin === 'default' && c.nalog) zapis(NAZIV_RESURSA.asrs + ' (' + MES.resursi.asrs + ')', 'Način Default: MES operacija se ne izvodi, nosač ' + c.cid + ' prolazi.', 'greska');
      yield* cekaj(0.05);
      pusti(zid);
      yield* cekaj(0.1);
    }
  }

  /* ================================================================ zaustavljači bez operacije i grananje */
  function* procesProlaz(zid, k) {
    while (true) {
      yield* dok(() => nosacNa(zid));
      yield* procitaj(zid, k);
      pusti(zid); yield* cekaj(0.1);
    }
  }
  const krakSlobodan = () => !st.nosaci.some((c) => ['krakBRANCH', 'prijenos', 'robotino'].includes(c.put)) && !st.zahtjevRobotino;
  function* procesGrananje() {
    while (true) {
      yield* dok(() => nosacNa('branchGrananje'));
      const c = yield* procitaj('branchGrananje', 'branch');
      const rad = mesOp('branch', c, 'branchGrananje');
      if (rad) {
        if (!krakSlobodan()) { zapis('BRANCH (' + MES.resursi.branch + ')', 'Krak je zauzet — nosač ' + c.cid + ' ide dalje i vraća se u sljedećem krugu.', 'rfid'); }
        else {
          st.moduli.branch.zauzet++; opStart(rad.nal, rad.poz, 'branch');
          hmi('branch', 'Skretnica → krak', 'nosač ' + c.cid, '');
          yield* gibaj(SIM.tSkretnica, (s) => { st.skretnica = glatko(s); });
          c.skreni = 'krakBRANCH'; dogadjaj('skretnica');
          pusti('branchGrananje');
          yield* dok(() => c.put === 'krakBRANCH' && c.s > 0.22);
          yield* gibaj(SIM.tSkretnica, (s) => { st.skretnica = 1 - glatko(s); });
          opEnd(rad.nal, rad.poz, 'branch', c); st.moduli.branch.zauzet--;
          hmi('branch', 'Automatic', 'MES', 'skretnica ravno');
          yield* cekaj(0.1); continue;
        }
      }
      pusti('branchGrananje'); yield* cekaj(0.1);
    }
  }
  /* vrh kraka: BRANCH čeka Robotina (Docking-Kit: Q3.5 signal Robotinu, I3.5 Robotino detektiran) */
  function* procesPredaja() {
    while (true) {
      yield* dok(() => nosacNa('branchPredaja'));
      const c = nosacNa('branchPredaja');
      const rad = mesOp('robotino', c, 'branchPredaja') || (c.nalog && tekuca(nalogPo(c.nalog)) && tekuca(nalogPo(c.nalog)).resurs === 'robotino' ? { nal: nalogPo(c.nalog), poz: tekuca(nalogPo(c.nalog)) } : null);
      if (!rad) { pusti('branchPredaja'); yield* cekaj(0.1); continue; }
      hmi('branch', 'Mjesto predaje', 'čeka Robotina', 'nosač ' + c.cid);
      st.zahtjevRobotino = c.id;
      zapis('BRANCH (' + MES.resursi.branch + ')', 'Nosač ' + c.cid + ' na mjestu predaje. MES → Fleet Manager: rezerviraj Robotina (Reserve AGV), nalog transporta.', 'rob');
      dogadjaj('zahtjevRobotino');
      /* nosač se vraća na isti vrh kraka (Robotino ga predaje natrag) */
      yield* dok(() => c.vracen);
      c.vracen = false; st.zahtjevRobotino = null;
      hmi('branch', 'Nosač vraćen', 'traka 4 → glavna linija', '');
      st.zaust.branchPredaja.nosac = c.id; c.stop = 'branchPredaja'; pusti('branchPredaja');
      yield* cekaj(0.1);
    }
  }
  function* procesTraka4() {
    while (true) {
      yield* dok(() => nosacNa('branchTraka4'));
      yield* procitaj('branchTraka4', 'branch');
      hmi('branch', 'Traka 4', 'čeka prazninu na glavnoj traci', '');
      pusti('branchTraka4'); yield* cekaj(0.1);
    }
  }
  function* procesRassTok() {
    while (true) {
      yield* dok(() => nosacNa('rassGlavna'));
      const c = yield* procitaj('rassGlavna', 'rass');
      const rad = mesOp('rass', c, 'rassGlavna');
      if (rad) {
        const naBypassu = st.nosaci.filter((o) => o.put === 'bypassRASS' || o.skreni === 'bypassRASS').length;
        if (naBypassu < 2) { c.skreni = 'bypassRASS'; zapis('RASS (' + MES.resursi.rass + ')', 'Sljedeći resurs RASS: nosač ' + c.cid + ' će preko povrata skrenuti na treću traku (bypass).', 'rfid'); dogadjaj('rassSkreni'); }
      }
      pusti('rassGlavna'); yield* cekaj(0.1);
    }
  }

  /* ================================================================ RASS: robot KUKA */
  const K = () => st.kuka;
  function* kPTP(Tc, opis) {
    const af = alatOkvir(K().alat);
    const r = KK.ik(Tc, K().q, af ? { alat: af } : {});
    if (!r.uspjeh) { zapis('RASS', 'IK nije našao rješenje (' + r.greska + ') — ' + opis, 'greska'); return; }
    const q0 = K().q.slice(), q1 = r.q;
    const Tt = Math.max(SIM.kuka.tMin, KK.trajanjePTP(q0, q1, SIM.kuka.override) * SIM.kuka.profil);
    K().gibanje = 'PTP'; K().korak = opis;
    yield* gibaj(Tt, (s) => { K().q = KK.interpolirajPTP(q0, q1, glatko(s)); });
  }
  function* kPTPq(q1, opis) {
    const q0 = K().q.slice(); const Tt = Math.max(SIM.kuka.tMin, KK.trajanjePTP(q0, q1, SIM.kuka.override) * SIM.kuka.profil);
    K().gibanje = 'PTP'; K().korak = opis;
    yield* gibaj(Tt, (s) => { K().q = KK.interpolirajPTP(q0, q1, glatko(s)); });
  }
  function* kLIN(Tc, opis) {
    const af = alatOkvir(K().alat);
    const T0 = KK.fkAlat(K().q, af).T;
    const Tt = Math.max(SIM.kuka.tMin, KK.duljinaLIN(T0, Tc) / SIM.kuka.vLin * SIM.kuka.profil);
    K().gibanje = 'LIN'; K().korak = opis;
    yield* gibaj(Tt, (s) => { const r = KK.ik(KK.interpolirajLIN(T0, Tc, glatko(s)), K().q, af ? { alat: af } : {}); if (r.uspjeh) K().q = r.q; });
  }
  /* izmjena alata: spremište s vilicama otvorenim prema robotu (+x tlocrta) */
  /* cilj prirubnice F (alat se drži na prirubnici) → cilj TCP-a s aktivnim alatom: F · alat */
  const sAlatom = (F, i) => (i ? KK.pomnozi(F, alatOkvir(i)) : F);
  function* odloziAlat() {
    const i = K().alat; if (!i) return;
    const m = GEO.alati[i - 1], zf = m.z + HF, F = (x, z) => cilj(x, m.y, z, PI), A = SIM.kuka;
    yield* kPTP(sAlatom(F(m.x + A.prilazAlat, zf), i), 'TOOL' + i + ' natrag u spremište');
    yield* kLIN(sAlatom(F(m.x, zf), i), 'ulaz u vilicu TOOL' + i);
    hmi('rass', 'Izmjena alata', 'TOOL' + i + ' otpušten', ''); yield* cekaj(A.tAlat);
    K().alat = 0; dogadjaj('alatOdlozen', { i });
    yield* kLIN(F(m.x, zf + A.odmakAlat), 'izmjenjivač se odvaja');
    yield* kLIN(F(m.x + A.prilazAlat, zf + A.odmakAlat), 'odmak od spremišta');
  }
  function* uzmiAlat(i) {
    const m = GEO.alati[i - 1], zf = m.z + HF, F = (x, z) => cilj(x, m.y, z, PI), A = SIM.kuka;
    yield* kPTP(F(m.x + A.prilazAlat, zf + A.odmakAlat), 'prilaz TOOL' + i);
    yield* kLIN(F(m.x, zf + A.odmakAlat), 'iznad izmjenjivača TOOL' + i);
    yield* kLIN(F(m.x, zf), 'spajanje izmjenjivača');
    hmi('rass', 'Izmjena alata', 'TOOL' + i + ' zabravljen', PRIHVATNICE[i - 1].naziv); yield* cekaj(A.tAlat);
    K().alat = i; K().prsti = 1; dogadjaj('alat:' + i);
    zapis('RASS (' + MES.resursi.rass + ')', 'Izmjena alata: ' + PRIHVATNICE[i - 1].oznaka + ' — ' + PRIHVATNICE[i - 1].naziv + '.', 'op');
    yield* kLIN(sAlatom(F(m.x + A.prilazAlat, zf), i), 'izlaz iz vilice');
  }
  function* promijeniAlat(i) { if (K().alat === i) return; yield* odloziAlat(); yield* uzmiAlat(i); }
  function* procesRassRobot() {
    while (true) {
      yield* dok(() => nosacNa('rassRadni'));
      const c = yield* procitaj('rassRadni', 'rass');
      const rad = mesOp('rass', c, 'rassRadni');
      if (!rad) { pusti('rassRadni'); yield* cekaj(0.1); continue; }
      const m = st.moduli.rass, R2 = st.rass, nal = rad.nal;
      m.zauzet++; opStart(nal, rad.poz, 'rass');
      R2.nosac = c.id; R2.boja = c.sadrzaj.izradak || nal.boja; R2.osig = 0; R2.pcb = null;
      const tN = T.rassRadni, zKuc = ZT + H_NOSAC, hI = GEO.izradak.visina, Nv = GEO.naprava;
      const kutNosaca = tockaPuta(P.bypassRASS, st.zaust.rassRadni.s).kut;
      const Akuc = aRob(kutNosaca) + PI / 2;              /* os y alata duž dulje stranice kućišta */
      const AkucN = aRob(0) + PI / 2;                     /* naprava: dulja stranica duž x tlocrta */
      yield* kPTPq(KPOL.prirubnicaDolje, 'osnovni položaj');
      /* 1. kućište s palete u steznu napravu (TOOL2) */
      yield* promijeniAlat(2);
      yield* kPTP(cilj(tN.x, tN.y, zKuc + SIM.kuka.iznad, Akuc), 'iznad kućišta na paleti');
      yield* kLIN(cilj(tN.x, tN.y, zKuc + hI / 2, Akuc), 'spuštanje do kućišta');
      K().prsti = 0; yield* cekaj(SIM.kuka.tHvat); R2.kuciste = 'tcp'; c.sadrzaj = { ...c.sadrzaj, izradak: null }; st.verzija++;
      yield* kLIN(cilj(tN.x, tN.y, zKuc + SIM.kuka.iznad, Akuc), 'podizanje kućišta');
      yield* kPTP(cilj(Nv.x, Nv.y, Nv.z + SIM.kuka.iznad, AkucN), 'iznad stezne naprave');
      yield* kLIN(cilj(Nv.x, Nv.y, Nv.z + hI / 2, AkucN), 'kućište u napravu');
      K().prsti = 1; yield* cekaj(SIM.kuka.tHvat); R2.kuciste = 'naprava'; dogadjaj('kucisteNaprava'); st.verzija++;
      yield* kLIN(cilj(Nv.x, Nv.y, Nv.z + SIM.kuka.iznad, AkucN), 'odmak');
      /* 2. tiskana pločica iz kutije (TOOL1, vakuum) */
      if (R2.kutijaPCB <= 0) {
        R2.cekaKutiju = true; greska('rass', 'Kutija PCB je prazna — izmijeni kutiju (Box change)');
        yield* dok(() => R2.kutijaPCB > 0);
      }
      yield* promijeniAlat(1);
      const sl = GEO.slotovi[KAP_PCB - R2.kutijaPCB] || GEO.slotovi[0]; R2.slot = KAP_PCB - R2.kutijaPCB;
      const Apcb = aRob(PI / 2) + PI / 2;                 /* pločica u kutiji leži duž y tlocrta */
      yield* kPTP(cilj(sl.x, sl.y, sl.z + SIM.kuka.iznad, Apcb), 'iznad kutije PCB');
      yield* kLIN(cilj(sl.x, sl.y, sl.z, Apcb), 'vakuumska prihvatnica na pločicu');
      K().vakuum = true; yield* cekaj(SIM.kuka.tVakuum); R2.kutijaPCB--; R2.pcb = 'tcp'; dogadjaj('pcbUzet'); st.verzija++;
      yield* kLIN(cilj(sl.x, sl.y, sl.z + SIM.kuka.iznad, Apcb), 'podizanje pločice');
      const zPcb = Nv.z + hI + 0.0016, Akut = aRob(0) + PI / 2;
      yield* kPTP(cilj(Nv.x, Nv.y, zPcb + SIM.kuka.iznad, Akut), 'iznad kućišta u napravi');
      yield* kLIN(cilj(Nv.x, Nv.y, zPcb, Akut), 'pločica u kućište');
      K().vakuum = false; yield* cekaj(SIM.kuka.tVakuum); R2.pcb = 'kuciste'; dogadjaj('pcbUmetnut'); st.verzija++;
      yield* kLIN(cilj(Nv.x, Nv.y, zPcb + SIM.kuka.iznad, Akut), 'odmak');
      /* 3. kamera provjerava orijentaciju (robot izvan vidnog polja) */
      yield* kPTPq(KPOL.prirubnicaDolje, 'izvan vidnog polja kamere');
      hmi('rass', 'Kamera', 'provjera orijentacije', ''); R2.kamera = true; st.verzija++;
      yield* cekaj(SIM.kuka.tKamera);
      R2.kamera = false; dogadjaj('kamera'); zapis('RASS (' + MES.resursi.rass + ')', 'Kamera: orijentacija pločice u kućištu ispravna.', 'op'); st.verzija++;
      /* 4. osigurači (TOOL3) */
      if (nal.osiguraci > 0) {
        yield* promijeniAlat(3);
        for (let i = 0; i < nal.osiguraci; i++) {
          const cj = GEO.cijevi[i % GEO.cijevi.length];
          yield* kPTP(cilj(cj.x, cj.y, cj.z + SIM.kuka.iznad, PI), 'iznad cijevi osigurača ' + (i + 1));
          yield* kLIN(cilj(cj.x, cj.y, cj.z, PI), 'hvatanje osigurača');
          K().prsti = 0; yield* cekaj(SIM.kuka.tHvat); R2.osigTcp = true; st.verzija++;
          yield* kLIN(cilj(cj.x, cj.y, cj.z + SIM.kuka.iznad, PI), 'podizanje');
          const dx = (i === 0 ? -1 : 1) * 0.025, zo = zPcb + 0.015;
          yield* kPTP(cilj(Nv.x + dx, Nv.y, zo + SIM.kuka.iznad, Akut), 'iznad mjesta osigurača');
          yield* kLIN(cilj(Nv.x + dx, Nv.y, zo, Akut), 'umetanje osigurača');
          K().prsti = 1; yield* cekaj(SIM.kuka.tHvat); R2.osigTcp = false; R2.osig++; dogadjaj('osigurac'); st.verzija++;
          yield* kLIN(cilj(Nv.x + dx, Nv.y, zo + SIM.kuka.iznad, Akut), 'odmak');
        }
      }
      /* 5. sklopljeni izradak natrag na paletu (TOOL2) */
      yield* promijeniAlat(2);
      yield* kPTP(cilj(Nv.x, Nv.y, Nv.z + SIM.kuka.iznad, AkucN), 'iznad naprave');
      yield* kLIN(cilj(Nv.x, Nv.y, Nv.z + hI / 2, AkucN), 'hvatanje sklopa');
      K().prsti = 0; yield* cekaj(SIM.kuka.tHvat); R2.kuciste = 'tcp'; st.verzija++;
      yield* kLIN(cilj(Nv.x, Nv.y, Nv.z + SIM.kuka.iznad, AkucN), 'podizanje');
      yield* kPTP(cilj(tN.x, tN.y, zKuc + SIM.kuka.iznad, Akuc), 'iznad palete');
      yield* kLIN(cilj(tN.x, tN.y, zKuc + hI / 2, Akuc), 'sklop na paletu');
      K().prsti = 1; yield* cekaj(SIM.kuka.tHvat);
      c.sadrzaj = { ...c.sadrzaj, izradak: R2.boja, pcb: true, osiguraci: R2.osig }; R2.kuciste = null; R2.pcb = null; R2.osig = 0; dogadjaj('kucisteNosac'); st.verzija++;
      yield* kLIN(cilj(tN.x, tN.y, zKuc + SIM.kuka.iznad, Akuc), 'odmak');
      yield* kPTPq(KPOL.prirubnicaDolje, 'osnovni položaj');
      K().gibanje = '—'; K().korak = '';
      opEnd(nal, rad.poz, 'rass', c); m.zauzet--; R2.nosac = null;
      hmi('rass', 'Automatic', 'MES', 'montaža gotova');
      pusti('rassRadni'); yield* cekaj(0.1);
    }
  }

  /* ================================================================ Robotino (Fleet Manager, svesmjerni pogon) */
  const RB = () => st.rob;
  function korakPogona(dt, vxr, vyr, w) {
    const r = RB();
    const lim = RK.ogranici(vxr, vyr, w, { vMax: SIM.robotino.vMax, wMax: SIM.robotino.wMax });
    const m = RK.inverzna(lim.vx, lim.vy, lim.w);
    st.od.korak(dt, m);
    r.x = st.od.x; r.y = st.od.y; r.phi = kutRaz(st.od.phi); st.od.phi = r.phi;
    r.vx = lim.vx; r.vy = lim.vy; r.w = lim.w; r.m = m;
    for (let i = 0; i < 3; i++) r.kotaci[i] += RK.kutKotaca(m[i], dt);
    r.put += Math.hypot(lim.vx, lim.vy) * dt;
  }
  function* rVozi(tocke, o = {}) {
    const r = RB(), A = SIM.robotino;
    for (let i = 0; i < tocke.length; i++) {
      const c = tocke[i], zadnja = i === tocke.length - 1;
      const vMax = o.v || A.vMax, tolP = zadnja ? 0.003 : 0.08, tolK = zadnja ? 0.01 : 0.35;
      r.cilj = c;
      let n = 0;
      while (n++ < 200000) {
        const dt = yield;
        if (!dt) continue;
        const ex = c.x - r.x, ey = c.y - r.y, d = Math.hypot(ex, ey), ek = kutRaz(c.phi - r.phi);
        if (d < tolP && Math.abs(ek) < tolK && (!zadnja || Math.hypot(r.vx, r.vy) < 0.03)) break;
        const vZ = zadnja ? Math.min(vMax, Math.sqrt(2 * A.aLin * 0.8 * d), 2.5 * d + 0.004) : vMax;
        const vxW = d > 1e-6 ? ex / d * vZ : 0, vyW = d > 1e-6 ? ey / d * vZ : 0;
        const cp = Math.cos(r.phi), sp = Math.sin(r.phi);
        let vxr = cp * vxW + sp * vyW, vyr = -sp * vxW + cp * vyW;
        let w = clamp(2.2 * ek, -A.wMax, A.wMax); if (zadnja) w = clamp(w, -Math.sqrt(2 * A.aKut * Math.abs(ek)) - 0.02, Math.sqrt(2 * A.aKut * Math.abs(ek)) + 0.02);
        /* rampa ubrzanja */
        const dvx = vxr - r.vx, dvy = vyr - r.vy, dv = Math.hypot(dvx, dvy), dvMax = A.aLin * dt;
        if (dv > dvMax) { vxr = r.vx + dvx / dv * dvMax; vyr = r.vy + dvy / dv * dvMax; }
        w = r.w + clamp(w - r.w, -A.aKut * dt, A.aKut * dt);
        korakPogona(dt, vxr, vyr, w);
      }
    }
    korakPogona(1e-6, 0, 0, 0); r.vx = r.vy = r.w = 0; r.m = [0, 0, 0]; r.cilj = null;
  }
  function* rOdvoji() {
    const r = RB();
    if (r.naStanici) { r.naStanici = false; r.stanje = 'odvaja se od stanice'; zapis('Robotino (' + MES.resursi.robotino + ')', 'Odvajanje od stanice za punjenje.', 'rob'); yield* rVozi([RP.prePun], { v: SIM.robotino.vPristajanje * 2 }); }
    if (r.naBranchu) { r.naBranchu = false; r.i35 = false; yield* rVozi([RP.preDock], { v: SIM.robotino.vPristajanje * 2 }); }
  }
  const blizu = (p, q, d = 0.15) => Math.hypot(p.x - q.x, p.y - q.y) < d;
  function* rDoBrancha() {
    const r = RB();
    r.stanje = 'vozi na BRANCH';
    if (blizu(r, RP.odrediste, 0.4)) yield* rVozi([{ ...RP.medju, phi: 0 }, RP.preDock]);
    else yield* rVozi([RP.preDock]);
    r.stanje = 'pristaje na BRANCH'; yield* rVozi([RP.dock], { v: SIM.robotino.vPristajanje });
    r.naBranchu = true; r.i35 = true; dogadjaj('robotinoDock');
    zapis('Robotino (' + MES.resursi.robotino + ')', 'Pristao na BRANCH (I3.5 = 1: Robotino detektiran).', 'rob');
  }
  function* rPrijenos(c, naRobota) {
    const r = RB(), A = SIM.robotino;
    r.stanje = 'handshake'; yield* dok(() => modulRadi('branch'));
    r.q35 = true; hmi('branch', 'Handshake', 'Q3.5 = 1 → Robotino', 'I3.5 = 1');
    yield* cekaj(A.tHandshake);
    r.stanje = naRobota ? 'preuzima nosač' : 'predaje nosač';
    c.put = 'prijenos'; c.stop = null; if (st.zaust.branchPredaja.nosac === c.id) st.zaust.branchPredaja.nosac = null;
    c.prijenos = { u: naRobota ? 0 : 1, sTip: odmakPrihvata };
    const Tt = odmakPrihvata / A.vPrihvat;
    let x = 0;
    while (x < Tt) { const dt = yield; if (!modulRadi('branch')) continue; x += dt; const u = Math.min(1, x / Tt); c.prijenos.u = naRobota ? u : 1 - u; r.traka += (naRobota ? 1 : -1) * A.vPrihvat * dt; }
    r.q35 = false;
    if (naRobota) { c.put = 'robotino'; c.prijenos = null; r.nosac = c.id; dogadjaj('naRobotinu'); zapis('Robotino (' + MES.resursi.robotino + ')', 'Nosač ' + c.cid + ' preuzet na prihvat (traka prihvata).', 'rob'); }
    else { c.put = 'krakBRANCH'; c.s = P.krakBRANCH.L / 2; c.prijenos = null; r.nosac = null; c.vracen = true; dogadjaj('povratakKrak'); zapis('Robotino (' + MES.resursi.robotino + ')', 'Nosač ' + c.cid + ' predan natrag BRANCH-u.', 'rob'); }
  }
  function* rNaPunjenje(razlog) {
    const r = RB();
    yield* rOdvoji();
    r.stanje = 'vozi na punjenje'; dogadjaj('naPunjenje');
    zapis('Robotino (' + MES.resursi.robotino + ')', 'Fleet Manager: vožnja na stanicu za punjenje (' + razlog + ').', 'rob');
    if (blizu(r, RP.odrediste, 0.4)) yield* rVozi([{ ...RP.medju, phi: 0 }, RP.prePun]);
    else yield* rVozi([RP.prePun]);
    r.stanje = 'pristaje na stanicu'; yield* rVozi([RP.pun], { v: SIM.robotino.vPristajanje });
    r.naStanici = true; r.stanje = 'na stanici za punjenje'; dogadjaj('punjenjeDock');
    zapis('Robotino (' + MES.resursi.robotino + ')', 'Kontakt sa stanicom: punjenje (' + P_STANICA + ' W).', 'rob');
  }
  function* procesRobotino() {
    const r = RB();
    while (true) {
      /* Fleet Manager: nalog transporta ima prednost; bez naloga (ili s praznom baterijom) robot odlazi na stanicu za punjenje */
      yield* dok(() => st.zahtjevRobotino || !r.naStanici);
      if (st.zahtjevRobotino) {
        const c = st.nosaci.find((o) => o.id === st.zahtjevRobotino);
        const nal = c && nalogPo(c.nalog), poz = nal && tekuca(nal);
        st.moduli.robotino.zauzet++;
        zapis('Fleet Manager', 'Robotino (MES ID ' + MES.resursi.robotino + ') rezerviran za transport nosača ' + (c ? c.cid : '—') + '.', 'rob');
        yield* rOdvoji(); yield* rDoBrancha();
        if (poz) opStart(nal, poz, 'robotino');
        yield* rPrijenos(c, true);
        r.stanje = 'odvozi nosač'; r.naBranchu = false; r.i35 = false;
        yield* rVozi([RP.preDock]);
        yield* rVozi([{ ...RP.medju }, RP.odrediste]);
        r.stanje = 'na odredištu (CP-COBOT-M)'; dogadjaj('odrediste');
        zapis('Robotino (' + MES.resursi.robotino + ')', 'Na odredištu iza CP-COBOT-M. Inačica M nema docking — nosač ostaje na Robotinu (prikaz vožnje).', 'rob');
        yield* cekaj(SIM.robotino.tOdrediste);
        yield* rDoBrancha();
        yield* rPrijenos(c, false);
        if (poz) opEnd(nal, poz, 'robotino', c);
        r.stanje = 'odmiče se od BRANCH-a'; r.naBranchu = false; r.i35 = false;
        yield* rVozi([RP.preDock]);
        st.moduli.robotino.zauzet--;
        continue;
      }
      yield* cekaj(SIM.robotino.tOdluka);                /* Fleet Manager odlučuje (nalog može stići u međuvremenu) */
      if (st.zahtjevRobotino || r.naStanici) continue;
      const nisko = r.bat < SIM.robotino.prag;
      if (nisko) { zapis('Robotino (' + MES.resursi.robotino + ')', 'Baterija ' + Math.round(r.bat * 100) + ' % — ispod praga ' + Math.round(SIM.robotino.prag * 100) + ' %.', 'greska'); dogadjaj('baterijaNiska'); }
      yield* rNaPunjenje(nisko ? 'baterija ispod praga' : 'nema naloga');
    }
  }
  function korakBaterije(dt) {
    const r = RB(), A = SIM.robotino, v = Math.hypot(r.vx, r.vy);
    const p = r.naStanici ? -(P_STANICA - A.pMir) : A.pMir + A.pVoznja * Math.min(1, v / A.vMax + Math.abs(r.w) / A.wMax * 0.3);
    r.bat = clamp(r.bat - p * dt * A.ubrzanjeBat / 3600 / E_BAT, 0, 1);
  }

  /* ================================================================ CP-COBOT-M: UR3e (samostalni demo program) */
  const uRobotUR = (x, y, z) => { const dx = x - BU.x, dy = y - BU.y, c = Math.cos(BU.phi), s = Math.sin(BU.phi); return [dx * c + dy * s, -dx * s + dy * c, z - BU.z]; };
  const UR_TOCKE = (() => {
    /* točke iznad kutija BOX 1 / BOX 2 (bliži rub, unutar dosega 500 mm), pa niže; IK redom od početne poze */
    const kut = G.cobotKutije || [{ x: C.x - 0.21, y: C.y - MJERE.cobot.dubina / 2 + 0.165 }, { x: C.x + 0.21, y: C.y - MJERE.cobot.dubina / 2 + 0.165 }];
    const zK = MJERE.cobot.kutije.z + MJERE.kutija.visina;
    const out = []; let q = UR_Q0.slice();
    const tocka = (x, y, z, ime) => {
      const [xr, yr, zr] = uRobotUR(x, y, z);
      const r = UK.ik(UK.matricaIzPoze([xr, yr, zr, PI, 0, 0]), q, { najveciSkok: 2.5 });
      if (r.uspjeh) { q = r.q; out.push({ q: r.q.slice(), ime }); }
    };
    kut.forEach((k, i) => {
      const yr = k.y + 0.08;                    /* rub kutije bliže robotu */
      tocka(k.x * 0.7 + BU.x * 0.3, yr, zK + 0.08, 'iznad BOX ' + (i + 1));
      tocka(k.x * 0.7 + BU.x * 0.3, yr, zK - 0.02, 'u BOX ' + (i + 1));
      tocka(k.x * 0.7 + BU.x * 0.3, yr, zK + 0.08, 'iznad BOX ' + (i + 1));
    });
    return out;
  })();
  function* procesCobot() {
    const U = () => st.ur;
    const q0 = U().q.slice();
    while (true) {
      yield* dok(() => U().demo && UR_TOCKE.length);
      for (const t of UR_TOCKE) {
        if (!U().demo) break;
        const a = U().q.slice(), Tt = Math.max(SIM.ur.tMin, Math.max(...t.q.map((v, i) => Math.abs(v - a[i]))) / 1.0 * SIM.ur.faktor);
        U().korak = t.ime; hmi('cobot', 'Demo program', t.ime, '');
        yield* gibaj(Tt, (s) => { const e = glatko(s); U().q = a.map((v, i) => v + (t.q[i] - v) * e); });
        yield* cekaj(SIM.ur.tCekaj);
      }
      if (!U().demo) { const a = U().q.slice(); yield* gibaj(2, (s) => { const e = glatko(s); U().q = a.map((v, i) => v + (q0[i] - v) * e); }); U().korak = ''; hmi('cobot', 'Samostalni rad', 'demo isključen', ''); }
    }
  }

  /* ================================================================ korak simulacije */
  function korak(dt = SIM.dt) {
    /* reset traje SIM.tReset, zatim stanica čeka Start */
    Object.values(st.moduli).forEach((m) => { if (m.stanje === 'reset') { m.tReset -= dt; if (m.tReset <= 0) { m.stanje = 'cekaStart'; hmi(m.kljuc, 'Reset gotov', 'pritisni Start', ''); dogadjaj('resetGotov', { modul: m.kljuc }); st.verzija++; } } });
    korakTransporta(dt);
    for (const p of st.procesi) {
      if (p.gotov) continue;
      if (p.modul === 'robotino') { /* Robotino nije u lancu linije */ }
      else if (!modulRadi(p.modul)) continue;
      const r = p.gen.next(dt); if (r.done) p.gotov = true;
    }
    korakBaterije(dt);
    st.moduli.robotino.hmi = [st.rob.stanje, 'baterija ' + Math.round(st.rob.bat * 100) + ' %', st.rob.nosac ? 'nosač na prihvatu' : ''];
    st.t += dt;
  }

  pocetnoStanje();
  return {
    st, P, PUT, GEO, RP, SIM, UR_TOCKE, Z_PRIH, odmakPrihvata, tipKraka,
    korak, pocetnoStanje, posaljiNalog, gljiva, reset, start, nacin, boxChange, zaliha, tekuca, nalogPo, zapis,
    resetSve() { let ok = false; LINIJA.forEach((k) => { ok = reset(k) || ok; }); return ok; },
    startSve() { let ok = false; LINIJA.forEach((k) => { ok = start(k) || ok; }); return ok; },
    cobotDemo(v) { st.ur.demo = !!v; zapis('CP-COBOT-M', v ? 'Demo program kobota pokrenut (samostalni rad).' : 'Demo program kobota zaustavljen.', 'sig'); st.verzija++; },
    na(f) { listeneri.push(f); },
    modulRadi, LINIJA,
    /** poza nosača u tlocrtu: { x, y, z, kut } (na traci, u prijenosu na Robotina ili na Robotinu) */
    pozaNosaca(c) {
      if (c.put in PUT) return tockaPuta(PUT[c.put], c.s);
      const r = st.rob, sp = Math.sin(r.phi), cp = Math.cos(r.phi), kR = r.phi + PI / 2;
      const naR = (s) => ({ x: r.x - s * sp, y: r.y + s * cp });
      if (c.put === 'robotino') return { ...naR(0), z: Z_PRIH, kut: kR };
      if (c.put === 'prijenos') {
        const u = c.prijenos.u, s = c.prijenos.sTip * (1 - u), p = naR(s);
        const zU = clamp((c.prijenos.sTip - s) / 0.1, 0, 1), kU = clamp(u / 0.6, 0, 1);
        return { ...p, z: ZT + (Z_PRIH - ZT) * glatko(zU), kut: tipKraka.kut + kutRaz(kR - tipKraka.kut) * glatko(kU) };
      }
      return { x: 0, y: 0, z: 0, kut: 0 };
    },
    /** TCP robota KUKA u KS robota (za prikaz) */
    tcpKuka() { return KK.fkAlat(st.kuka.q, alatOkvir(st.kuka.alat)); }
  };
}
