/* FORTRONIQ · Dron nad vinogradom — jedini izvor podataka (vinograd, dron, kamera, scenariji, dijelovi).
   Sve brojke su procjena modela za nastavu (oznaka s: 1 = podatak iz pravila ili norme), ne podaci proizvođača.
   © ForTroniQ d.o.o. */

export const PRETP = {
  duljina: { t: 'Duljina vinograda (uzduž redova)', v: 300, jed: 'm' },
  sirina: { t: 'Širina vinograda (poprijeko redova)', v: 150, jed: 'm' },
  razmakRed: { t: 'Razmak redova', v: 2.4, jed: 'm' },
  razmakTrs: { t: 'Razmak trsova u redu', v: 1.2, jed: 'm' },
  krosnja: { t: 'Širina krošnje (špalir)', v: 0.6, jed: 'm' },
  senzorS: { t: 'Kamera: širina senzora', v: 4.8, jed: 'mm' },
  senzorV: { t: 'Kamera: visina senzora', v: 3.6, jed: 'mm' },
  zarisna: { t: 'Kamera: žarišna duljina', v: 5.5, jed: 'mm' },
  pikselS: { t: 'Kamera: piksela po širini', v: 1280, jed: '' },
  pikselV: { t: 'Kamera: piksela po visini', v: 960, jed: '' },
  ekspozicija: { t: 'Vrijeme ekspozicije', v: 0.004, jed: 's' },
  okidanje: { t: 'Najkraći razmak dviju snimki', v: 1.0, jed: 's' },
  minSnimki: { t: 'Točka je na karti kad je na najmanje', v: 4, jed: 'oštrih snimki' },
  energija: { t: 'Baterija: energija', v: 90, jed: 'Wh' },
  pLebdenje: { t: 'Snaga pri lebdenju', v: 180, jed: 'W' },
  kBrzina: { t: 'Porast snage s brzinom zraka', v: 0.006, jed: '1/(m/s)²' },
  vMax: { t: 'Najveća brzina zraka', v: 15, jed: 'm/s' },
  vPenjanje: { t: 'Brzina penjanja i spuštanja', v: 3, jed: 'm/s' },
  hMax: { t: 'Najveća visina leta u otvorenoj kategoriji (EU 2019/947)', v: 120, jed: 'm', s: 1 },
  ndviZdrav: { t: 'NDVI zdravog trsa', v: 0.78, jed: '' },
  ndviStres: { t: 'NDVI trsa u vodnom stresu', v: 0.6, jed: '' },
  ndviBolest: { t: 'NDVI trsa s razvijenom plamenjačom', v: 0.45, jed: '' },
  ndviRana: { t: 'NDVI trsa s ranim simptomima', v: 0.64, jed: '' },
  simptomRazvijen: { t: 'Veličina razvijenih simptoma na listu', v: 15, jed: 'cm' },
  simptomRan: { t: 'Veličina ranih simptoma (pjege)', v: 3, jed: 'cm' },
  ndviTlo: { t: 'NDVI golog tla (nedostaje trs)', v: 0.22, jed: '' },
  sum: { t: 'Šum mjerenja NDVI', v: 0.03, jed: '' },
  segment: { t: 'Sekcija prskalice (dio reda)', v: 6, jed: 'm' },
  norma: { t: 'Norma škropiva', v: 300, jed: 'L/ha' },
};
export const P = Object.fromEntries(Object.entries(PRETP).map(([k, o]) => [k, o.v]));

export const ZADANA_MISIJA = { visina: 40, brzina: 5, preklopU: 75, preklopB: 70, smjer: 'uz', rezerva: 25 };
export const ZADANA_KARTA = { prag: 0.6, donja: 0, nemapirano: false };

