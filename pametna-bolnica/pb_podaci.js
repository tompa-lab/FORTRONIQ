/* FORTRONIQ · Pametna bolnica s tabletičarom — jedini izvor podataka. SIMULATOR ZA UČENJE, NE MEDICINSKI UREĐAJ:
   pacijenti, lijekovi (A–H), nespojivosti i serije su IZMIŠLJENI. Sve brojke su procjena za nastavu.
   © ForTroniQ d.o.o. */

export const ODJEL = { naziv: 'Pametni bolnički odjel s tabletičarom', soba: 4, kreveta: 8 };
export const TERMINI = [{ h: 8, n: 'jutro' }, { h: 12, n: 'podne' }, { h: 18, n: 'večer' }, { h: 22, n: 'noć' }];
export const DANI = ['pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned'];

export const PRETP = {
  pretinci: { t: 'Pretinci tabletičara: 7 dana × 4 termina', v: 28, jed: '', s: 1 },
  ur3e: { t: 'UR3e: uzimanje vakuumom, kamera, vaga i odlaganje jedne tablete', v: 9, jed: 's', s: 1 },
  farmaceut: { t: 'Završna provjera farmaceuta (dvostruka provjera)', v: 5, jed: 'min', s: 1 },
  robTura: { t: 'Robotino: ljekarna → odjel', v: 6, jed: 'min', s: 1 },
  uzorci: { t: 'Robotino: redovita tura uzoraka u laboratorij (10:15)', v: 45, jed: 'min' },
  doza: { t: 'Sestra izdaje dozu iz tabletičara (obavijest, LED, poklopac, upis)', v: 2, jed: 'min' },
  nadzor: { t: 'Nadzirano uzimanje (sestra ostaje dok pacijent ne uzme lijek)', v: 5, jed: 'min' },
  potpis: { t: 'Stroža evidencija za označeni lijek (drugi potpis)', v: 3, jed: 'min' },
  dezurni: { t: 'Dežurni stiže nakon poziva', v: 2, jed: 'min' },
  naVrijeme: { t: 'Doza je izdana na vrijeme do (nakon termina)', v: 60, jed: 'min' },
  propustena: { t: 'Doza se smatra propuštenom nakon', v: 120, jed: 'min' },
  dostava: { t: 'Hitna nabava lijeka', v: 120, jed: 'min' },
  hlCilj: { t: 'Hladnjak za lijekove', v: '2–8', jed: '°C', s: 1 },
  korak: { t: 'Korak modela', v: 1, jed: 's', s: 1 },
  adrese: { t: 'Adrese signala su primjer (stvarni popis po izvedbi stanice i odjela)', v: '', jed: '' },
};

/* izmišljeni lijekovi: oblik, boja i masa za kameru i vagu */
export const LIJEKOVI = [
  { id: 'A', naziv: 'Lijek A', oblik: 'okrugla', boja: 'bijela', masa: 250, hex: '#f4f4f0', serije: [['A-2401', 300]] },
  { id: 'B', naziv: 'Lijek B', oblik: 'ovalna', boja: 'žuta', masa: 180, hex: '#f2cf3a', serije: [['B-2402', 3], ['B-2403', 200]] },
  { id: 'C', naziv: 'Lijek C', oblik: 'okrugla', boja: 'ružičasta', masa: 120, hex: '#f3a6b8', serije: [['C-2398', 300]] },
  { id: 'D', naziv: 'Lijek D', oblik: 'kapsula', boja: 'plavo-bijela', masa: 310, hex: '#5d85d8', serije: [['D-2410', 300]] },
  { id: 'E', naziv: 'Lijek E', oblik: 'okrugla', boja: 'narančasta', masa: 200, hex: '#ee8a3c', serije: [['E-2405', 300]] },
  { id: 'F', naziv: 'Lijek F', oblik: 'ovalna', boja: 'bijela', masa: 400, hex: '#e9ece8', serije: [['F-2399', 300]] },
  { id: 'G', naziv: 'Lijek G', oblik: 'okrugla', boja: 'zelena', masa: 90, hex: '#58b37a', serije: [['G-2411', 300]] },
  { id: 'H', naziv: 'Lijek H', oblik: 'kapsula', boja: 'crveno-siva', masa: 150, hex: '#c95454', serije: [['H-2390', 300]], kontrolirani: true },
];
export const NESPOJIVI = [['A', 'D'], ['C', 'F']];   /* izmišljeno pravilo za vježbu: ne u istom terminu */

