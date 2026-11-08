/* FORTRONIQ · Industrijski robot ABB IRB 120 — Upoznavanje robota (3D).
   Izbornik dio po dio, rastavljanje robota, unutrašnjost osi, pomicanje osi i animacije „Kako radi” (teme_irb.js).
   Tekst, unutrašnjost, ormar, privjesak i sučelje su naši; podaci iz službenih dokumenata ABB-a (popis izvora na stranici).
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { napraviIRB120, POLOZAJI, NAZIVI_OSI, KALIBRACIJSKI_PRIRUCNIK } from './irb120_model.js?v=01';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = (...r) => r.map((t) => '<p>' + t + '</p>').join('');
const NAC = 'U modelu je to naš načelni crtež — smještaj i mjere su procjena.';

/* ================================================================== */
/* 1. Sadržaj izbornika                                               */
/* ================================================================== */
const OSI = [
  { naziv: 'okretanje ruke', gib: 'okreće cijelu ruku oko okomite osi postolja', opseg: '±165°', v: 250, vT: 250, mast: '58 g', d: 'u postolju, okomito' },
  { naziv: 'donja ruka', gib: 'naginje donju ruku naprijed i natrag oko vodoravne osi u okretnom kućištu', opseg: '±110°', v: 250, vT: 250, mast: '40 g', d: 'u okretnom kućištu, poprečno' },
  { naziv: 'gornja ruka', gib: 'diže i spušta gornju ruku oko vodoravne osi u laktu', opseg: '+70° / −110°', v: 250, vT: 250, mast: '11 g (u starijem izdanju priručnika 10 g)', d: 'motor uz rame, prijenosnik u laktu, zupčasti remen' },
  { naziv: 'zakret zapešća', gib: 'okreće kućište zapešća oko uzdužne osi gornje ruke', opseg: '±160°', v: 320, vT: 420, mast: '3,5 g', d: 'u gornjoj ruci, uzdužno' },
  { naziv: 'nagib zapešća', gib: 'naginje nagibno kućište, a s njim i prirubnicu, oko poprečne osi zapešća', opseg: '±120°', v: 320, vT: 590, mast: '5 g', d: 'motor u kućištu zapešća, zupčasti remen do prijenosnika' },
  { naziv: 'okretanje prirubnice', gib: 'okreće prirubnicu alata oko njezine osi', opseg: '±400° (zadano; programski do ±242 okretaja)', v: 420, vT: 600, mast: '3,5 g', d: 'u nagibnom kućištu, uzdužno' }
];
const POGON = [
  'U popisu rezervnih dijelova os 1 i os 2 imaju istu jedinicu: rotacijski izmjenični (AC) motor zajedno s prijenosnikom. Motor i prijenosnik mijenjaju se kao cjelina.',
  'U popisu rezervnih dijelova os 1 i os 2 imaju istu jedinicu: rotacijski izmjenični (AC) motor zajedno s prijenosnikom. Motor i prijenosnik mijenjaju se kao cjelina.',
  'Os 3 ima motornu jedinicu s remenicom i zasebni zupčasti remen. Remen prenosi vrtnju na prijenosnik osi 3, koji je ugrađen u donju ruku.',
  'Motor osi 4 s prijenosnikom isporučuje se kao dio sklopa „gornja ruka sa zapešćem” — u popisu rezervnih dijelova nije zasebna stavka.',
  'Os 5 ima motornu jedinicu s remenicom i zupčasti remen u zapešću; prijenosnik osi 5 isporučuje se kao dio gornje ruke.',
  'Motor i prijenosnik osi 6 dio su sklopa „gornja ruka sa zapešćem”.'
];
function podaciOsi(i) {
  const o = OSI[i];
  return '<dl class="uz-pod"><dt>Radni opseg</dt><dd>' + o.opseg + '</dd><dt>Najveća brzina IRB 120</dt><dd>' + o.v + ' °/s</dd><dt>Najveća brzina IRB 120T</dt><dd>' + o.vT + ' °/s</dd><dt>Mast u prijenosniku</dt><dd>' + o.mast + '</dd><dt>Pogon (u modelu)</dt><dd>' + o.d + '</dd></dl>';
}
const PODTEKST = {
  motor: (i) => P('Os ' + (i + 1) + ' pogoni izmjenični servomotor: stator s namotima u kućištu, rotor s trajnim magnetima na vratilu. Pogonska jedinica u ormaru napaja namote strujom čiju jakost i fazu određuje regulacija prema kutu rotora.',
    POGON[i], 'Snagu, moment i broj polova motora ABB u specifikaciji ne navodi. ' + NAC + ' Kad pokreneš „Pomakni os”, rotor u modelu vrti se 30 puta brže od osi (stvarni omjer nije objavljen).'),
  prijenosnik: (i) => P('Prijenosnik osi ' + (i + 1) + ' smanjuje brzinu motora i povećava moment na izlazu. Vrstu prijenosnika ABB u popisu rezervnih dijelova ne navodi.',
    'U tehničkom priručniku o podmazivanju za svih šest osi IRB 120 propisana je mast „Harmonic grease 4B No.2” — mast namijenjena valnim (harmoničnim) prijenosnicima. Iz toga zaključujemo da su prijenosnici valni; to je naš zaključak, ne navod proizvođača.',
    'Količina masti za ovu os: ' + OSI[i].mast + '. Izjava da je mast „za cijeli vijek” nije pronađena — za razdoblja pregleda vrijedi priručnik proizvoda.'),
  remen: (i) => P('Zupčasti remen prenosi vrtnju s male remenice na motoru na veliku remenicu prijenosnika osi ' + (i + 1) + '. Tako motor ne mora sjediti na samoj osi, nego tamo gdje ima mjesta — ' + (i === 2 ? 'uz rame, pa je masa motora bliže osi 2 i manje opterećuje ruku.' : 'u kućištu zapešća, iza osi 5.'),
    'Priručnik propisuje pregled zupčastih remena svakih 36 mjeseci i opisuje postupak podešavanja napetosti remena osi 3 i osi 5. Olabavljen remen preskače zube i os gubi položaj; prenapet troši ležajeve.',
    'Omjer remenica i širina remena nisu objavljeni. ' + NAC),
  kocnica: (i) => P('Motor osi ' + (i + 1) + ' ima kočnicu za držanje: dok motori nisu uključeni, kočnica drži os, pa ruka ne padne pod vlastitom težinom.',
    'Kočnice se otpuštaju kad se uključe motori (Motors On) ili ručno — tipkom za otpuštanje kočnica ispod poklopca na prednjoj strani ormara IRC5 Compact (ta tipka postoji samo uz IRB 120), ili vanjskim napajanjem 24 V na priključku R1.MP prema priručniku. Pri ručnom otpuštanju ruku treba poduprijeti: os pod teretom krene odmah.',
    'Priručnik navodi kočnice za držanje na motorima; je li kočnica na svakoj od šest osi, u dostupnim dijelovima priručnika nije potvrđeno — u modelu je nacrtana na svakom motoru.'),
  resolver: (i) => P('Na stražnjem kraju motora osi ' + (i + 1) + ' je mjerni član koji javlja kut rotora. Priručnik spominje kalibraciju resolvera, pa u modelu prikazujemo resolver; izvedbu (broj polova, razlučivost) ABB ne objavljuje.',
    'Signali svih motora skupljaju se na ploči sučelja enkodera u postolju robota i signalnim kabelom idu u upravljački ormar. Ormar iz kuta rotora i prijenosnog omjera računa kut osi.',
    'Kut unutar jednog okretaja rotora mjeri se uvijek; broj okretaja pamte brojači okretaja, koje i bez mrežnog napajanja održava baterija u postolju.')
};
const PODSTAVKE = [
  ['motor', 'Motor', 'Motor', (i) => ['motor' + (i + 1)], 'motor'],
  ['prijenosnik', 'Prijenosnik', 'Gearbox', (i) => ['prijenosnik' + (i + 1)], 'valni'],
  ['remen', 'Zupčasti remen', 'Timing belt', (i) => ['remen' + (i + 1)], 'remen', [2, 4]],
  ['kocnica', 'Kočnica', 'Holding brake', (i) => ['kocnica' + (i + 1)], 'kocnica'],
  ['resolver', 'Mjerenje kuta (resolver)', 'Resolver', (i) => ['resolver' + (i + 1)], 'mjerenje']
];

