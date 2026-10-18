/* FORTRONIQ · CNC glodanje, SINUMERIK 840D — Postavljanje stroja (simulator s koracima).
   Redoslijed nizova i koraka prema tečaju SITRAIN 840D (glodanje); tekst, model i sučelje su naši.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PREDMETI } from './programi_p.js?v=02';
import { napraviStroj } from './stroj840.js?v=02';
import { objasni, opisiOperacije } from './gkod.js?v=02';

const $ = (id) => document.getElementById(id);
const br = (v, d = 3) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const OSI = ['X', 'Y', 'Z'];

/* ================================================================== */
/* 1. Podaci stroja (vrijednosti iz tečaja; geometrija stroja je naša)  */
/* ================================================================== */
const REF = { X: 435.194, Y: 345.770, Z: 398.672 };          /* položaj referentne točke (MKS) */
const HOD = { X: [-200, 440], Y: [-150, 350], Z: [80, 400] }; /* hod osi (vreteno, MKS) */
const ALATI = {                                               /* popis alata u upravljanju */
  0: { naziv: '—', L: 0, R: 0 },
  1: { naziv: 'ravno glodalo Ø3 (naši predmeti)', L: 60, R: 1.5 },
  2: { naziv: 'Shank-type cutter Ø25', L: 144.368, R: 12.5 },
  3: { naziv: 'Shank-type cutter Ø20', L: 139.059, R: 10 },
  4: { naziv: 'Shank-type cutter Ø16', L: 142.446, R: 8 },
  7: { naziv: 'Slot cutting tool Ø8', L: 204.739, R: 4 },
  8: { naziv: 'Slot cutting tool Ø10', L: 145.013, R: 4 },
  9: { naziv: 'Slot cutting tool Ø12', L: 147.812, R: 6 },
  10: { naziv: 'Twist drill Ø8', L: 167.014, R: 4 },
  11: { naziv: 'Twist drill Ø6,8', L: 163.628, R: 3.4 },
  12: { naziv: 'Tap M8', L: 145.013, R: 4 },
  99: { naziv: '3D sonda', L: 291.818, R: 2 }
};
const SONDA_L = 291.818;
const PLOCA = { x0: 59.437, y0: -60.342, L: 120, W: 90, top: 60, H: 20 };  /* VMDEMO 120 × 90; rub X lijevo i Y sprijeda kao u tečaju; Z i debljina su naša pretpostavka */
const G54_POC = { X: -117.452, Y: 63.425, Z: 127.539 };       /* pomak G54 prije određivanja nultočke */
const VMDEMO = ['G54', 'T8', 'M6', 'S3000 M3', 'G0 X3 Y-6', 'G0 Z-5', 'G1 Y96 F300', 'G0 Z2', 'POCKET4(2,0,1,-10,30,60,45,5,0,0,150,300,0,11,,)', 'G0 Z100', 'M30'];
const POCKET4_POLJA = [
  ['RTP', 'ravnina povratka (aps.)', 2], ['RFP', 'referentna ravnina (aps.)', 0], ['SDIS', 'sigurnosni razmak', 1], ['DP', 'dubina džepa (aps.)', -10],
  ['PRAD', 'polumjer džepa', 30], ['PA', 'središte džepa X (aps.)', 60], ['PO', 'središte džepa Y (aps.)', 45], ['MID', 'najveća dubina dostave', 5],
  ['FAL', 'dodatak za završnu obradu (rub)', 0], ['FALD', 'dodatak za završnu obradu (dno)', 0], ['FFP1', 'posmak u ravnini', 150], ['FFD', 'posmak dostave u dubinu', 300],
  ['CDIR', 'smjer glodanja (0 = istosmjerno)', 0], ['VARI', 'način obrade (11 = gruba, okomito uranjanje)', 11]
];

