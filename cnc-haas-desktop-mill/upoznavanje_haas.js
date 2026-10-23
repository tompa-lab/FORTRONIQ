/* FORTRONIQ · Haas Desktop Mill — Upoznavanje stroja (izbornik sklopova, 3D prikaz, kartica s objašnjenjem).  © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviStrojHaas, postaviOkolinu, GEO } from './stroj_haas.js?v=02';

const $ = (id) => document.getElementById(id);

const SKLOPOVI = [
  { id: 'kabina', naziv: 'Kabina i vrata', dijelovi: ['kabina', 'vrata'], anim: 'vrata', pogled: 'stroj', tekst: `
<p>Desktop Mill je stolna glodalica u zatvorenoj <b>antracit-sivoj limenoj kabini</b> s aluminijskom unutrašnjošću. Sprijeda su <b>zaštitna vrata</b> s velikim zatamnjenim prozorom koja se <b>podižu prema gore</b> i preklapaju preko krova kabine; ispod njih je prednja traka s ručkom od nehrđajućeg čelika. Stroj teži oko 164 kg i stoji na radnom stolu; napaja se iz obične utičnice (110 V / 15 A ili 220 V / 9 A).</p>
<p>Vrata imaju sklopku: dok su podignuta, program se ne pokreće i vreteno se ne vrti (<b>door hold</b>). Zato se pripremak steže, alat mijenja i strugotina čisti samo kroz podignuta vrata, a obrada ide samo kad su spuštena.</p>
<p class="pazi-m">Model je napravljen prema fotografijama stvarnog stroja (boje, raspored, vrata, upravljačka jedinica). Mjere kabine (≈ 72 × 70 × 60 cm) su procjena s fotografija; proizvođač ih na stranici sa specifikacijama ne navodi.</p>` },
  { id: 'postolje', naziv: 'Postolje i os Y', dijelovi: ['postolje', 'saonice'], anim: 'Y', pogled: 'radni', tekst: `
<p>Lijevano postolje nosi vodilice po kojima se gibaju <b>saonice</b> — to je <b>os Y</b>, hod 254 mm (10″). Na saonicama su vodilice osi X i stol.</p>
<p>Smjer osi gleda se kao gibanje <b>alata prema obratku</b>: kad saonice sa stolom idu prema tebi, alat u odnosu na obradak ide prema natrag — to je +Y. Haas je stroj s C-okvirom: obradak se giba u X i Y, a vreteno samo u Z.</p>
<p>Nultočka stroja je u krajnjem +Y položaju (stol skroz naprijed, vreteno nad stražnjim dijelom stola). Zato su koordinate stroja u radu negativne: Y od 0 do −254.</p>` },
  { id: 'stol', naziv: 'Stol s T-utorima i os X', dijelovi: ['stol'], anim: 'X', pogled: 'radni', tekst: `
<p>Stol 460 × 270 mm ima <b>6 T-utora širine 10 mm na razmaku 45 mm</b>, uzduž osi X. U utore se T-maticama pričvršćuju škripac, stezne pandže i podložne ploče.</p>
<p>Stol se giba lijevo–desno po saonicama: to je <b>os X</b>, hod 152 mm (6″). +X je udesno (alat prema obratku). Koordinate stroja: X od 0 (krajnje desno, nultočka) do −152.</p>
<p class="pazi-m">Hod je mnogo manji od stola: alat doseže samo srednjih 152 mm stola. Pripremak zato ide na sredinu, a programi šire putanje (npr. P13, P14) ne stanu u hod.</p>` },
  { id: 'glava', naziv: 'Stup, glava i os Z', dijelovi: ['stup', 'glava'], anim: 'Z', pogled: 'radni', tekst: `
<p>Stup na stražnjem dijelu postolja nosi vertikalne vodilice i glavu s vretenom. Glava se giba gore–dolje: <b>os Z</b>, hod 76 mm (3″), +Z prema gore, od obratka. Nultočka stroja je na vrhu hoda.</p>
<p>Najveći razmak čela vretena od stola je 80 mm. Od toga treba oduzeti duljinu alata ispod čela (stezna matica + alat ≈ 25 mm) i visinu pribora — ostaje malo prostora, pa se koristi niski škripac, a visoki pripremci ne stanu.</p>
<p>Sve tri osi pogone servomotori s povratnom vezom (ne koračni kao na glodalici 3020): upravljanje zna gdje je os i javlja alarm ako zaostane (SERVO ERROR TOO LARGE).</p>` },
  { id: 'vreteno', naziv: 'Vreteno ER11 i alat', dijelovi: ['vreteno'], anim: 'S', pogled: 'vreteno', tekst: `
<p>Integrirano vreteno (motor i vreteno u jednom kućištu) vrti se do <b>15 000 o/min</b>. Alat se steže steznom čahurom <b>ER11</b> i maticom, ručno ključem — Desktop Mill <b>nema izmjenjivač alata</b>, pa M06 u programu znači: stroj stane, operater zamijeni alat i nastavi s CYCLE START.</p>
<p class="pazi-m">Proizvođač upozorava: ispod <b>1 500 o/min</b> vreteno se pregrijava. Brzina rezanja zato se bira alatom malog promjera, ne malim brojem okretaja.</p>
<p>Materijali su plastika i strojni vosak (proizvođač); u simulatoru su naši predmeti P01 … P21 u MDF-u, a vježbe u vosku. Alati u simulatoru: T1 glodalo Ø3, T2 glodalo Ø6, T3 svrdlo Ø5 — duljine su pretpostavka.</p>
<p>Svaki alat ima u tablici OFFSET zapis <b>H</b> (duljina) koji program poziva s <code>G43 H01</code>. Duljina se mjeri dodirom plohe obratka i tipkom TOOL OFFSET MEASURE.</p>` },
  { id: 'privjesak', naziv: 'Upravljačka jedinica NGC', dijelovi: ['privjesak'], anim: null, pogled: 'privjesak', tekst: `
<p>Upravljanje Haas <b>Next Generation Control</b> je <b>zasebna svijetlosiva kutija</b> s ručkom na vrhu, koja stoji pokraj stroja i sa strojem je spojena kabelima <b>CONTROL CBL 1</b> i <b>CONTROL CBL 2</b>; ima vlastiti kabel napajanja (240 V). Na prednjoj strani su zaslon gore desno, tipkovnica ispod njega, a u lijevom stupcu POWER ON / OFF, gljiva EMERGENCY STOP sa žutim prstenom, ručni kotač te CYCLE START i FEED HOLD. Tipke su podijeljene u skupine:</p>
<ul><li><b>MODE</b> — EDIT (uređivanje), MEM (izvođenje iz memorije), MDI (ručni unos), HANDLE JOG (ručno gibanje), ZERO RET (referenciranje), LIST PROG (popis programa); uz svaku su tipke te skupine (INSERT, ALTER, DELETE, UNDO; SINGLE BLOCK, DRY RUN, OPT STOP; .0001 … .1; ALL, HOME G28; SELECT PROG, ERASE PROG).</li>
<li><b>DISPLAY</b> — PROGRAM, POSITION, OFFSET, CURRENT COMMANDS, ALARMS, DIAGNOSTIC, SETTING, GRAPHICS — što se prikazuje na zaslonu (u simulatoru rade prve četiri).</li>
<li><b>CURSOR</b> — strelice, PAGE UP/DOWN, HOME, END.</li>
<li><b>OVERRIDES</b> — posmak −10 / 100 / +10 %, vreteno, brzi hod 5 / 25 / 50 / 100 %, SPINDLE FWD / STOP / REV.</li>
<li><b>JOG</b> — tipke +X −X +Y −Y +Z −Z (±A postoje na tipkovnici, ali Desktop Mill nema os A) i RAPID; ručni kotač s koracima .0001 / .001 / .01 / .1 (u metričkom načinu 0,001 / 0,01 / 0,1 / 1 mm po kliku).</li>
<li><b>CYCLE START</b> (zeleno), <b>FEED HOLD</b> (crveno), <b>RESET</b>, <b>POWER UP</b> (referenciranje nakon uključivanja), TOOL OFFSET MEASURE, PART ZERO SET; NEXT TOOL, TOOL RELEASE i ATC FWD/REV na ovom stroju nemaju što raditi (nema izmjenjivača alata).</li></ul>
<p class="pazi-m">Zaslon i tipkovnica u simulatoru su naš crtež prema rasporedu stvarne jedinice, ne snimka Haas upravljanja; zaslon prikazuje samo ono što vježbe trebaju.</p>` },
  { id: 'ormar', naziv: 'Stražnja strana: napajanje i priključci', dijelovi: ['ormar'], anim: null, pogled: 'ormar', tekst: `
<p>Na stražnjoj strani kabine je crni odjeljak s elektronikom: priključak napajanja stroja, ventilator, natpisna pločica i dva priključka <b>CONTROL CBL 1 / 2</b> za kabele prema upravljačkoj jedinici. Na lijevom boku kabine je rešetka ventilatora. Glavne sklopke kao na velikim strojevima nema: stroj i upravljačka jedinica uključuju se u utičnice, a upravljanje se pokreće tipkom POWER ON. Uključivanje ide redom: kabeli u utičnice → POWER ON na upravljačkoj jedinici → otpuštanje EMERGENCY STOP → RESET → POWER UP.</p>
<p>Nakon uključivanja upravljanje javlja alarme <b>102 SERVOS OFF</b> i (ako je gljiva pritisnuta) <b>107 EMERGENCY OFF</b>; RESET ih briše kad uzrok više ne postoji. Dok osi nisu referencirane (ZERO RET), program se ne može pokrenuti.</p>` },
  { id: 'skripac', naziv: 'Niski škripac', dijelovi: ['skripac'], anim: null, pogled: 'skripac', postav: 'skripac', tekst: `
<p>Zbog malog razmaka vretena i stola (80 mm) koristi se <b>niski škripac</b> (visina čeljusti oko 20 mm): pripremci do 100 mm duljine (širina čeljusti, os X) i do 60 mm širine (otvor, os Y).</p>
<p>Nepomična čeljust je straga i mora biti paralelna s osi X. Pripremak leži na paralelnim podlošcima i viri iznad čeljusti nekoliko milimetara.</p>
<p class="pazi-m">Pneumatsko stezanje škripca u simulatoru je <b>izmišljeno i tako označeno</b> — predviđeno za kasniji modul s robotom UR3e i PLC-om. Stvarni Desktop Mill nema ni pneumatiku ni sondu.</p>` },
  { id: 'pandze', naziv: 'Stezne pandže', dijelovi: ['pandze'], anim: null, pogled: 'pandze', postav: 'pandze', tekst: `
<p>Pripremci veći od škripca (naši predmeti 150 × 100 mm) stežu se <b>steznim pandžama</b> na podložnoj MDF ploči od 8 mm, u T-utore stola.</p>
<ul><li>Letva vodoravna ili blago nagnuta prema pripremku, vijak što bliže pripremku.</li>
<li>Ukupna visina (ploča + pripremak + pandža) mora stati ispod alata na vrhu hoda Z: s alatom od 25 mm ostaje oko 55 mm.</li></ul>
<p class="pazi-m">Prije pokretanja programa provjeri da putanja ne prelazi preko pandži. Simulator sudar s pandžama ne provjerava.</p>` },
  { id: 'nultocke', naziv: 'Nultočka stroja i obratka', dijelovi: ['nultocke'], anim: null, pogled: 'radni', tekst: `
<p><b style="color:#e0533d">Nultočka stroja</b> (crveno) je položaj nakon ZERO RETURN: X krajnje desno, Y krajnje natrag (stol naprijed), Z gore. Haas prikazuje koordinate stroja u stupcu <b>MACHINE</b> i u radu su negativne.</p>
<p><b style="color:#17999f">Nultočka obratka</b> (tirkizno) je zapis <b>G54</b> (ili G55 … G59) u tablici OFFSET → WORK: razlika koordinata stroja i obratka u X i Y. Određuje se dodirom rubova i tipkom PART ZERO SET, uz dodavanje polumjera alata.</p>
<p>U Z je drukčije nego na glodalici 3020: duljine alata mjere se na gornjoj plohi obratka (H01, H02 …), pa G54 Z ostaje 0, a program svaki alat poziva s <code>G43 H..</code>. Zamjena alata ne mijenja nultočku obratka.</p>` },
  { id: 'razlike', naziv: 'Haas, SINUMERIK 840D i Mach3', dijelovi: ['privjesak'], anim: null, pogled: 'privjesak', tekst: `
<p>Program je ISO G-kod, ali dijalekt se razlikuje:</p>
<ul><li><b>Zapis programa</b>: <code>%</code> na početku i kraju, broj programa <code>O01001</code>, naziv u zagradama; sigurnosni blok <code>G00 G17 G21 G40 G49 G80 G90</code>.</li>
<li><b>Decimalna točka je obvezna</b>: <code>X10.</code> je 10 mm, a <code>X10</code> bez točke je 0,010 mm (tisućinke). To je najčešća pogreška početnika na Haasu.</li>
<li><b>Ciklusi</b> su G-riječi (G81, G83, G12/G13 …) s modalnim ponašanjem i G98/G99, a ne pozivi poput POCKET4; <b>potprogrami</b> M97 (lokalni, na redak N) i M98 (iz memorije).</li>
<li><b>Nema posmaka bez F</b>: G01 bez F daje alarm 320 NO FEED RATE.</li>
<li><b>Izmjena alata</b> na Desktop Millu je ručna (M06 zaustavi program); duljina alata je u H, poziva se G43.</li>
<li><b>Vreteno</b> se zadaje S i M03 kao i drugdje, ali najmanje 1 500 o/min.</li></ul>` },
  { id: 'sigurnost', naziv: 'Sigurnost', dijelovi: ['vrata'], anim: 'vrata', pogled: 'stroj', tekst: `
<ul><li>Obrada samo sa <b>spuštenim zaštitnim vratima</b> — upravljanje to i provjerava (door hold).</li>
<li><b>Zaštitne naočale</b> pri podizanju vrata i čišćenju; glodalo Ø3 lako pukne.</li>
<li>Alat mijenjaj samo kad vreteno stoji (SPINDLE STOP ili M05) i kad je os Z podignuta; ključ za maticu ER11 ne ostavljaj u kabini.</li>
<li>Prije CYCLE START: FEED override 10 %, SINGLE BLOCK za prvi prolaz, ruka na FEED HOLD. RESET zaustavlja program i vreteno.</li>
<li>Vosak i plastika daju sitnu strugotinu — usisavač, ne puhanje prema sebi.</li>
<li>EMERGENCY STOP je na upravljačkoj jedinici; nakon pritiska treba RESET, a nakon izmjene položaja osi bez napajanja i ZERO RET.</li></ul>` }
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
const S = napraviStrojHaas(THREE, scene);

const mBlank = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7 });
const mMdf = new THREE.MeshStandardMaterial({ color: 0xc49a66, roughness: 0.8 });
let blok = null;
function postav(vrsta) {
  if (blok) { S.obrGrupa.remove(blok); blok.geometry.dispose(); blok = null; }
  if (vrsta === 'pandze') {
    const p = S.pandzeZa(150, 100, 20, 0, 0);
    blok = new THREE.Mesh(new THREE.BoxGeometry(150, 20, 100), mMdf); blok.position.set(0, p.bot + 10, 0);
    S.nulaW.position.set(p.x0, p.top, -p.y0);
  } else {
    const p = S.skripacZa(100, 60, 20, 0, 0, true);
    blok = new THREE.Mesh(new THREE.BoxGeometry(100, 20, 60), mBlank); blok.position.set(0, p.bot + 10, 0);
    S.nulaW.position.set(p.x0, p.top, -p.y0);
  }
  blok.userData.dio = vrsta === 'pandze' ? 'pandze' : 'skripac';
  S.obrGrupa.add(blok);
}
postav('skripac');
S.zaslonTekst(true, 'MEM', ['-76.000', '-127.000', '-10.000']);

function pogled(p) {
  const P = {
    stroj: [[-700, 520, 1500], [220, 120, 60]], radni: [[-260, 320, 600], [0, 40, 80]], vreteno: [[-200, 260, 420], [0, 100, 30]],
    privjesak: [[760, 260, 900], [640, 60, 300]], ormar: [[500, 420, -1150], [0, 150, -350]], skripac: [[-170, 220, 330], [0, 20, 60]], pandze: [[-200, 260, 400], [0, 20, 60]]
  }[p] || [[-700, 520, 1500], [220, 120, 60]];
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
  if (s.postav === 'pandze') postav('pandze'); else if (!s.postav || s.postav === 'skripac') postav('skripac');
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
const NAZIV = { podloga: 'Radni stol (podloga)', obradak: 'Pripremak' };
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
function pogodak(e) {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const h = ray.intersectObjects(scene.children, true).find((q) => q.object.visible && q.object.userData.dio && q.object.userData.dio !== 'podloga' && q.object.material !== S.M.staklo);
  return h ? { id: h.object.userData.dio, x: e.clientX - r.left, y: e.clientY - r.top } : null;
}
const KARTA_ZA = { saonice: 'postolje', stup: 'glava' };
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
const osi = { X: -76, Y: -127, Z: -10 };
let kutAlata = 0;
function animiraj(dt) {
  const a = odabran && animira ? odabran.anim : null;
  animT += dt;
  const cilj = { X: -76, Y: -127, Z: -10 };
  if (a === 'X' || a === 'sve') cilj.X = -76 + 70 * Math.sin(animT * 0.7);
  if (a === 'Y' || a === 'sve') cilj.Y = -127 + 120 * Math.sin(animT * 0.6 + (a === 'sve' ? 1 : 0));
  if (a === 'Z' || a === 'sve') cilj.Z = -36 + 34 * Math.sin(animT * 0.9);
  for (const o of ['X', 'Y', 'Z']) osi[o] += (cilj[o] - osi[o]) * Math.min(1, dt * 3);
  S.postaviOsi(osi.X, osi.Y, osi.Z);
  const vrti = a === 'S';
  if (vrti) kutAlata += dt * 40; S.okreniAlat(kutAlata);
  S.vrataNa(a === 'vrata' ? 0.5 + 0.5 * Math.sin(animT * 1.1) : 0);
  $('osi-prikaz').textContent = 'X ' + osi.X.toFixed(1) + '  Y ' + osi.Y.toFixed(1) + '  Z ' + osi.Z.toFixed(1) + (vrti ? '  S 15000' : '');
}
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now(), pauza = false;
function petlja(t) {
  const dt = Math.min(0.1, (t - zadnje) / 1000); zadnje = t;
  if (pauza) { requestAnimationFrame(petlja); return; }
  animiraj(dt); controls.update(); renderer.render(scene, camera); requestAnimationFrame(petlja);
}
crtajIzbornik(); velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__haasu = { S, odaberi, SKLOPOVI, pogled, camera, controls, GEO, pauza(v) { pauza = v; if (v) { controls.update(); renderer.render(scene, camera); } } };
requestAnimationFrame(petlja);
