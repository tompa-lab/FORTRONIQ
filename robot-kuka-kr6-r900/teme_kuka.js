// teme_kuka.js — 17 interaktivnih 2D tema „Kako radi” za industrijski robot KUKA KR AGILUS (KR 6 R900)
// (DOS ForTroniQ, područje robot-kuka-kr6-r900). ES modul bez ovisnosti.
// Izvozi: TEME (naslovi, engleski nazivi, tekstovi), prikazi(el, id) → { unisti() }
// i postaviPodatke(obj) — stranica prije prvog prikaza predaje vrijednosti iz kuka_podaci.js (jedini izvor istine).
// Tekst i grafika su vlastiti. Što KUKA ne objavljuje, označeno je kao pretpostavka, primjer ili pojednostavljenje.

/* =========================================================== podaci
   Svi brojevi koje teme koriste nalaze se OVDJE. Kratice izvora (PODACI_KUKA.md §12):
   [MA-sixx] KR AGILUS sixx Assembly Instructions V8 (2013.) · [SPEZ-2] Spez KR AGILUS-2 V4 (2019.) · [LIST-2] list podataka KR 6 R900-2 (2023.)
   [PB0001] brošura KR AGILUS · [URDF] ROS-Industrial kr6r900sixx · [KSS82] KSS 8.2 upute za krajnje korisnike
   [SPEZ-C4c] KR C4 compact specifikacija V10 · [BA-C4c] KR C4 compact upute za rad V5 · [MA-C5m] KR C5 micro upute V4
   [SP2] KUKA priopćenje smartPAD-2 (2018.) · [FZI] pregled KUKA sučelja · [LARIS] lab-vježba KR3 · [RASS] Festo InfoPortal / priručnik RASS
   [FOTO] fotografija ćelije · [OZ-KSS] opće znanje KSS (nije potvrđeno javnim dokumentom) · [izračun] · [pp] pretpostavka
   Stranica može prije prikaza pozvati postaviPodatke({...}); objekti se spajaju dubinski. */
const D = {
  varijanta: 'sixx',                         // 'sixx' | '-2' — Tomislav navodi „sixx”; bijela boja i godina upućuju na -2 [pp]
  upravljac: 'krc5micro',                    // 'krc5micro' | 'krc4compact' — nije potvrđeno fotografijom [pp]
  privjesak: 'smartpad2',                    // 'smartpad2' | 'smartpad' [pp, jaka]
  robot: 'KUKA KR AGILUS (KR 6 R900)',
  dh: { d1: 400, a1: 25, a2: 455, a3: 35, d4: 420, d6: 80 },          // mm [URDF], [PB0001]
  osi: [                                                               // opseg [MA-sixx 17], [SPEZ-2]; brzine °/s
    { ime: 'A1', min: -170, max: 170, v: { sixx: 360, '-2': 360 } },
    { ime: 'A2', min: -190, max: 45, v: { sixx: 300, '-2': 300 } },
    { ime: 'A3', min: -120, max: 156, v: { sixx: 360, '-2': 360 } },
    { ime: 'A4', min: -185, max: 185, v: { sixx: 381, '-2': 450 } },
    { ime: 'A5', min: -120, max: 120, v: { sixx: 388, '-2': 450 } },
    { ime: 'A6', min: -350, max: 350, v: { sixx: 615, '-2': 540 } }
  ],
  doseg: 901.5,                                                        // mm [PB0001]
  home: [0, -90, 90, 0, 0, 0],                                         // $H_POS [LARIS]
  homeFlange: [525, 0, 890],                                           // mm [izračun]
  umjeravanje: { kut: [0, -90, 90, 90, 0, 0], izvor: 'SPEZ-2', provjeriti: true },  // -2 doslovno; sixx [nedostaje]
  transport: [0, -105, 156, 0, 120, 0],                                // sixx [MA-sixx 97]
  ponovljivost: { sixx: 0.03, '-2': 0.02 },                            // mm [MA-sixx 16], [SPEZ-2]
  teret: { naz: 3, max: { sixx: 6, '-2': 6.7 } },                      // kg [MA-sixx 22], [LIST-2]
  t1: 250,                                                             // mm/s [KSS82]
  ipo: 12, ipoPotvrdjeno: false,                                       // ms [OZ-KSS]
  stop0: {                                                             // [kut °, vrijeme s] A1–A3, ispruženost 100 %, POV 100 %, najveći teret
    sixx: [[113.59, 0.507], [126.76, 0.684], [68.10, 0.370]],          // [MA-sixx 47]
    '-2': [[39.92, 0.22], [35.49, 0.24], [34.78, 0.17]]                // [SPEZ-2 4.9.4.1]
  },
  ventili: { broj: 3, tip: '4/2', pMax: 7, f: 10, U: 24, I: 25, DO: [[7, 10], [8, 11], [9, 12]], navoj: 'M5', filtar: 5 },  // sixx [MA-sixx 93–94]
  ioZapesce: { ul: 6, izl: 2 },                                        // [PB0001]
  prirubnica: { krug: 31.5, navoj: 'M5', centr: '5 H7', norma: 'ISO 9409-1' },               // [MA-sixx 23], [SPEZ-2]
  kabeli: { duljine: [1, 4, 7, 15, 25], rMot: 50, rPod: 30 },          // m, mm [MA-sixx 91], [SPEZ-2]
  krc4compact: { naziv: 'KR C4 compact', m: 33, mjere: '460 × 483 × 271 mm', S: 2, Q: 400, ip: 'IP20', osi: 6, U: '200–230 V AC', smartpad: 'X19' },   // [SPEZ-C4c]
  krc5micro: { naziv: 'KR C5 micro', m: 9.8, mjere: null, S: 1.3, Q: 250, ip: 'IP20', osi: 6, U: '1 × 200–240 V AC', smartpad: 'smartPAD-2' },          // [MA-C5m]; mjere [nedostaje]
  smartpad: { naziv: 'smartPAD', zaslon: 8.4, m: 1.1, ip: 'IP54', omog: 3, jog: 6, jogPretp: true },     // [SPEZ-C4c]; broj tipki za gibanje [pp]
  smartpad2: { naziv: 'smartPAD-2', zaslon: 8.4, m: 1.1, ip: 'IP54', omog: 4, jog: 8, jogPretp: false }, // [SP2], [MA-C5m]
  stanica: { alati: 4, tlak: 6, izmjenjivac: 'Zimmer WWR40', izmjPretp: true },                          // [FOTO] plakat TOOL1–TOOL4; izmjenjivač iz standardne RASS [RASS] [pp]
  alati: [                                                             // TOOL1–TOOL4: duljine i namjena [pp] — nisu izmjerene
    { ime: 'TOOL1', opis: 'vakuumska prihvatnica', z: 115 },
    { ime: 'TOOL2', opis: 'paralelna prihvatnica (veća)', z: 135 },
    { ime: 'TOOL3', opis: 'paralelna prihvatnica (manja)', z: 125 },
    { ime: 'TOOL4', opis: 'četvrti alat (nepoznat)', z: 100 }
  ],
  primjer: {                                                           // ILUSTRACIJA, nisu podaci robota
    i: 100, eta: 0.8,                                                  // omjer i stupanj djelovanja osi [pp]
    valni: { zf: 60, zc: 62 }, ciklo: { zatici: 12 },
    tauStrujna: 0.5, tauBrzinska: 4                                    // ms
  }
};
function spoji(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') spoji(a[k], b[k]); else a[k] = b[k]; } }
export function postaviPodatke(o) { if (o && typeof o === 'object') spoji(D, o); }

/* =========================================================== oblikovanje brojeva */
const hr = (n, d = 1) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d).replace('.', ',').replace('-', '−');
const hrp = (n, d = 1) => (n > 0.5 * Math.pow(10, -d) ? '+' : '') + hr(n, d);
const tis = n => { const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (n < -0.5 ? '−' : '') + s; };
const vMax = i => D.osi[i].v[D.varijanta] || D.osi[i].v.sixx;
const VAR = () => D.varijanta === '-2' ? 'KR 6 R900-2' : 'KR 6 R900 sixx';
const UPR = () => D.upravljac === 'krc4compact' ? D.krc4compact : D.krc5micro;
const PAD = () => D.privjesak === 'smartpad' ? D.smartpad : D.smartpad2;
const kutovi = q => q.map(v => hrp(v, 0) + '°').join(', ');

/* =========================================================== tekstovi */
export const TEME = {
  os: {
    naslov: 'Sastav osi: motor, kočnica, rezolver, prijenosnik',
    engl: 'Axis drive train: servo motor, brake, resolver, gear unit',
    get uvod() {
      return [
        `Svaka od šest osi robota ${D.robot} ima isti lanac: servomotor s kočnicom i rezolverom na stražnjem kraju vratila, prijenosnik koji smanjuje brzinu i povećava moment, i izlaznu prirubnicu na koju je vezan sljedeći članak. KUKA navodi da je svaka os opremljena kočnicom, a da je pretvornik signala rezolvera (RDC) ugrađen u robota.`,
        `Prijenosnik množi moment s omjerom i (umanjeno za gubitke η), a brzinu dijeli s i. Zato motor relativno male snage i velike brzine može držati i ubrzavati članak s teretom. Rezolver mjeri kut motora, a kut osi upravljanje izračunava dijeljenjem s omjerom — na izlazu prijenosnika nema drugog davača.`
      ];
    },
    get kako() { return `Odaberi os i pokreni je. Klizačem zadaj brzinu osi (najviše ${vMax(0)}–${vMax(5)} °/s, ovisno o osi, za ${VAR()}) i moment tereta na izlazu. Prati kako se brzina i moment mijenjaju kroz lanac: debljina strelice toka je moment, brzina točkica je brzina vrtnje. Zatvori kočnicu — motor stoji iako ima zadanu brzinu, a moment tereta preuzima kočnica.`; },
    get napomena() { return `Omjer i = ${D.primjer.i} : 1 i η = ${hr(D.primjer.eta, 2)} samo su primjer: KUKA ne objavljuje omjere, vrstu prijenosnika, tip ni snagu motora za KR AGILUS. Brzine osi su iz kataloga (${VAR()}). Vrtnja motora prikazana je usporeno, a broj okretaja izračunat je iz primjera omjera.`; }
  },
  prijenosnik: {
    naslov: 'Prijenosnik u robotskom zglobu: valni i cikloidni',
    engl: 'Reduction gear: strain wave and cycloidal',
    get uvod() {
      return [
        'Zglobovi robota trebaju veliku redukciju (desetke do više od sto puta) u jednom stupnju, malo mjesta, malu masu, gotovo nikakvu zračnost i veliku krutost. U robotici se zato najčešće koriste dva tipa: valni prijenosnik (strain wave) i cikloidni prijenosnik. Oba postižu veliki omjer jer se izlaz pomakne samo za razliku u broju zubi ili zatika po jednom okretaju ulaza.',
        'Valni: eliptični generator iznutra deformira tanki elastični zupčanik koji zahvaća kruti prsten na dva mjesta; s dva zuba razlike omjer je z_f / (z_c − z_f). Cikloidni: ekscentar vodi disk s izbočinama (jedna manje od broja zatika) po prstenu zatika; disk se po okretaju ekscentra zakrene za jedan zub unatrag, omjer je (broj zatika − 1). Za KR AGILUS KUKA vrstu prijenosnika javno ne objavljuje.'
      ];
    },
    kako: 'Odaberi tip i pokreni ulaz. Crvena oznaka na izlazu pokazuje koliko se izlaz zakrene za jedan okretaj ulaza i u kojem smjeru. Donji graf je karakteristika torzije zgloba: moment na izlazu prema kutu zakreta. Klizačem zadaj zračnost i krutost, a moment njiši gumbom „Njihanje momenta” — u području zračnosti izlaz se pomiče bez otpora, a nagib pravca je krutost.',
    napomena: 'Tip prijenosnika za KR AGILUS nije javno objavljen — prikaz je načelna usporedba dvaju tipova koji se u robotici koriste, a ne opis ovog robota. Brojevi zubi i zatika (60/62 i 12) odabrani su radi jasnog crteža; stvarni zglobovi imaju više zubi i veće omjere. Zračnost i krutost na grafu su primjer, ne podatak. Vrtnja je usporena.'
  },
  kocnica: {
    naslov: 'Elektromagnetska kočnica: zatvorena bez struje',
    engl: 'Spring-applied electromagnetic holding brake',
    get uvod() {
      return [
        'Kočnica na motoru svake osi radi po načelu „zatvorena bez struje”: opruge pritišću kotvu na tarni disk koji je ozubljen s vratilom motora, pa se vratilo ne može okrenuti. Kad zavojnica dobije 24 V, elektromagnet privuče kotvu preko zračnog raspora, tarni disk je slobodan i motor se vrti.',
        'Tako nestanak napajanja, isključenje pogona ili kabel u kvaru uvijek vode u kočenje — to je sigurno stanje. Kočnica je kočnica za držanje: upravljanje je otpušta tek kad servopojačalo već drži os momentom, a zatvara je kad os miruje (osim kod STOP 0, kad koči i gibanje u tijeku).'
      ];
    },
    kako: 'Gumbom otpusti ili zatvori kočnicu i prati kotvu, raspor i struju zavojnice. „Nestanak struje” pokazuje da kočnica zatvara sama. „Test kočnice” provodi provjeru: os miruje, kočnica je zatvorena, motor zadaje ispitni moment i nadzire se pomak. Uključi kvar „istrošena obloga” i ponovi test. „Uređaj za otpuštanje” prikazuje ručno otpuštanje bez upravljanja.',
    get napomena() { return `Da je izvedba opružna elektromagnetska, naša je pretpostavka (uobičajeno za KUKA); KUKA potvrđuje samo da svaka os ima kočnicu [MA-sixx], [SPEZ-2]. Momenti držanja, struja zavojnice i tijek testa kočnice su primjer — test kočnice u KSS-u postoji kao funkcija sigurnosnog upravljanja [OZ-KSS]. Ručni uređaj za otpuštanje (opcija) spaja se na A1 umjesto kabela X30 i otpušta glavne osi ili osi zapešća [MA-sixx 118]; nakon toga osi treba ponovno umjeriti.`; }
  },
  resolver: {
    naslov: 'Rezolver i RDC pretvornik',
    engl: 'Resolver, Resolver-to-Digital Converter',
    uvod: [
      'Rezolver je okretni transformator bez elektronike u sebi. Uzbudni namot na rotoru (napaja se beskontaktno, preko okretnog transformatora) dobiva izmjenični napon nosive frekvencije. Na statoru su dva namota zakrenuta za 90°: u njima se inducira isti nosivi napon, ali pomnožen sa sin θ, odnosno cos θ, gdje je θ kut rotora.',
      'Pretvornik RDC (Resolver Digital Converter) demodulira oba signala i iz omotnica računa kut θ = atan2(u_sin, u_cos). Odnos dvaju signala ne ovisi o amplitudi, pa ga temperatura i starenje namota malo mijenjaju. U KR AGILUS-u RDC je ugrađen u robota i kutove motora šalje upravljanju digitalno.'
    ],
    kako: 'Pokreni rotor ili ga zaustavi i zadaj kut klizačem. Gore su namoti i strelica magnetskog polja, dolje nosivi signali u_sin i u_cos s omotnicama. Krug desno prikazuje točku (u_cos, u_sin) — njezin kut je izračunati θ. Uključi šum: kut ostaje točan jer se računa iz omjera. Usporedi s inkrementalnim enkoderom u tablici.',
    napomena: 'Prikazan je rezolver s jednim parom polova; broj polova, frekvencija nosioca i razlučivost RDC-a za KR AGILUS nisu objavljeni. Da se na svakom motoru nalazi rezolver, izvedeno je iz naziva RDC u dokumentaciji upravljanja [BA-C4c]. Nosiva frekvencija prikazana je jako usporeno.'
  },
  umjeravanje: {
    naslov: 'Umjeravanje osi (mastering) EMD-om',
    engl: 'Mastering with the Electronic Mastering Device',
    get uvod() {
      return [
        'Rezolver točno mjeri kut motora, ali upravljanje mora znati i gdje je mehanička nula osi. Umjeravanjem se na svakoj osi pronađe referentni položaj i pohrani pomak između njega i očitanja mjernog sustava. Na svakoj osi je mjerni uložak na jednom dijelu i urezana oznaka (zarez) na drugom.',
        `Elektronički uređaj za umjeravanje EMD priključuje se na robota (sixx: priključak X32 MicroEMD na sučelju A1). Pipalo u ulošku klizi po površini; os se polako vozi preko oznake, pipalo upadne u zarez, a najdublja točka je referentni položaj. Položaj umjeravanja za KR 6 R900-2 prema specifikaciji: ${kutovi(D.umjeravanje.kut)}.`
      ];
    },
    kako: 'Odaberi os i pritisni „Umjeri os”: os se iz predpoložaja polako vozi preko oznake, graf bilježi dubinu pipala, a u najdubljoj točki upravljanje pohranjuje pomak. Zatim izazovi gubitak umjerenosti (sudar, ručno otpuštanje kočnice, zamjena motora): prikazani kut osi više ne odgovara stvarnom. Ponovnim umjeravanjem pogreška nestaje.',
    get napomena() { return `Položaj umjeravanja preuzet je iz specifikacije KR AGILUS-2 [SPEZ-2] (vrijednost A4 = 90° izvor navodi doslovno, provjeriti u priručniku robota); za sixx izvadak ne daje tablicu. Oblik zareza, hod pipala i brzina vožnje su načelni [OZ-KSS]. Iznosi pogreške nakon „gubitka” su primjer.`; }
  },
  servoRegulacija: {
    naslov: 'Kaskadna regulacija osi: položaj – brzina – struja',
    engl: 'Cascade servo control, interpolation cycle',
    get uvod() {
      return [
        `Planer putanje računa gibanje, a interpolator svakih ${D.ipo} ms (interpolacijski takt) daje nove zadane kutove svih osi. Regulacija svake osi je kaskadna: petlja položaja iz razlike zadanog i stvarnog kuta daje zadanu brzinu, petlja brzine iz razlike brzina daje zadanu struju, a strujna petlja u servopojačalu podešava napon motora tako da teče zadana struja — moment.`,
        'Svaka unutarnja petlja mora biti znatno brža od vanjske. Kut i brzinu daje rezolver motora preko RDC-a. Zbog konačne brzine petlje položaja stvarni kut uvijek malo kasni za zadanim (pogreška slijeđenja); pojačanje Kp je smanjuje, a premalo prigušenje (Kv) izaziva njihanje.'
      ];
    },
    kako: 'Pritisni „Pomakni os”: os ide 30° po profilu brzine. Puna crta je stvarni kut, crtkana zadani. Mijenjaj pojačanja Kp i Kv i gledaj pogrešku slijeđenja i njihanje. „Udar tereta” naglo doda moment. U prikazu „Uvećano” vidi se da zadana vrijednost interpolatora stiže u koracima takta, a pogon između njih fino interpolira.',
    get napomena() { return `Interpolacijski takt ${D.ipo} ms ${D.ipoPotvrdjeno ? 'potvrđen je izvorom' : 'je uobičajena vrijednost KSS-a koju nismo mogli potvrditi javnim dokumentom [OZ-KSS]'}. Pojačanja, moment tromosti i vremenske konstante petlji (strujna ${hr(D.primjer.tauStrujna, 1)} ms, brzinska ${D.primjer.tauBrzinska} ms) su primjer — KUKA ih ne objavljuje. Model je jedna kruta os bez elastičnosti prijenosnika.`; }
  },
  kinematikaDH: {
    naslov: 'Direktna kinematika: DH okviri šest osi',
    engl: 'Forward kinematics, Denavit–Hartenberg frames',
    get uvod() {
      return [
        `Položaj prirubnice slijedi iz kutova osi i šest stalnih duljina članaka: visina osi A2 ${D.dh.d1} mm, pomak A2 od osi A1 ${D.dh.a1} mm, nadlaktica ${D.dh.a2} mm, pomak podlaktice ${D.dh.a3} mm, podlaktica do točke zapešća ${D.dh.d4} mm i točka zapešća do čela prirubnice ${D.dh.d6} mm. Svakom članku pridružen je koordinatni okvir; četiri parametra (θ, d, a, α) opisuju prijelaz s jednog okvira na sljedeći.`,
        `Umnožak šest transformacija daje položaj i orijentaciju prirubnice ($FLANGE) u sustavu podnožja ($ROBROOT). U položaju HOME (${kutovi(D.home)}) prirubnica je na X ${D.homeFlange[0]}, Y ${D.homeFlange[1]}, Z ${D.homeFlange[2]} mm, uz A 0°, B 90°, C 0°. Doseg do točke zapešća je ${hr(D.doseg, 1)} mm.`
      ];
    },
    kako: 'Pomiči klizače osi A1–A6 i prati robot u bočnom (X–Z) i tlocrtnom (X–Y) pogledu, tablicu DH parametara i položaj prirubnice uživo. Gumbi postavljaju HOME, sve osi na 0° i položaj s prirubnicom prema dolje. Kvačica prikazuje osi z okvira — oko njih se vrte zglobovi.',
    napomena: 'DH tablica je naša, izvedena iz URDF opisa robota i numerički provjerena; KUKA ne objavljuje DH parametre. Kutovi θ uključuju predznake i pomake (θ1 = −A1, θ3 = A3 − 90° …) jer KUKA broji smjerove osi drukčije od DH konvencije. Orijentacija A, B, C prikazana je u KUKA redoslijedu Z-Y-X. Crtež je projekcija bez obrisa kućišta.'
  },
  singularnosti: {
    naslov: 'Singularnosti: iznad glave, ispružena ruka, zapešće',
    engl: 'Singularities: overhead, extended, wrist',
    uvod: [
      'U singularnom položaju robot gubi jedan smjer gibanja: neka kombinacija osi ne pomiče prirubnicu, a u nekom smjeru prirubnica se ne može pomaknuti nikakvom brzinom osi. U blizini takvog položaja malo pravocrtno gibanje traži vrlo velike brzine osi.',
      'KR AGILUS ima tri takva položaja. Iznad glave: točka zapešća je na osi A1, pa A1 nije određen. Ispružena ruka: točka zapešća na pravcu kroz A2 i A3 — zbog pomaka podlaktice od 35 mm to je pri A3 ≈ +4,76°, a ne pri 0°. Zapešće: pri A5 = 0° osi A4 i A6 leže na istom pravcu i bilo koja kombinacija A4/A6 daje istu orijentaciju.'
    ],
    kako: 'Odaberi singularnost i klizačem približi robota singularnom položaju. Stupci pokazuju brzine osi potrebne da prirubnica napravi zadano gibanje (LIN 100 mm/s ili zakret 30 °/s u kritičnom smjeru); crvena crta je najveća brzina osi. Blizu singularnosti brzine rastu bez granice — u stvarnom robotu LIN/CIRC gibanje tada uspori ili stane s porukom o grešci.',
    napomena: 'Brzine osi računaju se iz Jakobijeve matrice naše kinematike (numerički); zadano kartezijsko gibanje odabrano je tako da pogađa smjer koji se u singularnosti gubi. Nazivi (overhead, extended, wrist) uobičajeni su u KUKA terminologiji [OZ-KSS]. Kut +4,76° = arctan(35/420) [izračun].'
  },
  koordinatniSustavi: {
    naslov: 'Koordinatni sustavi: WORLD, ROBROOT, BASE, FLANGE, TOOL',
    engl: 'Coordinate systems, A-B-C (ZYX) orientation',
    uvod: [
      'Upravljanje vodi pet vrsta koordinatnih sustava. WORLD je nepomičan sustav ćelije. ROBROOT je podnožje robota, zadano u WORLD-u. BASE je sustav radnog predmeta ili naprave (do 32 baze; BASE[0] je jednak WORLD-u). FLANGE je na čelu prirubnice, a TOOL je radna točka alata (TCP), zadana u FLANGE-u — TOOL[0] je sama prirubnica.',
      'Svaki sustav zadaje se s X, Y, Z (mm) i orijentacijom A, B, C (°): zakret A oko osi Z, zatim B oko nove osi Y, zatim C oko najnovije osi X. Kad promijeniš alat ili bazu, isti fizički položaj robota dobiva druge brojeve, a LIN gibanje i ručno gibanje u kartezijskim osima idu po osima odabranog sustava.'
    ],
    get kako() { return `Odaberi aktivni alat (TOOL1–TOOL${D.stanica.alati}) i bazu: TCP i brojevi položaja mijenjaju se iako robot stoji. U donjem prikazu klizačima zadaj A, B i C i promatraj kako se okvir zakreće redom oko Z, Y′ i X″; matrica orijentacije računa se uživo.`; },
    get napomena() { return `Festov plakat u ćeliji navodi TOOL1–TOOL4 [FOTO]; duljine alata (${D.alati.map(a => a.z).join(', ')} mm), njihova namjena i položaji ROBROOT i BASE u ćeliji su naša pretpostavka. Ćelija je prikazana pojednostavljeno, robot u položaju s prirubnicom prema dolje. Broj baza (32) [OZ-KSS].`; }
  },
  gibanjaKRL: {
    naslov: 'Vrste gibanja: PTP, LIN, CIRC',
    engl: 'Motion types: point-to-point, linear, circular',
    uvod: [
      'PTP vodi robota najbržim putem po osima: svaka os ide od početnog do ciljnog kuta, a upravljanje usklađuje osi tako da sve krenu i stanu zajedno (sinkroni PTP). Putanja TCP-a pritom nije pravac — ovisi o kinematici. PTP je jedino gibanje koje može proći kroz singularnost i obično je prvo gibanje u programu.',
      'LIN vodi TCP po pravcu, a CIRC po kružnom luku kroz pomoćnu i ciljnu točku, zadanom brzinom $VEL.CP (m/s) i uz stalnu promjenu orijentacije. Za njih upravljanje u svakom taktu rješava inverznu kinematiku.'
    ],
    get kako() { return `Odaberi vrstu gibanja i pritisni „Pokreni”. Gore je tlocrt robota s putanjom TCP-a, dolje profili brzina: za PTP brzine osi A1–A3 (u % najveće), za LIN i CIRC brzina TCP-a. Isključi „Sinkroni PTP” da vidiš kako bi osi stigle svaka u svoje vrijeme i koliko se putanja promijeni. Kvačica T1 ograničava brzinu TCP-a na ${D.t1} mm/s.`; },
    get napomena() { return `Profili brzine su trapezni s istim vremenom ubrzanja za sve osi (pretpostavka); stvarni KSS koristi i ograničenje trzaja. Najveće brzine osi su za ${VAR()} [MA-sixx], [SPEZ-2]. Orijentacija alata je stalna (prirubnica prema dolje), a A6 se ne prikazuje. Točke su odabrane za prikaz.`; }
  },
  'zaglađivanje': {
    naslov: 'Zaglađivanje: C_PTP, C_DIS, C_VEL',
    engl: 'Approximate positioning (blending)',
    uvod: [
      'Bez zaglađivanja robot u svakoj točki stane: uspori do nule i krene prema sljedećoj točki. Kad točka služi samo da robot zaobiđe prepreku, to je gubitak vremena. Uz dodatak zaglađivanja (u inline obrascu CONT) robot ne prolazi kroz točku, nego pored nje, i ne staje.',
      'C_DIS: zaglađivanje počinje kad je TCP bliže točki od zadane udaljenosti ($APO.CDIS, mm). C_VEL: počinje kad bi brzina pri kočenju prema točki pala ispod zadanog postotka. C_PTP: zaglađivanje PTP gibanja u prostoru osi, zadano postotkom ($APO.CPTP) — putanja tada nije geometrijski određena.'
    ],
    kako: 'Odaberi način i parametar pa pokreni. Putanja ide P1 → P2 → P3; P2 je pomoćna točka. Graf ispod prikazuje brzinu TCP-a i vrijeme ciklusa. Usporedi s gibanjem bez zaglađivanja: robot u P2 stane. Veća udaljenost ili postotak daje glađu i bržu putanju, ali dalje od P2.',
    napomena: 'Krivulja zaglađivanja prikazana je kao parabola (kvadratna Bézierova krivulja) između početka i kraja zaglađivanja; KSS koristi vlastite krivulje. Za zaglađivanje upravljanje mora unaprijed čitati program (prethodno izvođenje) [OZ-KSS]. Ubrzanja i brzine su primjer.'
  },
  nacinRada: {
    naslov: 'Načini rada: T1, T2, AUT, AUT EXT',
    engl: 'Operating modes',
    get uvod() {
      return [
        `Način rada bira se ključem na privjesku: ključ otvara upravitelja veze, u kojem se odabere način. T1 je ručni rad smanjenom brzinom — programirana i ručna brzina TCP-a najviše ${D.t1} mm/s; služi za učenje točaka, ispitivanje i programiranje. T2 je ručni rad programiranom brzinom, za provjeru programa; ručno gibanje (jog) u T2 nije moguće.`,
        'U T1 i T2 robot se giba samo dok operater drži uređaj za omogućavanje u srednjem položaju. AUT je automatski rad bez nadređenog upravljanja, a AUT EXT automatski rad u kojem programe pokreće nadređeno upravljanje (PLC) — tako robot radi u stanici CP Factory. U automatskim načinima vrata zaštitne ograde moraju biti zatvorena.'
      ];
    },
    kako: 'Umetni ključ, okreni ga i odaberi način. Zatim zadaj programiranu brzinu, drži uređaj za omogućavanje i pritisni Start. Prati stvarnu brzinu TCP-a, tko smije pokrenuti program i što se dogodi kad otvoriš vrata ćelije. Tablica sažima pravila.',
    get napomena() { return `Pravila su iz KSS 8.2 [KSS82]; da je u stanici način AUT EXT, naša je pretpostavka po Festovoj arhitekturi (PLC pokreće programe). Da je zaštita operatera (vrata) djelotvorna samo u automatskim načinima, uobičajeno je ponašanje KSS-a [OZ-KSS]. Reakcija na otvorena vrata u AUT/AUT EXT prikazana je kao sigurnosni STOP 1.`; }
  },
  zaustavljanje: {
    naslov: 'Kategorije zaustavljanja: STOP 0, STOP 1, STOP 2',
    engl: 'Stop categories 0, 1, 2',
    get uvod() {
      return [
        'STOP 0: pogoni se odmah isključuju, a kočnice zatvaraju — robot staje kočnicama, svaka os za sebe, pa TCP napušta programiranu putanju. STOP 1: robot koči po putanji pogonima, a kad stane, pogoni se isključuju i kočnice zatvaraju. STOP 2: robot koči po putanji, ali pogoni ostaju uključeni i drže položaj, uz nadzor mirovanja.',
        `KUKA objavljuje put i vrijeme zaustavljanja za STOP 0 (ispruženost 100 %, override 100 %, najveći teret). Za ${VAR()}: A1 ${hr(D.stop0[D.varijanta][0][0], 2)}° u ${hr(D.stop0[D.varijanta][0][1], 3)} s, A2 ${hr(D.stop0[D.varijanta][1][0], 2)}° u ${hr(D.stop0[D.varijanta][1][1], 3)} s, A3 ${hr(D.stop0[D.varijanta][2][0], 2)}° u ${hr(D.stop0[D.varijanta][2][1], 3)} s.`
      ];
    },
    kako: 'Odaberi okidač (E-STOP, pušten uređaj za omogućavanje, nestanak napajanja …) i pokreni robota. Kad pritisneš „Izazovi zaustavljanje”, robot koči prema kategoriji koja pripada okidaču: u tlocrtu se vidi odstupa li TCP od putanje, a graf prikazuje brzinu, pogone i kočnice u vremenu. Promijeni inačicu robota i usporedi zaustavne putove STOP 0.',
    get napomena() { return `Okidači i kategorije su iz KSS 8.2 [KSS82]. Zaustavni putovi STOP 0 za A1–A3 su iz [MA-sixx 47] i [SPEZ-2] (velika razlika među generacijama tako je navedena u izvorima). Vremena STOP 1 i STOP 2 nisu objavljena — prikazana su primjerom. Za STOP 0 iz objavljenog kuta i vremena izveden je model „kašnjenje + jednoliko usporenje” po osi, pa je put pri manjoj brzini procjena; za A4–A6 podaci nisu objavljeni i uzete su vrijednosti A3 (pretpostavka).`; }
  },
  privjesakTipke: {
    naslov: 'Privjesak za učenje: tipke i uređaj za omogućavanje',
    engl: 'Teach pendant (smartPAD), enabling switch',
    get uvod() {
      return [
        `Privjesak ${PAD().naziv} ima zaslon osjetljiv na dodir ${hr(PAD().zaslon, 1)}″ i fizičke elemente za sve što se mora moći napraviti bez gledanja u zaslon: gljivu E-STOP, ključ za izbor načina rada, 6D miš i tipke za ručno gibanje (${PAD().jog} pari), tipke za override, Start, Start unatrag i STOP. Straga su uređaji za omogućavanje (${PAD().omog}), zelena tipka Start i USB.`,
        'Uređaj za omogućavanje ima tri položaja: otpušten, srednji i pritisnut do kraja. Robot se u T1 i T2 smije gibati samo u srednjem položaju. Kad ga operater pusti ili ga u panici stisne do kraja, robot staje — prirodna reakcija čovjeka u opasnosti je ili pustiti ili stisnuti.'
      ];
    },
    kako: 'Klikni element na crtežu ili u popisu za opis. Okreni crtež da vidiš stražnju stranu. U donjem dijelu pomiči uređaj za omogućavanje kroz tri položaja i pritišći tipke za gibanje osi A1: pogoni se uključuju samo u srednjem položaju, a do kraja pritisnut uređaj izaziva sigurnosni STOP 1.',
    get napomena() { return `Crtež je naš i shematski, nije vjeran oblik privjeska. Raspored elemenata prema KSS 8.2 [KSS82] opisan je za smartPAD; za smartPAD-2 pretpostavljamo isti osnovni raspored [pp]. Broj uređaja za omogućavanje: smartPAD ${D.smartpad.omog} [SPEZ-C4c], smartPAD-2 ${D.smartpad2.omog} [MA-C5m]; tipke za gibanje: smartPAD-2 ${D.smartpad2.jog} [SP2]${D.smartpad.jogPretp ? `, smartPAD ${D.smartpad.jog} (pretpostavka)` : ''}.`; }
  },
  razvodEnergije: {
    naslov: 'Unutarnji razvod energije, signala i zraka',
    engl: 'Internal energy supply system, wrist valves',
    get uvod() {
      return [
        'Svi motorni i podatkovni kabeli osi A1–A6 vode kroz robota i završavaju utičnicama na sučelju A1 straga na podnožju: X30 motorni kabel, X31 podatkovni (RDC), X32 MicroEMD za umjeravanje. Kroz robota prolazi i unutarnji energetski sustav: podatkovni vod (CAT5, XPN1, prema EtherCAT-u na zapešću), dva zračna voda AIR1 i AIR2 i signali do sučelja A4 na zapešću.',
        `Kod sixx su u zapešću ${D.ventili.broj} bistabilna ${D.ventili.tip} elektromagnetska ventila (najviše ${D.ventili.pMax} bar, ${D.ventili.f} Hz, ${D.ventili.U} V DC / ${D.ventili.I} mA, navoj ${D.ventili.navoj}). Bistabilni ventil ima dva svitka: kratki impuls na jednom izlazu prebaci ga u jedan položaj i on tamo ostaje i bez struje. Na zapešću je i ${D.ioZapesce.ul} ulaza i ${D.ioZapesce.izl} izlaza za senzore alata.`
      ];
    },
    kako: 'Uključi ili isključi slojeve (motori, podaci, zrak, signali alata) i prati vodove kroz robota. Klikni tipke ventila: impuls na prvom izlazu (npr. DO7) prebaci ventil u položaj A, na drugom (DO10) u položaj B — zrak ide u drugi priključak prihvatnice. Prebaci inačicu robota na -2 i usporedi.',
    get napomena() { return `Ventili i dodjela izlaza DO7–DO12 vrijede za sixx [MA-sixx 93–94]; brojevi $OUT ovise o mapiranju u WorkVisualu. Za -2 KUKA nudi energetske sustave „CTR AIR” i „AIR CTR GIG”, ali sadržaj nije javan — prikazani su vanjski ventili uz podnožje (Festov ventilski blok s fotografije) kao pretpostavka. Trase vodova u robotu su načelne.`; }
  },
  izmjenaAlata: {
    naslov: 'Izmjena alata u stanici: spremište TOOL1–TOOL4',
    engl: 'Automatic tool change, tool magazine',
    get uvod() {
      return [
        `Na prirubnici robota je nepomični dio izmjenjivača alata, a svaka prihvatnica nosi slobodni dio. U spremištu stanice stoji ${D.stanica.alati} alata (TOOL1–TOOL${D.stanica.alati}). Izmjenjivač se zaključava i otključava pneumatski (stanica radi na ${D.stanica.tlak} bar), a kroz njega se prenose i zrak i električni signali do alata.`,
        'Izmjena je slijed: robot odloži trenutni alat u slobodno mjesto, otključa izmjenjivač, odmakne se, dođe iznad novog alata, spusti se, zaključa i provjeri senzorima da je alat na prirubnici, a mjesto u spremištu prazno. Tek tada upravljanje prebaci aktivni TOOL — TCP se pomakne na vrh novog alata.'
      ];
    },
    kako: 'Odaberi ciljni alat i pokreni izmjenu ili je prolazi korak po korak. Prati signale prisutnosti u spremištu, stanje zaključavanja i aktivni TOOL. Uključi kvar „tlak ispod granice” ili „senzor prisutnosti ne javlja” — slijed stane na koraku provjere i javlja grešku.',
    get napomena() { return `Broj alata (4) je s Festova plakata u ćeliji [FOTO]. Izmjenjivač ${D.stanica.izmjenjivac} i senzori prisutnosti preuzeti su iz standardne stanice RASS s robotom Mitsubishi [RASS]; za KUKA inačicu stanice nisu potvrđeni. Imena signala, vremena koraka i ponašanje pri padu tlaka su pretpostavka.`; }
  },
  upravljac: {
    naslov: 'Upravljač robota i tok signala',
    engl: 'Robot controller, EtherCAT, signal flow',
    get uvod() {
      const u = UPR();
      return [
        `Upravljač ${u.naziv} (${u.U}, ${hr(u.S, 1)} kVA, ${hr(u.m, 1)} kg, ${u.ip}, najviše ${u.osi} osi) sadrži upravljačko računalo s KUKA System Software (interpreter KRL-a, planer putanje, interpolator, sigurnosno upravljanje), napajanje s mrežnim filtrom i istosmjernim međukrugom, servopojačala za šest motora, kočni otpornik i sučelja.`,
        'Motorni kabel nosi struje motora i napajanje kočnica, a podatkovni kabel povezuje upravljač s RDC-om u robotu. Unutarnja veza upravljača sa servopojačalima i RDC-om je EtherCAT; prema PLC-u stanice upravljač je povezan preko sučelja KLI (u stanici vjerojatno PROFINET), a privjesak ima vlastiti priključak.'
      ];
    },
    kako: 'Odaberi upravljač. Klikni blok sheme za opis. „Tok naredbe” prati put od naredbe KRL-a do struje motora, „Povratna veza” put od rezolvera do upravljačkog računala, a „Nestanak napajanja” pokazuje kontrolirano gašenje: kočnice zatvaraju, a računalo pohranjuje podatke uz pomoć baterije.',
    get napomena() { return `Sastav je prema [SPEZ-C4c] i [MA-C5m]; unutarnji raspored blokova je načelan. Da je robot u stanici spojen preko PROFINET-a na KLI i da radi u AUT EXT, naša je pretpostavka. Vanjske mjere KR C5 micro u priručniku su samo na slici [nedostaje]. Tip upravljača u stanici nije potvrđen — zadano je ${UPR().naziv}.`; }
  }
};