/* ================================================================== */
/* 2. Nizovi i koraci (redoslijed kao u tečaju, tekst naš)              */
/* ================================================================== */
const NIZOVI = [
  { id: 'ukljucivanje', grupa: 'Postavljanje stroja', naziv: 'Uključivanje', koraci: [
    ['Uključi stroj glavnom sklopkom i pričekaj da se upravljanje pokrene.', 'Glavna sklopka je na stražnjoj stijenci kabine, desno od električnog ormara (pogled „Ormar”). Klikni je u 3D prikazu ili gumb „Glavna sklopka” ispod prikaza.', 'sklopka'],
    ['Otpusti gljivu za nužno zaustavljanje.', 'Klikni crvenu gljivu na strojnoj upravljačkoj ploči — gljiva se zakretanjem otpušta.', 'gljiva'],
    ['Uključi pogone vretena i osi posmaka.', 'Pritisni tipku ( I ), a zatim SPINDLE START i FEED START.', 'pogoni'],
    ['Vrati upravljanje u početno stanje.', 'Pritisni RESET.', 'reset'],
    ['Najprije dovedi os Z u referentnu točku.', 'Pritisni tipku osi Z, a zatim tipku smjera +. Os Z uvijek ide prva, da alat ne udari u obradak.', 'refZ'],
    ['Sada dovedi os Y u referentnu točku.', 'Pritisni tipku osi Y, a zatim tipku smjera +.', 'refY'],
    ['Sada dovedi os X u referentnu točku.', 'Pritisni tipku osi X, a zatim tipku smjera +.', 'refX'],
    ['Kraj niza „Uključivanje”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'rucno', grupa: 'Postavljanje stroja', naziv: 'Ručno gibanje', koraci: [
    ['Upoznaj osi i smjerove gibanja i promijeni alat. Za to odaberi način rada MDA.', 'Pritisni tipku MDA.', 'mda'],
    ['Upiši NC blok „T3 M6”, a zatim pritisni CYCLE START.', 'Mogu se izmijeniti i drugi alati, ali niz se nastavlja samo s T3. Krivo upisani znak briše se tipkama BACKSPACE i DEL.', 't3'],
    ['Upiši NC blok „S1000 M3”, a zatim pritisni CYCLE START.', 'Krivo upisani znak briše se tipkama BACKSPACE i DEL.', 's1000'],
    ['Prijeđi u način rada JOG.', 'Pritisni tipku JOG.', 'jog'],
    ['Upoznaj osi i smjerove, ali bez sudara! Zatim dovedi alat u položaj X50 / Y30.2 / Z8 u koordinatnom sustavu obratka (WKS). Pazi: prikaz položaja sada je u koordinatnom sustavu stroja (MKS).', 'Rade tipke X, Y, Z, +, −, RAPID, korekcija posmaka i brzine vrtnje te okomiti softkey za prebacivanje prikaza MKS / WKS. Tipke 1, 10, 100, 1000 i 10000 daju korak od 1 µm do 10 000 µm, a JOG kontinuirano gibanje.', 'polozaj'],
    ['Kraj niza „Ručno gibanje”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'korekcije', grupa: 'Postavljanje stroja', naziv: 'Korekcije alata', koraci: [
    ['Duljina utornog glodala na mjestu 7 izmjerena je i iznosi 153,024 mm. Upiši tu vrijednost korekcije u upravljanje. Stvarna vrijednost u Z (sada 188.455) promijenit će se.', 'Pritisni MENU SELECT, a zatim vodoravni softkey Parameter.', 'parametri'],
    ['Prijeđi na podatke alata s brojem T7.', 'Okomitim softkeyima T-No + i T-No − mijenja se broj alata.', 't7'],
    ['Upiši novu vrijednost korekcije: „Length 1” = 153.024.', 'Tipkama kursora ili INPUT prelazi se u polje; vrijednost se potvrđuje tipkom INPUT.', 'l1'],
    ['Vrati se u područje Machine: stvarna vrijednost u Z promijenila se s 188.455 na 240.170.', 'Pritisni tipku MACHINE.', 'machine'],
    ['Kraj niza „Korekcije alata”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'nultocka', grupa: 'Postavljanje stroja', naziv: 'Nultočka obratka', koraci: [
    ['Već umetnutom 3D sondom odredi položaj nultočke obratka: X lijevo, Y sprijeda, Z gore. Podaci sonde (polumjer 2 mm, duljina 291,818 mm) već su upisani u upravljanje.', 'Pritisni „Dalje” kad pročitaš uputu.', 'dalje'],
    ['U načinu rada JOG otvori prozor za dodirivanje (Scratching).', 'Pritisni vodoravni softkey Scratching.', 'scratching'],
    ['Odaberi pomak nultočke G54, a zatim stavi kursor u polje za X.', 'Upiši G54 i potvrdi tipkom INPUT.', 'g54'],
    ['Najprije odredi položaj nultočke u X: polako se približi u osi X lijevoj strani obratka.', 'Koristi tipke X, Y, Z, + i −, korake 10000 … 1 i JOG za kontinuirano gibanje. Pokazivač sonde mora pokazati 0,000. Gledaj iz dobrog kuta!', 'dodirX'],
    ['Upiši vrijednost 0, jer je os vretena u X točno iznad ruba obratka.', 'Upiši 0 za X i potvrdi tipkom INPUT. Pomak u stupcu „offset” se mijenja.', 'unosX'],
    ['Sada se polako približi u osi Y prednjoj strani obratka.', 'JOG i koracima približi sondu i obradak dok pokazivač ne pokaže 0,000. Koristi i korekciju posmaka.', 'dodirY'],
    ['I ovdje upiši vrijednost 0, jer je os vretena u Y točno iznad ruba obratka.', 'Upiši 0 za Y i potvrdi tipkom INPUT.', 'unosY'],
    ['Sada se polako približi u osi Z gornjoj plohi obratka.', 'Prije gibanja iznad obratka podigni sondu. Približavaj dok pokazivač ne pokaže 0,000.', 'dodirZ'],
    ['Duljinu sonde treba poništiti s negativnim predznakom. Upiši vrijednost!', 'Duljina sonde 291,818 mm prikazana je desno. Upiši je s predznakom minus za Z i potvrdi tipkom INPUT.', 'unosZ'],
    ['Preuzmi upisane vrijednosti.', 'Pritisni okomiti softkey OK. Prikaz položaja tada pokazuje nove stvarne vrijednosti.', 'ok'],
    ['Kraj niza „Nultočka obratka”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'pisanje', grupa: 'Programiranje', naziv: 'Pisanje programa', koraci: [
    ['Prijeđi u područje Program.', 'Pritisni MENU SELECT i vodoravni softkey Program, ili izravno tipku PROGRAM.', 'program'],
    ['Napravi novi program i nazovi ga „VMDEMO”.', 'Pritisni okomiti softkey New… — ime se upisuje samo. Potvrdi ga tipkom INPUT i okomitim softkeyem OK.', 'novi'],
    ['Program je napravljen. Upiši „G54” za pomak nultočke.', 'Unos završi tipkom INPUT.', 'pG54'],
    ['Upiši naredbe „T8” i „M6” za poziv alata.', 'Svaki unos završi tipkom INPUT.', 'pT8'],
    ['Ovdje se sljedeći retci programa dodaju sami.', 'Pritisni „Dalje”.', 'dalje'],
    ['Sada treba programirati kružni džep. Prozor za unos ciklusa otvara se softkeyima.', 'Pritisni vodoravni softkey Milling, okomiti Standard pockets, a zatim okomiti Circular pocket.', 'dzep'],
    ['Polja su već popunjena. Preuzmi ciklus u program.', 'Pritisni softkey OK.', 'dzepOK'],
    ['Ciklus je ovako upisan u program. I ovdje se dodaju sljedeći retci.', 'Pritisni „Dalje”.', 'dalje'],
    ['Izađi iz programa.', 'Pritisni RECALL, zatim okomiti softkey Exit editor i pitanje potvrdi softkeyem Yes.', 'izlaz'],
    ['Kraj niza „Pisanje programa”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'uredivanje', grupa: 'Programiranje', naziv: 'Uređivanje programa', koraci: [
    ['Otvori program „VMDEMO” za uređivanje.', 'Označi program tipkom CURSOR DOWN i pritisni INPUT.', 'otvori'],
    ['U četvrtom bloku promijeni brzinu vrtnje na 4000.', 'Stavi kursor iza znamenke 3 i zamijeni je znamenkom 4.', 's4000'],
    ['Provjeri vrijednost u ciklusu POCKET4. Ciklus se za to mora „prevesti natrag” u prozor za unos.', 'Stavi kursor u redak s ciklusom POCKET4 i pritisni vodoravni softkey Translate back.', 'natrag'],
    ['Ovdje je središte džepa u X (PA) greškom promijenjeno s 60 na 70. Pritiskom na OK ciklus bi se preuzeo s novom vrijednošću. Poništi izmjenu.', 'Pritisni okomiti softkey Abort ili tipku RECALL.', 'abort'],
    ['Zatvori editor.', 'Pritisni softkey Exit editor i pitanje potvrdi softkeyem Yes.', 'izlaz'],
    ['Kraj niza „Uređivanje programa”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'izvodenje', grupa: 'Programiranje', naziv: 'Izvođenje programa', koraci: [
    ['Treba izvesti jedan od programa naših predmeta P01 … P21.', 'Označi program, pritisni okomite softkeyeve Load i Selection, a zatim tipku AUTO. Popis operacija odabranog predmeta prikazan je ispod stroja.', 'odabir'],
    ['Prijeđi u područje Machine.', 'Pritisni MENU SELECT i vodoravni softkey Machine, ili izravno tipku MACHINE.', 'machine'],
    ['Zbog sigurnosti smanji posmak na 10 % prije pokretanja programa.', 'Korekciju posmaka (desni gumb na ploči) smanji na 10 %.', 'f10'],
    ['Pokreni program.', 'Pritisni CYCLE START.', 'start'],
    ['Tijekom obrade korekcija posmaka smije se ponovno povećati. Obrada se prekida gljivom za nužno zaustavljanje.', 'Pričekaj kraj programa.', 'gotovo'],
    ['Čestitamo! Kad prođeš sve nizove, spreman si za vježbu na stroju.', 'Klikni „Izbornik”.', 'kraj']] }
];
const PREKID = 'Program je prekinut gljivom za nužno zaustavljanje. Sve osi su zaustavljene i svi pogoni isključeni.';

/* ================================================================== */
/* 3. Stanje                                                          */
/* ================================================================== */
const st = {};
function pocetnoStanje() {
  Object.assign(st, {
    struja: false, gljiva: true, pogoniI: false, vrEn: false, posEn: false, alarm: true,
    nacin: 'JOG', refNacin: true, inc: 0, os: null, podrucje: 'Machine',
    ref: { X: false, Y: false, Z: false }, nos: { X: 210.5, Y: 120.3, Z: 312.7 },
    T: 0, D: 1, alatUVretenu: 0, G54: { ...G54_POC }, wks: false,
    S: 0, Sset: 0, vreteno: false, fOver: 100, sOver: 100,
    programi: Object.fromEntries(Object.entries(PREDMETI).map(([k, v]) => [k, v.G])),
    mda: '', mdaZadnji: '', ed: null, dijalog: null, odabran: 'P01', ucitan: null, listaKursor: 0,
    alatParam: 2, paramPolje: 0, unos: '', vsk: null, hsk: null,
    scratch: null, auto: null, pomicanje: null, sudar: null, kontura: null
  });
  ALATI[7].L = 204.739;
}
pocetnoStanje();
let niz = null, korak = 0, gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-cnc-840d-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-cnc-840d-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }

const L = () => (st.T === 0 ? 0 : ALATI[st.T].L);
const prikazMKS = (o) => (o === 'Z' ? st.nos.Z - L() : st.nos[o]);
const prikazWKS = (o) => prikazMKS(o) - st.G54[o];

/* početna stanja nizova (svaki se niz može raditi zasebno, kao u tečaju) */
function pripremi(id) {
  pocetnoStanje();
  if (id === 'ukljucivanje') return;
  Object.assign(st, { struja: true, gljiva: false, pogoniI: true, vrEn: true, posEn: true, alarm: false, refNacin: false, ref: { X: true, Y: true, Z: true } });
  st.nos = { ...REF };
  if (id === 'rucno') { st.T = 0; }
  if (id === 'korekcije') { st.T = 7; st.alatUVretenu = 7; st.nos = { X: REF.X, Y: REF.Y, Z: 188.455 + 204.739 }; }
  if (id === 'nultocka') { st.T = 0; st.alatUVretenu = 99; st.nos = { X: 20, Y: -15, Z: 345 }; }
  if (id === 'pisanje' || id === 'uredivanje' || id === 'izvodenje') {
    st.G54 = { X: PLOCA.x0, Y: PLOCA.y0, Z: PLOCA.top };
    if (id !== 'pisanje') st.programi.VMDEMO = VMDEMO.join('\n');
  }
  if (id === 'izvodenje') { st.T = 1; st.alatUVretenu = 1; }
}

/* ================================================================== */
/* 4. Scena: vertikalna glodalica                                      */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 5, 20000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(600, 1200, 900); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.45); sun2.position.set(-700, 500, -600); scene.add(sun2);
const S840 = napraviStroj(THREE, scene, { obradak: false });   /* zajednički model (stroj840.js) — isti kao u „Upoznavanje stroja” */
const { stol, glava, steznik, sklopka, lampa, XC, YC, lok } = S840;
function napraviSkripac(L_, W_, top, H_) { S840.postaviSkripac(L_, W_, top, H_, PLOCA.x0, PLOCA.y0); }
function postaviAlat3D(t) {
  if (!t) { S840.postaviAlat(null); return; }
  const a = ALATI[t];
  S840.postaviAlat({ vrsta: t === 99 ? 'sonda' : (t === 10 || t === 11) ? 'svrdlo' : t === 12 ? 'ureznik' : 'utorno', L: a.L, R: a.R });
}
let alat3D = -1;
/* obradak: visinska mreža */
const obr = S840.obrGrupa;
const KORAK = 0.75;
let blank = null, vis, nx, ny, mGeo, mMesh, rGeo, rMesh, prljavo = false;
const BOJA_G = new THREE.Color(0xc9ced2), BOJA_R = new THREE.Color(0x7d8a92);
function napraviBlank(L_, W_, H_, top_ = PLOCA.top) {
  if (mMesh) { obr.remove(mMesh); obr.remove(rMesh); mGeo.dispose(); rGeo.dispose(); }
  blank = { x0: PLOCA.x0, y0: PLOCA.y0, L: L_, W: W_, H: H_, top: top_ }; napraviSkripac(L_, W_, top_, H_);
  nx = Math.round(L_ / KORAK) + 1; ny = Math.round(W_ / KORAK) + 1; vis = new Float32Array(nx * ny).fill(H_);
  const pos = new Float32Array(nx * ny * 3), col = new Float32Array(nx * ny * 3), idx = [];
  const bot = blank.top - H_;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; const [lx, lz] = lok(blank.x0 + i * KORAK, blank.y0 + j * KORAK);
    pos.set([lx, blank.top, lz], 3 * k); col.set([BOJA_G.r, BOJA_G.g, BOJA_G.b], 3 * k);
    if (i < nx - 1 && j < ny - 1) { const a = k, b = k + 1, c = k + nx, d = k + nx + 1; idx.push(a, b, c, b, d, c); }
  }
  mGeo = new THREE.BufferGeometry(); mGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); mGeo.setIndex(idx); mGeo.computeVertexNormals();
  mMesh = new THREE.Mesh(mGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide })); obr.add(mMesh);
  const rub = []; for (let i = 0; i < nx; i++) rub.push(i); for (let j = 1; j < ny; j++) rub.push(j * nx + nx - 1); for (let i = nx - 2; i >= 0; i--) rub.push((ny - 1) * nx + i); for (let j = ny - 2; j > 0; j--) rub.push(j * nx);
  const rp = new Float32Array(rub.length * 6), ri = [];
  rub.forEach((k, n) => { const x = pos[3 * k], z = pos[3 * k + 2]; rp.set([x, blank.top, z, x, bot, z], 6 * n); const m = (n + 1) % rub.length; ri.push(2 * n, 2 * n + 1, 2 * m, 2 * m, 2 * n + 1, 2 * m + 1); });
  rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rGeo.setIndex(ri); rGeo.computeVertexNormals(); rGeo.userData.rub = rub;
  rMesh = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({ color: 0xaeb6bb, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })); obr.add(rMesh);
}
function osvjeziBlank() {
  if (!prljavo) return; prljavo = false;
  const p = mGeo.attributes.position.array, c = mGeo.attributes.color.array, bot = blank.top - blank.H;
  for (let k = 0; k < vis.length; k++) { p[3 * k + 1] = bot + vis[k]; const t = Math.min(1, (blank.H - vis[k]) / 2); const b = BOJA_G.clone().lerp(BOJA_R, t); c[3 * k] = b.r; c[3 * k + 1] = b.g; c[3 * k + 2] = b.b; }
  mGeo.attributes.position.needsUpdate = true; mGeo.attributes.color.needsUpdate = true; mGeo.computeVertexNormals();
  const rp = rGeo.attributes.position.array; rGeo.userData.rub.forEach((k, n) => { rp[6 * n + 1] = bot + vis[k]; }); rGeo.attributes.position.needsUpdate = true;
}
function skini(X, Y, Zvrh, r) {      /* MKS: vrh alata */
  const h = Zvrh - (blank.top - blank.H); if (h >= blank.H) return;
  const i0 = Math.max(0, Math.floor((X - r - blank.x0) / KORAK)), i1 = Math.min(nx - 1, Math.ceil((X + r - blank.x0) / KORAK));
  const j0 = Math.max(0, Math.floor((Y - r - blank.y0) / KORAK)), j1 = Math.min(ny - 1, Math.ceil((Y + r - blank.y0) / KORAK));
  const r2 = r * r, hh = Math.max(0, h);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = blank.x0 + i * KORAK - X, dy = blank.y0 + j * KORAK - Y; if (dx * dx + dy * dy <= r2) { const k = j * nx + i; if (vis[k] > hh) { vis[k] = hh; prljavo = true; } } }
}
function visinaU(X, Y) { const i = Math.round((X - blank.x0) / KORAK), j = Math.round((Y - blank.y0) / KORAK); if (i < 0 || j < 0 || i >= nx || j >= ny) return null; return blank.top - blank.H + vis[j * nx + i]; }

