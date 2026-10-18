/* FORTRONIQ · Mala CNC glodalica 3020 — simulator s upravljanjem Mach3 (Program Run), nizovi s koracima.
   Model, zaslon i tekst su naši; nazivi gumba kao u Mach3 (engleski).  © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PREDMETI } from './programi_p.js?v=02';
import { PRIMJERI_A } from './programi_a.js?v=02';
import { prevedi, objasni, opisiOperacije, razlozi } from './gkod.js?v=02';
import { napraviStroj3020, postaviOkolinu, GEO } from './stroj3020.js?v=02';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dro = (v) => { const x = Math.abs(v) < 0.00005 ? 0 : v; return (x < 0 ? '−' : '+') + Math.abs(x).toFixed(4); };
const kr = (v, d = 2) => v.toFixed(d).replace('.', ',');
const OSI = ['X', 'Y', 'Z', 'A'];

/* ================================================================== */
/* 1. Podaci stroja (pretpostavke su označene na stranici)              */
/* ================================================================== */
const HOD = GEO.HOD, R = GEO.R_ALATA, XT0 = GEO.XT0, YT0 = GEO.YT0;
const BRZI = { X: 2000, Y: 2000, Z: 1000, A: 3600 };       /* G0, mm/min i °/min — pretpostavka */
const JOG = { X: 1000, Y: 1000, Z: 500, A: 1800 };         /* Cont jog — pretpostavka */
const F_REF = 1500, S_MAX = 24000;
const HA = GEO.A.visina, LICE = GEO.A.lice;                /* os A: visina iznad stola, čelo čeljusti (x u okviru stola) */
const VALJAK = { d: 40, L: 100, uCelj: 15 };
const VJEZBA = { L: 80, W: 50, H: 20, xc: 75, yc: 0 };    /* pripremak za nizove 2 i 3 (u škripcu) */
const ALATI = { 1: 'ravno glodalo Ø3 mm, 2 oštrice' };
const PROGRAMI = [...Object.keys(PREDMETI).sort(), ...Object.keys(PRIMJERI_A)];

