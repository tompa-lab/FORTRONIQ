/* FORTRONIQ · Pametna zgrada — podaci (jedini izvor naziva, opisa, signala, pretpostavki, izvora i scenarija).
   Činjenice su samo ono što je javno objavljeno (izvori niže). Sve ostalo je PRETPOSTAVKA, označena na stranici,
   i zamjenjuje se stvarnim podacima zgrade kad stignu (popis opreme i osjetnika, snaga FN sustava, izmjenjivač,
   dizalice topline, sustav upravljanja). © ForTroniQ d.o.o. */

export const VER = '01';

export const ZGRADA = {
  naziv: 'Pametna zgrada RCK-a Ruđera Boškovića',
  kratko: 'Pametna zgrada',
  lokacija: 'Getaldićeva 4, Zagreb',
  sirina: 45.81,            /* zemljopisna širina Zagreba, ° */
};

/* ---------------------------------------------------------------- izvori (javno objavljeno) */
export const IZVORI = {
  grenef: { naziv: 'Grenef — RCK Ruđer Bošković: pasivna kuća na razini A+', url: 'https://www.grenef.hr/rck-rudjer-boskovic-pasivna-kuca-na-razini-a/' },
  hrastovic: { naziv: 'Hrastović Inženjering — energetski projekt RCK RB (2020.)', url: 'https://www.hrastovic-inzenjering.hr/primjena-energije/energetski-projekti/827-a-a-rck-rb-2020.html' },
  srednja: { naziv: 'Srednja.hr — Tehnička škola Ruđera Boškovića Zagreb', url: 'https://www.srednja.hr/skole/7/tehnicka-skola-rudera-boskovica-zagreb' },
};

/* ---------------------------------------------------------------- pretpostavke
   id → { t: tekst, v: vrijednost }  (sve brojke modela; na stranici uz oznaku „pretpostavka“) */
export const PRETP = {
  povrsina:   { v: 1200, jed: 'm²',  t: 'Korisna površina grijanog dijela zgrade' },
  volumen:    { v: 3600, jed: 'm³',  t: 'Volumen zraka u grijanom dijelu' },
  Htr:        { v: 260,  jed: 'W/K', t: 'Transmisijski gubici i infiltracija (pasivna kuća: U ≈ 0,1 W/(m²K), n50 ≤ 0,6 h⁻¹)' },
  Cef:        { v: 40,   jed: 'kWh/K', t: 'Efektivni toplinski kapacitet (zrak, namještaj i površinski slojevi zidova i stropova)' },
  okna:       { v: 180,  jed: 'm²',  t: 'Površina ostakljenja (polovina na jug), g = 0,50, zasjenjenje žaluzinama Fc = 0,25' },
  fnSnaga:    { v: 30,   jed: 'kWp', t: 'Vršna snaga fotonaponskog polja na ravnom krovu, nagib 15°, jug' },
  izmj:       { v: 27,   jed: 'kW',  t: 'Izmjenična snaga izmjenjivača, korisnost 96 %' },
  dtGrij:     { v: 18,   jed: 'kW',  t: 'Toplinski učin dizalice topline zrak–voda u grijanju pri +7 °C (polazna voda 35 °C, niskotemperaturno grijanje)' },
  dtHlad:     { v: 15,   jed: 'kW',  t: 'Rashladni učin dizalice topline (polazna voda 18 °C)' },
  kolektori:  { v: 16,   jed: 'm²',  t: 'Površina pločastih solarnih kolektora (η₀ = 0,78, a₁ = 3,5 W/(m²K))' },
  spremnik:   { v: 1500, jed: 'L',   t: 'Spremnik potrošne tople vode s električnim grijačem 6 kW za dogrijavanje' },
  ptv:        { v: 450,  jed: 'L/dan', t: 'Dnevna potrošnja tople vode od 45 °C (radni dan)' },
  rekup:      { v: 85,   jed: '%',   t: 'Korisnost povrata topline rekuperatora; stupnjevi protoka 1200 / 2400 / 3600 m³/h, SFP 0,45 Wh/m³' },
  osobe:      { v: 80,   jed: 'osoba', t: 'Polaznika i nastavnika u zgradi za vrijeme nastave (7:30–15:00), 80 W i 18 L/h CO₂ po osobi' },
  oprema:     { v: 4,    jed: 'W/m²', t: 'Računala i oprema za vrijeme nastave; stalna potrošnja 1,5 kW (poslužitelji, pripravnost)' },
  rasvjeta:   { v: 6,    jed: 'W/m²', t: 'LED rasvjeta s regulacijom prema dnevnom svjetlu, zadano 500 lx; faktor dnevnog svjetla 3 %' },
  mreza:      { v: 0.17, jed: 'kg CO₂/kWh', t: 'Emisijski faktor električne energije iz mreže; cijena uvoza 0,15 €/kWh, otkupa 0,06 €/kWh' },
  adrese:     { v: 0,    jed: '',    t: 'Adrese ulaza i izlaza (%I, %IW, %Q, %QW) — primjer rasporeda, ne stvarni ormar' },
};

