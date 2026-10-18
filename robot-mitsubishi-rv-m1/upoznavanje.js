/* FORTRONIQ · Robot Mitsubishi Movemaster EX RV-M1 — Upoznavanje robota (3D).
   Robot na robotskoj stanici Festo MPS, upravljačka jedinica DUM1, privjesak i SIM RV u jednoj sceni; izbornik dio po dio s pretraživanjem,
   rastavljanje robota i osi, unutrašnjost, bočna vrata DUM1, prihvatnica, klizači osi s izravnom kinematikom (X, Y, Z, P, R kao na robotu),
   odjeljci s tekstom i tablicama i animacije „Kako radi” (teme_rvm1.js, uvozi se dinamički — stranica radi i bez njih).
   Svi nazivi, opisi, brojevi, izvori i pretpostavke čitaju se iz rvm1_podaci.js (i rvm1_jezik_podaci.js) — ovdje su samo natpisi sučelja
   i objašnjavajući tekst; svaki broj u tekstu dolazi iz podataka.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as P from './rvm1_podaci.js';
import { napraviRVM1, napraviDUM1, napraviPrivjesak, napraviSimRV, napraviStolMPS } from './rvm1_model.js';
import * as KIN from './rvm1_kin.js';

const { KONFIG, ROBOT, NAZIV_ROBOTA, MJERE, DH, OSI, ORG, NEST, BRZINE, TL_ZADANO, PRIHVATNICA, JEDINICA, STANICA, TEME_POPIS, SKUPINE, IZVORI,
  DIJELOVI, TEKST_PRETPOSTAVKE, pretpostavke, nadjiDio, dijeloviSkupine, izvoriDijela, uStupnjeve, JEZIK, GRUPE_NAREDBI, NAREDBE, NAREDBA_PO_KODU,
  RS232, DUM1_PLOCA, PRIVJESAK, POGRESKE, SIMRV_SIGNALI, FORMAT_ODGOVORA } = P;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = (n, d = 1) => { const k = Math.pow(10, d); const v = Math.round(n * k) / k; return (Object.is(v, -0) ? 0 : v).toString().replace('.', ',').replace('-', '−'); };
const brF = (n, d = 1) => { const v = Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n; return v.toFixed(d).replace('.', ',').replace('-', '−'); };
const brZ = (n, d = 1) => (n > 0.5 * Math.pow(10, -d) ? '+' : '') + brF(n, d);
const mmS = (m, d = 1) => br(m * 1000, d) + ' mm';
const stS = (r, d = 1) => br(uStupnjeve(r), d) + '°';
const ease = (t) => t * t * (3 - 2 * t);
const vel = (t) => String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1);
const mal = (t) => String(t || '').charAt(0).toLowerCase() + String(t || '').slice(1);
const P_ = (...r) => r.filter(Boolean).map((t) => '<p>' + t + '</p>').join('');
const PR = pretpostavke();
const DIO_ID = new Set(DIJELOVI.map((d) => d.id));
const INDEKS = new Map(DIJELOVI.map((d, i) => [d.id, i]));
const skupinaPo = (re) => SKUPINE.find((s) => re.test(s)) || null;
const SK = { podnozje: skupinaPo(/^Podnožje/), rame: skupinaPo(/^Rame/), podlaktica: skupinaPo(/^Podlaktica/), saka: skupinaPo(/^Šaka/), pogoni: skupinaPo(/^Pogoni/),
  prihvatnica: skupinaPo(/^Prihvatnica/), kabeli: skupinaPo(/^Kabeli/), dumVan: skupinaPo(/^DUM1 — izvana/), dumUn: skupinaPo(/^DUM1 — iznutra/), privjesak: skupinaPo(/^Privjesak/),
  sim: skupinaPo(/^SIM/), stanica: skupinaPo(/stanica/i) };
const SKUPINE_ROBOTA = new Set([SK.podnozje, SK.rame, SK.podlaktica, SK.saka, SK.pogoni, SK.prihvatnica]);
const SKUPINE_DUM = new Set([SK.dumVan, SK.dumUn]);
const TL_ARG = ((NAREDBA_PO_KODU.TL || {}).argumenti || [])[0] || { min: 0, max: 300 };
const OC = () => (st.prstiCilj > 0.5 ? 'O' : 'C');

/* ================================================================== */
/* 1. Scena                                                           */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
scenaEl.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 4 / 3, 0.02, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 7; controls.minDistance = 0.08; controls.maxPolarAngle = Math.PI * 0.56;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.55); sun.position.set(1.2, 2.6, 1.8); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.55); sun2.position.set(-2, 1.2, -1.6); scene.add(sun2);
const sun3 = new THREE.DirectionalLight(0xffffff, 0.35); sun3.position.set(-0.5, 0.4, 2.5); scene.add(sun3);

/* robotska stanica: kolica s Al-pločom i čeličnom pločom, robot na čeličnoj ploči */
const stol = napraviStolMPS(THREE); scene.add(stol);
const R = napraviRVM1(THREE, { ploca: false });
const M = stol.userData.mjestoRobota.clone();
R.korijen.position.copy(M); scene.add(R.korijen);
/* DUM1 uz kolica (na podu), privjesak i SIM RV na poklopcu DUM1 (kao na fotografiji jedinice) */
const [DUM_W, DUM_H, DUM_D] = MJERE.dum1;
const D = napraviDUM1(THREE);
const DUM_POS = new THREE.Vector3(STANICA.celicnaPloca.polozaj[0] + 0.2, 0, STANICA.kolica.sirina / 2 + 0.12 + DUM_W / 2);
D.grupa.position.copy(DUM_POS); scene.add(D.grupa);
const PV = napraviPrivjesak(THREE);
PV.position.set(DUM_POS.x + 0.03, DUM_H, DUM_POS.z - DUM_W * 0.23); scene.add(PV);
const SIM = napraviSimRV(THREE);
SIM.grupa.position.set(DUM_POS.x - 0.02, DUM_H, DUM_POS.z + DUM_W * 0.22); scene.add(SIM.grupa);
const S = (x, y, z) => new THREE.Vector3(M.x + x, M.y + z, M.z - y);     /* KS robota → scena */
const DUM_C = DUM_POS.clone().add(new THREE.Vector3(0, DUM_H / 2, 0));
/* pod: meka sjena ispod stanice i jedinice */
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 128); gr.addColorStop(0, 'rgba(110,130,140,0.42)'); gr.addColorStop(0.65, 'rgba(110,130,140,0.15)'); gr.addColorStop(1, 'rgba(110,130,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const pod = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pod.rotation.x = -Math.PI / 2; pod.scale.set(1.0, 1.25, 1); pod.position.set(0.05, -0.001, DUM_POS.z * 0.45); pod.raycast = () => {}; scene.add(pod);
}

/* modeli i njihovi dijelovi (isti dio može biti u više modela, npr. kabeli između robota i DUM1) */
const MODELI = [
  { ime: 'robot', korijen: R.korijen, dijelovi: R.dijelovi, istakni: (id) => R.istakni(id) },
  { ime: 'dum1', korijen: D.grupa, dijelovi: D.dijelovi, istakni: (id) => D.istakni(id) },
  { ime: 'privjesak', korijen: PV, dijelovi: PV.userData.dijelovi, istakni: (id) => PV.userData.istakni(id) },
  { ime: 'sim', korijen: SIM.grupa, dijelovi: SIM.dijelovi, istakni: (id) => SIM.istakni(id) },
  { ime: 'stol', korijen: stol, dijelovi: stol.userData.dijelovi, istakni: (id) => stol.userData.istakni(id) }
];
const objektiDijela = (id) => MODELI.flatMap((m) => ((m.dijelovi.get(id) || {}).objekti || []));
const modelDijela = (id) => MODELI.find((m) => m.dijelovi.has(id)) || null;
const SVI = [];
MODELI.forEach((m) => m.korijen.traverse((o) => { if (o.isMesh) SVI.push(o); }));
function dioOd(o) { let p = o; while (p) { const id = p.userData && p.userData.dio; if (id && DIO_ID.has(id)) return id; p = p.parent; } return null; }
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
const naziv = (id) => (nadjiDio(id) || {}).naziv || id;
const osnovnoIme = (n) => String(n).replace(/\s*\(.*\)\s*$/, '').replace(/\s+—.*$/, '').replace(/\s+J\d$/, '');

/* hijerarhija dijelova (dio B je u sklopu A iste skupine ako su svi njegovi objekti unutar objekata A) */
function sadrzi(A, o) { let p = o; while (p) { if (A.has(p)) return true; p = p.parent; } return false; }
const RODITELJ = new Map(), DUBINA = new Map();
{
  const skupovi = new Map(DIJELOVI.map((d) => [d.id, new Set(objektiDijela(d.id))]));
  const velicina = new Map(DIJELOVI.map((d) => { let n = 0; objektiDijela(d.id).forEach((o) => o.traverse((c) => { if (c.isMesh) n++; })); return [d.id, n]; }));
  DIJELOVI.forEach((b) => {
    const ob = objektiDijela(b.id); if (!ob.length) return;
    let naj = null;
    DIJELOVI.forEach((a) => {
      if (a.id === b.id || a.id === 'robot' || a.skupina !== b.skupina || INDEKS.get(a.id) > INDEKS.get(b.id)) return;
      const A = skupovi.get(a.id); if (!A.size) return;
      if (ob.every((o) => sadrzi(A, o)) && (!naj || velicina.get(a.id) < velicina.get(naj))) naj = a.id;
    });
    if (naj) RODITELJ.set(b.id, naj);
  });
  DIJELOVI.forEach((d) => { let n = 0, p = RODITELJ.get(d.id); while (p && n < 5) { n++; p = RODITELJ.get(p); } DUBINA.set(d.id, n); });
}
const djeca = (id) => DIJELOVI.filter((d) => RODITELJ.get(d.id) === id);

/* sastav pogona svake osi iz podataka (id-ovi koji završavaju oznakom osi) */
const OS_DIJELOVI = OSI.map((o) => DIJELOVI.filter((d) => d.skupina === SK.pogoni && new RegExp(o.ime + '$').test(d.id)).map((d) => d.id));
const OS_DIJELA = new Map(); OS_DIJELOVI.forEach((l, i) => l.forEach((id) => OS_DIJELA.set(id, i)));
const TIPKA_DIO = new Map(); (PV.userData.tipke || new Map()).forEach((mesh, tid) => TIPKA_DIO.set(tid, dioOd(mesh)));

/* ================================================================== */
/* 2. Stanje i iscrtavanje na zahtjev                                 */
/* ================================================================== */
const POCETNI_Q = ORG.slice();
const st = { akt: null, skupina: null, otvorene: new Set(), samo: false, unutra: false, dumUnutra: false, rastav: 0,
  osCilj: [0, 0, 0, 0, 0], osT: [0, 0, 0, 0, 0], vrata: 0, vrataCilj: 0, prsti: 1, prstiCilj: 1,
  q: POCETNI_Q.slice(), poza: null, tl: TL_ZADANO / 1000, pomocni: { osi: false, okviri: false, radni: false },
  trazi: '', filtar: '', greska: null, tipka: null };
const vidjeni = new Set();
const KLJUC = 'ftq-rvm1-upoznavanje';
try { JSON.parse(localStorage.getItem(KLJUC) || '[]').forEach((x) => { if (DIO_ID.has(x)) vidjeni.add(x); }); } catch (e) { /* bez spremanja */ }
function spremi() { try { localStorage.setItem(KLJUC, JSON.stringify([...vidjeni])); } catch (e) { /* bez spremanja */ } }

let rafId = 0, crtati = false, zadnje = performance.now(), brojCrtanja = 0, zauzet = false;
const dlg = $('tema-dlg');
function trazi() {
  crtati = true;
  if (!rafId && !document.hidden) { zadnje = performance.now(); rafId = requestAnimationFrame(okvir); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) trazi(); });

/* ================================================================== */
/* 3. Kamera: pogledi i let do dijela                                 */
/* ================================================================== */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PV_POS = PV.position.clone(), SIM_POS = SIM.grupa.position.clone();
const POGLEDI = {
  sustav: [V(1.62, 1.42, 1.62), V(0.02, 0.5, DUM_POS.z * 0.42)],
  robot: [S(0.62, 1.05, 0.52), S(0.04, 0, 0.27)],
  bocno: [S(0.12, -1.2, 0.34), S(0.1, 0, 0.29)],
  rastavljen: [S(1.1, 1.75, 1.0), S(0.06, 0, 0.42)],
  odozgo: [S(0.06, -0.05, 1.75), S(0.06, 0, 0.18)],
  rame: [S(-0.45, -0.55, 0.62), S(-0.05, 0, 0.3)],
  podnozje: [S(-0.6, -0.42, 0.32), S(-0.06, 0, 0.09)],
  dum1: [DUM_C.clone().add(V(0.6, 0.32, 0.3)), DUM_C.clone()],
  dum1Straga: [DUM_C.clone().add(V(-0.7, 0.32, 0.25)), DUM_C.clone()],
  dum1Bok: [DUM_C.clone().add(V(0.2, 0.2, 0.7)), DUM_C.clone().add(V(0.02, -0.01, 0.12))],
  privjesak: [PV_POS.clone().add(V(-0.13, 0.42, 0.0)), PV_POS.clone().add(V(0, 0.02, 0))],
  simrv: [SIM_POS.clone().add(V(0.0, 0.29, 0.2)), SIM_POS.clone().add(V(0, 0.03, 0))],
  /* pogledi uz pomični dio robota: smjer gledanja je stalan, cilj je središte dijela u trenutnom položaju */
  saka: { dijelovi: ['saka', 'kucisteOkreta', 'prihvatnica'], smjer: V(0.38, 0.22, 0.42), k: 1.0 }
};
const GUMBI_POGLEDA = [['sustav', 'Cijeli sustav'], ['robot', 'Robot'], ['bocno', 'Bočno'], ['saka', 'Šaka i prihvatnica'], ['podnozje', 'Podnožje i konektori'], ['rame', 'Rame i pogoni'],
  ['dum1', 'DUM1 sprijeda'], ['dum1Straga', 'DUM1 straga'], ['dum1Bok', 'DUM1 bočna vrata'], ['privjesak', 'Privjesak'], ['simrv', 'SIM RV']];
const OPIS_POGLEDA = {
  sustav: 'Cijela robotska stanica: kolica Festo MPS s Al-profilnom pločom, robot na čeličnoj ploči, uz kolica upravljačka jedinica DUM1 s privjeskom i simulatorom SIM RV.',
  robot: 'Robot s lijeve strane i sprijeda, malo odozgo — kao na fotografiji robota na stanici.',
  bocno: 'Pogled okomito na ravninu ruke: vide se osi J2, J3 i J4 i duljine članaka ' + OSI.length + '-osnog lanca.',
  saka: 'Šaka (nagib J4 i okret J5), prirubnica i motorna prihvatnica ' + PRIHVATNICA.oznaka + ' sa spiralnim kabelom.',
  podnozje: 'Podnožje straga: kutija priključaka s konektorima POWER i SIGNAL, kabeli prema DUM1 i spiralni kabeli uz struk.',
  rame: 'Kućište ramena straga: unutra su motori J2 i J3 s kočnicama (uključi „Unutrašnjost robota” ili rastavi os J2 ili J3).',
  dum1: 'Prednja ploča DUM1: ' + JEDINICA.prednja.join(', ') + '.',
  dum1Straga: 'Stražnja strana DUM1: utori kartica, hladnjak i mrežni modul.',
  dum1Bok: 'Bok DUM1 s bočnim vratima — gumbom „Otvori bočna vrata” vide se LED1–LED5 i preklopnici.',
  privjesak: 'Privjesak odozgo: preklopnik ON/OFF, EMG. STOP, zaslon i ' + (PRIVJESAK.tipke || []).length + ' tipki.',
  simrv: 'SIM RV odozgo: ' + (SIMRV_SIGNALI.ulazi || []).length + ' prekidača ulaza, ' + (SIMRV_SIGNALI.izlazi || []).length + ' LED-ica izlaza i signali rukovanja. Klik na prekidač prebacuje ulaz.'
};
$('pogledi').innerHTML = GUMBI_POGLEDA.map(([k, t]) => '<button type="button" class="gumb tanki" data-pogled="' + k + '">' + esc(t) + '</button>').join('');
const POGLED_SKUPINE = new Map([[SK.podnozje, 'robot'], [SK.rame, 'robot'], [SK.podlaktica, 'robot'], [SK.saka, 'saka'], [SK.pogoni, 'rame'], [SK.prihvatnica, 'saka'],
  [SK.kabeli, 'podnozje'], [SK.dumVan, 'dum1'], [SK.dumUn, 'dum1Bok'], [SK.privjesak, 'privjesak'], [SK.sim, 'simrv'], [SK.stanica, 'sustav']]);
