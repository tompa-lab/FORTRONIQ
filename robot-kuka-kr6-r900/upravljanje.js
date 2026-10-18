/* FORTRONIQ · Robot KUKA KR 6 R900 — Upravljanje robotom: privjesak nalik smartPAD-u, ručno vođenje, KRL interpreter,
   prihvatnice TOOL1–TOOL4 i nizovi koraka. Privjesak, zaslon i tekst su naši; nazivi s uređaja (T1, BCO, PTP…) ostaju kao na upravljanju.
   Svi podaci robota dolaze iz kuka_podaci.js; parametri simulatora (raspored ćelije, primjeri točaka) su u bloku SIM i popisani na stranici.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviKUKA } from './kuka_model.js?v=01';
import * as KIN from './kuka_kin.js';
import { V, OSI, POLOZAJI, PRIHVATNICE, PRIVJESAK, UPRAVLJAC, KRL, MJERE, IZVORI, NAZIV_ROBOTA, TEKST_INACICA, KUT_ISPRUZENE, pretpostavke, TEKST_PRETPOSTAVKE } from './kuka_podaci.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PI = Math.PI, D = PI / 180;
const kr = (v, d = 1) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d).replace('.', ',').replace('-', '−'); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const pT = (T) => [T[3], T[7], T[11]];
const { pomnozi: mul, inverz: inv, okvir, fk } = KIN;

/* ================================================================== */
/* 1. Parametri simulatora (nisu podaci robota — popisani na stranici) */
/* ================================================================== */
const SIM = {
  dt: KRL.ipoTakt,                         /* korak simulacije = interpolacijski takt */
  jogOsi: 0.10,                            /* ručno gibanje po osima pri HOV 100 %: 10 % najveće brzine osi */
  jogKart: KRL.t1MaxBrzina,                /* kartezijsko ručno gibanje pri HOV 100 % [m/s] */
  jogOri: 30 * D,                          /* zakretanje pri HOV 100 % [rad/s] */
  tAccPTP: 0.35, accCP: 2.0, velOri: 180 * D, cptpMax: 90 * D, singPrag: 0.03,
  hov0: 10, pov0: 100, koraciOv: [1, 3, 10, 30, 50, 75, 100],
  ploca: { x0: -0.42, x1: 0.98, y0: -0.82, y1: 0.82, deb: 0.03, visina: 0.90 },
  spremiste: { x: 0.30, y: 0.52 },
  naprava: { x: 0.62, y: -0.06, z: 0.04, A: 15, a: 0.20, b: 0.14 },
  kutija: { x: 0.36, y: -0.50, A: -90, a: 0.40, b: 0.30, h: 0.13, dno: 0.008, gnijezda: [[-0.09, -0.07], [0.09, -0.07], [-0.09, 0.07], [0.09, 0.07]] },
  cijevi: { x: 0.74, y: 0.30, razmak: 0.035, broj: 3, visina: 0.26, gnijezdoDx: -0.045, podnozje: 0.02, puno: 6 },
  siljak: { x: 0.50, y: 0.24, z: 0.12 },
  pcb: { a: 0.100, b: 0.055, h: 0.0016 },
  kuciste: { a: 0.110, b: 0.060, h: 0.010, dno: 0.004 },
  osigurac: { r: 0.0026, h: 0.016, hvat: 0.6 },
  utori: [[-0.028, 0.014], [0.028, 0.014]],
  tol: 0.004, tolKut: 8 * D, tDobava: 0.6, tPrsti: 0.25,
  io: { vakuum: 1, prihvat: 2, izmjenjivac: 3, kutija: 1, vakuumOk: 2, uHvataljci: 3, osigurac: 4 },
  ioNazivi: {
    out: { 1: 'vakuum (TOOL1)', 2: 'prihvatnica zatvori (TOOL2–TOOL4)', 3: 'izmjenjivač otključaj' },
    in: { 1: 'kutija PCB na mjestu', 2: 'vakuum postignut (PCB na prihvatnici)', 3: 'dio u prihvatnici', 4: 'osigurač u gnijezdu cijevi 1' }
  }
};
const T1V = KRL.t1MaxBrzina;
const HOME = POLOZAJI.home.slice();
const N_JOG = Math.max(6, PRIVJESAK.tipkeGibanja || 6);
const NACINI = KRL.nacini.map((n) => n.kod);
const HF = MJERE.izmjenjivac.visinaFiksni;
const ALAT_OSIG = Math.max(1, PRIHVATNICE.findIndex((p) => /osigura/i.test(p.naziv)) + 1);     /* prihvatnica za osigurače (iz podataka) */
const ALAT_PCB = Math.max(1, PRIHVATNICE.findIndex((p) => p.vrsta === 'vakuum') + 1);           /* vakuumska prihvatnica za PCB */
const kz = (v, d) => kr(v, d);
const POJEDNOSTAVLJENJA = [
  'Zaslon privjeska je naš i pokazuje samo ono što treba za vježbu (stvarni položaj, KRL program s točkama, alati i baze, ulazi i izlazi, zaustavljanja); nije preslika smartHMI-ja. Nema korisničkih skupina ni lozinki, a ključna sklopka odmah otvara odabir načina rada.',
  'Uređaj za omogućavanje na stvarnom privjesku drži se cijelo vrijeme gibanja; ovdje se postavlja klikom (pušten / srednji / do kraja). Tipka Start se u T1 i T2 drži (miš ili tipka Enter). Start unatrag, 6D miš i inkrementalno ručno gibanje nisu izvedeni.',
  'Ručno gibanje po osima pri HOV 100 % ide ' + kz(SIM.jogOsi * 100, 0) + ' % najveće brzine osi, kartezijsko ' + kz(SIM.jogKart * 1000, 0) + ' mm/s i ' + kz(SIM.jogOri / D, 0) + ' °/s (naše pretpostavke); u T1 se TCP i prirubnica ograničavaju na ' + kz(T1V * 1000, 0) + ' mm/s.',
  'Dinamika se ne računa: PTP ima trapezni profil s ubrzanjem do pune brzine u ' + kz(SIM.tAccPTP, 2) + ' s, LIN i CIRC ubrzanje ' + kz(SIM.accCP, 1) + ' m/s² i brzinu orijentacije ' + kz(SIM.velOri / D, 0) + ' °/s (pretpostavke). Najveće brzine osi su iz podataka za odabranu inačicu.',
  'Zaglađivanje se izvodi kao parabolični prijelaz između dva gibanja iste vrste (PTP–PTP ili LIN/CIRC–LIN/CIRC): C_DIS u milimetrima, C_PTP kao postotak od ' + kz(SIM.cptpMax / D, 0) + '° vodeće osi; C_VEL i C_ORI simulator tumači kao C_DIS. Prijelaz PTP–LIN se ne zaglađuje (točka se dostiže točno). U MSTEP se ne zaglađuje.',
  'Pomak do BCO uvijek je PTP do cilja naredbe na kojoj stoji pokazivač i izvodi se samo u T1 i T2. Ako je robot nakon zaustavljanja ručno pomaknut, sljedeći Start ga vraća PTP gibanjem na mjesto gdje je stao.',
  'Kategorije zaustavljanja: STOP 2 i STOP 1 koče po putanji usporenjem 1,6 odnosno 2,2 puta većim od ubrzanja gibanja (pretpostavka); STOP 0 koči svaku os zasebno usporenjem izračunatim iz podataka o zaustavljanju osi A1–A3 (A4–A6 kao A3), pa robot može malo izaći s putanje. Promjena načina rada isključuje pogone. U AUT pogoni se uključuju dodirom „I” u statusnoj traci; u AUT EXT program pokreće gumb nadređenog PLC-a u kartici I/O. Zatvorena vrata ćelije se ne provjeravaju.',
  'Ćelija je pojednostavljena: ploča ' + kz((SIM.ploca.x1 - SIM.ploca.x0) * 1000, 0) + ' × ' + kz((SIM.ploca.y1 - SIM.ploca.y0) * 1000, 0) + ' mm u visini podnožja robota, stezna naprava (BASE[1]), kutija PCB (BASE[2]), tri cijevi za osigurače s gnijezdom uz prvu cijev, šiljak za mjerenje TCP-a i spremište alata iz modela robota. Položaji su naša procjena po uzoru na raspored RASS stanice; WORLD = $ROBROOT (podnožje robota).',
  'Ulazi i izlazi su naše mapiranje: $OUT[1] vakuum, $OUT[2] zatvaranje paralelne prihvatnice, $OUT[3] otključavanje izmjenjivača; $IN[1] kutija na mjestu, $IN[2] vakuum, $IN[3] dio u prihvatnici, $IN[4] osigurač u gnijezdu. Stvarno mapiranje u stanici je u konfiguraciji upravljača i PLC-a.',
  'Hvatanje se ne računa silama: PCB se prihvati kad je vakuumska sisaljka unutar ' + kz(SIM.tol * 1000, 0) + ' mm od sredine pločice, osigurač kad su prsti unutar ' + kz(SIM.tol * 1000, 0) + ' mm, a dio „sjedne” u kućište ili pločicu ako ga robot pusti unutar iste tolerancije. Sudari se ne provjeravaju.',
  'KRL je podskup: DEF/END, INI, DECL i dodjela točaka (E6POS, POS, FRAME, E6AXIS, AXIS), PTP/LIN/CIRC s točkama ili agregatima (i oblik s Vel=, Tool[ ], Base[ ] kao u obrascima), C_PTP, C_DIS, CONT, $VEL.CP, $VEL_AXIS[ ], $ACC.CP, $APO.CDIS, $APO.CPTP, $TOOL, $BASE, $OUT[ ], WAIT SEC, WAIT FOR $IN[ ], OUT … State=, HALT. Varijable, petlje, uvjeti i potprogrami nisu izvedeni.',
  'Mjerenje TCP-a metodom 4 točke računa samo položaj (X, Y, Z) najmanjim kvadratima; orijentacija alata ostaje A = B = C = 0. Gumb „Dovedi” postavlja robota u predloženu orijentaciju uz šiljak — na stvarnom robotu to se radi ručnim vođenjem.'
];

/* ================================================================== */
/* 2. Nizovi i koraci: [uputa, pomoć, ključ provjere]                  */
/* ================================================================== */
const NIZOVI = [
  { id: 'ukljucivanje', grupa: 'Osnove', naziv: 'Uključivanje, načini rada i potvrde', opis: 'gljiva E-STOP, potvrda poruka, ključna sklopka i načini T1, T2, AUT, uređaj za omogućavanje i pogoni.', koraci: [
    ['Upravljač je uključen, a gljiva E-STOP na privjesku je pritisnuta (poruka u prozoru poruka). Otpusti gljivu — klikni je.', 'Gljiva se na stvarnom privjesku zaključava i otpušta zakretanjem. Dok je pritisnuta, pogoni se ne mogu uključiti.', 'estopOtpusten'],
    ['Potvrdi poruke gumbom „Potvrdi sve” u prozoru poruka.', 'Poruke za potvrdu (crveni znak) ostaju dok ih korisnik ne potvrdi, a potvrda uspije tek kad uzrok nestane. Poruke stanja (žuti znak) nestaju same kad nestane uzrok.', 'potvrdeno'],
    ['Okreni ključnu sklopku (gumb s ključem lijevo gore) i odaberi način T1.', 'Ključ otvara odabir načina rada. T1 je ručni rad smanjenom brzinom — za učenje točaka i ispitivanje programa.', 'nacinT1'],
    ['Pritisni uređaj za omogućavanje u srednji položaj (straga, „srednji”). Pogoni se uključe — „I” u statusnoj traci postane zeleno.', 'Uređaj za omogućavanje ima tri položaja: pušten, srednji (rad) i do kraja (panika). U T1 i T2 robot se giba samo u srednjem položaju.', 'pogoniOn'],
    ['Pritisni uređaj do kraja („do kraja”) — kao refleks u opasnosti. Pogledaj poruku i statusnu traku.', 'Položaj panike pokreće sigurnosni STOP 1: kočenje po putanji pa isključenje pogona.', 'panika'],
    ['Uključi pogone ponovno: pusti uređaj („pušten”) i ponovno ga pritisni u srednji položaj.', 'Iz položaja panike uređaj se ne može vratiti izravno u rad — mora se najprije pustiti.', 'pogoniPonovo'],
    ['Prebaci na T2 i pokušaj ručno gibanje tipkom +A1 (desno).', 'U T2 program ide programiranom brzinom, a ručno gibanje nije moguće — pogledaj poruku.', 'jogT2'],
    ['Prebaci na AUT i dodirni „I” u statusnoj traci — pogoni se uključuju bez uređaja za omogućavanje.', 'U automatskom radu uređaj za omogućavanje nema funkciju; zato je robot u zatvorenoj ćeliji. U simulatoru se pogoni u AUT uključuju dodirom „I”.', 'pogoniAUT'],
    ['Vrati način T1.', 'Ručno vođenje i učenje točaka rade se u T1.', 'nacinT1'],
    ['Kraj niza „Uključivanje”. Odaberi sljedeći niz.', 'Klikni „Slobodan rad” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'osi', grupa: 'Ručno vođenje', naziv: 'Ručno vođenje po osima', opis: 'odabir sustava Osi, override ručnog gibanja, softverski krajnji prekidači i ograničenje 250 mm/s u T1.', koraci: [
    ['Pritisni uređaj za omogućavanje u srednji položaj.', 'Bez toga se pogoni ne uključuju i tipke za gibanje ne rade.', 'pogoniOn'],
    ['Odaberi koordinatni sustav „Osi” (donja traka zaslona). Natpisi uz tipke za gibanje postanu A1…A6.', 'U sustavu Osi svaka tipka giba jednu os; ostale stoje.', 'ksOsi'],
    ['Postavi override ručnog gibanja (HOV) na 30 % tipkama HOV + i −.', 'HOV skalira brzinu ručnog gibanja; koraci su 1, 3, 10, 30, 50, 75 i 100 %.', 'hov30'],
    ['Drži +A1 dok A1 ne bude 45° (±2°). Kut prati u kartici „Položaj”.', 'Pozitivni A1 je u smjeru kazaljke sata gledano odozgo — alat ide prema −Y.', 'a1_45'],
    ['Postavi HOV na 100 % i drži +A5 dok os ne zaustavi softverski krajnji prekidač.', 'Opseg A5 je ' + OSI[4].minDeg + '° … +' + OSI[4].maxDeg + '°. Na granici robot staje i javlja poruku; gibanje u suprotnom smjeru je dopušteno.', 'limitA5'],
    ['Odmakni A5 od granice (−A5) za barem 5° i potvrdi poruku softverskog prekidača.', 'Poruka se može potvrditi tek kad os više nije na granici — uzrok mora nestati.', 'a5odmak'],
    ['Uz HOV 100 % drži −A1 barem sekundu. Gledaj brzinu TCP-a u kartici „Položaj”: u T1 ne prelazi 250 mm/s.', 'U T1 upravljač ograničava brzinu TCP-a i prirubnice na 250 mm/s; ako bi se prekoračila, slijedi sigurnosni STOP 0. Simulator usporava os toliko da granica ostane poštovana.', 't1limit'],
    ['Kraj niza „Ručno vođenje po osima”.', 'Odaberi sljedeći niz.', 'kraj']] },
  { id: 'kartezijski', grupa: 'Ručno vođenje', naziv: 'Ručno vođenje u WORLD, BASE i TOOL', opis: 'isti gumb, različit smjer: gibanje TCP-a u sustavima WORLD, TOOL i BASE te zakretanje A, B, C oko TCP-a.', koraci: [
    ['Odaberi koordinatni sustav WORLD.', 'WORLD je nepomičan sustav ćelije; u simulatoru je u podnožju robota (X naprijed, Y lijevo, Z gore).', 'ksWorld'],
    ['Pomakni TCP 50 mm gore (+Z), bez pomaka u X i Y (±3 mm).', 'Pri kartezijskom gibanju sve osi rade zajedno: upravljač u svakom taktu računa inverznu kinematiku.', 'w_z50'],
    ['Odaberi sustav TOOL.', 'Osi sustava TOOL vezane su uz alat: Z alata ide iz prirubnice prema vrhu prihvatnice.', 'ksTool'],
    ['Pomakni +Z u sustavu TOOL 30 mm. Gledaj kamo ide TCP.', 'Alat gleda prema dolje, pa +Z alata znači prema stolu — isti gumb, suprotan smjer nego u WORLD.', 'tool_z30'],
    ['Odaberi sustav BASE i bazu BASE[1] (stezna naprava) u kartici „Alat/Baza” ili statusnoj traci.', 'BASE[1] je zakrenut za A = ' + SIM.naprava.A + '° u odnosu na WORLD; pogledaj okvir na napravi u 3D prikazu.', 'ksBase1'],
    ['Pomakni +X u BASE[1] 40 mm. Robot ide koso u odnosu na WORLD.', 'Gibanje u bazi naprave ide uzduž njezinih bridova, pa se točke uče neovisno o tome kako je naprava postavljena.', 'base_x40'],
    ['Zakreni oko A (Z osi baze) za barem 20°. TCP ostaje na mjestu.', 'A je zakret oko Z, B oko Y, C oko X. Zakreće se oko TCP-a odabranog alata.', 'rotA20'],
    ['Kraj niza „Ručno vođenje u WORLD, BASE i TOOL”.', 'Odaberi sljedeći niz.', 'kraj']] },
  { id: 'alati', grupa: 'Ručno vođenje', naziv: 'Alati i baze: TOOL1–TOOL4 i mjerenje TCP-a', opis: 'TOOL_DATA i BASE_DATA, zakretanje oko prirubnice i oko TCP-a, mjerenje TCP-a metodom 4 točke.', koraci: [
    ['Otvori karticu „Alat/Baza”. Na prirubnici je TOOL4, čiji TCP još nije izmjeren; odabran je TOOL[0] (prirubnica).', 'TOOL_DATA[1…4] su TCP-ovi prihvatnica u koordinatnom sustavu prirubnice (FLANGE). TOOL[0] je sama prirubnica.', 'tabAlati'],
    ['U sustavu TOOL (s TOOL[0]) zakreni oko A ili B za barem 15°. Vrh prihvatnice opisuje luk — zakreće se oko prirubnice.', 'Zato bez točnog TCP-a robot ne može zakretati alat oko njegova vrha.', 'rotFlange'],
    ['U kartici „Alat/Baza” pokreni mjerenje „XYZ 4 točke” za TOOL[4].', 'Vrh alata dovodi se na isti nepomični šiljak iz četiri različite orijentacije; iz četiri položaja prirubnice računa se položaj vrha u FLANGE-u.', 'mjerStart'],
    ['Točka 1: dovedi vrh alata na šiljak (ručno ili gumbom „Dovedi 1”) i spremi je gumbom „Touchup 1”.', 'U prikazu piše koliko je vrh udaljen od šiljka. Prihvaća se do ' + kz(SIM.tol * 1000, 0) + ' mm.', 'mt1'],
    ['Točka 2: druga orijentacija — dovedi i spremi („Touchup 2”).', 'Orijentacije moraju biti dovoljno različite (barem 15° jedna od druge), inače je račun nestabilan.', 'mt2'],
    ['Točka 3: dovedi i spremi.', 'Što su orijentacije različitije, to je rezultat točniji.', 'mt3'],
    ['Točka 4: dovedi i spremi.', 'Nakon četvrte točke može se računati.', 'mt4'],
    ['Klikni „Izračunaj” i zatim „Spremi u TOOL_DATA[4]”.', 'Za svaku točku vrijedi R_i · t + p_i = P (R_i, p_i — prirubnica, t — TCP u FLANGE-u, P — šiljak). 12 jednadžbi, 6 nepoznanica: rješenje najmanjim kvadratima, a ostatak je pogreška mjerenja.', 'mjerSpremi'],
    ['Odaberi TOOL[4] i zakreni u sustavu TOOL za barem 15° — vrh sad ostaje na šiljku.', 'S izmjerenim TCP-om upravljač zakreće alat oko njegova vrha.', 'rotTcp'],
    ['Kraj niza „Alati i baze”.', 'Odaberi sljedeći niz.', 'kraj']] },
  { id: 'program', grupa: 'KRL', naziv: 'Prvi program: PTP HOME, PTP, LIN, BCO', opis: 'umetanje gibanja s učenjem točaka, odabir programa, pomak do BCO, izvođenje u T1 i način MSTEP.', koraci: [
    ['Otvori karticu „Program”. Pripremljen je kostur programa s dva PTP HOME.', 'Program u KRL-u počinje s DEF, završava s END; INI postavlja zadane vrijednosti. Gibanja se upisuju između dvaju PTP HOME.', 'tabProgram'],
    ['Postavi kursor u redak s prvim PTP HOME i klikni „+PTP”. Nastaje redak s točkom P1 koja sprema trenutni položaj robota.', 'Umetanje gibanja odmah sprema točku (u .dat datoteci, desno). Točka je E6POS: X, Y, Z, A, B, C u odabranoj bazi s odabranim alatom, uz Status i Turn.', 'umetnutPTP'],
    ['Odmakni robota ručno (npr. WORLD) barem 100 mm, postavi kursor u redak s P1 i klikni „+LIN”.', 'LIN vodi TCP po pravcu od P1 do P2.', 'umetnutLIN'],
    ['Odaberi program gumbom „Odaberi”. Pokazivač bloka stane na početak, a „R” u statusnoj traci požuti.', 'Odabrani program se ne može uređivati dok se izvodi; uređivanje odabranog programa ga odznačuje.', 'odabran'],
    ['Drži Start (uz uređaj u srednjem položaju). Robot ide PTP do HOME i javi „Postignut BCO”.', 'Pomak do BCO dovodi robota na programiranu putanju; zato je prvo gibanje PTP (obično PTP HOME). Nakon toga Start se pušta i ponovno pritišće.', 'bco'],
    ['Drži Start dok program ne dođe do END.', 'U T1 Start se drži cijelo vrijeme; pušten Start je STOP 2 — pritisni ga ponovno i robot nastavlja po putanji.', 'krajProg'],
    ['Prebaci izvođenje na MSTEP (gumb GO/MSTEP), klikni „Reset” i izvedi program: robot staje nakon svakog gibanja.', 'GO izvodi program bez stajanja, MSTEP staje nakon svake naredbe gibanja. Između koraka pusti i ponovno pritisni Start.', 'mstep'],
    ['Kraj niza „Prvi program”.', 'Odaberi sljedeći niz.', 'kraj']] },
  { id: 'circ', grupa: 'KRL', naziv: 'CIRC i zaglađivanje', opis: 'kružni luk kroz pomoćnu točku, zaglađivanje C_DIS i $APO.CDIS, WAIT koji zaustavlja pretrčavanje.', koraci: [
    ['Pripremljen je program „Luk” s naučenim točkama. Odaberi ga.', 'CIRC P3, P4 vodi TCP po luku kroz pomoćnu točku P3 do ciljne točke P4.', 'odabran'],
    ['Izvedi program do kraja (BCO pa Start). Zeleni luk u 3D prikazu je CIRC.', 'Robot u svakoj točki staje — sve točke su točne (bez zaglađivanja).', 'krajCirc'],
    ['U retku „LIN P2 …” dodaj C_DIS iza P2 (npr. LIN P2 C_DIS Vel=0.2 m/s …) i ponovno odaberi program.', 'C_DIS: zaglađivanje počinje kad je TCP bliže cilju od $APO.CDIS (u programu 20 mm). Umjesto C_DIS može se napisati i CONT.', 'cdisOdabran'],
    ['Izvedi program ponovno. Prijelaz LIN–CIRC u P2 je zaobljen (ljubičasto) i robot ne staje.', 'Kad je točka zaglađena, robot je ne dostiže točno — prolazi pored nje.', 'blend'],
    ['Promijeni $APO.CDIS = 20 u $APO.CDIS = 50, odaberi i izvedi program. Luk zaglađivanja je veći.', 'Veća udaljenost zaglađivanja znači brži i mekši prijelaz, ali veće odstupanje od točke.', 'blend50'],
    ['Iza retka s LIN P2 C_DIS umetni redak WAIT SEC 0.5, odaberi i izvedi program. Pogledaj poruku.', 'Pretrčavanje (advance run) mora unaprijed znati sljedeće gibanje; WAIT ga zaustavlja, pa zaglađivanje nije moguće i robot staje u P2.', 'apoNemoguce'],
    ['Kraj niza „CIRC i zaglađivanje”.', 'Odaberi sljedeći niz.', 'kraj']] },
  { id: 'singularnosti', grupa: 'KRL', naziv: 'Singularnosti, Status i Turn', opis: 'singularnost zapešća (A5 = 0°), ispružena ruka (A3 ≈ 4,76°) i bitovi Statusa.', koraci: [
    ['Otvori karticu „Položaj”. Desno su brzine osi i oznaka blizine singularnosti.', 'Singularnost je položaj u kojem Jacobijeva matrica gubi rang: neki smjer gibanja TCP-a traži beskonačnu brzinu osi.', 'tabPolozaj'],
    ['U sustavu Osi dovedi A5 na 0° (±1°). Pogledaj poruku: osi A4 i A6 su poravnate.', 'Kad je A5 = 0°, osi A4 i A6 leže na istom pravcu — postoji beskonačno mnogo kombinacija A4 i A6 za istu orijentaciju.', 'a5nula'],
    ['Odaberi WORLD i drži +Y. Gledaj brzine osi A4 i A6.', 'Da bi orijentacija alata ostala ista, A4 i A6 trebali bi se vrtjeti golemom brzinom; upravljač usporava i zaustavlja gibanje.', 'singZapesce'],
    ['U sustavu Osi dovedi A3 na ' + kz(KUT_ISPRUZENE / D, 2) + '° (±1°) — ispružena ruka.', 'Zbog pomaka 35 mm između A3 i ruke, ruka je ispružena pri A3 ≈ ' + kz(KUT_ISPRUZENE / D, 2) + '°, a ne pri 0°.', 'ispruzena'],
    ['Prijeđi s A3 preko te granice i gledaj Status u kartici „Položaj”: bit 1 (vrijednost 2) se mijenja.', 'Status bira jedno od do osam rješenja inverzne kinematike za isti položaj TCP-a; Turn bira predznak kutova osi.', 'statusBit'],
    ['Kraj niza „Singularnosti”.', 'Odaberi sljedeći niz.', 'kraj']] },
  { id: 'stanica', grupa: 'Stanica', naziv: 'Zadatak iz stanice: PCB i osigurači', opis: 'program iz montažne stanice: TOOL' + ALAT_PCB + ' uzima PCB iz kutije i stavlja ga u kućište na napravi, izmjena alata, TOOL' + ALAT_OSIG + ' umeće dva osigurača, alat natrag, PTP HOME.', koraci: [
    ['U kartici „Program” je program „Montaza” s naučenim točkama. Pregledaj ga i odaberi.', 'Izmjena alata: $OUT[3] otključava izmjenjivač. Alat se uzima odozgo i izvlači iz vilice prema robotu, a odlaže obrnutim redom.', 'odabran'],
    ['U T1 drži Start dok se ne javi „Postignut BCO”.', 'Pomak do BCO radi se u ručnom načinu, smanjenom brzinom.', 'bco'],
    ['Prebaci na AUT.', 'U AUT program ide punom programiranom brzinom (POV); stvarna stanica radi u AUT EXT, kad program pokreće PLC.', 'nacinAUT'],
    ['Uključi pogone („I” u statusnoj traci) i pritisni Start jednom.', 'U AUT se Start ne drži.', 'startAUT'],
    ['Pričekaj da PCB bude u kućištu na napravi.', 'Vakuum se uključuje izlazom $OUT[1]; WAIT FOR $IN[2] čeka da vakuum bude postignut.', 'pcbUNapravi'],
    ['Pričekaj kraj programa: dva osigurača u pločici, alati u spremištu, robot u HOME.', 'Osigurači se vade iz gnijezda uz cijev; nakon vađenja cijev dobavi sljedeći.', 'montazaGotova'],
    ['Kraj niza „Zadatak iz stanice”.', 'Odaberi sljedeći niz.', 'kraj']] },
  { id: 'sigurnost', grupa: 'Stanica', naziv: 'Sigurnost: E-STOP, potvrda, STOP 0/1/2', opis: 'pušten Start (STOP 2), gljiva E-STOP i panika (sigurnosni STOP 1), nestanak napajanja (STOP 0) i nastavak programa.', koraci: [
    ['Program „Krug” je odabran. Drži Start: najprije BCO, pa ponovno Start. Tijekom gibanja pusti Start.', 'Pušten Start u T1/T2 je STOP 2: robot koči po putanji, pogoni ostaju uključeni, program se nastavlja ponovnim Startom.', 'stop2'],
    ['Drži Start i tijekom gibanja pritisni gljivu E-STOP.', 'E-STOP je sigurnosni STOP 1: kočenje po putanji, zatim isključenje pogona.', 'estopGib'],
    ['Otpusti gljivu, potvrdi poruke, pusti uređaj za omogućavanje i vrati ga u srednji položaj.', 'Bez potvrde pogoni se ne mogu uključiti.', 'estopPotvrda'],
    ['Drži Start i tijekom gibanja pritisni uređaj za omogućavanje do kraja (panika).', 'Panika je također sigurnosni STOP 1.', 'panikaGib'],
    ['Pusti uređaj i vrati ga u srednji položaj.', 'Pogoni se ponovno uključuju.', 'pogoniOn'],
    ['Drži Start i tijekom gibanja u kartici „Sigurnost” klikni „Nestanak napajanja”.', 'STOP 0: pogoni se odmah isključuju i kočnice padaju; svaka os staje sama, pa robot može malo izaći s putanje.', 'stop0'],
    ['Potvrdi poruku, uključi pogone i drži Start: robot se najprije vraća na putanju (BCO).', 'Nakon STOP 0 robot nije na programiranoj putanji, pa slijedi pomak do BCO.', 'oporavak'],
    ['Kraj niza „Sigurnost”. Prošao si sve nizove!', 'Klikni „Slobodan rad”.', 'kraj']] }
];

/* ================================================================== */
/* 3. Ćelija: okviri baza, točke                                       */
/* ================================================================== */
const okv = (f) => okvir(f.x, f.y, f.z, f.A || 0, f.B || 0, f.C || 0);
const BASE0 = [
  { x: 0, y: 0, z: 0, A: 0, B: 0, C: 0 },
  { x: SIM.naprava.x, y: SIM.naprava.y, z: SIM.naprava.z, A: SIM.naprava.A * D, B: 0, C: 0 },
  { x: SIM.kutija.x, y: SIM.kutija.y, z: 0, A: SIM.kutija.A * D, B: 0, C: 0 }
];
const NAZ_BAZE = ['WORLD ($NULLFRAME)', 'stezna naprava', 'kutija PCB'];
const NULA = { x: 0, y: 0, z: 0, A: 0, B: 0, C: 0 };
const ALAT_PRAVI = [null, ...PRIHVATNICE.map((p) => okv(p.tcp))];    /* stvarni TCP prihvatnica (geometrija modela) */
const DOLJE = { A: 0, B: 0, C: PI };                                  /* alat okomito prema dolje (Z alata = −Z baze) */

/* ================================================================== */
/* 4. Stanje                                                          */
/* ================================================================== */
const st = { ubrzanje: 1 };
let vrijemeSim = 0, porId = 1;
function pocetnoStanje() {
  Object.assign(st, {
    q: POLOZAJI.prirubnicaDolje.slice(), qV: [0, 0, 0, 0, 0, 0], vTcp: 0,
    nacin: 'T1', pogoni: true, estop: false, omog: 'srednji', omogArm: true, kocenje0: null,
    hov: 30, pov: SIM.pov0, ks: 'world', tool: 1, base: 0, runMode: 'GO',
    toolData: [{ ...NULA }, ...PRIHVATNICE.map((p) => ({ ...p.tcp }))], baseData: BASE0.map((b) => ({ ...b })),
    alatNaRobotu: Math.min(1, PRIHVATNICE.length), prsti: 1,
    out: { 1: false, 2: false, 3: false, 4: false }, inp: { 1: true, 2: false, 3: false, 4: true },
    poruke: [], tab: 'polozaj', porOtvorene: false, odabirNacina: false, jog: null, auto: null, startDrzi: false,
    prog: { tekst: '', ime: '' }, tocke: {}, iz: null, ed: { greska: null }, zadnjiStop: null,
    mjer: { aktivno: false, alat: 4, tocke: [null, null, null, null], rez: null },
    t1Ogr: 0, singT: 0, prljavo: true, ekranPrljav: true, ref: null
  });
  resetDijelova();
}

/* ================================================================== */
/* 5. Kinematika s alatom i bazom                                      */
/* ================================================================== */
const toolT = (i = st.tool) => (i ? okv(st.toolData[i]) : KIN.jedinicna());
const baseT = (j = st.base) => (j ? okv(st.baseData[j]) : KIN.jedinicna());
const tcpRob = (q, i = st.tool) => mul(fk(q).T, toolT(i));
const tcpBase = (q, i = st.tool, j = st.base) => mul(inv(baseT(j)), tcpRob(q, i));
const praviTcp = (q) => (st.alatNaRobotu ? mul(fk(q).T, ALAT_PRAVI[st.alatNaRobotu]) : fk(q).T);
function ikTcp(T, q0, i = st.tool, opc = {}) { return KIN.ik(mul(T, inv(toolT(i))), q0, opc); }
function rotOs(os, th) {   /* rotacija oko jedinične osi (Rodrigues), 4 × 4 */
  const [x, y, z] = os, c = Math.cos(th), s = Math.sin(th), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0, t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0, t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0, 0, 0, 0, 1];
}
function kutRot(A, B) {   /* kut između orijentacija dviju matrica */
  let tr = 0; for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) tr += A[4 * k + i] * B[4 * k + i];
  return Math.acos(clamp((tr - 1) / 2, -1, 1));
}
const naGranici = (q) => { for (let i = 0; i < 6; i++) { if (q[i] > OSI[i].max + 1e-9) return { os: i, smjer: 1 }; if (q[i] < OSI[i].min - 1e-9) return { os: i, smjer: -1 }; } return null; };
function opisSing(tip) { return { zapesce: 'singularnost zapešća (A5 ≈ 0°, osi A4 i A6 poravnate)', ispruzena: 'singularnost ispružene ruke (A3 ≈ ' + kz(KUT_ISPRUZENE / D, 2) + '°)', iznadGlave: 'singularnost iznad glave (točka zapešća na osi A1)' }[tip] || 'singularnost'; }
const rucni = () => st.nacin === 'T1' || st.nacin === 'T2';

