/* FORTRONIQ · Pametna kuhinja — jedini izvor podataka: kuhinja, pretpostavke, signali, dijelovi, parametri programa,
   kvarovi, serije namirnica i scenariji s uvjetima uspjeha. Sve brojke su PROCJENA za nastavu (oznaka s:1 = iz
   inženjerske razrade 31. 10. 2026.). HACCP granice su orijentacijske — provjeriti prema HACCP planu objekta.
   © ForTroniQ d.o.o. */

export const KUHINJA = { naziv: 'Pametna hotelska kuhinja', sirina: 10, dubina: 6, stolova: 20 };

/* t: opis, v: vrijednost, jed: jedinica, s: 1 = iz razrade */
export const PRETP = {
  pecSnaga: { t: 'Snaga grijača peći za picu (dvije komore, 230 V)', v: 3.6, jed: 'kW', s: 1 },
  pecMaks: { t: 'Najviša temperatura peći (termostat i limitator peći)', v: 450, jed: '°C', s: 1 },
  pecC: { t: 'Toplinski kapacitet komore i kamena', v: 16, jed: 'kJ/K' },
  pecUA: { t: 'Gubitak topline peći', v: 8.5, jed: 'W/K' },
  pecPad: { t: 'Pad temperature kamena kad uđe jedna pizza', v: 2, jed: '°C' },
  pizzaT: { t: 'Vrijeme pečenja pizze pri 330 °C (dulje na nižoj temperaturi)', v: 210, jed: 's' },
  rosSnaga: { t: 'Snaga ploče roštilja', v: 3, jed: 'kW' },
  rosC: { t: 'Toplinski kapacitet ploče roštilja', v: 12, jed: 'kJ/K' },
  rosUA: { t: 'Gubitak topline ploče', v: 9, jed: 'W/K' },
  tauBurger: { t: 'Vremenska konstanta zagrijavanja jezgre pljeskavice 1,5 cm', v: 380, jed: 's' },
  jezgra: { t: 'Granica temperature jezgre za mljeveno meso (orijentacijski, provjeriti prema HACCP planu)', v: 71, jed: '°C', s: 1 },
  hlGranica: { t: 'Granica hladnjaka i namirnica (orijentacijski 0–4 °C, provjeriti)', v: 4, jed: '°C', s: 1 },
  namGranica: { t: 'Granica temperature namirnica za odluku o premještanju', v: 5, jed: '°C' },
  hlC: { t: 'Toplinski kapacitet hladnjaka s namirnicama', v: 300, jed: 'kJ/K' },
  hlUA: { t: 'Gubitak hladnjaka kroz stijenke', v: 15, jed: 'W/K' },
  hlKomp: { t: 'Rashladni učin kompresora', v: 600, jed: 'W' },
  hlKompEl: { t: 'Električna snaga kompresora', v: 0.25, jed: 'kW' },
  tauNam: { t: 'Vremenska konstanta temperature namirnica', v: 2, jed: 'h' },
  tKuh: { t: 'Temperatura zraka u kuhinji (noću 20 °C)', v: 24, jed: '°C' },
  ur3e: { t: 'UR3e nanosi umak i sir na jednu picu', v: 40, jed: 's', s: 1 },
  slaganje: { t: 'Stanica za burgere slaže jedan burger', v: 30, jed: 's' },
  salata: { t: 'Kuhar priprema salatu (dvije salate istodobno)', v: 120, jed: 's' },
  robTura: { t: 'Robotino: tura do izdavanja i natrag (do 4 tanjura)', v: 90, jed: 's', s: 1 },
  konobar: { t: 'Konobar: tura (do 2 tanjura)', v: 60, jed: 's' },
  napa: { t: 'Napa (radi dok griju peć ili roštilj)', v: 0.8, jed: 'kW' },
  perilica: { t: 'Perilica suđa (program 40 min; zadano nakon zatvaranja kuhinje)', v: 6, jed: 'kW' },
  ostalo: { t: 'Rasvjeta, zasloni i ostali uređaji', v: 1, jed: 'kW' },
  prag: { t: 'Ugovorena (priključna) snaga kuhinje', v: 12, jed: 'kW' },
  dostava: { t: 'Dostava naručenih namirnica', v: 45, jed: 'min' },
  cijena: { t: 'Cijena električne energije', v: 0.15, jed: '€/kWh' },
  korak: { t: 'Korak modela', v: 1, jed: 's', s: 1 },
  adrese: { t: 'Adrese signala su primjer za Schneider M241 ili Siemens S7-1200 (stvarni popis po izvedbi)', v: '', jed: '' },
};

