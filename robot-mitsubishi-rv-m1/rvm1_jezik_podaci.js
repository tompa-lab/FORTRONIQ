/* FORTRONIQ · Mitsubishi Movemaster EX RV-M1 — podaci jezika naredbi i upravljanja (DUM1, privjesak, SIM RV, RS-232C, pogreške).
   Dio JEDINOG izvora istine: rvm1_podaci.js ovu datoteku re-exporta (export * from './rvm1_jezik_podaci.js'),
   a svoj popis pretpostavki dopunjuje poljem PRETPOSTAVKE_JEZIK.
   Interpreter (rvm1_mrl.js), veza s robotom (rvm1_serijski.js) i stranice čitaju SAMO odavde.
   Izvor činjenica: PODACI_RVM1.md (§3 jezik, §4 privjesak, §5 pogreške) i fotografije privjeska, SIM RV i DUM1 [foto].

   KAKO SE MIJENJA PODATAK
   - Potvrđena vrijednost: zamijeni  pp('…', 15, '…')  sa  15  — pretpostavka nestaje sa stranica.
   - Nova procjena: pp(sto, vrijednost, napomena, prikaz); sukob izvora: sukob(...); nema podatka: nedostaje(sto, napomena).
   - Pretpostavka uz pojedinu naredbu: polje `pretpostavka` (tekst) — automatski ulazi u PRETPOSTAVKE_JEZIK.
   Jedinice: argumenti naredbi i pozicije kao na robotu (mm, °, 0,1); vremena u s; brzine ručnog vođenja u m/s i rad/s.
   © ForTroniQ d.o.o. */

