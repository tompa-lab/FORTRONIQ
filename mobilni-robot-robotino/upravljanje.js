/* FORTRONIQ · Mobilni robot Robotino — Upravljanje robotom (simulator laboratorija s nizovima koraka).
   Robot (CP-MR-C): svesmjerni pogon, enkoderi, odometrija, 9 IR senzora, odbojnik, laserski skener, optički senzori za crtu,
   nadogradnja s prihvatom nosača, signalnim stupom, nužnim stopom i kutijom RESET/START; stanica za punjenje i prijenosna stanica.
   Svi podaci robota dolaze iz robotino_podaci.js; kinematika i 2D senzori iz robotino_kin.js; 3D model iz robotino_model.js.
   Fizika: nepromjenjivi korak 10 ms (100 Hz), neovisan o broju sličica; iscrtavanje samo kad se nešto promijeni.
   Web sučelje na stranici je naše i pojednostavljeno — nije preslika sučelja proizvođača.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KONFIG, MJERE, POGON, SENZORI, DIJELOVI, IZVORI, nadjiDio, pretpostavke, TEKST_PRETPOSTAVKE } from './robotino_podaci.js';
import { napraviRobotino, napraviNosac } from './robotino_model.js';
import * as K from './robotino_kin.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PI = Math.PI, D = PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const kut = (a) => { let x = (a + PI) % (2 * PI); if (x < 0) x += 2 * PI; return x - PI; };
const kz = (v, d = 2) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d).replace('.', ',').replace('-', '−'); };
const nula = () => ({ vx: 0, vy: 0, w: 0 });

/* ================================================================== */
/* 1. Podaci robota (samo iz robotino_podaci.js)                       */
/* ================================================================== */
const VMAX = POGON.ogranicenja.vMax, WMAX = POGON.ogranicenja.wMax, NMAX = POGON.nMotMax;
const T_REST = POGON.periodNaredbe.rest, T_API = POGON.periodNaredbe.api2;
const KF = K.faktorK();
const CPMR = KONFIG.nadogradnja === 'cp-mr-c';
const R_OSN = MJERE.promjerOsnovice / 2;
const R_NAD = CPMR ? Math.max(R_OSN, MJERE.sirinaSNadogradnjom / 2) : R_OSN;
const LZ = KONFIG.laser ? SENZORI.laser[KONFIG.laser] : null;
const N_LASER = LZ ? Math.round((LZ.kutMax - LZ.kutMin) / LZ.razlucivost) + 1 : 0;
const T_LASER = LZ ? 1 / LZ.f : 0.1;
const IR_MAX = SENZORI.ir.dometMax, IR_MIN = SENZORI.ir.dometMin;
const IR_KUT = MJERE.ir.kutovi;
const TX = CPMR ? MJERE.toranj.x : 0;
const Z_PRIH = CPMR ? MJERE.prihvat.z : 0.35;
const L_PRIH = CPMR ? MJERE.prihvat.duljina : 0.3;
const BG1_ZONA = CPMR ? (L_PRIH - 0.04 - MJERE.nosac.duljina) / 2 : 0;   /* nosač je cijeli na trakama (kao u modelu) */
const OPT = [{ x: MJERE.opticki.x, y: MJERE.opticki.y }, { x: MJERE.opticki.x, y: -MJERE.opticki.y }];   /* 0 = lijevi (DI1), 1 = desni (DI2) */
const brojevi = (s) => (String(s || '').replace(/(\d),(\d)/g, '$1.$2').match(/\d+(\.\d+)?/g) || []).map(Number);
const podatak = (id, pocetak) => { const d = nadjiDio(id); const r = d && d.podaci && d.podaci.find((p) => String(p[0]).startsWith(pocetak)); return r ? String(r[1]) : ''; };
const T_DRZI = brojevi(podatak('glavnoTipkalo', 'Uključi'))[0] || 3;
const P_STANICA = brojevi(podatak('stanica', 'Snaga'))[0] || 240;
const IP = podatak('wlan', 'Zadana IP') || '192.168.0.1';
const BAT_N = DIJELOVI.filter((d) => /^baterija\d+$/.test(d.id)).length || 1;
const BAT_VA = brojevi(podatak('baterija1', 'Napon'));
const E_BAT = BAT_N * (BAT_VA[0] || 18) * (BAT_VA[1] || 5.2);          /* Wh */
const ZIRO = SENZORI.ziroskop ? SENZORI.ziroskop.tip : 'žiroskop';
const BG_OZN = CPMR ? SENZORI.irPozicioniranje.oznake : ['BG4', 'BG5', 'BG6'];
const HS_RAZMAK = CPMR ? SENZORI.handshake.razmak : 0.5;
const ST = MJERE.stanica;
/* značenja svjetala signalnog stupa (tekst iz podataka) */
const ZNACENJE = {};
[['crvena', 'svjetloCrveno'], ['narancasta', 'svjetloNarancasto'], ['zelena', 'svjetloZeleno']].forEach(([k, id]) => { ZNACENJE[k] = { stalno: podatak(id, 'Stalno') || '—', treperi: podatak(id, 'Treperi') || '—' }; });
const BOJA_NAZIV = { crvena: 'Crvena', narancasta: 'Narančasta', zelena: 'Zelena' };
/* geometrija senzora prihvata: kao u robotino_model.js (BG4–BG6 razmaknuti 65 mm, handshake ±70 mm, lice na kraju prihvata) */
const BG_X = [TX - 0.065, TX, TX + 0.065], BG_Y = L_PRIH / 2 + 0.022;
const HS_X = { prijemnik: TX - 0.07, odasiljac: TX + 0.07 };

/* ================================================================== */
/* 2. Parametri simulatora (nisu podaci robota — popisani na stranici) */
/* ================================================================== */
const SIM = {
  dt: 0.01, aLin: 0.8, aKut: 3.0, klizV: 0.03, klizW: 0.07, driftZiro: 0.002,
  boot: 5, gasenje: 1.5, lokalizacija: 2, batPocetak: 0.8, pMir: 20, pVoznja: 40, ubrzanjeBat: 10,
  polje: { r: 0.30, kut: 90 }, irZastita: 0.15, traka: 0.12, crta: { v: 0.15, g: 1.2, sirina: 0.025 }, osoba: 0.6,
  hs: { tol: 0.012, kut: 3, odgoda: 0.4 }, bg5Cilj: 0.05, karta: 0.03, prilazPomak: 0.022, prilazKut: 2
};
const POJEDNOSTAVLJENJA = [
  'Dinamika se ne računa: zadana brzina robota ide kroz rampu ubrzanja (' + kz(SIM.aLin, 1) + ' m/s², ' + kz(SIM.aKut, 1) + ' rad/s² — naša pretpostavka; na robotu se ubrzanja podešavaju u web sučelju), a regulator motora (PI) prati zadanu brzinu bez kašnjenja.',
  'Proklizavanje valjaka (prekidač u kartici Odometrija) je pojednostavljeni model: stvarni pomak je ' + kz(SIM.klizV * 100, 0) + ' % manji od pomaka izračunatog iz kotača, a zakret ' + kz(SIM.klizW * 100, 0) + ' % manji. Pomak žiroskopa (drift) je ' + kz(SIM.driftZiro, 3) + ' rad/s dok se robot giba (u mirovanju ga sustav kompenzira).',
  'Lokalizacija na karti nije simulirana: kad je robot lokaliziran, automatske vožnje koriste stvarnu pozu; odometrija se računa i prikazuje odvojeno. Grubi prilaz prijenosnoj stanici namjerno staje ' + kz(SIM.prilazPomak * 1000, 0) + ' mm i ' + SIM.prilazKut + '° pokraj cilja, da fino pozicioniranje ima što ispraviti.',
  'Sudar se provjerava dvama krugovima: osnovica (Ø ' + kz(MJERE.promjerOsnovice * 1000, 0) + ' mm) s niskim preprekama i nadogradnja (Ø ' + kz(R_NAD * 2000, 0) + ' mm) s visokim (zidovi, ploče stolova). Svaki dodir se javlja kao Bumper.',
  'Zaštitno polje lasera (prekidač u kartici Vožnja) je polukrug polumjera ' + kz(SIM.polje.r, 2) + ' m ispred skenera — naša pretpostavka. Hokuyo URG-04LX nije sigurnosni skener; tvornički CP-MR od 2023. ima sigurnosni skener s OSSD izlazima. Pri pristajanju i predaji nosača polje se isključuje (na stvarnom sustavu se polja prebacuju).',
  'IR zaštita ' + kz(SIM.irZastita, 2) + ' m je mali program u web sučelju simulatora, ne tvornička funkcija robota.',
  'Optički senzori: DI1 (NO) daje 1 kad lijevi senzor vidi crnu crtu, DI2 (NC) daje 0 kad je desni vidi — značenje NO/NC prema podacima, a „vidi crtu = taman” je naša pretpostavka. Crta je široka ' + kz(SIM.crta.sirina * 1000, 0) + ' mm.',
  'Pristajanje laserom slijedi tri koraka iz primjera algoritma (zakret, bočno poravnanje, prilaz) s povratnim kodom 0/1/2; markeri se prepoznaju po jakom odrazu. Kontakt se uspostavi kad je robot unutar 4 mm i 3° od položaja pristajanja.',
  'Predaja nosača: fino pozicioniranje senzorima BG4–BG6 (kut iz razlike BG4 i BG6, udaljenost iz BG5), bočno poravnanje traženjem optičke veze handshake (BG2/BG3, tolerancija ±' + kz(SIM.hs.tol * 1000, 0) + ' mm). Brzina traka ' + kz(SIM.traka, 2) + ' m/s je naša pretpostavka; preusmjeravanje nosača s trake na traku se ne prikazuje.',
  'Baterija: energija iz podataka (' + BAT_N + ' × ' + (podatak('baterija1', 'Napon') || '?') + ' ≈ ' + Math.round(E_BAT) + ' Wh), potrošnja ' + SIM.pMir + ' W u mirovanju do ' + (SIM.pMir + SIM.pVoznja) + ' W u vožnji (procjena), punjenje snagom stanice (' + P_STANICA + ' W) umanjenom za potrošnju robota. Vrijeme baterije teče ' + SIM.ubrzanjeBat + '× brže, da se punjenje vidi.',
  'Pokretanje sustava traje ' + SIM.boot + ' s (stvarni robot do minute), lokalizacija nakon START ' + SIM.lokalizacija + ' s. Web sučelje, REST odgovori i Robotino View blokovi prikazani su samo u dijelu koji treba za vježbu.',
  'Laserski sken se računa ' + (LZ ? LZ.f : 10) + ' puta u sekundi s ' + N_LASER + ' zraka (razlučivost iz podataka), bez šuma mjerenja; IR senzori svake 0,05 s s tri zrake po senzoru. Karta se gradi iz skena i poze koju robot misli da ima (odometrija).'
];

/* ================================================================== */
/* 3. Laboratorij: prostorija, stanice, prepreke, crta                 */
/* ================================================================== */
const SOBA = { x0: -2.5, x1: 2.5, y0: -2.0, y1: 2.0, h: 0.45, d: 0.06 };
const ST_PUN = { x: SOBA.x0 + ST.dubina, y: 0.9, phi: 0 };                 /* stanica za punjenje uz lijevi zid, lice prema +x */
const POZA_DOK = K.pozaPristajanja(ST_PUN.x, ST_PUN.y, ST_PUN.phi);
const ST_PRED = { x: 1.3, yF: 1.4, sirina: 0.7, dubina: 0.6, lice: 0.12, stop: 0.2 };   /* prijenosna stanica uz stražnji zid; traka duž y */
const CRTA = { x0: -0.6, x1: 1.0, cy: -1.0, R: 0.5 };
const OPSEG = 2 * (CRTA.x1 - CRTA.x0) + 2 * PI * CRTA.R;
const KUTIJA = { x: -1.75, y: -1.4, a: 0.4, b: 0.3, h: 0.3 };
const STOL = { x: 2.15, y: -1.55, a: 0.5, h: 0.75, noga: 0.025 };
const OSOBA_PUT = { x0: -0.4, x1: 2.0, y: 0.15, r: 0.2 };
const POZE = {
  sredina: { x: 0, y: 0.2, phi: 0, naziv: 'Sredina' },
  predaja: { x: ST_PRED.x - TX, y: ST_PRED.yF - BG_Y - 0.35, phi: 0, naziv: 'Pred stanicom za predaju' },
  punjenje: { x: ST_PUN.x + 1.0, y: ST_PUN.y, phi: PI, naziv: 'Pred stanicom za punjenje' }
};
const seg = (a, b, o = {}) => Object.assign({ tip: 'seg', a, b }, o);
const pravokutnik = (x0, x1, y0, y1) => [seg([x0, y0], [x1, y0]), seg([x1, y0], [x1, y1]), seg([x1, y1], [x0, y1]), seg([x0, y1], [x0, y0])];
const ZIDOVI = pravokutnik(SOBA.x0, SOBA.x1, SOBA.y0, SOBA.y1);
const P_KUTIJA = pravokutnik(KUTIJA.x - KUTIJA.a / 2, KUTIJA.x + KUTIJA.a / 2, KUTIJA.y - KUTIJA.b / 2, KUTIJA.y + KUTIJA.b / 2);
const NOGE_STOL = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [STOL.x + sx * (STOL.a / 2 - 0.03), STOL.y + sy * (STOL.a / 2 - 0.03)]);
const P_STOL_NOGE = NOGE_STOL.map((c) => ({ tip: 'krug', c, r: STOL.noga }));
const P_STOL_PLOCA = pravokutnik(STOL.x - STOL.a / 2, STOL.x + STOL.a / 2, STOL.y - STOL.a / 2, STOL.y + STOL.a / 2);
const NOGE_PRED = [[-1, 0], [1, 0], [1, 1], [-1, 1]].map(([sx, sy]) => [ST_PRED.x + sx * (ST_PRED.sirina / 2 - 0.03), ST_PRED.yF + 0.03 + sy * (ST_PRED.dubina - 0.06)]);
const P_PRED_NOGE = NOGE_PRED.map((c) => ({ tip: 'krug', c, r: 0.02 }));
const P_PRED_PLOCA = pravokutnik(ST_PRED.x - ST_PRED.sirina / 2, ST_PRED.x + ST_PRED.sirina / 2, ST_PRED.yF, ST_PRED.yF + ST_PRED.dubina);
const P_PRED_LICE = [seg([ST_PRED.x - ST_PRED.lice, ST_PRED.yF], [ST_PRED.x + ST_PRED.lice, ST_PRED.yF])];
const P_PUN = { laser: K.preprekeStanice(ST_PUN.x, ST_PUN.y, ST_PUN.phi, { za: 'laser' }), ir: K.preprekeStanice(ST_PUN.x, ST_PUN.y, ST_PUN.phi, { za: 'ir' }), sudar: K.preprekeStanice(ST_PUN.x, ST_PUN.y, ST_PUN.phi, { za: 'sudar' }) };
const MARKERI = P_PUN.laser.filter((p) => p.reflektor);
const PREP = {};
function slozenePrepreke() {
  const os = st.osoba.on ? [{ tip: 'krug', c: [st.osoba.x, st.osoba.y], r: OSOBA_PUT.r }] : [];
  PREP.laser = [...ZIDOVI, ...P_KUTIJA, ...P_STOL_NOGE, ...P_PRED_NOGE, ...P_PUN.laser, ...os];
  PREP.ir = [...ZIDOVI, ...P_KUTIJA, ...P_STOL_NOGE, ...P_PRED_NOGE, ...P_PUN.ir, ...os];
  PREP.nisko = [...ZIDOVI, ...P_KUTIJA, ...P_STOL_NOGE, ...P_PRED_NOGE, ...P_PUN.sudar, ...os];
  PREP.visoko = [...ZIDOVI, ...P_STOL_PLOCA, ...P_PRED_PLOCA, ...os];
  PREP.bg = [...P_PRED_LICE, ...ZIDOVI];
}
function udaljenostCrta(x, y) {
  if (x < CRTA.x0) return Math.abs(Math.hypot(x - CRTA.x0, y - CRTA.cy) - CRTA.R);
  if (x > CRTA.x1) return Math.abs(Math.hypot(x - CRTA.x1, y - CRTA.cy) - CRTA.R);
  return Math.min(Math.abs(y - (CRTA.cy - CRTA.R)), Math.abs(y - (CRTA.cy + CRTA.R)));
}
function parametarCrte(x, y) {   /* duljina luka po crti (suprotno od kazaljke, od donjeg lijevog kraja ravnog dijela) */
  const L1 = CRTA.x1 - CRTA.x0;
  if (x >= CRTA.x0 && x <= CRTA.x1) return y < CRTA.cy ? x - CRTA.x0 : L1 + PI * CRTA.R + (CRTA.x1 - x);
  if (x > CRTA.x1) return L1 + (Math.atan2(y - CRTA.cy, x - CRTA.x1) + PI / 2) * CRTA.R;
  let a = Math.atan2(y - CRTA.cy, x - CRTA.x0); if (a < 0) a += 2 * PI;
  return 2 * L1 + PI * CRTA.R + (a - PI / 2) * CRTA.R;
}
const uSvijet = (P, lx, ly) => { const c = Math.cos(P.phi), s = Math.sin(P.phi); return [P.x + lx * c - ly * s, P.y + lx * s + ly * c]; };
const sastavi = (A, B) => { const [x, y] = uSvijet(A, B.x, B.y); return { x, y, phi: A.phi + B.phi }; };
const relativno = (A, B) => { const dx = B.x - A.x, dy = B.y - A.y, c = Math.cos(A.phi), s = Math.sin(A.phi); return { x: dx * c + dy * s, y: -dx * s + dy * c, phi: kut(B.phi - A.phi) }; };

/* ================================================================== */
/* 4. Stanje                                                          */
/* ================================================================== */
const st = {
  p: { ...POZE.sredina }, v: nula(), vS: nula(), m: [0, 0, 0], mZad: [0, 0, 0], ogr: 1,
  napajanje: 'ukljucen', tPrijelaz: 0, drzi: null, sig: 'rad', estop: false, lokaliziran: true, tLok: 0,
  web: true, tab: 'voznja', naredba: { ...nula(), starost: 99 }, wd: false,
  klijent: { t: 0, period: T_API, salje: true, rest: false, seq: 0 },
  rucno: { vx: 0, vy: 0, w: 0, tipke: new Set(), pad: null, brz: 0.5, cekaj: false },
  irZastita: false, polje: false, bumperStop: true, irStopAkt: false, irStopBio: false,
  kliz: false, ziro: true, odo: new K.Odometrija({ kvantizirano: true }), odoRef: { ...POZE.sredina },
  ir: new Array(9).fill(IR_MAX), bg: [IR_MAX, IR_MAX, IR_MAX], opt: [false, false], optBio: [false, false], bumper: false, greska: null, tGreska: 0,
  uPolju: false, poljeSmjer: null, sken: null, intenz: null, markeri: { L: null, R: null }, tSken: 0, tIR: 0,
  bat: SIM.batPocetak, ext: false, bioPristao: false, batDok: null,
  nosac: { gdje: CPMR ? 'robot' : 'nema', s: 0, svijet: null }, hs: { bg3: false, bg2: false, vidi: false, t: 0 },
  zad: null, dok: null, fino: null, prog: { blokovi: [], pc: -1, poruka: '' },
  kotaci: [0, 0, 0], valjci: [0, 0, 0], traka: 0, trakaSt: 0,
  osoba: { on: false, x: OSOBA_PUT.x0, y: OSOBA_PUT.y, smjer: 1 },
  mapiranje: false, karta: new Map(), kartaMod: 'robot',
  mj: { vx: 0, vy: 0, w: 0, d60: 0, put: 0, rot: 0, mirT: 0 }, kvadrati: [], krugovi: 0, crta: { v: SIM.crta.v, g: SIM.crta.g },
  zrakeIR: false, zrakeLaser: false, trag: true, prati: false, ubrzanje: 1, vrijeme: 0, prljavo: true, svjetla: null, log: []
};

