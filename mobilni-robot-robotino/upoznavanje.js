/* FORTRONIQ · Mobilni robot Robotino — Upoznavanje robota (3D).
   Izbornik dio po dio, rastavljanje, unutrašnjost, pogonske jedinice, pokazna vožnja, svjetla, trake i animacije „Kako radi” (teme_robotino.js).
   Svi nazivi, opisi, podaci, izvori i pretpostavke čitaju se iz robotino_podaci.js — ovdje su samo natpisi sučelja.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KONFIG, MJERE, POGON, SENZORI, DIJELOVI, SKUPINE, IZVORI, TEKST_PRETPOSTAVKE, pretpostavke, nadjiDio, dijeloviSkupine, izvoriDijela } from './robotino_podaci.js';
import { napraviRobotino } from './robotino_model.js';
import * as K from './robotino_kin.js';
import { TEME, prikazi, postaviPodatke } from './teme_robotino.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = (n, d = 2) => { const k = Math.pow(10, d); const v = Math.round(n * k) / k; return (Object.is(v, -0) ? 0 : v).toString().replace('.', ',').replace('-', '−'); };
const mm = (m) => br(m * 1000, 1) + ' mm';
const ease = (t) => t * t * (3 - 2 * t);
const PR = pretpostavke();
const DIO_ID = new Set(DIJELOVI.map((d) => d.id));
const INDEKS = new Map(DIJELOVI.map((d, i) => [d.id, i]));

/* ================================================================== */
/* 1. Scena                                                           */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
scenaEl.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 4 / 3, 0.02, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 8; controls.minDistance = 0.12; controls.maxPolarAngle = Math.PI * 0.62;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.35));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(1.2, 2.6, 1.8); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-2, 1.2, -1.6); scene.add(sun2);
const sun3 = new THREE.DirectionalLight(0xffffff, 0.3); sun3.position.set(-0.5, 0.4, 2.5); scene.add(sun3);

const R = napraviRobotino(THREE);
scene.add(R.korijen);
const ST_X = MJERE.stanica.pristajanje + 0.6;                      /* stanica ispred robota, 0,6 m od položaja pristajanja */
if (R.stanica) { scene.add(R.stanica.grupa); R.stanica.postaviPozu(ST_X, 0, Math.PI); }
R.postaviPozu(0, 0, 0);
/* pod: meka sjena ispod robota i stanice */
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 128); gr.addColorStop(0, 'rgba(110,130,140,0.40)'); gr.addColorStop(0.65, 'rgba(110,130,140,0.15)'); gr.addColorStop(1, 'rgba(110,130,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const pod = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pod.rotation.x = -Math.PI / 2; pod.scale.set(1.25, 0.85, 1); pod.position.set(ST_X / 2, -0.001, 0); pod.raycast = () => {}; scene.add(pod);
}

/* meshevi, dijelovi i hijerarhija dijelova (iz modela: dio B je u sklopu A ako su svi njegovi objekti unutar objekata A) */
const SVI = [];
const korijeni = [R.korijen, R.stanica && R.stanica.grupa].filter(Boolean);
korijeni.forEach((k) => k.traverse((o) => { if (o.isMesh) SVI.push(o); }));
const objektiDijela = (id) => ((R.dijelovi.get(id) || {}).objekti || []);
function sadrzi(A, o) { let p = o; while (p) { if (A.has(p)) return true; p = p.parent; } return false; }
const RODITELJ = new Map(), DUBINA = new Map();
{
  const skupovi = new Map(DIJELOVI.map((d) => [d.id, new Set(objektiDijela(d.id))]));
  const velicina = new Map(DIJELOVI.map((d) => { let n = 0; objektiDijela(d.id).forEach((o) => o.traverse((c) => { if (c.isMesh) n++; })); return [d.id, n]; }));
  DIJELOVI.forEach((b) => {
    const ob = objektiDijela(b.id); if (!ob.length) return;
    let naj = null;
    DIJELOVI.forEach((a) => {
      if (a.id === b.id || a.skupina !== b.skupina || INDEKS.get(a.id) > INDEKS.get(b.id)) return;
      const A = skupovi.get(a.id); if (!A.size) return;
      if (ob.every((o) => sadrzi(A, o)) && (!naj || velicina.get(a.id) < velicina.get(naj))) naj = a.id;
    });
    if (naj) RODITELJ.set(b.id, naj);
  });
  DIJELOVI.forEach((d) => { let n = 0, p = RODITELJ.get(d.id); while (p && n < 5) { n++; p = RODITELJ.get(p); } DUBINA.set(d.id, n); });
}
const djeca = (id) => DIJELOVI.filter((d) => RODITELJ.get(d.id) === id);
/* za odabir mišem: od pogođenog mesha prema roditeljima do prvog registriranog dijela iz podataka (najdublji pobjeđuje) */
function dioOd(o) {
  let p = o;
  while (p) { const id = p.userData && p.userData.dio; if (id && DIO_ID.has(id)) return id; p = p.parent; }
  return null;
}
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
const naziv = (id) => (nadjiDio(id) || {}).naziv || id;
/* naziv bez rednog broja i zagrade (npr. „Motor M1” → „Motor”) — za sažete popise */
const osnovnoIme = (n) => String(n).replace(/\s*\(.*\)\s*$/, '').replace(/\s+[A-Z]?\d+$/, '');

/* ================================================================== */
/* 2. Stanje i iscrtavanje na zahtjev                                 */
/* ================================================================== */
const st = { akt: null, skupina: null, otvorene: new Set(), samo: false, unutra: false, rastav: 0,
  pogonCilj: [0, 0, 0], pogonT: [0, 0, 0], voz: null, trake: false, tTrake: 0, sNosac: 0,
  led: 'plavo', signal: { crvena: 0, narancasta: 0, zelena: 1 }, reset: false, kut: [0, 0, 0], valjci: [0, 0, 0], poza: [0, 0, 0] };
const vidjeni = new Set();
const KLJUC = 'ftq-robotino-upoznavanje';
try { JSON.parse(localStorage.getItem(KLJUC) || '[]').forEach((x) => { if (DIO_ID.has(x)) vidjeni.add(x); }); } catch (e) { /* bez spremanja */ }
function spremi() { try { localStorage.setItem(KLJUC, JSON.stringify([...vidjeni])); } catch (e) { /* bez spremanja */ } }

let rafId = 0, crtati = false, zadnje = performance.now(), brojCrtanja = 0, zauzet = false, timerTrep = 0;
const dlg = $('tema-dlg');
function trazi() {
  crtati = true;
  if (!rafId && !document.hidden) { zadnje = performance.now(); rafId = requestAnimationFrame(okvir); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) trazi(); });

