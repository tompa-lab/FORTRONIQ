/* FORTRONIQ · Kobot UR3e — Upoznavanje robota (3D).
   Izbornik dio po dio, rastavljanje zgloba, unutrašnjost, pomicanje zglobova i animacije „Kako radi” (teme_ur.js).
   Tekst, model i sučelje su naši; podaci iz službenih dokumenata Universal Robots (popis izvora na stranici).
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviUR3e, POLOZAJI, NAZIVI_ZGLOBOVA, POLUMJER } from './ur3e_model.js?v=01';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = (...r) => r.map((t) => '<p>' + t + '</p>').join('');
const NEPOZNATO = 'UR ne objavljuje — prikaz je načelni.';

/* ================================================================== */
/* 1. Sadržaj izbornika                                               */
/* ================================================================== */
const ZGL = [
  { hr: 'baza', v: 2, M: 54, opseg: '±360°', brzina: '±180 °/s', vijci: '3× M3', D: 90,
    tekst: P('Zglob Base okreće cijelu ruku oko okomite osi postolja. To je zglob veličine 2 — najveće izvedbe u robotu — s najvećim momentom 54 Nm, opsegom ±360° i najvećom brzinom ±180 °/s.',
      'Moment je moment samog zgloba: dio ga troši vlastita masa i ubrzanje ruke, pa nije sav na raspolaganju za teret. Svih šest zglobova UR-a građeno je na isti način — motor, valni prijenosnik, kočnica, dva enkodera i elektronika u zajedničkom kućištu sa šupljom sredinom za kabele — razlikuju se veličinom.',
      'Odaberi dio u podizborniku ili klikni „Rastavi zglob” ispod prikaza.') },
  { hr: 'rame', v: 2, M: 54, opseg: '±360°', brzina: '±180 °/s', vijci: '3× M3', D: 90,
    tekst: P('Zglob Shoulder (rame) diže i spušta nadlakticu oko vodoravne osi. I on je veličine 2, s najvećim momentom 54 Nm, opsegom ±360° i najvećom brzinom ±180 °/s.',
      'Rame je gravitacijom najopterećeniji zglob: drži masu cijele ruke i tereta na najvećem kraku, pa pri vodoravno ispruženoj ruci troši najviše momenta samo za držanje. Zato su Base i Shoulder najveći zglobovi u robotu.',
      'Pri vrtnji ramena gibaju se nadlaktica, podlaktica i cijela šaka — pokreni „Pomakni zglob” i pogledaj.') },
  { hr: 'lakat', v: 1, M: 28, opseg: '±360° / ±160°', brzina: '±180 °/s', vijci: '3× M3', D: 75,
    tekst: P('Zglob Elbow (lakat) okreće podlakticu prema nadlaktici. Veličine je 1, s najvećim momentom 28 Nm i najvećom brzinom ±180 °/s.',
      'Za opseg se izvori ne slažu: list podataka UR3e navodi ±360°, a priručnik PolyScope 5 za UR3e ±160°. Prije programiranja provjeri ograničenje zgloba u svom robotu (Installation → Safety → Joint Limits).',
      'Lakat i rame zajedno određuju doseg robota: kad su nadlaktica i podlaktica u pravcu, alat je najdalje od osi postolja.') },
  { hr: 'zglob šake 1', v: 0, M: 9, opseg: '±360°', brzina: '±360 °/s', vijci: '3× M2,5', D: 63,
    tekst: P('Wrist 1 (zglob šake 1) prvi je od triju zglobova šake. Os mu je usporedna s osima ramena i lakta, pa naginje šaku u istoj ravnini u kojoj se gibaju nadlaktica i podlaktica.',
      'Zglobovi šake najmanje su veličine 0: najveći moment 9 Nm, opseg ±360°, a najveća brzina ±360 °/s — dvostruko veća od velikih zglobova, jer nose malu masu.',
      'Tri usporedne osi (Shoulder, Elbow, Wrist 1) posebnost su UR-ove kinematike; vidi ih uključivanjem „osi zglobova”.') },
  { hr: 'zglob šake 2', v: 0, M: 9, opseg: '±360°', brzina: '±360 °/s', vijci: '3× M2,5', D: 63,
    tekst: P('Wrist 2 (zglob šake 2) okreće šaku oko osi okomite na os Wrist 1. Veličine je 0, s najvećim momentom 9 Nm, opsegom ±360° i najvećom brzinom ±360 °/s.',
      'Kad je kut Wrist 2 jednak 0° ili ±180°, osi Wrist 1 i Wrist 3 postanu usporedne: dvije osi tada rade isto gibanje i kutovi zglobova ne mogu se jednoznačno izračunati iz položaja alata. To je singularni položaj zapešća, kojemu se pri programiranju pravocrtnih gibanja treba kloniti.') },
  { hr: 'zglob šake 3', v: 0, M: 9, opseg: 'beskonačno', brzina: '±360 °/s', vijci: '3× M2,5', D: 63,
    tekst: P('Wrist 3 (zglob šake 3) zadnji je zglob: okreće prirubnicu alata oko njezine osi. Veličine je 0, s najvećim momentom 9 Nm i najvećom brzinom ±360 °/s, a opseg mu je prema listu podataka beskonačan.',
      'Zglob se dakle može okretati bez kraja — ali kabeli alata se pritom namataju, pa u programu pazi koliko okreta stvarno treba.',
      'Uz njega su senzor sile i momenta, prirubnica alata ISO 9409-1-50-4-M6 i alatni priključak M8.') }
];
function podaciZgloba(i) {
  const z = ZGL[i];
  return '<dl class="uz-pod"><dt>Veličina</dt><dd>' + z.v + '</dd><dt>Najveći moment</dt><dd>' + z.M + ' Nm</dd><dt>Opseg</dt><dd>' + z.opseg + '</dd><dt>Najveća brzina</dt><dd>' + z.brzina + '</dd><dt>Promjer kućišta (procjena)</dt><dd>≈ ' + z.D + ' mm</dd></dl>';
}
const PODTEKST = {
  kuciste: (n, i) => P('Kućište zgloba ' + n + ' je aluminijski valjak u kojemu su svi dijelovi pogona. S jedne strane zatvara ga plavosivi poklopac pričvršćen s tri vijka (' + ZGL[i].vijci + '), a uz izlazni kraj je tanki tamni prsten.',
    'Ispod poklopca su elektronika i priključci za napajanje (dva tipa, jedan s bravicom) i komunikaciju. Sredina zgloba je šuplja, pa kabeli prema sljedećim zglobovima prolaze kroz nju.',
    'Promjer kućišta u modelu (≈ ' + ZGL[i].D + ' mm) je naša procjena prema veličini zgloba; unutarnje mjere zgloba ' + NEPOZNATO),
  motor: (n, i) => P('Pogon zgloba ' + n + ' je elektromotor bez četkica (BLDC/PMSM) ugrađen izravno u kućište: stator s namotima pričvršćen je za kućište, a rotor s trajnim magnetima sjedi na šupljem vratilu.',
    'Elektronika uključuje struju u namote ovisno o kutu rotora (komutacija), koji javlja enkoder motora. Motor se vrti brzo i s malim momentom; tek valni prijenosnik iza njega daje izlazni moment zgloba — za ' + n + ' najviše ' + ZGL[i].M + ' Nm.',
    'Tip, snaga i broj polova motora: ' + NEPOZNATO + ' Kad pokreneš „Pomakni zglob”, rotor u modelu vrti se sto puta brže od izlaza.'),
  prijenosnik: (n, i) => P('Valni (harmonični, „strain wave”) prijenosnik u jednom stupnju smanjuje brzinu motora i povećava moment, bez zračnosti. Ima tri dijela: generator vala na vratilu motora, fleksibilni zupčanik (flexspline) i kruti prsten s unutarnjim zubima (circular spline).',
    'Flexspline ima dva zuba manje od prstena, pa za jedan okret generatora zaostane za dva zuba. Prijenosni omjer je i = z<sub>flex</sub> / (z<sub>circ</sub> − z<sub>flex</sub>), npr. 200 / (202 − 200) = 100.',
    'Harmonic Drive objavio je da je UR-ovim robotima isporučivao zupčanike serije HFUS-2SH, jednostupanjske, omjera 100:1, bez zračnosti, na svih šest osi (izvorno za UR5). Za UR3e točna serija i omjer nisu objavljeni.'),
  generatorVala: (n, i) => P('Generator vala je eliptični disk (kulisa) na vratilu motora, s tankostijenim kugličnim ležajem navučenim na njega. Ležaj se pritom i sam deformira u elipsu.',
    'Generator je umetnut u flexspline i tlači ga u elipsu, pa zubi flexsplinea zahvaćaju zube prstena samo na dva suprotna mjesta — na velikoj osi elipse. Kad se generator okreće, mjesta zahvata putuju po obodu: to je „val” po kojemu prijenosnik ima ime.',
    'Mjere generatora u zglobu ' + n + ': ' + NEPOZNATO),
  flexspline: (n, i) => P('Flexspline je tankostijena čelična čaša s vanjskim zubima na otvorenom rubu. Stijenka je toliko tanka da se pri svakom okretu generatora elastično deformira, a dno čaše spojeno je s izlazom zgloba.',
    'Ima dva zuba manje od circular splinea (npr. 200 prema 202). Budući da je zahvat prednapregnut i istodobno zahvaća više zuba, prijenos nema zračnosti.',
    'U modelu je zuba manje nego u stvarnosti, da se vide pojedinačno.'),
  circularSpline: (n, i) => P('Circular spline je kruti čelični prsten s unutarnjim zubima. U njega zahvaćaju zubi flexsplinea na dva mjesta, na velikoj osi elipse.',
    'Budući da prsten ima dva zuba više, flexspline pri svakom okretu generatora zaostane za dva zuba — tako nastaje velik prijenosni omjer u malom prostoru.',
    'U našem prikazu prsten je pričvršćen vijcima za kućište, a okreće se flexspline s izlazom; koji je dio u UR-ovu zglobu nepomičan, ' + NEPOZNATO),
  kocnica: (n, i) => P('Kočnica drži zglob kad robot nije pod napajanjem. Na vratilu motora je krilce — prsten sa zubima — koje pri isključenju udari u zatik (brake pin) koji se izvuče iz elektromagneta.',
    'Krilce nije čvrsto spojeno s vratilom nego preko tarne spojke, pa se zglob pri vrlo velikom momentu ipak može prisilno zakrenuti — samo u nuždi i ne više od 160°. Zato se pri guranju zakočenog robota čuje „klik” i zglob se malo pomakne.',
    'Pri pokretanju robota (Brake release) kočnice se otpuštaju uz vidljiv mali trzaj zglobova, a upravljanje ih pritom testira; kvar javlja porukom „Brake test failed… check brakepin”.'),
  enkoderMotora: (n, i) => P('Enkoder motora mjeri kut zakreta rotora: disk s finom podjelom vrti se s vratilom, a pločica s čitačem stoji uz njega.',
    'Iz njegova signala elektronika zna kad treba prebaciti struju na sljedeći namot (komutacija) i kolika je brzina motora. Greške ovog enkodera PolyScope javlja porukama poput „Motor encoder index missing”, „Motor encoder index drift” ili „not calibrated”.',
    'Princip očitavanja (optički ili magnetski) i razlučivost: ' + NEPOZNATO),
  enkoderZgloba: (n, i) => P('Enkoder zgloba (izlazni enkoder) mjeri stvarni kut zgloba iza prijenosnika — u modelu veći prsten na izlazu i čitač na kućištu.',
    'Upravljanje stalno uspoređuje njegov kut s kutom koji proizlazi iz enkodera motora i prijenosnog omjera; razlika otkriva kvar, proklizavanje ili udarac. Greške se javljaju kao „Joint encoder warning/error” ili „Sudden position change detected on the joint-encoder”.',
    'Izvedba i smještaj enkodera zgloba ' + n + ': ' + NEPOZNATO),
  elektronika: (n, i) => P('Elektronika zgloba ' + n + ' upravlja motorom izravno u zglobu: upravljački sklop motora na pločicama u zglobu napaja namote prema kutu rotora i zadanoj vrijednosti iz ormara.',
    'Zglob s upravljačkim ormarom razmjenjuje zadane i stvarne vrijednosti, a upravljanje računa gibanje 500 puta u sekundi (500 Hz). Pločice su ispod plavog poklopca, uz priključke za napajanje i komunikaciju.',
    'Broj, raspored i sastav pločica u modelu: ' + NEPOZNATO)
};
const PODSTAVKE = [
  ['kuciste', 'Kućište i poklopac', 'Joint housing and lid', (i) => ['zglob' + i, 'poklopac' + i], 'zglobSklop', false],
  ['motor', 'Motor', 'Motor', (i) => ['motor' + i], 'motor', true],
  ['prijenosnik', 'Valni prijenosnik', 'Strain wave gear', (i) => ['prijenosnik' + i, 'generatorVala' + i, 'flexspline' + i, 'circularSpline' + i], 'valni', true],
  ['generatorVala', 'Generator vala', 'Wave generator', (i) => ['generatorVala' + i], 'valni', true, 3],
  ['flexspline', 'Flexspline', 'Flexspline', (i) => ['flexspline' + i], 'valni', true, 3],
  ['circularSpline', 'Circular spline', 'Circular spline', (i) => ['circularSpline' + i], 'valni', true, 3],
  ['kocnica', 'Kočnica', 'Brake', (i) => ['kocnica' + i, 'zatik' + i], 'kocnica', true],
  ['enkoderMotora', 'Enkoder motora', 'Motor encoder', (i) => ['enkoderMotora' + i], 'enkoderi', true],
  ['enkoderZgloba', 'Enkoder zgloba', 'Joint encoder', (i) => ['enkoderZgloba' + i], 'enkoderi', true],
  ['elektronika', 'Elektronika', 'Joint electronics', (i) => ['elektronika' + i], 'regulacija', true]
];