/* ---------------------------------------------------------------- signali PLC-a
   u: ulaz (DI/AI), i: izlaz (DO/AO). Adrese su primjer (PRETP.adrese). */
export const SIGNALI = [
  { id: 'T_UN',   vrsta: 'AI', adr: '%IW0', jed: '°C',   naziv: 'Temperatura zraka u prostoru (srednja)', dio: 'osjetnici' },
  { id: 'T_VAN',  vrsta: 'AI', adr: '%IW1', jed: '°C',   naziv: 'Vanjska temperatura', dio: 'meteo' },
  { id: 'G_SUN',  vrsta: 'AI', adr: '%IW2', jed: 'W/m²', naziv: 'Sunčevo zračenje na vodoravnu plohu (piranometar)', dio: 'meteo' },
  { id: 'CO2',    vrsta: 'AI', adr: '%IW3', jed: 'ppm',  naziv: 'Koncentracija CO₂ u odsisnom zraku', dio: 'osjetnici' },
  { id: 'E_LUX',  vrsta: 'AI', adr: '%IW4', jed: 'lx',   naziv: 'Osvijetljenost radne plohe', dio: 'osjetnici' },
  { id: 'PRIS',   vrsta: 'DI', adr: '%I0.0', jed: '',    naziv: 'Prisutnost (osjetnici pokreta)', dio: 'osjetnici' },
  { id: 'T_KOL',  vrsta: 'AI', adr: '%IW5', jed: '°C',   naziv: 'Temperatura u kolektoru', dio: 'kolektori' },
  { id: 'T_SPR',  vrsta: 'AI', adr: '%IW6', jed: '°C',   naziv: 'Temperatura u spremniku PTV-a (gornja zona)', dio: 'spremnik' },
  { id: 'P_FN',   vrsta: 'AI', adr: '%IW7', jed: 'kW',   naziv: 'Izmjenična snaga izmjenjivača (Modbus)', dio: 'izmjenjivac' },
  { id: 'P_MR',   vrsta: 'AI', adr: '%IW8', jed: 'kW',   naziv: 'Snaga na priključku: + uvoz, − izvoz (brojilo)', dio: 'ormar' },
  { id: 'DP_F',   vrsta: 'AI', adr: '%IW9', jed: 'Pa',   naziv: 'Pad tlaka na filtru dovodnog zraka', dio: 'rekuperator' },
  { id: 'DT_ERR', vrsta: 'DI', adr: '%I0.1', jed: '',    naziv: 'Skupna greška dizalice topline', dio: 'dizalice' },
  { id: 'GRIJ',   vrsta: 'DO', adr: '%Q0.0', jed: '',    naziv: 'Dizalica topline — grijanje', dio: 'dizalice' },
  { id: 'HLAD',   vrsta: 'DO', adr: '%Q0.1', jed: '',    naziv: 'Dizalica topline — hlađenje', dio: 'dizalice' },
  { id: 'VENT',   vrsta: 'AO', adr: '%QW0', jed: 'st.',  naziv: 'Stupanj ventilacije 0–3', dio: 'rekuperator' },
  { id: 'BYP',    vrsta: 'DO', adr: '%Q0.2', jed: '',    naziv: 'Obilazni vod rekuperatora (noćno hlađenje)', dio: 'rekuperator' },
  { id: 'ZAL',    vrsta: 'DO', adr: '%Q0.3', jed: '',    naziv: 'Vanjske žaluzine — spusti', dio: 'zaluzine' },
  { id: 'RASV',   vrsta: 'AO', adr: '%QW1', jed: '%',    naziv: 'Rasvjeta — razina (DALI)', dio: 'rasvjeta' },
  { id: 'SPUMP',  vrsta: 'DO', adr: '%Q0.4', jed: '',    naziv: 'Crpka solarnog kruga', dio: 'kolektori' },
  { id: 'EGRIJ',  vrsta: 'DO', adr: '%Q0.5', jed: '',    naziv: 'Električni grijač u spremniku', dio: 'spremnik' },
];