/* ================================================================== */
/* 2. Nizovi i koraci: [uputa, pomoć, kod događaja]                    */
/* ================================================================== */
const NIZOVI = [
  { id: 'ukljucivanje', grupa: 'Postavljanje stroja', naziv: 'Uključivanje', koraci: [
    ['Uključi napajanje upravljačke kutije (POWER).', 'Gumb POWER je na upravljačkoj kutiji ispod zaslona; možeš kliknuti i crveni prekidač na kutiji u 3D prikazu. Zasvijetli lampica.', 'kutija'],
    ['Uključi pretvarač frekvencije i provjeri da je upravljanje brzinom vrtnje na PC.', 'Gumb „Napajanje” na pretvaraču, preklopnik PC / Ručno na PC. U načinu PC brzinu vrtnje zadaje Mach3 (M3, S…).', 'pretvarac'],
    ['Spoji USB kabel kontrolera s računalom.', 'Gumb „USB kabel” na upravljačkoj kutiji. Kontroler mora biti spojen prije pokretanja Mach3, inače ga Mach3 ne nađe.', 'usb'],
    ['Pokreni Mach3 s profilom Mach3Mill.', 'Klikni „Pokreni Mach3” na zaslonu računala i pričekaj da se prikaže zaslon Program Run.', 'mach3'],
    ['Otpusti gljivu za nužno zaustavljanje na upravljačkoj kutiji.', 'Klikni crvenu gljivu E-STOP — zakretanjem se otpušta. Dok je pritisnuta, Mach3 ne dopušta gibanje.', 'gljiva'],
    ['Pritisni Reset u Mach3 — gumb prestaje treptati.', 'Reset u Mach3 uključuje i isključuje nužno zaustavljanje. Dok treperi crveno, osi i vreteno su blokirani.', 'reset'],
    ['Referenciraj osi: pritisni Ref All Home. Os Z ide prva gore, zatim X lijevo i Y sprijeda.', 'Ako stroj nema referentnih sklopki, ovaj se korak na stroju preskače — tada koordinate stroja vrijede od mjesta gdje je Mach3 pokrenut. Os A nema sklopke i ne referencira se.', 'ref'],
    ['Kraj niza „Uključivanje”. Vrati se u izbornik ili odaberi sljedeći niz.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'rucno', grupa: 'Postavljanje stroja', naziv: 'Ručno gibanje', koraci: [
    ['Otvori Jog panel tipkom Tab (fokus na upravljanju) ili gumbom Jog (Tab).', 'Klikni na upravljanje da bude u fokusu i pritisni Tab, ili gumb Jog (Tab) desno ispod DRO-a.', 'jogPanel'],
    ['U načinu Cont drži tipku → (ili gumb X+) i pomakni os X za najmanje 20 mm.', 'Os se giba dok držiš tipku. Pazi na smjer: +X je udesno.', 'contX'],
    ['Pomakni os Y tipkama ↑ ↓ (ili Y+ / Y−) za najmanje 20 mm.', 'Giba se stol: kad alat ide u +Y (od tebe), stol ide prema tebi.', 'contY'],
    ['Spusti os Z tipkom PgDn (ili Z−) za najmanje 5 mm.', 'PgUp diže, PgDn spušta os Z. Pazi da alat ne udari u pripremak u škripcu.', 'contZ'],
    ['Prebaci Jog u način Step, odaberi korak 1 i pomakni os Z jednim pritiskom.', 'Gumb Step, zatim 1. Svaki pritisak tipke ili gumba pomakne os točno za korak.', 'step'],
    ['Zakreni os A gumbom A+ do A +90.0000.', 'U načinu Step koraci vrijede u stupnjevima: npr. 9 × 10 °. Može i preklopnik „← → za os A” pa tipke ← →.', 'A90'],
    ['Dovedi alat u položaj X 150.0000, Y 100.0000, Z −20.0000 u koordinatama stroja.', 'Uključi Machine Coords — DRO tada pokazuje koordinate stroja (bez pomaka G54). Kombiniraj korake 10, 1, 0.1 i 0.01.', 'polozaj'],
    ['Kraj niza „Ručno gibanje”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'nultocka', grupa: 'Postavljanje stroja', naziv: 'Nultočka obratka', koraci: [
    ['Pripremak 80 × 50 × 20 mm stegnut je u škripcu. Nultočka G54 bit će u lijevom prednjem gornjem kutu. Rubove dodiruješ glodalom Ø3 metodom papira: tanak papir drži se između alata i pripremka, a os se pomiče u sve manjim koracima dok papir ne zapne. Vreteno pri tome stoji.', 'Pritisni „Dalje” kad pročitaš uputu. Stanje papira prikazano je ispod zaslona Mach3.', 'dalje'],
    ['Spusti alat oko 3 mm ispod gornje plohe, lijevo od pripremka, i približi se lijevom rubu dok papir ne zapne.', 'Najprije Cont ili korak 1, blizu ruba 0.1, a na kraju 0.01. Ako pretjeraš, alat udari u pripremak — niz se tada ponavlja.', 'dodirX'],
    ['U DRO X upiši −1.5 i potvrdi tipkom Enter: os alata je za polumjer glodala lijevo od ruba.', 'Klikni broj u DRO X, upiši -1.5 i pritisni Enter. Mach3 izračuna pomak G54 tako da DRO pokaže upisanu vrijednost.', 'droX'],
    ['Podigni alat, dovedi ga ispred pripremka (prema tebi) i približi se prednjem rubu dok papir ne zapne.', 'Najprije Z+ iznad pripremka, zatim X na sredinu, Y− ispred ruba, Z− dolje i polako Y+.', 'dodirY'],
    ['U DRO Y upiši −1.5 i potvrdi tipkom Enter.', 'Isto kao za X: os alata je 1,5 mm ispred prednjeg ruba.', 'droY'],
    ['Podigni alat, dovedi ga iznad pripremka i spuštaj ga dok papir ne zapne između vrha alata i gornje plohe.', 'Blizu plohe koristi korake 0.1 i 0.01.', 'dodirZ'],
    ['Pritisni Zero Z: vrh alata je na gornjoj plohi.', 'U ovom postavu nema korekcije duljine alata — nula Z je na vrhu alata.', 'zeroZ'],
    ['Postavi nulu i za os A: Zero 4.', 'Kod ploča os A se ne koristi, ali DRO A neka bude 0.', 'zero4'],
    ['Kraj niza „Nultočka obratka”. DRO sada pokazuje položaj vrha alata od lijevog prednjeg gornjeg kuta pripremka.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'ucitavanje', grupa: 'Program', naziv: 'Učitavanje programa', koraci: [
    ['Pritisni Load G-Code i otvori program P05.', 'U prozoru za odabir označi P05 i pritisni Open. Popis G-koda tada se prikaže lijevo na zaslonu.', 'ucitajP05'],
    ['Pregledaj početak programa: G17 G54 G40 G49 G80 G90, G21 (milimetri), M6 T1 (Mach3 ga samo prihvaća — alat se mijenja ručno) i M3 S24000. Pripremak P05 (150 × 100 mm) veći je od škripca, pa ga simulator steže pandžama na podložnoj ploči i postavlja nultočku kao u nizu 3.', 'Kotačićem miša iznad popisa G-koda možeš listati program. Pritisni „Dalje”.', 'dalje'],
    ['Učitaj P14 (240 × 240 × 30 mm) i pročitaj upozorenje: program ne stane u hod stroja.', 'Load G-Code → P14 → Open. Putanja alata u Y treba više od 200 mm hoda.', 'ucitajP14'],
    ['Učitaj program koji stane u hod, npr. P20 (120 × 60 × 10 mm).', 'Load G-Code → P20 → Open. Upozorenja više nema.', 'ucitajOK'],
    ['Kraj niza „Učitavanje programa”. Vrati se u izbornik.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'izvodenje', grupa: 'Program', naziv: 'Izvođenje programa', koraci: [
    ['Učitaj program P20 ili P05 (Load G-Code).', 'Nultočku G54 simulator postavlja kao u nizu 3. Popis operacija prikazan je ispod 3D prikaza.', 'ucitajOK'],
    ['Zbog sigurnosti smanji Feedrate override na 10 %.', 'Gumb − kod FRO % (korak 10 %).', 'f10'],
    ['Pritisni Cycle Start i prati prve blokove.', 'Vreteno se uključi naredbom M3 S24000. Gljiva, Stop i Feed Hold uvijek prekidaju gibanje.', 'start'],
    ['Kad je sve u redu, povećaj Feedrate override na 100 %.', 'Gumb + ili „100 %”. Simulaciju možeš ubrzati izborom ispod 3D prikaza.', 'fUp'],
    ['Pritisni Feed Hold: osi stanu, a vreteno se i dalje vrti.', 'Feed Hold je privremeni zastoj; Cycle Start nastavlja od istog mjesta.', 'hold'],
    ['Uključi Single BLK i nastavi s Cycle Start: program stane nakon svakog bloka, a ispod upute piše što blok radi. Prođi barem tri bloka.', 'Svaki Cycle Start izvede jedan blok. Trenutačna operacija istaknuta je u popisu operacija.', 'single'],
    ['Isključi Single BLK, pritisni Cycle Start i pričekaj kraj programa (M30).', 'Ubrzanje ×20 ili ×100 skraćuje čekanje.', 'gotovo'],
    ['Čestitamo! Program je izveden do kraja. Pogledaj obradak u pogledu „Obradak”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'osA', grupa: 'Program', naziv: 'Četvrta os', koraci: [
    ['Valjak Ø40 × 100 mm stegnut je u steznoj glavi (15 mm u čeljustima), a šiljak konjića je u središnjem provrtu na desnom kraju. Nultočka X je na čelu čeljusti, a Y na osi valjka — oboje je već upisano.', 'Pogledaj valjak u pogledu „4. os” i pritisni „Dalje”.', 'dalje'],
    ['DRO A pokazuje kut iz prethodnog rada. Postavi nulu osi A: Zero 4.', 'Zero 4 je gumb uz DRO A.', 'zero4'],
    ['Spuštaj alat iznad valjka dok papir ne zapne na gornjoj izvodnici.', 'Alat je iznad osi (Y na nuli). Blizu valjka koristi korake 0.1 i 0.01.', 'dodirZA'],
    ['Nula Z je na osi valjka, a vrh alata je sada na polumjeru: u DRO Z upiši 20 i potvrdi tipkom Enter.', 'Polumjer valjka Ø40 je 20 mm. Tako vrijednosti Z u programu znače udaljenost od osi.', 'droZA'],
    ['Učitaj primjer A1 (obodni utor) ili A2 (zavojni utor) — Load G-Code.', 'A3 (četiri plohe) možeš izvesti poslije.', 'ucitajA'],
    ['Smanji Feedrate override na 10 % i pritisni Cycle Start.', 'Prati DRO A: kod A1 stoji X, a okreće se A; kod A2 gibaju se X i A istodobno.', 'startA'],
    ['Povećaj Feedrate override i pričekaj kraj programa.', 'Utor pogledaj u pogledu „4. os”.', 'gotovoA'],
    ['Kraj niza „Četvrta os”. Kad prođeš sve nizove, spreman si za vježbu na stroju.', 'Klikni „Izbornik”.', 'kraj']] }
];
const PREKID = 'Program je prekinut gljivom za nužno zaustavljanje. Osi i vreteno stoje; Mach3 je u stanju Reset.';

/* ================================================================== */
/* 3. Stanje                                                          */
/* ================================================================== */
const st = {};
function pocetno() {
  Object.assign(st, {
    kutija: false, pretv: false, usb: false, mach3: 'off', mach3T: 0, gljiva: true, reset: true,
    fiz: { X: 120.37, Y: 34.21, Z: -18.5, A: 0 }, refd: false, refOff: { X: 0, Y: 0, Z: 0, A: 0 }, homing: null,
    G54: { X: 0, Y: 0, Z: 0, A: 0 }, mc: false, soft: true,
    jogPanel: false, jogNacin: 'cont', jogKorak: 1, jogA: false, jog: null, put: { X: 0, Y: 0, Z: 0, A: 0 },
    fro: 100, sro: 100, vfd: { nacin: 'PC', pot: 12000, run: false }, cw: false, S: 0, rpm: 0,
    prog: null, pregled: 0, alarm: null, ubrzanje: st.ubrzanje || 1, status: '',
    pribor: null, Ztop: 77, sbBroj: 0
  });
}
pocetno();
let niz = null, korak = 0; const gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-cnc-3020-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-cnc-3020-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }

const mach = (o) => st.fiz[o] - st.refOff[o];
const rad = (o) => mach(o) - st.G54[o];
const vrh = () => ({ x: st.fiz.X + XT0, y: st.fiz.Y + YT0, z: st.fiz.Z + st.Ztop });    /* vrh alata u okviru stola */

/* ================================================================== */
/* 4. Scena                                                            */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 2, 9000);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(700, 1300, 1000); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-800, 600, -500); scene.add(sun2);
postaviOkolinu(THREE, renderer, scene);
const S = napraviStroj3020(THREE, scene);
const BOJA_G = new THREE.Color(0xd7dbde), BOJA_R = new THREE.Color(0x6f8792), BOJA_MDF = new THREE.Color(0xc49a66), BOJA_MDFR = new THREE.Color(0x8a6237);

function pogled(p) {
  const zs = S.stol.position.z;
  const V = {
    stroj: [[-420, 640, 1350], [80, 90, 120]], radni: [[260, 330, 620 + zs * 0.3], [0, 50, zs]],
    obradak: [[-310, 300, 150 + zs], [0, 12, zs]], osA: [[-70, 330, 470 + zs], [-105, 62, zs]]
  }[p] || [[-420, 640, 1350], [80, 90, 120]];
  if (p === 'obradak' && st.pribor === 'osA') { V[0] = [-95, 250, 250 + zs]; V[1] = [-105, 62, zs]; }
  if (p === 'obradak' && st.pribor === 'skripac') { V[0] = [200, 260, 240 + zs]; V[1] = [75, 40, zs]; }
  camera.position.set(...V[0]); controls.target.set(...V[1]); controls.update();
}

/* --- ploča: visinska mreža (okvir stola) --------------------------- */
let PL = null;
function ukloniPlocu() { if (!PL) return; S.obrGrupa.remove(PL.mesh, PL.rub); PL.mesh.geometry.dispose(); PL.rub.geometry.dispose(); PL = null; }
function napraviPlocu(L, W, H, x0, y0, bot, mdf) {
  ukloniPlocu();
  const k = L * W > 22000 ? 0.75 : 0.5, nx = Math.round(L / k) + 1, ny = Math.round(W / k) + 1, kx = L / (nx - 1), ky = W / (ny - 1);
  const vis = new Float32Array(nx * ny).fill(H), pos = new Float32Array(nx * ny * 3), col = new Float32Array(nx * ny * 3), idx = [];
  const bg = mdf ? BOJA_MDF : BOJA_G;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const q = j * nx + i; pos.set([x0 + i * kx, bot + H, -(y0 + j * ky)], 3 * q); col.set([bg.r, bg.g, bg.b], 3 * q);
    if (i < nx - 1 && j < ny - 1) { const a = q, b = q + 1, c = q + nx, d = q + nx + 1; idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mdf ? 0.85 : 0.45, metalness: mdf ? 0 : 0.35, side: THREE.DoubleSide }));
  const rub = []; for (let i = 0; i < nx; i++) rub.push(i); for (let j = 1; j < ny; j++) rub.push(j * nx + nx - 1); for (let i = nx - 2; i >= 0; i--) rub.push((ny - 1) * nx + i); for (let j = ny - 2; j > 0; j--) rub.push(j * nx);
  const rp = new Float32Array(rub.length * 6), ri = [];
  rub.forEach((q, n) => { const x = pos[3 * q], z = pos[3 * q + 2]; rp.set([x, bot + H, z, x, bot, z], 6 * n); const m = (n + 1) % rub.length; ri.push(2 * n, 2 * n + 1, 2 * m, 2 * m, 2 * n + 1, 2 * m + 1); });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
  const rm = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: mdf ? 0xb48a5a : 0xb7bec3, roughness: 0.55, metalness: mdf ? 0 : 0.3, side: THREE.DoubleSide }));
  mesh.userData.dio = rm.userData.dio = 'obradak';
  S.obrGrupa.add(mesh, rm);
  PL = { L, W, H, x0, y0, bot, top: bot + H, k, kx, ky, nx, ny, vis, mesh, rub: rm, rubIdx: rub, prljavo: false, mdf, bg, br: mdf ? BOJA_MDFR : BOJA_R };
}
function osvjeziPlocu() {
  if (!PL || !PL.prljavo) return; PL.prljavo = false;
  const p = PL.mesh.geometry.attributes.position.array, c = PL.mesh.geometry.attributes.color.array, t = new THREE.Color();
  for (let q = 0; q < PL.vis.length; q++) { p[3 * q + 1] = PL.bot + PL.vis[q]; t.copy(PL.bg).lerp(PL.br, Math.min(1, (PL.H - PL.vis[q]) / 2.5)); c[3 * q] = t.r; c[3 * q + 1] = t.g; c[3 * q + 2] = t.b; }
  PL.mesh.geometry.attributes.position.needsUpdate = true; PL.mesh.geometry.attributes.color.needsUpdate = true; PL.mesh.geometry.computeVertexNormals();
  const rp = PL.rub.geometry.attributes.position.array; PL.rubIdx.forEach((q, n) => { rp[6 * n + 1] = PL.bot + PL.vis[q]; }); PL.rub.geometry.attributes.position.needsUpdate = true;
}
/* obrada ili provjera prodora vrha alata (ravno glodalo) u ploču; vraća najveći prodor */
function ploca(t, rezi) {
  if (!PL) return 0; const h = t.z - PL.bot; if (h >= PL.H) return 0;
  const i0 = Math.max(0, Math.floor((t.x - R - PL.x0) / PL.kx)), i1 = Math.min(PL.nx - 1, Math.ceil((t.x + R - PL.x0) / PL.kx));
  const j0 = Math.max(0, Math.floor((t.y - R - PL.y0) / PL.ky)), j1 = Math.min(PL.ny - 1, Math.ceil((t.y + R - PL.y0) / PL.ky));
  const r2 = R * R, hh = Math.max(0, h); let pr = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dx = PL.x0 + i * PL.kx - t.x, dy = PL.y0 + j * PL.ky - t.y; if (dx * dx + dy * dy > r2) continue;
    const q = j * PL.nx + i; if (PL.vis[q] > hh) { pr = Math.max(pr, PL.vis[q] - hh); if (rezi) { PL.vis[q] = hh; PL.prljavo = true; } }
  }
  return pr;
}
function visinaPloce(x, y) { if (!PL) return null; const i = Math.round((x - PL.x0) / PL.kx), j = Math.round((y - PL.y0) / PL.ky); if (i < 0 || j < 0 || i >= PL.nx || j >= PL.ny) return null; return PL.bot + PL.vis[j * PL.nx + i]; }

