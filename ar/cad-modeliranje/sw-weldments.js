// FORTRONIQ · CAD modeliranje · SolidWorks Weldments: zavarena konstrukcija iz priručnika (slika 8.2), stablo značajki korak po korak
// Geometrija svakog koraka je stvarni model iz SolidWorksa 2017 (rollback iza svake značajke → STL),
// spremljen kao sw-weldments/koraci.bin: za svaki korak trokuti (Int16, 0,1 mm), oznaka trokuta koje značajka mijenja
// i oznaka trokuta prethodnog koraka koji nestaju. Zadnji zapis je potisnuti Sb beam 80 X 6(1).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = s => document.querySelector(s);
// mi = indeks modela u koraci.bin (−1 = samo skica); sk = skica koju korak crta; sb = prikaži potisnuti Sb beam
const KORACI = [
  { z: 'Weldment', n: 'Značajka Weldment: dio postaje zavarena konstrukcija', mi: -1, slika: 'traka_weldments', pmSlika: 'pm06_angle1_dolje', pm: [['Naredba', 'kartica Weldments → Weldment (ili Insert → Weldments → Weldment)'], ['U stablu', 'Weldment ispod Origin i mapa Cut list'], ['Konfiguracije', 'Default&lt;As Machined&gt; i Default&lt;As Welded&gt;'], ['Napomena', 'ako se prvo pozove Structural Member, Weldment se doda sam']], o: 'Izrada zavarene konstrukcije počinje značajkom Weldment. Ona dio pretvara u višetjelesni dio: svaki konstrukcijski član postaje zasebno tijelo, a SolidWorks ih sam slaže u mapu Cut list (lista rezanja). Na kartici Weldments su svi alati ovog modula.' },
  { z: 'Sketch1', n: 'Skica prednjeg okvira 600 × 150 mm', mi: -1, sk: 's1', slika: 'full02_sketch1', pm: [['Ravnina', 'Front Plane'], ['Entiteti', 'Line1 … Line4: pravokutnik'], ['Kote', '600 mm (širina), 150 mm (visina)']], o: 'Putanje po kojima se provlači profil crtaju se skicama. Prvi je prednji okvir: pravokutnik 600 × 150 mm. Linije skice su osi budućih profila, a ne njihovi rubovi; gdje profil sjeda u odnosu na liniju određuje se kasnije.' },
  { z: '3DSketch1', n: '3D skica: stražnji okvir, uzdužni bridovi i stupovi', mi: -1, sk: 's3d', slika: 'full03_3dsketch1', pm: [['Naredba', 'kartica Weldments → 3D Sketch'], ['Line5 … Line8', 'stražnji okvir 600 × 150 mm'], ['Line1 … Line4', 'četiri uzdužna brida, 1000 mm'], ['Line9, 11, 18, 24, 26, 27', 'šest stupova visine 150 mm'], ['Stupovi', 'na trećinama dužih stranica i na sredini kraćih']], o: 'Zavarene konstrukcije uglavnom su ravni elementi raspoređeni u prostoru, pa je 3D skica najbrži način da se nacrtaju sve putanje u jednoj skici. Ova 3D skica dodaje stražnji okvir, četiri uzdužna brida duljine 1000 mm i šest okomitih stupova.' },
  { z: 'Plane1', n: 'Ravnina gornje plohe okvira', mi: -1, sk: 'p1', slika: 'full04_plane1', pmSlika: 'pm04_plane1', pm: [['Naredba', 'Reference Geometry → Plane'], ['First Reference', 'Line3@Sketch1, Coincident'], ['Second Reference', 'Point11@3DSketch1, Coincident'], ['Stanje', 'Fully defined']], o: 'Za dijagonalu na gornjoj strani okvira treba ravna skica, a za nju ravnina. Plane1 prolazi gornjim bridom prednjeg okvira (Line3@Sketch1) i jednom točkom stražnjeg okvira, pa leži točno u gornjoj plohi.' },
  { z: 'Sketch2', n: 'Skica dijagonale na Plane1', mi: -1, sk: 's2', slika: 'full05_sketch2', pm: [['Ravnina', 'Plane1'], ['Entitet', 'Line1: dijagonala'], ['Kote', '200 mm od prednjeg brida (lijevo), 200 mm od stražnjeg brida (desno)'], ['Dužina osi', '848,53 mm (√(600² + 600²))']], o: 'Dijagonala ukrućuje gornji okvir. Krajevi su na uzdužnim bridovima, 200 mm od prednjeg i 200 mm od stražnjeg kraja. Ta linija postat će zaseban konstrukcijski član.' },
  { z: 'Angle iron 35 X 35 X 5(1)', n: 'Konstrukcijski član: kutnik 35 × 35 × 5 u sedam grupa', mi: 0, slika: 'full06_angle1_g7', pmSlika: 'pm06_angle1_g1', pm: [['Naredba', 'Weldments → Structural Member'], ['Standard / Type / Size', 'iso / angle iron / 35 x 35 x 5'], ['Group1', 'Line1 … Line4@Sketch1 (prednji okvir), Apply corner treatment ☑'], ['Group2', 'Line5 … Line8@3DSketch1 (stražnji okvir), Apply corner treatment ☑'], ['Group3 … Group6', 'uzdužni bridovi, kut zakreta 0°, 270°, 90°, 180°'], ['Group7', 'Line1@Sketch2 (dijagonala), 180°'], ['Merge miter trimmed bodies', '☐']], o: 'Značajka strukturalnog člana (Structural Member) provlači profil iz baze duž odabranih linija. Profil se ne crta: bira se standard, vrsta i veličina. Svaka linija daje zasebno tijelo. Kutnik nije simetričan, pa je za svaki uzdužni brid zakret zadan posebno, da krakovi gledaju prema unutra.' },
  { z: 'Trim/Extend2', n: 'Odreži/produži: uzdužni bridovi do okvira', mi: 1, slika: 'full07_trim2', pmSlika: 'pm07_trim2', pm: [['Naredba', 'Weldments → Trim/Extend'], ['Corner Type', 'End Trim'], ['Bodies to be Trimmed', `Angle iron 35 X 35 X 5(1)[5], [10]`], ['Trimming Boundary', 'Face / plane: Face&lt;1&gt;, Face&lt;2&gt;'], ['Allow extension', '☑']], o: 'Gdje se uzdužni bridovi sastaju s okvirima, profili se preklapaju. Trim/Extend reže (ili produžuje) odabrana tijela do granice. Oznake keep i discard u prikazu pokazuju koji dio tijela ostaje, a koji se odbacuje.' },
  { z: 'Trim/Extend3', n: 'Odreži/produži: jedan uzdužni brid', mi: 2, slika: 'full08_trim3', pmSlika: 'pm08_trim3', pm: [['Corner Type', 'End Trim'], ['Bodies to be Trimmed', 'Angle iron 35 X 35 X 5(1)[9]'], ['Trimming Boundary', 'Face / plane: Face&lt;1&gt;'], ['Allow extension', '☑']], o: 'Svako sjecište dijelova konstrukcije definira se zasebno. Ovdje se jedan uzdužni brid reže na plohu stražnjeg okvira.' },
  { z: 'Trim/Extend5', n: 'Odreži/produži: drugi uzdužni brid', mi: 3, slika: 'full09_trim5', pmSlika: 'pm09_trim5', pm: [['Corner Type', 'End Trim'], ['Bodies to be Trimmed', 'Angle iron 35 X 35 X 5(1)[11]'], ['Trimming Boundary', 'Face / plane: Face&lt;1&gt;'], ['Allow extension', '☑']], o: 'Isti postupak na sljedećem bridu. Granica je ploha (Face / plane), pa je rez okomit na tu plohu.' },
  { z: 'Sketch17', n: 'Skica dviju poprečnih nosača ispod okvira', mi: 3, sk: 's17', slika: 'full10_sketch17', pm: [['Entiteti', 'Line1, Line5: dvije crte'], ['Kote', '800 mm; 100 mm od prednjeg i stražnjeg kraja'], ['Prepust', '100 mm s obje strane okvira'], ['Položaj', 'u ravnini donje plohe okvira']], o: 'Za nosače ispod okvira (kao „saonice” na slici 8.1) nacrtane su dvije crte dužine 800 mm, 100 mm od prednjeg i stražnjeg kraja, sa 100 mm prepusta na obje strane.' },
  { z: 'Sb beam 80 X 6(1)', n: 'Varijanta: nosači iz I-profila Sb beam 80 × 6 (potisnuto)', mi: 3, sb: true, slika: 'full11b_sbbeam_ukljucen', pmSlika: 'pm11_sbbeam', pm: [['Standard / Type / Size', 'iso / sb beam / 80 x 6'], ['Group1', 'Line5@Sketch17, Line1@Sketch17, 0°'], ['Stanje u modelu', 'potisnuto (Suppress), u stablu sivo'], ['S njim', 'Cut list(25) umjesto 23, visina 223,3 mm umjesto 150 mm']], o: 'U modelu postoji i ova varijanta: dva I-nosača ispod okvira. Značajka je potisnuta (Suppress), pa ne ulazi u model ni u listu rezanja. Ovako se usporede dva rješenja bez brisanja: jedno se potisne, drugo ostane. Narančasto je prikazano kako bi izgledali da se uključe.' },
  { z: 'Trim/Extend7', n: 'Odreži/produži: kosi rez uz drugo tijelo', mi: 4, slika: 'full12_trim7', pmSlika: 'pm12_trim7', pm: [['Corner Type', 'End Miter'], ['Bodies to be Trimmed', 'Angle iron 35 X 35 X 5(1)[12]'], ['Trimming Boundary', 'Trim/Extend5 (tijelo)'], ['Allow extension', '☑']], o: 'End Miter reže oba kraja pod istim kutom, kao kod okvira slike. Granica ovdje nije ploha nego tijelo koje je nastalo prethodnim Trim/Extend5.' },
  { z: 'Trim/Extend8', n: 'Odreži/produži: dijagonala do uzdužnog brida', mi: 5, slika: 'full13_trim8', pmSlika: 'pm13_trim8', pm: [['Corner Type', 'End Trim'], ['Bodies to be Trimmed', 'Angle iron 35 X 35 X 5(1)[13] (dijagonala)'], ['Trimming Boundary', 'Bodies: Angle iron 35 X 35 X 5(1)[8]'], ['Allow extension', '☑'], ['Vrsta reza', 'ravni rez (prva od dvije ikone)']], o: 'Dijagonala se reže do tijela uzdužnog brida. Kad je granica tijelo (Bodies), nudi se ravni rez ili rez po obliku drugog profila. Os dijagonale je 848,53 mm, a izrezana dijagonala u listi rezanja ima 844,26 mm.' },
  { z: 'Sketch115', n: 'Skica dvaju poprečnih kutnika na vrhu', mi: 5, sk: 's115', slika: 'full14_sketch115', pm: [['Entiteti', 'Line3, Line4: dvije crte'], ['Dužina', '800 mm, prepust 100 mm s obje strane'], ['Položaj', 'na gornjoj plohi, 100 mm od prednjeg i stražnjeg kraja']], o: 'Umjesto I-nosača ispod okvira, u konačnom modelu su dva poprečna kutnika na vrhu. Skica ponavlja raspored iz Sketch17, samo na gornjoj strani.' },
  { z: 'Angle iron 35 X 35 X 5(7)', n: 'Konstrukcijski član: poprečni kutnici 800 mm', mi: 6, slika: 'full15_angle7', pmSlika: 'pm15_angle7', pm: [['Naredba', 'Weldments → Structural Member'], ['Standard / Type / Size', 'iso / angle iron / 35 x 35 x 5'], ['Group1', 'Line4@Sketch115, Line3@Sketch115'], ['Kut zakreta', '270°']], o: 'Drugi konstrukcijski član istog profila. Obje crte su paralelne, pa su u jednoj grupi. Zakret 270° okreće kutnik tako da jednim krakom leži na okviru.' },
  { z: 'Square tube 30 X 30 X 2.6(1)', n: 'Konstrukcijski član: stupovi iz kvadratne cijevi', mi: 7, slika: 'full16_squaretube', pmSlika: 'pm16_squaretube', pm: [['Standard / Type / Size', 'iso / square tube / 30 x 30 x 2.6'], ['Group1', 'Line24, Line26@3DSketch1'], ['Group2', 'Line18@3DSketch1'], ['Group3', 'Line27@3DSketch1'], ['Group4', 'Line11, Line9@3DSketch1'], ['Kut zakreta', '0°']], o: 'Stupovi su od drugog profila, kvadratne cijevi 30 × 30 × 2,6 mm, pa su zaseban konstrukcijski član. Šest okomitih crta iz 3D skice raspoređeno je u četiri grupe.' },
  { z: 'Trim/Extend9', n: 'Odreži/produži: stupovi između kutnika', mi: 8, slika: 'full17_trim9', pmSlika: 'pm17_trim9', pm: [['Corner Type', 'End Trim'], ['Bodies to be Trimmed', 'Square tube 30 X 30 X 2.6(1)[1] … [6]'], ['Trimming Boundary', 'Bodies: Angle iron 35 X 35 X 5(1)[2], [4], [6], [7], [8], Trim/Extend7[2], Trim/Extend2[1], Trim/Extend2[2]'], ['Allow extension', '☑'], ['Rezultat', 'stupovi 140 mm = 150 − 2 × 5 mm']], o: 'Stupovi su nacrtani od donjeg do gornjeg brida (150 mm) i ulazili bi u kutnike. Jedan Trim/Extend reže svih šest stupova do kutnika gore i dolje. U listi rezanja zato imaju 140 mm.' },
  { z: 'Cut list(23)', n: 'Lista rezanja: 23 tijela u 10 stavki', mi: 8, kraj: true, slika: 'cutlist_tablica', pmSlika: 'full18_cutlist', pm: [['Gdje', 'stablo → Cut list(23) → desni klik na stavku → Properties → Cut List Table'], ['Stavke', '9 × L 35 X 35 X 5, 1 × TUBE, SQUARE 30 X 30 X 2,60'], ['Svojstva stavke', 'LENGTH, ANGLE1, ANGLE2, DESCRIPTION, MATERIAL, QUANTITY, TOTAL LENGTH'], ['Provjera', 'po skicama 21 tijelo; u listi 23 (vidi tablicu ispod)']], o: 'Popis dijelova automatski se generira u mapi lista rezanja (Cut list). Jednaka tijela SolidWorks skupi u jednu stavku s količinom i dužinom. Iz ove tablice se naručuje i reže materijal, a ista tablica ide na nacrt.' }
];
const N = KORACI.length - 1;
const sglatko = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);