export const SIGNALI = [
  { id: 'T_PEC', vrsta: 'AI', adr: '%IW0', naziv: 'Temperatura komore i kamena peći (termopar tip K)', jed: '°C', raspon: '0 … 500 °C' },
  { id: 'T_ROS', vrsta: 'AI', adr: '%IW1', naziv: 'Temperatura ploče roštilja (termopar tip K)', jed: '°C', raspon: '0 … 400 °C' },
  { id: 'T_JEZ', vrsta: 'AI', adr: '%IW2', naziv: 'Temperatura jezgre jela (bežična sonda)', jed: '°C', raspon: '−20 … 120 °C' },
  { id: 'T_HL', vrsta: 'AI', adr: '%IW3', naziv: 'Temperatura zraka u hladnjaku (Pt100)', jed: '°C', raspon: '−30 … 30 °C' },
  { id: 'P_UK', vrsta: 'AI', adr: '%IW4', naziv: 'Ukupna snaga kuhinje (brojilo)', jed: 'kW', raspon: '0 … 30 kW' },
  { id: 'VRATA_HL', vrsta: 'DI', adr: '%I0.0', naziv: 'Vrata hladnjaka otvorena', jed: '', raspon: '0 / 1' },
  { id: 'PEC_PUNA', vrsta: 'DI', adr: '%I0.1', naziv: 'Peć je puna (sva mjesta zauzeta)', jed: '', raspon: '0 / 1' },
  { id: 'ROB_PULT', vrsta: 'DI', adr: '%I0.2', naziv: 'Robotino je na stanici izdavanja', jed: '', raspon: '0 / 1' },
  { id: 'GRIJ_PEC', vrsta: 'DO', adr: '%Q0.0', naziv: 'Grijači peći (preko kontaktora)', jed: '', raspon: '0 / 1' },
  { id: 'GRIJ_ROS', vrsta: 'DO', adr: '%Q0.1', naziv: 'Grijač ploče roštilja (preko kontaktora)', jed: '', raspon: '0 / 1' },
  { id: 'KOMP', vrsta: 'DO', adr: '%Q0.2', naziv: 'Kompresor hladnjaka', jed: '', raspon: '0 / 1' },
  { id: 'NAPA', vrsta: 'DO', adr: '%Q0.3', naziv: 'Napa', jed: '', raspon: '0 / 1' },
  { id: 'PERILICA', vrsta: 'DO', adr: '%Q0.4', naziv: 'Perilica suđa', jed: '', raspon: '0 / 1' },
  { id: 'PUSTI', vrsta: 'DO', adr: '%Q0.5', naziv: 'Dozvola izdavanja burgera (kontrola jezgre)', jed: '', raspon: '0 / 1' },
  { id: 'SIRENA', vrsta: 'DO', adr: '%Q0.6', naziv: 'Alarm (sirena i poruka dežurnom)', jed: '', raspon: '0 / 1' },
];

export const SKUPINE = [
  { id: 'erp', naziv: 'Narudžbe, MES i ERP' },
  { id: 'stanice', naziv: 'Stanice pripreme' },
  { id: 'hladno', naziv: 'Hladnjaci i HACCP' },
  { id: 'transport', naziv: 'Transport i suđe' },
  { id: 'upravljanje', naziv: 'Upravljanje i energija' },
];

