/* FORTRONIQ · Haas TL-1 — Upoznavanje stroja (izbornik sklopova, 3D prikaz, kartica s objašnjenjem).  © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviStrojTL1, postaviOkolinu, GEO } from './stroj_tl1.js?v=02';
import { napraviObradak, osvjezi } from './tokarenje.js?v=02';

const $ = (id) => document.getElementById(id);

const SKLOPOVI = [
  { id: 'postolje', naziv: 'Postolje i vodilice osi Z', dijelovi: ['postolje'], anim: 'Z', pogled: 'radni', tekst: `
<p>TL-1 je tokarilica s <b>ravnim ležajem</b> (kao klasična univerzalna tokarilica): lijevano postolje nosi dvije vodilice uzduž osi vretena po kojima se giba suport. To je <b>os Z</b>, hod <b>762 mm</b> (30″). Ispod vodilica je korito za strugotinu i rashladno sredstvo.</p>
<p>Smjer osi: <b>−Z</b> je prema steznoj glavi (alat ulazi u obradak), <b>+Z</b> prema konjiću. Nultočka stroja je u krajnjem +Z položaju, pa su koordinate stroja u radu negativne: Z od 0 do −762.</p>
<p>Os Z pogoni servomotor preko kugličnog navojnog vretena; brzi hod je 11,4 m/min (proizvođač).</p>` },
  { id: 'vreteniste', naziv: 'Vreteniste, vreteno i motor', dijelovi: ['vreteniste'], anim: 'S', pogled: 'glava', tekst: `
<p>Vreteniste na lijevom kraju nosi glavno vreteno s nosom <b>A2-5</b> i provrtom <b>58 mm</b> (kroz vreteno može šipka do Ø58). Motor vretena ima <b>7,5 kW</b> i daje najviše <b>1 800 o/min</b> (moment 146 Nm pri 355 o/min).</p>
<p>Broj okretaja zadaje se riječju S uz <b>G97</b> (stalni o/min) ili reznom brzinom uz <b>G96</b> (stalna rezna brzina u m/min — upravljanje samo povećava o/min kako se promjer smanjuje, do granice G50).</p>
<p class="pazi-m">Na slici: stezna glava se vrti dok je odabran ovaj sklop (animacija).</p>` },
  { id: 'glava', naziv: 'Stezna glava Ø203 (3 čeljusti)', dijelovi: ['glava'], anim: 'S', pogled: 'glava', tekst: `
<p>Ručna stezna glava Ø203 mm (8″) s tri samocentrirajuće čeljusti; čeljusti su tvrde i okretne (za stezanje izvana ili iznutra). Pripremak se steže ključem — u radionici ručno; u modulu s robotom glava je <b>pneumatska (izmišljeno, označeno)</b>.</p>
<p>Čelo stezne glave je u modelu referenca x = 0; čeljusti vire oko 25 mm ispred čela, pa alat nikad ne smije doći bliže od toga. Simulator provjerava sudar sa steznom glavom i čeljustima.</p>` },
  { id: 'suport', naziv: 'Suport — os Z', dijelovi: ['suport'], anim: 'Z', pogled: 'radni', tekst: `
<p>Suport (saonice) klizi po vodilicama uzduž osi vretena i nosi poprečne saonice. Na stvarnom stroju suport je lijevani, tamnosivi dio s motorom osi X straga.</p>
<p>U programu os Z: <code>G01 Z-40. F0.2</code> — tokarenje do 40 mm od nultočke obratka (čela) posmakom 0,2 mm/okr.</p>` },
  { id: 'poprecne', naziv: 'Poprečne saonice — os X', dijelovi: ['poprecne'], anim: 'X', pogled: 'radni', tekst: `
<p>Poprečne saonice gibaju nosač alata okomito na os vretena: <b>os X</b>, hod <b>203 mm</b>. Na TL-1 nosač alata je <b>ispred</b> osi vretena (kao na klasičnoj tokarilici), pa je +X prema rukovatelju (od osi), −X prema osi vretena.</p>
<p><b>X se programira kao promjer</b> (kao na svim Haas tokarilicama): <code>X30.</code> znači promjer 30 mm, tj. vrh alata je 15 mm od osi. Zato i ručni kotač na osi X pomiče „promjer”: korak 0,1 mm u X pomakne alat 0,05 mm po polumjeru. Najveći promjer tokarenja: 406 mm.</p>` },
  { id: 'nosac', naziv: 'Nosač alata i alati', dijelovi: ['nosac'], anim: null, pogled: 'nosac', tekst: `
<p>Na TL-1 u radionici je <b>brzoizmjenjivi nosač alata</b> (stup s jednim držačem) — nema revolvera. Alat se mijenja ručno: držač s nožem skine se i stavi drugi. Zato u simulatoru T-riječ s novim brojem alata zaustavi program i čeka ručnu izmjenu (pretpostavka ponašanja).</p>
<ul><li><b>T1</b> vanjski nož, desni, pločica 80° s polumjerom vrha 0,8 — čeono i uzdužno tokarenje, skošenja.</li>
<li><b>T2</b> odrezivač / utorni nož širine 3 mm.</li><li><b>T3</b> svrdlo Ø12 u držaču na osi (bušenje iz nosača; na stroju i iz konjića).</li>
<li><b>T4</b> nož za navoj 60°.</li><li><b>T5</b> unutarnji nož (bušna motka).</li></ul>
<p>Svaki alat ima zapis u tablici OFFSET: <b>X GEOMETRY</b> i <b>Z GEOMETRY</b> (položaj vrha u odnosu na nultočku stroja) te X/Z WEAR (trošenje). Program ih zove s <code>T0101</code> (alat 1, korekcija 1). Mjere se tipkama Z FACE MESUR i X DIA MESUR.</p>` },
  { id: 'konjic', naziv: 'Konjić (ručni)', dijelovi: ['konjic'], anim: null, pogled: 'konjic', tekst: `
<p>Konjić na desnom kraju ležaja podupire duge obratke rotirajućim šiljkom ili nosi svrdlo; pomiče se ručno po ležaju, a pinola ručnim kolom. Razmak šiljaka je 762 mm.</p>
<p class="pazi-m">U simulatoru konjić miruje (odmaknut); tipke TS na privjesku nemaju učinka. Vrsta konusa pinole nije provjerena na stroju.</p>` },
  { id: 'kabina', naziv: 'Kabina, rasvjeta i signalna svjetiljka', dijelovi: ['kabina'], anim: null, pogled: 'stroj', tekst: `
<p>Bijela limena kabina zatvara radni prostor s tri strane; sprijeda je otvor koji zatvaraju klizna vrata. Unutra su LED rasvjeta i tamni štitnik iza radnog prostora; na krovu desnog dijela je signalna svjetiljka (stanje stroja).</p>
<p class="pazi-m">Mjere kabine (≈ 255 × 87 cm tlocrt, visina ≈ 170 cm) i visina osi vretena (≈ 100 cm) su procjena s fotografija; proizvođač navodi samo transportne mjere (226 × 169 × 211 cm) i masu 2 223 kg.</p>` },
  { id: 'vrata', naziv: 'Klizna zaštitna vrata', dijelovi: ['vrata'], anim: 'vrata', pogled: 'stroj', tekst: `
<p>Klizna vrata s velikim prozorom i okomitom ručkom od nehrđajućeg čelika zatvaraju otvor radnog prostora; otvaraju se <b>ulijevo</b>, preko dijela kabine iznad vreteništa.</p>
<p>Vrata imaju sklopku: dok su otvorena, program se ne pokreće i vreteno se ne vrti (<b>door hold</b>). Pripremak se steže, alat mijenja i strugotina čisti kroz otvorena vrata, a obrada ide samo kad su zatvorena.</p>` },
  { id: 'privjesak', naziv: 'Privjesak upravljanja NGC', dijelovi: ['privjesak'], anim: null, pogled: 'privjesak', tekst: `
<p>Upravljanje Haas <b>Next Generation Control</b> je na privjesku učvršćenom na desnom dijelu kabine: zaslon gore desno, tipkovnica ispod, a u lijevom stupcu POWER ON / OFF, gljiva EMERGENCY STOP, ručni kotač HANDLE JOG te CYCLE START i FEED HOLD — isti raspored kao na upravljačkoj jedinici Desktop Milla. Skupine tipki:</p>
<ul><li><b>MODE</b> — EDIT, MEM, MDI, HANDLE JOG, ZERO RET, LIST PROG s pripadnim tipkama (INSERT, ALTER, DELETE, UNDO; SINGLE BLOCK, DRY RUN, OPT STOP; .0001 … .1; ALL, HOME G28; SELECT PROG, ERASE PROG).</li>
<li><b>DISPLAY</b> — PROGRAM, POSITION, OFFSET, CURRENT COMMANDS, ALARMS, DIAGNOSTIC, SETTING, GRAPHICS.</li>
<li><b>Funkcijske</b> — RESET, POWER UP, RECOVER, F1–F4, <b>X DIA MESUR</b>, NEXT TOOL, <b>Z FACE MESUR</b>, PART ZERO SET, TURRET FWD/REV, TS (konjić).</li>
<li><b>JOG</b> — ±X, ±Z (i ±C, ±Y za strojeve s tim osima), RAPID, JOG LOCK, CHIP; <b>OVERRIDES</b> — posmak, vreteno, brzi hod, SPINDLE FWD/STOP/REV.</li></ul>
<p class="pazi-m">Zaslon i tipkovnica u simulatoru su naš crtež prema fotografiji privjeska (20. 10. 2026.), ne snimka Haas upravljanja.</p>` },
  { id: 'ormar', naziv: 'Električni ormar i glavna sklopka', dijelovi: ['ormar'], anim: null, pogled: 'straga', tekst: `
<p>Na stražnjoj strani je svijetlosivi električni ormar s napajanjem, pogonima i upravljačkom elektronikom. Na vratima ormara su <b>glavna sklopka</b> (I / OFF), natpisna pločica stroja (400 V, 3 faze, 50/60 Hz) i pločica s uputom za dizanje stroja. Uključivanje ide redom: glavna sklopka → POWER ON na privjesku → otpuštanje EMERGENCY STOP → RESET → POWER UP.</p>
<p>Nakon uključivanja upravljanje javlja alarme <b>102 SERVOS OFF</b> i (ako je gljiva pritisnuta) <b>107 EMERGENCY OFF</b>; RESET ih briše kad uzrok više ne postoji.</p>` },
  { id: 'nultocke', naziv: 'Nultočka stroja i obratka', dijelovi: ['nultocke'], anim: null, pogled: 'radni', tekst: `
<p><b style="color:#e0533d">Nultočka stroja</b> (crveno) je položaj nakon ZERO RETURN: X krajnje od osi, Z krajnje prema konjiću. Haas prikazuje koordinate stroja u stupcu <b>MACHINE</b> i u radu su negativne.</p>
<p><b style="color:#17999f">Nultočka obratka</b> (tirkizno) je na <b>osi vretena</b> (X = 0 uvijek) i na <b>čelu obratka</b> (Z = 0). Na tokarilici se u pravilu ne pomiče G54, nego se za svaki alat mjere korekcije X i Z tako da WORK pokazuje promjer i udaljenost od čela; G54 Z služi kad novi pripremak viri drukčije.</p>` },
  { id: 'razlike', naziv: 'Tokarilica i glodalica: razlike zapisa', dijelovi: ['privjesak'], anim: null, pogled: 'privjesak', tekst: `
<ul><li><b>X je promjer</b>, Z je udaljenost od čela; nema osi Y. Inkrementalno: U (promjer) i W.</li>
<li><b>Posmak u mm/okr</b> (G99) je zadan; G98 prebacuje na mm/min.</li>
<li><b>G96</b> stalna rezna brzina (S m/min) uz <b>G50</b> granicu o/min; <b>G97</b> stalni o/min (bušenje, navoj).</li>
<li><b>T0101</b> umjesto T1 M06 i G43 H — alat i korekcija u jednoj riječi.</li>
<li><b>Ciklusi tokarenja</b>: G71/G70 (gruba i završna obrada konture), G72, G74 (bušenje), G75 (utor), G76 (navoj) umjesto ciklusa bušenja G81 … G89.</li>
<li><b>,C i ,R</b> — skošenje i zaobljenje na kutu između dva bloka G01.</li>
<li>Decimalna točka obvezna, alarmi 310/311/320, M97/M98 — jednako kao na glodalici.</li></ul>` },
  { id: 'sigurnost', naziv: 'Sigurnost', dijelovi: ['vrata'], anim: 'vrata', pogled: 'stroj', tekst: `
<ul><li>Obrada samo sa <b>zatvorenim kliznim vratima</b> — upravljanje to provjerava (door hold).</li>
<li>Ključ stezne glave <b>nikad ne ostavljaj u glavi</b>; prije pokretanja vretena provjeri da je pripremak stegnut i da ne viri predugo bez konjića.</li>
<li>Zaštitne naočale; duga kosa i rukavi daleko od stezne glave koja se vrti (1 800 o/min).</li>
<li>Alat mijenjaj samo kad vreteno stoji (SPINDLE STOP ili M05) i kad je suport odmaknut (+X, +Z).</li>
<li>Prije CYCLE START: FEED override 10 %, SINGLE BLOCK za prvi prolaz, ruka na FEED HOLD. RESET zaustavlja program i vreteno.</li>
<li>Odrezani dio pada u korito — ne hvataj ga rukom dok se vrti.</li>
<li>EMERGENCY STOP je na privjesku; nakon pritiska treba RESET.</li></ul>` }
];

/* ------------------------------------------------------------------ scena */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 5, 20000);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1500, 3000, 2500); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-2000, 1500, -1500); scene.add(sun2);
postaviOkolinu(THREE, renderer, scene);
const S = napraviStrojTL1(THREE, scene);
const O = napraviObradak(THREE, S.obrGrupa, { D: 40, L: 130, drz: 30 }); osvjezi(THREE, O); S.celjustiNa(20);
S.nulaW.position.set(100, 0, 0);
S.zaslonTekst(true, 'MEM', ['-306.000', '-625.000']);

