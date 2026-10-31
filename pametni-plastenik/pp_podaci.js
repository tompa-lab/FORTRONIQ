/* FORTRONIQ · Pametni plastenik — podaci (jedini izvor naziva, opisa, signala, pretpostavki, pravila i scenarija).
   Polazište: dokumenti „Pametni plastenik — simulator i poljoprivredni RCK-ovi“ (Specifikacija za izradu na DOS-u)
   i „Simulatori za RCK-ove — inženjerska razrada“ (odj. 1 i 2), 31. 10. 2026.
   Sve brojke su PROCJENA za prvu verziju (tako piše u specifikaciji) i označene su na stranici. © ForTroniQ d.o.o. */

export const VER = '01';

export const PLASTENIK = { naziv: 'Pametni plastenik', sirina: 45.3 };   /* kontinentalna Hrvatska */

/* ---------------------------------------------------------------- parametri modela (procjena)
   s: iz specifikacije (dokument), p: dodatna pretpostavka ovog modela */
export const PRETP = {
  tlocrt:    { v: '8 × 20', jed: 'm', t: 'Tlocrt plastenika (visina sljemena 3,5 m)', s: 1 },
  C:         { v: 2, jed: 'MJ/K', t: 'Toplinski kapacitet zone (zrak, tlo, biljke)', s: 1 },
  UA:        { v: 1.2, jed: 'kW/K', t: 'Gubitak topline kroz pokrov', s: 1 },
  tau:       { v: 0.75, jed: '', t: 'Propusnost pokrova za sunčevo zračenje', s: 1 },
  prozor:    { v: 3, jed: 'kg/s', t: 'Protok zraka kroz potpuno otvoren krovni prozor', s: 1 },
  grijac:    { v: 20, jed: 'kW', t: 'Snaga grijača (električni toplozračni)', s: 1 },
  korak:     { v: 1, jed: 's', t: 'Korak modela (simulirano vrijeme)', s: 1 },
  navod:     { v: 0.5, jed: '%/min', t: 'Porast vlage tla dok je elektroventil otvoren', s: 1 },
  stres:     { v: '15–30 °C, 30–60 %', jed: '', t: 'Granice bez stresa: temperatura zraka i vlaga tla', s: 1 },
  zasjena:   { v: 50, jed: '%', t: 'Zasjenjenje mreže (propušta polovinu zračenja)', s: 0 },
  transp:    { v: 55, jed: '%', t: 'Najveći udio upijenog zračenja koji biljke troše na transpiraciju (hlade zrak) kad je tlo dovoljno vlažno', s: 0 },
  hod:       { v: 60, jed: 's', t: 'Vrijeme hoda krovnog prozora od zatvorenog do otvorenog', s: 0 },
  ventilator:{ v: 1.5, jed: 'kg/s', t: 'Protok ispušnog ventilatora, snaga 0,75 kW', s: 0 },
  voda:      { v: 2, jed: 'm³/h', t: 'Protok kapaljki dok je elektroventil otvoren (crpka 0,5 kW)', s: 0 },
  volumen:   { v: 420, jed: 'm³', t: 'Volumen zraka u plasteniku (za vlagu zraka)', s: 0 },
  biljke:    { v: 400, jed: 'biljaka', t: 'Rajčica, 2,5 biljke po m²', s: 0 },
  led:       { v: 2, jed: 'kW', t: 'Dopunska LED rasvjeta (za rasadu, po izboru)', s: 0 },
  cijena:    { v: 0.15, jed: '€/kWh', t: 'Cijena električne energije; voda 1,50 €/m³', s: 0 },
  adrese:    { v: '', jed: '', t: 'Adrese ulaza i izlaza (%I, %IW, %Q) — primjer rasporeda', s: 0 },
};

