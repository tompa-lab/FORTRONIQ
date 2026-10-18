/* FORTRONIQ · Mitsubishi Movemaster EX RV-M1 — niz vježbi (podaci odvojeni od stranice).
   Čitaju: vjezbe-s-robotom.html (vjezbe.js), upravljanje-robotom.html?vjezba=<id> (upravljanje.js), test/test_vjezbe.mjs.
   Čista datoteka bez uvoza: radi u pregledniku i u Node-u. Brojeve robota (granice osi, brzine, RS-232C, brojke na tipkama,
   pogreške, raspored palete) NE upisuj ovdje — polje `dodatak` traži od stranice da ih prikaže iz rvm1_podaci.js.

   KAKO SE MIJENJA / DOPUNJUJE
   - Nova ili zamjenska vježba = jedan objekt u VJEZBE (redoslijed u nizu = redoslijed na stranici; id 'v01'…).
   - Pozicije su u KS robota kao na robotu: X, Y, Z [mm] vrha alata, P, R [°], oc 'O'|'C' (stanje prihvatnice uz poziciju).
     Sve pozicije su dohvatljive s trenutnim MJERAMA (d1 pp 250 mm) — provjerava test/test_vjezbe.mjs; nakon izmjere d1
     pokreni test, a pozicije koje padnu pomakni (ili ih nauči na pravom robotu i upiši ovdje).
   - Program je tekst s brojevima redaka, točno kako se šalje robotu; komentari samo ASCII (veza RS-232C je 7-bitna).
   - Naredbe PD, MP, MJ, DL rade samo izravno (ne u programu) — pozicije zato učitava `pripremaNaredbe(v)` naredbama GF + PD.

   POLJA VJEŽBE
   { id, naslov, cilj, tezina 1|2|3, trajanje [min], oprema:[ključ iz OPREMA], kljucno:[naredbe/tipke koje se uvode],
     uvod, dodatak?: 'pogreskeI'|'granice'|'brojke'|'rs232'|'prihvatnica'|'paleta'|'rukovanje'|'memorija' (tablica iz rvm1_podaci.js),
     koraci:[{ tekst, naredba?, provjera?, sim?:[[akcija, …argumenti]], greska?: 0|1|2 (očekivano stanje nakon koraka),
               ocekuj?:{ zaslon?, led?, odgovor? } (provjera za test: zaslon privjeska, LED-ica uzroka, posljednji odgovor robota) }],
     program: string | null, pocetno:{ pozicije:{ n:{x,y,z,p,r,oc,naziv} }, tl?, sp?, ulazi? },
     simRV?:[{ bit, smjer:'ulaz'|'izlaz', opis }],
     scenariji?:[{ naziv, dogadaji:[{ kad:{nakon:s}|{redak:n}|{izlaz:b,v}|{signal:'RDY'|'BUSY',v}, ulaz:b|'STB'|'ACK', v, opis }], ocekuj?:{ izlazi?, brojila? } }],
     pitanja:[{ p, odgovori:[…], tocan (indeks), obj (objašnjenje) }], prosirenje, sigurnost:[…], napomena? }
   Akcije u `sim` (izvodi ih test; može ih koristiti i simulator za vođeni način):
     ['ukljuci'] ['iskljuci'] ['privjesak', bool] ['tipke', id…] (pritisni i otpusti redom, zatim čekaj kraj gibanja)
     ['drzi', id, s] (ručno vođenje s tipke) ['emg', 'dum1'|'privjesak', bool] ['pc', tekst] (naredba s računala, čekaj kraj)
     ['ucitaj'] (pripremaNaredbe) ['rn', indeksScenarija?] (pokreni program i čekaj kraj) ['rnBez'] (pokreni, ne čekaj)
     ['cekaj', s] ['cekajKraj'] ['stop'] ['start'] ['reset'] ['ulaz', bit|'STB'|'ACK', 0|1]
   © ForTroniQ d.o.o. */

/* ================================================================== oznake */
export const TEZINE = { 1: 'osnovna', 2: 'srednja', 3: 'zahtjevna' };

export const OPREMA = {
  robot: 'robot RV-M1',
  DUM1: 'upravljačka jedinica DUM1',
  privjesak: 'privjesak za učenje',
  PC: 'računalo s RS-232C',
  'SIM RV': 'simulator ulaza i izlaza SIM RV',
  prihvatnica: 'motorna prihvatnica',
  predmet: 'predmet za hvatanje (npr. kocka 30 mm)',
  olovka: 'flomaster u držaču i papir',
  kucista: 'kućišta cilindra Ø40 mm (crno, crveno, metalno)',
  stanica: 'robotska stanica linije MPS'
};

/* ================================================================== pomoćne funkcije za podatke */
const P = (x, y, z, naziv, p = -90, r = 0, oc = 'O') => ({ x, y, z, p, r, oc, naziv });
const POMAK = (dz, naziv = 'pomak prilaza (samo Z)') => ({ x: 0, y: 0, z: dz, p: 0, r: 0, oc: 'O', naziv });
const r01 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
/** točke kružnice za MC: od pozicije `prva`, n dijelova (n + 1 točaka, zadnja = prva), središte (cx, cy), polumjer rr, visina z */
function kruznica(prva, n, cx, cy, rr, z) {
  const o = {};
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    o[prva + i] = P(r01(cx + rr * Math.cos(t)), r01(cy + rr * Math.sin(t)), z, i === 0 ? 'kružnica: početak' : i === n ? 'kružnica: kraj (= početak)' : 'kružnica, točka ' + i);
  }
  return o;
}

/* ================================================================== zajedničke sigurnosne napomene (stranica ih prikazuje uz svaku vježbu) */
export const SIGURNOST_OPCENITO = [
  'Prije uključenja pregledaj radni prostor: u dosegu ruke nema ljudi, alata ni kabela; robot je pričvršćen na čeličnu ploču.',
  'EMG STOP na DUM1 i na privjesku mora biti na dohvat ruke cijelo vrijeme dok je servo uključen.',
  'Nakon svakog uključenja najprije NEST; prve probe novog programa uvijek malom brzinom (SP 1–3).',
  'Pozicije iz vježbi izračunate su u simulatoru: na pravom robotu prvo ih provjeri tipkom MOV (ili korak po korak tipkom STEP) i po potrebi ponovno nauči.',
  'Ne posežeš u radni prostor dok robot izvodi program; za pristup zaustavi program (STOP), a za opasnost pritisni EMG STOP.',
  'Kočnice imaju samo J2 i J3 — bez napajanja J1, J4 i J5 se mogu pomaknuti rukom, a prihvatnica gubi silu držanja.'
];