export const DIJELOVI = [
  { id: 'kds', skupina: 'erp', uloga: 'upravljac', naziv: 'Kuhinjski zaslon narudžbi (MES)', engl: 'kitchen display system', signali: [],
    tekst: ['Narudžba gosta iz restorana ili sobe (ERP) postaje radni nalog za svako jelo: priprema → peć ili roštilj → kontrola → izdavanje. Zaslon pokazuje redoslijed i vrijeme svakog koraka.',
      'MES bilježi svaki korak s vremenom i serijom namirnica: iz tog se zapisa računa čekanje i radi sljedivost unatrag.'] },
  { id: 'ur3e', skupina: 'stanice', uloga: 'aktuator', naziv: 'Kobot UR3e — stanica za picu', engl: 'collaborative robot', pretp: ['ur3e'], signali: [],
    tekst: ['Kolaborativni robot nanosi umak i sir na tijesto i lopatom stavlja picu u peć. Smije raditi uz kuhara (sila i brzina ograničene).',
      'Doseg UR3e je oko 500 mm, zato peć mora biti blizu i na pravoj visini (procjena; provjeriti prema podacima proizvođača).'] },
  { id: 'pec', skupina: 'stanice', uloga: 'aktuator', naziv: 'Električna peć za picu', engl: 'electric deck pizza oven', pretp: ['pecSnaga', 'pecMaks', 'pizzaT'], signali: ['T_PEC', 'GRIJ_PEC', 'PEC_PUNA'],
    tekst: ['Dvije komore s kamenom, do 450 °C. Peć zadržava vlastiti termostat i sigurnosni limitator; naš PLC čita vlastiti termopar i uključuje grijače preko kontaktora.',
      'Pizza ulazi tek kad je kamen dovoljno vruć (blokada u programu). Svaka pizza malo ohladi kamen.'] },
  { id: 'rostilj', skupina: 'stanice', uloga: 'aktuator', naziv: 'Električna ploča roštilja', engl: 'electric griddle', pretp: ['rosSnaga'], signali: ['T_ROS', 'GRIJ_ROS'],
    tekst: ['Ploča za pljeskavice s termoparom; PLC drži temperaturu između dvije granice (histereza).',
      'Broj mjesta na ploči određuje koliko se burgera peče istodobno — to je kapacitet stanice.'] },
  { id: 'sonda', skupina: 'hladno', uloga: 'osjetnik', naziv: 'Sonda jezgre (kontrola kvalitete)', engl: 'core temperature probe', pretp: ['jezgra'], signali: ['T_JEZ', 'PUSTI'],
    tekst: ['Bežična sonda mjeri temperaturu u sredini jela. Burger ne prolazi kontrolu dok jezgra nije na sigurnoj temperaturi — vraća se na roštilj.',
      'Svako mjerenje upisuje se automatski u HACCP zapis s vremenom, stolom i serijom mesa. Sonda se čisti između komada.'] },
  { id: 'slaganje', skupina: 'stanice', uloga: 'aktuator', naziv: 'Stanica za slaganje burgera', engl: 'burger assembly station', pretp: ['slaganje'], signali: [],
    tekst: ['Slaže pecivo, pljeskavicu i dodatke i prati zalihe sastojaka u stvarnom vremenu. Vlastita izvedba po uzoru na koncept automatiziranih kuhinja.'] },
  { id: 'hladnjak', skupina: 'hladno', uloga: 'aktuator', naziv: 'Hladnjak (komora 0–4 °C)', engl: 'walk-in cooler', pretp: ['hlGranica', 'hlKomp', 'tauNam'], signali: ['T_HL', 'KOMP', 'VRATA_HL'],
    tekst: ['Pt100 mjeri zrak u komori, PLC uključuje kompresor s histerezom. Namirnice se zagrijavaju sporije od zraka.',
      'Ako temperatura prijeđe granicu, sirena i poruka dežurnom; odluka o namirnicama (premjestiti ili otpisati) upisuje se u HACCP zapis.'] },
  { id: 'sok', skupina: 'hladno', uloga: 'aktuator', naziv: 'Šok hladnjak i rezervni hladnjak', engl: 'blast chiller', signali: [],
    tekst: ['Šok hladnjak brzo hladi kuhana jela; rezervni hladnjak prima namirnice kad glavni otkaže (u simulatoru: radnja „Premjesti namirnice“).'] },
  { id: 'robotino', skupina: 'transport', uloga: 'aktuator', naziv: 'Mobilni robot Robotino', engl: 'mobile robot', pretp: ['robTura'], signali: ['ROB_PULT'],
    tekst: ['Vozi gotova jela od izdavanja do pulta za konobare, a pladnjeve sa suđem do perionice; zaobilazi ljude. Isti princip kao nosači u CP Factoryju.',
      'Kad kasni, jela čekaju na izdavanju — u ručnom radu nosi konobar.'] },
  { id: 'perionica', skupina: 'transport', uloga: 'aktuator', naziv: 'Perionica s trakom i perilica suđa', engl: 'dishwashing conveyor', pretp: ['perilica'], signali: ['PERILICA'],
    tekst: ['Žičana pokretna traka nosi suđe kroz ispiranje; perilica je najveći potrošač struje u kuhinji i može se pokrenuti kad je snaga mala.'] },
  { id: 'kamera', skupina: 'transport', uloga: 'osjetnik', naziv: 'Vizijski sustav i sortiranje pribora', engl: 'vision system', signali: [],
    tekst: ['Kamera iznad trake prepoznaje vrstu i položaj predmeta (vilica, žlica, nož, tanjur, čaša), skretnice ih razvrstavaju. U simulatoru je pojednostavljeno — stvarno sortiranje mokrog pribora je teško.'] },
  { id: 'plc', skupina: 'upravljanje', uloga: 'upravljac', naziv: 'PLC i SCADA', engl: 'PLC and SCADA', pretp: ['adrese'], signali: ['SIRENA', 'NAPA'],
    tekst: ['PLC (npr. Schneider M241 ili Siemens S7-1200) vodi peć, roštilj, hladnjak, napu i perilicu; SCADA prikazuje temperature, alarme, brojače i snagu.',
      'Logika se najprije provjeri u simulatoru, a zatim se prebaci na stvarni upravljač (Modbus TCP ili OPC UA).'] },
  { id: 'brojilo', skupina: 'upravljanje', uloga: 'osjetnik', naziv: 'Brojilo snage', engl: 'energy meter', pretp: ['prag'], signali: ['P_UK'],
    tekst: ['Mjeri ukupnu snagu kuhinje. Ako snaga prijeđe ugovorenu, raste trošak; PLC može odgoditi perilicu dok peć i roštilj griju.'] },
  { id: 'napa', skupina: 'upravljanje', uloga: 'aktuator', naziv: 'Napa', engl: 'extractor hood', pretp: ['napa'], signali: ['NAPA'],
    tekst: ['Odsisava paru i mirise iznad peći i roštilja; radi dok bilo koji od njih grije.'] },
];

