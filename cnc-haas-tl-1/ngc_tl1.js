/* FORTRONIQ · Haas TL-1 — simulator upravljanja NGC za tokarilicu (zaslon, tipkovnica privjeska, stroj u 3D), nizovi s koracima.
   Model, zaslon i tekst su naši; nazivi tipki kao na upravljanju Haas (engleski). Ponašanje prema Haas Lathe Operator's Manualu (javno).
   X se programira i prikazuje kao promjer.  © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PROGRAMI_TL } from './programi_tl1.js?v=02';
import { pretvori, objasni } from './tl1_gkod.js?v=02';
import { napraviStrojTL1, postaviOkolinu, GEO } from './stroj_tl1.js?v=02';
import { ALATI_TL, napraviObradak, ukloniObradak, rezi, uMaterijalu, urezNavoj, provjeriOdrez, osvjezi, polumjerNa, celo } from './tokarenje.js?v=02';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dro = (v) => { const x = Math.abs(v) < 0.00005 ? 0 : v; return (x < 0 ? '-' : '') + Math.abs(x).toFixed(3); };
const kr = (v, d = 2) => v.toFixed(d).replace('.', ',');
const OSI = ['X', 'Z'];

/* ================================================================== */
/* 1. Podaci stroja                                                     */
/* ================================================================== */
const HOD = GEO.HOD, R0 = GEO.R0, ZT0 = GEO.ZT0;
const BRZI = GEO.BRZI, F_REF = 4000, S_MAX = GEO.S_MAX;
const INC = [0.001, 0.01, 0.1, 1], INC_TIPKA = { '.0001': 0.001, '.001': 0.01, '.01': 0.1, '.1': 1 };
const JOG_V = { 0.001: 2.54, 0.01: 25.4, 0.1: 254, 1: 2540 };
const ALATI = ALATI_TL;
const ALAT_T = (t) => ALATI[t] || ALATI[1];
const VJEZBA = { D: 40, L: 130, drz: 30 };
const CELJ_R = (D) => D / 2;                                                 /* polumjer čeljusti = polumjer pripremka */
const PROG_O03005 = ['G18 G21 G40 G99', 'T0101', 'G97 S800 M03', 'G00 X45. Z2.', 'M30'];
const REF_X = 20;                                                            /* referentna ploha za niz „nultočka” (x od čela stezne glave) */