/* ================================================================== */
/* 3. Kamera: pogledi i let do dijela                                 */
/* ================================================================== */
const S = (x, y, z) => new THREE.Vector3(x, z, -y);                 /* KS robota → scena */
const POGLEDI = {
  foto: [S(-1.85, 2.0, 1.75), S(0.3, 0, 0.6)],
  sprijeda: [S(3.0, -1.9, 1.55), S(0.4, 0, 0.55)],
  odozgo: [S(0.33, 0, 2.75), S(0.35, 0, 0.3)],
  pogon: [S(0.62, 0.72, 0.36), S(0.17, 0.27, 0.12)],
  osnovica: [S(0.95, -0.75, 0.62), S(0, 0, 0.16)],
  unutra: [S(0.75, -0.6, 0.75), S(0, 0, 0.17)],
  rastavljen: [S(3.3, -2.8, 2.45), S(0.25, 0, 1.05)],
  vrh: [S(-1.0, 1.0, 1.5), S(0, 0, 1.06)],
  stanica: [S(ST_X - 0.75, -1.05, 0.75), S(ST_X - 0.05, 0, 0.1)]
};
const POGLED_SKUPINE = { 'Osnovica': 'osnovica', 'Pogon': 'pogon', 'Senzori': 'osnovica', 'Upravljačka jedinica': 'unutra', 'Napajanje': 'unutra', 'Nadogradnja CP-MR': 'vrh', 'Stanica za punjenje': 'stanica' };
const OPIS_POGLEDA = { foto: 'Pogled straga lijevo, kao na fotografiji robota u laboratoriju.', sprijeda: 'Pogled sprijeda: laserski skener, kontakt za punjenje i prihvat nosača.', odozgo: 'Pogled odozgo: os x robota gleda prema gore na zaslonu, stanica je ispred robota.', pogon: 'Pogled na pogonsku jedinicu 1 (naprijed lijevo).', stanica: 'Pogled na stanicu za punjenje s markerima za pristajanje.' };
let let_ = null;
function faktorOmjera() { return camera.aspect < 4 / 3 ? Math.pow((4 / 3) / camera.aspect, 0.75) : 1; }
function leti(poz, cilj, glatko = true) {
  if (!glatko) { let_ = null; camera.position.copy(poz); controls.target.copy(cilj); controls.update(); trazi(); return; }
  let_ = { t0: performance.now(), d: 850, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz.clone(), c1: cilj.clone() };
  trazi();
}
function pogled(ime, glatko = true) {
  const p = POGLEDI[ime] || POGLEDI.foto; const cilj = p[1].clone();
  const poz = cilj.clone().add(p[0].clone().sub(p[1]).multiplyScalar(faktorOmjera()));
  leti(poz, cilj, glatko);
}
function kutija(id) {
  const b = new THREE.Box3(); let ok = false;
  objektiDijela(id).forEach((o) => { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); if (!bb.isEmpty()) { b.union(bb); ok = true; } });
  return ok ? b : null;
}
function udaljenost(r) {
  const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
  return Math.max(0.45, r / Math.sin(Math.min(vf, hf) / 2) * 1.25);
}
function letiDoDijela(id) {
  const d = nadjiDio(id), b = kutija(id);
  if (!b) { pogled(POGLED_SKUPINE[d && d.skupina] || 'foto'); return; }
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.05, b.getSize(new THREE.Vector3()).length() / 2);
  let smjer;
  const p = POGLEDI[POGLED_SKUPINE[d.skupina]];
  const os = (d.skupina === 'Stanica za punjenje' && R.stanica) ? null : R.korijen.position;
  const h = os ? new THREE.Vector3(c.x - os.x, 0, c.z - os.z) : null;
  if (h && h.length() > 0.07) { h.normalize(); smjer = new THREE.Vector3(h.x, c.y < 0.06 ? 0.38 : 0.62, h.z).normalize(); }
  else smjer = p ? p[0].clone().sub(p[1]).normalize() : camera.position.clone().sub(controls.target).normalize();
  leti(c.clone().add(smjer.multiplyScalar(udaljenost(r))), c);
}

/* ================================================================== */
/* 4. Isticanje                                                       */
/* ================================================================== */
const skriveni = new Set();
function primijeniIsticanje() {
  skriveni.forEach((o) => { o.visible = true; }); skriveni.clear();
  const id = st.akt;
  R.istakni(id || null);
  if (id && st.samo) {
    const odabrani = new Set(); objektiDijela(id).forEach((o) => o.traverse((c) => { if (c.isMesh) odabrani.add(c); }));
    SVI.forEach((o) => { if (!odabrani.has(o) && o.visible) { o.visible = false; skriveni.add(o); } });
  }
  trazi();
}

/* ================================================================== */
/* 5. Izbornik (stablo)                                               */
/* ================================================================== */
function crtajStablo() {
  let h = '';
  SKUPINE.forEach((sk, si) => {
    const dio = dijeloviSkupine(sk); if (!dio.length) return;
    const otv = st.otvorene.has(sk), akt = st.skupina === sk && !st.akt;
    h += '<li class="r1"><button type="button" class="uz-st skupina' + (akt ? ' akt' : '') + '" data-sk="' + si + '" aria-expanded="' + otv + '"' + (akt ? ' aria-current="true"' : '') + '>' +
      '<span class="str" aria-hidden="true">' + (otv ? '▾' : '▸') + '</span><span class="t">' + esc(sk) + '</span><span class="br">' + dijeloviSkupine(sk).filter((d) => vidjeni.has(d.id)).length + '/' + dio.length + '</span></button></li>';
    if (!otv) return;
    dio.forEach((d) => {
      const a = st.akt === d.id, v = vidjeni.has(d.id);
      h += '<li class="r' + Math.min(4, 2 + (DUBINA.get(d.id) || 0)) + '"><button type="button" class="uz-st' + (a ? ' akt' : '') + '" data-id="' + d.id + '"' + (a ? ' aria-current="true"' : '') + '>' +
        '<span class="ok" aria-hidden="true">' + (v ? '✓' : '') + '</span><span class="t">' + esc(d.naziv) + '</span>' +
        (d.pretpostavka ? '<span class="pp" title="sadrži pretpostavku" aria-hidden="true"></span>' : '') + (v ? '<span class="vh">(pregledano)</span>' : '') + '</button></li>';
    });
  });
  $('stablo').innerHTML = h;
  $('brojac').textContent = vidjeni.size + ' / ' + DIJELOVI.length;
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
  if (st.otvorene.has(sk) && st.skupina === sk && !st.akt) { st.otvorene.delete(sk); crtajStablo(); return; }
  odaberiSkupinu(sk);
});