// ── 3D ─────────────────────────────────────────────────────────────────
const scena = $('#scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
scena.appendChild(renderer.domElement);
const svijet = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(35, 1, 5, 50000);
const kontrole = new OrbitControls(kamera, renderer.domElement);
kontrole.enableDamping = true;
svijet.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.2));
const sunce = new THREE.DirectionalLight(0xffffff, 1.4); sunce.position.set(900, 1600, 1200); svijet.add(sunce);
const sunce2 = new THREE.DirectionalLight(0xffffff, 0.5); sunce2.position.set(-1200, 500, -900); svijet.add(sunce2);

const CELIK = 0xA7AEBF, NOVO = 0x2ECAD4, NESTAJE = 0xD8322A, VARIJANTA = 0xF0A030, SKICA = 0x1F6FB2, STARA_SKICA = 0x8A93A6;
const CENTAR = new THREE.Vector3(300, 75, -500); // središte okvira (mm, koordinate SolidWorksa)
const korijen = new THREE.Group(); korijen.position.copy(CENTAR).multiplyScalar(-1); svijet.add(korijen);
const modeli = []; let sbbeam = null;

function geometrija(pos, maska, uzmi) {
  let n = 0; for (let i = 0; i < maska.length; i++) if (maska[i] === uzmi) n++;
  const a = new Float32Array(n * 9); let j = 0;
  for (let i = 0; i < maska.length; i++) if (maska[i] === uzmi) { for (let k = 0; k < 9; k++) a[j++] = pos[i * 9 + k] / 10; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.computeVertexNormals();
  return g;
}
function mreza(g, boja) {
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: boja, roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: 0x3A4150, transparent: true })));
  return m;
}
const bitovi = (u8, n) => { const r = new Uint8Array(n); for (let i = 0; i < n; i++) r[i] = (u8[i >> 3] >> (7 - (i & 7))) & 1; return r; };

