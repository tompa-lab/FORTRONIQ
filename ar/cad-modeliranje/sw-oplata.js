// FORTRONIQ · CAD modeliranje · SolidWorks Sheet Metal: limena oplata iz priručnika (stablo značajki korak po korak)
// Geometrija svakog koraka je stvarni model iz SolidWorksa 2017 (rollback iza svake značajke → STL),
// spremljen kao sw-oplata/koraci.bin: za svaki korak trokuti (Int16, 0,01 mm), oznaka novih trokuta
// i oznaka trokuta prethodnog koraka koji nestaju.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = s => document.querySelector(s);

// mi = indeks modela u koraci.bin (−1 = samo skica)
const KORACI = [
  { z: 'Sketch1', n: 'Skica otvorenog profila na ravnini Front Plane', mi: -1, slika: 'pm02_base-flange', pm: [['Ravnina', 'Front Plane'], ['Profil', 'otvoreni U-profil: 80 + 180 + 80 mm'], ['Stanje skice', 'Fully Defined']], o: 'Lim počinje skicom. Za osnovnu prirubnicu iz otvorenog profila dovoljna je crta: tri spojena pravca bez zatvaranja. SolidWorks im sam dodaje debljinu lima i zaobljenja na mjestima savijanja.' },
  { z: 'Base-Flange2', n: 'Osnovna prirubnica iz otvorenog profila', mi: 0, slika: 'pm02_base-flange', pm: [['Naredba', 'Sheet Metal → Base Flange/Tab'], ['Direction 1', 'Blind, 75.00mm'], ['Sheet Metal Parameters', 'T1 = 3.00mm, Bend radius 1.00mm'], ['Rezultat', 'U-profil 180 × 80 mm, dubine 75 mm']], o: 'Osnovna prirubnica (Base Flange/Tab) prva je značajka lima: iz nje započinju sva ostala savijanja. Otvoreni U-profil izvuče se 75 mm u dubinu. Uz nju se automatski dodaju Sheet-Metal (parametri lima) i Flat-Pattern (značajka za razvijanje plohe lima).' },
  { z: 'Sheet-Metal', n: 'Parametri lima: debljina, polumjer savijanja, K-faktor', mi: 0, slika: 'pm01_sheet-metal', uska: true, pm: [['Naredba', 'desni klik na Sheet-Metal → Edit Feature'], ['Bend Parameters', 'Bend radius 1.00mm, Thickness 3.00mm'], ['Bend Allowance', 'K-Factor 0.5'], ['Auto Relief', 'Rectangular, 0.5']], o: 'Debljina lima i polumjer savijanja zadaju se jednom, u značajci Sheet-Metal. Sve prirubnice i savijanja s kvačicom „Use default radius” ih nasljeđuju. K-faktor 0,5 znači da neutralna os leži na pola debljine lima.' },
  { z: 'Cut-Extrude1', n: 'Polukružni izrez u dnu', mi: 1, slika: 'pm03_cut-extrude1', pm: [['Naredba', 'Sheet Metal → Extruded Cut'], ['Skica', 'kružnica R 20 mm na rubu dna'], ['Direction 1', 'Blind, Link to thickness ☑'], ['Normal cut', '☑']], o: 'Izrez u limu radi se značajkom Extruded Cut iz modula Sheet Metal. „Link to thickness” veže dubinu reza na debljinu lima, a „Normal cut” reže okomito na plohu, pa izrez ostaje ispravan i u razvijenoj plohi.' },
  { z: 'Plane1', n: 'Pomoćna ravnina za profil kutne prirubnice', mi: 1, slika: 'pm05_miter-flange1', pm: [['Naredba', 'Reference Geometry → Plane'], ['Položaj', 'vodoravno, kroz bočne stijenke'], ['Ovisnost', 'Miter Flange1, a preko nje Unfold1 i Fold1']], o: 'Kutna prirubnica treba skicu profila na ravnini okomitoj na rubove na koje se postavlja. Tu ulogu ima Plane1. Kad se Plane1 potisne (Suppress), potisnu se i Miter Flange1, Unfold1 i Fold1, jer o njoj ovise.' },
  { z: 'Miter Flange1', n: 'Kutna prirubnica uz tri ruba', mi: 2, slika: 'pm05_miter-flange1', pm: [['Naredba', 'Sheet Metal → Miter Flange'], ['Rubovi', 'Edge<1>, Edge<2>, Edge<3>'], ['Polumjer', 'Use default radius ☑ (1.00mm)'], ['Flange position', 'Material Outside'], ['Gap distance', '0.25mm']], o: 'Kutna prirubnica (Miter Flange) prati profil iz skice duž više povezanih rubova odjednom i sama izreže kutove između njih, s razmakom 0,25 mm. Tako nastaje rub uz prednji otvor oplate.' },
  { z: 'Mirror1', n: 'Zrcaljenje cijelog tijela', mi: 3, slika: 'pm06_mirror1', pm: [['Naredba', 'Features → Mirror'], ['Mirror Face/Plane', 'Face<1> (stražnja ploha)'], ['Bodies to Mirror', 'Miter Flange1 (tijelo)'], ['Options', 'Merge solids ☑']], o: 'Polovica oplate zrcali se preko svoje stražnje plohe. Zrcali se tijelo (Bodies to Mirror), a ne pojedina značajka, pa se obje polovice spoje u jedno tijelo lima dubine 150 mm s kutnim prirubnicama sprijeda i straga.' },
  { z: 'Edge-Flange2', n: 'Rubna prirubnica na desnoj stijenci', mi: 4, slika: 'pm07_edge-flange2', pm: [['Naredba', 'Sheet Metal → Edge Flange'], ['Rub', 'Edge<1> (gornji rub desne stijenke)'], ['Edit Flange Profile', 'profil skraćen na dio ruba'], ['Angle', '90.00deg'], ['Flange Length', 'Blind, 30.00mm'], ['Flange Position', 'Material Outside, Offset Blind 15.00mm']], o: 'Rubna prirubnica (Edge Flange) savija novi dio lima s odabranog ruba. Gumbom „Edit Flange Profile” uređuje se profil skice prirubnice, pa ona ne mora ići preko cijelog ruba. Offset 15 mm podiže prirubnicu iznad ruba stijenke.' },
  { z: 'Mirror2', n: 'Zrcaljenje rubne prirubnice na lijevu stijenku', mi: 5, slika: 'pm08_mirror2_poruka', pmSlika: 'pm08_mirror2', pm: [['Naredba', 'Features → Mirror'], ['Mirror Face/Plane', 'Right Plane'], ['Features to Mirror', 'Edge-Flange2'], ['Poruka pri uređivanju', '„This Sheet Metal feature cannot be mirrored individually. Please try mirroring a body.”']], o: 'Ista prirubnica treba i na lijevoj stijenci, pa se zrcali preko ravnine Right Plane. U modelu je zrcaljena značajka Edge-Flange2. SolidWorks 2017 pri ponovnom uređivanju javlja da se značajka lima ne može zrcaliti zasebno i predlaže zrcaljenje tijela.' },
  { z: 'Tab1', n: 'Trak na lijevoj prirubnici', mi: 6, slika: 'pm10_sketched-bend1', pm: [['Naredba', 'Sheet Metal → Base Flange/Tab'], ['Skica', 'Sketch23: pravokutnik na plohi lijeve prirubnice'], ['Rezultat', 'prirubnica se produži za 20 mm']], o: 'Ista naredba Base Flange/Tab na postojećem limu dodaje trak (Tab): ravni komad lima iste debljine, nacrtan zatvorenom skicom na plohi lima. Trak se ne savija; savit će ga sljedeća značajka.' },
  { z: 'Sketched Bend1', n: 'Savijanje traka po crti savijanja', mi: 7, slika: 'pm10_sketched-bend1', pm: [['Naredba', 'Sheet Metal → Sketched Bend'], ['Skica', 'Sketch27: jedna crta savijanja na traku'], ['Fixed face', 'Face<1>'], ['Bend position', 'Material Outside'], ['Bend angle', '90.00deg, Use default radius ☑']], o: 'Značajka savijanja (Sketched Bend) savija lim po crti nacrtanoj na ravnoj plohi. Fixed face je strana koja ostaje na mjestu; savija se dio s druge strane crte.' },
  { z: 'Unfold1', n: 'Rasklopni zavoj: razvijanje jednog savijanja', mi: 8, slika: 'pm11_unfold1', pm: [['Naredba', 'Sheet Metal → Unfold'], ['Fixed face', 'Face<1> (dno)'], ['Bends to unfold', 'Miterbend4']], o: 'Unfold razvija samo odabrana savijanja (ovdje jedno savijanje kutne prirubnice), a ostatak modela ostaje savijen. Tako se može rezati preko mjesta savijanja dok je lim ravan.' },
  { z: 'Cut-Extrude2', n: 'Rez preko zavoja', mi: 9, slika: 'pm12_cut-extrude2', pmSlika: 'pm13_fold1', pm: [['Naredba', 'Sheet Metal → Extruded Cut'], ['Skica', 'Sketch28 na razvijenoj plohi'], ['Direction 1', 'Through All'], ['Normal cut', '☑']], o: 'Rez preko zavoja: skica se crta na razvijenom dijelu, preko mjesta gdje će biti zavoj. Kad se lim ponovno savije, rez prati zavoj, što se na savijenom limu ne bi moglo nacrtati.' },
  { z: 'Fold1', n: 'Preklopni zavoj: ponovno savijanje', mi: 10, slika: 'pm13_fold1', pm: [['Naredba', 'Sheet Metal → Fold'], ['Fixed face', 'Face<1> (dno)'], ['Bends to fold', 'Miterbend4']], o: 'Fold vraća razvijeno savijanje u savijeno stanje, zajedno s rezom. Unfold i Fold uvijek idu u paru, s istom fiksnom plohom i istim savijanjem.' },
  { z: 'Edge-Flange4', n: 'Kosa rubna prirubnica pod 75°', mi: 11, slika: 'pm14_edge-flange4', pm: [['Naredba', 'Sheet Metal → Edge Flange'], ['Rub', 'Edge<1> (prednji rub dna, desno od izreza)'], ['Angle', '75.00deg'], ['Flange Length', 'Blind, 85.00mm'], ['Flange Position', 'Material Outside'], ['Custom Relief Type', 'Rectangle, relief ratio 0.3']], o: 'Druga rubna prirubnica savija se pod 75°, s uređenim profilom koji joj daje kosi oblik. Rasterećenje (Relief) pravokutnog oblika omjera 0,3 izreže mali utor na kraju zavoja, da se lim pri savijanju ne trga.' },
  { z: 'Closed Corner1', n: 'Zatvoreni kut', mi: 12, slika: 'pm15_closed-corner1', pm: [['Naredba', 'Sheet Metal → Corners → Closed Corner'], ['Faces to Extend', 'Face<1>'], ['Faces to match', 'Face<2>'], ['Corner type', 'Butt (sučelno)'], ['Gap distance', '0.10mm'], ['Opcije', 'Coplanar faces ☑, Narrow corner ☑']], o: 'Zatvoreni kut (Closed Corner) produži jednu prirubnicu do druge, pa između njih ostaje samo razmak od 0,1 mm. Kut oplate je tako zatvoren, a u razvijenoj plohi ostaje ispravan razmak između dviju prirubnica.' },
  { z: 'Flat-Pattern', n: 'Razvijena ploha', mi: 13, slika: 'm17_flat-pattern', pmSlika: 'm16_gotovo', pm: [['Naredba', 'Sheet Metal → Flatten (ili desni klik Flat-Pattern → Unsuppress)'], ['Razvijena ploha', '439,7 × 271,1 mm, 16 crta savijanja'], ['Savijeni model', '247 × 106,1 × 185,8 mm']], o: 'Značajka za razvijanje plohe lima (Flat-Pattern) razvije cijeli model. Razvijena dužina uzima u obzir polumjer savijanja i K-faktor, zato se lim ne razvija ručno. Crvene isprekidane crte su crte savijanja.' },
  { z: 'Save as → DXF', n: 'Izvoz razvijene plohe u 2D geometriju (*.DXF)', mi: 13, crte: true, slika: 'pm18_dxf-dwg-output', pmSlika: 'pm19_dxf-cleanup', pm: [['Naredba', 'File → Save As → Dxf (*.dxf)'], ['DXF / DWG Output', 'Export: Sheet metal; Entities: Geometry ☑, Bend lines ☐'], ['Pregled', 'DXF/DWG Cleanup → Save'], ['Sadržaj DXF-a', '46 crta, 2 luka R 20, 1 polilinija, mjerilo 1 : 1']], o: 'Razvijena ploha sprema se kao 2D geometrija. Za rezanje DXF sadrži samo vanjski obris lima, bez linija savijanja. Prozor DXF/DWG Cleanup pokazuje što će biti u datoteci prije spremanja. Obrazovna inačica dodaje dva teksta koja se prije rezanja brišu.' }
];
const N = KORACI.length - 1;
const sglatko = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);