const MENI = [];
function stavka(razina, naziv, engl, ids, tekst, tema, extra = {}) { MENI.push(Object.assign({ n: MENI.length + 1, razina, naziv, engl, ids, tekst, tema }, extra)); }

stavka(0, 'Upoznavanje robota', 'Getting to know the robot', [],
  P('Ovo je suradnički robot (kobot) Universal Robots UR3e: šest rotacijskih zglobova, nosivost 3 kg i doseg 500 mm. U izborniku odaberi dio — model se okrene prema njemu i istakne ga, a ovdje dobiješ objašnjenje.',
    'Svaki zglob možeš rastaviti i pogledati iznutra: motor, valni prijenosnik, kočnicu, dva enkodera i elektroniku. Stavke sa strelicom otvaraju podizbornik; gdje postoji gumb „Kako radi”, otvara se animacija načela rada.',
    'Uz pregledanu stavku pojavi se kvačica, pa uvijek znaš što si već prošao.'), null, { pogled: 'sve' });
stavka(1, 'Cijeli robot', 'Complete robot', [],
  P('UR3e je najmanji robot serije e-Series: masa s kabelom 11,2 kg, nosivost 3 kg, doseg 500 mm, ponovljivost ±0,03 mm (ISO 9283) i najveća brzina alata 3 m/s.',
    'Građen je od šest zglobova iste koncepcije u tri veličine, povezanih aluminijskim cijevima; materijali su aluminij, plastika i čelik, zaštita IP54, buka manja od 60 dB(A). Uz robot su upravljački ormar i privjesak za učenje.',
    'Ugrađene sigurnosne funkcije (ograničenje sile, brzine, snage i položaja) omogućuju rad uz čovjeka, uz procjenu rizika za svaku primjenu. Gumbima ispod prikaza promijeni položaj robota ili pokreni pojedini zglob.'), 'kinematikaDH', { pogled: 'robot' });
stavka(1, 'Postolje i kabel', 'Base mounting and robot cable', ['baza', 'kabelRobota'],
  P('Postolje je okrugla montažna prirubnica promjera 128 mm kojom se robot vijcima pričvrsti za stol, postolje ili stroj. Robot se smije montirati u bilo kojem položaju — na pod, zid ili strop.',
    'Položaj montaže upisuje se u instalaciju u PolyScopeu, da upravljanje ispravno računa utjecaj gravitacije. Iz boka postolja izlazi kabel robota duljine 6 m koji ga spaja s upravljačkim ormarom.',
    'Kabel ne smije biti napregnut, prignječen ni oštro savijen; vodi ga tako da ga robot pri gibanju ne može zahvatiti.'), null, { pogled: 'robot' });