/* izmišljeni pacijenti; terapija: [lijek, [indeksi termina]] */
export const PACIJENTI = [
  { id: 'P-101', ime: 'Ivana M.', soba: 1, krevet: 1, rfid: 'TB-0101', vit: [72, 97, 36.6], terapija: [['A', [0, 2]], ['B', [0]]] },
  { id: 'P-102', ime: 'Stjepan K.', soba: 1, krevet: 2, rfid: 'TB-0102', vit: [80, 96, 36.9], terapija: [['C', [0, 1, 2]], ['E', [0]]] },
  { id: 'P-103', ime: 'Marija P.', soba: 2, krevet: 1, rfid: 'TB-0103', vit: [68, 98, 36.5], terapija: [['D', [1]], ['G', [3]]] },
  { id: 'P-104', ime: 'Josip B.', soba: 2, krevet: 2, rfid: 'TB-0104', vit: [88, 95, 37.2], terapija: [['B', [0, 2]], ['F', [2]]] },
  { id: 'P-105', ime: 'Ana R.', soba: 3, krevet: 1, rfid: 'TB-0105', vit: [76, 98, 36.7], terapija: [['H', [0, 3]], ['C', [0]]] },
  { id: 'P-106', ime: 'Franjo T.', soba: 3, krevet: 2, rfid: 'TB-0106', vit: [84, 94, 37.0], terapija: [['E', [0, 2]], ['G', [3]]] },
  { id: 'P-107', ime: 'Katarina L.', soba: 4, krevet: 1, rfid: 'TB-0107', vit: [70, 97, 36.4], terapija: [['A', [0, 1, 2]], ['D', [3]]] },
  { id: 'P-108', ime: 'Nikola D.', soba: 4, krevet: 2, rfid: 'TB-0108', vit: [92, 96, 36.8], terapija: [['F', [0]], ['B', [2]]] },
];

export const SIGNALI = [
  { id: 'MASA', vrsta: 'AI', adr: '%IW0', naziv: 'Vaga stanice punjenja (masa tablete)', jed: 'mg', raspon: '0 … 2000 mg' },
  { id: 'T_HLL', vrsta: 'AI', adr: '%IW1', naziv: 'Temperatura hladnjaka za lijekove', jed: '°C', raspon: '−10 … 30 °C' },
  { id: 'KAMERA_OK', vrsta: 'DI', adr: '%I0.0', naziv: 'Kamera: oblik, boja i oznaka odgovaraju nalogu', jed: '', raspon: '0 / 1' },
  { id: 'RFID_OK', vrsta: 'DI', adr: '%I0.1', naziv: 'RFID/QR tabletičara odgovara pacijentu iz naloga', jed: '', raspon: '0 / 1' },
  { id: 'ZONA', vrsta: 'DI', adr: '%I0.2', naziv: 'Zona robota slobodna, zaštitna vrata zatvorena', jed: '', raspon: '0 / 1' },
  { id: 'POKLOPAC', vrsta: 'DI', adr: '%I0.3', naziv: 'Poklopac pretinca otvoren (reed ili Hallov senzor)', jed: '', raspon: '0 / 1' },
  { id: 'PAD', vrsta: 'DI', adr: '%I0.4', naziv: 'Senzor ustajanja i pada na krevetu', jed: '', raspon: '0 / 1' },
  { id: 'POZIV', vrsta: 'DI', adr: '%I0.5', naziv: 'Tipka za poziv sestri', jed: '', raspon: '0 / 1' },
  { id: 'ROB_ODJEL', vrsta: 'DI', adr: '%I0.6', naziv: 'Robotino je na odjelu', jed: '', raspon: '0 / 1' },
  { id: 'ROBOT', vrsta: 'DO', adr: '%Q0.0', naziv: 'UR3e — dozvola rada', jed: '', raspon: '0 / 1' },
  { id: 'VAKUUM', vrsta: 'DO', adr: '%Q0.1', naziv: 'Vakuumska sisaljka', jed: '', raspon: '0 / 1' },
  { id: 'LED', vrsta: 'DO', adr: '%Q0.2', naziv: 'LED ispod pretinca (pick-to-light)', jed: '', raspon: '0 / 1' },
  { id: 'UPIS', vrsta: 'DO', adr: '%Q0.3', naziv: 'Upis doze u dokumentaciju (MES)', jed: '', raspon: '0 / 1' },
  { id: 'ALARM_DOZA', vrsta: 'DO', adr: '%Q0.4', naziv: 'Alarm propuštene doze', jed: '', raspon: '0 / 1' },
  { id: 'KOMP_HLL', vrsta: 'DO', adr: '%Q0.5', naziv: 'Kompresor hladnjaka za lijekove', jed: '', raspon: '0 / 1' },
  { id: 'SVJETLO', vrsta: 'DO', adr: '%Q0.6', naziv: 'Svjetlo poziva iznad vrata sobe', jed: '', raspon: '0 / 1' },
];