let let_ = null;
function faktorOmjera() { return camera.aspect < 4 / 3 ? Math.pow((4 / 3) / camera.aspect, 0.75) : 1; }
function leti(poz, cilj, glatko = true) {
  if (!glatko) { let_ = null; camera.position.copy(poz); controls.target.copy(cilj); controls.update(); trazi(); return; }
  let_ = { t0: performance.now(), d: 850, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz.clone(), c1: cilj.clone() };
  trazi();
}
function kutija(id) {
  const b = new THREE.Box3(); let ok = false;
  objektiDijela(id).forEach((o) => { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); if (!bb.isEmpty()) { b.union(bb); ok = true; } });
  return ok ? b : null;
}
function kutijaVise(ids) { const b = new THREE.Box3(); let ok = false; ids.forEach((id) => { const k = kutija(id); if (k) { b.union(k); ok = true; } }); return ok ? b : null; }
function udaljenost(r) {
  const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
  return Math.max(0.4, r / Math.sin(Math.min(vf, hf) / 2) * 1.6);
}
function letiNaKutiju(b, smjer, k = 1) {
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.03, b.getSize(new THREE.Vector3()).length() / 2);
  leti(c.clone().add(smjer.clone().normalize().multiplyScalar(udaljenost(r) * k)), c);
}
function smjerPogleda(ime) { const p = POGLEDI[ime]; if (!p) return smjerPogleda('robot'); return Array.isArray(p) ? p[0].clone().sub(p[1]).normalize() : p.smjer.clone().normalize(); }
function pogled(ime, glatko = true) {
  const p = POGLEDI[ime] || POGLEDI.robot;
  if (!Array.isArray(p)) { const b = kutijaVise(p.dijelovi); if (b) { letiNaKutiju(b, p.smjer, p.k); return; } return pogled('robot', glatko); }
  const cilj = p[1].clone();
  leti(cilj.clone().add(p[0].clone().sub(p[1]).multiplyScalar(faktorOmjera())), cilj, glatko);
}
/* smjer pogleda na dio jedinice DUM1 iz položaja dijela prema središtu kutije: straga, bok s vratima ili sprijeda */
function smjerDUM1(c, d) {
  const rel = c.clone().sub(DUM_C);
  if (d && d.skupina === SK.dumUn) return smjerPogleda('dum1Bok');
  if (rel.x < -DUM_D * 0.3) return smjerPogleda('dum1Straga');
  if (rel.z > DUM_W * 0.4) return smjerPogleda('dum1Bok');
  return smjerPogleda('dum1');
}
function letiDoDijela(id) {
  const d = nadjiDio(id), b = kutija(id);
  const ime = POGLED_SKUPINE.get(d && d.skupina) || 'robot';
  const CIJELI = { robot: 'robot', dum1: 'dum1', kucisteDum1: 'dum1', privjesak: 'privjesak', simRv: 'simrv', kolicaMPS: 'sustav' };
  if (CIJELI[id]) { pogled(CIJELI[id]); return; }
  if (!b) { pogled(ime); return; }
  const c = b.getCenter(new THREE.Vector3());
  const m = modelDijela(id);
  let smjer;
  if (m && m.ime === 'dum1' && !R.dijelovi.has(id)) smjer = smjerDUM1(c, d);
  else if (m && (m.ime === 'privjesak' || m.ime === 'sim') && !D.dijelovi.has(id)) smjer = smjerPogleda(ime);
  else if (m && m.ime === 'stol') smjer = smjerPogleda('sustav');
  else {
    const h = new THREE.Vector3(c.x - M.x, 0, c.z - M.z), base = smjerPogleda(ime);
    smjer = h.length() > 0.06 ? h.normalize().add(base.multiplyScalar(0.8)).add(new THREE.Vector3(0, 0.3, 0)).normalize() : base;
  }
  letiNaKutiju(b, smjer, 1);
}

/* ================================================================== */
/* 4. Isticanje (preko svih modela; ostali modeli postanu poluprozirni) */
/* ================================================================== */
const duhC = new Map(), tipkaC = new Map();
const klonDuh = (m) => { let c = duhC.get(m.uuid); if (!c) { c = m.clone(); c.transparent = true; c.opacity = 0.1; c.depthWrite = false; if (c.emissive) c.emissive.setHex(0); duhC.set(m.uuid, c); } return c; };
const skriveni = new Set();
/* okvir oko odabranog dijela (vidi se i kroz poluprozirne ljuske) — pomaže kod sitnih dijelova */
const okvirDijela = new THREE.Box3Helper(new THREE.Box3(), 0x19b7c9);
okvirDijela.material.depthTest = false; okvirDijela.material.transparent = true; okvirDijela.material.opacity = 0.75; okvirDijela.renderOrder = 10; okvirDijela.visible = false;
okvirDijela.raycast = () => {}; scene.add(okvirDijela);
const BEZ_OKVIRA = new Set(['robot', 'dum1', 'kolicaMPS', 'profilnaPloca']);
function azurirajOkvir() {
  const id = st.akt;
  if (!id || BEZ_OKVIRA.has(id)) { okvirDijela.visible = false; return; }
  const b = kutija(id); if (!b) { okvirDijela.visible = false; return; }
  b.expandByScalar(0.004); okvirDijela.box.copy(b); okvirDijela.visible = true;
}
function primijeniIsticanje() {
  skriveni.forEach((o) => { o.visible = true; }); skriveni.clear();
  const id = st.akt;
  MODELI.forEach((m) => {
    if (id && m.dijelovi.has(id)) { m.istakni(id); return; }
    m.istakni(null);
    if (id) m.korijen.traverse((o) => { if (o.isMesh && o.userData.m0 && o.visible) o.material = Array.isArray(o.material) ? o.material.map(klonDuh) : klonDuh(o.material); });
  });
  /* odabrana tipka privjeska: jače istaknuta unutar skupine tipki */
  if (st.tipka && id && TIPKA_DIO.get(st.tipka) === id) {
    const k = PV.userData.tipke.get(st.tipka);
    if (k) k.material = (Array.isArray(k.material) ? k.material : [k.material]).map((mm) => { let c = tipkaC.get(mm.uuid); if (!c) { c = mm.clone(); c.transparent = false; c.opacity = 1; if (c.emissive) { c.emissive = new THREE.Color(0xff8a1f); c.emissiveIntensity = 0.9; } tipkaC.set(mm.uuid, c); } return c; });
  }
  if (id && st.samo) {
    const odabrani = new Set(); objektiDijela(id).forEach((o) => o.traverse((c) => { if (c.isMesh) odabrani.add(c); }));
    SVI.forEach((o) => { if (!odabrani.has(o) && o.visible) { o.visible = false; skriveni.add(o); } });
  }
  azurirajOkvir();
  trazi();
}

/* ================================================================== */
/* 5. Izbornik: pretraživanje, filtar skupine, stablo                  */
/* ================================================================== */
$('filtar').innerHTML += SKUPINE.map((s, i) => '<option value="' + i + '">' + esc(s) + ' (' + dijeloviSkupine(s).length + ')</option>').join('');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const TEKST_DIJELA = new Map(DIJELOVI.map((d) => [d.id, norm([d.naziv, d.opis, d.skupina, d.id, (d.podaci || []).map((r) => r.join(' ')).join(' ')].join(' '))]));
function odgovara(d) {
  if (st.filtar !== '' && d.skupina !== SKUPINE[+st.filtar]) return false;
  if (!st.trazi) return true;
  const t = TEKST_DIJELA.get(d.id);
  return norm(st.trazi).split(/\s+/).filter(Boolean).every((r) => t.indexOf(r) >= 0);
}
function crtajStablo() {
  let h = '', nadjeno = 0;
  const pretraga = !!st.trazi || st.filtar !== '';
  SKUPINE.forEach((sk, si) => {
    const sve = dijeloviSkupine(sk); if (!sve.length) return;
    const dio = sve.filter(odgovara); if (!dio.length) return;
    nadjeno += dio.length;
    const otv = pretraga || st.otvorene.has(sk), akt = st.skupina === sk && !st.akt;
    h += '<li class="r1"><button type="button" class="uz-st skupina' + (akt ? ' akt' : '') + '" data-sk="' + si + '" aria-expanded="' + otv + '"' + (akt ? ' aria-current="true"' : '') + '>' +
      '<span class="str" aria-hidden="true">' + (otv ? '▾' : '▸') + '</span><span class="t">' + esc(sk) + '</span><span class="br">' + (pretraga ? dio.length + ' od ' + sve.length : sve.filter((d) => vidjeni.has(d.id)).length + '/' + sve.length) + '</span></button></li>';
    if (!otv) return;
    dio.forEach((d) => {
      const a = st.akt === d.id, v = vidjeni.has(d.id);
      h += '<li class="r' + Math.min(4, 2 + (pretraga ? 0 : (DUBINA.get(d.id) || 0))) + '"><button type="button" class="uz-st' + (a ? ' akt' : '') + '" data-id="' + d.id + '"' + (a ? ' aria-current="true"' : '') + '>' +
        '<span class="ok" aria-hidden="true">' + (v ? '✓' : '') + '</span><span class="t">' + esc(d.naziv) + '</span>' +
        (d.pretpostavka ? '<span class="pp" title="sadrži pretpostavku" aria-hidden="true"></span>' : '') + (v ? '<span class="vh">(pregledano)</span>' : '') + '</button></li>';
    });
  });
  $('stablo').innerHTML = h || '<li class="uz-nema">Nijedan dio ne odgovara traženju.</li>';
  $('brojac').textContent = vidjeni.size + ' / ' + DIJELOVI.length;
  $('trazi-rez').textContent = pretraga ? 'Pronađeno dijelova: ' + nadjeno : '';
}
function pomakniUPopis() {
  const b = $('stablo').querySelector('.uz-st.akt'); if (!b) return;
  const c = $('stablo'), rb = b.getBoundingClientRect(), rc = c.getBoundingClientRect();
  if (rb.top < rc.top || rb.bottom > rc.bottom) c.scrollTop += rb.top - rc.top - rc.height / 3;
}
$('stablo').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.id) { odaberiDio(b.dataset.id); return; }
  const sk = SKUPINE[+b.dataset.sk];
  if (st.otvorene.has(sk) && st.skupina === sk && !st.akt && !st.trazi) { st.otvorene.delete(sk); crtajStablo(); return; }
  odaberiSkupinu(sk);
});
let traziT = 0;
$('trazi').addEventListener('input', () => { clearTimeout(traziT); traziT = setTimeout(() => { st.trazi = $('trazi').value.trim(); crtajStablo(); }, 120); });
$('trazi').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); st.trazi = $('trazi').value.trim(); crtajStablo(); const l = [...$('stablo').querySelectorAll('[data-id]')].map((x) => x.dataset.id); const q = norm(st.trazi);
    const naj = l.find((id) => norm(naziv(id)).indexOf(q) >= 0 || norm(id).indexOf(q) >= 0) || l[0]; if (naj) odaberiDio(naj); }
  if (e.key === 'Escape') { $('trazi').value = ''; st.trazi = ''; crtajStablo(); }
});
$('filtar').addEventListener('change', () => { st.filtar = $('filtar').value; crtajStablo(); if (st.filtar !== '') odaberiSkupinu(SKUPINE[+st.filtar]); });