let potpis3D = '';
function postavi3D() {
  const p = st.nos.X.toFixed(3) + ',' + st.nos.Y.toFixed(3) + ',' + st.nos.Z.toFixed(3);
  if (p !== potpis3D) { potpis3D = p; S840.postaviOsi(st.nos.X, st.nos.Y, st.nos.Z); }
  if (alat3D !== st.alatUVretenu) { alat3D = st.alatUVretenu; postaviAlat3D(st.alatUVretenu); }
  steznik.rotation.y += st.vreteno ? 0.4 : 0;
  lampa.material.emissive.setHex(st.sudar ? 0xb00000 : st.auto && st.auto.ide ? 0x1d9e4b : st.struja ? 0xc28b00 : 0); lampa.material.color.setHex(st.sudar ? 0xff3b30 : st.auto && st.auto.ide ? 0x2ecc71 : st.struja ? 0xf5c518 : 0x666666);
}
function pogled(p) {
  if (p === 'stroj') { camera.position.set(-2700, 2000, 4500); controls.target.set(150, 80, -50); }
  if (p === 'radni') { camera.position.set(-420, 420, 760); controls.target.set(-60, 60, -20); }
  if (p === 'obradak') { camera.position.set(170, 260, 300); controls.target.set(0, 60, 0); }
  if (p === 'straga') { camera.position.set(900, 800, -2000); controls.target.set(160, 420, -605); }
}
pogled('radni');

/* ================================================================== */
/* 5. Sudar i sonda                                                    */
/* ================================================================== */
function vrhAlata() { return { X: st.nos.X, Y: st.nos.Y, Z: st.nos.Z - (st.alatUVretenu ? ALATI[st.alatUVretenu].L : 0) }; }
function provjeriSudar(rez) {
  if (!blank || !st.alatUVretenu) return false;
  const v = vrhAlata(), r = ALATI[st.alatUVretenu].R;
  if (v.X + r < blank.x0 || v.X - r > blank.x0 + blank.L || v.Y + r < blank.y0 || v.Y - r > blank.y0 + blank.W) return false;
  /* najviša točka materijala ispod alata */
  let max = -1e9;
  for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) { const z = visinaU(Math.min(Math.max(v.X + dx, blank.x0), blank.x0 + blank.L), Math.min(Math.max(v.Y + dy, blank.y0), blank.y0 + blank.W)); if (z !== null && z > max) max = z; }
  const dub = max - v.Z;
  if (st.alatUVretenu === 99) {
    const px = Math.min(v.X - blank.x0, blank.x0 + blank.L - v.X), py = Math.min(v.Y - blank.y0, blank.y0 + blank.W - v.Y), pz = blank.top - v.Z;
    return (px > 1 && py > 1 && pz > 1) ? 'sonda' : false;
  }
  if (dub > 0.02) return rez ? false : 'alat';
  return false;
}
function pokazivac() {                          /* 3D sonda: udaljenost od ruba / plohe */
  if (st.alatUVretenu !== 99) return null;
  const v = vrhAlata(); const e = 1e-4;
  const unutraY = v.Y > blank.y0 + e && v.Y < blank.y0 + blank.W, unutraX = v.X >= blank.x0 - e && v.X < blank.x0 + blank.L;
  const ispodVrha = v.Z < blank.top - 0.5 && v.Z > blank.top - blank.H;
  if (ispodVrha && unutraY && v.X <= blank.x0 + 1) return { os: 'X', d: v.X - blank.x0 };
  if (ispodVrha && unutraX && v.Y <= blank.y0 + 1) return { os: 'Y', d: v.Y - blank.y0 };
  if (v.X > blank.x0 + e && v.X < blank.x0 + blank.L && unutraY && v.Z - blank.top < 40 && v.Z - blank.top > -1.5) return { os: 'Z', d: v.Z - blank.top };
  return null;
}
function sudar(sto) {
  st.sudar = sto; st.pomicanje = null; if (st.auto) st.auto.ide = false; st.vreteno = false;
  $('poruka').innerHTML = '<span class="upoz">Sudar!</span> ' + (sto === 'sonda' ? 'Sonda je udarila u obradak — previše si je pomaknuo nakon dodira.' : 'Alat je udario u obradak dok se gibao brzim hodom ili bez rezanja.') + ' Pogledaj <a href="#album">album sudara</a> i pritisni „Ponovno pokreni niz”.';
  $('ponovi').hidden = false;
}

/* ================================================================== */
/* 6. Gibanje osi (JOG, REF, programi)                                 */
/* ================================================================== */
const F_JOG = 2000, F_RAPID = 10000, F_REF = 4000;          /* mm/min */
function smijeGibati() { return st.struja && !st.gljiva && st.pogoniI && st.posEn && !st.sudar && !st.alarm; }
function osTipka(o) { st.os = o; crtaj(); }
function smjer(sgn, rapid) {
  if (!st.os) { info('Najprije odaberi os tipkom X, Y ili Z.'); return; }
  if (!smijeGibati()) { info(!st.struja ? 'Stroj nije uključen.' : st.gljiva ? 'Gljiva za nužno zaustavljanje je pritisnuta.' : !st.pogoniI || !st.posEn ? 'Pogoni osi nisu uključeni (( I ), FEED START).' : st.alarm ? 'Alarm: pritisni RESET.' : 'Gibanje nije moguće.'); return; }
  if (st.nacin !== 'JOG') { info('Osi se ručno gibaju samo u načinu rada JOG.'); return; }
  const o = st.os;
  if (st.refNacin) {
    if (st.ref[o]) { info('Os ' + o + ' je već referencirana.'); return; }
    if (sgn < 0) { info('Referentna točka traži se u smjeru +.'); return; }
    if (o !== 'Z' && !st.ref.Z) { info('Najprije referenciraj os Z.'); return; }
    st.pomicanje = { os: o, cilj: REF[o], v: F_REF, ref: true };
    dogadaj('ref' + o + 'start');
    return;
  }
  if (st.inc) { const d = sgn * st.inc / 1000; st.pomicanje = { os: o, cilj: st.nos[o] + d, v: F_JOG }; }
  else st.pomicanje = { os: o, cilj: st.nos[o] + sgn * 1e6, v: rapid ? F_RAPID : F_JOG, drzi: true };
}
function pusti() { if (st.pomicanje && st.pomicanje.drzi) st.pomicanje = null; }
function korakGibanja(dt) {
  const P = st.pomicanje; if (!P) return;
  const o = P.os; const v = P.v * (P.ref ? 1 : st.fOver / 100) / 60;
  const d = P.cilj - st.nos[o]; const s = Math.sign(d) * Math.min(Math.abs(d), v * dt);
  let nov = st.nos[o] + s;
  if (nov < HOD[o][0] || nov > HOD[o][1]) { nov = Math.min(Math.max(nov, HOD[o][0]), HOD[o][1]); st.pomicanje = null; info('Os ' + o + ' je na kraju hoda.'); }
  st.nos[o] = nov;
  const sd = provjeriSudar(false); if (sd) { sudar(sd); return; }
  if (Math.abs(P.cilj - st.nos[o]) < 1e-9) { if (P.ref) { st.ref[o] = true; dogadaj('ref' + o); } st.pomicanje = null; dogadaj('pomak'); }
}