/* parametri programa — zadani program; id, naziv, v, min, max, korak, jed */
export const PARAMETRI = [
  { id: 'pecStart', naziv: 'Peć se uključuje u', v: 17, min: 0, max: 23.5, korak: 0.25, jed: 'h' },
  { id: 'pecOn', naziv: 'Peć: grij ispod', v: 320, min: 200, max: 440, korak: 5, jed: '°C' },
  { id: 'pecOff', naziv: 'Peć: ne grij iznad', v: 340, min: 210, max: 450, korak: 5, jed: '°C' },
  { id: 'pecMin', naziv: 'Pizza ulazi tek iznad', v: 280, min: 200, max: 420, korak: 5, jed: '°C' },
  { id: 'pecMax', naziv: 'Pizza u peći istodobno', v: 2, min: 1, max: 4, korak: 1, jed: 'kom' },
  { id: 'rosStart', naziv: 'Roštilj se uključuje u', v: 17.5, min: 0, max: 23.5, korak: 0.25, jed: 'h' },
  { id: 'rosOn', naziv: 'Roštilj: grij ispod', v: 190, min: 120, max: 260, korak: 5, jed: '°C' },
  { id: 'rosOff', naziv: 'Roštilj: ne grij iznad', v: 210, min: 130, max: 270, korak: 5, jed: '°C' },
  { id: 'rosMax', naziv: 'Pljeskavica na ploči istodobno', v: 4, min: 1, max: 10, korak: 1, jed: 'kom' },
  { id: 'rosSonda', naziv: 'Burger se vadi po sondi (1) ili po vremenu (0)', v: 1, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'rosVrijeme', naziv: 'Vrijeme na roštilju', v: 8, min: 2, max: 15, korak: 0.5, jed: 'min' },
  { id: 'jezgraMin', naziv: 'Kontrola: jezgra najmanje', v: 71, min: 60, max: 80, korak: 1, jed: '°C' },
  { id: 'kontrola', naziv: 'Kontrola sondom prije izdavanja', v: 1, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'hlOn', naziv: 'Hladnjak: kompresor iznad', v: 3.5, min: 1, max: 8, korak: 0.5, jed: '°C' },
  { id: 'hlOff', naziv: 'Hladnjak: kompresor stane ispod', v: 1.5, min: -1, max: 6, korak: 0.5, jed: '°C' },
  { id: 'alarmHl', naziv: 'Alarm hladnjaka iznad', v: 4, min: 2, max: 10, korak: 0.5, jed: '°C' },
  { id: 'perStart', naziv: 'Perilica kreće u', v: 22.5, min: 0, max: 23.5, korak: 0.25, jed: 'h' },
  { id: 'blokada', naziv: 'Odgodi perilicu kad bi snaga prešla prag', v: 0, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'minZal', naziv: 'ERP naručuje pljeskavice kad zaliha padne ispod (0 = ne naručuje)', v: 0, min: 0, max: 60, korak: 1, jed: 'kom' },
];