const NS = 'http://www.w3.org/2000/svg';
const B = { crv: '#d64535', zel: '#1f9d55', nar: '#e08a1e', pl: '#3d8bd9', zut: '#f2c230', lj: '#8e5cc4' };
let brojac = 0;

function S(tag, a, rod) {
  const e = document.createElementNS(NS, tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v;
    else e.setAttribute(k, v);
  }
  if (rod) rod.appendChild(e);
  return e;
}
function H(tag, a, ...djeca) {
  const e = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const d of djeca) if (d != null) e.append(d);
  return e;
}
function T(g, x, y, txt, kl, anchor) {
  return S('text', { x, y, class: kl || 'tku-l', 'text-anchor': anchor || null, tekst: txt }, g);
}
const ogr = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = v => v.toFixed(1);
const RAD = Math.PI / 180;
const frac = x => x - Math.floor(x);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const pts = arr => arr.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
const put = (arr, zat) => arr.length ? 'M' + arr.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + (zat ? 'Z' : '') : '';
const kutN = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function postavi(el, a) { for (const k in a) el.setAttribute(k, typeof a[k] === 'number' ? f1(a[k]) : a[k]); }

// strelica (linija + glava): g.set(x1,y1,x2,y2)
function strel(g, x1, y1, x2, y2, o = {}) {
  const boja = o.boja || 'var(--ink)', w = o.w || 2.5, gl = o.gl || 11;
  const gr = S('g', { class: o.kl || null }, g);
  const ln = S('line', { 'stroke-width': w, 'stroke-linecap': 'round' }, gr);
  const pg = S('polygon', {}, gr);
  gr.boja = b => { ln.style.stroke = b; pg.style.fill = b; };
  gr.boja(boja);
  gr.set = (a, b, c, d) => {
    const dx = c - a, dy = d - b, L = Math.hypot(dx, dy);
    if (L < 1.5) { gr.style.display = 'none'; return; }
    gr.style.display = '';
    const ux = dx / L, uy = dy / L, g2 = Math.min(gl, L * 0.7);
    const bx = c - ux * g2, by = d - uy * g2;
    ln.setAttribute('x1', f1(a)); ln.setAttribute('y1', f1(b));
    ln.setAttribute('x2', f1(bx)); ln.setAttribute('y2', f1(by));
    pg.setAttribute('points', `${f1(c)},${f1(d)} ${f1(bx - uy * g2 * 0.55)},${f1(by + ux * g2 * 0.55)} ${f1(bx + uy * g2 * 0.55)},${f1(by - ux * g2 * 0.55)}`);
  };
  gr.set(x1, y1, x2, y2);
  return gr;
}
function luk(cx, cy, r, a0, a1) {
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  const vel = Math.abs(a1 - a0) > Math.PI ? 1 : 0, sm = a1 > a0 ? 1 : 0;
  return `M${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 ${vel} ${sm} ${f1(x1)},${f1(y1)}`;
}
// graf: okvir, mreža i pretvorba vrijednost → koordinata
function graf(g, x, y, w, h, o) {
  S('rect', { x, y, width: w, height: h, class: 'tku-graf' }, g);
  const X = v => x + (v - o.x0) / (o.x1 - o.x0) * w;
  const Y = v => y + h - (v - o.y0) / (o.y1 - o.y0) * h;
  for (const v of o.yt || []) {
    const yy = Y(v);
    S('line', { x1: x, y1: f1(yy), x2: x + w, y2: f1(yy), class: v === 0 && o.y0 < 0 ? 'tku-mreza0' : 'tku-mreza' }, g);
    if (o.ylab !== false) T(g, x - 6, yy + 5, (o.yf || String)(v), 'tku-ls', 'end');
  }
  for (const v of o.xt || []) {
    const xx = X(v);
    S('line', { x1: f1(xx), y1: y, x2: f1(xx), y2: y + h, class: 'tku-mreza' }, g);
    if (o.xlab !== false) T(g, xx, y + h + 18, (o.xf || String)(v), 'tku-ls', 'middle');
  }
  if (o.naslov) T(g, x, y - 9, o.naslov, 'tku-ls');
  return { X, Y, x, y, w, h };
}
// SVG element koji se ponaša kao gumb (klik, Enter, razmaknica)
function klikabilno(ctx, el, oznaka, fn) {
  el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', oznaka);
  el.classList.add('tku-klik');
  ctx.on(el, 'click', fn);
  ctx.on(el, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
}
function sporo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
// presjek zrake (px,py, smjer ux,uy) s preprekama [{tip:'seg',a,b}|{tip:'krug',c,r}] → udaljenost ili Infinity
function zraka(px, py, ux, uy, prepreke) {
  let best = Infinity;
  for (const o of prepreke) {
    if (o.tip === 'seg') {
      const ex = o.b[0] - o.a[0], ey = o.b[1] - o.a[1];
      const den = ux * ey - uy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const wx = o.a[0] - px, wy = o.a[1] - py;
      const t = (wx * ey - wy * ex) / den, s = (wx * uy - wy * ux) / den;
      if (t > 1e-9 && s >= 0 && s <= 1 && t < best) best = t;
    } else {
      const wx = px - o.c[0], wy = py - o.c[1];
      const b = wx * ux + wy * uy, c = wx * wx + wy * wy - o.r * o.r, d = b * b - c;
      if (d < 0) continue;
      const t = -b - Math.sqrt(d);
      if (t > 1e-9 && t < best) best = t;
    }
  }
  return best;
}

/* ------------------------------------------------------- petlja i čišćenje */
class Kontekst {
  constructor(root) {
    this.root = root; this.ciscenje = []; this.fje = []; this.rm = sporo();
    this.vidljiv = true; this.id = 0; this.tip = ''; this.zadnje = 0; this.zeli = false; this.unisten = false;
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver(z => {
        for (const u of z) this.vidljiv = u.isIntersecting;
        if (this.vidljiv) this._zakazi(); else this._stani();
      });
      this.io.observe(root);
    }
    this.on(document, 'visibilitychange', () => { if (document.hidden) this._stani(); else this._zakazi(); });
  }
  on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); this.ciscenje.push(() => el.removeEventListener(ev, fn, opt)); }
  petlja(fn) { this.fje.push(fn); }
  budi() { this.zeli = true; this._zakazi(); }
  _zakazi() {
    if (this.unisten || this.id || !this.zeli || !this.vidljiv || document.hidden) return;
    if (this.rm) { this.tip = 't'; this.id = setTimeout(() => this._okvir(performance.now()), 250); }
    else { this.tip = 'r'; this.id = requestAnimationFrame(t => this._okvir(t)); }
  }
  _stani() {
    if (!this.id) return;
    if (this.tip === 't') clearTimeout(this.id); else cancelAnimationFrame(this.id);
    this.id = 0; this.zadnje = 0;
  }
  _okvir(t) {
    this.id = 0;
    if (this.unisten) return;
    // u načinu „manje gibanja” animacija ide u koracima od 0,25 s
    const dt = this.zadnje ? Math.min((t - this.zadnje) / 1000, this.rm ? 0.4 : 0.05) : (this.rm ? 0.25 : 1 / 60);
    this.zadnje = t;
    let dalje = false;
    for (const f of this.fje) { try { if (f(dt)) dalje = true; } catch (e) { console.error(e); } }
    this.zeli = dalje;
    if (dalje) this._zakazi(); else this.zadnje = 0;
  }
  odgodi(fn, ms) { const id = setTimeout(() => { if (!this.unisten) fn(); }, ms); this.ciscenje.push(() => clearTimeout(id)); return id; }
  unisti() {
    this.unisten = true; this._stani();
    if (this.io) this.io.disconnect();
    for (const c of this.ciscenje) { try { c(); } catch (e) { /* ništa */ } }
    this.ciscenje = []; this.fje = [];
  }
}

/* ------------------------------------------------------- okvir jedne teme */
function okvir(el, id, ctx) {
  const T0 = TEME[id];
  const uid = 'tku' + (++brojac);
  let nk = 0;
  const sek = H('section', { class: 'tku', 'data-tema': id, 'aria-label': T0.naslov });
  const naslov = H('h3', { class: 'tku-naslov' }, T0.naslov + ' ', H('span', { class: 'tku-engl', tekst: '(' + T0.engl + ')' }));
  const uvod = H('div', { class: 'tku-uvod' });
  for (const p of T0.uvod) uvod.append(H('p', { tekst: p }));
  const scena = H('div', { class: 'tku-scena' });
  const upr = H('div', { class: 'tku-upr', role: 'group', 'aria-label': 'Upravljanje animacijom' });
  const ocitP = H('div', { class: 'tku-ocit' });
  const stanjeP = H('p', { class: 'tku-stanje', 'aria-live': 'polite' });
  const kako = H('div', { class: 'tku-kako' }, H('h4', { tekst: 'Kako radi' }), H('p', { tekst: T0.kako }));
  if (T0.napomena) kako.append(H('p', { class: 'tku-pretp' }, H('b', { tekst: 'Pojednostavljenja: ' }), T0.napomena));
  const desno = H('div', { class: 'tku-desno' }, upr, stanjeP, ocitP, kako);
  sek.append(naslov, uvod, H('div', { class: 'tku-tijelo' }, scena, desno));
  el.replaceChildren(sek);

  const ui = {
    uid, sek, scena, upr, ocitP, desno,
    svg(w, h, opis, kl) {
      const s = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opis, class: 'tku-svg' + (kl ? ' ' + kl : ''), focusable: 'false' });
      const defs = S('defs', {}, s);
      const p = S('pattern', { id: uid + '-sr' + (++nk), width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      S('rect', { width: 7, height: 7, class: 'tku-srafura-p' }, p);
      S('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'tku-srafura-c' }, p);
      s.defs = defs; s.srafura = `url(#${p.id})`;
      s.clip = (x, y, w2, h2) => { const c = S('clipPath', { id: uid + '-cl' + (++nk) }, defs); S('rect', { x, y, width: w2, height: h2 }, c); return `url(#${c.id})`; };
      scena.append(s);
      return s;
    },
    red(kl, u) { const r = H('div', { class: 'tku-red' + (kl ? ' ' + kl : '') }); (u || upr).append(r); return r; },
    skupina(u) { const g = H('div', { class: 'tku-skupina' }); (u || upr).append(g); return g; },
    gumb(tekst, fn, o = {}) {
      const b = H('button', {
        type: 'button', class: 'gumb' + (o.tanki ? ' tanki' : '') + ' tku-g' + (o.kl ? ' ' + o.kl : ''),
        'aria-label': o.aria || null, 'aria-pressed': o.pritisak == null ? null : String(!!o.pritisak)
      });
      b.textContent = tekst;
      if (fn) ctx.on(b, 'click', e => fn(e, b));
      let cilj = o.u;
      if (!cilj) { cilj = upr.lastElementChild; if (!cilj || !cilj.classList.contains('tku-red')) cilj = ui.red(); }
      cilj.append(b);
      return b;
    },
    // gumb play/pause s istim izgledom kao u svim temama
    igraj(st, kljuc, tekst, fn, u) {
      const b = ui.gumb(tekst, () => { st[kljuc] = !st[kljuc]; osv(); if (fn) fn(st[kljuc]); ctx.budi(); }, { pritisak: false, u });
      const osv = () => { b.textContent = st[kljuc] ? 'Pauza' : tekst; b.setAttribute('aria-pressed', String(!!st[kljuc])); };
      b.osvjezi = osv;
      return b;
    },
    seg(oznaka, opcije, vr, fn, u) {
      const w = H('div', { class: 'tku-seg' });
      const lab = H('span', { class: 'tku-seg-o', tekst: oznaka, id: uid + '-s' + (++nk) });
      const box = H('div', { class: 'tku-seg-b', role: 'group', 'aria-labelledby': lab.id });
      const btn = opcije.map(([v, t]) => {
        const b = H('button', { type: 'button', 'aria-pressed': 'false' });
        b.textContent = t;
        ctx.on(b, 'click', () => { if (w.dataset.v === String(v)) return; w.postavi(v); fn(v); });
        box.append(b);
        return [v, b];
      });
      w.postavi = v => { w.dataset.v = String(v); for (const [vv, b] of btn) b.setAttribute('aria-pressed', String(vv === v)); };
      w.gumbi = btn;
      w.postavi(vr);
      w.append(lab, box);
      (u || upr).append(w);
      return w;
    },
    klizac(oznaka, min, max, korak, vr, fmt, fn, u) {
      const kid = uid + '-k' + (++nk);
      const w = H('div', { class: 'tku-kl' });
      const l = H('label', { for: kid, tekst: oznaka });
      const o = H('output', { for: kid });
      const i = H('input', { type: 'range', id: kid, min, max, step: korak, value: vr });
      const upd = () => { o.textContent = fmt(+i.value); };
      ctx.on(i, 'input', () => { upd(); fn(+i.value); });
      upd();
      w.append(H('div', { class: 'tku-kl-g' }, l, o), i);
      (u || upr).append(w);
      w.ulaz = i; w.osvjezi = upd;
      w.postavi = v => { i.value = v; upd(); };
      return w;
    },
    kvacica(oznaka, vr, fn, u) {
      const kid = uid + '-c' + (++nk);
      const i = H('input', { type: 'checkbox', id: kid });
      i.checked = !!vr;
      const w = H('label', { class: 'tku-kv', for: kid }, i, H('span', { tekst: oznaka }));
      ctx.on(i, 'change', () => fn(i.checked));
      (u || upr).append(w);
      w.ulaz = i;
      w.postavi = v => { i.checked = !!v; };
      return w;
    },
    ocit(redovi, u) {
      const dl = H('dl', { class: 'tku-oc' });
      const set = {};
      for (const [k, t] of redovi) {
        const dd = H('dd', { tekst: '—' });
        const dt = H('dt', { tekst: t });
        dl.append(H('div', {}, dt, dd));
        set[k] = (v, kl) => { if (dd.textContent !== v) dd.textContent = v; const c = kl ? 'tku-' + kl : ''; if (dd.className !== c) dd.className = c; };
        set[k].naziv = t2 => { if (dt.textContent !== t2) dt.textContent = t2; };
      }
      (u || ocitP).append(dl);
      return set;
    },
    // okvir s formulama (redovi se osvježavaju uživo)
    formula(naslov, n, u) {
      const box = H('div', { class: 'tku-formula' });
      if (naslov) box.append(H('h4', { tekst: naslov }));
      const red = [];
      for (let k = 0; k < n; k++) { const p = H('p', {}); box.append(p); red.push(p); }
      (u || ocitP).append(box);
      box.set = (k, txt) => { if (red[k] && red[k].textContent !== txt) red[k].textContent = txt; if (red[k]) red[k].style.display = txt ? '' : 'none'; };
      return box;
    },
    sitno(txt, u) { const p = H('p', { class: 'tku-sitno', tekst: txt }); (u || ocitP).append(p); return p; },
    stanje(txt, vrsta) {
      if (stanjeP.textContent !== txt) stanjeP.textContent = txt;
      const c = 'tku-stanje' + (vrsta ? ' tku-' + vrsta : '');
      if (stanjeP.className !== c) stanjeP.className = c;
    }
  };
  return ui;
}


/* ------------------------------------------------------- kinematika (DH iz D.dh; mm, stupnjevi KUKA A1–A6) */
function dhM(th, d, a, al) {
  const ct = Math.cos(th), st = Math.sin(th), ca = Math.cos(al), sa = Math.sin(al);
  return [ct, -st * ca, st * sa, a * ct, st, ct * ca, -ct * sa, a * st, 0, sa, ca, d, 0, 0, 0, 1];
}
function mm4(A, B) {
  const C = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += A[i * 4 + k] * B[k * 4 + j]; C[i * 4 + j] = s; }
  return C;
}
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// DH redci: θ = −A1, A2, A3 − 90°, −A4, −A5, −A6 + 180° (uključuje Rz(180°) na FLANGE)
function dhRedci(q) {
  const h = D.dh;
  return [[-q[0], h.d1, h.a1, -90], [q[1], 0, h.a2, 0], [q[2] - 90, 0, h.a3, -90], [-q[3], h.d4, 0, -90], [-q[4], 0, 0, 90], [-q[5] + 180, h.d6, 0, 0]];
}
function fkK(q) {
  let T = I4();
  const okviri = [T];
  for (const [th, d, a, al] of dhRedci(q)) { T = mm4(T, dhM(th * RAD, d, a, al * RAD)); okviri.push(T); }
  return { T, okviri, p: [T[3], T[7], T[11]] };
}
// KUKA A, B, C (Z-Y-X) u stupnjevima iz rotacijskog dijela 4×4
function abcK(T) {
  const r11 = T[0], r12 = T[1], r21 = T[4], r22 = T[5], r31 = T[8], r32 = T[9], r33 = T[10];
  const B = Math.atan2(-r31, Math.hypot(r11, r21));
  let A, C;
  if (Math.abs(Math.cos(B)) < 1e-6) { C = 0; A = Math.atan2(-r12, r22); } else { A = Math.atan2(r21, r11); C = Math.atan2(r32, r33); }
  return [A / RAD, B / RAD, C / RAD];
}
function rotZYX(A, B, C) {        // stupnjevi → 3×3 (redak po redak)
  const ca = Math.cos(A * RAD), sa = Math.sin(A * RAD), cb = Math.cos(B * RAD), sb = Math.sin(B * RAD), cc = Math.cos(C * RAD), sc = Math.sin(C * RAD);
  return [ca * cb, ca * sb * sc - sa * cc, ca * sb * cc + sa * sc, sa * cb, sa * sb * sc + ca * cc, sa * sb * cc - ca * sc, -sb, cb * sc, cb * cc];
}
// numerička Jakobijeva matrica 6×6: redci vx, vy, vz [mm/rad], ωx, ωy, ωz [rad/rad]; stupci A1…A6
function jakobianK(q) {
  const h = 1e-4, F0 = fkK(q).T, J = [[], [], [], [], [], []];
  for (let j = 0; j < 6; j++) {
    const q2 = q.slice(); q2[j] += h / RAD;
    const F = fkK(q2).T;
    for (let k = 0; k < 3; k++) J[k][j] = (F[k * 4 + 3] - F0[k * 4 + 3]) / h;
    // dR·Rᵀ ≈ [ω]×
    const R0 = [F0[0], F0[1], F0[2], F0[4], F0[5], F0[6], F0[8], F0[9], F0[10]], R1 = [F[0], F[1], F[2], F[4], F[5], F[6], F[8], F[9], F[10]];
    const W = (a, b) => { let s = 0; for (let k = 0; k < 3; k++) s += (R1[a * 3 + k] - R0[a * 3 + k]) * R0[b * 3 + k]; return s / h; };
    J[3][j] = W(2, 1); J[4][j] = W(0, 2); J[5][j] = W(1, 0);
  }
  return J;
}
function rijesi(A0, b0) {         // Gaussova eliminacija s djelomičnim pivotiranjem; null ako je matrica singularna
  const n = b0.length, A = A0.map(r => r.slice()), b = b0.slice();
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}
// inverzna kinematika za prirubnicu okrenutu prema dolje (A4 = 0, A6 = 0, lakat gore); null izvan dosega
function ikDolje(x, y, z) {
  const h = D.dh;
  const A1 = -Math.atan2(y, x) / RAD;
  const rr = Math.hypot(x, y) - h.a1, zz = z + h.d6 - h.d1;
  const L1 = h.a2, L2 = Math.hypot(h.d4, h.a3), fo = Math.atan2(h.a3, h.d4);
  const c = (rr * rr + zz * zz - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c > 1 || c < -1) return null;
  const be = Math.acos(c);
  const e2 = Math.atan2(zz, rr) + Math.atan2(L2 * Math.sin(be), L1 + L2 * Math.cos(be));
  const e3 = e2 - be - fo;
  return [A1, -e2 / RAD, (e2 - e3) / RAD, 0, e3 / RAD + 90, 0];
}
const toc = T => [T[3], T[7], T[11]];
// karakteristične točke ruke za crtanje: podnožje, vrh stupa, A2, lakat, pomak, zapešće, prirubnica
function tockeRuke(q) {
  const { okviri } = fkK(q);
  return [[0, 0, 0], [0, 0, D.dh.d1], toc(okviri[1]), toc(okviri[2]), toc(okviri[3]), toc(okviri[4]), toc(okviri[6])];
}