/* ================================================================== */
/* 6. Kartica                                                         */
/* ================================================================== */
const P = (...r) => r.map((t) => '<p>' + t + '</p>').join('');
function izvoriHtml(d) {
  const l = izvoriDijela(d); if (!l.length) return '';
  return 'Izvor: ' + l.map((x) => x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" title="Otvori izvor u novoj kartici">' + esc(x.kratica) + '</a>' : esc(x.kratica)).join(', ') +
    ' <span class="uz-vh">(otvara se u novoj kartici)</span> · <a href="#izvor-' + esc(l[0].kratica) + '">popis izvora</a>';
}
function temaGumbi(kljucevi) {
  const k = [...new Set(kljucevi.filter((x) => x && TEME[x]))];
  $('k-tema-g').innerHTML = k.map((x) => '<button type="button" class="gumb" data-tema="' + x + '">Kako radi: ' + esc(TEME[x].naslov) + '</button>').join('');
  $('k-tema-g').hidden = !k.length;
}
function cipovi(naslov, ids) {
  return ids.length ? '<p class="uz-dj-n">' + esc(naslov) + '</p><ul class="uz-dj">' + ids.map((id) => '<li><button type="button" class="cip" data-skok="' + id + '">' + esc(naziv(id)) + '</button></li>').join('') + '</ul>' : '';
}
function karticaUvod() {
  $('k-naziv').textContent = 'Upoznavanje robota';
  $('k-skupina').textContent = DIJELOVI.length + ' dijelova u ' + SKUPINE.length + ' skupina';
  $('k-tekst').innerHTML = P('U izborniku odaberi skupinu pa dio — ili klikni dio na modelu. Model se okrene prema odabranom dijelu i istakne ga, a ovdje dobiješ opis, podatke i izvor.',
    'Narančasta točka u izborniku označava dio kod kojeg je nešto procijenjeno (vidi odjeljak „Što je pretpostavka”). Uz pregledani dio pojavi se kvačica.');
  $('k-podaci').hidden = true; $('k-izvor').hidden = true; $('k-pretp').innerHTML = '';
  temaGumbi([]);
  $('k-djeca').innerHTML = cipovi('Skupine:', []) + '<ul class="uz-dj">' + SKUPINE.map((s, i) => '<li><button type="button" class="cip" data-skup="' + i + '">' + esc(s) + '</button></li>').join('') + '</ul>';
  $('k-prije').disabled = true; $('k-dalje').disabled = false;
  $('naslov-3d').textContent = 'Robotino';
}
function karticaDio(d) {
  $('k-naziv').textContent = d.naziv;
  const rod = RODITELJ.get(d.id);
  $('k-skupina').textContent = d.skupina + (rod ? ' · ' + naziv(rod) : '');
  $('k-tekst').innerHTML = P(esc(d.opis));
  const pod = d.podaci || [];
  $('k-podaci').innerHTML = pod.map(([o, v]) => '<dt>' + esc(o) + '</dt><dd>' + esc(v) + '</dd>').join('');
  $('k-podaci').hidden = !pod.length;
  $('k-pretp').innerHTML = d.pretpostavka ? '<p class="uz-pretp"><b>Pretpostavka:</b> ' + esc(d.napomena || 'dio podataka ili izgleda je procijenjen.') + '</p>' : (d.napomena ? '<p class="uz-pretp"><b>Napomena:</b> ' + esc(d.napomena) + '</p>' : '');
  const iz = izvoriHtml(d); $('k-izvor').innerHTML = iz; $('k-izvor').hidden = !iz;
  temaGumbi([d.tema]);
  const dj = djeca(d.id).map((x) => x.id);
  $('k-djeca').innerHTML = (dj.length ? cipovi('Dijelovi ovog sklopa:', dj) : '') + (rod ? cipovi('Sklop:', [rod]) : '');
  const i = INDEKS.get(d.id); $('k-prije').disabled = false; $('k-dalje').disabled = i === DIJELOVI.length - 1;
  $('naslov-3d').textContent = d.naziv;
}
function karticaSkupina(sk) {
  const dio = dijeloviSkupine(sk);
  $('k-naziv').textContent = sk;
  $('k-skupina').textContent = 'Skupina · ' + dio.length + ' dijelova';
  $('k-tekst').innerHTML = P('Odaberi dio skupine u izborniku ili ispod. Skupina se u izborniku otvara i zatvara klikom na njezin naziv.');
  $('k-podaci').hidden = true; $('k-izvor').hidden = true;
  const pp = dio.filter((d) => d.pretpostavka).length;
  $('k-pretp').innerHTML = pp ? '<p class="uz-pretp"><b>Pretpostavke:</b> ' + pp + ' od ' + dio.length + ' dijelova ove skupine sadrži procijenjeni podatak ili izgled.</p>' : '';
  temaGumbi(dio.map((d) => d.tema));
  $('k-djeca').innerHTML = cipovi('Dijelovi u ovoj skupini:', dio.map((d) => d.id));
  $('k-prije').disabled = false; $('k-dalje').disabled = false;
  $('naslov-3d').textContent = sk;
}
const opis = (t) => { $('z-opis').textContent = t; };
function odaberiDio(id, opc = {}) {
  const d = nadjiDio(id); if (!d) return;
  st.akt = id; st.skupina = d.skupina; st.otvorene.add(d.skupina);
  vidjeni.add(id); spremi();
  karticaDio(d); crtajStablo(); pomakniUPopis();
  primijeniIsticanje();
  if (opc.let !== false) letiDoDijela(id);
}
function odaberiSkupinu(sk) {
  st.akt = null; st.skupina = sk; st.otvorene.add(sk);
  karticaSkupina(sk); crtajStablo(); primijeniIsticanje();
  pogled(POGLED_SKUPINE[sk] || 'foto');
}
/* prikaz cijelog robota bez isticanja (za radnje koje se odnose na cijeli robot); sk = skupina čija se kartica prikazuje */
function cijeliRobot(sk) {
  if (!st.akt && (!sk || st.skupina === sk)) return;
  st.akt = null;
  if (sk) { st.skupina = sk; st.otvorene.add(sk); karticaSkupina(sk); } else if (st.skupina) karticaSkupina(st.skupina); else karticaUvod();
  crtajStablo(); primijeniIsticanje();
}
$('k-prije').addEventListener('click', () => {
  if (st.akt) { const i = INDEKS.get(st.akt); if (i > 0) odaberiDio(DIJELOVI[i - 1].id); else { st.akt = null; st.skupina = null; karticaUvod(); crtajStablo(); primijeniIsticanje(); pogled('foto'); } }
  else if (st.skupina) { const prvi = dijeloviSkupine(st.skupina)[0]; const i = INDEKS.get(prvi.id); if (i > 0) odaberiDio(DIJELOVI[i - 1].id); else { st.skupina = null; karticaUvod(); crtajStablo(); pogled('foto'); } }
});
$('k-dalje').addEventListener('click', () => {
  if (st.akt) { const i = INDEKS.get(st.akt); if (i < DIJELOVI.length - 1) odaberiDio(DIJELOVI[i + 1].id); }
  else if (st.skupina) odaberiDio(dijeloviSkupine(st.skupina)[0].id);
  else odaberiDio(DIJELOVI[0].id);
});
$('kartica').addEventListener('click', (e) => {
  const s = e.target.closest('[data-skok]'); if (s) { odaberiDio(s.dataset.skok); return; }
  const g = e.target.closest('[data-skup]'); if (g) { odaberiSkupinu(SKUPINE[+g.dataset.skup]); return; }
  const t = e.target.closest('[data-tema]'); if (t) otvoriTemu(t.dataset.tema, t);
});

/* ================================================================== */
/* 7. „Kako radi” — animacije iz teme_robotino.js u dijalogu           */
/* ================================================================== */
function podaciZaTeme() {
  const m = POGON.motor, rd = POGON.reduktor, ir = SENZORI.ir, L = SENZORI.laser || {};
  const hok = L['hokuyo-urg04'], nano = L['sick-nanoscan3'];
  const o = {
    generacija: KONFIG.generacija, gear: POGON.gear, rw: POGON.rw, rb: POGON.rb,
    rbPretp: PR.some((p) => /^Udaljenost središte–kotač rb/.test(p.sto)), nMotMax: POGON.nMotMax,
    kutovi: MJERE.kutoviKotaca.slice(), promjer: MJERE.promjerOsnovice, enkImp: POGON.impulsaPoOkr, enkInk: POGON.inkPoOkr,
    motor: { tip: m.tip, U: m.napon, nNaz: m.nazivnaBrzina, MNaz: Math.round(m.nazivniMoment * 1000) / 10, INaz: m.nazivnaStruja, n0: m.brzinaPraznogHoda, Mpot: Math.round(m.potezniMoment * 1000) / 10 },
    reduktor: { tip: rd.tip, eta: rd.eta, Mtrajni: Math.round(rd.trajniMoment * 100), stupnjevi: rd.stupnjeva },
    remen: POGON.remen.tip,
    pi: { f: POGON.regulator.f, K: POGON.regulator.K, Ki: POGON.regulator.Ki, umax: POGON.regulator.izlazMax },
    ir: { tip: ir.tip, broj: ir.broj, razmak: ir.razmak, dMin: ir.dometMin, dMax: ir.dometMax },
    odbojnik: SENZORI.odbojnik.tip, opticki: SENZORI.opticki.tip,
    rest: POGON.periodNaredbe.rest * 1000, api2: POGON.periodNaredbe.api2 * 1000,
    stanica: { sirina: MJERE.stanica.sirina }
  };
  if (SENZORI.ziroskopi) o.ziro = { R4: SENZORI.ziroskopi.R4.tip, R3: SENZORI.ziroskopi.R3.tip };
  if (hok) o.hokuyo = { tip: hok.naziv, kut: hok.kutMax - hok.kutMin, korak: hok.razlucivost, f: hok.f, dMin: hok.dometMin, dMax: hok.domet };
  if (nano) o.nano = { tip: nano.naziv, kut: nano.kutMax - nano.kutMin, odziv: Math.round((nano.odziv || 0) * 1000), zastitnoMax: nano.domet };
  return o;
}
postaviPodatke(podaciZaTeme());
let tema = null, povratak = null;
function unistiTemu() { if (tema && tema.unisti) { try { tema.unisti(); } catch (e) { /* ništa */ } } tema = null; $('tema-el').innerHTML = ''; }
function otvoriTemu(kljuc, izvor) {
  if (!TEME[kljuc]) return;
  unistiTemu(); povratak = izvor || null;
  if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
  $('tema-naslov').textContent = 'Kako radi: ' + TEME[kljuc].naslov;
  dlg.dataset.tema = kljuc;
  const kut = document.createElement('div'); kut.className = 'uz-tema-kut'; $('tema-el').appendChild(kut);
  try { tema = prikazi(kut, kljuc) || null; } catch (e) { console.warn('Tema', kljuc, e); $('tema-el').innerHTML = '<p class="pom">Animacija „Kako radi” trenutačno nije dostupna.</p>'; tema = null; }
  dlg.scrollTop = 0;
}
function zatvoriTemu() { if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); } naZatvaranje(); }
function naZatvaranje() {
  if (!dlg.dataset.tema && !tema) return;
  unistiTemu(); delete dlg.dataset.tema; if (povratak && document.contains(povratak)) povratak.focus(); povratak = null; trazi();
}
dlg.addEventListener('close', naZatvaranje);
$('tema-zatvori').addEventListener('click', zatvoriTemu);
dlg.addEventListener('click', (e) => { if (e.target === dlg) zatvoriTemu(); });
/* popis svih animacija */
{
  const kljucevi = Object.keys(TEME);
  $('teme-popis').innerHTML = kljucevi.map((k) => {
    const dio = DIJELOVI.filter((d) => d.tema === k);
    const imena = [...new Set(dio.map((d) => osnovnoIme(d.naziv)))];
    return '<li><button type="button" data-tema="' + k + '"><b>' + esc(TEME[k].naslov) + '</b>' + (TEME[k].engl ? '<span class="e">' + esc(TEME[k].engl) + '</span>' : '') +
      '<span class="d">' + (imena.length ? 'Dijelovi: ' + esc(imena.slice(0, 4).join(', ')) + (imena.length > 4 ? ' i još ' + (imena.length - 4) : '') : 'Opća tema') + '</span></button></li>';
  }).join('');
  $('teme-broj').textContent = kljucevi.length + ' animacija';
  $('teme-popis').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if (b) otvoriTemu(b.dataset.tema, b); });
}

