/* FORTRONIQ · Mala CNC glodalica 3020 — Upoznavanje stroja (izbornik sklopova, 3D prikaz, kartica s objašnjenjem).
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviStroj3020, postaviOkolinu, GEO } from './stroj3020.js?v=02';

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ sadržaj kartica */
const SKLOPOVI = [
  { id: 'okvir', naziv: 'Okvir', dijelovi: ['okvir'], anim: null, pogled: 'stroj', tekst: `
<p>Okvir (postolje) nosi sve ostale sklopove: vodilice stola, nepomični portal i pogon osi Y. Na stroju 3020 sastavljen je od aluminijskih profila s utorima i ploča spojenih vijcima.</p>
<p>Krutost okvira određuje koliko se stroj savija pod silom rezanja. Mala glodalica zato traži ravnu i stabilnu podlogu, oštar alat i male zahvate — dublji rez razdijeli u više prolaza.</p>
<p class="pazi-m">Prije rada provjeri da stroj stoji na sve četiri nožice i da su vijci okvira pritegnuti; labav spoj vidi se kao valovita površina i netočne mjere.</p>` },
  { id: 'stol', naziv: 'Stol s T-utorima i os Y', dijelovi: ['stol'], anim: 'Y', pogled: 'radni', tekst: `
<p>Stol je aluminijska ploča s T-utorima (oko 450 × 280 mm — procjena). U utore se T-maticama i vijcima pričvršćuju škripac, stezne pandže s podložnom pločom i četvrta os.</p>
<p>Stol se giba naprijed–natrag: to je <b>os Y</b>. Klizi na dvije okrugle vodilice s linearnim ležajevima, a pogoni ga koračni motor na stražnjoj strani preko navojnog vretena.</p>
<p class="pazi-m">Smjer osi uvijek se gleda kao gibanje <b>alata prema obratku</b>. Kad se stol giba prema tebi, alat u odnosu na obradak ide prema natrag — to je smjer +Y.</p>` },
  { id: 'portal', naziv: 'Portal i os X', dijelovi: ['portal'], anim: 'X', pogled: 'stroj', tekst: `
<p>Portal je nepomičan most preko stola: dvije bočne ploče i poprečna greda. Na gredi su dvije okrugle vodilice i navojno vreteno osi X, a po njima klizi nosač osi Z.</p>
<p>Gibanje nosača lijevo–desno je <b>os X</b>; +X je udesno. Motor osi X je na desnoj bočnoj ploči.</p>
<p>Hod prema oznaci 3020 je 300 mm u X i 200 mm u Y. Za ovaj stroj to je pretpostavka — provjeri je u Mach3 (Config → Homing/Limits) i mjerenjem od graničnika do graničnika.</p>` },
  { id: 'osZ', naziv: 'Os Z', dijelovi: ['osZ'], anim: 'Z', pogled: 'radni', tekst: `
<p>Os Z diže i spušta vreteno. Klizna ploča vozi se po dvije vertikalne vodilice; pogoni je motor na vrhu nosača preko kratkog navojnog vretena. <b>+Z je prema gore</b>, od obratka.</p>
<p>Hod osi Z je kratak, oko 55 mm (pretpostavka). Zato se vreteno u obujmici steže na visinu koja odgovara pripremku: alat mora prijeći preko pripremka i pribora, a ipak dosegnuti najveću dubinu programa.</p>
<p>U nultočki stroja os Z je na vrhu hoda. Nakon promjene visine vretena u obujmici nultočka obratka u Z mora se ponovno postaviti.</p>` },
  { id: 'vreteno', naziv: 'Vreteno i pretvarač', dijelovi: ['vreteno', 'pretvarac'], anim: 'S', pogled: 'vreteno', tekst: `
<p>Vreteno Ø65 mm razreda 800 W hlađeno je vodom: pumpa tjera vodu kroz plašt vretena dvjema cijevima i vraća je u spremnik. <b>Pumpu uključi prije vretena</b> — bez hlađenja vreteno se pregrije za nekoliko minuta.</p>
<p>Alat se steže steznom čahurom ER11 i maticom; u simulatoru je to ravno glodalo Ø3 mm s dvije oštrice.</p>
<p>Brzinu vrtnje mijenja <b>pretvarač frekvencije 0,75 kW</b>: što veća frekvencija napona, to brže vreteno. Pretvarač ima dva načina:</p>
<ul><li><b>PC</b> — Mach3 zadaje smjer i brzinu (M3, M5, S…) preko izlaza kontrolera; Spindle CW i Spindle override u Mach3 rade.</li>
<li><b>Ručno</b> — brzina se namješta potenciometrom, a vreteno pokreće tipkom RUN na pretvaraču. Mach3 tada ne zna vrti li se vreteno; S i M3 u programu nemaju učinka.</li></ul>
<p class="pazi-m">Vlasnik navodi da vreteno ide do 40 000 o/min. Za vreteno od 800 W uobičajeno je 24 000 o/min (400 Hz), pa simulator ograničava S na 24 000. Najveću frekvenciju provjeri u parametrima pretvarača i na pločici vretena prije nego što zadaš više.</p>` },
  { id: 'motori', naziv: 'Koračni motori i upravljački modul', dijelovi: ['motori', 'upravljanje'], anim: 'sve', pogled: 'stroj', tekst: `
<p>Svaku os pogoni <b>koračni motor NEMA 23</b> (prirubnica 57 mm). Motor se zakreće u koracima — obično 200 koraka po okretaju (1,8°) — a upravljački modul (driver) svaki korak dijeli na mikrokorake.</p>
<p>Mach3 na računalu čita G-kod i računa putanju. Kontroler spojen na <b>USB</b> za svaku os šalje modulu dva signala:</p>
<ul><li><b>STEP (korak)</b> — svaki impuls pomakne motor za jedan mikrokorak; broj impulsa daje put, a učestalost impulsa brzinu;</li>
<li><b>DIR (smjer)</b> — razina signala određuje smjer vrtnje.</li></ul>
<p class="formula">primjer: vreteno koraka 5 mm, 200 koraka × 8 mikrokoraka = 1600 impulsa po okretaju → 320 impulsa/mm (Steps per u Config → Motor Tuning); 1000 mm/min → ≈ 5,3 kHz</p>
<p>Koračni pogon radi <b>bez povratne veze</b>: ako motor zbog sudara ili prevelikog posmaka preskoči korake, upravljanje to ne zna i položaj je pogrešan. Tada ponovno referenciraj i postavi nultočku obratka.</p>
<p>U upravljačkoj kutiji su napajanje, moduli motora i kontroler; sprijeda glavna sklopka i gljiva za nužno zaustavljanje.</p>` },
  { id: 'vretena', naziv: 'Navojna vretena', dijelovi: ['vretena'], anim: 'X', pogled: 'radni', tekst: `
<p>Navojno vreteno s maticom pretvara okretanje motora u pravocrtno gibanje osi. Na malim strojevima to su <b>trapezna</b> vretena (npr. Tr12 × 3) ili <b>kuglična</b> vretena (npr. 1605: Ø16 mm, korak 5 mm).</p>
<ul><li>Trapezno vreteno: jeftino, veće trenje i zračnost (mrtvi hod) u matici.</li>
<li>Kuglično vreteno: kuglice se kotrljaju između vretena i matice — manje trenje, veća točnost, viša cijena.</li></ul>
<p>Koja su vretena na ovom stroju, treba provjeriti (u modelu: kuglična 1605). Zračnost se pokaže kad os promijeni smjer; Mach3 je može djelomično nadoknaditi (Config → Backlash), ali je pouzdanije rubove dodirivati uvijek iz istog smjera.</p>` },
  { id: 'skripac', naziv: 'Škripac', dijelovi: ['skripac'], anim: null, pogled: 'skripac', postav: 'skripac', tekst: `
<p>Mali bušilični škripac steže pripremke do oko <b>60 mm</b> širine (otvor čeljusti, po osi Y) i do <b>100 mm</b> duljine (širina čeljusti, po osi X).</p>
<p>Škripac se pričvrsti vijcima i T-maticama u utore stola. Nepomična čeljust mora biti paralelna s osi X — provjeri komparatorom ili barem dodirom alata na oba kraja čeljusti.</p>
<p>Pripremak leži na paralelnim podlošcima i viri iznad čeljusti nekoliko milimetara: dovoljno za dodir ruba alatom i za obradu, a da glodalo ne zahvati čeljust.</p>
<p>Pripremak nema dodatka za obradu — ima isti vanjski gabarit kao gotov dio.</p>` },
  { id: 'pandze', naziv: 'Stezne pandže', dijelovi: ['pandze'], anim: null, pogled: 'pandze', postav: 'pandze', tekst: `
<p>Pripremci veći od škripca (od naših predmeta P01 … P21 gotovo svi) stežu se <b>steznim pandžama</b>: stepenasti blok, stezna letva i vijak s maticom u T-utoru.</p>
<ul><li>Letva neka bude vodoravna ili blago nagnuta prema pripremku; vijak što bliže pripremku.</li>
<li>Ispod pripremka je <b>podložna MDF ploča</b>: kad se kontura glodala kroz cijelu debljinu (npr. Z−20,5 kod pripremka od 20 mm), alat uđe pola milimetra u podlogu, a ne u stol.</li></ul>
<p class="pazi-m">Prije pokretanja programa provjeri da putanja alata ne prelazi preko pandži. Simulator sudar s pandžama ne provjerava.</p>` },
  { id: 'osA', naziv: '4. os A', dijelovi: ['osA'], anim: 'A', pogled: 'osA', tekst: `
<p>Četvrta os je okretna <b>os A</b>: stezna glava s tri čeljusti na koračnom motoru NEMA 23, pogonjena remenom. Os vrtnje paralelna je s osi X — zato se zove A.</p>
<p><b>Smjer +A</b> daje pravilo desne ruke: palac u smjeru +X, savijeni prsti pokazuju +A. Gledano s desne strane prema steznoj glavi, +A je suprotno od kazaljke na satu, a gornja izvodnica valjka ide prema tebi (prema −Y).</p>
<p>Os A programira se u <b>stupnjevima</b>: A90 je četvrtina okreta, A360 cijeli okret. Dva su načina rada:</p>
<ul><li><b>indeksiranje</b> — os A zakrene se dok je alat iznad obratka, a zatim se glođe samo s X, Y i Z (npr. četiri plohe pod 90°);</li>
<li><b>istodobno gibanje</b> — A se vrti dok alat stoji (obodni utor) ili dok se giba X (zavojni utor).</li></ul>
<p class="formula">Mach3: F vrijedi za zajednički put svih osi, a milimetri i stupnjevi zbrajaju se kao iste jedinice. G1 X55 A720 F1200 traje √(55² + 720²) / 1200 ≈ 0,6 min.</p>
<p class="pazi-m">To je pojednostavljenje: stvarna brzina na obodu ovisi o promjeru (na Ø40 je 1° ≈ 0,35 mm). Posmak za os A zato biraj prema promjeru obratka.</p>` },
  { id: 'konjic', naziv: 'Konjić', dijelovi: ['konjic'], anim: 'konjic', pogled: 'osA', tekst: `
<p>Konjić podupire slobodni kraj obratka šiljkom u središnjem provrtu, da se dugi obradak ne savija i ne izvlači iz čeljusti.</p>
<p>Os šiljka mora se poklapati s osi A, inače valjak „baca”. Konjić se pomiče po T-utorima i steže vijcima, a šiljak se primiče ručnim kotačem i zakoči ručicom.</p>
<p>Kad se obrađuju ploče, konjić se odmakne na desni kraj stola, izvan hoda alata.</p>` },
  { id: 'nultocke', naziv: 'Nultočka stroja i obratka', dijelovi: ['nultocke'], anim: null, pogled: 'radni', tekst: `
<p><b style="color:#e0533d">Nultočka stroja</b> (crveno) je položaj koji Mach3 nađe referenciranjem (Ref All Home): os Z gore, X lijevo, Y sprijeda. Koordinate stroja (Machine Coords) su tada 0, 0, 0.</p>
<p>Ako stroj nema referentnih sklopki, referenciranje se preskače, a koordinate stroja vrijede od položaja u kojem je Mach3 pokrenut.</p>
<p><b style="color:#17999f">Nultočka obratka</b> (tirkizno) je točka od koje se mjeri program. Kod naših predmeta to je lijevi prednji gornji kut pripremka (G54); kod četvrte osi X0 je na čelu čeljusti, a Y0 i Z0 na osi valjka.</p>
<p>DRO u Mach3 pokazuje koordinate obratka. Razlika koordinata stroja i obratka je pomak G54, a nastaje kad pritisneš Zero X, Zero Y, Zero Z ili Zero 4 ili kad upišeš vrijednost u DRO.</p>` },
  { id: 'razlike', naziv: 'Mach3 i SINUMERIK 840D', dijelovi: ['upravljanje'], anim: null, pogled: 'upravljanje', tekst: `
<p>Programi su slični, ali ima razlika koje treba znati:</p>
<ul><li><b>Komentari</b> su u okruglim zagradama: <code>(OBODNI UTOR)</code>.</li>
<li><b>Nema ciklusa</b> poput POCKET4: CAM (FreeCAD, postprocesor Mach3) svaku putanju ispisuje kao niz G0, G1, G2 i G3.</li>
<li><b>Nema korekcije duljine alata</b> u ovom postavu: Z nula postavlja se na vrhu alata (dodir gornje plohe → Zero Z). Nakon zamjene alata Z nula se postavlja ponovno. Na 840D duljina je u korekcijama alata, a G54 ostaje isti.</li>
<li><b>Pomak G54</b> nastaje iz DRO-a (Zero X… ili upis vrijednosti), a ne u prozoru za dodirivanje.</li>
<li><b>M6 T1</b> Mach3 samo prihvaća — izmjenjivača nema, alat se mijenja ručno uz zaustavljeno vreteno.</li>
<li><b>Reset</b> u Mach3 uključuje i isključuje nužno zaustavljanje; treperi crveno dok je stroj blokiran.</li>
<li>Upravljanje je program na računalu, a pogoni su koračni bez mjernog sustava; 840D ima servopogone s povratnom vezom.</li></ul>` },
  { id: 'sigurnost', naziv: 'Sigurnost', dijelovi: ['vreteno'], anim: 'S', pogled: 'radni', tekst: `
<ul><li><b>Zaštitne naočale</b> uvijek kad se vreteno vrti — glodalo Ø3 lako pukne, a komadići lete daleko.</li>
<li><b>Zvuk</b>: vreteno na 24 000 o/min i glodanje su glasni — pri dužem radu nosi zaštitu sluha.</li>
<li><b>MDF</b> stvara finu prašinu — usisavač i maska. <b>Aluminij</b> daje oštru, vruću strugotinu — ne čisti je rukom i ne otpuhuj je prema sebi.</li>
<li><b>Ruke dalje od vretena</b> dok se vreteno vrti ili program radi. Pripremak namještaj i strugotinu čisti samo kad vreteno stoji.</li>
<li>Stroj nema zaštitnu kabinu: ne ostavljaj ga bez nadzora, a gljiva za nužno zaustavljanje neka bude na dohvat ruke.</li>
<li>Prije uključivanja vretena provjeri radi li pumpa hlađenja.</li></ul>` }
];

