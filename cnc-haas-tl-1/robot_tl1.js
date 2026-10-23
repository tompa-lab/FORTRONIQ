/* FORTRONIQ · Haas TL-1 — opsluživanje tokarilice kobotom UR3e: stanica (stroj, robot na postolju ispred otvora, palete s pripremcima Ø40 × 80,
   pneumatska stezna glava i automatska klizna vrata — izmišljeno, označeno), privjesak robota nalik PolyScopeu (program, I/O, log), CNC u
   automatskom radu, nizovi s koracima. Robot, stroj i tekst su naši; kinematika UR3e iz DH parametara (isti model kao u području Kobot UR3e).  © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviStrojTL1, postaviOkolinu, GEO } from './stroj_tl1.js?v=02';
import { napraviCNC } from './cnc_auto_tl1.js?v=02';
import { PROGRAM_ROBOT_TL } from './programi_tl1.js?v=02';
import { napraviUR3e } from './ur3e_model.js?v=02';
import { fk, ik, pomnozi, inverz, rotVektor, rotIzVektora } from './ur3e_kin.js?v=02';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = Math.PI / 180;

/* ================================================================== */
/* 1. Podaci stanice (naš postav; mjere u mm, robot u m)                */
/* ================================================================== */
const POD = -GEO.VISINA_VRETENA;
const BAZA = { x: 200, y: -100, z: 500 };                     /* podnožje robota: postolje ispred otvora kabine, 100 mm ispod osi vretena */
const TCP_Z = 0.100;                                          /* TCP hvataljke 100 mm ispod prirubnice (pretpostavka) */
const PRST = { otvoren: 0.040, prazan: 0.012, dio: 0.020 };   /* polovica razmaka prstiju (m): pripremak Ø40 */
const DIO = { D: 40, L: 80, drz: 25, hvat: 25 };              /* pripremak; hvat = pomak hvatanja od središta prema slobodnom kraju */
const PAL_U = [{ x: -160, z: 500 }, { x: -60, z: 500 }], PAL_I = [{ x: 440, z: 500 }, { x: 540, z: 500 }], PAL_Y = -100;   /* palete: ploha na y = −100 */
const DIO_Y = PAL_Y + 30;                                     /* os pripremka na V-prizmi */
const GLAVA_X = -DIO.drz + DIO.L / 2;                          /* središte pripremka u steznoj glavi (x) */
const ZADANO = { MoveJ: { v: 60, a: 80 }, MoveL: { v: 250, a: 1200 } };
const T_VRATA = 2.0;                                          /* s — klizna vrata (izmišljeno automatska) */
const CNC_PROGRAM = PROGRAM_ROBOT_TL;

