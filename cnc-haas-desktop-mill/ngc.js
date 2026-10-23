/* FORTRONIQ · Haas Desktop Mill — simulator upravljanja NGC (zaslon, tipkovnica privjeska, stroj u 3D), nizovi s koracima.
   Model, zaslon i tekst su naši; nazivi tipki kao na upravljanju Haas (engleski). Ponašanje prema Haas Mill Operator's Manualu (javno).
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PREDMETI } from './programi_p.js?v=02';
import { PROGRAMI_H } from './programi_haas.js?v=02';
import { prevedi, opisiOperacije, razlozi } from './gkod.js?v=02';
import { pretvori, objasniHaas, uHaas, rijeci } from './haas_gkod.js?v=02';
import { napraviStrojHaas, postaviOkolinu, GEO } from './stroj_haas.js?v=02';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dro = (v) => { const x = Math.abs(v) < 0.00005 ? 0 : v; return (x < 0 ? '-' : '') + Math.abs(x).toFixed(3); };
const kr = (v, d = 2) => v.toFixed(d).replace('.', ',');
const OSI = ['X', 'Y', 'Z'];

/* ================================================================== */
/* 1. Podaci stroja                                                     */
/* ================================================================== */
const HOD = GEO.HOD, XT0 = GEO.XT0, YT0 = GEO.YT0, NOS0 = GEO.NOS0;
const BRZI = 3600, F_REF = 2000, S_MAX = 15000, S_MIN = 1500;                       /* brzi hod (proizvođač), referenciranje (pretpostavka) */
const INC = [0.001, 0.01, 0.1, 1], INC_TIPKA = { '.0001': 0.001, '.001': 0.01, '.01': 0.1, '.1': 1 };
const JOG_V = { 0.001: 2.54, 0.01: 25.4, 0.1: 254, 1: 2540 };                       /* mm/min za tipke gibanja (.1 … 100 in/min) */
const ALATI = { 1: { naziv: 'ravno glodalo Ø3 mm, 2 oštrice', d: 3, Lt: 24, vrsta: 'glodalo' }, 2: { naziv: 'ravno glodalo Ø6 mm, 2 oštrice', d: 6, Lt: 26, vrsta: 'glodalo' }, 3: { naziv: 'svrdlo Ø5 mm', d: 5, Lt: 30, vrsta: 'svrdlo' } };
const ALATI_IME = Object.fromEntries(Object.entries(ALATI).map(([k, v]) => [k, v.naziv]));
const Lt = (t) => (ALATI[t] ? ALATI[t].Lt : 0), rAl = (t) => (ALATI[t] ? ALATI[t].d / 2 : 1.5);
const VJEZBA = { L: 100, W: 60, H: 20, xc: 0, yc: 0 };
const PROG_P = Object.keys(PREDMETI).filter((k) => !k.includes('_')).sort();
const O_ZA_P = (ime) => 'O' + String(2000 + parseInt(ime.replace(/\D/g, ''), 10)).padStart(5, '0');
const PROG_O01004 = ['G00 G17 G21 G40 G49 G80 G90', 'T1 M06', 'G54 G00 X10. Y10.', 'G43 H01 Z25.', 'M30'];