/* --- valjak u 4. osi: cilindrična mreža r(x, φ) ---------------------- */
let VA = null;
const NF = 360;
function ukloniValjak() { if (!VA) return; S.obrA.remove(VA.grupa); VA.grupa.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); VA = null; }
function napraviValjak() {
  ukloniValjak();
  const r0 = VALJAK.d / 2, Lf = VALJAK.L - VALJAK.uCelj, k = 0.5, nx = Math.round(Lf / k) + 1;
  const r = new Float32Array(nx * NF).fill(r0), cs = new Float32Array(NF), sn = new Float32Array(NF);
  for (let j = 0; j < NF; j++) { cs[j] = Math.cos(j / NF * 2 * Math.PI); sn[j] = Math.sin(j / NF * 2 * Math.PI); }
  const grupa = new THREE.Group(); S.obrA.add(grupa);
  const pos = new Float32Array(nx * (NF + 1) * 3), col = new Float32Array(nx * (NF + 1) * 3), idx = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j <= NF; j++) { const q = i * (NF + 1) + j; col.set([BOJA_MDF.r, BOJA_MDF.g, BOJA_MDF.b], 3 * q); if (i < nx - 1 && j < NF) { const a = q, b = q + 1, c = q + NF + 1, d = q + NF + 2; idx.push(a, b, c, b, d, c); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })); grupa.add(mesh);
  /* čela: lepeza od osi do ruba */
  const cela = []; for (const i of [0, nx - 1]) {
    const cp = new Float32Array((NF + 2) * 3), ci = []; for (let j = 0; j < NF; j++) ci.push(0, j + 1, (j + 1) % NF + 1);
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setIndex(ci);
    const cm = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0xb48a5a, roughness: 0.85, side: THREE.DoubleSide })); grupa.add(cm); cela.push({ i, cg });
  }
  const steg = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, VALJAK.uCelj, 48), new THREE.MeshStandardMaterial({ color: 0xb48a5a, roughness: 0.85 }));
  steg.rotation.z = Math.PI / 2; steg.position.x = -VALJAK.uCelj / 2; grupa.add(steg);
  grupa.traverse((m) => { if (m.isMesh) m.userData.dio = 'obradak'; });
  VA = { r0, Lf, k, nx, r, cs, sn, grupa, mesh, cela, prljavo: true };
  osvjeziValjak();
}
function osvjeziValjak() {
  if (!VA || !VA.prljavo) return; VA.prljavo = false;
  const p = VA.mesh.geometry.attributes.position.array, c = VA.mesh.geometry.attributes.color.array, t = new THREE.Color();
  for (let i = 0; i < VA.nx; i++) for (let j = 0; j <= NF; j++) {
    const jj = j % NF, rr = VA.r[i * NF + jj], q = i * (NF + 1) + j;
    p[3 * q] = i * VA.k; p[3 * q + 1] = rr * VA.sn[jj]; p[3 * q + 2] = -rr * VA.cs[jj];
    t.copy(BOJA_MDF).lerp(BOJA_MDFR, Math.min(1, (VA.r0 - rr) / 2)); c[3 * q] = t.r; c[3 * q + 1] = t.g; c[3 * q + 2] = t.b;
  }
  VA.mesh.geometry.attributes.position.needsUpdate = true; VA.mesh.geometry.attributes.color.needsUpdate = true; VA.mesh.geometry.computeVertexNormals();
  VA.cela.forEach(({ i, cg }) => { const a = cg.attributes.position.array; a.set([i * VA.k, 0, 0], 0); for (let j = 0; j < NF; j++) { const rr = VA.r[i * NF + j]; a.set([i * VA.k, rr * VA.sn[j], -rr * VA.cs[j]], 3 * (j + 1)); } cg.attributes.position.needsUpdate = true; cg.computeVertexNormals(); });
}
/* alat okomito; točka valjka pod kutom φ (u materijalu) nakon zakreta A je pod kutom φ + A u ravnini Y–Z.
   Reže se dio zrake od osi koji uđe u alat: |y − yt| ≤ w(dx) i z ≥ zt (vrh alata). Vraća najveći prodor. */
function valjak(t, Agr, rezi) {
  if (!VA) return 0;
  const u = t.x - LICE, yr = t.y - GEO.A.y, zr = t.z - HA; if (zr >= VA.r0 || Math.abs(yr) > VA.r0 + R) return 0;
  const i0 = Math.max(0, Math.ceil((u - R) / VA.k)), i1 = Math.min(VA.nx - 1, Math.floor((u + R) / VA.k)); if (i0 > i1) return 0;
  const a = Agr * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a); let pr = 0;
  for (let i = i0; i <= i1; i++) {
    const du = i * VA.k - u, w = Math.sqrt(Math.max(0, R * R - du * du)); if (w <= 0) continue;
    for (let j = 0; j < NF; j++) {
      const cp = VA.cs[j] * ca - VA.sn[j] * sa, sp = VA.sn[j] * ca + VA.cs[j] * sa;    /* cos, sin od φ + A */
      if (zr > 0 && sp <= 0) continue;
      let lo = 0, hi = Infinity;
      if (sp > 1e-9) lo = Math.max(lo, zr / sp); else if (sp < -1e-9) hi = Math.min(hi, zr / sp); else if (zr > 0) continue;
      const b1 = yr - w, b2 = yr + w;                         /* b1 ≤ ρ·cos ≤ b2 */
      if (cp > 1e-9) { lo = Math.max(lo, b1 / cp); hi = Math.min(hi, b2 / cp); } else if (cp < -1e-9) { lo = Math.max(lo, b2 / cp); hi = Math.min(hi, b1 / cp); } else if (b1 > 0 || b2 < 0) continue;
      const q = i * NF + j;
      if (lo <= hi && lo < VA.r[q]) { pr = Math.max(pr, VA.r[q] - lo); if (rezi) { VA.r[q] = Math.max(0, lo); VA.prljavo = true; } }
    }
  }
  return pr;
}

/* ================================================================== */
/* 5. Pribor, pripremak, nultočka                                       */
/* ================================================================== */
function opisPribora(t) { $('pribor-opis').textContent = t; }
function postaviSkripac() {
  ukloniValjak(); S.konjicNa(165);
  const p = S.skripacZa(VJEZBA.L, VJEZBA.W, VJEZBA.H, VJEZBA.xc, VJEZBA.yc);
  napraviPlocu(VJEZBA.L, VJEZBA.W, VJEZBA.H, p.x0, p.y0, p.bot, false);
  st.pribor = 'skripac'; st.Ztop = PL.top + 30; S.postaviZtop(st.Ztop);
  opisPribora('Pripremak ' + VJEZBA.L + ' × ' + VJEZBA.W + ' × ' + VJEZBA.H + ' mm u škripcu (aluminij); vreteno je u obujmici namješteno tako da je vrh alata pri Z = 0 30 mm iznad pripremka.');
}
function postaviValjak() {
  ukloniPlocu(); S.bezPribora(); napraviValjak(); S.konjicNa(LICE + VALJAK.L - VALJAK.uCelj);
  st.pribor = 'osA'; st.Ztop = HA + VALJAK.d / 2 + 25; S.postaviZtop(st.Ztop);
  opisPribora('Valjak Ø' + VALJAK.d + ' × ' + VALJAK.L + ' mm (MDF) u steznoj glavi, ' + VALJAK.uCelj + ' mm u čeljustima, konjić na desnom kraju. Os A je ' + HA + ' mm iznad stola (pretpostavka).');
}
function bezPribora() { ukloniPlocu(); ukloniValjak(); S.bezPribora(); S.konjicNa(165); st.pribor = null; opisPribora('Na stolu nema pripremka. Pripremak se postavlja kad učitaš program.'); }
/* raspon koordinata programa (samo izričito zadane vrijednosti) */
function obseg(G) {
  const o = { X: [Infinity, -Infinity], Y: [Infinity, -Infinity], Z: [Infinity, -Infinity], A: [Infinity, -Infinity] }; let abs = true; const p = { X: 0, Y: 0, Z: 0, A: 0 };
  String(G).split('\n').forEach((l) => { const { kod, w } = razlozi(l); if (!kod) return; w.G.forEach((g) => { if (g === 90) abs = true; if (g === 91) abs = false; });
    OSI.forEach((a) => { if (w[a] !== undefined) { p[a] = abs ? w[a] : p[a] + w[a]; o[a][0] = Math.min(o[a][0], p[a]); o[a][1] = Math.max(o[a][1], p[a]); } }); });
  OSI.forEach((a) => { if (!isFinite(o[a][0])) o[a] = [0, 0]; });
  return o;
}
function provjeriHod(ob) {
  const gr = [];
  for (const a of ['X', 'Y']) { const lo = st.G54[a] + ob[a][0] - R, hi = st.G54[a] + ob[a][1] + R; const tr = hi - lo, hod = HOD[a][1] - HOD[a][0];
    if (tr > hod + 1e-6) gr.push('putanja u ' + a + ' treba ' + kr(tr, 1) + ' mm, a hod je ' + hod + ' mm');
    else if (lo < HOD[a][0] - 1e-6 || hi > HOD[a][1] + 1e-6) gr.push('putanja u ' + a + ' izlazi iz hoda (' + kr(lo, 1) + ' … ' + kr(hi, 1) + ' mm)'); }
  const zlo = st.G54.Z + ob.Z[0], zhi = st.G54.Z + ob.Z[1];
  if (zlo < HOD.Z[0] - 1e-6 || zhi > HOD.Z[1] + 1e-6) gr.push('putanja u Z izlazi iz hoda (' + kr(zlo, 1) + ' … ' + kr(zhi, 1) + ' mm)');
  return gr;
}