/* ================================================================== */
/* 5. Nizovi i koraci                                                  */
/* ================================================================== */
const m1Zad = () => K.inverzna(0.2, 0, 0)[0];
const NIZOVI = [
  { id: 'ukljucivanje', grupa: 'Osnove', naziv: 'Uključivanje i web sučelje', opis: 'glavno tipkalo i LED prsten, pokretanje sustava, spajanje na web sučelje, RESET i START, lokalizacija.', koraci: [
    { u: 'Uključi robota: drži glavno tipkalo (prvo lijevo na ploči „Tipkala i svjetla na robotu”) oko ' + kz(T_DRZI, 0) + ' s.', p: 'Na robotu je tipkalo u pokrovu upravljačke jedinice. Kratki pritisak ne uključuje robota — tako se sprječava slučajno uključivanje. Za vrijeme rada kratki pritisak prekida program ili vezu s vanjskim računalom. Tipkovnicom: fokusiraj tipkalo (Tab) i drži Enter.', k: 'ukljuci' },
    { u: 'Pričekaj da se sustav pokrene. LED prsten tipkala treperi dok se računalo podiže, a zatim svijetli stalno plavo.', p: 'Stvarni robot se pokreće do minute: podiže se Ubuntu s Robotino OS-om i WLAN pristupna točka. Simulator to skraćuje na ' + SIM.boot + ' s.', k: 'boot' },
    { u: 'Spoji se na web sučelje robota: klikni „Poveži” u adresnoj traci (adresa ' + IP + ').', p: 'Računalo ili tablet najprije se spoji na WLAN robota (ime mreže je na natpisnoj pločici), a zatim se u pregledniku otvori adresa robota. Web sučelje ima ručnu vožnju, prikaz senzora i postavke.', k: 'web' },
    { u: 'Lampica tipkala RESET svijetli, a narančasti segment signalnog stupa treperi: sigurnosni krug još nije potvrđen. Pritisni RESET.', p: 'Sigurnosni relej nadogradnje drži aktuatore isključenima dok se krug nužnog stopa ne potvrdi tipkalom RESET. Lampica se mora ugasiti prije vožnje.', k: 'reset' },
    { u: 'Pritisni START (svijetli dok robot čeka pokretanje rada).', p: 'START je prozirno svjetleće tipkalo na istoj kutiji. Tek nakon njega pogoni smiju raditi.', k: 'start' },
    { u: 'Pričekaj lokalizaciju: crveni segment treperi dok robot ne zna gdje je na karti. Kad se ugasi, zeleni svijetli stalno — robot je spreman.', p: 'U tvornici se robot lokalizira laserskim skenerom na karti prostorije. Dok nije lokaliziran, ne smije voziti automatski.', k: 'lokal' },
    { u: 'Pogledaj signalni stup i natpis ispod njega. Zelena stalno: ' + ZNACENJE.zelena.stalno + '; zelena treperi: ' + ZNACENJE.zelena.treperi + '. Klikni „Dalje”.', p: 'Cijelu tablicu značenja svjetala ponavlja niz „Nužni stop i ponovno pokretanje”.', k: 'dalje' },
    { u: 'Kraj niza „Uključivanje i web sučelje”. Odaberi sljedeći niz.', p: 'Robot ostaje uključen; u slobodnoj vožnji isprobaj sve kartice web sučelja.', k: 'kraj' }] },
  { id: 'voznja', grupa: 'Osnove', naziv: 'Vožnja u svim smjerovima i kinematika', opis: 'čisti vx, čisti vy i čisti ω, brzine motora m1–m3, izračun brzine motora i vožnja pod kutom 60°.', koraci: [
    { u: 'Vozi samo naprijed (vx > 0, vy = 0, ω = 0) barem 0,3 m — tipka W, strelica ↑ ili klizač vx. Gledaj karticu „Omnidrive — kinematika uživo”: koliki je m2?', p: 'Motor M2 je straga (θ = 180°): njegova obodna brzina je okomita na os x, pa pri čistoj vožnji naprijed miruje (m2 = 0), a M1 i M3 se vrte suprotno istim iznosom.', k: 'vx' },
    { u: 'Vozi samo bočno ulijevo (vy > 0) barem 0,3 m — tipka A ili strelica ←.', p: 'Sada radi i M2, i to najjače: m2 = −k·vy, a m1 = m3 = +k·vy/2. Robot se ne okreće jer je zbroj doprinosa zakretu jednak nuli.', k: 'vy' },
    { u: 'Okreni robota na mjestu (samo ω) za barem 90° — tipka Q ili E.', p: 'Pri čistom okretanju sva tri motora imaju istu brzinu: m1 = m2 = m3 = k·rb·ω.', k: 'w' },
    { u: 'Izračunaj brzinu motora M1 za vx = 0,20 m/s, vy = 0, ω = 0 i upiši je (1/min, s predznakom).', p: 'm1 = k · (−sin 60° · vx + cos 60° · vy + rb · ω), a k = 60 · gear / (2π · rw). Vrijednost k je u kartici kinematike.', k: 'unos', unos: { oznaka: 'm1 =', jed: '1/min', tocno: m1Zad, tol: 0.01 } },
    { u: 'Vozi pod kutom 60° prema osi x (npr. klizači vx = 0,10 i vy = 0,17 m/s, ω = 0) barem 0,2 m. Koji motor sada miruje?', p: 'Motor stoji kad je smjer vožnje usporedan s osi njegova kotača: m1 = k·v·sin(α − 60°) = 0 za α = 60°. Kotač M1 se tada samo kotrlja po valjcima.', k: 'd60' },
    { u: 'Kraj niza „Vožnja u svim smjerovima i kinematika”.', p: 'Isprobaj i kombinacije (vožnja ravno uz okretanje) — robot može voziti po pravcu dok se okreće oko svoje osi.', k: 'kraj' }] },
  { id: 'odometrija', grupa: 'Osnove', naziv: 'Enkoderi i odometrija', opis: 'inkrementi enkodera, odometrija iz brzina motora, kvadrat 1 × 1 m s proklizavanjem, ispravak žiroskopom.', koraci: [
    { u: 'Otvori karticu Odometrija. Proklizavanje je uključeno, žiroskop isključen. Klikni „Vozi kvadrat 1 × 1 m” i pričekaj kraj.', p: 'Robot vozi 1 m ravno i okrene se za 90°, četiri puta — i sve to mjeri samo svojom odometrijom (enkoderima). Pri okretanju valjci proklizavaju, pa se stvarni zakret razlikuje od izračunatog i robot ne završi tamo gdje misli.', k: 'kvadrat1' },
    { u: 'Usporedi odometriju i stvarnu pozu (tablica i trag u 3D prikazu). Sada uključi žiroskop (' + ZIRO + ') i resetiraj odometriju.', p: 'Žiroskop izravno mjeri kutnu brzinu tijela robota, pa proklizavanje kotača ne kvari kut. Na stvarnom robotu operacijski sustav njime sam ispravlja odometriju; u web sučelju se bira unutarnji ili vanjski žiroskop.', k: 'ziro' },
    { u: 'Ponovno pokreni kvadrat i usporedi pogrešku s prethodnom (popis ispod tablice).', p: 'Pogreška duljine (pomak je za proklizavanje kraći) se u zatvorenom kvadratu skoro poništi; pogreška kuta se nakuplja i vodi robota sve dalje od cilja. Zato je ispravak kuta najvažniji.', k: 'kvadrat2' },
    { u: 'Koliko inkremenata enkodera odgovara jednom okretaju kotača? Upiši broj.', p: 'Enkoder ima ' + POGON.impulsaPoOkr + ' impulsa po okretaju; brojanjem svih bridova obaju kanala dobiva se ' + POGON.inkPoOkr + ' inkremenata po okretaju motora. Prijenosni omjer je ' + POGON.gear + ' : 1.', k: 'unos', unos: { oznaka: 'inkremenata =', jed: '', tocno: () => POGON.inkPoOkr * POGON.gear, tol: 0 } },
    { u: 'Kraj niza „Enkoderi i odometrija”.', p: 'U slobodnoj vožnji uključi proklizavanje i vozi robota dulje vremena: trag odometrije (narančasto) se sve više odvaja od stvarnog traga.', k: 'kraj' }] },
  { id: 'senzori', grupa: 'Senzori', naziv: 'Senzori udaljenosti i odbojnik', opis: 'devet IR senzora, napon i udaljenost, zaustavljanje na 0,15 m, IR zaštita i Bumper.', koraci: [
    { u: 'Robot gleda prema zidu. Polako vozi naprijed i zaustavi se kad senzor IR1 (naprijed) pokaže 0,15 m (±0,02 m). Prati karticu Senzori.', p: 'Senzori ' + SENZORI.ir.tip + ' mjere ' + kz(IR_MIN * 100, 0) + '–' + kz(IR_MAX * 100, 0) + ' cm i daju analogni napon: što bliže, to veći napon (krivulja nije linearna). Ispod ~3 cm napon opet pada — zato senzor u tom području daje krivu udaljenost.', k: 'zid' },
    { u: 'Uključi „IR zaštita” u kartici Vožnja, odmakni se od zida i vozi prema njemu — robot mora stati sam.', p: 'Mali program u sučelju: kad senzor u smjeru vožnje izmjeri manje od ' + kz(SIM.irZastita, 2) + ' m, translacija se zaustavlja. Pri većoj brzini zaustavni put je dulji — vozi umjereno.', k: 'irStop' },
    { u: 'Isključi IR zaštitu i polako udari u zid ili kutiju — odbojnik (Bumper) zaustavlja robota.', p: 'Odbojnik ' + SENZORI.odbojnik.tip + ' radi na načelu mirne struje: pritisak (ili prekid kabela) prekida program i kretanje. Zaustavljanje na odbojnik je zadano uključeno.', k: 'bumper' },
    { u: 'Otpusti tipke i odvezi se od prepreke: Bumper se otpusti, crveni segment se ugasi.', p: 'Nakon dodira robot prihvaća samo novu naredbu — dok ne otpustiš tipke ili ne vratiš klizače, stoji.', k: 'odmak' },
    { u: 'Kraj niza „Senzori udaljenosti i odbojnik”.', p: 'Uključi „Zrake IR” u 3D prikazu: zrake koje pogađaju prepreku su narančaste.', k: 'kraj' }] },
  { id: 'laser', grupa: 'Senzori', naziv: 'Laserski skener i karta', opis: 'zrake lasera, okretanje i vožnja dok se gradi karta, reflektorski markeri, zaštitno polje i osoba.', koraci: [
    { u: 'Uključi „Zrake lasera” ispod 3D prikaza.', p: (LZ ? LZ.naziv : 'Skener') + ' mjeri ' + (LZ ? kz(LZ.kutMax - LZ.kutMin, 0) : '—') + '° oko prednje strane robota s korakom ' + (LZ ? kz(LZ.razlucivost, 3) : '—') + '°, ' + (LZ ? LZ.f : '—') + ' puta u sekundi. Crvene točke su odrazi.', k: 'zrake' },
    { u: 'Uključi „Mapiranje” (kartica Laserski skener i karta) i okreni robota na mjestu za puni krug (360°).', p: 'Svaki sken se upisuje u kartu prema pozi koju robot misli da ima (odometriji). Karta je mreža ćelija ' + kz(SIM.karta * 100, 0) + ' cm.', k: 'okret' },
    { u: 'Prebaci prikaz na „Karta” i vozi kroz prostoriju barem 1,5 m dok se karta popunjava.', p: 'Uključiš li proklizavanje i isključiš žiroskop (kartica Odometrija), karta se razmaže: zidovi se upisuju na krivo mjesto jer je poza kriva. Zato se u praksi poza ispravlja usporedbom skena s kartom (SLAM).', k: 'karta' },
    { u: 'Okreni robota prema stanici za punjenje (lijevi zid) dok laser ne vidi oba reflektorska markera — na prikazu su žuti.', p: 'Retroreflektirajući markeri daju vrlo jak odraz pa ih skener razlikuje od zida. Iz dva markera robot zna položaj, smjer i širinu stanice.', k: 'markeri' },
    { u: 'Uključi „Zaštitno polje lasera” (kartica Vožnja) i „Osoba” ispod 3D prikaza. Osoba hoda poprijeko kroz sredinu prostorije — okreni robota prema njezinu putu, oko 0,4 m od njega. Kad osoba uđe u polje ispred skenera, narančasti segment svijetli stalno i robot ne vozi prema njoj.', p: 'Polje je ovdje polukrug ' + kz(SIM.polje.r, 2) + ' m ispred skenera. Robot se smije odmicati, ali ne voziti prema prepreci u polju.', k: 'polje' },
    { u: 'Kraj niza „Laserski skener i karta”.', p: 'Karta ostaje do brisanja; ugasi osobu da ne smeta u drugim nizovima.', k: 'kraj' }] },
  { id: 'crta', grupa: 'Senzori', naziv: 'Slijeđenje crte optičkim senzorima', opis: 'dva optička senzora na dnu, digitalni ulazi DI1/DI2, automatsko slijeđenje crte i obilazak staze.', koraci: [
    { u: 'Robot stoji na crti, a dva optička senzora su lijevo i desno od nje. Pomakni ga malo bočno (tipke A ili D) dok jedan senzor ne vidi crtu — gledaj DI1 i DI2 u kartici Crta.', p: 'Senzori ' + SENZORI.opticki.tip + ' gledaju u pod crvenim svjetlom i javljaju samo „svijetlo/tamno” na digitalni ulaz (' + SENZORI.opticki.ulaz + ').', k: 'senzor' },
    { u: 'Vrati robota na crtu, postavi brzinu u kartici Crta i uključi „Slijeđenje crte”.', p: 'Logika je najjednostavnija: lijevi vidi crtu → okreni lijevo, desni vidi crtu → okreni desno, nijedan → ravno. U Robotino Viewu bi to bio Grafcet s dva prijelaza.', k: 'auto' },
    { u: 'Pusti robota da obiđe cijeli krug staze.', p: 'Kut okretanja (ω pri skretanju) mora biti dovoljan za najmanji polumjer staze (' + kz(CRTA.R, 2) + ' m): ω ≥ v / R. Ako je premalen, robot izleti iz zavoja.', k: 'krug' },
    { u: 'Isprobaj veću brzinu ili manji ω pri skretanju i pogledaj kada robot izgubi crtu. Klikni „Dalje”.', p: 'Uz v = 0,3 m/s treba ω ≥ 0,6 rad/s samo da se prati zavoj; zbog kašnjenja (senzori su ' + kz(OPT[0].x * 100, 0) + ' cm ispred središta, rampa ubrzanja) treba i rezerva.', k: 'dalje' },
    { u: 'Kraj niza „Slijeđenje crte”.', p: 'Na stvarnom robotu crtu se može pratiti i kamerom (blok Line Recognizer u Robotino Viewu).', k: 'kraj' }] },
  { id: 'pristajanje', grupa: 'Zadaci', naziv: 'Pristajanje na stanicu za punjenje', opis: 'reflektorski markeri, tri koraka algoritma pristajanja laserom, povratni kôd, punjenje i rad na mrežnom napajanju.', koraci: [
    { u: 'Baterija je pri kraju. Okreni robota dok laser ne vidi oba reflektorska markera stanice (kartica Punjenje: „markeri 2/2”).', p: 'Stanica za punjenje je uz lijevi zid. Markeri moraju biti na strani s koje robot prilazi.', k: 'markeri' },
    { u: 'Pokreni pristajanje gumbom „Pristani (Dock)” u kartici Punjenje.', p: 'Algoritam: (1) zakreni se tako da gledaš ravno u stanicu, (2) vozi bočno dok se ne nađeš na normali stanice, (3) vozi ravno dok udaljenost ne padne ispod zadane. Povratni kôd: 0 = nastavi, 1 = greška, 2 = gotovo.', k: 'dok' },
    { u: 'Prati korake 1–3 i povratni kôd dok ne dođe kôd 2 i kontakt (get_extpower = 1).', p: 'Kontakt robota (sprijeda, lijevo od lasera) dodiruje 6-polnu kontaktnu ploču stanice.', k: 'kod2' },
    { u: 'Robot se puni: baterija raste, a robot radi na mrežnom napajanju. Pričekaj da baterija naraste za 2 %.', p: 'Stanica daje najviše ' + P_STANICA + ' W. Dok je robot spojen, ne prazni baterije.', k: 'puni' },
    { u: 'Odvezi se sa stanice (vožnja natrag, tipka S): punjenje prestaje (get_extpower = 0).', p: 'U tvornici robot sam odlazi na stanicu prema postavkama Fleet Managera i s nje kad dobije nalog.', k: 'odvoz' },
    { u: 'Kraj niza „Pristajanje na stanicu za punjenje”.', p: 'Pokušaj pristajanje i iz nepovoljnog kuta — ako laser izgubi markere, kôd je 1.', k: 'kraj' }] },
  { id: 'predaja', grupa: 'Zadaci', naziv: 'Predaja nosača stanici', opis: 'prilaz prijenosnoj stanici, fino pozicioniranje senzorima BG4–BG6, handshake BG2/BG3, trake i senzor BG1.', koraci: [
    { u: 'Nosač je u prihvatu (BG1 = 1). Dovezi robota lijevom stranom (prihvat) pred prijenosnu stanicu dok BG5 ne uđe u domet (< 0,30 m) — ručno bočnom vožnjom ili gumbom „Prilaz” u kartici Nosač.', p: 'Prihvat i trake idu poprijeko, duž osi y robota, pa robot stanici prilazi bočno. Senzori BG4–BG6 i handshake su na lijevom kraju prihvata.', k: 'prilaz' },
    { u: 'Pokreni „Fino pozicioniranje”: kut iz razlike BG4 i BG6, udaljenost iz BG5, a bočno dok handshake prijemnik ne vidi stanicu.', p: 'Tri senzora ' + SENZORI.ir.tip + ' mjere udaljenost do lica stanice. Ako su BG4 i BG6 jednaki, robot je usporedan sa stanicom.', k: 'fino' },
    { u: 'Klikni „Predaj nosač”: robot pali odašiljač BG3 i čeka da stanica odgovori na prijemnik BG2.', p: 'Optički handshake je jednobitna veza bez kabela i mreže: obje strane potvrđuju da su spremne. Razmak do stanice ~' + kz(HS_RAZMAK * 100, 0) + ' cm.', k: 'hs' },
    { u: 'Trake prebacuju nosač na stanicu. Pričekaj da BG1 javi prazan prihvat.', p: 'Traka za izdavanje gura nosač prema stanici, a traka stanice ga preuzima i vozi do graničnika.', k: 'predano' },
    { u: 'Vrati nosač: klikni „Preuzmi nosač” i pričekaj BG1 = 1.', p: 'Sada stanica šalje nosač, a traka za prihvat ga uvlači. Robot smije krenuti tek kad BG1 potvrdi nosač.', k: 'vraceno' },
    { u: 'Kraj niza „Predaja nosača stanici”.', p: 'U tvornici nalog za predaju dolazi iz MES-a preko Fleet Managera, koji zna naučene poze stanica.', k: 'kraj' }] },
  { id: 'estop', grupa: 'Sigurnost', naziv: 'Nužni stop i ponovno pokretanje', opis: 'gljiva nužnog stopa, isključenje aktuatora, otpuštanje, RESET, START i značenja signalnog stupa.', koraci: [
    { u: 'Robot slijedi crtu. Pritisni gljivu nužnog stopa.', p: 'Nužni stop isključuje sve aktuatore (pogon i trake); svi nužni stopovi u sustavu tvornice su povezani.', k: 'gljiva' },
    { u: 'Narančasti segment treperi. Pokušaj voziti ili pritisni RESET dok je gljiva pritisnuta — ništa se ne događa.', p: 'Dok je gljiva mehanički zaključana, sigurnosni relej ne može se vratiti u radno stanje.', k: 'pokusaj' },
    { u: 'Otpusti gljivu (klik na gljivu: zakreni i povuci).', p: 'Nema automatskog ponovnog pokretanja: otpuštanje gljive samo omogućuje potvrdu.', k: 'otpusti' },
    { u: 'Pritisni RESET — lampica RESET se gasi.', p: 'RESET potvrđuje sigurnosni krug (sigurnosni relej prima signal tipkala).', k: 'reset' },
    { u: 'Pritisni START.', p: 'Prekinuti zadatak se ne nastavlja sam — pokreće se ponovno.', k: 'start' },
    { u: 'Što znači narančasti segment koji treperi?', p: 'Tablica: crvena stalno — ' + ZNACENJE.crvena.stalno + ', treperi — ' + ZNACENJE.crvena.treperi + '; narančasta stalno — ' + ZNACENJE.narancasta.stalno + ', treperi — ' + ZNACENJE.narancasta.treperi + '; zelena stalno — ' + ZNACENJE.zelena.stalno + ', treperi — ' + ZNACENJE.zelena.treperi + '.', k: 'izbor', izbor: { opcije: [ZNACENJE.narancasta.stalno, ZNACENJE.narancasta.treperi, ZNACENJE.crvena.treperi, ZNACENJE.zelena.treperi], tocno: 1 } },
    { u: 'Kraj niza „Nužni stop i ponovno pokretanje”.', p: 'Na stvarnom robotu prije RESET-a provjeri zašto je stop pritisnut i je li prostor oko robota slobodan.', k: 'kraj' }] },
  { id: 'program', grupa: 'Zadaci', naziv: 'Mali program', opis: 'program od blokova (Vozi do, Okreni, Čekaj senzor, Pristani, Predaj nosač) kao Grafcet u Robotino Viewu.', koraci: [
    { u: 'U kartici Program sastavi program: Predaj nosač pa Pristani (između smiješ dodati i druge blokove, npr. Vozi do ili Čekaj).', p: 'Blokovi se izvode redom, svaki čeka da prethodni završi — kao koraci i prijelazi u Grafcetu. „Predaj nosač” sam vozi do naučene poze stanice, fino se pozicionira i predaje nosač; „Pristani” vozi pred stanicu za punjenje i pristaje laserom.', k: 'sastavi' },
    { u: 'Pokreni program i pričekaj kraj. Zeleni segment treperi dok je robot zauzet.', p: 'Ako se program prekine (prepreka, nužni stop, greška pristajanja), popravi uzrok i pokreni ponovno.', k: 'pokreni' },
    { u: 'Kraj niza „Mali program”.', p: 'Dodaj „Preuzmi nosač” i „Čekaj senzor BG1 = 1” pa napravi puni krug: predaja, punjenje, preuzimanje.', k: 'kraj' }] }
];
let niz = null, korakNiza = 0;
const gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-robotino-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-robotino-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }

/* ================================================================== */
/* 6. 3D scena                                                        */
/* ================================================================== */
const scenaEl = $('scena');
const SOFTVERSKI = (() => {   /* softversko iscrtavanje (npr. SwiftShader): bez MSAA i s gustoćom piksela 1, da simulator ostane tečan */
  try { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); const r = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; if (e) g.getExtension('WEBGL_lose_context')?.loseContext(); return /swiftshader|llvmpipe|software/i.test(r); } catch (e) { return false; }
})();
const renderer = new THREE.WebGLRenderer({ antialias: !SOFTVERSKI, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SOFTVERSKI ? 1 : Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.03, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = PI * 0.495; controls.minDistance = 0.4; controls.maxDistance = 14;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-2, 5, 3); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(3, 2.5, -2); scene.add(sun2);
const S3 = (x, y, z = 0) => new THREE.Vector3(x, z, -y);          /* KS svijeta robota → scena */
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0.05 }, o));
function kutija(a, b, h, m, x, y, z0 = 0, rot = 0) { const me = new THREE.Mesh(new THREE.BoxGeometry(a, h, b), m); me.position.copy(S3(x, y, z0 + h / 2)); me.rotation.y = rot; scene.add(me); return me; }
/* pod i zidovi */
{
  const vanjski = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), mat(0x7f878b, { roughness: 1 })); vanjski.rotation.x = -PI / 2; vanjski.position.y = -0.002; scene.add(vanjski);
  const pod = new THREE.Mesh(new THREE.PlaneGeometry(SOBA.x1 - SOBA.x0, SOBA.y1 - SOBA.y0), mat(0xd9dcd8, { roughness: 0.95 })); pod.rotation.x = -PI / 2; scene.add(pod);
  const lin = []; for (let x = SOBA.x0 + 0.5; x < SOBA.x1 - 1e-6; x += 0.5) lin.push(S3(x, SOBA.y0, 0.0008), S3(x, SOBA.y1, 0.0008));
  for (let y = SOBA.y0 + 0.5; y < SOBA.y1 - 1e-6; y += 0.5) lin.push(S3(SOBA.x0, y, 0.0008), S3(SOBA.x1, y, 0.0008));
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lin), new THREE.LineBasicMaterial({ color: 0xb9bdb9 })));
  const mz = mat(0xe9e6df, { roughness: 0.9 }), W = SOBA.x1 - SOBA.x0, H = SOBA.y1 - SOBA.y0, d = SOBA.d;
  kutija(W + 2 * d, d, SOBA.h, mz, 0, SOBA.y1 + d / 2); kutija(W + 2 * d, d, SOBA.h, mz, 0, SOBA.y0 - d / 2);
  kutija(d, H, SOBA.h, mz, SOBA.x0 - d / 2, 0); kutija(d, H, SOBA.h, mz, SOBA.x1 + d / 2, 0);
  /* crta za slijeđenje */
  const N = 240, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * OPSEG; let x, y, nx, ny; const L1 = CRTA.x1 - CRTA.x0;
    if (s < L1) { x = CRTA.x0 + s; y = CRTA.cy - CRTA.R; nx = 0; ny = -1; }
    else if (s < L1 + PI * CRTA.R) { const a = -PI / 2 + (s - L1) / CRTA.R; x = CRTA.x1 + CRTA.R * Math.cos(a); y = CRTA.cy + CRTA.R * Math.sin(a); nx = Math.cos(a); ny = Math.sin(a); }
    else if (s < 2 * L1 + PI * CRTA.R) { x = CRTA.x1 - (s - L1 - PI * CRTA.R); y = CRTA.cy + CRTA.R; nx = 0; ny = 1; }
    else { const a = PI / 2 + (s - 2 * L1 - PI * CRTA.R) / CRTA.R; x = CRTA.x0 + CRTA.R * Math.cos(a); y = CRTA.cy + CRTA.R * Math.sin(a); nx = Math.cos(a); ny = Math.sin(a); }
    const h = SIM.crta.sirina / 2; const a1 = S3(x + nx * h, y + ny * h, 0.0015), a2 = S3(x - nx * h, y - ny * h, 0.0015);
    pos.push(a1.x, a1.y, a1.z, a2.x, a2.y, a2.z);
    if (i < N) { const b = 2 * i; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x15181a, side: THREE.DoubleSide })));
  /* kutija i stol */
  kutija(KUTIJA.a, KUTIJA.b, KUTIJA.h, mat(0xb98b55, { roughness: 0.9 }), KUTIJA.x, KUTIJA.y);
  const ms = mat(0xc8b597, { roughness: 0.7 }), mn = mat(0x5d666c, { roughness: 0.5, metalness: 0.4 });
  kutija(STOL.a, STOL.a, 0.03, ms, STOL.x, STOL.y, STOL.h - 0.03);
  NOGE_STOL.forEach(([x, y]) => kutija(STOL.noga * 2, STOL.noga * 2, STOL.h - 0.03, mn, x, y));
}
/* prijenosna stanica (načelna, nalik stanici MPS): stol, traka duž y na visini prihvata robota, lice za BG4–BG6, handshake */
const PRED = {};
{
  const m1 = mat(0x8d9aa3, { metalness: 0.4, roughness: 0.45 }), m2 = mat(0x2f3438, { roughness: 0.6 }), mAlu = mat(0xb8c0c6, { metalness: 0.5, roughness: 0.35 });
  const zPl = Z_PRIH - 0.11, cy = ST_PRED.yF + ST_PRED.dubina / 2;
  kutija(ST_PRED.sirina, ST_PRED.dubina, 0.03, mat(0x9fb0ba, { roughness: 0.6 }), ST_PRED.x, cy, zPl - 0.03);
  NOGE_PRED.forEach(([x, y]) => kutija(0.04, 0.04, zPl - 0.03, mAlu, x, y));
  kutija(0.2, ST_PRED.dubina, 0.07, mAlu, ST_PRED.x, cy, Z_PRIH - 0.08);
  kutija(0.15, ST_PRED.dubina - 0.01, 0.008, m2, ST_PRED.x, cy, Z_PRIH - 0.008);
  kutija(ST_PRED.lice * 2, 0.012, 0.1, m1, ST_PRED.x, ST_PRED.yF + 0.006, Z_PRIH - 0.13);
  kutija(0.2, 0.02, 0.04, mAlu, ST_PRED.x, ST_PRED.yF + ST_PRED.dubina - 0.03, Z_PRIH);
  PRED.rebra = [];
  for (let i = 0; i < 14; i++) PRED.rebra.push(kutija(0.15, 0.006, 0.003, mat(0x111416), ST_PRED.x, ST_PRED.yF + 0.02, Z_PRIH - 0.001));
  PRED.ledOn = new THREE.MeshBasicMaterial({ color: 0x38e070 }); PRED.ledOff = mat(0x24412d);
  PRED.hsOn = new THREE.MeshBasicMaterial({ color: 0xff4a3a }); PRED.hsOff = mat(0x4a1f1c);
  PRED.odasiljac = kutija(0.024, 0.02, 0.03, PRED.hsOff, ST_PRED.x - 0.07, ST_PRED.yF - 0.01, Z_PRIH - 0.055);
  PRED.prijemnik = kutija(0.024, 0.02, 0.03, mat(0x2a2f33), ST_PRED.x + 0.07, ST_PRED.yF - 0.01, Z_PRIH - 0.055);
  PRED.led = kutija(0.03, 0.03, 0.03, PRED.ledOff, ST_PRED.x + 0.28, ST_PRED.yF + 0.05, zPl);
  const g = new THREE.Group(); const n = napraviNosac(THREE); n.rotation.x = -PI / 2; g.add(n); g.visible = false; scene.add(g); PRED.nosac = g;
}
/* osoba (za zaštitno polje) */
const osobaG = new THREE.Group();
{
  const mt = mat(0x3a6ea5, { roughness: 0.8 }), mk = mat(0xe0b08f, { roughness: 0.7 }), mh = mat(0x2d3338);
  const tij = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.62, 20), mt); tij.position.y = 1.15; osobaG.add(tij);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.84, 12), mh); n.position.set(0, 0.42, s * 0.08); osobaG.add(n); }
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), mk); gl.position.y = 1.62; osobaG.add(gl);
  osobaG.visible = false; scene.add(osobaG);
}
/* tragovi: stvarni i odometrija */
function napraviTrag(boja) {
  const N = 4000, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setDrawRange(0, 0);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: boja })); l.frustumCulled = false; scene.add(l);
  return { l, g, N, n: 0, zadnja: null };
}
const TRAG = { sv: napraviTrag(0x139aa6), od: napraviTrag(0xe07b00) };
function dodajTrag(T, x, y, h) {
  if (T.zadnja && Math.hypot(x - T.zadnja[0], y - T.zadnja[1]) < 0.01) return;
  if (T.n >= T.N) { const a = T.g.attributes.position.array; a.copyWithin(0, 3 * (T.N / 2)); T.n = T.N / 2; }
  const p = S3(x, y, h); T.g.attributes.position.array.set([p.x, p.y, p.z], T.n * 3); T.n++; T.zadnja = [x, y];
  T.g.setDrawRange(0, T.n); T.g.attributes.position.needsUpdate = true;
}
function obrisiTrag() { [TRAG.sv, TRAG.od].forEach((T) => { T.n = 0; T.zadnja = null; T.g.setDrawRange(0, 0); }); st.prljavo = true; }
/* robot i stanica za punjenje */
const RB = napraviRobotino(THREE, {});
scene.add(RB.korijen);
if (RB.stanica) { scene.add(RB.stanica.grupa); RB.stanica.postaviPozu(ST_PUN.x, ST_PUN.y, ST_PUN.phi); }
RB.tipkalo('plavo');
/* pogledi */
const POGLEDI = {
  pregled: () => ({ p: [2.4, -4.4, 4.1], t: [0, 0.1, 0.2] }),
  odozgo: () => ({ p: [0, -0.01, 7.6], t: [0, 0, 0] }),
  stanica: () => ({ p: [ST_PUN.x + 1.7, ST_PUN.y - 2.5, 1.8], t: [ST_PUN.x + 0.3, ST_PUN.y, 0.25] }),
  predaja: () => ({ p: [ST_PRED.x + 1.25, ST_PRED.yF - 2.3, 1.95], t: [ST_PRED.x - 0.1, ST_PRED.yF - 0.3, 0.65] }),
  robot: () => { const [x, y] = uSvijet(st.p, -1.5, 1.0); return { p: [x, y, 1.45], t: [st.p.x, st.p.y, 0.55] }; }
};
function pogled(ime) { const v = POGLEDI[ime](); camera.position.copy(S3(...v.p)); controls.target.copy(S3(...v.t)); controls.update(); st.prljavo = true; }

/* ================================================================== */
/* 7. Pomoćno: zapis, poruke                                           */
/* ================================================================== */
function zapis(t) { st.log.unshift('[' + kz(st.vrijeme, 1) + ' s] ' + t); if (st.log.length > 40) st.log.length = 40; }
function info(t) { $('poruka').textContent = t || ''; }

/* ================================================================== */
/* 8. Napajanje, tipkala, sigurnosni krug                              */
/* ================================================================== */
const ukljucen = () => st.napajanje === 'ukljucen';
const aktuatori = () => ukljucen() && st.sig === 'rad' && !st.estop;
function pokreni() { st.napajanje = 'pokretanje'; st.tPrijelaz = SIM.boot; zapis('Glavno tipkalo: pokretanje sustava.'); info('Sustav se pokreće — LED prsten treperi.'); }
function ugasi(razlog) {
  st.napajanje = 'gasenje'; st.tPrijelaz = SIM.gasenje; prekiniZadatak(null); st.web = false; st.hs.bg3 = false; st.hs.bg2 = false;
  zapis(razlog || 'Gašenje sustava.'); info(razlog || 'Robot se gasi.'); provjeri('ugasen');
}
function korakNapajanja(dt) {
  if (st.napajanje === 'pokretanje' || st.napajanje === 'gasenje') {
    st.tPrijelaz -= dt;
    if (st.tPrijelaz <= 0) {
      if (st.napajanje === 'pokretanje') { st.napajanje = 'ukljucen'; st.sig = 'cekaReset'; st.lokaliziran = false; st.tLok = 0; zapis('Sustav pokrenut. Sigurnosni krug čeka RESET.'); info('Sustav je pokrenut: LED prsten svijetli plavo.'); }
      else { st.napajanje = 'ugasen'; st.v = nula(); zapis('Robot ugašen.'); }
      provjeri('napajanje'); osvjeziSve();
    }
  }
  if (ukljucen() && st.sig === 'rad' && !st.lokaliziran) { st.tLok += dt; if (st.tLok >= SIM.lokalizacija) { st.lokaliziran = true; zapis('Robot je lokaliziran.'); provjeri('lokal'); } }
  /* baterija */
  if (st.napajanje !== 'ugasen') {
    const rel = Math.min(1, Math.hypot(st.v.vx, st.v.vy) / VMAX + Math.abs(st.v.w) / WMAX);
    const P = SIM.pMir + SIM.pVoznja * rel + (st.trakaSt ? 6 : 0);
    if (st.ext) st.bat = Math.min(1, st.bat + Math.max(0, P_STANICA - P) * SIM.ubrzanjeBat * dt / 3600 / E_BAT);
    else st.bat = Math.max(0, st.bat - P * SIM.ubrzanjeBat * dt / 3600 / E_BAT);
    if (st.bat <= 0 && ukljucen()) ugasi('Baterija je prazna — sustav se sam ugasio.');
  }
}
function tipkaloDolje(simulirano) { st.drzi = { t: 0, t0: simulirano ? null : performance.now(), izvrseno: false }; }   /* držanje se mjeri stvarnim vremenom */
function tipkaloGore() {
  const d = st.drzi; st.drzi = null; if (!d || d.izvrseno) return;
  if (st.napajanje === 'ukljucen') { if (st.zad) { prekiniZadatak('Kratki pritisak glavnog tipkala prekinuo je zadatak.'); } else info('Kratki pritisak prekida program ili vezu s vanjskim računalom. Za gašenje drži tipkalo oko ' + kz(T_DRZI, 0) + ' s.'); }
  else if (st.napajanje === 'ugasen') info('Drži tipkalo oko ' + kz(T_DRZI, 0) + ' s — kratki pritisak ne uključuje robota.');
}
function korakTipkala(dt) {
  const d = st.drzi; if (!d || d.izvrseno) return;
  if (d.t0 != null) d.t = (performance.now() - d.t0) / 1000; else d.t += dt;
  if (d.t >= T_DRZI) { d.izvrseno = true; if (st.napajanje === 'ugasen') pokreni(); else if (st.napajanje === 'ukljucen') ugasi('Glavno tipkalo: gašenje sustava.'); provjeri('tipkalo'); }
}
function gljiva() {
  if (!st.estop) {
    st.estop = true; st.sig = 'cekaReset'; st.v = nula(); st.m = [0, 0, 0]; st.trakaSt = 0; st.hs.bg3 = false; st.hs.bg2 = false;
    if (st.zad) prekiniZadatak(null); st.dok = null;
    zapis('NUŽNI STOP: svi aktuatori isključeni.'); info('Nužni stop: pogoni i trake su isključeni. Otpusti gljivu, pa RESET i START.');
  } else { st.estop = false; zapis('Gljiva otpuštena — potreban je RESET.'); info('Gljiva je otpuštena. Robot još ne smije voziti: pritisni RESET.'); }
  provjeri('gljiva'); osvjeziSve();
}
function tipkaReset() {
  if (!ukljucen()) { info('Robot je ugašen.'); return; }
  if (st.estop) { info('RESET ne djeluje dok je gljiva pritisnuta — najprije je otpusti.'); zapis('RESET odbijen: gljiva pritisnuta.'); provjeri('odbijeno'); return; }
  if (st.sig === 'cekaReset') { st.sig = 'cekaStart'; zapis('RESET: sigurnosni krug potvrđen.'); info('Sigurnosni krug je potvrđen — lampica RESET se ugasila. Pritisni START.'); }
  else info('Sigurnosni krug je već potvrđen.');
  provjeri('reset'); osvjeziSve();
}
function tipkaStart() {
  if (!ukljucen()) { info('Robot je ugašen.'); return; }
  if (st.estop || st.sig === 'cekaReset') { info('START ne djeluje: najprije otpusti gljivu i pritisni RESET.'); provjeri('odbijeno'); return; }
  if (st.sig === 'cekaStart') { st.sig = 'rad'; zapis('START: rad omogućen.'); info(st.lokaliziran ? 'Robot je spreman za vožnju.' : 'Rad je omogućen; robot se lokalizira.'); }
  else info('Robot je već u radu.');
  provjeri('start'); osvjeziSve();
}
function spoji() {
  if (!ukljucen()) { info('Robot nije dostupan — uključi ga glavnim tipkalom i pričekaj da se pokrene.'); return; }
  st.web = !st.web; zapis(st.web ? 'Web sučelje spojeno (' + IP + ').' : 'Web sučelje odspojeno.'); provjeri('web'); osvjeziSve();
}

/* ================================================================== */
/* 9. Ručne naredbe, klijent i nadzor veze (watchdog)                  */
/* ================================================================== */
const DRZI_SMJER = { 'vx+': [1, 0, 0], 'vx-': [-1, 0, 0], 'vy+': [0, 1, 0], 'vy-': [0, -1, 0], 'w+': [0, 0, 1], 'w-': [0, 0, -1] };
const TIPKA_SMJER = { w: 'vx+', s: 'vx-', a: 'vy+', d: 'vy-', q: 'w+', e: 'w-' };
function rucnaNaredba() {
  const R = st.rucno, aktivne = [...R.tipke]; if (R.pad) aktivne.push(R.pad);
  if (R.cekaj) { if (!aktivne.length && !R.vx && !R.vy && !R.w) R.cekaj = false; return nula(); }
  if (aktivne.length) { const c = nula(); aktivne.forEach((k) => { const s = DRZI_SMJER[k]; if (s) { c.vx += s[0] * R.brz * VMAX; c.vy += s[1] * R.brz * VMAX; c.w += s[2] * R.brz * WMAX; } }); return c; }
  return { vx: R.vx, vy: R.vy, w: R.w };
}
function rucniUnos() {   /* korisnik je dao ručnu naredbu: provjere i prekid zadatka */
  if (!ukljucen()) { info('Robot je ugašen.'); return false; }
  if (!st.web) { info('Najprije se poveži na web sučelje (gumb „Poveži”).'); return false; }
  if (!aktuatori()) { info(st.estop ? 'Nužni stop je pritisnut — vožnja nije moguća.' : 'Vožnja nije dopuštena: sigurnosni krug čeka ' + (st.sig === 'cekaReset' ? 'RESET' : 'START') + '.'); provjeri('odbijeno'); return false; }
  if (st.zad) prekiniZadatak('Ručna naredba je prekinula zadatak.');
  return true;
}
function korakKlijenta(dt) {
  st.naredba.starost += dt;
  const K0 = st.klijent;
  if (st.web && ukljucen() && (K0.salje || !K0.rest)) {
    K0.t += dt;
    const per = K0.rest ? K0.period : T_API;
    if (K0.t >= per - 1e-9) { K0.t = 0; Object.assign(st.naredba, rucnaNaredba(), { starost: 0 }); K0.seq++; }
  }
}