/* ================================================================== */
/* 2. Nizovi i koraci: [uputa, pomoć, kod]                             */
/* ================================================================== */
const NIZOVI = [
  { id: 'stanica', grupa: 'Stanica', naziv: 'Stanica i signali', koraci: [
    ['Stanica: TL-1 s otvorenim kliznim vratima, kobot UR3e na postolju ispred otvora (100 mm ispod osi vretena), ulazna paleta lijevo i izlazna desno. Robot doseže 500 mm — zato stoji tik uz kabinu, a pripremak je kratak (Ø40 × 80).', 'Pogledaj stanicu u 3D prikazu (pogled „Stanica”) i pritisni „Dalje”.', 'dalje'],
    ['Stezna glava je u ovoj vježbi pneumatska (izmišljeno, označeno): robot je steže i otpušta izlazom DO1, a senzor DI2 javlja da je stegnuta. Stvarni TL-1 ima ručnu steznu glavu Ø203.', 'Pogled „Stezna glava”. Pritisni „Dalje”.', 'dalje'],
    ['Klizna vrata su u ovoj vježbi automatska (izmišljeno): robot ih otvara izlazom DO3, a DI1 javlja da su zatvorena. Stroj ne radi dok su otvorena (door hold).', 'Pritisni „Dalje”.', 'dalje'],
    ['Stroj dobiva CYCLE START impulsom na DO2, a kad program dođe do M30 i suport ode u položaj za utovar, javlja DI0 = On. Robot je gospodar: njegov program vodi cijeli ciklus.', 'Tablica svih signala je ispod simulatora. Pritisni „Dalje”.', 'dalje'],
    ['Otvori karticu I/O na privjesku robota.', 'Kartice su u gornjoj traci privjeska.', 'tabIO'],
    ['Kraj niza „Stanica i signali”. Odaberi sljedeći niz.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'signali', grupa: 'Stanica', naziv: 'Ručno ispitivanje signala', koraci: [
    ['Na kartici I/O uključi DO3 — vrata se otvaraju (klize ulijevo); prati DI1 (vrata zatvorena) dok ne ugasne.', 'Gumb DO3 u kartici I/O. Vrata trebaju 2 s.', 'vrataOtv'],
    ['Isključi DO3 — vrata se zatvaraju; DI1 se pali kad su zatvorena.', 'Dok se vrata gibaju, ni DI1 ni stroj ne smiju „vjerovati” da su zatvorena.', 'vrataZatv'],
    ['Uključi DO1 — stezna glava steže (čeljusti se primiču); DI2 se pali nakon ~0,5 s. Zatim isključi DO1.', 'Glava je prazna, pa steže „u prazno”; senzor položaja i dalje javlja stegnuto.', 'skripacTest'],
    ['Daj stroju CYCLE START: uključi DO2 i odmah isključi (impuls). Vrata moraju biti zatvorena. Stroj izvodi O03010 u prazno (bez pripremka).', 'Prati karticu „CNC — TL-1” i stroj u 3D prikazu. S otvorenim vratima stroj javlja DOOR OPEN.', 'cncStart'],
    ['Pričekaj kraj programa: DI0 se pali kad stroj dođe do M30 i odmakne suport u položaj za utovar.', 'Ubrzanje simulacije skraćuje čekanje.', 'cncKraj'],
    ['Kraj niza „Ručno ispitivanje signala”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'ciklus', grupa: 'Program', naziv: 'Izvođenje ciklusa', koraci: [
    ['Otvori karticu Program i pročitaj stablo: petlja za dva pripremka, u njoj uzimanje s palete (odozgo), otvaranje vrata, stavljanje u steznu glavu (sprijeda, uzduž osi), stezanje, zatvaranje vrata, CYCLE START, čekanje DI0, vađenje i odlaganje.', 'Pritisni „Dalje” kad pročitaš.', 'dalje'],
    ['Pritisni Play. Robot kreće iz Home prema prvom pripremku.', 'Brzinu robota mijenja klizač Speed; simulaciju ubrzava izbor ispod 3D prikaza.', 'play'],
    ['Prati: hvataljka zatvara (DO0), DI3 javlja predmet u hvataljci.', 'Naredba Set DO0 On i Wait 0,5 s — prsti trebaju vremena.', 'hvat'],
    ['Robot gura pripremak u steznu glavu do čeljusti i steže ga (DO1 → DI2), zatim otvara hvataljku i izlazi.', 'Redoslijed je bitan: najprije stegnuti glavu, tek onda pustiti hvataljku. Pripremak viri 55 mm.', 'uSkripcu'],
    ['Vrata se zatvaraju, robot daje CYCLE START (DO2) i čeka DI0. Stroj čeono tokari, tokari Ø30 i skošenje.', 'Robot stoji u Home dok stroj radi — Wait DI0 = On.', 'cncKraj'],
    ['Robot vadi obradak i odlaže ga na izlaznu paletu.', 'Pogled „Palete”.', 'odlozeno'],
    ['Pričekaj drugi prolaz petlje i kraj programa.', 'Ubrzanje ×5 ili ×20.', 'programKraj'],
    ['Čestitamo! Dva obratka su na izlaznoj paleti. Pogledaj ih u pogledu „Palete”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'greska', grupa: 'Program', naziv: 'Pogreška i oporavak', koraci: [
    ['Pritisni Play i pričekaj da stroj počne obrađivati (CNC RUNNING).', 'Ciklus ide kao u prethodnom nizu.', 'cncRadi'],
    ['Dok stroj radi, ručno otvori vrata (gumb „Vrata ručno”): stroj stane — DOOR OPEN (door hold) — a robot čeka DI0 koji ne dolazi.', 'Na stvarnom stroju vrata bi otvorio operater koji je ušao u stanicu; sklopka vrata zaustavlja posmak i vreteno.', 'doorHold'],
    ['Zatvori vrata i pritisni CYCLE START na stroju — program se nastavlja od zaustavljenog bloka.', 'Gumb CYCLE START u kartici „CNC — TL-1”. Robot i dalje čeka DI0.', 'cncNastavak'],
    ['Kad robot krene vaditi obradak, pritisni gljivu E-STOP robota: robot stane (Emergency stop), a sigurnosni krug zaustavi i stroj.', 'Gljiva ispod privjeska.', 'estop'],
    ['Otpusti gljivu i pritisni Reset na privjesku, zatim Play — program robota nastavlja od prekinute naredbe.', 'Nakon nužnog zaustavljanja UR robot traži potvrdu (Reset) prije nastavka.', 'nastavak'],
    ['Pričekaj kraj programa.', 'Ubrzanje simulacije.', 'programKraj'],
    ['Kraj niza „Pogreška i oporavak”.', 'Klikni „Izbornik”.', 'kraj']] }
];

/* ================================================================== */
/* 3. Scena: stroj, CNC, robot, palete                                 */
/* ================================================================== */
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
const cnc = napraviCNC(THREE, S, { na: cncDogadaj });
S.postaviOsi(-100, -300);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o));
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
/* postolje robota i palete (na podu) */
{ const post = new THREE.Group(); scene.add(post);
  const vis = BAZA.y - POD;
  const b1 = box(260, 20, 260, mat(0x3a4044)); b1.position.set(BAZA.x, POD + 10, BAZA.z); post.add(b1);
  const b2 = box(160, vis - 32, 160, mat(0x7d868d, { metalness: 0.3 })); b2.position.set(BAZA.x, POD + 20 + (vis - 32) / 2, BAZA.z); post.add(b2);
  const b3 = box(220, 12, 220, mat(0x3a4044)); b3.position.set(BAZA.x, BAZA.y - 6, BAZA.z); post.add(b3);
  for (const [lista, x] of [[PAL_U, -110], [PAL_I, 490]]) {
    const n = box(240, vis - 12, 200, mat(0x9aa3aa, { metalness: 0.2 })); n.position.set(x, POD + (vis - 12) / 2, 500); post.add(n);
    const p = box(240, 12, 200, mat(0x2c5f8c)); p.position.set(x, PAL_Y - 6, 500); post.add(p);
    lista.forEach((q) => { for (const dz of [-30, 30]) { const v = box(60, 16, 16, mat(0x1d3a55)); v.position.set(q.x, PAL_Y + 8, q.z + dz); post.add(v); } });   /* V-prizme (pojednostavljene) */
  }
}
/* robot */
const M = napraviUR3e(THREE, { unutrasnjost: false, ormar: false, privjesak: false, kabel: false });
const rob = new THREE.Group(); rob.scale.set(1000, 1000, 1000); rob.position.set(BAZA.x, BAZA.y, BAZA.z); scene.add(rob); rob.add(M.korijen);
/* hvataljka (naša) na prirubnici, mjere u m; prsti se zatvaraju uz os x alata */
const hvat = new THREE.Group(); M.tcp.add(hvat);
const mHv = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.5, metalness: 0.3 }), mPrst = new THREE.MeshStandardMaterial({ color: 0x8c969c, roughness: 0.4, metalness: 0.5 });
{ const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 24), mHv); pl.rotation.x = Math.PI / 2; pl.position.z = 0.004; hvat.add(pl);
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.047), mHv); t.position.z = 0.0315; hvat.add(t); }
const prsti = [1, -1].map((sg) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.06), mPrst); p.position.set(sg * PRST.otvoren, 0, 0.085); hvat.add(p); return p; });
/* pripremci (valjci uzduž x) */
const mDio = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.45, roughness: 0.45 });
const PRIPREMCI = [];
function valjak() { const g = new THREE.CylinderGeometry(DIO.D / 2, DIO.D / 2, DIO.L, 32); g.rotateZ(Math.PI / 2); return new THREE.Mesh(g, mDio); }
function napraviPripremke() {
  PRIPREMCI.forEach((b) => { if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh); }); PRIPREMCI.length = 0;
  PAL_U.forEach((q, i) => { const m = valjak(); m.position.set(q.x, DIO_Y, q.z); scene.add(m); PRIPREMCI.push({ i, mesh: m, uRuci: false, uGlavi: false, obradjen: false, naPaleti: 'ulaz' }); });
}
napraviPripremke();
const vTmp2 = new THREE.Vector3();
function tcpTocka() { const v = new THREE.Vector3(0, 0, TCP_Z); M.tcp.updateWorldMatrix(true, false); return M.tcp.localToWorld(v); }
function glavaSvijet() { return new THREE.Vector3(GLAVA_X, 0, 0); }
/* točka hvatanja predmeta (os, 25 mm prema slobodnom kraju) u svijetu */
function hvatTocka(b) { if (b.mesh) { b.mesh.updateWorldMatrix(true, false); const c = b.mesh.getWorldPosition(vTmp2.clone()); c.x += DIO.hvat; return c; } const v = glavaSvijet(); v.x += DIO.hvat; return v; }