/* ================================================================== */
/* 6. Poruke (naše riječi, nalik porukama upravljača)                 */
/* ================================================================== */
function poruka(tip, tekst, o = {}) {
  if (o.kljuc) { const p0 = st.poruke.find((p) => p.kljuc === o.kljuc); if (p0) { if (p0.tekst !== tekst || p0.tip !== tip) { p0.tekst = tekst; p0.tip = tip; st.ekranPrljav = true; } return p0; } }
  const p = { id: porId++, tip, tekst, kljuc: o.kljuc || null, blokira: !!o.blokira, moze: o.moze || null, t: vrijemeSim };
  st.poruke.unshift(p); if (st.poruke.length > 24) st.poruke.pop();
  st.ekranPrljav = true; return p;
}
function ukloni(kljuc) { const n = st.poruke.length; st.poruke = st.poruke.filter((p) => p.kljuc !== kljuc); if (n !== st.poruke.length) st.ekranPrljav = true; }
const blokirano = () => st.poruke.some((p) => p.blokira);
function potvrdi(id) {
  const p = st.poruke.find((x) => x.id === id); if (!p || p.tip === 'stanje') return;
  if (p.moze && !p.moze()) { napomena('Poruku nije moguće potvrditi dok uzrok postoji.'); return; }
  st.poruke = st.poruke.filter((x) => x !== p); st.ekranPrljav = true; azurirajPogone(); dogadaj('potvrda');
}
function potvrdiSve() {
  const ostaju = st.poruke.filter((p) => p.tip === 'stanje' || (p.moze && !p.moze()));
  if (ostaju.some((p) => p.tip !== 'stanje')) napomena('Neke poruke ne mogu se potvrditi dok uzrok postoji (npr. gljiva je još pritisnuta).');
  st.poruke = ostaju; st.ekranPrljav = true; azurirajPogone(); dogadaj('potvrda');
}
function napomena(t) { $('poruka').textContent = t; }

/* ================================================================== */
/* 7. Sigurnost: pogoni, E-STOP, uređaj za omogućavanje, zaustavljanja */
/* ================================================================== */
const gibaSe = () => !!(st.jog || st.auto || (st.iz && st.iz.gib && !st.iz.pauza));
function azurirajPogone() {
  if (st.estop || st.kocenje0 || blokirano()) return;
  if (rucni() && st.omog === 'srednji' && st.omogArm && !st.pogoni) { st.pogoni = true; ukloni('omogInfo'); st.ekranPrljav = true; dogadaj('pogoni'); }
}
function pogoniOff() { if (st.pogoni) { st.pogoni = false; st.ekranPrljav = true; dogadaj('pogoniOff'); } }
function zaustavi(kat, uzrok) {
  const giba = gibaSe();
  st.zadnjiStop = { kat, uzrok, giba, t: vrijemeSim };
  st.jog = null; st.auto = null;
  const iz = st.iz;
  if (kat === 0) {
    st.kocenje0 = { v: st.qV.slice() }; pogoniOff();
    if (iz && !iz.pauza) { iz.pauza = true; iz.zaustavljanje = null; iz.vani = true; iz.qPrekid = st.q.slice(); if (iz.gib) iz.gib.v = 0; }
  } else if (iz && !iz.pauza) { iz.zaustavljanje = kat; }
  else if (kat === 1) pogoniOff();
  st.ekranPrljav = true;
  dogadaj('stop', { kat, uzrok, giba });
}
function gljiva() {
  if (!st.estop) {
    st.estop = true; zaustavi(1, 'estop'); st.omogArm = false;
    poruka('stanje', 'Pritisnuta tipka za isključenje u nuždi (smartPAD)', { kljuc: 'estop' });
    if (!(st.iz && st.iz.zaustavljanje)) pogoniOff();
    dogadaj('estop');
  } else {
    st.estop = false; ukloni('estop');
    poruka('potvrda', 'Potrebna potvrda: isključenje u nuždi', { kljuc: 'estopPotvrda', blokira: true, moze: () => !st.estop });
    dogadaj('estopOtpusten');
  }
  $('gljiva').setAttribute('aria-pressed', String(st.estop));
  st.ekranPrljav = true;
}
function postaviOmog(v) {
  if (!['pusten', 'srednji', 'panika'].includes(v) || v === st.omog) return;
  const prije = st.omog; st.omog = v;
  if (v === 'pusten') {
    st.omogArm = true; ukloni('panika'); ukloni('omogInfo');
    if (prije === 'srednji' && rucni() && (gibaSe() || (st.iz && !st.iz.pauza))) { zaustavi(2, 'omog'); poruka('info', 'Sigurnosni STOP 2: pušten uređaj za omogućavanje', { kljuc: 'stop2omog' }); }
  } else if (v === 'panika') {
    st.omogArm = false;
    if (rucni()) { zaustavi(1, 'panika'); if (!(st.iz && st.iz.zaustavljanje)) pogoniOff(); }
    poruka('stanje', 'Uređaj za omogućavanje pritisnut do kraja (panika) — sigurnosni STOP 1', { kljuc: 'panika' });
  } else if (v === 'srednji') {
    if (prije === 'panika') { st.omogArm = false; ukloni('panika'); poruka('info', 'Iz položaja panike uređaj se mora najprije pustiti, pa ponovno pritisnuti u srednji položaj.', { kljuc: 'omogInfo' }); }
    azurirajPogone();
  }
  osvjeziStraga(); st.ekranPrljav = true; dogadaj('omog', v);
}
function postaviNacin(n) {
  if (!NACINI.includes(n)) return;
  st.odabirNacina = false;
  if (n === st.nacin) { st.ekranPrljav = true; return; }
  if (gibaSe() || (st.iz && !st.iz.pauza)) zaustavi(2, 'nacin');
  st.nacin = n; pogoniOff();
  if (rucni()) azurirajPogone();
  poruka('info', 'Način rada: ' + n + ' — ' + (KRL.nacini.find((x) => x.kod === n) || {}).naziv, { kljuc: 'nacin' });
  $('kljuc-nacin').textContent = n;
  st.ekranPrljav = true; dogadaj('nacin', n);
}
function ispitajStop0() {
  zaustavi(0, 'napajanje');
  poruka('potvrda', 'Nestanak napajanja pogona — STOP 0: kočnice su zakočile', { kljuc: 'stop0', blokira: true, moze: () => !st.kocenje0 });
}
function korakKocenja0(dt) {
  const k = st.kocenje0; if (!k) return;
  let jos = false;
  const qn = st.q.slice();
  for (let i = 0; i < 6; i++) {
    const z = (OSI[i].zaustavljanje || OSI[2].zaustavljanje), a = OSI[i].vMaxRad / Math.max(0.05, z.vrijeme);
    const v = k.v[i], dv = a * dt;
    k.v[i] = Math.abs(v) <= dv ? 0 : v - Math.sign(v) * dv;
    qn[i] = clamp(qn[i] + (v + k.v[i]) / 2 * dt, OSI[i].min, OSI[i].max);
    if (k.v[i] !== 0) jos = true;
  }
  postaviQ(qn, 'jog');
  if (!jos) { st.kocenje0 = null; st.ekranPrljav = true; }
}

/* ================================================================== */
/* 8. Ručno gibanje                                                   */
/* ================================================================== */
function zabranaJoga() {
  if (st.estop) return 'Pritisnuta je gljiva E-STOP.';
  if (!rucni() || st.nacin === 'T2') return 'Ručno gibanje nije moguće u načinu ' + st.nacin + '.';
  if (blokirano()) return 'Najprije potvrdi poruke („Potvrdi sve”).';
  if (st.omog === 'panika') return 'Uređaj za omogućavanje je pritisnut do kraja (panika).';
  if (st.omog !== 'srednji' || !st.omogArm) return 'Drži uređaj za omogućavanje u srednjem položaju.';
  if (!st.pogoni) return 'Pogoni nisu uključeni.';
  if (st.kocenje0) return 'Robot koči.';
  if (st.iz && !st.iz.pauza) return 'Program se izvodi.';
  return null;
}
function pocniJog(spec) {
  const [os, smjer] = spec.split(':').map(Number);
  if (os >= 6) { napomena('Tipke E1 i E2 su za dodatne osi — robot u stanici ih nema.'); return; }
  const r = zabranaJoga();
  if (r) {
    napomena(r);
    if (/načinu/.test(r)) poruka('info', 'Ručno gibanje nije moguće u načinu ' + st.nacin, { kljuc: 'jogNe' });
    dogadaj('jogOdbijen'); return;
  }
  st.jog = { os, smjer, t: 0 };
  if (st.iz && st.iz.pauza) st.iz.vani = true;
}
function krajJog() { if (!st.jog) return; st.jog = null; document.querySelectorAll('.drzi').forEach((b) => b.classList.remove('drzi')); if (st.refOdgodi) { st.refOdgodi = false; snimiRef(); } st.ekranPrljav = true; }
/* ograničenje brzine TCP-a i prirubnice u T1 */
function ogranicenjeT1(q0, q1, dt) {
  if (st.nacin !== 'T1' || dt <= 0) return 1;
  const v = Math.max(dist3(pT(tcpRob(q0)), pT(tcpRob(q1))), dist3(fk(q0).p, fk(q1).p)) / dt;
  return v > T1V ? T1V / v : 1;
}
function softLimitPoruka(os, smjer) {
  const tekst = 'Softverski krajnji prekidač ' + (smjer > 0 ? '+' : '−') + 'A' + (os + 1);
  poruka('potvrda', tekst, { kljuc: 'limit' + os, moze: () => st.q[os] < OSI[os].max - 0.2 * D && st.q[os] > OSI[os].min + 0.2 * D });
  dogadaj('softlimit', { os, smjer });
}
function kartKorak(T, k, s, d) {
  const c = k < 3 ? k : 5 - k;   /* A → Z, B → Y, C → X */
  let os;
  if (st.ks === 'tool') os = [T[c], T[4 + c], T[8 + c]];
  else if (st.ks === 'base') { const B = baseT(); os = [B[c], B[4 + c], B[8 + c]]; }
  else os = [c === 0 ? 1 : 0, c === 1 ? 1 : 0, c === 2 ? 1 : 0];
  if (k < 3) { const n = T.slice(); n[3] += os[0] * d * s; n[7] += os[1] * d * s; n[11] += os[2] * d * s; return n; }
  const R = mul(rotOs(os, d * s), [T[0], T[1], T[2], 0, T[4], T[5], T[6], 0, T[8], T[9], T[10], 0, 0, 0, 0, 1]);
  R[3] = T[3]; R[7] = T[7]; R[11] = T[11]; return R;
}
function korakJog(dt) {
  const j = st.jog; if (!j) return;
  const r = zabranaJoga(); if (r) { st.jog = null; napomena(r); return; }
  j.t += dt;
  const hov = st.hov / 100;
  let qn;
  if (st.ks === 'osi') {
    const i = j.os, w = OSI[i].vMaxRad * SIM.jogOsi * hov;
    qn = st.q.slice(); qn[i] += j.smjer * w * dt;
    if (qn[i] > OSI[i].max || qn[i] < OSI[i].min) { qn[i] = clamp(qn[i], OSI[i].min, OSI[i].max); postaviQ(qn, 'jog'); st.jog = null; softLimitPoruka(i, j.smjer); return; }
    const f = ogranicenjeT1(st.q, qn, dt);
    if (f < 1) { qn = st.q.map((x, k) => x + (qn[k] - x) * f); st.t1Ogr += dt; if (st.t1Ogr > 0.6) dogadaj('t1limit'); } else st.t1Ogr = 0;
  } else {
    const T = tcpRob(st.q), transl = j.os < 3;
    const d0 = (transl ? SIM.jogKart : SIM.jogOri) * hov * dt;
    let d = d0, usp = false;
    for (let pok = 0; pok < 4; pok++) {
      const Tn = kartKorak(T, j.os, j.smjer, d);
      const ri = ikTcp(Tn, st.q);
      if (!ri.uspjeh) {
        st.jog = null;
        if (ri.greska === 'izvan granica osi') {
          const sv = ri.sva.slice().sort((a, b) => a.q.reduce((s, v, k) => s + (v - st.q[k]) ** 2, 0) - b.q.reduce((s, v, k) => s + (v - st.q[k]) ** 2, 0))[0];
          const g = sv && naGranici(sv.q); if (g) softLimitPoruka(g.os, g.smjer); else poruka('potvrda', 'Ručno gibanje: cilj izvan softverskih krajnjih prekidača', { kljuc: 'limitK' });
        } else poruka('info', 'Ručno gibanje: TCP izvan radnog prostora robota', { kljuc: 'radniProstor' });
        st.ekranPrljav = true; return;
      }
      let om = 0; for (let k = 0; k < 6; k++) om = Math.max(om, Math.abs(ri.q[k] - st.q[k]) / (OSI[k].vMaxRad * dt));
      if (om <= 1) { qn = ri.q; break; }
      usp = true; d /= om * 1.05;
      if (d < d0 * SIM.singPrag) {
        st.jog = null; const s = KIN.singularnost(st.q);
        poruka('potvrda', 'Ručno gibanje zaustavljeno: ' + opisSing(s.najblizi), { kljuc: 'singJog' });
        dogadaj('singularnost', s.najblizi); st.ekranPrljav = true; return;
      }
    }
    if (!qn) return;
    if (usp) { st.singT = 0.6; const s = KIN.singularnost(qn); poruka('stanje', 'Gibanje usporeno: ' + opisSing(s.najblizi) + ' — osi bi bile prebrze', { kljuc: 'singUsp' }); dogadaj('singularnost', s.najblizi); }
    const f = ogranicenjeT1(st.q, qn, dt); if (f < 1) qn = st.q.map((x, k) => x + (qn[k] - x) * f);
  }
  postaviQ(qn, 'jog');
}
/* automatsko gibanje do zadanih kutova (gumb „Dovedi” u mjerenju TCP-a) */
function korakAuto(dt) {
  const a = st.auto; if (!a) return;
  const r = zabranaJoga(); if (r) { st.auto = null; napomena(r); return; }
  let maks = 0; for (let i = 0; i < 6; i++) maks = Math.max(maks, Math.abs(a.cilj[i] - st.q[i]) / OSI[i].vMaxRad);
  if (maks < 1e-6) { st.auto = null; dogadaj('gib'); st.ekranPrljav = true; return; }
  const k = Math.min(1, 0.25 * dt / maks);
  let qn = st.q.map((x, i) => x + (a.cilj[i] - x) * k);
  const f = ogranicenjeT1(st.q, qn, dt); if (f < 1) qn = st.q.map((x, i) => x + (qn[i] - x) * f);
  postaviQ(qn, 'jog');
}