async function ucitaj() {
  const buf = await (await fetch('sw-weldments/koraci.bin?v=01')).arrayBuffer();
  const dv = new DataView(buf); let o = 0; const sirovo = [];
  while (o < buf.byteLength) {
    const n = dv.getUint32(o, true); o += 4;
    const pos = new Int16Array(buf.slice(o, o + n * 18)); o += n * 18;
    const nb = Math.ceil(n / 8); const novo = bitovi(new Uint8Array(buf, o, nb), n); o += nb;
    const m = dv.getUint32(o, true); o += 4;
    const mb = Math.ceil(m / 8); const nest = bitovi(new Uint8Array(buf, o, mb), m); o += mb;
    sirovo.push({ pos, novo, nest });
  }
  const sb = sirovo.pop(); // potisnuti Sb beam
  sirovo.forEach((s, i) => {
    const grupa = new THREE.Group();
    const staro = mreza(geometrija(s.pos, s.novo, 0), CELIK);
    const novo = mreza(geometrija(s.pos, s.novo, 1), CELIK);
    grupa.add(staro, novo);
    let nestaje = null; const sl = sirovo[i + 1];
    if (sl && sl.nest.length === s.novo.length && sl.nest.some(v => v)) { nestaje = mreza(geometrija(s.pos, sl.nest, 1), NESTAJE); grupa.add(nestaje); }
    grupa.visible = false; korijen.add(grupa);
    modeli.push({ grupa, staro, novo, nestaje });
  });
  sbbeam = mreza(geometrija(sb.pos, sb.novo, 1), VARIJANTA); sbbeam.visible = false; korijen.add(sbbeam);
}