/* ================================================================== */
/* 6. Kartica dijela                                                  */
/* ================================================================== */
function izvoriHtml(d) {
  const l = izvoriDijela(d); if (!l.length) return '';
  return 'Izvor: ' + l.map((x) => x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" title="' + esc(x.naziv) + ' (nova kartica)">' + esc(x.kratica) + '</a>' : '<a href="#izvor-' + esc(x.kratica) + '" title="' + esc(x.naziv) + '">' + esc(x.kratica) + '</a>').join(', ') +
    ' <span class="uz-vh">(vanjski izvori otvaraju se u novoj kartici)</span> · <a href="#izvor-' + esc(l[0].kratica) + '">popis izvora</a>';
}
/* teme „Kako radi” (teme_rvm1.js se uvozi dinamički; dok ga nema, gumbi se ne prikazuju) */
let TM = null;
const temaNaslov = (k) => (TM && TM.TEME && TM.TEME[k] && TM.TEME[k].naslov) || (TEME_POPIS.find((t) => t.id === k) || {}).naslov || k;
const temeKljucevi = () => (TM && TM.TEME ? (Array.isArray(TM.TEME) ? TM.TEME.map((t) => t.id) : Object.keys(TM.TEME)) : TEME_POPIS.map((t) => t.id));
const imaTemu = (k) => !!(k && TM && typeof TM.prikazi === 'function' && (!TM.TEME || TM.TEME[k]));
function temaGumbi(kljucevi) {
  const k = [...new Set(kljucevi.filter(imaTemu))];
  $('k-tema-g').innerHTML = k.map((x) => '<button type="button" class="gumb" data-tema="' + esc(x) + '">Kako radi: ' + esc(temaNaslov(x)) + '</button>').join('');
  $('k-tema-g').hidden = !k.length;
}
function cipovi(naslov, ids) {
  return ids.length ? '<p class="uz-dj-n">' + esc(naslov) + '</p><ul class="uz-dj">' + ids.map((id) => '<li><button type="button" class="cip" data-skok="' + id + '">' + esc(naziv(id)) + '</button></li>').join('') + '</ul>' : '';
}
const gumbR = (radnja, tekst, dod = '') => '<button type="button" class="gumb tanki" data-radnja="' + radnja + '"' + dod + '>' + tekst + '</button>';
const pritisnut = (v) => ' aria-pressed="' + !!v + '"';
function ledPogreske(id) { const m = String(id).match(/^led(\d)$/); return m ? (POGRESKE.I || []).find((x) => x.led === 'LED' + m[1]) : null; }
function radnje(d) {
  const g = [];
  if (d) {
    const i = OS_DIJELA.has(d.id) ? OS_DIJELA.get(d.id) : -1;
    if (i >= 0) g.push(gumbR('os', (st.osCilj[i] ? 'Sklopi os ' : 'Rastavi os ') + esc(OSI[i].ime), ' data-os="' + i + '"' + pritisnut(st.osCilj[i] === 1)));
    if (SKUPINE_ROBOTA.has(d.skupina) || d.id === 'robot') g.push(gumbR('unutra', st.unutra ? 'Sakrij unutrašnjost' : 'Prikaži unutrašnjost', pritisnut(st.unutra)));
    if (d.skupina === SK.prihvatnica || d.id === 'tipkeOC' || d.id === 'preklopnikHand') g.push(gumbR('prsti', st.prstiCilj ? 'Zatvori prihvatnicu' : 'Otvori prihvatnicu'));
    if (SKUPINE_DUM.has(d.skupina)) { g.push(gumbR('vrata', st.vrataCilj ? 'Zatvori bočna vrata' : 'Otvori bočna vrata', pritisnut(st.vrataCilj === 1))); g.push(gumbR('dumUnutra', st.dumUnutra ? 'Sakrij unutrašnjost DUM1' : 'DUM1 iznutra', pritisnut(st.dumUnutra))); }
    const lp = ledPogreske(d.id); if (lp) g.push(gumbR('greska', 'Pokaži pogrešku ' + esc(lp.led), ' data-led="' + esc(lp.led) + '"'));
    if (d.skupina === SK.privjesak) { g.push(gumbR('pogled', 'Privjesak odozgo', ' data-pogled="privjesak"')); g.push(gumbR('odjeljak', 'Pregled tipki', ' data-odj="privjesak"')); }
    if (d.skupina === SK.sim || d.id === 'ioKartica' || d.id === 'prikljucakIO') { g.push(gumbR('pogled', 'SIM RV odozgo', ' data-pogled="simrv"')); g.push(gumbR('odjeljak', 'Ulazi i izlazi', ' data-odj="simrv"')); }
    if (d.tema === 'ik-5-osi' && d.id !== 'robot' && d.skupina !== SK.pogoni) g.push(gumbR('pomocni', st.pomocni.osi ? 'Sakrij osi zglobova' : 'Prikaži osi zglobova', ' data-k="osi"'));
    if (d.tema === 'alat-tl') g.push(gumbR('pomocni', st.pomocni.okviri ? 'Sakrij okvire i TCP' : 'Prikaži okvire i TCP', ' data-k="okviri"'));
    if (d.id === 'robot' || d.id === 'struk' || d.id === 'lezajJ1' || d.id === 'granicnikJ1') g.push(gumbR('pomocni', st.pomocni.radni ? 'Sakrij radni prostor' : 'Prikaži radni prostor', ' data-k="radni"'));
    if (d.id === 'robot' || d.id === 'osRamena' || d.id === 'osLakta' || d.id === 'osNagiba') g.push(gumbR('odjeljak', 'Građa i kinematika', ' data-odj="gradja"'));
    if (d.skupina === SK.pogoni) g.push(gumbR('odjeljak', 'Pogoni po osima', ' data-odj="pogoni"'));
    if (d.tema === 'pogreske' && !lp) g.push(gumbR('odjeljak', 'Sigurnost i pogreške', ' data-odj="sigurnost"'));
  }
  $('k-radnje').innerHTML = g.join(''); $('k-radnje').hidden = !g.length;
}
function karticaUvod() {
  $('k-naziv').textContent = 'Upoznavanje robota';
  $('k-skupina').textContent = DIJELOVI.length + ' dijelova u ' + SKUPINE.length + ' skupina';
  $('k-tekst').innerHTML = P_('U izborniku odaberi skupinu pa dio, potraži dio po nazivu — ili klikni dio na modelu. Model se okrene prema odabranom dijelu i istakne ga, a ovdje dobiješ opis, podatke i izvor.',
    'Narančasta točka u izborniku označava dio kod kojeg je nešto procijenjeno (vidi odjeljak „Što je pretpostavka”). Uz pregledani dio pojavi se kvačica.',
    'Prikazana je inačica: I/O kartica ' + esc(KONFIG.ioKartica) + ', prihvatnica ' + esc(KONFIG.prihvatnica || 'bez prihvatnice') + (KONFIG.privjesak ? ', s privjeskom' : '') + (KONFIG.simRV ? ' i simulatorom SIM RV' : '') + '.');
  $('k-podaci').hidden = true; $('k-izvor').hidden = true; $('k-pretp').innerHTML = '';
  temaGumbi([]); radnje(null);
  $('k-djeca').innerHTML = '<p class="uz-dj-n">Skupine:</p><ul class="uz-dj">' + SKUPINE.map((s, i) => '<li><button type="button" class="cip" data-skup="' + i + '">' + esc(s) + '</button></li>').join('') + '</ul>';
  $('k-prije').disabled = true; $('k-dalje').disabled = false;
  $('naslov-3d').textContent = 'Robot ' + NAZIV_ROBOTA;
}
function karticaDio(d) {
  $('k-naziv').textContent = d.naziv;
  const rod = RODITELJ.get(d.id);
  $('k-skupina').textContent = d.skupina + (rod ? ' · ' + naziv(rod) : '');
  $('k-tekst').innerHTML = P_(esc(d.opis));
  const pod = d.podaci || [];
  $('k-podaci').innerHTML = pod.map(([o, v]) => '<dt>' + esc(o) + '</dt><dd>' + esc(v) + '</dd>').join('');
  $('k-podaci').hidden = !pod.length;
  $('k-pretp').innerHTML = d.pretpostavka ? '<p class="uz-pretp"><b>Pretpostavka:</b> ' + esc(d.napomena || 'dio podataka ili izgleda je procijenjen.') + '</p>' : (d.napomena ? '<p class="uz-pretp"><b>Napomena:</b> ' + esc(d.napomena) + '</p>' : '');
  obradiOznake($('k-pretp'));
  const iz = izvoriHtml(d); $('k-izvor').innerHTML = iz; $('k-izvor').hidden = !iz;
  temaGumbi([d.tema]); radnje(d);
  const dj = djeca(d.id).map((x) => x.id);
  const i = OS_DIJELA.has(d.id) ? OS_DIJELA.get(d.id) : -1;
  const srodni = i >= 0 ? OS_DIJELOVI[i].filter((x) => x !== d.id) : [];
  const istaTema = d.tema ? DIJELOVI.filter((x) => x.tema === d.tema && x.id !== d.id && x.skupina !== d.skupina).slice(0, 6).map((x) => x.id) : [];
  $('k-djeca').innerHTML = (dj.length ? cipovi('Dijelovi ovog sklopa:', dj) : '') + (rod ? cipovi('Sklop:', [rod]) : '') + (srodni.length ? cipovi('Ostali dijelovi pogona osi ' + OSI[i].ime + ':', srodni) : '') +
    (istaTema.length ? cipovi('Povezano (' + temaNaslov(d.tema) + '):', istaTema) : '');
  const k = INDEKS.get(d.id); $('k-prije').disabled = false; $('k-dalje').disabled = k === DIJELOVI.length - 1;
  $('naslov-3d').textContent = d.naziv;
}
function karticaSkupina(sk) {
  const dio = dijeloviSkupine(sk);
  $('k-naziv').textContent = sk;
  $('k-skupina').textContent = 'Skupina · ' + dio.length + ' dijelova';
  $('k-tekst').innerHTML = P_('Odaberi dio skupine u izborniku ili ispod. Skupina se u izborniku otvara i zatvara klikom na njezin naziv.');
  $('k-podaci').hidden = true; $('k-izvor').hidden = true;
  const pp = dio.filter((d) => d.pretpostavka).length;
  $('k-pretp').innerHTML = pp ? '<p class="uz-pretp"><b>Pretpostavke:</b> ' + pp + ' od ' + dio.length + ' dijelova ove skupine sadrži procijenjeni podatak ili izgled.</p>' : '';
  temaGumbi(dio.map((d) => d.tema)); radnje(SKUPINE_DUM.has(sk) || sk === SK.prihvatnica || sk === SK.privjesak || sk === SK.sim ? dio[0] : null);
  $('k-djeca').innerHTML = cipovi('Dijelovi u ovoj skupini:', dio.map((d) => d.id));
  $('k-prije').disabled = false; $('k-dalje').disabled = false;
  $('naslov-3d').textContent = sk;
}
const opis = (t) => { $('z-opis').textContent = t; };
function odaberiDio(id, opc = {}) {
  const d = nadjiDio(id); if (!d) return;
  st.akt = id; st.skupina = d.skupina; st.otvorene.add(d.skupina);
  if (!opc.tipka) st.tipka = null;
  vidjeni.add(id); spremi();
  karticaDio(d); crtajStablo(); pomakniUPopis();
  primijeniIsticanje();
  if (opc.let !== false) letiDoDijela(id);
}
function odaberiSkupinu(sk, opc = {}) {
  st.akt = null; st.skupina = sk; st.otvorene.add(sk); st.tipka = null;
  karticaSkupina(sk); crtajStablo(); primijeniIsticanje();
  if (opc.let !== false) pogled(POGLED_SKUPINE.get(sk) || 'robot');
}
function cijeliSustav() {
  if (!st.akt) return;
  st.akt = null; st.tipka = null;
  if (st.skupina) karticaSkupina(st.skupina); else karticaUvod();
  crtajStablo(); primijeniIsticanje();
}
function osvjeziRadnje() { if (st.akt) radnje(nadjiDio(st.akt)); else if (st.skupina) karticaSkupina(st.skupina); }
function osvjeziKarticu() { if (st.akt) karticaDio(nadjiDio(st.akt)); else if (st.skupina) karticaSkupina(st.skupina); else karticaUvod(); }
$('k-prije').addEventListener('click', () => {
  if (st.akt) { const i = INDEKS.get(st.akt); if (i > 0) odaberiDio(DIJELOVI[i - 1].id); else { st.akt = null; st.skupina = null; karticaUvod(); crtajStablo(); primijeniIsticanje(); pogled('robot'); } }
  else if (st.skupina) { const prvi = dijeloviSkupine(st.skupina)[0]; const i = INDEKS.get(prvi.id); if (i > 0) odaberiDio(DIJELOVI[i - 1].id); else { st.skupina = null; karticaUvod(); crtajStablo(); pogled('robot'); } }
});
$('k-dalje').addEventListener('click', () => {
  if (st.akt) { const i = INDEKS.get(st.akt); if (i < DIJELOVI.length - 1) odaberiDio(DIJELOVI[i + 1].id); }
  else if (st.skupina) odaberiDio(dijeloviSkupine(st.skupina)[0].id);
  else odaberiDio(DIJELOVI[0].id);
});
function otvoriOdjeljak(id) { const el = $(id); if (!el) return; if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
$('kartica').addEventListener('click', (e) => {
  const s = e.target.closest('[data-skok]'); if (s) { odaberiDio(s.dataset.skok); return; }
  const g = e.target.closest('[data-skup]'); if (g) { odaberiSkupinu(SKUPINE[+g.dataset.skup]); return; }
  const t = e.target.closest('[data-tema]'); if (t) { otvoriTemu(t.dataset.tema, t); return; }
  const r = e.target.closest('[data-radnja]'); if (!r) return;
  const v = r.dataset.radnja;
  if (v === 'os') prebaciOs(+r.dataset.os, false);
  else if (v === 'unutra') { postaviUnutra(!st.unutra); osvjeziRadnje(); }
  else if (v === 'prsti') prebaciPrste();
  else if (v === 'vrata') prebaciVrata(false);
  else if (v === 'dumUnutra') prebaciDumUnutra(false);
  else if (v === 'greska') pokaziPogreskuI(r.dataset.led, false);
  else if (v === 'pogled') pogled(r.dataset.pogled);
  else if (v === 'odjeljak') otvoriOdjeljak(r.dataset.odj);
  else if (v === 'pomocni') { const k = r.dataset.k, el = $('p-' + k); el.checked = !st.pomocni[k]; el.dispatchEvent(new Event('change')); }
});

/* ================================================================== */
/* 7. „Kako radi” — animacije iz teme_rvm1.js u dijalogu               */
/* ================================================================== */
function podaciZaTeme() {
  /* teme_rvm1.js čita iste podatke (rvm1_podaci.js); stranica predaje sve izvezene vrijednosti i kinematiku,
     pa teme i stranica uvijek koriste iste brojeve (i nakon promjene KONFIG-a) */
  return Object.assign({}, P, { KIN });
}
let tema = null, povratak = null;
function unistiTemu() { if (tema && tema.unisti) { try { tema.unisti(); } catch (e) { /* ništa */ } } tema = null; $('tema-el').innerHTML = ''; }
function otvoriTemu(kljuc, izvor) {
  if (!imaTemu(kljuc)) return;
  unistiTemu(); povratak = izvor || null;
  if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
  $('tema-naslov').textContent = 'Kako radi: ' + temaNaslov(kljuc);
  dlg.dataset.tema = kljuc;
  const kut = document.createElement('div'); kut.className = 'uz-tema-kut'; $('tema-el').appendChild(kut);
  try { tema = TM.prikazi(kut, kljuc) || null; } catch (e) { console.warn('Tema', kljuc, e); $('tema-el').innerHTML = '<p class="pom">Animacija „Kako radi” trenutačno nije dostupna.</p>'; tema = null; }
  dlg.scrollTop = 0;
}
function zatvoriTemu() { if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); } naZatvaranje(); }
function naZatvaranje() {
  if (!dlg.dataset.tema && !tema) return;
  unistiTemu(); delete dlg.dataset.tema; if (povratak && document.contains(povratak)) povratak.focus(); povratak = null; trazi();
}
dlg.addEventListener('close', naZatvaranje);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dlg.open) { e.preventDefault(); zatvoriTemu(); } });
$('tema-zatvori').addEventListener('click', zatvoriTemu);
dlg.addEventListener('click', (e) => { if (e.target === dlg) zatvoriTemu(); });
function crtajTeme() {
  const kljucevi = temeKljucevi();
  const ima = !!(TM && typeof TM.prikazi === 'function');
  $('teme-popis').innerHTML = kljucevi.map((k) => {
    const dio = DIJELOVI.filter((d) => d.tema === k);
    const imena = [...new Set(dio.map((d) => osnovnoIme(d.naziv)))];
    const engl = TM && TM.TEME && TM.TEME[k] && (TM.TEME[k].engl || TM.TEME[k].kratko);
    return '<li><button type="button" data-tema="' + esc(k) + '"' + (imaTemu(k) ? '' : ' disabled aria-disabled="true"') + '><b>' + esc(temaNaslov(k)) + '</b>' + (engl ? '<span class="e">' + esc(engl) + '</span>' : '') +
      '<span class="d">' + (imena.length ? 'Dijelovi: ' + esc(imena.slice(0, 4).join(', ')) + (imena.length > 4 ? ' i još ' + (imena.length - 4) : '') : 'Opća tema (naredbe)') + '</span>' + (imaTemu(k) ? '' : '<span class="d uz-prip">u pripremi</span>') + '</button></li>';
  }).join('');
  $('teme-broj').textContent = kljucevi.length + ' animacija';
  $('teme-uvod').textContent = ima ? 'Svaka animacija objašnjava načelo rada jednog sklopa ili postupka. Otvori je ovdje ili gumbom „Kako radi” uz odabrani dio; ispod naslova su dijelovi na koje se odnosi.'
    : 'Animacije „Kako radi” se pripremaju; popis tema i dijelova na koje se odnose već je ovdje.';
}
$('teme-popis').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if (b && !b.disabled) otvoriTemu(b.dataset.tema, b); });

/* ================================================================== */
/* 8. Miš u 3D: oblačić, klik, prekidači SIM RV                        */
/* ================================================================== */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
const oblacic = $('oblacic');
function vidljivo(o) { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; }
function pogodak(x, y) {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const h = ray.intersectObjects(SVI.filter((o) => o.userData.dioId && vidljivo(o)), false); if (!h.length) return null;
  const proz = (o) => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return m && m.transparent && m.opacity < 0.45; };
  const prvi = h.find((p) => !proz(p.object)) || h[0];
  let ulaz = null, signal = null; let p = prvi.object;
  while (p && ulaz === null && signal === null) { if (p.userData.ulaz !== undefined) ulaz = p.userData.ulaz; if (p.userData.signal) signal = p.userData.signal; p = p.parent; }
  return { id: prvi.object.userData.dioId, x: x - r.left, y: y - r.top, ulaz, signal };
}
let zadnjiHover = 0, dolje = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y) > 4) { oblacic.hidden = true; return; }
  if (e.pointerType === 'touch') return;
  const t = performance.now(); if (t - zadnjiHover < 70) return; zadnjiHover = t;
  const p = pogodak(e.clientX, e.clientY);
  if (!p) { oblacic.hidden = true; renderer.domElement.style.cursor = ''; return; }
  oblacic.textContent = naziv(p.id) + (p.ulaz !== null ? ' — ulaz ' + p.ulaz + ' (klik prebacuje)' : p.signal ? ' — ' + p.signal + ' (klik prebacuje)' : ''); oblacic.hidden = false;
  const w = scenaEl.clientWidth; oblacic.style.left = Math.max(4, Math.min(p.x + 14, w - oblacic.offsetWidth - 6)) + 'px'; oblacic.style.top = Math.max(4, p.y - 34) + 'px';
  renderer.domElement.style.cursor = 'pointer';
});
renderer.domElement.addEventListener('pointerleave', () => { oblacic.hidden = true; });
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dolje) return; const pomak = Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y); dolje = null;
  if (pomak > 5) return;
  const p = pogodak(e.clientX, e.clientY); if (!p) return;
  oblacic.hidden = true;
  if (p.ulaz !== null) { postaviUlaz(p.ulaz, !io.ulazi[p.ulaz]); odaberiDio(p.id, { let: false }); return; }
  if (p.signal) { postaviSignalSim(p.signal, !io.sig[p.signal]); odaberiDio(p.id, { let: false }); return; }
  odaberiDio(p.id);
});