/* ================================================================== */
/* 4. Kinematika i točke puta                                           */
/* ================================================================== */
const ALAT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, TCP_Z, 0, 0, 0, 1], ALAT_INV = inverz(ALAT);
const tcpT = (q) => pomnozi(fk(q).T, ALAT);
const R9 = (T) => [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]], pT = (T) => [T[3], T[7], T[11]];
function mulR(A, B) { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[3 * i + j] = A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j]; return C; }
const trR = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
const sastavi = (R, p) => [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1];
const rvIzR = (R) => rotVektor(sastavi(R, [0, 0, 0]));
function ikTcp(Ttcp, q0, skok = 0.35) { const r = ik(pomnozi(Ttcp, ALAT_INV), q0, { najveciSkok: skok }); if (!r.uspjeh) return null; let d = 0; for (let i = 0; i < 6; i++) d = Math.max(d, Math.abs(r.q[i] - q0[i])); return d <= skok * 1.5 ? r.q : null; }
/* svijet (mm) → KS robota (m): X_r = x, Y_r = −z, Z_r = y */
const uRobot = (X, Y, Z) => [(X - BAZA.x) / 1000, -(Z - BAZA.z) / 1000, (Y - BAZA.y) / 1000];
const sast = (cx, cy, cz, p) => [cx[0], cy[0], cz[0], p[0], cx[1], cy[1], cz[1], p[1], cx[2], cy[2], cz[2], p[2], 0, 0, 0, 1];
const T_GORE = (p) => sast([0, 1, 0], [1, 0, 0], [0, 0, -1], p);        /* alat prema dolje, prsti uz svjetski z (hvat odozgo) */
const T_SPRIJEDA = (p) => sast([0, 0, 1], [1, 0, 0], [0, 1, 0], p);     /* alat prema stroju (−z svijeta), prsti uz svjetski y */
function qZa(T, seed) { const r = ik(pomnozi(T, ALAT_INV), seed, {}); if (!r.uspjeh) throw new Error('IK'); return r.q; }
const SEED_L = [-26, -78, 129, -142, -90, -26].map((x) => x * D), SEED_D = [154, -78, 129, -142, -90, 154].map((x) => x * D), SEED_G = [-85, -47, 90, -43, -265, 90].map((x) => x * D), SEED_H = [23, -125, 102, 23, -157, 90].map((x) => x * D);
const TOCKE = {
  home: qZa(T_SPRIJEDA(uRobot(200, 250, 450)), SEED_H),
  glava_pred: qZa(T_SPRIJEDA(uRobot(GLAVA_X + DIO.hvat, 0, 150)), SEED_G), glava: qZa(T_SPRIJEDA(uRobot(GLAVA_X + DIO.hvat, 0, 0)), SEED_G),
  ulaz_gore: PAL_U.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y + 110, q.z)), SEED_L)), ulaz: PAL_U.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y, q.z)), SEED_L)),
  izlaz_gore: PAL_I.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y + 110, q.z)), SEED_D)), izlaz: PAL_I.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y, q.z)), SEED_D))
};

