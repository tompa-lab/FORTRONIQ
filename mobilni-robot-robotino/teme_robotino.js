// teme_robotino.js — 16 interaktivnih 2D tema „Kako radi” za mobilni robot Robotino
// (DOS ForTroniQ, područje mobilni-robot-robotino). ES modul bez ovisnosti.
// Izvozi: TEME (naslovi, engleski nazivi, tekstovi), prikazi(el, id) → { unisti() }
// i postaviPodatke(obj) — za preuzimanje brojeva iz robotino_podaci.js prije prvog prikaza.
// Tekst i grafika su vlastiti. Što izvori ne objavljuju, označeno je kao pretpostavka ili pojednostavljenje.

/* =========================================================== podaci
   Svi brojevi koje teme koriste nalaze se OVDJE (kratice izvora kao u PODACI_ROBOTINO.md).
   Stranica može prije prikaza pozvati postaviPodatke({...}) s vrijednostima iz robotino_podaci.js. */
const D = {
  generacija: 'R4',
  gear: 32,                 // ukupni prijenos motor → kotač [IP3-GEAR], [IP4-GEAR]
  rw: 0.060,                // polumjer kotača, Ø120 mm (R4) [R4-MAN]; CP-MR Ø125 [CPMR-C] — SUKOB
  rwCPMR: 0.0625,
  rb: 0.13,                 // središte → kotač [pretpostavka; API zadano 0,132 m]
  rbPretp: true,
  nMotMax: 3600,            // najveća brzina motora R4 [R4-MAN]
  kutovi: [60, 180, 300],   // položaji kotača od osi x [HABR]
  promjer: 0.45,            // promjer osnovice [IP4-OV]
  vmaxCPMR: 0.52,           // [CPMR-C]
  enkImp: 500, enkInk: 2000,                          // RE 30-2-500 [IP4-ENC], [RV-ENC]
  motor: { tip: 'Dunkermotoren GR 42x40', U: 24, nNaz: 3100, MNaz: 5.7, INaz: 1.2, n0: 3800, Mpot: 33 },  // 24 V izvedba [MOT-PDF], izbor izvedbe = pretpostavka
  reduktor: { tip: 'Dunkermotoren PLG 42 S', eta: 0.81, Mtrajni: 600, stupnjevi: 2 },                   // [ZR-R3]
  remen: 'ConCar S3M',
  pi: { f: 1000, K: 0.4, Ki: 0.01, umax: 255 },                                                        // [OR-PI]
  ir: { tip: 'Sharp GP2Y0A41SK0F', broj: 9, razmak: 40, dMin: 0.04, dMax: 0.30 },                       // [IP4-DIST]
  odbojnik: 'Mayser SK EKS011',                                                                        // [IP4-BUMP]
  ziro: { R4: 'CruizCore R6093U', R3: 'MPU6050' },                                                     // [IP4-GYRO], [OR-MPU]
  opticki: 'Festo SOEG-L-Q30-P-A-K-2L',                                                                // [IP4-OPT]
  hokuyo: { tip: 'Hokuyo URG-04LX-UG01', kut: 240, korak: 0.352, f: 10, dMin: 0.02, dMax: 5.6 },        // [ACRO]
  nano: { tip: 'SICK nanoScan3 Core I/O', kut: 275, odziv: 70, zastitnoMax: 3 },                       // [RS-NANO], [CPMR-SCH24]
  rest: 200, api2: 100,                                                                                // [OR-REST], [API-OMNI]
  bat: { R4: { U: 18, C: 5.2, max: 4, t: 10, tPaket: 2.5 }, R3: { U: 12, C: 9.5, n: 2, t: 4 } },        // [IP4-AKKU], [FAC-244], [IP3-BAT], [INFS]
  Psr: 50, Pstanica: 240,                                                                              // [CPMR-C]
  stanica: { sirina: 0.535 }                                                                           // [FAC-248]
};
function spoji(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') spoji(a[k], b[k]); else a[k] = b[k]; } }
export function postaviPodatke(o) { if (o && typeof o === 'object') spoji(D, o); }

/* =========================================================== oblikovanje brojeva */
const hr = (n, d = 1) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d).replace('.', ',').replace('-', '−');
const hrp = (n, d = 1) => (n > 0.5 * Math.pow(10, -d) ? '+' : '') + hr(n, d);
const tis = n => { const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); return (n < -0.5 ? '−' : '') + s; };
const kK = () => 60 * D.gear / (2 * Math.PI * D.rw);          // 1/min motora po m/s obodne brzine

/* =========================================================== tekstovi */
export const TEME = {
  omniKotac: {
    naslov: 'Svesmjerni (švedski) kotač',
    engl: 'Omni wheel, Swedish wheel',
    get uvod() {
      return [
        `Robotino vozi na tri svesmjerna kotača. Na obodu svakog kotača su slobodni bačvasti valjci (ukupno 16, od prozirnog poliuretana na polikarbonatnoj jezgri). Os svakog valjka okomita je na os kotača, tj. leži u ravnini kotača, tangencijalno na obod.`,
        `Zato kotač na podu daje silu samo u jednom smjeru — u smjeru vrtnje (okomito na os kotača). Kotač vuče onoliko koliko ga motor okreće, a u smjeru svoje osi valjci se slobodno kotrljaju: kotač se bočno pomiče gotovo bez otpora. Brzina dodirne točke rastavlja se na pogonsku komponentu v·cos α, koju određuje motor, i bočnu v·sin α, koju preuzimaju valjci.`
      ];
    },
    kako: 'Pokreni animaciju i klizačem zadaj smjer gibanja α u odnosu na smjer vrtnje kotača. Pri α = 0° kotač se samo kotrlja, pri α = 90° kotač miruje, a vrte se samo valjci. Lijevo je kotač gledan duž osi (dva reda valjaka, prednji i stražnji), desno odozgo: pod se giba ispod kotača, a strelice pokazuju rastav brzine. U prikazu „Sile” vidi se da motor daje samo pogonsku silu; bočno kotač ne može ni vući ni kočiti.',
    get napomena() { return `Raspored valjaka u dva reda po 8 (s pomakom 22,5°) naša je pretpostavka — izvor daje samo 16 valjaka po kotaču. Promjer i širina valjaka nisu objavljeni, pa se njihova vrtnja prikazuje samo kvalitativno. Otpor kotrljanja valjaka zanemaren je. Kotač Ø${hr(D.rw * 2000, 0)} mm (R4); priručnik CP-MR navodi Ø${hr(D.rwCPMR * 2000, 0)} mm. Prikaz je usporen 4 puta.`; }
  },
  kinematika: {
    naslov: 'Kinematika tri svesmjerna kotača',
    engl: 'Omnidrive kinematics (three-wheel holonomic drive)',
    get uvod() {
      return [
        `Kotači stoje na ${D.kutovi.join('°, ')}° od osi x robota (x naprijed, y lijevo, ω pozitivna suprotno od kazaljke gledano odozgo). Kotač i može davati brzinu samo u svom smjeru vožnje (−sin θᵢ, cos θᵢ), pa je obodna brzina kotača projekcija brzine robota na taj smjer, uvećana za doprinos vrtnje rb·ω.`,
        `Brzinu motora u 1/min daje m_i = k·(−sin θᵢ·vx + cos θᵢ·vy + rb·ω), uz k = 60·i/(2π·rw). Tri jednadžbe s tri nepoznanice: robot ima tri stupnja slobode (x, y, zakret) i svaki se može zadati neovisno — pogon je holonomski. Obrnuti račun (direktna kinematika) iz izmjerenih brzina motora daje vx, vy i ω; na njemu se temelji odometrija.`
      ];
    },
    get kako() { return `Odaberi smjer računa. U inverznom načinu klizačima zadaj vx, vy i ω (kao naredba omnidrive) i gledaj strelice kotača i brzine motora m1–m3; u direktnom zadaj brzine motora i gledaj kako se robot giba. Formule ispod crteža računaju se uživo. Gumbi brzih postavki pokazuju tipične slučajeve: pri čistoj vožnji naprijed kotač 2 miruje, pri okretu na mjestu sva tri motora imaju istu brzinu. Ako bi neki motor prešao ${tis(D.nMotMax)} 1/min, sve se brzine razmjerno smanje.`; },
    get napomena() { return `rb = ${hr(D.rb, 3)} m je pretpostavka (za R3/R4 nije objavljen; API zadano 0,132 m). Izvor formula je izvadak iz koda API-ja (OmniDriveModel), a fizička numeracija motora na robotu nije potvrđena. Proklizavanje kotača i dinamika (ubrzanja) nisu u modelu; put u donjem prikazu je idealan.`; }
  },
  pogonskaJedinica: {
    naslov: 'Pogonska jedinica: motor, reduktor, remen, kotač',
    engl: 'Drive unit: DC motor, planetary gearbox, toothed belt',
    get uvod() {
      return [
        `Svaki od tri kotača ima vlastitu pogonsku jedinicu. Četkasti istosmjerni motor ${D.motor.tip} (klasa 20 W) s inkrementalnim enkoderom pogoni planetarni reduktor ${D.reduktor.tip}, a s njega plosnati zupčasti remen ${D.remen} prenosi vrtnju na osovinu kotača. Ukupni prijenos motor → kotač je ${D.gear} : 1.`,
        `Prijenosnik smanjuje brzinu ${D.gear} puta i za toliko povećava moment, umanjeno za gubitke (η = ${hr(D.reduktor.eta, 2)} za reduktor). Snaga ostaje gotovo ista: na kotaču je ${hr(D.reduktor.eta * 100, 0)} % snage motora. Na podu se moment kotača pretvara u vučnu silu F = M_k / rw.`
      ];
    },
    kako: 'Klizačima zadaj brzinu i moment motora i prati brojeve na svakom stupnju: brzina pada 32 puta, moment raste (32 · 0,81 ≈ 26 puta), a snaga se smanjuje samo za gubitke. Graf ispod prikazuje karakteristiku motora 24 V: radna točka mora ostati ispod pravca n–M, inače motor pri tom naponu ne može dati traženo. Prebaci promjer kotača da vidiš koliko razlika 120/125 mm mijenja brzinu i silu.',
    get napomena() { return `Izvori ne razdvajaju omjer reduktora i remena; prema [ZR-R3] ${D.gear} : 1 daje sam reduktor, pa remen ovdje ima omjer 1 : 1 i bez gubitaka (pretpostavka). Prikazan je jedan od dva planetarna stupnja. Podaci motora su za izvedbu 24 V (izbor izvedbe je pretpostavka; [ZR-R3] za R3 navodi 40 V). Vrtnja je usporena 100 puta.`; }
  },
  enkoder: {
    naslov: 'Inkrementalni enkoder RE 30-2-500',
    engl: 'Incremental quadrature encoder',
    get uvod() {
      return [
        `Na svakom motoru je inkrementalni enkoder Dunkermotoren RE 30-2-500: disk s ${D.enkImp} proreza i dva optička očitača, kanali A i B. Očitači su razmaknuti za četvrtinu razmaka proreza, pa su njihovi pravokutni signali pomaknuti za 90° (kvadraturni signal).`,
        `Brojanjem svih bridova obaju kanala (×4) dobiva se ${tis(D.enkInk)} inkremenata po okretaju motora, a uz prijenos ${D.gear} : 1 čak ${tis(D.enkInk * D.gear)} po okretaju kotača — oko ${hr(2 * Math.PI * D.rw / (D.enkInk * D.gear) * 1e6, 1)} µm puta po inkrementu. Smjer vrtnje slijedi iz redoslijeda bridova: ako A prednjači pred B, brojilo raste, a ako B prednjači, pada.`
      ];
    },
    kako: 'Pokreni vrtnju i promatraj uvećani isječak diska: kad prorez prođe ispred očitača, svjetlo prolazi i kanal ima vrijednost 1. Desno se prati stanje (A, B) u krugu od četiri stanja. Promijeni smjer: redoslijed stanja se obrne i brojilo počne padati. Odaberi način brojanja ×1, ×2 ili ×4 — na isti pomak ×4 daje četiri puta više inkremenata.',
    napomena: 'Disk je nacrtan s 500 proreza, a uvećani isječak kao ravna traka. Brzina u prikazu je jako usporena; pri 3600 1/min enkoder daje 120 000 inkremenata u sekundi. Izvedba brojila u mikrokontroleru nije objavljena.'
  },
  regulacija: {
    naslov: 'Regulacija brzine motora: PI regulator 1 kHz',
    engl: 'Motor speed control, discrete PI controller',
    get uvod() {
      return [
        `Mikrokontroler za svaki motor ${tis(D.pi.f)} puta u sekundi uspoređuje zadanu brzinu (iz kinematike) i stvarnu (iz enkodera) i računa novi izlaz. Regulator je diskretni PI u brzinskom (inkrementalnom) obliku: izlaz se mijenja za u_k − u_(k−1) = K·(e_k − e_(k−1)) + Ki·e_k, uz zadano K = ${hr(D.pi.K, 2)} i Ki = ${hr(D.pi.Ki, 3)}.`,
        `Izlaz je ograničen na ±${D.pi.umax} (8 bita) i postaje faktor ispune PWM signala koji H-most pretvara u napon motora 0–24 V, s predznakom za smjer. Kad su i zadana i stvarna brzina nula, izlaz se postavlja na nulu. Integralni dio uklanja trajnu pogrešku, pa motor drži zadanu brzinu i kad se opterećenje promijeni.`
      ];
    },
    kako: 'Odaberi zadanu brzinu i pritisni „Skok zadane brzine”. Graf prikazuje zadanu (crtkano) i stvarnu brzinu te izlaz regulatora u. Uključi opterećenje: brzina najprije padne, a integralni dio podigne izlaz dok se pogreška ne poništi. Povećaj Ki — odziv postaje brži, ali se pojavi nadvišenje i titranje. Pri velikoj brzini izlaz dođe do granice ±255 i dalje ne može pomoći.',
    napomena: 'Model motora je pojednostavljen: pravac n–M motora 24 V i vremenska konstanta 42 ms koja uključuje dio mase robota (pretpostavka). Pogreška e računa se u 1/min motora (jedinica u firmveru nije objavljena). Mjerenje brzine smatra se točnim; pri 1 kHz jedan inkrement u 1 ms odgovara 30 1/min, pa se u stvarnosti brzina filtrira. Prikaz je usporen 4 puta.'
  },
  irSenzor: {
    naslov: 'Infracrveni senzori udaljenosti',
    engl: 'IR distance sensor (triangulation)',
    get uvod() {
      return [
        `U donjem dijelu šasije je ${D.ir.broj} senzora ${D.ir.tip}, razmaknutih ${D.ir.razmak}°. Svaki ima IR diodu koja šalje uski snop i prijemnik s lećom i položajno osjetljivim detektorom (PSD). Odbijeni snop pada na PSD na mjesto koje ovisi o kutu povratka — to je triangulacija: što je predmet bliže, to je točka dalje od osi leće.`,
        `Izlaz je analogni napon, nelinearan: približno obrnuto razmjeran udaljenosti, korisno područje oko ${hr(D.ir.dMin * 100, 0)}–${hr(D.ir.dMax * 100, 0)} cm. Ispod oko 4 cm napon ponovno pada, pa vrlo blizak predmet daje isti napon kao udaljeni — mrtva zona. Snopovi su uski, pa tanak predmet između dvaju snopova senzori ne vide.`
      ];
    },
    kako: 'Pomiči predmet klizačem i prati put odbijene zrake do PSD-a i radnu točku na krivulji napona. Spusti predmet ispod 4 cm: crtkana crta pokazuje udaljenost koju bi robot iz istog napona pogrešno izračunao. U donjem pogledu odozgo pomiči nogu stola ili zid oko robota i gledaj koji ga senzori vide.',
    napomena: 'Krivulja je približna: koristi uobičajenu aproksimaciju d ≈ 12,08 · U^−1,058 cm za ovaj tip senzora, a oblik ispod 4 cm samo je načelan — nije podatak iz priručnika. Položaj prvog senzora (0°, naprijed) je pretpostavka. Kut snopa prikazan je kao crta.'
  },
  odbojnik: {
    naslov: 'Odbojnik: sigurnosni rub',
    engl: 'Bumper, safety edge',
    get uvod() {
      return [
        `Oko donjeg ruba šasije je sigurnosni rub ${D.odbojnik}: plastični profil sa sklopnom komorom u kojoj su dvije vodljive površine razdvojene zračnim rasporom. Pritisak na profil sabije komoru, površine se dodirnu i strujni krug se zatvori — rub reagira na dodir po cijeloj duljini.`,
        'Rub radi na načelu mirne struje: kroz krug u ispravnom stanju stalno teče struja, a elektronika nadzire njezinu vrijednost. I pritisak i prekid kabela mijenjaju struju, pa i kvar vodi u sigurno stanje — robot staje. Aktivan odbojnik prekida program i kretanje; to je zadano uključeno, a isključuje se samo u web sučelju. REST daje stanje kao /data/bumper.'
      ];
    },
    kako: 'Pritisni „Vozi prema zidu”: kad profil dodirne zid, komora se sabije, struja kruga se promijeni i robot staje. „Pritisni rukom” simulira dodir bez vožnje. Uključi „Prekid kabela”: struja padne na nulu i robot se ne može pokrenuti. Isključi zaustavljanje u web sučelju i ponovi vožnju — robot gura zid dok ga zid ne zaustavi.',
    napomena: 'Presjek profila je načelan. Završni otpornik na kraju ruba i iznosi struja su naša pretpostavka (uobičajena izvedba za nadzor mirne struje); stvarne vrijednosti nisu objavljene. Put sabijanja prije uklopa i zaustavni put su ilustracija.'
  },
  ziroskopOdometrija: {
    naslov: 'Odometrija i žiroskop',
    engl: 'Wheel odometry with gyroscope correction',
    get uvod() {
      return [
        'Odometrija računa položaj robota iz brzina kotača: direktnom kinematikom dobije vx, vy i ω, zakrene (vx, vy) za trenutni kut φ i zbraja korak po korak. Svaka mala pogreška se pritom nakuplja, a najgora je pogreška kuta: krivo procijenjen smjer pretvara svaki sljedeći metar puta u bočni pomak.',
        `Kotači na glatkom podu proklizavaju, pri udaru robot se zakrene bez okretanja kotača, a ni promjer kotača ni rb nisu savršeno poznati. Zato Robotino kut uzima iz žiroskopa: R4 ima ${D.ziro.R4} u upravljačkoj jedinici i operacijski sustav sam ispravlja odometriju, a R3 ${D.ziro.R3} na I/O ploči (kompenzacija drifta nakon 500 ms mirovanja, skala ±2 %).`
      ];
    },
    kako: 'Odaberi putanju i pokreni. Crna crta je stvarni put, crvena procjena samo iz enkodera, a tirkizna procjena iz enkodera i žiroskopa. Povećaj proklizavanje kotača i pritisni „Udarac”: robot se naglo zakrene, enkoderi to ne vide, a žiroskop vidi. Drift žiroskopa pokazuje da ni žiroskop nije savršen — zato se dugotrajna pogreška ispravlja lokalizacijom (npr. laserom i kartom).',
    napomena: 'Proklizavanje je modelirano kao mala slučajna pogreška brzine svakog kotača, a udarac kao nagli zakret od 15°. Iznosi pogrešaka i drifta su ilustracija; stvarni ovise o podu, teretu i senzoru. Translacijsko proklizavanje i dalje kvari obje procjene. Vrijeme je ubrzano.'
  },
  optickiSenzori: {
    naslov: 'Optički senzori: slijeđenje crte',
    engl: 'Reflective optical sensors, line following',
    get uvod() {
      return [
        `Na dnu robota su dva refleksna senzora ${D.opticki} sa svjetlovodima. Pojačalo šalje vidljivu crvenu svjetlost kroz svjetlovod prema podu i mjeri koliko se vrati drugim svjetlovodom. Svijetla podloga vraća puno svjetla, tamna crta malo.`,
        'Izlaz je digitalan (prekoračen prag ili ne), pa senzor razlikuje podlogu od oznake, ali ne i postupne razlike. S dva senzora lijevo i desno od crte dobije se jednostavna logika slijeđenja: dok obje strane vide podlogu, vozi ravno; kad crtu vidi lijevi senzor, skreni lijevo; kad desni, desno; kad oba, to je poprečna oznaka.'
      ];
    },
    kako: 'Pokreni vožnju i promatraj kako se robot ljulja oko crte: svako skretanje počinje kad jedan senzor naiđe na crtu. Redak tablice istaknut je prema trenutnom stanju. Smanji razmak senzora ispod širine crte — oba stalno vide crtu i robot stane. U ručnom načinu sam uključi senzore i gledaj koju naredbu logika daje.',
    napomena: 'Položaj senzora (12 cm ispred središta), širina crte (19 mm) i brzina skretanja su pretpostavke. Logika 1 = vidi crtu može se u pojačalu obrnuti (R3: DI1 NO, DI2 NC). Ovdje je prikazana najjednostavnija dvopoložajna regulacija; s kamerom se crta prati glađe.'
  },
  laserSkener: {
    naslov: 'Laserski skener',
    engl: 'Laser scanner, LiDAR',
    get uvod() {
      return [
        `Laserski skener šalje kratki laserski snop na zrcalo koje se vrti i mjeri udaljenost do prve prepreke u svakom smjeru, iz odbijene svjetlosti. ${D.hokuyo.tip} pokriva ${D.hokuyo.kut}° s korakom ${hr(D.hokuyo.korak, 3)}° (360°/1024), ${D.hokuyo.f} puta u sekundi, u području ${hr(D.hokuyo.dMin, 2)}–${hr(D.hokuyo.dMax, 1)} m (točnost ±30 mm do 1 m). Napaja se i šalje podatke preko USB-a.`,
        `Jedan sken je niz udaljenosti (REST /data/scan0: angle_min, angle_max, increment, ranges[]). Iz njega robot gradi kartu, lokalizira se i nalazi markere stanice za punjenje. Novije izvedbe mobilnog robota CP-MR koriste sigurnosni skener ${D.nano.tip} (${D.nano.kut}°, odziv najviše ${D.nano.odziv} ms): u njemu su podešena zaštitna i upozoravajuća polja, a izlazi OSSD vode se u sigurnosnu logiku.`
      ];
    },
    kako: 'Pokreni sken: zraka se vrti, a svaka izmjerena točka ostaje na crtežu do sljedećeg prolaza. Rjeđa razlučivost pokazuje pojedine zrake. Prebaci na sigurnosni skener i pomiči čovjeka prema robotu: ulaskom u upozoravajuće polje robot usporava, a u zaštitno OSSD izlazi isključuju pogon.',
    napomena: 'Metoda mjerenja udaljenosti (vrijeme ili fazni pomak odbijene svjetlosti) prikazana je samo načelno. Veličine polja sigurnosnog skenera (0,6 m i 1,2 m ispred robota) i razlučivost njegova prikaza su primjer; za njega su prikazane točke do 3 m (najveće zaštitno polje). Prostorija je izmišljena. Sken je usporen.'
  },
  upravljackaJedinica: {
    naslov: 'Upravljačka jedinica i tok podataka',
    engl: 'Control unit, data flow, command watchdog',
    get uvod() {
      return [
        'Upravljanje ima dvije razine. Ugradbeno računalo COM Express (R4: Intel i5 8. generacije, 8 GB RAM, 64 GB SSD, Ubuntu 18.04) vrti Robotino OS: web sučelje, REST API na portu 80, API2 za C++/Python, Robotino View i ROS. Računalo preko Etherneta šalje zadane brzine motora 32-bitnom mikrokontroleru.',
        `Mikrokontroler radi u stvarnom vremenu: regulira brzine motora (PI, 1 kHz), daje PWM za H-mostove, broji enkodere, čita IR senzore, odbojnik i ulaze/izlaze. Naredba /data/omnidrive [vx, vy, ω] mora stizati najmanje svakih ${D.rest} ms (API2 preporučuje oko ${D.api2} ms) — ako prestane, robot staje. Tako prekid WLAN-a ili zastoj programa ne ostavljaju robota da vozi naslijepo.`
      ];
    },
    kako: 'Uključi slanje naredbi i mijenjaj razmak između naredbi. Do 200 ms robot vozi jednoliko; s većim razmakom nadzor istekne između dviju naredbi i robot trza (staje pa kreće). „Prekini WLAN” simulira gubitak veze: nakon 200 ms robot staje. Klikni blok sheme za opis.',
    napomena: 'Shema je načelna. Na kojoj razini (operacijski sustav ili mikrokontroler) je izveden nadzor naredbi, izvor ne navodi. R3 ima drugo računalo (Ubuntu 12.04) i mikrokontroler NXP LPC2378 s FPGA-om. Prikaz je usporen 5 puta.'
  },
  napajanje: {
    naslov: 'Napajanje i stanica za punjenje',
    engl: 'Power supply, batteries, charging station',
    get uvod() {
      return [
        `Robotino 4 nosi 1 do ${D.bat.R4.max} Festool Li-ion paketa ${D.bat.R4.U} V / ${hr(D.bat.R4.C, 1)} Ah spojenih paralelno: više paketa daje veći kapacitet uz isti napon, a dva se mogu mijenjati tijekom rada. Robotino 3 ima dvije olovne (AGM) baterije ${D.bat.R3.U} V / ${hr(D.bat.R3.C, 1)} Ah spojene serijski na 24 V.`,
        `Energija baterije je E = U · C. Vrijeme rada je približno E / P, gdje je P srednja snaga robota — za mobilni robot CP-MR navodi se oko ${D.Psr} W. Na stanici za punjenje (najviše ${D.Pstanica} W, 6-polni kontakt) robot radi na mrežnom napajanju i ne prazni baterije, a ostatak snage puni baterije.`
      ];
    },
    kako: 'Odaberi generaciju i broj paketa te srednju snagu: račun vremena rada mijenja se uživo i uspoređuje s podacima proizvođača. Pokreni ubrzani prikaz: baterije se prazne. Pošalji robota na stanicu — tok energije se okrene, potrošači se napajaju iz mreže, a baterije se pune.',
    napomena: 'Račun je teorijski: bez gubitaka, starenja i ograničenja dubine pražnjenja. Vrijeme punjenja na stanici je donja granica iz 240 W umanjenih za potrošnju; stvarnu struju punjenja izvori ne navode. Paketi R4 mogu se puniti i izvan robota (Festool punjač, manje od 1 h po paketu). Vrijeme je ubrzano.'
  },
  sigurnosniKrug: {
    naslov: 'Sigurnosni krug: nužni stop i reset',
    engl: 'Safety circuit, emergency stop, safety relay',
    get uvod() {
      return [
        'Na mobilnom robotu CP-MR gljiva za nužni stop (SF1) ima dva kontakta koji vode u dva neovisna kanala sigurnosnog releja SICK (KF3, ulazi I1 i I2). Kad se gljiva pritisne, oba kanala se otvore i relej isključi izlaze — svi aktuatori ostaju bez energije. Relej uspoređuje kanale: ako se ne slažu, to je kvar.',
        'Povratna veza EDM javlja releju da su izvršni elementi stvarno otpali. Nema automatskog ponovnog pokretanja: otpuštena gljiva ne pokreće ništa. Treba pritisnuti plavo tipkalo Reset (SF3) — njegova lampica se mora ugasiti — i zatim Start (SF2). Izlazi OSSD sigurnosnog laserskog skenera također vode u sigurnosnu logiku.'
      ];
    },
    kako: 'Pritisni gljivu i prati stanje kanala, releja, pogona i signalnog stupa. Otpusti gljivu: robot i dalje stoji, a lampica Reset svijetli. Pritisni Reset pa Start. Uključi kvar kanala ili zavaren kontakt izvršnog elementa: relej to otkrije i ne dopusti reset. „Prepreka u zaštitnom polju” isključi pogon preko OSSD-a.',
    napomena: 'Shema je načelna i ne prikazuje stvarno ožičenje releja. Izvršni elementi (sklopnici ili omogućenje pogona) i ponašanje nakon što prepreka napusti zaštitno polje (ovdje automatski nastavak) su pretpostavka — ovise o konfiguraciji skenera i sigurnosne logike.'
  },
  signalniStup: {
    naslov: 'Signalni stup',
    engl: 'Signal tower, stack light',
    uvod: [
      'Mobilni robot CP-MR na vrhu nosi signalni stup Werma s crvenim, narančastim i zelenim segmentom. Svaka boja ima dva značenja: jedno kad svijetli stalno, drugo kad treperi — šest stanja koja se vide izdaleka, bez zaslona.',
      'Crvena znači problem koji traži čovjeka (greška ili izgubljen položaj na karti), narančasta da je robot zaustavljen zbog sigurnosti (prepreka u zaštitnom polju lasera ili nužni stop), a zelena normalan rad (spreman ili zauzet nalogom).'
    ],
    kako: 'Klikni polje u tablici ili gumb stanja: stup zasvijetli, a crtež pokazuje tipičnu situaciju. U načinu „Provjeri se” stup prikaže slučajno stanje, a ti odaberi značenje.',
    napomena: 'Frekvencija treperenja (1 Hz) je pretpostavka. Crteži situacija su ilustracija. Značenja boja su iz priručnika CP-MR; drugi programi mogu stup koristiti drukčije.'
  },
  pristajanje: {
    naslov: 'Pristajanje na stanicu za punjenje',
    engl: 'Docking to the charging station',
    get uvod() {
      return [
        `Stanica za punjenje (${hr(D.stanica.sirina * 1000, 0)} × 212 × 152 mm, najviše ${D.Pstanica} W) ima 6-polni kontakt, reflektorske markere za laserski skener i osvijetljeni 2D marker za kameru. Robot pristaje sam: laserom, kamerom ili optičkim senzorima, a metode se mogu kombinirati.`,
        'Laserom se markeri vide kao točke jakog odraza. Iz lijevog i desnog markera robot izračuna položaj stanice, njezinu normalu i širinu. Pristajanje ide u tri koraka: zakret, bočna vožnja po y i vožnja po x dok udaljenost ne padne ispod d. Kad se kontakti spoje, vanjsko napajanje je prisutno (get_extpower = 1) i postupak završava.'
      ];
    },
    kako: 'Odaberi početni položaj i pokreni. Korak 1: robot se zakrene dok mu os x nije usporedna s normalom stanice. Korak 2: vozi bočno po y dok stanica nije točno ispred (y = 0). Korak 3: vozi po x do kontakta. Brojevi pokazuju položaj stanice u sustavu robota, kako ga daje skener. Prebaci na kameru: marker se vidi u slici, a postupak je isti.',
    napomena: 'Izvor [OR-DOCK] predlaže tri koraka (zakret, vožnja po y, vožnja po x), ali ne definira osi; prikazano je geometrijski dosljedno tumačenje za holonomski robot. Razmak markera (0,6 m), vidno polje kamere (60°), brzine i udaljenost d su pretpostavke.'
  },
  predajaNosaca: {
    naslov: 'Predaja nosača izratka stanici',
    engl: 'Workpiece carrier transfer, optical handshake',
    uvod: [
      'Mobilni robot CP-MR-C prevozi nosače izradaka između stanica. Na prihvatu ima dvije trake s preusmjerivačem: traka uvuče nosač, preusmjeri ga na drugu traku i izdaje ga u ispravnom položaju.',
      'Pred stanicom se robot fino postavi trima IR senzorima udaljenosti BG4–BG6 (lijevo, sredina, desno). S postajom se dogovara optičkim „handshakeom” od jednog bita: odašiljač BG3 i prijemnik BG2 sa svjetlovodima. Svjetlovodni senzor BG1 javlja je li nosač na prihvatu.'
    ],
    kako: 'Odaberi smjer (robot prima ili predaje nosač) i pokreni slijed ili ga prolazi korak po korak. Gore je pogled odozgo, dolje slijedni dijagram poruka robot–stanica. Uključi kvar „Nosač ne stiže”: BG1 ne javi nosač u zadanom vremenu i robot javlja grešku (crvena lampica).',
    napomena: 'Točan protokol handshakea, vremena i uloga srednjeg senzora BG5 nisu objavljeni — prikazan je načelni slijed (pojednostavljenje). Raspored senzora i mjere su ilustracija.'
  }
};