/* ================================================================== */
/* 10. Zadaci (automatske radnje)                                      */
/* ================================================================== */
const pozaLok = () => (st.lokaliziran ? st.p : sastavi(st.odoRef, st.odo));
function zPrema(cilj, opc = {}) {
  return { tip: 'prema', naziv: opc.naziv || ('Vožnja do: ' + (cilj.naziv || 'cilj')), polje: true, opis: '', korak() {
    const P = pozaLok(), ex = cilj.x - P.x, ey = cilj.y - P.y, d = Math.hypot(ex, ey), ef = kut(cilj.phi - P.phi);
    this.opis = 'još ' + kz(d, 2) + ' m, ' + kz(ef / D, 0) + '°';
    if (d < 0.006 && Math.abs(ef) < 0.6 * D) { this.gotov = true; return null; }
    const v = Math.min(opc.v || 0.3, 1.4 * d + 0.012), c = Math.cos(P.phi), s = Math.sin(P.phi);
    const wx = d > 0.004 ? ex / d * v : 0, wy = d > 0.004 ? ey / d * v : 0;
    return { vx: c * wx + s * wy, vy: -s * wx + c * wy, w: clamp(2.5 * ef, -0.9, 0.9) };
  } };
}
function zLanac(naziv, tvornice, opc = {}) {
  return { tip: opc.tip || 'lanac', naziv, polje: true, i: -1, sub: null, opis: '', korak(dt) {
    if (!this.sub || this.sub.gotov) {
      this.i++; if (this.i >= tvornice.length) { this.gotov = true; return null; }
      this.sub = tvornice[this.i](); this.polje = this.sub.polje !== false;
    }
    const c = this.sub.korak(dt);
    this.opis = this.sub.naziv + (this.sub.opis ? ' — ' + this.sub.opis : '');
    if (this.sub.greska) { this.greska = this.sub.greska; return null; }
    return this.sub.gotov ? nula() : c;
  } };
}
function geometrijaStanice(m) {
  const L = m.L, R = m.R, M = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2];
  const t0 = [R[0] - L[0], R[1] - L[1]], sir = Math.hypot(t0[0], t0[1]), t = [t0[0] / sir, t0[1] / sir];
  let n = [-t[1], t[0]]; if (n[0] * -M[0] + n[1] * -M[1] < 0) n = [-n[0], -n[1]];
  const F = [M[0] - n[0] * ST.marker.x, M[1] - n[1] * ST.marker.x];
  return { M, t, n, F, sirina: sir, ef: Math.atan2(-n[1], -n[0]), elat: -(F[0] * t[0] + F[1] * t[1]), d: -(F[0] * n[0] + F[1] * n[1]) };
}
function zPristajanje() {
  return { tip: 'pristajanje', naziv: 'Pristajanje laserom', polje: false, korakDok: 1, kod: 0, tBez: 0, opis: '', korak(dt) {
    st.dok = this;
    if (st.ext) { this.kod = 2; this.korakDok = 3; this.gotov = true; this.opis = 'kontakt — kôd 2'; zapis('Pristajanje: kôd 2 (gotovo), get_extpower = 1.'); provjeri('dok2'); return null; }
    const m = st.markeri;
    if (!m.L || !m.R) { this.tBez += dt; this.opis = 'markeri nisu vidljivi'; if (this.tBez > 1.0) { this.kod = 1; this.greska = 'Pristajanje: laser ne vidi oba reflektorska markera (kôd 1).'; } return nula(); }
    this.tBez = 0;
    const g = geometrijaStanice(m), dc = ST.pristajanje;
    this.g = g; this.kod = 0;
    if (this.korakDok === 1) {
      this.opis = 'zakret ' + kz(g.ef / D, 1) + '°';
      if (Math.abs(g.ef) < 1 * D) { this.korakDok = 2; return nula(); }
      return { vx: 0, vy: 0, w: clamp(2 * g.ef, -0.6, 0.6) };
    }
    if (this.korakDok === 2) {
      this.opis = 'bočni pomak ' + kz(g.elat * 1000, 0) + ' mm';
      if (Math.abs(g.elat) < 0.004) { this.korakDok = 3; return nula(); }
      const v = clamp(-1.5 * g.elat, -0.12, 0.12);
      return { vx: g.t[0] * v, vy: g.t[1] * v, w: clamp(2 * g.ef, -0.4, 0.4) };
    }
    const ost = g.d - dc;
    this.opis = 'udaljenost ' + kz(ost * 1000, 0) + ' mm';
    if (ost < -0.004) { this.kod = 1; this.greska = 'Pristajanje: kontakt nije uspostavljen (kôd 1).'; return null; }
    const vf = clamp(1.2 * ost, 0.015, 0.15), vl = clamp(-1.5 * g.elat, -0.05, 0.05);
    return { vx: -g.n[0] * vf + g.t[0] * vl, vy: -g.n[1] * vf + g.t[1] * vl, w: clamp(2 * g.ef, -0.3, 0.3) };
  } };
}
function bgValjan(i) { return st.bg[i] < IR_MAX - 1e-4; }
function zPrilaz() {
  const cilj = { x: POZE.predaja.x + SIM.prilazPomak, y: POZE.predaja.y, phi: POZE.predaja.phi + SIM.prilazKut * D, naziv: POZE.predaja.naziv };
  const pr = zPrema(cilj);
  return { tip: 'prilaz', naziv: 'Prilaz prijenosnoj stanici', polje: false, faza: 0, put: 0, opis: '', korak(dt) {
    if (this.faza === 0) { if (bgValjan(1) && st.bg[1] < 0.25) { this.gotov = true; return null; } const c = pr.korak(dt); this.opis = 'grubi prilaz (lokalizacija), ' + pr.opis; if (pr.gotov) this.faza = 1; return c || nula(); }
    if (bgValjan(1) && st.bg[1] <= 0.25) { this.gotov = true; this.opis = 'BG5 u dometu'; provjeri('prilaz'); return null; }
    this.put += 0.06 * dt; this.opis = 'bočno prema stanici';
    if (this.put > 0.5) { this.greska = 'Prilaz: BG4–BG6 ne vide stanicu — robot nije pred prijenosnom stanicom.'; return null; }
    return { vx: 0, vy: 0.06, w: 0 };
  } };
}
function zFino() {
  return { tip: 'fino', naziv: 'Fino pozicioniranje (BG4–BG6)', polje: false, faza: 'kut', x: 0, smjer: 1, prolaza: 0, opis: '', korak(dt) {
    st.fino = this;
    if (![0, 1, 2].every(bgValjan) && this.faza !== 'bocno') { this.greska = 'Fino pozicioniranje: svi senzori BG4–BG6 moraju vidjeti stanicu (domet ' + kz(IR_MAX, 2) + ' m).'; return null; }
    if (this.faza === 'kut') {
      const e = st.bg[0] - st.bg[2]; this.opis = 'kut: BG4 − BG6 = ' + kz(e * 1000, 1) + ' mm';
      if (Math.abs(e) < 0.0012) { this.faza = 'udaljenost'; return nula(); }
      return { vx: 0, vy: 0, w: clamp(-5 * e / 0.13, -0.25, 0.25) };
    }
    if (this.faza === 'udaljenost') {
      const e = st.bg[1] - SIM.bg5Cilj, ek = st.bg[0] - st.bg[2]; this.opis = 'udaljenost: BG5 = ' + kz(st.bg[1] * 1000, 0) + ' mm (cilj ' + kz(SIM.bg5Cilj * 1000, 0) + ')';
      if (Math.abs(e) < 0.0015) { this.faza = 'bocno'; return nula(); }
      return { vx: 0, vy: clamp(1.5 * e, -0.05, 0.05), w: clamp(-4 * ek / 0.13, -0.2, 0.2) };
    }
    this.opis = 'bočno: traži se optička veza (handshake)';
    if (st.hs.vidi) { this.gotov = true; this.opis = 'poravnato'; zapis('Fino pozicioniranje gotovo.'); provjeri('fino'); return null; }
    this.x += this.smjer * 0.02 * dt;
    if (this.x > 0.045) { this.smjer = -1; this.prolaza++; } else if (this.x < -0.045) { this.smjer = 1; this.prolaza++; }
    if (this.prolaza > 3) { this.greska = 'Fino pozicioniranje: handshake nije pronađen.'; return null; }
    return { vx: this.smjer * 0.02, vy: 0, w: 0 };
  } };
}
function zPredaj(van) {
  return { tip: van ? 'predaj' : 'preuzmi', naziv: van ? 'Predaja nosača' : 'Preuzimanje nosača', polje: false, faza: 'hs', t: 0, opis: '', korak(dt) {
    if (this.faza === 'hs') {
      if (van && st.nosac.gdje !== 'robot') { this.greska = 'Predaja: u prihvatu nema nosača (BG1 = 0).'; return null; }
      if (!van && st.nosac.gdje !== 'stanica') { this.greska = 'Preuzimanje: na stanici nema nosača.'; return null; }
      if (!st.hs.vidi) { this.greska = 'Handshake: nema optičke veze sa stanicom — najprije fino pozicioniranje.'; st.hs.bg3 = false; return null; }
      st.hs.bg3 = true; this.t += dt; this.opis = 'BG3 šalje, čeka se odgovor stanice na BG2';
      if (this.t >= SIM.hs.odgoda) { st.hs.bg2 = true; zapis('Handshake: stanica je odgovorila (BG2 = 1).'); provjeri('hs'); this.faza = 'trake'; this.pocni(); }
      return nula();
    }
    const n = st.nosac, rel = relativno(st.p, { x: ST_PRED.x, y: ST_PRED.yF + ST_PRED.stop, phi: 0 });
    st.trakaSt = van ? 1 : -1; const ds = SIM.traka * dt; st.traka += ds * st.trakaSt;
    if (van) {
      n.s = Math.min(n.s + ds, rel.y); n.gdje = 'prijenos'; this.opis = 'trake: nosač ide na stanicu';
      if (n.s >= rel.y - 1e-6) { n.gdje = 'stanica'; const [x, y] = uSvijet(st.p, TX, n.s); n.svijet = { x, y, psi: st.p.phi + PI / 2 }; this.kraj('Nosač je na stanici (BG1 = 0).'); provjeri('predano'); }
    } else {
      n.s = Math.max(0, n.s - ds); n.gdje = 'prijenos'; this.opis = 'trake: nosač ulazi u prihvat';
      if (n.s <= 0) { n.gdje = 'robot'; n.s = 0; n.svijet = null; this.kraj('Nosač je u prihvatu (BG1 = 1).'); provjeri('vraceno'); }
    }
    st.prljavo = true; return nula();
  }, pocni() { if (!van) { const r = relativno(st.p, { x: st.nosac.svijet.x, y: st.nosac.svijet.y, phi: 0 }); st.nosac.s = r.y; } },
  kraj(t) { st.trakaSt = 0; st.hs.bg3 = false; st.hs.bg2 = false; this.gotov = true; zapis(t); } };
}
function zCrta() {
  return { tip: 'crta', naziv: 'Slijeđenje crte', polje: true, sz: null, prijedeno: 0, tIzg: 0, opis: '', korak(dt) {
    const L = st.opt[0], R = st.opt[1]; let w = 0;
    if (L && !R) w = st.crta.g; else if (R && !L) w = -st.crta.g;
    const s = parametarCrte(st.p.x, st.p.y);
    if (this.sz != null) { let ds = s - this.sz; if (ds > OPSEG / 2) ds -= OPSEG; if (ds < -OPSEG / 2) ds += OPSEG; this.prijedeno += ds; }
    this.sz = s;
    if (Math.abs(this.prijedeno) >= OPSEG) { this.prijedeno -= Math.sign(this.prijedeno) * OPSEG; st.krugovi++; zapis('Slijeđenje crte: krug ' + st.krugovi + '.'); provjeri('krug'); }
    const [mx, my] = uSvijet(st.p, OPT[0].x, 0);
    if (udaljenostCrta(mx, my) > 0.08) { this.tIzg += dt; if (this.tIzg > 0.4) { this.greska = 'Robot je izgubio crtu — povećaj ω pri skretanju ili smanji brzinu.'; return null; } } else this.tIzg = 0;
    this.opis = 'prijeđeno ' + kz(Math.abs(this.prijedeno), 2) + ' / ' + kz(OPSEG, 2) + ' m · krugova ' + st.krugovi;
    return { vx: st.crta.v, vy: 0, w };
  } };
}
function zKvadrat() {
  return { tip: 'kvadrat', naziv: 'Kvadrat 1 × 1 m (po odometriji)', polje: true, i: 0, ref: null, opis: '', korak() {
    const O = st.odo;
    if (this.i >= 8) { this.gotov = true; return null; }
    if (!this.ref) this.ref = { x: O.x, y: O.y, phi: O.phi };
    if (this.i % 2 === 0) {
      const ost = 1 - Math.hypot(O.x - this.ref.x, O.y - this.ref.y); this.opis = 'stranica ' + (this.i / 2 + 1) + '/4, još ' + kz(ost, 2) + ' m';
      if (ost < 0.002) { this.i++; this.ref = null; return nula(); }
      return { vx: clamp(1.5 * ost + 0.02, 0, 0.25), vy: 0, w: 0 };
    }
    const ost = PI / 2 - kut(O.phi - this.ref.phi); this.opis = 'okret ' + ((this.i + 1) / 2) + '/4, još ' + kz(ost / D, 1) + '°';
    if (ost < 0.15 * D) { this.i++; this.ref = null; return nula(); }
    return { vx: 0, vy: 0, w: clamp(2 * ost + 0.04, 0, 0.8) };
  } };
}
function zOkreni(stupnjeva) {
  let cilj = null;
  return { tip: 'okreni', naziv: 'Okreni ' + kz(stupnjeva, 0) + '°', polje: true, opis: '', korak() {
    const P = pozaLok(); if (cilj == null) cilj = P.phi + stupnjeva * D;
    const e = kut(cilj - P.phi); this.opis = 'još ' + kz(e / D, 1) + '°';
    if (Math.abs(e) < 0.5 * D) { this.gotov = true; return null; }
    return { vx: 0, vy: 0, w: clamp(2.5 * e, -0.9, 0.9) };
  } };
}
function zCekaj(s) { let t = 0; return { tip: 'cekaj', naziv: 'Čekaj ' + kz(s, 1) + ' s', polje: true, opis: '', korak(dt) { t += dt; this.opis = kz(Math.max(0, s - t), 1) + ' s'; if (t >= s) this.gotov = true; return nula(); } }; }
const UVJETI = { slobodno: ['Put ispred slobodan (IR1 > 0,25 m)', () => st.ir[0] > 0.25], bg1: ['BG1 = 1 (nosač u prihvatu)', () => bg1()], bg0: ['BG1 = 0 (prihvat prazan)', () => !bg1()] };
function zCekajSenzor(u) { return { tip: 'cekajSenzor', naziv: 'Čekaj: ' + UVJETI[u][0], polje: true, opis: 'čekam', korak() { if (UVJETI[u][1]()) this.gotov = true; return nula(); } }; }
const BLOKOVI = {
  vozi: { naziv: 'Vozi do', param: 'poza', zadano: 'sredina', zad: (p) => zPrema(POZE[p]) },
  okreni: { naziv: 'Okreni', param: 'broj', jed: '°', min: -360, max: 360, zadano: 90, zad: (p) => zOkreni(p) },
  cekajSenzor: { naziv: 'Čekaj senzor', param: 'uvjet', zadano: 'bg1', zad: (p) => zCekajSenzor(p) },
  cekaj: { naziv: 'Čekaj', param: 'broj', jed: 's', min: 0, max: 30, zadano: 1, zad: (p) => zCekaj(p) },
  pristani: { naziv: 'Pristani (punjenje)', zad: () => zLanac('Pristani', [() => zPrema(POZE.punjenje), zPristajanje]) },
  predaj: { naziv: 'Predaj nosač', zad: () => zLanac('Predaj nosač', [zPrilaz, zFino, () => zPredaj(true)]) },
  preuzmi: { naziv: 'Preuzmi nosač', zad: () => zLanac('Preuzmi nosač', [zPrilaz, zFino, () => zPredaj(false)]) }
};
function zProgram() {
  const B = st.prog.blokovi.map((b) => b);
  return { tip: 'program', naziv: 'Program', polje: true, i: -1, sub: null, opis: '', korak(dt) {
    if (!this.sub || this.sub.gotov) {
      this.i++; st.prog.pc = this.i;
      if (this.i >= B.length) { this.gotov = true; return null; }
      const b = B[this.i]; this.sub = BLOKOVI[b.tip].zad(b.p); this.polje = this.sub.polje !== false;
      zapis('Program: blok ' + (this.i + 1) + ' — ' + this.sub.naziv + '.');
      if (st.tab === 'program') osvjeziProgram();
    }
    const c = this.sub.korak(dt); this.polje = this.sub.polje !== false;
    this.opis = 'blok ' + (this.i + 1) + '/' + B.length + ': ' + this.sub.naziv + (this.sub.opis ? ' — ' + this.sub.opis : '');
    if (this.sub.greska) { this.greska = this.sub.greska; return null; }
    return this.sub.gotov ? nula() : c;
  } };
}
function pokreniZadatak(z) {
  if (!ukljucen()) { info('Robot je ugašen.'); return false; }
  if (!aktuatori()) { info(st.estop ? 'Nužni stop je pritisnut.' : 'Sigurnosni krug čeka ' + (st.sig === 'cekaReset' ? 'RESET' : 'START') + '.'); provjeri('odbijeno'); return false; }
  if (!st.lokaliziran && /prema|program|prilaz/.test(z.tip)) { info('Robot nije lokaliziran — pričekaj da se crveni segment ugasi.'); return false; }
  if (st.zad) prekiniZadatak(null);
  st.zad = z; st.dok = z.tip === 'pristajanje' ? z : null; st.fino = null; if (st.greska && st.greska !== 'bumper') st.greska = null;
  st.rucno.vx = st.rucno.vy = st.rucno.w = 0; postaviKlizace();
  zapis('Zadatak: ' + z.naziv + '.'); info(z.naziv + ' — pokrenuto.');
  provjeri('zadatak', z.tip); osvjeziSve(); return true;
}
function prekiniZadatak(razlog) {
  const z = st.zad; if (!z) return;
  st.zad = null; st.trakaSt = 0; st.hs.bg3 = false; st.hs.bg2 = false;
  if (st.nosac.gdje === 'prijenos') { /* nosač ostaje gdje je stao: na robotu ako je pretežno na robotu */ st.nosac.gdje = st.nosac.s <= L_PRIH / 2 ? 'robot' : 'stanica'; if (st.nosac.gdje === 'stanica') { const [x, y] = uSvijet(st.p, TX, st.nosac.s); st.nosac.svijet = { x, y, psi: st.p.phi + PI / 2 }; } else st.nosac.s = clamp(st.nosac.s, -BG1_ZONA, BG1_ZONA); }
  if (z.tip === 'program') { st.prog.pc = -1; provjeri('programKraj', { ok: false }); }
  if (razlog) { zapis(razlog); info(razlog); }
  osvjeziSve();
}
function korakZadatka(dt) {
  const z = st.zad; const c = z.korak(dt);
  if (z.greska) {
    const g = z.greska; st.zad = null; st.trakaSt = 0; st.greska = 'zadatak'; st.tGreska = 3;
    if (z.tip === 'program') { st.prog.pc = -1; st.prog.poruka = 'Program prekinut: ' + g; provjeri('programKraj', { ok: false }); }
    zapis(g); info(g); osvjeziSve(); return nula();
  }
  if (z.gotov) {
    st.zad = null;
    if (z.tip === 'kvadrat') krajKvadrata();
    if (z.tip === 'program') { st.prog.pc = -1; st.prog.poruka = 'Program je završio.'; zapis('Program je završio.'); provjeri('programKraj', { ok: true }); }
    else if (z.tip !== 'pristajanje') info(z.naziv + ' — gotovo.');
    osvjeziSve(); return nula();
  }
  return c || nula();
}
function krajKvadrata() {
  const r = relativno(st.odoRef, st.p), O = st.odo;
  const g = Math.hypot(r.x - O.x, r.y - O.y), gk = kut(r.phi - O.phi);
  st.kvadrati.push({ ziro: st.ziro, kliz: st.kliz, g, gk });
  zapis('Kvadrat gotov: pogreška položaja ' + kz(g * 1000, 0) + ' mm, kuta ' + kz(gk / D, 1) + '°.');
  info('Kvadrat je gotov. Odometrija misli da je robot na početku; stvarna pogreška položaja je ' + kz(g * 1000, 0) + ' mm, kuta ' + kz(gk / D, 1) + '°.');
  provjeri('kvadrat', { ziro: st.ziro });
}
function resetOdometrije() { st.odo = new K.Odometrija({ kvantizirano: true }); st.odoRef = { ...st.p }; TRAG.od.n = 0; TRAG.od.zadnja = null; TRAG.od.g.setDrawRange(0, 0); zapis('Odometrija resetirana.'); provjeri('odoReset'); }