/* ================================================================== */
/* 5. Program robota (stablo) i prevođenje u naredbe                    */
/* ================================================================== */
const PROGRAM = [
  { r: 0, t: 'Robot Program', op: null },
  { r: 1, t: 'MoveJ', op: null }, { r: 2, t: 'Home', op: { op: 'move', vrsta: 'MoveJ', q: () => TOCKE.home } },
  { r: 1, t: 'Loop 2 times (i = 0, 1)', op: { op: 'ls', n: 2, id: 'L1' } },
  { r: 2, t: 'MoveJ', op: null }, { r: 3, t: 'ulaz_gore[i]', op: { op: 'move', vrsta: 'MoveJ', q: (i) => TOCKE.ulaz_gore[i] } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'ulaz[i]', op: { op: 'move', vrsta: 'MoveL', q: (i) => TOCKE.ulaz[i] } },
  { r: 2, t: 'Set DO0 = On', n: 'hvataljka zatvara', op: { op: 'set', izlaz: 0, val: true } },
  { r: 2, t: 'Wait 0.5 s', op: { op: 'wait', t: 0.5 } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'ulaz_gore[i]', op: { op: 'move', vrsta: 'MoveL', q: (i) => TOCKE.ulaz_gore[i] } },
  { r: 2, t: 'Set DO3 = On', n: 'vrata otvori', op: { op: 'set', izlaz: 3, val: true } },
  { r: 2, t: 'Wait vrata otvorena', op: { op: 'waitVrata', otv: true } },
  { r: 2, t: 'MoveJ', op: null }, { r: 3, t: 'glava_pred', op: { op: 'move', vrsta: 'MoveJ', q: () => TOCKE.glava_pred } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'glava', op: { op: 'move', vrsta: 'MoveL', q: () => TOCKE.glava } },
  { r: 2, t: 'Set DO1 = On', n: 'stezna glava steže', op: { op: 'set', izlaz: 1, val: true } },
  { r: 2, t: 'Wait DI2 = On', n: 'glava stegnuta', op: { op: 'waitDI', ulaz: 2, val: true } },
  { r: 2, t: 'Set DO0 = Off', n: 'hvataljka otvara', op: { op: 'set', izlaz: 0, val: false } },
  { r: 2, t: 'Wait 0.5 s', op: { op: 'wait', t: 0.5 } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'glava_pred', op: { op: 'move', vrsta: 'MoveL', q: () => TOCKE.glava_pred } },
  { r: 2, t: 'MoveJ', op: null }, { r: 3, t: 'Home', op: { op: 'move', vrsta: 'MoveJ', q: () => TOCKE.home } },
  { r: 2, t: 'Set DO3 = Off', n: 'vrata zatvori', op: { op: 'set', izlaz: 3, val: false } },
  { r: 2, t: 'Wait DI1 = On', n: 'vrata zatvorena', op: { op: 'waitDI', ulaz: 1, val: true } },
  { r: 2, t: 'Set DO2 = On', n: 'CYCLE START', op: { op: 'set', izlaz: 2, val: true } },
  { r: 2, t: 'Wait 0.3 s', op: { op: 'wait', t: 0.3 } },
  { r: 2, t: 'Set DO2 = Off', op: { op: 'set', izlaz: 2, val: false } },
  { r: 2, t: 'Wait DI0 = On', n: 'program stroja gotov', op: { op: 'waitDI', ulaz: 0, val: true } },
  { r: 2, t: 'Set DO3 = On', n: 'vrata otvori', op: { op: 'set', izlaz: 3, val: true } },
  { r: 2, t: 'Wait vrata otvorena', op: { op: 'waitVrata', otv: true } },
  { r: 2, t: 'MoveJ', op: null }, { r: 3, t: 'glava_pred', op: { op: 'move', vrsta: 'MoveJ', q: () => TOCKE.glava_pred } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'glava', op: { op: 'move', vrsta: 'MoveL', q: () => TOCKE.glava } },
  { r: 2, t: 'Set DO0 = On', n: 'hvataljka zatvara', op: { op: 'set', izlaz: 0, val: true } },
  { r: 2, t: 'Wait 0.5 s', op: { op: 'wait', t: 0.5 } },
  { r: 2, t: 'Set DO1 = Off', n: 'glava otpušta', op: { op: 'set', izlaz: 1, val: false } },
  { r: 2, t: 'Wait DI2 = Off', op: { op: 'waitDI', ulaz: 2, val: false } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'glava_pred', op: { op: 'move', vrsta: 'MoveL', q: () => TOCKE.glava_pred } },
  { r: 2, t: 'MoveJ', op: null }, { r: 3, t: 'izlaz_gore[i]', op: { op: 'move', vrsta: 'MoveJ', q: (i) => TOCKE.izlaz_gore[i] } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'izlaz[i]', op: { op: 'move', vrsta: 'MoveL', q: (i) => TOCKE.izlaz[i] } },
  { r: 2, t: 'Set DO0 = Off', n: 'hvataljka otvara', op: { op: 'set', izlaz: 0, val: false } },
  { r: 2, t: 'Wait 0.5 s', op: { op: 'wait', t: 0.5 } },
  { r: 2, t: 'MoveL', op: null }, { r: 3, t: 'izlaz_gore[i]', op: { op: 'move', vrsta: 'MoveL', q: (i) => TOCKE.izlaz_gore[i] } },
  { r: 2, t: 'Set DO3 = Off', n: 'vrata zatvori', op: { op: 'set', izlaz: 3, val: false } },
  { r: 1, t: '(kraj petlje)', op: { op: 'le', id: 'L1' } },
  { r: 1, t: 'MoveJ', op: null }, { r: 2, t: 'Home', op: { op: 'move', vrsta: 'MoveJ', q: () => TOCKE.home } }
];
const INSTR = []; PROGRAM.forEach((n, i) => { if (n.op) INSTR.push(Object.assign({ cvor: i }, n.op)); });
{ const ls = INSTR.findIndex((x) => x.op === 'ls'), le = INSTR.findIndex((x) => x.op === 'le'); INSTR[le].start = ls; INSTR[le].n = INSTR[ls].n; }

/* ================================================================== */
/* 6. Stanje                                                           */
/* ================================================================== */
const st = {};
function pocetno() {
  Object.assign(st, {
    q: TOCKE.home.slice(), brz: 100, estop: false, zastita: null, izv: null, tab: 'Program', log: [],
    io: { do: [false, false, false, false], di: [false, true, false, false] }, hv: { s: PRST.otvoren, drzi: null },
    vrata: { u: 0, cilj: 0, rucno: false }, glava: { t: 0, stegnut: false }, do2prije: false, cncFaza: 'mir', ubrzanje: st.ubrzanje || 1, obradjeni: 0
  });
}
pocetno();
let niz = null, korak = 0; const gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-cnc-tl1-robot-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-cnc-tl1-robot-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }
function zapis(razina, tekst) { st.log.push({ razina, tekst, t: vrijeme.toFixed(1) }); if (st.log.length > 80) st.log.shift(); if (st.tab === 'Log') crtajEkran(); }
let vrijeme = 0;