export const SKUPINE = [
  { id: 'erp', naziv: 'ERP i MES' },
  { id: 'ljekarna', naziv: 'Ljekarna — stanica punjenja' },
  { id: 'transport', naziv: 'Transport' },
  { id: 'soba', naziv: 'Bolnička soba' },
  { id: 'nadzor', naziv: 'Sestrinska stanica i upravljanje' },
];

export const DIJELOVI = [
  { id: 'his', skupina: 'erp', uloga: 'upravljac', naziv: 'Bolnički informacijski sustav (ERP)', engl: 'hospital information system', signali: [],
    tekst: ['Pacijenti, propisana terapija, zalihe, serije i nabava lijekova. Liječnik propisuje terapiju, sustav provjerava nespojive lijekove u istom terminu.', 'U simulatoru su pacijenti i lijekovi izmišljeni.'] },
  { id: 'mes', skupina: 'erp', uloga: 'upravljac', naziv: 'Izvršenje terapije (MES)', engl: 'medication execution', signali: ['UPIS', 'ALARM_DOZA'],
    tekst: ['Iz terapije slaže nalog punjenja (pacijent, dan, termin, lijek, serija), prati tabletičar do odjela i svaku dozu do potvrde.', 'Bilježi tko je napunio, koji je pretinac otvoren, je li doza uzeta, propuštena ili odbijena — osnova sljedivosti serije do pacijenta.'] },
  { id: 'ur3e', skupina: 'ljekarna', uloga: 'aktuator', naziv: 'Kobot UR3e s vakuumskom sisaljkom', engl: 'collaborative robot', pretp: ['ur3e'], signali: ['ROBOT', 'VAKUUM', 'ZONA'],
    tekst: ['Uzima tabletu iz spremnika i odlaže je u pretinac na koji pokazuje LED. Kod svake greške robot stane; ponovni start traži otklonjen uzrok i slobodnu zonu.'] },
  { id: 'spremnici', skupina: 'ljekarna', uloga: 'aktuator', naziv: 'Spremnici lijekova', engl: 'medication canisters', signali: [],
    tekst: ['Svaki spremnik nosi jedan lijek i jednu seriju; pri dopuni upisuje se nova serija. Prazan spremnik zaustavlja punjenje i javlja se ERP-u.'] },
  { id: 'kamera', skupina: 'ljekarna', uloga: 'osjetnik', naziv: 'Kamera (oblik, boja, oznaka)', engl: 'vision check', signali: ['KAMERA_OK'],
    tekst: ['Prepoznaje tabletu u sisaljci i uspoređuje je s nalogom. Krivi lijek u spremniku otkriva se prije nego što uđe u tabletičar.'] },
  { id: 'vaga', skupina: 'ljekarna', uloga: 'osjetnik', naziv: 'Vaga (potvrda mase)', engl: 'checkweigher', signali: ['MASA'],
    tekst: ['Potvrđuje da je u pretinac stvarno pala jedna tableta očekivane mase. Ako tableta padne pokraj, masa ne odgovara i robot stane.'] },
  { id: 'citac', skupina: 'ljekarna', uloga: 'osjetnik', naziv: 'Čitač RFID/QR i LED pretinca', engl: 'RFID reader, pick-to-light', signali: ['RFID_OK', 'LED'],
    tekst: ['Potvrđuje da je na stanici tabletičar pravog pacijenta; LED pokazuje ciljni pretinac.'] },
  { id: 'farmaceut', skupina: 'ljekarna', uloga: 'upravljac', naziv: 'Završna provjera farmaceuta', engl: 'pharmacist double check', pretp: ['farmaceut'], signali: [],
    tekst: ['Dvostruka provjera: farmaceut pregledava napunjene tabletičare prije slanja na odjel.'] },
  { id: 'robotino', skupina: 'transport', uloga: 'aktuator', naziv: 'Mobilni robot Robotino', engl: 'mobile robot', pretp: ['robTura'], signali: ['ROB_ODJEL'],
    tekst: ['Vozi kolica s tabletičarima iz ljekarne na odjel i uzorke u laboratorij. Hitni nalog može imati prednost pred redovitom turom.'] },
  { id: 'tabletar', skupina: 'soba', uloga: 'aktuator', naziv: 'Tabletičar uz krevet', engl: 'smart pill organiser', pretp: ['pretinci'], signali: ['LED', 'POKLOPAC'],
    tekst: ['28 pretinaca (7 dana × 4 termina). U terminu svijetli LED ispod pravog pretinca, sestra dobiva obavijest; senzor poklopca potvrđuje otvaranje i doza se sama upisuje.', 'Polazište: Tabletičar studentskog poduzeća Meditronika (Studentski inkubator Visoke tehničke škole u Bjelovaru, 2013.).'] },
  { id: 'krevet', skupina: 'soba', uloga: 'osjetnik', naziv: 'Krevet sa senzorom ustajanja i pada', engl: 'bed exit sensor', signali: ['PAD'],
    tekst: ['Javlja ustajanje ili pad; alarm pada ima najviši prioritet na sestrinskoj stanici.'] },
  { id: 'monitor', skupina: 'soba', uloga: 'osjetnik', naziv: 'Monitor vitalnih znakova', engl: 'patient monitor', signali: [],
    tekst: ['Puls, saturacija, tlak i temperatura (u simulatoru izmišljene vrijednosti); pad saturacije ispod praga diže alarm.'] },
  { id: 'pumpa', skupina: 'soba', uloga: 'aktuator', naziv: 'Infuzijska pumpa', engl: 'infusion pump', signali: [],
    tekst: ['Prikazana u sobi kao dio opreme; u prvoj verziji simulatora ne upravlja se.'] },
  { id: 'hladnjakL', skupina: 'soba', uloga: 'aktuator', naziv: 'Hladnjak za lijekove (2–8 °C)', engl: 'medication fridge', pretp: ['hlCilj'], signali: ['T_HLL', 'KOMP_HLL'],
    tekst: ['Drži lijekove koji traže hlađenje između 2 i 8 °C; izlazak iz raspona diže alarm.'] },
  { id: 'tipka', skupina: 'soba', uloga: 'osjetnik', naziv: 'Tipka za poziv sestri', engl: 'nurse call', signali: ['POZIV', 'SVJETLO'],
    tekst: ['Pacijent poziva sestru; svijetli svjetlo iznad vrata sobe.'] },
  { id: 'stanica', skupina: 'nadzor', uloga: 'upravljac', naziv: 'Sestrinska stanica i središnja ploča', engl: 'nurse station', signali: [],
    tekst: ['Sve sobe, doze i alarmi na jednom mjestu; bilježe se vrijeme reakcije i odluke. Redoslijed zadataka može biti po vremenu ili po prioritetu.'] },
];