for (let i = 0; i < 6; i++) {
  const n = NAZIVI_ZGLOBOVA[i];
  stavka(1, 'Zglob ' + n, 'Joint ' + n + ' (' + ZGL[i].hr + ')', ['zglob' + i, 'poklopac' + i], ZGL[i].tekst + podaciZgloba(i), 'zglobSklop', { zglob: i });
  PODSTAVKE.forEach(([k, naziv, engl, ids, tema, unutra, raz]) => {
    stavka(raz || 2, naziv, engl + ' — ' + n, ids(i), PODTEKST[k](n, i), tema, { zglob: i, unutra, kljuc: k });
  });
}
stavka(1, 'Cijev nadlaktice', 'Upper arm tube', ['cijevNadlaktice'],
  P('Nadlaktica je aluminijska cijev između ramena i lakta, s konusnim prijelazima na krajevima. Razmak osi ramena i lakta je DH parametar a<sub>2</sub> = −243,55 mm.',
    'Kroz cijev prolaze kabeli prema laktu i šaci. Mora biti kruta, jer svaki njezin progib pomiče alat. U UR-ovim dinamičkim podacima masa drugog članka (rame s nadlakticom) je 3,4445 kg.',
    'Promjer cijevi i njezin pomak od osi u modelu su naša procjena.'), null, {});
stavka(1, 'Cijev podlaktice', 'Forearm tube', ['cijevPodlaktice'],
  P('Podlaktica je tanja aluminijska cijev između lakta i zgloba Wrist 1. Razmak njihovih osi je DH parametar a<sub>3</sub> = −213,2 mm; zajedno s nadlakticom određuje doseg od 500 mm.',
    'Masa trećeg članka (lakat s podlakticom) u UR-ovim dinamičkim podacima je 1,437 kg — manja masa na kraju ruke znači manji moment u ramenu i laktu.',
    'Promjer cijevi i njezin pomak od osi u modelu su naša procjena.'), null, {});
stavka(1, 'Prirubnica alata', 'Tool flange', ['prirubnica'],
  P('Prirubnica alata izvedena je po normi EN ISO 9409-1-50-4-M6: četiri provrta s navojem M6 na promjeru 50 mm i provrt za zatik koji određuje kutni položaj alata.',
    'Na nju se pričvršćuju hvataljka, usisna glava ili drugi alat. Ishodište alatnog koordinatnog sustava bez alata je u središtu prirubnice, a os z gleda iz prirubnice prema van.',
    'Kad montiraš alat, u instalaciji upisuješ njegov TCP i masu tereta (TCP, Payload). Uključi „DH okviri” i pogledaj okvir na prirubnici.'), null, {});
stavka(1, 'Senzor sile i momenta', 'Force/torque sensor', ['ftSenzor'],
  P('UR3e ima senzor sile i momenta (F/T) ugrađen iza prirubnice alata. Mjeri sile do ±30 N (preciznost ±2,0 N, točnost ±3,5 N) i momente do ±10 Nm (preciznost i točnost ±0,1 Nm) u smjeru triju osi.',
    'Koristi se u zadacima u kojima robot mora osjetiti dodir ili zadanom silom pritiskati — npr. umetanje, spajanje ili praćenje plohe.',
    'Građa senzora (mjerni elementi i njihov raspored): ' + NEPOZNATO + ' U modelu je prikazan kao prsten.'), 'ftsenzor', {});
stavka(1, 'Alatni priključak', 'Tool I/O connector', ['alatniPrikljucak'],
  P('Alatni priključak na boku zadnjeg zgloba je ženski konektor M8 s 8 polova. Daje alatu napajanje 12 V ili 24 V do 600 mA, 2 digitalna ulaza, 2 digitalna izlaza i 2 analogna ulaza (0–10 V ili 4–20 mA).',
    'Umjesto digitalnih izlaza može se uključiti „Dual Pin Power” za jači alat, a za pametne alate postoji sučelje RS-485 (Tool Communication Interface) — tada analogni ulazi nisu dostupni.',
    'Raspored pinova i boje žica ovdje nisu prikazani jer nisu provjereni — za spajanje uvijek koristi priručnik.'), 'alatniIO', {});
stavka(1, 'Upravljački ormar', 'Control Box', ['ormar'],
  P('Upravljački ormar (Control Box) serije e-Series ima mjere 460 × 449 × 254 mm, masu 12 kg i zaštitu IP44; kućište je od prašno lakiranog čelika. Napaja se iz mreže 100–240 V AC, 47–440 Hz.',
    'U njemu su izvor napajanja, upravljačka i sigurnosna ploča, Energy Eater, računalo s PolyScopeom, priključnice za ulaze i izlaze te ventilatori s filtrima. Upravljanje računa gibanje frekvencijom 500 Hz.',
    'Kad odabereš ormar ili njegov dio, vrata se u modelu otvore. Raspored dijelova u modelu je naš, načelni.'), 'ormar', { ormar: true, pogled: 'ormar' });
const ORM = [
  ['Izvor napajanja', 'Power supply', ['napajanje'], P('Izvor napajanja pretvara mrežni izmjenični napon u istosmjerni napon za robot i elektroniku ormara; robot troši najviše 300 W. Na ulazu je osigurač 10 A.',
    'Iz ormara se napajaju i ulazi i izlazi stanice: interno 24 V do 2 A, a za veće potrošače spaja se vanjsko napajanje 24 V do 6 A.', 'Napone i struje samog izvora UR u listu podataka ne navodi — prikaz je načelni.'), 'ormar'],
  ['Upravljačka ploča', 'Control Board', ['upravljackaPloca'], P('Upravljačka ploča (Control Board) povezuje računalo s robotom i s ulazima i izlazima: zglobovima prosljeđuje zadane vrijednosti gibanja i vraća njihove stvarne vrijednosti, 500 puta u sekundi.',
    'Na nju su spojeni digitalni i analogni ulazi i izlazi te četiri kvadraturna ulaza, npr. za enkoder pokretne trake.', 'Klikni „Kako radi” i pogledaj kaskadnu regulaciju položaj – brzina – struja.'), 'regulacija'],
  ['Sigurnosna ploča', 'Safety Control Board', ['sigurnosnaPloca'], P('Sigurnosna ploča (Safety Control Board) nadzire sigurnosne funkcije robota: nužno i zaštitno zaustavljanje, granice položaja, brzine, sile, količine gibanja i snage.',
    'Sigurnosni ulazi i izlazi su u parovima (redundantno), da kvar jednog kanala ne isključi zaštitu; sustav ispunjava PLd, kategorija 3 (EN ISO 13849-1).', 'LED-ice na ploči (Power, Safety A/B, FPGA) pokazuju njezino stanje i pomažu pri traženju kvara.'), 'sigurnost'],
  ['Energy Eater', 'Energy Eater', ['energyEater'], P('Kad robot koči, motori rade kao generatori i vraćaju energiju u napajanje. Servisni priručnik spominje sklop Energy Eater, ali ne opisuje njegovu funkciju.',
    'Prema nazivu i uobičajenoj izvedbi to je sklop s otpornikom koji tu energiju pretvara u toplinu, da napon napajanja ne poraste previše — to je naše tumačenje, ne podatak proizvođača. Zato je u modelu prikazan na hladnjaku s rebrima.'), 'ormar'],
  ['Računalo', 'Computer', ['racunalo'], P('Računalo u ormaru izvodi PolyScope — grafičko sučelje i izvođenje programa — na Linuxu, te URScript.',
    'Na njega su vezani privjesak za učenje, Ethernet 1 Gb/s (Modbus TCP, EtherNet/IP, PROFINET, PROFIsafe, ROS/ROS2), USB 2.0 i 3.0 za prijenos programa i Mini DisplayPort.', 'Izvedba računala (procesor, memorija): ' + NEPOZNATO), null],
  ['I/O priključnice', 'I/O terminals', ['ioPrikljucnice'], P('Na priključnicama ormara su 16 digitalnih ulaza, 16 digitalnih izlaza, 2 analogna ulaza, 2 analogna izlaza, 4 kvadraturna ulaza i napajanje 24 V, te sigurnosni ulazi i izlazi u parovima.',
    'Na njih se spajaju senzori, ventili, PLC i sigurnosni uređaji stanice, npr. vanjske gljive za nužno zaustavljanje.', 'Raspored i boje stezaljki u modelu su načelni — za spajanje uvijek koristi priručnik.'), null],
  ['Ventilatori s filtrima', 'Fans and filters', ['ventilatori'], P('Ventilatori na bočnim stranama ormara tjeraju zrak kroz ormar i odvode toplinu elektronike. Ispred njih su filtri koji zadržavaju prašinu.',
    'Zaprljan filtar smanjuje protok zraka, pa se elektronika pregrijava — filtre redovito pregledaj i očisti ili zamijeni. Ormar je zaštite IP44, pa ne smije stajati gdje ga može poprskati mlaz vode.'), null]
];
ORM.forEach(([naziv, engl, ids, tekst, tema]) => stavka(2, naziv, engl, ids, tekst, tema, { ormar: true, pogled: 'ormar' }));
stavka(1, 'Privjesak za učenje', 'Teach Pendant', ['privjesak'],
  P('Privjesak za učenje (Teach Pendant) je korisničko sučelje robota: dodirni zaslon 12″ (1280 × 800) s PolyScopeom, gljiva za nužno zaustavljanje i gumb za slobodno vođenje.',
    'Mjere su 300 × 231 × 50 mm, masa 1,6 kg, zaštita IP54, a kabel je dug 4,5 m. Postoji i inačica s tri-položajnim uređajem za omogućavanje (3PE) za rad u ručnom načinu.',
    'Na privjesku se programira točkama puta, pokreće program i podešavaju instalacija i sigurnost.'), null, { pogled: 'privjesak' });