/* ================================================================== */
/* 7. Izvođenje programa robota                                          */
/* ================================================================== */
function profil(Dd, v, a) {
  if (Dd < 1e-9) return { T: 0, s: () => Dd };
  if (Dd < v * v / a) { const Th = Math.sqrt(Dd / a); return { T: 2 * Th, s: (t) => (t < Th ? 0.5 * a * t * t : Dd - 0.5 * a * (2 * Th - t) ** 2) }; }
  const ta = v / a, T = Dd / v + ta;
  return { T, s: (t) => (t < ta ? 0.5 * a * t * t : t < T - ta ? 0.5 * a * ta * ta + v * (t - ta) : Dd - 0.5 * a * (T - t) ** 2) };
}
function mozeGibati() { return !st.estop && !st.zastita; }
function play() {
  if (st.estop) { info('Gljiva za nužno zaustavljanje je pritisnuta.'); return; }
  if (st.zastita) { info('Robot je u zaštitnom zaustavljanju — pritisni Reset.'); return; }
  if (st.izv && st.izv.pauza) { st.izv.pauza = false; zapis('i', 'Program resumed.'); crtajEkran(); dogadaj('play'); return; }
  if (st.izv) return;
  st.izv = { pc: 0, gib: null, brojaci: {}, pauza: false, i: 0, cekaj: undefined };
  zapis('i', 'Program started.'); crtajEkran(); dogadaj('play');
}
function pauza() { if (st.izv && !st.izv.pauza) { st.izv.pauza = true; zapis('i', 'Program paused.'); crtajEkran(); dogadaj('pauza'); } }
function stop() { if (st.izv) { st.izv = null; zapis('i', 'Program stopped.'); crtajEkran(); } }
function korakProg(dtR) {
  const iz = st.izv; if (!iz || iz.pauza || !mozeGibati()) return;
  let preostalo = 6;
  while (preostalo-- > 0 && st.izv) {
    if (iz.pc >= INSTR.length) { st.izv = null; zapis('i', 'Program completed.'); info('Program robota je završio: ' + st.obradjeni + ' obratka na izlaznoj paleti.'); crtajEkran(); dogadaj('programKraj'); return; }
    const ins = INSTR[iz.pc];
    if (ins.op === 'set') { postaviIzlaz(ins.izlaz, ins.val); iz.pc++; continue; }
    if (ins.op === 'ls') { iz.brojaci[ins.id] = 0; iz.i = 0; iz.pc++; continue; }
    if (ins.op === 'le') { iz.brojaci[ins.id]++; iz.i = iz.brojaci[ins.id]; if (iz.brojaci[ins.id] < ins.n) iz.pc = ins.start + 1; else iz.pc++; continue; }
    if (ins.op === 'wait') { if (iz.cekaj === undefined) iz.cekaj = ins.t; iz.cekaj -= dtR; if (iz.cekaj <= 0) { iz.cekaj = undefined; iz.pc++; continue; } return; }
    if (ins.op === 'waitDI') { if (st.io.di[ins.ulaz] === ins.val) { iz.pc++; continue; } return; }
    if (ins.op === 'waitVrata') { if (ins.otv ? st.vrata.u >= 0.999 : st.vrata.u <= 0.001) { iz.pc++; continue; } return; }
    if (ins.op === 'move') { if (korakMove(ins, dtR * st.brz / 100)) { iz.gib = null; iz.pc++; continue; } return; }
  }
}
function korakMove(ins, dtE) {
  const iz = st.izv;
  if (!iz.gib) {
    const cilj = ins.q(iz.i); const g = { vrsta: ins.vrsta, t: 0, q0: st.q.slice(), cilj };
    if (ins.vrsta === 'MoveJ') { const dq = cilj.map((x, i) => x - st.q[i]); const Dd = Math.max(...dq.map(Math.abs)); g.dq = dq; g.Dd = Dd; g.pr = profil(Dd, ZADANO.MoveJ.v * D, ZADANO.MoveJ.a * D); }
    else {
      const T0 = tcpT(st.q), T1 = tcpT(cilj); g.p0 = pT(T0); g.dp = pT(T1).map((x, i) => x - g.p0[i]); g.R0 = R9(T0); g.rv = rvIzR(mulR(R9(T1), trR(g.R0)));
      const L = Math.hypot(...g.dp), th = Math.hypot(...g.rv); const pl = profil(L, ZADANO.MoveL.v / 1000, ZADANO.MoveL.a / 1000), pr = profil(th, 1.0, 4.0);
      g.pr = pl.T >= pr.T ? { T: pl.T, u: (t) => (L > 0 ? pl.s(t) / L : 1) } : { T: pr.T, u: (t) => (th > 0 ? pr.s(t) / th : 1) };
    }
    iz.gib = g;
  }
  const g = iz.gib;
  const pozaU = (t) => {
    if (g.vrsta === 'MoveJ') { const s = g.Dd > 0 ? g.pr.s(Math.min(t, g.pr.T)) / g.Dd : 1; return g.q0.map((x, i) => x + g.dq[i] * s); }
    const u = t >= g.pr.T ? 1 : g.pr.u(t); if (u >= 1) return g.cilj;
    const p = g.p0.map((x, i) => x + g.dp[i] * u), R = mulR(rotIzVektora(g.rv.map((x) => x * u)), g.R0);
    return ikTcp(sastavi(R, p), st.q, 0.3);
  };
  const tn = Math.min(g.t + dtE, g.pr.T), qn = pozaU(tn);
  if (!qn) { st.zastita = 'ik'; zapis('g', 'Protective stop: inverse kinematics failed.'); info('Zaštitno zaustavljanje: položaj alata nije dostižan.'); crtajEkran(); return false; }
  st.q = qn; g.t = tn;
  return g.t >= g.pr.T - 1e-9;
}
function postaviIzlaz(i, val) { if (st.io.do[i] === !!val) return; st.io.do[i] = !!val; zapis('i', 'DO' + i + ' = ' + (val ? 'On' : 'Off') + ' (' + ['hvataljka', 'stezna glava', 'CYCLE START', 'vrata'][i] + ')'); if (i === 3) st.vrata.cilj = val ? 1 : 0; dogadaj('io', { i, val }); crtajEkran(); }