const MENI = [];
function stavka(razina, naziv, engl, ids, tekst, tema, extra = {}) { MENI.push(Object.assign({ n: MENI.length + 1, razina, naziv, engl, ids, tekst, tema }, extra)); }

stavka(0, 'Upoznavanje robota', 'Getting to know the robot', [],
  P('Ovo je industrijski robot ABB IRB 120: šest rotacijskih osi, nosivost 3 kg i doseg 580 mm. U izborniku odaberi dio — model se okrene prema njemu i istakne ga, a ovdje dobiješ objašnjenje.',
    'Robot možeš rastaviti i pogledati iznutra: motore, prijenosnike, zupčaste remene, kočnice i mjerni sustav, te upravljački ormar IRC5 Compact i privjesak FlexPendant. Gdje postoji gumb „Kako radi”, otvara se animacija načela rada.',
    'Uz pregledanu stavku pojavi se kvačica, pa uvijek znaš što si već prošao.'), null, { pogled: 'sve' });
stavka(1, 'Cijeli robot', 'Complete robot', ['robot'],
  P('IRB 120 je najmanji višenamjenski robot u ABB-ovoj ponudi svoga vremena: masa 25 kg, nosivost 3 kg (4 kg sa zapešćem okrenutim okomito prema dolje), doseg 580 mm mjeren do središta zapešća i ponovljivost položaja 0,01 mm (ISO 9283).',
    'Predstavljen je 2009. zajedno s upravljačkim ormarom IRC5 Compact. Postoje dvije izvedbe: IRB 120 i IRB 120T, koji ima brže osi zapešća. ABB ga danas vodi kao ukinut proizvod; nasljednik je IRB 1200.',
    'Kinematika je klasična: tri glavne osi postavljaju zapešće u prostoru, a tri osi zapešća sijeku se u jednoj točki i određuju orijentaciju alata. Klikni „Kako radi” za zapešće i singularnost.'), 'zapesce', { pogled: 'robot' });
stavka(1, 'Postolje', 'Base', ['baza'],
  P('Postolje (base) nosi cijeli robot. Tlocrt je 180 × 180 mm, a robot se pričvršćuje s četiri vijka M10 i dva zatika za položaj. Smije se montirati na pod, na zid ili naopako, pod bilo kojim kutom — kut montaže upisuje se u konfiguraciju, da upravljanje ispravno računa gravitaciju.',
    'U postolju su prijenosnik i motor osi 1 (u modelu), ploča sučelja enkodera i baterija, a straga priključci kabela robota i korisnički priključci. Robot doseže i 112 mm ispod razine vlastitog postolja.',
    'Odaberi dio u podizborniku ili uključi „Prikaži unutrašnjost”.'), null, { pogled: 'robot', unutraBaza: true });
stavka(2, 'Priključci R1.MP i R1.SMB', 'Robot cable connectors', ['prikljucciPostolja'],
  P('Robot je s ormarom spojen dvama kabelima: kabelom snage (priključak R1.MP) za motore i kočnice i signalnim kabelom (R1.SMB) za podatke o položaju motora.',
    'Kabeli ne smiju biti napregnuti ni oštro savijeni, a moraju biti vođeni tako da ih robot ne može zahvatiti. Na priključak R1.MP može se, prema priručniku, dovesti i vanjsko napajanje 24 V za otpuštanje kočnica.'), null, { pogled: 'straga' });
stavka(2, 'Ploča sučelja enkodera', 'Encoder interface board', ['plocaEnkodera'],
  P('Ploča sučelja enkodera (Encoder Interface) u postolju skuplja signale mjernih članova svih šest motora i preko priključka XS2 i signalnog kabela šalje ih u ormar.',
    'Na ploču je vezana i baterija koja pamti brojače okretaja kad robot nije pod napajanjem. ' + NAC), 'mjerenje', { unutraBaza: true });
stavka(2, 'Baterija', 'Battery pack', ['baterija'],
  P('Baterija održava brojače okretaja motora dok je robot bez napajanja. Bez nje robot nakon isključenja ne bi znao koliko je okretaja svaki rotor napravio, pa bi trebalo ponovno namjestiti brojače okretaja.',
    'Priručnik propisuje zamjenu baterije svakih 36 mjeseci ili kad se pojavi upozorenje 38213 „Battery charge low”. Nakon zamjene ili gubitka napajanja brojači okretaja se ažuriraju prema postupku iz priručnika. ' + NAC), 'mjerenje', { unutraBaza: true });
stavka(2, 'Korisnički priključci i zrak', 'Customer connections, air', ['zrakIPrikljucci', 'prikljucakR3'],
  P('Za alat robot ima ugrađene vodove od postolja do gornje ruke: signalni priključak R1.CP/CS na postolju povezan je s R3.CP/CS na gornjoj ruci (10 signala, 49 V, 500 mA) i četiri zračna crijeva vanjskog promjera 4 mm, najviše 5 bar.',
    'Tako se hvataljka ili usisna glava spajaju bez vanjskih kabela uz ruku, koji bi se namatali i zapinjali. Vodovi prolaze unutar robota.'), null, { pogled: 'straga' });
stavka(1, 'Okretno kućište', 'Swing housing', ['okretnoKuciste'],
  P('Okretno kućište (swing housing) okreće se na postolju oko osi 1. Na njemu je os 2, oko koje se naginje donja ruka. ABB u popisu dijelova navodi i okretnu ploču (swing plate) između postolja i kućišta.',
    'U modelu su u njemu motor i prijenosnik osi 2 te dio kabelskog snopa koji iz postolja prolazi prema donjoj ruci. ' + NAC), null, { pogled: 'robot' });
stavka(1, 'Donja ruka', 'Lower arm', ['donjaRuka'],
  P('Donja ruka (lower arm) spaja os 2 u okretnom kućištu s osi 3 u laktu; razmak tih osi je 270 mm. Uz ruku je bočni nosač (lower arm side support), a u ruci je prijenosnik osi 3.',
    'U modelu se vidi i motor osi 3 uz rame te zupčasti remen do lakta: masa motora tako je bliže osi 2, pa manje opterećuje ruku.'), null, { pogled: 'bok' });
