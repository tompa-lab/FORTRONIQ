/* FORTRONIQ · CNC tokarenje, SINUMERIK 840D — Postavljanje stroja (simulator s koracima).
   Redoslijed nizova i koraka prema tečaju SITRAIN 840D (tokarenje); tekst, model, programi PR39/PR90/PR98 i sučelje su naši.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviStroj, ALATI as GEOM, PRIPREMAK } from './strojTok.js?v=01';
import { objasni } from './gkodT.js?v=01';

const $ = (id) => document.getElementById(id);
const br = (v, d = 3) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const OSI = ['X', 'Z'];

/* ================================================================== */
/* 1. Podaci stroja (vrijednosti korekcija iz tečaja; geometrija je naša) */
/* ================================================================== */
const REF = { X: 300, Z: 450 };                         /* referentna točka revolvera F (MKS, X kao promjer) */
const HOD = { X: [-10, 320], Z: [-30, 460] };
const TCP = { X: 300, Z: 450 };                         /* točka izmjene alata (potprogram TCP) */
const G54_POC = { X: 0, Z: 127.539 };                   /* pomak G54 iz tečaja */
const TIP = { 500: 'Rough turning tool', 510: 'Finishing tool', 520: 'Cutting-in tool', 540: 'Thread cutting tool', 200: 'Drill', 120: 'End mill' };
function alatiPocetno(korigiran) {
  return {
    1: { naziv: 'External roughing tool 80°', tip: 500, pol: 3, L1: 49.606, L2: 63.485, R: 0.8 },
    2: { naziv: 'Full drilling tool 32mm', tip: 200, pol: 7, L1: 7.036, L2: 171.866, R: 0.3 },
    3: korigiran ? { naziv: 'External finishing tool 35°', tip: 510, pol: 3, L1: 52.258, L2: 63.589, R: 0.4 } : { naziv: 'External finishing tool 35°', tip: 510, pol: 3, L1: 56.946, L2: 71.888, R: 0.2 },
    4: { naziv: 'Internal roughing tool 80°', tip: 500, pol: 2, L1: 11.811, L2: 204.739, R: 0.8 },
    5: { naziv: 'External cut-off tool 1.8mm', tip: 520, pol: 3, L1: 44.970, L2: 67.199, R: 0.1 },
    6: { naziv: 'Internal finishing tool 35°', tip: 510, pol: 2, L1: 16.784, L2: 209.350, R: 0.4 },
    7: { naziv: 'External thread-cutting tool', tip: 540, pol: 8, L1: 44.673, L2: 62.147, R: 0.1 },
    8: { naziv: 'Slot milling tool 10mm', tip: 120, pol: 0, L1: 30, L2: 150, R: 5 }
  };
}
let ALATI = alatiPocetno(false);
const VMDEMO = ['G54', 'LIMS=3500', 'G96 F0.2 S200 T1 M4', 'G0 X82 Z0', 'G1 X-0.8', 'G0 Z1', 'TCP', 'G96 F0.1 S140 T5 M4', 'CYCLE93(80,-30,5,5,0,15,15,1,1,1,1,0,0,5,0,15,0)', 'TCP', 'M30'];
const C93 = [
  ['SPD', 'Start point (X)', 'početni promjer', 80], ['SPL', 'Start point (Z)', 'početna točka u uzdužnoj osi', -30], ['WIDG', 'Width', 'širina utora', 5], ['DIAG', 'Cut-in depth', 'dubina utora', 5],
  ['STA1', 'Angle', 'kut konture prema uzdužnoj osi', 0], ['ANG1', 'Flank angle 1', 'kut boka na strani početne točke', 15], ['ANG2', 'Flank angle 2', 'kut drugog boka', 15],
  ['RCO1', 'Transition 1 (out)', 'prijelaz na vanjskom bridu 1', 1], ['RCO2', 'Transition 2 (out)', 'prijelaz na vanjskom bridu 2', 1], ['RCI1', 'Transition 1 (in)', 'prijelaz na dnu 1', 1], ['RCI2', 'Transition 2 (in)', 'prijelaz na dnu 2', 1],
  ['FAL1', 'Allowance base', 'dodatak na dnu', 0], ['FAL2', 'Allowance flanks', 'dodatak na bokovima', 0], ['IDEP', 'Infeed depth', 'dubina jednog uboda', 5], ['DTB', 'Dwell time', 'zastoj na dnu (s)', 0], ['VARI', 'Machining type', 'vrsta obrade', 15], ['_VRT', 'Retraction', 'povratni put', 0]
];
const PROGRAMI_NASI = {
  PR39: `; PR39 - stepenasta osovina (nas primjer)
G18 G54 G90 G95
LIMS=3000
T1 D1 ; vanjski nož za grubo tokarenje
G96 S200 M4 M8
G0 X84 Z0
G1 X-1.6 F0.2 ; poravnanje čela
G0 Z2
G0 X76.4
G1 Z-39.9 F0.25 ; grubo Ø76
G1 X81
G0 Z2
G0 X72
G1 Z-29.9
G1 X77
G0 Z2
G0 X70.4
G1 Z-29.9 ; grubo Ø70
G1 X77
G0 Z2
G0 X66
G1 Z-17.9
G1 X71
G0 Z2
G0 X62
G1 Z-17.9
G1 X71
G0 Z2
G0 X60.4
G1 Z-17.9 ; grubo Ø60
G1 X71
G0 X100 Z50 M9
TCP
T3 D1 ; vanjski nož za fino tokarenje
G96 S250 M4 M8
G0 X56 Z2
G42 G1 X56 Z0 F0.1
G1 X58
G1 X60 Z-1 ; skošenje 1 × 45°
G1 Z-18
G1 X68
G1 X70 Z-19
G1 Z-30
G1 X74
G1 X76 Z-31
G1 Z-40
G1 X82
G40 G0 X100 Z50 M9
TCP
T5 D1 ; nož za usijecanje 1,8 mm
G96 S120 M4 M8
G0 X64 Z-12
G1 X56 F0.06 ; utor 2 mm dubok
G0 X64
G0 Z-10.6
G1 X56
G0 X64
G0 X100 Z50 M9
TCP
M30`,
  PR90: `; PR90 - čahura s provrtom (nas primjer)
G18 G54 G90 G95
LIMS=2500
T1 D1 ; vanjski nož za grubo tokarenje
G96 S200 M4 M8
G0 X84 Z0
G1 X-1.6 F0.2 ; poravnanje čela
G0 Z2
G0 X76.4
G1 Z-40 F0.25 ; vanjski promjer Ø76
G1 X82
G0 X100 Z50
TCP
T2 D1 ; svrdlo Ø32
G97 S800 M4
G0 X0 Z5
G1 Z-50 F0.12 ; bušenje u puno
G0 Z5
TCP
T4 D1 ; unutarnji nož za grubo tokarenje
G96 S160 M4
G0 X35 Z2
G1 Z-40 F0.2 ; provrt Ø35
G1 X33
G0 Z2
G0 X38
G1 Z-25 ; provrt Ø38
G1 X36
G0 Z2
G0 X40
G1 Z-25 F0.12 ; provrt Ø40
G1 X37
G0 Z5 M9
TCP
M30`,
  PR98: `; PR98 - vratilo s navojem M60x2 (nas primjer)
G18 G54 G90 G95
LIMS=3000
T1 D1 ; vanjski nož za grubo tokarenje
G96 S200 M4 M8
G0 X84 Z0
G1 X-1.6 F0.2 ; poravnanje čela
G0 Z2
G0 X70
G1 Z-35 F0.25
G1 X82
G0 Z2
G0 X62
G1 Z-35
G1 X72
G0 Z2
G0 X60
G1 Z-35 ; promjer navoja Ø60
G1 X72
G0 X100 Z50
TCP
T5 D1 ; nož za usijecanje: utor za izlaz navoja
G96 S120 M4
G0 X64 Z-31
G1 X56 F0.06
G0 X64
G0 Z-29.4
G1 X56
G0 X64
TCP
T7 D1 ; nož za navoj
G97 S600 M4
G0 X62 Z5
G0 X59.2
G33 Z-28 K2 ; 1. prolaz
G0 X62
G0 Z5
G0 X58.6
G33 Z-28 K2 ; 2. prolaz
G0 X62
G0 Z5
G0 X58.1
G33 Z-28 K2 ; 3. prolaz
G0 X62
G0 Z5
G0 X57.7
G33 Z-28 K2 ; 4. prolaz
G0 X62
G0 Z5
G0 X57.5
G33 Z-28 K2 ; 5. prolaz
G0 X62
G0 Z5 M9
TCP
M30`
};
const OPIS_PR = {
  PR39: 'Stepenasta osovina: poravnanje čela, gruba obrada promjera Ø76, Ø70 i Ø60 (T1), završna obrada konture sa skošenjima i korekcijom polumjera oštrice G42 (T3) te utor širine 3,2 mm i dubine 2 mm na Ø60 (T5).',
  PR90: 'Čahura: poravnanje čela i vanjskog promjera Ø76 (T1), bušenje u puno svrdlom Ø32 (T2) i proširivanje provrta na Ø35, Ø38 i Ø40 unutarnjim nožem (T4).',
  PR98: 'Vratilo s navojem M60 × 2: poravnanje čela, tokarenje Ø60 (T1), utor za izlaz navoja (T5) i navoj u pet prolaza naredbom G33 (T7).',
  VMDEMO: 'VMDEMO s tečaja: poravnanje čela (T1) i utor ciklusom CYCLE93 nožem za usijecanje (T5).'
};