/* =========================================================== osnovni alati */
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
  return S('text', { x, y, class: kl || 'tro-l', 'text-anchor': anchor || null, tekst: txt }, g);
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
  S('rect', { x, y, width: w, height: h, class: 'tro-graf' }, g);
  const X = v => x + (v - o.x0) / (o.x1 - o.x0) * w;
  const Y = v => y + h - (v - o.y0) / (o.y1 - o.y0) * h;
  for (const v of o.yt || []) {
    const yy = Y(v);
    S('line', { x1: x, y1: f1(yy), x2: x + w, y2: f1(yy), class: v === 0 && o.y0 < 0 ? 'tro-mreza0' : 'tro-mreza' }, g);
    if (o.ylab !== false) T(g, x - 6, yy + 5, (o.yf || String)(v), 'tro-ls', 'end');
  }
  for (const v of o.xt || []) {
    const xx = X(v);
    S('line', { x1: f1(xx), y1: y, x2: f1(xx), y2: y + h, class: 'tro-mreza' }, g);
    if (o.xlab !== false) T(g, xx, y + h + 18, (o.xf || String)(v), 'tro-ls', 'middle');
  }
  if (o.naslov) T(g, x, y - 9, o.naslov, 'tro-ls');
  return { X, Y, x, y, w, h };
}
// SVG element koji se ponaša kao gumb (klik, Enter, razmaknica)
function klikabilno(ctx, el, oznaka, fn) {
  el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', oznaka);
  el.classList.add('tro-klik');
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
  const uid = 'tro' + (++brojac);
  let nk = 0;
  const sek = H('section', { class: 'tro', 'data-tema': id, 'aria-label': T0.naslov });
  const naslov = H('h3', { class: 'tro-naslov' }, T0.naslov + ' ', H('span', { class: 'tro-engl', tekst: '(' + T0.engl + ')' }));
  const uvod = H('div', { class: 'tro-uvod' });
  for (const p of T0.uvod) uvod.append(H('p', { tekst: p }));
  const scena = H('div', { class: 'tro-scena' });
  const upr = H('div', { class: 'tro-upr', role: 'group', 'aria-label': 'Upravljanje animacijom' });
  const ocitP = H('div', { class: 'tro-ocit' });
  const stanjeP = H('p', { class: 'tro-stanje', 'aria-live': 'polite' });
  const kako = H('div', { class: 'tro-kako' }, H('h4', { tekst: 'Kako radi' }), H('p', { tekst: T0.kako }));
  if (T0.napomena) kako.append(H('p', { class: 'tro-pretp' }, H('b', { tekst: 'Pojednostavljenja: ' }), T0.napomena));
  const desno = H('div', { class: 'tro-desno' }, upr, stanjeP, ocitP, kako);
  sek.append(naslov, uvod, H('div', { class: 'tro-tijelo' }, scena, desno));
  el.replaceChildren(sek);

  const ui = {
    uid, sek, scena, upr, ocitP, desno,
    svg(w, h, opis, kl) {
      const s = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opis, class: 'tro-svg' + (kl ? ' ' + kl : ''), focusable: 'false' });
      const defs = S('defs', {}, s);
      const p = S('pattern', { id: uid + '-sr' + (++nk), width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      S('rect', { width: 7, height: 7, class: 'tro-srafura-p' }, p);
      S('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'tro-srafura-c' }, p);
      s.defs = defs; s.srafura = `url(#${p.id})`;
      s.clip = (x, y, w2, h2) => { const c = S('clipPath', { id: uid + '-cl' + (++nk) }, defs); S('rect', { x, y, width: w2, height: h2 }, c); return `url(#${c.id})`; };
      scena.append(s);
      return s;
    },
    red(kl, u) { const r = H('div', { class: 'tro-red' + (kl ? ' ' + kl : '') }); (u || upr).append(r); return r; },
    skupina(u) { const g = H('div', { class: 'tro-skupina' }); (u || upr).append(g); return g; },
    gumb(tekst, fn, o = {}) {
      const b = H('button', {
        type: 'button', class: 'gumb' + (o.tanki ? ' tanki' : '') + ' tro-g' + (o.kl ? ' ' + o.kl : ''),
        'aria-label': o.aria || null, 'aria-pressed': o.pritisak == null ? null : String(!!o.pritisak)
      });
      b.textContent = tekst;
      if (fn) ctx.on(b, 'click', e => fn(e, b));
      let cilj = o.u;
      if (!cilj) { cilj = upr.lastElementChild; if (!cilj || !cilj.classList.contains('tro-red')) cilj = ui.red(); }
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
      const w = H('div', { class: 'tro-seg' });
      const lab = H('span', { class: 'tro-seg-o', tekst: oznaka, id: uid + '-s' + (++nk) });
      const box = H('div', { class: 'tro-seg-b', role: 'group', 'aria-labelledby': lab.id });
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
      const w = H('div', { class: 'tro-kl' });
      const l = H('label', { for: kid, tekst: oznaka });
      const o = H('output', { for: kid });
      const i = H('input', { type: 'range', id: kid, min, max, step: korak, value: vr });
      const upd = () => { o.textContent = fmt(+i.value); };
      ctx.on(i, 'input', () => { upd(); fn(+i.value); });
      upd();
      w.append(H('div', { class: 'tro-kl-g' }, l, o), i);
      (u || upr).append(w);
      w.ulaz = i; w.osvjezi = upd;
      w.postavi = v => { i.value = v; upd(); };
      return w;
    },
    kvacica(oznaka, vr, fn, u) {
      const kid = uid + '-c' + (++nk);
      const i = H('input', { type: 'checkbox', id: kid });
      i.checked = !!vr;
      const w = H('label', { class: 'tro-kv', for: kid }, i, H('span', { tekst: oznaka }));
      ctx.on(i, 'change', () => fn(i.checked));
      (u || upr).append(w);
      w.ulaz = i;
      w.postavi = v => { i.checked = !!v; };
      return w;
    },
    ocit(redovi, u) {
      const dl = H('dl', { class: 'tro-oc' });
      const set = {};
      for (const [k, t] of redovi) {
        const dd = H('dd', { tekst: '—' });
        const dt = H('dt', { tekst: t });
        dl.append(H('div', {}, dt, dd));
        set[k] = (v, kl) => { if (dd.textContent !== v) dd.textContent = v; const c = kl ? 'tro-' + kl : ''; if (dd.className !== c) dd.className = c; };
        set[k].naziv = t2 => { if (dt.textContent !== t2) dt.textContent = t2; };
      }
      (u || ocitP).append(dl);
      return set;
    },
    // okvir s formulama (redovi se osvježavaju uživo)
    formula(naslov, n, u) {
      const box = H('div', { class: 'tro-formula' });
      if (naslov) box.append(H('h4', { tekst: naslov }));
      const red = [];
      for (let k = 0; k < n; k++) { const p = H('p', {}); box.append(p); red.push(p); }
      (u || ocitP).append(box);
      box.set = (k, txt) => { if (red[k] && red[k].textContent !== txt) red[k].textContent = txt; if (red[k]) red[k].style.display = txt ? '' : 'none'; };
      return box;
    },
    sitno(txt, u) { const p = H('p', { class: 'tro-sitno', tekst: txt }); (u || ocitP).append(p); return p; },
    stanje(txt, vrsta) {
      if (stanjeP.textContent !== txt) stanjeP.textContent = txt;
      const c = 'tro-stanje' + (vrsta ? ' tro-' + vrsta : '');
      if (stanjeP.className !== c) stanjeP.className = c;
    }
  };
  return ui;
}

/* ------------------------------------------------------- zajednički crteži */
// Robotino odozgo: g, središte, mjerilo px/m, kut φ (rad, 0 = os x robota prema gore na zaslonu)
// vraća { g, postavi(x,y,phi), kotaci:[{g,traka}] }
function robotOdozgo(rod, s, o = {}) {
  const g = S('g', { class: 'tro-robot' }, rod);
  const r = D.promjer / 2 * s;
  S('circle', { cx: 0, cy: 0, r, class: 'tro-sasija' }, g);
  if (o.odbojnik !== false) S('circle', { cx: 0, cy: 0, r: r - 2, class: 'tro-odbojnik-o' }, g);
  S('circle', { cx: 0, cy: 0, r: r * 0.62, class: 'tro-kupola' }, g);
  const kot = [];
  if (o.kotaci !== false) {
    for (const th of D.kutovi) {
      const a = th * RAD, kx = -Math.sin(a) * D.rb * s, ky = -Math.cos(a) * D.rb * s;   // zaslon: x = −y_r, y = −x_r
      // lokalna os y kotača = smjer vožnje (−sin θ, cos θ) robota = (−cos θ, sin θ) na zaslonu → rotate(90° − θ)
      const kg = S('g', { transform: `translate(${f1(kx)} ${f1(ky)}) rotate(${f1(90 - th)})` }, g);
      const L = D.rw * 2 * s, W = Math.max(5, 0.042 * s);
      S('rect', { x: -W / 2, y: -L / 2, width: W, height: L, rx: 2, class: 'tro-kotac-o' }, kg);
      kot.push({ g: kg, x: kx, y: ky });
    }
  }
  // smjer naprijed
  S('path', { d: `M0,${f1(-r + 3)} L${f1(-r * 0.12)},${f1(-r * 0.78)} L${f1(r * 0.12)},${f1(-r * 0.78)}Z`, class: 'tro-naprijed' }, g);
  g.postavi = (x, y, phi) => g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(-phi / RAD)})`);
  g.kotaci = kot;
  g.r = r;
  return g;
}

/* =========================================================== 1. svesmjerni kotač */
function tOmniKotac(ui, ctx) {
  const USP = 4;
  const st = { radi: true, al: 30, v: 0.3, Mm: 4, prikaz: 'brz', fi: 0, px: 0, py: 0, val: 0 };
  const svg = ui.svg(600, 400, 'Svesmjerni kotač: lijevo pogled duž osi kotača s dva reda valjaka, desno pogled odozgo na kotač i pod s rastavom brzine na pogonsku i bočnu komponentu');
  // ---------- lijevo: pogled duž osi
  S('rect', { x: 6, y: 42, width: 284, height: 346, rx: 10, class: 'tro-ploca' }, svg);
  S('rect', { x: 308, y: 42, width: 286, height: 346, rx: 10, class: 'tro-ploca' }, svg);
  T(svg, 148, 28, 'pogled duž osi kotača', 'tro-l', 'middle');
  T(svg, 451, 28, 'pogled odozgo', 'tro-l', 'middle');
  const LX = 148, LY = 196, R = 112;
  const gKot = S('g', {}, svg);
  const valjci = [];
  for (const red of ['b', 'a']) {
    for (let k = 0; k < 8; k++) {
      const a0 = (k * 45 + (red === 'b' ? 22.5 : 0));
      const g = S('g', { 'data-a': a0 }, gKot);
      const gg = S('g', { transform: `rotate(${a0}) translate(0 ${-(R - 12)})` }, g);
      S('ellipse', { cx: 0, cy: 0, rx: 33, ry: 12, class: red === 'a' ? 'tro-valjak' : 'tro-valjak tro-valjak-b' }, gg);
      S('line', { x1: -36, y1: 0, x2: 36, y2: 0, class: 'tro-zatik-v' }, gg);
      valjci.push({ g, el: gg.firstChild, a0, red });
    }
  }
  S('circle', { cx: 0, cy: 0, r: R - 28, class: 'tro-glavina' }, gKot);
  for (let k = 0; k < 6; k++) { const [x, y] = pol(0, 0, 50, k * 60 * RAD); S('circle', { cx: f1(x), cy: f1(y), r: 9, class: 'tro-rupa' }, gKot); }
  S('circle', { cx: 0, cy: 0, r: 16, class: 'tro-tamno' }, gKot);
  S('line', { x1: 0, y1: -16, x2: 0, y2: -78, stroke: B.crv, 'stroke-width': 5, 'stroke-linecap': 'round' }, gKot);
  S('line', { x1: 18, y1: LY + R, x2: 278, y2: LY + R, class: 'tro-pod' }, svg);
  T(svg, 22, LY + R + 24, 'pod', 'tro-ls');
  T(svg, 278, LY + R + 24, 'red A — puno', 'tro-ls', 'end');
  T(svg, 278, LY + R + 46, 'red B — iza, crtkano', 'tro-ls', 'end');
  T(svg, 22, LY + R + 46, '⊙ os kotača', 'tro-ls');
  const sSmjer = strel(svg, LX - 60, LY - R - 22, LX + 60, LY - R - 22, { boja: 'var(--teal)', w: 3 });
  const tSmjerL = T(svg, LX, LY - R - 32, '', 'tro-ls', 'middle');
  // ---------- desno: odozgo
  const RX = 451, RY = 214, SR = 1.5;           // px/mm
  const clP = svg.clip(309, 43, 284, 344);
  const gPod = S('g', { 'clip-path': clP }, svg);
  const linV = [], linH = [];
  for (let k = 0; k < 12; k++) { linV.push(S('line', { y1: 43, y2: 387, class: 'tro-mreza-pod' }, gPod)); linH.push(S('line', { x1: 309, x2: 593, class: 'tro-mreza-pod' }, gPod)); }
  const gTop = S('g', { 'clip-path': clP }, svg);
  S('line', { x1: RX - 120, y1: RY, x2: RX + 120, y2: RY, class: 'tro-os-crta' }, gTop);
  T(gTop, RX + 118, RY - 8, 'os kotača', 'tro-ls', 'end');
  const Rt = D.rw * 1000 * SR, Wt = 70;
  S('rect', { x: RX - Wt / 2, y: RY - Rt, width: Wt, height: 2 * Rt, rx: 8, class: 'tro-obris-kotaca' }, gTop);
  const topV = [];
  for (let k = 0; k < 16; k++) {
    const e = S('ellipse', { class: 'tro-valjak' }, gTop);
    const pr = S('line', { class: 'tro-pruga-v' }, gTop);
    topV.push({ e, pr, red: k % 2 ? 'b' : 'a', a0: (k >> 1) * 45 + (k % 2 ? 22.5 : 0) });
  }
  const dodir = S('ellipse', { rx: 12, ry: 24, class: 'tro-valjak-dodir' }, gTop);
  const dodirPr = S('line', { class: 'tro-pruga-d' }, gTop);
  const sV = strel(svg, RX, RY, RX, RY - 80, { boja: B.zut, w: 5, gl: 16, kl: 'tro-str-obrub' });
  const sP = strel(svg, RX, RY, RX, RY - 60, { boja: 'var(--teal)', w: 4, gl: 14 });
  const sB = strel(svg, RX, RY, RX + 40, RY, { boja: B.pl, w: 4, gl: 14 });
  const tV = T(svg, 0, 0, '', 'tro-lb'), tP = T(svg, 0, 0, '', 'tro-l'), tB = T(svg, 0, 0, '', 'tro-l');
  const tNula = T(svg, RX + 10, RY + 34, '', 'tro-ls');
  T(svg, 318, 378, 'pod se giba ispod kotača', 'tro-ls');

  function osvjezi() {
    const al = st.al * RAD, v = st.v;
    const vp = v * Math.cos(al), vb = v * Math.sin(al);
    // lijevo
    gKot.setAttribute('transform', `translate(${LX} ${LY}) rotate(${(st.fi / RAD).toFixed(2)})`);
    let naj = null, dmin = 1e9;
    for (const r of valjci) {
      const a = ((r.a0 + st.fi / RAD) % 360 + 360) % 360, d = Math.abs(a - 180);
      if (d < dmin) { dmin = d; naj = r; }
    }
    for (const r of valjci) r.el.classList.toggle('tro-valjak-akt', r === naj);
    sSmjer.style.display = Math.abs(vp) > 0.005 ? '' : 'none';
    if (vp >= 0) sSmjer.set(LX - 60, LY - R - 22, LX + 60, LY - R - 22); else sSmjer.set(LX + 60, LY - R - 22, LX - 60, LY - R - 22);
    tSmjerL.textContent = Math.abs(vp) > 0.005 ? 'smjer vrtnje (vožnje)' : 'kotač se ne vrti';
    // desno: pod
    const sp = 30;
    const ox = ((st.px % sp) + sp) % sp, oy = ((st.py % sp) + sp) % sp;
    linV.forEach((l, k) => { const x = 309 + ox + k * sp - sp; l.setAttribute('x1', f1(x)); l.setAttribute('x2', f1(x)); });
    linH.forEach((l, k) => { const y = 43 + oy + k * sp - sp; l.setAttribute('y1', f1(y)); l.setAttribute('y2', f1(y)); });
    // valjci odozgo (projekcija kuta ψ: 0 = vrh, raste prema naprijed)
    const sv = ((st.val % 24) + 24) % 24;
    for (const r of topV) {
      const psi = (r.a0 * RAD + st.fi), c = Math.cos(psi);
      const x = RX + (r.red === 'a' ? -17 : 17);
      if (c <= 0.05) { r.e.style.display = 'none'; r.pr.style.display = 'none'; continue; }
      const y = RY - Rt * Math.sin(psi), ry = 24 * c;
      r.e.style.display = ''; r.pr.style.display = '';
      postavi(r.e, { cx: x, cy: y, rx: 12, ry });
      const px = x - 12 + sv;
      postavi(r.pr, { x1: px, x2: px, y1: y - ry * 0.7, y2: y + ry * 0.7 });
    }
    // valjak u dodiru (ispod kotača)
    const xd = RX + (naj && naj.red === 'b' ? 17 : -17);
    postavi(dodir, { cx: xd, cy: RY });
    const pd = xd - 12 + ((((-st.val) % 24) + 24) % 24);
    postavi(dodirPr, { x1: pd, x2: pd, y1: RY - 16, y2: RY + 16 });
    // strelice
    const kS = 240;
    if (st.prikaz === 'brz') {
      const ex = RX + vb * kS, ey = RY - vp * kS;
      sV.style.display = ''; sV.set(RX, RY, RX + vb * kS, RY - vp * kS);
      sP.set(RX, RY, RX, ey); sB.set(RX, RY, ex, RY);
      postavi(tV, { x: ex + (vb >= 0 ? 8 : -8), y: ey - 8 }); tV.setAttribute('text-anchor', vb >= 0 ? 'start' : 'end'); tV.textContent = 'v';
      postavi(tP, { x: RX - 44, y: (RY + ey) / 2 + 6 }); tP.setAttribute('text-anchor', 'end'); tP.textContent = Math.abs(vp) > 0.01 ? 'v·cos α' : '';
      postavi(tB, { x: ex, y: RY + 26 }); tB.setAttribute('text-anchor', 'middle'); tB.textContent = Math.abs(vb) > 0.01 ? 'v·sin α' : '';
      tNula.textContent = '';
    } else {
      const F = st.Mm / 100 * D.gear * D.reduktor.eta / D.rw;
      const L = F / 25 * 130;
      sV.style.display = 'none';
      sP.set(RX, RY, RX, RY - L); sB.set(RX, RY, RX, RY);
      postavi(tP, { x: RX - 44, y: RY - L / 2 + 6 }); tP.setAttribute('text-anchor', 'end'); tP.textContent = 'F_pogon';
      tV.textContent = ''; tB.textContent = '';
      tNula.textContent = 'bočna sila ≈ 0';
    }
    const nk = vp * 60 / (2 * Math.PI * D.rw);
    o.vp(hr(vp, 3) + ' m/s'); o.vb(hr(vb, 3) + ' m/s');
    o.nk(hr(nk, 1) + ' 1/min'); o.nm(tis(nk * D.gear) + ' 1/min', Math.abs(nk * D.gear) > D.nMotMax ? 'opas' : '');
    o.F(hr(st.Mm / 100 * D.gear * D.reduktor.eta / D.rw, 1) + ' N');
  }
  function poruka() {
    const a = Math.abs(st.al);
    if (st.prikaz === 'sile') ui.stanje(`Motor daje moment ${hr(st.Mm, 1)} Ncm; kotač na podu djeluje samo u smjeru vrtnje. Bočno valjci popuštaju, pa kotač bočno ne može ni vući ni kočiti — tu silu moraju dati druga dva kotača.`, 'plavo');
    else if (a < 3) ui.stanje('α = 0°: čisto kotrljanje. Valjak u dodiru s podom miruje, kotač se okreće kao obični kotač.', 'ok');
    else if (a > 87) ui.stanje('α = 90°: kotač se ne vrti (n = 0), a pomiče se bočno samo kotrljanjem valjaka. Motor drži kotač, ali gibanju ne smeta.', 'upoz');
    else ui.stanje(`α = ${st.al}°: kotač se vrti brzinom koja odgovara samo komponenti v·cos α, a valjci preuzimaju bočnu komponentu v·sin α.`);
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const al = st.al * RAD, vp = st.v * Math.cos(al), vb = st.v * Math.sin(al), h = dt / USP;
    st.fi += vp / D.rw * h;
    st.px -= vb * 1000 * SR * h; st.py += vp * 1000 * SR * h;
    st.val += vb * 1000 * SR * h * 0.6;
    osvjezi();
    return true;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r).osvjezi();
  ui.klizac('Smjer gibanja α (prema smjeru vrtnje)', -90, 90, 5, st.al, v => hrp(v, 0) + '°', v => { st.al = v; poruka(); osvjezi(); });
  ui.klizac('Brzina dodirne točke v', 0, 0.5, 0.01, st.v, v => hr(v, 2) + ' m/s', v => { st.v = v; osvjezi(); });
  ui.klizac('Moment motora M_m', 0, 5.7, 0.1, st.Mm, v => hr(v, 1) + ' Ncm', v => { st.Mm = v; poruka(); osvjezi(); });
  ui.seg('Prikaz', [['brz', 'Brzine'], ['sile', 'Sile']], 'brz', v => { st.prikaz = v; poruka(); osvjezi(); });
  const o = ui.ocit([['vp', 'Pogonska komponenta v·cos α'], ['vb', 'Bočna komponenta v·sin α (valjci)'], ['nk', 'Brzina kotača'], ['nm', `Brzina motora (× ${D.gear})`], ['F', 'Pogonska sila F = M_m · i · η / rw']]);
  ui.sitno(`Brzina kotača ovisi samo o pogonskoj komponenti: n = v·cos α · 60 / (2π · ${hr(D.rw, 3)} m). Nazivni moment motora ${hr(D.motor.MNaz, 1)} Ncm daje na podu oko ${hr(D.motor.MNaz / 100 * D.gear * D.reduktor.eta / D.rw, 0)} N po kotaču.`);
  poruka(); osvjezi(); ctx.budi();
}

/* =========================================================== 2. kinematika */
function tKinematika(ui, ctx) {
  const k = kK();
  const st = { nacin: 'inv', vx: 0.3, vy: 0, w: 0, mz: [0, 0, 0], m: [0, 0, 0], v: [0, 0, 0], fak: 1, radi: true, x: 1, y: 1.15, phi: 0, trag: [[]], tr: [0, 0, 0] };
  const svg = ui.svg(600, 450, 'Robot odozgo: tri kotača na 60°, 180° i 300°, smjerovi vožnje kotača, brzine motora m1–m3 i rezultantna brzina robota');
  const CX = 300, CY = 228, SC = 620;
  const rr = D.promjer / 2 * SC;
  S('circle', { cx: CX, cy: CY, r: rr, class: 'tro-sasija' }, svg);
  S('circle', { cx: CX, cy: CY, r: rr - 3, class: 'tro-odbojnik-o' }, svg);
  S('circle', { cx: CX, cy: CY, r: D.rb * SC, class: 'tro-vodilja-k' }, svg);
  // osi
  strel(svg, CX, CY, CX, CY - 70, { boja: B.crv, w: 2.5 }); T(svg, CX + 6, CY - 62, 'x', 'tro-lb tro-os-x');
  strel(svg, CX, CY, CX - 70, CY, { boja: B.zel, w: 2.5 }); T(svg, CX - 70, CY - 8, 'y', 'tro-lb tro-os-y');
  const kot = D.kutovi.map((th, i) => {
    const a = th * RAD, x = CX - Math.sin(a) * D.rb * SC, y = CY - Math.cos(a) * D.rb * SC;
    const dx = -Math.cos(a), dy = Math.sin(a);                 // smjer vožnje na zaslonu
    const g = S('g', { transform: `translate(${f1(x)} ${f1(y)}) rotate(${f1(90 - th)})` }, svg);
    const L = D.rw * 2 * SC, W = 26;
    S('rect', { x: -W / 2, y: -L / 2, width: W, height: L, rx: 4, class: 'tro-kotac-o' }, g);
    const pr = [0, 1, 2, 3].map(() => S('line', { x1: -W / 2 + 2, x2: W / 2 - 2, class: 'tro-pruga-k' }, g));
    const gb = S('g', { class: 'tro-broj-k' }, svg); S('circle', { cx: f1(x), cy: f1(y), r: 13 }, gb); T(gb, x, y + 5, String(i + 1), 'tro-ls', 'middle');
    const ox = x - Math.sin(a) * 30, oy = y - Math.cos(a) * 30;     // ishodište strelice: radijalno izvan kotača
    const s = strel(svg, ox, oy, ox, oy, { boja: 'var(--teal)', w: 4, gl: 13 });
    const tx = CX - Math.sin(a) * 0.305 * SC, ty = CY - Math.cos(a) * 0.305 * SC;
    const t = T(svg, f1(tx), f1(ty + 6), '', 'tro-l', 'middle');
    return { x, y, ox, oy, dx, dy, L, pr, s, t, th };
  });
  const sVr = strel(svg, CX, CY, CX, CY, { boja: B.zut, w: 6, gl: 18, kl: 'tro-str-obrub' });
  const pW = S('path', { class: 'tro-luk-w' }, svg);
  const sW = strel(svg, 0, 0, 0, 0, { boja: B.lj, w: 3, gl: 11 });
  const tW = T(svg, CX + 46, CY + 56, '', 'tro-ls');
  T(svg, 12, 24, 'pogled odozgo · prednja strana gore', 'tro-ls');
  const tFak = T(svg, 588, 440, '', 'tro-ls tro-t-opas', 'end');
  // donji prikaz: put
  const svg2 = ui.svg(600, 236, 'Put robota u prostoru (idealna odometrija)', 'tro-svg2');
  const PS = 100, AW = 6, AH = 2.3;
  S('rect', { x: 0, y: 3, width: 600, height: 230, class: 'tro-graf' }, svg2);
  for (let i = 1; i < AW; i++) S('line', { x1: i * PS, y1: 3, x2: i * PS, y2: 233, class: 'tro-mreza' }, svg2);
  for (let j = 1; j < 3; j++) S('line', { x1: 0, y1: 233 - j * PS, x2: 600, y2: 233 - j * PS, class: 'tro-mreza' }, svg2);
  T(svg2, 8, 24, 'put robota (mreža 1 m)', 'tro-ls');
  const gTr = S('g', {}, svg2);
  const rob2 = robotOdozgo(svg2, PS, { kotaci: false });

  function racun() {
    if (st.nacin === 'inv') {
      const mz = D.kutovi.map(th => { const a = th * RAD; return k * (-Math.sin(a) * st.vx + Math.cos(a) * st.vy + D.rb * st.w); });
      const mx = Math.max(...mz.map(Math.abs));
      st.fak = mx > D.nMotMax ? D.nMotMax / mx : 1;
      st.mz = mz; st.m = mz.map(m => m * st.fak); st.v = [st.vx * st.fak, st.vy * st.fak, st.w * st.fak];
    } else {
      const [m1, m2, m3] = st.m;
      st.fak = 1;
      st.v = [(m3 - m1) / (Math.sqrt(3) * k), (m1 + m3 - 2 * m2) / (3 * k), (m1 + m2 + m3) / (3 * k * D.rb)];
    }
  }
  function osvjezi() {
    const [vx, vy, w] = st.v;
    kot.forEach((q, i) => {
      const m = st.m[i], L = m / D.nMotMax * 150;
      q.s.set(q.ox - q.dx * L / 2, q.oy - q.dy * L / 2, q.ox + q.dx * L / 2, q.oy + q.dy * L / 2);
      q.s.boja(m < 0 ? B.crv : 'var(--teal)');
      q.t.textContent = `m${i + 1} = ${tis(m)}`;
      const off = ((st.tr[i] % 18) + 18) % 18;
      q.pr.forEach((l, j) => { const y = -q.L / 2 + 6 + ((j * 18 + off) % (q.L - 12)); l.setAttribute('y1', f1(y)); l.setAttribute('y2', f1(y)); });
    });
    sVr.set(CX, CY, CX - vy * 240, CY - vx * 240);
    if (Math.abs(w) > 0.01) {
      const a0 = -Math.PI / 2, a1 = a0 - w * 1.3;
      pW.setAttribute('d', luk(CX, CY, 46, Math.min(a0, a1), Math.max(a0, a1)));
      const [ex, ey] = pol(CX, CY, 46, a1), sg = w > 0 ? 1 : -1, tx = sg * Math.sin(a1), ty = -sg * Math.cos(a1);
      sW.style.display = ''; sW.set(ex - tx * 12, ey - ty * 12, ex + tx * 3, ey + ty * 3);
      tW.textContent = 'ω ' + (w > 0 ? '(lijevo)' : '(desno)');
    } else { pW.setAttribute('d', ''); sW.style.display = 'none'; tW.textContent = ''; }
    tFak.textContent = st.fak < 0.999 ? `ograničeno na ${tis(D.nMotMax)} 1/min: × ${hr(st.fak, 2)}` : '';
    // put
    rob2.postavi(st.x * PS, 233 - st.y * PS, st.phi - Math.PI / 2);
    while (gTr.childNodes.length < st.trag.length) S('polyline', { class: 'tro-trag' }, gTr);
    while (gTr.childNodes.length > st.trag.length) gTr.removeChild(gTr.lastChild);
    st.trag.forEach((t, j) => gTr.childNodes[j].setAttribute('points', pts(t.map(p => [p[0] * PS, 233 - p[1] * PS]))));
    // brojevi
    const vv = Math.hypot(vx, vy);
    o.vx(hr(vx, 3) + ' m/s'); o.vy(hr(vy, 3) + ' m/s'); o.w(hr(w, 2) + ' rad/s · ' + hr(w / RAD, 0) + ' °/s');
    o.v(hr(vv, 3) + ' m/s');
    o.m(st.m.map(m => tis(m)).join(' · ') + ' 1/min', st.fak < 0.999 ? 'upoz' : '');
    o.n(st.m.map(m => hr(m / D.gear, 1)).join(' · ') + ' 1/min');
    const c = n => hr(n, 2), c3 = n => hr(n, 3);
    if (st.nacin === 'inv') {
      F.set(0, `k = 60·i / (2π·rw) = 60·${D.gear} / (2π·${c3(D.rw)}) = ${tis(k)} (1/min)/(m/s)`);
      F.set(1, `m1 = k·(−0,866·vx + 0,5·vy + rb·ω) = ${tis(k)}·(−0,866·${c(st.vx)} + 0,5·${c(st.vy)} + ${c(D.rb)}·${c(st.w)}) = ${tis(st.mz[0])} 1/min`);
      F.set(2, `m2 = k·(−vy + rb·ω) = ${tis(k)}·(−${c(st.vy)} + ${c(D.rb)}·${c(st.w)}) = ${tis(st.mz[1])} 1/min`);
      F.set(3, `m3 = k·(0,866·vx + 0,5·vy + rb·ω) = ${tis(k)}·(0,866·${c(st.vx)} + 0,5·${c(st.vy)} + ${c(D.rb)}·${c(st.w)}) = ${tis(st.mz[2])} 1/min`);
      F.set(4, st.fak < 0.999 ? `Najveći |m| prelazi ${tis(D.nMotMax)} 1/min → sve brzine × ${hr(st.fak, 3)} (smjer gibanja ostaje isti).` : `Najveći |m| = ${tis(Math.max(...st.mz.map(Math.abs)))} 1/min ≤ ${tis(D.nMotMax)} 1/min.`);
    } else {
      const [m1, m2, m3] = st.m.map(Math.round);
      F.set(0, `k = 60·i / (2π·rw) = ${tis(k)} (1/min)/(m/s)`);
      F.set(1, `vx = (m3 − m1) / (√3·k) = (${tis(m3)} − ${tis(m1)}) / (1,732·${tis(k)}) = ${c3(vx)} m/s`);
      F.set(2, `vy = (m1 + m3 − 2·m2) / (3·k) = (${tis(m1)} + ${tis(m3)} − 2·${tis(m2)}) / (3·${tis(k)}) = ${c3(vy)} m/s`);
      F.set(3, `ω = (m1 + m2 + m3) / (3·k·rb) = (${tis(m1 + m2 + m3)}) / (3·${tis(k)}·${c(D.rb)}) = ${c3(w)} rad/s`);
      F.set(4, '');
    }
  }
  function poruka() {
    const [vx, vy, w] = st.v, m = st.m;
    if (Math.abs(vx) < 1e-3 && Math.abs(vy) < 1e-3 && Math.abs(w) < 1e-3) ui.stanje('Robot miruje: sve tri brzine motora su nula.');
    else if (Math.abs(vy) < 1e-3 && Math.abs(w) < 1e-3) ui.stanje('Čista vožnja po x: kotač 2 stoji okomito na smjer gibanja i miruje (m2 = 0), a kotači 1 i 3 vrte se suprotno, jednako brzo.', 'ok');
    else if (Math.abs(vx) < 1e-3 && Math.abs(vy) < 1e-3) ui.stanje('Okret na mjestu: sva tri motora imaju jednaku brzinu m = k·rb·ω — kotači guraju po obodu kruga polumjera rb.', 'ok');
    else if (Math.abs(vx) < 1e-3 && Math.abs(w) < 1e-3) ui.stanje('Čista bočna vožnja po y: kotač 2 vozi punom brzinom, a kotači 1 i 3 upola, u suprotnom smjeru — zato je bočno najveća brzina manja nego naprijed.', 'ok');
    else ui.stanje(`Kombinirano gibanje: svaki motor zbraja tri doprinosa. Najopterećeniji je motor ${m.map(Math.abs).indexOf(Math.max(...m.map(Math.abs))) + 1}.`);
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const [vx, vy, w] = st.v;
    st.tr = st.tr.map((t, i) => t + st.m[i] / D.nMotMax * 60 * dt);
    st.phi += w * dt;
    let x = st.x + (vx * Math.cos(st.phi) - vy * Math.sin(st.phi)) * dt;
    let y = st.y + (vx * Math.sin(st.phi) + vy * Math.cos(st.phi)) * dt;
    let skok = false;
    if (x > AW) { x -= AW; skok = true; } else if (x < 0) { x += AW; skok = true; }
    if (y > AH) { y -= AH; skok = true; } else if (y < 0) { y += AH; skok = true; }
    st.x = x; st.y = y;
    if (skok) st.trag.push([]);
    const t = st.trag[st.trag.length - 1];
    const z = t[t.length - 1];
    if (!z || Math.hypot(z[0] - x, z[1] - y) > 0.01) t.push([x, y]);
    let n = st.trag.reduce((a, q) => a + q.length, 0);
    while (n > 1600) { st.trag[0].shift(); if (!st.trag[0].length) st.trag.shift(); n--; }
    osvjezi();
    return true;
  });
  // upravljanje
  ui.seg('Smjer računa', [['inv', 'Inverzna: vx, vy, ω → m'], ['dir', 'Direktna: m → vx, vy, ω']], 'inv', v => {
    st.nacin = v; gI.style.display = v === 'inv' ? '' : 'none'; gD.style.display = v === 'dir' ? '' : 'none';
    if (v === 'dir') { st.m = st.m.map(Math.round); kM.forEach((q, i) => q.postavi(Math.round(ogr(st.m[i], -D.nMotMax, D.nMotMax) / 50) * 50)); st.m = kM.map(q => +q.ulaz.value); }
    else { kI[0].postavi(ogr(Math.round(st.v[0] * 100) / 100, -0.5, 0.5)); kI[1].postavi(ogr(Math.round(st.v[1] * 100) / 100, -0.5, 0.5)); kI[2].postavi(ogr(Math.round(st.v[2] * 20) / 20, -2, 2)); st.vx = +kI[0].ulaz.value; st.vy = +kI[1].ulaz.value; st.w = +kI[2].ulaz.value; }
    racun(); poruka(); osvjezi(); ctx.budi();
  });
  const gI = ui.skupina(), gD = ui.skupina();
  const kI = [
    ui.klizac('vx (naprijed)', -0.5, 0.5, 0.01, st.vx, v => hr(v, 2) + ' m/s', v => { st.vx = v; racun(); poruka(); osvjezi(); }, gI),
    ui.klizac('vy (lijevo)', -0.5, 0.5, 0.01, st.vy, v => hr(v, 2) + ' m/s', v => { st.vy = v; racun(); poruka(); osvjezi(); }, gI),
    ui.klizac('ω (suprotno od kazaljke)', -2, 2, 0.05, st.w, v => hr(v, 2) + ' rad/s', v => { st.w = v; racun(); poruka(); osvjezi(); }, gI)
  ];
  const kM = [0, 1, 2].map(i => ui.klizac(`m${i + 1} (motor ${i + 1})`, -D.nMotMax, D.nMotMax, 50, 0, v => tis(v) + ' 1/min', v => { st.m[i] = v; racun(); poruka(); osvjezi(); }, gD));
  gD.style.display = 'none';
  const r1 = ui.red();
  const pre = (vx, vy, w) => {
    st.vx = vx; st.vy = vy; st.w = w;
    if (st.nacin === 'inv') { kI[0].postavi(vx); kI[1].postavi(vy); kI[2].postavi(w); racun(); }
    else { st.m = D.kutovi.map(th => { const a = th * RAD; return Math.round(k * (-Math.sin(a) * vx + Math.cos(a) * vy + D.rb * w) / 50) * 50; }); st.m = st.m.map(m => ogr(m, -D.nMotMax, D.nMotMax)); kM.forEach((q, i) => q.postavi(st.m[i])); racun(); }
    poruka(); osvjezi(); ctx.budi();
  };
  ui.gumb('Naprijed', () => pre(0.3, 0, 0), { tanki: true, u: r1 });
  ui.gumb('Bočno lijevo', () => pre(0, 0.3, 0), { tanki: true, u: r1 });
  ui.gumb('Okret na mjestu', () => pre(0, 0, 1), { tanki: true, u: r1 });
  ui.gumb('Luk', () => pre(0.3, 0, 0.6), { tanki: true, u: r1 });
  ui.gumb('Dijagonalno + okret', () => pre(0.3, 0.3, 0.5), { tanki: true, u: r1 });
  ui.gumb('Stop', () => pre(0, 0, 0), { tanki: true, u: r1 });
  const r2 = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r2).osvjezi();
  ui.gumb('Očisti put', () => { st.trag = [[]]; st.x = 1; st.y = 1.15; st.phi = 0; osvjezi(); }, { tanki: true, u: r2 });
  const F = ui.formula('Račun uživo', 5);
  const o = ui.ocit([['vx', 'vx'], ['vy', 'vy'], ['w', 'ω'], ['v', 'Iznos brzine |v|'], ['m', 'm1 · m2 · m3 (motori)'], ['n', 'Kotači (m / i)']]);
  ui.sitno(`Uz rw = ${hr(D.rw, 3)} m i ${tis(D.nMotMax)} 1/min motora najveća je obodna brzina kotača ${hr(D.nMotMax / D.gear * 2 * Math.PI * D.rw / 60, 2)} m/s; čisto naprijed to daje do ${hr(D.nMotMax / D.gear * 2 * Math.PI * D.rw / 60 / (Math.sqrt(3) / 2), 2)} m/s, bočno do ${hr(D.nMotMax / D.gear * 2 * Math.PI * D.rw / 60, 2)} m/s [izračun]. Mobilni robot CP-MR u radu vozi do oko ${hr(D.vmaxCPMR, 2)} m/s.`);
  racun(); poruka(); osvjezi(); ctx.budi();
}

/* =========================================================== 3. pogonska jedinica */
function tPogonskaJedinica(ui, ctx) {
  const USP = 100, M = D.motor;
  const st = { n: 3000, Mm: 4, rw: D.rw, radi: true, fm: 0 };
  const svg = ui.svg(600, 400, 'Shema pogonske jedinice: motor s enkoderom, planetarni reduktor, zupčasti remen i svesmjerni kotač; ispod brzina, moment i snaga na svakom stupnju');
  // motor
  T(svg, 66, 40, 'motor', 'tro-l', 'middle'); T(svg, 66, 60, 'GR 42x40', 'tro-ls', 'middle');
  S('rect', { x: 4, y: 132, width: 14, height: 56, rx: 3, class: 'tro-enk-b' }, svg);
  S('rect', { x: 18, y: 122, width: 96, height: 76, rx: 8, class: 'tro-motor' }, svg);
  const gMot = S('g', { transform: 'translate(66 160)' }, svg);
  S('circle', { cx: 0, cy: 0, r: 22, class: 'tro-disk' }, gMot);
  S('line', { x1: 0, y1: 0, x2: 0, y2: -20, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, gMot);
  S('line', { x1: 114, y1: 160, x2: 146, y2: 160, class: 'tro-vratilo' }, svg);
  // planetarni stupanj
  const PX = 205, PY = 160, rs = 13, rp = 19, rr = rs + 2 * rp;
  T(svg, PX, 40, 'planetarni', 'tro-l', 'middle'); T(svg, PX, 60, 'reduktor ' + D.gear + ' : 1', 'tro-ls', 'middle');
  S('circle', { cx: PX, cy: PY, r: rr + 9, class: 'tro-prsten' }, svg);
  S('circle', { cx: PX, cy: PY, r: rr, class: 'tro-utor' }, svg);
  const gSun = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: rs, class: 'tro-zupcanik' }, gSun); S('line', { x1: 0, y1: 0, x2: 0, y2: -rs + 2, stroke: B.crv, 'stroke-width': 3 }, gSun);
  const gNos = S('g', {}, svg);
  const plan = [0, 1, 2].map(i => {
    const a = i * 120 * RAD, [x, y] = pol(0, 0, rs + rp, a - Math.PI / 2);
    S('line', { x1: 0, y1: 0, x2: f1(x), y2: f1(y), class: 'tro-nosac' }, gNos);
    const g = S('g', {}, gNos);
    S('circle', { cx: 0, cy: 0, r: rp - 1, class: 'tro-zupcanik tro-zupcanik-p' }, g);
    S('line', { x1: 0, y1: 0, x2: 0, y2: -rp + 3, stroke: 'var(--ink)', 'stroke-width': 2.5 }, g);
    return { g, x, y };
  });
  T(svg, PX, PY + rr + 30, '1 od 2 stupnja', 'tro-ls', 'middle');
  S('line', { x1: PX, y1: PY, x2: 300, y2: PY, class: 'tro-vratilo-d' }, svg);
  // remen
  const AX = 300, BX = 510, rk = 20;
  T(svg, 355, 40, 'zupčasti remen', 'tro-l', 'middle'); T(svg, 355, 60, D.remen, 'tro-ls', 'middle');
  const KR = D.rw * 1300;
  const gKot = S('g', { transform: `translate(${BX} ${PY})` }, svg);
  S('circle', { cx: 0, cy: 0, r: KR, class: 'tro-kotac-b' }, gKot);
  for (let i = 0; i < 8; i++) { const g = S('g', { transform: `rotate(${i * 45})` }, gKot); S('ellipse', { cx: 0, cy: -KR + 9, rx: 20, ry: 8, class: 'tro-valjak' }, g); }
  S('line', { x1: 0, y1: -24, x2: 0, y2: -KR + 20, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, gKot);
  T(svg, BX + 20, 40, 'kotač', 'tro-l', 'middle');
  const tKotD = T(svg, BX + 20, 60, '', 'tro-ls', 'middle');
  const remen = `M${AX},${PY - rk} L${BX},${PY - rk} A${rk},${rk} 0 0 1 ${BX},${PY + rk} L${AX},${PY + rk} A${rk},${rk} 0 0 1 ${AX},${PY - rk}Z`;
  S('path', { d: remen, class: 'tro-remen' }, svg);
  const remZ = S('path', { d: remen, class: 'tro-remen-z' }, svg);
  const remK = [AX, BX].map(x => { const g = S('g', { transform: `translate(${x} ${PY})` }, svg); S('circle', { cx: 0, cy: 0, r: rk - 3, class: 'tro-zupcanik' }, g); S('line', { x1: 0, y1: 0, x2: 0, y2: -rk + 5, stroke: B.crv, 'stroke-width': 3 }, g); return g; });
  S('line', { x1: 420, y1: PY + KR, x2: 596, y2: PY + KR, class: 'tro-pod' }, svg);
  const sF = strel(svg, BX, PY + KR + 6, BX - 40, PY + KR + 6, { boja: B.nar, w: 4 });
  const tF = T(svg, 0, PY + KR + 2, 'F', 'tro-lb');
  // tablica stupnjeva
  const KOL = [[66, 'motor'], [205, 'izlaz reduktora'], [380, 'os kotača (remen 1 : 1)'], [520, 'na podu']];
  S('line', { x1: 6, y1: 274, x2: 594, y2: 274, class: 'tro-mreza' }, svg);
  const kt = KOL.map(([x, n]) => { T(svg, x, 296, n, 'tro-ls', 'middle'); return [0, 1, 2].map(j => T(svg, x, 322 + j * 26, '', 'tro-l', 'middle')); });
  // karakteristika motora
  const svg2 = ui.svg(600, 250, 'Karakteristika motora 24 V: brzina prema momentu, nazivna i radna točka', 'tro-svg2');
  const g2 = graf(svg2, 64, 24, 516, 186, { x0: 0, x1: 36, y0: 0, y1: 4200, yt: [0, 1000, 2000, 3000, 4000], xt: [0, 5, 10, 15, 20, 25, 30, 35], naslov: 'brzina motora n [1/min] prema momentu M [Ncm], izvedba 24 V' });
  T(svg2, 580, 246, 'M [Ncm]', 'tro-ls', 'end');
  S('polygon', { points: pts([[g2.X(0), g2.Y(M.n0)], [g2.X(M.Mpot), g2.Y(0)], [g2.X(36), g2.Y(0)], [g2.X(36), g2.Y(4200)], [g2.X(0), g2.Y(4200)]]), class: 'tro-zabranjeno' }, svg2);
  S('line', { x1: g2.X(0), y1: g2.Y(M.n0), x2: g2.X(M.Mpot), y2: g2.Y(0), class: 'tro-krivulja' }, svg2);
  S('line', { x1: g2.X(0), y1: g2.Y(D.nMotMax), x2: g2.X(36), y2: g2.Y(D.nMotMax), class: 'tro-prag' }, svg2);
  T(svg2, g2.X(35.5), g2.Y(D.nMotMax) - 6, `granica R4: ${tis(D.nMotMax)} 1/min`, 'tro-ls', 'end');
  T(svg2, g2.X(14), g2.Y(2700), 'pravac 24 V: 3800 1/min … 33 Ncm', 'tro-ls');
  S('circle', { cx: f1(g2.X(M.MNaz)), cy: f1(g2.Y(M.nNaz)), r: 6, class: 'tro-tocka-n' }, svg2);
  T(svg2, g2.X(M.MNaz) + 10, g2.Y(M.nNaz) - 10, 'nazivno', 'tro-ls');
  const tRad = S('circle', { r: 8, class: 'tro-tocka' }, svg2);

  function osvjezi() {
    const wm = st.n * 2 * Math.PI / 60, Pm = st.Mm / 100 * wm;
    const n2 = st.n / D.gear, M2 = st.Mm * D.gear * D.reduktor.eta, P2 = Pm * D.reduktor.eta;
    const F = M2 / 100 / st.rw, v = n2 * 2 * Math.PI * st.rw / 60;
    const vrijed = [
      [`n = ${tis(st.n)} 1/min`, `M = ${hr(st.Mm, 2)} Ncm`, `P = ${hr(Pm, 1)} W`],
      [`n = ${hr(n2, 1)} 1/min`, `M = ${hr(M2 / 100, 2)} Nm`, `P = ${hr(P2, 1)} W`],
      [`n = ${hr(n2, 1)} 1/min`, `M = ${hr(M2 / 100, 2)} Nm`, `P = ${hr(P2, 1)} W`],
      [`v = ${hr(v, 3)} m/s`, `F = ${hr(F, 1)} N`, `F·v = ${hr(F * v, 1)} W`]
    ];
    kt.forEach((c, i) => c.forEach((t, j) => { t.textContent = vrijed[i][j]; }));
    // vrtnja (usporeno)
    gMot.setAttribute('transform', `translate(66 160) rotate(${(st.fm / RAD % 360).toFixed(1)})`);
    gSun.setAttribute('transform', `translate(${PX} ${PY}) rotate(${(st.fm / RAD % 360).toFixed(1)})`);
    const ip = 1 + rr / rs, fc = st.fm / ip;                 // nosač jednog prikazanog stupnja
    gNos.setAttribute('transform', `translate(${PX} ${PY}) rotate(${(fc / RAD % 360).toFixed(2)})`);
    const fp = -(st.fm - fc) * rs / rp;
    plan.forEach(p => p.g.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y)}) rotate(${(fp / RAD % 360).toFixed(1)})`));
    const fk = st.fm / D.gear;
    remK.forEach(g => { const x = g === remK[0] ? AX : BX; g.setAttribute('transform', `translate(${x} ${PY}) rotate(${(fk / RAD % 360).toFixed(2)})`); });
    gKot.setAttribute('transform', `translate(${BX} ${PY}) rotate(${(fk / RAD % 360).toFixed(2)})`);
    remZ.style.strokeDashoffset = f1(-fk * rk);
    const L = Math.min(70, F * 2.2);
    sF.set(BX + 4, PY + KR + 8, BX + 4 - L, PY + KR + 8); postavi(tF, { x: BX - L - 18, y: PY + KR + 14 });
    tKotD.textContent = `Ø${hr(st.rw * 2000, 0)} mm`;
    postavi(tRad, { cx: g2.X(Math.min(st.Mm, 36)), cy: g2.Y(st.n) });
    const nGr = M.n0 * (1 - st.Mm / M.Mpot);
    const preko = st.n > nGr + 1;
    tRad.classList.toggle('tro-tocka-opas', preko);
    o.i(`${D.gear} : 1 (reduktor), remen 1 : 1`); o.eta(hr(D.reduktor.eta, 2) + ' (reduktor)');
    o.nk(hr(n2, 1) + ' 1/min'); o.Mk(hr(M2 / 100, 2) + ' Nm', M2 > D.reduktor.Mtrajni ? 'opas' : '');
    o.F(hr(F, 1) + ' N po kotaču'); o.v(hr(v, 3) + ' m/s · ' + hr(v * 3.6, 2) + ' km/h');
    if (preko) ui.stanje(`Radna točka je iznad karakteristike 24 V: pri ${hr(st.Mm, 1)} Ncm motor na 24 V može najviše oko ${tis(nGr)} 1/min.`, 'opas');
    else if (st.Mm > M.MNaz) ui.stanje(`Moment je iznad nazivnih ${hr(M.MNaz, 1)} Ncm — dopušteno kratkotrajno (ubrzavanje, nagib), trajno bi pregrijalo motor.`, 'upoz');
    else ui.stanje(`Brzina pada ${D.gear} puta, moment raste ${hr(D.gear * D.reduktor.eta, 1)} puta (${D.gear} · ${hr(D.reduktor.eta, 2)}); gubi se ${hr((1 - D.reduktor.eta) * 100, 0)} % snage, ${hr(Pm * (1 - D.reduktor.eta), 1)} W toplina u reduktoru.`, 'ok');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    st.fm += st.n * 2 * Math.PI / 60 * dt / USP;
    osvjezi();
    return st.n > 0;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r).osvjezi();
  ui.klizac('Brzina motora n_m', 0, 4000, 50, st.n, v => tis(v) + ' 1/min', v => { st.n = v; osvjezi(); ctx.budi(); });
  ui.klizac('Moment motora M_m', 0, 12, 0.1, st.Mm, v => hr(v, 1) + ' Ncm', v => { st.Mm = v; osvjezi(); });
  ui.seg('Promjer kotača', [[D.rw, `Ø${hr(D.rw * 2000, 0)} mm (R4)`], [D.rwCPMR, `Ø${hr(D.rwCPMR * 2000, 0)} mm (CP-MR)`]], D.rw, v => { st.rw = v; osvjezi(); });
  const o = ui.ocit([['i', 'Prijenos'], ['eta', 'Stupanj djelovanja η'], ['nk', 'Brzina kotača n_k = n_m / i'], ['Mk', `Moment kotača M_k = M_m · i · η (reduktor trajno ${hr(D.reduktor.Mtrajni / 100, 0)} Nm)`], ['F', 'Vučna sila F = M_k / rw'], ['v', 'Obodna brzina v = n_k · 2π · rw / 60']]);
  ui.sitno(`Motor 24 V: nazivno ${tis(M.nNaz)} 1/min, ${hr(M.MNaz, 1)} Ncm, ${hr(M.INaz, 1)} A; prazni hod ${tis(M.n0)} 1/min; potezni moment ${M.Mpot} Ncm. Nazivna mehanička snaga ≈ ${hr(M.MNaz / 100 * M.nNaz * 2 * Math.PI / 60, 1)} W.`);
  osvjezi(); ctx.budi();
}