/* ================================================================== */
/* 2. Nizovi i koraci: [uputa, pomoć, kod događaja]                     */
/* ================================================================== */
const NIZOVI = [
  { id: 'ukljucivanje', grupa: 'Postavljanje stroja', naziv: 'Uključivanje', koraci: [
    ['Pritisni POWER ON na upravljačkoj jedinici i pričekaj da se upravljanje pokrene.', 'Zeleni gumb POWER ON gore lijevo na upravljačkoj jedinici (zasebna kutija pokraj stroja, spojena kabelima CONTROL CBL 1 i 2; ima vlastiti priključak 240 V). Upravljanje se pokreće nekoliko sekundi; zatim prikazuje alarme 102 SERVOS OFF i 107 EMERGENCY OFF.', 'powerOn'],
    ['Otpusti EMERGENCY STOP (zakreni gljivu).', 'Crvena gljiva sa žutim prstenom lijevo na upravljačkoj jedinici. Dok je pritisnuta, pogoni osi i vreteno su bez napajanja (alarm 107).', 'estop'],
    ['Pritisni RESET — alarmi se brišu i pogoni se uključuju.', 'RESET briše alarme koji više nisu aktivni. Na zaslonu ostaje poruka da osi nisu referencirane.', 'reset'],
    ['Pritisni POWER UP: sve osi odlaze u nultočku stroja (ZERO RETURN) — Z prva, zatim X i Y.', 'POWER UP = referenciranje svih osi nakon uključivanja. Isto radi ZERO RET → ALL. Prati položaj u stupcu MACHINE: na kraju X 0.000, Y 0.000, Z 0.000.', 'powerUp'],
    ['Kraj niza „Uključivanje”. Vrati se u izbornik ili odaberi sljedeći niz.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'rucno', grupa: 'Postavljanje stroja', naziv: 'Ručno gibanje', koraci: [
    ['Pritisni HANDLE JOG — način ručnog gibanja.', 'Tipka HANDLE JOG u stupcu MODE. Zaslon pokazuje odabranu os i korak kotača.', 'jogNacin'],
    ['Odaberi os X za ručni kotač: kratko pritisni tipku +X (ili tipku X na tipkovnici).', 'Tipka za gibanje osi ujedno bira os za ručni kotač. Odabrana os piše ispod kotača.', 'osX'],
    ['Odaberi korak .1/100. — jedan klik kotača pomakne os za 1 mm (metrički način).', 'Četiri tipke uz HANDLE JOG: .0001 = 0,001 mm, .001 = 0,01 mm, .01 = 0,1 mm, .1 = 1 mm po kliku kotača. Drugi broj je brzina za tipke gibanja.', 'inc1'],
    ['Okreni ručni kotač i pomakni os X za najmanje 10 mm (10 klikova).', 'Gumbi − / + uz kotač, kotačić miša iznad kotača ili tipke ← → (fokus na upravljanju).', 'kotac10'],
    ['Drži tipku −Z i spusti os Z za najmanje 5 mm.', 'Tipke za gibanje gibaju os dok ih držiš, brzinom prema odabranom koraku (.1/100. = 2540 mm/min). Pazi na pripremak u škripcu.', 'tipkeZ'],
    ['Drži RAPID zajedno s tipkom gibanja (klikni RAPID pa drži tipku) — os ide brzim hodom.', 'RAPID uključuje brzi hod za tipke gibanja. U simulatoru RAPID se uključi klikom i vrijedi za sljedeće držanje tipke.', 'rapid'],
    ['Dovedi alat u položaj X −80.000, Y −120.000, Z −20.000 u koordinatama stroja (stupac MACHINE).', 'Kombiniraj korake 1, 0,1 i 0,01 mm. Koordinate stroja na Haasu su negativne: nultočka je u krajnjem +X, +Y, +Z položaju.', 'polozaj'],
    ['Kraj niza „Ručno gibanje”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'alat', grupa: 'Postavljanje stroja', naziv: 'Alat i korekcija duljine', koraci: [
    ['U vretenu je T1 (glodalo Ø3). Pripremak 100 × 60 × 20 mm je u škripcu. Duljina alata mjeri se tako da vrh alata dodirne gornju plohu pripremka (metoda papira), a tipka TOOL OFFSET MEASURE upiše položaj Z stroja u zapis H alata. Nultočka obratka u Z (G54 Z) tada ostaje 0.', 'Pritisni „Dalje”. Stanje papira prikazano je ispod tipkovnice.', 'dalje'],
    ['Pritisni OFFSET i otvori karticu TOOL.', 'Tipka OFFSET u skupini DISPLAY; ponovni pritisak mijenja karticu TOOL / WORK. Kartica se mijenja i tipkama ◀ ▶.', 'offsetTool'],
    ['Stavi kursor na alat T1 (stupac LENGTH GEOMETRY).', 'Tipke ▲ ▼ pomiču kursor po alatima.', 'kursorT1'],
    ['HANDLE JOG: spuštaj alat iznad pripremka dok papir ne zapne između vrha alata i gornje plohe. Vreteno stoji.', 'Alat je iznad pripremka. Korak 0,1 mm dok je daleko, 0,01 mm blizu plohe. Ako pretjeraš, alat udari u pripremak — niz se ponavlja.', 'dodirZ1'],
    ['Pritisni TOOL OFFSET MEASURE: u H01 se upiše trenutačni Z stroja.', 'Vrijednost je negativna (npr. −22.xxx): toliko je čelo vretena ispod nultočke stroja kad vrh alata dodiruje plohu.', 'izmjeri1'],
    ['Ručna izmjena alata: MDI → upiši T2 M06 → ENTER → CYCLE START. Program stane s porukom za izmjenu.', 'Desktop Mill nema izmjenjivač: M06 zaustavi program i čeka. Najprije podigni alat (HANDLE JOG, +Z) da ima mjesta.', 'mdiT2'],
    ['Podigni zaštitna vrata, pritisni „Ručna izmjena alata” i stavi T2 (glodalo Ø6) u vreteno, spusti vrata.', 'Gumbi „Zaštitna vrata (gore)” i „Ručna izmjena alata” ispod tipkovnice. Vreteno mora stajati.', 'zamijeni2'],
    ['Pritisni CYCLE START — MDI blok se dovrši.', 'Nakon izmjene CYCLE START nastavlja od M06.', 'nastavi2'],
    ['Kursor na T2, spusti T2 do dodira s plohom i pritisni TOOL OFFSET MEASURE — H02.', 'T2 je dulji od T1, pa će H02 biti manje negativan od H01.', 'izmjeri2'],
    ['Kraj niza „Alat i korekcija duljine”. H01 i H02 su upisani; program ih zove s G43 H01 / G43 H02.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'nultocka', grupa: 'Postavljanje stroja', naziv: 'Nultočka obratka', koraci: [
    ['Nultočka G54 bit će lijevi prednji gornji kut pripremka 100 × 60 × 20 mm. X i Y određuju se dodirom rubova glodalom T1 (Ø3) metodom papira, a tipka PART ZERO SET upiše položaj stroja u G54. Z ostaje 0 jer je duljina alata izmjerena na gornjoj plohi.', 'Pritisni „Dalje”.', 'dalje'],
    ['Pritisni OFFSET i otvori karticu WORK.', 'OFFSET, zatim ▶ ili ponovni OFFSET za karticu WORK.', 'offsetWork'],
    ['Stavi kursor na G54, stupac X.', 'Tipke ▲ ▼ ◀ ▶.', 'kursor54X'],
    ['HANDLE JOG: alat je lijevo od pripremka, oko 3 mm ispod gornje plohe. Približavaj se lijevom rubu (+X) dok papir ne zapne.', 'Korak 0,1 mm, blizu ruba 0,01 mm. Vreteno stoji.', 'dodirX'],
    ['Pritisni PART ZERO SET: u G54 X upiše se trenutačni X stroja.', 'PART ZERO SET upisuje položaj stroja za os na kojoj je kursor.', 'pzsX'],
    ['Os alata je za polumjer (1,5 mm) lijevo od ruba: upiši 1.5 i pritisni ENTER — vrijednost se DODAJE u G54 X.', 'Na Haasu ENTER dodaje upisani broj postojećoj vrijednosti, a F1 je upisuje umjesto nje. Rub je desno od osi alata, pa se dodaje +1,5.', 'dodajRX'],
    ['Stavi kursor na G54, stupac Y.', 'Tipka ▶.', 'kursor54Y'],
    ['Podigni alat, dovedi ga ispred pripremka (−Y) i spusti; približavaj se prednjem rubu (+Y) dok papir ne zapne.', 'Najprije +Z iznad pripremka, X na sredinu, −Y ispred ruba, −Z dolje, polako +Y.', 'dodirY'],
    ['Pritisni PART ZERO SET, zatim upiši 1.5 i ENTER.', 'Isto kao za X: rub je 1,5 mm dalje od osi alata u smjeru +Y.', 'dodajRY'],
    ['Kraj niza „Nultočka obratka”. Stupac WORK sada pokazuje položaj od lijevog prednjeg gornjeg kuta.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'mdi', grupa: 'Program', naziv: 'MDI', koraci: [
    ['Pritisni MDI — ručni unos blokova.', 'U načinu MDI blokovi se upisuju u privremeni program i izvode s CYCLE START.', 'mdiNacin'],
    ['Upiši S3000 M03 i pritisni ENTER, zatim CYCLE START — vreteno se vrti 3000 o/min.', 'Blok se upisuje tipkama ili tipkovnicom računala (fokus na upravljanju). ENTER prebaci blok iz retka INPUT u MDI program. Vrata moraju biti zatvorena.', 'mdiS'],
    ['Upiši G54 G00 X10. Y10. i ENTER, zatim CYCLE START — alat ide iznad točke X10 Y10 obratka.', 'Decimalna točka je obvezna: X10 bez točke bio bi 0,010 mm. Prethodni blok ostaje u MDI programu; CYCLE START izvodi blokove od kursora.', 'mdiG'],
    ['Upiši M05 i ENTER, CYCLE START — vreteno stane.', 'M05 zaustavlja vreteno. ERASE PROG briše MDI program.', 'mdiM5'],
    ['Kraj niza „MDI”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'pisanje', grupa: 'Program', naziv: 'Pisanje programa', koraci: [
    ['Pritisni LIST PROG — popis programa u memoriji.', 'Tipka LIST PROG u stupcu MODE.', 'list'],
    ['Pritisni INSERT — otvara se prozor za novi program.', 'U popisu programa INSERT otvara prozor s poljem O NUMBER.', 'insertDlg'],
    ['Upiši O01004 i pritisni ENTER — program je stvoren i otvoren u EDIT.', 'Broj programa ima slovo O i pet znamenki. Naziv u zagradama nije obvezan.', 'noviO'],
    ['Upiši prvi blok: G00 G17 G21 G40 G49 G80 G90 i pritisni ENTER.', 'Sigurnosni blok: brzi hod, ravnina XY, milimetri, bez korekcija, bez ciklusa, apsolutno. ENTER (ili INSERT) upisuje blok iza kursora.', 'blok1'],
    ['Upiši T1 M06 i ENTER.', 'Odabir alata T1 i izmjena. Na Desktop Millu ručna.', 'blok2'],
    ['Upiši G54 G00 X10. Y10. i ENTER.', 'Pomak nultočke G54 i brzi hod u ravnini — s decimalnim točkama!', 'blok3'],
    ['Upiši G43 H01 Z25. i ENTER.', 'Korekcija duljine alata H01 i tek tada gibanje u Z.', 'blok4'],
    ['Upiši M30 i ENTER.', 'Kraj programa. Program O01004 možeš izvesti u nizu „Izvođenje programa” (SELECT PROG).', 'blok5'],
    ['Kraj niza „Pisanje programa”. Blokove možeš popraviti: ALTER zamjenjuje, DELETE briše, UNDO vraća.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'izvodenje', grupa: 'Program', naziv: 'Izvođenje programa', koraci: [
    ['LIST PROG → kursor na O01001 (KRUZNI DZEP) → SELECT PROG.', 'SELECT PROG čini program aktivnim (ime u gornjem retku). O01001 je vježba VMDEMO s 840D prevedena na Haas; pripremak 120 × 90 × 20 i alat T2 postavljeni su.', 'select'],
    ['Pritisni MEM — izvođenje programa iz memorije.', 'U MEM se prikazuje aktivni program, a CYCLE START ga pokreće od početka.', 'mem'],
    ['Zbog sigurnosti smanji FEED override na 10 %.', 'Tipka −10% FEED devet puta (korak 10 %).', 'f10'],
    ['Spusti zaštitna vrata i pritisni CYCLE START. Prati prve blokove.', 'S podignutim vratima CYCLE START ne radi (door hold). Vreteno pokreće S3000 M03; zatim G54 G00 X3. Y-6. i G43 H02 Z25.', 'start'],
    ['Kad je sve u redu, vrati FEED override na 100 %.', 'Tipka 100% FEED. Simulaciju ubrzava izbor ispod 3D prikaza.', 'fUp'],
    ['Pritisni FEED HOLD: osi stanu, vreteno se i dalje vrti. CYCLE START nastavlja.', 'FEED HOLD je privremeni zastoj; RESET bi prekinuo program i zaustavio vreteno.', 'hold'],
    ['Uključi SINGLE BLOCK i nastavi s CYCLE START: program stane nakon svakog bloka, a ispod upute piše što blok radi. Prođi barem tri bloka.', 'Svaki CYCLE START izvede jedan blok. Ciklus G13 je jedan blok, ali traje dugo — ubrzaj simulaciju.', 'single'],
    ['Isključi SINGLE BLOCK, CYCLE START i pričekaj kraj programa (M30).', 'Ubrzanje ×20 ili ×100 skraćuje čekanje.', 'gotovo'],
    ['Čestitamo! Program je izveden. Pogledaj obradak u pogledu „Obradak”. Isprobaj i O01002 (G81/G83), O01003 (M97) i predmete P05 … P21.', 'Klikni „Izbornik”.', 'kraj']] }
];

/* ================================================================== */
/* 3. Stanje                                                          */
/* ================================================================== */
const st = {};
function pocetno() {
  Object.assign(st, {
    power: 'off', bootT: 0, estop: true, servo: false, alarmi: [], homed: false, homing: null, refOff: { X: 0, Y: 0, Z: 0 },
    fiz: { X: -61.37, Y: -140.2, Z: -18.5 }, vrata: false,
    nacin: 'MEM', prikaz: 'PROGRAM', offTab: 'tool', offKur: { r: 0, c: 0 }, listKur: 0, dlg: null,
    jogOs: 'X', jogInc: 0.1, jog: null, rapid: false, put: { X: 0, Y: 0, Z: 0 }, putCont: { X: 0, Y: 0, Z: 0 }, putKot: { X: 0, Y: 0, Z: 0 },
    fro: 100, sro: 100, rro: 100, alatU: 1, T: 1, S: 0, rpm: 0, cw: false, g43: false,
    H: { 1: 0, 2: 0, 3: 0 }, off: { 54: { X: 0, Y: 0, Z: 0 }, 55: { X: 0, Y: 0, Z: 0 }, 56: { X: 0, Y: 0, Z: 0 }, 57: { X: 0, Y: 0, Z: 0 }, 58: { X: 0, Y: 0, Z: 0 }, 59: { X: 0, Y: 0, Z: 0 } }, offAkt: 54,
    programi: {}, odabran: null, prog: null, ed: null, mdi: { redci: [], kursor: 0 }, run: null, single: false, optStop: false, dryRun: false,
    unos: '', poruka: '', alarm: null, ubrzanje: st.ubrzanje || 1, pribor: null, sbBroj: 0, pregled: 0, cekanje: null
  });
  st.programi = {}; Object.entries(PROGRAMI_H).forEach(([o, p]) => { st.programi[o] = { naslov: p.naslov, tekst: p.tekst, ugradjen: true, L: p.L, W: p.W, H: p.H, alat: p.alat, opis: p.opis }; });
  PROG_P.forEach((ime) => { const p = PREDMETI[ime]; if (p.L > 250) return; st.programi[O_ZA_P(ime)] = { naslov: ime, tekst: uHaas(ime, p.G, { L: p.L, W: p.W, H: p.H, broj: 2000 + parseInt(ime.replace(/\D/g, ''), 10) }), ugradjen: true, L: p.L, W: p.W, H: p.H, alat: 1, ops: p.ops, G: p.G, P: ime }; });
}
pocetno();
let niz = null, korak = 0; const gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-cnc-haas-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-cnc-haas-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }

const mach = (o) => st.fiz[o] - st.refOff[o];
const rad = (o) => mach(o) - st.off[st.offAkt][o] - (o === 'Z' && st.g43 ? st.H[st.alatU] || 0 : 0);
const R = () => rAl(st.alatU);
const vrh = () => ({ x: st.fiz.X + XT0, y: st.fiz.Y + YT0, z: NOS0 + st.fiz.Z - Lt(st.alatU) });    /* vrh alata u okviru stola */
const naOn = () => st.power === 'on';

/* ================================================================== */
/* 4. Scena                                                            */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 2, 9000);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(700, 1300, 1000); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-800, 600, -500); scene.add(sun2);
postaviOkolinu(THREE, renderer, scene);
const S = napraviStrojHaas(THREE, scene);
const BOJA_G = new THREE.Color(0xd7dbde), BOJA_R = new THREE.Color(0x6f8792), BOJA_MDF = new THREE.Color(0xc49a66), BOJA_MDFR = new THREE.Color(0x8a6237), BOJA_V = new THREE.Color(0xe8e0c8), BOJA_VR = new THREE.Color(0xb3a37a);

function pogled(p) {
  const V = { stroj: [[-700, 520, 1500], [220, 120, 60]], radni: [[-260, 300, 560], [0, 40, 60]], obradak: [[-180, 220, 300], [0, 20, 40]], privjesak: [[760, 260, 900], [640, 60, 300]] }[p] || [[-700, 520, 1500], [220, 120, 60]];
  if (p === 'radni' || p === 'obradak') { const zs = S.saonice.position.z, xs = S.stol.position.x; V[0][0] += xs; V[1][0] += xs; V[0][2] += zs; V[1][2] += zs; }
  camera.position.set(...V[0]); controls.target.set(...V[1]); controls.update();
}

/* --- ploča: visinska mreža (okvir stola) --------------------------- */
let PL = null;
function ukloniPlocu() { if (!PL) return; S.obrGrupa.remove(PL.mesh, PL.rub); PL.mesh.geometry.dispose(); PL.rub.geometry.dispose(); PL = null; }
function napraviPlocu(L, W, H, x0, y0, bot, mat) {
  ukloniPlocu();
  const k = L * W > 22000 ? 0.75 : 0.5, nx = Math.round(L / k) + 1, ny = Math.round(W / k) + 1, kx = L / (nx - 1), ky = W / (ny - 1);
  const vis = new Float32Array(nx * ny).fill(H), pos = new Float32Array(nx * ny * 3), col = new Float32Array(nx * ny * 3), idx = [];
  const bg = mat === 'mdf' ? BOJA_MDF : mat === 'vosak' ? BOJA_V : BOJA_G, br = mat === 'mdf' ? BOJA_MDFR : mat === 'vosak' ? BOJA_VR : BOJA_R;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const q = j * nx + i; pos.set([x0 + i * kx, bot + H, -(y0 + j * ky)], 3 * q); col.set([bg.r, bg.g, bg.b], 3 * q);
    if (i < nx - 1 && j < ny - 1) { const a = q, b = q + 1, c = q + nx, d = q + nx + 1; idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mat === 'alu' ? 0.45 : 0.8, metalness: mat === 'alu' ? 0.35 : 0, side: THREE.DoubleSide }));
  const rub = []; for (let i = 0; i < nx; i++) rub.push(i); for (let j = 1; j < ny; j++) rub.push(j * nx + nx - 1); for (let i = nx - 2; i >= 0; i--) rub.push((ny - 1) * nx + i); for (let j = ny - 2; j > 0; j--) rub.push(j * nx);
  const rp = new Float32Array(rub.length * 6), ri = [];
  rub.forEach((q, n) => { const x = pos[3 * q], z = pos[3 * q + 2]; rp.set([x, bot + H, z, x, bot, z], 6 * n); const m = (n + 1) % rub.length; ri.push(2 * n, 2 * n + 1, 2 * m, 2 * m, 2 * n + 1, 2 * m + 1); });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
  const rm = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: bg.getHex(), roughness: 0.6, metalness: mat === 'alu' ? 0.3 : 0, side: THREE.DoubleSide }));
  mesh.userData.dio = rm.userData.dio = 'obradak';
  S.obrGrupa.add(mesh, rm);
  PL = { L, W, H, x0, y0, bot, top: bot + H, k, kx, ky, nx, ny, vis, mesh, rub: rm, rubIdx: rub, prljavo: false, bg, br };
}
function osvjeziPlocu() {
  if (!PL || !PL.prljavo) return; PL.prljavo = false;
  const p = PL.mesh.geometry.attributes.position.array, c = PL.mesh.geometry.attributes.color.array, t = new THREE.Color();
  for (let q = 0; q < PL.vis.length; q++) { p[3 * q + 1] = PL.bot + PL.vis[q]; t.copy(PL.bg).lerp(PL.br, Math.min(1, (PL.H - PL.vis[q]) / 2.5)); c[3 * q] = t.r; c[3 * q + 1] = t.g; c[3 * q + 2] = t.b; }
  PL.mesh.geometry.attributes.position.needsUpdate = true; PL.mesh.geometry.attributes.color.needsUpdate = true; PL.mesh.geometry.computeVertexNormals();
  const rp = PL.rub.geometry.attributes.position.array; PL.rubIdx.forEach((q, n) => { rp[6 * n + 1] = PL.bot + PL.vis[q]; }); PL.rub.geometry.attributes.position.needsUpdate = true;
}
function ploca(t, rezi) {
  if (!PL) return 0; const h = t.z - PL.bot; if (h >= PL.H) return 0; const r = R();
  const i0 = Math.max(0, Math.floor((t.x - r - PL.x0) / PL.kx)), i1 = Math.min(PL.nx - 1, Math.ceil((t.x + r - PL.x0) / PL.kx));
  const j0 = Math.max(0, Math.floor((t.y - r - PL.y0) / PL.ky)), j1 = Math.min(PL.ny - 1, Math.ceil((t.y + r - PL.y0) / PL.ky));
  const r2 = r * r, hh = Math.max(0, h); let pr = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dx = PL.x0 + i * PL.kx - t.x, dy = PL.y0 + j * PL.ky - t.y; if (dx * dx + dy * dy > r2) continue;
    const q = j * PL.nx + i; if (PL.vis[q] > hh) { pr = Math.max(pr, PL.vis[q] - hh); if (rezi) { PL.vis[q] = hh; PL.prljavo = true; } }
  }
  return pr;
}
function visinaPloce(x, y) { if (!PL) return null; const i = Math.round((x - PL.x0) / PL.kx), j = Math.round((y - PL.y0) / PL.ky); if (i < 0 || j < 0 || i >= PL.nx || j >= PL.ny) return null; return PL.bot + PL.vis[j * PL.nx + i]; }