/* ------------------------------------------------------- crtež ruke (2D projekcija) */
// rod: g; o.s = mjerilo projekcije [px/mm]; vraća { postavi(tocke2D, tcp2D?) } — tocke2D kao iz tockeRuke, već projicirane na zaslon
function ruka2D(rod, o = {}) {
  const s = o.s || 1;
  const g = S('g', { class: 'tku-ruka' + (o.kl ? ' ' + o.kl : '') }, rod);
  const sir = [180, 130, 115, 95, 88, 64].map(v => v * s * (o.deb || 0.75));      // širine članaka u mm [pp, procjena s fotografije]
  const vanj = sir.map(w => S('line', { 'stroke-width': f1(w + 3), class: 'tku-ruka-o' }, g));
  const unut = sir.map((w, i) => S('line', { 'stroke-width': f1(w), class: i === 0 ? 'tku-ruka-stup' : 'tku-ruka-b' }, g));
  const zgl = [2, 3, 5].map(() => S('circle', { r: f1(Math.max(3, 40 * s * (o.deb || 0.75))), class: 'tku-zglob' }, g));
  const alat = S('line', { class: 'tku-ruka-alat' }, g);
  const tcpK = S('circle', { r: 4, class: 'tku-tcp' }, g);
  g.postavi = (P, tcp) => {
    for (let i = 0; i < 6; i++) {
      const a = P[i], b = P[i + 1];
      for (const l of [vanj[i], unut[i]]) postavi(l, { x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    }
    [2, 3, 5].forEach((k, i) => postavi(zgl[i], { cx: P[k][0], cy: P[k][1] }));
    const t = tcp || P[6];
    postavi(alat, { x1: P[6][0], y1: P[6][1], x2: t[0], y2: t[1] });
    postavi(tcpK, { cx: t[0], cy: t[1] });
  };
  return g;
}
// projekcije: bočno X–Z i tlocrt X–Y (X desno)
const prXZ = (ox, oy, s) => p => [ox + p[0] * s, oy - p[2] * s];
const prXY = (ox, oy, s) => p => [ox + p[0] * s, oy - p[1] * s];
function podnozjeBocno(g, ox, oy, s) {
  S('rect', { x: ox - 104 * s, y: oy - 110 * s, width: 208 * s, height: 110 * s, rx: 4, class: 'tku-podnozje' }, g);
  S('rect', { x: ox - 150 * s, y: oy - 60 * s, width: 46 * s, height: 60 * s, rx: 3, class: 'tku-podnozje' }, g);
  S('line', { x1: ox - 260 * s, y1: oy, x2: ox + 260 * s, y2: oy, class: 'tku-pod' }, g);
}
function podnozjeTlocrt(g, ox, oy, s) {
  S('rect', { x: ox - 104 * s, y: oy - 104 * s, width: 208 * s, height: 208 * s, rx: 6, class: 'tku-podnozje' }, g);
  S('rect', { x: ox - 150 * s, y: oy - 40 * s, width: 46 * s, height: 80 * s, rx: 3, class: 'tku-podnozje' }, g);
  S('circle', { cx: ox, cy: oy, r: 92 * s, class: 'tku-stup-t' }, g);
}
// mali trokut koordinatnih osi (2D): g, x, y, kut osi x na zaslonu (rad), duljina, oznake
function osi2D(g, o = {}) {
  const gr = S('g', { class: 'tku-osi2d' }, g);
  const sx = strel(gr, 0, 0, 0, 0, { boja: B.crv, w: 2.5, gl: 9 });
  const sy = strel(gr, 0, 0, 0, 0, { boja: B.zel, w: 2.5, gl: 9 });
  const tx = T(gr, 0, 0, o.x || 'X', 'tku-ls tku-os-x', 'middle'), ty = T(gr, 0, 0, o.y || 'Y', 'tku-ls tku-os-y', 'middle');
  const tn = o.naziv ? T(gr, 0, 0, o.naziv, 'tku-ls', 'start') : null;
  gr.set = (x, y, vx, vy, L = 40) => {     // vx, vy: jedinični vektori osi na zaslonu ([dx, dy]); null = os u dubinu
    if (vx) { sx.style.display = ''; tx.style.display = ''; sx.set(x, y, x + vx[0] * L, y + vx[1] * L); postavi(tx, { x: x + vx[0] * (L + 13), y: y + vx[1] * (L + 13) + 5 }); }
    else { sx.style.display = 'none'; tx.style.display = 'none'; }
    if (vy) { sy.style.display = ''; ty.style.display = ''; sy.set(x, y, x + vy[0] * L, y + vy[1] * L); postavi(ty, { x: x + vy[0] * (L + 13), y: y + vy[1] * (L + 13) + 5 }); }
    else { sy.style.display = 'none'; ty.style.display = 'none'; }
    if (tn) postavi(tn, { x: x + 8, y: y + 20 });
  };
  return gr;
}


/* ------------------------------------------------------- dodatni dijelovi sučelja */
function tablica(ui, zagl, redovi, u) {
  const t = H('table', { class: 'tku-tab' });
  const th = H('tr', {}); for (const z of zagl) th.append(H('th', { tekst: z }));
  t.append(H('thead', {}, th));
  const tb = H('tbody');
  const tr = redovi.map(r => { const e = H('tr'); for (const c of r) e.append(H('td', { tekst: c })); tb.append(e); return e; });
  t.append(tb);
  (u || ui.ocitP).append(H('div', { class: 'tku-tab-om' }, t));
  t.redovi = tr;
  t.istakni = i => tr.forEach((r, k) => r.classList.toggle('tku-akt', k === i));
  return t;
}
function koraci(ui, popis, u) {
  const ol = H('ol', { class: 'tku-koraci' });
  const li = popis.map(t => { const e = H('li', { tekst: t }); ol.append(e); return e; });
  (u || ui.ocitP).append(ol);
  ol.postavi = (i, kv) => li.forEach((e, k) => { e.classList.toggle('tku-akt', k === i); e.classList.toggle('tku-gotov', k < i); e.classList.toggle('tku-kvar', k === i && !!kv); });
  ol.stavke = li;
  return ol;
}
// tok (moment/brzina) kao isprekidana crta s pomakom
function tok(g, d, kl) { return S('path', { d, class: 'tku-tok' + (kl ? ' ' + kl : '') }, g); }

/* =========================================================== 1. sastav osi */
function tOs(ui, ctx) {
  const P = D.primjer, USPm = 200, USPi = 2;
  const st = { os: 0, v: 90, M: 10, radi: true, koc: false, fm: 0, fi: 0 };
  const svg = ui.svg(600, 470, 'Lanac jedne osi u presjeku: rezolver, kočnica, servomotor, prijenosnik i izlazna prirubnica; ispod brojčanici vrtnje i tablica brzine, momenta i snage');
  const Y = 150;
  // kućište osi (crtkano)
  S('rect', { x: 10, y: 60, width: 580, height: 180, rx: 14, class: 'tku-kuciste-c' }, svg);
  // rezolver
  S('rect', { x: 24, y: Y - 34, width: 48, height: 68, rx: 6, class: 'tku-rez' }, svg);
  T(svg, 48, 40, 'rezolver', 'tku-ls', 'middle');
  // kočnica
  const gKoc = S('g', {}, svg);
  S('rect', { x: 78, y: Y - 48, width: 54, height: 96, rx: 5, class: 'tku-koc' }, gKoc);
  const kocLam = S('rect', { x: 92, y: Y - 40, width: 10, height: 80, rx: 2, class: 'tku-koc-disk' }, gKoc);
  T(svg, 105, 56, 'kočnica', 'tku-ls', 'middle');
  // motor
  S('rect', { x: 138, y: Y - 56, width: 130, height: 112, rx: 10, class: 'tku-motor' }, svg);
  S('rect', { x: 150, y: Y - 36, width: 106, height: 72, rx: 4, class: 'tku-stator' }, svg);
  S('rect', { x: 162, y: Y - 22, width: 82, height: 44, rx: 3, class: 'tku-rotor' }, svg);
  T(svg, 203, 52, 'servomotor', 'tku-ls', 'middle');
  // vratilo
  S('line', { x1: 30, y1: Y, x2: 330, y2: Y, class: 'tku-vratilo' }, svg);
  // prijenosnik
  S('rect', { x: 290, y: Y - 64, width: 140, height: 128, rx: 12, class: 'tku-prijen' }, svg);
  const tI = T(svg, 360, Y + 6, '', 'tku-lb', 'middle');
  T(svg, 360, Y + 30, 'načelno', 'tku-ls', 'middle');
  T(svg, 360, 52, 'prijenosnik', 'tku-ls', 'middle');
  // izlaz i članak
  S('rect', { x: 432, y: Y - 70, width: 22, height: 140, rx: 4, class: 'tku-prirub' }, svg);
  S('rect', { x: 456, y: Y - 44, width: 124, height: 88, rx: 8, class: 'tku-clanak' }, svg);
  T(svg, 518, 52, 'izlaz → članak', 'tku-ls', 'middle');
  // tok momenta
  const tokM = tok(svg, `M30,${Y} L290,${Y}`), tokI = tok(svg, `M430,${Y} L580,${Y}`, 'tku-tok-d');
  const tM = T(svg, 205, Y + 82, '', 'tku-ls', 'middle'), tIz = T(svg, 582, Y + 82, '', 'tku-ls', 'end');
  // brojčanici
  function brojcanik(x, y, nas) {
    const g = S('g', { transform: `translate(${x} ${y})` }, svg);
    S('circle', { r: 46, class: 'tku-disk' }, g);
    for (let k = 0; k < 12; k++) { const [a, b] = pol(0, 0, 46, k * Math.PI / 6), [c, d] = pol(0, 0, 40, k * Math.PI / 6); S('line', { x1: f1(a), y1: f1(b), x2: f1(c), y2: f1(d), class: 'tku-mreza' }, g); }
    const r = S('line', { x1: 0, y1: 0, x2: 0, y2: -40, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    T(svg, x, y + 66, nas, 'tku-ls', 'middle');
    return r;
  }
  const kMot = brojcanik(110, 330, `vratilo motora (usporeno ${USPm}×)`), kIz = brojcanik(470, 330, `izlaz osi (usporeno ${USPi}×)`);
  // signali rezolvera
  const RX = 250, RY = 300;
  T(svg, RX + 50, RY - 20, 'rezolver: sin / cos kuta motora', 'tku-ls', 'middle');
  S('line', { x1: RX, y1: RY + 30, x2: RX + 100, y2: RY + 30, class: 'tku-mreza' }, svg);
  const bS = S('rect', { x: RX + 18, width: 24, class: 'tku-stup-s' }, svg), bC = S('rect', { x: RX + 58, width: 24, class: 'tku-stup-c' }, svg);
  T(svg, RX + 30, RY + 102, 'sin', 'tku-ls', 'middle'); T(svg, RX + 70, RY + 102, 'cos', 'tku-ls', 'middle');
  // tablica
  S('line', { x1: 10, y1: 420, x2: 590, y2: 420, class: 'tku-mreza' }, svg);
  const tTab = [T(svg, 110, 448, '', 'tku-l', 'middle'), T(svg, 470, 448, '', 'tku-l', 'middle')];

  function osvjezi() {
    const i = P.i, eta = P.eta, w = st.koc ? 0 : st.v;
    const nM = w * i / 6, Mm = st.M / (i * eta), Pw = st.M * w * RAD;
    tI.textContent = `i = ${i} : 1`;
    kMot.setAttribute('transform', `rotate(${(st.fm % 360).toFixed(1)})`);
    kIz.setAttribute('transform', `rotate(${(st.fi % 360).toFixed(1)})`);
    const a = st.fm * USPm * RAD;
    const s = Math.sin(a), c = Math.cos(a);
    postavi(bS, { y: RY + 30 - Math.max(0, s) * 50, height: Math.abs(s) * 50 }); if (s < 0) postavi(bS, { y: RY + 30, height: -s * 50 });
    postavi(bC, { y: RY + 30 - Math.max(0, c) * 50, height: Math.abs(c) * 50 }); if (c < 0) postavi(bC, { y: RY + 30, height: -c * 50 });
    tokM.style.strokeWidth = f1(2 + Mm * 20); tokI.style.strokeWidth = f1(2 + st.M * 0.4);
    tokM.style.strokeDashoffset = f1(-st.fm * 3); tokI.style.strokeDashoffset = f1(-st.fi * 0.6);
    tokM.style.opacity = tokI.style.opacity = st.M > 0 || w > 0 ? '1' : '0.25';
    kocLam.classList.toggle('tku-koc-on', st.koc);
    tM.textContent = `motor: ${tis(nM)} 1/min · ${hr(Mm, 3)} Nm`;
    tIz.textContent = `izlaz: ${hr(w, 0)} °/s · ${hr(st.M, 1)} Nm`;
    tTab[0].textContent = `n = ${tis(nM)} 1/min`; tTab[1].textContent = `P = ${hr(Pw, 1)} W na izlazu`;
    o.os(`${D.osi[st.os].ime}: ${D.osi[st.os].min}° … +${D.osi[st.os].max}°, najviše ${vMax(st.os)} °/s`);
    o.nm(tis(nM) + ' 1/min'); o.mm(hr(Mm, 3) + ' Nm'); o.wi(hr(w, 0) + ' °/s'); o.mi(hr(st.M, 1) + ' Nm'); o.p(hr(Pw, 1) + ' W (motor ' + hr(Pw / eta, 1) + ' W)');
    if (st.koc) ui.stanje(`Kočnica je zatvorena: os stoji, moment tereta ${hr(st.M, 1)} Nm drži kočnica na motoru — preko prijenosnika to je samo ${hr(st.M / i, 3)} Nm na vratilu motora.`, 'upoz');
    else if (w > 0) ui.stanje(`Motor se vrti ${i} puta brže od izlaza (${tis(nM)} 1/min), a daje ${hr(i * eta, 0)} puta manji moment. Snaga prolazi kroz prijenosnik umanjena samo za gubitke (${hr((1 - eta) * 100, 0)} %).`, 'ok');
    else ui.stanje('Os miruje: motor drži moment tereta, a kočnica je otpuštena.');
  }
  ctx.petlja(dt => {
    if (!st.radi || st.koc) { osvjezi(); return false; }
    st.fi += st.v * dt / USPi;
    st.fm += st.v * P.i * dt / USPm;
    osvjezi();
    return st.v > 0;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r).osvjezi();
  const bK = ui.gumb('Zatvori kočnicu', () => { st.koc = !st.koc; bK.textContent = st.koc ? 'Otpusti kočnicu' : 'Zatvori kočnicu'; bK.setAttribute('aria-pressed', String(st.koc)); osvjezi(); ctx.budi(); }, { tanki: true, u: r, pritisak: false });
  ui.seg('Os', D.osi.map((o2, k) => [k, o2.ime]), 0, k => { st.os = k; kl.ulaz.max = vMax(k); if (st.v > vMax(k)) st.v = vMax(k); kl.postavi(st.v); osvjezi(); ctx.budi(); });
  const kl = ui.klizac('Brzina osi', 0, vMax(0), 1, st.v, v => hr(v, 0) + ' °/s', v => { st.v = v; osvjezi(); ctx.budi(); });
  ui.klizac('Moment tereta na izlazu', 0, 40, 0.5, st.M, v => hr(v, 1) + ' Nm', v => { st.M = v; osvjezi(); });
  const o = ui.ocit([['os', 'Odabrana os'], ['nm', 'Brzina motora n = ω · i'], ['mm', 'Moment motora M_m = M / (i · η)'], ['wi', 'Brzina osi ω'], ['mi', 'Moment na izlazu M'], ['p', 'Snaga P = M · ω']]);
  ui.sitno(`Brzine osi ${VAR()}: ${D.osi.map((x, k) => x.ime + ' ' + vMax(k)).join(', ')} °/s. Momente osi KUKA ne objavljuje; raspon klizača je primjer.`);
  osvjezi(); ctx.budi();
}

/* =========================================================== 2. prijenosnik */
function tPrijenosnik(ui, ctx) {
  const PV = D.primjer.valni, NC = D.primjer.ciklo.zatici;
  const st = { tip: 'valni', radi: true, th: 0, cilj: null, b: 0.4, k: 25, M: 0, nj: false, tn: 0 };
  const svg = ui.svg(600, 320, 'Načelni prikaz prijenosnika: valni (generator vala, elastični zupčanik, kruti prsten) ili cikloidni (ekscentar, disk s izbočinama, prsten zatika); desno kut ulaza i izlaza');
  const CX = 175, CY = 160;
  const gV = S('g', {}, svg), gC = S('g', {}, svg);
  // ---- valni
  const Rb = 112, Rt = 104, r0 = 100, w = 5;
  let dc = '';
  for (let k = 0; k < PV.zc; k++) {
    const a = 2 * Math.PI * k / PV.zc, da = Math.PI / PV.zc;
    const p = [pol(CX, CY, Rb, a - da), pol(CX, CY, Rt, a - da * 0.35), pol(CX, CY, Rt, a + da * 0.35), pol(CX, CY, Rb, a + da)];
    dc += put(p);
  }
  S('circle', { cx: CX, cy: CY, r: Rb + 18, class: 'tku-prsten' }, gV);
  S('circle', { cx: CX, cy: CY, r: Rb, class: 'tku-utor' }, gV);
  S('path', { d: dc + 'Z', class: 'tku-zubi-c' }, gV);
  const zah = [0, 1].map(() => S('circle', { r: 16, class: 'tku-zahvat' }, gV));
  const flex = S('path', { class: 'tku-flex' }, gV);
  const flexZ = S('path', { class: 'tku-flex-z' }, gV);
  const gGen = S('g', {}, gV);
  S('ellipse', { cx: 0, cy: 0, rx: r0 + w - 14, ry: r0 - w - 14, class: 'tku-gen' }, gGen);
  S('line', { x1: -(r0 + w - 20), y1: 0, x2: r0 + w - 20, y2: 0, class: 'tku-gen-os' }, gGen);
  S('circle', { r: 10, class: 'tku-tamno' }, gGen);
  const genL = S('circle', { r: 7, class: 'tku-izlaz-o' }, gV);
  // ---- cikloidni
  const R = 110, rp = 9, e = 5;
  S('circle', { cx: CX, cy: CY, r: R + 22, class: 'tku-prsten' }, gC);
  for (let j = 0; j < NC; j++) { const [x, y] = pol(CX, CY, R, 2 * Math.PI * j / NC); S('circle', { cx: f1(x), cy: f1(y), r: rp, class: 'tku-zatik' }, gC); }
  const prof = [];
  for (let k = 0; k <= 480; k++) {
    const t = 2 * Math.PI * k / 480, psi = Math.atan2(Math.sin((1 - NC) * t), R / (e * NC) - Math.cos((1 - NC) * t));
    prof.push([R * Math.cos(t) - rp * Math.cos(t + psi) - e * Math.cos(NC * t), -R * Math.sin(t) + rp * Math.sin(t + psi) + e * Math.sin(NC * t)]);
  }
  const gDisk = S('g', {}, gC);
  S('path', { d: put(prof, true), class: 'tku-ciklo' }, gDisk);
  const rup = [];
  for (let k = 0; k < 4; k++) { const [x, y] = pol(0, 0, 52, k * Math.PI / 2 + Math.PI / 4); S('circle', { cx: f1(x), cy: f1(y), r: 13 + e, class: 'tku-utor' }, gDisk); rup.push([x, y]); }
  S('circle', { cx: 0, cy: 0, r: 26, class: 'tku-gen' }, gDisk);
  S('line', { x1: 0, y1: 0, x2: 0, y2: -88, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, gDisk);
  const gIzC = S('g', {}, gC);
  for (const [x, y] of rup) S('circle', { cx: f1(x), cy: f1(y), r: 13, class: 'tku-zatik tku-zatik-iz' }, gIzC);
  const ekc = S('circle', { r: 6, class: 'tku-ekc' }, gC);
  S('circle', { cx: CX, cy: CY, r: 4, class: 'tku-tamno' }, gC);
  // ---- brojčanici ulaz / izlaz
  function br(x, y, nas) {
    const g = S('g', { transform: `translate(${x} ${y})` }, svg);
    S('circle', { r: 38, class: 'tku-disk' }, g);
    const l = S('line', { x1: 0, y1: 0, x2: 0, y2: -33, 'stroke-width': 4, 'stroke-linecap': 'round', stroke: B.crv }, g);
    T(svg, x, y - 48, nas, 'tku-ls', 'middle');
    const t = T(svg, x, y + 60, '', 'tku-l', 'middle');
    return { l, t };
  }
  const bU = br(410, 100, 'ulaz'), bI = br(530, 100, 'izlaz');
  const tOmjer = T(svg, 470, 230, '', 'tku-lb', 'middle');
  const tSmjer = T(svg, 470, 256, '', 'tku-ls', 'middle');
  const tFor = T(svg, 470, 282, '', 'tku-ls', 'middle');
  // ---- graf torzije
  const svg2 = ui.svg(600, 260, 'Karakteristika torzije zgloba: moment na izlazu prema kutu zakreta, sa zračnošću i krutošću', 'tku-svg2');
  const g2 = graf(svg2, 70, 26, 500, 190, { x0: -8, x1: 8, y0: -100, y1: 100, yt: [-100, -50, 0, 50, 100], xt: [-8, -4, 0, 4, 8], naslov: 'moment M [% nazivnog] prema zakretu izlaza φ [kutne minute] uz zakočen ulaz', xf: v => hr(v, 0) + '′' });
  const kar = S('polyline', { class: 'tku-krivulja' }, svg2);
  const zrac = S('rect', { class: 'tku-pojas' }, svg2);
  const tock = S('circle', { r: 7, class: 'tku-tocka' }, svg2);

  const omjer = () => st.tip === 'valni' ? PV.zf / (PV.zc - PV.zf) : NC - 1;
  function osvjezi() {
    const val = st.tip === 'valni';
    gV.style.display = val ? '' : 'none'; gC.style.display = val ? 'none' : '';
    const th = st.th, i = omjer(), izl = -th / i;      // izlaz suprotno od ulaza
    if (val) {
      const fo = izl * RAD, ta = th * RAD;
      const rr = a => r0 + w * Math.cos(2 * (a - ta));
      const kr = [];
      for (let k = 0; k <= 180; k++) { const a = 2 * Math.PI * k / 180; kr.push(pol(CX, CY, rr(a) - 8, a)); }
      flex.setAttribute('d', put(kr, true));
      let dz = '';
      for (let k = 0; k < PV.zf; k++) {
        const a = fo + 2 * Math.PI * k / PV.zf, da = Math.PI / PV.zf, rb = rr(a);
        dz += put([pol(CX, CY, rb, a - da), pol(CX, CY, rb + 7, a - da * 0.35), pol(CX, CY, rb + 7, a + da * 0.35), pol(CX, CY, rb, a + da)]);
      }
      flexZ.setAttribute('d', dz);
      const [rx0, ry0] = pol(CX, CY, rr(fo) - 4, fo);
      postavi(genL, { cx: rx0, cy: ry0 });
      gGen.setAttribute('transform', `translate(${CX} ${CY}) rotate(${f1(th)})`);
      zah.forEach((z, k) => { const [x, y] = pol(CX, CY, Rb - 4, ta + k * Math.PI); postavi(z, { cx: x, cy: y }); });
    } else {
      const ta = th * RAD, cx = CX + e * Math.cos(ta), cy = CY + e * Math.sin(ta);
      gDisk.setAttribute('transform', `translate(${f1(cx)} ${f1(cy)}) rotate(${(izl).toFixed(2)})`);
      gIzC.setAttribute('transform', `translate(${CX} ${CY}) rotate(${(izl).toFixed(2)})`);
      postavi(ekc, { cx, cy });
    }
    bU.l.setAttribute('transform', `rotate(${f1(th % 360)})`); bI.l.setAttribute('transform', `rotate(${(izl % 360).toFixed(2)})`);
    bU.t.textContent = hr(th, 0) + '°'; bI.t.textContent = hr(izl, 1) + '°';
    tOmjer.textContent = `i = ${hr(i, 0)} : 1`;
    tSmjer.textContent = val ? `ulaz 360° → izlaz −${PV.zc - PV.zf} zuba (−${hr(360 / i, 1)}°)` : `ulaz 360° → izlaz −1 izbočina (−${hr(360 / i, 1)}°)`;
    tFor.textContent = val ? `z_f / (z_c − z_f) = ${PV.zf} / (${PV.zc} − ${PV.zf})` : `(z_zatika − 1) = ${NC} − 1`;
    // torzija
    const k = st.k, b = st.b, p = [];
    const fi = M => (M === 0 ? 0 : Math.sign(M) * b / 2) + M / k;
    for (const M of [-100, -50, -1e-9]) p.push([g2.X(fi(M)), g2.Y(M)]);
    for (const M of [1e-9, 50, 100]) p.push([g2.X(fi(M)), g2.Y(M)]);
    kar.setAttribute('points', pts(p.map(q => [ogr(q[0], g2.x, g2.x + g2.w), q[1]])));
    postavi(zrac, { x: g2.X(-b / 2), y: g2.y, width: Math.max(0.5, g2.X(b / 2) - g2.X(-b / 2)), height: g2.h });
    const fiT = st.M === 0 ? 0 : fi(st.M);
    postavi(tock, { cx: ogr(g2.X(fiT), g2.x, g2.x + g2.w), cy: g2.Y(st.M) });
    o.i(`${hr(i, 0)} : 1 (${val ? 'valni' : 'cikloidni'}, primjer)`); o.b(hr(b, 1) + '′ (kutne minute)'); o.k(hr(k, 0) + ' % nazivnog momenta po kutnoj minuti');
    o.fi(hr(fiT, 2) + '′ uz M = ' + hr(st.M, 0) + ' %');
  }
  ctx.petlja(dt => {
    let dalje = false;
    if (st.cilj != null) { st.th = Math.min(st.cilj, st.th + 90 * dt); if (st.th >= st.cilj) { st.cilj = null; ui.stanje(`Jedan okretaj ulaza: izlaz se zakrenuo za ${hr(-360 / omjer(), 1)}° — suprotno od ulaza.`, 'ok'); } dalje = true; }
    else if (st.radi) { st.th += 60 * dt; dalje = true; }
    if (st.nj) { st.tn += dt; st.M = Math.round(100 * Math.sin(st.tn * 1.4)); dalje = true; }
    osvjezi();
    return dalje;
  });
  const r = ui.red();
  const bIg = ui.igraj(st, 'radi', 'Pokreni', null, r); bIg.osvjezi();
  ui.gumb('Jedan okretaj ulaza', () => { st.radi = false; bIg.osvjezi(); st.th = Math.round(st.th / 360) * 360; st.cilj = st.th + 360; ui.stanje('Ulaz se okreće za 360° …'); ctx.budi(); }, { tanki: true, u: r });
  ui.seg('Tip (načelni prikaz)', [['valni', 'Valni (strain wave)'], ['ciklo', 'Cikloidni']], 'valni', v => { st.tip = v; st.th = 0; st.b = v === 'valni' ? 0.4 : 1; st.k = v === 'valni' ? 25 : 40; kB.postavi(st.b); kK.postavi(st.k); osvjezi(); ui.stanje(v === 'valni' ? 'Valni prijenosnik: zahvat je na dva mjesta uz veliku os elipse (istaknuto).' : 'Cikloidni prijenosnik: disk se kotrlja po zaticima, istodobno je u dodiru s mnogo zatika; izlaz preuzima vrtnju diska preko zatika u rupama.'); ctx.budi(); });
  const kB = ui.klizac('Zračnost (primjer)', 0, 6, 0.1, st.b, v => hr(v, 1) + '′', v => { st.b = v; osvjezi(); });
  const kK = ui.klizac('Krutost (primjer)', 10, 80, 1, st.k, v => hr(v, 0) + ' %/′', v => { st.k = v; osvjezi(); });
  ui.klizac('Moment na izlazu', -100, 100, 1, st.M, v => hr(v, 0) + ' %', v => { st.M = v; st.nj = false; bNj.setAttribute('aria-pressed', 'false'); osvjezi(); });
  const bNj = ui.gumb('Njihanje momenta', () => { st.nj = !st.nj; bNj.setAttribute('aria-pressed', String(st.nj)); ctx.budi(); }, { tanki: true, pritisak: false });
  const o = ui.ocit([['i', 'Omjer'], ['b', 'Zračnost'], ['k', 'Krutost (nagib)'], ['fi', 'Zakret izlaza']]);
  ui.sitno('Planetarni prijenosnik sa zupčanicima obično ima veću zračnost i za isti omjer treba više stupnjeva — zato se u zglobovima robota rjeđe koristi bez posebnih mjera protiv zračnosti.');
  osvjezi(); ui.stanje('Vrsta prijenosnika u KR AGILUS-u nije javno objavljena — ovo je usporedba dvaju tipova koji se u robotskim zglobovima koriste.', 'plavo'); ctx.budi();
}

/* =========================================================== 3. kočnica */
function tKocnica(ui, ctx) {
  const st = { struja: false, servo: false, uredjaj: false, istrosena: false, teret: 60, w: 0, fi: 0, vrti: false, test: -1, tt: 0, pomak: 0, hist: [], t: 0, poruka: '' };
  const svg = ui.svg(600, 330, 'Presjek opružne elektromagnetske kočnice na motoru: tijelo sa zavojnicom i oprugama, kotva, tarni disk na vratilu i tlačna ploča; desno vratilo gledano s kraja');
  const Y = 165;
  S('line', { x1: 20, y1: Y, x2: 400, y2: Y, class: 'tku-vratilo-d' }, svg);
  S('line', { x1: 20, y1: Y, x2: 400, y2: Y, class: 'tku-os-crta' }, svg);
  const dijelovi = [];
  for (const sg of [-1, 1]) {
    const g = S('g', {}, svg);
    const y = v => Y + sg * v;
    // tijelo magneta
    S('path', { d: `M110,${y(22)} L190,${y(22)} L190,${y(118)} L110,${y(118)}Z`, class: 'tku-magnet' }, g);
    S('rect', { x: 128, y: Math.min(y(46), y(84)), width: 46, height: 38, class: 'tku-zavojnica' }, g);
    // opruge
    const op = S('path', { class: 'tku-opruga' }, g);
    // kotva
    const kot = S('rect', { y: Math.min(y(30), y(112)), width: 12, height: 82, class: 'tku-kotva' }, g);
    // tarni disk + glavina
    const td = S('rect', { y: Math.min(y(36), y(106)), width: 10, height: 70, class: 'tku-tarni' }, g);
    S('rect', { x: 200, y: Math.min(y(12), y(36)), width: 34, height: 24, class: 'tku-glavina' }, g);
    // tlačna ploča
    S('rect', { x: 236, y: Math.min(y(22), y(118)), width: 14, height: 96, class: 'tku-magnet' }, g);
    // motor (desno)
    S('rect', { x: 256, y: Math.min(y(22), y(130)), width: 140, height: 108, class: 'tku-motor' }, g);
    dijelovi.push({ op, kot, td, sg });
  }
  T(svg, 150, 30, 'zavojnica, opruge', 'tku-ls', 'middle'); T(svg, 214, 312, 'kotva · tarni disk', 'tku-ls', 'middle'); T(svg, 326, 30, 'motor', 'tku-ls', 'middle');
  // pogled s kraja
  const EX = 500, EY = 120;
  T(svg, EX, 24, 'vratilo (pogled s kraja)', 'tku-ls', 'middle');
  S('circle', { cx: EX, cy: EY, r: 70, class: 'tku-tarni' }, svg);
  const gE = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: 20, class: 'tku-glavina' }, gE);
  for (let k = 0; k < 8; k++) { const [a, b] = pol(0, 0, 20, k * Math.PI / 4), [c, d] = pol(0, 0, 66, k * Math.PI / 4); S('line', { x1: f1(a), y1: f1(b), x2: f1(c), y2: f1(d), class: 'tku-mreza' }, gE); }
  S('line', { x1: 0, y1: 0, x2: 0, y2: -64, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, gE);
  const sTer = strel(svg, EX + 80, EY - 40, EX + 80, EY + 40, { boja: B.nar, w: 4 });
  T(svg, 592, EY + 96, 'teret', 'tku-ls', 'end');
  const lamp = [['24 V', 230], ['pogon', 262], ['kočnica', 294]].map(([n, y]) => { const c = S('circle', { cx: 428, cy: y - 5, r: 9, class: 'tku-lampa' }, svg); T(svg, 444, y, n, 'tku-ls'); return c; });
  const tLam = [T(svg, 516, 230, '', 'tku-ls'), T(svg, 516, 262, '', 'tku-ls'), T(svg, 516, 294, '', 'tku-ls')];
  // vremenski dijagram
  const svg2 = ui.svg(600, 200, 'Vremenski dijagram: napon zavojnice, pogon i brzina vratila u zadnjih 6 s', 'tku-svg2');
  const GX = 110, GW = 470;
  [['zavojnica', 40], ['pogon', 90], ['brzina', 150]].forEach(([n, y]) => T(svg2, 8, y + 5, n, 'tku-ls'));
  S('rect', { x: GX, y: 18, width: GW, height: 170, class: 'tku-graf' }, svg2);
  const kz = S('polyline', { class: 'tku-krivulja' }, svg2), kp = S('polyline', { class: 'tku-krivulja-b' }, svg2), kw = S('polyline', { class: 'tku-krivulja-n' }, svg2);
  const KTEST = ['Os miruje, pogon drži položaj', 'Kočnica se zatvara (zavojnica bez struje)', 'Motor zadaje ispitni moment uz zatvorenu kočnicu', 'Nadzor pomaka: pomak mora ostati ispod praga', 'Kočnica se otpušta, os je spremna'];
  const kor = koraci(ui, KTEST);

  const Mdrz = () => st.istrosena ? 55 : 130;          // moment držanja u % najvećeg momenta tereta (primjer)
  const zatvorena = () => !st.struja && !st.uredjaj;
  function osvjezi() {
    const zat = zatvorena();
    for (const d of dijelovi) {
      const xk = zat ? 196 : 190, xd = zat ? 208 : 210;
      postavi(d.kot, { x: xk }); postavi(d.td, { x: xd });
      let dd = '';
      for (const v of [52, 88]) { const yy = Y + d.sg * v; dd += `M150,${yy} L${xk},${yy} `; }
      d.op.setAttribute('d', dd);
      d.op.style.strokeDasharray = zat ? '5 3' : '3 2';
      d.td.classList.toggle('tku-tarni-on', zat);
      d.kot.classList.toggle('tku-kotva-m', st.struja);
    }
    o.ras(zat ? 'kotva–magnet otvoren, disk stisnut' : 'kotva privučena, disk slobodan');
    gE.setAttribute('transform', `translate(${EX} ${EY}) rotate(${(st.fi % 360).toFixed(1)})`);
    sTer.set(EX + 80, EY - 30, EX + 80, EY - 30 + 20 + st.teret * 0.5);
    lamp[0].classList.toggle('tku-lampa-on', st.struja); lamp[1].classList.toggle('tku-lampa-on', st.servo); lamp[2].classList.toggle('tku-lampa-crv', zat);
    tLam[0].textContent = st.struja ? 'da' : 'ne'; tLam[1].textContent = st.servo ? 'drži' : 'isklj.'; tLam[2].textContent = zat ? 'zatvorena' : (st.uredjaj ? 'ručno otp.' : 'otpuštena');
    o.U(st.struja ? '24 V' : '0 V'); o.I(st.struja ? 'teče (primjer ≈ 0,3 A)' : '0 A');
    o.M(`${Mdrz()} % ${st.istrosena ? '(istrošena obloga)' : ''}`, st.istrosena ? 'upoz' : '');
    o.t(`${st.teret} %`, st.teret > Mdrz() && zat ? 'opas' : '');
    o.w(hr(st.w, 0) + ' °/s (prikaz)');
    // graf
    const t1 = st.t, t0 = t1 - 6, X = t => GX + (t - t0) / 6 * GW, h = st.hist.filter(q => q[0] >= t0);
    kz.setAttribute('points', pts(h.map(q => [X(q[0]), q[1] ? 26 : 56])));
    kp.setAttribute('points', pts(h.map(q => [X(q[0]), q[2] ? 76 : 106])));
    kw.setAttribute('points', pts(h.map(q => [X(q[0]), 182 - Math.min(1, Math.abs(q[3]) / 120) * 56])));
  }
  function korakFiz(dt) {
    const zat = zatvorena();
    let cilj = 0;
    if (st.servo && !zat) cilj = st.vrti ? 90 : 0;
    if (!st.servo && !zat) cilj = 40 + st.teret;               // pada pod teretom
    if (zat) {
      const vis = (st.test === 2 || st.test === 3) ? 100 > Mdrz() : st.teret > Mdrz();   // ispitni moment 100 % (primjer)
      cilj = vis ? 15 : 0;
    }
    st.w += (cilj - st.w) * Math.min(1, dt * (zat ? 14 : 6));
    if (Math.abs(st.w) < 0.05) st.w = 0;
    st.fi += st.w * dt;
    if (st.test === 3) st.pomak += Math.abs(st.w) * dt;
  }
  ctx.petlja(dt => {
    st.t += dt; korakFiz(dt);
    st.hist.push([st.t, st.struja, st.servo, st.w]);
    while (st.hist.length && st.hist[0][0] < st.t - 6.5) st.hist.shift();
    // stanje
    const zat = zatvorena();
    if (st.test < 0) {
      if (st.uredjaj) ui.stanje(`Uređaj za otpuštanje: kočnica je otpuštena bez pogona — os pod teretom pada! Nakon toga os treba ponovno umjeriti.`, 'opas');
      else if (zat && st.teret > Mdrz()) ui.stanje(`Moment tereta (${st.teret} %) veći je od momenta držanja (${Mdrz()} %): kočnica proklizava.`, 'opas');
      else if (zat) ui.stanje(st.servo ? 'Kočnica zatvorena, pogon uključen: os miruje.' : 'Kočnica zatvorena bez struje: os drži teret i kad nema napajanja — sigurno stanje.', 'ok');
      else if (st.servo) ui.stanje(st.vrti ? 'Kočnica otpuštena, motor vrti os.' : 'Kočnica otpuštena, pogon drži os momentom (regulacija položaja).', 'ok');
    }
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bS = ui.gumb('Uključi pogon', () => {
    if (!st.servo) { st.servo = true; ui.stanje('Kontrola kočnica: najprije pogon preuzme os momentom, pa se kočnica otpušta …', 'plavo'); ctx.odgodi(() => { if (st.servo) st.struja = true; }, 400); }
    else { st.vrti = false; st.struja = false; ui.stanje('Kontrola kočnica: os se zaustavi, kočnica zatvori, a tek onda se pogon isključi …', 'plavo'); ctx.odgodi(() => { st.servo = false; }, 400); }
    bS.textContent = st.servo ? 'Isključi pogon' : 'Uključi pogon'; ctx.budi();
  }, { tanki: true, u: r });
  ui.gumb('Vrti / stani', () => { if (st.servo && st.struja) st.vrti = !st.vrti; else ui.stanje('Os se može vrtjeti tek kad je pogon uključen i kočnica otpuštena.', 'upoz'); }, { tanki: true, u: r });
  ui.gumb('Nestanak struje', () => { st.servo = false; st.struja = false; st.vrti = false; st.uredjaj = false; bS.textContent = 'Uključi pogon'; ui.stanje('Nestanak struje: zavojnica gubi napon, opruge odmah stisnu disk — kočnica zatvara sama (zatvorena bez struje).', 'upoz'); }, { tanki: true, kl: 'tku-g-stop' });
  const r2 = ui.red();
  ui.gumb('Test kočnice', () => {
    if (st.test >= 0) return;
    st.servo = true; st.struja = true; st.vrti = false; st.uredjaj = false; bS.textContent = 'Isključi pogon'; st.pomak = 0;
    const kor0 = i => { st.test = i; kor.postavi(i); };
    kor0(0); ui.stanje('Test kočnice: korak 1 — os miruje.', 'plavo');
    ctx.odgodi(() => { kor0(1); st.struja = false; ui.stanje('Korak 2 — kočnica se zatvara.', 'plavo'); }, 900);
    ctx.odgodi(() => { kor0(2); ui.stanje('Korak 3 — motor zadaje ispitni moment uz zatvorenu kočnicu.', 'plavo'); }, 1800);
    ctx.odgodi(() => { kor0(3); }, 2400);
    ctx.odgodi(() => {
      const los = st.pomak > 1;
      kor.postavi(los ? 3 : 4, los);
      if (los) { st.test = -2; ui.stanje(`Test kočnice NIJE prošao: pomak ${hr(st.pomak, 1)}° (prikaz) iznad praga — kočnica ne drži ispitni moment. Upravljanje javlja grešku; os se ne smije koristiti dok se kočnica ne zamijeni.`, 'opas'); }
      else { st.struja = true; ui.stanje('Test kočnice je prošao: os se pod ispitnim momentom nije pomaknula.', 'ok'); }
      ctx.odgodi(() => { st.test = -1; }, 2200);
    }, 3600);
    ctx.budi();
  }, { tanki: true, u: r2 });
  const bU = ui.gumb('Uređaj za otpuštanje', () => { st.uredjaj = !st.uredjaj; if (st.uredjaj) { st.servo = false; st.struja = false; bS.textContent = 'Uključi pogon'; } bU.setAttribute('aria-pressed', String(st.uredjaj)); }, { tanki: true, u: r2, pritisak: false });
  ui.kvacica('Kvar: istrošena tarna obloga', false, v => { st.istrosena = v; });
  ui.klizac('Moment tereta na osi (% najvećeg, primjer)', 0, 150, 1, st.teret, v => v + ' %', v => { st.teret = v; });
  const o = ui.ocit([['ras', 'Raspor'], ['U', 'Napon zavojnice'], ['I', 'Struja zavojnice'], ['M', 'Moment držanja kočnice (primjer)'], ['t', 'Moment tereta'], ['w', 'Brzina vratila']]);
  ui.sitno('Uređaj za otpuštanje (opcija): odspoji se X30 na A1, spoji uređaj, preklopkom se odaberu glavne osi ili osi zapešća i pritisne tipka. Osi pod teretom mogu propasti.');
  kor.postavi(-1);
  osvjezi(); ctx.budi();
}

/* =========================================================== 4. rezolver */
function tResolver(ui, ctx) {
  const st = { radi: true, th: 30, w: 25, t: 0, sum: false, hist: [], fn: 1.6 };
  const svg = ui.svg(600, 300, 'Rezolver: stator s namotima sin i cos, rotor s uzbudnim namotom i strelica polja; desno točka (u_cos, u_sin) i izračunati kut');
  const CX = 160, CY = 150;
  S('circle', { cx: CX, cy: CY, r: 128, class: 'tku-stator-r' }, svg);
  S('circle', { cx: CX, cy: CY, r: 92, class: 'tku-utor' }, svg);
  const nam = [['sin', 0, -1], ['sin', 0, 1], ['cos', 1, 0], ['cos', -1, 0]].map(([n, dx, dy]) => {
    const x = CX + dx * 110, y = CY + dy * 110;
    const r = S('rect', { x: x - (dx ? 14 : 28), y: y - (dx ? 28 : 14), width: dx ? 28 : 56, height: dx ? 56 : 28, rx: 5, class: n === 'sin' ? 'tku-nam-s' : 'tku-nam-c' }, svg);
    return { n, r };
  });
  T(svg, CX + 40, 16, 'namot sin', 'tku-ls', 'start'); T(svg, CX + 140, CY + 40, 'cos', 'tku-ls', 'middle');
  const gR = S('g', {}, svg);
  S('rect', { x: -78, y: -18, width: 156, height: 36, rx: 16, class: 'tku-rotor' }, gR);
  S('rect', { x: -40, y: -12, width: 80, height: 24, rx: 4, class: 'tku-nam-u' }, gR);
  const sPol = strel(gR, 0, 0, 0, 0, { boja: B.nar, w: 4 });
  T(svg, CX, 297, 'rotor s uzbudnim namotom', 'tku-ls', 'middle');
  // desno: krug
  const KX = 470, KY = 140, KR = 90;
  S('circle', { cx: KX, cy: KY, r: KR, class: 'tku-ploca' }, svg);
  S('line', { x1: KX - KR - 8, y1: KY, x2: KX + KR + 8, y2: KY, class: 'tku-mreza' }, svg); S('line', { x1: KX, y1: KY - KR - 8, x2: KX, y2: KY + KR + 8, class: 'tku-mreza' }, svg);
  T(svg, KX + KR + 4, KY - 6, 'u_cos', 'tku-ls', 'end'); T(svg, KX + 6, KY - KR + 4, 'u_sin', 'tku-ls');
  const kTr = S('polyline', { class: 'tku-trag' }, svg);
  const kL = S('line', { class: 'tku-krivulja' }, svg);
  const kT = S('circle', { r: 7, class: 'tku-tocka' }, svg);
  const tTh = T(svg, KX, KY + KR + 30, '', 'tku-lb', 'middle');
  T(svg, KX, KY + KR + 52, 'θ = atan2(u_sin, u_cos)', 'tku-ls', 'middle');
  const svg2 = ui.svg(600, 230, 'Signali u vremenu: uzbuda, u_sin i u_cos s omotnicama', 'tku-svg2');
  const GX = 76, GW = 510, red = [['uzbuda', 42], ['u_sin', 114], ['u_cos', 186]];
  red.forEach(([n, y]) => { T(svg2, 8, y + 5, n, 'tku-ls'); S('line', { x1: GX, y1: y, x2: GX + GW, y2: y, class: 'tku-mreza' }, svg2); });
  S('rect', { x: GX, y: 10, width: GW, height: 212, class: 'tku-graf', 'fill-opacity': 0 }, svg2);
  const kU = S('polyline', { class: 'tku-krivulja-i' }, svg2), kS = S('polyline', { class: 'tku-krivulja-b' }, svg2), kC = S('polyline', { class: 'tku-krivulja' }, svg2);
  const oS = S('polyline', { class: 'tku-krivulja-z' }, svg2), oC = S('polyline', { class: 'tku-krivulja-z' }, svg2);
  const trag = [];
  function osvjezi() {
    const a = st.th * RAD, nos = Math.sin(2 * Math.PI * st.fn * st.t);
    gR.setAttribute('transform', `translate(${CX} ${CY}) rotate(${f1(-st.th)})`);
    sPol.set(0, 0, 70 * nos, 0);
    const s = Math.sin(a), c = Math.cos(a);
    nam.forEach(nm => { const v = nm.n === 'sin' ? s : c; nm.r.style.fillOpacity = (0.25 + 0.75 * Math.abs(v * nos)).toFixed(2); });
    const ns = st.sum ? (Math.random() - 0.5) * 0.08 : 0;
    const us = s * (1 + ns), uc = c * (1 + ns);
    const px = KX + uc * KR * 0.9, py = KY - us * KR * 0.9;
    trag.push([px, py]); if (trag.length > 80) trag.shift();
    kTr.setAttribute('points', pts(trag));
    postavi(kL, { x1: KX, y1: KY, x2: px, y2: py }); postavi(kT, { cx: px, cy: py });
    const thR = Math.atan2(us, uc) / RAD;
    tTh.textContent = `θ = ${hr((thR + 360) % 360, 1)}°`;
    // signali
    const t1 = st.t, t0 = t1 - 3, X = t => GX + (t - t0) / 3 * GW, h = st.hist.filter(q => q[0] >= t0);
    kU.setAttribute('points', pts(h.map(q => [X(q[0]), 42 - q[1] * 26])));
    kS.setAttribute('points', pts(h.map(q => [X(q[0]), 114 - q[2] * q[1] * 26])));
    kC.setAttribute('points', pts(h.map(q => [X(q[0]), 186 - q[3] * q[1] * 26])));
    oS.setAttribute('points', pts(h.map(q => [X(q[0]), 114 - q[2] * 26])));
    oC.setAttribute('points', pts(h.map(q => [X(q[0]), 186 - q[3] * 26])));
    o.th(hr((st.th % 360 + 360) % 360, 1) + '°'); o.r(hr((thR + 360) % 360, 1) + '°');
    o.us(hr(us, 3)); o.uc(hr(uc, 3)); o.a(hr(Math.hypot(us, uc), 3) + (st.sum ? ' (mijenja se, kut ne)' : ''));
  }
  ctx.petlja(dt => {
    st.t += dt;
    if (st.radi) { st.th += st.w * dt; kl.postavi(Math.round(((st.th % 360) + 360) % 360)); }
    const a = st.th * RAD;
    st.hist.push([st.t, Math.sin(2 * Math.PI * st.fn * st.t), Math.sin(a), Math.cos(a)]);
    while (st.hist.length && st.hist[0][0] < st.t - 3.2) st.hist.shift();
    osvjezi();
    return true;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', v => { kl.ulaz.disabled = v; ui.stanje(v ? 'Rotor se vrti: omotnice u_sin i u_cos su sinus i kosinus kuta rotora.' : 'Rotor stoji — klizačem zadaj kut.'); }, r).osvjezi();
  const kl = ui.klizac('Kut rotora θ', 0, 359, 1, st.th, v => v + '°', v => { st.th = v; trag.length = 0; });
  kl.ulaz.disabled = true;
  ui.klizac('Brzina vrtnje (usporeno)', 5, 90, 1, st.w, v => v + ' °/s', v => { st.w = v; });
  ui.kvacica('Šum i promjena amplitude (temperatura, starenje)', false, v => { st.sum = v; });
  const o = ui.ocit([['th', 'Stvarni kut rotora'], ['r', 'Kut iz RDC-a (atan2)'], ['us', 'Omotnica u_sin'], ['uc', 'Omotnica u_cos'], ['a', 'Amplituda √(u_sin² + u_cos²)']]);
  tablica(ui, ['', 'rezolver', 'inkrementalni enkoder'], [
    ['načelo', 'okretni transformator, analogni sin/cos', 'optički disk s prorezima, impulsi A/B'],
    ['kut unutar okretaja', 'apsolutni, odmah nakon uključenja', 'relativni, broji od referentne točke'],
    ['elektronika u davaču', 'nema (samo namoti)', 'LED, fotodiode, sklop'],
    ['temperatura, vibracije', 'vrlo otporan', 'osjetljiviji'],
    ['razlučivost', 'ovisi o RDC-u (npr. 12–16 bita)', 'broj proreza × 4']
  ]);
  ui.sitno('Razlučivost RDC-a u tablici je raspon uobičajen za takve pretvornike, ne podatak za KR AGILUS.');
  osvjezi(); ui.stanje('Rotor se vrti: omotnice u_sin i u_cos su sinus i kosinus kuta rotora.'); ctx.budi();
}


/* =========================================================== 5. umjeravanje */
function tUmjeravanje(ui, ctx) {
  const K = 70;                                    // px po stupnju u uvećanom prikazu
  const st = { os: 1, ist: 0, voz: false, greska: [0, 0, 0, 0, 0, 0], umj: [true, true, true, true, true, true], hist: [], minD: null };
  const svg = ui.svg(600, 380, 'Uvećani prikaz umjeravanja: mjerni uložak s pipalom iznad površine osi s urezanom oznakom; lijevo dolje robot u položaju umjeravanja');
  // površina s oznakom
  const SX = 230, SY = 170, SW = 360;
  T(svg, SX + SW / 2, 24, 'uvećano: mjerni uložak i urezana oznaka', 'tku-ls', 'middle');
  const clip = svg.clip(SX, 40, SW, 200);
  const gP = S('g', { 'clip-path': clip }, svg);
  const povrs = S('path', { class: 'tku-povrs' }, gP);
  S('rect', { x: SX, y: 40, width: SW, height: 200, class: 'tku-okvir-t' }, svg);
  // uložak
  const UX = SX + SW / 2;
  S('rect', { x: UX - 30, y: 46, width: 60, height: 70, rx: 6, class: 'tku-ulozak' }, svg);
  const pip = S('rect', { x: UX - 6, width: 12, rx: 5, class: 'tku-pipalo' }, svg);
  const opr = S('path', { class: 'tku-opruga' }, svg);
  T(svg, UX + 40, 70, 'mjerni uložak (EMD)', 'tku-ls');
  const tOz = T(svg, UX, 232, '', 'tku-ls', 'middle');
  // graf dubine
  const g2 = graf(svg, SX + 34, 278, SW - 40, 80, { x0: 3, x1: -1.5, y0: 0, y1: 1.1, yt: [0, 1], xt: [3, 2, 1, 0, -1], naslov: 'dubina pipala prema kutu osi', xf: v => hrp(v, 0) + '°', yf: v => v ? 'dno' : '0' });
  const kD = S('polyline', { class: 'tku-krivulja' }, svg);
  const tMin = S('circle', { r: 6, class: 'tku-tocka-n' }, svg); tMin.style.display = 'none';
  // robot u položaju umjeravanja
  const s = 0.2, OX = 95, OY = 340;
  const gR = S('g', {}, svg);
  podnozjeBocno(gR, OX, OY, s);
  const ruka = ruka2D(gR, { s });
  const ist = S('circle', { r: 14, class: 'tku-isticanje' }, gR);
  T(svg, OX + 20, 52, 'položaj umjeravanja', 'tku-ls', 'middle');
  const pr = prXZ(OX, OY, s);
  const dub = u => Math.max(0, 1 - Math.hypot(u, 0.12) / 1.2);
  function osvjezi() {
    const q = D.umjeravanje.kut;
    const P = tockeRuke(q).map(pr);
    ruka.postavi(P);
    const zgl = [P[1], P[2], P[3], P[4], P[5], P[6]][st.os];
    postavi(ist, { cx: zgl[0], cy: zgl[1] });
    // površina: x zaslona = UX + (u − ist)·K, gdje u = kut od oznake
    const pts2 = [];
    for (let x = SX - 10; x <= SX + SW + 10; x += 3) { const u = st.ist + (x - UX) / K; pts2.push([x, SY + dub(u) * 46]); }
    povrs.setAttribute('d', put([[SX - 10, 240], ...pts2, [SX + SW + 10, 240]], true));
    const dp = dub(st.ist), yv = SY + dp * 46;
    postavi(pip, { y: 116, height: yv - 116 });
    opr.setAttribute('d', `M${UX - 10},${f1(64)} ` + Array.from({ length: 6 }, (_, k) => `L${UX + (k % 2 ? 10 : -10)},${f1(64 + (k + 1) * 8)}`).join(' '));
    tOz.textContent = 'urezana oznaka (zarez)';
    kD.setAttribute('points', pts(st.hist.map(([u, d]) => [g2.X(ogr(u, -1.5, 3)), g2.Y(d)])));
    if (st.minD != null) { tMin.style.display = ''; postavi(tMin, { cx: g2.X(st.minD), cy: g2.Y(dub(st.minD)) }); } else tMin.style.display = 'none';
    const o2 = D.osi[st.os].ime, mq = q[st.os];
    o.os(`${o2}: položaj umjeravanja ${hrp(mq, 0)}°`);
    o.pr(st.umj[st.os] ? hrp(mq + st.ist, 2) + '°' : '— (os nije umjerena)', st.umj[st.os] ? (Math.abs(st.greska[st.os]) > 0.01 ? 'opas' : 'ok') : 'upoz');
    o.st(hrp(mq + st.ist - st.greska[st.os], 2) + '°');
    o.gr(hrp(st.greska[st.os], 2) + '°', Math.abs(st.greska[st.os]) > 0.01 ? 'opas' : 'ok');
    o.sve(D.osi.map((x, k) => x.ime + (st.umj[k] && Math.abs(st.greska[k]) < 0.01 ? ' ✓' : ' ✗')).join('  '));
  }
  ctx.petlja(dt => {
    if (!st.voz) { osvjezi(); return false; }
    st.ist -= 0.9 * dt;                      // polagana vožnja (prikaz)
    st.hist.push([st.ist, dub(st.ist)]);
    if (st.ist <= -1.4) {
      st.voz = false;
      let mn = st.hist[0]; for (const h of st.hist) if (h[1] > mn[1]) mn = h;
      st.minD = mn[0];
      const stara = st.greska[st.os];
      st.greska[st.os] = 0; st.umj[st.os] = true;
      ui.stanje(`${D.osi[st.os].ime} umjerena: u najdubljoj točki pipala upravljanje je pohranilo pomak (ispravak ${hrp(-stara, 2)}°). Prikazani kut sada odgovara stvarnom.`, 'ok');
      st.ist = 0;
    }
    osvjezi();
    return st.voz;
  });
  ui.seg('Os', D.osi.map((x, k) => [k, x.ime]), 1, k => { st.os = k; st.hist = []; st.minD = null; st.ist = 0; osvjezi(); });
  const r = ui.red();
  ui.gumb('Umjeri os', () => { st.ist = 3; st.hist = []; st.minD = null; st.voz = true; ui.stanje(`Os ${D.osi[st.os].ime} ide u predpoložaj i polako se vozi preko oznake; EMD prati dubinu pipala …`, 'plavo'); ctx.budi(); }, { u: r });
  const r2 = ui.red();
  ui.gumb('Sudar', () => { st.greska[st.os] += 1.7; ui.stanje(`Sudar je pomaknuo spoj osi ${D.osi[st.os].ime}: prikazani kut je za ${hr(st.greska[st.os], 2)}° pogrešan. Programirane točke više ne pogađaju predmet.`, 'opas'); osvjezi(); }, { tanki: true, u: r2 });
  ui.gumb('Ručno otpuštanje kočnice', () => { for (let k = 0; k < 6; k++) st.greska[k] += 0.4 + 0.2 * k; ui.stanje('Osi su pomaknute uređajem za otpuštanje bez upravljanja — sve osi treba ponovno umjeriti.', 'opas'); osvjezi(); }, { tanki: true, u: r2 });
  ui.gumb('Zamjena motora', () => { st.umj[st.os] = false; st.greska[st.os] = 37.5; ui.stanje(`Novi motor na ${D.osi[st.os].ime} ima rezolver bez pohranjenog pomaka: os nije umjerena i smije se gibati samo ručno, osno.`, 'upoz'); osvjezi(); }, { tanki: true, u: r2 });
  const o = ui.ocit([['os', 'Os'], ['pr', 'Prikazani kut (smartPAD)'], ['st', 'Stvarni mehanički kut'], ['gr', 'Pogreška umjerenosti'], ['sve', 'Stanje osi']]);
  ui.sitno(`Položaj umjeravanja (${D.umjeravanje.izvor}): ${kutovi(D.umjeravanje.kut)}${D.umjeravanje.provjeriti ? ' — provjeriti u priručniku robota' : ''}. Transportni položaj sixx: ${kutovi(D.transport)}.`);
  osvjezi(); ui.stanje('Odaberi os i pritisni „Umjeri os”.'); ctx.budi();
}

/* =========================================================== 6. servoregulacija */
function tServoRegulacija(ui, ctx) {
  const J = 0.4, MMAX = 60, DT = 0.00025, USP = 4, TW = 1.0;
  const st = { Kp: 30, Kv: 25, ff: false, prikaz: 'cijelo', t: 0, t0: -10, smjer: 0, cilj0: 0, q: 0, w: 0, i: 0, int: 0, zad: 0, zadIpo: 0, tIpo: 0, dist: 0, hist: [], radi: false };
  const svg = ui.svg(600, 200, 'Blok-shema kaskadne regulacije: interpolator, regulator položaja, regulator brzine, regulator struje, motor s prijenosnikom; povratna veza s rezolvera');
  const blok = (x, w, n1, n2) => { const g = S('g', { class: 'tku-rb' }, svg); S('rect', { x, y: 40, width: w, height: 56, rx: 8 }, g); T(g, x + w / 2, 64, n1, 'tku-ls', 'middle'); const t = T(g, x + w / 2, 86, n2, 'tku-ls', 'middle'); return { g, t }; };
  const bI = blok(6, 96, 'interpolator', ''), bP = blok(128, 92, 'položaj Kp', ''), bV = blok(246, 92, 'brzina PI', ''), bC = blok(364, 92, 'struja', ''), bM = blok(482, 112, 'motor + prij.', '');
  for (const [a, b] of [[102, 128], [220, 246], [338, 364], [456, 482]]) strel(svg, a, 68, b, 68, { w: 2, gl: 8 });
  S('path', { d: 'M538,96 L538,160 L174,160 L174,96', class: 'tku-vod-r' }, svg);
  S('path', { d: 'M538,160 L292,160 L292,96', class: 'tku-vod-r' }, svg);
  const tokV = S('path', { d: 'M538,96 L538,160 L174,160 L174,96', class: 'tku-tok-r' }, svg);
  T(svg, 360, 182, 'povratna veza: rezolver → RDC → kut i brzina', 'tku-ls', 'middle');
  const tTakt = T(svg, 54, 26, '', 'tku-ls', 'middle');
  // graf
  const svg2 = ui.svg(600, 330, 'Odziv osi: zadani i stvarni kut, pogreška slijeđenja i moment motora', 'tku-svg2');
  const ga = graf(svg2, 64, 24, 520, 170, { x0: 0, x1: TW, y0: -3, y1: 33, yt: [0, 10, 20, 30], xt: [0, 0.2, 0.4, 0.6, 0.8, 1], naslov: 'kut osi [°] (crtkano zadani, puno stvarni)', xlab: false, ylab: false });
  const yLab = [0, 1, 2, 3].map(k => T(svg2, 58, 0, '', 'tku-ls', 'end'));
  const gb = graf(svg2, 64, 222, 520, 90, { x0: 0, x1: TW, y0: -MMAX, y1: MMAX, yt: [-MMAX, 0, MMAX], xt: [0, 0.2, 0.4, 0.6, 0.8, 1], naslov: 'moment motora (na osi) [Nm] i pogreška slijeđenja ×10 [°]', xlab: false });
  const tProz = T(svg2, 584, 328, '', 'tku-ls', 'end');
  const kZ = S('polyline', { class: 'tku-krivulja-z' }, svg2), kS = S('polyline', { class: 'tku-krivulja' }, svg2);
  const kM = S('polyline', { class: 'tku-krivulja-b' }, svg2), kE = S('polyline', { class: 'tku-krivulja-r' }, svg2);
  // profil
  const V = 120, A = 800, L = 30, ta = V / A, tc = (L - V * ta) / V, Ttot = 2 * ta + tc;
  function profil(t) {
    if (t <= 0) return 0; if (t >= Ttot) return L;
    if (t < ta) return 0.5 * A * t * t;
    if (t < ta + tc) return 0.5 * A * ta * ta + V * (t - ta);
    const r = Ttot - t; return L - 0.5 * A * r * r;
  }
  function korak() {
    const tr = st.t - st.t0;
    // interpolacijski takt
    if (st.t - st.tIpo >= D.ipo / 1000 - 1e-9) { st.tIpo = st.t; st.zadPr = st.zadIpo; st.zadIpo = st.cilj0 + st.smjer * profil(tr); }
    const pr0 = st.zadPr ?? st.zadIpo, zad = pr0 + (st.zadIpo - pr0) * Math.min(1, (st.t - st.tIpo) / (D.ipo / 1000));   // fina interpolacija u pogonu
    st.zadF = zad;
    const wff = st.ff ? (st.zadIpo - (st.zadPr ?? st.zadIpo)) / (D.ipo / 1000) : 0;
    const wRef = st.Kp * (zad - st.q) + wff;
    const e = (wRef - st.w) * RAD;
    st.int += e * DT;
    let iRef = st.Kv * e + st.Kv * 40 * st.int;
    iRef = ogr(iRef, -MMAX, MMAX);
    st.i += (iRef - st.i) * DT / (D.primjer.tauStrujna / 1000);
    const acc = (st.i - st.dist - 2 * st.w * RAD) / J;
    st.w += acc / RAD * DT; st.q += st.w * DT; st.t += DT;
    return st.zadIpo;
  }
  function osvjezi() {
    const t1 = st.t, ok = st.prikaz === 'cijelo';
    const w0 = ok ? TW : 0.06, x0 = ok ? Math.max(0, t1 - TW) : Math.max(0, st.t0 + ta * 0.4), X = t => ga.x + (t - x0) / w0 * ga.w;
    const h = st.hist.filter(q => q[0] >= x0 && q[0] <= x0 + w0);
    const y0 = ok ? -3 : null;
    let ymn = -3, ymx = 33;
    if (!ok && h.length) { ymn = Math.min(...h.map(q => Math.min(q[1], q[2]))) - 0.2; ymx = Math.max(...h.map(q => Math.max(q[1], q[2]))) + 0.2; }
    const Ya = v => ga.y + ga.h - (v - ymn) / (ymx - ymn) * ga.h;
    yLab.forEach((t, k) => { const v = ok ? k * 10 : ymn + (ymx - ymn) * (k * 10 + 3) / 36; t.textContent = hr(v, ok ? 0 : 2); postavi(t, { y: Ya(v) + 5 }); });
    tProz.textContent = ok ? 'vremenski prozor 1 s (mreža 0,2 s)' : 'vremenski prozor 60 ms od početka gibanja (mreža 12 ms)';
    const stube = [];
    for (let k = 0; k < h.length; k++) { if (k) stube.push([X(h[k][0]), Ya(h[k - 1][1])]); stube.push([X(h[k][0]), Ya(h[k][1])]); }
    kZ.setAttribute('points', pts(stube));
    kS.setAttribute('points', pts(h.map(q => [X(q[0]), Ya(q[2])])));
    kM.setAttribute('points', pts(h.map(q => [X(q[0]), gb.Y(q[3])])));
    kE.setAttribute('points', pts(h.map(q => [X(q[0]), gb.Y(ogr((q[4] - q[2]) * 10, -MMAX, MMAX))])));
    void y0;
    const pos = st.hist.length ? st.hist[st.hist.length - 1] : [0, 0, 0, 0];
    const ef = Math.max(0, ...st.hist.filter(q => q[0] > t1 - TW).map(q => Math.abs(q[1] - q[2])));
    tTakt.textContent = `takt ${D.ipo} ms`;
    bI.t.textContent = hr(pos[1], 2) + '°'; bP.t.textContent = 'Kp = ' + hr(st.Kp, 0) + ' 1/s'; bV.t.textContent = 'Kv = ' + hr(st.Kv, 0); bC.t.textContent = hr(pos[3], 1) + ' Nm'; bM.t.textContent = hr(pos[2], 2) + '°';
    tokV.style.opacity = st.radi ? '1' : '0'; tokV.style.strokeDashoffset = f1(-st.t * 400);
    o.e(hr(pos[1] - pos[2], 3) + '°'); o.em(hr(ef, 2) + '°', ef > 2 ? 'upoz' : ''); o.M(hr(pos[3], 1) + ' Nm', Math.abs(pos[3]) >= MMAX - 0.5 ? 'opas' : '');
    o.ipo(`${D.ipo} ms → ${hr(1000 / D.ipo, 1)} zadanih vrijednosti u sekundi`);
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const n = Math.round(dt / USP / DT);
    for (let k = 0; k < n; k++) { const z = korak(); if (k % 8 === 0) st.hist.push([st.t, z, st.q, st.i, st.zadF]); }
    while (st.hist.length && st.hist[0][0] < st.t - 3) st.hist.shift();
    const ost = st.t - st.t0 > Ttot + 0.6 && Math.abs(st.w) < 0.3;
    if (ost) {
      st.radi = false;
      const kp = st.Kv < 8 ? ' Malo pojačanje brzine Kv daje slabo prigušen odziv.' : '';
      ui.stanje(`Os je stigla. Najveća pogreška slijeđenja: ${hr(Math.max(...st.hist.filter(q => q[0] > st.t0).map(q => Math.abs(q[1] - q[2]))), 2)}°${st.ff ? ' (s predupravljanjem brzine)' : ' — razmjerna je brzini i obrnuto razmjerna Kp'}.${kp}`, 'ok');
    }
    osvjezi();
    return st.radi;
  });
  const r = ui.red();
  ui.gumb('Pomakni os', () => {
    st.cilj0 = st.zadIpo; st.smjer = st.cilj0 > 15 ? -1 : 1; st.t0 = st.t + 0.05; st.radi = true;
    ui.stanje(`Os ide ${st.smjer > 0 ? '0° → 30°' : '30° → 0°'}; interpolator šalje novu zadanu vrijednost svakih ${D.ipo} ms.`, 'plavo'); ctx.budi();
  }, { u: r });
  ui.gumb('Udar tereta', () => { st.dist = st.dist ? 0 : 18; ui.stanje(st.dist ? 'Na os djeluje dodatnih 18 Nm: petlja brzine povećava moment dok integralni dio ne poništi pogrešku.' : 'Dodatni teret uklonjen.', 'upoz'); if (!st.radi) { st.radi = true; st.t0 = st.t - Ttot; } ctx.budi(); }, { tanki: true, u: r });
  ui.klizac('Pojačanje položaja Kp', 5, 100, 1, st.Kp, v => v + ' 1/s', v => { st.Kp = v; });
  ui.klizac('Pojačanje brzine Kv', 2, 80, 1, st.Kv, v => v + ' Nm·s/rad', v => { st.Kv = v; });
  ui.kvacica('Predupravljanje brzine (feed-forward)', false, v => { st.ff = v; });
  ui.seg('Prikaz', [['cijelo', 'Cijelo (1 s)'], ['uvec', 'Uvećano (60 ms)']], 'cijelo', v => { st.prikaz = v; osvjezi(); });
  const o = ui.ocit([['e', 'Trenutna pogreška slijeđenja'], ['em', 'Najveća pogreška (zadnja 1 s)'], ['M', `Moment motora (granica ${MMAX} Nm, primjer)`], ['ipo', 'Interpolacijski takt']]);
  osvjezi(); ui.stanje('Pritisni „Pomakni os”.'); ctx.budi();
}

/* =========================================================== 7. kinematika DH */
function tKinematikaDH(ui, ctx) {
  const st = { q: D.home.slice(), okv: true, anim: false, ta: 0 };
  const svg = ui.svg(600, 440, 'Robot u bočnom (X–Z) i tlocrtnom (X–Y) pogledu prema zadanim kutovima osi, s osima z DH okvira');
  const sB = 0.26, OXB = 105, OYB = 400, sT = 0.2, OXT = 445, OYT = 230;
  T(svg, 20, 24, 'bočno (X–Z)', 'tku-ls'); T(svg, 360, 24, 'tlocrt (X–Y)', 'tku-ls');
  S('line', { x1: 342, y1: 30, x2: 342, y2: 430, class: 'tku-mreza' }, svg);
  const gB = S('g', {}, svg), gT = S('g', {}, svg);
  podnozjeBocno(gB, OXB, OYB, sB);
  podnozjeTlocrt(gT, OXT, OYT, sT);
  // doseg
  S('circle', { cx: OXT, cy: OYT, r: f1(D.doseg * sT), class: 'tku-doseg' }, gT);
  const rB = ruka2D(gB, { s: sB }), rT = ruka2D(gT, { s: sT });
  const prB = prXZ(OXB, OYB, sB), prT = prXY(OXT, OYT, sT);
  const okB = [], okT = [];
  for (let k = 0; k < 7; k++) { okB.push(strel(gB, 0, 0, 0, 0, { boja: B.pl, w: 2, gl: 7 })); okT.push(strel(gT, 0, 0, 0, 0, { boja: B.pl, w: 2, gl: 7 })); }
  osi2D(gB, { x: 'X', y: 'Z' }).set(290, 90, [1, 0], [0, -1], 28);
  osi2D(gT, { x: 'X', y: 'Y' }).set(530, 400, [1, 0], [0, -1], 24);
  const tPB = T(svg, 330, 420, '', 'tku-ls', 'end');
  // DH tablica
  const tab = tablica(ui, ['i', 'θ [°]', 'd [mm]', 'a [mm]', 'α [°]'], [0, 1, 2, 3, 4, 5].map(() => ['', '', '', '', '']));
  function osvjezi() {
    const q = st.q, f = fkK(q), P = tockeRuke(q);
    rB.postavi(P.map(prB)); rT.postavi(P.map(prT));
    f.okviri.forEach((Tk, k) => {
      const p = toc(Tk), z = [Tk[2], Tk[6], Tk[10]], L = 70;
      const a = prB(p), b = prB([p[0] + z[0] * L, p[1] + z[1] * L, p[2] + z[2] * L]);
      const c = prT(p), d = prT([p[0] + z[0] * L, p[1] + z[1] * L, p[2] + z[2] * L]);
      okB[k].set(a[0], a[1], b[0], b[1]); okT[k].set(c[0], c[1], d[0], d[1]);
      okB[k].style.display = okT[k].style.display = st.okv ? '' : 'none';
      if (!st.okv) { okB[k].style.display = okT[k].style.display = 'none'; }
    });
    const abc = abcK(f.T);
    tPB.textContent = `FLANGE X ${hr(f.p[0], 1)}  Z ${hr(f.p[2], 1)} mm`;
    dhRedci(q).forEach(([th, d, a, al], k) => {
      const c = tab.redovi[k].children;
      c[0].textContent = String(k + 1) + (k === 5 ? ' (+FLANGE)' : '');
      c[1].textContent = hr(th, 1); c[2].textContent = hr(d, 0); c[3].textContent = hr(a, 0); c[4].textContent = hr(al, 0);
    });
    o.X(hr(f.p[0], 1) + ' mm'); o.Y(hr(f.p[1], 1) + ' mm'); o.Z(hr(f.p[2], 1) + ' mm');
    o.A(hr(abc[0], 1) + '°'); o.B(hr(abc[1], 1) + '°', Math.abs(Math.abs(abc[1]) - 90) < 0.05 ? 'upoz' : ''); o.C(hr(abc[2], 1) + '°');
    const w = toc(f.okviri[4]);
    o.w(`${hr(Math.hypot(w[0], w[1]), 0)} mm od osi A1, ${hr(w[2], 0)} mm visine`);
    if (Math.abs(Math.abs(abc[1]) - 90) < 0.05) ui.stanje('B = ±90°: Eulerovi kutovi su ovdje singularni — A i C nisu jednoznačni (upravljanje tada uzima C = 0). Položaj prirubnice je i dalje jednoznačan.', 'upoz');
    else ui.stanje(`Prirubnica: X ${hr(f.p[0], 1)}, Y ${hr(f.p[1], 1)}, Z ${hr(f.p[2], 1)} mm; A ${hr(abc[0], 1)}°, B ${hr(abc[1], 1)}°, C ${hr(abc[2], 1)}°.`, 'ok');
  }
  const DEMO = [D.home, [40, -60, 70, 60, 50, 90], [-50, -110, 130, -45, 80, -60], [0, -90, 90, 0, 90, 0], D.home];
  ctx.petlja(dt => {
    if (!st.anim) return false;
    st.ta += dt * 0.45;
    const i = Math.floor(st.ta), u = st.ta - i;
    if (i >= DEMO.length - 1) { st.anim = false; bA.osvjezi(); pozicija(D.home); return false; }
    const w = u * u * (3 - 2 * u);
    st.q = DEMO[i].map((v, k) => v + (DEMO[i + 1][k] - v) * w);
    kl.forEach((k, j) => k.postavi(Math.round(st.q[j])));
    osvjezi();
    return true;
  });
  const kl = D.osi.map((ox, k) => ui.klizac(ox.ime, ox.min, ox.max, 1, st.q[k], v => hrp(v, 0) + '°', v => { st.anim = false; bA.osvjezi(); st.q[k] = v; osvjezi(); }));
  const pozicija = q => { st.q = q.slice(); kl.forEach((k, i) => k.postavi(st.q[i])); osvjezi(); };
  const r = ui.red();
  const bA = ui.igraj(st, 'anim', 'Animiraj', v => { if (v) st.ta = 0; }, r); bA.osvjezi();
  ui.gumb('HOME', () => { st.anim = false; bA.osvjezi(); pozicija(D.home); }, { tanki: true, u: r });
  ui.gumb('Sve osi 0°', () => pozicija([0, 0, 0, 0, 0, 0]), { tanki: true, u: r });
  ui.gumb('Prirubnica dolje', () => pozicija([0, -90, 90, 0, 90, 0]), { tanki: true, u: r });
  ui.gumb('Transportni (sixx)', () => pozicija(D.transport), { tanki: true, u: r });
  ui.kvacica('Prikaži osi z DH okvira (oko njih se vrte zglobovi)', true, v => { st.okv = v; osvjezi(); });
  const o = ui.ocit([['X', 'X'], ['Y', 'Y'], ['Z', 'Z'], ['A', 'A (oko Z)'], ['B', 'B (oko Y′)'], ['C', 'C (oko X″)'], ['w', 'Točka zapešća']]);
  ui.sitno('T = T₁·T₂·…·T₆, Tᵢ = Rz(θᵢ)·Tz(dᵢ)·Tx(aᵢ)·Rx(αᵢ); θ₁ = −A1, θ₂ = A2, θ₃ = A3 − 90°, θ₄ = −A4, θ₅ = −A5, θ₆ = −A6 + 180°.');
  osvjezi(); ctx.budi();
}

/* =========================================================== 8. singularnosti */
function tSingularnosti(ui, ctx) {
  const st = { tip: 'glava', s: 60, anim: false, ts: 0 };
  const TIPOVI = {
    glava: { naziv: 'iznad glave', min: 0, max: 200, kor: 1, poc: 60, fmt: v => hr(v, 0) + ' mm', ozn: 'Udaljenost točke zapešća od osi A1' },
    ispruzena: { naziv: 'ispružena ruka', min: 0, max: 30, kor: 0.1, poc: 10, fmt: v => 'A3 = ' + hr(4.76 + v, 1) + '°', ozn: 'Odmak od ispruženog položaja' },
    zapesce: { naziv: 'zapešće', min: 0, max: 30, kor: 0.1, poc: 10, fmt: v => 'A5 = ' + hr(v, 1) + '°', ozn: 'Kut A5' }
  };
  const svg = ui.svg(600, 380, 'Robot u bočnom pogledu blizu odabrane singularnosti i stupčasti prikaz potrebnih brzina osi prema najvećim brzinama');
  const s = 0.27, OX = 120, OY = 360, pr = prXZ(OX, OY, s);
  const gR = S('g', {}, svg);
  podnozjeBocno(gR, OX, OY, s);
  const pom = S('line', { class: 'tku-crtica-r' }, gR);
  const ruka = ruka2D(gR, { s });
  const sTw = strel(gR, 0, 0, 0, 0, { boja: B.nar, w: 4 });
  const tTw = T(gR, 0, 0, '', 'tku-ls tku-t-upoz', 'middle');
  // stupci
  const BX = 345, BW = 240, BY = 50, BH = 260, MAXR = 3;
  T(svg, BX, 30, 'potrebna brzina osi / najveća brzina', 'tku-ls');
  S('rect', { x: BX, y: BY, width: BW, height: BH, class: 'tku-graf' }, svg);
  const yR = v => BY + BH - Math.min(v, MAXR) / MAXR * BH;
  for (const v of [1, 2, 3]) { S('line', { x1: BX, y1: f1(yR(v)), x2: BX + BW, y2: f1(yR(v)), class: v === 1 ? 'tku-prag' : 'tku-mreza' }, svg); T(svg, BX - 6, yR(v) + 5, v * 100 + ' %', 'tku-ls', 'end'); }
  const stup = D.osi.map((ox, k) => {
    const x = BX + 12 + k * 38;
    const r = S('rect', { x, width: 26, class: 'tku-stupac' }, svg);
    T(svg, x + 13, BY + BH + 20, ox.ime, 'tku-ls', 'middle');
    const t = T(svg, x + 13, BY + BH - 6, '', 'tku-ls', 'middle');
    const pr2 = S('path', { class: 'tku-preko', d: `M${x},${BY + 12} L${x + 13},${BY - 2} L${x + 26},${BY + 12}Z` }, svg);
    return { r, t, pr2 };
  });
  const tMj = T(svg, BX + BW / 2, BY + BH + 46, '', 'tku-ls', 'middle');
  function konfig() {
    const v = st.s;
    if (st.tip === 'glava') return ikDolje(v, 0, 820);
    if (st.tip === 'ispruzena') return [0, -30, 4.7636 + v, 0, 45, 0];
    return [0, -80, 80, 30, v, 0];
  }
  function osvjezi() {
    const q = konfig(), f = fkK(q), P = tockeRuke(q), Pz = P.map(pr);
    ruka.postavi(Pz);
    const wp = P[5], fl = P[6];
    let tw, opis;
    if (st.tip === 'glava') {
      tw = [0, 100, 0, 0, 0, 0]; opis = 'LIN 100 mm/s bočno (Y)';
      postavi(pom, { x1: OX, y1: OY - 10, x2: OX, y2: 30 });
      const a = pr(fl); sTw.set(a[0], a[1], a[0] - 1, a[1] - 1); sTw.style.display = 'none'; postavi(tTw, { x: a[0] + 4, y: a[1] + 38 }); tTw.textContent = '⊙ v (iz ravnine)';
    } else if (st.tip === 'ispruzena') {
      const a2 = P[2], d = [wp[0] - a2[0], wp[1] - a2[1], wp[2] - a2[2]], L = Math.hypot(...d);
      tw = [100 * d[0] / L, 100 * d[1] / L, 100 * d[2] / L, 0, 0, 0]; opis = 'LIN 100 mm/s prema van';
      const p0 = pr(a2), p1 = pr([a2[0] + d[0] * 1.25, a2[1], a2[2] + d[2] * 1.25]);
      postavi(pom, { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] });
      const a = pr(fl); sTw.style.display = ''; sTw.set(a[0], a[1], a[0] + d[0] / L * 50, a[1] - d[2] / L * 50); postavi(tTw, { x: a[0] + 20, y: a[1] - 30 }); tTw.textContent = 'v';
    } else {
      const T3 = f.okviri[3], T4 = f.okviri[4];
      const z3 = [T3[2], T3[6], T3[10]], z4 = [T4[2], T4[6], T4[10]];
      let c = [z3[1] * z4[2] - z3[2] * z4[1], z3[2] * z4[0] - z3[0] * z4[2], z3[0] * z4[1] - z3[1] * z4[0]];
      const Lc = Math.hypot(...c) || 1; c = c.map(x => x / Lc);
      const wv = 30 * RAD, om = c.map(x => x * wv), rr = [fl[0] - wp[0], fl[1] - wp[1], fl[2] - wp[2]];
      const vv = [om[1] * rr[2] - om[2] * rr[1], om[2] * rr[0] - om[0] * rr[2], om[0] * rr[1] - om[1] * rr[0]];
      tw = [...vv, ...om]; opis = 'zakret 30 °/s oko kritične osi';
      const p0 = pr(P[4]), p1 = pr([P[4][0] + z3[0] * 260, P[4][1] + z3[1] * 260, P[4][2] + z3[2] * 260]);
      postavi(pom, { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] });
      sTw.style.display = 'none'; const a = pr(fl); postavi(tTw, { x: a[0] + 10, y: a[1] + 40 }); tTw.textContent = 'ω (kritična os)';
    }
    const J = jakobianK(q), qd = rijesi(J, tw);
    let najg = 0, ime = '';
    stup.forEach((sp, k) => {
      const v = qd ? Math.abs(qd[k] / RAD) : Infinity, rel = v / vMax(k);
      postavi(sp.r, { y: yR(rel), height: BY + BH - yR(rel) });
      sp.r.classList.toggle('tku-stupac-opas', rel > 1);
      sp.pr2.style.display = rel > MAXR ? '' : 'none';
      sp.t.textContent = isFinite(v) && v < 1e5 ? tis(v) : '∞';
      postavi(sp.t, { y: Math.min(yR(rel) - 6, BY + BH - 6) });
      if (rel > najg) { najg = rel; ime = D.osi[k].ime; }
    });
    tMj.textContent = 'gibanje: ' + opis;
    const tp = TIPOVI[st.tip];
    o.k(kutovi(q.map(v => Math.round(v * 10) / 10)));
    o.p(tp.fmt(st.s)); o.n(isFinite(najg) && najg < 1e4 ? `${ime}: ${hr(najg * 100, 0)} % najveće` : `${ime}: neograničeno`, najg > 1 ? 'opas' : 'ok');
    if (!isFinite(najg) || najg > 1e3) ui.stanje(`Točno u singularnosti (${tp.naziv}): traženo gibanje nije moguće nikakvom brzinom osi. LIN/CIRC gibanje kroz ovu točku nije izvedivo; PTP jest.`, 'opas');
    else if (najg > 1) ui.stanje(`Blizu singularnosti (${tp.naziv}): ${ime} bi trebala ${hr(najg * 100, 0)} % svoje najveće brzine — upravljanje mora usporiti gibanje ili ga prekinuti porukom.`, 'upoz');
    else ui.stanje(`Dovoljno daleko od singularnosti (${tp.naziv}): sve osi ostaju ispod najveće brzine.`, 'ok');
  }
  ctx.petlja(dt => {
    if (!st.anim) { osvjezi(); return false; }
    st.ts += dt;
    const tp = TIPOVI[st.tip], f = 0.5 + 0.5 * Math.cos(st.ts * 0.9);
    st.s = tp.min + (tp.max - tp.min) * 0.5 * f * f;
    kl.postavi(Math.round(st.s / tp.kor) * tp.kor);
    osvjezi();
    return true;
  });
  ui.seg('Singularnost', [['glava', 'Iznad glave'], ['ispruzena', 'Ispružena ruka'], ['zapesce', 'Zapešće (A5 = 0)']], 'glava', v => {
    st.tip = v; const tp = TIPOVI[v]; st.s = tp.poc;
    kl.ulaz.min = tp.min; kl.ulaz.max = tp.max; kl.ulaz.step = tp.kor; kl.querySelector('label').textContent = tp.ozn; kl.postavi(st.s); osvjezi();
  });
  const kl = ui.klizac(TIPOVI.glava.ozn, 0, 200, 1, st.s, v => TIPOVI[st.tip].fmt(v), v => { st.s = v; st.anim = false; bA.osvjezi(); osvjezi(); });
  const bA = ui.igraj(st, 'anim', 'Animiraj prilaz', null); bA.osvjezi();
  const o = ui.ocit([['k', 'Kutovi osi'], ['p', 'Odmak'], ['n', 'Najopterećenija os']]);
  ui.sitno(`Najveće brzine osi (${VAR()}): ${D.osi.map((x, k) => x.ime + ' ' + vMax(k)).join(', ')} °/s.`);
  osvjezi(); ctx.budi();
}


/* ------------------------------------------------------- pomoć: 4×4 */
function trans4(R, p) { return [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1]; }
function inv4(T) {          // kruta transformacija
  const R = [T[0], T[4], T[8], T[1], T[5], T[9], T[2], T[6], T[10]];
  const p = [T[3], T[7], T[11]];
  return trans4(R, [-(R[0] * p[0] + R[1] * p[1] + R[2] * p[2]), -(R[3] * p[0] + R[4] * p[1] + R[5] * p[2]), -(R[6] * p[0] + R[7] * p[1] + R[8] * p[2])]);
}
// profil brzine po putanji (uzorkovana polilinija u mm): ograničenja v ≤ vMaxS, v ≤ √(aLat·R), |dv²/ds| ≤ 2a, v = 0 na zadanim indeksima
function profilPutanje(P, vProg, a, aLat, stani) {
  const n = P.length, s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const v = new Array(n).fill(vProg);
  for (let i = 1; i < n - 1; i++) {
    const ax = P[i][0] - P[i - 1][0], ay = P[i][1] - P[i - 1][1], bx = P[i + 1][0] - P[i][0], by = P[i + 1][1] - P[i][1];
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < 1e-6 || lb < 1e-6) continue;
    const kut = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
    if (kut > 0.6) { v[i] = 0; continue; }          // oštar kut: stati
    const R = (la + lb) / 2 / Math.max(kut, 1e-9);
    v[i] = Math.min(v[i], Math.sqrt(aLat * R));
  }
  v[0] = 0; v[n - 1] = 0; for (const k of stani || []) v[k] = 0;
  for (let i = 1; i < n; i++) v[i] = Math.min(v[i], Math.sqrt(v[i - 1] ** 2 + 2 * a * (s[i] - s[i - 1])));
  for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] ** 2 + 2 * a * (s[i + 1] - s[i])));
  const t = [0];
  for (let i = 1; i < n; i++) { const vs = (v[i] + v[i - 1]) / 2; t.push(t[i - 1] + (vs > 1e-6 ? (s[i] - s[i - 1]) / vs : 0)); }
  return { s, v, t, T: t[n - 1] };
}
function uzorak(pr, t) {        // indeks i udio za vrijeme t u profilu
  const tt = pr.t; if (t <= 0) return [0, 0]; if (t >= pr.T) return [tt.length - 2, 1];
  let lo = 0, hi = tt.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tt[m] <= t) lo = m; else hi = m; }
  return [lo, (t - tt[lo]) / Math.max(1e-9, tt[hi] - tt[lo])];
}