/* ================================================================== */
/* 6. Program                                                          */
/* ================================================================== */
function ucitaj(ime) {
  if (st.prog && st.prog.ide) { info('Program radi — najprije ga zaustavi (Stop).'); return; }
  const jeA = !!PRIMJERI_A[ime], pr = jeA ? PRIMJERI_A[ime] : PREDMETI[ime]; if (!pr) return;
  let napomena = '';
  if (jeA) {
    if (st.pribor !== 'osA') { postaviValjak(); st.G54 = { X: LICE - XT0 - st.refOff.X, Y: GEO.A.y - YT0 - st.refOff.Y, Z: HA - st.Ztop - st.refOff.Z, A: mach('A') }; napomena = 'Valjak je stegnut u 4. os, a nultočka postavljena (X0 čelo čeljusti, Y0 i Z0 na osi).'; }
  } else {
    const uSkr = pr.L <= 100 && pr.W <= 60;
    ukloniValjak(); S.konjicNa(165);
    const p = uSkr ? S.skripacZa(pr.L, pr.W, pr.H, VJEZBA.xc, 0) : S.pandzeZa(pr.L, pr.W, pr.H, 0, 0);
    napraviPlocu(pr.L, pr.W, pr.H, p.x0, p.y0, p.bot, true);
    st.pribor = uSkr ? 'skripac' : 'pandze';
    const ob = obseg(pr.G), raspon = ob.Z[1] - ob.Z[0];
    st.Ztop = PL.top + ob.Z[1] + Math.max(2, Math.min(20, 55 - raspon - 3)); S.postaviZtop(st.Ztop);
    st.G54 = { X: p.x0 - XT0 - st.refOff.X, Y: p.y0 - YT0 - st.refOff.Y, Z: PL.top - st.Ztop - st.refOff.Z, A: mach('A') };
    napomena = (uSkr ? 'Pripremak je u škripcu.' : 'Pripremak ' + pr.L + ' × ' + pr.W + ' mm veći je od škripca (do 100 × 60 mm), pa je stegnut pandžama na podložnoj MDF ploči.') + ' Nultočka G54 postavljena je na lijevi prednji gornji kut, a vreteno namješteno u obujmici prema visini pripremka.';
    opisPribora('Pripremak ' + pr.L + ' × ' + pr.W + ' × ' + pr.H + ' mm (MDF) ' + (uSkr ? 'u škripcu' : 'na podložnoj ploči sa steznim pandžama') + '; nultočka G54 u lijevom prednjem gornjem kutu.');
  }
  const G = pr.G, redci = G.replace(/\r/g, '').split('\n');
  /* stanje vretena i objašnjenje za svaki redak */
  const vrti = new Uint8Array(redci.length), Sr = new Float32Array(redci.length), obj = new Array(redci.length);
  let v = 0, s = 0, sta = {};
  redci.forEach((l, i) => { const { w } = razlozi(l); if (w.S !== undefined) s = w.S; if (w.M.includes(3) || w.M.includes(4)) v = 1; if (w.M.includes(5) || w.M.includes(30) || w.M.includes(2)) v = 0; vrti[i] = v; Sr[i] = s; const o = objasni(l, sta); obj[i] = o.tekst; sta = o.stanje; });
  const ops = pr.ops || [];
  const opisi = opisiOperacije(G, ops, ALATI);
  const hod = provjeriHod(obseg(G));
  st.prog = { ime, jeA, pr, G, redci, vrti, Sr, obj, ops, opisi, hod, P: null, i: 0, ide: false, gotov: false, trenRed: 0, zadRed: -1, prikRed: -1, single: st.prog ? st.prog.single : false, preskoci: false, F: 0, v: 0 };
  st.pregled = 0;
  status('File loaded: ' + ime + '.tap' + (hod.length ? ' — upozorenje: ' + hod.join('; ') : ''));
  info((napomena ? napomena + ' ' : '') + (hod.length ? 'POZOR: program ne stane u hod stroja — ' + hod.join('; ') + '. Mach3 bi ga zaustavio kod soft limits.' : 'Program stane u hod stroja.'), !!hod.length);
  crtajPredmet(); crtaj();
  dogadaj('ucitan', { ime, stane: !hod.length, jeA });
}
function pripremiPutanju() {
  const A = st.prog;
  const r = prevedi(A.G, { start: { X: mach('X'), Y: mach('Y'), Z: mach('Z'), A: mach('A') }, G54: st.G54, T0: 1, duljina: () => 0, alatPostoji: () => true, korak: 0.5 });
  A.P = r.P; A.i = 0; A.gotov = false; A.zadRed = -1; A.prikRed = -1; A.zapoceta = -1;
  if (r.greske.length) status('Upozorenje: ' + r.greske.slice(0, 3).join('; '));
}
function rpmCilj() {
  if (!st.pretv || !st.kutija) return 0;
  if (st.vfd.nacin === 'rucno') return st.vfd.run ? st.vfd.pot : 0;
  if (st.reset || st.gljiva || !st.usb || st.mach3 !== 'on') return 0;
  return st.cw ? Math.min(S_MAX, st.S) * st.sro / 100 : 0;
}
function postaviS(S) { if (S > S_MAX) { if (!st.sUpoz) status('S' + S + ' je iznad najveće brzine vretena — ograničeno na ' + S_MAX + ' o/min.'); st.sUpoz = true; } st.S = Math.min(S, S_MAX); }
function korakProg(dt) {
  const A = st.prog; if (!A || !A.ide) return;
  let ost = dt * st.ubrzanje;
  while (ost > 0 && A.i < A.P.length) {
    const p = A.P[A.i], red = p[6];
    if (A.zapoceta !== A.i) {                                          /* nova točka: Single BLK staje na granici bloka */
      if (A.single && A.zadRed >= 0 && red !== A.zadRed && !A.preskoci) { A.ide = false; prikaziBlok(A.zadRed); st.sbBroj++; dogadaj('singleBlok'); crtaj(); return; }
      A.zapoceta = A.i;
    }
    A.preskoci = false;
    if (red !== A.trenRed) { A.trenRed = red; crtajOperaciju(); }
    st.cw = !!A.vrti[red]; postaviS(A.Sr[red]);
    { const c = rpmCilj(); if (c > st.rpm) st.rpm = c; }               /* zalet vretena: Mach3 čeka (Spindle CW delay) */
    const cilj = { X: p[0] + st.refOff.X, Y: p[1] + st.refOff.Y, Z: p[2] + st.refOff.Z, A: p[3] + st.refOff.A };
    if (st.soft) for (const o of ['X', 'Y', 'Z']) if (cilj[o] < HOD[o][0] - 1e-6 || cilj[o] > HOD[o][1] + 1e-6) {
      A.ide = false; status('Soft limit: os ' + o + ' bi izašla iz hoda (redak ' + (red + 1) + ').'); info('Program je zaustavljen: os ' + o + ' bi u retku ' + (red + 1) + ' izašla iz hoda stroja (soft limits). Program ne stane u hod — vidi upozorenje kod učitavanja.', true); crtaj(); return; }
    const d = { X: cilj.X - st.fiz.X, Y: cilj.Y - st.fiz.Y, Z: cilj.Z - st.fiz.Z, A: cilj.A - st.fiz.A };
    let t;                                                               /* preostalo vrijeme do točke (s) */
    if (p[4] === 0) { t = Math.max(Math.abs(d.X) / BRZI.X, Math.abs(d.Y) / BRZI.Y, Math.abs(d.Z) / BRZI.Z, Math.abs(d.A) / BRZI.A) * 60; A.F = 0; A.v = BRZI.X; }
    else { const F = Math.max(1, p[5]) * st.fro / 100; if (F <= 0.01) break; t = Math.hypot(d.X, d.Y, d.Z, d.A) / F * 60; A.F = p[5]; A.v = F; }
    if (p[4] !== 0 && st.fro <= 0) break;
    const od = { ...st.fiz }; let u;
    if (t <= ost) { u = 1; ost -= t; } else { u = ost / t; ost = 0; }
    const nov = u >= 1 ? cilj : { X: od.X + d.X * u, Y: od.Y + d.Y * u, Z: od.Z + d.Z * u, A: od.A + d.A * u };
    if (!gibaj(od, nov, p[4] === 1)) return;
    if (u >= 1) { A.i++; A.zadRed = red; }
  }
  if (A.i >= A.P.length && A.ide) {
    A.ide = false; A.gotov = true; st.cw = false; A.trenRed = 0; st.pregled = 0;
    status('Program end (M30) — ' + A.ime + '.tap'); info('Program je završen (M30). Mach3 se vratio na početak programa.');
    crtajOperaciju(); crtaj(); dogadaj('programKraj');
  }
}
/* gibanje alata od → do u fizičkim koordinatama s uzorkovanjem (obrada, sudari) */
function gibaj(od, nov, rez) {
  const dl = Math.hypot(nov.X - od.X, nov.Y - od.Y, nov.Z - od.Z), da = Math.abs(nov.A - od.A);
  const n = Math.max(1, Math.ceil(Math.max(dl / 0.4, da / 1)));
  for (let q = 1; q <= n; q++) {
    const s = q / n;
    st.fiz = { X: od.X + (nov.X - od.X) * s, Y: od.Y + (nov.Y - od.Y) * s, Z: od.Z + (nov.Z - od.Z) * s, A: od.A + (nov.A - od.A) * s };
    const sd = obradi(rez); if (sd) { sudar(sd); return false; }
  }
  return true;
}
function obradi(rez) {
  const t = vrh(), vrti = st.rpm > 500;
  if (t.z < -0.01) return 'stol';
  /* škripac */
  const sk = S.pribor.skripac;
  if (st.pribor === 'skripac' && sk) {
    for (const c of sk.celjusti) if (t.z < c.z1 && krugPravokutnik(t.x, t.y, R, c)) return 'skripac';
    if (t.z < sk.bot && Math.abs(t.x - VJEZBA.xc) < 75 && t.y > VJEZBA.yc - 75 && t.y < VJEZBA.yc + 60) return 'skripac';
  }
  if (st.pribor === 'pandze' && S.pribor.pandze && PL && !vrti && t.z < S.pribor.pandze.D && t.x > PL.x0 - 20 && t.x < PL.x0 + PL.L + 20 && t.y > PL.y0 - 20 && t.y < PL.y0 + PL.W + 20) return 'podloga';
  /* stezna glava i konjić */
  const yr = t.y - GEO.A.y, zr = t.z - HA, dist = zr > 0 ? Math.hypot(Math.max(0, Math.abs(yr) - R), zr) : Math.max(0, Math.abs(yr) - R);
  if (t.x - R < LICE + 0.5 && dist < 42) return 'celjust';
  const xk = S.konjic.position.x;
  if (t.x + R > xk && t.x - R < xk + 110 && dist < 26) return 'konjic';
  /* materijal */
  const rezi = rez && vrti;
  const pr = PL ? ploca(t, rezi || (vrti && !st.prog?.ide)) : 0;
  const pv = VA ? valjak(t, st.fiz.A, rezi || (vrti && !st.prog?.ide)) : 0;
  if (Math.max(pr, pv) > 0.02 && !(vrti && (rez || !st.prog?.ide))) return vrti ? 'brzi' : 'nerotira';
  return null;
}
function krugPravokutnik(x, y, r, c) { const dx = Math.max(c.x0 - x, 0, x - c.x1), dy = Math.max(c.y0 - y, 0, y - c.y1); return dx * dx + dy * dy < r * r; }
const SUDAR = {
  stol: 'Alat je dublje od stola — udario je u stol.', skripac: 'Alat je udario u škripac (čeljust ili podnožje).', podloga: 'Alat je udario u podložnu ploču, a vreteno se ne vrti.',
  celjust: 'Alat je udario u steznu glavu osi A.', konjic: 'Alat je udario u konjić.', brzi: 'Alat je brzim hodom (G0) ušao u materijal.',
  nerotira: 'Alat je ušao u materijal, a vreteno se ne vrti'
};
function sudar(sto) {
  st.alarm = sto; st.jog = null; st.homing = null; if (st.prog) st.prog.ide = false; st.cw = false;
  let t = SUDAR[sto] || 'Sudar.';
  if (sto === 'nerotira') t += st.pretv && st.vfd.nacin === 'rucno' ? ' — pretvarač je u načinu Ručno, pa M3 iz programa ne pokreće vreteno.' : st.pretv ? '.' : ' — pretvarač nije uključen.';
  status('Collision / sudar — stroj je zaustavljen');
  $('poruka').innerHTML = '<span class="upoz">Sudar!</span> ' + esc(t) + ' Na stroju bi se alat slomio ili bi motor preskočio korake. Pritisni „Ponovno pokreni niz”.';
  $('ponovi').hidden = false; crtaj();
}