/* ---------------------------------------------------------------- signali (popis iz inženjerske razrade + rasvjeta iz sastava) */
export const SIGNALI = [
  { id: 'T_UN',  vrsta: 'AI', adr: '%IW0', jed: '°C',   naziv: 'Temperatura zraka unutra', raspon: '−20 … 50 °C', dio: 'osjetnikT' },
  { id: 'T_VAN', vrsta: 'AI', adr: '%IW1', jed: '°C',   naziv: 'Temperatura zraka vani', raspon: '−20 … 50 °C', dio: 'meteo' },
  { id: 'RH',    vrsta: 'AI', adr: '%IW2', jed: '%',    naziv: 'Relativna vlaga zraka unutra', raspon: '0 … 100 %', dio: 'osjetnikT' },
  { id: 'TLO',   vrsta: 'AI', adr: '%IW3', jed: '%',    naziv: 'Vlaga tla (kapacitivni osjetnik)', raspon: '0 … 100 % volumno', dio: 'osjetnikTla' },
  { id: 'G',     vrsta: 'AI', adr: '%IW4', jed: 'W/m²', naziv: 'Ozračenje vani (piranometar)', raspon: '0 … 1000 W/m²', dio: 'meteo' },
  { id: 'P_OTV', vrsta: 'DI', adr: '%I0.0', jed: '',    naziv: 'Krajnji prekidač: prozor otvoren', raspon: '—', dio: 'prozor' },
  { id: 'P_ZAT', vrsta: 'DI', adr: '%I0.1', jed: '',    naziv: 'Krajnji prekidač: prozor zatvoren', raspon: '—', dio: 'prozor' },
  { id: 'VENTIL',vrsta: 'DO', adr: '%Q0.0', jed: '',    naziv: 'Elektroventil navodnjavanja (24 V)', raspon: '—', dio: 'navodnjavanje' },
  { id: 'OTVORI',vrsta: 'DO', adr: '%Q0.1', jed: '',    naziv: 'Motor krovnog prozora — otvori', raspon: '—', dio: 'prozor' },
  { id: 'ZATVORI',vrsta:'DO', adr: '%Q0.2', jed: '',    naziv: 'Motor krovnog prozora — zatvori', raspon: '—', dio: 'prozor' },
  { id: 'VENT',  vrsta: 'DO', adr: '%Q0.3', jed: '',    naziv: 'Ventilator', raspon: '—', dio: 'ventilator' },
  { id: 'GRIJ',  vrsta: 'DO', adr: '%Q0.4', jed: '',    naziv: 'Grijač', raspon: '—', dio: 'grijac' },
  { id: 'ZAS',   vrsta: 'DO', adr: '%Q0.5', jed: '',    naziv: 'Zasjena', raspon: '—', dio: 'zasjena' },
  { id: 'LED',   vrsta: 'DO', adr: '%Q0.6', jed: '',    naziv: 'Dopunska rasvjeta', raspon: '—', dio: 'rasvjeta' },
];