/* ------------------------------------------------------------------ scena */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 5, 9000);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(700, 1300, 1000); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-800, 600, -500); scene.add(sun2);
postaviOkolinu(THREE, renderer, scene);
const S = napraviStroj3020(THREE, scene);

/* pribor za prikaz: valjak u 4. osi, škripac s pripremkom, pandže s pločom */
const mBlank = new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.45, metalness: 0.35 });
const mMdf = new THREE.MeshStandardMaterial({ color: 0xc49a66, roughness: 0.8 });
let valjak = null, blok = null;
function postav(vrsta) {
  if (blok) { S.obrGrupa.remove(blok); blok.geometry.dispose(); blok = null; }
  if (vrsta === 'pandze') {
    const p = S.pandzeZa(150, 100, 20, 0, 0);
    blok = new THREE.Mesh(new THREE.BoxGeometry(150, 20, 100), mMdf); blok.position.set(0, p.bot + 10, 0);
    S.konjicNa(165); valjak.visible = false;
    S.nulaW.position.set(p.x0, p.top, -p.y0);
  } else {
    const p = S.skripacZa(80, 50, 20, 75, 0);
    blok = new THREE.Mesh(new THREE.BoxGeometry(80, 20, 50), mBlank); blok.position.set(75, p.bot + 10, 0);
    S.konjicNa(GEO.A.lice + 85); valjak.visible = true;
    S.nulaW.position.set(p.x0, p.top, -p.y0);
  }
  blok.userData.dio = vrsta === 'pandze' ? 'pandze' : 'skripac';
  S.obrGrupa.add(blok);
}
valjak = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 100, 48), new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.7 }));
valjak.rotation.z = Math.PI / 2; valjak.position.set(35, 0, 0); valjak.userData.dio = 'osA'; S.obrA.add(valjak);
postav('skripac');
S.postaviZtop(80);
S.zaslonTekst(true);