/* ================================================================== */
/* 2. Nizovi i koraci: [uputa, pomoć, kod događaja]                     */
/* ================================================================== */
const NIZOVI = [
  { id: 'ukljucivanje', grupa: 'Postavljanje stroja', naziv: 'Uključivanje', koraci: [
    ['Uključi glavnu sklopku na električnom ormaru (straga).', 'Gumb „Glavna sklopka” ispod tipkovnice ili ručica sklopke na ormaru u 3D prikazu (pogled „Straga”). Na TL-1 glavna sklopka je na vratima ormara: I / OFF.', 'sklopka'],
    ['Pritisni POWER ON na privjesku i pričekaj da se upravljanje pokrene.', 'Zeleni gumb POWER ON gore lijevo na privjesku. Upravljanje se pokreće nekoliko sekundi; zatim prikazuje alarme 102 SERVOS OFF i 107 EMERGENCY OFF.', 'powerOn'],
    ['Otpusti EMERGENCY STOP (zakreni gljivu).', 'Crvena gljiva sa žutim prstenom na privjesku. Dok je pritisnuta, pogoni osi i vreteno su bez napajanja (alarm 107).', 'estop'],
    ['Pritisni RESET — alarmi se brišu i pogoni se uključuju.', 'RESET briše alarme koji više nisu aktivni. Na zaslonu ostaje poruka da osi nisu referencirane.', 'reset'],
    ['Pritisni POWER UP: osi odlaze u nultočku stroja (ZERO RETURN) — X prva (od obratka), zatim Z.', 'POWER UP = referenciranje svih osi nakon uključivanja. Isto radi ZERO RET → ALL. Prati položaj u stupcu MACHINE: na kraju X 0.000, Z 0.000 (krajnji +X i +Z položaj).', 'powerUp'],
    ['Kraj niza „Uključivanje”. Vrati se u izbornik ili odaberi sljedeći niz.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'rucno', grupa: 'Postavljanje stroja', naziv: 'Ručno gibanje', koraci: [
    ['Pritisni HANDLE JOG — način ručnog gibanja.', 'Tipka HANDLE JOG u stupcu MODE. Zaslon pokazuje odabranu os i korak kotača.', 'jogNacin'],
    ['Odaberi os X za ručni kotač: kratko pritisni tipku +X (ili tipku X na tipkovnici).', 'Tipka za gibanje osi ujedno bira os za ručni kotač. Odabrana os piše ispod kotača. Na tokarilici +X je od osi vretena (prema rukovatelju), −X prema osi.', 'osX'],
    ['Odaberi korak .1/100. — jedan klik kotača pomakne os za 1 mm (na osi X: 1 mm u promjeru).', 'Četiri tipke uz HANDLE JOG: .0001 = 0,001 mm, .001 = 0,01 mm, .01 = 0,1 mm, .1 = 1 mm po kliku. Drugi broj je brzina za tipke gibanja.', 'inc1'],
    ['Okreni ručni kotač i pomakni os X za najmanje 10 mm (10 klikova).', 'Gumbi − / + uz kotač, kotačić miša iznad kotača ili tipke ← → (fokus na upravljanju).', 'kotac10'],
    ['Drži tipku −Z i pomakni suport prema steznoj glavi za najmanje 20 mm.', 'Tipke za gibanje gibaju os dok ih držiš, brzinom prema odabranom koraku (.1/100. = 2540 mm/min). −Z je prema steznoj glavi — pazi na pripremak.', 'tipkeZ'],
    ['Drži RAPID zajedno s tipkom gibanja (klikni RAPID pa drži tipku) — os ide brzim hodom.', 'RAPID uključuje brzi hod (11,4 m/min) za tipke gibanja. U simulatoru RAPID se uključi klikom i vrijedi za sljedeće držanje tipke.', 'rapid'],
    ['Dovedi alat u položaj X −300.000, Z −400.000 u koordinatama stroja (stupac MACHINE).', 'Kombiniraj korake 1, 0,1 i 0,01 mm. Koordinate stroja na Haasu su negativne: nultočka je u krajnjem +X, +Z položaju.', 'polozaj'],
    ['Kraj niza „Ručno gibanje”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'alat', grupa: 'Postavljanje stroja', naziv: 'Alat i korekcije', koraci: [
    ['U nosaču je T1 (vanjski nož). Pripremak Ø40 viri 100 mm iz stezne glave. Korekcija alata u Z mjeri se dodirom čela pripremka (papir) i tipkom Z FACE MESUR; korekcija u X dodirom vanjskog promjera i tipkom X DIA MESUR uz upis izmjerenog promjera.', 'Pritisni „Dalje”. Stanje dodira prikazano je ispod tipkovnice.', 'dalje'],
    ['Pritisni OFFSET i otvori karticu TOOL.', 'Tipka OFFSET u skupini DISPLAY; ponovni pritisak mijenja karticu TOOL / WORK.', 'offsetTool'],
    ['Stavi kursor na alat T1.', 'Tipke ▲ ▼ pomiču kursor po alatima.', 'kursorT1'],
    ['HANDLE JOG: dovedi vrh noža ispred čela (X unutar promjera pripremka) i približavaj se čelu (−Z) dok papir ne zapne. Vreteno stoji.', 'Korak 0,1 mm dok je daleko, 0,01 mm blizu čela. Ako pretjeraš, alat udari u pripremak — niz se ponavlja.', 'dodirZ1'],
    ['Pritisni Z FACE MESUR: u Z GEOMETRY alata T1 upiše se trenutačni Z stroja.', 'Vrijednost je negativna (npr. −7xx.xxx): toliko je suport od nultočke stroja kad vrh alata dodiruje čelo. Nakon toga WORK Z = 0 na čelu.', 'izmjeriZ1'],
    ['Odmakni alat (+Z) i dovedi ga uz vanjski promjer; približavaj se promjeru (−X) dok papir ne zapne.', 'Alat je iznad obratka (X veći od Ø40). Korak 0,1 pa 0,01 mm.', 'dodirX1'],
    ['Pritisni X DIA MESUR, zatim upiši promjer na kojem alat dodiruje — 40. — i pritisni ENTER.', 'X DIA MESUR zapamti X stroja; upisani promjer (ovdje poznati promjer pripremka, inače izmjeren mikrometrom nakon probnog reza) daje X GEOMETRY = X stroja − promjer.', 'izmjeriX1'],
    ['Ručna izmjena alata: MDI → upiši T0202 → ENTER → CYCLE START. Program stane s porukom za izmjenu.', 'TL-1 s brzoizmjenjivim nosačem nema revolver: nova T-riječ zaustavi program i čeka. Najprije odmakni alat (+X, +Z).', 'mdiT2'],
    ['Otvori klizna vrata, pritisni „Ručna izmjena alata” i stavi T2 (odrezivač) u nosač, zatvori vrata.', 'Gumbi „Klizna vrata” i „Ručna izmjena alata” ispod tipkovnice. Vreteno mora stajati.', 'zamijeni2'],
    ['Pritisni CYCLE START — MDI blok se dovrši.', 'Nakon izmjene CYCLE START nastavlja od T0202.', 'nastavi2'],
    ['Kursor na T2, dovedi T2 do dodira s čelom i pritisni Z FACE MESUR.', 'T2 je drukčije duljine od T1, pa će Z GEOMETRY biti drukčiji.', 'izmjeriZ2'],
    ['Kraj niza „Alat i korekcije”. Program zove korekcije s T0101 / T0202.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'nultocka', grupa: 'Postavljanje stroja', naziv: 'Nultočka obratka', koraci: [
    ['Korekcije alata izmjerene su na referentnoj plohi (ne na pripremku). Novi pripremak viri drukčije, pa se nultočka obratka u Z postavlja kao pomak G54 Z: dodir čela i PART ZERO SET. X ostaje 0 — nultočka X je uvijek os vretena.', 'Pritisni „Dalje”.', 'dalje'],
    ['Pritisni OFFSET i otvori karticu WORK.', 'OFFSET, zatim ▶ ili ponovni OFFSET za karticu WORK.', 'offsetWork'],
    ['Stavi kursor na G54, stupac Z.', 'Tipke ▲ ▼ ◀ ▶.', 'kursor54Z'],
    ['HANDLE JOG: dovedi vrh noža ispred čela i približavaj se (−Z) dok papir ne zapne.', 'Korak 0,1 mm, blizu čela 0,01 mm. Vreteno stoji.', 'dodirZ'],
    ['Pritisni PART ZERO SET: u G54 Z upiše se položaj (Z stroja − korekcija alata).', 'PART ZERO SET upisuje položaj za os na kojoj je kursor. Stupac WORK sada pokazuje Z 0.000 na čelu.', 'pzsZ'],
    ['Kraj niza „Nultočka obratka”. Program s G54 radi od čela novog pripremka.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'mdi', grupa: 'Program', naziv: 'MDI', koraci: [
    ['Pritisni MDI — ručni unos blokova.', 'U načinu MDI blokovi se upisuju u privremeni program i izvode s CYCLE START.', 'mdiNacin'],
    ['Upiši G97 S800 M03 i pritisni ENTER, zatim CYCLE START — vreteno se vrti 800 o/min.', 'G97 = stalni broj okretaja. Blok se upisuje tipkama ili tipkovnicom računala (fokus na upravljanju). ENTER prebaci blok iz retka INPUT u MDI program. Vrata moraju biti zatvorena.', 'mdiS'],
    ['Upiši G00 X42. Z2. i ENTER, zatim CYCLE START — alat ide ispred pripremka, 1 mm iznad promjera.', 'Decimalna točka je obvezna: X42 bez točke bio bi 0,042 mm. X je promjer.', 'mdiG0'],
    ['Upiši G01 X38. Z-20. F0.15 i ENTER, CYCLE START — nož skine 1 mm po polumjeru u duljini 20 mm.', 'Posmak F0.15 je mm/okr (G99 zadano). Gledaj obradak u pogledu „Obradak”.', 'mdiG1'],
    ['Upiši G00 X50. Z20. M05 i ENTER, CYCLE START — alat se odmakne, vreteno stane.', 'M05 zaustavlja vreteno. ERASE PROG briše MDI program.', 'mdiM5'],
    ['Kraj niza „MDI”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'pisanje', grupa: 'Program', naziv: 'Pisanje programa', koraci: [
    ['Pritisni LIST PROG — popis programa u memoriji.', 'Tipka LIST PROG u stupcu MODE.', 'list'],
    ['Pritisni INSERT — otvara se prozor za novi program.', 'U popisu programa INSERT otvara prozor s poljem O NUMBER.', 'insertDlg'],
    ['Upiši O03005 i pritisni ENTER — program je stvoren i otvoren u EDIT.', 'Broj programa ima slovo O i pet znamenki.', 'noviO'],
    ['Upiši prvi blok: G18 G21 G40 G99 i pritisni ENTER.', 'Sigurnosni blok tokarilice: ravnina XZ, milimetri, bez korekcije vrha, posmak u mm/okr.', 'blok1'],
    ['Upiši T0101 i ENTER.', 'Alat 1 s korekcijom 1. Na TL-1 s nosačem alata — ručna izmjena.', 'blok2'],
    ['Upiši G97 S800 M03 i ENTER.', 'Stalni broj okretaja 800 o/min, vreteno naprijed.', 'blok3'],
    ['Upiši G00 X45. Z2. i ENTER.', 'Brzi hod ispred pripremka — s decimalnim točkama! X je promjer.', 'blok4'],
    ['Upiši M30 i ENTER.', 'Kraj programa. Program O03005 možeš izvesti u nizu „Izvođenje programa” (SELECT PROG).', 'blok5'],
    ['Kraj niza „Pisanje programa”. Blokove možeš popraviti: ALTER zamjenjuje, DELETE briše, UNDO vraća.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'izvodenje', grupa: 'Program', naziv: 'Izvođenje programa', koraci: [
    ['LIST PROG → kursor na O03001 (CEPIC) → SELECT PROG.', 'SELECT PROG čini program aktivnim (ime u gornjem retku). Pripremak Ø40 × 130 (100 mm izvan čeljusti) i korekcije alata su postavljeni.', 'select'],
    ['Pritisni MEM — izvođenje programa iz memorije.', 'U MEM se prikazuje aktivni program, a CYCLE START ga pokreće od početka.', 'mem'],
    ['Zbog sigurnosti smanji FEED override na 10 %.', 'Tipka −10% FEED devet puta (korak 10 %).', 'f10'],
    ['Zatvori klizna vrata i pritisni CYCLE START. Prati prve blokove.', 'S otvorenim vratima CYCLE START ne radi (door hold). G50 S1500 ograničava o/min, G96 S150 je stalna rezna brzina: broj okretaja raste kako se promjer smanjuje.', 'start'],
    ['Kad je sve u redu, vrati FEED override na 100 %.', 'Tipka 100% FEED. Simulaciju ubrzava izbor ispod 3D prikaza.', 'fUp'],
    ['Pritisni FEED HOLD: osi stanu, vreteno se i dalje vrti. CYCLE START nastavlja.', 'FEED HOLD je privremeni zastoj; RESET bi prekinuo program i zaustavio vreteno.', 'hold'],
    ['Uključi SINGLE BLOCK i nastavi s CYCLE START: program stane nakon svakog bloka, a ispod upute piše što blok radi. Prođi barem tri bloka.', 'Svaki CYCLE START izvede jedan blok.', 'single'],
    ['Isključi SINGLE BLOCK i CYCLE START. Program stane na T0202: otvori vrata, „Ručna izmjena alata” (T2 odrezivač), zatvori vrata, CYCLE START.', 'Ubrzanje ×20 skraćuje čekanje. Odrezivanje ide s G97 S600 i F0.05 mm/okr.', 'alatT2'],
    ['Pričekaj kraj programa (M30). Odrezani dio otpada.', 'Ubrzanje ×20 ili ×100.', 'gotovo'],
    ['Čestitamo! Program je izveden. Pogledaj obradak u pogledu „Obradak”. Isprobaj i O03002 (G71/G70), O03003 (G74/G75/G76) i O03004 (M97).', 'Klikni „Izbornik”.', 'kraj']] }
];

/* ================================================================== */
/* 3. Stanje                                                          */
/* ================================================================== */
const st = {};
function pocetno() {
  Object.assign(st, {
    sklopka: false, power: 'off', bootT: 0, estop: true, servo: false, alarmi: [], homed: false, homing: null, refOff: { X: 0, Z: 0 },
    fiz: { X: -120.5, Z: -312.4 }, vrata: false,
    nacin: 'MEM', prikaz: 'PROGRAM', offTab: 'tool', offKur: { r: 0, c: 0 }, listKur: 0, dlg: null, xdia: null,
    jogOs: 'X', jogInc: 0.1, jog: null, rapid: false, put: { X: 0, Z: 0 }, putCont: { X: 0, Z: 0 }, putKot: { X: 0, Z: 0 },
    fro: 100, sro: 100, rro: 100, alatU: 1, T: 1, S: 0, Smax: 1800, css: false, rpm: 0, dir: 0, hlad: false,
    alati: {}, off: { 54: { X: 0, Z: 0 }, 55: { X: 0, Z: 0 }, 56: { X: 0, Z: 0 }, 57: { X: 0, Z: 0 }, 58: { X: 0, Z: 0 }, 59: { X: 0, Z: 0 } }, offAkt: 54,
    programi: {}, odabran: null, prog: null, ed: null, mdi: { redci: [], kursor: 0 }, run: null, single: false, optStop: false, dryRun: false,
    unos: '', poruka: '', alarm: null, ubrzanje: st.ubrzanje || 1, sbBroj: 0, pregled: 0, cekanje: null
  });
  Object.keys(ALATI).forEach((t) => { st.alati[t] = { X: 0, Z: 0, Xw: 0, Zw: 0 }; });
  st.programi = {}; Object.entries(PROGRAMI_TL).forEach(([o, p]) => { st.programi[o] = { naslov: p.naslov, tekst: p.tekst, ugradjen: true, D: p.D, L: p.L, drz: p.drz, alat: p.alat, opis: p.opis }; });
}
pocetno();
let niz = null, korak = 0; const gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-cnc-tl1-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-cnc-tl1-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }

const mach = (o) => st.fiz[o] - st.refOff[o];
const offAl = (o) => (st.alati[st.alatU] ? st.alati[st.alatU][o] + st.alati[st.alatU][o + 'w'] : 0);
const rad = (o) => mach(o) - offAl(o) - st.off[st.offAkt][o];
const vrh = () => { const a = ALAT_T(st.alatU); return { x: ZT0 + st.fiz.Z + a.dx, r: R0 + st.fiz.X / 2 + a.dr }; };   /* vrh alata: x od čela stezne glave, r od osi */
const naOn = () => st.power === 'on';
const alatiZaPretvori = () => { const a = {}; Object.keys(ALATI).forEach((t) => { a[t] = { X: st.alati[t].X + st.alati[t].Xw, Z: st.alati[t].Z + st.alati[t].Zw }; }); return a; };

/* ================================================================== */
/* 4. Scena                                                            */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 5, 20000);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1500, 3000, 2500); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-2000, 1500, -1500); scene.add(sun2);
postaviOkolinu(THREE, renderer, scene);
const S = napraviStrojTL1(THREE, scene);

function pogled(p) {
  const V = { stroj: [[-1800, 1300, 3800], [400, -150, 0]], radni: [[-500, 600, 1500], [250, -50, 0]], obradak: [[-150, 220, 520], [60, 0, 0]], privjesak: [[1500, 400, 1600], [1030, 150, 400]], straga: [[2600, 900, -3000], [600, -100, -300]] }[p] || [[-1800, 1300, 3800], [400, -150, 0]];
  if (p === 'radni') { const xs = S.suport.position.x - 400; V[0][0] = Math.max(V[0][0], xs - 700); V[1][0] = Math.max(250, xs); }
  camera.position.set(...V[0]); controls.target.set(...V[1]); controls.update();
}

/* ================================================================== */
/* 5. Obradak, alati                                                     */
/* ================================================================== */
let O = null;
function opisPribora(t) { $('pribor-opis').textContent = t; }
function postaviPripremak(D, L, drz, tekst) {
  if (O) ukloniObradak(O, S.obrGrupa); O = napraviObradak(THREE, S.obrGrupa, { D, L, drz });
  S.celjustiNa(CELJ_R(D));
  opisPribora('Pripremak Ø' + D + ' × ' + L + ' mm (' + (L - drz) + ' mm izvan čeljusti) u steznoj glavi' + (tekst ? '; ' + tekst : '') + '.');
}
function postaviVjezbu() { postaviPripremak(VJEZBA.D, VJEZBA.L, VJEZBA.drz, 'nultočka G54 na čelu pripremka'); }
function bezPribora() { if (O) ukloniObradak(O, S.obrGrupa); O = null; S.celjustiNa(20); S.nulaW.visible = false; opisPribora('U steznoj glavi nema pripremka. Pripremak se postavlja kad odabereš program (SELECT PROG).'); }
/* korekcije alata tako da je nultočka obratka na čelu (x = xc) */
function izmjeriAlate(xc) {
  Object.keys(ALATI).forEach((t) => { const a = ALATI[t]; st.alati[t].X = -2 * R0 - 2 * a.dr; st.alati[t].Z = xc - ZT0 - a.dx; st.alati[t].Xw = 0; st.alati[t].Zw = 0; });
}
function celoObratka() { return O ? celo(O) : 80; }
function nultockaNaCelo() { st.off[54] = { X: 0, Z: 0 }; S.nulaW.position.set(celoObratka(), 0, 0); S.nulaW.visible = true; }
function stroj3DAlat() { const a = ALAT_T(st.alatU); S.postaviAlat(a.vrsta); S.alatG.position.set(-40 + a.dx, 0, a.dr); $('fiz-alat').textContent = 'u nosaču: T' + st.alatU + ' (' + a.naziv + ')'; }
function provjeriHod(P) {
  const gr = []; if (!P.length) return gr;
  const o = { X: [Infinity, -Infinity], Z: [Infinity, -Infinity] };
  P.forEach((p) => { o.X[0] = Math.min(o.X[0], p[0]); o.X[1] = Math.max(o.X[1], p[0]); o.Z[0] = Math.min(o.Z[0], p[1]); o.Z[1] = Math.max(o.Z[1], p[1]); });
  for (const a of OSI) { const lo = o[a][0], hi = o[a][1];
    if (lo < HOD[a][0] - 1e-6 || hi > HOD[a][1] + 1e-6) gr.push('putanja u ' + a + ' izlazi iz hoda (' + kr(lo, 1) + ' … ' + kr(hi, 1) + ' mm, hod ' + HOD[a][0] + ' … 0)'); }
  return gr;
}

/* ================================================================== */
/* 6. Program: priprema, izvođenje                                       */
/* ================================================================== */
function prevediProgram(tekst, ime) {
  const r = pretvori(tekst, { alati: alatiZaPretvori(), off: st.off, start: { X: st.fiz.X, Z: st.fiz.Z }, T0: st.alatU, stanje: { dir: st.dir, S: st.S, css: st.css, max: st.Smax, hlad: st.hlad }, programi: Object.fromEntries(Object.entries(st.programi).map(([k, v]) => [k, v.tekst])) });
  const redci = String(tekst).replace(/\r/g, '').split('\n'); const obj = new Array(redci.length); let sta = {};
  redci.forEach((l, i) => { const o = objasni(l, sta); obj[i] = o.tekst; sta = o.stanje; });
  const ev = r.B.map((b, i) => (b.ev ? { i, ev: b.ev, red: b.red } : null)).filter(Boolean);
  const alarmi = r.greske.filter((g) => g.alarm).map((g) => ({ br: g.alarm, tekst: g.tekst, red: g.red }));
  const upoz = r.greske.filter((g) => !g.alarm).map((g) => 'red ' + (g.red + 1) + ': ' + g.tekst);
  return { ime, B: r.B, P: r.P, SB: r.S, redci, obj, ev, alarmi, upoz, info: r.info, hod: provjeriHod(r.P), i: 0, evI: 0, ide: false, gotov: false, trenBlok: -1, trenRed: 0, zadRed: -1, prikRed: -1, zapoceta: -1, preskoci: false, F: 0, v: 0, cekaj: 0, fRev: true };
}
function odaberiProgram(ime) {
  const pr = st.programi[ime]; if (!pr) return;
  st.odabran = ime; st.pregled = 0;
  postaviPripremak(pr.D, pr.L, pr.drz, 'nultočka G54 na čelu'); izmjeriAlate(celoObratka()); nultockaNaCelo();
  const A = prevediProgram(pr.tekst, ime); st.prog = A;
  status(ime + ' ' + pr.naslov + ' odabran' + (A.hod.length ? ' — upozorenje: ' + A.hod.join('; ') : ''));
  info('Pripremak Ø' + pr.D + ' × ' + pr.L + ' mm je stegnut, G54 Z na čelu, korekcije alata izmjerene. ' + (A.hod.length ? 'POZOR: program ne stane u hod stroja — ' + A.hod.join('; ') + '.' : 'Program stane u hod stroja.') + (A.alarmi.length ? ' Program ima grešku: ' + A.alarmi[0].br + ' (red ' + (A.alarmi[0].red + 1) + ') — ' + A.alarmi[0].tekst : ''), !!(A.hod.length || A.alarmi.length));
  crtajPredmet(); crtaj();
  dogadaj('select', { ime, stane: !A.hod.length });
}
function rpmCilj() {
  if (!st.sklopka || !naOn() || !st.servo || st.estop || st.alarmi.length) return 0;
  if (st.vrata || !st.dir) return 0;
  let n = st.S;
  if (st.css) { const D = Math.max(1, 2 * Math.abs(R0 + st.fiz.X / 2 + ALAT_T(st.alatU).dr)); n = Math.min(st.Smax, 1000 * st.S / (Math.PI * D)); }
  return Math.min(S_MAX, n) * st.sro / 100;
}
function alarmProg(br, tekst) { st.alarmi.push({ br, tekst }); st.dir = 0; if (st.run) st.run.ide = false; st.jog = null; st.homing = null; status('ALARM ' + br + ' ' + tekst); crtaj(); }
function obradiDogadaje(A, doBloka) {
  while (A.evI < A.ev.length && A.ev[A.evI].i <= doBloka) {
    const e = A.ev[A.evI], ev = e.ev;
    if (ev.alat !== undefined && ev.alat !== st.alatU && !ev.gotovo) {
      A.ide = false; st.cekanje = { vrsta: 'alat', T: ev.alat, A }; st.dir = 0; ev.gotovo = true;
      status('T' + String(ev.alat).padStart(2, '0') + ' — zamijeni alat ručno i pritisni CYCLE START'); info('Ručna izmjena alata: otvori klizna vrata, pritisni „Ručna izmjena alata” (T' + ev.alat + ' u nosač), zatvori vrata i pritisni CYCLE START.'); crtaj(); dogadaj('alatCekanje', { T: ev.alat }); return false;
    }
    if (ev.alat !== undefined) st.T = ev.alat;
    if (ev.m00 && !ev.gotovo) { A.ide = false; ev.gotovo = true; st.cekanje = { vrsta: 'm00', A }; status('M00 PROGRAM STOP — CYCLE START nastavlja'); crtaj(); return false; }
    if (ev.m01 && st.optStop && !ev.gotovo) { A.ide = false; ev.gotovo = true; st.cekanje = { vrsta: 'm01', A }; status('M01 OPTIONAL STOP — CYCLE START nastavlja'); crtaj(); return false; }
    if (ev.g04 && !ev.gotovo) { ev.gotovo = true; A.cekaj = (ev.g04 || 0) / 1000; A.evI++; return A.cekaj <= 0; }
    if (ev.navoj && !ev.gotovo) { ev.gotovo = true; A.navojZa = ev.navoj; }
    if (ev.kraj) { A.evI++; return true; }
    A.evI++;
  }
  return true;
}
function korakProg(dt) {
  const A = st.run; if (!A || !A.ide) return;
  let ost = dt * st.ubrzanje;
  if (A.cekaj > 0) { A.cekaj -= ost; if (A.cekaj > 0) return; ost = -A.cekaj; A.cekaj = 0; }
  while (ost > 0 && A.i < A.P.length) {
    const p = A.P[A.i], blok = p[4], red = A.B[blok].red;
    if (A.zapoceta !== A.i) {
      if (A.single && A.zadRed >= 0 && red !== A.zadRed && !A.preskoci) { A.ide = false; prikaziBlok(A, A.zadRed); st.sbBroj++; dogadaj('singleBlok'); crtaj(); return; }
      if (!obradiDogadaje(A, blok)) return;
      if (A.cekaj > 0) { A.zapoceta = A.i; return; }
      A.zapoceta = A.i;
    }
    A.preskoci = false;
    if (blok !== A.trenBlok) { A.trenBlok = blok; A.trenRed = red; crtajKod(); }
    const sb = A.SB[blok]; st.dir = sb.dir; st.css = sb.css; st.Smax = sb.max || 1800; postaviS(sb.S); st.hlad = sb.hlad;
    { const c = rpmCilj(); if (c > st.rpm) st.rpm = c; }
    const cilj = { X: p[0], Z: p[1] };
    for (const o of OSI) if (cilj[o] < HOD[o][0] - 1e-6 || cilj[o] > HOD[o][1] + 1e-6) {
      alarmProg({ X: 316, Z: 318 }[o], o + ' OVER TRAVEL RANGE (redak ' + (red + 1) + ')');
      info('Program je zaustavljen alarmom ' + { X: 316, Z: 318 }[o] + ': os ' + o + ' bi u retku ' + (red + 1) + ' izašla iz hoda stroja.', true); return;
    }
    const d = { X: (cilj.X - st.fiz.X) / 2, Z: cilj.Z - st.fiz.Z };                /* X u promjeru → put po polumjeru */
    let t;
    if (p[2] === 0) { const v = BRZI * st.rro / 100; t = Math.max(Math.abs(d.X), Math.abs(d.Z)) / v * 60; A.F = 0; A.v = v; A.fRev = p[5]; }
    else {
      let Fmm = p[5] ? p[3] * Math.max(st.rpm, 1) : p[3];
      if (p[5] && st.rpm < 1) { Fmm = p[3] * 50; }
      const F = Math.min(BRZI, Math.max(0.5, Fmm)) * st.fro / 100; if (F <= 0.01) break; t = Math.hypot(d.X, d.Z) / F * 60; A.F = p[3]; A.v = F; A.fRev = p[5];
    }
    if (p[2] !== 0 && st.fro <= 0) break;
    const od = { ...st.fiz }; let u;
    if (t <= ost) { u = 1; ost -= t; } else { u = ost / t; ost = 0; }
    const nov = u >= 1 ? cilj : { X: od.X + (cilj.X - od.X) * u, Z: od.Z + (cilj.Z - od.Z) * u };
    if (!gibaj(od, nov, p[2] === 1)) return;
    if (u >= 1) { A.i++; A.zadRed = red; if (A.navojZa && A.P[A.i] && A.P[A.i][4] !== blok) { const n = A.navojZa; A.navojZa = null; const a = ALAT_T(st.alatU); if (O) { const rt = R0 + (n.Xm + offAl('X') + st.off[st.offAkt].X) / 2 + a.dr; const z0 = n.xA + offAl('Z') + st.off[st.offAkt].Z + ZT0 + a.dx, z1 = n.xB + offAl('Z') + st.off[st.offAkt].Z + ZT0 + a.dx; urezNavoj(O, z0, z1, n.p, rt); } } }
  }
  if (A.i >= A.P.length && A.ide) {
    if (!obradiDogadaje(A, Infinity)) return;
    A.ide = false; A.gotov = true; st.pregled = 0; st.cekanje = null;
    if (A.ime === 'MDI') { const sb = A.SB[A.B.length - 1]; if (sb) { st.dir = sb.dir; st.css = sb.css; postaviS(sb.S); } } else st.dir = 0;
    if (A.ime === 'MDI') { status('MDI izveden.'); info('MDI blokovi su izvedeni.'); }
    else { A.trenBlok = -1; A.trenRed = 0; status('PROGRAM END (M30) — ' + A.ime); info('Program je završen (M30). Upravljanje je na početku programa.'); }
    crtaj(); dogadaj('programKraj', { ime: A.ime });
  }
}
function postaviS(Sv) { st.S = Sv || 0; }
function gibaj(od, nov, rez) {
  const dl = Math.hypot((nov.X - od.X) / 2, nov.Z - od.Z);
  const n = Math.max(1, Math.ceil(dl / 0.15));
  for (let q = 1; q <= n; q++) {
    const s = q / n;
    st.fiz = { X: od.X + (nov.X - od.X) * s, Z: od.Z + (nov.Z - od.Z) * s };
    const sd = obradi(rez); if (sd) { sudar(sd); return false; }
  }
  return true;
}
/* sudar sa steznom glavom: vrh alata u zoni čeljusti/tijela glave */
function uGlavi(t) {
  const rj = O ? CELJ_R(O.D) : 20;
  if (t.x < 0 && t.r < GEO.GLAVA.D / 2 + 2) return true;
  if (t.x < GEO.GLAVA.CELJUST + 1 && t.r < rj + 45 && t.r > rj - 1) return true;
  return false;
}
function obradi(rez) {
  const t = vrh(), vrti = st.rpm > 30, a = ALAT_T(st.alatU), radi = st.run && st.run.ide;
  if (uGlavi(t)) return 'glava';
  if (!O) return null;
  if (t.x > O.x1 + 5) return null;
  if (rez && vrti) { const r = rezi(O, a, t.x, t.r); if (r.sudar) return r.sudar; if (r.skinuto) { const od = provjeriOdrez(O); if (od) { status('Dio je odrezan (duljina ' + kr(od.x1 - od.x0, 1) + ' mm).'); } } return null; }
  const m = uMaterijalu(O, a, t.x, t.r);
  if (m > 3) { if (!vrti) return 'nerotira'; if (!rez) return 'brzi'; }
  if (m > 0 && vrti && !radi) { rezi(O, a, t.x, t.r); }                          /* ručno gibanje uz vreteno koje se vrti: reže */
  return null;
}
const SUDAR = { glava: 'Alat je udario u steznu glavu ili čeljusti.', drzac: 'Držač alata (ne rezni dio) udario je u obradak — dubina reza prevelika ili pogrešan smjer.', brzi: 'Alat je brzim hodom (G00) ušao u materijal.', nerotira: 'Alat je ušao u materijal, a vreteno se ne vrti.', svrdloOs: 'Svrdlo nije na osi vretena (X 0), a ulazi u materijal.' };
function sudar(sto) {
  st.alarm = sto; st.jog = null; st.homing = null; if (st.run) st.run.ide = false; st.dir = 0;
  status('SUDAR — stroj je zaustavljen');
  $('poruka').innerHTML = '<span class="upoz">Sudar!</span> ' + esc(SUDAR[sto] || 'Sudar.') + ' Na stroju bi se alat slomio ili bi se oštetio nosač. Pritisni „Ponovno pokreni niz”.';
  $('ponovi').hidden = false; crtaj();
}

/* ================================================================== */
/* 7. Ručno gibanje i referenciranje                                    */
/* ================================================================== */
function zasto(zaProgram) {
  if (st.alarm) return 'Stroj je zaustavljen nakon sudara — ponovno pokreni niz.';
  if (!naOn()) return 'Upravljanje nije uključeno (POWER ON).';
  if (st.estop) return 'EMERGENCY STOP je pritisnut (alarm 107).';
  if (st.alarmi.length) return 'Aktivan je alarm ' + st.alarmi[0].br + ' ' + st.alarmi[0].tekst + ' — pritisni RESET.';
  if (!st.servo) return 'Pogoni nisu uključeni — pritisni RESET.';
  if (st.homing) return 'Referenciranje je u tijeku.';
  if (zaProgram && !st.homed) return 'Osi nisu referencirane — pritisni POWER UP ili ZERO RET → ALL.';
  if (zaProgram && st.vrata) return 'Klizna vrata su otvorena (door hold) — zatvori vrata.';
  return '';
}
function jogStart(o, smjer) {
  if (o === 'C' || o === 'Y') { info('TL-1 nema os ' + o + ' (tipke postoje na privjesku, bez učinka).'); return; }
  const z = zasto(); if (z) { info(z); return; }
  if (st.run && st.run.ide) { info('Za vrijeme programa osi se ne gibaju ručno.'); return; }
  if (st.nacin !== 'JOG') { info('Tipke gibanja rade u načinu HANDLE JOG.'); return; }
  st.jogOs = o; dogadaj('jogOs', { os: o });
  st.jog = { os: o, smjer, drzi: true, rapid: st.rapid }; crtaj();
}
function jogStop() { if (st.jog && st.jog.drzi) { const r = st.jog.rapid; st.jog = null; st.rapid = false; dogadaj('pomak', { rapid: r }); crtaj(); } }
function kotac(klik) {
  const z = zasto(); if (z) { info(z); return; }
  if (st.run && st.run.ide) return;
  if (st.nacin !== 'JOG') { info('Ručni kotač radi u načinu HANDLE JOG.'); return; }
  const o = st.jogOs; let c = Math.round((st.fiz[o] + klik * st.jogInc) * 1e6) / 1e6;
  if (st.homed) c = Math.min(Math.max(c, HOD[o][0]), HOD[o][1]);
  const od = { ...st.fiz }, n = { ...st.fiz }; n[o] = c;
  if (!gibaj(od, n, true)) return;
  st.putKot[o] += Math.abs(c - od[o]); $('kot-k').style.transform = 'rotate(' + ((st.kotKut = (st.kotKut || 0) + klik * 18)) + 'deg)';
  dogadaj('pomak', { os: o, kotac: true }); crtaj();
}
function korakJog(dt) {
  const J = st.jog; if (!J) return;
  const o = J.os, v = (J.rapid ? BRZI * st.rro / 100 : JOG_V[st.jogInc]) / 60 * dt * (o === 'X' ? 2 : 1), staro = st.fiz[o]; let nov = staro + J.smjer * v, kraj = false;
  if (st.homed && (nov < HOD[o][0] || nov > HOD[o][1])) { nov = Math.min(Math.max(nov, HOD[o][0]), HOD[o][1]); kraj = true; status('Os ' + o + ' je na kraju hoda (travel limit).'); }
  const od = { ...st.fiz }, n = { ...st.fiz }; n[o] = nov;
  if (!gibaj(od, n, true)) return;
  st.putCont[o] += Math.abs(nov - staro);
  if (kraj) { const r = J.rapid; st.jog = null; st.rapid = false; dogadaj('pomak', { os: o, rapid: r }); crtaj(); }
  else if ((st.tJog = (st.tJog || 0) + dt) > 0.2) { st.tJog = 0; dogadaj('pomak', { os: o, rapid: J.rapid }); }
}
function zeroRet(osi) {
  const z = zasto(); if (z) { info(z); return; }
  if (st.run && st.run.ide) return;
  const red = (osi || ['X', 'Z']).slice();
  st.homing = { red, k: 0 }; status('ZERO RETURN: os ' + red[0] + ' …'); crtaj();
}
function korakRef(dt) {
  const H = st.homing; if (!H) return;
  const o = H.red[H.k], cilj = HOD[o][1], v = F_REF / 60 * dt * st.ubrzanje * (o === 'X' ? 2 : 1), d = cilj - st.fiz[o];
  const n = { ...st.fiz }; n[o] = Math.abs(d) <= v ? cilj : st.fiz[o] + Math.sign(d) * v;
  if (!gibaj({ ...st.fiz }, n, false)) return;
  if (st.fiz[o] === cilj) { H.k++; if (H.k < H.red.length) status('ZERO RETURN: os ' + H.red[H.k] + ' …'); else {
    st.homing = null; st.homed = true; st.refOff = { X: 0, Z: 0 }; status('ZERO RETURN gotov — osi ' + H.red.join(', ') + ' u nultočki stroja.'); crtaj(); dogadaj('ref'); } }
}

/* ================================================================== */
/* 8. Dodir (papir)                                                     */
/* ================================================================== */
function papir() {
  const t = vrh(); const xc = niz && niz.id === 'nultocka' && !O ? REF_X : celoObratka(); const rp = O ? polumjerNa(O, Math.min(t.x, xc - 0.01)) : 0;
  if (niz && niz.id === 'nultocka' && t.r < 25 && !O) return { os: 'Z', g: t.x - REF_X };
  if (!O) return null;
  if (t.r < rp - 0.3 || (t.r < O.R && t.x >= xc - 0.01)) { if (t.x >= xc - 0.3) return { os: 'Z', g: t.x - xc }; }
  if (t.x < xc - 0.5 && t.x > 0 && rp > 0) return { os: 'X', g: t.r - rp };
  return null;
}
const zapinje = (p, os) => p && p.os === os && p.g >= -1e-6 && p.g <= 0.05 + 1e-6;
function tekstPapira() {
  const p = papir(); if (!p) return '— alat nije uz čelo ni uz promjer pripremka';
  const gdje = { X: 'vanjski promjer', Z: 'čelo' }[p.os];
  if (p.g < -1e-6) return gdje + ': alat je u materijalu';
  if (p.g <= 0.05 + 1e-6) return '<b class="zap">' + gdje + ': papir zapinje — dodir!</b>' + (p.os === 'X' && O ? ' (promjer Ø' + kr(2 * polumjerNa(O, Math.min(vrh().x, celoObratka() - 0.01)), 2) + ')' : '');
  if (p.g <= 0.2) return gdje + ': papir klizi, alat je vrlo blizu — koristi korak 0,01';
  if (p.g <= 1) return gdje + ': papir klizi, alat je blizu';
  return gdje + ': razmak se vidi, papir slobodno klizi';
}

/* ================================================================== */
/* 9. Koraci                                                           */
/* ================================================================== */
const blizu = (a, b, e = 0.0005) => Math.abs(a - b) <= e;
const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim().replace(/;$/, '').trim();
function trenutni() { return niz ? niz.koraci[korak] : null; }
function dogadaj(e, d = {}) {
  const k = trenutni(); if (!k || st.alarm) return;
  const pp = papir();
  const edRed = (i) => (st.ed && st.ed.ime === 'O03005' ? norm(st.ed.redci[i]) : '');
  const zPravi = (T) => (O ? celoObratka() - ZT0 - ALAT_T(T).dx : 0);
  const ok = (() => {
    switch (k[2]) {
      case 'sklopka': return st.sklopka;
      case 'powerOn': return naOn();
      case 'estop': return naOn() && !st.estop;
      case 'reset': return e === 'reset' && st.servo && !st.alarmi.length;
      case 'powerUp': return e === 'ref' && st.homed;
      case 'jogNacin': return st.nacin === 'JOG';
      case 'osX': return st.nacin === 'JOG' && st.jogOs === 'X';
      case 'inc1': return st.jogInc === 1;
      case 'kotac10': return st.putKot.X >= 10 - 1e-6;
      case 'tipkeZ': return st.putCont.Z >= 20 - 1e-6;
      case 'rapid': return e === 'pomak' && d.rapid;
      case 'polozaj': return e === 'pomak' && blizu(mach('X'), -300) && blizu(mach('Z'), -400);
      case 'dalje': return e === 'dalje';
      case 'offsetTool': return st.prikaz === 'OFFSET' && st.offTab === 'tool';
      case 'kursorT1': return st.prikaz === 'OFFSET' && st.offTab === 'tool' && st.offKur.r === 0;
      case 'dodirZ1': return e === 'pomak' && zapinje(pp, 'Z') && st.alatU === 1;
      case 'izmjeriZ1': return e === 'zfm' && d.T === 1 && blizu(st.alati[1].Z, zPravi(1), 0.07);
      case 'dodirX1': return e === 'pomak' && zapinje(pp, 'X') && st.alatU === 1;
      case 'izmjeriX1': return e === 'xdm' && d.T === 1 && blizu(st.alati[1].X, -2 * R0 - 2 * ALATI[1].dr, 0.12);
      case 'mdiT2': return e === 'alatCekanje' && d.T === 2;
      case 'zamijeni2': return e === 'alat' && st.alatU === 2;
      case 'nastavi2': return e === 'programKraj' && d.ime === 'MDI' && st.alatU === 2;
      case 'izmjeriZ2': return e === 'zfm' && d.T === 2 && blizu(st.alati[2].Z, zPravi(2), 0.07);
      case 'offsetWork': return st.prikaz === 'OFFSET' && st.offTab === 'work';
      case 'kursor54Z': return st.prikaz === 'OFFSET' && st.offTab === 'work' && st.offKur.r === 0 && st.offKur.c === 1;
      case 'dodirZ': return e === 'pomak' && zapinje(pp, 'Z');
      case 'pzsZ': return e === 'pzs' && d.os === 'Z' && blizu(st.off[54].Z, celoObratka() - REF_X, 0.07);
      case 'mdiNacin': return st.nacin === 'MDI';
      case 'mdiS': return e === 'programKraj' && d.ime === 'MDI' && st.dir && !st.css && blizu(st.S, 800, 1);
      case 'mdiG0': return e === 'programKraj' && d.ime === 'MDI' && blizu(rad('X'), 42, 0.01) && blizu(rad('Z'), 2, 0.01);
      case 'mdiG1': return e === 'programKraj' && d.ime === 'MDI' && blizu(rad('X'), 38, 0.01) && blizu(rad('Z'), -20, 0.01);
      case 'mdiM5': return e === 'programKraj' && d.ime === 'MDI' && !st.dir && blizu(rad('X'), 50, 0.01);
      case 'list': return st.nacin === 'LIST';
      case 'insertDlg': return e === 'dlg' && st.dlg === 'novi';
      case 'noviO': return e === 'novi' && st.ed && st.ed.ime === 'O03005';
      case 'blok1': return e === 'edit' && edRed(0) === norm(PROG_O03005[0]);
      case 'blok2': return e === 'edit' && edRed(1) === norm(PROG_O03005[1]);
      case 'blok3': return e === 'edit' && edRed(2) === norm(PROG_O03005[2]);
      case 'blok4': return e === 'edit' && edRed(3) === norm(PROG_O03005[3]);
      case 'blok5': return e === 'edit' && edRed(4) === norm(PROG_O03005[4]);
      case 'select': return e === 'select' && d.ime === 'O03001';
      case 'mem': return st.nacin === 'MEM' && st.odabran === 'O03001';
      case 'f10': return st.fro <= 10;
      case 'start': return e === 'cycleStart' && st.run && st.run.ime === 'O03001';
      case 'fUp': return st.fro >= 100 && st.run && (st.run.ide || st.run.i > 0);
      case 'hold': return e === 'hold';
      case 'single': return e === 'singleBlok' && st.sbBroj >= 3;
      case 'alatT2': return e === 'cycleStart' && st.alatU === 2 && st.run && st.run.ime === 'O03001';
      case 'gotovo': return e === 'programKraj' && d.ime === 'O03001';
      default: return false;
    }
  })();
  if (ok) { korak++; if (korak >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); } crtajKorak(); }
}

/* ================================================================== */
/* 10. Zaslon NGC                                                       */
/* ================================================================== */
function info(t, upoz) { $('poruka').innerHTML = upoz ? '<span class="upoz">' + esc(t) + '</span>' : esc(t); }
function status(t) { st.poruka = t; }
const NACIN_IME = { MEM: 'MEM', EDIT: 'EDIT', MDI: 'MDI', JOG: 'HANDLE JOG', ZERO: 'ZERO RET', LIST: 'LIST PROGRAM' };
function crtajPoz() {
  const el = $('ngc-poz'); if (!naOn()) { el.innerHTML = ''; return; }
  let h = '<tr><th></th><th>WORK G' + st.offAkt + '</th><th>MACHINE</th></tr>';
  OSI.forEach((o) => { h += '<tr><td>' + o + '</td><td class="v">' + dro(rad(o)) + '</td><td class="v">' + dro(mach(o)) + '</td></tr>'; });
  if (!st.homed) h += '<tr class="g"><td colspan="3">ZERO RET nije napravljen — koordinate od uključivanja</td></tr>';
  el.innerHTML = h;
}
function crtajStanje() {
  const el = $('ngc-stanje'); if (!naOn()) { el.innerHTML = ''; return; }
  const A = st.run; const a = st.alati[st.alatU] || { X: 0, Z: 0 };
  el.innerHTML = '<span>SPINDLE</span><b class="' + (st.rpm > 1 ? 'on' : '') + '">' + Math.round(st.rpm) + ' RPM' + (st.dir > 0 ? ' FWD' : st.dir < 0 ? ' REV' : '') + '</b>'
    + '<span>' + (st.css ? 'G96 CSS' : 'G97 S') + '</span><b>' + Math.round(st.S) + (st.css ? ' m/min · G50 ' + st.Smax : '') + ' / ' + st.sro + '%</b>'
    + '<span>FEED</span><b>' + (A && A.ide ? A.v.toFixed(0) : st.jog ? Math.round(st.jog.rapid ? BRZI * st.rro / 100 : JOG_V[st.jogInc]) : '0') + ' mm/min</b>'
    + '<span>F / OVR</span><b>' + (A ? (A.fRev ? A.F.toFixed(3) + ' mm/rev' : A.F.toFixed(0) + ' mm/min') : '0') + ' / ' + st.fro + '%</b>'
    + '<span>RAPID OVR</span><b>' + st.rro + '%</b>'
    + '<span>TOOL</span><b>T' + String(st.alatU).padStart(2, '0') + String(st.alatU).padStart(2, '0') + ' X' + dro(a.X) + ' Z' + dro(a.Z) + '</b>'
    + '<span>SINGLE BLOCK</span><b class="' + (st.single ? 'up' : '') + '">' + (st.single ? 'ON' : 'OFF') + '</b>'
    + '<span>COOLANT</span><b class="' + (st.hlad ? 'on' : '') + '">' + (st.hlad ? 'ON' : 'OFF') + '</b>'
    + '<span>DOOR</span><b class="' + (st.vrata ? 'up' : '') + '">' + (st.vrata ? 'OPEN' : 'CLOSED') + '</b>'
    + '<span>ZERO RET</span><b class="' + (st.homed ? 'on' : 'up') + '">' + (st.homed ? 'DONE' : 'NOT DONE') + '</b>';
}
function listaKoda(redci, cur, kur, akt) {
  const p0 = Math.max(0, Math.min((kur >= 0 ? kur : cur) - 5, redci.length - 16));
  let h = ''; for (let i = p0; i < Math.min(redci.length, p0 + 16); i++) h += '<div class="r' + (i === cur && akt ? ' akt' : '') + (i === kur ? ' kur' : '') + '"><i>' + (i + 1) + '</i>' + esc(redci[i] || ' ') + '</div>';
  return h || '<div class="nap">(prazno)</div>';
}
function crtajKod() {
  if (!naOn()) return;
  const pane = $('ngc-pane'), ph = $('ngc-ph'); let h = ''; let naslov = 'PROGRAM';
  if (st.prikaz === 'POSITION') { naslov = 'POSITION'; h = '<table><tr><th></th><th>WORK G' + st.offAkt + '</th><th>MACHINE</th><th>DIST TO GO</th></tr>' + OSI.map((o, i) => '<tr><td>' + o + '</td><td>' + dro(rad(o)) + '</td><td>' + dro(mach(o)) + '</td><td>' + (st.run && st.run.ide && st.run.P[st.run.i] ? dro(st.run.P[st.run.i][i] - st.fiz[o]) : '0.000') + '</td></tr>').join('') + '</table><div class="nap">X je promjer. WORK = koordinate obratka (G' + st.offAkt + ' + korekcija alata T' + String(st.alatU).padStart(2, '0') + '); MACHINE = koordinate stroja od nultočke stroja (ZERO RET).</div>'; }
  else if (st.prikaz === 'OFFSET') {
    naslov = 'OFFSET'; h = '<div class="tab"><span class="' + (st.offTab === 'tool' ? 'akt' : '') + '">TOOL</span><span class="' + (st.offTab === 'work' ? 'akt' : '') + '">WORK</span></div>';
    if (st.offTab === 'tool') {
      h += '<table><tr><th>TOOL</th><th>X GEOMETRY</th><th>Z GEOMETRY</th><th>X WEAR</th><th>Z WEAR</th><th style="text-align:left">u simulatoru</th></tr>';
      Object.keys(ALATI).forEach((t, i) => { const a = st.alati[t]; h += '<tr><td>' + String(t).padStart(2, '0') + '</td>' + ['X', 'Z', 'Xw', 'Zw'].map((c, ci) => '<td class="' + (st.offKur.r === i && st.offKur.c === ci ? 'sel' : '') + '">' + dro(a[c]) + '</td>').join('') + '<td style="text-align:left;color:#9fb3bb">' + esc(ALATI[t].naziv) + '</td></tr>'; });
      h += '</table><div class="nap">Z FACE MESUR upisuje Z stroja u Z GEOMETRY alata pod kursorom. X DIA MESUR pamti X stroja; zatim upiši izmjereni promjer i ENTER. Upisan broj + ENTER dodaje, + F1 upisuje umjesto.</div>';
      if (st.xdia !== null) h += '<div class="dlg"><b>X DIA MESUR</b><br>izmjereni promjer: <span class="polje sel">' + esc(st.unos || '') + '</span><br><span style="color:#9fb3bb">upiši promjer (npr. 40.) i pritisni ENTER; CANCEL odustaje</span></div>';
    } else {
      h += '<table><tr><th>WORK</th><th>X</th><th>Z</th></tr>';
      [54, 55, 56, 57, 58, 59].forEach((g, i) => { h += '<tr><td>G' + g + '</td>' + OSI.map((o, c) => '<td class="' + (st.offKur.r === i && st.offKur.c === c ? 'sel' : '') + '">' + dro(st.off[g][o]) + '</td>').join('') + '</tr>'; });
      h += '</table><div class="nap">PART ZERO SET upisuje položaj (stroj − korekcija alata) za os pod kursorom. X ostaje 0 — os vretena je nultočka X. Upisan broj + ENTER dodaje, + F1 upisuje umjesto.</div>';
    }
  } else if (st.prikaz === 'ALARMS') { naslov = 'ALARMS'; h = st.alarmi.length ? st.alarmi.map((a) => '<div class="al">' + a.br + ' ' + esc(a.tekst) + '</div>').join('') + '<div class="nap">RESET briše alarme čiji uzrok više ne postoji.</div>' : '<div class="nap">Nema aktivnih alarma.</div>'; }
  else if (st.nacin === 'LIST') {
    naslov = 'LIST PROGRAM'; const imena = Object.keys(st.programi).sort();
    h = '<table><tr><th style="text-align:left">O NUMBER</th><th style="text-align:left">TITLE</th><th>SIZE</th></tr>' + imena.map((o, i) => '<tr><td class="' + (st.listKur === i ? 'sel' : '') + '">' + o + (st.odabran === o ? ' *' : '') + '</td><td style="text-align:left">' + esc(st.programi[o].naslov) + '</td><td>' + st.programi[o].tekst.length + '</td></tr>').join('') + '</table>';
    if (st.dlg === 'novi') h += '<div class="dlg"><b>CREATE NEW PROGRAM</b><br>O NUMBER: <span class="polje sel">' + esc(st.unos || '') + '</span><br><span style="color:#9fb3bb">upiši broj (O00001 … O99999) i pritisni ENTER; CANCEL odustaje</span></div>';
    else h += '<div class="nap">▲ ▼ biraju program, SELECT PROG ga čini aktivnim (*), INSERT stvara novi, ERASE PROG briše vlastiti program. Aktivni program se izvodi u MEM.</div>';
  } else if (st.nacin === 'EDIT') {
    naslov = 'EDIT: ' + (st.ed ? st.ed.ime : '—');
    h = st.ed ? listaKoda(st.ed.redci, -1, st.ed.kursor, false) + '<div class="nap">Upiši blok i pritisni ENTER ili INSERT (upis iza kursora); ALTER zamjenjuje blok pod kursorom, DELETE briše, UNDO vraća obrisano.</div>' : '<div class="nap">Nema otvorenog programa — SELECT PROG u LIST PROGRAM ili INSERT za novi.</div>';
  } else if (st.nacin === 'MDI') {
    naslov = 'MDI'; const A = st.run && st.run.ime === 'MDI' ? st.run : null;
    h = listaKoda(st.mdi.redci, A ? A.trenRed : -1, A && A.ide ? -1 : st.mdi.kursor, !!A) + '<div class="nap">ENTER upisuje blok iz retka INPUT; CYCLE START izvodi MDI program; ERASE PROG ga briše.</div>';
  } else if (st.nacin === 'ZERO') {
    naslov = 'ZERO RETURN'; h = '<div class="nap">ALL — referenciranje svih osi (X prva). HOME G28 — brzi hod u nultočku stroja. SINGLE — upiši slovo osi (X ili Z) i pritisni SINGLE. Stanje: ' + (st.homed ? 'osi referencirane' : 'osi NISU referencirane') + '.</div>' + (st.homing ? '<div class="al" style="color:#8fe6ec">u tijeku: os ' + st.homing.red[st.homing.k] + '</div>' : '');
  } else {
    naslov = st.nacin === 'JOG' ? 'HANDLE JOG' : 'MEM'; const A = st.prog;
    if (st.nacin === 'JOG') h += '<div class="nap">os <b>' + st.jogOs + '</b> · korak kotača <b>' + st.jogInc + ' mm</b>' + (st.jogOs === 'X' ? ' (promjer)' : '') + ' · tipke gibanja ' + JOG_V[st.jogInc] + ' mm/min' + (st.rapid ? ' · <b>RAPID</b>' : '') + '</div>';
    if (A) { const cur = st.run && st.run.ime === A.ime && (st.run.ide || st.run.i > 0) ? st.run.trenRed : st.pregled; h += listaKoda(A.redci, cur, -1, true); }
    else h += '<div class="nap">Nije odabran program — LIST PROG → SELECT PROG.</div>';
  }
  ph.textContent = naslov; pane.innerHTML = h;
}
function crtaj() {
  const on = naOn();
  $('ngc-off').hidden = on;
  $('ngc-off-t').textContent = st.power === 'boot' ? 'Haas Next Generation Control\nučitavanje …' : st.sklopka ? 'Glavna sklopka je uključena. Pritisni POWER ON na privjesku.' : 'Upravljanje je isključeno (glavna sklopka na ormaru straga).';
  $('ngc-nacin').textContent = on ? NACIN_IME[st.nacin] : '—';
  $('ngc-prog').textContent = on ? (st.odabran ? st.odabran + ' (' + st.programi[st.odabran].naslov + ')' : 'NO PROGRAM') + (st.run && st.run.ide ? ' · RUNNING' : st.cekanje ? ' · WAITING' : '') : '';
  $('ngc-unos').textContent = on ? st.unos : '';
  const por = $('ngc-por'); por.className = 'ngc-por' + (st.alarmi.length ? ' alarm' : st.cekanje ? ' poruka' : ''); por.textContent = on ? (st.alarmi.length ? 'ALARM ' + st.alarmi.map((a) => a.br + ' ' + a.tekst).join(' · ') : st.poruka || 'READY') : '';
  crtajPoz(); crtajStanje(); crtajKod();
  document.querySelectorAll('[data-tipka]').forEach((b) => {
    const t = b.dataset.tipka;
    const pressed = { EDIT: st.nacin === 'EDIT', MEM: st.nacin === 'MEM', MDI: st.nacin === 'MDI', 'HANDLE JOG': st.nacin === 'JOG', 'ZERO RET': st.nacin === 'ZERO', 'LIST PROG': st.nacin === 'LIST',
      'SINGLE BLOCK': st.single, 'OPT STOP': st.optStop, 'DRY RUN': st.dryRun, RAPID: st.rapid, '.0001': st.jogInc === 0.001, '.001': st.jogInc === 0.01, '.01': st.jogInc === 0.1, '.1': st.jogInc === 1,
      PROGRAM: st.prikaz === 'PROGRAM', POSITION: st.prikaz === 'POSITION', OFFSET: st.prikaz === 'OFFSET', ALARMS: st.prikaz === 'ALARMS', 'SPINDLE FWD': st.dir > 0, 'SPINDLE REV': st.dir < 0, COOLNT: st.hlad }[t];
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(!!pressed && on));
  });
  document.querySelector('[data-tipka="CYCLE START"]').classList.toggle('radi', !!(st.run && st.run.ide));
  $('kot-os').textContent = on ? st.jogOs : '—'; $('kot-inc').textContent = on ? String(st.jogInc) : '—';
  const pr = (id, v) => { const b = $(id); if (b) b.setAttribute('aria-pressed', String(!!v)); };
  pr('k-on', on); pr('k-estop', st.estop); pr('k-sklopka', st.sklopka); pr('k-vrata', st.vrata);
  $('papir').innerHTML = tekstPapira();
}
function crtajPredmet() {
  const el = $('predmet'), A = st.prog;
  if (!A) { el.innerHTML = '<p class="pom">Odaberi program (LIST PROG → SELECT PROG): vježbe O03001 … O03004.</p>'; return; }
  const pr = st.programi[A.ime];
  let h = '<p><b>' + esc(A.ime) + ' ' + esc(pr.naslov) + '</b> · pripremak Ø' + pr.D + ' × ' + pr.L + ' mm · ' + A.redci.length + ' redaka' + (A.info.alati.size ? ' · alati ' + [...A.info.alati].map((t) => 'T' + t).join(', ') : '') + (A.info.cikl.size ? ' · ciklusi ' + [...A.info.cikl].map((g) => 'G' + g).join(', ') : '') + '</p>';
  if (pr.opis) h += '<p class="pom">' + esc(pr.opis) + '</p>';
  h += A.hod.length ? '<p class="upoz">Ne stane u hod: ' + esc(A.hod.join('; ')) + '.</p>' : '<p class="pom">Program stane u hod stroja (X 203 × Z 762 mm).</p>';
  if (A.alarmi.length) h += '<p class="upoz">Greška u programu: alarm ' + A.alarmi[0].br + ' — ' + esc(A.alarmi[0].tekst) + ' (red ' + (A.alarmi[0].red + 1) + ').</p>';
  if (A.upoz.length) h += '<p class="pom">Upozorenja: ' + esc(A.upoz.slice(0, 3).join('; ')) + (A.upoz.length > 3 ? ' …' : '') + '</p>';
  el.innerHTML = h;
}
function prikaziBlok(A, red) {
  const el = $('blok-obj');
  const redovi = []; for (let i = Math.max(A.prikRed + 1, red - 4); i <= red; i++) if (A.redci[i] && A.redci[i].trim()) redovi.push(i);
  A.prikRed = red; el.hidden = false;
  el.innerHTML = '<b>SINGLE BLOCK — izveden blok ' + (red + 1) + '</b>' + redovi.map((i) => '<div class="bo"><code>' + esc(A.redci[i]) + '</code><span>' + esc(A.obj[i]) + '</span></div>').join('') + '<p class="pom">CYCLE START izvodi sljedeći blok.</p>';
}