/* ================================================================== */
/* 9. KRL: parser                                                      */
/* ================================================================== */
const SUSTAVSKE = ['VEL.CP', 'VEL_AXIS', 'ACC.CP', 'APO.CDIS', 'APO.CPTP', 'VEL.ORI1', 'TOOL', 'BASE', 'OUT'];
function broj(s) { const v = parseFloat(String(s).replace('−', '-')); return Number.isFinite(v) ? v : NaN; }
function parsirajAgregat(s) {
  const o = {};
  for (const dio of s.split(',')) {
    const m = dio.trim().match(/^([A-Z_]+\d*)\s+(.+)$/i); if (!m) { if (dio.trim()) return null; continue; }
    const k = m[1].toUpperCase(); let v = m[2].trim();
    if ((k === 'S' || k === 'T') && /^'B[01]+'$/i.test(v)) v = parseInt(v.slice(2, -1), 2);
    else if (/^'[^']*'$/.test(v)) continue;
    else v = broj(v);
    if (!Number.isFinite(v)) return null;
    o[k] = v;
  }
  return o;
}
function tockaIzAgregata(tip, a) {
  if (/AXIS/.test(tip) || ('A1' in a)) {
    const q = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((k) => (k in a ? a[k] * D : null));
    return { tip: 'E6AXIS', q };
  }
  const t = { tip: 'E6POS' };
  ['X', 'Y', 'Z'].forEach((k) => { t[k.toLowerCase()] = k in a ? a[k] / 1000 : null; });
  ['A', 'B', 'C'].forEach((k) => { t[k] = k in a ? a[k] * D : null; });
  if ('S' in a) t.S = a.S; if ('T' in a) t.T = a.T;
  return t;
}
function parsirajCilj(s) {
  s = s.trim();
  if (/^HOME$/i.test(s) || /^XHOME$/i.test(s)) return { cilj: { tip: 'home' }, ostatak: '' };
  if (s[0] === '{') { const z = s.indexOf('}'); if (z < 0) return null; const a = parsirajAgregat(s.slice(1, z)); if (!a) return null; return { cilj: { tip: 'agr', t: tockaIzAgregata('', a) }, ostatak: s.slice(z + 1) }; }
  const m = s.match(/^([A-Z_][A-Z0-9_]*)/i); if (!m) return null;
  const ime = m[1].toUpperCase(); if (ime === 'HOME') return { cilj: { tip: 'home' }, ostatak: s.slice(m[0].length) };
  return { cilj: { tip: 'ime', ime }, ostatak: s.slice(m[0].length) };
}
function parsirajOpcije(s, ins) {
  let r = ' ' + s + ' ';
  const vel = r.match(/\sVEL\s*=\s*([-\d.,]+)\s*(%|M\/S)/i);
  if (vel) { ins.vel = broj(vel[1].replace(',', '.')); ins.velJed = vel[2] === '%' ? '%' : 'm/s'; r = r.replace(vel[0], ' '); }
  const tl = r.match(/\sTOOL\s*\[\s*(\d+)\s*\]/i); if (tl) { ins.toolN = +tl[1]; r = r.replace(tl[0], ' '); }
  const bs = r.match(/\sBASE\s*\[\s*(\d+)\s*\]/i); if (bs) { ins.baseN = +bs[1]; r = r.replace(bs[0], ' '); }
  for (const tok of r.trim().split(/\s+/).filter(Boolean)) {
    const T = tok.toUpperCase();
    if (['C_PTP', 'C_DIS', 'C_VEL', 'C_ORI', 'CONT'].includes(T)) ins.apo = true;
    else if (/^(C?PDAT\d*|LDAT\d*|DEFAULT)$/.test(T)) { /* skupovi podataka obrasca: simulator ih ne koristi */ }
    else return 'nepoznat dodatak „' + tok + '”';
  }
  if (ins.toolN != null && ins.toolN > PRIHVATNICE.length) return 'Tool[' + ins.toolN + '] ne postoji (TOOL_DATA[0…' + PRIHVATNICE.length + '])';
  if (ins.baseN != null && ins.baseN > 2) return 'Base[' + ins.baseN + '] ne postoji (BASE_DATA[0…2])';
  return null;
}
function parsiraj(tekst) {
  const L = [], greske = [], dekl = {};
  let ime = '', imaDef = false, imaEnd = false;
  tekst.replace(/\r/g, '').split('\n').forEach((sirovo, idx) => {
    const n = idx + 1;
    let s = sirovo.replace(/−/g, '-');
    let uN = false, rez = '';
    for (const ch of s) { if (ch === "'") uN = !uN; if (ch === ';' && !uN) break; rez += ch; }
    s = rez.trim();
    if (!s || s[0] === '&') return;
    const U = s.toUpperCase();
    const g = (t) => greske.push({ n, tekst: t });
    if (imaEnd) { g('naredba iza END'); return; }
    let m;
    if ((m = s.match(/^DEF\s+([A-Z_][A-Z0-9_]*)\s*\(\s*\)$/i))) { if (imaDef) g('drugi DEF'); imaDef = true; ime = m[1]; L.push({ n, op: 'def' }); return; }
    if (!imaDef) { g('program mora početi s DEF ime( )'); return; }
    if (U === 'END') { imaEnd = true; L.push({ n, op: 'end' }); return; }
    if (U === 'INI') { L.push({ n, op: 'ini' }); return; }
    if (U === 'HALT') { L.push({ n, op: 'halt' }); return; }
    if ((m = s.match(/^DECL\s+(E6POS|POS|FRAME|E6AXIS|AXIS)\s+([A-Z_][A-Z0-9_]*)\s*=\s*\{(.*)\}$/i))) {
      const a = parsirajAgregat(m[3]); if (!a) { g('neispravan agregat točke ' + m[2]); return; }
      const t = tockaIzAgregata(m[1].toUpperCase(), a); dekl[m[2].toUpperCase()] = t; L.push({ n, op: 'tocka', ime: m[2].toUpperCase(), t }); return;
    }
    if (/^DECL\s+(INT|REAL|BOOL|CHAR)\s+/i.test(s)) { L.push({ n, op: 'nop' }); return; }
    if ((m = s.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*\{(.*)\}$/i))) {
      const a = parsirajAgregat(m[2]); if (!a) { g('neispravan agregat točke ' + m[1]); return; }
      const t = tockaIzAgregata('', a); dekl[m[1].toUpperCase()] = t; L.push({ n, op: 'tocka', ime: m[1].toUpperCase(), t }); return;
    }
    if ((m = s.match(/^\$([A-Z_]+(?:\.[A-Z0-9_]+)?)\s*(?:\[\s*(\d+)\s*\])?\s*=\s*(.+)$/i))) {
      const v = m[1].toUpperCase(), idx2 = m[2] != null ? +m[2] : null, d = m[3].trim();
      if (!SUSTAVSKE.includes(v)) { g('simulator ne poznaje varijablu $' + m[1]); return; }
      const ins = { n, op: 'set', v, idx: idx2 };
      if (v === 'OUT') { if (idx2 == null || idx2 < 1 || idx2 > 4096) { g('$OUT treba indeks, npr. $OUT[1]'); return; } if (!/^(TRUE|FALSE)$/i.test(d)) { g('$OUT[' + idx2 + '] prima TRUE ili FALSE'); return; } ins.val = /^TRUE$/i.test(d); }
      else if (v === 'TOOL' || v === 'BASE') {
        const mm = d.match(new RegExp('^' + v + '_DATA\\s*\\[\\s*(\\d+)\\s*\\]$', 'i'));
        if (mm) { ins.br = +mm[1]; if (ins.br > (v === 'TOOL' ? PRIHVATNICE.length : 2)) { g(v + '_DATA[' + ins.br + '] ne postoji'); return; } }
        else if (d[0] === '{' && d.endsWith('}')) { const a = parsirajAgregat(d.slice(1, -1)); if (!a) { g('neispravan okvir'); return; } ins.okvir = { x: (a.X || 0) / 1000, y: (a.Y || 0) / 1000, z: (a.Z || 0) / 1000, A: (a.A || 0) * D, B: (a.B || 0) * D, C: (a.C || 0) * D }; }
        else { g('$' + v + ' = ' + v + '_DATA[n] ili {X …, Y …, Z …, A …, B …, C …}'); return; }
      } else {
        const x = broj(d); if (!Number.isFinite(x)) { g('$' + m[1] + ' prima broj'); return; }
        if (v === 'VEL_AXIS' && (idx2 == null || idx2 < 1 || idx2 > 6)) { g('$VEL_AXIS[1…6]'); return; }
        ins.val = x;
      }
      L.push(ins); return;
    }
    if ((m = s.match(/^(PTP|LIN)\s+(.+)$/i))) {
      const c = parsirajCilj(m[2]); if (!c) { g('nedostaje ili je neispravan cilj gibanja'); return; }
      const ins = { n, op: 'gib', vrsta: m[1].toUpperCase(), cilj: c.cilj, apo: false };
      const e = parsirajOpcije(c.ostatak, ins); if (e) { g(e); return; }
      if (ins.vel != null && ((ins.vrsta === 'PTP') !== (ins.velJed === '%'))) { g(ins.vrsta === 'PTP' ? 'PTP brzina se zadaje u % (Vel=100 %)' : 'LIN brzina se zadaje u m/s (Vel=0.2 m/s)'); return; }
      L.push(ins); return;
    }
    if ((m = s.match(/^CIRC\s+(.+)$/i))) {
      const c1 = parsirajCilj(m[1]); if (!c1) { g('CIRC treba pomoćnu i ciljnu točku: CIRC P3, P4'); return; }
      const c2 = parsirajCilj(c1.ostatak.replace(/^\s*,?\s*/, '')); if (!c2 || c2.cilj.tip === 'home') { g('CIRC treba pomoćnu i ciljnu točku: CIRC P3, P4'); return; }
      const ins = { n, op: 'gib', vrsta: 'CIRC', pom: c1.cilj, cilj: c2.cilj, apo: false };
      const e = parsirajOpcije(c2.ostatak.replace(/\sCA\s+[-\d.]+/i, ' '), ins); if (e) { g(e); return; }
      if (ins.vel != null && ins.velJed === '%') { g('CIRC brzina se zadaje u m/s'); return; }
      L.push(ins); return;
    }
    if ((m = s.match(/^WAIT\s+SEC\s+([-\d.]+)$/i)) || (m = s.match(/^WAIT\s+TIME\s*=\s*([-\d.]+)\s*SEC$/i))) { const t = broj(m[1]); if (!(t >= 0)) { g('WAIT SEC treba nenegativan broj'); return; } L.push({ n, op: 'waitSec', t }); return; }
    if ((m = s.match(/^WAIT\s+FOR\s+(NOT\s+)?\$IN\s*\[\s*(\d+)\s*\](?:\s*==\s*(TRUE|FALSE))?$/i))) { let val = !m[1]; if (m[3] && /FALSE/i.test(m[3])) val = !val; L.push({ n, op: 'waitIn', idx: +m[2], val }); return; }
    if ((m = s.match(/^OUT\s+(\d+)\s+'[^']*'\s+STATE\s*=\s*(TRUE|FALSE)(?:\s+CONT)?$/i))) { L.push({ n, op: 'set', v: 'OUT', idx: +m[1], val: /TRUE/i.test(m[2]) }); return; }
    if (/^(FOR|WHILE|LOOP|IF|SWITCH|REPEAT|GOTO)\b/i.test(s)) { g('simulator ne izvodi ' + U.split(/\s/)[0] + ' (vidi „Što simulator pojednostavljuje”)'); return; }
    if (/^(SPTP|SLIN|SCIRC|SPLINE)\b/i.test(s)) { g('spline gibanja simulator ne izvodi — koristi PTP, LIN ili CIRC'); return; }
    g('nepoznata naredba');
  });
  if (!imaDef && !greske.length) greske.push({ n: 1, tekst: 'nema DEF' });
  if (imaDef && !imaEnd) greske.push({ n: tekst.split('\n').length, tekst: 'nedostaje END' });
  return { ime, L, greske, dekl };
}

/* ================================================================== */
/* 10. KRL: interpreter                                                */
/* ================================================================== */
function zadaneVarijable() { return { velAxis: [100, 100, 100, 100, 100, 100].map(() => KRL.zadano.velPTP), velCP: KRL.zadano.velCP, accCP: SIM.accCP, apoCDIS: 0.020, apoCPTP: 50, velOri: SIM.velOri }; }
function odaberi() {
  const P = parsiraj(st.prog.tekst);
  st.ed.greska = P.greske.length ? P.greske[0].n : null;
  if (P.greske.length) {
    P.greske.slice(0, 3).forEach((e) => poruka('potvrda', 'Greška u retku ' + e.n + ': ' + e.tekst, { kljuc: 'sint' + e.n }));
    st.iz = null; osvjeziEditor(); st.ekranPrljav = true; return false;
  }
  Object.assign(st.tocke, P.dekl);
  for (const ins of P.L) {
    if (ins.op !== 'gib') continue;
    for (const c of [ins.cilj, ins.pom]) {
      if (c && c.tip === 'ime' && !nadjiTocku(c.ime)) { st.ed.greska = ins.n; poruka('potvrda', 'Greška u retku ' + ins.n + ': točka ' + c.ime + ' nije naučena (Touchup)', { kljuc: 'sint' + ins.n }); st.iz = null; osvjeziEditor(); st.ekranPrljav = true; return false; }
    }
  }
  st.poruke = st.poruke.filter((p) => !(p.kljuc && p.kljuc.startsWith('sint')));
  st.prog.ime = P.ime;
  st.iz = { L: P.L, pc: 1, var: zadaneVarijable(), bco: false, pauza: true, kraj: false, gib: null, cekanje: null, zaustavljanje: null, ulaz: null, plan: null, vani: false, qPrekid: null,
    vrste: new Set(), apoBroj: 0, apoMax: 0, mstepBroj: 0 };
  poruka('info', 'Program ' + P.ime + ' je odabran', { kljuc: 'odabir' });
  osvjeziEditor(); st.ekranPrljav = true; dogadaj('odabran', P);
  return true;
}
function odznaci() { if (st.iz && !st.iz.pauza) return; st.iz = null; osvjeziEditor(); st.ekranPrljav = true; dogadaj('odznacen'); }
function resetPrograma() { if (!st.iz || !st.iz.pauza) return; st.iz = null; odaberi(); }
function nadjiTocku(ime) { return st.tocke[ime] || st.tocke['X' + ime] || (ime.startsWith('X') ? st.tocke[ime.slice(1)] : null) || null; }
function zabranaPrograma() {
  if (st.estop) return 'Pritisnuta je gljiva E-STOP.';
  if (blokirano()) return 'Najprije potvrdi poruke („Potvrdi sve”).';
  if (st.kocenje0) return 'Robot koči.';
  if (rucni()) {
    if (st.omog !== 'srednji' || !st.omogArm) return 'Drži uređaj za omogućavanje u srednjem položaju.';
    if (!st.pogoni) return 'Pogoni nisu uključeni.';
  } else if (!st.pogoni) return 'Uključi pogone: dodirni „I” u statusnoj traci.';
  return null;
}
function startPritisnut(izPLC) {
  if (!st.iz) { napomena('Najprije odaberi program (kartica Program › Odaberi).'); return; }
  if (st.nacin === 'AUT EXT' && !izPLC) { napomena('U načinu AUT EXT program pokreće nadređeni PLC (kartica I/O).'); poruka('info', 'AUT EXT: Start na privjesku nema funkciju — program pokreće PLC', { kljuc: 'autext' }); return; }
  const r = zabranaPrograma(); if (r) { napomena(r); return; }
  if (st.iz.kraj) { napomena('Program je na END. Klikni „Reset” za ponovno izvođenje.'); return; }
  if (!st.iz.bco && !rucni()) { napomena('Pomak do BCO izvodi se u T1 ili T2.'); poruka('info', 'BCO nije postignut — izvedi pomak do BCO u T1 ili T2', { kljuc: 'bcoAut' }); return; }
  st.startDrzi = true;
  const iz = st.iz;
  if (iz.pauza) {
    /* robot pomaknut od mjesta zaustavljanja → povratak na putanju (BCO) */
    const pomaknut = iz.qPrekid && (iz.vani || st.q.some((x, i) => Math.abs(x - iz.qPrekid[i]) > 0.05 * D));
    if (pomaknut) {
      if (iz.bco) { iz.bco = false; iz.povratak = iz.qPrekid.slice(); if (iz.gib) { iz.gibPrekinut = iz.gib; iz.gib = null; } }
      else if (iz.gib) iz.gib = null;   /* prekinuti pomak do BCO računa se ponovno */
    }
    iz.pauza = false; iz.zaustavljanje = null; iz.vani = false;
  }
  st.ekranPrljav = true; dogadaj('start');
}
function startPusten() {
  if (!st.startDrzi) return; st.startDrzi = false;
  if (rucni() && st.iz && !st.iz.pauza && !st.iz.kraj) { zaustavi(2, 'start'); poruka('info', 'Pušten Start — STOP 2', { kljuc: 'stop2start' }); }
}
function tipkaStop() { if (st.iz && !st.iz.pauza) { zaustavi(2, 'stop'); poruka('info', 'Tipka STOP — program zaustavljen (STOP 2)', { kljuc: 'stop2tipka' }); } }
function pauziraj() {
  const iz = st.iz; if (!iz) return;
  const kat = iz.zaustavljanje; iz.pauza = true; iz.zaustavljanje = null; iz.qPrekid = st.q.slice();
  if (kat === 1) pogoniOff();
  st.ekranPrljav = true;
}
function primijeniVar(V0, ins) {
  if (ins.v === 'VEL.CP') V0.velCP = Math.max(0.0001, ins.val);
  if (ins.v === 'VEL_AXIS') V0.velAxis[ins.idx - 1] = clamp(ins.val, 1, 100);
  if (ins.v === 'ACC.CP') V0.accCP = Math.max(0.01, ins.val);
  if (ins.v === 'APO.CDIS') V0.apoCDIS = Math.max(0, ins.val) / 1000;
  if (ins.v === 'APO.CPTP') V0.apoCPTP = clamp(ins.val, 0, 100);
  if (ins.v === 'VEL.ORI1') V0.velOri = Math.max(1, ins.val) * D;
}
function izvrsi(ins) {
  const iz = st.iz;
  switch (ins.op) {
    case 'ini': iz.var = zadaneVarijable(); break;
    case 'tocka': st.tocke[ins.ime] = ins.t; break;
    case 'set':
      if (ins.v === 'OUT') postaviIzlaz(ins.idx, ins.val);
      else if (ins.v === 'TOOL') { if (ins.okvir) { st.toolData[0] = { ...ins.okvir }; st.tool = 0; } else { st.toolData[0] = { ...NULA }; st.tool = ins.br; } st.ekranPrljav = true; }
      else if (ins.v === 'BASE') { if (ins.okvir) { st.baseData[0] = { ...ins.okvir }; st.base = 0; } else { st.baseData[0] = { ...NULA }; st.base = ins.br; } st.ekranPrljav = true; }
      else primijeniVar(iz.var, ins);
      break;
    default: break;
  }
}
/* cilj gibanja → kutovi (PTP) ili okvir TCP-a u KS robota (LIN/CIRC) */
function okvirTocke(t, i, j, q0) {
  const T0 = tcpBase(q0, i, j), p = KIN.poza(T0);
  const x = t.x ?? p.x, y = t.y ?? p.y, z = t.z ?? p.z, A = t.A ?? p.A, B = t.B ?? p.B, C = t.C ?? p.C;
  return mul(baseT(j), okvir(x, y, z, A, B, C));
}
function rijesiCilj(c, i, j, q0, zaPTP) {
  if (c.tip === 'home') { const q = HOME.slice(); return zaPTP ? { q } : { T: tcpRob(q, i), q }; }
  const t = c.tip === 'ime' ? nadjiTocku(c.ime) : c.t;
  if (!t) return { greska: 'točka ' + c.ime + ' nije definirana' };
  if (t.tip === 'E6AXIS') { const q = t.q.map((v, k) => (v == null ? q0[k] : v)); const g = naGranici(q); if (g) return { greska: 'cilj izvan softverskih krajnjih prekidača ' + (g.smjer > 0 ? '+' : '−') + 'A' + (g.os + 1) }; return zaPTP ? { q } : { T: tcpRob(q, i), q }; }
  const T = okvirTocke(t, i, j, q0);
  if (!zaPTP) return { T };
  let r = ikTcp(T, q0, i, { status: t.S, turn: t.T });
  if (!r.uspjeh && t.T != null) {   /* Turn: os točno na 0° može imati bilo koji predznak (zaokruživanje) */
    const r2 = ikTcp(T, q0, i, { status: t.S });
    if (r2.uspjeh) { let ok = true; for (let k = 0; k < 6; k++) if (((t.T >> k) & 1) !== (r2.q[k] < 0 ? 1 : 0) && Math.abs(r2.q[k]) > 0.5 * D) ok = false; if (ok) r = r2; }
  }
  if (!r.uspjeh) {
    if (t.S != null || t.T != null) { const r2 = ikTcp(T, q0, i); if (r2.uspjeh) return { greska: 'nema rješenja sa zadanim Status ' + t.S + ' / Turn ' + t.T }; }
    if (r.greska === 'izvan granica osi') { const sv = r.sva[0]; const g = sv && naGranici(sv.q); return { greska: 'cilj izvan softverskih krajnjih prekidača' + (g ? ' ' + (g.smjer > 0 ? '+' : '−') + 'A' + (g.os + 1) : '') }; }
    return { greska: 'cilj izvan dosega robota' };
  }
  return { q: r.q };
}
function geometrija(ins, pocetak, V0, i, j) {
  /* pocetak: { q } (trenutni položaj) ili { q, T } (kut zaglađivanja / prethodni cilj) */
  const q0 = pocetak.q;
  if (ins.vrsta === 'PTP') {
    const c = rijesiCilj(ins.cilj, i, j, q0, true); if (c.greska) return { greska: c.greska };
    const q1 = c.q, vel = (ins.vel != null ? clamp(ins.vel, 1, 100) : null);
    let L = 0; for (let k = 0; k < 6; k++) L = Math.max(L, Math.abs(q1[k] - q0[k]) / (OSI[k].vMaxRad * (vel != null ? vel : V0.velAxis[k]) / 100));
    return { cp: false, tip: 'PTP', q0: q0.slice(), q1, L, f: (u) => KIN.interpolirajPTP(q0, q1, u), a: 1 / SIM.tAccPTP, alat: i, maxdq: Math.max(...q1.map((v, k) => Math.abs(v - q0[k]))) };
  }
  const T0 = pocetak.T || tcpRob(q0, i);
  const c1 = rijesiCilj(ins.cilj, i, j, q0, false); if (c1.greska) return { greska: c1.greska };
  const T1 = c1.T;
  const kraj = ikTcp(T1, q0, i); if (!kraj.uspjeh) return { greska: kraj.greska === 'izvan granica osi' ? 'cilj izvan softverskih krajnjih prekidača' : 'cilj izvan dosega robota' };
  const velCP = ins.vel != null ? Math.max(0.001, ins.vel) : V0.velCP;
  let f, len;
  if (ins.vrsta === 'CIRC') {
    const cp = rijesiCilj(ins.pom, i, j, q0, false); if (cp.greska) return { greska: cp.greska };
    const Tp = cp.T; f = (u) => KIN.interpolirajCIRC(T0, Tp, T1, u); len = KIN.duljinaCIRC(T0, Tp, T1);
    if (!KIN.krugKrozTocke(pT(T0), pT(Tp), pT(T1))) return { greska: 'CIRC: početna, pomoćna i ciljna točka leže na pravcu' };
  } else { f = (u) => KIN.interpolirajLIN(T0, T1, u); len = KIN.duljinaLIN(T0, T1); }
  const ang = kutRot(T0, T1);
  const L = Math.max(len / velCP, ang / V0.velOri);
  return { cp: true, tip: ins.vrsta, T0, T1, L, f, len, a: V0.accCP / velCP, alat: i };
}
function bez(a, b, c, u) { return a.map((v, k) => (1 - u) * (1 - u) * v + 2 * (1 - u) * u * b[k] + u * u * c[k]); }
function napraviApo(G1, e1, G2, e2) {
  const u1 = 1 - e1;
  if (!G1.cp) {
    const qa = G1.f(u1), qc = G1.q1, qb = G2.f(e2);
    return { cp: false, tip: 'APO', f: (u) => bez(qa, qc, qb, u), L: Math.max(1e-3, e1 * G1.L + e2 * G2.L), alat: G1.alat, a: G2.a };
  }
  const Ta = G1.f(u1), Tb = G2.f(e2), pa = pT(Ta), pc = pT(G1.T1), pb = pT(Tb);
  return { cp: true, tip: 'APO', f: (u) => { const T = KIN.interpolirajLIN(Ta, Tb, u); const p = bez(pa, pc, pb, u); T[3] = p[0]; T[7] = p[1]; T[11] = p[2]; return T; }, L: Math.max(1e-3, e1 * G1.L + e2 * G2.L), alat: G1.alat, a: G2.a };
}
function sljedeceGibanje(pc) {
  const iz = st.iz, pre = [];
  for (let k = pc + 1; k < iz.L.length; k++) {
    const x = iz.L[k];
    if (x.op === 'gib') return { k, ins: x, pre };
    if (x.op === 'set' && x.v !== 'TOOL' && x.v !== 'BASE') { pre.push(x); continue; }
    if (x.op === 'nop' || x.op === 'tocka') continue;
    return { prepreka: x };
  }
  return { prepreka: { op: 'end' } };
}
const porodica = (v) => (v === 'PTP' ? 'PTP' : 'CP');
function greskaPrograma(tekst, n) {
  poruka('potvrda', tekst + (n ? ' (redak ' + n + ')' : ''), { kljuc: 'prog' + (n || '') });
  const iz = st.iz; if (iz) { iz.pauza = true; iz.gib = null; iz.zaustavljanje = null; iz.qPrekid = st.q.slice(); }
  st.ekranPrljav = true;
}
function komad(G, s0, s1, stani, v0, n, bco) { return { G, s: s0, sKraj: s1, stani, v: v0 || 0, n, bco: !!bco, cp: G.cp, tip: G.tip, alat: G.alat }; }
function pocniGibanje(ins) {
  const iz = st.iz;
  /* inline Tool[n] / Base[n] postavljaju $TOOL i $BASE */
  if (ins.toolN != null) { st.toolData[0] = { ...NULA }; st.tool = ins.toolN; }
  if (ins.baseN != null) { st.baseData[0] = { ...NULA }; st.base = ins.baseN; }
  const i = st.tool, j = st.base;
  if (!iz.bco) {
    if (ins.vrsta !== 'PTP') { greskaPrograma('BCO: prvo gibanje mora biti PTP — robot ne može linearno „uhvatiti” putanju', ins.n); return false; }
    const G = geometrija(ins, { q: st.q }, iz.var, i, j); if (G.greska) { greskaPrograma('Cilj nije dostižan: ' + G.greska, ins.n); return false; }
    iz.gib = komad(G, 0, G.L, true, 0, ins.n, true); iz.vrste.add('PTP'); return true;
  }
  const ulaz = iz.ulaz && iz.ulaz.pc === iz.pc ? iz.ulaz : null; iz.ulaz = null;
  const G = ulaz ? ulaz.G : geometrija(ins, { q: st.q }, iz.var, i, j);
  if (G.greska) { greskaPrograma('Cilj nije dostižan: ' + G.greska, ins.n); return false; }
  const s0 = ulaz ? ulaz.frac * G.L : 0;
  let s1 = G.L, apo = null;
  if (ins.apo && st.runMode === 'GO') {
    const sl = sljedeceGibanje(iz.pc);
    if (sl.prepreka) {
      if (['waitSec', 'waitIn', 'halt'].includes(sl.prepreka.op)) {
        poruka('info', 'Zaglađivanje nije moguće (redak ' + ins.n + '): ' + (sl.prepreka.op === 'halt' ? 'HALT' : 'WAIT') + ' u retku ' + sl.prepreka.n + ' zaustavlja pretrčavanje', { kljuc: 'apoNe' });
        dogadaj('apoNemoguce');
      }
    } else if (porodica(sl.ins.vrsta) !== porodica(ins.vrsta)) {
      poruka('info', 'Zaglađivanje ' + ins.vrsta + ' → ' + sl.ins.vrsta + ' simulator ne izvodi — točka u retku ' + ins.n + ' dostiže se točno', { kljuc: 'apoMix' });
    } else if (G.cp && sl.ins.toolN != null && sl.ins.toolN !== i) {
      poruka('info', 'Zaglađivanje nije moguće: sljedeće gibanje ima drugi alat', { kljuc: 'apoAlat' });
    } else {
      const V2 = JSON.parse(JSON.stringify(iz.var)); sl.pre.forEach((x) => { if (x.v !== 'OUT') primijeniVar(V2, x); });
      const i2 = sl.ins.toolN != null ? sl.ins.toolN : i, j2 = sl.ins.baseN != null ? sl.ins.baseN : j;
      const G2 = geometrija(sl.ins, G.cp ? { q: G.cp ? (ikTcp(G.T1, st.q, i).q) : G.q1, T: G.T1 } : { q: G.q1 }, V2, i2, j2);
      if (!G2.greska) {
        let e1, e2, ok = true;
        if (G.cp) { const d = iz.var.apoCDIS; if (G.len < 1e-4 || G2.len < 1e-4 || d <= 0) ok = false; e1 = Math.min(0.5, d / G.len); e2 = Math.min(0.5, d / G2.len); }
        else { const dk = iz.var.apoCPTP / 100 * SIM.cptpMax; if (G.maxdq < 1e-4 || G2.maxdq < 1e-4 || dk <= 0) ok = false; e1 = Math.min(0.5, dk / G.maxdq); e2 = Math.min(0.5, dk / G2.maxdq); }
        if (ok && (1 - e1) * G.L > s0) {
          s1 = (1 - e1) * G.L; apo = napraviApo(G, e1, G2, e2);
          iz.plan = { pc: sl.k, G: G2, frac: e2, pre: sl.pre, cdis: G.cp ? iz.var.apoCDIS : 0 };
        }
      }
    }
  }
  iz.gib = komad(G, s0, s1, !apo, ulaz ? ulaz.v : 0, ins.n);
  iz.gib.apo = apo;
  iz.vrste.add(ins.vrsta);
  return true;
}
function pozaKomada(g, s) {
  const u = g.G.L > 1e-9 ? clamp(s / g.G.L, 0, 1) : 1;
  if (!g.cp) return { q: g.G.f(u) };
  const T = g.G.f(u), r = ikTcp(T, st.q, g.alat);
  if (!r.uspjeh) return { greska: r.greska === 'izvan granica osi' ? 'izvan' : 'doseg', sva: r.sva };
  return { q: r.q };
}
/* jedan IPO takt gibanja: vrati true kad je komad gotov */
function korakGibanja(g, dt) {
  const iz = st.iz, pov = st.pov / 100;
  let vCilj = iz.zaustavljanje ? 0 : pov;
  if (g.stani) vCilj = Math.min(vCilj, Math.sqrt(2 * g.G.a * Math.max(0, g.sKraj - g.s)) + 1e-3);
  const aK = iz.zaustavljanje ? g.G.a * (iz.zaustavljanje === 1 ? 2.2 : 1.6) : g.G.a;
  g.v = g.v < vCilj ? Math.min(vCilj, g.v + g.G.a * dt) : Math.max(vCilj, g.v - aK * dt);
  if (iz.zaustavljanje && g.v <= 1e-4) { g.v = 0; pauziraj(); return false; }
  let ds = Math.min(g.v * dt, g.sKraj - g.s);
  if (g.sKraj - g.s < 1e-9) return true;
  if (ds <= 0) return false;
  let qn = null, usp = false;
  for (let pok = 0; pok < 4; pok++) {
    const P = pozaKomada(g, g.s + ds);
    if (P.greska) {
      if (P.greska === 'izvan') { const sv = (P.sva || []).slice().sort((a, b) => a.q.reduce((s, v, k) => s + (v - st.q[k]) ** 2, 0) - b.q.reduce((s, v, k) => s + (v - st.q[k]) ** 2, 0))[0]; const gr = sv && naGranici(sv.q); if (gr) softLimitPoruka(gr.os, gr.smjer); greskaPrograma('Gibanje ' + g.tip + ' zaustavljeno: putanja izlazi iz softverskih krajnjih prekidača', g.n); }
      else greskaPrograma('Gibanje ' + g.tip + ' zaustavljeno: TCP izlazi iz radnog prostora', g.n);
      return false;
    }
    const gr = naGranici(P.q); if (gr) { softLimitPoruka(gr.os, gr.smjer); greskaPrograma('Gibanje zaustavljeno na softverskom krajnjem prekidaču', g.n); return false; }
    let om = 0; for (let k = 0; k < 6; k++) om = Math.max(om, Math.abs(P.q[k] - st.q[k]) / (OSI[k].vMaxRad * dt));
    const f1 = ogranicenjeT1(st.q, P.q, dt);
    const fak = Math.min(om > 1 ? 1 / om : 1, f1);
    if (fak >= 0.999) { qn = P.q; break; }
    if (om > 1) usp = true;
    if (om > 1 && fak < SIM.singPrag && g.cp) {
      const s = KIN.singularnost(st.q);
      greskaPrograma('Gibanje ' + g.tip + ' zaustavljeno: ' + opisSing(s.najblizi), g.n); dogadaj('singularnost', s.najblizi); return false;
    }
    ds *= fak * 0.98; g.v *= fak * 0.98;
  }
  if (!qn) return false;
  if (usp && g.cp) { st.singT = 0.6; const s = KIN.singularnost(qn); poruka('stanje', 'Gibanje usporeno: ' + opisSing(s.najblizi) + ' — osi bi bile prebrze', { kljuc: 'singUsp' }); dogadaj('singularnost', s.najblizi); }
  g.s += ds;
  postaviQ(qn, g.tip);
  if (g.s >= g.sKraj - 1e-9) { if (g.stani) g.v = 0; return true; }
  return false;
}
function korakProg(dt) {
  const iz = st.iz; if (!iz || iz.pauza || iz.kraj) return;
  let pomaknuto = false;
  for (let n = 0; n < 60 && st.iz === iz && !iz.pauza && !iz.kraj; n++) {
    /* povratak na putanju nakon ručnog pomicanja ili STOP 0 */
    if (iz.povratak && !iz.gib) { const q1 = iz.povratak; iz.povratak = null; const G = { cp: false, tip: 'PTP', q0: st.q.slice(), q1, L: Math.max(...q1.map((v, k) => Math.abs(v - st.q[k]) / OSI[k].vMaxRad)), f: null, a: 1 / SIM.tAccPTP, alat: st.tool }; G.f = (u) => KIN.interpolirajPTP(G.q0, q1, u); iz.gib = komad(G, 0, G.L, true, 0, 0, true); iz.gib.povratak = true; }
    if (iz.gib) {
      if (pomaknuto) return;
      pomaknuto = true;
      const g = iz.gib;
      if (!korakGibanja(g, dt)) return;
      /* komad gotov */
      if (g.povratak) {
        iz.gib = iz.gibPrekinut || null; if (iz.gib) iz.gib.v = 0; iz.gibPrekinut = null; iz.bco = true;
        iz.pauza = true; iz.qPrekid = st.q.slice(); poruka('info', 'Postignut BCO — robot je na putanji', { kljuc: 'bco' }); dogadaj('bco'); st.ekranPrljav = true; return;
      }
      if (g.bco) {
        iz.gib = null; iz.bco = true; iz.pc++; iz.pauza = true; iz.qPrekid = st.q.slice(); iz.gibPrekinut = null;
        poruka('info', 'Postignut BCO', { kljuc: 'bco' }); dogadaj('bco'); st.ekranPrljav = true; return;
      }
      if (g.apo) {
        /* advance run: naredbe između dvaju gibanja izvode se kad počne zaglađivanje */
        const P = iz.plan; P.pre.forEach((x) => izvrsi(x));
        iz.apoBroj++; iz.apoMax = Math.max(iz.apoMax, P.cdis || 0); iz.vrste.add('APO');
        iz.gib = komad(g.apo, 0, g.apo.L, false, g.v, g.n); iz.gib.kraj = true; iz.gibPrekinut = null;
        dogadaj('apo'); continue;
      }
      if (g.kraj && iz.plan) { const P = iz.plan; iz.plan = null; iz.pc = P.pc; iz.ulaz = { pc: P.pc, G: P.G, frac: P.frac, v: g.v }; iz.gib = null; iz.gibPrekinut = null; continue; }
      iz.gib = null; iz.gibPrekinut = null; iz.pc++;
      if (st.runMode === 'MSTEP') { iz.pauza = true; iz.qPrekid = st.q.slice(); iz.mstepBroj++; st.ekranPrljav = true; dogadaj('mstep'); return; }
      continue;
    }
    if (iz.cekanje) {
      const c = iz.cekanje;
      if (iz.zaustavljanje) { pauziraj(); return; }
      if (c.op === 'waitSec') { c.ost -= dt; if (c.ost > 0) return; }
      else if (!!st.inp[c.idx] !== c.val) return;
      iz.cekanje = null; iz.pc++; continue;
    }
    if (iz.zaustavljanje) { pauziraj(); return; }
    if (iz.pc >= iz.L.length) { krajPrograma(); return; }
    const ins = iz.L[iz.pc];
    if (ins.op === 'gib') { if (!pocniGibanje(ins)) return; continue; }
    if (ins.op === 'end') { krajPrograma(); return; }
    if (ins.op === 'def') { iz.pc++; continue; }
    if (ins.op === 'waitSec') { iz.cekanje = { op: 'waitSec', ost: ins.t }; continue; }
    if (ins.op === 'waitIn') { iz.cekanje = { op: 'waitIn', idx: ins.idx, val: ins.val }; continue; }
    if (ins.op === 'halt') { iz.pc++; iz.pauza = true; iz.qPrekid = st.q.slice(); poruka('info', 'HALT — program zaustavljen (redak ' + ins.n + ')', { kljuc: 'halt' }); st.ekranPrljav = true; return; }
    izvrsi(ins); iz.pc++;
  }
}
function krajPrograma() {
  const iz = st.iz; iz.kraj = true; iz.pauza = true; iz.gib = null;
  poruka('info', 'Program ' + st.prog.ime + ' je došao do END', { kljuc: 'kraj' });
  st.ekranPrljav = true; dogadaj('krajProg', iz);
}

/* ================================================================== */
/* 11. Dijelovi u ćeliji: PCB, osigurači, prihvatnice, izmjenjivač     */
/* ================================================================== */
let FL = [];   /* okviri prirubnice za uzimanje alata k iz spremišta (KS robota) */
const N_OS = 2;
function pcbUKutiji() { const K = SIM.kutija, g = K.gnijezda[0]; return mul(okv(BASE0[2]), okvir(g[0], g[1], K.dno + SIM.pcb.h / 2, 0, 0, 0)); }
function pcbUKucistu() { return mul(okv(BASE0[1]), okvir(0, 0, SIM.kuciste.dno + SIM.pcb.h / 2, 0, 0, 0)); }
function gnijezdoOsig() { const C = SIM.cijevi; return okvir(C.x + C.gnijezdoDx, C.y - C.razmak, C.podnozje, 0, 0, 0); }
function resetDijelova() {
  st.dio = { pcb: { T: pcbUKutiji(), stanje: 'kutija', rel: null }, osig: [], cijev: SIM.cijevi.puno, dobava: 0 };
  for (let k = 0; k < N_OS; k++) st.dio.osig.push({ T: gnijezdoOsig(), stanje: k === 0 ? 'gnijezdo' : 'cijev', rel: null });
  st.dio.cijev = SIM.cijevi.puno - 1;
  st.prljavo = true;
}
function mjestoUSpremistu(q = st.q) {
  const F = fk(q).T;
  for (let k = 0; k < FL.length; k++) if (dist3(pT(F), pT(FL[k])) < 0.003 && kutRot(F, FL[k]) < 3 * D) return k;
  return -1;
}
function postaviIzlaz(n, v) {
  const prije = !!st.out[n]; st.out[n] = !!v;
  if (n === SIM.io.izmjenjivac && prije !== !!v) izmjenjivac(!!v);
  st.ekranPrljav = true; dogadaj('io', n);
}
function izmjenjivac(otkljucaj) {
  const k = mjestoUSpremistu();
  if (otkljucaj) {
    if (!st.alatNaRobotu) return;
    if (k < 0) { poruka('potvrda', 'Izmjenjivač otključan izvan spremišta — alat bi pao (simulator ga zadržava)', { kljuc: 'izmPad' }); return; }
    if (k + 1 !== st.alatNaRobotu) { poruka('potvrda', 'Mjesto ' + (k + 1) + ' u spremištu pripada alatu TOOL' + (k + 1) + ' — TOOL' + st.alatNaRobotu + ' odloži na njegovo mjesto', { kljuc: 'izmMjesto' }); return; }
    if (st.dio.pcb.stanje === 'ruka' || st.dio.osig.some((o) => o.stanje === 'ruka')) { poruka('potvrda', 'Alat drži dio — najprije ga odloži', { kljuc: 'izmDio' }); return; }
    model.postaviAlat(0); st.alatNaRobotu = 0; st.prsti = 1; st.prljavo = true; dogadaj('alat', 0);
  } else if (!st.alatNaRobotu && k >= 0) {
    model.postaviAlat(k + 1); st.alatNaRobotu = k + 1; st.prsti = 1; model.otvoriPrihvatnicu(1); st.prljavo = true; dogadaj('alat', k + 1);
  }
}
function korakDijelova(dt) {
  const d = st.dio, a = st.alatNaRobotu, P = a ? PRIHVATNICE[a - 1] : null;
  const Tt = praviTcp(st.q);
  const z = [Tt[2], Tt[6], Tt[10]];
  let promjena = false;
  /* vakuum */
  const vak = P && P.vrsta === 'vakuum' && st.out[SIM.io.vakuum];
  const pc = d.pcb;
  if (vak && pc.stanje !== 'ruka') {
    const vrh = mul(pc.T, okvir(0, 0, SIM.pcb.h / 2, 0, 0, 0));
    if (dist3(pT(Tt), pT(vrh)) < SIM.tol && z[2] < -Math.cos(SIM.tolKut)) { pc.stanje = 'ruka'; pc.rel = mul(inv(Tt), pc.T); promjena = true; dogadaj('dijelovi'); }
  } else if (!vak && pc.stanje === 'ruka') { polozPcb(); promjena = true; }
  if (pc.stanje === 'ruka') { pc.T = mul(Tt, pc.rel); promjena = true; }
  st.inp[SIM.io.vakuumOk] = !!(vak && pc.stanje === 'ruka');
  /* paralelna prihvatnica */
  const hv = P && P.vrsta === 'paralelna';
  const zatvori = hv && st.out[SIM.io.prihvat];
  const drzi = d.osig.find((o) => o.stanje === 'ruka');
  const sCilj = zatvori ? (drzi ? 0.35 : 0) : 1;
  if (hv) {
    const s0 = st.prsti; st.prsti = st.prsti < sCilj ? Math.min(sCilj, st.prsti + dt / SIM.tPrsti) : Math.max(sCilj, st.prsti - dt / SIM.tPrsti);
    if (s0 !== st.prsti) { model.otvoriPrihvatnicu(st.prsti); promjena = true; }
    if (zatvori && !drzi && st.prsti < 0.6) {
      for (const o of d.osig) {
        if (o.stanje === 'cijev') continue;
        const tocka = mul(o.T, okvir(0, 0, SIM.osigurac.h * SIM.osigurac.hvat, 0, 0, 0));
        if (dist3(pT(Tt), pT(tocka)) < SIM.tol && z[2] < -Math.cos(SIM.tolKut)) { o.stanje = 'ruka'; o.rel = mul(inv(Tt), o.T); st.prsti = 0.35; dogadaj('dijelovi'); break; }
      }
    }
    if (!zatvori && drzi && st.prsti > 0.5) { polozOsig(drzi); promjena = true; }
  }
  for (const o of d.osig) {
    if (o.stanje === 'ruka') { o.T = mul(Tt, o.rel); promjena = true; }
    if (o.stanje === 'pcb') { o.T = mul(pc.T, o.rel); }
  }
  st.inp[SIM.io.uHvataljci] = !!d.osig.find((o) => o.stanje === 'ruka');
  /* dobava osigurača iz cijevi */
  const uGn = d.osig.some((o) => o.stanje === 'gnijezdo');
  if (!uGn) {
    const sljedeci = d.osig.find((o) => o.stanje === 'cijev');
    if (sljedeci && d.cijev >= 0) { d.dobava += dt; if (d.dobava >= SIM.tDobava) { d.dobava = 0; sljedeci.stanje = 'gnijezdo'; sljedeci.T = gnijezdoOsig(); d.cijev = Math.max(0, d.cijev - 1); promjena = true; } }
  } else d.dobava = 0;
  st.inp[SIM.io.osigurac] = d.osig.some((o) => o.stanje === 'gnijezdo');
  if (promjena) st.prljavo = true;
}
function povrsinaIspod(p) {
  const L = mul(inv(okv(BASE0[1])), okvir(p[0], p[1], p[2])), N = SIM.naprava;
  if (Math.abs(L[3]) < N.a / 2 && Math.abs(L[7]) < N.b / 2) return N.z;
  const K = mul(inv(okv(BASE0[2])), okvir(p[0], p[1], p[2])), KK = SIM.kutija;
  if (Math.abs(K[3]) < KK.a / 2 && Math.abs(K[7]) < KK.b / 2) return KK.dno;
  return 0;
}
function polozPcb() {
  const pc = st.dio.pcb, cilj = pcbUKucistu(), p = pT(pc.T), c = pT(cilj);
  const kutZ = Math.abs(Math.atan2(pc.T[4], pc.T[0]) - Math.atan2(cilj[4], cilj[0]));
  const kz2 = Math.min(kutZ % PI, PI - (kutZ % PI));
  if (Math.hypot(p[0] - c[0], p[1] - c[1]) < SIM.tol && p[2] - c[2] < 0.008 && p[2] - c[2] > -0.003 && kz2 < SIM.tolKut) { pc.T = cilj; pc.stanje = 'kuciste'; }
  else if (dist3(p, pT(pcbUKutiji())) < SIM.tol * 1.5) { pc.T = pcbUKutiji(); pc.stanje = 'kutija'; }
  else { const a = Math.atan2(pc.T[4], pc.T[0]); pc.T = okvir(p[0], p[1], povrsinaIspod(p) + SIM.pcb.h / 2, a, 0, 0); pc.stanje = 'slobodno'; }
  pc.rel = null; dogadaj('dijelovi');
}
function polozOsig(o) {
  const pc = st.dio.pcb, p = pT(o.T);
  if (pc.stanje === 'kuciste') {
    for (const u of SIM.utori) {
      const s = mul(pc.T, okvir(u[0], u[1], SIM.pcb.h / 2, 0, 0, 0)), sp = pT(s);
      if (Math.hypot(p[0] - sp[0], p[1] - sp[1]) < SIM.tol && p[2] - sp[2] < 0.008 && p[2] - sp[2] > -0.004 && !st.dio.osig.some((x) => x !== o && x.stanje === 'pcb' && dist3(pT(x.T), sp) < 0.003)) {
        o.T = s; o.rel = mul(inv(pc.T), s); o.stanje = 'pcb'; dogadaj('dijelovi'); return;
      }
    }
  }
  if (dist3(p, pT(gnijezdoOsig())) < SIM.tol * 1.5 && !st.dio.osig.some((x) => x !== o && x.stanje === 'gnijezdo')) { o.T = gnijezdoOsig(); o.stanje = 'gnijezdo'; o.rel = null; dogadaj('dijelovi'); return; }
  o.T = okvir(p[0], p[1], povrsinaIspod(p), 0, 0, 0); o.stanje = 'slobodno'; o.rel = null; dogadaj('dijelovi');
}

/* ================================================================== */
/* 12. Mjerenje TCP-a: XYZ 4 točke                                     */
/* ================================================================== */
const SILJAK = [SIM.siljak.x, SIM.siljak.y, SIM.siljak.z];
function orijentacijaMjerenja(k) {
  const Rd = okvir(0, 0, 0, DOLJE.A, DOLJE.B, DOLJE.C);
  if (k === 0) return Rd;
  const fi = [0, 0, 120, 240][k] * D, tilt = 28 * D;
  const os = [Math.cos(fi), Math.sin(fi), 0];
  return mul(rotOs(os, tilt), Rd);
}
function dovedi(k) {
  if (!st.alatNaRobotu) { napomena('Na prirubnici nema alata.'); return; }
  const R = orijentacijaMjerenja(k), T = R.slice(); T[3] = SILJAK[0]; T[7] = SILJAK[1]; T[11] = SILJAK[2];
  const F = mul(T, inv(ALAT_PRAVI[st.alatNaRobotu]));
  const r = KIN.ik(F, st.q); if (!r.uspjeh) { napomena('Taj položaj nije dostižan.'); return; }
  const z = zabranaJoga(); if (z) { napomena(z); return; }
  st.auto = { cilj: r.q };
}
function udaljenostVrha() { return dist3(pT(praviTcp(st.q)), SILJAK); }
function mjerTouchup(k) {
  const m = st.mjer; if (!m.aktivno) return;
  const u = udaljenostVrha();
  if (u > SIM.tol) { napomena('Vrh alata je ' + kz(u * 1000, 1) + ' mm od šiljka — dovedi ga bliže (najviše ' + kz(SIM.tol * 1000, 0) + ' mm).'); return; }
  const F = fk(st.q).T;
  for (let i = 0; i < 4; i++) if (i !== k && m.tocke[i] && kutRot(m.tocke[i], F) < 15 * D) { napomena('Orijentacija je preslična točki ' + (i + 1) + ' (manje od 15°). Zakreni alat.'); return; }
  m.tocke[k] = F; m.rez = null; st.ekranPrljav = true; dogadaj('mjerTocka', k);
}
function rijesiSustav(A, b) {   /* Gauss s djelomičnim pivotiranjem */
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[p], M[c]] = [M[c], M[p]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function mjerIzracunaj() {
  const m = st.mjer; if (m.tocke.some((t) => !t)) { napomena('Spremi sve četiri točke.'); return; }
  /* [R_i  −I] [t; P] = −p_i  →  normalne jednadžbe 6 × 6 */
  const N = Array.from({ length: 6 }, () => new Array(6).fill(0)), bb = new Array(6).fill(0);
  for (const F of m.tocke) {
    for (let r = 0; r < 3; r++) {
      const red = [F[4 * r], F[4 * r + 1], F[4 * r + 2], r === 0 ? -1 : 0, r === 1 ? -1 : 0, r === 2 ? -1 : 0], des = -F[4 * r + 3];
      for (let i = 0; i < 6; i++) { bb[i] += red[i] * des; for (let k = 0; k < 6; k++) N[i][k] += red[i] * red[k]; }
    }
  }
  const x = rijesiSustav(N, bb); if (!x) { napomena('Sustav je singularan — orijentacije su preslične.'); return; }
  const t = x.slice(0, 3), P = x.slice(3);
  let gr = 0; for (const F of m.tocke) { const p = [0, 1, 2].map((r) => F[4 * r] * t[0] + F[4 * r + 1] * t[1] + F[4 * r + 2] * t[2] + F[4 * r + 3]); gr = Math.max(gr, dist3(p, P)); }
  m.rez = { t, P, gr };
  st.ekranPrljav = true; dogadaj('mjerIzracun');
}
function mjerSpremi() {
  const m = st.mjer; if (!m.rez) { napomena('Najprije izračunaj.'); return; }
  st.toolData[m.alat] = { x: m.rez.t[0], y: m.rez.t[1], z: m.rez.t[2], A: 0, B: 0, C: 0 };
  poruka('info', 'TOOL_DATA[' + m.alat + '] spremljen: X ' + kz(m.rez.t[0] * 1000, 1) + ', Y ' + kz(m.rez.t[1] * 1000, 1) + ', Z ' + kz(m.rez.t[2] * 1000, 1) + ' mm', { kljuc: 'mjer' });
  m.aktivno = false; st.ekranPrljav = true; dogadaj('mjerenjeSpremljeno');
}

/* ================================================================== */
/* 13. Scena                                                          */
/* ================================================================== */
const scenaEl = $('scena');
const SOFTVERSKI = (() => {
  try { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); const r = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; if (e) g.getExtension('WEBGL_lose_context')?.loseContext(); return /swiftshader|llvmpipe|software/i.test(r); } catch (e) { return false; }
})();
const renderer = new THREE.WebGLRenderer({ antialias: !SOFTVERSKI, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SOFTVERSKI ? 1 : Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.02, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 0.3; controls.maxDistance = 8;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.55); sun.position.set(-1.5, 3.2, 2.2); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.55); sun2.position.set(2.5, 1.5, -2); scene.add(sun2);
const sun3 = new THREE.DirectionalLight(0xffffff, 0.35); sun3.position.set(0.5, -1, 2.5); scene.add(sun3);
const S3 = (x, y, z) => new THREE.Vector3(x, z, -y);
/* robot */
const model = napraviKUKA(THREE, { upravljac: false, privjesak: false, kabeli: false, pribor: false, unutrasnjost: false, spremiste: true, alat: 1 });
scene.add(model.korijen);
if (model.spremiste && model.spremiste.grupa) { model.spremiste.grupa.position.set(SIM.spremiste.x, SIM.spremiste.y, 0); model.korijen.updateMatrixWorld(true); }
{
  const Rinv = new THREE.Matrix4().copy(model.robot.matrixWorld).invert();
  FL = (model.spremiste ? model.spremiste.mjesta : []).map((m) => {
    const M4 = new THREE.Matrix4().multiplyMatrices(Rinv, m.matrixWorld), e = M4.elements;
    const T = [e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14], 0, 0, 0, 1];
    return mul(T, okvir(0, 0, -HF, 0, 0, 0));
  });
}
/* KS robota u sceni */
const rob = new THREE.Group(); rob.rotation.x = -PI / 2; scene.add(rob);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.05 }, o));
function kutija(a, b, h, m, x, y, z0, rotZ = 0, rod = rob) { const me = new THREE.Mesh(new THREE.BoxGeometry(a, b, h), m); me.position.set(x, y, z0 + h / 2); me.rotation.z = rotZ; rod.add(me); return me; }
const mAlu = mat(0xb9c2c8, { roughness: 0.45, metalness: 0.5 }), mPloca = mat(0x8e979c, { roughness: 0.55, metalness: 0.45 }), mTamna = mat(0x30373c, { roughness: 0.6 });
{
  const P = SIM.ploca, H = P.visina;
  kutija(P.x1 - P.x0, P.y1 - P.y0, P.deb, mPloca, (P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, -P.deb);
  kutija(P.x1 - P.x0 - 0.06, P.y1 - P.y0 - 0.06, H - 0.16, mat(0x5a6168, { roughness: 0.7 }), (P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, -H + 0.08);
  for (const [x, y] of [[P.x0 + 0.03, P.y0 + 0.03], [P.x1 - 0.03, P.y0 + 0.03], [P.x0 + 0.03, P.y1 - 0.03], [P.x1 - 0.03, P.y1 - 0.03]]) {
    kutija(0.04, 0.04, H - P.deb, mAlu, x, y, -H);
    kutija(0.04, 0.04, 0.9, mAlu, x, y, 0);
  }
  const ok = (a, b, x, y) => kutija(a, b, 0.04, mAlu, x, y, 0.88);
  ok(P.x1 - P.x0, 0.04, (P.x0 + P.x1) / 2, P.y0 + 0.03); ok(P.x1 - P.x0, 0.04, (P.x0 + P.x1) / 2, P.y1 - 0.03); ok(0.04, P.y1 - P.y0, P.x0 + 0.03, (P.y0 + P.y1) / 2); ok(0.04, P.y1 - P.y0, P.x1 - 0.03, (P.y0 + P.y1) / 2);
  const pod = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), mat(0x9aa3a8, { roughness: 0.95 })); pod.position.z = -H; rob.add(pod);
  const mreza = new THREE.GridHelper(7, 35, 0x7d878c, 0x8c969b); mreza.rotation.x = PI / 2; mreza.position.z = -H + 0.001; rob.add(mreza);
}
/* stezna naprava s kućištem */
const gNap = new THREE.Group(); rob.add(gNap);
{
  const N = SIM.naprava; gNap.position.set(N.x, N.y, 0); gNap.rotation.z = N.A * D;
  kutija(N.a, N.b, N.z, mAlu, 0, 0, 0, 0, gNap);
  for (const [x, y] of [[-N.a / 2 + 0.015, -N.b / 2 + 0.015], [N.a / 2 - 0.015, N.b / 2 - 0.015]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 12), mat(0x9ea6ab, { metalness: 0.7, roughness: 0.3 })); c.rotation.x = PI / 2; c.position.set(x, y, N.z + 0.006); gNap.add(c); }
  const K = SIM.kuciste, mK = mat(0x2c3338, { roughness: 0.5 });
  kutija(K.a, K.b, K.dno, mK, 0, 0, N.z, 0, gNap);
  kutija(K.a, 0.003, K.h, mK, 0, K.b / 2 - 0.0015, N.z, 0, gNap); kutija(K.a, 0.003, K.h, mK, 0, -K.b / 2 + 0.0015, N.z, 0, gNap);
  kutija(0.003, K.b, K.h, mK, K.a / 2 - 0.0015, 0, N.z, 0, gNap); kutija(0.003, K.b, K.h, mK, -K.a / 2 + 0.0015, 0, N.z, 0, gNap);
}
/* kutija PCB */
const gKut = new THREE.Group(); rob.add(gKut);
{
  const K = SIM.kutija, mT = mat(0x2a9ca5, { roughness: 0.6 }), sd = 0.004;
  gKut.position.set(K.x, K.y, 0); gKut.rotation.z = K.A * D;
  kutija(K.a, K.b, K.dno, mT, 0, 0, 0, 0, gKut);
  kutija(K.a, sd, K.h, mT, 0, K.b / 2 - sd / 2, 0, 0, gKut); kutija(K.a, sd, K.h, mT, 0, -K.b / 2 + sd / 2, 0, 0, gKut);
  kutija(sd, K.b, K.h, mT, K.a / 2 - sd / 2, 0, 0, 0, gKut); kutija(sd, K.b, K.h, mT, -K.a / 2 + sd / 2, 0, 0, 0, gKut);
  const mU = mat(0x1d7b83, { roughness: 0.7 });
  kutija(K.a - 0.01, 0.006, 0.02, mU, 0, 0, K.dno, 0, gKut); kutija(0.006, K.b - 0.01, 0.02, mU, 0, 0, K.dno, 0, gKut);
  const mP = mat(0x2f8a3c, { roughness: 0.5 });
  K.gnijezda.slice(1).forEach(([x, y]) => kutija(SIM.pcb.a, SIM.pcb.b, SIM.pcb.h, mP, x, y, K.dno, 0, gKut));
}
/* cijevi za osigurače */
{
  const C = SIM.cijevi, mC = mat(0xdfe6ea, { roughness: 0.15, transparent: true, opacity: 0.45 }), mPod = mat(0x4a5258);
  kutija(0.06, C.razmak * C.broj + 0.03, C.podnozje, mPod, C.x - 0.01, C.y, 0);
  kutija(0.035, 0.022, C.podnozje, mPod, C.x + C.gnijezdoDx, C.y - C.razmak, 0);
  for (let k = 0; k < C.broj; k++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, C.visina, 16, 1, true), mC); c.rotation.x = PI / 2; c.position.set(C.x, C.y + (k - 1) * C.razmak, C.podnozje + C.visina / 2); rob.add(c);
    const pun = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, C.visina * (k === 0 ? 0.35 : 0.7), 12), mat(0xc9a227, { metalness: 0.6, roughness: 0.35 })); pun.rotation.x = PI / 2; pun.position.set(C.x, C.y + (k - 1) * C.razmak, C.podnozje + C.visina * (k === 0 ? 0.175 : 0.35)); rob.add(pun);
  }
}
/* šiljak za mjerenje TCP-a */
{
  const S = SIM.siljak;
  const st0 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, S.z - 0.025, 20), mTamna); st0.rotation.x = PI / 2; st0.position.set(S.x, S.y, (S.z - 0.025) / 2); rob.add(st0);
  const vrh = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.025, 20), mat(0xd9a400, { metalness: 0.6, roughness: 0.3 })); vrh.rotation.x = PI / 2; vrh.position.set(S.x, S.y, S.z - 0.0125); rob.add(vrh);
}
/* pomični dijelovi */
const mshPcb = new THREE.Mesh(new THREE.BoxGeometry(SIM.pcb.a, SIM.pcb.b, SIM.pcb.h), mat(0x2f8a3c, { roughness: 0.5 })); mshPcb.matrixAutoUpdate = false; rob.add(mshPcb);
{ const g = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.003), mat(0x1c1f22)); g.position.set(-0.01, -0.01, 0.002); mshPcb.add(g); }
const geoOs = new THREE.CylinderGeometry(SIM.osigurac.r, SIM.osigurac.r, SIM.osigurac.h, 14); geoOs.rotateX(PI / 2); geoOs.translate(0, 0, SIM.osigurac.h / 2);
const mshOs = Array.from({ length: N_OS }, () => { const m = new THREE.Mesh(geoOs, mat(0xc9a227, { metalness: 0.6, roughness: 0.35 })); m.matrixAutoUpdate = false; rob.add(m); return m; });
/* okviri WORLD, BASE, TOOL */
function oznakaSprite(tekst, boja = '#10394A') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.86)'; g.beginPath(); g.roundRect ? g.roundRect(2, 8, 252, 48, 10) : g.rect(2, 8, 252, 48); g.fill();
  g.fillStyle = boja; g.font = '600 30px IBM Plex Sans, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tekst, 128, 33);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true, sizeAttenuation: false, toneMapped: false })); s.scale.set(0.085, 0.021, 1); s.renderOrder = 30; return s;
}
function osiOkvira(L, tekst) {
  const g = new THREE.Group();
  [[0xd23b2e, [1, 0, 0]], [0x1d9e4b, [0, 1, 0]], [0x2f6fd6, [0, 0, 1]]].forEach(([c, v]) => {
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(v[0] * L, v[1] * L, v[2] * L)]), new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true }));
    ln.renderOrder = 25; g.add(ln);
    const kon = new THREE.Mesh(new THREE.ConeGeometry(L * 0.05, L * 0.14, 10), new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true }));
    kon.position.set(v[0] * L, v[1] * L, v[2] * L); kon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...v)); kon.renderOrder = 25; g.add(kon);
  });
  if (tekst) { const s = oznakaSprite(tekst); s.position.set(L * 0.35, -L * 0.25, L * 0.35); g.add(s); g.userData.oznaka = s; }
  return g;
}
const okviri = new THREE.Group(); rob.add(okviri);
const okWorld = osiOkvira(0.22, 'WORLD'); okviri.add(okWorld);
const okBase = [null, osiOkvira(0.1, 'BASE[1]'), osiOkvira(0.1, 'BASE[2]')]; okBase.slice(1).forEach((o) => { o.matrixAutoUpdate = false; okviri.add(o); });
const okTool = osiOkvira(0.08, 'TOOL'); okTool.matrixAutoUpdate = false; okviri.add(okTool);
const tcpTocka = new THREE.Mesh(new THREE.SphereGeometry(0.006, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff7a00, depthTest: false })); tcpTocka.renderOrder = 26; tcpTocka.matrixAutoUpdate = false; rob.add(tcpTocka);
const m4 = (T) => new THREE.Matrix4().set(...T);
/* putanja TCP-a */
const PUT_MAX = 12000, putPos = new Float32Array(PUT_MAX * 3), putBoja = new Float32Array(PUT_MAX * 3);
const putGeo = new THREE.BufferGeometry(); putGeo.setAttribute('position', new THREE.BufferAttribute(putPos, 3)); putGeo.setAttribute('color', new THREE.BufferAttribute(putBoja, 3)); putGeo.setDrawRange(0, 0);
const putanja = new THREE.LineSegments(putGeo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true })); putanja.frustumCulled = false; putanja.renderOrder = 20; rob.add(putanja);
const BOJE = { PTP: new THREE.Color(0xe07b00), LIN: new THREE.Color(0x1a8fd6), CIRC: new THREE.Color(0x1d9e4b), APO: new THREE.Color(0x9b3fd1), jog: new THREE.Color(0x8a959b) };
let putN = 0, putZadnja = null;
function dodajPut(p, vrsta) {
  if (putZadnja && dist3(putZadnja.p, p) < 0.0015) return;
  if (putZadnja && dist3(putZadnja.p, p) < 0.05) {
    if (putN >= PUT_MAX - 2) { putPos.copyWithin(0, 3000); putBoja.copyWithin(0, 3000); putN -= 1000; }
    const c = BOJE[vrsta] || BOJE.jog;
    putPos.set(putZadnja.p, 3 * putN); putPos.set(p, 3 * putN + 3); putBoja.set([c.r, c.g, c.b], 3 * putN); putBoja.set([c.r, c.g, c.b], 3 * putN + 3);
    putN += 2; putGeo.setDrawRange(0, putN); putGeo.attributes.position.needsUpdate = true; putGeo.attributes.color.needsUpdate = true;
  }
  putZadnja = { p: p.slice(), vrsta };
}
function obrisiPut() { putN = 0; putZadnja = null; putGeo.setDrawRange(0, 0); st.prljavo = true; }
function postaviQ(qn, vrsta) {
  st.q = qn; st.prljavo = true;
  dodajPut(pT(tcpRob(qn)), vrsta === 'jog' ? 'jog' : vrsta);
  dogadaj('gib', vrsta);
}
/* pogledi */
const POGLEDI = {
  robot: { p: [2.0, -1.65, 1.5], t: [0.32, 0, 0.45] },
  celija: { p: [2.4, -1.4, 1.9], t: [0.25, 0, 0.12] },
  putanja: { p: [1.5, -0.8, 1.45], t: [0.64, 0.02, 0.24] },
  odozgo: { p: [0.3, -0.35, 2.75], t: [0.3, 0, 0] },
  alat: null
};
function pogled(ime) {
  if (ime === 'alat') { const p = pT(tcpRob(st.q)); camera.position.copy(S3(p[0] + 0.42, p[1] - 0.42, p[2] + 0.3)); controls.target.copy(S3(...p)); }
  else { const v = POGLEDI[ime] || POGLEDI.robot; camera.position.copy(S3(...v.p)); controls.target.copy(S3(...v.t)); }
  controls.update(); st.prljavo = true;
}
function postavi3D() {
  model.postavi(st.q);
  mshPcb.matrix.copy(m4(st.dio.pcb.T)); mshPcb.matrixWorldNeedsUpdate = true;
  st.dio.osig.forEach((o, k) => { mshOs[k].visible = o.stanje !== 'cijev'; mshOs[k].matrix.copy(m4(o.T)); mshOs[k].matrixWorldNeedsUpdate = true; });
  for (let j = 1; j < 3; j++) okBase[j].matrix.copy(m4(okv(st.baseData[j])));
  const Tt = tcpRob(st.q);
  okTool.matrix.copy(m4(Tt));
  tcpTocka.matrix.copy(m4(Tt));
}