/* ================================================================== */
/* 9. Pogledi, rastavljanje, unutrašnjost, osi, DUM1                    */
/* ================================================================== */
document.querySelectorAll('#pogledi [data-pogled]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.pogled;
  if (k === 'dum1Bok' && !st.vrataCilj) prebaciVrata(false, false);
  pogled(k); opis(OPIS_POGLEDA[k] || '');
}));
const klizac = $('r-rastavi');
function postaviRastav(v) {
  st.rastav = Math.max(0, Math.min(1, v)); R.rastavi(st.rastav);
  klizac.value = String(Math.round(st.rastav * 100)); $('r-rastavi-v').textContent = Math.round(st.rastav * 100) + ' %';
  if (okvirDijela.visible) azurirajOkvir(); trazi();
}
klizac.addEventListener('input', () => {
  const prije = st.rastav; postaviRastav(+klizac.value / 100);
  if (prije === 0 && st.rastav > 0) { cijeliSustav(); opis('Robot se rastavlja: struk se diže iz ležaja, ruka izlazi iz kućišta ramena, podlaktica se odmiče duž nadlaktice, a šaka, prirubnica i prihvatnica duž osi alata.'); }
});
klizac.addEventListener('change', () => { if (st.rastav > 0.5 && !st.akt) pogled('rastavljen'); });
function postaviUnutra(v) { st.unutra = !!v; R.unutrasnjost(st.unutra); $('r-unutra').setAttribute('aria-pressed', String(st.unutra)); primijeniIsticanje(); }
$('r-unutra').addEventListener('click', () => {
  postaviUnutra(!st.unutra);
  if (st.unutra) { cijeliSustav(); pogled('rame'); opis('Ljuske robota su poluprozirne: vide se motori J1–J5 s enkoderima, kočnice J2 i J3, zupčasti remeni i remenice, granični prekidači ishodišta, prijenosi J1 i J5 i mehanizam prihvatnice. Smještaj pogona je načelan (pretpostavka).'); }
  else opis('Ljuske robota ponovno su neprozirne.');
  osvjeziRadnje();
});
$('r-samo').addEventListener('change', () => { st.samo = $('r-samo').checked; primijeniIsticanje(); if (st.samo && st.akt) letiDoDijela(st.akt); });
$('os-gumbi').innerHTML = OSI.map((o, i) => '<button type="button" class="gumb tanki" data-os="' + i + '" aria-pressed="false" aria-label="Rastavi os ' + esc(o.ime) + ' (' + esc(o.naziv) + ')">' + esc(o.ime) + '</button>').join('');
function oznaciOsi() { document.querySelectorAll('#os-gumbi [data-os]').forEach((b) => b.setAttribute('aria-pressed', String(st.osCilj[+b.dataset.os] === 1))); }
function letiDoOsi(i) {
  const t0 = st.osT[i]; R.rastaviOs(i, 1);
  const b = kutijaVise(OS_DIJELOVI[i]); R.rastaviOs(i, ease(t0));
  if (!b) return;
  const c = b.getCenter(new THREE.Vector3()), base = smjerPogleda(i === 0 ? 'robot' : 'rame');
  const h = new THREE.Vector3(c.x - M.x, 0, c.z - M.z);
  const smjer = h.length() > 0.06 ? h.normalize().multiplyScalar(0.6).add(base) : base;
  letiNaKutiju(b, smjer.add(new THREE.Vector3(0, 0.15, 0)), 1.4);
}
function prebaciOs(i, sKamerom = true) {
  st.osCilj[i] = st.osCilj[i] ? 0 : 1; oznaciOsi();
  const o = OSI[i];
  if (st.osCilj[i]) {
    if (sKamerom && (st.akt || st.skupina !== SK.pogoni)) odaberiSkupinu(SK.pogoni, { let: false });
    letiDoOsi(i);
    const sastav = OS_DIJELOVI[i].map((id) => osnovnoIme(naziv(id)).toLowerCase());
    opis('Pogon osi ' + o.ime + ' (' + o.naziv + ', ' + o.motorW + ' W) izvlači se iz ljuske: ' + sastav.join(', ') + '. Prijenos: ' + o.prijenos + (o.kocnica ? '; os ima kočnicu' : '; os nema kočnicu') + '. Ljuske te osi postaju prozirne.');
  } else opis('Pogon osi ' + o.ime + ' vraća se na mjesto.');
  osvjeziRadnje(); trazi();
}
$('os-gumbi').addEventListener('click', (e) => { const b = e.target.closest('[data-os]'); if (b) prebaciOs(+b.dataset.os); });
/* DUM1: bočna vrata i unutrašnjost */
function oznaciVrata() { $('d-vrata').setAttribute('aria-pressed', String(st.vrataCilj === 1)); $('d-vrata').textContent = st.vrataCilj ? 'Zatvori bočna vrata' : 'Otvori bočna vrata'; }
function prebaciVrata(sKamerom = true, sPogledom = true) {
  st.vrataCilj = st.vrataCilj ? 0 : 1; oznaciVrata();
  if (st.vrataCilj) {
    if (sKamerom && (st.akt || st.skupina !== SK.dumUn)) odaberiSkupinu(SK.dumUn, { let: false });
    if (sPogledom) pogled('dum1Bok');
    opis(DUM1_PLOCA.bocnaVrata);
  } else opis('Bočna vrata DUM1 se zatvaraju.');
  osvjeziRadnje(); trazi();
}
$('d-vrata').addEventListener('click', () => prebaciVrata());
function prebaciDumUnutra(sKamerom = true) {
  st.dumUnutra = !st.dumUnutra; D.unutrasnjost(st.dumUnutra); $('d-unutra').setAttribute('aria-pressed', String(st.dumUnutra));
  if (st.dumUnutra) { if (sKamerom) { cijeliSustav(); pogled('dum1'); } opis('Kućište DUM1 je poluprozirno: transformator i napajanje, servo pojačala, procesorska kartica, memorija s EPROM-om i baterijom te I/O kartica (načelan raspored — pretpostavka).'); }
  else opis('Kućište DUM1 ponovno je neprozirno.');
  primijeniIsticanje(); osvjeziRadnje();
}
$('d-unutra').addEventListener('click', () => prebaciDumUnutra());

/* ================================================================== */
/* 10. Prihvatnica, alat TL, pomoćni prikazi                           */
/* ================================================================== */
function oznaciPrste() { $('t-prsti').setAttribute('aria-pressed', String(st.prstiCilj > 0)); $('t-prsti').textContent = st.prstiCilj ? 'Zatvori prihvatnicu' : 'Otvori prihvatnicu'; }
function prebaciPrste() {
  st.prstiCilj = st.prstiCilj ? 0 : 1; oznaciPrste();
  const g = PRIHVATNICA.gp || {};
  opis(st.prstiCilj ? 'Prihvatnica se otvara (naredba GO; tipka ◄O► na privjesku) — hod prstiju do ' + PRIHVATNICA.hodMm + ' mm.'
    : 'Prihvatnica se zatvara (naredba GC; tipka ►C◄): najprije stišće početnom silom, zatim drži silom držanja (naredba GP, ' + PRIHVATNICA.stupnjevaSile + ' stupnjeva sile; zadano ' + (Array.isArray(g.zadano) ? g.zadano.join(', ') : '') + ').');
  ocitanje(); osvjeziRadnje(); trazi();
}
$('t-prsti').addEventListener('click', prebaciPrste);
const tlK = $('r-tl'); tlK.min = String(TL_ARG.min ?? 0); tlK.max = String(TL_ARG.max ?? 300); tlK.value = String(TL_ZADANO);
function postaviTL(mm) { st.tl = Math.max(0, mm) / 1000; R.postaviTL(st.tl); tlK.value = String(Math.round(mm)); $('r-tl-v').textContent = br(mm, 0) + ' mm'; ocitanje(); trazi(); }
tlK.addEventListener('input', () => { postaviTL(+tlK.value); opis('Duljina alata TL = ' + br(+tlK.value, 0) + ' mm (naredba TL; zadano ' + TL_ZADANO + ' mm za motornu prihvatnicu). Mijenja se samo točka TCP — prihvatnica ostaje ista; uključi „okviri i TCP” da vidiš pomak.'); });
const POMOCNI = [['p-osi', 'osi', (v) => R.pomocni.osi(v), 'Narančaste osi zglobova J1–J5 sa strelicom u pozitivnom smjeru vrtnje (naša konvencija, pretpostavka).'],
  ['p-okviri', 'okviri', (v) => R.pomocni.okviri(v), 'Koordinatni okviri 0–5 (baza, rame, lakat, os nagiba, prirubnica, TCP; crveno X, zeleno Y, plavo Z) — isti lanac računa očitanje ispod.'],
  ['p-radni', 'radni', (v) => R.pomocni.radniProstor(v), 'Obris dosega točke šake u ravnini ruke (granice J2 ' + OSI[1].minDeg + '…' + OSI[1].maxDeg + '° i J3 ' + OSI[2].minDeg + '…' + OSI[2].maxDeg + '°) i luk J1 ±' + OSI[0].maxDeg + '° na podlozi.']];
POMOCNI.forEach(([id, k, f, t]) => $(id).addEventListener('change', () => {
  st.pomocni[k] = $(id).checked; f(st.pomocni[k]);
  if (st.pomocni[k]) { opis(t); if (k === 'radni') pogled('odozgo'); else if (k === 'okviri') pogled('bocno'); }
  osvjeziRadnje(); primijeniIsticanje();
}));

/* ================================================================== */
/* 11. Osi: klizači, položaji, izravna kinematika uživo                */
/* ================================================================== */
$('klizaci').innerHTML = OSI.map((o, i) => '<div class="uz-kl"><label for="q-' + i + '" title="' + esc(o.naziv) + '">' + esc(o.ime) + '<small>' + esc(o.oznaka) + '</small></label>' +
  '<input type="range" id="q-' + i + '" min="' + o.minDeg + '" max="' + o.maxDeg + '" step="0.5" value="0" aria-describedby="q-' + i + '-v q-' + i + '-n" aria-label="Kut osi ' + esc(o.ime) + ', ' + esc(o.naziv) + '">' +
  '<output id="q-' + i + '-v" for="q-' + i + '">0°</output><small id="q-' + i + '-n"><span>' + esc(o.naziv) + '</span><span>' + br(o.minDeg, 0) + '° … ' + (o.maxDeg > 0 ? '+' : '') + br(o.maxDeg, 0) + '°</span></small></div>').join('');
const KL = OSI.map((o, i) => $('q-' + i));
function azurirajKlizace() { KL.forEach((k, i) => { const d = uStupnjeve(st.q[i]); k.value = String(Math.round(d * 2) / 2); $('q-' + i + '-v').textContent = brZ(d, 1) + '°'; }); }
const FO = (FORMAT_ODGOVORA && FORMAT_ODGOVORA.pozicija) || { decimale: 1, razdjelnik: ',' };
const robotBroj = (v) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(FO.decimale ?? 1);
function ocitanje() {
  const t = KIN.uTocku(st.q, st.tl, OC());
  const f = KIN.fk(st.q, st.tl);
  const c = (o, v, j) => '<div><dt>' + o + '</dt><dd>' + v + '</dd></div>';
  const wh = [t.x, t.y, t.z, t.p, t.r].map(robotBroj).join(FO.razdjelnik ?? ',');
  const sk = f.sake || [0, 0, 0];
  $('ocitanje').innerHTML = '<p class="uz-ocit-h">Vrh alata (TCP) u KS robota · mm i °</p><dl class="uz-xyz">' + c('X', brF(t.x, 1)) + c('Y', brF(t.y, 1)) + c('Z', brF(t.z, 1)) + c('P', brF(t.p, 1) + '°') + c('R', brF(t.r, 1) + '°') + c('O/C', t.oc) + '</dl>' +
    '<p class="uz-ocit-st">Točka šake (os J4): X ' + brF(sk[0] * 1000, 1) + ' · Y ' + brF(sk[1] * 1000, 1) + ' · Z ' + brF(sk[2] * 1000, 1) + ' mm · TL ' + br(st.tl * 1000, 0) + ' mm</p>' +
    '<p class="uz-ocit-st">Odgovor na <code>WH</code> (zapis je pretpostavka): <code class="uz-wh">' + esc(wh) + '</code></p>';
  crtajShemu();
}
function crtajShemu() {
  const svg = $('shema'); if (!svg) return;
  const f = KIN.fk(st.q, st.tl), j1 = st.q[0], az = (KONFIG.smjerJ1 === 'cw' ? -1 : 1) * j1;
  const ok = f.okviri || [];
  const tr = (T) => [T[3], T[7], T[11]];
  const uRavninu = (p) => [p[0] * Math.cos(az) + p[1] * Math.sin(az), p[2]];
  const pts = [[0, 0], [0, MJERE.d1]].concat(ok.slice(2).map((T) => uRavninu(tr(T))));
  const W = 420, H = 300, r0 = -0.32, r1 = 0.78, z0 = -0.04, z1 = 0.78, sk = Math.min((W - 30) / (r1 - r0), (H - 24) / (z1 - z0));
  const X = (r) => 15 + (r - r0) * sk, Y = (z) => H - 12 - (z - z0) * sk;
  const obris = KIN.obrisRadnogProstora(36).map(([r, z]) => X(r).toFixed(1) + ',' + Y(z).toFixed(1)).join(' ');
  const obrisN = KIN.obrisRadnogProstora(36).map(([r, z]) => X(-r).toFixed(1) + ',' + Y(z).toFixed(1)).join(' ');
  const lin = pts.map(([r, z]) => X(r).toFixed(1) + ',' + Y(z).toFixed(1)).join(' ');
  const zgl = pts.slice(1, 4).map(([r, z], i) => '<circle cx="' + X(r).toFixed(1) + '" cy="' + Y(z).toFixed(1) + '" r="' + (i === 2 ? 4.5 : 6) + '" class="sh-zg"/>').join('');
  const tcp = pts[pts.length - 1], sak = pts[3] || pts[pts.length - 1], pri = pts[4] || tcp;
  const ozn = (a, b, t) => { const mx = (X(a[0]) + X(b[0])) / 2, my = (Y(a[1]) + Y(b[1])) / 2; return '<text x="' + (mx + 6).toFixed(1) + '" y="' + (my - 4).toFixed(1) + '" class="sh-t">' + t + '</text>'; };
  svg.innerHTML = '<title id="shema-opis">Shema ruke u okomitoj ravnini kroz os struka, prema trenutnim kutovima osi</title>' +
    '<polygon points="' + obris + '" class="sh-rp"/><polygon points="' + obrisN + '" class="sh-rp sh-rp2"/>' +
    '<line x1="0" y1="' + Y(0).toFixed(1) + '" x2="' + W + '" y2="' + Y(0).toFixed(1) + '" class="sh-pod"/>' +
    '<line x1="' + X(0).toFixed(1) + '" y1="4" x2="' + X(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" class="sh-os"/>' +
    '<rect x="' + (X(0) - 16).toFixed(1) + '" y="' + Y(MJERE.d1 - 0.1).toFixed(1) + '" width="32" height="' + (Y(0) - Y(MJERE.d1 - 0.1)).toFixed(1) + '" class="sh-baza"/>' +
    '<polyline points="' + lin + '" class="sh-ruka"/>' + zgl +
    '<circle cx="' + X(tcp[0]).toFixed(1) + '" cy="' + Y(tcp[1]).toFixed(1) + '" r="4" class="sh-tcp"/>' +
    ozn(pts[0], pts[1], 'd1 ' + br(MJERE.d1 * 1000, 0)) + ozn(pts[1], pts[2], 'L2 ' + br(MJERE.L2 * 1000, 0)) + ozn(pts[2], sak, 'L3 ' + br(MJERE.L3 * 1000, 0)) +
    ozn(sak, pri, 'L4 ' + br(MJERE.L4 * 1000, 0)) + (st.tl > 0.005 ? ozn(pri, tcp, 'TL ' + br(st.tl * 1000, 0)) : '') +
    '<text x="' + (X(tcp[0]) + 8).toFixed(1) + '" y="' + (Y(tcp[1]) + 14).toFixed(1) + '" class="sh-t sh-tt">TCP</text>' +
    '<text x="' + (X(0) + 4).toFixed(1) + '" y="14" class="sh-t">os J1</text>';
  const t = KIN.uTocku(st.q, st.tl, OC());
  $('shema-cap').textContent = 'Ravnina ruke pri J1 = ' + brF(uStupnjeve(j1), 1) + '°. Nagib P = J2 + J3 + J4 = ' + brF(t.p, 1) + '°, okret R = J5 = ' + brF(t.r, 1) + '°. Sjenčano: doseg točke šake (naprijed i, preko osi J1, natrag). Mjere u mm.';
}
const IME_POL = { org: 'ORG (referentni)', nest: 'Nakon NEST-a', vodoravno: 'Ruka vodoravno', saka: 'Pogled na šaku' };
const POLOZAJI = { org: ORG, nest: NEST.q, vodoravno: OSI.map(() => 0), saka: OSI.map((o, i) => Math.min(o.max, Math.max(o.min, [0, 69, -74, -23, 34][i] * Math.PI / 180))) };
const POL_KLJ = Object.keys(POLOZAJI).filter((k) => KIN.uGranicama(POLOZAJI[k]).ok);
$('poz-gumbi').innerHTML = POL_KLJ.map((k) => '<button type="button" class="gumb tanki" data-poz="' + k + '" aria-pressed="false">' + esc(IME_POL[k]) + '</button>').join('');
const isti = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-3);
function oznaciPolozaj() { document.querySelectorAll('[data-poz]').forEach((b) => b.setAttribute('aria-pressed', String(isti(st.q, POLOZAJI[b.dataset.poz])))); }
function postaviQ(q) {
  st.q = OSI.map((o, i) => Math.min(o.max, Math.max(o.min, Number(q[i]) || 0)));
  R.postavi(st.q); azurirajKlizace(); ocitanje(); oznaciPolozaj(); if (okvirDijela.visible) azurirajOkvir(); trazi();
}
function opisPolozaja(k) {
  const q = POLOZAJI[k], t = KIN.uTocku(q, st.tl, OC());
  const pp = k === 'org' ? PR.find((p) => /ORG/.test(p.sto)) : k === 'nest' ? PR.find((p) => /nakon NEST/i.test(p.sto)) : null;
  return IME_POL[k] + ': ' + OSI.map((o, i) => o.ime + ' ' + br(uStupnjeve(q[i]), 1) + '°').join(', ') + ' → TCP X ' + br(t.x, 1) + ', Y ' + br(t.y, 1) + ', Z ' + br(t.z, 1) + ' mm, P ' + br(t.p, 1) + '°, R ' + br(t.r, 1) + '°.' +
    (pp ? ' Pretpostavka: ' + pp.napomena.replace(/\s*\[[A-Z0-9-]+\]/g, '') : '');
}
function idiUPolozaj(k) {
  const q1 = POLOZAJI[k]; if (!q1) return;
  const sp = BRZINE.zadano ?? 4;
  const T = Math.max(0.6, Math.min(4, KIN.trajanje(st.q, q1, sp)));
  st.poza = { q0: st.q.slice(), q1: q1.slice(), t0: performance.now(), T, ime: k };
  D.postaviLED('execute', true);
  opis(opisPolozaja(k) + ' Zglobno gibanje (kao MO) brzinom SP ' + sp + ': sve osi kreću i stižu istodobno.');
  trazi();
}
$('poz-gumbi').addEventListener('click', (e) => { const b = e.target.closest('[data-poz]'); if (b) idiUPolozaj(b.dataset.poz); });
function korakPoze(t) {
  const Q = st.poza; if (!Q) return false;
  const s = Math.min(1, Math.max(0, (t - Q.t0) / 1000 / Q.T));
  postaviQ(KIN.interpolirajZglobno(Q.q0, Q.q1, ease(s)));
  if (s >= 1) { st.poza = null; D.postaviLED('execute', false); }
  return true;
}
KL.forEach((k, i) => k.addEventListener('input', () => {
  if (st.poza) { st.poza = null; D.postaviLED('execute', false); }
  const q = st.q.slice(); q[i] = (+k.value) * Math.PI / 180; postaviQ(q);
}));

