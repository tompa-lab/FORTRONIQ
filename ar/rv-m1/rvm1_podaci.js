/* FORTRONIQ · Robot Mitsubishi Movemaster EX RV-M1 — JEDINI izvor istine (brojevi, nazivi, opisi, inačice, pretpostavke).
   Model (rvm1_model.js), kinematika (rvm1_kin.js), interpreter (rvm1_mrl.js), stranice i AR čitaju SAMO odavde.
   Podatke o jeziku i privjesku (NAREDBE, PRIVJESAK, POGRESKE, RS232, DUM1 — preklopnici i ponašanje) piše agent „Interpreter”
   u rvm1_jezik_podaci.js; ova datoteka ih samo prosljeđuje (export * na kraju) i NE definira ta imena.
   Izvor činjenica: PODACI_RVM1.md i PODACI_MPS.md (istraživanje 18. 10. 2026.); kratice izvora su u IZVORI.

   KAKO SE MIJENJA PODATAK (kad Tomislav izmjeri robot)
   - Potvrđena vrijednost: zamijeni  pp('…', 0.300, '…')  sa  0.300  — pretpostavka nestaje sa stranica.
   - Nova procjena: omotaj broj u pp(sto, vrijednost, napomena, prikaz).
   - Sukob izvora: sukob(sto, vrijednost, napomena, prikaz) — vrijednost se koristi, a sukob se ispisuje.
   - Podatak koji nedostaje: nedostaje(sto, napomena) vraća null i upisuje se u popis.
   - Inačica: prekidač u KONFIG (ioKartica, prihvatnica, privjesak, simRV, smjerJ1, osXY).
   Jedinice u kodu: metri i radijani. Na zaslonu (kao na robotu): mm na 0,1 mm i ° na 0,1°. Polja …Deg su u stupnjevima, vMax u °/s.
   KS robota: X naprijed, Y lijevo, Z gore; ishodište na montažnoj plohi podnožja, u osi J1.
   © ForTroniQ d.o.o. */
import * as J_ from './rvm1_jezik_podaci.js';

/* ================================================================== prekidači inačice */
export const KONFIG = {
  osXY: 'x-naprijed',      // 'x-naprijed' (naš zapis, kao KUKA/UR3e) | 'x-lijevo' (Mitsubishijev priručnik po OCR-u: X+ lijevo, Y+ naprijed) — uskladiti s očitanjem WH
  smjerJ1: 'ccw',          // 'ccw' (pozitivno suprotno kazaljci gledano odozgo, naš zapis) | 'cw' (priručnik po OCR-u: J1+ u smjeru kazaljke)
  ioKartica: 'A8B8',       // 'A8B8' (8 ulaza / 8 izlaza, kao SIM RV) | 'A16B16'
  prihvatnica: 'HM-01',    // 'HM-01' (motorna) | 'pneumatska' | null
  privjesak: true,
  simRV: true,
  stanica: 'mps-robot'     // robot na kolicima Festo MPS robotske stanice
};

/* ================================================================== registar pretpostavki, sukoba i nedostajućih podataka
   (var bez inicijalizatora: rvm1_jezik_podaci.js smije uvesti pp/sukob/nedostaje i kod kružnog uvoza) */