// ── 3D ─────────────────────────────────────────────────────────────────
const scena = $('#scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
scena.appendChild(renderer.domElement);
const svijet = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
const kontrole = new OrbitControls(kamera, renderer.domElement);
kontrole.enableDamping = true;
svijet.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.2));
const sunce = new THREE.DirectionalLight(0xffffff, 1.4); sunce.position.set(300, 600, 450); svijet.add(sunce);
const sunce2 = new THREE.DirectionalLight(0xffffff, 0.5); sunce2.position.set(-400, 200, -300); svijet.add(sunce2);

const LIM = 0xA7AEBF, NOVO = 0x2ECAD4, NESTAJE = 0xD8322A;
const CENTAR = new THREE.Vector3(-6.5, 53, 6.4); // središte savijenog modela (mm, koordinate SolidWorksa)
const korijen = new THREE.Group(); korijen.position.copy(CENTAR).multiplyScalar(-1); svijet.add(korijen);
const modeli = []; // po indeksu mi: { staro, novo, nestaje (trokuti ovog modela koji nestaju u sljedećem koraku) }

function geometrija(pos, maska, uzmi) {
  let n = 0; for (let i = 0; i < maska.length; i++) if (maska[i] === uzmi) n++;
  const a = new Float32Array(n * 9); let j = 0;
  for (let i = 0; i < maska.length; i++) if (maska[i] === uzmi) { for (let k = 0; k < 9; k++) a[j++] = pos[i * 9 + k] / 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.computeVertexNormals();
  return g;
}
function mreza(g, boja, providno) {
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: boja, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide, transparent: !!providno, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: 0x3A4150, transparent: true })));
  return m;
}
const bitovi = (u8, n) => { const r = new Uint8Array(n); for (let i = 0; i < n; i++) r[i] = (u8[i >> 3] >> (7 - (i & 7))) & 1; return r; };