stavka(1, 'Gornja ruka', 'Upper arm', ['gornjaRuka'],
  P('Gornja ruka (upper arm) počinje u laktu (os 3). Os 4 je 70 mm iznad osi 3 i ide uzduž ruke prema zapešću; središte zapešća je 302 mm ispred osi 3.',
    'U ABB-ovu popisu dijelova gornja ruka dolazi kao sklop „gornja ruka sa zapešćem”, zajedno s motorima i prijenosnicima osi 4, 5 i 6. Na njoj je priključak R3.CP/CS i izlazi zraka za alat.'), null, { pogled: 'bok' });
stavka(2, 'Priključci na gornjoj ruci', 'Upper arm connections R3', ['prikljucakR3'],
  P('Na gornjoj ruci završavaju korisnički vodovi: signalni priključak R3.CP/CS (10 signala, 49 V, 500 mA) i četiri izlaza zraka Ø4 mm, najviše 5 bar.',
    'Na gornju ruku smije se pričvrstiti i dodatni teret (npr. ventil) do 0,3 kg. ' + NAC), null, {});
stavka(1, 'Kućište zapešća', 'Wrist housing', ['kucisteZapesca'],
  P('Kućište zapešća okreće se oko osi 4 i nosi os 5. ABB ga navodi kao plastično kućište zapešća (wrist housing) s bočnim poklopcem.',
    'Osi 4, 5 i 6 sijeku se u jednoj točki — središtu zapešća. Zato se položaj zapešća može računati odvojeno od orijentacije alata, a kad su osi 4 i 6 u pravcu (os 5 na 0°), robot je u singularnom položaju. Klikni „Kako radi”.'), 'zapesce', { pogled: 'bok' });
stavka(1, 'Nagibno kućište', 'Tilt house', ['nagibnoKuciste'],
  P('Nagibno kućište naginje se oko osi 5 i nosi os 6 s prirubnicom alata. ABB navodi poklopac (tilt cover) i noseći prsten (carrier ring).',
    'U modelu su u njemu motor i prijenosnik osi 6. ' + NAC), null, { pogled: 'bok' });
stavka(1, 'Prirubnica alata', 'Tool flange', ['prirubnica'],
  P('Na prirubnicu se pričvršćuje alat. Prema CAD modelu proizvođača (naše mjerenje modela) ima promjer 40 mm, četiri navoja M5 na promjeru 31,5 mm, provrt za zatik Ø5 mm i središnje centriranje Ø20 mm.',
    'Ishodište alatnog sustava bez alata (tool0) je u središtu prirubnice. Za svaki alat upisuju se njegov TCP i teret (tooldata); nosivost robota je 3 kg.'), null, {});
for (let i = 0; i < 6; i++) {
  stavka(1, NAZIVI_OSI[i] + ' — ' + OSI[i].naziv, 'Axis ' + (i + 1), ['motor' + (i + 1), 'prijenosnik' + (i + 1), 'remen' + (i + 1), 'kocnica' + (i + 1), 'resolver' + (i + 1)],
    P('Os ' + (i + 1) + ' ' + OSI[i].gib + '.', POGON[i], 'Svaka os je servopogon: motor s kočnicom i mjernim članom, prijenosnik i regulacija u ormaru. Klikni „Kako radi” za kaskadnu regulaciju položaja.') + podaciOsi(i), 'regulacija', { zglob: i, unutra: true });
  PODSTAVKE.forEach(([k, naziv, engl, ids, tema, samo]) => {
    if (samo && !samo.includes(i)) return;
    stavka(2, naziv, engl + ' — axis ' + (i + 1), ids(i), PODTEKST[k](i), tema, { zglob: i, unutra: true, kljuc: k });
  });
}
stavka(1, 'Unutarnji kabelski snop', 'Internal cabling', ['kabelskiSnop'],
  P('Kabeli za motore, kočnice, mjerne članove i korisničke vodove prolaze unutar robota od postolja do zapešća. Kroz okretne osi idu tako da se pri gibanju savijaju i uvijaju u predviđenim granicama.',
    'Zato se os 6 ne smije neograničeno okretati s kabelima alata izvan robota, a vodovi koji idu vani uz ruku moraju biti vođeni s dovoljno zazora. Put snopa u modelu je načelan.'), null, { unutraBaza: true, pogled: 'bok' });
stavka(1, 'Kalibracija', 'Calibration', ['oznakeKalibracije'],
  P('Kalibracija povezuje izmjereni kut motora sa stvarnim kutom osi. Novija izdanja priručnika kao standardni postupak navode Axis Calibration; starija opisuju finu kalibraciju s kalibracijskim zaticima i alatom na osi 6, a osi 1–3 i 4–6 kalibriraju se u skupinama s privjeska.',
    'Kalibracijski položaj prema priručniku je A1 −170,2°, A2 −115,1°, A3 +75,8°, A4 −174,7°, A5 −90°, A6 +90°. Gumb „Kalibracijski” pokazuje ga ograničen na radni opseg, jer su vrijednosti za osi 1–4 malo izvan opsega iz specifikacije.',
    'Oznake za sinkronizaciju (u modelu narančaste) služe za grubu provjeru: kad su obje polovice oznake poravnate, os je blizu kalibracijskog kuta.'), 'kalibracija', { polozaj: 'kalibracijski', pogled: 'robot' });
stavka(1, 'Prihvatnica (primjer alata)', 'Gripper example', ['prihvatnica'],
  P('Prihvatnica nije dio robota: to je naš primjer alata — paralelna hvataljka SCHUNK PGN-plus 80 s 3D-tiskanim prstima, ista kao u AR prikazu i simulatorima IRB 120 na ovim stranicama.',
    'Masa alata i tereta zajedno ne smije prijeći nosivost od 3 kg, a težište mora biti u dopuštenom području dijagrama opterećenja iz specifikacije. Uključi ili isključi prihvatnicu kvačicom ispod prikaza.'), null, { prihvatnica: true });
stavka(1, 'Upravljački ormar IRC5 Compact', 'IRC5 Compact controller', ['ormar'],
  P('IRC5 Compact je kompaktni upravljački ormar za male ABB robote. Druga generacija (od 2015.) ima mjere 310 × 449 × 442 mm; ABB-ov list podataka iz 2023. navodi visinu 320 mm i masu 28,5 kg, a prva generacija 27,5 kg — podatke treba provjeriti na pločici svog ormara.',
    'Napaja se jednofaznim naponom 220/230 V, 50–60 Hz, zaštite je IP20 i radi pri 0–45 °C. Ima 16 digitalnih ulaza i 16 izlaza (proširivo), Ethernet i opcijske fieldbus sabirnice. Izvodi sustavski softver RobotWare.',
    'Kad odabereš ormar ili njegov dio, gornji poklopac u modelu se otvori. Raspored dijelova je naš, načelni. ABB ga danas vodi kao ukinut proizvod; zamjena je OmniCore (E10, C30, C90XT).'), 'ormarIRC5', { ormar: true, pogled: 'ormar' });