/* ================================================================== */
/* 11. Tipke upravljanja                                                 */
/* ================================================================== */
function cycleStart() {
  const z = zasto(true); if (z) { info(z); return; }
  if (st.jog) return;
  if (st.cekanje) {
    const c = st.cekanje; if (c.vrsta === 'alat' && st.alatU !== c.T) { info('Najprije zamijeni alat: u nosaču je T' + st.alatU + ', program traži T' + c.T + '.'); return; }
    st.cekanje = null; const A = c.A; A.ide = true; A.preskoci = true; st.run = A; status(A.ime === 'MDI' ? 'MDI nastavlja' : 'PROGRAM RUNNING — ' + A.ime); crtaj(); dogadaj('cycleStart'); return;
  }
  if (st.nacin === 'MDI') {
    const txt = st.mdi.redci.slice(st.mdi.kursor).join('\n'); if (!txt.trim()) { info('MDI program je prazan — upiši blok i pritisni ENTER.'); return; }
    const A = prevediProgram(txt + '\nM99', 'MDI'); A.redci = st.mdi.redci.slice(); A.obj = st.mdi.redci.map((l) => objasni(l).tekst);
    if (A.alarmi.length) { alarmProg(A.alarmi[0].br, A.alarmi[0].tekst); info('MDI: alarm ' + A.alarmi[0].br + ' — ' + A.alarmi[0].tekst, true); return; }
    A.B.forEach((b) => { b.red += st.mdi.kursor; }); A.ev.forEach((e) => { e.red += st.mdi.kursor; });
    st.run = A; A.ide = true; A.preskoci = true; status('MDI RUNNING'); crtaj(); dogadaj('cycleStart'); return;
  }
  if (st.nacin !== 'MEM') { info('CYCLE START pokreće program u načinu MEM (ili MDI).'); return; }
  let A = st.prog; if (!A) { info('Nije odabran program — LIST PROG → SELECT PROG.'); return; }
  if (st.run && st.run.ime === A.ime && st.run.ide) return;
  if (!st.run || st.run.ime !== A.ime || st.run.gotov || st.run.i === 0) { A = prevediProgram(st.programi[A.ime].tekst, A.ime); st.prog = A; if (A.alarmi.length) { alarmProg(A.alarmi[0].br, A.alarmi[0].tekst); info('Program ima grešku: alarm ' + A.alarmi[0].br + ' — ' + A.alarmi[0].tekst + ' (red ' + (A.alarmi[0].red + 1) + ').', true); return; } }
  else A = st.run;
  A.single = st.single; st.run = A; A.ide = true; A.preskoci = true;
  status('PROGRAM RUNNING — ' + A.ime); crtaj(); dogadaj('cycleStart');
}
function feedHold() { const A = st.run; if (!A || !A.ide) return; A.ide = false; status('FEED HOLD — CYCLE START nastavlja.'); crtaj(); dogadaj('hold'); }
function reset() {
  if (!naOn()) return;
  st.jog = null; st.homing = null; st.dir = 0; st.unos = ''; st.dlg = null; st.xdia = null; st.cekanje = null;
  const radio = st.run && st.run.ide; if (st.run) { st.run.ide = false; if (st.run.ime !== 'MDI') { st.run.i = 0; st.run.evI = 0; st.run.trenBlok = -1; st.run.trenRed = 0; st.run.zadRed = -1; st.run.gotov = false; st.run.zapoceta = -1; st.run.ev.forEach((e) => { delete e.ev.gotovo; }); } }
  $('blok-obj').hidden = true;
  if (st.estop) { st.alarmi = st.alarmi.filter((a) => a.br === 107); status('EMERGENCY STOP je pritisnut — alarm 107 ostaje.'); }
  else { st.alarmi = []; st.servo = true; status(st.homed ? 'READY' : 'Pogoni uključeni. Osi nisu referencirane — POWER UP ili ZERO RET → ALL.'); }
  if (radio && niz && niz.id === 'izvodenje') { info('RESET je prekinuo program: osi i vreteno stoje, program je na početku.'); }
  crtaj(); dogadaj('reset');
}
function estop(pritisnut) {
  st.estop = pritisnut;
  if (pritisnut) { st.jog = null; st.homing = null; st.dir = 0; st.servo = false; if (st.run) st.run.ide = false; st.cekanje = null; if (naOn() && !st.alarmi.some((a) => a.br === 107)) st.alarmi.push({ br: 107, tekst: 'EMERGENCY OFF' }); status('EMERGENCY STOP'); }
  else status('EMERGENCY STOP otpušten — pritisni RESET.');
  crtaj(); dogadaj('estop');
}
function powerOn() {
  if (!st.sklopka) { info('Glavna sklopka na ormaru nije uključena.'); return; }
  if (st.power !== 'off') return; st.power = 'boot'; st.bootT = 2.5; crtaj();
}
function powerOff() { if (st.power === 'off') return; st.power = 'off'; st.servo = false; st.homed = false; st.dir = 0; st.jog = null; st.homing = null; if (st.run) st.run.ide = false; st.run = null; st.cekanje = null; st.alarmi = []; crtaj(); }
function bootGotov() {
  st.power = 'on'; st.servo = false; st.homed = false; st.refOff = { ...st.fiz }; st.nacin = 'MEM'; st.prikaz = 'PROGRAM';
  st.alarmi = [{ br: 102, tekst: 'SERVOS OFF' }]; if (st.estop) st.alarmi.push({ br: 107, tekst: 'EMERGENCY OFF' });
  status('Otpusti EMERGENCY STOP i pritisni RESET, zatim POWER UP (ZERO RETURN).'); crtaj(); dogadaj('powerOn');
}
function nacin(n) { if (!naOn()) return; st.nacin = n; st.prikaz = 'PROGRAM'; st.dlg = null; st.xdia = null; st.unos = ''; if (n === 'EDIT' && !st.ed && st.odabran) st.ed = { ime: st.odabran, redci: st.programi[st.odabran].tekst.split('\n'), kursor: 0, undo: null }; crtaj(); dogadaj('nacin', { n }); }
function spremiEd() { if (!st.ed) return; st.programi[st.ed.ime].tekst = st.ed.redci.join('\n'); if (st.odabran === st.ed.ime) { st.prog = prevediProgram(st.programi[st.ed.ime].tekst, st.ed.ime); crtajPredmet(); } }
function tipka(t) {
  if (!naOn() && t !== 'RESET') { return; }
  const A = st.run;
  const broj = () => { const v = parseFloat(st.unos.replace(',', '.').replace('−', '-')); return isFinite(v) ? v : null; };
  switch (t) {
    case 'EDIT': case 'MEM': case 'MDI': nacin(t); return;
    case 'HANDLE JOG': nacin('JOG'); return; case 'ZERO RET': nacin('ZERO'); return; case 'LIST PROG': nacin('LIST'); st.listKur = Math.max(0, Object.keys(st.programi).sort().indexOf(st.odabran)); crtaj(); return;
    case 'PROGRAM': case 'POSITION': case 'ALARMS': st.prikaz = t; st.xdia = null; crtaj(); dogadaj('prikaz'); return;
    case 'OFFSET': if (st.prikaz === 'OFFSET') st.offTab = st.offTab === 'tool' ? 'work' : 'tool'; else st.prikaz = 'OFFSET'; st.offKur = { r: 0, c: 0 }; st.xdia = null; crtaj(); dogadaj('prikaz'); return;
    case 'SINGLE BLOCK': st.single = !st.single; if (A) A.single = st.single; if (!st.single) $('blok-obj').hidden = true; crtaj(); return;
    case 'OPT STOP': st.optStop = !st.optStop; crtaj(); return;
    case 'DRY RUN': st.dryRun = !st.dryRun; info('DRY RUN u simulatoru samo označava stanje — posmak se ne mijenja.'); crtaj(); return;
    case 'COOLNT': st.hlad = !st.hlad; crtaj(); return;
    case 'BLOCK DELETE': case 'SEND': case 'RECV': case 'HANDLE FEED': case 'HANDLE SPINDLE': case 'ORIGIN': case 'RECOVER': case 'NEXT TOOL': case 'TURRET FWD': case 'TURRET REV': case 'TS RAPID': case 'TS JOG': case 'HANDLE SCROLL': case 'JOG LOCK': case 'CHIP': case 'CHIP STOP': case 'FORWARD': case 'SHIFT': case 'F2': case 'F3': case 'F4': case 'CURRENT COMMANDS': case 'DIAGNOSTIC': case 'SETTING': case 'GRAPHICS': case 'MDI DNC': case 'HELP': case 'CALC': case 'PROGRAM CONVRS': case 'ATC FWD': case 'ATC REV': info('Tipka ' + t + ' u simulatoru nema učinka (TL-1 s nosačem alata: bez revolvera; konjić je ručni; transporter strugotine, postavke, dijagnostika i grafika nisu simulirani).'); return;
    case '.0001': case '.001': case '.01': case '.1': st.jogInc = INC_TIPKA[t]; crtaj(); dogadaj('inc'); return;
    case 'RAPID': st.rapid = !st.rapid; crtaj(); return;
    case 'ALL': zeroRet(); return;
    case 'HOME G28': { const z = zasto(); if (z) { info(z); return; } if (!st.homed) { info('Najprije ZERO RET → ALL.'); return; } st.homing = { red: ['X', 'Z'], k: 0 }; status('HOME G28 …'); crtaj(); return; }
    case 'SINGLE': { const o = st.unos.trim().toUpperCase(); if (!OSI.includes(o)) { info('Upiši slovo osi (X ili Z) pa SINGLE.'); return; } st.unos = ''; zeroRet([o]); return; }
    case 'FEED -10': st.fro = Math.max(0, st.fro - 10); crtaj(); dogadaj('fro'); return;
    case 'FEED +10': st.fro = Math.min(200, st.fro + 10); crtaj(); dogadaj('fro'); return;
    case 'FEED 100': st.fro = 100; crtaj(); dogadaj('fro'); return;
    case 'SPINDLE -10': st.sro = Math.max(50, st.sro - 10); crtaj(); return;
    case 'SPINDLE +10': st.sro = Math.min(150, st.sro + 10); crtaj(); return;
    case 'SPINDLE 100': st.sro = 100; crtaj(); return;
    case 'RAPID 5': case 'RAPID 25': case 'RAPID 50': case 'RAPID 100': st.rro = +t.split(' ')[1]; crtaj(); return;
    case 'SPINDLE FWD': case 'SPINDLE REV': { const z = zasto(); if (z) { info(z); return; } if (A && A.ide) return; if (st.vrata) { info('Klizna vrata su otvorena — vreteno se ne pokreće.'); return; } if (!st.S) { st.css = false; postaviS(500); } st.dir = t === 'SPINDLE FWD' ? 1 : -1; crtaj(); return; }
    case 'SPINDLE STOP': st.dir = 0; crtaj(); return;
    case 'CYCLE START': cycleStart(); return;
    case 'FEED HOLD': feedHold(); return;
    case 'RESET': reset(); return;
    case 'POWER UP': { const z = zasto(); if (z) { info(z); return; } zeroRet(); return; }
    case 'Z FACE MESUR': {
      if (st.prikaz !== 'OFFSET' || st.offTab !== 'tool') { info('Z FACE MESUR radi na kartici OFFSET → TOOL s kursorom na alatu.'); return; }
      if (!st.homed) { info('Osi nisu referencirane — vrijednost ne bi bila ponovljiva.'); return; }
      const T = Object.keys(ALATI)[st.offKur.r]; st.alati[T].Z = mach('Z'); status('T' + String(T).padStart(2, '0') + ' Z GEOMETRY = ' + dro(st.alati[T].Z) + ' (Z stroja).'); crtaj(); dogadaj('zfm', { T: +T }); return;
    }
    case 'X DIA MESUR': {
      if (st.prikaz !== 'OFFSET' || st.offTab !== 'tool') { info('X DIA MESUR radi na kartici OFFSET → TOOL s kursorom na alatu.'); return; }
      if (!st.homed) { info('Osi nisu referencirane — vrijednost ne bi bila ponovljiva.'); return; }
      st.xdia = mach('X'); st.unos = ''; status('X DIA MESUR: X stroja ' + dro(st.xdia) + ' zapamćen — upiši izmjereni promjer i ENTER.'); crtaj(); return;
    }
    case 'PART ZERO SET': {
      if (st.prikaz !== 'OFFSET' || st.offTab !== 'work') { info('PART ZERO SET radi na kartici OFFSET → WORK s kursorom na osi.'); return; }
      const g = [54, 55, 56, 57, 58, 59][st.offKur.r], o = OSI[st.offKur.c]; st.off[g][o] = mach(o) - offAl(o); status('G' + g + ' ' + o + ' = ' + dro(st.off[g][o]) + ' (stroj − korekcija alata).'); crtaj(); dogadaj('pzs', { os: o, g }); return;
    }
    case 'UP': case 'DOWN': case 'LEFT': case 'RIGHT': case 'PAGE UP': case 'PAGE DOWN': case 'HOME': case 'END': kursor(t); return;
    case 'CANCEL': if (st.dlg || st.xdia !== null) { st.dlg = null; st.xdia = null; st.unos = ''; } else st.unos = st.unos.slice(0, -1); crtaj(); return;
    case 'SPACE': st.unos += ' '; crtaj(); return;
    case 'EOB': st.unos += ';'; crtaj(); return;
    case 'ENTER': case 'INSERT': case 'ALTER': case 'DELETE': case 'UNDO': case 'F1': uredi(t, broj); return;
    case 'SELECT PROG': { if (st.nacin !== 'LIST') { info('SELECT PROG radi u LIST PROGRAM.'); return; } if (A && A.ide) { info('Program radi — najprije RESET.'); return; } const ime = Object.keys(st.programi).sort()[st.listKur]; if (ime) { odaberiProgram(ime); st.ed = null; } return; }
    case 'ERASE PROG': {
      if (st.nacin === 'MDI') { st.mdi = { redci: [], kursor: 0 }; status('MDI program obrisan.'); crtaj(); return; }
      if (st.nacin !== 'LIST') { info('ERASE PROG briše program pod kursorom u LIST PROGRAM ili MDI program.'); return; }
      const ime = Object.keys(st.programi).sort()[st.listKur]; if (!ime) return; if (st.programi[ime].ugradjen) { info('Ugrađeni programi vježbi se ne brišu; briši svoje (npr. O03005).'); return; }
      delete st.programi[ime]; if (st.odabran === ime) { st.odabran = null; st.prog = null; } if (st.ed && st.ed.ime === ime) st.ed = null; st.listKur = 0; status(ime + ' obrisan.'); crtajPredmet(); crtaj(); return;
    }
    default: if (t.length === 1) { st.unos += t; crtaj(); }
  }
}
function kursor(t) {
  if (st.prikaz === 'OFFSET') {
    const nr = st.offTab === 'tool' ? Object.keys(ALATI).length : 6, nc = st.offTab === 'tool' ? 4 : 2;
    if (t === 'UP') st.offKur.r = Math.max(0, st.offKur.r - 1); if (t === 'DOWN') st.offKur.r = Math.min(nr - 1, st.offKur.r + 1);
    if (t === 'LEFT') { if (st.offKur.c > 0) st.offKur.c--; else { st.offTab = st.offTab === 'tool' ? 'work' : 'tool'; st.offKur = { r: 0, c: 0 }; } }
    if (t === 'RIGHT') { if (st.offKur.c < nc - 1) st.offKur.c++; else { st.offTab = st.offTab === 'tool' ? 'work' : 'tool'; st.offKur = { r: 0, c: 0 }; } }
    if (t === 'HOME') st.offKur = { r: 0, c: 0 }; if (t === 'END') st.offKur.r = nr - 1;
    crtaj(); dogadaj('kursor'); return;
  }
  const kor = { UP: -1, DOWN: 1, 'PAGE UP': -10, 'PAGE DOWN': 10 }[t];
  if (st.nacin === 'LIST') { const n = Object.keys(st.programi).length; st.listKur = t === 'HOME' ? 0 : t === 'END' ? n - 1 : Math.max(0, Math.min(n - 1, st.listKur + (kor || 0))); }
  else if (st.nacin === 'EDIT' && st.ed) { const n = st.ed.redci.length; st.ed.kursor = t === 'HOME' ? 0 : t === 'END' ? Math.max(0, n - 1) : Math.max(0, Math.min(Math.max(0, n - 1), st.ed.kursor + (kor || 0))); }
  else if (st.nacin === 'MDI') { const n = st.mdi.redci.length; st.mdi.kursor = t === 'HOME' ? 0 : t === 'END' ? Math.max(0, n - 1) : Math.max(0, Math.min(Math.max(0, n - 1), st.mdi.kursor + (kor || 0))); }
  else if (st.nacin === 'JOG') { if (t === 'PAGE UP' || t === 'PAGE DOWN') { const i = INC.indexOf(st.jogInc); st.jogInc = INC[Math.max(0, Math.min(3, i + (t === 'PAGE UP' ? 1 : -1)))]; } }
  else if (st.prog && !(st.run && st.run.ide)) st.pregled = Math.max(0, Math.min(st.prog.redci.length - 1, st.pregled + (kor || 0)));
  crtaj();
}
function uredi(t, broj) {
  const u = st.unos.trim();
  if (st.prikaz === 'OFFSET' && (t === 'ENTER' || t === 'F1')) {
    const v = broj(); if (v === null) { info('Upiši broj pa ENTER (dodaje) ili F1 (upisuje).'); return; }
    if (st.offTab === 'tool') {
      const T = Object.keys(ALATI)[st.offKur.r];
      if (st.xdia !== null) { if (st.offKur.r !== Object.keys(ALATI).indexOf(String(T))) { /* kursor je na T */ } st.alati[T].X = st.xdia - v; status('T' + String(T).padStart(2, '0') + ' X GEOMETRY = ' + dro(st.alati[T].X) + ' (X stroja ' + dro(st.xdia) + ' − Ø' + dro(v) + ').'); st.xdia = null; st.unos = ''; crtaj(); dogadaj('xdm', { T: +T }); return; }
      const c = ['X', 'Z', 'Xw', 'Zw'][st.offKur.c]; st.alati[T][c] = t === 'F1' ? v : st.alati[T][c] + v; status('T' + String(T).padStart(2, '0') + ' ' + c.toUpperCase() + ' = ' + dro(st.alati[T][c]));
    } else { const g = [54, 55, 56, 57, 58, 59][st.offKur.r], o = OSI[st.offKur.c]; st.off[g][o] = t === 'F1' ? v : st.off[g][o] + v; status('G' + g + ' ' + o + ' = ' + dro(st.off[g][o])); }
    st.unos = ''; crtaj(); dogadaj('enterOff'); return;
  }
  if (st.nacin === 'LIST') {
    if (t === 'INSERT' && !st.dlg) { st.dlg = 'novi'; st.unos = ''; crtaj(); dogadaj('dlg'); return; }
    if (st.dlg === 'novi' && (t === 'ENTER' || t === 'INSERT')) {
      const m = u.toUpperCase().match(/^O?(\d{1,5})$/); if (!m) { info('Broj programa: O i do pet znamenki, npr. O03005.'); return; }
      const ime = 'O' + m[1].padStart(5, '0'); if (st.programi[ime]) { info('Program ' + ime + ' već postoji.'); return; }
      st.programi[ime] = { naslov: '', tekst: '', ugradjen: false, D: VJEZBA.D, L: VJEZBA.L, drz: VJEZBA.drz, alat: 1 };
      st.dlg = null; st.unos = ''; st.ed = { ime, redci: [], kursor: 0, undo: null }; st.nacin = 'EDIT'; st.prikaz = 'PROGRAM'; status(ime + ' stvoren — EDIT.'); crtaj(); dogadaj('novi'); return;
    }
    if (t === 'ENTER') { tipka('SELECT PROG'); return; }
    return;
  }
  if (st.nacin === 'MDI') {
    if (t === 'ENTER' || t === 'INSERT') { if (!u) { info('Upiši blok (npr. G97 S800 M03) pa ENTER.'); return; } const blok = u.replace(/;$/, '').trim(); st.mdi.redci.splice(st.mdi.redci.length ? st.mdi.kursor + 1 : 0, 0, blok); st.mdi.kursor = Math.min(st.mdi.redci.length - 1, st.mdi.kursor + (st.mdi.redci.length > 1 ? 1 : 0)); st.unos = ''; crtaj(); dogadaj('mdiUnos'); return; }
    if (t === 'DELETE') { if (st.mdi.redci.length) { st.mdi.redci.splice(st.mdi.kursor, 1); st.mdi.kursor = Math.max(0, Math.min(st.mdi.kursor, st.mdi.redci.length - 1)); } crtaj(); return; }
    if (t === 'ALTER') { if (u && st.mdi.redci.length) { st.mdi.redci[st.mdi.kursor] = u.replace(/;$/, '').trim(); st.unos = ''; } crtaj(); return; }
    return;
  }
  if (st.nacin === 'EDIT') {
    if (!st.ed) { if (t === 'INSERT') { st.nacin = 'LIST'; st.dlg = 'novi'; st.unos = ''; crtaj(); dogadaj('dlg'); } return; }
    const E = st.ed;
    if (t === 'ENTER' || t === 'INSERT') { if (!u) { info('Upiši blok pa ENTER ili INSERT.'); return; } const blok = u.replace(/;$/, '').trim(); const poz = E.redci.length ? E.kursor + 1 : 0; E.redci.splice(poz, 0, blok); E.kursor = poz; st.unos = ''; spremiEd(); crtaj(); dogadaj('edit'); return; }
    if (t === 'ALTER') { if (!u || !E.redci.length) { info('Upiši novi sadržaj bloka pa ALTER.'); return; } E.undo = { i: E.kursor, s: E.redci[E.kursor] }; E.redci[E.kursor] = u.replace(/;$/, '').trim(); st.unos = ''; spremiEd(); crtaj(); dogadaj('edit'); return; }
    if (t === 'DELETE') { if (!E.redci.length) return; E.undo = { i: E.kursor, s: E.redci[E.kursor], obrisano: true }; E.redci.splice(E.kursor, 1); E.kursor = Math.max(0, Math.min(E.kursor, E.redci.length - 1)); spremiEd(); crtaj(); dogadaj('edit'); return; }
    if (t === 'UNDO') { if (!E.undo) { info('Nema što vratiti.'); return; } if (E.undo.obrisano) E.redci.splice(E.undo.i, 0, E.undo.s); else E.redci[E.undo.i] = E.undo.s; E.kursor = E.undo.i; E.undo = null; spremiEd(); crtaj(); dogadaj('edit'); return; }
    return;
  }
  if (t === 'ENTER' && u) info('Unos „' + u + '” nema učinka u načinu ' + NACIN_IME[st.nacin] + '. Blokovi se upisuju u MDI ili EDIT.');
}