/* ================================================================== */
/* 11. Senzori                                                        */
/* ================================================================== */
const bg1 = () => (st.nosac.gdje === 'robot' || st.nosac.gdje === 'prijenos') && Math.abs(st.nosac.s) <= BG1_ZONA + 1e-6;
function korakSenzora(dt) {
  const P = st.p;
  st.tIR += dt;
  if (st.tIR >= 0.05) {
    st.tIR = 0;
    st.ir = K.senzoriIR(P, PREP.ir);
    if (CPMR) st.bg = BG_X.map((bx) => { const [ox, oy] = uSvijet(P, bx, BG_Y); return Math.min(IR_MAX, K.zraka2D(ox, oy, P.phi + PI / 2, PREP.bg, IR_MAX)); });
  }
  /* optički senzori */
  OPT.forEach((o, i) => { const [x, y] = uSvijet(P, o.x, o.y); st.opt[i] = udaljenostCrta(x, y) <= SIM.crta.sirina / 2; if (st.opt[i]) st.optBio[i] = true; });
  /* handshake: robot poravnat s prijenosnom stanicom */
  if (CPMR) {
    const lat = P.x - (ST_PRED.x - TX), d = ST_PRED.yF - (P.y + BG_Y);
    st.hs.vidi = Math.abs(kut(P.phi)) < SIM.hs.kut * D && Math.abs(lat) < SIM.hs.tol && d > 0 && d < HS_RAZMAK;
  }
  /* laser */
  st.tSken += dt;
  if (LZ && st.tSken >= T_LASER) { st.tSken = 0; obradiSken(K.laserSken(P, PREP.laser, N_LASER)); }
  /* kontakt stanice za punjenje */
  const r = relativno({ x: ST_PUN.x, y: ST_PUN.y, phi: ST_PUN.phi }, P);
  const ext = Math.abs(r.x - ST.pristajanje) < 0.004 && Math.abs(r.y) < 0.015 && Math.abs(kut(r.phi - PI)) < 3 * D && ukljucen();
  if (ext !== st.ext) { st.ext = ext; if (ext) { st.bioPristao = true; st.batDok = st.bat; zapis('get_extpower = 1: robot je na stanici za punjenje.'); } else { zapis('get_extpower = 0: robot je otišao sa stanice.'); } provjeri('ext'); }
}
function obradiSken(sk) {
  st.sken = sk; const P = st.p, n = sk.dometi.length, L = MJERE.laser;
  const inten = new Array(n).fill(0), refl = { lijevi: [], desni: [] };
  let uPolju = false, najbl = Infinity, smjer = null;
  const kartaPoza = st.mapiranje ? sastavi(st.odoRef, st.odo) : null;
  for (let i = 0; i < n; i++) {
    const d = sk.dometi[i]; if (d >= sk.domet - 1e-6) continue;
    const a = sk.kutovi[i], ca = Math.cos(a), sa = Math.sin(a);
    const lx = L.x + d * ca, ly = L.y + d * sa;                       /* točka u KS robota */
    const wa = P.phi + a, hx = sk.izvor[0] + d * Math.cos(wa), hy = sk.izvor[1] + d * Math.sin(wa);
    inten[i] = 1;
    for (const m of MARKERI) if (Math.hypot(hx - m.c[0], hy - m.c[1]) < m.r + 0.004) { inten[i] = 9; refl[m.reflektor].push([lx + m.r * ca, ly + m.r * sa]); }
    if (Math.abs(a) <= SIM.polje.kut * D && d <= SIM.polje.r) { uPolju = true; if (d < najbl) { najbl = d; const q = Math.hypot(lx, ly) || 1; smjer = [lx / q, ly / q]; } }
    if (kartaPoza && st.karta.size < 40000) { const [mx, my] = uSvijet(kartaPoza, lx, ly); const kx = Math.round(mx / SIM.karta), ky = Math.round(my / SIM.karta); st.karta.set(kx + ',' + ky, inten[i] > 1 ? 2 : 1); }
  }
  const sred = (A) => (A.length ? [A.reduce((s, p) => s + p[0], 0) / A.length, A.reduce((s, p) => s + p[1], 0) / A.length] : null);
  st.markeri = { L: sred(refl.lijevi), R: sred(refl.desni) };
  st.intenz = inten;
  const bio = st.uPolju; st.uPolju = uPolju; st.poljeSmjer = smjer;
  if (uPolju && !bio && st.polje) { zapis('Prepreka u zaštitnom polju lasera.'); }
  if (st.markeri.L && st.markeri.R) provjeri('markeri');
  if (uPolju && st.polje) provjeri('polje');
  if (st.zrakeLaser) RB.zrakeLaser(sk.dometi);
  st.prljavo = true;
}

/* ================================================================== */
/* 12. Fizika (korak 10 ms)                                            */
/* ================================================================== */
function integriraj(P, vx, vy, w, dt) {
  const th = w * dt; let dx, dy;
  if (Math.abs(th) < 1e-9) { dx = vx * dt; dy = vy * dt; } else { const s = Math.sin(th), c = Math.cos(th); dx = (vx * s + vy * (c - 1)) / w; dy = (vx * (1 - c) + vy * s) / w; }
  const c = Math.cos(P.phi), s = Math.sin(P.phi);
  return { x: P.x + dx * c - dy * s, y: P.y + dx * s + dy * c, phi: kut(P.phi + th) };
}
const sudar = (P) => K.sudarKrug(P, PREP.nisko, { r: R_OSN }) || K.sudarKrug(P, PREP.visoko, { r: R_NAD });
const dodir = (P) => K.sudarKrug(P, PREP.nisko, { r: R_OSN + 0.002 }) || K.sudarKrug(P, PREP.visoko, { r: R_NAD + 0.002 });
function zastite(c, auto) {
  let { vx, vy, w } = c; st.irStopAkt = false;
  const polje = st.polje && (!auto || (st.zad && st.zad.polje !== false));
  if (polje && st.uPolju && st.poljeSmjer && vx * st.poljeSmjer[0] + vy * st.poljeSmjer[1] > 1e-4) { vx = 0; vy = 0; }
  if (st.irZastita && !auto) {
    const v = Math.hypot(vx, vy);
    if (v > 1e-4) for (let i = 0; i < 9; i++) {
      const a = IR_KUT[i] * D;
      if ((vx * Math.cos(a) + vy * Math.sin(a)) / v > 0.5 && st.ir[i] < SIM.irZastita) { vx = 0; vy = 0; st.irStopAkt = true; if (!st.irStopBio) { st.irStopBio = true; zapis('IR zaštita: zaustavljanje ispred prepreke.'); info('IR zaštita je zaustavila robota ' + kz(st.ir[i], 2) + ' m ispred prepreke.'); provjeri('irStop'); } break; }
    }
  }
  if (!st.irStopAkt && Math.hypot(c.vx, c.vy) < 1e-4) st.irStopBio = false;
  return { vx, vy, w };
}
function korak(dt) {
  st.vrijeme += dt;
  korakTipkala(dt); korakNapajanja(dt);
  if (st.osoba.on) korakOsobe(dt);
  korakKlijenta(dt);
  if (st.greska === 'zadatak' || st.greska === 'crta') { st.tGreska -= dt; if (st.tGreska <= 0) st.greska = null; }
  /* naredba */
  let c = nula(), auto = false;
  const smije = aktuatori();
  if (!smije && st.zad) prekiniZadatak(null);
  if (smije && st.zad) { c = korakZadatka(dt); auto = true; }
  else if (smije && st.web) {
    st.wd = st.naredba.starost > T_REST;
    if (!st.wd) c = { vx: st.naredba.vx, vy: st.naredba.vy, w: st.naredba.w };
  }
  if (smije) c = zastite(c, auto);
  const o = K.ogranici(c.vx, c.vy, c.w, { vMax: VMAX, wMax: WMAX }); st.ogr = o.faktor;
  if (!smije) st.v = nula();
  else {
    const dv = SIM.aLin * dt, dw = SIM.aKut * dt, ex = o.vx - st.v.vx, ey = o.vy - st.v.vy, n = Math.hypot(ex, ey);
    if (n > dv) { st.v.vx += ex / n * dv; st.v.vy += ey / n * dv; } else { st.v.vx = o.vx; st.v.vy = o.vy; }
    st.v.w += clamp(o.w - st.v.w, -dw, dw);
  }
  st.mZad = smije ? K.inverzna(o.vx, o.vy, o.w) : [0, 0, 0];
  st.m = K.inverzna(st.v.vx, st.v.vy, st.v.w);
  /* stvarno gibanje (s proklizavanjem) */
  let vx = st.v.vx, vy = st.v.vy, w = st.v.w;
  if (st.kliz) { vx *= 1 - SIM.klizV; vy *= 1 - SIM.klizV * 1.5; w *= 1 - SIM.klizW; }
  const P0 = st.p, gibanje = Math.abs(vx) + Math.abs(vy) + Math.abs(w) > 1e-7;
  let blok = false;
  if (gibanje) {
    let P1 = integriraj(P0, vx, vy, w, dt);
    if (sudar(P1)) {
      blok = true; let a = 0, b = 1;
      for (let k = 0; k < 8; k++) { const t = (a + b) / 2; if (sudar(integriraj(P0, vx, vy, w, dt * t))) b = t; else a = t; }
      P1 = integriraj(P0, vx, vy, w, dt * a);
    }
    st.mj.put += Math.hypot(P1.x - P0.x, P1.y - P0.y); st.mj.rot += Math.abs(kut(P1.phi - P0.phi));
    st.vS = { vx: vx, vy: vy, w: w };
    st.p = P1; st.prljavo = true;
  } else st.vS = nula();
  /* odbojnik */
  const kontakt = dodir(st.p);
  if (kontakt && !st.bumper) {
    st.bumper = true; zapis('Bumper: dodir s preprekom.');
    if (st.bumperStop) {
      st.v = nula(); st.greska = 'bumper';
      if (st.zad) prekiniZadatak('Bumper: dodir s preprekom prekinuo je zadatak.'); else info('Bumper: robot je dodirnuo prepreku i stao. Otpusti tipke i odvezi se.');
      st.rucno.vx = st.rucno.vy = st.rucno.w = 0; st.rucno.cekaj = true; st.naredba.vx = st.naredba.vy = st.naredba.w = 0; postaviKlizace();
    }
    provjeri('bumper');
  } else if (!kontakt && st.bumper) { st.bumper = false; if (st.greska === 'bumper') st.greska = null; zapis('Bumper otpušten.'); provjeri('odmak'); }
  if (blok && !st.bumperStop) st.v = nula();
  /* odometrija i žiroskop */
  const gyro = w + (st.m.some((x) => Math.abs(x) > 1) ? SIM.driftZiro : 0);   /* u mirovanju se pomak žiroskopa kompenzira */
  st.odo.korak(dt, st.m, st.ziro ? gyro : undefined);
  /* kotači i valjci */
  const bv = K.brzineValjaka(vx, vy, w), rv = MJERE.valjci.promjer / 2;
  for (let i = 0; i < 3; i++) { st.kotaci[i] += K.kutKotaca(st.m[i], dt); st.valjci[i] += bv[i] / rv * dt; }
  /* akumulatori za provjere */
  const v = st.v, brz = Math.hypot(v.vx, v.vy);
  if (v.vx > 0.03 && Math.abs(v.vy) < 0.004 && Math.abs(v.w) < 0.01) st.mj.vx += v.vx * dt;
  if (v.vy > 0.03 && Math.abs(v.vx) < 0.004 && Math.abs(v.w) < 0.01) st.mj.vy += v.vy * dt;
  if (Math.abs(v.w) > 0.1 && brz < 0.004) st.mj.w += Math.abs(v.w) * dt;
  if (brz > 0.03 && Math.abs(Math.atan2(v.vy, v.vx) - 60 * D) < 4 * D && Math.abs(v.w) < 0.01) st.mj.d60 += brz * dt;
  if (brz < 0.003 && Math.abs(v.w) < 0.01) st.mj.mirT += dt; else st.mj.mirT = 0;
  korakSenzora(dt);
  if (st.trag) { dodajTrag(TRAG.sv, st.p.x, st.p.y, 0.004); const Po = sastavi(st.odoRef, st.odo); dodajTrag(TRAG.od, Po.x, Po.y, 0.006); }
  st.tProv = (st.tProv || 0) + dt; if (st.tProv >= 0.1) { st.tProv = 0; provjeri('tick'); }
  postaviSvjetla();
}
function korakOsobe(dt) {
  const o = st.osoba, nx = o.x + o.smjer * SIM.osoba * dt;
  if (Math.hypot(nx - st.p.x, o.y - st.p.y) < OSOBA_PUT.r + R_NAD + 0.05) return;     /* osoba čeka ako je robot na putu */
  o.x = nx; if (o.x > OSOBA_PUT.x1) { o.x = OSOBA_PUT.x1; o.smjer = -1; } if (o.x < OSOBA_PUT.x0) { o.x = OSOBA_PUT.x0; o.smjer = 1; }
  slozenePrepreke(); st.prljavo = true;
}
function izracunajSvjetla() {
  if (!ukljucen()) return { crvena: 0, narancasta: 0, zelena: 0 };
  const zauzet = !!st.zad || Math.hypot(st.v.vx, st.v.vy) > 0.01 || Math.abs(st.v.w) > 0.02 || st.trakaSt !== 0;
  return {
    crvena: st.greska ? 1 : (!st.lokaliziran ? 'treperi' : 0),
    narancasta: (st.estop || st.sig === 'cekaReset') ? 'treperi' : (st.polje && st.uPolju ? 1 : 0),
    zelena: st.sig === 'rad' ? (zauzet ? 'treperi' : 1) : 0
  };
}
function postaviSvjetla() {
  const s = izracunajSvjetla(), kljuc = JSON.stringify(s) + st.napajanje + st.sig + st.estop;
  if (kljuc === st.svjetlaKljuc) return; st.svjetlaKljuc = kljuc; st.svjetla = s;
  RB.signalniStup(s);
  RB.lampicaReset(ukljucen() && (st.estop || st.sig === 'cekaReset'));
  RB.tipkalo(st.napajanje === 'ukljucen' ? 'plavo' : st.napajanje === 'ugasen' ? 'ugaseno' : 'treperi');
  st.prljavo = true;
}
const svijetli = (s, t) => s === 1 || (s === 'treperi' && (t % 1) < 0.5);

/* ================================================================== */
/* 13. Provjere koraka                                                 */
/* ================================================================== */
function trenutni() { return niz ? niz.koraci[korakNiza] : null; }
function snimiRef() { Object.assign(st.mj, { vx: 0, vy: 0, w: 0, d60: 0, put: 0, rot: 0 }); st.refBat = st.bat; st.refKarta = st.karta.size; st.bioBumper = false; }
function provjeri(e, pod) {
  const k = trenutni(); if (!k) return;
  if (e === 'bumper') st.bioBumper = true;
  let ok = false;
  switch (k.k) {
    case 'ukljuci': ok = st.napajanje === 'pokretanje' || ukljucen(); break;
    case 'boot': ok = ukljucen(); break;
    case 'web': ok = st.web && ukljucen(); break;
    case 'reset': ok = ukljucen() && !st.estop && (st.sig === 'cekaStart' || st.sig === 'rad'); break;
    case 'start': ok = ukljucen() && st.sig === 'rad' && !st.estop; break;
    case 'lokal': ok = ukljucen() && st.sig === 'rad' && st.lokaliziran; break;
    case 'vx': ok = st.mj.vx >= 0.3; break;
    case 'vy': ok = st.mj.vy >= 0.3; break;
    case 'w': ok = st.mj.w >= PI / 2; break;
    case 'd60': ok = st.mj.d60 >= 0.2; break;
    case 'kvadrat1': ok = e === 'kvadrat' && !pod.ziro; break;
    case 'ziro': ok = e === 'odoReset' && st.ziro; break;
    case 'kvadrat2': ok = e === 'kvadrat' && pod.ziro; break;
    case 'zid': ok = st.mj.mirT >= 0.5 && Math.abs(st.ir[0] - 0.15) <= 0.02 && aktuatori(); break;
    case 'irStop': ok = e === 'irStop'; break;
    case 'bumper': ok = e === 'bumper'; break;
    case 'odmak': ok = !st.bumper && !st.greska && st.mj.put > 0.02; break;
    case 'zrake': ok = st.zrakeLaser; break;
    case 'okret': ok = st.mapiranje && st.mj.rot >= 2 * PI - 0.05; break;
    case 'karta': ok = st.mapiranje && st.kartaMod === 'karta' && st.mj.put >= 1.5 && st.karta.size > st.refKarta + 60; break;
    case 'markeri': ok = !!(st.markeri.L && st.markeri.R); break;
    case 'polje': ok = st.polje && st.uPolju && st.osoba.on; break;
    case 'senzor': ok = (st.opt[0] || st.opt[1]) && !st.zad; break;
    case 'auto': ok = !!(st.zad && st.zad.tip === 'crta'); break;
    case 'krug': ok = e === 'krug'; break;
    case 'dok': ok = !!(st.zad && st.zad.tip === 'pristajanje') || st.ext; break;
    case 'kod2': ok = st.ext && st.dok && st.dok.kod === 2; break;
    case 'puni': ok = st.ext && st.batDok != null && st.bat - st.batDok >= 0.02; break;
    case 'odvoz': ok = !st.ext && st.bioPristao; break;
    case 'prilaz': ok = bgValjan(1) && st.bg[1] < 0.3 && Math.abs(kut(st.p.phi)) < 20 * D; break;
    case 'fino': ok = e === 'fino' || (st.hs.vidi && Math.abs(st.bg[1] - SIM.bg5Cilj) < 0.004 && !st.zad); break;
    case 'hs': ok = e === 'hs' || st.hs.bg2 || st.nosac.gdje === 'stanica'; break;
    case 'predano': ok = st.nosac.gdje === 'stanica'; break;
    case 'vraceno': ok = st.nosac.gdje === 'robot' && bg1(); break;
    case 'gljiva': ok = st.estop; break;
    case 'pokusaj': ok = e === 'odbijeno'; break;
    case 'otpusti': ok = !st.estop; break;
    case 'sastavi': { const B = st.prog.blokovi.map((b) => b.tip), i = B.indexOf('predaj'); ok = i >= 0 && B.indexOf('pristani', i + 1) > i; break; }
    case 'pokreni': ok = e === 'programKraj' && pod && pod.ok && st.ext && st.nosac.gdje === 'stanica'; if (e === 'programKraj' && pod && pod.ok && !ok) info('Program je završio, ali nosač nije na stanici ili robot nije na punjenju — provjeri redoslijed blokova.'); break;
    case 'dalje': ok = e === 'dalje'; break;
    case 'unosOk': case 'izborOk': ok = e === k.k; break;
    case 'unos': ok = e === 'unosOk'; break;
    case 'izbor': ok = e === 'izborOk'; break;
    default: ok = false;
  }
  if (ok) {
    korakNiza++;
    if (korakNiza >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); }
    crtajKorak();
    if (e !== 'tick') setTimeout(() => provjeri('tick'), 0);
  }
}

