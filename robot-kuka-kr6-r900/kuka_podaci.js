/* FORTRONIQ · Industrijski robot KUKA KR AGILUS (KR 6 R900) — JEDINI izvor istine (brojevi, nazivi, opisi, inačice, pretpostavke).
   Model (kuka_model.js), kinematika (kuka_kin.js), stranice i AR čitaju SAMO odavde.
   Izvor činjenica: PODACI_KUKA.md (istraživanje 18. 10. 2026.); kratice izvora su u IZVORI (PODACI §12).

   KAKO SE MIJENJA PODATAK
   - Potvrđena vrijednost: zamijeni  pp('…', 0.09, '…')  sa  0.09  — pretpostavka nestaje sa stranica.
   - Nova procjena: omotaj broj u pp(sto, vrijednost, napomena, prikaz).
   - Sukob izvora: sukob(sto, vrijednost, napomena, prikaz) — vrijednost se koristi, a sukob se ispisuje.
   - Inačica: promijeni prekidač u KONFIG (varijanta, upravljac, privjesak, boja) — model i tekstovi se prilagode sami.
   Jedinice u kodu: metri i radijani. Na zaslonu (kao na smartPAD-u): mm i °. Polja s nastavkom Deg su u stupnjevima, vMax u °/s.
   KS robota ($ROBROOT): X naprijed, Y lijevo, Z gore; ishodište na podlozi u osi A1.
   © ForTroniQ d.o.o. */

/* ================================================================== prekidači inačice */
export const KONFIG = {
  varijanta: 'sixx',        // 'sixx' (KR 6 R900 sixx, kako je naveo vlasnik) | '-2' (KR 6 R900-2, KR AGILUS 2. generacije)
  upravljac: 'krc5micro',   // 'krc5micro' | 'krc4compact'
  privjesak: 'smartpad2',   // 'smartpad2' | 'smartpad'
  boja: 'bijela',           // 'bijela' (RAL 9016 / RAL 9007, kao na fotografiji) | 'narancasta' (tvornička boja sixx: narančasta 2567 / crna RAL 9011)
  prihvatnice: 4,           // broj prihvatnica u spremištu stanice (TOOL1…TOOL4)
  stanica: 'cpf-rass'       // robot u Festo CP Factory robotskoj montažnoj stanici
};
const SIXX = KONFIG.varijanta !== '-2';
const C5 = KONFIG.upravljac !== 'krc4compact';
const SP2 = KONFIG.privjesak !== 'smartpad';