/* ================================================================== */
/* 7. G-kod i ciklus POCKET4                                          */
/* ================================================================== */
function dzepPutanja(p, R, G54, Ltool) {   /* kružni džep: kružnice od središta prema rubu, po dubinama MID */
  const pts = []; const r = ALATI[R].R; const cx = p.PA + G54.X, cy = p.PO + G54.Y;
  const zRTP = p.RTP + G54.Z, zRFP = p.RFP + G54.Z, zDP = p.DP + G54.Z, s = Math.max(0.5, r * 1.6);
  const maks = p.PRAD - r - p.FAL; if (maks <= 0) return pts;
  pts.push([cx, cy, zRTP, 0, 0]); pts.push([cx, cy, zRFP + p.SDIS, 0, 0]);
  let z = zRFP;
  while (z > zDP + 1e-6) {
    z = Math.max(zDP, z - p.MID); pts.push([cx, cy, z, 1, p.FFD]);
    for (let rr = s; rr < maks + s - 1e-6; rr += s) {
      const rk = Math.min(rr, maks); const n = Math.max(24, Math.ceil(rk * Math.PI * 2 / 0.5));
      for (let i = 0; i <= n; i++) { const a = (p.CDIR ? -1 : 1) * i / n * Math.PI * 2; pts.push([cx + rk * Math.cos(a), cy + rk * Math.sin(a), z, 1, p.FFP1]); }
    }
    pts.push([cx, cy, z, 1, p.FFP1]);
  }
  pts.push([cx, cy, zRTP, 0, 0]);
  return pts;
}
function prevedi(tekst) {
  /* izlaz: točke [X, Y, Zvrh, tip(0/1), F, red, alat, S] u MKS-u (vrh alata) */
  const P = []; let g = 0, F = 0, S = 0, T = st.T, alat = st.alatUVretenu || st.T, abs = true;
  let x = st.nos.X, y = st.nos.Y, z = st.nos.Z - (alat ? ALATI[alat].L : 0), greske = [];
  const redci = tekst.replace(/\r/g, '').split('\n');
  const dodaj = (X, Y, Z, tip, f, red) => P.push([X, Y, Z, tip, f, red, alat, S]);
  redci.forEach((rr, red) => {
    let s = rr.replace(/\(.*?\)/g, ''); const k = s.indexOf(';'); if (k >= 0) s = s.slice(0, k); s = s.trim().toUpperCase(); if (!s) return;
    const pk = s.match(/^POCKET4\(([^)]*)\)/);
    if (pk) {
      const v = pk[1].split(',').map((q) => (q.trim() === '' ? 0 : parseFloat(q)));
      const p = {}; POCKET4_POLJA.forEach(([n], i) => { p[n] = v[i] || 0; });
      dzepPutanja(p, alat, st.G54).forEach((q) => dodaj(q[0], q[1], q[2], q[3], q[4], red));
      const zadnja = P[P.length - 1]; if (zadnja) { x = zadnja[0]; y = zadnja[1]; z = zadnja[2]; }
      return;
    }
    const w = {}; const re = /([A-Z]{1,3})\s*(=)?\s*([-+]?\d*\.?\d+)/g; let m;
    while ((m = re.exec(s))) { const a = m[1], v = parseFloat(m[3]); if (a === 'G' || a === 'M') (w[a] = w[a] || []).push(v); else w[a] = v; }
    (w.G || []).forEach((v) => { if ([0, 1, 2, 3].includes(v)) g = v; else if (v === 90) abs = true; else if (v === 91) abs = false; });
    if (w.F !== undefined) F = w.F; if (w.S !== undefined) S = w.S;
    if (w.T !== undefined) T = w.T;
    if ((w.M || []).includes(6)) { if (!ALATI[T]) { greske.push('red ' + (red + 1) + ': alat T' + T + ' nije u popisu alata'); return; } alat = T; z = st.nos.Z - ALATI[alat].L; }
    const ima = ['X', 'Y', 'Z'].some((a) => w[a] !== undefined); if (!ima) return;
    const Lt = alat ? ALATI[alat].L : 0;
    const nx_ = w.X !== undefined ? (abs ? w.X + st.G54.X : x + w.X) : x;
    const ny_ = w.Y !== undefined ? (abs ? w.Y + st.G54.Y : y + w.Y) : y;
    const nz_ = w.Z !== undefined ? (abs ? w.Z + st.G54.Z : z + w.Z) : z;
    if (g <= 1) { dodaj(nx_, ny_, nz_, g, g ? F : 0, red); }
    else {
      let cx, cy; const dx = nx_ - x, dy = ny_ - y, d = Math.hypot(dx, dy), cw = g === 2;
      if (w.CR !== undefined || w.R !== undefined) { const R = w.CR !== undefined ? w.CR : w.R, r = Math.abs(R); if (d > 2 * r + 1e-4 || d < 1e-9) { greske.push('red ' + (red + 1) + ': krivi polumjer luka'); return; } const h = Math.sqrt(Math.max(0, r * r - d * d / 4)), s2 = (cw ? 1 : -1) * (R < 0 ? -1 : 1); cx = (x + nx_) / 2 + s2 * h * dy / d; cy = (y + ny_) / 2 - s2 * h * dx / d; }
      else { cx = x + (w.I || 0); cy = y + (w.J || 0); }
      const r = Math.hypot(x - cx, y - cy); const a0 = Math.atan2(y - cy, x - cx), a1 = Math.atan2(ny_ - cy, nx_ - cx); let da = a1 - a0;
      if (d < 1e-9) da = cw ? -2 * Math.PI : 2 * Math.PI; else if (cw) { while (da >= 0) da -= 2 * Math.PI; } else { while (da <= 0) da += 2 * Math.PI; }
      const n = Math.max(4, Math.ceil(Math.abs(da) * r / 0.5));
      for (let i = 1; i <= n; i++) { const a = a0 + da * i / n; dodaj(cx + r * Math.cos(a), cy + r * Math.sin(a), z + (nz_ - z) * i / n, 1, F, red); }
    }
    x = nx_; y = ny_; z = nz_; void Lt;
  });
  return { P, greske, redci };
}

/* ================================================================== */
/* 8. Koraci: provjera događaja                                       */
/* ================================================================== */
function trenutni() { return niz ? niz.koraci[korak] : null; }
function dogadaj(e, podatak) {
  const k = trenutni(); if (!k || st.sudar) return;
  const ok = (() => {
    switch (k[2]) {
      case 'sklopka': return e === 'sklopka';
      case 'gljiva': return e === 'gljiva';
      case 'pogoni': return st.pogoniI && st.vrEn && st.posEn;
      case 'reset': return e === 'reset';
      case 'refZ': return e === 'refZ'; case 'refY': return e === 'refY'; case 'refX': return e === 'refX';
      case 'mda': return st.nacin === 'MDA';
      case 't3': return e === 'mdaIzveden' && st.alatUVretenu === 3;
      case 's1000': return e === 'mdaIzveden' && st.vreteno && st.Sset === 1000;
      case 'jog': return st.nacin === 'JOG';
      case 'polozaj': return e === 'pomak' && Math.abs(prikazWKS('X') - 50) < 0.0005 && Math.abs(prikazWKS('Y') - 30.2) < 0.0005 && Math.abs(prikazWKS('Z') - 8) < 0.0005;
      case 'parametri': return st.podrucje === 'Parameter';
      case 't7': return st.podrucje === 'Parameter' && st.alatParam === 7;
      case 'l1': return e === 'l1' && Math.abs(ALATI[7].L - 153.024) < 1e-6;
      case 'machine': return st.podrucje === 'Machine';
      case 'dalje': return e === 'dalje';
      case 'scratching': return st.dijalog === 'scratch';
      case 'g54': return e === 'g54';
      case 'dodirX': { const p = pokazivac(); return e === 'pomak' && p && p.os === 'X' && Math.abs(p.d) < 0.0005; }
      case 'unosX': return e === 'unosX';
      case 'dodirY': { const p = pokazivac(); return e === 'pomak' && p && p.os === 'Y' && Math.abs(p.d) < 0.0005; }
      case 'unosY': return e === 'unosY';
      case 'dodirZ': { const p = pokazivac(); return e === 'pomak' && p && p.os === 'Z' && Math.abs(p.d) < 0.0005; }
      case 'unosZ': return e === 'unosZ';
      case 'ok': return e === 'scratchOK';
      case 'program': return st.podrucje === 'Program';
      case 'novi': return e === 'noviOK';
      case 'pG54': return e === 'redak' && podatak === 'G54';
      case 'pT8': return st.ed && st.ed.redci.includes('T8') && st.ed.redci.includes('M6');
      case 'dzep': return st.dijalog === 'pocket';
      case 'dzepOK': return e === 'dzepOK';
      case 'izlaz': return e === 'editorIzlaz';
      case 'otvori': return st.ed && st.ed.ime === 'VMDEMO';
      case 's4000': return st.ed && st.ed.redci[3] === 'S4000 M3';
      case 'natrag': return st.dijalog === 'pocket' && st.kontura === 'natrag';
      case 'abort': return e === 'dzepAbort';
      case 'odabir': return st.ucitan && /^P\d\d/.test(st.ucitan) && st.nacin === 'AUTO';
      case 'f10': return st.fOver <= 10;
      case 'start': return e === 'cycleStart' && st.auto && st.auto.ide;
      case 'gotovo': return e === 'programKraj';
      default: return false;
    }
  })();
  if (ok) { korak++; if (korak >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); } crtajKorak(); }
}