[['Dodirni zaslon', 'Touch screen', ['zaslonPrivjeska'], P('Zaslon prikazuje PolyScope s karticama Run, Program, Installation, Move, I/O i Log. U kartici Program slažeš naredbe MoveJ, MoveL, MoveP, Waypoint, Wait, Set, Loop i If; program se može pisati i u URScriptu.',
    'U kartici Move robot pomičeš po zglobovima ili po alatu, u koordinatnim sustavima Base, Tool ili Feature. MoveJ je zglobno i najbrže gibanje, MoveL pravocrtno po alatu, a MoveP stalnom brzinom s kružnim prijelazima.',
    'Slika zaslona u modelu je naš pojednostavljeni crtež, ne stvarno sučelje.'), null, 'privjesak'],
 ['Gljiva za nužno zaustavljanje', 'Emergency stop', ['gljivaPrivjeska'], P('Gljiva za nužno zaustavljanje (E-stop) pokreće sigurnosnu funkciju SF1 — zaustavljanje kategorije 1: robot se kontrolirano zaustavi, a zatim se motorima isključi napajanje.',
    'Gljiva ostaje u pritisnutom položaju dok je ručno ne otpustiš; nakon toga robot se ponovno pokreće s privjeska. Vanjske gljive stanice spajaju se na sigurnosne ulaze u ormaru.'), 'zaustavljanje', 'privjesak'],
 ['Gumb Freedrive', 'Freedrive button', ['freedriveGumb'], P('Gumb Freedrive na stražnjoj strani privjeska uključuje slobodno vođenje: dok ga držiš, robot možeš voditi rukom — upravljanje kompenzira gravitaciju, pa se zglobovi gibaju s malim otporom.',
    'Slobodno vođenje može se ograničiti: sve osi slobodne, samo ravnina, samo translacija ili samo rotacija. Tako se alat brzo dovede do točke puta, koja se zatim spremi u program.'), 'freedrive', 'privjesakStraga'],
 ['Tri-položajni uređaj (3PE)', 'Three-position enabling device', ['tripolozajni'], P('Tri-položajni uređaj za omogućavanje (3PE) ima tri položaja: pušten, lagano pritisnut i jako pritisnut. Samo u srednjem položaju robot se smije gibati u ručnom načinu; ako ga pustiš ili u strahu stisneš do kraja, robot se zaustavi.',
    'U ručnom načinu brzina TCP-a ograničena je na 250 mm/s. Na inačici privjeska s 3PE uređaj je na stražnjoj strani; nadziru ga sigurnosne funkcije SF18–SF20.'), 'tripolozajni', 'privjesakStraga']
].forEach(([naziv, engl, ids, tekst, tema, pogled]) => stavka(2, naziv, engl, ids, tekst, tema, { pogled }));
stavka(1, 'Sigurnost', 'Safety', [],
  P('Kobot radi uz ljude, pa mu je sigurnost ugrađena u upravljanje: 23 podesive sigurnosne funkcije, izvedene redundantno, s razinom PLd, kategorija 3 (EN ISO 13849-1), u skladu s EN ISO 10218-1.',
    'Funkcije nadziru položaj, brzinu, silu, količinu gibanja, snagu te vrijeme i put zaustavljanja. Granice se podešavaju u instalaciji (Installation → Safety) i štite lozinkom.',
    'Ugrađena sigurnost ne zamjenjuje procjenu rizika cijele primjene — oštar alat ili težak teret mogu biti opasni i pri maloj sili robota.'), 'sigurnost', { pogled: 'robot' });
stavka(2, 'Sigurnosne funkcije', 'Safety functions', [],
  '<p>Važnije sigurnosne funkcije UR3e (u zagradi tolerancija ili kategorija zaustavljanja):</p><ul>' +
  ['SF1 nužno zaustavljanje (kategorija 1)', 'SF2 zaštitno zaustavljanje (kategorija 2)', 'SF3 granice položaja zglobova (5°)', 'SF4 granice brzine zglobova', 'SF5 granice položaja TCP-a i sigurnosne ravnine (40 mm)', 'SF6 brzina TCP-a i lakta (50 mm/s)', 'SF7 sila TCP-a (25 N)', 'SF8 količina gibanja (3 kg·m/s)', 'SF9 snaga (10 W)', 'SF15 vrijeme zaustavljanja (50 ms)', 'SF16 put zaustavljanja (40 mm)', 'SF17 sigurni početni položaj', 'SF18–SF20 tri-položajni uređaj (3PE)', 'SF21 ograničenje momenta stezanja na zapešću'].map((t) => '<li>' + t + '</li>').join('') +
  '</ul>' + P('U ručnom načinu brzina TCP-a je najviše 250 mm/s. Tvornički granični moment zgloba izaziva zaustavljanje kategorije 0.'), 'sigurnost', { pogled: 'robot' });
stavka(2, 'Kategorije zaustavljanja', 'Stop categories', [],
  '<ul><li><b>Kategorija 0</b> — motorima se odmah isključi napajanje i zatvore kočnice; robot staje bez kontrole putanje.</li><li><b>Kategorija 1</b> — robot se kontrolirano zaustavi na putanji, a tek tada se isključi napajanje motora.</li><li><b>Kategorija 2</b> — robot se kontrolirano zaustavi, a napajanje pogona ostaje uključeno, pa može nastaviti bez ponovnog pokretanja.</li></ul>' +
  P('Nužno zaustavljanje (SF1) je kategorije 1, zaštitno zaustavljanje (SF2) kategorije 2, a prekoračenje tvorničkog graničnog momenta zgloba izaziva kategoriju 0. Klikni „Kako radi” i usporedi ih.'), 'zaustavljanje', { pogled: 'robot' });
stavka(1, 'Podaci o robotu', 'Robot data', [],
  P('Ispod 3D prikaza je tablica s osnovnim podacima robota, zglobova, upravljačkog ormara i privjeska te DH parametri i mase članaka, sa svakim podatkom povezanim s izvorom.',
    'Za lakat su navedena oba podatka o opsegu, jer se list podataka (±360°) i priručnik PolyScope 5 (±160°) ne slažu. Klikni „Kako radi” za shemu DH okvira.'), 'kinematikaDH', { sekcija: 'podaci', pogled: 'robot' });
const UKUPNO = MENI.length;