/* ---------------------------------------------------------------- dijelovi (upoznavanje sustava) */
export const SKUPINE = [
  { id: 'konstr', naziv: 'Konstrukcija i pokrov' },
  { id: 'osjet', naziv: 'Osjetnici' },
  { id: 'aktu', naziv: 'Aktuatori' },
  { id: 'upr', naziv: 'Upravljanje i biljke' },
];
export const DIJELOVI = [
  { id: 'konstrukcija', skupina: 'konstr', uloga: 'konstrukcija', naziv: 'Konstrukcija plastenika', engl: 'Greenhouse structure',
    tekst: ['Tunelski plastenik od pocinčanih čeličnih lukova, tlocrta 8 × 20 m i visine sljemena 3,5 m. Unutra je jedna klimatska zona: zrak, tlo i biljke izmjenjuju toplinu i vodu, pa se svaka odluka upravljanja vidi na sva tri.'],
    pretp: ['tlocrt', 'C'], signali: [] },
  { id: 'pokrov', skupina: 'konstr', uloga: 'konstrukcija', naziv: 'Pokrov (PE folija)', engl: 'Polyethylene cover',
    tekst: ['Folija propušta tri četvrtine sunčevog zračenja, a toplinu iznutra zadržava slabo: gubitak kroz pokrov je UA · (T unutra − T vani). Zato se plastenik danju brzo grije, a noću brzo hladi.',
      'Toplinska bilanca zone: C · dT/dt = Q_sunce + Q_grijač − UA · (T − T_van) − ṁ · c_p · (T − T_van).'],
    pretp: ['tau', 'UA'], signali: [] },
  { id: 'osjetnikT', skupina: 'osjet', uloga: 'osjetnik', naziv: 'Osjetnik temperature i vlage zraka', engl: 'Air temperature and humidity sensor',
    tekst: ['Mjeri temperaturu i relativnu vlagu zraka na visini biljaka, u zaštitnom kućištu od izravnog sunca. Na njegovu vrijednost reagiraju grijač, krovni prozor i ventilator.',
      'Vlaga zraka raste od transpiracije biljaka i pada kad se zrak izmjenjuje. Dugo vremena iznad 90 % pogoduje bolestima (plijesan).'],
    pretp: ['volumen'], signali: ['T_UN', 'RH'] },
  { id: 'osjetnikTla', skupina: 'osjet', uloga: 'osjetnik', naziv: 'Osjetnik vlage tla', engl: 'Capacitive soil moisture sensor',
    tekst: ['Kapacitivni osjetnik u zoni korijena mjeri volumni udio vode u tlu. Navodnjavanje se vodi prema njemu s histerezom: uključi ispod donje granice, isključi iznad gornje.',
      'Ako osjetnik zaglavi, program „vidi“ dovoljno vode i ne zalijeva, a biljke venu. Kvar se otkriva iz ravne crte na grafu dok sve ostalo upućuje na sušenje tla.'],
    pretp: ['stres'], signali: ['TLO'] },
  { id: 'meteo', skupina: 'osjet', uloga: 'osjetnik', naziv: 'Vanjska meteorološka stanica', engl: 'Outdoor weather station',
    tekst: ['Piranometar mjeri sunčevo ozračenje, a osjetnik vanjsku temperaturu. Zasjena se spušta prema ozračenju; vanjska temperatura određuje koliko prozor može ohladiti.'],
    pretp: [], signali: ['G', 'T_VAN'] },
  { id: 'prozor', skupina: 'aktu', uloga: 'aktuator', naziv: 'Krovni prozor s motorom', engl: 'Motorised roof vent',
    tekst: ['Motor otvara i zatvara krovni prozor; krajnji prekidači javljaju „otvoren“ i „zatvoren“. Upravljač drži nalog dok ne stigne potvrda krajnjeg prekidača — ako potvrda ne stigne, javlja alarm.',
      'Otvoren prozor izmjenjuje zrak: ṁ · c_p · (T − T_van). Hladi koliko je vani hladnije — u toplinskom valu malo.'],
    pretp: ['prozor', 'hod'], signali: ['OTVORI', 'ZATVORI', 'P_OTV', 'P_ZAT'] },
  { id: 'ventilator', skupina: 'aktu', uloga: 'aktuator', naziv: 'Ispušni ventilator', engl: 'Exhaust fan',
    tekst: ['Ventilator na zabatu dodatno izmjenjuje zrak kad sam prozor nije dovoljan: kod jake vrućine ili previsoke vlage zraka.'],
    pretp: ['ventilator'], signali: ['VENT'] },
  { id: 'zasjena', skupina: 'aktu', uloga: 'aktuator', naziv: 'Zasjena', engl: 'Shade screen',
    tekst: ['Zasjenjujuća mreža ispod pokrova propušta polovinu zračenja. Smanjuje zagrijavanje i transpiraciju, ali i svjetlo za fotosintezu — zato se spušta tek kod jakog sunca.'],
    pretp: ['zasjena'], signali: ['ZAS'] },
  { id: 'grijac', skupina: 'aktu', uloga: 'aktuator', naziv: 'Grijač', engl: 'Air heater',
    tekst: ['Toplozračni grijač štiti biljke od hladnoće. Mora proraditi na vrijeme, ali ne raditi cijelu noć: zadana temperatura i histereza određuju i komfor biljke i račun za struju. Ne radi dok je prozor otvoren.'],
    pretp: ['grijac'], signali: ['GRIJ'] },
  { id: 'navodnjavanje', skupina: 'aktu', uloga: 'aktuator', naziv: 'Navodnjavanje kapanjem', engl: 'Drip irrigation',
    tekst: ['Elektroventil 24 V pušta vodu u cijevi s kapaljkama uz svaki red. Dok je otvoren, vlaga tla raste 0,5 % u minuti. Zaglavljen ventil ne pušta vodu iako ima nalog — alarm javlja da vlaga ne raste.'],
    pretp: ['navod', 'voda'], signali: ['VENTIL'] },
  { id: 'rasvjeta', skupina: 'aktu', uloga: 'aktuator', naziv: 'Dopunska rasvjeta', engl: 'Supplementary LED lighting',
    tekst: ['LED rasvjeta produžuje dan za rasadu u zimskim mjesecima. U ovom modelu troši struju i uključuje se samo ako je pravilo omogućeno.'],
    pretp: ['led'], signali: ['LED'] },
  { id: 'plc', skupina: 'upr', uloga: 'upravljac', naziv: 'Upravljački ormar (PLC)', engl: 'Controller cabinet',
    tekst: ['Programirljivi logički upravljač ciklički čita osjetnike, izvodi program i postavlja izlaze. U simulatoru se program zadaje pravilima „ako … onda …“ i prikazuje kao ljestvičasti dijagram s istim signalima; kasnije se isti signali vežu na stvarni PLC (Modbus TCP).'],
    pretp: ['adrese'], signali: [] },
  { id: 'biljke', skupina: 'upr', uloga: 'biljke', naziv: 'Biljke', engl: 'Crop',
    tekst: ['Rajčica u četiri reda. Indeks stresa raste kad je temperatura zraka izvan 15–30 °C ili vlaga tla izvan 30–60 %; iznad praga 50 biljke počinju propadati. Preživjele biljke, voda i struja su bodovi scenarija.'],
    pretp: ['biljke', 'transp', 'stres'], signali: [] },
];