// skice (mm, koordinate SolidWorksa): osi profila
const SKICE = {
  s1: [[[0, 0, 0], [600, 0, 0]], [[600, 0, 0], [600, 150, 0]], [[600, 150, 0], [0, 150, 0]], [[0, 150, 0], [0, 0, 0]]],
  s3d: [
    [[0, 0, -1000], [600, 0, -1000]], [[600, 0, -1000], [600, 150, -1000]], [[600, 150, -1000], [0, 150, -1000]], [[0, 150, -1000], [0, 0, -1000]],
    [[0, 0, 0], [0, 0, -1000]], [[600, 0, 0], [600, 0, -1000]], [[600, 150, 0], [600, 150, -1000]], [[0, 150, 0], [0, 150, -1000]],
    ...[-1000 / 3, -2000 / 3].flatMap(z => [[[0, 0, z], [0, 150, z]], [[600, 0, z], [600, 150, z]]]),
    [[300, 0, 0], [300, 150, 0]], [[300, 0, -1000], [300, 150, -1000]]],
  s2: [[[0, 150, -200], [600, 150, -800]]],
  s17: [[[-100, 0, -100], [700, 0, -100]], [[-100, 0, -900], [700, 0, -900]]],
  s115: [[[-100, 150, -100], [700, 150, -100]], [[-100, 150, -900], [700, 150, -900]]]
};
const skice = {};
for (const [k, crte] of Object.entries(SKICE)) {
  const t = []; crte.forEach(([a, b]) => t.push(new THREE.Vector3(...a), new THREE.Vector3(...b)));
  const ls = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(t), new THREE.LineBasicMaterial({ color: SKICA, transparent: true }));
  ls.userData.n = t.length; ls.visible = false; korijen.add(ls); skice[k] = ls;
}
// Plane1: gornja ploha okvira
const ravnina = new THREE.Mesh(new THREE.PlaneGeometry(720, 1120), new THREE.MeshBasicMaterial({ color: 0x7FD6F0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
ravnina.rotation.x = -Math.PI / 2; ravnina.position.set(300, 150.5, -500); ravnina.visible = false; korijen.add(ravnina);
const REDSKICA = ['s1', 's3d', 's2', 's17', 's115'];
const kadSkica = { s1: 1, s3d: 2, s2: 4, s17: 9, s115: 13 };

function prikazi(mi, op, istakni) {
  const M = modeli[mi]; if (!M) return;
  M.grupa.visible = op > 0.001; M.staro.visible = M.novo.visible = true;
  M.staro.material.opacity = op; M.staro.children[0].material.opacity = op;
  M.novo.material.color.setHex(istakni ? NOVO : CELIK); M.novo.material.opacity = op; M.novo.children[0].material.opacity = op;
  [M.staro, M.novo].forEach(m => { m.material.transparent = op < 0.999; m.material.depthWrite = op > 0.5; });
  if (M.nestaje) M.nestaje.visible = false;
}

let korakS = 0, svira = false;
function postaviKorak(s) {
  korakS = s;
  const i = Math.min(N, Math.max(0, Math.ceil(s - 1e-6)));
  const kk = KORACI[i];
  const f = sglatko(s - (i - 1));
  if (modeli.length) {
    modeli.forEach(M => { M.grupa.visible = false; });
    const pret = i > 0 ? KORACI[i - 1].mi : -1;
    if (kk.mi >= 0 && kk.mi !== pret) {
      if (pret >= 0) { const P = modeli[pret]; if (P.nestaje && f < 1) { P.grupa.visible = true; P.staro.visible = P.novo.visible = false; P.nestaje.visible = true; P.nestaje.material.opacity = 1 - f; } }
      const C = modeli[kk.mi];
      prikazi(kk.mi, 1, true);
      if (pret < 0) { prikazi(kk.mi, Math.max(0.02, f), true); }
      else { C.novo.material.opacity = Math.max(0.15, f); C.novo.material.transparent = f < 1; C.novo.children[0].material.opacity = f; }
    } else if (kk.mi >= 0) prikazi(kk.mi, 1, false);
    sbbeam.visible = !!kk.sb; if (kk.sb) { sbbeam.material.opacity = 0.75 * f; sbbeam.children[0].material.opacity = f; }
  }
  // skice: trenutna se crta (plavo), ranije ostaju sive dok nema tijela
  REDSKICA.forEach(k => {
    const ls = skice[k], od = kadSkica[k];
    if (i < od) { ls.visible = false; return; }
    ls.visible = true;
    if (i === od) { ls.material.color.setHex(SKICA); ls.material.opacity = 1; ls.geometry.setDrawRange(0, Math.max(2, Math.floor(ls.userData.n * Math.min(1, f) / 2) * 2)); }
    else { ls.geometry.setDrawRange(0, ls.userData.n); ls.material.color.setHex(STARA_SKICA); ls.material.opacity = kk.mi >= 0 ? 0.55 : 0.9; }
  });
  ravnina.visible = i >= 3 && i <= 4; ravnina.material.opacity = i === 3 ? 0.3 * f : 0.12;
  $('#korak-br').textContent = `${i} / ${N}`;
  $('#korak-z').textContent = kk.z;
  $('#korak-naslov').textContent = kk.n;
  $('#korak-opis').textContent = kk.o;
  $('#klizac').value = s;
  const sl = $('#sw-slika');
  const src = `sw-weldments/${kk.slika}.jpg`;
  if (!sl.getAttribute('src') || !sl.getAttribute('src').endsWith(src)) { sl.src = src; sl.alt = `SolidWorks 2017: ${kk.z} — ${kk.n}`; }
  $('#sw-pm').innerHTML = kk.pm.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('');
  const pmLink = $('#sw-pm-slika');
  if (kk.pmSlika) { pmLink.hidden = false; pmLink.href = `sw-weldments/${kk.pmSlika}.jpg`; } else pmLink.hidden = true;
  document.querySelectorAll('#stablo-sw li').forEach((li, j) => { li.classList.toggle('aktivan', j === i); li.querySelector('button').setAttribute('aria-pressed', String(j === i)); });
}
const R = 1100;
function pogled(v) {
  kontrole.target.set(0, 0, 0);
  const uski = scena.clientWidth < 520 ? 1.45 : 1;
  if (v === 'gore') kamera.position.set(0.01, R * 1.9 * uski, 0.01);
  else if (v === 'sprijeda') kamera.position.set(0, R * 0.25 * uski, R * 1.7 * uski);
  else kamera.position.set(R * 1.0 * uski, R * 0.95 * uski, R * 1.25 * uski);
  kamera.updateProjectionMatrix();
}
function velicina() { const w = scena.clientWidth, h = scena.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scena);
let zadnje = 0;
function petlja(t) {
  requestAnimationFrame(petlja);
  const dt = Math.min(0.05, (t - zadnje) / 1000); zadnje = t;
  if (svira) {
    let s = korakS + dt * 0.45 * Number($('#brzina').value || 1);
    if (s >= N) { s = N; svira = false; $('#sviraj').setAttribute('aria-pressed', 'false'); $('#sviraj').textContent = 'Pokreni'; }
    postaviKorak(s);
  }
  kontrole.update(); renderer.render(svijet, kamera);
}

// ── upravljanje ────────────────────────────────────────────────────────
$('#klizac').max = N;
$('#stablo-sw').innerHTML = KORACI.map((k, i) => `<li><button type="button" data-k="${i}" aria-pressed="false"><b>${k.z}</b><span>${k.n}</span></button></li>`).join('');
$('#stablo-sw').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { svira = false; postaviKorak(Number(b.dataset.k)); } });
$('#klizac').addEventListener('input', e => { svira = false; postaviKorak(Number(e.target.value)); });
$('#sviraj').addEventListener('click', e => {
  svira = !svira; if (svira && korakS >= N) postaviKorak(0);
  e.target.textContent = svira ? 'Pauza' : 'Pokreni'; e.target.setAttribute('aria-pressed', String(svira));
});
$('#natrag').addEventListener('click', () => { svira = false; postaviKorak(Math.max(0, Math.ceil(korakS - 1e-6) - 1)); });
$('#naprijed').addEventListener('click', () => { svira = false; postaviKorak(Math.min(N, Math.floor(korakS + 1e-6) + 1)); });
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => pogled(b.dataset.pogled)));
pogled('kosi'); postaviKorak(0);
requestAnimationFrame(petlja);
ucitaj().then(() => { postaviKorak(korakS); $('#ucitavanje')?.remove(); }).catch(err => { const u = $('#ucitavanje'); if (u) u.textContent = 'Model se nije učitao: ' + err.message; });
window.ftqSwWeldments = { KORACI, postaviKorak, spremno: () => modeli.length > 0 };