/* ================================================================== */
/* 14. Web sučelje: kartice                                            */
/* ================================================================== */
const TABOVI = [['voznja', 'Vožnja'], ['senzori', 'Senzori'], ['odometrija', 'Odometrija'], ['crta', 'Crta'], ['punjenje', 'Punjenje'], ...(CPMR ? [['nosac', 'Nosač']] : []), ['rest', 'REST'], ['program', 'Program']];
const led = (k) => '<span class="wb-led" data-led="' + k + '"></span>';
const izlaz = (k) => '<output data-v="' + k + '"></output>';
function klizac(polje, oznaka, min, max, korak, jed) {
  return '<label class="wb-kl"><span>' + oznaka + '</span><input type="range" data-polje="' + polje + '" min="' + min + '" max="' + max + '" step="' + korak + '" value="0" aria-label="' + esc(oznaka) + '"><output data-v="' + polje + '"></output><small>' + jed + '</small></label>';
}
function kvacica(polje, tekst) { return '<label class="wb-kv"><input type="checkbox" data-polje="' + polje + '"> ' + tekst + '</label>'; }
function tabVoznja() {
  const t = (s, z, l, a) => '<button type="button" class="pad-t" data-drzi="' + s + '" aria-label="' + a + '">' + z + '<small>' + l + '</small></button>';
  return '<div class="wb-g2"><div class="wb-panel"><h3>Ručna vožnja</h3><div class="pad">'
    + t('w+', '↶', 'Q', 'Okreni ulijevo (Q)') + t('vx+', '↑', 'W', 'Naprijed (W)') + t('w-', '↷', 'E', 'Okreni udesno (E)')
    + t('vy+', '←', 'A', 'Lijevo (A)') + '<button type="button" class="pad-t stop" data-akcija="stop" aria-label="Stop (X)">■<small>X</small></button>' + t('vy-', '→', 'D', 'Desno (D)')
    + '<span></span>' + t('vx-', '↓', 'S', 'Natrag (S)') + '<span></span></div>'
    + '<label class="wb-kl"><span>Brzina tipki</span><input type="range" data-polje="brzTipki" min="10" max="100" step="5" value="50" aria-label="Brzina tipki u postocima najveće brzine"><output data-v="brzTipki"></output><small>%</small></label>'
    + '<p class="wb-mala">Drži tipku. Tipkovnica: W/S naprijed/natrag, A/D lijevo/desno, Q/E okret, X stop. Granice: v ≤ ' + kz(VMAX, 2) + ' m/s, ω ≤ ' + kz(WMAX, 2) + ' rad/s, motor ≤ ' + NMAX + ' 1/min.</p></div>'
    + '<div class="wb-panel"><h3>Omnidrive (zadane brzine)</h3>'
    + klizac('vx', 'vx', -VMAX, VMAX, 0.01, 'm/s') + klizac('vy', 'vy', -VMAX, VMAX, 0.01, 'm/s') + klizac('w', 'ω', -WMAX, WMAX, 0.05, 'rad/s')
    + '<div class="wb-red"><button type="button" class="wb-btn crv" data-akcija="stop">Stop</button><span class="wb-mala" data-v="ogranicenje"></span></div>'
    + kvacica('irZastita', 'IR zaštita: stani ' + kz(SIM.irZastita, 2) + ' m ispred prepreke') + kvacica('polje', 'Zaštitno polje lasera (' + kz(SIM.polje.r, 2) + ' m)') + kvacica('bumperStop', 'Zaustavljanje na Bumper')
    + '</div></div>';
}
function tabSenzori() {
  let ir = '';
  for (let i = 0; i < 9; i++) ir += '<div class="ir-r"><span>IR' + (i + 1) + ' <small>' + kz(IR_KUT[i], 0) + '°</small></span><b class="ir-b"><i data-bar="ir' + i + '"></i></b><output data-v="ir' + i + '"></output><output data-v="irU' + i + '"></output></div>';
  return '<div class="wb-g2"><div class="wb-panel"><h3>Senzori udaljenosti (' + esc(SENZORI.ir.tip) + ')</h3><div class="ir-g"><div class="ir-r ir-h"><span>senzor</span><span>udaljenost</span><span>m</span><span>V</span></div>' + ir + '</div><p class="wb-mala">Domet ' + kz(IR_MIN, 2) + '–' + kz(IR_MAX, 2) + ' m; ' + kz(IR_MAX, 2) + ' m znači „nema prepreke u dometu”. REST: <code>/data/distancesensorarray</code>.</p></div>'
    + '<div class="wb-panel"><h3>Odbojnik i ulazi</h3><div class="io-l"><div>' + led('bumper') + ' Bumper <small>(' + esc(SENZORI.odbojnik.tip) + ')</small></div><div>' + led('di1') + ' DI1 (NO) — optički lijevi</div><div>' + led('di2') + ' DI2 (NC) — optički desni</div><div>' + led('ext') + ' get_extpower (punjenje)</div></div>'
    + (CPMR ? '<h3>Prihvat nosača</h3><div class="io-l"><div>' + led('bg1') + ' BG1 — nosač u prihvatu</div><div>' + led('bg2') + ' BG2 — handshake prijemnik</div><div>' + led('bg3') + ' BG3 — handshake odašiljač</div>' + [0, 1, 2].map((i) => '<div><span class="bgv">' + esc(BG_OZN[i]) + '</span> ' + izlaz('bg' + (i + 4)) + '</div>').join('') + '</div>' : '')
    + '<p class="wb-mala">Zrake senzora uključi ispod 3D prikaza („Zrake IR”).</p></div></div>';
}
function tabOdometrija() {
  const red = (n, k) => '<tr><th>' + n + '</th><td data-v="o' + k + '"></td><td data-v="s' + k + '"></td><td data-v="g' + k + '"></td></tr>';
  return '<div class="wb-g2"><div class="wb-panel"><h3>Odometrija i stvarna poza</h3><table class="wb-t"><tr><th></th><th>odometrija</th><th>stvarno</th><th>pogreška</th></tr>' + red('x (m)', 'x') + red('y (m)', 'y') + red('φ (°)', 'f') + '</table>'
    + '<p class="wb-mala">Poza od zadnjeg reseta odometrije. REST: <code>GET /data/odometry</code>.</p>'
    + '<div class="wb-red"><button type="button" class="wb-btn" data-akcija="resetOdo">Resetiraj odometriju</button><button type="button" class="wb-btn pl" data-akcija="kvadrat">Vozi kvadrat 1 × 1 m</button></div>'
    + kvacica('kliz', 'Proklizavanje kotača (simulacija)') + kvacica('ziro', 'Žiroskop za kut odometrije (' + esc(ZIRO) + ')')
    + '<ul class="wb-pop" data-v="kvadrati"></ul></div>'
    + '<div class="wb-panel"><h3>Enkoderi</h3><table class="wb-t"><tr><th></th><th>m (1/min)</th><th>inkrementi</th></tr>' + [1, 2, 3].map((i) => '<tr><th>E' + i + '</th><td data-v="em' + i + '"></td><td data-v="ei' + i + '"></td></tr>').join('') + '</table>'
    + '<p class="wb-mala">' + POGON.inkPoOkr + ' inkremenata po okretaju motora (×4 od ' + POGON.impulsaPoOkr + ' impulsa), ' + POGON.inkPoOkrKotaca + ' po okretaju kotača. Brzina se računa iz razlike stanja brojila u vremenu.</p></div></div>';
}
function tabCrta() {
  return '<div class="wb-g2"><div class="wb-panel"><h3>Optički senzori</h3><div class="crta-s"><div><span class="wb-led vel" data-led="optL"></span><b>lijevi</b><small>DI1 (NO) = <output data-v="di1"></output></small></div><div><span class="wb-led vel" data-led="optR"></span><b>desni</b><small>DI2 (NC) = <output data-v="di2"></output></small></div></div>'
    + '<p class="wb-mala">' + esc(SENZORI.opticki.tip) + ', ' + esc(SENZORI.opticki.svjetlo) + ' svjetlo; svjetlovodi na dnu ' + kz(OPT[0].x * 100, 0) + ' cm ispred središta, razmak ' + kz(OPT[0].y * 200, 0) + ' cm.</p></div>'
    + '<div class="wb-panel"><h3>Slijeđenje crte</h3>' + klizac('crtaV', 'brzina', 0.05, 0.35, 0.01, 'm/s') + klizac('crtaG', 'ω skretanja', 0.2, 2.0, 0.05, 'rad/s')
    + '<div class="wb-red"><button type="button" class="wb-btn zel" data-akcija="crta" data-v="crtaGumb">Slijeđenje crte</button></div><p class="wb-mala" data-v="crtaStatus"></p></div></div>';
}
function tabPunjenje() {
  return '<div class="wb-g2"><div class="wb-panel"><h3>Napajanje</h3><div class="bat-v"><b><i data-bar="bat"></i></b><output data-v="bat"></output></div><table class="wb-t">'
    + '<tr><th>izvor</th><td data-v="izvor"></td></tr><tr><th>get_extpower</th><td data-v="extp"></td></tr><tr><th>potrošnja</th><td data-v="snaga"></td></tr><tr><th>baterije</th><td>' + BAT_N + ' × ' + esc(podatak('baterija1', 'Napon')) + '</td></tr></table>'
    + '<p class="wb-mala">Vrijeme baterije u simulatoru teče ' + SIM.ubrzanjeBat + '× brže.</p></div>'
    + '<div class="wb-panel"><h3>Pristajanje (laser)</h3><table class="wb-t"><tr><th>markeri</th><td data-v="markeri"></td></tr><tr><th>korak</th><td data-v="dokKorak"></td></tr><tr><th>povratni kôd</th><td data-v="dokKod"></td></tr></table>'
    + '<ol class="dok-k"><li data-dk="1">zakreni se prema stanici</li><li data-dk="2">bočno na normalu stanice</li><li data-dk="3">ravno do kontakta</li></ol>'
    + '<div class="wb-red"><button type="button" class="wb-btn zel" data-akcija="dock">Pristani (Dock)</button><button type="button" class="wb-btn" data-akcija="prekini">Prekini</button></div><p class="wb-mala" data-v="dokOpis"></p></div></div>';
}
function tabNosac() {
  return '<div class="wb-g2"><div class="wb-panel"><h3>Senzori prihvata</h3><div class="io-l"><div>' + led('bg1') + ' BG1 — nosač u prihvatu</div><div>' + led('hsv') + ' optička veza poravnata</div><div>' + led('bg3') + ' BG3 — odašiljač (robot spreman)</div><div>' + led('bg2') + ' BG2 — prijemnik (stanica spremna)</div>'
    + [0, 1, 2].map((i) => '<div><span class="bgv">' + esc(BG_OZN[i]) + '</span> ' + izlaz('bg' + (i + 4)) + '</div>').join('') + '</div><p class="wb-mala">Stanica: <output data-v="stanicaNosac"></output></p></div>'
    + '<div class="wb-panel"><h3>Predaja nosača</h3><div class="wb-red"><button type="button" class="wb-btn pl" data-akcija="prilaz">Prilaz</button><button type="button" class="wb-btn pl" data-akcija="fino">Fino pozicioniranje</button></div>'
    + '<div class="wb-red"><button type="button" class="wb-btn zel" data-akcija="predaj">Predaj nosač</button><button type="button" class="wb-btn zel" data-akcija="preuzmi">Preuzmi nosač</button><button type="button" class="wb-btn" data-akcija="prekini">Prekini</button></div><p class="wb-mala" data-v="nosacOpis"></p></div></div>';
}
function tabRest() {
  return '<div class="wb-panel"><h3>Vanjski klijent (REST)</h3>' + kvacica('rest', 'Upravljaj kao vanjski program: naredbe šalje klijent zahtjevom PUT')
    + '<label class="wb-kl"><span>period slanja</span><input type="range" data-polje="period" min="50" max="500" step="10" value="100" aria-label="Period slanja naredbi u milisekundama"><output data-v="period"></output><small>ms</small></label>'
    + '<div class="wb-red"><button type="button" class="wb-btn" data-akcija="salje" data-v="saljeGumb">Klijent šalje</button><span class="wb-mala" data-v="wdStatus"></span></div>'
    + '<p class="wb-mala">Nadzor veze: bez nove naredbe unutar ' + Math.round(T_REST * 1000) + ' ms robot staje. Web sučelje šalje svakih ' + Math.round(T_API * 1000) + ' ms. Vozi tipkama ili klizačima u kartici Vožnja.</p></div>'
    + '<div class="wb-g2"><div class="wb-panel"><h3>PUT /data/omnidrive</h3><pre class="wb-json" data-v="jOmni"></pre><h3>GET /data/odometry</h3><pre class="wb-json" data-v="jOdo"></pre><h3>GET /data/bumper</h3><pre class="wb-json" data-v="jBump"></pre></div>'
    + '<div class="wb-panel"><h3>GET /data/distancesensorarray</h3><pre class="wb-json" data-v="jIr"></pre><h3>GET /data/scan0 (skraćeno)</h3><pre class="wb-json" data-v="jScan"></pre></div></div>';
}
function tabProgram() {
  const opc = Object.entries(BLOKOVI).map(([k, b]) => '<option value="' + k + '">' + esc(b.naziv) + '</option>').join('');
  return '<div class="wb-panel"><h3>Program (slijed blokova)</h3><div class="wb-red"><select data-polje="pgNovi" aria-label="Vrsta bloka">' + opc + '</select><button type="button" class="wb-btn" data-akcija="pgDodaj">Dodaj blok</button><button type="button" class="wb-btn" data-akcija="pgPrimjer">Primjer</button><button type="button" class="wb-btn" data-akcija="pgObrisi">Obriši sve</button></div>'
    + '<ol class="pg-lista" id="pg-lista"></ol>'
    + '<div class="wb-red"><button type="button" class="wb-btn zel" data-akcija="pgPokreni">▶ Pokreni</button><button type="button" class="wb-btn crv" data-akcija="pgStop">■ Zaustavi</button></div><p class="wb-mala" data-v="pgStatus"></p>'
    + '<p class="wb-mala">Blokovi su pojednostavljeni Robotino View/Grafcet koraci; „Vozi do” koristi naučene poze kao Fleet Manager.</p></div>';
}
function osvjeziProgram() {
  const el = $('pg-lista'); if (!el) return;
  const B = st.prog.blokovi;
  el.innerHTML = B.length ? B.map((b, i) => {
    const d = BLOKOVI[b.tip]; let par = '';
    if (d.param === 'poza') par = '<select data-polje="pgParam" data-i="' + i + '" aria-label="Cilj">' + Object.entries(POZE).map(([k, p]) => '<option value="' + k + '"' + (b.p === k ? ' selected' : '') + '>' + esc(p.naziv) + '</option>').join('') + '</select>';
    else if (d.param === 'uvjet') par = '<select data-polje="pgParam" data-i="' + i + '" aria-label="Uvjet">' + Object.entries(UVJETI).map(([k, u]) => '<option value="' + k + '"' + (b.p === k ? ' selected' : '') + '>' + esc(u[0]) + '</option>').join('') + '</select>';
    else if (d.param === 'broj') par = '<input type="number" data-polje="pgParam" data-i="' + i + '" value="' + b.p + '" min="' + d.min + '" max="' + d.max + '" aria-label="Vrijednost"> ' + d.jed;
    return '<li class="' + (st.prog.pc === i ? 'izv' : '') + '"><span class="pg-br">' + (i + 1) + '</span><b>' + esc(d.naziv) + '</b> ' + par + '<span class="pg-a"><button type="button" class="wb-btn mali" data-akcija="pgGore" data-i="' + i + '" aria-label="Pomakni gore">↑</button><button type="button" class="wb-btn mali" data-akcija="pgDolje" data-i="' + i + '" aria-label="Pomakni dolje">↓</button><button type="button" class="wb-btn mali" data-akcija="pgBrisi" data-i="' + i + '" aria-label="Obriši blok">✕</button></span></li>';
  }).join('') : '<li class="pg-prazno">Program je prazan — dodaj blokove.</li>';
}
const TAB_FN = { voznja: tabVoznja, senzori: tabSenzori, odometrija: tabOdometrija, crta: tabCrta, punjenje: tabPunjenje, nosac: tabNosac, rest: tabRest, program: tabProgram };
function crtajTabove() {
  $('tabovi').innerHTML = TABOVI.map(([k, n]) => '<button type="button" role="tab" class="wb-tab' + (st.tab === k ? ' akt' : '') + '" aria-selected="' + (st.tab === k) + '" data-tab="' + k + '">' + n + '</button>').join('');
  $('wb-tijelo').innerHTML = TAB_FN[st.tab]();
  if (st.tab === 'program') osvjeziProgram();
  postaviKlizace(); postaviKvacice(); zivoVr = {}; osvjeziZivo();
}
function postaviKlizace() {
  const t = $('wb-tijelo'), R = st.rucno;
  const set = (p, v) => { const n = t.querySelector('[data-polje="' + p + '"]'); if (n && document.activeElement !== n) n.value = v; };
  set('vx', R.vx); set('vy', R.vy); set('w', R.w); set('brzTipki', Math.round(R.brz * 100)); set('crtaV', st.crta.v); set('crtaG', st.crta.g); set('period', Math.round(st.klijent.period * 1000));
}
function postaviKvacice() {
  const t = $('wb-tijelo');
  ['irZastita', 'polje', 'bumperStop', 'kliz', 'ziro'].forEach((k) => { const n = t.querySelector('[data-polje="' + k + '"]'); if (n) n.checked = !!st[k]; });
  const r = t.querySelector('[data-polje="rest"]'); if (r) r.checked = st.klijent.rest;
}