/* ---------------------------------------------------------------- program: pravila s pragovima (početna razina) */
export const PARAMETRI = [
  { id: 'tloOn',  naziv: 'Navodnjavanje: uključi ispod', jed: '%',    v: 30,  min: 10, max: 60, korak: 1 },
  { id: 'tloOff', naziv: 'Navodnjavanje: isključi iznad', jed: '%',   v: 45,  min: 15, max: 70, korak: 1 },
  { id: 'pOtv',   naziv: 'Prozor: otvori iznad', jed: '°C',           v: 28,  min: 15, max: 40, korak: 0.5 },
  { id: 'pZat',   naziv: 'Prozor: zatvori ispod', jed: '°C',          v: 24,  min: 10, max: 38, korak: 0.5 },
  { id: 'gOn',    naziv: 'Grijač: uključi ispod', jed: '°C',          v: 5,   min: 0,  max: 20, korak: 0.5 },
  { id: 'gOff',   naziv: 'Grijač: isključi iznad', jed: '°C',         v: 7,   min: 1,  max: 24, korak: 0.5 },
  { id: 'zOn',    naziv: 'Zasjena: spusti iznad', jed: 'W/m²',        v: 800, min: 200, max: 1000, korak: 25 },
  { id: 'zOff',   naziv: 'Zasjena: podigni ispod', jed: 'W/m²',       v: 700, min: 100, max: 950, korak: 25 },
  { id: 'vT',     naziv: 'Ventilator: uključi iznad', jed: '°C',      v: 32,  min: 20, max: 45, korak: 0.5 },
  { id: 'vRH',    naziv: 'Ventilator: ili vlaga zraka iznad', jed: '%', v: 90, min: 60, max: 100, korak: 1 },
  { id: 'led',    naziv: 'Dopunska rasvjeta 6–20 h kad je ozračenje ispod 50 W/m²', jed: '', v: 0, min: 0, max: 1, korak: 1, bool: true },
];

/* ---------------------------------------------------------------- kvarovi */
export const KVAROVI = [
  { id: 'tlo50',  naziv: 'Osjetnik vlage tla zaglavio na 50 %', opis: 'Osjetnik vlage tla stalno javlja 50 %, pa program ne zalijeva iako se tlo suši.' },
  { id: 'ventil', naziv: 'Elektroventil ne otvara', opis: 'Ventil ima nalog, ali ne pušta vodu — vlaga tla ne raste.' },
  { id: 'prozor', naziv: 'Motor prozora ne radi', opis: 'Motor ne pomiče prozor; krajnji prekidač „otvoren“ ne javlja.' },
  { id: 'grijac', naziv: 'Grijač ne grije', opis: 'Grijač ima nalog, a temperatura i dalje pada.' },
  { id: 'tzrak',  naziv: 'Osjetnik temperature zraka zaglavio na 20 °C', opis: 'Osjetnik stalno javlja 20,0 °C, pa ni prozor ni grijač ne reagiraju.' },
];