/* ================================================================== VJEŽBE */
export const VJEZBE = [
  /* ------------------------------------------------------------ 1 */
  {
    id: 'v01', naslov: 'Uključenje, NEST i STOP u nuždi', tezina: 1, trajanje: 30,
    cilj: 'Sigurno uključiti robot, napraviti NEST privjeskom, zaustaviti robot tipkom EMG STOP i poništiti pogrešku I. vrste.',
    oprema: ['robot', 'DUM1', 'privjesak'],
    kljucno: ['POWER', 'privjesak ON/OFF', 'NST, ENT', 'EMG STOP', 'pogreška I'],
    uvod: 'Osi robota RV-M1 mjere položaj inkrementalnim enkoderima: nakon uključenja upravljačka jedinica DUM1 ne zna gdje je ruka. Zato je prvi posao nakon svakog uključenja NEST — traženje mehaničkog ishodišta graničnim prekidačima i Z-fazom enkodera, najprije J2, J3 i J4, zatim J1 i J5. Dok NEST nije gotov, naredbe gibanja završavaju pogreškom II. vrste. STOP u nuždi (EMG STOP na DUM1, na privjesku ili vanjski) isključuje servo napajanje i koči J2 i J3; to je pogreška I. vrste i poništava se samo isključenjem i ponovnim uključenjem DUM1 te novim NEST-om. Uzrok pogreške I. vrste pokazuje jedna od LED-ica LED1–LED5 iza bočnih vrata DUM1.',
    dodatak: 'pogreskeI',
    koraci: [
      { tekst: 'Pregledaj radni prostor i spojeve: kabeli POWER i SIGNAL između robota i DUM1 su spojeni, privjesak je priključen, preklopnik HAND na stražnjoj ploči DUM1 je na DC (motorna prihvatnica).', provjera: 'EMG STOP na DUM1 i na privjesku je otpušten; u dosegu ruke nema ničega.' },
      { tekst: 'Uključi DUM1 mrežnim preklopnikom.', naredba: 'POWER ON', provjera: 'Svijetli žuta LED POWER; ERROR ne svijetli.', sim: [['ukljuci']] },
      { tekst: 'Prebaci privjesak na ON.', naredba: 'privjesak ON', provjera: 'Tipke privjeska su aktivne, zaslon je prazan.', sim: [['privjesak', true]] },
      { tekst: 'Ako je ruka blizu graničnika ili predmeta, odmakni je u PTP načinu (prije NEST-a dopušteno je samo vođenje po zglobovima). Zatim pokreni NEST.', naredba: 'NST, ENT', provjera: 'Svijetli zelena EXECUTE; robot najprije pomiče rame, lakat i nagib šake, zatim struk i okret. Kad je gotovo, na zaslonu je „-”.', sim: [['tipke', 'NST', 'ENT']] },
      { tekst: 'Pritisni EMG STOP na privjesku.', naredba: 'EMG STOP (privjesak)', provjera: 'ERROR trepće, zujalo prati treptanje, servo je isključen. Iza bočnih vrata DUM1 svijetli LED4.', sim: [['emg', 'privjesak', true]], greska: 1, ocekuj: { led: 'LED4' } },
      { tekst: 'Pokušaj ponovno pokrenuti NEST i pritisni RESET na DUM1.', naredba: 'NST, ENT · RESET', provjera: 'Ništa se ne događa: pogreška I. vrste ne poništava se tipkom RESET ni naredbom RS.', sim: [['tipke', 'NST', 'ENT'], ['reset']], greska: 1 },
      { tekst: 'Otpusti EMG STOP (zakreni gljivu), isključi DUM1, pričekaj nekoliko sekundi i ponovno ga uključi.', naredba: 'EMG STOP otpusti · POWER OFF · POWER ON', provjera: 'POWER svijetli, ERROR ne svijetli. Položaj ruke opet nije poznat.', sim: [['emg', 'privjesak', false], ['iskljuci'], ['ukljuci']] },
      { tekst: 'Ponovno napravi NEST.', naredba: 'NST, ENT', provjera: 'EXECUTE svijetli dok traje NEST; robot je spreman za rad.', sim: [['tipke', 'NST', 'ENT']] },
      { tekst: 'Prebaci privjesak na OFF i isključi DUM1.', naredba: 'privjesak OFF · POWER OFF', sim: [['privjesak', false], ['iskljuci']] }
    ],
    program: null,
    pocetno: { pozicije: {} },
    pitanja: [
      { p: 'Zašto je NEST obvezan nakon svakog uključenja?', odgovori: ['Osi mjere položaj inkrementalnim enkoderima, pa DUM1 nakon uključenja ne zna položaj ruke.', 'Bez NEST-a se ne uključuje servo napajanje.', 'NEST puni bateriju memorije.', 'NEST briše program iz memorije.'], tocan: 0, obj: 'Inkrementalni enkoder broji impulse od nekog početka; taj početak (mehaničko ishodište) treba ponovno pronaći nakon svakog uključenja.' },
      { p: 'Kojim redom NEST traži ishodište?', odgovori: ['J1, J2, J3, J4, J5', 'najprije J2, J3 i J4, zatim J1 i J5', 'J5, J4, J3, J2, J1', 'sve osi istodobno'], tocan: 1, obj: 'Najprije se ruka podigne i složi (rame, lakat, nagib), a tek onda se okreću struk i šaka — tako je manja opasnost od sudara s okolinom.' },
      { p: 'Kako se poništava pogreška I. vrste nakon EMG STOP?', odgovori: ['tipkom RESET na DUM1', 'naredbom RS s računala', 'otpustiti EMG STOP, isključiti i uključiti DUM1, zatim NEST', 'tipkom START'], tocan: 2, obj: 'RESET i RS poništavaju samo pogrešku II. vrste. Pogreška I. vrste isključi servo, pa je potrebno novo uključenje i novi NEST.' },
      { p: 'Po čemu na prednjoj ploči DUM1 razlikuješ pogrešku I. od pogreške II. vrste?', odgovori: ['I: ERROR trepće; II: ERROR svijetli stalno', 'I: svijetli EXECUTE; II: svijetli POWER', 'po prednjoj ploči se ne razlikuju', 'I: zujalo zvuči neprekidno; II: isprekidano'], tocan: 0, obj: 'Kod pogreške I. vrste ERROR trepće (0,5 s) i zujalo prati treptanje; kod II. vrste ERROR svijetli stalno, a zujalo zvuči neprekidno.' }
    ],
    prosirenje: 'Pokreni NEST i usred traženja pritisni EMG STOP na DUM1 (ne na privjesku). Koja LED-ica iza bočnih vrata sada svijetli i zašto? Zapiši postupak ponovnog pokretanja kao kratku uputu od pet koraka koju bi zalijepio na DUM1.',
    sigurnost: [
      'NEST giba sve osi bez provjere prepreka: prije NST, ENT ukloni predmete iz radnog prostora.',
      'Nakon EMG STOP J2 i J3 koče, ali J1, J4 i J5 nemaju kočnicu — ne oslanjaj se na ruku robota.',
      'Privjesak ne spajaj i ne odspajaj dok je DUM1 uključen (to je također uzrok pogreške I. vrste).'
    ]
  },

  /* ------------------------------------------------------------ 2 */
  {
    id: 'v02', naslov: 'Ručno vođenje: PTP, XYZ i TOOL', tezina: 1, trajanje: 40,
    cilj: 'Voditi robot privjeskom po zglobovima, u kartezijskom sustavu i u smjeru alata te prepoznati granice osi i dosega.',
    oprema: ['robot', 'DUM1', 'privjesak'],
    kljucno: ['PTP', 'XYZ', 'TOOL', 'B S E P R', 'O / C'],
    uvod: 'Privjesak giba robot na tri načina. U PTP načinu svaka tipka okreće jedan zglob: oznake B, S, E, P i R na tipkama znače struk (J1), rame (J2), lakat (J3), nagib šake (J4) i okret šake (J5). U XYZ načinu vrh alata (TCP) ide po pravcu duž osi X, Y i Z koordinatnog sustava robota, a tipke P i R naginju i okreću šaku oko vrha alata. U TOOL načinu tipke Z+ i Z− vode vrh alata naprijed i natrag u smjeru alata. Robot ima pet osi: vrh alata uvijek leži u okomitoj ravnini kroz os struka, pa se kod pomaka po Y alat ujedno zakreće oko okomite osi — punu orijentaciju u prostoru ne može zadržati. Kad zglob dođe do granice ili vrh alata do ruba dosega, gibanje s privjeska stane.',
    dodatak: 'granice',
    koraci: [
      { tekst: 'Uključi DUM1, prebaci privjesak na ON i napravi NEST (vježba 1).', naredba: 'POWER ON · privjesak ON · NST, ENT', sim: [['ukljuci'], ['privjesak', true], ['tipke', 'NST', 'ENT']] },
      { tekst: 'Odaberi način PTP. Drži B+ (tipka X+/B+), zatim B−, i promatraj struk.', naredba: 'PTP · B+ · B−', provjera: 'Okreće se samo J1; ostali zglobovi miruju.', sim: [['tipke', 'PTP'], ['drzi', 'X+', 1], ['drzi', 'X-', 1]] },
      { tekst: 'Isto ponovi s ramenom (S±), laktom (E±), nagibom (P±) i okretom (R±). Zapiši za svaki zglob kamo ga giba tipka „+”.', naredba: 'S− S+ · E+ E− · P+ P− · R−', provjera: 'Svaka tipka okreće jedan zglob.', sim: [['drzi', 'Y-', 0.5], ['drzi', 'Y+', 0.5], ['drzi', 'Z+', 0.5], ['drzi', 'Z-', 0.5], ['drzi', 'P+', 0.5], ['drzi', 'P-', 0.5], ['drzi', 'R-', 1]] },
      { tekst: 'Drži B+ dok struk ne dođe do granice osi.', naredba: 'B+ (drži)', provjera: 'Gibanje stane na granici osi; robot se nakon toga normalno giba u suprotnom smjeru.', sim: [['drzi', 'X+', 6]] },
      { tekst: 'Vrati struk tipkom B− otprilike u sredinu raspona.', naredba: 'B− (drži)', sim: [['drzi', 'X-', 4]] },
      { tekst: 'Odaberi način XYZ. Drži X+, zatim Z−; nakon toga Y+ i Y−.', naredba: 'XYZ · X+ · Z− · Y+ · Y−', provjera: 'Vrh alata ide po pravcu, a gibaju se istodobno svi potrebni zglobovi. Kod Y± se zakreće i struk.', sim: [['tipke', 'XYZ'], ['drzi', 'X+', 1.5], ['drzi', 'Z-', 1], ['drzi', 'Y+', 1], ['drzi', 'Y-', 1]] },
      { tekst: 'U XYZ načinu drži P+ pa P−.', naredba: 'P+ · P−', provjera: 'Šaka se naginje, a vrh alata ostaje na mjestu (nagib oko TCP-a).', sim: [['drzi', 'P+', 0.5], ['drzi', 'P-', 0.5]] },
      { tekst: 'Odaberi način TOOL i drži Z−, zatim Z+.', naredba: 'TOOL · Z− · Z+', provjera: 'Vrh alata ide natrag i naprijed u smjeru alata — kad alat gleda prema dolje, to je gore i dolje.', sim: [['tipke', 'TOOL'], ['drzi', 'Z-', 0.6], ['drzi', 'Z+', 0.6]] },
      { tekst: 'Zatvori i otvori prihvatnicu tipkama C i O.', naredba: 'C · O', provjera: 'Prsti se zatvore i otvore; stanje prihvatnice ne ovisi o načinu vođenja.', sim: [['tipke', 'C'], ['tipke', 'O']] },
      { tekst: 'Prebaci privjesak na OFF.', naredba: 'privjesak OFF', sim: [['privjesak', false]] }
    ],
    program: null,
    pocetno: { pozicije: {} },
    pitanja: [
      { p: 'Što na privjesku znači oznaka E uz tipke Z+ i Z−?', odgovori: ['lakat (J3) u PTP načinu', 'kraj programa', 'enkoder', 'okret šake'], tocan: 0, obj: 'B, S, E, P, R su početna slova engleskih naziva osi: base/waist, shoulder, elbow, pitch, roll.' },
      { p: 'U XYZ načinu tipka P+…', odgovori: ['naginje šaku oko vrha alata', 'pomiče vrh alata po osi P', 'okreće struk', 'otvara prihvatnicu'], tocan: 0, obj: 'U XYZ načinu tipke P i R mijenjaju orijentaciju alata, a vrh alata (TCP) ostaje na mjestu.' },
      { p: 'Robot ima pet osi. Što to znači za ručno vođenje u XYZ načinu?', odgovori: ['Kad se mijenja J1, alat se zakreće oko okomite osi — punu orijentaciju alata u prostoru nije moguće držati.', 'Robot se ne može gibati po osi Y.', 'XYZ način radi samo sa zatvorenom prihvatnicom.', 'Nema razlike prema robotu sa šest osi.'], tocan: 0, obj: 'Vrh alata leži u okomitoj ravnini kroz os J1; nedostaje šesta os koja bi alat zakrenula neovisno o struku.' },
      { p: 'Kojim načinom spuštaš vrh alata točno okomito na predmet kad alat gleda prema dolje?', odgovori: ['XYZ (Z−) ili TOOL (Z+)', 'PTP (E−)', 'PTP (S−)', 'tipkom ORG'], tocan: 0, obj: 'U PTP načinu jedan zglob opisuje luk; po pravcu vode samo XYZ i TOOL.' }
    ],
    prosirenje: 'Dovedi vrh alata u PTP načinu što bliže stolu ispred robota, a zatim isti položaj pokušaj postići u XYZ načinu. Zapiši koji je način brži za grubo, a koji za fino dovođenje i zašto.',
    sigurnost: [
      'Ručno vođenje počni kratkim pritiscima tipke dok ne provjeriš smjer gibanja.',
      'U XYZ načinu se može istodobno gibati više zglobova — prati cijelu ruku, ne samo vrh alata.'
    ]
  },

  /* ------------------------------------------------------------ 3 */
  {
    id: 'v03', naslov: 'Učenje točaka privjeskom', tezina: 1, trajanje: 40,
    cilj: 'Naučiti, provjeriti, ispraviti i obrisati pozicije privjeskom (P.S, MOV, INC, DEC, P.C).',
    oprema: ['robot', 'DUM1', 'privjesak'],
    kljucno: ['P.S', 'MOV', 'INC', 'DEC', 'P.C'],
    uvod: 'Pozicija je točka spremljena pod brojem 1–629: koordinate vrha alata X, Y, Z, nagib P, okret R i stanje prihvatnice. Slijed P.S, broj, ENT sprema trenutni položaj, MOV, broj, ENT giba robot na poziciju brzinom SP 4, INC i DEC idu na poziciju s brojem za 1 većim ili manjim od posljednje, a P.C, broj, ENT briše poziciju. Brojke se upisuju tipkama gibanja (svaka ima uz natpis i brojku). Zaslon pokazuje „-” kad je postupak u tijeku ili gotov, a „!” kad se ne može izvesti.',
    dodatak: 'brojke',
    koraci: [
      { tekst: 'Uključi DUM1, privjesak ON, NEST.', naredba: 'POWER ON · privjesak ON · NST, ENT', sim: [['ukljuci'], ['privjesak', true], ['tipke', 'NST', 'ENT']] },
      { tekst: 'U XYZ načinu dovedi vrh alata ispred robota i spusti ga (X+, zatim Z−), pa zatvori prihvatnicu.', naredba: 'XYZ · X+ · Z− · C', sim: [['tipke', 'XYZ'], ['drzi', 'X+', 2], ['drzi', 'Z-', 1.5], ['tipke', 'C']] },
      { tekst: 'Spremi položaj kao poziciju 1.', naredba: 'P.S, 1, ENT', provjera: 'Zaslon pokaže „-001”.', sim: [['tipke', 'P.S', '1', 'ENT']], ocekuj: { zaslon: '-001' } },
      { tekst: 'Pomakni vrh alata ulijevo (Y+, oko 50 mm), otvori prihvatnicu i spremi poziciju 2.', naredba: 'Y+ · O · P.S, 2, ENT', provjera: 'Zaslon pokaže „-002”.', sim: [['drzi', 'Y+', 1], ['tipke', 'O'], ['tipke', 'P.S', '2', 'ENT']], ocekuj: { zaslon: '-002' } },
      { tekst: 'Pomakni robot bilo kamo (npr. PTP, B−) i provjeri poziciju 1.', naredba: 'PTP · B− · MOV, 1, ENT', provjera: 'Robot se zglobnom interpolacijom giba u poziciju 1 i na kraju zatvori prihvatnicu — stanje prihvatnice spremljeno je uz poziciju.', sim: [['tipke', 'PTP'], ['drzi', 'X-', 1], ['tipke', 'MOV', '1', 'ENT']] },
      { tekst: 'Idi na sljedeću pa na prethodnu poziciju.', naredba: 'INC, ENT · DEC, ENT', provjera: 'INC vodi na poziciju 2, DEC natrag na 1.', sim: [['tipke', 'INC', 'ENT'], ['tipke', 'DEC', 'ENT']] },
      { tekst: 'Ispravi poziciju 2: idi na nju, spusti vrh alata malo niže (XYZ, Z−) i spremi je pod isti broj.', naredba: 'INC, ENT · XYZ · Z− · P.S, 2, ENT', provjera: 'Stara pozicija 2 je prepisana.', sim: [['tipke', 'INC', 'ENT'], ['tipke', 'XYZ'], ['drzi', 'Z-', 0.4], ['tipke', 'P.S', '2', 'ENT']] },
      { tekst: 'Obriši poziciju 2 i pokušaj se na nju gibati.', naredba: 'P.C, 2, ENT · MOV, 2, ENT', provjera: 'Zaslon pokaže „!002”: pozicija 2 ne postoji i robot se ne giba.', sim: [['tipke', 'P.C', '2', 'ENT'], ['tipke', 'MOV', '2', 'ENT']], ocekuj: { zaslon: '!002' } },
      { tekst: 'Prebaci privjesak na OFF.', naredba: 'privjesak OFF', sim: [['privjesak', false]] }
    ],
    program: null,
    pocetno: { pozicije: {} },
    pitanja: [
      { p: 'Što se sprema slijedom P.S, broj, ENT?', odgovori: ['X, Y, Z, P, R vrha alata i stanje prihvatnice', 'samo kutovi J1–J5', 'cijeli program', 'brzina SP'], tocan: 0, obj: 'Pozicija je kartezijska točka vrha alata s orijentacijom i stanjem prihvatnice; kutove zglobova upravljač izračuna pri gibanju.' },
      { p: 'Kojom brzinom robot izvodi MOV s privjeska?', odgovori: ['SP 4', 'SP 9', 'brzinom posljednje naredbe SP iz programa', 'SP 0'], tocan: 0, obj: 'MOV s privjeska uvijek giba brzinom SP 4.' },
      { p: 'Što znači znak „!” na prvom mjestu zaslona privjeska?', odgovori: ['postupak se ne može izvesti', 'postupak je u tijeku', 'pogreška I. vrste', 'baterija je prazna'], tocan: 0, obj: 'Npr. MOV na obrisanu poziciju ili P.S prije NEST-a.' },
      { p: 'Robot je posljednji put bio na poziciji 7. Kamo ga vodi INC, ENT?', odgovori: ['na poziciju 8', 'na poziciju 1', 'na poziciju 6', 'u ishodište'], tocan: 0, obj: 'INC i DEC idu od pozicije na kojoj je robot posljednji put bio, za 1 gore ili dolje.' }
    ],
    prosirenje: 'Nauči pet pozicija (1–5) duž ruba lista papira na stolu i prođi ih redom tipkom INC. Koliko je najveće odstupanje vrha alata od ruba papira kad ga provjeriš MOV-om nakon ponovnog uključenja i NEST-a?',
    sigurnost: [
      'MOV giba zglobnom interpolacijom: putanja nije pravac i može zahvatiti predmete između dviju pozicija.',
      'Prije MOV-a na novu poziciju pogledaj gdje je ruka i ima li prepreka na putu.'
    ]
  },

  /* ------------------------------------------------------------ 4 */
  {
    id: 'v04', naslov: 'Prve naredbe s računala', tezina: 1, trajanje: 45,
    cilj: 'Slati naredbe s računala (NT, PD, SP, MO, MP, HE, WH, PR), pročitati odgovore robota i napisati prvi program.',
    oprema: ['robot', 'DUM1', 'privjesak', 'PC'],
    kljucno: ['NT', 'PD', 'SP', 'MO', 'MP', 'HE', 'WH', 'PR', 'RN', 'ED'],
    uvod: 'Računalo je s DUM1 povezano serijskom vezom RS-232C. Naredba se sastoji od dva slova i argumenata odvojenih zarezom, a završava znakom CR. Bez broja retka naredba se izvede odmah (izravno); s brojem retka (npr. „20 MO 1”) upiše se u program, koji se pokreće naredbom RN. Naredbe PD, MP, MJ i DL izvode se samo izravno. Dok je privjesak ON, DUM1 ne prima naredbe s računala. Veza je 7-bitna, zato komentare u programu piši bez dijakritičkih znakova.',
    dodatak: 'rs232',
    koraci: [
      { tekst: 'Spoji računalo kabelom RS-232C s DUM1 i otvori terminal (ili simulator). Uključi DUM1, privjesak je OFF.', naredba: 'POWER ON · privjesak OFF', sim: [['ukljuci']] },
      { tekst: 'Pošalji NEST s računala.', naredba: 'NT', provjera: 'Robot traži ishodište kao kod NST, ENT; svijetli EXECUTE.', sim: [['pc', 'NT']] },
      { tekst: 'Pročitaj trenutni položaj.', naredba: 'WH', provjera: 'Robot vrati X, Y, Z, P, R vrha alata, npr. „+157.6,+0.0,+293.2,-90.0,+179.9” (zapis u simulatoru).', sim: [['pc', 'WH']] },
      { tekst: 'Definiraj pozicije 1 i 2 koordinatama.', naredba: 'PD 1, 300, 0, 100, -90, 0\nPD 2, 300, 100, 60, -90, 0', provjera: 'Robot se ne giba; pozicije su samo upisane.', sim: [['pc', 'PD 1, 300, 0, 100, -90, 0'], ['pc', 'PD 2, 300, 100, 60, -90, 0']] },
      { tekst: 'Postavi malu brzinu i idi na poziciju 1, zatim pročitaj položaj.', naredba: 'SP 2\nMO 1\nWH', provjera: 'WH vrati „+300.0,+0.0,+100.0,-90.0,+0.0”.', sim: [['pc', 'SP 2'], ['pc', 'MO 1'], ['pc', 'WH']], ocekuj: { odgovor: '+300.0,+0.0,+100.0,-90.0,+0.0' } },
      { tekst: 'Idi na poziciju 2, zatim izravno na zadane koordinate (bez spremanja) i taj položaj spremi kao poziciju 3.', naredba: 'MO 2\nMP 280, -60, 80, -90, 0\nHE 3\nPR 3', provjera: 'PR 3 vrati koordinate zadane u MP.', sim: [['pc', 'MO 2'], ['pc', 'MP 280, -60, 80, -90, 0'], ['pc', 'HE 3'], ['pc', 'PR 3']], ocekuj: { odgovor: '+280.0,-60.0,+80.0,-90.0,+0.0' } },
      { tekst: 'Pošalji točku izvan dosega i pročitaj stanje pogreške, a zatim je poništi.', naredba: 'MP 600, 0, 0, -90, 0\nER\nRS', provjera: 'ERROR svijetli stalno (pogreška II. vrste), ER vrati 2; nakon RS ER vrati 0.', sim: [['pc', 'MP 600, 0, 0, -90, 0']], greska: 2 },
      { tekst: 'Poništi pogrešku.', naredba: 'RS', sim: [['pc', 'ER'], ['pc', 'RS'], ['pc', 'ER']], ocekuj: { odgovor: '0' } },
      { tekst: 'Upiši program (redak po redak, sa brojevima redaka) i pokreni ga.', naredba: 'RN', provjera: 'Robot obiđe pozicije 1, 2, 3 i vrati se na 1; EXECUTE svijetli dok program traje.', sim: [['ucitaj'], ['rn']] }
    ],
    program: `10 ' prvi program
20 SP 3
30 MO 1
40 MO 2
50 MO 3
60 MO 1
70 ED`,
    pocetno: { pozicije: { 1: P(300, 0, 100, 'prva točka'), 2: P(300, 100, 60, 'druga točka'), 3: P(280, -60, 80, 'treća točka (u vježbi je spremaš naredbom HE)') } },
    pitanja: [
      { p: 'Što se dogodi s naredbom „20 MO 1” poslanom s računala?', odgovori: ['upiše se u program kao redak 20', 'robot se odmah giba na poziciju 1', 'robot se giba na poziciju 20', 'javlja pogrešku II. vrste'], tocan: 0, obj: 'Broj na početku je broj retka: naredba se sprema u program i izvodi se tek nakon RN.' },
      { p: 'Koja od ovih naredbi radi samo izravno, a ne u programu?', odgovori: ['PD', 'MO', 'SP', 'HE'], tocan: 0, obj: 'PD, MP, MJ i DL izvode se samo izravno; za pozicije u programu koristi HE ili ih definiraj prije pokretanja.' },
      { p: 'Što vraća naredba WH?', odgovori: ['trenutni položaj vrha alata (X, Y, Z, P, R)', 'stanje pogreške', 'broj trenutnog retka programa', 'stanje ulaza'], tocan: 0, obj: 'WH (Where) šalje položaj vrha alata; PR a šalje spremljenu poziciju a, ER stanje pogreške.' },
      { p: 'Zašto u komentarima programa ne pišeš č, ć, š, ž, đ?', odgovori: ['veza RS-232C je 7-bitna i prenosi samo osnovne ASCII znakove', 'DUM1 ne prima komentare', 'komentar mora biti velikim slovima', 'zbog brzine 9600 Bd'], tocan: 0, obj: 'Sa 7 podatkovnih bita prenose se samo ASCII znakovi; dijakritički znakovi bi se izobličili.' }
    ],
    prosirenje: 'Dodaj u program redak koji na kraju vraća robot u položaj iz kojeg je krenuo: prije pokretanja spremi trenutni položaj naredbom HE 4 i dodaj „65 MO 4”. Provjeri naredbom LR 65 što je upisano.',
    sigurnost: [
      'Prije prve naredbe gibanja s računala provjeri da je EMG STOP na dohvat ruke i da je brzina SP 1–3.',
      'Točku zadanu brojevima (PD, MP) prvi put prilazi odozgo i polako — tipfeler u koordinati može značiti sudar sa stolom.'
    ]
  },

  /* ------------------------------------------------------------ 5 */
  {
    id: 'v05', naslov: 'Prihvatnica: GO, GC, GP i O/C', tezina: 2, trajanje: 35,
    cilj: 'Upravljati motornom prihvatnicom naredbama GO, GC i GP te parametrom O/C uz naredbe gibanja i spremljenim stanjem uz poziciju.',
    oprema: ['robot', 'DUM1', 'privjesak', 'PC', 'prihvatnica', 'predmet'],
    kljucno: ['GO', 'GC', 'GP', 'GF', 'MO a, O/C', 'TI'],
    uvod: 'Motorna prihvatnica zatvara se najprije početnom silom kroz zadano vrijeme, a zatim drži predmet manjom silom držanja: GP s, r, t zadaje početnu silu s, silu držanja r i vrijeme t (× 0,1 s). GO otvara, GC zatvara prihvatnicu. Uz naredbe gibanja (MO, MA, MS, MT, MC) parametar O ili C otvara ili zatvara prihvatnicu na kraju gibanja; bez njega prihvatnica poprima stanje spremljeno uz poziciju. Kod pozicija definiranih naredbom PD to stanje zadaje zastavica GF (0 otvorena, 1 zatvorena).',
    dodatak: 'prihvatnica',
    koraci: [
      { tekst: 'Uključi DUM1 i napravi NEST s računala. Učitaj pozicije (blok „Priprema”) i program.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Privjeskom zatvori i otvori prihvatnicu, zatim privjesak prebaci na OFF.', naredba: 'privjesak ON · C · O · privjesak OFF', sim: [['privjesak', true], ['tipke', 'C'], ['tipke', 'O'], ['privjesak', false]] },
      { tekst: 'Definiraj poziciju 3 sa spremljenim stanjem „zatvoreno” i idi na nju.', naredba: 'GF 1\nPD 3, 300, -100, 40, -90, 0\nGF 0\nMO 3', provjera: 'Na kraju gibanja prihvatnica se zatvori, iako u MO nema parametra C.', sim: [['pc', 'GF 1'], ['pc', 'PD 3, 300, -100, 40, -90, 0'], ['pc', 'GF 0'], ['pc', 'MO 3']] },
      { tekst: 'Idi na poziciju 1 i otvori prihvatnicu na kraju gibanja.', naredba: 'MO 1, O', provjera: 'Parametar O ima prednost pred stanjem spremljenim uz poziciju.', sim: [['pc', 'MO 1, O']] },
      { tekst: 'Stavi predmet između prstiju i pokreni program. Usporedi stisak uz GP 10, 6, 5 i uz GP 4, 2, 3.', naredba: 'RN', provjera: 'Uz manju silu predmet se lakše izvuče iz prstiju.', sim: [['rn']] }
    ],
    program: `10 ' proba prihvatnice
20 SP 3
30 GP 10, 6, 5
40 MO 1, O
50 GC
60 TI 10
70 GO
80 GP 4, 2, 3
90 GC
100 TI 10
110 MO 2, C
120 MO 1, O
130 ED`,
    pocetno: { pozicije: { 1: P(300, 0, 40, 'mjesto za probu prihvatnice'), 2: P(300, 100, 40, 'druga točka') } },
    pitanja: [
      { p: 'Što znači GP 10, 6, 5?', odgovori: ['početna sila 10, sila držanja 6, početna sila traje 0,5 s', 'prihvatnica se otvori na 10 mm', 'brzina zatvaranja 10, otvaranja 6', 'zatvori za 10 s'], tocan: 0, obj: 'Početna sila sigurno stisne predmet, a manja sila držanja ga ne gnječi i štedi motor.' },
      { p: 'Pozicija 3 spremljena je sa stanjem „zatvoreno”. Što radi MO 3, O?', odgovori: ['na kraju gibanja otvori prihvatnicu', 'na kraju gibanja zatvori prihvatnicu', 'javlja pogrešku II. vrste', 'ne mijenja prihvatnicu'], tocan: 0, obj: 'Parametar O/C u naredbi ima prednost pred spremljenim stanjem.' },
      { p: 'Što se dogodi s predmetom u motornoj prihvatnici kad nestane napajanja?', odgovori: ['prihvatnica gubi silu držanja i predmet može ispasti', 'prihvatnica ostane čvrsto zatvorena', 'prihvatnica se sama otvori do kraja', 'ništa, sila se drži oprugom'], tocan: 0, obj: 'Bez napajanja motorna prihvatnica gubi silu držanja — to je važno kod EMG STOP-a.' }
    ],
    prosirenje: 'Odredi najmanji GP kojim prihvatnica još sigurno nosi predmet dok robot ide brzinom SP 6 između pozicija 1 i 2. Zašto je sila držanja manja od početne sile?',
    sigurnost: [
      'Prste drži podalje od prihvatnice kad je servo uključen — GC s računala ili iz programa može doći bez upozorenja.',
      'Preklopnik HAND na DUM1 mora biti na DC za motornu prihvatnicu; krivi položaj može uništiti izvor.'
    ]
  },

  /* ------------------------------------------------------------ 6 */
  {
    id: 'v06', naslov: 'Uzmi i odloži s točkom prilaza', tezina: 2, trajanje: 60,
    cilj: 'Napisati program „uzmi i odloži” s točkama prilaza iznad mjesta uzimanja i odlaganja (MA s pozicijom pomaka) i s manjom brzinom pri spuštanju.',
    oprema: ['robot', 'DUM1', 'PC', 'prihvatnica', 'predmet'],
    kljucno: ['MA a, b', 'SP', 'GC', 'GO', 'TI', 'DW'],
    uvod: 'Robot nikad ne ide izravno na mjesto hvatanja: najprije dođe u točku prilaza iznad njega, zatim se polako spusti, zatvori prihvatnicu, pričeka da se stisak ustali i odmakne se ponovno okomito gore. Točku prilaza ne treba posebno učiti — naredba MA a, b giba robot na točku a + b, pa je dovoljna jedna pozicija pomaka (ovdje pozicija 9 = 50 mm po Z). Kad se mjesto hvatanja promijeni, ponovno se uči samo pozicija a, a prilaz ostaje ispravan.',
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program. Postavi predmet na mjesto uzimanja (pozicija 1).', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Provjeri točke prilaza bez predmeta: MA 1, 9 pa MA 2, 9.', naredba: 'MA 1, 9\nMA 2, 9', provjera: 'Robot stane 50 mm iznad mjesta uzimanja odnosno odlaganja.', sim: [['pc', 'MA 1, 9'], ['pc', 'MA 2, 9']] },
      { tekst: 'Pokreni program i promatraj brzinu kod spuštanja i podizanja.', naredba: 'RN', provjera: 'Gibanje između mjesta je brzo (SP 5), a spuštanje i podizanje sporo (SP 2).', sim: [['rn']] },
      { tekst: 'Isti prilaz napravi relativnim pomakom: idi na poziciju 1 i podigni vrh alata naredbom DW.', naredba: 'MO 1\nDW 0, 0, 50\nWH', provjera: 'WH pokaže Z veći za 50 mm, a X, Y, P i R jednake.', sim: [['pc', 'MO 1'], ['pc', 'DW 0, 0, 50'], ['pc', 'WH']] }
    ],
    program: `10 ' uzmi i odlozi s prilazom
20 SP 5
30 GO
40 MA 1, 9, O
50 SP 2
60 MO 1, O
70 GC
80 TI 5
90 MA 1, 9, C
100 SP 5
110 MA 2, 9, C
120 SP 2
130 MO 2, C
140 GO
150 TI 3
160 MA 2, 9, O
170 SP 5
180 ED`,
    pocetno: { pozicije: { 1: P(300, 100, 0, 'mjesto uzimanja'), 2: P(300, -100, 0, 'mjesto odlaganja'), 9: POMAK(50) } },
    pitanja: [
      { p: 'Što radi MA 1, 9?', odgovori: ['giba robot na točku čije su koordinate zbroj pozicija 1 i 9', 'giba robot na poziciju 1, pa na 9', 'kopira poziciju 9 u 1', 'giba robot 9 mm iznad pozicije 1'], tocan: 0, obj: 'MA zbraja X, Y, Z, P, R obiju pozicija; pozicije ostaju nepromijenjene.' },
      { p: 'Zašto je u poziciji pomaka P = 0 i R = 0?', odgovori: ['jer se zbraja i P i R — svaki drugi broj promijenio bi nagib ili okret alata', 'jer pozicija pomaka ne smije imati kutove', 'zbog brzine', 'jer je prihvatnica otvorena'], tocan: 0, obj: 'Pomak 0, 0, 50, 0, 0 mijenja samo visinu; orijentacija ostaje kao u poziciji uzimanja.' },
      { p: 'Čemu služi TI 5 nakon GC?', odgovori: ['pričeka 0,5 s da prihvatnica čvrsto stisne predmet prije podizanja', 'čeka 5 s na ulaz', 'smanjuje brzinu na SP 5', 'zatvara prihvatnicu u 5 koraka'], tocan: 0, obj: 'TI n čeka n × 0,1 s.' },
      { p: 'Koja je prednost točke prilaza zadane pomakom (MA) pred posebno naučenom točkom iznad predmeta?', odgovori: ['kad se mjesto uzimanja promijeni, ponovno se uči samo jedna pozicija', 'robot je brži', 'MA ide po pravcu', 'nema prednosti'], tocan: 0, obj: 'Prilaz se uvijek računa iz mjesta uzimanja, pa ne može ostati „stari”.' }
    ],
    prosirenje: 'Preuredi program tako da robot predmet vrati na mjesto uzimanja (dodaj drugi ciklus u suprotnom smjeru). Izmjeri trajanje cijelog ciklusa i skrati ga promjenom brzina, a da spuštanje ostane na SP 2.',
    sigurnost: [
      'Prvi prolaz programa izvedi s privjeskom u ruci korak po korak (STEP) ili s brzinom SP 2 na svim gibanjima.',
      'Provjeri da je predmet lakši od nosivosti (1,2 kg zajedno s prihvatnicom).'
    ]
  },

  /* ------------------------------------------------------------ 7 */
  {
    id: 'v07', naslov: 'Zglobno i linearno: kvadrat i krug', tezina: 2, trajanje: 60,
    cilj: 'Usporediti zglobnu (MO) i linearnu (MS) interpolaciju te nacrtati kvadrat naredbom MS i krug naredbom MC.',
    oprema: ['robot', 'DUM1', 'PC', 'olovka'],
    kljucno: ['MO', 'MS a, n', 'MC a, b'],
    uvod: 'Kod MO sve osi krenu i stanu istodobno, a vrh alata opisuje krivulju koja ovisi o kutovima zglobova. MS a, n vodi vrh alata po pravcu do pozicije a: upravljač na pravcu izračuna n međutočaka i giba se između njih — više međutočaka daje točniji pravac. MC a, b prolazi redom kroz pozicije od a do b bez zaustavljanja; ako su pozicije gusto na kružnici, vrh alata opiše krug. Ako bilo koja međutočka nije dohvatljiva, MS i MC javljaju pogrešku II. vrste prije početka gibanja. Za crtanje pričvrsti flomaster u prihvatnicu i podesi duljinu alata tako da vrh flomastera bude vrh alata (vježba 8); ovdje Z = 20 mm stoji iznad papira kao proba „u zraku”.',
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Idi na kut kvadrata 11, zatim zglobno na suprotni kut 13 i promatraj vrh alata.', naredba: 'MO 11\nMO 13', provjera: 'Vrh alata ide po luku, ne po dijagonali.', sim: [['pc', 'MO 11'], ['pc', 'MO 13']] },
      { tekst: 'Vrati se na 11 i istu dijagonalu prijeđi linearno.', naredba: 'MO 11\nMS 13, 20', provjera: 'Vrh alata ide po pravcu.', sim: [['pc', 'MO 11'], ['pc', 'MS 13, 20']] },
      { tekst: 'Pokreni program: kvadrat stranice 60 mm naredbama MS, zatim krug promjera 60 mm naredbom MC.', naredba: 'RN', provjera: 'Kvadrat ima ravne stranice; krug je zatvoren jer je pozicija 32 jednaka poziciji 20.', sim: [['rn']] },
      { tekst: 'Smanji broj međutočaka u retku 50 na 1 i usporedi stranicu kvadrata.', naredba: '50 MS 12, 1\nRN', provjera: 'Kod ovako kratke stranice razlika je mala; kod dugih stranica blizu ruba dosega veća.', sim: [['pc', '50 MS 12, 1'], ['rn']] }
    ],
    program: `10 ' kvadrat (MS) i krug (MC)
20 SP 3
30 MO 10
40 MS 11, 10
50 MS 12, 10
60 MS 13, 10
70 MS 14, 10
80 MS 11, 10
90 MO 10
100 ' krug kroz pozicije 20-32
110 MO 19
120 MS 20, 5
130 MC 20, 32
140 MO 19
150 ED`,
    pocetno: {
      pozicije: Object.assign(
        { 10: P(280, -40, 60, 'iznad kuta 11'), 11: P(280, -40, 20, 'kvadrat, kut 1'), 12: P(340, -40, 20, 'kvadrat, kut 2'), 13: P(340, 40, 20, 'kvadrat, kut 3'), 14: P(280, 40, 20, 'kvadrat, kut 4'), 19: P(340, 0, 60, 'iznad početka kružnice') },
        kruznica(20, 12, 310, 0, 30, 20))
    },
    pitanja: [
      { p: 'Kako se giba vrh alata kod naredbe MO?', odgovori: ['sve osi krenu i stanu istodobno, a vrh alata opisuje krivulju', 'po pravcu', 'po kružnici', 'najprije J1, pa ostale osi'], tocan: 0, obj: 'Zglobna interpolacija interpolira kutove, ne položaj vrha alata.' },
      { p: 'Što je n u MS a, n?', odgovori: ['broj međutočaka na pravcu', 'brzina', 'broj ponavljanja', 'broj pozicije pomaka'], tocan: 0, obj: 'Upravljač računa n međutočaka (1–99); između njih se giba zglobno, pa više točaka daje točniji pravac.' },
      { p: 'Zašto je krug zatvoren?', odgovori: ['zadnja pozicija u nizu (32) ima iste koordinate kao prva (20)', 'MC uvijek zatvara krug', 'zbog naredbe MO 19', 'zbog SP 3'], tocan: 0, obj: 'MC prolazi pozicije od a do b; krug se zatvara samo ako je b jednaka a.' },
      { p: 'Kad MS javlja pogrešku II. vrste?', odgovori: ['kad neka međutočka na pravcu nije dohvatljiva', 'kad je n veći od 10', 'kad je prihvatnica zatvorena', 'nikad'], tocan: 0, obj: 'Provjera se radi prije gibanja, pa robot ne krene u putanju koju ne može završiti.' }
    ],
    prosirenje: 'Nacrtaj trokut: definiraj tri nove pozicije (PD) i nacrtaj ga naredbama MS. Zatim isti trokut prijeđi naredbom MC kroz te tri pozicije i usporedi.',
    sigurnost: [
      'Kod crtanja flomaster smije dodirivati papir samo laganim pritiskom — spuštaj ga u koracima od 1 mm i pazi da tlak ne savije alat.',
      'Linearno gibanje blizu ruba dosega može naglo ubrzati pojedine zglobove; drži brzinu na SP 3 ili manje.'
    ]
  },

  /* ------------------------------------------------------------ 8 */
  {
    id: 'v08', naslov: 'Duljina alata TL i gibanje MT', tezina: 2, trajanje: 45,
    cilj: 'Postaviti duljinu alata naredbom TL, objasniti njezin utjecaj na koordinate i prilaziti točki u smjeru alata naredbom MT.',
    oprema: ['robot', 'DUM1', 'PC', 'olovka'],
    kljucno: ['TL', 'MT a, d', 'WH'],
    uvod: 'Sve koordinate (WH, HE, PD, MO…) odnose se na vrh alata (TCP), koji je od prirubnice udaljen za duljinu alata zadanu naredbom TL. Zadana duljina s motornom prihvatnicom je oko 107 mm. Ako na prihvatnicu staviš dulji alat (npr. flomaster u držaču), TL moraš povećati — inače bi robot vrh alata vodio 43 mm „u zrak” ili u stol. MT a, d giba robot na točku udaljenu d milimetara od pozicije a u smjeru osi alata: negativan d znači natrag (kod alata prema dolje — gore). Za razliku od MA, MT radi i kad je alat nagnut.',
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Idi na poziciju 1, pročitaj položaj, promijeni duljinu alata i ponovno pročitaj položaj.', naredba: 'MO 1\nWH\nTL 150\nWH\nTL 107', provjera: 'Robot se nije pomaknuo, ali WH nakon TL 150 pokazuje Z manji za 43 mm: zamišljeni vrh alata je 43 mm niže.', sim: [['pc', 'MO 1'], ['pc', 'WH'], ['pc', 'TL 150'], ['pc', 'WH'], ['pc', 'TL 107']] },
      { tekst: 'Pokreni program. Promatraj prilaz kosoj točki 2 (P = −60°).', naredba: 'RN', provjera: 'MT 2, -50 odmiče vrh alata koso, duž osi alata, a ne okomito.', sim: [['rn']] },
      { tekst: 'Usporedi s MA: pokušaj kosoj točki prići s MA 2, 9.', naredba: 'MA 2, 9', provjera: 'Robot dođe 50 mm okomito iznad točke 2 — kod nagnutog alata to nije prilaz u smjeru alata.', sim: [['pc', 'MA 2, 9']] }
    ],
    program: `10 ' duljina alata i prilaz u smjeru alata
20 TL 107
30 SP 3
40 MT 1, -60, O
50 MT 1, -10
60 TI 5
70 MT 1, -60
80 ' dulji alat: flomaster u drzacu
90 TL 150
100 MT 1, -60
110 MO 1
120 TI 5
130 MT 1, -60
140 TL 107
150 ' kosa tocka: prilaz u smjeru alata
160 MT 2, -50
170 MO 2
180 TI 5
190 MT 2, -50
200 ED`,
    pocetno: { pozicije: { 1: P(300, 0, 0, 'točka na stolu'), 2: P(380, 0, 40, 'kosa točka, alat nagnut 60°', -60), 9: POMAK(50) } },
    pitanja: [
      { p: 'Na prihvatnicu je stavljen alat dulji za 43 mm, a TL je ostao 107. Što će se dogoditi kod MO na poziciju na stolu?', odgovori: ['stvarni vrh alata udarit će u stol 43 mm prije zamišljenog', 'robot će stati 43 mm iznad', 'ništa, TL ne utječe na gibanje', 'pogreška I. vrste'], tocan: 0, obj: 'Upravljač vodi zamišljeni vrh alata (prirubnica + TL) u točku; stvarni dulji alat je ispod njega.' },
      { p: 'Što radi MT 1, -60 kad alat gleda prema dolje?', odgovori: ['giba robot 60 mm iznad pozicije 1', 'giba robot 60 mm ispod pozicije 1', 'okreće alat za 60°', 'mijenja duljinu alata za 60 mm'], tocan: 0, obj: 'Negativan d je natrag duž osi alata; kod alata prema dolje to je gore.' },
      { p: 'Zašto je za kosu točku bolji MT nego MA s pomakom po Z?', odgovori: ['MT se odmiče duž osi alata, pa alat ulazi i izlazi u svom smjeru', 'MT je brži', 'MA ne radi s nagnutim alatom', 'MT ide po kružnici'], tocan: 0, obj: 'Kod umetanja ili bušenja pod kutom alat mora ići duž svoje osi.' }
    ],
    prosirenje: 'Izmjeri stvarnu duljinu svojeg alata (od prirubnice do vrha) i provjeri je: zadaj TL, nauči točku na vrhu šiljka na stolu, pa promijeni samo P (privjesak, XYZ, P±). Ako vrh alata ostaje na šiljku, TL je ispravan.',
    sigurnost: [
      'Nakon promjene alata uvijek najprije postavi TL, pa tek onda koristi postojeće pozicije.',
      'Kod probe nove duljine alata prilazi stolu odozgo, malom brzinom.'
    ]
  },

  /* ------------------------------------------------------------ 9 */
  {
    id: 'v09', naslov: 'Petlje i brojila', tezina: 2, trajanje: 45,
    cilj: 'Ponavljati dio programa petljom RC/NX i brojiti cikluse brojilima (SC, IC, CP, EQ) te ih pročitati s računala (CR).',
    oprema: ['robot', 'DUM1', 'PC'],
    kljucno: ['RC n', 'NX', 'SC', 'IC', 'CP', 'EQ', 'CR'],
    uvod: 'RC n i NX omeđuju dio programa koji se izvodi n puta. Brojila 1–99 su cjelobrojne varijable: SC c, v upisuje vrijednost, IC i DC povećavaju i smanjuju za 1. Usporedba se radi preko unutarnjeg registra: CP c prepiše brojilo c u registar, a EQ v, redak skoči ako je registar jednak v (NE ako nije, LG ako je veći, SM ako je manji). Petlja s brojilom i uvjetnim skokom može imati broj ponavljanja koji se mijenja tijekom rada. Vrijednost brojila računalo čita naredbom CR c.',
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Pokreni program i broji prolaze između pozicija 1 i 2.', naredba: 'RN', provjera: 'Prva petlja (RC 3) ide tri puta, zatim robot ode na poziciju 3; druga petlja (brojilo 2, EQ) ide dva puta.', sim: [['rn', 0]] },
      { tekst: 'Pročitaj brojila.', naredba: 'CR 1\nCR 2', provjera: 'CR 1 vrati 3, CR 2 vrati 2.', sim: [['pc', 'CR 1'], ['pc', 'CR 2']], ocekuj: { odgovor: '2' } },
      { tekst: 'Promijeni redak 30 u RC 5 i redak 90 u EQ 5, 120 te ponovno pokreni program.', naredba: '30 RC 5\n90 EQ 5, 120\nRN', provjera: 'Prva petlja sada ide pet puta.', sim: [['pc', '30 RC 5'], ['pc', '90 EQ 5, 120'], ['rn']] }
    ],
    program: `10 ' petlje i brojila
20 SC 1, 0
30 RC 3
40 MO 1
50 MO 2
60 IC 1
70 NX
80 CP 1
90 EQ 3, 120
100 ED
110 ' ovamo samo ako je brojilo 1 = 3
120 MO 3
130 SC 2, 0
140 MO 1
150 MO 2
160 IC 2
170 CP 2
180 EQ 2, 200
190 GT 140
200 MO 3
210 ED`,
    pocetno: { pozicije: { 1: P(300, 60, 40, 'točka A'), 2: P(300, -60, 40, 'točka B'), 3: P(300, 0, 120, 'točka iznad, kraj petlje') }, sp: 5 },
    scenariji: [{ naziv: 'bez vanjskih signala', dogadaji: [], ocekuj: { brojila: { 1: 3, 2: 2 } } }],
    pitanja: [
      { p: 'Koliko se puta izvedu redci između RC 3 i NX?', odgovori: ['3', '2', '4', 'beskonačno'], tocan: 0, obj: 'RC n zadaje broj izvođenja dijela programa do NX.' },
      { p: 'Što radi CP 1?', odgovori: ['upisuje vrijednost brojila 1 u registar za usporedbu', 'povećava brojilo 1', 'kopira poziciju 1', 'briše brojilo 1'], tocan: 0, obj: 'Uvjetni skokovi EQ, NE, LG i SM uspoređuju registar, a ne izravno brojilo.' },
      { p: 'Brojilo 2 je 1. Što se dogodi u retcima 170–190?', odgovori: ['skok na 140 (petlja se ponavlja)', 'skok na 200', 'kraj programa', 'pogreška II. vrste'], tocan: 0, obj: 'Registar je 1, EQ 2 ne skače, pa GT 140 vraća izvođenje na početak petlje.' },
      { p: 'Kojom naredbom računalo čita vrijednost brojila 5?', odgovori: ['CR 5', 'CP 5', 'PR 5', 'LR 5'], tocan: 0, obj: 'CR (Counter Read) šalje vrijednost brojila preko RS-232C.' }
    ],
    prosirenje: 'Napiši petlju koja broji unazad: SC 3, 5 pa u petlji DC 3, CP 3 i NE 0 za povratak. Koliko je puta prošla petlja i kolika je vrijednost brojila na kraju?',
    sigurnost: [
      'Program u petlji bez gornje granice (GT bez uvjeta) ne staje sam — prije pokretanja provjeri uvjet izlaska i drži ruku blizu tipke STOP.'
    ]
  },

  /* ------------------------------------------------------------ 10 */
  {
    id: 'v10', naslov: 'Potprogrami, skokovi i uvjeti', tezina: 2, trajanje: 60,
    cilj: 'Razdijeliti program u potprograme (GS/RT), voditi tok skokovima (GT) i odlučivati uvjetima LG i SM.',
    oprema: ['robot', 'DUM1', 'PC', 'prihvatnica', 'predmet'],
    kljucno: ['GS', 'RT', 'GT', 'LG', 'SM'],
    uvod: 'Potprogram je niz redaka koji završava naredbom RT; poziva se s GS redak, a nakon RT izvođenje se nastavlja iza poziva. Isti posao (npr. „prenesi predmet s 1 na 2”) tako se piše jednom i poziva više puta. LG v, redak skače ako je registar veći od v, SM v, redak ako je manji; GT redak skače bez uvjeta. Glavni program na početku (redci 10–130) samo odlučuje, a posao je u potprogramima od retka 500 nadalje — tako se program lakše čita i mijenja.',
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program. Pripremi dva predmeta na poziciji 1 (stavljaj ih jedan po jedan).', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Pokreni program i zapiši koji se potprogram poziva u kojem ciklusu.', naredba: 'RN', provjera: 'Ciklusi 1 i 2: potprogram 600 (s 1 na 2); ciklus 3: potprogram 700 (s 1 na 3); ciklus 4: kraj.', sim: [['rn', 0]] },
      { tekst: 'Pročitaj brojilo ciklusa i provjeri program naredbom LR.', naredba: 'CR 5\nLR 60\nLR 70', provjera: 'CR 5 vrati 4.', sim: [['pc', 'CR 5'], ['pc', 'LR 60'], ['pc', 'LR 70']] }
    ],
    program: `10 ' glavni program: odlucivanje
20 SP 4
30 SC 5, 0
40 GS 500
50 IC 5
60 CP 5
70 LG 3, 120
80 SM 3, 100
90 GS 700
95 GT 50
100 GS 600
110 GT 50
120 GS 500
130 ED
500 ' potprogram: polazni polozaj
510 MA 1, 9, O
520 RT
600 ' potprogram: predmet s 1 na 2
610 MA 1, 9, O
620 MO 1, O
630 GC
640 TI 3
650 MA 1, 9, C
660 MA 2, 9, C
670 MO 2, C
680 GO
690 MA 2, 9, O
695 RT
700 ' potprogram: predmet s 1 na 3
710 MA 1, 9, O
720 MO 1, O
730 GC
740 TI 3
750 MA 1, 9, C
760 MA 3, 9, C
770 MO 3, C
780 GO
790 MA 3, 9, O
795 RT`,
    pocetno: { pozicije: { 1: P(300, 100, 0, 'mjesto uzimanja'), 2: P(300, -100, 0, 'odlaganje A'), 3: P(360, 0, 0, 'odlaganje B'), 9: POMAK(50) } },
    scenariji: [{ naziv: 'bez vanjskih signala', dogadaji: [], ocekuj: { brojila: { 5: 4 } } }],
    pitanja: [
      { p: 'Kamo se nastavlja izvođenje nakon RT u potprogramu pozvanom u retku 100?', odgovori: ['na redak 110', 'na redak 100', 'na redak 500', 'na početak programa'], tocan: 0, obj: 'GS pamti redak iza poziva; RT vraća izvođenje onamo.' },
      { p: 'U trećem ciklusu brojilo je 3. Koji se redak izvodi nakon retka 80?', odgovori: ['90 (GS 700)', '100 (GS 600)', '120 (kraj)', '50'], tocan: 0, obj: 'Registar nije veći od 3 (LG) ni manji od 3 (SM), pa nijedan skok ne vrijedi.' },
      { p: 'Zašto se u ciklusima 1 i 2 ne izvodi GS 700?', odgovori: ['SM 3, 100 preskoči redak 90', 'GT 50 ga preskoči', 'RT ga preskoči', 'izvodi se, ali ne giba robot'], tocan: 0, obj: 'Registar je manji od 3, pa SM skače na redak 100.' },
      { p: 'Što se dogodi ako potprogram nema RT?', odgovori: ['izvođenje se nastavi u idućim redcima (npr. u sljedećem potprogramu)', 'robot automatski skoči natrag', 'program se ne može upisati', 'robot stane na posljednjem retku potprograma'], tocan: 0, obj: 'Redak 600 bez RT nastavio bi se u 700 — česta pogreška koju je teško uočiti.' }
    ],
    prosirenje: 'Dodaj potprogram 800 koji na kraju svakog ciklusa vrati robot u polazni položaj i čeka 1 s, i pozovi ga iz glavnog programa. Koliko redaka se promijenilo u glavnom programu?',
    sigurnost: [
      'Predmet stavljaj na mjesto uzimanja samo dok robot stoji (program zaustavljen ili čeka) — nikad dok se ruka spušta.'
    ]
  },

  /* ------------------------------------------------------------ 11 */
  {
    id: 'v11', naslov: 'Paleta 3 × 3', tezina: 2, trajanje: 60,
    cilj: 'Definirati paletu od 3 × 3 mjesta s četiri kutne pozicije (PA) i slagati predmete na izračunata mjesta (PT) u dvjema ugniježđenim petljama.',
    oprema: ['robot', 'DUM1', 'PC', 'prihvatnica', 'kucista'],
    kljucno: ['PA i, j, k', 'PT i', 'SC', 'IC', 'RC', 'NX'],
    uvod: 'Na paleti s pravilnom rešetkom ne treba učiti svako mjesto. Nauče se četiri kuta, PA i, j, k zada broj mjesta u stupcu (j) i redu (k), a PT i izračuna koordinate mjesta čiji su redni broj u stupcu i redni broj u redu zapisani u dvama brojilima i spremi ih kao poziciju i. Mjesto se dobiva bilinearno između kutova, pa paleta smije biti i malo zakošena. Raspored kutnih pozicija i brojila palete u simulatoru opisan je u tablici ispod.',
    dodatak: 'paleta',
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program. Napuni dovod (pozicija 5) i ispraznii paletu.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Provjeri sva četiri kuta palete točkama prilaza.', naredba: 'MA 10, 9\nMA 11, 9\nMA 12, 9\nMA 13, 9', provjera: 'Kutovi 10–13 su iznad središta kutnih mjesta.', sim: [['pc', 'MA 10, 9'], ['pc', 'MA 11, 9'], ['pc', 'MA 12, 9'], ['pc', 'MA 13, 9']] },
      { tekst: 'Izračunaj ručno mjesto (2, 3) i pročitaj ga.', naredba: 'PA 1, 3, 3\nSC 11, 2\nSC 12, 3\nPT 1\nPR 1', provjera: 'PR 1 vrati točku u sredini gornjeg reda (između kutova 12 i 13).', sim: [['pc', 'PA 1, 3, 3'], ['pc', 'SC 11, 2'], ['pc', 'SC 12, 3'], ['pc', 'PT 1'], ['pc', 'PR 1']] },
      { tekst: 'Pokreni program i promatraj redoslijed slaganja.', naredba: 'RN', provjera: 'Robot slaže stupac po stupac u svakom redu: 9 mjesta, svako s prilazom odozgo.', sim: [['rn', 0]] }
    ],
    program: `10 ' paleta 3 x 3
20 SP 4
30 PA 1, 3, 3
40 SC 12, 1
50 RC 3
60 SC 11, 1
70 RC 3
80 GS 500
90 PT 1
100 MA 1, 9, C
110 SP 2
120 MO 1, C
130 GO
140 TI 3
150 MA 1, 9, O
160 SP 4
170 IC 11
180 NX
190 IC 12
200 NX
210 MA 5, 9, O
220 ED
500 ' potprogram: uzmi s dovoda
510 MA 5, 9, O
520 MO 5, O
530 GC
540 TI 3
550 MA 5, 9, C
560 RT`,
    pocetno: { pozicije: { 5: P(220, -220, 0, 'dovod (mjesto uzimanja)'), 9: POMAK(50), 10: P(265, -45, 0, 'paleta 1: prvo mjesto (kut 1)'), 11: P(355, -45, 0, 'paleta 1: kraj stupca (kut 2)'), 12: P(265, 45, 0, 'paleta 1: kraj reda (kut 3)'), 13: P(355, 45, 0, 'paleta 1: dijagonalni kut (kut 4)') } },
    scenariji: [{ naziv: 'bez vanjskih signala', dogadaji: [], ocekuj: { brojila: { 11: 4, 12: 4 } } }],
    pitanja: [
      { p: 'Koliko pozicija treba naučiti za paletu 3 × 3?', odgovori: ['4 kuta (i dovod)', '9', '3', '1'], tocan: 0, obj: 'Ostala mjesta PT računa iz kutova.' },
      { p: 'Što radi PT 1?', odgovori: ['izračuna mjesto palete 1 prema brojilima i spremi ga kao poziciju 1', 'giba robot na prvo mjesto palete', 'briše paletu 1', 'broji mjesta palete'], tocan: 0, obj: 'PT samo računa i sprema poziciju; gibanje je posebna naredba (ovdje MA 1, 9 i MO 1).' },
      { p: 'Zašto se u retku 60 brojilo 11 ponovno postavlja na 1?', odgovori: ['jer unutarnja petlja počinje novi red od prvog mjesta u stupcu', 'jer PT briše brojilo', 'jer RC to traži', 'nije potrebno'], tocan: 0, obj: 'Nakon unutarnje petlje brojilo 11 je 4; bez SC 11, 1 PT bi u drugom redu javio pogrešku II. vrste (izvan rešetke).' },
      { p: 'Zašto izračunatu točku spremamo baš u poziciju 1, a ne u 10?', odgovori: ['PT i sprema rezultat u poziciju i, a 10–13 su kutovi palete i ne smiju se prepisati', 'pozicija 10 ne postoji', 'zbog brzine', 'svejedno je'], tocan: 0, obj: 'Prepisivanjem kuta pokvarila bi se cijela paleta.' }
    ],
    prosirenje: 'Promijeni program tako da robot paletu prazni obrnutim redoslijedom (od mjesta 3, 3 prema 1, 1) i vraća predmete na dovod. Koje naredbe za brojila trebaš?',
    sigurnost: [
      'Prije prvog slaganja provjeri sve kutove palete MOV-om ili s MA … , 9 — pogrešan kut pomakne sva izračunata mjesta.',
      'Predmeti na paleti ne smiju biti viši od pomaka prilaza (ovdje 50 mm), inače ih prihvatnica zahvati u prolazu.'
    ]
  },

  /* ------------------------------------------------------------ 12 */
  {
    id: 'v12', naslov: 'Ulazi i izlazi sa SIM RV', tezina: 2, trajanje: 45,
    cilj: 'Uključivati izlaze (OB, OD), čekati ulaz (TB) i čitati sve ulaze odjednom (ID) uz simulator ulaza i izlaza SIM RV.',
    oprema: ['robot', 'DUM1', 'PC', 'SIM RV'],
    kljucno: ['OB ±b', 'OD v', 'TB ±b, redak', 'ID', 'DR'],
    uvod: 'SIM RV se priključuje na EXTERNAL I/O upravljačke jedinice: 8 preklopnika su ulazi 0–7 prema DUM1, a 8 crvenih LED-ica izlazi 0–7 iz DUM1. OB +b uključuje, OB −b isključuje jedan izlaz; OD v upisuje cijeli bajt odjednom (85 = 01010101). TB +b, redak skače ako je ulaz b uključen (TB −b ako je isključen) — tako program čeka signal. ID prepiše sve ulaze u registar, pa se mogu ispitati uvjetima EQ, NE, LG, SM; računalo registar čita naredbom DR.',
    simRV: [
      { bit: 0, smjer: 'ulaz', opis: 'sklopka „start”: program čeka da se uključi' },
      { bit: 1, smjer: 'ulaz', opis: 'sklopka „izbor”: s ulazom 0 daje vrijednost 3' },
      { bit: 0, smjer: 'izlaz', opis: 'proba izlaza' }, { bit: 1, smjer: 'izlaz', opis: 'proba izlaza' },
      { bit: 6, smjer: 'izlaz', opis: 'ulazi 0 i 1 uključeni (registar = 3)' },
      { bit: 7, smjer: 'izlaz', opis: 'samo ulaz 0 (registar ≠ 3)' }
    ],
    koraci: [
      { tekst: 'Priključi SIM RV na EXTERNAL I/O (DUM1 isključen), uključi DUM1. Svi preklopnici SIM RV su dolje (L).', naredba: 'POWER ON', sim: [['ukljuci']] },
      { tekst: 'Uključi i isključi izlaz 3 izravnom naredbom, zatim upiši cijeli bajt.', naredba: 'OB +3\nOB -3\nOD 85\nOD 0', provjera: 'Svijetli LED 3, zatim LED-ice 0, 2, 4 i 6.', sim: [['pc', 'OB +3'], ['pc', 'OB -3'], ['pc', 'OD 85'], ['pc', 'OD 0']] },
      { tekst: 'Prebaci preklopnik 2 gore (H) i pročitaj ulaze.', naredba: 'ID\nDR', provjera: 'DR vrati 4 (bit 2).', sim: [['ulaz', 2, 1], ['pc', 'ID'], ['pc', 'DR'], ['ulaz', 2, 0]], ocekuj: { odgovor: '4' } },
      { tekst: 'Učitaj program i pokreni ga. Kad LED-ice 0 i 1 zatrepću i ugase se, program čeka: uključi preklopnik 1, pa preklopnik 0.', naredba: 'RN', provjera: 'Upali se LED 6. Kad isključiš preklopnik 0, izlazi se ugase i program završi.', sim: [['ucitaj'], ['rn', 0]] },
      { tekst: 'Ponovi s isključenim preklopnikom 1 (uključi samo 0).', naredba: 'RN', provjera: 'Upali se LED 7.', sim: [['rn', 1]] }
    ],
    program: `10 ' izlazi jedan po jedan
20 OD 0
30 OB +0
40 TI 5
50 OB +1
60 TI 5
70 OB -0
80 OB -1
90 OD 85
100 TI 10
110 OD 0
120 ' cekaj ulaz 0
130 TB +0, 160
140 TI 1
150 GT 130
160 ID
170 EQ 3, 200
180 OB +7
190 GT 210
200 OB +6
210 TB -0, 240
220 TI 1
230 GT 210
240 OD 0
250 ED`,
    pocetno: { pozicije: {}, ulazi: 0 },
    scenariji: [
      { naziv: 'ulazi 1 i 0 → LED 6', dogadaji: [
        { kad: { redak: 140 }, ulaz: 1, v: 1, opis: 'preklopnik 1 gore' },
        { kad: { nakon: 0.5 }, ulaz: 0, v: 1, opis: 'preklopnik 0 gore' },
        { kad: { izlaz: 6, v: 1 }, ulaz: 0, v: 0, opis: 'preklopnik 0 dolje' },
        { kad: { nakon: 0.2 }, ulaz: 1, v: 0, opis: 'preklopnik 1 dolje' }], ocekuj: { izlazi: 0 } },
      { naziv: 'samo ulaz 0 → LED 7', dogadaji: [
        { kad: { redak: 140 }, ulaz: 0, v: 1, opis: 'preklopnik 0 gore' },
        { kad: { izlaz: 7, v: 1 }, ulaz: 0, v: 0, opis: 'preklopnik 0 dolje' }], ocekuj: { izlazi: 0 } }
    ],
    pitanja: [
      { p: 'Koje LED-ice svijetle nakon OD 85?', odgovori: ['0, 2, 4 i 6', '0 do 6', '1, 3, 5 i 7', 'samo 7'], tocan: 0, obj: '85 = 64 + 16 + 4 + 1, binarno 01010101.' },
      { p: 'Što radi par redaka „130 TB +0, 160” i „150 GT 130”?', odgovori: ['čeka dok se ulaz 0 ne uključi', 'uključuje izlaz 0', 'broji impulse na ulazu 0', 'prekida program'], tocan: 0, obj: 'Dok je ulaz 0 isključen, TB ne skače i GT vraća na provjeru; TI 1 između njih rasterećuje upravljač.' },
      { p: 'Ulazi 0 i 2 su uključeni. Što vrati DR nakon ID?', odgovori: ['5', '2', '3', '4'], tocan: 0, obj: '2⁰ + 2² = 1 + 4 = 5.' },
      { p: 'Po čemu se razlikuju OB i OD?', odgovori: ['OB mijenja jedan izlaz, OD upisuje sve izlaze odjednom', 'OB je ulaz, OD izlaz', 'OD radi s rukovanjem', 'nema razlike'], tocan: 0, obj: 'OD 0 zato gasi sve izlaze jednom naredbom.' }
    ],
    prosirenje: 'Napiši program „semafor”: izlazi 0, 1, 2 (crveno, žuto, zeleno) mijenjaju se u ciklusu 3 s – 1 s – 3 s dok je uključen ulaz 0, a kad se ulaz 0 isključi, svijetli samo žuto.',
    sigurnost: [
      'SIM RV priključuj i odspajaj samo kad je DUM1 isključen.',
      'Vanjsko napajanje ulaza i izlaza (12–24 V DC) osigurava korisnik — provjeri napon prije spajanja.'
    ]
  },

  /* ------------------------------------------------------------ 13 */
  {
    id: 'v13', naslov: 'Rukovanje: IN, OT i signali STB, BUSY, RDY, ACK', tezina: 3, trajanje: 60,
    cilj: 'Preuzeti nalog od vanjskog uređaja naredbom IN i javiti rezultat naredbom OT uz potpuno rukovanje signalima STB/BUSY i RDY/ACK.',
    oprema: ['robot', 'DUM1', 'PC', 'SIM RV'],
    kljucno: ['IN', 'OT v', 'STB', 'BUSY', 'RDY', 'ACK', 'EQ'],
    uvod: 'ID i OD čitaju i pišu odmah, bez obzira je li drugi uređaj spreman. Kad podatak mora sigurno prijeći s jednog uređaja na drugi, koristi se rukovanje. IN čeka da vanjski uređaj javi STB (podatak je na ulazima), prepiše ulaze u registar, javi BUSY i čeka da STB padne. OT upiše podatak na izlaze, javi RDY i čeka da vanjski uređaj potvrdi ACK. Na SIM RV su STB i ACK preklopnici, a RDY i BUSY zelene LED-ice. U ovoj vježbi vanjski uređaj (ti, na SIM RV) šalje broj naloga 1 ili 2, robot ide na odgovarajuću poziciju i javlja izvršeni nalog.',
    dodatak: 'rukovanje',
    simRV: [
      { bit: 0, smjer: 'ulaz', opis: 'nalog 1 (vrijednost 1)' }, { bit: 1, smjer: 'ulaz', opis: 'nalog 2 (vrijednost 2)' },
      { bit: 'STB', smjer: 'ulaz', opis: 'podatak naloga je spreman' }, { bit: 'ACK', smjer: 'ulaz', opis: 'vanjski uređaj je preuzeo odgovor' },
      { bit: 'BUSY', smjer: 'izlaz', opis: 'robot je preuzeo nalog' }, { bit: 'RDY', smjer: 'izlaz', opis: 'odgovor je na izlazima' },
      { bit: '0–7', smjer: 'izlaz', opis: 'broj izvršenog naloga (255 = nepoznat nalog)' }
    ],
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program. Svi preklopnici SIM RV su dolje.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Pokreni program. Robot čeka nalog (EXECUTE svijetli, robot miruje).', naredba: 'RN', sim: [['rnBez'], ['cekaj', 1]] },
      { tekst: 'Postavi nalog 2: preklopnik 1 gore. Zatim STB gore.', naredba: 'ulaz 1 = H · STB = H', provjera: 'Svijetli BUSY: robot je preuzeo nalog.', sim: [['ulaz', 1, 1], ['ulaz', 'STB', 1], ['cekaj', 0.2]] },
      { tekst: 'Spusti STB.', naredba: 'STB = L', provjera: 'BUSY se ugasi; robot ide na poziciju 2. Kad stigne, na izlazima je 2 i svijetli RDY.', sim: [['ulaz', 'STB', 0], ['cekaj', 4]] },
      { tekst: 'Potvrdi odgovor: ACK gore, pa dolje.', naredba: 'ACK = H · ACK = L', provjera: 'RDY se ugasi kad podigneš ACK; kad ga spustiš, program završi.', sim: [['ulaz', 'ACK', 1], ['cekaj', 0.2], ['ulaz', 'ACK', 0], ['cekajKraj']] },
      { tekst: 'Pokreni program još jednom, s nalogom 1, i odigraj cijelo rukovanje sam.', naredba: 'RN', sim: [['ulaz', 1, 0], ['rn', 1]] }
    ],
    program: `10 ' nalog uz rukovanje STB/BUSY, odgovor uz RDY/ACK
20 SP 4
30 IN
40 EQ 1, 100
50 EQ 2, 200
60 OT 255
70 GT 30
100 MO 1
110 OT 1
120 GT 300
200 MO 2
210 OT 2
300 ED`,
    pocetno: { pozicije: { 1: P(300, 60, 40, 'mjesto naloga 1'), 2: P(300, -60, 40, 'mjesto naloga 2') }, ulazi: 0 },
    scenariji: [
      { naziv: 'nalog 2', dogadaji: [
        { kad: { nakon: 0.5 }, ulaz: 1, v: 1, opis: 'nalog 2 na ulazima' },
        { kad: { nakon: 0.3 }, ulaz: 'STB', v: 1, opis: 'STB: podatak spreman' },
        { kad: { signal: 'BUSY', v: 1 }, ulaz: 'STB', v: 0, opis: 'robot preuzeo (BUSY) → STB dolje' },
        { kad: { signal: 'RDY', v: 1 }, ulaz: 'ACK', v: 1, opis: 'odgovor spreman (RDY) → ACK gore' },
        { kad: { signal: 'RDY', v: 0 }, ulaz: 'ACK', v: 0, opis: 'RDY dolje → ACK dolje' }], ocekuj: { izlazi: 2 } },
      { naziv: 'nalog 1', dogadaji: [
        { kad: { nakon: 0.5 }, ulaz: 0, v: 1, opis: 'nalog 1 na ulazima' },
        { kad: { nakon: 0.3 }, ulaz: 'STB', v: 1, opis: 'STB: podatak spreman' },
        { kad: { signal: 'BUSY', v: 1 }, ulaz: 'STB', v: 0, opis: 'BUSY → STB dolje' },
        { kad: { signal: 'RDY', v: 1 }, ulaz: 'ACK', v: 1, opis: 'RDY → ACK gore' },
        { kad: { signal: 'RDY', v: 0 }, ulaz: 'ACK', v: 0, opis: 'RDY dolje → ACK dolje' }], ocekuj: { izlazi: 1 } }
    ],
    pitanja: [
      { p: 'Zašto se nalog ne čita jednostavno naredbom ID?', odgovori: ['ID čita odmah, pa može pročitati podatak koji vanjski uređaj još nije do kraja postavio', 'ID ne postoji na RV-M1', 'ID ne može čitati više bitova', 'ID ne puni registar'], tocan: 0, obj: 'Rukovanje osigurava da se podatak čita tek kad je spreman i da pošiljatelj zna da je preuzet.' },
      { p: 'Što javlja robot signalom BUSY?', odgovori: ['da je preuzeo podatak s ulaza (IN)', 'da je odgovor spreman (OT)', 'da je u pogrešci', 'da se giba'], tocan: 0, obj: 'Nakon BUSY vanjski uređaj spušta STB i smije promijeniti ulaze.' },
      { p: 'Robot je izveo OT 2 i čeka. Što mora napraviti vanjski uređaj?', odgovori: ['pročitati izlaze i potvrditi ACK (gore, pa dolje)', 'spustiti STB', 'poslati RS', 'ništa'], tocan: 0, obj: 'OT završava tek kad ACK prijeđe gore i dolje.' },
      { p: 'Što se dogodi ako vanjski uređaj nikad ne podigne STB?', odgovori: ['program čeka na naredbi IN', 'pogreška II. vrste odmah', 'robot nastavi s registrom 0', 'robot se vrati u NEST'], tocan: 0, obj: 'IN nema vremensko ograničenje — zato vanjski uređaj ili rukovatelj mora znati da robot čeka.' }
    ],
    prosirenje: 'Proširi program tako da nakon odgovora ne završi, nego čeka novi nalog (petlja na redak 30), a nalog 0 neka znači „kraj rada”. Zašto je dobro da robot nepoznat nalog javi posebnim brojem (255)?',
    sigurnost: [
      'Slijed signala rukovanja na SIM RV ovdje je pretpostavka simulatora; prije spajanja pravog vanjskog uređaja provjeri vremenski dijagram u priručniku ili mjerenjem.',
      'Robot se smije gibati čim primi nalog — vanjski uređaj (ili ti) ne smije biti u radnom prostoru kad daje STB.'
    ]
  },

  /* ------------------------------------------------------------ 14 */
  {
    id: 'v14', naslov: 'Prekid EA/DA i sigurno zaustavljanje', tezina: 3, trajanje: 50,
    cilj: 'Prekinuti program ulaznim signalom (EA), zabraniti prekid (DA) i razlikovati zaustavljanje tipkom STOP, prekid programom i STOP u nuždi.',
    oprema: ['robot', 'DUM1', 'PC', 'SIM RV'],
    kljucno: ['EA ±b, redak', 'DA b', 'STOP', 'START', 'EMG STOP'],
    uvod: 'EA ±b, redak omogućuje prekid: kad ulaz b prijeđe u zadano stanje, program odmah prekida tekuću naredbu (i gibanje) i skače na zadani redak. Tako se na signal svjetlosne zavjese ili senzora robot povuče u siguran položaj, upali lampu i stane. DA b zabranjuje prekid. Prekid programom NIJE sigurnosna funkcija — to je dio programa i ovisi o tome radi li program ispravno. Tipka STOP zaustavlja program nakon tekuće naredbe (nastavlja se tipkom START), a EMG STOP isključuje servo napajanje (pogreška I. vrste). Za zaštitu ljudi služi samo EMG STOP i vanjski krug EXT EMG STP.',
    simRV: [{ bit: 7, smjer: 'ulaz', opis: 'senzor u radnom prostoru (npr. svjetlosna zavjesa) — prekid' }, { bit: 7, smjer: 'izlaz', opis: 'lampa „prekid”' }],
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program. Preklopnik 7 SIM RV je dolje.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Pokreni program; dok robot ide između pozicija 1 i 2, prebaci preklopnik 7 gore.', naredba: 'RN · ulaz 7 = H', provjera: 'Robot odmah prekine gibanje, ode u siguran položaj 8, upali LED 7 i program završi.', sim: [['rn', 0]] },
      { tekst: 'Vrati preklopnik 7 dolje i ugasi lampu.', naredba: 'ulaz 7 = L · OB -7', sim: [['ulaz', 7, 0], ['pc', 'OB -7']] },
      { tekst: 'Ponovno pokreni program i pritisni STOP na DUM1, zatim START.', naredba: 'RN · STOP · START', provjera: 'STOP: robot dovrši tekuće gibanje i stane (EXECUTE se ugasi). START: program se nastavi.', sim: [['rnBez'], ['cekaj', 2], ['stop'], ['cekajKraj'], ['start'], ['cekaj', 2]] },
      { tekst: 'Dok se robot giba, pritisni EMG STOP na DUM1. Otpusti ga, isključi i uključi DUM1 i napravi NEST.', naredba: 'EMG STOP · POWER OFF/ON · NT', provjera: 'Robot stane odmah, ERROR trepće, LED3 iza vrata; program se ne može nastaviti.', sim: [['emg', 'dum1', true]], greska: 1, ocekuj: { led: 'LED3' } },
      { tekst: 'Ponovno pokretanje nakon STOP-a u nuždi.', naredba: 'POWER OFF · POWER ON · NT', sim: [['emg', 'dum1', false], ['iskljuci'], ['ukljuci'], ['pc', 'NT']] }
    ],
    program: `10 ' prekid s ulaza 7
20 SP 4
30 EA +7, 500
40 MO 1
50 MO 2
60 GT 40
500 ' prekidni program: siguran polozaj
510 DA 7
520 OB +7
530 SP 2
540 MO 8
550 ED`,
    pocetno: { pozicije: { 1: P(300, 80, 40, 'točka A'), 2: P(300, -80, 40, 'točka B'), 8: P(250, 0, 150, 'siguran položaj') } },
    scenariji: [{ naziv: 'senzor nakon 5 s', dogadaji: [{ kad: { nakon: 5 }, ulaz: 7, v: 1, opis: 'senzor u radnom prostoru' }], ocekuj: { izlazi: 128 } }],
    pitanja: [
      { p: 'Što se dogodi kad se uključi ulaz 7 nakon EA +7, 500?', odgovori: ['program odmah prekine tekuću naredbu i nastavi od retka 500', 'program završi tekuće gibanje pa stane', 'pogreška I. vrste', 'robot se vrati u NEST'], tocan: 0, obj: 'EA prekida i gibanje u tijeku; to je razlika prema TB, koji se ispituje tek kad program dođe do tog retka.' },
      { p: 'Po čemu se STOP na DUM1 razlikuje od EMG STOP?', odgovori: ['STOP zaustavi program nakon tekuće naredbe i nastavlja se START-om; EMG STOP isključi servo napajanje (pogreška I.)', 'nema razlike', 'STOP isključi servo, EMG STOP samo program', 'STOP briše program'], tocan: 0, obj: 'STOP je pogonska funkcija, EMG STOP sigurnosna.' },
      { p: 'Smije li prekid EA zamijeniti STOP u nuždi za zaštitu ljudi?', odgovori: ['ne — EA je dio programa i ne isključuje servo; za ljude služe EMG STOP i vanjski krug EXT EMG STP', 'da, ako je senzor dobar', 'da, ako je brzina mala', 'da, uz DA'], tocan: 0, obj: 'Ako program zastane ili je pogrešno napisan, prekid neće raditi.' }
    ],
    prosirenje: 'Dodaj nastavak rada: nakon prekida program neka čeka da se ulaz 7 isključi (TB), ponovno omogući prekid (EA) i nastavi ciklus. Zašto je dobro da nastavak traži i potvrdu rukovatelja (npr. ulaz 6)?',
    sigurnost: [
      'Prekid EA i program nisu sigurnosna funkcija; pravi senzor za zaštitu ljudi spaja se u krug EXT EMG STP.',
      'Nakon EMG STOP J2 i J3 koče, ali prihvatnica gubi silu — predmet može ispasti.'
    ]
  },

  /* ------------------------------------------------------------ 15 */
  {
    id: 'v15', naslov: 'Memorija: EPROM i RAM', tezina: 3, trajanje: 40,
    cilj: 'Spremiti program i pozicije u EPROM (WR), vratiti ih u RAM (TR), brisati program (NW, DL) i čitati retke (LR).',
    oprema: ['robot', 'DUM1', 'PC', 'privjesak'],
    kljucno: ['WR', 'TR', 'NW', 'DL', 'LR', 'WRT', 'TRN'],
    uvod: 'DUM1 drži program (do 2048 redaka) i pozicije (do 629) u RAM-u s baterijom, a trajno ih može upisati u EPROM ugrađenim programatorom. WR (na privjesku WRT, ENT) upisuje RAM u EPROM, TR (TRN, ENT) prepisuje EPROM u RAM. NW briše cijeli program i sve pozicije u RAM-u, DL a, b briše retke programa; EPROM pritom ostaje nepromijenjen. LR redak vraća sadržaj retka. Preklopnik ST2 iza bočnih vrata određuje kopira li se EPROM u RAM pri svakom uključenju.',
    dodatak: 'memorija',
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Pročitaj redak 20 i upiši program u EPROM.', naredba: 'LR 20\nWR', provjera: 'LR vrati „20 MO 1”; upis traje nekoliko sekundi (EXECUTE svijetli).', sim: [['pc', 'LR 20'], ['pc', 'WR']] },
      { tekst: 'Obriši cijeli RAM i pokušaj pročitati redak 20 i poziciju 1.', naredba: 'NW\nLR 20\nPR 1', provjera: 'LR vrati prazan redak; PR 1 javlja pogrešku II. vrste (pozicija ne postoji).', sim: [['pc', 'NW'], ['pc', 'LR 20'], ['pc', 'PR 1']], greska: 2 },
      { tekst: 'Poništi pogrešku i vrati program iz EPROM-a.', naredba: 'RS\nTR\nLR 20\nPR 1', provjera: 'Program i pozicije su ponovno u RAM-u.', sim: [['pc', 'RS'], ['pc', 'TR'], ['pc', 'LR 20'], ['pc', 'PR 1']], ocekuj: { odgovor: '+300.0,+60.0,+60.0,-90.0,+0.0' } },
      { tekst: 'Obriši redak 30, provjeri i pokreni program.', naredba: 'DL 30\nLR 30\nRN', provjera: 'Robot ide samo 1 → 1 (redak 30 MO 2 je obrisan).', sim: [['pc', 'DL 30'], ['pc', 'LR 30'], ['rn']] },
      { tekst: 'Vrati izvorni program iz EPROM-a privjeskom.', naredba: 'privjesak ON · TRN, ENT · privjesak OFF', sim: [['privjesak', true], ['tipke', 'TRN', 'ENT'], ['privjesak', false], ['pc', 'LR 30']], ocekuj: { odgovor: '30 MO 2' } }
    ],
    program: `10 SP 4
20 MO 1
30 MO 2
40 MO 1
50 ED`,
    pocetno: { pozicije: { 1: P(300, 60, 60, 'točka A'), 2: P(300, -60, 60, 'točka B') } },
    pitanja: [
      { p: 'Što briše NW?', odgovori: ['cijeli program i sve pozicije u RAM-u', 'samo EPROM', 'samo pozicije', 'samo trenutni redak'], tocan: 0, obj: 'EPROM ostaje nepromijenjen, pa se program vraća s TR.' },
      { p: 'Koji je slijed na privjesku za upis RAM → EPROM?', odgovori: ['WRT, ENT', 'TRN, ENT', 'P.S, ENT', 'STEP, ENT'], tocan: 0, obj: 'WRT = WR (write), TRN = TR (transfer EPROM → RAM).' },
      { p: 'Zašto se gotovi program upisuje u EPROM?', odgovori: ['da se može vratiti kad se RAM obriše ili isprazni baterija', 'da radi brže', 'da ga privjesak može mijenjati', 'da se može slati preko RS-232C'], tocan: 0, obj: 'RAM s baterijom čuva podatke oko dvije godine; EPROM ih čuva i bez baterije.' }
    ],
    prosirenje: 'Smisli pravilo rada u radionici: kad se program smije upisati u EPROM i tko to odlučuje? Napiši ga u dvije rečenice, uz razlog.',
    sigurnost: [
      'NW i TR prepisuju sve u RAM-u bez pitanja — prije toga spremi program na računalo (LR redak po redak ili iz svoje datoteke).',
      'Nakon TR provjeri pozicije MOV-om prije pokretanja programa: EPROM može sadržavati stariju inačicu.'
    ]
  },

  /* ------------------------------------------------------------ 16 */
  {
    id: 'v16', naslov: 'Zadatak iz linije MPS: preuzmi, provjeri boju, složi ili sortiraj', tezina: 3, trajanje: 90,
    cilj: 'Napisati cjelovit program robotske stanice: preuzeti kućište cilindra s izlaza obradne stanice na njezin signal, prepoznati boju senzorom u prihvatnici i kućište složiti u montažno gnijezdo ili sortirati u spremnik.',
    oprema: ['robot', 'DUM1', 'PC', 'SIM RV', 'prihvatnica', 'kucista', 'stanica'],
    kljucno: ['TB', 'OB', 'MA', 'GP', 'GS', 'TI'],
    uvod: 'U liniji MPS obradna stanica (okretni stol s bušenjem i provjerom) na zadnjem mjestu stola predaje kućište cilindra (Ø40 mm) robotu i javlja to signalom; stol ne nastavlja dok mjesto ne bude slobodno. Robot kućište uzme, senzor u prihvatnici (svjetlovod) javi vidi li crveno ili metalno kućište — crno ne vidi — i robot crveno ili metalno kućište stavi u montažno gnijezdo za sklapanje, a crno sortira u spremnik. Signale obradne stanice i senzora ovdje glumi SIM RV. Položaji stanica izračunati su u simulatoru za pretpostavljeni raspored stanica; na pravoj liniji svaku poziciju moraš ponovno naučiti privjeskom.',
    napomena: 'Pozicije 1, 3, 4 i 8 izračunate su u simulatoru za pretpostavljeni raspored stanica (izlaz obradne stanice lijevo od robota, montažno gnijezdo ispred, spremnik za crna kućišta desno). Na pravoj liniji nauči ih privjeskom (P.S) i provjeri MOV-om malom brzinom.',
    simRV: [
      { bit: 0, smjer: 'ulaz', opis: 'obradna stanica: kućište je na izlazu stola' },
      { bit: 1, smjer: 'ulaz', opis: 'senzor u prihvatnici: crveno ili metalno (1), crno (0)' },
      { bit: 0, smjer: 'izlaz', opis: 'robot preuzima — stol se ne smije okretati' },
      { bit: 1, smjer: 'izlaz', opis: 'kućište je u montažnom gnijezdu' },
      { bit: 2, smjer: 'izlaz', opis: 'crno kućište sortirano u spremnik' }
    ],
    koraci: [
      { tekst: 'Uključi DUM1, NEST, učitaj pozicije i program. Svi preklopnici SIM RV su dolje.', naredba: 'NT', sim: [['ukljuci'], ['pc', 'NT'], ['ucitaj']] },
      { tekst: 'Provjeri pozicije malom brzinom: početni položaj i točke prilaza svih mjesta.', naredba: 'SP 2\nMO 8\nMA 1, 9\nMA 3, 9\nMA 4, 9\nMO 8', provjera: 'Nijedna točka prilaza ne dodiruje stanice; ako treba, ponovno nauči pozicije 1, 3 i 4.', sim: [['pc', 'SP 2'], ['pc', 'MO 8'], ['pc', 'MA 1, 9'], ['pc', 'MA 3, 9'], ['pc', 'MA 4, 9'], ['pc', 'MO 8']] },
      { tekst: 'Pokreni program. Javi „kućište na izlazu” (preklopnik 0 gore); kad se prihvatnica zatvori, javi crveno kućište (preklopnik 1 gore).', naredba: 'RN · ulaz 0 = H · ulaz 1 = H', provjera: 'Robot preuzme kućište, javi izlazom 0 da preuzima, odloži ga u montažno gnijezdo i upali LED 1.', sim: [['rn', 0]] },
      { tekst: 'Ponovi s crnim kućištem: preklopnik 1 ostaje dolje.', naredba: 'RN · ulaz 0 = H', provjera: 'Robot kućište sortira u spremnik i upali LED 2.', sim: [['rn', 1]] }
    ],
    program: `10 ' MPS: preuzmi kuciste s obradne stanice
20 SP 4
30 GP 8, 5, 5
40 OD 0
50 MO 8, O
60 ' cekaj: kuciste na izlazu stola (ulaz 0)
70 TB +0, 100
80 TI 2
90 GT 70
100 OB +0
110 MA 1, 9, O
120 SP 2
130 MO 1, O
140 GC
150 TI 5
160 MA 1, 9, C
170 OB -0
180 SP 4
190 ' senzor u prihvatnici: 1 = crveno ili metal, 0 = crno
200 TB +1, 300
210 ' crno: sortiraj u spremnik
220 MA 4, 9, C
230 MO 4, C
240 GO
250 TI 3
260 MA 4, 9, O
270 OB +2
280 GT 400
300 ' crveno ili metal: montazno gnijezdo
310 MA 3, 9, C
320 SP 2
330 MO 3, C
340 GO
350 TI 3
360 MA 3, 9, O
370 OB +1
380 SP 4
400 MO 8, O
410 ED`,
    pocetno: { pozicije: { 1: P(150, 300, 40, 'izlaz obradne stanice (zadnje mjesto stola)'), 3: P(330, 0, 10, 'montažno gnijezdo'), 4: P(250, -250, 110, 'spremnik za crna kućišta (ispuštanje odozgo)'), 8: P(280, 0, 150, 'početni položaj'), 9: POMAK(50) }, ulazi: 0 },
    scenariji: [
      { naziv: 'crveno kućište → montažno gnijezdo', dogadaji: [
        { kad: { nakon: 1 }, ulaz: 0, v: 1, opis: 'obradna stanica: kućište na izlazu' },
        { kad: { redak: 140 }, ulaz: 1, v: 1, opis: 'senzor vidi crveno kućište' },
        { kad: { redak: 170 }, ulaz: 0, v: 0, opis: 'mjesto na stolu je slobodno' },
        { kad: { izlaz: 1, v: 1 }, ulaz: 1, v: 0, opis: 'prihvatnica prazna — senzor ne vidi ništa' }], ocekuj: { izlazi: 2 } },
      { naziv: 'crno kućište → spremnik', dogadaji: [
        { kad: { nakon: 1 }, ulaz: 0, v: 1, opis: 'obradna stanica: kućište na izlazu' },
        { kad: { redak: 170 }, ulaz: 0, v: 0, opis: 'mjesto na stolu je slobodno' }], ocekuj: { izlazi: 4 } }
    ],
    pitanja: [
      { p: 'Zašto robot izlazom 0 javlja da preuzima kućište?', odgovori: ['da obradna stanica ne okrene stol dok je prihvatnica nad njim', 'da se upali lampa na upravljačkoj ploči', 'da se zatvori prihvatnica', 'da se resetira PLC'], tocan: 0, obj: 'Rukovanje među stanicama sprječava sudar robota i stola.' },
      { p: 'Zašto senzor u prihvatnici ne vidi crno kućište?', odgovori: ['crna površina odbija premalo svjetla prema svjetlovodu', 'crno kućište je od metala', 'crno kućište je preteško', 'crno kućište je okruglo'], tocan: 0, obj: 'Refleksni optički senzor razlikuje „crno / nije crno”; za razlikovanje crvenog od metalnog trebao bi drugi senzor (npr. induktivni).' },
      { p: 'Kućište je visoko 25 mm (crno 22,5 mm). Kakav pomak prilaza je siguran za montažno gnijezdo?', odgovori: ['veći od visine kućišta i dijelova gnijezda — ovdje 50 mm', '10 mm', '0 mm', 'pomak nije potreban'], tocan: 0, obj: 'Kućište u prihvatnici ne smije zapeti za rub gnijezda pri prilazu.' },
      { p: 'Što moraš napraviti s pozicijama 1, 3 i 4 prije rada na pravoj liniji?', odgovori: ['ponovno ih naučiti privjeskom i provjeriti MOV-om malom brzinom', 'ništa, izračunate su točno', 'samo povećati SP', 'upisati ih u EPROM'], tocan: 0, obj: 'Pozicije iz simulatora vrijede za pretpostavljeni raspored stanica, a ne za stvarnu liniju.' }
    ],
    prosirenje: 'Proširi program na stvarni montažni slijed: nakon odlaganja u gnijezdo robot uzima klip s palete (srebrni za crno kućište, crni za crveno i metalno), umeće ga i javlja montažnoj stanici da izbaci oprugu i poklopac. Nacrtaj najprije dijagram toka i popis potrebnih ulaza i izlaza.',
    sigurnost: [
      'Pozicije iz simulatora na pravoj liniji obavezno ponovno nauči i provjeri brzinom SP 1–2 — stanice MPS su tik uz robot.',
      'Prije pokretanja dogovori s osobom koja vodi PLC obradne stanice tko pokreće što; dok robot radi, nitko ne posiže u stol ni u gnijezdo.',
      'Linija ima zrak 6 bar: pneumatski cilindri stanica mogu krenuti i kad robot stoji.'
    ]
  }
];