/* ================================================================== */
/* 2. Scena                                                           */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.09; controls.maxDistance = 6; controls.minDistance = 0.08;
/* okolina za metale: gradijent svijetlo gore, sivo dolje (bez vanjskih tekstura) */
{
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  const g = new THREE.SphereGeometry(5, 32, 16), boje = [], c = new THREE.Color();
  const pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) { const y = pos.getY(k) / 5; c.setRGB(0.55 + 0.4 * Math.max(0, y), 0.58 + 0.38 * Math.max(0, y), 0.62 + 0.35 * Math.max(0, y)); if (y < 0) c.multiplyScalar(0.75 + 0.25 * (1 + y)); boje.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(boje, 3));
  es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  scene.environment = pm.fromScene(es, 0.04).texture; scene.environmentIntensity = 0.55;
}
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.95));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(1.2, 2.6, 1.8); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-2, 1.2, -1.6); scene.add(sun2);
const sun3 = new THREE.DirectionalLight(0xffffff, 0.3); sun3.position.set(-0.5, 0.4, 2.5); scene.add(sun3);
/* pod */
let pod;
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(120,140,150,0.42)'); gr.addColorStop(0.7, 'rgba(120,140,150,0.16)'); gr.addColorStop(1, 'rgba(120,140,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  pod = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pod.rotation.x = -Math.PI / 2; pod.position.set(0.3, -0.001, 0); scene.add(pod);
}
const R = napraviUR3e(THREE);
scene.add(R.korijen);
const q = POLOZAJI.pocetni.slice();
R.postavi(q);

/* svi meshevi i njihovi dijelovi (bez pomoćnih osi i okvira) */
const SVI = [];
R.korijen.traverse((o) => { if (o.isMesh && !(o.parent && (o.parent.isLine || o.parent.isLineSegments))) { o.userData.m0 = o.material; SVI.push(o); } });
function dioOd(o) { let p = o; while (p) { if (p.userData && p.userData.dio) return p.userData.dio; p = p.parent; } return null; }
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
function meshevi(ids) { const s = new Set(); ids.forEach((id) => { const d = R.dijelovi.get(id); if (d) d.objekti.forEach((ob) => ob.traverse((o) => { if (o.isMesh && o.userData.m0) s.add(o); })); }); return s; }
const naziv = (id) => (R.dijelovi.get(id) || {}).naziv || id;
/* unutrašnjost ormara (skriva se dok su vrata zatvorena) i dijelovi izvan robota (skrivaju se kad je u fokusu zglob) */
const ORMAR_UNUTRA = meshevi(['napajanje', 'upravljackaPloca', 'sigurnosnaPloca', 'energyEater', 'racunalo', 'ioPrikljucnice']);
const IZVAN_ROBOTA = new Set(); [R.ormar && R.ormar.grupa, R.privjesak && R.privjesak.parent, R.kabel].forEach((g) => { if (g) g.traverse((o) => { if (o.isMesh) IZVAN_ROBOTA.add(o); }); });
SVI.forEach((o) => { if (o.userData.dioId === 'privjesak') IZVAN_ROBOTA.add(o); });

/* materijali za isticanje i poluprozirnost (po izvornom materijalu) */
const hiMat = new Map(), duhMat = new Map(), pomMat = new Map();
function izvedeni(map, m0, fn) { let m = map.get(m0.uuid); if (!m) { m = m0.clone(); fn(m); map.set(m0.uuid, m); } return m; }
const HI = (m0) => izvedeni(hiMat, m0, (m) => { if (m.emissive) { m.emissive = new THREE.Color(0x2ecad4); m.emissiveIntensity = 0.14; } });
const DUH = (m0) => izvedeni(duhMat, m0, (m) => { m.transparent = true; m.opacity = Math.min(m.opacity, 0.08); m.depthWrite = false; if (m.emissive) m.emissive.setHex(0); });
const duh2Mat = new Map();
const DUH2 = (m0) => izvedeni(duh2Mat, m0, (m) => { m.transparent = true; m.opacity = Math.min(m.opacity, 0.2); m.depthWrite = false; if (m.emissive) m.emissive.setHex(0); });
const POM = (m0) => izvedeni(pomMat, m0, (m) => { if (m.emissive) { m.emissive = new THREE.Color(0xf2a51a); m.emissiveIntensity = 0.32; } });
const rubMat = new THREE.LineBasicMaterial({ color: 0x17a8b4, transparent: true, opacity: 0.85 });
const rubovi = [];

/* ================================================================== */
/* 3. Stanje stranice                                                  */
/* ================================================================== */
const st = { akt: 1, otvoreni: new Set(), sel: new Set(), prikaz: 'sve', prozirno: true, pom: new Set(), zglob: 1, unutra: false, autoUnutra: false,
  rastav: -1, tR: [0, 0, 0, 0, 0, 0], ormarCilj: 0, temaKljuc: null, fokus: new Set() };
const vidjeni = new Set();
try { JSON.parse(localStorage.getItem('ftq-ur3e-upoznavanje') || '[]').forEach((x) => vidjeni.add(+x)); } catch (e) { /* bez spremanja */ }
function spremi() { try { localStorage.setItem('ftq-ur3e-upoznavanje', JSON.stringify([...vidjeni])); } catch (e) { /* bez spremanja */ } }
let crtati = true;
function trazi() { crtati = true; }

function osvjeziIzgled() {
  trazi();
  rubovi.splice(0).forEach((l) => { l.parent && l.parent.remove(l); l.geometry.dispose(); });
  const ima = st.sel.size > 0, rub = st.sel.size <= 160, fok = st.fokus.size > 0;
  SVI.forEach((o) => {
    const m0 = o.userData.m0, u = st.sel.has(o), proz = !!o.userData.prozirno;
    let vid = true, m = m0;
    if (u) { if (!proz && !o.userData.vlastitiMat) m = HI(m0); }
    else if (st.pom.has(o)) m = proz || o.userData.vlastitiMat ? m0 : POM(m0);
    else if (fok && st.fokus.has(o)) m = ima && !proz && !o.userData.vlastitiMat ? DUH2(m0) : m0;
    else if (ima || fok) { if (st.prikaz === 'odabrano' && ima) vid = false; else if ((st.prozirno || fok) && !o.userData.vlastitiMat) m = proz ? m0 : DUH(m0); }
    if (ORMAR_UNUTRA.has(o) && !u && st.ormarCilj === 0 && (!R.ormar || R.ormar.t < 0.02)) vid = false;
    if (fok && IZVAN_ROBOTA.has(o) && !u) vid = false;
    o.visible = vid; o.material = m;
    if (u && rub && o.geometry && !proz) {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 35), rubMat); l.raycast = () => {}; o.add(l); rubovi.push(l);
    }
  });
}

