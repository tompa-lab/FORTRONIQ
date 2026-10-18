/* FORTRONIQ · Pametna tvornica CP Factory (Rel. B) — JEDINI izvor istine za liniju RASS – BRANCH – ASRS32, CP-COBOT-M, Robotino i stanicu za punjenje.
   Model (cpf_model.js), stranice „Upoznavanje sustava” i „Simulator linije” čitaju SAMO odavde (brojevi, nazivi, opisi, inačice, pretpostavke).
   Izvor činjenica: PODACI_CPF.md (istraživanje 18. 10. 2026.) i OPAZANJA_FOTO.md; kratice izvora su u IZVORI.

   KAKO SE MIJENJA PODATAK
   - Potvrđena vrijednost: zamijeni  pp('…', 0.95, '…')  sa  0.95 — pretpostavka nestaje sa stranica.
   - Nova procjena: omotaj broj u pp(sto, vrijednost, napomena, prikaz).
   - Sukob izvora: sukob(sto, vrijednost, napomena, prikaz) — vrijednost se koristi, a sukob se ispisuje.
   - Podatak koji nedostaje (npr. OpNo RASS-a): nedostaje(sto, napomena) vraća null i upisuje se u popis.
   - Inačica opreme: prekidač u KONFIG (npr. branchModul: 'CP-AM-DRILL') — model i tekstovi se prilagode.
   Jedinice: metri, sekunde, radijani (osim gdje piše ° ili mm).
   KS linije (tlocrt): ishodište = prednji lijevi kut RASS-a na podu; x udesno uz liniju (gledano sa strane HMI-ja RASS-a i ASRS-a),
   y prema stražnjoj strani linije, z gore. Scena (three.js, Y gore): x_s = x, y_s = z, z_s = −y (isto kao Robotino, KUKA, UR3e).
   © ForTroniQ d.o.o. */