/* ================================================================== */
/* 8. Miš u 3D: oblačić i klik                                        */
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
  return { id: prvi.object.userData.dioId, x: x - r.left, y: y - r.top };
}
let zadnjiHover = 0, dolje = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y) > 4) { oblacic.hidden = true; return; }
  if (e.pointerType === 'touch') return;
  const t = performance.now(); if (t - zadnjiHover < 70) return; zadnjiHover = t;
  const p = pogodak(e.clientX, e.clientY);
  if (!p) { oblacic.hidden = true; renderer.domElement.style.cursor = ''; return; }
  oblacic.textContent = naziv(p.id); oblacic.hidden = false;
  const w = scenaEl.clientWidth; oblacic.style.left = Math.max(4, Math.min(p.x + 14, w - oblacic.offsetWidth - 6)) + 'px'; oblacic.style.top = Math.max(4, p.y - 34) + 'px';
  renderer.domElement.style.cursor = 'pointer';
});
renderer.domElement.addEventListener('pointerleave', () => { oblacic.hidden = true; });
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dolje) return; const pomak = Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y); dolje = null;
  if (pomak > 5) return;
  const p = pogodak(e.clientX, e.clientY); if (p) { oblacic.hidden = true; odaberiDio(p.id); }
});

/* ================================================================== */
/* 9. Gumbi: pogledi, rastavljanje, unutrašnjost, pogonske jedinice    */
/* ================================================================== */
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => { pogled(b.dataset.pogled); opis(OPIS_POGLEDA[b.dataset.pogled] || ''); }));
const klizac = $('r-rastavi');
function postaviRastav(v) {
  st.rastav = Math.max(0, Math.min(1, v)); R.rastavi(st.rastav);
  klizac.value = String(Math.round(st.rastav * 100)); $('r-rastavi-v').textContent = Math.round(st.rastav * 100) + ' %';
  trazi();
}
klizac.addEventListener('input', () => {
  const prije = st.rastav; postaviRastav(+klizac.value / 100);
  if (prije === 0 && st.rastav > 0) cijeliRobot();
  if (prije === 0 && st.rastav > 0) opis('Robot se rastavlja: obod, pokrovi, ploče, upravljačka jedinica i nadogradnja razmiču se prema gore, pogonske jedinice i baterije radijalno prema van.');
});
klizac.addEventListener('change', () => { if (st.rastav > 0.5 && !st.akt) pogled('rastavljen'); });
function postaviUnutra(v) { st.unutra = !!v; R.unutrasnjost(st.unutra); $('r-unutra').setAttribute('aria-pressed', String(st.unutra)); trazi(); }
$('r-unutra').addEventListener('click', () => {
  postaviUnutra(!st.unutra);
  if (st.unutra) { cijeliRobot(); pogled('unutra'); opis('Pokrovi su poluprozirni — vide se pogonske jedinice, baterije i upravljačka jedinica.'); } else opis('Pokrovi su ponovno neprozirni.');
});
$('r-samo').addEventListener('change', () => { st.samo = $('r-samo').checked; primijeniIsticanje(); });
/* gumbi pogonskih jedinica iz podataka (nazivi pogonskih jedinica) */
const JED = MJERE.kutoviKotaca.map((th, i) => 'pogonskaJedinica' + (i + 1));
$('jed-gumbi').innerHTML = JED.map((id, i) => '<button type="button" class="gumb tanki" data-jed="' + i + '" aria-pressed="false" aria-label="Rastavi: ' + esc(naziv(id)) + '">' + (i + 1) + '</button>').join('');
function oznaciJed() { document.querySelectorAll('[data-jed]').forEach((b) => b.setAttribute('aria-pressed', String(st.pogonCilj[+b.dataset.jed] === 1))); }
function letiDoJedinice(i) {
  const t0 = st.pogonT[i]; R.rastaviPogon(i, 1);
  const b = kutija(JED[i]); R.rastaviPogon(i, ease(t0));
  if (!b) return;
  const c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() / 2;
  const h = new THREE.Vector3(c.x - R.korijen.position.x, 0, c.z - R.korijen.position.z).normalize();
  const bok = new THREE.Vector3(-h.z, 0, h.x);
  const smjer = h.clone().multiplyScalar(0.8).add(bok.multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.55, 0)).normalize();
  leti(c.clone().add(smjer.multiplyScalar(udaljenost(r) * 1.05)), c);
}
document.getElementById('jed-gumbi').addEventListener('click', (e) => {
  const b = e.target.closest('[data-jed]'); if (!b) return; const i = +b.dataset.jed;
  st.pogonCilj[i] = st.pogonCilj[i] ? 0 : 1; oznaciJed();
  if (st.pogonCilj[i]) {
    odaberiDio(JED[i], { let: false });
    letiDoJedinice(i);
    const sastav = djeca(JED[i]).map((x) => osnovnoIme(x.naziv).toLowerCase());
    opis(naziv(JED[i]) + ' se rastavlja duž osi' + (sastav.length ? ': ' + sastav.join(', ') : '') + '.');
  } else opis(naziv(JED[i]) + ' se sklapa.');
  trazi();
});
function korakPogona(dt) {
  let ide = false;
  for (let i = 0; i < 3; i++) {
    const c = st.pogonCilj[i], s = st.pogonT[i];
    if (Math.abs(c - s) > 1e-4) { const n = s + Math.sign(c - s) * Math.min(Math.abs(c - s), dt * 1.1); st.pogonT[i] = n; R.rastaviPogon(i, ease(n)); ide = true; }
  }
  return ide;
}