/* =========================================================== 9. koordinatni sustavi */
function tKoordinatniSustavi(ui, ctx) {
  const RR = [420, 0, 0];                                         // ROBROOT u WORLD-u [pp]
  const BAZE = [
    { ime: 'BASE[0] = WORLD', p: [0, 0, 0], abc: [0, 0, 0] },
    { ime: 'BASE[1] kutija na traci', p: [1000, 0, 140], abc: [0, 0, 0] },
    { ime: 'BASE[2] nagnuta naprava', p: [120, 0, 260], abc: [0, -30, 0] }
  ];                                                              // [pp]
  const st = { tool: 1, base: 1, tcp: [960, 0, 320], A: 30, B: 20, C: 0, anim: -1, ta: 0 };
  const svg = ui.svg(600, 360, 'Ćelija u bočnom pogledu: koordinatni sustavi WORLD, ROBROOT, BASE, FLANGE i TOOL, robot s alatom');
  const s = 0.32, OX = 40, OY = 330, prW = p => [OX + p[0] * s, OY - p[2] * s];
  S('rect', { x: OX - 20, y: OY, width: 560, height: 12, class: 'tku-stol' }, svg);
  // kutija i naprava
  S('rect', { x: OX + 960 * s, y: OY - 140 * s, width: 180 * s, height: 140 * s, class: 'tku-kutija' }, svg);
  S('path', { d: `M${f1(OX + 40 * s)},${OY} L${f1(OX + 40 * s)},${f1(OY - 220 * s)} L${f1(OX + 240 * s)},${f1(OY - 335 * s)} L${f1(OX + 260 * s)},${OY}Z`, class: 'tku-kutija' }, svg);
  const gR = S('g', {}, svg);
  podnozjeBocno(gR, OX + RR[0] * s, OY, s);
  const ruka = ruka2D(gR, { s });
  const okW = osi2D(svg, { x: 'X', y: 'Z', naziv: 'WORLD = BASE[0]' }), okR = osi2D(svg, { x: 'X', y: 'Z', naziv: 'ROBROOT' });
  const okB = BAZE.map((b, k) => osi2D(svg, { x: 'X', y: 'Z', naziv: k ? b.ime.split(' ')[0] : null }));
  const okF = osi2D(svg, { x: 'X', y: 'Z', naziv: 'FLANGE' }), okT = osi2D(svg, { x: 'X', y: 'Z', naziv: 'TOOL' });
  const Tw = (abc, p) => trans4(rotZYX(...abc), p);
  const T_w_rr = Tw([0, 0, 0], RR);
  // ABC prikaz
  const svg2 = ui.svg(600, 300, 'Orijentacija A, B, C: koordinatni okvir zakrenut redom oko Z, Y′ i X″ u izometrijskom prikazu', 'tku-svg2');
  const CX = 200, CY = 165, L = 110, iso = v => [CX + (v[0] - v[1]) * 0.866 * L, CY + ((v[0] + v[1]) * 0.5 - v[2]) * L];
  const osn = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((v, k) => { const p = iso(v); S('line', { x1: CX, y1: CY, x2: f1(p[0]), y2: f1(p[1]), class: 'tku-os-sivo' }, svg2); T(svg2, p[0] + 8, p[1] + 4, ['x₀', 'y₀', 'z₀'][k], 'tku-ls'); return p; });
  void osn;
  const strZ = [B.crv, B.zel, B.pl].map(b => strel(svg2, CX, CY, CX, CY, { boja: b, w: 4, gl: 12 }));
  const tZ = ['X', 'Y', 'Z'].map((n, k) => T(svg2, 0, 0, n, 'tku-lb ' + ['tku-os-x', 'tku-os-y', 'tku-os-z'][k], 'middle'));
  const fR = ui.formula('R = Rz(A) · Ry(B) · Rx(C)', 4);
  function okvirAbc(A, B2, C) {
    const R = rotZYX(A, B2, C);
    [0, 1, 2].forEach(k => { const v = [R[k], R[3 + k], R[6 + k]], p = iso(v); strZ[k].set(CX, CY, p[0], p[1]); postavi(tZ[k], { x: p[0] + (p[0] - CX) * 0.14, y: p[1] + (p[1] - CY) * 0.14 + 6 }); });
    return R;
  }
  function osvjezi() {
    // položaj robota: flange = tcp + L·(0,0,1) (alat prema dolje)
    const Lt = st.tool ? D.alati[st.tool - 1].z : 0;
    const tcpR = [st.tcp[0] - RR[0], st.tcp[1] - RR[1], st.tcp[2] - RR[2]];
    const q = ikDolje(tcpR[0], tcpR[1], tcpR[2] + Lt);
    if (!q) return false;
    const f = fkK(q), P = tockeRuke(q).map(p => prW([p[0] + RR[0], p[1], p[2] + RR[2]]));
    const tcpS = prW(st.tcp);
    ruka.postavi(P, tcpS);
    // okviri: zaslon x = X, zaslon y = −Z
    const vs = (R, k) => [R[k], -R[6 + k]];
    okW.set(...prW([0, 0, 0]), [1, 0], [0, -1], 34);
    okR.set(...prW(RR), [1, 0], [0, -1], 30);
    BAZE.forEach((b, k) => { const R = rotZYX(...b.abc); okB[k].set(...prW(b.p), vs(R, 0), vs(R, 2), k === st.base ? 36 : 26); okB[k].classList.toggle('tku-osi-akt', k === st.base); okB[k].style.opacity = k === st.base ? '1' : '.45'; });
    const Rf = [f.T[0], f.T[1], f.T[2], f.T[4], f.T[5], f.T[6], f.T[8], f.T[9], f.T[10]];
    okF.set(...prW([f.p[0] + RR[0], f.p[1], f.p[2] + RR[2]]), vs(Rf, 0), vs(Rf, 2), 24);
    okT.style.display = st.tool ? '' : 'none';
    okT.set(...tcpS, vs(Rf, 0), vs(Rf, 2), 24);
    // brojevi
    const T_rr_f = f.T, T_f_t = trans4([1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0, Lt]);
    const T_w_t = mm4(T_w_rr, mm4(T_rr_f, T_f_t));
    const b = BAZE[st.base], T_b_t = mm4(inv4(Tw(b.abc, b.p)), T_w_t);
    const fmt = Tm => { const a = abcK(Tm); return `X ${hr(Tm[3], 1)}  Y ${hr(Tm[7], 1)}  Z ${hr(Tm[11], 1)} · A ${hr(a[0], 0)}° B ${hr(a[1], 0)}° C ${hr(a[2], 0)}°`; };
    o.alat(st.tool ? `${D.alati[st.tool - 1].ime}: ${D.alati[st.tool - 1].opis}, Z = ${Lt} mm u FLANGE-u` : 'TOOL[0] = FLANGE (bez alata)');
    o.w(fmt(T_w_t)); o.rr(fmt(mm4(T_rr_f, T_f_t))); o.b(fmt(T_b_t)); o.b.naziv('TCP u ' + b.ime);
    o.q(kutovi(q.map(v => Math.round(v))));
    return true;
  }
  function osvjeziAbc() {
    let A = st.A, B2 = st.B, C = st.C;
    if (st.anim >= 0) {
      const t = st.ta, f = x => Math.min(1, Math.max(0, x));
      A = st.A * f(t / 1.2); B2 = st.B * f((t - 1.4) / 1.2); C = st.C * f((t - 2.8) / 1.2);
    }
    const R = okvirAbc(A, B2, C);
    fR.set(0, `A = ${hr(A, 0)}° (oko Z), B = ${hr(B2, 0)}° (oko Y′), C = ${hr(C, 0)}° (oko X″)`);
    for (let k = 0; k < 3; k++) fR.set(k + 1, '[ ' + [0, 1, 2].map(j => hrp(R[k * 3 + j], 3)).join('  ') + ' ]');
  }
  ctx.petlja(dt => {
    if (st.anim < 0) { osvjeziAbc(); return false; }
    st.ta += dt; osvjeziAbc();
    if (st.ta > 4.2) { st.anim = -1; ui.stanje('Okvir je zakrenut redom: najprije A oko Z, zatim B oko nove osi Y′, na kraju C oko najnovije osi X″.', 'ok'); return false; }
    return true;
  });
  const tlist = [[0, 'TOOL[0]'], ...D.alati.slice(0, D.stanica.alati).map((a, k) => [k + 1, a.ime])];
  ui.seg('Aktivni alat', tlist, st.tool, v => { st.tool = v; osvjezi(); ui.stanje(v ? `Aktivan ${D.alati[v - 1].ime}: robot stoji isto, ali TCP je sada na vrhu alata — i brojevi položaja se mijenjaju.` : 'Bez alata: TCP je središte čela prirubnice.', 'plavo'); });
  ui.seg('Aktivna baza', BAZE.map((b, k) => [k, 'BASE[' + k + ']']), st.base, v => { st.base = v; osvjezi(); ui.stanje(`Brojevi TCP-a sada su u ${BAZE[v].ime}. Ručno gibanje „X+” ide po osi X te baze.`, 'plavo'); });
  const r = ui.red();
  const jog = (smj, ime) => ui.gumb(ime, () => {
    const b = BAZE[st.base], R = rotZYX(...b.abc), k = smj[0], zn = smj[1];
    const d = [R[k] * 25 * zn, R[3 + k] * 25 * zn, R[6 + k] * 25 * zn];
    const st0 = st.tcp.slice(); st.tcp = st.tcp.map((v, i) => v + d[i]);
    if (st.tcp[2] < 40 || !osvjezi()) { st.tcp = st0; osvjezi(); ui.stanje('Izvan dosega ili ispod stola — gibanje odbijeno.', 'upoz'); return; }
    ui.stanje(`Ručno gibanje ${ime} u ${b.ime}: TCP se pomaknuo 25 mm po osi baze.`, 'ok');
  }, { tanki: true, u: r, aria: 'Ručno gibanje ' + ime + ' u aktivnoj bazi' });
  jog([0, 1], 'X+'); jog([0, -1], 'X−'); jog([2, 1], 'Z+'); jog([2, -1], 'Z−');
  const o = ui.ocit([['alat', 'Aktivni alat'], ['w', 'TCP u WORLD'], ['rr', 'TCP u ROBROOT'], ['b', 'TCP u bazi'], ['q', 'Kutovi osi']]);
  const sk = ui.skupina(); sk.append(H('p', { class: 'tku-podnaslov', tekst: 'Orijentacija A, B, C (donji prikaz)' }));
  ui.klizac('A (oko Z)', -180, 180, 1, st.A, v => hrp(v, 0) + '°', v => { st.A = v; st.anim = -1; osvjeziAbc(); }, sk);
  ui.klizac('B (oko Y′)', -90, 90, 1, st.B, v => hrp(v, 0) + '°', v => { st.B = v; st.anim = -1; osvjeziAbc(); }, sk);
  ui.klizac('C (oko X″)', -180, 180, 1, st.C, v => hrp(v, 0) + '°', v => { st.C = v; st.anim = -1; osvjeziAbc(); }, sk);
  ui.gumb('Zakreni redom Z → Y′ → X″', () => { st.anim = 0; st.ta = 0; ui.stanje('Zakret A oko Z …', 'plavo'); ctx.budi(); }, { tanki: true, u: ui.red('', sk) });
  osvjezi(); osvjeziAbc(); ui.stanje('Odaberi alat i bazu: robot stoji, a mijenjaju se TCP i brojevi.'); ctx.budi();
}