const ORM = [
  ['Glavna sklopka', 'Main switch', ['glavnaSklopka'], P('Glavna sklopka na prednjoj ploči uključuje i isključuje napajanje cijelog sustava. Prije radova u ormaru ili na robotu sklopka se isključi i osigura od ponovnog uključenja.'), null],
  ['Preklopnik načina rada', 'Mode switch', ['preklopnikNacina'], P('Preklopnikom s ključem bira se način rada: automatski (program radi samostalno, zaštitne naprave stanice su aktivne) ili ručni sa smanjenom brzinom (najviše 250 mm/s, gibanje samo uz uređaj za omogućavanje).',
    'Ručni način s punom brzinom je opcija i nije dostupan na svim sustavima. Klikni „Kako radi”.'), 'nacini'],
  ['Tipka Motors On', 'Motors On button', ['tipkaMotorsOn'], P('Tipka Motors On uključuje motore u automatskom načinu: sklopnici spoje snagu na pogone i kočnice se otpuste. Bijela lampica u tipki trepće dok sustav čeka potvrdu, a svijetli stalno kad su motori uključeni.',
    'Nakon nužnog zaustavljanja motori se ponovno uključuju tek kad se gljiva otpusti i stanje potvrdi. Ponašanje lampice je uobičajeno za IRC5; za svoj sustav provjeri priručnik.'), 'sigurnosniLanac'],
  ['Gljiva za nužno zaustavljanje', 'Emergency stop', ['gljivaOrmara'], P('Gljiva na ormaru i gljiva na privjesku spojene su u isti sigurnosni lanac. Pritisak bilo koje od njih prekida oba kanala lanca, sklopnici odvajaju snagu od motora i kočnice zakoče.',
    'Gljiva ostaje zaključana dok je ručno ne otpustiš. Klikni „Kako radi” i usporedi kategorije zaustavljanja.'), 'zaustavljanje'],
  ['Tipka za otpuštanje kočnica', 'Brake release button', ['otpustanjeKocnica'], P('Ispod prozirnog poklopca na prednjoj ploči je tipka koja otpušta kočnice svih osi (uz IRB 120 ugrađuje se samo za taj robot). Služi kad treba ručno pomaknuti ruku, npr. osloboditi zaglavljen predmet.',
    'Dok je tipka pritisnuta, osi nisu zakočene i ruka pod teretom krene odmah — prije pritiska ruku poduprijeti, a rad dopustiti samo osposobljenoj osobi.'), 'kocnica'],
  ['Glavno računalo', 'Main computer', ['glavnoRacunalo'], P('Glavno računalo izvodi RobotWare: interpretira program u jeziku RAPID, planira putanje, upravlja ulazima i izlazima i komunicira s privjeskom.',
    'Na računalnoj jedinici su priključci Service (za računalo s RobotStudijom), LAN1 (FlexPendant), LAN2 i LAN3, WAN te četiri USB priključka. Isti RobotWare izvodi i virtualni kontroler u RobotStudiju — klikni „Kako radi”.'), 'virtualniKontroler'],
  ['Osno računalo', 'Axis computer', ['osnoRacunalo'], P('Osno računalo prima od glavnog računala zadane položaje osi i u brzom taktu računa zadane struje za pogone, uz povratnu vezu od mjernih članova motora.',
    'Takt i pojačanja regulacije ABB ne objavljuje. Klikni „Kako radi” za kaskadnu regulaciju položaj – brzina – struja.'), 'regulacija'],
  ['Pogonska jedinica', 'Drive unit', ['pogonskaJedinica'], P('Pogonska jedinica sadrži pretvarače koji iz istosmjernog međukruga napajaju namote šest motora strujom zadane jakosti i faze.',
    'Kad robot koči, motori vraćaju energiju u međukrug; višak se troši na otporniku za kočenje. Unutarnju izvedbu ABB ne objavljuje. ' + NAC), 'regulacija'],
  ['Napajanje 24 V', 'Power supply', ['napajanje24V'], P('Izvor napajanja daje 24 V istosmjerno za računala, ploče, kočnice i ulaze i izlaze. ' + NAC), null],
  ['I/O ploča', 'I/O board', ['ioPloca'], P('I/O ploča ima 16 digitalnih ulaza i 16 digitalnih izlaza (24 V). Na njih se spajaju senzori, ventili hvataljke i signali za PLC stanice; sustav se može proširiti modulima i fieldbus sabirnicama do 8192 signala.',
    'Uz ormar se kao gospodar (master) mogu koristiti DeviceNet, PROFINET, PROFIBUS DP i EtherNet/IP — ovisno o opcijama u RobotWareu.'), null],
  ['Sigurnosna ploča', 'Safety board', ['sigurnosnaPloca'], P('Sigurnosna ploča nadzire dva jednaka sigurnosna lanca. Na lance su spojeni ulazi nužnog zaustavljanja (ES), automatskog zaustavljanja (AS), općeg zaustavljanja (GS), uređaja za omogućavanje (ED) i graničnih sklopki (LS).',
    'Prekid bilo kojeg ulaza otvara sklopnike motora. Klikni „Kako radi”.'), 'sigurnosniLanac'],
  ['Sklopnici', 'Contactors', ['sklopnici'], P('Sklopnici K42 i K43 spajaju snagu na motore (dva u nizu, po jedan za svaki sigurnosni lanac), a sklopnik K44 upravlja kočnicama.',
    'Dva sklopnika u nizu znače da zavareni kontakt jednog sklopnika ne može zadržati motore pod snagom — drugi ih i dalje odvaja.'), 'sigurnosniLanac'],
  ['Otpornik za kočenje', 'Brake resistor (bleeder)', ['otpornikKocenja'], P('Kad robot usporava, motori rade kao generatori. Energiju koju međukrug ne može primiti otpornik za kočenje pretvara u toplinu, pa napon međukruga ne naraste previše. ' + NAC), null],
  ['Mrežni filtar', 'Line filter', ['mrezniFilter'], P('Mrežni filtar na ulazu napajanja smanjuje elektromagnetske smetnje koje pretvarači šalju u mrežu i štiti elektroniku ormara od smetnji iz mreže. ' + NAC), null],
  ['Ventilatori', 'Fans', ['ventilatori'], P('Ventilatori tjeraju zrak kroz ormar i hlade pogonsku jedinicu i računala. Ormar je zaštite IP20 i radi pri 0–45 °C, pa mora stajati na čistom, suhom mjestu s prostorom za strujanje zraka.'), null],
  ['Priključci za kabele robota', 'Robot cable connectors', ['prikljucciOrmara'], P('Straga na ormaru spajaju se kabel snage i signalni kabel robota (s druge strane R1.MP i R1.SMB na postolju), mrežni kabel i kabel privjeska. Nazive priključaka na ormaru provjeri u priručniku svog ormara. ' + NAC), null]
];
ORM.forEach(([naziv, engl, ids, tekst, tema]) => stavka(2, naziv, engl, ids, tekst, tema, { ormar: true, pogled: 'ormar' }));
stavka(1, 'Kabeli robota', 'Robot cables', ['kabelRobota'],
  P('Kabel snage i signalni kabel povezuju postolje robota s ormarom. Kroz kabel snage idu struje motora i napajanje kočnica, a kroz signalni kabel podaci mjernih članova s ploče sučelja enkodera.',
    'Kabeli se ne smiju gaziti, prignječiti ni vući preko oštrih rubova; oštećen signalni kabel javlja se greškama mjernog sustava.'), null, { pogled: 'sve' });