/* ================================================================== */
/* 15. Prikaz uživo (10 Hz)                                            */
/* ================================================================== */
let zivoVr = {};
const nazivNapajanja = () => ({ ugasen: 'Ugašen', pokretanje: 'Pokreće se…', gasenje: 'Gasi se…', ukljucen: st.estop ? 'NUŽNI STOP' : st.sig === 'cekaReset' ? 'Čeka RESET' : st.sig === 'cekaStart' ? 'Čeka START' : (!st.lokaliziran ? 'Lokalizacija…' : st.zad ? 'Zauzet: ' + st.zad.naziv : 'Spreman') }[st.napajanje]);
function json(o) { return JSON.stringify(o); }
function osvjeziZivo() {
  const t = st.vrijeme, P = st.p, O = st.odo, rel = relativno(st.odoRef, P);
  const svj = st.svjetla || izracunajSvjetla();
  /* uređaj */
  const prs = $('prsten'); prs.className = 'prsten ' + (st.napajanje === 'ukljucen' ? 'plavo' : st.napajanje === 'ugasen' ? '' : (svijetli('treperi', t * 2) ? 'plavo' : 'slabo'));
  $('drzanje').style.setProperty('--p', st.drzi && !st.drzi.izvrseno ? Math.min(1, st.drzi.t / T_DRZI) : 0);
  $('tipkalo-st').textContent = { ugasen: 'ugašen', pokretanje: 'pokreće se', gasenje: 'gasi se', ukljucen: 'uključen' }[st.napajanje];
  $('b-tipkalo').setAttribute('aria-pressed', String(st.napajanje === 'ukljucen'));
  $('b-reset').classList.toggle('svijetli', ukljucen() && (st.estop || st.sig === 'cekaReset'));
  $('b-start').classList.toggle('svijetli', ukljucen() && !st.estop && st.sig === 'cekaStart');
  $('b-gljiva').setAttribute('aria-pressed', String(st.estop));
  document.querySelectorAll('#stup [data-s]').forEach((n) => n.classList.toggle('on', svijetli(svj[n.dataset.s], t)));
  const zn = [];
  ['crvena', 'narancasta', 'zelena'].forEach((k) => { if (svj[k]) zn.push(BOJA_NAZIV[k] + (svj[k] === 'treperi' ? ' treperi' : ' stalno') + ': ' + ZNACENJE[k][svj[k] === 'treperi' ? 'treperi' : 'stalno']); });
  const znT = zn.join(' · ') || (ukljucen() ? '—' : 'ugašeno'); if ($('stup-zn').textContent !== znT) $('stup-zn').textContent = znT;
  $('ind-bumper').classList.toggle('on', st.bumper); $('ind-ext').classList.toggle('on', st.ext);
  $('bat-traka').style.width = Math.round(st.bat * 100) + '%'; $('bat-traka').className = st.bat < 0.15 ? 'nisko' : ''; $('bat-t').textContent = Math.round(st.bat * 100) + ' %' + (st.ext ? ' ⚡' : '');
  /* web */
  $('wb-adr').textContent = 'http://' + (ukljucen() ? IP : '—') + '/';
  $('b-spoji').textContent = st.web ? 'Odspoji' : 'Poveži';
  const prek = $('wb-prek'); const prekVid = !st.web || !ukljucen(); prek.classList.toggle('vid', prekVid);
  if (prekVid) { const tx = !ukljucen() ? (st.napajanje === 'pokretanje' ? 'Robot se pokreće… pričekaj da LED prsten svijetli stalno.' : 'Robot je ugašen. Uključi ga glavnim tipkalom (drži oko ' + kz(T_DRZI, 0) + ' s), pa klikni „Poveži”.') : 'Robot je dostupan na ' + IP + '. Klikni „Poveži”.'; if ($('wb-prek-t').textContent !== tx) $('wb-prek-t').textContent = tx; }
  const stT = nazivNapajanja(); if ($('wb-st').textContent !== stT) $('wb-st').textContent = stT;
  $('wb-st').className = 'wb-st ' + (st.estop ? 'estop' : !ukljucen() ? 'ugasen' : st.sig !== 'rad' ? 'ceka' : st.greska ? 'greska' : 'ok');
  $('wb-omni').textContent = 'Omnidrive vx ' + kz(st.v.vx) + ' · vy ' + kz(st.v.vy) + ' m/s · ω ' + kz(st.v.w) + ' rad/s';
  $('wb-wd').textContent = st.web && st.wd && aktuatori() && !st.zad && (st.klijent.rest) ? 'Watchdog: robot stoji (nema naredbe > ' + Math.round(T_REST * 1000) + ' ms)' : '';
  /* kartice */
  const vr = {
    vx: kz(st.rucno.vx), vy: kz(st.rucno.vy), w: kz(st.rucno.w), brzTipki: String(Math.round(st.rucno.brz * 100)),
    ogranicenje: st.ogr < 0.999 ? 'zadano je skalirano ×' + kz(st.ogr, 2) + ' (granica)' : (st.irStopAkt ? 'IR zaštita: stoj' : st.polje && st.uPolju ? 'zaštitno polje: prepreka' : ''),
    ox: kz(O.x, 3), oy: kz(O.y, 3), of: kz(O.phi / D, 1), sx: kz(rel.x, 3), sy: kz(rel.y, 3), sf: kz(rel.phi / D, 1),
    gx: kz(rel.x - O.x, 3), gy: kz(rel.y - O.y, 3), gf: kz(kut(rel.phi - O.phi) / D, 1),
    em1: kz(st.m[0], 0), em2: kz(st.m[1], 0), em3: kz(st.m[2], 0), ei1: String(O.ink[0]), ei2: String(O.ink[1]), ei3: String(O.ink[2]),
    di1: st.opt[0] ? '1' : '0', di2: st.opt[1] ? '0' : '1', crtaV: kz(st.crta.v), crtaG: kz(st.crta.g),
    crtaGumb: st.zad && st.zad.tip === 'crta' ? 'Zaustavi slijeđenje' : 'Slijeđenje crte',
    crtaStatus: st.zad && st.zad.tip === 'crta' ? st.zad.opis : 'Krugova: ' + st.krugovi,
    bat: Math.round(st.bat * 100) + ' %', izvor: st.ext ? 'mrežno napajanje (stanica)' : 'baterije', extp: st.ext ? '1' : '0',
    snaga: st.napajanje === 'ugasen' ? '0 W' : Math.round(SIM.pMir + SIM.pVoznja * Math.min(1, Math.hypot(st.v.vx, st.v.vy) / VMAX + Math.abs(st.v.w) / WMAX)) + ' W' + (st.ext ? ' (iz stanice)' : ''),
    markeri: (st.markeri.L ? 1 : 0) + (st.markeri.R ? 1 : 0) + '/2' + (st.markeri.L && st.markeri.R ? ' — razmak ' + kz(geometrijaStanice(st.markeri).sirina, 3) + ' m' : ''),
    dokKorak: st.dok ? String(st.dok.korakDok) : '—', dokKod: st.dok ? String(st.dok.kod) + (st.dok.kod === 2 ? ' (gotovo)' : st.dok.kod === 1 ? ' (greška)' : ' (nastavi)') : '—',
    dokOpis: st.zad && st.zad.tip === 'pristajanje' ? st.zad.opis : (st.ext ? 'Robot je na stanici i puni se.' : ''),
    bg4: kz(st.bg[0], 3) + ' m', bg5: kz(st.bg[1], 3) + ' m', bg6: kz(st.bg[2], 3) + ' m',
    stanicaNosac: st.nosac.gdje === 'stanica' ? 'nosač je na stanici' : 'prazna',
    nosacOpis: st.zad && /prilaz|fino|predaj|preuzmi|lanac/.test(st.zad.tip) ? st.zad.naziv + ': ' + st.zad.opis : '',
    period: String(Math.round(st.klijent.period * 1000)), saljeGumb: st.klijent.salje ? 'Klijent šalje — zaustavi' : 'Klijent ne šalje — pokreni',
    wdStatus: 'zadnja naredba prije ' + Math.round(Math.min(9.99, st.naredba.starost) * 1000) + ' ms' + (st.naredba.starost > T_REST ? ' → watchdog: stop' : ''),
    jOmni: json([+st.naredba.vx.toFixed(3), +st.naredba.vy.toFixed(3), +st.naredba.w.toFixed(3)]),
    jOdo: json([+O.x.toFixed(3), +O.y.toFixed(3), +O.phi.toFixed(3), +O.vx.toFixed(3), +O.vy.toFixed(3), +O.w.toFixed(3), st.klijent.seq]),
    jBump: json({ value: st.bumper }), jIr: json(st.ir.map((d) => +d.toFixed(3))),
    jScan: st.sken ? '{"angle_min": ' + (LZ.kutMin * D).toFixed(4) + ', "angle_max": ' + (LZ.kutMax * D).toFixed(4) + ', "angle_increment": ' + (LZ.razlucivost * D).toFixed(5) + ', "ranges": [' + st.sken.dometi.slice(0, 4).map((d) => d.toFixed(3)).join(', ') + ', … ukupno ' + st.sken.dometi.length + '], "intensities": [ … ]}' : '—',
    pgStatus: st.zad && st.zad.tip === 'program' ? st.zad.opis : st.prog.poruka,
    kvadrati: st.kvadrati.slice(-4).map((q) => '<li>' + (q.ziro ? 'sa žiroskopom' : 'bez žiroskopa') + (q.kliz ? ', proklizavanje' : '') + ': pogreška ' + kz(q.g * 1000, 0) + ' mm, ' + kz(q.gk / D, 1) + '°</li>').join('')
  };
  for (let i = 0; i < 9; i++) { vr['ir' + i] = kz(st.ir[i], 3); vr['irU' + i] = kz(K.sharpNapon(st.ir[i]), 2); }
  const tb = $('wb-tijelo');
  tb.querySelectorAll('[data-v]').forEach((n) => {
    const k = n.dataset.v; const x = vr[k]; if (x === undefined) return;
    if (n.tagName === 'INPUT') return;
    if (zivoVr[k + '#' + (n.tagName)] === x) return; zivoVr[k + '#' + n.tagName] = x;
    if (k === 'kvadrati') n.innerHTML = x; else n.textContent = x;
  });
  const ledovi = { bumper: st.bumper, di1: st.opt[0], di2: !st.opt[1], ext: st.ext, bg1: bg1(), bg2: st.hs.bg2, bg3: st.hs.bg3, hsv: st.hs.vidi, optL: st.opt[0], optR: st.opt[1] };
  tb.querySelectorAll('[data-led]').forEach((n) => n.classList.toggle('on', !!ledovi[n.dataset.led]));
  for (let i = 0; i < 9; i++) { const b = tb.querySelector('[data-bar="ir' + i + '"]'); if (b) { b.style.width = Math.round(100 * (1 - (st.ir[i] - IR_MIN) / (IR_MAX - IR_MIN))) + '%'; b.classList.toggle('blizu', st.ir[i] < IR_MAX - 1e-3); } }
  const bb = tb.querySelector('[data-bar="bat"]'); if (bb) bb.style.width = Math.round(st.bat * 100) + '%';
  tb.querySelectorAll('[data-dk]').forEach((n) => n.classList.toggle('akt', !!(st.dok && +n.dataset.dk === st.dok.korakDok && (st.zad === st.dok || st.dok.kod === 2))));
  osvjeziKin();
}
let kinVr = {};
function crtajKin() {
  const sinT = MJERE.kutoviKotaca.map((x) => x);
  $('kin').innerHTML = '<p class="formula">m<sub>i</sub> = k · (−sin θ<sub>i</sub> · v<sub>x</sub> + cos θ<sub>i</sub> · v<sub>y</sub> + r<sub>b</sub> · ω)</p>'
    + '<p class="pom">k = 60 · gear / (2π · r<sub>w</sub>) = 60 · ' + POGON.gear + ' / (2π · ' + kz(POGON.rw, 3) + ' m) = <b>' + kz(KF, 1) + '</b> (1/min)/(m/s) · r<sub>b</sub> = ' + kz(POGON.rb, 3) + ' m · n<sub>max</sub> = ' + NMAX + ' 1/min</p>'
    + '<table class="kin-t"><thead><tr><th>motor</th><th>θ</th><th>m (1/min)</th><th class="kin-bar-h">od n<sub>max</sub></th><th>kotač (1/min)</th></tr></thead><tbody>'
    + [0, 1, 2].map((i) => '<tr><td>M' + (i + 1) + '</td><td>' + sinT[i] + '°</td><td class="ziv" data-k="m' + i + '"></td><td><span class="kin-bar"><i data-kb="' + i + '"></i></span></td><td data-k="k' + i + '"></td></tr>').join('')
    + '</tbody></table><div class="kin-v"><div><span>zadano (nakon granica)</span><b data-k="zad"></b></div><div><span>iz brzina motora (direktna)</span><b data-k="dir"></b></div><div><span>blok Omnidrive (Robotino View)</span><b data-k="rv"></b></div><div><span>m2 / m1 / m3 pri čistom vx</span><b>0 / −k·√3/2·vx / +k·√3/2·vx</b></div></div>';
}
function osvjeziKin() {
  const el = $('kin'); const s = (k, v) => { if (kinVr[k] === v) return; kinVr[k] = v; const n = el.querySelector('[data-k="' + k + '"]'); if (n) n.textContent = v; };
  for (let i = 0; i < 3; i++) {
    s('m' + i, kz(st.m[i], 0)); s('k' + i, kz(st.m[i] / POGON.gear, 1));
    const b = el.querySelector('[data-kb="' + i + '"]'); if (b) { const f = clamp(st.m[i] / NMAX, -1, 1); b.style.left = (f < 0 ? 50 + 50 * f : 50) + '%'; b.style.width = Math.abs(50 * f) + '%'; }
  }
  const dir = K.direktna(st.m);
  s('zad', 'vx ' + kz(st.v.vx) + ' · vy ' + kz(st.v.vy) + ' m/s · ω ' + kz(st.v.w) + ' rad/s');
  s('dir', 'vx ' + kz(dir.vx) + ' · vy ' + kz(dir.vy) + ' m/s · ω ' + kz(dir.w) + ' rad/s');
  s('rv', 'vx ' + kz(st.v.vx * 1000, 0) + ' mm/s · vy ' + kz(st.v.vy * 1000, 0) + ' mm/s · ω ' + kz(st.v.w / D, 1) + ' °/s');
}

/* ================================================================== */
/* 16. 2D karta (canvas)                                               */
/* ================================================================== */
const cv = $('karta2d'), cx2 = cv.getContext('2d');
let kartaVidljiva = true;
function boje() { const cs = getComputedStyle(document.documentElement); const g = (k, d) => (cs.getPropertyValue(k) || '').trim() || d; return { paper: g('--paper', '#fff'), ink: g('--ink', '#10394A'), body: g('--body', '#5D7C90'), rule: g('--rule', '#DCE4E8'), teal: g('--teal', '#17656E'), cyan: g('--cyan', '#2ECAD4') }; }
function crtajKartu() {
  const W = cv.width, H = cv.height, B = boje(), c = cx2;
  c.fillStyle = B.paper; c.fillRect(0, 0, W, H);
  if (st.kartaMod === 'robot') {
    const s = 105, ox = W / 2, oy = H * 0.62;
    const T = (x, y) => [ox - y * s, oy - x * s];
    c.strokeStyle = B.rule; c.lineWidth = 1;
    for (let r = 0.5; r <= 3; r += 0.5) { c.beginPath(); c.arc(ox, oy, r * s, 0, 2 * PI); c.stroke(); }
    c.fillStyle = B.body; c.font = '12px IBM Plex Sans, system-ui, sans-serif'; for (let r = 1; r <= 2; r++) c.fillText(r + ' m', ox + 4, oy - r * s - 3);
    if (st.polje) { const [lx, ly] = T(MJERE.laser.x, 0); c.fillStyle = st.uPolju ? 'rgba(240,140,0,.28)' : 'rgba(240,140,0,.12)'; c.beginPath(); c.moveTo(lx, ly); c.arc(lx, ly, SIM.polje.r * s, -PI / 2 - SIM.polje.kut * D, -PI / 2 + SIM.polje.kut * D); c.closePath(); c.fill(); }
    if (st.sken) {
      const L = MJERE.laser, sk = st.sken;
      for (let i = 0; i < sk.dometi.length; i++) {
        const d = sk.dometi[i]; if (d >= sk.domet - 1e-6) continue;
        const a = sk.kutovi[i], [x, y] = T(L.x + d * Math.cos(a), L.y + d * Math.sin(a));
        if (st.intenz && st.intenz[i] > 1) { c.fillStyle = '#f2c21a'; c.fillRect(x - 3, y - 3, 6, 6); } else { c.fillStyle = '#e0533d'; c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); }
      }
    }
    K.polozajiIR().forEach((q, i) => { const d = st.ir[i], [x0, y0] = T(q.x, q.y), [x1, y1] = T(q.x + d * Math.cos(q.kut), q.y + d * Math.sin(q.kut)); c.strokeStyle = d < IR_MAX - 1e-3 ? '#f08c00' : B.cyan; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); });
    c.strokeStyle = B.ink; c.lineWidth = 2; c.beginPath(); c.arc(ox, oy, R_OSN * s, 0, 2 * PI); c.stroke();
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox, oy - R_OSN * s); c.stroke();
    c.fillStyle = B.body; c.fillText('x robota ↑', ox + 6, 16);
  } else {
    const s = Math.min((W - 30) / (SOBA.x1 - SOBA.x0), (H - 30) / (SOBA.y1 - SOBA.y0)), ox = W / 2, oy = H / 2;
    const T = (x, y) => [ox + x * s, oy - y * s];
    c.strokeStyle = B.rule; c.lineWidth = 1; c.setLineDash([4, 4]); const [a0, b0] = T(SOBA.x0, SOBA.y1); c.strokeRect(a0, b0, (SOBA.x1 - SOBA.x0) * s, (SOBA.y1 - SOBA.y0) * s); c.setLineDash([]);
    const cel = Math.max(1.5, SIM.karta * s);
    st.karta.forEach((v, k) => { const [i, j] = k.split(',').map(Number); const [x, y] = T(i * SIM.karta, j * SIM.karta); c.fillStyle = v === 2 ? '#d9a400' : B.ink; c.fillRect(x - cel / 2, y - cel / 2, cel, cel); });
    const crt = (Pp, boja, puna) => { const [x, y] = T(Pp.x, Pp.y); c.strokeStyle = boja; c.fillStyle = boja; c.lineWidth = 2; c.beginPath(); c.arc(x, y, R_OSN * s, 0, 2 * PI); if (puna) { c.globalAlpha = 0.25; c.fill(); c.globalAlpha = 1; } c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(Pp.phi) * R_OSN * s, y - Math.sin(Pp.phi) * R_OSN * s); c.stroke(); };
    crt(st.p, B.teal, false); crt(sastavi(st.odoRef, st.odo), '#e07b00', true);
  }
  const it = st.kartaMod === 'robot' ? 'Sken oko robota: crvene točke su odrazi, žute reflektorski markeri, zrake su IR senzori (narančasto = prepreka u dometu).' + (st.polje ? ' Narančasti polukrug je zaštitno polje.' : '') : 'Karta (' + st.karta.size + ' ćelija) se gradi iz skena i poze iz odometrije' + (st.mapiranje ? ' — mapiranje je uključeno.' : ' — uključi „Mapiranje”.') + ' Narančasti krug je poza koju robot misli da ima, tirkizni stvarna; žute ćelije su reflektorski markeri.';
  if ($('karta-info').textContent !== it) $('karta-info').textContent = it;
}

/* ================================================================== */
/* 17. 3D: postavljanje svega iz stanja                                */
/* ================================================================== */
let zadnjaFazaTr = -1, pratiZadnja = null;
function postavi3D() {
  RB.postaviPozu(st.p.x, st.p.y, st.p.phi);
  RB.postaviKotace(st.kotaci, st.valjci);
  if (st.zrakeIR) RB.zrakeIR(st.ir); else RB.zrakeIR(null);
  if (!st.zrakeLaser) RB.zrakeLaser(null);
  if (CPMR) {
    RB.trake(st.traka);
    const n = st.nosac;
    if (n.gdje === 'robot' || (n.gdje === 'prijenos' && n.s <= L_PRIH / 2)) { RB.postaviNosac(n.s, true); PRED.nosac.visible = false; }
    else if (n.gdje === 'prijenos') { RB.postaviNosac(0, false); const [x, y] = uSvijet(st.p, TX, n.s); PRED.nosac.visible = true; PRED.nosac.position.copy(S3(x, y, Z_PRIH)); PRED.nosac.rotation.y = st.p.phi + PI / 2; }
    else if (n.gdje === 'stanica' && n.svijet) { RB.postaviNosac(0, false); PRED.nosac.visible = true; PRED.nosac.position.copy(S3(n.svijet.x, n.svijet.y, Z_PRIH)); PRED.nosac.rotation.y = n.svijet.psi; }
    else { RB.postaviNosac(0, false); PRED.nosac.visible = false; }
    const pomak = ((st.traka % 0.04) + 0.04) % 0.04;
    PRED.rebra.forEach((r, i) => { const y = ST_PRED.yF + 0.02 + ((i * 0.04 + (st.trakaSt || n.gdje === 'prijenos' ? pomak : 0)) % (ST_PRED.dubina - 0.04)); r.position.z = -y; });
    PRED.odasiljac.material = st.hs.bg2 ? PRED.hsOn : PRED.hsOff;
    PRED.led.material = st.hs.vidi ? PRED.ledOn : PRED.ledOff;
  }
  osobaG.visible = st.osoba.on; if (st.osoba.on) { osobaG.position.copy(S3(st.osoba.x, st.osoba.y, 0)); osobaG.rotation.y = st.osoba.smjer > 0 ? 0 : PI; }
  TRAG.sv.l.visible = st.trag; TRAG.od.l.visible = st.trag;
  if (st.prati) {
    if (pratiZadnja) { const d = S3(st.p.x - pratiZadnja.x, st.p.y - pratiZadnja.y, 0); camera.position.add(d); controls.target.add(d); }
    pratiZadnja = { x: st.p.x, y: st.p.y };
  } else pratiZadnja = null;
  RB.azuriraj(st.vrijeme);
}

/* ================================================================== */
/* 18. Nizovi: izbornik, upute, početna stanja                         */
/* ================================================================== */
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n, i) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="br">' + (i + 1) + '</span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korakNiza + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k.u) : '<b>Slobodna vožnja.</b><br>Odaberi niz u izborniku ili slobodno vozi: robot je uključen i spreman. Kartice web sučelja: Vožnja, Senzori, Odometrija, Crta, Punjenje, ' + (CPMR ? 'Nosač, ' : '') + 'REST i Program.';
  $('pomoc').textContent = k ? (k.p || '—') : 'Tipkala na robotu: glavno tipkalo (drži), RESET, START, gljiva nužnog stopa. Signalni stup pokazuje stanje; značenje je ispisano ispod njega.';
  const z = $('zadatak'); z.innerHTML = '';
  if (k && k.k === 'unos') z.innerHTML = '<div class="odg"><label>' + esc(k.unos.oznaka) + ' <input type="text" inputmode="decimal" id="unos" aria-label="Odgovor"> ' + esc(k.unos.jed) + '</label><button type="button" class="gumb tanki" id="unos-ok">Provjeri</button></div>';
  if (k && k.k === 'izbor') z.innerHTML = '<div class="odg">' + k.izbor.opcije.map((o, i) => '<button type="button" class="gumb tanki" data-izbor="' + i + '">' + esc(o) + '</button>').join('') + '</div>';
  $('dalje').hidden = !(k && k.k === 'dalje');
  $('ponovi').hidden = !(k && k.k === 'kraj');
  snimiRef(); crtajIzbornik();
}
function pocetnoStanje(o = {}) {
  prekiniZadatak(null);
  Object.assign(st, { zrakeIR: false, zrakeLaser: false, napajanje: 'ukljucen', sig: 'rad', estop: false, lokaliziran: true, web: true, drzi: null, v: nula(), m: [0, 0, 0], greska: null, bumper: false, ext: false, bioPristao: false, batDok: null, dok: null, fino: null, irZastita: false, polje: false, bumperStop: true, kliz: false, ziro: true, mapiranje: false, irStopBio: false, wd: false });
  st.p = { ...(o.poza || POZE.sredina) };
  st.bat = o.bat ?? SIM.batPocetak;
  st.rucno = { vx: 0, vy: 0, w: 0, tipke: new Set(), pad: null, brz: 0.5, cekaj: false };
  st.naredba = { ...nula(), starost: 99 }; st.klijent = { t: 0, period: T_API, salje: true, rest: false, seq: 0 };
  st.nosac = { gdje: CPMR ? 'robot' : 'nema', s: 0, svijet: null }; st.hs = { bg3: false, bg2: false, vidi: false, t: 0 }; st.trakaSt = 0;
  st.osoba.on = false; st.osoba.x = OSOBA_PUT.x0; st.osoba.smjer = 1; st.krugovi = 0; st.prog.pc = -1; st.prog.poruka = '';
  slozenePrepreke();
  st.odo = new K.Odometrija({ kvantizirano: true }); st.odoRef = { ...st.p };
  obrisiTrag(); st.tSken = T_LASER; st.tIR = 1; korakSenzora(0); st.tSken = 0;
  st.svjetlaKljuc = null; postaviSvjetla();
}
function pripremi(id) {
  const tab = (t) => { st.tab = t; };
  switch (id) {
    case 'ukljucivanje': pocetnoStanje(); Object.assign(st, { napajanje: 'ugasen', web: false, sig: 'cekaReset', lokaliziran: false }); tab('voznja'); break;
    case 'voznja': pocetnoStanje(); tab('voznja'); break;
    case 'odometrija': pocetnoStanje({ poza: { x: -0.6, y: 0.55, phi: 0 } }); st.kliz = true; st.ziro = false; tab('odometrija'); break;
    case 'senzori': pocetnoStanje({ poza: { x: 1.3, y: 0.3, phi: 0 } }); st.zrakeIR = true; tab('senzori'); break;
    case 'laser': pocetnoStanje({ poza: { x: 0.6, y: -0.4, phi: PI / 2 } }); st.zrakeLaser = false; st.karta.clear(); st.kartaMod = 'robot'; tab('senzori'); break;
    case 'crta': pocetnoStanje({ poza: { x: 0.2, y: CRTA.cy - CRTA.R, phi: 0 } }); st.crta = { v: SIM.crta.v, g: SIM.crta.g }; tab('crta'); break;
    case 'pristajanje': pocetnoStanje({ poza: { x: -1.0, y: 0.5, phi: -0.3 }, bat: 0.22 }); st.zrakeLaser = true; tab('punjenje'); break;
    case 'predaja': pocetnoStanje({ poza: { x: 0.8, y: 0.5, phi: 0.1 } }); tab('nosac'); break;
    case 'estop': pocetnoStanje({ poza: { x: 0.2, y: CRTA.cy - CRTA.R, phi: 0 } }); tab('crta'); pokreniZadatak(zCrta()); break;
    case 'program': pocetnoStanje({ poza: { ...POZE.sredina }, bat: 0.4 }); st.prog.blokovi = []; tab('program'); break;
    default: pocetnoStanje();
  }
  if (!['laser'].includes(id)) { /* karta ostaje */ }
  azurirajTraku(); crtajTabove(); postaviSvjetla(); st.prljavo = true;
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korakNiza = 0; info('');
  pripremi(id);
  const v = { pristajanje: 'stanica', predaja: 'predaja', crta: 'pregled', estop: 'pregled' }[id]; if (v) pogled(v);
  crtajKorak(); osvjeziSve();
  setTimeout(() => provjeri('tick'), 0);
}
function azurirajTraku() {
  const p = (id, v) => $(id).setAttribute('aria-pressed', String(!!v));
  p('t-ir', st.zrakeIR); p('t-laser', st.zrakeLaser); p('t-trag', st.trag); p('t-prati', st.prati); p('t-osoba', st.osoba.on);
  p('m-robot', st.kartaMod === 'robot'); p('m-karta', st.kartaMod === 'karta'); p('m-mapiraj', st.mapiranje);
}
function osvjeziSve() { postaviSvjetla(); zivoVr = {}; osvjeziZivo(); azurirajTraku(); if (st.tab === 'program') osvjeziProgram(); st.prljavo = true; }

