/* FORTRONIQ · Industrijski robot KUKA KR AGILUS (KR 6 R900) — Upoznavanje robota (3D).
   Izbornik dio po dio, rastavljanje članaka i osi, unutrašnjost, upravljač, alati TOOL0–TOOL4, karakteristični položaji,
   klizači osi s izravnom kinematikom uživo i animacije „Kako radi” (teme_kuka.js).
   Svi nazivi, opisi, podaci, izvori, inačice i pretpostavke čitaju se iz kuka_podaci.js — ovdje su samo natpisi sučelja.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KONFIG, VARIJANTE, V, NAZIV_ROBOTA, TEKST_INACICA, DH, OSI, POLOZAJI, HOME_FLANGE, KUT_ISPRUZENE, MJERE, POGON, UPRAVLJAC, PRIVJESAK, PRIHVATNICE, KRL,
  DIJELOVI, SKUPINE, IZVORI, TEKST_PRETPOSTAVKE, pretpostavke, nadjiDio, dijeloviSkupine, izvoriDijela, uStupnjeve } from './kuka_podaci.js';
import { napraviKUKA } from './kuka_model.js';
import * as K from './kuka_kin.js';
import { TEME, prikazi, postaviPodatke } from './teme_kuka.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = (n, d = 2) => { const k = Math.pow(10, d); const v = Math.round(n * k) / k; return (Object.is(v, -0) ? 0 : v).toString().replace('.', ',').replace('-', '−'); };
const brF = (n, d = 1) => { const v = Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n; return v.toFixed(d).replace('.', ',').replace('-', '−'); };
const mmS = (m, d = 1) => br(m * 1000, d) + ' mm';
const stS = (r, d = 1) => br(uStupnjeve(r), d) + '°';
const ease = (t) => t * t * (3 - 2 * t);
const PR = pretpostavke();
const DIO_ID = new Set(DIJELOVI.map((d) => d.id));
const INDEKS = new Map(DIJELOVI.map((d, i) => [d.id, i]));
const AKT = KONFIG.varijanta === '-2' ? '-2' : 'sixx';
const VAR_KLJ = ['sixx', '-2'];
const IME_UPR = Object.keys(UPRAVLJAC.inacice || {});
const IME_PRIV = Object.keys(PRIVJESAK.inacice || {});
const skupinaPo = (re) => SKUPINE.find((s) => re.test(s)) || null;
const SK = { podnozje: skupinaPo(/^Podnožje/), stup: skupinaPo(/A1$/), nadlaktica: skupinaPo(/A2$/), ruka: skupinaPo(/A3$/), zapesce: skupinaPo(/^Zapešće/),
  prirubnica: skupinaPo(/^Prirubnica/), energija: skupinaPo(/^Energetski/), upravljac: skupinaPo(/^Upravljač/), privjesak: skupinaPo(/^Privjesak/), pribor: skupinaPo(/^Pribor/) };

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
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 8; controls.minDistance = 0.1; controls.maxPolarAngle = Math.PI * 0.62;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.55); sun.position.set(1.2, 2.6, 1.8); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.55); sun2.position.set(-2, 1.2, -1.6); scene.add(sun2);
const sun3 = new THREE.DirectionalLight(0xffffff, 0.35); sun3.position.set(-0.5, 0.4, 2.5); scene.add(sun3);

const R = napraviKUKA(THREE);
scene.add(R.korijen);
const S = (x, y, z) => new THREE.Vector3(x, z, -y);                 /* KS robota → scena */
/* pod: meka sjena ispod robota, upravljača i privjeska */
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 8, 128, 128, 128); gr.addColorStop(0, 'rgba(110,130,140,0.40)'); gr.addColorStop(0.65, 'rgba(110,130,140,0.14)'); gr.addColorStop(1, 'rgba(110,130,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const pod = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pod.rotation.x = -Math.PI / 2; pod.scale.set(1.25, 1.1, 1); pod.position.copy(S(-0.1, 0.3, -0.001)); pod.raycast = () => {}; scene.add(pod);
}

/* meshevi, dijelovi i hijerarhija dijelova (iz modela: dio B je u sklopu A ako su svi njegovi objekti unutar objekata A) */
const SVI = [];
R.korijen.traverse((o) => { if (o.isMesh) SVI.push(o); });
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
      if (a.id === b.id || a.id === 'robot' || a.skupina !== b.skupina || INDEKS.get(a.id) > INDEKS.get(b.id)) return;
      const A = skupovi.get(a.id); if (!A.size) return;
      if (ob.every((o) => sadrzi(A, o)) && (!naj || velicina.get(a.id) < velicina.get(naj))) naj = a.id;
    });
    if (naj) RODITELJ.set(b.id, naj);
  });
  DIJELOVI.forEach((d) => { let n = 0, p = RODITELJ.get(d.id); while (p && n < 5) { n++; p = RODITELJ.get(p); } DUBINA.set(d.id, n); });
}
const djeca = (id) => DIJELOVI.filter((d) => RODITELJ.get(d.id) === id);
function dioOd(o) {
  let p = o;
  while (p) { const id = p.userData && p.userData.dio; if (id && DIO_ID.has(id)) return id; p = p.parent; }
  return null;
}
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
const naziv = (id) => (nadjiDio(id) || {}).naziv || id;
const osnovnoIme = (n) => String(n).replace(/\s*\(.*\)\s*$/, '').replace(/\s+—.*$/, '').replace(/\s+[A-Z]?\d+$/, '');

/* sastav svake osi iz podataka: prijenosnik, motor, kočnica, rezolver, oznaka za umjeravanje */
const SASTAV_OSI = ['prijenosnik', 'motor', 'kocnica', 'resolver', 'umjeravanje'];
const OS_DIJELOVI = OSI.map((o) => SASTAV_OSI.map((p) => p + o.ime).filter((id) => nadjiDio(id)));
const OS_DIJELA = new Map(); OS_DIJELOVI.forEach((l, i) => l.forEach((id) => OS_DIJELA.set(id, i)));
const ELEM_STRAGA = new Set((PRIVJESAK.elementi || []).filter((e) => /straž/.test(e.strana)).map((e) => e.id));
const ALAT_ID = new Map(PRIHVATNICE.map((p, k) => [p.id, k + 1]));

/* ================================================================== */
/* 2. Stanje i iscrtavanje na zahtjev                                 */
/* ================================================================== */
const POCETNI_Q = (R.q || POLOZAJI.prirubnicaDolje).slice();
const POCETNI_ALAT = R.aktivniAlat || 0;
const st = { akt: null, skupina: null, otvorene: new Set(), samo: false, unutra: false, rastav: 0,
  osCilj: [0, 0, 0, 0, 0, 0], osT: [0, 0, 0, 0, 0, 0], upr: 0, uprCilj: 0, prsti: 0, prstiCilj: 0,
  q: POCETNI_Q.slice(), poza: null, alat: POCETNI_ALAT, pomocni: { osi: false, dh: false, radni: false } };
const vidjeni = new Set();
const KLJUC = 'ftq-kuka-kr6-upoznavanje';
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
const POGLEDI = {
  foto: [S(0.98, -1.6, 1.42), S(0.15, 0.06, 0.52)],
  sprijeda: [S(2.0, -0.25, 0.85), S(0.22, 0, 0.5)],
  bocno: [S(0.3, -2.1, 0.75), S(0.2, 0, 0.52)],
  odozgo: [S(-0.32, 0.22, 3.3), S(-0.08, 0.22, 0.25)],
  cijelo: [S(1.4, -1.9, 1.5), S(-0.15, 0.2, 0.35)],
  rastavljen: [S(1.5, -2.0, 1.35), S(0.1, 0, 0.6)],
  podnozje: [S(-0.7, -0.55, 0.45), S(-0.08, 0, 0.12)],
  rame: [S(0.62, -0.62, 0.62), S(0, 0, 0.32)],
  upravljac: [S(0.1, 0.05, 0.62), S(-0.6, 0.5, 0.06)],
  privjesak: [S(-0.18, 0.2, 0.3), S(-0.6, 0.125, 0.12)],
  privjesakStraga: [S(-1.05, 0.05, 0.35), S(-0.6, 0.125, 0.12)],
  spremiste: [S(0.55, -0.15, 0.55), S(0, 0.4, 0.12)],
  radni: [S(0.25, -3.6, 0.75), S(0.15, 0, 0.45)],
  /* pogledi uz pomični dio robota: smjer gledanja je stalan, cilj je središte dijela u trenutnom položaju */
  zglob: { dijelovi: ['zapesce', 'kucisteA6', 'prirubnica'], smjer: S(0.32, -0.62, 0.22), k: 1.0 },
  alat: { dijelovi: ['prirubnica', 'izmjenjivacFiksni'], smjer: S(0.275, -0.38, 0.13), k: 1.6, alat: true }
};
const POGLED_SKUPINE = new Map([[SK.podnozje, 'podnozje'], [SK.stup, 'rame'], [SK.nadlaktica, 'bocno'], [SK.ruka, 'foto'], [SK.zapesce, 'zglob'],
  [SK.prirubnica, 'alat'], [SK.energija, 'cijelo'], [SK.upravljac, 'upravljac'], [SK.privjesak, 'privjesak'], [SK.pribor, 'cijelo']]);
