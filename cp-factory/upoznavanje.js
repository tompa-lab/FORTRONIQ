/* FORTRONIQ · Pametna tvornica CP Factory — Upoznavanje sustava (3D).
   Linija RASS – BRANCH – ASRS32, CP-COBOT-M, Robotino i stanica za punjenje: izbornik modul po modul i dio po dio, trake i nosač po petlji,
   operacije skladišta 210–213, skretnica BRANCH-a, pristajanje Robotina, spremište alata robota KUKA, MES, upravljanje, podaci, pretpostavke, izvori.
   Svi nazivi, opisi, brojevi, izvori i pretpostavke čitaju se iz cpf_podaci.js — ovdje su samo natpisi sučelja.
   Roboti se uvoze iz svojih područja (KUKA, UR3e, Robotino). Iscrtavanje na zahtjev (scena ima ~290 000 trokuta).
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KONFIG, MJERE, MODULI, MATERIJAL, MES, UPRAVLJANJE, SCENARIJ, SKUPINE, PODRUCJA, IZVORI, DIJELOVI, TEKST_PRETPOSTAVKE, pretpostavke, nadjiDio, dijeloviSkupine, izvoriDijela } from './cpf_podaci.js';
import { napraviLiniju } from './cpf_model.js';
import { TEME, prikazi, postaviPodatke } from './teme_cpf.js';
import { napraviKUKA } from '../robot-kuka-kr6-r900/kuka_model.js';
import * as KIN from '../robot-kuka-kr6-r900/kuka_kin.js';
import { POLOZAJI as POL_KUKA } from '../robot-kuka-kr6-r900/kuka_podaci.js';
import { napraviUR3e, POLOZAJI as POL_UR } from '../kobot-ur3e/ur3e_model.js';
import { napraviRobotino, napraviStanicu } from '../mobilni-robot-robotino/robotino_model.js';
import * as RK from '../mobilni-robot-robotino/robotino_kin.js';
import { MJERE as MJR } from '../mobilni-robot-robotino/robotino_podaci.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = (n, d = 2) => { const k = Math.pow(10, d); const v = Math.round(n * k) / k; return (Object.is(v, -0) ? 0 : v).toString().replace('.', ',').replace('-', '−'); };
const mm = (m) => br(m * 1000, 0);
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const PR = pretpostavke();
const DIO_ID = new Set(DIJELOVI.map((d) => d.id));
const INDEKS = new Map(DIJELOVI.map((d, i) => [d.id, i]));
const T3 = (x, y, z) => new THREE.Vector3(x, z, -y);                 /* KS tlocrta linije → scena */

/* ================================================================== */
/* 1. Scena, linija i uvezeni roboti                                  */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
scenaEl.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 18; controls.minDistance = 0.15; controls.maxPolarAngle = Math.PI * 0.495;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.35));
{ const d1 = new THREE.DirectionalLight(0xffffff, 1.4); d1.position.set(2.5, 5, 4); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.5); d2.position.set(-3, 2.5, -2); scene.add(d2);
  const d3 = new THREE.DirectionalLight(0xffffff, 0.35); d3.position.set(0, 1.2, 5); scene.add(d3); }