/* ================================================================== registar pretpostavki, sukoba i podataka koji nedostaju */
const _REG = [];
const zarez = (n) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
function fmt(v) {
  if (typeof v === 'number') return zarez(v);
  if (Array.isArray(v)) return v.map(fmt).join(' / ');
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => k + ' ' + fmt(x)).join(', ');
  return String(v);
}
const mm = (v) => zarez(Math.round(v * 10000) / 10) + ' mm';
/** pretpostavka: vrijednost se koristi, a na stranicama se ispisuje u popisu pretpostavki */
function pp(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'pretpostavka', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** sukob izvora: koristi se navedena vrijednost, druga je u napomeni */
function sukob(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'sukob', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** podatak nije objavljen i nije procijenjen: vraća null, a na stranici se ispisuje „nedostaje” */
function nedostaje(sto, napomena) { _REG.push({ vrsta: 'nedostaje', sto, vrijednost: '[nedostaje]', napomena }); return null; }
const ppAko = (uvjet, sto, v, nap, pr) => (uvjet ? pp(sto, v, nap, pr) : v);

const FOTO = 'procjena iz fotografije laboratorija (mjerilo: širina modula 1200 mm, visina BRANCH-a 980 mm)';
const RASP = 'Raspored prostora je prijedlog iz fotografija; točne mjere prostorije nisu izmjerene.';

/* ================================================================== prekidači inačice */
export const KONFIG = {
  /* aplikacijski modul na prednjoj liniji BRANCH-a: null = nije utvrđen (u modelu generička kutija na portalu) | npr. 'CP-AM-DRILL' */
  branchModul: null,
  branchModulNapomena: 'aplikacijski modul na BRANCH-u nije utvrđen',
  robotRass: 'kuka-kr6',        // 'kuka-kr6' (C11R40, laboratorij) | 'mitsubishi-rv4frl' (C11R15, objavljena inačica)
  robotino: 'cp-mr-c',          // 'cp-mr-c' (prihvat nosača) | 'cp-mr-b' (prihvat kutija)
  cobot: 'ur3e',                // CP-COBOT-M-R23
  robotinoDocking: true,        // BRANCH ima Robotino Docking-Kit (handshake GF35/KG35)
  /* raspored laboratorija u KS linije (m). Moduli: x, y = središte linijskog dijela modula (1200 × 800); kut = zakret oko z u ° (0 = HMI prema −y). */
  raspored: pp('Raspored prostora (tlocrt)', {
    rass: { x: 0.6, y: 0.4, kut: 0 },
    branch: { x: 1.8, y: 0.4, kut: 180 },
    asrs: { x: 3.0, y: 0.4, kut: 0 },
    cobot: { x: -1.7, y: -2.3, kut: 0 },
    mesRacunalo: { x: -1.0, y: 0.35, kut: 0 },
    kompresor: { x: 3.86, y: 0.22 },
    kompresor2: { x: -2.45, y: -2.15 },
    zidDesno: 4.75,               // ravnina zida desno od ASRS-a (x)
    stanica: { y: -0.95 },        // stanica za punjenje leđima uz desni zid, prednjom plohom prema −x
    prolaz: 1.2                   // slobodni prolaz ispred linije (najmanje 1,2 m od zida [MAN-ASRS])
  }, 'Linija RASS – BRANCH – ASRS ravna, moduli se dodiruju [foto zz_lab]; BRANCH okrenut za 180° [foto 20260629_160938]. Položaj CP-COBOT-M, MES računala, kompresora, zida i stanice za punjenje procijenjen je iz fotografija. ' + RASP,
  'RASS x 0–1,2 m, BRANCH 1,2–2,4 m (180°), ASRS 2,4–3,6 m; COBOT oko (−1,7; −2,3); stanica uz zid x = 4,75 m')
};
const KUKA = KONFIG.robotRass === 'kuka-kr6';
const MRC = KONFIG.robotino === 'cp-mr-c';

/* ================================================================== mjere za model (m) */
const H_ORMAR = pp('Visina ormara (postolja) do gornjeg ruba', 0.86, FOTO + ' (~850–900 mm)', '860 mm');
const Z_PALUBA = pp('Visina gornje plohe ormara (paluba na kojoj su trake)', 0.90, FOTO, '900 mm');
const Z_TRAKA = pp('Visina radne ravnine traka (gornja ploha remena)', 0.95, 'Nije objavljena; vrh BRANCH-a je 980 mm [IP-BR], pa je ravnina traka procijenjena na ~950 mm. Prihvat Robotina procijenjen je na 1020 mm — kod predaje treba uskladiti.', '950 mm');
const RAZMAK = pp('Razmak osi dviju glavnih traka', 0.30, FOTO + '; trake su simetrične oko sredine modula.', '300 mm (y = 250 i 550 mm)');

export const MJERE = {
  modul: { sirina: 1.2, dubina: 0.8 },                                   // IP-ASRS, IP-BR, MAN-ASRS (linija 1200 mm)
  ormar: {
    visina: H_ORMAR,
    plinta: pp('Visina kotačića i nožica (donji rub ormara)', 0.11, FOTO + ' (~80–100 mm + rub)', '110 mm'),
    okvir: 0.035,
    ploca: { dubina: pp('Dubina kose upravljačke ploče', 0.20, FOTO, '200 mm'), nagib: pp('Nagib upravljačke ploče', 16, FOTO, '16°') }
  },
  paluba: Z_PALUBA,
  traka: {
    sirina: 0.080,                                                        // MAN-ASRS, FAC-144
    visina: Z_TRAKA,
    razmak: RAZMAK,
    brzinaSpora: pp('Brzina traka – sporo', 0.06, 'Brzina traka nije objavljena (trake imaju odabir sporo/brzo [IP-RASS]).', '0,06 m/s'),
    brzinaBrza: pp('Brzina traka – brzo', 0.18, 'Brzina traka nije objavljena.', '0,18 m/s'),
    povratR: 0.15                                                          // polumjer povrata na krajevima linije = razmak / 2
  },
  rass: {
    visina: 1.80, dubina: 1.60,                                            // IP-RASS
    profil: pp('Presjek Al-profila ćelije RASS-a', 0.04, FOTO, '40 × 40 mm'),
    robot: { x: pp('Položaj robota u ćeliji', 0.62, 'Robot na postolju u sredini robotskog dijela ćelije [foto 20241114_100035].', 'x = 620 mm, y = 1200 mm'), y: 1.20,
      postolje: pp('Visina postolja robota iznad ploče ćelije', 0.04, FOTO + '; uz HOME (A2 −90°, A3 +90°) prirubnica je 890 mm iznad baze, pa baza ne može biti viša od ~0,9 m (ćelija je visoka 1800 mm).', '40 mm (baza robota na 900 mm)'), kut: -Math.PI / 2 },
    ploca: pp('Visina montažne ploče robotskog dijela ćelije', H_ORMAR, 'Ploča s robotom, spremištem alata i trakom za kutije niža je od palube linijskog dijela; procjena iz fotografija 20241114_100035 i 20260629_160938.', '860 mm'),
    bypass: { y: pp('Položaj treće trake (bypass) RASS-a', 0.82, 'Treća traka s radnim položajem robota [IP-RASS]; položaj iza stražnje glavne trake i oblik prijelaza (kosi spojevi) su pojednostavljenje.', 'y = 820 mm, x 380–920 mm'),
      x0: 0.38, x1: 0.92, prijelaz: 0.14, radniX: 0.62 },
    magazin: { x: pp('Spremište alata (položaj)', 0.07, 'Okomiti nosač sa spremištem lijevo od robota [foto 100035]; broj mjesta: plakat u ćeliji TOOL1–TOOL4, Festo za R15 navodi 3 mjesta [IP-RASS].', 'lijevo, x = 70 mm, y = 1000 mm'), y: 1.00,
      z0: 1.04, korak: 0.12, broj: sukob('Broj mjesta u spremištu alata', 4, 'Festo (inačica R15): 3 mjesta Zimmer ALSR1-40-B [IP-RASS]; plakat u laboratorijskoj ćeliji: TOOL1–TOOL4 [foto 100014]. Model prikazuje 4.', '4 (TOOL1–TOOL4)') },
    naprava: { x: pp('Stezna naprava (položaj)', 0.60, 'Al-naprava s klinovima ispred robota [foto 100035].', 'x = 600 mm, y = 960 mm'), y: 0.96, a: 0.20, b: 0.14 },
    kamera: { x: pp('Kamera (položaj)', 0.52, 'Kamera provjerava orijentaciju dijelova [IP-RASS]; položaj u ćeliji KUKA nije vidljiv na snimkama.', 'iznad stezne naprave, z = 1400 mm'), y: 0.96, z: 1.40 },
    osiguraci: { x: pp('Cijevi za osigurače (položaj)', 0.98, 'Tri cijevi s detekcijom [IP-RASS]; položaj je pretpostavka.', 'x = 980 mm, y = 1000 mm'), y: 1.00, broj: 3, visina: 0.26 },
    trakaKutije: { x: pp('Traka za kutije (položaj)', 0.96, 'Ladičasti otvor s dvije trake na stražnjoj strani, desno gledano sprijeda [foto 20260629_160938].', 'x = 960 mm, y 1160–1600 mm'), y0: 1.16, y1: 1.60, z: H_ORMAR },
    otvor: { sirina: 0.36, z0: pp('Stražnji otvor za kutije (visina)', 0.84, FOTO + ' [20260629_160938]', 'z 840–1040 mm'), z1: 1.04 }
  },
  asrs: {
    visina: sukob('Visina ASRS32', 1.80, 'Festo: 1800 mm [IP-ASRS]; na fotografiji stup osi Z viri ~300–400 mm iznad krova kućišta (ukupno ~2,1–2,2 m) [foto zz_lab]. Moguće je da 1800 mm već uključuje stup. Model: kućište do 1800 mm + stup.', '1800 mm (+ stup osi Z)'),
    kucisteOd: pp('Donji rub staklenog kućišta ASRS-a', 0.98, FOTO, '980 mm'),
    stupIznad: pp('Stup osi Z iznad krova', 0.34, FOTO + ' (~300–400 mm)', '340 mm'),
    regal: {
      razina: pp('Raspored mjesta u regalu', 4, '32 = 2 × 16 (sprijeda/straga) [MAN-ASRS], [UPV]; 4 razine × 4 stupca sa svake strane procijenjeno iz Festova videa [foto zz_video_cpf].', '4 razine × 4 stupca, sprijeda i straga'),
      stupaca: 4,
      z0: pp('Visina najniže police', 1.10, FOTO, '1100 mm, korak 145 mm'), dz: 0.145,
      x0: -0.46, dx: 0.21,
      y: pp('Udaljenost regala od sredine modula', 0.29, 'Os Y ima hod 140 mm [MAN-ASRS]; regali su u modelu na ±290 mm od osi portala (uvučeno 150 mm + hod 140 mm).', '±290 mm')
    },
    os: {
      xMin: -0.46, xMax: 0.34,
      zMin: Z_TRAKA + 0.015, zMax: 1.535,     // z = visina donje plohe palete u prihvatnici: na nosaču (traka + 15 mm) … najviša polica
      yOdmak: pp('Uvučeni položaj prihvatnice od osi portala', 0.15, 'Izvedba portala (konzolna os X na okomitom stupu Z desno) procijenjena je iz fotografije i videa; Festo ne objavljuje crtež.', '150 mm'),
      yHod: 0.14,                                                          // DGC-18-140 [MAN-ASRS]
      cKut: Math.PI,                                                       // DRQD-B-20-180, 0°/180° [MAN-ASRS]
      vX: pp('Brzina osi X', 0.35, 'Brzine osi i ciklusna vremena ASRS-a nisu objavljena [MAN-ASRS].', '0,35 m/s'),
      vZ: pp('Brzina osi Z', 0.25, 'Nije objavljena.', '0,25 m/s'),
      tY: pp('Vrijeme hoda osi Y', 0.8, 'Nije objavljeno (pneumatski cilindar).', '0,8 s'),
      tC: pp('Vrijeme zakreta osi C', 1.0, 'Nije objavljeno (pneumatski zakretni pogon).', '1,0 s'),
      tHvat: pp('Vrijeme hvatanja/otpuštanja', 0.4, 'Nije objavljeno.', '0,4 s')
    },
    stoper: { x: pp('Položaj zaustavljača ST1/ST2 u ASRS-u', 0.30, 'Svaka traka ima jedan radni položaj [IP-ASRS]; položaj duž trake je pretpostavka.', 'x = +300 mm od sredine modula') }
  },
  branch: {
    visina: 0.98,                                                          // IP-BR
    krak: {
      izbacaj: pp('Izbačaj kraka grananja ispred ruba BRANCH-a', 0.18, FOTO + ' (~150–250 mm)', '180 mm'),
      x: pp('Položaj kraka duž modula', 0.0, 'Krak je približno na sredini modula [foto crop zz_lab].', 'sredina modula'),
      razmak: pp('Razmak dviju traka kraka', 0.20, FOTO, '200 mm')
    },
    aplikacija: { sirina: 0.25, dubina: 0.20, visina: pp('Portal aplikacijskog modula', 0.60, 'PODACI §10.2: ~250 × 200 × 600 mm iznad trake; ' + FOTO, '250 × 200 × 600 mm'), x: 0.0 },
    predaja: { razmak: pp('Razmak kraja kraka i prihvata Robotina pri predaji', 0.02, 'Pretpostavka za simulator.', '20 mm') }
  },
  cobot: {
    visina: 1.617, sirina: 0.873, dubina: 0.869,                           // IP-COBM (V × Š × D; visina s robotom)
    stol: pp('Visina gornje plohe CP-COBOT-M', 0.93, FOTO + ' [20260629_160911]', '930 mm'),
    robot: { x: pp('Položaj baze UR3e na stolu', -0.22, 'Robot straga lijevo na gornjoj plohi [foto 20260629_160911].', 'lijevo straga'), y: 0.22 },
    kutije: { z: pp('Visina dna kutija u CP-COBOT-u', 0.78, FOTO, '780 mm') }
  },
  nosac: {
    duljina: 0.160, sirina: 0.100, visina: 0.015,                          // FAC-150
    smjer: pp('Orijentacija nosača na traci', 'dulja stranica u smjeru vožnje', 'Festo ne navodi kako nosač 100 × 160 mm leži na stazi 80 mm; u modelu dulja stranica ide u smjeru trake.', 'dulja stranica (160 mm) u smjeru vožnje')
  },
  paleta: { duljina: 0.160, sirina: 0.100, visina: 0.005 },               // FAC-150
  kutija: { duljina: 0.400, sirina: 0.300, visina: pp('Visina transportne kutije', 0.13, 'Nije objavljena; sa snimke ~120–150 mm [foto 100018].', '130 mm') },
  izradak: { duljina: 0.110, sirina: 0.060, visina: 0.010 }               // FAC-150 (poklopac)
};

/* ================================================================== moduli i tipske oznake */
const KOD_C11 = ['C11', 'upravljačka inačica: Siemens S7-1500 (ET200SP CPU 1512SP F-1 PN), motor trake 24 V DC'];
export const MODULI = {
  rass: {
    kljuc: 'rass', oznaka: 'CPF-B-RASS-C11R40', plocica: 'D:CPF-B-RASS-C11R40',
    naziv: 'CP Factory Robot assembly (Rel. B)', nazivHr: 'Robotska montažna stanica',
    kod: [['D:', 'prefiks Festo Didactic na pločici (pretpostavka)'], ['CPF-B', 'CP Factory, Release B (druga generacija; starija nosi prefiks CP-F-)'], ['RASS', 'Robot ASSembly — robotska montaža'], KOD_C11,
      ['R40', KUKA ? 'inačica s robotom KUKA (u laboratoriju KR 6 R900 sixx); značenje broja nije objavljeno' : 'R15 = Mitsubishi RV-4FRL + CR800-D']],
    narudzbeni: sukob('Narudžbeni broj RASS', 'nije objavljen za C11R40', 'Festo objavljuje samo inačicu CPF-B-RASS-C11R15 (Mitsubishi), narudžbeni broj D12006 [IP-RASS]; inačica s robotom KUKA (R40) nije opisana.', 'D12006 (samo za C11R15)'),
    brojNaPlocici: '11955212',
    napajanje: '3AC 400 V ±10 %, 50/60 Hz', snaga: 1000, masa: sukob('Masa RASS', 410, 'Pločica: 410 kg [foto 095626]; priručnici općenito: „stanica može imati do 500 kg” [MAN-RASS]. Koristi se pločica.', '410 kg'),
    tlak: 0.6, datum: '01-2023',
    mjere: { visina: 1.8, sirina: 1.2, dubina: 1.6 },
    funkcija: '6-osni industrijski robot umeće tiskanu pločicu u kućište izratka i do dva osigurača; kamera provjerava orijentaciju dijelova. Dvije glavne trake voze u suprotnim smjerovima, a robot radi na trećoj traci (bypass), pa dugi ciklus montaže ne zaustavlja tok materijala.',
    komponente: [KUKA ? 'Robot KUKA KR 6 R900 sixx (6 kg, doseg 901 mm)' : 'Robot Mitsubishi RV-4FRL', 'Upravljač robota (tip vidi područje KUKA)', 'Siemens ET200SP CPU 1512SP F-1 PN, TP700 Comfort, Scalance XB008',
      'Izmjenjivač alata Zimmer WWR40, spremište alata TOOL1–TOOL4', 'Prihvatnice: vakuumska (PCB), Festo DHPS-16-A (poklopci), DHPS-10-A (osigurači)', 'Kamera s LED reflektorom', '2 × Turck TBEN-S2-2RFID-4DXP, 3 glave',
      '3 trake 24 V DC (dvosmjerne, sporo/brzo)', 'Traka za kutije s pneumatskim indekserom', '3 cijevi za osigurače', 'SICK UE410-4RO i UE410-GU, Flexi Soft'],
    io: 'PLC 33 DI / 17 DO; robot 15 DI / 5 DO (objavljeno za R15)',
    izvor: 'IP-RASS, MAN-RASS, SCH-RASS, foto'
  },
  branch: {
    kljuc: 'branch', oznaka: 'CPF-B-BRANCH-C11', plocica: 'D:CPF-B-BRANCH-C11',
    naziv: 'CP Factory Branch (Rel. B)', nazivHr: 'Modul grananja',
    kod: [['D:', 'prefiks Festo Didactic na pločici (pretpostavka)'], ['CPF-B', 'CP Factory, Release B'], ['BRANCH', 'modul s grananjem (junction) toka materijala'], KOD_C11],
    narudzbeni: 'D12004', brojNaPlocici: '8173366 (= broj priručnika)',
    napajanje: '3AC 400 V ±10 %', snaga: 600, masa: 175, tlak: 0.6, datum: '02-2023',
    mjere: { visina: 0.98, sirina: 1.2, dubina: 0.8 },
    funkcija: 'Automatski grana tok materijala: skretnica šalje nosač s glavne trake u dvotračni krak i natrag. Na prednjoj liniji ima jedno radno mjesto za aplikacijski modul, a s Docking-Kitom služi kao mjesto predaje nosača mobilnom robotu Robotino.',
    komponente: ['Siemens ET200SP CPU 1512SP F-1 PN, TP700 Comfort, Scalance XB008', 'Trake 1–4 (24 V DC, naprijed/natrag, odabir brzine)', 'Skretnica s pneumatskim zakretnim cilindrom (W1_BG30 ravno, W1_BG31 bypass)',
      'Zaustavljači: grananja, trake 1, trake 4', '4 optoelektronička senzora nosača, senzori područja skretnice', 'Robotino Docking-Kit: %Q3.5 signal prema Robotinu, %I3.5 Robotino detektiran', 'Kutni prijenosnik (corner pulley)',
      KONFIG.branchModul ? 'Aplikacijski modul ' + KONFIG.branchModul : 'Aplikacijski modul CP-AM (tip nije utvrđen)'],
    io: '23 DI / 18 DO',
    izvor: 'IP-BR, MAN-BR, MS-BR18, foto'
  },
  asrs: {
    kljuc: 'asrs', oznaka: 'CPF-B-ASRS32-P-C11', plocica: 'D:CPF-B-ASRS32-P-C11',
    naziv: 'CP Factory High bay storage for pallets (Rel. B)', nazivHr: 'Regalno skladište za palete (32 mjesta)',
    kod: [['D:', 'prefiks Festo Didactic na pločici (pretpostavka)'], ['CPF-B', 'CP Factory, Release B'], ['ASRS32', 'Automated Storage and Retrieval System, 32 mjesta'], ['-P', 'pallets — palete (za razliku od -B = boxes, kutije)'], KOD_C11],
    narudzbeni: 'D12002', brojNaPlocici: '8173368 (= broj priručnika)',
    napajanje: '3AC 400 V ±10 %, 50/60 Hz', snaga: sukob('Snaga ASRS', 800, 'Pločica: 800 W [foto 095632]; priručnik: „full load power 2 A” pri 3 × 400 V [MAN-ASRS]. Koristi se pločica.', '800 W'),
    masa: 270, tlak: 0.6, datum: '02-2023',
    mjere: { visina: 1.8, sirina: 1.2, dubina: 0.8 },
    funkcija: 'Kartezijski robot sprema i vadi palete na 32 mjesta (16 sprijeda, 16 straga). Dvije paralelne trake voze u suprotnim smjerovima i svaka ima jedan radni položaj za uzimanje palete s nosača ili odlaganje na nosač. Zalihe vodi MES.',
    komponente: ['Os X: servo Festo EMMS-AS-55-M-LS-TS + regulator CMMP-AS-C2-3A-M3 (PROFINET)', 'Os Z: servo EMMS-AS-55-M-LS-TSB (s kočnicom) + CMMP-AS-C2-3A-M3', 'Os Y: pneumatski cilindar DGC-18-140', 'Os C: zakretni pogon DRQD-B-20-180 (0°/180°)',
      'Prihvatnica HGPT-20-A-B-G1 + svjetlovod „shelf free” (BG53)', '2 trake 24 V DC, 2 pneumatska zaustavljača, 4 induktivna senzora (prisutnost + 4-bitni kod), RFID glava', 'Siemens ET200SP CPU 1512SP F-1 PN, TP700 Comfort, Scalance XB008',
      'SICK UE410-GU4 + UE410-4RO4 (nužni stop), PNOZ X8P i PZE X4P (vrata), PSEN iX1'],
    io: '26 DI / 14 DO',
    izvor: 'IP-ASRS, MAN-ASRS, foto'
  },
  cobot: {
    kljuc: 'cobot', oznaka: 'CP-COBOT-M-R23', plocica: 'D:CP-COBOT-M-R23',
    naziv: 'Station CP Robot Assistant UR3 EM, without Robotino Docking', nazivHr: 'Modul s kolaborativnim robotom UR3e',
    kod: [['D:', 'prefiks Festo Didactic na pločici (pretpostavka)'], ['CP-COBOT', 'CP modul s kolaborativnim robotom'], ['-M', 'bez Robotino dockinga (dijelove ručno dobavlja operater); -D = s dockingom'], ['R23', 'robot UR3e (značenje broja nije objavljeno)']],
    narudzbeni: 'D12014', brojNaPlocici: null,
    napajanje: '1AC 230 V', snaga: pp('Snaga CP-COBOT-M', 920, 'Na pločici slabo čitljivo (~920 W) [foto 095748].', '~920 W'), masa: 125, tlak: 0.6, datum: '12-2022',
    mjere: { visina: 1.617, sirina: 0.873, dubina: 0.869 },
    funkcija: 'Samostalna ćelija za programiranje robota: rukovanje, paletiziranje i djelomična montaža kućišta s do dvije transportne kutije 300 × 400 mm u radnom prostoru. Uz bypass CP Laba ili CP Factoryja uzima palete s transportnog sustava i s PLC-om transporta komunicira preko PROFINET IO.',
    komponente: ['Robot UR3e (3 kg, doseg 500 mm, PL d)', 'Upravljač Universal Robots e-Series', 'UR Teach Pendant na zakretnom nosaču', 'Vakuumska prihvatnica VADMI-45-LS-P, senzor BP22', 'Turck TBEN-S2-2RFID-4DXP, glave TF80/TF81 (BOX 1 / BOX 2)', 'SICK UE410-GU + UE410-4RO, RCD 30 mA, Phoenix TRIO-PS 24 V'],
    izvor: 'IP-COBM, FAC-140, SCH-COB, MAN-COB, foto'
  },
  robotino: {
    kljuc: 'robotino', oznaka: MRC ? 'CP-MR-C' : 'CP-MR-B', plocica: 'D:RO4-BG-KPL 8101344',
    naziv: MRC ? 'Robotino 4 s prihvatom nosača izradaka (CP Factory)' : 'Robotino 4 s prihvatom kutija (CP Factory)', nazivHr: 'Mobilni robot Robotino 4',
    kod: [['RO4-BG-KPL', 'Robotino 4, osnovni komplet (generacija potvrđena pločicom)'], [MRC ? 'CP-MR-C' : 'CP-MR-B', MRC ? 'nadogradnja CP Factory za nosače izradaka (D14016)' : 'nadogradnja za kutije']],
    narudzbeni: MRC ? 'D14016' : nedostaje('Narudžbeni broj CP-MR-B', 'Nije u PODACI.'), brojNaPlocici: '8101344',
    inacica: sukob('Inačica Robotina', MRC ? 'CP-MR-C' : 'CP-MR-B', 'Presuda iz fotografija: CP-MR-C (dvije uzdužne staze i polukružni preusmjerivač na platformi; linija za palete), pouzdanost ~85 %. Provjera: razmak staza ~100–160 mm = C, ~300 mm bez preusmjerivača = B.', 'CP-MR-C (~85 %)'),
    mjere: { promjer: 0.47, visina: 1.23, sirina: 0.52 },
    funkcija: 'Mobilni robot prevozi nosače izradaka između stanica s dockingom. Na BRANCH-u nakon optičkog handshakea trakom uvlači nosač na svoju platformu; vožnje mu dodjeljuje Festo Fleet Manager prema nalozima iz MES4.',
    komponente: ['Robotino 4 (vidi područje Mobilni robot Robotino)', 'Toranj s prihvatom nosača (dvije trake, preusmjerivač)', 'Optički handshake FES 165353 / 165323'],
    izvor: 'IP-MRC, CPMR-C, PODACI_ROBOTINO, foto'
  },
  stanica: {
    kljuc: 'stanica', oznaka: '8134659', plocica: null,
    naziv: 'Charging station Robotino', nazivHr: 'Stanica za punjenje Robotina',
    kod: [['8134659', 'narudžbeni broj (230 V)']],
    narudzbeni: '8134659', brojNaPlocici: null,
    napajanje: '230 V', snaga: 240, masa: 14, tlak: null, datum: null,
    mjere: { visina: 0.152, sirina: 0.535, dubina: 0.212 },
    funkcija: 'Robotino samostalno pristaje na stanicu kad nema naloga ili mu je baterija prazna; pozicije punjenja i parkiranja vodi Fleet Manager.',
    komponente: ['Kontaktna ploča', 'Dva reflektorska markera', 'Osvijetljeni 2D marker', 'Mrežni izvor'],
    izvor: 'FAC-248, PODACI_ROBOTINO, foto'
  }
};

/* ================================================================== materijal (nosači, palete, kutije, izradak) */
export const MATERIJAL = {
  nosac: { naziv: 'Nosač izratka (WC/WT)', narudzbeni: 'D12703', mjere: '100 × 160 × 15 mm', materijal: 'polimer ojačan staklenim vlaknima', rfid: 'RFID tag + 4-bitni kod (BCD, kodira se s 4 vijka)', staza: '80 mm', nosivost: '3 kg', mesPNo: 31, izvor: 'FAC-150, FAC-144, MAN-ASRS' },
  paleta: { naziv: 'Paleta', narudzbeni: 'D12704', mjere: '100 × 160 × 5 mm', materijal: 'aluminij', gnijezdo: 'izmjenjivo gnijezdo za izradak (vijcima)', mesPNo: 25, izvor: 'FAC-150, MAN-ASRS' },
  kutijaPCB: { naziv: 'Kutija za tiskane pločice', mjere: 'KTB 300 × 400 mm', narudzbeni: 'D14020', mesPNo: 27, oznaka: 'BoxID: 1, PNo: 27', sadrzaj: sukob('Kapacitet kutije PCB', '2 × 2 gnijezda', 'Festo (inačica Mitsubishi): „Box for 10 PCBs” [MAN-RASS]; plakat u laboratorijskoj ćeliji: umetak 2 × 2 gnijezda, „PCB only” [foto 100014]. Model prikazuje 4.', '4 gnijezda (2 × 2)'), izvor: 'MAN-RASS, FAC-144, foto' },
  kutijaPoklopaca: { naziv: 'Kutija za poklopce (CP-COBOT)', mjere: 'KTB 300 × 400 mm', narudzbeni: 'D14020', mesPNo: 28, oznaka: 'BoxID 1/2, PNo 28', sadrzaj: '8 prednjih/stražnjih poklopaca ili sklopljenih izradaka', izvor: 'MAN-RASS, FAC-140, foto' },
  izradak: {
    naziv: 'Izradak „pojednostavljeni mobitel”',
    dijelovi: [
      { naziv: 'Prednji poklopac', mjere: '110 × 60 × 10 mm', boje: { crna: 'D12705', siva: 'D12709', plava: 'D12711', crvena: 'D12713' } },
      { naziv: 'Stražnji poklopac', mjere: '110 × 60 × 10 mm', boje: { crna: 'D12706', siva: 'D12710', plava: 'D12712', crvena: 'D12714' } },
      { naziv: 'Tiskana pločica (PCB)', mjere: '100 × 55 mm', narudzbeni: 'D12707' },
      { naziv: 'Osigurač (mikro, set od 10)', narudzbeni: 'D12708' }
    ],
    izvor: 'FAC-150'
  },
  odnos: 'Nosač nosi paletu, paleta nosi jedan izradak; podaci izratka putuju na RFID-u nosača.',
  mesBrojevi: [
    { pno: 31, naziv: 'nosač palete (carrier)' }, { pno: 25, naziv: 'paleta' }, { pno: 27, naziv: 'kutija PCB' }, { pno: 28, naziv: 'kutija poklopaca' }
  ],
  rfid: {
    tip: 'Turck, 13,56 MHz, čitanje/pisanje do 30 mm; u Rel. B čvor TBEN-S2-2RFID-4DXP s dvije glave',
    mesNacin: ['Carrier ID', 'ONo (broj naloga)', 'OPos (pozicija naloga)', 'PNo (broj dijela)', 'Resource (sljedeći resurs)', 'Operation (sljedeća operacija)'],
    defaultNacin: ['State code', 'parametri 1–4'],
    izvor: 'MS-BR18, IP-BR, MAN-ASRS'
  }
};

/* ================================================================== MES4 */
const OP_RASS = nedostaje('OpNo montaže u RASS-u', 'Festo ne objavljuje broj operacije RASS-a; pročitati u MES4 (Operations) u laboratoriju.');
const OP_ROBOTINO = nedostaje('OpNo / nalog transporta Robotinom', 'Transport Robotinom vodi Fleet Manager prema nalozima MES4; brojevi nisu objavljeni.');
const OP_BRANCH = nedostaje('OpNo BRANCH-a', 'BRANCH je „prolazni” resurs; može izvoditi simulirane operacije (zadano 10 s) [MS-BR18]. Broj nije objavljen.');
export const MES = {
  sustav: 'Festo MES4: sučelje u pregledniku; nalozi, planovi rada, resursi, materijal, skladišta, OEE; otvorena baza FestoMES.accdb; licence D15002 (CP Factory), D15005 (CP Lab)',
  operacije: [
    { opNo: 210, naziv: 'Store P1', opis: 'spremi paletu sa zaustavljača 1', resurs: 'asrs', izvor: 'MAN-ASRS' },
    { opNo: 211, naziv: 'Store P2', opis: 'spremi paletu sa zaustavljača 2', resurs: 'asrs', izvor: 'MAN-ASRS' },
    { opNo: 212, naziv: 'Release P1', opis: 'izdaj paletu na nosač na zaustavljaču 1', resurs: 'asrs', izvor: 'MAN-ASRS' },
    { opNo: 213, naziv: 'Release P2', opis: 'izdaj paletu na nosač na zaustavljaču 2', resurs: 'asrs', izvor: 'MAN-ASRS' },
    { opNo: OP_RASS, naziv: 'Montaža PCB i osigurača', opis: 'robot umeće PCB i do 2 osigurača, kamera provjerava', resurs: 'rass', nedostaje: true },
    { opNo: OP_BRANCH, naziv: 'Prolaz / simulirana operacija', opis: 'nosač prolazi ili čeka zadano vrijeme', resurs: 'branch', nedostaje: true },
    { opNo: OP_ROBOTINO, naziv: 'Transport nosača Robotinom', opis: 'preuzimanje na BRANCH-u i vožnja do odredišta', resurs: 'robotino', nedostaje: true }
  ],
  defaultParametri: 'Default način, parametar 1: 1 = spremi sa 1 ili 2; 2 = izdaj na 1 ili 2; 11/12 = spremi/izdaj zaustavljač 1; 21/22 = spremi/izdaj zaustavljač 2; parametar 2 = broj dijela [MAN-ASRS]',
  portovi: { servis: 2000, status: 2001 },
  statusPeriod: 1, statusTimeout: 5,
  status: 'PLC šalje status svake sekunde na port 2001 (ResourceId, PLC tip 2 = Siemens, bitovi Auto/Manual/Busy/Reset/Error/MES mode); bez poruke 5 s MES zatvara vezu',
  servisi: [
    { naziv: 'GetFirstOpForRsc', kod: '100/4' }, { naziv: 'GetOpForONoOPos', kod: '100/6' }, { naziv: 'SetNewOrder', kod: '101/2' },
    { naziv: 'OpStart', kod: '10/10' }, { naziv: 'OpReset', kod: '10/15' },
    { naziv: 'OpEnd', kod: sukob('Kod servisa OpEnd', '10/20', 'Isti dokument navodi i 101/20 [MES-IF].', '10/20 (i 101/20)') }
  ],
  polja: ['ResourceID', 'ONo', 'OPos', 'WPNo', 'StepNo', 'OpNo', 'CarrierID', 'PNo', 'PalletID', 'BufNo', 'BufPos', 'StopperID'],
  resursi: pp('Resource ID-ovi', { asrs: 1, branch: 2, rass: 3, robotino: 10 }, 'Festo ih ne objavljuje; postavljaju se na HMI-ju (System → MES IP and resource settings) [MAN-ASRS]. Uskladiti s MES4 u laboratoriju.', '1 = ASRS, 2 = BRANCH, 3 = RASS, 10 = Robotino'),
  tokNaloga: [
    'Korisnik u pregledniku napravi nalog; MES4 kreira broj naloga (ONo) s pozicijama prema planu rada.',
    'Nosač stane na zaustavljač; PLC čita RFID i pita MES ima li operaciju za ovaj resurs (GetOpForONoOPos).',
    'Obrada počinje samo ako MES tu operaciju dodjeljuje ovom resursu (OpStart).',
    'Na kraju OpEnd upisuje u RFID nosača sljedeći resurs i operaciju.',
    'Zaustavljač se spušta, nosač odlazi prema sljedećem resursu.'
  ],
  izvor: 'MES-IF, MAN-ASRS, FAC-222'
};

/* ================================================================== upravljanje i sigurnost */
export const UPRAVLJANJE = {
  plc: { tip: 'Siemens SIMATIC ET200SP CPU 1512SP F-1 PN', opis: 'fail-safe; svaka stanica ima vlastiti', izvor: 'IP-ASRS, IP-BR, IP-RASS' },
  hmi: { tip: 'Siemens SIMATIC TP700 Comfort (7")', izvor: 'IP-ASRS, IP-BR, IP-RASS' },
  preklopnik: { tip: 'Siemens Scalance XB008 (8 priključaka)', izvor: 'IP-ASRS, IP-BR, IP-RASS' },
  nacini: [
    { naziv: 'Reset', opis: 'stanica odlazi u početno stanje (reference osi, zaustavljači, trake)' },
    { naziv: 'Setup', opis: 'ručno pokretanje pojedinih aktuatora s HMI-ja (npr. ASRS: Z±, X±, gripper in/out, grip/ungrip, turn 0°/180°, test cycle 16-1-16)' },
    { naziv: 'Automatic — Default', opis: 'svaka stanica sama čita RFID i radi po tablici prijelaza (state code + parametri)' },
    { naziv: 'Automatic — MES', opis: 'sve operacije centralno dodjeljuje MES4' }
  ],
  ciklusKraj: '„Cycle end”: dovrši ciklus, tipka svijetli crveno, zaustavljači gore, trake stoje [MAN-ASRS]',
  sigurnosniLanac: {
    opis: 'Nužni stopovi svih stanica povezani su u jedan lanac: linija ima jedan START i jedan END konektor, a između njih MID. Nužni stop gasi sve aktuatore na povezanoj liniji; ponovno pokretanje samo potvrdom (Reset).',
    redoslijed: pp('Redoslijed konektora sigurnosnog lanca', [{ modul: 'rass', konektor: 'START' }, { modul: 'branch', konektor: 'MID' }, { modul: 'asrs', konektor: 'END' }], 'Koja stanica nosi START, a koja END, nije vidljivo na snimkama.', 'RASS START – BRANCH MID – ASRS END'),
    izvor: 'MAN-ASRS, MAN-BR, MAN-RASS'
  },
  vrataRass: { opis: 'Servisna vrata ćelije RASS-a: 2-kanalni sigurnosni prekidači, automatski rad samo sa zatvorenim vratima; nema kutije u ćeliji → safety stop 1', pl: 'PL d', kategorija: 'Cat. 3', izvor: 'MAN-RASS' },
  vrataOrmara: 'Vrata upravljačkog ormara nisu nadzirana [MAN-RASS].',
  releji: { rass: 'SICK UE410-4RO i UE410-GU + Flexi Soft', asrs: 'SICK UE410-GU4 + UE410-4RO4; PNOZ X8P i PZE X4P (vrata); PSEN iX1', cobot: 'SICK UE410-GU + UE410-4RO' },
  spoj: 'Spojna cijev iz izlaza jedne u ulaz druge stanice: napon, komunikacija i zrak (K2-XZ1 ulaz / K2-XZ2 dalje); priključak CEE 16 A',
  zrak: '6 bar, protok ≥ 40 l/min po stanici; u laboratoriju dva prijenosna kompresora',
  opcUa: 'PLC-ovi imaju OPC UA poslužitelj (sekundarni izvor, druga instalacija) [UPV]',
  fleetManager: 'Festo Fleet Manager premošćuje MES4 i Robotine: Robotino ID ↔ MES ID, naučene pozicije ↔ Resource ID i Buffer No, „Reserve AGV”, pozicije parkiranja i punjenja',
  izvor: 'IP-ASRS, IP-BR, IP-RASS, MAN-ASRS, MES-IF, CPMR-C'
};

/* ================================================================== tipični scenarij (simulator) */
const T_ASRS = pp('Trajanje operacije ASRS (izdaj/spremi)', 22, 'Ciklusna vremena ASRS-a nisu objavljena; procjena za simulator.', '~22 s');
const T_RASS = pp('Trajanje montaže u RASS-u', 45, 'Ciklusno vrijeme RASS-a nije objavljeno; procjena za simulator.', '~45 s');
export const SCENARIJ = {
  naziv: 'Mobitel s tiskanom pločicom i osiguračima (linija RASS – BRANCH – ASRS)',
  priprema: [
    'U ASRS-u su palete s prednjim poklopcima (ili prazne palete).',
    'U RASS-u je kutija PCB (PNo 27) umetnuta tipkom „Box change”; cijevi za osigurače su pune.',
    'Sve stanice su u načinu MES i Automatic; nosači kruže po petlji.'
  ],
  koraci: [
    { br: 1, resurs: 'mes', naslov: 'Nalog u MES4', opis: 'Korisnik u pregledniku napravi nalog „mobitel s PCB-om i 2 osigurača”; MES kreira ONo s pozicijama po planu rada.', servis: 'SetNewOrder', trajanje: 2 },
    { br: 2, resurs: 'asrs', naslov: 'Izdavanje palete (ST1)', opis: 'Prazan nosač stane na zaustavljač 1; PLC pita MES; portal izvadi paletu s police i stavi je na nosač. OpEnd upisuje u RFID: sljedeći resurs RASS.', opNo: 212, put: { put: 'petlja', zaustavljac: 'asrsST1' }, trajanje: T_ASRS },
    { br: 3, resurs: 'branch', naslov: 'Prolaz kroz BRANCH', opis: 'Skretnica je u položaju „ravno”; nosač prednjom trakom prolazi prema RASS-u.', put: { put: 'petlja' }, trajanje: null },
    { br: 4, resurs: 'rass', naslov: 'Montaža u RASS-u', opis: 'Nosač preko povrata na kraju linije prelazi na stražnju traku i skreće na treću traku (bypass) do zaustavljača robota. Robot uzme vakuumsku prihvatnicu i stavi PCB iz kutije u kućište, promijeni alat i umetne osigurače; kamera provjerava. OpEnd → sljedeći resurs ASRS.', opNo: OP_RASS, put: { put: 'bypassRASS', zaustavljac: 'rassRadni' }, trajanje: T_RASS, pretpostavka: true },
    { br: 5, resurs: 'branch', naslov: 'Povratak kroz BRANCH', opis: 'Nosač stražnjom trakom prolazi kroz BRANCH prema ASRS-u.', put: { put: 'petlja' }, trajanje: null },
    { br: 6, resurs: 'asrs', naslov: 'Spremanje (ST2)', opis: 'Paleta s gotovim izratkom ide na slobodnu policu; MES ažurira zalihu.', opNo: 211, put: { put: 'petlja', zaustavljac: 'asrsST2' }, trajanje: T_ASRS }
  ],
  robotino: [
    { br: '3a', resurs: 'branch', naslov: 'Skretnica u krak', opis: 'BRANCH otvara skretnicu i šalje nosač trakom 3 u krak.', put: { put: 'krakBRANCH' } },
    { br: '3b', resurs: 'robotino', naslov: 'Handshake i preuzimanje', opis: 'Optički handshake (GF35/KG35), pa Robotino trakom uvlači nosač na svoju platformu.', opNo: OP_ROBOTINO },
    { br: '3c', resurs: 'robotino', naslov: 'Vožnja', opis: 'Fleet Manager prima nalog iz MES4 (izvor → odredište) i vozi Robotina do drugog resursa s dockingom, npr. CP Lab Branch.' },
    { br: '3d', resurs: 'robotino', naslov: 'Povratak', opis: 'Nosač se vraća u krak BRANCH-a (traka 4) i na glavnu liniju.', put: { put: 'krakBRANCH' } },
    { br: '3e', resurs: 'robotino', naslov: 'Punjenje', opis: 'Bez naloga Robotino odlazi na stanicu za punjenje (pozicija iz Fleet Managera).' }
  ],
  nijeMoguce: [
    'Robotino → CP-COBOT-M: inačica M nema docking [FAC-140].',
    'Automatska izmjena kutije PCB u RASS-u Robotinom: traži prihvat kutija (CP-MR-B) [MAN-RASS].'
  ],
  izvor: 'MAN-RASS, MAN-ASRS, IP-BR, CPMR-C'
};

/* ================================================================== teme, skupine, izvori */
export const TEME = {
  tokMaterijala: 'Tok materijala', osnovniModul: 'Osnovni modul', rfid: 'RFID na nosaču', zaustavljac: 'Zaustavljač i radni položaj',
  regalnoSkladiste: 'Regalno skladište', robotskaMontaza: 'Robotska montaža', grananje: 'Grananje', predajaRobotinu: 'Predaja Robotinu',
  mesNalozi: 'MES nalozi', plcHmi: 'PLC i HMI', sigurnosniKrug: 'Sigurnosni krug', nacinRada: 'Načini rada', pneumatika: 'Pneumatika', kobotModul: 'Modul s kobotom'
};
export const SKUPINE = ['Linija', 'RASS', 'BRANCH', 'ASRS32', 'CP-COBOT-M', 'Robotino'];
/* poveznice na druga područja DOS-a (stranice ih koriste za „vidi područje …”) */
export const PODRUCJA = {
  kuka: { naziv: 'Robot KUKA KR 6 R900', putanja: '../robot-kuka-kr6-r900/', model: '../robot-kuka-kr6-r900/kuka_model.js', funkcija: 'napraviKUKA' },
  robotino: { naziv: 'Mobilni robot Robotino', putanja: '../mobilni-robot-robotino/', model: '../mobilni-robot-robotino/robotino_model.js', funkcija: 'napraviRobotino, napraviStanicu' },
  ur3e: { naziv: 'Kobot UR3e', putanja: '../kobot-ur3e/', model: '../kobot-ur3e/ur3e_model.js', funkcija: 'napraviUR3e' }
};

export const IZVORI = {
  'IP-HOME': 'https://ip.festo-didactic.com/InfoPortal/CPFactoryLab/',
  'IP-ST': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/list.php?category=station&lang=en',
  'IP-BASE': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/list.php?category=base&lang=en',
  'IP-LOG': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/list.php?category=logistics&lang=en',
  'IP-ASRS': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CPF-B-ASRS32-P&lang=en',
  'MAN-ASRS': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CPF-B-ASRS32-P/files/manual_en.pdf',
  'IP-RASS': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CPF-B-RASS-C11R15&lang=en',
  'IP-RASS1': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-F-RASS-C11R14&lang=en',
  'MAN-RASS': 'https://ip.festo-didactic.com/InfoPortal/CPFactoryLab/data/CP-F-RASS/files/manual_en.pdf',
  'SCH-RASS': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CPF-B-RASS/files/schematics.pdf',
  'IP-BR': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CPF-B-BRANCH&lang=en',
  'MAN-BR': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CPF-B-BRANCH/files/manual_en.pdf',
  'MS-BR18': 'https://www.manualslib.com/manual/1613025/Festo-Cp-Factory.html',
  'IP-LINB': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CPF-B-LINEAR&lang=en',
  'IP-LIN': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-L-LINEAR-C11M0&lang=en',
  'IP-LBR': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-L-BRANCH-C21&lang=en',
  'IP-COBM': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-COBOT-M-R23&lang=en',
  'IP-COBD': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-COBOT-D-R23&lang=en',
  'MAN-COB': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-COBOT-M/files_R23/manual_en.pdf',
  'SCH-COB': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-COBOT-M/files_R23/schematics.pdf',
  'IP-MRC': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-MR-C&lang=en',
  'IP-MRB': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/hardware/details.php?model=CP-MR-B&lang=en',
  'CPMR-C': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-MR/files_C/manual_en.pdf',
  'CPMR-B': 'https://ip.festo-didactic.com/Infoportal/CPFactoryLab/data/CP-MR/files_B/manual_en.pdf',
  'FAC-138': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/138-139/',
  'FAC-140': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/140-141/',
  'FAC-142': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/142-143/',
  'FAC-144': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/144-145/',
  'FAC-150': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/150-151/',
  'FAC-222': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/222-223/',
  'FAC-248': 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/248-249/',
  'MES-IF': 'https://ftp.festo.com/public/DIDACTIC/MES4/Tools/MES4_Interface_en_v1.07.pdf',
  'UPV': 'https://rob4ind.upv.es/laboratory-copy',
  'KUKA-R': 'https://www.robots.com/industrial-robots/kuka-kr-6-r900-sixx',
  'PODACI_ROBOTINO': '',
  'foto': ''          /* fotografije laboratorija — služe samo kao predložak, ne objavljuju se */
};

/* ================================================================== dijelovi (redoslijed = redoslijed u Upoznavanju) */
const LN = 'Linija', RS = 'RASS', BR = 'BRANCH', AS = 'ASRS32', CB = 'CP-COBOT-M', RB = 'Robotino';
const IMEM = { rass: 'RASS', branch: 'BRANCH', asrs: 'ASRS32' };
const SKM = { rass: RS, branch: BR, asrs: AS };
const IP_M = { rass: 'IP-RASS', branch: 'IP-BR', asrs: 'IP-ASRS' };
const MAN_M = { rass: 'MAN-RASS', branch: 'MAN-BR', asrs: 'MAN-ASRS' };

/* dijelovi zajednički svakom modulu linije (osnovni modul Rel. B) */
function zajednicki(k) {
  const S = SKM[k], I = IMEM[k], M0 = MODULI[k], ip = IP_M[k], man = MAN_M[k];
  const okrenut = KONFIG.raspored.branch.kut === 180 && k === 'branch';
  const posebno = {
    rass: { trake: 'Tri trake: dvije glavne voze u suprotnim smjerovima, treća (bypass) vodi nosač do radnog položaja robota.',
      zaust: 'Glavni zaustavljač je na trećoj traci (bypass), na radnom položaju robota; dok robot montira, nosači na glavnim trakama prolaze.', rfid: 'Dva čvora Turck TBEN-S2-2RFID-4DXP s ukupno tri glave.',
      sen: 'Uz senzore prisutnosti nosača RASS ima tri svjetlosne barijere za orijentaciju izratka.', ploca: 'Na ploči su glavna sklopka, polja za natpise, HMI i gljiva nužnog stopa.' },
    branch: { trake: 'Četiri trake: trake 1 i 2 su glavne, a 3 i 4 čine krak grananja (van i natrag).',
      zaust: 'Ima tri zaustavljača: grananja (ispred skretnice), trake 1 i trake 4 — na traci 4 nosač čeka predaju Robotinu.', rfid: 'Čvor Turck TBEN-S2-2RFID-4DXP s glavama na zaustavljačima.',
      sen: 'Četiri optoelektronička senzora prate nosače, a senzori u području skretnice (BG42/BG45) javljaju da je područje slobodno prije zakretanja.', ploca: okrenut ? 'Ploča BRANCH-a je zbog zakreta modula za 180° na stražnjoj strani linije.' : 'Ploča je na operaterskoj strani modula.' },
    asrs: { trake: 'Dvije trake u suprotnim smjerovima; ulaz BG26/BG36, izlaz BG27/BG37.',
      zaust: 'Dva pneumatska zaustavljača (G1_MB20, senzor spuštenog položaja G1_BG20): ST1 je položaj vađenja (izdaj paletu), ST2 položaj spremanja.', rfid: 'Jedna RFID glava po zaustavljaču čita nosač prije operacije.',
      sen: 'Četiri induktivna senzora po zaustavljaču očitavaju prisutnost nosača i njegov 4-bitni kod (vijci na dnu nosača).', ploca: 'Na ploči su glavna sklopka, manometar, polja za natpise, HMI te gljiva i tipke.' }
  }[k];
  return [
    { id: k + 'Ormar', skupina: S, naziv: 'Postolje (ormar) ' + I,
      opis: 'Čelični ormar na kotačićima s podesivim nožicama nosi transportni sustav i u sebi ima električni razvod, PLC, pneumatiku i priključke. Moduli Rel. B imaju istu osnovicu širine 1200 mm, pa se linija slaže dodavanjem modula, a spojnim kabelom i cijevi prenose se napon, komunikacija i zrak.' + (k === 'rass' ? ' RASS ima dvostruku dubinu (1600 mm): iza linijskog dijela je robotska ćelija.' : ''),
      podaci: [['Gabarit V × Š × D', mm(M0.mjere.visina) + ' × ' + mm(M0.mjere.sirina) + ' × ' + mm(M0.mjere.dubina)], ['Masa (pločica)', M0.masa + ' kg'], ['Napajanje', M0.napajanje], ['Snaga (pločica)', M0.snaga + ' W'], ['Zrak', '0,6 MPa (6 bar), ≥ 40 l/min'], ['Visina ormara (procjena)', mm(H_ORMAR)]],
      izvor: ip + ', ' + man + ', foto', pretpostavka: true, napomena: 'Visina ormara i izgled okvira procijenjeni su iz fotografije.', tema: 'osnovniModul' },
    { id: k + 'VrataOrmara', skupina: S, naziv: 'Vrata ormara s upozorenjima',
      opis: 'Dvokrilna vrata od zatamnjenog prozirnog polimera s crnim šarkama omogućuju pogled na opremu u ormaru bez otvaranja. Žute naljepnice upozoravaju na opasan napon. Vrata ormara nisu nadzirana sigurnosnim prekidačem — otvaraju se samo kad je stanica isključena.',
      podaci: [['Krila', '2'], ['Nadzor', 'nema (vrata ormara)']], izvor: 'MAN-RASS, foto', tema: 'sigurnosniKrug' },
    { id: k + 'Ploca', skupina: S, naziv: 'Upravljačka ploča ' + I,
      opis: 'Kosa ploča uz rub ormara skuplja sve elemente za operatera. ' + posebno.ploca + ' Tipkama i HMI-jem bira se način rada (Reset, Setup, Automatic) i potvrđuje ponovno pokretanje nakon nužnog stopa.',
      podaci: [['Položaj', okrenut ? 'stražnja strana linije (modul okrenut 180°)' : 'prednja strana linije']], izvor: ip + ', foto', pretpostavka: true, napomena: 'Raspored elemenata na ploči je procjena iz fotografije.', tema: 'nacinRada' },
    { id: k + 'Hmi', skupina: S, naziv: 'Zaslon osjetljiv na dodir (TP700 Comfort)',
      opis: 'Siemens SIMATIC TP700 Comfort (7") prikazuje stanje stanice, poruke o greškama i ručne naredbe u načinu Setup. U izborniku System upisuju se IP adresa MES-a i Resource ID stanice.' + (k === 'asrs' ? ' Na ASRS-u prikazuje i zauzetost polica „Shelf 1–16” i „Shelf 17–32”.' : ''),
      podaci: [['Tip', 'Siemens TP700 Comfort, 7"'], ['MES postavke', 'System → MES IP and resource settings']], izvor: ip + ', MAN-ASRS', tema: 'plcHmi' },
    { id: k + 'NuzniStop', skupina: S, naziv: 'Tipkalo nužnog stopa',
      opis: 'Crvena gljiva na žutoj podlozi dio je zajedničkog sigurnosnog lanca linije: pritisak na bilo kojoj stanici gasi sve aktuatore na povezanoj liniji. Nakon otpuštanja gljive stanica se ne pokreće sama — potrebna je potvrda tipkom Reset.',
      podaci: [['Lanac', 'START – MID – END'], ['Ponovno pokretanje', 'samo potvrdom (Reset)']], izvor: man + ', foto', tema: 'sigurnosniKrug' },
    { id: k + 'GlavnaSklopka', skupina: S, naziv: 'Glavna sklopka',
      opis: 'Crna okretna sklopka uključuje i isključuje cijelu stanicu (3AC 400 V). Kad je isključena, stanica je bez napona, a lanac nužnog stopa linije je prekinut.',
      podaci: [['Napajanje', M0.napajanje], ['Priključak', 'CEE 16 A']], izvor: 'IP-ASRS, MAN-ASRS, foto', tema: 'osnovniModul' },
    { id: k + 'Plc', skupina: S, naziv: 'PLC (ET200SP CPU 1512SP F-1 PN)',
      opis: 'Vlastiti sigurnosni (fail-safe) PLC stanice upravlja trakama, zaustavljačima, skretnicama i osima te razmjenjuje podatke s MES4 preko TCP/IP-a: status svake sekunde na port 2001, servisni pozivi na port 2000. U automatskom radu bez MES-a radi po tablici prijelaza iz RFID-a nosača.',
      podaci: [['Tip', UPRAVLJANJE.plc.tip], ['I/O', M0.io], ['MES', 'port 2000 (servisi), 2001 (status)']], izvor: ip + ', MES-IF', pretpostavka: true, napomena: 'Smještaj PLC-a u ormaru je načelni prikaz.', tema: 'plcHmi' },
    { id: k + 'Preklopnik', skupina: S, naziv: 'Mrežni preklopnik (Scalance XB008)',
      opis: 'Neupravljivi Ethernet preklopnik s osam priključaka spaja PLC, HMI, RFID čvorove i (na RASS-u) upravljač robota u mrežu stanice i dalje prema MES računalu.',
      podaci: [['Tip', UPRAVLJANJE.preklopnik.tip]], izvor: ip, pretpostavka: true, napomena: 'Smještaj u ormaru je načelni prikaz.', tema: 'mesNalozi' },
    { id: k + 'Ventili', skupina: S, naziv: 'Pneumatika: priprema zraka i ventili',
      opis: 'Komprimirani zrak (6 bar) ulazi kroz spojnu cijev i pripremnu jedinicu, a elektromagnetski ventili upravljaju zaustavljačima' + (k === 'branch' ? ' i zakretnim cilindrom skretnice' : k === 'asrs' ? ', osima Y i C te prihvatnicom portala' : ', indekserom trake za kutije, steznom napravom i vakuumom prihvatnice') + '. Bez tlaka zaustavljači ostaju u sigurnom položaju.',
      podaci: [['Tlak', '0,6 MPa'], ['Protok', '≥ 40 l/min']], izvor: man, pretpostavka: true, napomena: 'Tip i smještaj ventilskog otoka nisu objavljeni; prikaz je načelni.', tema: 'pneumatika' },
    { id: k + 'Trake', skupina: S, naziv: 'Transportne trake ' + I,
      opis: 'Trake s remenom širine 80 mm pokreću motori 24 V DC u oba smjera, s odabirom spore i brze vožnje. ' + posebno.trake + ' Bočne vodilice drže nosač na stazi.',
      podaci: [['Širina staze', '80 mm'], ['Pogon', '24 V DC, dvosmjerno, sporo/brzo'], ['Ravnina traka (procjena)', mm(Z_TRAKA)]], izvor: ip + ', ' + man, pretpostavka: true, napomena: 'Visina ravnine traka i razmak traka procijenjeni su iz fotografije.', tema: 'tokMaterijala' },
    { id: k + 'Zaustavljac', skupina: S, naziv: 'Zaustavljač' + (k === 'rass' ? ' na radnom položaju' : 'i'),
      opis: 'Pneumatski klin podiže se ispred nosača i zadržava ga na radnom položaju dok se čita RFID i izvodi operacija. ' + posebno.zaust + ' Kad je operacija gotova i upisan je sljedeći korak, klin se spušta.',
      podaci: [['Pogon', 'pneumatski'], ['Senzor', 'spušteni položaj (npr. G1_BG20)']], izvor: ip + ', ' + man, tema: 'zaustavljac' },
    { id: k + 'Rfid', skupina: S, naziv: 'RFID glava za čitanje/pisanje',
      opis: 'Glava ispod staze čita i upisuje podatke na RFID tag nosača (13,56 MHz, do 30 mm): u načinu MES broj naloga, poziciju, broj dijela te sljedeći resurs i operaciju. ' + posebno.rfid,
      podaci: [['Frekvencija', '13,56 MHz'], ['Domet', 'do 30 mm'], ['Čvor', 'Turck TBEN-S2-2RFID-4DXP']], izvor: 'MS-BR18, ' + ip + ', MAN-ASRS', tema: 'rfid' },
    { id: k + 'Senzori', skupina: S, naziv: 'Senzori nosača',
      opis: 'Senzori uz stazu javljaju PLC-u da je nosač stigao na zaustavljač ili napustio područje. ' + posebno.sen,
      podaci: [['Vrsta', k === 'asrs' ? 'induktivni (prisutnost + 4-bitni kod)' : 'optoelektronički / induktivni']], izvor: ip + ', ' + man, pretpostavka: true, napomena: 'Položaji senzora uz stazu su načelni.', tema: 'zaustavljac' }
  ];
}

export const DIJELOVI = [
  /* ---------------- Linija */
  { id: 'linijaTok', skupina: LN, naziv: 'Petlja traka (tok nosača)',
    opis: 'Tri modula dodiruju se i čine zatvorenu petlju: prednja traka vozi nosače od ASRS-a prema RASS-u, a na krajevima linije nosač prelazi na stražnju traku i vraća se. Nosači kruže dok im zaustavljač na nekoj stanici ne zadrži put; koja stanica radi što, piše na RFID-u nosača.',
    podaci: [['Duljina linije', '3600 mm (3 × 1200)'], ['Trake', '2 glavne, u suprotnim smjerovima'], ['Smjer (model)', 'prednja: ASRS → RASS, stražnja: RASS → ASRS']],
    izvor: 'MAN-ASRS, MAN-BR, IP-RASS', pretpostavka: true, napomena: 'Smjer vožnje traka u laboratoriju nije utvrđen; u modelu prednja traka vozi prema RASS-u.', tema: 'tokMaterijala' },
  { id: 'nosac', skupina: LN, naziv: 'Nosač izratka (WC)',
    opis: 'Nosač od polimera ojačanog staklenim vlaknima vozi po stazi širine 80 mm i nosi paletu s izratkom. U njemu je RFID tag s podacima naloga, a 4-bitni kod (četiri vijka na dnu) daje broj nosača i bez RFID-a. MES ga vodi kao dio broj 31.',
    podaci: [['Mjere', MATERIJAL.nosac.mjere], ['Narudžbeni br.', 'D12703'], ['Nosivost', '3 kg'], ['MES PNo', '31']], izvor: 'FAC-150, FAC-144, MAN-ASRS', tema: 'tokMaterijala' },
  { id: 'rfidOznaka', skupina: LN, naziv: 'RFID tag i 4-bitni kod nosača',
    opis: 'Tag u nosaču nosi podatke izratka: u načinu MES Carrier ID, ONo, OPos, PNo te sljedeći resurs i operaciju; u načinu Default kod stanja i četiri parametra. Svaka stanica čita tag na zaustavljaču, a na kraju operacije upisuje sljedeći korak, pa nalog „putuje” s nosačem.',
    podaci: [['MES način', MATERIJAL.rfid.mesNacin.join(', ')], ['Default način', 'State code + parametri 1–4'], ['4-bitni kod', 'BCD, 4 vijka']], izvor: 'MAN-ASRS, FAC-150', tema: 'rfid' },
  { id: 'paleta', skupina: LN, naziv: 'Paleta',
    opis: 'Aluminijska ploča s izmjenjivim gnijezdom za izradak. Portal ASRS-a prenosi samo paletu — nosač ostaje na traci. Na policama skladišta stoje palete, prazne ili s izradcima; MES ih vodi kao dio broj 25.',
    podaci: [['Mjere', MATERIJAL.paleta.mjere], ['Narudžbeni br.', 'D12704'], ['MES PNo', '25']], izvor: 'FAC-150, MAN-ASRS', tema: 'regalnoSkladiste' },
  { id: 'izradak', skupina: LN, naziv: 'Izradak „pojednostavljeni mobitel”',
    opis: 'Kućište od prednjeg i stražnjeg poklopca 110 × 60 mm, s tiskanom pločicom 100 × 55 mm i do dva mikro osigurača. Poklopci dolaze u četiri boje. RASS u kućište umeće pločicu i osigurače.',
    podaci: [['Poklopac', '110 × 60 × 10 mm (crni, sivi, plavi, crveni)'], ['PCB', '100 × 55 mm (D12707)'], ['Osigurači', 'set od 10 (D12708)']], izvor: 'FAC-150, MAN-RASS', tema: 'robotskaMontaza' },
  { id: 'kutijaKLT', skupina: LN, naziv: 'Transportna kutija (dobava dijelova)',
    opis: 'Tirkizna kutija 300 × 400 mm s RFID tagom i univerzalnim umetkom služi samo za dobavu dijelova: u RASS-u nosi tiskane pločice (PNo 27), u CP-COBOT-u poklopce (PNo 28). Glavni tok materijala ove linije su nosači s paletama, ne kutije.',
    podaci: [['Mjere', 'KTB 300 × 400 mm'], ['Visina (procjena)', mm(MJERE.kutija.visina)], ['Narudžbeni br.', 'D14020'], ['MES PNo', '27 (PCB), 28 (poklopci)']], izvor: 'FAC-144, FAC-140, MAN-RASS, foto', pretpostavka: true, napomena: 'Visina kutije nije objavljena.', tema: 'tokMaterijala' },
  { id: 'krajLinijeLijevo', skupina: LN, naziv: 'Povrat nosača na kraju linije (RASS)',
    opis: 'Na slobodnom kraju linije nosač s prednje trake prelazi na stražnju i vraća se, pa traka čini zatvorenu petlju. Isti princip ima kutni prijenosnik modula kad radi samostalno.',
    podaci: [['Polumjer povrata (model)', mm(MJERE.traka.povratR)]], izvor: 'MAN-BR, FAC-142', pretpostavka: true, napomena: 'Točna izvedba povrata na krajevima linije (kutni prijenosnik ili pasivni povrat) nije utvrđena.', tema: 'tokMaterijala' },
  { id: 'krajLinijeDesno', skupina: LN, naziv: 'Povrat nosača na kraju linije (ASRS)',
    opis: 'Na desnom kraju linije nosač sa stražnje trake prelazi na prednju i kreće natrag prema RASS-u. Odmah iza povrata je zaustavljač ST1 skladišta, gdje prazni nosači čekaju paletu.',
    podaci: [['Polumjer povrata (model)', mm(MJERE.traka.povratR)]], izvor: 'MAN-BR, FAC-142', pretpostavka: true, napomena: 'Točna izvedba povrata na krajevima linije nije utvrđena.', tema: 'tokMaterijala' },
  { id: 'spojnaCijev', skupina: LN, naziv: 'Spoj između stanica',
    opis: 'Unaprijed konfigurirani modularni priključak spaja izlaz jedne stanice s ulazom sljedeće: kroz isti snop idu napon, komunikacija, lanac nužnog stopa i zrak. Zato se stanice mogu brzo premjestiti i ponovno spojiti u drugi raspored.',
    podaci: [['Priključci', 'K2-XZ1 ulaz / K2-XZ2 izlaz'], ['Napajanje', 'CEE 16 A']], izvor: 'IP-ASRS, MAN-ASRS', pretpostavka: true, napomena: 'Položaj spoja između ormara je načelni prikaz.', tema: 'osnovniModul' },
  { id: 'sigurnosniLanac', skupina: LN, naziv: 'Lanac nužnog stopa (START – MID – END)',
    opis: UPRAVLJANJE.sigurnosniLanac.opis + ' Jedna stanica nosi konektor START, posljednja END, a sve između MID.',
    podaci: [['Redoslijed (pretpostavka)', 'RASS START – BRANCH MID – ASRS END'], ['Ponovno pokretanje', 'Reset']], izvor: 'MAN-ASRS, MAN-BR, MAN-RASS', pretpostavka: true, napomena: 'Koja stanica nosi START, a koja END, nije vidljivo na snimkama.', tema: 'sigurnosniKrug' },
  { id: 'mesRacunalo', skupina: LN, naziv: 'MES4 računalo',
    opis: 'Računalo s Festo MES4 vodi naloge, planove rada, resurse, zalihe skladišta i OEE; korisnik mu pristupa preglednikom. Sa svakim PLC-om razgovara preko TCP/IP-a (port 2000 servisi, 2001 status svake sekunde); ako status izostane 5 s, MES zatvara vezu sa stanicom.',
    podaci: [['Licenca', 'D15002 (CP Factory)'], ['Baza', 'FestoMES.accdb (otvorena SQL baza)'], ['Portovi', '2000 / 2001']], izvor: 'FAC-222, MES-IF, UPV', pretpostavka: true, napomena: 'Položaj računala u prostoru je procjena iz fotografije.', tema: 'mesNalozi' },
  { id: 'fleetManager', skupina: LN, naziv: 'Festo Fleet Manager',
    opis: 'Program na MES računalu premošćuje MES4 i Robotine: povezuje ID robota s MES ID-om, naučene pozicije s Resource ID-om i brojem spremnika, rezervira vozilo i šalje ga na parkiranje ili punjenje. Iz naloga MES4 (izvor → odredište) sastavlja vožnju.',
    podaci: [['Veze', 'Robotino ID ↔ MES ID, pozicije ↔ Resource ID / Buffer No']], izvor: 'CPMR-C, PODACI_ROBOTINO', pretpostavka: true, napomena: 'Da Fleet Manager radi na istom računalu kao MES4, pretpostavka je.', tema: 'mesNalozi' },
  { id: 'kompresor', skupina: LN, naziv: 'Prijenosni kompresor',
    opis: 'Tihi klipni kompresor sa spremnikom daje zrak stanicama (6 bar, ≥ 40 l/min po stanici). U laboratoriju su dva: jedan uz ASRS, drugi uz CP Lab stanice i CP-COBOT.',
    podaci: [['Tlak na stanici', '0,6 MPa'], ['Broj u prostoru', '2']], izvor: 'MAN-ASRS, foto', pretpostavka: true, napomena: 'Tip i podaci kompresora nisu očitani; oblik je pojednostavljen.', tema: 'pneumatika' },

  /* ---------------- RASS */
  ...zajednicki('rass'),
  { id: 'rassCelija', skupina: RS, naziv: 'Zaštitna ćelija RASS-a',
    opis: 'Okvir od aluminijskih profila sa staklenim stijenkama zatvara cijeli radni prostor robota i linijski dio stanice do visine 1800 mm. Robot se smije gibati u automatskom radu samo dok je ćelija zatvorena; svjetlosna zavjesa se u dokumentaciji ne spominje.',
    podaci: [['Visina', '1800 mm'], ['Tlocrt', '1200 × 1600 mm'], ['Profil (procjena)', '40 × 40 mm']], izvor: 'IP-RASS, MAN-RASS, SCH-RASS, foto', pretpostavka: true, napomena: 'Podjela stijenki i presjek profila procijenjeni su iz fotografije.', tema: 'sigurnosniKrug' },
  { id: 'rassVrata', skupina: RS, naziv: 'Servisna vrata ćelije',
    opis: 'Dvokrilna staklena vrata sprijeda i straga nadziru dvokanalni sigurnosni prekidači. Otvaranje vrata u automatskom radu zaustavlja robot; automatski rad moguć je samo sa zatvorenim vratima.',
    podaci: [['Razina', 'PL d, Cat. 3'], ['Prekidači', '2-kanalni']], izvor: 'MAN-RASS, foto', tema: 'sigurnosniKrug' },
  { id: 'rassPostoljeRobota', skupina: RS, naziv: 'Postolje robota',
    opis: 'Čelično postolje na montažnoj ploči ćelije nosi robota u sredini robotskog dijela, tako da doseže spremište alata, kutiju PCB, cijevi osigurača, steznu napravu i radni položaj na trećoj traci.',
    podaci: [['Visina iznad palube (procjena)', mm(MJERE.rass.robot.postolje)]], izvor: 'foto', pretpostavka: true, napomena: 'Mjere postolja procijenjene su iz fotografije 20241114_100035.', tema: 'robotskaMontaza' },
  { id: 'robotKUKA', skupina: RS, naziv: KUKA ? 'Robot KUKA KR 6 R900 sixx' : 'Robot Mitsubishi RV-4FRL',
    opis: KUKA ? '6-osni robot s nosivošću 6 kg i dosegom 901 mm montira izradak: vakuumskom prihvatnicom prenosi PCB, a mehaničkim prihvatnicama osigurače. Detaljan opis, kinematika i programiranje su u području Robot KUKA KR 6 R900.'
      : '6-osni robot Mitsubishi RV-4FRL s upravljačem CR800-D (objavljena inačica C11R15).',
    podaci: KUKA ? [['Nosivost', '6 kg'], ['Doseg', '901 mm'], ['Ponovljivost', '0,03 mm'], ['Masa', '52 kg'], ['Područje', PODRUCJA.kuka.putanja]] : [['Robot', 'RV-4FRL'], ['Upravljač', 'CR800-D']],
    izvor: KUKA ? 'KUKA-R, foto' : 'IP-RASS', pretpostavka: KUKA, napomena: KUKA ? 'Oznaka R40 = KUKA nije objavljena; model robota potvrđen fotografijom i usmeno.' : '', tema: 'robotskaMontaza' },
  { id: 'rassUpravljacRobota', skupina: RS, naziv: 'Upravljač robota',
    opis: 'Upravljač robota je u ormaru ispod ćelije i s PLC-om stanice razmjenjuje digitalne signale (dio uhvaćen, orijentacija, osigurači u cijevima, alati u spremištu, stanje prihvatnice). Tip upravljača i privjesak opisani su u području KUKA.',
    podaci: [['Signali robota (R15)', '15 DI / 5 DO'], ['Tip', KUKA ? 'vidi područje KUKA' : 'CR800-D']], izvor: 'IP-RASS, KUKA-R', pretpostavka: true, napomena: 'Tip upravljača uz KUKA robot nije potvrđen okom (PODACI: KR C4 compact; područje KUKA može odabrati drugi); smještaj u ormaru je pretpostavka.', tema: 'plcHmi' },
  { id: 'rassMagazin', skupina: RS, naziv: 'Spremište alata (TOOL1–TOOL4)',
    opis: 'Okomiti nosač lijevo od robota drži izmjenjive prihvatnice u držačima s induktivnim senzorima. Robot sam odlaže jednu i uzima drugu prihvatnicu, pa u istom ciklusu montira PCB i osigurače.',
    podaci: [['Mjesta', '4 (plakat TOOL1–TOOL4); Festo R15: 3 × Zimmer ALSR1-40-B'], ['Senzori', 'induktivni, po mjestu']], izvor: 'IP-RASS, foto', pretpostavka: true, napomena: 'Broj mjesta: sukob 3 / 4; raspored držača po visini procijenjen je iz fotografije.', tema: 'robotskaMontaza' },
  { id: 'rassIzmjenjivac', skupina: RS, naziv: 'Izmjenjivač alata',
    opis: 'Zimmer WWR40: fiksni dio na prirubnici robota i slobodni dio na svakoj prihvatnici spajaju se pneumatski, uz električni prijenos signala i dva zračna priključka. Induktivni senzor potvrđuje da je alat zabravljen.',
    podaci: [['Fiksni / slobodni', 'WWR40F-B / WWR40L-B'], ['El. prijenos', 'WER02FF04 / WER02LF04'], ['Detekcija', 'NJR04-E2SK']], izvor: 'IP-RASS', pretpostavka: true, napomena: 'Podaci su za objavljenu inačicu R15; u modelu je prikazan slobodni dio na prihvatnicama.', tema: 'robotskaMontaza' },
  { id: 'rassPrihvatnice', skupina: RS, naziv: 'Prihvatnice',
    opis: 'Za tiskanu pločicu robot koristi vakuumsku prihvatnicu s Venturijevom mlaznicom, za poklopce paralelnu prihvatnicu DHPS-16, a za osigurače manju DHPS-10. Svaka ima vlastitu ploču izmjenjivača.',
    podaci: [['PCB', 'vakuum, Festo VN-05-H-T2-PQ1-VQ1-RO1'], ['Poklopci', 'Festo DHPS-16-A'], ['Osigurači', 'Festo DHPS-10-A']], izvor: 'IP-RASS', pretpostavka: true, napomena: 'Podaci za inačicu R15; oblik prihvatnica u modelu je pojednostavljen (područje KUKA ima vlastite modele TOOL1–TOOL4).', tema: 'robotskaMontaza' },
  { id: 'rassBypass', skupina: RS, naziv: 'Treća traka (bypass) s radnim položajem',
    opis: 'Nosač kojem MES dodijeli montažu skreće sa stražnje glavne trake na treću traku i staje na radnom položaju robota. Ostali nosači nastavljaju glavnom trakom, pa dugi ciklus montaže ne blokira liniju.',
    podaci: [['Pogon', '24 V DC, dvosmjerno'], ['Položaj (model)', 'y = ' + mm(MJERE.rass.bypass.y)]], izvor: 'IP-RASS, FAC-140', pretpostavka: true, napomena: 'Oblik prijelaza s glavne trake (kosi spojevi) je pojednostavljenje.', tema: 'zaustavljac' },
  { id: 'rassNaprava', skupina: RS, naziv: 'Stezna naprava',
    opis: 'Al-naprava s klinovima ispred robota drži kućište dok robot umeće dijelove; pneumatski se steže (izlaz robota „fixture”). Robot u nju može odložiti kućište i s njim raditi neovisno o nosaču.',
    podaci: [['Pogon', 'pneumatski (izlaz robota)']], izvor: 'IP-RASS, foto', pretpostavka: true, napomena: 'Uloga naprave u ciklusu inačice KUKA je pretpostavka prema I/O popisu R15.', tema: 'robotskaMontaza' },
  { id: 'rassKamera', skupina: RS, naziv: 'Kamera s LED reflektorom',
    opis: 'Kamera iznad radnog područja provjerava orijentaciju dijelova prije montaže; pozadinsko svjetlo uključuje robot preko svog izlaza. Kod pogrešne orijentacije MES dobiva grešku i montaža se ne nastavlja.',
    podaci: [['Tip (R15)', 'Sensopart V20C-ALL-P3W-M-M2-L-90'], ['Svjetlo', 'LED reflektor / pozadinsko svjetlo']], izvor: 'IP-RASS', pretpostavka: true, napomena: 'Tip i položaj kamere u inačici KUKA nisu vidljivi na snimkama.', tema: 'robotskaMontaza' },
  { id: 'rassOsiguraci', skupina: RS, naziv: 'Cijevi za osigurače',
    opis: 'Tri okomite cijevi spremaju mikro osigurače; senzor na dnu svake javlja ima li još osigurača. Robot ih vadi manjom paralelnom prihvatnicom i umeće u pločicu.',
    podaci: [['Broj cijevi', '3'], ['Detekcija', 'po cijevi']], izvor: 'IP-RASS', pretpostavka: true, napomena: 'Položaj cijevi u ćeliji je pretpostavka.', tema: 'robotskaMontaza' },
  { id: 'rassKutijaPCB', skupina: RS, naziv: 'Kutija PCB (PNo 27)',
    opis: 'Tirkizna kutija s umetkom za tiskane pločice ulazi u ćeliju stražnjim otvorom. Bez kutije u ćeliji robot je u sigurnosnom zaustavljanju (safety stop 1) i ne može se gibati.',
    podaci: [['Oznaka', 'BoxID: 1, PNo: 27'], ['Umetak (plakat)', '2 × 2 gnijezda, „PCB only”']], izvor: 'MAN-RASS, foto', tema: 'robotskaMontaza' },
  { id: 'rassTrakaKutije', skupina: RS, naziv: 'Traka za kutije',
    opis: 'Dvije uske trake uvlače kutiju sa stražnje strane do radnog položaja. Pneumatski indekser (zasuni) fiksira kutiju, dvije svjetlosne barijere javljaju položaj, induktivni senzor provjerava orijentaciju, a RFID glava čita kutiju.',
    podaci: [['Senzori', '2 svjetlosne barijere, induktivna provjera orijentacije, RFID']], izvor: 'IP-RASS, foto', pretpostavka: true, napomena: 'Položaj trake (desno straga) procijenjen je iz fotografije 20260629_160938.', tema: 'pneumatika' },
  { id: 'rassOtvorKutije', skupina: RS, naziv: 'Stražnji otvor i tipka „Box change”',
    opis: 'Na stražnjoj strani RASS-a ladičasti otvor s dvije trake služi za ulaz i izlaz kutije, a zelena tipka „Box change” pokreće ručnu izmjenu. Izmjena Robotinom traži prihvat kutija (CP-MR-B), pa u ovoj opremi kutiju mijenja operater.',
    podaci: [['Pokretanje', 'tipka Box change (straga)'], ['Robotino', 'nije moguće s CP-MR-C']], izvor: 'MAN-RASS, foto', tema: 'robotskaMontaza' },
  { id: 'rassSenzoriOrijentacije', skupina: RS, naziv: 'Svjetlosne barijere za orijentaciju izratka',
    opis: 'Tri svjetlosne barijere na radnom položaju provjeravaju kako kućište leži na paleti prije nego robot počne montažu.',
    podaci: [['Broj', '3']], izvor: 'IP-RASS', pretpostavka: true, napomena: 'Položaj barijera je načelni prikaz.', tema: 'zaustavljac' },
  { id: 'rassSigurnost', skupina: RS, naziv: 'Sigurnosni releji RASS-a',
    opis: 'Sigurnosni releji SICK UE410 s konfiguracijom Flexi Soft nadziru nužne stopove, vrata ćelije i prisutnost kutije te prekidaju napajanje pogona robota.',
    podaci: [['Releji', UPRAVLJANJE.releji.rass]], izvor: 'SCH-RASS', pretpostavka: true, napomena: 'Smještaj u ormaru je načelni prikaz.', tema: 'sigurnosniKrug' },

  /* ---------------- BRANCH */
  ...zajednicki('branch'),
  { id: 'branchSkretnica', skupina: BR, naziv: 'Skretnica',
    opis: 'Zakretna ruka (deflector arm) na pneumatskom zakretnom cilindru usmjerava nosač s glavne trake u krak grananja ili ga pušta ravno. Senzori W1_BG30 (ravno) i W1_BG31 (bypass otvoren) javljaju položaj, a skretnica se zakreće samo kad senzori područja jave da je slobodno.',
    podaci: [['Pogon', 'pneumatski zakretni cilindar'], ['Senzori', 'W1_BG30 ravno, W1_BG31 otvoreno']], izvor: 'MAN-BR, IP-BR, MS-BR18', pretpostavka: true, napomena: 'Oblik ruke i točka zakreta su pojednostavljeni.', tema: 'grananje' },
  { id: 'branchKrak', skupina: BR, naziv: 'Krak grananja (trake 3 i 4)',
    opis: 'Dvije kratke trake strše preko ruba modula: traka 3 vodi nosač van, traka 4 natrag na glavnu liniju. U ovom laboratoriju krak gleda na stranu na kojoj su HMI-jevi RASS-a i ASRS-a, jer je BRANCH okrenut za 180°.',
    podaci: [['Izbačaj (procjena)', mm(MJERE.branch.krak.izbacaj)], ['Razmak traka (procjena)', mm(MJERE.branch.krak.razmak)]], izvor: 'MAN-BR, IP-BR, foto', pretpostavka: true, napomena: 'Izbačaj i razmak traka kraka procijenjeni su iz fotografije.', tema: 'grananje' },
  { id: 'branchPetlja', skupina: BR, naziv: 'Preusmjerivač na kraju kraka',
    opis: 'Polukružna vodilica na kraju kraka prebacuje nosač s trake 3 na traku 4, pa nosač izlazi i vraća se „u petlji” bez okretanja smjera trake. Ista petlja postoji na prihvatu Robotina CP-MR-C.',
    podaci: [['Funkcija', 'prebacivanje traka 3 → 4']], izvor: 'MAN-BR, CPMR-C', pretpostavka: true, napomena: 'Oblik preusmjerivača je načelni prikaz.', tema: 'grananje' },
  { id: 'branchMjestoPredaje', skupina: BR, naziv: 'Mjesto predaje Robotinu',
    opis: 'Na kraju kraka nosač čeka na zaustavljaču dok Robotino ne pristane. Nakon optičkog handshakea traka kraka predaje nosač na prihvat robota; povratak ide obrnutim redom preko trake 4.',
    podaci: [['Zaustavljač', 'traka 4 (belt-4 stopper)'], ['Visina (model)', mm(Z_TRAKA) + ' (prihvat Robotina ~1020 mm, procjena)']], izvor: 'IP-BR, MAN-BR, CPMR-C', pretpostavka: true, napomena: 'Tumačenje toka (traka 3 van, zaustavljač trake 4 na mjestu predaje) je pretpostavka iz I/O tablice.', tema: 'predajaRobotinu' },
  { id: 'branchHandshake', skupina: BR, naziv: 'Optički handshake za Robotino',
    opis: 'Par odašiljač–prijemnik na kraju kraka svjetlosnim signalom usklađuje predaju s Robotinom: izlaz %Q3.5 šalje signal robotu, ulaz %I3.5 javlja da je robot detektiran. U HMI-ju se ispituje kao „Handshake to robotino” (Setup – Stopper 3).',
    podaci: [['PLC', '%Q3.5 (+G1-GF35) → Robotino, %I3.5 (+G1-KG35) ← Robotino'], ['Razmak', '~50 cm']], izvor: 'IP-BR, MAN-BR, MS-BR18, PODACI_ROBOTINO', pretpostavka: true, napomena: 'Docking-Kit je uvjet; narudžbeni broj i točan položaj senzora nisu poznati.', tema: 'predajaRobotinu' },
  { id: 'branchSenzoriSudara', skupina: BR, naziv: 'Senzori područja skretnice',
    opis: 'Senzori protiv sudara javljaju je li područje skretnice slobodno (BG42/BG45) i je li nosač izašao iz „kritičnog odsječka” preko traka 2 i 3. Tek tada PLC smije zakrenuti skretnicu ili pustiti sljedeći nosač.',
    podaci: [['Oznake', 'BG42, BG45']], izvor: 'IP-BR, MAN-BR', pretpostavka: true, napomena: 'Položaji senzora su načelni.', tema: 'grananje' },
  { id: 'branchKutniPrijenosnik', skupina: BR, naziv: 'Kutni prijenosnik (corner pulley)',
    opis: 'Kad modul radi samostalno, ugrađeni kutni prijenosnik vraća nosač s jedne glavne trake na drugu. U liniji tu ulogu preuzimaju povrati na krajevima linije.',
    podaci: [['Namjena', 'samostalni rad modula']], izvor: 'MAN-BR', pretpostavka: true, napomena: 'U modelu je prikazan kao poklopac na kraju modula.', tema: 'tokMaterijala' },
  { id: 'branchAplikacija', skupina: BR, naziv: KONFIG.branchModul ? 'Aplikacijski modul ' + KONFIG.branchModul : 'Aplikacijski modul (CP-AM, nije utvrđen)',
    opis: 'Na prednjoj liniji BRANCH-a, na njegovu jedinom radnom položaju, stoji mali portalni aplikacijski modul s okomitom osi i bijelom kupolom na vrhu. ' + (KONFIG.branchModul ? '' : 'Koji je to modul (npr. mjerenje, bušenje, kamera) nije moguće utvrditi sa snimaka — u modelu je prikazan kao generička kutija na portalu.'),
    podaci: [['Portal (procjena)', '250 × 200 × 600 mm'], ['Tip', KONFIG.branchModul || KONFIG.branchModulNapomena]], izvor: 'MAN-BR, foto', pretpostavka: !KONFIG.branchModul, napomena: KONFIG.branchModul ? '' : KONFIG.branchModulNapomena + ' — pročitati pločicu modula.', tema: 'grananje' },

  /* ---------------- ASRS32 */
  ...zajednicki('asrs'),
  { id: 'asrsKuciste', skupina: AS, naziv: 'Kućište skladišta',
    opis: 'Svijetlosivi okvir sa zatamnjenim staklom zatvara regal i portal iznad linije. Kroz bočne stijenke prolaze trake („zaštitni tunel”), pa se u radni prostor portala ne može posegnuti s linije.',
    podaci: [['Visina', '1800 mm (+ stup osi Z)'], ['Operaterska strana', 'samo sprijeda']], izvor: 'IP-ASRS, MAN-ASRS, foto', pretpostavka: true, napomena: 'Donji rub kućišta i podjela stakla procijenjeni su iz fotografije.', tema: 'regalnoSkladiste' },
  { id: 'asrsVrata', skupina: AS, naziv: 'Servisna vrata skladišta',
    opis: 'Polikarbonatna vrata na prednjoj strani kućišta nadziru dvokanalni sigurnosni prekidači (PSEN iX1, releji PNOZ). Otvaranjem vrata zaustavlja se portal; s njim se tada radi samo u načinu Setup.',
    podaci: [['Prekidači', '2-kanalni, PSEN iX1'], ['Releji', 'PNOZ X8P, PZE X4P']], izvor: 'MAN-ASRS, foto', tema: 'sigurnosniKrug' },
  { id: 'asrsRegalPrednji', skupina: AS, naziv: 'Prednji regal (mjesta 1–16)',
    opis: 'Prednji regal ima 16 mjesta za palete. Mjesta se broje slijeva nadesno i odozdo prema gore; HMI ih prikazuje kao „Shelf 1–16”.',
    podaci: [['Mjesta', '1–16'], ['Raspored (procjena)', '4 razine × 4 stupca']], izvor: 'MAN-ASRS, UPV, foto', pretpostavka: true, napomena: 'Raspored 4 × 4 i visine polica procijenjeni su iz Festova videa i fotografije.', tema: 'regalnoSkladiste' },
  { id: 'asrsRegalStraznji', skupina: AS, naziv: 'Stražnji regal (mjesta 17–32)',
    opis: 'Stražnji regal ima još 16 mjesta; portal mu pristupa nakon zakreta osi C za 180°. HMI ih prikazuje kao „Shelf 17–32”.',
    podaci: [['Mjesta', '17–32'], ['Raspored (procjena)', '4 razine × 4 stupca']], izvor: 'MAN-ASRS, UPV, foto', pretpostavka: true, napomena: 'Raspored 4 × 4 je procjena.', tema: 'regalnoSkladiste' },
  { id: 'asrsPalete', skupina: AS, naziv: 'Palete u skladištu',
    opis: 'Na policama stoje palete — prazne, s prednjim poklopcima ili s gotovim izradcima. Zauzetost svakog mjesta i sadržaj vodi MES4; portal ne zna što je na paleti, samo izvršava naredbu „spremi” ili „izdaj”.',
    podaci: [['Kapacitet', '32 palete'], ['Zalihe', 'MES4']], izvor: 'IP-ASRS, FAC-142', tema: 'regalnoSkladiste' },
  { id: 'asrsOsX', skupina: AS, naziv: 'Os X (vodoravna)',
    opis: 'Vodoravna os nosi kolica s osima Y i C duž cijelog regala. Pogoni je servomotor preko zupčastog remena, s referentnim i krajnjim senzorima BG40–BG42.',
    podaci: [['Pogon', 'Festo EMMS-AS-55-M-LS-TS'], ['Senzori', 'BG40 lijevo, BG41 desno, BG42 referenca'], ['Hod', 'nije objavljen']], izvor: 'IP-ASRS, MAN-ASRS', pretpostavka: true, napomena: 'Izvedba portala (konzolna os X na okomitom stupu Z desno) i hod osi procijenjeni su iz fotografije i videa.', tema: 'regalnoSkladiste' },
  { id: 'asrsOsZ', skupina: AS, naziv: 'Os Z (okomita)',
    opis: 'Okomita os podiže os X s prihvatnicom na razinu police ili trake. Servomotor ima kočnicu, pa os ne pada kad nestane napajanja. Stup osi viri iznad krova kućišta.',
    podaci: [['Pogon', 'Festo EMMS-AS-55-M-LS-TSB (s kočnicom)'], ['Senzori', 'BG43 dolje, BG44 gore, BG45 referenca']], izvor: 'IP-ASRS, MAN-ASRS, foto', pretpostavka: true, napomena: 'Položaj stupa (desno) iz fotografije; hod osi nije objavljen.', tema: 'regalnoSkladiste' },
  { id: 'asrsServo', skupina: AS, naziv: 'Servoregulatori osi X i Z',
    opis: 'Dva regulatora CMMP-AS-C2-3A-M3 u ormaru napajaju servomotore i primaju naredbe PLC-a preko PROFINET-a. Nakon uključivanja osi traže referentni položaj (REF na HMI-ju).',
    podaci: [['Tip', 'Festo CMMP-AS-C2-3A-M3'], ['Komunikacija', 'PROFINET']], izvor: 'IP-ASRS, MAN-ASRS', pretpostavka: true, napomena: 'Smještaj u ormaru je načelni prikaz.', tema: 'plcHmi' },
  { id: 'asrsOsY', skupina: AS, naziv: 'Os Y (naprijed/natrag)',
    opis: 'Pneumatski cilindar bez klipnjače DGC-18 s hodom 140 mm izvlači prihvatnicu prema polici i vraća je. Dva senzora (BG46/BG47) javljaju krajnje položaje.',
    podaci: [['Tip', 'Festo DGC-18-140'], ['Hod', '140 mm'], ['Senzori', 'BG46, BG47']], izvor: 'MAN-ASRS', tema: 'pneumatika' },
  { id: 'asrsOsC', skupina: AS, naziv: 'Os C (zakret 0°/180°)',
    opis: 'Pneumatski zakretni pogon okreće os Y s prihvatnicom prema prednjem ili stražnjem regalu. Ima samo dva položaja, 0° i 180°, sa senzorima BG50/BG51.',
    podaci: [['Tip', 'Festo DRQD-B-20-180'], ['Položaji', '0° / 180°'], ['Senzori', 'BG50, BG51']], izvor: 'MAN-ASRS', tema: 'pneumatika' },
  { id: 'asrsHvataljka', skupina: AS, naziv: 'Prihvatnica palete',
    opis: 'Paralelna pneumatska prihvatnica HGPT-20 hvata paletu za rubove. Senzori javljaju otvorenu i zatvorenu prihvatnicu, a svjetlovod „shelf free” (BG53) prije odlaganja provjerava je li mjesto prazno.',
    podaci: [['Tip', 'Festo HGPT-20-A-B-G1'], ['Senzori', '2 + svjetlovod BG53'], ['Otvorena', 'BG52']], izvor: 'MAN-ASRS, IP-ASRS', pretpostavka: true, napomena: 'Oblik prstiju je pojednostavljen.', tema: 'regalnoSkladiste' },
  { id: 'asrsST1', skupina: AS, naziv: 'Položaj vađenja ST1 (zaustavljač 1)',
    opis: 'Na prednjoj traci prazan nosač staje na zaustavljaču 1 i portal na njega odlaže paletu s police (operacija 212 Release P1). Nakon OpEnd nosač odlazi prema sljedećem resursu.',
    podaci: [['Operacije', '210 Store P1, 212 Release P1'], ['Oznaka u priručniku', 'Pos 90 (retrieval)']], izvor: 'MAN-ASRS', pretpostavka: true, napomena: 'Koja traka nosi ST1, a koja ST2, u laboratoriju nije utvrđeno; u modelu ST1 je na prednjoj traci.', tema: 'zaustavljac' },
  { id: 'asrsST2', skupina: AS, naziv: 'Položaj spremanja ST2 (zaustavljač 2)',
    opis: 'Na stražnjoj traci nosač s gotovim izratkom staje na zaustavljaču 2; portal uzima paletu i sprema je na slobodno mjesto (operacija 211 Store P2), a MES ažurira zalihu.',
    podaci: [['Operacije', '211 Store P2, 213 Release P2'], ['Oznaka u priručniku', 'Pos 91 (loading)']], izvor: 'MAN-ASRS', pretpostavka: true, napomena: 'Raspodjela ST1/ST2 po trakama je pretpostavka.', tema: 'zaustavljac' },
  { id: 'asrsSigurnost', skupina: AS, naziv: 'Sigurnosni releji ASRS-a',
    opis: 'SICK UE410-GU4 i UE410-4RO4 obrađuju nužni stop, a PNOZ X8P i PZE X4P nadziru servisna vrata. Pri prekidu se isključuju servoregulatori, a os Z drži kočnica.',
    podaci: [['Nužni stop', 'SICK UE410-GU4 + UE410-4RO4'], ['Vrata', 'PNOZ X8P, PZE X4P']], izvor: 'MAN-ASRS', pretpostavka: true, napomena: 'Smještaj u ormaru je načelni prikaz.', tema: 'sigurnosniKrug' },
  { id: 'asrsManometar', skupina: AS, naziv: 'Manometar',
    opis: 'Manometar na upravljačkoj ploči pokazuje tlak zraka stanice. Prije pokretanja treba biti oko 6 bar — inače pneumatske osi Y i C, prihvatnica i zaustavljači ne rade pouzdano.',
    podaci: [['Radni tlak', '0,6 MPa']], izvor: 'MAN-ASRS, foto', tema: 'pneumatika' },

  /* ---------------- CP-COBOT-M */
  { id: 'cobotOrmar', skupina: CB, naziv: 'Postolje CP-COBOT-M',
    opis: 'Kompaktni modul na kotačima: svijetlosivi okvir s ovalnim ručkama na bokovima, zatamnjena vrata sprijeda i tamno gornje kućište s radnim prostorom robota. Napaja se jednofazno 230 V i ima RCD 30 mA.',
    podaci: [['Gabarit V × Š × D', '1617 × 873 × 869 mm (visina s robotom)'], ['Masa', '125 kg'], ['Napajanje', '1AC 230 V'], ['Narudžbeni br.', 'D12014']], izvor: 'IP-COBM, SCH-COB, foto', pretpostavka: true, napomena: 'Visina stola i podjela kućišta procijenjene su iz fotografije.', tema: 'kobotModul' },
  { id: 'cobotStol', skupina: CB, naziv: 'Radna ploha i mjesta BOX 1 / BOX 2',
    opis: 'U prednjem dijelu radne plohe dva su udubljena mjesta za transportne kutije 300 × 400 mm, označena BOX 1 i BOX 2. Robot iz njih uzima poklopce ili PCB, a straga može raditi s paletama s bypassa.',
    podaci: [['Mjesta', 'BOX 1, BOX 2'], ['Kutije', 'KTB 300 × 400 mm']], izvor: 'FAC-140, IP-COBM, foto', tema: 'kobotModul' },
  { id: 'robotUR3e', skupina: CB, naziv: 'Kobot UR3e',
    opis: 'Kolaborativni robot UR3e (3 kg, doseg 500 mm) s vakuumskom prihvatnicom posebnog oblika radi uz čovjeka bez zaštitne ograde. Kinematika, zglobovi i programiranje opisani su u području Kobot UR3e.',
    podaci: [['Nosivost', '3 kg'], ['Doseg', '500 mm'], ['Masa', '11,2 kg'], ['Zaštita', 'IP54, PL d'], ['Prihvatnica', 'VADMI-45-LS-P, senzor BP22'], ['Područje', PODRUCJA.ur3e.putanja]], izvor: 'IP-COBM, SCH-COB, FAC-140, foto', tema: 'kobotModul' },
  { id: 'cobotUpravljac', skupina: CB, naziv: 'Upravljač robota (e-Series)',
    opis: 'Upravljač robota je u ormaru modula. S PLC-om transporta CP Laba ili CP Factoryja može razmjenjivati signale preko PROFINET IO kad modul radi uz bypass.',
    podaci: [['Tip', sukob('Upravljač UR3e u CP-COBOT-u', 'e-Series', 'InfoPortal: Universal Robots e-Series [IP-COBM]; shema piše „Controller CB3” [SCH-COB].', 'e-Series (shema: CB3)')], ['Veza', 'PROFINET IO']], izvor: 'IP-COBM, SCH-COB', pretpostavka: true, napomena: 'Smještaj upravljača u ormaru je načelni prikaz.', tema: 'kobotModul' },
  { id: 'cobotPrivjesak', skupina: CB, naziv: 'Privjesak za učenje (Teach Pendant)',
    opis: 'UR Teach Pendant na zakretnom nosaču desno služi za programiranje robota (PolyScope) i ima vlastitu tipku nužnog stopa.',
    podaci: [['Nosač', 'zakretni, desno']], izvor: 'SCH-COB, foto', tema: 'kobotModul' },
  { id: 'cobotKutija1', skupina: CB, naziv: 'Kutija poklopaca BOX 1 (PNo 28)',
    opis: 'Kutija s umetkom za osam prednjih ili stražnjih poklopaca (ili sklopljenih izradaka). RFID glava TF80 ispod mjesta BOX 1 prepoznaje kutiju.',
    podaci: [['Oznaka', 'BoxID: 1, PNo: 28'], ['RFID glava', 'TF80']], izvor: 'MAN-RASS, SCH-COB, foto', tema: 'kobotModul' },
  { id: 'cobotKutija2', skupina: CB, naziv: 'Kutija poklopaca BOX 2 (PNo 28)',
    opis: 'Druga kutija istog tipa na mjestu BOX 2, s RFID glavom TF81. Robot može premještati dijelove iz jedne kutije u drugu (paletiziranje).',
    podaci: [['Oznaka', 'BoxID: 2, PNo: 28'], ['RFID glava', 'TF81']], izvor: 'MAN-RASS, SCH-COB, foto', tema: 'kobotModul' },
  { id: 'cobotRfid', skupina: CB, naziv: 'RFID čvor CP-COBOT-a',
    opis: 'Turck TBEN-S2-2RFID-4DXP s lijevom i desnom glavom čita oznake kutija na mjestima BOX 1 i BOX 2, pa program zna koja je kutija postavljena.',
    podaci: [['Čvor', 'Turck TBEN-S2-2RFID-4DXP'], ['Glave', 'TF80 (BOX 1), TF81 (BOX 2)']], izvor: 'SCH-COB', pretpostavka: true, napomena: 'Položaj glava ispod mjesta kutija je pretpostavka.', tema: 'rfid' },
  { id: 'cobotPloca', skupina: CB, naziv: 'Upravljačka ploča CP-COBOT-a',
    opis: 'Ploča sprijeda ima glavnu sklopku, manometar, tipku Reset, signalne lampice i gljivu nužnog stopa; postoji i ulaz nužnog stopa lijeve susjedne stanice.',
    podaci: [['Elementi', 'sklopka, manometar, Reset, nužni stop']], izvor: 'SCH-COB, foto', tema: 'sigurnosniKrug' },
  { id: 'cobotSigurnost', skupina: CB, naziv: 'Sigurnost CP-COBOT-a',
    opis: 'Releji SICK UE410-GU i UE410-4RO povezuju nužni stop modula, privjeska i susjedne stanice. Kolaborativni rad dopušten je jer robot ograničava silu i snagu (PL d).',
    podaci: [['Releji', UPRAVLJANJE.releji.cobot], ['Zaštita', 'RCD 30 mA'], ['Napajanje 24 V', 'Phoenix TRIO-PS']], izvor: 'SCH-COB, IP-COBM', pretpostavka: true, napomena: 'Smještaj u ormaru je načelni prikaz.', tema: 'sigurnosniKrug' },
  { id: 'cobotBezDockinga', skupina: CB, naziv: 'Inačica M — bez Robotino dockinga',
    opis: 'Oznaka M znači da modul nema docking za mobilnog robota: kutije ručno stavlja operater. Inačica D (CP-COBOT-D) ima docking, pa bi joj Robotino mogao dovoziti kutije.',
    podaci: [['Inačica', 'M = ručna dobava'], ['Robotino', 'ne može predavati ovom modulu']], izvor: 'FAC-140, IP-COBD', tema: 'kobotModul' },

  /* ---------------- Robotino */
  { id: 'robotino', skupina: RB, naziv: MRC ? 'Robotino 4 s prihvatom nosača (CP-MR-C)' : 'Robotino 4 s prihvatom kutija (CP-MR-B)',
    opis: 'Mobilni robot s omnidirekcijskim pogonom prevozi nosače između stanica s dockingom. Na tornju je prihvat s dvije trake i preusmjerivačem. Pogon, senzori, upravljanje i pristajanje opisani su u području Mobilni robot Robotino.',
    podaci: [['Pločica', 'D:RO4-BG-KPL 8101344'], ['Nadogradnja', MRC ? 'CP-MR-C (D14016)' : 'CP-MR-B'], ['Visina', '1230 mm'], ['Područje', PODRUCJA.robotino.putanja]], izvor: 'IP-MRC, CPMR-C, foto', pretpostavka: true, napomena: 'Inačica CP-MR-C presuđena je iz fotografija (~85 %); provjeriti razmak staza na platformi.', tema: 'predajaRobotinu' },
  { id: 'robotinoDocking', skupina: RB, naziv: 'Položaj pristajanja na BRANCH-u',
    opis: 'Robotino prilazi kraku grananja tako da je njegov prihvat u osi traka kraka, na razmaku od nekoliko centimetara. Nakon handshakea traka kraka i traka prihvata zajedno prenose nosač.',
    podaci: [['Položaj (model)', 'x = 1800 mm, y ≈ −450 mm, prihvat prema liniji']], izvor: 'IP-BR, CPMR-C, foto', pretpostavka: true, napomena: 'Pozicija pristajanja je pretpostavka iz fotografija (Robotino pristaje sprijeda na kraku BRANCH-a); u laboratoriju je nauči Fleet Manager.', tema: 'predajaRobotinu' },
  { id: 'stanicaPunjenja', skupina: RB, naziv: 'Stanica za punjenje',
    opis: 'Bijela stanica uz desni zid, s dva reflektorska markera i kontaktnom pločom sprijeda. Robotino na nju odlazi kad nema naloga; točan postupak pristajanja opisan je u području Robotino.',
    podaci: [['Narudžbeni br.', '8134659 (230 V)'], ['Mjere', '535 × 212 × 152 mm'], ['Snaga', '240 W'], ['Masa', '~14 kg']], izvor: 'FAC-248, PODACI_ROBOTINO, foto', pretpostavka: true, napomena: 'Položaj stanice u prostoru procijenjen je iz fotografija.', tema: 'predajaRobotinu' }
];

/* ================================================================== pomoćne funkcije */
const _PO_ID = new Map(DIJELOVI.map((d) => [d.id, d]));
export function nadjiDio(id) { return _PO_ID.get(id) || null; }
export function dijeloviSkupine(sk) { return DIJELOVI.filter((d) => d.skupina === sk); }
export function dijeloviTeme(tema) { return DIJELOVI.filter((d) => d.tema === tema); }
/** URL-ovi izvora dijela: izvor 'A, B' → [{kratica, url}] */
export function izvoriDijela(d) {
  return String(d && d.izvor || '').split(',').map((s) => s.trim()).filter(Boolean).map((k) => ({ kratica: k, url: IZVORI[k] || '' }));
}
/** plan (x, y, z) KS linije → [x, y, z] scene (Y gore) */
export function uScenu(x, y, z = 0) { return [x, z, -y]; }

export const TEKST_PRETPOSTAVKE = 'Podaci označeni kao pretpostavka nisu pronađeni u dokumentaciji proizvođača: procijenjeni su iz fotografija opreme u laboratoriju ili izračunati iz objavljenih brojeva. Sukob znači da se izvori ne slažu; koristi se navedena vrijednost. „Nedostaje” znači da podatak treba pročitati na opremi ili u MES4. Kad se podatak potvrdi, ispravlja se na jednom mjestu i oznaka nestaje.';

/** sve pretpostavke, sukobi i podaci koji nedostaju: [{ vrsta: 'pretpostavka'|'sukob'|'nedostaje', sto, vrijednost, napomena, id? }] (bez ponavljanja iste napomene) */
export function pretpostavke() {
  const out = [], vidjeno = new Set();
  const dodaj = (o) => { const k = o.vrsta + '|' + o.napomena; if (vidjeno.has(k)) return; vidjeno.add(k); out.push(o); };
  _REG.forEach((r) => dodaj({ ...r }));
  DIJELOVI.forEach((d) => { if (d.pretpostavka && d.napomena) dodaj({ vrsta: 'pretpostavka', sto: d.naziv, vrijednost: '', napomena: d.napomena, id: d.id }); });
  return out;
}