/* ================================================================== */
/* 7. Ručno gibanje i referenciranje                                    */
/* ================================================================== */
function zasto() {
  if (st.alarm) return 'Stroj je zaustavljen nakon sudara — ponovno pokreni niz.';
  if (st.mach3 !== 'on') return 'Mach3 nije pokrenut.';
  if (!st.kutija) return 'Upravljačka kutija nema napajanja (POWER).';
  if (!st.usb) return 'Kontroler nije spojen (USB).';
  if (st.gljiva) return 'Gljiva za nužno zaustavljanje je pritisnuta.';
  if (st.reset) return 'Mach3 je u stanju Reset — pritisni Reset (treperi).';
  if (st.homing) return 'Referenciranje je u tijeku.';
  return '';
}
function jogStart(o, smjer) {
  const z = zasto(); if (z) { info(z); return; }
  if (st.prog && st.prog.ide) { info('Za vrijeme programa osi se ne gibaju ručno.'); return; }
  if (st.jogNacin === 'step') { const c = Math.round((st.fiz[o] + smjer * st.jogKorak) * 1e6) / 1e6; st.jog = { os: o, cilj: c, korak: true }; }
  else st.jog = { os: o, smjer, drzi: true };
}
function jogStop() { if (st.jog && st.jog.drzi) { st.jog = null; dogadaj('pomak'); crtaj(); } }
function korakJog(dt) {
  const J = st.jog; if (!J) return;
  const o = J.os, v = JOG[o] / 60 * dt, staro = st.fiz[o]; let nov, kraj = false;
  if (J.drzi) nov = staro + J.smjer * v; else { const d = J.cilj - staro; if (Math.abs(d) <= v) { nov = J.cilj; kraj = true; } else nov = staro + Math.sign(d) * v; }
  if (o !== 'A' && (nov < HOD[o][0] || nov > HOD[o][1])) { nov = Math.min(Math.max(nov, HOD[o][0]), HOD[o][1]); st.jog = null; kraj = true; info(st.refd && st.soft ? 'Soft limit: os ' + o + ' je na kraju hoda.' : 'Os ' + o + ' je na graničniku (kraj hoda).'); }
  const od = { ...st.fiz }, n = { ...st.fiz }; n[o] = nov;
  if (!gibaj(od, n, true)) return;
  st.put[o] += Math.abs(nov - staro); if (J.drzi) st.putCont[o] += Math.abs(nov - staro);
  if (kraj) { st.jog = null; dogadaj('pomak', { os: o, korak: J.korak }); crtaj(); }
  else if (J.drzi && (st.tJog = (st.tJog || 0) + dt) > 0.2) { st.tJog = 0; dogadaj('pomak', { os: o }); }
}
function refAll() {
  const z = zasto(); if (z) { info(z); return; }
  if (st.prog && st.prog.ide) return;
  st.homing = { red: ['Z', 'X', 'Y'], k: 0 }; status('Referenciranje: os Z …'); crtaj();
}
function korakRef(dt) {
  const H = st.homing; if (!H) return;
  const o = H.red[H.k], cilj = o === 'Z' ? HOD.Z[1] : HOD[o][0], v = F_REF / 60 * dt * st.ubrzanje, d = cilj - st.fiz[o];
  const n = { ...st.fiz }; n[o] = Math.abs(d) <= v ? cilj : st.fiz[o] + Math.sign(d) * v;
  if (!gibaj({ ...st.fiz }, n, false)) return;
  if (n[o] === cilj) { H.k++; if (H.k < H.red.length) status('Referenciranje: os ' + H.red[H.k] + ' …'); else {
    st.homing = null; st.refd = true; st.refOff = { X: 0, Y: 0, Z: 0, A: st.refOff.A }; status('Ref All Home: osi X, Y i Z referencirane (os A nema sklopke).'); crtaj(); dogadaj('ref'); } }
}

/* ================================================================== */
/* 8. Papir (dodir ruba)                                               */
/* ================================================================== */
function papir() {
  const t = vrh();
  if (PL && st.pribor === 'skripac') {
    const unY = t.y > PL.y0 + 0.5 && t.y < PL.y0 + PL.W - 0.5, unX = t.x > PL.x0 + 0.5 && t.x < PL.x0 + PL.L - 0.5, ispod = t.z < PL.top - 0.3 && t.z > PL.bot;
    if (ispod && unY && t.x < PL.x0) return { os: 'X', g: PL.x0 - (t.x + R) };
    if (ispod && unX && t.y < PL.y0) return { os: 'Y', g: PL.y0 - (t.y + R) };
    if (t.x >= PL.x0 && t.x <= PL.x0 + PL.L && t.y >= PL.y0 && t.y <= PL.y0 + PL.W) { const h = visinaPloce(t.x, t.y); return { os: 'Z', g: t.z - h }; }
  }
  if (VA) { const u = t.x - LICE, yr = Math.abs(t.y - GEO.A.y); if (u > R && u < VA.Lf - R && yr < VA.r0 - 2) return { os: 'Z', g: t.z - (HA + Math.sqrt(VA.r0 * VA.r0 - Math.pow(Math.max(0, yr - R), 2))) }; }
  return null;
}
const zapinje = (p, os) => p && p.os === os && p.g >= -1e-6 && p.g <= 0.05 + 1e-6;
function tekstPapira() {
  const p = papir(); if (!p) return '— alat nije uz rub ni iznad pripremka';
  const gdje = { X: 'lijevi rub', Y: 'prednji rub', Z: 'gornja ploha' }[p.os];
  if (p.g < -1e-6) return gdje + ': alat je u materijalu';
  if (p.g <= 0.05 + 1e-6) return '<b class="zap">' + gdje + ': papir zapinje — dodir!</b>';
  if (p.g <= 0.2) return gdje + ': papir klizi, alat je vrlo blizu — koristi korak 0.01';
  if (p.g <= 1) return gdje + ': papir klizi, alat je blizu';
  return gdje + ': razmak se vidi, papir slobodno klizi';
}