/* ================================================================== */
/* 14. Zaslon privjeska                                               */
/* ================================================================== */
const ekran = $('ekran');
const TABOVI = [['polozaj', 'Položaj'], ['program', 'Program'], ['alati', 'Alat/Baza'], ['io', 'I/O'], ['sigurnost', 'Sigurnost']];
const KS = [['osi', 'Osi'], ['world', 'WORLD'], ['base', 'BASE'], ['tool', 'TOOL']];
const IK_POR = { potvrda: '!', stanje: '▲', info: 'i' };
function stanjeR() { const iz = st.iz; if (!iz) return 'siva'; if (iz.kraj) return 'crna'; if (!iz.pauza) return 'zelena'; return iz.qPrekid || iz.bco ? 'crvena' : 'zuta'; }
function opisR() { return { siva: 'nije odabran program', zuta: 'program odabran', zelena: 'program se izvodi', crvena: 'program zaustavljen', crna: 'program na END' }[stanjeR()]; }
function crtajEkran() {
  st.ekranPrljav = false;
  const fok = document.activeElement && ekran.contains(document.activeElement) && document.activeElement.tagName !== 'TEXTAREA' ? (document.activeElement.dataset.akcija || '') + '|' + (document.activeElement.dataset.v || '') : null;
  const ks = KS.find((k) => k[0] === st.ks)[1];
  let h = '<div class="hm-st"><span class="hm-sir"><b class="lamp on" title="Submit interpreter radi">S</b><button type="button" class="lamp ' + (st.pogoni ? 'on' : '') + '" data-akcija="pogoni" aria-label="Pogoni: ' + (st.pogoni ? 'uključeni' : 'isključeni') + '">I</button><b class="lamp r-' + stanjeR() + '" title="Robot interpreter: ' + opisR() + '">R</b></span>' +
    '<span class="hm-ime">' + esc(V.oznaka.replace(/ sixx| -2|-2/, '')) + '</span>' +
    '<button type="button" class="hm-nac" data-akcija="kljuc" aria-label="Način rada ' + st.nacin + '">' + st.nacin + '</button>' +
    '<span class="hm-ov">POV <b>' + st.pov + '</b>%</span><span class="hm-ov">HOV <b>' + st.hov + '</b>%</span>' +
    '<button type="button" class="hm-rm" data-akcija="runmode" aria-label="Način izvođenja programa">' + st.runMode + '</button>' +
    '<button type="button" class="hm-tb" data-akcija="tab" data-v="alati">Tool[' + st.tool + '] Base[' + st.base + ']</button>' +
    '<span class="hm-ks">' + ks + '</span></div>';
  /* poruke */
  const red = { potvrda: 0, stanje: 1, info: 2 };
  const por = st.poruke.slice().sort((a, b) => red[a.tip] - red[b.tip] || b.id - a.id);
  const prva = por[0];
  h += '<div class="hm-por' + (st.porOtvorene ? ' otv' : '') + '">';
  if (!prva) h += '<div class="hm-p prazno"><span class="hm-pi">✓</span><span>Nema poruka</span></div>';
  else {
    const lista = st.porOtvorene ? por.slice(0, 8) : [prva];
    lista.forEach((p) => { h += '<div class="hm-p ' + p.tip + '"><span class="hm-pi">' + IK_POR[p.tip] + '</span><span class="hm-pt">' + esc(p.tekst) + '</span>' + (p.tip !== 'stanje' ? '<button type="button" class="hm-btn" data-akcija="potvrdi" data-v="' + p.id + '">' + (p.tip === 'potvrda' ? 'Potvrdi' : 'OK') + '</button>' : '') + '</div>'; });
    h += '<div class="hm-pdno"><button type="button" class="hm-btn" data-akcija="porOtv">' + (st.porOtvorene ? 'Skupi' : 'Sve poruke (' + por.length + ')') + '</button><button type="button" class="hm-btn pl" data-akcija="potvrdiSve">Potvrdi sve</button></div>';
  }
  h += '</div>';
  h += '<div class="hm-tabs" role="tablist">' + TABOVI.map(([k, n]) => '<button type="button" role="tab" class="hm-tab' + (st.tab === k ? ' akt' : '') + '" aria-selected="' + (st.tab === k) + '" data-akcija="tab" data-v="' + k + '">' + n + '</button>').join('') + '</div>';
  h += '<div class="hm-tijelo">' + ({ polozaj: tabPolozaj, program: tabProgram, alati: tabAlati, io: tabIO, sigurnost: tabSigurnost }[st.tab])() + '</div>';
  h += '<div class="hm-dno"><div class="hm-sk">' + softkeys() + '</div><div class="hm-seg hm-ksel" role="group" aria-label="Koordinatni sustav za ručno gibanje">' + KS.map(([k, n]) => '<button type="button" data-akcija="ks" data-v="' + k + '" aria-pressed="' + (st.ks === k) + '">' + n + '</button>').join('') + '</div></div>';
  if (st.odabirNacina) h += '<div class="hm-prek"><div class="hm-dlg" role="dialog" aria-label="Odabir načina rada"><h3>Upravitelj veze — način rada</h3><div class="hm-nacini">' + KRL.nacini.map((n) => '<button type="button" class="hm-nbtn' + (st.nacin === n.kod ? ' akt' : '') + '" data-akcija="nacin" data-v="' + n.kod + '"><b>' + n.kod + '</b><span>' + esc(n.naziv) + '</span></button>').join('') + '</div><p class="hm-mala">Ključ se okreće natrag kad je način odabran.</p><button type="button" class="hm-btn" data-akcija="zatvoriNacin">Odustani</button></div></div>';
  const taF = document.activeElement === TA, s0 = TA.selectionStart, s1 = TA.selectionEnd, sc = TA.scrollTop;
  ekran.innerHTML = h;
  if (st.tab === 'program') { const m = ekran.querySelector('#ed-mjesto'); if (m) m.appendChild(EDITOR); osvjeziEditor(); if (taF) { TA.focus({ preventScroll: true }); TA.setSelectionRange(s0, s1); } TA.scrollTop = sc; }
  if (fok) { const [a, v] = fok.split('|'); const f = ekran.querySelector('[data-akcija="' + a + '"]' + (v ? '[data-v="' + v + '"]' : '')); if (f) f.focus(); }
  osvjeziJogOznake(); osvjeziStraga();
  $('kljuc-nacin').textContent = st.nacin;
  osvjeziZivo();
}
function softkeys() {
  if (st.tab === 'program') {
    const iz = st.iz, ins = linijaKursora();
    const circ = /^\s*CIRC\b/i.test(ins.tekst);
    return (iz ? '<button type="button" class="hm-btn" data-akcija="odznaci"' + (iz.pauza ? '' : ' disabled') + '>Odznači</button><button type="button" class="hm-btn" data-akcija="reset"' + (iz.pauza ? '' : ' disabled') + '>Reset</button>' : '<button type="button" class="hm-btn pl" data-akcija="odaberi">Odaberi</button>') +
      '<button type="button" class="hm-btn" data-akcija="umetni" data-v="PTP"' + (iz && !iz.pauza ? ' disabled' : '') + '>+PTP</button><button type="button" class="hm-btn" data-akcija="umetni" data-v="LIN"' + (iz && !iz.pauza ? ' disabled' : '') + '>+LIN</button>' +
      (circ ? '<button type="button" class="hm-btn" data-akcija="touchup" data-v="pom">Touchup PP</button><button type="button" class="hm-btn" data-akcija="touchup" data-v="cilj">Touchup CP</button>' : '<button type="button" class="hm-btn" data-akcija="touchup" data-v="cilj">Touchup</button>');
  }
  if (st.tab === 'polozaj' || st.tab === 'alati') return '<span class="hm-mala">Alat</span><div class="hm-seg">' + st.toolData.map((_, i) => '<button type="button" data-akcija="tool" data-v="' + i + '" aria-pressed="' + (st.tool === i) + '">' + i + '</button>').join('') + '</div><span class="hm-mala">Baza</span><div class="hm-seg">' + [0, 1, 2].map((j) => '<button type="button" data-akcija="base" data-v="' + j + '" aria-pressed="' + (st.base === j) + '">' + j + '</button>').join('') + '</div>';
  return '';
}
function tabPolozaj() {
  const redovi = OSI.map((o, i) => '<tr><td>' + o.ime + '</td><td class="br" data-ziv="q' + i + '"></td><td class="tr"><span class="hm-bar"><i data-ziv="qb' + i + '"></i></span></td><td class="br" data-ziv="v' + i + '"></td><td class="tr"><span class="hm-bar v"><i data-ziv="vb' + i + '"></i></span></td></tr>').join('');
  return '<div class="hm-g pz"><div class="hm-panel"><h3>Osi [°] · brzina [°/s]</h3><table class="hm-t"><thead><tr><th>os</th><th>kut</th><th>opseg</th><th>°/s</th><th>% vMax</th></tr></thead><tbody>' + redovi + '</tbody></table></div>' +
    '<div class="hm-panel"><h3>Kartezijski: BASE[' + st.base + '] · TOOL[' + st.tool + ']</h3><table class="hm-t">' + ['X', 'Y', 'Z'].map((o, i) => '<tr><td>' + o + '</td><td class="br" data-ziv="p' + i + '"></td><td>mm</td></tr>').join('') + ['A', 'B', 'C'].map((o, i) => '<tr><td>' + o + '</td><td class="br" data-ziv="r' + i + '"></td><td>°</td></tr>').join('') +
    '<tr><td>S</td><td class="br" data-ziv="S"></td><td></td></tr><tr><td>T</td><td class="br" data-ziv="T"></td><td></td></tr></table>' +
    '<div class="hm-red"><span>TCP</span><b data-ziv="vtcp"></b><span class="hm-mala">mm/s' + (st.nacin === 'T1' ? ' (T1: najviše ' + kz(T1V * 1000, 0) + ')' : '') + '</span></div>' +
    '<div class="hm-sing" data-ziv="sing"></div></div></div>';
}
function tabProgram() {
  const imena = Object.keys(st.tocke).sort();
  const c = (v, f, d) => '<td class="br">' + (v == null ? '—' : kr(v * f, d)) + '</td>';
  const red = (ime) => { const t = st.tocke[ime]; if (t.tip === 'E6AXIS') return '<tr><td>' + esc(ime) + '</td><td>E6AXIS</td>' + t.q.map((v) => c(v, 1 / D, 1)).join('') + '<td></td><td></td><td></td></tr>'; return '<tr><td>' + esc(ime) + '</td><td>E6POS</td>' + c(t.x, 1000, 1) + c(t.y, 1000, 1) + c(t.z, 1000, 1) + c(t.A, 1 / D, 1) + c(t.B, 1 / D, 1) + c(t.C, 1 / D, 1) + '<td class="br">' + (t.S ?? '—') + '</td><td class="br">' + (t.T ?? '—') + '</td><td>' + (t.tool != null ? t.tool + '/' + t.base : '') + '</td></tr>'; };
  return '<div class="hm-g pg"><div class="hm-panel"><h3>' + esc(st.prog.ime || 'program') + '.src <span class="hm-mala" data-ziv="pstat"></span></h3><div id="ed-mjesto"></div></div>' +
    '<div class="hm-panel pg-dat"><h3>Točke (.dat) <span class="hm-mala">E6POS: X, Y, Z [mm] · A, B, C [°] · S, T · Tool/Base &nbsp; E6AXIS: A1…A6 [°]</span></h3>' + (imena.length ? '<div class="hm-skrol"><table class="hm-t dat"><thead><tr><th>ime</th><th>tip</th><th>X | A1</th><th>Y | A2</th><th>Z | A3</th><th>A | A4</th><th>B | A5</th><th>C | A6</th><th>S</th><th>T</th><th>T/B</th></tr></thead><tbody>' + imena.map(red).join('') + '</tbody></table></div>' : '<p class="hm-mala">Nema naučenih točaka. „+PTP” ili „+LIN” umeće gibanje i sprema trenutni položaj.</p>') + '</div></div>';
}
function tabAlati() {
  const c = (v, f) => '<td class="br">' + kr(v * f, 1) + '</td>';
  const red = (f) => c(f.x, 1000) + c(f.y, 1000) + c(f.z, 1000) + c(f.A, 1 / D) + c(f.B, 1 / D) + c(f.C, 1 / D);
  const zag = '<thead><tr><th>#</th><th></th><th>X</th><th>Y</th><th>Z</th><th>A</th><th>B</th><th>C</th></tr></thead>';
  const m = st.mjer;
  const mj = !m.aktivno ? '<div class="hm-red"><span class="hm-mala">Mjerenje TCP-a, XYZ 4 točke, za</span><select data-polje="mjerAlat" aria-label="Alat za mjerenje">' + PRIHVATNICE.map((p, i) => '<option value="' + (i + 1) + '"' + (m.alat === i + 1 ? ' selected' : '') + '>TOOL[' + (i + 1) + ']</option>').join('') + '</select><button type="button" class="hm-btn pl" data-akcija="mjerStart">Pokreni mjerenje</button></div><p class="hm-mala">Vrh alata dovodi se na šiljak u ćeliji iz četiri različite orijentacije; iz četiri položaja prirubnice računa se TCP.</p>' :
    '<p class="hm-mala">Mjerenje TOOL[' + m.alat + ']: vrh alata na šiljak iz četiri orijentacije. Vrh je <b data-ziv="udalj"></b> mm od šiljka.</p><div class="hm-mj">' + [0, 1, 2, 3].map((k) => '<div class="hm-red"><b>' + (k + 1) + '</b><button type="button" class="hm-btn" data-akcija="dovedi" data-v="' + k + '">Dovedi ' + (k + 1) + '</button><button type="button" class="hm-btn pl" data-akcija="mjerTouchup" data-v="' + k + '">Touchup ' + (k + 1) + '</button><span class="hm-mala">' + (m.tocke[k] ? '✓ spremljeno' : '—') + '</span></div>').join('') + '</div>' +
    '<div class="hm-red"><button type="button" class="hm-btn" data-akcija="mjerIzr"' + (m.tocke.every(Boolean) ? '' : ' disabled') + '>Izračunaj</button><button type="button" class="hm-btn" data-akcija="mjerOdustani">Odustani</button></div>' + (m.rez ? '<p class="hm-mala">TCP: X ' + kr(m.rez.t[0] * 1000, 1) + ', Y ' + kr(m.rez.t[1] * 1000, 1) + ', Z ' + kr(m.rez.t[2] * 1000, 1) + ' mm · pogreška ' + kr(m.rez.gr * 1000, 2) + ' mm</p><button type="button" class="hm-btn pl" data-akcija="mjerSpremi">Spremi u TOOL_DATA[' + m.alat + ']</button>' : '');
  const nesklad = st.tool && st.alatNaRobotu !== st.tool;
  return '<div class="hm-g al"><div class="hm-panel"><h3>TOOL_DATA [mm, °] u FLANGE-u</h3><div class="hm-skrol"><table class="hm-t dat">' + zag + '<tbody>' + st.toolData.map((f, i) => '<tr class="' + (st.tool === i ? 'akt' : '') + '"><td>' + i + '</td><td>' + (i ? esc(PRIHVATNICE[i - 1].oznaka) : 'FLANGE') + '</td>' + (i && f.z === 0 && f.x === 0 && f.y === 0 ? '<td colspan="6" class="hm-upoz">nije izmjeren</td>' : red(f)) + '</tr>').join('') + '</tbody></table></div>' +
    '<h3 style="margin-top:8px">BASE_DATA [mm, °] u WORLD-u</h3><div class="hm-skrol"><table class="hm-t dat">' + zag + '<tbody>' + st.baseData.map((f, j) => '<tr class="' + (st.base === j ? 'akt' : '') + '"><td>' + j + '</td><td>' + NAZ_BAZE[j].split(' ')[0] + '</td>' + red(f) + '</tr>').join('') + '</tbody></table></div>' +
    '<p class="hm-mala">BASE[1] = stezna naprava, BASE[2] = kutija PCB.</p></div>' +
    '<div class="hm-panel"><h3>Alat na prirubnici</h3><p class="hm-mala"><b>' + (st.alatNaRobotu ? 'TOOL' + st.alatNaRobotu + ' — ' + esc(PRIHVATNICE[st.alatNaRobotu - 1].naziv) : 'bez alata') + '</b>' + (nesklad ? '<br><span class="hm-upoz">Odabrani TOOL[' + st.tool + '] nije alat na prirubnici — prikaz TCP-a i gibanja bit će kriva.</span>' : '') + '</p><h3 style="margin-top:8px">Mjerenje TCP-a</h3>' + mj + '</div></div>';
}
function tabIO() {
  const led = (on) => '<span class="io-led' + (on ? ' on' : '') + '"></span>';
  return '<div class="hm-g io"><div class="hm-panel"><h3>Izlazi $OUT</h3>' + [1, 2, 3].map((n) => '<div class="hm-red"><button type="button" class="hm-btn" data-akcija="out" data-v="' + n + '" aria-pressed="' + !!st.out[n] + '">$OUT[' + n + ']</button><span data-ziv="out' + n + '">' + led(st.out[n]) + '</span><span class="hm-mala">' + SIM.ioNazivi.out[n] + '</span></div>').join('') + '<p class="hm-mala">U T1 izlazi se mogu ručno uključivati za ispitivanje.</p></div>' +
    '<div class="hm-panel"><h3>Ulazi $IN</h3>' + [1, 2, 3, 4].map((n) => '<div class="hm-red"><span data-ziv="in' + n + '">' + led(st.inp[n]) + '</span><b>$IN[' + n + ']</b><span class="hm-mala">' + SIM.ioNazivi.in[n] + '</span></div>').join('') +
    '<h3 style="margin-top:8px">Nadređeni PLC (AUT EXT)</h3><button type="button" class="hm-btn" data-akcija="plcStart"' + (st.nacin === 'AUT EXT' ? '' : ' disabled') + '>PLC: pogoni i Start programa</button><p class="hm-mala">U stanici robot radi u AUT EXT: PLC uključuje pogone i pokreće program (pretpostavka po arhitekturi stanice).</p></div></div>';
}
function tabSigurnost() {
  const zs = st.zadnjiStop, uz = { start: 'pušten Start', stop: 'tipka STOP', omog: 'pušten uređaj za omogućavanje', panika: 'uređaj do kraja (panika)', estop: 'E-STOP', napajanje: 'nestanak napajanja', nacin: 'promjena načina' };
  return '<div class="hm-g sg"><div class="hm-panel"><h3>Kategorije zaustavljanja</h3><table class="hm-t mala">' + KRL.zaustavljanja.map((z) => '<tr class="' + (zs && z.kod === 'STOP ' + zs.kat ? 'akt' : '') + '"><td class="nw"><b>' + z.kod + '</b></td><td>' + esc(z.opis) + '</td></tr>').join('') + '</table>' +
    '<p class="hm-mala">Zadnje zaustavljanje: <b>' + (zs ? 'STOP ' + zs.kat + ' — ' + (uz[zs.uzrok] || zs.uzrok) : '—') + '</b></p>' +
    '<div class="hm-red"><button type="button" class="hm-btn crv" data-akcija="stop0">Nestanak napajanja (STOP 0)</button><span class="hm-mala">ispitivanje: pogoni se odmah isključuju</span></div></div>' +
    '<div class="hm-panel"><h3>Što pokreće zaustavljanje</h3><table class="hm-t mala">' + KRL.okidaci.map(([a, b]) => '<tr><td>' + esc(a) + '</td><td>' + esc(b) + '</td></tr>').join('') + '</table>' +
    '<p class="hm-mala">Put zaustavljanja (STOP 0, ' + esc(V.oznaka) + '): ' + OSI.slice(0, 3).map((o) => o.ime + ' ' + kr(o.zaustavljanje.kutDeg, 1) + '° / ' + kr(o.zaustavljanje.vrijeme, 2) + ' s').join(', ') + '.</p></div></div>';
}
/* žive vrijednosti */
function osvjeziZivo() {
  const q = st.q, T = tcpBase(q), p = KIN.poza(T), ST = KIN.statusTurn(q);
  const v = { vtcp: kr(st.vTcp * 1000, 0), S: ST.status + ' (B' + ST.status.toString(2).padStart(3, '0') + ')', T: ST.turn + ' (B' + ST.turn.toString(2).padStart(6, '0') + ')', udalj: kr(udaljenostVrha() * 1000, 1) };
  const iz = st.iz; v.pstat = iz ? (iz.kraj ? 'END' : iz.pauza ? (iz.bco ? 'zaustavljen' : 'odabran · BCO nije postignut') : 'izvodi se') + (st.runMode === 'MSTEP' ? ' · MSTEP' : '') : 'nije odabran';
  for (let i = 0; i < 3; i++) { v['p' + i] = kr([p.x, p.y, p.z][i] * 1000, 1); v['r' + i] = kr([p.A, p.B, p.C][i] / D, 1); }
  for (let i = 0; i < 6; i++) { v['q' + i] = kr(q[i] / D, 2); v['v' + i] = kr(st.qV[i] / D, 0); }
  const s = KIN.singularnost(q);
  ekran.querySelectorAll('[data-ziv]').forEach((n) => {
    const k = n.dataset.ziv;
    if (k.startsWith('qb')) { const i = +k[2], o = OSI[i]; n.style.left = (100 * (q[i] - o.min) / (o.max - o.min)) + '%'; return; }
    if (k.startsWith('vb')) { const i = +k[2]; const r = Math.min(1, Math.abs(st.qV[i]) / OSI[i].vMaxRad); n.style.width = (100 * r) + '%'; n.classList.toggle('vis', r > 0.8); return; }
    if (k.startsWith('out')) { const on = !!st.out[+k[3]]; const l = n.firstChild; if (l) l.classList.toggle('on', on); return; }
    if (k.startsWith('in')) { const on = !!st.inp[+k[2]]; const l = n.firstChild; if (l) l.classList.toggle('on', on); return; }
    if (k === 'sing') { const t = s.tip ? '<b class="hm-upoz">' + esc(opisSing(s.tip)) + '</b>' : 'Najbliža singularnost: ' + esc(opisSing(s.najblizi).replace(/^singularnost /, '')); const h = '<span class="hm-mala">' + t + '</span><span class="hm-bar s"><i style="width:' + (100 * (1 - s.mjera)) + '%"></i></span>'; if (n.innerHTML !== h) n.innerHTML = h; return; }
    if (v[k] !== undefined && n.textContent !== v[k]) n.textContent = v[k];
  });
  if (EDITOR.isConnected) osvjeziPokazivac();
}
function osvjeziJogOznake() {
  const nazivi = st.ks === 'osi' ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] : ['X', 'Y', 'Z', 'A', 'B', 'C'];
  document.querySelectorAll('[data-jogozn]').forEach((s) => { const i = +s.dataset.jogozn; s.textContent = i < 6 ? nazivi[i] : 'E' + (i - 5); });
  document.querySelectorAll('[data-jog]').forEach((b) => { const [i, sm] = b.dataset.jog.split(':').map(Number); b.setAttribute('aria-label', (i < 6 ? nazivi[i] : 'E' + (i - 5)) + (sm > 0 ? ' plus' : ' minus') + (st.ks === 'osi' ? '' : ' (' + st.ks.toUpperCase() + ')')); });
}
function osvjeziStraga() { document.querySelectorAll('[data-omog]').forEach((b) => b.setAttribute('aria-pressed', String(st.omog === b.dataset.omog))); $('omog').className = 'sp-omog ' + st.omog; }