var _REG;
const reg = () => (_REG || (_REG = []));
function zarez(n) { return String(Math.round(n * 1e6) / 1e6).replace('.', ','); }
function fmt(v) {
  if (typeof v === 'number') return zarez(v);
  if (Array.isArray(v)) return v.map(fmt).join(' / ');
  return String(v);
}
const mm = (v) => zarez(Math.round(v * 10000) / 10) + ' mm';
const RAD = Math.PI / 180;
/** pretpostavka: vrijednost se koristi, a na stranicama se ispisuje u popisu pretpostavki */
export function pp(sto, v, napomena, prikaz) { reg().push({ vrsta: 'pretpostavka', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** sukob izvora: koristi se navedena vrijednost, a druga je u napomeni */
export function sukob(sto, v, napomena, prikaz) { reg().push({ vrsta: 'sukob', sto, vrijednost: prikaz ?? fmt(v), napomena }); return v; }
/** podatak nije objavljen i nije procijenjen: vraća null, a na stranici se ispisuje „nedostaje” */
export function nedostaje(sto, napomena) { reg().push({ vrsta: 'nedostaje', sto, vrijednost: '[nedostaje]', napomena }); return null; }
const FOTO = 'procjena s fotografija robota na stanici (mjerilo: nadlaktica 250 mm), ±20 %';
const IZMJERITI = 'Izmjeriti na robotu.';

/* ================================================================== robot: natpisna pločica i osnovni podaci */
export const NAZIV_ROBOTA = 'Mitsubishi Movemaster EX RV-M1';
export const ROBOT = {
  model: 'RV-M1', naziv: 'Movemaster EX', proizvodjac: 'Mitsubishi Electric',
  gradja: 'vertikalni zglobni robot, 5 stupnjeva slobode (bez prihvatnice)',
  nosivostKg: 1.2, nosivost: '1,2 kgf, uključujući prihvatnicu; težište tereta 75 mm od prirubnice',
  masaKg: 19, ponovljivostMm: 0.3, brzinaPutanjeMmS: 1000,
  godinaIzrade: '2001-2 (robot), 2000-11 (upravljačka jedinica)',
  motoriW: [30, 30, 30, 11, 11],
  pogon: 'DC servo motori s četkicama, prijenos zupčastim remenom (J2, J3, J4)',
  mjerenje: 'inkrementalni enkoderi sa Z-fazom i granični prekidači za ishodište',
  kocnice: 'samo J2 (rame) i J3 (lakat)',
  pozicija: 629, retci: 2048, naredbi: 63,
  izvor: 'MAN, BRO, FOTO'
};
sukob('Nosivost s prihvatnicom ili bez nje', '1,2 kg uključujući prihvatnicu', 'Priručnik i prospekt navode 1,2 kgf uključujući prihvatnicu [MAN], [BRO]; sažeti španjolski priručnik navodi 1,2 kg bez prihvatnice [MSE].');

/* ================================================================== kinematika */
/* Kutovi (naša konvencija, pp): J1 = 0 ruka prema +X, pozitivno CCW gledano odozgo; J2 = kut nadlaktice od vodoravne (+90 = okomito);
   J3 = kut podlaktice prema nadlaktici (0 = ispružena, negativno savija prema dolje); J4 = nagib šake prema podlaktici; J5 = okret.
   P = J2 + J3 + J4 (nagib alata od vodoravne, −90 = prema dolje), R = J5. */
const D1 = pp('Visina osi ramena iznad montažne plohe (d1)', 0.250,
  'Pouzdana kota nije nađena. Kandidati su 300 mm (kota na slici 1.2 sažetog priručnika [MSE], bez oznake) i 367 mm (prospekt: „rame je 367 mm iznad baze” — nije jasno je li to os ili vrh kućišta) [BRO]. ' +
  'Mjerenje s fotografija (mjerilo: nadlaktica 250 mm) daje manju vrijednost, ≈ 200–250 mm od montažne plohe (nesigurno zbog perspektive); zato je zasad uzeto 250 mm (gornja granica mjerenja s fotografija), da model izgleda kao robot. ' + IZMJERITI, '250 mm (s fotografija; kandidati iz izvora 300 / 367)');
export const MJERE = {
  d1: D1,
  L2: 0.250,      /* nadlaktica rame–lakat [MAN], [BRO], [EPS], [UIS] */
  L3: 0.160,      /* podlaktica lakat–os nagiba šake [MAN], [BRO], [EPS], [UIS] */
  L4: 0.072,      /* os nagiba šake → prirubnica (S5) [EPS], [UIS] */
  gabarit: 0.697, sirinaRamena: 0.230,   /* [BRO] */
  /* --- vanjske mjere za model (procjene s fotografija; mijenjaju se kad stignu izmjere) */
  podnozje: {
    dubina: pp('Prirubnica podnožja: dubina (X)', 0.230, 'Kote baze 145, 168, 82, 250 mm [BRO] i 168, 60, 82, 254 mm [MAN, OCR] nisu povezane s crtežom; oblik i dubina s fotografija. ' + IZMJERITI, '230 mm'),
    sirina: sukob('Prirubnica podnožja: širina (Y)', 0.250, 'Prospekt navodi 250 mm [BRO], OCR priručnika 254 mm [MAN]; na što se kota odnosi nije jasno. ' + IZMJERITI, '250 mm (ili 254 mm)'),
    debljina: pp('Debljina prirubnice podnožja', 0.018, FOTO, '18 mm'),
    razmakRupaX: pp('Razmak provrta ø9 mm (X × Y)', 0.168, 'Kota 168 mm postoji u oba izvora [BRO], [MAN]; raspored provrta (4 u kutovima, vijci M8 × 30) iz priručnika, razmak procjena. ' + IZMJERITI, '168 × 210 mm'),
    razmakRupaY: 0.210, promjerRupe: 0.009,
    tijeloDolje: [0.185, 0.200],   /* lijevano tijelo kod prirubnice: X × Y (zaobljeni pravokutnik) */
    tijeloGore: 0.078,            /* polumjer kružnog presjeka ispod ležaja J1 */
    visinaLezaja: pp('Visina ležaja J1 (vrh lijevanog podnožja)', D1 - 0.105, 'Oblik podnožja (stožasto lijevano tijelo s kvadratnom prirubnicom, poklopcem sprijeda i kutijom priključaka straga) prema fotografijama; na fotografijama je ležaj J1 ≈ 90–105 mm ispod osi ramena, pa je visina izvedena kao d1 − 105 mm. ' + IZMJERITI, 'd1 − 105 mm'),
    prsten: 0.012,
    kutijaPrikljucaka: { dubina: 0.060, sirina: 0.150, visina: 0.095 }
  },
  struk: { polumjer: 0.074, vrat: [0.12, 0.13] },
  rame: {
    sirina: 0.190, duljinaNatrag: pp('Kućište ramena: duljina iza osi J2', 0.165, FOTO, '165 mm'),
    gore: 0.050, dolje: 0.058, polumjerKape: pp('Polumjer bočnih kapa ramena', 0.062, FOTO + '; širina ramena s kapama 230 mm je podatak [BRO]', 'Ø124 mm'), izbocenjeKape: 0.020, utor: 0.076
  },
  nadlaktica: { sirina: pp('Nadlaktica: širina (Y) i visina profila', 0.070, FOTO, '70 mm, profil ≈ 80 mm'), rRame: 0.042, rLakat: 0.038 },
  podlaktica: { sirina: pp('Podlaktica: širina (Y) i visina profila', 0.060, FOTO, '60 mm, profil ≈ 85 mm'), rLakat: 0.044, rSaka: 0.036, natrag: 0.050 },
  saka: { polumjer: pp('Polumjer crnog kućišta šake', 0.034, FOTO, 'Ø68 mm'), od: 0.024, prirubnicaR: 0.024 },
  prihvatnica: {
    tijelo: pp('Kućište prihvatnice HM-01 (smjer prstiju × dubina × duljina)', [0.068, 0.058, 0.070], FOTO + '; mjere HM-01 nisu u izvoru', '68 × 58 × 70 mm'),
    prst: [0.018, 0.016, 0.040]
  },
  /* upravljačka jedinica, privjesak, SIM RV — vanjske mjere nisu u izvorima */
  dum1: pp('Upravljačka jedinica DUM1: širina × visina × dubina', [0.360, 0.210, 0.400], 'Mjere nisu u dostupnim izvorima; procjena s fotografija (omjer prednje ploče ≈ 1,7 : 1). Masa 23 kg je s pločice.', '360 × 210 × 400 mm'),
  privjesak: pp('Privjesak: širina × duljina × debljina', [0.090, 0.215, 0.032], 'Mjere nisu u izvoru; procjena s fotografije (tipke ≈ 15 mm).', '90 × 215 × 32 mm'),
  simRV: pp('SIM RV: duljina × širina × visina', [0.200, 0.115, 0.055], 'SIM RV nije opisan ni u jednom izvoru; mjere s fotografije.', '200 × 115 × 55 mm')
};
pp('Vanjski oblik članaka i poklopaca', 'načelni oblik', 'Mitsubishi ne objavljuje vanjske mjere članaka; oblik modela je naš crtež iz fotografija i kinematičkih duljina (250 / 160 / 72 mm). Nadlaktica i podlaktica leže u ravnini osi J1 (nadlaktica u utoru kućišta ramena).', 'naš crtež s fotografija');

/* DH: standardni zapis T_i = Rz(θ_i)·Tz(d_i)·Tx(a_i)·Rx(α_i), izveden iz Crane–Duffy parametara [EPS], [UIS] (PODACI §2.2).
   Veza s našim kutovima: θ_i = J_i + pomak_i, pomak = (0, 0, 0, +90°, 0). Model i kinematika koriste geometrijski zapis istovjetan ovoj tablici. */
export const DH = {
  a: [0, MJERE.L2, MJERE.L3, 0, 0],
  d: [D1, 0, 0, 0, MJERE.L4],
  alpha: [90 * RAD, 0, 0, 90 * RAD, 0],
  pomak: [0, 0, 0, 90 * RAD, 0],
  izvor: 'EPS, UIS'
};
pp('Standardna DH tablica (θ, d, a, α)', 'izvedena', 'Gotova DH tablica za RV-M1 nije nađena; izvedena je iz Crane–Duffy parametara [EPS], [UIS]. Pomaci nula (θ offset) prema očitanjima robota nisu poznati — odrediti usporedbom s WH na stvarnom robotu.', 'd = (d1, 0, 0, 0, 72), a = (0, 250, 160, 0, 0), α = (90°, 0, 0, 90°, 0)');
pp('Konvencija kutova J1–J5', 'naš zapis', 'J2 kut nadlaktice od vodoravne, J3 kut podlaktice prema nadlaktici (0 = ispružena), J4 nagib šake prema podlaktici, P = J2 + J3 + J4. Kako robot sam prikazuje kutove (ishodište i predznak) nije u dostupnim izvorima.', 'J2 od vodoravne, J3 ≤ 0 savija prema dolje');
sukob('Predznak osi J3', '−110° … 0°', 'Sažeti priručnik daje 0 … +110° [MSE], a kinematički rad −110° ≤ θ3 ≤ 0° [EPS]; raspon od 110° se slaže, razlika je smjer mjerenja.');
sukob('Raspon osi J4', '±90°', 'OCR priručnika čita „190°” [MAN], a prospekt i oba sažeta priručnika ±90° [BRO], [MSE], [SMA]; vjerojatno pogreška prepoznavanja.');
pp('Smjer osi X i J1', KONFIG.osXY + ', J1 ' + KONFIG.smjerJ1, 'Prema OCR-u priručnika X+ je lijevo gledano sprijeda, Y+ naprijed, a J1+ u smjeru kazaljke gledano odozgo [MAN]; to zvuči neobično pa je za sada uzet zapis kao kod drugih robota (X naprijed, Y lijevo, J1+ suprotno kazaljci). Prekidači KONFIG.osXY i KONFIG.smjerJ1. Provjeriti s WH.', 'X naprijed, Y lijevo, J1+ CCW');

/* ================================================================== osi */
const NAZ_OSI = ['struk', 'rame', 'lakat', 'nagib šake', 'okret šake'];
const OZN = ['B', 'S', 'E', 'P', 'R'];
const ENG = ['waist', 'shoulder', 'elbow', 'wrist pitch', 'wrist roll'];
const OPSEG = [[-150, 150], [-30, 100], [-110, 0], [-90, 90], [-180, 180]];
const VMAX = [120, 72, 109, 100, 163];
const PRIJENOS = [
  pp('Prijenos J1', 'motor u podnožju, zupčanici', 'Izvori navode zupčaste remene samo za J2, J3 i J4 [MAN]; prijenos J1 nije opisan. U modelu: motor u podnožju sa zupčanikom na zupčastom vijencu struka.', 'načelno: zupčanik na vijencu'),
  'zupčasti remen od motora u kućištu ramena do remenice na osi ramena',
  pp('Prijenos J3', 'dva zupčasta remena', 'Remen J3 potvrđen je u održavanju [MAN]; da je motor u kućištu ramena i da remen ide kroz nadlakticu do lakta (dva stupnja) je pretpostavka iz građe robota.', 'motor u ramenu, remen kroz nadlakticu'),
  pp('Prijenos J4', 'zupčasti remen kroz podlakticu', 'Remen J4 potvrđen je [MAN]; motor u podlaktici kod lakta je pretpostavka.', 'motor u podlaktici, remen do šake'),
  pp('Prijenos J5', 'motor u kućištu šake, zupčanici', 'Prijenos J5 nije opisan; motor od 11 W u crnom kućištu šake je pretpostavka.', 'motor u šaci')
];
const SMJER = [
  'J1 = 0 ruka prema +X; pozitivno suprotno kazaljci gledano odozgo (prekidač KONFIG.smjerJ1)',
  'J2 = 0 nadlaktica vodoravno naprijed, +90° okomito; pozitivno podiže nadlakticu',
  'J3 = 0 podlaktica u produžetku nadlaktice; negativno savija podlakticu prema dolje',
  'J4 = 0 šaka u smjeru podlaktice; P = J2 + J3 + J4 = −90° alat gleda dolje',
  'J5 okret prirubnice oko osi alata; nakon NEST-a ≈ ±179,9°'
];
export const OSI = OPSEG.map(([lo, hi], i) => ({
  ime: 'J' + (i + 1), oznaka: OZN[i], naziv: NAZ_OSI[i], engleski: ENG[i],
  minDeg: lo, maxDeg: hi, min: lo * RAD, max: hi * RAD, raspon: hi - lo,
  vMax: VMAX[i], vMaxRad: VMAX[i] * RAD,
  motorW: ROBOT.motoriW[i], kocnica: i === 1 || i === 2, remen: i >= 1 && i <= 3,
  prijenos: PRIJENOS[i], enkoder: 'inkrementalni, A/B + Z-faza', granicni: true,
  smjer: SMJER[i], izvor: 'MAN, BRO, MSE, EPS'
}));

/* karakteristični položaji (rad, J1…J5) */
const deg = (a) => a.map((x) => x * RAD);
export const ORG = pp('Referentni položaj ORG / OG', deg([0, 90, -100, -80, 0]),
  'Ishodište kartezijskog sustava i referentni položaj su u dodatku priručnika koji nedostaje [MAN]. Sažeti priručnik kaže da OG postavlja sve zglobove na 0° [MSE] (sukob s [MAN]: OG ide u položaj zadan s HO). Za simulator: nadlaktica okomito, podlaktica malo prema dolje, šaka prema dolje (J4 unutar raspona, da ručno vođenje ne kreće s granice).',
  'J1 0°, J2 90°, J3 −100°, J4 −80°, J5 0°');
export const NEST = {
  redoslijed: [['J2', 'J3', 'J4'], ['J1', 'J5']],
  opis: 'Traženje mehaničkog ishodišta nakon uključenja: najprije J2, J3 i J4, zatim J1 i J5; granični prekidač javlja blizinu ishodišta, a točan položaj daje Z-faza enkodera.',
  q: pp('Kutovi zglobova nakon NEST-a', deg([0, 90, -100, -80, 179.9]),
    'Priručnik navodi samo da J5 nakon NEST-a pokazuje ≈ ±179,9° [MAN]; ostali kutovi mehaničkog ishodišta nisu u dostupnim izvorima. Za simulator: kao ORG, uz J5 = 179,9°.',
    'kao ORG, J5 = 179,9°'),
  vrijeme: pp('Trajanje NEST-a', 12, 'Nije u izvoru; simulator traži ishodište brzinom SP 3, faza po faza.', '≈ 12 s'),
  pokretanje: 'privjesak ON → NST, ENT; ili s računala (privjesak OFF) naredba NT; tijekom traženja svijetli EXECUTE',
  izvor: 'MAN'
};
pp('Postupak NEST u simulatoru', 'pojednostavljen', 'Stvarni robot traži prekidač malom brzinom, prođe ga i vrati se na Z-fazu; simulator prikazuje samo redoslijed osi i trajanje.', 'J2, J3, J4 → J1, J5');

/* ================================================================== brzine SP 0–9 */
const UDIO_SP = (sp) => (sp + 1) / 10;
export const BRZINE = Object.assign(
  Array.from({ length: 10 }, (_, sp) => ({ sp, udio: UDIO_SP(sp), mmS: Math.round(1000 * UDIO_SP(sp)) })),
  {
    zadano: pp('Brzina nakon uključenja', 4, 'Nije u izvoru. Privjesak tipkom MOV giba robot brzinom SP 4 [MAN], pa je ta brzina uzeta i kao početna.', 'SP 4'),
    privjesakMOV: 4,
    najveca: 1000,
    ubrzanje: pp('Vrijeme ubrzanja H / L', { H: 0.15, L: 0.4 }, 'Naredba SP n, H/L bira veliko ili malo ubrzanje [MSE]; iznosi nisu u izvoru.', 'H 0,15 s, L 0,4 s'),
    izvor: 'MAN, BRO, MSE'
  });
pp('Raspodjela brzina SP 0–9', 'linearno', 'Izvori navode 10 stupnjeva (0–9) i najviše 1000 mm/s [MAN], [BRO]; tablica brzina po stupnjevima nije nađena. Simulator: SP n = (n + 1)/10 najveće brzine osi (SP 9 = puna brzina).', 'SP n → (n + 1) × 10 %');
pp('Brzina ručnog gibanja s privjeska', 'SP 2', 'Promjena brzine ručnog gibanja nije nađena u izvorima; simulator giba s privjeska po zglobovima brzinom SP 2 (30 % najveće brzine osi), a u XYZ i TOOL s 50 mm/s.', 'PTP: SP 2; XYZ/TOOL: 50 mm/s');

/* ================================================================== alat */
export const TL_ZADANO = sukob('Zadana duljina alata TL (prirubnica → TCP)', 107,
  'Priručnik (OCR „l07mm”) [MAN] i kinematički rad [EPS] daju 107 mm za ugrađenu motornu prihvatnicu; drugi rad navodi 102 mm [UIS].', '107 mm (ili 102 mm)');
export const TL_ZADANO_M = TL_ZADANO / 1000;

/* ================================================================== motorna prihvatnica HM-01 */
export const PRIHVATNICA = {
  oznaka: 'HM-01', tip: 'motorna dvoprstna prihvatnica, DC servo motor', ugradena: KONFIG.prihvatnica,
  hod: 0.060, hodMm: 60, stupnjevaSile: 16,
  silaMaxKgf: sukob('Najveća sila držanja HM-01', 3.5, 'OCR priručnika čita „3.skgf” [MAN]; vrijednost 3,5 kgf treba provjeriti u izvorniku.', '≈ 3,5 kgf'),
  masaKg: sukob('Masa prihvatnice HM-01', 0.6, 'OCR priručnika čita „6009f” [MAN]; vjerojatno 600 gf.', '≈ 600 g'),
  vijek: 'više od 300 000 ciklusa',
  bezNapajanja: 'prihvatnica gubi silu držanja',
  gp: { min: pp('Raspon argumenata GP', 0, 'Rasponi GP nisu nađeni [MSE]; HM-01 ima 16 stupnjeva sile [MAN], pa je uzeto 0–15.', '0–15 (sila), vrijeme 0–99 × 0,1 s'), max: 15, vrijemeMax: 99, zadano: pp('Zadani GP nakon uključenja', [10, 6, 10], 'Nije u izvoru.', 'GP 10, 6, 10') },
  vrijemeHoda: pp('Trajanje punog otvaranja/zatvaranja', 0.6, 'Nije u izvoru; za animaciju.', '≈ 0,6 s'),
  sucelje: 'preklopnik HAND na stražnjoj ploči DUM1 mora biti na DC; AC je za pneumatsku prihvatnicu s AC elektroventilom (krivi položaj može spaliti izvor)',
  izvor: 'MAN, MRC'
};

/* ================================================================== upravljačka jedinica DUM1 — pločica i fizički podaci
   (preklopnici, LED-ice i ponašanje: DUM1 u rvm1_jezik_podaci.js) */
export const JEDINICA = {
  oznaka: 'DUM1', naziv: 'upravljačka jedinica (drive unit)',
  napajanje: 'AC 220 V, 50/60 Hz', snagaVA: 520, masaKg: 23, godina: '2000-11',
  snagaNapomena: 'priručnik 0,5 kVA, prospekt 500 VA pri 120 V, pločica 520 VA pri 220 V — inačica za drugu zemlju (pretpostavka)',
  memorija: { pozicija: 629, pozicijaKB: 8, redaka: 2048, retciKB: 16, pohrana: 'EPROM s ugrađenim programatorom ili statički RAM s baterijom BAT-M1 (≈ 2 godine)' },
  sucelja: ['Centronics (paralelno)', 'RS-232C (DB-25)', 'EXTERNAL I/O', 'TEACHING BOX', 'MOTOR POWER', 'MOTOR SIGNAL', 'EXT EMG STP'],
  prednja: ['POWER', 'EMG. STOP', 'ERROR', 'EXECUTE', 'START', 'STOP', 'RESET'],
  strazanja: ['CENTRONICS', 'RS-232C', 'EXTERNAL I/O', 'TEACHING BOX', 'MOTOR POWER', 'MOTOR SIGNAL', 'EXT EMG STP', 'uzemljenje', 'HAND AC/DC', 'osigurač 250 V AC / 10 A'],
  osiguracA: 10, kabelRobotaM: 5, kabelPrivjeskaM: 3,
  izvor: 'MAN, BRO, FOTO'
};
pp('Raspored elemenata stražnje ploče DUM1', 'naš crtež', 'Popis priključaka je iz priručnika [MAN]; raspored (kartice lijevo, hladnjak u sredini, mrežni modul desno) s fotografije, položaj pojedinih konektora pretpostavka.', 'kartice · hladnjak · mrežni modul');
pp('Unutrašnjost DUM1', 'načelni prikaz', 'Raspored ploča (servo pojačala, CPU, memorija, I/O kartica, transformator) nije opisan u dostupnim poglavljima priručnika; prikaz je načelan.', 'načelni raspored ploča');

/* ================================================================== simulator ulaza i izlaza SIM RV */
export const SIMRV = {
  naziv: 'SIM RV', opis: 'ručni simulator ulaza i izlaza za karticu A8/B8',
  ulazi: 8, izlazi: 8,
  prekidaci: Array.from({ length: 8 }, (_, b) => ({ bit: b, natpis: String(b) })),
  ledice: Array.from({ length: 8 }, (_, b) => ({ bit: b, natpis: String(b), boja: 'crvena' })),
  /* uloga i smjer signala: SIMRV_SIGNALI u rvm1_jezik_podaci.js (agent „Interpreter”) */
  signali: ((J_.SIMRV_SIGNALI && J_.SIMRV_SIGNALI.rukovanje) || []).map((r) => ({ id: r.id, vrsta: r.element === 'LED' ? 'LED' : 'prekidač', smjer: r.smjer, boja: r.boja, opis: r.opis })),
  power: { boja: 'zelena' },
  kartica: KONFIG.ioKartica,
  izvor: 'FOTO'
};
/* pretpostavke o SIM RV (uloga signala, pinovi) vodi rvm1_jezik_podaci.js */

/* ================================================================== robotska stanica Festo MPS (kolica i ploče) */
export const STANICA = {
  kolica: { sirina: 0.700, dubina: 0.700, visina: pp('Visina kolica MPS', 0.750, 'Izračun iz kataloga: stanica s kolicima 1654 mm − stanica 904 mm ≈ 750 mm [FC-188]; visina radne površine nije potvrđena.', '≈ 750 mm') },
  profilnaPloca: { debljina: pp('Debljina Al-profilne ploče', 0.032, 'Nije u izvoru; procjena s fotografije.', '32 mm'), korakUtora: 0.050, sirinaUtora: 0.008 },
  celicnaPloca: {
    mjere: pp('Čelična ploča ispod robota', [0.320, 0.380, 0.015], 'Priručnik traži čeličnu ploču najmanje 270 × 350 × 12 mm [MAN]; stvarne mjere ploče na stanici procjena s fotografije.', '320 × 380 × 15 mm'),
    polozaj: pp('Položaj robota na stanici', [-0.10, 0], 'Robot je na fotografijama u stražnjem dijelu kolica; točan položaj nije izmjeren.', '100 mm iza središta kolica')
  },
  upravljackaPloca: { elementi: ['START (s LED)', 'STOP', 'RESET (s LED)', 'ključ AUTO/MAN', '2 signalne lampice', 'crna gljiva (didaktički nužni stop)'], izvor: 'FC-198' },
  izvor: 'FC-190, FC-188, FC-198, MAN'
};

/* ================================================================== teme „Kako radi” */
export const TEME_POPIS = [
  { id: 'dc-motor-enkoder', naslov: 'DC motor s četkicama i inkrementalni enkoder' },
  { id: 'zupcasti-remen', naslov: 'Prijenos zupčastim remenom' },
  { id: 'kocnica', naslov: 'Kočnice J2 i J3 i ručno otpuštanje' },
  { id: 'nest', naslov: 'NEST — traženje mehaničkog ishodišta' },
  { id: 'zglobno-linearno', naslov: 'Zglobno i linearno gibanje (MO i MS)' },
  { id: 'ik-5-osi', naslov: 'Kinematika robota s 5 osi' },
  { id: 'alat-tl', naslov: 'Duljina alata TL i TCP' },
  { id: 'paleta', naslov: 'Paleta: točke rešetke (PA, PT)' },
  { id: 'io-rukovanje', naslov: 'Ulazi, izlazi i rukovanje STB/ACK, RDY/BUSY' },
  { id: 'rs232', naslov: 'Veza s računalom: RS-232C i naredbe čitanja' },
  { id: 'prihvatnica-sila', naslov: 'Motorna prihvatnica i sila stiska (GP)' },
  { id: 'pogreske', naslov: 'Pogreške I. i II. vrste' },
  { id: 'eprom-ram', naslov: 'Memorija: RAM s baterijom i EPROM' },
  { id: 'radni-prostor', naslov: 'Radni prostor i granice osi' },
  { id: 'servo-pojacalo', naslov: 'Servo pojačalo i regulacija položaja' },
  { id: 'privjesak-rad', naslov: 'Rad s privjeskom: učenje i provjera točaka' }
];

/* ================================================================== skupine i izvori */
const PS = 'Podnožje i struk', RN = 'Rame i nadlaktica', PL = 'Podlaktica', SK = 'Šaka', PG = 'Pogoni', PH = 'Prihvatnica HM-01',
  KB = 'Kabeli i konektori', DV = 'DUM1 — izvana', DU = 'DUM1 — iznutra', PV = 'Privjesak', SR = 'SIM RV', ST = 'Robotska stanica MPS';
export const SKUPINE = [PS, RN, PL, SK, PG, PH, KB, DV, DU, PV, SR, ST];

/* Na stranici se ne navode nazivi ustanova: izvori koji ih nose u nazivu ili domeni imaju url: '' i opisni naziv. */
export const IZVORI = {
  FOTO: { naziv: 'vlastite fotografije robota i natpisnih pločica, 2026.', url: '' },
  MAN: { naziv: 'Mitsubishi Electric: Industrial Micro-Robot System RV-M1 Movemaster EX, Instruction Manual (pogl. 1–10)', url: 'http://www.mitsubishirobot.com/Manual/rv-m1.pdf' },
  BRO: { naziv: 'Mitsubishi: prospekt Movemaster RV-M1 Micro Robot System', url: 'http://www.roboex.com/Brochure/mitsubishi%20robot%20rv-m1%20brochure.pdf' },
  MSE: { naziv: 'Mitsubishi RV-M1 — sažeti priručnik (španjolski, 26 str.)', url: 'https://www.manualslib.es/manual/721935/Mitsubishi-Rv-M1.html' },
  SMA: { naziv: 'Upute za rukovanje i održavanje robota RV-M1 (španjolski)', url: 'https://sistemasmanufactura.wordpress.com/wp-content/uploads/2011/11/robot-mantenimiento-rv-m1.pdf' },
  PDFC: { naziv: 'Industrijski robot RV-M1 — isječak priručnika (španjolski)', url: 'https://pdfcoffee.com/download/manual-operacion-robot-rv1-2-pdf-free.html' },
  EPS: { naziv: 'znanstveni članak: matrična inverzna kinematika manipulatora 5R RV-M1, 2012.', url: '' },
  UIS: { naziv: 'znanstveni članak: dinamički model manipulatora RV-M1 u SolidWorksu, 2016.', url: '' },
  UCP: { naziv: 'znanstveni članak: kinematika brzine i ubrzanja robota RV-M1, 2017.', url: '' },
  POL1: { naziv: 'znanstveni članak: simulacija i programiranje robota RV-M1 izvan linije, 2007.', url: '' },
  POL2: { naziv: 'znanstveni članak: program za simulaciju robota RV-M1, 2007.', url: '' },
  POL3: { naziv: 'znanstveni članak: mrežno sučelje za programiranje robota Movemaster, 2008.', url: '' },
  IPN: { naziv: 'diplomski rad: mikroupravljač i robot RV-M1, 2010.', url: '' },
  RWR: { naziv: 'Mitsubishi: priručnik za program Roboware', url: 'http://www.mitsubishirobot.com/Manual/roboware.pdf' },
  MRC: { naziv: 'mitsubishirobot.com — RV-M1', url: 'http://www.mitsubishirobot.com/RVM1.html' },
  CSU: { naziv: 'upute za robot Movemaster RV-M2 (srodni robot)', url: '' },
  RM501: { naziv: 'virtualni laboratorij: izravna kinematika robota RM-501 (prethodnik)', url: '' },
  MSX: { naziv: 'MSX Wiki: Mitsubishi Move Master II RM-501', url: 'https://www.msx.org/wiki/Mitsubishi_Move_Master_II_RM-501' },
  MZZ: { naziv: 'manualzz — stranica priručnika RV-M1', url: 'https://manualzz.com/doc/8635155/mitsubishi-rv-m1-instruction-manual' },
  'FC-188': { naziv: 'Festo Didactic: katalog MPS — skladišna stanica', url: '' },
  'FC-190': { naziv: 'Festo Didactic: katalog MPS — robotska stanica, kolica i ploče', url: '' },
  'FC-198': { naziv: 'Festo Didactic: katalog MPS — upravljačka ploča', url: '' }
};

/* ================================================================== dijelovi */
const RAZ = (i) => 'J' + (i + 1);
const POG_TXT = (i) => OSI[i].naziv;
const dioMotora = (i) => ({
  id: 'motorJ' + (i + 1), skupina: PG, naziv: `Motor ${RAZ(i)} (${POG_TXT(i)}), ${OSI[i].motorW} W`,
  opis: `Istosmjerni servo motor s trajnim magnetima i četkicama. Pojačalo u DUM1 regulira mu napon (a time brzinu i moment) prema razlici zadanog i izmjerenog položaja koji daje enkoder na stražnjem kraju osovine. ` +
    [
      'Pogoni okretanje struka; stoji u lijevanom podnožju iza prednjeg poklopca.',
      'Smješten je u stražnjem dijelu kućišta ramena, gdje ujedno uravnotežuje ruku; zupčastim remenom pogoni os ramena. Ima kočnicu.',
      'Smješten je u kućištu ramena uz motor J2; preko remenice na osi ramena i drugog remena kroz nadlakticu pogoni lakat. Ima kočnicu.',
      'Smješten je u podlaktici kod lakta; zupčastim remenom pogoni nagib šake.',
      'Mali motor u crnom kućištu šake; okreće prirubnicu s prihvatnicom.'
    ][i],
  podaci: [['Snaga (pločica)', OSI[i].motorW + ' W'], ['Vrsta', 'DC servo, četkice'], ['Najveća brzina osi', OSI[i].vMax + ' °/s'], ['Prijenos', OSI[i].prijenos]],
  izvor: 'MAN, BRO, FOTO', pretpostavka: true,
  napomena: 'Snaga je s pločice; položaj motora u robotu i izgled su pretpostavka (priručnik u dostupnom dijelu ne prikazuje unutrašnjost).', tema: 'dc-motor-enkoder'
});
const dioEnkodera = (i) => ({
  id: 'enkoderJ' + (i + 1), skupina: PG, naziv: `Enkoder ${RAZ(i)}`,
  opis: 'Inkrementalni enkoder na osovini motora: optički disk s prorezima daje dva pomaknuta niza impulsa (A i B — iz njihova redoslijeda slijedi smjer) i jedan impuls po okretaju (Z-faza). Upravljačka jedinica broji impulse; nakon uključenja broj nije poznat, zato je potreban NEST.',
  podaci: [['Vrsta', 'inkrementalni, A/B + Z'], ['Uloga Z-faze', 'točan položaj ishodišta pri NEST-u']],
  izvor: 'MAN, BRO', pretpostavka: true, napomena: 'Rezolucija enkodera i optička izvedba nisu u izvoru; prikaz je načelan.', tema: 'dc-motor-enkoder'
});
const dioGranicnog = (i) => ({
  id: 'granicniJ' + (i + 1), skupina: PG, naziv: `Granični prekidač ishodišta ${RAZ(i)}`,
  opis: `Mikroprekidač koji pri NEST-u javlja da je os ${RAZ(i)} blizu mehaničkog ishodišta; upravljačka jedinica zatim čeka prvi impuls Z-faze enkodera. Prekidači su tvornički podešeni i ne diraju se.`,
  podaci: [['Redoslijed NEST-a', i === 0 || i === 4 ? 'druga faza (J1, J5)' : 'prva faza (J2, J3, J4)']],
  izvor: 'MAN', pretpostavka: true, napomena: 'Položaj prekidača na robotu je pretpostavka.', tema: 'nest'
});
const dioKocnice = (i) => ({
  id: 'kocnicaJ' + (i + 1), skupina: PG, naziv: `Kočnica ${RAZ(i)} (${POG_TXT(i)})`,
  opis: `Elektromagnetska kočnica na motoru ${RAZ(i)}: bez struje opruga pritišće tarnu ploču i drži ruku da ne padne pod vlastitom težinom (nestanak napajanja, pogreška I. vrste, EMG STOP). Za ručno pomicanje ruke kočnice J2 i J3 otpuštaju se s privjeska uz SW1 bit 6 = ON, držeći ENT i pridržavajući ruku.`,
  podaci: [['Osi s kočnicom', 'samo J2 i J3'], ['Otpuštanje', 'SW1 bit 6 ON, privjesak ON, držati ENT']],
  izvor: 'MAN', pretpostavka: true, napomena: 'Izvedba kočnice (opružna, elektromagnetska) i položaj na motoru su pretpostavka; postojanje kočnica J2/J3 je iz priručnika.', tema: 'kocnica'
});

const PRIV = KONFIG.privjesak, SIM = KONFIG.simRV;
export const DIJELOVI = [
  /* ---------------- Podnožje i struk */
  { id: 'robot', skupina: PS, naziv: 'Robot ' + NAZIV_ROBOTA,
    opis: 'Vertikalni zglobni robot s pet osi (struk, rame, lakat, nagib i okret šake) za terete do 1,2 kg. Nadlaktica je 250 mm, podlaktica 160 mm, a od osi nagiba do prirubnice ima 72 mm. Pogone ga istosmjerni servo motori sa zupčastim remenima; upravlja ga jedinica DUM1, a programira se naredbama jezika Movemaster s privjeska ili računala.',
    podaci: [['Broj osi', '5 (+ prihvatnica)'], ['Nosivost', '1,2 kgf s prihvatnicom'], ['Masa', '19 kg'], ['Ponovljivost', '±0,3 mm'], ['Najveća brzina', '1000 mm/s'], ['Duljine članaka', '250 / 160 / 72 mm'], ['Izrada', '2001.']],
    izvor: 'MAN, BRO, FOTO', tema: 'ik-5-osi' },
  { id: 'podnozje', skupina: PS, naziv: 'Lijevano podnožje',
    opis: 'Nepomično tijelo robota od sivog lijeva, stožastog oblika: od kvadratne prirubnice sužava se do okruglog ležaja struka. Unutra je motor J1 s prijenosom; sprijeda ga zatvara poklopac, a straga je kutija s priključcima POWER i SIGNAL. U njegovoj osi je ishodište koordinatnog sustava robota.',
    podaci: [['Boja', 'siva'], ['Ishodište KS robota', 'montažna ploha, os J1'], ['Visina do ležaja J1 (pp)', mm(MJERE.podnozje.visinaLezaja)]],
    izvor: 'MAN, FOTO', pretpostavka: true, napomena: 'Oblik i visina podnožja s fotografija; kote baze nisu povezane s crtežom.', tema: 'radni-prostor' },
  { id: 'prirubnicaPodnozja', skupina: PS, naziv: 'Prirubnica podnožja',
    opis: 'Kvadratna lijevana ploča sa skošenim kutovima kojom robot leži na čeličnoj ploči. U kutovima su četiri provrta ø9 mm za vijke M8.',
    podaci: [['Mjere (pp)', mm(MJERE.podnozje.dubina) + ' × ' + mm(MJERE.podnozje.sirina)], ['Provrti', '4 × ø9 mm']],
    izvor: 'MAN, BRO, FOTO', pretpostavka: true, napomena: 'Mjere prirubnice: sukob 250 / 254 mm, dubina procjena.', tema: 'radni-prostor' },
  { id: 'vijciPodnozja', skupina: PS, naziv: 'Vijci za učvršćenje',
    opis: 'Robot se pričvršćuje s četiri vijka M8 × 30 na čeličnu ploču debljine najmanje 12 mm. Kruta podloga je nužna: pri brzom okretanju struka sile tromosti inače bi pomaknule robot i pokvarile ponovljivost.',
    podaci: [['Vijci', '4 × M8 × 30'], ['Podloga', 'čelična ploča ≥ 270 × 350 × 12 mm']], izvor: 'MAN', tema: 'radni-prostor' },
  { id: 'poklopacPodnozja', skupina: PS, naziv: 'Prednji poklopac podnožja',
    opis: 'Ravni maslinastosivi poklopac na prednjoj strani podnožja, pričvršćen s dva vijka. Iza njega je pristup motoru J1, prijenosu i graničnom prekidaču struka.',
    podaci: [['Boja', 'maslinastosiva']], izvor: 'FOTO', pretpostavka: true, napomena: 'Što je iza poklopca je pretpostavka.', tema: 'dc-motor-enkoder' },
  { id: 'kutijaPrikljucaka', skupina: PS, naziv: 'Kutija priključaka robota',
    opis: 'Izbočenje na stražnjoj strani podnožja s pločom na kojoj su dva višepolna konektora sa žičanim kopčama: POWER (struja motora i kočnica) i SIGNAL (enkoderi i prekidači). Na ploči su oznaka napona i oznaka uzemljenja.',
    podaci: [['Konektori', 'POWER, SIGNAL'], ['Kabeli do DUM1', '2 × 5 m']], izvor: 'FOTO, BRO', tema: 'pogreske' },
  { id: 'lezajJ1', skupina: PS, naziv: 'Ležaj struka (J1)',
    opis: 'Veliki kuglični ležaj na vrhu podnožja na kojem se okreće struk; vidi se kao sjajni čelični prsten između sivog podnožja i struka. Nosi cijelu ruku i prenosi momente prevrtanja na podnožje.',
    podaci: [['Raspon J1', '300° (−150° … +150°)'], ['Brzina J1', '120 °/s']], izvor: 'MAN, BRO, FOTO', pretpostavka: true, napomena: 'Vrsta ležaja je pretpostavka; prsten je vidljiv na fotografijama.', tema: 'radni-prostor' },
  { id: 'struk', skupina: PS, naziv: 'Struk (J1)',
    opis: 'Sivo lijevano tijelo iznad ležaja koje se okreće oko okomite osi J1 i nosi kućište ramena. Okretanje struka bira okomitu ravninu u kojoj radi ruka — zbog pet osi TCP uvijek leži u toj ravnini.',
    podaci: [['Os', 'J1 (B na privjesku)'], ['Raspon', '−150° … +150°'], ['Brzina', '120 °/s'], ['Motor', '30 W']], izvor: 'MAN, BRO, MSE', tema: 'ik-5-osi' },
  { id: 'granicnikJ1', skupina: PS, naziv: 'Mehanički graničnici struka',
    opis: 'Tvrdi graničnici na kraju hoda struka. Programski je hod ograničen na ±150°; graničnici zaustavljaju os tek ako regulacija zakaže, a udar u njih izaziva pogrešku I. vrste (prevelika servo pogreška, LED1).',
    podaci: [['Programske granice', '±150°']], izvor: 'MAN, MSE', pretpostavka: true, napomena: 'Izvedba i položaj graničnika su pretpostavka.', tema: 'radni-prostor' },
  { id: 'uvodnicaKabela', skupina: PS, naziv: 'Uvodnica spiralnih kabela',
    opis: 'Bijela kabelska uvodnica na stražnjem dijelu struka kroz koju spiralni kabeli ulaze u robot. Spiralni oblik dopušta okretanje struka bez napinjanja vodiča.',
    podaci: [['Održavanje', 'spiralni kabeli se pregledavaju']], izvor: 'MAN, FOTO', tema: 'pogreske' },

  /* ---------------- Rame i nadlaktica */
  { id: 'kucisteRamena', skupina: RN, naziv: 'Kućište ramena',
    opis: 'Bež plastično kućište koje obuhvaća os ramena s obje strane i produljuje se prema natrag. U stražnjem dijelu su motori J2 i J3 s kočnicama: njihova masa iza osi djelomično uravnotežuje ruku. U sredini je utor u kojem se giba nadlaktica.',
    podaci: [['Boja', 'bež (stara plastika)'], ['Najveća širina ramena', '230 mm'], ['Duljina iza osi (pp)', mm(MJERE.rame.duljinaNatrag)]],
    izvor: 'BRO, FOTO', pretpostavka: true, napomena: 'Smještaj motora J2/J3 u stražnjem dijelu kućišta je pretpostavka.', tema: 'zupcasti-remen' },
  { id: 'kapaRamenaD', skupina: RN, naziv: 'Bočna kapa ramena (desna)',
    opis: 'Okrugli bež poklopac na kraju osi ramena. Ispod njega je ležaj osi J2 i remenica remena J2.',
    podaci: [['Promjer (pp)', mm(2 * MJERE.rame.polumjerKape)]], izvor: 'FOTO', pretpostavka: true, napomena: 'Sadržaj ispod kape je pretpostavka.', tema: 'zupcasti-remen' },
  { id: 'kapaRamenaL', skupina: RN, naziv: 'Bočna kapa ramena (lijeva)',
    opis: 'Okrugli bež poklopac na drugom kraju osi ramena. Ispod njega je remenica remena J3 koja snagu motora J3 prenosi na remen u nadlaktici.',
    podaci: [['Promjer (pp)', mm(2 * MJERE.rame.polumjerKape)]], izvor: 'FOTO', pretpostavka: true, napomena: 'Sadržaj ispod kape je pretpostavka.', tema: 'zupcasti-remen' },
  { id: 'osRamena', skupina: RN, naziv: 'Os ramena (J2)',
    opis: 'Vodoravna os oko koje se nadlaktica podiže i spušta. Siječe os struka (pomak 0 mm), pa je kinematika ruke ravninski dvozglobni problem. Kočnica J2 drži ruku kad nema napajanja.',
    podaci: [['Os', 'J2 (S na privjesku)'], ['Raspon', '−30° … +100°'], ['Brzina', '72 °/s'], ['Visina osi (pp)', mm(D1)]], izvor: 'MAN, BRO, EPS, UIS', tema: 'ik-5-osi' },
  { id: 'nadlaktica', skupina: RN, naziv: 'Nadlaktica',
    opis: 'Svijetlosivi članak duljine 250 mm između ramena i lakta, zaobljenih krajeva. Unutra je zupčasti remen koji od ramena do lakta prenosi pogon osi J3.',
    podaci: [['Duljina (os–os)', '250 mm'], ['Masa članka', '≈ 5,0 kg'], ['Širina (pp)', mm(MJERE.nadlaktica.sirina)]], izvor: 'MAN, BRO, UIS, FOTO', tema: 'ik-5-osi' },
  { id: 'poklopacNadlaktice', skupina: RN, naziv: 'Ovalni poklopci nadlaktice',
    opis: 'Bočni poklopci nadlaktice pričvršćeni crnim vijcima. Skidaju se za pregled i napinjanje remena J3 te za zamjenu četkica.',
    podaci: [['Pričvršćenje', 'crni vijci']], izvor: 'MAN, FOTO', tema: 'zupcasti-remen' },
  { id: 'vijciPoklopaca', skupina: RN, naziv: 'Vijci poklopaca',
    opis: 'Crni vijci s cilindričnom glavom na rubovima ovalnih poklopaca nadlaktice i podlaktice.',
    podaci: [['Boja', 'crna']], izvor: 'FOTO', tema: 'zupcasti-remen' },
  { id: 'osLakta', skupina: RN, naziv: 'Os lakta (J3)',
    opis: 'Vodoravna os na vrhu nadlaktice oko koje se okreće podlaktica. Pogon dolazi remenom iz ramena; kočnica J3 sprječava da podlaktica padne.',
    podaci: [['Os', 'J3 (E na privjesku)'], ['Raspon', '110° (−110° … 0°)'], ['Brzina', '109 °/s']], izvor: 'MAN, BRO, MSE, EPS', tema: 'ik-5-osi' },
  { id: 'natpisnaPlocica', skupina: RN, naziv: 'Natpisna pločica robota',
    opis: 'Pločica s modelom, nosivošću, masom, datumom izrade i snagama motora po osima. Na stranicama se serijski broj ne prikazuje.',
    podaci: [['Model', 'RV-M1'], ['Nosivost', 'max. 1,2 kg'], ['Masa', '19 kg'], ['Motori', 'J1–J3 30 W, J4–J5 11 W'], ['Datum', '2001-2']],
    izvor: 'FOTO', pretpostavka: true, napomena: 'Položaj pločice na modelu je pretpostavka.', tema: 'dc-motor-enkoder' },

  /* ---------------- Podlaktica */
  { id: 'podlaktica', skupina: PL, naziv: 'Podlaktica',
    opis: 'Svijetlosivi članak duljine 160 mm od lakta do osi nagiba šake. Na stražnjem kraju je motor J4, a zupčasti remen kroz podlakticu pogoni nagib šake.',
    podaci: [['Duljina (os–os)', '160 mm'], ['Masa članka', '≈ 2,2 kg'], ['Širina (pp)', mm(MJERE.podlaktica.sirina)]], izvor: 'MAN, BRO, UIS, FOTO', tema: 'ik-5-osi' },
  { id: 'poklopacPodlaktice', skupina: PL, naziv: 'Ovalni poklopci podlaktice',
    opis: 'Bočni poklopci podlaktice s crnim vijcima; ispod njih su remen J4 i remenice. Uz rub poklopca ide crni kabel prema prihvatnici.',
    podaci: [['Pričvršćenje', 'crni vijci']], izvor: 'MAN, FOTO', tema: 'zupcasti-remen' },
  { id: 'kucisteJ4', skupina: PL, naziv: 'Donje kućište podlaktice',
    opis: 'Mala svijetla kutija ispod podlaktice kod lakta. Zatvara prostor motora J4 i prolaz kabela prema šaki.',
    podaci: [], izvor: 'FOTO', pretpostavka: true, napomena: 'Namjena kutije je pretpostavka.', tema: 'dc-motor-enkoder' },
  { id: 'osNagiba', skupina: PL, naziv: 'Os nagiba šake (J4)',
    opis: 'Os na prednjem kraju podlaktice oko koje se naginje šaka. Nagib alata od vodoravne je P = J2 + J3 + J4; robot ga drži stalnim pri linearnom gibanju.',
    podaci: [['Os', 'J4 (P na privjesku)'], ['Raspon', '±90°'], ['Brzina', '100 °/s'], ['Os → prirubnica', '72 mm']], izvor: 'MAN, BRO, MSE, EPS', tema: 'ik-5-osi' },

  /* ---------------- Šaka */
  { id: 'saka', skupina: SK, naziv: 'Šaka (nagib i okret)',
    opis: 'Crno kućište šake na kraju podlaktice: naginje se oko osi J4 i nosi motor i ležaj okreta J5. Zajedno s prihvatnicom je najlakši dio ruke (≈ 1,1 kg + 0,6 kg).',
    podaci: [['Osi', 'J4 nagib, J5 okret'], ['Masa (članak 4)', '≈ 1,05 kg']], izvor: 'MAN, UIS, FOTO', tema: 'ik-5-osi' },
  { id: 'kucisteOkreta', skupina: SK, naziv: 'Kućište okreta šake (J5)',
    opis: 'Crni valjak ispod osi nagiba u kojem je motor J5. Okreće prirubnicu s prihvatnicom za ±180°.',
    podaci: [['Os', 'J5 (R na privjesku)'], ['Raspon', '±180°'], ['Brzina', '163 °/s'], ['Motor', '11 W']], izvor: 'MAN, BRO, FOTO', tema: 'dc-motor-enkoder' },
  { id: 'prirubnicaSake', skupina: SK, naziv: 'Prirubnica šake',
    opis: 'Mehaničko sučelje za prihvatnicu ili alat, 72 mm od osi nagiba. Od njezine plohe mjeri se duljina alata TL; ponovljivost ±0,3 mm i brzina 1000 mm/s odnose se na nju.',
    podaci: [['Od osi J4', '72 mm'], ['Ponovljivost', '±0,3 mm'], ['Mjere prirubnice', 'nije nađeno']], izvor: 'MAN, BRO, EPS', tema: 'alat-tl' },
  { id: 'tcp', skupina: SK, naziv: 'Vrh alata (TCP)',
    opis: 'Točka čije koordinate X, Y, Z i nagib P te okret R robot pamti u pozicijama. Zadano je 107 mm ispred prirubnice (motorna prihvatnica); mijenja se naredbom TL.',
    podaci: [['Zadani TL', TL_ZADANO + ' mm'], ['Zapis točke', 'X, Y, Z [mm], P, R [°], O/C']], izvor: 'MAN, EPS, MSE', tema: 'alat-tl' },

  /* ---------------- Pogoni */
  ...[0, 1, 2, 3, 4].map(dioMotora),
  ...[0, 1, 2, 3, 4].map(dioEnkodera),
  ...[0, 1, 2, 3, 4].map(dioGranicnog),
  dioKocnice(1), dioKocnice(2),
  { id: 'prijenosJ1', skupina: PG, naziv: 'Prijenos struka (J1)',
    opis: 'Mali zupčanik na motoru J1 zahvaća zupčasti vijenac struka i smanjuje brzinu, a povećava moment. Prijenos J1 izvori ne opisuju.',
    podaci: [['Opis u izvoru', 'nije nađeno']], izvor: 'MAN', pretpostavka: true, napomena: PRIJENOS[0], tema: 'zupcasti-remen' },
  { id: 'remenJ2', skupina: PG, naziv: 'Zupčasti remen J2',
    opis: 'Remen sa zupcima prenosi okretanje s male remenice motora J2 na veliku remenicu osi ramena. Zupci ne proklizavaju, pa enkoder na motoru točno mjeri kut osi; omjer remenica smanjuje brzinu i povećava moment. Remen treba povremeno pregledati i napeti.',
    podaci: [['Održavanje', 'pregled, napinjanje, zamjena']], izvor: 'MAN, BRO', tema: 'zupcasti-remen' },
  { id: 'remenJ3', skupina: PG, naziv: 'Zupčasti remeni J3',
    opis: 'Prvi remen vodi od motora J3 do međuremenice na osi ramena, drugi kroz nadlakticu do remenice lakta. Budući da međuremenica leži na osi ramena, podizanje nadlaktice malo okreće i podlakticu — upravljačka jedinica to uzima u obzir.',
    podaci: [['Stupnjeva', '2 (pretpostavka)']], izvor: 'MAN, BRO', pretpostavka: true, napomena: PRIJENOS[2], tema: 'zupcasti-remen' },
  { id: 'remenJ4', skupina: PG, naziv: 'Zupčasti remen J4',
    opis: 'Remen kroz podlakticu od motora J4 do remenice osi nagiba šake.',
    podaci: [], izvor: 'MAN', pretpostavka: true, napomena: PRIJENOS[3], tema: 'zupcasti-remen' },
  { id: 'remenice', skupina: PG, naziv: 'Remenice',
    opis: 'Zupčaste remenice na motorima i osima. Omjer broja zubi izlazne i ulazne remenice je prijenosni omjer stupnja; točni omjeri nisu objavljeni.',
    podaci: [['Prijenosni omjeri', 'nije nađeno']], izvor: 'MAN', pretpostavka: true, napomena: 'Promjeri remenica u modelu su procjena.', tema: 'zupcasti-remen' },
  { id: 'prijenosJ5', skupina: PG, naziv: 'Prijenos okreta šake (J5)',
    opis: 'Zupčanici između motora J5 i prirubnice u kućištu šake.',
    podaci: [['Opis u izvoru', 'nije nađeno']], izvor: 'MAN', pretpostavka: true, napomena: PRIJENOS[4], tema: 'dc-motor-enkoder' },
  { id: 'cetkiceMotora', skupina: PG, naziv: 'Četkice motora',
    opis: 'Grafitne četkice dovode struju na kolektor rotora i preklapaju namote dok se rotor okreće. Troše se i periodično mijenjaju — to je glavna razlika prema današnjim robotima s motorima bez četkica.',
    podaci: [['Održavanje', 'zamjena četkica']], izvor: 'MAN', tema: 'dc-motor-enkoder' },
  { id: 'unutarnjiVodovi', skupina: PG, naziv: 'Unutarnji vodovi',
    opis: 'Snop vodiča od kutije priključaka do motora, kočnica, enkodera i prekidača te do priključka prihvatnice. Na prijelazu struka vodiči su u spiralnim kabelima.',
    podaci: [], izvor: 'MAN', pretpostavka: true, napomena: 'Trasa vodova u robotu je pretpostavka.', tema: 'pogreske' },

  /* ---------------- Prihvatnica HM-01 */
  { id: 'prihvatnica', skupina: PH, naziv: 'Motorna prihvatnica HM-01',
    opis: 'Crna dvoprstna prihvatnica s vlastitim DC servo motorom. Prsti se gibaju paralelno s hodom 0–60 mm; silu stiska regulira struja motora u 16 stupnjeva (naredba GP). Bez napajanja prihvatnica gubi silu držanja.',
    podaci: [['Hod', '0–60 mm'], ['Sila', '16 stupnjeva, do ≈ 3,5 kgf'], ['Masa', '≈ 600 g'], ['Vijek', '> 300 000 ciklusa'], ['Naredbe', 'GO, GC, GP, GF; O/C uz MO, MS…']],
    izvor: 'MAN, MRC, FOTO', tema: 'prihvatnica-sila' },
  { id: 'motorPrihvatnice', skupina: PH, naziv: 'Motor prihvatnice',
    opis: 'Mali DC motor u kućištu prihvatnice. Pri GC najprije stišće početnom silom zadano vrijeme, a zatim drži silom držanja — tako predmet brzo zahvati, a ne zgnječi ga.',
    podaci: [['Regulacija', 'struja motora, 16 stupnjeva']], izvor: 'MAN', pretpostavka: true, napomena: 'Smještaj motora u kućištu je pretpostavka.', tema: 'prihvatnica-sila' },
  { id: 'mehanizamPrihvatnice', skupina: PH, naziv: 'Mehanizam prstiju',
    opis: 'Prijenos koji okretanje motora pretvara u suprotno paralelno gibanje dvaju prstiju po vodilicama.',
    podaci: [], izvor: 'MAN', pretpostavka: true, napomena: 'Vrsta mehanizma (navojno vreteno ili zupčanik i letva) nije u izvoru.', tema: 'prihvatnica-sila' },
  { id: 'prstiPrihvatnice', skupina: PH, naziv: 'Prsti prihvatnice',
    opis: 'Dva crna prsta s ravnim čeljustima. Oblik čeljusti prilagođava se predmetu (npr. valjkasti izradak MPS linije).',
    podaci: [['Hod', '0–60 mm (oba prsta zajedno)']], izvor: 'MAN, FOTO', pretpostavka: true, napomena: 'Oblik prstiju s fotografija.', tema: 'prihvatnica-sila' },
  { id: 'konektorPrihvatnice', skupina: PH, naziv: 'Konektor prihvatnice',
    opis: 'Okrugli metalni konektor s navojem na boku prihvatnice; na njega dolazi crni spiralni kabel iz podlaktice.',
    podaci: [], izvor: 'FOTO', tema: 'prihvatnica-sila' },
  { id: 'kabelPrihvatnice', skupina: PH, naziv: 'Spiralni kabel prihvatnice',
    opis: 'Crni spiralni kabel od podlaktice do konektora prihvatnice. Spirala dopušta nagib i okret šake bez napinjanja vodiča.',
    podaci: [], izvor: 'FOTO', tema: 'prihvatnica-sila' },

  /* ---------------- Kabeli i konektori */
  { id: 'konektorPower', skupina: KB, naziv: 'Konektor POWER na robotu',
    opis: 'Višepolni konektor sa žičanim kopčama za struje motora i kočnica. Odspojen ili labav kabel izaziva pogrešku I. vrste (LED2).',
    podaci: [['Pogreška', 'I. vrste, LED2']], izvor: 'FOTO, MAN', tema: 'pogreske' },
  { id: 'konektorSignal', skupina: KB, naziv: 'Konektor SIGNAL na robotu',
    opis: 'Višepolni konektor za signale enkodera i graničnih prekidača. I njegov prekid izaziva pogrešku I. vrste (LED2).',
    podaci: [['Pogreška', 'I. vrste, LED2']], izvor: 'FOTO, MAN', tema: 'pogreske' },
  { id: 'kabelPower', skupina: KB, naziv: 'Kabel MOTOR POWER (5 m)',
    opis: 'Debeli crni kabel od konektora POWER na robotu do priključka MOTOR POWER na stražnjoj ploči DUM1.',
    podaci: [['Duljina', '5 m']], izvor: 'BRO, MAN, FOTO', tema: 'servo-pojacalo' },
  { id: 'kabelSignal', skupina: KB, naziv: 'Kabel MOTOR SIGNAL (5 m)',
    opis: 'Kabel od konektora SIGNAL na robotu do priključka MOTOR SIGNAL na DUM1; na kraju ima metalni konektor s natpisom.',
    podaci: [['Duljina', '5 m']], izvor: 'BRO, MAN, FOTO', tema: 'dc-motor-enkoder' },
  { id: 'spiralniKabeli', skupina: KB, naziv: 'Spiralni kabeli uz struk',
    opis: 'Dva crna spiralna kabela od stražnjeg dijela kućišta ramena do uvodnice na struku. Dopuštaju okretanje struka i podizanje ruke; pregledavaju se pri održavanju.',
    podaci: [], izvor: 'MAN, FOTO', tema: 'pogreske' },
  { id: 'kabelPrivjeska', skupina: KB, naziv: 'Kabel privjeska (3 m)',
    opis: 'Kabel privjeska do priključka TEACHING BOX. Spajanje privjeska pri uključenoj jedinici ili odspajanje tijekom rada izaziva pogrešku I. vrste (LED4).',
    podaci: [['Duljina', '3 m'], ['Pogreška', 'I. vrste, LED4']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'kabelSimRV', skupina: KB, naziv: 'Kabel SIM RV',
    opis: 'Kabel od simulatora SIM RV do priključka EXTERNAL I/O; kroz njega idu ulazi, izlazi i signali rukovanja.',
    podaci: [], izvor: 'FOTO', tema: 'io-rukovanje' },
  { id: 'kabelRS232', skupina: KB, naziv: 'Kabel RS-232C',
    opis: 'Serijski kabel od računala do priključka RS-232C (DB-25). Tvornički format: 9600 Bd, 7 bita, parni paritet, 2 stop-bita.',
    podaci: [['Format', '9600, E, 7, 2']], izvor: 'MAN, IPN', tema: 'rs232' },
  { id: 'kabelMrezni', skupina: KB, naziv: 'Mrežni kabel',
    opis: 'Priključni kabel 220 V za DUM1. Prije otvaranja jedinice nakon isključenja treba pričekati najmanje jednu minutu (upozorenje na kućištu).',
    podaci: [['Napajanje', 'AC 220 V, 50/60 Hz, 520 VA']], izvor: 'FOTO', tema: 'servo-pojacalo' },

  /* ---------------- DUM1 izvana */
  { id: 'dum1', skupina: DV, naziv: 'Upravljačka jedinica DUM1',
    opis: 'Kutija s napajanjem, servo pojačalima za pet osi i prihvatnicu, procesorom, memorijom i sučeljima. Izvodi naredbe izravno s računala ili program iz memorije, pamti 629 pozicija i 2048 programskih redaka.',
    podaci: [['Napajanje', 'AC 220 V, 520 VA'], ['Masa', '23 kg'], ['Pozicije / retci', '629 / 2048'], ['Sučelja', 'Centronics, RS-232C, EXTERNAL I/O'], ['Izrada', '2000-11']],
    izvor: 'MAN, BRO, FOTO', tema: 'servo-pojacalo' },
  { id: 'kucisteDum1', skupina: DV, naziv: 'Kućište DUM1',
    opis: 'Svijetlosivo limeno kućište s upravljačkim elementima na prednjoj ploči, vratima za unutarnje preklopnike na boku i priključcima straga. Na poklopcu su upozorenja o nošenju i o preklopniku vrste prihvatnice.',
    podaci: [['Mjere (pp)', '360 × 210 × 400 mm']], izvor: 'FOTO', pretpostavka: true, napomena: 'Mjere kućišta procjena s fotografija.', tema: 'servo-pojacalo' },
  { id: 'prednjaPloca', skupina: DV, naziv: 'Prednja ploča DUM1',
    opis: 'Okomiti sivi pojas s lijeve strane prednje ploče: LED POWER, tipka EMG. STOP, LED ERROR i EXECUTE te tipke START, STOP i RESET.',
    podaci: [['Elementi', JEDINICA.prednja.join(', ')]], izvor: 'MAN, FOTO', tema: 'pogreske' },
  { id: 'ledPower', skupina: DV, naziv: 'LED POWER',
    opis: 'Žuta LED-ica koja svijetli dok je jedinica uključena.', podaci: [['Boja', 'žuta']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'tipkaEmg', skupina: DV, naziv: 'Tipka EMG. STOP',
    opis: 'Crvena tipka u žutom okviru: odmah isključuje servo napajanje, J2 i J3 koče, a nastaje pogreška I. vrste (LED3). Poništava se isključenjem i uključenjem jedinice te ponovnim NEST-om.',
    podaci: [['Pogreška', 'I. vrste, LED3'], ['Poništavanje', 'isključiti/uključiti + NEST']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'ledError', skupina: DV, naziv: 'LED ERROR',
    opis: 'Crvena LED-ica: trepće (0,5 s) uz isprekidano zujalo kod pogreške I. vrste, a svijetli stalno uz neprekidno zujalo kod pogreške II. vrste.',
    podaci: [['I. vrsta', 'trepće'], ['II. vrsta', 'svijetli stalno']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'ledExecute', skupina: DV, naziv: 'LED EXECUTE',
    opis: 'Zelena LED-ica koja svijetli dok se izvodi naredba ili program, i tijekom NEST-a.', podaci: [['Boja', 'zelena']], izvor: 'MAN', tema: 'nest' },
  { id: 'tipkaStart', skupina: DV, naziv: 'Tipka START',
    opis: 'Zelena tipka koja pokreće program iz memorije ili nastavlja zaustavljeni program. SW1 bit 5 bira hoće li START dolaziti s prednje ploče ili izvana.',
    podaci: [['Izvor START-a', 'SW1 bit 5']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'tipkaStop', skupina: DV, naziv: 'Tipka STOP',
    opis: 'Crvena tipka koja zaustavlja program nakon tekuće naredbe; robot ostaje pod napajanjem i program se nastavlja tipkom START.',
    podaci: [], izvor: 'MAN', tema: 'pogreske' },
  { id: 'tipkaReset', skupina: DV, naziv: 'Tipka RESET',
    opis: 'Bijela tipka koja poništava pogrešku II. vrste i zaustavljeni program; program se vraća na početak, a stanje izlaza se ne briše.',
    podaci: [['Poništava', 'pogrešku II. vrste']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'bocnaVrata', skupina: DV, naziv: 'Bočna vrata',
    opis: 'Vratašca na boku jedinice iza kojih su LED-ice uzroka pogreške I. vrste (LED1–LED5) i preklopnici SW1, SW2, SW3, ST1 i ST2.',
    podaci: [['Iza vrata', 'LED1–LED5, SW1–SW3, ST1, ST2']], izvor: 'MAN', pretpostavka: true, napomena: 'Položaj vrata na kućištu je pretpostavka.', tema: 'pogreske' },
  { id: 'strazanjaPloca', skupina: DV, naziv: 'Stražnja ploča',
    opis: 'Stražnja strana s utorima kartica (sučelja i I/O), rebrastim hladnjakom servo pojačala i mrežnim modulom s prekidačem POWER, osiguračem i preklopnikom HAND.',
    podaci: [['Priključci', JEDINICA.strazanja.join(', ')]], izvor: 'MAN, FOTO', pretpostavka: true, napomena: 'Raspored konektora je pretpostavka.', tema: 'rs232' },
  { id: 'hladnjak', skupina: DV, naziv: 'Rebrasti hladnjak',
    opis: 'Aluminijski hladnjak s rebrima na stražnjoj strani; na njemu su izlazni tranzistori servo pojačala. Treba ga ostaviti slobodnim za strujanje zraka.',
    podaci: [], izvor: 'FOTO', pretpostavka: true, napomena: 'Da su na hladnjaku izlazni tranzistori pojačala je pretpostavka.', tema: 'servo-pojacalo' },
  { id: 'prikljucakCentronics', skupina: DV, naziv: 'Priključak CENTRONICS',
    opis: 'Paralelno sučelje kojim računalo šalje naredbe kao na pisač (u BASIC-u LPRINT "RN"). Samo jedan smjer — za čitanje odgovora (WH, PR…) treba RS-232C.',
    podaci: [['Primjer', 'LPRINT "RN"']], izvor: 'MAN', tema: 'rs232' },
  { id: 'prikljucakRs232', skupina: DV, naziv: 'Priključak RS-232C',
    opis: 'Serijsko sučelje DB-25 za slanje naredbi i čitanje odgovora. Format se mijenja preklopnicima SW2 (format) i SW3 (brzina); SW1 bit 1 bira završetak retka CR ili CR+LF.',
    podaci: [['Tvornički format', '9600 Bd, E, 7, 2'], ['Primjer', 'PRINT #1, "RS"']], izvor: 'MAN, IPN', tema: 'rs232' },
  { id: 'prikljucakIO', skupina: DV, naziv: 'Priključak EXTERNAL I/O',
    opis: 'Ulazi i izlazi I/O kartice (A8/B8: 8 + 8), signali rukovanja STB, ACK, RDY, BUSY te namjenski ulazi START, STOP, RESET i izlaz pogreške. Vanjsko napajanje 12–24 V DC osigurava korisnik.',
    podaci: [['Kartica', KONFIG.ioKartica === 'A16B16' ? 'A16/B16 (16 + 16)' : 'A8/B8 (8 + 8)'], ['Napajanje', '12–24 V DC']], izvor: 'MAN, SMA', tema: 'io-rukovanje' },
  { id: 'prikljucakPrivjeska', skupina: DV, naziv: 'Priključak TEACHING BOX',
    opis: 'Priključak privjeska. Privjesak se spaja samo pri isključenoj jedinici.',
    podaci: [], izvor: 'MAN', tema: 'privjesak-rad' },
  { id: 'prikljucciMotora', skupina: DV, naziv: 'Priključci MOTOR POWER i MOTOR SIGNAL',
    opis: 'Dva priključka za kabele robota: snaga motora i kočnica te signali enkodera i prekidača.',
    podaci: [['Kabeli', '2 × 5 m']], izvor: 'MAN, FOTO', tema: 'servo-pojacalo' },
  { id: 'stezaljkaExtEmg', skupina: DV, naziv: 'Stezaljka EXT EMG STP i uzemljenje',
    opis: 'Stezaljka za vanjski STOP u nuždi (mirni kontakt, NC) — npr. gljiva na upravljačkoj ploči stanice; otvoreni krug izaziva pogrešku I. vrste (LED3). Uz nju je vijak uzemljenja.',
    podaci: [['Kontakt', 'mirni (NC)']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'preklopnikHand', skupina: DV, naziv: 'Preklopnik HAND AC/DC',
    opis: 'Bira napajanje prihvatnice: DC za motornu prihvatnicu HM-01, AC za pneumatsku s AC elektroventilom. Krivi položaj može spaliti izvor ili prihvatnicu — upozorenje je i na poklopcu jedinice.',
    podaci: [['Za HM-01', 'DC']], izvor: 'MAN, FOTO', tema: 'prihvatnica-sila' },
  { id: 'osigurac', skupina: DV, naziv: 'Osigurač',
    opis: 'Mrežni osigurač 250 V AC / 10 A u mrežnom modulu.', podaci: [['Nazivno', '250 V AC / 10 A']], izvor: 'MAN', tema: 'servo-pojacalo' },
  { id: 'mrezniPrekidac', skupina: DV, naziv: 'Mrežni prekidač POWER i priključnica',
    opis: 'Prekidač ON/OFF i priključnica mrežnog kabela u mrežnom modulu na stražnjoj strani. Isključenje i uključenje je jedini način poništavanja pogreške I. vrste.',
    podaci: [], izvor: 'FOTO, MAN', tema: 'pogreske' },

  /* ---------------- DUM1 iznutra */
  { id: 'transformator', skupina: DU, naziv: 'Mrežni transformator i napajanje',
    opis: 'Transformator i ispravljači koji iz mreže daju istosmjerni napon za pojačala motora i niski napon za elektroniku.',
    podaci: [], izvor: 'MAN', pretpostavka: true, napomena: 'Izvedba napajanja nije opisana; prikaz načelan.', tema: 'servo-pojacalo' },
  { id: 'servoPojacala', skupina: DU, naziv: 'Servo pojačala',
    opis: 'Za svaku os po jedno pojačalo (i jedno za prihvatnicu): iz razlike zadanog i izmjerenog položaja računa napon motora. Prevelika razlika (sudar, preopterećenje, kvar enkodera) izaziva pogrešku I. vrste (LED1).',
    podaci: [['Kanala', '5 osi + prihvatnica + opcijska os'], ['Pogreška', 'LED1 — prevelika servo pogreška']], izvor: 'MAN, SMA', pretpostavka: true, napomena: 'Smještaj pojačala na pločama je pretpostavka.', tema: 'servo-pojacalo' },
  { id: 'cpuKartica', skupina: DU, naziv: 'Procesorska kartica',
    opis: 'Procesor koji tumači naredbe jezika Movemaster, računa kinematiku i interpolaciju putanje te zadaje položaje pojačalima.',
    podaci: [['Naredbi', '63']], izvor: 'MAN, BRO', pretpostavka: true, napomena: 'Vrsta procesora nije u izvoru.', tema: 'eprom-ram' },
  { id: 'memorija', skupina: DU, naziv: 'Memorija programa i pozicija (RAM)',
    opis: 'Statički RAM s baterijom: 629 pozicija (8 KB) i 2048 programskih redaka (16 KB). Sadržaj se čuva dok baterija drži napon; trajno se sprema u EPROM naredbom WR.',
    podaci: [['Pozicije', '629 (8 KB)'], ['Retci', '2048 (16 KB)']], izvor: 'MAN, BRO, SMA', tema: 'eprom-ram' },
  { id: 'eprom', skupina: DU, naziv: 'EPROM s ugrađenim programatorom',
    opis: 'Trajna memorija za program i pozicije. WR (privjesak WRT) piše RAM u EPROM, TR (TRN) učitava EPROM u RAM; ST2 bira kopiranje EPROM → RAM pri uključenju. Pogreška upisa izaziva pogrešku II. vrste.',
    podaci: [['Naredbe', 'WR, TR'], ['Pri uključenju', 'ST2']], izvor: 'MAN', tema: 'eprom-ram' },
  { id: 'baterija', skupina: DU, naziv: 'Baterija BAT-M1',
    opis: 'Litijeva baterija na I/O kartici u prvom utoru; čuva RAM ≈ 2 godine. Ako je uključena provjera (SW1 bit 2), prazna baterija izaziva pogrešku I. vrste (LED5).',
    podaci: [['Trajanje', '≈ 2 godine'], ['Pogreška', 'LED5 (uz SW1 bit 2)']], izvor: 'MAN', pretpostavka: true, napomena: 'Kemija baterije nije u izvoru.', tema: 'eprom-ram' },
  { id: 'ioKartica', skupina: DU, naziv: 'I/O kartica ' + (KONFIG.ioKartica === 'A16B16' ? 'A16/B16' : 'A8/B8'),
    opis: 'Kartica vanjskih ulaza i izlaza: A8/B8 ima 8 ulaza i 8 izlaza, A16/B16 po 16. Inačica A je „sink”, B „source”; SW1 bit 3 javlja upravljačkoj jedinici koja je kartica ugrađena.',
    podaci: [['Ulazi / izlazi', KONFIG.ioKartica === 'A16B16' ? '16 / 16' : '8 / 8'], ['Utor', 'prvi (s baterijom)']], izvor: 'MAN, SMA', tema: 'io-rukovanje' },
  { id: 'sw1', skupina: DU, naziv: 'Preklopnik SW1 (8 bitova)',
    opis: 'Osam malih preklopnika: 1 završetak retka CR ili CR+LF, 2 provjera baterije, 3 vrsta I/O kartice, 4 dopušta HO, 5 START izvana ili s prednje ploče, 6 otpuštanje kočnica s privjeska, 7 ne koristi se, 8 zujalo.',
    podaci: [['Bitova', '8']], izvor: 'MAN', tema: 'kocnica' },
  { id: 'sw2sw3', skupina: DU, naziv: 'Preklopnici SW2 i SW3',
    opis: 'Postavke serijskog sučelja RS-232C: SW2 format znaka (bitovi, paritet, stop-bitovi), SW3 brzina prijenosa.',
    podaci: [['Tvornički', '9600 Bd, 7 bita, E, 2 stop']], izvor: 'MAN, IPN', tema: 'rs232' },
  { id: 'st1st2', skupina: DU, naziv: 'Preklopnici ST1 i ST2',
    opis: 'ST1 bira način rada DUM1 ili PC; ST2 bira kopiranje EPROM → RAM pri uključenju.',
    podaci: [['ST1', 'DUM1 / PC'], ['ST2', 'EPROM → RAM pri uključenju']], izvor: 'MAN', tema: 'eprom-ram' },
  { id: 'led1', skupina: DU, naziv: 'LED1 — servo pogreška',
    opis: 'Svijetli kod prevelike servo pogreške: preopterećenje, kvar enkodera ili sudar.', podaci: [['Pogreška', 'I. vrste']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'led2', skupina: DU, naziv: 'LED2 — odspojen kabel',
    opis: 'Svijetli kad je kabel motora ili signala odspojen.', podaci: [['Pogreška', 'I. vrste']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'led3', skupina: DU, naziv: 'LED3 — STOP u nuždi',
    opis: 'Svijetli nakon EMG. STOP na DUM1 ili otvaranja vanjskog kruga EXT EMG STP.', podaci: [['Pogreška', 'I. vrste']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'led4', skupina: DU, naziv: 'LED4 — privjesak',
    opis: 'Svijetli nakon EMG. STOP na privjesku, ako je privjesak odspojen tijekom rada ili spojen pri uključenju.', podaci: [['Pogreška', 'I. vrste']], izvor: 'MAN', tema: 'pogreske' },
  { id: 'led5', skupina: DU, naziv: 'LED5 — baterija',
    opis: 'Svijetli kad je baterija prazna, ako je provjera uključena (SW1 bit 2).', podaci: [['Pogreška', 'I. vrste']], izvor: 'MAN', tema: 'eprom-ram' },
  { id: 'zujalo', skupina: DU, naziv: 'Zujalo',
    opis: 'Zvučni signal pogreške: isprekidan uz pogrešku I. vrste, neprekidan uz pogrešku II. vrste. SW1 bit 8 ga isključuje.', podaci: [['Isključenje', 'SW1 bit 8']], izvor: 'MAN', tema: 'pogreske' },

  /* ---------------- Privjesak */
  ...(PRIV ? [
    { id: 'privjesak', skupina: PV, naziv: 'Privjesak (teaching box)',
      opis: 'Ručni upravljač s 4-znamenkastim LED zaslonom, preklopnikom ON/OFF, tipkom EMG. STOP i tipkovnicom. Njime se robot ručno giba po zglobovima, u XYZ ili u smjeru alata, uče i provjeravaju pozicije 1–629 i program izvodi korak po korak; programe ne može pisati.',
      podaci: [['Kabel', '3 m'], ['Zaslon', '4 znamenke, crveni LED'], ['Pozicije', '1–629']], izvor: 'MAN, SMA, CSU, FOTO', tema: 'privjesak-rad' },
    { id: 'zaslonPrivjeska', skupina: PV, naziv: 'LED zaslon privjeska',
      opis: 'Četiri crvene znamenke: broj pozicije prikazuje se s tri znamenke, broj retka s četiri. Prvi znak javlja stanje — „-” postupak u tijeku ili gotov, „!” postupak se ne može izvesti.',
      podaci: [['Znamenki', '4']], izvor: 'MAN, SMA', tema: 'privjesak-rad' },
    { id: 'preklopnikPrivjeska', skupina: PV, naziv: 'Preklopnik ON/OFF',
      opis: 'S ON su tipke privjeska aktivne, a naredbe s računala i program iz memorije blokirani. Za rad s računalom i za izvođenje programa privjesak mora biti OFF.',
      podaci: [], izvor: 'MAN, SMA', tema: 'privjesak-rad' },
    { id: 'emgPrivjeska', skupina: PV, naziv: 'EMG. STOP privjeska',
      opis: 'Crvena tipka u udubini gornjeg dijela privjeska; izaziva pogrešku I. vrste (LED4), koja se poništava isključenjem i uključenjem DUM1.',
      podaci: [['Pogreška', 'I. vrste, LED4']], izvor: 'MAN, SMA', tema: 'pogreske' },
    { id: 'tipkeFunkcija', skupina: PV, naziv: 'Funkcijske tipke',
      opis: 'Smeđe tipke INC, DEC, P.S, P.C, NST, ORG, TRN, WRT, MOV, STEP: svaka se završava tipkom ENT, a P.S, P.C, MOV i STEP traže i broj. Svaka odgovara jednoj naredbi računala (IP, DP, HE, PC, NT, OG, TR, WR, MO).',
      podaci: [['Potvrda', 'ENT']], izvor: 'MAN, SMA, FOTO', tema: 'privjesak-rad' },
    { id: 'tipkeNacina', skupina: PV, naziv: 'Tipke PTP, XYZ i TOOL',
      opis: 'Biraju način ručnog gibanja: PTP po zglobovima (zadano nakon uključenja), XYZ u kartezijskom sustavu robota, TOOL u smjeru alata.',
      podaci: [['Zadano', 'PTP']], izvor: 'MAN', tema: 'zglobno-linearno' },
    { id: 'tipkeGibanja', skupina: PV, naziv: 'Tipke za ručno gibanje i brojke',
      opis: 'Svijetle tipke X±/B±, Y±/S±, Z±/E±, P±, R± i OPTION±: u PTP gibaju zglob, u XYZ pomiču TCP po osi, a P i R naginju i okreću šaku oko TCP-a. Iste tipke upisuju brojke 0–9 za broj pozicije ili retka.',
      podaci: [['Brojke', 'na tipkama Z, P, R, OPTION, O, C']], izvor: 'MAN, SMA, FOTO', tema: 'zglobno-linearno' },
    { id: 'tipkeOC', skupina: PV, naziv: 'Tipke O i C',
      opis: 'Otvaraju (◄O►) i zatvaraju (►C◄) prihvatnicu; ujedno brojke 0 i 5.',
      podaci: [['Brojke', '0 i 5']], izvor: 'MAN, FOTO', tema: 'prihvatnica-sila' },
    { id: 'tipkaEnt', skupina: PV, naziv: 'Tipka ENT',
      opis: 'Potvrđuje unos funkcije; uz SW1 bit 6 držanjem otpušta kočnice J2 i J3.',
      podaci: [], izvor: 'MAN', tema: 'kocnica' }
  ] : []),

  /* ---------------- SIM RV */
  ...(SIM ? [
    { id: 'simRv', skupina: SR, naziv: 'Simulator ulaza i izlaza SIM RV',
      opis: 'Mala kutija koja se spaja na EXTERNAL I/O umjesto stvarnog uređaja: prekidačima se postavljaju ulazi robota, a LED-ice pokazuju njegove izlaze. Dovoljna je za vježbe s naredbama ID, IN, TB, OB, OD, OT i EA.',
      podaci: [['Ulazi', '8 prekidača'], ['Izlazi', '8 LED-ica'], ['Rukovanje', 'STB, ACK (prekidači), RDY, BUSY (LED)']], izvor: 'FOTO', pretpostavka: true, napomena: 'SIM RV nije opisan u izvorima; sve s fotografije.', tema: 'io-rukovanje' },
    { id: 'prekidaciUlaza', skupina: SR, naziv: 'Prekidači ulaza (INPUT 0–7)',
      opis: 'Osam preklopnih prekidača H/L — svaki postavlja jedan ulazni bit robota. Robot ih čita naredbama ID, IN i TB.',
      podaci: [['Bitova', '8']], izvor: 'FOTO', pretpostavka: true, napomena: 'Pridruživanje bitova prekidačima prema natpisima na kutiji.', tema: 'io-rukovanje' },
    { id: 'ledIzlaza', skupina: SR, naziv: 'LED-ice izlaza (OUTPUT 0–7)',
      opis: 'Osam crvenih LED-ica koje pokazuju izlazne bitove robota postavljene naredbama OB, OD i OT.',
      podaci: [['Bitova', '8']], izvor: 'FOTO', tema: 'io-rukovanje' },
    { id: 'prekidacStb', skupina: SR, naziv: 'Prekidač STB',
      opis: 'Signal strobe vanjskog uređaja: javlja robotu da je podatak na ulazima spreman za naredbu IN.', podaci: [], izvor: 'FOTO', pretpostavka: true, napomena: 'Uloga prema imenu signala.', tema: 'io-rukovanje' },
    { id: 'prekidacAck', skupina: SR, naziv: 'Prekidač ACK',
      opis: 'Potvrda vanjskog uređaja da je preuzeo podatak koji je robot postavio naredbom OT.', podaci: [], izvor: 'FOTO', pretpostavka: true, napomena: 'Uloga prema imenu signala.', tema: 'io-rukovanje' },
    { id: 'ledRdyBusy', skupina: SR, naziv: 'LED-ice RDY i BUSY',
      opis: 'Zelene LED-ice signala rukovanja koje postavlja robot: RDY — izlazni podatak je spreman (OT), BUSY — ulazni podatak je preuzet (IN).', podaci: [], izvor: 'FOTO', pretpostavka: true, napomena: 'Uloga prema imenu signala.', tema: 'io-rukovanje' },
    { id: 'ledPowerSim', skupina: SR, naziv: 'LED POWER na SIM RV',
      opis: 'Zelena LED-ica koja svijetli kad SIM RV ima napajanje s I/O priključka.', podaci: [], izvor: 'FOTO', tema: 'io-rukovanje' }
  ] : []),

  /* ---------------- Robotska stanica MPS */
  { id: 'kolicaMPS', skupina: ST, naziv: 'Kolica Festo MPS',
    opis: 'Pokretna kolica 700 × 700 mm na kotačima; u njima su elektroinstalacija stanice i (pretpostavka) DUM1. Na njih se stavlja Al-profilna ploča.',
    podaci: [['Mjere', '700 × 700 mm'], ['Visina (pp)', '≈ 750 mm']], izvor: 'FC-190, FC-188, FOTO', pretpostavka: true, napomena: 'Visina kolica izračunata iz kataloga; smještaj DUM1 je pretpostavka.', tema: 'radni-prostor' },
  { id: 'profilnaPloca', skupina: ST, naziv: 'Al-profilna ploča',
    opis: 'Aluminijska ploča s T-utorima u koje se vijcima pričvršćuju moduli stanice, kabelski kanali i upravljačka ploča.',
    podaci: [['Mjere', '700 × 700 mm'], ['Korak utora (pp)', '50 mm']], izvor: 'FC-190, FOTO', pretpostavka: true, napomena: 'Korak utora procjena.', tema: 'radni-prostor' },
  { id: 'celicnaPloca', skupina: ST, naziv: 'Čelična ploča robota',
    opis: 'Debela plavosiva čelična ploča na profilnoj ploči na koju je robot pričvršćen vijcima M8; raspoređuje sile robota na profile.',
    podaci: [['Najmanje (priručnik)', '270 × 350 × 12 mm']], izvor: 'MAN, FOTO', tema: 'radni-prostor' },
  { id: 'upravljackaPlocaMPS', skupina: ST, naziv: 'Upravljačka ploča stanice',
    opis: 'Kosa ploča na prednjem rubu stanice: START (s LED), STOP, RESET (s LED), ključ AUTO/MAN, dvije lampice i crna gljiva. Stanični PLC preko nje pokreće ciklus, a s robotom razmjenjuje signale preko I/O kartice.',
    podaci: [['Elementi', STANICA.upravljackaPloca.elementi.join(', ')]], izvor: 'FC-198', pretpostavka: true, napomena: 'Raspored elemenata na ploči je pretpostavka.', tema: 'io-rukovanje' }
];

/* ================================================================== pomoćne funkcije */
const _PO_ID = new Map(DIJELOVI.map((d) => [d.id, d]));
export function nadjiDio(id) { return _PO_ID.get(id) || null; }
export function dijeloviSkupine(sk) { return DIJELOVI.filter((d) => d.skupina === sk); }
export function dijeloviTeme(tema) { return DIJELOVI.filter((d) => d.tema === tema); }
/** izvori dijela: izvor 'A, B' → [{ kratica, naziv, url }] (url je '' kad se poveznica ne smije prikazati) */
export function izvoriDijela(d) {
  return String(d && d.izvor || '').split(',').map((s) => s.trim()).filter(Boolean).map((k) => ({ kratica: k, naziv: (IZVORI[k] || {}).naziv || k, url: (IZVORI[k] || {}).url || '' }));
}
export const uStupnjeve = (r) => r / RAD;
export const uRadijane = (d) => d * RAD;
export const uMm = mm;

export const TEKST_PRETPOSTAVKE = 'Podaci označeni kao pretpostavka nisu pronađeni u dokumentaciji proizvođača: procijenjeni su s fotografija robota, preuzeti iz opisa srodne opreme ili izvedeni iz objavljenih brojeva. Sukob znači da se izvori ne slažu; koristi se navedena vrijednost. Nedostaje znači da podatak nije ni procijenjen. Kad se podatak izmjeri na robotu (npr. visina osi ramena), ispravlja se na jednom mjestu i oznaka nestaje.';

/** sve pretpostavke, sukobi i nedostajući podaci: [{ vrsta, sto, vrijednost, napomena, id? }] (bez ponavljanja iste napomene);
    uključuje i stavke iz rvm1_jezik_podaci.js (PRETPOSTAVKE_JEZIK) */
export function pretpostavke() {
  const out = [], vidjeno = new Set();
  const dodaj = (o) => { const k = o.vrsta + '|' + o.sto + '|' + o.napomena; if (vidjeno.has(k)) return; vidjeno.add(k); out.push(o); };
  reg().forEach((r) => dodaj({ ...r }));
  DIJELOVI.forEach((d) => { if (d.pretpostavka && d.napomena) dodaj({ vrsta: 'pretpostavka', sto: d.naziv, vrijednost: '', napomena: d.napomena, id: d.id }); });
  try {
    const J = J_.PRETPOSTAVKE_JEZIK || J_.PRETPOSTAVKE;
    if (Array.isArray(J)) J.forEach((p) => p && dodaj({ vrsta: p.vrsta || 'pretpostavka', sto: p.sto || '', vrijednost: p.vrijednost || '', napomena: p.napomena || '' }));
  } catch (e) { /* jezični podaci još ne postoje */ }
  return out;
}

/* ================================================================== jezik, privjesak, pogreške, RS-232, DUM1 (agent „Interpreter”) */
export * from './rvm1_jezik_podaci.js';