function pogled(p) {
  const P = {
    stroj: [[-1800, 1300, 3800], [400, -150, 0]], radni: [[-500, 600, 1500], [250, -50, 0]], glava: [[-300, 300, 900], [0, 0, 0]], nosac: [[200, 350, 800], [360, 20, 60]],
    konjic: [[900, 400, 1200], [1250, -50, 0]], privjesak: [[1500, 400, 1600], [1030, 150, 400]], straga: [[2600, 900, -3000], [600, -100, -300]]
  }[p] || [[-1800, 1300, 3800], [400, -150, 0]];
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
const NAZIV = { pod: 'Pod radionice', obradak: 'Pripremak Ø40' };
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
function pogodak(e) {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const h = ray.intersectObjects(scene.children, true).find((q) => q.object.visible && q.object.userData.dio && q.object.userData.dio !== 'pod' && q.object.material !== S.M.staklo);
  return h ? { id: h.object.userData.dio, x: e.clientX - r.left, y: e.clientY - r.top } : null;
}
const KARTA_ZA = { obradak: 'glava' };
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
const osi = { X: -200, Z: -500 };
let kutGlave = 0;
function animiraj(dt) {
  const a = odabran && animira ? odabran.anim : null;
  animT += dt;
  const cilj = { X: -200, Z: -500 };
  if (a === 'X') cilj.X = -250 + 120 * Math.sin(animT * 0.7);
  if (a === 'Z') cilj.Z = -450 + 250 * Math.sin(animT * 0.5);
  for (const o of ['X', 'Z']) osi[o] += (cilj[o] - osi[o]) * Math.min(1, dt * 3);
  S.postaviOsi(osi.X, osi.Z);
  const vrti = a === 'S';
  if (vrti) kutGlave += dt * 12; S.okreniGlavu(kutGlave);
  S.vrataNa(a === 'vrata' ? 0.5 + 0.5 * Math.sin(animT * 1.1) : 1);
  $('osi-prikaz').textContent = 'X ' + osi.X.toFixed(1) + '  Z ' + osi.Z.toFixed(1) + (vrti ? '  S 1800' : '');
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
window.__tl1u = { S, odaberi, SKLOPOVI, pogled, camera, controls, GEO, pauza(v) { pauza = v; if (v) { controls.update(); renderer.render(scene, camera); } } };
requestAnimationFrame(petlja);