/* ================================================================== */
/* 12. SIM RV: ulazi, izlazi, rukovanje                                */
/* ================================================================== */
const io = { ulazi: (SIMRV_SIGNALI.ulazi || []).map(() => 0), izlazi: (SIMRV_SIGNALI.izlazi || []).map(() => 0), sig: { STB: 0, ACK: 0, RDY: 0, BUSY: 0 } };
const bajt = (a) => a.reduce((s, v, b) => s | (v ? 1 << b : 0), 0);
const bin = (n, k) => n.toString(2).padStart(k, '0');
const hex = (n) => (JEZIK.hex === '&' ? '&' : '&') + n.toString(16).toUpperCase().padStart(2, '0');
function crtajIO() {
  const el = $('io-ploca'); if (!el) return;
  const nU = io.ulazi.length, nI = io.izlazi.length;
  const red = (vrsta, l, oz) => l.map((v, b) => '<button type="button" class="uz-bit' + (v ? ' uklj' : '') + '" data-io="' + vrsta + '" data-bit="' + b + '" aria-pressed="' + !!v + '" aria-label="' + oz + ' bit ' + b + '">' + b + '</button>').join('');
  const sig = (SIMRV_SIGNALI.rukovanje || []).map((r) => '<button type="button" class="uz-bit uz-sigb' + (io.sig[r.id] ? ' uklj' : '') + (r.smjer === 'izlaz' ? ' izl' : '') + '" data-sig="' + esc(r.id) + '" aria-pressed="' + !!io.sig[r.id] + '" title="' + esc(r.opis) + '">' + esc(r.id) + '</button>').join('');
  const u = bajt(io.ulazi), z = bajt(io.izlazi);
  el.innerHTML = '<div class="uz-io-r"><span class="uz-n">INPUT (prekidači → DUM1)</span><div class="uz-bitovi">' + red('u', io.ulazi, 'Ulaz') + '</div>' +
    '<span class="uz-bajt">' + u + ' · ' + hex(u) + ' · ' + bin(u, nU) + '</span></div>' +
    '<div class="uz-io-r"><span class="uz-n">OUTPUT (DUM1 → LED-ice)</span><div class="uz-bitovi">' + red('i', io.izlazi, 'Izlaz') + '</div><span class="uz-bajt">' + z + ' · ' + hex(z) + ' · ' + bin(z, nI) + '</span></div>' +
    '<div class="uz-io-r"><span class="uz-n">Rukovanje</span><div class="uz-bitovi">' + sig + '</div><span class="uz-bajt">STB, ACK: prekidači · RDY, BUSY: LED-ice</span></div>';
}
function postaviUlaz(b, v) { io.ulazi[b] = v ? 1 : 0; SIM.postaviUlaz(b, !!v); crtajIO(); opis('Ulaz ' + b + ' = ' + (v ? '1 (H)' : '0 (L)') + ' · ulazni bajt ' + bajt(io.ulazi) + ' (' + hex(bajt(io.ulazi)) + '). Robot ga čita naredbama ID, IN i TB.'); trazi(); }
function postaviIzlaz(b, v) { io.izlazi[b] = v ? 1 : 0; SIM.postaviIzlaze(bajt(io.izlazi)); crtajIO(); opis('Izlaz ' + b + ' = ' + (v ? 1 : 0) + ' · izlazni bajt ' + bajt(io.izlazi) + ' (' + hex(bajt(io.izlazi)) + '); u programu: OB ' + (v ? '+' : '-') + b + ' ili OD ' + bajt(io.izlazi) + '.'); trazi(); }
function postaviSignalSim(id, v) { io.sig[id] = v ? 1 : 0; SIM.postaviSignal(id, !!v); crtajIO(); const r = (SIMRV_SIGNALI.rukovanje || []).find((x) => x.id === id); opis(id + ' = ' + (v ? 1 : 0) + (r ? ' — ' + r.opis : '')); trazi(); }
$('io-ploca').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.sig) postaviSignalSim(b.dataset.sig, !io.sig[b.dataset.sig]);
  else if (b.dataset.io === 'u') postaviUlaz(+b.dataset.bit, !io.ulazi[+b.dataset.bit]);
  else if (b.dataset.io === 'i') postaviIzlaz(+b.dataset.bit, !io.izlazi[+b.dataset.bit]);
});