/* ================================================================== */
/* 4. Kamera: pogledi i let do dijela                                  */
/* ================================================================== */
const POGLEDI = {
  sve: [[-0.42, 0.82, 1.62], [0.32, 0.2, 0]], robot: [[-0.62, 0.52, 0.98], [-0.06, 0.24, 0]], sprijeda: [[0, 0.32, 1.25], [0, 0.24, 0]],
  bok: [[-1.25, 0.36, 0.08], [0, 0.24, 0]], odozgo: [[0.06, 1.55, 0.22], [0, 0, 0]], ormar: [[0.46, 0.72, 1.02], [0.8, 0.27, -0.02]],
  privjesak: [[0.7, 0.98, 0.6], [0.86, 0.6, 0]], privjesakStraga: [[1.05, 0.95, -0.55], [0.86, 0.6, 0]]
};
let let_ = null;
function pogled(ime, glatko = true) { const p = POGLEDI[ime] || POGLEDI.robot; leti(new THREE.Vector3(...p[0]), new THREE.Vector3(...p[1]), glatko); }
function leti(poz, cilj, glatko = true) {
  if (!glatko) { let_ = null; camera.position.copy(poz); controls.target.copy(cilj); controls.update(); trazi(); return; }
  let_ = { t0: performance.now(), d: 900, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz, c1: cilj };
}
function kutija(ids) {
  const b = new THREE.Box3(); let ok = false;
  ids.forEach((id) => { const d = R.dijelovi.get(id); if (d) d.objekti.forEach((o) => { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); if (!bb.isEmpty()) { b.union(bb); ok = true; } }); });
  return ok ? b : null;
}
function udaljenost(r, k = 1.1) { const fov = camera.fov * Math.PI / 180; return Math.max(0.16, r / Math.sin(fov / 2) * (camera.aspect < 1 ? 1.45 : k)); }
function letiDoDijela(ids, ime) {
  const b = kutija(ids);
  if (!b) { pogled(ime || 'robot'); return; }
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.035, b.getSize(new THREE.Vector3()).length() / 2);
  const p = POGLEDI[ime] || null;
  const smjer = p ? new THREE.Vector3(...p[0]).sub(new THREE.Vector3(...p[1])).normalize() : camera.position.clone().sub(controls.target).normalize();
  leti(c.clone().add(smjer.multiplyScalar(udaljenost(r, 1.25))), c);
}
/* os zgloba u svijetu i smjer prema strani poklopca */
function osZglobaSvijet(i) {
  const f = R.okviri[i]; f.updateMatrixWorld(true);
  const o = new THREE.Vector3().setFromMatrixPosition(f.matrixWorld), z = new THREE.Vector3(0, 0, 1).transformDirection(f.matrixWorld);
  const s = Math.sign(R.ZG[i].zI - R.ZG[i].zP);
  const zc = (R.ZG[i].zI + R.ZG[i].zP) / 2;
  return { sredina: o.clone().add(z.clone().multiplyScalar(zc)), z, prema: z.clone().multiplyScalar(-s) };
}
function letiDoZgloba(i, nacin) {
  const { sredina, z, prema } = osZglobaSvijet(i), r = POLUMJER[i];
  let bok = new THREE.Vector3().crossVectors(z, new THREE.Vector3(0, 1, 0)); if (bok.lengthSq() < 0.1) bok.set(0, 0, 1); bok.normalize();
  const odKamere = camera.position.clone().sub(controls.target); if (bok.dot(odKamere) < 0) bok.negate();
  const gore = new THREE.Vector3(0, 1, 0);
  let cilj = sredina.clone(), smjer, dist;
  if (nacin === 'rastavi') {
    const L = 0.03 * (r / 0.045) * 8.4;
    cilj.add(prema.clone().multiplyScalar(L * 0.45));
    smjer = bok.clone().multiplyScalar(1).add(prema.clone().multiplyScalar(0.55)).add(gore.clone().multiplyScalar(i === 0 ? -0.05 : 0.35)).normalize();
    dist = udaljenost(L * 0.62 + r, 1.0);
  } else {
    smjer = prema.clone().multiplyScalar(0.9).add(bok.clone().multiplyScalar(0.55)).add(gore.clone().multiplyScalar(0.3)).normalize();
    dist = udaljenost(r * 2.7, 1.05);
  }
  leti(cilj.clone().add(smjer.multiplyScalar(dist)), cilj);
}

/* ================================================================== */
/* 5. Izbornik (stablo)                                               */
/* ================================================================== */
const roditelj = {}; { const stog = []; MENI.forEach((m) => { while (stog.length && stog[stog.length - 1].razina >= m.razina) stog.pop(); roditelj[m.n] = stog.length ? stog[stog.length - 1].n : null; stog.push(m); }); }
const djeca = (n) => MENI.filter((m) => roditelj[m.n] === n);
const imaDjecu = (n) => djeca(n).length > 0;
function vidljiva(m) { let r = roditelj[m.n]; while (r) { if (r !== 1 && !st.otvoreni.has(r)) return false; r = roditelj[r]; } return true; }
function crtajStablo() {
  $('stablo').innerHTML = MENI.map((m) => {
    if (!vidljiva(m)) return '';
    const p = imaDjecu(m.n) && m.n !== 1, otv = st.otvoreni.has(m.n);
    return '<li class="r' + m.razina + '"><button type="button" class="uz-st' + (st.akt === m.n ? ' akt' : '') + (m.n === 1 ? ' naslov' : '') + '" data-n="' + m.n + '"' + (p ? ' aria-expanded="' + otv + '"' : '') + (st.akt === m.n ? ' aria-current="true"' : '') + '>' +
      '<span class="kv" aria-hidden="true">' + (vidjeni.has(m.n) ? '✓' : '') + '</span>' + (p ? '<span class="str" aria-hidden="true">' + (otv ? '▾' : '▸') + '</span>' : '') + '<span class="t">' + esc(m.naziv) + '</span>' + (vidjeni.has(m.n) ? '<span class="vh">(pregledano)</span>' : '') + '</button></li>';
  }).join('');
  $('brojac').textContent = vidjeni.size + ' / ' + UKUPNO;
}
$('stablo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-n]'); if (!b) return; const n = +b.dataset.n;
  if (st.akt === n && imaDjecu(n) && n !== 1) { if (st.otvoreni.has(n)) st.otvoreni.delete(n); else st.otvoreni.add(n); crtajStablo(); return; }
  odaberi(n);
});