/* =========================================================== 4. enkoder */
function tEnkoder(ui, ctx) {
  const N = D.enkImp, PIT = 40, XA = 470, XB = XA - 2.25 * PIT;
  const st = { radi: true, p: 0.1, brz: 0.6, smjer: 1, mult: 4, cnt: 0, s: null, hist: [], t: 0, zadnji: '' };
  const svg = ui.svg(600, 510, 'Inkrementalni enkoder: disk s 500 proreza, uvećani isječak s očitačima A i B, krug četiriju stanja i signali A, B i stanje brojila u vremenu');
  // disk
  const DX = 132, DY = 158, R1 = 82, R2 = 104;
  T(svg, DX, 26, 'disk: ' + N + ' proreza', 'tro-l', 'middle');
  const gDisk = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: R2 + 6, class: 'tro-disk' }, gDisk);
  let d = '';
  for (let k = 0; k < N; k++) {
    const a0 = 2 * Math.PI * (k + 0.5) / N - Math.PI / 2, a1 = 2 * Math.PI * (k + 1) / N - Math.PI / 2;
    const p = [pol(0, 0, R1, a0), pol(0, 0, R2, a0), pol(0, 0, R2, a1), pol(0, 0, R1, a1)];
    d += put(p, true);
  }
  S('path', { d, class: 'tro-kod' }, gDisk);
  S('circle', { cx: 0, cy: 0, r: 30, class: 'tro-tamno' }, gDisk);
  S('line', { x1: 0, y1: -30, x2: 0, y2: -74, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, gDisk);
  S('rect', { x: DX - 14, y: DY - R2 - 16, width: 28, height: 26, rx: 4, class: 'tro-glava' }, svg);
  S('path', { d: `M${DX + 14},${DY - R2 - 4} L270,56 M${DX + 14},${DY - R2 + 6} L270,166`, class: 'tro-vodilja' }, svg);
  // uvećani isječak
  const WX = 270, WY = 44, WW = 320, WH = 128;
  S('rect', { x: WX, y: WY, width: WW, height: WH, rx: 8, class: 'tro-ploca' }, svg);
  const clW = svg.clip(WX + 1, WY + 1, WW - 2, WH - 2);
  const gStr = S('g', { 'clip-path': clW }, svg);
  S('rect', { x: WX, y: 92, width: WW, height: 34, class: 'tro-disk' }, gStr);
  const bars = []; for (let k = 0; k < 12; k++) bars.push(S('rect', { y: 92, width: PIT / 2, height: 34, class: 'tro-kod' }, gStr));
  const glave = [['A', XA], ['B', XB]].map(([n, x]) => {
    S('rect', { x: x - 11, y: 60, width: 22, height: 18, rx: 3, class: 'tro-led' }, svg);
    const zr = S('line', { x1: x, y1: 78, x2: x, y2: 140, class: 'tro-zraka' }, svg);
    const det = S('rect', { x: x - 11, y: 140, width: 22, height: 16, rx: 3, class: 'tro-det' }, svg);
    T(svg, x, 56, n, 'tro-lb', 'middle');
    return { zr, det };
  });
  T(svg, WX + 10, WY + 18, 'uvećano', 'tro-ls');
  S('line', { x1: XB, y1: 165, x2: XA, y2: 165, class: 'tro-crtica-t' }, svg);
  T(svg, (XA + XB) / 2, 186, '2¼ razmaka → pomak 90° el.', 'tro-ls', 'middle');
  // krug stanja
  const KX = 440, KY = 270, KR = 40;
  T(svg, 290, 248, 'stanje (A B)', 'tro-ls');
  const RED = ['10', '11', '01', '00'];          // redoslijed naprijed (u smjeru kazaljke)
  const cvor = RED.map((s, i) => {
    const [x, y] = pol(KX, KY, KR, -Math.PI / 2 + i * Math.PI / 2);
    const g = S('g', { class: 'tro-broj-k' }, svg); S('circle', { cx: f1(x), cy: f1(y), r: 17 }, g); T(g, x, y + 6, s, 'tro-ls', 'middle');
    return g;
  });
  S('path', { d: luk(KX, KY, KR + 26, -Math.PI / 2 + 0.3, -0.3), class: 'tro-luk-s' }, svg);
  const sSm = strel(svg, 0, 0, 0, 0, { boja: 'var(--teal)', w: 3 });
  T(svg, KX + 58, KY - 30, '+ naprijed', 'tro-ls');
  T(svg, KX + 58, KY + 40, '− natrag', 'tro-ls');
  // lampice na disku
  const lamp = ['A', 'B'].map((n, i) => { S('circle', { cx: 30 + i * 50, cy: 300, r: 9, class: 'tro-lampa' }, svg); T(svg, 44 + i * 50, 306, n, 'tro-l'); return svg.lastChild.previousSibling; });
  const tCnt = T(svg, 130, 306, '', 'tro-lb');
  // graf
  const GX = 64, GW = 524;
  T(svg, 6, 390, 'A', 'tro-lb'); T(svg, 6, 430, 'B', 'tro-lb'); T(svg, 6, 478, 'broj.', 'tro-ls');
  S('rect', { x: GX, y: 364, width: GW, height: 140, class: 'tro-graf' }, svg);
  const kA = S('polyline', { class: 'tro-krivulja' }, svg), kB = S('polyline', { class: 'tro-krivulja-b' }, svg), kC = S('polyline', { class: 'tro-krivulja-z' }, svg);
  const gBr = S('g', {}, svg);
  T(svg, GX, 356, 'signali i brojilo (zadnjih 8 s prikaza)', 'tro-ls');

  const AB = p => [frac(p) < 0.5 ? 1 : 0, frac(p - 0.25) < 0.5 ? 1 : 0];
  function korakP(dp) {
    const n = Math.max(1, Math.ceil(Math.abs(dp) / 0.1));
    for (let i = 0; i < n; i++) {
      st.p += dp / n;
      const [a, b] = AB(st.p), s = a * 2 + b;
      if (st.s != null && s !== st.s) {
        const io = RED.indexOf(String(st.s >> 1) + String(st.s & 1)), inn = RED.indexOf(String(a) + String(b));
        const dd = (inn - io + 4) % 4, smj = dd === 1 ? 1 : dd === 3 ? -1 : 0;
        const aProm = (st.s >> 1) !== a, bProm = (st.s & 1) !== b;
        let br = 0;
        if (st.mult === 4) br = smj;
        else if (st.mult === 2 && aProm) br = smj;
        else if (st.mult === 1 && aProm && a === 1) br = smj;
        st.cnt += br;
        const kan = aProm ? 'A' : 'B', bridT = (aProm ? a : b) ? '↑' : '↓', drugi = aProm ? 'B' : 'A', dv = aProm ? b : a;
        st.zadnji = `Brid ${kan} ${bridT} dok je ${drugi} = ${dv} → ${smj > 0 ? 'naprijed' : 'natrag'}${br ? ` (${br > 0 ? '+1' : '−1'})` : ' (u ovom načinu se ne broji)'}`;
        if (br) st.hist.push([st.t, a, b, st.cnt, 1]);
      }
      st.s = s;
    }
  }
  function osvjezi() {
    const [a, b] = AB(st.p);
    gDisk.setAttribute('transform', `translate(${DX} ${DY}) rotate(${(st.p / N * 360).toFixed(3)})`);
    const n0 = Math.floor(st.p - 8);
    bars.forEach((r, i) => r.setAttribute('x', f1(XA + (n0 + i - 3 + 0.5 - st.p) * PIT)));
    [[a, glave[0]], [b, glave[1]]].forEach(([v, g]) => { g.zr.classList.toggle('tro-zraka-on', !!v); g.det.classList.toggle('tro-det-on', !!v); });
    lamp[0].classList.toggle('tro-lampa-on', !!a); lamp[1].classList.toggle('tro-lampa-on', !!b);
    const s = String(a) + String(b);
    cvor.forEach((g, i) => g.classList.toggle('tro-akt', RED[i] === s));
    const i = RED.indexOf(s), sm = st.brz * st.smjer;
    const a0 = -Math.PI / 2 + i * Math.PI / 2, a1 = a0 + (sm >= 0 ? 0.9 : -0.9);
    const [x0, y0] = pol(KX, KY, KR + 2, a0 + (sm >= 0 ? 0.42 : -0.42)), [x1, y1] = pol(KX, KY, KR + 2, a1 + (sm >= 0 ? 0.3 : -0.3));
    sSm.set(x0, y0, x1, y1); sSm.style.display = Math.abs(sm) > 1e-6 ? '' : 'none';
    tCnt.textContent = 'brojilo: ' + tis(st.cnt);
    // graf
    const t1 = st.t, t0 = t1 - 8, X = t => GX + (t - t0) / 8 * GW;
    const h = st.hist.filter(q => q[0] >= t0 - 0.5);
    const lin = (j, yh, yl) => { const p = []; let pr = null; for (const q of h) { const y = q[j] ? yh : yl; if (pr !== null && pr !== y) p.push([X(q[0]), pr]); p.push([X(q[0]), y]); pr = y; } if (pr !== null) p.push([X(t1), pr]); return p.filter(z => z[0] >= GX); };
    kA.setAttribute('points', pts(lin(1, 374, 400)));
    kB.setAttribute('points', pts(lin(2, 414, 440)));
    const cs = h.map(q => q[3]), mn = Math.min(st.cnt, ...cs), mx = Math.max(st.cnt, ...cs), rng = Math.max(4, mx - mn);
    const Yc = c => 496 - (c - mn) / rng * 42;
    const pc = []; let pr = null;
    for (const q of h) { if (pr !== null) pc.push([X(q[0]), Yc(pr)]); pc.push([X(q[0]), Yc(q[3])]); pr = q[3]; }
    if (pr !== null) pc.push([X(t1), Yc(pr)]);
    kC.setAttribute('points', pts(pc.filter(z => z[0] >= GX)));
    gBr.replaceChildren();
    for (const q of h) if (q[4] && X(q[0]) >= GX) S('line', { x1: f1(X(q[0])), x2: f1(X(q[0])), y1: 366, y2: 448, class: 'tro-brid' }, gBr);
    const okrM = st.cnt / (N * st.mult);
    o.cnt(tis(st.cnt)); o.kut(hr(okrM * 360, 2) + '°'); o.okr(hr(okrM, 4));
    o.kot(hr(okrM / D.gear * 360, 3) + '°'); o.put(hr(okrM / D.gear * 2 * Math.PI * D.rw * 1000, 3) + ' mm');
    o.raz(`${tis(N * st.mult)} po okretaju motora · ${tis(N * st.mult * D.gear)} po okretaju kotača`);
    if (st.zadnji) ui.stanje(st.zadnji, sm >= 0 ? 'ok' : 'upoz');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    st.t += dt;
    const p0 = st.s;
    korakP(st.brz * st.smjer * dt);
    if (st.s === p0) { const [a, b] = AB(st.p); st.hist.push([st.t, a, b, st.cnt, 0]); }
    while (st.hist.length > 2 && st.hist[0][0] < st.t - 9) st.hist.shift();
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bI = ui.igraj(st, 'radi', 'Pokreni', null, r); bI.osvjezi();
  ui.gumb('Promijeni smjer', () => { st.smjer *= -1; ui.stanje(st.smjer > 0 ? 'Smjer: naprijed — A prednjači pred B, brojilo raste.' : 'Smjer: natrag — B prednjači pred A, redoslijed stanja se obrnuo i brojilo pada.', st.smjer > 0 ? 'ok' : 'upoz'); osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  ui.gumb('Korak ¼ razmaka', () => { st.radi = false; bI.osvjezi(); const [a, b] = AB(st.p); st.hist.push([st.t, a, b, st.cnt, 0]); korakP(0.25 * st.smjer); st.t += 0.4; const [a2, b2] = AB(st.p); st.hist.push([st.t, a2, b2, st.cnt, 0]); osvjezi(); }, { tanki: true, u: r });
  ui.gumb('Nuliraj brojilo', () => { st.cnt = 0; st.hist = []; st.zadnji = ''; ui.stanje('Brojilo je na nuli.'); osvjezi(); }, { tanki: true, u: r });
  ui.klizac('Brzina vrtnje (jako usporeno)', 0.1, 3, 0.1, st.brz, v => hr(v, 1) + ' razmaka/s', v => { st.brz = v; });
  ui.seg('Način brojanja', [[1, '×1 (A ↑)'], [2, '×2 (bridovi A)'], [4, '×4 (svi bridovi)']], 4, v => { st.mult = v; st.cnt = 0; st.hist = []; ui.stanje(`Način ×${v}: ${v === 4 ? 'broje se svi bridovi obaju kanala — 2000 inkremenata po okretaju motora' : v === 2 ? 'broje se oba brida kanala A — 1000 po okretaju' : 'broji se samo uzlazni brid kanala A — 500 po okretaju'}.`); osvjezi(); });
  const o = ui.ocit([['cnt', 'Brojilo (inkrementi)'], ['kut', 'Kut motora'], ['okr', 'Okretaja motora'], ['kot', `Kut kotača (÷ ${D.gear})`], ['put', 'Put kotača po obodu'], ['raz', 'Razlučivost']]);
  ui.sitno(`Pri ${tis(D.nMotMax)} 1/min motora enkoder daje ${tis(D.nMotMax / 60 * D.enkInk)} inkremenata u sekundi (×4). Jedan inkrement odgovara ${hr(360 / D.enkInk, 2)}° motora, odnosno ${hr(2 * Math.PI * D.rw / (D.enkInk * D.gear) * 1e6, 1)} µm puta kotača [izračun].`);
  osvjezi(); ui.stanje('Pritisni „Pokreni” ili „Korak ¼ razmaka”.'); ctx.budi();
}

/* =========================================================== 5. regulacija brzine */
function tRegulacija(ui, ctx) {
  const M = D.motor, TAU = 0.042, USP = 4, TW = 0.8, ML = 2;   // vremenska konstanta [s] (pretpostavka), usporenje, prozor grafa [s], teret [Ncm]
  const st = { K: D.pi.K, Ki: D.pi.Ki, nz: 0, cilj: 2000, n: 0, u: 0, e1: 0, t: 0, teret: false, hist: [], radi: false, kraj: 0, tok: 0, zadano: 0 };
  const svg = ui.svg(600, 150, 'Blok-shema regulacije brzine: zadana brzina, zbrajalo, PI regulator 1 kHz, ograničenje ±255, PWM, H-most, motor i povratna veza iz enkodera');
  const blokovi = {};
  const blok = (k, x, y, w, h, t1, t2) => { const g = S('g', { class: 'tro-rb' }, svg); S('rect', { x, y, width: w, height: h, rx: 7 }, g); T(g, x + w / 2, y + (t2 ? h / 2 - 2 : h / 2 + 6), t1, 'tro-l', 'middle'); if (t2) T(g, x + w / 2, y + h / 2 + 17, t2, 'tro-ls', 'middle'); blokovi[k] = g; return g; };
  const vodovi = [];
  const vod = (pp, kl) => {
    S('polyline', { points: pts(pp), class: 'tro-vod-r' }, svg);
    vodovi.push(S('polyline', { points: pts(pp), class: 'tro-tok-r' + (kl ? ' ' + kl : '') }, svg));
    const [a, b] = pp.slice(-2), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    S('polygon', { points: `${b[0]},${b[1]} ${f1(b[0] - ux * 10 - uy * 5)},${f1(b[1] - uy * 10 + ux * 5)} ${f1(b[0] - ux * 10 + uy * 5)},${f1(b[1] - uy * 10 - ux * 5)}`, class: 'tro-glava-v' }, svg);
  };
  const Y = 52;
  T(svg, 4, Y - 20, 'n_zad', 'tro-ls');
  vod([[4, Y], [34, Y]]);
  const gS = S('g', { class: 'tro-rb' }, svg); S('circle', { cx: 48, cy: Y, r: 14 }, gS); T(gS, 48, Y + 6, 'Σ', 'tro-lb', 'middle'); T(svg, 40, Y + 32, '−', 'tro-lb', 'middle');
  vod([[62, Y], [80, Y]]);
  blok('pi', 80, Y - 26, 104, 52, 'PI', '1 kHz');
  vod([[184, Y], [200, Y]]);
  blok('og', 200, Y - 26, 80, 52, 'u', '±255');
  vod([[280, Y], [296, Y]]);
  blok('pwm', 296, Y - 26, 68, 52, 'PWM', '');
  vod([[364, Y], [380, Y]]);
  blok('hm', 380, Y - 26, 88, 52, 'H-most', '0–24 V');
  vod([[468, Y], [484, Y]]);
  blok('mot', 484, Y - 26, 110, 52, 'motor', 'n');
  vod([[539, Y + 26], [539, 114], [372, 114]], 'tro-tok-pl');
  blok('enk', 262, 94, 110, 40, 'enkoder', '');
  vod([[262, 114], [48, 114], [48, Y + 14]], 'tro-tok-pl');
  T(svg, 150, 108, 'n (2000 ink./okr.)', 'tro-ls', 'middle');
  // grafovi
  const svg2 = ui.svg(600, 330, 'Graf: zadana i stvarna brzina motora te izlaz regulatora u vremenu', 'tro-svg2');
  const gA = graf(svg2, 64, 26, 524, 170, { x0: 0, x1: TW, y0: 0, y1: 4000, yt: [0, 1000, 2000, 3000, 4000], naslov: 'brzina motora [1/min]: — stvarna   - - zadana' });
  const gB = graf(svg2, 64, 230, 524, 80, { x0: 0, x1: TW, y0: -40, y1: 300, yt: [0, 255], naslov: 'izlaz regulatora u (granica 255)' });
  S('line', { x1: 64, x2: 588, y1: f1(gB.Y(255)), y2: f1(gB.Y(255)), class: 'tro-prag' }, svg2);
  const clA = svg2.clip(64, 26, 524, 170), clB = svg2.clip(64, 230, 524, 80);
  const kZ = S('polyline', { class: 'tro-krivulja-z', 'clip-path': clA }, svg2), kN = S('polyline', { class: 'tro-krivulja', 'clip-path': clA }, svg2);
  const kU = S('polyline', { class: 'tro-krivulja-n', 'clip-path': clB }, svg2);
  const tX = T(svg2, 588, 326, '', 'tro-ls', 'end');
  const tTer = T(svg2, 74, 48, '', 'tro-ls tro-t-upoz');

  function korakMs() {
    // regulator (1 ms)
    const e = st.nz - st.n;
    st.u += st.K * (e - st.e1) + st.Ki * e;
    st.u = ogr(st.u, -D.pi.umax, D.pi.umax);
    if (st.nz === 0 && Math.abs(st.n) < 1) st.u = 0;
    st.e1 = e;
    // motor (4 × 0,25 ms)
    for (let i = 0; i < 4; i++) {
      const V = 24 * st.u / D.pi.umax;
      let nss = M.n0 * V / 24;
      if (st.teret) nss -= M.n0 / M.Mpot * ML * (Math.abs(st.n) > 1 ? Math.sign(st.n) : Math.sign(nss));
      st.n += (nss - st.n) / TAU * 0.00025;
    }
    st.t += 0.001;
    st.hist.push([st.t, st.nz, st.n, st.u]);
  }
  function osvjezi() {
    const t1 = Math.max(TW, st.t), t0 = t1 - TW;
    const X = t => 64 + (t - t0) / TW * 524;
    const h = st.hist.filter((q, i) => q[0] >= t0 && i % 2 === 0);
    kZ.setAttribute('points', pts(h.map(q => [X(q[0]), gA.Y(q[1])])));
    kN.setAttribute('points', pts(h.map(q => [X(q[0]), gA.Y(q[2])])));
    kU.setAttribute('points', pts(h.map(q => [X(q[0]), gB.Y(ogr(q[3], -40, 300))])));
    tX.textContent = `t = ${hr(t0 * 1000, 0)} … ${hr(t1 * 1000, 0)} ms (usporeno ${USP}×)`;
    tTer.textContent = st.teret ? `opterećenje ${hr(ML, 1)} Ncm` : '';
    for (const v of vodovi) v.style.strokeDashoffset = f1(-st.tok);
    svg.classList.toggle('tro-tece', st.radi);
    const zas = Math.abs(st.u) >= D.pi.umax - 0.01;
    blokovi.og.classList.toggle('tro-vruce', zas);
    const e = st.nz - st.n;
    o.nz(tis(st.nz) + ' 1/min'); o.n(tis(st.n) + ' 1/min'); o.e(hr(e, 0) + ' 1/min', Math.abs(e) > 50 ? 'upoz' : 'ok');
    o.u(hr(st.u, 1) + ' (' + hr(st.u / D.pi.umax * 100, 0) + ' % PWM)', zas ? 'opas' : '');
    o.V(hr(24 * st.u / D.pi.umax, 2) + ' V');
    o.v(hr(st.n / D.gear * 2 * Math.PI * D.rw / 60, 3) + ' m/s');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const n = Math.round(dt / USP * 1000);
    for (let i = 0; i < n; i++) { if (st.t >= st.zadano) st.nz = st.cilj; korakMs(); }
    while (st.hist.length > 2 && st.hist[0][0] < st.t - TW - 0.05) st.hist.shift();
    st.tok += dt * 30;
    if (st.t > st.kraj) {
      st.radi = false;
      const e = st.nz - st.n, zas = Math.abs(st.u) >= D.pi.umax - 0.01;
      if (zas && Math.abs(e) > 5) ui.stanje(`Izlaz je u zasićenju (u = ±${D.pi.umax}): ni puni napon ne daje zadanu brzinu, ostaje pogreška ${hr(e, 0)} 1/min.`, 'opas');
      else ui.stanje(`Ustaljeno: n = ${tis(st.n)} 1/min, pogreška ${hr(e, 1)} 1/min, izlaz u = ${hr(st.u, 0)}${st.teret ? ' — integralni dio je podigao izlaz da svlada opterećenje' : ''}.`, 'ok');
    }
    osvjezi();
    return st.radi;
  });
  const produzi = (s = 0.6) => { st.kraj = Math.max(st.kraj, st.t + s); if (!st.radi) { st.radi = true; ctx.budi(); } };
  const r = ui.red();
  ui.gumb('Skok zadane brzine', () => {
    st.n = 0; st.u = 0; st.e1 = 0; st.t = 0; st.hist = []; st.nz = 0; st.zadano = 0.05; st.kraj = TW;
    st.radi = true; ui.stanje(`Zadana brzina skače s 0 na ${tis(st.cilj)} 1/min. Proporcionalni dio odmah daje veliki izlaz, integralni ga dalje povećava dok pogreška ne nestane.`); ctx.budi();
  }, { u: r });
  const bT = ui.gumb(`Opterećenje ${hr(ML, 0)} Ncm`, (e, b) => {
    st.teret = !st.teret; b.setAttribute('aria-pressed', String(st.teret));
    ui.stanje(st.teret ? 'Opterećenje je uključeno: brzina pada, pogreška raste, a integralni dio postupno povećava izlaz.' : 'Opterećenje je skinuto: brzina kratko poraste iznad zadane, pa se izlaz smanji.', 'upoz');
    produzi(0.6);
  }, { tanki: true, pritisak: false, u: r });
  ui.gumb('Zadani K i Ki', () => { kK1.postavi(D.pi.K); kK2.postavi(D.pi.Ki); st.K = D.pi.K; st.Ki = D.pi.Ki; ui.stanje(`Vraćeno K = ${hr(D.pi.K, 2)}, Ki = ${hr(D.pi.Ki, 3)}.`); produzi(0.4); }, { tanki: true, u: r });
  ui.seg('Zadana brzina motora', [[1000, '1000'], [2000, '2000'], [3000, '3000'], [3600, '3600 1/min']], 2000, v => { st.cilj = v; st.zadano = st.t; ui.stanje(`Nova zadana brzina ${tis(v)} 1/min${v === 3600 ? ' — blizu granice; s opterećenjem izlaz dođe do 255' : ''}.`); produzi(0.6); });
  const kK1 = ui.klizac('Pojačanje K', 0, 2, 0.05, st.K, v => hr(v, 2), v => { st.K = v; produzi(0.4); });
  const kK2 = ui.klizac('Integralno pojačanje Ki', 0, 0.1, 0.005, st.Ki, v => hr(v, 3), v => { st.Ki = v; produzi(0.4); });
  const o = ui.ocit([['nz', 'Zadana brzina n_zad'], ['n', 'Stvarna brzina n (enkoder)'], ['e', 'Pogreška e = n_zad − n'], ['u', 'Izlaz u (PWM)'], ['V', 'Srednji napon motora'], ['v', 'Obodna brzina kotača']]);
  ui.sitno(`Brzinski oblik: regulator pamti samo prethodni izlaz i prethodnu pogrešku. Zasićenje je jednostavno — izlaz se odreže na ±${D.pi.umax} i ne „namata” integral. Od firmvera 1.4.0 vrijedi K = 0,01·kp i Ki = 0,001·ki (parametri iz sučelja).`);
  void bT;
  osvjezi(); ui.stanje('Pritisni „Skok zadane brzine”.');
}

/* =========================================================== 6. IR senzor */
function tIrSenzor(ui, ctx) {
  const UVrh = Math.pow(12.08 / 4, 1 / 1.058);
  const Ud = c => c >= 4 ? Math.pow(12.08 / c, 1 / 1.058) : UVrh * Math.pow(Math.max(c, 0) / 4, 0.8);     // c u cm → V (približno)
  const dIzU = U => 12.08 * Math.pow(U, -1.058);
  const st = { d: 12, kut: 0, dist: 10, tip: 'noga', anim: false, t: 0 };
  // --- triangulacija
  const svg = ui.svg(600, 280, 'Triangulacija: IR dioda šalje snop na predmet, odbijena svjetlost kroz leću pada na PSD na mjesto koje ovisi o udaljenosti');
  const FX = 106, PXs = 11;
  S('rect', { x: 12, y: 70, width: 94, height: 196, rx: 8, class: 'tro-kuciste' }, svg);
  T(svg, 59, 60, D.ir.tip.replace('Sharp ', ''), 'tro-ls', 'middle');
  S('rect', { x: 52, y: 101, width: 22, height: 18, rx: 3, class: 'tro-led' }, svg);
  T(svg, 20, 98, 'IR LED', 'tro-ls');
  S('ellipse', { cx: 100, cy: 110, rx: 5, ry: 16, class: 'tro-leca' }, svg);
  S('ellipse', { cx: 100, cy: 180, rx: 5, ry: 16, class: 'tro-leca' }, svg);
  S('rect', { x: 64, y: 176, width: 10, height: 50, class: 'tro-psd' }, svg);
  T(svg, 20, 246, 'PSD', 'tro-ls'); T(svg, 112, 206, 'leća', 'tro-ls');
  const zr1 = S('line', { x1: 100, y1: 110, y2: 110, class: 'tro-ir' }, svg);
  const zr2 = S('polyline', { class: 'tro-ir tro-ir-p' }, svg);
  const tocka = S('circle', { r: 6, class: 'tro-ir-tocka' }, svg);
  const gPred = S('g', {}, svg);
  S('rect', { x: 0, y: 70, width: 18, height: 170, rx: 3, class: 'tro-predmet' }, gPred);
  S('line', { x1: FX, y1: 258, x2: 590, y2: 258, class: 'tro-mreza0' }, svg);
  for (let c = 0; c <= 40; c += 5) { const x = FX + c * PXs; S('line', { x1: x, y1: 252, x2: x, y2: 264, class: 'tro-mreza0' }, svg); T(svg, x, 278, String(c), 'tro-ls', 'middle'); }
  T(svg, 590, 248, 'd [cm]', 'tro-ls', 'end');
  const tPom = T(svg, 120, 236, '', 'tro-ls');
  // --- krivulja
  const svg2 = ui.svg(600, 270, 'Izlazni napon senzora prema udaljenosti: nelinearna krivulja s mrtvom zonom ispod 4 cm', 'tro-svg2');
  const g2 = graf(svg2, 60, 24, 528, 200, { x0: 0, x1: 40, y0: 0, y1: 3.4, yt: [0, 1, 2, 3], yf: v => v + ' V', xt: [0, 4, 10, 20, 30, 40], naslov: 'izlazni napon U [V] prema udaljenosti d [cm] (približno)' });
  S('rect', { x: g2.X(0), y: 24, width: g2.X(4) - g2.X(0), height: 200, class: 'tro-mrtvo' }, svg2);
  S('rect', { x: g2.X(30), y: 24, width: g2.X(40) - g2.X(30), height: 200, class: 'tro-mrtvo tro-mrtvo-s' }, svg2);
  T(svg2, g2.X(2), 44, 'mrtva', 'tro-ls', 'middle'); T(svg2, g2.X(2), 62, 'zona', 'tro-ls', 'middle');
  T(svg2, g2.X(35), 44, 'izvan', 'tro-ls', 'middle'); T(svg2, g2.X(35), 62, 'opsega', 'tro-ls', 'middle');
  const kp = []; for (let c = 0.3; c <= 40; c += 0.2) kp.push([g2.X(c), g2.Y(Ud(c))]);
  S('polyline', { points: pts(kp), class: 'tro-krivulja' }, svg2);
  T(svg2, 588, 262, 'd [cm]', 'tro-ls', 'end');
  const hl = S('line', { class: 'tro-vodilja' }, svg2), vl = S('line', { class: 'tro-vodilja' }, svg2);
  const lazna = S('line', { class: 'tro-prag' }, svg2), laznaT = S('circle', { r: 6, class: 'tro-tocka tro-tocka-opas' }, svg2);
  const rt = S('circle', { r: 8, class: 'tro-tocka' }, svg2);
  // --- pogled odozgo, 9 senzora
  const svg3 = ui.svg(600, 360, 'Robot odozgo s devet IR snopova razmaknutih 40° i preprekom', 'tro-svg2');
  const CX = 300, CY = 180, SC = 300, RR = D.promjer / 2;
  const rob = robotOdozgo(svg3, SC); rob.postavi(CX, CY, 0);
  T(svg3, 8, 24, 'pogled odozgo · naprijed gore', 'tro-ls');
  const zrake = [], natp = [];
  for (let i = 0; i < D.ir.broj; i++) {
    zrake.push(S('line', { class: 'tro-ir-snop' }, svg3));
    natp.push(T(svg3, 0, 0, '', 'tro-ls', 'middle'));
  }
  const prep = S('g', {}, svg3);
  const M2S = (x, y) => [CX - y * SC, CY - x * SC];
  function prepreke() {
    const a = st.kut * RAD, r = RR + st.dist / 100;
    if (st.tip === 'noga') return [{ tip: 'krug', c: [(r + 0.02) * Math.cos(a), (r + 0.02) * Math.sin(a)], r: 0.02 }];
    const cx = r * Math.cos(a), cy = r * Math.sin(a), tx = -Math.sin(a), ty = Math.cos(a);
    return [{ tip: 'seg', a: [cx - tx * 0.6, cy - ty * 0.6], b: [cx + tx * 0.6, cy + ty * 0.6] }];
  }
  function osvjezi() {
    // triangulacija
    const Xo = FX + st.d * PXs;
    gPred.setAttribute('transform', `translate(${f1(Xo)} 0)`);
    zr1.setAttribute('x2', f1(Xo));
    const Dd = Xo - 100, off = 30 * 70 / Dd, na = off <= 48;
    const yps = 180 + off;
    zr2.setAttribute('points', pts([[Xo, 110], [100, 180], [70, Math.min(yps, 268)]]));
    postavi(tocka, { cx: 70, cy: Math.min(yps, 268) });
    tocka.classList.toggle('tro-ir-van', !na);
    tPom.textContent = na ? `pomak točke na PSD-u ∝ 1/d` : 'točka pada izvan PSD-a';
    // krivulja
    const U = Ud(st.d);
    postavi(rt, { cx: g2.X(st.d), cy: g2.Y(U) });
    postavi(hl, { x1: g2.X(0), y1: g2.Y(U), x2: g2.X(st.d), y2: g2.Y(U) });
    postavi(vl, { x1: g2.X(st.d), y1: g2.Y(U), x2: g2.X(st.d), y2: 224 });
    const dL = dIzU(U);
    const lz = st.d < 4 && dL <= 40;
    lazna.style.display = laznaT.style.display = lz ? '' : 'none';
    if (lz) { postavi(lazna, { x1: g2.X(st.d), y1: g2.Y(U), x2: g2.X(dL), y2: g2.Y(U) }); postavi(laznaT, { cx: g2.X(dL), cy: g2.Y(U) }); }
    o.d(hr(st.d, 1) + ' cm'); o.U(hr(U, 2) + ' V');
    o.dr(st.d > 30 ? 'izvan opsega' : hr(Math.min(dL, 99), 1) + ' cm', st.d < 4 ? 'opas' : st.d > 30 ? 'upoz' : 'ok');
    if (st.d < 4) ui.stanje(`Mrtva zona: predmet je na ${hr(st.d, 1)} cm, ali napon ${hr(U, 2)} V odgovara udaljenosti ${hr(dL, 1)} cm. Robot bi mislio da je prepreka dalje nego što jest.`, 'opas');
    else if (st.d > 30) ui.stanje('Izvan korisnog opsega: napon je malen i jedva se mijenja s udaljenošću — očitanje je nepouzdano.', 'upoz');
    else ui.stanje(`U korisnom području napon jednoznačno određuje udaljenost. Na blizini se mijenja brzo (dobra razlučivost), na daljini sporo.`, 'ok');
    // odozgo
    const pr = prepreke();
    prep.replaceChildren();
    for (const q of pr) {
      if (q.tip === 'krug') { const [x, y] = M2S(q.c[0], q.c[1]); S('circle', { cx: f1(x), cy: f1(y), r: q.r * SC, class: 'tro-prepreka' }, prep); }
      else { const [x1, y1] = M2S(q.a[0], q.a[1]), [x2, y2] = M2S(q.b[0], q.b[1]); S('line', { x1: f1(x1), y1: f1(y1), x2: f1(x2), y2: f1(y2), class: 'tro-zid' }, prep); }
    }
    let vide = 0, naj = Infinity;
    for (let i = 0; i < D.ir.broj; i++) {
      const a = i * D.ir.razmak * RAD, ux = Math.cos(a), uy = Math.sin(a);
      const sx = RR * ux, sy = RR * uy;
      const d = zraka(sx, sy, ux, uy, pr);
      const vid = d <= D.ir.dMax;
      const dd = Math.min(d, D.ir.dMax);
      const [x1, y1] = M2S(sx, sy), [x2, y2] = M2S(sx + ux * dd, sy + uy * dd);
      postavi(zrake[i], { x1, y1, x2, y2 });
      zrake[i].setAttribute('class', 'tro-ir-snop' + (vid ? (d < D.ir.dMin ? ' tro-ir-mrtvo' : ' tro-ir-vidi') : ''));
      const [lx, ly] = M2S(sx + ux * (dd + 0.035), sy + uy * (dd + 0.035));
      postavi(natp[i], { x: lx, y: ly + 5 });
      natp[i].textContent = vid ? (d < D.ir.dMin ? '?' : hr(d * 100, 0)) : String(i + 1);
      natp[i].setAttribute('class', vid ? (d < D.ir.dMin ? 'tro-lb tro-t-opas' : 'tro-lb tro-t-ok') : 'tro-ls');
      if (vid) { vide++; naj = Math.min(naj, d); }
    }
    o.vide(vide ? `${vide} od ${D.ir.broj}` : 'nijedan', vide ? 'ok' : 'opas');
    o.naj(isFinite(naj) ? hr(naj * 100, 1) + ' cm' + (naj < D.ir.dMin ? ' (mrtva zona!)' : '') : '—', naj < D.ir.dMin ? 'opas' : '');
  }
  ctx.petlja(dt => {
    if (!st.anim) { osvjezi(); return false; }
    st.t += dt;
    st.kut = (st.kut + dt * 25) % 360; kKut.postavi(Math.round(st.kut));
    osvjezi();
    return true;
  });
  ui.klizac('Udaljenost predmeta d (gornji crtež)', 1, 40, 0.5, st.d, v => hr(v, 1) + ' cm', v => { st.d = v; osvjezi(); });
  ui.seg('Prepreka u pogledu odozgo', [['noga', 'Noga stola Ø 4 cm'], ['zid', 'Zid']], 'noga', v => { st.tip = v; osvjezi(); });
  const kKut = ui.klizac('Smjer prepreke', 0, 359, 1, st.kut, v => v + '°', v => { st.kut = v; osvjezi(); });
  ui.klizac('Udaljenost prepreke od ruba', 1, 35, 1, st.dist, v => v + ' cm', v => { st.dist = v; osvjezi(); });
  const r = ui.red();
  ui.igraj(st, 'anim', 'Obiđi prepreku oko robota', null, r).osvjezi();
  const o = ui.ocit([['d', 'Stvarna udaljenost (gore)'], ['U', 'Izlazni napon U'], ['dr', 'Udaljenost izračunata iz U'], ['vide', 'Senzori koji vide prepreku (dolje)'], ['naj', 'Najbliže očitanje']]);
  ui.sitno(`Između susjednih snopova je ${D.ir.razmak}°: na rubu robota (r = ${hr(RR * 100, 1)} cm) to je luk od ${hr(RR * D.ir.razmak * RAD * 100, 0)} cm. Uska noga stola može proći neopaženo — zato se IR senzori kombiniraju s odbojnikom i laserom.`);
  osvjezi();
}

/* =========================================================== 7. odbojnik */
function tOdbojnik(ui, ctx) {
  const SC = 400;
  const st = { x: 0, v: 0, voz: false, ruka: 0, rukaCilj: 0, prekid: false, stopWeb: true, komp: 0, akt: false, stanje: 'miruje', tok: 0, gotovo: false };
  const svg = ui.svg(600, 300, 'Lijevo presjek sigurnosnog ruba sa sklopnom komorom, desno strujni krug mirne struje s nadzorom');
  S('rect', { x: 6, y: 34, width: 290, height: 258, rx: 10, class: 'tro-ploca' }, svg);
  S('rect', { x: 304, y: 34, width: 290, height: 258, rx: 10, class: 'tro-ploca' }, svg);
  T(svg, 151, 24, 'presjek profila', 'tro-l', 'middle'); T(svg, 449, 24, 'krug mirne struje', 'tro-l', 'middle');
  // šasija
  S('rect', { x: 14, y: 60, width: 46, height: 200, fill: svg.srafura, class: 'tro-presjek' }, svg);
  T(svg, 14, 54, 'šasija', 'tro-ls');
  const prof = S('path', { class: 'tro-profil', 'fill-rule': 'evenodd' }, svg);
  const vL = S('line', { x1: 96, y1: 132, x2: 96, y2: 188, class: 'tro-vodic' }, svg);
  const vD = S('line', { y1: 132, y2: 188, class: 'tro-vodic' }, svg);
  const iskra = S('circle', { cx: 100, cy: 160, r: 8, class: 'tro-iskra' }, svg);
  const gPr = S('g', {}, svg);
  S('rect', { x: 0, y: 70, width: 60, height: 180, rx: 6, class: 'tro-predmet' }, gPr);
  const tPr = T(svg, 0, 62, '', 'tro-ls', 'middle');
  T(svg, 92, 102, 'komora', 'tro-ls');
  const tKomp = T(svg, 150, 280, '', 'tro-ls', 'middle');
  // krug
  const BX = 316, BY = 100;
  const gNad = S('g', { class: 'tro-rb' }, svg); S('rect', { x: BX, y: BY, width: 84, height: 84, rx: 8 }, gNad);
  T(gNad, BX + 42, BY + 36, 'nadzor', 'tro-l', 'middle'); T(gNad, BX + 42, BY + 56, 'struje', 'tro-ls', 'middle');
  const zG = S('path', { d: `M${BX + 84},${BY + 20} L560,${BY + 20} L560,${BY + 34}`, class: 'tro-zica-k' }, svg);
  const zD = S('path', { d: `M${BX + 84},${BY + 64} L560,${BY + 64} L560,${BY + 50}`, class: 'tro-zica-k' }, svg);
  S('polyline', { points: `560,${BY + 34} 568,${BY + 37} 552,${BY + 40} 568,${BY + 43} 552,${BY + 46} 560,${BY + 50}`, class: 'tro-otpornik' }, svg);
  T(svg, 574, BY + 47, 'R', 'tro-ls');
  const tok = S('path', { d: `M${BX + 84},${BY + 20} L560,${BY + 20} L560,${BY + 64} L${BX + 84},${BY + 64}`, class: 'tro-tok-struja' }, svg);
  S('rect', { x: 448, y: BY + 10, width: 92, height: 64, rx: 4, class: 'tro-rub-traka' }, svg);
  T(svg, 494, BY + 92, 'sigurnosni rub', 'tro-ls', 'middle');
  const most = S('line', { x1: 494, y1: BY + 20, x2: 494, y2: BY + 64, class: 'tro-most' }, svg);
  const prekX = S('g', {}, svg);
  S('line', { x1: 418, y1: BY + 10, x2: 432, y2: BY + 30, class: 'tro-prekid' }, prekX); S('line', { x1: 432, y1: BY + 10, x2: 418, y2: BY + 30, class: 'tro-prekid' }, prekX);
  // mjerilo struje
  T(svg, 316, 222, 'struja kruga', 'tro-ls');
  S('rect', { x: 316, y: 230, width: 266, height: 18, rx: 4, class: 'tro-traka' }, svg);
  S('rect', { x: 316 + 266 * 0.7 / 3, y: 230, width: 266 * 0.6 / 3, height: 18, class: 'tro-pojas-ok' }, svg);
  const ib = S('rect', { x: 316, y: 233, height: 12, rx: 3, class: 'tro-struja-b' }, svg);
  T(svg, 316 + 266 / 3, 266, 'ispravno', 'tro-ls', 'middle'); T(svg, 582, 266, 'kratki spoj', 'tro-ls', 'end'); T(svg, 316, 266, '0', 'tro-ls');
  const tBump = T(svg, 449, 286, '', 'tro-l', 'middle');
  // pogled odozgo
  const svg2 = ui.svg(600, 200, 'Robot odozgo vozi prema zidu; sigurnosni rub se pri dodiru sabije', 'tro-svg2');
  const ZX = 548;
  S('rect', { x: ZX, y: 6, width: 46, height: 188, fill: svg2.srafura, class: 'tro-presjek' }, svg2);
  T(svg2, 8, 24, 'pogled odozgo', 'tro-ls');
  const rob = robotOdozgo(svg2, SC, { odbojnik: false });
  const rub = S('path', { class: 'tro-rub-odozgo' }, svg2);
  const tRob = T(svg2, 8, 190, '', 'tro-ls');
  const R0 = D.promjer / 2 * SC;
  const X0 = 90;
  const MAXK = 52;                       // px u presjeku: potpuno sabijeno
  function osvjezi() {
    // presjek: komp = sabijanje [px]
    const k = Math.max(st.komp, st.ruka);
    const xo = 176 - k, xi = 140 - k * 0.92;
    prof.setAttribute('d', `M60,110 L${f1(xo - 18)},110 Q${f1(xo)},110 ${f1(xo)},128 L${f1(xo)},192 Q${f1(xo)},210 ${f1(xo - 18)},210 L60,210Z M92,128 L${f1(Math.max(100, xi))},128 L${f1(Math.max(100, xi))},192 L92,192Z`);
    const xv = Math.max(100, xi - 4);
    postavi(vD, { x1: xv, x2: xv });
    const spoj = xi - 4 <= 100.5;
    iskra.style.display = spoj && !st.prekid ? '' : 'none';
    gPr.setAttribute('transform', `translate(${f1(xo + 2)} 0)`);
    tPr.setAttribute('x', f1(xo + 32)); tPr.textContent = st.ruka > 0.5 ? 'ruka' : 'zid';
    tKomp.textContent = spoj ? 'vodljive površine se dodiruju' : k > 0.5 ? 'profil se sabija' : 'raspor između vodljivih površina';
    // krug
    const I = st.prekid ? 0 : spoj ? 2.6 : 1;
    ib.setAttribute('width', f1(Math.max(2, 266 * Math.min(I, 3) / 3 - 6)));
    ib.setAttribute('class', 'tro-struja-b' + (I === 1 ? '' : ' tro-struja-los'));
    most.style.display = spoj && !st.prekid ? '' : 'none';
    prekX.style.display = st.prekid ? '' : 'none';
    zG.classList.toggle('tro-zica-prekid', st.prekid);
    tok.style.opacity = st.prekid ? 0 : 1;
    tok.style.strokeDashoffset = f1(-st.tok * (spoj ? 2.2 : 1));
    if (spoj && !st.prekid) tok.setAttribute('d', `M${BX + 84},${BY + 20} L494,${BY + 20} L494,${BY + 64} L${BX + 84},${BY + 64}`);
    else tok.setAttribute('d', `M${BX + 84},${BY + 20} L560,${BY + 20} L560,${BY + 64} L${BX + 84},${BY + 64}`);
    st.akt = I !== 1;
    tBump.textContent = `/data/bumper → { "value": ${st.akt} }`;
    tBump.setAttribute('class', 'tro-l ' + (st.akt ? 'tro-t-opas' : 'tro-t-ok'));
    // odozgo
    const xr = X0 + st.x * SC;
    rob.postavi(xr, 100, -Math.PI / 2);
    const rr = R0 + 4;
    const p = [];
    for (let a = -Math.PI; a <= Math.PI + 1e-9; a += Math.PI / 60) {
      let x = xr + rr * Math.cos(a), y = 100 + rr * Math.sin(a);
      if (x > ZX - 1) x = ZX - 1;
      p.push([x, y]);
    }
    rub.setAttribute('d', put(p, true));
    rub.classList.toggle('tro-rub-akt', st.akt);
    tRob.textContent = { miruje: 'robot miruje', vozi: `vozi ${hr(st.v, 2)} m/s`, stoji: 'zaustavljen: odbojnik aktivan', gura: 'robot gura zid (zaustavljanje isključeno)', blok: 'ne smije krenuti: odbojnik aktivan' }[st.stanje] || '';
    o.I(st.prekid ? '0 (prekid)' : spoj ? 'povećana (kratki spoj rubom)' : 'mirna struja — ispravno', st.prekid || spoj ? 'opas' : 'ok');
    o.b(String(st.akt), st.akt ? 'opas' : 'ok');
    o.m(st.v > 0.001 ? 'voze' : 'stoje', st.v > 0.001 && st.akt ? 'opas' : '');
    o.w(st.stopWeb ? 'uključeno (zadano)' : 'isključeno', st.stopWeb ? '' : 'upoz');
  }
  ctx.petlja(dt => {
    st.tok += dt * 40;
    // ruka
    st.ruka += ogr(st.rukaCilj - st.ruka, -dt * 120, dt * 120);
    // vožnja
    if (st.voz) {
      if (st.akt && st.stopWeb) { st.v = Math.max(0, st.v - dt * 3); }      // kočenje nakon uklopa
      const xr = X0 + st.x * SC, dodirX = ZX - R0 - 4;
      st.x += st.v * dt * 0.5;
      const xn = X0 + st.x * SC;
      const pen = xn - dodirX;                                             // prodiranje u zid = sabijanje ruba odozgo (px na 400 px/m)
      st.komp = pen > 0 ? pen * 8 : 0;
      if (st.komp >= MAXK) { st.komp = MAXK; st.x = (dodirX + MAXK / 8 - X0) / SC; if (!st.stopWeb) { st.stanje = 'gura'; } st.v = st.stopWeb ? 0 : st.v; }
      if (st.akt && st.stopWeb && st.v < 0.001 && !st.gotovo) {
        st.gotovo = true; st.stanje = 'stoji'; st.voz = false; st.v = 0;
        ui.stanje(`Dodir: komora se sabila, struja kruga se promijenila i robot je stao. Program i kretanje su prekinuti; robot je nakon dodira prešao još oko ${hr(st.komp / 8 / SC * 1000, 0)} mm (ilustracija).`, 'opas');
      } else if (st.stanje === 'gura') {
        ui.stanje('Zaustavljanje na odbojnik je isključeno u web sučelju: signal postoji, ali robot ga ne poštuje i gura zid. Tako se smije raditi samo u posebnim slučajevima i pod nadzorom.', 'opas');
      }
      void xr;
    }
    osvjezi();
    return true;                       // mirna struja teče stalno (animacija toka)
  });
  const r = ui.red();
  ui.gumb('Vozi prema zidu', () => {
    st.x = 0; st.komp = 0; st.gotovo = false;
    if (st.akt) { st.stanje = 'blok'; st.voz = false; st.v = 0; ui.stanje('Odbojnik je aktivan (pritisak ili prekid kabela) — robot ne smije krenuti.', 'opas'); osvjezi(); return; }
    st.voz = true; st.v = 0.3; st.stanje = 'vozi'; ui.stanje('Robot vozi prema zidu 0,3 m/s (prikaz usporen 2×).'); ctx.budi();
  }, { u: r });
  ui.gumb('Pritisni rukom', (e, b) => {
    st.rukaCilj = st.rukaCilj ? 0 : 42; b.setAttribute('aria-pressed', String(!!st.rukaCilj));
    ui.stanje(st.rukaCilj ? 'Ruka pritišće profil: komora se sabija dok se vodljive površine ne dodirnu.' : 'Ruka je puštena: profil se elastično vraća i krug je opet ispravan.', st.rukaCilj ? 'upoz' : 'ok'); ctx.budi();
  }, { tanki: true, pritisak: false, u: r });
  ui.gumb('Ponovi', () => { st.x = 0; st.komp = 0; st.voz = false; st.v = 0; st.stanje = 'miruje'; st.gotovo = false; ui.stanje('Robot je na početku.'); osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  ui.kvacica('Prekid kabela', false, v => { st.prekid = v; ui.stanje(v ? 'Kabel je prekinut: struja pada na nulu. Nadzor to vidi kao aktivan odbojnik — kvar vodi u sigurno stanje.' : 'Kabel je ispravan.', v ? 'opas' : 'ok'); osvjezi(); ctx.budi(); });
  ui.kvacica('Zaustavljanje na odbojnik (web sučelje)', true, v => { st.stopWeb = v; ui.stanje(v ? 'Zaustavljanje na odbojnik je uključeno (zadano).' : 'Zaustavljanje na odbojnik je isključeno — signal se i dalje može čitati (/data/bumper), ali robot sam ne staje.', v ? 'ok' : 'upoz'); osvjezi(); });
  const o = ui.ocit([['I', 'Struja kruga'], ['b', 'Stanje odbojnika (/data/bumper)'], ['m', 'Motori'], ['w', 'Zaustavljanje na odbojnik']]);
  ui.sitno('Rub reagira na dodir po cijelom opsegu robota, i tamo gdje IR senzori zbog razmaka snopova ne vide. Robot nema vlastiti nužni stop (osnovica R3/R4) — u laboratoriju trebaju tipkala za isključenje u nuždi.');
  osvjezi(); ui.stanje('Pritisni „Vozi prema zidu” ili „Pritisni rukom”.'); ctx.budi();
}

/* =========================================================== 8. odometrija i žiroskop */
function tZiroskopOdometrija(ui, ctx) {
  const SC = 115, CX = 300, CY = 215, k = kK();
  const st = { radi: true, put: 'kvadrat', slip: 3, drift: 0.5, brz: 3, t: 0, s: 0 };
  let P, A, Bp, tr, bias, faza;
  const svg = ui.svg(600, 430, 'Pogled odozgo: stvarni put robota, procjena iz enkodera i procjena iz enkodera sa žiroskopom');
  S('rect', { x: 2, y: 2, width: 596, height: 426, rx: 10, class: 'tro-graf' }, svg);
  for (let x = -2.5; x <= 2.5; x += 0.5) S('line', { x1: f1(CX + x * SC), y1: 2, x2: f1(CX + x * SC), y2: 428, class: 'tro-mreza' }, svg);
  for (let y = -1.5; y <= 1.5; y += 0.5) S('line', { x1: 2, y1: f1(CY - y * SC), x2: 598, y2: f1(CY - y * SC), class: 'tro-mreza' }, svg);
  T(svg, 10, 22, 'mreža 0,5 m', 'tro-ls');
  const kT = S('polyline', { class: 'tro-krivulja-i' }, svg), kA = S('polyline', { class: 'tro-krivulja-r' }, svg), kB = S('polyline', { class: 'tro-krivulja' }, svg);
  const rob = robotOdozgo(svg, SC, { kotaci: false });
  const duh = [B.crv, 'var(--teal)'].map(c => { const g = S('g', {}, svg); S('circle', { cx: 0, cy: 0, r: D.promjer / 2 * SC, fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-dasharray': '6 4' }, g); S('line', { x1: 0, y1: 0, x2: D.promjer / 2 * SC, y2: 0, stroke: c, 'stroke-width': 3 }, g); return g; });
  const leg = [['stvarni put', 'tro-krivulja-i'], ['samo enkoderi', 'tro-krivulja-r'], ['enkoderi + žiroskop', 'tro-krivulja']];
  leg.forEach(([t, c], i) => { S('line', { x1: 14, x2: 40, y1: 372 + i * 20, y2: 372 + i * 20, class: c }, svg); T(svg, 48, 377 + i * 20, t, 'tro-ls'); });
  const W = (x, y) => [CX + x * SC, CY - y * SC];

  function pocetak() {
    const p0 = { kvadrat: [-1, -1, 0], kruznica: [0, -1, 0], osmica: [0, 0, Math.PI / 2] }[st.put];
    P = { x: p0[0], y: p0[1], f: p0[2] }; A = { ...P }; Bp = { ...P };
    tr = [[], [], []]; st.t = 0; st.s = 0; faza = 0;
    bias = [0, 1, 2].map(() => 0.3 + Math.random() * 0.7);
  }
  function naredba(t) {
    if (st.put === 'kruznica') return [0.3, 0, 0.3];
    if (st.put === 'osmica') { const T1 = 2 * Math.PI / 0.375; return [0.3, 0, (Math.floor(t / T1) % 2 ? 0.375 : -0.375)]; }
    const Tv = 2 / 0.3, Tr = (Math.PI / 2) / 0.6, tc = t % (Tv + Tr);
    return tc < Tv ? [0.3, 0, 0] : [0, 0, 0.6];
  }
  function korak(h) {
    const [vx, vy, w] = naredba(st.t);
    // stvarno gibanje
    P.f += w * h; P.x += (vx * Math.cos(P.f) - vy * Math.sin(P.f)) * h; P.y += (vx * Math.sin(P.f) + vy * Math.cos(P.f)) * h;
    // izmjereno enkoderima (proklizavanje: kotač se okrene više nego što robot prijeđe)
    const m = D.kutovi.map((th, i) => { const a = th * RAD; const mi = k * (-Math.sin(a) * vx + Math.cos(a) * vy + D.rb * w); return mi * (1 + st.slip / 100 * (bias[i] + (Math.random() - 0.5))); });
    const evx = (m[2] - m[0]) / (Math.sqrt(3) * k), evy = (m[0] + m[2] - 2 * m[1]) / (3 * k), ew = (m[0] + m[1] + m[2]) / (3 * k * D.rb);
    const gw = w + st.drift / 60 * RAD + (Math.random() - 0.5) * 0.002;
    A.f += ew * h; A.x += (evx * Math.cos(A.f) - evy * Math.sin(A.f)) * h; A.y += (evx * Math.sin(A.f) + evy * Math.cos(A.f)) * h;
    Bp.f += gw * h; Bp.x += (evx * Math.cos(Bp.f) - evy * Math.sin(Bp.f)) * h; Bp.y += (evx * Math.sin(Bp.f) + evy * Math.cos(Bp.f)) * h;
    st.t += h; st.s += Math.hypot(vx, vy) * h;
  }
  function osvjezi() {
    const zadnja = (t, p) => { const z = t[t.length - 1]; if (!z || Math.hypot(z[0] - p.x, z[1] - p.y) > 0.015) { t.push([p.x, p.y]); if (t.length > 2500) t.shift(); } };
    zadnja(tr[0], P); zadnja(tr[1], A); zadnja(tr[2], Bp);
    kT.setAttribute('points', pts(tr[0].map(q => W(q[0], q[1]))));
    kA.setAttribute('points', pts(tr[1].map(q => W(q[0], q[1]))));
    kB.setAttribute('points', pts(tr[2].map(q => W(q[0], q[1]))));
    const [x, y] = W(P.x, P.y); rob.postavi(x, y, P.f - Math.PI / 2);
    [A, Bp].forEach((q, i) => { const [a, b] = W(q.x, q.y); duh[i].setAttribute('transform', `translate(${f1(ogr(a, -50, 650))} ${f1(ogr(b, -50, 480))}) rotate(${f1(-q.f / RAD)})`); });
    const eA = Math.hypot(A.x - P.x, A.y - P.y), eB = Math.hypot(Bp.x - P.x, Bp.y - P.y);
    const fA = kutN(A.f - P.f) / RAD, fB = kutN(Bp.f - P.f) / RAD;
    o.t(hr(st.t, 0) + ' s · ' + hr(st.s, 1) + ' m');
    o.eA(hr(eA * 100, 1) + ' cm · ' + hrp(fA, 1) + '°', eA > 0.2 ? 'opas' : eA > 0.05 ? 'upoz' : 'ok');
    o.eB(hr(eB * 100, 1) + ' cm · ' + hrp(fB, 1) + '°', eB > 0.2 ? 'opas' : eB > 0.05 ? 'upoz' : 'ok');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const T = dt * st.brz, n = Math.ceil(T / 0.02);
    for (let i = 0; i < n; i++) korak(T / n);
    osvjezi();
    return true;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r).osvjezi();
  ui.gumb('Udarac (zakret 15°)', () => {
    P.f += 15 * RAD;
    ui.stanje('Udarac: robot se zakrenuo za 15°, a kotači se pritom nisu okrenuli. Enkoderi to ne vide — crvena procjena zauvijek ima krivi smjer. Žiroskop je zakret izmjerio, pa tirkizna procjena zadržava smjer.', 'upoz');
    osvjezi(); ctx.budi();
  }, { tanki: true, u: r });
  ui.gumb('Ponovi', () => { pocetak(); osvjezi(); ui.stanje('Nova vožnja s novim slučajnim proklizavanjem kotača.'); ctx.budi(); }, { tanki: true, u: r });
  ui.seg('Putanja', [['kvadrat', 'Kvadrat 2 × 2 m'], ['kruznica', 'Kružnica r = 1 m'], ['osmica', 'Osmica']], 'kvadrat', v => { st.put = v; pocetak(); osvjezi(); ctx.budi(); });
  ui.klizac('Proklizavanje kotača', 0, 10, 0.5, st.slip, v => hr(v, 1) + ' %', v => { st.slip = v; });
  ui.klizac('Drift žiroskopa', 0, 5, 0.1, st.drift, v => hr(v, 1) + ' °/min', v => { st.drift = v; });
  ui.klizac('Ubrzanje prikaza', 1, 8, 1, st.brz, v => v + '×', v => { st.brz = v; });
  const o = ui.ocit([['t', 'Vrijeme · prijeđeni put'], ['eA', 'Pogreška: samo enkoderi (položaj · kut)'], ['eB', 'Pogreška: enkoderi + žiroskop']]);
  ui.sitno('Kutna pogreška δφ nakon puta s daje bočni pomak približno s·δφ: već 2° na 5 m znači 17 cm. Zato je ispravak kuta žiroskopom najvažniji dio odometrije. Stvarni položaj na karti daje tek lokalizacija (laserom).');
  pocetak(); osvjezi();
  ui.stanje('Crna crta je stvarni put. Pri proklizavanju se crvena procjena brzo odvaja, tirkizna puno sporije.');
  ctx.budi();
}

/* =========================================================== 9. optički senzori — slijeđenje crte */
function tOptickiSenzori(ui, ctx) {
  const SC = 200, OX = 300, OY = 150, WL = 0.019, XS = 0.12;      // px/m, ishodište, širina crte, položaj senzora ispred središta (pretpostavke)
  const st = { radi: true, nacin: 'voz', v: 0.15, sp: 30, x: -0.2, y: -0.5, f: 0, L: 0, R: 0, mL: 0, mR: 0, stoj: 0, ign: 0, izgub: false, trag: [] };
  // staza (ovalna), u metrima, smjer suprotno od kazaljke
  const staza = [];
  for (let i = 0; i <= 40; i++) staza.push([-0.8 + 1.6 * i / 40, -0.5]);
  for (let i = 1; i <= 40; i++) { const a = -Math.PI / 2 + Math.PI * i / 40; staza.push([0.8 + 0.5 * Math.cos(a), 0.5 * Math.sin(a)]); }
  for (let i = 1; i <= 40; i++) staza.push([0.8 - 1.6 * i / 40, 0.5]);
  for (let i = 1; i <= 40; i++) { const a = Math.PI / 2 + Math.PI * i / 40; staza.push([-0.8 + 0.5 * Math.cos(a), 0.5 * Math.sin(a)]); }
  const OZN = { x: 0, y: 0.5, du: 0.0125, po: 0.045 };           // poprečna oznaka na gornjem pravcu
  function udalj(px, py) {
    let best = 1e9;
    for (let i = 1; i < staza.length; i++) {
      const [ax, ay] = staza[i - 1], [bx, by] = staza[i], ex = bx - ax, ey = by - ay;
      const t = ogr(((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey), 0, 1);
      const d = Math.hypot(px - ax - ex * t, py - ay - ey * t);
      if (d < best) best = d;
    }
    return best;
  }
  const naOzn = (px, py) => Math.abs(px - OZN.x) < OZN.du && Math.abs(py - OZN.y) < OZN.po;
  const W = (x, y) => [OX + x * SC, OY - y * SC];
  // --- bočni pogled (presjek ispod senzora)
  const svg = ui.svg(600, 200, 'Presjek ispod robota: dva refleksna senzora sa svjetlovodima osvjetljavaju pod crvenom svjetlošću; tamna crta vraća malo svjetla');
  T(svg, 10, 22, 'presjek ispod senzora (pogled straga, uvećano)', 'tro-ls');
  const tSen = T(svg, 300, 196, '', 'tro-ls', 'middle');
  S('rect', { x: 0, y: 150, width: 600, height: 26, class: 'tro-podloga' }, svg);
  const crta = S('rect', { y: 150, width: WL * 4000, height: 26, class: 'tro-crta' }, svg);
  const SEN = ['L', 'D'].map(n => {
    const g = S('g', {}, svg);
    S('rect', { x: -26, y: 34, width: 52, height: 34, rx: 5, class: 'tro-pojacalo' }, g);
    const led = S('circle', { cx: 16, cy: 44, r: 5, class: 'tro-lampa' }, g);
    T(g, -14, 58, n, 'tro-lb tro-na-tamnom');
    S('path', { d: 'M-6,68 L-6,112 M6,68 L6,112', class: 'tro-svjetlovod' }, g);
    const kon = S('polygon', { points: '-6,114 6,114 18,150 -18,150', class: 'tro-konus' }, g);
    const pov = S('line', { x1: 8, y1: 146, x2: 8, y2: 118, class: 'tro-povrat' }, g);
    return { g, led, kon, pov };
  });
  // --- staza odozgo
  const svg2 = ui.svg(600, 300, 'Pogled odozgo: robot slijedi crnu crtu na ovalnoj stazi s poprečnom oznakom', 'tro-svg2');
  S('rect', { x: 2, y: 2, width: 596, height: 296, rx: 10, class: 'tro-podloga' }, svg2);
  S('polyline', { points: pts(staza.map(p => W(p[0], p[1]))), class: 'tro-staza', 'stroke-width': Math.max(4, WL * SC) }, svg2);
  S('rect', { x: W(OZN.x - OZN.du, 0)[0], y: W(0, OZN.y + OZN.po)[1], width: 2 * OZN.du * SC, height: 2 * OZN.po * SC, class: 'tro-crta' }, svg2);
  T(svg2, W(0, 0.5)[0] + 12, W(0, 0.5)[1] - 12, 'oznaka', 'tro-ls tro-na-podlozi');
  const kTr = S('polyline', { class: 'tro-trag' }, svg2);
  const rob = robotOdozgo(svg2, SC, { kotaci: false });
  rob.classList.add('tro-proziran');
  const tocL = S('circle', { r: 5, class: 'tro-senz' }, svg2), tocR = S('circle', { r: 5, class: 'tro-senz' }, svg2);
  const sOk = strel(svg2, 0, 0, 0, 0, { boja: B.lj, w: 3, gl: 10 });
  // --- tablica logike
  const tab = H('table', { class: 'tro-tab' });
  tab.append(H('thead', {}, H('tr', {}, H('th', { tekst: 'L' }), H('th', { tekst: 'D' }), H('th', { tekst: 'naredba' }))));
  const tb = H('tbody');
  const RED = [[0, 0, 'vozi ravno (crta je između senzora)'], [1, 0, 'skreni lijevo (ω > 0)'], [0, 1, 'skreni desno (ω < 0)'], [1, 1, 'poprečna oznaka: stani']];
  const redovi = RED.map(([l, r, t]) => { const tr = H('tr', {}, H('td', { tekst: String(l) }), H('td', { tekst: String(r) }), H('td', { tekst: t })); tb.append(tr); return tr; });
  tab.append(tb);

  function senzoriSvijet() {
    const c = Math.cos(st.f), s = Math.sin(st.f), h = st.sp / 2000;
    return [[st.x + c * XS - s * h, st.y + s * XS + c * h], [st.x + c * XS + s * h, st.y + s * XS - c * h]];
  }
  function ocitaj() {
    const [pl, pr] = senzoriSvijet();
    const on = p => (udalj(p[0], p[1]) < WL / 2 || naOzn(p[0], p[1])) ? 1 : 0;
    return [on(pl), on(pr)];
  }
  function osvjezi() {
    const L = st.nacin === 'voz' ? st.L : st.mL, R = st.nacin === 'voz' ? st.R : st.mR;
    // presjek: bočni pomak crte prema sredini reda senzora (u sustavu robota, + = lijevo)
    const c = Math.cos(st.f), s = Math.sin(st.f);
    const sx = st.x + c * XS, sy = st.y + s * XS;
    let ey = 0, best = 1e9;
    for (let d = -0.15; d <= 0.15; d += 0.0025) { const px = sx - s * d, py = sy + c * d; const u = udalj(px, py); if (u < best) { best = u; ey = d; } }
    const naO = naOzn(sx, sy);
    if (st.nacin === 'rucno') { const wpx = L && R ? Math.max(WL * 4000, st.sp * 4 + 60) : WL * 4000; crta.setAttribute('x', f1(300 - (L && R ? 0 : L ? st.sp * 2 : R ? -st.sp * 2 : 0) - wpx / 2)); crta.setAttribute('width', f1(wpx)); }
    else if (naO) { crta.setAttribute('x', 300 - 160); crta.setAttribute('width', 320); }
    else { crta.setAttribute('x', f1(300 - ey * 4000 - WL * 2000)); crta.setAttribute('width', f1(WL * 4000)); }
    crta.style.display = (st.nacin === 'rucno' && !L && !R) || (st.nacin === 'voz' && best > 0.14 && !naO) ? 'none' : '';
    tSen.textContent = `L: ${L ? 'crta → 1' : 'podloga → 0'}   ·   D: ${R ? 'crta → 1' : 'podloga → 0'}`;
    [[SEN[0], L, -st.sp * 2], [SEN[1], R, st.sp * 2]].forEach(([q, v, x]) => {
      q.g.setAttribute('transform', `translate(${f1(300 + x)} 0)`);
      q.led.classList.toggle('tro-lampa-on', !!v);
      q.pov.style.opacity = v ? 0.15 : 0.95;
    });
    // odozgo
    const [X, Y] = W(st.x, st.y);
    rob.postavi(X, Y, st.f - Math.PI / 2);
    const [pl, pr] = senzoriSvijet();
    postavi(tocL, { cx: W(...pl)[0], cy: W(...pl)[1] }); postavi(tocR, { cx: W(...pr)[0], cy: W(...pr)[1] });
    tocL.classList.toggle('tro-senz-on', !!L); tocR.classList.toggle('tro-senz-on', !!R);
    kTr.setAttribute('points', pts(st.trag.map(p => W(p[0], p[1]))));
    const om = L && !R ? 1 : R && !L ? -1 : 0;
    if (om) { const a = st.f + om * 0.9, [ex, ey2] = W(st.x + Math.cos(a) * 0.32, st.y + Math.sin(a) * 0.32), [bx, by] = W(st.x + Math.cos(st.f) * 0.3, st.y + Math.sin(st.f) * 0.3); sOk.style.display = ''; sOk.set(bx, by, ex, ey2); }
    else sOk.style.display = 'none';
    redovi.forEach((tr, i) => tr.classList.toggle('tro-akt', RED[i][0] === L && RED[i][1] === R));
    o.s(`L = ${L} · D = ${R}`); o.n(RED.find(r => r[0] === L && r[1] === R)[2]);
    o.sp(st.sp + ' mm' + (st.sp <= WL * 1000 ? ' — manji od širine crte!' : ''), st.sp <= WL * 1000 ? 'opas' : '');
  }
  ctx.petlja(dt => {
    if (!st.radi || st.nacin !== 'voz' || st.izgub) { osvjezi(); return false; }
    const n = Math.ceil(dt / 0.005);
    for (let i = 0; i < n; i++) {
      const h = dt / n;
      [st.L, st.R] = ocitaj();
      let v = st.v, w = 0;
      if (st.stoj > 0) { st.stoj -= h; v = 0; if (st.stoj <= 0) st.ign = 0.6; }
      else if (st.L && st.R && st.ign <= 0) { st.stoj = 2; v = 0; ui.stanje(st.sp <= WL * 1000 ? 'Oba senzora vide crtu, a nije oznaka: razmak senzora je manji od širine crte, pa logika ne može razlikovati oznaku od same crte.' : 'Oba senzora vide tamno: poprečna oznaka. Robot stoji 2 s (npr. postaja), pa nastavlja.', st.sp <= WL * 1000 ? 'opas' : 'plavo'); }
      else if (st.L && !st.R) w = st.v / 0.2;
      else if (st.R && !st.L) w = -st.v / 0.2;
      if (st.ign > 0) st.ign -= h;
      st.f += w * h; st.x += v * Math.cos(st.f) * h; st.y += v * Math.sin(st.f) * h;
    }
    const z = st.trag[st.trag.length - 1];
    if (!z || Math.hypot(z[0] - st.x, z[1] - st.y) > 0.01) { st.trag.push([st.x, st.y]); if (st.trag.length > 900) st.trag.shift(); }
    const c = Math.cos(st.f), s = Math.sin(st.f);
    if (udalj(st.x + c * XS, st.y + s * XS) > 0.12) { st.izgub = true; ui.stanje('Crta je izgubljena: oba senzora vide podlogu, a crta je predaleko. Jednostavna logika ne zna na koju stranu tražiti — robot stoji. Pritisni „Na početak”.', 'opas'); }
    else if (st.stoj <= 0 && st.ign <= 0) ui.stanje(st.L ? 'Lijevi senzor vidi crtu → skreni lijevo.' : st.R ? 'Desni senzor vidi crtu → skreni desno.' : 'Oba senzora vide podlogu → vozi ravno.', st.L || st.R ? 'upoz' : 'ok');
    osvjezi();
    return true;
  });
  ui.seg('Način', [['voz', 'Vožnja po crti'], ['rucno', 'Ručno: sam zadaj senzore']], 'voz', v => {
    st.nacin = v; gR.style.display = v === 'rucno' ? '' : 'none';
    ui.stanje(v === 'rucno' ? 'Uključi lijevi i desni senzor i promatraj koju naredbu daje logika.' : 'Vožnja po crti.'); osvjezi(); ctx.budi();
  });
  const gR = ui.red();
  ui.gumb('Lijevi senzor L', (e, b) => { st.mL ^= 1; b.setAttribute('aria-pressed', String(!!st.mL)); osvjezi(); }, { tanki: true, pritisak: false, u: gR });
  ui.gumb('Desni senzor D', (e, b) => { st.mR ^= 1; b.setAttribute('aria-pressed', String(!!st.mR)); osvjezi(); }, { tanki: true, pritisak: false, u: gR });
  gR.style.display = 'none';
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r).osvjezi();
  ui.gumb('Na početak', () => { st.x = -0.2; st.y = -0.5; st.f = 0; st.trag = []; st.stoj = 0; st.ign = 0; st.izgub = false; ui.stanje('Robot je na početku staze.'); osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  ui.klizac('Brzina vožnje', 0.05, 0.3, 0.01, st.v, v => hr(v, 2) + ' m/s', v => { st.v = v; });
  ui.klizac('Razmak senzora', 10, 60, 2, st.sp, v => v + ' mm', v => { st.sp = v; osvjezi(); });
  ui.ocitP.append(tab);
  const o = ui.ocit([['s', 'Senzori (1 = vidi crtu)'], ['n', 'Naredba'], ['sp', 'Razmak senzora (crta 19 mm)']]);
  ui.sitno('Dvopoložajna logika daje samo tri naredbe, pa robot vijuga oko crte. Što je brzina veća, to je ljuljanje jače i lakše promaši zavoj. Senzori daju samo 0 ili 1 — postupni prijelaz s podloge na crtu ne vide.');
  osvjezi(); ui.stanje('Pritisni „Pokreni”.'); ctx.budi();
}

/* =========================================================== 10. laserski skener */
function tLaserSkener(ui, ctx) {
  const SC = 90, OX = 12, OY = 390;
  const st = { radi: true, tip: 'hokuyo', raz: 'puna', usp: 30, kut: 0, sken: [], stari: [], cov: 1.6, t: 0, polje: 'slobodno' };
  const ROB = { x: 1.4, y: 1.8, f: 0 }, LZ = 0.2;
  const W = (x, y) => [OX + x * SC, OY - y * SC];
  const pr = [];
  const seg = (a, b) => pr.push({ tip: 'seg', a, b });
  seg([0, 0], [6.4, 0]); seg([6.4, 0], [6.4, 1.6]); seg([6.4, 2.4], [6.4, 4.2]); seg([6.4, 4.2], [0, 4.2]); seg([0, 4.2], [0, 0]);
  seg([4.2, 2.9], [5.0, 2.9]); seg([5.0, 2.9], [5.0, 3.6]); seg([5.0, 3.6], [4.2, 3.6]); seg([4.2, 3.6], [4.2, 2.9]);
  for (const c of [[2.2, 3.2], [3.2, 3.2], [2.2, 3.9], [3.2, 3.9]]) pr.push({ tip: 'krug', c, r: 0.03 });
  pr.push({ tip: 'krug', c: [4.6, 1.0], r: 0.18 });
  const cov = { tip: 'krug', c: [0, 0], r: 0.2 };
  pr.push(cov);
  // --- načelo
  const svg = ui.svg(600, 190, 'Načelo laserskog skenera: laserska dioda, zrcalo pod 45° koje vrti motor, izlazni snop prema prepreci i povratna svjetlost prema prijemniku');
  S('rect', { x: 30, y: 20, width: 150, height: 160, rx: 12, class: 'tro-kuciste' }, svg);
  S('rect', { x: 70, y: 28, width: 70, height: 30, rx: 4, class: 'tro-motor' }, svg); T(svg, 105, 48, 'motor', 'tro-ls tro-na-svijetlom', 'middle');
  S('line', { x1: 105, y1: 58, x2: 105, y2: 84, class: 'tro-vratilo' }, svg);
  const zrc = S('ellipse', { cx: 105, cy: 100, rx: 24, ry: 6, class: 'tro-zrcalo', transform: 'rotate(-45 105 100)' }, svg);
  S('rect', { x: 92, y: 150, width: 26, height: 20, rx: 3, class: 'tro-led' }, svg);
  S('line', { x1: 105, y1: 150, x2: 105, y2: 104, class: 'tro-laser' }, svg);
  const izl = S('line', { x1: 108, y1: 100, x2: 520, y2: 100, class: 'tro-laser' }, svg);
  const pov = S('line', { x1: 520, y1: 112, x2: 160, y2: 112, class: 'tro-laser tro-laser-p' }, svg);
  S('rect', { x: 128, y: 120, width: 30, height: 24, rx: 3, class: 'tro-det' }, svg);
  S('rect', { x: 176, y: 80, width: 6, height: 50, class: 'tro-prozor' }, svg);
  S('rect', { x: 520, y: 40, width: 22, height: 130, class: 'tro-predmet' }, svg);
  T(svg, 196, 160, 'laserska dioda → zrcalo 45° → prepreka', 'tro-ls'); T(svg, 196, 180, 'povrat → prijemnik → udaljenost', 'tro-ls');
  T(svg, 196, 90, 'izlazni snop', 'tro-ls'); T(svg, 196, 132, 'odbijena svjetlost', 'tro-ls');
  const tKut = T(svg, 300, 30, '', 'tro-l', 'middle');
  // --- prostorija
  const svg2 = ui.svg(600, 400, 'Prostorija odozgo: robot s laserskim skenerom, zraka koja se vrti i oblak izmjerenih točaka', 'tro-svg2');
  S('rect', { x: 0, y: 0, width: 600, height: 400, class: 'tro-graf' }, svg2);
  for (const o2 of pr) {
    if (o2 === cov) continue;
    if (o2.tip === 'seg') { const [x1, y1] = W(...o2.a), [x2, y2] = W(...o2.b); S('line', { x1, y1, x2, y2, class: 'tro-zid-t' }, svg2); }
    else { const [x, y] = W(...o2.c); S('circle', { cx: f1(x), cy: f1(y), r: o2.r * SC, class: 'tro-prepreka' }, svg2); }
  }
  const gPolja = S('g', {}, svg2);
  const pZ = S('polygon', { class: 'tro-polje-z' }, gPolja), pU = S('polygon', { class: 'tro-polje-u' }, gPolja);
  const mrtvi = S('path', { class: 'tro-mrtvi-kut' }, svg2);
  const covEl = S('g', {}, svg2); S('circle', { cx: 0, cy: 0, r: cov.r * SC, class: 'tro-covjek' }, covEl); S('circle', { cx: 0, cy: 0, r: 7, class: 'tro-covjek-g' }, covEl);
  const oblakS = S('path', { class: 'tro-oblak tro-oblak-s' }, svg2), oblak = S('path', { class: 'tro-oblak' }, svg2);
  const zr = S('line', { class: 'tro-laser-z' }, svg2);
  const rob = robotOdozgo(svg2, SC, { kotaci: false }); rob.postavi(...W(ROB.x, ROB.y), ROB.f - Math.PI / 2);
  T(svg2, 20, 42, 'prostorija 6,4 × 4,2 m · točke = sken', 'tro-ls');
  const tStanje = T(svg2, 580, 42, '', 'tro-l', 'end');

  const P = () => st.tip === 'hokuyo' ? { kut: D.hokuyo.kut, korak: st.raz === 'puna' ? D.hokuyo.korak : D.hokuyo.korak * 10, max: D.hokuyo.dMax, min: D.hokuyo.dMin } : { kut: D.nano.kut, korak: st.raz === 'puna' ? 0.5 : 5, max: D.nano.zastitnoMax, min: 0.05 };
  const sken0 = () => [ROB.x + LZ * Math.cos(ROB.f), ROB.y + LZ * Math.sin(ROB.f)];
  function mjeri(a) {      // a: kut od osi x robota [rad]
    const [sx, sy] = sken0(), g = ROB.f + a, p = P();
    const d = zraka(sx, sy, Math.cos(g), Math.sin(g), pr);
    return d >= p.min && d <= p.max ? d : null;
  }
  const polja = { z: [[LZ, -0.3], [LZ + 0.6, -0.3], [LZ + 0.6, 0.3], [LZ, 0.3]], u: [[LZ, -0.4], [LZ + 1.2, -0.4], [LZ + 1.2, 0.4], [LZ, 0.4]] };
  const uPolju = (q, x, y) => x >= q[0][0] && x <= q[1][0] && y >= q[0][1] && y <= q[2][1];
  function provjeriPolja() {
    if (st.tip !== 'nano') return 'slobodno';
    let z = false, u = false;
    for (let a = -D.nano.kut / 2; a <= D.nano.kut / 2; a += 1) {
      const d = mjeri(a * RAD); if (d == null) continue;
      const x = LZ + d * Math.cos(a * RAD), y = d * Math.sin(a * RAD);
      if (uPolju(polja.z, x, y)) z = true; else if (uPolju(polja.u, x, y)) u = true;
    }
    return z ? 'zastitno' : u ? 'upoz' : 'slobodno';
  }
  const tockaPut = arr => arr.map(([x, y]) => { const [X, Y] = W(x, y); return `M${f1(X - 1.6)},${f1(Y - 1.6)}h3.2v3.2h-3.2Z`; }).join('');
  function osvjezi() {
    const p = P();
    cov.c = [ROB.x + LZ + st.cov, ROB.y + 0.05];
    covEl.setAttribute('transform', `translate(${f1(W(...cov.c)[0])} ${f1(W(...cov.c)[1])})`);
    const loc = q => q.map(([x, y]) => W(ROB.x + x * Math.cos(ROB.f) - y * Math.sin(ROB.f), ROB.y + x * Math.sin(ROB.f) + y * Math.cos(ROB.f)));
    gPolja.style.display = st.tip === 'nano' ? '' : 'none';
    pZ.setAttribute('points', pts(loc(polja.z))); pU.setAttribute('points', pts(loc(polja.u)));
    const [sx, sy] = sken0(), [SX, SY] = W(sx, sy);
    const mk = (180 - p.kut / 2) * RAD;
    const a0 = -(ROB.f + Math.PI) - mk, a1 = -(ROB.f + Math.PI) + mk;
    mrtvi.setAttribute('d', `M${f1(SX)},${f1(SY)} L${f1(SX + 60 * Math.cos(a0))},${f1(SY + 60 * Math.sin(a0))} A60,60 0 0 1 ${f1(SX + 60 * Math.cos(a1))},${f1(SY + 60 * Math.sin(a1))}Z`);
    oblak.setAttribute('d', tockaPut(st.sken)); oblakS.setAttribute('d', tockaPut(st.stari));
    const a = st.kut * RAD, d = mjeri(a), L = d == null ? p.max : d, g = ROB.f + a;
    postavi(zr, { x1: SX, y1: SY, x2: W(sx + L * Math.cos(g), sy + L * Math.sin(g))[0], y2: W(sx + L * Math.cos(g), sy + L * Math.sin(g))[1] });
    zr.classList.toggle('tro-laser-bez', d == null);
    // načelo
    izl.setAttribute('x2', 520); pov.style.opacity = d == null ? 0 : 1;
    zrc.setAttribute('rx', f1(6 + 18 * Math.abs(Math.cos(a))));
    tKut.textContent = `θ = ${hrp(st.kut, 1)}° · d = ${d == null ? 'nema odraza' : hr(d, 2) + ' m'}`;
    st.polje = provjeriPolja();
    tStanje.textContent = st.tip === 'nano' ? { slobodno: 'polja slobodna: vozi', upoz: 'upozoravajuće polje: uspori', zastitno: 'zaštitno polje: OSSD isključen — stoj' }[st.polje] : '';
    tStanje.setAttribute('class', 'tro-l ' + (st.polje === 'zastitno' ? 'tro-t-opas' : st.polje === 'upoz' ? 'tro-t-upoz' : 'tro-t-ok'));
    const n = Math.floor(p.kut / p.korak) + 1;
    o.m(st.tip === 'hokuyo' ? D.hokuyo.tip : D.nano.tip);
    o.k(`${p.kut}° · korak ${hr(p.korak, 3)}°${st.tip === 'nano' ? ' (prikaz)' : ''}`);
    o.n(st.tip === 'hokuyo' ? `${n} točaka po skenu · ${tis(n * D.hokuyo.f)} u sekundi` : `${n} zraka u prikazu`);
    o.f(st.tip === 'hokuyo' ? `${D.hokuyo.f} Hz (${1000 / D.hokuyo.f} ms po skenu)` : `odziv najviše ${D.nano.odziv} ms`);
    o.d(st.tip === 'hokuyo' ? `${hr(D.hokuyo.dMin, 2)}–${hr(D.hokuyo.dMax, 1)} m` : `zaštitno polje do ${D.nano.zastitnoMax} m`);
    o.c(hr(st.cov, 2) + ' m ispred skenera');
    if (st.tip === 'nano') o.p({ slobodno: 'slobodno', upoz: 'upozoravajuće — uspori', zastitno: 'zaštitno — OSSD isključen' }[st.polje], st.polje === 'zastitno' ? 'opas' : st.polje === 'upoz' ? 'upoz' : 'ok');
    else o.p('— (Hokuyo nema sigurnosnih polja)');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const p = P(), T = 1 / D.hokuyo.f * st.usp;            // trajanje jednog prolaza u prikazu
    const brz = p.kut / T;                                  // °/s
    const k0 = st.kut, k1 = Math.min(p.kut / 2, st.kut + brz * dt);
    const i0 = Math.ceil((k0 + p.kut / 2) / p.korak - 1e-9), i1 = Math.floor((k1 + p.kut / 2) / p.korak + 1e-9);
    const [sx, sy] = sken0();
    for (let i = i0; i <= i1; i++) {
      const a = (-p.kut / 2 + i * p.korak) * RAD, d = mjeri(a);
      if (d != null) st.sken.push([sx + d * Math.cos(ROB.f + a), sy + d * Math.sin(ROB.f + a)]);
    }
    st.kut = k1 + (i1 >= i0 ? 1e-6 : 0);
    if (k1 >= p.kut / 2) { st.stari = st.sken; st.sken = []; st.kut = -p.kut / 2; }
    osvjezi();
    return true;
  });
  const ponovo = () => { st.sken = []; st.stari = []; st.kut = -P().kut / 2; };
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r).osvjezi();
  ui.seg('Skener', [['hokuyo', 'Hokuyo URG-04LX-UG01'], ['nano', 'SICK nanoScan3 (CP-MR)']], 'hokuyo', v => {
    st.tip = v; ponovo();
    ui.stanje(v === 'nano' ? 'Sigurnosni skener: crveno je zaštitno, žuto upozoravajuće polje. Približi čovjeka.' : `Mjerni skener: ${D.hokuyo.kut}°, ${D.hokuyo.f} skenova u sekundi. Sivi isječak iza robota je mrtvi kut.`, v === 'nano' ? 'plavo' : '');
    osvjezi(); ctx.budi();
  });
  ui.seg('Razlučivost prikaza', [['puna', 'Stvarna'], ['rijetka', '10 × rjeđa (vide se zrake)']], 'puna', v => { st.raz = v; ponovo(); osvjezi(); });
  ui.klizac('Usporenje prikaza', 10, 60, 5, st.usp, v => v + '×', v => { st.usp = v; });
  ui.klizac('Čovjek ispred robota', 0.3, 3, 0.05, st.cov, v => hr(v, 2) + ' m', v => { st.cov = v; osvjezi(); const p0 = st.polje; if (st.tip === 'nano') ui.stanje(p0 === 'zastitno' ? 'Čovjek je u zaštitnom polju: OSSD izlazi su isključeni, sigurnosna logika zaustavlja pogon. Signalni stup: narančasta svijetli stalno.' : p0 === 'upoz' ? 'Čovjek je u upozoravajućem polju: robot usporava.' : 'Polja su slobodna — robot smije voziti punom brzinom.', p0 === 'zastitno' ? 'opas' : p0 === 'upoz' ? 'upoz' : 'ok'); });
  const o = ui.ocit([['m', 'Skener'], ['k', 'Kut · korak'], ['n', 'Točaka'], ['f', 'Brzina'], ['d', 'Domet'], ['c', 'Čovjek'], ['p', 'Sigurnosna polja']]);
  ui.sitno(`Broj točaka: ${D.hokuyo.kut}° / ${hr(D.hokuyo.korak, 3)}° ≈ ${Math.floor(D.hokuyo.kut / D.hokuyo.korak) + 1} po skenu [izračun]. Prozirne i crne sjajne površine odbijaju malo svjetla, pa ih skener može ne vidjeti; zato su markeri stanice za punjenje od reflektirajućeg materijala.`);
  ponovo(); osvjezi(); ui.stanje(`Zraka se vrti; svaka točka je jedno mjerenje udaljenosti. Sivi isječak iza robota je mrtvi kut (${360 - D.hokuyo.kut}°).`); ctx.budi();
}

/* =========================================================== 11. upravljačka jedinica */
function tUpravljackaJedinica(ui, ctx) {
  const USP = 5, WIN = 3, PUT = 0.05;
  const st = { salje: true, veza: true, int: 100, t: 0, tn: 0, zadnja: 0, v: 0, paketi: [], hist: [], stopovi: 0, bio: true, tok: 0 };
  const OPIS = {
    kl: 'Korisnički program: Robotino View (grafički), vlastiti program preko REST-a (HTTP, port 80), API2 (C++/Python) ili ROS. Šalje naredbe gibanja i čita senzore, najčešće preko WLAN-a.',
    pc: 'Ugradbeno računalo COM Express (R4: Intel i5 8. gen., 8 GB RAM, 64 GB SSD, Ubuntu 18.04 LTS). Vrti Robotino OS: web sučelje, REST poslužitelj, API2, Robotino View i obradu podataka lasera i kamere.',
    wd: `Nadzor naredbi: ako naredba /data/omnidrive ne stigne unutar ${D.rest} ms, zadana brzina postaje nula i robot staje. Razinu na kojoj je nadzor izveden izvor ne navodi.`,
    usb: 'Laserski skener (Hokuyo, USB — podaci i napajanje) i kamera (RealSense D435, USB 3.0) spajaju se izravno na računalo; njihovi podaci idu u navigaciju i obradu slike.',
    mk: '32-bitni mikrokontroler s vlastitim Ethernet sučeljem: PI regulacija brzine svakog motora (1 kHz), PWM za do 4 motora, brojanje enkodera, A/D pretvorba IR senzora, odbojnik, digitalni i analogni ulazi, izlazi i releji.',
    sen: '9 IR senzora (po 3 na plosnatom kabelu), odbojnik, 8 DI, 8 DO, 8 AI, 2 releja — sve preko ploče za razvod napajanja i I/O priključaka.',
    hm: 'H-mostovi: za svaki motor četiri sklopke koje iz PWM signala daju napon 0–24 V s predznakom za smjer vrtnje. Na H-mostu se mjeri i struja motora.',
    mot: 'Tri pogonska motora (i priključak za četvrti) s inkrementalnim enkoderima; signali enkodera vraćaju se mikrokontroleru.'
  };
  const svg = ui.svg(600, 360, 'Shema upravljanja: korisnički program, WLAN, ugradbeno računalo s nadzorom naredbi, Ethernet, mikrokontroler, H-mostovi, motori i senzori');
  const blokovi = {};
  const blok = (k, x, y, w, h, t1, t2, t3) => {
    const g = S('g', { class: 'tro-rb' }, svg); S('rect', { x, y, width: w, height: h, rx: 8 }, g);
    T(g, x + 10, y + 24, t1, 'tro-l'); if (t2) T(g, x + 10, y + 44, t2, 'tro-ls'); if (t3) T(g, x + 10, y + 64, t3, 'tro-ls');
    blokovi[k] = g; klikabilno(ctx, g, t1, () => odaberi(k)); return g;
  };
  blok('kl', 8, 14, 190, 84, 'korisnički program', 'Robotino View · REST', 'API2 · ROS');
  blok('pc', 250, 14, 342, 120, 'računalo COM Express', 'Ubuntu · Robotino OS', 'REST :80 · API2 · web sučelje');
  blok('wd', 412, 88, 172, 38, 'nadzor 200 ms', '', '');
  blok('usb', 8, 132, 190, 60, 'laser, kamera', 'USB', '');
  blok('mk', 250, 184, 342, 78, '32-bitni mikrokontroler', 'PI 1 kHz · PWM · enkoderi', 'IR (A/D) · odbojnik · I/O');
  blok('sen', 8, 214, 190, 64, 'IR ×9, odbojnik', 'ulazi i izlazi', '');
  blok('hm', 250, 296, 160, 56, 'H-mostovi', 'PWM → 0–24 V', '');
  blok('mot', 432, 296, 160, 56, 'motori M1–M3', '+ enkoderi', '');
  const vod = (pp, kl, nat, nx, ny) => { S('polyline', { points: pts(pp), class: 'tro-vod-r' }, svg); const t = S('polyline', { points: pts(pp), class: 'tro-tok-r' + (kl ? ' ' + kl : '') }, svg); if (nat) T(svg, nx, ny, nat, 'tro-ls', nx === 532 ? 'end' : null); return t; };
  const wlan = [[198, 56], [250, 56]];
  S('polyline', { points: pts(wlan), class: 'tro-vod-wlan' }, svg); T(svg, 202, 46, 'WLAN', 'tro-ls');
  const tEth = vod([[330, 134], [330, 184]], '', 'Ethernet', 338, 166);
  const tUsb = vod([[198, 162], [250, 162]], 'tro-tok-pl');
  const tSen = vod([[198, 246], [250, 246]], 'tro-tok-pl');
  const tPwm = vod([[330, 262], [330, 296]], '', 'PWM', 338, 286);
  const tM = vod([[410, 324], [432, 324]], '');
  const tEnk = vod([[540, 296], [540, 262]], 'tro-tok-pl', 'enkoderi', 532, 286);
  const tokovi = [tEth, tUsb, tSen, tPwm, tM, tEnk];
  const gPak = S('g', {}, svg);
  const tW = T(svg, 420, 122, '', 'tro-ls tro-t-opas');
  // vremenski dijagram
  const svg2 = ui.svg(600, 220, 'Vremenski dijagram: vrijeme od zadnje naredbe s granicom 200 ms i brzina robota', 'tro-svg2');
  const gA = graf(svg2, 64, 24, 524, 100, { x0: 0, x1: WIN, y0: 0, y1: 500, yt: [0, 200, 400], naslov: 'vrijeme od zadnje naredbe [ms]' });
  S('line', { x1: 64, x2: 588, y1: f1(gA.Y(D.rest)), y2: f1(gA.Y(D.rest)), class: 'tro-prag' }, svg2);
  const gB = graf(svg2, 64, 152, 524, 50, { x0: 0, x1: WIN, y0: 0, y1: 0.35, yt: [0, 0.3], yf: v => hr(v, 1), naslov: 'brzina robota [m/s]' });
  const cA = svg2.clip(64, 24, 524, 100), cB = svg2.clip(64, 152, 524, 50);
  const kW = S('polyline', { class: 'tro-krivulja-n', 'clip-path': cA }, svg2), kV = S('polyline', { class: 'tro-krivulja', 'clip-path': cB }, svg2);
  const gN = S('g', { 'clip-path': cA }, svg2);
  const tX = T(svg2, 588, 218, '', 'tro-ls', 'end');

  let odabran = null;
  function odaberi(k) { odabran = k; for (const q in blokovi) blokovi[q].classList.toggle('tro-akt', q === k); ui.stanje(OPIS[k], 'plavo'); }
  function osvjezi() {
    const od = (st.t - st.zadnja) * 1000, ist = od > D.rest;
    blokovi.wd.classList.toggle('tro-vruce', ist);
    tW.textContent = ist ? 'ISTEKAO → v = 0' : '';
    gPak.replaceChildren();
    for (const p of st.paketi) {
      const u = (st.t - p.t0) / PUT;
      let x, y;
      if (u < 0.5) { x = 198 + (250 - 198) * u * 2; y = 56; } else { x = 330; y = 134 + 50 * (u - 0.5) * 2; }
      if (p.izgubljen && u > 0.4) continue;
      S('circle', { cx: f1(x), cy: f1(y), r: 6, class: 'tro-paket' }, gPak);
    }
    svg.classList.toggle('tro-tece', true);
    for (const t of tokovi) t.style.strokeDashoffset = f1(-st.tok);
    tPwm.style.opacity = tM.style.opacity = st.v > 0.001 ? '' : '0.15';
    const t1 = Math.max(WIN, st.t), t0 = t1 - WIN, X = t => 64 + (t - t0) / WIN * 524;
    const h = st.hist.filter(q => q[0] >= t0);
    kW.setAttribute('points', pts(h.map(q => [X(q[0]), gA.Y(Math.min(q[1], 500))])));
    kV.setAttribute('points', pts(h.map(q => [X(q[0]), gB.Y(q[2])])));
    gN.replaceChildren();
    for (const q of h) if (q[3]) S('line', { x1: f1(X(q[0])), x2: f1(X(q[0])), y1: 24, y2: 124, class: 'tro-brid' }, gN);
    tX.textContent = `t = ${hr(t0, 1)} … ${hr(t1, 1)} s (usporeno ${USP}×)`;
    o.i(st.salje ? st.int + ' ms' : 'ne šalje'); o.z(hr(Math.min(od, 9999), 0) + ' ms', ist ? 'opas' : 'ok');
    o.w(ist ? 'istekao — robot staje' : 'u redu', ist ? 'opas' : 'ok'); o.v(hr(st.v, 2) + ' m/s'); o.s(String(st.stopovi), st.stopovi ? 'upoz' : '');
  }
  ctx.petlja(dt => {
    const h = dt / USP;
    st.t += h; st.tok += dt * 30;
    let nova = false;
    if (st.salje && st.t >= st.tn) { st.paketi.push({ t0: st.t, izgubljen: !st.veza }); st.tn = st.t + st.int / 1000; }
    st.paketi = st.paketi.filter(p => { if (st.t - p.t0 >= PUT) { if (!p.izgubljen) { st.zadnja = st.t; nova = true; } return false; } return true; });
    const ok = (st.t - st.zadnja) * 1000 <= D.rest;
    const cilj = ok ? 0.3 : 0;
    st.v += ogr(cilj - st.v, -h * 2, h * 1);
    if (st.bio && !ok) { st.stopovi++; ui.stanje(st.veza ? (st.salje ? `Razmak ${st.int} ms je veći od ${D.rest} ms: nadzor istekne prije sljedeće naredbe i robot koči. Kad naredba stigne, opet kreće — robot trza.` : 'Program više ne šalje naredbe: nakon 200 ms nadzor istekne i robot staje.') : 'Veza je prekinuta: naredbe ne stižu, nakon 200 ms nadzor istekne i robot staje. Bez nadzora bi vozio dalje zadnjom brzinom.', 'opas'); }
    if (!st.bio && ok && odabran == null) ui.stanje(`Naredbe stižu svakih ${st.int} ms — unutar ${D.rest} ms, robot vozi jednoliko.`, 'ok');
    st.bio = ok;
    st.hist.push([st.t, (st.t - st.zadnja) * 1000, st.v, nova ? 1 : 0]);
    while (st.hist.length > 2 && st.hist[0][0] < st.t - WIN - 0.1) st.hist.shift();
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bS = ui.gumb('Šalji naredbe', (e, b) => { st.salje = !st.salje; b.setAttribute('aria-pressed', String(st.salje)); b.textContent = st.salje ? 'Šalje naredbe' : 'Šalji naredbe'; if (st.salje) st.tn = st.t; odabran = null; ctx.budi(); }, { pritisak: true, u: r });
  bS.textContent = 'Šalje naredbe';
  ui.gumb('Prekini WLAN', (e, b) => { st.veza = !st.veza; b.setAttribute('aria-pressed', String(!st.veza)); b.textContent = st.veza ? 'Prekini WLAN' : 'Spoji WLAN'; odabran = null; if (st.veza) ui.stanje('Veza je ponovno uspostavljena; prva naredba opet pokreće robota.', 'ok'); ctx.budi(); }, { tanki: true, pritisak: false, u: r });
  ui.klizac('Razmak između naredbi', 50, 500, 10, st.int, v => v + ' ms', v => { st.int = v; odabran = null; if (v <= D.rest) ui.stanje(`Razmak ${v} ms ≤ ${D.rest} ms: nadzor ne istječe.`, 'ok'); });
  const o = ui.ocit([['i', 'Razmak naredbi'], ['z', 'Od zadnje naredbe'], ['w', 'Nadzor naredbi'], ['v', 'Brzina robota'], ['s', 'Broj zaustavljanja']]);
  ui.sitno('Klikni blok sheme za opis. Primjer naredbe: PUT /data/omnidrive s tijelom [0.3, 0, 0] (vx, vy u m/s, ω u rad/s). API2 se poziva otprilike svakih 100 ms (OmniDrive::setVelocity).');
  osvjezi(); ui.stanje(`Naredbe stižu svakih ${st.int} ms. Pomakni razmak preko ${D.rest} ms ili prekini WLAN.`, 'ok'); ctx.budi();
}

/* =========================================================== 12. napajanje */
function tNapajanje(ui, ctx) {
  const UBRZ = 600;                    // 1 s prikaza = 10 min
  const st = { gen: 'R4', n: 4, P: D.Psr, stanica: false, radi: false, soc: 1, tok: 0, t: 0 };
  const E = () => st.gen === 'R4' ? st.n * D.bat.R4.U * D.bat.R4.C : D.bat.R3.n * D.bat.R3.U * D.bat.R3.C;
  const svg = ui.svg(600, 380, 'Shema napajanja: baterije, sabirnica, potrošači i stanica za punjenje s tokom energije');
  S('rect', { x: 6, y: 100, width: 250, height: 272, rx: 10, class: 'tro-ploca' }, svg);
  const tBat = T(svg, 131, 124, '', 'tro-l', 'middle');
  const tBat2 = T(svg, 131, 362, '', 'tro-ls', 'middle');
  const gBat = S('g', {}, svg);
  // sabirnica i potrošači
  S('line', { x1: 256, y1: 230, x2: 400, y2: 230, class: 'tro-vod-r' }, svg);
  const fBat = S('line', { x1: 256, y1: 230, x2: 400, y2: 230, class: 'tro-e' }, svg);
  const tU = T(svg, 290, 220, '', 'tro-ls', 'middle');
  const gPot = S('g', { class: 'tro-rb' }, svg); S('rect', { x: 400, y: 170, width: 192, height: 120, rx: 8 }, gPot);
  T(gPot, 412, 196, 'potrošači', 'tro-l');
  T(gPot, 412, 218, 'računalo, elektronika,', 'tro-ls'); T(gPot, 412, 238, 'motori, senzori, toranj', 'tro-ls');
  const tP = T(gPot, 412, 272, '', 'tro-lb');
  // stanica
  const gSt = S('g', { class: 'tro-rb' }, svg); S('rect', { x: 400, y: 14, width: 192, height: 80, rx: 8 }, gSt);
  T(gSt, 412, 40, 'stanica za punjenje', 'tro-l'); T(gSt, 412, 62, `mreža · najviše ${D.Pstanica} W`, 'tro-ls');
  const tSt = T(gSt, 412, 84, '', 'tro-ls');
  S('polyline', { points: '440,94 440,150 330,150 330,230', class: 'tro-vod-r' }, svg);
  const fSt = S('polyline', { points: '440,94 440,150 330,150 330,230', class: 'tro-e' }, svg);
  const kontakt = S('rect', { x: 428, y: 112, width: 24, height: 16, rx: 3, class: 'tro-kontakt' }, svg);
  T(svg, 460, 126, '6-polni kontakt', 'tro-ls');
  const tPun = T(svg, 266, 300, '', 'tro-ls');
  const tVr = T(svg, 266, 330, '', 'tro-l');

  function crtajBaterije() {
    gBat.replaceChildren();
    const cl = [];
    if (st.gen === 'R4') {
      tBat.textContent = `Festool Li-ion ${D.bat.R4.U} V · paralelno`;
      S('line', { x1: 24, y1: 150, x2: 236, y2: 150, class: 'tro-vod-r' }, gBat); S('line', { x1: 24, y1: 330, x2: 236, y2: 330, class: 'tro-vod-r' }, gBat);
      T(gBat, 18, 146, '+', 'tro-lb'); T(gBat, 18, 346, '−', 'tro-lb');
      S('polyline', { points: '236,150 248,150 248,230 256,230', class: 'tro-vod-r' }, gBat);
      for (let i = 0; i < D.bat.R4.max; i++) {
        const x = 30 + i * 52, akt = i < st.n;
        S('line', { x1: x + 20, y1: 150, x2: x + 20, y2: 170, class: akt ? 'tro-vod-r' : 'tro-vodilja' }, gBat);
        S('line', { x1: x + 20, y1: 310, x2: x + 20, y2: 330, class: akt ? 'tro-vod-r' : 'tro-vodilja' }, gBat);
        S('rect', { x, y: 170, width: 40, height: 140, rx: 6, class: akt ? 'tro-baterija' : 'tro-baterija-prazno' }, gBat);
        if (akt) { cl.push(S('rect', { x: x + 6, width: 28, rx: 3, class: 'tro-soc' }, gBat)); T(gBat, x + 20, 190, String(i + 1), 'tro-ls tro-na-tamnom', 'middle'); }
        else T(gBat, x + 20, 246, '—', 'tro-ls', 'middle');
      }
      tBat2.textContent = `${st.n} × ${hr(D.bat.R4.C, 1)} Ah = ${hr(st.n * D.bat.R4.C, 1)} Ah pri ${D.bat.R4.U} V`;
    } else {
      tBat.textContent = `olovne AGM ${D.bat.R3.U} V · serijski`;
      for (let i = 0; i < 2; i++) {
        const x = 30 + i * 112;
        S('rect', { x, y: 180, width: 90, height: 120, rx: 6, class: 'tro-baterija tro-baterija-pb' }, gBat);
        cl.push(S('rect', { x: x + 8, width: 74, rx: 3, class: 'tro-soc' }, gBat));
        T(gBat, x + 45, 198, `${D.bat.R3.U} V`, 'tro-ls tro-na-tamnom', 'middle');
      }
      S('polyline', { points: '120,190 131,170 142,190', class: 'tro-vod-r' }, gBat);
      S('polyline', { points: '30,240 20,240 20,330 248,330', class: 'tro-vod-r' }, gBat);
      S('polyline', { points: '232,240 248,240 248,230 256,230', class: 'tro-vod-r' }, gBat);
      T(gBat, 131, 160, 'spoj + / −', 'tro-ls', 'middle');
      tBat2.textContent = `2 × ${D.bat.R3.U} V = 24 V · ${hr(D.bat.R3.C, 1)} Ah`;
    }
    gBat.soc = cl;
  }
  function osvjezi() {
    const e = E(), U = st.gen === 'R4' ? D.bat.R4.U : 24;
    for (const r of gBat.soc) { const h = (st.gen === 'R4' ? 112 : 92) * st.soc, y0 = st.gen === 'R4' ? 304 : 294; postavi(r, { y: y0 - h, height: Math.max(0, h) }); r.classList.toggle('tro-soc-niska', st.soc < 0.2); }
    tU.textContent = `${U} V`;
    tP.textContent = `P = ${st.P} W`;
    gSt.classList.toggle('tro-isk', !st.stanica);
    kontakt.classList.toggle('tro-kontakt-on', st.stanica);
    tSt.textContent = st.stanica ? 'spojeno' : 'robot nije na stanici';
    const Pp = st.stanica ? Math.max(0, D.Pstanica - st.P) : 0;
    const puni = st.stanica && st.soc < 0.999;
    fSt.style.opacity = st.stanica ? 1 : 0;
    fBat.style.opacity = !st.stanica || puni ? 1 : 0;
    fBat.classList.toggle('tro-e-obrnuto', st.stanica);
    fSt.style.strokeDashoffset = f1(-st.tok); fBat.style.strokeDashoffset = f1(st.stanica ? st.tok : -st.tok);
    tPun.textContent = st.stanica ? (puni ? `punjenje do ${Pp} W (240 W − ${st.P} W potrošnje)` : 'baterije pune — robot radi na mreži') : 'robot radi iz baterija';
    const h = st.t / 3600;
    tVr.textContent = `proteklo: ${Math.floor(h)} h ${String(Math.floor((h % 1) * 60)).padStart(2, '0')} min · ${hr(st.soc * 100, 0)} %`;
    const t = e / st.P;
    F.set(0, st.gen === 'R4' ? `E = n · U · C = ${st.n} · ${D.bat.R4.U} V · ${hr(D.bat.R4.C, 1)} Ah = ${hr(e, 1)} Wh` : `E = U · C = 24 V · ${hr(D.bat.R3.C, 1)} Ah = ${hr(e, 1)} Wh  (serijski: napon se zbraja, kapacitet ne)`);
    F.set(1, `t ≈ E / P = ${hr(e, 1)} Wh / ${st.P} W = ${hr(t, 1)} h (teorijski)`);
    F.set(2, st.gen === 'R4' ? `Proizvođač: do ${D.bat.R4.t} h (4 paketa) → P ≈ ${hr(4 * D.bat.R4.U * D.bat.R4.C / D.bat.R4.t, 0)} W; ~${hr(D.bat.R4.tPaket, 1)} h po paketu → P ≈ ${hr(D.bat.R4.U * D.bat.R4.C / D.bat.R4.tPaket, 0)} W` : `Proizvođač: ${D.bat.R3.t} h → P ≈ ${hr(D.bat.R3.n * D.bat.R3.U * D.bat.R3.C / D.bat.R3.t, 0)} W srednje`);
    F.set(3, `Punjenje na stanici: t ≥ E / (240 W − P) = ${hr(e, 1)} / ${Math.max(1, D.Pstanica - st.P)} = ${hr(e / Math.max(1, D.Pstanica - st.P), 1)} h (donja granica)`);
    o.e(hr(e, 1) + ' Wh'); o.t(hr(t, 1) + ' h'); o.s(hr(st.soc * 100, 0) + ' %', st.soc < 0.2 ? 'opas' : st.soc < 0.5 ? 'upoz' : 'ok');
    o.p(st.stanica ? `iz mreže: ${st.P} W potrošači${puni ? ` + ${Pp} W punjenje` : ''}` : `iz baterija: ${st.P} W`);
    o.ost(st.stanica ? '—' : hr(e * st.soc / st.P, 1) + ' h');
  }
  ctx.petlja(dt => {
    st.tok += dt * 30;
    if (st.radi) {
      const h = dt * UBRZ, e = E();
      st.t += h;
      if (st.stanica) st.soc = Math.min(1, st.soc + Math.max(0, D.Pstanica - st.P) * h / 3600 / e);
      else {
        st.soc -= st.P * h / 3600 / e;
        if (st.soc <= 0) { st.soc = 0; st.radi = false; bI.osvjezi(); ui.stanje('Baterije su prazne: sustav se pri preniskom stanju sam gasi (R4). Pošalji robota na stanicu ili zamijeni pakete.', 'opas'); }
      }
    }
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bI = ui.igraj(st, 'radi', 'Pokreni vrijeme (1 s = 10 min)', v => { if (v) ui.stanje(st.stanica ? 'Robot je na stanici: potrošači rade iz mreže, baterije se pune.' : 'Robot radi iz baterija.'); }, r); bI.osvjezi();
  ui.gumb('Na stanicu', (e, b) => { st.stanica = !st.stanica; b.setAttribute('aria-pressed', String(st.stanica)); b.textContent = st.stanica ? 'Odvozi sa stanice' : 'Na stanicu'; ui.stanje(st.stanica ? 'Kontakti su spojeni: mrežno napajanje preuzima potrošače, baterije se ne prazne nego pune.' : 'Robot je napustio stanicu i opet radi iz baterija.', st.stanica ? 'ok' : ''); osvjezi(); ctx.budi(); }, { tanki: true, pritisak: false, u: r });
  ui.gumb('Napuni (100 %)', () => { st.soc = 1; st.t = 0; osvjezi(); }, { tanki: true, u: r });
  ui.seg('Generacija', [['R4', 'Robotino 4 (Li-ion 18 V)'], ['R3', 'Robotino 3 (olovne 2 × 12 V)']], st.gen, v => { st.gen = v; kN.ulaz.disabled = v === 'R3'; crtajBaterije(); osvjezi(); });
  const kN = ui.klizac('Broj Festool paketa (R4)', 1, D.bat.R4.max, 1, st.n, v => String(v), v => { st.n = v; crtajBaterije(); osvjezi(); });
  ui.klizac('Srednja snaga robota P', 20, 120, 5, st.P, v => v + ' W', v => { st.P = v; osvjezi(); });
  const F = ui.formula('Račun', 4);
  const o = ui.ocit([['e', 'Energija baterija E'], ['t', 'Teorijsko vrijeme rada'], ['s', 'Stanje napunjenosti'], ['ost', 'Preostalo pri ovoj snazi'], ['p', 'Tok snage']]);
  ui.sitno(`Srednja snaga ${D.Psr} W navedena je za mobilni robot CP-MR (s nadogradnjom); osnovica bez tereta troši manje. Paketi R4 pune se i izvan robota za manje od 1 h po paketu; dva se mogu mijenjati tijekom rada.`);
  crtajBaterije(); osvjezi(); ui.stanje('Pritisni „Pokreni vrijeme” ili pošalji robota na stanicu.'); ctx.budi();
}

/* ------------------------------------------------------- signalni stup (zajednički crtež) */
function crtajStup(rod, x, y, s = 1) {
  const g = S('g', { transform: `translate(${x} ${y}) scale(${s})` }, rod);
  S('rect', { x: -6, y: 186, width: 12, height: 60, class: 'tro-stup-cijev' }, g);
  S('rect', { x: -26, y: 240, width: 52, height: 12, rx: 3, class: 'tro-stup-cijev' }, g);
  const seg = ['crv', 'nar', 'zel'].map((b, i) => {
    const sg = S('g', {}, g);
    S('rect', { x: -26, y: i * 62, width: 52, height: 58, rx: 8, class: 'tro-stup-seg tro-stup-' + b }, sg);
    S('rect', { x: -26, y: i * 62, width: 52, height: 58, rx: 8, class: 'tro-stup-sjaj' }, sg);
    return sg;
  });
  S('rect', { x: -26, y: -10, width: 52, height: 10, rx: 4, class: 'tro-stup-cijev' }, g);
  g.postavi = (st, blink) => ['crv', 'nar', 'zel'].forEach((b, i) => { const v = st[b]; seg[i].classList.toggle('tro-upaljeno', v === 1 || (v === 't' && blink)); });
  return g;
}

/* =========================================================== 13. sigurnosni krug */
function tSigurnosniKrug(ui, ctx) {
  const st = { gljiva: false, prep: false, kvarK2: false, kvarEDM: false, rel: 'ukljucen', radi: true, log: [], t: 0 };
  const svg = ui.svg(600, 410, 'Načelna shema sigurnosnog kruga: gljiva za nužni stop s dva kanala, tipkala Reset i Start, izlazi OSSD skenera, sigurnosni relej s povratnom vezom EDM, izvršni elementi pogona i signalni stup');
  // releji i blokovi
  const gRel = S('g', { class: 'tro-rb' }, svg); S('rect', { x: 236, y: 40, width: 128, height: 300, rx: 8 }, gRel);
  T(gRel, 300, 66, 'sigurnosni', 'tro-l', 'middle'); T(gRel, 300, 86, 'relej KF3', 'tro-l', 'middle'); T(gRel, 300, 104, '(SICK)', 'tro-ls', 'middle');
  const tRel = T(svg, 300, 330, '', 'tro-ls', 'middle');
  [['I1', 140], ['I2', 170], ['Reset', 210], ['Start', 250], ['OSSD', 298]].forEach(([n, y]) => T(svg, 244, y + 5, n, 'tro-ls'));
  T(svg, 356, 165, 'Q', 'tro-ls', 'end'); T(svg, 356, 245, 'EDM', 'tro-ls', 'end');
  // gljiva SF1
  const gG = S('g', {}, svg);
  S('rect', { x: 16, y: 36, width: 92, height: 74, rx: 8, class: 'tro-kutija-g' }, gG);
  const glj = S('g', {}, gG);
  S('rect', { x: 52, y: 28, width: 20, height: 18, class: 'tro-stup-cijev' }, glj);
  S('ellipse', { cx: 62, cy: 26, rx: 34, ry: 14, class: 'tro-gljiva' }, glj);
  T(gG, 62, 100, 'SF1', 'tro-ls tro-na-svijetlom', 'middle');
  klikabilno(ctx, gG, 'Gljiva za nužni stop SF1', () => akcija('gljiva'));
  // kontakti kanala (NC)
  const kanal = [140, 170].map((y, i) => {
    S('line', { x1: 108, y1: y, x2: 140, y2: y, class: 'tro-kanal-l' }, svg);
    const sk = S('line', { x1: 140, y1: y, x2: 168, y2: y, class: 'tro-sklopka' }, svg);
    const ln = S('line', { x1: 168, y1: y, x2: 236, y2: y, class: 'tro-kanal' }, svg);
    T(svg, 128, y - 8, i ? 'kanal 2' : 'kanal 1', 'tro-ls');
    return { sk, ln, y };
  });
  S('path', { d: 'M108,80 L120,80 L120,170 M120,140 L120,140', class: 'tro-kanal-l' }, svg);
  // Reset SF3, Start SF2
  const tip = (k, y, n, kl) => {
    const g = S('g', {}, svg);
    S('rect', { x: 16, y: y - 22, width: 92, height: 44, rx: 8, class: 'tro-kutija-g' }, g);
    const l = S('circle', { cx: 40, cy: y, r: 14, class: 'tro-tipka ' + kl }, g);
    T(g, 60, y + 5, n, 'tro-ls tro-na-svijetlom');
    S('line', { x1: 108, y1: y, x2: 236, y2: y, class: 'tro-vod-t' }, svg);
    klikabilno(ctx, g, n, () => akcija(k));
    return l;
  };
  const lReset = tip('reset', 210, 'Reset', 'tro-tipka-pl');
  const lStart = tip('start', 250, 'Start', 'tro-tipka-pr');
  // skener
  const gSk = S('g', {}, svg);
  S('rect', { x: 16, y: 274, width: 92, height: 50, rx: 8, class: 'tro-skener-b' }, gSk);
  T(gSk, 62, 296, 'skener', 'tro-ls tro-na-svijetlom', 'middle'); T(gSk, 62, 314, 'OSSD1/2', 'tro-ls tro-na-svijetlom', 'middle');
  klikabilno(ctx, gSk, 'Laserski skener: prepreka u zaštitnom polju', () => akcija('prep'));
  const ossd = [292, 304].map(y => S('line', { x1: 108, y1: y, x2: 236, y2: y, class: 'tro-kanal' }, svg));
  // izlazi i izvršni elementi
  const q = S('line', { x1: 364, y1: 160, x2: 430, y2: 160, class: 'tro-kanal' }, svg);
  const gIzv = S('g', { class: 'tro-rb' }, svg); S('rect', { x: 430, y: 120, width: 160, height: 80, rx: 8 }, gIzv);
  T(gIzv, 442, 146, 'izvršni elementi', 'tro-l'); T(gIzv, 442, 166, 'omogućenje pogona', 'tro-ls');
  const kIzv = S('line', { x1: 470, y1: 186, x2: 500, y2: 178, class: 'tro-sklopka' }, svg);
  const edm = S('polyline', { points: '510,200 510,240 364,240', class: 'tro-edm' }, svg);
  T(svg, 372, 232, 'povratna veza EDM', 'tro-ls');
  const gPog = S('g', { class: 'tro-rb' }, svg); S('rect', { x: 430, y: 262, width: 104, height: 70, rx: 8 }, gPog);
  T(gPog, 442, 288, 'pogon', 'tro-l'); const tPog = T(gPog, 442, 312, '', 'tro-ls');
  const e1 = S('line', { x1: 480, y1: 200, x2: 480, y2: 262, class: 'tro-e' }, svg);
  const stup = crtajStup(svg, 568, 268, 0.45);
  T(svg, 568, 258, 'stup', 'tro-ls', 'middle');
  const tAlarm = T(svg, 300, 396, '', 'tro-alarm', 'middle');
  const log = H('ol', { class: 'tro-log', 'aria-live': 'polite' });

  const ch1 = () => !st.gljiva, ch2 = () => !st.gljiva || st.kvarK2;
  const Q = () => st.rel === 'ukljucen' && !st.prep;
  const izvOn = () => Q() || st.kvarEDM;         // zavaren kontakt drži pogon
  const edmOk = () => !izvOn();
  function zapis(t) { st.log.push(t); if (st.log.length > 7) st.log.shift(); log.replaceChildren(...st.log.map(x => H('li', { tekst: x }))); }
  function akcija(k) {
    if (k === 'gljiva') {
      st.gljiva = !st.gljiva;
      if (st.gljiva) {
        const bio = st.rel;
        if (st.kvarK2) { st.rel = 'greska'; zapis('Gljiva: kanal 1 otvoren, kanal 2 ostao zatvoren → nesklad, greška'); }
        else { st.rel = 'iskljucen'; zapis('Gljiva pritisnuta: oba kanala otvorena → izlazi isključeni'); }
        st.radi = false;
        if (bio === 'ukljucen' && st.kvarEDM) zapis('Izvršni element se nije otvorio (zavaren kontakt)!');
      } else zapis('Gljiva otpuštena: robot i dalje stoji (nema automatskog pokretanja)');
    } else if (k === 'reset') {
      if (st.rel === 'ukljucen') { zapis('Reset: relej je već uključen'); }
      else if (st.gljiva) { zapis('Reset odbijen: gljiva je još pritisnuta'); }
      else if (st.kvarK2) { zapis('Reset odbijen: kanal 2 je kratko spojen (kvar)'); }
      else if (!edmOk()) { zapis('Reset odbijen: EDM javlja da izvršni element nije otpao'); }
      else { st.rel = 'ukljucen'; zapis('Reset: provjere u redu → izlazi uključeni, lampica Reset se gasi'); }
    } else if (k === 'start') {
      if (st.rel !== 'ukljucen') zapis('Start odbijen: najprije Reset');
      else if (st.prep) zapis('Start odbijen: prepreka u zaštitnom polju');
      else { st.radi = true; zapis('Start: robot nastavlja nalog'); }
    } else if (k === 'prep') {
      st.prep = !st.prep; bP.setAttribute('aria-pressed', String(st.prep));
      zapis(st.prep ? 'Prepreka u zaštitnom polju: OSSD isključeni → pogon bez energije' : 'Zaštitno polje slobodno: OSSD uključeni');
    }
    osvjezi(); ctx.budi();
  }
  function stanjeStupa() {
    if (st.rel === 'greska') return { crv: 1, nar: 0, zel: 0 };
    if (st.prep && st.rel === 'ukljucen') return { crv: 0, nar: 1, zel: 0 };
    if (st.rel !== 'ukljucen') return { crv: 0, nar: 't', zel: 0 };
    return { crv: 0, nar: 0, zel: st.radi ? 't' : 1 };
  }
  function osvjezi() {
    const blink = Math.floor(st.t * 2) % 2 === 0;
    glj.setAttribute('transform', st.gljiva ? 'translate(0 8)' : '');
    [ch1(), ch2()].forEach((z, i) => {
      const k = kanal[i];
      k.sk.setAttribute('x2', z ? 168 : 164); k.sk.setAttribute('y2', z ? k.y : k.y - 14);
      k.ln.classList.toggle('tro-kanal-otv', !z);
    });
    ossd.forEach(l => l.classList.toggle('tro-kanal-otv', st.prep));
    q.classList.toggle('tro-kanal-otv', !Q());
    kIzv.setAttribute('y2', izvOn() ? 186 : 172);
    edm.classList.toggle('tro-edm-ok', edmOk());
    e1.classList.toggle('tro-e-iskl', !izvOn());
    e1.style.strokeDashoffset = f1(-st.t * 30);
    const lamp = st.rel !== 'ukljucen';
    lReset.classList.toggle('tro-tipka-on', lamp);
    lStart.classList.toggle('tro-tipka-on', st.rel === 'ukljucen' && !st.radi && blink);
    gRel.classList.toggle('tro-vruce', st.rel === 'greska');
    tRel.textContent = { ukljucen: Q() ? 'izlazi: uključeni' : 'izlazi: isključeni (OSSD)', iskljucen: 'izlazi: isključeni', greska: 'GREŠKA: nesklad kanala' }[st.rel];
    tPog.textContent = izvOn() ? (st.radi && Q() ? 'radi (vozi)' : Q() ? 'miruje' : 'POD NAPONOM!') : 'bez energije';
    gPog.classList.toggle('tro-vruce', izvOn() && !Q());
    tAlarm.textContent = izvOn() && !Q() ? 'opasno: pogon pod naponom unatoč nužnom stopu' : '';
    stup.postavi(stanjeStupa(), blink);
    o.k(`${ch1() ? 'zatvoren' : 'otvoren'} · ${ch2() ? 'zatvoren' : 'otvoren'}`, ch1() !== ch2() ? 'opas' : ch1() ? 'ok' : 'upoz');
    o.r({ ukljucen: 'uključen', iskljucen: 'isključen — čeka Reset', greska: 'greška' }[st.rel], st.rel === 'ukljucen' ? 'ok' : st.rel === 'greska' ? 'opas' : 'upoz');
    o.l(lamp ? 'svijetli (treba Reset)' : 'ugašena', lamp ? 'plavo' : '');
    o.o(st.prep ? 'isključeni (prepreka)' : 'uključeni', st.prep ? 'upoz' : 'ok');
    o.p(izvOn() ? (Q() ? 'ima energije' : 'ima energije — KVAR') : 'bez energije', izvOn() && !Q() ? 'opas' : izvOn() ? 'ok' : 'upoz');
    const s = stanjeStupa();
    o.s(s.crv ? 'crvena stalno: greška' : s.nar === 1 ? 'narančasta stalno: prepreka u zaštitnom polju' : s.nar === 't' ? 'narančasta treperi: nužni stop' : s.zel === 't' ? 'zelena treperi: zauzet' : 'zelena stalno: spreman');
    const zad = st.log[st.log.length - 1];
    if (zad) ui.stanje(zad, /odbijen|greška|nesklad|zavaren/i.test(zad) ? 'opas' : /pritisnuta|isključeni|stoji|Prepreka/.test(zad) ? 'upoz' : 'ok');
  }
  ctx.petlja(dt => { st.t += dt; osvjezi(); return true; });
  const r = ui.red();
  const bG = ui.gumb('Gljiva: pritisni / otpusti', () => { akcija('gljiva'); bG.setAttribute('aria-pressed', String(st.gljiva)); }, { kl: 'tro-g-stop', pritisak: false, u: r });
  ui.gumb('Reset', () => akcija('reset'), { tanki: true, u: r });
  ui.gumb('Start', () => akcija('start'), { tanki: true, u: r });
  const r2 = ui.red();
  const bP = ui.gumb('Prepreka u zaštitnom polju', () => akcija('prep'), { tanki: true, pritisak: false, u: r2 });
  ui.gumb('Uključi sustav ispočetka', () => { Object.assign(st, { gljiva: false, prep: false, rel: 'ukljucen', radi: true }); bG.setAttribute('aria-pressed', 'false'); bP.setAttribute('aria-pressed', 'false'); st.log = []; zapis('Sustav uključen, nalog se izvršava'); osvjezi(); }, { tanki: true, u: r2 });
  ui.kvacica('Kvar: kanal 2 kratko spojen (ne otvara se)', false, v => { st.kvarK2 = v; zapis(v ? 'Uključen kvar: kanal 2 kratko spojen' : 'Kvar kanala 2 uklonjen'); osvjezi(); });
  ui.kvacica('Kvar: zavaren kontakt izvršnog elementa (EDM)', false, v => { st.kvarEDM = v; zapis(v ? 'Uključen kvar: zavaren kontakt izvršnog elementa' : 'Kvar izvršnog elementa uklonjen'); osvjezi(); });
  const o = ui.ocit([['k', 'Kanali 1 · 2'], ['r', 'Sigurnosni relej'], ['l', 'Lampica Reset (SF3)'], ['o', 'OSSD skenera'], ['p', 'Pogon'], ['s', 'Signalni stup']]);
  ui.ocitP.append(log);
  ui.sitno('Gljivu, Reset, Start i skener možeš kliknuti i na shemi. Svi nužni stopovi u sustavu CP Factory međusobno su povezani i isključuju sve aktuatore.');
  zapis('Sustav uključen, nalog se izvršava');
  osvjezi(); ctx.budi();
}

/* =========================================================== 14. signalni stup */
function tSignalniStup(ui, ctx) {
  const ST = [
    { k: 'c1', b: 'crv', n: 1, boja: 'Crvena', nacin: 'stalno', zn: 'greška', opis: 'Greška koja traži čovjeka: npr. neuspjela naredba, kvar pogona ili greška u komunikaciji. Robot ne nastavlja dok se greška ne potvrdi (npr. u Fleet Manageru).' },
    { k: 'c2', b: 'crv', n: 't', boja: 'Crvena', nacin: 'treperi', zn: 'robot nije lokaliziran', opis: 'Robot ne zna gdje je na karti: sken lasera ne odgovara karti. Treba ga ručno lokalizirati (postaviti početnu pozu) prije vožnje.' },
    { k: 'n1', b: 'nar', n: 1, boja: 'Narančasta', nacin: 'stalno', zn: 'prepreka u zaštitnom polju lasera', opis: 'U zaštitnom polju sigurnosnog skenera nešto je (čovjek, predmet). OSSD izlazi su isključeni i robot stoji dok se polje ne oslobodi.' },
    { k: 'n2', b: 'nar', n: 't', boja: 'Narančasta', nacin: 'treperi', zn: 'nužni stop', opis: 'Pritisnuta je gljiva za nužni stop (na robotu ili drugdje u sustavu). Nakon otpuštanja treba Reset, pa Start.' },
    { k: 'z1', b: 'zel', n: 1, boja: 'Zelena', nacin: 'stalno', zn: 'spreman / mirovanje', opis: 'Robot je spreman i čeka nalog — npr. stoji na poziciji za parkiranje ili na stanici za punjenje.' },
    { k: 'z2', b: 'zel', n: 't', boja: 'Zelena', nacin: 'treperi', zn: 'zauzet', opis: 'Robot izvršava nalog: vozi do stanice ili predaje nosač.' }
  ];
  const st = { sel: 'z2', nacin: 'ist', kviz: null, bod: 0, pok: 0, t: 0, odg: null };
  const svg = ui.svg(600, 330, 'Signalni stup s crvenim, narančastim i zelenim segmentom i crtež tipične situacije za odabrano stanje');
  S('rect', { x: 6, y: 6, width: 588, height: 318, rx: 10, class: 'tro-ploca' }, svg);
  const stup = crtajStup(svg, 90, 34, 1);
  const tSt = T(svg, 90, 316, '', 'tro-ls', 'middle');
  const sc = S('g', {}, svg);
  const tSc = T(svg, 380, 310, '', 'tro-l', 'middle');
  // tablica
  const tab = H('table', { class: 'tro-tab' });
  tab.append(H('thead', {}, H('tr', {}, H('th', { tekst: 'boja' }), H('th', { tekst: 'stalno' }), H('th', { tekst: 'treperi' }))));
  const tb = H('tbody'), celije = {};
  for (const b of ['crv', 'nar', 'zel']) {
    const s1 = ST.find(s => s.b === b && s.n === 1), s2 = ST.find(s => s.b === b && s.n === 't');
    const c = [s1, s2].map(s => { const btn = H('button', { type: 'button', 'aria-pressed': 'false', tekst: s.zn }); ctx.on(btn, 'click', () => { if (st.nacin === 'ist') odaberi(s.k); }); const td = H('td', {}, btn); celije[s.k] = td; return td; });
    tb.append(H('tr', {}, H('th', { tekst: s1.boja }), ...c));
  }
  tab.append(tb);

  const robot = (g, x, y) => { const r = robotOdozgo(g, 180, { kotaci: false }); r.postavi(x, y, -Math.PI / 2); return r; };
  function scena(k) {
    sc.replaceChildren();
    const g = sc;
    if (st.nacin === 'kviz') { T(g, 380, 170, '?', 'tro-veliki', 'middle'); return; }
    if (k === 'c1') { robot(g, 330, 170); S('polygon', { points: '450,120 500,210 400,210', class: 'tro-upozorenje' }, g); T(g, 450, 200, '!', 'tro-lb tro-na-svijetlom', 'middle'); T(g, 380, 260, 'naredba nije izvršena', 'tro-ls', 'middle'); }
    if (k === 'c2') {
      S('rect', { x: 220, y: 60, width: 320, height: 210, class: 'tro-karta' }, g);
      const p = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 2 * Math.PI; p.push([380 + 120 * Math.cos(a) + 18, 165 + 80 * Math.sin(a) - 22]); }
      S('path', { d: p.map(([x, y]) => `M${f1(x - 2)},${f1(y - 2)}h4v4h-4Z`).join(''), class: 'tro-oblak' }, g);
      robot(g, 380, 165); T(g, 380, 172, '?', 'tro-lb', 'middle'); T(g, 380, 290, 'sken ne odgovara karti', 'tro-ls', 'middle');
    }
    if (k === 'n1') { robot(g, 290, 170); S('rect', { x: 330, y: 125, width: 110, height: 90, class: 'tro-polje-z' }, g); S('rect', { x: 330, y: 110, width: 200, height: 120, class: 'tro-polje-u' }, g); S('circle', { cx: 400, cy: 170, r: 24, class: 'tro-covjek' }, g); S('circle', { cx: 400, cy: 170, r: 9, class: 'tro-covjek-g' }, g); T(g, 430, 262, 'čovjek u zaštitnom polju', 'tro-ls', 'middle'); }
    if (k === 'n2') { S('rect', { x: 340, y: 150, width: 80, height: 90, rx: 8, class: 'tro-kutija-g' }, g); S('rect', { x: 370, y: 136, width: 20, height: 20, class: 'tro-stup-cijev' }, g); S('ellipse', { cx: 380, cy: 140, rx: 46, ry: 18, class: 'tro-gljiva' }, g); strel(g, 380, 70, 380, 112, { boja: 'var(--ink)', w: 4 }); T(g, 380, 270, 'gljiva pritisnuta', 'tro-ls', 'middle'); }
    if (k === 'z1') { S('rect', { x: 430, y: 120, width: 60, height: 100, class: 'tro-stanica-m' }, g); robot(g, 360, 170); T(g, 460, 245, 'stanica', 'tro-ls', 'middle'); T(g, 360, 262, 'čeka nalog', 'tro-ls', 'middle'); }
    if (k === 'z2') { S('path', { d: 'M230,240 C300,80 460,260 540,100', class: 'tro-putanja' }, g); sc.rob = robot(g, 300, 170); }
  }
  function odaberi(k) {
    st.sel = k;
    const s = ST.find(q => q.k === k);
    for (const q of ST) { celije[q.k].classList.toggle('tro-akt', q.k === k && st.nacin === 'ist'); celije[q.k].firstChild.setAttribute('aria-pressed', String(q.k === k)); }
    scena(k);
    if (st.nacin === 'ist') { ui.stanje(`${s.boja} ${s.nacin}: ${s.zn}. ${s.opis}`, s.b === 'crv' ? 'opas' : s.b === 'nar' ? 'upoz' : 'ok'); tSc.textContent = s.zn; tSt.textContent = `${s.boja.toLowerCase()} ${s.nacin}`; }
    else { tSc.textContent = 'što znači ovo stanje?'; tSt.textContent = ''; }
  }
  function noviKviz() {
    let k; do { k = ST[Math.floor(Math.random() * ST.length)].k; } while (k === st.sel && Math.random() < 0.8);
    st.kviz = k; st.odg = null; odaberi(k);
    gOdg.replaceChildren(...ST.slice().sort(() => Math.random() - 0.5).map(s => { const b = H('button', { type: 'button', class: 'gumb tanki tro-g', tekst: s.zn }); ctx.on(b, 'click', () => odgovor(s.k, b)); return b; }));
    ui.stanje('Promotri stup (stalno ili treperi?) i odaberi značenje.');
  }
  function odgovor(k, b) {
    if (st.odg) return;
    st.odg = k; st.pok++;
    const s = ST.find(q => q.k === st.kviz);
    if (k === st.kviz) { st.bod++; b.classList.add('tro-g-tocno'); ui.stanje(`Točno: ${s.boja.toLowerCase()} ${s.nacin} = ${s.zn}. Rezultat ${st.bod}/${st.pok}.`, 'ok'); }
    else { b.classList.add('tro-g-netocno'); ui.stanje(`Nije: to je ${s.boja.toLowerCase()} ${s.nacin} = ${s.zn}. Rezultat ${st.bod}/${st.pok}.`, 'opas'); }
    st.nacin = 'ist'; scena(st.kviz); st.nacin = 'kviz'; tSc.textContent = s.zn;
  }
  ctx.petlja(dt => {
    st.t += dt;
    const s = ST.find(q => q.k === st.sel), blink = Math.floor(st.t * 2) % 2 === 0;
    stup.postavi({ crv: s.b === 'crv' ? s.n : 0, nar: s.b === 'nar' ? s.n : 0, zel: s.b === 'zel' ? s.n : 0 }, blink);
    if (sc.rob && st.sel === 'z2' && st.nacin === 'ist') { const u = (st.t * 0.12) % 1, x = 230 + 310 * u, y = 240 - 140 * u + Math.sin(u * Math.PI * 2) * 40; sc.rob.postavi(x, y, -Math.PI / 2 + 0.6); }
    return true;
  });
  ui.seg('Način', [['ist', 'Istraži'], ['kviz', 'Provjeri se']], 'ist', v => {
    st.nacin = v; gK.style.display = v === 'kviz' ? '' : 'none'; tab.style.display = v === 'ist' ? '' : 'none';
    if (v === 'kviz') noviKviz(); else odaberi(st.sel);
  });
  const gK = ui.skupina();
  const gOdg = H('div', { class: 'tro-red' });
  gK.append(gOdg);
  ui.gumb('Novo stanje', () => noviKviz(), { u: ui.red(null, gK) });
  gK.style.display = 'none';
  ui.upr.append(tab);
  const r = ui.red();
  ST.forEach(s => ui.gumb(`${s.boja.slice(0, 3).toLowerCase()}. ${s.nacin}`, () => { if (st.nacin !== 'ist') return; odaberi(s.k); }, { tanki: true, u: r }));
  ui.sitno('Werma, crvena/narančasta/zelena (RT-GE-GN), na cijevi iznad prihvata nosača. Boje vidi i čovjek koji ne gleda zaslon — zato su i značenja kratka.');
  odaberi('z2'); ctx.budi();
}

/* =========================================================== 15. pristajanje */
function tPristajanje(ui, ctx) {
  const SC = 150, OX = 300, OY = 74, RAZ = 0.6, DC = D.promjer / 2 + 0.03, LZ = 0.2;
  const POC = { A: [-1.2, -1.8, 55], B: [1.1, -1.4, 150], C: [0.35, -2.0, 100] };
  const st = { radi: false, met: 'laser', poc: 'A', x: 0, y: 0, f: 0, korak: 0, kod: 0, ext: 0, trag: [], t: 0 };
  const W = (x, y) => [OX + x * SC, OY - y * SC];
  const svg = ui.svg(600, 440, 'Pogled odozgo: stanica za punjenje s dva reflektorska markera i osvijetljenim markerom; robot pristaje u tri koraka');
  S('rect', { x: 2, y: 2, width: 596, height: 436, rx: 10, class: 'tro-graf' }, svg);
  for (let x = -2; x <= 2; x += 0.5) S('line', { x1: f1(W(x, 0)[0]), y1: 2, x2: f1(W(x, 0)[0]), y2: 438, class: 'tro-mreza' }, svg);
  for (let y = 0; y >= -2.5; y -= 0.5) S('line', { x1: 2, y1: f1(W(0, y)[1]), x2: 598, y2: f1(W(0, y)[1]), class: 'tro-mreza' }, svg);
  S('rect', { x: 2, y: 2, width: 596, height: OY - 2 - 34, class: 'tro-zid-p', fill: svg.srafura }, svg);
  const sw = D.stanica.sirina * SC;
  S('rect', { x: OX - sw / 2, y: OY - 0.212 * SC, width: sw, height: 0.212 * SC, rx: 4, class: 'tro-stanica-m' }, svg);
  const led = S('rect', { x: OX - 20, y: OY - 26, width: 40, height: 6, rx: 3, class: 'tro-led-st' }, svg);
  S('rect', { x: OX - 9, y: OY - 4, width: 18, height: 6, class: 'tro-kontakt' }, svg);
  const MK = [-RAZ / 2, RAZ / 2].map(x => { S('rect', { x: W(x, 0)[0] - 7, y: OY - 6, width: 14, height: 8, class: 'tro-reflektor' }, svg); return [x, 0]; });
  S('rect', { x: OX - 0.11 * SC, y: OY - 0.212 * SC - 26, width: 0.22 * SC, height: 22, class: 'tro-marker-k' }, svg);
  T(svg, OX + sw / 2 + 8, OY - 14, 'stanica', 'tro-ls');
  S('line', { x1: OX, y1: OY, x2: OX, y2: 430, class: 'tro-os-crta' }, svg);
  T(svg, OX + 6, 428, 'normala stanice', 'tro-ls');
  const kTr = S('polyline', { class: 'tro-trag' }, svg);
  const zrake = [0, 1].map(() => S('line', { class: 'tro-zraka-m' }, svg));
  const vid = S('path', { class: 'tro-vidno' }, svg);
  const rob = robotOdozgo(svg, SC);
  const tKor = T(svg, 14, 432, '', 'tro-l');
  // slika kamere
  const gK = S('g', {}, svg);
  S('rect', { x: 440, y: 330, width: 150, height: 100, rx: 6, class: 'tro-kamera-sl' }, gK);
  T(gK, 448, 346, 'slika kamere', 'tro-ls tro-na-tamnom');
  const mkSl = S('polygon', { class: 'tro-marker-sl' }, gK);
  const kor = H('ol', { class: 'tro-koraci' });
  const KOR = ['Pronađi markere (zakretanje dok ih skener ne vidi)', 'Zakret: os x robota usporedna s normalom stanice', 'Bočna vožnja po y dok stanica nije točno ispred (y = 0)', 'Vožnja po x dok udaljenost ne padne ispod d → kontakt'];
  const li = KOR.map(t => { const l = H('li', { tekst: t }); kor.append(l); return l; });

  function mjerenje() {
    // položaj stanice i normala u sustavu robota (kako bi ih dao skener ili kamera)
    const c = Math.cos(st.f), s = Math.sin(st.f);
    const rel = (x, y) => { const dx = x - st.x, dy = y - st.y; return [dx * c + dy * s, -dx * s + dy * c]; };
    const lx = st.x + c * LZ, ly = st.y + s * LZ;
    const vidi = (x, y, pol) => { const dx = x - lx, dy = y - ly, a = kutN(Math.atan2(dy, dx) - st.f), d = Math.hypot(dx, dy); return Math.abs(a) <= pol * RAD && d < 4 && dy > 0.02; };
    let ok;
    if (st.met === 'laser') ok = MK.every(m => vidi(m[0], m[1], D.hokuyo.kut / 2));
    else ok = vidi(0, 0, 30);
    const stvarno = ok;
    if (!ok && st.vidio) ok = true;            // stanica je već viđena: dok je izvan vidnog polja, položaj se procjenjuje odometrijom
    const [sx, sy] = rel(0, 0);
    const beta = kutN(Math.PI / 2 - st.f);                       // kut koji robot mora zakrenuti
    const [l1x, l1y] = rel(...MK[0]), [l2x, l2y] = rel(...MK[1]);
    if (stvarno) st.vidio = true;
    return { ok, stvarno, sx, sy, beta, sir: Math.hypot(l2x - l1x, l2y - l1y), lx, ly };
  }
  function osvjezi() {
    const m = mjerenje();
    const [X, Y] = W(st.x, st.y);
    rob.postavi(X, Y, st.f - Math.PI / 2);
    kTr.setAttribute('points', pts(st.trag.map(p => W(p[0], p[1]))));
    const [LX, LY] = W(m.lx, m.ly);
    zrake.forEach((z, i) => { const [mx, my] = W(...MK[i]); postavi(z, { x1: LX, y1: LY, x2: mx, y2: my }); z.style.display = st.met === 'laser' && m.stvarno ? '' : 'none'; });
    if (st.met === 'kamera') {
      const a0 = -st.f - 30 * RAD, a1 = -st.f + 30 * RAD;
      vid.setAttribute('d', `M${f1(LX)},${f1(LY)} L${f1(LX + 260 * Math.cos(a0))},${f1(LY + 260 * Math.sin(a0))} L${f1(LX + 260 * Math.cos(a1))},${f1(LY + 260 * Math.sin(a1))}Z`);
      gK.style.display = '';
      if (m.stvarno) {
        const dx = 0 - m.lx, dy = 0 - m.ly, d = Math.hypot(dx, dy), b = kutN(Math.atan2(dy, dx) - st.f);
        const u = 515 - Math.tan(b) / Math.tan(30 * RAD) * 70, w = ogr(22 / d, 4, 60), h = w, sk = Math.sin(m.beta) * 0.5;
        mkSl.setAttribute('points', pts([[u - w / 2, 380 - h / 2 * (1 + sk)], [u + w / 2, 380 - h / 2 * (1 - sk)], [u + w / 2, 380 + h / 2 * (1 - sk)], [u - w / 2, 380 + h / 2 * (1 + sk)]]));
        mkSl.style.display = '';
      } else mkSl.style.display = 'none';
    } else { vid.setAttribute('d', ''); gK.style.display = 'none'; }
    led.classList.toggle('tro-led-on', !!st.ext);
    li.forEach((l, i) => { l.classList.toggle('tro-akt', i === st.korak && st.kod === 0 && (st.radi || st.t > 0)); l.classList.toggle('tro-gotov', i < st.korak || st.kod === 2); });
    tKor.textContent = st.kod === 2 ? 'gotovo: kontakt, vanjsko napajanje' : st.kod === 1 ? 'greška' : `korak ${st.korak === 0 ? 'traženja' : st.korak}`;
    o.s(m.ok ? `x = ${hr(m.sx, 3)} m · y = ${hrp(m.sy, 3)} m${m.stvarno ? '' : ' (procjena odometrijom)'}` : 'stanica nije u vidnom polju', m.ok && m.stvarno ? '' : 'upoz');
    o.b(m.ok ? hrp(m.beta / RAD, 1) + '°' : '—');
    o.w(m.ok && st.met === 'laser' ? hr(m.sir, 3) + ' m (razmak markera)' : st.met === 'laser' ? '—' : 'iz veličine markera u slici');
    o.d(hr(m.sx - DC, 3) + ' m do kontakta');
    o.k(String(st.kod) + ' — ' + ['nastavi', 'greška', 'pristajanje završeno'][st.kod], st.kod === 2 ? 'ok' : st.kod === 1 ? 'opas' : '');
    o.e(String(st.ext), st.ext ? 'ok' : '');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const n = Math.ceil(dt / 0.01);
    for (let i = 0; i < n && st.radi; i++) {
      const h = dt / n, m = mjerenje();
      let vx = 0, vy = 0, w = 0;
      st.t += h;
      if (!m.ok) { st.korak = 0; w = 0.5; if (st.t > 30) { st.radi = false; st.kod = 1; ui.stanje('Markeri nisu pronađeni — povratni kod 1 (greška).', 'opas'); } }
      else {
        if (st.korak === 0) st.korak = 1;
        if (st.korak === 1) { w = ogr(2 * m.beta, -0.6, 0.6); if (Math.abs(m.beta) < 0.4 * RAD) { st.korak = 2; ui.stanje('Korak 2: os x je usporedna s normalom. Robot vozi bočno po y dok stanica ne dođe na y = 0.', 'plavo'); } }
        else if (st.korak === 2) { vy = ogr(1.5 * m.sy, -0.2, 0.2); w = ogr(2 * m.beta, -0.3, 0.3); if (Math.abs(m.sy) < 0.004) { st.korak = 3; ui.stanje(`Korak 3: stanica je točno ispred. Robot vozi po x dok udaljenost ne padne ispod d (kontakt).`, 'plavo'); } }
        else if (st.korak === 3) { vx = ogr(1.2 * (m.sx - DC), 0.03, 0.2); vy = ogr(1.5 * m.sy, -0.05, 0.05); w = ogr(2 * m.beta, -0.2, 0.2); if (m.sx - DC < 0.002) { st.radi = false; st.kod = 2; st.ext = 1; bI.osvjezi(); ui.stanje('Kontakti su spojeni: get_extpower = 1, povratni kod 2. Robot sada radi na mrežnom napajanju i puni baterije.', 'ok'); } }
      }
      const c = Math.cos(st.f), s = Math.sin(st.f);
      st.f += w * h; st.x += (vx * c - vy * s) * h; st.y += (vx * s + vy * c) * h;
    }
    const z = st.trag[st.trag.length - 1];
    if (!z || Math.hypot(z[0] - st.x, z[1] - st.y) > 0.01) st.trag.push([st.x, st.y]);
    osvjezi();
    return st.radi;
  });
  function pocetak() {
    const [x, y, f] = POC[st.poc];
    Object.assign(st, { x, y, f: f * RAD, korak: 0, kod: 0, ext: 0, trag: [], t: 0, radi: false, vidio: false });
    bI.osvjezi(); osvjezi();
    ui.stanje('Pritisni „Pokreni pristajanje”.');
  }
  const r = ui.red();
  const bI = ui.igraj(st, 'radi', 'Pokreni pristajanje', v => { if (v && st.kod) pocetak(), st.radi = true, bI.osvjezi(); if (v) ui.stanje(st.met === 'laser' ? 'Korak 1: skener vidi lijevi i desni marker; robot se zakreće dok mu os x nije usporedna s normalom stanice.' : 'Kamera traži osvijetljeni marker; iz njegova položaja i izobličenja u slici računa se položaj stanice.', 'plavo'); }, r);
  bI.osvjezi();
  ui.gumb('Na početak', () => pocetak(), { tanki: true, u: r });
  ui.seg('Metoda', [['laser', 'Laser + reflektorski markeri'], ['kamera', 'Kamera + osvijetljeni 2D marker']], 'laser', v => { st.met = v; pocetak(); });
  ui.seg('Početni položaj', [['A', 'A'], ['B', 'B'], ['C', 'C']], 'A', v => { st.poc = v; pocetak(); });
  ui.upr.append(kor);
  const o = ui.ocit([['s', 'Stanica u sustavu robota'], ['b', 'Kut do normale β'], ['w', 'Širina stanice'], ['d', 'Udaljenost'], ['k', 'Povratni kod'], ['e', 'get_extpower']]);
  ui.sitno('U Robotino Viewu laserski blok prikazuje reflektorske markere kao žute točke; markeri moraju biti na strani prilaza. U CP Factoryju robot sam odlazi na poziciju za punjenje prema postavkama Fleet Managera.');
  pocetak();
}

/* =========================================================== 16. predaja nosača */
function tPredajaNosaca(ui, ctx) {
  const st = { smjer: 'prima', korak: -1, u: 0, auto: false, ceka: false, kvar: false, greska: false, t: 0 };
  const svg = ui.svg(600, 330, 'Pogled odozgo: prijenosna stanica s trakom i mobilni robot s prihvatom s dvije trake, IR senzorima BG4–BG6, optičkim handshakeom BG2/BG3 i senzorom nosača BG1');
  S('rect', { x: 2, y: 2, width: 596, height: 326, rx: 10, class: 'tro-graf' }, svg);
  // stanica (čelo na y = 100)
  S('rect', { x: 170, y: 8, width: 260, height: 92, rx: 6, class: 'tro-stanica-m' }, svg);
  T(svg, 180, 30, 'prijenosna stanica', 'tro-ls tro-na-svijetlom');
  S('rect', { x: 270, y: 36, width: 26, height: 64, class: 'tro-traka-st' }, svg);
  const stTr = S('rect', { x: 270, y: 36, width: 26, height: 64, class: 'tro-traka-rebra' }, svg);
  const stHs = S('circle', { cx: 350, cy: 96, r: 6, class: 'tro-hs' }, svg);
  T(svg, 438, 104, 'handshake stanice', 'tro-ls');
  // robot s prihvatom (lokalni sustav: ishodište = središte robota, mjerilo 260 px/m)
  const gR = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: D.promjer / 2 * 260, class: 'tro-sasija tro-sasija-p' }, gR);
  S('rect', { x: -34, y: -68, width: 68, height: 136, rx: 5, class: 'tro-prihvat' }, gR);
  S('rect', { x: -30, y: -64, width: 26, height: 128, class: 'tro-traka-st' }, gR); S('rect', { x: 4, y: -64, width: 26, height: 128, class: 'tro-traka-st' }, gR);
  const rbA = S('rect', { x: -30, y: -64, width: 26, height: 128, class: 'tro-traka-rebra' }, gR), rbB = S('rect', { x: 4, y: -64, width: 26, height: 128, class: 'tro-traka-rebra' }, gR);
  T(gR, -17, 84, 'A', 'tro-ls', 'middle'); T(gR, 17, 84, 'B', 'tro-ls', 'middle');
  const pre = S('rect', { x: -32, y: 56, width: 8, height: 12, rx: 2, class: 'tro-preusm' }, gR);
  const IRX = [-26, 0, 26];
  const ir = IRX.map((x, i) => { S('rect', { x: x - 5, y: -74, width: 10, height: 6, class: 'tro-ir-s' }, gR); return S('line', { x1: x, y1: -74, x2: x, y2: -90, class: 'tro-ir-snop tro-ir-vidi' }, gR); });
  T(svg, 6, 318, 'BG4 · BG5 · BG6 = IR senzori na čelu prihvata', 'tro-ls');
  const hs = [S('circle', { cx: 46, cy: -58, r: 5, class: 'tro-hs' }, gR), S('circle', { cx: 58, cy: -50, r: 5, class: 'tro-hs' }, gR)];
  T(gR, 70, -40, 'BG3, BG2', 'tro-ls');
  const hsZr = [S('line', { class: 'tro-hs-zraka' }, svg), S('line', { class: 'tro-hs-zraka' }, svg)];
  const bg1 = S('circle', { cx: 44, cy: 14, r: 5, class: 'tro-lampa' }, gR); T(gR, 52, 20, 'BG1', 'tro-ls');
  const nos = S('g', {}, svg);
  S('rect', { x: -12, y: -12, width: 24, height: 24, rx: 3, class: 'tro-nosac-iz' }, nos); S('circle', { cx: 0, cy: 0, r: 6, class: 'tro-izradak' }, nos);
  const tIR = T(svg, 590, 296, '', 'tro-ls', 'end');
  const lampaCrv = S('circle', { cx: 572, cy: 30, r: 12, class: 'tro-lampa' }, svg); T(svg, 556, 36, 'greška', 'tro-ls', 'end');
  // slijedni dijagram
  const svg2 = ui.svg(600, 300, 'Slijedni dijagram poruka između robota i stanice', 'tro-svg2');
  const LR = 110, LS = 490;
  S('rect', { x: LR - 60, y: 6, width: 120, height: 30, rx: 6, class: 'tro-blok' }, svg2); T(svg2, LR, 27, 'robot', 'tro-l', 'middle');
  S('rect', { x: LS - 60, y: 6, width: 120, height: 30, rx: 6, class: 'tro-blok' }, svg2); T(svg2, LS, 27, 'stanica', 'tro-l', 'middle');
  S('line', { x1: LR, y1: 36, x2: LR, y2: 296, class: 'tro-zivotna' }, svg2); S('line', { x1: LS, y1: 36, x2: LS, y2: 296, class: 'tro-zivotna' }, svg2);
  const gPor = S('g', {}, svg2);
  const kor = H('ol', { class: 'tro-koraci' });

  // koraci: [tekst, od, do, trajanje, opis]
  const KORACI = () => {
    const prima = st.smjer === 'prima';
    return [
      ['prilaz na naučenu poziciju', 'r', 'r', 3, 'Robot vozi na naučenu poziciju ispred stanice (navigacija laserom i kartom).'],
      ['fino pozicioniranje BG4–BG6', 'r', 'r', 2.5, 'IR senzori BG4 i BG6 izjednače udaljenost (robot je usporedan sa stanicom), BG5 potvrđuje bočni položaj.'],
      ['BG3 svijetli: „spreman”', 'r', 's', 1.2, 'Robot pali odašiljač BG3: jedan bit, „spreman sam za prijenos”.'],
      ['stanica odgovara → BG2 = 1', 's', 'r', 1.2, 'Odašiljač stanice svijetli prema prijemniku BG2 na robotu: „kreni”.'],
      [prima ? 'trake rade: nosač ulazi' : 'trake rade: nosač izlazi', 'r', 's', 5, prima ? 'Stanica gura nosač, traka A ga uvlači, preusmjerivač ga prebaci na traku B.' : 'Traka B vozi nosač do preusmjerivača, on ga prebaci na traku A, a A ga izdaje stanici.'],
      [prima ? 'BG1 = 1: nosač na prihvatu' : 'BG1 = 0: nosač je izašao', 'r', 'r', 1, prima ? 'Svjetlovodni senzor BG1 vidi nosač — trake staju.' : 'BG1 više ne vidi nosač — trake staju.'],
      ['BG3 se gasi: gotovo, robot odlazi', 'r', 's', 2.5, 'Robot gasi BG3, stanica gasi svoj signal; robot odvozi sljedeći nalog.']
    ];
  };
  function crtajPoruke() {
    gPor.replaceChildren(); kor.replaceChildren();
    KORACI().forEach(([t, od, d], i) => {
      const y = 62 + i * 34, kl = i < st.korak ? 'tro-por tro-por-g' : i === st.korak ? 'tro-por tro-por-akt' : 'tro-por';
      const g = S('g', { class: kl }, gPor);
      if (od === d) { S('path', { d: `M${LR},${y - 8} h40 v14 h-36`, class: 'tro-por-l' }, g); T(g, LR + 50, y + 4, t, 'tro-ls'); }
      else { const x1 = od === 'r' ? LR : LS, x2 = od === 'r' ? LS : LR; S('line', { x1, y1: y, x2: x2 + (x2 > x1 ? -10 : 10), y2: y, class: 'tro-por-l' }, g); S('polygon', { points: `${x2},${y} ${x2 + (x2 > x1 ? -10 : 10)},${y - 5} ${x2 + (x2 > x1 ? -10 : 10)},${y + 5}`, class: 'tro-por-v' }, g); T(g, 300, y - 6, t, 'tro-ls', 'middle'); }
      const l = H('li', { tekst: t, class: i === st.korak ? 'tro-akt' : i < st.korak ? 'tro-gotov' : null }); kor.append(l);
    });
  }
  const glatko = u => u * u * (3 - 2 * u);
  function osvjezi() {
    const prima = st.smjer === 'prima', k = st.korak, u = st.u;
    // poza robota (zaslon): završni položaj — čelo prihvata 10 px ispred čela stanice
    const RX = 283 + 17, RY = 100 + 10 + 68;
    let rx = RX, ry = RY, rf = 0;
    if (k <= 0) { const g = k < 0 ? 0 : glatko(u); rx = RX + 60 * (1 - g) + 14 * g; ry = RY + 100 * (1 - g) + 12 * g; rf = 12 * RAD * (1 - g) + 5 * RAD * g; }
    else if (k === 1) { const g = glatko(u); rx = RX + 14 * (1 - g); ry = RY + 12 * (1 - g); rf = 5 * RAD * (1 - g); }
    else if (k === 6) { const g = glatko(u); ry = RY + 130 * g; }
    gR.setAttribute('transform', `translate(${f1(rx)} ${f1(ry)}) rotate(${f1(rf / RAD)})`);
    const c = Math.cos(rf), sn = Math.sin(rf);
    const loc = (lx, ly) => [rx + lx * c - ly * sn, ry + lx * sn + ly * c];
    // IR udaljenosti do čela stanice (y = 100), duž osi senzora (lokalno −y)
    const dIR = IRX.map(x => { const [px, py] = loc(x, -74); return Math.max(0, (py - 100) / c); });
    ir.forEach((l, i) => l.setAttribute('y2', f1(-74 - dIR[i])));
    tIR.textContent = `BG4 ${hr(dIR[0] / 0.26, 0)} mm · BG5 ${hr(dIR[1] / 0.26, 0)} mm · BG6 ${hr(dIR[2] / 0.26, 0)} mm`;
    // handshake
    const bg3 = k >= 2 && k <= 5 && !st.greska ? 1 : 0, sts = k >= 3 && k <= 5 && !st.greska ? 1 : 0;
    hs[0].classList.toggle('tro-hs-on', !!bg3); hs[1].classList.toggle('tro-hs-on', !!sts); stHs.classList.toggle('tro-hs-on', !!(bg3 || sts));
    const p3 = loc(46, -58), p2 = loc(58, -50);
    postavi(hsZr[0], { x1: p3[0], y1: p3[1], x2: 350, y2: 96 }); hsZr[0].style.display = bg3 ? '' : 'none';
    postavi(hsZr[1], { x1: 350, y1: 96, x2: p2[0], y2: p2[1] }); hsZr[1].style.display = sts ? '' : 'none';
    // trake i nosač
    const trake = k === 4 && !st.greska;
    const pom = st.t * 40;
    [stTr, rbA, rbB].forEach(r => r.style.strokeDashoffset = f1(trake ? (prima ? -pom : pom) : 0));
    // put nosača (lokalno): stanica (−17, −112) → traka A dolje (−17, 54) → preusmjerivač → B (17, 54) → B gore (17, 8)
    const L = [[-17, -112], [-17, 54], [17, 54], [17, 8]];
    const tocka = s2 => { const d = [0]; for (let i = 1; i < L.length; i++) d.push(d[i - 1] + Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1])); const z = s2 * d[d.length - 1]; let i = 1; while (i < L.length - 1 && d[i] < z) i++; const t2 = (z - d[i - 1]) / (d[i] - d[i - 1]); return [L[i - 1][0] + (L[i][0] - L[i - 1][0]) * t2, L[i - 1][1] + (L[i][1] - L[i - 1][1]) * t2]; };
    let sp = prima ? 0 : 1;
    if (k > 4) sp = prima ? 1 : 0;
    if (k === 4) sp = prima ? (st.kvar ? 0 : glatko(u)) : 1 - glatko(u);
    const naStanici = sp === 0 && (prima ? k <= 4 : k >= 5);
    let [nx, ny] = loc(...tocka(sp));
    if (naStanici) { nx = 283; ny = prima ? 62 : 62; }
    nos.setAttribute('transform', `translate(${f1(nx)} ${f1(ny)})`);
    const [lx, ly] = tocka(sp);
    pre.setAttribute('x', f1(ly > 50 && k === 4 && !naStanici ? -32 + (lx + 17) / 34 * 30 : -32));
    const naPrih = !naStanici && lx > 0 && ly < 30;
    bg1.classList.toggle('tro-lampa-on', naPrih);
    lampaCrv.classList.toggle('tro-lampa-crv', st.greska);
    o.k(k < 0 ? '—' : `${k + 1} / 7`); o.b1(naPrih ? '1 (nosač)' : '0', naPrih ? 'ok' : ''); o.b2(String(sts)); o.b3(String(bg3));
    o.t(trake ? 'rade' : 'stoje');
  }
  function kreni(i) {
    st.korak = i; st.u = 0; st.ceka = false; st.tk = 0;
    crtajPoruke();
    const K = KORACI()[i];
    if (K) ui.stanje(`${i + 1}. ${K[4]}`, 'plavo');
  }
  ctx.petlja(dt => {
    st.t += dt;
    if (st.korak >= 0 && !st.ceka && !st.greska) {
      const K = KORACI()[st.korak];
      st.u = Math.min(1, st.u + dt / K[3]);
      if (st.korak === 4 && st.kvar && st.smjer === 'prima' && st.u >= 1) {
        st.greska = true; st.auto = false; bA.osvjezi();
        ui.stanje('Nosač nije stigao: BG1 ne javlja nosač u zadanom vremenu. Trake staju, robot javlja grešku (signalni stup: crvena). Handshake se prekida.', 'opas');
      } else if (st.u >= 1) {
        if (st.korak === 6) { st.ceka = true; st.auto = false; bA.osvjezi(); ui.stanje(st.smjer === 'prima' ? 'Prijenos je završen: nosač je na prihvatu, robot vozi dalje.' : 'Predaja je završena: nosač je na stanici, robot odlazi prazan.', 'ok'); }
        else if (st.auto) kreni(st.korak + 1);
        else st.ceka = true;
      }
    }
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bA = ui.igraj(st, 'auto', 'Pokreni slijed', v => { if (v) { if (st.korak < 0 || st.greska || (st.korak === 6 && st.ceka)) { st.greska = false; kreni(0); } else if (st.ceka) kreni(st.korak + 1); } }, r);
  bA.osvjezi();
  ui.gumb('Sljedeći korak', () => { st.auto = false; bA.osvjezi(); if (st.greska) return; if (st.korak < 0 || (st.korak === 6)) kreni(0); else kreni(st.korak + 1); }, { tanki: true, u: r });
  ui.gumb('Na početak', () => { st.auto = false; bA.osvjezi(); st.korak = -1; st.greska = false; st.ceka = false; crtajPoruke(); ui.stanje('Robot je na prilazu stanici.'); }, { tanki: true, u: r });
  ui.seg('Smjer', [['prima', 'Robot prima nosač'], ['predaje', 'Robot predaje nosač']], 'prima', v => { st.smjer = v; st.korak = -1; st.greska = false; st.auto = false; bA.osvjezi(); crtajPoruke(); ui.stanje(v === 'prima' ? 'Robot dolazi prazan i prima nosač od stanice.' : 'Robot dolazi s nosačem na traci B i predaje ga stanici.'); });
  ui.kvacica('Kvar: nosač ne stiže (BG1 ne javlja)', false, v => { st.kvar = v; });
  ui.upr.append(kor);
  const o = ui.ocit([['k', 'Korak'], ['b1', 'BG1 (nosač)'], ['b3', 'BG3 (odašiljač robota)'], ['b2', 'BG2 (prijemnik robota)'], ['t', 'Trake']]);
  ui.sitno('BG4–BG6 su isti IR senzori kao u osnovici (Sharp), ali na prihvatu, usmjereni prema stanici. Handshake ima samo jedan bit u svakom smjeru — dovoljno da se strane dogovore „spreman” / „kreni”.');
  crtajPoruke(); osvjezi(); ui.stanje('Pritisni „Pokreni slijed” ili „Sljedeći korak”.'); ctx.budi();
}

/* =========================================================== izvoz */
const GRADITELJI = {
  omniKotac: tOmniKotac,
  kinematika: tKinematika,
  pogonskaJedinica: tPogonskaJedinica,
  enkoder: tEnkoder,
  regulacija: tRegulacija,
  irSenzor: tIrSenzor,
  odbojnik: tOdbojnik,
  ziroskopOdometrija: tZiroskopOdometrija,
  optickiSenzori: tOptickiSenzori,
  laserSkener: tLaserSkener,
  upravljackaJedinica: tUpravljackaJedinica,
  napajanje: tNapajanje,
  sigurnosniKrug: tSigurnosniKrug,
  signalniStup: tSignalniStup,
  pristajanje: tPristajanje,
  predajaNosaca: tPredajaNosaca
};

export function prikazi(el, id) {
  if (!el) throw new Error('teme_robotino: nedostaje element');
  if (!GRADITELJI[id] || !TEME[id]) {
    el.replaceChildren(H('p', { class: 'tro-stanje tro-upoz', tekst: 'Tema „' + id + '” ne postoji.' }));
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