/* ================================================================== */
/* 10. Pokazna vožnja (inverzna kinematika → kotači)                   */
/* ================================================================== */
const VOZNJE = {
  naprijed: { v: [0.25, 0, 0], T: 2.2, opis: 'Vožnja naprijed (vx > 0) pa natrag. Kotač 2 (straga, 180°) ima smjer vožnje okomit na os x, pa njegov motor miruje, a njegovi se valjci kotrljaju.' },
  bocno: { v: [0, 0.25, 0], T: 2.2, opis: 'Bočna vožnja ulijevo (vy > 0) pa natrag, bez zakretanja: sva tri motora rade, kotač 2 najbrže.' },
  okret: { v: [0, 0, 1.2], T: 2.4, opis: 'Okret na mjestu (ω > 0, suprotno od kazaljke) pa natrag: sva tri motora imaju istu brzinu i isti smjer.' }
};
function pokreniVoznju(tip) {
  const V = VOZNJE[tip]; if (!V) return;
  const o = K.ogranici(V.v[0], V.v[1], V.v[2], POGON.ogranicenja || {});
  st.voz = { tip, t: 0, T: V.T, v: [o.vx, o.vy, o.w] };
  st.poza = [0, 0, 0];
  cijeliRobot('Pogon');
  document.querySelectorAll('[data-voz]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.voz === tip)));
  $('v-stani').disabled = false; $('osi').hidden = false;
  opis(V.opis);
  trazi();
}
function staniVoznju(tekst) {
  if (!st.voz) return;
  st.voz = null; st.poza = [0, 0, 0]; R.postaviPozu(0, 0, 0);
  document.querySelectorAll('[data-voz]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  $('v-stani').disabled = true; $('osi').hidden = true;
  if (tekst) opis(tekst);
  trazi();
}
const fmtV = (x, d, w = 7) => br(x, d).padStart(w);
function korakVoznje(dt) {
  const V = st.voz; if (!V) return false;
  V.t += dt;
  const u = V.t / V.T, faza = u < 1 ? 1 : -1, s = Math.sin(Math.PI * (u < 1 ? u : u - 1));
  const [vx, vy, w] = u >= 2 ? [0, 0, 0] : V.v.map((x) => x * s * faza);
  const m = K.inverzna(vx, vy, w), rv = K.brzineValjaka(vx, vy, w), rr = MJERE.valjci.promjer / 2;
  for (let i = 0; i < 3; i++) { st.kut[i] += K.kutKotaca(m[i], dt); st.valjci[i] += rv[i] / rr * dt; }
  R.postaviKotace(st.kut, st.valjci);
  const [x, y, f] = st.poza, [vxs, vys] = K.uSvijet(x, y, f, vx, vy);
  st.poza = [x + vxs * dt, y + vys * dt, f + w * dt];
  R.postaviPozu(...st.poza);
  $('osi').textContent = 'vx ' + fmtV(vx, 2, 6) + ' m/s   vy ' + fmtV(vy, 2, 6) + ' m/s   ω ' + fmtV(w, 2, 6) + ' rad/s\n' +
    'm1 ' + fmtV(m[0], 0) + '   m2 ' + fmtV(m[1], 0) + '   m3 ' + fmtV(m[2], 0) + '  1/min';
  if (u >= 2) { staniVoznju('Gotovo — robot se vratio u početni položaj.'); return true; }
  return true;
}
document.querySelectorAll('[data-voz]').forEach((b) => b.addEventListener('click', () => pokreniVoznju(b.dataset.voz)));
$('v-stani').addEventListener('click', () => staniVoznju('Vožnja zaustavljena, robot je vraćen u početni položaj.'));

/* ================================================================== */
/* 11. Trake prihvata, signalni stup, tipkalo, lampica RESET           */
/* ================================================================== */
const imaPrihvat = !!nadjiDio('prihvatNosaca');
if (!imaPrihvat) $('t-trake').disabled = true;
$('t-trake').addEventListener('click', () => {
  st.trake = !st.trake; $('t-trake').setAttribute('aria-pressed', String(st.trake)); $('t-trake').textContent = st.trake ? 'Zaustavi trake' : 'Pokreni trake';
  if (st.trake) { cijeliRobot('Nadogradnja CP-MR'); pogled('vrh'); opis('Trake prihvata pomiču nosač izratka po prihvatu, naizmjence prema jednom i drugom kraju.'); } else opis('Trake su zaustavljene.');
  trazi();
});
function korakTraka(dt) {
  if (!st.trake) return false;
  st.tTrake += dt;
  const s = 0.15 * Math.sin(2 * Math.PI * st.tTrake / 6);
  st.sNosac = s; R.postaviNosac(s, true); R.trake(s);
  return true;
}
/* stanja signalnog stupa složena iz podataka segmenata (redci „Stalno” i „Treperi”) */
const SEG = [['svjetloCrveno', 'crvena', '#E0533D'], ['svjetloNarancasto', 'narancasta', '#F2A51A'], ['svjetloZeleno', 'zelena', '#2BB673']];
const SIG_STANJA = [];
SEG.forEach(([id, kl, boja]) => {
  const d = nadjiDio(id); if (!d) return;
  (d.podaci || []).forEach(([o, v]) => {
    const nacin = /^stalno/i.test(o) ? 1 : /^trep/i.test(o) ? 'treperi' : null;
    if (nacin != null) SIG_STANJA.push({ id, kl, boja, nacin, tekst: v, oznaka: o, seg: d.naziv });
  });
});
$('sig-gumbi').innerHTML = SIG_STANJA.map((s, i) => '<button type="button" class="gumb tanki uz-sig" data-sig="' + i + '" aria-pressed="false" title="' + esc(s.seg + ' — ' + s.oznaka.toLowerCase()) + '"><i class="' + (s.nacin === 'treperi' ? 'trep' : '') + '" style="background:' + s.boja + '" aria-hidden="true"></i> ' + esc(s.tekst) + '<span class="uz-vh"> (' + esc(s.seg + ', ' + s.oznaka.toLowerCase()) + ')</span></button>').join('') +
  '<button type="button" class="gumb tanki" data-sig="-1" aria-pressed="false">Ugašen</button>';
if (!SIG_STANJA.length) $('sig-gumbi').closest('.uz-traka').hidden = true;
function primijeniSvjetla() { R.signalniStup(st.signal); R.tipkalo(st.led); R.lampicaReset(st.reset); trazi(); }
function oznaciSignal(i) { document.querySelectorAll('[data-sig]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.sig === i))); }
$('sig-gumbi').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sig]'); if (!b) return; const i = +b.dataset.sig;
  st.signal = { crvena: 0, narancasta: 0, zelena: 0 };
  if (i >= 0) { const s = SIG_STANJA[i]; st.signal[s.kl] = s.nacin; opis(s.seg + ' ' + (s.nacin === 'treperi' ? 'treperi' : 'svijetli stalno') + ': ' + s.tekst + '.'); }
  else opis('Signalni stup je ugašen.');
  oznaciSignal(i);
  cijeliRobot('Nadogradnja CP-MR'); primijeniSvjetla(); pogled('vrh');
});
document.querySelectorAll('[data-led]').forEach((b) => b.addEventListener('click', () => {
  st.led = b.dataset.led; document.querySelectorAll('[data-led]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  cijeliRobot('Upravljačka jedinica'); primijeniSvjetla();
  const id = nadjiDio('glavnoTipkalo') ? 'glavnoTipkalo' : null;
  if (id) { const bx = kutija(id); if (bx) { const c = bx.getCenter(new THREE.Vector3()); leti(c.clone().add(new THREE.Vector3(-0.5, 0.55, -0.45)), c); } }
  opis({ ugaseno: 'LED prsten glavnog tipkala je ugašen.', plavo: 'LED prsten glavnog tipkala svijetli.', treperi: 'LED prsten glavnog tipkala treperi.' }[st.led]);
}));
$('l-reset').addEventListener('click', () => {
  st.reset = !st.reset; $('l-reset').setAttribute('aria-pressed', String(st.reset));
  cijeliRobot('Nadogradnja CP-MR'); primijeniSvjetla();
  const id = nadjiDio('tipkaloReset') ? 'tipkaloReset' : 'kutijaResetStart';
  const bx = kutija(id); if (bx) { const c = bx.getCenter(new THREE.Vector3()); leti(c.clone().add(new THREE.Vector3(-0.75, 0.35, 0.25)), c); }
  opis(st.reset ? 'Lampica tipkala RESET svijetli.' : 'Lampica tipkala RESET je ugašena.');
});
function trepce() { return st.led === 'treperi' || Object.values(st.signal).some((v) => v === 'treperi'); }
/* početno stanje */
function pocetno() {
  staniVoznju(); st.trake = false; $('t-trake').setAttribute('aria-pressed', 'false'); $('t-trake').textContent = 'Pokreni trake';
  st.tTrake = 0; st.sNosac = 0; R.postaviNosac(0, true); R.trake(0);
  st.kut = [0, 0, 0]; st.valjci = [0, 0, 0]; R.postaviKotace(st.kut, st.valjci);
  postaviRastav(0); postaviUnutra(false);
  st.pogonCilj = [0, 0, 0]; st.pogonT = [0, 0, 0]; for (let i = 0; i < 3; i++) R.rastaviPogon(i, 0); oznaciJed();
  st.signal = { crvena: 0, narancasta: 0, zelena: 1 }; st.led = 'plavo'; st.reset = false;
  const zel = SIG_STANJA.findIndex((s) => s.kl === 'zelena' && s.nacin === 1); oznaciSignal(zel);
  document.querySelectorAll('[data-led]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.led === 'plavo')));
  $('l-reset').setAttribute('aria-pressed', 'false');
  $('osi').hidden = true;
  primijeniSvjetla();
}
$('r-pocetno').addEventListener('click', () => { pocetno(); pogled('foto'); opis('Vraćeno početno stanje: robot sklopljen, svjetla i trake u mirovanju.'); });

/* ================================================================== */
/* 12. Odjeljci: podaci, pretpostavke, izvori                          */
/* ================================================================== */
const prZa = (sto) => PR.find((p) => !p.id && p.sto === sto) || null;
function red(id, re) { const d = nadjiDio(id); if (!d) return null; const r = (d.podaci || []).find(([o]) => re.test(o)); return r ? { v: r[1], izvor: d.izvor, dio: d } : null; }
function oznaka(r) {
  const p = r.sto ? prZa(r.sto) : null;
  if (p) return '<span class="uz-oz' + (p.vrsta === 'sukob' ? ' sukob' : '') + '">' + (p.vrsta === 'sukob' ? 'sukob izvora' : 'pretpostavka') + '</span>';
  if (r.dio && r.dio.pretpostavka && r.ppDio) return '<span class="uz-oz">pretpostavka</span>';
  return '';
}
const izvLink = (s) => [...new Set(String(s || '').split(',').map((k) => k.trim()).filter(Boolean))].map((k) => '<a href="#izvor-' + esc(k) + '">[' + esc(k) + ']</a>').join(' ');
function tablica(naslov, redovi) {
  const r = redovi.filter((x) => x && x.v != null && x.v !== '');
  if (!r.length) return '';
  return '<div class="uz-tbl-omot"><table class="tbl uz-tbl"><caption>' + esc(naslov) + '</caption><thead><tr><th scope="col">Podatak</th><th scope="col">Vrijednost</th><th scope="col">Izvor</th></tr></thead><tbody>' +
    r.map((x) => '<tr><td>' + esc(x.o) + '</td><td>' + esc(x.v) + oznaka(x) + '</td><td>' + izvLink(x.izvor) + '</td></tr>').join('') + '</tbody></table></div>';
}
const R_ = (o, id, re, dod = {}) => { const r = red(id, re); return r ? Object.assign({ o }, r, dod) : null; };
const rediDijela = (id, filtar) => { const d = nadjiDio(id); return d ? (d.podaci || []).filter(([o]) => !filtar || filtar.test(o)).map(([o, v]) => ({ o, v, izvor: d.izvor })) : []; };
function crtajPodatke() {
  const m = POGON.motor, rd = POGON.reduktor, en = POGON.enkoder, rg = POGON.regulator, ir = SENZORI.ir;
  const L = KONFIG.laser && SENZORI.laser ? SENZORI.laser[KONFIG.laser] : null;
  const KA = KONFIG.kamera && SENZORI.kamera ? SENZORI.kamera[KONFIG.kamera] : null;
  const vTeor = POGON.nMotMax / POGON.gear / 60 * 2 * Math.PI * POGON.rw;
  const vSukob = prZa('Najveća brzina robota');
  const t1 = tablica('Mjere i masa', [
    { o: 'Promjer osnovice', v: mm(MJERE.promjerOsnovice), izvor: (nadjiDio('sasija') || {}).izvor, sto: 'Promjer osnovice' },
    R_('Visina osnovice', 'sasija', /^Visina/),
    R_('Visina s nadogradnjom', 'prihvatNosaca', /^Visina s/),
    R_('Širina s nadogradnjom', 'prihvatNosaca', /^Širina/),
    R_('Masa osnovice', 'sasija', /^Masa/),
    R_('Nosivost osnovice', 'sasija', /^Nosivost/),
    R_('Masa tornja', 'toranj', /^Masa/),
    R_('Masa transportne jedinice', 'nosacPrihvata', /^Masa/),
    R_('Materijal kućišta', 'sasija', /^Materijal/),
    R_('Zaštita', 'sasija', /^Zaštita/),
    R_('Izvedba nadogradnje', 'prihvatNosaca', /^Varijanta/)
  ]);
  const t2 = tablica('Pogon i brzina', [
    { o: 'Pogon', v: 'holonomski, ' + MJERE.kutoviKotaca.length + ' svesmjerna kotača na ' + MJERE.kutoviKotaca.join('°, ') + '° od osi x', izvor: (nadjiDio('pogonskaJedinica1') || {}).izvor },
    { o: 'Polumjer kotača rw', v: mm(POGON.rw), izvor: (nadjiDio('kotac1') || {}).izvor, sto: 'Polumjer kotača rw' },
    { o: 'Udaljenost središte–kotač rb', v: mm(POGON.rb), izvor: 'HABR', sto: 'Udaljenost središte–kotač rb' },
    { o: 'Motor', v: m.tip + ', ' + m.vrsta + ', klasa ' + m.klasa, izvor: m.izvor },
    { o: 'Najveća brzina motora', v: POGON.nMotMax + ' 1/min', izvor: 'R4-MAN' },
    { o: 'Prijenos motor → kotač', v: POGON.gear + ' : 1 (' + rd.tip + ', zupčasti remen ' + POGON.remen.tip + ')', izvor: rd.izvor + ', ' + POGON.remen.izvor },
    { o: 'Enkoder', v: en.tip + ', ' + en.inkPoOkr + ' inkremenata po okretaju motora', izvor: en.izvor },
    { o: 'Regulator brzine motora', v: rg.tip + ', ' + br(rg.f / 1000, 1) + ' kHz, K = ' + br(rg.K, 3) + ', Ki = ' + br(rg.Ki, 3), izvor: rg.izvor },
    { o: 'Najveća brzina robota', v: (vSukob ? vSukob.vrijednost + '; ' : '') + 'teorijski ' + br(vTeor, 2) + ' m/s obodno', izvor: 'R4-MAN, CPMR-C', sto: 'Najveća brzina robota' }
  ]);
  const t3 = tablica('Senzori', [
    { o: 'Senzori udaljenosti', v: ir.broj + ' × ' + ir.tip + ', razmak ' + ir.razmak + '°, ' + br(ir.dometMin * 100, 1) + '–' + br(ir.dometMax * 100, 1) + ' cm', izvor: ir.izvor },
    { o: 'Odbojnik', v: SENZORI.odbojnik.tip + ' (' + SENZORI.odbojnik.nacelo + ')', izvor: SENZORI.odbojnik.izvor },
    SENZORI.ziroskop ? { o: 'Žiroskop', v: SENZORI.ziroskop.tip + ' (' + SENZORI.ziroskop.mjesto + ')', izvor: SENZORI.ziroskop.izvor } : null,
    { o: 'Optički senzori', v: SENZORI.opticki.broj + ' × ' + SENZORI.opticki.tip + ', ' + SENZORI.opticki.ulaz, izvor: SENZORI.opticki.izvor },
    { o: 'Induktivni senzor', v: 'kat. br. ' + SENZORI.induktivni.katBr + ', ' + SENZORI.induktivni.ulaz, izvor: SENZORI.induktivni.izvor },
    L ? { o: 'Laserski skener', v: L.naziv + ', ' + br(L.kutMax - L.kutMin, 1) + '°, ' + br(L.dometMin, 2) + '–' + br(L.domet, 1) + ' m, ' + L.f + ' Hz', izvor: L.izvor, dio: nadjiDio('laserSkener'), ppDio: true } : null,
    KA ? { o: 'Kamera', v: KA.naziv + ' (' + KA.opis + '), ' + KA.sucelje, izvor: KA.izvor, dio: nadjiDio('kamera'), ppDio: true } : null
  ]);
  const t4 = tablica('Upravljačka jedinica', [
    ...rediDijela('upravljackaJedinica'),
    ...rediDijela('ioPloca', /^(Digitalni|Analogni|Releji)/),
    R_('WLAN', 'wlan', /^Pojas/)
  ]);
  const t5 = tablica('Napajanje i stanica za punjenje', [
    ...rediDijela('baterija1', /^(Napon|Spoj|Punjenje)/).map((x) => Object.assign(x, { o: 'Baterije: ' + x.o.toLowerCase(), dio: nadjiDio('baterija1'), ppDio: true })),
    R_('Rad po paketu baterija', 'baterija2', /^Rad/),
    R_('Stanica: snaga', 'stanica', /^Snaga/),
    R_('Stanica: mjere', 'stanica', /^Mjere/),
    R_('Stanica: masa', 'stanica', /^Masa/),
    R_('Kontakt za punjenje: polova', 'kontaktPunjenja', /^Polova/, { ppDio: true })
  ]);
  $('podaci-in').innerHTML = t1 + t2 + t3 + t4 + t5;
  $('podaci-nap').innerHTML = 'Oznaka <span class="uz-oz">pretpostavka</span> znači procijenjenu vrijednost, a <span class="uz-oz sukob">sukob izvora</span> da se izvori ne slažu — objašnjenja su u odjeljku <a href="#pretpostavke">Što je pretpostavka</a>. Opisi i podaci svakog dijela su u kartici uz 3D prikaz.';
}
function sIzvorima(t) { return esc(t).replace(/\[([A-Z0-9-]+)\]/g, (s, k) => IZVORI[k] ? '<a href="#izvor-' + k + '">[' + k + ']</a>' : s); }
function crtajPretpostavke() {
  const sukobi = PR.filter((p) => p.vrsta === 'sukob'), vrij = PR.filter((p) => p.vrsta !== 'sukob' && !p.id), dij = PR.filter((p) => p.vrsta !== 'sukob' && p.id);
  $('pretp-uvod').innerHTML = '<p>' + esc(TEKST_PRETPOSTAVKE) + '</p><p><strong>Vrijednosti će se ažurirati kad budu poznati točni podaci robota u laboratoriju</strong> — popis ispod nastaje sam iz podataka, pa potvrđena vrijednost s njega nestane.</p>' +
    '<p class="pom">Ukupno: ' + sukobi.length + ' nesuglasja izvora, ' + vrij.length + ' procijenjenih vrijednosti i ' + dij.length + ' dijelova s procijenjenim izgledom ili položajem.</p>';
  const tbl = (naslov, l, sDijelom) => l.length ? '<div class="uz-tbl-omot"><table class="tbl uz-pr"><caption>' + esc(naslov) + ' (' + l.length + ')</caption><thead><tr><th scope="col">' + (sDijelom ? 'Dio' : 'Podatak') + '</th>' + (sDijelom ? '' : '<th scope="col">Korištena vrijednost</th>') + '<th scope="col">Napomena</th></tr></thead><tbody>' +
    l.map((p) => '<tr><td>' + (sDijelom ? '<button type="button" class="pok" data-pokazi="' + esc(p.id) + '">' + esc(p.sto) + '</button>' : esc(p.sto)) + '</td>' + (sDijelom ? '' : '<td>' + esc(p.vrijednost) + '</td>') + '<td>' + sIzvorima(p.napomena) + '</td></tr>').join('') +
    '</tbody></table></div>' : '';
  $('pretp-tablice').innerHTML = tbl('Sukobi izvora', sukobi, false) + tbl('Procijenjene vrijednosti', vrij, false) + tbl('Dijelovi s procijenjenim izgledom ili položajem', dij, true);
  $('pretp-tablice').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pokazi]'); if (!b) return;
    odaberiDio(b.dataset.pokazi); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
const IZDAVACI = { 'ip.festo-didactic.com': 'Festo Didactic InfoPortal', 'www.festo.com': 'Festo — katalog Factory Automation', 'wiki.openrobotino.org': 'OpenRobotino wiki', 'doc.openrobotino.org': 'OpenRobotino dokumentacija', 'forum.openrobotino.org': 'OpenRobotino forum', 'en.wikipedia.org': 'Wikipedia' };
function opisUrl(u) {
  try {
    const x = new URL(u), iz = IZDAVACI[x.hostname];
    let put = decodeURIComponent(x.pathname).replace(/\/(index\.html?)?$/, '').replace(/\.(html?|php)$/i, '');
    const dijelovi = put.split('/').filter((s) => s && !/^(EN|en|InfoPortal|Infoportal|download|data)$/.test(s));
    const rep = dijelovi.slice(-3).join(' / ') + (x.search ? ' ' + decodeURIComponent(x.search.replace(/^\?/, '')).replace(/&lang=\w+/, '') : '');
    return iz ? iz + (rep ? ' · ' + rep : '') : x.hostname + (rep ? ' · ' + rep : '');
  } catch (e) { return u; }
}
function crtajIzvore() {
  $('izvori').innerHTML = Object.keys(IZVORI).map((k) => '<li id="izvor-' + esc(k) + '"><b>' + esc(k) + '</b> — <a href="' + esc(IZVORI[k]) + '" target="_blank" rel="noopener">' + esc(opisUrl(IZVORI[k])) + '</a></li>').join('');
}

/* ================================================================== */
/* 13. Petlja (crta se samo kad se nešto mijenja)                      */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); trazi(); }
new ResizeObserver(velicina).observe(scenaEl);
controls.addEventListener('change', trazi);
controls.addEventListener('start', () => { let_ = null; });
function planirajTreptanje() {
  clearTimeout(timerTrep); timerTrep = 0;
  if (!trepce() || document.hidden) return;
  const t = performance.now(); timerTrep = setTimeout(() => { timerTrep = 0; trazi(); }, 500 - (t % 500) + 15);
}
function okvir(t) {
  rafId = 0;
  if (dlg.open && !st.voz && !st.trake) { if (crtati) { renderer.render(scene, camera); brojCrtanja++; crtati = false; } return; }
  const dt = Math.min(0.1, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  let ide = false;
  if (let_) { const u = Math.min(1, (t - let_.t0) / let_.d), k = ease(u); camera.position.lerpVectors(let_.p0, let_.p1, k); controls.target.lerpVectors(let_.c0, let_.c1, k); if (u >= 1) let_ = null; ide = true; }
  if (korakVoznje(dt)) ide = true;
  if (korakTraka(dt)) ide = true;
  if (korakPogona(dt)) ide = true;
  if (controls.update()) ide = true;
  zauzet = ide;
  if (ide || crtati) { renderer.render(scene, camera); brojCrtanja++; }
  crtati = false;
  if (ide && !document.hidden) { if (!rafId) rafId = requestAnimationFrame(okvir); }
  else if (!rafId) planirajTreptanje();
}

/* ================================================================== */
/* 14. Pokretanje                                                     */
/* ================================================================== */
$('hero-brojke').textContent = DIJELOVI.length + ' dijelova u ' + SKUPINE.length + ' skupina · ' + Object.keys(TEME).length + ' animacija „Kako radi” · podaci s izvorima, pretpostavke označene · prijeđi mišem preko modela za naziv dijela, klikni dio da ga odabereš.';
crtajStablo();
karticaUvod();
crtajPodatke(); crtajPretpostavke(); crtajIzvore();
pocetno();
velicina();
pogled('foto', false);
const uc = $('ucitavanje'); if (uc) uc.remove();
trazi();
window.__upoz = { scene, renderer, camera, controls, R, st, DIJELOVI, RODITELJ, POGLEDI, odaberiDio, odaberiSkupinu, pogled, pogodak, otvoriTemu, zatvoriTemu, pokreniVoznju, staniVoznju, pocetno,
  render: () => renderer.render(scene, camera), trazi, get brojCrtanja() { return brojCrtanja; }, get zauzet() { return zauzet || crtati || !!rafId; }, get tema() { return tema; } };