/* ================================================================== */
/* 9. Koraci                                                           */
/* ================================================================== */
const blizu = (a, b, e = 0.0005) => Math.abs(a - b) <= e;
function trenutni() { return niz ? niz.koraci[korak] : null; }
function dogadaj(e, d = {}) {
  const k = trenutni(); if (!k || st.alarm) return;
  const pp = papir();
  const ok = (() => {
    switch (k[2]) {
      case 'kutija': return st.kutija;
      case 'pretvarac': return st.pretv && st.vfd.nacin === 'PC';
      case 'usb': return st.usb;
      case 'mach3': return st.mach3 === 'on';
      case 'gljiva': return !st.gljiva;
      case 'reset': return e === 'reset' && !st.reset;
      case 'ref': return e === 'ref';
      case 'jogPanel': return st.jogPanel;
      case 'contX': return st.putCont.X >= 20;
      case 'contY': return st.putCont.Y >= 20;
      case 'contZ': return st.putCont.Z >= 5;
      case 'step': return e === 'pomak' && d.korak && d.os === 'Z' && st.jogNacin === 'step' && st.jogKorak === 1;
      case 'A90': return blizu(rad('A'), 90, 0.001);
      case 'polozaj': return e === 'pomak' && blizu(mach('X'), 150) && blizu(mach('Y'), 100) && blizu(mach('Z'), -20);
      case 'dalje': return e === 'dalje';
      case 'dodirX': return e === 'pomak' && zapinje(pp, 'X');
      case 'droX': return e === 'droX' && blizu(st.G54.X, PL.x0 - XT0, 0.07);
      case 'dodirY': return e === 'pomak' && zapinje(pp, 'Y');
      case 'droY': return e === 'droY' && blizu(st.G54.Y, PL.y0 - YT0, 0.07);
      case 'dodirZ': return e === 'pomak' && zapinje(pp, 'Z');
      case 'zeroZ': return e === 'zeroZ' && blizu(st.G54.Z, PL.top - st.Ztop, 0.07);
      case 'zero4': return e === 'zeroA';
      case 'ucitajP05': return e === 'ucitan' && d.ime === 'P05';
      case 'ucitajP14': return e === 'ucitan' && d.ime === 'P14' && !d.stane;
      case 'ucitajOK': return e === 'ucitan' && d.stane && !d.jeA;
      case 'f10': return st.fro <= 10;
      case 'start': return e === 'cycleStart';
      case 'fUp': return st.fro >= 100 && st.prog && (st.prog.ide || st.prog.i > 0);
      case 'hold': return e === 'hold';
      case 'single': return e === 'singleBlok' && st.sbBroj >= 3;
      case 'gotovo': case 'gotovoA': return e === 'programKraj';
      case 'dodirZA': return e === 'pomak' && zapinje(pp, 'Z');
      case 'droZA': return e === 'droZ' && blizu(st.G54.Z, HA - st.Ztop, 0.07);
      case 'ucitajA': return e === 'ucitan' && d.jeA;
      case 'startA': return e === 'cycleStart' && st.prog && st.prog.jeA && st.fro <= 10;
      default: return false;
    }
  })();
  if (k[2] === 'startA' && e === 'cycleStart' && st.fro > 10) info('Najprije smanji Feedrate override na 10 %.');
  if (ok) { korak++; if (korak >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); } crtajKorak(); }
}

/* ================================================================== */
/* 10. Sučelje Mach3                                                   */
/* ================================================================== */
function info(t, upoz) { $('poruka').innerHTML = upoz ? '<span class="upoz">' + esc(t) + '</span>' : esc(t); }
function status(t) { st.status = t; const el = $('m3-status'); if (el) el.textContent = t; }
let uredjuje = null;
function crtajDRO() {
  OSI.forEach((o) => { if (uredjuje === o) return; const el = $('dro-' + o); if (el) el.textContent = st.mach3 === 'on' ? dro(st.mc ? mach(o) : rad(o)) : ''; });
}
function crtajKod() {
  const el = $('m3-kod'); const A = st.prog;
  if (!A || st.mach3 !== 'on') { el.innerHTML = ''; $('m3-line').textContent = '0'; return; }
  const cur = A.ide || A.i > 0 ? A.trenRed : st.pregled;
  const p0 = Math.max(0, Math.min(cur - 3, A.redci.length - 14));
  let h = ''; for (let i = p0; i < Math.min(A.redci.length, p0 + 14); i++) h += '<div class="' + (i === cur ? 'akt' : '') + '"><i>' + (i + 1) + '</i>' + esc(A.redci[i] || ' ') + '</div>';
  el.innerHTML = h; $('m3-line').textContent = String(cur + 1);
}
function crtaj() {
  const on = st.mach3 === 'on';
  $('m3-off').hidden = on;
  $('m3-off-t').textContent = st.mach3 === 'ucitava' ? 'Mach3 CNC Controller — učitavanje profila Mach3Mill…' : 'Računalo je uključeno. Mach3 nije pokrenut.';
  $('m3-pokreni').hidden = st.mach3 !== 'off';
  crtajDRO(); crtajKod();
  OSI.forEach((o) => { $('led-' + o).classList.toggle('upaljen', on && st.refd && o !== 'A'); });
  $('m3-datoteka').textContent = on && st.prog ? 'File: C:\\Mach3\\GCode\\' + st.prog.ime + '.tap' : 'File: No File Loaded';
  const rst = $('m3-reset'); rst.classList.toggle('trepce', on && st.reset); rst.setAttribute('aria-pressed', String(on && st.reset));
  const pr = (id, v) => { const b = $(id); b.setAttribute('aria-pressed', String(!!v)); };
  pr('m3-mc', st.mc); pr('m3-soft', st.soft); pr('m3-jogb', st.jogPanel); pr('m3-single', st.prog && st.prog.single); pr('m3-cw', st.cw); pr('m3-joga', st.jogA);
  $('m3-start').classList.toggle('radi', !!(st.prog && st.prog.ide));
  $('m3-jog').hidden = !(on && st.jogPanel);
  document.querySelectorAll('[data-jogn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.jogn === st.jogNacin)));
  document.querySelectorAll('[data-jogk]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.jogk === st.jogKorak)));
  $('m3-fro').textContent = String(st.fro); $('m3-sro').textContent = String(st.sro);
  const A = st.prog; $('m3-f').textContent = (A ? A.F : 0).toFixed(2); $('m3-v').textContent = (A && A.ide ? A.v : st.jog ? JOG[st.jog.os] : 0).toFixed(2);
  $('m3-s').textContent = String(Math.round(st.S)); $('m3-rpm').textContent = String(Math.round(st.rpm));
  $('m3-status').textContent = on ? st.status || 'Ready' : '';
  /* upravljačka kutija i pretvarač */
  pr('k-power', st.kutija); pr('k-gljiva', st.gljiva); pr('k-usb', st.usb); pr('v-power', st.pretv);
  document.querySelectorAll('[data-vfd]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vfd === st.vfd.nacin)));
  $('v-pot').value = String(st.vfd.pot); $('v-pot-v').textContent = String(st.vfd.pot);
  $('vfd-lcd').textContent = st.pretv ? (st.rpm / 60).toFixed(1) + ' Hz' : '';
  $('papir').innerHTML = tekstPapira();
}
function crtajPredmet() {
  const el = $('predmet'), A = st.prog;
  if (!A) { el.innerHTML = '<p class="pom">Učitaj program (Load G-Code): naši predmeti P01 … P21 ili primjeri A1 … A3 za četvrtu os.</p>'; return; }
  const pr = A.pr;
  let h = '<p><b>' + esc(A.ime) + '</b> · ' + (A.jeA ? esc(pr.naziv) + ' · valjak Ø' + pr.d + ' × ' + pr.L + ' mm' : 'pripremak ' + pr.L + ' × ' + pr.W + ' × ' + pr.H + ' mm') + ' · ' + A.redci.length + ' redaka</p>';
  if (A.jeA) h += '<p class="pom">' + esc(pr.opis) + '</p>';
  h += A.hod.length ? '<p class="upoz">Ne stane u hod: ' + esc(A.hod.join('; ')) + '.</p>' : '<p class="pom">Program stane u hod stroja (X 300 × Y 200 × Z 55 mm).</p>';
  h += '<ol class="ops" id="ops">' + A.ops.map((o, i) => '<li data-op="' + i + '"><b>' + esc(o.naziv.replace(/_/g, ' ')) + '</b> <span class="pom">(' + esc(o.vrsta) + ', od retka ' + (o.red + 1) + ')</span><br><span>' + esc(o.opis || A.opisi[i] || '') + '</span>' + (o.opis && A.opisi[i] ? '<br><span class="pom">' + esc(A.opisi[i]) + '</span>' : '') + '</li>').join('') + '</ol>';
  el.innerHTML = h; crtajOperaciju();
}
function crtajOperaciju() {
  const A = st.prog; if (!A) return; const red = A.ide || A.i > 0 ? A.trenRed : -1; let akt = -1; A.ops.forEach((o, i) => { if (red >= o.red) akt = i; });
  document.querySelectorAll('#ops li').forEach((li) => li.classList.toggle('akt', +li.dataset.op === akt));
  const op = A.ops[akt]; $('m3-oper').textContent = op ? op.naziv.replace(/_/g, ' ') : '';
}
function prikaziBlok(red) {
  const A = st.prog; if (!A) return; const el = $('blok-obj');
  const redovi = []; for (let i = Math.max(A.prikRed + 1, red - 4); i <= red; i++) if (A.redci[i] && A.redci[i].trim()) redovi.push(i);
  A.prikRed = red;
  el.hidden = false;
  el.innerHTML = '<b>Single BLK — izveden blok ' + (red + 1) + '</b>' + redovi.map((i) => '<div class="bo"><code>' + esc(A.redci[i]) + '</code><span>' + esc(A.obj[i]) + '</span></div>').join('') + '<p class="pom">Cycle Start izvodi sljedeći blok.</p>';
}

/* --- akcije Mach3 -------------------------------------------------- */
function cycleStart() {
  const z = zasto(); if (z) { info(z); return; }
  const A = st.prog; if (!A) { info('Nije učitan program — Load G-Code.'); return; }
  if (A.ide) return;
  if (st.jog) return;
  if (!A.P || A.gotov || A.i === 0) { if (A.hod.length && !A.upozoren) { A.upozoren = true; } pripremiPutanju(); }
  A.ide = true; A.preskoci = true; status('Program running — ' + A.ime + '.tap'); crtaj(); dogadaj('cycleStart');
}
function feedHold() { const A = st.prog; if (!A || !A.ide) return; A.ide = false; status('Feed Hold — Cycle Start nastavlja.'); crtaj(); dogadaj('hold'); }
function stop() { const A = st.prog; st.jog = null; if (A && A.ide) { A.ide = false; st.cw = false; status('Stop — program zaustavljen, vreteno stoji.'); } crtaj(); }
function rewind() { const A = st.prog; if (!A || A.ide) return; A.i = 0; A.trenRed = 0; A.gotov = false; A.zadRed = -1; A.prikRed = -1; A.zapoceta = -1; st.pregled = 0; $('blok-obj').hidden = true; status('Rewind — na početku programa.'); crtajOperaciju(); crtaj(); }
function resetMach3() {
  if (st.mach3 !== 'on') return;
  if (st.reset) {
    if (st.gljiva) { info('Gljiva za nužno zaustavljanje je pritisnuta — najprije je otpusti.'); status('External E-Stop Requested'); crtaj(); return; }
    if (!st.kutija) { info('Upravljačka kutija nema napajanja.'); return; }
    if (!st.usb) { info('Kontroler nije spojen (USB).'); return; }
    st.reset = false; status('Reset — stroj je spreman.'); crtaj(); dogadaj('reset');
  } else { estop('Reset'); }
}
function estop(uzrok) {
  st.reset = true; st.jog = null; st.homing = null; st.cw = false;
  const radio = st.prog && st.prog.ide; if (st.prog) st.prog.ide = false;
  status(uzrok === 'gljiva' ? 'External E-Stop Requested' : 'Emergency Mode Active — Reset');
  if (radio && niz && (niz.id === 'izvodenje' || niz.id === 'osA')) { korak = niz.koraci.length - 1; crtajKorak(); $('uputa').innerHTML = '<b>Prekid</b><br>' + esc(PREKID); }
  crtaj();
}
function zero(o) {
  if (st.mach3 !== 'on') return;
  st.G54[o] = mach(o); status('Zero ' + (o === 'A' ? '4' : o) + ': pomak G54 ' + o + ' = ' + dro(st.G54[o]));
  crtaj(); dogadaj('zero' + o);
}
function upisDRO(o, v) {
  if (st.mc) { info('U prikazu Machine Coords vrijednost se ne upisuje — isključi Machine Coords.'); return; }
  st.G54[o] = mach(o) - v; status('DRO ' + o + ' = ' + dro(v) + ' → pomak G54 ' + o + ' = ' + dro(st.G54[o])); crtaj(); dogadaj('dro' + o, { v });
}
function pokreniMach3() {
  if (st.mach3 !== 'off') return;
  st.mach3 = 'ucitava'; st.mach3T = 1.4; crtaj();
}

/* ================================================================== */
/* 11. Izbornik nizova, upute, početna stanja                          */
/* ================================================================== */
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n, i) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="kv">' + (i + 1) + '</span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korak + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k[0]) : 'Odaberi niz u izborniku lijevo.';
  $('pomoc').textContent = k ? k[1] : 'Nizovi se mogu raditi bilo kojim redom; svaki počinje od svojeg stanja stroja.';
  $('dalje').hidden = !(k && k[2] === 'dalje');
  crtajIzbornik(); crtaj();
}
function ukljuceno() { Object.assign(st, { kutija: true, pretv: true, usb: true, mach3: 'on', gljiva: false, reset: false, refd: true, refOff: { X: 0, Y: 0, Z: 0, A: 0 } }); }
function pripremi(id) {
  const ub = st.ubrzanje; pocetno(); st.ubrzanje = ub; st.putCont = { X: 0, Y: 0, Z: 0, A: 0 };
  bezPribora();
  if (id === 'ukljucivanje') { postaviSkripac(); st.fiz = { X: 120.37, Y: 34.21, Z: -18.5, A: 0 }; return; }
  ukljuceno();
  if (id === 'rucno') { postaviSkripac(); st.fiz = { X: 0, Y: 0, Z: 0, A: 0 }; st.G54 = { X: 185, Y: 75, Z: -30, A: 0 }; }
  if (id === 'nultocka') { postaviSkripac(); st.fiz = { X: PL.x0 - R - 15 - XT0, Y: PL.y0 + PL.W / 2 - YT0, Z: PL.top + 10 - st.Ztop, A: 0 }; st.G54 = { X: 0, Y: 0, Z: 0, A: 0 }; st.jogPanel = true; }
  if (id === 'ucitavanje' || id === 'izvodenje') { st.fiz = { X: 0, Y: 0, Z: 0, A: 0 }; }
  if (id === 'osA') {
    postaviValjak(); st.fiz = { X: 40 + LICE - XT0, Y: GEO.A.y - YT0, Z: HA + VALJAK.d / 2 + 6 - st.Ztop, A: 37.5 };
    st.G54 = { X: LICE - XT0, Y: GEO.A.y - YT0, Z: 0, A: 0 }; st.jogPanel = true;
  }
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korak = 0; $('ponovi').hidden = true; $('poruka').textContent = ''; $('blok-obj').hidden = true;
  pripremi(id); st.sbBroj = 0;
  status(st.mach3 === 'on' ? 'Ready' : '');
  crtajPredmet();
  pogled(id === 'ukljucivanje' ? 'stroj' : id === 'osA' ? 'osA' : id === 'nultocka' ? 'obradak' : 'radni');
  crtajKorak();
}