function pogled(p) {
  const P = {
    stroj: [[-420, 640, 1350], [80, 90, 120]], radni: [[300, 300, 640], [0, 70, 120]], osA: [[-60, 380, 640], [-105, 62, 130]],
    upravljanje: [[1150, 420, 1050], [560, -20, 200]], vreteno: [[330, 330, 560], [80, 120, 100]], skripac: [[300, 260, 480], [75, 30, 120]], pandze: [[300, 300, 520], [0, 20, 120]]
  }[p] || [[900, 700, 1250], [60, 80, 100]];
  camera.position.set(...P[0]); controls.target.set(...P[1]); controls.update();
}
pogled('stroj');

/* ------------------------------------------------------------------ isticanje */
let odabran = null, istaknuto = [];
function ocistiOznake() { istaknuto.forEach((m) => { m.material.dispose(); m.material = m.userData.m0; m.userData.m0 = undefined; }); istaknuto = []; }

function crtajIzbornik() {
  $('sklopovi').innerHTML = SKLOPOVI.map((s, i) => '<li><button type="button" data-sklop="' + s.id + '" aria-pressed="' + (odabran && odabran.id === s.id) + '"><span class="br">' + (i + 1) + '</span>' + s.naziv + '</button></li>').join('');
}
let animT = 0;
function odaberi(id, sPogledom = true) {
  const s = SKLOPOVI.find((q) => q.id === id); if (!s) return;
  odabran = s; animT = 0;
  ocistiOznake();
  if (s.postav === 'pandze') postav('pandze'); else if (!odabran.postav || odabran.postav === 'skripac') postav('skripac');
  istakniDijelove(s.dijelovi);
  S.nulaM.visible = S.nulaW.visible = id === 'nultocke';
  $('k-naslov').textContent = s.naziv; $('k-tekst').innerHTML = s.tekst; $('scena-naslov').textContent = 'Stroj · ' + s.naziv;
  if (sPogledom) pogled(s.pogled);
  crtajIzbornik();
}
function istakniDijelove(ids) {
  ids.forEach((id) => {
    const d = S.dijelovi.get(id); if (!d) return;
    d.objekti.forEach((o) => o.traverse((m) => {
      if (!m.isMesh || m.userData.m0 || !m.material || !m.material.emissive) return;
      m.userData.m0 = m.material; m.material = m.material.clone(); m.material.emissive = new THREE.Color(0x2ecad4); m.material.emissiveIntensity = 0.35; istaknuto.push(m);
    }));
  });
}