/* ================================================================== */
/* 13. Pogreške: prikaz na DUM1 (ERROR trepće 0,5 s kod pogreške I)     */
/* ================================================================== */
let trepT = 0, trepS = false;
function ugasiPogresku() {
  clearInterval(trepT); trepT = 0; st.greska = null;
  D.postaviLED('error', false); (DUM1_PLOCA.led || []).forEach((l) => D.postaviLED(l, false));
  document.querySelectorAll('[data-greska]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  trazi();
}
function pokaziPogreskuI(led, sKamerom = true) {
  ugasiPogresku();
  const p = (POGRESKE.I || []).find((x) => x.led === led); if (!p) return;
  st.greska = led; D.postaviLED(led, true);
  const per = (P.UPRAVLJANJE_ZADANO && P.UPRAVLJANJE_ZADANO.treptanjeError) || 0.5;
  trepT = setInterval(() => { trepS = !trepS; D.postaviLED('error', trepS); trazi(); }, per * 1000);
  if (!st.vrataCilj) prebaciVrata(false, false);
  if (sKamerom) pogled('dum1Bok'); else pogled('dum1Bok');
  document.querySelectorAll('[data-greska="' + led + '"]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
  opis('Pogreška I. vrste, ' + led + ': ' + p.uzrok + ' ' + (POGRESKE.znakoviI || '') + ' Poništavanje: ' + p.ponistavanje + '.');
  trazi();
}
function pokaziPogreskuII() {
  ugasiPogresku(); st.greska = 'II'; D.postaviLED('error', true); pogled('dum1');
  document.querySelectorAll('[data-greska="II"]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
  opis('Pogreška II. vrste: ' + (POGRESKE.znakoviII || '') + ' Poništavanje: ' + (POGRESKE.ponistavanjeII || []).join(', ') + '.');
  trazi();
}

/* ================================================================== */
/* 14. Animacije (rastavljanje osi, vrata, prsti) i početno stanje      */
/* ================================================================== */
function prema(trenutno, cilj, brzina) { return Math.abs(cilj - trenutno) < 1e-4 ? cilj : trenutno + Math.sign(cilj - trenutno) * Math.min(Math.abs(cilj - trenutno), brzina); }
function korakOsi(dt) {
  let ide = false;
  for (let i = 0; i < OSI.length; i++) {
    const c = st.osCilj[i], s = st.osT[i];
    if (Math.abs(c - s) > 1e-4) { st.osT[i] = prema(s, c, dt * 1.1); R.rastaviOs(i, ease(st.osT[i])); ide = true; }
  }
  if (ide) primijeniIsticanje();
  return ide;
}
function korakVrata(dt) { if (Math.abs(st.vrataCilj - st.vrata) < 1e-4) return false; st.vrata = prema(st.vrata, st.vrataCilj, dt * 1.3); D.otvori(ease(st.vrata)); return true; }
function korakPrstiju(dt) {
  if (Math.abs(st.prstiCilj - st.prsti) < 1e-4) return false;
  st.prsti = prema(st.prsti, st.prstiCilj, dt / Math.max(0.2, PRIHVATNICA.vrijemeHoda || 0.6)); R.prihvatnica(ease(st.prsti)); return true;
}
function pocetno() {
  st.poza = null; D.postaviLED('execute', false); ugasiPogresku();
  postaviRastav(0); postaviUnutra(false);
  st.osCilj = [0, 0, 0, 0, 0]; st.osT = [0, 0, 0, 0, 0]; for (let i = 0; i < OSI.length; i++) R.rastaviOs(i, 0); oznaciOsi();
  st.vrataCilj = 0; st.vrata = 0; D.otvori(0); oznaciVrata();
  st.dumUnutra = false; D.unutrasnjost(false); $('d-unutra').setAttribute('aria-pressed', 'false');
  st.prstiCilj = 1; st.prsti = 1; R.prihvatnica(1); oznaciPrste();
  POMOCNI.forEach(([id, k, f]) => { $(id).checked = false; st.pomocni[k] = false; f(false); });
  st.samo = false; $('r-samo').checked = false;
  postaviTL(TL_ZADANO);
  io.ulazi.fill(0); io.izlazi.fill(0); Object.keys(io.sig).forEach((k) => { io.sig[k] = 0; SIM.postaviSignal(k, false); }); io.ulazi.forEach((_, b) => SIM.postaviUlaz(b, false)); SIM.postaviIzlaze(0); crtajIO();
  postaviQ(POCETNI_Q);
  osvjeziRadnje();
}
$('r-pocetno').addEventListener('click', () => {
  pocetno(); st.akt = null; st.skupina = null; st.tipka = null; karticaUvod(); crtajStablo(); primijeniIsticanje(); pogled('robot');
  opis('Vraćeno početno stanje: robot sklopljen u položaju ORG, prihvatnica otvorena, TL ' + TL_ZADANO + ' mm, DUM1 zatvoren.');
});

/* ================================================================== */
/* 15. Odjeljci: tekst i tablice iz podataka                           */
/* ================================================================== */
const prZa = (re) => PR.find((p) => !p.id && re.test(p.sto)) || null;
const ozPP = (re) => { const p = prZa(re); return p ? '<span class="uz-oz' + (p.vrsta === 'sukob' ? ' sukob' : p.vrsta === 'nedostaje' ? ' ned' : '') + '" title="' + esc(p.sto + ': ' + p.napomena) + '">' + (p.vrsta === 'sukob' ? 'sukob izvora' : p.vrsta === 'nedostaje' ? 'nedostaje' : 'pretpostavka') + '</span>' : ''; };
const ozPPdio = '<span class="uz-oz">pretpostavka</span>';
const izvLink = (s) => [...new Set(String(s || '').split(',').map((k) => k.trim()).filter(Boolean))].map((k) => '<a href="#izvor-' + esc(k) + '">[' + esc(k) + ']</a>').join(' ');
const pok = (id, t) => nadjiDio(id) ? '<button type="button" class="pok" data-pokazi="' + esc(id) + '">' + (t ?? esc(naziv(id))) + '</button>' : (t ?? esc(id));
function tbl(naslov, glava, redovi, opc = {}) {
  const r = redovi.filter(Boolean); if (!r.length) return '';
  return '<div class="uz-tbl-omot' + (opc.siroko ? ' uz-siroko-t' : '') + '"' + (opc.siroko ? ' role="region" tabindex="0" aria-label="' + esc(String(naslov).replace(/<[^>]+>/g, '')) + '"' : '') + '><table class="tbl uz-tbl' + (opc.kartice ? ' uz-kart' : '') + '"><caption>' + naslov + '</caption><thead><tr>' + glava.map((g) => '<th scope="col">' + g + '</th>').join('') + '</tr></thead><tbody>' +
    r.map((red) => '<tr>' + red.map((c, i) => { const o = (c && typeof c === 'object') ? c : { h: c }; return '<td' + (o.k ? ' class="' + o.k + '"' : '') + (opc.kartice ? ' data-o="' + esc(String(glava[i]).replace(/<[^>]+>/g, '')) + '"' : '') + '>' + (o.h ?? '') + '</td>'; }).join('') + '</tr>').join('') +
    '</tbody></table>' + (opc.nap ? '<p class="pom">' + opc.nap + '</p>' : '') + '</div>';
}
const kv = (naslov, redovi, nap) => tbl(naslov, ['Podatak', 'Vrijednost', 'Izvor'], redovi.map(([a, b, c]) => [esc(a), b, izvLink(c)]), { nap });
const naredbeGrupe = (g) => NAREDBE.filter((n) => n.grupa === g);
const tblNaredbi = (naslov, g) => tbl(naslov, ['Naredba', 'Naziv', 'Sintaksa', 'Djelovanje'], naredbeGrupe(g).map((n) => ['<b class="mono">' + esc(n.kod) + '</b>', esc(n.nazivHr || n.naziv) + '<span class="uz-engl-n">' + esc(n.naziv) + '</span>', { h: esc(n.sintaksa), k: 'mono' }, txt(n.opis) + (n.pretpostavka ? ozPPdio : '')]), { siroko: true, kartice: true, nap: 'Cijeli jezik (' + NAREDBE.length + ' naredbi) s primjerima je u <a href="upravljanje-robotom.html">Upravljanju robotom</a>.' });

function crtajGradju() {
  const o = OSI.map((x) => x.ime + ' ' + x.naziv + ' (' + x.oznaka + ')').join(', ');
  const t = KIN.uTocku(ORG, TL_ZADANO / 1000, 'O');
  $('gradja-tekst').innerHTML = P_(
    esc(NAZIV_ROBOTA) + ' je ' + esc(ROBOT.gradja) + '. Osi su redom ' + esc(o) + '; slova u zagradama su oznake osi na tipkama privjeska (engl. ' + esc(OSI.map((x) => x.engleski).join(', ')) + '). Nadlaktica je ' + br(MJERE.L2 * 1000, 0) + ' mm, podlaktica ' + br(MJERE.L3 * 1000, 0) + ' mm, a od osi nagiba šake do prirubnice ' + br(MJERE.L4 * 1000, 0) + ' mm; os ramena je ' + br(MJERE.d1 * 1000, 0) + ' mm iznad montažne plohe' + ozPP(/Visina osi ramena/) + '.',
    '<b>Zašto pet osi i što to znači.</b> Za proizvoljan položaj i orijentaciju alata u prostoru treba šest osi. Kod ovog robota os ramena siječe os struka (pomak ' + br(DH.a[0] * 1000, 0) + ' mm), a osi ramena, lakta i nagiba šake međusobno su usporedne — nadlaktica, podlaktica i šaka zato uvijek leže u jednoj okomitoj ravnini kroz os J1. U toj ravnini leži i vrh alata (TCP): kut J1 određuje sam položaj točke u tlocrtu, J1 = atan2(Y, X).',
    'Orijentaciju alata opisuju samo dva kuta: <b>nagib P = J2 + J3 + J4</b> (od vodoravne; −90° znači alat okomito prema dolje) i <b>okret R = J5</b>. Zakret alata oko okomite osi ne zadaje se neovisno — mijenja se zajedno s J1. Za hvatanje odozgo (P = −90°) to ne smeta: okretom R prsti se poravnaju s predmetom. Predmet sa strane može se uhvatiti samo ako mu je strana okrenuta prema osi struka; točka koju robot s pet osi ne može postići javlja pogrešku II. vrste.',
    '<b>Inverzna kinematika</b> je zato jednostavna: J1 iz tlocrta, a u ravnini ruke iz nagiba P izračuna se točka osi nagiba šake, TCP − (L4 + TL)·(cos P, sin P), pa se riješi trokut nadlaktica–podlaktica. Uzima se rješenje „lakat gore” (J3 ≤ 0). Shema desno crta ruku u toj ravnini za trenutne kutove klizača ispod 3D prikaza.',
    '<b>Zapis točke.</b> Robot pamti poziciju kao X, Y, Z vrha alata u mm (na 0,1 mm) te P i R u stupnjevima (na 0,1°), uz stanje prihvatnice O ili C — isto kao očitanje ispod 3D prikaza. Koordinatni sustav robota ima ishodište na montažnoj plohi u osi J1; X gleda naprijed, Y lijevo, Z gore' + ozPP(/Smjer osi X i J1/) + '. Duljinu alata od prirubnice do TCP-a (zadano ' + TL_ZADANO + ' mm' + ozPP(/Zadana duljina alata/) + ') mijenja naredba TL.',
    '<b>Karakteristični položaji.</b> Referentni položaj ORG (naredba OG, tipka ORG) je u simulatoru ' + esc(OSI.map((x, i) => x.ime + ' ' + br(uStupnjeve(ORG[i]), 0) + '°').join(', ')) + ozPP(/Referentni položaj ORG/) + ' — TCP je tada na X ' + br(t.x, 1) + ', Z ' + br(t.z, 1) + ' mm s alatom prema dolje. Nakon uključenja robot ne zna položaj osi; NEST (naredba NT, tipka NST) ga pronalazi — ' + esc(mal(NEST.opis)));
  const deg0 = (r) => br(uStupnjeve(r), 0) + '°';
  const t1 = tbl('Osi — raspon, brzina i pogon', ['Os', 'Privjesak', 'Naziv', 'Granice', 'Raspon', 'Najveća brzina', 'Motor', 'Kočnica', 'Smjer (naša konvencija)'],
    OSI.map((x, i) => ['<b>' + esc(x.ime) + '</b>', esc(x.oznaka), esc(x.naziv) + '<span class="uz-engl-n">' + esc(x.engleski) + '</span>', br(x.minDeg, 0) + '° … ' + (x.maxDeg > 0 ? '+' : '') + br(x.maxDeg, 0) + '°' + (i === 2 ? ozPP(/Predznak osi J3/) : i === 3 ? ozPP(/Raspon osi J4/) : ''),
      x.raspon + '°', x.vMax + ' °/s', x.motorW + ' W', x.kocnica ? 'da' : '—', esc(x.smjer)]), { siroko: true, kartice: true, nap: 'Izvori: ' + izvLink(OSI[0].izvor) + '. Granice i brzine vrijede za sve osi istodobno; nagib šake u nekim položajima ruke dodatno je ograničen (crtež u nedostupnom dodatku priručnika).' });
  const t2 = tbl('Kinematički parametri (standardni DH)' + ozPP(/Standardna DH/), ['i', 'a [mm]', 'd [mm]', 'α', 'θ<sub>i</sub>'], DH.a.map((a, i) => [String(i + 1), br(a * 1000, 1), br(DH.d[i] * 1000, 1), deg0(DH.alpha[i]),
    { h: 'J' + (i + 1) + (Math.abs(DH.pomak[i]) > 1e-9 ? (DH.pomak[i] > 0 ? ' + ' : ' − ') + br(Math.abs(uStupnjeve(DH.pomak[i])), 0) + '°' : ''), k: 'mono' }]),
    { nap: 'T<sub>i</sub> = Rz(θ<sub>i</sub>)·Tz(d<sub>i</sub>)·Tx(a<sub>i</sub>)·Rx(α<sub>i</sub>); TCP je još TL = ' + TL_ZADANO + ' mm duž osi alata. Izvedeno iz objavljenih parametara ' + izvLink(DH.izvor) + '; ista kinematika računa očitanje ispod 3D prikaza.' });
  const pol = (ime, q) => { const u = KIN.uTocku(q, TL_ZADANO / 1000, 'O'); return [esc(ime), esc(OSI.map((x, i) => br(uStupnjeve(q[i]), 1) + '°').join(' / ')), brF(u.x, 1) + ' / ' + brF(u.y, 1) + ' / ' + brF(u.z, 1), brF(u.p, 1) + '° / ' + brF(u.r, 1) + '°']; };
  const t3 = tbl('Karakteristični položaji (TL ' + TL_ZADANO + ' mm)', ['Položaj', 'J1 / J2 / J3 / J4 / J5', 'TCP X / Y / Z [mm]', 'P / R'], [pol('ORG (referentni)', ORG), pol('Nakon NEST-a', NEST.q), pol('Ruka vodoravno', OSI.map(() => 0))],
    { nap: 'Kutovi ORG i NEST su pretpostavka simulatora (dodatak priručnika s ishodištem nedostaje); provjeriti naredbom WH na robotu nakon NT i OG.' });
  $('gradja-tbl').innerHTML = '<div class="uz-podaci-in">' + t1 + t2 + t3 + '</div>';
}
function crtajPogone() {
  $('pogoni-saz').textContent = OSI.length + ' DC motora · ' + OSI.filter((x) => x.remen).length + ' osi s remenom · ' + OSI.filter((x) => x.kocnica).length + ' kočnice';
  const postupak = (PRIVJESAK.postupci || []).find((x) => /kočnic/i.test(x.naziv));
  $('pogoni-tekst').innerHTML = P_(
    '<b>Motori.</b> Svaku os pogoni istosmjerni servo motor s trajnim magnetima i četkicama: ' + esc(OSI.map((x) => x.ime + ' ' + x.motorW + ' W').join(', ')) + ' (natpisna pločica). Servo pojačalo u DUM1 regulira napon motora prema razlici zadanog i izmjerenog položaja. Grafitne četkice se troše i povremeno mijenjaju — to je glavna razlika prema današnjim robotima s motorima bez četkica.',
    '<b>Mjerenje položaja.</b> ' + esc(ROBOT.mjerenje.charAt(0).toUpperCase() + ROBOT.mjerenje.slice(1)) + '. Enkoder na osovini motora daje dva pomaknuta niza impulsa (A i B — iz redoslijeda slijedi smjer) i jedan impuls po okretaju (Z-faza). Upravljačka jedinica broji impulse, ali nakon uključenja ne zna od koje vrijednosti — zato je nakon svakog uključenja obvezan NEST.',
    '<b>NEST.</b> ' + esc(NEST.opis) + ' Redoslijed: ' + esc(NEST.redoslijed.map((f) => f.join(', ')).join(' → ')) + '. Pokretanje: ' + esc(NEST.pokretanje) + '. Prije NEST-a ruku treba ručno dovesti u siguran položaj.',
    '<b>Prijenos.</b> ' + esc(ROBOT.pogon.charAt(0).toUpperCase() + ROBOT.pogon.slice(1)) + '. Zupčasti remen ne proklizava, pa enkoder na motoru točno mjeri kut osi; omjer remenica smanjuje brzinu i povećava moment. Reduktori s valnim prijenosnikom ne spominju se ni u jednom izvoru. Remeni se pregledavaju i napinju pri održavanju.',
    '<b>Kočnice.</b> Kočnice ima ' + esc(ROBOT.kocnice) + ': bez struje drže ruku da ne padne pod vlastitom težinom (nestanak napajanja, pogreška I. vrste, EMG. STOP). Osi J1, J4 i J5 nemaju kočnicu jer ih težina ruke ne okreće.' + (postupak ? ' Ručno otpuštanje: ' + esc(postupak.koraci) + '.' : ''));
  const cel = (ids) => ids.map((id) => pok(id, esc(osnovnoIme(naziv(id))))).join(' · ');
  const t1 = tbl('Pogon po osima (klik na naziv pokazuje dio na modelu)', ['Os', 'Motor', 'Prijenos', 'Kočnica', 'Najveća brzina', 'Dijelovi pogona'], OSI.map((x, i) => ['<b>' + esc(x.ime) + '</b> ' + esc(x.naziv), x.motorW + ' W', esc(x.prijenos) + ozPP(new RegExp('^Prijenos ' + x.ime + '$')), x.kocnica ? 'da' : '—', x.vMax + ' °/s', cel(OS_DIJELOVI[i])]),
    { siroko: true, kartice: true, nap: 'Izvori: ' + izvLink(ROBOT.izvor + ', ' + OSI[0].izvor) + '. Smještaj motora i trasa remena u robotu su pretpostavka (unutrašnjost nije prikazana u dostupnom dijelu priručnika); snage, remeni J2–J4 i kočnice J2/J3 su podaci.' });
  const ost = DIJELOVI.filter((d) => d.skupina === SK.pogoni && !OS_DIJELA.has(d.id)).map((d) => d.id);
  $('pogoni-tbl').innerHTML = t1 + '<p class="uz-dj-n">Ostali dijelovi pogona:</p><ul class="uz-dj">' + ost.map((id) => '<li><button type="button" class="cip" data-pokazi="' + id + '">' + esc(naziv(id)) + '</button></li>').join('') + '</ul>';
}
function crtajPrihvatnicu() {
  const H = PRIHVATNICA, g = H.gp || {};
  $('prihv-saz').textContent = H.oznaka + ' · hod ' + H.hodMm + ' mm · ' + H.stupnjevaSile + ' stupnjeva sile';
  $('prihv-tekst').innerHTML = P_(
    'Na prirubnici je ' + esc(H.tip) + ' ' + esc(H.oznaka) + '. Prsti se gibaju paralelno, s hodom 0–' + H.hodMm + ' mm; silu stiska regulira struja motora u ' + H.stupnjevaSile + ' stupnjeva, najviše ≈ ' + br(H.silaMaxKgf, 1) + ' kgf' + ozPP(/Najveća sila držanja/) + '. Masa je ≈ ' + br(H.masaKg * 1000, 0) + ' g' + ozPP(/Masa prihvatnice/) + ', vijek ' + esc(H.vijek) + '. Bez napajanja ' + esc(H.bezNapajanja) + '.',
    'Naredba GP zadaje tri broja: početnu silu, silu držanja i vrijeme početne sile (× 0,1 s). Pri zatvaranju prihvatnica najprije stišće početnom silom, a zatim drži manjom silom držanja — predmet se brzo i sigurno zahvati, a ne zgnječi. Rasponi argumenata nisu nađeni u izvorima; uzeto je ' + (g.min ?? 0) + '–' + (g.max ?? 15) + ' za sile' + ozPP(/Raspon argumenata GP/) + '.',
    'Preklopnik HAND na stražnjoj ploči DUM1: ' + esc(H.sucelje) + '.',
    '<button type="button" class="gumb tanki" data-radnja-odj="prsti">Otvori ili zatvori prihvatnicu na modelu</button> <button type="button" class="gumb tanki" data-pogled-odj="saka">Pogled na šaku</button>');
  $('prihv-tbl').innerHTML = tblNaredbi('Naredbe prihvatnice', 'prihvatnica');
}
const ID_PREDNJE = { power: 'ledPower', emg: 'tipkaEmg', error: 'ledError', execute: 'ledExecute', start: 'tipkaStart', stop: 'tipkaStop', reset: 'tipkaReset' };
const ID_STRAZNJE = { centronics: 'prikljucakCentronics', rs232: 'prikljucakRs232', extio: 'prikljucakIO', tbox: 'prikljucakPrivjeska', mpower: 'prikljucciMotora', msignal: 'prikljucciMotora', extemg: 'stezaljkaExtEmg', hand: 'preklopnikHand', zemlja: 'stezaljkaExtEmg', osigurac: 'osigurac', mreza: 'mrezniPrekidac' };
function crtajDUM1() {
  const J = JEDINICA, m = J.memorija;
  $('dum1-saz').textContent = J.napajanje + ' · ' + J.snagaVA + ' VA · ' + J.masaKg + ' kg';
  $('dum1-tekst').innerHTML = P_(
    'Jedinica ' + esc(J.oznaka) + ' — ' + esc(J.naziv) + ' — sadrži mrežno napajanje, servo pojačala za pet osi, prihvatnicu i opcijsku os, procesor koji tumači ' + ROBOT.naredbi + ' naredbi jezika Movemaster, memoriju i sučelja. Napajanje ' + esc(J.napajanje) + ', ' + J.snagaVA + ' VA, masa ' + J.masaKg + ' kg (pločica, izrada ' + esc(J.godina) + '). Snaga: ' + esc(J.snagaNapomena) + '.',
    '<b>Prednja ploča</b> ima samo osnovne elemente: ' + esc(J.prednja.join(', ')) + '. <b>Stražnja ploča:</b> ' + esc(J.strazanja.join(', ')) + '. ' + esc(DUM1_PLOCA.bocnaVrata),
    '<b>Memorija.</b> ' + m.pozicija + ' pozicija (' + m.pozicijaKB + ' KB) i ' + m.redaka + ' programskih redaka (' + m.retciKB + ' KB); pohrana: ' + esc(m.pohrana) + '. Naredba WR (tipka WRT) piše RAM u EPROM, TR (TRN) učitava EPROM u RAM, a preklopnik ST2 bira kopiranje EPROM → RAM pri uključenju. Prije zamjene baterije program spremi u EPROM.',
    '<b>Preklopnik SW1</b> (osam bitova iza bočnih vrata) postavlja ponašanje jedinice: završetak retka na RS-232C, provjeru baterije, vrstu I/O kartice, dopuštenje naredbe HO, izvor signala START, otpuštanje kočnica s privjeska i zujalo. SW2 i SW3 postavljaju format i brzinu serijskog sučelja (tvornički ' + esc(RS232.zapis) + '), ST1 način DUM1/PC.',
    '<button type="button" class="gumb tanki" data-pogled-odj="dum1">DUM1 sprijeda</button> <button type="button" class="gumb tanki" data-pogled-odj="dum1Straga">DUM1 straga</button> <button type="button" class="gumb tanki" data-radnja-odj="vrata">Otvori ili zatvori bočna vrata</button> <button type="button" class="gumb tanki" data-radnja-odj="dumUnutra">DUM1 iznutra</button>');
  const t1 = tbl('Prednja ploča (odozgo prema dolje)', ['Element', 'Vrsta', 'Djelovanje'], (DUM1_PLOCA.prednja || []).map((e) => [pok(ID_PREDNJE[e.id], esc(e.natpis)), esc(e.vrsta + (e.boja ? ', ' + e.boja.replace('zuta', 'žuta') : '')), txt(e.opis)]), { kartice: true, nap: 'Klik na naziv pokazuje element na modelu. Izvori: ' + izvLink(DUM1_PLOCA.izvor) + '.' });
  const t2 = tbl('Stražnja ploča' + ozPP(/Raspored elemenata stražnje ploče/), ['Priključak', 'Vrsta', 'Namjena'], (DUM1_PLOCA.straznja || []).map((e) => [pok(ID_STRAZNJE[e.id], esc(e.natpis)), esc(e.vrsta), txt(e.opis)]), { kartice: true });
  const sw = (DUM1_PLOCA.sw1 || []).map((s) => ['<b>' + s.bit + '</b>', esc(s.naziv), esc(s.gore), esc(s.dolje), s.zadano ? 'gore' : 'dolje']);
  const t3 = tbl('Preklopnik SW1 — bitovi' + ozPP(/SW1 bitova/), ['Bit', 'Funkcija', 'Gore', 'Dolje', 'Zadano'], sw, { kartice: true, nap: pok('sw1', 'Pokaži SW1 na modelu') + ' · Bit 1 (gore = CR+LF) i bit 4 (gore = dopušta HO) potvrđeni su u priručniku; smjer i tvornički položaj ostalih bitova su pretpostavka.' });
  const t4 = kv('Ostali preklopnici i memorija', [
    [DUM1_PLOCA.sw2.naziv, 'zadano ' + esc(DUM1_PLOCA.sw2.zadano), DUM1_PLOCA.sw2.izvor], [DUM1_PLOCA.sw3.naziv, 'zadano ' + esc(DUM1_PLOCA.sw3.zadano), DUM1_PLOCA.sw3.izvor],
    [DUM1_PLOCA.st1.naziv, esc(DUM1_PLOCA.st1.vrijednosti.join(' / ')) + '; zadano ' + esc(DUM1_PLOCA.st1.zadano) + ozPP(/ST1 zadani/), 'MAN'], [DUM1_PLOCA.st2.naziv, 'zadano ' + (DUM1_PLOCA.st2.zadano ? 'uključeno' : 'isključeno'), 'MAN'],
    ['Pozicije', m.pozicija + ' (' + m.pozicijaKB + ' KB)', J.izvor], ['Programski retci', m.redaka + ' (' + m.retciKB + ' KB)', J.izvor], ['Pohrana', esc(m.pohrana), 'MAN'],
    ['Sučelja', esc(J.sucelja.join(', ')), J.izvor], ['Osigurač', J.osiguracA + ' A', 'MAN'], ['Kabeli robota', '2 × ' + J.kabelRobotaM + ' m', 'BRO']]);
  $('dum1-tbl').innerHTML = '<div class="uz-podaci-in">' + t1 + t2 + t3 + t4 + '</div>';
}
const BOJA_TIPKE = { smeda: 'smeda', bijela: 'krem' };
function crtajPrivjesak() {
  const T = PRIVJESAK.tipke || [];
  $('priv-saz').textContent = PRIVJESAK.naziv + ' · ' + T.length + ' tipki · kabel ' + PRIVJESAK.kabel;
  $('priv-tekst').innerHTML = P_(
    'Privjesak „' + esc(PRIVJESAK.naziv) + '” spaja se kabelom od ' + esc(PRIVJESAK.kabel) + ' na priključak TEACHING BOX, i to samo pri isključenoj jedinici. ' + esc((PRIVJESAK.elementi || []).map((e) => vel(e.natpis || e.vrsta) + ' (' + e.polozaj + '): ' + e.opis).join(' ')),
    'Zaslon (' + PRIVJESAK.zaslon.znamenke + ' znamenke, ' + esc(PRIVJESAK.zaslon.boja) + '): ' + esc(PRIVJESAK.zaslon.pozicija) + '; ' + esc(PRIVJESAK.zaslon.redak) + '. Načini ručnog gibanja: ' + esc(PRIVJESAK.nacini.map((n) => n.id + ' — ' + n.opis).join('; ')) + '. ' + esc(PRIVJESAK.ogranicenja),
    'Ispod je pregled tipki: klik na tipku istakne je na modelu i pokaže što radi. Rad s privjeskom (vođenje, učenje i provjera točaka) isprobaj u <a href="upravljanje-robotom.html">Upravljanju robotom</a>.');
  const mreza = [];
  T.slice().sort((a, b) => a.red - b.red || a.stupac - b.stupac).forEach((t) => mreza.push('<button type="button" class="uz-tipka ' + (BOJA_TIPKE[t.boja] || 'krem') + '" data-tipka="' + esc(t.id) + '" style="grid-row:' + (t.red + 1) + ';grid-column:' + t.stupac + '" aria-pressed="false" title="' + esc(t.opis) + '">' + esc(t.natpis) + '</button>'));
  $('tipkovnica').style.gridTemplateRows = 'repeat(' + ((PRIVJESAK.redova || 7) + 1) + ',auto)';
  $('tipkovnica').innerHTML = '<div class="uz-zaslon" aria-hidden="true">- 012</div>' + mreza.join('');
  $('tipka-opis').innerHTML = '<p class="pom">Odaberi tipku.</p>';
  $('priv-tbl').innerHTML = tbl('Postupci s privjeskom', ['Postupak', 'Koraci'], (PRIVJESAK.postupci || []).map((p) => [esc(p.naziv), esc(p.koraci)]), { nap: 'Izvori: ' + izvLink(PRIVJESAK.izvor) + '.' });
}
function odaberiTipku(tid) {
  const t = (PRIVJESAK.tipke || []).find((x) => x.id === tid); if (!t) return;
  document.querySelectorAll('#tipkovnica [data-tipka]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipka === tid)));
  const n = t.naredba && NAREDBA_PO_KODU[t.naredba];
  const red = (o, v) => v ? '<dt>' + o + '</dt><dd>' + v + '</dd>' : '';
  $('tipka-opis').innerHTML = '<h3>' + esc(t.natpis) + '</h3><p>' + esc(t.opis) + '</p><dl class="uz-pod">' + red('Slijed', esc(t.slijed)) + red('Naredba računala', n ? '<b class="mono">' + esc(n.kod) + '</b> — ' + esc(n.nazivHr || n.naziv) : '') +
    red('PTP', esc(t.ptp)) + red('XYZ', esc(t.xyz)) + red('TOOL', esc(t.tool)) + red('Brojka pri unosu', t.brojka !== null && t.brojka !== undefined ? String(t.brojka) : '') + '</dl>';
  const dio = TIPKA_DIO.get(tid);
  st.tipka = tid;
  if (dio) odaberiDio(dio, { tipka: true, let: false });
  if (PV.userData.pritisni) { PV.userData.pritisni(tid, true); setTimeout(() => { PV.userData.pritisni(tid, false); trazi(); }, 260); }
  pogled('privjesak');
}
$('tipkovnica').addEventListener('click', (e) => { const b = e.target.closest('[data-tipka]'); if (b) odaberiTipku(b.dataset.tipka); });
function crtajSIM() {
  const S_ = SIMRV_SIGNALI;
  $('sim-saz').textContent = 'kartica ' + KONFIG.ioKartica + ' · ' + (S_.ulazi || []).length + ' ulaza / ' + (S_.izlazi || []).length + ' izlaza';
  const kart = nadjiDio('ioKartica');
  const sl = S_.slijed || {};
  $('sim-tekst').innerHTML = P_(
    '<b>I/O kartica.</b> ' + esc(kart ? kart.opis : '') + ' Priključak EXTERNAL I/O nosi i signale rukovanja STB, ACK, RDY i BUSY te namjenske ulaze ' + esc((S_.namjenski || {}).ulazi ? S_.namjenski.ulazi.join(', ') : '') + ' i izlaz pogreške. Vanjsko napajanje: ' + esc(S_.napajanje) + '.',
    '<b>SIM RV</b> je mala kutija koja se spaja na EXTERNAL I/O umjesto stvarnog uređaja. ' + esc(S_.raspored.replace(/\s*\[foto\]/, '')) + ozPP(/Simulator SIM RV/) + ' ' + esc((S_.namjenski || {}).napomena || ''),
    '<b>Rukovanje (handshake).</b> Naredbe ID i OD čitaju i pišu port odmah. IN i OT čekaju potvrdu vanjskog uređaja — IN: ' + esc((sl.IN || []).join(' → ')) + '; OT: ' + esc((sl.OT || []).join(' → ')) + ozPP(/Slijed rukovanja/) + '.',
    'Isprobaj: prekidači ulaza i LED-ice izlaza ispod mijenjaju i 3D model (klik na prekidač na modelu također ga prebacuje). U Upravljanju robotom ulaze i izlaze čita i postavlja program.');
  crtajIO();
  $('sim-tbl').innerHTML = tblNaredbi('Naredbe ulaza i izlaza', 'io') + tbl('Signali rukovanja', ['Signal', 'Smjer', 'Element', 'Uloga'], (S_.rukovanje || []).map((r) => ['<b>' + esc(r.id) + '</b>', esc(r.smjer), esc(r.element + (r.boja ? ', ' + r.boja : '')), esc(r.opis)]), { kartice: true, nap: 'Uloga i smjer signala su pretpostavka prema natpisima na SIM RV; raspored pinova i vremenski dijagram nedostaju.' });
}
function crtajSigurnost() {
  const sp = (n) => (BRZINE[n] ? BRZINE[n].mmS : '');
  $('sig-tekst').innerHTML = '<div class="okvir pazi"><h4>Prije pokretanja pravog robota</h4><ul class="tekst">' +
    '<li>U radnom prostoru robota (doseg ruke i prihvatnice oko osi struka) ne smije biti nikoga dok je jedinica uključena.</li>' +
    '<li>EMG. STOP na DUM1 ili na privjesku mora biti na dohvat ruke; vanjski STOP u nuždi spaja se na stezaljku EXT EMG STP (mirni kontakt).</li>' +
    '<li>Nakon uključenja najprije NEST (NST, ENT ili naredba NT) — prije toga ruku ručno dovedi u siguran položaj.</li>' +
    '<li>Prve probe malom brzinom SP 1–3 (po našoj raspodjeli ≈ ' + sp(1) + '–' + sp(3) + ' mm/s' + ozPP(/Raspodjela brzina/) + ').</li>' +
    '<li>Privjesak se spaja i odspaja samo pri isključenoj jedinici; za rad s računalom mora biti OFF.</li>' +
    '<li>Preklopnik HAND mora odgovarati prihvatnici (DC za ' + esc(PRIHVATNICA.oznaka) + '). Nakon isključenja pričekaj prije otvaranja jedinice (upozorenje na kućištu).</li></ul></div>' +
    P_('<b>Pogreška I. vrste</b> (sklopovska): ' + esc(POGRESKE.znakoviI) + ' Poništavanje: ' + esc(mal(POGRESKE.ponistavanjeI)),
      '<b>Pogreška II. vrste</b> (programska): ' + esc(POGRESKE.znakoviII) + ' Poništavanje: ' + esc((POGRESKE.ponistavanjeII || []).join(', ')) + '. Naredba ER vraća ' + esc(Object.entries(POGRESKE.ER || {}).map(([k, v]) => k + ' = ' + v).join(', ')) + '.');
  const t1 = tbl('Pogreška I. vrste — LED-ice uzroka iza bočnih vrata', ['LED', 'Uzrok', 'Poništavanje', 'Na modelu'], (POGRESKE.I || []).map((p) => ['<b>' + esc(p.led) + '</b>', esc(p.uzrok), esc(p.ponistavanje),
    '<button type="button" class="gumb tanki uz-mali" data-greska="' + esc(p.led) + '" aria-pressed="false">Pokaži</button>']), { kartice: true });
  const t2 = tbl('Pogreška II. vrste — uzroci' + ozPP(/Oznake pogrešaka II/), ['Oznaka', 'Skupina', 'Uzrok'], (POGRESKE.II || []).map((p) => ['<span class="mono">' + esc(p.kod) + '</span>', esc(p.skupina), esc(p.uzrok)]),
    { kartice: true, nap: 'Robot uzrok pogreške II. vrste ne prikazuje kodom; oznake II-… su naše, za simulator i nastavu. <button type="button" class="gumb tanki uz-mali" data-greska="II" aria-pressed="false">Pokaži pogrešku II na DUM1</button> <button type="button" class="gumb tanki uz-mali" data-greska="0">Ugasi prikaz pogreške</button>' });
  $('sig-tbl').innerHTML = '<div class="uz-podaci-in">' + t1 + t2 + '</div>';
}
$('sigurnost').addEventListener('click', (e) => {
  const b = e.target.closest('[data-greska]'); if (!b) return;
  const g = b.dataset.greska;
  if (g === '0') { ugasiPogresku(); opis('Prikaz pogreške ugašen.'); } else if (g === 'II') pokaziPogreskuII(); else pokaziPogreskuI(g);
  $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
function crtajPodatke() {
  const Rb = ROBOT, J = JEDINICA, H = PRIHVATNICA, mj = MJERE;
  const t1 = kv('Robot (natpisna pločica i priručnik)', [
    ['Model', esc(Rb.proizvodjac + ' ' + Rb.naziv + ' ' + Rb.model), Rb.izvor], ['Građa', esc(Rb.gradja), 'MAN, BRO'], ['Nosivost', esc(Rb.nosivost) + ozPP(/Nosivost s prihvatnicom/), 'MAN, BRO, FOTO'],
    ['Masa', Rb.masaKg + ' kg', 'BRO, FOTO'], ['Ponovljivost', '±' + br(Rb.ponovljivostMm, 1) + ' mm', 'MAN, BRO'], ['Najveća brzina putanje', Rb.brzinaPutanjeMmS + ' mm/s', 'MAN, BRO'],
    ['Motori J1–J5', esc(Rb.motoriW.join(' / ')) + ' W', 'FOTO, MAN'], ['Pogon', esc(Rb.pogon), 'BRO, MAN'], ['Mjerenje položaja', esc(Rb.mjerenje), 'MAN, BRO'], ['Kočnice', esc(Rb.kocnice), 'MAN'],
    ['Izrada', esc(Rb.godinaIzrade), 'FOTO']]);
  const t2 = kv('Mjere i kinematika', [
    ['Visina osi ramena (d1)', mmS(mj.d1, 0) + ozPP(/Visina osi ramena/), 'BRO, MSE, FOTO'], ['Nadlaktica (L2)', mmS(mj.L2, 0), 'MAN, BRO, EPS'], ['Podlaktica (L3)', mmS(mj.L3, 0), 'MAN, BRO, EPS'],
    ['Os nagiba → prirubnica (L4)', mmS(mj.L4, 0), 'EPS, UIS'], ['Prirubnica → TCP (TL zadano)', TL_ZADANO + ' mm' + ozPP(/Zadana duljina alata/), 'MAN, EPS, UIS'],
    ['Gabarit (prirubnica → straga)', mmS(mj.gabarit, 0), 'BRO'], ['Najveća širina ramena', mmS(mj.sirinaRamena, 0), 'BRO'],
    ['Prirubnica podnožja', mmS(mj.podnozje.dubina, 0) + ' × ' + mmS(mj.podnozje.sirina, 0) + ozPP(/Prirubnica podnožja: širina/), 'BRO, MAN'], ['Provrti', '4 × ø' + br(mj.podnozje.promjerRupe * 1000, 0) + ' mm, vijci M8 × 30', 'MAN']]);
  const t3 = tbl('Brzine SP 0–9' + ozPP(/Raspodjela brzina/), ['SP', 'Udio najveće brzine', 'Putanja [mm/s]'], BRZINE.map((b) => [String(b.sp) + (b.sp === BRZINE.zadano ? ' <span class="uz-oz">nakon uključenja</span>' : ''), br(b.udio * 100, 0) + ' %', String(b.mmS)]),
    { nap: 'Ubrzanje H / L: ' + br(BRZINE.ubrzanje.H, 2) + ' / ' + br(BRZINE.ubrzanje.L, 2) + ' s' + ozPP(/Vrijeme ubrzanja/) + '. MOV na privjesku giba brzinom SP ' + BRZINE.privjesakMOV + '. Izvori: ' + izvLink(BRZINE.izvor) + '.' });
  const t4 = kv('Upravljačka jedinica ' + J.oznaka, [
    ['Napajanje', esc(J.napajanje) + ', ' + J.snagaVA + ' VA', 'FOTO, MAN'], ['Masa', J.masaKg + ' kg', 'MAN, FOTO'], ['Mjere (Š × V × D)', mj.dum1.map((x) => br(x * 1000, 0)).join(' × ') + ' mm' + ozPP(/Upravljačka jedinica DUM1: širina/), 'FOTO'],
    ['Pozicije / retci', J.memorija.pozicija + ' / ' + J.memorija.redaka, 'MAN, BRO'], ['Naredbi jezika', String(JEZIK.brojNaredbi) + ozPP(/Broj naredbi/), 'BRO, SMA'], ['Sučelja', esc(J.sucelja.join(', ')), 'MAN'],
    ['Osigurač', '250 V AC / ' + J.osiguracA + ' A', 'MAN']]);
  const t5 = kv('Prihvatnica ' + H.oznaka, [['Vrsta', esc(H.tip), 'MAN, MRC'], ['Hod', '0–' + H.hodMm + ' mm', 'MAN'], ['Sila', H.stupnjevaSile + ' stupnjeva, do ≈ ' + br(H.silaMaxKgf, 1) + ' kgf' + ozPP(/Najveća sila/), 'MAN'],
    ['Masa', '≈ ' + br(H.masaKg * 1000, 0) + ' g' + ozPP(/Masa prihvatnice/), 'MAN'], ['Vijek', esc(H.vijek), 'MAN'], ['Mjere kućišta', mj.prihvatnica.tijelo.map((x) => br(x * 1000, 0)).join(' × ') + ' mm' + ozPP(/Kućište prihvatnice/), 'FOTO']]);
  const t6 = kv('Veza s računalom (RS-232C)', [['Format', esc(RS232.zapis) + ' (' + RS232.baud + ' Bd, paritet ' + esc(RS232.paritet) + ', ' + RS232.bitovi + ' bita, ' + RS232.stop + ' stop-bita)', RS232.izvor],
    ['Završetak retka', esc(RS232.kraj) + ' (SW1 bit ' + RS232.krajPremaSW1.bit + ': gore ' + esc(RS232.krajPremaSW1.gore) + ', dolje ' + esc(RS232.krajPremaSW1.dolje) + ')', 'MAN'], ['Konektor', esc(RS232.konektor), 'MAN, IPN'],
    ['Kontrola toka', esc((prZa(/Kontrola toka/) || {}).vrijednost || RS232.kontrolaToka) + ozPP(/Kontrola toka/), ''], ['Drugo sučelje', esc(RS232.drugoSucelje), 'MAN']]);
  const t7 = tbl('Jezik Movemaster — skupine naredbi', ['Skupina', 'Naredbi', 'Naredbe'], GRUPE_NAREDBI.map((g) => [esc(g.slovo + '. ' + g.naziv), String(naredbeGrupe(g.id).length), '<span class="mono">' + esc(naredbeGrupe(g.id).map((n) => n.kod).join(' ')) + '</span>']),
    { nap: 'Ukupno ' + NAREDBE.length + ' naredbi; samo izravno (ne u programu): ' + esc(JEZIK.samoIzravno.join(', ')) + '. Opisi i sintaksa: <a href="upravljanje-robotom.html">Upravljanje robotom</a>.' });
  const k = STANICA;
  const t8 = kv('Robotska stanica Festo MPS', [['Kolica', br(k.kolica.sirina * 1000, 0) + ' × ' + br(k.kolica.dubina * 1000, 0) + ' mm, visina ≈ ' + br(k.kolica.visina * 1000, 0) + ' mm' + ozPP(/Visina kolica/), 'FC-190, FC-188'],
    ['Čelična ploča robota', k.celicnaPloca.mjere.map((x) => br(x * 1000, 0)).join(' × ') + ' mm' + ozPP(/Čelična ploča ispod/), 'MAN, FOTO'], ['Upravljačka ploča', esc(k.upravljackaPloca.elementi.join(', ')), k.upravljackaPloca.izvor]]);
  $('podaci-in').innerHTML = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8;
  $('podaci-nap').innerHTML = 'Oznaka <span class="uz-oz">pretpostavka</span> znači procijenjenu vrijednost, <span class="uz-oz sukob">sukob izvora</span> da se izvori ne slažu — objašnjenja su u odjeljku <a href="#pretpostavke">Što je pretpostavka</a>. Opisi i podaci svakog dijela su u kartici uz 3D prikaz.';
}
const txt = (t) => sIzvorima(String(t || '').replace(/\s*\[foto[^\]]*\]/gi, ''));
function sIzvorima(t) { return esc(t).replace(/\[([A-Z0-9-]+)\]/g, (s, k) => (k in IZVORI) ? '<a href="#izvor-' + k + '">[' + k + ']</a>' : s); }
function crtajPretpostavke() {
  const sukobi = PR.filter((p) => p.vrsta === 'sukob'), ned = PR.filter((p) => p.vrsta === 'nedostaje'), vrij = PR.filter((p) => p.vrsta === 'pretpostavka' && !p.id), dij = PR.filter((p) => p.vrsta === 'pretpostavka' && p.id);
  $('pretp-saz').textContent = PR.length + ' stavki';
  $('pretp-uvod').innerHTML = '<p>' + esc(TEKST_PRETPOSTAVKE) + '</p><p><strong>Vrijednosti će se ažurirati kad budu izmjereni podaci robota</strong> (visina osi ramena, kote podnožja, ishodište i pomaci nula, ulazi i izlazi, raspored pinova) — popis ispod nastaje sam iz podataka, pa potvrđena vrijednost s njega nestane.</p>' +
    '<p class="pom">Ukupno: ' + sukobi.length + ' nesuglasja izvora, ' + ned.length + ' podataka koji nedostaju, ' + vrij.length + ' procijenjenih vrijednosti i ' + dij.length + ' dijelova s procijenjenim izgledom, položajem ili podatkom.</p>';
  const t = (naslov, l, sDijelom, otv) => l.length ? '<details class="uz-pr-d"' + (otv ? ' open' : '') + '><summary>' + esc(naslov) + ' (' + l.length + ')</summary><div class="uz-tbl-omot"><table class="tbl uz-pr"><thead><tr><th scope="col">' + (sDijelom ? 'Dio' : 'Podatak') + '</th>' + (sDijelom ? '' : '<th scope="col">Korištena vrijednost</th>') + '<th scope="col">Napomena</th></tr></thead><tbody>' +
    l.map((p) => '<tr><td>' + (sDijelom ? '<button type="button" class="pok" data-pokazi="' + esc(p.id) + '">' + esc(p.sto) + '</button>' : esc(p.sto)) + '</td>' + (sDijelom ? '' : '<td>' + esc(p.vrijednost) + '</td>') + '<td>' + sIzvorima(p.napomena) + '</td></tr>').join('') +
    '</tbody></table></div></details>' : '';
  $('pretp-tablice').innerHTML = t('Sukobi izvora', sukobi, false, true) + t('Podaci koji nedostaju', ned, false, true) + t('Procijenjene vrijednosti', vrij, false, false) + t('Dijelovi s procijenjenim izgledom, položajem ili podatkom', dij, true, false);
}
function opisUrl(u) {
  try { const x = new URL(u); const d = decodeURIComponent(x.pathname).split('/').filter(Boolean); return x.hostname.replace(/^www\./, '') + (d.length ? ' · ' + d.slice(-1)[0] : ''); } catch (e) { return u; }
}
function crtajIzvore() {
  const k = Object.keys(IZVORI);
  $('izvori-saz').textContent = k.length + ' izvora';
  $('izvori').innerHTML = k.map((x) => { const z = IZVORI[x] || {}; return '<li id="izvor-' + esc(x) + '"><b>' + esc(x) + '</b> — ' + esc(z.naziv || '') +
    (z.url ? ' · <a href="' + esc(z.url) + '" target="_blank" rel="noopener">' + esc(opisUrl(z.url)) + '</a>' : ' <span class="bez">(bez poveznice)</span>') + '</li>'; }).join('');
  $('pojednostavljeno').textContent = 'Model je naš parametarski crtež s fotografija robota i kinematičkih duljina (' + [MJERE.L2, MJERE.L3, MJERE.L4].map((x) => br(x * 1000, 0)).join(' / ') + ' mm), bez natpisa i logotipa proizvođača. Duljine članaka, rasponi osi i položaji računaju se iz jedne datoteke podataka i provjereni su izravnom kinematikom; vanjski oblik članaka, visina osi ramena, smještaj motora, remena, kočnica i graničnih prekidača u robotu, unutrašnjost jedinice DUM1 te mjere privjeska i SIM RV su procjena. Popis svih procjena i nesuglasja izvora je u odjeljku „Što je pretpostavka”.';
}
/* oznake izvora u tekstu iz podataka ([MAN], [BRO] …) postaju poveznice na popis izvora; [foto] se ne prikazuje */
function obradiOznake(korijen) {
  const w = document.createTreeWalker(korijen, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/\[[A-Za-z0-9-]+\]/.test(n.nodeValue) && !n.parentElement.closest('a,button,code,script,style')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const lista = []; while (w.nextNode()) lista.push(w.currentNode);
  lista.forEach((n) => {
    const s = document.createElement('span');
    s.innerHTML = esc(n.nodeValue.replace(/\s*\[foto[^\]]*\]/gi, '')).replace(/\[([A-Z0-9-]+)\]/g, (m, k) => (k in IZVORI) ? '<a href="#izvor-' + k + '">[' + k + ']</a>' : m);
    n.replaceWith(...s.childNodes);
  });
}
/* klikovi u odjeljcima: pokaži dio, pogled, radnje */
document.querySelector('.uz-odjeljci').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pokazi]'); if (b) { odaberiDio(b.dataset.pokazi); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const p = e.target.closest('[data-pogled-odj]'); if (p) { const k = p.dataset.pogledOdj; pogled(k); opis(OPIS_POGLEDA[k] || ''); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const r = e.target.closest('[data-radnja-odj]'); if (!r) return;
  const v = r.dataset.radnjaOdj;
  if (v === 'prsti') { prebaciPrste(); pogled('saka'); } else if (v === 'vrata') prebaciVrata(); else if (v === 'dumUnutra') prebaciDumUnutra();
  $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
/* kazalo odjeljaka */
$('odj-nav').innerHTML = '<span class="uz-n">Odjeljci:</span> ' + [...document.querySelectorAll('.uz-odj')].map((d) => '<a href="#' + d.id + '" data-odj="' + d.id + '">' + esc(d.querySelector('summary h2').textContent.split(':')[0]) + '</a>').join(' · ');
$('odj-nav').addEventListener('click', (e) => { const a = e.target.closest('[data-odj]'); if (!a) return; e.preventDefault(); otvoriOdjeljak(a.dataset.odj); });
/* poveznica #izvor-… ili #odjeljak otvara sklopljeni odjeljak */
function otvoriZaHash() { const h = decodeURIComponent(location.hash.slice(1)); if (!h) return; const el = document.getElementById(h); const d = el && el.closest('details'); if (d && !d.open) { d.open = true; el.scrollIntoView({ block: 'start' }); } }
window.addEventListener('hashchange', otvoriZaHash);
document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (!a) return; const el = document.getElementById(a.getAttribute('href').slice(1)); const d = el && el.closest('details'); if (d && !d.open) d.open = true; });

/* ================================================================== */
/* 16. Petlja (crta se samo kad se nešto mijenja)                      */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); trazi(); }
new ResizeObserver(velicina).observe(scenaEl);
controls.addEventListener('change', trazi);
controls.addEventListener('start', () => { let_ = null; });
function okvir(t) {
  rafId = 0;
  if (dlg.open) { if (crtati) { renderer.render(scene, camera); brojCrtanja++; crtati = false; } return; }
  const dt = Math.min(0.25, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  let ide = false;
  if (let_) { const u = Math.min(1, (t - let_.t0) / let_.d), k = ease(u); camera.position.lerpVectors(let_.p0, let_.p1, k); controls.target.lerpVectors(let_.c0, let_.c1, k); if (u >= 1) let_ = null; ide = true; }
  if (korakPoze(t)) ide = true;
  if (korakOsi(dt)) ide = true;
  if (korakVrata(dt)) ide = true;
  if (korakPrstiju(dt)) ide = true;
  if (controls.update()) ide = true;
  zauzet = ide;
  if (ide && okvirDijela.visible) azurirajOkvir();
  if (ide || crtati) { renderer.render(scene, camera); brojCrtanja++; }
  crtati = false;
  if (ide && !document.hidden && !rafId) rafId = requestAnimationFrame(okvir);
}

/* ================================================================== */
/* 17. Pokretanje                                                     */
/* ================================================================== */
function heroBrojke() {
  const nT = temeKljucevi().length;
  $('hero-brojke').textContent = DIJELOVI.length + ' dijelova u ' + SKUPINE.length + ' skupina · ' + OSI.length + ' osi · ' + nT + ' tema „Kako radi” · ' + NAREDBE.length + ' naredbi jezika · podaci s izvorima, pretpostavke označene · prijeđi mišem preko modela za naziv dijela, klikni dio da ga odabereš.';
}
heroBrojke();
crtajStablo();
karticaUvod();
crtajGradju(); crtajPogone(); crtajPrihvatnicu(); crtajDUM1(); crtajPrivjesak(); crtajSIM(); crtajSigurnost(); crtajTeme(); crtajPodatke(); crtajPretpostavke(); crtajIzvore(); obradiOznake(document.querySelector('.uz-odjeljci'));
oznaciPrste(); oznaciVrata(); postaviTL(TL_ZADANO); postaviQ(POCETNI_Q);
velicina();
pogled('robot', false);
otvoriZaHash();
const uc = $('ucitavanje'); if (uc) uc.remove();
trazi();
let temeGotove = false;
import('./teme_rvm1.js').then((m) => {
  TM = m;
  try { if (typeof m.postaviPodatke === 'function') m.postaviPodatke(podaciZaTeme()); } catch (e) { console.warn('teme_rvm1: postaviPodatke', e); }
  crtajTeme(); osvjeziKarticu(); heroBrojke();
}).catch(() => { /* teme još ne postoje — stranica radi bez animacija */ }).finally(() => { temeGotove = true; });
window.__upoz = { scene, renderer, camera, controls, R, D, PV, SIM, stol, MODELI, st, io, KIN, DIJELOVI, RODITELJ, POGLEDI, OS_DIJELOVI, odaberiDio, odaberiSkupinu, pogled, pogodak, otvoriTemu, zatvoriTemu,
  prebaciOs, prebaciVrata, prebaciDumUnutra, prebaciPrste, idiUPolozaj, postaviQ, pocetno, postaviRastav, postaviUnutra, postaviTL, odaberiTipku, pokaziPogreskuI, pokaziPogreskuII, ugasiPogresku,
  render: () => renderer.render(scene, camera), trazi, get brojCrtanja() { return brojCrtanja; }, get zauzet() { return zauzet || crtati || !!rafId || !!st.poza; }, get tema() { return tema; },
  get teme() { return TM; }, get temeGotove() { return temeGotove; } };