/* ---------------- editor KRL-a (trajni element, premješta se u karticu Program) */
const EDITOR = document.createElement('div'); EDITOR.className = 'ed';
EDITOR.innerHTML = '<div class="ed-br" aria-hidden="true"><div class="ed-brin"></div></div><div class="ed-polje"><div class="ed-ist" aria-hidden="true"><i class="ed-pok"></i><i class="ed-gr"></i><i class="ed-kur"></i></div><textarea spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="KRL program (.src)"></textarea></div>';
const TA = EDITOR.querySelector('textarea'), ED_BR = EDITOR.querySelector('.ed-brin'), ED_POK = EDITOR.querySelector('.ed-pok'), ED_GR = EDITOR.querySelector('.ed-gr'), ED_KUR = EDITOR.querySelector('.ed-kur');
const RED_PX = 18;
function osvjeziEditor() {
  if (TA.value !== st.prog.tekst) TA.value = st.prog.tekst;
  const n = st.prog.tekst.split('\n').length;
  ED_BR.innerHTML = Array.from({ length: n }, (_, i) => '<span>' + (i + 1) + '</span>').join('');
  TA.readOnly = !!(st.iz && !st.iz.pauza);
  osvjeziPokazivac();
}
function osvjeziPokazivac() {
  const y0 = -TA.scrollTop, iz = st.iz;
  ED_BR.style.transform = 'translateY(' + y0 + 'px)';
  let red = null;
  if (iz) { const g = iz.gib; red = g && g.n ? g.n : (iz.L[Math.min(iz.pc, iz.L.length - 1)] || {}).n; if (iz.cekanje) red = (iz.L[iz.pc] || {}).n; }
  ED_POK.style.display = red ? 'block' : 'none'; if (red) ED_POK.style.transform = 'translateY(' + (y0 + 4 + (red - 1) * RED_PX) + 'px)';
  ED_POK.className = 'ed-pok ' + stanjeR();
  const gr = st.ed.greska; ED_GR.style.display = gr ? 'block' : 'none'; if (gr) ED_GR.style.transform = 'translateY(' + (y0 + 4 + (gr - 1) * RED_PX) + 'px)';
  const k = linijaKursora().n; ED_KUR.style.transform = 'translateY(' + (y0 + 4 + (k - 1) * RED_PX) + 'px)';
}
function linijaKursora() { const pos = TA.selectionStart || 0, prije = st.prog.tekst.slice(0, pos); const n = prije.split('\n').length; return { n, tekst: st.prog.tekst.split('\n')[n - 1] || '' }; }
TA.addEventListener('input', () => {
  st.prog.tekst = TA.value; st.ed.greska = null;
  if (st.iz) { st.iz = null; poruka('info', 'Program je promijenjen i odznačen — odaberi ga ponovno', { kljuc: 'odabir' }); st.ekranPrljav = true; }
  osvjeziEditor(); dogadaj('program');
});
TA.addEventListener('scroll', osvjeziPokazivac);
['keyup', 'click', 'select'].forEach((e) => TA.addEventListener(e, () => { osvjeziPokazivac(); const sk = ekran.querySelector('.hm-sk'); if (sk) { const h = softkeys(); if (sk.dataset.h !== h) { sk.innerHTML = h; sk.dataset.h = h; } } }));
TA.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = TA.selectionStart; TA.setRangeText('  ', s, TA.selectionEnd, 'end'); TA.dispatchEvent(new Event('input')); } });
function postaviTekst(t) { st.prog.tekst = t; TA.value = t; st.ed.greska = null; if (st.iz && st.iz.pauza) { st.iz = null; st.ekranPrljav = true; } osvjeziEditor(); }
/* učenje točaka */
function novoImeTocke() { let k = 1; while (st.tocke['P' + k] || new RegExp('\\bP' + k + '\\b', 'i').test(st.prog.tekst)) k++; return 'P' + k; }
function tockaIzPolozaja(i, j) { const p = KIN.poza(tcpBase(st.q, i, j)), ST = KIN.statusTurn(st.q); return { tip: 'E6POS', x: p.x, y: p.y, z: p.z, A: p.A, B: p.B, C: p.C, S: ST.status, T: ST.turn, tool: i, base: j }; }
function umetni(vrsta) {
  if (st.iz && !st.iz.pauza) return;
  const ime = novoImeTocke(), red = linijaKursora().n, linije = st.prog.tekst.split('\n');
  const t = vrsta === 'PTP' ? 'PTP ' + ime + ' Vel=100 % PDAT' + ime.slice(1) + ' Tool[' + st.tool + '] Base[' + st.base + ']' : 'LIN ' + ime + ' Vel=' + KRL.zadano.velCP + ' m/s CPDAT' + ime.slice(1) + ' Tool[' + st.tool + '] Base[' + st.base + ']';
  linije.splice(red, 0, t);
  st.tocke[ime] = tockaIzPolozaja(st.tool, st.base);
  postaviTekst(linije.join('\n'));
  const pos = linije.slice(0, red + 1).join('\n').length; TA.setSelectionRange(pos, pos);
  if (st.iz) { st.iz = null; poruka('info', 'Program je promijenjen i odznačen — odaberi ga ponovno', { kljuc: 'odabir' }); }
  poruka('info', 'Točka ' + ime + ' spremljena (Tool[' + st.tool + '] Base[' + st.base + '])', { kljuc: 'touch' });
  st.ekranPrljav = true; dogadaj('program'); dogadaj('umetnuto', { vrsta, ime });
}
function touchup(koja) {
  const L = linijaKursora(), P = parsiraj('DEF T( )\n' + L.tekst + '\nEND').L.find((x) => x.op === 'gib');
  if (!P) { napomena('Postavi kursor u redak s gibanjem (PTP, LIN ili CIRC) i točkom.'); return; }
  const c = koja === 'pom' ? P.pom : P.cilj;
  if (!c || c.tip !== 'ime') { napomena('Gibanje u tom retku nema imenovanu točku (HOME i agregati se ne uče).'); return; }
  const i = P.toolN != null ? P.toolN : st.tool, j = P.baseN != null ? P.baseN : st.base;
  const ime = st.tocke[c.ime] ? c.ime : (st.tocke['X' + c.ime] ? 'X' + c.ime : c.ime);
  st.tocke[ime] = tockaIzPolozaja(i, j);
  if (st.iz) { st.iz.bco = false; }
  poruka('info', 'Touchup: točka ' + ime + ' spremljena (Tool[' + i + '] Base[' + j + '])', { kljuc: 'touch' });
  st.ekranPrljav = true; dogadaj('touchup', ime);
}