export const KVAROVI = [
  { id: 'hladnjak', naziv: 'Kompresor hladnjaka ne hladi', opis: 'Kompresor radi (izlaz KOMP je uključen), ali hladnjak se ne hladi: temperatura raste i uz uključen nalog. Uzrok može biti gubitak rashladnog sredstva ili kvar ventilatora kondenzatora.' },
  { id: 'osjetnikHl', naziv: 'Osjetnik hladnjaka zaglavio na 3 °C', opis: 'Pt100 pokazuje stalno 3 °C, pa PLC misli da je hladno i kompresor ne radi; namirnice se zagrijavaju bez alarma. Znak: ravna crta i kompresor koji se ne uključuje satima.' },
  { id: 'pecGrijac', naziv: 'Pregorio jedan grijač peći (pola snage)', opis: 'Peć dobiva samo pola snage: temperatura sporo raste i ne doseže granicu za pizzu, a grijači su stalno uključeni.' },
  { id: 'robotino', naziv: 'Robotino usporen (prepreka na putu)', opis: 'Robotino vozi pet puta sporije zbog prepreke: jela čekaju na izdavanju. Rješenje do uklanjanja prepreke: dostavu preuzima konobar (ručni rad).' },
];

/* serije namirnica u skladištu na početku: [oznaka, broj porcija] redom kojim se troše */
export const SERIJE = {
  meso: { naziv: 'pljeskavice', jed: 'kom', serije: [['P-2610', 16], ['P-2611', 44]] },
  sir: { naziv: 'mozzarella', jed: 'porcija', serije: [['M-1027', 14], ['M-1028', 80]] },
  salata: { naziv: 'salata', jed: 'porcija', serije: [['Z-0915', 60]] },
};
export const NOVA_SERIJA = 'P-2614';