/* ---------------------------------------------------------------- dijelovi zgrade (upoznavanje + SCADA)
   skupina, id, naziv, engl, tekst[], podaci{}, izvor (ključ IZVORI) ili null, pretp[] (ključevi PRETP), signali[] */
export const SKUPINE = [
  { id: 'ovojnica', naziv: 'Zgrada i ovojnica' },
  { id: 'energija', naziv: 'Obnovljivi izvori i električna energija' },
  { id: 'toplina',  naziv: 'Grijanje, hlađenje i topla voda' },
  { id: 'zrak',     naziv: 'Zrak, svjetlo i zasjenjenje' },
  { id: 'upravljanje', naziv: 'Upravljanje i nadzor' },
];

export const DIJELOVI = [
  { id: 'zgrada', skupina: 'ovojnica', naziv: 'Dogradnja RCK-a — pasivna kuća', engl: 'Passive house extension',
    tekst: ['Hibridna dogradnja na sjeveroistoku kompleksa škole, projektirana kao pasivna kuća energetskog razreda A+. Zgrada je zamišljena kao živi laboratorij: sama je nastavno pomagalo za obnovljive izvore, energetsku elektroniku i automatizaciju zgrada.',
      'Pasivna kuća troši vrlo malo topline jer je ovojnica debelo izolirana, zrakonepropusna i bez toplinskih mostova, a zrak se izmjenjuje kroz rekuperator. Zato se temperatura u prostoru mijenja sporo — u simulatoru to vidiš kao vremensku konstantu od nekoliko dana.'],
    podaci: { 'Energetski razred': 'A+', 'Koncept': 'pasivna kuća', 'Lokacija': 'Getaldićeva 4, Zagreb' },
    izvor: 'grenef', izvor2: 'hrastovic', pretp: ['povrsina', 'volumen', 'Cef'], signali: [] },
  { id: 'ovojnica', skupina: 'ovojnica', naziv: 'Ovojnica i ostakljenje', engl: 'Building envelope and glazing',
    tekst: ['Zidovi, krov i pod nose toplinsku izolaciju velike debljine; prozori su troslojni. Kroz ostakljenje ulazi sunčeva toplina (solarni dobici) — zimi je to besplatno grijanje, ljeti uzrok pregrijavanja.',
      'U modelu se gubici ovojnice zbrajaju u jedan koeficijent H (W/K): toplinski tok je H · (T unutra − T vani).'],
    podaci: {}, izvor: null, pretp: ['Htr', 'okna'], signali: [] },
  { id: 'fn', skupina: 'energija', naziv: 'Fotonaponsko polje na krovu', engl: 'Photovoltaic array',
    tekst: ['Fotonaponski moduli pretvaraju sunčevo zračenje u istosmjernu struju. Proizvodnja raste sa zračenjem na plohu modula, a pada s temperaturom ćelija (oko 0,4 % po kelvinu iznad 25 °C).',
      'Zgrada se napaja iz obnovljivih izvora; fotonapon je jedan od njih. Snaga polja i broj modula nisu javno objavljeni.'],
    podaci: { 'Izvor energije': 'Sunce' }, izvor: 'srednja', pretp: ['fnSnaga'], signali: ['G_SUN'] },
  { id: 'izmjenjivac', skupina: 'energija', naziv: 'Izmjenjivač (inverter)', engl: 'PV inverter',
    tekst: ['Izmjenjivač pretvara istosmjernu struju fotonaponskog polja u izmjeničnu napona mreže i stalno traži radnu točku najveće snage (MPPT). Upravljačkom sustavu javlja snagu, energiju i greške, obično preko Modbusa.',
      'Kvar izmjenjivača ne vidi se na krovu: moduli su obasjani, a proizvodnje nema. Otkriva ga usporedba izmjerenog zračenja i snage izmjenjivača.'],
    podaci: {}, izvor: null, pretp: ['izmj'], signali: ['P_FN'] },
  { id: 'ormar', skupina: 'energija', naziv: 'Glavni razvod i brojilo', engl: 'Main distribution and meter',
    tekst: ['U glavnom razvodu sastaju se proizvodnja fotonapona, potrošnja zgrade i priključak na mrežu. Dvosmjerno brojilo mjeri uvoz i izvoz. Višak koji zgrada ne potroši odlazi u mrežu.',
      'Pokazatelji: samodostatnost = koliki dio potrošnje pokriva vlastiti fotonapon; vlastita potrošnja = koliki dio proizvodnje zgrada sama potroši.'],
    podaci: {}, izvor: null, pretp: ['mreza'], signali: ['P_MR'] },
  { id: 'dizalice', skupina: 'toplina', naziv: 'Dizalice topline', engl: 'Heat pumps',
    tekst: ['Dizalica topline prenosi toplinu iz okoliša u zgradu (grijanje) ili iz zgrade u okoliš (hlađenje). Za 1 kWh električne energije daje nekoliko kWh topline — taj omjer je COP. COP je veći što je manja razlika temperatura okoliša i polazne vode, pa niskotemperaturno grijanje (podno, 35 °C) bolje pristaje dizalici topline.',
      'Javno je objavljeno da zgrada ima dizalice topline; vrsta (zrak–voda, voda–voda, tlo) i učin nisu objavljeni.'],
    podaci: {}, izvor: 'srednja', pretp: ['dtGrij', 'dtHlad'], signali: ['GRIJ', 'HLAD', 'DT_ERR'] },
  { id: 'kolektori', skupina: 'toplina', naziv: 'Solarni kolektori', engl: 'Solar thermal collectors',
    tekst: ['Solarni sustav zagrijava potrošnu toplu vodu. Crpka solarnog kruga uključuje se kad je kolektor topliji od spremnika (diferencijalni termostat, npr. +6 K uključi, +2 K isključi).',
      'Kad je spremnik pun topline, crpka staje i kolektor ostaje bez protoka (stagnacija) — tada se jako zagrije. Zaštita spremnika gasi crpku iznad 85 °C.'],
    podaci: {}, izvor: 'srednja', pretp: ['kolektori'], signali: ['T_KOL', 'SPUMP'] },
  { id: 'spremnik', skupina: 'toplina', naziv: 'Spremnik potrošne tople vode', engl: 'Domestic hot water tank',
    tekst: ['Spremnik čuva toplu vodu iz solarnog kruga. Kad sunca nema dovoljno, vodu dogrijava električni grijač (ili dizalica topline). Topla voda mora imati najmanje 45 °C na izlazu.',
      'Pametno pravilo: višak fotonaponske energije usmjeri u grijač spremnika umjesto u mrežu — spremnik je jeftina „baterija“ za toplinu.'],
    podaci: {}, izvor: null, pretp: ['spremnik', 'ptv'], signali: ['T_SPR', 'EGRIJ'] },
  { id: 'rekuperator', skupina: 'zrak', naziv: 'Ventilacija s povratom topline', engl: 'Heat recovery ventilation',
    tekst: ['U pasivnoj kući zrak se ne mijenja otvaranjem prozora, nego kroz rekuperator: odsisni zrak predaje toplinu svježem zraku u izmjenjivaču. Protok se vodi prema CO₂ (ventilacija prema potrebi).',
      'Ljeti noću obilazni vod (bypass) propušta hladan vanjski zrak mimo izmjenjivača — besplatno noćno hlađenje. Prljav filtar povećava pad tlaka i smanjuje protok.'],
    podaci: {}, izvor: null, pretp: ['rekup'], signali: ['VENT', 'BYP', 'DP_F'] },
  { id: 'osjetnici', skupina: 'zrak', naziv: 'Osjetnici u prostorijama', engl: 'Room sensors',
    tekst: ['Temperatura, CO₂, osvijetljenost i prisutnost mjere se u prostorijama i šalju upravljačkom sustavu. Upravljanje je točno samo koliko i osjetnik: zaglavljen osjetnik temperature drži grijanje isključenim iako je prostor hladan.',
      'Točan popis osjetnika zgrade nije javan.'],
    podaci: {}, izvor: null, pretp: ['osobe'], signali: ['T_UN', 'CO2', 'E_LUX', 'PRIS'] },
  { id: 'rasvjeta', skupina: 'zrak', naziv: 'Rasvjeta', engl: 'Lighting',
    tekst: ['LED rasvjeta s regulacijom prema dnevnom svjetlu dodaje samo onoliko svjetla koliko nedostaje do zadane razine. Bez prisutnosti se gasi.'],
    podaci: {}, izvor: null, pretp: ['rasvjeta'], signali: ['RASV'] },
  { id: 'zaluzine', skupina: 'zrak', naziv: 'Vanjske žaluzine', engl: 'External blinds',
    tekst: ['Vanjsko zasjenjenje zaustavlja sunce prije stakla i propušta tek četvrtinu solarnih dobitaka. Ljeti sprječava pregrijavanje, ali smanjuje dnevno svjetlo — rasvjeta tada troši više.'],
    podaci: {}, izvor: null, pretp: ['okna'], signali: ['ZAL'] },
  { id: 'meteo', skupina: 'upravljanje', naziv: 'Meteorološka stanica', engl: 'Weather station',
    tekst: ['Vanjska temperatura i sunčevo zračenje ulazni su podaci za grijanje, žaluzine i nadzor fotonapona.'],
    podaci: {}, izvor: null, pretp: [], signali: ['T_VAN', 'G_SUN'] },
  { id: 'plc', skupina: 'upravljanje', naziv: 'Ormar automatike (PLC)', engl: 'Building automation controller',
    tekst: ['Programirljivi logički upravljač čita ulaze, izvodi program (pravila i regulacijske petlje) i postavlja izlaze — ciklički, nekoliko puta u sekundi. Isti program koji se razvije u simulatoru provjerava se na stvarnom upravljaču.',
      'Proizvođač i vrsta upravljačkog sustava zgrade nisu javno objavljeni.'],
    podaci: {}, izvor: null, pretp: ['adrese'], signali: [] },
  { id: 'scada', skupina: 'upravljanje', naziv: 'Nadzorni sustav (SCADA)', engl: 'Supervisory control and data acquisition',
    tekst: ['Nadzorna ploča prikazuje tokove energije, temperature i alarme, čuva povijest mjerenja i omogućuje ručni rad pojedinih uređaja. Iz povijesti se vide uzroci kvarova i mogućnosti uštede.'],
    podaci: {}, izvor: null, pretp: [], signali: [] },
];