/* ================================================================== registar pretpostavki, sukoba i nedostajućeg */
const _REG = [];
const zarez = (n) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
function fmt(v) {
  if (typeof v === 'number') return zarez(v);
  if (Array.isArray(v)) return v.map(fmt).join(' / ');
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
/** pretpostavka: vrijednost se koristi, a na stranicama se ispisuje u popisu pretpostavki */
function pp(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'pretpostavka', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** sukob izvora: koristi se navedena vrijednost, a druga je u napomeni */
function sukob(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'sukob', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** podatak nije nađen ni u jednom izvoru */
function nedostaje(sto, napomena) { _REG.push({ vrsta: 'nedostaje', sto, vrijednost: '[nedostaje]', napomena }); return null; }

const RAD = Math.PI / 180;

/* ================================================================== grupe naredbi (PODACI §3.2) */
export const GRUPE_NAREDBI = [
  { id: 'gibanje', slovo: 'A', naziv: 'Položaj i gibanje', broj: 24 },
  { id: 'program', slovo: 'B', naziv: 'Upravljanje programom', broj: 19 },
  { id: 'prihvatnica', slovo: 'C', naziv: 'Prihvatnica', broj: 4 },
  { id: 'io', slovo: 'D', naziv: 'Ulazi i izlazi', broj: 6 },
  { id: 'citanje', slovo: 'E', naziv: 'Čitanje preko RS-232C', broj: 6 },
  { id: 'ostalo', slovo: 'F', naziv: 'Ostalo', broj: 4 }
];

/* ================================================================== opći podaci jezika (PODACI §3.1) */
export const JEZIK = {
  naziv: 'Movemaster command (jezik naredbi Movemaster)',
  brojNaredbi: sukob('Broj naredbi', 63, 'OCR u [MAN] čita „163 commands”, ali popis u [MAN] ima 63 stavke; [BRO] i [SMA] navode 63.'),
  pozicije: { min: 1, max: 629, memorija: '8 KB' },
  redci: { min: 1, max: 2048, memorija: '16 KB' },
  nacini: ['izravno izvršavanje naredbe s računala (MDI)', 'program s brojevima redaka (npr. „10 MO 20”)'],
  primjerRetka: '10 MO 20',
  primjerSlanja: ['LPRINT "RN"  (Centronics, BASIC)', 'PRINT #1, "RS"  (RS-232C, BASIC)'],
  samoIzravno: ['MJ', 'MP', 'PD', 'DL'],
  maxDuljinaRetka: pp('Najveća duljina programskog retka', 127, 'Nije nađeno u izvorima; uzeto 127 znakova (uobičajeno za međuspremnik RS-232C upravljača tog doba).', '127 znakova'),
  malaSlova: pp('Mala slova u naredbama', true, 'Izvor ne kaže prima li DUM1 mala slova; simulator ih pretvara u velika. Pravom robotu šalji velika slova.', 'simulator prima i mala slova'),
  hex: pp('Heksadekadski zapis vrijednosti', '&', 'Zapis „&FF” za vrijednosti u OD, OT, EQ, NE, LG, SM preuzet je iz srodnih Movemaster upravljača; za RV-M1 nije potvrđen.', '&hh'),
  izvor: 'MAN, BRO, SMA, MSE, POL1, RWR'
};

/* ================================================================== rasponi argumenata (gdje izvor šuti — pretpostavke) */
const R_XYZ = pp('Raspon koordinata X, Y, Z u naredbama PD, MP, DW, MT', 1000,
  'Poglavlje Description of Commands nedostaje; uzet je okvir ±1000,0 mm (doseg robota je ispod 700 mm). Točka izvan dosega javlja pogrešku II tek pri gibanju.', '±1000,0 mm');
const R_PR = pp('Raspon kutova P i R u naredbama PD i MP', 360,
  'Nije nađeno; uzet je okvir ±360,0°. Stvarna ograničenja daju rasponi zglobova J4 (±90°) i J5 (±180°).', '±360,0°');
const R_MJ = pp('Raspon kutova u naredbi MJ', 360,
  'Nije nađeno; sintaksno ±360,0° po zglobu, a zatim se provjerava da rezultat ostaje u rasponu svakog zgloba (inače pogreška II).', '±360,0°');
const R_TL = pp('Raspon duljine alata u naredbi TL', [0, 300],
  'Nije nađeno; uzeto 0–300,0 mm (primjer u [MSE] je „TL 200”, zadano ~107 mm).', '0 … 300,0 mm');
const R_GP = pp('Rasponi naredbe GP (početna sila, sila držanja, vrijeme početne sile)', [15, 15, 99],
  'Rasponi nisu nađeni. Prihvatnica HM-01 ima 16 stupnjeva sile [MAN], pa su sile 0–15; vrijeme početne sile 0–99 × 0,1 s.', 'sile 0–15, vrijeme 0–99 (× 0,1 s)');
const R_PA = pp('Rasponi naredbi PA i PT', [9, 255],
  'Sintaksa i rasponi nisu nađeni; uzeto: paleta 1–9, broj točaka u stupcu i redu 1–255 (prema srodnim Movemaster upravljačima).', 'paleta 1–9, točaka 1–255');
const R_BIT = pp('Raspon broja bita u OB, TB, EA, DA', 15,
  '[MSE] navodi b = 0–15 (kartica A16/B16). S karticom A8/B8 bitovi 8–15 se prihvaćaju, ali nemaju fizički priključak.', '0–15');

/* ================================================================== pomoćnici za opis argumenata */
const A = {
  poz: (ime = 'a', opcionalno = false) => ({ ime, tip: 'cijeli', min: 1, max: 629, jedinica: 'broj pozicije', opcionalno }),
  red: (ime = 'redak', opcionalno = false) => ({ ime, tip: 'cijeli', min: 1, max: 2048, jedinica: 'broj retka', opcionalno }),
  brojilo: (ime = 'c') => ({ ime, tip: 'cijeli', min: 1, max: 99, jedinica: 'broj brojila', opcionalno: false }),
  vrij: (ime = 'v') => ({ ime, tip: 'cijeli', min: -32768, max: 32767, hex: true, opcionalno: false }),
  mm: (ime, gr = R_XYZ) => ({ ime, tip: 'decimalni', min: -gr, max: gr, jedinica: 'mm', opcionalno: false }),
  st: (ime, gr = R_PR) => ({ ime, tip: 'decimalni', min: -gr, max: gr, jedinica: '°', opcionalno: false }),
  oc: () => ({ ime: 'O/C', tip: 'oc', vrijednosti: ['O', 'C'], opcionalno: true }),
  bitZ: (ime = '±b') => ({ ime, tip: 'bitZnak', min: 0, max: R_BIT, opcionalno: false }),
  bit: (ime = 'b') => ({ ime, tip: 'cijeli', min: 0, max: R_BIT, opcionalno: false })
};

/* ================================================================== NAREDBE — svih 63 (PODACI §3.2) */
function N(kod, grupa, naziv, nazivHr, sintaksa, argumenti, opis, primjer, dod = {}) {
  const o = { kod, grupa, naziv, nazivHr, sintaksa, argumenti, opis, primjer, samoIzravno: false, pomice: false, izvor: 'MAN, MSE', ...dod };
  if (o.pretpostavka) pp('Naredba ' + kod + ' (' + naziv + ')', sintaksa, o.pretpostavka, sintaksa);
  if (o.sukob) sukob('Naredba ' + kod + ' (' + naziv + ')', sintaksa, o.sukob, sintaksa);
  return o;
}

export const NAREDBE = [
  /* ---------------- A. Položaj i gibanje (24) ---------------- */
  N('DP', 'gibanje', 'Decrement Position', 'Prethodna pozicija', 'DP', [],
    'Zglobna interpolacija na poziciju s brojem za 1 manjim od pozicije na kojoj je robot posljednji put bio (brojač pozicija). Ako ta pozicija nije definirana, pogreška II. Isto radi tipka DEC na privjesku.',
    'DP', { pomice: true, pretpostavka: 'Brojač pozicija pamti broj posljednje pozicije na koju se robot gibao (MO, MS, MA, MT, MC, IP, DP, MOV); ako pozicija za 1 manja nije definirana, simulator javlja pogrešku II umjesto traženja prve definirane.' }),
  N('DW', 'gibanje', 'Draw', 'Relativni pomak', 'DW x, y, z', [A.mm('x'), A.mm('y'), A.mm('z')],
    'Pomiče vrh alata (TCP) za zadane iznose X, Y, Z [mm] od trenutnog položaja; nagib P i okret R ostaju isti. Gibanje je zglobna interpolacija, pa putanja nije pravac. Ciljna točka izvan dosega javlja pogrešku II.',
    'DW 0, 0, -30', { pomice: true, izvor: 'MSE, CSU' }),
  N('HE', 'gibanje', 'Here', 'Spremi trenutni položaj', 'HE a', [A.poz()],
    'Trenutni položaj vrha alata (X, Y, Z, P, R) i stanje prihvatnice spremaju se kao pozicija a (1–629); postojeća pozicija istog broja se prepisuje. Isto radi slijed P.S, broj, ENT na privjesku.',
    'HE 5', { pretpostavka: 'Prije NEST-a položaj nije poznat, pa simulator za HE javlja pogrešku II.' }),
  N('HO', 'gibanje', 'Home', 'Postavi referentni položaj', 'HO', [],
    'Trenutni položaj ruke postaje referentni položaj kartezijskog sustava, u koji se robot vraća naredbom OG. Dopušteno samo kad je unutarnji preklopnik SW1 bit 4 u gornjem položaju; inače pogreška II.',
    'HO', { pretpostavka: 'Sintaksa bez argumenta nije potvrđena. Simulator pamti trenutni zglobni položaj kao novi cilj naredbe OG; ishodište koordinata za WH/PR se ne pomiče (pojednostavljenje).' }),
  N('IP', 'gibanje', 'Increment Position', 'Sljedeća pozicija', 'IP', [],
    'Zglobna interpolacija na poziciju s brojem za 1 većim od pozicije na kojoj je robot posljednji put bio. Ako ta pozicija nije definirana, pogreška II. Isto radi tipka INC na privjesku.',
    'IP', { pomice: true }),
  N('MA', 'gibanje', 'Move Approach', 'Gibanje s pomakom', 'MA a, b[, O/C]', [A.poz('a'), A.poz('b'), A.oc()],
    'Gibanje na točku dobivenu zbrajanjem koordinata pozicija a i b (X, Y, Z, P, R); pozicija b služi kao pomak, npr. prilaz iznad mjesta hvatanja. Obje pozicije ostaju nepromijenjene. Zglobna interpolacija; O/C kao kod MO.',
    'MA 1, 2, O', { pomice: true }),
  N('MC', 'gibanje', 'Move Continuous', 'Neprekinuto gibanje', 'MC a, b[, O/C]', [A.poz('a'), A.poz('b'), A.oc()],
    'Robot prolazi redom kroz pozicije od a do b (uzlazno ili silazno) bez zaustavljanja na međupozicijama; između susjednih pozicija vrh alata ide po pravcu. Sve pozicije u rasponu moraju biti definirane i dohvatljive, inače pogreška II prije početka gibanja.',
    'MC 10, 15', { pomice: true, pretpostavka: 'Između susjednih pozicija simulator vodi TCP po pravcu bez zaustavljanja; najviše 100 pozicija u jednom MC (|b − a| ≤ 99), a ≠ b.' }),
  N('MJ', 'gibanje', 'Move Joint', 'Zglobni pomak', 'MJ b, s, e, p, r', [A.st('struk', R_MJ), A.st('rame', R_MJ), A.st('lakat', R_MJ), A.st('nagib', R_MJ), A.st('okret', R_MJ)],
    'Okreće zglobove za zadane kutove [°] relativno prema trenutnom položaju, redom struk (J1), rame (J2), lakat (J3), nagib (J4) i okret (J5). Ako bi neki zglob izašao iz raspona, pogreška II i robot se ne giba. Samo izravno izvršavanje.',
    'MJ 10, 0, 0, 0, 0', { pomice: true, samoIzravno: true }),
  N('MO', 'gibanje', 'Move', 'Gibanje na poziciju', 'MO a[, O/C]', [A.poz(), A.oc()],
    'Gibanje na poziciju a zglobnom interpolacijom: sve osi kreću i stižu istodobno. O otvara, C zatvara prihvatnicu na kraju gibanja; bez tog parametra prihvatnica poprima stanje spremljeno uz poziciju.',
    'MO 1, C', { pomice: true, izvor: 'MAN, MSE, RWR', pretpostavka: 'Ponašanje parametra O/C nije opisano u dostupnim izvorima: simulator mijenja prihvatnicu na kraju gibanja, a bez O/C uzima stanje spremljeno uz poziciju (ako ga pozicija nema, prihvatnica ostaje kakva jest). Isto vrijedi za MA, MC, MS i MT.' }),
  N('MP', 'gibanje', 'Move Position', 'Gibanje na koordinate', 'MP x, y, z, p, r', [A.mm('x'), A.mm('y'), A.mm('z'), A.st('p'), A.st('r')],
    'Gibanje zglobnom interpolacijom na točku zadanu koordinatama X, Y, Z [mm] i kutovima P, R [°], bez spremanja pozicije. Točka izvan dosega javlja pogrešku II. Samo izravno izvršavanje.',
    'MP 250, 0, 300, -90, 0', { pomice: true, samoIzravno: true }),
  N('MS', 'gibanje', 'Move Straight', 'Pravocrtno gibanje', 'MS a, n[, O/C]', [A.poz(), { ime: 'n', tip: 'cijeli', min: 1, max: 99, jedinica: 'međutočaka', opcionalno: false }, A.oc()],
    'Vrh alata giba se po pravcu od trenutnog položaja do pozicije a. Upravljač izračuna n međutočaka (1–99) na pravcu i giba se između njih; više međutočaka daje točniji pravac. Ako bilo koja međutočka nije dohvatljiva, pogreška II prije početka gibanja.',
    'MS 3, 10, C', { pomice: true, izvor: 'MAN, MSE, UCP' }),
  N('MT', 'gibanje', 'Move Tool', 'Gibanje u smjeru alata', 'MT a, d[, O/C]', [A.poz(), A.mm('d'), A.oc()],
    'Gibanje na točku udaljenu d [mm] od pozicije a u smjeru osi alata (+ prema naprijed, − natrag); orijentacija ostaje kao u poziciji a. Služi za prilaz i odmicanje okomito na predmet. Zglobna interpolacija.',
    'MT 4, -40, O', { pomice: true, pretpostavka: 'Predznak d (+ = naprijed u smjeru alata) i zglobna interpolacija nisu potvrđeni u izvoru.' }),
  N('NT', 'gibanje', 'Nest', 'Traženje ishodišta (NEST)', 'NT', [],
    'Robot traži mehaničko ishodište graničnim prekidačima i Z-fazom enkodera: najprije J2, J3 i J4, zatim J1 i J5. Obvezno nakon svakog uključenja; dok NEST nije napravljen, ostale naredbe gibanja javljaju pogrešku II. Tijekom traženja svijetli EXECUTE.',
    'NT', { pomice: true }),
  N('OG', 'gibanje', 'Origin', 'Gibanje u referentni položaj', 'OG', [],
    'Gibanje u referentni položaj kartezijskog sustava (tvornički ili zadan naredbom HO).',
    'OG', { pomice: true, sukob: '[MAN]: OG giba robot u referentni položaj zadan s HO; [MSE]: OG postavlja sve zglobove na 0°. Simulator slijedi [MAN].' }),
  N('PA', 'gibanje', 'Pallet Assign', 'Definicija palete', 'PA i, j, k', [{ ime: 'i', tip: 'cijeli', min: 1, max: R_PA[0], jedinica: 'paleta', opcionalno: false }, { ime: 'j', tip: 'cijeli', min: 1, max: R_PA[1], jedinica: 'točaka u stupcu', opcionalno: false }, { ime: 'k', tip: 'cijeli', min: 1, max: R_PA[1], jedinica: 'točaka u redu', opcionalno: false }],
    'Za paletu i zadaje broj točaka rešetke: j u smjeru stupca i k u smjeru reda. Kutove palete daju četiri pozicije (vidi PALETA), a točku rešetke računa PT.',
    'PA 1, 3, 4', { izvor: 'MAN', pretpostavka: 'Sintaksa nije nađena (poglavlje Description of Commands nedostaje); preuzeta je iz srodnih Movemaster upravljača.' }),
  N('PC', 'gibanje', 'Position Clear', 'Brisanje pozicija', 'PC a[, b]', [A.poz('a'), A.poz('b', true)],
    'Briše poziciju a ili sve pozicije od a do b. Isto radi slijed P.C, broj, ENT na privjesku.',
    'PC 1, 20'),
  N('PD', 'gibanje', 'Position Define', 'Definicija pozicije', 'PD a, x, y, z, p, r', [A.poz(), A.mm('x'), A.mm('y'), A.mm('z'), A.st('p'), A.st('r')],
    'Definira poziciju a izravno koordinatama X, Y, Z [mm] i kutovima P, R [°]. Stanje prihvatnice uz poziciju zadaje se prethodno naredbom GF. Dohvatljivost se ne provjerava pri definiciji, nego pri gibanju. Samo izravno izvršavanje.',
    'PD 10, 361.9, -202.2, 469.8, -43.9, 178.9', { samoIzravno: true, izvor: 'MAN, MSE, IPN' }),
  N('PL', 'gibanje', 'Position Load', 'Kopiranje pozicije', 'PL a, b', [A.poz('a'), A.poz('b')],
    'Podaci pozicije b kopiraju se u poziciju a; pozicija b ostaje. Ako b nije definirana, pogreška II.',
    'PL 5, 3'),
  N('PT', 'gibanje', 'Pallet', 'Točka palete', 'PT i', [{ ime: 'i', tip: 'cijeli', min: 1, max: R_PA[0], jedinica: 'paleta', opcionalno: false }],
    'Računa koordinate točke rešetke palete i iz četiri kutne pozicije i rednih brojeva točke u brojilima (vidi PALETA) te ih sprema kao poziciju i. Redni broj izvan rešetke ili nedefiniran kut javlja pogrešku II.',
    'PT 1', { izvor: 'MAN', pretpostavka: 'Sintaksa i raspored pozicija i brojila palete nisu nađeni; simulator koristi raspored iz PALETA.' }),
  N('PX', 'gibanje', 'Position Exchange', 'Zamjena pozicija', 'PX a, b', [A.poz('a'), A.poz('b')],
    'Zamjenjuje podatke pozicija a i b.',
    'PX 1, 2'),
  N('SF', 'gibanje', 'Shift', 'Pomak pozicije', 'SF a, b', [A.poz('a'), A.poz('b')],
    'Poziciju a pomiče za vrijednosti pozicije b (zbraja X, Y, Z, P, R) i rezultat sprema u a. Obje pozicije moraju biti definirane.',
    'SF 1, 2'),
  N('SP', 'gibanje', 'Speed', 'Brzina', 'SP n[, H/L]', [{ ime: 'n', tip: 'cijeli', min: 0, max: 9, jedinica: 'stupanj brzine', opcionalno: false }, { ime: 'H/L', tip: 'hl', vrijednosti: ['H', 'L'], opcionalno: true }],
    'Brzina gibanja u 10 stupnjeva: 0 najsporije, 9 najbrže (do 1000 mm/s na prirubnici). H bira veliko, L malo ubrzanje (blaži polazak i zaustavljanje, dulje gibanje). Vrijedi za sva iduća gibanja. Prve probe s pravim robotom: SP 1–3.',
    'SP 3, L'),
  N('TI', 'gibanje', 'Timer', 'Čekanje', 'TI n', [{ ime: 'n', tip: 'cijeli', min: 0, max: 32767, jedinica: '× 0,1 s', opcionalno: false }],
    'Zaustavlja izvođenje na n × 0,1 s (0 do 3276,7 s). Koristi se npr. za čekanje da se prihvatnica zatvori.',
    'TI 5'),
  N('TL', 'gibanje', 'Tool', 'Duljina alata', 'TL l', [{ ime: 'l', tip: 'decimalni', min: R_TL[0], max: R_TL[1], jedinica: 'mm', opcionalno: false }],
    'Zadaje duljinu alata l [mm] od prirubnice do vrha alata (TCP). Sve koordinate (WH, HE, MO …) odnose se na tako pomaknut vrh. Zadano s motornom prihvatnicom približno 107 mm.',
    'TL 120'),

  /* ---------------- B. Upravljanje programom (19) ---------------- */
  N('CP', 'program', 'Compare Counter', 'Brojilo u registar', 'CP c', [A.brojilo()],
    'Vrijednost brojila c (1–99) upisuje se u unutarnji registar za usporedbu; nakon toga slijede EQ, NE, LG ili SM.',
    'CP 1'),
  N('DA', 'program', 'Disable Act', 'Zabrana prekida', 'DA b', [A.bit()],
    'Zabranjuje prekid programa s ulaznog bita b koji je omogućen naredbom EA.',
    'DA 7'),
  N('DC', 'program', 'Decrement Counter', 'Smanji brojilo', 'DC c', [A.brojilo()],
    'Smanjuje brojilo c za 1.',
    'DC 1', { pretpostavka: 'Prelazak granice −32768 / +32767 nije opisan; simulator broji u 16-bitnom zapisu s predznakom (preljev).' }),
  N('DL', 'program', 'Delete Line', 'Brisanje redaka', 'DL a[, b]', [A.red('a'), A.red('b', true)],
    'Briše programski redak a ili sve retke od a do b. Samo izravno izvršavanje.',
    'DL 10, 90', { samoIzravno: true }),
  N('EA', 'program', 'Enable Act', 'Omogući prekid', 'EA ±b, redak', [A.bitZ(), A.red()],
    'Omogućuje prekid: kad ulazni bit b prijeđe u zadano stanje (+ uključen, − isključen), program prekida tekuću naredbu (i gibanje) i skače na zadani redak.',
    'EA +7, 200', { pretpostavka: 'Sintaksa nije nađena, uzeta je prema smislu. Simulator provjerava bit tijekom izvođenja programa; prekid je jednokratan (nakon skoka treba novi EA), a gibanje u tijeku se zaustavlja.' }),
  N('ED', 'program', 'End', 'Kraj programa', 'ED', [],
    'Završava izvođenje programa.',
    'ED'),
  N('EQ', 'program', 'If Equal', 'Skok ako je jednako', 'EQ v, redak', [A.vrij(), A.red()],
    'Skok na redak ako je vrijednost u unutarnjem registru jednaka v (registar puni CP, ID ili IN).',
    'EQ 5, 100'),
  N('GS', 'program', 'Go Sub', 'Poziv potprograma', 'GS redak', [A.red()],
    'Poziva potprogram koji počinje u zadanom retku; RT vraća izvođenje na redak iza GS.',
    'GS 500', { pretpostavka: 'Dubina gniježđenja potprograma nije nađena; simulator dopušta 9 razina (više javlja pogrešku II).' }),
  N('GT', 'program', 'Go To', 'Skok', 'GT redak', [A.red()],
    'Bezuvjetni skok na zadani redak.',
    'GT 20', { pretpostavka: 'Skok na nepostojeći redak: simulator javlja pogrešku II (vrijedi i za EQ, NE, LG, SM, TB, GS, EA).' }),
  N('IC', 'program', 'Increment Counter', 'Povećaj brojilo', 'IC c', [A.brojilo()],
    'Povećava brojilo c za 1.',
    'IC 1'),
  N('LG', 'program', 'If Larger', 'Skok ako je veće', 'LG v, redak', [A.vrij(), A.red()],
    'Skok na redak ako je vrijednost u unutarnjem registru veća od v (v od −32768 do 32767).',
    'LG 10, 300'),
  N('NE', 'program', 'If Not Equal', 'Skok ako nije jednako', 'NE v, redak', [A.vrij(), A.red()],
    'Skok na redak ako vrijednost u unutarnjem registru nije jednaka v.',
    'NE 0, 40'),
  N('NW', 'program', 'New', 'Brisanje programa i pozicija', 'NW', [],
    'Briše cijeli program i sve pozicije u RAM-u. EPROM ostaje nepromijenjen.',
    'NW'),
  N('NX', 'program', 'Next', 'Kraj petlje', 'NX', [],
    'Označuje kraj petlje započete s RC: izvođenje se vraća na redak iza RC dok se petlja ne ponovi zadani broj puta.',
    'NX'),
  N('RC', 'program', 'Repeat Cycle', 'Ponavljanje petlje', 'RC n', [{ ime: 'n', tip: 'cijeli', min: 1, max: 32767, jedinica: 'ponavljanja', opcionalno: false }],
    'Redci između RC i NX izvode se n puta (1–32767).',
    'RC 5', { pretpostavka: 'Dubina gniježđenja petlji nije nađena; simulator dopušta 9 razina.' }),
  N('RN', 'program', 'Run', 'Pokretanje programa', 'RN [a[, b]]', [A.red('a', true), A.red('b', true)],
    'Pokreće program od retka a (bez a: od prvog retka) do retka b. Program staje na ED, na kraju programa, tipkom STOP ili kod pogreške.',
    'RN 10', { pomice: true, pretpostavka: 'Redak b se ne izvodi (program staje prije njega); RN unutar programa simulator ne dopušta (pogreška II).' }),
  N('RT', 'program', 'Return', 'Povratak iz potprograma', 'RT', [],
    'Vraća izvođenje na redak iza posljednjeg GS. RT bez GS javlja pogrešku II.',
    'RT'),
  N('SC', 'program', 'Set Counter', 'Postavi brojilo', 'SC c, v', [A.brojilo(), A.vrij()],
    'Upisuje vrijednost v (−32768 do 32767) u brojilo c (1–99).',
    'SC 1, 0'),
  N('SM', 'program', 'If Smaller', 'Skok ako je manje', 'SM v, redak', [A.vrij(), A.red()],
    'Skok na redak ako je vrijednost u unutarnjem registru manja od v.',
    'SM 3, 60'),

  /* ---------------- C. Prihvatnica (4) ---------------- */
  N('GC', 'prihvatnica', 'Grip Close', 'Zatvori prihvatnicu', 'GC', [],
    'Zatvara prihvatnicu: najprije početnom silom kroz zadano vrijeme, zatim silom držanja (GP).',
    'GC', { pomice: true }),
  N('GF', 'prihvatnica', 'Grip Flag', 'Zastavica prihvatnice', 'GF s', [{ ime: 's', tip: 'cijeli', min: 0, max: 1, jedinica: '0 otvorena / 1 zatvorena', opcionalno: false }],
    'Postavlja zastavicu stanja prihvatnice (0 otvorena, 1 zatvorena) koja se sprema uz pozicije definirane naredbom PD.',
    'GF 1', { pretpostavka: 'Simulator koristi GF samo za PD (stanje prihvatnice uz poziciju); prihvatnica se pritom ne giba.' }),
  N('GO', 'prihvatnica', 'Grip Open', 'Otvori prihvatnicu', 'GO', [],
    'Otvara prihvatnicu.',
    'GO', { pomice: true }),
  N('GP', 'prihvatnica', 'Grip Pressure', 'Sila prihvatnice', 'GP s, r, t', [{ ime: 's', tip: 'cijeli', min: 0, max: R_GP[0], jedinica: 'početna sila', opcionalno: false }, { ime: 'r', tip: 'cijeli', min: 0, max: R_GP[1], jedinica: 'sila držanja', opcionalno: false }, { ime: 't', tip: 'cijeli', min: 0, max: R_GP[2], jedinica: '× 0,1 s', opcionalno: false }],
    'Zadaje silu motorne prihvatnice: početnu silu s, silu držanja r i vrijeme t (× 0,1 s) koliko traje početna sila pri zatvaranju.',
    'GP 10, 6, 5'),

  /* ---------------- D. Ulazi i izlazi (6) ---------------- */
  N('ID', 'io', 'Input Direct', 'Izravno čitanje ulaza', 'ID', [],
    'Odmah čita vanjski ulazni port i upisuje ga u unutarnji registar, bez rukovanja.',
    'ID'),
  N('IN', 'io', 'Input', 'Sinkronizirano čitanje ulaza', 'IN', [],
    'Čita ulazni port uz rukovanje signalima STB/BUSY: čeka STB, upisuje podatak u registar, javlja BUSY i čeka da STB padne.',
    'IN', { pretpostavka: 'Vremenski dijagram nije nađen; slijed rukovanja je pretpostavka (vidi SIMRV_SIGNALI.rukovanje).' }),
  N('OB', 'io', 'Output Bit', 'Izlazni bit', 'OB ±b', [A.bitZ()],
    'Uključuje (+b) ili isključuje (−b) jedan izlazni bit; ostali izlazi se ne mijenjaju.',
    'OB +3'),
  N('OD', 'io', 'Output Direct', 'Izravan izlaz', 'OD v', [A.vrij()],
    'Odmah upisuje vrijednost v na izlazni port (svi bitovi odjednom), bez rukovanja.',
    'OD 5', { pretpostavka: 'S karticom A8/B8 vrijede samo niži bitovi (v & 255); negativne vrijednosti se upisuju kao 16-bitni zapis.' }),
  N('OT', 'io', 'Output', 'Sinkronizirani izlaz', 'OT v', [A.vrij()],
    'Upisuje v na izlazni port uz rukovanje signalima RDY/ACK: javlja RDY, čeka ACK, spušta RDY i čeka da ACK padne.',
    'OT 15', { pretpostavka: 'Vremenski dijagram nije nađen; slijed rukovanja je pretpostavka (vidi SIMRV_SIGNALI.rukovanje).' }),
  N('TB', 'io', 'Test Bit', 'Ispitivanje bita', 'TB ±b, redak', [A.bitZ(), A.red()],
    'Skok na redak ako je ulazni bit b uključen (+b) odnosno isključen (−b).',
    'TB +1, 80', { pretpostavka: 'Simulator ispituje izravno vanjski ulazni bit; neki srodni upravljači ispituju bit unutarnjeg registra (nakon ID).' }),

  /* ---------------- E. Čitanje preko RS-232C (6) ---------------- */
  N('CR', 'citanje', 'Counter Read', 'Čitanje brojila', 'CR c', [A.brojilo()],
    'Šalje računalu vrijednost brojila c.',
    'CR 1'),
  N('DR', 'citanje', 'Data Read', 'Čitanje registra', 'DR', [],
    'Šalje računalu vrijednost unutarnjeg registra (podatak učitan s ulaznog porta naredbom ID ili IN).',
    'DR'),
  N('ER', 'citanje', 'Error Read', 'Čitanje pogreške', 'ER', [],
    'Šalje stanje pogreške: 0 bez pogreške, 1 pogreška I. vrste, 2 pogreška II. vrste.',
    'ER'),
  N('LR', 'citanje', 'Line Read', 'Čitanje retka', 'LR redak', [A.red()],
    'Šalje sadržaj zadanog programskog retka.',
    'LR 10', { pretpostavka: 'Format odgovora nije nađen; simulator šalje redak s brojem („10 MO 20”), a za nepostojeći redak prazan redak.' }),
  N('PR', 'citanje', 'Position Read', 'Čitanje pozicije', 'PR a', [A.poz()],
    'Šalje koordinate pozicije a: X, Y, Z [mm], P, R [°].',
    'PR 5'),
  N('WH', 'citanje', 'Where', 'Trenutni položaj', 'WH', [],
    'Šalje trenutni položaj vrha alata: X, Y, Z [mm], P, R [°].',
    'WH'),

  /* ---------------- F. Ostalo (4) ---------------- */
  N('RS', 'ostalo', 'Reset', 'Poništavanje pogreške', 'RS', [],
    'Poništava pogrešku II. vrste (kao tipka RESET); program se vraća na početak, izlazi se ne brišu. Pogrešku I. vrste ne poništava.',
    'RS'),
  N('TR', 'ostalo', 'Transfer', 'EPROM → RAM', 'TR', [],
    'Prepisuje program i pozicije iz EPROM-a u RAM. Isto radi slijed TRN, ENT na privjesku.',
    'TR'),
  N('WR', 'ostalo', 'Write', 'RAM → EPROM', 'WR', [],
    'Upisuje program i pozicije iz RAM-a u EPROM ugrađenim programatorom. Isto radi slijed WRT, ENT na privjesku.',
    'WR', { pretpostavka: 'Trajanje upisa nije nađeno; simulator upis završava za 2 s.' }),
  N("'", 'ostalo', 'Comment', 'Komentar', "' tekst", [{ ime: 'tekst', tip: 'tekst', opcionalno: true }],
    'Komentar: ostatak retka se ne izvodi. Koristi se za opis programa.',
    "10 ' prihvat dijela")
];

/** brzi pristup: kod → naredba */
export const NAREDBA_PO_KODU = Object.fromEntries(NAREDBE.map((n) => [n.kod, n]));

/* ================================================================== paleta (PA / PT) — raspored pretpostavljen */
export const PALETA = pp('Raspored pozicija i brojila palete (PA/PT)', {
  brojPaleta: R_PA[0], maxTocaka: R_PA[1],
  /* pozicije kutova palete i: 10·i + pomak */
  baza: 10,
  kutovi: [
    { pomak: 0, naziv: 'ishodište (prva točka)' },
    { pomak: 1, naziv: 'kraj stupca (posljednja točka u smjeru stupca)' },
    { pomak: 2, naziv: 'kraj reda (posljednja točka u smjeru reda)' },
    { pomak: 3, naziv: 'dijagonalni kut' }
  ],
  /* redni broj točke: stupac u brojilu 10·i + 1, red u brojilu 10·i + 2 (od 1) */
  brojilaStupac: 1, brojilaRed: 2,
  opis: 'Paleta i: kutovi su pozicije 10·i (ishodište), 10·i+1 (kraj stupca), 10·i+2 (kraj reda) i 10·i+3 (dijagonalni kut). PT i čita redni broj u stupcu iz brojila 10·i+1, a u redu iz brojila 10·i+2 (od 1) i sprema izračunatu točku kao poziciju i (bilinearno između kutova).'
}, 'Raspored pozicija i brojila palete nije nađen (poglavlje Description of Commands nedostaje). Uzet je raspored koji ne dira pozicije 1–9 i brojila 1–9. Provjeriti u izvornom priručniku.', 'kutovi 10·i … 10·i+3, brojila 10·i+1 i 10·i+2');

/* ================================================================== zadane vrijednosti upravljanja (simulator) */
export const UPRAVLJANJE_ZADANO = {
  sp: 4,            /* brzina nakon uključenja — pretpostavka je u rvm1_podaci.js (BRZINE.zadano), interpreter čita odande */
  ubrzanje: pp('Ubrzanje nakon uključenja', 'H', 'Nije nađeno; uzeto H (veliko ubrzanje). Vrijeme ubrzanja H/L je u BRZINE.ubrzanje.', 'H'),
  movSp: 4,         /* MOV na privjesku giba brzinom SP4 [MAN] */
  nestSp: 3,        /* NEST brzinom SP 3 — pretpostavka je u rvm1_podaci.js (NEST.vrijeme) */
  gp: pp('Sila prihvatnice nakon uključenja (GP)', { pocetna: 10, drzanja: 6, vrijeme: 3 }, 'Nije nađeno; uzeto GP 10, 6, 3.', 'GP 10, 6, 3'),
  gf: 0,
  trajanjeOtvaranja: pp('Trajanje otvaranja prihvatnice', 0.4, 'Nije nađeno (hod 0–60 mm); simulator otvaranje izvodi za 0,4 s, a zatvaranje traje koliko vrijeme početne sile iz GP (najmanje 0,3 s).', '0,4 s'),
  trajanjeZatvaranjaMin: 0.3,
  trajanjeWR: 2,
  jogZglobni: 0.3,  /* PTP: udio najveće brzine osi = SP 2 (pretpostavka „Brzina ručnog gibanja s privjeska” u rvm1_podaci.js) */
  jogLinearni: pp('Brzina ručnog vođenja u XYZ/TOOL načinu', 0.05, 'Nije nađeno. SP 2 bi dao 300 mm/s, što je za ručno vođenje prebrzo; simulator vrh alata vodi brzinom 50 mm/s.', '50 mm/s'),
  jogKutni: pp('Brzina ručnog nagiba i okreta (P, R) u XYZ načinu', 30 * RAD, 'Nije nađeno; simulator nagib i okret oko TCP-a vodi brzinom 30 °/s.', '30 °/s'),
  stogGS: 9, stogRC: 9,
  maxNaredbiPoKoraku: 2000, /* zaštita od beskonačne petlje bez gibanja u jednom pozivu azuriraj() */
  treptanjeError: 0.5, /* ERROR trepće s periodom 0,5 s kod pogreške I [MAN] */
  privjesakBlokiraPC: pp('Naredba s računala dok je privjesak ON', 'pogreška II', 'Izvor kaže samo da privjesak mora biti OFF [MAN], [SMA]; simulator naredbu odbija i javlja pogrešku II.', 'pogreška II'),
  citanjeTijekomPogreske: pp('Naredbe tijekom pogreške II', ['RS', 'ER', 'WH', 'PR', 'CR', 'DR', 'LR'], 'Nije nađeno; simulator tijekom pogreške II prima samo RS i naredbe čitanja, ostale odbija.', 'RS i čitanje'),
  jogPrijeNesta: pp('Ručno vođenje prije NEST-a', 'PTP', 'Izvor traži da se ruka prije NEST-a ručno dovede u siguran položaj; simulator prije NEST-a dopušta samo PTP vođenje, XYZ i TOOL ne.', 'samo PTP'),
  ramSBaterijom: pp('Program i pozicije nakon isključenja', true, 'RAM sa baterijom BAT-M1 čuva podatke ~2 godine [MAN]; simulator ih zadržava nakon isključenja.', 'ostaju')
};

/* ================================================================== format odgovora na naredbe čitanja */
export const FORMAT_ODGOVORA = pp('Format odgovora na naredbe čitanja (WH, PR, CR, DR, ER, LR)', {
  pozicija: { polja: ['X', 'Y', 'Z', 'P', 'R'], decimale: 1, znak: 'uvijek', razdjelnik: ',', primjer: '+250.0,+0.0,+300.0,-90.0,+0.0', oc: false },
  brojilo: { primjer: '15', opis: 'cijeli broj s predznakom samo kad je negativan' },
  registar: { primjer: '5', opis: 'cijeli broj (vrijednost unutarnjeg registra)' },
  greska: { primjer: '0', vrijednosti: { 0: 'nema pogreške', 1: 'pogreška I. vrste', 2: 'pogreška II. vrste' } },
  redak: { primjer: '10 MO 20', opis: 'broj retka, razmak, naredba; nepostojeći redak = prazan redak' },
  kraj: 'CR (ili CR+LF prema SW1 bit 1)'
}, 'Točan format odgovora nije nađen. Za pozicije je uzet zapis s predznakom i jednom decimalom, odvojen zarezima (oblik iz primjera PD u [IPN]); stanje prihvatnice se ne šalje. Provjeriti s pravim robotom (WH nakon NT).', '+250.0,+0.0,+300.0,-90.0,+0.0');

/* ================================================================== RS-232C (PODACI §3.4) */
export const RS232 = {
  baud: 9600, paritet: 'E', paritetWebSerial: 'even', bitovi: 7, stop: 2,
  kraj: 'CR', /* SW1 bit 1 dolje = CR, gore = CR+LF */
  krajPremaSW1: { gore: 'CR+LF', dolje: 'CR', bit: 1 },
  zapis: 'COM1: 9600, E, 7, 2',
  konektor: 'DB-25 (RS-232C) na stražnjoj ploči DUM1',
  postavke: 'Format se mijenja preklopnikom SW2, brzina preklopnikom SW3 (tvornički 9600 Bd, 7 bita, parni paritet, 2 stop-bita) [IPN].',
  kontrolaToka: pp('Kontrola toka RS-232C', 'none', 'Raspored pinova i rukovanje (RTS/CTS, DTR/DSR) nisu nađeni; veza preko preglednika ne koristi sklopovsku kontrolu toka i čeka kraj svake naredbe (odgovor ili vrijeme).', 'bez kontrole toka'),
  drugoSucelje: 'Centronics (paralelno), samo za slanje s računala',
  izvor: 'MAN, IPN'
};

/* ================================================================== prednja i stražnja ploča DUM1, preklopnici */
export const DUM1_PLOCA = {
  prednja: [ /* redom odozgo prema dolje, lijevi rub prednje ploče [foto 11–12] */
    { id: 'power', natpis: 'POWER', vrsta: 'led', boja: 'zuta', opis: 'Svijetli kad je napajanje uključeno.', izvor: 'MAN, FOTO' },
    { id: 'emg', natpis: 'EMG. STOP', vrsta: 'tipka', boja: 'crvena u žutom okviru', opis: 'Isključuje servo napajanje i koči J2 i J3; izaziva pogrešku I. vrste (LED3).', izvor: 'MAN, FOTO' },
    { id: 'error', natpis: 'ERROR', vrsta: 'led', boja: 'crvena', opis: 'Trepće (0,5 s) kod pogreške I, svijetli stalno kod pogreške II.', izvor: 'MAN, FOTO' },
    { id: 'execute', natpis: 'EXECUTE', vrsta: 'led', boja: 'zelena', opis: 'Svijetli dok se izvodi naredba ili program, i tijekom NEST-a.', izvor: 'MAN, FOTO' },
    { id: 'start', natpis: 'START', vrsta: 'tipka', boja: 'zelena', opis: 'Pokreće ili nastavlja program (ako je SW1 bit 5 postavljen na prednju ploču).', izvor: 'MAN, FOTO' },
    { id: 'stop', natpis: 'STOP', vrsta: 'tipka', boja: 'crvena', opis: 'Zaustavlja program nakon tekuće naredbe.', izvor: 'MAN, FOTO' },
    { id: 'reset', natpis: 'RESET', vrsta: 'tipka', boja: 'bijela', opis: 'Poništava pogrešku II i zaustavljeni program; program se vraća na početak, izlazi se ne brišu.', izvor: 'MAN, FOTO' }
  ],
  natpisPrednje: 'MOVEMASTER EX — RV-M1 DRIVE UNIT (desno gore) [foto]; na modelu bez natpisa.',
  straznja: [ /* [MAN]; raspored prema [foto 06]: utori kartica lijevo, hladnjak u sredini, napajanje desno */
    { id: 'centronics', natpis: 'CENTRONICS', vrsta: 'konektor', opis: 'Paralelno sučelje za slanje naredbi s računala.' },
    { id: 'rs232', natpis: 'RS-232C', vrsta: 'konektor', opis: 'Serijsko sučelje (DB-25), 9600 Bd, E, 7, 2.' },
    { id: 'extio', natpis: 'EXTERNAL I/O', vrsta: 'konektor', opis: 'Vanjski ulazi i izlazi (kartica A8/B8 ili A16/B16), namjenski ulazi START, STOP, RESET i izlaz pogreške; na njega je spojen SIM RV.' },
    { id: 'tbox', natpis: 'TEACHING BOX', vrsta: 'konektor', opis: 'Priključak privjeska (kabel 3 m).' },
    { id: 'mpower', natpis: 'MOTOR POWER', vrsta: 'konektor', opis: 'Kabel napajanja motora prema robotu (5 m).' },
    { id: 'msignal', natpis: 'MOTOR SIGNAL', vrsta: 'konektor', opis: 'Kabel enkodera i graničnih prekidača prema robotu (5 m).' },
    { id: 'extemg', natpis: 'EXT EMG STP', vrsta: 'stezaljka', opis: 'Vanjski STOP u nuždi, mirni kontakt (NC); otvoren krug izaziva pogrešku I (LED3).' },
    { id: 'hand', natpis: 'HAND AC/DC', vrsta: 'preklopnik', opis: 'DC = motorna prihvatnica, AC = pneumatska s AC elektroventilom. Krivi položaj može spaliti izvor (upozorenje na boku DUM1).' },
    { id: 'zemlja', natpis: '⏚', vrsta: 'stezaljka', opis: 'Uzemljenje.' },
    { id: 'osigurac', natpis: 'FUSE', vrsta: 'osigurač', opis: 'Osigurač 250 V AC / 10 A.' },
    { id: 'mreza', natpis: 'POWER OFF/ON', vrsta: 'preklopnik', opis: 'Mrežni preklopnik uz natpisnu pločicu i mrežni priključak (AC 220 V, 520 VA) [foto].' }
  ],
  bocnaVrata: 'Iza bočnih vrata: LED1–LED5 (uzrok pogreške I), preklopnici SW1, SW2, SW3, ST1 i ST2.',
  sw1: [ /* gore = true */
    { bit: 1, naziv: 'Kraj retka RS-232C', gore: 'CR+LF', dolje: 'CR', zadano: false },
    { bit: 2, naziv: 'Provjera baterije', gore: 'uključena', dolje: 'isključena', zadano: false },
    { bit: 3, naziv: 'Tip I/O kartice', gore: 'A16/B16', dolje: 'A8/B8', zadano: false },
    { bit: 4, naziv: 'Dopušta HO (izmjena referentnog položaja)', gore: 'dopušteno', dolje: 'zabranjeno', zadano: false },
    { bit: 5, naziv: 'Izvor signala START', gore: 'vanjski ulaz', dolje: 'prednja ploča', zadano: false },
    { bit: 6, naziv: 'Otpuštanje kočnica J2/J3 s privjeska', gore: 'dopušteno', dolje: 'zabranjeno', zadano: false },
    { bit: 7, naziv: 'Ne koristi se', gore: '—', dolje: '—', zadano: false },
    { bit: 8, naziv: 'Zujalo', gore: 'uključeno', dolje: 'isključeno', zadano: true }
  ],
  sw1Napomena: pp('Značenje položaja SW1 bitova 2, 3, 5, 6, 8 i tvorničke postavke', 'gore = uključeno', '[MAN] daje samo popis funkcija; potvrđeno je bit 1 gore = CR+LF i bit 4 gore = dopušta HO. Za ostale bitove smjer i tvornički položaj su pretpostavka.', 'gore = funkcija uključena'),
  sw2: { naziv: 'SW2 — format RS-232C (bitovi, paritet, stop-bitovi)', zadano: '7, E, 2', izvor: 'MAN, IPN' },
  sw3: { naziv: 'SW3 — brzina RS-232C', zadano: '9600 Bd', izvor: 'MAN, IPN' },
  st1: { naziv: 'ST1 — način DUM1 / PC', vrijednosti: ['DUM1', 'PC'], zadano: pp('ST1 zadani položaj', 'PC', 'Položaj nije nađen; uzet je PC. Simulator ST1 samo prikazuje.', 'PC') },
  st2: { naziv: 'ST2 — kopiranje EPROM → RAM pri uključenju', vrijednosti: [false, true], zadano: false },
  led: ['LED1', 'LED2', 'LED3', 'LED4', 'LED5'],
  izvor: 'MAN, FOTO'
};

/* ================================================================== privjesak „RV-M1 TEACHING BOX” [foto 10], [MAN], [SMA] */
/* Raspored: 7 redova × 4 stupca; stupci 1–2 funkcijske tipke (smeđe-narančaste, ENT krem), stupci 3–4 tipke gibanja (krem). */
function T(id, natpis, red, stupac, boja, dod) { return { id, natpis, red, stupac, boja, brojka: null, ptp: null, xyz: null, tool: null, naredba: null, slijed: null, ...dod }; }
export const PRIVJESAK = {
  naziv: 'RV-M1 TEACHING BOX',
  kabel: '3 m', remen: true,
  elementi: [
    { id: 'onoff', natpis: 'ON / OFF', vrsta: 'preklopnik', polozaj: 'gore lijevo', opis: 'ON: tipke privjeska su aktivne. Za izvođenje programa ili rad s računala mora biti OFF.' },
    { id: 'emg', natpis: 'EMG STOP', vrsta: 'tipka', boja: 'crvena', polozaj: 'gore desno', opis: 'STOP u nuždi: pogreška I. vrste (LED4); poništava se isključenjem i uključenjem DUM1 i novim NEST-om.' },
    { id: 'zaslon', natpis: '', vrsta: 'zaslon', boja: 'crveni LED', polozaj: 'ispod preklopnika, preko cijele širine', opis: 'Četiri znamenke: broj pozicije s 3 znamenke i znakom stanja, broj retka s 4 znamenke.' }
  ],
  zaslon: {
    znamenke: 4, boja: 'crvena',
    pozicija: 'znak stanja + 3 znamenke (INC, DEC, P.S, P.C, MOV)',
    redak: '4 znamenke (STEP i izvođenje programa)',
    znakovi: sukob('Znakovi stanja na zaslonu privjeska', [{ znak: '-', znacenje: 'postupak u tijeku ili završen' }, { znak: '!', znacenje: 'ne može se izvesti (npr. MOV na obrisanu poziciju)' }],
      '[MAN] (OCR) navodi „-” i „!”; [SMA] (OCR) ih čita kao „U” i „C”. Simulator koristi „-” i „!”.', '„-” / „!”'),
    unos: pp('Prikaz na zaslonu privjeska tijekom unosa', ' 000', 'Točan izgled zaslona tijekom unosa nije nađen. Simulator: prazan znak + 3 znamenke dok se upisuje broj pozicije (znamenke ulaze zdesna), 4 znamenke za redak; nakon ENT „-” (izvodi se / gotovo) ili „!” (ne može se izvesti). Funkcije bez broja (NST, ORG, TRN, WRT) prikazuju „-” i tri praznine.', '„ 012” → „-012” / „!012”')
  },
  nacini: [
    { id: 'PTP', opis: 'ručno gibanje po zglobovima (zadano nakon uključenja)' },
    { id: 'XYZ', opis: 'ručno gibanje vrha alata u kartezijskom sustavu; P i R okreću šaku oko TCP-a' },
    { id: 'TOOL', opis: 'ručno gibanje u smjeru alata: Z+ naprijed, Z− natrag' }
  ],
  tipke: [
    /* red 1 */
    T('INC', 'INC', 1, 1, 'smeda', { naredba: 'IP', slijed: 'INC, ENT', opis: 'Gibanje na sljedeću (za 1 veću) poziciju.' }),
    T('DEC', 'DEC', 1, 2, 'smeda', { naredba: 'DP', slijed: 'DEC, ENT', opis: 'Gibanje na prethodnu (za 1 manju) poziciju.' }),
    T('X+', 'X+ / B+', 1, 3, 'bijela', { ptp: 'J1 struk +', xyz: 'X +', tool: 'X + (kao XYZ)', opis: 'PTP: okret struka (B = J1). XYZ: pomak vrha alata po X.' }),
    T('X-', 'X− / B−', 1, 4, 'bijela', { ptp: 'J1 struk −', xyz: 'X −', tool: 'X − (kao XYZ)', opis: 'PTP: okret struka. XYZ: pomak po X.' }),
    /* red 2 */
    T('P.S', 'P.S', 2, 1, 'smeda', { naredba: 'HE', slijed: 'P.S, broj, ENT', opis: 'Sprema trenutni položaj pod zadani broj pozicije (učenje točke).' }),
    T('P.C', 'P.C', 2, 2, 'smeda', { naredba: 'PC', slijed: 'P.C, broj, ENT', opis: 'Briše poziciju zadanog broja.' }),
    T('Y+', 'Y+ / S+', 2, 3, 'bijela', { ptp: 'J2 rame +', xyz: 'Y +', tool: 'Y + (kao XYZ)', opis: 'PTP: rame (S = J2). XYZ: pomak po Y.' }),
    T('Y-', 'Y− / S−', 2, 4, 'bijela', { ptp: 'J2 rame −', xyz: 'Y −', tool: 'Y − (kao XYZ)', opis: 'PTP: rame. XYZ: pomak po Y.' }),
    /* red 3 */
    T('NST', 'NST', 3, 1, 'smeda', { naredba: 'NT', slijed: 'NST, ENT', opis: 'Traženje mehaničkog ishodišta (NEST).' }),
    T('ORG', 'ORG', 3, 2, 'smeda', { naredba: 'OG', slijed: 'ORG, ENT', opis: 'Gibanje u referentni položaj kartezijskog sustava.' }),
    T('Z+', 'Z+ / 4 E+', 3, 3, 'bijela', { brojka: 4, ptp: 'J3 lakat +', xyz: 'Z +', tool: 'naprijed u smjeru alata', opis: 'PTP: lakat (E = J3). XYZ: pomak po Z. TOOL: naprijed. Pri unosu broja: 4.' }),
    T('Z-', 'Z− / 9 E−', 3, 4, 'bijela', { brojka: 9, ptp: 'J3 lakat −', xyz: 'Z −', tool: 'natrag u smjeru alata', opis: 'PTP: lakat. XYZ: pomak po Z. TOOL: natrag. Pri unosu broja: 9.' }),
    /* red 4 */
    T('TRN', 'TRN', 4, 1, 'smeda', { naredba: 'TR', slijed: 'TRN, ENT', opis: 'Prijenos programa i pozicija EPROM → RAM.' }),
    T('WRT', 'WRT', 4, 2, 'smeda', { naredba: 'WR', slijed: 'WRT, ENT', opis: 'Upis programa i pozicija RAM → EPROM.' }),
    T('P+', 'P+ / 3', 4, 3, 'bijela', { brojka: 3, ptp: 'J4 nagib +', xyz: 'nagib šake + oko TCP-a', tool: 'nagib šake + oko TCP-a', opis: 'PTP: nagib šake (J4). XYZ: nagib oko vrha alata. Pri unosu broja: 3.' }),
    T('P-', 'P− / 8', 4, 4, 'bijela', { brojka: 8, ptp: 'J4 nagib −', xyz: 'nagib šake − oko TCP-a', tool: 'nagib šake − oko TCP-a', opis: 'PTP: nagib šake. XYZ: nagib oko vrha alata. Pri unosu broja: 8.' }),
    /* red 5 */
    T('MOV', 'MOV', 5, 1, 'smeda', { naredba: 'MO', slijed: 'MOV, broj, ENT', opis: 'Gibanje na poziciju zadanog broja brzinom SP 4 (provjera naučene točke).' }),
    T('STEP', 'STEP', 5, 2, 'smeda', { slijed: 'STEP, redak, ENT; zatim STEP, ENT', opis: 'Izvodi program redak po redak od zadanog retka; iduća pritiskanja bez broja izvode sljedeći redak.' }),
    T('R+', 'R+ / 2', 5, 3, 'bijela', { brojka: 2, ptp: 'J5 okret +', xyz: 'okret šake + oko TCP-a', tool: 'okret šake + oko TCP-a', opis: 'PTP: okret šake (J5). Pri unosu broja: 2.' }),
    T('R-', 'R− / 7', 5, 4, 'bijela', { brojka: 7, ptp: 'J5 okret −', xyz: 'okret šake − oko TCP-a', tool: 'okret šake − oko TCP-a', opis: 'PTP: okret šake. Pri unosu broja: 7.' }),
    /* red 6 */
    T('PTP', 'PTP', 6, 1, 'smeda', { opis: 'Način ručnog gibanja po zglobovima (zadan nakon uključenja).' }),
    T('XYZ', 'XYZ', 6, 2, 'smeda', { opis: 'Način ručnog gibanja u kartezijskom sustavu.' }),
    T('OPT+', '+ OPTION / 1', 6, 3, 'bijela', { brojka: 1, ptp: 'opcijska os +', xyz: 'opcijska os +', tool: 'opcijska os +', opis: 'Dodatna (opcijska) os, ako je ugrađena. Pri unosu broja: 1.' }),
    T('OPT-', '− OPTION / 6', 6, 4, 'bijela', { brojka: 6, ptp: 'opcijska os −', xyz: 'opcijska os −', tool: 'opcijska os −', opis: 'Dodatna (opcijska) os. Pri unosu broja: 6.' }),
    /* red 7 */
    T('ENT', 'ENT', 7, 1, 'bijela', { opis: 'Potvrda unosa. Uz SW1 bit 6 i isključen servo: držanjem se otpuštaju kočnice J2 i J3.' }),
    T('TOOL', 'TOOL', 7, 2, 'smeda', { opis: 'Način ručnog gibanja u smjeru alata.' }),
    T('O', '◄O► / 0', 7, 3, 'bijela', { brojka: 0, ptp: 'otvori prihvatnicu', xyz: 'otvori prihvatnicu', tool: 'otvori prihvatnicu', opis: 'Otvara prihvatnicu. Pri unosu broja: 0.' }),
    T('C', '►C◄ / 5', 7, 4, 'bijela', { brojka: 5, ptp: 'zatvori prihvatnicu', xyz: 'zatvori prihvatnicu', tool: 'zatvori prihvatnicu', opis: 'Zatvara prihvatnicu. Pri unosu broja: 5.' })
  ],
  redova: 7, stupaca: 4,
  bojeNapomena: 'Boje prema fotografiji: funkcijske tipke smeđe-narančaste, tipke gibanja i ENT krem-bijele; natpisi tamni.',
  postupci: [
    { naziv: 'Učenje točke', koraci: 'ručnim gibanjem dovedi robot u položaj, zatim P.S, broj, ENT' },
    { naziv: 'Provjera točke', koraci: 'MOV, broj, ENT' },
    { naziv: 'Izmjena točke', koraci: 'novi položaj spremi pod isti broj (P.S)' },
    { naziv: 'Brisanje točke', koraci: 'P.C, broj, ENT' },
    { naziv: 'Otpuštanje kočnica J2/J3', koraci: 'napajanje isključeno ili pogreška I: SW1 bit 6 = ON, privjesak ON, drži ENT i pridržavaj ruku; zatim bit 6 vrati na OFF' }
  ],
  ogranicenja: 'Privjesak ne može pisati ni pokretati programe, osim izvođenja redak po redak tipkom STEP. Pamti pozicije 1–629.',
  izvor: 'MAN, SMA, CSU, BRO, FOTO'
};

/* ================================================================== pogreške (PODACI §5.2, §5.3) */
export const POGRESKE = {
  I: [
    { led: 'LED1', uzrok: 'Prevelika servo pogreška: preopterećenje, kvar enkodera ili sudar.', ponistavanje: 'isključi napajanje, ukloni uzrok, uključi i napravi NEST' },
    { led: 'LED2', uzrok: 'Odspojen kabel motora (MOTOR POWER) ili signala (MOTOR SIGNAL).', ponistavanje: 'isključi napajanje, spoji kabel, uključi i napravi NEST' },
    { led: 'LED3', uzrok: 'STOP u nuždi na DUM1 ili vanjski (EXT EMG STP).', ponistavanje: 'otpusti tipku, isključi i uključi napajanje, napravi NEST' },
    { led: 'LED4', uzrok: 'STOP u nuždi na privjesku, privjesak odspojen tijekom rada ili spojen pri uključenju.', ponistavanje: 'otpusti tipku, isključi i uključi napajanje, napravi NEST' },
    { led: 'LED5', uzrok: 'Prazna baterija (ako je uključena provjera, SW1 bit 2).', ponistavanje: 'zamijeni bateriju BAT-M1, isključi i uključi napajanje, napravi NEST' }
  ],
  II: [
    { kod: 'II-NAREDBA', skupina: 'prijenos', uzrok: 'Nepoznata naredba.' },
    { kod: 'II-FORMAT', skupina: 'prijenos', uzrok: 'Krivi format naredbe (broj ili vrsta argumenata, znakovi).' },
    { kod: 'II-REDAK', skupina: 'prijenos', uzrok: 'Broj retka izvan 1–2048 ili predug redak.' },
    { kod: 'II-RASPON', skupina: 'neizvediva', uzrok: 'Argument izvan dopuštenog raspona.' },
    { kod: 'II-POZICIJA', skupina: 'neizvediva', uzrok: 'Pozicija nije definirana.' },
    { kod: 'II-DOHVAT', skupina: 'neizvediva', uzrok: 'Točka nije dohvatljiva ili bi zglob izašao iz raspona.' },
    { kod: 'II-NEST', skupina: 'neizvediva', uzrok: 'Naredba gibanja prije NEST-a.' },
    { kod: 'II-PROGRAM', skupina: 'neizvediva', uzrok: 'Skok na nepostojeći redak, RT bez GS, NX bez RC, prepun stog ili nema programa.' },
    { kod: 'II-IZRAVNO', skupina: 'neizvediva', uzrok: 'Naredba koja se izvršava samo izravno (MJ, MP, PD, DL) upisana u program, ili RN u programu.' },
    { kod: 'II-HO', skupina: 'neizvediva', uzrok: 'HO bez dopuštenja (SW1 bit 4 dolje).' },
    { kod: 'II-PRIVJESAK', skupina: 'neizvediva', uzrok: 'Naredba s računala dok je privjesak ON.' },
    { kod: 'II-ZAUZETO', skupina: 'neizvediva', uzrok: 'Naredba nije dopuštena dok se izvodi program (npr. NW, DL, upis retka).' },
    { kod: 'II-EPROM', skupina: 'eprom', uzrok: 'Pogreška upisa u EPROM.' }
  ],
  kodoviNapomena: pp('Oznake pogrešaka II-…', 'II-NAREDBA …', 'Robot uzrok pogreške II ne prikazuje kodom (samo ERROR svijetli i zujalo zvuči); oznake II-… su naše, za simulator i nastavu. Uzroci su prema [MAN].', 'naše oznake'),
  znakoviI: 'ERROR trepće (0,5 s), zujalo prati treptanje, servo napajanje se isključuje, J2 i J3 koče. Uzrok pokazuju LED1–LED5 iza bočnih vrata.',
  znakoviII: 'ERROR svijetli stalno, zujalo zvuči neprekidno; program staje na retku s pogreškom, broj retka je na zaslonu privjeska.',
  ponistavanjeI: 'Isključi napajanje, ukloni uzrok, uključi i ponovno napravi NEST.',
  ponistavanjeII: ['tipka RESET na DUM1', 'naredba RS s računala (privjesak OFF)', 'namjenski ulaz RESET'],
  ER: { 0: 'nema pogreške', 1: 'pogreška I. vrste', 2: 'pogreška II. vrste' },
  izvor: 'MAN, MSE'
};

/* ================================================================== ulazno-izlazni simulator SIM RV [foto 06, 10] */
export const SIMRV_SIGNALI = {
  naziv: 'SIM RV',
  pretpostavka: pp('Simulator SIM RV i kartica A8/B8', 'A8/B8', 'O simulatoru „SIM RV” nije nađen nijedan izvor. Njegovih 8 preklopnika, 8 LED-ica i signali STB, ACK, RDY i BUSY [foto] odgovaraju kartici A8/B8 (8 ulaza / 8 izlaza); smjer signala i rukovanje su pretpostavka.', '8 ulaza / 8 izlaza'),
  raspored: 'Lijevo stupac INPUT: 8 preklopnika bit 0–7 s oznakama položaja H (gore) i L; sredina OUTPUT: 8 crvenih LED bit 0–7; dolje preklopnici STB i ACK, zelene LED RDY i BUSY; zelena LED POWER uz rub. Spaja se na EXTERNAL I/O. [foto]',
  ulazi: [0, 1, 2, 3, 4, 5, 6, 7].map((b) => ({ bit: b, natpis: String(b), element: 'preklopnik', polozaji: { H: 1, L: 0 }, opis: 'Ulazni bit ' + b + ' prema DUM1 (ID, IN, TB, EA).' })),
  izlazi: [0, 1, 2, 3, 4, 5, 6, 7].map((b) => ({ bit: b, natpis: String(b), element: 'LED', boja: 'crvena', opis: 'Izlazni bit ' + b + ' iz DUM1 (OB, OD, OT).' })),
  rukovanje: [
    { id: 'STB', smjer: 'ulaz', element: 'preklopnik', opis: 'Strobe: vanjski uređaj javlja da su podaci na ulazu spremni (za IN).' },
    { id: 'ACK', smjer: 'ulaz', element: 'preklopnik', opis: 'Acknowledge: vanjski uređaj potvrđuje da je preuzeo izlazni podatak (za OT).' },
    { id: 'RDY', smjer: 'izlaz', element: 'LED', boja: 'zelena', opis: 'Ready: DUM1 javlja da je izlazni podatak spreman (za OT).' },
    { id: 'BUSY', smjer: 'izlaz', element: 'LED', boja: 'zelena', opis: 'Busy: DUM1 javlja da je preuzeo ulazni podatak (za IN).' }
  ],
  power: { element: 'LED', boja: 'zelena', opis: 'Napajanje simulatora (12–24 V DC vanjskog I/O).' },
  slijed: pp('Slijed rukovanja IN i OT', { IN: ['DUM1 čeka STB = 1', 'čita ulazni port u registar', 'BUSY = 1', 'čeka STB = 0', 'BUSY = 0'], OT: ['DUM1 upisuje podatak na izlaz', 'RDY = 1', 'čeka ACK = 1', 'RDY = 0', 'čeka ACK = 0'] },
    'Vremenski dijagram STB/ACK/RDY/BUSY nije nađen (dodatak priručnika nedostaje). Pretpostavka prema rasporedu na SIM RV: STB i ACK su preklopnici (ulazi u DUM1), RDY i BUSY LED-ice (izlazi iz DUM1).', 'IN: STB → BUSY; OT: RDY → ACK'),
  namjenski: { ulazi: ['START', 'STOP', 'RESET'], izlazi: ['pogreška'], napomena: 'Namjenski ulazi i izlaz su na EXTERNAL I/O, ali ne na SIM RV [MAN].' },
  napajanje: '12–24 V DC, osigurava korisnik [MAN]',
  izvor: 'FOTO, MAN'
};

/* ================================================================== popis za rvm1_podaci.js */
nedostaje('Raspored pinova EXTERNAL I/O i vremenski dijagram STB/ACK/RDY/BUSY', 'Dodatak priručnika [MAN] nije dostupan; izmjeriti ili nabaviti izvorni priručnik.');
nedostaje('Poglavlje Description of Commands (točni rasponi GP, PA, PT, EA, HO, MJ; ponašanje O/C)', 'Javno dostupan primjerak [MAN] ima samo poglavlja 1–10; sintaksa je iz sekundarnog izvora [MSE].');

/** sve pretpostavke, sukobi i nedostajući podaci ovog dijela (rvm1_podaci.js ih uključuje u svoj popis) */
export const PRETPOSTAVKE_JEZIK = _REG;