/* ================================================================== */
/* 15. Koraci nizova                                                  */
/* ================================================================== */
let niz = null, korak = 0; const gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-kuka-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-kuka-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }
const trenutni = () => (niz ? niz.koraci[korak] : null);
function snimiRef() { st.ref = { T: tcpRob(st.q), Tp: praviTcp(st.q), q: st.q.slice(), status: KIN.statusTurn(st.q).status }; }
function pomakU(okvirT) { const T = tcpRob(st.q), r = st.ref.T, d = [T[3] - r[3], T[7] - r[7], T[11] - r[11]]; const c = (k) => [okvirT[k], okvirT[4 + k], okvirT[8 + k]]; const pr = (k) => { const o = c(k); return d[0] * o[0] + d[1] * o[1] + d[2] * o[2]; }; return { d, x: pr(0), y: pr(1), z: pr(2), n: Math.hypot(...d) }; }
const blizu = (i, kut, tol) => Math.abs(st.q[i] / D - kut) <= tol;
function imaGibanje(vrsta, uvjet) { const P = parsiraj(st.prog.tekst); return P.L.filter((x) => x.op === 'gib' && x.vrsta === vrsta && x.cilj.tip === 'ime' && nadjiTocku(x.cilj.ime) && (!uvjet || uvjet(x))); }
function polozajTocke(ime) { const t = nadjiTocku(ime); if (!t || t.tip !== 'E6POS') return null; return pT(mul(baseT(t.base || 0), okvir(t.x, t.y, t.z, t.A, t.B, t.C))); }
function provjeriKorak(e, pod) {
  const k = trenutni(); if (!k) return false;
  const iz = st.iz;
  switch (k[2]) {
    case 'estopOtpusten': return !st.estop;
    case 'potvrdeno': return !st.poruke.some((p) => p.tip === 'potvrda');
    case 'nacinT1': return st.nacin === 'T1';
    case 'pogoniOn': return st.pogoni && rucni() && st.omog === 'srednji';
    case 'panika': return st.omog === 'panika';
    case 'pogoniPonovo': return st.pogoni && st.omog === 'srednji';
    case 'jogT2': return e === 'jogOdbijen' && st.nacin === 'T2';
    case 'pogoniAUT': return st.nacin === 'AUT' && st.pogoni;
    case 'ksOsi': return st.ks === 'osi';
    case 'hov30': return st.hov === 30;
    case 'a1_45': return e === 'gib' && blizu(0, 45, 2);
    case 'limitA5': return e === 'softlimit' && pod.os === 4 && pod.smjer > 0;
    case 'a5odmak': return st.q[4] < OSI[4].max - 5 * D && !st.poruke.some((p) => p.kljuc === 'limit4');
    case 't1limit': return e === 't1limit';
    case 'ksWorld': return st.ks === 'world';
    case 'w_z50': { if (e !== 'gib') return false; const m = pomakU(KIN.jedinicna()); return m.z >= 0.049 && Math.abs(m.x) < 0.003 && Math.abs(m.y) < 0.003; }
    case 'ksTool': return st.ks === 'tool';
    case 'tool_z30': { if (e !== 'gib') return false; const m = pomakU(st.ref.T); return m.z >= 0.029 && Math.hypot(m.x, m.y) < 0.003; }
    case 'ksBase1': return st.ks === 'base' && st.base === 1;
    case 'base_x40': { if (e !== 'gib') return false; const m = pomakU(baseT(1)); return m.x >= 0.039 && Math.hypot(m.y, m.z) < 0.003; }
    case 'rotA20': { if (e !== 'gib' || st.ks !== 'base') return false; const T = tcpRob(st.q); return kutRot(T, st.ref.T) >= 19 * D && dist3(pT(T), pT(st.ref.T)) < 0.002; }
    case 'tabAlati': return st.tab === 'alati';
    case 'rotFlange': { if (e !== 'gib' || st.ks !== 'tool' || st.tool !== 0) return false; return kutRot(fk(st.q).T, fk(st.ref.q).T) >= 15 * D && dist3(pT(praviTcp(st.q)), pT(st.ref.Tp)) > 0.01; }
    case 'mjerStart': return st.mjer.aktivno && st.mjer.alat === 4;
    case 'mt1': return !!st.mjer.tocke[0]; case 'mt2': return !!st.mjer.tocke[1]; case 'mt3': return !!st.mjer.tocke[2]; case 'mt4': return !!st.mjer.tocke[3];
    case 'mjerSpremi': return e === 'mjerenjeSpremljeno' && st.mjer.rez && dist3(st.mjer.rez.t, pT(ALAT_PRAVI[4])) < 0.002;
    case 'rotTcp': { if (e !== 'gib' || st.tool !== 4 || st.ks !== 'tool') return false; return kutRot(fk(st.q).T, fk(st.ref.q).T) >= 15 * D && dist3(pT(praviTcp(st.q)), pT(st.ref.Tp)) < 0.003; }
    case 'tabProgram': return st.tab === 'program';
    case 'umetnutPTP': return imaGibanje('PTP').length > 0;
    case 'umetnutLIN': { const l = imaGibanje('LIN'), p = imaGibanje('PTP'); if (!l.length || !p.length) return false; const a = polozajTocke(p[0].cilj.ime), b = polozajTocke(l[0].cilj.ime); return a && b && dist3(a, b) >= 0.1; }
    case 'odabran': return e === 'odabran';
    case 'bco': return e === 'bco';
    case 'krajProg': return e === 'krajProg' && pod.vrste.has('PTP') && pod.vrste.has('LIN');
    case 'mstep': return e === 'mstep' && st.runMode === 'MSTEP' && iz && iz.mstepBroj >= 2;
    case 'krajCirc': return e === 'krajProg' && pod.vrste.has('CIRC');
    case 'cdisOdabran': return e === 'odabran' && pod.L.some((x) => x.op === 'gib' && x.vrsta === 'LIN' && x.apo);
    case 'blend': return e === 'krajProg' && pod.apoBroj >= 1;
    case 'blend50': return e === 'krajProg' && pod.apoBroj >= 1 && pod.apoMax >= 0.049;
    case 'apoNemoguce': return e === 'apoNemoguce';
    case 'tabPolozaj': return st.tab === 'polozaj';
    case 'a5nula': return e === 'gib' && blizu(4, 0, 1);
    case 'singZapesce': return e === 'singularnost' && pod === 'zapesce';
    case 'ispruzena': return e === 'gib' && Math.abs(st.q[2] - KUT_ISPRUZENE) <= 1 * D;
    case 'statusBit': return e === 'gib' && ((KIN.statusTurn(st.q).status & 2) !== (st.ref.status & 2));
    case 'nacinAUT': return st.nacin === 'AUT';
    case 'startAUT': return e === 'start' && st.nacin === 'AUT';
    case 'pcbUNapravi': return st.dio.pcb.stanje === 'kuciste';
    case 'montazaGotova': return e === 'krajProg' && st.dio.pcb.stanje === 'kuciste' && st.dio.osig.filter((o) => o.stanje === 'pcb').length >= 2 && st.alatNaRobotu === 0;
    case 'stop2': return e === 'stop' && pod.kat === 2 && pod.uzrok === 'start' && pod.giba;
    case 'estopGib': return e === 'stop' && pod.kat === 1 && pod.uzrok === 'estop' && pod.giba;
    case 'estopPotvrda': return !st.estop && !blokirano() && st.pogoni;
    case 'panikaGib': return e === 'stop' && pod.kat === 1 && pod.uzrok === 'panika' && pod.giba;
    case 'stop0': return e === 'stop' && pod.kat === 0 && pod.giba;
    case 'oporavak': return e === 'bco';
    case 'dalje': return e === 'dalje';
    default: return false;
  }
}
function dogadaj(e, pod) {
  const k = trenutni(); if (!k || k[2] === 'kraj') return;
  if (provjeriKorak(e, pod)) {
    korak++;
    if (korak >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); }
    if (st.jog || st.auto) st.refOdgodi = true; else snimiRef();
    crtajKorak();
  }
}
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n, i) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="br">' + (i + 1) + '</span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
  el.querySelectorAll('[data-niz]').forEach((b) => b.addEventListener('click', () => pokreniNiz(b.dataset.niz)));
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korak + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k[0]) : '<b>Slobodan rad.</b> Odaberi niz u izborniku ili radi sam: način rada, ručno vođenje, kartica Program s KRL-om i učenjem točaka.';
  $('pomoc').textContent = k ? k[1] : 'U T1 robot se giba samo uz uređaj za omogućavanje u srednjem položaju (straga na privjesku). Tipke za gibanje desno; koordinatni sustav biraš u donjoj traci zaslona. Start se u T1 drži.';
  $('dalje').hidden = !(k && k[2] === 'dalje');
  $('ponovi').hidden = !(k && k[2] === 'kraj');
  crtajIzbornik(); st.ekranPrljav = true;
}
/* programi i točke za nizove (naši primjeri) */
function e6(T, j, i, qRef) {   /* E6POS iz okvira TCP-a u KS robota, u bazi j s alatom i */
  const Tb = mul(inv(okv(BASE0[j])), T), p = KIN.poza(Tb);
  const r = KIN.ik(mul(T, inv(i ? okv(PRIHVATNICE[i - 1].tcp) : KIN.jedinicna())), qRef || POLOZAJI.prirubnicaDolje);
  const ST = r.uspjeh ? KIN.statusTurn(r.q) : { status: null, turn: null };
  return { tip: 'E6POS', x: p.x, y: p.y, z: p.z, A: p.A, B: p.B, C: p.C, S: ST.status, T: ST.turn, tool: i, base: j };
}
const dolje = (x, y, z, A = 0) => okvir(x, y, z, A, DOLJE.B, DOLJE.C);
function programLuk() {
  const zz = 0.30, P = { P1: [0.55, -0.15], P2: [0.55, 0.08], P3: [0.65, 0.18], P4: [0.75, 0.08], P5: [0.75, -0.15] };
  const t = {}; Object.entries(P).forEach(([k, [x, y]]) => { t[k] = e6(dolje(x, y, zz), 0, 1); });
  return { tocke: t, tekst: ['DEF Luk( )', '; LIN i CIRC iznad stola, alat TOOL1 prema dolje', 'INI', '$APO.CDIS = 20', 'PTP HOME Vel=100 % DEFAULT', 'PTP P1 Vel=100 % PDAT1 Tool[1] Base[0]', 'LIN P2 Vel=0.2 m/s CPDAT1 Tool[1] Base[0]', 'CIRC P3, P4 Vel=0.2 m/s CPDAT2 Tool[1] Base[0]', 'LIN P5 Vel=0.2 m/s CPDAT3 Tool[1] Base[0]', 'PTP HOME Vel=100 % DEFAULT', 'END'].join('\n') };
}
function programKrug() {
  const zz = 0.32, P = { P1: [0.50, -0.20], P2: [0.50, 0.20], P3: [0.72, 0.20], P4: [0.72, -0.20] };
  const t = {}; Object.entries(P).forEach(([k, [x, y]]) => { t[k] = e6(dolje(x, y, zz), 0, 1); });
  return { tocke: t, tekst: ['DEF Krug( )', '; pravokutnik iznad stola za ispitivanje zaustavljanja', 'INI', 'PTP HOME Vel=100 % DEFAULT', 'PTP P1 Vel=100 % PDAT1 Tool[1] Base[0]', 'LIN P2 Vel=0.25 m/s CPDAT1 Tool[1] Base[0]', 'LIN P3 Vel=0.25 m/s CPDAT1 Tool[1] Base[0]', 'LIN P4 Vel=0.25 m/s CPDAT1 Tool[1] Base[0]', 'LIN P1 Vel=0.25 m/s CPDAT1 Tool[1] Base[0]', 'PTP HOME Vel=100 % DEFAULT', 'END'].join('\n') };
}
function programMontaza() {
  const t = {}, a = ALAT_PCB, o = ALAT_OSIG;
  const alatTocke = (k) => {   /* izmjena alata k (1…4): iznad, u vilici, ispred vilice (izvlačenje prema robotu) */
    const F = FL[k - 1]; if (!F) return;
    const gore = F.slice(); gore[11] += 0.08; const ispred = F.slice(); ispred[7] -= 0.09;
    t['ALATIZNAD' + k] = e6(gore, 0, 0); t['ALATMJESTO' + k] = e6(F, 0, 0); t['ALATIZLAZ' + k] = e6(ispred, 0, 0);
  };
  alatTocke(a); alatTocke(o);
  const K = SIM.kutija, g = K.gnijezda[0], zP = K.dno + SIM.pcb.h;
  t.PCBIZNAD = e6(mul(okv(BASE0[2]), dolje(g[0], g[1], K.h + 0.06)), 2, a); t.PCBUZMI = e6(mul(okv(BASE0[2]), dolje(g[0], g[1], zP)), 2, a);
  const zN = SIM.kuciste.dno + SIM.pcb.h;
  t.NAPIZNAD = e6(mul(okv(BASE0[1]), dolje(0, 0, 0.08)), 1, a); t.NAPPCB = e6(mul(okv(BASE0[1]), dolje(0, 0, zN)), 1, a);
  const gn = pT(gnijezdoOsig()), zO = SIM.osigurac.h * SIM.osigurac.hvat;
  t.OSIGIZNAD = e6(dolje(gn[0], gn[1], gn[2] + zO + 0.06), 0, o); t.OSIGUZMI = e6(dolje(gn[0], gn[1], gn[2] + zO), 0, o);
  SIM.utori.forEach((u, k) => {
    const zS = SIM.kuciste.dno + SIM.pcb.h + zO;
    t['OSIGUMETNI' + (k + 1)] = e6(mul(okv(BASE0[1]), dolje(u[0], u[1], zS)), 1, o); t['OSIGNAD' + (k + 1)] = e6(mul(okv(BASE0[1]), dolje(u[0], u[1], zS + 0.05)), 1, o);
  });
  const uzmiAlat = (k) => ['; --- uzmi TOOL' + k + ' iz spremišta', 'PTP AlatIznad' + k + ' Vel=100 % PDAT1 Tool[0] Base[0]', '$OUT[3]=TRUE              ; otključaj izmjenjivač', 'LIN AlatMjesto' + k + ' Vel=0.1 m/s CPDAT1 Tool[0] Base[0]', '$OUT[3]=FALSE             ; zaključaj: TOOL' + k + ' je na prirubnici', 'WAIT SEC 0.2', 'LIN AlatIzlaz' + k + ' Vel=0.1 m/s CPDAT1 Tool[0] Base[0]'];
  const vratiAlat = (k) => ['; --- vrati TOOL' + k + ' u spremište', 'PTP AlatIzlaz' + k + ' Vel=100 % PDAT1 Tool[0] Base[0]', 'LIN AlatMjesto' + k + ' Vel=0.1 m/s CPDAT1 Tool[0] Base[0]', '$OUT[3]=TRUE              ; otključaj: alat ostaje u vilici', 'WAIT SEC 0.2', 'LIN AlatIznad' + k + ' Vel=0.1 m/s CPDAT1 Tool[0] Base[0]', '$OUT[3]=FALSE'];
  const osig = (k) => ['; --- osigurač ' + k + ' iz gnijezda u pločicu', 'PTP OsigIznad Vel=100 % PDAT1 Tool[' + o + '] Base[0]', 'WAIT FOR $IN[4]           ; osigurač u gnijezdu', 'LIN OsigUzmi Vel=0.1 m/s CPDAT1 Tool[' + o + '] Base[0]', '$OUT[2]=TRUE              ; zatvori prihvatnicu', 'WAIT FOR $IN[3]', 'LIN OsigIznad Vel=0.2 m/s CPDAT1 Tool[' + o + '] Base[0]', 'PTP OsigNad' + k + ' Vel=100 % PDAT1 Tool[' + o + '] Base[1]', 'LIN OsigUmetni' + k + ' Vel=0.05 m/s CPDAT1 Tool[' + o + '] Base[1]', '$OUT[2]=FALSE             ; otvori: osigurač je u pločici', 'WAIT SEC 0.3', 'LIN OsigNad' + k + ' Vel=0.2 m/s CPDAT1 Tool[' + o + '] Base[1]'];
  const tekst = ['DEF Montaza( )', '; RASS: PCB iz kutije u kućište na napravi, zatim dva osigurača', 'INI', 'PTP HOME Vel=100 % DEFAULT', 'WAIT FOR $IN[1]           ; kutija PCB je na mjestu', ...uzmiAlat(a),
    '; --- PCB iz kutije (BASE[2])', 'PTP PcbIznad Vel=100 % PDAT1 Tool[' + a + '] Base[2]', 'LIN PcbUzmi Vel=0.1 m/s CPDAT1 Tool[' + a + '] Base[2]', '$OUT[1]=TRUE              ; vakuum', 'WAIT FOR $IN[2]           ; vakuum postignut', 'LIN PcbIznad Vel=0.2 m/s CPDAT1 Tool[' + a + '] Base[2]',
    '; --- PCB u kućište na napravi (BASE[1])', 'PTP NapIznad Vel=100 % PDAT1 Tool[' + a + '] Base[1]', 'LIN NapPcb Vel=0.05 m/s CPDAT1 Tool[' + a + '] Base[1]', '$OUT[1]=FALSE             ; vakuum isključen: PCB u kućištu', 'WAIT SEC 0.2', 'LIN NapIznad Vel=0.2 m/s CPDAT1 Tool[' + a + '] Base[1]',
    ...vratiAlat(a), ...uzmiAlat(o), ...osig(1), ...osig(2), ...vratiAlat(o), 'PTP HOME Vel=100 % DEFAULT', 'END'].join('\n');
  return { tocke: t, tekst };
}
function pripremi(id) {
  const ub = st.ubrzanje;
  pocetnoStanje(); st.ubrzanje = ub; obrisiPut();
  model.postaviAlat(st.alatNaRobotu); model.otvoriPrihvatnicu(1);
  postaviTekst(KRL.kostur.replace('Program( )', 'Vjezba( )'));
  if (id === 'ukljucivanje') { st.nacin = 'AUT'; st.pogoni = false; st.omog = 'pusten'; st.estop = true; st.q = HOME.slice(); poruka('stanje', 'Pritisnuta tipka za isključenje u nuždi (smartPAD)', { kljuc: 'estop' }); poruka('potvrda', 'Potrebna potvrda: isključenje u nuždi', { kljuc: 'estopPotvrda', blokira: true, moze: () => !st.estop }); poruka('info', 'Upravljač ' + UPRAVLJAC.naziv + ' je pokrenut', { kljuc: 'boot' }); }
  if (id === 'osi') { st.pogoni = false; st.omog = 'pusten'; st.ks = 'world'; st.hov = SIM.hov0; st.q = HOME.slice(); }
  if (id === 'kartezijski') { st.ks = 'osi'; st.hov = 100; }
  if (id === 'alati') {
    model.postaviAlat(4 <= PRIHVATNICE.length ? 4 : PRIHVATNICE.length); st.alatNaRobotu = Math.min(4, PRIHVATNICE.length); st.tool = 0; st.ks = 'world'; st.hov = 100;
    st.toolData[4] = { ...NULA };
    const T = dolje(SILJAK[0], SILJAK[1], SILJAK[2] + 0.06), r = KIN.ik(mul(T, inv(ALAT_PRAVI[st.alatNaRobotu])), st.q); if (r.uspjeh) st.q = r.q;
  }
  if (id === 'program') { st.q = [30, -70, 100, 0, 60, 0].map((x) => x * D); st.ks = 'world'; st.hov = 100; postaviTekst(KRL.kostur.replace('Program( )', 'Prvi( )')); }
  if (id === 'circ') { const P = programLuk(); st.tocke = P.tocke; postaviTekst(P.tekst); st.tab = 'program'; st.hov = 100; }
  if (id === 'singularnosti') { st.q = [0, -60, 100, 0, 30, 0].map((x) => x * D); st.ks = 'osi'; st.hov = 100; st.tab = 'program'; }
  if (id === 'stanica') { const P = programMontaza(); model.postaviAlat(0); st.alatNaRobotu = 0; st.tool = 0; st.q = HOME.slice(); st.tocke = P.tocke; postaviTekst(P.tekst); st.tab = 'program'; st.pov = 100; }
  if (id === 'sigurnost') { const P = programKrug(); st.tocke = P.tocke; postaviTekst(P.tekst); st.q = HOME.slice(); st.tab = 'program'; odaberi(); st.poruke = []; }
  if (id === null) { st.q = POLOZAJI.prirubnicaDolje.slice(); }
  $('gljiva').setAttribute('aria-pressed', String(st.estop));
  st.prljavo = true; st.ekranPrljav = true;
}
function pokreniNiz(id) {
  niz = id ? NIZOVI.find((n) => n.id === id) : null; korak = 0;
  napomena('');
  pripremi(id);
  if (id === 'circ' || id === 'sigurnost') pogled('putanja'); else if (id === 'stanica') pogled('celija'); else if (id === 'alati') pogled('alat'); else pogled('robot');
  snimiRef(); crtajKorak(); crtajEkran();
}