stavka(1, 'Privjesak FlexPendant', 'FlexPendant', ['privjesak'],
  P('FlexPendant je ručna jedinica za upravljanje i programiranje: dodirni zaslon u boji, palica za ručno pomicanje, gljiva za nužno zaustavljanje i tripoložajni uređaj za omogućavanje na stražnjoj strani. Masa mu je oko 1 kg.',
    'Na njemu se pomiče robot, pišu i ispituju programi u RAPID-u, namještaju alati i radni objekti te prate poruke sustava. Novija izvedba iz 2023. ima zaslon 8″ s višestrukim dodirom.'), null, { pogled: 'privjesak' });
[['Dodirni zaslon', 'Touch screen', ['zaslonPrivjeska'], P('Na zaslonu su izbornici sustava: ručno pomicanje (Jogging), urednik programa, ulazi i izlazi, kalibracija, poruke događaja. Zaslon se dodiruje prstom ili olovkom.',
    'Slika zaslona u modelu je naš pojednostavljeni crtež, ne stvarno sučelje.'), null, 'privjesak'],
 ['Palica', 'Joystick', ['palica'], P('Palicom se robot ručno pomiče: otklon palice određuje smjer i brzinu. Što se pomiče — osi pojedinačno ili alat pravocrtno i oko svojih osi — biraš tipkama za način gibanja (osi 1–3, osi 4–6, linearno, preorijentacija).',
    'Robot se palicom giba samo dok je uređaj za omogućavanje u srednjem položaju.'), 'tripolozajni', 'privjesak'],
 ['Gljiva za nužno zaustavljanje', 'Emergency stop', ['gljivaPrivjeska'], P('Gljiva na privjesku djeluje kao gljiva na ormaru: prekida sigurnosni lanac i zaustavlja robot. Ostaje zaključana dok je ne otpustiš.'), 'zaustavljanje', 'privjesak'],
 ['Tripoložajni uređaj za omogućavanje', 'Three-position enabling device', ['tripolozajni'], P('Uređaj za omogućavanje na stražnjoj strani privjeska ima tri položaja: pušten, napola pritisnut i do kraja stisnut. Motori su uključeni i robot se smije gibati samo u srednjem položaju.',
    'Ako ga pustiš ili u strahu stisneš do kraja, robot stane. U ručnom načinu s punom brzinom treba držati i tipku za pokretanje (hold-to-run).'), 'tripolozajni', 'privjesakStraga'],
 ['Tipke na privjesku', 'Programmable and motion keys', ['programirljiveTipke'], P('Četiri programirljive tipke (A–D) dodjeljuju se npr. otvaranju i zatvaranju hvataljke. Uz njih su tipke za izbor mehaničke jedinice, načina gibanja i koraka (inkrementalno pomicanje).'), null, 'privjesak'],
 ['Tipke Start, Stop i korak', 'Start, Stop, Step keys', ['tipkeStart'], P('Tipkama Start i Stop pokreće se i zaustavlja program, a tipkama korak naprijed i korak natrag program se izvodi naredbu po naredbu — tako se novi program ispituje polako, uz praćenje svake točke.'), null, 'privjesak'],
 ['USB priključak', 'USB port', ['usbPrivjeska'], P('Na USB priključak privjeska spaja se memorija za spremanje i učitavanje programa i sigurnosnih kopija sustava. ' + NAC), null, 'privjesak']
].forEach(([naziv, engl, ids, tekst, tema, pogled]) => stavka(2, naziv, engl, ids, tekst, tema, { pogled }));
stavka(1, 'Načini rada', 'Operating modes', ['preklopnikNacina'],
  P('IRC5 poznaje automatski način, ručni način sa smanjenom brzinom (TCP najviše 250 mm/s) i, kao opciju, ručni način s punom brzinom (počinje s 3 % brzine, uz uređaj za omogućavanje i tipku hold-to-run; nije dopušten u SAD-u i Kanadi).',
    'Za IRC5 Compact u ABB-ovoj zajednici navodi se da ručni način s punom brzinom nije dostupan — to je podatak s foruma, nepotvrđen. Klikni „Kako radi”.'), 'nacini', { ormar: true, pogled: 'ormar' });
stavka(1, 'Sigurnosni lanac', 'Safety chain', ['sigurnosnaPloca', 'sklopnici'],
  P('Sigurnost robota temelji se na dvama jednakim sigurnosnim lancima: svaki ulaz (ES, AS, GS, ED, LS) ima dva kanala, a motore odvajaju dva sklopnika u nizu. Kvar jednog kanala ne isključuje zaštitu, a sustav nesklad kanala prijavi kao grešku.',
    'Programska zaustavljanja (SoftES, SoftAS, SoftGS, SoftSS) mogu se podesiti kao kategorija 0 ili 1. Klikni „Kako radi”.'), 'sigurnosniLanac', { ormar: true, pogled: 'ormar' });
stavka(2, 'Kategorije zaustavljanja', 'Stop categories', [],
  '<ul><li><b>Kategorija 0</b> — snaga se motorima odmah odvaja i kočnice zakoče; robot staje bez kontrole putanje.</li><li><b>Kategorija 1</b> — robot se kontrolirano zaustavi na putanji, a tek tada se snaga odvaja i kočnice zakoče.</li><li><b>Kategorija 2</b> — robot se kontrolirano zaustavi, a snaga ostaje uključena.</li></ul>' +
  P('Koja kategorija vrijedi za koji ulaz, određuje konfiguracija sustava. Klikni „Kako radi” i usporedi ih.'), 'zaustavljanje', { pogled: 'robot' });
stavka(1, 'RobotWare i RobotStudio', 'RobotWare and RobotStudio', ['glavnoRacunalo'],
  P('RobotWare je sustavski softver ormara (na IRC5 inačice 5 i 6): izvodi programe u RAPID-u, planira putanje i nadzire robot. Opcije RobotWarea (npr. fieldbus, dodatne funkcije) otključavaju se licencom.',
    'RobotStudio je ABB-ov program za računalo u kojemu virtualni kontroler izvodi isti RobotWare kao stvarni ormar. Zato se program napisan i ispitan u simulaciji može prenijeti na robot. Više na stranici <a href="robotstudio.html">RobotStudio</a>.'), 'virtualniKontroler', { ormar: true, pogled: 'ormar' });