/* ================================================================== */
/* 8. Hvataljka, pripremci, stezna glava, vrata, CNC                     */
/* ================================================================== */
function korakHvataljke(dtR) {
  const h = st.hv, zatv = st.io.do[0], brz = (PRST.otvoren - PRST.prazan) / 0.4;
  prsti[0].position.x = h.s; prsti[1].position.x = -h.s;
  if (zatv) {
    if (!h.drzi) {
      h.s = Math.max(PRST.prazan, h.s - brz * dtR);
      if (h.s <= PRST.dio + 1e-6) {
        const t = tcpTocka();
        const b = PRIPREMCI.find((b) => { if (b.uRuci) return false; const c = hvatTocka(b); return Math.hypot(c.x - t.x, c.y - t.y, c.z - t.z) < 18; });
        if (b) {
          if (!b.mesh) { const g = new THREE.Group(); g.position.copy(glavaSvijet()); scene.add(g); if (cnc.O) { g.attach(cnc.O.mesh); cnc.ukloniObradak(true); } else { const m = valjak(); g.add(m); } b.mesh = g; }
          hvat.attach(b.mesh); b.uRuci = true; b.uGlavi = false; b.naPaleti = null; h.drzi = b; h.s = PRST.dio; zapis('i', 'DI3 = On (predmet u hvataljci)'); dogadaj('hvat');
        } else h.s = Math.max(PRST.prazan, h.s);
      }
    }
  } else {
    h.s = Math.min(PRST.otvoren, h.s + brz * dtR);
    if (h.drzi && h.s > PRST.dio + 0.002) { const b = h.drzi; h.drzi = null; b.uRuci = false; scene.attach(b.mesh); odloziPripremak(b); }
  }
  st.io.di[3] = !!h.drzi;
}
function odloziPripremak(b) {
  const c = hvatTocka(b), v = glavaSvijet(); v.x += DIO.hvat;
  if (Math.hypot(c.x - v.x, c.y - v.y, c.z - v.z) < 25) {
    S.obrGrupa.attach(b.mesh); b.mesh.position.set(GLAVA_X, 0, 0); b.mesh.rotation.set(0, 0, 0); b.uGlavi = true; zapis('i', 'Pripremak u steznoj glavi.'); if (st.glava.stegnut) pretvoriUMrezu(b); dogadaj('uSkripcu'); return;
  }
  for (const [lista, ime] of [[PAL_I, 'izlaz'], [PAL_U, 'ulaz']]) for (const q of lista) if (Math.hypot(c.x - (q.x + DIO.hvat), c.z - q.z) < 35) {
    b.mesh.position.set(q.x, DIO_Y, q.z); b.mesh.rotation.set(0, 0, 0); b.naPaleti = ime; if (ime === 'izlaz' && b.obradjen) { st.obradjeni++; zapis('i', 'Obradak odložen na izlaznu paletu.'); dogadaj('odlozeno'); } return;
  }
  b.mesh.position.y = Math.max(DIO_Y, b.mesh.position.y); zapis('u', 'Predmet odložen izvan palete.');
}
/* pripremak u stegnutoj glavi postaje mreža (obrada skida materijal) */
function pretvoriUMrezu(b) {
  if (!b.mesh || b.obradjen || b.uRuci) return;
  b.mesh.parent.remove(b.mesh); b.mesh = null; cnc.napraviObradak(DIO.D, DIO.L, DIO.drz); cnc.nultocka(); cnc.odaberi(CNC_PROGRAM, 'O03010'); crtajCncProg();
}
function korakGlave(dtR) {
  const k = st.glava, zel = st.io.do[1];
  k.t = Math.max(0, Math.min(0.5, k.t + (zel ? dtR : -dtR)));
  S.celjustiNa(24 - 4 * (k.t / 0.5));
  const stegnut = zel && k.t >= 0.5 - 1e-6;
  if (stegnut !== k.stegnut) {
    k.stegnut = stegnut; zapis('i', 'DI2 = ' + (stegnut ? 'On (stezna glava stegnuta)' : 'Off (glava otpuštena)')); dogadaj('skripac', { stegnut });
    const b = PRIPREMCI.find((b) => b.uGlavi && !b.uRuci);
    if (stegnut && b) pretvoriUMrezu(b);
  }
  st.io.di[2] = k.stegnut;
}
function korakVrata(dtR) {
  const v = st.vrata, cilj = v.rucno ? 1 : v.cilj; const du = dtR / T_VRATA;
  const prije = v.u; v.u = v.u < cilj ? Math.min(cilj, v.u + du) : Math.max(cilj, v.u - du);
  S.vrataNa(v.u);
  const otv = v.u > 0.01; cnc.st.vrata = otv;
  if (otv && cnc.st.run && cnc.st.run.ide) { cnc.stop('DOOR OPEN — door hold'); zapis('u', 'CNC: DOOR OPEN — program zaustavljen.'); dogadaj('doorHold'); }
  const zatv = v.u <= 0.001; if (zatv !== st.io.di[1]) { st.io.di[1] = zatv; zapis('i', 'DI1 = ' + (zatv ? 'On (vrata zatvorena)' : 'Off')); dogadaj('vrata', { zatv }); }
  if (prije !== v.u && (v.u === 0 || v.u === 1)) crtajSignale();
}
function cycleStart(izvor) {
  st.io.di[0] = false;
  if (cnc.st.vrata) { zapis('u', 'CNC: CYCLE START odbijen — DOOR OPEN.'); info('Stroj: vrata su otvorena (door hold) — CYCLE START ne radi.'); return; }
  if (!cnc.st.prog) cnc.odaberi(CNC_PROGRAM, 'O03010');
  if (cnc.start()) { st.cncFaza = 'radi'; zapis('i', 'CNC: CYCLE START (' + izvor + ')'); dogadaj('cncStart'); crtajCncProg(); } else info('Stroj: ' + cnc.st.poruka);
}
function cncDogadaj(e, d) {
  if (e === 'kraj') { st.cncFaza = 'vracanje'; zapis('i', 'CNC: PROGRAM END (M30) — suport u položaj za utovar.'); const b = PRIPREMCI.find((b) => b.uGlavi); if (b) b.obradjen = true; }
  if (e === 'alarm') { zapis('g', 'CNC ALARM ' + d.br + ' ' + d.tekst); info('Stroj: alarm ' + d.br + ' ' + d.tekst, true); }
}
function korakCnc(dtR) {
  const dt = dtR;
  if (st.io.do[2] && !st.do2prije) cycleStart('DO2'); st.do2prije = st.io.do[2];
  cnc.st.ubrzanje = st.ubrzanje; cnc.korak(dt);
  if (st.cncFaza === 'vracanje') { if (cnc.uPolozajUtovara(dt)) { st.cncFaza = 'mir'; st.io.di[0] = true; zapis('i', 'DI0 = On (program stroja gotov).'); dogadaj('cncKraj'); crtajSignale(); } }
  if (st.cncFaza === 'radi' && cnc.st.run && cnc.st.run.ide) dogadaj('cncRadi');
}
function estop(pritisnut) {
  st.estop = pritisnut; $('k-estop').setAttribute('aria-pressed', String(pritisnut));
  if (pritisnut) { st.zastita = 'estop'; if (st.izv) st.izv.pauza = true; if (cnc.st.run && cnc.st.run.ide) { cnc.stop('ROBOT E-STOP — sigurnosni krug'); st.cncFaza = 'stoj'; } zapis('g', 'Emergency stop.'); info('Nužno zaustavljanje: robot i stroj stoje. Otpusti gljivu, pritisni Reset pa Play; stroj traži CYCLE START.'); dogadaj('estop'); }
  else { zapis('u', 'E-stop released — press Reset.'); }
  crtajEkran();
}
function reset() { if (st.estop) { info('Najprije otpusti gljivu.'); return; } if (!st.zastita) return; st.zastita = null; zapis('i', 'Reset — Normal.'); info('Robot je u stanju Normal. Play nastavlja program.'); crtajEkran(); dogadaj('reset'); }