/* ================================================================== */
/* 12. Povezivanje                                                     */
/* ================================================================== */
$('nizovi').addEventListener('click', (e) => { const b = e.target.closest('[data-niz]'); if (b) pokreniNiz(b.dataset.niz); });
$('izbornik').addEventListener('click', () => { niz = null; korak = 0; crtajKorak(); });
$('dalje').addEventListener('click', () => dogadaj('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); else { pripremi('rucno'); $('ponovi').hidden = true; $('poruka').textContent = ''; crtaj(); } });
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('brzina').addEventListener('change', () => { st.ubrzanje = +$('brzina').value; });
/* Mach3 */
$('m3-pokreni').addEventListener('click', pokreniMach3);
document.querySelectorAll('[data-zero]').forEach((b) => b.addEventListener('click', () => zero(b.dataset.zero)));
document.querySelectorAll('[data-dro]').forEach((b) => b.addEventListener('click', () => {
  if (st.mach3 !== 'on' || uredjuje) return;
  const o = b.dataset.dro; uredjuje = o;
  const inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.className = 'm3-unos'; inp.autocomplete = 'off';
  inp.setAttribute('aria-label', 'Nova vrijednost DRO ' + o + ', potvrdi tipkom Enter'); inp.id = 'unos-' + o;
  b.hidden = true; b.after(inp); inp.focus();
  const kraj = (spremi) => { if (uredjuje !== o) return; const v = parseFloat(inp.value.replace(',', '.').replace('−', '-')); uredjuje = null; inp.remove(); b.hidden = false; if (spremi && isFinite(v)) upisDRO(o, v); else crtaj(); if (spremi) b.focus(); };
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); kraj(true); } if (e.key === 'Escape') { e.preventDefault(); kraj(false); } });
  inp.addEventListener('blur', () => kraj(false));
}));
$('m3-mc').addEventListener('click', () => { st.mc = !st.mc; crtaj(); });
$('m3-soft').addEventListener('click', () => { st.soft = !st.soft; status(st.soft ? 'Soft Limits uključeni.' : 'Soft Limits isključeni — os može do graničnika.'); crtaj(); });
$('m3-ref').addEventListener('click', refAll);
$('m3-jogb').addEventListener('click', () => { if (st.mach3 !== 'on') return; st.jogPanel = !st.jogPanel; crtaj(); dogadaj('jogPanel'); });
$('m3-start').addEventListener('click', cycleStart);
$('m3-hold').addEventListener('click', feedHold);
$('m3-stop').addEventListener('click', stop);
$('m3-rewind').addEventListener('click', rewind);
$('m3-single').addEventListener('click', () => { if (!st.prog) { info('Single BLK vrijedi za učitani program.'); return; } st.prog.single = !st.prog.single; if (!st.prog.single) $('blok-obj').hidden = true; crtaj(); });
$('m3-reset').addEventListener('click', resetMach3);
const fro = (v) => { st.fro = Math.max(0, Math.min(250, v)); crtaj(); dogadaj('fro'); };
$('m3-fro-m').addEventListener('click', () => fro(st.fro - 10)); $('m3-fro-p').addEventListener('click', () => fro(st.fro + 10)); $('m3-fro-r').addEventListener('click', () => fro(100));
const sro = (v) => { st.sro = Math.max(50, Math.min(150, v)); crtaj(); };
$('m3-sro-m').addEventListener('click', () => sro(st.sro - 10)); $('m3-sro-p').addEventListener('click', () => sro(st.sro + 10));
$('m3-cw').addEventListener('click', () => {
  const z = zasto(); if (z) { info(z); return; }
  if (st.prog && st.prog.ide) return;
  if (!st.cw && !st.S) postaviS(12000);
  st.cw = !st.cw; if (st.vfd.nacin === 'rucno') info('Pretvarač je u načinu Ručno: Spindle CW u Mach3 ne pokreće vreteno — koristi RUN na pretvaraču.', true);
  crtaj();
});
$('m3-load').addEventListener('click', () => {
  if (st.mach3 !== 'on') return; if (st.prog && st.prog.ide) { info('Program radi — najprije Stop.'); return; }
  $('m3-dlg-l').innerHTML = PROGRAMI.map((n) => { const p = PREDMETI[n] || PRIMJERI_A[n]; const op = PREDMETI[n] ? p.L + ' × ' + p.W + ' × ' + p.H + ' mm' : p.naziv + ', valjak Ø' + p.d; return '<button type="button" class="m3-dat-i" data-dat="' + n + '" aria-pressed="false"><b>' + n + '.tap</b><span>' + esc(op) + '</span></button>'; }).join('');
  $('m3-dlg').hidden = false; st.dlgOdabir = null; const prvi = $('m3-dlg-l').querySelector('button'); if (prvi) prvi.focus();
});
$('m3-dlg-l').addEventListener('click', (e) => { const b = e.target.closest('[data-dat]'); if (!b) return; st.dlgOdabir = b.dataset.dat; $('m3-dlg-l').querySelectorAll('[data-dat]').forEach((q) => q.setAttribute('aria-pressed', String(q === b))); });
$('m3-dlg-l').addEventListener('dblclick', (e) => { const b = e.target.closest('[data-dat]'); if (!b) return; $('m3-dlg').hidden = true; ucitaj(b.dataset.dat); });
$('m3-dlg-open').addEventListener('click', () => { if (!st.dlgOdabir) { info('Označi datoteku u popisu.'); return; } $('m3-dlg').hidden = true; ucitaj(st.dlgOdabir); });
$('m3-dlg-cancel').addEventListener('click', () => { $('m3-dlg').hidden = true; });
$('m3-close').addEventListener('click', () => { if (st.prog && st.prog.ide) return; st.prog = null; status('G-Code closed.'); crtajPredmet(); crtaj(); });
$('m3-kod').addEventListener('wheel', (e) => { const A = st.prog; if (!A || A.ide || A.i > 0) return; e.preventDefault(); st.pregled = Math.max(0, Math.min(A.redci.length - 1, st.pregled + Math.sign(e.deltaY) * 3)); crtajKod(); }, { passive: false });
/* Jog */
document.querySelectorAll('[data-jogn]').forEach((b) => b.addEventListener('click', () => { st.jogNacin = b.dataset.jogn; crtaj(); }));
document.querySelectorAll('[data-jogk]').forEach((b) => b.addEventListener('click', () => { st.jogKorak = +b.dataset.jogk; st.jogNacin = 'step'; crtaj(); }));
$('m3-joga').addEventListener('click', () => { st.jogA = !st.jogA; crtaj(); });
document.querySelectorAll('[data-jog]').forEach((b) => {
  const o = b.dataset.jog[0], s = b.dataset.jog.includes('-') ? -1 : 1;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.focus(); jogStart(o, s); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, jogStop));
  b.addEventListener('click', (e) => { if (e.detail !== 0) return; jogStart(o, s); if (st.jogNacin === 'cont') setTimeout(jogStop, 300); });
});
/* tipkovnica (fokus na upravljanju) */
const TIPKE = { ArrowLeft: ['X', -1], ArrowRight: ['X', 1], ArrowUp: ['Y', 1], ArrowDown: ['Y', -1], PageUp: ['Z', 1], PageDown: ['Z', -1] };
let drziTipku = null;
$('upravljanje').addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Tab' && e.target === $('upravljanje') && st.mach3 === 'on') { st.jogPanel = !st.jogPanel; crtaj(); dogadaj('jogPanel'); return; }
  const t = TIPKE[e.key]; if (!t) return;
  e.preventDefault(); if (e.repeat) return;
  let [o, s] = t; if (st.jogA && o === 'X') o = 'A';
  drziTipku = e.key; jogStart(o, s);
});
$('upravljanje').addEventListener('keyup', (e) => { if (e.key === drziTipku) { drziTipku = null; jogStop(); } });
/* upravljačka kutija i pretvarač */
function power() { st.kutija = !st.kutija; if (!st.kutija && st.mach3 === 'on') { estop('Reset'); status('Kontroler bez napajanja — No device'); } crtaj(); dogadaj('kutija'); }
function gljiva() { st.gljiva = !st.gljiva; if (st.gljiva) estop('gljiva'); else status('E-Stop otpušten — pritisni Reset.'); crtaj(); dogadaj('gljiva'); }
$('k-power').addEventListener('click', power);
$('k-gljiva').addEventListener('click', gljiva);
$('k-usb').addEventListener('click', () => { st.usb = !st.usb; if (!st.usb && st.mach3 === 'on') { estop('Reset'); status('USB: kontroler odspojen — No device'); } else if (st.usb && st.mach3 === 'on') status('USB: kontroler spojen.'); crtaj(); dogadaj('usb'); });
$('v-power').addEventListener('click', () => { st.pretv = !st.pretv; if (!st.pretv) st.vfd.run = false; crtaj(); dogadaj('pretvarac'); });
document.querySelectorAll('[data-vfd]').forEach((b) => b.addEventListener('click', () => { st.vfd.nacin = b.dataset.vfd; st.vfd.run = false; crtaj(); dogadaj('pretvarac'); }));
$('v-pot').addEventListener('input', () => { st.vfd.pot = +$('v-pot').value; crtaj(); });
$('v-run').addEventListener('click', () => { if (!st.pretv) { info('Pretvarač nije uključen.'); return; } if (st.vfd.nacin !== 'rucno') { info('U načinu PC vreteno pokreće Mach3 (M3 ili Spindle CW); RUN na pretvaraču radi u načinu Ručno.'); return; } st.vfd.run = true; crtaj(); });
$('v-stop').addEventListener('click', () => { st.vfd.run = false; crtaj(); });
/* klik u 3D: sklopka i gljiva na kutiji */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2(); let dolje = null;
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('click', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje[0], e.clientY - dolje[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera); const h = ray.intersectObjects([S.klik.sklopka, S.klik.gljiva], false);
  if (h.length) { if (h[0].object === S.klik.sklopka) power(); else gljiva(); }
});