/* ================================================================== */
/* 12. Izbornik nizova, upute, početna stanja                            */
/* ================================================================== */
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n, i) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="kv">' + (i + 1) + '</span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korak + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k[0]) : 'Odaberi niz u izborniku lijevo.';
  $('pomoc').textContent = k ? k[1] : 'Nizovi se mogu raditi bilo kojim redom; svaki počinje od svojeg stanja stroja.';
  $('dalje').hidden = !(k && k[2] === 'dalje');
  crtajIzbornik(); crtaj();
}
function ukljuceno() { Object.assign(st, { sklopka: true, power: 'on', estop: false, servo: true, homed: true, refOff: { X: 0, Z: 0 }, alarmi: [], vrata: false }); }
/* X stroja za polumjer vrha r, Z stroja za x vrha */
const Xza = (r, T = st.alatU) => 2 * (r - R0 - ALAT_T(T).dr), Zza = (x, T = st.alatU) => x - ZT0 - ALAT_T(T).dx;
function pripremi(id) {
  const ub = st.ubrzanje; pocetno(); st.ubrzanje = ub; bezPribora(); st.alatU = 1; stroj3DAlat();
  if (id === 'ukljucivanje') { postaviVjezbu(); izmjeriAlate(celoObratka()); nultockaNaCelo(); st.fiz = { X: -120.5, Z: -312.4 }; return; }
  ukljuceno(); st.fiz = { X: -200, Z: -300 };
  postaviVjezbu();
  if (id === 'rucno') { st.fiz = { X: -150, Z: -250 }; st.jogInc = 0.1; }
  if (id === 'alat') { nultockaNaCelo(); st.fiz = { X: Xza(12), Z: Zza(celoObratka() + 12) }; st.nacin = 'JOG'; st.jogOs = 'Z'; st.jogInc = 0.1; }
  if (id === 'nultocka') { izmjeriAlate(REF_X); st.off[54] = { X: 0, Z: 0 }; st.fiz = { X: Xza(12), Z: Zza(celoObratka() + 10) }; st.nacin = 'JOG'; st.jogOs = 'Z'; st.jogInc = 0.1; }
  if (id === 'mdi' || id === 'pisanje' || id === 'izvodenje') { izmjeriAlate(celoObratka()); nultockaNaCelo(); st.fiz = { X: Xza(60), Z: Zza(celoObratka() + 60) }; }
  if (id === 'izvodenje') { bezPribora(); }
  if (id === 'pisanje') { st.ed = null; }
  if (!id) { izmjeriAlate(celoObratka()); nultockaNaCelo(); }
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korak = 0; $('ponovi').hidden = true; $('poruka').textContent = ''; $('blok-obj').hidden = true;
  pripremi(id); st.sbBroj = 0; status(naOn() ? 'READY' : '');
  crtajPredmet();
  pogled(id === 'ukljucivanje' ? 'stroj' : id === 'alat' || id === 'nultocka' || id === 'mdi' ? 'obradak' : 'radni');
  crtajKorak();
}