export const PARAMETRI = [
  { id: 'sestre', naziv: 'Broj sestara u smjeni', v: 2, min: 1, max: 4, korak: 1, jed: '' },
  { id: 'redoslijed', naziv: 'Redoslijed zadataka: po vremenu (0) ili po prioritetu (1)', v: 0, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'alarmMin', naziv: 'Alarm doze nakon', v: 30, min: 5, max: 90, korak: 5, jed: 'min' },
  { id: 'eskDoza', naziv: 'Doza: pozovi dežurnog nakon (0 = ne zove)', v: 0, min: 0, max: 120, korak: 5, jed: 'min' },
  { id: 'eskAlarm', naziv: 'Alarm iz sobe: pozovi dežurnog nakon (0 = ne zove)', v: 0, min: 0, max: 15, korak: 1, jed: 'min' },
  { id: 'dvostruka', naziv: 'Dvostruka provjera farmaceuta', v: 1, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'nadzirano', naziv: 'Nadzirano uzimanje', v: 0, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'potpis', naziv: 'Drugi potpis za označeni lijek', v: 0, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'hitno', naziv: 'Hitni nalog ima prednost', v: 0, min: 0, max: 1, korak: 1, jed: '' },
  { id: 'minZal', naziv: 'ERP naručuje kad zaliha padne ispod (0 = ne naručuje)', v: 0, min: 0, max: 50, korak: 1, jed: 'kom' },
  { id: 'hlOn', naziv: 'Hladnjak: kompresor iznad', v: 6, min: 3, max: 8, korak: 0.5, jed: '°C' },
  { id: 'hlOff', naziv: 'Hladnjak: kompresor stane ispod', v: 4, min: 2, max: 7, korak: 0.5, jed: '°C' },
];