/* ================================================================== */
/* 13. Petlja                                                          */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now(), zadnjiUI = 0, zadnjiEkran = 0, kut = 0, lcdZad = '';
let pauza = false;
function simuliraj(dt, dtr, t) {
  if (st.mach3 === 'ucitava') { st.mach3T -= dtr; if (st.mach3T <= 0) { st.mach3 = 'on'; st.reset = true; if (!st.refd) st.refOff = { ...st.fiz }; status(st.usb ? 'Kontroler spojen (USB). Reset je aktivan.' : 'No device — kontroler nije pronađen (USB).'); crtaj(); dogadaj('mach3'); } }
  if (!st.alarm) { korakRef(dt); korakJog(dt); korakProg(dt); }
  /* vreteno: zalet i zaustavljanje */
  const c = rpmCilj(), ac = 24000 * dt * Math.max(1, st.ubrzanje); st.rpm = st.rpm < c ? Math.min(c, st.rpm + ac) : Math.max(c, st.rpm - ac);
  if (st.rpm > 0) { kut += Math.min(0.9, st.rpm / 24000 * 0.9); S.okreniAlat(kut); }
  if (t - zadnjiUI > 90) { zadnjiUI = t; if (st.jog || st.homing || (st.prog && st.prog.ide) || Math.abs(st.rpm - c) > 1) crtaj(); }
}
function prikazi(t) {
  osvjeziPlocu(); osvjeziValjak();
  S.postaviOsi(st.fiz.X, st.fiz.Y, st.fiz.Z, st.fiz.A);
  S.svjetlo.material.emissive.setHex(st.kutija ? 0x1d9e4b : 0); S.svjetlo.material.color.setHex(st.kutija ? 0x2ecc71 : 0x2a2a2a);
  const lcd = st.pretv ? (st.rpm / 60).toFixed(1) : ''; if (lcd !== lcdZad) { lcdZad = lcd; S.lcdTekst(lcd, st.pretv); }
  S.klik.gljiva.position.z = st.gljiva ? 133 : 138;
  if (t - zadnjiEkran > 400) { zadnjiEkran = t; S.zaslonTekst(st.mach3 === 'on', OSI.map((o) => dro(st.mc ? mach(o) : rad(o)))); }
  controls.update(); renderer.render(scene, camera);
}
function petlja(t) {
  const dtr = (t - zadnje) / 1000, dt = Math.min(0.1, dtr); zadnje = t;
  if (!pauza) { simuliraj(dt, dtr, t); prikazi(t); }
  requestAnimationFrame(petlja);
}
st.putCont = { X: 0, Y: 0, Z: 0, A: 0 };
postaviSkripac();
crtajIzbornik(); crtajKorak(); crtajPredmet(); velicina(); pogled('stroj');
const uc = $('ucitavanje'); if (uc) uc.remove();
/* testna kuka */
window.__3020 = {
  st, NIZOVI, pokreniNiz, dogadaj, ucitaj, cycleStart, papir, obseg,
  get niz() { return niz; }, get korak() { return korak; },
  postavi(p) { Object.assign(st.fiz, p); dogadaj('pomak', p.korak ? { os: p.os, korak: true } : {}); crtaj(); },
  visinaRad(x, y) { return visinaPloce(x + st.G54.X + st.refOff.X + XT0, y + st.G54.Y + st.refOff.Y + YT0); },
  get PL() { return PL; }, get VA() { return VA; }, pogled, pauza(v) { pauza = v; if (v) { zadnjiEkran = 0; prikazi(performance.now()); crtaj(); } else zadnje = performance.now(); },
  /* simulacija bez prikaza (za testove na sporom računalu): n koraka po dt sekundi */
  sim(n, dt = 0.1, doKoraka = 1e9) { for (let i = 0; i < n; i++) { zadnjiUI = 0; simuliraj(dt, dt, 0); if (st.alarm || korak >= doKoraka) break; } crtaj(); return korak; }
};
requestAnimationFrame(petlja);