/* ================================================================== */
/* 16. Tekst ispod simulatora i podsjetnik                            */
/* ================================================================== */
function crtajTekst() {
  $('popis-nizova').innerHTML = NIZOVI.map((n) => '<li><b>' + esc(n.naziv) + '</b> — ' + esc(n.opis) + '</li>').join('');
  $('tab-nacini').innerHTML = '<thead><tr><th>Način</th><th>Naziv</th><th>Opis</th></tr></thead><tbody>' + KRL.nacini.map((n) => '<tr><td><b>' + esc(n.kod) + '</b></td><td>' + esc(n.naziv) + '</td><td>' + esc(n.opis) + '</td></tr>').join('') + '</tbody>';
  $('tab-stop').innerHTML = '<thead><tr><th>Okidač</th><th>Zaustavljanje</th></tr></thead><tbody>' + KRL.okidaci.map(([a, b]) => '<tr><td>' + esc(a) + '</td><td>' + esc(b) + '</td></tr>').join('') + '</tbody><tfoot>' + KRL.zaustavljanja.map((z) => '<tr><td><b>' + z.kod + '</b></td><td>' + esc(z.opis) + '</td></tr>').join('') + '</tfoot>';
  $('st-tekst').innerHTML = 'Isti položaj TCP-a (X, Y, Z, A, B, C) robot može postići s do osam kombinacija kutova osi. <b>Status</b> (3 bita) bira kombinaciju: ' + KRL.status.map((s) => 'bit ' + s.bit + ' (vrijednost ' + s.vrijednost + ') — ' + esc(s.opis)).join('; ') + '. <b>Turn</b> (6 bitova): ' + esc(KRL.turn) + '. U HOME je S = ' + KIN.statusTurn(HOME).status + ', T = ' + KIN.statusTurn(HOME).turn + '. PTP do točke sa zadanim S i T bira upravo to rješenje; LIN i CIRC zadržavaju konfiguraciju početne točke. Orijentacija: ' + esc(KRL.orijentacija) + '.';
  $('zadano').textContent = 'IPO takt ' + kz(SIM.dt * 1000, 0) + ' ms (korak simulacije); T1: TCP najviše ' + kz(T1V * 1000, 0) + ' mm/s; INI: $VEL_AXIS = ' + KRL.zadano.velPTP + ' %, $VEL.CP = ' + kz(KRL.zadano.velCP, 2) + ' m/s, $APO.CDIS = 20 mm, $APO.CPTP = 50 %; najveće brzine osi (' + esc(V.oznaka) + '): ' + OSI.map((o) => o.ime + ' ' + o.vMax).join(', ') + ' °/s; opsezi osi: ' + OSI.map((o) => o.ime + ' ' + o.minDeg + '…' + o.maxDeg + '°').join(', ').replace(/-/g, '−') + '; HOME = (' + HOME.map((v) => kr(v / D, 0)).join(', ') + ')°. Ćelija (KS robota): spremište alata x ' + kz(SIM.spremiste.x * 1000, 0) + ', y ' + kz(SIM.spremiste.y * 1000, 0) + ' mm; BASE[1] (naprava) X ' + kz(SIM.naprava.x * 1000, 0) + ', Y ' + kz(SIM.naprava.y * 1000, 0) + ', Z ' + kz(SIM.naprava.z * 1000, 0) + ' mm, A ' + SIM.naprava.A + '°; BASE[2] (kutija) X ' + kz(SIM.kutija.x * 1000, 0) + ', Y ' + kz(SIM.kutija.y * 1000, 0) + ' mm, A ' + SIM.kutija.A + '°; šiljak X ' + kz(SIM.siljak.x * 1000, 0) + ', Y ' + kz(SIM.siljak.y * 1000, 0) + ', Z ' + kz(SIM.siljak.z * 1000, 0) + ' mm. TOOL_DATA iz podataka o prihvatnicama: ' + PRIHVATNICE.map((p) => p.oznaka + ' Z ' + kz(p.tcp.z * 1000, 0) + ' mm').join(', ') + '.';
  $('pojednostavljenja').innerHTML = POJEDNOSTAVLJENJA.map((t) => '<li>' + esc(t) + '</li>').join('');
  $('pp-uvod').textContent = TEKST_PRETPOSTAVKE;
  const re = /Inačica|Brzine osi|Upravljač robota|Privjesak|Raspored tipki|TOOL|TCP|Interpolacijski|Status|smartPAD/i;
  $('pretpostavke').innerHTML = pretpostavke().filter((p) => re.test(p.sto)).map((p) => '<li><b>' + esc(p.sto) + (p.vrijednost && p.vrijednost !== '—' ? ': ' + esc(p.vrijednost) : '') + '</b>' + (p.vrsta === 'sukob' ? ' (sukob izvora)' : '') + ' — ' + esc(p.napomena) + '</li>').join('');
  $('inacica').textContent = TEKST_INACICA + ' Simulator koristi: ' + V.oznaka + ' (' + V.generacija + '), upravljač ' + UPRAVLJAC.naziv + ', privjesak ' + PRIVJESAK.naziv + '.';
  $('inacica-krat').textContent = NAZIV_ROBOTA + ', podaci za ' + V.oznaka + ' (vidi napomenu o inačici ispod simulatora)';
  const IZ = ['KSS82', 'WIKI-KRL', 'FZI', 'LARIS', 'BECKHOFF', 'SIXX', 'SPEZ2', 'C5M-MA', 'SPAD-WEB', 'SPAD2-PR', 'URDF', 'FESTO-R14', 'FESTO-MAN'];
  $('izvori').innerHTML = IZ.filter((k) => IZVORI[k]).map((k) => { let host = ''; try { host = new URL(IZVORI[k]).hostname; } catch (e) { host = IZVORI[k]; } return '<li>[' + esc(k) + '] <a href="' + esc(IZVORI[k]) + '" rel="noopener" target="_blank">' + esc(host) + '</a></li>'; }).join('');
  /* podsjetnik */
  const gib = KRL.gibanja.filter((g) => ['PTP', 'LIN', 'CIRC'].includes(g.kod));
  $('krl-pod').innerHTML = '<div class="tab-omot"><table class="tab-sim mala"><thead><tr><th>Naredba</th><th>Što radi</th><th>Primjer (obrazac)</th></tr></thead><tbody>' + gib.map((g) => '<tr><td><b>' + g.kod + '</b></td><td>' + esc(g.opis) + '</td><td><code>' + esc(g.primjer) + '</code></td></tr>').join('') + '</tbody></table></div>' +
    '<p class="pom">Zaglađivanje: ' + KRL.zagladjivanje.map((z) => '<code>' + z.kod + '</code> (' + esc(z.za) + ', ' + z.parametar + ' u ' + z.jedinica + ')').join(', ') + '. Tipovi točaka: ' + KRL.tipovi.slice(0, 5).map(([a, b]) => '<code>' + a + '</code> ' + esc(b)).join('; ') + '.</p>' +
    '<p class="pom">Primjeri redaka: <code>PTP {A1 30, A2 -80, A3 100, A4 0, A5 40, A6 0}</code> · <code>LIN {X 600, Y 0, Z 300, A 0, B 0, C 180} C_DIS</code> · <code>CIRC P3, P4</code> · <code>$VEL.CP = 0.1</code> · <code>$TOOL = TOOL_DATA[1]</code> · <code>$OUT[1]=TRUE</code> · <code>WAIT FOR $IN[2]</code> · <code>WAIT SEC 0.5</code>. Ulazi i izlazi u simulatoru: ' + Object.entries(SIM.ioNazivi.out).map(([n, t]) => '$OUT[' + n + '] ' + esc(t)).join(', ') + '; ' + Object.entries(SIM.ioNazivi.in).map(([n, t]) => '$IN[' + n + '] ' + esc(t)).join(', ') + '.</p>';
}