/* roboti iz svojih područja (opcije prema API napomenama: bez upravljača, privjeska, kabela i spremišta) */
const kuka = napraviKUKA(THREE, { upravljac: false, privjesak: false, spremiste: false, pribor: false, kabeli: false, unutrasnjost: false, alat: 0 });
const Q_MIR = POL_KUKA.prirubnicaDolje.slice();
kuka.postavi(Q_MIR);
const ur = napraviUR3e(THREE, { ormar: false, privjesak: false, kabel: false });
ur.postavi(POL_UR.pocetni);
const rob = napraviRobotino(THREE, { stanica: false });
rob.postaviNosac(0, false);                                           /* nosač Robotina se ne prikazuje (CPF nosač ima druge mjere) */
const stan = napraviStanicu(THREE);
const L = napraviLiniju(THREE, { robotRass: kuka.korijen, robotCobot: ur.korijen, stanica: stan.grupa, pod: true, cobot: true, zid: false });
scene.add(L.grupa);
L.grupa.add(rob.korijen);
const T_DOCK = L.tocke.robotinoDocking, T_PUN = L.tocke.punjenje;
const P_PUN = RK.pozaPristajanja ? RK.pozaPristajanja(T_PUN.x, T_PUN.y, T_PUN.phi) : L.tocke.robotinoPunjenje;
P_PUN.phi = ((P_PUN.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
rob.postaviPozu(T_DOCK.x, T_DOCK.y, T_DOCK.phi);
L.prikljuci('robotino', rob.korijen);

/* korijeni uvezenih modela → dio u CPF podacima (njihovi vlastiti id-ovi se preskaču) */
const KORIJENI = new Map([[kuka.korijen, 'robotKUKA'], [ur.korijen, 'robotUR3e'], [rob.korijen, 'robotino'], [stan.grupa, 'stanicaPunjenja']]);
/* spremište alata: sadržaj svakog mjesta u zasebnu grupu koju robot može uzeti */
const MJESTA = L.moduli.rass.mjestaAlata.map((mj) => { const g = new THREE.Group(); g.name = 'alat_' + mj.name; mj.children.slice().forEach((c) => g.add(c)); mj.add(g); return { mj, g }; });
/* svjetla optičkog handshakea na BRANCH-u: vlastiti materijali da se mogu paliti */
const HS = (L.moduli.branch.handshake.svjetla || []).map((m) => { m.material = m.material.clone(); return { m, boja: m.material.color.getHex(), i0: m.material.emissiveIntensity || 1 }; });
const uzorak = L.grupa.getObjectByName('nosacUzorak');
const uzPaleta = uzorak.getObjectByName('paleta');
const uzIzradak = uzPaleta && uzPaleta.getObjectByName('izradak');
const IZR_MAT0 = uzIzradak ? uzIzradak.material : null;
L.grupa.updateMatrixWorld(true);

/* meshevi i dijelovi */
const SVI = [];
L.grupa.traverse((o) => { if (o.isMesh) SVI.push(o); });
const objektiDijela = (id) => ((L.dijelovi.get(id) || {}).objekti || []);
function dioOd(o) {
  for (let p = o; p; p = p.parent) if (KORIJENI.has(p)) return KORIJENI.get(p);
  for (let p = o; p; p = p.parent) { const id = p.userData && p.userData.dio; if (id && DIO_ID.has(id)) return id; }
  return null;
}
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
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
const naziv = (id) => (nadjiDio(id) || {}).naziv || id;
const osnovnoIme = (n) => String(n).replace(/\s*\(.*\)\s*$/, '');

/* modul ↔ skupina, poveznice na područja robota */
const MOD_SKUPINE = { 'RASS': 'rass', 'BRANCH': 'branch', 'ASRS32': 'asrs', 'CP-COBOT-M': 'cobot', 'Robotino': 'robotino' };
const SKUPINA_MODULA = Object.fromEntries(Object.entries(MOD_SKUPINE).map(([s, k]) => [k, s]));
const PODRUCJE_DIJELA = { robotKUKA: 'kuka', rassUpravljacRobota: 'kuka', rassIzmjenjivac: 'kuka', rassPrihvatnice: 'kuka', robotUR3e: 'ur3e', cobotUpravljac: 'ur3e', cobotPrivjesak: 'ur3e', robotino: 'robotino', robotinoDocking: 'robotino', stanicaPunjenja: 'robotino' };
const STRANICA_PODRUCJA = 'upoznavanje-robota.html';
const linkPodrucja = (k) => PODRUCJA[k] ? PODRUCJA[k].putanja + STRANICA_PODRUCJA : null;

/* ================================================================== */
/* 2. Stanje i iscrtavanje na zahtjev                                 */
/* ================================================================== */
const BRZINE = { spora: MJERE.traka.brzinaSpora, brza: MJERE.traka.brzinaBrza, ubrzano: MJERE.traka.brzinaBrza * 5 };
const st = { akt: null, skupina: null, otvorene: new Set(), samo: false,
  trake: false, pomak: 0, brzina: 'brza', bypass: true, krug: null,
  skretnica: 0, skretnicaCilj: 0, paletaST1: 'crna', robotinoNa: 'dock', alat: -1, qKuka: Q_MIR.slice(), kutR: [0, 0, 0], valjciR: [0, 0, 0] };
const vidjeni = new Set();
const KLJUC = 'ftq-cpf-upoznavanje';
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
const Rp = KONFIG.raspored;
const POGLEDI = {
  prostor: { n: 'Cijeli prostor', p: [-2.9, -6.6, 4.6], c: [1.0, -0.8, 0.55], o: 'Cijeli prostor: linija RASS – BRANCH – ASRS32, CP-COBOT-M lijevo sprijeda, MES računalo, Robotino i stanica za punjenje uz desni zid.' },
  linija: { n: 'Linija sprijeda', p: [1.15, -4.7, 1.62], c: [2.0, 0.6, 1.02], o: 'Linija sprijeda: slijeva RASS s robotskom ćelijom, u sredini BRANCH (okrenut za 180°, krak grananja prema tebi), desno regalno skladište ASRS32.' },
  odozgo: { n: 'Odozgo', p: [1.05, -1.05, 8.4], c: [1.05, -0.95, 0], o: 'Tlocrt: linija je vodoravno, prednja strana linije je dolje; vidi se petlja traka, bypass RASS-a i krak BRANCH-a.' },
  rass: { n: 'RASS', p: [1.75, -1.15, 2.6], c: [0.55, 0.9, 0.98], o: 'Robotska montažna stanica odozgo sprijeda: robot, spremište alata, stezna naprava, treća traka (bypass) i kutija PCB.' },
  branch: { n: 'BRANCH', p: [2.75, -1.75, 1.9], c: [1.8, 0.1, 0.95], o: 'Modul grananja sprijeda: skretnica, krak s trakama 3 i 4 i mjesto predaje Robotinu.' },
  branchStraga: { n: 'BRANCH straga', p: [1.05, 2.75, 2.0], c: [1.85, 0.5, 0.95], o: 'BRANCH straga: upravljačka ploča s HMI-jem i aplikacijski modul (modul je okrenut za 180°).' },
  asrs: { n: 'ASRS32', p: [4.05, -1.8, 2.0], c: [2.95, 0.4, 1.22], o: 'Regalno skladište: portal s osima X, Z, Y i C, regali sprijeda i straga, zaustavljači ST1 i ST2.' },
  cobot: { n: 'CP-COBOT-M', p: [Rp.cobot.x + 0.9, Rp.cobot.y - 1.55, 1.75], c: [Rp.cobot.x, Rp.cobot.y, 0.85], o: 'Modul s kobotom UR3e: radna ploha s mjestima BOX 1 i BOX 2, privjesak za učenje, upravljačka ploča.' },
  robotino: { n: 'Robotino', p: [1.95, -3.75, 1.95], c: [2.95, -0.7, 0.45], o: 'Robotino na položaju pristajanja ispred kraka BRANCH-a i stanica za punjenje uz desni zid.' },
  straga: { n: 'Straga', p: [0.0, 3.2, 2.0], c: [1.8, 0.5, 0.9], o: 'Linija straga: stražnji otvor RASS-a za kutiju PCB, spojevi stanica i lanac nužnog stopa.' }
};
const POGLED_SKUPINE = { 'Linija': 'linija', 'RASS': 'rass', 'BRANCH': 'branch', 'ASRS32': 'asrs', 'CP-COBOT-M': 'cobot', 'Robotino': 'robotino' };
let let_ = null;
function faktorOmjera() { return camera.aspect < 16 / 9 ? Math.pow((16 / 9) / camera.aspect, 0.55) : 1; }
function leti(poz, cilj, glatko = true) {
  if (!glatko) { let_ = null; camera.position.copy(poz); controls.target.copy(cilj); controls.update(); trazi(); return; }
  let_ = { t0: performance.now(), d: 900, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz.clone(), c1: cilj.clone() };
  trazi();
}
let pogledAkt = 'prostor';
function pogled(ime, glatko = true) {
  const p = POGLEDI[ime] || POGLEDI.prostor; pogledAkt = ime;
  const cilj = T3(...p.c), poz0 = T3(...p.p);
  const poz = cilj.clone().add(poz0.sub(cilj).multiplyScalar(faktorOmjera()));
  leti(poz, cilj, glatko);
  $('pogledi').querySelectorAll('[data-pogled]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pogled === ime)));
}
/* obuhvatni kvadar dijela — samo vidljivi meshevi (uvezeni roboti imaju skrivene pomoćne prikaze, npr. radni prostor) */
const _bb = new THREE.Box3();
function kutija(id) {
  const b = new THREE.Box3(); let ok = false;
  objektiDijela(id).forEach((o) => {
    if (!vidljivo(o)) return; o.updateMatrixWorld(true);
    o.traverseVisible((c) => { if (!c.isMesh || !c.geometry) return; if (c.isInstancedMesh) { c.computeBoundingBox(); _bb.copy(c.boundingBox).applyMatrix4(c.matrixWorld); } else { if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); _bb.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld); } if (!_bb.isEmpty()) { b.union(_bb); ok = true; } });
  });
  return ok ? b : null;
}
function udaljenost(r) {
  const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
  return Math.max(0.8, r / Math.sin(Math.min(vf, hf) / 2) * 1.35);
}
/* središte modula (za smjer pogleda prema dijelu) */
function sredisteSkupine(sk) {
  const k = MOD_SKUPINE[sk];
  if (k === 'robotino') return rob.korijen.position.clone();
  const g = k && L.moduli[k] ? L.moduli[k].grupa : null;
  if (g) return new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
  return T3(Rp.branch.x, Rp.branch.y, 0.9);
}
/* koliko neprozirnih meshova drugih dijelova zaklanja pogled iz točke poz na središte c */
const _ray = new THREE.Raycaster();
function zaklonjenost(poz, c, svoji) {
  const d = c.clone().sub(poz), L0 = d.length(); _ray.set(poz, d.normalize()); _ray.far = L0 * 0.97;
  let n = 0;
  for (const h of _ray.intersectObjects(SVI.filter((o) => vidljivo(o) && !svoji.has(o)), false)) {
    const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
    const m0 = h.object.userData.matIst || m;
    if (m0 && m0.transparent && m0.opacity < 0.6) continue;
    n++;
  }
  return n;
}
function letiDoDijela(id) {
  const d = nadjiDio(id); let b = kutija(id);
  if (!b && /^(paleta|izradak|rfidOznaka)$/.test(id)) b = kutija('nosac');
  if (!b) { pogled(POGLED_SKUPINE[d && d.skupina] || 'prostor'); return; }
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.06, b.getSize(new THREE.Vector3()).length() / 2);
  const pg = POGLEDI[POGLED_SKUPINE[d.skupina]] || POGLEDI.prostor;
  const zadano = T3(...pg.p).sub(T3(...pg.c)).normalize();
  const dist = udaljenost(r);
  /* kandidati: smjer pogleda skupine, smjer od središta modula prema dijelu, zrcalni smjer; bira se najmanje zaklonjen */
  const kand = [zadano];
  const s0 = sredisteSkupine(d.skupina), h = new THREE.Vector3(c.x - s0.x, 0, c.z - s0.z);
  const el = c.y < 0.7 ? 0.42 : 0.62;
  if (h.length() > 0.12) { h.normalize(); kand.push(new THREE.Vector3(h.x, el, h.z).normalize()); }
  kand.push(new THREE.Vector3(-zadano.x, zadano.y, -zadano.z).normalize());
  kand.push(new THREE.Vector3(zadano.z, el, -zadano.x).normalize(), new THREE.Vector3(-zadano.z, el, zadano.x).normalize());
  const svoji = new Set(); objektiDijela(id).forEach((o) => o.traverse((x) => { if (x.isMesh) svoji.add(x); }));
  let naj = kand[0], najN = Infinity;
  kand.forEach((sm, i) => { const n = zaklonjenost(c.clone().add(sm.clone().multiplyScalar(dist)), c, svoji) + (i ? 0.5 : 0); if (n < najN) { najN = n; naj = sm; } });
  leti(c.clone().add(naj.clone().multiplyScalar(dist)), c);
  $('pogledi').querySelectorAll('[data-pogled]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
}

/* ================================================================== */
/* 4. Isticanje                                                       */
/* ================================================================== */
const skriveni = new Set();
function primijeniIsticanje() {
  skriveni.forEach((o) => { o.visible = true; }); skriveni.clear();
  const id = st.akt;
  L.istakni(id || null);
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
    const k = MOD_SKUPINE[sk], podnaslov = k && MODULI[k] ? MODULI[k].nazivHr : 'oprema prostora, nosači, MES';
    h += '<li class="r1"><button type="button" class="uz-st skupina' + (akt ? ' akt' : '') + '" data-sk="' + si + '" aria-expanded="' + otv + '"' + (akt ? ' aria-current="true"' : '') + ' title="' + esc(podnaslov) + '">' +
      '<span class="str" aria-hidden="true">' + (otv ? '▾' : '▸') + '</span><span class="t">' + esc(sk) + '<span class="uz-vh"> — ' + esc(podnaslov) + '</span></span><span class="br">' + dio.filter((d) => vidjeni.has(d.id)).length + '/' + dio.length + '</span></button></li>';
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
const PUTANJE_PODRUCJA = new Map(Object.entries(PODRUCJA).map(([k, v]) => [v.putanja, k]));
function izvoriHtml(izvor) {
  const l = izvoriDijela({ izvor }); if (!l.length) return '';
  return 'Izvor: ' + l.map((x) => x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" title="Otvori izvor u novoj kartici">' + esc(x.kratica) + '</a>' : '<a href="#izvor-' + esc(x.kratica) + '">' + esc(x.kratica) + '</a>').join(', ') +
    ' <span class="uz-vh">(otvara se u novoj kartici)</span> · <a href="#izvor-' + esc(l[0].kratica) + '">popis izvora</a>';
}
function temaGumbi(kljucevi) {
  const k = [...new Set(kljucevi.filter((x) => x && TEME[x]))];
  $('k-tema-g').innerHTML = k.map((x) => '<button type="button" class="gumb" data-tema="' + x + '">Kako radi: ' + esc(TEME[x].naslov) + '</button>').join('');
  $('k-tema-g').hidden = !k.length;
}
function podrucjeGumbi(kljucevi) {
  const k = [...new Set(kljucevi.filter((x) => x && PODRUCJA[x]))];
  $('k-podr').innerHTML = k.map((x) => '<a class="gumb tanki" href="' + esc(linkPodrucja(x)) + '">Područje: ' + esc(PODRUCJA[x].naziv) + ' — dio po dio &#8594;</a>').join('');
  $('k-podr').hidden = !k.length;
}
function cipovi(naslov, ids) {
  return ids.length ? '<p class="uz-dj-n">' + esc(naslov) + '</p><ul class="uz-dj">' + ids.map((id) => '<li><button type="button" class="cip" data-skok="' + id + '">' + esc(naziv(id)) + '</button></li>').join('') + '</ul>' : '';
}
function vrijednostHtml(v) {
  const k = PUTANJE_PODRUCJA.get(v);
  return k ? '<a href="' + esc(linkPodrucja(k)) + '">' + esc(PODRUCJA[k].naziv) + '</a>' : esc(v);
}
function karticaUvod() {
  $('k-naziv').textContent = 'Upoznavanje sustava';
  $('k-skupina').textContent = DIJELOVI.length + ' dijelova u ' + SKUPINE.length + ' skupina';
  $('k-tekst').innerHTML = P('U izborniku odaberi modul pa dio — ili klikni dio na modelu. Prikaz se okrene prema odabranom dijelu i istakne ga, a ovdje dobiješ opis, podatke i izvor.',
    'Linija prenosi <b>nosače s paletama</b>: skladište ASRS32 izdaje paletu na nosač, nosač putuje trakama kroz BRANCH do robotske montaže u RASS-u i natrag u skladište. Na BRANCH-u nosač može preuzeti mobilni robot Robotino. CP-COBOT-M je samostalna ćelija s kobotom UR3e.',
    'Narančasta točka u izborniku označava dio kod kojeg je nešto procijenjeno (vidi „Što je pretpostavka”). Uz pregledani dio pojavi se kvačica.');
  $('k-podaci').hidden = true; $('k-izvor').hidden = true; $('k-pretp').innerHTML = '';
  temaGumbi([]); podrucjeGumbi([]);
  $('k-djeca').innerHTML = '<p class="uz-dj-n">Moduli i skupine:</p><ul class="uz-dj">' + SKUPINE.map((s, i) => '<li><button type="button" class="cip" data-skup="' + i + '">' + esc(s) + '</button></li>').join('') + '</ul>';
  $('k-prije').disabled = true; $('k-dalje').disabled = false;
  $('naslov-3d').textContent = 'Pametna tvornica';
}
function karticaDio(d) {
  $('k-naziv').textContent = d.naziv;
  const rod = RODITELJ.get(d.id);
  const k = MOD_SKUPINE[d.skupina];
  $('k-skupina').textContent = (k && MODULI[k] ? d.skupina + ' · ' + MODULI[k].nazivHr : d.skupina) + (rod ? ' · ' + naziv(rod) : '');
  $('k-tekst').innerHTML = P(esc(d.opis));
  const pod = d.podaci || [];
  $('k-podaci').innerHTML = pod.map(([o, v]) => '<dt>' + esc(o) + '</dt><dd>' + vrijednostHtml(v) + '</dd>').join('');
  $('k-podaci').hidden = !pod.length;
  $('k-pretp').innerHTML = d.pretpostavka ? '<p class="uz-pretp"><b>Pretpostavka:</b> ' + esc(d.napomena || 'dio podataka ili izgleda je procijenjen.') + '</p>' : (d.napomena ? '<p class="uz-pretp"><b>Napomena:</b> ' + esc(d.napomena) + '</p>' : '');
  const iz = izvoriHtml(d.izvor); $('k-izvor').innerHTML = iz; $('k-izvor').hidden = !iz;
  podrucjeGumbi([PODRUCJE_DIJELA[d.id]]);
  temaGumbi([d.tema]);
  const dj = djeca(d.id).map((x) => x.id);
  $('k-djeca').innerHTML = (dj.length ? cipovi('Dijelovi ovog sklopa:', dj) : '') + (rod ? cipovi('Sklop:', [rod]) : '');
  const i = INDEKS.get(d.id); $('k-prije').disabled = false; $('k-dalje').disabled = i === DIJELOVI.length - 1;
  $('naslov-3d').textContent = d.naziv;
}
function karticaSkupina(sk) {
  const dio = dijeloviSkupine(sk), k = MOD_SKUPINE[sk], M = k ? MODULI[k] : null;
  $('k-naziv').textContent = M ? sk + ' — ' + M.nazivHr : sk;
  $('k-skupina').textContent = (M ? M.oznaka + ' · ' : 'Skupina · ') + dio.length + ' dijelova';
  if (M) {
    $('k-tekst').innerHTML = P(esc(M.funkcija)) + (k === 'robotino' ? P(esc(MODULI.stanica.nazivHr + ': ' + MODULI.stanica.funkcija)) : '') +
      P('Tablični podaci modula su u odjeljku <a href="#modul-' + k + '">Podaci o modulima</a>. Odaberi dio modula u izborniku ili ispod.');
    const red = [['Oznaka', oznakaModula(M)], ['Naziv (proizvođač)', M.naziv], ['Narudžbeni br.', M.narudzbeni], ['Napajanje', M.napajanje],
      ['Snaga', M.snaga != null ? br(M.snaga, 0) + ' W' : null], ['Masa', M.masa != null ? br(M.masa, 0) + ' kg' : null], ['Mjere (V × Š × D)', mjereModula(M)]].filter((r) => r[1] != null && r[1] !== '');
    $('k-podaci').innerHTML = red.map(([o, v]) => '<dt>' + esc(o) + '</dt><dd>' + esc(v) + '</dd>').join(''); $('k-podaci').hidden = false;
    const iz = izvoriHtml(M.izvor); $('k-izvor').innerHTML = iz; $('k-izvor').hidden = !iz;
  } else {
    const Pt = L.trake.putevi;
    $('k-tekst').innerHTML = P('Zajednička oprema prostora: tok nosača po petlji traka, nosač s paletom i izratkom, kutije za dobavu dijelova, krajevi linije, spojevi stanica, lanac nužnog stopa, MES računalo, Fleet Manager i kompresori.',
      esc(MATERIJAL.odnos) + ' Glavna petlja u modelu duga je ' + br(Pt.petlja.L, 2) + ' m, bypass RASS-a ' + br(Pt.bypassRASS.L, 2) + ' m, a krak BRANCH-a ' + br(Pt.krakBRANCH.L, 2) + ' m (iz zadanih mjera).');
    $('k-podaci').hidden = true; $('k-izvor').hidden = true;
  }
  const pp = dio.filter((d) => d.pretpostavka).length;
  $('k-pretp').innerHTML = pp ? '<p class="uz-pretp"><b>Pretpostavke:</b> ' + pp + ' od ' + dio.length + ' dijelova ove skupine sadrži procijenjeni podatak, izgled ili položaj.</p>' : '';
  podrucjeGumbi(dio.map((d) => PODRUCJE_DIJELA[d.id]));
  temaGumbi(dio.map((d) => d.tema));
  $('k-djeca').innerHTML = cipovi('Dijelovi u ovoj skupini:', dio.map((d) => d.id));
  $('k-prije').disabled = false; $('k-dalje').disabled = false;
  $('naslov-3d').textContent = M ? sk + ' — ' + M.nazivHr : sk;
}
/* oznaka s pločice bez broja s pločice (brojevi s pločica se ne objavljuju) */
function oznakaModula(M) {
  const bp = M.brojNaPlocici ? String(M.brojNaPlocici).split(' ')[0] : null;
  return M.plocica && !(bp && M.plocica.includes(bp)) ? M.plocica : M.oznaka;
}
function mjereModula(M) {
  const m = M.mjere; if (!m) return null;
  if (m.promjer) return 'Ø ' + mm(m.promjer) + ' mm, visina ' + mm(m.visina) + ' mm';
  return mm(m.visina) + ' × ' + mm(m.sirina) + ' × ' + mm(m.dubina) + ' mm';
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
  if (opc.let !== false) { pogled(POGLED_SKUPINE[sk] || 'prostor'); opis((POGLEDI[POGLED_SKUPINE[sk]] || {}).o || ''); }
}
/* prikaz cijelog sustava bez isticanja (za radnje koje pokreću opremu); sk = skupina čija se kartica prikazuje */
function cijeliSustav(sk) {
  if (!st.akt && (!sk || st.skupina === sk)) return;
  st.akt = null;
  if (sk) { st.skupina = sk; st.otvorene.add(sk); karticaSkupina(sk); } else if (st.skupina) karticaSkupina(st.skupina); else karticaUvod();
  crtajStablo(); primijeniIsticanje();
}
$('k-prije').addEventListener('click', () => {
  if (st.akt) { const i = INDEKS.get(st.akt); if (i > 0) odaberiDio(DIJELOVI[i - 1].id); else { st.akt = null; st.skupina = null; karticaUvod(); crtajStablo(); primijeniIsticanje(); pogled('prostor'); } }
  else if (st.skupina) { const prvi = dijeloviSkupine(st.skupina)[0]; const i = INDEKS.get(prvi.id); if (i > 0) odaberiDio(DIJELOVI[i - 1].id); else { st.skupina = null; karticaUvod(); crtajStablo(); pogled('prostor'); } }
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
/* 7. „Kako radi” — animacije iz teme_cpf.js u dijalogu               */
/* ================================================================== */
const PUT = L.trake.putevi;
postaviPodatke({ izracun: { duljinaPetlje: PUT.petlja.L, duljinaBypass: PUT.bypassRASS.L, duljinaKraka: PUT.krakBRANCH.L, spojevi: PUT.spojevi } });
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
function crtajTeme() {
  const kljucevi = Object.keys(TEME);
  $('teme-popis').innerHTML = kljucevi.map((k) => {
    const dio = DIJELOVI.filter((d) => d.tema === k);
    const imena = [...new Set(dio.map((d) => osnovnoIme(d.naziv)))];
    return '<li><button type="button" data-tema="' + k + '"><b>' + esc(TEME[k].naslov) + '</b>' + (TEME[k].engl ? '<span class="e">' + esc(TEME[k].engl) + '</span>' : '') +
      '<span class="d">' + (imena.length ? 'Dijelovi: ' + esc(imena.slice(0, 4).join(', ')) + (imena.length > 4 ? ' i još ' + (imena.length - 4) : '') : 'Opća tema') + '</span></button></li>';
  }).join('');
  $('teme-broj').textContent = kljucevi.length + ' animacija';
}
$('teme-popis').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if (b) otvoriTemu(b.dataset.tema, b); });

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
  if (e.pointerType === 'touch' || dolje) return;
  const t = performance.now(); if (t - zadnjiHover < 90) return; zadnjiHover = t;
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
/* 9. Kanali animacije (svaki uređaj ima svoj niz koraka)             */
/* ================================================================== */
/* korak: { T (s) ili start() koji vraća T, f(u 0…1), kraj() } */
const kanali = {};
function pokreni(ime, koraci, gotovo) { kanali[ime] = { koraci, i: 0, t: 0, poceo: false, gotovo }; osvjeziGumbe(); trazi(); }
const radi = (ime) => !!kanali[ime];
function zaustaviKanal(ime) { delete kanali[ime]; }
function korakKanala(dt) {
  let ide = false;
  for (const ime of Object.keys(kanali)) {
    const K = kanali[ime]; if (!K) continue;
    let ostatak = dt, n = 0;
    while (K && K.i < K.koraci.length && n++ < 20) {
      const k = K.koraci[K.i];
      if (!K.poceo) { K.poceo = true; K.t = 0; K.T = typeof k.start === 'function' ? (k.start() ?? k.T ?? 0) : (k.T ?? 0); }
      K.t += ostatak; ostatak = 0;
      const u = K.T > 0 ? Math.min(1, K.t / K.T) : 1;
      if (k.f) k.f(u);
      if (u < 1) break;
      ostatak = K.T > 0 ? K.t - K.T : 0;
      if (k.kraj) k.kraj();
      K.i++; K.poceo = false;
    }
    if (kanali[ime] === K && K.i >= K.koraci.length) { delete kanali[ime]; if (K.gotovo) K.gotovo(); osvjeziGumbe(); }
    ide = true;
  }
  return ide;
}

/* ================================================================== */
/* 10. Trake i nosač po petlji                                        */
/* ================================================================== */
const Z = L.zaustavljaci, SPOJ = PUT.spojevi;
const TRAJANJE_RASS = (SCENARIJ.koraci.find((k) => k.resurs === 'rass') || {}).trajanje;
function postaviUzorak(put, s) {
  const q = L.trake.tocka(put, s);
  uzorak.position.set(q.x, q.z, -q.y); uzorak.rotation.y = q.kut;
}
function brzina() { return BRZINE[st.brzina] || BRZINE.brza; }
function pokreniTrake(v) {
  st.trake = !!v; $('t-trake').setAttribute('aria-pressed', String(st.trake)); $('t-trake').textContent = st.trake ? 'Zaustavi trake' : 'Pokreni trake';
  trazi();
}
$('t-trake').addEventListener('click', () => {
  if (st.krug) return;
  pokreniTrake(!st.trake);
  if (st.trake) { cijeliSustav(); opis('Remeni svih traka se kreću: prednja traka vozi od ASRS-a prema RASS-u, stražnja natrag (smjer vožnje je pretpostavka). Brzina ' + br(brzina(), 2) + ' m/s' + (st.brzina === 'ubrzano' ? ' — prikaz ubrzan pet puta.' : '.')); }
  else opis('Trake su zaustavljene.');
});
$('brzina').querySelectorAll('[data-brzina]').forEach((b) => b.addEventListener('click', () => {
  st.brzina = b.dataset.brzina; $('brzina').querySelectorAll('[data-brzina]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  opis(st.brzina === 'ubrzano' ? 'Prikaz je ubrzan pet puta u odnosu na brzi hod traka (' + br(BRZINE.brza, 2) + ' m/s, pretpostavka).' : 'Brzina traka: ' + br(brzina(), 2) + ' m/s (' + (st.brzina === 'spora' ? 'sporo' : 'brzo') + '; brzina nije objavljena — pretpostavka).');
}));
$('t-bypass').addEventListener('change', () => { st.bypass = $('t-bypass').checked; });
function sviZaustavljaci(gore) { Object.keys(Z).forEach((id) => L.zaustavljac(id, gore)); }
function pokreniKrug() {
  if (st.krug || radi('asrs')) return;
  cijeliSustav(); pogled('linija');
  st.krug = { put: 'petlja', s: Z.asrsST1.s, prijedeno: 0, pauza: 0, posjeceno: new Set() };
  sviZaustavljaci(false);
  pokreniTrake(true); $('t-krug').setAttribute('aria-pressed', 'true'); $('t-krug').textContent = 'Zaustavi nosač';
  opis('Zaustavljač ST1 se spušta i nosač kreće prednjom trakom prema BRANCH-u' + (st.skretnicaCilj ? ' — skretnica je otvorena, pa nosač ulazi u krak.' : ' — skretnica je ravno, nosač prolazi.'));
  osvjeziGumbe();
}
function zavrsiKrug(tekst) {
  if (!st.krug) return;
  st.krug = null; sviZaustavljaci(true); postaviUzorak('petlja', Z.asrsST1.s);
  pokreniTrake(false); $('t-krug').setAttribute('aria-pressed', 'false'); $('t-krug').textContent = 'Nosač po petlji';
  if (tekst) opis(tekst);
  osvjeziGumbe(); trazi();
}
$('t-krug').addEventListener('click', () => { if (st.krug) zavrsiKrug('Nosač je vraćen na ST1.'); else pokreniKrug(); });
function dogadjajiPuta(K) {
  const e = [];
  if (K.put === 'petlja') {
    if (K.prijedeno > 1) e.push({ s: Z.asrsST1.s, tip: 'kraj' });
    if (st.skretnicaCilj === 1 && !K.posjeceno.has('krak')) e.push({ s: SPOJ.krakBRANCH.izlaz, tip: 'u', put: 'krakBRANCH' });
    if (st.bypass && !K.posjeceno.has('bypass')) e.push({ s: SPOJ.bypassRASS.izlaz, tip: 'u', put: 'bypassRASS' });
  } else {
    if (K.put === 'bypassRASS' && !K.posjeceno.has('rassRadni')) e.push({ s: Z.rassRadni.s, tip: 'stani', id: 'rassRadni', T: 3, tekst: 'Nosač stoji na radnom položaju robota u bypassu. Robot uzima PCB iz kutije i osigurače, kamera provjerava' + (TRAJANJE_RASS ? ' (montaža traje ~' + TRAJANJE_RASS + ' s — pretpostavka; ovdje skraćeno)' : '') + '. Za to vrijeme glavne trake slobodno prolaze.' });
    if (K.put === 'krakBRANCH' && !K.posjeceno.has('branchTraka4')) e.push({ s: Z.branchTraka4.s, tip: 'stani', id: 'branchTraka4', T: 2.5, tekst: 'Nosač stoji na zaustavljaču trake 4 u kraku. ' + (st.robotinoNa === 'dock' ? 'Robotino je pristao — nakon handshakea mogao bi preuzeti nosač (predaja je prikazana u simulatoru linije).' : 'Robotino nije na mjestu predaje, pa se nosač vraća na glavnu traku.') });
    e.push({ s: L.trake.duljina(K.put), tip: 'van' });
  }
  return e;
}
function korakKruga(dt) {
  const K = st.krug; if (!K) return false;
  if (K.pauza > 0) {
    K.pauza -= dt;
    if (K.pauza <= 0) { L.zaustavljac(K.pauzaId, false); opis(K.put === 'bypassRASS' ? 'Montaža je gotova: zaustavljač se spušta i nosač se vraća na stražnju traku prema ASRS-u.' : 'Nosač se trakom 4 vraća na prednju traku.'); }
    return true;
  }
  let ds = brzina() * dt;
  for (let n = 0; n < 6 && ds > 1e-9; n++) {
    const Lp = L.trake.duljina(K.put), zat = K.put === 'petlja';
    /* najbliži događaj ispred nosača unutar ds */
    let naj = null, najD = Infinity;
    dogadjajiPuta(K).forEach((ev) => {
      let d = ev.s - K.s; if (zat && d < -1e-9) d += Lp;
      if (d >= -1e-9 && d <= ds && d < najD) { naj = ev; najD = Math.max(0, d); }
    });
    if (!naj) { K.s += ds; K.prijedeno += ds; if (zat) K.s = ((K.s % Lp) + Lp) % Lp; ds = 0; break; }
    K.s = zat ? ((K.s + najD) % Lp) : K.s + najD; K.prijedeno += najD; ds -= najD;
    if (naj.tip === 'kraj') { postaviUzorak('petlja', Z.asrsST1.s); zavrsiKrug('Nosač je obišao petlju i stao na ST1 — zaustavljači su ponovno podignuti.'); return true; }
    if (naj.tip === 'u') {
      K.posjeceno.add(naj.put === 'krakBRANCH' ? 'krak' : 'bypass'); K.povratak = SPOJ[naj.put].ulaz; K.put = naj.put; K.s = 0;
      opis(naj.put === 'krakBRANCH' ? 'Skretnica šalje nosač trakom 3 u krak grananja, prema mjestu predaje Robotinu.' : 'Nosač stražnjom trakom stiže do RASS-a i skreće na treću traku (bypass) prema radnom položaju robota.');
      continue;
    }
    if (naj.tip === 'van') { K.put = 'petlja'; K.s = K.povratak; continue; }
    if (naj.tip === 'stani') { K.posjeceno.add(naj.id); K.pauza = naj.T; K.pauzaId = naj.id; L.zaustavljac(naj.id, true); opis(naj.tekst); break; }
  }
  postaviUzorak(K.put, K.s);
  return true;
}

/* ================================================================== */
/* 11. Skretnica BRANCH-a                                             */
/* ================================================================== */
function oznaciSkretnicu() { document.querySelectorAll('#k-scena [data-skretnica]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.skretnica === st.skretnicaCilj))); }
document.querySelectorAll('#k-scena [data-skretnica]').forEach((b) => b.addEventListener('click', () => {
  const cilj = +b.dataset.skretnica; if (cilj === st.skretnicaCilj && !radi('skretnica')) return;
  st.skretnicaCilj = cilj; oznaciSkretnicu();
  if (!st.krug) { cijeliSustav('BRANCH'); pogled('branch'); }
  const s0 = st.skretnica;
  pokreni('skretnica', [{ T: 0.7 * Math.abs(cilj - s0) + 0.05, f: (u) => { st.skretnica = lerp(s0, cilj, ease(u)); L.skretnica(st.skretnica); } }]);
  opis(cilj ? 'Pneumatski zakretni cilindar okreće skretnicu: nosači s prednje trake skreću u krak (trake 3 i 4). Prije zakretanja senzori provjeravaju da je područje skretnice slobodno.' : 'Skretnica je u položaju „ravno”: nosači prolaze prednjom trakom.');
}));

/* ================================================================== */
/* 12. Regalno skladište ASRS32: operacije 210–213                    */
/* ================================================================== */
const A = L.moduli.asrs, OS = MJERE.asrs.os;
const POC_POLICE = A.stanjePolica.map((s) => (s ? { ...s } : null));
const POC_OSI = { ...A.stanje };
const instIzr = (objektiDijela('asrsPalete') || []).find((o) => o.isInstancedMesh && o.instanceColor);
const OP_ASRS = MES.operacije.filter((o) => o.resurs === 'asrs' && o.opNo != null).map((o) => ({ ...o, spremi: /store/i.test(o.naziv), k: /2\s*$/.test(o.naziv) ? 2 : 1 }));
$('asrs-gumbi').innerHTML = OP_ASRS.map((o) => '<button type="button" class="gumb tanki" data-op="' + o.opNo + '" aria-label="Operacija ' + o.opNo + ': ' + esc(o.opis) + '" title="' + esc(o.naziv + ' — ' + o.opis) + '">' + o.opNo + ' ' + (o.spremi ? 'Spremi s ST' : 'Izdaj na ST') + o.k + '</button>').join('');
function osiDo(cilj) {
  let od = null, T = 0;
  return {
    start: () => {
      od = { ...A.stanje }; const c = { x: od.x, z: od.z, y: od.y, c: od.c, ...cilj };
      od.cilj = c;
      T = Math.max(Math.abs(c.x - od.x) / OS.vX, Math.abs(c.z - od.z) / OS.vZ, Math.abs(c.y - od.y) / OS.yHod * OS.tY, Math.abs(c.c - od.c) > 1e-3 ? OS.tC : 0, 0.05);
      return T;
    },
    f: (u) => { const c = od.cilj, k = ease(u); A.postaviOsi(lerp(od.x, c.x, k), lerp(od.z, c.z, k), lerp(od.y, c.y, k), lerp(od.c, c.c, k)); }
  };
}
const cekaj = (T, kraj) => ({ T, kraj });
const bojaIzratkaNaPolici = (n) => { if (!instIzr) return null; const c = new THREE.Color(); instIzr.getColorAt(n - 1, c); return c.getHex(); };
function bojaUzorka(hex) {
  if (!uzIzradak || hex == null) return;
  const m = (uzIzradak.userData.matIst || uzIzradak.material).clone(); m.color.setHex(hex);
  if (uzIzradak.userData.matIst) uzIzradak.userData.matIst = m; else uzIzradak.material = m;
}
function paletaNaST1(v, izr) { if (uzPaleta) uzPaleta.visible = !!v; if (uzIzradak) uzIzradak.visible = !!(v && izr); }
const prvaPuna = () => { const i = A.stanjePolica.findIndex((s) => s && s.izradak); return i >= 0 ? i + 1 : (A.stanjePolica.findIndex((s) => !!s) + 1) || 0; };
const prvaPrazna = () => A.stanjePolica.findIndex((s) => !s) + 1;
function opAsrs(opNo) {
  const o = OP_ASRS.find((x) => String(x.opNo) === String(opNo)); if (!o || radi('asrs') || (o.k === 1 && st.krug)) return;
  cijeliSustav('ASRS32'); pogled('asrs');
  const zST = A.pozaStopera(o.k), iznad = 0.03, ZAD = 0.012;
  const koraci = [];
  const nosacST2 = (paleta, izradak, s) => L.postaviNosac('st2', s, 'petlja', { paleta, izradak: izradak || null });
  if (o.spremi) {
    const n = prvaPrazna(); if (!n) { opis('Skladište je puno — nema slobodnog mjesta.'); return; }
    const m = A.pozaMjesta(n); let izr = null;
    if (o.k === 1) { izr = st.paletaST1; if (!uzPaleta.visible) { opis('Na nosaču na ST1 nema palete — prvo je izdaj (212).'); return; } }
    else {
      izr = 'plava';
      const s1 = Z.asrsST2.s;
      koraci.push({ T: 0.5 / BRZINE.brza / 2, start: () => { L.zaustavljac('asrsST2', true); nosacST2(true, izr, s1 - 0.5); return 1.4; }, f: (u) => nosacST2(true, izr, s1 - 0.5 + 0.5 * ease(u)) });
    }
    opis('Operacija ' + o.opNo + ' (' + o.naziv + '): prihvatnica se spušta na paletu na ST' + o.k + ', hvata je i nosi na slobodno mjesto ' + n + ' (' + (n <= 16 ? 'prednji' : 'stražnji') + ' regal).');
    koraci.push(osiDo({ x: zST.x, z: zST.z + iznad, y: 0, c: zST.c }), osiDo({ z: zST.z }));
    koraci.push(cekaj(OS.tHvat, () => { A.hvataljka(false); A.paletaUHvataljci(true, { izradak: izr }); if (o.k === 1) paletaNaST1(false); else nosacST2(false, null, Z.asrsST2.s); }));
    koraci.push(osiDo({ z: zST.z + iznad }), osiDo({ x: m.x, z: m.z + ZAD, y: 0, c: m.c }), osiDo({ y: m.y }), osiDo({ z: m.z }));
    koraci.push(cekaj(OS.tHvat, () => { A.hvataljka(true); A.paletaUHvataljci(false); A.postaviPaletu(n, izr ? { izradak: izr } : {}); }));
    koraci.push(osiDo({ y: 0 }));
    if (o.k === 2) koraci.push({ start: () => { L.zaustavljac('asrsST2', false); return 1.2; }, f: (u) => nosacST2(false, null, Z.asrsST2.s + 0.16 * ease(u)), kraj: () => { L.ukloniNosac('st2'); L.zaustavljac('asrsST2', true); } });
    pokreni('asrs', koraci, () => { opis('Paleta je spremljena na mjesto ' + n + '. MES ažurira zalihu (OpEnd).'); osvjeziGumbe(); });
  } else {
    const n = prvaPuna(); if (!n) { opis('Skladište je prazno.'); return; }
    if (o.k === 1 && uzPaleta.visible) { opis('Nosač na ST1 već nosi paletu — prvo je spremi (210).'); return; }
    const m = A.pozaMjesta(n), sP = A.stanjePolica[n - 1] || {}, izr = sP.izradak || null, hex = izr ? bojaIzratkaNaPolici(n) : null;
    if (o.k === 2) {
      const s1 = Z.asrsST2.s;
      koraci.push({ start: () => { L.zaustavljac('asrsST2', true); nosacST2(false, null, s1 - 0.5); return 1.4; }, f: (u) => nosacST2(false, null, s1 - 0.5 + 0.5 * ease(u)) });
    }
    opis('Operacija ' + o.opNo + ' (' + o.naziv + '): portal vozi do mjesta ' + n + ', os Y uvlači prihvatnicu pod paletu, hvata je i odlaže na prazan nosač na ST' + o.k + '.');
    koraci.push(osiDo({ x: m.x, z: m.z, y: 0, c: m.c }), osiDo({ y: m.y }));
    koraci.push(cekaj(OS.tHvat, () => { A.hvataljka(false); A.paletaUHvataljci(true, { izradak: izr }); A.postaviPaletu(n, null); }));
    koraci.push(osiDo({ z: m.z + ZAD }), osiDo({ y: 0 }), osiDo({ x: zST.x, z: zST.z + iznad, y: 0, c: zST.c }), osiDo({ z: zST.z }));
    koraci.push(cekaj(OS.tHvat, () => {
      A.hvataljka(true); A.paletaUHvataljci(false);
      if (o.k === 1) { st.paletaST1 = izr; if (hex != null) bojaUzorka(hex); paletaNaST1(true, izr); primijeniIsticanje(); } else nosacST2(true, izr, Z.asrsST2.s);
    }));
    koraci.push(osiDo({ z: zST.z + 0.25 }));
    if (o.k === 2) koraci.push({ start: () => { L.zaustavljac('asrsST2', false); return 1.2; }, f: (u) => nosacST2(true, izr, Z.asrsST2.s + 0.16 * ease(u)), kraj: () => { L.ukloniNosac('st2'); L.zaustavljac('asrsST2', true); } });
    pokreni('asrs', koraci, () => { opis('Paleta s mjesta ' + n + ' je na nosaču na ST' + o.k + '. OpEnd upisuje u RFID nosača sljedeći resurs.'); osvjeziGumbe(); });
  }
}
$('asrs-gumbi').addEventListener('click', (e) => { const b = e.target.closest('[data-op]'); if (b && !b.disabled) opAsrs(b.dataset.op); });

/* ================================================================== */
/* 13. Robotino: punjenje ↔ pristajanje na BRANCH-u                    */
/* ================================================================== */
const V_ROB = 0.3;                                                    /* brzina prikaza vožnje (m/s) */
function handshake(v) {
  /* odašiljač i prijemnik svijetle dok je Robotino na položaju pristajanja */
  HS.forEach(({ m, boja, i0 }) => { const mt = m.userData.matIst || m.material; if (!mt.emissive) return; mt.emissive.setHex(v ? boja : 0x000000); mt.emissiveIntensity = v ? Math.max(1, i0) : 0; mt.color.setHex(v ? boja : 0x30363a); });
  trazi();
}
function vozi(tocke) {
  /* tocke: [{x, y, phi}] — dionice po pravcu s konstantnom brzinom, kotači iz inverzne kinematike */
  const koraci = [];
  for (let i = 1; i < tocke.length; i++) {
    const a = tocke[i - 1], b = tocke[i], d = Math.hypot(b.x - a.x, b.y - a.y), dphi = b.phi - a.phi;
    const T = Math.max(0.4, d / V_ROB, Math.abs(dphi) / 0.8);
    let up = 0;
    koraci.push({ T, f: (u) => {
      const k = ease(u), du = k - up; up = k;
      const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k), f = lerp(a.phi, b.phi, k);
      rob.postaviPozu(x, y, f);
      const dx = (b.x - a.x) * du, dy = (b.y - a.y) * du, df = dphi * du, c = Math.cos(f), s = Math.sin(f);
      const vx = c * dx + s * dy, vy = -s * dx + c * dy;          /* pomak u KS robota (po koraku) */
      const m = RK.inverzna(vx, vy, df), rv = RK.brzineValjaka(vx, vy, df), rr = MJR.valjci.promjer / 2;
      for (let j = 0; j < 3; j++) { st.kutR[j] += RK.kutKotaca(m[j], 1); st.valjciR[j] += rv[j] / rr; }
      rob.postaviKotace(st.kutR, st.valjciR);
    } });
  }
  return koraci;
}
function putRobotina(naDock) {
  const D = { x: T_DOCK.x, y: T_DOCK.y, phi: T_DOCK.phi }, C = { x: P_PUN.x, y: P_PUN.y, phi: P_PUN.phi };
  const W1 = { x: D.x, y: C.y, phi: D.phi }, W2 = { x: C.x - 0.35 * Math.cos(C.phi), y: C.y - 0.35 * Math.sin(C.phi), phi: C.phi };
  const t = [D, W1, W2, C];
  return naDock ? t.reverse() : t;
}
function robotinoVozi() {
  if (radi('robotino')) return;
  const naDock = st.robotinoNa !== 'dock';
  cijeliSustav('Robotino'); pogled('robotino');
  if (!naDock) handshake(false);
  opis(naDock ? 'Fleet Manager šalje Robotina sa stanice za punjenje na naučeni položaj ispred kraka BRANCH-a. Zadnji dio vožnje je bočni prilaz — svesmjerni pogon to omogućuje bez okretanja.' : 'Bez naloga Robotino odlazi na stanicu za punjenje (pozicija iz Fleet Managera) i pristaje prednjom stranom na kontaktnu ploču.');
  st.robotinoNa = 'vozi';
  pokreni('robotino', vozi(putRobotina(naDock)), () => {
    st.robotinoNa = naDock ? 'dock' : 'punjenje';
    if (naDock) { handshake(true); opis('Robotino je pristao: prihvat je u osi traka kraka, a optički handshake (odašiljač i prijemnik) potvrđuje da je spreman za predaju nosača.'); }
    else opis('Robotino je na stanici za punjenje.');
    osvjeziGumbe();
  });
}
$('r-dock').addEventListener('click', robotinoVozi);

/* ================================================================== */
/* 14. Robot KUKA i spremište alata                                   */
/* ================================================================== */
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();
/* KS robota ($ROBROOT) iz svijeta: kuka.robot je grupa u KS robota (z gore) */
function uKSRobota(w) { kuka.korijen.updateMatrixWorld(true); return (kuka.robot || kuka.korijen).worldToLocal(w.clone()); }
function smjerUKSRobota(dw) { const g = kuka.robot || kuka.korijen; _m.copy(g.matrixWorld).invert(); return dw.clone().transformDirection(_m); }
function okviriMjesta(i) {
  const { mj, g } = MJESTA[i];
  const vrh = new THREE.Box3().setFromObject(g).max.y;              /* gornja ploha izmjenjivača (strana alata) */
  const w = mj.getWorldPosition(new THREE.Vector3()); w.y = vrh;
  const p = uKSRobota(w);
  const xRass = new THREE.Vector3(1, 0, 0).applyQuaternion(L.moduli.rass.grupa.getWorldQuaternion(new THREE.Quaternion()));
  const s = smjerUKSRobota(xRass).normalize();                       /* vilica držača je otvorena prema +x modula */
  const T = KIN.okvir(p.x, p.y, p.z, 0, 0, Math.PI);                 /* prirubnica prema dolje */
  const Tpre = KIN.okvir(p.x + s.x * 0.12, p.y + s.y * 0.12, p.z + 0.004, 0, 0, Math.PI);
  return { T, Tpre };
}
function ptp(qCilj, min = 1.0) {
  let q0 = null;
  return { start: () => { q0 = st.qKuka.slice(); return Math.max(min, KIN.trajanjePTP(q0, qCilj, 0.35)); }, f: (u) => { st.qKuka = KIN.interpolirajPTP(q0, qCilj, ease(u)); kuka.postavi(st.qKuka); } };
}
function lin(T0, T1, Tdur = 1.0) {
  return { T: Tdur, f: (u) => { const T = KIN.interpolirajLIN(T0, T1, ease(u)); const r = KIN.ik(T, st.qKuka); if (r.uspjeh) { st.qKuka = r.q; kuka.postavi(st.qKuka); } } };
}
function koraciMjesta(i, uzmi) {
  const { T, Tpre } = okviriMjesta(i);
  const rPre = KIN.ik(Tpre, st.qKuka), rIn = KIN.ik(T, rPre.q);
  if (!rPre.uspjeh || !rIn.uspjeh) return null;
  const { mj, g } = MJESTA[i];
  return [ptp(rPre.q), lin(Tpre, T, 0.9), cekaj(0.35, () => { if (uzmi) { (kuka.flange || kuka.korijen).attach(g); st.alat = i; } else { mj.attach(g); st.alat = -1; } }), lin(T, Tpre, 0.9)];
}
const ALATI = MJESTA.map((x) => x.mj.name || '');
$('alat-gumbi').innerHTML = ALATI.map((n, i) => '<button type="button" class="gumb tanki" data-alatrob="' + i + '" aria-pressed="false" aria-label="Robot uzima alat s mjesta ' + esc(n) + '">' + esc(n) + '</button>').join('') +
  '<button type="button" class="gumb tanki" id="alat-odlozi">Odloži alat</button>';
function alat(i) {
  if (radi('kuka')) return;
  cijeliSustav('RASS'); pogled('rass');
  const koraci = [];
  if (st.alat >= 0) { const v = koraciMjesta(st.alat, false); if (!v) { opis('Mjesto alata je izvan dosega robota (provjeri položaj spremišta u podacima).'); return; } koraci.push(...v); }
  if (i >= 0 && i !== st.alat) {
    const u = koraciMjesta(i, true); if (!u) { opis('Mjesto ' + ALATI[i] + ' je izvan dosega robota s prirubnicom prema dolje (provjeri položaj spremišta u podacima).'); return; }
    koraci.push(...u);
  }
  koraci.push(ptp(Q_MIR, 0.8));
  const nakon = i >= 0 && i !== st.alat ? ALATI[i] : null;
  opis(nakon ? (st.alat >= 0 ? 'Robot vraća ' + ALATI[st.alat] + ' u spremište, pa ' : 'Robot ') + 'prilazi mjestu ' + nakon + ' s boka, uvlači izmjenjivač alata u vilicu držača, zaključava ga i izvlači alat. Spremište, položaji i redoslijed su pretpostavka iz fotografija.' : 'Robot vraća alat u njegovo mjesto u spremištu i otključava izmjenjivač.');
  pokreni('kuka', koraci, () => { opis(st.alat >= 0 ? 'Alat ' + ALATI[st.alat] + ' je na prirubnici robota.' : 'Prirubnica robota je bez alata; svi alati su u spremištu.'); osvjeziGumbe(); });
}
$('alat-gumbi').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.id === 'alat-odlozi') alat(-1); else alat(+b.dataset.alatrob);
});

/* ================================================================== */
/* 15. Gumbi: stanje, pogledi, početno stanje                          */
/* ================================================================== */
function osvjeziGumbe() {
  const ak = radi('asrs'), puna = prvaPuna(), prazna = prvaPrazna();
  $('asrs-gumbi').querySelectorAll('[data-op]').forEach((b) => {
    const o = OP_ASRS.find((x) => String(x.opNo) === b.dataset.op);
    let ok = !ak && !(o.k === 1 && st.krug);
    if (ok && o.spremi) ok = !!prazna && (o.k !== 1 || (uzPaleta && uzPaleta.visible));
    if (ok && !o.spremi) ok = !!puna && (o.k !== 1 || !(uzPaleta && uzPaleta.visible));
    b.disabled = !ok;
  });
  $('t-krug').disabled = ak; $('t-trake').disabled = !!st.krug;
  const kk = radi('kuka');
  $('alat-gumbi').querySelectorAll('[data-alatrob]').forEach((b) => { b.disabled = kk; b.setAttribute('aria-pressed', String(+b.dataset.alatrob === st.alat)); });
  $('alat-odlozi').disabled = kk || st.alat < 0;
  const rv = radi('robotino');
  $('r-dock').disabled = rv; $('r-dock').textContent = st.robotinoNa === 'punjenje' ? 'Pristani na BRANCH' : 'Na punjenje';
}
$('pogledi').innerHTML = Object.entries(POGLEDI).map(([k, v]) => '<button type="button" class="gumb tanki" data-pogled="' + k + '" aria-pressed="false">' + esc(v.n) + '</button>').join('');
$('pogledi').addEventListener('click', (e) => { const b = e.target.closest('[data-pogled]'); if (!b) return; pogled(b.dataset.pogled); opis(POGLEDI[b.dataset.pogled].o); });
$('r-samo').addEventListener('change', () => { st.samo = $('r-samo').checked; primijeniIsticanje(); });
function pocetno() {
  Object.keys(kanali).forEach(zaustaviKanal);
  st.krug = null; pokreniTrake(false); $('t-krug').setAttribute('aria-pressed', 'false'); $('t-krug').textContent = 'Nosač po petlji';
  st.pomak = 0; L.azuriraj(0, 1);
  sviZaustavljaci(true); postaviUzorak('petlja', Z.asrsST1.s);
  L.ukloniNosac('st2');
  POC_POLICE.forEach((s, i) => A.postaviPaletu(i + 1, s ? { ...s } : null));
  A.postaviOsi(POC_OSI.x, POC_OSI.z, POC_OSI.y, POC_OSI.c); A.hvataljka(true); A.paletaUHvataljci(false);
  st.paletaST1 = 'crna'; paletaNaST1(true, true);
  if (uzIzradak && IZR_MAT0) { if (uzIzradak.userData.matIst) uzIzradak.userData.matIst = IZR_MAT0; else uzIzradak.material = IZR_MAT0; }
  st.skretnicaCilj = 0; st.skretnica = 0; L.skretnica(0); oznaciSkretnicu();
  st.robotinoNa = 'dock'; rob.postaviPozu(T_DOCK.x, T_DOCK.y, T_DOCK.phi); handshake(true);
  MJESTA.forEach(({ mj, g }) => { if (g.parent !== mj) { mj.add(g); g.position.set(0, 0, 0); g.quaternion.identity(); g.scale.set(1, 1, 1); } });
  st.alat = -1; st.qKuka = Q_MIR.slice(); kuka.postavi(st.qKuka);
  osvjeziGumbe(); trazi();
}
$('r-pocetno').addEventListener('click', () => { pocetno(); pogled('prostor'); opis('Vraćeno početno stanje: trake miruju, nosač s paletom na ST1, skladište i alati na svojim mjestima, Robotino na položaju pristajanja.'); });

/* ================================================================== */
/* 16. Odjeljci: MES, upravljanje, podaci, pretpostavke, izvori        */
/* ================================================================== */
const prZa = (sto) => PR.find((p) => !p.id && p.sto === sto) || null;
const prPocinje = (pocetak, tokeni) => PR.find((p) => !p.id && p.sto.startsWith(pocetak) && tokeni.some((t) => p.sto.includes(t))) || null;
function oznakaPr(p) {
  if (!p) return '';
  if (p.vrsta === 'nedostaje') return '<span class="uz-oz nedost">nedostaje</span>';
  return '<span class="uz-oz' + (p.vrsta === 'sukob' ? ' sukob' : '') + '" title="' + esc(p.napomena) + '">' + (p.vrsta === 'sukob' ? 'sukob izvora' : 'pretpostavka') + '</span>';
}
const izvLink = (s) => [...new Set(String(s || '').split(',').map((k) => k.trim()).filter(Boolean))].map((k) => '<a href="#izvor-' + esc(k) + '">[' + esc(k) + ']</a>').join(' ');
function sIzvorima(t) { return esc(t).replace(/\[([A-Za-z0-9_-]+)(?:\s[^\]]*)?\]/g, (s, k) => (k in IZVORI) ? '<a href="#izvor-' + k + '">' + s + '</a>' : s); }
const pokBtn = (id, tekst) => '<button type="button" class="pok" data-pokazi="' + esc(id) + '">' + esc(tekst || naziv(id)) + '</button>';
const skBtn = (sk, tekst) => '<button type="button" class="pok" data-skupina="' + esc(sk) + '">' + esc(tekst || sk) + '</button>';
function tbl(naslov, glava, redovi, izvor) {
  return '<div class="uz-tbl-omot"><table class="tbl uz-tbl"><caption>' + esc(naslov) + (izvor ? ' <span class="pom">' + izvLink(izvor) + '</span>' : '') + '</caption>' +
    (glava ? '<thead><tr>' + glava.map((g) => '<th scope="col">' + esc(g) + '</th>').join('') + '</tr></thead>' : '') + '<tbody>' + redovi.join('') + '</tbody></table></div>';
}
const resursSk = (r) => (r === 'mes' ? null : SKUPINA_MODULA[r] || null);
function crtajMES() {
  const ops = MES.operacije.map((o) => '<tr><td class="br">' + (o.opNo != null ? esc(o.opNo) : oznakaPr({ vrsta: 'nedostaje' })) + '</td><td>' + esc(o.naziv) + '</td><td>' + esc(o.opis) + '</td><td>' +
    (resursSk(o.resurs) ? skBtn(resursSk(o.resurs)) : esc(o.resurs)) + '</td><td>' + (o.izvor ? izvLink(o.izvor) : (o.nedostaje ? '<span class="pom">pročitati u MES4</span>' : '')) + '</td></tr>');
  const rs = MES.resursi || {}, prR = prZa('Resource ID-ovi');
  const resRedovi = Object.entries(rs).map(([k, v]) => '<tr><td class="br">' + esc(v) + '</td><td>' + (SKUPINA_MODULA[k] ? skBtn(SKUPINA_MODULA[k], SKUPINA_MODULA[k] + ' — ' + MODULI[k].nazivHr) : esc(k)) + '</td></tr>');
  const opEnd = prZa('Kod servisa OpEnd');
  const serv = MES.servisi.map((s) => '<tr><td><span class="uz-kod">' + esc(s.naziv) + '</span></td><td class="br">' + esc(s.kod) + (s.naziv === 'OpEnd' ? oznakaPr(opEnd) : '') + '</td></tr>');
  const koraci = SCENARIJ.koraci.map((k) => '<li><b>' + esc(k.naslov) + '</b>' + (k.opNo != null ? ' <span class="uz-kod">OpNo ' + esc(k.opNo) + '</span>' : (k.resurs === 'rass' ? ' ' + oznakaPr({ vrsta: 'nedostaje' }) : '')) + ' — ' + esc(k.opis) + '</li>').join('');
  $('mes-in').innerHTML = '<div class="uz-podaci-in">' +
    '<div class="uz-blok"><h3>Sustav</h3><p>' + esc(MES.sustav) + '.</p><h3>Tok naloga</h3><ol>' + MES.tokNaloga.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ol>' +
    '<p class="pom">Komunikacija: PLC svake stanice spaja se na MES4 — servisi na priključku ' + esc(MES.portovi.servis) + ', status na ' + esc(MES.portovi.status) + '. ' + esc(MES.status) + '. ' + izvLink(MES.izvor) + '</p></div>' +
    '<div class="uz-blok">' + tbl('Resource ID', ['ID', 'Resurs'], resRedovi) + (prR ? '<p class="pom">' + oznakaPr(prR) + ' ' + sIzvorima(prR.napomena) + '</p>' : '') +
    '<h3>Polja poruke</h3><ul class="uz-polja">' + MES.polja.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
    '<p class="pom">' + sIzvorima(MES.defaultParametri) + '</p></div>' +
    '<div class="uz-blok">' + tbl('Servisi PLC ↔ MES4', ['Servis', 'Kod'], serv, 'MES-IF') + '</div>' +
    '<div class="uz-blok siroko">' + tbl('Operacije (OpNo)', ['OpNo', 'Operacija', 'Opis', 'Resurs', 'Izvor'], ops) +
    '<p class="pom">Brojevi operacija RASS-a, BRANCH-a i transporta Robotinom nisu objavljeni — označeni su kao <span class="uz-oz nedost">nedostaje</span> i upisat će se kad se pročitaju u MES4.</p></div>' +
    '<div class="uz-blok siroko"><h3>Tipični nalog: ' + esc(SCENARIJ.naziv) + '</h3><ol>' + koraci + '</ol>' +
    '<p class="pom">Nije moguće s ovom opremom: ' + SCENARIJ.nijeMoguce.map(sIzvorima).join(' ') + '</p><p>Cijeli nalog korak po korak: <a href="simulator-linije.html">Simulator linije</a>.</p></div>' +
    '</div>';
}
function crtajUpravljanje() {
  const U = UPRAVLJANJE;
  const komp = [['PLC', U.plc.tip + ' — ' + U.plc.opis, U.plc.izvor, 'rassPlc'], ['HMI', U.hmi.tip, U.hmi.izvor, 'rassHmi'], ['Mrežni preklopnik', U.preklopnik.tip, U.preklopnik.izvor, 'rassPreklopnik']]
    .map(([o, v, iz, id]) => '<tr><td>' + pokBtn(id, o) + '</td><td>' + esc(v) + '</td><td>' + izvLink(iz) + '</td></tr>');
  const rel = Object.entries(U.releji).map(([k, v]) => '<tr><td>' + (SKUPINA_MODULA[k] ? skBtn(SKUPINA_MODULA[k]) : esc(k)) + '</td><td>' + esc(v) + '</td></tr>');
  const red = (U.sigurnosniLanac.redoslijed || []);
  const prL = prZa('Redoslijed konektora sigurnosnog lanca');
  const lanac = '<ol class="uz-lanac">' + red.map((r) => '<li><button type="button" class="cip" data-skupina="' + esc(SKUPINA_MODULA[r.modul] || '') + '"><b>' + esc(r.konektor) + '</b>' + esc(SKUPINA_MODULA[r.modul] || r.modul) + '</button></li>').join('') + '</ol>';
  $('upr-in').innerHTML = '<p class="pom">Svaka stanica linije ima vlastiti PLC, HMI i preklopnik; stanice se povezuju spojnom cijevi (napon, komunikacija, zrak), a nalozi dolaze iz MES4. ' + izvLink(U.izvor) + '</p><div class="uz-podaci-in">' +
    '<div class="uz-blok">' + tbl('Upravljačka oprema svake stanice', ['Komponenta', 'Tip', 'Izvor'], komp) + '<p class="pom">' + sIzvorima(U.opcUa) + '</p>' +
    '<h3>Spoj stanica i zrak</h3><p>' + esc(U.spoj) + '.</p><p>Zrak: ' + esc(U.zrak) + '. ' + pokBtn('spojnaCijev', 'Spoj u 3D') + ' · ' + pokBtn('kompresor', 'Kompresor u 3D') + '</p></div>' +
    '<div class="uz-blok"><h3>Načini rada</h3><ul>' + U.nacini.map((n) => '<li><b>' + esc(n.naziv) + '</b> — ' + esc(n.opis) + '</li>').join('') + '</ul><p class="pom">' + sIzvorima(U.ciklusKraj) + '</p></div>' +
    '<div class="uz-blok"><h3>Sigurnosni krug</h3><p>' + esc(U.sigurnosniLanac.opis) + '</p>' + lanac + (prL ? '<p class="pom">' + oznakaPr(prL) + ' ' + esc(prL.napomena) + '</p>' : '') +
    '<p><b>Vrata ćelije RASS-a:</b> ' + esc(U.vrataRass.opis) + ' — <b>' + esc(U.vrataRass.pl) + ', ' + esc(U.vrataRass.kategorija) + '</b> ' + izvLink(U.vrataRass.izvor) + '</p><p>' + sIzvorima(U.vrataOrmara) + '</p>' +
    tbl('Sigurnosni releji', ['Modul', 'Releji'], rel) + '<p>' + pokBtn('sigurnosniLanac', 'Lanac nužnog stopa u 3D') + '</p></div>' +
    '<div class="uz-blok"><h3>MES4 i Fleet Manager</h3><p>' + esc(U.fleetManager) + '.</p><p>' + pokBtn('mesRacunalo', 'MES računalo u 3D') + ' · ' + pokBtn('fleetManager', 'Fleet Manager u 3D') + '</p></div>' +
    '</div>';
}
function redoviModula(k) {
  const M = MODULI[k], tok = { rass: ['RASS'], branch: ['BRANCH'], asrs: ['ASRS'], cobot: ['CP-COBOT'], robotino: ['Robotin'], stanica: ['stanic'] }[k] || [k];
  const r = [];
  const dodaj = (o, v, oz) => { if (v != null && v !== '') r.push('<tr><td>' + esc(o) + '</td><td>' + v + (oz || '') + '</td></tr>'); };
  dodaj('Oznaka', '<span class="uz-kod">' + esc(oznakaModula(M)) + '</span>');
  dodaj('Naziv proizvođača', esc(M.naziv));
  dodaj('Tipska oznaka', (M.kod || []).map(([a, b]) => '<span class="uz-kod">' + esc(a) + '</span> — ' + esc(b)).join('<br>'));
  dodaj('Narudžbeni br.', M.narudzbeni != null ? esc(M.narudzbeni) : null, oznakaPr(prPocinje('Narudžbeni broj', tok)));
  if (M.inacica) dodaj('Inačica', esc(M.inacica), oznakaPr(prPocinje('Inačica', tok)));
  dodaj('Napajanje', esc(M.napajanje));
  dodaj('Snaga', M.snaga != null ? br(M.snaga, 0) + ' W' : null, oznakaPr(prPocinje('Snaga', tok)));
  dodaj('Masa', M.masa != null ? br(M.masa, 0) + ' kg' : null, oznakaPr(prPocinje('Masa', tok)));
  dodaj('Tlak zraka', M.tlak != null ? br(M.tlak * 10, 1) + ' bar' : null);
  dodaj('Datum izrade (pločica)', M.datum ? esc(M.datum) : null);
  dodaj('Mjere (V × Š × D)', mjereModula(M) ? esc(mjereModula(M)) : null, k === 'asrs' ? oznakaPr(prZa('Visina ASRS32')) : '');
  dodaj('Ulazi/izlazi', M.io ? esc(M.io) : null);
  dodaj('Zadaća', esc(M.funkcija));
  dodaj('Sastav', (M.komponente || []).length ? '<ul>' + M.komponente.map((c) => '<li>' + esc(c) + '</li>').join('') + '</ul>' : null);
  return r;
}
function crtajPodatke() {
  $('podaci-in').innerHTML = ['rass', 'branch', 'asrs', 'cobot', 'robotino', 'stanica'].filter((k) => MODULI[k]).map((k) =>
    '<div class="uz-modul" id="modul-' + k + '">' + tbl((MODULI[k].oznaka ? MODULI[k].oznaka + ' — ' : '') + MODULI[k].nazivHr, ['Podatak', 'Vrijednost'], redoviModula(k), MODULI[k].izvor) + '</div>').join('');
  const Mt = MATERIJAL, red = (o, v, oz) => (v != null && v !== '' ? '<tr><td>' + esc(o) + '</td><td>' + esc(v) + (oz || '') + '</td></tr>' : '');
  const nos = [red('Narudžbeni br.', Mt.nosac.narudzbeni), red('Mjere', Mt.nosac.mjere), red('Materijal', Mt.nosac.materijal), red('Identifikacija', Mt.nosac.rfid), red('Širina staze', Mt.nosac.staza), red('Nosivost', Mt.nosac.nosivost), red('MES broj dijela (PNo)', Mt.nosac.mesPNo)];
  const pal = [red('Narudžbeni br.', Mt.paleta.narudzbeni), red('Mjere', Mt.paleta.mjere), red('Materijal', Mt.paleta.materijal), red('Gnijezdo', Mt.paleta.gnijezdo), red('MES broj dijela (PNo)', Mt.paleta.mesPNo)];
  const kut = [Mt.kutijaPCB, Mt.kutijaPoklopaca].map((b) => '<tr><td>' + esc(b.naziv) + '</td><td>' + esc([b.mjere, 'nar. br. ' + b.narudzbeni, b.oznaka].filter(Boolean).join(' · ')) + '<br>' + esc(b.sadrzaj) + (b === Mt.kutijaPCB ? oznakaPr(prZa('Kapacitet kutije PCB')) : '') + '</td></tr>');
  const izr = Mt.izradak.dijelovi.map((d) => '<tr><td>' + esc(d.naziv) + '</td><td>' + esc([d.mjere, d.boje ? Object.entries(d.boje).map(([b, n]) => b + ' ' + n).join(', ') : (d.narudzbeni ? 'nar. br. ' + d.narudzbeni : '')].filter(Boolean).join(' · ')) + '</td></tr>');
  const mesb = Mt.mesBrojevi.map((m) => '<tr><td class="br">' + esc(m.pno) + '</td><td>' + esc(m.naziv) + '</td></tr>');
  const rf = [red('Tehnika', Mt.rfid.tip), red('Podaci u načinu MES', Mt.rfid.mesNacin.join(', ')), red('Podaci u načinu Default', Mt.rfid.defaultNacin.join(', '))];
  $('materijal-in').innerHTML = tbl(Mt.nosac.naziv, null, nos, Mt.nosac.izvor) + tbl(Mt.paleta.naziv, null, pal, Mt.paleta.izvor) + tbl('Transportne kutije (dobava dijelova)', null, kut, Mt.kutijaPCB.izvor) +
    tbl(Mt.izradak.naziv, null, izr, Mt.izradak.izvor) + tbl('MES brojevi dijelova (PNo)', ['PNo', 'Dio'], mesb) + tbl('RFID na nosaču', null, rf, Mt.rfid.izvor);
  $('podaci-nap').innerHTML = esc(Mt.odnos) + ' Oznaka <span class="uz-oz">pretpostavka</span> znači procijenjenu vrijednost, <span class="uz-oz sukob">sukob izvora</span> da se izvori ne slažu, a <span class="uz-oz nedost">nedostaje</span> da podatak treba pročitati na opremi ili u MES4 — objašnjenja su u odjeljku <a href="#pretpostavke">Što je pretpostavka</a>.';
}
function crtajPretpostavke() {
  const sukobi = PR.filter((p) => p.vrsta === 'sukob'), ned = PR.filter((p) => p.vrsta === 'nedostaje'), vrij = PR.filter((p) => p.vrsta === 'pretpostavka' && !p.id), dij = PR.filter((p) => p.vrsta === 'pretpostavka' && p.id);
  $('pretp-uvod').innerHTML = '<p>' + esc(TEKST_PRETPOSTAVKE) + '</p><p><strong>Vrijednosti će se ažurirati kad budu poznati točni podaci opreme u laboratoriju</strong> — popis ispod nastaje sam iz podataka, pa potvrđena vrijednost s njega nestane.</p>' +
    '<p class="pom">Ukupno: ' + sukobi.length + ' nesuglasja izvora, ' + ned.length + ' podatka koji nedostaju, ' + vrij.length + ' procijenjenih vrijednosti i ' + dij.length + ' dijelova s procijenjenim izgledom ili položajem.</p>';
  const t = (naslov, l, sDijelom) => l.length ? '<div class="uz-tbl-omot"><table class="tbl uz-pr"><caption>' + esc(naslov) + ' (' + l.length + ')</caption><thead><tr><th scope="col">' + (sDijelom ? 'Dio' : 'Podatak') + '</th>' + (sDijelom ? '' : '<th scope="col">Korištena vrijednost</th>') + '<th scope="col">Napomena</th></tr></thead><tbody>' +
    l.map((p) => '<tr><td>' + (sDijelom ? pokBtn(p.id, p.sto) : esc(p.sto)) + '</td>' + (sDijelom ? '' : '<td>' + esc(p.vrijednost) + '</td>') + '<td>' + sIzvorima(p.napomena) + '</td></tr>').join('') +
    '</tbody></table></div>' : '';
  $('pretp-tablice').innerHTML = t('Sukobi izvora', sukobi, false) + t('Podaci koji nedostaju', ned, false) + t('Procijenjene vrijednosti', vrij, false) + t('Dijelovi s procijenjenim izgledom ili položajem', dij, true);
}
const IZDAVACI = { 'ip.festo-didactic.com': 'Festo Didactic InfoPortal', 'www.festo.com': 'Festo — katalog Factory Automation', 'ftp.festo.com': 'Festo — MES4 dokumentacija', 'www.manualslib.com': 'ManualsLib', 'www.robots.com': 'Robots.com', 'rob4ind.upv.es': 'Laboratorij CP Factory, UPV' };
const OPIS_BEZ_URL = { foto: 'fotografije opreme u laboratoriju — služe samo kao predložak za model i procjene, ne objavljuju se', PODACI_ROBOTINO: 'podaci područja Mobilni robot Robotino (model, mjere i pretpostavke robota)' };
function opisUrl(u) {
  try {
    const x = new URL(u), iz = IZDAVACI[x.hostname];
    const put = decodeURIComponent(x.pathname).replace(/\/(index\.html?)?$/, '').replace(/\.(html?|php)$/i, '');
    const dijelovi = put.split('/').filter((s) => s && !/^(EN|en|InfoPortal|Infoportal|CPFactoryLab|hardware|download|data|public|DIDACTIC|pdf_flip|didactic)$/.test(s));
    const rep = dijelovi.slice(-3).join(' / ') + (x.search ? ' ' + decodeURIComponent(x.search.replace(/^\?/, '')).replace(/&?lang=\w+/, '') : '');
    return iz ? iz + (rep ? ' · ' + rep : '') : x.hostname + (rep ? ' · ' + rep : '');
  } catch (e) { return u; }
}
function crtajIzvore() {
  $('izvori').innerHTML = Object.keys(IZVORI).map((k) => {
    const u = IZVORI[k];
    if (u) return '<li id="izvor-' + esc(k) + '"><b>' + esc(k) + '</b> — <a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(opisUrl(u)) + '</a></li>';
    const pod = k === 'PODACI_ROBOTINO' ? ' — <a href="' + esc(linkPodrucja('robotino')) + '">' + esc(PODRUCJA.robotino.naziv) + '</a>' : '';
    return '<li id="izvor-' + esc(k) + '"><b>' + esc(k) + '</b> — ' + esc(OPIS_BEZ_URL[k] || 'bez poveznice') + pod + '</li>';
  }).join('');
}
/* pokazivanje dijela ili modula iz odjeljaka ispod prikaza */
document.querySelector('.cr-tijelo').addEventListener('click', onPokazi);
document.querySelector('.tekst-sim').addEventListener('click', onPokazi);
function onPokazi(e) {
  const b = e.target.closest('[data-pokazi],[data-skupina]'); if (!b || b.closest('#kartica')) return;
  if (b.dataset.pokazi) odaberiDio(b.dataset.pokazi); else if (b.dataset.skupina) odaberiSkupinu(b.dataset.skupina); else return;
  $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================================================================== */
/* 17. Petlja (crta se samo kad se nešto mijenja ili pokreće)          */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); trazi(); }
new ResizeObserver(velicina).observe(scenaEl);
controls.addEventListener('change', trazi);
controls.addEventListener('start', () => { let_ = null; });
function okvir(t) {
  rafId = 0;
  const dt = Math.min(0.1, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  if (dlg.open) { if (crtati) { renderer.render(scene, camera); brojCrtanja++; crtati = false; } return; }
  let ide = false;
  if (let_) { const u = Math.min(1, (t - let_.t0) / let_.d), k = ease(u); camera.position.lerpVectors(let_.p0, let_.p1, k); controls.target.lerpVectors(let_.c0, let_.c1, k); if (u >= 1) let_ = null; ide = true; }
  if (korakKruga(dt)) ide = true;
  if (st.trake) { st.pomak += brzina() * dt; L.azuriraj(st.pomak, 1); ide = true; }
  if (korakKanala(dt)) ide = true;
  if (controls.update()) ide = true;
  zauzet = ide;
  if (ide || crtati) { renderer.render(scene, camera); brojCrtanja++; }
  crtati = false;
  if (ide && !document.hidden && !rafId) rafId = requestAnimationFrame(okvir);
}
/* nakon zatvaranja dijaloga nastavi animacije */
dlg.addEventListener('close', () => { if (st.trake || Object.keys(kanali).length) trazi(); });

/* ================================================================== */
/* 18. Pokretanje                                                     */
/* ================================================================== */
const brNed = PR.filter((p) => p.vrsta === 'nedostaje').length;
$('hero-brojke').textContent = SKUPINE.length + ' skupina · ' + DIJELOVI.length + ' dijelova · ' + Object.keys(TEME).length + ' animacija „Kako radi” · ' + MES.operacije.length + ' operacija MES-a (' + brNed + ' podatka nedostaju) · podaci s izvorima, pretpostavke označene · prijeđi mišem preko modela za naziv dijela, klikni dio da ga odabereš.';
crtajStablo();
karticaUvod();
crtajTeme(); crtajMES(); crtajUpravljanje(); crtajPodatke(); crtajPretpostavke(); crtajIzvore();
pocetno();
velicina();
pogled('prostor', false);
const uc = $('ucitavanje'); if (uc) uc.remove();
trazi();
window.__upoz = { scene, renderer, camera, controls, L, kuka, ur, rob, stan, st, kanali, DIJELOVI, RODITELJ, POGLEDI, SVI, odaberiDio, odaberiSkupinu, pogled, pogodak, otvoriTemu, zatvoriTemu, pocetno,
  opAsrs, pokreniKrug, zavrsiKrug, robotinoVozi, alat, letiDoDijela, kutija,
  /* za testove: pomakni animacije bez iscrtavanja (dt u s, n koraka) */
  korak: (dt = 0.1, n = 1) => { for (let i = 0; i < n; i++) { korakKruga(dt); korakKanala(dt); } trazi(); },
  render: () => renderer.render(scene, camera), trazi, get brojCrtanja() { return brojCrtanja; }, get zauzet() { return zauzet || crtati || !!rafId; }, get tema() { return tema; },
  get radi() { return Object.keys(kanali).concat(st.krug ? ['krug'] : []); } };
