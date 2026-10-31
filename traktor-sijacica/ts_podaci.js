/* FORTRONIQ · Traktor s GPS navigacijom i sijačicom — jedini izvor podataka (parcela, sijačica, navigacija, scenariji, dijelovi).
   Sve brojke su procjena modela za nastavu (oznaka s: 1 = uobičajen podatak iz prakse), ne podaci proizvođača.
   © ForTroniQ d.o.o. */

export const PRETP = {
  duljina: { t: 'Duljina parcele (smjer sjetve)', v: 400, jed: 'm' },
  prohoda: { t: 'Broj glavnih prohoda', v: 40, jed: '' },
  redova: { t: 'Broj redova sijačice (sekcija)', v: 6, jed: '' },
  razmakRed: { t: 'Razmak redova kukuruza', v: 0.7, jed: 'm', s: 1 },
  uvratina: { t: 'Širina uvratine (2 prohoda)', v: 8.4, jed: 'm' },
  okret: { t: 'Trajanje okreta na uvratini', v: 25, jed: 's' },
  vreca: { t: 'Sjeme u jednoj vreći', v: 50000, jed: 'zrna', s: 1 },
  cijenaVrece: { t: 'Cijena vreće sjemena', v: 150, jed: '€' },
  cijenaZrna: { t: 'Otkupna cijena kukuruza', v: 200, jed: '€/t' },
  gorivo: { t: 'Potrošnja goriva', v: 22, jed: 'L/h' },
  podizanje: { t: 'Kašnjenje hidraulike pri ručnom podizanju', v: 0.6, jed: 's' },
  kasnjenje: { t: 'Kašnjenje sekcije (ventil, pad sjemena)', v: 0.4, jed: 's' },
  sigmaRucno: { t: 'Vozač s markerom: odstupanje spoja (8 km/h)', v: 0.14, jed: 'm' },
  sigmaSbas: { t: 'EGNOS/SBAS: odstupanje položaja', v: 0.25, jed: 'm' },
  tauSbas: { t: 'EGNOS/SBAS: vrijeme promjene pogreške', v: 1200, jed: 's' },
  sigmaRtk: { t: 'RTK: odstupanje položaja', v: 0.015, jed: 'm' },
  sigmaVolan: { t: 'Autopilot: odstupanje upravljanja', v: 0.02, jed: 'm' },
  zonaA: { t: 'Zona A (dobro tlo): najveći prinos i najbolji sklop', v: '12 t/ha · 80 000 zrna/ha', jed: '' },
  zonaB: { t: 'Zona B (srednje tlo)', v: '10 t/ha · 72 000 zrna/ha', jed: '' },
  zonaC: { t: 'Zona C (pjeskovito, suše)', v: '7,5 t/ha · 62 000 zrna/ha', jed: '' },
  gubitakSklop: { t: 'Gubitak prinosa zbog odstupanja sklopa', v: 2, jed: '× (relativno odstupanje)²' },
};
export const P = Object.fromEntries(Object.entries(PRETP).map(([k, o]) => [k, o.v]));
P.sirina = P.prohoda * P.redova * P.razmakRed;        /* 168 m */
P.zahvat = P.redova * P.razmakRed;                    /* 4,2 m */

export const ZONE = {
  A: { naziv: 'A · dobro tlo', ymax: 12, opt: 80000 },
  B: { naziv: 'B · srednje tlo', ymax: 10, opt: 72000 },
  C: { naziv: 'C · pjeskovito, suše', ymax: 7.5, opt: 62000 },
};

export const NAVIGACIJE = {
  rucno: { naziv: 'Vozač s markerom', opis: 'Vozač prati trag markera iz prethodnog prohoda.' },
  sbas: { naziv: 'Autopilot + EGNOS', opis: 'Besplatna satelitska korekcija, točnost desetak centimetara do pola metra.' },
  rtk: { naziv: 'Autopilot + RTK', opis: 'Korekcija s bazne stanice ili mreže (NTRIP), točnost oko 2 cm.' },
};

export const ZADANO = { nav: 'rucno', brzina: 8, sekcije: false, komp: 0, rtkPravilo: 'nastavi', norma: { A: 72000, B: 72000, C: 72000 } };