$('sklopovi').addEventListener('click', (e) => { const b = e.target.closest('[data-sklop]'); if (b) odaberi(b.dataset.sklop); });
$('k-prethodni').addEventListener('click', () => { const i = odabran ? SKLOPOVI.indexOf(odabran) : 0; odaberi(SKLOPOVI[(i - 1 + SKLOPOVI.length) % SKLOPOVI.length].id); });
$('k-sljedeci').addEventListener('click', () => { const i = odabran ? SKLOPOVI.indexOf(odabran) : -1; odaberi(SKLOPOVI[(i + 1) % SKLOPOVI.length].id); });
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
let animira = true;
$('animacija').addEventListener('click', () => { animira = !animira; $('animacija').setAttribute('aria-pressed', String(animira)); $('animacija').textContent = animira ? 'Animacija uključena' : 'Animacija isključena'; });

/* ------------------------------------------------------------------ lebdeći naziv i klik */
const NAZIV = { podloga: 'Radni stol (podloga)' };
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
function pogodak(e) {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const h = ray.intersectObjects(scene.children, true).find((q) => q.object.visible && q.object.userData.dio && q.object.userData.dio !== 'podloga');
  return h ? { id: h.object.userData.dio, x: e.clientX - r.left, y: e.clientY - r.top } : null;
}
const KARTA_ZA = { pretvarac: 'vreteno', upravljanje: 'motori' };
function nazivDijela(id) { const d = S.dijelovi.get(id); return d ? d.naziv : NAZIV[id] || id; }
let zadnjiHover = 0;
renderer.domElement.addEventListener('pointermove', (e) => {
  const t = performance.now(); if (t - zadnjiHover < 40) return; zadnjiHover = t;
  const p = pogodak(e); const l = $('lebdi');
  if (!p) { l.hidden = true; renderer.domElement.style.cursor = 'grab'; return; }
  l.hidden = false; l.textContent = nazivDijela(p.id); l.style.left = p.x + 'px'; l.style.top = p.y + 'px'; renderer.domElement.style.cursor = 'pointer';
});
renderer.domElement.addEventListener('pointerleave', () => { $('lebdi').hidden = true; });
let dolje = null;
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('click', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje[0], e.clientY - dolje[1]) > 5) return;
  const p = pogodak(e); if (!p) return;
  const id = KARTA_ZA[p.id] || p.id;
  if (SKLOPOVI.find((s) => s.id === id)) odaberi(id, false);
});