async function ucitaj() {
  const buf = await (await fetch('sw-oplata/koraci.bin?v=01')).arrayBuffer();
  const dv = new DataView(buf); let o = 0; const sirovo = [];
  while (o < buf.byteLength) {
    const n = dv.getUint32(o, true); o += 4;
    const pos = new Int16Array(buf.slice(o, o + n * 18)); o += n * 18;
    const nb = Math.ceil(n / 8); const novo = bitovi(new Uint8Array(buf, o, nb), n); o += nb;
    const m = dv.getUint32(o, true); o += 4;
    const mb = Math.ceil(m / 8); const nest = bitovi(new Uint8Array(buf, o, mb), m); o += mb;
    sirovo.push({ pos, novo, nest });
  }
  sirovo.forEach((s, i) => {
    const ravno = i === sirovo.length - 1; // Flat-Pattern
    const grupa = new THREE.Group();
    const staro = mreza(geometrija(s.pos, s.novo, 0), LIM, true);
    const novo = mreza(geometrija(s.pos, s.novo, 1), LIM, true);
    grupa.add(staro, novo);
    let nestaje = null;
    const sl = sirovo[i + 1];
    if (sl && sl.nest.length === s.novo.length) { nestaje = mreza(geometrija(s.pos, sl.nest, 1), NESTAJE, true); grupa.add(nestaje); }
    if (ravno) { // razvijena ploha leži ispod središta savijenog modela
      grupa.position.set(CENTAR.x - (-229.85 + 209.85) / 2, -0.01, CENTAR.z - (-111.69 + 159.44) / 2);
    }
    grupa.visible = false; korijen.add(grupa);
    modeli.push({ grupa, staro, novo, nestaje, ravno });
  });
  // crte savijanja na razvijenoj plohi (iz DXF-a s Bend lines, mm)
  const pr = await (await fetch('sw-oplata/pregibi.json?v=01')).json();
  const tocke = []; pr.forEach(([x1, z1, x2, z2]) => tocke.push(new THREE.Vector3(x1, 3.2, z1), new THREE.Vector3(x2, 3.2, z2)));
  const lg = new THREE.BufferGeometry().setFromPoints(tocke);
  crteSavijanja = new THREE.LineSegments(lg, new THREE.LineDashedMaterial({ color: 0xD8322A, dashSize: 5, gapSize: 3 }));
  crteSavijanja.computeLineDistances();
  modeli[modeli.length - 1].grupa.add(crteSavijanja);
}
let crteSavijanja = null;
// skica otvorenog U-profila (Sketch1, Front Plane)
const skica = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-90, 80], [-90, 0], [90, 0], [90, 80]].map(([x, y]) => new THREE.Vector3(x, y, 0))), new THREE.LineBasicMaterial({ color: 0x1F6FB2 }));
korijen.add(skica);