/* ================================================================== */
/* 13. Povezivanje                                                     */
/* ================================================================== */
$('nizovi').addEventListener('click', (e) => { const b = e.target.closest('[data-niz]'); if (b) pokreniNiz(b.dataset.niz); });
$('izbornik').addEventListener('click', () => { niz = null; korak = 0; crtajKorak(); });
$('dalje').addEventListener('click', () => dogadaj('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); else { pripremi(null); $('ponovi').hidden = true; $('poruka').textContent = ''; crtaj(); } });
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('brzina').addEventListener('change', () => { st.ubrzanje = +$('brzina').value; });
{ const el = $('alfa'); const redci = [['SHIFT', 'A', 'B', 'C', 'D', 'E', '7', '8', '9'], ['F', 'G', 'H', 'I', 'J', 'K', '4', '5', '6'], ['L', 'M', 'N', 'O', 'P', 'Q', '1', '2', '3'], ['R', 'S', 'T', 'U', 'V', 'W', '-', '0', '.'], ['X', 'Y', 'Z', 'EOB', '(', ')', 'CANCEL', 'SPACE', 'ENTER']];
  const nat = { ENTER: 'WRITE<br>ENTER', EOB: 'EOB', CANCEL: 'CANCEL', SPACE: 'SPACE', SHIFT: 'SHIFT' };
  el.innerHTML = redci.map((r) => r.map((z) => '<button type="button" class="tk' + (/^[0-9.\-]$/.test(z) ? ' tk-n' : z.length > 1 ? ' tk-f' : '') + '" data-tipka="' + z + '">' + (nat[z] || z) + '</button>').join('')).join(''); }
document.querySelectorAll('[data-tipka]').forEach((b) => b.addEventListener('click', () => tipka(b.dataset.tipka)));
document.querySelectorAll('[data-jog]').forEach((b) => {
  const o = b.dataset.jog[0], s = b.dataset.jog.includes('-') ? -1 : 1;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.focus(); jogStart(o, s); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, jogStop));
  b.addEventListener('click', (e) => { if (e.detail !== 0) return; jogStart(o, s); setTimeout(jogStop, 300); });
});
document.querySelectorAll('[data-kotac]').forEach((b) => b.addEventListener('click', () => kotac(+b.dataset.kotac)));
$('kotac').addEventListener('wheel', (e) => { e.preventDefault(); kotac(e.deltaY > 0 ? 1 : -1); }, { passive: false });
const TIPKE_JOG = { ArrowLeft: -1, ArrowRight: 1 };
let drziTipku = null;
$('upravljanje').addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (!naOn()) return;
  const k = e.key;
  if (st.nacin === 'JOG') {
    if (k in TIPKE_JOG) { e.preventDefault(); kotac(TIPKE_JOG[k]); return; }
    if (/^[xzXZ]$/.test(k)) { e.preventDefault(); st.jogOs = k.toUpperCase(); crtaj(); dogadaj('jogOs', { os: st.jogOs }); return; }
    if (k === 'PageUp' || k === 'PageDown') { e.preventDefault(); kursor(k === 'PageUp' ? 'PAGE UP' : 'PAGE DOWN'); return; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); if (e.repeat) return; drziTipku = k; jogStart(st.jogOs, k === 'ArrowUp' ? 1 : -1); return; }
  }
  if (k === 'Enter') { e.preventDefault(); tipka('ENTER'); return; }
  if (k === 'Backspace') { e.preventDefault(); st.unos = st.unos.slice(0, -1); crtaj(); return; }
  if (k === 'Escape') { e.preventDefault(); tipka('CANCEL'); return; }
  if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'PageUp' || k === 'PageDown' || k === 'Home' || k === 'End') { e.preventDefault(); kursor({ ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', PageUp: 'PAGE UP', PageDown: 'PAGE DOWN', Home: 'HOME', End: 'END' }[k]); return; }
  if (k.length === 1 && /[A-Za-z0-9 .,;()\-]/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); st.unos += k.toUpperCase(); crtaj(); }
});
$('upravljanje').addEventListener('keyup', (e) => { if (e.key === drziTipku) { drziTipku = null; jogStop(); } });
$('k-on').addEventListener('click', powerOn);
$('k-off').addEventListener('click', powerOff);
$('k-estop').addEventListener('click', () => estop(!st.estop));
$('k-sklopka').addEventListener('click', () => { st.sklopka = !st.sklopka; if (!st.sklopka) powerOff(); crtaj(); dogadaj('sklopka'); });
$('k-vrata').addEventListener('click', () => { st.vrata = !st.vrata; if (st.vrata && st.run && st.run.ide) { st.run.ide = false; st.dir = 0; status('DOOR OPEN — program zaustavljen (door hold).'); } S.vrataNa(st.vrata ? 1 : 0); crtaj(); dogadaj('vrata'); });
$('k-alat').addEventListener('click', () => {
  if (st.rpm > 1 || st.dir) { info('Vreteno se vrti — najprije ga zaustavi (SPINDLE STOP ili M05).'); return; }
  if (!st.vrata) { info('Otvori klizna vrata za ručnu izmjenu alata.'); return; }
  const c = st.cekanje && st.cekanje.vrsta === 'alat' ? st.cekanje.T : (st.alatU % Object.keys(ALATI).length) + 1;
  const prije = st.alatU; st.alatU = c; const t = vrh(); if (uGlavi(t) || (O && uMaterijalu(O, ALAT_T(c), t.x, t.r) > 0)) { st.alatU = prije; info('Alat T' + c + ' je drukčije duljine — ne stane uz obradak u ovom položaju. Najprije odmakni suport (+X, +Z).'); return; }
  st.T = c; stroj3DAlat(); status('Alat T' + c + ' je u nosaču (ručno).'); info('U nosač je stavljen T' + c + ' (' + ALATI[c].naziv + ').'); crtaj(); dogadaj('alat', { T: c });
});
const ray = new THREE.Raycaster(), mis = new THREE.Vector2(); let dolje = null;
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('click', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje[0], e.clientY - dolje[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera); const h = ray.intersectObjects(Object.values(S.klik), false);
  if (!h.length) return; const k = h[0].object.userData.klik;
  if (k === 'estop') estop(!st.estop); else if (k === 'powerOn') powerOn(); else if (k === 'powerOff') powerOff(); else if (k === 'cycleStart') cycleStart(); else if (k === 'kotac') kotac(1); else if (k === 'sklopka') $('k-sklopka').click();
});