/* ================================================================== */
/* 5. Pribor, pripremak, nultočka, alati                                 */
/* ================================================================== */
function opisPribora(t) { $('pribor-opis').textContent = t; }
function hZa(T, top) { return top - NOS0 + Lt(T); }                       /* vrijednost H kad vrh alata T dodiruje plohu na visini top */
function postaviPripremak(L, W, H, mat, tekst) {
  const uSkr = L <= 100 && W <= 60;
  const p = uSkr ? S.skripacZa(L, W, H, 0, 0) : S.pandzeZa(L, W, H, 0, 0);
  napraviPlocu(L, W, H, p.x0, p.y0, p.bot, mat);
  st.pribor = uSkr ? 'skripac' : 'pandze';
  opisPribora('Pripremak ' + L + ' × ' + W + ' × ' + H + ' mm (' + (mat === 'alu' ? 'aluminij' : mat === 'vosak' ? 'strojni vosak' : 'MDF') + ') ' + (uSkr ? 'u niskom škripcu' : 'na podložnoj ploči sa steznim pandžama') + (tekst ? '; ' + tekst : '') + '.');
  return p;
}
function postaviVjezbu() { postaviPripremak(VJEZBA.L, VJEZBA.W, VJEZBA.H, 'alu', 'nultočka G54 u lijevom prednjem gornjem kutu'); }
function nultockaNaKut() { st.off[54] = { X: PL.x0 - XT0, Y: PL.y0 - YT0, Z: 0 }; S.nulaW.position.set(PL.x0, PL.top, -PL.y0); S.nulaW.visible = true; }
function izmjeriAlate() { Object.keys(ALATI).forEach((t) => { st.H[t] = PL ? hZa(+t, PL.top) : 0; }); }
function bezPribora() { ukloniPlocu(); S.bezPribora(); st.pribor = null; S.nulaW.visible = false; opisPribora('Na stolu nema pripremka. Pripremak se postavlja kad odabereš program (SELECT PROG).'); }
function stroj3DAlat() { const a = ALATI[st.alatU]; S.postaviAlat(a.Lt, a.d, a.vrsta); $('fiz-alat').textContent = 'u vretenu: T' + st.alatU + ' (' + a.naziv + ')'; }
/* raspon putanje (vrh alata, okvir stroja) i provjera hoda */
function provjeriHod(P) {
  const gr = []; if (!P.length) return gr;
  const o = { X: [Infinity, -Infinity], Y: [Infinity, -Infinity], Z: [Infinity, -Infinity] };
  P.forEach((p) => { o.X[0] = Math.min(o.X[0], p[0]); o.X[1] = Math.max(o.X[1], p[0]); o.Y[0] = Math.min(o.Y[0], p[1]); o.Y[1] = Math.max(o.Y[1], p[1]); o.Z[0] = Math.min(o.Z[0], p[2]); o.Z[1] = Math.max(o.Z[1], p[2]); });
  for (const a of ['X', 'Y']) { const lo = o[a][0], hi = o[a][1], tr = hi - lo, hod = HOD[a][1] - HOD[a][0];
    if (tr > hod + 1e-6) gr.push('putanja u ' + a + ' treba ' + kr(tr, 1) + ' mm, a hod je ' + hod + ' mm');
    else if (lo < HOD[a][0] - 1e-6 || hi > HOD[a][1] + 1e-6) gr.push('putanja u ' + a + ' izlazi iz hoda (' + kr(lo, 1) + ' … ' + kr(hi, 1) + ' mm)'); }
  /* Z: vrh alata = Z + NOS0 − Lt; čelo vretena (Z) mora ostati u hodu */
  const zlo = o.Z[0] + Lt(st.alatU), zhi = o.Z[1] + Lt(st.alatU);
  if (zlo < HOD.Z[0] - 1e-6 || zhi > HOD.Z[1] + 1e-6) gr.push('čelo vretena u Z izlazi iz hoda (' + kr(zlo, 1) + ' … ' + kr(zhi, 1) + ' mm)');
  return gr;
}

