/* FORTRONIQ · Festo MPS linija s robotom Mitsubishi RV-M1 — JEDINI izvor istine za liniju
   (distribucijska, ispitna, obradna, robotska + montažna stanica; izradci; tok; signali; veza PLC ↔ DUM1).
   Model (mps_model.js), logika linije (mps_tok.js), teme (teme_mps.js) i stranice čitaju SAMO odavde.
   Podaci robota (mjere, kinematika, naredbe, kolica robotske stanice) su u ../robot-mitsubishi-rv-m1/rvm1_podaci.js — ovdje se samo uvoze.
   Izvor činjenica: PODACI_MPS.md (istraživanje 18. 10. 2026.) i vlastite fotografije linije (samo predložak, ne objavljuju se).

   KAKO SE MIJENJA PODATAK
   - Potvrđena vrijednost: zamijeni  pp('…', 0.085, '…')  sa  0.085 — oznaka pretpostavke nestaje sa stranica.
   - Nova procjena: pp(sto, vrijednost, napomena, prikaz); sukob izvora: sukob(...); podatak koji nedostaje: nedostaje(sto, napomena) → null.
   - Inačica opreme ili programa: prekidač u KONFIG (PLC, logika ispitne stanice, zadatak robota).
   Jedinice: metri, sekunde, radijani (osim gdje piše mm ili °).
   KS linije (tlocrt): ishodište = prednji lijevi donji kut kolica distribucijske stanice (na podu); x udesno uz liniju gledano sprijeda
   (s upravljačkih ploča), y prema stražnjoj strani, z gore. Scena (three.js, Y gore): x_s = x, y_s = z, z_s = −y (kao CP Factory, KUKA, RV-M1).
   KS robota: X naprijed (prema upravljačkoj ploči, tj. −y linije), Y lijevo (tj. +x linije), Z gore; ishodište na montažnoj plohi podnožja.
   © ForTroniQ d.o.o. */