/* ================================================================== */
/* 9. Koraci                                                           */
/* ================================================================== */
function trenutni() { return niz ? niz.koraci[korak] : null; }
function dogadaj(e, d = {}) {
  const k = trenutni(); if (!k) return;
  const ok = (() => {
    switch (k[2]) {
      case 'dalje': return e === 'dalje';
      case 'tabIO': return st.tab === 'IO';
      case 'vrataOtv': return e === 'vrata' && !d.zatv && !st.vrata.rucno;
      case 'vrataZatv': return e === 'vrata' && d.zatv;
      case 'skripacTest': return e === 'skripac' && !d.stegnut && st.skTestiran;
      case 'cncStart': return e === 'cncStart';
      case 'cncKraj': return e === 'cncKraj';
      case 'play': return e === 'play' && st.izv;
      case 'hvat': return e === 'hvat';
      case 'uSkripcu': return e === 'uSkripcu';
      case 'odlozeno': return e === 'odlozeno';
      case 'programKraj': return e === 'programKraj';
      case 'cncRadi': return e === 'cncRadi' && st.izv;
      case 'doorHold': return e === 'doorHold' && st.vrata.rucno;
      case 'cncNastavak': return e === 'cncStart' && !st.vrata.rucno;
      case 'estop': return e === 'estop' && st.izv;
      case 'nastavak': return e === 'play' && !st.estop && !st.zastita;
      default: return false;
    }
  })();
  if (e === 'skripac' && d.stegnut && st.tab === 'IO' && niz && niz.id === 'signali') st.skTestiran = true;
  if (ok) { korak++; if (korak >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); } crtajKorak(); }
}

/* ================================================================== */
/* 10. Privjesak robota i kartice                                        */
/* ================================================================== */
function info(t, upoz) { $('poruka').innerHTML = upoz ? '<span class="upoz">' + esc(t) + '</span>' : esc(t); }
const led = (v) => '<i class="led' + (v ? ' on' : '') + '"></i>';
function crtajEkran() {
  const el = $('rb-tijelo');
  document.querySelectorAll('#rb-tabovi button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === st.tab)));
  const stanje = $('rb-stanje'); stanje.textContent = st.estop ? 'Emergency stop' : st.zastita ? 'Protective stop' : st.izv ? (st.izv.pauza ? 'Paused' : 'Running') : 'Normal'; stanje.className = 'rb-stanje' + (st.estop ? ' estop' : st.zastita ? ' zastita' : '');
  $('rb-play').classList.toggle('radi', !!(st.izv && !st.izv.pauza));
  if (st.tab === 'Program') {
    const akt = st.izv ? INSTR[Math.min(st.izv.pc, INSTR.length - 1)].cvor : -1, i = st.izv ? st.izv.i : 0;
    el.innerHTML = '<ul class="rb-stablo">' + PROGRAM.map((n, j) => '<li class="r' + n.r + (j === akt ? ' akt' : '') + '">' + esc(n.t.replace('[i]', '[' + i + ']')) + (n.n ? ' <span class="nap">— ' + esc(n.n) + '</span>' : '') + '</li>').join('') + '</ul>';
    const a = el.querySelector('li.akt'); if (a) a.scrollIntoView({ block: 'nearest' });
  } else if (st.tab === 'IO') {
    el.innerHTML = '<div class="rb-io"><div><h3>Digital Output</h3>' + [0, 1, 2, 3].map((i) => '<div class="io-red"><button type="button" class="rb-b" data-do="' + i + '" aria-pressed="' + st.io.do[i] + '">DO' + i + '</button>' + led(st.io.do[i]) + '<span class="pom">' + ['hvataljka: On = zatvori', 'stezna glava: On = stegni (izmišljena pneumatska)', 'CNC CYCLE START (impuls)', 'vrata: On = otvori (izmišljena automatska)'][i] + '</span></div>').join('')
      + '</div><div><h3>Digital Input</h3>' + [0, 1, 2, 3].map((i) => '<div class="io-red">' + led(st.io.di[i]) + '<b>DI' + i + '</b><span class="pom">' + ['CNC: program gotov (M30)', 'vrata zatvorena', 'stezna glava stegnuta', 'predmet u hvataljci'][i] + '</span></div>').join('') + '</div></div>';
  } else {
    el.innerHTML = '<ul class="rb-log">' + st.log.slice().reverse().map((z) => '<li class="' + z.razina + '">' + z.t + ' s · ' + esc(z.tekst) + '</li>').join('') + '</ul>';
  }
  crtajSignale();
}
function crtajSignale() {
  $('sig').innerHTML = [0, 1, 2, 3].map((i) => '<span>' + led(st.io.do[i]) + 'DO' + i + '</span>').join('') + [0, 1, 2, 3].map((i) => '<span>' + led(st.io.di[i]) + 'DI' + i + '</span>').join('');
  const c = $('cnc-stanje'); c.textContent = cnc.st.alarm ? 'ALARM ' + cnc.st.alarm.br : st.cncFaza === 'radi' && cnc.st.run && cnc.st.run.ide ? 'RUNNING' : st.cncFaza === 'vracanje' ? 'ODMAK' : cnc.st.poruka.replace(/ — .*/, ''); c.className = 'rb-cnc' + (cnc.st.alarm ? ' alarm' : cnc.st.run && cnc.st.run.ide ? ' radi' : '');
  $('k-vrata').setAttribute('aria-pressed', String(st.vrata.rucno));
}
function crtajCncProg() {
  const A = cnc.st.prog; if (!A) { $('cnc-prog').innerHTML = '<p class="pom">Program se učita kad je pripremak stegnut.</p>'; return; }
  const cur = cnc.st.run && cnc.st.run.trenBlok >= 0 && A.B[cnc.st.run.trenBlok] ? A.B[cnc.st.run.trenBlok].red : -1;
  $('cnc-prog').innerHTML = '<pre>' + A.redci.map((l, i) => '<span class="' + (i === cur ? 'akt' : '') + '">' + esc(l) + '</span>').join('\n') + '</pre>';
}
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n, i) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="kv">' + (i + 1) + '</span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korak + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k[0]) : 'Odaberi niz u izborniku lijevo.';
  $('pomoc').textContent = k ? k[1] : 'Nizovi se mogu raditi bilo kojim redom; svaki počinje od svojeg stanja stanice.';
  $('dalje').hidden = !(k && k[2] === 'dalje');
  if (k && niz.id === 'stanica') pogled(['stanica', 'glava', 'stanica', 'robot', 'robot', 'stanica'][korak] || 'stanica');
  crtajIzbornik(); crtajEkran();
}
function pogled(p) {
  const V = { stanica: [[-1600, 1100, 3600], [250, -150, 300]], robot: [[-700, 500, 1700], [150, 0, 350]], glava: [[-350, 250, 800], [30, 0, 100]], palete: [[-200, 700, 1700], [200, -100, 500]] }[p] || [[-1600, 1100, 3600], [250, -150, 300]];
  camera.position.set(...V[0]); controls.target.set(...V[1]); controls.update();
}
function pripremi(id) {
  const ub = st.ubrzanje; pocetno(); st.ubrzanje = ub;
  cnc.ukloniObradak(); cnc.reset(); cnc.st.fiz = { X: -100, Z: -300 }; S.postaviOsi(-100, -300); cnc.nultocka(DIO.L - DIO.drz); cnc.odaberi(CNC_PROGRAM, 'O03010'); crtajCncProg();
  if (st.hv.drzi) st.hv.drzi = null;
  napraviPripremke(); M.postavi(st.q); S.vrataNa(0); S.celjustiNa(24);
  if (id === 'stanica') { st.vrata.u = 1; st.vrata.cilj = 1; st.io.do[3] = true; S.vrataNa(1); }
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korak = 0; $('ponovi').hidden = true; $('poruka').textContent = '';
  pripremi(id); st.tab = id === 'signali' ? 'IO' : 'Program';
  pogled(id === 'stanica' ? 'stanica' : id === 'signali' ? 'robot' : 'stanica');
  crtajKorak();
}