/* dolazak narudžbi: [od sata, do sata, narudžbi na sat]; jelo: udio pizza / burger / salata; 1–4 jela po narudžbi */
const VECER = [[18, 19, 8], [19, 20.5, 12], [20.5, 22, 7]];
export const SCENARIJI = [
  { id: 'normalna', naziv: 'Uobičajena večer', opis: 'restoran hotela, 18–22 h', odSata: 17, trajanje: 6, dolasci: VECER, udio: [0.45, 0.35, 0.2], sjeme: 11,
    cilj: 'Sva jela izdana, nijedno nesigurno, nitko ne čeka dulje od 20 minuta.',
    provjera: [{ k: 'otkazano', op: '<=', v: 0, t: 'otkazanih jela' }, { k: 'nesigurno', op: '<=', v: 0, t: 'nesigurno izdanih burgera' }, { k: 'maxCek', op: '<=', v: 20, t: 'najdulje čekanje (min)' }] },
  { id: 'guzva', naziv: 'Puna večer (gužva)', opis: 'dva autobusa gostiju oko 19 h', odSata: 17, trajanje: 6, dolasci: [[18, 19, 10], [19, 20, 40], [20, 21, 20], [21, 22, 6]], udio: [0.5, 0.35, 0.15], sjeme: 23,
    cilj: 'Unatoč valu narudžbi nitko ne čeka dulje od 25 minuta. Zadani raspored kapaciteta to ne postiže.',
    provjera: [{ k: 'maxCek', op: '<=', v: 25, t: 'najdulje čekanje (min)' }, { k: 'prosCek', op: '<=', v: 15, t: 'prosječno čekanje (min)' }, { k: 'nesigurno', op: '<=', v: 0, t: 'nesigurno izdanih burgera' }] },
  { id: 'burger', naziv: 'Prerano izvađen burger', opis: 'kuhar vadi po vremenu: 5 minuta', odSata: 17, trajanje: 6, dolasci: VECER, udio: [0.3, 0.55, 0.15], sjeme: 31, param: { rosSonda: 0, rosVrijeme: 5 },
    cilj: 'Burgeri se vade po vremenu od 5 minuta i sonda ih vraća na roštilj. Promijeni pravilo tako da nijedan ne bude vraćen ni prepečen.',
    provjera: [{ k: 'vraceno', op: '<=', v: 0, t: 'burgera vraćenih s kontrole' }, { k: 'prepeceno', op: '<=', v: 0, t: 'prepečenih burgera (jezgra iznad 85 °C)' }, { k: 'nesigurno', op: '<=', v: 0, t: 'nesigurno izdanih burgera' }] },
  { id: 'hladnjakNoc', naziv: 'Kvar hladnjaka noću', opis: 'kuhinja zatvorena, 22–8 h', odSata: 22, trajanje: 10, dolasci: [], udio: [0, 0, 0], sjeme: 5, kvarOd: { id: 'hladnjak', sat: 23.5 }, noc: true,
    cilj: 'Hladnjak otkaže u 23:30. Reagiraj na alarm: premjesti namirnice prije nego što prijeđu 5 °C i upiši uzrok.',
    provjera: [{ k: 'namIznad', op: '<=', v: 0, t: 'minuta namirnica iznad 5 °C' }, { k: 'premjesteno', op: '==', v: true, t: 'namirnice premještene u rezervni hladnjak' }, { k: 'dijagnoza', op: '==', v: true, t: 'točno upisan uzrok' }] },
  { id: 'pec', naziv: 'Peć ne dostiže temperaturu', opis: 'priprema večeri, peć se pali u 17 h', odSata: 17, trajanje: 4, dolasci: [[18, 21, 8]], udio: [0.5, 0.3, 0.2], sjeme: 41, kvarOd: { id: 'pecGrijac', sat: 17 },
    cilj: 'Peć se grije, ali pizza ne može u peć. Pronađi uzrok na SCADA ploči i upiši ga najkasnije sat i pol nakon uključenja peći.',
    provjera: [{ k: 'dijagnoza', op: '==', v: true, t: 'točno upisan uzrok' }, { k: 'vrijemeDijag', op: '<=', v: 1.5, t: 'sati od kvara do dijagnoze' }] },
  { id: 'robotino', naziv: 'Kašnjenje Robotina', opis: 'prepreka u hodniku od 19 h', odSata: 17, trajanje: 6, dolasci: [[18, 19, 10], [19, 21, 18], [21, 22, 8]], udio: [0.45, 0.35, 0.2], sjeme: 53, kvarOd: { id: 'robotino', sat: 19 },
    cilj: 'Od 19 h jela čekaju na izdavanju. Prepoznaj uzrok, prebaci dostavu na konobara i zadrži čekanje ispod 25 minuta.',
    provjera: [{ k: 'dijagnoza', op: '==', v: true, t: 'točno upisan uzrok' }, { k: 'maxCek', op: '<=', v: 25, t: 'najdulje čekanje (min)' }] },
  { id: 'energija', naziv: 'Vršna snaga', opis: 'perilica kreće u 19 h', odSata: 17, trajanje: 6, dolasci: VECER, udio: [0.45, 0.35, 0.2], sjeme: 61, perilice: 2, param: { perStart: 19 },
    cilj: 'Perilica (6 kW) uz peć i roštilj prelazi ugovorenu snagu od 12 kW. Rasporedi rad tako da snaga ne prijeđe prag, a oba programa pranja završe do 23 h.',
    provjera: [{ k: 'vrsna', op: '<=', v: 12, t: 'najveća snaga (kW)' }, { k: 'perilicaGotova', op: '==', v: true, t: 'pranje završeno do 23 h' }, { k: 'maxCek', op: '<=', v: 20, t: 'najdulje čekanje (min)' }] },
  { id: 'serija', naziv: 'Povlačenje serije', opis: 'obavijest dobavljača u 21:30', odSata: 17, trajanje: 5, dolasci: [[18, 19, 9], [19, 20.5, 12], [20.5, 21.5, 8]], udio: [0.5, 0.35, 0.15], sjeme: 71, povlacenje: { sat: 21.5, serija: 'M-1027' },
    cilj: 'U 21:30 dobavljač povlači seriju mozzarelle M-1027. Iz MES zapisa pronađi sve stolove koji su dobili jelo s tom serijom i prijavi ih.',
    provjera: [{ k: 'serijaOk', op: '==', v: true, t: 'točno prijavljeni stolovi' }] },
  { id: 'zalihe', naziv: 'Manjak zaliha', opis: 'u skladištu samo 18 pljeskavica', odSata: 17, trajanje: 6, dolasci: VECER, udio: [0.35, 0.5, 0.15], sjeme: 83, zalihe: { meso: [['P-2610', 18]] },
    cilj: 'Pljeskavica ima malo. Postavi ERP da naruči na vrijeme (dostava traje 45 minuta) ili naruči ručno, tako da nijedno jelo ne bude otkazano.',
    provjera: [{ k: 'otkazano', op: '<=', v: 0, t: 'otkazanih jela' }, { k: 'maxCek', op: '<=', v: 25, t: 'najdulje čekanje (min)' }] },
];