/* kosina = koliko je istočni rub kraći na sjevernoj strani (m); rtkPad = { od: udio nazivnog trajanja glavnih prohoda, trajanje: s } */
export const SCENARIJI = [
  { id: 'rucno', naziv: 'Bez navigacije: vozač i marker', opis: 'Vozač sije prateći trag markera. Na spoju dva prohoda razmak između redova trebao bi biti 70 cm, a vozač griješi nekoliko centimetara do desetak centimetara.',
    kosina: 0, sjeme: 7, zadano: {},
    uvjeti: [['spoj10', '>=', 95, 'najmanje 95 % duljine spojeva unutar ±10 cm'], ['propust', '<=', 0, 'nema propuštenih ni dvostrukih redova']] },
  { id: 'sekcije', naziv: 'Kosa uvratina', opis: 'Istočni rub parcele je kos. Kad se sijačica podiže odjednom, na kosom rubu dio redova uđe u već zasijanu uvratinu, a dio stane prerano.',
    kosina: 100, sjeme: 13, zadano: { nav: 'rtk' },
    uvjeti: [['preklopU', '<=', 0.1, 'preklop na uvratinama najviše 0,1 % duljine redova'], ['propustU', '<=', 0.1, 'propust na uvratinama najviše 0,1 % duljine redova']] },
  { id: 'brzina', naziv: 'Žurba prije kiše', opis: 'Kiša stiže za 2 sata i 15 minuta. Brzina 12 km/h skraćuje posao, ali sijaći disk ne stigne pravilno odvajati zrna: ima više preskoka i dvojki.',
    kosina: 0, sjeme: 19, zadano: { nav: 'rtk', sekcije: true, komp: 0.4, brzina: 12 },
    uvjeti: [['singulacija', '<=', 5, 'preskoci i dvojke zajedno najviše 5 %'], ['vrijeme', '<=', 2.25, 'posao gotov za najviše 2 h 15 min']] },
  { id: 'rtkPad', naziv: 'Gubitak RTK korekcije', opis: 'Usred posla mobilna mreža pada i RTK korekcija nestane na 20 minuta. Autopilot nastavlja s lošijom točnošću ako mu to pravilo dopušta.',
    kosina: 0, sjeme: 29, zadano: { nav: 'rtk', sekcije: true, komp: 0.4 }, rtkPad: { od: 0.42, trajanje: 1200 }, kvar: 'rtk',
    uvjeti: [['spoj10', '>=', 99, 'najmanje 99 % duljine spojeva unutar ±10 cm'], ['vrijeme', '<=', 3, 'posao gotov za najviše 3 sata'], ['dijagnoza', '==', 1, 'uzrok upisan u dijagnozi']] },
  { id: 'vra', naziv: 'Varijabilna norma po zonama tla', opis: 'Parcela ima tri zone tla. Jednaka norma 72 000 zrna/ha posvuda je previše za pjeskovitu zonu C, a premalo za dobru zonu A.',
    kosina: 0, sjeme: 37, zadano: { nav: 'rtk', sekcije: true, komp: 0.4 },
    uvjeti: [['dobitHa', '>=', 35, 'dobit veća za najmanje 35 €/ha od jednake norme 72 000'], ['spoj10', '>=', 95, 'spojevi unutar ±10 cm najmanje 95 %']] },
];

export const UZROCI = [
  ['', '— odaberi uzrok —'],
  ['rtk', 'Gubitak RTK korekcije (prijelaz na lošiju točnost)'],
  ['volan', 'Kvar autopilota na volanu'],
  ['zahvat', 'Pogrešno upisana širina zahvata u terminalu'],
  ['klizanje', 'Proklizavanje kotača u mokrom tlu'],
];

export const SKUPINE = [
  { id: 'traktor', naziv: 'Traktor i navigacija' },
  { id: 'sijacica', naziv: 'Sijačica' },
  { id: 'korekcija', naziv: 'Satelitski položaj' },
  { id: 'parcela', naziv: 'Parcela' },
];