/* ================================================================== */
/* 6. Odabir stavke                                                   */
/* ================================================================== */
function otvoriPutanju(n) {
  const put = []; let r = n; while (r) { put.push(r); r = roditelj[r]; }
  [...st.otvoreni].forEach((o) => { if (!put.includes(o)) st.otvoreni.delete(o); });
  put.forEach((p) => { if (imaDjecu(p)) st.otvoreni.add(p); });
}
const UNUTRA_IDS = ['zglob', 'poklopac', 'elektronika', 'enkoderMotora', 'kocnica', 'zatik', 'motor', 'prijenosnik', 'generatorVala', 'flexspline', 'circularSpline', 'enkoderZgloba'];
function primijeniZglobove() {
  for (let k = 0; k < 6; k++) R.unutrasnjost(k, k === st.zglob && (st.unutra || st.autoUnutra));
  /* kad je zglob rastavljen ili otvoren, ostatak robota postaje poluproziran (fokus na zglob) */
  const f = st.rastav >= 0 ? st.rastav : (st.unutra || st.autoUnutra ? st.zglob : -1);
  st.fokus = f >= 0 ? meshevi(UNUTRA_IDS.map((x) => x + f)) : new Set();
  $('z-unutra').setAttribute('aria-pressed', String(st.unutra || st.autoUnutra));
  $('z-rastavi').setAttribute('aria-pressed', String(st.rastav >= 0));
  osvjeziIzgled();
}
function postaviZglob(i) {
  if (st.zglob !== i && st.rastav >= 0) st.rastav = i;    /* rastavljen ostaje odabrani zglob */
  st.zglob = i; $('z-izbor').value = String(i);
}
function odaberi(n, bezLeta = false) {
  const m = MENI.find((x) => x.n === n) || MENI[0];
  st.akt = m.n; otvoriPutanju(m.n);
  vidjeni.add(m.n); spremi();
  st.sel = meshevi(m.ids);
  zatvoriTemu();
  $('k-naziv').textContent = m.naziv;
  $('k-engl').textContent = '(' + m.engl + ')';
  $('k-tekst').innerHTML = m.tekst;
  { const ki = document.querySelector('.uz-kartica .karta-in'); if (ki) ki.scrollTop = 0; }
  st.temaKljuc = m.tema || null; $('k-tema-g').hidden = !m.tema;
  const dj = djeca(m.n);
  $('k-djeca').innerHTML = dj.length && m.n !== 1 ? '<p class="uz-dj-n">Dijelovi u ovoj skupini:</p><ul class="uz-dj">' + dj.map((x) => '<li><button type="button" class="cip" data-skok="' + x.n + '">' + esc(x.naziv) + '</button></li>').join('') + '</ul>' : '';
  $('k-prije').disabled = m.n === 1; $('k-dalje').disabled = m.n === UKUPNO;
  $('naslov-3d').textContent = m.zglob != null && m.razina > 1 ? m.naziv + ' — ' + NAZIVI_ZGLOBOVA[m.zglob] : m.naziv;
  /* zglob, unutrašnjost, ormar */
  if (m.zglob != null) postaviZglob(m.zglob);
  st.autoUnutra = !!m.unutra;
  st.ormarCilj = m.ormar ? 1 : 0;
  primijeniZglobove(); crtajStablo();
  if (!bezLeta) {
    if (m.zglob != null) { if (st.rastav === m.zglob) letiDoZgloba(m.zglob, 'rastavi'); else if (m.unutra) letiDoZgloba(m.zglob, 'unutra'); else letiDoDijela(m.ids, null); }
    else if (m.ids.length && m.n > 2 && !m.ormar && m.ids[0] !== 'privjesak') letiDoDijela(m.ids, m.pogled);
    else pogled(m.pogled || 'robot');
  }
  if (m.sekcija && !bezLeta) setTimeout(() => { const el = $(m.sekcija); if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 700);
}
$('k-prije').addEventListener('click', () => { if (st.akt > 1) odaberi(st.akt - 1); });
$('k-dalje').addEventListener('click', () => { if (st.akt < UKUPNO) odaberi(st.akt + 1); });
$('k-djeca').addEventListener('click', (e) => { const b = e.target.closest('[data-skok]'); if (b) odaberi(+b.dataset.skok); });

/* „Kako radi” — animacija iz modula teme_ur.js (radi se zasebno) */
let tema = null;
/* v02 — na računalu se crtež animacije prikazuje na pozornici (mjesto 3D prikaza), a tekst i gumbi ostaju u desnom stupcu */
const SIROKO = window.matchMedia('(min-width:1101px) and (min-height:560px)');
function pozornica() {
  let p = $('pozornica'); if (p) return p;
  p = document.createElement('div'); p.id = 'pozornica'; p.className = 'uz-pozornica tur'; p.hidden = true;
  $('k-scena').appendChild(p); return p;
}
function naPozornicu(sek) {
  if (!SIROKO.matches || !sek) return;
  const sc = sek.querySelector('.tur-scena'); if (!sc) return;
  const p = pozornica(), kar = $('k-scena');
  p.style.top = kar.querySelector('.karta-h').offsetHeight + 'px';
  for (const v of sc.querySelectorAll('.tur-svg')) { const vb = (v.getAttribute('viewBox') || '0 0 600 400').split(/\s+/); v.style.flexGrow = String(+vb[3] || 1); }
  const nav = document.createElement('div'); nav.className = 'uz-pozornica-nav';
  nav.innerHTML = '<p class="pom">Gumbi i očitanja animacije su u desnom stupcu, odmah ispod naslova.</p><button type="button" class="gumb tanki" id="poz-zatvori">Natrag na 3D prikaz</button>';
  p.replaceChildren(sc, nav); p.hidden = false;
  /* desni stupac: gumb, naslov animacije i upravljanje na vrh, objašnjenja ispod */
  const ki = document.querySelector('.uz-kartica .karta-in');
  ki.insertBefore($('k-tema-el'), $('k-tekst')); ki.insertBefore($('k-tema-g'), $('k-tema-el'));
  const nas = sek.querySelector('.tur-naslov'), uvod = sek.querySelector('.tur-uvod');
  for (const q of ['.tur-ocit', '.tur-stanje', '.tur-upr']) { const x = sek.querySelector('.tur-desno ' + q); if (x && nas) nas.after(x); }
  if (uvod) sek.querySelector('.tur-desno').prepend(uvod);
  ki.scrollTop = 0;
  $('poz-zatvori').addEventListener('click', zatvoriTemu);
}
function sPozornice() { const p = $('pozornica'); if (p) { p.hidden = true; p.replaceChildren(); } const ki = document.querySelector('.uz-kartica .karta-in'); if (ki && $('k-djeca')) { ki.insertBefore($('k-tema-g'), $('k-djeca')); ki.insertBefore($('k-tema-el'), $('k-djeca')); } }
SIROKO.addEventListener('change', () => { if (tema || !$('k-tema-el').hidden) zatvoriTemu(); });
/* poravnanje: nakon klika na izbornik ili gumb radni prikaz stane točno na zaslon */
function poravnaj() {
  if (!SIROKO.matches) return;
  const m = document.querySelector('.uz-mreza'), y = m.getBoundingClientRect().top;
  if (Math.abs(y - 62) > 6 && y < window.innerHeight - 120) window.scrollTo({ top: window.scrollY + y - 62, behavior: 'smooth' });
}
document.querySelector('.uz-mreza').addEventListener('click', (e) => { if (e.target.closest('button,select,a')) poravnaj(); });
function zatvoriTemu() { if (tema && tema.unisti) { try { tema.unisti(); } catch (e) { /* ništa */ } } tema = null; $('k-tema-el').hidden = true; $('k-tema-el').innerHTML = ''; $('k-tema').setAttribute('aria-expanded', 'false'); $('k-tema').textContent = 'Kako radi'; sPozornice(); }
async function otvoriTemu() {
  const kljuc = st.temaKljuc; if (!kljuc) return;
  const el = $('k-tema-el'); el.hidden = false; el.innerHTML = '<p class="pom">Animacija se učitava…</p>';
  $('k-tema').setAttribute('aria-expanded', 'true'); $('k-tema').textContent = 'Zatvori animaciju';
  const T = await import('./teme_ur.js').catch(() => null);
  if (st.temaKljuc !== kljuc || el.hidden) return;
  if (!T || typeof T.prikazi !== 'function') { el.innerHTML = '<p class="pom">Animacija „Kako radi” trenutačno nije dostupna.</p>'; return; }
  el.innerHTML = '';
  const kut = document.createElement('div'); kut.className = 'uz-tema-kut'; el.appendChild(kut);
  try { tema = T.prikazi(kut, kljuc) || null; } catch (e) { el.innerHTML = '<p class="pom">Animacija „Kako radi” trenutačno nije dostupna.</p>'; tema = null; }
  if (tema) naPozornicu(kut.querySelector('.tur'));
}
$('k-tema').addEventListener('click', () => { if (tema || !$('k-tema-el').hidden) zatvoriTemu(); else otvoriTemu(); });

/* ================================================================== */
/* 7. Miš u 3D: oblačić i klik                                        */
/* ================================================================== */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
const oblacic = $('oblacic');
function vidljivo(o) { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; }
function pogodak(e) {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const h = ray.intersectObjects(SVI.filter((o) => o.userData.dioId && vidljivo(o)), false); if (!h.length) return null;
  const proz = (o) => { const m = o.material; return m.transparent && m.opacity < 0.45; };
  const prvi = h.find((x) => !proz(x.object)) || h[0];
  return { id: prvi.object.userData.dioId, x: e.clientX - r.left, y: e.clientY - r.top };
}
let zadnjiHover = 0, dolje = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y) > 4) { oblacic.hidden = true; return; }
  const t = performance.now(); if (t - zadnjiHover < 50) return; zadnjiHover = t;
  const p = pogodak(e);
  if (!p) { oblacic.hidden = true; renderer.domElement.style.cursor = ''; return; }
  oblacic.textContent = naziv(p.id); oblacic.hidden = false;
  const w = scenaEl.clientWidth; oblacic.style.left = Math.max(4, Math.min(p.x + 14, w - oblacic.offsetWidth - 6)) + 'px'; oblacic.style.top = Math.max(4, p.y - 34) + 'px';
  renderer.domElement.style.cursor = 'pointer';
});
renderer.domElement.addEventListener('pointerleave', () => { oblacic.hidden = true; });
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dolje) return; const pomak = Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y); dolje = null;
  if (pomak > 5) return;
  const p = pogodak(e); if (p) odaberiDio(p.id);
});
function stavkaZaDio(id) {
  return MENI.find((m) => m.ids[0] === id && m.razina > 0) || MENI.find((m) => m.ids.includes(id)) || MENI[1];
}
function odaberiDio(id) { odaberi(stavkaZaDio(id).n); }