const OPIS_POGLEDA = { foto: 'Pogled sprijeda zdesna i odozgo, kao na fotografiji robota u stanici.', sprijeda: 'Pogled sprijeda, duž osi X robota.',
  bocno: 'Pogled sa strane, okomito na ravninu ruke: vide se osi A2, A3 i A5 i bočno postavljena nadlaktica.', odozgo: 'Pogled odozgo: os X robota gleda prema gore na zaslonu; iza robota su upravljač i privjesak, lijevo spremište prihvatnica.',
  zglob: 'Pogled na ručni zglob s osima A4, A5 i A6 i prirubnicom.', upravljac: 'Pogled na upravljač; gumbom „Otvori upravljač” podiže se poklopac.', privjesak: 'Pogled na privjesak za učenje sprijeda.' };
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
  return Math.max(0.6, r / Math.sin(Math.min(vf, hf) / 2) * 1.5);
}
function letiNaKutiju(b, smjer, k = 1) {
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.04, b.getSize(new THREE.Vector3()).length() / 2);
  leti(c.clone().add(smjer.clone().normalize().multiplyScalar(udaljenost(r) * k)), c);
}
function smjerPogleda(ime) { const p = POGLEDI[ime]; if (!p) return POGLEDI.foto[0].clone().sub(POGLEDI.foto[1]).normalize(); return Array.isArray(p) ? p[0].clone().sub(p[1]).normalize() : p.smjer.clone().normalize(); }
function pogled(ime, glatko = true) {
  const p = POGLEDI[ime] || POGLEDI.foto;
  if (!Array.isArray(p)) {
    const ids = p.dijelovi.slice(); if (p.alat && st.alat > 0) ids.push(PRIHVATNICE[st.alat - 1].id);
    const b = kutijaVise(ids); if (b) { letiNaKutiju(b, p.smjer, p.k); return; }
    return pogled('foto', glatko);
  }
  const cilj = p[1].clone();
  const poz = cilj.clone().add(p[0].clone().sub(p[1]).multiplyScalar(faktorOmjera()));
  leti(poz, cilj, glatko);
}
const FIKSNI_SMJER = new Set([SK.upravljac, SK.privjesak]);
function letiDoDijela(id) {
  const d = nadjiDio(id), b = kutija(id);
  const ime = POGLED_SKUPINE.get(d && d.skupina) || 'foto';
  if (id === 'robot') { pogled('foto'); return; }
  if (!b) { pogled(ime); return; }
  const c = b.getCenter(new THREE.Vector3());
  let smjer;
  if (d.skupina === SK.privjesak) smjer = smjerPogleda(ELEM_STRAGA.has(id) ? 'privjesakStraga' : 'privjesak');
  else if (FIKSNI_SMJER.has(d.skupina)) smjer = smjerPogleda(ime);
  else {
    const os = R.korijen.position, h = new THREE.Vector3(c.x - os.x, 0, c.z - os.z), base = smjerPogleda(ime);
    smjer = h.length() > 0.07 ? h.normalize().add(base.multiplyScalar(0.75)).add(new THREE.Vector3(0, 0.3, 0)).normalize() : base;
  }
  letiNaKutiju(b, smjer, 1);
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
      '<span class="str" aria-hidden="true">' + (otv ? '▾' : '▸') + '</span><span class="t">' + esc(sk) + '</span><span class="br">' + dio.filter((d) => vidjeni.has(d.id)).length + '/' + dio.length + '</span></button></li>';
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
  return 'Izvor: ' + l.map((x) => x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" title="Otvori izvor u novoj kartici">' + esc(x.kratica) + '</a>' : '<a href="#izvor-' + esc(x.kratica) + '">' + esc(x.kratica) + '</a>').join(', ') +
    ' <span class="uz-vh">(vanjski izvori otvaraju se u novoj kartici)</span> · <a href="#izvor-' + esc(l[0].kratica) + '">popis izvora</a>';
}
function temaGumbi(kljucevi) {
  const k = [...new Set(kljucevi.filter((x) => x && TEME[x]))];
  $('k-tema-g').innerHTML = k.map((x) => '<button type="button" class="gumb" data-tema="' + esc(x) + '">Kako radi: ' + esc(TEME[x].naslov) + '</button>').join('');
  $('k-tema-g').hidden = !k.length;
}
function cipovi(naslov, ids) {
  return ids.length ? '<p class="uz-dj-n">' + esc(naslov) + '</p><ul class="uz-dj">' + ids.map((id) => '<li><button type="button" class="cip" data-skok="' + id + '">' + esc(naziv(id)) + '</button></li>').join('') + '</ul>' : '';
}
/* radnje uz dio: rastavi njegovu os, stavi alat na robota, otvori upravljač, okreni privjesak */
function radnje(d) {
  const g = [];
  if (d) {
    const i = OS_DIJELA.has(d.id) ? OS_DIJELA.get(d.id) : -1;
    if (i >= 0) g.push('<button type="button" class="gumb tanki" data-radnja="os" data-os="' + i + '" aria-pressed="' + (st.osCilj[i] === 1) + '">' + (st.osCilj[i] ? 'Sklopi os ' : 'Rastavi os ') + esc(OSI[i].ime) + '</button>');
    if (ALAT_ID.has(d.id)) { const n = ALAT_ID.get(d.id); g.push('<button type="button" class="gumb tanki" data-radnja="alat" data-alat="' + n + '"' + (st.alat === n ? ' disabled' : '') + '>' + (st.alat === n ? 'Alat je na robotu' : 'Stavi na robota (' + esc(PRIHVATNICE[n - 1].oznaka) + ')') + '</button>'); }
    if (d.skupina === SK.upravljac) g.push('<button type="button" class="gumb tanki" data-radnja="upr" aria-pressed="' + (st.uprCilj === 1) + '">' + (st.uprCilj ? 'Zatvori upravljač' : 'Otvori upravljač') + '</button>');
    if (d.skupina === SK.privjesak) g.push('<button type="button" class="gumb tanki" data-radnja="pogled" data-pogled="privjesak">Privjesak sprijeda</button><button type="button" class="gumb tanki" data-radnja="pogled" data-pogled="privjesakStraga">Privjesak straga</button>');
    if (d.id === 'robot' || d.id === 'natpisnaPlocica') g.push('<button type="button" class="gumb tanki" data-radnja="inacica">O inačici robota</button>');
    if (/^(okretniStup|nadlaktica|ruka|zapesce|kucisteA6|tockaZapesca)$/.test(d.id)) g.push('<button type="button" class="gumb tanki" data-radnja="pomocni">' + (st.pomocni.osi ? 'Sakrij osi zglobova' : 'Prikaži osi zglobova') + '</button>');
  }
  $('k-radnje').innerHTML = g.join(''); $('k-radnje').hidden = !g.length;
}
function karticaUvod() {
  $('k-naziv').textContent = 'Upoznavanje robota';
  $('k-skupina').textContent = DIJELOVI.length + ' dijelova u ' + SKUPINE.length + ' skupina';
  $('k-tekst').innerHTML = P('U izborniku odaberi skupinu pa dio — ili klikni dio na modelu. Model se okrene prema odabranom dijelu i istakne ga, a ovdje dobiješ opis, podatke i izvor.',
    'Narančasta točka u izborniku označava dio kod kojeg je nešto procijenjeno (vidi odjeljak „Što je pretpostavka”). Uz pregledani dio pojavi se kvačica.',
    'Prikazana je inačica ' + esc(V.oznaka) + ' s upravljačem ' + esc(UPRAVLJAC.naziv) + ' i privjeskom ' + esc(PRIVJESAK.naziv) + ' — koja je inačica u stanici, potvrđuje natpisna pločica.');
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
  $('k-tekst').innerHTML = P(esc(d.opis));
  const pod = d.podaci || [];
  $('k-podaci').innerHTML = pod.map(([o, v]) => '<dt>' + esc(o) + '</dt><dd>' + esc(v) + '</dd>').join('');
  $('k-podaci').hidden = !pod.length;
  $('k-pretp').innerHTML = d.pretpostavka ? '<p class="uz-pretp"><b>Pretpostavka:</b> ' + esc(d.napomena || 'dio podataka ili izgleda je procijenjen.') + '</p>' : (d.napomena ? '<p class="uz-pretp"><b>Napomena:</b> ' + esc(d.napomena) + '</p>' : '');
  const iz = izvoriHtml(d); $('k-izvor').innerHTML = iz; $('k-izvor').hidden = !iz;
  temaGumbi([d.tema]); radnje(d);
  const dj = djeca(d.id).map((x) => x.id);
  const i = OS_DIJELA.has(d.id) ? OS_DIJELA.get(d.id) : -1;
  const srodni = i >= 0 ? OS_DIJELOVI[i].filter((x) => x !== d.id) : [];
  $('k-djeca').innerHTML = (dj.length ? cipovi('Dijelovi ovog sklopa:', dj) : '') + (rod ? cipovi('Sklop:', [rod]) : '') + (srodni.length ? cipovi('Ostali dijelovi osi ' + OSI[i].ime + ':', srodni) : '');
  const k = INDEKS.get(d.id); $('k-prije').disabled = false; $('k-dalje').disabled = k === DIJELOVI.length - 1;
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
  temaGumbi(dio.map((d) => d.tema)); radnje(sk === SK.upravljac ? dio[0] : null);
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
function odaberiSkupinu(sk, opc = {}) {
  st.akt = null; st.skupina = sk; st.otvorene.add(sk);
  karticaSkupina(sk); crtajStablo(); primijeniIsticanje();
  if (opc.let !== false) pogled(POGLED_SKUPINE.get(sk) || 'foto');
}
/* prikaz cijelog robota bez isticanja (za radnje koje se odnose na cijeli robot); sk = skupina čija se kartica prikazuje */
function cijeliRobot(sk) {
  if (!st.akt && (!sk || st.skupina === sk)) return;
  st.akt = null;
  if (sk) { st.skupina = sk; st.otvorene.add(sk); karticaSkupina(sk); } else if (st.skupina) karticaSkupina(st.skupina); else karticaUvod();
  crtajStablo(); primijeniIsticanje();
}
function osvjeziRadnje() { if (st.akt) radnje(nadjiDio(st.akt)); else if (st.skupina === SK.upravljac) radnje(dijeloviSkupine(SK.upravljac)[0]); }
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
  const t = e.target.closest('[data-tema]'); if (t) { otvoriTemu(t.dataset.tema, t); return; }
  const r = e.target.closest('[data-radnja]'); if (!r) return;
  const v = r.dataset.radnja;
  if (v === 'os') prebaciOs(+r.dataset.os, false);
  else if (v === 'alat') postaviAlat(+r.dataset.alat, false);
  else if (v === 'upr') prebaciUpravljac(false);
  else if (v === 'pogled') pogled(r.dataset.pogled);
  else if (v === 'inacica') $('inacica').scrollIntoView({ behavior: 'smooth', block: 'start' });
  else if (v === 'pomocni') { $('p-osi').checked = !st.pomocni.osi; $('p-osi').dispatchEvent(new Event('change')); }
});