export const DIJELOVI = [
  { id: 'traktor', skupina: 'traktor', uloga: 'konstrukcija', naziv: 'Traktor', engl: 'tractor',
    tekst: ['Vuče i pogoni sijačicu: preko priključnog vratila pokreće ventilator, a preko hidraulike je podiže i spušta na uvratini.', 'Brzina sjetve određuje i koliko dugo traje posao i koliko pravilno sijačica odvaja zrna.'], pretp: ['gorivo', 'okret'] },
  { id: 'antena', skupina: 'korekcija', uloga: 'osjetnik', naziv: 'GNSS antena i prijamnik', engl: 'GNSS receiver',
    tekst: ['Na krovu kabine prima signale satelita (GPS, Galileo, GLONASS). Bez korekcije položaj odstupa i metar ili više.', 'Prijamnik ima i osjetnik nagiba: na nagnutom terenu antena na krovu je pomaknuta u odnosu na sijačicu pa se položaj preračunava na tlo.'], pretp: ['sigmaSbas', 'tauSbas'] },
  { id: 'baza', skupina: 'korekcija', uloga: 'osjetnik', naziv: 'RTK bazna stanica ili mreža', engl: 'RTK base, NTRIP',
    tekst: ['Bazna stanica stoji na poznatoj točki i stalno šalje razliku između izmjerenog i stvarnog položaja. Traktor tu razliku prima radijem ili preko mobilne mreže (NTRIP) i ispravlja svoj položaj na oko 2 cm.', 'Kad veza padne, prijamnik prelazi na lošiju točnost. Terminal to javlja promjenom stanja RTK FIX u FLOAT ili SBAS.'], pretp: ['sigmaRtk'] },
  { id: 'terminal', skupina: 'traktor', uloga: 'upravljac', naziv: 'Terminal u kabini', engl: 'ISOBUS terminal',
    tekst: ['Na zaslonu su AB linija, karta zasijanog, stanje korekcije i sekcija. Preko ISOBUS-a terminal upravlja sijačicom: uključuje i isključuje redove i mijenja normu sjetve po karti.', 'U terminal se upisuju širina zahvata, broj redova i kašnjenje sekcija.'] },
  { id: 'autopilot', skupina: 'traktor', uloga: 'aktuator', naziv: 'Autopilot (električni volan)', engl: 'auto-steer',
    tekst: ['Elektromotor na stupu volana okreće volan prema naredbi terminala. Vozač samo okreće na uvratini i nadzire rad.', 'Autopilot je točan koliko i položaj koji dobiva: s EGNOS-om drži liniju na desetak centimetara, s RTK-om na dva do tri centimetra.'], pretp: ['sigmaVolan'] },
  { id: 'sijacica', skupina: 'sijacica', uloga: 'aktuator', naziv: 'Pneumatska sijačica', engl: 'precision planter',
    tekst: ['Šest sijaćih sekcija sije šest redova na razmaku 70 cm, pa je radni zahvat 4,2 m. Ventilator stvara podtlak koji drži po jedno zrno u svakoj rupici sijaćeg diska.', 'Brzina diska prati brzinu vožnje: na većoj brzini zrna se lošije odvajaju pa nastaju preskoci (prazno mjesto) i dvojke (dva zrna zajedno).'], pretp: ['redova', 'razmakRed'] },
  { id: 'sekcije', skupina: 'sijacica', uloga: 'aktuator', naziv: 'Isključivanje sekcija', engl: 'section control',
    tekst: ['Svaki red ima svoj pogon ili spojku. Terminal ga isključuje čim taj red uđe u već zasijano, a uključuje kad izađe iz njega.', 'Između naredbe i trenutka kad sjeme prestane padati prođe djelić sekunde. Terminal to nadoknađuje tako da naredbu da ranije (kompenzacija kašnjenja).'], pretp: ['kasnjenje', 'podizanje'] },
  { id: 'marker', skupina: 'sijacica', uloga: 'konstrukcija', naziv: 'Marker', engl: 'row marker',
    tekst: ['Disk na kraku ostavlja trag u tlu na pola zahvata od zadnjeg reda. Vozač bez navigacije u idućem prohodu vozi tako da prednji kotač ili oznaka na haubi prati taj trag.', 'Pogreške se zbrajaju: svaki spoj ovisi o prethodnom prohodu.'], pretp: ['sigmaRucno'] },
  { id: 'spremnik', skupina: 'sijacica', uloga: 'konstrukcija', naziv: 'Spremnik sjemena', engl: 'seed hopper',
    tekst: ['Svaka sekcija ima svoj spremnik. Kukuruz se kupuje u vrećama od 50 000 zrna, pa se potrošnja broji u vrećama.'], pretp: ['vreca', 'cijenaVrece'] },
  { id: 'parcela', skupina: 'parcela', uloga: 'biljke', naziv: 'Parcela i uvratine', engl: 'field, headlands',
    tekst: ['Glavni prohodi idu uzduž parcele po AB liniji. Na oba kraja ostaje uvratina za okretanje, koja se na kraju zasije s dva prohoda uzduž ruba.', 'Na kosom rubu uvratina je kosa: redovi jednog prohoda ne dolaze do nje u istom trenutku.'], pretp: ['duljina', 'prohoda', 'uvratina'] },
  { id: 'zone', skupina: 'parcela', uloga: 'biljke', naziv: 'Zone tla i karta norme', engl: 'management zones, prescription',
    tekst: ['Karta zona izrađuje se iz prinosa prethodnih godina, snimki drona ili satelita i analize tla. Za svaku zonu zadaje se norma sjetve u zrnima po hektaru.', 'Na dobrom tlu biljke mogu iskoristiti gušći sklop; na pjeskovitom tlu gust sklop u suši daje manje klipove.'], pretp: ['zonaA', 'zonaB', 'zonaC', 'gubitakSklop', 'cijenaZrna'] },
];