/* ================================================================== pomoćne funkcije (stranica, simulator, test) */
export const vjezba = (id) => VJEZBE.find((v) => v.id === id) || null;

/** retci programa (bez praznih) */
export function programRedci(v) {
  return v && v.program ? String(v.program).split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
}

const n1 = (x) => { const r = Math.round(x * 10) / 10; return String(Object.is(r, -0) ? 0 : r); };
/** naredba PD za poziciju n */
export function naredbaPD(n, t) { return 'PD ' + n + ', ' + [t.x, t.y, t.z, t.p, t.r].map(n1).join(', '); }

/** naredbe za pripremu (izravno, privjesak OFF): TL, SP, pozicije (GF + PD), zatim retci programa.
    opcije: { program: true } — false izostavi program (samo pozicije) */
export function pripremaNaredbe(v, opcije = {}) {
  const o = [];
  if (!v) return o;
  const p = v.pocetno || {};
  if (typeof p.tl === 'number') o.push('TL ' + n1(p.tl));
  if (Number.isInteger(p.sp)) o.push('SP ' + p.sp);
  const poz = Object.keys(p.pozicije || {}).map(Number).sort((a, b) => a - b);
  let gf = 0;
  for (const n of poz) {
    const t = p.pozicije[n];
    const g = t.oc === 'C' ? 1 : 0;
    if (g !== gf) { o.push('GF ' + g); gf = g; }
    o.push(naredbaPD(n, t));
  }
  if (gf) o.push('GF 0');
  if (opcije.program !== false) o.push(...programRedci(v));
  return o;
}