/* Scenariji: vjetar (m/s, sa zapada = duž redova), nalaz u vinogradu, zadana misija i karta, uvjeti uspjeha */
export const SCENARIJI = [
  { id: 'prvi', naziv: 'Prvi let', opis: 'Mirno jutro, vinograd bez većih problema. Zadana misija treba pokriti cijeli vinograd i vratiti se s rezervom baterije.',
    vjetar: 0, nalaz: { stres: 0, zarista: 2, pepelnica: 3, nedostaje: 0.02 }, sjeme: 11,
    uvjeti: [['pokrivenost', '>=', 99, 'karta pokriva najmanje 99 % trsova'], ['baterija', '>=', 25, 'dron se vraća s najmanje 25 % baterije']] },
  { id: 'vjetar', naziv: 'Vjetar sa zapada', opis: 'Puše 9 m/s sa zapada, točno uzduž redova. Protiv vjetra dron leti puno brže kroz zrak i troši više energije.',
    vjetar: 9, nalaz: { stres: 0, zarista: 2, pepelnica: 2, nedostaje: 0.02 }, sjeme: 23,
    uvjeti: [['pokrivenost', '>=', 99, 'karta pokriva najmanje 99 % trsova'], ['baterija', '>=', 25, 'dron se vraća s najmanje 25 % baterije'], ['zavrsen', '==', 1, 'misija završena u jednom letu']] },
  { id: 'brzo', naziv: 'Žurba: let na 9 m/s', opis: 'Netko je postavio brzinu 9 m/s da let bude kraći. Snimke se zamute, a kamera ne stigne okidati dovoljno često.',
    vjetar: 0, nalaz: { stres: 0, zarista: 3, pepelnica: 2, nedostaje: 0.02 }, sjeme: 37, misija: { brzina: 9 },
    uvjeti: [['pokrivenost', '>=', 99, 'karta pokriva najmanje 99 % trsova'], ['mutno', '<=', 0, 'nijedna snimka nije mutna']] },
  { id: 'visoko', naziv: 'Rani simptomi, let na 110 m', opis: 'Plamenjača je tek počela: pjege na lišću velike su nekoliko centimetara. Let na 110 m je kratak, ali piksel na tlu (GSD) veći je od pjega, pa se one stope sa zdravim lišćem.',
    vjetar: 0, nalaz: { stres: 0, zarista: 5, pepelnica: 4, nedostaje: 0.02, rana: 1 }, sjeme: 41, misija: { visina: 110 }, karta: { prag: 0.68, donja: 0.3 },
    uvjeti: [['odziv', '>=', 90, 'otkriveno najmanje 90 % bolesnih trsova'], ['tretirano', '<=', 25, 'tretira se najviše 25 % vinograda']] },
  { id: 'plamenjaca', naziv: 'Žarišta plamenjače', opis: 'Nakon kiše pojavila su se žarišta plamenjače, a gornji dio vinograda je u vodnom stresu. Karta tretmana treba pogoditi bolest, ne sušu ni prazna mjesta.',
    vjetar: 2, nalaz: { stres: 1, zarista: 6, pepelnica: 4, nedostaje: 0.05 }, sjeme: 53,
    uvjeti: [['odziv', '>=', 90, 'otkriveno najmanje 90 % bolesnih trsova'], ['tretirano', '<=', 25, 'tretira se najviše 25 % vinograda']] },
  { id: 'preklop', naziv: 'Premalo preklapanja', opis: 'Da bi let bio kraći, preklapanje je smanjeno na 50 % uzduž i 40 % poprijeko. Na karti ostaju rupe.',
    vjetar: 0, nalaz: { stres: 0, zarista: 3, pepelnica: 3, nedostaje: 0.02 }, sjeme: 61, misija: { preklopU: 50, preklopB: 40 },
    uvjeti: [['pokrivenost', '>=', 99, 'karta pokriva najmanje 99 % trsova'], ['baterija', '>=', 25, 'dron se vraća s najmanje 25 % baterije']] },
];

export const SKUPINE = [
  { id: 'dron', naziv: 'Dron' },
  { id: 'snimanje', naziv: 'Snimanje' },
  { id: 'upravljanje', naziv: 'Upravljanje i sigurnost' },
  { id: 'vinograd', naziv: 'Vinograd i karta' },
];