/* ================================================================== */
/* 6. Program: priprema, izvođenje                                       */
/* ================================================================== */
function prevediProgram(tekst, ime) {
  const r = pretvori(tekst, { offsets: st.off, H: st.H, Lt, polumjer: rAl, T0: st.alatU, programi: Object.fromEntries(Object.entries(st.programi).map(([k, v]) => [k, v.tekst])) });
  const txt = r.B.map((b) => b.kod).join('\n');
  const pv = prevedi(txt, { start: { X: st.fiz.X, Y: st.fiz.Y, Z: st.fiz.Z, A: 0 }, G54: { X: 0, Y: 0, Z: 0, A: 0 }, T0: st.alatU, duljina: Lt, alatPostoji: () => true, korak: 0.5 });   /* Z = čelo vretena; prevedi oduzima duljinu alata i prati M06 */
  /* vreteno po bloku B */
  const vrti = new Uint8Array(r.B.length), Sr = new Float32Array(r.B.length); let v = st.cw ? 1 : 0, s = st.S;
  r.B.forEach((b, i) => { const { w } = razlozi(b.kod); if (w.S !== undefined) s = w.S; if (w.M.includes(3) || w.M.includes(4)) v = 1; if (w.M.includes(5) || w.M.includes(30) || w.M.includes(2)) v = 0; vrti[i] = v; Sr[i] = s; });
  const redci = String(tekst).replace(/\r/g, '').split('\n'); const obj = new Array(redci.length); let sta = {};
  redci.forEach((l, i) => { const o = objasniHaas(l, sta); obj[i] = o.tekst; sta = o.stanje; });
  const ev = r.B.map((b, i) => (b.ev ? { i, ev: b.ev, red: b.red } : null)).filter(Boolean);
  const alarmi = r.greske.filter((g) => g.alarm).map((g) => ({ br: g.alarm, tekst: g.tekst, red: g.red }));
  const upoz = r.greske.filter((g) => !g.alarm).map((g) => 'red ' + (g.red + 1) + ': ' + g.tekst).concat(pv.greske);
  return { ime, B: r.B, P: pv.P, vrti, Sr, redci, obj, ev, alarmi, upoz, info: r.info, hod: provjeriHod(pv.P), i: 0, evI: 0, ide: false, gotov: false, trenBlok: -1, trenRed: 0, zadRed: -1, prikRed: -1, zapoceta: -1, preskoci: false, F: 0, v: 0, cekaj: 0 };
}
function odaberiProgram(ime) {
  const pr = st.programi[ime]; if (!pr) return;
  st.odabran = ime; st.pregled = 0;
  /* pripremak i nultočka prema programu */
  const mat = pr.P ? 'mdf' : 'vosak';
  postaviPripremak(pr.L, pr.W, pr.H, mat, 'nultočka G54 u lijevom prednjem gornjem kutu'); nultockaNaKut(); izmjeriAlate();
  const A = prevediProgram(pr.tekst, ime); st.prog = A;
  if (pr.ops) { A.ops = pr.ops.map((o) => { const i = A.redci.findIndex((l) => l.toUpperCase().includes('(OP ' + o.naziv.toUpperCase())); return { ...o, red: i >= 0 ? i : o.red }; }); A.opisi = opisiOperacije(pr.G, pr.ops, ALATI_IME); } else { A.ops = []; A.opisi = []; }
  status(ime + ' ' + pr.naslov + ' odabran' + (A.hod.length ? ' — upozorenje: ' + A.hod.join('; ') : ''));
  info('Pripremak ' + pr.L + ' × ' + pr.W + ' × ' + pr.H + ' mm je stegnut, G54 postavljen na lijevi prednji gornji kut, alati izmjereni (H01 … H03). ' + (A.hod.length ? 'POZOR: program ne stane u hod stroja — ' + A.hod.join('; ') + '. Haas bi javio alarm OVER TRAVEL RANGE.' : 'Program stane u hod stroja.') + (A.alarmi.length ? ' Program ima grešku: ' + A.alarmi[0].br + ' (red ' + (A.alarmi[0].red + 1) + ') — ' + A.alarmi[0].tekst : ''), !!(A.hod.length || A.alarmi.length));
  crtajPredmet(); crtaj();
  dogadaj('select', { ime, stane: !A.hod.length });
}
function rpmCilj() {
  if (!naOn() || !st.servo || st.estop || st.alarmi.length) return 0;
  if (st.vrata) return 0;
  return st.cw ? Math.min(S_MAX, st.S) * st.sro / 100 : 0;
}
function postaviS(Sv) {
  if (Sv > S_MAX) { if (!st.sUpoz) status('S' + Sv + ' je iznad najveće brzine vretena — ograničeno na ' + S_MAX + ' o/min.'); st.sUpoz = true; }
  if (Sv > 0 && Sv < S_MIN) status('S' + Sv + ': ispod ' + S_MIN + ' o/min vreteno Desktop Milla se pregrijava (proizvođač).');
  st.S = Math.min(Sv, S_MAX);
}
function alarmProg(br, tekst) { st.alarmi.push({ br, tekst }); st.cw = false; if (st.run) st.run.ide = false; st.jog = null; st.homing = null; status('ALARM ' + br + ' ' + tekst); crtaj(); }
/* događaji između blokova (M06, M00, M01, G04, M30): vraća false ako program mora stati */
function obradiDogadaje(A, doBloka) {
  while (A.evI < A.ev.length && A.ev[A.evI].i <= doBloka) {
    const e = A.ev[A.evI], ev = e.ev;
    if (ev.m06 !== undefined && ev.m06 !== st.alatU && !ev.gotovo) {
      A.ide = false; st.cekanje = { vrsta: 'alat', T: ev.m06, A }; st.cw = false; ev.gotovo = true;
      status('T' + ev.m06 + ' M06 — zamijeni alat ručno i pritisni CYCLE START'); info('Ručna izmjena alata: podigni zaštitna vrata, pritisni „Ručna izmjena alata” (T' + ev.m06 + ' u vreteno), spusti vrata i pritisni CYCLE START.'); crtaj(); dogadaj('alatCekanje', { T: ev.m06 }); return false;
    }
    if (ev.m06 !== undefined) st.T = ev.m06;
    if (ev.m00 && !ev.gotovo) { A.ide = false; ev.gotovo = true; st.cekanje = { vrsta: 'm00', A }; status('M00 PROGRAM STOP — CYCLE START nastavlja'); crtaj(); return false; }
    if (ev.m01 && st.optStop && !ev.gotovo) { A.ide = false; ev.gotovo = true; st.cekanje = { vrsta: 'm01', A }; status('M01 OPTIONAL STOP — CYCLE START nastavlja'); crtaj(); return false; }
    if (ev.g04 && !ev.gotovo) { ev.gotovo = true; A.cekaj = (ev.g04 || 0) / 1000; A.evI++; return A.cekaj <= 0; }
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
    const p = A.P[A.i], blok = p[6], red = A.B[blok].red;
    if (A.zapoceta !== A.i) {
      if (A.single && A.zadRed >= 0 && red !== A.zadRed && !A.preskoci) { A.ide = false; prikaziBlok(A, A.zadRed); st.sbBroj++; dogadaj('singleBlok'); crtaj(); return; }
      if (!obradiDogadaje(A, blok)) return;
      if (A.cekaj > 0) { A.zapoceta = A.i; return; }
      A.zapoceta = A.i;
    }
    A.preskoci = false;
    if (blok !== A.trenBlok) { A.trenBlok = blok; A.trenRed = red; crtajOperaciju(); crtajKod(); }
    st.cw = !!A.vrti[blok]; postaviS(A.Sr[blok]);
    { const c = rpmCilj(); if (c > st.rpm) st.rpm = c; }
    const cilj = { X: p[0], Y: p[1], Z: p[2] + Lt(st.alatU) };       /* vrh alata (čelo = 0) → čelo vretena */
    for (const o of OSI) if (cilj[o] < HOD[o][0] - 1e-6 || cilj[o] > HOD[o][1] + 1e-6) {
      alarmProg({ X: 316, Y: 317, Z: 318 }[o], o + ' OVER TRAVEL RANGE (redak ' + (red + 1) + ')');
      info('Program je zaustavljen alarmom ' + { X: 316, Y: 317, Z: 318 }[o] + ': os ' + o + ' bi u retku ' + (red + 1) + ' izašla iz hoda stroja. Program ne stane u hod — vidi upozorenje pri odabiru.', true); return;
    }
    const d = { X: cilj.X - st.fiz.X, Y: cilj.Y - st.fiz.Y, Z: cilj.Z - st.fiz.Z };
    let t;
    if (p[4] === 0) { const v = BRZI * st.rro / 100; t = Math.max(Math.abs(d.X), Math.abs(d.Y), Math.abs(d.Z)) / v * 60; A.F = 0; A.v = v; }
    else { const F = Math.min(BRZI, Math.max(1, p[5])) * st.fro / 100; if (F <= 0.01) break; t = Math.hypot(d.X, d.Y, d.Z) / F * 60; A.F = p[5]; A.v = F; }
    if (p[4] !== 0 && st.fro <= 0) break;
    const od = { ...st.fiz }; let u;
    if (t <= ost) { u = 1; ost -= t; } else { u = ost / t; ost = 0; }
    const nov = u >= 1 ? cilj : { X: od.X + d.X * u, Y: od.Y + d.Y * u, Z: od.Z + d.Z * u };
    if (!gibaj(od, nov, p[4] === 1)) return;
    if (u >= 1) { A.i++; A.zadRed = red; }
  }
  if (A.i >= A.P.length && A.ide) {
    if (!obradiDogadaje(A, Infinity)) return;
    A.ide = false; A.gotov = true; st.pregled = 0; st.cekanje = null;
    if (A.ime === 'MDI') { st.cw = !!A.vrti[A.B.length - 1]; postaviS(A.Sr[A.B.length - 1]); } else st.cw = false;
    if (A.ime === 'MDI') { status('MDI izveden.'); info('MDI blokovi su izvedeni.'); }
    else { A.trenBlok = -1; A.trenRed = 0; status('PROGRAM END (M30) — ' + A.ime); info('Program je završen (M30). Upravljanje je na početku programa.'); }
    crtajOperaciju(); crtaj(); dogadaj('programKraj', { ime: A.ime });
  }
}
function gibaj(od, nov, rez) {
  const dl = Math.hypot(nov.X - od.X, nov.Y - od.Y, nov.Z - od.Z);
  const n = Math.max(1, Math.ceil(dl / 0.4));
  for (let q = 1; q <= n; q++) {
    const s = q / n;
    st.fiz = { X: od.X + (nov.X - od.X) * s, Y: od.Y + (nov.Y - od.Y) * s, Z: od.Z + (nov.Z - od.Z) * s };
    const sd = obradi(rez); if (sd) { sudar(sd); return false; }
  }
  return true;
}
function obradi(rez) {
  const t = vrh(), vrti = st.rpm > 500, r = R();
  if (t.z < -0.01) return 'stol';
  const sk = S.pribor.skripac;
  if (st.pribor === 'skripac' && sk) {
    for (const c of sk.celjusti) if (t.z < c.z1 && krugPravokutnik(t.x, t.y, r, c)) return 'skripac';
    if (t.z < sk.dno && Math.abs(t.x - sk.xc) < 75 && t.y > sk.yc - 85 && t.y < sk.yc + 65) return 'skripac';
  }
  if (st.pribor === 'pandze' && S.pribor.pandze && PL && !vrti && t.z < S.pribor.pandze.D && t.x > PL.x0 - 20 && t.x < PL.x0 + PL.L + 20 && t.y > PL.y0 - 20 && t.y < PL.y0 + PL.W + 20) return 'podloga';
  const rezi = rez && vrti, radi = st.run && st.run.ide;
  const pr = PL ? ploca(t, rezi || (vrti && !radi)) : 0;
  if (pr > 0.02 && !(vrti && (rez || !radi))) return vrti ? 'brzi' : 'nerotira';
  return null;
}
function krugPravokutnik(x, y, r, c) { const dx = Math.max(c.x0 - x, 0, x - c.x1), dy = Math.max(c.y0 - y, 0, y - c.y1); return dx * dx + dy * dy < r * r; }
const SUDAR = { stol: 'Alat je dublje od stola — udario je u stol.', skripac: 'Alat je udario u škripac (čeljust ili podnožje).', podloga: 'Alat je udario u podložnu ploču, a vreteno se ne vrti.', brzi: 'Alat je brzim hodom (G00) ušao u materijal.', nerotira: 'Alat je ušao u materijal, a vreteno se ne vrti.' };
function sudar(sto) {
  st.alarm = sto; st.jog = null; st.homing = null; if (st.run) st.run.ide = false; st.cw = false;
  status('SUDAR — stroj je zaustavljen');
  $('poruka').innerHTML = '<span class="upoz">Sudar!</span> ' + esc(SUDAR[sto] || 'Sudar.') + ' Na stroju bi se alat slomio ili bi se oštetilo vreteno. Pritisni „Ponovno pokreni niz”.';
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
  if (zaProgram && st.vrata) return 'Zaštitna vrata su podignuta (door hold) — spusti vrata.';
  return '';
}
function jogStart(o, smjer) {
  if (o === 'A') { info('Desktop Mill nema os A (tipke ±A su na tipkovnici, bez učinka).'); return; }
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
  const o = J.os, v = (J.rapid ? BRZI * st.rro / 100 : JOG_V[st.jogInc]) / 60 * dt, staro = st.fiz[o]; let nov = staro + J.smjer * v, kraj = false;
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
  const red = (osi || ['Z', 'X', 'Y']).slice(); if (red.includes('Z')) { red.splice(red.indexOf('Z'), 1); red.unshift('Z'); }
  st.homing = { red, k: 0, zajedno: !osi }; status('ZERO RETURN: os ' + red[0] + ' …'); crtaj();
}
function korakRef(dt) {
  const H = st.homing; if (!H) return;
  const o = H.red[H.k], cilj = HOD[o][1], v = F_REF / 60 * dt * st.ubrzanje, d = cilj - st.fiz[o];
  const n = { ...st.fiz }; n[o] = Math.abs(d) <= v ? cilj : st.fiz[o] + Math.sign(d) * v;
  if (H.zajedno && o !== 'Z') for (const q of ['X', 'Y']) { const dq = HOD[q][1] - st.fiz[q]; n[q] = Math.abs(dq) <= v ? HOD[q][1] : st.fiz[q] + Math.sign(dq) * v; }
  if (!gibaj({ ...st.fiz }, n, false)) return;
  const gotov = H.zajedno && o !== 'Z' ? ['X', 'Y'].every((q) => st.fiz[q] === HOD[q][1]) : st.fiz[o] === cilj;
  if (gotov) { H.k += H.zajedno && o !== 'Z' ? 2 : 1; if (H.k < H.red.length) status('ZERO RETURN: os ' + H.red[H.k] + ' …'); else {
    st.homing = null; st.homed = true; st.refOff = { X: 0, Y: 0, Z: 0 }; status('ZERO RETURN gotov — osi ' + H.red.join(', ') + ' u nultočki stroja.'); crtaj(); dogadaj('ref'); } }
}