/* ================================================================== */
/* 9. Sučelje upravljanja (zaslon, softkeyevi, tipke)                  */
/* ================================================================== */
const HSK = {
  Machine_JOG: ['', 'Preset', 'Scratching', 'Measuring workpiece', 'Measuring tool', 'Hand-wheel', 'INC', 'Swivelling'],
  Machine_MDA: ['', '', '', 'Influence on', '', 'Hand-wheel', 'Editor functions', 'MDA File Fct.'],
  Machine_AUTO: ['Over-storing', '', 'DRF offset', 'Influence on', 'Block search', 'Hand-wheel', 'Program compens.', 'Program overview'],
  Menu: ['Machine', 'Parameter', 'Program', 'Services', 'Diagnosis', 'Commissioning', '', ''],
  Parameter: ['Tool compens.', 'R Parameter', 'Setting data', 'Zero point offset', 'User data', 'Active ZO + comp.', '', ''],
  Program: ['Workpieces', 'Workpiece programs', 'Sub-routines', 'Standard cycles', 'User cycles', 'Manufact. cycles', '', ''],
  Editor: ['Edit', 'Contour', 'Drilling', 'Milling', 'Turning', '', 'Simulation', 'Translate back']
};
const VSK = {
  Machine: ['G Fct. + Transfer', 'Help functions', 'Spindles', 'Axis advance', 'Program levels', 'Zoom Actual', 'Actual val. MKS/WKS', ''],
  Parameter: ['T-No +', 'T-No −', 'D-No +', 'D-No −', 'Delete…', 'Go to…', 'Overview…', 'New…'],
  Program: ['', 'New…', 'Load HD→NC', 'Unload NC→HD', 'Simulation', 'Program manag.', 'Selection', ''],
  Editor: ['Over-write', 'Mark block', '', '', '', 'Search / Go to', 'File select', 'Exit editor'],
  Milling: ['Face milling', 'Contour milling', 'Standard pockets', 'Grooving', 'Tenon', '', '', ''],
  Pockets: ['', '', '', 'Rectangular pocket', 'Circular pocket', '', '', ''],
  OkAbort: ['', '', '', '', '', '', 'Abort', 'OK'],
  Scratch: ['', '', 'Basis ZD', '', '', '', 'Abort', 'OK'],
  YesNo: ['', '', '', '', '', 'Abort', 'No', 'Yes'],
  Novi: ['', '', '', '', '', '', 'Abort', 'OK']
};
function trenutniHSK() {
  if (st.izbornik) return HSK.Menu;
  if (st.podrucje === 'Machine') return st.dijalog === 'scratch' ? new Array(8).fill('') : HSK['Machine_' + st.nacin];
  if (st.podrucje === 'Parameter') return HSK.Parameter;
  if (st.podrucje === 'Program') return st.ed ? HSK.Editor : HSK.Program;
  return new Array(8).fill('');
}
function trenutniVSK() {
  if (st.vsk) return VSK[st.vsk];
  if (st.dijalog === 'scratch') return VSK.Scratch;
  if (st.podrucje === 'Machine') return VSK.Machine;
  if (st.podrucje === 'Parameter') return VSK.Parameter;
  if (st.podrucje === 'Program') return st.ed ? VSK.Editor : VSK.Program;
  return new Array(8).fill('');
}
function info(t) { $('poruka').innerHTML = esc(t); }