export const KVAROVI = [
  { id: 'robotino', naziv: 'Robotino blokiran (prepreka u hodniku)', opis: 'Robotino stoji na putu do odjela; tabletičari kasne. Rješenje: ukloniti prepreku ili ručna dostava.' },
  { id: 'hladnjakL', naziv: 'Vrata hladnjaka za lijekove ostala otvorena', opis: 'Temperatura u hladnjaku raste iznad 8 °C iako kompresor radi.' },
  { id: 'vaga', naziv: 'Vaga pokazuje pogrešnu masu', opis: 'Vaga ne potvrđuje nijednu tabletu: robot stane kod svake. Uzrok je osjetnik, a ne tablete.' },
];

/* greške pri punjenju: nakon koje tablete, opis, opcije (prva je točna; prikazuju se izmiješane) */
export const GRESKE = {
  krivi: { n: 'Kamera: tableta ne odgovara nalogu', opis: 'Oblik i boja tablete u sisaljci ne odgovaraju lijeku iz naloga — u spremniku je krivi lijek.', opcije: ['Izvadi spremnik, vrati krivi lijek, napuni ispravnim i ponovno skeniraj', 'Preskoči provjeru kamere za ovu tabletu', 'Nastavi — vaga je potvrdila masu'] },
  pala: { n: 'Vaga: masa ne odgovara', opis: 'Tableta je pala pokraj pretinca; vaga ne potvrđuje masu.', opcije: ['Ukloni palu tabletu u otpad i ponovi uzimanje', 'Vrati palu tabletu u pretinac rukom', 'Potvrdi pretinac bez tablete'] },
  prazan: { n: 'Prazan spremnik', opis: 'Spremnik lijeka je prazan.', opcije: ['Dopuni spremnik iz zalihe ljekarne i upiši novu seriju', 'Preskoči ovaj lijek u svim tabletičarima', 'Uzmi tabletu iz drugog spremnika'] },
  rfid: { n: 'RFID: tabletičar krivog pacijenta', opis: 'Na stanici je tabletičar drugog pacijenta.', opcije: ['Zamijeni tabletičar ispravnim i skeniraj RFID pacijenta', 'Nastavi u ovaj tabletičar i kasnije premjesti tablete', 'Isključi čitač RFID-a'] },
};