/* ================================================================== */
/* 8. Papir (dodir)                                                      */
/* ================================================================== */
function papir() {
  const t = vrh(), r = R(); if (!PL) return null;
  const unY = t.y > PL.y0 + 0.5 && t.y < PL.y0 + PL.W - 0.5, unX = t.x > PL.x0 + 0.5 && t.x < PL.x0 + PL.L - 0.5, ispod = t.z < PL.top - 0.3 && t.z > PL.bot;
  if (st.pribor === 'skripac') {
    if (ispod && unY && t.x < PL.x0) return { os: 'X', g: PL.x0 - (t.x + r) };
    if (ispod && unX && t.y < PL.y0) return { os: 'Y', g: PL.y0 - (t.y + r) };
  }
  if (t.x >= PL.x0 && t.x <= PL.x0 + PL.L && t.y >= PL.y0 && t.y <= PL.y0 + PL.W) { const h = visinaPloce(t.x, t.y); return { os: 'Z', g: t.z - h }; }
  return null;
}
const zapinje = (p, os) => p && p.os === os && p.g >= -1e-6 && p.g <= 0.05 + 1e-6;
function tekstPapira() {
  const p = papir(); if (!p) return '— alat nije uz rub ni iznad pripremka';
  const gdje = { X: 'lijevi rub', Y: 'prednji rub', Z: 'gornja ploha' }[p.os];
  if (p.g < -1e-6) return gdje + ': alat je u materijalu';
  if (p.g <= 0.05 + 1e-6) return '<b class="zap">' + gdje + ': papir zapinje — dodir!</b>';
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
  const edRed = (i) => (st.ed && st.ed.ime === 'O01004' ? norm(st.ed.redci[i]) : '');
  const ok = (() => {
    switch (k[2]) {
      case 'powerOn': return naOn();
      case 'estop': return naOn() && !st.estop;
      case 'reset': return e === 'reset' && st.servo && !st.alarmi.length;
      case 'powerUp': return e === 'ref' && st.homed;
      case 'jogNacin': return st.nacin === 'JOG';
      case 'osX': return st.nacin === 'JOG' && st.jogOs === 'X';
      case 'inc1': return st.jogInc === 1;
      case 'kotac10': return st.putKot.X >= 10 - 1e-6;
      case 'tipkeZ': return st.putCont.Z >= 5 - 1e-6;
      case 'rapid': return e === 'pomak' && d.rapid;
      case 'polozaj': return e === 'pomak' && blizu(mach('X'), -80) && blizu(mach('Y'), -120) && blizu(mach('Z'), -20);
      case 'dalje': return e === 'dalje';
      case 'offsetTool': return st.prikaz === 'OFFSET' && st.offTab === 'tool';
      case 'kursorT1': return st.prikaz === 'OFFSET' && st.offTab === 'tool' && st.offKur.r === 0;
      case 'dodirZ1': return e === 'pomak' && zapinje(pp, 'Z') && st.alatU === 1;
      case 'izmjeri1': return e === 'tom' && blizu(st.H[1], hZa(1, PL.top), 0.07);
      case 'mdiT2': return e === 'alatCekanje' && d.T === 2;
      case 'zamijeni2': return e === 'alat' && st.alatU === 2;
      case 'nastavi2': return e === 'programKraj' && d.ime === 'MDI' && st.alatU === 2;
      case 'izmjeri2': return e === 'tom' && blizu(st.H[2], hZa(2, PL.top), 0.07);
      case 'offsetWork': return st.prikaz === 'OFFSET' && st.offTab === 'work';
      case 'kursor54X': return st.prikaz === 'OFFSET' && st.offTab === 'work' && st.offKur.r === 0 && st.offKur.c === 0;
      case 'dodirX': return e === 'pomak' && zapinje(pp, 'X');
      case 'pzsX': return e === 'pzs' && d.os === 'X' && blizu(st.off[54].X, mach('X'));
      case 'dodajRX': return e === 'enterOff' && blizu(st.off[54].X, PL.x0 - XT0, 0.07);
      case 'kursor54Y': return st.prikaz === 'OFFSET' && st.offTab === 'work' && st.offKur.r === 0 && st.offKur.c === 1;
      case 'dodirY': return e === 'pomak' && zapinje(pp, 'Y');
      case 'dodajRY': return e === 'enterOff' && blizu(st.off[54].Y, PL.y0 - YT0, 0.07);
      case 'mdiNacin': return st.nacin === 'MDI';
      case 'mdiS': return e === 'programKraj' && d.ime === 'MDI' && st.cw && blizu(st.S, 3000, 1);
      case 'mdiG': return e === 'programKraj' && d.ime === 'MDI' && blizu(rad('X'), 10, 0.01) && blizu(rad('Y'), 10, 0.01);
      case 'mdiM5': return e === 'programKraj' && d.ime === 'MDI' && !st.cw;
      case 'list': return st.nacin === 'LIST';
      case 'insertDlg': return e === 'dlg' && st.dlg === 'novi';
      case 'noviO': return e === 'novi' && st.ed && st.ed.ime === 'O01004';
      case 'blok1': return e === 'edit' && edRed(0) === norm(PROG_O01004[0]);
      case 'blok2': return e === 'edit' && edRed(1) === norm(PROG_O01004[1]);
      case 'blok3': return e === 'edit' && edRed(2) === norm(PROG_O01004[2]);
      case 'blok4': return e === 'edit' && edRed(3) === norm(PROG_O01004[3]);
      case 'blok5': return e === 'edit' && edRed(4) === norm(PROG_O01004[4]);
      case 'select': return e === 'select' && d.ime === 'O01001';
      case 'mem': return st.nacin === 'MEM' && st.odabran === 'O01001';
      case 'f10': return st.fro <= 10;
      case 'start': return e === 'cycleStart' && st.run && st.run.ime === 'O01001';
      case 'fUp': return st.fro >= 100 && st.run && (st.run.ide || st.run.i > 0);
      case 'hold': return e === 'hold';
      case 'single': return e === 'singleBlok' && st.sbBroj >= 3;
      case 'gotovo': return e === 'programKraj' && d.ime === 'O01001';
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
  const A = st.run;
  el.innerHTML = '<span>SPINDLE</span><b class="' + (st.rpm > 1 ? 'on' : '') + '">' + Math.round(st.rpm) + ' RPM' + (st.cw ? ' FWD' : '') + '</b>'
    + '<span>S / OVR</span><b>' + Math.round(st.S) + ' / ' + st.sro + '%</b>'
    + '<span>FEED</span><b>' + (A && A.ide ? A.v.toFixed(0) : st.jog ? Math.round(st.jog.rapid ? BRZI * st.rro / 100 : JOG_V[st.jogInc]) : '0') + ' mm/min</b>'
    + '<span>F / OVR</span><b>' + (A ? A.F.toFixed(0) : '0') + ' / ' + st.fro + '%</b>'
    + '<span>RAPID OVR</span><b>' + st.rro + '%</b>'
    + '<span>TOOL</span><b>T' + st.alatU + ' H' + String(st.alatU).padStart(2, '0') + ' = ' + dro(st.H[st.alatU] || 0) + '</b>'
    + '<span>SINGLE BLOCK</span><b class="' + (st.single ? 'up' : '') + '">' + (st.single ? 'ON' : 'OFF') + '</b>'
    + '<span>OPT STOP / DRY</span><b>' + (st.optStop ? 'ON' : 'OFF') + ' / ' + (st.dryRun ? 'ON' : 'OFF') + '</b>'
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
  if (st.prikaz === 'POSITION') { naslov = 'POSITION'; h = '<table><tr><th></th><th>WORK G' + st.offAkt + '</th><th>MACHINE</th><th>DIST TO GO</th></tr>' + OSI.map((o) => '<tr><td>' + o + '</td><td>' + dro(rad(o)) + '</td><td>' + dro(mach(o)) + '</td><td>' + (st.run && st.run.ide && st.run.P[st.run.i] ? dro((o === 'Z' ? st.run.P[st.run.i][2] + Lt(st.alatU) : st.run.P[st.run.i][{ X: 0, Y: 1 }[o]]) - st.fiz[o]) : '0.000') + '</td></tr>').join('') + '</table><div class="nap">WORK = koordinate obratka (G' + st.offAkt + (st.g43 ? ', G43 H' + String(st.alatU).padStart(2, '0') : '') + '); MACHINE = koordinate stroja od nultočke stroja (ZERO RET).</div>'; }
  else if (st.prikaz === 'OFFSET') {
    naslov = 'OFFSET'; h = '<div class="tab"><span class="' + (st.offTab === 'tool' ? 'akt' : '') + '">TOOL</span><span class="' + (st.offTab === 'work' ? 'akt' : '') + '">WORK</span></div>';
    if (st.offTab === 'tool') {
      h += '<table><tr><th>TOOL</th><th>LENGTH GEOMETRY (H)</th><th>DIAMETER (D)</th><th style="text-align:left">u simulatoru</th></tr>';
      Object.keys(ALATI).forEach((t, i) => { h += '<tr><td>' + t + '</td><td class="' + (st.offKur.r === i && st.offKur.c === 0 ? 'sel' : '') + '">' + dro(st.H[t] || 0) + '</td><td class="' + (st.offKur.r === i && st.offKur.c === 1 ? 'sel' : '') + '">' + kr(ALATI[t].d, 3) + '</td><td style="text-align:left;color:#9fb3bb">' + esc(ALATI[t].naziv) + '</td></tr>'; });
      h += '</table><div class="nap">TOOL OFFSET MEASURE upisuje Z stroja u H alata pod kursorom. Upisan broj + ENTER dodaje vrijednosti, + F1 upisuje umjesto nje.</div>';
    } else {
      h += '<table><tr><th>WORK</th><th>X</th><th>Y</th><th>Z</th></tr>';
      [54, 55, 56, 57, 58, 59].forEach((g, i) => { h += '<tr><td>G' + g + '</td>' + OSI.map((o, c) => '<td class="' + (st.offKur.r === i && st.offKur.c === c ? 'sel' : '') + '">' + dro(st.off[g][o]) + '</td>').join('') + '</tr>'; });
      h += '</table><div class="nap">PART ZERO SET upisuje položaj stroja osi pod kursorom. Upisan broj + ENTER dodaje, + F1 upisuje umjesto. Z ostaje 0 kad se duljine alata mjere na plohi obratka.</div>';
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
    naslov = 'ZERO RETURN'; h = '<div class="nap">ALL — referenciranje svih osi (Z prva). HOME G28 — brzi hod u nultočku stroja. SINGLE — upiši slovo osi (X, Y ili Z) i pritisni SINGLE. Stanje: ' + (st.homed ? 'osi referencirane' : 'osi NISU referencirane') + '.</div>' + (st.homing ? '<div class="al" style="color:#8fe6ec">u tijeku: os ' + st.homing.red[st.homing.k] + '</div>' : '');
  } else {
    naslov = st.nacin === 'JOG' ? 'HANDLE JOG' : 'MEM'; const A = st.prog;
    if (st.nacin === 'JOG') h += '<div class="nap">os <b>' + st.jogOs + '</b> · korak kotača <b>' + st.jogInc + ' mm</b> · tipke gibanja ' + JOG_V[st.jogInc] + ' mm/min' + (st.rapid ? ' · <b>RAPID</b>' : '') + '</div>';
    if (A) { const cur = st.run && st.run.ime === A.ime && (st.run.ide || st.run.i > 0) ? st.run.trenRed : st.pregled; h += listaKoda(A.redci, cur, -1, true); }
    else h += '<div class="nap">Nije odabran program — LIST PROG → SELECT PROG.</div>';
  }
  ph.textContent = naslov; pane.innerHTML = h;
}
function crtaj() {
  const on = naOn();
  $('ngc-off').hidden = on;
  $('ngc-off-t').textContent = st.power === 'boot' ? 'Haas Next Generation Control\nučitavanje …' : 'Upravljanje je isključeno. Pritisni POWER ON na upravljačkoj jedinici.';
  $('ngc-nacin').textContent = on ? NACIN_IME[st.nacin] : '—';
  $('ngc-prog').textContent = on ? (st.odabran ? st.odabran + ' (' + st.programi[st.odabran].naslov + ')' : 'NO PROGRAM') + (st.run && st.run.ide ? ' · RUNNING' : st.cekanje ? ' · WAITING' : '') : '';
  $('ngc-unos').textContent = on ? st.unos : '';
  const por = $('ngc-por'); por.className = 'ngc-por' + (st.alarmi.length ? ' alarm' : st.cekanje ? ' poruka' : ''); por.textContent = on ? (st.alarmi.length ? 'ALARM ' + st.alarmi.map((a) => a.br + ' ' + a.tekst).join(' · ') : st.poruka || 'READY') : '';
  crtajPoz(); crtajStanje(); crtajKod();
  document.querySelectorAll('[data-tipka]').forEach((b) => {
    const t = b.dataset.tipka;
    const pressed = { EDIT: st.nacin === 'EDIT', MEM: st.nacin === 'MEM', MDI: st.nacin === 'MDI', 'HANDLE JOG': st.nacin === 'JOG', 'ZERO RET': st.nacin === 'ZERO', 'LIST PROG': st.nacin === 'LIST',
      'SINGLE BLOCK': st.single, 'OPT STOP': st.optStop, 'DRY RUN': st.dryRun, RAPID: st.rapid, '.0001': st.jogInc === 0.001, '.001': st.jogInc === 0.01, '.01': st.jogInc === 0.1, '.1': st.jogInc === 1,
      PROGRAM: st.prikaz === 'PROGRAM', POSITION: st.prikaz === 'POSITION', OFFSET: st.prikaz === 'OFFSET', ALARMS: st.prikaz === 'ALARMS', 'SPINDLE FWD': st.cw }[t];
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(!!pressed && on));
  });
  document.querySelector('[data-tipka="CYCLE START"]').classList.toggle('radi', !!(st.run && st.run.ide));
  $('kot-os').textContent = on ? st.jogOs : '—'; $('kot-inc').textContent = on ? String(st.jogInc) : '—';
  const pr = (id, v) => { const b = $(id); if (b) b.setAttribute('aria-pressed', String(!!v)); };
  pr('k-on', on); pr('k-estop', st.estop); pr('k-vrata', st.vrata);
  $('papir').innerHTML = tekstPapira();
}
function crtajPredmet() {
  const el = $('predmet'), A = st.prog;
  if (!A) { el.innerHTML = '<p class="pom">Odaberi program (LIST PROG → SELECT PROG): vježbe O01001 … O01003 ili naši predmeti O02001 … O02021 (P01 … P21).</p>'; return; }
  const pr = st.programi[A.ime];
  let h = '<p><b>' + esc(A.ime) + ' ' + esc(pr.naslov) + '</b> · pripremak ' + pr.L + ' × ' + pr.W + ' × ' + pr.H + ' mm · ' + A.redci.length + ' redaka' + (A.info.alati.size ? ' · alati ' + [...A.info.alati].map((t) => 'T' + t).join(', ') : '') + '</p>';
  if (pr.opis) h += '<p class="pom">' + esc(pr.opis) + '</p>';
  h += A.hod.length ? '<p class="upoz">Ne stane u hod: ' + esc(A.hod.join('; ')) + '.</p>' : '<p class="pom">Program stane u hod stroja (X 152 × Y 254 × Z 76 mm).</p>';
  if (A.alarmi.length) h += '<p class="upoz">Greška u programu: alarm ' + A.alarmi[0].br + ' — ' + esc(A.alarmi[0].tekst) + ' (red ' + (A.alarmi[0].red + 1) + ').</p>';
  if (A.upoz.length) h += '<p class="pom">Upozorenja: ' + esc(A.upoz.slice(0, 3).join('; ')) + (A.upoz.length > 3 ? ' …' : '') + '</p>';
  if (A.ops.length) h += '<ol class="ops" id="ops">' + A.ops.map((o, i) => '<li data-op="' + i + '"><b>' + esc(o.naziv.replace(/_/g, ' ')) + '</b> <span class="pom">(' + esc(o.vrsta) + ', od retka ' + (o.red + 1) + ')</span><br><span>' + esc(o.opis || A.opisi[i] || '') + '</span>' + (o.opis && A.opisi[i] ? '<br><span class="pom">' + esc(A.opisi[i]) + '</span>' : '') + '</li>').join('') + '</ol>';
  el.innerHTML = h; crtajOperaciju();
}
function crtajOperaciju() {
  const A = st.prog; if (!A || !A.ops) return; const red = st.run && st.run.ime === A.ime && (st.run.ide || st.run.i > 0) ? st.run.trenRed : -1; let akt = -1; A.ops.forEach((o, i) => { if (red >= o.red) akt = i; });
  document.querySelectorAll('#ops li').forEach((li) => li.classList.toggle('akt', +li.dataset.op === akt));
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
    const c = st.cekanje; if (c.vrsta === 'alat' && st.alatU !== c.T) { info('Najprije zamijeni alat: u vretenu je T' + st.alatU + ', program traži T' + c.T + '.'); return; }
    st.cekanje = null; const A = c.A; A.ide = true; A.preskoci = true; st.run = A; status(A.ime === 'MDI' ? 'MDI nastavlja' : 'PROGRAM RUNNING — ' + A.ime); crtaj(); dogadaj('cycleStart'); return;
  }
  if (st.nacin === 'MDI') {
    const txt = st.mdi.redci.slice(st.mdi.kursor).join('\n'); if (!txt.trim()) { info('MDI program je prazan — upiši blok i pritisni ENTER.'); return; }
    const A = prevediProgram(txt + '\nM99', 'MDI'); A.redci = st.mdi.redci.slice(); A.obj = st.mdi.redci.map((l, i) => { void i; return objasniHaas(l).tekst; });
    if (A.alarmi.length) { alarmProg(A.alarmi[0].br, A.alarmi[0].tekst); info('MDI: alarm ' + A.alarmi[0].br + ' — ' + A.alarmi[0].tekst, true); return; }
    A.mdiPomak = st.mdi.kursor; A.B.forEach((b) => { b.red += st.mdi.kursor; }); A.ev.forEach((e) => { e.red += st.mdi.kursor; });
    st.run = A; A.ide = true; A.preskoci = true; st.g43 = st.g43 || /G43/i.test(txt); status('MDI RUNNING'); crtaj(); dogadaj('cycleStart'); return;
  }
  if (st.nacin !== 'MEM') { info('CYCLE START pokreće program u načinu MEM (ili MDI).'); return; }
  let A = st.prog; if (!A) { info('Nije odabran program — LIST PROG → SELECT PROG.'); return; }
  if (st.run && st.run.ime === A.ime && st.run.ide) return;
  if (!st.run || st.run.ime !== A.ime || st.run.gotov || st.run.i === 0) { A = prevediProgram(st.programi[A.ime].tekst, A.ime); A.ops = st.prog.ops; A.opisi = st.prog.opisi; st.prog = A; if (A.alarmi.length) { alarmProg(A.alarmi[0].br, A.alarmi[0].tekst); info('Program ima grešku: alarm ' + A.alarmi[0].br + ' — ' + A.alarmi[0].tekst + ' (red ' + (A.alarmi[0].red + 1) + ').', true); return; } }
  else A = st.run;
  A.single = st.single; st.run = A; A.ide = true; A.preskoci = true; st.g43 = true;
  status('PROGRAM RUNNING — ' + A.ime); crtaj(); dogadaj('cycleStart');
}
function feedHold() { const A = st.run; if (!A || !A.ide) return; A.ide = false; status('FEED HOLD — CYCLE START nastavlja.'); crtaj(); dogadaj('hold'); }
function reset() {
  if (!naOn()) return;
  st.jog = null; st.homing = null; st.cw = false; st.unos = ''; st.dlg = null; st.cekanje = null;
  const radio = st.run && st.run.ide; if (st.run) { st.run.ide = false; if (st.run.ime !== 'MDI') { st.run.i = 0; st.run.evI = 0; st.run.trenBlok = -1; st.run.trenRed = 0; st.run.zadRed = -1; st.run.gotov = false; st.run.zapoceta = -1; st.run.ev.forEach((e) => { delete e.ev.gotovo; }); } }
  $('blok-obj').hidden = true;
  if (st.estop) { st.alarmi = st.alarmi.filter((a) => a.br === 107); status('EMERGENCY STOP je pritisnut — alarm 107 ostaje.'); }
  else { st.alarmi = []; st.servo = true; status(st.homed ? 'READY' : 'Pogoni uključeni. Osi nisu referencirane — POWER UP ili ZERO RET → ALL.'); }
  if (radio && niz && niz.id === 'izvodenje') { info('RESET je prekinuo program: osi i vreteno stoje, program je na početku.'); }
  crtaj(); dogadaj('reset');
}
function estop(pritisnut) {
  st.estop = pritisnut;
  if (pritisnut) { st.jog = null; st.homing = null; st.cw = false; st.servo = false; if (st.run) st.run.ide = false; st.cekanje = null; if (naOn() && !st.alarmi.some((a) => a.br === 107)) st.alarmi.push({ br: 107, tekst: 'EMERGENCY OFF' }); status('EMERGENCY STOP'); }
  else status('EMERGENCY STOP otpušten — pritisni RESET.');
  crtaj(); dogadaj('estop');
}
function powerOn() {
  if (st.power !== 'off') return; st.power = 'boot'; st.bootT = 2.5; crtaj();
}
function powerOff() { if (st.power === 'off') return; st.power = 'off'; st.servo = false; st.homed = false; st.cw = false; st.jog = null; st.homing = null; if (st.run) st.run.ide = false; st.run = null; st.cekanje = null; st.alarmi = []; crtaj(); }
function bootGotov() {
  st.power = 'on'; st.servo = false; st.homed = false; st.refOff = { ...st.fiz }; st.nacin = 'MEM'; st.prikaz = 'PROGRAM';
  st.alarmi = [{ br: 102, tekst: 'SERVOS OFF' }]; if (st.estop) st.alarmi.push({ br: 107, tekst: 'EMERGENCY OFF' });
  status('Otpusti EMERGENCY STOP i pritisni RESET, zatim POWER UP (ZERO RETURN).'); crtaj(); dogadaj('powerOn');
}
function nacin(n) { if (!naOn()) return; st.nacin = n; st.prikaz = 'PROGRAM'; st.dlg = null; st.unos = ''; if (n === 'EDIT' && !st.ed && st.odabran) st.ed = { ime: st.odabran, redci: st.programi[st.odabran].tekst.split('\n'), kursor: 0, undo: null }; crtaj(); dogadaj('nacin', { n }); }
function spremiEd() { if (!st.ed) return; st.programi[st.ed.ime].tekst = st.ed.redci.join('\n'); if (st.odabran === st.ed.ime) { const A = prevediProgram(st.programi[st.ed.ime].tekst, st.ed.ime); A.ops = []; A.opisi = []; st.prog = A; crtajPredmet(); } }
function tipka(t) {
  if (!naOn() && t !== 'RESET') { return; }
  const A = st.run;
  const broj = () => { const v = parseFloat(st.unos.replace(',', '.').replace('−', '-')); return isFinite(v) ? v : null; };
  switch (t) {
    case 'EDIT': case 'MEM': case 'MDI': nacin(t); return;
    case 'HANDLE JOG': nacin('JOG'); return; case 'ZERO RET': nacin('ZERO'); return; case 'LIST PROG': nacin('LIST'); st.listKur = Math.max(0, Object.keys(st.programi).sort().indexOf(st.odabran)); crtaj(); return;
    case 'PROGRAM': case 'POSITION': case 'ALARMS': st.prikaz = t; crtaj(); dogadaj('prikaz'); return;
    case 'OFFSET': if (st.prikaz === 'OFFSET') st.offTab = st.offTab === 'tool' ? 'work' : 'tool'; else st.prikaz = 'OFFSET'; st.offKur = { r: 0, c: 0 }; crtaj(); dogadaj('prikaz'); return;
    case 'SINGLE BLOCK': st.single = !st.single; if (A) A.single = st.single; if (!st.single) $('blok-obj').hidden = true; crtaj(); return;
    case 'OPT STOP': st.optStop = !st.optStop; crtaj(); return;
    case 'DRY RUN': st.dryRun = !st.dryRun; info('DRY RUN u simulatoru samo označava stanje — posmak se ne mijenja.'); crtaj(); return;
    case 'BLOCK DELETE': case 'COOLNT': case 'SEND': case 'RECV': case 'HANDLE FEED': case 'HANDLE SPINDLE': case 'ORIGIN': case 'RECOVER': case 'NEXT TOOL': case 'TOOL RELEASE': case 'ATC FWD': case 'ATC REV': case 'HANDLE SCROLL': case 'JOG LOCK': case 'CHIP': case 'CHIP STOP': case 'FORWARD': case 'SHIFT': case 'F2': case 'F3': case 'F4': case 'CURRENT COMMANDS': case 'DIAGNOSTIC': case 'SETTING': case 'GRAPHICS': case 'MDI DNC': case 'HELP': case 'CALC': case 'PROGRAM CONVRS': info('Tipka ' + t + ' u simulatoru nema učinka (Desktop Mill: bez izmjenjivača alata, bez rashladnog sredstva i transportera strugotine; postavke, dijagnostika i grafika nisu simulirane).'); return;
    case '.0001': case '.001': case '.01': case '.1': st.jogInc = INC_TIPKA[t]; crtaj(); dogadaj('inc'); return;
    case 'RAPID': st.rapid = !st.rapid; crtaj(); return;
    case 'ALL': zeroRet(); return;
    case 'HOME G28': { const z = zasto(); if (z) { info(z); return; } if (!st.homed) { info('Najprije ZERO RET → ALL.'); return; } st.homing = { red: ['Z', 'X', 'Y'], k: 0, zajedno: true }; status('HOME G28 …'); crtaj(); return; }
    case 'SINGLE': { const o = st.unos.trim().toUpperCase(); if (!OSI.includes(o)) { info('Upiši slovo osi (X, Y ili Z) pa SINGLE.'); return; } st.unos = ''; zeroRet([o]); return; }
    case 'FEED -10': st.fro = Math.max(0, st.fro - 10); crtaj(); dogadaj('fro'); return;
    case 'FEED +10': st.fro = Math.min(200, st.fro + 10); crtaj(); dogadaj('fro'); return;
    case 'FEED 100': st.fro = 100; crtaj(); dogadaj('fro'); return;
    case 'SPINDLE -10': st.sro = Math.max(50, st.sro - 10); crtaj(); return;
    case 'SPINDLE +10': st.sro = Math.min(150, st.sro + 10); crtaj(); return;
    case 'SPINDLE 100': st.sro = 100; crtaj(); return;
    case 'RAPID 5': case 'RAPID 25': case 'RAPID 50': case 'RAPID 100': st.rro = +t.split(' ')[1]; crtaj(); return;
    case 'SPINDLE FWD': case 'SPINDLE REV': { const z = zasto(); if (z) { info(z); return; } if (A && A.ide) return; if (st.vrata) { info('Zaštitna vrata su podignuta — vreteno se ne pokreće.'); return; } if (!st.S) postaviS(3000); st.cw = true; crtaj(); return; }
    case 'SPINDLE STOP': st.cw = false; crtaj(); return;
    case 'CYCLE START': cycleStart(); return;
    case 'FEED HOLD': feedHold(); return;
    case 'RESET': reset(); return;
    case 'POWER UP': { const z = zasto(); if (z) { info(z); return; } zeroRet(); return; }
    case 'TOOL OFFSET MEASURE': {
      if (st.prikaz !== 'OFFSET' || st.offTab !== 'tool') { info('TOOL OFFSET MEASURE radi na kartici OFFSET → TOOL s kursorom na alatu.'); return; }
      if (!st.homed) { info('Osi nisu referencirane — vrijednost ne bi bila ponovljiva.'); return; }
      const T = Object.keys(ALATI)[st.offKur.r]; st.H[T] = mach('Z'); status('H' + String(T).padStart(2, '0') + ' = ' + dro(st.H[T]) + ' (Z stroja).'); crtaj(); dogadaj('tom', { T: +T }); return;
    }
    case 'PART ZERO SET': {
      if (st.prikaz !== 'OFFSET' || st.offTab !== 'work') { info('PART ZERO SET radi na kartici OFFSET → WORK s kursorom na osi.'); return; }
      const g = [54, 55, 56, 57, 58, 59][st.offKur.r], o = OSI[st.offKur.c]; st.off[g][o] = mach(o); status('G' + g + ' ' + o + ' = ' + dro(st.off[g][o]) + ' (položaj stroja).'); crtaj(); dogadaj('pzs', { os: o, g }); return;
    }
    case 'UP': case 'DOWN': case 'LEFT': case 'RIGHT': case 'PAGE UP': case 'PAGE DOWN': case 'HOME': case 'END': kursor(t); return;
    case 'CANCEL': if (st.dlg) { st.dlg = null; st.unos = ''; } else st.unos = st.unos.slice(0, -1); crtaj(); return;
    case 'SPACE': st.unos += ' '; crtaj(); return;
    case 'EOB': st.unos += ';'; crtaj(); return;
    case 'ENTER': case 'INSERT': case 'ALTER': case 'DELETE': case 'UNDO': case 'F1': uredi(t, broj); return;
    case 'SELECT PROG': { if (st.nacin !== 'LIST') { info('SELECT PROG radi u LIST PROGRAM.'); return; } if (A && A.ide) { info('Program radi — najprije RESET.'); return; } const ime = Object.keys(st.programi).sort()[st.listKur]; if (ime) { odaberiProgram(ime); st.ed = null; } return; }
    case 'ERASE PROG': {
      if (st.nacin === 'MDI') { st.mdi = { redci: [], kursor: 0 }; status('MDI program obrisan.'); crtaj(); return; }
      if (st.nacin !== 'LIST') { info('ERASE PROG briše program pod kursorom u LIST PROGRAM ili MDI program.'); return; }
      const ime = Object.keys(st.programi).sort()[st.listKur]; if (!ime) return; if (st.programi[ime].ugradjen) { info('Ugrađeni programi vježbi se ne brišu; briši svoje (npr. O01004).'); return; }
      delete st.programi[ime]; if (st.odabran === ime) { st.odabran = null; st.prog = null; } if (st.ed && st.ed.ime === ime) st.ed = null; st.listKur = 0; status(ime + ' obrisan.'); crtajPredmet(); crtaj(); return;
    }
    default: if (t.length === 1) { st.unos += t; crtaj(); }
  }
}
function kursor(t) {
  if (st.prikaz === 'OFFSET') {
    const nr = st.offTab === 'tool' ? Object.keys(ALATI).length : 6, nc = st.offTab === 'tool' ? 2 : 3;
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
  /* OFFSET: brojčani unos */
  if (st.prikaz === 'OFFSET' && (t === 'ENTER' || t === 'F1')) {
    const v = broj(); if (v === null) { info('Upiši broj pa ENTER (dodaje) ili F1 (upisuje).'); return; }
    if (st.offTab === 'tool') { if (st.offKur.c !== 0) { info('Promjer alata u simulatoru je zadan.'); return; } const T = Object.keys(ALATI)[st.offKur.r]; st.H[T] = t === 'F1' ? v : (st.H[T] || 0) + v; status('H' + String(T).padStart(2, '0') + ' = ' + dro(st.H[T])); }
    else { const g = [54, 55, 56, 57, 58, 59][st.offKur.r], o = OSI[st.offKur.c]; st.off[g][o] = t === 'F1' ? v : st.off[g][o] + v; status('G' + g + ' ' + o + ' = ' + dro(st.off[g][o])); }
    st.unos = ''; crtaj(); dogadaj('enterOff'); return;
  }
  if (st.nacin === 'LIST') {
    if (t === 'INSERT' && !st.dlg) { st.dlg = 'novi'; st.unos = ''; crtaj(); dogadaj('dlg'); return; }
    if (st.dlg === 'novi' && (t === 'ENTER' || t === 'INSERT')) {
      const m = u.toUpperCase().match(/^O?(\d{1,5})$/); if (!m) { info('Broj programa: O i do pet znamenki, npr. O01004.'); return; }
      const ime = 'O' + m[1].padStart(5, '0'); if (st.programi[ime]) { info('Program ' + ime + ' već postoji.'); return; }
      st.programi[ime] = { naslov: '', tekst: '', ugradjen: false, L: VJEZBA.L, W: VJEZBA.W, H: VJEZBA.H, alat: 1 };
      st.dlg = null; st.unos = ''; st.ed = { ime, redci: [], kursor: 0, undo: null }; st.nacin = 'EDIT'; st.prikaz = 'PROGRAM'; status(ime + ' stvoren — EDIT.'); crtaj(); dogadaj('novi'); return;
    }
    if (t === 'ENTER') { tipka('SELECT PROG'); return; }
    return;
  }
  if (st.nacin === 'MDI') {
    if (t === 'ENTER' || t === 'INSERT') { if (!u) { info('Upiši blok (npr. S3000 M03) pa ENTER.'); return; } const blok = u.replace(/;$/, '').trim(); st.mdi.redci.splice(st.mdi.redci.length ? st.mdi.kursor + 1 : 0, 0, blok); st.mdi.kursor = Math.min(st.mdi.redci.length - 1, st.mdi.kursor + (st.mdi.redci.length > 1 ? 1 : 0)); st.unos = ''; crtaj(); dogadaj('mdiUnos'); return; }
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
function ukljuceno() { Object.assign(st, { power: 'on', estop: false, servo: true, homed: true, refOff: { X: 0, Y: 0, Z: 0 }, alarmi: [], vrata: false }); }
function pripremi(id) {
  const ub = st.ubrzanje; pocetno(); st.ubrzanje = ub; bezPribora(); st.alatU = 1; stroj3DAlat();
  if (id === 'ukljucivanje') { postaviVjezbu(); nultockaNaKut(); izmjeriAlate(); st.fiz = { X: -61.37, Y: -140.2, Z: -18.5 }; return; }
  ukljuceno(); st.fiz = { X: -60, Y: -100, Z: -10 };
  postaviVjezbu();
  if (id === 'rucno') { st.fiz = { X: -40, Y: -60, Z: -5 }; st.jogInc = 0.1; }
  if (id === 'alat') { nultockaNaKut(); st.H = { 1: 0, 2: 0, 3: 0 }; st.fiz = { X: PL.x0 + 20 - XT0, Y: PL.y0 + PL.W / 2 - YT0, Z: PL.top + 10 - NOS0 + Lt(1) }; st.nacin = 'JOG'; st.jogOs = 'Z'; st.jogInc = 0.1; }
  if (id === 'nultocka') { izmjeriAlate(); st.off[54] = { X: 0, Y: 0, Z: 0 }; st.fiz = { X: PL.x0 - 1.5 - 15 - XT0, Y: PL.y0 + PL.W / 2 - YT0, Z: PL.top - 3 - NOS0 + Lt(1) }; st.nacin = 'JOG'; st.jogOs = 'X'; st.jogInc = 0.1; }
  if (id === 'mdi' || id === 'pisanje' || id === 'izvodenje') { nultockaNaKut(); izmjeriAlate(); st.fiz = { X: -40, Y: -60, Z: -5 }; }
  if (id === 'izvodenje') { st.alatU = 2; stroj3DAlat(); bezPribora(); st.fiz = { X: -20, Y: -20, Z: -2 }; }
  if (id === 'pisanje') { st.ed = null; }
  if (!id) { nultockaNaKut(); izmjeriAlate(); }
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korak = 0; $('ponovi').hidden = true; $('poruka').textContent = ''; $('blok-obj').hidden = true;
  pripremi(id); st.sbBroj = 0; status(naOn() ? 'READY' : '');
  crtajPredmet();
  pogled(id === 'ukljucivanje' ? 'stroj' : id === 'alat' || id === 'nultocka' ? 'obradak' : 'radni');
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
/* alfanumeričke tipke */
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
/* tipkovnica računala (fokus na upravljanju) */
const TIPKE_JOG = { ArrowLeft: -1, ArrowRight: 1 };
let drziTipku = null;
$('upravljanje').addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (!naOn()) return;
  const k = e.key;
  if (st.nacin === 'JOG') {
    if (k in TIPKE_JOG) { e.preventDefault(); if (!e.repeat || true) kotac(TIPKE_JOG[k]); return; }
    if (/^[xyzXYZ]$/.test(k)) { e.preventDefault(); st.jogOs = k.toUpperCase(); crtaj(); dogadaj('jogOs', { os: st.jogOs }); return; }
    if (k === 'PageUp' || k === 'PageDown') { e.preventDefault(); kursor(k === 'PageUp' ? 'PAGE UP' : 'PAGE DOWN'); return; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); if (e.repeat) return; drziTipku = k; jogStart(st.jogOs, k === 'ArrowUp' ? 1 : -1); return; }
  }
  if (k === 'Enter') { e.preventDefault(); tipka('ENTER'); return; }
  if (k === 'Backspace') { e.preventDefault(); st.unos = st.unos.slice(0, -1); crtaj(); return; }
  if (k === 'Escape') { e.preventDefault(); tipka('CANCEL'); return; }
  if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'PageUp' || k === 'PageDown' || k === 'Home' || k === 'End') { e.preventDefault(); kursor({ ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', PageUp: 'PAGE UP', PageDown: 'PAGE DOWN', Home: 'HOME', End: 'END' }[k]); return; }
  if (k.length === 1 && /[A-Za-z0-9 .;()\-]/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); st.unos += k.toUpperCase(); crtaj(); }
});
$('upravljanje').addEventListener('keyup', (e) => { if (e.key === drziTipku) { drziTipku = null; jogStop(); } });
/* privjesak i stroj */
$('k-on').addEventListener('click', powerOn);
$('k-off').addEventListener('click', powerOff);
$('k-estop').addEventListener('click', () => estop(!st.estop));
$('k-vrata').addEventListener('click', () => { st.vrata = !st.vrata; if (st.vrata && st.run && st.run.ide) { st.run.ide = false; st.cw = false; status('DOOR OPEN — zaštitna vrata podignuta, program zaustavljen (door hold).'); } S.vrataNa(st.vrata ? 1 : 0); crtaj(); dogadaj('vrata'); });
$('k-alat').addEventListener('click', () => {
  if (st.rpm > 1 || st.cw) { info('Vreteno se vrti — najprije ga zaustavi (SPINDLE STOP ili M05).'); return; }
  if (!st.vrata) { info('Podigni zaštitna vrata za ručnu izmjenu alata.'); return; }
  const c = st.cekanje && st.cekanje.vrsta === 'alat' ? st.cekanje.T : (st.alatU % 3) + 1;
  { const z = NOS0 + st.fiz.Z - Lt(c); if (PL && z < PL.top + 0.5 && vrh().x > PL.x0 - 5 && vrh().x < PL.x0 + PL.L + 5 && vrh().y > PL.y0 - 5 && vrh().y < PL.y0 + PL.W + 5) { info('Alat T' + c + ' je dulji — ne stane između vretena i pripremka. Najprije podigni os Z (HANDLE JOG, +Z).'); return; } }
  st.alatU = c; st.T = c; stroj3DAlat(); status('Alat T' + c + ' je u vretenu (ručno).'); info('U vreteno je stavljen T' + c + ' (' + ALATI[c].naziv + ').'); crtaj(); dogadaj('alat', { T: c });
});
/* klik u 3D: upravljačka jedinica (POWER ON/OFF, E-STOP, kotač, CYCLE START) */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2(); let dolje = null;
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('click', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje[0], e.clientY - dolje[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera); const h = ray.intersectObjects(Object.values(S.klik), false);
  if (!h.length) return; const k = h[0].object.userData.klik;
  if (k === 'estop') estop(!st.estop); else if (k === 'powerOn') powerOn(); else if (k === 'powerOff') powerOff(); else if (k === 'cycleStart') cycleStart(); else if (k === 'kotac') kotac(1);
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
  const c = rpmCilj(), ac = 15000 * dt * Math.max(1, st.ubrzanje); st.rpm = st.rpm < c ? Math.min(c, st.rpm + ac) : Math.max(c, st.rpm - ac);
  if (st.rpm > 0) { kut += Math.min(0.9, st.rpm / 15000 * 0.9); S.okreniAlat(kut); }
  if (t - zadnjiUI > 90) { zadnjiUI = t; if (st.jog || st.homing || (st.run && st.run.ide) || Math.abs(st.rpm - c) > 1) crtaj(); }
}
function prikazi(t) {
  osvjeziPlocu();
  S.postaviOsi(st.fiz.X, st.fiz.Y, st.fiz.Z);
  S.svjetlo.material.emissiveIntensity = naOn() ? 0.8 : 0;
  S.klik.estop.position.z = st.estop ? 36 : 42;
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
window.__haas = {
  st, NIZOVI, pokreniNiz, dogadaj, odaberiProgram, tipka, cycleStart, papir, kotac, ALATI, GEO,
  get niz() { return niz; }, get korak() { return korak; },
  postavi(p) { Object.assign(st.fiz, p); dogadaj('pomak', p); crtaj(); },
  get PL() { return PL; }, pogled, pauza(v) { pauza = v; if (v) { zadnjiEkran = 0; prikazi(performance.now()); crtaj(); } else zadnje = performance.now(); },
  sim(n, dt = 0.1, doKoraka = 1e9) { for (let i = 0; i < n; i++) { zadnjiUI = 0; simuliraj(dt, dt, 0); if (st.alarm || korak >= doKoraka) break; } crtaj(); return korak; }
};
requestAnimationFrame(petlja);