/* ---------------------------------------------------------------- zadani program PLC-a (parametri) */
export const PARAMETRI = [
  { id: 'spG',    naziv: 'Zadana temperatura grijanja', jed: '°C', v: 21, min: 17, max: 24, korak: 0.5 },
  { id: 'spH',    naziv: 'Zadana temperatura hlađenja', jed: '°C', v: 25, min: 22, max: 28, korak: 0.5 },
  { id: 'hist',   naziv: 'Histereza termostata', jed: 'K', v: 0.5, min: 0.2, max: 2, korak: 0.1 },
  { id: 'nocno',  naziv: 'Noćno sniženje izvan nastave', jed: 'K', v: 0, min: 0, max: 4, korak: 0.5 },
  { id: 'co2a',   naziv: 'CO₂ — prag za 2. stupanj ventilacije', jed: 'ppm', v: 900, min: 600, max: 1400, korak: 50 },
  { id: 'co2b',   naziv: 'CO₂ — prag za 3. stupanj ventilacije', jed: 'ppm', v: 1200, min: 800, max: 1800, korak: 50 },
  { id: 'byp',    naziv: 'Noćno hlađenje: uključi iznad', jed: '°C', v: 24, min: 20, max: 27, korak: 0.5 },
  { id: 'zalG',   naziv: 'Žaluzine: zračenje veće od', jed: 'W/m²', v: 350, min: 100, max: 800, korak: 25 },
  { id: 'zalT',   naziv: 'Žaluzine: i temperatura veća od', jed: '°C', v: 23.5, min: 20, max: 27, korak: 0.5 },
  { id: 'lux',    naziv: 'Zadana osvijetljenost', jed: 'lx', v: 500, min: 300, max: 750, korak: 50 },
  { id: 'dTon',   naziv: 'Solarna crpka: uključi pri razlici', jed: 'K', v: 6, min: 3, max: 12, korak: 1 },
  { id: 'dToff',  naziv: 'Solarna crpka: isključi pri razlici', jed: 'K', v: 2, min: 1, max: 5, korak: 0.5 },
  { id: 'ptvMin', naziv: 'PTV: dogrijavanje ispod', jed: '°C', v: 45, min: 40, max: 60, korak: 1 },
  { id: 'visak',  naziv: 'Višak FN-a → spremnik i predgrijavanje', jed: '', v: 0, min: 0, max: 1, korak: 1, bool: true },
];