import { STANICA, MJERE as MJ_RV, TL_ZADANO, KONFIG as KONFIG_RV } from '../robot-mitsubishi-rv-m1/rvm1_podaci.js';

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
export function pp(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'pretpostavka', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
export function sukob(sto, v, napomena, prikaz) { _REG.push({ vrsta: 'sukob', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
export function nedostaje(sto, napomena) { _REG.push({ vrsta: 'nedostaje', sto, vrijednost: '[nedostaje]', napomena }); return null; }

const FOTO = 'procjena s fotografija linije (mjerilo: kolica 700 mm, kućište izratka Ø40 mm)';

/* ================================================================== prekidači inačice */
export const KONFIG = {
  /* redoslijed stanica uz tok materijala (slijeva nadesno gledano sprijeda) */
  redoslijed: ['dist', 'isp', 'obr', 'rob'],
  /* upravljač stanica: 'siemens-s7' (na fotografijama) | 'festo-cecc' (zahvat iz 2019. prema završnim radovima) | null */
  plc: sukob('Upravljači stanica (PLC)', 'siemens-s7',
    'Na fotografijama su na distribucijskoj, ispitnoj i obradnoj stanici sivi Siemensovi upravljači; završni radovi iz 2019. opisuju istu liniju s Festovim CECC-LK (distribucijska, obradna) i CPX-E (ispitna). Moguće je da su upravljači poslije mijenjani. Točan tip Siemensova upravljača treba očitati na stanici.',
    'Siemens S7 (prema fotografijama; tip nije očitan)'),
  /* logika ispitne stanice: 'visina-25' (sve niže od 25 mm je škart — crno 22,5 mm pada na visini) | 'visina-boja' (nazivna visina prema boji) | 'crno-van' (crno se odbacuje bez mjerenja) */
  logikaIspitne: sukob('Logika razvrstavanja na ispitnoj stanici', 'visina-25',
    'Završni rad o ovoj liniji: metal se odbacuje, a crno kućište pada na provjeri visine [VUC19]; drugi nastavni materijal: crno se odbacuje, a crveno i metalno se mjere [AALTO1]. Logika ovisi o programu, ne o stanici; u simulatoru se može promijeniti.',
    'dobro = visina ≥ 25 mm (crveno i aluminijsko kućište); crno 22,5 mm i škart 23/24 mm idu na klizač škarta'),
  /* dvije prozirne cijevi na robotskoj stanici: 'poklopci-opruge' (spremnici za montažu) | 'sortiranje' (spremnici gotovih izradaka) */
  cijevi: sukob('Uloga dviju prozirnih cijevi na robotskoj stanici', 'poklopci-opruge',
    'Na fotografijama su dvije prozirne cijevi različitog promjera na aluminijskim podnožjima s cilindrom — izgledaju kao spremnik poklopaca (široka) i uski spremnik opruga, kakve ima Festov modul za montažu robotom [IP-RS15]. Druga mogućnost: spremnici za sortiranje gotovih izradaka (crno / crveno i metalno) kao na samostalnoj robotskoj stanici [ML-RS11], [MZ-2AJ]. Provjeriti na liniji.',
    'široka cijev = spremnik poklopaca, uska = spremnik opruga'),
  /* nužni stop: gljiva na bilo kojoj stanici zaustavlja cijelu liniju */
  nuzniStopLinija: pp('Nužni stop djeluje na cijelu liniju', true,
    'Festova crna gljiva na upravljačkoj ploči je didaktički „nužni stop” stanice [FC-198]; ožičenje u zajednički krug linije nije opisano. U simulatoru gljiva na bilo kojoj stanici zaustavlja sve stanice i robot (vanjski STOP u nuždi DUM1 → pogreška I. vrste).',
    'da (zajednički krug, uključuje vanjski STOP u nuždi robota)'),
  ioKartica: KONFIG_RV.ioKartica
};

/* ================================================================== mjere i raspored (m) */
const H_KOLICA = STANICA.kolica.visina;                 // pp u rvm1_podaci.js (≈ 750 mm, izračun iz kataloga)
const T_PLOCE = STANICA.profilnaPloca.debljina;         // pp u rvm1_podaci.js
const VRH = H_KOLICA + T_PLOCE;                         // gornja ploha Al-profilne ploče
const T_CPL = STANICA.celicnaPloca.mjere[2];            // čelična ploča ispod robota

const SIRINE = pp('Širina kolica uz liniju (distribucijska, ispitna, obradna / robotska)', [0.35, 0.35, 0.35, 0.70],
  'Kolica su 700 × 350 mm, a robotska 700 × 700 mm [FC-190]. Na fotografijama su prve tri stanice uske uz liniju (350 mm), a dubina je 700 mm; robotska i montažna stanica dijele kolica 700 × 700 mm.',
  '350 / 350 / 350 / 700 mm, dubina 700 mm');
const X0 = [0];
SIRINE.forEach((s, i) => X0.push(X0[i] + s));

export const MJERE = {
  kolica: { visina: H_KOLICA, dubina: 0.70, sirine: SIRINE, x0: X0.slice(0, 4), duljinaLinije: X0[4], plinta: 0.07 },
  ploca: { debljina: T_PLOCE, korakUtora: STANICA.profilnaPloca.korakUtora, sirinaUtora: STANICA.profilnaPloca.sirinaUtora, vrh: VRH },
  upravljackaPloca: {
    sirina: pp('Širina upravljačke ploče (uske stanice)', 0.30, FOTO, '300 mm'),
    visina: 0.10, nagib: pp('Nagib upravljačke ploče', 52, FOTO, '52°')
  },
  /* izradak: kućište Ø40, visine prema boji [FC-200] */
  izradak: { promjer: 0.040, provrt: pp('Promjer provrta kućišta', 0.024, 'Mjere provrta nisu objavljene; procjena za model (klip ulazi u kućište).', 'Ø24 mm'), dno: pp('Debljina dna kućišta', 0.004, 'Nije objavljeno; procjena za model.', '4 mm') },
  /* distribucijska stanica */
  dist: {
    spremnik: { x: 0.12, y: 0.48, kapacitet: 8, visinaCijevi: pp('Visina cijevi slaganog spremnika', 0.20, FOTO + '; spremnik prima do 8 izradaka [AALTO1].', '200 mm'), zDno: VRH + 0.045 },
    izbacivac: { hod: pp('Hod izbacivača spremnika', 0.10, FOTO, '100 mm') },
    ruka: { os: [0.295, 0.38], duljina: 0.175, zSisaljke: VRH + 0.075,
      kut: sukob('Kut zakreta modula za premještanje', 180, 'Podesivo 90°–270° [AALTO1], [PHIL]; drugi opis kaže 0–180° [VUC19]. Uzeto 180° (spremnik ↔ dizalo ispitne stanice).', '180°') },
    mjestoUzimanja: [0.12, 0.38]
  },
  /* ispitna stanica */
  isp: {
    dizalo: { x: 0.47, y: 0.38, zDolje: VRH + 0.045,
      hod: pp('Hod dizala (cilindar bez klipnjače)', 0.22, FOTO, '220 mm') },
    zracniKlizac: { od: [0.50, 0.38], do: [0.77, 0.38], nagib: pp('Pad zračnog klizača', 'dizalo gore → ulaz okretnog stola', FOTO, '≈ 165 mm na 270 mm') },
    klizacSkarta: { od: [0.50, 0.38], do: [0.66, 0.38], kapacitet: 3, pad: 0.025 },
    pragVisine: pp('Prag provjere visine', 0.0245, 'Analogni senzor visine na ispitnoj stanici zamijenjen je binarnim signalom „visina OK” [VUC19]; prag nije objavljen — postavljen između 24 mm (škart) i 25 mm (dobro).', '24,5 mm'),
    tolerancija: pp('Tolerancija nazivne visine (logika „visina-boja”)', 0.0004, 'Nije objavljena; za simulator ±0,4 mm.', '±0,4 mm')
  },
  /* obradna stanica: okretni stol sa 6 gnijezda */
  obr: {
    stol: { x: 0.875, y: 0.38, polumjer: 0.14, rGnijezda: 0.105, zVrh: VRH + pp('Visina gornje plohe okretnog stola iznad ploče', 0.085, FOTO, '85 mm'),
      gnijezda: sukob('Broj gnijezda i korak okretnog stola', 6, 'Na fotografijama se vidi 6 gnijezda; jedan opis navodi šest položaja (ulaz, ispitivanje, obrada, izlaz, dva slobodna) [TUE], drugi zakret 90° po koraku [VIC19], treći četiri senzora prisutnosti i signal „zakret 90° gotov” [PATRAS]. Uzeto 6 gnijezda i korak 60°.', '6 gnijezda, korak 60°') },
    /* kut položaja od osi +x (tlocrt, CCW); stol se okreće u smjeru kazaljke (−60° po koraku) */
    polozaji: sukob('Raspored mjesta na okretnom stolu', { ulaz: 180, ispitivanje: 120, busenje: 60, izlaz: 0 },
      'Redoslijed ulaz → ispitivanje → bušenje → izlaz prema [TUE]; drugi opisi stavljaju provjeru rupe nakon bušenja [VIC19], [AALTO2]. Smjer okretanja i položaj izlaza prema robotu procijenjeni s fotografija.',
      'ulaz 180°, ispitivanje 120°, bušenje 60°, izlaz (robot) 0°')
  },
  /* robotska + montažna stanica (kolica 700 × 700, robot na čeličnoj ploči) */
  rob: {
    robot: pp('Položaj robota na stanici (tlocrt linije)', { x: 1.25, y: 0.45 },
      'Robot je na fotografijama u stražnjem dijelu kolica, bliže obradnoj stanici; montažni moduli su desno. Točan položaj nije izmjeren.',
      'x 1250 mm, y 450 mm (os J1), X robota prema upravljačkoj ploči'),
    zBaze: VRH + T_CPL,
    gnijezdo: { x: 1.47, y: 0.22, zDno: VRH + 0.040, mjere: pp('Montažno gnijezdo (plavi blok)', [0.08, 0.065, 0.07], FOTO, '80 × 70 × 65 mm') },
    paleta: { x0: 1.27, korak: 0.04, mjesta: 4, yCrni: 0.17, ySrebrni: 0.13, zDno: VRH + 0.010 },
    spremnikPoklopaca: { x: 1.52, y: 0.62, uzimanje: [1.52, 0.54], zIzlaz: VRH + 0.050, kapacitet: pp('Kapacitet spremnika poklopaca', 8, FOTO, '8 poklopaca'), visinaCijevi: 0.16, promjer: 0.050 },
    spremnikOpruga: { x: 1.60, y: 0.62, uzimanje: [1.60, 0.54], zIzlaz: VRH + 0.050, kapacitet: pp('Kapacitet spremnika opruga', 10, FOTO, '10 opruga'), visinaCijevi: 0.18, promjer: 0.030 },
    izlaz: { od: [1.60, 0.33], do: [1.60, 0.06], kapacitet: pp('Kapacitet izlaznog klizača gotovih cilindara', 6, 'Izlazni klizač na liniji s fotografija nije prepoznat; mjesto i kapacitet su pretpostavka (Festov modul ima izlazni klizač [IP-RS15]).', '6 cilindara'), zDno: VRH + 0.010, pad: 0.015 },
    pripremaZraka: { x: 1.70, y: 0.62 },
    sucelje: { x: 1.70, y: 0.42 }
  },
  vrh: VRH
};
export const VRH_PLOCE = VRH;

/* ================================================================== stanice */
const PLC_TXT = KONFIG.plc === 'siemens-s7' ? 'Siemens S7 (tip treba očitati)' : KONFIG.plc === 'festo-cecc' ? 'Festo CECC-LK / CPX-E' : '[nedostaje]';
export const STANICE = {
  dist: {
    id: 'dist', naziv: 'Distribucijska stanica', engl: 'Distributing station', kratko: 'Distribucijska', kolica: '700 × 350 mm', indeks: 0,
    zadatak: 'Izbacuje izratke jedan po jedan iz slaganog spremnika i zakretnom rukom s vakuumskom sisaljkom predaje ih ispitnoj stanici.',
    moduli: ['slagani spremnik s izbacivačem', 'modul za premještanje (zakretni pogon, vakuumska sisaljka)'],
    aktuatori: ['dvoradni cilindar izbacivača (5/2 ventil)', 'zakretni pneumatski pogon (180°)', 'generator vakuuma (ejektor)'],
    senzori: ['optički jednosmjerni senzor „spremnik prazan”', '2 magnetska senzora krajnjih položaja izbacivača', 'vakuumski prekidač „izradak prihvaćen”', '2 mikroprekidača krajnjih položaja zakretnog pogona'],
    plc: PLC_TXT, izvor: 'AALTO1, VUC19, ACAD, PHIL'
  },
  isp: {
    id: 'isp', naziv: 'Ispitna stanica', engl: 'Testing station', kratko: 'Ispitna', kolica: '700 × 350 mm', indeks: 1,
    zadatak: 'Prepoznaje boju i materijal izratka, podiže ga dizalom i mjeri visinu; dobar izradak zračnim klizačem šalje obradnoj stanici, a škart na donji klizač.',
    moduli: ['modul za prepoznavanje', 'modul za podizanje (dizalo)', 'mjerni modul', 'zračni klizač i klizač škarta'],
    aktuatori: ['cilindar bez klipnjače (dizalo)', 'cilindar izbacivač', 'mjerni cilindar', 'zračni jastuk klizača'],
    senzori: ['kapacitivni (izradak prisutan)', 'optički (crveno / crno)', 'induktivni (metal)', 'analogni senzor visine (binarni signal „visina OK”)', 'induktivni senzori dizala gore / dolje', 'svjetlosna barijera'],
    plc: PLC_TXT, izvor: 'AALTO1, AALTO2, VUC19, ACAD'
  },
  obr: {
    id: 'obr', naziv: 'Obradna stanica', engl: 'Processing station', kratko: 'Obradna', kolica: '700 × 350 mm', indeks: 2,
    zadatak: 'Na okretnom stolu sa šest gnijezda provjerava položaj izratka, buši ga i na izlaznom mjestu javlja robotu da ga preuzme.',
    moduli: ['okretni stol (DC motor)', 'modul za ispitivanje', 'modul za bušenje sa stezanjem'],
    aktuatori: ['DC motor okretnog stola', 'DC motor bušilice', 'linearna os bušilice (gore / dolje)', 'stezni cilindar', 'cilindar ispitivača'],
    senzori: ['induktivni senzor položaja stola', 'kapacitivni senzori prisutnosti na mjestima', 'senzori bušilice gore / dolje', 'senzor ispitivača'],
    plc: PLC_TXT, izvor: 'VIC19, TUE, PATRAS, AALTO2'
  },
  rob: {
    id: 'rob', naziv: 'Robotska i montažna stanica', engl: 'Robot and assembly station', kratko: 'Robotska', kolica: '700 × 700 mm', indeks: 3,
    zadatak: 'Robot RV-M1 preuzima izradak s okretnog stola, odlaže ga u montažno gnijezdo, prepoznaje boju i sklapa cilindar: klip, opruga i poklopac koji zabravljuje zakretom.',
    moduli: ['robot RV-M1 s motornom prihvatnicom na čeličnoj ploči', 'montažno gnijezdo sa senzorima', 'paleta klipova', 'spremnik poklopaca', 'spremnik opruga', 'izlazni klizač', 'sučelje robota (I/O)'],
    aktuatori: ['robot (5 osi) i motorna prihvatnica HM-01', 'cilindar spremnika poklopaca', 'cilindar spremnika opruga'],
    senzori: ['senzor prisutnosti u gnijezdu', 'senzor boje (crno / nije crno)', 'senzori „opruga spremna” i „poklopac spreman”', 'senzor punog izlaza'],
    plc: 'upravljačka jedinica robota DUM1 (program u jeziku Movemaster) — vlastiti PLC stanice nije vidljiv na fotografijama',
    izvor: 'VIC19, IP-RS15, FC-238, ML-RS11'
  }
};
pp('Upravljanje robotske stanice', 'DUM1 bez vlastitog PLC-a', 'Na fotografijama robotska stanica nema vidljiv PLC. U simulatoru program robota sam upravlja spremnicima opruga i poklopaca (kao Festov modul iz 2015. [IP-RS15]), a tipke ploče robotske stanice djeluju na DUM1 (START, STOP, RESET).', 'program DUM1 upravlja spremnicima');

/* ================================================================== izradci (komplet za montažu cilindra [FC-200]) */
export const IZRADCI = {
  kuciste: {
    naziv: 'Kućište cilindra', promjer: 0.040,
    vrste: [
      { id: 'crveno', naziv: 'crveno', boja: '#c8312a', visina: 0.025, materijal: 'plastika', metal: false, crno: false },
      { id: 'alu', naziv: 'aluminijsko', boja: '#c9ced3', visina: 0.025, materijal: 'aluminij', metal: true, crno: false },
      { id: 'crno', naziv: 'crno', boja: '#222428', visina: 0.0225, materijal: 'plastika', metal: false, crno: true }
    ],
    skart: [0.023, 0.024],
    napomena: 'Kućišta za škart (534368): po dva od svake boje, visine 23 i 24 mm; samo kućišta (167021): 4 + 4 + 4.',
    izvor: 'FC-200'
  },
  klip: {
    naziv: 'Klip', vrste: [{ id: 'crni', naziv: 'crni', boja: '#26282c', zaKuciste: ['crveno', 'alu'] }, { id: 'srebrni', naziv: 'srebrni (metalni)', boja: '#b8bec4', zaKuciste: ['crno'] }],
    promjer: pp('Promjer klipa', 0.022, 'Mjere klipa nisu objavljene; procjena za model.', 'Ø22 mm'),
    visina: pp('Visina klipa sa svornjakom', 0.016, 'Nije objavljeno; procjena za model (klip, opruga i poklopac stanu u kućište visine 25 mm, poklopac je bez rupe za klipnjaču).', '16 mm'),
    izvor: 'IP-RS15'
  },
  opruga: {
    naziv: 'Opruga', boja: '#9aa3ab',
    promjer: pp('Promjer opruge', 0.012, 'Mjere opruge nisu objavljene; procjena za model.', 'Ø12 mm'),
    visina: pp('Visina opruge (u sklopu, stlačena)', 0.010, 'Nije objavljeno; procjena za model.', '10 mm'),
    izvor: '—'
  },
  poklopac: {
    naziv: 'Poklopac', boja: '#b8bec4', promjer: 0.040,
    visina: pp('Visina poklopca', 0.009, 'Mjere poklopca nisu objavljene; komplet od 50 poklopaca (162240) bez rupe za klipnjaču [FC-200].', '9 mm'),
    izvor: 'FC-200'
  },
  komplet: 'Dijelovi za 7 crnih, 7 crvenih i 7 aluminijskih cilindara (kućište, klip, opruga, poklopac); može se više puta sklapati i rastavljati (162239).',
  najvecaSirina: 0.040,
  izvor: 'FC-200, FC-190, IP-RS15'
};
/** vrste za izbor u spremniku (simulator): kućište po boji i škart */
export const VRSTE_IZRADAKA = [
  { id: 'crveno', naziv: 'crveno 25 mm', boja: 'crveno', visina: 0.025, skart: false },
  { id: 'alu', naziv: 'aluminijsko 25 mm', boja: 'alu', visina: 0.025, skart: false },
  { id: 'crno', naziv: 'crno 22,5 mm', boja: 'crno', visina: 0.0225, skart: false },
  { id: 'crveno-23', naziv: 'crveno, škart 23 mm', boja: 'crveno', visina: 0.023, skart: true },
  { id: 'alu-24', naziv: 'aluminijsko, škart 24 mm', boja: 'alu', visina: 0.024, skart: true },
  { id: 'crno-23', naziv: 'crno, škart 23 mm', boja: 'crno', visina: 0.023, skart: true }
];
export function vrstaKucista(boja) { return IZRADCI.kuciste.vrste.find((v) => v.id === boja) || IZRADCI.kuciste.vrste[0]; }
/** je li kućište dobro prema logici ispitne stanice (visina u m, boja 'crveno'|'alu'|'crno') */
export function procjenaIspitne(boja, visina, logika = KONFIG.logikaIspitne) {
  const v = vrstaKucista(boja);
  if (logika === 'crno-van') return !v.crno && visina >= MJERE.isp.pragVisine;
  if (logika === 'visina-boja') return Math.abs(visina - v.visina) <= MJERE.isp.tolerancija;
  return visina >= MJERE.isp.pragVisine;
}

/* ================================================================== vremena aktuatora (simulator) */
export const VREMENA = {
  izbacivacSpremnika: 0.6, zakret: 1.1, vakuum: 0.35, otpuhivanje: 0.25,
  dizalo: 1.2, mjerenje: 0.5, mjerniCilindar: 0.35, izbacivacIspitne: 0.4, zracniKlizac: 0.9, klizacSkarta: 0.7,
  okretStola: 1.0, ispitivac: 0.5, stezanje: 0.3, busilicaHod: 0.7, busenje: 1.5,
  cilindarSpremnika: 0.4,
  izlazniKlizac: 0.8,
  smirivanje: 0.25
};
pp('Vremena aktuatora u simulatoru', 'procjena', 'Brzine cilindara (prigušni ventili), motora stola i bušilice te trajanje mjerenja nisu objavljeni; vremena su procjena za simulator (npr. zakret 1,1 s, dizalo 1,2 s, bušenje 1,5 s).', 'zakret 1,1 s · dizalo 1,2 s · okret stola 1,0 s · bušenje 1,5 s');

/* ================================================================== tok materijala (koraci po stanicama) */
export const TOK = [
  { stanica: 'dist', koraci: [
    'Optički senzor javlja da u spremniku ima izradaka (I0.6).',
    'Izbacivač (Q0.0) gura najdonji izradak iz spremnika na mjesto uzimanja; magnetski senzori javljaju krajnje položaje (I0.1, I0.2).',
    'Sisaljka zakretne ruke uključuje vakuum (Q0.1); vakuumski prekidač potvrđuje prihvat (I0.3); izbacivač se vraća.',
    'Kad ispitna stanica preko optičke veze StationLink javi da je spremna, ruka se zakreće za 180° (Q0.4 → I0.5).',
    'Vakuum se isključuje i kratki mlaz zraka (Q0.2) odvaja izradak na dizalo ispitne stanice; ruka se vraća prema spremniku (Q0.3 → I0.4).'
  ] },
  { stanica: 'isp', koraci: [
    'Kapacitivni senzor javlja izradak na dizalu (I0.0); optički senzor razlikuje crno od crvenog i metala (I0.1), induktivni javlja metal.',
    'Dizalo (cilindar bez klipnjače) podiže izradak u mjerni položaj (Q0.1 → I0.4).',
    'Mjerni cilindar spušta analogni senzor visine na izradak; upravljač usporedbom s pragom daje signal „visina OK” (I0.3).',
    'Dobar izradak: kad obradna stanica javi da je spremna, zračni klizač dobiva zrak (Q0.3), a izbacivač (Q0.2) gura izradak na klizač prema okretnom stolu.',
    'Škart: dizalo se spušta (Q0.0 → I0.5), a izbacivač gura izradak na donji klizač škarta (prima do 3 komada).'
  ] },
  { stanica: 'obr', koraci: [
    'Izradak sklizne u gnijezdo na ulaznom mjestu okretnog stola; kapacitivni senzor javlja prisutnost.',
    'Kad je izlazno mjesto prazno, DC motor okreće stol za jedno gnijezdo (60°); induktivni senzor javlja da je stol u položaju.',
    'Ispitivač se spušta i provjerava je li izradak ispravno položen (otvorom gore).',
    'Na mjestu bušenja izradak se steže, bušilica se uključuje i spušta, buši i vraća se gore.',
    'Na izlaznom mjestu upravljač javlja robotu „izradak spreman” (izlaz → ulaz 0 robota); stol čeka dok robot ne preuzme izradak.'
  ] },
  { stanica: 'rob', koraci: [
    'Robot čeka ulaz 0 (izradak spreman), uzima izradak s okretnog stola i javlja „preuzeto” (izlaz 0).',
    'Odlaže kućište u montažno gnijezdo; senzor javlja prisutnost (ulaz 2) i boju (ulaz 1: nije crno).',
    'Uzima klip s palete: crni za crveno i aluminijsko kućište, srebrni za crno — paletu računa naredbom PT, brojila broje klipove.',
    'Izlazom 1 izbacuje oprugu iz uskog spremnika i stavlja je na klip; izlazom 2 izbacuje poklopac iz širokog spremnika.',
    'Stavlja poklopac na kućište i zakretom šake za 90° ga zabravljuje; gotov cilindar odlaže na izlazni klizač i javlja impuls „sklopljeno” (izlaz 3).'
  ] }
];

/* ================================================================== upravljačke ploče i signali */
export const PLOCA = {
  elementi: [
    { id: 'START', naziv: 'START', vrsta: 'tipka sa žaruljicom', boja: 'zelena', opis: 'Pokreće rad stanice kad je spremna (žaruljica svijetli). U načinu AUTO stanica radi neprekidno, u MAN izvodi jedan ciklus.' },
    { id: 'STOP', naziv: 'STOP', vrsta: 'tipka (mirni kontakt)', boja: 'crvena', opis: 'Zaustavlja glavni program u svakom trenutku; ima prednost pred ostalim tipkama. Nastavak tek nakon RESET i START.' },
    { id: 'RESET', naziv: 'RESET', vrsta: 'tipka sa žaruljicom', boja: 'plava', opis: 'Trepćuća žaruljica traži inicijalizaciju: pritiskom se aktuatori vraćaju u početni položaj. Kod povezanih stanica inicijalizacija ide protiv toka materijala.' },
    { id: 'AUTO', naziv: 'AUTO / MAN', vrsta: 'preklopka s ključem', boja: 'crna', opis: 'AUTO = neprekidan rad, MAN = jedan ciklus po pritisku tipke START.' },
    { id: 'Q1', naziv: 'Lampica Q1', vrsta: 'signalna lampica', boja: 'bijela', opis: 'Slobodna signalna lampica; u simulatoru svijetli dok stanica radi.' },
    { id: 'Q2', naziv: 'Lampica Q2', vrsta: 'signalna lampica', boja: 'žuta', opis: 'Slobodna signalna lampica; u simulatoru trepće kad stanica čeka (zastoj) ili ima grešku.' },
    { id: 'GLJIVA', naziv: 'Gljiva „nužni stop”', vrsta: 'gljiva s blokadom', boja: 'crna', opis: 'Didaktički nužni stop: izlazi se isključuju, cilindri s jednostranim ventilima vraćaju se, vakuum se gubi. Nakon izvlačenja gljive potreban je RESET.' }
  ],
  logika: [
    'AUTO znači neprekidan rad, MAN jedan ciklus.',
    'Prije rada pritisne se trepćuća tipka RESET koja pokreće inicijalizaciju; kod povezanih stanica ona ide protiv toka materijala.',
    'NUŽNI STOP i STOP prekidaju rad u svakom trenutku; STOP zaustavlja glavni program do pritiska RESET.',
    'Nakon nužnog stopa: izvući gljivu, pritisnuti RESET, a kad zasvijetli START — START.'
  ],
  izvor: 'FC-198, IP-SEP, AALTO2, VIC19'
};
pp('Lampice Q1 i Q2 na upravljačkim pločama', 'Q1 = radi, Q2 = zastoj/greška', 'Festo ih ostavlja slobodnima za korisnički program [FC-198]; značenje u simulatoru je naš izbor.', 'Q1 radi · Q2 zastoj');

/* I/O pojedine stanice: oznaka, naziv, ključ signala u simulatoru. Adrese prema primjeru Siemens [ACAD] i opisu [PATRAS]; ploča i StationLink pp. */
const PANEL_I = [
  { oz: 'I1.0', k: 'tStart', naziv: 'tipka START' }, { oz: 'I1.1', k: 'tStop', naziv: 'tipka STOP (mirni kontakt, 1 = nije pritisnuta)' },
  { oz: 'I1.2', k: 'kAuto', naziv: 'ključ AUTO (1) / MAN (0)' }, { oz: 'I1.3', k: 'tReset', naziv: 'tipka RESET' },
  { oz: 'I1.4', k: 'nStop', naziv: 'nužni stop (mirni kontakt, 1 = gljiva izvučena)' }
];
const PANEL_Q = [
  { oz: 'Q1.0', k: 'lStart', naziv: 'žaruljica START' }, { oz: 'Q1.1', k: 'lReset', naziv: 'žaruljica RESET' },
  { oz: 'Q1.2', k: 'lQ1', naziv: 'lampica Q1 (radi)' }, { oz: 'Q1.3', k: 'lQ2', naziv: 'lampica Q2 (zastoj)' }
];
const SL_I = { oz: 'I1.7', k: 'slPrijem', naziv: 'StationLink prijamnik: sljedeća stanica spremna' };
const SL_Q = { oz: 'Q1.7', k: 'slOdasiljac', naziv: 'StationLink odašiljač: ova stanica spremna primiti' };
export const SIGNALI = {
  dist: {
    ulazi: [
      { oz: 'I0.1', k: 'izbStraga', naziv: 'izbacivač straga (uvučen)' }, { oz: 'I0.2', k: 'izbSprijeda', naziv: 'izbacivač sprijeda (izvučen)' },
      { oz: 'I0.3', k: 'vakuumOK', naziv: 'vakuumski prekidač: izradak prihvaćen' },
      { oz: 'I0.4', k: 'rukaSpremnik', naziv: 'zakretni pogon kod spremnika' }, { oz: 'I0.5', k: 'rukaDalje', naziv: 'zakretni pogon kod sljedeće stanice' },
      { oz: 'I0.6', k: 'imaIzradaka', naziv: 'u spremniku ima izradaka (optički, 0 = prazan)' },
      ...PANEL_I, SL_I
    ],
    izlazi: [
      { oz: 'Q0.0', k: 'izbacivac', naziv: 'izvlačenje izbacivača' }, { oz: 'Q0.1', k: 'vakuum', naziv: 'vakuum uključi' }, { oz: 'Q0.2', k: 'otpuh', naziv: 'vakuum isključi (otpuhivanje)' },
      { oz: 'Q0.3', k: 'zakretSpremnik', naziv: 'zakret prema spremniku' }, { oz: 'Q0.4', k: 'zakretDalje', naziv: 'zakret prema sljedećoj stanici' },
      ...PANEL_Q
    ],
    izvor: 'ACAD, FC-198'
  },
  isp: {
    ulazi: [
      { oz: 'I0.0', k: 'prisutan', naziv: 'izradak prisutan (kapacitivni)' }, { oz: 'I0.1', k: 'nijeCrno', naziv: 'boja: optički (crno = 0)' },
      { oz: 'I0.2', k: 'barijera', naziv: 'sigurnosna svjetlosna barijera slobodna' }, { oz: 'I0.3', k: 'visinaOK', naziv: 'visina OK (prag analognog senzora)' },
      { oz: 'I0.4', k: 'dizaloGore', naziv: 'dizalo gore' }, { oz: 'I0.5', k: 'dizaloDolje', naziv: 'dizalo dolje' }, { oz: 'I0.6', k: 'izbStraga', naziv: 'izbacivač straga (uvučen)' },
      { oz: 'I0.7', k: 'metal', naziv: 'materijal: induktivni (metal = 1)' },
      ...PANEL_I, SL_I
    ],
    izlazi: [
      { oz: 'Q0.0', k: 'dizaloDolje', naziv: 'dizalo dolje' }, { oz: 'Q0.1', k: 'dizaloGore', naziv: 'dizalo gore' }, { oz: 'Q0.2', k: 'izbacivac', naziv: 'izbacivač' },
      { oz: 'Q0.3', k: 'zracni', naziv: 'zračni klizač (zrak)' }, { oz: 'Q0.4', k: 'mjerni', naziv: 'mjerni cilindar dolje' },
      ...PANEL_Q
    ],
    izvor: 'ACAD, AALTO1, VUC19, FC-198'
  },
  obr: {
    ulazi: [
      { oz: 'I0.0', k: 'naUlazu', naziv: 'izradak na ulaznom mjestu' }, { oz: 'I0.1', k: 'naIspitivanju', naziv: 'izradak na mjestu ispitivanja' },
      { oz: 'I0.2', k: 'naBusenju', naziv: 'izradak na mjestu bušenja' }, { oz: 'I0.3', k: 'naIzlazu', naziv: 'izradak na izlaznom mjestu' },
      { oz: 'I0.4', k: 'stolUPolozaju', naziv: 'okretni stol u položaju (induktivni)' }, { oz: 'I0.5', k: 'ispitivacOK', naziv: 'ispitivač: izradak ispravno položen' },
      { oz: 'I0.6', k: 'busilicaGore', naziv: 'bušilica gore' }, { oz: 'I0.7', k: 'busilicaDolje', naziv: 'bušilica dolje' },
      ...PANEL_I, { oz: 'I1.5', k: 'robotPreuzeo', naziv: 'robot: izradak preuzet (izlaz 0 robota)' }
    ],
    izlazi: [
      { oz: 'Q0.0', k: 'motorStola', naziv: 'motor okretnog stola' }, { oz: 'Q0.1', k: 'motorBusilice', naziv: 'motor bušilice' },
      { oz: 'Q0.2', k: 'busilicaDolje', naziv: 'bušilica dolje' }, { oz: 'Q0.3', k: 'busilicaGore', naziv: 'bušilica gore' },
      { oz: 'Q0.4', k: 'stezanje', naziv: 'stezanje izratka' }, { oz: 'Q0.5', k: 'ispitivac', naziv: 'ispitivač dolje' },
      { oz: 'Q0.6', k: 'zaRobot', naziv: 'izradak spreman → ulaz 0 robota' },
      ...PANEL_Q
    ],
    izvor: 'PATRAS, VIC19, FC-198'
  }
};
pp('Adrese ulaza i izlaza stanica', 'primjer', 'Adrese distribucijske i ispitne stanice su iz primjera za Siemens [ACAD]; za obradnu stanicu popis signala je iz [PATRAS] uz naše adrese. Ploča na drugom bajtu (I1.x / Q1.x), StationLink na I1.7 / Q1.7 i induktivni senzor ispitne na I0.7 su pretpostavka — adrese linije nisu nađene.', 'I0.x / Q0.x moduli, I1.x / Q1.x ploča');

export const SYSLINK = {
  konektor: '24-polni IEEE-488', ulazi: 'I0–I7 na pinovima 13–20', izlazi: 'Q0–Q7 na pinovima 1–8', napajanje: '24 V i 0 V',
  terminal: 'I/O terminal 8025736: 8 DI / 8 DO', napomena: 'Pravilo 8 ulaza / 8 izlaza vrijedi za jedan SysLink priključak; stanica s više signala ima više priključaka.',
  izvor: 'IP-SEP, FC-204, FC-168'
};
export const STATIONLINK = {
  opis: 'Optički jednosmjerni par: odašiljač je na ulaznoj strani stanice, prijamnik na izlaznoj strani prethodne stanice. Stanica javlja „spremna primiti” uključenim, a „zauzeta” isključenim odašiljačem; prijamnik je invertirajući.',
  napomena: 'Točna I/O adresa StationLink signala za ovu liniju nije nađena.',
  izvor: 'ML-RS11, ML-HS18, TUE, MPS07'
};
export const NAPAJANJE = { napon: '24 V DC', struja: '4,5 A po stanici', zrak: '6 bar (600 kPa)', izvor: 'IP-RS15, IP-SEP, VUC19' };

/* ================================================================== veza PLC ↔ DUM1 (sučelje robota) */
const IO_N = KONFIG.ioKartica === 'A16B16' ? 16 : 8;
export const ROBOT_SUCELJE = {
  kartica: KONFIG.ioKartica, brojBita: IO_N,
  sw1Bit5: 'SW1 bit 5 = 1: DUM1 prima signal START s I/O kartice; s prednje ploče tada radi samo nužni stop [VIC19]',
  ulazi: [
    { bit: 0, k: 'izradakSpreman', naziv: 'izradak spreman na izlazu obradne stanice', izvor: 'obradna Q0.6' },
    { bit: 1, k: 'nijeCrno', naziv: 'senzor boje u gnijezdu: nije crno', izvor: 'senzor gnijezda' },
    { bit: 2, k: 'uGnijezdu', naziv: 'kućište u montažnom gnijezdu', izvor: 'senzor gnijezda' },
    { bit: 3, k: 'oprugaSpremna', naziv: 'opruga na mjestu uzimanja', izvor: 'spremnik opruga' },
    { bit: 4, k: 'poklopacSpreman', naziv: 'poklopac na mjestu uzimanja', izvor: 'spremnik poklopaca' },
    { bit: 5, k: 'izlazSlobodan', naziv: 'izlazni klizač nije pun', izvor: 'senzor izlaza' },
    { bit: 6, k: 'auto', naziv: 'ključ AUTO (1) / MAN (0) robotske stanice', izvor: 'ploča' },
    { bit: 7, k: 'paletaDopunjena', naziv: 'paleta klipova dopunjena (impuls)', izvor: 'operater' }
  ],
  izlazi: [
    { bit: 0, k: 'preuzeto', naziv: 'izradak preuzet → obradna I1.5', cilj: 'obradna I1.5' },
    { bit: 1, k: 'izbaciOprugu', naziv: 'cilindar spremnika opruga', cilj: 'ventil' },
    { bit: 2, k: 'izbaciPoklopac', naziv: 'cilindar spremnika poklopaca', cilj: 'ventil' },
    { bit: 3, k: 'sklopljeno', naziv: 'impuls „cilindar sklopljen”', cilj: 'lampica Q2' },
    { bit: 4, k: 'robotRadi', naziv: 'robot radi', cilj: 'lampica Q1' },
    { bit: 5, k: 'paletaPrazna', naziv: 'paleta klipova prazna', cilj: 'lampica / operater' },
    { bit: 6, k: 'slobodno6', naziv: 'slobodno', cilj: '—' },
    { bit: 7, k: 'slobodno7', naziv: 'slobodno', cilj: '—' }
  ],
  nuzni: 'gljiva linije → stezaljka EXT EMG STP na DUM1 → pogreška I. vrste (servo isključen, kočnice J2/J3)',
  izvor: 'VIC19, IP-RS15'
};
pp('Dodjela ulaza i izlaza DUM1 na liniji', 'naš prijedlog', 'Poznato je samo da PLC obradne stanice javlja robotu preuzimanje preko I/O kartice i da SW1 bit 5 = 1 omogućuje signale s kartice [VIC19]; broj ulaza i izlaza kartice, raspored pinova i signali nisu nađeni. Dodjela bitova 0–7 je pretpostavka simulatora (uz karticu A8/B8).', 'ulazi 0–7, izlazi 0–7 (vidi tablicu)');
pp('Izvlačenje gljive i RESET robotske stanice u simulatoru', 'automatski postupak', 'Na pravom robotu pogreška I. vrste poništava se samo isključenjem i uključenjem DUM1 i ponovnim NEST-om. Simulator to radi sam kad se na robotskoj stanici pritisne RESET.', 'RESET = isključi/uključi DUM1 + NT');

/* ================================================================== robot: točke i program (Movemaster) */
const RP = MJERE.rob, OB = MJERE.obr, IZ = IZRADCI;
/** točka linije (m) → točka robota (mm, kao na robotu); P = −90° (alat prema dolje) */
export function uRobot(x, y, z, p = -90, r = 0) {
  const r1 = (v) => Math.round(v * 10000) / 10;
  return { x: r1(RP.robot.y - y), y: r1(x - RP.robot.x), z: r1(z - RP.zBaze), p, r };
}
/** točka robota (mm) → linija (m) */
export function izRobota(t) { return [RP.robot.x + t.y / 1000, RP.robot.y - t.x / 1000, RP.zBaze + t.z / 1000]; }
const kutStola = (k) => k * Math.PI / 180;
const tStola = (kut) => [OB.stol.x + OB.stol.rGnijezda * Math.cos(kutStola(kut)), OB.stol.y + OB.stol.rGnijezda * Math.sin(kutStola(kut))];
export const MJESTA = {
  izlazObradne: tStola(OB.polozaji.izlaz),
  ulazObradne: tStola(OB.polozaji.ulaz),
  ispitivanje: tStola(OB.polozaji.ispitivanje),
  busenje: tStola(OB.polozaji.busenje)
};
const hvatK = 0.012;            /* hvat kućišta: 12 mm iznad dna */
const zG = RP.gnijezdo.zDno;    /* dno džepa gnijezda */
const vis25 = IZ.kuciste.vrste[0].visina;
const zKlipDno = zG + MJERE.izradak.dno;
const zIznad = zG + 0.065;      /* sigurna visina iznad gnijezda (dno nošenog kućišta iznad bloka) */
const pal = (i, red) => [RP.paleta.x0 + i * RP.paleta.korak, red === 'crni' ? RP.paleta.yCrni : RP.paleta.ySrebrni];
const T = (xy, z, r = 0) => uRobot(xy[0], xy[1], z, -90, r);
const G = [RP.gnijezdo.x, RP.gnijezdo.y];
export const POZICIJE_ROBOTA = [
  { br: 3, naziv: 'čekanje (iznad stola, siguran položaj)', t: T([1.10, 0.22], VRH + 0.20) },
  { br: 4, naziv: 'izlaz obradne — iznad', t: T(MJESTA.izlazObradne, OB.stol.zVrh + hvatK + 0.045) },
  { br: 5, naziv: 'izlaz obradne — hvat kućišta', t: T(MJESTA.izlazObradne, OB.stol.zVrh + hvatK) },
  { br: 6, naziv: 'gnijezdo — iznad', t: T(G, zIznad + hvatK) },
  { br: 7, naziv: 'gnijezdo — kućište (odlaganje i hvat)', t: T(G, zG + hvatK) },
  { br: 8, naziv: 'gnijezdo — umetanje klipa', t: T(G, zKlipDno + 0.010) },
  { br: 9, naziv: 'gnijezdo — opruga na klip', t: T(G, zKlipDno + IZ.klip.visina - 0.004 + 0.006) },
  { br: 14, naziv: 'gnijezdo — poklopac na kućište', t: T(G, zG + vis25 + 0.004) },
  { br: 15, naziv: 'gnijezdo — poklopac zabravljen (zakret 90°)', t: T(G, zG + vis25 + 0.004, 90) },
  { br: 16, naziv: 'opruga — iznad', t: T(RP.spremnikOpruga.uzimanje, RP.spremnikOpruga.zIzlaz + 0.006 + 0.040) },
  { br: 17, naziv: 'opruga — hvat', t: T(RP.spremnikOpruga.uzimanje, RP.spremnikOpruga.zIzlaz + 0.006) },
  { br: 18, naziv: 'poklopac — iznad', t: T(RP.spremnikPoklopaca.uzimanje, RP.spremnikPoklopaca.zIzlaz + 0.004 + 0.040) },
  { br: 19, naziv: 'poklopac — hvat', t: T(RP.spremnikPoklopaca.uzimanje, RP.spremnikPoklopaca.zIzlaz + 0.004) },
  { br: 24, naziv: 'izlazni klizač — iznad', t: T(RP.izlaz.od, RP.izlaz.zDno + hvatK + 0.070) },
  { br: 25, naziv: 'izlazni klizač — odlaganje', t: T(RP.izlaz.od, RP.izlaz.zDno + hvatK + 0.004) },
  /* paleta 1 (crni klipovi): kutovi 10–13, paleta 2 (srebrni): 20–23 — točku računa PT iz brojila 11 / 21 */
  { br: 10, naziv: 'paleta 1 (crni klipovi) — prvo mjesto', t: T(pal(0, 'crni'), RP.paleta.zDno + 0.010) },
  { br: 11, naziv: 'paleta 1 — zadnje mjesto u stupcu', t: T(pal(RP.paleta.mjesta - 1, 'crni'), RP.paleta.zDno + 0.010) },
  { br: 12, naziv: 'paleta 1 — kraj reda (jedan red: = 10)', t: T(pal(0, 'crni'), RP.paleta.zDno + 0.010) },
  { br: 13, naziv: 'paleta 1 — dijagonalni kut (= 11)', t: T(pal(RP.paleta.mjesta - 1, 'crni'), RP.paleta.zDno + 0.010) },
  { br: 20, naziv: 'paleta 2 (srebrni klipovi) — prvo mjesto', t: T(pal(0, 'srebrni'), RP.paleta.zDno + 0.010) },
  { br: 21, naziv: 'paleta 2 — zadnje mjesto u stupcu', t: T(pal(RP.paleta.mjesta - 1, 'srebrni'), RP.paleta.zDno + 0.010) },
  { br: 22, naziv: 'paleta 2 — kraj reda (= 20)', t: T(pal(0, 'srebrni'), RP.paleta.zDno + 0.010) },
  { br: 23, naziv: 'paleta 2 — dijagonalni kut (= 21)', t: T(pal(RP.paleta.mjesta - 1, 'srebrni'), RP.paleta.zDno + 0.010) },
];
pp('Točke robota na liniji', 'izračun iz rasporeda', 'Točke su izračunate iz pretpostavljenog rasporeda modula na stanici i pretpostavljenih mjera dijelova; na pravom robotu se uče privjeskom (P.S) i provjeravaju naredbom PR.', 'POZICIJE_ROBOTA (mm, P = −90°)');
const fmtT = (v) => (Math.round(v * 10) / 10).toFixed(1);
const PD = (p) => `PD ${p.br}, ${fmtT(p.t.x)}, ${fmtT(p.t.y)}, ${fmtT(p.t.z)}, ${fmtT(p.t.p)}, ${fmtT(p.t.r)}`;
const NP = RP.paleta.mjesta;
/* Program montaže: redak = jedna naredba; komentari počinju s ' (kao na robotu). */
const PROGRAM_MONTAZA = [
  "10 ' MONTAZA CILINDRA NA LINIJI MPS",
  '20 SP 5',
  '30 GO',
  '40 PA 1, ' + NP + ', 1',
  '50 PA 2, ' + NP + ', 1',
  '52 SC 11, 1',
  '54 SC 12, 1',
  '56 SC 21, 1',
  '58 SC 22, 1',
  '60 MO 3, O',
  '70 OB +4',
  "80 ' cekaj izradak na izlazu obradne (ulaz 0)",
  '90 TB +0, 130',
  '100 TI 2',
  '110 GT 90',
  "120 ' uzmi kuciste s okretnog stola",
  '130 MO 4, O',
  '140 MS 5, 3, C',
  '150 OB +0',
  '160 MS 4, 3, C',
  '170 OB -0',
  '180 MO 6, C',
  '190 MS 7, 3, O',
  '200 MS 6, 3, O',
  '210 TB +2, 240',
  '220 TI 2',
  '230 GT 210',
  "235 ' boja: ulaz 1 = nije crno -> crni klip, inace srebrni",
  '240 TB +1, 300',
  '250 CP 21',
  '260 LG ' + NP + ', 600',
  '270 PT 2',
  '280 IC 21',
  '290 GT 340',
  '300 CP 11',
  '310 LG ' + NP + ', 650',
  '320 PT 1',
  '330 IC 11',
  "335 ' klip: pozicija 1 ili 2 (PT), prilaz 40 mm iznad",
  '340 TB +1, 380',
  '350 MT 2, -40, O',
  '360 MS 2, 3, C',
  '370 GT 400',
  '380 MT 1, -40, O',
  '390 MS 1, 3, C',
  '400 DW 0, 0, 40',
  '410 MO 6, C',
  '420 MS 8, 3, O',
  '430 MS 6, 3, O',
  "435 ' opruga (izlaz 1, ulaz 3)",
  '440 OB +1',
  '450 TB +3, 480',
  '460 TI 2',
  '470 GT 450',
  '480 OB -1',
  '490 MO 16, O',
  '500 MS 17, 3, C',
  '510 MS 16, 3, C',
  '520 MO 6, C',
  '530 MS 9, 3, O',
  '540 MS 6, 3, O',
  "545 ' poklopac (izlaz 2, ulaz 4)",
  '550 OB +2',
  '560 TB +4, 700',
  '570 TI 2',
  '580 GT 560',
  "590 ' paleta prazna: izlaz 5, cekaj ulaz 7 (dopunjeno)",
  '600 OB +5',
  '610 TB +7, 630',
  '615 TI 2',
  '620 GT 610',
  '630 OB -5',
  '640 SC 21, 1',
  '645 GT 270',
  '650 OB +5',
  '660 TB +7, 680',
  '665 TI 2',
  '670 GT 660',
  '680 OB -5',
  '690 SC 11, 1',
  '695 GT 320',
  '700 OB -2',
  '710 MO 18, O',
  '720 MS 19, 3, C',
  '730 MS 18, 3, C',
  '740 MO 6, C',
  '750 MS 14, 3, C',
  '760 MO 15, C',
  '770 GO',
  '780 MS 6, 3, O',
  "785 ' gotov cilindar na izlazni klizac (ulaz 5 = nije pun)",
  '790 MS 7, 3, C',
  '800 MS 6, 3, C',
  '810 TB +5, 840',
  '820 TI 2',
  '830 GT 810',
  '840 MO 24, C',
  '850 MS 25, 3, O',
  '860 MS 24, 3, O',
  '870 OB +3',
  '880 TI 3',
  '890 OB -3',
  '900 MO 3, O',
  "905 ' AUTO (ulaz 6) = ponovi, MAN = kraj nakon jednog ciklusa",
  '910 TB +6, 90',
  '920 OB -4',
  '930 ED'
];
export function programRobota() {
  return { pozicije: POZICIJE_ROBOTA.map(PD), program: PROGRAM_MONTAZA.slice() };
}
export const PROGRAM_OPIS = 'Program montaže: čeka ulaz 0, uzima kućište s okretnog stola, odlaže ga u gnijezdo, prema boji uzima klip s palete (PA/PT, brojila 11 i 21), oprugu i poklopac iz spremnika (izlazi 1 i 2, ulazi 3 i 4), zabravljuje poklopac zakretom šake (pozicija 15: R = 90°) i gotov cilindar odlaže na izlazni klizač. U načinu MAN (ulaz 6 = 0) završava nakon jednog ciklusa.';

/* ================================================================== teme, skupine, izvori */
export const TEME_POPIS = [
  { id: 'spremnik-izbacivac', naslov: 'Slagani spremnik i izbacivač', engl: 'Stack magazine and ejector' },
  { id: 'vakuum-zakretna-ruka', naslov: 'Vakuumska sisaljka i zakretna ruka', engl: 'Vacuum suction cup and swivel arm' },
  { id: 'senzori-boja-materijal', naslov: 'Senzori: boja i materijal izratka', engl: 'Capacitive, optical and inductive sensors' },
  { id: 'mjerenje-visine', naslov: 'Mjerenje visine i razvrstavanje', engl: 'Height measurement and sorting' },
  { id: 'okretni-stol', naslov: 'Okretni stol s gnijezdima', engl: 'Rotary indexing table' },
  { id: 'busenje-provjera', naslov: 'Ispitivanje, stezanje i bušenje', engl: 'Testing, clamping and drilling' },
  { id: 'stationlink', naslov: 'StationLink: predaja među stanicama', engl: 'Optical hand-shake between stations' },
  { id: 'start-stop-reset', naslov: 'Upravljačka ploča: RESET, START, STOP, nužni stop', engl: 'Control panel and operating modes' },
  { id: 'montaza-cilindra', naslov: 'Robotska montaža cilindra', engl: 'Robot cylinder assembly' },
  { id: 'plc-robot-rukovanje', naslov: 'Rukovanje PLC ↔ robot preko ulaza i izlaza', engl: 'PLC to robot I/O hand-shake' }
];
export const TEME = Object.fromEntries(TEME_POPIS.map((t) => [t.id, t.naslov]));
export const SKUPINE = ['Linija', 'Distribucijska stanica', 'Ispitna stanica', 'Obradna stanica', 'Robotska i montažna stanica', 'Izradci'];
export const SKUPINA_STANICE = { 'Distribucijska stanica': 'dist', 'Ispitna stanica': 'isp', 'Obradna stanica': 'obr', 'Robotska i montažna stanica': 'rob' };
export const PODRUCJE_ROBOTA = { naziv: 'Robot Mitsubishi Movemaster EX RV-M1', putanja: '../robot-mitsubishi-rv-m1/', upoznavanje: '../robot-mitsubishi-rv-m1/upoznavanje-robota.html', index: '../robot-mitsubishi-rv-m1/index.html' };

/* Izvori: bez naziva ustanova i bez imena osoba; izvori čija domena nosi naziv ustanove — bez poveznice. */
export const IZVORI = {
  VUC19: { naziv: 'Upravljanje modularnim proizvodnim sustavom — završni rad, 2019.', url: '' },
  VIC19: { naziv: 'Projektiranje modularnog proizvodnog sustava — završni rad, 2019.', url: '' },
  STU: { naziv: 'opis laboratorijske linije MPS Plus s robotom RV-M1 i upravljačem Siemens S7', url: '' },
  'IP-RS15': { naziv: 'Festo Didactic: Robot station with MPS modules, priručnik br. 8040796, 01/2015', url: 'https://ip.festo-didactic.com/InfoPortal/MPS/RobotStation/Documentation/Manual.pdf' },
  'ML-RS11': { naziv: 'Festo Didactic: MPS Robot station, priručnik br. 756661, 05/11', url: 'https://www.manualslib.com/manual/2614404/Festo-Mps.html' },
  'ML-HS18': { naziv: 'Festo Didactic: MPS Handling station, priručnik br. 655633, 07/18', url: 'https://www.manualslib.com/manual/2562647/Festo-Mps.html' },
  'MZ-2AJ': { naziv: 'Festo: Robot station RV-2AJ, priručnik (sadržaj)', url: 'https://manualzz.com/doc/en/4596909/festo-rv-2aj-robot-station--slide-module--retainer-module...' },
  'FC-190': { naziv: 'Festo katalog Factory Automation: Robot station with MPS modules', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/190-191/' },
  'FC-234': { naziv: 'Festo katalog: Robot station 8039313', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/234-235/' },
  'FC-238': { naziv: 'Festo katalog: Robot handling module i Robot assembly module', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/238-239/' },
  'FC-200': { naziv: 'Festo katalog: kompleti izradaka (For cylinder assembly 162239)', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/200-201/' },
  'FC-174': { naziv: 'Festo katalog: Distributing station', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/174-175/' },
  'FC-188': { naziv: 'Festo katalog: Storing station (visina kolica)', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/188-189/' },
  'FC-198': { naziv: 'Festo katalog: upravljačka ploča', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/198-199/' },
  'FC-204': { naziv: 'Festo katalog: I/O terminal i SysLink', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/204-205/' },
  'FC-168': { naziv: 'Festo katalog: I/O ožičenje', url: 'https://www.festo.com/pdf_flip/didactic/Factory_Automation/en/168-169/' },
  'IP-SEP': { naziv: 'Festo Didactic: Separating station, priručnik br. 8038803, 09/2014', url: 'https://ip.festo-didactic.com/InfoPortal/MPS/SeparatingStation/Documentation/Manual.pdf' },
  MPS07: { naziv: 'Festo: Learning Systems — Modular Systems for Mechatronics Training, brošura 2007.', url: 'https://www.festo.com/net/supportportal/files/10142/mps.pdf' },
  AALTO1: { naziv: 'nastavni materijal: Distribution & Testing station', url: '' },
  AALTO2: { naziv: 'nastavni materijal: laboratorijska vježba MPS', url: '' },
  TUE: { naziv: 'nastavni materijal: Festo MPS hardware manual', url: '' },
  PATRAS: { naziv: 'nastavni materijal: FESTO MPS — popis senzora i aktuatora', url: '' },
  ACAD: { naziv: 'Appendix B: Festo PLC Stations (primjer adresa Siemens)', url: 'https://www.academia.edu/36175040/Appendix_B' },
  PHIL: { naziv: 'nastavni materijal: vježba s distribucijskom stanicom MPS', url: '' },
  CTRL01: { naziv: 'control.com, forum, 2001. (MPS s Festo FPC 100)', url: 'https://control.com/forums/threads/s-o-s-anyone-familiar-with-festos-plc-system.5362/' },
  POLSL07: { naziv: 'znanstveni članak: sustav za simulaciju robota RV-M1, 2007.', url: '' },
  POLSL08: { naziv: 'znanstveni članak: mrežno sučelje za robot RV-M1, 2008.', url: '' },
  foto: { naziv: 'vlastite fotografije linije (predložak modela, ne objavljuju se)', url: '' }
};

/* ================================================================== dijelovi (redoslijed = redoslijed u Upoznavanju) */
const LN = 'Linija', DS = 'Distribucijska stanica', IS = 'Ispitna stanica', OS = 'Obradna stanica', RS = 'Robotska i montažna stanica', IZR = 'Izradci';
const D = (id, skupina, naziv, opis, podaci, izvor, tema, extra) => Object.assign({ id, skupina, naziv, opis, podaci: podaci || [], izvor, tema }, extra || {});
export const DIJELOVI = [
  /* ---------------- Linija (zajednički dijelovi) */
  D('linija', LN, 'Linija MPS (četiri stanice)', 'Četiri stanice na kolicima slažu se jedna uz drugu: distribucijska, ispitna, obradna i robotska s montažom. Izradak prolazi slijeva nadesno, a svaka stanica ima vlastiti upravljač i upravljačku ploču, pa radi i samostalno. Linija iz 2001. godine u završnim radovima ima pet stanica (robotska i sklopna zasebno); na fotografijama robot i montaža dijele kolica.',
    [['Stanica', '4 (5 u opisu iz 2019.)'], ['Duljina', mm(MJERE.kolica.duljinaLinije)], ['Napajanje', NAPAJANJE.napon + ', ' + NAPAJANJE.struja], ['Zrak', NAPAJANJE.zrak]], 'VUC19, VIC19, foto', 'stationlink', { pretpostavka: true, napomena: 'Raspored i širine kolica procijenjeni su s fotografija.' }),
  D('kolica', LN, 'Kolica MPS', 'Čelična kolica na kotačima nose Al-profilnu ploču i ispod nje prostor za napajanje i kabele. Uske stanice imaju kolica 700 × 350 mm, a robotska 700 × 700 mm. Kolica se poravnaju i spoje, pa se linija preslaže bez novog ožičenja.',
    [['Mjere', '700 × 350 / 700 × 700 mm'], ['Visina (izračun)', mm(H_KOLICA)]], 'FC-190, FC-188, foto', 'stationlink', { pretpostavka: true, napomena: 'Visina kolica je izračun iz kataloga (1654 − 904 mm), nije izmjerena.' }),
  D('profilnaPloca', LN, 'Al-profilna ploča', 'Aluminijska ploča s T-utorima na koraku 50 mm: moduli se pričvršćuju vijcima i maticama u utorima, pa se položaj svakog modula lako mijenja. Ispod rubova ploče vode se kabelski kanali.',
    [['Mjere', '700 × 350 / 700 × 700 mm'], ['Korak utora', '50 mm'], ['Debljina (procjena)', mm(T_PLOCE)]], 'FC-190, foto', 'stationlink'),
  D('upravljackaPloca', LN, 'Upravljačka ploča', 'Kosa ploča na prednjem rubu svake stanice: tipke START (sa žaruljicom), STOP i RESET (sa žaruljicom), preklopka s ključem AUTO/MAN, dvije slobodne signalne lampice i crna gljiva kao didaktički nužni stop. Spojena je SysLink kabelom na drugi bajt ulaza i izlaza upravljača.',
    [['Elementi', 'START, STOP, RESET, AUTO/MAN, Q1, Q2, gljiva'], ['Spoj', 'SysLink, I1.x / Q1.x (pp)']], 'FC-198, foto', 'start-stop-reset'),
  D('tipkaStart', LN, 'Tipka START', PLOCA.elementi[0].opis + ' Žaruljica u tipki javlja da je stanica inicijalizirana i spremna.', [['Signal', 'I1.0 / žaruljica Q1.0']], 'FC-198', 'start-stop-reset'),
  D('tipkaStop', LN, 'Tipka STOP', PLOCA.elementi[1].opis + ' Izvedena je s mirnim kontaktom, pa prekid žice djeluje kao pritisak.', [['Signal', 'I1.1 (mirni kontakt)']], 'FC-198, VIC19', 'start-stop-reset'),
  D('tipkaReset', LN, 'Tipka RESET', PLOCA.elementi[2].opis, [['Signal', 'I1.3 / žaruljica Q1.1']], 'FC-198, IP-SEP', 'start-stop-reset'),
  D('kljucAutoMan', LN, 'Preklopka s ključem AUTO/MAN', PLOCA.elementi[3].opis + ' Ključ sprječava da neovlaštena osoba promijeni način rada.', [['Signal', 'I1.2']], 'FC-198, IP-SEP', 'start-stop-reset'),
  D('lampice', LN, 'Signalne lampice Q1 i Q2', 'Dvije slobodne lampice za korisnički program. U simulatoru Q1 svijetli dok stanica radi, a Q2 trepće kad stanica čeka (zastoj) ili ima grešku.', [['Signali', 'Q1.2, Q1.3']], 'FC-198', 'start-stop-reset', { pretpostavka: true, napomena: 'Značenje lampica je izbor simulatora.' }),
  D('gljiva', LN, 'Gljiva „nužni stop”', PLOCA.elementi[6].opis + ' U simulatoru djeluje na cijelu liniju i na robot (vanjski STOP u nuždi DUM1).', [['Signal', 'I1.4 (mirni kontakt, pp)'], ['Robot', 'EXT EMG STP → pogreška I.']], 'FC-198, AALTO2', 'start-stop-reset', { pretpostavka: true, napomena: 'Ožičenje gljive u zajednički krug linije nije opisano u izvorima.' }),
  D('plc', LN, 'Upravljač stanice (PLC)', 'Svaka od prve tri stanice ima vlastiti programirljivi logički upravljač: čita senzore i tipke ploče, izvodi slijed koraka i uključuje ventile i motore. ' + (KONFIG.plc === 'siemens-s7' ? 'Na fotografijama su sivi Siemensovi upravljači; u završnim radovima iz 2019. ista linija ima Festove CECC-LK i CPX-E programirane u CODESYS-u.' : 'Festo CECC-LK (14 DI / 8 DO) programira se u CODESYS-u; ispitna stanica ima CPX-E.'),
    [['Tip', PLC_TXT], ['Ulazi/izlazi', '8 + 8 po SysLink priključku'], ['Program', 'slijed koraka (SFC), STOP ima prednost']], 'VUC19, VIC19, foto', 'start-stop-reset', { pretpostavka: true, napomena: 'Tip Siemensova upravljača nije očitan s fotografija.' }),
  D('sysLink', LN, 'I/O terminal SysLink', SYSLINK.napomena + ' Konektor je 24-polni (IEEE-488): ulazi I0–I7, izlazi Q0–Q7 te 24 V i 0 V; isti kabel spaja ploču ili modul s upravljačem.',
    [['Konektor', SYSLINK.konektor], ['Ulazi', SYSLINK.ulazi], ['Izlazi', SYSLINK.izlazi], ['Terminal', SYSLINK.terminal]], 'IP-SEP, FC-204, FC-168', 'stationlink'),
  D('stationLink', LN, 'StationLink (optička veza)', STATIONLINK.opis + ' Tako prethodna stanica ne predaje izradak dok sljedeća nije spremna.',
    [['Odašiljač', 'ulazna strana stanice'], ['Prijamnik', 'izlazna strana prethodne'], ['Logika', 'svijetli = spremna, prijamnik invertira']], STATIONLINK.izvor, 'stationlink', { pretpostavka: true, napomena: STATIONLINK.napomena }),
  D('ventilskiOtok', LN, 'Ventilski otok', 'Elektromagnetski ventili na zajedničkoj ploči razvode zrak cilindrima i vakuumu: 5/2 za dvoradne cilindre, 3/2 za jednoradne i generator vakuuma. Prigušni ventili na cilindrima namještaju brzinu.',
    [['Tlak', NAPAJANJE.zrak], ['Izvedba', 'CP ventilski otok (u opisu iz 2019.)']], 'AALTO1, VUC19', 'spremnik-izbacivac', { pretpostavka: true, napomena: 'Smještaj ventila na ploči je načelan.' }),
  D('pripremaZraka', LN, 'Priprema zraka (filtar-regulator s ventilom)', 'Ručni ventil za uključivanje s filtrom i regulatorom tlaka: čisti zrak, drži tlak 6 bar i omogućuje sigurno odzračivanje stanice. Na fotografijama je na distribucijskoj i na robotskoj stanici.',
    [['Tlak', '6 bar'], ['Kataloški broj (današnji)', '540691']], 'FC-234, foto', 'spremnik-izbacivac'),
  /* ---------------- Distribucijska */
  D('dSpremnik', DS, 'Slagani spremnik', 'Okomita cijev u koju se izratci slažu otvorom prema gore, do 8 komada. Izbacivač uzima uvijek najdonji izradak, a ostali padaju za jedno mjesto niže.',
    [['Kapacitet', '8 izradaka'], ['Najveći promjer', '40 mm'], ['Visina cijevi (procjena)', mm(MJERE.dist.spremnik.visinaCijevi)]], 'AALTO1, VUC19, FC-174', 'spremnik-izbacivac'),
  D('dIzbacivac', DS, 'Izbacivač (dvoradni cilindar)', 'Dvoradni pneumatski cilindar ispod spremnika gura najdonji izradak na mjesto uzimanja. Upravlja ga 5/2 ventil (Q0.0), a krajnje položaje javljaju magnetski senzori na plaštu cilindra.',
    [['Ventil', '5/2, Q0.0'], ['Hod (procjena)', mm(MJERE.dist.izbacivac.hod)], ['Senzori', 'I0.1 straga, I0.2 sprijeda']], 'AALTO1, ACAD', 'spremnik-izbacivac'),
  D('dSenzorSpremnika', DS, 'Senzor „spremnik prazan”', 'Optički jednosmjerni senzor (odašiljač i prijamnik nasuprot) kroz otvor na dnu cijevi: dok izradak prekida zraku, u spremniku ima izradaka.',
    [['Vrsta', 'optički jednosmjerni'], ['Signal', 'I0.6 (0 = prazan)']], 'AALTO1, ACAD', 'spremnik-izbacivac'),
  D('dSenzoriCilindra', DS, 'Senzori krajnjih položaja cilindra', 'Magnetski (reed ili magnetorezistivni) senzori u utoru cilindra reagiraju na magnet u klipu i javljaju „uvučen” i „izvučen”.',
    [['Signali', 'I0.1, I0.2']], 'AALTO1, ACAD', 'spremnik-izbacivac'),
  D('dPrigusni', DS, 'Jednosmjerni prigušni ventili', 'Na priključcima cilindra prigušuju izlazni zrak, pa se brzina izvlačenja i uvlačenja namješta neovisno, bez trzaja.',
    [['Ugradnja', 'na priključcima cilindra']], 'AALTO1', 'spremnik-izbacivac'),
  D('dZakretniPogon', DS, 'Zakretni pneumatski pogon', 'Zakretni cilindar okreće ruku između spremnika i dizala ispitne stanice. Kut je podesiv graničnicima; u ovoj liniji 180°.',
    [['Kut', '180° (podesivo)'], ['Ventili', 'Q0.3 prema spremniku, Q0.4 prema sljedećoj stanici']], 'AALTO1, PHIL, VUC19, ACAD', 'vakuum-zakretna-ruka', { pretpostavka: true, napomena: 'Kut zakreta: izvori navode 90°–270° ili 0–180°.' }),
  D('dRuka', DS, 'Ruka modula za premještanje', 'Laka ruka na osovini zakretnog pogona nosi vakuumsku sisaljku na kraju. Duljina ruke određuje da sisaljka stane točno iznad mjesta uzimanja i iznad dizala.',
    [['Duljina (procjena)', mm(MJERE.dist.ruka.duljina)]], 'AALTO1, foto', 'vakuum-zakretna-ruka', { pretpostavka: true, napomena: 'Duljina ruke procijenjena iz rasporeda.' }),
  D('dSisaljka', DS, 'Vakuumska sisaljka', 'Gumena sisaljka prianja na gornju plohu izratka. Kad generator vakuuma isisa zrak, tlak okoline drži izradak; otpuhivanjem se izradak odvaja.',
    [['Hvat', 'gornja ploha kućišta']], 'AALTO1, PHIL', 'vakuum-zakretna-ruka'),
  D('dEjektor', DS, 'Generator vakuuma (ejektor)', 'Mlaz stlačenog zraka kroz sapnicu stvara podtlak (Venturijev učinak) — vakuum bez pumpe. Q0.1 uključuje vakuum, Q0.2 daje kratki mlaz za otpuhivanje.',
    [['Izlazi', 'Q0.1 vakuum, Q0.2 otpuhivanje']], 'AALTO1, ACAD', 'vakuum-zakretna-ruka'),
  D('dVakuumPrekidac', DS, 'Vakuumski prekidač', 'Mjeri podtlak u vodu sisaljke: kad podtlak prijeđe namješteni prag, izradak je sigurno prihvaćen (I0.3) i ruka se smije zakrenuti.',
    [['Signal', 'I0.3']], 'AALTO1, ACAD', 'vakuum-zakretna-ruka'),
  D('dMikroprekidaci', DS, 'Mikroprekidači zakretnog pogona', 'Dva mikroprekidača s ručicom javljaju krajnje položaje ruke: kod spremnika (I0.4) i kod sljedeće stanice (I0.5).',
    [['Signali', 'I0.4, I0.5']], 'AALTO1, ACAD', 'vakuum-zakretna-ruka'),
  /* ---------------- Ispitna */
  D('tModulPrepoznavanja', IS, 'Modul za prepoznavanje', 'Na donjem položaju dizala tri senzora gledaju izradak sa strane: kapacitivni, optički i induktivni. Iz njihove kombinacije upravljač zna boju i materijal.',
    [['Senzori', 'kapacitivni, optički, induktivni']], 'AALTO1, AALTO2, VUC19', 'senzori-boja-materijal'),
  D('tKapacitivni', IS, 'Kapacitivni senzor', 'Reagira na promjenu kapaciteta pred čelom senzora — vidi svaki izradak, i plastični i metalni. Jedini od tri senzora koji pouzdano vidi crni izradak, pa služi kao „izradak prisutan”.',
    [['Signal', 'I0.0'], ['Vidi', 'svaki izradak']], 'AALTO1, VUC19, ACAD', 'senzori-boja-materijal'),
  D('tOpticki', IS, 'Optički difuzni senzor', 'Šalje svjetlo i mjeri koliko se odbije od izratka: crveno i metalno odbijaju dovoljno, crno premalo. Tako razlikuje crno od crvenog i metala.',
    [['Signal', 'I0.1 (crno = 0)']], 'AALTO1, VUC19, ACAD', 'senzori-boja-materijal'),
  D('tInduktivni', IS, 'Induktivni senzor', 'Izmjenično magnetsko polje pred čelom stvara vrtložne struje samo u metalu, pa senzor javlja samo aluminijski izradak.',
    [['Signal', 'I0.7 (pp)'], ['Vidi', 'samo metal']], 'AALTO1, VUC19', 'senzori-boja-materijal', { pretpostavka: true, napomena: 'Adresa signala nije nađena.' }),
  D('tDizalo', IS, 'Dizalo (cilindar bez klipnjače)', 'Cilindar bez klipnjače nosi platformu s izratkom iz položaja prepoznavanja u mjerni položaj. Klip unutar cijevi povezan je s kliznim nosačem, pa je hod velik, a ugradbena duljina mala.',
    [['Hod (procjena)', mm(MJERE.isp.dizalo.hod)], ['Ventili', 'Q0.0 dolje, Q0.1 gore']], 'AALTO1, AALTO2, VUC19, ACAD', 'mjerenje-visine'),
  D('tSenzoriDizala', IS, 'Senzori dizala gore i dolje', 'Induktivni senzori uz vodilicu javljaju gornji (I0.4) i donji (I0.5) položaj platforme.',
    [['Signali', 'I0.4, I0.5']], 'AALTO1, ACAD', 'mjerenje-visine'),
  D('tLancaniVodic', IS, 'Lančani vodič kabela', 'Crni lančani vodič vodi kabele i cijevi do pokretne platforme dizala, tako da se kod dizanja i spuštanja ne savijaju preko dopuštenog polumjera.',
    [['Na fotografijama', 'uz okomitu os dizala']], 'foto', 'mjerenje-visine', { pretpostavka: true, napomena: 'Opažanje s fotografija.' }),
  D('tMjerniModul', IS, 'Mjerni modul', 'Na vrhu dizala mjerni cilindar spušta ticalo analognog senzora visine na gornju plohu izratka. Napon senzora proporcionalan je visini.',
    [['Cilindar', 'Q0.4 (pp)'], ['Senzor', 'analogni, linearni potenciometar']], 'AALTO1, VUC19', 'mjerenje-visine', { pretpostavka: true, napomena: 'Adresa mjernog cilindra je pretpostavka.' }),
  D('tAnalogniSenzor', IS, 'Analogni senzor visine i prag', 'Senzor daje napon prema visini. Kad upravljač nema analogni ulaz, komparator s pragom daje binarni signal „visina OK” — tako je izvedeno u završnom radu o ovoj liniji.',
    [['Prag (procjena)', mm(MJERE.isp.pragVisine)], ['Signal', 'I0.3']], 'VUC19, AALTO1', 'mjerenje-visine', { pretpostavka: true, napomena: 'Prag nije objavljen.' }),
  D('tIzbacivac', IS, 'Izbacivač ispitne stanice', 'Cilindar na platformi dizala gura izradak s platforme: na vrhu na zračni klizač prema obradnoj stanici, na dnu na klizač škarta.',
    [['Ventil', 'Q0.2'], ['Senzor', 'I0.6 uvučen']], 'AALTO1, ACAD', 'mjerenje-visine'),
  D('tZracniKlizac', IS, 'Zračni klizač', 'Klizač sa zračnim jastukom: zrak kroz sitne rupe podiže izradak, pa on klizi gotovo bez trenja do ulaznog gnijezda okretnog stola. Zrak se uključuje samo za predaju (Q0.3).',
    [['Izlaz', 'Q0.3'], ['Duljina (model)', mm(MJERE.isp.zracniKlizac.do[0] - MJERE.isp.zracniKlizac.od[0])]], 'ACAD, AALTO2', 'stationlink'),
  D('tKlizacSkarta', IS, 'Klizač škarta', 'Kosi klizač ispod zračnog klizača prima izratke koji nisu prošli provjeru, do 3 komada. Kad je pun, stanica čeka da ga operater isprazni.',
    [['Kapacitet', '3 izratka']], 'AALTO1, ACAD', 'mjerenje-visine'),
  D('tBarijera', IS, 'Sigurnosna svjetlosna barijera', 'Svjetlosna barijera nad dizalom prekida kretanje kad je ruka u području dizala.',
    [['Signal', 'I0.2']], 'ACAD', 'mjerenje-visine', { pretpostavka: true, napomena: 'Izvedba i položaj barijere na ovoj liniji nisu poznati.' }),
  /* ---------------- Obradna */
  D('oStol', OS, 'Okretni stol', 'Aluminijski disk sa šest gnijezda okreće DC motor preko prijenosnika; na svakom koraku stol stane na senzoru položaja. Dok se na jednom mjestu buši, na drugom se ispituje, a na trećem robot uzima izradak — stol je takt stanice.',
    [['Gnijezda', String(OB.stol.gnijezda)], ['Korak', '60°'], ['Promjer (procjena)', mm(OB.stol.polumjer * 2)]], 'VIC19, TUE, PATRAS, foto', 'okretni-stol', { pretpostavka: true, napomena: 'Broj koraka: izvori navode 6 položaja ili korak 90°; na fotografijama 6 gnijezda.' }),
  D('oGnijezda', OS, 'Gnijezda okretnog stola', 'Plitka udubljenja Ø40 mm drže kućište na mjestu tijekom okretanja i bušenja. Mjesta: ulaz, ispitivanje, bušenje, izlaz prema robotu i dva slobodna.',
    [['Mjesta', 'ulaz 180°, ispitivanje 120°, bušenje 60°, izlaz 0°']], 'TUE, foto', 'okretni-stol', { pretpostavka: true, napomena: 'Raspored mjesta procijenjen s fotografija.' }),
  D('oMotorStola', OS, 'DC motor okretnog stola', 'Istosmjerni motor 24 V s reduktorom pokreće stol preko releja (Q0.0). Upravljač ga zaustavlja kad senzor položaja javi sljedeće gnijezdo.',
    [['Izlaz', 'Q0.0'], ['Napon', '24 V DC']], 'VIC19, PATRAS', 'okretni-stol'),
  D('oSenzorPolozaja', OS, 'Induktivni senzor položaja stola', 'Ispod stola vidi metalne oznake (vijke) na svakom koraku i javlja da je stol u položaju (I0.4).',
    [['Signal', 'I0.4']], 'VIC19, PATRAS', 'okretni-stol'),
  D('oSenzoriPrisutnosti', OS, 'Senzori prisutnosti na mjestima', 'Kapacitivni senzori ispod ulaza, ispitivanja, bušenja i izlaza javljaju je li gnijezdo zauzeto.',
    [['Signali', 'I0.0–I0.3']], 'PATRAS', 'okretni-stol', { pretpostavka: true, napomena: 'Broj i vrsta senzora prisutnosti procijenjeni.' }),
  D('oIspitivac', OS, 'Modul za ispitivanje', 'Cilindar spušta ticalo u izradak: ako ticalo dođe do donjeg položaja, izradak je ispravno položen (otvorom gore). Krivo položen izradak ne smije na bušenje.',
    [['Izlaz', 'Q0.5'], ['Senzor', 'I0.5']], 'TUE, VIC19, AALTO2', 'busenje-provjera'),
  D('oBusilica', OS, 'Modul za bušenje', 'Bušilica s DC motorom na linearnoj osi: upravljač uključi vreteno, spusti bušilicu do donjeg položaja, zadrži nekoliko sekundi i vrati je gore. Bušenje je prikazano kao postupak, bez skidanja čestica.',
    [['Motor', 'Q0.1'], ['Os', 'Q0.2 dolje, Q0.3 gore'], ['Senzori', 'I0.6 gore, I0.7 dolje']], 'TUE, PATRAS, VIC19', 'busenje-provjera'),
  D('oStezanje', OS, 'Stezni cilindar', 'Mali cilindar pritišće izradak u gnijezdo dok se buši, da se ne okreće s alatom.',
    [['Izlaz', 'Q0.4']], 'TUE, PATRAS', 'busenje-provjera'),
  D('oIzlaz', OS, 'Izlazno mjesto prema robotu', 'Zadnje mjesto prije slobodnih gnijezda: upravljač robotu javlja „izradak spreman” (Q0.6 → ulaz 0 robota), a stol se ne okreće dok robot ne preuzme izradak. Sortirni izbacivač na ovoj stanici nije potvrđen.',
    [['Signal', 'Q0.6 → DUM1 ulaz 0'], ['Povratno', 'DUM1 izlaz 0 → I1.5']], 'VIC19', 'plc-robot-rukovanje', { pretpostavka: true, napomena: 'Dodjela signala prema robotu je pretpostavka.' }),
  /* ---------------- Robotska i montažna */
  D('rRobot', RS, 'Robot Mitsubishi RV-M1', 'Petoosni vertikalni zglobni robot s motornom prihvatnicom. Na liniji izvodi program u jeziku Movemaster iz upravljačke jedinice DUM1 i s upravljačima stanica razgovara preko ulaza i izlaza. Građa, pogoni i naredbe obrađeni su u području robota.',
    [['Osi', '5'], ['Nosivost', '1,2 kg'], ['Upravljanje', 'DUM1, jezik Movemaster']], 'VIC19, POLSL07, POLSL08', 'montaza-cilindra'),
  D('rPrihvatnica', RS, 'Motorna prihvatnica HM-01', 'Dvoprstna prihvatnica s DC motorom: GC zatvara, GO otvara, a silu određuje naredba GP. Prsti obuhvaćaju kućište Ø40 mm, klip, oprugu i poklopac.',
    [['Naredbe', 'GO, GC, GP']], 'VIC19', 'montaza-cilindra'),
  D('rCelicnaPloca', RS, 'Čelična ploča robota', 'Plavo-siva čelična ploča na Al-profilnoj ploči nosi robot i raspodjeljuje sile pri ubrzanju.',
    [['Mjere (procjena)', '320 × 380 × 15 mm']], 'foto', 'montaza-cilindra'),
  D('rGnijezdo', RS, 'Montažno gnijezdo', 'Plavi blok s džepom Ø40 mm drži kućište dok robot umeće klip, oprugu i poklopac. Senzori javljaju prisutnost kućišta i boju.',
    [['Mjere (procjena)', '80 × 70 × 65 mm'], ['Senzori', 'ulaz 1 (nije crno), ulaz 2 (prisutno)']], 'IP-RS15, foto', 'montaza-cilindra', { pretpostavka: true, napomena: 'Uloga plavog bloka (montažno gnijezdo) zaključena s fotografija.' }),
  D('rSenzorBoje', RS, 'Senzor boje u gnijezdu', 'Difuzni optički senzor razlikuje „crno / nije crno”; o tome ovisi koji klip robot uzima. U Festovoj inačici iz 2015. senzor je u prihvatnici.',
    [['Signal', 'DUM1 ulaz 1']], 'IP-RS15, FC-238', 'montaza-cilindra', { pretpostavka: true, napomena: 'Smještaj senzora na ovoj liniji nije poznat.' }),
  D('rPaleta', RS, 'Paleta klipova', 'Dva reda po četiri mjesta: crni klipovi za crveno i aluminijsko kućište, srebrni za crno. Robot točku računa naredbom PT iz kutova palete i brojila, pa program nema posebnu točku za svaki klip.',
    [['Mjesta', '2 × ' + RP.paleta.mjesta], ['Naredbe', 'PA, PT, IC, CP']], 'IP-RS15', 'montaza-cilindra', { pretpostavka: true, napomena: 'Paleta klipova nije prepoznata na fotografijama; prema Festovom modulu za montažu.' }),
  D('rSpremnikPoklopaca', RS, 'Spremnik poklopaca', 'Široka prozirna cijev s poklopcima; cilindar u podnožju izbacuje najdonji poklopac na mjesto uzimanja kad robot uključi izlaz 2.',
    [['Kapacitet (procjena)', String(RP.spremnikPoklopaca.kapacitet)], ['Signali', 'izlaz 2 / ulaz 4']], 'IP-RS15, foto', 'montaza-cilindra', { pretpostavka: true, napomena: 'Uloga cijevi: vidi sukob „Uloga dviju prozirnih cijevi”.' }),
  D('rSpremnikOpruga', RS, 'Spremnik opruga', 'Uska prozirna cijev s oprugama; razdvajač u podnožju izdaje jednu oprugu kad robot uključi izlaz 1.',
    [['Kapacitet (procjena)', String(RP.spremnikOpruga.kapacitet)], ['Signali', 'izlaz 1 / ulaz 3']], 'IP-RS15, foto', 'montaza-cilindra', { pretpostavka: true, napomena: 'Uloga cijevi: vidi sukob „Uloga dviju prozirnih cijevi”.' }),
  D('rCilindriSpremnika', RS, 'Cilindri spremnika', 'Dvoradni cilindri u aluminijskim podnožjima cijevi; robot ih upravlja izravno preko svojih izlaza, bez PLC-a.',
    [['Ventili', 'DUM1 izlazi 1 i 2']], 'IP-RS15, foto', 'plc-robot-rukovanje'),
  D('rIzlaz', RS, 'Izlazni klizač gotovih cilindara', 'Kosi klizač na koji robot odlaže sklopljene cilindre; senzor na kraju javlja da je pun (ulaz 5 = 0) i robot tada čeka.',
    [['Kapacitet (procjena)', String(RP.izlaz.kapacitet)]], 'IP-RS15', 'montaza-cilindra', { pretpostavka: true, napomena: 'Izlazni klizač nije prepoznat na fotografijama.' }),
  D('rSucelje', RS, 'Sučelje robota (I/O)', 'Stezaljke i kabel između upravljača stanica, senzora montaže i I/O kartice DUM1 (' + KONFIG.ioKartica + ': ' + IO_N + ' ulaza / ' + IO_N + ' izlaza). SW1 bit 5 na DUM1 omogućuje START s kartice.',
    [['Kartica', KONFIG.ioKartica], ['Preklopnik', 'SW1 bit 5 = 1']], 'VIC19', 'plc-robot-rukovanje', { pretpostavka: true, napomena: 'Raspored pinova i dodjela signala nisu nađeni.' }),
  /* ---------------- Izradci */
  D('iKuciste', IZR, 'Kućište cilindra', 'Kućište Ø40 mm s provrtom: crveno i crno su plastika, aluminijsko je metal. Crveno i aluminijsko visoki su 25 mm, crno 22,5 mm — zato crno pada na provjeri visine kad je prag 25 mm.',
    [['Promjer', '40 mm'], ['Visina', 'crveno, alu 25 mm; crno 22,5 mm'], ['Materijal', 'plastika / aluminij']], 'FC-200', 'senzori-boja-materijal'),
  D('iSkart', IZR, 'Kućišta za škart', 'Kućišta namjerno krive visine, 23 i 24 mm, po dva od svake boje. Služe za provjeru da ispitna stanica pouzdano odbacuje.',
    [['Visine', '23 i 24 mm'], ['Kataloški broj', '534368']], 'FC-200', 'mjerenje-visine'),
  D('iKlip', IZR, 'Klip', 'Klip sa svornjakom ulazi u provrt kućišta. Crni klip ide u crveno i aluminijsko kućište, srebrni (metalni) u crno.',
    [['Promjer (procjena)', mm(IZ.klip.promjer)], ['Visina (procjena)', mm(IZ.klip.visina)]], 'IP-RS15', 'montaza-cilindra', { pretpostavka: true, napomena: 'Mjere klipa nisu objavljene.' }),
  D('iOpruga', IZR, 'Opruga', 'Tlačna opruga stavlja se na svornjak klipa; vraća klip kad se cilindar „rastereti”.',
    [['Promjer (procjena)', mm(IZ.opruga.promjer)], ['Visina (procjena)', mm(IZ.opruga.visina)]], '—', 'montaza-cilindra', { pretpostavka: true, napomena: 'Mjere opruge nisu objavljene.' }),
  D('iPoklopac', IZR, 'Poklopac', 'Poklopac Ø40 mm zatvara kućište i zabravljuje se zakretom (bajunet). Komplet ima poklopce bez rupe za klipnjaču; rupu probija stanica za probijanje.',
    [['Promjer', '40 mm'], ['Visina (procjena)', mm(IZ.poklopac.visina)], ['Komplet', '50 kom. (162240)']], 'FC-200', 'montaza-cilindra', { pretpostavka: true, napomena: 'Visina poklopca nije objavljena.' }),
  D('iCilindar', IZR, 'Sklopljeni cilindar', 'Kućište s klipom, oprugom i zabravljenim poklopcem — gotov proizvod linije. Komplet se može više puta sklopiti i rastaviti.',
    [['Komplet', '7 crnih, 7 crvenih, 7 aluminijskih (162239)']], 'FC-200, IP-RS15', 'montaza-cilindra')
];

const _PO_ID = new Map(DIJELOVI.map((d) => [d.id, d]));
export function nadjiDio(id) { return _PO_ID.get(id) || null; }
export function dijeloviSkupine(sk) { return DIJELOVI.filter((d) => d.skupina === sk); }
export function dijeloviTeme(tema) { return DIJELOVI.filter((d) => d.tema === tema); }
export function izvoriDijela(d) {
  return String(d.izvor || '').split(',').map((s) => s.trim()).filter((k) => k && k !== '—').map((k) => ({ kratica: k, naziv: (IZVORI[k] || {}).naziv || k, url: (IZVORI[k] || {}).url || '' }));
}
export function uScenu(x, y, z = 0) { return [x, z, -y]; }

export const TEKST_PRETPOSTAVKE = 'Podaci označeni kao pretpostavka nisu pronađeni u dostupnoj dokumentaciji: procijenjeni su s fotografija linije ili izračunati iz objavljenih brojeva. Sukob znači da se izvori ne slažu; koristi se navedena vrijednost. „Nedostaje” znači da podatak treba očitati na liniji. Festov priručnik za robotsku stanicu s RV-M1 nije nađen, pa se veza robota s linijom oslanja na opis iz završnih radova i na novije Festove stanice. Kad se podatak potvrdi, ispravlja se na jednom mjestu i oznaka nestaje.';
nedostaje('Festov priručnik „MPS Robot station RV-M1”', 'Nije nađen ni na Festovom portalu ni na stranicama s priručnicima; stare Festove stranice (1998.–2004.) nisu provjerene.');
nedostaje('Raspored pinova i signali I/O kartice RV-M1 na liniji', 'Broj ulaza i izlaza standardne kartice i dodjela signala (start, kraj, greška) treba očitati na kartici ili u Mitsubishijevu priručniku.');
nedostaje('Mjere klipa, opruge i poklopca', 'Izmjeriti na izradcima u laboratoriju; model koristi procjene.');

export function pretpostavke() {
  const out = [], vidjeno = new Set();
  const dodaj = (o) => { const k = o.vrsta + '|' + o.sto + '|' + o.napomena; if (vidjeno.has(k)) return; vidjeno.add(k); out.push(o); };
  _REG.forEach((r) => dodaj({ ...r }));
  DIJELOVI.forEach((d) => { if (d.pretpostavka && d.napomena) dodaj({ vrsta: 'pretpostavka', sto: d.naziv, vrijednost: '', napomena: d.napomena, id: d.id }); });
  return out;
}
export { TL_ZADANO, MJ_RV };