function zaslon() {
  const el = $('hmi');
  if (!st.struja) { el.innerHTML = '<div class="hmi-crno"></div>'; return; }
  if (st.podizanje > 0) { el.innerHTML = '<div class="hmi-crno"><span>SINUMERIK — pokretanje sustava, pričekaj…</span></div>'; return; }
  const nacin = st.nacin === 'JOG' ? (st.refNacin ? 'JOG Ref' : (st.inc ? 'JOG Inc ' + st.inc : 'JOG')) : st.nacin;
  const kanal = st.alarm ? (st.gljiva ? 'EMERGENCY STOP active' : 'Channel RESET — alarm') : st.auto && st.auto.ide ? 'Channel active' : 'Channel RESET';
  const prog = st.ucitan || 'MPF.DIR';
  let h = '<div class="hmi-gl"><span class="hp">' + esc(st.podrucje) + '</span><span class="hp">CHAN1</span><span class="hp">' + esc(nacin) + '</span><span class="hp siroko">\\MPF.DIR\\' + esc(prog) + '</span></div>';
  h += '<div class="hmi-st"><span class="' + (st.alarm ? 'upoz' : '') + '">' + esc(kanal) + '</span><span>' + (st.auto && st.auto.ide ? 'Program running' : 'Program aborted') + '</span><span>ROV</span></div>';
  if (st.podrucje === 'Machine') {
    const ks = st.wks ? 'WKS' : 'MKS';
    h += '<div class="hmi-dva"><table class="hmi-t"><thead><tr><th>' + ks + '</th><th>Position</th><th>' + (st.auto ? 'Remaining path' : 'Repos') + '</th></tr></thead><tbody>';
    OSI.forEach((o) => { const v = st.wks ? prikazWKS(o) : prikazMKS(o); h += '<tr' + (st.os === o ? ' class="sel"' : '') + '><td>' + (st.ref[o] ? '' : '<i class="nref" title="nije referencirano">○</i>') + o + (st.wks ? '' : '1') + '</td><td class="br">' + br(v) + ' mm</td><td class="br">0.000</td></tr>'; });
    h += '</tbody></table><div class="hmi-desno"><div class="hk">Master spindle S1</div><div>Act. <b>' + br(st.vreteno ? st.Sset * st.sOver / 100 : 0, 0) + '</b> rpm</div><div>Set <b>' + br(st.Sset, 0) + '</b> rpm · ' + st.sOver + ' %</div>' +
      '<div class="hk">Advance [mm/min]</div><div>Act. <b>' + br(st.auto && st.auto.ide ? st.auto.F * st.fOver / 100 : 0, 0) + '</b> · ' + st.fOver + ' %</div>' +
      '<div class="hk">Tool</div><div>T' + st.T + ' &nbsp; D' + st.D + ' &nbsp; G01 G40 G54</div></div></div>';
    if (st.dijalog === 'scratch') {
      const S = st.scratch, p = pokazivac();
      h += '<div class="hmi-dlg"><div class="hk">Scratching</div><table class="hmi-t"><tr><td>plane</td><td>G17</td><td>T-No.</td><td>' + (st.alatUVretenu || 0) + '</td></tr><tr><td>Zero point offset</td><td class="' + (S.polje === 'ZO' ? 'kur' : '') + '">' + esc(S.ZO || '') + (S.polje === 'ZO' ? esc(st.unos) : '') + '</td><td>Length</td><td>' + br(SONDA_L) + '</td></tr>';
      OSI.forEach((o) => { h += '<tr><td>' + o + '</td><td class="br">' + br(S.offset[o]) + '</td><td class="' + (S.polje === o ? 'kur' : '') + '">' + (S.polje === o ? esc(st.unos) || '&nbsp;' : (S.vrij[o] !== null ? br(S.vrij[o]) : '')) + '</td><td></td></tr>'; });
      h += '</table><div class="sonda">Pokazivač sonde: ' + (p ? '<b>' + p.os + ' ' + br(p.d) + ' mm</b>' : '— sonda nije uz rub ni iznad obratka') + '</div></div>';
    } else if (st.nacin === 'MDA') {
      h += '<div class="hmi-dlg"><div class="hk">MDA \\MPF.DIR\\SIN840D.MPF</div><div class="mda">' + esc(st.mda) + '<span class="kursor">▌</span></div></div>';
    } else if (st.nacin === 'AUTO' && st.auto) {
      const r = st.auto.trenRed; const R = st.auto.redci;
      h += '<div class="hmi-dlg"><div class="hk">Current line &nbsp; ' + esc(st.ucitan || '') + '</div>' + [0, 1, 2, 3].map((i) => '<div class="red' + (i === 0 ? ' akt' : '') + '">' + esc(R[r + i] || '') + '</div>').join('') + '</div>';
    }
  } else if (st.podrucje === 'Parameter') {
    const a = ALATI[st.alatParam] || ALATI[0];
    h += '<div class="hmi-dlg"><div class="hk">Tool compensations</div><table class="hmi-t"><tr><td>T number</td><td>' + st.alatParam + '</td><td>D number</td><td>1</td></tr><tr><td>Tool type</td><td colspan="3">' + esc(a.naziv) + '</td></tr>' +
      '<tr><td>Length 1</td><td class="' + (st.paramPolje === 0 ? 'kur' : '') + '">' + (st.paramPolje === 0 && st.unos ? esc(st.unos) : br(a.L)) + '</td><td>Wear</td><td>0.000</td></tr><tr><td>Length 2</td><td>0.000</td><td></td><td></td></tr><tr><td>Radius</td><td>' + br(a.R) + '</td><td>Wear</td><td>0.000</td></tr></table></div>';
  } else if (st.podrucje === 'Program') {
    if (st.dijalog === 'pocket') {
      const v = st.dzepVrij;
      h += '<div class="hmi-dlg dzep"><div class="hk">Circular pocket POCKET4</div><table class="hmi-t">' + POCKET4_POLJA.map(([n, opis], i) => '<tr><td>' + n + '</td><td class="br' + (st.kontura === 'natrag' && n === 'PA' && v[i] !== 60 ? ' upoz' : '') + '">' + v[i] + '</td><td class="op">' + esc(opis) + '</td></tr>').join('') + '</table></div>';
    } else if (st.dijalog === 'novi') {
      h += '<div class="hmi-dlg"><div class="hk">New program</div><div>Name: <span class="kur">' + esc(st.unos || 'VMDEMO') + '</span> &nbsp; Type: MPF</div></div>';
    } else if (st.dijalog === 'pitanje') {
      h += '<div class="hmi-dlg"><div class="hk">Exit editor</div><div>Save changes and exit the editor?</div></div>';
    } else if (st.ed) {
      h += '<div class="hmi-dlg ed"><div class="hk">Editor &nbsp; \\MPF.DIR\\' + esc(st.ed.ime) + '.MPF</div>' + st.ed.redci.map((r, i) => { const t = i === st.ed.kursor && st.ed.unos !== null ? st.ed.unos : r; const k = i === st.ed.kursor ? (st.ed.kol === null ? t.length : st.ed.kol) : -1; return '<div class="red' + (i === st.ed.kursor ? ' akt' : '') + '">' + (k >= 0 ? esc(t.slice(0, k)) + '<span class="kursor">▌</span>' + esc(t.slice(k)) : esc(t)) + '¶</div>'; }).join('') + (st.ed.kursor >= st.ed.redci.length ? '<div class="red akt">' + esc(st.unos) + '▌</div>' : '') + '<div class="red">=eof=</div></div>';
    } else {
      const imena = Object.keys(st.programi).sort();
      h += '<div class="hmi-dlg"><div class="hk">Program selection</div><table class="hmi-t"><tr><th>Name</th><th>Type</th><th>Loaded</th><th>Length</th></tr>' + imena.map((n, i) => '<tr class="' + (i === st.listaKursor ? 'kur' : '') + '"><td>' + esc(n) + '</td><td>MPF</td><td>' + (st.nc === n ? '×' : '') + '</td><td class="br">' + st.programi[n].length + '</td></tr>').join('') + '</table></div>';
    }
  }
  el.innerHTML = h;
}
function softkeyi() {
  const hs = trenutniHSK(), vs = trenutniVSK();
  $('hsk').innerHTML = hs.map((t, i) => '<button type="button" class="sk" data-hsk="' + i + '"' + (t ? '' : ' disabled') + '>' + esc(t) + '</button>').join('');
  $('vsk').innerHTML = vs.map((t, i) => '<button type="button" class="sk" data-vsk="' + i + '"' + (t ? '' : ' disabled') + '>' + esc(t) + '</button>').join('');
}
function crtaj() {
  zaslon(); softkeyi();
  document.querySelectorAll('[data-nacin]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.nacin === st.nacin && !(b.dataset.nacin === 'JOG' && st.refNacin)) || (b.dataset.nacin === 'REF' && st.refNacin && st.nacin === 'JOG'))));
  document.querySelectorAll('[data-inc]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.inc === st.inc)));
  document.querySelectorAll('[data-os]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.os === st.os)));
  $('gljiva').setAttribute('aria-pressed', String(st.gljiva));
  $('k-I').setAttribute('aria-pressed', String(st.pogoniI)); $('k-sstart').setAttribute('aria-pressed', String(st.vrEn)); $('k-fstart').setAttribute('aria-pressed', String(st.posEn));
  $('f-over').value = String(st.fOver); $('f-over-v').textContent = st.fOver + ' %'; $('s-over').value = String(st.sOver); $('s-over-v').textContent = st.sOver + ' %';
  $('k-sklopka').setAttribute('aria-pressed', String(st.struja)); $('k-sbl').setAttribute('aria-pressed', String(!!st.sbl));
}

/* --- unos s tipkovnice upravljanja ------------------------------- */
function uredi() { if (st.ed.unos === null) { st.ed.unos = st.ed.redci[st.ed.kursor]; if (st.ed.kol === null) st.ed.kol = st.ed.unos.length; } }
function znak(c) {
  if (!st.struja || st.podizanje > 0) return;
  if (st.podrucje === 'Machine' && st.nacin === 'MDA' && !st.dijalog) { st.mda += c; }
  else if (st.ed && !st.dijalog) { if (st.ed.kursor >= st.ed.redci.length) st.unos += c; else { uredi(); const u = st.ed.unos; st.ed.unos = u.slice(0, st.ed.kol) + c + u.slice(st.ed.kol); st.ed.kol++; } }
  else st.unos += c;
  crtaj();
}
function brisi(naprijed) {
  if (st.podrucje === 'Machine' && st.nacin === 'MDA' && !st.dijalog) st.mda = st.mda.slice(0, -1);
  else if (st.ed && !st.dijalog && st.ed.kursor < st.ed.redci.length) { uredi(); const u = st.ed.unos, k = st.ed.kol; if (naprijed) st.ed.unos = u.slice(0, k) + u.slice(k + 1); else if (k > 0) { st.ed.unos = u.slice(0, k - 1) + u.slice(k); st.ed.kol--; } }
  else st.unos = st.unos.slice(0, -1);
  crtaj();
}
function stupac(d) { if (!st.ed || st.dijalog || st.ed.kursor >= st.ed.redci.length) return; const r = st.ed.unos !== null ? st.ed.unos : st.ed.redci[st.ed.kursor]; if (st.ed.kol === null) st.ed.kol = r.length; st.ed.kol = Math.max(0, Math.min(r.length, st.ed.kol + d)); crtaj(); }
function input() {
  if (!st.struja) return;
  if (st.podrucje === 'Machine' && st.nacin === 'MDA' && !st.dijalog) { st.mda += '\n'; crtaj(); return; }
  if (st.dijalog === 'scratch') {
    const S = st.scratch;
    if (S.polje === 'ZO') { if (st.unos.trim().toUpperCase() === 'G54') { S.ZO = 'G54'; S.offset = { ...st.G54 }; S.polje = 'X'; st.unos = ''; dogadaj('g54'); } else info('Upiši G54.'); crtaj(); return; }
    const v = parseFloat(st.unos.replace(',', '.')); if (!isFinite(v)) { info('Upiši broj.'); return; }
    const o = S.polje; S.vrij[o] = v; st.unos = '';
    const tren = st.nos[o];                                   /* prikaz bez korekcije sonde (T0) */
    if (o === 'Z') S.offset.Z = tren + v; else S.offset[o] = tren - v;
    S.polje = o === 'X' ? 'Y' : o === 'Y' ? 'Z' : 'Z';
    dogadaj(o === 'X' ? 'unosX' : o === 'Y' ? 'unosY' : (Math.abs(v + SONDA_L) < 1e-6 ? 'unosZ' : 'krivoZ'));
    if (o === 'Z' && Math.abs(v + SONDA_L) > 1e-6) info('Za Z upiši duljinu sonde s predznakom minus: −291.818.');
    crtaj(); return;
  }
  if (st.podrucje === 'Parameter') {
    const v = parseFloat(st.unos.replace(',', '.')); if (st.unos && isFinite(v)) { ALATI[st.alatParam].L = v; st.unos = ''; dogadaj('l1'); } crtaj(); return;
  }
  if (st.dijalog === 'novi') { st.unos = st.unos || 'VMDEMO'; crtaj(); return; }
  if (st.ed && !st.dijalog) {
    if (st.ed.kursor >= st.ed.redci.length) { const r = st.unos.trim().toUpperCase(); if (r) { st.ed.redci.push(r); st.ed.kursor = st.ed.redci.length; st.unos = ''; dogadaj('redak', r); automatskiRetci(); } }
    else { if (st.ed.unos !== null) { st.ed.redci[st.ed.kursor] = st.ed.unos.toUpperCase(); st.ed.unos = null; dogadaj('redak'); } st.ed.kursor++; st.ed.kol = null; }
    crtaj(); return;
  }
  if (st.podrucje === 'Program' && !st.ed) { const n = Object.keys(st.programi).sort()[st.listaKursor]; otvoriEditor(n); return; }
}
function automatskiRetci() {               /* nakon T8 i M6 upravljanje doda S3000 M3 … G0 Z2 (kao u tečaju) */
  const r = st.ed.redci;
  if (r.length === 3 && r[0] === 'G54' && r[1] === 'T8' && r[2] === 'M6') { r.push('S3000 M3', 'G0 X3 Y-6', 'G0 Z-5', 'G1 Y96 F300', 'G0 Z2'); st.ed.kursor = r.length; }
}
function otvoriEditor(ime) { st.ed = { ime, redci: st.programi[ime] ? st.programi[ime].split('\n') : [], kursor: 0, unos: null, kol: null }; dogadaj('otvoren'); crtaj(); }
function kursor(d) {
  if (st.podrucje === 'Program' && !st.ed) { const n = Object.keys(st.programi).length; st.listaKursor = (st.listaKursor + d + n) % n; crtaj(); return; }
  if (st.ed && !st.dijalog) { if (st.ed.unos !== null) { st.ed.redci[st.ed.kursor] = st.ed.unos.toUpperCase(); st.ed.unos = null; dogadaj('redak'); } st.ed.kursor = Math.max(0, Math.min(st.ed.redci.length, st.ed.kursor + d)); st.ed.kol = null; crtaj(); return; }
  if (st.podrucje === 'Parameter') { st.paramPolje = 0; crtaj(); }
}

/* --- softkeyevi --------------------------------------------------- */
function hsk(i) {
  const t = trenutniHSK()[i]; if (!t) return;
  if (st.izbornik) { st.izbornik = false; if (t === 'Machine' || t === 'Parameter' || t === 'Program') { st.podrucje = t; st.dijalog = null; st.vsk = null; if (t !== 'Program') st.ed = null; dogadaj('podrucje'); } crtaj(); return; }
  if (t === 'Scratching') { if (st.nacin !== 'JOG') { info('Dodirivanje radi samo u načinu JOG.'); return; } st.dijalog = 'scratch'; st.scratch = { polje: 'ZO', ZO: '', offset: { ...st.G54 }, vrij: { X: null, Y: null, Z: null } }; st.unos = ''; dogadaj('scratching'); crtaj(); return; }
  if (t === 'Milling') { st.vsk = 'Milling'; crtaj(); return; }
  if (t === 'Translate back') {
    const r = st.ed && st.ed.redci[st.ed.kursor]; if (!r || !/^POCKET4/.test(r)) { info('Kursor mora biti u retku s ciklusom POCKET4.'); return; }
    const v = r.match(/\(([^)]*)\)/)[1].split(',').map((q) => (q.trim() === '' ? 0 : parseFloat(q)));
    st.dzepVrij = POCKET4_POLJA.map((p, k) => (v[k] === undefined || isNaN(v[k]) ? 0 : v[k]));
    if (niz && niz.id === 'uredivanje') st.dzepVrij[5] = 70;   /* u tečaju je PA greškom promijenjen na 70 */
    st.dijalog = 'pocket'; st.kontura = 'natrag'; st.vsk = 'OkAbort'; dogadaj('natrag'); crtaj(); return;
  }
  if (t === 'Tool compens.') { crtaj(); return; }
  info('Ovaj softkey u simulatoru nije potreban za vježbu.');
}
function vsk(i) {
  const t = trenutniVSK()[i]; if (!t) return;
  if (t === 'Actual val. MKS/WKS') { st.wks = !st.wks; crtaj(); return; }
  if (t === 'T-No +' || t === 'T-No −') { const br_ = Object.keys(ALATI).map(Number).filter((n) => n > 0 && n < 99); let k = br_.indexOf(st.alatParam); k = (k + (t === 'T-No +' ? 1 : -1) + br_.length) % br_.length; st.alatParam = br_[k]; st.unos = ''; dogadaj('tno'); crtaj(); return; }
  if (t === 'New…') { st.dijalog = 'novi'; st.unos = 'VMDEMO'; st.vsk = 'Novi'; crtaj(); return; }
  if (st.vsk === 'Novi') {
    if (t === 'OK') { const ime = (st.unos || 'VMDEMO').toUpperCase(); st.programi[ime] = ''; st.dijalog = null; st.vsk = null; st.unos = ''; st.ed = { ime, redci: [], kursor: 0, unos: null, kol: null }; dogadaj('noviOK'); }
    else { st.dijalog = null; st.vsk = null; }
    crtaj(); return;
  }
  if (t === 'Standard pockets') { st.vsk = 'Pockets'; crtaj(); return; }
  if (t === 'Circular pocket') { st.dzepVrij = POCKET4_POLJA.map((p) => p[2]); st.dijalog = 'pocket'; st.kontura = 'novi'; st.vsk = 'OkAbort'; dogadaj('dzep'); crtaj(); return; }
  if (st.dijalog === 'pocket') {
    if (t === 'OK') {
      const linija = 'POCKET4(' + st.dzepVrij.join(',') + ',,)';
      if (st.kontura === 'novi') { st.ed.redci.push(linija, 'G0 Z100', 'M30'); st.ed.kursor = st.ed.redci.length; dogadaj('dzepOK'); }
      else { st.ed.redci[st.ed.kursor] = linija; info('Ciklus je preuzet s promijenjenim vrijednostima.'); }
    } else { dogadaj('dzepAbort'); }
    st.dijalog = null; st.vsk = null; st.kontura = null; crtaj(); return;
  }
  if (t === 'Exit editor') { st.dijalog = 'pitanje'; st.vsk = 'YesNo'; crtaj(); return; }
  if (st.dijalog === 'pitanje') {
    if (t === 'Yes') { st.programi[st.ed.ime] = st.ed.redci.join('\n'); st.ed = null; dogadaj('editorIzlaz'); }
    st.dijalog = null; st.vsk = null; crtaj(); return;
  }
  if (st.dijalog === 'scratch') {
    if (t === 'OK') { st.G54 = { ...st.scratch.offset }; st.dijalog = null; dogadaj('scratchOK'); }
    else if (t === 'Abort') st.dijalog = null;
    crtaj(); return;
  }
  if (t === 'Load HD→NC') { const n = Object.keys(st.programi).sort()[st.listaKursor]; st.nc = n; info('Program ' + n + ' je učitan u NC.'); crtaj(); return; }
  if (t === 'Selection') { const n = Object.keys(st.programi).sort()[st.listaKursor]; if (st.nc !== n) { info('Najprije učitaj program softkeyem Load.'); return; } st.ucitan = n; pripremiAuto(); dogadaj('odabir'); crtaj(); return; }
  info('Ovaj softkey u simulatoru nije potreban za vježbu.');
}

/* --- strojna upravljačka ploča ----------------------------------- */
function nacin(n) {
  if (!st.struja) return;
  if (n === 'REF') { st.nacin = 'JOG'; st.refNacin = true; }
  else { st.nacin = n; st.refNacin = false; }
  if (n === 'AUTO' && st.ucitan) pripremiAuto();
  dogadaj('nacin'); crtaj();
}
function cycleStart() {
  if (!st.struja || st.sudar) return;
  if (!smijeGibati()) { info('Pogoni nisu spremni ili je aktivan alarm.'); return; }
  if (st.nacin === 'MDA') {
    const t = st.mda.replace(/\n/g, ' ').toUpperCase().trim(); if (!t) return;
    const mT = t.match(/T(\d+)/), m6 = /M0?6/.test(t), mS = t.match(/S(\d+)/), m3 = /M0?3/.test(t), m5 = /M0?5/.test(t);
    if (mT && m6) { const n = +mT[1]; if (!ALATI[n]) { info('Alat T' + n + ' nije u popisu alata.'); return; } st.T = n; st.alatUVretenu = n; st.vreteno = false; }
    if (mS) st.Sset = +mS[1]; if (m3) st.vreteno = st.Sset > 0; if (m5) st.vreteno = false;
    st.mdaZadnji = st.mda; st.mda = ''; dogadaj('mdaIzveden'); crtaj(); return;
  }
  if (st.nacin === 'AUTO' && st.auto) { if (st.auto.gotov) pripremiAuto(); if (st.auto.cekaSbl) { st.auto.cekaSbl = false; st.auto.dopusten = true; } st.auto.ide = true; dogadaj('cycleStart'); crtaj(); return; }
  info('CYCLE START radi u načinu MDA ili AUTO.');
}
function pripremiAuto() {
  const tekst = st.programi[st.ucitan] || '';
  const pr = PREDMETI[st.ucitan];
  if (pr) { const top = Math.max(PLOCA.top, 45 + pr.H); napraviBlank(pr.L, pr.W, pr.H, top); st.G54 = { X: PLOCA.x0, Y: PLOCA.y0, Z: top }; }
  else { napraviBlank(PLOCA.L, PLOCA.W, PLOCA.H); st.G54 = { X: PLOCA.x0, Y: PLOCA.y0, Z: PLOCA.top }; }
  crtajPredmet();
  const r = prevedi(tekst);
  let ob = { abs: true };
  const objasnjenja = r.redci.map((red) => { const o = objasni(red, ob); ob = o.stanje; return o.tekst; });
  st.auto = { P: r.P, redci: r.redci, objasnjenja, i: 0, u: 0, ide: false, gotov: false, trenRed: 0, F: 0, blokRed: -1, zadnjiPrikazan: -1 };
  if (r.greske.length) info('Upozorenje: ' + r.greske.join('; '));
}
function korakAuto(dt) {
  const A = st.auto; if (!A || !A.ide) return;
  let ostatak = dt;
  while (ostatak > 0 && A.i < A.P.length) {
    const p = A.P[A.i]; const Lt = p[6] ? ALATI[p[6]].L : 0;
    if (p[5] !== A.blokRed) {
      if (st.sbl && A.blokRed >= 0 && !A.dopusten) { A.ide = false; A.cekaSbl = true; A.trenRed = p[5]; prikaziBlok(A.blokRed + 1, p[5], true); crtaj(); return; }
      A.dopusten = false; A.blokRed = p[5];
    }
    if (p[6] !== st.alatUVretenu) { st.alatUVretenu = p[6]; st.T = p[6]; }
    st.Sset = p[7] || st.Sset; st.vreteno = st.Sset > 0;
    const cilj = { X: p[0], Y: p[1], Z: p[2] + Lt };
    const dx = cilj.X - st.nos.X, dy = cilj.Y - st.nos.Y, dz = cilj.Z - st.nos.Z, d = Math.hypot(dx, dy, dz);
    const v = (p[3] === 0 ? F_RAPID : Math.max(1, p[4])) * st.fOver / 100 / 60 * st.ubrzanje;
    A.F = p[3] === 0 ? F_RAPID : p[4]; A.trenRed = p[5];
    if (v <= 0) break;
    const s = v * ostatak; const od = { ...st.nos };
    if (s >= d) { st.nos = cilj; ostatak -= d / v; A.i++; }
    else { const u = s / d; st.nos = { X: st.nos.X + dx * u, Y: st.nos.Y + dy * u, Z: st.nos.Z + dz * u }; ostatak = 0; }
    if (st.alatUVretenu && st.alatUVretenu !== 99) {
      const Rt = ALATI[st.alatUVretenu].R, dd = Math.hypot(st.nos.X - od.X, st.nos.Y - od.Y, st.nos.Z - od.Z), n = Math.max(1, Math.ceil(dd / 0.5));
      for (let q = 1; q <= n; q++) skini(od.X + (st.nos.X - od.X) * q / n, od.Y + (st.nos.Y - od.Y) * q / n, od.Z + (st.nos.Z - od.Z) * q / n - Lt, Rt);
    }
    if (p[3] === 0) { const sd = provjeriSudar(false); if (sd) { sudar(sd); return; } }
  }
  if (A.trenRed !== A.zadnjiRed) { A.zadnjiRed = A.trenRed; crtajPredmet(); if (!st.sbl) prikaziBlok(A.trenRed, A.trenRed, false); }
  if (A.i >= A.P.length) { A.ide = false; A.gotov = true; st.vreteno = false; prikaziBlok(A.blokRed + 1, A.redci.length - 1, false); dogadaj('programKraj'); info('Program je završen (M30).'); }
}

/* objašnjenje bloka (korak po korak) — redci od..do, zadnji je sljedeći/trenutni blok s gibanjem */
function prikaziBlok(od, doR, sbl) {
  const A = st.auto, el = $('blok'); if (!A || !el) return;
  od = Math.max(0, Math.min(od, doR)); if (doR - od > 6) od = doR - 6;
  let h = '';
  for (let k = od; k <= doR; k++) { const kod = (A.redci[k] || '').trim(); if (!kod) continue; h += '<li' + (k === doR ? ' class="akt"' : '') + '><code>' + esc(kod) + '</code> <span>' + esc(A.objasnjenja[k] || '') + '</span></li>'; }
  el.innerHTML = '<p class="pom">' + (sbl ? 'SINGLE BLOCK: stroj čeka. Pročitaj blok i pritisni CYCLE START za sljedeći.' : 'Trenutni blok programa ' + esc(st.ucitan || '') + ' (redak ' + (doR + 1) + ' od ' + A.redci.length + ')') + '</p><ol class="blokovi" start="' + (od + 1) + '">' + h + '</ol>';
}
const OPISI = {};
function opisi(ime) {
  if (!OPISI[ime]) { const pr = PREDMETI[ime]; OPISI[ime] = pr ? opisiOperacije(pr.G, pr.ops, Object.fromEntries(Object.entries(ALATI).map(([k, v]) => [k, v.naziv]))) : []; }
  return OPISI[ime];
}
function crtajPredmet() {
  const el = $('predmet'); if (!el) return;
  const ime = st.ucitan, pr = PREDMETI[ime];
  if (!pr) { el.innerHTML = '<p class="pom">Predmet se prikazuje kad se u nizu „Izvođenje programa” odabere program P01 … P21.</p>'; return; }
  const red = st.auto ? st.auto.trenRed : -1; let akt = -1; pr.ops.forEach((o, i) => { if (red >= o.red) akt = i; }); const auto = opisi(ime);
  el.innerHTML = '<p><b>' + esc(ime) + '</b> · pripremak ' + pr.L + ' × ' + pr.W + ' × ' + pr.H + ' mm · nultočka G54: lijevi prednji gornji kut</p><ol class="ops">' +
    pr.ops.map((o, i) => '<li class="' + (i === akt ? 'akt' : '') + '"><b>' + esc(o.naziv.replace(/_/g, ' ')) + '</b> <span class="pom">(' + esc(o.vrsta) + ')</span>' + '<br><span>' + esc(o.opis || auto[i] || '') + '</span>' + '</li>').join('') + '</ol>' +
    (pr.opis ? '<p>' + esc(pr.opis) + '</p>' : '');
}

/* ================================================================== */
/* 10. Izbornik nizova i upute                                         */
/* ================================================================== */
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="kv"></span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
  el.querySelectorAll('[data-niz]').forEach((b) => b.addEventListener('click', () => pokreniNiz(b.dataset.niz)));
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korak + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k[0]) : 'Odaberi niz u izborniku lijevo.';
  $('pomoc').textContent = k ? k[1] : '';
  $('dalje').hidden = !(k && k[2] === 'dalje');
  crtajIzbornik(); crtaj();
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korak = 0; st.sudar = null; $('ponovi').hidden = true; $('poruka').textContent = '';
  pripremi(id); napraviBlank(PLOCA.L, PLOCA.W, PLOCA.H);
  st.podizanje = 0; alat3D = -1;
  if (id === 'izvodenje') st.listaKursor = 0;
  if (id === 'uredivanje') st.listaKursor = Math.max(0, Object.keys(st.programi).sort().indexOf('VMDEMO') - 1);
  st.ucitan = null; crtajPredmet(); const bl = $('blok'); if (bl) bl.innerHTML = '<p class="pom">Ovdje se pri izvođenju programa prikazuje trenutni blok s objašnjenjem. Uključi SINGLE BLOCK pa se program zaustavlja nakon svakog bloka.</p>';
  if (['pisanje', 'uredivanje', 'izvodenje'].includes(id)) { st.podrucje = id === 'izvodenje' ? 'Program' : 'Machine'; if (id === 'uredivanje') st.podrucje = 'Program'; }
  if (id === 'pisanje') { pogled('stroj'); } else if (id === 'nultocka') pogled('obradak'); else if (id === 'izvodenje') pogled('radni');
  crtajKorak();
}