/* recepti (uređivač recepata): orijentacijske sigurne temperature jezgre — PROVJERITI prema HACCP planu objekta */
export const MESO = [
  { id: 'mljeveno', naziv: 'Pljeskavica (mljevena junetina)', sigurno: 71, dobro: [71, 76], d: 1.5, tauF: 1.0 },
  { id: 'piletina', naziv: 'Pileći file', sigurno: 74, dobro: [74, 78], d: 2, tauF: 1.05 },
  { id: 'svinjski', naziv: 'Svinjski vrat (odrezak)', sigurno: 68, dobro: [68, 74], d: 2.5, tauF: 1.1 },
  { id: 'kobasica', naziv: 'Kobasica (svježa)', sigurno: 71, dobro: [71, 77], d: 2.5, tauF: 0.9 },
  { id: 'junetina', naziv: 'Junetina — odrezak (cijeli komad)', sigurno: 63, dobro: [55, 66], d: 3, tauF: 1.0, napomena: 'Cijeli komad mesa: bakterije su uglavnom na površini koja se jako zagrije; sredina može ostati ružičasta ako to dopušta HACCP plan objekta.' },
];
export const NACINI = [
  { id: 'rostilj', naziv: 'Roštilj (ploča)', tMin: 150, tMax: 260, t: 200, ef: 0.5, tau: 380, okreni: true },
  { id: 'pec', naziv: 'Pećnica (konvekcija)', tMin: 120, tMax: 250, t: 180, ef: 0.55, tau: 620, okreni: false },
  { id: 'dim', naziv: 'Dimljenje (toplo)', tMin: 90, tMax: 140, t: 110, ef: 0.9, tau: 900, okreni: false },
];