/* ---------------------------------------------------------------- kvarovi */
export const KVAROVI = [
  { id: 'izmj',   naziv: 'Izmjenjivač ne proizvodi', opis: 'Izmjenjivač je u kvaru: snaga je 0 kW iako ima sunca.' },
  { id: 'tun',    naziv: 'Osjetnik temperature zaglavio na 23,0 °C', opis: 'Osjetnik u prostoru stalno javlja 23,0 °C.' },
  { id: 'dt',     naziv: 'Dizalica topline u kvaru', opis: 'Dizalica topline javlja skupnu grešku i ne radi.' },
  { id: 'filtar', naziv: 'Zaprljan filtar rekuperatora', opis: 'Pad tlaka raste, protok zraka pada na polovinu.' },
  { id: 'co2',    naziv: 'Osjetnik CO₂ ne radi (pokazuje 450 ppm)', opis: 'Osjetnik CO₂ stalno javlja 450 ppm.' },
  { id: 'spump',  naziv: 'Solarna crpka ne radi', opis: 'Crpka solarnog kruga ne kreće iako je dobila nalog.' },
];

/* ---------------------------------------------------------------- vrijeme po scenariju
   dan: dan u godini; tMin/tMax: °C; obl: naoblaka 0–1 po satu (24 vrijednosti); radni: nastava da/ne */