/* ------------------------------------------------------------------ animacija osi */
const osi = { X: 225, Y: 100, Z: -10, A: 0 };
let kutAlata = 0, lcdZad = '';
function animiraj(dt) {
  const a = odabran && animira ? odabran.anim : null;
  animT += dt;
  const cilj = { X: 225, Y: 100, Z: -10, A: osi.A };
  if (a === 'X' || a === 'sve') cilj.X = 150 + 140 * Math.sin(animT * 0.7);
  if (a === 'Y' || a === 'sve') cilj.Y = 100 + 95 * Math.sin(animT * 0.6 + (a === 'sve' ? 1 : 0));
  if (a === 'Z' || a === 'sve') cilj.Z = -27 + 26 * Math.sin(animT * 0.9);
  if (a === 'A' || a === 'sve') cilj.A = osi.A + dt * 60;
  for (const o of ['X', 'Y', 'Z']) osi[o] += (cilj[o] - osi[o]) * Math.min(1, dt * 3);
  osi.A = cilj.A;
  S.postaviOsi(osi.X, osi.Y, osi.Z, osi.A);
  const vrti = a === 'S';
  if (vrti) kutAlata += dt * 40; S.okreniAlat(kutAlata);
  const lcd = vrti ? '400.0' : '0.0'; if (lcd !== lcdZad) { lcdZad = lcd; S.lcdTekst(lcd, true); }
  if (a === 'konjic') S.konjicNa(GEO.A.lice + 85 + 30 * (0.5 + 0.5 * Math.sin(animT * 1.2)));
  $('osi-prikaz').textContent = 'X ' + osi.X.toFixed(1) + '  Y ' + osi.Y.toFixed(1) + '  Z ' + osi.Z.toFixed(1) + '  A ' + (((osi.A % 360) + 360) % 360).toFixed(0) + '°';
}

function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now();
let pauza = false;
function petlja(t) {
  const dt = Math.min(0.1, (t - zadnje) / 1000); zadnje = t;
  if (pauza) { requestAnimationFrame(petlja); return; }
  animiraj(dt); controls.update(); renderer.render(scene, camera); requestAnimationFrame(petlja);
}
crtajIzbornik(); velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__3020u = { S, odaberi, SKLOPOVI, pogled, camera, controls, pauza(v) { pauza = v; if (v) { controls.update(); renderer.render(scene, camera); } } };
requestAnimationFrame(petlja);