stavka(1, 'Održavanje', 'Maintenance', [],
  '<ul><li>Zupčasti remeni osi 3 i 5 — pregled svakih 36 mjeseci.</li><li>Baterija — zamjena svakih 36 mjeseci ili kod upozorenja 38213 „Battery charge low”.</li><li>Prijenosnici — mast, ne ulje; količine po osima 58 / 40 / 11 / 3,5 / 5 / 3,5 g.</li><li>Generalni remont — nakon oko 30 000 sati rada.</li></ul>' +
  P('Razdoblja ovise o uvjetima rada; za svoj robot vrijedi priručnik proizvoda i stvarni broj radnih sati.'), null, { pogled: 'robot' });
stavka(1, 'Podaci o robotu', 'Robot data', [],
  P('Ispod 3D prikaza je tablica s osnovnim podacima robota, osi, ormara i privjeska, sa svakim podatkom povezanim s izvorom. Gdje se izvori ne slažu, navedena su oba podatka.'), null, { sekcija: 'podaci', pogled: 'robot' });
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
let pod;
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(120,140,150,0.42)'); gr.addColorStop(0.7, 'rgba(120,140,150,0.16)'); gr.addColorStop(1, 'rgba(120,140,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  pod = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pod.rotation.x = -Math.PI / 2; pod.position.set(0.35, -0.001, 0.05); scene.add(pod);
}
let R;
try { R = await napraviIRB120(THREE, GLTFLoader, { glb: '../ar/irb120/irb120.glb' }); }
catch (e) { const uc = $('ucitavanje'); if (uc) uc.textContent = 'Model robota nije se učitao (' + (e && e.message ? e.message : e) + '). Stranicu treba otvoriti s poslužitelja (https).'; throw e; }
scene.add(R.korijen);
const q = POLOZAJI.pocetni.slice();
R.postavi(q);

const SVI = [];
R.korijen.traverse((o) => { if (o.isMesh && !(o.parent && (o.parent.isLine || o.parent.isLineSegments))) { o.userData.m0 = o.material; SVI.push(o); } });
function dioOd(o) { let p = o; while (p) { if (p.userData && p.userData.dio) return p.userData.dio; p = p.parent; } return null; }
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
function meshevi(ids) { const s = new Set(); ids.forEach((id) => { const d = R.dijelovi.get(id); if (d) d.objekti.forEach((ob) => ob.traverse((o) => { if (o.isMesh && o.userData.m0) s.add(o); })); }); return s; }
const naziv = (id) => (R.dijelovi.get(id) || {}).naziv || id;
const IZVAN_ROBOTA = new Set(); [R.ormar && R.ormar.grupa, R.privjesak && R.privjesak.parent, R.kabeli].forEach((g) => { if (g) g.traverse((o) => { if (o.isMesh) IZVAN_ROBOTA.add(o); }); });

const hiMat = new Map(), duhMat = new Map(), pomMat = new Map(), duh2Mat = new Map();
function izvedeni(map, m0, fn) { let m = map.get(m0.uuid); if (!m) { m = m0.clone(); fn(m); map.set(m0.uuid, m); } return m; }
const HI = (m0) => izvedeni(hiMat, m0, (m) => { if (m.emissive) { m.emissive = new THREE.Color(0x2ecad4); m.emissiveIntensity = 0.16; } });
const DUH = (m0) => izvedeni(duhMat, m0, (m) => { m.transparent = true; m.opacity = Math.min(m.opacity, 0.08); m.depthWrite = false; if (m.emissive) m.emissive.setHex(0); });
const DUH2 = (m0) => izvedeni(duh2Mat, m0, (m) => { m.transparent = true; m.opacity = Math.min(m.opacity, 0.2); m.depthWrite = false; if (m.emissive) m.emissive.setHex(0); });
const POM = (m0) => izvedeni(pomMat, m0, (m) => { if (m.emissive) { m.emissive = new THREE.Color(0xf2a51a); m.emissiveIntensity = 0.32; } });
const rubMat = new THREE.LineBasicMaterial({ color: 0x17a8b4, transparent: true, opacity: 0.85 });
const rubovi = [];

/* ================================================================== */
/* 3. Stanje stranice                                                  */
/* ================================================================== */
const st = { akt: 1, otvoreni: new Set(), sel: new Set(), prikaz: 'sve', prozirno: true, pom: new Set(), zglob: 0, unutra: false, autoUnutra: false, unutraBaza: false,
  rastav: false, tR: 0, ormarCilj: 0, temaKljuc: null, fokus: new Set(), prihvatnica: false };
const vidjeni = new Set();
try { JSON.parse(localStorage.getItem('ftq-irb120-upoznavanje') || '[]').forEach((x) => vidjeni.add(+x)); } catch (e) { /* bez spremanja */ }
function spremi() { try { localStorage.setItem('ftq-irb120-upoznavanje', JSON.stringify([...vidjeni])); } catch (e) { /* bez spremanja */ } }
let crtati = true;
function trazi() { crtati = true; }

function osvjeziIzgled() {
  trazi();
  rubovi.splice(0).forEach((l) => { l.parent && l.parent.remove(l); l.geometry.dispose(); });
  const ima = st.sel.size > 0, rub = st.sel.size <= 200, fok = st.fokus.size > 0;
  SVI.forEach((o) => {
    const m0 = o.userData.m0, u = st.sel.has(o), proz = !!o.userData.prozirno;
    let vid = true, m = m0;
    if (u) { if (!proz && !o.userData.vlastitiMat) m = HI(m0); }
    else if (st.pom.has(o)) m = proz || o.userData.vlastitiMat ? m0 : POM(m0);
    else if (fok && st.fokus.has(o)) m = ima && !proz && !o.userData.vlastitiMat ? DUH2(m0) : m0;
    else if (ima || fok) { if (st.prikaz === 'odabrano' && ima) vid = false; else if ((st.prozirno || fok) && !o.userData.vlastitiMat) m = proz ? m0 : DUH(m0); }
    if (fok && IZVAN_ROBOTA.has(o) && !u) vid = false;
    o.visible = vid; o.material = m;
    if (u && rub && o.geometry && !proz && o.geometry.attributes.position.count < 30000) {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 35), rubMat); l.raycast = () => {}; o.add(l); rubovi.push(l);
    }
  });
}