/* ---------------------------------------------------------------- scenariji (iz specifikacije, s uvjetima uspjeha) */
const OBL = (v) => Array.from({ length: 24 }, () => v);
export const SCENARIJI = [
  { id: 'normalan', naziv: 'Normalan dan', datum: '20. travnja', dan: 110, tMin: 8, tMax: 18, obl: OBL(0.25), rhVan: 65,
    start: { t: 14, tlo: 40 },
    cilj: 'Proljetni dan, 18 °C vani. Indeks stresa mora ostati ispod praga 50 cijela 24 sata.',
    provjera: [{ m: 'stresMax', op: '<', v: 50, t: 'najveći indeks stresa' }] },
  { id: 'val', naziv: 'Toplinski val', datum: '25. srpnja', dan: 206, tMin: 22, tMax: 35, obl: OBL(0.03), rhVan: 40,
    start: { t: 24, tlo: 42 },
    cilj: 'Jako sunce i 35 °C vani. Spasi biljke (preživi najmanje 95 %) prozračivanjem, zasjenjivanjem i navodnjavanjem, uz najviše 1,5 m³ vode.',
    provjera: [{ m: 'prezivjele', op: '>=', v: 95, t: '% preživjelih biljaka' }, { m: 'vodaM3', op: '<=', v: 1.5, t: 'm³ vode' }] },
  { id: 'noc', naziv: 'Hladna noć', datum: '10. ožujka', dan: 69, tMin: -3, tMax: 9, obl: OBL(0.05), rhVan: 80, odSata: 12,
    start: { t: 12, tlo: 42 },
    cilj: 'Vedra noć, −3 °C vani (od podneva do podneva). Unutra mora ostati iznad 5 °C, a grijač ne smije raditi cijelu noć (najviše 70 % noći).',
    provjera: [{ m: 'minTnoc', op: '>', v: 5, t: 'najniža temperatura unutra noću (°C)' }, { m: 'grijacUdio', op: '<=', v: 70, t: '% noći s uključenim grijačem' }] },
  { id: 'kvarTlo', naziv: 'Kvar osjetnika vlage tla', datum: '5. lipnja', dan: 156, tMin: 15, tMax: 28, obl: OBL(0.1), rhVan: 55,
    start: { t: 18, tlo: 34 }, kvarOd: { id: 'tlo50', sat: 7 }, rokSati: 6,
    cilj: 'U 7:00 osjetnik vlage tla zaglavi na 50 %. Otkrij kvar na nadzornoj ploči najkasnije 6 sati nakon što nastane i upiši uzrok.',
    provjera: [{ m: 'dijagnoza', op: '==', v: 'tlo50', t: 'točno prepoznat uzrok' }, { m: 'vrijemeDijag', op: '<=', v: 6, t: 'sati od kvara do dijagnoze' }] },
  { id: 'kvarVentil', naziv: 'Zaglavljen ventil', datum: '15. lipnja', dan: 166, tMin: 16, tMax: 29, obl: OBL(0.15), rhVan: 55,
    start: { t: 18, tlo: 32 }, kvarOd: { id: 'ventil', sat: 6 },
    cilj: 'Od 6:00 elektroventil ne otvara. Prepoznaj alarm i upiši uzrok.',
    provjera: [{ m: 'alarmVentil', op: '==', v: true, t: 'alarm navodnjavanja se pojavio' }, { m: 'dijagnoza', op: '==', v: 'ventil', t: 'točno upisan uzrok' }] },
  { id: 'sezona', naziv: 'Sezona (90 dana ubrzano)', datum: '1. ožujka – 29. svibnja', dan: 60, tMin: 0, tMax: 12, obl: OBL(0.4), rhVan: 70, sezona: 90,
    start: { t: 8, tlo: 40 },
    cilj: 'Isti program kroz 90 dana proljeća (dani se razlikuju: hladni, topli, oblačni, sunčani). Ukupni stres i potrošnja moraju ostati u granicama: preživjele biljke najmanje 90 %, voda najviše 100 m³, struja najviše 1500 kWh.',
    provjera: [{ m: 'prezivjele', op: '>=', v: 90, t: '% preživjelih biljaka' }, { m: 'vodaM3', op: '<=', v: 100, t: 'm³ vode' }, { m: 'eUk', op: '<=', v: 1500, t: 'kWh struje' }] },
];

/* približne višegodišnje srednje najniže/najviše dnevne temperature (kontinentalna Hrvatska), procjena */
export const KLIMA = [ /* po mjesecima 1–12: [tMin, tMax] */
  [-4, 3], [-3, 6], [1, 12], [6, 17], [11, 22], [14, 26], [16, 28], [15, 28], [11, 23], [7, 17], [2, 10], [-2, 4],
];