/* ================================================================== registar pretpostavki i sukoba */
const _REG = [];
const zarez = (n) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
function fmt(v) {
  if (typeof v === 'number') return zarez(v);
  if (Array.isArray(v)) return v.map(fmt).join(' / ');
  return String(v);
}
const mm = (v) => zarez(Math.round(v * 10000) / 10) + ' mm';
const RAD = Math.PI / 180;
/** pretpostavka: vrijednost se koristi, a na stranicama se ispisuje u popisu pretpostavki */
function pp(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'pretpostavka', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** sukob izvora: koristi se navedena vrijednost, a druga je u napomeni */
function sukob(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'sukob', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
const ppAko = (uvjet, sto, v, nap, pr) => (uvjet ? pp(sto, v, nap, pr) : v);
const FOTO = 'procjena iz fotografije robota u ćeliji (mjerilo: poznate duljine članaka 455 i 420 mm), ±20 %';

/* ================================================================== inačice robota */
export const VARIJANTE = {
  sixx: {
    oznaka: 'KR 6 R900 sixx', generacija: 'KR AGILUS 1. generacije (standard do kraja 2017.)',
    brzine: [360, 300, 360, 381, 388, 615], nosivost: '6 kg najviše (3 kg nazivno u dijagramu nosivosti)', nosivostMax: 6,
    ponovljivost: 0.03, masa: 52, ip: 'IP54 (robot i zapešće)', buka: '< 70 dB(A) izvan radnog prostora', temperatura: '+5 … +45 °C',
    bojaTvornicka: 'podnožje i poklopci crni RAL 9011, pokretni dijelovi KUKA narančasta 2567', tlocrt: [0.209, 0.207], volumen: 2.85,
    zaustavljanje: [[113.59, 0.507], [126.76, 0.684], [68.10, 0.370]],
    temelj: { Fv: '967 / 1297 N', Fh: '1223 / 1362 N', Mk: '788 / 1152 Nm', Mr: '367 / 880 Nm' },
    upravljanje: 'KR C4 compact', privjesak: 'smartPAD', dubinaNavoja: '5,5–6,5 mm', izvor: 'SIXX'
  },
  '-2': {
    oznaka: 'KR 6 R900-2', generacija: 'KR AGILUS 2. generacije (od kraja 2017.)',
    brzine: [360, 300, 360, 450, 450, 540], nosivost: '3 kg nazivno, 6,5 kg najviše (spec. 2019.) / 6,7 kg (list 2023.)', nosivostMax: 6.5,
    ponovljivost: 0.02, masa: 55, ip: 'IP65/IP67 (IP67 uz zrak za nadtlak 0,3 bar)', buka: '< 57 dB(A)', temperatura: '0 … +45 °C',
    bojaTvornicka: 'podnožje sivi aluminij RAL 9007, pokretni dijelovi prometno bijela RAL 9016', tlocrt: [0.208, 0.208], volumen: 2.84,
    zaustavljanje: [[39.92, 0.22], [35.49, 0.24], [34.78, 0.17]],
    temelj: { Fv: '873 / 1127 N', Fh: '563 / 756 N', Mk: '605 / 763 Nm', Mr: '200 / 334 Nm' },
    upravljanje: 'KR C5 micro, KR C4 smallsize-2, KR C4 compact', privjesak: 'smartPAD-2', dubinaNavoja: '5,5–7 mm', izvor: 'SPEZ2, DS2023'
  }
};
export const V = VARIJANTE[SIXX ? 'sixx' : '-2'];
export const NAZIV_ROBOTA = 'KUKA KR AGILUS (KR 6 R900)';
export const TEKST_INACICA = 'Vlasnik je robot naveo kao „KR 6 R900 sixx”. Bijela ruka sa sivim aluminijskim podnožjem tvornička je boja KR AGILUS-a 2. generacije (RAL 9016 / RAL 9007), a stanica je izrađena 2023. — više od pet godina nakon što sixx više nije standard. Zato je robot vjerojatno KR 6 R900-2. Kinematika (duljine članaka, opsezi osi, HOME) jednaka je za obje inačice; razlikuju se brzine osi A4–A6, masa, nosivost, ponovljivost i zaštita. Potvrda: natpisna pločica na podnožju.';
sukob('Inačica robota', SIXX ? 'KR 6 R900 sixx' : 'KR 6 R900-2',
  'Vlasnik navodi „KR 6 R900 sixx”; bijela boja (RAL 9016/9007) i godina izrade stanice (01-2023) upućuju na KR 6 R900-2 [SPEZ2], [PR2017]. Prikazani podaci vrijede za odabranu inačicu; prije objave pročitati natpisnu pločicu robota.',
  SIXX ? 'KR 6 R900 sixx (zadano po navodu vlasnika)' : 'KR 6 R900-2');

/* ================================================================== kinematika: DH i URDF (potvrđeno, R/dh_check.py) */
/* Standardni DH: T_i = Rz(θ_i)·Tz(d_i)·Tx(a_i)·Rx(α_i);  θ_i = znak_i·A_i + pomak_i  (A_i = KUKA kut osi).
   θ6 sadrži i Rz(180°) prirubnice, pa je okvir 6 = $FLANGE (Z iz čela prirubnice prema van). */
export const DH = {
  a: [0.025, 0.455, 0.035, 0, 0, 0],
  d: [0.400, 0, 0, 0.420, 0, 0.080],
  alpha: [-90 * RAD, 0, -90 * RAD, -90 * RAD, 90 * RAD, 0],
  znak: [-1, 1, 1, -1, -1, -1],
  pomak: [0, 0, -90 * RAD, 0, 0, 180 * RAD],
  izvor: 'URDF, DH-PROV'
};
/* URDF lanac (ROS-Industrial kr6r900sixx): ishodište zgloba u okviru roditelja i os vrtnje. Model koristi ovaj lanac. */
export const URDF = {
  zglobovi: [
    { xyz: [0, 0, 0.400], os: [0, 0, -1] },
    { xyz: [0.025, 0, 0], os: [0, 1, 0] },
    { xyz: [0.455, 0, 0], os: [0, 1, 0] },
    { xyz: [0, 0, 0.035], os: [-1, 0, 0] },
    { xyz: [0.420, 0, 0], os: [0, 1, 0] },
    { xyz: [0.080, 0, 0], os: [-1, 0, 0] }
  ],
  flange: { rpy: [0, 90 * RAD, 0] },   /* tool0 = $FLANGE */
  izvor: 'URDF'
};
/* kut ispružene ruke (A3 pri kojem su A2, A3 i točka zapešća na pravcu) */
export const KUT_ISPRUZENE = Math.atan2(0.035, 0.420);   /* ≈ 4,76° [izračun] */

/* ================================================================== osi */
const NAZ_OSI = ['okretni stup', 'nadlaktica (link arm)', 'ruka (arm)', 'zapešće — okretanje', 'zapešće — savijanje', 'prirubnica'];
const OPSEG = [[-170, 170], [-190, 45], [-120, 156], [-185, 185], [-120, 120], [-350, 350]];
const SMJER = [
  'pozitivno u smjeru kazaljke sata gledano odozgo (A1 = +30° pomiče alat prema −Y)',
  'A2 = 0° nadlaktica vodoravno naprijed, −90° okomito gore; pozitivno spušta nadlakticu',
  'A3 = +90° (uz A2 = −90°) ruka vodoravno naprijed; ≈ 0° ruka u produžetku nadlaktice',
  'okretanje zapešća oko osi ruke',
  'A5 = 0° prirubnica u smjeru ruke; A5 = +90° u HOME prirubnica gleda dolje',
  'okretanje prirubnice oko vlastite osi'
];
const UMJ = [0, -90, 90, 90, 0, 0];   /* položaj umjeravanja (-2, Spez 4.3.2 — A4 = 90° doslovno iz izvora) */
pp('Položaj umjeravanja A4 = 90°', 90, 'Vrijednost je doslovno iz specifikacije KR AGILUS-2 [SPEZ2]; za sixx nije u izvatku. Provjeriti u priručniku robota.', 'A1 0°, A2 −90°, A3 90°, A4 90°, A5 0°, A6 0°');
export const OSI = OPSEG.map(([lo, hi], i) => ({
  ime: 'A' + (i + 1), naziv: NAZ_OSI[i],
  minDeg: lo, maxDeg: hi, min: lo * RAD, max: hi * RAD,
  vMax: V.brzine[i], vMaxRad: V.brzine[i] * RAD,     /* °/s i rad/s za odabranu inačicu */
  vMaxSixx: VARIJANTE.sixx.brzine[i], vMax2: VARIJANTE['-2'].brzine[i],
  smjer: SMJER[i], znakURDF: URDF.zglobovi[i].os.find((c) => c !== 0),
  umjeravanjeDeg: UMJ[i],
  zaustavljanje: i < 3 ? { kutDeg: V.zaustavljanje[i][0], vrijeme: V.zaustavljanje[i][1] } : null,
  izvor: 'SIXX, SPEZ2, URDF'
}));
sukob('Brzine osi A4–A6', V.brzine.slice(3).join(' / ') + ' °/s',
  'sixx: 381 / 388 / 615 °/s [SIXX]; KR 6 R900-2: 450 / 450 / 540 °/s [SPEZ2]. Ostale osi iste (360 / 300 / 360 °/s).');

/* karakteristični položaji (rad, KUKA A1…A6) */
const deg = (a) => a.map((x) => x * RAD);
export const POLOZAJI = {
  home: deg([0, -90, 90, 0, 0, 0]),             /* $H_POS; FLANGE X 525, Y 0, Z 890 mm, A 0, B 90°, C 0 [izračun] */
  prirubnicaDolje: deg([0, -90, 90, 0, 90, 0]), /* FLANGE X 445, Y 0, Z 810, A 180°, B 0, C 180° */
  nula: deg([0, 0, 0, 0, 0, 0]),                /* FLANGE X 980, Y 0, Z 435 */
  umjeravanje: deg(UMJ),
  transport: deg([0, -105, 156, 0, 120, 0])     /* sixx, sl. 7-1 [SIXX str. 97] */
};
export const HOME_FLANGE = { x: 0.525, y: 0, z: 0.890, A: 0, B: 90 * RAD, C: 0 };

/* ================================================================== mjere (m) — duljine članaka potvrđene; vanjske mjere procjena */
export const MJERE = {
  /* kinematika [URDF] + crtež radnog prostora [PB0001] */
  visinaA2: 0.400, pomakA2: 0.025, nadlaktica: 0.455, pomakRuke: 0.035, ruka: 0.420, zapesceDoPrirubnice: 0.080,
  doseg: 0.9015,                          /* 25 + 455 + √(420² + 35²) [izračun] = 901,5 mm (crtež) */
  najvisaTockaZapesca: 1.2765, dosegNatrag: 0.8515, volumen: V.volumen,
  podnozje: {
    tlocrt: V.tlocrt,
    visina: pp('Visina sivog podnožja', 0.165, FOTO, '165 mm'),
    polumjer: pp('Polumjer tijela podnožja', 0.096, FOTO + '; tlocrt stope 208 × 208 mm je podatak proizvođača', 'Ø192 mm'),
    stopa: pp('Debljina stope podnožja', 0.016, FOTO, '16 mm'),
    razmakRupa: pp('Razmak rupa za vijke M10', 0.160, 'Uzorak rupa nije u javnom izvatku (-2: oznaka „C246”); procjena.', '160 × 160 mm')
  },
  suceljeA1: {
    sirina: pp('Kutija sučelja A1 (širina × izbočenje × visina)', 0.140, FOTO + ' (PODACI: ≈ 150 × 130 × 150 mm)', '140 × 115 × 150 mm'),
    izbocenje: 0.115, visina: 0.150
  },
  stup: {
    polumjer: pp('Polumjer okretnog stupa', 0.090, FOTO + ' (PODACI: Ø180–200 mm)', 'Ø180 mm'),
    sivoDo: pp('Gornji rub sivog (aluminijskog) prstena okretnog stupa', 0.205, 'Na fotografiji je donji dio stupa sive boje kao podnožje; visina procjena.', '205 mm'),
    polumjerGlavine: pp('Polumjer kućišta osi A2 na stupu', 0.074, FOTO, 'Ø148 mm')
  },
  nadlaktica: {
    pomakY: pp('Bočni pomak nadlaktice od ravnine osi', -0.078, 'Nadlaktica je kod KR AGILUS-a bočno uz stup i ruku (na fotografiji bliže promatraču, tj. na −Y strani). Pomak procjena.', 'središte na Y = −78 mm'),
    debljina: pp('Debljina nadlaktice', 0.064, FOTO, '64 mm'),
    polumjerA2: 0.072, polumjerA3: 0.060
  },
  ruka: {
    polumjerLakta: pp('Polumjer kućišta lakta (A3)', 0.066, FOTO, 'Ø132 mm'),
    polumjerCijevi: pp('Polumjer cijevi ruke', 0.047, FOTO + ' (PODACI: Ø90–100 mm)', 'Ø94 mm'),
    spoj: pp('Spoj ruke i zapešća (od osi A3)', 0.300, 'Na fotografiji je šav između ruke i zapešća na ≈ 0,7 duljine ruke; procjena.', '300 mm od osi A3')
  },
  zapesce: {
    polumjer: pp('Polumjer kućišta zapešća', 0.058, FOTO + ' (kućište s natpisom ≈ 120–130 mm visoko)', 'Ø116 mm'),
    sirinaVilice: pp('Širina vilice zapešća (A5)', 0.104, FOTO, '104 mm'),
    polumjerA5: 0.036, polumjerA6: 0.030
  },
  prirubnica: {
    promjer: pp('Vanjski promjer prirubnice', 0.040, 'Promjer prirubnice nije objavljen; krug rupa Ø31,5 mm je podatak.', 'Ø40 mm'),
    krugRupa: 0.0315, navoj: 'M5', razred: '12.9', centriranje: '5 H7', brojNavoja: SIXX ? 4 : 7,
    debljina: 0.008
  },
  izmjenjivac: {
    promjer: pp('Promjer izmjenjivača alata', 0.050, FOTO + '; tip izmjenjivača u KUKA inačici stanice nije potvrđen', 'Ø50 mm'),
    visinaFiksni: 0.026, visinaSlobodni: 0.014
  }
};
pp('Duljina dijelova zapešća i kućišta, oblik poklopaca', '—', 'KUKA ne objavljuje vanjske mjere članaka; oblik modela je naš crtež iz fotografije i DH tablice.', 'načelni oblik');

/* ================================================================== pogon (motori, prijenosnici, kočnice, mjerni sustav) */
export const POGON = {
  motor: { tip: 'nije javno objavljeno', pretpostavka: 'trofazni sinkroni servomotor s trajnim magnetima (AC servomotor)', snaga: 'nije javno objavljeno', izvor: 'SIXX, SPEZ2' },
  prijenosnik: { vrsta: 'nije javno objavljena', omjer: 'nije javno objavljen', napomena: 'U izvorima se spominju samo „gear unit A1” (spoj stupa s podnožjem) i prijenosnici A2/A3. Prikaz u modelu je načelni (zatvoreno kućište).', izvor: 'SIXX, SPEZ2' },
  kocnica: { svakaOs: true, izvedba: 'nije opisana', pretpostavka: 'opružna elektromagnetska kočnica (koči bez struje)', izvor: 'SIXX, SPEZ2' },
  mjerniSustav: { davac: 'rezolver na motoru', pretvornik: 'RDC (Resolver Digital Converter), ugrađen u robota', izvor: 'C4C-BA, SIXX' },
  otpustanjeKocnica: 'uređaj za otpuštanje kočnica (opcija): odspojiti X30, spojiti uređaj na A1, preklopkom odabrati glavne osi ili osi zapešća, pritisnuti tipku; osi mogu propasti; nakon toga ponovno umjeriti sve osi',
  momentiOsi: 'nije javno objavljeno',
  prirubnicaOpterecenje: [['Aksijalna sila', '215 N (rad) / 323 N (STOP u nuždi)'], ['Radijalna sila', '264 / 309 N'], ['Moment savijanja', '27 / 35 Nm'], ['Moment oko osi prirubnice', '16 / 23 Nm']],
  dodatniTereti: [['Okretni stup', '1 kg'], ['Nadlaktica', '1 kg'], ['Ruka', '2 kg'], ['Podnožje', '0 kg']],
  /* samo za animaciju: koliko se puta brže od izlaza vrti rotor u prikazu (stvarni omjer nije objavljen) */
  faktorPrikaza: pp('Omjer vrtnje rotora u animaciji', 40, 'Prijenosni omjeri nisu objavljeni; rotor se u animaciji vrti 40 × brže od izlaza samo da bi se vidjelo gibanje.', '40 : 1 (samo prikaz)')
};
pp('Smještaj motora, kočnice, rezolvera i prijenosnika u osi zgloba', '—', 'U modelu su motor, kočnica, rezolver i prijenosnik složeni u liniji na osi zgloba (načelni prikaz). Stvarni raspored u kućištima (npr. motor pored osi, kosi motorni poklopci) nije objavljen.', 'u osi zgloba (načelno)');

/* ================================================================== upravljač */
const UPR = {
  krc5micro: {
    id: 'krc5micro', naziv: 'KR C5 micro', masa: '≈ 9,8 kg (9 kg prema CTE 2021.)', zastita: 'IP20',
    mjere: pp('Vanjske mjere KR C5 micro (Š × D × V)', [0.450, 0.300, 0.120],
      'Priručnik daje mjere samo slikom. Današnja KUKA stranica (novija izvedba za iiQKA.OS2) navodi 449 × 300 × 89 mm (12 L), CTE 2021. navodi 16 L. Uzeta je visina 120 mm (≈ 16 L).', '450 × 300 × 120 mm'),
    boja: pp('Boja kućišta upravljača', 'antracit', 'Boja KR C5 micro nije u prikupljenim izvorima.', 'antracit'),
    napajanje: '1 × 200–240 V AC ±10 %, 50–60 Hz', snaga: '1,30 kVA', osigurac: '1 × 16 A tromi, tip C', toplina: 'najviše 250 W',
    buka: '< 54 dB(A)', temperatura: '0 … +45 °C', osi: 'najviše 6 servo osi', softver: 'KSS 8.7 (programi s KR C4 / KSS 8.6 prenose se bez prepisivanja)',
    hladenje: '2 ventilatora, odvojen ulaz i izlaz zraka; razmak 150 mm sprijeda (ulaz), 100 mm straga (izlaz)',
    sigurnost: 'kategorija 3, PL d (EN ISO 13849-1); E-STOP na smartPAD-u, vanjski E-STOP, uređaj za omogućavanje, zaštita operatera, nadzor brzine u T1',
    montaza: 'vodoravno, okomito, na zid, u 19″ okvir; slaganje do 3 komada',
    sastav: ['kontrolna kutija: sistemska ploča SYBbasic ili SYBperf, sučeljna ploča IFBstd', 'pogonska kutija: ventilator, mrežni filtar, kočni otpornik, hladnjak, KSP-300 (FCU-300 i SCU-6-1S)', 'ploča LED-ica mini CSP', 'držač gumbaste baterije', 'opcijski SSD', 'smartPAD-2'],
    sucelja: ['XGSD (SD kartica) i USB', 'XF1–XF8', 'KSI i KONI', 'daisy chain', 'KLI i KLI IT', 'KEI i XGDP', 'XG12, XD12/XD12.1', 'XD2 (UPS)', 'XG11.1', 'XG58', 'XG33 i XF21', 'XD20.1/XD20.2'],
    izvor: 'C5M-MA, CTE, MMS, C5M-WEB'
  },
  krc4compact: {
    id: 'krc4compact', naziv: 'KR C4 compact', masa: '33 kg', zastita: 'IP20',
    mjere: [0.483, 0.460, 0.271], boja: 'RAL 7016',
    napajanje: '200–230 V AC, jedno- ili dvofazno, ±10 %, 50/60 Hz', snaga: '2 kVA', osigurac: '2 × 16 A tromi', toplina: 'najviše 400 W',
    buka: '54 dB(A)', temperatura: '+5 … +45 °C', osi: 'najviše 6 osi', softver: 'KSS 8.x',
    hladenje: '2 ventilatora, okolni zrak', sigurnost: 'kategorija 3, PL d (EN ISO 13849-1); sigurnosni upravljač u KPC-u',
    montaza: '19″ kućište',
    sastav: ['upravljačko računalo KPC (sa sigurnosnim upravljačem)', 'CCU_SR (CIB_SR, PMB_SR)', 'niskonaponski izvor napajanja', 'baterije', 'mrežni filtar', 'memorijska kartica EDS', 'glavna sklopka', '2 ventilatora', 'pogonska kutija: KPP_SR, KSP_SR, kočni otpornik'],
    sucelja: ['X11 (sigurnosno, opcija)', 'X19 (smartPAD)', 'X65 (EtherCAT)', 'X69 (KSI)', 'X21 (podatkovni kabel)', 'X66 (Ethernet sigurnosno)', 'K1 (napajanje)', 'X20 (motori)', 'KLI'],
    izvor: 'C4C-SPEZ, C4C-BA, PB0001'
  }
};
export const UPRAVLJAC = Object.assign({ inacice: UPR }, UPR[C5 ? 'krc5micro' : 'krc4compact']);
sukob('Upravljač robota', UPRAVLJAC.naziv, 'Ormar i privjesak nisu vidljivi ni na jednoj snimci. List podataka KR 6 R900-2 (2023.) navodi KR C5 micro, KR C4 smallsize-2 i KR C4 compact; za ćeliju iz 2023. vjerojatniji je KR C5 micro (pretpostavka). Potvrditi pogledom u donji ormar stanice.');

/* ================================================================== privjesak za učenje */
const ELEMENTI_PRIVJESKA = [
  { id: 'tipkaOdspajanja', broj: 1, strana: 'prednja', naziv: 'Tipka za odspajanje smartPAD-a' },
  { id: 'kljucnaSklopka', broj: 2, strana: 'prednja', naziv: 'Ključna sklopka (upravitelj veze, način rada)' },
  { id: 'gljivaEstop', broj: 3, strana: 'prednja', naziv: 'Gljiva E-STOP' },
  { id: 'misa6D', broj: 4, strana: 'prednja', naziv: '6D miš (Space Mouse)' },
  { id: 'tipkeGibanja', broj: 5, strana: 'prednja', naziv: 'Tipke za ručno gibanje' },
  { id: 'tipkeOverride', broj: '6, 7', strana: 'prednja', naziv: 'Tipke za override programa i ručnog gibanja' },
  { id: 'tipkaIzbornika', broj: 8, strana: 'prednja', naziv: 'Tipka glavnog izbornika' },
  { id: 'statusneTipke', broj: 9, strana: 'prednja', naziv: 'Statusne tipke' },
  { id: 'tipkaStart', broj: 10, strana: 'prednja', naziv: 'Tipka Start' },
  { id: 'tipkaStartNazad', broj: 11, strana: 'prednja', naziv: 'Tipka Start unatrag' },
  { id: 'tipkaStop', broj: 12, strana: 'prednja', naziv: 'Tipka STOP' },
  { id: 'tipkaTipkovnice', broj: 13, strana: 'prednja', naziv: 'Tipka tipkovnice' },
  { id: 'omogucavajuci', broj: '1, 3, 5', strana: 'stražnja', naziv: 'Uređaji za omogućavanje' },
  { id: 'startStraga', broj: 2, strana: 'stražnja', naziv: 'Zelena tipka Start (straga)' },
  { id: 'usbPrivjeska', broj: 4, strana: 'stražnja', naziv: 'USB priključak' }
];
const PRIV = {
  smartpad2: {
    id: 'smartpad2', naziv: 'smartPAD-2', zaslon: '8,4″ kapacitivni, sa zaštitnim staklom', razlucivost: 'nije u izvorima za smartPAD-2',
    mjere: pp('Mjere smartPAD-a (Š × V × D)', [0.292, 0.247, 0.063], 'KUKA stranica „smartPAD” navodi 247 × 292 × 63 mm, ali ne kaže koja generacija; pretpostavljeno je da vrijedi za smartPAD-2.', '292 × 247 × 63 mm'),
    masa: '1,1 kg', zastita: 'IP54', tipkeGibanja: 8, omogucavajuci: 4, usb: '2 × USB',
    osobine: ['priključivanje i odspajanje tijekom rada (hot plug)', 'oblik za lijevu i desnu ruku', 'može stajati na stolu', 'remen za rame', 'ispitan padom s 2 m', 'dvokomponentna plastika'],
    izvor: 'SPAD2-PR, REDDOT, C5M-MA, SPAD-WEB'
  },
  smartpad: {
    id: 'smartpad', naziv: 'smartPAD', zaslon: '8,4″ dodirni, 600 × 800 piksela', razlucivost: '600 × 800',
    mjere: [0.290, 0.240, 0.050], masa: '1,1 kg', zastita: 'IP54', tipkeGibanja: 6, omogucavajuci: 3, usb: 'USB',
    osobine: ['napajanje 20–27,1 V DC', 'kabel najviše 50 m (do 2 produžetka)'],
    izvor: 'C4C-SPEZ, KSS82'
  }
};
export const PRIVJESAK = Object.assign({ inacice: PRIV, elementi: ELEMENTI_PRIVJESKA }, PRIV[SP2 ? 'smartpad2' : 'smartpad']);
pp('Privjesak za učenje', PRIVJESAK.naziv, 'smartPAD-2 zamjenjuje smartPAD od 2019., a priručnik KR C5 micro navodi ga kao dio sustava; u sustavu iz 2023. gotovo sigurno je smartPAD-2 (jaka pretpostavka).');
pp('Raspored tipki na smartPAD-2', '—', 'Raspored i brojevi elemenata preuzeti su iz opisa smartPAD-a (KSS 8.2, odj. 4.1.1); za smartPAD-2 pretpostavljen je isti osnovni raspored, s 8 tipki za gibanje i 4 uređaja za omogućavanje. Položaji na modelu su procjena.', 'kao smartPAD, 8 tipki za gibanje');

/* ================================================================== prihvatnice (TOOL1…TOOL4) */
export const PRIHVATNICE = [
  { id: 'alat1', oznaka: 'TOOL1', naziv: 'Vakuumska prihvatnica (tiskane pločice)', vrsta: 'vakuum',
    tip: pp('TOOL1 — vrsta prihvatnice', 'vakuumska s Venturijevom sapnicom', 'Standardna RASS stanica (Mitsubishi) ima vakuumsku prihvatnicu Festo VN-05-H-T2-PQ1-VQ1-RO1 za tiskane pločice [FESTO-R14]; za KUKA inačicu nije potvrđeno.', 'vakuumska (VN-05, kao standardna stanica)'),
    duljina: pp('Duljina prihvatnice TOOL1 (od izmjenjivača)', 0.072, 'Procjena za prikaz.', '72 mm'), sirina: 0.05 },
  { id: 'alat2', oznaka: 'TOOL2', naziv: 'Paralelna prihvatnica (poklopci)', vrsta: 'paralelna',
    tip: pp('TOOL2 — vrsta prihvatnice', 'Festo DHPS-16-A', 'Standardna stanica: paralelna prihvatnica DHPS-16-A za poklopce [FESTO-R14]; za KUKA inačicu nije potvrđeno.', 'DHPS-16-A (kao standardna stanica)'),
    duljina: pp('Duljina prihvatnice TOOL2', 0.088, 'Procjena za prikaz.', '88 mm'), sirina: 0.06, hod: 0.012 },
  { id: 'alat3', oznaka: 'TOOL3', naziv: 'Mala paralelna prihvatnica (osigurači)', vrsta: 'paralelna',
    tip: pp('TOOL3 — vrsta prihvatnice', 'Festo DHPS-10-A', 'Standardna stanica: DHPS-10-A za osigurače [FESTO-R14]; za KUKA inačicu nije potvrđeno.', 'DHPS-10-A (kao standardna stanica)'),
    duljina: pp('Duljina prihvatnice TOOL3', 0.080, 'Procjena za prikaz.', '80 mm'), sirina: 0.045, hod: 0.008 },
  { id: 'alat4', oznaka: 'TOOL4', naziv: 'Prihvatnica 4 (vrsta nije potvrđena)', vrsta: 'paralelna',
    tip: pp('TOOL4 — vrsta prihvatnice', 'nepoznata', 'Plakat u ćeliji navodi TOOL1–TOOL4, a standardna stanica ima tri prihvatnice. Četvrti alat prikazan je kao paralelna prihvatnica s dugim prstima — čista pretpostavka.', 'nepoznata (prikaz: paralelna s dugim prstima)'),
    duljina: pp('Duljina prihvatnice TOOL4', 0.100, 'Procjena za prikaz.', '100 mm'), sirina: 0.06, hod: 0.014 }
].slice(0, Math.max(0, Math.min(4, KONFIG.prihvatnice)));
/* TCP svakog alata u FLANGE-u (m, rad): z = izmjenjivač + slobodni dio + duljina alata */
PRIHVATNICE.forEach((p) => { p.tcp = { x: 0, y: 0, z: MJERE.izmjenjivac.visinaFiksni + MJERE.izmjenjivac.visinaSlobodni + p.duljina, A: 0, B: 0, C: 0 }; });
pp('TCP prihvatnica (TOOL_DATA)', '—', 'TCP alata u modelu je vrh prihvatnice na osi prirubnice (X 0, Y 0, Z = duljina izmjenjivača i alata, A B C = 0). Stvarne vrijednosti TOOL_DATA[1…4] su u upravljaču stanice.', 'na osi prirubnice, na vrhu alata');

/* ================================================================== KRL — osnove za simulator */
export const KRL = {
  gibanja: [
    { kod: 'PTP', naziv: 'od točke do točke', opis: 'Gibanje po osima: sve osi kreću i stižu istodobno, najbrže je, a putanja TCP-a nije pravac.', primjer: 'PTP P1 Vel=100 % PDAT1 Tool[1] Base[0]', izvor: 'WIKI-KRL, FZI' },
    { kod: 'LIN', naziv: 'linearno', opis: 'TCP se giba po pravcu stalnom brzinom ($VEL.CP u m/s); orijentacija se mijenja jednoliko od početne do ciljne.', primjer: 'LIN P2 Vel=0.2 m/s CPDAT1 Tool[1] Base[0]', izvor: 'WIKI-KRL, FZI' },
    { kod: 'CIRC', naziv: 'kružno', opis: 'TCP se giba po kružnom luku kroz pomoćnu točku do ciljne točke.', primjer: 'CIRC P3 P4 Vel=0.2 m/s CPDAT2 Tool[1] Base[0]', izvor: 'WIKI-KRL, FZI' },
    { kod: 'SPTP', naziv: 'spline PTP', opis: 'Spline inačica PTP gibanja.', primjer: 'SPTP P1', izvor: 'FZI' },
    { kod: 'SLIN', naziv: 'spline LIN', opis: 'Spline inačica LIN gibanja; više segmenata u bloku SPLINE … ENDSPLINE.', primjer: 'SLIN P2', izvor: 'FZI' },
    { kod: 'SCIRC', naziv: 'spline CIRC', opis: 'Spline inačica CIRC gibanja.', primjer: 'SCIRC P3, P4', izvor: 'FZI' }
  ],
  zagladjivanje: [
    { kod: 'C_PTP', za: 'PTP', parametar: '$APO.CPTP', jedinica: '%' },
    { kod: 'C_DIS', za: 'LIN, CIRC', parametar: '$APO.CDIS', jedinica: 'mm' },
    { kod: 'C_VEL', za: 'LIN, CIRC', parametar: '$APO.CVEL', jedinica: '%' },
    { kod: 'C_ORI', za: 'LIN, CIRC', parametar: '$APO.CORI', jedinica: '°' }
  ],
  zadano: { velPTP: 100, accPTP: 100, apoDist: 100, velCP: 0.2, velCPfzi: 0.5, jedinice: { velPTP: '%', accPTP: '%', apoDist: '%', velCP: 'm/s' } },
  t1MaxBrzina: 0.250,                                   /* m/s, prekoračenje → sigurnosni STOP 0 [KSS82] */
  ipoTakt: pp('Interpolacijski takt (IPO)', 0.012, 'Uobičajenih 12 ms [opće znanje KSS] — nije potvrđeno izvorom.', '12 ms'),
  rsiTakt: 0.004,
  tipovi: [['FRAME', '{X, Y, Z, A, B, C}'], ['POS', 'FRAME + S, T'], ['E6POS', 'POS + E1…E6'], ['AXIS', '{A1…A6}'], ['E6AXIS', 'AXIS + E1…E6'], ['osnovni', 'INT, REAL, BOOL, CHAR']],
  orijentacija: 'A oko Z, B oko Y, C oko X (Eulerovi kutovi Z-Y-X, redom oko pomaknutih osi)',
  status: [
    { bit: 0, vrijednost: 1, opis: 'točka zapešća iza osi A1 (područje iznad glave)' },
    { bit: 1, vrijednost: 2, opis: 'točka zapešća ispred pravca kroz A2 i A3 (A3 veći od kuta ispružene ruke ≈ 4,76°)' },
    { bit: 2, vrijednost: 4, opis: 'A5 < 0°' }
  ],
  turn: 'bit i = 1 ako je kut osi A(i+1) < 0° (A1 = 1, A2 = 2, A3 = 4, A4 = 8, A5 = 16, A6 = 32)',
  bco: 'Prije prvog gibanja robot mora „uhvatiti” programiranu putanju (BCO): drži se Start (u T1 uz pritisnut uređaj za omogućavanje) dok se ne javi „BCO reached”; zato je prvo gibanje u programu PTP, obično PTP HOME.',
  kostur: 'DEF Program( )\n; deklaracije\nINI\n; inicijalizacija\nPTP HOME Vel= 100 % DEFAULT\n; gibanja\nPTP HOME Vel= 100 % DEFAULT\nEND',
  primjer: 'DEF Montaza()\nINI\nPTP HOME Vel=100 % DEFAULT\nWAIT FOR $IN[1]            ; PLC: kutija na mjestu\nPTP P1 Vel=100 % PDAT1 Tool[1] Base[1]\nLIN P2 Vel=0.2 m/s CPDAT1 Tool[1] Base[1]\n$OUT[7]=TRUE                ; prihvatnica (primjer mapiranja)\nWAIT SEC 0.3\nLIN P1 Vel=0.5 m/s CPDAT2 Tool[1] Base[1]\nPTP HOME Vel=100 % DEFAULT\nEND',
  nacini: [
    { kod: 'T1', naziv: 'ručni rad smanjenom brzinom', opis: 'Programirana i ručna brzina najviše 250 mm/s; za ispitivanje, programiranje i učenje. Gibanje samo uz uređaj za omogućavanje u srednjem položaju.' },
    { kod: 'T2', naziv: 'ručni rad velikom brzinom', opis: 'Program se izvodi programiranom brzinom; ručno gibanje (jog) nije moguće. Uređaj za omogućavanje mora biti u srednjem položaju.' },
    { kod: 'AUT', naziv: 'automatski rad', opis: 'Automatski rad bez nadređenog upravljanja; uređaj za omogućavanje nema funkciju.' },
    { kod: 'AUT EXT', naziv: 'automatski rad s nadređenim upravljanjem', opis: 'Programe pokreće nadređeni PLC; u Festo stanici vjerojatno taj način (pretpostavka po Festovoj arhitekturi).' }
  ],
  zaustavljanja: [
    { kod: 'STOP 0', opis: 'Pogoni se odmah isključuju, kočnice padaju.' },
    { kod: 'STOP 1', opis: 'Kočenje po putanji, zatim isključenje pogona.' },
    { kod: 'STOP 2', opis: 'Kočenje po putanji, pogoni ostaju uključeni (kočnice otpuštene), nadzor mirovanja.' }
  ],
  okidaci: [['Puštena tipka Start (T1/T2)', 'STOP 2'], ['Tipka STOP', 'STOP 2'], ['Pušten uređaj za omogućavanje', 'sigurnosni STOP 2'], ['Uređaj za omogućavanje do kraja (panika)', 'sigurnosni STOP 1'],
    ['E-STOP', 'sigurnosni STOP 1'], ['Nestanak napajanja', 'STOP 0'], ['Greška sigurnosnog upravljača', 'sigurnosni STOP 0'], ['Prekoračenje 250 mm/s u T1', 'sigurnosni STOP 0'], ['„Drives OFF” u AUT/AUT EXT', 'STOP 1']],
  koordinatniSustavi: [['WORLD', 'svijet, nepomičan (ishodište ćelije)'], ['ROBROOT', 'podnožje robota u WORLD-u'], ['BASE', 'radni predmet ili naprava u WORLD-u; do 32 baze, BASE[0] = $NULLFRAME'], ['FLANGE', 'središte čela prirubnice, Z iz prirubnice prema van'], ['TOOL', 'TCP alata u FLANGE-u; TOOL[0] = prirubnica']],
  izvor: 'KSS82, WIKI-KRL, FZI, LARIS, BECKHOFF'
};
pp('Definicija bitova Status', 'kao Beckhoff TF5200', 'Shema bitova Status preuzeta je iz Beckhoffova opisa iste sheme [BECKHOFF]; da je KUKA KSS koristi jednako (i granični slučaj A5 = 0) nije potvrđeno. U modelu: A5 = 0 → bit 2 = 0.', 'bit 0 iznad glave, bit 1 ispred A2–A3, bit 2 A5 < 0');

/* ================================================================== skupine i izvori */
export const SKUPINE = ['Podnožje i sučelje A1', 'Okretni stup i os A1', 'Nadlaktica i os A2', 'Ruka i os A3', 'Zapešće i osi A4–A6', 'Prirubnica i prihvatnice', 'Energetski sustav i kabeli', 'Upravljač', 'Privjesak smartPAD', 'Pribor'];

export const IZVORI = {
  'SIXX': 'https://www.manualslib.com/manual/2887458/Kuka-Kr-Agilus-Sixx.html',
  'SPEZ2': 'https://www.robotbutikken.dk/wp-content/uploads/Spez_KR_AGILUS-2_en_V5.pdf',
  'DS2023': 'https://uploads.unchainedrobotics.de/media/file_upload/KR%206%20R900-2%20data%20sheet_a3b2fee1.pdf',
  'PB0001': 'https://ntnu.no/wiki/download/attachments/332336048/PB0001_KR_AGILUS_en.pdf?api=v2',
  'PB0004': 'https://anyflip.com/hrmez/parp/basic',
  'PR2017': 'https://kuka.com/en-at/company/press/news/2017/08/kr-agilus',
  'KUKA-AG': 'https://www.kuka.com/en-de/products/robot-systems/industrial-robots/kr-agilus',
  'URDF': 'https://github.com/ros-industrial/kuka_experimental/blob/indigo-devel/kuka_kr6_support/urdf/kr6r900sixx_macro.xacro',
  'ROS2': 'https://index.ros.org/p/kuka_agilus_support/',
  'C4C-SPEZ': 'https://icdn.tradew.com/file/201606/1569362/pdf/7033438.pdf',
  'C4C-BA': 'https://usermanual.wiki/Pdf/KRC4compact20operating20instructionsen.2032480530/html',
  'C5M-MA': 'https://pdfcoffee.com/ma-kr-c5-micro-en-pdf-free.html',
  'C5M-WEB': 'https://www.kuka.com/kr-c5-micro',
  'CTE': 'https://ctemag.com/?p=102566',
  'MMS': 'https://www.mmsonline.com/products/kuka-offers-kr-c5-micro-robot-controller',
  'KSS82': 'https://ntnu.no/wiki/download/attachments/332336048/KUKA_System_Stoftware.pdf?api=v2',
  'SPAD-WEB': 'https://www.kuka.com/en-de/products/robot-systems/robot-controllers/smartpad',
  'SPAD2-PR': 'https://www.kuka.com/en-us/company/press/news/2018/03/smartpad-2-if-award',
  'REDDOT': 'https://red-dot.org/project/kuka-smartpad-2-24200-24199',
  'WIKI-KRL': 'https://en.wikipedia.org/wiki/KUKA_Robot_Language',
  'FZI': 'https://fzi-robot-interface-proposal.readthedocs.io/en/latest/industry/KUKA.html',
  'BECKHOFF': 'https://infosys.beckhoff.com/content/1031/tf5200_programming_manual/814171275.html',
  'LARIS': 'https://perso-laris.univ-angers.fr/~boimond/LAB_1_KUKA_KR3_R540_Trajectory_programming.pdf',
  'FORUM-VENT': 'https://www.robot-forum.com/robotforum/thread/17168-valves-and-inputs-on-the-wrist-krc4-agilus-kr6-r900-sixx/',
  'FORUM-A5': 'https://forum.robotsinarchitecture.org/index.php?msg=1301',
  'FESTO-R14': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-F-RASS-C11R14&lang=en',
  'FESTO-R15': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CPF-B-RASS-C11R15&lang=en',
  'FESTO-MAN': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-F-RASS/files/manual_en.pdf',
  'FESTO-SHEME': 'https://ip.festo-didactic.com/InfoPortal/CPFactoryLab/data/CPF-B-RASS/files/schematics.pdf',
  'RDK': 'https://robodk.com/robot/KUKA/KR-6-R900-2',
  'FOTO': '',          /* fotografija robota u ćeliji (ne objavljuje se) */
  'DH-PROV': ''        /* naš izračun: DH tablica provjerena prema URDF-u (pogreška < 1e-14) */
};

/* ================================================================== dijelovi (redoslijed = redoslijed u Upoznavanju) */
const PD = 'Podnožje i sučelje A1', A1S = 'Okretni stup i os A1', A2S = 'Nadlaktica i os A2', A3S = 'Ruka i os A3', ZS = 'Zapešće i osi A4–A6',
  PR = 'Prirubnica i prihvatnice', EN = 'Energetski sustav i kabeli', UP = 'Upravljač', SP = 'Privjesak smartPAD', PB = 'Pribor';
const SKUPINA_OSI = [A1S, A2S, A3S, ZS, ZS, ZS];
const opseg = (i) => `${OSI[i].minDeg}° … ${OSI[i].maxDeg > 0 ? '+' : ''}${OSI[i].maxDeg}°`.replace(/-/g, '−');
const SMJESTAJ_MOTORA = [
  'Motor A1 nalazi se u okretnom stupu i okreće stup preko prijenosnika A1 koji je vezan na podnožje.',
  SIXX ? 'Prema uputama za sixx motor i prijenosnik A2 su u nadlaktici; prema specifikaciji 2. generacije motor A2 je u okretnom stupu.' : 'Prema specifikaciji 2. generacije motori A1 i A2 su u okretnom stupu.',
  SIXX ? 'Ruku pokreće motor A3; točan smještaj u izvatku uputa za sixx nije jasan.' : 'Prema specifikaciji 2. generacije motor i prijenosnik A3 su u nadlaktici, a ruku pokreće motor A3.',
  'Motor A4 je u ruci i okreće cijelo zapešće oko osi ruke.',
  'Motor A5 je u zapešću i savija prirubnički dio zapešća.',
  'Motor A6 je u zapešću i okreće prirubnicu.'
];
const SUKOB_MOTORA = [false, true, true, false, false, false];
const PRIJ_TEKST = [
  'Prijenosnik A1 spaja okretni stup s podnožjem — preko njega se stup oslanja na podnožje i okreće.',
  'Prijenosnik A2 nosi nadlakticu i sve što je iznad nje, pa preuzima najveći moment od težine ruke i tereta.',
  'Prijenosnik A3 povezuje nadlakticu s rukom.',
  'Prijenosnik A4 okreće zapešće oko osi ruke.',
  'Prijenosnik A5 savija prirubnički dio zapešća.',
  'Prijenosnik A6 okreće prirubnicu; na njegovu izlazu je prirubnica alata.'
];

function osniDijelovi(i) {
  const n = 'A' + (i + 1), sk = SKUPINA_OSI[i];
  const brz = SIXX ? OSI[i].vMaxSixx : OSI[i].vMax2;
  return [
    { id: 'motor' + n, skupina: sk, naziv: `Motor ${n}`,
      opis: `Servomotor osi ${n}. ${SMJESTAJ_MOTORA[i]} KUKA tip, snagu i moment motora ne objavljuje; uobičajeno je to trofazni sinkroni servomotor s trajnim magnetima kojemu servopretvarač u upravljaču zadaje struju (moment) prema kutu što ga mjeri rezolver. U modelu je motor u osi zgloba — načelni prikaz.`,
      podaci: [['Os', n + ' — ' + OSI[i].naziv], ['Opseg osi', opseg(i)], ['Najveća brzina osi', brz + ' °/s'], ['Tip motora', 'nije javno objavljeno'], ['Upravljanje', 'servopretvarač u upravljaču, povratna veza rezolverom']],
      izvor: 'SIXX, SPEZ2', pretpostavka: true,
      napomena: (SUKOB_MOTORA[i] ? 'Izvori se ne slažu oko smještaja motora (sixx / 2. generacija). ' : '') + 'Tip motora (AC servomotor s trajnim magnetima) je pretpostavka; smještaj u osi zgloba je načelni prikaz.', tema: 'servoRegulacija' },
    { id: 'prijenosnik' + n, skupina: sk, naziv: `Prijenosnik ${n}`,
      opis: `${PRIJ_TEKST[i]} Prijenosnik smanjuje brzinu motora i povećava moment na izlazu zgloba; na izlazu je ležaj koji nosi sile i momente članka. Vrsta prijenosnika i prijenosni omjer KUKA ne objavljuje, pa je u modelu prikazan kao zatvoreno kućište s izlaznim ležajem.`,
      podaci: [['Vrsta', 'nije javno objavljena'], ['Prijenosni omjer', 'nije javno objavljen'], ['Izlaz', 'članak ' + n]],
      izvor: 'SIXX, SPEZ2', pretpostavka: true, napomena: 'Vrsta prijenosnika nije javno objavljena; prikaz (zatvoreno kućište, kuglični izlazni ležaj) je načelni.', tema: 'prijenosnik' },
    { id: 'kocnica' + n, skupina: sk, naziv: `Kočnica ${n}`,
      opis: `Svaka os KR AGILUS-a ima kočnicu. Kočnica ${n} drži os kad su pogoni isključeni i pri zaustavljanju STOP 0, kad pogoni odmah gube napajanje. Izvedba nije opisana u javnim dokumentima; u modelu je prikazana uobičajena opružna elektromagnetska kočnica — opruge pritišću kotvu na tarnu ploču, a struja kroz zavojnicu je odmiče.`,
      podaci: [['Na svakoj osi', 'da'], ['Izvedba', 'nije opisana (prikaz: opružna elektromagnetska)'], ['Ručno otpuštanje', 'uređaj za otpuštanje kočnica (opcija), ' + (i < 3 ? 'skupina glavnih osi' : 'skupina osi zapešća')]],
      izvor: 'SIXX, SPEZ2', pretpostavka: true, napomena: 'Izvedba kočnice (opružna, elektromagnetska) je pretpostavka uobičajena za KUKA.', tema: 'kocnica' },
    { id: 'resolver' + n, skupina: sk, naziv: `Rezolver ${n}`,
      opis: `Rezolver na motoru osi ${n} mjeri kut rotora motora. Signale rezolvera u digitalni podatak pretvara RDC (Resolver Digital Converter) ugrađen u robota, a upravljač iz kuta motora i prijenosnog omjera računa kut osi. Drugi davač na izlazu prijenosnika u izvorima se ne spominje — zato se nakon gubitka umjeravanja os ponovno umjerava.`,
      podaci: [['Mjeri', 'kut rotora motora'], ['Pretvornik', 'RDC u robotu'], ['Prijenos podataka', 'podatkovni kabel X31 → upravljač']],
      izvor: 'C4C-BA, SIXX', pretpostavka: true, napomena: 'Da je na svakom motoru rezolver izvedeno je iz kratice RDC; izvedba rezolvera u modelu je načelna.', tema: 'resolver' },
    { id: 'umjeravanje' + n, skupina: sk, naziv: `Oznaka za umjeravanje ${n}`,
      opis: `Na prijelazu između članaka nalazi se mjesto za umjeravanje osi ${n}. Pri umjeravanju (mastering) os se dovede blizu referentnog položaja, a elektronički uređaj EMD, spojen na priključak X32, očita točan referentni položaj i upravljač ga upiše kao nulu osi. Položaj umjeravanja KR 6 R900-2: ${n} = ${UMJ[i]}°.`,
      podaci: [['Položaj umjeravanja', n + ' = ' + UMJ[i] + '°'], ['Uređaj', 'EMD (Electronic Mastering Device), priključak X32'], ['Ponoviti nakon', 'zamjene motora, sudara, otpuštanja kočnica uređajem']],
      izvor: 'SPEZ2, SIXX, KSS82', pretpostavka: true, napomena: 'Izgled oznake i mjernog uloška na modelu je načelni [opće znanje KSS]; položaj umjeravanja vrijedi za 2. generaciju.', tema: 'umjeravanje' }
  ];
}

const VENTILI = SIXX ? [
  { id: 'ventiliZapesca', skupina: ZS, naziv: 'Ventili u zapešću (3 × 4/2)',
    opis: 'U zapešću KR AGILUS sixx ugrađena su tri bistabilna 4/2 elektromagnetska ventila za pneumatske alate. Bistabilni ventil ima dva svitka: impuls na jedan izlaz prebacuje ventil u jedan položaj, impuls na drugi u drugi, i ventil ostaje u zadnjem položaju i bez struje. Upravljaju se digitalnim izlazima DO7–DO12 koje treba mapirati u WorkVisualu.',
    podaci: [['Broj', '3 bistabilna 4/2'], ['Tlak', 'najviše 7 bar'], ['Frekvencija', '10 Hz'], ['Navoj', 'M5'], ['Napon', '24 V DC, 25 mA'], ['Ventil 1 / 2 / 3', 'DO7/DO10 · DO8/DO11 · DO9/DO12'], ['Zrak', 'bez ulja, suh, filtriran ≤ 5 µm (ISO 8573.1-1)']],
    izvor: 'SIXX, PB0001', pretpostavka: true, napomena: 'Brošura navodi „tri 5/2 ventila”, priručnik „4/2” — vjeruje se priručniku. Smještaj ventila u kućištu zapešća u modelu je načelni.', tema: 'razvodEnergije' }
] : [];

const UPR_DIJELOVI = C5 ? [
  { id: 'upravljac', skupina: UP, naziv: 'Upravljač KR C5 micro',
    opis: 'Kompaktni upravljač za male robote KR AGILUS i KR 6 SCARA, na tržištu od 2021. U plosnatom kućištu su upravljačko računalo, sigurnosni upravljački dio i servopretvarači za šest osi. Radi s KUKA System Software 8.7, a programi s KR C4 prenose se bez prepisivanja. Može stajati vodoravno ili okomito, na zidu ili u 19″ okviru.',
    podaci: [['Masa', UPRAVLJAC.masa], ['Zaštita', UPRAVLJAC.zastita], ['Napajanje', UPRAVLJAC.napajanje], ['Priključna snaga', UPRAVLJAC.snaga], ['Toplina', UPRAVLJAC.toplina], ['Osi', UPRAVLJAC.osi], ['Sigurnost', 'kategorija 3, PL d']],
    izvor: 'C5M-MA, CTE, MMS', pretpostavka: true, napomena: 'Da je u stanici KR C5 micro (a ne KR C4 compact) je pretpostavka — ormar nije vidljiv na snimkama.', tema: 'upravljac' },
  { id: 'kucisteUpravljaca', skupina: UP, naziv: 'Kućište upravljača',
    opis: 'Limeno kućište zaštite IP20 — namijenjeno je ormaru ili suhom prostoru. Zrak ulazi sprijeda i izlazi straga, pa ispred upravljača treba ostaviti 150 mm, a iza 100 mm slobodnog prostora. Do tri upravljača smiju se složiti jedan na drugi.',
    podaci: [['Mjere (procjena)', '450 × 300 × 120 mm'], ['Zaštita', 'IP20'], ['Razmak za zrak', '150 mm sprijeda, 100 mm straga'], ['Slaganje', 'do 3 komada']],
    izvor: 'C5M-MA, CTE', pretpostavka: true, napomena: 'Vanjske mjere i izgled kućišta su procjena (priručnik ih daje samo slikom).', tema: 'upravljac' },
  { id: 'sistemskaPloca', skupina: UP, naziv: 'Kontrolna kutija — sistemska ploča SYB',
    opis: 'Sistemska ploča SYBbasic ili SYBperf je računalo upravljača: izvodi KUKA System Software, interpreter KRL-a i planiranje putanje. Planer putanje čita naredbe gibanja unaprijed, pa može zagladiti prijelaz između dviju točaka (CONT) umjesto da robot u svakoj točki stane. Opcijski SSD čuva sustav i programe.',
    podaci: [['Inačice', 'SYBbasic, SYBperf'], ['Softver', 'KSS 8.7'], ['Pohrana', 'SD kartica (XGSD), opcijski SSD']],
    izvor: 'C5M-MA, CTE', pretpostavka: true, napomena: 'Raspored ploča u kućištu je načelni; opis planiranja unaprijed i zaglađivanja je opće znanje KSS.', tema: 'zaglađivanje' },
  { id: 'sucelnaPloca', skupina: UP, naziv: 'Sučeljna ploča IFBstd',
    opis: 'Sučeljna ploča IFBstd povezuje računalo s priključcima na kućištu: digitalnim ulazima i izlazima, sigurnosnim sučeljem, smartPAD-om i robotom. Preko nje idu i signali sigurnosnog kruga (E-STOP, uređaj za omogućavanje, zaštitna vrata stanice).',
    podaci: [['Oznaka', 'IFBstd'], ['Smještaj', 'kontrolna kutija']], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Uloga ploče opisana je prema nazivu i sučeljima iz sadržaja priručnika; raspored je načelni.', tema: 'upravljac' },
  { id: 'pogonskaKutija', skupina: UP, naziv: 'Pogonska kutija',
    opis: 'Odvojeni dio kućišta sa servopretvaračem KSP-300, hladnjakom, ventilatorom, mrežnim filtrom i kočnim otpornikom. Snaga za motore nastaje ovdje, a toplina pretvarača odvodi se preko hladnjaka strujom zraka od prednje prema stražnjoj strani.',
    podaci: [['Sadrži', 'KSP-300, hladnjak, ventilator, mrežni filtar, kočni otpornik']], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Raspored u modelu je načelni.', tema: 'servoRegulacija' },
  { id: 'servoPretvarac', skupina: UP, naziv: 'Servopretvarač KSP-300',
    opis: 'KSP-300 (KUKA Servo Pack), sastavljen od modula FCU-300 i SCU-6-1S, napaja svih šest motora. Za svaku os regulira struju motora tako da os prati zadani kut: položaj daje rezolver preko RDC-a, a pretvarač mijenja napon i frekvenciju na namotima motora. Kad robot koči, energija se vraća u istosmjerni međukrug i troši na kočnom otporniku.',
    podaci: [['Oznaka', 'KSP-300 (FCU-300, SCU-6-1S)'], ['Osi', '6'], ['Izlaz', 'XD20.1 / XD20.2 → motorni kabel']], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Uloga pojedinih modula FCU-300 i SCU-6-1S nije opisana u izvatku; opis regulacije je opći.', tema: 'servoRegulacija' },
  { id: 'kocniOtpornik', skupina: UP, naziv: 'Kočni otpornik',
    opis: 'Kad motori koče, rade kao generatori i vraćaju energiju u istosmjerni međukrug pretvarača. Da napon međukruga ne naraste previše, višak energije troši se u kočnom otporniku i pretvara u toplinu.',
    podaci: [['Smještaj', 'pogonska kutija']], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Izgled i smještaj su načelni.', tema: 'servoRegulacija' },
  { id: 'mrezniFiltar', skupina: UP, naziv: 'Mrežni filtar',
    opis: 'Filtar na ulazu napajanja guši smetnje koje pretvarač vraća u mrežu i štiti upravljač od smetnji iz mreže. Upravljač se napaja jednofazno 200–240 V, osiguran jednim tromim osiguračem 16 A tipa C.',
    podaci: [['Napajanje', UPRAVLJAC.napajanje], ['Osigurač', UPRAVLJAC.osigurac]], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Izgled i smještaj su načelni.', tema: 'upravljac' },
  { id: 'ventilatorUpravljaca', skupina: UP, naziv: 'Ventilatori upravljača',
    opis: 'Dva ventilatora hlade upravljač; ulaz i izlaz zraka su odvojeni. Zrak ulazi sprijeda i izlazi straga, zato se otvori za zrak ne smiju zatvoriti.',
    podaci: [['Broj', '2'], ['Buka', UPRAVLJAC.buka], ['Toplina', UPRAVLJAC.toplina]], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Položaj ventilatora u modelu je načelni.', tema: 'upravljac' },
  { id: 'ledPloca', skupina: UP, naziv: 'Ploča LED-ica mini CSP',
    opis: 'Mala ploča sa signalnim LED-icama pokazuje stanje upravljača (napajanje, pokretanje, greške). Korisno je pri dijagnostici kad smartPAD nije spojen.',
    podaci: [['Oznaka', 'mini CSP']], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Značenje pojedinih LED-ica nije u izvatku; boje i položaj su načelni.', tema: 'upravljac' },
  { id: 'baterijaRTC', skupina: UP, naziv: 'Gumbasta baterija i vanjski UPS',
    opis: 'Gumbasta baterija u držaču čuva podatke kad je upravljač isključen. Za kontrolirano gašenje pri nestanku napajanja na sučelje XD2 spaja se vanjska baterija (UPS) — jedna može služiti do tri upravljača.',
    podaci: [['Unutra', 'gumbasta baterija'], ['Vanjski UPS', 'sučelje XD2, do 3 robota po bateriji']], izvor: 'C5M-MA, CTE', pretpostavka: true, napomena: 'Uloga gumbaste baterije (čuvanje podataka) je pretpostavka.', tema: 'upravljac' },
  { id: 'prikljucciMotora', skupina: UP, naziv: 'Priključci motora XD20.1 / XD20.2',
    opis: 'Na ove priključke spaja se motorni kabel robota (na robotu X30). Kroz njega idu struje svih šest motora i napajanje kočnica.',
    podaci: [['Oznake', 'XD20.1, XD20.2'], ['Kabel', 'motorni, do X30 na robotu']], izvor: 'C5M-MA, SPEZ2', pretpostavka: true, napomena: 'Položaj priključaka na kućištu je načelni.', tema: 'razvodEnergije' },
  { id: 'sigurnosnoSucelje', skupina: UP, naziv: 'Sigurnosna sučelja XG11.1 i XG58',
    opis: 'XG11.1 je diskretno sigurnosno sučelje: na njega se spajaju vanjski E-STOP i zaštitna vrata stanice, dvokanalno. Na XG58 se može spojiti vanjski uređaj za omogućavanje. Sigurnosne funkcije ispunjavaju kategoriju 3, PL d.',
    podaci: [['XG11.1', 'diskretno sigurnosno sučelje (E-STOP, zaštita operatera)'], ['XG58', 'vanjski uređaj za omogućavanje'], ['Razina', 'kategorija 3, PL d']], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Kako je stanica spojena (XG11.1 ili PROFIsafe) nije poznato.', tema: 'zaustavljanje' },
  { id: 'sabirnickaSucelja', skupina: UP, naziv: 'Sučelja KLI i KEI',
    opis: 'KLI (KUKA Line Interface) je Ethernet sučelje prema nadređenom sustavu; u stanici je preko njega robot vjerojatno spojen PROFINET-om na PLC, koji ga pokreće u načinu AUT EXT. KEI (KUKA EtherCAT Interface) služi za EtherCAT uređaje, npr. dodatne ulaze i izlaze.',
    podaci: [['KLI', 'KLI, KLI IT — veza prema PLC-u / mreži'], ['KEI', 'EtherCAT, uz XGDP'], ['Ostalo', 'KSI (servis), KONI, XF1–XF8']], izvor: 'C5M-MA, FESTO-SHEME', pretpostavka: true, napomena: 'Veza robot–PLC preko PROFINET-a na KLI-ju je pretpostavka po uzoru na standardnu stanicu.', tema: 'upravljac' },
  { id: 'xd12', skupina: UP, naziv: 'Ulazi i izlazi XG12 / XD12 i UPS XD2',
    opis: 'XG12 i XD12/XD12.1 daju digitalne ulaze, izlaze i napajanje 24 V za periferiju. XD2 je priključak za vanjski UPS koji pri nestanku napajanja omogućuje kontrolirano gašenje.',
    podaci: [['XG12, XD12/XD12.1', 'digitalni I/O i napajanje'], ['XD2', 'UPS'], ['XG33, XF21', 'brzi mjerni ulazi']], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Položaj priključaka na kućištu je načelni.', tema: 'upravljac' },
  { id: 'usbSd', skupina: UP, naziv: 'SD kartica i USB',
    opis: 'Utor XGSD za SD karticu i USB priključci služe za spremanje i učitavanje projekata, arhiva i zapisa. Projekt za upravljač priprema se u WorkVisualu, gdje se mapiraju i ulazi i izlazi.',
    podaci: [['Oznake', 'XGSD, USB']], izvor: 'C5M-MA, SIXX', pretpostavka: true, napomena: 'Položaj na kućištu je načelni.', tema: 'upravljac' },
  { id: 'mrezniPrikljucak', skupina: UP, naziv: 'Mrežni priključak',
    opis: 'Ulaz napajanja 1 × 200–240 V AC. Priključna snaga upravljača je 1,30 kVA, a toplina najviše 250 W — upola manje od KR C4 compacta.',
    podaci: [['Napon', UPRAVLJAC.napajanje], ['Snaga', UPRAVLJAC.snaga]], izvor: 'C5M-MA', pretpostavka: true, napomena: 'Izgled i položaj priključka su načelni.', tema: 'upravljac' }
] : [
  { id: 'upravljac', skupina: UP, naziv: 'Upravljač KR C4 compact',
    opis: 'Upravljač za male robote u 19″ kućištu boje RAL 7016. Sadrži upravljačko računalo KPC sa sigurnosnim upravljačem, upravljačku jedinicu i pogonsku kutiju za najviše šest osi. Hladi se s dva ventilatora okolnim zrakom.',
    podaci: [['Mjere (D × Š × V)', '460 × 483 × 271 mm'], ['Masa', '33 kg'], ['Zaštita', 'IP20'], ['Napajanje', UPRAVLJAC.napajanje], ['Priključna snaga', '2 kVA'], ['Toplina', 'najviše 400 W']],
    izvor: 'C4C-SPEZ, PB0001', pretpostavka: true, napomena: 'Da je u stanici KR C4 compact je jedna od dvije mogućnosti — ormar nije vidljiv na snimkama.', tema: 'upravljac' },
  { id: 'kucisteUpravljaca', skupina: UP, naziv: 'Kućište upravljača (19″)',
    opis: 'Kućište širine 19″ za ugradnju u ormar ili okvir, zaštite IP20. Na prednjoj strani su glavna sklopka i priključci.', podaci: [['Boja', 'RAL 7016'], ['Zaštita', 'IP20']], izvor: 'C4C-SPEZ', tema: 'upravljac' },
  { id: 'sistemskaPloca', skupina: UP, naziv: 'Upravljačko računalo KPC',
    opis: 'KPC (matična ploča, procesor, memorija, disk, kartice sabirnica) izvodi KUKA System Software, interpreter KRL-a i planiranje putanje; u njemu je i sigurnosni upravljač. Planer čita naredbe unaprijed i zaglađuje prijelaze (CONT).',
    podaci: [['Sadrži', 'sigurnosni upravljač'], ['Sučelja', 'KLI i druga sučelja KPC-a']], izvor: 'C4C-SPEZ, C4C-BA', tema: 'zaglađivanje' },
  { id: 'sucelnaPloca', skupina: UP, naziv: 'Upravljačka jedinica CCU_SR',
    opis: 'CCU_SR (Cabinet Control Unit Small Robot) s pločama CIB_SR (sučelje ormara) i PMB_SR (upravljanje napajanjem) povezuje računalo, pogone, sigurnosne signale i napajanje.', podaci: [['Ploče', 'CIB_SR, PMB_SR']], izvor: 'C4C-SPEZ', tema: 'upravljac' },
  { id: 'pogonskaKutija', skupina: UP, naziv: 'Pogonska kutija (drive box)',
    opis: 'U pogonskoj kutiji su KPP_SR (napajanje istosmjernog međukruga), KSP_SR (pretvarači za motore), kočni otpornik, motorni priključak X20 i ventilatori.', podaci: [['Sadrži', 'KPP_SR, KSP_SR, kočni otpornik, X20']], izvor: 'C4C-SPEZ', tema: 'servoRegulacija' },
  { id: 'servoPretvarac', skupina: UP, naziv: 'Servopretvarač KSP_SR i napajanje KPP_SR',
    opis: 'KPP_SR (KUKA Power Pack) napaja istosmjerni međukrug, a KSP_SR (KUKA Servo Pack) iz njega napaja motore i regulira struju svake osi prema položaju s rezolvera.', podaci: [['Oznake', 'KPP_SR, KSP_SR']], izvor: 'C4C-SPEZ', tema: 'servoRegulacija' },
  { id: 'kocniOtpornik', skupina: UP, naziv: 'Kočni otpornik',
    opis: 'Troši energiju koju motori vraćaju pri kočenju, da napon međukruga ne naraste previše.', podaci: [['Smještaj', 'pogonska kutija']], izvor: 'C4C-SPEZ', tema: 'servoRegulacija' },
  { id: 'mrezniFiltar', skupina: UP, naziv: 'Mrežni filtar i glavna sklopka',
    opis: 'Filtar guši smetnje na ulazu napajanja; glavnom sklopkom upravljač se uključuje i isključuje. Osigurači 2 × 16 A tromi.', podaci: [['Osigurači', UPRAVLJAC.osigurac]], izvor: 'C4C-SPEZ', tema: 'upravljac' },
  { id: 'ventilatorUpravljaca', skupina: UP, naziv: 'Ventilatori upravljača',
    opis: 'Dva ventilatora hlade upravljač okolnim zrakom.', podaci: [['Broj', '2'], ['Buka', UPRAVLJAC.buka]], izvor: 'C4C-SPEZ', tema: 'upravljac' },
  { id: 'ledPloca', skupina: UP, naziv: 'Niskonaponski izvor napajanja',
    opis: 'Izvor niskog napona (24 V) napaja računalo, upravljačku jedinicu i kočnice.', podaci: [['Izlaz', 'niski napon']], izvor: 'C4C-SPEZ', pretpostavka: true, napomena: 'Izlazni napon 24 V je pretpostavka.', tema: 'upravljac' },
  { id: 'baterijaRTC', skupina: UP, naziv: 'Baterije',
    opis: 'Baterije omogućuju kontrolirano gašenje upravljača pri nestanku napajanja, da se podaci ne izgube.', podaci: [['Namjena', 'kontrolirano gašenje']], izvor: 'C4C-SPEZ', tema: 'upravljac' },
  { id: 'prikljucciMotora', skupina: UP, naziv: 'Motorni priključak X20 i podatkovni X21',
    opis: 'X20 spaja motorni kabel (X30 na robotu, konektor Han Yellock 30), a X21 podatkovni kabel (X31 na robotu, Han Q12).', podaci: [['X20', 'motori'], ['X21', 'podatkovni kabel']], izvor: 'C4C-SPEZ, SPEZ2', tema: 'razvodEnergije' },
  { id: 'sigurnosnoSucelje', skupina: UP, naziv: 'Sigurnosno sučelje X11 / X66',
    opis: 'Sigurnosni signali stanice spajaju se ili diskretno na X11 ili preko Etherneta na X66 — konfigurira se jedno od dvoga. Kategorija 3, PL d.', podaci: [['X11', 'diskretno (opcija)'], ['X66', 'Ethernet sigurnosno']], izvor: 'C4C-SPEZ', tema: 'zaustavljanje' },
  { id: 'sabirnickaSucelja', skupina: UP, naziv: 'Sučelja KLI, X65 i X69',
    opis: 'KLI je veza prema PLC-u ili mreži, X65 proširenje EtherCAT, a X69 servisno sučelje KSI.', podaci: [['KLI', 'PLC / mreža'], ['X65', 'EtherCAT'], ['X69', 'KSI']], izvor: 'C4C-SPEZ, C4C-BA', tema: 'upravljac' },
  { id: 'xd12', skupina: UP, naziv: 'Priključak smartPAD-a X19',
    opis: 'Na X19 spaja se kabel smartPAD-a.', podaci: [['X19', 'smartPAD']], izvor: 'C4C-SPEZ', tema: 'upravljac' },
  { id: 'usbSd', skupina: UP, naziv: 'Memorijska kartica EDS',
    opis: 'Na EDS kartici su podaci specifični za robot i ormar.', podaci: [['Oznaka', 'EDS']], izvor: 'C4C-SPEZ', pretpostavka: true, napomena: 'Sadržaj kartice opisan je pojednostavljeno.', tema: 'upravljac' },
  { id: 'mrezniPrikljucak', skupina: UP, naziv: 'Priključak napajanja K1',
    opis: 'Ulaz napajanja 200–230 V AC, jedno- ili dvofazno; priključna snaga 2 kVA.', podaci: [['K1', UPRAVLJAC.napajanje]], izvor: 'C4C-SPEZ', tema: 'upravljac' }
];

const PRIV_DIJELOVI = [
  { id: 'privjesak', skupina: SP, naziv: PRIVJESAK.naziv + ' (privjesak za učenje)',
    opis: SP2 ? 'Privjesak za učenje 2. generacije, od 2019. standard uz KUKA upravljače. Ima kapacitivni zaslon 8,4″ sa zaštitnim staklom, 8 parova tipki za ručno gibanje i 6D miš, a može se odspojiti i priključiti tijekom rada. Oblik odgovara lijevoj i desnoj ruci, može stajati na stolu i nositi se na remenu.'
      : 'Privjesak za učenje uz KR C4: dodirni zaslon 8,4″ (600 × 800 piksela), 6 parova tipki za gibanje, 6D miš i tri uređaja za omogućavanje.',
    podaci: [['Zaslon', PRIVJESAK.zaslon], ['Mjere', '292 × 247 × 63 mm (procjena za generaciju)'], ['Masa', PRIVJESAK.masa], ['Zaštita', PRIVJESAK.zastita], ['Tipke za gibanje', String(PRIVJESAK.tipkeGibanja)], ['Uređaji za omogućavanje', String(PRIVJESAK.omogucavajuci)]],
    izvor: PRIVJESAK.izvor, pretpostavka: true, napomena: 'Generacija privjeska (smartPAD-2) je pretpostavka; mjere sa stranice „smartPAD” bez oznake generacije.', tema: 'privjesakTipke' },
  { id: 'zaslonPrivjeska', skupina: SP, naziv: 'Zaslon (smartHMI)',
    opis: 'Na zaslonu je korisničko sučelje smartHMI. Statusna traka pokazuje način rada, aktivni alat i bazu, override i stanje interpretera, te koordinatni sustav u kojem se giba 6D mišem i tipkama (osi A1…A6 ili X, Y, Z, A, B, C). Sučelje na modelu je naš pojednostavljeni crtež.',
    podaci: [['Veličina', '8,4″'], ['Vrsta', SP2 ? 'kapacitivni, zaštitno staklo' : 'dodirni']], izvor: 'KSS82, SPAD2-PR', tema: 'koordinatniSustavi' },
  { id: 'tipkaOdspajanja', skupina: SP, naziv: 'Tipka za odspajanje (1)',
    opis: 'Prije odspajanja smartPAD-a pritisne se ova tipka; upravljač tada ne javlja E-STOP zbog izvađenog kabela. Dok je smartPAD odspojen, njegova gljiva E-STOP ne djeluje — zato se odspojeni privjesak drži dalje od stanice.',
    podaci: [['Broj na slici', '1']], izvor: 'KSS82, SPAD2-PR', pretpostavka: true, napomena: 'Opis ponašanja pri odspajanju je opće znanje KSS.', tema: 'privjesakTipke' },
  { id: 'kljucnaSklopka', skupina: SP, naziv: 'Ključna sklopka — izbor načina rada (2)',
    opis: 'Okretanjem umetnutog ključa otvara se upravitelj veze, u kojem se bira način rada T1, T2, AUT ili AUT EXT. Bez ključa se način rada ne može promijeniti, pa ključ drži odgovorna osoba.',
    podaci: [['Broj na slici', '2'], ['Načini', 'T1, T2, AUT, AUT EXT']], izvor: 'KSS82', tema: 'nacinRada' },
  { id: 'gljivaEstop', skupina: SP, naziv: 'Gljiva E-STOP (3)',
    opis: 'Crvena gljiva na žutoj podlozi za zaustavljanje u nuždi; pritisnuta se zaključa. Izaziva sigurnosni STOP 1: robot koči po putanji, a zatim se pogoni isključe. Prije ponovnog pokretanja gljivu treba otključati i potvrditi poruku.',
    podaci: [['Broj na slici', '3'], ['Reakcija', 'sigurnosni STOP 1'], ['Zaključavanje', 'da']], izvor: 'KSS82, C5M-MA', tema: 'zaustavljanje' },
  { id: 'misa6D', skupina: SP, naziv: '6D miš (Space Mouse) (4)',
    opis: 'Kapica koja se može potiskivati i zakretati u šest smjerova: robot se giba istodobno po tri osi pomaka i tri osi zakreta odabranog koordinatnog sustava (WORLD, BASE ili TOOL). Brzinu određuje otklon kapice i override ručnog gibanja.',
    podaci: [['Broj na slici', '4'], ['Stupnjevi slobode', '6']], izvor: 'KSS82, SPAD2-PR', tema: 'koordinatniSustavi' },
  { id: 'tipkeGibanja', skupina: SP, naziv: `Tipke za ručno gibanje (5) — ${PRIVJESAK.tipkeGibanja} pari`,
    opis: `Uz svaku os po par tipki − i +. Gibanje po osima pomiče pojedinu os A1…A6; u kartezijskom gibanju ista tipka pomiče TCP po X, Y, Z ili ga zakreće oko A, B, C. ${SP2 ? 'smartPAD-2 ima 8 pari tipki, pa može gibati i dvije dodatne osi.' : ''} Gibanje traje dok se tipka drži i samo uz uređaj za omogućavanje u srednjem položaju.`,
    podaci: [['Broj na slici', '5'], ['Pari tipki', String(PRIVJESAK.tipkeGibanja)], ['Uvjet', 'T1, uređaj za omogućavanje u srednjem položaju']], izvor: 'KSS82, SPAD2-PR', tema: 'privjesakTipke' },
  { id: 'tipkeOverride', skupina: SP, naziv: 'Tipke za override (6, 7)',
    opis: 'Tipka 6 mijenja override programa — postotak programirane brzine kojom se program izvodi. Tipka 7 mijenja override ručnog gibanja. U T1 brzina TCP-a nikad ne prelazi 250 mm/s, bez obzira na override.',
    podaci: [['Broj na slici', '6 (program), 7 (ručno)'], ['T1', 'najviše 250 mm/s']], izvor: 'KSS82', tema: 'privjesakTipke' },
  { id: 'tipkaIzbornika', skupina: SP, naziv: 'Tipka glavnog izbornika (8)',
    opis: 'Otvara glavni izbornik smartHMI-ja: konfiguracija, prikaz ulaza i izlaza, umjeravanje, mjerenje alata i baze i drugo.', podaci: [['Broj na slici', '8']], izvor: 'KSS82', tema: 'privjesakTipke' },
  { id: 'statusneTipke', skupina: SP, naziv: 'Statusne tipke (9)',
    opis: 'Tipke čije značenje ovisi o instaliranim tehnološkim paketima — npr. otvaranje i zatvaranje prihvatnice bez pisanja programa.', podaci: [['Broj na slici', '9']], izvor: 'KSS82', tema: 'privjesakTipke' },
  { id: 'tipkaStart', skupina: SP, naziv: 'Tipka Start (10)',
    opis: 'Pokreće program. U T1 i T2 program se izvodi samo dok se Start drži (uz uređaj za omogućavanje); puštena tipka zaustavlja robot sa STOP 2. Prije prvog gibanja robot treba doći na putanju (BCO), zato je prvo gibanje u programu PTP.',
    podaci: [['Broj na slici', '10'], ['Puštena (T1/T2)', 'STOP 2']], izvor: 'KSS82, LARIS', tema: 'gibanjaKRL' },
  { id: 'tipkaStartNazad', skupina: SP, naziv: 'Tipka Start unatrag (11)',
    opis: 'Izvodi program unatrag, gibanje po gibanje — korisno za povratak na prethodnu točku pri ispitivanju programa.', podaci: [['Broj na slici', '11']], izvor: 'KSS82', tema: 'gibanjaKRL' },
  { id: 'tipkaStop', skupina: SP, naziv: 'Tipka STOP (12)',
    opis: 'Zaustavlja program koji se izvodi (STOP 2): robot koči po putanji, a pogoni ostaju uključeni. To nije zaustavljanje u nuždi.', podaci: [['Broj na slici', '12'], ['Reakcija', 'STOP 2']], izvor: 'KSS82', tema: 'zaustavljanje' },
  { id: 'tipkaTipkovnice', skupina: SP, naziv: 'Tipka tipkovnice (13)',
    opis: 'Prikazuje zaslonsku tipkovnicu za unos imena, brojeva i naredbi.', podaci: [['Broj na slici', '13']], izvor: 'KSS82', tema: 'privjesakTipke' },
  { id: 'omogucavajuci', skupina: SP, naziv: `Uređaji za omogućavanje (straga, ${PRIVJESAK.omogucavajuci})`,
    opis: 'Tropoložajne tipke na stražnjoj strani: nepritisnuta, srednji položaj (rad) i do kraja pritisnuta (panika). U T1 i T2 robot se giba samo dok je jedna u srednjem položaju; puštanje daje sigurnosni STOP 2, a stisak do kraja sigurnosni STOP 1. U AUT nemaju funkciju.',
    podaci: [['Položaji', '3'], ['Pušten', 'sigurnosni STOP 2'], ['Do kraja', 'sigurnosni STOP 1'], ['Broj', String(PRIVJESAK.omogucavajuci)]], izvor: 'KSS82, C5M-MA', tema: 'zaustavljanje' },
  { id: 'startStraga', skupina: SP, naziv: 'Zelena tipka Start (straga)',
    opis: 'Druga tipka Start na stražnjoj strani, pa se program može pokretati rukom kojom se drži privjesak.', podaci: [['Broj na slici (straga)', '2']], izvor: 'KSS82', tema: 'privjesakTipke' },
  { id: 'usbPrivjeska', skupina: SP, naziv: 'USB priključak',
    opis: 'USB na stražnjoj strani služi za spremanje i učitavanje programa i arhiva izravno na privjesku.', podaci: [['Broj na slici (straga)', '4'], ['Priključci', PRIVJESAK.usb]], izvor: 'KSS82, SPAD-WEB', tema: 'privjesakTipke' },
  { id: 'kabelPrivjeska', skupina: SP, naziv: 'Kabel smartPAD-a',
    opis: 'Kabel spaja privjesak s upravljačem; kroz njega idu napajanje, podaci i sigurnosni signali (E-STOP, uređaji za omogućavanje). Može se odspojiti tijekom rada uz tipku za odspajanje.',
    podaci: [['Duljina', SP2 ? 'nije u izvorima za smartPAD-2' : 'najviše 50 m (do 2 produžetka)']], izvor: 'C4C-SPEZ, SPAD2-PR', pretpostavka: true, napomena: 'Prikazana duljina i vođenje kabela su načelni.', tema: 'razvodEnergije' }
];

const ALAT_DIJELOVI = PRIHVATNICE.map((p, k) => ({
  id: p.id, skupina: PR, naziv: `${p.oznaka} — ${p.naziv}`,
  opis: [
    'Vakuumska prihvatnica s Venturijevom sapnicom: stlačeni zrak struji kroz sapnicu i stvara podtlak na gumenoj sisaljci, pa ravnu tiskanu pločicu drži bez stezanja rubova. Senzor vakuuma u odlagalištu javlja PLC-u da je pločica odložena.',
    'Paralelna prihvatnica s dva prsta koji se pneumatski primiču i odmiču. U standardnoj stanici njome se prihvaćaju poklopci kućišta.',
    'Manja paralelna prihvatnica za sitne dijelove — u standardnoj stanici za osigurače koji se uzimaju iz cijevi s optičkim senzorom.',
    'Četvrti alat iz spremišta. Na plakatu ćelije postoji koordinatni sustav TOOL4, ali vrsta alata nije poznata; u modelu je paralelna prihvatnica s dugim prstima.'
  ][k] + ` Na robotu je aktivan alat ${p.oznaka} (TOOL_DATA[${k + 1}]) kad je ova prihvatnica preuzeta iz spremišta.`,
  podaci: [['Oznaka', p.oznaka], ['Vrsta (pretpostavka)', p.tip], ['TCP (procjena)', `X 0, Y 0, Z ${Math.round(p.tcp.z * 1000)} mm`]],
  izvor: 'FESTO-R14, FESTO-MAN, FOTO', pretpostavka: true,
  napomena: 'Broj i vrsta prihvatnica u KUKA inačici stanice nisu potvrđeni; prikaz po uzoru na standardnu stanicu.', tema: 'izmjenaAlata'
}));

export const DIJELOVI = [
  /* ---------------- Podnožje i sučelje A1 */
  { id: 'robot', skupina: PD, naziv: 'Robot ' + NAZIV_ROBOTA,
    opis: 'Šestosni zglobni robot iz obitelji KR AGILUS za terete do nekoliko kilograma, od lijevane lake legure. Doseg do točke zapešća je 901 mm, a svaka os ima kočnicu. Kinematiku opisuju duljine 400, 25, 455, 35, 420 i 80 mm; HOME je A1 0°, A2 −90°, A3 90°, A4 0°, A5 0°, A6 0°, kad je prirubnica na X 525, Z 890 mm.',
    podaci: [['Inačica (prikaz)', V.oznaka], ['Broj osi', '6'], ['Nosivost', V.nosivost], ['Doseg', '901 mm'], ['Ponovljivost (ISO 9283)', '±' + zarez(V.ponovljivost) + ' mm'], ['Masa', '≈ ' + V.masa + ' kg'], ['Zaštita', V.ip], ['Radni prostor', zarez(V.volumen) + ' m³'], ['Montaža', 'pod, zid, strop' + (SIXX ? '' : ', pod kutom')]],
    izvor: 'SIXX, SPEZ2, DS2023, URDF', pretpostavka: true, napomena: TEKST_INACICA, tema: 'kinematikaDH' },
  { id: 'podnozje', skupina: PD, naziv: 'Podnožje (base frame)',
    opis: 'Nepomični temelj robota od lijevanog aluminija, vijcima pričvršćen na podlogu. U njegovoj osi je ishodište koordinatnog sustava ROBROOT: X naprijed, Y lijevo, Z gore. Straga je kutija sučelja A1 sa svim priključcima prema upravljaču i energetskom sustavu.',
    podaci: [['Tlocrt', SIXX ? '209 × 207 mm' : '208 × 208 mm'], ['Boja (na robotu)', 'sivi aluminij RAL 9007'], ['Koordinatni sustav', 'ROBROOT u osi A1, na podlozi']],
    izvor: 'SIXX, SPEZ2, PB0001, FOTO', tema: 'koordinatniSustavi' },
  { id: 'vijciTemelja', skupina: PD, naziv: 'Vijci i zatici za učvršćenje',
    opis: 'Robot se pričvršćuje s četiri šesterokutna vijka M10 × 35 s konusnim opružnim podloškama, pritegnutima unakrsno na 45 Nm. Cilindrični i plosnati zatik određuju točan položaj robota, zato se robot na podlogu spušta strogo okomito. U stanici robot stoji na čeličnoj ploči s rupama na profilnom stolu.',
    podaci: [['Vijci', '4 × M10 × 35, konusne opružne podloške'], ['Pritezni moment', '45 Nm, unakrsno'], ['Zatici', 'cilindrični i plosnati']], izvor: 'SIXX, FOTO', pretpostavka: true, napomena: 'Položaj rupa u modelu je procjena.', tema: 'koordinatniSustavi' },
  { id: 'suceljeA1', skupina: PD, naziv: 'Sučelje A1 (priključna kutija)',
    opis: 'Kutija na stražnjoj strani podnožja s priključcima za motorni i podatkovni kabel, umjeravanje, Ethernet do zapešća, zrak i nadtlak. Svi kabeli i vodovi unutar robota su utični i izlaze kroz ovo sučelje. Na fotografiji se na njega spajaju dva debela crna kabela, zeleni Ethernet kabel i pneumatske cijevi.',
    podaci: [['Priključci', 'X30, X31, X32, XPN1, AIR1, AIR2, nadtlak, XP7.1/XP8.1 (vanjske osi)'], ['Mjere (procjena)', '140 × 115 × 150 mm']], izvor: 'SIXX, PB0001, FOTO', pretpostavka: true, napomena: 'Raspored priključaka na kutiji je procjena; oznake vrijede za sixx.', tema: 'razvodEnergije' },
  { id: 'x30', skupina: PD, naziv: 'Motorni priključak X30',
    opis: 'Na X30 dolazi motorni kabel iz upravljača (X20 / XD20). Kroz njega idu struje svih šest motora i napajanje kočnica. Konektor je Han Yellock 30; najmanji polumjer savijanja kabela pri fiksnom polaganju je 50 mm.',
    podaci: [['Konektor', 'Han Yellock 30'], ['Kabel', 'X20 (ormar) – X30 (robot)'], ['Duljine', '1, 4, 7, 15, 25 m'], ['Polumjer savijanja', '50 mm (fiksno)']], izvor: 'SIXX, SPEZ2', tema: 'razvodEnergije' },
  { id: 'x31', skupina: PD, naziv: 'Podatkovni priključak X31',
    opis: 'Podatkovni kabel spaja RDC u robotu s upravljačem: kroz njega idu digitalizirani kutovi rezolvera i drugi signali robota. Konektor je Han Q12; najmanji polumjer savijanja 30 mm.',
    podaci: [['Konektor', 'Han Q12'], ['Kabel', 'X21 (ormar) – X31 (robot)'], ['Polumjer savijanja', '30 mm (fiksno)']], izvor: 'SIXX, SPEZ2', tema: 'resolver' },
  { id: 'x32', skupina: PD, naziv: 'Priključak MicroEMD X32',
    opis: 'Na X32 spaja se elektronički uređaj za umjeravanje (MicroEMD). Uređaj se zatim postavi na mjerni uložak osi koja se umjerava, a upravljač preko njega pronađe referentni položaj.',
    podaci: [['Namjena', 'umjeravanje (EMD)']], izvor: 'SIXX, PB0001', tema: 'umjeravanje' },
  { id: 'xpn1', skupina: PD, naziv: 'Podatkovni priključak XPN1 (CAT5)',
    opis: 'Ethernet vod (CAT5) kroz robota do zapešća, za uređaje na alatu — npr. kameru ili sabirnički modul. Brošura ga navodi kao „Extension Interface 100 Mbit”; na zapešću mu odgovara XPN41.',
    podaci: [['Vrsta', 'CAT5, 100 Mbit/s'], ['Na zapešću', 'XPN41']], izvor: 'SIXX, PB0001', tema: 'razvodEnergije' },
  { id: 'air1', skupina: PD, naziv: 'Zračni priključak AIR1 (i dovod iz stanice)',
    opis: 'Ulaz stlačenog zraka iz stanice za ventile u zapešću. U stanici je zrak 6 bar, a ventili u zapešću podnose najviše 7 bar; zrak mora biti bez ulja, suh i filtriran.',
    podaci: [['Tlak u stanici', '6 bar (0,6 MPa)'], ['Ventili', 'najviše 7 bar']], izvor: 'SIXX, FESTO-MAN, FOTO', pretpostavka: true, napomena: 'Da je dovod iz stanice spojen na AIR1 je pretpostavka po fotografiji.', tema: 'razvodEnergije' },
  { id: 'air2', skupina: PD, naziv: 'Zračni priključak AIR2',
    opis: 'Drugi zračni vod kroz robota, s izlazom na sučelju A4 na zapešću (AIR2). Služi za alat kojemu treba zrak mimo ventila u zapešću, npr. za Venturijevu sapnicu.',
    podaci: [['Izlaz', 'sučelje A4 (AIR2)']], izvor: 'SIXX', tema: 'razvodEnergije' },
  { id: 'prikljucakNadtlaka', skupina: PD, naziv: 'Priključak za nadtlak (purge)',
    opis: 'Kroz ovaj priključak u robota se upuhuje malo suhog zraka, pa je unutra stalno nešto viši tlak od okolnog i prašina ili vlaga ne ulaze. Kod 2. generacije zaštita IP67 vrijedi samo uz nadtlak 0,3 bar, protok 0,1 m³/h, crijevo Ø4 mm.',
    podaci: [['Nadtlak (-2)', '0,3 bar, 0,1 m³/h, crijevo Ø4 mm']], izvor: 'SIXX, SPEZ2', tema: 'razvodEnergije' },
  { id: 'zastitniVodic', skupina: PD, naziv: 'Priključak zaštitnog vodiča',
    opis: 'Zaštitni vodič spaja kućište robota s uzemljenjem upravljača. Spaja se odmah nakon X30 i X31 pri postavljanju robota.',
    podaci: [['Spoj', 'nakon X30 i X31']], izvor: 'SIXX', pretpostavka: true, napomena: 'Položaj vijka zaštitnog vodiča u modelu je procjena.', tema: 'razvodEnergije' },
  { id: 'natpisnaPlocica', skupina: PD, naziv: 'Natpisna pločica robota',
    opis: 'Na podnožju je natpisna pločica s tipskom oznakom robota. Prema njoj se razlikuju inačice: „KR 6 R900 sixx” ili „KR 6 R900-2”. Serijski broj s pločice ne objavljuje se.',
    podaci: [['Pročitati', 'tipska oznaka (sixx ili -2)']], izvor: 'SIXX, SPEZ2', pretpostavka: true, napomena: 'Položaj pločice na podnožju je procjena; u modelu je pločica prazna.', tema: 'kinematikaDH' },
  { id: 'rdc', skupina: PD, naziv: 'RDC — pretvornik signala rezolvera',
    opis: 'RDC (Resolver Digital Converter) ugrađen je u robota. Napaja rezolvere svih motora, njihove analogne signale pretvara u digitalne kutove i šalje ih podatkovnim kabelom (X31) upravljaču. Kratak analogni put smanjuje utjecaj smetnji.',
    podaci: [['Ulazi', 'rezolveri A1–A6 (i vanjske osi 7, 8)'], ['Izlaz', 'X31 → upravljač']], izvor: 'C4C-BA, SIXX, PB0001', pretpostavka: true, napomena: 'Smještaj RDC-a u podnožju je pretpostavka (izvor kaže samo „ugrađen u robota”).', tema: 'resolver' },

  /* ---------------- Okretni stup i os A1 */
  { id: 'okretniStup', skupina: A1S, naziv: 'Okretni stup (os A1)',
    opis: 'Okretni stup vrti se oko okomite osi A1 i nosi nadlakticu. Na podnožje je vezan preko prijenosnika A1, a u njemu su motori. Os A1 na KR AGILUS-u ima opseg ±170° i najveću brzinu 360 °/s.',
    podaci: [['Opseg A1', opseg(0)], ['Brzina A1', OSI[0].vMax + ' °/s'], ['Zaustavni put A1 (STOP 0)', `${zarez(V.zaustavljanje[0][0])}°, ${zarez(V.zaustavljanje[0][1])} s`], ['Dodatni teret', '1 kg']],
    izvor: 'SIXX, SPEZ2, FOTO', tema: 'os' },
  ...osniDijelovi(0),

  /* ---------------- Nadlaktica i os A2 */
  { id: 'nadlaktica', skupina: A2S, naziv: 'Nadlaktica (link arm, os A2)',
    opis: 'Nadlaktica dugačka 455 mm (od osi A2 do osi A3) zakreće se oko vodoravne osi A2 koja je 400 mm iznad podloge i 25 mm ispred osi A1. Kod KR AGILUS-a je bočno uz stup i ruku. Kroz nju prolazi kabelski snop i vodovi energetskog sustava prema ruci i zapešću.',
    podaci: [['Duljina A2–A3', '455 mm'], ['Opseg A2', opseg(1)], ['Brzina A2', OSI[1].vMax + ' °/s'], ['A2 = −90°', 'okomito gore'], ['Zaustavni put A2 (STOP 0)', `${zarez(V.zaustavljanje[1][0])}°, ${zarez(V.zaustavljanje[1][1])} s`]],
    izvor: 'URDF, SIXX, SPEZ2', pretpostavka: true, napomena: 'Vanjski oblik i bočni pomak nadlaktice procijenjeni su iz fotografije.', tema: 'os' },
  ...osniDijelovi(1),
  { id: 'kabelskiSnop', skupina: A2S, naziv: 'Kabelski snop A2–A6',
    opis: 'Unutar robota motorni i podatkovni vodovi idu od sučelja A1 kroz okretni stup i nadlakticu do motora u ruci i zapešću. Svi su spojevi utični, pa se motor ili kabel mogu zamijeniti bez lemljenja. Snop se pri gibanju osi uvija i savija, zato je vođen kroz osi zglobova.',
    podaci: [['Od – do', 'sučelje A1 → motori A2–A6'], ['Spojevi', 'utični']], izvor: 'SIXX, SPEZ2', pretpostavka: true, napomena: 'Vođenje snopa u modelu je načelno.', tema: 'razvodEnergije' },

  /* ---------------- Ruka i os A3 */
  { id: 'ruka', skupina: A3S, naziv: 'Ruka (arm, os A3)',
    opis: 'Ruka spaja nadlakticu sa zapešćem i zakreće se oko osi A3. Os ruke (A4) je 35 mm iznad osi A3, a do točke zapešća ima 420 mm. Zbog tog pomaka ruka je ispružena pri A3 ≈ +4,76°, a ne pri 0°.',
    podaci: [['Pomak osi A4 od A3', '35 mm'], ['A3 → točka zapešća', '420 mm'], ['Opseg A3', opseg(2)], ['Brzina A3', OSI[2].vMax + ' °/s'], ['Ispružena ruka', 'A3 ≈ +4,76°'], ['Dodatni teret', '2 kg']],
    izvor: 'URDF, SIXX, SPEZ2', pretpostavka: true, napomena: 'Vanjski oblik ruke i položaj spoja sa zapešćem procijenjeni su iz fotografije.', tema: 'os' },
  ...osniDijelovi(2),

  /* ---------------- Zapešće i osi A4–A6 */
  { id: 'zapesce', skupina: ZS, naziv: 'Zapešće (in-line wrist, osi A4–A6)',
    opis: 'Zapešće s tri osi u liniji (IW 6/10 R900): A4 okreće cijelo zapešće oko osi ruke, A5 ga savija, a A6 okreće prirubnicu. Sve tri osi sijeku se u jednoj točki (točka zapešća), pa se položaj i orijentacija alata mogu računati odvojeno. ' + (SIXX ? 'Kod sixx su u zapešću i tri ventila te sučelje A4 na vrhu.' : 'Kod 2. generacije sučelje A4 je na boku zapešća.'),
    podaci: [['Opseg A4 / A5 / A6', `${opseg(3)} · ${opseg(4)} · ${opseg(5)}`], ['Brzine A4 / A5 / A6', V.brzine.slice(3).join(' / ') + ' °/s'], ['Točka zapešća → prirubnica', '80 mm']],
    izvor: 'SIXX, SPEZ2, URDF', pretpostavka: true, napomena: 'Vanjski oblik zapešća procijenjen je iz fotografije.', tema: 'os' },
  { id: 'kucisteA6', skupina: ZS, naziv: 'Prirubnički dio zapešća (A5/A6)',
    opis: 'Dio zapešća koji se savija oko osi A5 i nosi os A6 s prirubnicom. Pri A5 = 0° prirubnica gleda u smjeru ruke, a pri A5 = +90° (uz HOME ostale osi) gleda prema dolje.',
    podaci: [['A5 = 0°', 'prirubnica u smjeru ruke'], ['A5 = +90°', 'prirubnica dolje (u HOME)']], izvor: 'URDF', pretpostavka: true, napomena: 'Oblik je procjena.', tema: 'os' },
  { id: 'tockaZapesca', skupina: ZS, naziv: 'Točka zapešća (presjek A4, A5, A6)',
    opis: 'Zamišljena točka u kojoj se sijeku osi A4, A5 i A6. Inverzna kinematika najprije iz zadane prirubnice računa ovu točku, iz nje A1, A2 i A3, a zatim orijentaciju zapešća A4–A6. Kod A5 = 0° osi A4 i A6 leže na istom pravcu (singularitet zapešća), a kad je točka zapešća na osi A1 nastaje singularitet iznad glave.',
    podaci: [['U HOME', 'X 445, Y 0, Z 890 mm'], ['Do prirubnice', '80 mm'], ['Singulariteti', 'iznad glave, ispružena ruka (A3 ≈ +4,76°), zapešće (A5 = 0°)']], izvor: 'URDF, DH-PROV, FORUM-A5', tema: 'singularnosti' },
  ...osniDijelovi(3), ...osniDijelovi(4), ...osniDijelovi(5),
  ...VENTILI,
  { id: 'suceljeA4', skupina: ZS, naziv: 'Sučelje A4 na zapešću',
    opis: SIXX ? 'Priključno mjesto na vrhu zapešća sa signalnim priključkom X41, Ethernet priključkom XPN41 i zračnim vodom AIR2 te izlazima ventila. Ovdje se priključuje oprema alata, a vodovi od sučelja A4 do alata vode se izvana.'
      : 'Priključno mjesto na boku zapešća (2. generacija) s priključcima energetskog sustava za alat.',
    podaci: [['Položaj', SIXX ? 'na vrhu zapešća' : 'na boku zapešća'], ['Priključci', 'X41, XPN41, AIR2, zrak ventila']], izvor: 'SIXX, SPEZ2', pretpostavka: !SIXX, napomena: SIXX ? '' : 'Sadržaj sučelja 2. generacije (CTR AIR / AIR CTR GIG) nije u javnom izvatku.', tema: 'razvodEnergije' },
  { id: 'x41', skupina: ZS, naziv: 'Signalni priključak X41 (I/O zapešća)',
    opis: '10-polni okrugli konektor za ulaze i izlaze alata. Na zapešću je 6 ulaza i 2 izlaza — npr. za senzore prihvatnice koji javljaju je li dio uhvaćen.',
    podaci: [['Konektor', '10-polni, okrugli'], ['Ulazi / izlazi', '6 / 2']], izvor: 'SIXX, PB0001, FORUM-VENT', pretpostavka: true, napomena: 'Raspodjela izlaza (8 ukupno: 6 za ventile, 2 na X41) potječe s foruma.', tema: 'razvodEnergije' },
  { id: 'xpn41', skupina: ZS, naziv: 'Ethernet priključak XPN41',
    opis: 'Kraj CAT5 voda koji počinje na XPN1 u podnožju. Uređaj na alatu (npr. kamera) spaja se ovdje bez vanjskog kabela uzduž cijele ruke.',
    podaci: [['Vrsta', 'CAT5'], ['Početak voda', 'XPN1 u podnožju']], izvor: 'SIXX', tema: 'razvodEnergije' },
  { id: 'ioModulZapesca', skupina: ZS, naziv: 'EtherCAT modul u ruci',
    opis: 'Ulazi i izlazi zapešća i ventili upravljaju se preko integrirane sabirnice EtherCAT koja vodi do zapešća. Prema forumu, u ruci je EtherCAT modul EM8905.',
    podaci: [['Sabirnica', 'EtherCAT do zapešća'], ['Modul (forum)', 'EM8905']], izvor: 'PB0001, FORUM-VENT', pretpostavka: true, napomena: 'Oznaka modula potječe s foruma, ne iz službenog izvora; smještaj je načelni.', tema: 'razvodEnergije' },

  /* ---------------- Prirubnica i prihvatnice */
  { id: 'prirubnica', skupina: PR, naziv: 'Prirubnica alata (ISO 9409-1, Ø31,5)',
    opis: 'Prirubnica na osi A6 prema ISO 9409-1 s krugom rupa Ø31,5 mm, navojima M5 i provrtom za centriranje 5 H7. Središte njezina čela je ishodište koordinatnog sustava FLANGE (Z iz prirubnice prema van); TCP alata zadaje se u tom sustavu.',
    podaci: [['Norma', 'ISO 9409-1 (2004)'], ['Krug rupa', 'Ø31,5 mm'], ['Navoji', SIXX ? 'M5 (osnovni uzorak 4 ×)' : 'M5, 7 navoja'], ['Vijci', 'M5, razred 12.9, stezna duljina ≥ 1,5 × d'], ['Dubina uvrtanja', V.dubinaNavoja], ['Centriranje', '5 H7'], ['Koordinatni sustav', 'FLANGE']],
    izvor: 'SIXX, SPEZ2', pretpostavka: true, napomena: 'Skraćena oznaka „ISO 9409-1-31,5-4-M5” nije doslovno u izvoru; KUKA za 2. generaciju navodi 7 navoja. Vanjski promjer prirubnice je procjena.', tema: 'koordinatniSustavi' },
  { id: 'izmjenjivacFiksni', skupina: PR, naziv: 'Izmjenjivač alata — dio na robotu',
    opis: 'Fiksni dio izmjenjivača pričvršćen na prirubnicu. Robot njime sam preuzima prihvatnicu iz spremišta: uđe u njezin slobodni dio, a pneumatski klipovi zaključaju spoj. Kroz izmjenjivač prolaze zrak i električni signali do alata.',
    podaci: [['Standardna stanica', 'Zimmer WWR40F-B (fiksni dio)'], ['Zaključavanje', 'pneumatsko']], izvor: 'FESTO-R14, FESTO-MAN, FOTO', pretpostavka: true, napomena: 'Tip izmjenjivača u KUKA inačici stanice nije potvrđen; na fotografiji je metalni valjak između prirubnice i prihvatnice.', tema: 'izmjenaAlata' },
  { id: 'elektricniPrijenos', skupina: PR, naziv: 'Električni prijenos izmjenjivača',
    opis: 'Modul s kontaktima na boku izmjenjivača prenosi električne signale do alata (npr. senzor prihvatnice) kad je alat zaključan.',
    podaci: [['Standardna stanica', 'WER02FF04 (robot) / WER02LF04 (alat)']], izvor: 'FESTO-R14', pretpostavka: true, napomena: 'Za KUKA inačicu nije potvrđeno.', tema: 'izmjenaAlata' },
  { id: 'izmjenjivacSlobodni', skupina: PR, naziv: 'Izmjenjivač alata — dio na alatu',
    opis: 'Slobodni dio izmjenjivača na svakoj prihvatnici. Dok alat čeka u spremištu, ovim dijelom stoji u držaču; robot ga preuzima odozgo i zaključa.',
    podaci: [['Standardna stanica', 'Zimmer WWR40L-B']], izvor: 'FESTO-R14', pretpostavka: true, napomena: 'Za KUKA inačicu nije potvrđeno.', tema: 'izmjenaAlata' },
  ...ALAT_DIJELOVI,
  { id: 'spremisteAlata', skupina: PR, naziv: 'Spremište prihvatnica',
    opis: 'Nosač s mjestima za prihvatnice uz robota. Svako mjesto ima induktivni senzor koji javlja je li alat na mjestu, pa PLC i robot znaju koji je alat preuzet. Robot ostavlja jedan alat u prazno mjesto i preuzima drugi.',
    podaci: [['Mjesta', String(PRIHVATNICE.length)], ['Standardna stanica', '3 × Zimmer ALSR1-40-B s induktivnom detekcijom']], izvor: 'FESTO-R14, FOTO', pretpostavka: true, napomena: 'Broj mjesta i položaj spremišta u KUKA inačici nisu potvrđeni (na fotografiji: nosač s više prihvatnica na lijevoj strani ćelije).', tema: 'izmjenaAlata' },
  { id: 'tcp', skupina: PR, naziv: 'TCP (vrh alata)',
    opis: 'Točka alata kojom se programira (Tool Center Point). Zadaje se u koordinatnom sustavu FLANGE kao TOOL_DATA[n] = {X, Y, Z, A, B, C}. U gibanjima LIN i CIRC upravljač vodi upravo ovu točku po pravcu ili luku; promjenom alata mijenja se TCP.',
    podaci: [['Zadaje se', 'TOOL_DATA[1…16] u FLANGE-u'], ['Primjer', '$TOOL = TOOL_DATA[1]']], izvor: 'KSS82, LARIS', pretpostavka: true, napomena: 'TCP prihvatnica u modelu je procjena.', tema: 'gibanjaKRL' },

  /* ---------------- Energetski sustav i kabeli */
  { id: 'energetskiSustav', skupina: EN, naziv: 'Unutarnji energetski sustav',
    opis: 'Vodovi koji kroz robota dovode zrak, signale i Ethernet od sučelja A1 do zapešća, pa za alat ne treba vanjski kabel uzduž cijele ruke. ' + (SIXX ? 'Kod sixx: dva zračna voda, signalni vod X41, CAT5 i upravljanje ventilima u zapešću.' : 'Kod 2. generacije postoje izvedbe „CTR AIR” i „AIR CTR GIG” (detalji nisu u javnom izvatku).'),
    podaci: [['Od – do', 'sučelje A1 → sučelje A4'], ['Sadrži', 'zrak AIR1/AIR2, I/O, CAT5, EtherCAT']], izvor: 'SIXX, SPEZ2, PB0001', pretpostavka: !SIXX, napomena: SIXX ? '' : 'Sadržaj energetskog sustava 2. generacije nije u javnom izvatku.', tema: 'razvodEnergije' },
  { id: 'zracniVodovi', skupina: EN, naziv: 'Unutarnji zračni vodovi',
    opis: 'Dva zračna crijeva kroz robota: AIR1 napaja ventile u zapešću, a AIR2 izlazi na sučelju A4. Vođena su kroz osi zglobova da se pri gibanju ne napinju.',
    podaci: [['Vodovi', 'AIR1, AIR2']], izvor: 'SIXX', pretpostavka: true, napomena: 'Vođenje crijeva u modelu je načelno.', tema: 'razvodEnergije' },
  { id: 'sabirnicaEtherCAT', skupina: EN, naziv: 'Signalni i podatkovni vodovi do zapešća',
    opis: 'Integrirana sabirnica EtherCAT i vod CAT5 vode od podnožja do zapešća. Na sabirnicu su spojeni ulazi i izlazi zapešća i ventili, a CAT5 je slobodan za uređaj na alatu.',
    podaci: [['Sabirnica', 'EtherCAT'], ['Ethernet', 'CAT5 (XPN1 → XPN41)']], izvor: 'PB0001, SIXX', pretpostavka: true, napomena: 'Vođenje vodova u modelu je načelno.', tema: 'razvodEnergije' },
  { id: 'vanjskiSnop', skupina: EN, naziv: 'Vanjski vodovi alata (plava spirala)',
    opis: 'Na robotu u stanici plave pneumatske cijevi u plavoj spiralnoj zaštiti vode od ruke preko zapešća do izmjenjivača i prihvatnice. Držači na ruci i zapešću drže snop dovoljno labavim za okretanje osi A4–A6.',
    podaci: [['Boja', 'plava spirala'], ['Od – do', 'ruka → izmjenjivač alata']], izvor: 'FOTO', pretpostavka: true, napomena: 'Vođenje snopa i položaj držača procijenjeni su iz fotografije.', tema: 'razvodEnergije' },
  { id: 'motorniKabel', skupina: EN, naziv: 'Motorni kabel X30 – X20',
    opis: 'Debeli crni kabel od podnožja robota do upravljača. Standardna duljina za sixx je 4 m, a moguće su 1, 7, 15 i 25 m. Pri fiksnom polaganju ne smije se savijati oštrije od polumjera 50 mm.',
    podaci: [['Konektor na robotu', 'Han Yellock 30 (X30)'], ['Duljine', '1, 4 (standard sixx), 7, 15, 25 m'], ['Temperatura', '−10 … +70 °C']], izvor: 'SIXX, SPEZ2, FOTO', pretpostavka: true, napomena: 'Vođenje kabela do upravljača u modelu je načelno (upravljač je vjerojatno u ormaru ispod ćelije).', tema: 'razvodEnergije' },
  { id: 'podatkovniKabel', skupina: EN, naziv: 'Podatkovni kabel X31 – X21',
    opis: 'Tanji crni kabel od podnožja do upravljača; prenosi podatke RDC-a (kutove rezolvera). Najmanji polumjer savijanja pri fiksnom polaganju je 30 mm.',
    podaci: [['Konektor na robotu', 'Han Q12 (X31)'], ['Polumjer savijanja', '30 mm']], izvor: 'SIXX, SPEZ2, FOTO', pretpostavka: true, napomena: 'Vođenje kabela u modelu je načelno.', tema: 'resolver' },
  { id: 'kabelPROFINET', skupina: EN, naziv: 'Zeleni Ethernet kabel',
    opis: 'Na fotografiji zeleni kabel ulazi u sučelje A1 — vjerojatno Ethernet (PROFINET ili CAT5 za XPN1). Robot je s PLC-om stanice povezan PROFINET-om; u standardnoj stanici robot šalje signale kao xReady, xBusy i xRobHome.',
    podaci: [['Boja', 'zelena'], ['Vrsta (pretpostavka)', 'Ethernet / PROFINET']], izvor: 'FOTO, FESTO-SHEME, FESTO-MAN', pretpostavka: true, napomena: 'Namjena zelenog kabela je pretpostavka.', tema: 'razvodEnergije' },

  /* ---------------- Upravljač */
  ...UPR_DIJELOVI,

  /* ---------------- Privjesak smartPAD */
  ...PRIV_DIJELOVI,

  /* ---------------- Pribor */
  { id: 'uredajOtpustanjaKocnica', skupina: PB, naziv: 'Uređaj za otpuštanje kočnica (opcija)',
    opis: 'Kutija za pomicanje robota bez upravljača, npr. kad je netko zaglavljen. Odspoji se X30, uređaj se spoji na A1, preklopkom se odaberu glavne osi ili osi zapešća i pritisne tipka — kočnice odabranih osi se otpuste i osi mogu propasti pod vlastitom težinom. Nakon toga treba ponovno umjeriti sve osi.',
    podaci: [['Spoj', 'umjesto X30, priključak X20 uređaja'], ['Izbor', 'glavne osi / osi zapešća'], ['Nakon uporabe', 'umjeriti sve osi']], izvor: 'SIXX, KSS82', pretpostavka: true, napomena: 'Izgled uređaja u modelu je naš crtež; uređaj nije vidljiv u prostoru.', tema: 'kocnica' },
  { id: 'emd', skupina: PB, naziv: 'EMD — elektronički uređaj za umjeravanje',
    opis: 'Mjerni uređaj koji se spaja na X32 i postavlja na mjerni uložak osi. Kad os prolazi referentnim položajem, pipalo upadne u zarez i uređaj javlja upravljaču točan trenutak — kut u tom trenutku postaje nula osi.',
    podaci: [['Priključak', 'X32 (MicroEMD)']], izvor: 'SIXX, PB0001, KSS82', pretpostavka: true, napomena: 'Način rada pipala (zarez) je opće znanje KSS; izgled uređaja je naš crtež.', tema: 'umjeravanje' }
];

/* ================================================================== pomoćne funkcije */
const _PO_ID = new Map(DIJELOVI.map((d) => [d.id, d]));
export function nadjiDio(id) { return _PO_ID.get(id) || null; }
export function dijeloviSkupine(sk) { return DIJELOVI.filter((d) => d.skupina === sk); }
/** URL-ovi izvora dijela: izvor 'A, B' → [{kratica, url}] */
export function izvoriDijela(d) {
  return String(d && d.izvor || '').split(',').map((s) => s.trim()).filter(Boolean).map((k) => ({ kratica: k, url: IZVORI[k] || '' }));
}
/** stupnjevi ↔ radijani, mm za prikaz */
export const uStupnjeve = (r) => r / RAD;
export const uRadijane = (d) => d * RAD;
export const uMm = mm;

export const TEKST_PRETPOSTAVKE = 'Podaci označeni kao pretpostavka nisu pronađeni u dokumentaciji proizvođača: procijenjeni su iz fotografije robota u ćeliji, preuzeti iz opisa srodne opreme ili izračunati iz objavljenih brojeva. Sukob znači da se izvori ne slažu; koristi se navedena vrijednost. Kad se podatak izmjeri ili potvrdi (npr. s natpisne pločice), ispravlja se na jednom mjestu i oznaka nestaje.';

/** sve pretpostavke i sukobi: [{ sto, vrijednost, napomena, vrsta, id? }] (bez ponavljanja iste napomene) */
export function pretpostavke() {
  const out = [], vidjeno = new Set();
  const dodaj = (o) => { const k = o.vrsta + '|' + o.napomena; if (vidjeno.has(k)) return; vidjeno.add(k); out.push(o); };
  _REG.forEach((r) => dodaj({ ...r }));
  DIJELOVI.forEach((d) => { if (d.pretpostavka && d.napomena) dodaj({ vrsta: 'pretpostavka', sto: d.naziv, vrijednost: '', napomena: d.napomena, id: d.id }); });
  return out;
}