/* ================================================================== */
/* 19. Povezivanje događaja                                            */
/* ================================================================== */
$('nizovi').addEventListener('click', (e) => { const b = e.target.closest('[data-niz]'); if (b) pokreniNiz(b.dataset.niz); });
$('izbornik').addEventListener('click', () => { niz = null; korakNiza = 0; crtajKorak(); info(''); });
$('dalje').addEventListener('click', () => provjeri('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); });
$('zadatak').addEventListener('click', (e) => {
  const k = trenutni(); if (!k) return;
  if (e.target.id === 'unos-ok') provjeriUnos();
  const b = e.target.closest('[data-izbor]');
  if (b && k.k === 'izbor') { if (+b.dataset.izbor === k.izbor.tocno) { info('Točno.'); provjeri('izborOk'); } else info('Nije točno — pogledaj pomoć i tablicu ispod signalnog stupa.'); }
});
$('zadatak').addEventListener('keydown', (e) => { if (e.target.id === 'unos' && e.key === 'Enter') provjeriUnos(); });
function provjeriUnos() {
  const k = trenutni(); if (!k || k.k !== 'unos') return;
  const v = parseFloat(String($('unos').value).replace(/\s/g, '').replace('−', '-').replace(',', '.')), t = k.unos.tocno();
  if (!Number.isFinite(v)) { info('Upiši broj.'); return; }
  const ok = k.unos.tol === 0 ? Math.round(v) === Math.round(t) : Math.abs(v - t) <= Math.abs(t) * k.unos.tol + 0.5;
  if (ok) { info('Točno: ' + kz(t, Math.abs(t) > 100 ? 0 : 2) + (k.unos.jed ? ' ' + k.unos.jed : '') + '.'); provjeri('unosOk'); } else info('Nije točno. Provjeri predznak i jedinice (pomoć).');
}
/* tipkala na robotu */
const bt = $('b-tipkalo');
bt.addEventListener('pointerdown', (e) => { e.preventDefault(); bt.setPointerCapture && bt.setPointerCapture(e.pointerId); tipkaloDolje(); });
bt.addEventListener('pointerup', () => tipkaloGore()); bt.addEventListener('pointercancel', () => tipkaloGore()); bt.addEventListener('lostpointercapture', () => { if (st.drzi) tipkaloGore(); });
bt.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); tipkaloDolje(); } });
bt.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tipkaloGore(); } });
bt.addEventListener('contextmenu', (e) => e.preventDefault());
$('b-reset').addEventListener('click', tipkaReset);
$('b-start').addEventListener('click', tipkaStart);
$('b-gljiva').addEventListener('click', gljiva);
$('b-spoji').addEventListener('click', spoji);
/* web sučelje */
$('tabovi').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; st.tab = b.dataset.tab; crtajTabove(); provjeri('tab'); });
const wb = $('wb-tijelo');
wb.addEventListener('click', (e) => { const b = e.target.closest('[data-akcija]'); if (b && !b.disabled) akcija(b.dataset.akcija, b.dataset); });
function akcija(a, d = {}) {
  const P = st.prog.blokovi, i = +d.i;
  switch (a) {
    case 'stop': st.rucno.vx = st.rucno.vy = st.rucno.w = 0; st.rucno.tipke.clear(); st.rucno.pad = null; postaviKlizace(); if (st.zad && st.zad.tip !== 'program') prekiniZadatak('Stop.'); break;
    case 'resetOdo': resetOdometrije(); break;
    case 'kvadrat': if (pokreniZadatak(zKvadrat())) resetOdometrije(); break;
    case 'crta': if (st.zad && st.zad.tip === 'crta') prekiniZadatak('Slijeđenje crte zaustavljeno.'); else { if (!(st.opt[0] || st.opt[1]) && udaljenostCrta(...uSvijet(st.p, OPT[0].x, 0)) > 0.06) { info('Robot nije na crti — postavi ga tako da je crta između senzora.'); break; } pokreniZadatak(zCrta()); } break;
    case 'dock': pokreniZadatak(zPristajanje()); break;
    case 'prekini': prekiniZadatak('Zadatak prekinut.'); break;
    case 'prilaz': pokreniZadatak(zPrilaz()); break;
    case 'fino': pokreniZadatak(zFino()); break;
    case 'predaj': pokreniZadatak(zPredaj(true)); break;
    case 'preuzmi': pokreniZadatak(zPredaj(false)); break;
    case 'salje': st.klijent.salje = !st.klijent.salje; zapis(st.klijent.salje ? 'Klijent ponovno šalje naredbe.' : 'Klijent je prestao slati naredbe.'); info(st.klijent.salje ? 'Klijent šalje naredbe.' : 'Klijent ne šalje: nakon ' + Math.round(T_REST * 1000) + ' ms bez naredbe robot staje (watchdog).'); break;
    case 'pgDodaj': { const tip = wb.querySelector('[data-polje="pgNovi"]').value, b = BLOKOVI[tip]; P.push({ tip, p: b.zadano }); osvjeziProgram(); provjeri('program'); break; }
    case 'pgPrimjer': st.prog.blokovi = [{ tip: 'predaj' }, { tip: 'vozi', p: 'sredina' }, { tip: 'pristani' }]; osvjeziProgram(); provjeri('program'); break;
    case 'pgObrisi': if (!st.zad || st.zad.tip !== 'program') { st.prog.blokovi = []; osvjeziProgram(); provjeri('program'); } break;
    case 'pgGore': if (i > 0) { [P[i - 1], P[i]] = [P[i], P[i - 1]]; osvjeziProgram(); provjeri('program'); } break;
    case 'pgDolje': if (i < P.length - 1) { [P[i + 1], P[i]] = [P[i], P[i + 1]]; osvjeziProgram(); provjeri('program'); } break;
    case 'pgBrisi': P.splice(i, 1); osvjeziProgram(); provjeri('program'); break;
    case 'pgPokreni': if (!P.length) { info('Program je prazan.'); break; } st.prog.poruka = ''; pokreniZadatak(zProgram()); break;
    case 'pgStop': if (st.zad && st.zad.tip === 'program') prekiniZadatak('Program zaustavljen.'); break;
    default: break;
  }
  osvjeziSve();
}
wb.addEventListener('input', (e) => {
  const n = e.target.closest('[data-polje]'); if (!n || n.type === 'checkbox' || n.tagName === 'SELECT') return;
  const k = n.dataset.polje, v = parseFloat(String(n.value).replace(',', '.'));
  if (k === 'vx' || k === 'vy' || k === 'w') { if (!rucniUnos()) { n.value = st.rucno[k]; return; } st.rucno[k] = v; st.rucno.cekaj = false; }
  else if (k === 'brzTipki') st.rucno.brz = v / 100;
  else if (k === 'crtaV') st.crta.v = v;
  else if (k === 'crtaG') st.crta.g = v;
  else if (k === 'period') st.klijent.period = v / 1000;
  else return;
  zivoVr = {}; osvjeziZivo();
});
wb.addEventListener('change', (e) => {
  const n = e.target.closest('[data-polje]'); if (!n) return;
  const k = n.dataset.polje;
  if (n.type === 'checkbox') {
    if (k === 'rest') { st.klijent.rest = n.checked; st.klijent.salje = true; zapis(n.checked ? 'Upravljanje preko REST-a (vanjski klijent).' : 'Upravljanje iz web sučelja.'); }
    else { st[k] = n.checked; if (k === 'ziro') zapis('Žiroskop za odometriju: ' + (n.checked ? 'uključen' : 'isključen') + '.'); if (k === 'kliz') zapis('Proklizavanje: ' + (n.checked ? 'uključeno' : 'isključeno') + '.'); }
    provjeri('postavke'); osvjeziSve(); return;
  }
  if (k === 'pgParam') { const b = st.prog.blokovi[+n.dataset.i]; if (b) { const d = BLOKOVI[b.tip]; b.p = d.param === 'broj' ? clamp(parseFloat(String(n.value).replace(',', '.')) || 0, d.min, d.max) : n.value; } provjeri('program'); }
});
/* držanje tipki smjera (pad) */
function padDolje(spec) { if (!rucniUnos()) return; st.rucno.pad = spec; st.rucno.cekaj = false; }
function padGore() { if (st.rucno.pad) { st.rucno.pad = null; wb.querySelectorAll('.drzi').forEach((b) => b.classList.remove('drzi')); } }
wb.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-drzi]'); if (!b) return; e.preventDefault(); b.classList.add('drzi'); padDolje(b.dataset.drzi); });
document.addEventListener('pointerup', padGore); document.addEventListener('pointercancel', padGore);
wb.addEventListener('keydown', (e) => { const b = e.target.closest('[data-drzi]'); if (b && (e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); b.classList.add('drzi'); padDolje(b.dataset.drzi); } });
wb.addEventListener('keyup', (e) => { const b = e.target.closest('[data-drzi]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); padGore(); } });
wb.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-drzi]')) e.preventDefault(); });
/* tipkovnica: W/A/S/D, Q/E, X */
let simVidljiv = true;
function tipkaUPolju(e) { const t = e.target; return t && (t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'checkbox' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || tipkaUPolju(e)) return;
  const k = e.key.toLowerCase();
  if (k === 'x' && simVidljiv) { akcija('stop'); e.preventDefault(); return; }
  const s = TIPKA_SMJER[k]; if (!s || !simVidljiv) return;
  e.preventDefault(); if (e.repeat || st.rucno.tipke.has(s)) return;
  if (!rucniUnos()) return;
  st.rucno.tipke.add(s); st.rucno.cekaj = st.rucno.cekaj && false;
});
document.addEventListener('keyup', (e) => { const s = TIPKA_SMJER[e.key.toLowerCase()]; if (s) st.rucno.tipke.delete(s); });
window.addEventListener('blur', () => { st.rucno.tipke.clear(); padGore(); if (st.drzi) tipkaloGore(); });
/* 3D traka i karta */
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('t-ir').addEventListener('click', () => { st.zrakeIR = !st.zrakeIR; azurirajTraku(); st.prljavo = true; });
$('t-laser').addEventListener('click', () => { st.zrakeLaser = !st.zrakeLaser; if (st.zrakeLaser && st.sken) RB.zrakeLaser(st.sken.dometi); azurirajTraku(); provjeri('zrake'); st.prljavo = true; });
$('t-trag').addEventListener('click', () => { st.trag = !st.trag; if (!st.trag) obrisiTrag(); azurirajTraku(); st.prljavo = true; });
$('t-prati').addEventListener('click', () => { st.prati = !st.prati; azurirajTraku(); st.prljavo = true; });
$('t-osoba').addEventListener('click', () => { st.osoba.on = !st.osoba.on; slozenePrepreke(); azurirajTraku(); provjeri('osoba'); st.prljavo = true; });
$('ubrzanje').addEventListener('change', () => { st.ubrzanje = +$('ubrzanje').value; });
$('m-robot').addEventListener('click', () => { st.kartaMod = 'robot'; azurirajTraku(); crtajKartu(); });
$('m-karta').addEventListener('click', () => { st.kartaMod = 'karta'; azurirajTraku(); crtajKartu(); provjeri('karta'); });
$('m-mapiraj').addEventListener('click', () => { st.mapiranje = !st.mapiranje; azurirajTraku(); provjeri('mapiranje'); });
$('m-obrisi').addEventListener('click', () => { st.karta.clear(); st.refKarta = 0; crtajKartu(); });
controls.addEventListener('change', () => { st.prljavo = true; });

/* ================================================================== */
/* 20. Tekst ispod simulatora                                          */
/* ================================================================== */
function crtajTekst() {
  $('popis-nizova').innerHTML = NIZOVI.map((n) => '<li><b>' + esc(n.naziv) + '</b> — ' + esc(n.opis) + '</li>').join('');
  $('formula-tekst').innerHTML = 'm<sub>i</sub> = k · (−sin θ<sub>i</sub> · v<sub>x</sub> + cos θ<sub>i</sub> · v<sub>y</sub> + r<sub>b</sub> · ω), &nbsp; k = 60 · gear / (2π · r<sub>w</sub>) = ' + kz(KF, 1) + ' (1/min)/(m/s)';
  $('zadano').textContent = 'gear = ' + POGON.gear + ', r_w = ' + kz(POGON.rw, 3) + ' m, r_b = ' + kz(POGON.rb, 3) + ' m, najveća brzina motora ' + NMAX + ' 1/min; granice simulatora v ≤ ' + kz(VMAX, 2) + ' m/s i ω ≤ ' + kz(WMAX, 2) + ' rad/s; nadzor REST naredbi ' + Math.round(T_REST * 1000) + ' ms; enkoder ' + POGON.inkPoOkr + ' inkremenata po okretaju motora; IR senzori ' + kz(IR_MIN, 2) + '–' + kz(IR_MAX, 2) + ' m; ' + (LZ ? LZ.naziv + ' ' + kz(LZ.kutMax - LZ.kutMin, 0) + '°, do ' + kz(LZ.domet, 1) + ' m, ' + LZ.f + ' Hz' : 'bez laserskog skenera') + '. Laboratorij ' + kz(SOBA.x1 - SOBA.x0, 1) + ' × ' + kz(SOBA.y1 - SOBA.y0, 1) + ' m; stanica za punjenje ' + Math.round(ST.sirina * 1000) + ' × ' + Math.round(ST.dubina * 1000) + ' × ' + Math.round(ST.visina * 1000) + ' mm.';
  $('pojednostavljenja').innerHTML = POJEDNOSTAVLJENJA.map((t) => '<li>' + esc(t) + '</li>').join('');
  $('pp-uvod').textContent = TEKST_PRETPOSTAVKE;
  const re = /rw|rb|brzin|Numeracija|IR senzor|Krivulja|snopa|laser|skener|kontakt|marker|prihvat|Smjer traka|Optički|Žiroskop|BG|Baterija|Nosač izratka|tornja/i;
  $('pretpostavke').innerHTML = pretpostavke().filter((p) => re.test(p.sto)).map((p) => '<li><b>' + esc(p.sto) + (p.vrijednost ? ': ' + esc(p.vrijednost) : '') + '</b>' + (p.vrsta === 'sukob' ? ' (sukob izvora)' : '') + ' — ' + esc(p.napomena) + '</li>').join('');
  const IZ = ['OR-REST', 'RV-OMNI', 'API-OMNI', 'HABR', 'IP4-OMNI', 'IP4-ENC', 'IP4-DIST', 'IP4-BUMP', 'IP4-GYRO', 'IP4-OPT', 'IP4-LASER', 'ACRO', 'IP4-PSW', 'IP3-WEBCTL', 'OR-DOCK', 'FAC-248', 'CPMR-C', 'CPMR-SCH23', 'IP4-HAND'];
  $('izvori').innerHTML = IZ.filter((k) => IZVORI[k]).map((k) => { let host = ''; try { host = new URL(IZVORI[k]).hostname; } catch (e) { host = IZVORI[k]; } return '<li>[' + esc(k) + '] <a href="' + esc(IZVORI[k]) + '" rel="noopener" target="_blank">' + esc(host) + '</a></li>'; }).join('');
}

/* ================================================================== */
/* 21. Petlja: fizika 100 Hz, prikaz na zahtjev                        */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); st.prljavo = true; }
new ResizeObserver(velicina).observe(scenaEl);
let scenaVidljiva = true;
if (typeof IntersectionObserver !== 'undefined') {
  new IntersectionObserver((z) => { z.forEach((x) => { if (x.target === scenaEl) scenaVidljiva = x.isIntersecting; if (x.target === cv) kartaVidljiva = x.isIntersecting; }); st.prljavo = true; }).observe(scenaEl);
  new IntersectionObserver((z) => { kartaVidljiva = z[0].isIntersecting; }).observe(cv);
  new IntersectionObserver((z) => { simVidljiv = z[0].isIntersecting; }).observe(document.querySelector('.rb-mreza'));
}
let rafId = 0, zadnje = performance.now(), akum = 0, zadnjiZivo = 0, zadnjaKarta = 0;
function treperiNesto() { const s = st.svjetla || {}; return st.napajanje === 'pokretanje' || st.napajanje === 'gasenje' || Object.values(s).some((x) => x === 'treperi') || (ukljucen() && (st.estop || st.sig === 'cekaReset')); }
function iscrtaj() { postavi3D(); controls.update(); renderer.render(scene, camera); st.prljavo = false; }
function petlja(t) {
  rafId = 0;
  const dtR = Math.min(0.5, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  akum += dtR * st.ubrzanje;
  let n = 0; while (akum >= SIM.dt && n < 120) { korak(SIM.dt); akum -= SIM.dt; n++; }
  if (n >= 120) akum = 0;
  if (t - zadnjiZivo > 100) { zadnjiZivo = t; osvjeziZivo(); }
  if (kartaVidljiva && t - zadnjaKarta > 120) { zadnjaKarta = t; crtajKartu(); }
  const ctrl = controls.update();
  const faza = treperiNesto() ? Math.floor(st.vrijeme * 2) : -1;
  if (scenaVidljiva && (st.prljavo || ctrl || faza !== zadnjaFazaTr)) { zadnjaFazaTr = faza; iscrtaj(); }
  rafId = requestAnimationFrame(petlja);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; st.rucno.tipke.clear(); } else if (!rafId) { zadnje = performance.now(); rafId = requestAnimationFrame(petlja); } });

/* pokretanje */
slozenePrepreke();
pocetnoStanje();
crtajTekst(); crtajKin(); crtajIzbornik(); crtajKorak(); crtajTabove(); azurirajTraku(); velicina(); pogled('pregled');
const uc = $('ucitavanje'); if (uc) uc.remove();
iscrtaj();
rafId = requestAnimationFrame(petlja);

/* testna kuka */
window.__sim = {
  st, NIZOVI, POZE, ST_PUN, ST_PRED, POZA_DOK, SIM, model: RB, camera, controls, renderer, K,
  get niz() { return niz; }, get korak() { return korakNiza; }, get vidljivo() { return { simVidljiv, scenaVidljiva, kartaVidljiva }; },
  pokreniNiz, provjeri, akcija, gljiva, tipkaReset, tipkaStart, spoji, pokreniZadatak, prekiniZadatak, resetOdometrije, crtajTabove, crtajKartu, iscrtaj,
  zadaci: { zPrema, zPristajanje, zPrilaz, zFino, zPredaj, zCrta, zKvadrat, zProgram },
  simuliraj(sek, dt = SIM.dt) { const n = Math.round(sek / dt); for (let i = 0; i < n; i++) korak(dt); osvjeziZivo(); postavi3D(); },
  simulirajDok(uvjet, maxSek = 60) { const n = Math.round(maxSek / SIM.dt); for (let i = 0; i < n; i++) { korak(SIM.dt); if (uvjet()) { osvjeziZivo(); return true; } } osvjeziZivo(); return false; },
  naredba(vx, vy, w) { if (!rucniUnos()) return false; Object.assign(st.rucno, { vx, vy, w, cekaj: false }); postaviKlizace(); return true; },
  drziTipkalo(sek) { tipkaloDolje(true); const n = Math.round(sek / SIM.dt); for (let i = 0; i < n; i++) korak(SIM.dt); tipkaloGore(); osvjeziZivo(); }
};