/* ================================================================== */
/* 2. Nizovi i koraci (redoslijed kao u tečaju, tekst naš)              */
/* ================================================================== */
const NIZOVI = [
  { id: 'ukljucivanje', grupa: 'Postavljanje stroja', naziv: 'Uključivanje', koraci: [
    ['Uključi stroj glavnom sklopkom i pričekaj da se upravljanje pokrene.', 'Glavna sklopka je iza stroja, na desnim vratima električnog ormara (pogled „Straga”). Klikni je u 3D prikazu ili gumb „Glavna sklopka” ispod prikaza.', 'sklopka'],
    ['Otpusti gljivu za nužno zaustavljanje.', 'Klikni crvenu gljivu na strojnoj upravljačkoj ploči — gljiva se zakretanjem otpušta.', 'gljiva'],
    ['Uključi pogone vretena i osi posmaka.', 'Pritisni tipku ( I ), a zatim SPINDLE START i FEED START.', 'pogoni'],
    ['Vrati upravljanje u početno stanje.', 'Pritisni RESET.', 'reset'],
    ['Najprije dovedi os X u referentnu točku.', 'Pritisni tipku osi X, a zatim tipku smjera +. Na tokarilici os X ide prva: revolver se najprije odmakne od obratka i stezne glave.', 'refX'],
    ['Sada dovedi os Z u referentnu točku.', 'Pritisni tipku osi Z, a zatim tipku smjera +.', 'refZ'],
    ['Kraj niza „Uključivanje”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'rucno', grupa: 'Postavljanje stroja', naziv: 'Ručno gibanje', koraci: [
    ['Upoznaj osi i smjerove gibanja i zakreni revolver. Za to odaberi način rada JOG.', 'Pritisni tipku JOG.', 'jog'],
    ['Zakreni revolver na alat T4.', 'Revolver se zakreće tipkama +T i −T. Mogu se odabrati i drugi alati, ali niz se nastavlja samo s T4.', 't4'],
    ['Prijeđi u način rada MDA.', 'Pritisni tipku MDA.', 'mda'],
    ['Upiši „G97 S1000 M4”, a zatim pritisni CYCLE START.', 'Krivo upisani znak briše se tipkama BACKSPACE i DEL.', 's1000'],
    ['Zatim se vrati u način rada JOG.', 'Pritisni tipku JOG.', 'jog'],
    ['Upoznaj osi i smjerove, ali bez sudara! Zatim dovedi alat u položaj X50 / Z8 u koordinatnom sustavu obratka (WKS). Za točan položaj koristi korake (INC). Pazi: prikaz položaja sada je u koordinatnom sustavu stroja (MKS).', 'Rade tipke X, Z, +, −, RAPID, −T i +T, korekcija posmaka i brzine vrtnje te okomiti softkey za prebacivanje prikaza MKS / WKS. Tipke 1, 10, 100, 1000 i 10000 daju korak od 1 µm do 10 000 µm, a JOG kontinuirano gibanje. X je promjer.', 'polozaj'],
    ['Kraj niza „Ručno gibanje”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'korekcije', grupa: 'Postavljanje stroja', naziv: 'Korekcije alata', koraci: [
    ['Završni nož T3 dobio je novu reznu pločicu i ponovno je izmjeren: X 52,258, Z 63,589 i R 0,4. Upiši vrijednosti korekcije u upravljanje.', 'Pritisni MENU SELECT, a zatim vodoravni softkey Parameter.', 'parametri'],
    ['Prijeđi na podatke alata s brojem T3.', 'Okomitim softkeyima T-No + i T-No − mijenja se broj alata.', 't3'],
    ['Upiši nove vrijednosti korekcije: Length1 = 52.258, Length2 = 63.589, Radius = 0.4.', 'Tipkama kursora ili INPUT prelazi se u polje; vrijednost se upisuje i potvrđuje tipkom INPUT.', 'unos'],
    ['Vrati se u područje Machine: stvarna vrijednost u X i Z promijenila se (X s 186.108 na 195.484, Z s 378.112 na 386.411).', 'Pritisni tipku MACHINE.', 'machine'],
    ['Kraj niza „Korekcije alata”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'nultocka', grupa: 'Postavljanje stroja', naziv: 'Nultočka obratka', koraci: [
    ['Nultočka u Z određuje se zarezivanjem čela alatom T1. Brzina i smjer vrtnje vretena programiraju se u načinu MDA.', 'Pritisni tipku MDA. Blok je već upisan (T1 D1 G97 S800 M4) — preuzmi ga tipkom CYCLE START.', 'mdaT1'],
    ['U načinu JOG otvori prozor za zarezivanje (Scratching).', 'Pritisni tipku JOG i vodoravni softkey Scratching.', 'scratching'],
    ['Odaberi pomak nultočke G54, a zatim stavi kursor u polje za Z.', 'Upiši G54 i potvrdi tipkom INPUT. Zatim ponovno pritisni INPUT ili CURSOR DOWN.', 'poljeZ'],
    ['Dovedi alat uz čelo na prikladan promjer. Oprezno se približi čelu u koracima, a zatim zareži čelo korakom od najviše 100 (= 0,1 mm).', 'Tipke Z, X, + i − za gibanje, 10000 … 1 za korak i JOG za kontinuirano gibanje. Gledaj iz dobrog kuta (gumb „Obradak” iznad prikaza). Vreteno se mora vrtjeti.', 'zarez'],
    ['Odmakni alat od čela u smjeru +X.', 'Odaberi JOG (ili korak), os X i pomakni tipkom +, dok vrh alata ne bude iznad promjera obratka. Z se ne smije mijenjati.', 'odmak'],
    ['Upiši smislenu vrijednost za „Setpoint position”. Nultočka obratka mora biti na čelu.', 'Upiši vrijednost između 0 i 1 i pritisni INPUT. Mijenja se pomak u stupcu „offset”. Za koliko je zarezano čelo iznad nultočke, toliko će program VMDEMO skinuti pri poravnanju čela.', 'unosZ'],
    ['Preuzmi upisano.', 'Pritisni okomiti softkey OK. Prikaz položaja tada pokazuje novu stvarnu vrijednost.', 'ok'],
    ['Kraj niza „Nultočka obratka”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'pisanje', grupa: 'Programiranje', naziv: 'Pisanje programa', koraci: [
    ['Prijeđi u područje Program.', 'Pritisni MENU SELECT i vodoravni softkey Program, ili izravno tipku PROGRAM.', 'program'],
    ['Napravi novi program i nazovi ga „VMDEMO”.', 'Pritisni okomiti softkey New… — ime se upisuje samo. Potvrdi ga tipkom INPUT i okomitim softkeyem OK.', 'novi'],
    ['Program je napravljen. Upiši „G54” za pomak nultočke.', 'Unos završi tipkom INPUT.', 'pG54'],
    ['Upiši naredbu „LIMS=3500” za ograničenje brzine vrtnje.', 'Unos završi tipkom INPUT.', 'pLIMS'],
    ['Ovdje se sljedeći retci programa dodaju sami.', 'Pritisni „Dalje”.', 'dalje'],
    ['Sada treba programirati usijecanje (utor). Prozor za unos ciklusa otvara se softkeyima.', 'Pritisni vodoravni softkey Turning, a zatim okomiti softkey Cut-in.', 'urez'],
    ['Polja su već popunjena. Preuzmi ciklus u program.', 'Pritisni softkey OK.', 'urezOK'],
    ['Ciklus je ovako upisan u program. I ovdje se dodaju sljedeći retci.', 'Pritisni „Dalje”.', 'dalje'],
    ['Izađi iz programa.', 'Pritisni RECALL, zatim okomiti softkey Exit editor i pitanje potvrdi softkeyem Yes.', 'izlaz'],
    ['Kraj niza „Pisanje programa”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'uredivanje', grupa: 'Programiranje', naziv: 'Uređivanje programa', koraci: [
    ['Otvori program „VMDEMO” za uređivanje.', 'Označi program tipkom CURSOR DOWN i pritisni INPUT.', 'otvori'],
    ['U trećem bloku promijeni posmak na 0.3.', 'Stavi kursor iza znamenke 2, izbriši je tipkom BACKSPACE i upiši 3.', 'f03'],
    ['Provjeri vrijednost u ciklusu CYCLE93. Ciklus se za to mora „prevesti natrag” u prozor za unos.', 'Stavi kursor u redak s ciklusom CYCLE93 i pritisni vodoravni softkey Translate back.', 'natrag'],
    ['Ovdje je početna točka u Z (SPL) greškom promijenjena s −30 na −40. Pritiskom na OK ciklus bi se preuzeo s novom vrijednošću. Poništi izmjenu.', 'Pritisni okomiti softkey Abort ili tipku RECALL.', 'abort'],
    ['Zatvori editor.', 'Pritisni softkey Exit editor i pitanje potvrdi softkeyem Yes.', 'izlaz'],
    ['Kraj niza „Uređivanje programa”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'izvodenje', grupa: 'Programiranje', naziv: 'Izvođenje programa', koraci: [
    ['Treba izvesti jedan od programa PR39, PR90 ili PR98.', 'Označi program, pritisni okomite softkeyeve Load i Selection, a zatim tipku AUTO. Opis odabranog programa prikazan je ispod stroja.', 'odabir'],
    ['Prijeđi u područje Machine.', 'Pritisni MENU SELECT i vodoravni softkey Machine, ili izravno tipku MACHINE.', 'machine'],
    ['Zbog sigurnosti smanji posmak na 10 % prije pokretanja programa.', 'Korekciju posmaka (desni klizač na ploči) smanji na 10 %.', 'f10'],
    ['Pokreni program.', 'Pritisni CYCLE START.', 'start'],
    ['Tijekom obrade korekcija posmaka smije se ponovno povećati. Obrada se prekida gljivom za nužno zaustavljanje.', 'Pričekaj kraj programa.', 'gotovo'],
    ['Čestitamo! Kad prođeš sve nizove, spreman si za vježbu na stroju.', 'Klikni „Izbornik”.', 'kraj']] }
];
const PREKID = 'Program je prekinut gljivom za nužno zaustavljanje. Sve osi su zaustavljene i svi pogoni isključeni.';

/* ================================================================== */
/* 3. Stanje                                                          */
/* ================================================================== */
const st = {};
function pocetnoStanje() {
  ALATI = alatiPocetno(false);
  Object.assign(st, {
    struja: false, gljiva: true, pogoniI: false, vrEn: false, posEn: false, alarm: true,
    nacin: 'JOG', refNacin: true, inc: 0, os: null, podrucje: 'Machine',
    ref: { X: false, Z: false }, nos: { X: 254.6, Z: 371.2 }, T: 1, Tkut: 1, D: 1, G54: { ...G54_POC }, wks: false,
    S: 0, Sset: 0, g96: false, vc: 0, lims: 4000, smjerV: 4, vreteno: false, fOver: 100, sOver: 100, kut: 0,
    programi: Object.assign({}, PROGRAMI_NASI), mda: '', ed: null, dijalog: null, ucitan: null, listaKursor: 0,
    alatParam: 1, paramPolje: 0, unos: '', vsk: null, izbornik: false,
    scratch: null, auto: null, pomicanje: null, sudar: null, kontura: null, zarez: null, sbl: false
  });
}
pocetnoStanje();
let niz = null, korak = 0, gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-cnc-tok-840d-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-cnc-tok-840d-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }

/* upravljanje računa vrh alata iz tablice korekcija; fizika (rezanje, sudar) iz stvarne geometrije alata */
const kor = (t) => ALATI[t] || { L1: 0, L2: 0, R: 0 };
const prikazMKS = (o) => (o === 'X' ? st.nos.X - 2 * kor(st.T).L1 : st.nos.Z - kor(st.T).L2);
const prikazWKS = (o) => prikazMKS(o) - st.G54[o];
function vrhStvarni() { const g = GEOM[st.T]; return g ? { X: st.nos.X - 2 * g.L1, Z: st.nos.Z - g.L2 } : null; }

function pripremi(id) {
  pocetnoStanje();
  if (id === 'ukljucivanje') return;
  Object.assign(st, { struja: true, gljiva: false, pogoniI: true, vrEn: true, posEn: true, alarm: false, refNacin: false, ref: { X: true, Z: true } });
  st.nos = { ...REF };
  if (id === 'korekcije') { st.T = 3; st.Tkut = 3; }
  if (id !== 'korekcije' && id !== 'rucno') ALATI = alatiPocetno(true);
  if (id === 'nultocka') { st.nos = { X: 250, Z: 260 }; }
  if (id === 'pisanje' || id === 'uredivanje' || id === 'izvodenje') {
    if (id !== 'pisanje') st.programi.VMDEMO = VMDEMO.join('\n');
  }
}

/* ================================================================== */
/* 4. Obradak: polumjeri po Z (vanjski ro, unutarnji ri)                */
/* ================================================================== */
const DZ = 0.1, NC = Math.round((PRIPREMAK.Z1 - PRIPREMAK.Z0) / DZ), ZA = PRIPREMAK.Z1 - NC * DZ;   /* stanica i: [ZA + i·DZ, ZA + (i+1)·DZ], zadnja završava točno na čelu */
const ro = new Float32Array(NC), ri = new Float32Array(NC);
const zc = (i) => ZA + (i + 0.5) * DZ;
let prljavo = true;
function noviPripremak() {
  for (let i = 0; i < NC; i++) { ro[i] = PRIPREMAK.R; ri[i] = 0; }
  prljavo = true;
}
function celo() { for (let i = NC - 1; i >= 0; i--) if (ro[i] > ri[i] + 1e-4) return Math.min(PRIPREMAK.Z1, zc(i) + DZ / 2); return ZA; }
const iz = (z) => Math.floor((z - ZA) / DZ);
const uz = (z, a, b) => Math.min(Math.max(z, a), b);   /* točka stanice najbliža području alata */
/* jedna točka putanje alata: skida materijal, vraća { dub, sudar } */
function rezi(T, zt, rt, sim) {
  const g = GEOM[T]; if (!g) return { dub: 0 };
  let dub = 0, sud = null;
  const v = g.vrsta;
  const stezna = (z, r) => (z < 60 && r < 105) ? 'steznu glavu' : (z < 85 && r < 100 && r > 39.5) ? 'stezne čeljusti' : null;
  if (v === 'vanjski' || v === 'usijecanje' || v === 'navoj' || v === 'glodalo') {
    const W = v === 'usijecanje' ? 1.8 : v === 'navoj' ? 4.6 : 10, a0 = v === 'navoj' ? -4.6 : 0, R = g.R || 0.4;
    const drz = v === 'usijecanje' ? 28 : 10;
    const c = (z) => {
      const d = z - zt;
      if (v === 'navoj') return rt + Math.abs(d) * 1.732;
      if (v === 'usijecanje') return rt;
      return d < R ? rt + R - Math.sqrt(Math.max(0, R * R - (d - R) * (d - R))) : rt;
    };
    for (let i = Math.max(0, iz(zt + a0)); i <= Math.min(NC - 1, iz(zt + W)); i++) {
      const z = uz(zc(i), zt + a0, zt + W);
      const cc = c(z); const s1 = stezna(z, cc); if (s1) sud = s1;
      if (ro[i] > cc + 1e-4) {
        const nd = ro[i] - Math.max(cc, ri[i]); if (nd > dub) dub = nd;
        if (!sim) { if (cc <= ri[i] + 1e-4) { ro[i] = 0; ri[i] = 0; } else ro[i] = Math.max(0, cc); prljavo = true; }
      }
    }
    /* držač alata iznad oštrice */
    for (let i = Math.max(0, iz(zt + 6)); i <= Math.min(NC - 1, iz(zt + 30)); i++) { if (ro[i] > rt + drz + 1e-3) sud = sud || 'obradak (držačem alata)'; }
    if (zt + 30 > 0 && zt < 85 && rt + drz < 100) { for (let z = Math.max(zt, 0); z < Math.min(85, zt + 30); z += 2) { const s1 = stezna(z, rt + drz); if (s1) sud = sud || s1; } }
  } else if (v === 'unutarnji') {
    const R = g.R, rb = g.kut > 50 ? 10 : 8, gore = rt - 1.5, dolje = rt - 1.5 - 2 * rb;
    for (let i = Math.max(0, iz(zt)); i <= Math.min(NC - 1, iz(zt + 8)); i++) {
      const z = uz(zc(i), zt, zt + 8), d = z - zt;
      const doseg = d < R ? rt - (R - Math.sqrt(Math.max(0, R * R - (d - R) * (d - R)))) : rt;
      if (ro[i] > 0 && ri[i] < doseg - 1e-4) {
        if (ri[i] < rt - 6) sud = sud || 'obradak (unutarnji nož u punom materijalu)';
        const nd = doseg - ri[i]; if (nd > dub) dub = nd;
        if (!sim) { if (doseg >= ro[i]) { ro[i] = 0; ri[i] = 0; } else ri[i] = doseg; prljavo = true; }
      }
      const s1 = stezna(z, dolje); if (s1 && dolje < 105) sud = sud || s1;
    }
    for (let i = Math.max(0, iz(zt + 8)); i <= Math.min(NC - 1, iz(zt + 160)); i++) { if (ro[i] > ri[i] + 1e-4 && ro[i] > dolje && ri[i] < gore - 0.01) sud = sud || 'obradak (držačem unutarnjeg noža)'; }
    for (let z = Math.max(zt, 0); z < Math.min(85, zt + 160); z += 2) { if ((z < 60 && dolje < 105) || (z < 85 && dolje < 100 && gore > 39.5)) { sud = sud || (z < 60 ? 'steznu glavu' : 'stezne čeljusti'); break; } }
  } else if (v === 'svrdlo') {
    const R0 = g.R0;
    for (let i = Math.max(0, iz(zt)); i <= Math.min(NC - 1, iz(zt + 140)); i++) {
      const z = uz(zc(i), zt, zt + 140), d = z - zt;
      const doseg = Math.min(R0, d * 1.664);
      if (ro[i] > 0 && ri[i] < doseg - 1e-4) {
        if (Math.abs(rt) > 0.5) sud = sud || 'obradak (svrdlo nije na osi)';
        const nd = doseg - ri[i]; if (nd > dub) dub = nd;
        if (!sim) { if (doseg >= ro[i]) { ro[i] = 0; ri[i] = 0; } else ri[i] = doseg; prljavo = true; }
      }
    }
    if (zt < 85) { const s1 = zt < 60 ? 'steznu glavu' : null; if (s1) sud = sud || s1; }
  }
  /* revolver (ploča) uz steznu glavu */
  if (st.nos.Z < 85 + 2 && st.nos.X / 2 < 130) sud = sud || 'steznu glavu (revolverom)';
  return { dub, sud };
}

/* ================================================================== */
/* 5. Scena                                                           */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 5, 20000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(600, 1500, 1500); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.45); sun2.position.set(-900, 500, -900); scene.add(sun2);
const STR = napraviStroj(THREE, scene, { obradak: false });   /* zajednički model (strojTok.js) — isti kao u „Upoznavanje stroja” */
const { sklopka, lampa } = STR;
let zadnjiProfil = 0;
function osvjeziObradak(sada) {
  if (!prljavo) return;
  const t = performance.now(); if (!sada && t - zadnjiProfil < 180) return; zadnjiProfil = t; prljavo = false;
  /* profil: od stražnjeg kraja po vanjskom polumjeru do čela, zatim natrag po unutarnjem */
  const P = []; let i1 = -1;
  for (let i = 0; i < NC; i++) if (ro[i] > ri[i] + 1e-4) i1 = i;
  if (i1 < 0) { STR.postaviObradak([[0, ZA], [0.01, ZA], [0.01, ZA + 0.1], [0, ZA + 0.1]]); return; }
  const dodaj = (r, z) => { const q = P[P.length - 1]; if (!q || Math.abs(q[0] - r) > 1e-4 || Math.abs(q[1] - z) > 1e-4) P.push([r, z]); };
  dodaj(ri[0], ZA); dodaj(ro[0], ZA);
  for (let i = 0; i <= i1; i++) { const z0 = ZA + i * DZ, z1 = z0 + DZ; const r = ro[i] > ri[i] ? ro[i] : ri[i]; if (Math.abs(r - P[P.length - 1][0]) > 1e-4) dodaj(r, z0); if (i === i1 || Math.abs(ro[i + 1] - ro[i]) > 1e-4) dodaj(r, z1); }
  const zk = ZA + (i1 + 1) * DZ; dodaj(ri[i1], zk);
  for (let i = i1; i >= 0; i--) { const z1 = ZA + (i + 1) * DZ, z0 = z1 - DZ; if (Math.abs(ri[i] - P[P.length - 1][0]) > 1e-4) dodaj(ri[i], z1); if (i === 0 || Math.abs(ri[i - 1] - ri[i]) > 1e-4) dodaj(ri[i], z0); }
  STR.postaviObradak(P);
}
let potpis3D = '';
function postavi3D(dt) {
  const p = st.nos.X.toFixed(3) + ',' + st.nos.Z.toFixed(3);
  if (p !== potpis3D) { potpis3D = p; STR.postaviOsi(st.nos.X, st.nos.Z); }
  if (Math.abs(st.Tkut - st.T) > 1e-3) { const d = st.T - st.Tkut; st.Tkut += Math.sign(d) * Math.min(Math.abs(d), dt * 6); }
  else st.Tkut = st.T;
  STR.postaviRevolver(st.Tkut);
  if (st.vreteno) { st.kut += (st.smjerV === 3 ? -1 : 1) * Math.min(25, nAkt() / 60 * 2 * Math.PI) * dt * 0.25; STR.postaviVrtnju(st.kut); }
  lampa.material.emissive.setHex(st.sudar ? 0xb00000 : st.auto && st.auto.ide ? 0x1d9e4b : st.struja ? 0xc28b00 : 0); lampa.material.color.setHex(st.sudar ? 0xff3b30 : st.auto && st.auto.ide ? 0x2ecc71 : st.struja ? 0xf5c518 : 0x666666);
}
function pogled(p) {
  if (p === 'stroj') { camera.position.set(-2400, 1700, 3800); controls.target.set(100, 0, -100); }
  if (p === 'radni') { camera.position.set(-20, 330, 900); controls.target.set(-170, 20, -60); }
  if (p === 'obradak') { camera.position.set(-60, 160, 420); controls.target.set(-175, 10, 0); }
  if (p === 'straga') { camera.position.set(-200, 700, -3000); controls.target.set(-560, 250, -1230); }
}
pogled('radni');

/* ================================================================== */
/* 6. Vreteno, brzina vrtnje, sudar                                    */
/* ================================================================== */
function nAkt() {
  if (!st.vreteno) return 0;
  let n = st.Sset;
  if (st.g96) { const v = vrhStvarni(); const D = Math.max(1, Math.abs(v ? prikazWKS('X') : 80)); n = Math.min(st.lims, st.vc * 1000 / (Math.PI * D)); }
  return n * st.sOver / 100;
}
function sudar(sto) {
  st.sudar = sto; st.pomicanje = null; if (st.auto) st.auto.ide = false; st.vreteno = false;
  $('poruka').innerHTML = '<span class="upoz">Sudar!</span> ' + esc(sto) + ' Pogledaj <a href="#album">album sudara</a> i pritisni „Ponovno pokreni niz”.';
  $('ponovi').hidden = false;
}

/* ================================================================== */
/* 7. Gibanje osi (JOG, REF, revolver)                                 */
/* ================================================================== */
const F_JOG = 2000, F_RAPID = 10000, F_REF = 4000;          /* mm/min */
function smijeGibati() { return st.struja && !st.gljiva && st.pogoniI && st.posEn && !st.sudar && !st.alarm; }
function osTipka(o) { st.os = o; crtaj(); }
function smjer(sgn, rapid) {
  if (!st.os) { info('Najprije odaberi os tipkom X ili Z.'); return; }
  if (!smijeGibati()) { info(!st.struja ? 'Stroj nije uključen.' : st.gljiva ? 'Gljiva za nužno zaustavljanje je pritisnuta.' : !st.pogoniI || !st.posEn ? 'Pogoni osi nisu uključeni (( I ), FEED START).' : st.alarm ? 'Alarm: pritisni RESET.' : 'Gibanje nije moguće.'); return; }
  if (st.nacin !== 'JOG') { info('Osi se ručno gibaju samo u načinu rada JOG.'); return; }
  const o = st.os;
  if (st.refNacin) {
    if (st.ref[o]) { info('Os ' + o + ' je već referencirana.'); return; }
    if (sgn < 0) { info('Referentna točka traži se u smjeru +.'); return; }
    if (o === 'Z' && !st.ref.X) { info('Najprije referenciraj os X — revolver se mora odmaknuti od obratka.'); return; }
    st.pomicanje = { os: o, cilj: REF[o], v: F_REF, ref: true };
    return;
  }
  if (st.inc) { const d = sgn * st.inc / 1000; st.pomicanje = { os: o, cilj: st.nos[o] + d, v: F_JOG, inc: st.inc / 1000 * (o === 'X' ? 0.5 : 1) }; }
  else st.pomicanje = { os: o, cilj: st.nos[o] + sgn * 1e6, v: rapid ? F_RAPID : F_JOG, drzi: true };
}
function pusti() { if (st.pomicanje && st.pomicanje.drzi) st.pomicanje = null; }
function revolver(d) {
  if (!st.struja || st.sudar) return;
  if (!smijeGibati()) { info('Revolver se zakreće samo kad su pogoni uključeni i nema alarma.'); return; }
  if (st.nacin !== 'JOG') { info('Revolver se ručno zakreće u načinu rada JOG.'); return; }
  if (st.auto && st.auto.ide) return;
  const v = vrhStvarni();
  if (v && v.Z < celo() + 20 && v.X / 2 < 60) { info('Revolver je preblizu obratku — odmakni ga prije zakretanja.'); return; }
  st.T = ((st.T - 1 + d + 12) % 12) + 1; st.D = 1;
  dogadaj('revolver'); crtaj();
}
function korakGibanja(dt) {
  const P = st.pomicanje; if (!P) return;
  const o = P.os; const v = P.v * (P.ref ? 1 : st.fOver / 100) / 60;
  const d = P.cilj - st.nos[o]; const s = Math.sign(d) * Math.min(Math.abs(d), v * dt);
  let nov = st.nos[o] + s;
  if (nov < HOD[o][0] || nov > HOD[o][1]) { nov = Math.min(Math.max(nov, HOD[o][0]), HOD[o][1]); st.pomicanje = null; info('Os ' + o + ' je na kraju hoda.'); }
  const od = vrhStvarni();
  st.nos[o] = nov;
  const vr = vrhStvarni();
  if (vr) {
    const n = Math.max(1, Math.ceil(Math.hypot(vr.X - od.X, vr.Z - od.Z) / 0.05));
    for (let k = 1; k <= n; k++) {
      const zt = od.Z + (vr.Z - od.Z) * k / n, rt = (od.X + (vr.X - od.X) * k / n) / 2;
      const pr = rezi(st.T, zt, rt, true);
      if (pr.sud) { sudar('Alat ili revolver je udario u ' + pr.sud + '.'); return; }
      if (pr.dub > 1e-4) {
        if (!st.vreteno) { sudar('Alat je dotaknuo obradak dok vreteno miruje.'); return; }
        if (!P.inc || P.inc > 0.1001) { sudar('U ručnom načinu alat je ' + (P.inc ? 'korakom od ' + br(P.inc, 3) + ' mm' : 'kontinuiranim gibanjem (JOG)') + ' ušao u materijal. Materijala se dotiče samo korakom od najviše 100 (= 0,1 mm).'); return; }
        rezi(st.T, zt, rt, false);
        if (niz && niz.id === 'nultocka') st.zarez = { Z: prikazMKS('Z'), zt };
        dogadaj('zarez');
      }
    }
  }
  if (Math.abs(P.cilj - st.nos[o]) < 1e-9) { if (P.ref) { st.ref[o] = true; dogadaj('ref' + o); } st.pomicanje = null; dogadaj('pomak'); }
}

/* ================================================================== */
/* 8. Program: prevođenje u putanju vrha alata (MKS, X kao promjer)     */
/* ================================================================== */
/* točka: [X, Z, tip(0 brzi, 1 rez, 33 navoj), F (mm/okr), red, T, S, g96, M(3/4/5)] */
function ciklus93(v, P, dodaj) {
  const [SPD, SPL, WIDG, DIAG, , ANG1, ANG2, RCO1, RCO2] = v.map((q) => (q === null || isNaN(q) ? 0 : q));
  const rb = SPD / 2 - DIAG, zr = SPL, zl = SPL - WIDG, sir = 1.8, t1 = Math.tan(ANG1 * Math.PI / 180), t2 = Math.tan(ANG2 * Math.PI / 180);
  const X0 = SPD + 2, ZW = st.G54.Z, XW = st.G54.X;
  const D = (x, z, tip) => dodaj(x + XW, z + ZW, tip);
  /* grubi ubodi, oštrica 1,8 mm, referentna točka na lijevom kutu */
  D(X0, zr - sir, 0);
  const zz = []; for (let z = zr - sir; z > zl + 1e-6; z -= 1.6) zz.push(z); zz.push(zl);
  zz.forEach((z) => { D(X0, z, 0); D(2 * rb + 0.2, z, 1); D(X0, z, 0); });
  /* završni prolaz: desni bok (desni kut oštrice), dno, lijevi bok (lijevi kut) */
  const R0 = SPD / 2, zfr = zr + DIAG * t1, zfl = zl - DIAG * t2;
  const desno = [[zfr + RCO1, R0 + 0.5], [zfr + RCO1, R0], [zfr - RCO1 * Math.sin(ANG1 * Math.PI / 180), R0 - RCO1 * Math.cos(ANG1 * Math.PI / 180)], [zr, rb]];
  D(X0, desno[0][0] - sir, 0);
  for (let k = 1; k < desno.length; k++) { const a = desno[k - 1], b = desno[k], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2)); for (let j = 1; j <= n; j++) { const z = a[0] + (b[0] - a[0]) * j / n, r = a[1] + (b[1] - a[1]) * j / n; D(2 * r, z - sir, 1); } }
  D(2 * rb, zl, 1);
  const lijevo = [[zl, rb], [zfl + RCO2 * Math.sin(ANG2 * Math.PI / 180), R0 - RCO2 * Math.cos(ANG2 * Math.PI / 180)], [zfl - RCO2, R0], [zfl - RCO2, R0 + 0.5]];
  for (let k = 1; k < lijevo.length; k++) { const a = lijevo[k - 1], b = lijevo[k], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2)); for (let j = 1; j <= n; j++) { const z = a[0] + (b[0] - a[0]) * j / n, r = a[1] + (b[1] - a[1]) * j / n; D(2 * r, z, 1); } }
  D(X0, lijevo[lijevo.length - 1][0], 0);
  void P;
}
function prevedi(tekst) {
  const P = []; let g = 0, F = 0, S = 0, T = st.T, abs = true, g96 = false, M = 0, LIMS = 4000;
  const vr0 = { X: st.nos.X - 2 * kor(T).L1, Z: st.nos.Z - kor(T).L2 };
  let x = vr0.X, z = vr0.Z;     /* vrh alata u MKS (prema tablici korekcija) */
  const greske = [];
  const redci = tekst.replace(/\r/g, '').split('\n');
  redci.forEach((rr, red) => {
    let s = rr; const k = s.indexOf(';'); if (k >= 0) s = s.slice(0, k); s = s.trim().toUpperCase(); if (!s) return;
    const dodaj = (X, Z, tip) => { P.push([X, Z, tip, F, red, T, S, g96, M, LIMS]); x = X; z = Z; };
    const c = s.match(/^CYCLE93\s*\(([^)]*)\)/);
    if (c) { ciklus93(c[1].split(',').map((q) => (q.trim() === '' ? null : parseFloat(q))), P, dodaj); return; }
    if (s === 'TCP') {   /* točka izmjene alata: najprije X, zatim Z (MKS revolvera) */
      const L = kor(T); dodaj(TCP.X - 2 * L.L1, z, 0); dodaj(TCP.X - 2 * L.L1, TCP.Z - L.L2, 0); return;
    }
    const lm = s.match(/LIMS\s*=\s*([\d.]+)/); if (lm) { LIMS = parseFloat(lm[1]); P.push([x, z, -1, F, red, T, S, g96, M, LIMS]); s = s.replace(/LIMS\s*=\s*[\d.]+/, ' '); }
    const w = { G: [], M: [] }; const re = /(?:^|[^A-Z])([A-Z])\s*([-+]?\d*\.?\d+)/g; let m;
    while ((m = re.exec(s))) { const a = m[1], v = parseFloat(m[2]); if (a === 'G' || a === 'M') w[a].push(v); else w[a] = v; }
    w.G.forEach((v) => { if ([0, 1, 2, 3, 33].includes(v)) g = v; else if (v === 90) abs = true; else if (v === 91) abs = false; else if (v === 96) g96 = true; else if (v === 97) g96 = false; });
    if (w.F !== undefined) F = w.F; if (w.S !== undefined) S = w.S;
    w.M.forEach((v) => { if (v === 3 || v === 4 || v === 5) M = v; });
    if (w.T !== undefined) {
      if (!ALATI[w.T]) { greske.push('red ' + (red + 1) + ': alat T' + w.T + ' nije u popisu alata'); return; }
      /* zakretanje revolvera: točka ostaje, mijenja se alat (upravljanje preračuna vrh) */
      const Ls = kor(T), Ln = kor(w.T); const Fx = x + 2 * Ls.L1, Fz = z + Ls.L2;
      T = w.T; x = Fx - 2 * Ln.L1; z = Fz - Ln.L2;
      P.push([x, z, -2, F, red, T, S, g96, M, LIMS]);
    } else if (w.S !== undefined || w.M.length || w.G.length) P.push([x, z, -1, F, red, T, S, g96, M, LIMS]);
    const ima = w.X !== undefined || w.Z !== undefined; if (!ima) return;
    const nx = w.X !== undefined ? (abs ? w.X + st.G54.X : x + w.X) : x;
    const nz = w.Z !== undefined ? (abs ? w.Z + st.G54.Z : z + w.Z) : z;
    if (g === 0 || g === 1 || g === 33) { dodaj(nx, nz, g === 0 ? 0 : g === 33 ? 33 : 1); if (g === 33) P[P.length - 1][3] = w.K || 1; }
    else {
      const cw = g === 2; const x0 = x / 2, z0 = z, x1 = nx / 2, z1 = nz;
      const cxr = x0 + (w.I || 0), czr = z0 + (w.K || 0); const r = Math.hypot(x0 - cxr, z0 - czr);
      const a0 = Math.atan2(x0 - cxr, z0 - czr), a1 = Math.atan2(x1 - cxr, z1 - czr); let da = a1 - a0;
      if (cw) { while (da >= 0) da -= 2 * Math.PI; } else { while (da <= 0) da += 2 * Math.PI; }
      const n = Math.max(4, Math.ceil(Math.abs(da) * r / 0.3));
      for (let i = 1; i <= n; i++) { const a = a0 + da * i / n; dodaj(2 * (cxr + r * Math.sin(a)), czr + r * Math.cos(a), 1); }
    }
  });
  return { P, greske, redci };
}