/* ================================================================== */
/* 4. Kamera: pogledi i let do dijela                                  */
/* ================================================================== */
const POGLEDI = {
  sve: [[-0.5, 0.95, 1.7], [0.36, 0.25, 0]], robot: [[-0.55, 0.62, 1.05], [0.08, 0.32, 0]], sprijeda: [[1.25, 0.45, 0.0], [0.08, 0.32, 0]],
  bok: [[0.1, 0.42, 1.25], [0.12, 0.34, 0]], odozgo: [[0.1, 1.7, 0.25], [0.1, 0, 0]], straga: [[-0.85, 0.38, 0.45], [-0.18, 0.1, 0]],
  ormar: [[0.55, 0.78, 1.05], [0.82, 0.18, 0.02]],
  privjesak: [[1.18, 0.62, 0.62], [1.25, 0.06, 0.12]], privjesakStraga: [[1.55, 0.3, -0.35], [1.25, 0.06, 0.12]]
};
let let_ = null;
function pogled(ime, glatko = true) { const p = POGLEDI[ime] || POGLEDI.robot; leti(new THREE.Vector3(...p[0]), new THREE.Vector3(...p[1]), glatko); }
function leti(poz, cilj, glatko = true) {
  if (!glatko) { let_ = null; camera.position.copy(poz); controls.target.copy(cilj); controls.update(); trazi(); return; }
  let_ = { t0: performance.now(), d: 900, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz, c1: cilj };
}
function kutija(ids) {
  const b = new THREE.Box3(); let ok = false;
  ids.forEach((id) => { const d = R.dijelovi.get(id); if (d) d.objekti.forEach((o) => { if (!vidljivo(o)) return; o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); if (!bb.isEmpty()) { b.union(bb); ok = true; } }); });
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
function letiDoOsi(i) {
  const o = R.osi[i]; if (!o) return;
  o.cvor.updateMatrixWorld(true);
  const b = kutija(UNUTRA_IDS.map((x) => x + (i + 1)));
  const s = b ? b.getCenter(new THREE.Vector3()) : o.cvor.localToWorld(o.sredina.clone());
  const rb = b ? b.getSize(new THREE.Vector3()).length() / 2 : o.r;
  const z = o.os.clone().transformDirection(o.cvor.matrixWorld);
  let bok = new THREE.Vector3().crossVectors(z, new THREE.Vector3(0, 1, 0)); if (bok.lengthSq() < 0.1) bok.set(0, 0, 1); bok.normalize();
  const odKamere = camera.position.clone().sub(controls.target); if (bok.dot(odKamere) < 0) bok.negate();
  let zz = z.clone(); if (zz.dot(odKamere) < 0) zz.negate();
  const smjer = zz.multiplyScalar(0.7).add(bok.multiplyScalar(0.7)).add(new THREE.Vector3(0, 0.35, 0)).normalize();
  leti(s.clone().add(smjer.multiplyScalar(udaljenost(Math.max(0.1, rb * 1.5), 1.1))), s);
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
const UNUTRA_IDS = ['motor', 'prijenosnik', 'remen', 'kocnica', 'resolver'];
function primijeniUnutrasnjost() {
  for (let k = 0; k < 6; k++) R.unutrasnjost(k, k === st.zglob && (st.unutra || st.autoUnutra));
  R.unutrasnjost(6, st.unutraBaza);
  const f = !st.rastav && (st.unutra || st.autoUnutra) ? st.zglob : -1;
  st.fokus = f >= 0 ? meshevi(UNUTRA_IDS.map((x) => x + (f + 1))) : (st.unutraBaza && !st.rastav ? meshevi(['plocaEnkodera', 'baterija', 'kabelskiSnop']) : new Set());
  $('z-unutra').setAttribute('aria-pressed', String(st.unutra || st.autoUnutra));
  $('z-rastavi').setAttribute('aria-pressed', String(st.rastav));
  osvjeziIzgled();
}
function postaviOs(i) { st.zglob = i; $('z-izbor').value = String(i); }
function odaberi(n, bezLeta = false) {
  const m = MENI.find((x) => x.n === n) || MENI[0];
  st.akt = m.n; otvoriPutanju(m.n);
  vidjeni.add(m.n); spremi();
  if (m.prihvatnica && !st.prihvatnica) { st.prihvatnica = true; $('p-alat').checked = true; R.prihvatnica(true); }
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
  $('naslov-3d').textContent = m.zglob != null && m.razina > 1 ? m.naziv + ' — ' + NAZIVI_OSI[m.zglob] : m.naziv;
  if (m.zglob != null) postaviOs(m.zglob);
  st.autoUnutra = !!m.unutra;
  st.unutraBaza = !!m.unutraBaza;
  st.ormarCilj = m.ormar ? 1 : 0;
  primijeniUnutrasnjost(); crtajStablo();
  if (m.polozaj) idiU(m.polozaj);
  if (!bezLeta && poz) { cekaLet = () => odaberiLet(m); return; }
  if (!bezLeta) odaberiLet(m);
}
let cekaLet = null;
function odaberiLet(m) {
  {
    if (m.zglob != null && !st.rastav) letiDoOsi(m.zglob);
    else if (m.ids.length && m.n > 2 && !m.ormar && !/^privjesak|^zaslon|^palica|^gljivaP|^tripol|^program|^tipkeS|^usb/.test(m.ids[0]) && m.ids[0] !== 'kabelRobota') letiDoDijela(m.ids, m.pogled);
    else pogled(m.pogled || 'robot');
  }
  if (m.sekcija) setTimeout(() => { const el = $(m.sekcija); if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 700);
}
$('k-prije').addEventListener('click', () => { if (st.akt > 1) odaberi(st.akt - 1); });
$('k-dalje').addEventListener('click', () => { if (st.akt < UKUPNO) odaberi(st.akt + 1); });
$('k-djeca').addEventListener('click', (e) => { const b = e.target.closest('[data-skok]'); if (b) odaberi(+b.dataset.skok); });

/* „Kako radi” — animacija iz modula teme_irb.js */
let tema = null;
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
  const ki = document.querySelector('.uz-kartica .karta-in');
  ki.insertBefore($('k-tema-el'), $('k-tekst')); ki.insertBefore($('k-tema-g'), $('k-tema-el'));
  const nas = sek.querySelector('.tur-naslov'), uvod = sek.querySelector('.tur-uvod');
  for (const qq of ['.tur-ocit', '.tur-stanje', '.tur-upr']) { const x = sek.querySelector('.tur-desno ' + qq); if (x && nas) nas.after(x); }
  if (uvod) { const d = sek.querySelector('.tur-desno'); if (d) d.prepend(uvod); }
  ki.scrollTop = 0;
  $('poz-zatvori').addEventListener('click', zatvoriTemu);
}
function sPozornice() { const p = $('pozornica'); if (p) { p.hidden = true; p.replaceChildren(); } const ki = document.querySelector('.uz-kartica .karta-in'); if (ki && $('k-djeca')) { ki.insertBefore($('k-tema-g'), $('k-djeca')); ki.insertBefore($('k-tema-el'), $('k-djeca')); } }
SIROKO.addEventListener('change', () => { if (tema || !$('k-tema-el').hidden) zatvoriTemu(); });
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
  const T = await import('./teme_irb.js?v=01').catch(() => null);
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
function stavkaZaDio(id) { return MENI.find((m) => m.ids[0] === id && m.razina > 0) || MENI.find((m) => m.ids.includes(id)) || MENI[1]; }
function odaberiDio(id) { odaberi(stavkaZaDio(id).n); }

/* ================================================================== */
/* 8. Gumbi: pogledi, prikaz, osi, položaji                            */
/* ================================================================== */
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.pogled === 'ormar') { st.ormarCilj = 1; } pogled(b.dataset.pogled); }));
function prikaz(p) { st.prikaz = p; $('p-sve').setAttribute('aria-pressed', String(p === 'sve')); $('p-odabrano').setAttribute('aria-pressed', String(p === 'odabrano')); osvjeziIzgled(); }
$('p-sve').addEventListener('click', () => prikaz('sve')); $('p-odabrano').addEventListener('click', () => prikaz('odabrano'));
$('p-prozirno').addEventListener('change', () => { st.prozirno = $('p-prozirno').checked; osvjeziIzgled(); });
$('p-osi').addEventListener('change', () => { R.pomocni.osi($('p-osi').checked); trazi(); });
$('p-alat').addEventListener('change', () => { st.prihvatnica = $('p-alat').checked; R.prihvatnica(st.prihvatnica); osvjeziIzgled(); });
const opis = (t) => { $('z-opis').textContent = t; };
$('z-izbor').addEventListener('change', () => {
  const i = +$('z-izbor').value; postaviOs(i); st.autoUnutra = false; primijeniUnutrasnjost();
  if (st.unutra) letiDoOsi(i);
  opis('Odabrana je ' + NAZIVI_OSI[i].toLowerCase() + ' (' + OSI[i].naziv + ').');
});
$('z-rastavi').addEventListener('click', () => {
  st.rastav = !st.rastav;
  opis(st.rastav ? 'Robot je rastavljen po člancima: postolje, okretno kućište, donja ruka, gornja ruka, kućište zapešća, nagibno kućište i prirubnica. Kućišta su poluprozirna, a vide se pogoni svih osi (načelni prikaz).' : 'Robot se sklapa.');
  primijeniUnutrasnjost(); if (st.rastav) pogled('robot');
});
$('z-unutra').addEventListener('click', () => {
  st.unutra = !(st.unutra || st.autoUnutra); st.autoUnutra = false; primijeniUnutrasnjost();
  if (st.unutra) { letiDoOsi(st.zglob); opis('Kućište oko osi ' + (st.zglob + 1) + ' je poluprozirno — vide se motor, prijenosnik' + (st.zglob === 2 || st.zglob === 4 ? ', remen' : '') + ', kočnica i mjerni član (načelni prikaz).'); } else opis('Unutrašnjost je skrivena.');
});
/* pomicanje osi */
let pomak = null;
function oznaciPomicne(i) { st.pom = i == null ? new Set() : (() => { const s = new Set(); R.zglobovi[i].traverse((o) => { if (o.isMesh && o.userData.m0) s.add(o); }); return s; })(); osvjeziIzgled(); }
function pokreniPomak(redom) {
  zaustaviPoz();
  const niz = redom ? [0, 1, 2, 3, 4, 5] : [st.zglob];
  pomak = { niz, k: 0, t: 0, q0: q[niz[0]] };
  oznaciPomicne(niz[0]); $('z-stop').disabled = false;
  opisPomaka();
}
const AMP = [60, 30, 35, 70, 60, 120];
function opisPomaka() { const i = pomak.niz[pomak.k]; opis('Pomiče se ' + NAZIVI_OSI[i].toLowerCase() + ' (±' + AMP[i] + '° od trenutnog kuta; opseg ' + OSI[i].opseg + ', najveća brzina ' + OSI[i].v + ' °/s). Istaknuti su dijelovi koje ta os nosi.'); }
function staniPomak(tekst) {
  if (!pomak) return; const i = pomak.niz[pomak.k]; q[i] = pomak.q0; R.postavi(q);
  pomak = null; $('z-stop').disabled = true; oznaciPomicne(null); if (tekst) opis(tekst); prikaziQ();
}
function korakPomaka(dt) {
  if (!pomak) return false;
  const T = 2.8; pomak.t += dt;
  const i = pomak.niz[pomak.k], u = Math.min(1, pomak.t / T);
  q[i] = pomak.q0 + AMP[i] * Math.sin(u * Math.PI * 2);
  R.postavi(q);
  if (u >= 1) {
    q[i] = pomak.q0; R.postavi(q);
    pomak.k++; pomak.t = 0;
    if (pomak.k >= pomak.niz.length) { staniPomak('Gotovo — os je vraćena u početni kut.'); return true; }
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
  poz = { q0: q.slice(), q1: POLOZAJI[ime].slice(), t: 0, d: 1.4 };
  document.querySelectorAll('[data-polozaj]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.polozaj === ime)));
  const t = { pocetni: 'Početni položaj: gornja ruka vodoravno, prirubnica gleda prema dolje (os 5 na 90°).', kalibracijski: 'Kalibracijski položaj prema priručniku je A1 ' + KALIBRACIJSKI_PRIRUCNIK.map((v, k) => (k ? 'A' + (k + 1) + ' ' : '') + String(v).replace('.', ',') + '°').join(', ') + '; ovdje je prikazan ograničen na radni opseg osi.', nula: 'Nulti položaj: sve osi na 0° — gornja ruka vodoravno, prirubnica gleda naprijed. Od njega se mjere kutovi osi.', sklopljen: 'Sklopljen: ruka složena uz postolje — naš primjer položaja za mali radni prostor.', ispruzen: 'Ispružen: gornja ruka uspravno.' };
  opis(t[ime] || '');
}
document.querySelectorAll('[data-polozaj]').forEach((b) => b.addEventListener('click', () => idiU(b.dataset.polozaj)));
function korakPoz(dt) {
  if (!poz) return false;
  poz.t += dt; const u = Math.min(1, poz.t / poz.d), k = u * u * (3 - 2 * u);
  for (let i = 0; i < 6; i++) q[i] = poz.q0[i] + (poz.q1[i] - poz.q0[i]) * k;
  R.postavi(q); if (u >= 1) { poz = null; if (cekaLet) { const f = cekaLet; cekaLet = null; f(); } }
  return true;
}
function prikaziQ() {
  const w = new THREE.Vector3(); R.tcp.getWorldPosition(w);
  const z = R.korijen.getObjectByName('irb120'); const o = new THREE.Vector3(); if (z) z.getWorldPosition(o);
  $('osi').textContent = 'A1…A6 [°]  ' + q.map((v) => v.toFixed(0).padStart(4)).join(' ') + '\ntool0 [mm]  x ' + ((w.x - o.x) * 1000).toFixed(1) + '  y ' + (-(w.z - o.z) * 1000).toFixed(1) + '  z ' + ((w.y - o.y) * 1000).toFixed(1);
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
  const cilj = st.rastav ? 1 : 0;
  if (Math.abs(cilj - st.tR) > 1e-4) {
    const sad = st.tR, n = sad + Math.sign(cilj - sad) * Math.min(Math.abs(cilj - sad), dt * 0.85); st.tR = n; R.rastavi(ease(n)); ide = true;
    if ((n === 0) !== (sad === 0) || n === 1 || n === 0) { primijeniUnutrasnjost(); }
  }
  /* poklopac ormara */
  if (R.ormar && R.ormar.grupa) { const sad = R.ormar.t, c = st.ormarCilj; if (Math.abs(sad - c) > 1e-3) { R.ormar.otvori(sad + Math.sign(c - sad) * Math.min(Math.abs(c - sad), dt * 1.4)); ide = true; } }
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
window.__upoz = { scene, renderer, pogodak, R, MENI, st, q, odaberi, odaberiDio, pogled, otvoriTemu, letiDoOsi, idiU, pokreniPomak, staniPomak, camera, controls, POGLEDI, render: () => renderer.render(scene, camera), trazi, get brojCrtanja() { return brojCrtanja; }, get zauzet() { return zauzet || crtati; }, get pomak() { return pomak; }, get poz() { return poz; } };
requestAnimationFrame(petlja);
