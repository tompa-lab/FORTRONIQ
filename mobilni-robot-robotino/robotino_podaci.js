/* FORTRONIQ · Mobilni robot Robotino — JEDINI izvor istine (brojevi, nazivi, opisi, inačice, pretpostavke).
   Model (robotino_model.js), kinematika (robotino_kin.js), stranice i AR čitaju SAMO odavde.
   Izvor činjenica: PODACI_ROBOTINO.md (istraživanje 17. 10. 2026.); kratice izvora su u IZVORI (PODACI §10).

   KAKO SE MIJENJA PODATAK
   - Potvrđena vrijednost: zamijeni  pp('…', 0.13, '…')  sa  0.13  (i po želji dopiši izvor u komentar) — pretpostavka nestaje sa stranica.
   - Nova procjena: omotaj broj u pp(sto, vrijednost, napomena, prikaz).
   - Sukob izvora: sukob(sto, vrijednost, napomena, prikaz) — vrijednost se koristi, a sukob se ispisuje.
   - Inačica robota: promijeni prekidač u KONFIG — model i tekstovi se prilagode sami.
   Jedinice: metri, sekunde, radijani (osim gdje piše °). Koordinate robota: x naprijed, y lijevo, z gore.
   © ForTroniQ d.o.o. */

/* ================================================================== prekidači inačice */
export const KONFIG = {
  generacija: 'R4',          // 'R4' | 'R3'
  nadogradnja: 'cp-mr-c',    // 'cp-mr-c' (toranj + prihvat nosača) | null (samo osnovica)
  laser: 'hokuyo-urg04',     // 'hokuyo-urg04' | 'hokuyo-ust10' | 'sick-nanoscan3' | null
  kamera: 'd435',            // 'd435' | 'c920' | null
  baterije: 'festool4',      // 'festool4' | 'festool2' | 'olovne2'
  stanica: true              // stanica za punjenje s markerima
};
const R4 = KONFIG.generacija !== 'R3';
const CPMR = KONFIG.nadogradnja === 'cp-mr-c';