const OBL = (v) => Array.from({ length: 24 }, () => v);
export const SCENARIJI = [
  { id: 'zima', naziv: 'Zimski radni dan', datum: '15. siječnja', dan: 15, tMin: -6, tMax: 1, obl: OBL(0.3), radni: true,
    start: { tUn: 20.6, tSpr: 48, co2: 450 },
    cilj: 'Održi 20–24 °C za vrijeme nastave uz što manje električne energije za dizalicu topline.',
    provjera: [{ m: 'satiHladno', op: '<=', v: 0, t: 'sati nastave ispod 20 °C' }, { m: 'eDT', op: '<=', v: 20, t: 'kWh električne energije za dizalicu topline' }] },
  { id: 'oblacno', naziv: 'Oblačan jesenski dan', datum: '5. studenoga', dan: 309, tMin: 4, tMax: 9, obl: OBL(0.92), radni: true,
    start: { tUn: 21.0, tSpr: 46, co2: 450 },
    cilj: 'Fotonapon malo proizvodi, a kolektori ne griju. Smanji uvoz iz mreže na najviše 112 kWh, a da topla voda i komfor ostanu osigurani.',
    provjera: [{ m: 'satiPTV', op: '<=', v: 0, t: 'sati s PTV-om ispod 44 °C (7–16 h)' }, { m: 'satiHladno', op: '<=', v: 0, t: 'sati nastave ispod 20 °C' }, { m: 'eUvoz', op: '<=', v: 112, t: 'kWh uvoza iz mreže' }] },
  { id: 'ljeto', naziv: 'Ljetni vrh', datum: '21. srpnja', dan: 202, tMin: 21, tMax: 35, obl: OBL(0.05), radni: true,
    start: { tUn: 25.0, tSpr: 60, co2: 450 },
    cilj: 'Bez prelaska 26 °C za vrijeme nastave: iskoristi žaluzine i noćno hlađenje prije nego hlađenje dizalicom topline.',
    provjera: [{ m: 'satiToplo', op: '<=', v: 0, t: 'sati nastave iznad 26 °C' }, { m: 'eDT', op: '<=', v: 40, t: 'kWh električne energije za dizalicu topline' }] },
  { id: 'kvar', naziv: 'Kvar izmjenjivača', datum: '10. lipnja', dan: 161, tMin: 15, tMax: 27, obl: OBL(0.1), radni: true,
    start: { tUn: 23.5, tSpr: 55, co2: 450 }, kvarOd: { id: 'izmj', sat: 10 },
    cilj: 'U 10:00 izmjenjivač prestaje raditi. Pronađi kvar na nadzornoj ploči, odaberi uzrok i očitaj koliko je proizvodnje izgubljeno.',
    provjera: [{ m: 'dijagnoza', op: '==', v: 'izmj', t: 'točno prepoznat uzrok' }] },
  { id: 'usteda', naziv: 'Ušteda energije', datum: '15. travnja', dan: 105, tMin: 6, tMax: 18, obl: OBL(0.2), radni: true,
    start: { tUn: 21.0, tSpr: 46, co2: 450 },
    cilj: 'Podigni samodostatnost na najmanje 66 %: uključi pravilo „Višak FN-a → spremnik i predgrijavanje“ i usporedi s danom bez njega.',
    provjera: [{ m: 'samodostatnost', op: '>=', v: 66, t: '% samodostatnosti' }, { m: 'satiHladno', op: '<=', v: 0, t: 'sati nastave ispod 20 °C' }] },
  { id: 'godina', naziv: 'Usporedba proizvodnje i potrošnje kroz godinu', datum: 'četiri tipična dana', dan: 15, tMin: -6, tMax: 1, obl: OBL(0.3), radni: true,
    start: { tUn: 20.6, tSpr: 48, co2: 450 }, godina: ['zima', 'usteda', 'ljeto', 'oblacno'],
    cilj: 'Simulator redom izvodi četiri tipična dana (zima, proljeće, ljeto, jesen) istim programom i uspoređuje proizvodnju, potrošnju i razmjenu s mrežom.',
    provjera: [] },
  { id: 'skriveni', naziv: 'Skriveni kvar', datum: 'nasumični dan', dan: 40, tMin: -2, tMax: 7, obl: OBL(0.4), radni: true,
    start: { tUn: 21.0, tSpr: 50, co2: 450 }, skriveni: true,
    cilj: 'Jedan osjetnik ili uređaj ne radi, ali ne znaš koji. Prati vrijednosti na nadzornoj ploči i u povijesti, pa odaberi uzrok.',
    provjera: [{ m: 'dijagnoza', op: '==', v: '?', t: 'točno prepoznat uzrok' }] },
];