/** tekst za preuzimanje (.txt): priprema + program */
export function tekstZaPreuzimanje(v) {
  const prip = pripremaNaredbe(v, { program: false });
  const red = ["' FORTRONIQ - RV-M1 - vjezba " + v.id.slice(1)];
  if (prip.length) red.push("' 1) priprema: pozicije (izravno, privjesak OFF)", ...prip);
  if (v.program) red.push("' 2) program (posalji redak po redak, zatim RN)", ...programRedci(v));
  return red.join('\r\n') + '\r\n';
}

/**
 * Scenarij vanjskih signala (SIM RV / PLC) za izvođenje programa u simulatoru ili testu.
 * dum = objekt iz napraviDUM1 (rvm1_mrl.js). Vraća { korak(dt), gotovo(), indeks(), zapis[], odjavi() }.
 * Događaji se ispunjavaju redom; uvjet sljedećeg vrijedi tek nakon prethodnog:
 *   {nakon:s} — s sekundi nakon prethodnog događaja (ili početka), {redak:n} — program je izveo redak n,
 *   {izlaz:b, v} — izlaz b ima vrijednost v, {signal:'RDY'|'BUSY', v} — signal rukovanja ima vrijednost v.
 */
export function napraviScenarij(dum, sc) {
  const dog = (sc && sc.dogadaji) || [];
  let i = 0, t = 0;
  const vidjeni = new Set(), zapis = [];
  const odjavi = dum.na('redak', (e) => { if (e && e.redak != null) vidjeni.add(e.redak); });
  function ispunjeno(k) {
    if (!k) return true;
    if (k.nakon != null) return t >= k.nakon;
    if (k.redak != null) return vidjeni.has(k.redak);
    if (k.izlaz != null) return dum.izlaz(k.izlaz) === (k.v ? 1 : 0);
    if (k.signal != null) return dum.izlaz(k.signal) === (k.v ? 1 : 0);
    return true;
  }
  function korak(dt) {
    t += dt || 0;
    let n = 0;
    while (i < dog.length && n++ < 20 && ispunjeno(dog[i].kad)) {
      const d = dog[i];
      dum.postaviUlaz(d.ulaz, d.v);
      zapis.push({ i, opis: d.opis || '', ulaz: d.ulaz, v: d.v });
      i++; t = 0; vidjeni.clear();
    }
  }
  return { korak, gotovo: () => i >= dog.length, indeks: () => i, zapis, odjavi };
}