/* ================================================================== registar pretpostavki i sukoba */
const _REG = [];
const zarez = (n) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
function fmt(v) {
  if (typeof v === 'number') return zarez(v);
  if (Array.isArray(v)) return v.map(fmt).join(' / ');
  return String(v);
}
const mm = (v) => zarez(Math.round(v * 10000) / 10) + ' mm';
/** pretpostavka: vrijednost se koristi, a na stranicama se ispisuje u popisu pretpostavki */
function pp(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'pretpostavka', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** sukob izvora: koristi se navedena vrijednost, a druga vrijednost je u napomeni */
function sukob(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'sukob', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/* pretpostavke inačica koje nisu odabrane u KONFIG ne ulaze u popis */
const ppAko = (uvjet, sto, v, nap, pr) => (uvjet ? pp(sto, v, nap, pr) : v);
const sukobAko = (uvjet, sto, v, nap, pr) => (uvjet ? sukob(sto, v, nap, pr) : v);
const ST_ON = !!KONFIG.stanica, L_ON = !!KONFIG.laser, K_ON = !!KONFIG.kamera;
const FOTO = 'procjena iz fotografije (mjerilo: promjer osnovice 450 mm)';

/* ================================================================== mjere modela (m) */
const D = 0.450;                                  // IP4-OV, INFS
const RW = sukob('Polumjer kotača rw', 0.060, 'Priručnik R4 navodi kotač Ø120 mm (rw = 0,060 m) [R4-MAN]; priručnik CP-MR navodi Ø125 mm (rw = 0,0625 m) [CPMR-C]. Koristi se 0,060 m.', '0,060 m (Ø120 mm)');
const RB = pp('Udaljenost središte–kotač rb', 0.130, 'Nije objavljena za R3/R4. API (doba R2) zadaje 0,132 m [HABR]; procjena iz fotografije ~130 mm. Izmjeriti na robotu.', '130 mm');
const H_OSN = R4 ? 0.325 : 0.290;                 // IP4-OV / INFS
const Z_PALUBA = pp('Visina gornje ploče osnovice (gornji rub bočnih pokrova)', 0.215, FOTO, '215 mm');
const Z_PREDNJA = pp('Visina spuštene prednje ploče (nosač lasera)', 0.140, FOTO, '140 mm');
const LASER_Z = ppAko(L_ON, 'Visina ravnine skeniranja lasera', 0.210, 'Procjena iz fotografije: os skeniranja ~190–210 mm, vrh skenera ~200–230 mm.', '210 mm');
const TORANJ_X = ppAko(CPMR, 'Položaj tornja na osnovici (x)', 0.025, 'Toranj stoji u izrezu pokrova upravljačke jedinice, približno u središtu; ' + FOTO, '25 mm ispred središta');
const IR_KUT0 = pp('Kut prvog IR senzora', 0, 'Razmak 40° je objavljen [IP4-DIST]; da je senzor 1 točno naprijed (0°) i da se broji suprotno od kazaljke, pretpostavka je.', '0° (naprijed), dalje +40°');
const Z_PRIHVAT = ppAko(CPMR, 'Visina gornje plohe prihvata nosača', 1.020, 'Procjena iz fotografije ~1000–1050 mm.', '1020 mm');

export const MJERE = {
  promjerOsnovice: sukob('Promjer osnovice', D, 'Robotino 3/4: 450 mm [INFS], [IP4-OV]; priručnik CP-MR: 47 cm [CPMR-C] — vjerojatno s odbojnikom ili izbočinama.', '450 mm'),
  visinaOsnovice: H_OSN,
  zracnostTla: pp('Udaljenost donjeg ruba šasije od tla', 0.012, FOTO, '12 mm'),
  odbojnik: { visina: pp('Visina profila odbojnika', 0.028, FOTO, '28 mm'), debljina: pp('Debljina profila odbojnika', 0.018, FOTO, '18 mm') },
  prsten: { vrh: pp('Gornji rub donjeg prstena od nehrđajućeg čelika', 0.075, FOTO, '75 mm') },
  paluba: Z_PALUBA,
  prednjaPloca: { visina: Z_PREDNJA, kutPola: pp('Kutni raspon spuštene prednje ploče', 40, FOTO, '±40°'), polumjerUnutra: 0.095 },
  otvorKotaca: { sirina: pp('Širina otvora za kotač u pokrovu', 0.150, FOTO, '150 mm'), vrh: pp('Gornji rub otvora za kotač', 0.190, FOTO, '190 mm') },
  kupola: { rubX: pp('Prednji rub pokrova upravljačke jedinice (x)', 0.050, FOTO, '50 mm ispred središta'), zarez: 0.050, debljinaStijenke: 0.003 },
  tipkalo: { x: pp('Položaj glavnog tipkala', -0.045, FOTO + '; PODACI: „približno u središtu” pokrova', 'x = −45 mm, y = 60 mm'), y: 0.060, promjer: pp('Promjer glavnog tipkala', 0.020, FOTO, '20 mm') },

  /* pogon */
  rw: RW,
  rb: RB,
  sirinaKotaca: pp('Širina kotača', 0.044, FOTO + ' (~40–45 mm)', '44 mm'),
  visinaOsi: RW,
  kutoviKotaca: [60, 180, 300],                   // HABR (izračun iz vektora smjera vožnje)
  valjci: {
    poKotacu: 16,                                  // OR-WHEEL (48 u kompletu od 3 kotača)
    redova: pp('Raspored valjaka', 2, 'Nije objavljen; uobičajeno za omni-kotače: dva reda po 8 valjaka.', '2 reda po 8'),
    promjer: pp('Najveći promjer valjka', 0.022, 'Procjena (valjak je kraći od osovinice 36 mm).', '22 mm'),
    duljina: pp('Duljina valjka', 0.030, 'Procjena; osovinica ISO 2338-4h8×36 [OR-WHEEL] je dulja od valjka.', '30 mm')
  },
  motor: { promjer: 0.042, duljina: 0.085, vratilo: 0.005 },          // MOT-PDF
  reduktor: { promjer: 0.042, duljina: pp('Duljina planetarnog reduktora PLG 42 S', 0.047, 'Mjera nije u prikupljenim izvorima.', '47 mm') },
  enkoder: { promjer: pp('Promjer kućišta enkodera RE 30', 0.030, 'Procjena iz oznake (RE 30).', '30 mm'), duljina: 0.018 },
  pogon: {
    pomakMotora: pp('Raspored motora u pogonskoj jedinici', 0.080, 'Načelni prikaz: os motora usporedna s osi kotača, pomaknuta za 80 mm bočno i podignuta; remen spaja remenice. Stvarni raspored nije objavljen.', 'bočno 80 mm, os na 100 mm'),
    visinaMotora: 0.100,
    xRemena: 0.100,                                // ravnina remena (od središta robota, po osi kotača)
    rRemeniceKotaca: 0.016, rRemeniceMotora: 0.010
  },

  /* senzori */
  ir: {
    broj: 9,                                       // IP4-DIST
    kutovi: [0, 40, 80, 120, 160, 200, 240, 280, 320].map((k) => k + IR_KUT0),
    visina: pp('Visina IR senzora iznad poda', 0.058, FOTO + ' (~60–80 mm; u modelu u donjem prstenu)', '58 mm'),
    polumjer: 0.2165                               // površina donjeg prstena (= promjer/2 − 8,5 mm)
  },
  laser: {
    x: ppAko(L_ON, 'Položaj laserskog skenera (x od središta)', 0.150, FOTO, '150 mm'), y: 0, visinaOsi: LASER_Z,
    kutMin: -120, kutMax: 120, domet: 5.6          // nadjačava se iz SENZORI.laser[KONFIG.laser] niže
  },
  kamera: { x: ppAko(K_ON, 'Položaj kamere', 0.150, 'Kamera na nosaču na prednjoj ploči iznad lasera [IP4-CAM], [R4-MAN]; točan položaj nije poznat.', 'x = 150 mm, z = 285 mm'), z: 0.285 },
  kontakt: {
    x: pp('Položaj kontakta za punjenje (prednja ploha)', 0.245, 'Crna kocka ~50 mm sprijeda, lijevo od lasera, ~120–160 mm iznad poda; ' + FOTO, 'x = 245 mm, y = 70 mm, z = 135 mm'),
    y: 0.070, z: 0.135, a: 0.050
  },
  opticki: { x: 0.170, y: 0.040, z: 0.012 },       // položaj na dnu — pretpostavka (vidi DIJELOVI)
  induktivni: { x: 0.190, y: 0, z: 0.012 },

  /* napajanje */
  baterija: { a: pp('Smještaj baterija u modelu', 0.100, 'Paketi su u modelu u prstenu iznad pogona, uz stražnji otvor (dostupni straga [IP4-AKKU]); oblik paketa i smještaj su procjena.', '4 paketa iznad pogona, straga'),
    b: 0.070, c: 0.062, polumjer: 0.165, z: 0.124, kutovi: [158, 202, 114, 246] },

  /* nadogradnja CP-MR (toranj, prihvat nosača) */
  toranj: {
    x: TORANJ_X, y: 0,
    inox: { sirina: ppAko(CPMR, 'Inox U-profil tornja', 0.060, FOTO + ' (~60 × 40 mm)', '60 × 40 mm, do 620 mm'), dubina: 0.040, vrh: 0.620 },
    al: { sirina: ppAko(CPMR, 'Aluminijski profil tornja', 0.040, FOTO, '40 × 40 mm') },
    vrh: 0.785                                     // CPMR-C: visina s tornjem 78,5 cm
  },
  kutijaResetStart: {
    sirina: ppAko(CPMR, 'Kutija RESET/START', 0.120, FOTO + ' (~120 × 170 × 50 mm, središte ~850–900 mm)', '120 × 170 × 50 mm, središte 875 mm'),
    visina: 0.170, dubina: 0.050, zSredina: 0.875
  },
  prihvat: {
    z: Z_PRIHVAT,
    duljina: ppAko(CPMR, 'Duljina prihvata (duž traka)', 0.500, FOTO + '; ukupna širina s E/A kutijom 520 mm [CPMR-C].', '500 mm'),
    sirina: ppAko(CPMR, 'Širina prihvata (poprijeko)', 0.230, FOTO, '230 mm'),
    smjer: ppAko(CPMR, 'Smjer traka prihvata', 'y', 'Trake idu poprečno, duž osi y robota: tako je ukupna širina robota s nadogradnjom 52 cm [CPMR-C] veća od promjera osnovice; na fotografiji su vodilice poprečne. Potvrditi na robotu.', 'duž osi y robota (poprečno)'),
    razmakTraka: 0.100, sirinaTrake: 0.030, korakRebara: 0.020
  },
  eaKutija: { duljina: ppAko(CPMR, 'E/A kutija na kraju prihvata', 0.120, FOTO + ' (~200 × 100 × 120 mm)', '120 × 240 × 110 mm'), sirina: 0.240, visina: 0.110 },
  signalniStup: {
    promjer: ppAko(CPMR, 'Signalni stup', 0.040, FOTO + ' (Ø~40 mm, segmenti ~45 mm)', 'Ø40 mm, 3 × 45 mm'),
    segment: 0.045, broj: 3, vrh: 1.230,           // vrh 1230 mm = službena visina s transportnom jedinicom [CPMR-C] (pretpostavka da je to vrh stupa)
    x: ppAko(CPMR, 'Položaj signalnog stupa', -0.070, FOTO + ' — na kraju prihvata uz E/A kutiju.', 'stražnji rub, desni kraj prihvata'), y: -0.215
  },
  nuzniStop: {
    profil: 0.030, vrhStupa: ppAko(CPMR, 'Vrh stupa nužnog stopa', 1.235, FOTO + ' (~1300 mm s kućištem)', '1235 mm (+ kućište 80 mm)'),
    kuciste: { a: 0.060, v: 0.080 }, gljiva: 0.040,
    x: ppAko(CPMR, 'Položaj stupa nužnog stopa', -0.105, 'Na fotografiji stup je uz toranj; u modelu je na stražnjem rubu prihvata da ne smeta nosaču na trakama.', 'stražnji rub prihvata, y = 40 mm'), y: 0.040
  },
  nosac: { duljina: ppAko(CPMR, 'Nosač izratka', 0.150, 'Mjere nosača izratka nisu u prikupljenim izvorima.', '150 × 150 × 25 mm'), sirina: 0.150, visina: 0.025 },

  /* visine cijelog sklopa (CPMR-C) */
  visinaSTornjem: 0.785, visinaUkupno: 1.230, sirinaSNadogradnjom: 0.520,

  /* stanica za punjenje (FAC-248): 535 × 212 × 152 mm — lokalni KS stanice: x = normala prednje plohe (prema robotu), y lijevo, z gore,
     ishodište = sredina donjeg ruba prednje plohe */
  stanica: {
    sirina: 0.535, dubina: 0.212, visina: 0.152,
    kontakt: { y: ppAko(ST_ON, 'Položaj kontaktne ploče na stanici', -0.070, 'Ploča je pomaknuta tako da se poklopi s kontaktom robota kad je robot u sredini stanice; stvarni položaj nije poznat.', 'y = −70 mm, z = 135 mm'), z: 0.135, sirina: 0.070, visina: 0.060 },
    razmakMarkera: ppAko(ST_ON, 'Razmak reflektorskih markera', 0.380, 'Na fotografiji je vidljiva jedna bijela ploča s točkastim uzorkom; drugi marker i razmak su pretpostavka prema algoritmu pristajanja s lijevim i desnim markerom [OR-DOCK].', '380 mm'),
    marker: { x: -0.030, sirina: 0.100, visina: 0.115 },
    kameraMarker: { x: ppAko(ST_ON, 'Položaj osvijetljenog 2D markera', -0.160, FOTO + ' (crna kutija ~110 × 140 mm na stražnjem dijelu stanice)', 'sredina, stražnji rub stanice'), y: 0, sirina: 0.110, visina: 0.140, dubina: 0.035 }
  }
};
/* izvedene mjere stanice: robot pristaje okrenut stanici (zakret = zakret stanice + π), središte na normali */
MJERE.stanica.pristajanje = MJERE.kontakt.x + 0.002;    // razmak prednje plohe stanice do središta robota pri dodiru (m)

/* ================================================================== pogon */
export const POGON = {
  gear: 32,                                        // IP3-GEAR, IP4-GEAR, R4-MAN (ukupno motor → kotač)
  rw: RW, rb: RB,
  nMotMax: 3600,                                   // R4-MAN
  impulsaPoOkr: 500, inkPoOkr: 2000,               // IP4-ENC (RE 30-2-500), RV-ENC (×4)
  inkPoOkrKotaca: 64000,                           // izračun
  regulator: { tip: 'PI', f: 1000, K: 0.4, Ki: 0.01, izlazMax: 255, izvor: 'OR-PI' },
  motor: {
    tip: 'Dunkermotoren GR 42x40', klasa: '20 W', vrsta: 'četkasti DC',
    napon: pp('Izvedba namota motora', 24, 'PWM 0–24 V [R4-MAN] i 93,5 1/min na kotaču u CP-MR (×32 = 2992 1/min) [CPMR-C] odgovaraju izvedbi 24 V; jedan završni rad o Robotinu 3 [ZR-R3] navodi 40 V.', '24 V'),
    nazivnaBrzina: 3100, nazivniMoment: 0.057, nazivnaStruja: 1.2, brzinaPraznogHoda: 3800, potezniMoment: 0.33,
    promjer: 0.042, duljina: 0.085, vratilo: 0.005, masa: 0.49, ip: 'IP50', inercija: 110e-7,   // MOT-PDF (inercija kg·m²)
    izvor: 'MOT-PDF'
  },
  reduktor: { tip: 'Dunkermotoren PLG 42 S', i: 32, stupnjeva: 2, eta: 0.81, trajniMoment: 6.0, masa: 0.37, aksijalno: 150, radijalno: 250, izvor: 'IP4-GEAR, ZR-R3' },
  remen: { tip: 'ConCar S3M', korak: 0.003, izvor: 'IP4-GEAR' },
  enkoder: { tip: 'Dunkermotoren RE 30-2-500', impulsa: 500, inkPoOkr: 2000, inkPoOkrKotaca: 64000, izvor: 'IP4-ENC, RV-ENC' },
  /* granice za simulator (softverske) */
  ogranicenja: {
    vMax: pp('Najveća brzina u simulatoru', 0.5, 'CP-MR: 0,52–0,6 m/s [CPMR-C]; teorijski iz 3600 1/min ≈ 0,71 m/s obodno. Marketinških 10 km/h ne odgovara pogonu (sukob).', '0,5 m/s'),
    wMax: pp('Najveća kutna brzina u simulatoru', 1.5, 'Nije objavljena; izračun ω_max ≈ 5,4 rad/s uz rb = 0,13 m, u softveru se ograničava na 1–2 rad/s.', '1,5 rad/s')
  },
  periodNaredbe: { api2: 0.1, rest: 0.2 }          // API-OMNI, OR-REST (bez nove naredbe unutar 200 ms robot staje)
};
pp('Numeracija motora M1–M3 na stvarnom robotu', 'M1 = 60°, M2 = 180°, M3 = 300°', 'Kutovi kotača slijede API (OmniDriveModel) [HABR]; fizička numeracija nije potvrđena službenim crtežom — provjeriti podizanjem robota i pogonom jednog motora.');
sukob('Najveća brzina robota', '0,5–0,8 m/s', 'Marketinški „do 10 km/h” [INFS], [FAC-244] ne slaže se s pogonom: 3600 1/min, 32 : 1 i Ø120 mm daju ≈ 0,71 m/s obodno; CP-MR navodi 0,52–0,6 m/s [CPMR-C].');

/* ================================================================== senzori */
const LASERI = {
  'hokuyo-urg04': {
    naziv: 'Hokuyo URG-04LX-UG01', katBr: '8029454', kutMin: -120, kutMax: 120, razlucivost: 0.352, dometMin: 0.02,
    domet: sukobAko(KONFIG.laser === 'hokuyo-urg04', 'Domet laserskog skenera URG-04LX', 5.6, 'Acroname navodi 0,02–5,6 m, a u uvodu i Robotshop 4 m [ACRO], [RSHOP].', '5,6 m'),
    f: 10, tocnost: '±30 mm do 1 m, inače ±3 %', mjere: [0.050, 0.050, 0.070], masa: 0.16, sucelje: 'USB (podatci i napajanje), SCIP 2.0',
    boja: 'crna', izvor: 'IP4-LASER, ACRO'
  },
  'hokuyo-ust10': {
    naziv: 'Hokuyo UST-10LX', kutMin: -135, kutMax: 135, razlucivost: 0.25, dometMin: 0.02,
    domet: ppAko(KONFIG.laser === 'hokuyo-ust10', 'Podaci skenera UST-10LX', 10, 'U PODACI je naveden samo model (ZR-R3). Kut 270°, domet 10 m, 40 Hz i mjere 50 × 50 × 70 mm su opći podaci proizvođača koji nisu provjereni u ovom istraživanju.', '270°, 10 m, 40 Hz'),
    f: 40, mjere: [0.050, 0.050, 0.070], masa: 0.13, sucelje: 'Ethernet', boja: 'crna', izvor: 'ZR-R3'
  },
  'sick-nanoscan3': {
    naziv: 'SICK nanoScan3 Core I/O', katBr: '1100333', kutMin: -137.5, kutMax: 137.5, razlucivost: 0.17, dometMin: 0.05,
    domet: ppAko(KONFIG.laser === 'sick-nanoscan3', 'Domet nanoScan3 u simulatoru', 3.0, 'Izvor navodi zaštitno polje 3 m („3m Max Range”) [RS-NANO]; mjerni domet nije prikupljen.', '3 m (zaštitno polje)'),
    f: 33, odziv: 0.070, mjere: [0.1066, 0.080, 0.1175], sucelje: 'Ethernet, OSSD izlazi, USB za konfiguraciju', boja: 'žuta', izvor: 'CPMR-SCH23, RS-NANO'
  }
};
export const SENZORI = {
  ir: {
    tip: 'Sharp GP2Y0A41SK0F', broj: 9, razmak: 40, dometMin: 0.04, dometMax: 0.30, izlaz: 'analogni napon', izvor: 'IP4-DIST, IP3-DIST',
    stozac: pp('Širina snopa IR senzora u simulatoru', 4, 'U simulatoru se svaki senzor računa s tri zrake (os i ±4°); širina snopa nije u prikupljenim izvorima.', '±4°'),
    /* [udaljenost m, napon V] — približna tipična krivulja; ispod ~3 cm napon opet pada (nejednoznačno područje) */
    krivulja: pp('Krivulja napon–udaljenost IR senzora', [[0.010, 1.10], [0.020, 2.30], [0.030, 3.00], [0.040, 2.75], [0.050, 2.30], [0.060, 2.00], [0.080, 1.55], [0.100, 1.28], [0.120, 1.08], [0.150, 0.88], [0.200, 0.67], [0.250, 0.54], [0.300, 0.45], [0.400, 0.38]],
      'Približna tipična krivulja senzora (4 cm ≈ 2,75 V … 30 cm ≈ 0,45 V); točne vrijednosti nisu u prikupljenim izvorima.', '4 cm ≈ 2,75 V … 30 cm ≈ 0,45 V')
  },
  odbojnik: { tip: 'Mayser SK EKS011', nacelo: 'sklopna komora, mirna struja (prekid kabela = signal)', izvor: 'IP4-BUMP, IP3-BUMP' },
  ziroskopi: {
    R4: { tip: 'CruizCore R6093U', mjesto: 'upravljačka jedinica', izvor: 'IP4-GYRO' },
    R3: { tip: 'MPU6050', mjesto: 'I/O ploča', drift: 'kompenzacija nakon 500 ms mirovanja', skala: '±2 %', izvor: 'OR-MPU' }
  },
  ziroskop: null,
  opticki: { tip: R4 ? 'Festo SOEG-L-Q30-P-A-K-2L' : 'refleksni optički senzor', broj: 2, svjetlo: 'vidljivo crveno', ulaz: 'digitalni (DI1 NO, DI2 NC)', izvor: R4 ? 'IP4-OPT' : 'R3-MAN' },
  induktivni: { katBr: '8029483', ulaz: 'analogni (npr. AI1)', zice: 'smeđa, crna, plava', izvor: 'R4-MAN' },
  laser: LASERI,
  kamera: {
    d435: { naziv: 'Intel RealSense D435', opis: 'RGB + IR projektor + 2 IR kamere (dubina)', sucelje: 'USB 3.0', mjere: ppAko(KONFIG.kamera === 'd435', 'Mjere kamere D435', [0.090, 0.025, 0.025], 'Brojčane specifikacije D435 nisu prikupljene; za model ~90 × 25 × 25 mm.', '90 × 25 × 25 mm'), izvor: 'IP4-CAM, R4-MAN' },
    c920: { naziv: 'Logitech HD Pro Webcam C920', opis: 'RGB web-kamera', sucelje: 'USB', mjere: [0.094, 0.029, 0.024], izvor: 'IP3-CAM' }
  },
  /* senzori transportne jedinice CP-MR */
  bg1: { tip: 'Festo SOEG-L-Q30-P-A-S-2L (165327)', svjetlovod: '165360', izvor: 'CPMR-SCH23' },
  handshake: { prijemnik: 'FES 165323 (BG2)', odasiljac: 'FES 165353 (BG3)', komplet: 'MPS Handshake Kit 8124921', razmak: 0.5, izvor: 'CPMR-SCH23, IP4-HAND' },
  irPozicioniranje: { tip: 'Sharp GP2Y0A41SK0F', oznake: ['BG4 (IR-L)', 'BG5 (IR-C)', 'BG6 (IR-R)'], izvor: 'CPMR-SCH23' }
};
SENZORI.ziroskop = R4 ? SENZORI.ziroskopi.R4 : SENZORI.ziroskopi.R3;
if (KONFIG.laser && LASERI[KONFIG.laser]) {
  const L = LASERI[KONFIG.laser];
  Object.assign(MJERE.laser, { kutMin: L.kutMin, kutMax: L.kutMax, domet: L.domet, dometMin: L.dometMin });
}
const LZ = KONFIG.laser ? LASERI[KONFIG.laser] : null;
const KAM = KONFIG.kamera ? SENZORI.kamera[KONFIG.kamera] : null;

/* ================================================================== skupine i izvori */
export const SKUPINE = ['Osnovica', 'Pogon', 'Senzori', 'Upravljačka jedinica', 'Napajanje', 'Nadogradnja CP-MR', 'Stanica za punjenje'];

export const IZVORI = {
  'IP4-OV': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Overview/EN/index.html',
  'IP4-IF': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Interfaces/EN/index.html',
  'IP4-GEAR': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/DriveSystem/EN/GearUnits.html',
  'IP4-MOT': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/DriveSystem/EN/Motors.html',
  'IP4-ENC': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/DriveSystem/EN/IncrementalEncoder.html',
  'IP4-OMNI': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/DriveSystem/EN/Omnidrive.html',
  'IP4-DIST': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Sensors/EN/DistanceSensors.html',
  'IP4-BUMP': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Sensors/EN/Bumper.html',
  'IP4-GYRO': 'https://ip.festo-didactic.com/Infoportal/Robotino/Hardware/Sensors/EN/Gyroscope.html',
  'IP4-CAM': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Sensors/EN/Camera.html',
  'IP4-OPT': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Sensors/EN/OpticalSensors.html',
  'IP4-LASER': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Modules/EN/Laser.html',
  'IP4-HAND': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Modules/EN/Handshake.html',
  'IP4-PSU': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Supply/EN/PowerSupplyUnit.html',
  'IP4-AKKU': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Supply/EN/Akkus.html',
  'IP4-CHGST': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Supply/EN/ChargingStation.html',
  'IP4-CU': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Controller/EN/ControlUnit.html',
  'IP4-PSW': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Hardware/Controller/EN/PowerSwitch.html',
  'IP4-RV': 'https://ip.festo-didactic.com/InfoPortal/Robotino/Software/Programming/EN/RobotinoView.html',
  'R4-MAN': 'https://ip.festo-didactic.com/InfoPortal/robotino/Document/manual.pdf',
  'IP3-MOT': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/DriveSystem/EN/Motors.html',
  'IP3-GEAR': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/DriveSystem/EN/GearUnits.html',
  'IP3-OMNI': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/DriveSystem/EN/Omnidrive.html',
  'IP3-ENC': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/DriveSystem/EN/IncrementalEncoder.html',
  'IP3-DIST': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Sensors/EN/DistanceSensors.html',
  'IP3-BUMP': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Sensors/EN/Bumper.html',
  'IP3-CAM': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Sensors/EN/Camera.html',
  'IP3-BAT': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Supply/EN/Batteries.html',
  'IP3-CHG': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Supply/EN/ChargingElectronics.html',
  'IP3-PSU': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Supply/EN/PowerSupplyUnit.html',
  'IP3-MCU': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Controller/EN/Microcontroller.html',
  'IP3-EPC': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Controller/EN/EmbeddedPC.html',
  'IP3-PSW': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Controller/EN/PowerSwitch.html',
  'IP3-IF': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Hardware/Interfaces/EN/index.html',
  'IP3-WEBSET': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Software/Webinterface/EN/Settings.html',
  'IP3-WEBCTL': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Software/Webinterface/EN/Control.html',
  'R3-MAN': 'https://ip.festo-didactic.com/InfoPortal/Robotino3/Document/robotinomanual_en_de.pdf',
  'MOT-PDF': 'https://ip.festo-didactic.com/InfoPortal/Robotino/document/robotinomotorstechnicaldescription_en_de.pdf',
  'CPMR-C': 'https://ip.festo-didactic.com/InfoPortal/CPFactoryLab/data/CP-MR/files_C/manual_en.pdf',
  'CPMR-DE': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-MR/files_C/manual_de.pdf',
  'CPMR-B': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-MR/files_B/manual_en.pdf',
  'CPMR-SCH23': 'https://ip.festo-didactic.com/InfoPortal/CPFactoryLab/data/CP-MR/files/schematics_until_2023.pdf',
  'CPMR-SCH24': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-MR/files/schematics_from_2024.pdf',
  'CP-MRC': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-MR-C&lang=en',
  'CP-MRB': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-MR-B&lang=en',
  'FAC-244': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/244-245/',
  'FAC-246': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/246-247/',
  'FAC-248': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/248-249/',
  'INFS': 'https://sf.infs.ch/wp-content/uploads/3307/01_Robotino-Presentation.pdf',
  'NUS': 'https://guppy.mpe.nus.edu.sg/~mpeangh/wss-mob-robot/Mobile Robotics Annex A.pdf',
  'OR-MAIN': 'https://wiki.openrobotino.org/',
  'OR-R4': 'https://wiki.openrobotino.org/Robotino4.html',
  'OR-R3': 'https://wiki.openrobotino.org/Robotino3.html',
  'OR-R2': 'https://wiki.openrobotino.org/Robotino2.html',
  'OR-WHEEL': 'https://wiki.openrobotino.org/Omniwheel.html',
  'OR-PI': 'https://wiki.openrobotino.org/Robotino3_PI_controller.html',
  'OR-MPU': 'https://wiki.openrobotino.org/MPU6050.html',
  'OR-LED': 'https://wiki.openrobotino.org/Robotino3_Power_Button_LED_pattern.html',
  'OR-CPU': 'https://wiki.openrobotino.org/Robotino3_cpu_board.html',
  'OR-PWR': 'https://wiki.openrobotino.org/Robotino3_power_board.html',
  'OR-REST': 'https://wiki.openrobotino.org/Rest_api.html',
  'OR-ROS': 'https://wiki.openrobotino.org/ROS.html',
  'OR-DOCK': 'https://wiki.openrobotino.org/SmartRobotinoBatteryChargerDocking4.html',
  'API-OMNI': 'https://doc.openrobotino.org/download/RobotinoAPI2/rec_robotino_api2/classrec_1_1robotino_1_1api2_1_1_omni_drive.html',
  'API-MODEL': 'https://doc.openrobotino.org/download/RobotinoAPI2/rec_robotino_api2/classrec_1_1robotino_1_1api2_1_1_omni_drive_model.html',
  'RV-OMNI': 'https://doc.openrobotino.org/download/RobotinoView/en/robotino_omnidrive.htm',
  'RV-MOTOR': 'https://doc.openrobotino.org/download/RobotinoView/en/robotino_motor.htm',
  'RV-ENC': 'https://doc.openrobotino.org/download/RobotinoView/en/robotino_encoderinput.htm',
  'ML-OMNI': 'https://doc.openrobotino.org/download/RobotinoMatlab/html/OmniDrive.html',
  'HABR': 'https://qna.habr.com/q/440992',
  'USFQ': 'https://repositorio.usfq.edu.ec/bitstream/23000/14176/1/207264-213967.pdf',
  'FORUM-GEN': 'https://forum.openrobotino.org/forum/main-forum/hardware/robotino2-aa/353-how-can-i-easily-identify-which-robotino-generation-do-i-have.html',
  'FORUM-DOCK': 'https://forum.openrobotino.org/forum/main-forum/software/12803-robotino-factory-4-box-docking-process.html',
  'WIKI-EN': 'https://en.wikipedia.org/wiki/Robotino',
  'FAPS': 'https://www.faps.tf.fau.de/2017/06/27/mobile-roboterplattform-robotino3/',
  'ACRO': 'https://acroname.com/store/r325-urg-04lx-ug01',
  'RSHOP': 'https://www.robotshop.com/products/hokuyo-urg-04lx-laser-rangefinder',
  'RS-NANO': 'https://uk.rs-online.com/web/p/light-detection-and-ranging/2856790'
};

/* ================================================================== dijelovi (redoslijed = redoslijed u Upoznavanju) */
const OS = 'Osnovica', PG = 'Pogon', SN = 'Senzori', UJ = 'Upravljačka jedinica', NP = 'Napajanje', NC = 'Nadogradnja CP-MR', ST = 'Stanica za punjenje';
const VEK = { 60: '(−√3/2, ½)', 180: '(0, −1)', 300: '(√3/2, ½)' };
const NAZ_POL = { 60: 'naprijed lijevo', 180: 'straga', 300: 'naprijed desno' };

function pogonske() {
  const out = [];
  MJERE.kutoviKotaca.forEach((th, k) => {
    const i = k + 1;
    out.push(
      { id: 'pogonskaJedinica' + i, skupina: PG, naziv: `Pogonska jedinica ${i} (${th}°, ${NAZ_POL[th]})`,
        opis: `Jedna od tri neovisne pogonske jedinice ugrađene u šasiju; kotač joj je pod kutom ${th}° od osi x robota. Čine je istosmjerni motor, inkrementalni enkoder, planetarni reduktor, zupčasti remen i omnidirekcijski kotač na nosaču. Tri jedinice razmaknute za 120° daju holonomski pogon: robot vozi u bilo kojem smjeru i istodobno se okreće.`,
        podaci: [['Kut kotača', th + '° od osi x'], ['Smjer vožnje kotača', VEK[th]], ['Udaljenost od središta rb', mm(RB)], ['Ukupni prijenos', '32 : 1']],
        izvor: 'IP4-OMNI, HABR', pretpostavka: true, napomena: 'Fizička numeracija motora i raspored dijelova unutar jedinice nisu potvrđeni službenim crtežom (načelni prikaz).', tema: 'pogonskaJedinica' },
      { id: 'motor' + i, skupina: PG, naziv: `Motor M${i}`,
        opis: `Četkasti istosmjerni motor Dunkermotoren GR 42x40 klase 20 W. Napaja ga PWM napon 0–24 V iz elektronike robota, a brzinu mu drži PI regulator na mikrokontroleru. Najveća brzina je 3600 1/min, što nakon prijenosa 32 : 1 daje 112,5 1/min na kotaču, odnosno ≈ 0,71 m/s obodne brzine.`,
        podaci: [['Tip', 'Dunkermotoren GR 42x40'], ['Kućište', 'Ø42 × 85 mm, vratilo Ø5 mm'], ['Nazivno (24 V)', '3100 1/min · 5,7 Ncm · 1,2 A'], ['Prazni hod (24 V)', '3800 1/min'], ['Potezni moment (24 V)', '33 Ncm'], ['Najveća brzina (R4)', '3600 1/min'], ['Masa, zaštita', '490 g, IP50']],
        izvor: 'IP4-MOT, MOT-PDF, R4-MAN', pretpostavka: true, napomena: 'Izvedba namota 24 V je pretpostavka (jedan završni rad o Robotinu 3 navodi 40 V).', tema: 'regulacija' },
      { id: 'enkoder' + i, skupina: PG, naziv: `Enkoder E${i}`,
        opis: `Inkrementalni enkoder Dunkermotoren RE 30-2-500 na stražnjem kraju motora daje dva pravokutna signala, A i B, pomaknuta za četvrtinu periode. Brojanjem svih bridova obaju kanala dobiva se 2000 inkremenata po okretaju motora, a uz prijenos 32 : 1 čak 64 000 po okretaju kotača. Iz promjene stanja brojila u vremenu računaju se brzina motora i odometrija; redoslijed bridova A i B daje smjer vrtnje.`,
        podaci: [['Tip', 'RE 30-2-500'], ['Impulsa po okretaju', '500'], ['Inkremenata po okretaju motora', '2000 (×4)'], ['Inkremenata po okretaju kotača', '64 000'], ['Put kotača po inkrementu', '≈ 5,9 µm (izračun)']],
        izvor: 'IP4-ENC, RV-ENC', tema: 'enkoder' },
      { id: 'reduktor' + i, skupina: PG, naziv: `Planetarni reduktor P${i}`,
        opis: `Dvostupanjski planetarni reduktor Dunkermotoren PLG 42 S prirubnicom je spojen na motor. Smanjuje brzinu i povećava moment; ukupni prijenos od motora do kotača je 32 : 1. Izvori ne kažu jednoznačno je li 32 : 1 samo planetarni stupanj ili umnožak planetara i remena — za kinematiku je bitan samo ukupni omjer.`,
        podaci: [['Tip', 'PLG 42 S, 2 stupnja'], ['Prijenos (ukupno)', '32 : 1'], ['Stupanj djelovanja', '0,81'], ['Trajni moment', '600 Ncm'], ['Masa', '0,37 kg'], ['Dopušteno opterećenje', 'aksijalno 150 N, radijalno 250 N']],
        izvor: 'IP4-GEAR, ZR-R3', tema: 'pogonskaJedinica' },
      { id: 'remen' + i, skupina: PG, naziv: `Zupčasti remen i remenice R${i}`,
        opis: `Plosnati zupčasti remen ConCar S3M prenosi okretanje s izlaznog vratila reduktora na osovinu kotača. Zbog remena motor ne mora biti u osi kotača, pa pogonska jedinica stane u nisku osnovicu. Zupci ne dopuštaju proklizavanje, pa enkoder na motoru vjerno prati položaj kotača.`,
        podaci: [['Remen', 'ConCar S3M (korak 3 mm)'], ['Omjer remenica u modelu', '1,6 : 1 (načelno)']],
        izvor: 'IP4-GEAR', pretpostavka: true, napomena: 'Položaj motora iznad kotača i promjeri remenica u modelu su načelni prikaz; stvarne mjere nisu objavljene.', tema: 'pogonskaJedinica' },
      { id: 'kotac' + i, skupina: PG, naziv: `Omnidirekcijski kotač K${i}`,
        opis: `Švedski (omnidirekcijski) kotač promjera ${Math.round(RW * 2000)} mm s glodanim aluminijskim tijelom. Po obodu nosi 16 slobodno okretnih valjaka čije su osi okomite na os kotača. Kotač vuče samo u smjeru svoje obodne brzine, a bočno se slobodno kotrlja po valjcima — zato tri takva kotača daju vožnju u svim smjerovima. To nisu mecanum kotači, kod kojih su valjci pod 45°.`,
        podaci: [['Promjer', Math.round(RW * 2000) + ' mm (R4)'], ['Tijelo', 'glodani aluminij'], ['Valjaka', '16'], ['Rezervni dio', '8098079']],
        izvor: 'R4-MAN, OR-WHEEL, FAC-244', pretpostavka: true, napomena: 'Promjer: priručnik R4 navodi Ø120 mm, priručnik CP-MR Ø125 mm (sukob izvora).', tema: 'omniKotac' },
      { id: 'valjci' + i, skupina: PG, naziv: `Valjci kotača K${i} (16 kom)`,
        opis: `Bačvasti valjci imaju jezgru od polikarbonata i plašt od lijevanog prozirnog poliuretana. Svaki se okreće na osovinici (cilindrični zatik Ø4 mm) u dvije ležajne čahure od sinterirane bronce. Bačvasti oblik drži dodirnu točku na kružnici kotača, pa se kotač kotrlja mirno i kad se dodir prebacuje s valjka na valjak.`,
        podaci: [['Broj', '16 po kotaču (48 ukupno)'], ['Materijal', 'PC jezgra, PU plašt'], ['Osovinica', 'ISO 2338 – 4h8 × 36'], ['Ležajne čahure', '4 × 8 × 12 mm, 2 po valjku'], ['Raspored', '2 reda po 8 (pretpostavka)']],
        izvor: 'OR-WHEEL', pretpostavka: true, napomena: 'Raspored valjaka (dva reda po 8) i njihove mjere nisu objavljeni.', tema: 'omniKotac' },
      { id: 'osovina' + i, skupina: PG, naziv: `Osovina i ležajevi kotača K${i}`,
        opis: `Osovina kotača promjera 15/17 mm vrti se u ležajevima nosača pogonske jedinice. Pero DIN 6885 prenosi moment s remenice na osovinu, a uskočnici DIN 471 drže kotač i ležajeve u položaju po osi.`,
        podaci: [['Promjer osovine', 'Ø15 / Ø17 mm (izračun iz uskočnika)'], ['Pero', 'DIN 6885-A-5×5×20'], ['Uskočnici', 'DIN 471-15×1 i 17×1']],
        izvor: 'OR-WHEEL', tema: 'omniKotac' }
    );
  });
  return out;
}

function baterije() {
  if (KONFIG.baterije === 'olovne2') {
    return [1, 2].map((k) => ({ id: 'baterija' + k, skupina: NP, naziv: `Olovna baterija ${k} (12 V)`,
      opis: k === 1 ? 'Olovno-flis (AGM) baterija EFFEKTA BT 12-9,5, 12 V / 9,5 Ah. Dvije baterije, lijevo i desno u šasiji, spojene su serijski na 24 V. Pune se u robotu preko utičnice straga, oko 5 h iz duboko ispražnjenog stanja, a robot se za to vrijeme može koristiti.'
        : 'Druga baterija serijskog para (ukupno 24 V DC). Baterije se ne smiju kratko spajati — opasnost od požara i eksplozije.',
      podaci: [['Tip', 'EFFEKTA BT 12-9,5'], ['Napon / kapacitet', '12 V / 9,5 Ah'], ['Spoj', '2 serijski = 24 V'], ['Autonomija', '~4 h']],
      izvor: 'IP3-BAT, R3-MAN, INFS', tema: 'napajanje' }));
  }
  const n = KONFIG.baterije === 'festool2' ? 2 : 4;
  const out = [];
  for (let k = 1; k <= n; k++) {
    out.push({ id: 'baterija' + k, skupina: NP, naziv: `Baterija ${k} (Festool Li-ion 18 V)`,
      opis: k === 1 ? 'Litij-ionski paket Festool 18 V / 5,2 Ah utiče se sa stražnje strane robota. Robot radi s jednim do četiri paketa spojena paralelno, a dva se mogu zamijeniti za vrijeme rada. Paketi se pune izvan robota na punjaču Festool (TCL 6 ili SCA 8) za manje od sat vremena; sustav se sam ugasi kad je napon prenizak.'
        : `Jedan od ${n} paralelno spojenih paketa Festool 18 V / 5,2 Ah. Robot radi već s jednim paketom, a svaki dodatni produljuje rad za oko 2,5 h (do 10 h s četiri paketa).`,
      podaci: k === 1 ? [['Napon / kapacitet', '18 V / 5,2 Ah'], ['Masa', '~700 g'], ['Kat. br.', '8100249'], ['Spoj', 'paralelno, 1–4 paketa'], ['Punjenje', 'izvan robota, < 1 h']]
        : [['Napon / kapacitet', '18 V / 5,2 Ah'], ['Rad po paketu', '~2,5 h']],
      izvor: 'IP4-AKKU, R4-MAN, FAC-244', pretpostavka: true,
      napomena: 'Vrsta baterija nije potvrđena na robotu; priručnik CP-MR navodi „2 integrirane baterije 12 V” (sukob izvora). Oblik i smještaj paketa u modelu su procjena.', tema: 'napajanje' });
  }
  return out;
}

const LASER_DIO = LZ ? [
  { id: 'laserSkener', skupina: SN, naziv: 'Laserski skener ' + LZ.naziv,
    opis: KONFIG.laser === 'sick-nanoscan3'
      ? 'Sigurnosni laserski skener SICK nanoScan3 nadzire zaštitno polje oko robota i preko OSSD izlaza djeluje na sigurnosnu logiku. Ujedno daje mjerenja udaljenosti za kartu i lokalizaciju. Kut skeniranja je 275°, a zaštitno polje do 3 m.'
      : `Skener rotirajućom laserskom zrakom mjeri udaljenosti u vodoravnoj ravnini ispred i bočno od robota (${LZ.kutMax - LZ.kutMin}°). ${KONFIG.laser === 'hokuyo-urg04' ? 'Daje oko 680 mjerenja po skenu (korak 0,352°) deset puta u sekundi, do 5,6 m. ' : ''}Iz tih podataka robot gradi kartu prostorije, određuje svoj položaj na njoj i nalazi reflektorske markere stanice za punjenje. ${KONFIG.laser === 'hokuyo-urg04' ? 'Spaja se USB-om, preko kojeg dobiva i napajanje.' : ''}`,
    podaci: KONFIG.laser === 'hokuyo-urg04'
      ? [['Model', 'Hokuyo URG-04LX-UG01 (kat. br. 8029454)'], ['Kut', '240°'], ['Razlučivost', '0,352° (360°/1024)'], ['Domet', '0,02–5,6 m'], ['Frekvencija', '10 Hz'], ['Točnost', '±30 mm do 1 m, inače ±3 %'], ['Mjere, masa', '50 × 50 × 70 mm, 160 g'], ['Sučelje', 'USB, SCIP 2.0']]
      : KONFIG.laser === 'sick-nanoscan3'
        ? [['Model', 'SICK nanoScan3 Core I/O (1100333)'], ['Kut', '275°'], ['Vrijeme odziva', '≤ 70 ms'], ['Mjere', '106,6 × 80 × 117,5 mm'], ['Zaštitno polje', '3 m']]
        : [['Model', 'Hokuyo UST-10LX'], ['Kut', '270° (pretpostavka)'], ['Domet', '10 m (pretpostavka)']],
    izvor: LZ.izvor, pretpostavka: true,
    napomena: 'Model skenera određen je prema obliku na fotografiji (crni Hokuyo); tvornički CP-MR od 2023. ima žuti SICK nanoScan3. Položaj i visina ravnine skeniranja su procjena.', tema: 'laserSkener' },
  { id: 'nosacLasera', skupina: SN, naziv: 'Nosač laserskog skenera',
    opis: `Crno četvrtasto podnožje drži skener na prednjoj ploči tako da ravnina skeniranja prolazi iznad pokrova, na oko ${Math.round(LASER_Z * 1000)} mm od poda. Nosač mora biti krut i vodoravan: nagnuta ravnina skeniranja na karti se vidi kao lažna prepreka ili pomaknut zid.`,
    podaci: [['Visina ravnine skeniranja', mm(LASER_Z) + ' (procjena)']], izvor: 'IP4-LASER, R4-MAN', pretpostavka: true, napomena: 'Oblik i visina nosača su procjena iz fotografije.', tema: 'laserSkener' }
] : [];

const KAMERA_DIO = KAM ? [
  { id: 'kamera', skupina: SN, naziv: (KONFIG.kamera === 'd435' ? 'Dubinska kamera ' : 'Web-kamera ') + KAM.naziv,
    opis: KONFIG.kamera === 'd435'
      ? 'Kamera ima RGB senzor, infracrveni projektor i dvije infracrvene kamere iz kojih računa dubinu. Spaja se na USB 3.0. Slika služi za obradu (prepoznavanje boja, crta i markera, npr. osvijetljenog markera stanice), a dubinska slika može se pretvoriti u dvodimenzionalni „laserski” prikaz prepreka.'
      : 'Web-kamera Logitech HD Pro C920 spaja se USB-om na upravljačku jedinicu. Slika se prikazuje u web sučelju i obrađuje u Robotino Viewu: prepoznavanje boja, crta i markera.',
    podaci: [['Model', KAM.naziv], ['Sučelje', KAM.sucelje], ['Mjere (procjena)', KAM.mjere.map((v) => Math.round(v * 1000)).join(' × ') + ' mm'], ['REST', '/cam0 (JPEG)']],
    izvor: KAM.izvor + ', OR-REST', pretpostavka: true, napomena: 'Kamera na fotografiji nije jasno vidljiva; mjere i položaj na nosaču su pretpostavka.', tema: 'pristajanje' },
  { id: 'nosacKamere', skupina: SN, naziv: 'Nosač kamere',
    opis: 'Lagani nosač na prednjoj ploči drži kameru okrenutu naprijed, iznad laserskog skenera. Prema uputama proizvođača laser se montira ispod kamere ili u prostoru za teret.',
    podaci: [['Visina osi kamere', mm(MJERE.kamera.z) + ' (procjena)']], izvor: 'IP4-CAM, R4-MAN', pretpostavka: true, napomena: 'Oblik i položaj nosača su načelni prikaz.' }
] : [];

const NADOGRADNJA = CPMR ? [
  { id: 'toranj', skupina: NC, naziv: 'Toranj (stup) CP-MR',
    opis: 'Uspravni stup podiže transportnu jedinicu na visinu prijenosnih stanica tvornice. Donji dio je savijeni profil od nehrđajućeg lima s pravokutnim izrezima kroz koje prolaze kabeli, a gornji dio aluminijski profil. Robot s tornjem visok je 78,5 cm.',
    podaci: [['Masa', '3 kg'], ['Visina robota s tornjem', '785 mm'], ['Kat. br. (montažni toranj)', '8029514'], ['Donji dio (procjena)', 'inox U-profil ~60 × 40 mm']],
    izvor: 'CPMR-C, FAC-244', pretpostavka: true, napomena: 'Presjeci profila i granica inox/aluminij su procjena iz fotografije.' },
  { id: 'alProfil', skupina: NC, naziv: 'Aluminijski profil tornja',
    opis: 'Gornji dio tornja je aluminijski profil s utorima. Na njega se pričvršćuju kutija RESET/START, nosač transportne jedinice i kabelski snopovi, a položaj im se po visini može podesiti duž utora.',
    podaci: [['Presjek (procjena)', '40 × 40 mm']], izvor: 'CPMR-C', pretpostavka: true, napomena: 'Presjek profila je procjena iz fotografije.' },
  { id: 'kutijaResetStart', skupina: NC, naziv: 'Kutija RESET/START',
    opis: 'Kutija od nehrđajućeg lima na tornju nosi dva svjetleća tipkala Siemens 3SB2: gore RESET, dolje START. Nakon nužnog stopa robot se ne pokreće sam: otpusti gljivu, pritisni RESET i pričekaj da se lampica Reset ugasi — tek tada smije voziti.',
    podaci: [['Tipkala', 'Siemens 3SB2 (SF2 Start, SF3 Reset)'], ['Mjere (procjena)', '120 × 170 × 50 mm']], izvor: 'CPMR-SCH23, CPMR-C', pretpostavka: true, napomena: 'Mjere kutije i raspored tipkala na njoj su procjena iz fotografije.', tema: 'sigurnosniKrug' },
  { id: 'tipkaloReset', skupina: NC, naziv: 'Tipkalo RESET (plavo, SF3)',
    opis: 'Plavo svjetleće tipkalo Siemens 3SB2226-0AF01. Njegova lampica svijetli dok sigurnosni krug čeka potvrdu nakon nužnog stopa; pritiskom se sigurnosni relej vraća u radno stanje i lampica se gasi.',
    podaci: [['Tip', 'Siemens 3SB2226-0AF01'], ['Oznaka', 'SF3'], ['Boja', 'plava, svjetleće']], izvor: 'CPMR-SCH23, CPMR-C', tema: 'sigurnosniKrug' },
  { id: 'tipkaloStart', skupina: NC, naziv: 'Tipkalo START (prozirno, SF2)',
    opis: 'Prozirno svjetleće tipkalo Siemens 3SB2226-0AH01 služi za pokretanje rada nakon što je sigurnosni krug potvrđen.',
    podaci: [['Tip', 'Siemens 3SB2226-0AH01'], ['Oznaka', 'SF2'], ['Boja', 'prozirna, svjetleće']], izvor: 'CPMR-SCH23', tema: 'sigurnosniKrug' },
  { id: 'nosacPrihvata', skupina: NC, naziv: 'Nosač transportne jedinice',
    opis: 'Okvir od aluminijskih profila spaja vrh tornja s prihvatom nosača. Poprečni nosači i kosi upornici ukrućuju konzolu, da se platforma ne njiše pri ubrzavanju i kočenju robota.',
    podaci: [['Masa transportne jedinice', '~10 kg (ukupno)']], izvor: 'CPMR-C', pretpostavka: true, napomena: 'Oblik okvira je pojednostavljen prema fotografiji.' },
  { id: 'prihvatNosaca', skupina: NC, naziv: 'Prihvat nosača izratka (transportna jedinica)',
    opis: 'Gornja platforma prima nosač izratka s prijenosne stanice tvornice CP Factory. Traka uvlači nosač u prihvat, preusmjerivač ga prebacuje na drugu traku, a ona ga u ispravnom položaju izdaje na sljedećoj stanici. Ova varijanta robota za nosače izradaka nosi oznaku CP-MR-C.',
    podaci: [['Varijanta', 'CP-MR-C (D14016), „Robotino WT”'], ['Visina s transportnom jedinicom', '1230 mm'], ['Širina s nadogradnjom', '520 mm'], ['Visina plohe (procjena)', mm(Z_PRIHVAT)]],
    izvor: 'CPMR-C, CP-MRC', pretpostavka: true, napomena: 'Mjere platforme i smjer traka (poprečno, duž osi y robota) procijenjeni su iz fotografije i ukupne širine 52 cm.', tema: 'predajaNosaca' },
  { id: 'trakaPrihvata', skupina: NC, naziv: 'Traka za prihvat',
    opis: 'Transportna traka uvlači nosač izratka s prijenosne stanice u prihvat robota. Pokreće je motor trake, a senzor BG1 javlja kad je nosač stigao.',
    podaci: [['Pogon', 'motor trake Ott, 36 V']], izvor: 'CPMR-C, CPMR-DE', tema: 'predajaNosaca' },
  { id: 'trakaIzdavanja', skupina: NC, naziv: 'Traka za izdavanje',
    opis: 'Druga traka nakon preusmjeravanja izdaje nosač na prijenosnu stanicu, tako da nosač na stanicu stigne u ispravnom položaju.',
    podaci: [['Pogon', 'motor trake Ott, 36 V']], izvor: 'CPMR-C, CPMR-DE', tema: 'predajaNosaca' },
  { id: 'vodilice', skupina: NC, naziv: 'Bočne vodilice prihvata',
    opis: 'Vodilice s obje strane traka vode nosač u smjeru gibanja i ne dopuštaju mu da sklizne s platforme dok robot vozi.',
    podaci: [['Broj', '2']], izvor: 'CPMR-C', pretpostavka: true, napomena: 'Oblik vodilica je procjena iz fotografije.', tema: 'predajaNosaca' },
  { id: 'motorTrake', skupina: NC, naziv: 'Motor trake (Ott, 36 V)',
    opis: 'Istosmjerni motor s reduktorom Ott SWMK403438-3 za 36 V pokreće trake prihvata u oba smjera — za uvlačenje i za izdavanje nosača.',
    podaci: [['Tip', 'Ott SWMK403438-3'], ['Napon', '36 V']], izvor: 'CPMR-SCH23, CPMR-DE', pretpostavka: true, napomena: 'Smještaj motora ispod platforme je pretpostavka.', tema: 'predajaNosaca' },
  { id: 'preusmjerivac', skupina: NC, naziv: 'Preusmjerivač',
    opis: 'Kosa vodilica u prihvatu prebacuje nosač s trake za prihvat na traku za izdavanje, da nosač izađe u ispravnom položaju.',
    podaci: [['Funkcija', 'prebacivanje nosača s trake na traku']], izvor: 'CPMR-C', pretpostavka: true, napomena: 'Oblik i položaj preusmjerivača su načelni prikaz.', tema: 'predajaNosaca' },
  { id: 'bg1', skupina: NC, naziv: 'Senzor prisutnosti nosača (BG1)',
    opis: 'Svjetlovodni senzor Festo SOEG-L-Q30 sa svjetlovodom ispod platforme javlja je li nosač izratka u prihvatu. Tek kad BG1 potvrdi nosač, robot smije krenuti dalje.',
    podaci: [['Oznaka', 'BG1'], ['Senzor', 'SOEG-L-Q30-P-A-S-2L (165327)'], ['Svjetlovod', '165360']], izvor: 'CPMR-SCH23, CPMR-DE', pretpostavka: true, napomena: 'Položaj senzora u prihvatu je pretpostavka; uvjet „tek tada smije krenuti” je pojednostavljenje slijeda.', tema: 'predajaNosaca' },
  { id: 'handshakePrijemnik', skupina: NC, naziv: 'Optički handshake – prijemnik (BG2)',
    opis: 'Prijemnik i odašiljač čine optičku jednobitnu vezu („handshake”) s prijenosnom stanicom: robot i stanica svjetlosnim signalom potvrđuju da su spremni za predaju nosača, bez kabela i bez mreže.',
    podaci: [['Oznaka', 'BG2'], ['Tip', 'FES 165323'], ['Komplet', 'MPS Handshake Kit 8124921'], ['Razmak do stanice', '~50 cm']], izvor: 'CPMR-SCH23, IP4-HAND, FAC-248', pretpostavka: true, napomena: 'Položaj na kraju prihvata je pretpostavka.', tema: 'predajaNosaca' },
  { id: 'handshakeOdasiljac', skupina: NC, naziv: 'Optički handshake – odašiljač (BG3)',
    opis: 'Odašiljač šalje svjetlosni signal prijemniku na prijenosnoj stanici. Par odašiljač–prijemnik na robotu i na stanici zamjenjuje kabelsku vezu za usklađivanje predaje.',
    podaci: [['Oznaka', 'BG3'], ['Tip', 'FES 165353']], izvor: 'CPMR-SCH23, IP4-HAND', pretpostavka: true, napomena: 'Položaj na kraju prihvata je pretpostavka.', tema: 'predajaNosaca' },
  { id: 'irPozicioniranje', skupina: NC, naziv: 'IR senzori za pozicioniranje (BG4–BG6)',
    opis: 'Tri senzora Sharp GP2Y0A41SK0F (lijevo, sredina, desno) mjere udaljenost do prijenosne stanice. Iz tri udaljenosti robot dobiva razmak i zakret prema stanici i fino se poravna prije predaje nosača.',
    podaci: [['Oznake', 'BG4 (IR-L), BG5 (IR-C), BG6 (IR-R)'], ['Tip', 'Sharp GP2Y0A41SK0F'], ['Ulaz', 'analogni']], izvor: 'CPMR-SCH23, CPMR-DE', pretpostavka: true, napomena: 'Položaj senzora na kraju prihvata je pretpostavka.', tema: 'predajaNosaca' },
  { id: 'eaKutija', skupina: NC, naziv: 'E/A kutija (I/O box)',
    opis: 'Limena kutija na kraju platforme skuplja vodiče senzora, motora trake, signalnog stupa i tipkala nadogradnje te ih vodi prema upravljačkoj jedinici robota.',
    podaci: [['Mjere (procjena)', '~120 × 240 × 110 mm']], izvor: 'CPMR-DE', pretpostavka: true, napomena: 'Prema slici u priručniku ovo je E/A kutija ili kućište pogona trake; nije potvrđeno.' },
  { id: 'sigurnosniRelej', skupina: NC, naziv: 'Sigurnosni relej SICK (KF3)',
    opis: 'Sigurnosni relej SICK 1099973 nadzire krug nužnog stopa: prima dva kanala I1/I2, povratnu vezu EDM i signal tipkala Reset. Tek kad su oba kanala zatvorena i Reset je potvrđen, relej dopušta rad aktuatora. U izvedbi sa sigurnosnim skenerom u istu logiku ulaze i njegovi OSSD izlazi.',
    podaci: [['Tip', 'SICK 1099973'], ['Oznaka', 'KF3'], ['Ulazi', 'I1/I2, EDM, Reset (SF3)']], izvor: 'CPMR-SCH23', pretpostavka: true, napomena: 'Smještaj releja (u modelu u E/A kutiji) nije poznat.', tema: 'sigurnosniKrug' },
  { id: 'signalniStup', skupina: NC, naziv: 'Signalni stup (Werma)',
    opis: 'Trosegmentni signalni stup Werma pokazuje stanje robota u tvornici. Crvena: greška (treperi — robot nije lokaliziran). Narančasta: prepreka u zaštitnom polju lasera (treperi — nužni stop). Zelena: spreman ili miruje (treperi — zauzet).',
    podaci: [['Tip', 'Werma 693.000.55 (RT-GE-GN)'], ['Podnožje i cijev', 'Werma 960.693.01/03'], ['Oznake', 'P1–P3'], ['Vrh (procjena)', '1230 mm']], izvor: 'CPMR-SCH23, CPMR-C', tema: 'signalniStup' },
  { id: 'svjetloCrveno', skupina: NC, naziv: 'Crveni segment',
    opis: 'Stalno svijetli kod greške; treperi kad robot nije lokaliziran na karti i ne zna gdje je.', podaci: [['Stalno', 'greška'], ['Treperi', 'robot nije lokaliziran']], izvor: 'CPMR-C', tema: 'signalniStup' },
  { id: 'svjetloNarancasto', skupina: NC, naziv: 'Narančasti segment',
    opis: 'Stalno svijetli kad je prepreka u zaštitnom polju laserskog skenera; treperi kad je aktiviran nužni stop.', podaci: [['Stalno', 'prepreka u zaštitnom polju lasera'], ['Treperi', 'nužni stop']], izvor: 'CPMR-C', tema: 'signalniStup' },
  { id: 'svjetloZeleno', skupina: NC, naziv: 'Zeleni segment',
    opis: 'Stalno svijetli kad je robot spreman ili miruje; treperi dok izvršava nalog.', podaci: [['Stalno', 'spreman / mirovanje'], ['Treperi', 'zauzet']], izvor: 'CPMR-C', tema: 'signalniStup' },
  { id: 'nuzniStop', skupina: NC, naziv: 'Nužni stop (gljiva SF1)',
    opis: 'Crvena gljiva na vrhu nadogradnje isključuje sve aktuatore robota. Svi nužni stopovi u sustavu tvornice međusobno su povezani, pa pritisak na jedan zaustavlja sve. Sam Robotino nema vlastiti nužni stop — ovaj je dio nadogradnje CP-MR; nakon otpuštanja potreban je RESET.',
    podaci: [['Oznaka', 'SF1'], ['Djelovanje', 'isključuje sve aktuatore'], ['Ponovno pokretanje', 'nije automatsko (RESET)']], izvor: 'CPMR-C, CPMR-DE, R4-MAN', tema: 'sigurnosniKrug' },
  { id: 'kucisteNuznogStopa', skupina: NC, naziv: 'Prozirno kućište nužnog stopa',
    opis: 'Prozirni kvadar na vrhu stupa nosi gljivu nužnog stopa i njezine kontaktne blokove. Na fotografiji se na kućištu vidi oznaka robota u laboratoriju (vjerojatno ID u Fleet Manageru); u modelu oznaka nije prikazana.',
    podaci: [['Mjere (procjena)', '60 × 60 × 80 mm'], ['Gljiva (procjena)', 'Ø40 mm']], izvor: 'CPMR-DE', pretpostavka: true, napomena: 'Mjere i namjena kućišta procijenjene su iz fotografije.', tema: 'sigurnosniKrug' },
  { id: 'stupNuznogStopa', skupina: NC, naziv: 'Stup nužnog stopa',
    opis: 'Tanki aluminijski profil podiže nužni stop iznad platforme, na oko 1,3 m, da bude lako dostupan s bilo koje strane i kad je na prihvatu nosač.',
    podaci: [['Visina vrha (procjena)', '~1300 mm']], izvor: 'CPMR-DE', pretpostavka: true, napomena: 'Položaj stupa i presjek profila su procjena.' },
  { id: 'nosacIzratka', skupina: NC, naziv: 'Nosač izratka (Werkstückträger)',
    opis: 'Na nosaču izradak putuje kroz tvornicu CP Factory od stanice do stanice, a mobilni robot ga prevozi između udaljenih stanica. Nalog za prijevoz robot dobiva od MES-a preko Fleet Managera.',
    podaci: [['Mjere (procjena)', '150 × 150 × 25 mm']], izvor: 'CPMR-C', pretpostavka: true, napomena: 'Mjere nosača nisu u prikupljenim izvorima.', tema: 'predajaNosaca' },
  { id: 'izradak', skupina: NC, naziv: 'Izradak',
    opis: 'Izradak na nosaču — u modelu načelni oblik kućišta koje se u tvornici obrađuje i sklapa.', podaci: [['Oblik', 'ilustracija']], izvor: 'CPMR-C', pretpostavka: true, napomena: 'Oblik i mjere izratka su ilustracija.', tema: 'predajaNosaca' },
  { id: 'kabeliNadogradnje', skupina: NC, naziv: 'Kabeli nadogradnje',
    opis: 'Snopovi kabela vode signale tipkala, senzora, motora trake i signalnog stupa od transportne jedinice niz toranj do robota.', podaci: [['Vođenje', 'kroz izreze tornja']], izvor: 'CPMR-C', pretpostavka: true, napomena: 'Trasa kabela je načelni prikaz.' }
] : [];

const STANICA = KONFIG.stanica ? [
  { id: 'stanica', skupina: ST, naziv: 'Stanica za punjenje',
    opis: 'Stanica daje robotu najviše 240 W. Robot sam pristaje na nju — optičkim senzorima, kamerom i osvijetljenim 2D markerom ili laserskim skenerom s reflektorskim markerima — i dok je spojen radi na mrežnom napajanju, pa ne prazni baterije. U CP-MR-u robot odlazi na stanicu prema postavkama Fleet Managera.',
    podaci: [['Snaga', 'najviše 240 W'], ['Mjere', '535 × 212 × 152 mm'], ['Masa', '~14 kg'], ['Zaštita', 'IP20'], ['Kat. br.', '8134659 (230 V), 8134658 (120 V)']], izvor: 'FAC-248, CPMR-C', tema: 'pristajanje' },
  { id: 'kontaktnaPloca', skupina: ST, naziv: '6-polna kontaktna ploča stanice',
    opis: 'Kontaktna podloga na prednjoj strani stanice. Robot je dodiruje kontaktnim pinovima svog 6-polnog kontakta; tek kad je robot spojen (vanjsko napajanje prisutno), algoritam pristajanja javlja da je gotov.',
    podaci: [['Polova', '6']], izvor: 'FAC-248, IP4-PSU, OR-DOCK', pretpostavka: true, napomena: 'Položaj i oblik ploče na stanici su pretpostavka.', tema: 'pristajanje' },
  { id: 'reflektorLijevi', skupina: ST, naziv: 'Reflektorski marker (lijevi)',
    opis: 'Retroreflektirajuća ploča koju laserski skener vidi kao skupinu vrlo jakih odraza. Iz položaja lijevog i desnog markera robot računa položaj, normalu i širinu stanice, poravna se i vozi ravno na kontakt. Markeri moraju biti na strani s koje robot prilazi.',
    podaci: [['Namjena', 'pristajanje laserskim skenerom'], ['Razmak markera (procjena)', mm(MJERE.stanica.razmakMarkera)]], izvor: 'FAC-248, OR-DOCK, FORUM-DOCK', pretpostavka: true,
    napomena: 'Na fotografiji je vidljiva jedna bijela ploča s točkastim uzorkom; drugi marker i razmještaj su pretpostavka prema algoritmu s lijevim i desnim markerom. „Lijevi” = lijevo gledano s robota koji prilazi.', tema: 'pristajanje' },
  { id: 'reflektorDesni', skupina: ST, naziv: 'Reflektorski marker (desni)',
    opis: 'Drugi reflektorski marker. Razmak lijevog i desnog markera je poznat, pa skener iz dva para (kut, udaljenost) dobiva i središte stanice i smjer njezine normale.',
    podaci: [['Namjena', 'pristajanje laserskim skenerom']], izvor: 'OR-DOCK', pretpostavka: true,
    napomena: 'Na fotografiji je vidljiva jedna bijela ploča s točkastim uzorkom; drugi marker i razmještaj su pretpostavka prema algoritmu s lijevim i desnim markerom. „Lijevi” = lijevo gledano s robota koji prilazi.', tema: 'pristajanje' },
  { id: 'markerKamere', skupina: ST, naziv: 'Osvijetljeni 2D marker',
    opis: 'Crna kutija s plavo osvijetljenim kvadratnim uzorkom je marker za obradu slike. Kamera robota ga prepoznaje i iz njegova položaja i veličine na slici određuje smjer i udaljenost do stanice. Osvjetljenje čini prepoznavanje neovisnim o rasvjeti prostorije.',
    podaci: [['Namjena', 'pristajanje obradom slike'], ['Mjere (procjena)', '~110 × 140 mm']], izvor: 'FAC-248, IP4-PSU', pretpostavka: true, napomena: 'Mjere i položaj markera procijenjeni su iz fotografije.', tema: 'pristajanje' },
  { id: 'ledStanice', skupina: ST, naziv: 'Signalna LED stanice',
    opis: 'Plava LED na prednjoj strani stanice svijetli kad je stanica pod naponom.', podaci: [['Boja', 'plava']], izvor: 'FAC-248', pretpostavka: true, napomena: 'Značenje LED-a nije dokumentirano u prikupljenim izvorima.' },
  { id: 'napajanjeStanice', skupina: ST, naziv: 'Mrežni izvor stanice',
    opis: 'U kućištu stanice je mrežni izvor (230 V ili 120 V) koji preko kontaktne ploče daje robotu do 240 W. Kućište ima rashladne proreze i zaštitu IP20 — namijenjeno je suhom laboratoriju.',
    podaci: [['Ulaz', '230 V (8134659) ili 120 V (8134658)'], ['Izlaz', 'najviše 240 W'], ['Zaštita', 'IP20']], izvor: 'FAC-248, CPMR-C', pretpostavka: true, napomena: 'Unutrašnjost stanice je načelni prikaz.', tema: 'pristajanje' }
] : [];

export const DIJELOVI = [
  /* ---------------- Osnovica */
  { id: 'sasija', skupina: OS, naziv: 'Šasija (nosiva ploča)',
    opis: 'Okrugla nosiva ploča od nehrđajućeg čelika na koju su pričvršćene tri pogonske jedinice, baterije, elektronika i nadogradnja. Kroz njezine izreze kotači dodiruju pod. Osnovica nosi do 30 kg tereta postavljenog u središte i giba se s tri stupnja slobode: x, y i zakret oko okomite osi.',
    podaci: [['Promjer osnovice', '450 mm'], ['Visina osnovice', R4 ? '325 mm (R4)' : '290 mm (R3)'], ['Masa', R4 ? '20 kg prazan, 22,8 kg sa 4 baterije' : '20 kg'], ['Nosivost', '30 kg (centrirano)'], ['Materijal kućišta', 'nehrđajući čelik, PA6'], ['Zaštita', 'IP 00']],
    izvor: 'IP4-OV, R4-MAN, INFS', tema: 'kinematika' },
  { id: 'donjiPrsten', skupina: OS, naziv: 'Donji obodni prsten',
    opis: 'Pojas od nehrđajućeg čelika iznad odbojnika zatvara donji dio osnovice. U njemu su prozorčići devet infracrvenih senzora udaljenosti, raspoređenih svakih 40°. Prsten štiti pogon i elektroniku od udaraca u visini poda.',
    podaci: [['Materijal', 'nehrđajući čelik'], ['Prozorčići', '9 (IR senzori)']], izvor: 'IP4-OV, IP4-DIST', pretpostavka: true, napomena: 'Visina pojasa procijenjena je iz fotografije.' },
  { id: 'bocniPokrovi', skupina: OS, naziv: 'Bočni pokrovi',
    opis: 'Svijetlosivi pokrovi od poliamida zatvaraju osnovicu između tri otvora za kotače. Kroz otvore se vide kotači i dio pogona — zato u robota ne posežeš dok se ne zaustavi potpuno: kotači se mogu iznenada pokrenuti.',
    podaci: [['Materijal', 'PA6 (poliamid)'], ['Otvori za kotače', '3 (60°, 180°, 300°)']], izvor: 'IP4-OV, R4-MAN', pretpostavka: true, napomena: 'Oblik i podjela pokrova procijenjeni su iz fotografije.' },
  { id: 'maske', skupina: OS, naziv: 'Bočne maske',
    opis: 'Glatke bijele ploče na bočnim stranama osnovice i pokrova upravljačke jedinice. Na stvarnom robotu nose natpis proizvođača, a uz njih je natpisna pločica s tipskom oznakom; u modelu su namjerno prazne. Prema natpisnoj pločici razlikuju se generacije (oznaka oblika Robotino.4xx.xxx za generaciju 4).',
    podaci: [['Broj', '4'], ['Generacija (natpisna pločica)', 'Robotino 4 — kataloški broj 8101344, 2022.']], izvor: 'R4-MAN, FORUM-GEN', pretpostavka: true, napomena: 'Broj i položaj maski procijenjeni su iz fotografije.' },
  { id: 'gornjaPloca', skupina: OS, naziv: 'Gornja ploča osnovice',
    opis: 'Ravna ploča iznad pogona zatvara osnovicu odozgo i služi kao montažna površina. Na nju je pričvršćen toranj nadogradnje, a ispred pokrova upravljačke jedinice je prostor za teret i dodatne module.',
    podaci: [['Visina (procjena)', mm(Z_PALUBA)]], izvor: 'R4-MAN', pretpostavka: true, napomena: 'Visina i oblik ploče procijenjeni su iz fotografije.' },
  { id: 'pokrovUpravljacke', skupina: OS, naziv: 'Pokrov upravljačke jedinice',
    opis: 'Polukružni pokrov s kosim rashladnim prorezima zatvara upravljačku jedinicu na stražnjem dijelu osnovice. Kroz proreze se odvodi toplina računala. U pokrov je ugrađeno glavno tipkalo, a u prednjem rubu je izrez kroz koji prolazi toranj.',
    podaci: [['Visina vrha', R4 ? '325 mm' : '290 mm'], ['Prorezi', '2 × 8 kosih']], izvor: 'IP4-CU, IP4-OV', pretpostavka: true, napomena: 'Oblik pokrova, broj proreza i izrez za toranj procijenjeni su iz fotografije.', tema: 'upravljackaJedinica' },
  { id: 'prednjaPloca', skupina: OS, naziv: 'Prednja ploča (nosač senzora)',
    opis: 'Spuštena ploča na prednjem dijelu robota nosi laserski skener, kameru i kontakt za punjenje. Prednja strana robota — smjer osi x — je strana na kojoj su laserski skener i kontakt za punjenje.',
    podaci: [['Visina (procjena)', mm(Z_PREDNJA)]], izvor: 'IP4-LASER, IP4-CAM', pretpostavka: true, napomena: 'Visina i oblik ploče procijenjeni su iz fotografije.' },
  { id: 'rucke', skupina: OS, naziv: 'Ručke za nošenje',
    opis: 'Robota se nosi samo za ručke, nikad za pokrove, nadogradnju ili kotače. Prije nošenja ga isključi i provjeri da su baterije sigurno u ležištima.',
    podaci: [['Broj', '2']], izvor: 'R4-MAN', pretpostavka: true, napomena: 'Izgled i položaj ručki u modelu su pretpostavka.' },

  /* ---------------- Pogon */
  ...pogonske(),

  /* ---------------- Senzori */
  { id: 'odbojnik', skupina: SN, naziv: 'Odbojnik (sigurnosni rub)',
    opis: 'Crni profil po cijelom donjem obodu je sigurnosni rub Mayser SK EKS011. U profilu je sklopna komora: pritisak spaja dvije vodljive površine i robot odmah prekida program i kretanje. Rub radi na načelu mirne struje, pa i prekid kabela zaustavlja robota. Zaustavljanje na odbojnik zadano je uključeno i isključuje se samo u web sučelju.',
    podaci: [['Tip', 'Mayser SK EKS011'], ['Načelo', 'sklopna komora, mirna struja'], ['Reakcija', 'prekid programa i kretanja'], ['REST', '/data/bumper']], izvor: 'IP4-BUMP, IP3-BUMP, OR-REST', tema: 'odbojnik' },
  { id: 'irNiz', skupina: SN, naziv: 'Infracrveni senzori udaljenosti (9 kom)',
    opis: 'Devet senzora Sharp GP2Y0A41SK0F raspoređeno je po obodu svakih 40°. Svaki odašilje infracrvenu zraku i triangulacijom mjeri udaljenost od 4 do 30 cm; izlaz je analogni napon koji nelinearno opada s udaljenošću. Spojeni su po tri na plosnatom kabelu. Služe za izbjegavanje prepreka na maloj udaljenosti i za vožnju uz zid.',
    podaci: [['Tip', 'Sharp GP2Y0A41SK0F'], ['Broj', '9'], ['Razmak', '40°'], ['Područje', '4–30 cm'], ['Izlaz', 'analogni napon'], ['REST', '/data/distancesensorarray']], izvor: 'IP4-DIST, IP3-DIST, OR-REST', tema: 'irSenzor' },
  { id: 'ir1', skupina: SN, naziv: 'Senzor udaljenosti 1 (naprijed)',
    opis: 'Prvi senzor niza gleda u smjeru osi x robota; ostali slijede svakih 40° suprotno od kazaljke na satu gledano odozgo. Tim redom senzori dolaze i u REST odgovoru s devet vrijednosti.',
    podaci: [['Kut', '0°'], ['Visina (procjena)', mm(MJERE.ir.visina)]], izvor: 'IP4-DIST', pretpostavka: true, napomena: 'Položaj senzora 1 na 0° i smjer numeriranja nisu potvrđeni u prikupljenim izvorima.', tema: 'irSenzor' },
  R4 ? { id: 'ziroskop', skupina: SN, naziv: 'Žiroskop CruizCore R6093U',
    opis: 'Žiroskop u upravljačkoj jedinici mjeri kutnu brzinu zakretanja robota oko okomite osi. Operacijski sustav njime automatski ispravlja kut iz odometrije kotača, jer valjci pri zakretanju i ubrzavanju proklizavaju. U web sučelju se bira unutarnji ili vanjski žiroskop.',
    podaci: [['Tip', 'CruizCore R6093U'], ['Mjesto', 'upravljačka jedinica'], ['Uloga', 'ispravak kuta odometrije']], izvor: 'IP4-GYRO, IP3-WEBSET', pretpostavka: true, napomena: 'Položaj pločice unutar upravljačke jedinice je pretpostavka.', tema: 'ziroskopOdometrija' }
    : { id: 'ziroskop', skupina: SN, naziv: 'Žiroskop MPU6050',
      opis: 'Žiroskop MPU6050 na I/O ploči mjeri kutnu brzinu zakretanja robota. Drift se kompenzira nakon 500 ms mirovanja, a pogreška skale (±2 %) kalibrira se programom gyrocal.',
      podaci: [['Tip', 'MPU6050'], ['Mjesto', 'I/O ploča'], ['Skala', '±2 %, kalibracija gyrocal']], izvor: 'OR-MPU', tema: 'ziroskopOdometrija' },
  { id: 'optickiSenzori', skupina: SN, naziv: 'Optički refleksni senzori (2 kom)',
    opis: 'Dva optička senzora sa svjetlovodima gledaju u pod vidljivim crvenim svjetlom. Na digitalnom ulazu javljaju razliku između svijetle i tamne podloge, pa služe za praćenje crte ili oznaka na podu. Postupne razlike u sivoj ne razlikuju.',
    podaci: [['Tip', SENZORI.opticki.tip], ['Broj', '2'], ['Svjetlo', 'vidljivo crveno'], ['Izlaz', 'digitalni (DI1 NO, DI2 NC)']], izvor: SENZORI.opticki.izvor + ', R3-MAN', pretpostavka: true, napomena: 'Položaj svjetlovoda na dnu osnovice je pretpostavka.', tema: 'optickiSenzori' },
  { id: 'induktivniSenzor', skupina: SN, naziv: 'Induktivni senzor',
    opis: 'Induktivni senzor bez dodira otkriva metal ispod ili ispred robota, npr. metalnu traku na podu. Spojen je na analogni ulaz I/O sučelja. Koristi se za vožnju uz metalnu traku i za prepoznavanje metalnih oznaka.',
    podaci: [['Kat. br.', '8029483'], ['Ulaz', 'analogni (npr. AI1)'], ['Žice', 'smeđa, crna, plava']], izvor: 'R4-MAN, R3-MAN', pretpostavka: true, napomena: 'Položaj senzora na dnu osnovice je pretpostavka.' },
  ...LASER_DIO,
  ...KAMERA_DIO,

  /* ---------------- Upravljačka jedinica */
  { id: 'upravljackaJedinica', skupina: UJ, naziv: 'Upravljačka jedinica',
    opis: 'Upravljačka jedinica pod polukružnim pokrovom spaja ugradbeno računalo, mikrokontroler za motore i senzore te I/O ploču. Računalo izvodi korisničke programe, navigaciju i komunikaciju, a mikrokontroler u stvarnom vremenu regulira motore i čita senzore. Povezani su vlastitom Ethernet vezom.',
    podaci: R4 ? [['Računalo', 'COM Express, Intel i5 8. gen.'], ['Memorija', '8 GB RAM, 64 GB SSD'], ['OS', 'Ubuntu 18.04 LTS 64-bit'], ['Robotino OS', '4.20.10 (najnovija slika na wikiju)'], ['Programiranje', 'Robotino View, REST, API2, Python, ROS']]
      : [['Računalo', 'COM Express (Advantech)'], ['OS', 'Ubuntu 12.04'], ['Mikrokontroler', 'NXP LPC2378 + FPGA']],
    izvor: R4 ? 'R4-MAN, IP4-CU, OR-MAIN' : 'IP3-EPC, INFS, IP3-IF', tema: 'upravljackaJedinica' },
  { id: 'racunaloCOM', skupina: UJ, naziv: 'Ugradbeno računalo COM Express',
    opis: R4 ? 'Računalni modul formata COM Express utaknut je u nosivu ploču upravljačke jedinice. Na njemu radi Ubuntu s Robotino OS-om: web sučelje, REST API, Robotino View i ROS čvorovi. Grafika Intel UHD 630 i izlaz HDMI omogućuju rad i s izravno spojenim zaslonom.'
      : 'Računalni modul formata COM Express (Advantech) — izvedba Premium s Intel Core i5-520E ili Basic s Atomom D525. Na njemu radi Ubuntu 12.04 (opcija Windows 7) s Robotino softverom.',
    podaci: R4 ? [['Procesor', 'Intel Core i5 8. gen., 2,5 GHz (turbo 4,2 GHz), 4 jezgre / 8 dretvi'], ['Grafika', 'Intel UHD 630'], ['RAM / SSD', '8 GB / 64 GB'], ['Modul', 'Advantech SOM-5898/5899 (pretpostavka)']]
      : [['Premium', 'SOM-5788, i5-520E, 8 GB, 64 GB'], ['Basic', 'SOM-6763 B1, Atom D525, 4 GB, 32 GB']],
    izvor: R4 ? 'R4-MAN, OR-R4' : 'IP3-EPC, INFS', pretpostavka: R4, napomena: R4 ? 'Wiki ima BIOS stranice za SOM-5898/5899; da su to moduli R4 je pretpostavka iz konteksta.' : '', tema: 'upravljackaJedinica' },
  { id: 'mikrokontroler', skupina: UJ, naziv: 'Mikrokontrolerska ploča',
    opis: (R4 ? '32-bitni mikrokontroler s vlastitim Ethernet sučeljem upravlja PWM-om za do četiri istosmjerna motora, broji impulse enkodera i čita senzore. '
      : '32-bitni mikrokontroler NXP LPC2378 s FPGA-om Xilinx XC3S50A upravlja motorima, broji impulse enkodera i čita senzore. ')
      + 'Na njemu radi diskretni PI regulator brzine svakog motora u brzinskom obliku, s uzorkovanjem 1 kHz. Kad su zadana i stvarna brzina nula, izlaz regulatora postavlja se na nulu.',
    podaci: [['Regulator', 'PI (brzinski oblik), 1 kHz'], ['Zadani parametri', 'K = 0,4, Ki = 0,01'], ['Izlaz', '±255 (8-bitni PWM)'], ['Motora', 'do 4']],
    izvor: R4 ? 'R4-MAN, FAC-244, OR-PI' : 'IP3-MCU, INFS, OR-PI', pretpostavka: R4, napomena: R4 ? 'Parametri PI regulatora dokumentirani su za Robotino 3; za R4 se pretpostavljaju isti.' : '', tema: 'regulacija' },
  { id: 'ioPloca', skupina: UJ, naziv: 'I/O ploča',
    opis: 'Ploča s ulazima i izlazima za dodatne senzore i aktuatore: 8 digitalnih ulaza, 8 digitalnih izlaza do 24 V DC, 8 analognih ulaza 0–10 V i dva preklopna releja. Na nju se spajaju npr. induktivni i optički senzori. Stanje ulaza i izlaza čita se i postavlja i preko REST API-ja.',
    podaci: [['Digitalni ulazi', '8'], ['Digitalni izlazi', '8, do 24 V DC'], ['Analogni ulazi', '8, 0–10 V DC'], ['Releji', '2 preklopna'], ['REST', '/data/digitalinputarray, /data/analoginputarray, /data/relay …']],
    izvor: 'R4-MAN, FAC-244, OR-REST', pretpostavka: true, napomena: 'Struja izlaza: priručnik navodi „najviše 2 A po izlazu, ukupno 2 A” — dvosmisleno. Položaj ploče u modelu je načelni.', tema: 'upravljackaJedinica' },
  { id: 'prikljucciIO', skupina: UJ, naziv: 'Priključnice XD1–XD4',
    opis: 'Redne priključnice I/O sučelja: XD1 i XD2 su digitalni ulazi i izlazi, XD3 analogni ulazi, a XD4 kontakti releja. Vodiči se stežu u priključnice, pa se dodatni senzori lako spajaju i mijenjaju.',
    podaci: [['XD1, XD2', 'digitalni ulazi/izlazi'], ['XD3', 'analogni ulazi'], ['XD4', 'releji']], izvor: 'IP4-IF', pretpostavka: true, napomena: 'Položaj priključnica u modelu je načelni.', tema: 'upravljackaJedinica' },
  { id: 'wlan', skupina: UJ, naziv: 'WLAN pristupna točka',
    opis: 'Mala pristupna točka utaknuta u USB priključak stvara bežičnu mrežu robota u pojasevima 2,4 GHz i 5 GHz. Ime mreže jednako je oznaci s natpisne pločice robota. Nakon uključivanja treba joj do 60 s, a prvo spajanje može trajati do 90 s.',
    podaci: [['Pojasevi', '2,4 GHz (b/g/n), 5 GHz (a/n/ac)'], ['Napajanje', '5 V / 2 A (micro-USB)'], ['Zadana IP adresa', R4 ? '192.168.0.1' : '172.26.1.1'], ['Kat. br.', '8089372']],
    izvor: 'R4-MAN, CPMR-C, FAC-244', pretpostavka: true, napomena: 'IP adresa: priručnik CP-MR navodi 172.26.1.1 (ovisi o slici sustava). Položaj u modelu je načelni.', tema: 'upravljackaJedinica' },
  { id: 'sucelja', skupina: UJ, naziv: 'Sučelja USB, HDMI i Ethernet',
    opis: R4 ? 'Na upravljačkoj jedinici su RJ-45 za pristupnu točku (XF1), dva USB 2.0 (XF2, XF3), četiri USB 3.0 za kameru i druge uređaje (XF4–XF6, XF9) i HDMI (XF7). Laserski skener i kamera spajaju se USB-om, a s računalom se robot povezuje WLAN-om ili Ethernetom.'
      : 'Sučelja Robotina 3: WLAN, Ethernet, 6 × USB, RS232, VGA i 2 × PCIe. Kamera i laserski skener spajaju se USB-om.',
    podaci: R4 ? [['RJ-45', 'XF1'], ['USB 2.0', 'XF2, XF3'], ['USB 3.0', 'XF4, XF5, XF6, XF9'], ['HDMI', 'XF7'], ['PCIe', '2 × Gen3 x4']] : [['USB', '6'], ['Ostalo', 'RS232, VGA, 2 × PCIe']],
    izvor: R4 ? 'IP4-IF' : 'INFS, R3-MAN', pretpostavka: true, napomena: 'Položaj priključaka na kućištu u modelu je načelni.', tema: 'upravljackaJedinica' },
  ...(R4 ? [
    { id: 'izlaz12V', skupina: UJ, naziv: 'Izlaz 12 V (XD5)',
      opis: 'Dva priključka WAGO 734-162 daju napon 12 V za dodatne uređaje na robotu, ukupno najviše 2 A.', podaci: [['Priključci', 'XD5-1, XD5-2 (WAGO 734-162)'], ['Struja', 'ukupno najviše 2 A']], izvor: 'IP4-IF', pretpostavka: true, napomena: 'Položaj u modelu je načelni.' },
    { id: 'prikljucakMotor4', skupina: UJ, naziv: 'Priključak motora 4 i enkodera 4',
      opis: 'Dodatni izlaz za četvrti motor (PWM 0–24 V, priključak WAGO 721-462) i 6-polni priključak njegova enkodera: 5 V, GND, kanali A i B te još jedan signal. Koristi se za dodatni pogon na nadogradnji.',
      podaci: [['Motor 4', 'PWM 0–24 V, WAGO 721-462'], ['Enkoder 4', 'MPE RM 2,54, 2 × 3 pola'], ['REST', '/data/poweroutput, /data/poweroutputcurrent']], izvor: 'IP4-IF, R4-MAN, OR-REST', pretpostavka: true, napomena: 'Položaj u modelu je načelni.', tema: 'regulacija' }
  ] : []),
  { id: 'glavnoTipkalo', skupina: UJ, naziv: 'Glavno tipkalo',
    opis: R4 ? 'Tipkalo u pokrovu upravljačke jedinice uključuje i isključuje robota držanjem oko 3 s. Kratki pritisak od 1 s daje 20 s za zamjenu baterije bez gašenja. Pritisak za vrijeme rada prekida program ili vezu s vanjskim računalom.'
      : 'Tipkalo u pokrovu upravljačke jedinice uključuje i isključuje robota držanjem oko 3 s; pokretanje traje do 30 s.',
    podaci: [['Uključi / isključi', 'držati ~3 s'], ...(R4 ? [['Zamjena baterije', 'pritisak 1 s → 20 s']] : [['Pokretanje', 'do 30 s']])], izvor: R4 ? 'IP4-PSW' : 'IP3-PSW, R3-MAN', tema: 'upravljackaJedinica' },
  { id: 'ledPrsten', skupina: UJ, naziv: 'LED prsten tipkala',
    opis: (R4 ? 'Prsten oko tipkala svijetli plavo kad je robot uključen. ' : 'Prsten oko tipkala uzorkom svjetla pokazuje stanje sustava. ')
      + 'Za Robotino 3 dokumentirani su uzorci: uzlazni pri uključivanju, spori sinus u mirovanju, brzi sinus kad je mikrokontroler spojen s računalom, spori pravokutni pri resetu konfiguracije i silazni pri gašenju.',
    podaci: [['Boja (R4)', 'plava'], ['Uzorci (R3)', 'uzlazni, spori/brzi sinus, pravokutni, silazni']], izvor: 'IP4-PSW, OR-LED', tema: 'upravljackaJedinica' },

  /* ---------------- Napajanje */
  ...baterije(),
  { id: 'drzaciBaterija', skupina: NP, naziv: 'Ležišta baterija',
    opis: KONFIG.baterije === 'olovne2' ? 'Nosači drže dvije olovne baterije lijevo i desno u šasiji; ploča punjača je iza lijeve baterije.'
      : 'Ležišta prihvaćaju standardne pakete Festool 18 V i spajaju ih paralelno na napajanje robota. Dostupna su sa stražnje strane, pa se paketi mijenjaju bez skidanja pokrova.',
    podaci: [['Broj paketa', KONFIG.baterije === 'olovne2' ? '2' : '1–4']], izvor: KONFIG.baterije === 'olovne2' ? 'IP3-BAT, IP3-CHG' : 'IP4-AKKU', pretpostavka: true, napomena: 'Izgled i smještaj ležišta u modelu su procjena.', tema: 'napajanje' },
  { id: 'elektronikaPunjenja', skupina: NP, naziv: R4 ? 'Nadzor baterija i punjenja' : 'Ploča punjača',
    opis: R4 ? 'Elektronika prati stanje Festool paketa i vanjskog napajanja; kad je napon prenizak, sustav se sam ugasi. Stanje je dostupno preko REST API-ja (/data/festoolcharger, /data/charger0, /data/charger1). Na stanici za punjenje ili na vanjskom napajanju 24 V robot radi s mrežnog napajanja paralelno s baterijama.'
      : 'Ploča punjača iza lijeve baterije puni olovne baterije kad je spojen mrežni adapter; zeleni LED treperi kad je baterija puna. Podržava više tipova baterija.',
    podaci: R4 ? [['REST', '/data/festoolcharger, /data/charger0/1, /data/powermanagement'], ['Vanjsko napajanje', '24 V, paralelno s baterijama']] : [['Adapter', 'FSP220-AAAN1'], ['Punjenje', '~5 h']],
    izvor: R4 ? 'OR-R4, OR-REST, FAC-244' : 'IP3-CHG, IP3-PSU, R3-MAN', pretpostavka: true, napomena: 'Smještaj i izgled pločice u modelu su načelni.', tema: 'napajanje' },
  { id: 'plocaSnage', skupina: NP, naziv: 'Ploča razvoda napajanja',
    opis: 'Ploča razvoda („power board”) spaja motore, enkodere, tri plosnata kabela infracrvenih senzora i odbojnik s upravljačkom jedinicom. Struja svakog motora mjeri se na njegovu H-mostu i dostupna je kao izlaz „Current” bloka Motor u Robotino Viewu. Detalji sheme nisu javno objavljeni.',
    podaci: [['Spaja', 'motore, enkodere, 9 IR senzora (3 plosnata kabela), odbojnik'], ['Mjerenje', 'struja motora, napon i struja sustava']], izvor: 'IP4-DIST, IP4-BUMP, IP3-MOT, RV-MOTOR, OR-PWR', pretpostavka: true, napomena: 'Oblik i smještaj ploče u modelu su načelni.', tema: 'napajanje' },
  { id: 'kontaktPunjenja', skupina: NP, naziv: 'Kontakt za punjenje na robotu',
    opis: '6-polni kontakt sprijeda dodiruje kontaktnu ploču stanice kad robot pristane. Dok je spojen, robot radi na mrežnom napajanju i ne prazni baterije. Svaki robot koji koristi stanicu treba jedan takav kontakt.',
    podaci: [['Kat. br.', '8131075'], ['Polova', '6']], izvor: 'FAC-248, CPMR-B', pretpostavka: true, napomena: 'Da je crna kocka sprijeda na fotografiji kontakt za punjenje, te njezine mjere i položaj, procjena su.', tema: 'pristajanje' },

  /* ---------------- Nadogradnja CP-MR */
  ...NADOGRADNJA,

  /* ---------------- Stanica za punjenje */
  ...STANICA
];

/* ================================================================== pomoćne funkcije */
const _PO_ID = new Map(DIJELOVI.map((d) => [d.id, d]));
export function nadjiDio(id) { return _PO_ID.get(id) || null; }
export function dijeloviSkupine(sk) { return DIJELOVI.filter((d) => d.skupina === sk); }
/** URL-ovi izvora dijela: izvor 'A, B' → [{kratica, url}] */
export function izvoriDijela(d) {
  return String(d && d.izvor || '').split(',').map((s) => s.trim()).filter(Boolean).map((k) => ({ kratica: k, url: IZVORI[k] || '' }));
}

export const TEKST_PRETPOSTAVKE = 'Podaci označeni kao pretpostavka nisu pronađeni u dokumentaciji proizvođača: procijenjeni su iz fotografije robota u laboratoriju ili izračunati iz objavljenih brojeva. Sukob znači da se izvori ne slažu; koristi se navedena vrijednost. Kad se podatak izmjeri ili potvrdi, ispravlja se na jednom mjestu i oznaka nestaje.';

/** sve pretpostavke i sukobi: [{ sto, vrijednost, napomena, vrsta, id? }] (bez ponavljanja iste napomene) */
export function pretpostavke() {
  const out = [], vidjeno = new Set();
  const dodaj = (o) => { const k = o.vrsta + '|' + o.napomena; if (vidjeno.has(k)) return; vidjeno.add(k); out.push(o); };
  _REG.forEach((r) => dodaj({ ...r }));
  DIJELOVI.forEach((d) => { if (d.pretpostavka && d.napomena) dodaj({ vrsta: 'pretpostavka', sto: d.naziv, vrijednost: '', napomena: d.napomena, id: d.id }); });
  return out;
}