/* ================================================================== */
/* 7. „Kako radi” — animacije iz teme_kuka.js u dijalogu               */
/* ================================================================== */
const broj = (s) => { const m = String(s ?? '').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : undefined; };
const podatakDijela = (id, re) => { const d = nadjiDio(id); const r = d && (d.podaci || []).find(([o]) => re.test(o)); return r ? r[1] : undefined; };
function cist(o) {
  if (Array.isArray(o)) return o.map(cist);
  if (o && typeof o === 'object') { const n = {}; Object.keys(o).forEach((k) => { const v = cist(o[k]); if (v !== undefined && !(typeof v === 'number' && Number.isNaN(v))) n[k] = v; }); return n; }
  return o;
}
const mjereTekst = (m, pp) => Array.isArray(m) ? m.map((x) => br(x * 1000, 0)).join(' × ') + ' mm' + (pp ? ' (procjena)' : '') : undefined;
function podaciZaTeme() {
  const deg = (q) => q.map((x) => Math.round(uStupnjeve(x) * 100) / 100);
  const upr = (k) => { const u = (UPRAVLJAC.inacice || {})[k]; if (!u) return undefined;
    const pp = PR.some((p) => p.sto && p.sto.indexOf(u.naziv) >= 0 && /mjere/i.test(p.sto));
    return { naziv: u.naziv, m: broj(u.masa), mjere: mjereTekst(u.mjere, pp), S: broj(u.snaga), Q: broj(u.toplina), ip: u.zastita, osi: broj(u.osi), U: String(u.napajanje || '').split(/,| ±/)[0] || undefined }; };
  const pad = (k) => { const p = (PRIVJESAK.inacice || {})[k]; if (!p) return undefined; return { naziv: p.naziv, zaslon: broj(p.zaslon), m: broj(p.masa), ip: p.zastita, omog: p.omogucavajuci, jog: p.tipkeGibanja }; };
  const duljine = podatakDijela('x30', /^Duljine/);
  const io = podatakDijela('x41', /^Ulazi/);
  const ven = nadjiDio('ventiliZapesca');
  const o = {
    varijanta: AKT, upravljac: KONFIG.upravljac, privjesak: KONFIG.privjesak, robot: NAZIV_ROBOTA,
    dh: { d1: DH.d[0] * 1000, a1: DH.a[0] * 1000, a2: DH.a[1] * 1000, a3: DH.a[2] * 1000, d4: DH.d[3] * 1000, d6: DH.d[5] * 1000 },
    osi: OSI.map((x) => ({ ime: x.ime, min: x.minDeg, max: x.maxDeg, v: { sixx: x.vMaxSixx, '-2': x.vMax2 } })),
    doseg: MJERE.doseg * 1000,
    home: deg(POLOZAJI.home), homeFlange: [HOME_FLANGE.x * 1000, HOME_FLANGE.y * 1000, HOME_FLANGE.z * 1000],
    umjeravanje: { kut: OSI.map((x) => x.umjeravanjeDeg), provjeriti: PR.some((p) => /umjeravanja/i.test(p.sto)) },
    transport: POLOZAJI.transport ? deg(POLOZAJI.transport) : undefined,
    ponovljivost: { sixx: VARIJANTE.sixx.ponovljivost, '-2': VARIJANTE['-2'].ponovljivost },
    teret: { max: { sixx: VARIJANTE.sixx.nosivostMax, '-2': VARIJANTE['-2'].nosivostMax } },
    t1: KRL.t1MaxBrzina * 1000, ipo: Math.round(KRL.ipoTakt * 1000 * 10) / 10, ipoPotvrdjeno: !PR.some((p) => /IPO/.test(p.sto)),
    stop0: { sixx: VARIJANTE.sixx.zaustavljanje, '-2': VARIJANTE['-2'].zaustavljanje },
    ventili: ven ? { pMax: broj(podatakDijela('ventiliZapesca', /^Tlak/)), f: broj(podatakDijela('ventiliZapesca', /^Frekv/)), navoj: podatakDijela('ventiliZapesca', /^Navoj/) } : undefined,
    ioZapesce: io ? { ul: broj(String(io).split('/')[0]), izl: broj(String(io).split('/')[1]) } : undefined,
    prirubnica: { krug: MJERE.prirubnica.krugRupa * 1000, navoj: MJERE.prirubnica.navoj, centr: MJERE.prirubnica.centriranje },
    kabeli: { duljine: duljine ? (String(duljine).match(/\d+/g) || []).map(Number) : undefined, rMot: broj(podatakDijela('x30', /^Polumjer/)), rPod: broj(podatakDijela('x31', /^Polumjer/)) },
    krc5micro: upr('krc5micro'), krc4compact: upr('krc4compact'), smartpad: pad('smartpad'), smartpad2: pad('smartpad2'),
    stanica: { alati: PRIHVATNICE.length, tlak: broj(podatakDijela('air1', /^Tlak u stanici/)) },
    alati: PRIHVATNICE.map((p) => ({ ime: p.oznaka, opis: p.naziv.charAt(0).toLowerCase() + p.naziv.slice(1), z: Math.round(p.tcp.z * 1000) }))
  };
  return cist(o);
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dlg.open) { e.preventDefault(); zatvoriTemu(); } });
$('tema-zatvori').addEventListener('click', zatvoriTemu);
dlg.addEventListener('click', (e) => { if (e.target === dlg) zatvoriTemu(); });
{
  const kljucevi = Object.keys(TEME);
  $('teme-popis').innerHTML = kljucevi.map((k) => {
    const dio = DIJELOVI.filter((d) => d.tema === k);
    const imena = [...new Set(dio.map((d) => osnovnoIme(d.naziv)))];
    return '<li><button type="button" data-tema="' + esc(k) + '"><b>' + esc(TEME[k].naslov) + '</b>' + (TEME[k].engl ? '<span class="e">' + esc(TEME[k].engl) + '</span>' : '') +
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
/* 9. Pogledi, rastavljanje, unutrašnjost, osi                         */
/* ================================================================== */
document.querySelectorAll('[data-pogled]').forEach((b) => { if (b.closest('#kartica')) return; b.addEventListener('click', () => { pogled(b.dataset.pogled); opis(OPIS_POGLEDA[b.dataset.pogled] || ''); }); });
const klizac = $('r-rastavi');
function postaviRastav(v) {
  st.rastav = Math.max(0, Math.min(1, v)); R.rastavi(st.rastav);
  klizac.value = String(Math.round(st.rastav * 100)); $('r-rastavi-v').textContent = Math.round(st.rastav * 100) + ' %';
  trazi();
}
klizac.addEventListener('input', () => {
  const prije = st.rastav; postaviRastav(+klizac.value / 100);
  if (prije === 0 && st.rastav > 0) { cijeliRobot(); opis('Robot se rastavlja: okretni stup, nadlaktica, ruka, zapešće, prirubnički dio i alat razmiču se duž lanca, a sučelje A1 prema natrag.'); }
});
klizac.addEventListener('change', () => { if (st.rastav > 0.5 && !st.akt) pogled('rastavljen'); });
function postaviUnutra(v) { st.unutra = !!v; R.unutrasnjost(st.unutra); $('r-unutra').setAttribute('aria-pressed', String(st.unutra)); trazi(); }
$('r-unutra').addEventListener('click', () => {
  postaviUnutra(!st.unutra);
  if (st.unutra) { cijeliRobot(); pogled('foto'); opis('Ljuske članaka su poluprozirne — vide se motori, kočnice, rezolveri i prijenosnici svih osi, RDC u podnožju, unutarnji vodovi i EtherCAT modul.'); } else opis('Ljuske članaka ponovno su neprozirne.');
});
$('r-samo').addEventListener('change', () => { st.samo = $('r-samo').checked; primijeniIsticanje(); });
/* gumbi osi A1–A6 */
$('os-gumbi').innerHTML = OSI.map((o, i) => '<button type="button" class="gumb tanki" data-os="' + i + '" aria-pressed="false" aria-label="Rastavi os ' + esc(o.ime) + ' (' + esc(o.naziv) + ')">' + esc(o.ime) + '</button>').join('');
function oznaciOsi() { document.querySelectorAll('#os-gumbi [data-os]').forEach((b) => b.setAttribute('aria-pressed', String(st.osCilj[+b.dataset.os] === 1))); }
function letiDoOsi(i) {
  const t0 = st.osT[i]; R.rastaviOs(i, 1);
  const b = kutijaVise(OS_DIJELOVI[i].filter((id) => !/^umjeravanje/.test(id))); R.rastaviOs(i, ease(t0));
  if (!b) return;
  const c = b.getCenter(new THREE.Vector3()), base = smjerPogleda('foto');
  const h = new THREE.Vector3(c.x - R.korijen.position.x, 0, c.z - R.korijen.position.z);
  const smjer = h.length() > 0.07 ? h.normalize().multiplyScalar(0.6).add(base) : base;
  letiNaKutiju(b, smjer.add(new THREE.Vector3(0, 0.15, 0)), 1.25);
}
function prebaciOs(i, sKamerom = true) {
  st.osCilj[i] = st.osCilj[i] ? 0 : 1; oznaciOsi();
  const ime = OSI[i].ime;
  if (st.osCilj[i]) {
    const sk = nadjiDio(OS_DIJELOVI[i][0] || '') ? nadjiDio(OS_DIJELOVI[i][0]).skupina : null;
    if (sKamerom && sk && (st.akt || st.skupina !== sk)) odaberiSkupinu(sk, { let: false });
    letiDoOsi(i);
    const sastav = OS_DIJELOVI[i].filter((id) => !/^umjeravanje/.test(id)).map((id) => osnovnoIme(naziv(id)).toLowerCase());
    opis('Os ' + ime + ' (' + OSI[i].naziv + ') se rastavlja duž osi zgloba: ' + sastav.join(', ') + '; ljuske te osi postaju prozirne. Pomakni klizač ' + ime + ' — rotor motora, kočnice i rezolvera vrti se ' + br(POGON.faktorPrikaza, 0) + ' puta brže od izlaza (samo prikaz).');
  } else opis('Os ' + ime + ' se sklapa.');
  osvjeziRadnje();
  trazi();
}
$('os-gumbi').addEventListener('click', (e) => { const b = e.target.closest('[data-os]'); if (b) prebaciOs(+b.dataset.os); });

/* ================================================================== */
/* 10. Alat, prsti, upravljač, pomoćni prikazi                         */
/* ================================================================== */
$('alat-gumbi').innerHTML = ['<button type="button" data-alat="0" aria-pressed="false" title="Bez alata: TCP je središte prirubnice (FLANGE)">TOOL0</button>']
  .concat(PRIHVATNICE.map((p, k) => '<button type="button" data-alat="' + (k + 1) + '" aria-pressed="false" title="' + esc(p.naziv) + '">' + esc(p.oznaka) + '</button>')).join('');
function oznaciAlat() {
  document.querySelectorAll('#alat-gumbi [data-alat]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.alat === st.alat)));
  const p = PRIHVATNICE[st.alat - 1], mozePrste = !!p && p.vrsta === 'paralelna';
  $('t-prsti').disabled = !mozePrste;
  $('t-prsti').title = mozePrste ? '' : (p ? 'Vakuumska prihvatnica nema prste' : 'Na prirubnici nema alata');
}
function postaviPrste(s) { st.prsti = st.prstiCilj = s; R.otvoriPrihvatnicu(s); $('t-prsti').setAttribute('aria-pressed', String(s > 0)); $('t-prsti').textContent = s > 0 ? 'Zatvori prste' : 'Otvori prste'; }
function postaviAlat(i, sKamerom = true) {
  i = Math.max(0, Math.min(PRIHVATNICE.length, i | 0));
  postaviPrste(0);
  R.postaviAlat(i); st.alat = R.aktivniAlat; oznaciAlat(); ocitanje();
  const p = PRIHVATNICE[st.alat - 1];
  if (p) { odaberiDio(p.id, { let: false }); opis(p.oznaka + ': ' + p.naziv + ' preuzeta je iz spremišta. TCP alata u FLANGE-u: X 0, Y 0, Z ' + br(p.tcp.z * 1000, 1) + ' mm (procjena) — očitanje ispod prikazuje i TCP.'); }
  else { if (nadjiDio('prirubnica')) odaberiDio('prirubnica', { let: false }); opis('TOOL0: na prirubnici nema alata, alat je vraćen u spremište; TCP je središte prirubnice (FLANGE).'); }
  if (sKamerom !== null) pogled('alat');
  trazi();
}
$('alat-gumbi').addEventListener('click', (e) => { const b = e.target.closest('[data-alat]'); if (b) postaviAlat(+b.dataset.alat); });
$('t-prsti').addEventListener('click', () => {
  if ($('t-prsti').disabled) return;
  st.prstiCilj = st.prstiCilj ? 0 : 1;
  $('t-prsti').setAttribute('aria-pressed', String(st.prstiCilj > 0)); $('t-prsti').textContent = st.prstiCilj ? 'Zatvori prste' : 'Otvori prste';
  opis(st.prstiCilj ? 'Prsti prihvatnice se otvaraju (pneumatski).' : 'Prsti prihvatnice se zatvaraju.');
  trazi();
});
function prebaciUpravljac(sKamerom = true) {
  st.uprCilj = st.uprCilj ? 0 : 1;
  $('u-otvori').setAttribute('aria-pressed', String(st.uprCilj === 1)); $('u-otvori').textContent = st.uprCilj ? 'Zatvori upravljač' : 'Otvori upravljač';
  if (st.uprCilj) {
    if (sKamerom && SK.upravljac) odaberiSkupinu(SK.upravljac, { let: false });
    pogled('upravljac');
    opis('Poklopac upravljača ' + UPRAVLJAC.naziv + ' se podiže: unutra su ' + (UPRAVLJAC.sastav || []).slice(0, 3).join('; ') + '. Ventilatori se vrte (načelni raspored).');
  } else opis('Poklopac upravljača se spušta.');
  osvjeziRadnje();
  trazi();
}
$('u-otvori').addEventListener('click', () => prebaciUpravljac());
const POMOCNI = [['p-osi', 'osi', (v) => R.pomocni.osi(v), 'Narančaste osi zglobova sa strelicom u pozitivnom smjeru vrtnje (pravilo desne ruke).'],
  ['p-dh', 'dh', (v) => R.pomocni.okviriDH(v), 'Koordinatni okviri DH 0…6 (crveno X, zeleno Y, plavo Z) i TCP aktivnog alata — izračunati iz iste DH tablice kao očitanje.'],
  ['p-radni', 'radni', (v) => R.pomocni.radniProstor(v), 'Granice putanje točke zapešća u ravnini ruke (narančasto: ispružena ruka, doseg ' + br(MJERE.doseg * 1000, 1) + ' mm) i luk dosega A1 na podlozi.']];
POMOCNI.forEach(([id, k, f, t]) => $(id).addEventListener('change', () => {
  st.pomocni[k] = $(id).checked; f(st.pomocni[k]);
  if (st.pomocni[k]) { opis(t); if (k === 'radni') pogled('radni'); }
  osvjeziRadnje(); primijeniIsticanje();
}));

/* ================================================================== */
/* 11. Osi: klizači, položaji, izravna kinematika uživo                */
/* ================================================================== */
$('klizaci').innerHTML = OSI.map((o, i) => '<div class="uz-kl"><label for="q-' + i + '" title="' + esc(o.naziv) + '">' + esc(o.ime) + '</label>' +
  '<input type="range" id="q-' + i + '" min="' + o.minDeg + '" max="' + o.maxDeg + '" step="0.5" value="0" aria-describedby="q-' + i + '-v q-' + i + '-n" aria-label="Kut osi ' + esc(o.ime) + ', ' + esc(o.naziv) + '">' +
  '<output id="q-' + i + '-v" for="q-' + i + '">0°</output><small id="q-' + i + '-n"><span>' + esc(o.naziv) + '</span><span>' + br(o.minDeg, 0) + '° … ' + (o.maxDeg > 0 ? '+' : '') + br(o.maxDeg, 0) + '°</span></small></div>').join('');
const KL = OSI.map((o, i) => $('q-' + i));
function azurirajKlizace() { KL.forEach((k, i) => { const d = uStupnjeve(st.q[i]); k.value = String(Math.round(d * 2) / 2); $('q-' + i + '-v').textContent = (d > 0.05 ? '+' : '') + brF(d, 1) + '°'; }); }
const SING = { iznadGlave: 'blizu singulariteta iznad glave (točka zapešća na osi A1)', ispruzena: 'blizu singulariteta ispružene ruke (A3 ≈ ' + br(uStupnjeve(KUT_ISPRUZENE), 2) + '°)', zapesce: 'blizu singulariteta zapešća (A5 ≈ 0°, osi A4 i A6 na istom pravcu)' };
function xyzHtml(p, abc) {
  const c = (o, v, j) => '<div><dt>' + o + '</dt><dd>' + v + '</dd></div>';
  return '<dl class="uz-xyz">' + c('X', brF(p[0] * 1000, 1), 'mm') + c('Y', brF(p[1] * 1000, 1), 'mm') + c('Z', brF(p[2] * 1000, 1), 'mm') +
    c('A', brF(uStupnjeve(abc[0]), 1) + '°') + c('B', brF(uStupnjeve(abc[1]), 1) + '°') + c('C', brF(uStupnjeve(abc[2]), 1) + '°') + '</dl>';
}
function ocitanje() {
  const f = K.fk(st.q), sti = K.statusTurn(st.q), sg = K.singularnost(st.q);
  let h = '<p class="uz-ocit-h">Prirubnica (FLANGE) u ROBROOT · mm i °</p>' + xyzHtml(f.p, f.abc);
  const p = PRIHVATNICE[st.alat - 1];
  if (p) { const fa = K.fkAlat(st.q, K.okvir(p.tcp)); h += '<p class="uz-ocit-h">TCP ' + esc(p.oznaka) + ' (TOOL_DATA[' + st.alat + '], procjena)</p>' + xyzHtml(fa.p, fa.abc); }
  h += '<p class="uz-ocit-st">Status S ' + sti.status + ' · Turn T ' + sti.turn + (sg.tip ? ' · <span class="sing">' + esc(SING[sg.tip] || sg.tip) + '</span>' : ' · bez singulariteta') + '</p>';
  $('ocitanje').innerHTML = h;
}
const IME_POL = { home: 'HOME', prirubnicaDolje: 'Prirubnica dolje', transport: 'Transportni položaj', umjeravanje: 'Položaj umjeravanja', nula: 'Sve osi 0°' };
const POL_KLJ = ['home', 'prirubnicaDolje', 'transport', 'umjeravanje', 'nula'].filter((k) => POLOZAJI[k]);
$('poz-gumbi').innerHTML = POL_KLJ.map((k) => '<button type="button" class="gumb tanki" data-poz="' + k + '" aria-pressed="false">' + esc(IME_POL[k]) + '</button>').join('');
const isti = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-3);
function oznaciPolozaj() { document.querySelectorAll('[data-poz]').forEach((b) => b.setAttribute('aria-pressed', String(isti(st.q, POLOZAJI[b.dataset.poz])))); }
function postaviQ(q) {
  st.q = OSI.map((o, i) => Math.min(o.max, Math.max(o.min, Number(q[i]) || 0)));
  R.postavi(st.q); azurirajKlizace(); ocitanje(); oznaciPolozaj(); trazi();
}
function opisPolozaja(k) {
  const q = POLOZAJI[k], f = K.fk(q);
  const pp = k === 'umjeravanje' && PR.find((p) => /umjeravanja/i.test(p.sto));
  return IME_POL[k] + ': ' + OSI.map((o, i) => o.ime + ' ' + br(uStupnjeve(q[i]), 1) + '°').join(', ') + ' → prirubnica X ' + br(f.p[0] * 1000, 1) + ', Y ' + br(f.p[1] * 1000, 1) + ', Z ' + br(f.p[2] * 1000, 1) + ' mm.' +
    (k === 'home' ? ' To je $H_POS — prvo i zadnje gibanje programa.' : '') + (pp ? ' Pretpostavka: ' + pp.napomena.replace(/\s*\[[A-Z0-9-]+\]/g, '') : '');
}
function idiUPolozaj(k) {
  const q1 = POLOZAJI[k]; if (!q1) return;
  const T = Math.max(0.8, Math.min(3, K.trajanjePTP(st.q, q1, 0.3)));
  st.poza = { q0: st.q.slice(), q1: q1.slice(), t0: performance.now(), T, ime: k };
  opis(opisPolozaja(k) + ' Gibanje PTP: sve osi kreću i stižu istodobno.');
  trazi();
}
$('poz-gumbi').addEventListener('click', (e) => { const b = e.target.closest('[data-poz]'); if (b) idiUPolozaj(b.dataset.poz); });
function korakPoze(t) {
  const P_ = st.poza; if (!P_) return false;
  const s = Math.min(1, Math.max(0, (t - P_.t0) / 1000 / P_.T));
  postaviQ(K.interpolirajPTP(P_.q0, P_.q1, ease(s)));
  if (s >= 1) st.poza = null;
  return true;
}
KL.forEach((k, i) => k.addEventListener('input', () => {
  st.poza = null;
  const q = st.q.slice(); q[i] = (+k.value) * Math.PI / 180; postaviQ(q);
}));

/* ================================================================== */
/* 12. Animacije (rastavljanje osi, upravljač, prsti) i početno stanje  */
/* ================================================================== */
function prema(trenutno, cilj, brzina) { return Math.abs(cilj - trenutno) < 1e-4 ? cilj : trenutno + Math.sign(cilj - trenutno) * Math.min(Math.abs(cilj - trenutno), brzina); }
function korakOsi(dt) {
  let ide = false;
  for (let i = 0; i < 6; i++) {
    const c = st.osCilj[i], s = st.osT[i];
    if (Math.abs(c - s) > 1e-4) { st.osT[i] = prema(s, c, dt * 1.1); R.rastaviOs(i, ease(st.osT[i])); ide = true; }
  }
  return ide;
}
function korakUpravljaca(dt, t) {
  let ide = false;
  if (Math.abs(st.uprCilj - st.upr) > 1e-4) { st.upr = prema(st.upr, st.uprCilj, dt * 0.9); R.upravljac.otvori(ease(st.upr)); ide = true; }
  if (st.upr > 0) { R.azuriraj(t / 1000); ide = true; }
  return ide;
}
function korakPrstiju(dt) {
  if (Math.abs(st.prstiCilj - st.prsti) < 1e-4) return false;
  st.prsti = prema(st.prsti, st.prstiCilj, dt * 2); R.otvoriPrihvatnicu(ease(st.prsti)); return true;
}
function pocetno() {
  st.poza = null;
  postaviRastav(0); postaviUnutra(false);
  st.osCilj = [0, 0, 0, 0, 0, 0]; st.osT = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 6; i++) R.rastaviOs(i, 0); oznaciOsi();
  st.uprCilj = 0; st.upr = 0; R.upravljac.otvori(0); R.azuriraj(0); $('u-otvori').setAttribute('aria-pressed', 'false'); $('u-otvori').textContent = 'Otvori upravljač';
  postaviPrste(0); R.postaviAlat(POCETNI_ALAT); st.alat = R.aktivniAlat; oznaciAlat();
  POMOCNI.forEach(([id, k, f]) => { $(id).checked = false; st.pomocni[k] = false; f(false); });
  st.samo = false; $('r-samo').checked = false;
  postaviQ(POCETNI_Q);
  osvjeziRadnje();
}
$('r-pocetno').addEventListener('click', () => {
  pocetno(); st.akt = null; st.skupina = null; karticaUvod(); crtajStablo(); primijeniIsticanje(); pogled('foto');
  opis('Vraćeno početno stanje: robot sklopljen, prirubnica prema dolje, ' + (POCETNI_ALAT ? PRIHVATNICE[POCETNI_ALAT - 1].oznaka + ' na robotu' : 'bez alata') + ', upravljač zatvoren.');
});

/* ================================================================== */
/* 13. Okvir inačice                                                  */
/* ================================================================== */
const prZa = (sto) => PR.find((p) => !p.id && p.sto === sto) || null;
const izvLink = (s) => [...new Set(String(s || '').split(',').map((k) => k.trim()).filter(Boolean))].map((k) => '<a href="#izvor-' + esc(k) + '">[' + esc(k) + ']</a>').join(' ');
const ozPP = (sto) => { const p = sto ? prZa(sto) : null; return p ? '<span class="uz-oz' + (p.vrsta === 'sukob' ? ' sukob' : '') + '">' + (p.vrsta === 'sukob' ? 'sukob izvora' : 'pretpostavka') + '</span>' : ''; };
const ozPPdio = '<span class="uz-oz">pretpostavka</span>';
function tbl(naslov, glava, redovi, opc = {}) {
  const r = redovi.filter(Boolean); if (!r.length) return '';
  return '<div class="uz-tbl-omot' + (opc.siroko ? ' uz-siroko-t' : '') + '"><table class="tbl uz-tbl"><caption>' + naslov + '</caption><thead><tr>' + glava.map((g, i) => '<th scope="col"' + (opc.akt === i ? ' class="akt"' : '') + '>' + g + '</th>').join('') + '</tr></thead><tbody>' +
    r.map((red) => '<tr>' + red.map((c, i) => { const o = (c && typeof c === 'object') ? c : { h: c }; const kl = [o.k, opc.akt === i ? 'akt' : ''].filter(Boolean).join(' '); return '<td' + (kl ? ' class="' + kl + '"' : '') + '>' + (o.h ?? '') + '</td>'; }).join('') + '</tr>').join('') +
    '</tbody></table>' + (opc.nap ? '<p class="pom">' + opc.nap + '</p>' : '') + '</div>';
}
const glavaVar = (k) => esc(VARIJANTE[k].oznaka) + (k === AKT ? '<span class="uz-akt">prikazano</span>' : '');
const iAkt = VAR_KLJ.indexOf(AKT) + 1;
function redVar(o, f, k2) { const a = f(VARIJANTE.sixx), b = f(VARIJANTE['-2']); const raz = a !== b; return [esc(o), { h: esc(a), k: raz ? 'raz' : '' }, { h: esc(b), k: raz ? 'raz' : '' }]; }
function crtajInacicu() {
  $('inacica-tekst').textContent = TEKST_INACICA;
  const s = prZa('Inačica robota');
  $('inacica-prikaz').innerHTML = 'Na ovoj stranici prikazano: <b>' + esc(s ? s.vrijednost : V.oznaka) + '</b> — ' + esc(V.generacija) + '. Upravljač ' + esc(UPRAVLJAC.naziv) + ' i privjesak ' + esc(PRIVJESAK.naziv) + ' također su pretpostavka. Kad se pročita natpisna pločica, mijenja se jedan prekidač u podacima i sve vrijednosti na stranici prilagode se same.';
  $('inacica-tbl').innerHTML = tbl('Što se razlikuje između inačica', ['Podatak', glavaVar('sixx'), glavaVar('-2')], [
    redVar('Generacija', (v) => v.generacija),
    redVar('Brzine A4 / A5 / A6', (v) => v.brzine.slice(3).join(' / ') + ' °/s'),
    redVar('Nosivost', (v) => v.nosivost),
    redVar('Ponovljivost (ISO 9283)', (v) => '±' + br(v.ponovljivost, 2) + ' mm'),
    redVar('Masa', (v) => '≈ ' + v.masa + ' kg'),
    redVar('Zaštita', (v) => v.ip),
    redVar('Tvornička boja', (v) => v.bojaTvornicka),
    redVar('Upravljač', (v) => v.upravljanje),
    redVar('Privjesak', (v) => v.privjesak)
  ], { akt: iAkt, nap: 'Narančasto su vrijednosti koje se razlikuju. Kinematika (duljine članaka, opsezi osi, HOME) jednaka je za obje inačice. Izvori: ' + izvLink(VARIJANTE.sixx.izvor + ', ' + VARIJANTE['-2'].izvor) + '.' });
}
$('inacica-plocica').addEventListener('click', () => { if (nadjiDio('natpisnaPlocica')) { odaberiDio('natpisnaPlocica'); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

/* ================================================================== */
/* 14. Odjeljci: podaci, pretpostavke, izvori                          */
/* ================================================================== */
function crtajPodatke() {
  const drugaV = AKT === 'sixx' ? '-2' : 'sixx';
  const sukBrz = prZa('Brzine osi A4–A6');
  const t1 = tbl('Osi — opseg i najveće brzine', ['Os', 'Opseg', 'Brzina ' + glavaVar(AKT), 'Brzina ' + esc(VARIJANTE[drugaV].oznaka), 'Umjeravanje', 'Zaustavni put STOP 0 (' + esc(VARIJANTE[AKT].oznaka) + ')'],
    OSI.map((o, i) => {
      const v = AKT === 'sixx' ? o.vMaxSixx : o.vMax2, v2 = AKT === 'sixx' ? o.vMax2 : o.vMaxSixx, raz = v !== v2;
      return ['<b>' + esc(o.ime) + '</b> ' + esc(o.naziv), br(o.minDeg, 0) + '° … ' + (o.maxDeg > 0 ? '+' : '') + br(o.maxDeg, 0) + '°',
        { h: v + ' °/s' + (raz && sukBrz ? ozPP('Brzine osi A4–A6') : ''), k: raz ? 'raz' : '' }, { h: v2 + ' °/s', k: raz ? 'raz' : '' },
        br(o.umjeravanjeDeg, 0) + '°' + (o.ime === 'A4' ? ozPP('Položaj umjeravanja A4 = 90°') : ''),
        o.zaustavljanje ? br(o.zaustavljanje.kutDeg, 2) + '°, ' + br(o.zaustavljanje.vrijeme, 3) + ' s' : '—'];
    }), { akt: 2, siroko: true, nap: 'Narančasto: brzine koje ovise o inačici. Zaustavni put STOP 0 vrijedi za ispruženu ruku, 100 % override i najveći teret. Izvori: ' + izvLink(OSI[0].izvor + ', ' + VARIJANTE[AKT].izvor) + '.' });
  const t2 = tbl('Robot — inačice usporedno', ['Podatak', glavaVar('sixx'), glavaVar('-2')], [
    redVar('Oznaka', (v) => v.oznaka), redVar('Nosivost', (v) => v.nosivost), redVar('Ponovljivost', (v) => '±' + br(v.ponovljivost, 2) + ' mm'),
    redVar('Masa', (v) => '≈ ' + v.masa + ' kg'), redVar('Zaštita', (v) => v.ip), redVar('Buka', (v) => v.buka), redVar('Temperatura okoline', (v) => v.temperatura),
    redVar('Tlocrt podnožja', (v) => v.tlocrt.map((x) => br(x * 1000, 0)).join(' × ') + ' mm'), redVar('Radni prostor', (v) => br(v.volumen, 2) + ' m³'),
    redVar('Sila na temelj okomito (rad / STOP)', (v) => v.temelj.Fv), redVar('Sila na temelj vodoravno', (v) => v.temelj.Fh),
    redVar('Moment prevrtanja', (v) => v.temelj.Mk), redVar('Moment oko osi A1', (v) => v.temelj.Mr), redVar('Dubina uvrtanja vijaka prirubnice', (v) => v.dubinaNavoja),
    ['Izvor', izvLink(VARIJANTE.sixx.izvor), izvLink(VARIJANTE['-2'].izvor)]
  ], { akt: iAkt, nap: 'Inačicu određuje natpisna pločica na podnožju — vidi okvir na vrhu stranice.' });
  const mj = MJERE;
  const t3 = tbl('Mjere i kinematika', ['Podatak', 'Vrijednost', 'Izvor'], [
    ['Visina osi A2 nad podlogom', mmS(DH.d[0]), izvLink(DH.izvor)], ['Pomak osi A2 ispred osi A1', mmS(DH.a[0]), izvLink(DH.izvor)],
    ['Nadlaktica (A2 → A3)', mmS(DH.a[1]), izvLink(DH.izvor)], ['Pomak osi A4 iznad A3', mmS(DH.a[2]), izvLink(DH.izvor)],
    ['Ruka (A3 → točka zapešća)', mmS(DH.d[3]), izvLink(DH.izvor)], ['Točka zapešća → prirubnica', mmS(DH.d[5]), izvLink(DH.izvor)],
    ['Doseg točke zapešća', mmS(mj.doseg), izvLink('PB0001')], ['Najviša točka zapešća', mmS(mj.najvisaTockaZapesca), izvLink('PB0001')], ['Doseg prema natrag', mmS(mj.dosegNatrag), izvLink('PB0001')],
    ['Prirubnica u HOME', 'X ' + br(HOME_FLANGE.x * 1000, 1) + ', Y ' + br(HOME_FLANGE.y * 1000, 1) + ', Z ' + br(HOME_FLANGE.z * 1000, 1) + ' mm; A ' + stS(HOME_FLANGE.A, 0) + ', B ' + stS(HOME_FLANGE.B, 0) + ', C ' + stS(HOME_FLANGE.C, 0), izvLink('DH-PROV')],
    ['Kut ispružene ruke (A3)', stS(KUT_ISPRUZENE, 2), izvLink('DH-PROV')],
    ['Visina sivog podnožja', mmS(mj.podnozje.visina, 0) + ozPP('Visina sivog podnožja'), izvLink('FOTO')],
    ['Promjer tijela podnožja', 'Ø' + br(mj.podnozje.polumjer * 2000, 0) + ' mm' + ozPP('Polumjer tijela podnožja'), izvLink('FOTO')],
    ['Razmak rupa za vijke', mmS(mj.podnozje.razmakRupa, 0) + ozPP('Razmak rupa za vijke M10'), izvLink('FOTO')],
    ['Promjer okretnog stupa', 'Ø' + br(mj.stup.polumjer * 2000, 0) + ' mm' + ozPP('Polumjer okretnog stupa'), izvLink('FOTO')],
    ['Bočni pomak nadlaktice', mmS(mj.nadlaktica.pomakY, 0) + ' (Y)' + ozPP('Bočni pomak nadlaktice od ravnine osi'), izvLink('FOTO')],
    ['Promjer cijevi ruke', 'Ø' + br(mj.ruka.polumjerCijevi * 2000, 0) + ' mm' + ozPP('Polumjer cijevi ruke'), izvLink('FOTO')],
    ['Promjer kućišta zapešća', 'Ø' + br(mj.zapesce.polumjer * 2000, 0) + ' mm' + ozPP('Polumjer kućišta zapešća'), izvLink('FOTO')]
  ]);
  const deg0 = (r) => br(uStupnjeve(r), 0) + '°';
  const t4 = tbl('DH parametri (standardni DH)', ['i', 'a [mm]', 'd [mm]', 'α', 'θ<sub>i</sub>'], DH.a.map((a, i) => [String(i + 1), br(a * 1000, 1), br(DH.d[i] * 1000, 1), deg0(DH.alpha[i]),
    { h: (DH.znak[i] < 0 ? '−' : '') + 'A' + (i + 1) + (Math.abs(DH.pomak[i]) > 1e-9 ? (DH.pomak[i] > 0 ? ' + ' : ' − ') + br(Math.abs(uStupnjeve(DH.pomak[i])), 0) + '°' : ''), k: 'mono' }]),
    { nap: 'T<sub>i</sub> = Rz(θ<sub>i</sub>)·Tz(d<sub>i</sub>)·Tx(a<sub>i</sub>)·Rx(α<sub>i</sub>); A<sub>i</sub> je kut osi kao na privjesku. Okvir 6 je FLANGE (uključuje zakret prirubnice za 180°). Izvori: ' + izvLink(DH.izvor) + '. Ista tablica računa očitanje ispod 3D prikaza.' });
  const uprStupci = IME_UPR.map((k) => UPRAVLJAC.inacice[k]);
  const iUpr = IME_UPR.indexOf(UPRAVLJAC.id) + 1;
  const glUpr = uprStupci.map((u) => esc(u.naziv) + (u.id === UPRAVLJAC.id ? '<span class="uz-akt">prikazano</span>' : ''));
  const ru = (o, f, sto) => [esc(o)].concat(uprStupci.map((u) => esc(f(u) ?? '—') + (sto && u.id === UPRAVLJAC.id ? ozPP(typeof sto === 'function' ? sto(u) : sto) : '')));
  const t5 = tbl('Upravljač — ' + esc(UPRAVLJAC.naziv) + ozPP('Upravljač robota'), ['Podatak'].concat(glUpr), [
    ru('Mjere (Š × D × V)', (u) => mjereTekst(u.mjere), (u) => 'Vanjske mjere ' + u.naziv + ' (Š × D × V)'), ru('Masa', (u) => u.masa), ru('Boja', (u) => u.boja, 'Boja kućišta upravljača'), ru('Zaštita', (u) => u.zastita),
    ru('Napajanje', (u) => u.napajanje), ru('Priključna snaga', (u) => u.snaga), ru('Osigurač', (u) => u.osigurac), ru('Toplina', (u) => u.toplina), ru('Buka', (u) => u.buka),
    ru('Temperatura okoline', (u) => u.temperatura), ru('Osi', (u) => u.osi), ru('Softver', (u) => u.softver), ru('Hlađenje', (u) => u.hladenje), ru('Sigurnost', (u) => u.sigurnost),
    ru('Montaža', (u) => u.montaza), ru('Sastav', (u) => (u.sastav || []).join('; ')), ru('Sučelja', (u) => (u.sucelja || []).join(', ')),
    ['Izvor'].concat(uprStupci.map((u) => izvLink(u.izvor)))
  ], { akt: iUpr, siroko: true });
  const privStupci = IME_PRIV.map((k) => PRIVJESAK.inacice[k]);
  const iPriv = IME_PRIV.indexOf(PRIVJESAK.id) + 1;
  const rp = (o, f, sto) => [esc(o)].concat(privStupci.map((p) => esc(f(p) ?? '—') + (sto && p.id === PRIVJESAK.id ? ozPP(sto) : '')));
  const t6 = tbl('Privjesak za učenje — ' + esc(PRIVJESAK.naziv) + ozPP('Privjesak za učenje'), ['Podatak'].concat(privStupci.map((p) => esc(p.naziv) + (p.id === PRIVJESAK.id ? '<span class="uz-akt">prikazano</span>' : ''))), [
    rp('Zaslon', (p) => p.zaslon), rp('Razlučivost', (p) => p.razlucivost), rp('Mjere (Š × V × D)', (p) => mjereTekst(p.mjere), 'Mjere smartPAD-a (Š × V × D)'), rp('Masa', (p) => p.masa), rp('Zaštita', (p) => p.zastita),
    rp('Pari tipki za gibanje', (p) => String(p.tipkeGibanja), 'Raspored tipki na smartPAD-2'), rp('Uređaji za omogućavanje', (p) => String(p.omogucavajuci)), rp('USB', (p) => p.usb), rp('Osobine', (p) => (p.osobine || []).join('; ')),
    ['Izvor'].concat(privStupci.map((p) => izvLink(p.izvor)))
  ], { akt: iPriv });
  const t7 = tbl('Elementi privjeska (brojevi kao na slici u uputama)', ['Br.', 'Strana', 'Element'], (PRIVJESAK.elementi || []).map((e) => [esc(String(e.broj)), esc(e.strana),
    nadjiDio(e.id) ? '<button type="button" class="pok" data-pokazi="' + esc(e.id) + '">' + esc(e.naziv) + '</button>' : esc(e.naziv)]), { nap: 'Klik na naziv odabire element na modelu. Izvor rasporeda: ' + izvLink('KSS82') + ozPP('Raspored tipki na smartPAD-2') });
  const pr = MJERE.prirubnica;
  const t8 = tbl('Prirubnica, opterećenje i alati', ['Podatak', 'Vrijednost', 'Izvor'], [
    ['Norma', esc(podatakDijela('prirubnica', /^Norma/) || 'ISO 9409-1'), izvLink((nadjiDio('prirubnica') || {}).izvor)],
    ['Krug rupa', 'Ø' + br(pr.krugRupa * 1000, 1) + ' mm', izvLink('SIXX, SPEZ2')], ['Navoji', pr.brojNavoja + ' × ' + esc(pr.navoj) + ', vijci razreda ' + esc(pr.razred), izvLink('SIXX, SPEZ2')],
    ['Centriranje', esc(pr.centriranje), izvLink('SIXX, SPEZ2')], ['Vanjski promjer', 'Ø' + br(pr.promjer * 1000, 0) + ' mm' + ozPP('Vanjski promjer prirubnice'), izvLink('FOTO')],
    ...(POGON.prirubnicaOpterecenje || []).map(([o, v]) => [esc(o) + ' (rad / STOP u nuždi)', esc(v), izvLink('SIXX')]),
    ...(POGON.dodatniTereti || []).map(([o, v]) => ['Dodatni teret: ' + esc(o.toLowerCase()), esc(v), izvLink('SIXX')]),
    ...PRIHVATNICE.map((p) => [esc(p.oznaka) + ' — ' + esc(p.naziv), 'TCP Z ' + br(p.tcp.z * 1000, 0) + ' mm' + ozPPdio, izvLink('FESTO-R14, FOTO')])
  ]);
  const t9 = tbl('Pogon osi', ['Sklop', 'Podatak', 'Izvor'], [
    ['Motor', esc(POGON.motor.tip) + '; uobičajeno: ' + esc(POGON.motor.pretpostavka) + ozPPdio, izvLink(POGON.motor.izvor)],
    ['Prijenosnik', 'vrsta ' + esc(POGON.prijenosnik.vrsta) + ', omjer ' + esc(POGON.prijenosnik.omjer), izvLink(POGON.prijenosnik.izvor)],
    ['Kočnica', (POGON.kocnica.svakaOs ? 'na svakoj osi; ' : '') + 'izvedba ' + esc(POGON.kocnica.izvedba) + ' (prikaz: ' + esc(POGON.kocnica.pretpostavka) + ')' + ozPPdio, izvLink(POGON.kocnica.izvor)],
    ['Mjerni sustav', esc(POGON.mjerniSustav.davac) + '; ' + esc(POGON.mjerniSustav.pretvornik), izvLink(POGON.mjerniSustav.izvor)],
    ['Momenti osi', esc(POGON.momentiOsi), izvLink('SIXX, SPEZ2')],
    ['Otpuštanje kočnica', esc(POGON.otpustanjeKocnica), izvLink('SIXX')]
  ]);
  $('podaci-in').innerHTML = t1 + t2 + t3 + t4 + t5 + t6 + t7 + t8 + t9;
  $('podaci-inacica').textContent = 'prikazano: ' + V.oznaka + ' · ' + UPRAVLJAC.naziv + ' · ' + PRIVJESAK.naziv;
  $('podaci-nap').innerHTML = 'Oznaka <span class="uz-oz">pretpostavka</span> znači procijenjenu vrijednost, a <span class="uz-oz sukob">sukob izvora</span> da se izvori ne slažu — objašnjenja su u odjeljku <a href="#pretpostavke">Što je pretpostavka</a>. Stupac s oznakom <span class="uz-tbl"><span class="uz-akt">prikazano</span></span> je inačica koju prikazuju model i opisi. Opisi i podaci svakog dijela su u kartici uz 3D prikaz.';
  $('podaci-in').addEventListener('click', (e) => { const b = e.target.closest('[data-pokazi]'); if (!b) return; odaberiDio(b.dataset.pokazi); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}
function sIzvorima(t) { return esc(t).replace(/\[([A-Z0-9-]+)\]/g, (s, k) => (k in IZVORI) ? '<a href="#izvor-' + k + '">[' + k + ']</a>' : s); }
function crtajPretpostavke() {
  const sukobi = PR.filter((p) => p.vrsta === 'sukob'), vrij = PR.filter((p) => p.vrsta !== 'sukob' && !p.id), dij = PR.filter((p) => p.vrsta !== 'sukob' && p.id);
  $('pretp-uvod').innerHTML = '<p>' + esc(TEKST_PRETPOSTAVKE) + '</p><p><strong>Vrijednosti će se ažurirati kad budu poznati točni podaci robota u stanici</strong> (natpisna pločica, upravljač, privjesak, prihvatnice) — popis ispod nastaje sam iz podataka, pa potvrđena vrijednost s njega nestane.</p>' +
    '<p class="pom">Ukupno: ' + sukobi.length + ' nesuglasja izvora, ' + vrij.length + ' procijenjenih vrijednosti i ' + dij.length + ' dijelova s procijenjenim izgledom, položajem ili podatkom.</p>';
  const t = (naslov, l, sDijelom) => l.length ? '<div class="uz-tbl-omot"><table class="tbl uz-pr"><caption>' + esc(naslov) + ' (' + l.length + ')</caption><thead><tr><th scope="col">' + (sDijelom ? 'Dio' : 'Podatak') + '</th>' + (sDijelom ? '' : '<th scope="col">Korištena vrijednost</th>') + '<th scope="col">Napomena</th></tr></thead><tbody>' +
    l.map((p) => '<tr><td>' + (sDijelom ? '<button type="button" class="pok" data-pokazi="' + esc(p.id) + '">' + esc(p.sto) + '</button>' : esc(p.sto)) + '</td>' + (sDijelom ? '' : '<td>' + esc(p.vrijednost) + '</td>') + '<td>' + sIzvorima(p.napomena) + '</td></tr>').join('') +
    '</tbody></table></div>' : '';
  $('pretp-tablice').innerHTML = t('Sukobi izvora', sukobi, false) + t('Procijenjene vrijednosti', vrij, false) + t('Dijelovi s procijenjenim izgledom, položajem ili podatkom', dij, true);
  $('pretp-tablice').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pokazi]'); if (!b) return;
    odaberiDio(b.dataset.pokazi); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
const BEZ_URL = { FOTO: 'vlastita fotografija robota u stanici — služi samo kao predložak za model i procjenu mjera, ne objavljuje se', 'DH-PROV': 'vlastiti izračun: DH tablica provjerena prema URDF lancu (odstupanje manje od 10⁻¹⁴ m)' };
function opisUrl(u) {
  try {
    const x = new URL(u);
    const put = decodeURIComponent(x.pathname).replace(/\/(index\.html?)?$/, '');
    const d = put.split('/').filter(Boolean);
    let rep = d.slice(-2).join(' / ');
    if (x.search) { const m = decodeURIComponent(x.search).match(/model=([^&]+)/); if (m) rep += ' · ' + m[1]; }
    return x.hostname.replace(/^www\./, '') + (rep ? ' · ' + rep : '');
  } catch (e) { return u; }
}
function crtajIzvore() {
  $('izvori').innerHTML = Object.keys(IZVORI).map((k) => '<li id="izvor-' + esc(k) + '"><b>' + esc(k) + '</b> — ' +
    (IZVORI[k] ? '<a href="' + esc(IZVORI[k]) + '" target="_blank" rel="noopener">' + esc(opisUrl(IZVORI[k])) + '</a>' : '<span class="bez">' + esc(BEZ_URL[k] || 'bez javne poveznice') + '</span>') + '</li>').join('');
}

/* ================================================================== */
/* 15. Petlja (crta se samo kad se nešto mijenja)                      */
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
  if (korakUpravljaca(dt, t)) ide = true;
  if (korakPrstiju(dt)) ide = true;
  if (controls.update()) ide = true;
  zauzet = ide;
  if (ide || crtati) { renderer.render(scene, camera); brojCrtanja++; }
  crtati = false;
  if (ide && !document.hidden && !rafId) rafId = requestAnimationFrame(okvir);
}

/* ================================================================== */
/* 16. Pokretanje                                                     */
/* ================================================================== */
$('hero-brojke').textContent = DIJELOVI.length + ' dijelova u ' + SKUPINE.length + ' skupina · ' + Object.keys(TEME).length + ' animacija „Kako radi” · prikazana inačica ' + V.oznaka + ' · podaci s izvorima, pretpostavke označene · prijeđi mišem preko modela za naziv dijela, klikni dio da ga odabereš.';
crtajInacicu();
crtajStablo();
karticaUvod();
crtajPodatke(); crtajPretpostavke(); crtajIzvore();
oznaciAlat(); azurirajKlizace(); ocitanje(); oznaciPolozaj();
velicina();
pogled('foto', false);
const uc = $('ucitavanje'); if (uc) uc.remove();
trazi();
window.__upoz = { scene, renderer, camera, controls, R, st, K, DIJELOVI, RODITELJ, POGLEDI, OS_DIJELOVI, odaberiDio, odaberiSkupinu, pogled, pogodak, otvoriTemu, zatvoriTemu,
  prebaciOs, prebaciUpravljac, postaviAlat, idiUPolozaj, postaviQ, pocetno, postaviRastav, postaviUnutra,
  render: () => renderer.render(scene, camera), trazi, get brojCrtanja() { return brojCrtanja; }, get zauzet() { return zauzet || crtati || !!rafId; }, get tema() { return tema; } };