/* ================================================================== */
/* 11. Povezivanje                                                     */
/* ================================================================== */
$('nizovi').addEventListener('click', (e) => { const b = e.target.closest('[data-niz]'); if (b) pokreniNiz(b.dataset.niz); });
$('izbornik').addEventListener('click', () => { niz = null; korak = 0; crtajKorak(); });
$('dalje').addEventListener('click', () => dogadaj('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); });
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('brzina').addEventListener('change', () => { st.ubrzanje = +$('brzina').value; });
$('rb-tabovi').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; st.tab = b.dataset.tab; crtajEkran(); dogadaj('tab'); });
$('rb-tijelo').addEventListener('click', (e) => { const b = e.target.closest('[data-do]'); if (!b) return; if (st.izv && !st.izv.pauza) { info('Program radi — izlazi se mijenjaju iz programa.'); return; } const i = +b.dataset.do; postaviIzlaz(i, !st.io.do[i]); });
$('rb-play').addEventListener('click', play); $('rb-pause').addEventListener('click', pauza); $('rb-stop').addEventListener('click', stop); $('rb-reset').addEventListener('click', reset);
$('rb-brz').addEventListener('input', () => { st.brz = +$('rb-brz').value; $('rb-brz-v').textContent = st.brz + ' %'; });
$('k-estop').addEventListener('click', () => estop(!st.estop));
$('k-home').addEventListener('click', () => { if (st.izv) { info('Program radi — najprije Stop.'); return; } st.q = TOCKE.home.slice(); M.postavi(st.q); });
$('k-palete').addEventListener('click', () => { if (st.izv) { info('Program radi — najprije Stop.'); return; } if (st.hv.drzi) { st.hv.drzi = null; } cnc.ukloniObradak(); napraviPripremke(); st.obradjeni = 0; info('Pripremci vraćeni na ulaznu paletu.'); });
$('k-cstart').addEventListener('click', () => cycleStart('ručno'));
$('k-creset').addEventListener('click', () => { cnc.reset(); st.cncFaza = 'mir'; crtajSignale(); info('Stroj: RESET.'); });
$('k-vrata').addEventListener('click', () => { st.vrata.rucno = !st.vrata.rucno; zapis(st.vrata.rucno ? 'u' : 'i', st.vrata.rucno ? 'Vrata ručno otvorena.' : 'Vrata puštena (slijede DO3).'); crtajSignale(); });

/* ================================================================== */
/* 12. Petlja                                                          */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now(), zadnjiUI = 0, pauzaPetlje = false;
function simuliraj(dtR) {
  const dts = dtR * st.ubrzanje;
  korakProg(dts); M.postavi(st.q); rob.updateMatrixWorld(true);
  korakHvataljke(dts); korakGlave(dts); korakVrata(dts); korakCnc(dts);
  vrijeme += dts;
}
function prikazi() { controls.update(); renderer.render(scene, camera); }
function petlja(t) {
  const dtR = Math.max(0, Math.min(0.1, (t - zadnje) / 1000)); zadnje = t;
  if (!pauzaPetlje) { simuliraj(dtR); if (t - zadnjiUI > 150) { zadnjiUI = t; if (st.izv || cnc.st.run) { crtajEkran(); crtajCncProg(); } $('cnc-poz').textContent = 'X ' + cnc.st.fiz.X.toFixed(3) + '  Z ' + cnc.st.fiz.Z.toFixed(3) + ' · S ' + Math.round(cnc.st.rpm) + (cnc.st.vrata ? ' · DOOR OPEN' : ''); } prikazi(); }
  requestAnimationFrame(petlja);
}
pripremi(null); crtajIzbornik(); crtajKorak(); crtajCncProg(); velicina(); pogled('stanica');
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__tl1r = {
  st, cnc, NIZOVI, INSTR, TOCKE, PRIPREMCI, tcpTocka, hvatTocka, glavaSvijet, M, pokreniNiz, dogadaj, play, pauza, stop, estop, reset, postaviIzlaz, cycleStart, pogled,
  get niz() { return niz; }, get korak() { return korak; },
  pauza3D(v) { pauzaPetlje = v; if (!v) zadnje = performance.now(); },
  sim(n, dt = 0.05, doKoraka = 1e9) { for (let i = 0; i < n; i++) { simuliraj(dt); if (korak >= doKoraka) break; } crtajEkran(); crtajCncProg(); return korak; }
};
requestAnimationFrame(petlja);