/* =========================================================== 10. PTP / LIN / CIRC */
function tGibanjaKRL(ui, ctx) {
  const Z = 300, P1 = [330, 400, Z], P2 = [560, -320, Z], PA = [700, 150, Z], TA = 0.15, ACP = 3000;
  const st = { vrsta: 'PTP', sinkr: true, vel: 100, vcp: 800, t1: false, t: 0, radi: false, put: null };
  const svg = ui.svg(600, 420, 'Tlocrt robota s putanjom TCP-a između točaka P1 i P2 (i pomoćne točke za CIRC)');
  const s = 0.36, OX = 150, OY = 210, pr = prXY(OX, OY, s);
  podnozjeTlocrt(svg, OX, OY, s);
  S('circle', { cx: OX, cy: OY, r: f1(D.doseg * s), class: 'tku-doseg' }, svg);
  const kPut = S('polyline', { class: 'tku-putanja-p' }, svg), kTrag = S('polyline', { class: 'tku-trag' }, svg);
  const ruka = ruka2D(svg, { s });
  for (const [p, n] of [[P1, 'P1'], [P2, 'P2'], [PA, 'P_pom']]) { const q = pr(p); S('circle', { cx: f1(q[0]), cy: f1(q[1]), r: 6, class: 'tku-tocka-n' }, svg); T(svg, q[0] + 10, q[1] - 8, n, 'tku-l'); }
  osi2D(svg, { x: 'X', y: 'Y', naziv: 'ROBROOT' }).set(40, 380, [1, 0], [0, -1], 26);
  const tKrl = T(svg, 590, 404, '', 'tku-kod', 'end');
  const svg2 = ui.svg(600, 220, 'Profil brzine: brzine osi A1–A3 za PTP ili brzina TCP-a za LIN i CIRC', 'tku-svg2');
  const g2 = { x: 64, y: 24, w: 520, h: 160 };
  S('rect', { x: g2.x, y: g2.y, width: g2.w, height: g2.h, class: 'tku-graf' }, svg2);
  const tNas = T(svg2, g2.x, 16, '', 'tku-ls');
  const kv = [0, 1, 2].map(k => S('polyline', { class: ['tku-krivulja', 'tku-krivulja-b', 'tku-krivulja-n'][k] }, svg2));
  const leg = [0, 1, 2].map(k => T(svg2, g2.x + g2.w - 6, g2.y + 18 + k * 18, '', 'tku-ls ' + ['tku-t-ok', 'tku-t-pl', 'tku-t-upoz'][k], 'end'));
  const kur = S('line', { y1: g2.y, y2: g2.y + g2.h, class: 'tku-kursor' }, svg2);
  const tOs = T(svg2, g2.x + g2.w, g2.y + g2.h + 22, '', 'tku-ls', 'end');
  function trapez(Ttot, ta) { Ttot = Math.max(Ttot, 2 * ta); const vp = 1 / (Ttot - ta); return t => t <= 0 || t >= Ttot ? [0, t <= 0 ? 0 : 1] : t < ta ? [vp * t / ta, 0.5 * vp * t * t / ta] : t > Ttot - ta ? [vp * (Ttot - t) / ta, 1 - 0.5 * vp * (Ttot - t) ** 2 / ta] : [vp, 0.5 * vp * ta + vp * (t - ta)]; }
  function napravi() {
    const q1 = ikDolje(...P1), q2 = ikDolje(...P2);
    if (st.vrsta === 'PTP') {
      const dq = q2.map((v, k) => v - q1[k]);
      const Ti = dq.map((d, k) => Math.abs(d) / (vMax(k) * st.vel / 100) + TA);
      const Tm = Math.max(...Ti);
      const f = st.sinkr ? Ti.map(() => trapez(Tm, TA)) : Ti.map(t => trapez(t, TA));
      const q = t => q1.map((v, k) => v + dq[k] * f[k](t)[1]);
      const vos = t => [0, 1, 2].map(k => Math.abs(dq[k]) * f[k](t)[0] / vMax(k) * 100);
      const vod = Ti.indexOf(Tm);
      return { T: Tm, q, graf: vos, ymax: 110, nas: 'brzina osi [% najveće]: A1, A2, A3', leg: ['A1', 'A2', 'A3'], krl: `PTP P2 Vel=${st.vel} % PDAT1 Tool[1] Base[0]`, op: `vodeća os ${D.osi[vod].ime} (${hr(Ti[vod], 2)} s)`, lin: false };
    }
    let pts0;
    if (st.vrsta === 'LIN') pts0 = Array.from({ length: 61 }, (_, i) => P1.map((v, k) => v + (P2[k] - v) * i / 60));
    else {
      const [ax, ay] = P1, [bx, by] = PA, [cx, cy] = P2, dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / dd;
      const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / dd;
      const R = Math.hypot(ax - ux, ay - uy), kt = (x, y) => Math.atan2(y - uy, x - ux);
      const a0 = kt(ax, ay), am = kt(bx, by), a1 = kt(cx, cy), nor = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const ccw = nor(am - a0) < nor(a1 - a0), raz = ccw ? nor(a1 - a0) : -nor(a0 - a1);   // smjer koji prolazi kroz P_pom
      pts0 = Array.from({ length: 81 }, (_, i) => { const a = a0 + raz * i / 80; return [ux + R * Math.cos(a), uy + R * Math.sin(a), Z]; });
    }
    const vc = st.t1 ? Math.min(st.vcp, D.t1) : st.vcp;
    const pp = profilPutanje(pts0, vc, ACP, 1e9);
    const tc = t => { const [i, u] = uzorak(pp, t); const a = pts0[i], b = pts0[i + 1]; return a.map((v, k) => v + (b[k] - v) * u); };
    const vt = t => { const [i, u] = uzorak(pp, t); return [pp.v[i] + (pp.v[i + 1] - pp.v[i]) * u]; };
    return { T: pp.T, q: t => ikDolje(...tc(t)), graf: vt, ymax: Math.max(vc * 1.15, 100), nas: 'brzina TCP-a [mm/s]', leg: ['v TCP', '', ''], krl: st.vrsta === 'LIN' ? `LIN P2 Vel=${hr(vc / 1000, 2)} m/s CPDAT1 Tool[1] Base[0]` : `CIRC P_pom P2 Vel=${hr(vc / 1000, 2)} m/s CPDAT1 Tool[1] Base[0]`, op: `duljina ${hr(pp.s[pp.s.length - 1], 0)} mm`, lin: true, pts0 };
  }
  function pripremi() {
    st.put = napravi();
    const pu = st.put, N = 120, ptsP = [], G = [[], [], []];
    for (let i = 0; i <= N; i++) { const t = pu.T * i / N, q = pu.q(t); if (q) ptsP.push(pr(fkK(q).p)); const g = pu.graf(t); g.forEach((v, k) => G[k].push([g2.x + i / N * g2.w, g2.y + g2.h - v / pu.ymax * g2.h])); }
    kPut.setAttribute('points', pts(ptsP));
    kv.forEach((k, j) => { k.setAttribute('points', G[j] && G[j].length ? pts(G[j]) : ''); });
    leg.forEach((t, j) => { t.textContent = pu.leg[j] || ''; });
    tNas.textContent = pu.nas + ` · trajanje ${hr(pu.T, 2)} s`;
    tKrl.textContent = pu.krl;
    tOs.textContent = `vrijeme [s], 0 … ${hr(pu.T, 2)}`;
    o.v(st.vrsta); o.T(hr(pu.T, 2) + ' s'); o.p(pu.op);
    kTrag.setAttribute('points', '');
    st.trag = [];
  }
  function osvjezi() {
    const pu = st.put, t = Math.min(st.t, pu.T), q = pu.q(t);
    if (q) { ruka.postavi(tockeRuke(q).map(pr)); const p = fkK(q).p; st.trag.push(pr(p)); kTrag.setAttribute('points', pts(st.trag)); o.x(`X ${hr(p[0], 0)}  Y ${hr(p[1], 0)}  Z ${hr(p[2], 0)} mm`); o.q(kutovi(q.map(v => Math.round(v)))); }
    postavi(kur, { x1: g2.x + t / pu.T * g2.w, x2: g2.x + t / pu.T * g2.w });
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    st.t += dt / 2;                          // usporeno 2×
    if (st.t >= st.put.T + 0.4) { st.radi = false; bP.osvjezi(); ui.stanje(st.vrsta === 'PTP' ? `PTP gotov: TCP je išao lukom (${st.sinkr ? 'sinkroni PTP — sve osi krenule i stale zajedno' : 'osi su stale svaka u svoje vrijeme, pa je putanja drukčija'}).` : `${st.vrsta} gotov: TCP je išao ${st.vrsta === 'LIN' ? 'pravcem' : 'kružnim lukom kroz P_pom'} zadanom brzinom.`, 'ok'); }
    osvjezi();
    return st.radi;
  });
  ui.seg('Vrsta gibanja', [['PTP', 'PTP'], ['LIN', 'LIN'], ['CIRC', 'CIRC']], 'PTP', v => { st.vrsta = v; st.t = 0; pripremi(); osvjezi(); });
  const r = ui.red();
  const bP = ui.igraj(st, 'radi', 'Pokreni', v => { if (v) { if (st.t >= st.put.T) { st.t = 0; st.trag = []; } ui.stanje(`Izvodi se ${st.put.krl} (prikaz usporen 2×).`, 'plavo'); } }, r); bP.osvjezi();
  ui.gumb('Na početak', () => { st.radi = false; bP.osvjezi(); st.t = 0; st.trag = []; osvjezi(); }, { tanki: true, u: r });
  ui.kvacica('Sinkroni PTP (sve osi krenu i stanu zajedno)', true, v => { st.sinkr = v; st.t = 0; pripremi(); osvjezi(); });
  ui.klizac('PTP: Vel', 10, 100, 5, st.vel, v => v + ' %', v => { st.vel = v; st.t = 0; pripremi(); osvjezi(); });
  ui.klizac('LIN/CIRC: $VEL.CP', 100, 2000, 50, st.vcp, v => hr(v / 1000, 2) + ' m/s', v => { st.vcp = v; st.t = 0; pripremi(); osvjezi(); });
  ui.kvacica(`Način T1 (TCP najviše ${D.t1} mm/s)`, false, v => { st.t1 = v; st.t = 0; pripremi(); osvjezi(); });
  const o = ui.ocit([['v', 'Vrsta'], ['T', 'Trajanje'], ['p', 'Napomena'], ['x', 'TCP (ROBROOT)'], ['q', 'Kutovi osi']]);
  ui.sitno('U T1 i PTP je ograničen tako da TCP ne prijeđe 250 mm/s; ovdje se ograničenje T1 prikazuje samo za LIN i CIRC.');
  pripremi(); osvjezi(); ui.stanje('Odaberi vrstu gibanja i pritisni „Pokreni”.'); ctx.budi();
}