/* ================================================================== */
/* 14. Petlja                                                          */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now(), zadnjiUI = 0, zadnjiEkran = 0, kut = 0, pauza = false;
function simuliraj(dt, dtr, t) {
  if (st.power === 'boot') { st.bootT -= dtr; if (st.bootT <= 0) bootGotov(); }
  if (!st.alarm) { korakRef(dt); korakJog(dt); korakProg(dt); }
  const c = rpmCilj(), ac = 1500 * dt * Math.max(1, st.ubrzanje); st.rpm = st.rpm < c ? Math.min(c, st.rpm + ac) : Math.max(c, st.rpm - ac);
  if (st.rpm > 0) { kut += Math.min(0.6, st.rpm / 1800 * 0.6) * (st.dir < 0 ? -1 : 1); S.okreniGlavu(kut); }
  if (t - zadnjiUI > 90) { zadnjiUI = t; if (st.jog || st.homing || (st.run && st.run.ide) || Math.abs(st.rpm - c) > 1) crtaj(); }
}
function prikazi(t) {
  if (O) osvjezi(THREE, O);
  S.postaviOsi(st.fiz.X, st.fiz.Z);
  S.svjetlo.material.emissiveIntensity = naOn() ? 0.8 : 0;
  S.klik.estop.position.z = st.estop ? 85 + 6 : 85 + 12;
  S.klik.sklopka.rotation.z = st.sklopka ? 0 : Math.PI / 2;
  if (t - zadnjiEkran > 400) { zadnjiEkran = t; S.zaslonTekst(naOn(), NACIN_IME[st.nacin], OSI.map((o) => dro(rad(o)))); }
  controls.update(); renderer.render(scene, camera);
}
function petlja(t) {
  const dtr = Math.max(0, (t - zadnje) / 1000), dt = Math.min(0.1, dtr); zadnje = t;
  if (!pauza) { simuliraj(dt, dtr, t); prikazi(t); }
  requestAnimationFrame(petlja);
}
pripremi(null); stroj3DAlat();
crtajIzbornik(); crtajKorak(); crtajPredmet(); velicina(); pogled('stroj');
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__tl1 = {
  st, NIZOVI, pokreniNiz, dogadaj, odaberiProgram, tipka, cycleStart, papir, kotac, ALATI, GEO, S,
  get niz() { return niz; }, get korak() { return korak; }, get O() { return O; }, Xza, Zza, celoObratka, vrh,
  postavi(p) { Object.assign(st.fiz, p); dogadaj('pomak', p); crtaj(); },
  pogled, pauza(v) { pauza = v; if (v) { zadnjiEkran = 0; prikazi(performance.now()); crtaj(); } else zadnje = performance.now(); },
  sim(n, dt = 0.1, doKoraka = 1e9) { for (let i = 0; i < n; i++) { zadnjiUI = 0; simuliraj(dt, dt, 0); if (st.alarm || korak >= doKoraka) break; } crtaj(); return korak; }
};
requestAnimationFrame(petlja);