/* ================================================================== */
/* 8. Gumbi: pogledi, prikaz, zglobovi, položaji                       */
/* ================================================================== */
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
function prikaz(p) { st.prikaz = p; $('p-sve').setAttribute('aria-pressed', String(p === 'sve')); $('p-odabrano').setAttribute('aria-pressed', String(p === 'odabrano')); osvjeziIzgled(); }
$('p-sve').addEventListener('click', () => prikaz('sve')); $('p-odabrano').addEventListener('click', () => prikaz('odabrano'));
$('p-prozirno').addEventListener('change', () => { st.prozirno = $('p-prozirno').checked; osvjeziIzgled(); });
$('p-osi').addEventListener('change', () => { R.pomocni.osi($('p-osi').checked); trazi(); });
$('p-dh').addEventListener('change', () => { R.pomocni.okviriDH($('p-dh').checked); trazi(); });
const opis = (t) => { $('z-opis').textContent = t; };
$('z-izbor').addEventListener('change', () => {
  const i = +$('z-izbor').value; postaviZglob(i); st.autoUnutra = false; primijeniZglobove();
  if (st.rastav >= 0) letiDoZgloba(i, 'rastavi'); else if (st.unutra) letiDoZgloba(i, 'unutra');
  opis('Odabran je zglob ' + NAZIVI_ZGLOBOVA[i] + ' (veličina ' + ZGL[i].v + ').');
});
$('z-rastavi').addEventListener('click', () => {
  if (st.rastav >= 0) { st.rastav = -1; opis('Zglob ' + NAZIVI_ZGLOBOVA[st.zglob] + ' se sklapa.'); }
  else { st.rastav = st.zglob; letiDoZgloba(st.zglob, 'rastavi'); opis('Zglob ' + NAZIVI_ZGLOBOVA[st.zglob] + ' rastavljen duž osi: poklopac, elektronika, enkoder motora, kočnica, motor, generator vala, flexspline, circular spline, enkoder zgloba.'); }
  primijeniZglobove();
});
$('z-unutra').addEventListener('click', () => {
  st.unutra = !(st.unutra || st.autoUnutra); st.autoUnutra = false; primijeniZglobove();
  if (st.unutra) { letiDoZgloba(st.zglob, 'unutra'); opis('Kućište zgloba ' + NAZIVI_ZGLOBOVA[st.zglob] + ' je poluprozirno — vide se dijelovi unutra (načelni prikaz).'); } else opis('Unutrašnjost je skrivena.');
});
/* pomicanje zglobova */
let pomak = null;
function oznaciPomicne(i) { st.pom = i == null ? new Set() : (() => { const s = new Set(); R.zglobovi[i].traverse((o) => { if (o.isMesh && o.userData.m0) s.add(o); }); return s; })(); osvjeziIzgled(); }
function pokreniPomak(redom) {
  zaustaviPoz();
  const niz = redom ? [0, 1, 2, 3, 4, 5] : [st.zglob];
  pomak = { niz, k: 0, t: 0, q0: q[niz[0]] };
  oznaciPomicne(niz[0]); $('z-stop').disabled = false;
  opisPomaka();
}
const AMP = [55, 30, 45, 60, 60, 90].map((d) => d * Math.PI / 180);
function opisPomaka() { const i = pomak.niz[pomak.k]; opis('Pomiče se ' + NAZIVI_ZGLOBOVA[i] + ' (±' + Math.round(AMP[i] * 180 / Math.PI) + '° od trenutnog kuta; opseg ' + ZGL[i].opseg + ', najveća brzina ' + ZGL[i].brzina + '). Istaknuti su dijelovi koje taj zglob nosi.'); }
function staniPomak(tekst) {
  if (!pomak) return; const i = pomak.niz[pomak.k]; q[i] = pomak.q0; R.postavi(q);
  pomak = null; $('z-stop').disabled = true; oznaciPomicne(null); if (tekst) opis(tekst); prikaziQ();
}
function korakPomaka(dt) {
  if (!pomak) return false;
  const T = 2.6; pomak.t += dt;
  const i = pomak.niz[pomak.k], u = Math.min(1, pomak.t / T);
  q[i] = pomak.q0 + AMP[i] * Math.sin(u * Math.PI * 2);
  R.postavi(q);
  if (u >= 1) {
    q[i] = pomak.q0; R.postavi(q);
    pomak.k++; pomak.t = 0;
    if (pomak.k >= pomak.niz.length) { staniPomak('Gotovo — zglob je vraćen u početni kut.'); return true; }
    pomak.q0 = q[pomak.niz[pomak.k]]; oznaciPomicne(pomak.niz[pomak.k]); opisPomaka();
  }
  return true;
}
$('z-pomakni').addEventListener('click', () => pokreniPomak(false));
$('z-svi').addEventListener('click', () => pokreniPomak(true));
$('z-stop').addEventListener('click', () => staniPomak('Zaustavljeno.'));
/* položaji */
let poz = null;
function zaustaviPoz() { poz = null; }
function idiU(ime) {
  staniPomak();
  poz = { q0: q.slice(), q1: POLOZAJI[ime].slice(), t: 0, d: 1.3 };
  document.querySelectorAll('[data-polozaj]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.polozaj === ime)));
  const t = { pocetni: 'Početni položaj: nadlaktica uspravno, podlaktica vodoravno, alat prema dolje.', ispruzen: 'Ispružen: sve osi uspravno — ovako se najbolje vidi duljina članaka.', sklopljen: 'Sklopljen: ruka složena uz postolje (npr. za prijevoz ili mali radni prostor).', nula: 'Nulti položaj (q = 0): UR-ova definicija kutova — ruka ispružena vodoravno. Od njega se mjere svi kutovi zglobova.' };
  opis(t[ime] || '');
}
document.querySelectorAll('[data-polozaj]').forEach((b) => b.addEventListener('click', () => idiU(b.dataset.polozaj)));
function korakPoz(dt) {
  if (!poz) return false;
  poz.t += dt; const u = Math.min(1, poz.t / poz.d), k = u * u * (3 - 2 * u);
  for (let i = 0; i < 6; i++) q[i] = poz.q0[i] + (poz.q1[i] - poz.q0[i]) * k;
  R.postavi(q); if (u >= 1) poz = null;
  return true;
}
const D = (r) => (r * 180 / Math.PI);
function prikaziQ() {
  const w = new THREE.Vector3(); R.tcp.getWorldPosition(w);
  $('osi').textContent = 'q [°]  ' + q.map((v) => D(v).toFixed(0).padStart(4)).join(' ') + '\nTCP [mm]  x ' + (w.x * 1000).toFixed(1) + '  y ' + (-w.z * 1000).toFixed(1) + '  z ' + (w.y * 1000).toFixed(1);
}

/* ================================================================== */
/* 9. Petlja (crta se samo kad se nešto mijenja)                       */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); trazi(); }
new ResizeObserver(velicina).observe(scenaEl);
controls.addEventListener('change', trazi);
let zadnje = performance.now(), zadnjiQ = 0, brojCrtanja = 0, zauzet = true;
const ease = (t) => t * t * (3 - 2 * t);
function petlja(t) {
  const dt = Math.min(0.25, (t - zadnje) / 1000); zadnje = t;
  let ide = false;
  if (let_) { const u = Math.min(1, (t - let_.t0) / let_.d), k = ease(u); camera.position.lerpVectors(let_.p0, let_.p1, k); controls.target.lerpVectors(let_.c0, let_.c1, k); if (u >= 1) let_ = null; ide = true; }
  const giba = korakPomaka(dt) | korakPoz(dt);
  if (giba) { ide = true; if (t - zadnjiQ > 80) { zadnjiQ = t; prikaziQ(); } } else if (zadnjiQ >= 0 && t - zadnjiQ > 80 && zadnjiQ !== -1) { prikaziQ(); zadnjiQ = -1; }
  /* rastavljanje (animirano) */
  let promjena = false, matPromjena = false;
  for (let k = 0; k < 6; k++) {
    const cilj = k === st.rastav ? 1 : 0, sad = st.tR[k];
    if (Math.abs(cilj - sad) > 1e-4) { const n = sad + Math.sign(cilj - sad) * Math.min(Math.abs(cilj - sad), dt * 0.85); st.tR[k] = n; R.rastavi(k, ease(n)); promjena = true; if ((n === 0) !== (sad === 0)) matPromjena = true; }
  }
  if (promjena) { ide = true; pod.visible = st.tR[0] < 0.02; if (matPromjena) primijeniZglobove(); }
  /* vrata ormara */
  if (R.ormar && R.ormar.grupa) { const sad = R.ormar.t, c = st.ormarCilj; if (Math.abs(sad - c) > 1e-3) { R.ormar.otvori(sad + Math.sign(c - sad) * Math.min(Math.abs(c - sad), dt * 1.4)); ide = true; if (R.ormar.t < 0.02 && c === 0) osvjeziIzgled(); } }
  if (controls.update()) ide = true;
  zauzet = ide;
  if (ide || crtati) { crtati = false; renderer.render(scene, camera); brojCrtanja++; }
  requestAnimationFrame(petlja);
}

crtajStablo();
odaberi(1, true);
pogled('sve', false);
velicina();
prikaziQ();
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__upoz = { scene, renderer, pogodak, R, MENI, st, q, odaberi, odaberiDio, pogled, otvoriTemu, letiDoZgloba, idiU, pokreniPomak, staniPomak, camera, controls, POGLEDI, render: () => renderer.render(scene, camera), trazi, get brojCrtanja() { return brojCrtanja; }, get zauzet() { return zauzet || crtati; }, get pomak() { return pomak; }, get poz() { return poz; } };
requestAnimationFrame(petlja);