function prikazi(mi, op, istakni) {
  const M = modeli[mi]; if (!M) return;
  M.grupa.visible = op > 0.001;
  const boja = istakni ? NOVO : LIM;
  M.staro.material.opacity = op; M.staro.children[0].material.opacity = op;
  M.novo.material.color.setHex(boja); M.novo.material.opacity = op; M.novo.children[0].material.opacity = op;
  [M.staro, M.novo].forEach(m => { m.material.transparent = op < 0.999; m.material.depthWrite = op > 0.5; });
  if (M.nestaje) M.nestaje.visible = false;
}

let korakS = 0, svira = false;
function postaviKorak(s) {
  korakS = s;
  const i = Math.min(N, Math.max(0, Math.ceil(s - 1e-6)));
  const kk = KORACI[i];
  if (modeli.length) {
    modeli.forEach(M => { M.grupa.visible = false; });
    const f = sglatko(s - (i - 1));
    const pret = i > 0 ? KORACI[i - 1].mi : -1;
    if (kk.mi >= 0 && kk.mi !== pret) {
      const ravno = modeli[kk.mi].ravno;
      if (pret >= 0) { // prethodni model: nestaje (crveno) ili se cijeli gasi kod razvijanja
        const P = modeli[pret];
        if (ravno) prikazi(pret, 1 - f, false);
        else if (P.nestaje && f < 1) { P.grupa.visible = true; P.staro.visible = P.novo.visible = false; P.nestaje.visible = true; P.nestaje.material.opacity = 1 - f; }
      }
      const C = modeli[kk.mi];
      if (ravno) prikazi(kk.mi, f, false);
      else {
        C.grupa.visible = true; C.staro.visible = C.novo.visible = true;
        prikazi(kk.mi, 1, true);
        C.novo.material.opacity = Math.max(0.15, f); C.novo.material.transparent = f < 1;
        C.novo.children[0].material.opacity = f;
      }
    } else if (kk.mi >= 0) { prikazi(kk.mi, 1, false); modeli[kk.mi].staro.visible = modeli[kk.mi].novo.visible = true; }
    if (crteSavijanja) crteSavijanja.visible = i >= N - 1 && s > N - 1.01;
  }
  skica.visible = i <= 1 && s < 0.999;
  const zeljeniR = s > N - 1.5 ? R0 * 1.55 : R0; // razvijena ploha je veća od savijenog modela
  if (zeljeniR !== Rtren) { const f = zeljeniR / Rtren; Rtren = zeljeniR; kamera.position.multiplyScalar(f); kamera.far = Rtren * 50; kamera.updateProjectionMatrix(); }
  $('#korak-br').textContent = `${i} / ${N}`;
  $('#korak-z').textContent = kk.z;
  $('#korak-naslov').textContent = kk.n;
  $('#korak-opis').textContent = kk.o;
  $('#klizac').value = s;
  const sl = $('#sw-slika');
  const src = `sw-oplata/${kk.slika}.jpg`;
  if (!sl.getAttribute('src') || !sl.getAttribute('src').endsWith(src)) { sl.src = src; sl.alt = `SolidWorks 2017: ${kk.z} — ${kk.n}`; }
  sl.classList.toggle('uska', !!kk.uska);
  $('#sw-pm').innerHTML = kk.pm.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('');
  const pmLink = $('#sw-pm-slika');
  if (kk.pmSlika) { pmLink.hidden = false; pmLink.href = `sw-oplata/${kk.pmSlika}.jpg`; } else pmLink.hidden = true;
  document.querySelectorAll('#stablo-sw li').forEach((li, j) => { li.classList.toggle('aktivan', j === i); li.querySelector('button').setAttribute('aria-pressed', String(j === i)); });
}
const R0 = 300; let Rtren = R0, zadnjiPogled = 'kosi', uskiPrikaz = null;
function pogled(v) {
  zadnjiPogled = v;
  kontrole.target.set(0, 0, 0);
  const R = Rtren * (kamera.aspect < 1 ? 1.45 : 1);
  if (v === 'gore') kamera.position.set(0.01, R * 1.9, 0.01);
  else if (v === 'sprijeda') kamera.position.set(0, R * 0.25, R * 1.7);
  else kamera.position.set(R * 0.95, R * 0.85, R * 1.15);
  kamera.near = 1; kamera.far = R * 50; kamera.updateProjectionMatrix();
}
function velicina() { const w = scena.clientWidth, h = scena.clientHeight; renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); const u = kamera.aspect < 1; if (u !== uskiPrikaz) { uskiPrikaz = u; pogled(zadnjiPogled); } }
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
window.ftqSwOplata = { KORACI, postaviKorak, spremno: () => modeli.length > 0 };