/* ================================================================== */
/* 11. Povezivanje tipki                                               */
/* ================================================================== */
$('hsk').addEventListener('click', (e) => { const b = e.target.closest('[data-hsk]'); if (b) hsk(+b.dataset.hsk); });
$('vsk').addEventListener('click', (e) => { const b = e.target.closest('[data-vsk]'); if (b) vsk(+b.dataset.vsk); });
document.querySelectorAll('[data-nacin]').forEach((b) => b.addEventListener('click', () => nacin(b.dataset.nacin)));
document.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { if (!st.struja) return; st.nacin = 'JOG'; st.refNacin = false; st.inc = +b.dataset.inc === st.inc ? 0 : +b.dataset.inc; crtaj(); }));
document.querySelectorAll('[data-os]').forEach((b) => b.addEventListener('click', () => osTipka(b.dataset.os)));
const plus = $('k-plus'), minus = $('k-minus');
let rapid = false;
[[plus, 1], [minus, -1]].forEach(([b, s]) => {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); smjer(s, rapid); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, pusti));
});
$('k-rapid').addEventListener('pointerdown', () => { rapid = true; }); $('k-rapid').addEventListener('pointerup', () => { rapid = false; });
$('k-reset').addEventListener('click', () => { if (!st.struja) return; if (!st.gljiva) st.alarm = false; st.pomicanje = null; if (st.auto) { st.auto.ide = false; } st.mda = ''; dogadaj('reset'); crtaj(); });
$('k-cstart').addEventListener('click', cycleStart);
$('k-sbl').addEventListener('click', () => { if (!st.struja) return; st.sbl = !st.sbl; if (!st.sbl && st.auto && st.auto.cekaSbl) { st.auto.cekaSbl = false; st.auto.dopusten = true; } info(st.sbl ? 'SINGLE BLOCK uključen: program staje nakon svakog bloka.' : 'SINGLE BLOCK isključen.'); crtaj(); });
$('k-cstop').addEventListener('click', () => { if (st.auto) st.auto.ide = false; st.pomicanje = null; crtaj(); });
$('k-I').addEventListener('click', () => { if (!st.struja || st.gljiva) { info(st.struja ? 'Najprije otpusti gljivu.' : 'Stroj nije uključen.'); return; } st.pogoniI = true; dogadaj('pogoni'); crtaj(); });
$('k-sstart').addEventListener('click', () => { if (!st.pogoniI) { info('Najprije uključi pogone tipkom ( I ).'); return; } st.vrEn = true; dogadaj('pogoni'); crtaj(); });
$('k-fstart').addEventListener('click', () => { if (!st.pogoniI) { info('Najprije uključi pogone tipkom ( I ).'); return; } st.posEn = true; dogadaj('pogoni'); crtaj(); });
$('k-sstop').addEventListener('click', () => { st.vreteno = false; crtaj(); });
$('k-fstop').addEventListener('click', () => { st.posEn = false; if (st.auto) st.auto.ide = false; st.pomicanje = null; crtaj(); });
$('gljiva').addEventListener('click', () => {
  if (!st.struja) return;
  if (st.gljiva) { st.gljiva = false; dogadaj('gljiva'); }
  else { st.gljiva = true; st.alarm = true; st.pogoniI = false; st.vrEn = false; st.posEn = false; st.vreteno = false; st.pomicanje = null; if (st.auto && st.auto.ide) { st.auto.ide = false; if (niz && niz.id === 'izvodenje') { korak = niz.koraci.length - 1; $('uputa').innerHTML = '<b>Prekid</b><br>' + esc(PREKID); crtaj(); return; } } }
  crtaj();
});
function glavnaSklopka() {
  if (st.struja) { st.struja = false; st.alarm = true; st.pogoniI = st.vrEn = st.posEn = false; st.vreteno = false; crtaj(); return; }
  st.struja = true; st.podizanje = 2.5; st.alarm = true; crtaj();
}
$('k-sklopka').addEventListener('click', glavnaSklopka);
$('f-over').addEventListener('input', () => { st.fOver = +$('f-over').value; $('f-over-v').textContent = st.fOver + ' %'; dogadaj('fover'); zaslon(); });
$('s-over').addEventListener('input', () => { st.sOver = +$('s-over').value; $('s-over-v').textContent = st.sOver + ' %'; zaslon(); });
document.querySelectorAll('[data-znak]').forEach((b) => b.addEventListener('click', () => znak(b.dataset.znak)));
$('t-bs').addEventListener('click', () => brisi(false)); $('t-del').addEventListener('click', () => brisi(true));
$('t-input').addEventListener('click', input);
$('t-gore').addEventListener('click', () => kursor(-1)); $('t-dolje').addEventListener('click', () => kursor(1));
$('t-lijevo').addEventListener('click', () => stupac(-1)); $('t-desno').addEventListener('click', () => stupac(1));
$('t-menu').addEventListener('click', () => { if (!st.struja) return; st.izbornik = !st.izbornik; crtaj(); });
$('t-machine').addEventListener('click', () => { if (!st.struja) return; st.izbornik = false; st.podrucje = 'Machine'; st.vsk = null; if (st.dijalog !== 'scratch') st.dijalog = null; dogadaj('podrucje'); crtaj(); });
$('t-program').addEventListener('click', () => { if (!st.struja) return; st.izbornik = false; st.podrucje = 'Program'; st.dijalog = null; st.vsk = null; dogadaj('podrucje'); crtaj(); });
$('t-recall').addEventListener('click', () => {
  if (st.dijalog === 'pocket') { st.dijalog = null; st.vsk = null; dogadaj('dzepAbort'); }
  else if (st.vsk) st.vsk = null; else if (st.izbornik) st.izbornik = false;
  crtaj();
});
$('dalje').addEventListener('click', () => dogadaj('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); });
$('izbornik').addEventListener('click', () => { niz = null; korak = 0; crtajKorak(); });
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('brzina').addEventListener('change', () => { st.ubrzanje = +$('brzina').value; });
st.ubrzanje = 1;
/* fizička tipkovnica kad je fokus na upravljanju */
$('upravljanje').addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key.length === 1 && /[0-9A-Za-z .=,\-+()]/.test(e.key)) { znak(e.key.toUpperCase()); e.preventDefault(); }
  else if (e.key === 'Backspace') { brisi(false); e.preventDefault(); } else if (e.key === 'Delete') { brisi(true); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { stupac(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { stupac(1); e.preventDefault(); } else if (e.key === 'Enter') { input(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { kursor(-1); e.preventDefault(); } else if (e.key === 'ArrowDown') { kursor(1); e.preventDefault(); }
});
/* klik na glavnu sklopku u 3D prikazu */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
renderer.domElement.addEventListener('click', (e) => {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera); const h = ray.intersectObject(sklopka, false); if (h.length) { glavnaSklopka(); }
});

function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now(), zadnjiZaslon = 0;
function petlja(t) {
  const dtr = (t - zadnje) / 1000, dt = Math.min(0.1, dtr); zadnje = t;
  if (st.podizanje > 0) { st.podizanje -= dtr; if (st.podizanje <= 0) { st.podizanje = 0; dogadaj('sklopka'); crtaj(); } }
  korakGibanja(dt); korakAuto(dt); osvjeziBlank(); postavi3D();
  if (t - zadnjiZaslon > 120 && st.struja && st.podizanje <= 0 && (st.pomicanje || (st.auto && st.auto.ide))) { zadnjiZaslon = t; zaslon(); }
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(petlja);
}
napraviBlank(PLOCA.L, PLOCA.W, PLOCA.H);
crtajIzbornik(); crtajKorak(); velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__840 = { st, prikaziBlok, ALATI, NIZOVI, pokreniNiz, dogadaj, get niz() { return niz; }, get korak() { return korak; }, pokazivac, prikazWKS };
requestAnimationFrame(petlja);