/* =========================================================== 11. zaglađivanje */
function tZagladivanje(ui, ctx) {
  const Z = 300, P1 = [320, 420], P2 = [700, 120], P3 = [320, -380], A = 2500, ALAT = 4000;
  const st = { nacin: 'C_DIS', d: 80, p: 50, cp: 50, v: 600, t: 0, radi: false, put: null, ref: null };
  const svg = ui.svg(600, 400, 'Tlocrt: putanja TCP-a P1 → P2 → P3 sa zaglađivanjem oko P2 i robot');
  const s = 0.36, OX = 150, OY = 200, pr = prXY(OX, OY, s);
  podnozjeTlocrt(svg, OX, OY, s);
  const kRef = S('polyline', { class: 'tku-putanja-p' }, svg), kPut = S('polyline', { class: 'tku-krivulja' }, svg);
  const kugla = S('circle', { class: 'tku-kugla' }, svg);
  const ruka = ruka2D(svg, { s });
  for (const [p, n] of [[P1, 'P1'], [P2, 'P2'], [P3, 'P3']]) { const q = pr([p[0], p[1], Z]); S('circle', { cx: f1(q[0]), cy: f1(q[1]), r: 6, class: 'tku-tocka-n' }, svg); T(svg, q[0] + 10, q[1] - 8, n, 'tku-l'); }
  const tKrl = T(svg, 590, 386, '', 'tku-kod', 'end');
  const svg2 = ui.svg(600, 210, 'Brzina TCP-a u vremenu sa zaglađivanjem i bez njega', 'tku-svg2');
  const g2 = { x: 64, y: 24, w: 520, h: 150 };
  S('rect', { x: g2.x, y: g2.y, width: g2.w, height: g2.h, class: 'tku-graf' }, svg2);
  T(svg2, g2.x, 16, 'brzina TCP-a [mm/s] — puno: odabrano, crtkano: bez zaglađivanja', 'tku-ls');
  const kvR = S('polyline', { class: 'tku-krivulja-z' }, svg2), kvP = S('polyline', { class: 'tku-krivulja' }, svg2);
  const kur = S('line', { y1: g2.y, y2: g2.y + g2.h, class: 'tku-kursor' }, svg2);
  const tX = T(svg2, g2.x + g2.w, g2.y + g2.h + 22, '', 'tku-ls', 'end');
  const lin = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  function putanja(nacin) {
    const L1 = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]), L2 = Math.hypot(P3[0] - P2[0], P3[1] - P2[1]);
    const u1 = [(P2[0] - P1[0]) / L1, (P2[1] - P1[1]) / L1], u2 = [(P3[0] - P2[0]) / L2, (P3[1] - P2[1]) / L2];
    if (nacin === 'nema') { const a = lin(P1, P2, 40), b = lin(P2, P3, 40).slice(1); return { P: [...a, ...b], stani: [40], d: 0 }; }
    if (nacin === 'C_PTP') {
      const q1 = ikDolje(P1[0], P1[1], Z), q2 = ikDolje(P2[0], P2[1], Z), q3 = ikDolje(P3[0], P3[1], Z), f = st.cp / 100 * 0.5;
      const qi = (a, b, u) => a.map((v, k) => v + (b[k] - v) * u), P = [];
      const fk2 = q => { const p = fkK(q).p; return [p[0], p[1]]; };
      for (let i = 0; i <= 40; i++) { const u = i / 40 * (1 - f); P.push(fk2(qi(q1, q2, u))); }
      if (f > 0.001) { const A0 = qi(q1, q2, 1 - f), B0 = qi(q2, q3, f); for (let i = 1; i < 30; i++) { const u = i / 30, w = [(1 - u) ** 2, 2 * u * (1 - u), u * u]; P.push(fk2(A0.map((v, k) => w[0] * v + w[1] * q2[k] + w[2] * B0[k]))); } }
      for (let i = 0; i <= 40; i++) { const u = f + i / 40 * (1 - f); P.push(fk2(qi(q2, q3, u))); }
      return { P, stani: f > 0.001 ? [] : [40], d: 0, ptp: true };
    }
    let d = nacin === 'C_DIS' ? st.d : (st.p / 100 * st.v) ** 2 / (2 * A);
    d = Math.min(d, L1 / 2, L2 / 2);
    if (d < 1) return putanja('nema');
    const Aa = [P2[0] - u1[0] * d, P2[1] - u1[1] * d], Bb = [P2[0] + u2[0] * d, P2[1] + u2[1] * d];
    const P = [...lin(P1, Aa, 40)];
    for (let i = 1; i < 40; i++) { const u = i / 40, w = [(1 - u) ** 2, 2 * u * (1 - u), u * u]; P.push([w[0] * Aa[0] + w[1] * P2[0] + w[2] * Bb[0], w[0] * Aa[1] + w[1] * P2[1] + w[2] * Bb[1]]); }
    P.push(...lin(Bb, P3, 40));
    return { P, stani: [], d };
  }
  function pripremi() {
    const pu = putanja(st.nacin), ref = putanja('nema');
    pu.pr = profilPutanje(pu.P, st.v, A, ALAT, pu.stani); ref.pr = profilPutanje(ref.P, st.v, A, ALAT, ref.stani);
    st.put = pu; st.ref = ref;
    kPut.setAttribute('points', pts(pu.P.map(p => pr([p[0], p[1], Z]))));
    kRef.setAttribute('points', pts(ref.P.map(p => pr([p[0], p[1], Z]))));
    const c = pr([P2[0], P2[1], Z]);
    postavi(kugla, { cx: c[0], cy: c[1], r: Math.max(0.1, pu.d * s) }); kugla.style.display = pu.d > 0 ? '' : 'none';
    const Tm = Math.max(pu.pr.T, ref.pr.T), X = t => g2.x + t / Tm * g2.w, Y = v => g2.y + g2.h - v / (st.v * 1.15) * g2.h;
    kvP.setAttribute('points', pts(pu.pr.t.map((t, i) => [X(t), Y(pu.pr.v[i])])));
    kvR.setAttribute('points', pts(ref.pr.t.map((t, i) => [X(t), Y(ref.pr.v[i])])));
    st.Tm = Tm;
    tX.textContent = `vrijeme [s], 0 … ${hr(Tm, 2)}`;
    let mn = Infinity; for (const p of pu.P) mn = Math.min(mn, Math.hypot(p[0] - P2[0], p[1] - P2[1]));
    const krl = { nema: 'LIN P2 Vel=… CPDAT1   (bez CONT)', C_DIS: `$APO.CDIS = ${hr(st.d, 0)}   LIN P2 C_DIS`, C_VEL: `$APO.CVEL = ${st.p}   LIN P2 C_VEL`, C_PTP: `$APO.CPTP = ${st.cp}   PTP P2 C_PTP` }[st.nacin];
    tKrl.textContent = krl;
    o.T(hr(pu.pr.T, 2) + ' s'); o.u(`${hr(ref.pr.T - pu.pr.T, 2)} s (${hr((1 - pu.pr.T / ref.pr.T) * 100, 0)} %)`, ref.pr.T - pu.pr.T > 0.01 ? 'ok' : '');
    o.d(hr(mn, 0) + ' mm'); o.z(pu.d > 0 ? hr(pu.d, 0) + ' mm' : (st.nacin === 'C_PTP' ? 'u prostoru osi' : '—'));
    let vmn = Infinity; const i0 = Math.floor(pu.P.length * 0.35), i1 = Math.floor(pu.P.length * 0.65); for (let i = i0; i < i1; i++) vmn = Math.min(vmn, pu.pr.v[i]);
    o.vm(hr(vmn, 0) + ' mm/s');
    st.t = 0; st.trag = [];
  }
  function osvjezi() {
    const pu = st.put, t = Math.min(st.t, pu.pr.T), [i, u] = uzorak(pu.pr, t);
    const a = pu.P[i], b = pu.P[i + 1], p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const q = ikDolje(p[0], p[1], Z);
    if (q) ruka.postavi(tockeRuke(q).map(pr));
    const x = g2.x + t / st.Tm * g2.w; postavi(kur, { x1: x, x2: x });
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    st.t += dt / 2;
    if (st.t > st.put.pr.T + 0.4) { st.radi = false; bP.osvjezi(); ui.stanje(st.nacin === 'nema' ? 'Bez zaglađivanja robot je u P2 stao (brzina 0) i tek onda krenuo prema P3.' : `Sa zaglađivanjem robot je prošao pored P2 bez zaustavljanja; ciklus je kraći za ${hr(st.ref.pr.T - st.put.pr.T, 2)} s.`, 'ok'); }
    osvjezi();
    return st.radi;
  });
  ui.seg('Zaglađivanje', [['nema', 'Bez'], ['C_DIS', 'C_DIS'], ['C_VEL', 'C_VEL'], ['C_PTP', 'C_PTP']], st.nacin, v => { st.nacin = v; pripremi(); osvjezi(); });
  const r = ui.red();
  const bP = ui.igraj(st, 'radi', 'Pokreni', v => { if (v && st.t >= st.put.pr.T) st.t = 0; }, r); bP.osvjezi();
  ui.klizac('$APO.CDIS (za C_DIS)', 0, 200, 5, st.d, v => v + ' mm', v => { st.d = v; pripremi(); osvjezi(); });
  ui.klizac('$APO.CVEL (za C_VEL)', 0, 100, 5, st.p, v => v + ' %', v => { st.p = v; pripremi(); osvjezi(); });
  ui.klizac('$APO.CPTP (za C_PTP)', 0, 100, 5, st.cp, v => v + ' %', v => { st.cp = v; pripremi(); osvjezi(); });
  ui.klizac('Programirana brzina', 100, 1500, 50, st.v, v => hr(v / 1000, 2) + ' m/s', v => { st.v = v; pripremi(); osvjezi(); });
  const o = ui.ocit([['T', 'Vrijeme P1 → P3'], ['u', 'Ušteda prema gibanju bez zaglađivanja'], ['d', 'Najmanja udaljenost od P2'], ['z', 'Početak zaglađivanja (od P2)'], ['vm', 'Najmanja brzina oko P2']]);
  ui.sitno('Za C_PTP putanja je izračunata iz kutova osi (PTP gibanje), pa je pomaknuta i oblikom drukčija od geometrijskih načina.');
  pripremi(); osvjezi(); ui.stanje('Odaberi način zaglađivanja i pritisni „Pokreni”.'); ctx.budi();
}