export const DIJELOVI = [
  { id: 'okvir', skupina: 'dron', uloga: 'konstrukcija', naziv: 'Okvir i krakovi', engl: 'frame, arms',
    tekst: ['Četiri kraka nose motore s propelerima. Dijagonalni parovi propelera vrte se u suprotnim smjerovima, pa se zakretni momenti ponište i dron ne rotira oko sebe.', 'Okvir nosi bateriju, upravljač leta i kameru na donjoj strani.'] },
  { id: 'motori', skupina: 'dron', uloga: 'aktuator', naziv: 'Motori i propeleri', engl: 'brushless motors, propellers',
    tekst: ['Bezčetkasti motori mijenjaju brzinu vrtnje stotine puta u sekundi. Razlikom brzine prednjih i stražnjih, lijevih i desnih propelera dron se naginje i kreće.', 'Snaga raste s brzinom kroz zrak: protiv vjetra dron troši više nego niz vjetar.'], pretp: ['pLebdenje', 'kBrzina', 'vMax'] },
  { id: 'baterija', skupina: 'dron', uloga: 'konstrukcija', naziv: 'Baterija', engl: 'LiPo battery',
    tekst: ['Litij-polimerna baterija daje energiju za cijeli let. Upravljač leta stalno računa koliko energije treba za povratak i pri zadanoj rezervi sam vraća dron kući.', 'Rezerva nije samo za povratak: hladnoća, vjetar i stariji članci smanjuju stvarni kapacitet.'], pretp: ['energija'] },
  { id: 'kamera', skupina: 'snimanje', uloga: 'osjetnik', naziv: 'Multispektralna kamera', engl: 'multispectral camera',
    tekst: ['Snima istodobno više uskih pojasa svjetla: crveni i blisko infracrveni (NIR) daju NDVI = (NIR − crveno) / (NIR + crveno). Zdrav list jako odbija NIR i upija crveno, pa ima visok NDVI.', 'Veličina piksela na tlu (GSD) raste s visinom leta: GSD = visina × širina senzora / (žarišna duljina × broj piksela). Simptom manji od piksela stapa se sa zdravim lišćem.', 'Za oštru snimku pomak drona za vrijeme ekspozicije mora biti manji od jednog piksela: brzina × ekspozicija ≤ GSD.'], pretp: ['senzorS', 'senzorV', 'zarisna', 'pikselS', 'ekspozicija', 'okidanje', 'simptomRazvijen', 'simptomRan'] },
  { id: 'dls', skupina: 'snimanje', uloga: 'osjetnik', naziv: 'Osjetnik osvjetljenja', engl: 'downwelling light sensor',
    tekst: ['Na vrhu drona mjeri koliko svjetla pada s neba u istim pojasima kao kamera. Tako se snimke kalibriraju: oblak koji prijeđe preko sunca ne smije izgledati kao bolest.'] },
  { id: 'gnss', skupina: 'upravljanje', uloga: 'osjetnik', naziv: 'GNSS prijamnik i kompas', engl: 'GNSS receiver, compass',
    tekst: ['Satelitski prijamnik daje položaj, a kompas smjer. Svaka snimka dobiva koordinate, pa se snimke slažu u kartu (ortofoto).', 'Za točnu kartu koriste se i kontrolne točke na tlu ili RTK prijamnik.'] },
  { id: 'upravljac', skupina: 'upravljanje', uloga: 'upravljac', naziv: 'Upravljač leta', engl: 'flight controller',
    tekst: ['Mali računalni sustav s inercijalnim osjetnicima (IMU). Stotine puta u sekundi uspoređuje željeni i stvarni položaj i podešava motore.', 'Izvodi misiju: uzlijeće, leti po linijama, okida kameru na zadanim razmacima i vraća se kući kad baterija padne na rezervu.'] },
  { id: 'daljinski', skupina: 'upravljanje', uloga: 'upravljac', naziv: 'Daljinski upravljač i aplikacija', engl: 'remote controller, ground station',
    tekst: ['Na tabletu se zadaje misija: poligon vinograda, visina, brzina i preklapanje. Pilot dron cijelo vrijeme vidi i može preuzeti ručno upravljanje.', 'U otvorenoj kategoriji EU-a let je u vidnom polju pilota i najviše 120 m iznad tla.'], pretp: ['hMax'] },
  { id: 'vinograd', skupina: 'vinograd', uloga: 'biljke', naziv: 'Vinograd', engl: 'vineyard',
    tekst: ['Redovi su uzgojeni na špaliru, između njih je tlo ili trava. Na snimci odozgo krošnja je uska traka, a između traka je tlo. Rubni pikseli krošnje miješaju list i tlo, pa veći piksel malo snižava NDVI.', 'Bolest se širi u žarištima, a suša zahvaća veće dijelove, najčešće gornji dio padine.'], pretp: ['duljina', 'sirina', 'razmakRed', 'razmakTrs', 'krosnja'] },
  { id: 'putanja', skupina: 'vinograd', uloga: 'upravljac', naziv: 'Putanja misije', engl: 'flight plan',
    tekst: ['Dron leti „kao kosilica": paralelne linije, okret na kraju i povratak susjednom linijom. Razmak linija određuje bočno preklapanje snimki, a razmak okidanja uzdužno.', 'Više preklapanja daje pouzdaniju kartu, ali dulji let.'], pretp: ['minSnimki'] },
  { id: 'karta', skupina: 'vinograd', uloga: 'biljke', naziv: 'Karta NDVI i karta tretmana', engl: 'NDVI map, prescription map',
    tekst: ['Iz snimki nastaje karta NDVI za svaki trs. Iz nje se pravilom određuje karta tretmana: koje sekcije reda prskalica tretira, a koje preskače.', 'Prazno mjesto bez trsa ima nizak NDVI kao i bolest, pa pravilo treba donju granicu.'], pretp: ['ndviZdrav', 'ndviStres', 'ndviBolest', 'ndviRana', 'ndviTlo', 'segment', 'norma'] },
];