/* ================================================================== */
/* 9. Koraci: provjera događaja                                       */
/* ================================================================== */
function trenutni() { return niz ? niz.koraci[korak] : null; }
function dogadaj(e, podatak) {
  const k = trenutni(); if (!k || st.sudar) return;
  const ok = (() => {
    switch (k[2]) {
      case 'sklopka': return e === 'sklopka';
      case 'gljiva': return e === 'gljiva';
      case 'pogoni': return st.pogoniI && st.vrEn && st.posEn;
      case 'reset': return e === 'reset';
      case 'refX': return e === 'refX'; case 'refZ': return e === 'refZ';
      case 'jog': return st.nacin === 'JOG' && !st.refNacin;
      case 't4': return e === 'revolver' && st.T === 4;
      case 'mda': return st.nacin === 'MDA';
      case 's1000': return e === 'mdaIzveden' && st.vreteno && !st.g96 && st.Sset === 1000 && st.smjerV === 4;
      case 'polozaj': return e === 'pomak' && st.T === 4 && Math.abs(prikazWKS('X') - 50) < 0.0005 && Math.abs(prikazWKS('Z') - 8) < 0.0005;
      case 'parametri': return st.podrucje === 'Parameter';
      case 't3': return st.podrucje === 'Parameter' && st.alatParam === 3;
      case 'unos': { const a = ALATI[3]; return Math.abs(a.L1 - 52.258) < 1e-6 && Math.abs(a.L2 - 63.589) < 1e-6 && Math.abs(a.R - 0.4) < 1e-6; }
      case 'machine': return st.podrucje === 'Machine';
      case 'mdaT1': return e === 'mdaIzveden' && st.T === 1 && st.vreteno;
      case 'scratching': return st.dijalog === 'scratch';
      case 'poljeZ': return e === 'poljeZ';
      case 'zarez': return e === 'zarez';
      case 'odmak': { const v = vrhStvarni(); return e === 'pomak' && st.zarez && v && v.X > 2 * PRIPREMAK.R + 0.5 && Math.abs(v.Z - st.zarez.zt) < 0.0005; }
      case 'unosZ': return e === 'unosZ';
      case 'ok': return e === 'scratchOK';
      case 'dalje': return e === 'dalje';
      case 'program': return st.podrucje === 'Program';
      case 'novi': return e === 'noviOK';
      case 'pG54': return e === 'redak' && podatak === 'G54';
      case 'pLIMS': return e === 'redak' && podatak === 'LIMS=3500';
      case 'urez': return st.dijalog === 'c93';
      case 'urezOK': return e === 'c93OK';
      case 'izlaz': return e === 'editorIzlaz';
      case 'otvori': return st.ed && st.ed.ime === 'VMDEMO';
      case 'f03': return st.ed && st.ed.redci[2] === 'G96 F0.3 S200 T1 M4';
      case 'natrag': return st.dijalog === 'c93' && st.kontura === 'natrag';
      case 'abort': return e === 'c93Abort';
      case 'odabir': return st.ucitan && /^PR(39|90|98)$/.test(st.ucitan) && st.nacin === 'AUTO';
      case 'f10': return st.fOver <= 10;
      case 'start': return e === 'cycleStart' && st.auto && st.auto.ide;
      case 'gotovo': return e === 'programKraj';
      default: return false;
    }
  })();
  if (ok) { korak++; if (korak >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); } crtajKorak(); }
}