/* =========================================================== 12. načini rada */
function tNacinRada(ui, ctx) {
  const MOD = ['T1', 'T2', 'AUT', 'AUT EXT'];
  const st = { kljuc: false, mod: 'T1', prog: 800, omog: 'ot', vrata: false, start: false, jog: false, x: 0, smjer: 1, plc: false };
  const svg = ui.svg(600, 330, 'Ključ za izbor načina rada, upravitelj veze s četiri načina, brzinomjer TCP-a i vrata ćelije');
  // ključ
  const KX = 90, KY = 110;
  S('circle', { cx: KX, cy: KY, r: 52, class: 'tku-kljuc-k' }, svg);
  S('circle', { cx: KX, cy: KY, r: 34, class: 'tku-kljuc-u' }, svg);
  const gK = S('g', {}, svg);
  S('rect', { x: -7, y: -42, width: 14, height: 84, rx: 5, class: 'tku-kljuc' }, gK);
  S('circle', { cx: 0, cy: -48, r: 14, class: 'tku-kljuc' }, gK);
  T(svg, KX, KY + 76, 'ključ', 'tku-ls', 'middle');
  // upravitelj veze
  const MX = 180, MY = 40;
  S('rect', { x: MX, y: MY, width: 160, height: 176, rx: 8, class: 'tku-ploca' }, svg);
  T(svg, MX + 80, MY + 22, 'upravitelj veze', 'tku-ls', 'middle');
  const mBox = MOD.map((m, k) => { const g = S('g', { class: 'tku-rb' }, svg); S('rect', { x: MX + 14, y: MY + 34 + k * 34, width: 132, height: 28, rx: 6 }, g); T(g, MX + 80, MY + 53 + k * 34, m, 'tku-l', 'middle'); klikabilno(ctx, g, 'Odaberi način ' + m, () => odaberi(m)); return g; });
  // brzinomjer
  const BX = 380, BW = 200, BY = 70;
  T(svg, BX, BY - 18, 'brzina TCP-a [mm/s]', 'tku-ls');
  S('rect', { x: BX, y: BY, width: BW, height: 24, rx: 4, class: 'tku-graf' }, svg);
  const vB = S('rect', { x: BX, y: BY, height: 24, rx: 4, class: 'tku-stupac' }, svg);
  const vP = S('line', { y1: BY - 6, y2: BY + 30, class: 'tku-kursor' }, svg);
  const xV = v => BX + Math.min(v, 2000) / 2000 * BW;
  S('line', { x1: f1(xV(D.t1)), y1: BY - 4, x2: f1(xV(D.t1)), y2: BY + 28, class: 'tku-prag' }, svg);
  T(svg, xV(D.t1), BY + 46, String(D.t1), 'tku-ls tku-t-opas', 'middle'); T(svg, BX + BW, BY + 46, '2000', 'tku-ls', 'end');
  const tV = T(svg, BX, BY + 72, '', 'tku-l');
  // lampice
  const lamp = [['pogoni', 172], ['program', 198], ['omogućavanje', 224]].map(([n, y]) => { const c = S('circle', { cx: BX + 8, cy: y - 5, r: 8, class: 'tku-lampa' }, svg); T(svg, BX + 24, y, n, 'tku-ls'); return c; });
  // ćelija s vratima i TCP-om
  S('rect', { x: 20, y: 240, width: 560, height: 76, rx: 6, class: 'tku-ploca' }, svg);
  const vr = S('rect', { x: 524, y: 246, width: 10, height: 64, class: 'tku-vrata' }, svg);
  T(svg, 545, 236, 'vrata', 'tku-ls', 'middle');
  S('line', { x1: 60, y1: 278, x2: 480, y2: 278, class: 'tku-putanja-p' }, svg);
  const tcp = S('circle', { cy: 278, r: 9, class: 'tku-tocka' }, svg);
  const tab = tablica(ui, ['način', 'brzina TCP-a', 'jog', 'omogućavanje', 'pokreće', 'vrata'], [
    ['T1', `najviše ${D.t1} mm/s`, 'da', 'potrebno', 'operater', 'smiju biti otvorena'],
    ['T2', 'programirana', 'ne', 'potrebno', 'operater', 'smiju biti otvorena'],
    ['AUT', 'programirana', 'ne', 'bez funkcije', 'operater (Start)', 'zatvorena'],
    ['AUT EXT', 'programirana', 'ne', 'bez funkcije', 'PLC', 'zatvorena']
  ]);
  function stanje() {
    const m = st.mod, rucni = m === 'T1' || m === 'T2';
    let gib = false, v = 0, por = '', vr2 = '';
    if (rucni) {
      if (st.omog === 'pa') { por = 'Uređaj za omogućavanje pritisnut do kraja (panika): sigurnosni STOP 1 — robot staje.'; vr2 = 'opas'; }
      else if (st.omog === 'ot') { por = st.start || st.jog ? 'Uređaj za omogućavanje nije pritisnut: pogoni se ne uključuju (pušten tijekom gibanja → sigurnosni STOP 2).' : `${m}: drži uređaj za omogućavanje u srednjem položaju.`; vr2 = st.start || st.jog ? 'upoz' : ''; }
      else if (st.jog && m === 'T2') { por = 'U T2 ručno gibanje (jog) nije moguće.'; vr2 = 'upoz'; }
      else if (st.jog) { gib = true; v = Math.min(st.prog, D.t1); por = `Ručno gibanje u T1: najviše ${D.t1} mm/s.`; vr2 = 'ok'; }
      else if (st.start) { gib = true; v = m === 'T1' ? Math.min(st.prog, D.t1) : st.prog; por = m === 'T1' ? `T1: program radi smanjenom brzinom — programiranih ${st.prog} mm/s ograničeno je na ${hr(v, 0)} mm/s.` : `T2: program radi programiranom brzinom ${st.prog} mm/s — samo za provjeru programa.`; vr2 = 'ok'; }
      else por = `${m}: omogućavanje u srednjem položaju — pritisni Start za program${m === 'T1' ? ' ili tipku za ručno gibanje' : ''}.`;
    } else {
      if (st.vrata) { por = `${m}: vrata ćelije su otvorena — zaštita operatera izaziva sigurnosni STOP 1; program se ne može pokrenuti.`; vr2 = 'opas'; }
      else if (st.jog) { por = `${m}: ručno gibanje nije moguće u automatskom načinu.`; vr2 = 'upoz'; }
      else if (m === 'AUT EXT' && st.start && !st.plc) { por = 'AUT EXT: program pokreće PLC, a ne operater na privjesku.'; vr2 = 'upoz'; }
      else if ((m === 'AUT' && st.start) || (m === 'AUT EXT' && st.plc)) { gib = true; v = st.prog; por = m === 'AUT' ? `AUT: program radi programiranom brzinom ${st.prog} mm/s.` : `AUT EXT: PLC je pokrenuo program, robot radi ${st.prog} mm/s.`; vr2 = 'ok'; }
      else por = m === 'AUT' ? 'AUT: pritisni Start na privjesku.' : 'AUT EXT: čeka se naredba PLC-a.';
    }
    return { gib, v, por, vr2 };
  }
  function osvjezi() {
    gK.setAttribute('transform', `translate(${KX} ${KY}) rotate(${st.kljuc ? (st.biram ? 90 : 0) : 0})`);
    gK.style.display = st.kljuc ? '' : 'none';
    mBox.forEach((g, k) => { g.classList.toggle('tku-akt', MOD[k] === st.mod); g.classList.toggle('tku-isk', !st.biram); });
    const s0 = stanje();
    postavi(vB, { width: Math.max(0.1, xV(s0.v) - BX) }); postavi(vP, { x1: xV(st.prog), x2: xV(st.prog) });
    tV.textContent = `stvarna ${hr(s0.v, 0)} · programirana ${st.prog}`;
    lamp[0].classList.toggle('tku-lampa-on', s0.gib); lamp[1].classList.toggle('tku-lampa-on', s0.gib && !st.jog); lamp[2].classList.toggle('tku-lampa-on', st.omog === 'sr');
    vr.classList.toggle('tku-vrata-otv', st.vrata);
    postavi(tcp, { cx: 60 + st.x * 420 });
    tab.istakni(MOD.indexOf(st.mod));
    ui.stanje(s0.por, s0.vr2);
    o.m(st.mod); o.v(hr(s0.v, 0) + ' mm/s', s0.gib ? 'ok' : '');
    return s0;
  }
  function odaberi(m) {
    if (!st.kljuc || !st.biram) { ui.stanje('Način rada može se promijeniti samo ključem: umetni ključ i okreni ga.', 'upoz'); return; }
    st.mod = m; st.start = false; st.plc = false; st.jog = false; st.biram = false; sg.postavi(m); osvjezi();
  }
  ctx.petlja(dt => {
    const s0 = osvjezi();
    if (!s0.gib) return false;
    st.x += st.smjer * s0.v / 1000 * dt * 0.8; if (st.x > 1) { st.x = 1; st.smjer = -1; } if (st.x < 0) { st.x = 0; st.smjer = 1; }
    return true;
  });
  ui.kvacica('Ključ umetnut i okrenut (otvara upravitelja veze)', false, v => { st.kljuc = v; st.biram = v; osvjezi(); });
  const sg = ui.seg('Način rada', MOD.map(m => [m, m]), 'T1', v => { if (!st.kljuc || !st.biram) { sg.postavi(st.mod); ui.stanje('Način rada može se promijeniti samo ključem: umetni ključ i okreni ga.', 'upoz'); return; } odaberi(v); });
  ui.seg('Uređaj za omogućavanje', [['ot', 'otpušten'], ['sr', 'srednji'], ['pa', 'do kraja']], 'ot', v => { st.omog = v; if (v !== 'sr') { st.start = false; st.jog = false; } osvjezi(); ctx.budi(); });
  const r = ui.red();
  ui.gumb('Start', () => { st.start = !st.start; st.jog = false; osvjezi(); ctx.budi(); }, { u: r, aria: 'Start programa na privjesku' });
  ui.gumb('Jog A1+', () => { st.jog = !st.jog; st.start = false; osvjezi(); ctx.budi(); }, { tanki: true, u: r, aria: 'Ručno gibanje osi A1' });
  ui.gumb('PLC: pokreni program', () => { st.plc = !st.plc; osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  ui.klizac('Programirana brzina TCP-a', 50, 2000, 50, st.prog, v => v + ' mm/s', v => { st.prog = v; osvjezi(); ctx.budi(); });
  ui.kvacica('Vrata ćelije otvorena', false, v => { st.vrata = v; if (v && (st.mod === 'AUT' || st.mod === 'AUT EXT')) { st.start = false; st.plc = false; } osvjezi(); ctx.budi(); });
  const o = ui.ocit([['m', 'Način rada'], ['v', 'Stvarna brzina TCP-a']]);
  osvjezi(); ctx.budi();
}


/* =========================================================== 13. zaustavljanje */
function tZaustavljanje(ui, ctx) {
  const Z = 300, XL = 520, YA = 330, TBR = { 1: 0.30, 2: 0.30 };          // vrijeme kočenja po putanji STOP 1/2 [pp]
  const OKID = {
    estop: ['E-STOP', 1, true], omog: ['pušteno omogućavanje', 2, true], panika: ['panika', 1, true],
    tipka: ['tipka STOP', 2, false], napajanje: ['nestanak struje', 0, false], sigkvar: ['kvar sig. upravljača', 0, true], t1: ['T1 > 250 mm/s', 0, true]
  };
  const st = { okid: 'estop', var: D.varijanta, v: 800, radi: false, y: YA, smjer: -1, stop: null, t: 0 };
  const svg = ui.svg(600, 380, 'Tlocrt: robot vodi TCP po pravcu; nakon zaustavljanja trag pokazuje odstupa li TCP od putanje');
  const s = 0.4, OX = 130, OY = 190, pr = prXY(OX, OY, s);
  podnozjeTlocrt(svg, OX, OY, s);
  const a0 = pr([XL, YA, Z]), a1 = pr([XL, -YA, Z]);
  S('line', { x1: f1(a0[0]), y1: f1(a0[1]), x2: f1(a1[0]), y2: f1(a1[1]), class: 'tku-putanja-p' }, svg);
  const kTr = S('polyline', { class: 'tku-trag' }, svg);
  const ruka = ruka2D(svg, { s });
  const tKat = T(svg, 590, 30, '', 'tku-lb', 'end');
  const svg2 = ui.svg(600, 230, 'Vremenski dijagram zaustavljanja: brzina TCP-a, pogoni i kočnice', 'tku-svg2');
  const GX = 100, GW = 480, TW = 1.2;
  [['brzina', 60], ['pogoni', 150], ['kočnice', 196]].forEach(([n, y]) => T(svg2, 8, y + 5, n, 'tku-ls'));
  S('rect', { x: GX, y: 18, width: GW, height: 200, class: 'tku-graf' }, svg2);
  for (const t of [0, 0.4, 0.8, 1.2]) T(svg2, GX + t / TW * GW, 230, hr(t, 1) + ' s', 'tku-ls', 'middle');
  S('line', { x1: GX, y1: 110, x2: GX + GW, y2: 110, class: 'tku-mreza0' }, svg2); T(svg2, GX - 6, 115, '0', 'tku-ls', 'end');
  const kv = S('polyline', { class: 'tku-krivulja' }, svg2), kp = S('polyline', { class: 'tku-krivulja-b' }, svg2), kk = S('polyline', { class: 'tku-krivulja-r' }, svg2);
  const kur = S('line', { y1: 18, y2: 218, class: 'tku-kursor' }, svg2);
  function os3(k) {      // model STOP 0: [kašnjenje td, usporenje α] iz objavljenog kuta i vremena (A4–A6 = A3)
    const pod = D.stop0[st.var][Math.min(k, 2)], v0 = vMax(k), th = pod[0], ts = pod[1];
    const td = Math.max(0, 2 * th / v0 - ts);
    return [td, v0 / Math.max(0.02, ts - td)];
  }
  const qOd = y => ikDolje(XL, y, Z);
  function okidaj() {
    const kat = OKID[st.okid][1];
    const q0 = qOd(st.y), q1 = qOd(st.y + st.smjer * 1);           // 1 mm dalje
    const qd = q0.map((v, k) => (q1[k] - v) * st.v);                // °/s
    st.stop = { kat, t: 0, y0: st.y, q0, qd, trag: [], vmax: st.v };
    st.radi = false; bP.osvjezi();
  }
  function polozajStop(t) {
    const S0 = st.stop;
    if (S0.kat === 0) {
      const q = S0.q0.map((v, k) => {
        const w0 = Math.abs(S0.qd[k]), sg = Math.sign(S0.qd[k]), [td, al] = os3(k);
        const u = Math.min(Math.max(0, t - td), w0 / al);
        return v + sg * (w0 * Math.min(t, td) + w0 * u - 0.5 * al * u * u);
      });
      return q;
    }
    const tb = TBR[S0.kat], a = S0.vmax / tb, tt = Math.min(t, tb);
    return qOd(S0.y0 + st.smjer * (S0.vmax * tt - 0.5 * a * tt * tt));
  }
  function trajanje() {
    const S0 = st.stop; if (!S0) return 0;
    if (S0.kat === 0) return Math.max(...S0.qd.map((w, k) => { const [td, al] = os3(k); return td + Math.abs(w) / al; }));
    return TBR[S0.kat];
  }
  function crtajGraf() {
    const S0 = st.stop; if (!S0) { [kv, kp, kk].forEach(k => k.setAttribute('points', '')); return; }
    const Tz = trajanje(), X = t => GX + t / TW * GW, P = [], Pp = [], Pk = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120 * TW;
      let v;
      if (S0.kat === 0) { const f = fkK(polozajStop(t)).p, f2 = fkK(polozajStop(t + 0.005)).p; v = Math.hypot(f2[0] - f[0], f2[1] - f[1], f2[2] - f[2]) / 0.005; }
      else v = Math.max(0, S0.vmax * (1 - t / TBR[S0.kat]));
      P.push([X(t), 110 - Math.min(1.2, v / S0.vmax) * 80]);
      const pog = S0.kat === 0 ? 0 : S0.kat === 1 ? (t < Tz ? 1 : 0) : 1;
      const koc = S0.kat === 2 ? 0 : S0.kat === 1 ? (t < Tz ? 0 : 1) : (t < 0.01 ? 0 : 1);
      Pp.push([X(t), pog ? 136 : 166]); Pk.push([X(t), koc ? 182 : 210]);
    }
    kv.setAttribute('points', pts(P)); kp.setAttribute('points', pts(Pp)); kk.setAttribute('points', pts(Pk));
  }
  function osvjezi() {
    let q;
    if (st.stop) q = polozajStop(Math.min(st.stop.t, trajanje() + 0.01));
    else q = qOd(st.y);
    ruka.postavi(tockeRuke(q).map(pr));
    if (st.stop) {
      const p = fkK(q).p; st.stop.trag.push(pr(p)); kTr.setAttribute('points', pts(st.stop.trag));
      kTr.classList.toggle('tku-trag-opas', st.stop.kat === 0);
      const odst = Math.abs(p[0] - XL) + Math.abs(p[2] - Z);
      st.stop.maxOd = Math.max(st.stop.maxOd || 0, odst);
      postavi(kur, { x1: GX + Math.min(st.stop.t, TW) / TW * GW, x2: GX + Math.min(st.stop.t, TW) / TW * GW });
      o.od(hr(st.stop.maxOd, 0) + ' mm', st.stop.maxOd > 5 ? 'opas' : 'ok');
      o.t(hr(trajanje(), 3) + ' s');
      tKat.textContent = (OKID[st.okid][2] ? 'sigurnosni ' : '') + 'STOP ' + st.stop.kat;
    } else { kTr.setAttribute('points', ''); tKat.textContent = ''; postavi(kur, { x1: GX, x2: GX }); }
  }
  ctx.petlja(dt => {
    if (st.stop) { st.stop.t += dt / 3; osvjezi(); const gotovo = st.stop.t > Math.min(TW, trajanje() + 0.15); if (gotovo) { const k = st.stop.kat; ui.stanje(k === 0 ? `STOP 0: pogoni su odmah isključeni, a kočnice zaustavile svaku os za sebe — TCP je odstupio od pravca do ${hr(st.stop.maxOd, 0)} mm.` : k === 1 ? 'STOP 1: robot je zakočio po putanji (TCP je ostao na pravcu), a nakon zaustavljanja pogoni su isključeni i kočnice zatvorene.' : 'STOP 2: robot je zakočio po putanji i stoji s uključenim pogonima; kočnice su otpuštene, a sigurnosno upravljanje nadzire mirovanje.', k === 0 ? 'opas' : 'ok'); } return !gotovo; }
    if (!st.radi) { osvjezi(); return false; }
    st.y += st.smjer * st.v * dt / 3;
    if (st.y < -YA) { st.y = -YA; st.smjer = 1; } if (st.y > YA) { st.y = YA; st.smjer = -1; }
    osvjezi();
    return true;
  });
  ui.seg('Okidač', Object.keys(OKID).map(k => [k, OKID[k][0]]), st.okid, v => { st.okid = v; const [n, k, sig] = OKID[v]; ui.stanje(`${n} → ${sig ? 'sigurnosni ' : ''}STOP ${k}.`, 'plavo'); o.k(`${sig ? 'sigurnosni ' : ''}STOP ${k}`); });
  const r = ui.red();
  const bP = ui.igraj(st, 'radi', 'Pokreni gibanje', v => { if (v) { st.stop = null; crtajGraf(); ui.stanje(`Robot vodi TCP po pravcu ${st.v} mm/s (prikaz usporen 3×).`, 'plavo'); } }, r); bP.osvjezi();
  ui.gumb('Izazovi zaustavljanje', () => {
    if (!st.radi) { ui.stanje('Najprije pokreni gibanje — zaustavljanje se vidi samo kad se robot giba.', 'upoz'); return; }
    okidaj(); crtajGraf(); ctx.budi();
  }, { u: r, kl: 'tku-g-stop' });
  ui.seg('Inačica robota (podaci STOP 0)', [['sixx', 'KR 6 R900 sixx'], ['-2', 'KR 6 R900-2']], st.var, v => { st.var = v; o.p(potrosnja()); if (st.stop) { st.stop.trag = []; st.stop.maxOd = 0; st.stop.t = 0; crtajGraf(); ctx.budi(); } });
  ui.klizac('Brzina TCP-a', 200, 1500, 50, st.v, v => v + ' mm/s', v => { st.v = v; });
  const potrosnja = () => D.stop0[st.var].map((p, k) => `A${k + 1} ${hr(p[0], 1)}° / ${hr(p[1], 2)} s`).join(' · ');
  const o = ui.ocit([['k', 'Kategorija za odabrani okidač'], ['t', 'Trajanje kočenja'], ['od', 'Najveće odstupanje TCP-a od pravca'], ['p', 'Objavljeno STOP 0 (100 %)']]);
  o.k('sigurnosni STOP 1'); o.p(potrosnja());
  osvjezi(); ui.stanje('Pokreni gibanje, odaberi okidač i izazovi zaustavljanje.'); ctx.budi();
}

/* =========================================================== 14. privjesak */
function tPrivjesakTipke(ui, ctx) {
  const st = { strana: 'prednja', odabir: null, omog: 'ot', jog: 0, estop: false, a1: 0, t: 0 };
  const pad = () => PAD();
  const OPIS = {
    1: ['Tipka za odspajanje', 'Odspaja privjesak od upravljača bez isključivanja sustava (smartPAD-2 podržava priključivanje tijekom rada). Bez privjeska upravljač mora imati drugi E-STOP.'],
    2: ['Ključ (izbor načina rada)', 'Okreće se samo s umetnutim ključem; otvara upravitelja veze u kojem se bira T1, T2, AUT ili AUT EXT.'],
    3: ['Gljiva E-STOP', 'Zaustavljanje u nuždi: sigurnosni STOP 1. Zaključava se u pritisnutom položaju i otpušta se okretanjem.'],
    4: ['6D miš (Space Mouse)', 'Ručno gibanje u kartezijskim osima: pomak i zakret kapice gibaju TCP u šest smjerova istodobno.'],
    5: ['Tipke za ručno gibanje', 'Parovi tipki − / + za svaku os (A1…A6, uz dodatne osi) ili za X, Y, Z, A, B, C, ovisno o odabranom koordinatnom sustavu.'],
    6: ['Override programa', 'Mijenja brzinu izvođenja programa u postotku programirane (POV).'],
    7: ['Override ručnog gibanja', 'Mijenja brzinu ručnog gibanja u postotku (HOV).'],
    8: ['Glavni izbornik', 'Otvara glavni izbornik smartHMI-a.'],
    9: ['Statusne tipke', 'Funkcije ovise o instaliranim tehnološkim paketima (npr. upravljanje prihvatnicom).'],
    10: ['Start', 'Pokreće program. U T1 i T2 drži se pritisnuta (uz omogućavanje); otpuštanjem robot staje (STOP 2).'],
    11: ['Start unatrag', 'Izvodi program korak po korak unatrag (samo u ručnim načinima).'],
    12: ['STOP', 'Zaustavlja program koji se izvodi (STOP 2).'],
    13: ['Tipkovnica', 'Prikazuje tipkovnicu na zaslonu.'],
    21: ['Uređaji za omogućavanje', 'Tri položaja: otpušten / srednji / do kraja. Robot se u T1 i T2 giba samo u srednjem položaju. Više uređaja omogućuje držanje privjeska lijevom ili desnom rukom.'],
    22: ['Zelena tipka Start', 'Ista funkcija kao Start sprijeda — pristupačna dok ruka drži privjesak i uređaj za omogućavanje.'],
    23: ['USB', 'Priključak za USB memoriju (spremanje i učitavanje programa, arhiviranje).'],
    24: ['Natpisna pločica', 'Oznaka tipa i serijski broj privjeska.']
  };
  const svg = ui.svg(600, 380, 'Shematski crtež privjeska za učenje s numeriranim elementima; klikni element za opis');
  const gP = S('g', {}, svg), gS = S('g', {}, svg);
  // prednja
  S('rect', { x: 40, y: 30, width: 520, height: 320, rx: 36, class: 'tku-pad' }, gP);
  S('rect', { x: 170, y: 64, width: 260, height: 220, rx: 6, class: 'tku-zaslon' }, gP);
  T(gP, 300, 170, 'smartHMI', 'tku-ls tku-na-tamnom', 'middle'); T(gP, 300, 192, 'zaslon ' + hr(pad().zaslon, 1) + '″', 'tku-ls tku-na-tamnom', 'middle');
  const elem = {};
  const el = (g, id, crt, bx, by) => {
    const e = S('g', { class: 'tku-el' }, g);
    crt(e);
    const b = S('g', { class: 'tku-broj-k' }, e); S('circle', { cx: bx, cy: by, r: 12 }, b); T(b, bx, by + 5, String(id > 20 ? id - 20 : id), 'tku-ls', 'middle');
    klikabilno(ctx, e, OPIS[id][0], () => odaberi(id));
    elem[id] = e;
    return e;
  };
  el(gP, 1, e => S('rect', { x: 70, y: 52, width: 30, height: 18, rx: 4, class: 'tku-tipka-s' }, e), 112, 60);
  el(gP, 2, e => { S('circle', { cx: 92, cy: 100, r: 16, class: 'tku-kljuc-k' }, e); S('rect', { x: 89, y: 88, width: 6, height: 24, rx: 2, class: 'tku-kljuc' }, e); }, 128, 100);
  const gEs = el(gP, 3, e => { S('circle', { cx: 506, cy: 82, r: 30, class: 'tku-estop-p' }, e); S('circle', { cx: 506, cy: 82, r: 22, class: 'tku-gljiva' }, e); }, 466, 52);
  el(gP, 4, e => { S('rect', { x: 476, y: 128, width: 60, height: 36, rx: 10, class: 'tku-tipka-s' }, e); S('ellipse', { cx: 506, cy: 146, rx: 20, ry: 13, class: 'tku-mis' }, e); }, 456, 146);
  el(gP, 5, e => { for (let k = 0; k < pad().jog; k++) { const y = 176 + k * (pad().jog > 6 ? 20 : 26); S('rect', { x: 470, y, width: 30, height: 16, rx: 3, class: 'tku-tipka-s' }, e); S('rect', { x: 506, y, width: 30, height: 16, rx: 3, class: 'tku-tipka-s' }, e); T(e, 485, y + 13, '−', 'tku-ls', 'middle'); T(e, 521, y + 13, '+', 'tku-ls', 'middle'); } }, 456, 186);
  el(gP, 6, e => S('rect', { x: 66, y: 134, width: 40, height: 22, rx: 4, class: 'tku-tipka-s' }, e), 120, 145);
  el(gP, 7, e => S('rect', { x: 66, y: 164, width: 40, height: 22, rx: 4, class: 'tku-tipka-s' }, e), 120, 175);
  el(gP, 8, e => S('rect', { x: 66, y: 194, width: 40, height: 22, rx: 4, class: 'tku-tipka-s' }, e), 120, 205);
  el(gP, 9, e => { for (let k = 0; k < 4; k++) S('rect', { x: 186 + k * 60, y: 296, width: 44, height: 16, rx: 3, class: 'tku-tipka-s' }, e); }, 160, 304);
  el(gP, 10, e => S('rect', { x: 66, y: 236, width: 40, height: 26, rx: 5, class: 'tku-tipka-z' }, e), 120, 249);
  el(gP, 11, e => S('rect', { x: 66, y: 270, width: 40, height: 22, rx: 4, class: 'tku-tipka-s' }, e), 120, 281);
  el(gP, 12, e => S('rect', { x: 66, y: 300, width: 40, height: 22, rx: 4, class: 'tku-tipka-c' }, e), 120, 311);
  el(gP, 13, e => S('rect', { x: 280, y: 40, width: 40, height: 18, rx: 4, class: 'tku-tipka-s' }, e), 336, 49);
  // stražnja
  S('rect', { x: 40, y: 30, width: 520, height: 320, rx: 36, class: 'tku-pad' }, gS);
  S('rect', { x: 120, y: 120, width: 360, height: 140, rx: 20, class: 'tku-pad-r' }, gS);
  T(gS, 300, 196, 'stražnja strana (zrcalno)', 'tku-ls', 'middle');
  el(gS, 21, e => { const pz = pad().omog === 4 ? [[70, 110], [70, 230], [518, 110], [518, 230]] : [[70, 150], [518, 150], [294, 300]]; for (const [x, y] of pz) S('rect', { x, y, width: 14, height: 70, rx: 6, class: 'tku-omog' }, e); }, 100, 92);
  el(gS, 22, e => S('rect', { x: 270, y: 58, width: 60, height: 26, rx: 6, class: 'tku-tipka-z' }, e), 346, 71);
  el(gS, 23, e => S('rect', { x: 150, y: 300, width: 34, height: 14, rx: 2, class: 'tku-tipka-s' }, e), 200, 308);
  el(gS, 24, e => S('rect', { x: 380, y: 290, width: 70, height: 30, rx: 3, class: 'tku-plocica' }, e), 466, 305);
  // omogućavanje i jog
  const svg2 = ui.svg(600, 190, 'Uređaj za omogućavanje u tri položaja, stanje pogona i os A1 koja se giba tipkama za ručno gibanje', 'tku-svg2');
  S('rect', { x: 30, y: 30, width: 70, height: 140, rx: 10, class: 'tku-pad' }, svg2);
  const sw = S('rect', { x: 46, width: 38, height: 34, rx: 6, class: 'tku-omog' }, svg2);
  [['otpušten', 52], ['srednji', 100], ['do kraja', 148]].forEach(([n, y]) => { S('line', { x1: 100, y1: y, x2: 116, y2: y, class: 'tku-mreza' }, svg2); T(svg2, 120, y + 5, n, 'tku-ls'); });
  const lP = S('circle', { cx: 250, cy: 60, r: 12, class: 'tku-lampa' }, svg2); T(svg2, 270, 66, 'pogoni', 'tku-ls');
  const tS = T(svg2, 238, 110, '', 'tku-l');
  const gA = S('g', { transform: 'translate(500 100)' }, svg2);
  S('circle', { r: 62, class: 'tku-disk' }, gA);
  const kA = S('line', { x1: 0, y1: 0, x2: 0, y2: -56, stroke: B.crv, 'stroke-width': 5, 'stroke-linecap': 'round' }, gA);
  const tA = T(svg2, 500, 186, '', 'tku-ls', 'middle');
  const lista = H('ul', { class: 'tku-legenda' });
  const lgb = {};
  function napuniListu() {
    lista.replaceChildren();
    for (const id of Object.keys(OPIS).map(Number).filter(i => st.strana === 'prednja' ? i < 20 : i > 20)) {
      const b = H('button', { type: 'button', 'aria-pressed': 'false' }, H('b', { tekst: String(id > 20 ? id - 20 : id) }), OPIS[id][0]);
      ctx.on(b, 'click', () => odaberi(id)); lista.append(H('li', {}, b)); lgb[id] = b;
    }
  }
  function odaberi(id) {
    st.odabir = id;
    for (const k in elem) elem[k].classList.toggle('tku-akt', +k === id);
    for (const k in lgb) lgb[k].setAttribute('aria-pressed', String(+k === id));
    okv.replaceChildren(H('h4', { tekst: OPIS[id][0] }), H('p', { tekst: OPIS[id][1] }));
    if (id === 3) { st.estop = !st.estop; gEs.classList.toggle('tku-estop-on', st.estop); }
    osvjezi();
  }
  function stanje() {
    if (st.estop) return ['E-STOP je pritisnut i zaključan: sigurnosni STOP 1, pogoni isključeni. Otpusti ga ponovnim klikom na gljivu.', 'opas', false];
    if (st.omog === 'pa') return ['Uređaj za omogućavanje do kraja (panika): sigurnosni STOP 1.', 'opas', false];
    if (st.omog === 'ot') return [st.jog ? 'Tipka za gibanje je pritisnuta, ali uređaj za omogućavanje nije: robot se ne giba.' : 'Uređaj za omogućavanje otpušten: pogoni isključeni.', st.jog ? 'upoz' : '', false];
    return [st.jog ? `Srednji položaj i tipka A1${st.jog > 0 ? '+' : '−'}: os A1 se giba ručno (T1).` : 'Srednji položaj: pogoni su uključeni, robot čeka naredbu.', 'ok', true];
  }
  function osvjezi() {
    gP.style.display = st.strana === 'prednja' ? '' : 'none'; gS.style.display = st.strana === 'prednja' ? 'none' : '';
    postavi(sw, { y: { ot: 35, sr: 83, pa: 131 }[st.omog] });
    const [por, vr, pog] = stanje();
    lP.classList.toggle('tku-lampa-on', pog);
    tS.textContent = pog ? 'pogoni uključeni' : 'pogoni isključeni';
    kA.setAttribute('transform', `rotate(${f1(st.a1)})`);
    tA.textContent = `A1 = ${hrp(st.a1, 1)}°`;
    ui.stanje(por, vr);
  }
  ctx.petlja(dt => {
    const [, , pog] = stanje();
    if (pog && st.jog) { st.a1 = ogr(st.a1 + st.jog * 20 * dt, D.osi[0].min, D.osi[0].max); osvjezi(); return true; }
    osvjezi(); return false;
  });
  ui.seg('Strana', [['prednja', 'Prednja'], ['straznja', 'Stražnja']], 'prednja', v => { st.strana = v; napuniListu(); osvjezi(); });
  ui.seg('Uređaj za omogućavanje', [['ot', 'otpušten'], ['sr', 'srednji'], ['pa', 'do kraja']], 'ot', v => { st.omog = v; osvjezi(); ctx.budi(); });
  const r = ui.red();
  const bM = ui.gumb('A1 −', () => { st.jog = st.jog === -1 ? 0 : -1; bM.setAttribute('aria-pressed', String(st.jog === -1)); bPl.setAttribute('aria-pressed', String(st.jog === 1)); osvjezi(); ctx.budi(); }, { tanki: true, u: r, pritisak: false, aria: 'Ručno gibanje A1 minus' });
  const bPl = ui.gumb('A1 +', () => { st.jog = st.jog === 1 ? 0 : 1; bPl.setAttribute('aria-pressed', String(st.jog === 1)); bM.setAttribute('aria-pressed', String(st.jog === -1)); osvjezi(); ctx.budi(); }, { tanki: true, u: r, pritisak: false, aria: 'Ručno gibanje A1 plus' });
  ui.upr.append(lista);
  const okv = H('div', { class: 'tku-okviric' }, H('h4', { tekst: 'Element privjeska' }), H('p', { tekst: 'Klikni element na crtežu ili u popisu.' }));
  ui.ocitP.append(okv);
  const o = ui.ocit([['p', 'Privjesak (pretpostavka)'], ['om', 'Uređaja za omogućavanje'], ['j', 'Parova tipki za gibanje'], ['m', 'Masa · zaštita']]);
  o.p(pad().naziv); o.om(String(pad().omog)); o.j(String(pad().jog) + (pad().jogPretp ? ' (pretpostavka)' : '')); o.m(`${hr(pad().m, 1)} kg · ${pad().ip}`);
  napuniListu(); osvjezi(); ctx.budi();
}

/* =========================================================== 15. razvod energije */
function tRazvodEnergije(ui, ctx) {
  const st = { var: D.varijanta, sl: { mot: true, pod: true, zrak: true, sig: true }, ventil: [0, 0, 0], zadnji: '', prst: 0, t: 0 };
  const svg = ui.svg(600, 440, 'Bočni pogled robota s trasama vodova: motorni i podatkovni kabeli od sučelja A1 do motora, podatkovni vod i zrak do zapešća, ventili i prihvatnica');
  const q = [0, -75, 105, 0, 60, 0], s = 0.4, OX = 200, OY = 400, pr = prXZ(OX, OY, s);
  const gR = S('g', { class: 'tku-proziran' }, svg);
  podnozjeBocno(gR, OX, OY, s);
  const P = tockeRuke(q), Pz = P.map(pr);
  ruka2D(gR, { s }).postavi(Pz);
  // sučelje A1
  const A1 = pr([-130, 0, 40]);
  S('rect', { x: A1[0] - 26, y: A1[1] - 22, width: 46, height: 44, rx: 4, class: 'tku-sucelje' }, svg);
  T(svg, A1[0] - 4, A1[1] + 44, 'sučelje A1', 'tku-ls', 'middle');
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const sredina = [pr([0, 0, 120]), pr([0, 0, 380]), Pz[2], Pz[3], Pz[4], Pz[5]];
  const trasa = (pom, do_) => { const t = [A1, ...sredina.slice(0, do_)].map((p, i) => i ? [p[0] + pom, p[1]] : [p[0] + 20, p[1] + pom * 0.3]); return t; };
  // motori (položaji načelni)
  const mot = [[pr([0, 0, 260]), 'M1'], [pr([60, 0, 400]), 'M2'], [lerp(Pz[3], Pz[4], 0.2), 'M3'], [lerp(Pz[4], Pz[5], 0.25), 'M4'], [lerp(Pz[4], Pz[5], 0.55), 'M5'], [lerp(Pz[4], Pz[5], 0.8), 'M6']];
  const gMot = S('g', {}, svg);
  for (const [p, n] of mot) { S('rect', { x: p[0] - 10, y: p[1] - 8, width: 20, height: 16, rx: 3, class: 'tku-motor-m' }, gMot); T(gMot, p[0], p[1] - 12, n, 'tku-ls', 'middle'); }
  const lay = {};
  const vod = (kl, tocke) => { const d = 'M' + tocke.map(p => f1(p[0]) + ',' + f1(p[1])).join(' L'); const g = S('g', {}, svg); S('path', { d, class: 'tku-vod ' + kl }, g); S('path', { d, class: 'tku-vod-tok ' + kl }, g); return g; };
  lay.mot = vod('tku-v-mot', [...trasa(-6, 2), mot[1][0], ...trasa(-6, 6).slice(3), mot[5][0]]);
  lay.pod = vod('tku-v-pod', [...trasa(0, 6), lerp(Pz[4], Pz[5], 0.9)]);
  const rdc = pr([40, 0, 150]);
  S('rect', { x: rdc[0] - 18, y: rdc[1] - 10, width: 36, height: 20, rx: 3, class: 'tku-rdc' }, svg); T(svg, rdc[0] + 22, rdc[1] + 5, 'RDC', 'tku-ls');
  // ventili i prihvatnica
  const W = Pz[5], F = Pz[6], vent = [];
  const gVi = S('g', {}, svg), gVv = S('g', {}, svg);
  for (let k = 0; k < 3; k++) { const p = lerp(Pz[4], Pz[5], 0.62 + k * 0.1); vent.push(S('rect', { x: p[0] - 8, y: p[1] - 40, width: 16, height: 14, rx: 2, class: 'tku-ventil' }, gVi)); }
  const VB = pr([-200, 0, 180]);
  S('rect', { x: VB[0] - 28, y: VB[1] - 20, width: 56, height: 40, rx: 4, class: 'tku-ventil' }, gVv); T(gVv, VB[0], VB[1] - 26, 'vanjski ventili', 'tku-ls', 'middle');
  lay.zrakI = vod('tku-v-zrak', [...trasa(6, 6), lerp(Pz[4], Pz[5], 0.62)]);
  lay.zrakV = vod('tku-v-zrak tku-v-spirala', [VB, pr([-120, 0, 420]), Pz[2], Pz[3], lerp(Pz[3], Pz[4], 0.5), Pz[5], F]);
  const zA = vod('tku-v-zrak', [lerp(Pz[4], Pz[5], 0.62), [W[0] + 18, W[1]], [F[0] + 14, F[1] + 10]]);
  lay.sig = vod('tku-v-sig', [lerp(Pz[4], Pz[5], 0.9), [F[0] - 14, F[1] + 4]]);
  // prihvatnica
  const fz = [P[6][0] - P[5][0], P[6][2] - P[5][2]], Lf = Math.hypot(...fz), ux = fz[0] / Lf, uy = -fz[1] / Lf;
  const gPr = S('g', { transform: `translate(${f1(F[0])} ${f1(F[1])}) rotate(${f1(Math.atan2(uy, ux) / RAD - 90)})` }, svg);
  S('rect', { x: -22, y: 0, width: 44, height: 22, rx: 3, class: 'tku-prihv' }, gPr);
  const prsti = [-1, 1].map(sg => S('rect', { y: 22, width: 9, height: 30, rx: 2, class: 'tku-prst' }, gPr));
  T(svg, F[0] + 34, F[1] + 50, 'prihvatnica', 'tku-ls');
  const tA1 = T(svg, 590, 24, '', 'tku-ls', 'end');
  function osvjezi() {
    const sx = st.var !== '-2';
    gVi.style.display = sx ? '' : 'none'; gVv.style.display = sx ? 'none' : '';
    lay.mot.style.display = st.sl.mot ? '' : 'none'; lay.pod.style.display = st.sl.pod ? '' : 'none';
    lay.zrakI.style.display = st.sl.zrak && sx ? '' : 'none'; lay.zrakV.style.display = st.sl.zrak && !sx ? '' : 'none';
    zA.style.display = st.sl.zrak && sx ? '' : 'none';
    lay.sig.style.display = st.sl.sig ? '' : 'none';
    vent.forEach((v, k) => v.classList.toggle('tku-ventil-b', st.ventil[k] === 1));
    const zatv = st.ventil[0] === 0 ? 1 : 0;
    st.prst += ((zatv ? 1 : 0) - st.prst) * 0.25;
    prsti.forEach((p, i) => postavi(p, { x: i ? 4 + (1 - st.prst) * 8 : -13 - (1 - st.prst) * 8 }));
    tA1.textContent = sx ? 'A1: X30 · X31 · X32 · XPN1 · AIR1 · AIR2' : 'A1: X30 · X31 · … (-2: energetski sustav nije javno opisan)';
    o.v(st.var === '-2' ? 'KR 6 R900-2' : 'KR 6 R900 sixx');
    o.ve(sx ? st.ventil.map((v, k) => `V${k + 1}: ${v ? 'B' : 'A'}`).join(' · ') : 'vanjski (pretpostavka)');
    o.pr(zatv ? 'zatvorena' : 'otvorena');
    o.do(st.zadnji || '—');
  }
  ctx.petlja(dt => { st.t += dt; svg.style.setProperty('--tku-pomak', f1(-st.t * 30)); osvjezi(); return Math.abs(st.prst - (st.ventil[0] === 0 ? 1 : 0)) > 0.01 || true; });
  ui.seg('Inačica robota', [['sixx', 'KR 6 R900 sixx'], ['-2', 'KR 6 R900-2']], st.var, v => { st.var = v; osvjezi(); ui.stanje(v === '-2' ? 'KR AGILUS-2: unutarnji energetski sustav postoji u izvedbama „CTR AIR” i „AIR CTR GIG”, ali njihov sadržaj nije javno opisan — prikazani su vanjski ventili i crijeva u spiralnoj zaštiti, kakva se vide na fotografiji ćelije (pretpostavka).' : 'sixx: tri bistabilna ventila u zapešću, zrak AIR1/AIR2 kroz robota.', 'plavo'); });
  const sk = ui.red();
  [['mot', 'Motorni kabeli (X30)'], ['pod', 'Podatkovni (X31, XPN1)'], ['zrak', 'Zrak'], ['sig', 'Signali alata (X41)']].forEach(([k, n]) => ui.kvacica(n, true, v => { st.sl[k] = v; osvjezi(); }, sk));
  for (let k = 0; k < 3; k++) {
    const r = ui.red();
    const [da, db] = D.ventili.DO[k];
    ui.gumb(`V${k + 1}: impuls DO${da} → A`, () => { if (st.var === '-2') { ui.stanje('Za -2 ventili u zapešću nisu potvrđeni — upravlja se vanjskim ventilima.', 'upoz'); return; } st.ventil[k] = 0; st.zadnji = `DO${da} (impuls) → V${k + 1} položaj A`; ui.stanje(`Kratki impuls na DO${da} prebacio je ventil ${k + 1} u položaj A; ventil tamo ostaje i bez struje (bistabilan).${k === 0 ? ' Zrak ide na priključak „zatvori” — prihvatnica se zatvara.' : ''}`, 'ok'); osvjezi(); }, { tanki: true, u: r });
    ui.gumb(`DO${db} → B`, () => { if (st.var === '-2') { ui.stanje('Za -2 ventili u zapešću nisu potvrđeni — upravlja se vanjskim ventilima.', 'upoz'); return; } st.ventil[k] = 1; st.zadnji = `DO${db} (impuls) → V${k + 1} položaj B`; ui.stanje(`Kratki impuls na DO${db} prebacio je ventil ${k + 1} u položaj B.${k === 0 ? ' Zrak ide na drugi priključak — prihvatnica se otvara.' : ''}`, 'ok'); osvjezi(); }, { tanki: true, u: r, aria: `Ventil ${k + 1}: impuls DO${db}, položaj B` });
  }
  const o = ui.ocit([['v', 'Inačica'], ['ve', 'Ventili'], ['pr', 'Prihvatnica (V1)'], ['do', 'Zadnji impuls']]);
  ui.sitno(`Ventili (sixx): najviše ${D.ventili.pMax} bar, ${D.ventili.f} Hz, ${D.ventili.U} V DC / ${D.ventili.I} mA; zrak bez ulja, suh, filtriran ≤ ${D.ventili.filtar} µm. Kabeli robot–upravljač: ${D.kabeli.duljine.join(', ')} m; najmanji polumjer savijanja motornog ${D.kabeli.rMot} mm, podatkovnog ${D.kabeli.rPod} mm.`);
  osvjezi(); ui.stanje('Uključi slojeve vodova i prebacuj ventile.'); ctx.budi();
}

/* =========================================================== 16. izmjena alata */
function tIzmjenaAlata(ui, ctx) {
  const N = D.stanica.alati, KOR = ['Pomak iznad mjesta trenutnog alata', 'Spuštanje u mjesto', 'Otključavanje izmjenjivača (zrak)', 'Podizanje bez alata, provjera mjesta', 'Pomak iznad novog alata', 'Spuštanje na novi alat', 'Zaključavanje izmjenjivača (zrak)', 'Podizanje s alatom, provjera prisutnosti', 'Prebacivanje aktivnog TOOL-a'];
  const st = { cur: 1, cilj: 2, korak: -1, auto: false, x: 120, z: 120, zak: true, mjesta: Array.from({ length: N }, (_, k) => k !== 0), kTlak: false, kSen: false, kvar: '', tk: 0 };
  const svg = ui.svg(600, 360, 'Bočni pogled: zapešće robota s izmjenjivačem iznad spremišta s četiri alata; senzori prisutnosti i stanje zaključavanja');
  const MX = k => 150 + k * 110, ZG = 270, ZD = 205, ZV = 110;
  S('rect', { x: 90, y: ZG + 10, width: 470, height: 18, class: 'tku-stol' }, svg);
  const gM = []; const sen = [];
  for (let k = 0; k < N; k++) {
    S('path', { d: `M${MX(k) - 42},${ZG + 10} L${MX(k) - 42},${ZG - 18} L${MX(k) - 28},${ZG - 18} L${MX(k) - 28},${ZG - 4} L${MX(k) + 28},${ZG - 4} L${MX(k) + 28},${ZG - 18} L${MX(k) + 42},${ZG - 18} L${MX(k) + 42},${ZG + 10}Z`, class: 'tku-spremiste' }, svg);
    sen.push(S('circle', { cx: MX(k) + 34, cy: ZG + 40, r: 7, class: 'tku-lampa' }, svg));
    T(svg, MX(k), ZG + 72, D.alati[k].ime, 'tku-ls', 'middle');
    gM.push(alatG(k));
  }
  function alatG(k) {
    const g = S('g', {}, svg);
    S('rect', { x: -20, y: -10, width: 40, height: 14, rx: 2, class: 'tku-izmj-l' }, g);
    if (k === 0) { S('rect', { x: -6, y: 4, width: 12, height: 30, class: 'tku-prihv' }, g); S('ellipse', { cx: 0, cy: 38, rx: 16, ry: 6, class: 'tku-vakuum' }, g); }
    else { S('rect', { x: -16, y: 4, width: 32, height: 16, rx: 2, class: 'tku-prihv' }, g); const w = k === 1 ? 10 : k === 2 ? 7 : 5; S('rect', { x: -14, y: 20, width: w, height: 22 + k * 2, class: 'tku-prst' }, g); S('rect', { x: 14 - w, y: 20, width: w, height: 22 + k * 2, class: 'tku-prst' }, g); }
    T(g, 0, -16, String(k + 1), 'tku-ls', 'middle');
    return g;
  }
  // zapešće
  const gW = S('g', {}, svg);
  S('rect', { x: -22, y: -120, width: 44, height: 90, rx: 8, class: 'tku-ruka-zap' }, gW);
  S('rect', { x: -18, y: -30, width: 36, height: 16, rx: 2, class: 'tku-izmj-f' }, gW);
  const klip = [-1, 1].map(sg => S('rect', { x: sg < 0 ? -26 : 18, y: -26, width: 8, height: 8, class: 'tku-klip' }, gW));
  const tW = T(svg, 590, 28, '', 'tku-l', 'end');
  const lamp = [['zaključano', 56], ['otključano', 82]].map(([n, y]) => { const c = S('circle', { cx: 28, cy: y - 5, r: 8, class: 'tku-lampa' }, svg); T(svg, 42, y, n, 'tku-ls'); return c; });
  const kor = koraci(ui, KOR);
  function cilj(k) {
    const xc = MX(st.cur - 1), xt = MX(st.cilj - 1);
    return [[xc, ZV], [xc, ZD], [xc, ZD], [xc, ZV], [xt, ZV], [xt, ZD], [xt, ZD], [xt, ZV], [xt, ZV]][k];
  }
  function osvjezi() {
    gW.setAttribute('transform', `translate(${f1(st.x)} ${f1(st.z)})`);
    klip.forEach(k => k.classList.toggle('tku-klip-on', st.zak));
    const na = st.naRobotu;
    gM.forEach((g, k) => {
      if (na === k + 1) g.setAttribute('transform', `translate(${f1(st.x)} ${f1(st.z - 2)})`);
      else g.setAttribute('transform', `translate(${MX(k)} ${ZG - 12})`);
      g.style.display = (na === k + 1 || st.mjesta[k]) ? '' : 'none';
    });
    sen.forEach((c, k) => c.classList.toggle('tku-lampa-on', st.mjesta[k] && !(st.kSen && k === st.cur - 1)));
    lamp[0].classList.toggle('tku-lampa-on', st.zak); lamp[1].classList.toggle('tku-lampa-on', !st.zak);
    tW.textContent = `aktivni alat: ${st.aktivni ? D.alati[st.aktivni - 1].ime : 'TOOL[0]'}`;
    o.a(st.aktivni ? `${D.alati[st.aktivni - 1].ime} (${D.alati[st.aktivni - 1].opis})` : 'nema');
    o.m(st.mjesta.map((v, k) => `${k + 1}: ${v ? 'zauzeto' : 'prazno'}`).join(' · '));
    o.z(st.zak ? 'zaključano' : 'otključano'); o.p(st.kTlak ? '4,2 bar — ispod granice' : hr(D.stanica.tlak, 1) + ' bar', st.kTlak ? 'opas' : 'ok');
  }
  function zavrsiKorak() {
    const k = st.korak;
    if (k === 2) { st.zak = false; st.mjesta[st.cur - 1] = true; st.naRobotu = 0; st.aktivni = 0; }
    if (k === 3 && st.kSen) return `Senzor prisutnosti u mjestu ${st.cur} ne javlja alat — robot ne smije dalje (alat možda nije odložen).`;
    if (k === 6) { if (st.kTlak) return 'Tlak je ispod granice: izmjenjivač nije potvrdio zaključavanje — alat bi mogao pasti. Slijed je zaustavljen.'; st.zak = true; st.naRobotu = st.cilj; st.mjesta[st.cilj - 1] = false; }
    if (k === 8) { st.aktivni = st.cilj; st.cur = st.cilj; }
    return '';
  }
  ctx.petlja(dt => {
    if (st.korak < 0 || st.kvar) { osvjezi(); return false; }
    const [tx, tz] = cilj(st.korak);
    const dx = tx - st.x, dz = tz - st.z, d = Math.hypot(dx, dz), v = 160 * dt;
    if (d > v) { st.x += dx / d * v; st.z += dz / d * v; osvjezi(); return true; }
    st.x = tx; st.z = tz; st.tk += dt;
    if ((st.korak === 2 || st.korak === 6 || st.korak === 8) && st.tk < 0.5) { osvjezi(); return true; }
    st.tk = 0;
    const g = zavrsiKorak();
    if (g) { st.kvar = g; kor.postavi(st.korak, true); ui.stanje(g, 'opas'); osvjezi(); return false; }
    if (st.korak >= KOR.length - 1) { st.korak = -1; kor.postavi(KOR.length); ui.stanje(`Izmjena gotova: na prirubnici je ${D.alati[st.cur - 1].ime}, aktivni TCP je na vrhu tog alata ($TOOL = TOOL_DATA[${st.cur}]).`, 'ok'); osvjezi(); return false; }
    if (!st.auto) { st.ceka = true; kor.postavi(st.korak + 1); ui.stanje(`Gotovo: ${KOR[st.korak].toLowerCase()}. Pritisni „Sljedeći korak”.`, 'plavo'); osvjezi(); return false; }
    st.korak++; kor.postavi(st.korak); ui.stanje(KOR[st.korak] + ' …', 'plavo'); osvjezi(); return true;
  });
  function pocni(auto) {
    if (st.cilj === st.cur) { ui.stanje(`${D.alati[st.cilj - 1].ime} je već na robotu.`, 'upoz'); return false; }
    st.kvar = ''; st.auto = auto; st.korak = 0; st.tk = 0; st.ceka = false; st.naRobotu = st.cur; kor.postavi(0); ui.stanje(KOR[0] + ' …', 'plavo'); ctx.budi(); return true;
  }
  ui.seg('Ciljni alat', D.alati.slice(0, N).map((a, k) => [k + 1, a.ime]), st.cilj, v => { st.cilj = v; });
  const r = ui.red();
  ui.gumb('Pokreni izmjenu', () => { if (st.korak >= 0 && !st.kvar) { st.auto = true; ctx.budi(); return; } pocni(true); }, { u: r });
  ui.gumb('Sljedeći korak', () => {
    if (st.kvar) { ui.stanje('Najprije ukloni kvar i pritisni „Ponovo”.', 'upoz'); return; }
    if (st.korak < 0) { pocni(false); return; }
    if (st.ceka) { st.ceka = false; st.korak++; kor.postavi(st.korak); ui.stanje(KOR[st.korak] + ' …', 'plavo'); ctx.budi(); }
  }, { tanki: true, u: r });
  ui.gumb('Ponovo', () => {
    st.korak = -1; st.kvar = ''; st.auto = false; st.cur = st.aktivni || st.cur || 1; st.aktivni = st.cur; st.naRobotu = st.cur; st.zak = true;
    st.mjesta = Array.from({ length: N }, (_, k) => k !== st.cur - 1); st.x = MX(st.cur - 1); st.z = ZV; kor.postavi(-1); ui.stanje('Početno stanje: ' + D.alati[st.cur - 1].ime + ' na robotu.'); osvjezi();
  }, { tanki: true, u: r });
  ui.kvacica('Kvar: tlak zraka ispod granice', false, v => { st.kTlak = v; osvjezi(); });
  ui.kvacica('Kvar: senzor prisutnosti u spremištu ne javlja', false, v => { st.kSen = v; osvjezi(); });
  const o = ui.ocit([['a', 'Aktivni TOOL'], ['m', 'Mjesta u spremištu'], ['z', 'Izmjenjivač'], ['p', 'Tlak zraka']]);
  st.aktivni = 1; st.naRobotu = 1; st.x = MX(0); st.z = ZV;
  kor.postavi(-1); osvjezi(); ui.stanje('Odaberi ciljni alat i pokreni izmjenu.'); ctx.budi();
}

/* =========================================================== 17. upravljač */
function tUpravljac(ui, ctx) {
  const st = { upr: D.upravljac, tok: null, korak: 0, tt: 0, odabir: null };
  const C4 = () => st.upr === 'krc4compact';
  const svg = ui.svg(600, 440, 'Blok-shema upravljača robota: napajanje, upravljačko računalo, sigurnosno upravljanje, servopojačala, baterija i sučelja; robot s RDC-om, motorima i kočnicama; PLC i privjesak');
  S('rect', { x: 10, y: 60, width: 360, height: 330, rx: 12, class: 'tku-kuciste-c' }, svg);
  const tNaz = T(svg, 190, 84, '', 'tku-lb', 'middle');
  S('rect', { x: 430, y: 120, width: 160, height: 270, rx: 12, class: 'tku-kuciste-c' }, svg);
  T(svg, 510, 144, 'robot', 'tku-lb', 'middle');
  const B0 = {};
  const blok = (id, x, y, w, h, n1) => { const g = S('g', { class: 'tku-rb' }, svg); S('rect', { x, y, width: w, height: h, rx: 7 }, g); const t1 = T(g, x + w / 2, y + h / 2 - 2, n1, 'tku-ls', 'middle'); const t2 = T(g, x + w / 2, y + h / 2 + 16, '', 'tku-ls', 'middle'); B0[id] = { g, t1, t2, c: [x + w / 2, y + h / 2] }; klikabilno(ctx, g, n1, () => odaberi(id)); return g; };
  blok('mreza', 24, 100, 120, 50, 'mreža, filtar');
  blok('pc', 160, 100, 196, 70, 'upravljačko računalo');
  blok('sig', 160, 184, 196, 44, 'sigurnosno upravljanje');
  blok('dc', 24, 166, 120, 62, 'DC međukrug');
  blok('kr', 24, 244, 120, 40, 'kočni otpornik');
  blok('ksp', 160, 244, 196, 60, 'servopojačala ×6');
  blok('bat', 24, 300, 120, 40, 'baterija / UPS');
  blok('suc', 160, 318, 196, 60, 'sučelja');
  blok('rdc', 446, 160, 128, 44, 'RDC');
  blok('mot', 446, 220, 128, 70, 'motori A1–A6');
  blok('koc', 446, 300, 128, 34, 'kočnice');
  blok('rez', 446, 344, 128, 34, 'rezolveri');
  blok('plc', 420, 20, 170, 44, 'PLC stanice');
  blok('pad', 10, 404, 150, 32, 'privjesak');
  const vod = (d, kl) => S('path', { d, class: 'tku-vod-r ' + (kl || '') }, svg);
  const tokovi = {};
  const veza = (id, d) => { vod(d); tokovi[id] = S('path', { d, class: 'tku-tok-r' }, svg); };
  veza('mreza-dc', 'M84,150 L84,166'); veza('dc-ksp', 'M144,200 L150,200 L150,274 L160,274'); veza('dc-kr', 'M84,228 L84,244'); veza('bat-pc', 'M144,320 L152,320 L152,150 L160,150');
  veza('pc-ksp', 'M300,170 L300,184 M300,228 L300,244'); veza('pc-sig', 'M200,170 L200,184');
  veza('ksp-mot', 'M356,274 L400,274 L400,255 L446,255'); veza('mot-koc', 'M510,290 L510,300'); veza('mot-rez', 'M574,255 L584,255 L584,361 L574,361');
  veza('rez-rdc', 'M446,361 L420,361 L420,182 L446,182'); veza('rdc-pc', 'M446,170 L400,170 L400,130 L356,130');
  veza('pc-plc', 'M330,100 L330,42 L420,42'); veza('pad-suc', 'M120,404 L120,392 L200,392 L200,378');
  const tMk = T(svg, 403, 290, '', 'tku-ls', 'middle'), tPk = T(svg, 403, 160, '', 'tku-ls', 'middle'), tPLC = T(svg, 375, 36, '', 'tku-ls', 'middle');
  const TOK = {
    naredba: [['pc', 'Interpreter izvodi KRL naredbu (npr. LIN P2), planer računa putanju.'], ['pc', `Interpolator svakih ${D.ipo} ms računa zadane kutove osi (inverzna kinematika).`], ['ksp', 'Servopojačala zatvaraju petlje položaja, brzine i struje i daju napon motorima.'], ['mot', 'Motorni kabel nosi struje motora; motor daje moment, prijenosnik ga povećava.']],
    povrat: [['rez', 'Rezolver na svakom motoru daje signale sin/cos.'], ['rdc', 'RDC u robotu ih pretvara u digitalni kut motora.'], ['pc', 'Podatkovni kabel (EtherCAT) nosi kutove u upravljač: regulacija i sigurnosno upravljanje (npr. nadzor brzine u T1) ih koriste.'], ['sig', 'Sigurnosno upravljanje neovisno provjerava položaj i brzinu.']],
    nestanak: [['mreza', 'Nestaje mrežno napajanje.'], ['koc', 'Pogoni se isključuju, kočnice odmah zatvaraju (STOP 0).'], ['bat', 'Baterija (KR C5 micro: vanjski UPS na XD2) premosti napajanje računala.'], ['pc', 'Računalo pohranjuje podatke i kontrolirano se gasi.']]
  };
  const VEZE_TOKA = { naredba: ['pc-ksp', 'pc-ksp', 'ksp-mot', 'ksp-mot'], povrat: ['mot-rez', 'rez-rdc', 'rdc-pc', 'pc-sig'], nestanak: ['mreza-dc', 'mot-koc', 'bat-pc', 'bat-pc'] };
  const OPIS = {
    mreza: () => C4() ? ['Napajanje', `Mrežni filtar, glavna sklopka, niskonaponski izvor; ${D.krc4compact.U}, priključak K1.`] : ['Napajanje', `Mrežni filtar u pogonskoj kutiji; ${D.krc5micro.U}, osigurač 16 A.`],
    pc: () => C4() ? ['Upravljačko računalo KPC', 'Matična ploča, procesor, memorija, disk; KUKA System Software: interpreter KRL-a, planer putanje, interpolator. U KPC-u je i sigurnosni upravljač.'] : ['Kontrolna kutija', 'Sistemska ploča SYBbasic ili SYBperf i sučeljna ploča IFBstd; KSS 8.7 (interpreter, planer, interpolator, sigurnost).'],
    sig: () => ['Sigurnosno upravljanje', 'Kategorija 3, PL d: E-STOP, uređaji za omogućavanje, zaštita operatera, nadzor brzine u T1, sigurnosna sučelja (KR C4 compact X11 ili X66; KR C5 micro XG11.1).'],
    dc: () => C4() ? ['Pogonska kutija: KPP_SR', 'KUKA Power Pack napaja istosmjerni međukrug iz kojeg servopojačala uzimaju energiju.'] : ['Pogonska kutija', 'Hladnjak, ventilator, mrežni filtar i KSP-300 s napajanjem međukruga (FCU-300).'],
    kr: () => ['Kočni otpornik', 'Kad motori koče, vraćaju energiju u međukrug; višak se pretvara u toplinu u kočnom otporniku.'],
    ksp: () => C4() ? ['Servopojačala KSP_SR', 'KUKA Servo Pack: pretvarači za šest motora; strujne petlje i PWM.'] : ['Servopojačala KSP-300', 'SCU-6-1S: upravljanje do šest servo osi.'],
    bat: () => C4() ? ['Baterije', 'Unutarnje baterije premošćuju nestanak struje za kontrolirano gašenje računala.'] : ['Vanjska baterija / UPS', 'Priključak XD2; jedna baterija može služiti do tri robota.'],
    suc: () => C4() ? ['Sučelja (priključna ploča)', 'X19 smartPAD, X20 motorni, X21 podatkovni (robot), X65 EtherCAT proširenje, X69 servisno (KSI), KLI prema PLC-u, X11/X66 sigurnost.'] : ['Sučelja', 'XD20.1/XD20.2 motori, KLI i KLI IT, KEI (EtherCAT), KSI i KONI, XG11.1 sigurnost, XG58 vanjsko omogućavanje, XD2 UPS, XG33 brzi mjerni ulazi, USB i SD.'],
    rdc: () => ['RDC u robotu', 'Resolver Digital Converter: pretvara signale rezolvera svih osi u digitalne vrijednosti i šalje ih upravljaču podatkovnim kabelom (X31 na robotu).'],
    mot: () => ['Motori A1–A6', 'Servomotori s kočnicom i rezolverom; spojeni motornim kabelom na X30. Tip i snaga nisu objavljeni.'],
    koc: () => ['Kočnice', 'Na svakoj osi; zatvorene bez struje. Napajanje kočnica vodi motorni kabel.'],
    rez: () => ['Rezolveri', 'Mjere kut svakog motora; signal ide na RDC u robotu.'],
    plc: () => ['PLC stanice', 'Siemens ET200SP u standardnoj RASS stanici. Veza robot–PLC u KUKA inačici vjerojatno PROFINET na KLI (pretpostavka); robot u AUT EXT prima naredbe za pokretanje programa i vraća signale stanja.'],
    pad: () => [PAD().naziv, `Privjesak za učenje (${C4() ? 'priključak X19' : 'smartPAD-2'}); E-STOP i uređaji za omogućavanje vode u sigurnosno upravljanje.`]
  };
  function odaberi(id) {
    st.odabir = id;
    for (const k in B0) B0[k].g.classList.toggle('tku-akt', k === id);
    const [n, t] = OPIS[id]();
    okv.replaceChildren(H('h4', { tekst: n }), H('p', { tekst: t }));
  }
  function osvjezi() {
    const u = UPR2();
    tNaz.textContent = u.naziv;
    B0.ksp.t2.textContent = C4() ? 'KSP_SR' : 'KSP-300'; B0.dc.t2.textContent = C4() ? 'KPP_SR' : 'FCU-300'; B0.pc.t2.textContent = C4() ? 'KPC + sigurnost' : 'SYB + IFBstd';
    B0.suc.t2.textContent = C4() ? 'X19 · X20 · X21 · KLI' : 'XD20 · KEI · KLI'; B0.bat.t2.textContent = C4() ? 'unutarnje' : 'XD2, vanjski';
    B0.pad.t1.textContent = PAD().naziv;
    tMk.textContent = C4() ? 'X20 → X30' : 'XD20 → X30'; tPk.textContent = C4() ? 'X31 ← X21' : 'X31 → upr.'; tPLC.textContent = 'KLI';
    o.n(u.naziv); o.m(hr(u.m, 1) + ' kg' + (u.mjere ? ' · ' + u.mjere : ' · mjere nisu objavljene')); o.s(`${u.U}, ${hr(u.S, 2)} kVA, toplina najviše ${u.Q} W`); o.ip(`${u.ip}, najviše ${u.osi} osi`);
    for (const k in tokovi) tokovi[k].classList.remove('tku-tece');
    if (st.tok) {
      const k = Math.min(st.korak, TOK[st.tok].length - 1), [b, t] = TOK[st.tok][k];
      for (const id in B0) B0[id].g.classList.toggle('tku-akt', id === b);
      tokovi[VEZE_TOKA[st.tok][k]].classList.add('tku-tece');
      tokovi[VEZE_TOKA[st.tok][k]].style.strokeDashoffset = f1(-st.tt * 60);
      ui.stanje(`${k + 1}/${TOK[st.tok].length}: ${t}`, st.tok === 'nestanak' ? 'upoz' : 'plavo');
    }
  }
  const UPR2 = () => st.upr === 'krc4compact' ? D.krc4compact : D.krc5micro;
  ctx.petlja(dt => {
    if (!st.tok) { osvjezi(); return false; }
    st.tt += dt;
    if (st.tt > 1.8) { st.tt = 0; st.korak++; if (st.korak >= TOK[st.tok].length) { st.tok = null; ui.stanje('Kraj prikaza toka. Klikni blok sheme za opis.', 'ok'); for (const id in B0) B0[id].g.classList.remove('tku-akt'); osvjezi(); return false; } }
    osvjezi(); return true;
  });
  ui.seg('Upravljač', [['krc5micro', 'KR C5 micro'], ['krc4compact', 'KR C4 compact']], st.upr, v => { st.upr = v; osvjezi(); if (st.odabir) odaberi(st.odabir); ui.stanje(`${UPR2().naziv}: tip upravljača u stanici nije potvrđen fotografijom.`, 'plavo'); });
  const r = ui.red();
  const pokreni = t => { st.tok = t; st.korak = 0; st.tt = 0; ctx.budi(); };
  ui.gumb('Tok naredbe', () => pokreni('naredba'), { tanki: true, u: r });
  ui.gumb('Povratna veza', () => pokreni('povrat'), { tanki: true, u: r });
  ui.gumb('Nestanak napajanja', () => pokreni('nestanak'), { tanki: true, u: r, kl: 'tku-g-stop' });
  const okv = H('div', { class: 'tku-okviric' }, H('h4', { tekst: 'Blok sheme' }), H('p', { tekst: 'Klikni blok za opis.' }));
  ui.ocitP.append(okv);
  const o = ui.ocit([['n', 'Upravljač'], ['m', 'Masa · mjere'], ['s', 'Napajanje'], ['ip', 'Zaštita · osi']]);
  ui.sitno(`Kabeli robot–upravljač: duljine ${D.kabeli.duljine.join(', ')} m (najviše 25 m).`);
  osvjezi(); ui.stanje('Klikni blok sheme ili pokreni prikaz toka.'); ctx.budi();
}

/* =========================================================== izvoz */
const GRADITELJI = {
  os: tOs, prijenosnik: tPrijenosnik, kocnica: tKocnica, resolver: tResolver, umjeravanje: tUmjeravanje,
  servoRegulacija: tServoRegulacija, kinematikaDH: tKinematikaDH, singularnosti: tSingularnosti,
  koordinatniSustavi: tKoordinatniSustavi, gibanjaKRL: tGibanjaKRL, 'zaglađivanje': tZagladivanje,
  nacinRada: tNacinRada, zaustavljanje: tZaustavljanje, privjesakTipke: tPrivjesakTipke,
  razvodEnergije: tRazvodEnergije, izmjenaAlata: tIzmjenaAlata, upravljac: tUpravljac
};
const ALIAS = { zagladivanje: 'zaglađivanje', zaglađivanje: 'zaglađivanje' };

export function prikazi(el, id0) {
  if (!el) throw new Error('teme_kuka: nedostaje element');
  const id = ALIAS[id0] || id0;
  if (!GRADITELJI[id] || !TEME[id]) {
    el.replaceChildren(H('p', { class: 'tku-stanje tku-upoz', tekst: 'Tema „' + id0 + '” ne postoji.' }));
    return { unisti() { el.replaceChildren(); } };
  }
  const ctx = new Kontekst(el);
  let sek = null;
  try {
    const ui = okvir(el, id, ctx);
    sek = ui.sek;
    GRADITELJI[id](ui, ctx);
  } catch (e) {
    ctx.unisti();
    throw e;
  }
  let gotovo = false;
  return {
    unisti() {
      if (gotovo) return;
      gotovo = true;
      ctx.unisti();
      if (sek && sek.parentNode === el) el.removeChild(sek);
    }
  };
}