/* ================================================================== */
/* 17. Povezivanje                                                    */
/* ================================================================== */
ekran.addEventListener('click', (e) => {
  const b = e.target.closest('[data-akcija]'); if (!b || b.disabled) return;
  akcija(b.dataset.akcija, b.dataset);
});
ekran.addEventListener('change', (e) => { const n = e.target.closest('[data-polje]'); if (n && n.dataset.polje === 'mjerAlat') { st.mjer.alat = +n.value; } });
function akcija(a, d = {}) {
  switch (a) {
    case 'tab': st.tab = d.v; dogadaj('tab'); break;
    case 'kljuc': st.odabirNacina = true; break;
    case 'nacin': postaviNacin(d.v); break;
    case 'zatvoriNacin': st.odabirNacina = false; break;
    case 'pogoni':
      if (rucni()) { napomena('U T1 i T2 pogoni se uključuju uređajem za omogućavanje.'); break; }
      if (st.pogoni) pogoniOff(); else if (st.estop || blokirano()) napomena('Najprije otpusti gljivu i potvrdi poruke.'); else { st.pogoni = true; dogadaj('pogoni'); }
      break;
    case 'runmode': if (st.iz && !st.iz.pauza) { napomena('Način izvođenja mijenja se kad program stoji.'); break; } st.runMode = st.runMode === 'GO' ? 'MSTEP' : 'GO'; poruka('info', 'Način izvođenja programa: ' + st.runMode, { kljuc: 'rm' }); dogadaj('runmode'); break;
    case 'potvrdi': potvrdi(+d.v); return;
    case 'potvrdiSve': potvrdiSve(); return;
    case 'porOtv': st.porOtvorene = !st.porOtvorene; break;
    case 'ks': st.ks = d.v; krajJog(); osvjeziJogOznake(); dogadaj('ks'); break;
    case 'tool': if (st.iz && !st.iz.pauza) break; st.tool = +d.v; if (st.tool) st.toolData[0] = { ...NULA }; dogadaj('tool'); break;
    case 'base': if (st.iz && !st.iz.pauza) break; st.base = +d.v; if (st.base) st.baseData[0] = { ...NULA }; dogadaj('base'); break;
    case 'odaberi': odaberi(); return;
    case 'odznaci': odznaci(); return;
    case 'reset': resetPrograma(); return;
    case 'umetni': umetni(d.v); return;
    case 'touchup': touchup(d.v); return;
    case 'out': if (st.nacin !== 'T1' && st.nacin !== 'T2') { napomena('Izlaze ručno mijenjaj u T1 ili T2.'); break; } postaviIzlaz(+d.v, !st.out[+d.v]); break;
    case 'plcStart': if (st.nacin === 'AUT EXT') { if (!st.estop && !blokirano()) { st.pogoni = true; startPritisnut(true); } else napomena('Najprije otpusti gljivu i potvrdi poruke.'); } break;
    case 'stop0': ispitajStop0(); break;
    case 'mjerStart': st.mjer = { aktivno: true, alat: st.mjer.alat, tocke: [null, null, null, null], rez: null }; dogadaj('mjerStart'); break;
    case 'mjerOdustani': st.mjer.aktivno = false; break;
    case 'dovedi': dovedi(+d.v); break;
    case 'mjerTouchup': mjerTouchup(+d.v); break;
    case 'mjerIzr': mjerIzracunaj(); break;
    case 'mjerSpremi': mjerSpremi(); break;
    default: break;
  }
  st.ekranPrljav = true;
}
/* tipke za gibanje (drže se) */
function crtajJog() {
  let h = '';
  for (let i = 0; i < N_JOG; i++) h += '<div class="jg-red' + (i >= 6 ? ' dod' : '') + '"><button type="button" data-jog="' + i + ':-1">−</button><span class="jg-ozn" data-jogozn="' + i + '"></span><button type="button" data-jog="' + i + ':1">+</button></div>';
  $('jog').innerHTML = h;
}
const jogEl = $('jog');
jogEl.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-jog]'); if (!b) return; e.preventDefault(); b.classList.add('drzi'); pocniJog(b.dataset.jog); });
jogEl.addEventListener('keydown', (e) => { const b = e.target.closest('[data-jog]'); if (b && (e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); b.classList.add('drzi'); pocniJog(b.dataset.jog); } });
jogEl.addEventListener('keyup', (e) => { const b = e.target.closest('[data-jog]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); krajJog(); } });
jogEl.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerup', () => { krajJog(); startPusten(); });
document.addEventListener('pointercancel', () => { krajJog(); startPusten(); });
for (const id of ['b-start', 'b-start2']) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('drzi'); startPritisnut(); });
  b.addEventListener('pointerup', () => b.classList.remove('drzi'));
  b.addEventListener('pointerleave', () => b.classList.remove('drzi'));
  b.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); startPritisnut(); } });
  b.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startPusten(); } });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
$('b-stop').addEventListener('click', tipkaStop);
$('b-nazad').addEventListener('click', () => { napomena('Start unatrag simulator ne izvodi.'); poruka('info', 'Start unatrag: u simulatoru nije izveden', { kljuc: 'nazad' }); });
$('b-kljuc').addEventListener('click', () => { st.odabirNacina = true; st.ekranPrljav = true; });
$('gljiva').addEventListener('click', gljiva);
document.querySelectorAll('[data-omog]').forEach((b) => b.addEventListener('click', () => postaviOmog(b.dataset.omog)));
document.querySelectorAll('[data-ov]').forEach((b) => b.addEventListener('click', () => {
  const [k, s] = b.dataset.ov.split(':'), L = SIM.koraciOv; const i = L.indexOf(st[k]); const ni = clamp((i < 0 ? L.findIndex((x) => x >= st[k]) : i) + Number(s), 0, L.length - 1);
  st[k] = L[ni]; st.ekranPrljav = true; dogadaj(k);
}));
$('dalje').addEventListener('click', () => dogadaj('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); });
$('izbornik').addEventListener('click', () => pokreniNiz(null));
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
const prek = (id, f) => $(id).addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); f(on); st.prljavo = true; });
prek('t-okviri', (on) => { okviri.visible = on; tcpTocka.visible = on; });
prek('t-prostor', (on) => model.pomocni.radniProstor(on));
prek('t-dh', (on) => model.pomocni.okviriDH(on));
$('t-putanja').addEventListener('click', obrisiPut);
$('t-vrati').addEventListener('click', () => { if (st.dio.pcb.stanje === 'ruka' || st.dio.osig.some((o) => o.stanje === 'ruka')) { napomena('Prihvatnica drži dio — najprije ga pusti.'); return; } resetDijelova(); });
$('ubrzanje').addEventListener('change', () => { st.ubrzanje = +$('ubrzanje').value; });
controls.addEventListener('change', () => { st.prljavo = true; });

/* ================================================================== */
/* 18. Petlja: simulacija u IPO taktu, prikaz na zahtjev              */
/* ================================================================== */
function korak1(dt) {
  vrijemeSim += dt;
  const q0 = st.q.slice();
  korakKocenja0(dt); korakJog(dt); korakAuto(dt); korakProg(dt); korakDijelova(dt);
  for (let i = 0; i < 6; i++) st.qV[i] = st.kocenje0 ? st.kocenje0.v[i] : (st.q[i] - q0[i]) / dt;
  const v = Math.max(dist3(pT(tcpRob(q0)), pT(tcpRob(st.q))) / dt, 0);
  st.vTcp = st.vTcp * 0.6 + v * 0.4; if (st.vTcp < 1e-4) st.vTcp = 0;
  if (st.singT > 0) { st.singT -= dt; if (st.singT <= 0) ukloni('singUsp'); }
  /* poruka stanja za singularnost zapešća pri mirovanju */
  const s = KIN.singularnost(st.q), giba = st.jog || st.auto || (st.iz && st.iz.gib && !st.iz.pauza);
  if (s.tip === 'zapesce' && giba) { st.singZT = 2; poruka('stanje', 'Upozorenje: ' + opisSing('zapesce'), { kljuc: 'singZ' }); }
  else if (st.singZT > 0) { st.singZT -= dt; if (st.singZT <= 0 || s.tip !== 'zapesce') { st.singZT = 0; ukloni('singZ'); } }
}
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); st.prljavo = true; }
new ResizeObserver(velicina).observe(scenaEl);
let scenaVidljiva = true;
if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver((z) => { scenaVidljiva = z[0].isIntersecting; st.prljavo = true; }).observe(scenaEl);
function iscrtaj() { postavi3D(); controls.update(); renderer.render(scene, camera); st.prljavo = false; }
let rafId = 0, zadnje = performance.now(), akum = 0, zadnjiZivo = 0;
function petlja(t) {
  rafId = 0;
  const dtR = Math.min(0.25, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  akum += dtR * st.ubrzanje;
  let n = 0; while (akum >= SIM.dt && n < 80) { korak1(SIM.dt); akum -= SIM.dt; n++; }
  if (n >= 80) akum = 0;
  if (st.ekranPrljav) crtajEkran();
  else if (t - zadnjiZivo > 100) { zadnjiZivo = t; osvjeziZivo(); }
  const ctrl = controls.update();
  if (scenaVidljiva && (st.prljavo || ctrl)) iscrtaj();
  rafId = requestAnimationFrame(petlja);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; krajJog(); startPusten(); } else if (!rafId) { zadnje = performance.now(); rafId = requestAnimationFrame(petlja); } });

/* pokretanje */
crtajJog(); crtajTekst(); pokreniNiz(null); velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
iscrtaj();
rafId = requestAnimationFrame(petlja);

/* testna kuka */
window.__sim = {
  st, NIZOVI, SIM, KIN, model, camera, controls, renderer, FL,
  get niz() { return niz; }, get korak() { return korak; },
  pokreniNiz, dogadaj, akcija, gljiva, postaviOmog, postaviNacin, potvrdiSve, odaberi, postaviTekst, umetni, touchup,
  dovedi, mjerTouchup, mjerIzracunaj, mjerSpremi, ispitajStop0, iscrtaj, crtajEkran, tcpRob, praviTcp, parsiraj, tipkaStop,
  simuliraj(sek, dt = SIM.dt) { const n = Math.round(sek / dt); for (let i = 0; i < n; i++) korak1(dt); if (st.ekranPrljav) crtajEkran(); else osvjeziZivo(); st.prljavo = true; },
  simulirajDok(uvjet, maxSek = 60) { const n = Math.round(maxSek / SIM.dt); for (let i = 0; i < n; i++) { korak1(SIM.dt); if (uvjet()) { crtajEkran(); st.prljavo = true; return true; } } crtajEkran(); st.prljavo = true; return false; },
  drziJog(spec, sek) { pocniJog(spec); const n = Math.round(sek / SIM.dt); for (let i = 0; i < n && st.jog; i++) korak1(SIM.dt); krajJog(); crtajEkran(); st.prljavo = true; },
  jogDok(spec, uvjet, maxSek = 30) { pocniJog(spec); const n = Math.round(maxSek / SIM.dt); let ok = false; for (let i = 0; i < n && st.jog; i++) { korak1(SIM.dt); if (uvjet()) { ok = true; break; } } krajJog(); crtajEkran(); st.prljavo = true; return ok; },
  start() { startPritisnut(); }, pustiStart() { startPusten(); }
};