/* scenariji: odSata, trajanje (h); dogadaji: [sat, vrsta, podaci] */
export const SCENARIJI = [
  { id: 'izdavanje', naziv: 'Dan na odjelu', opis: '8 pacijenata, 4 termina, dvije sestre', odSata: 6, trajanje: 18,
    cilj: 'Tabletičari napunjeni i na odjelu prije 8 h, sve doze izdane na vrijeme, nijedna kriva ni propuštena.',
    provjera: [{ k: 'naOdjelu', op: '<=', v: 8, t: 'tabletičari na odjelu (sat)' }, { k: 'propusteno', op: '<=', v: 0, t: 'propuštenih doza' }, { k: 'krivo', op: '<=', v: 0, t: 'krivih doza' }] },
  { id: 'propisivanje', naziv: 'Propisivanje i nespojivi lijekovi', opis: 'nova terapija za dva pacijenta', odSata: 6, trajanje: 18, dodaj: [['P-101', 'D', [0]], ['P-104', 'C', [2]]],
    cilj: 'U novoj terapiji dva su nespojiva lijeka u istom terminu. U kartici Terapija premjesti lijek u drugi termin prije punjenja (6:00) i provjeri da su sve doze izdane.',
    provjera: [{ k: 'nespojivo', op: '<=', v: 0, t: 'nespojivih parova u istom terminu' }, { k: 'propusteno', op: '<=', v: 0, t: 'propuštenih doza' }] },
  { id: 'punjenje', naziv: 'Greške pri punjenju', opis: 'krivi lijek, pala tableta, prazan spremnik, krivi tabletičar', odSata: 6, trajanje: 18, greske: [[3, 'krivi'], [9, 'pala'], [15, 'prazan'], [20, 'rfid']],
    cilj: 'Robot stane kod svake greške. Odaberi ispravan postupak, potvrdi slobodnu zonu i sigurno ponovno pokreni. Tabletičari moraju stići prije 8 h.',
    provjera: [{ k: 'greskeOk', op: '==', v: true, t: 'sve greške otklonjene ispravnim postupkom' }, { k: 'krivo', op: '<=', v: 0, t: 'krivih doza' }, { k: 'naOdjelu', op: '<=', v: 8, t: 'tabletičari na odjelu (sat)' }] },
  { id: 'dostava', naziv: 'Dostava i hitni nalog', opis: 'prepreka u 7:00, hitni lijek u 10:30', odSata: 6, trajanje: 12, prepreka: 7.0, hitno: 10.5,
    cilj: 'Robotino zastane na prepreci, a u 10:30 stiže hitni nalog dok je Robotino na turi uzoraka. Hitni lijek mora stići za najviše 30 minuta.',
    provjera: [{ k: 'naOdjelu', op: '<=', v: 8, t: 'tabletičari na odjelu (sat)' }, { k: 'hitnaMin', op: '<=', v: 30, t: 'minuta do hitnog lijeka' }] },
  { id: 'propustena', naziv: 'Propuštena doza', opis: 'jedna sestra, prijem novog pacijenta u 7:45', odSata: 6, trajanje: 18, param: { sestre: 1 }, zadaci: [[7.75, 'Prijem novog pacijenta', 75]],
    cilj: 'Sestra je zauzeta prijemom kad dospijevaju jutarnje doze. Postavi alarm i eskalaciju dežurnom tako da nijedna doza ne bude propuštena.',
    provjera: [{ k: 'propusteno', op: '<=', v: 0, t: 'propuštenih doza' }, { k: 'kasno', op: '<=', v: 0, t: 'doza izdanih kasnije od 60 min' }] },
  { id: 'serija', naziv: 'Povlačenje serije', opis: 'obavijest u 14:00', odSata: 6, trajanje: 12, povlacenje: { sat: 14, serija: 'B-2402' },
    cilj: 'U 14 h proizvođač povlači seriju B-2402. Iz zapisa MES-a pronađi pacijente koji su dobili tu seriju i prijavi ih.',
    provjera: [{ k: 'serijaOk', op: '==', v: true, t: 'točno prijavljeni pacijenti' }] },
  { id: 'nestasica', naziv: 'Nestašica lijeka', opis: 'Lijeka C ima 6 tableta', odSata: 6, trajanje: 18, zalihe: { C: [['C-2398', 6]] },
    cilj: 'Lijeka C dovoljno je samo za danas. Postavi ERP da predloži narudžbu ili naruči ručno, tako da do kraja dana zaliha pokrije i sutrašnju terapiju.',
    provjera: [{ k: 'propusteno', op: '<=', v: 0, t: 'propuštenih doza' }, { k: 'zaliheSutra', op: '==', v: true, t: 'zaliha (s narudžbom) pokriva sutrašnju terapiju' }] },
  { id: 'noc', naziv: 'Noćna smjena', opis: 'jedna sestra, tri alarma odjednom', odSata: 21.5, trajanje: 3, param: { sestre: 1 }, naOdjelu: true,
    alarmi: [[22.1, 'P-101', 'poziv'], [22.12, 'P-103', 'pad'], [22.14, 'P-106', 'spo2']],
    cilj: 'U 22 h dospijevaju doze, a zatim se javljaju poziv, pad i pad saturacije. Pad treba reakciju do 3 min, saturacija do 5 min.',
    provjera: [{ k: 'reakPad', op: '<=', v: 3, t: 'reakcija na pad (min)' }, { k: 'reakSpo2', op: '<=', v: 5, t: 'reakcija na saturaciju (min)' }, { k: 'propusteno', op: '<=', v: 0, t: 'propuštenih doza' }] },
  { id: 'psihijatrija', naziv: 'Psihijatrijski odjel', opis: 'nadzirano uzimanje, stroža evidencija, odbijanje', odSata: 6, trajanje: 18, odbija: { pac: 'P-105', termin: 0 },
    cilj: 'Na psihijatriji lijek mora biti stvarno uzet, za Lijek H vrijedi stroža evidencija, a pacijentica P-105 u 8 h odbije terapiju — upiši odluku.',
    provjera: [{ k: 'nadziranoSve', op: '==', v: true, t: 'sve doze uzete pod nadzorom' }, { k: 'kontroliraniOk', op: '==', v: true, t: 'Lijek H s drugim potpisom' }, { k: 'odbijanjeOk', op: '==', v: true, t: 'odbijanje ispravno upisano' }] },
];
export const ODBIJANJE = ['Upiši odbijanje i obavijesti liječnika', 'Ostavi lijek na noćnom ormariću', 'Upiši dozu kao uzetu'];