/* ================================================================== */
/* 10. Sučelje upravljanja (zaslon, softkeyevi, tipke)                 */
/* ================================================================== */
const HSK = {
  Machine_JOG: ['', 'Preset', 'Scratching', 'Measuring workpiece', 'Measuring tool', 'Hand-wheel', 'INC', 'Swivelling'],
  Machine_MDA: ['', '', '', 'Influence on', '', 'Hand-wheel', 'Editor functions', 'MDA File Fct.'],
  Machine_AUTO: ['Over-saving', '', 'DRF offset', 'Influence on', 'Block search', 'Hand-wheel', 'Program compens.', 'Program overview'],
  Menu: ['Machine', 'Parameter', 'Program', 'Services', 'Diagnosis', 'Commissioning', '', ''],
  Parameter: ['Tool compens.', 'R Parameter', 'Setting data', 'Zero point offset', 'User data', 'Active ZD + comp.', '', 'Compens. determ.'],
  Program: ['Workpieces', 'Workpiece programs', 'Sub-routines', 'Standard cycles', 'User cycles', 'Manufact. cycles', '', ''],
  Editor: ['Edit', 'Contour', 'Drilling', 'Milling', 'Turning', '', 'Simulation', 'Translate back']
};
const VSK = {
  Machine: ['G Fct. + Transfer', 'Help functions', 'Spindles', 'Axis advance', 'Program levels', 'Zoom Actual', 'Actual value WKS', ''],
  Parameter: ['T-No +', 'T-No −', 'D-No +', 'D-No −', 'Delete…', 'Go to…', 'Overview…', 'New…'],
  Program: ['', 'New…', 'Load HD→NC', 'Unload NC→HD', 'Simulation', 'Program manag.', 'Selection', ''],
  Editor: ['Over-write', 'Mark block', '', '', '', 'Search / Go to', 'File saving', 'Exit editor'],
  Turning: ['', 'Chip removal w. blank', 'Chip removal', 'Threads', 'Cut-in', 'Undercut', '', ''],
  OkAbort: ['', '', '', '', '', '', 'Abort', 'OK'],
  Scratch: ['', '', 'Basis ZD', '', '', '', 'Abort', 'OK'],
  YesNo: ['', '', '', '', '', 'Abort', 'No', 'Yes'],
  Novi: ['', '', '', '', '', '', 'Abort', 'OK']
};
function trenutniHSK() {
  if (st.izbornik) return HSK.Menu;
  if (st.podrucje === 'Machine') return st.dijalog === 'scratch' ? new Array(8).fill('') : HSK['Machine_' + st.nacin];
  if (st.podrucje === 'Parameter') return HSK.Parameter;
  if (st.podrucje === 'Program') return st.ed ? HSK.Editor : HSK.Program;
  return new Array(8).fill('');
}
function trenutniVSK() {
  if (st.vsk) return VSK[st.vsk];
  if (st.dijalog === 'scratch') return VSK.Scratch;
  if (st.podrucje === 'Machine') { const v = VSK.Machine.slice(); v[6] = st.wks ? 'Actual value MKS' : 'Actual value WKS'; return v; }
  if (st.podrucje === 'Parameter') return VSK.Parameter;
  if (st.podrucje === 'Program') return st.ed ? VSK.Editor : VSK.Program;
  return new Array(8).fill('');
}
function info(t) { $('poruka').innerHTML = esc(t); }

function zaslon() {
  const el = $('hmi');
  if (!st.struja) { el.innerHTML = '<div class="hmi-crno"></div>'; return; }
  if (st.podizanje > 0) { el.innerHTML = '<div class="hmi-crno"><span>SINUMERIK system start. Please wait…</span></div>'; return; }
  const nacin = st.nacin === 'JOG' ? (st.refNacin ? 'JOG Ref' : (st.inc ? 'JOG Inc ' + st.inc : 'JOG')) : st.nacin;
  const kanal = st.alarm ? (st.gljiva ? 'EMERGENCY STOP active' : 'Channel RESET — alarm') : st.auto && st.auto.ide ? 'Channel active' : 'Channel RESET';
  const prog = st.ucitan || 'MPF.DIR';
  let h = '<div class="hmi-gl"><span class="hp">' + esc(st.podrucje) + '</span><span class="hp">CHAN1</span><span class="hp">' + esc(nacin) + '</span><span class="hp siroko">\\MPF.DIR\\' + esc(prog) + '</span></div>';
  h += '<div class="hmi-st"><span class="' + (st.alarm ? 'upoz' : '') + '">' + esc(kanal) + '</span><span>' + (st.auto && st.auto.ide ? 'Program running' : 'Program aborted') + '</span><span>ROV</span></div>';
  if (st.podrucje === 'Machine') {
    const ks = st.wks ? 'WKS' : 'MKS';
    const Fset = st.auto && st.auto.ide ? st.auto.F : 0;
    h += '<div class="hmi-dva"><table class="hmi-t"><thead><tr><th>' + ks + '</th><th>Position</th><th>' + (st.auto ? 'Remaining path' : 'Repos') + '</th></tr></thead><tbody>';
    OSI.forEach((o) => { const v = st.wks ? prikazWKS(o) : prikazMKS(o); h += '<tr' + (st.os === o ? ' class="sel"' : '') + '><td>' + (st.ref[o] ? '' : '<i class="nref" title="nije referencirano">○</i>') + o + (st.wks ? '' : '1') + '</td><td class="br">' + br(v) + ' mm</td><td class="br">0.000</td></tr>'; });
    h += '</tbody></table><div class="hmi-desno"><div class="hk">Master spindle S1</div><div>Act. <b>' + br(nAkt(), 0) + '</b> rpm</div><div>Set <b>' + (st.g96 ? br(st.vc, 0) + '</b> m/min' : br(st.Sset, 0) + '</b> rpm') + ' · ' + st.sOver + ' %</div>' +
      '<div class="hk">Advance [mm/rev]</div><div>Set <b>' + br(Fset, 3) + '</b> · ' + st.fOver + ' %</div>' +
      '<div class="hk">Tool</div><div>T' + st.T + ' &nbsp; D' + st.D + ' &nbsp; G01 ' + (st.g96 ? 'G96' : 'G97') + ' G54</div></div></div>';
    if (st.dijalog === 'scratch') {
      const S = st.scratch;
      h += '<div class="hmi-dlg"><div class="hk">Scratching</div><table class="hmi-t"><tr><td>Zero point offset</td><td class="' + (S.polje === 'ZO' ? 'kur' : '') + '">' + esc(S.ZO || '') + (S.polje === 'ZO' ? esc(st.unos) : '') + '</td><td>T-No.</td><td>' + st.T + ' &nbsp;D1</td></tr>' +
        '<tr><th>Axis</th><th>offset</th><th>Setpoint position</th><th>Length</th></tr>';
      OSI.forEach((o) => { h += '<tr><td>' + o + '</td><td class="br">' + br(S.offset[o]) + '</td><td class="' + (S.polje === o ? 'kur' : '') + '">' + (S.polje === o ? esc(st.unos) || '&nbsp;' : (S.vrij[o] !== null ? br(S.vrij[o]) : '')) + '</td><td class="br">' + br(o === 'X' ? kor(st.T).L1 : kor(st.T).L2) + '</td></tr>'; });
      h += '</table><div class="sonda">' + (st.zarez ? 'Čelo zarezano na Z (MKS) ' + br(st.zarez.Z) + '.' : 'Čelo još nije zarezano.') + '</div></div>';
    } else if (st.nacin === 'MDA') {
      h += '<div class="hmi-dlg"><div class="hk">MDA \\MPF.DIR\\SIN840D.MPF</div><div class="mda">' + esc(st.mda) + '<span class="kursor">▌</span></div></div>';
    } else if (st.nacin === 'AUTO' && st.auto) {
      const r = st.auto.trenRed; const R = st.auto.redci;
      h += '<div class="hmi-dlg"><div class="hk">Current line &nbsp; ' + esc(st.ucitan || '') + '</div>' + [0, 1, 2, 3].map((i) => '<div class="red' + (i === 0 ? ' akt' : '') + '">' + esc(R[r + i] || '') + '</div>').join('') + '</div>';
    }
  } else if (st.podrucje === 'Parameter') {
    const a = ALATI[st.alatParam] || { naziv: '—', tip: 0, pol: 0, L1: 0, L2: 0, R: 0 };
    const pp = (i, v) => '<td class="br' + (st.paramPolje === i ? ' kur' : '') + '">' + (st.paramPolje === i && st.unos ? esc(st.unos) : br(v)) + '</td>';
    h += '<div class="hmi-dlg"><div class="hk">Tool compensations</div><table class="hmi-t"><tr><td>T number</td><td>' + st.alatParam + '</td><td>D number</td><td>1</td></tr>' +
      '<tr><td>Tool type</td><td colspan="3">' + (a.tip || '') + ' ' + esc(TIP[a.tip] || '') + ' — ' + esc(a.naziv) + '</td></tr><tr><td>Cutting edge position</td><td>' + (a.pol || '') + '</td><td>Number of cutting edges</td><td>1</td></tr>' +
      '<tr><th>Length compensation</th><th>Geometry</th><th>Wear</th><th></th></tr><tr><td>Length1</td>' + pp(0, a.L1) + '<td>0.000</td><td></td></tr><tr><td>Length2</td>' + pp(1, a.L2) + '<td>0.000</td><td></td></tr>' +
      '<tr><th>Radius compensation</th><th></th><th></th><th></th></tr><tr><td>Radius</td>' + pp(2, a.R) + '<td>0.000</td><td></td></tr></table></div>';
  } else if (st.podrucje === 'Program') {
    if (st.dijalog === 'c93') {
      const v = st.c93;
      h += '<div class="hmi-dlg dzep"><div class="hk">Cut-in / CYCLE93</div><table class="hmi-t">' + C93.map(([n, en, hr], i) => '<tr><td>' + n + '</td><td>' + esc(en) + '</td><td class="br' + (st.kontura === 'natrag' && n === 'SPL' && v[i] !== -30 ? ' upoz' : '') + '">' + v[i] + '</td><td class="op">' + esc(hr) + '</td></tr>').join('') + '</table></div>';
    } else if (st.dijalog === 'novi') {
      h += '<div class="hmi-dlg"><div class="hk">New</div><div>Name: <span class="kur">' + esc(st.unos || 'VMDEMO') + '</span> &nbsp; Data type: Workpiece program (MPF) &nbsp; Model: No model</div></div>';
    } else if (st.dijalog === 'pitanje') {
      h += '<div class="hmi-dlg"><div class="hk">Editor: Question</div><div>' + esc(st.ed ? st.ed.ime : '') + ' was changed. Do you want to save the changes?</div></div>';
    } else if (st.ed) {
      h += '<div class="hmi-dlg ed"><div class="hk">Editor &nbsp; \\MPF.DIR\\' + esc(st.ed.ime) + '.MPF</div>' + st.ed.redci.map((r, i) => { const t = i === st.ed.kursor && st.ed.unos !== null ? st.ed.unos : r; const k = i === st.ed.kursor ? (st.ed.kol === null ? t.length : st.ed.kol) : -1; return '<div class="red' + (i === st.ed.kursor ? ' akt' : '') + '">' + (k >= 0 ? esc(t.slice(0, k)) + '<span class="kursor">▌</span>' + esc(t.slice(k)) : esc(t)) + '¶</div>'; }).join('') + (st.ed.kursor >= st.ed.redci.length ? '<div class="red akt">' + esc(st.unos) + '▌</div>' : '') + '<div class="red">=eof=</div></div>';
    } else {
      const imena = Object.keys(st.programi).sort();
      h += '<div class="hmi-dlg"><div class="hk">Program selection</div><table class="hmi-t"><tr><th>Name</th><th>Type</th><th>Loaded</th><th>Length</th></tr>' + imena.map((n, i) => '<tr class="' + (i === st.listaKursor ? 'kur' : '') + '"><td>' + esc(n) + '</td><td>MPF</td><td>' + (st.nc === n ? '×' : '') + '</td><td class="br">' + st.programi[n].length + '</td></tr>').join('') + '</table><div class="red">' + (imena.length ? 'The Input key is used to open a program' : 'The softkey ‘New’ is used to create a new program') + '</div></div>';
    }
  }
  el.innerHTML = h;
}
function softkeyi() {
  const hs = trenutniHSK(), vs = trenutniVSK();
  $('hsk').innerHTML = hs.map((t, i) => '<button type="button" class="sk" data-hsk="' + i + '"' + (t ? '' : ' disabled') + '>' + esc(t) + '</button>').join('');
  $('vsk').innerHTML = vs.map((t, i) => '<button type="button" class="sk" data-vsk="' + i + '"' + (t ? '' : ' disabled') + '>' + esc(t) + '</button>').join('');
}
function crtaj() {
  zaslon(); softkeyi();
  document.querySelectorAll('[data-nacin]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.nacin === st.nacin && !(b.dataset.nacin === 'JOG' && st.refNacin)) || (b.dataset.nacin === 'REF' && st.refNacin && st.nacin === 'JOG'))));
  document.querySelectorAll('[data-inc]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.inc === st.inc)));
  document.querySelectorAll('[data-os]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.os === st.os)));
  $('gljiva').setAttribute('aria-pressed', String(st.gljiva));
  $('k-I').setAttribute('aria-pressed', String(st.pogoniI)); $('k-sstart').setAttribute('aria-pressed', String(st.vrEn)); $('k-fstart').setAttribute('aria-pressed', String(st.posEn));
  $('f-over').value = String(st.fOver); $('f-over-v').textContent = st.fOver + ' %'; $('s-over').value = String(st.sOver); $('s-over-v').textContent = st.sOver + ' %';
  $('k-sklopka').setAttribute('aria-pressed', String(st.struja)); $('k-sbl').setAttribute('aria-pressed', String(!!st.sbl));
}

/* --- unos s tipkovnice upravljanja ------------------------------- */
function uredi() { if (st.ed.unos === null) { st.ed.unos = st.ed.redci[st.ed.kursor]; if (st.ed.kol === null) st.ed.kol = st.ed.unos.length; } }
function znak(c) {
  if (!st.struja || st.podizanje > 0) return;
  if (st.podrucje === 'Machine' && st.nacin === 'MDA' && !st.dijalog) { st.mda += c; }
  else if (st.ed && !st.dijalog) { if (st.ed.kursor >= st.ed.redci.length) st.unos += c; else { uredi(); const u = st.ed.unos; st.ed.unos = u.slice(0, st.ed.kol) + c + u.slice(st.ed.kol); st.ed.kol++; } }
  else st.unos += c;
  crtaj();
}
function brisi(naprijed) {
  if (st.podrucje === 'Machine' && st.nacin === 'MDA' && !st.dijalog) st.mda = st.mda.slice(0, -1);
  else if (st.ed && !st.dijalog && st.ed.kursor < st.ed.redci.length) { uredi(); const u = st.ed.unos, k = st.ed.kol; if (naprijed) st.ed.unos = u.slice(0, k) + u.slice(k + 1); else if (k > 0) { st.ed.unos = u.slice(0, k - 1) + u.slice(k); st.ed.kol--; } }
  else st.unos = st.unos.slice(0, -1);
  crtaj();
}
function stupac(d) { if (!st.ed || st.dijalog || st.ed.kursor >= st.ed.redci.length) return; const r = st.ed.unos !== null ? st.ed.unos : st.ed.redci[st.ed.kursor]; if (st.ed.kol === null) st.ed.kol = r.length; st.ed.kol = Math.max(0, Math.min(r.length, st.ed.kol + d)); crtaj(); }
function input() {
  if (!st.struja) return;
  if (st.podrucje === 'Machine' && st.nacin === 'MDA' && !st.dijalog) { st.mda += '\n'; crtaj(); return; }
  if (st.dijalog === 'scratch') {
    const S = st.scratch;
    if (S.polje === 'ZO') { if (st.unos.trim().toUpperCase() === 'G54') { S.ZO = 'G54'; S.offset = { ...st.G54 }; S.polje = 'X'; st.unos = ''; } else info('Upiši G54.'); crtaj(); return; }
    if (S.polje === 'X' && !st.unos) { S.polje = 'Z'; dogadaj('poljeZ'); crtaj(); return; }
    const v = parseFloat(st.unos.replace(',', '.')); if (!isFinite(v)) { info('Upiši broj.'); return; }
    const o = S.polje; st.unos = '';
    if (o === 'Z') {
      if (!st.zarez) { info('Najprije zareži čelo — tek tada znaš gdje je.'); crtaj(); return; }
      if (v < 0 || v > 1) { info('Nultočka mora biti na čelu: zarezano čelo je od nje udaljeno između 0 i 1 mm. Upiši vrijednost između 0 i 1.'); crtaj(); return; }
      S.vrij.Z = v; S.offset.Z = prikazMKS('Z') - v; dogadaj('unosZ');
    } else { S.vrij.X = v; S.offset.X = prikazMKS('X') - v; info('Na tokarilici je W na osi vretena — pomak u X ostavi 0.'); }
    crtaj(); return;
  }
  if (st.podrucje === 'Parameter') {
    const a = ALATI[st.alatParam];
    if (a && st.unos) { const v = parseFloat(st.unos.replace(',', '.')); if (isFinite(v)) { a[['L1', 'L2', 'R'][st.paramPolje]] = v; st.unos = ''; } }
    st.paramPolje = (st.paramPolje + 1) % 3; dogadaj('param'); crtaj(); return;
  }
  if (st.dijalog === 'novi') { st.unos = st.unos || 'VMDEMO'; crtaj(); return; }
  if (st.ed && !st.dijalog) {
    if (st.ed.kursor >= st.ed.redci.length) { const r = st.unos.trim().toUpperCase().replace(/\s*=\s*/g, '='); if (r) { st.ed.redci.push(r); st.ed.kursor = st.ed.redci.length; st.unos = ''; dogadaj('redak', r); automatskiRetci(); } }
    else { if (st.ed.unos !== null) { st.ed.redci[st.ed.kursor] = st.ed.unos.toUpperCase(); st.ed.unos = null; dogadaj('redak'); } st.ed.kursor++; st.ed.kol = null; }
    crtaj(); return;
  }
  if (st.podrucje === 'Program' && !st.ed) { const n = Object.keys(st.programi).sort()[st.listaKursor]; otvoriEditor(n); return; }
}
function automatskiRetci() {               /* nakon G54 i LIMS=3500 upravljanje doda retke do ciklusa (kao u tečaju) */
  const r = st.ed.redci;
  if (r.length === 2 && r[0] === 'G54' && r[1] === 'LIMS=3500') { r.push('G96 F0.2 S200 T1 M4', 'G0 X82 Z0', 'G1 X-0.8', 'G0 Z1', 'TCP', 'G96 F0.1 S140 T5 M4'); st.ed.kursor = r.length; }
}
function otvoriEditor(ime) { st.ed = { ime, redci: st.programi[ime] ? st.programi[ime].split('\n') : [], kursor: 0, unos: null, kol: null }; dogadaj('otvoren'); crtaj(); }
function kursor(d) {
  if (st.podrucje === 'Program' && !st.ed) { const n = Object.keys(st.programi).length; st.listaKursor = (st.listaKursor + d + n) % n; crtaj(); return; }
  if (st.ed && !st.dijalog) { if (st.ed.unos !== null) { st.ed.redci[st.ed.kursor] = st.ed.unos.toUpperCase(); st.ed.unos = null; dogadaj('redak'); } st.ed.kursor = Math.max(0, Math.min(st.ed.redci.length, st.ed.kursor + d)); st.ed.kol = null; crtaj(); return; }
  if (st.dijalog === 'scratch' && d > 0 && st.scratch.polje === 'X') { st.scratch.polje = 'Z'; dogadaj('poljeZ'); crtaj(); return; }
  if (st.dijalog === 'scratch' && d < 0 && st.scratch.polje === 'Z') { st.scratch.polje = 'X'; crtaj(); return; }
  if (st.podrucje === 'Parameter') { st.unos = ''; st.paramPolje = (st.paramPolje + d + 3) % 3; crtaj(); }
}

/* --- softkeyevi --------------------------------------------------- */
function hsk(i) {
  const t = trenutniHSK()[i]; if (!t) return;
  if (st.izbornik) { st.izbornik = false; if (t === 'Machine' || t === 'Parameter' || t === 'Program') { st.podrucje = t; st.dijalog = null; st.vsk = null; if (t !== 'Program') st.ed = null; dogadaj('podrucje'); } crtaj(); return; }
  if (t === 'Scratching') { if (st.nacin !== 'JOG') { info('Zarezivanje radi samo u načinu JOG.'); return; } st.dijalog = 'scratch'; st.scratch = { polje: 'ZO', ZO: '', offset: { ...st.G54 }, vrij: { X: null, Z: null } }; st.unos = ''; dogadaj('scratching'); crtaj(); return; }
  if (t === 'Turning') { st.vsk = 'Turning'; crtaj(); return; }
  if (t === 'Translate back') {
    const r = st.ed && st.ed.redci[st.ed.kursor]; if (!r || !/^CYCLE93/.test(r)) { info('Kursor mora biti u retku s ciklusom CYCLE93.'); return; }
    const v = r.match(/\(([^)]*)\)/)[1].split(',').map((q) => (q.trim() === '' ? 0 : parseFloat(q)));
    st.c93 = C93.map((p, k) => (v[k] === undefined || isNaN(v[k]) ? 0 : v[k]));
    if (niz && niz.id === 'uredivanje') st.c93[1] = -40;   /* u tečaju je SPL greškom promijenjen na −40 */
    st.dijalog = 'c93'; st.kontura = 'natrag'; st.vsk = 'OkAbort'; dogadaj('natrag'); crtaj(); return;
  }
  if (t === 'Tool compens.') { crtaj(); return; }
  info('Ovaj softkey u simulatoru nije potreban za vježbu.');
}
function vsk(i) {
  const t = trenutniVSK()[i]; if (!t) return;
  if (t === 'Actual value WKS' || t === 'Actual value MKS') { st.wks = !st.wks; crtaj(); return; }
  if (t === 'T-No +' || t === 'T-No −') { const br_ = Object.keys(ALATI).map(Number); let k = br_.indexOf(st.alatParam); k = (k + (t === 'T-No +' ? 1 : -1) + br_.length) % br_.length; st.alatParam = br_[k]; st.unos = ''; st.paramPolje = 0; dogadaj('tno'); crtaj(); return; }
  if (t === 'New…') { st.dijalog = 'novi'; st.unos = 'VMDEMO'; st.vsk = 'Novi'; crtaj(); return; }
  if (st.vsk === 'Novi') {
    if (t === 'OK') { const ime = (st.unos || 'VMDEMO').toUpperCase(); st.programi[ime] = ''; st.dijalog = null; st.vsk = null; st.unos = ''; st.ed = { ime, redci: [], kursor: 0, unos: null, kol: null }; dogadaj('noviOK'); }
    else { st.dijalog = null; st.vsk = null; }
    crtaj(); return;
  }
  if (t === 'Cut-in') { st.c93 = C93.map((p) => p[3]); st.dijalog = 'c93'; st.kontura = 'novi'; st.vsk = 'OkAbort'; dogadaj('urez'); crtaj(); return; }
  if (st.dijalog === 'c93') {
    if (t === 'OK') {
      const linija = 'CYCLE93(' + st.c93.join(',') + ')';
      if (st.kontura === 'novi') { st.ed.redci.push(linija, 'TCP', 'M30'); st.ed.kursor = st.ed.redci.length; dogadaj('c93OK'); }
      else { st.ed.redci[st.ed.kursor] = linija; info('Ciklus je preuzet s promijenjenim vrijednostima.'); }
    } else { dogadaj('c93Abort'); }
    st.dijalog = null; st.vsk = null; st.kontura = null; crtaj(); return;
  }
  if (st.vsk === 'Turning') { info('Za vježbu je potreban softkey Cut-in.'); return; }
  if (t === 'Exit editor') { st.dijalog = 'pitanje'; st.vsk = 'YesNo'; crtaj(); return; }
  if (st.dijalog === 'pitanje') {
    if (t === 'Yes') { st.programi[st.ed.ime] = st.ed.redci.join('\n'); st.ed = null; dogadaj('editorIzlaz'); }
    else if (t === 'No') { st.ed = null; }
    st.dijalog = null; st.vsk = null; crtaj(); return;
  }
  if (st.dijalog === 'scratch') {
    if (t === 'OK') { st.G54 = { ...st.scratch.offset }; st.dijalog = null; dogadaj('scratchOK'); }
    else if (t === 'Abort') st.dijalog = null;
    crtaj(); return;
  }
  if (t === 'Load HD→NC') { const n = Object.keys(st.programi).sort()[st.listaKursor]; st.nc = n; info('Program ' + n + ' je učitan u NC (Job is completed).'); crtaj(); return; }
  if (t === 'Selection') { const n = Object.keys(st.programi).sort()[st.listaKursor]; if (st.nc !== n) { info('Najprije učitaj program softkeyem Load.'); return; } st.ucitan = n; pripremiAuto(); dogadaj('odabir'); crtaj(); return; }
  info('Ovaj softkey u simulatoru nije potreban za vježbu.');
}

/* --- strojna upravljačka ploča ----------------------------------- */
function nacin(n) {
  if (!st.struja) return;
  if (n === 'REF') { st.nacin = 'JOG'; st.refNacin = true; }
  else { st.nacin = n; st.refNacin = false; }
  if (n === 'MDA' && niz && niz.id === 'nultocka' && !st.mda && korak === 0) st.mda = 'T1 D1 G97 S800 M4';
  if (n === 'AUTO' && st.ucitan) pripremiAuto();
  dogadaj('nacin'); crtaj();
}
function cycleStart() {
  if (!st.struja || st.sudar) return;
  if (!smijeGibati()) { info('Pogoni nisu spremni ili je aktivan alarm.'); return; }
  if (st.nacin === 'MDA') {
    const t = st.mda.replace(/\n/g, ' ').toUpperCase().trim(); if (!t) return;
    const mT = t.match(/T(\d+)/), mS = t.match(/S(\d+)/), m3 = /M0?3\b/.test(t), m4 = /M0?4\b/.test(t), m5 = /M0?5\b/.test(t);
    if (mT) { const n = +mT[1]; if (n < 1 || n > 12) { info('Revolver ima mjesta T1 … T12.'); return; } const v = vrhStvarni(); if (v && v.Z < celo() + 20 && v.X / 2 < 60) { info('Revolver je preblizu obratku — odmakni ga prije zakretanja.'); return; } st.T = n; }
    if (/G96/.test(t)) st.g96 = true; if (/G97/.test(t)) st.g96 = false;
    if (mS) { if (st.g96) st.vc = +mS[1]; else st.Sset = +mS[1]; }
    if (m3 || m4) { st.smjerV = m3 ? 3 : 4; st.vreteno = (st.g96 ? st.vc : st.Sset) > 0 && st.vrEn; if (!st.vrEn) info('Vreteno nema dopuštenje (SPINDLE START).'); }
    if (m5) st.vreteno = false;
    st.mda = ''; dogadaj('mdaIzveden'); crtaj(); return;
  }
  if (st.nacin === 'AUTO' && st.auto) { if (st.auto.gotov) pripremiAuto(); if (st.auto.cekaSbl) { st.auto.cekaSbl = false; st.auto.dopusten = true; } st.auto.ide = true; dogadaj('cycleStart'); crtaj(); return; }
  info('CYCLE START radi u načinu MDA ili AUTO.');
}
function pripremiAuto() {
  const tekst = st.programi[st.ucitan] || '';
  st.G54 = { ...G54_POC };
  noviPripremak(); osvjeziObradak(true);
  crtajPredmet();
  const r = prevedi(tekst);
  let ob = { abs: true };
  const objasnjenja = r.redci.map((red) => { const o = objasni(red, ob); ob = o.stanje; return o.tekst; });
  st.auto = { P: r.P, redci: r.redci, objasnjenja, i: 0, ide: false, gotov: false, trenRed: 0, F: 0, blokRed: -1, zadnjiRed: -1 };
  if (r.greske.length) info('Upozorenje: ' + r.greske.join('; '));
}
function korakAuto(dt) {
  const A = st.auto; if (!A || !A.ide) return;
  let ostatak = dt;
  while (ostatak > 0 && A.i < A.P.length) {
    const p = A.P[A.i];
    if (p[4] !== A.blokRed) {
      if (st.sbl && A.blokRed >= 0 && !A.dopusten) { A.ide = false; A.cekaSbl = true; A.trenRed = p[4]; prikaziBlok(A.blokRed + 1, p[4], true); crtaj(); return; }
      A.dopusten = false; A.blokRed = p[4];
    }
    A.trenRed = p[4];
    /* stanje vretena i alata iz bloka */
    st.g96 = p[7]; if (st.g96) st.vc = p[6]; else st.Sset = p[6]; st.lims = p[9];
    if (p[8] === 3 || p[8] === 4) { st.smjerV = p[8]; st.vreteno = p[6] > 0; } else if (p[8] === 5) st.vreteno = false;
    if (p[5] !== st.T) { st.T = p[5]; }
    if (p[2] < 0) { A.i++; if (p[2] === -2) { ostatak -= 0.4 / st.ubrzanje; } continue; }
    const L = kor(p[5]);
    const cilj = { X: p[0] + 2 * L.L1, Z: p[1] + L.L2 };             /* F revolvera */
    const dx = (cilj.X - st.nos.X) / 2, dz = cilj.Z - st.nos.Z, d = Math.hypot(dx, dz);
    const n = Math.max(1, nAkt());
    const vmin = p[2] === 0 ? F_RAPID : (p[2] === 33 ? p[3] * n : p[3] * n);
    const v = vmin * (p[2] === 33 ? 1 : st.fOver / 100) / 60 * st.ubrzanje;
    A.F = p[2] === 0 ? 0 : p[3];
    if (v <= 0) break;
    if (p[2] !== 0 && !st.vreteno) { sudar('Blok posmakom (G1/G33) pokrenut je dok vreteno miruje — alat bi udario u obradak.'); return; }
    const s = v * ostatak; const od = vrhStvarni();
    if (s >= d) { st.nos = { ...cilj }; ostatak -= d / v; A.i++; }
    else { const u = s / d; st.nos = { X: st.nos.X + 2 * dx * u, Z: st.nos.Z + dz * u }; ostatak = 0; }
    const vr = vrhStvarni();
    if (vr && od) {
      const nn = Math.max(1, Math.ceil(Math.hypot((vr.X - od.X) / 2, vr.Z - od.Z) / 0.1));
      for (let q = 1; q <= nn; q++) {
        const zt = od.Z + (vr.Z - od.Z) * q / nn, rt = (od.X + (vr.X - od.X) * q / nn) / 2;
        const pr = rezi(st.T, zt, rt, true);
        if (pr.sud) { sudar('Alat ili revolver je udario u ' + pr.sud + ' (blok ' + (A.redci[p[4]] || '').trim() + ').'); return; }
        if (pr.dub > 0.02 && p[2] === 0) { sudar('Brzi hod G0 u materijal (blok ' + (A.redci[p[4]] || '').trim() + ').'); return; }
        if (pr.dub > 0) rezi(st.T, zt, rt, false);
      }
    }
  }
  if (A.trenRed !== A.zadnjiRed) { A.zadnjiRed = A.trenRed; if (!st.sbl) prikaziBlok(A.trenRed, A.trenRed, false); }
  if (A.i >= A.P.length) { A.ide = false; A.gotov = true; st.vreteno = false; prikaziBlok(A.blokRed + 1, A.redci.length - 1, false); dogadaj('programKraj'); info('Program je završen (M30).'); }
}

/* objašnjenje bloka (korak po korak) */
function prikaziBlok(od, doR, sbl) {
  const A = st.auto, el = $('blok'); if (!A || !el) return;
  od = Math.max(0, Math.min(od, doR)); if (doR - od > 6) od = doR - 6;
  let h = '';
  for (let k = od; k <= doR; k++) { const kod = (A.redci[k] || '').trim(); if (!kod) continue; h += '<li' + (k === doR ? ' class="akt"' : '') + '><code>' + esc(kod) + '</code> <span>' + esc(A.objasnjenja[k] || '') + '</span></li>'; }
  el.innerHTML = '<p class="pom">' + (sbl ? 'SINGLE BLOCK: stroj čeka. Pročitaj blok i pritisni CYCLE START za sljedeći.' : 'Trenutni blok programa ' + esc(st.ucitan || '') + ' (redak ' + (doR + 1) + ' od ' + A.redci.length + ')') + '</p><ol class="blokovi" start="' + (od + 1) + '">' + h + '</ol>';
}
function crtajPredmet() {
  const el = $('predmet'); if (!el) return;
  const ime = st.ucitan;
  if (!ime) { el.innerHTML = '<p class="pom">Opis programa prikazuje se kad se u nizu „Izvođenje programa” odabere program PR39, PR90 ili PR98. Programi su naši primjeri za pripremak Ø80 mm.</p>'; return; }
  el.innerHTML = '<p><b>' + esc(ime) + '</b> · pripremak Ø80 mm · nultočka G54 na čelu (X 0, Z 127.539 od M)</p><p>' + esc(OPIS_PR[ime] || 'Program bez opisa.') + '</p>' +
    '<p class="pom">Alati: ' + Object.entries(ALATI).filter(([k]) => new RegExp('T' + k + '\\b').test(st.programi[ime] || '')).map(([k, a]) => 'T' + k + ' ' + a.naziv).join(' · ') + '</p>';
}

/* ================================================================== */
/* 11. Izbornik nizova i upute                                         */
/* ================================================================== */
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="kv"></span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
  el.querySelectorAll('[data-niz]').forEach((b) => b.addEventListener('click', () => pokreniNiz(b.dataset.niz)));
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korak + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k[0]) : 'Odaberi niz u izborniku lijevo.';
  $('pomoc').textContent = k ? k[1] : '';
  $('dalje').hidden = !(k && k[2] === 'dalje');
  crtajIzbornik(); crtaj();
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korak = 0; st.sudar = null; $('ponovi').hidden = true; $('poruka').textContent = '';
  pripremi(id); noviPripremak(); osvjeziObradak(true);
  st.podizanje = 0; st.Tkut = st.T;
  if (id === 'izvodenje') st.listaKursor = 0;
  if (id === 'uredivanje') st.listaKursor = Math.max(0, Object.keys(st.programi).sort().indexOf('VMDEMO') - 1);
  st.ucitan = null; crtajPredmet(); const bl = $('blok'); if (bl) bl.innerHTML = '<p class="pom">Ovdje se pri izvođenju programa prikazuje trenutni blok s objašnjenjem. Uključi SINGLE BLOCK pa se program zaustavlja nakon svakog bloka.</p>';
  if (['pisanje', 'uredivanje', 'izvodenje'].includes(id)) { st.podrucje = id === 'pisanje' ? 'Machine' : 'Program'; }
  if (id === 'ukljucivanje') pogled('straga'); else if (id === 'nultocka') pogled('obradak'); else pogled('radni');
  crtajKorak();
}

/* ================================================================== */
/* 12. Povezivanje tipki                                               */
/* ================================================================== */
$('hsk').addEventListener('click', (e) => { const b = e.target.closest('[data-hsk]'); if (b) hsk(+b.dataset.hsk); });
$('vsk').addEventListener('click', (e) => { const b = e.target.closest('[data-vsk]'); if (b) vsk(+b.dataset.vsk); });
document.querySelectorAll('[data-nacin]').forEach((b) => b.addEventListener('click', () => nacin(b.dataset.nacin)));
document.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { if (!st.struja) return; st.nacin = 'JOG'; st.refNacin = false; st.inc = +b.dataset.inc === st.inc ? 0 : +b.dataset.inc; crtaj(); }));
document.querySelectorAll('[data-os]').forEach((b) => b.addEventListener('click', () => osTipka(b.dataset.os)));
document.querySelectorAll('[data-rev]').forEach((b) => b.addEventListener('click', () => revolver(+b.dataset.rev)));
const plus = $('k-plus'), minus = $('k-minus');
let rapid = false;
[[plus, 1], [minus, -1]].forEach(([b, s]) => {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); smjer(s, rapid); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, pusti));
});
$('k-rapid').addEventListener('pointerdown', () => { rapid = true; }); $('k-rapid').addEventListener('pointerup', () => { rapid = false; });
$('k-reset').addEventListener('click', () => { if (!st.struja) return; if (!st.gljiva) st.alarm = false; st.pomicanje = null; if (st.auto) { st.auto.ide = false; } st.mda = ''; dogadaj('reset'); crtaj(); });
$('k-cstart').addEventListener('click', cycleStart);
$('k-sbl').addEventListener('click', () => { if (!st.struja) return; st.sbl = !st.sbl; if (!st.sbl && st.auto && st.auto.cekaSbl) { st.auto.cekaSbl = false; st.auto.dopusten = true; } info(st.sbl ? 'SINGLE BLOCK uključen: program staje nakon svakog bloka.' : 'SINGLE BLOCK isključen.'); crtaj(); });
$('k-cstop').addEventListener('click', () => { if (st.auto) st.auto.ide = false; st.pomicanje = null; crtaj(); });
$('k-I').addEventListener('click', () => { if (!st.struja || st.gljiva) { info(st.struja ? 'Najprije otpusti gljivu.' : 'Stroj nije uključen.'); return; } st.pogoniI = true; dogadaj('pogoni'); crtaj(); });
$('k-sstart').addEventListener('click', () => { if (!st.pogoniI) { info('Najprije uključi pogone tipkom ( I ).'); return; } st.vrEn = true; dogadaj('pogoni'); crtaj(); });
$('k-fstart').addEventListener('click', () => { if (!st.pogoniI) { info('Najprije uključi pogone tipkom ( I ).'); return; } st.posEn = true; dogadaj('pogoni'); crtaj(); });
$('k-sstop').addEventListener('click', () => { st.vreteno = false; crtaj(); });
$('k-fstop').addEventListener('click', () => { st.posEn = false; if (st.auto) st.auto.ide = false; st.pomicanje = null; crtaj(); });
$('gljiva').addEventListener('click', () => {
  if (!st.struja) return;
  if (st.gljiva) { st.gljiva = false; dogadaj('gljiva'); }
  else { st.gljiva = true; st.alarm = true; st.pogoniI = false; st.vrEn = false; st.posEn = false; st.vreteno = false; st.pomicanje = null; if (st.auto && st.auto.ide) { st.auto.ide = false; if (niz && niz.id === 'izvodenje') { korak = niz.koraci.length - 1; $('uputa').innerHTML = '<b>Prekid</b><br>' + esc(PREKID); crtaj(); return; } } }
  crtaj();
});
function glavnaSklopka() {
  if (st.struja) { st.struja = false; st.alarm = true; st.pogoniI = st.vrEn = st.posEn = false; st.vreteno = false; crtaj(); return; }
  st.struja = true; st.podizanje = 2.5; st.alarm = true; crtaj();
}
$('k-sklopka').addEventListener('click', glavnaSklopka);
$('f-over').addEventListener('input', () => { st.fOver = +$('f-over').value; $('f-over-v').textContent = st.fOver + ' %'; dogadaj('fover'); zaslon(); });
$('s-over').addEventListener('input', () => { st.sOver = +$('s-over').value; $('s-over-v').textContent = st.sOver + ' %'; zaslon(); });
document.querySelectorAll('[data-znak]').forEach((b) => b.addEventListener('click', () => znak(b.dataset.znak)));
$('t-bs').addEventListener('click', () => brisi(false)); $('t-del').addEventListener('click', () => brisi(true));
$('t-input').addEventListener('click', input);
$('t-gore').addEventListener('click', () => kursor(-1)); $('t-dolje').addEventListener('click', () => kursor(1));
$('t-lijevo').addEventListener('click', () => stupac(-1)); $('t-desno').addEventListener('click', () => stupac(1));
$('t-menu').addEventListener('click', () => { if (!st.struja) return; st.izbornik = !st.izbornik; crtaj(); });
$('t-machine').addEventListener('click', () => { if (!st.struja) return; st.izbornik = false; st.podrucje = 'Machine'; st.vsk = null; if (st.dijalog !== 'scratch') st.dijalog = null; dogadaj('podrucje'); crtaj(); });
$('t-program').addEventListener('click', () => { if (!st.struja) return; st.izbornik = false; st.podrucje = 'Program'; st.dijalog = null; st.vsk = null; dogadaj('podrucje'); crtaj(); });
$('t-recall').addEventListener('click', () => {
  if (st.dijalog === 'c93') { st.dijalog = null; st.vsk = null; st.kontura = null; dogadaj('c93Abort'); }
  else if (st.vsk) st.vsk = null; else if (st.izbornik) st.izbornik = false;
  crtaj();
});
$('dalje').addEventListener('click', () => dogadaj('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); });
$('izbornik').addEventListener('click', () => { niz = null; korak = 0; crtajKorak(); });
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('brzina').addEventListener('change', () => { st.ubrzanje = +$('brzina').value; });
st.ubrzanje = 1;
$('upravljanje').addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key.length === 1 && /[0-9A-Za-z .=,\-+()]/.test(e.key)) { znak(e.key.toUpperCase()); e.preventDefault(); }
  else if (e.key === 'Backspace') { brisi(false); e.preventDefault(); } else if (e.key === 'Delete') { brisi(true); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { stupac(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { stupac(1); e.preventDefault(); } else if (e.key === 'Enter') { input(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { kursor(-1); e.preventDefault(); } else if (e.key === 'ArrowDown') { kursor(1); e.preventDefault(); }
});
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
renderer.domElement.addEventListener('click', (e) => {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera); const h = ray.intersectObject(sklopka, true); if (h.length) { glavnaSklopka(); }
});

function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now(), zadnjiZaslon = 0;
function petlja(t) {
  const dtr = (t - zadnje) / 1000, dt = Math.min(0.1, dtr); zadnje = t;
  if (st.podizanje > 0) { st.podizanje -= dtr; if (st.podizanje <= 0) { st.podizanje = 0; dogadaj('sklopka'); crtaj(); } }
  korakGibanja(dt); korakAuto(dt); osvjeziObradak(false); postavi3D(dt);
  if (t - zadnjiZaslon > 120 && st.struja && st.podizanje <= 0 && (st.pomicanje || (st.auto && st.auto.ide) || st.vreteno)) { zadnjiZaslon = t; zaslon(); }
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(petlja);
}
noviPripremak(); osvjeziObradak(true);
crtajIzbornik(); crtajKorak(); velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__840 = { st, pogled, camera, controls, prikaziBlok, get ALATI() { return ALATI; }, NIZOVI, pokreniNiz, dogadaj, get niz() { return niz; }, get korak() { return korak; }, prikazWKS, prikazMKS, vrhStvarni, celo, ro, ri, prevedi, rezi };
requestAnimationFrame(petlja);
