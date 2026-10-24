/* FORTRONIQ · Pametna tvornica CP Factory — Simulator linije (cijeli prostor u 3D-u, MES nalozi, tok nosača i paleta, roboti, nizovi s provjerom).
   Model linije: cpf_model.js; jezgra simulacije (MES, trake, stanice, KUKA/Robotino/UR3e): cpf_tok.js; svi podaci linije: cpf_podaci.js.
   Roboti se uvoze iz svojih područja: ../robot-kuka-kr6-r900/, ../mobilni-robot-robotino/, ../kobot-ur3e/.
   Fizika: nepromjenjivi korak 10 ms (100 Hz), neovisan o slikama; iscrtavanje na zahtjev, dok simulacija teče najviše ~15–20 slika/s.
   Prikaz MES-a, HMI-ja i Fleet Managera je naš i pojednostavljen — nije preslika sučelja proizvođača.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KONFIG, MJERE, MES, MATERIJAL, MODULI, UPRAVLJANJE, SCENARIJ, IZVORI, PODRUCJA, nadjiDio, pretpostavke, TEKST_PRETPOSTAVKE } from './cpf_podaci.js';
import { napraviLiniju, napraviPaletu } from './cpf_model.js';
import { napraviSimulaciju, SIM, PROCJENA, TIPOVI_NALOGA, BOJE, NAZIV_RESURSA, brojOp, E_BAT } from './cpf_tok.js';
import { PRIHVATNICE, MJERE as KMJ } from '../robot-kuka-kr6-r900/kuka_podaci.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PI = Math.PI;
const kz = (v, d = 1) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d).replace('.', ',').replace('-', '−'); };
const S3 = (x, y, z = 0) => new THREE.Vector3(x, z, -y);              /* tlocrt linije → scena */
const UI_FPS = 18;

/* ================================================================== */
/* 1. Scena                                                            */
/* ================================================================== */
const scenaEl = $('scena');
const SOFTVERSKI = (() => {
  try { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); const r = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; if (e) g.getExtension('WEBGL_lose_context')?.loseContext(); return /swiftshader|llvmpipe|software/i.test(r); } catch (e) { return false; }
})();
const renderer = new THREE.WebGLRenderer({ antialias: !SOFTVERSKI, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SOFTVERSKI ? 1 : Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = PI * 0.495; controls.minDistance = 0.4; controls.maxDistance = 18;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.35));
{ const d1 = new THREE.DirectionalLight(0xffffff, 1.4); d1.position.set(2.5, 5, 4); scene.add(d1); const d2 = new THREE.DirectionalLight(0xffffff, 0.5); d2.position.set(-3, 2.5, -2); scene.add(d2); const d3 = new THREE.DirectionalLight(0xffffff, 0.35); d3.position.set(0, 1.2, 5); scene.add(d3); }

/* roboti iz svojih područja (ako koje područje nije dostupno, stranica radi s praznim sidrom) */
const [mK, mU, mR] = await Promise.allSettled([import(PODRUCJA.kuka.model), import(PODRUCJA.ur3e.model), import(PODRUCJA.robotino.model)]);
let kuka = null, ur = null, rob = null, stan = null;
try { if (mK.status === 'fulfilled') { kuka = mK.value.napraviKUKA(THREE, { upravljac: false, privjesak: false, kabeli: false, pribor: false, spremiste: false, unutrasnjost: false, snop: false }); kuka.postaviAlat(0); } } catch (e) { console.warn('KUKA', e); kuka = null; }
try { if (mU.status === 'fulfilled') ur = mU.value.napraviUR3e(THREE, { ormar: false, privjesak: false, kabel: false, unutrasnjost: false }); } catch (e) { console.warn('UR3e', e); ur = null; }
try { if (mR.status === 'fulfilled') { rob = mR.value.napraviRobotino(THREE, { stanica: false }); rob.postaviNosac(0, false); stan = mR.value.napraviStanicu(THREE); } } catch (e) { console.warn('Robotino', e); rob = null; }

const L = napraviLiniju(THREE, { robotRass: kuka ? kuka.korijen : null, robotCobot: ur ? ur.korijen : null, alatiRass: false, pod: true, cobot: true, zid: true });
scene.add(L.grupa);
const uzorak = L.grupa.getObjectByName('nosacUzorak'); if (uzorak) uzorak.visible = false;
if (rob) { L.grupa.add(rob.korijen); L.prikljuci('robotino', rob.korijen); rob.tipkalo('plavo'); }
if (stan) { L.grupa.add(stan.grupa); stan.postaviPozu(L.tocke.punjenje.x, L.tocke.punjenje.y, L.tocke.punjenje.phi); L.prikljuci('stanicaPunjenja', stan.grupa); }

/* jezgra simulacije s geometrijom iz modela */
const ASRS = L.moduli.asrs;
const MJ_ALATA = L.moduli.rass.mjestaAlata.map((m) => { const p = m.getWorldPosition(new THREE.Vector3()); return { x: p.x, y: -p.z, z: p.y }; });
const sim = napraviSimulaciju({
  tocke: L.tocke, zaustavljaci: L.zaustavljaci, asrsMjesta: ASRS.mjesta, asrsStoper: { 1: ASRS.pozaStopera(1), 2: ASRS.pozaStopera(2) }, mjestaAlata: MJ_ALATA,
  cobotKutije: L.moduli.cobot ? L.moduli.cobot.kutije.map((k) => { const p = k.getWorldPosition(new THREE.Vector3()); return { x: p.x, y: -p.z }; }) : null
});
const st = () => sim.st;
const LINIJA = sim.LINIJA;

/* ---------- radni komad (kućište, pločica, osigurači) i alati robota */
const matKomad = {};
BOJE.forEach((b) => { const p = napraviPaletu(THREE, { izradak: b }); const iz = p.getObjectByName('izradak'); matKomad[b] = iz ? iz.material : new THREE.MeshStandardMaterial({ color: 0x2a2c2f }); });
const pcbMjere = (String(MATERIJAL.izradak.dijelovi[2].mjere).replace(/,/g, '.').match(/\d+(\.\d+)?/g) || ['100', '55']).map((v) => Number(v) / 1000);
const H_PCB = 0.0016, OSIG = { a: 0.012, b: 0.005, h: 0.015 };
const matPcb = L.M.pcb, matOsig = new THREE.MeshStandardMaterial({ color: 0xd8462e, roughness: 0.35, transparent: true, opacity: 0.88 });
const I = MJERE.izradak;
function napraviKomad() {
  const g = new THREE.Group(); g.name = 'radniKomad';
  const kuc = new THREE.Mesh(new THREE.BoxGeometry(I.duljina, I.visina, I.sirina), matKomad[BOJE[0]]); kuc.position.y = I.visina / 2; kuc.name = 'kuciste'; g.add(kuc);
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(pcbMjere[0], H_PCB, pcbMjere[1]), matPcb); pcb.position.y = I.visina + H_PCB / 2; pcb.name = 'pcb'; g.add(pcb);
  for (const dx of [-0.025, 0.025]) { const o = new THREE.Mesh(new THREE.BoxGeometry(OSIG.a, OSIG.h * 0.4, OSIG.b), matOsig); o.position.set(dx, I.visina + H_PCB + OSIG.h * 0.2, 0); o.name = 'osig'; g.add(o); }
  g.visible = false; return g;
}
const komad = napraviKomad(); scene.add(komad);
const tcpG = new THREE.Group(); tcpG.name = 'tcpSim';
const BAZA_DIJELA = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0));   /* dio: X → os y alata, Y → −z alata */
const pcbT = new THREE.Mesh(new THREE.BoxGeometry(pcbMjere[0], H_PCB, pcbMjere[1]), matPcb); pcbT.visible = false;
const osigT = new THREE.Mesh(new THREE.BoxGeometry(OSIG.a, OSIG.h, OSIG.b), matOsig); osigT.visible = false;
const drzac = new THREE.Group(); drzac.matrixAutoUpdate = false; drzac.matrix.copy(BAZA_DIJELA); tcpG.add(drzac); drzac.add(pcbT, osigT);
if (kuka) kuka.flange.add(tcpG);
/* pločice u kutiji PCB: sakrij spojene pločice modela i prikaži svoje (broj prema stanju kutije) */
const kutija = L.moduli.rass.kutija;
kutija.traverse((o) => { if (o.isMesh && o.material === L.M.pcb) o.visible = false; });
const slotPcb = sim.GEO.slotovi.map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(pcbMjere[1], H_PCB, pcbMjere[0]), matPcb); m.position.copy(S3(s.x, s.y, s.z - H_PCB / 2)); scene.add(m); return m; });
/* LED kamere i handshake BRANCH-a (vlastiti materijali da se mogu paliti) */
const ledKamere = []; (L.dijelovi.get('rassKamera')?.objekti || []).forEach((o) => o.traverse((m) => { if (m.isMesh && m.material === L.M.ledB) { m.material = m.material.clone(); ledKamere.push(m); } }));
const hsSvjetla = L.moduli.branch.handshake.svjetla.map((m) => { m.material = m.material.clone(); m.userData.e0 = m.material.emissiveIntensity || 1.6; return m; });
const HF = KMJ.izmjenjivac.visinaFiksni;
/* zatamnjena stakla kućišta i vrata: u simulatoru prozirnija, da se vide portal ASRS-a i unutrašnjost */
['dim', 'dimS', 'stakloA'].forEach((k) => { const m = L.M[k]; if (m) { m.opacity = Math.min(m.opacity, 0.3); m.needsUpdate = true; } });

/* ================================================================== */
/* 2. Kamere                                                           */
/* ================================================================== */
const Rp = KONFIG.raspored;
const POGLEDI = {
  linija: { p: [0.75, -7.5, 4.1], c: [1.0, -1.05, 0.5] },
  asrs: { p: [3.95, -1.05, 2.15], c: [2.95, 0.35, 1.2] },
  rass: { p: [1.75, -0.2, 2.4], c: [0.5, 1.0, 0.9] },
  branch: { p: [2.6, -1.95, 1.75], c: [1.85, -0.3, 0.88] },
  cobot: { p: [Rp.cobot.x + 0.9, Rp.cobot.y - 1.55, 1.75], c: [Rp.cobot.x, Rp.cobot.y, 0.85] },
  odozgo: { p: [1.2, -0.95, 9.6], c: [1.2, -0.95, 0], up: [0, 1, 0] }
};
const ui = { rucno: false, pogled: 'linija', prati: false, brzina: 1, pauza: false, odabrano: null, odabranoSkupina: null, otvoreni: new Set(), filtar: 'sve', prljavo: true };
function pogled(ime) {
  const v = POGLEDI[ime]; if (!v) return;
  ui.pogled = ime;
  camera.up.copy(v.up ? S3(...v.up).normalize() : new THREE.Vector3(0, 1, 0));
  camera.position.copy(S3(...v.p)); controls.target.copy(S3(...v.c)); camera.lookAt(controls.target); controls.update();
  document.querySelectorAll('#pogledi [data-pogled]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pogled === ime)));
  ui.prljavo = true; provjeriKorak();
}

/* ================================================================== */
/* 3. Stanje simulacije → 3D                                           */
/* ================================================================== */
const vizN = new Map();
let zadnjiQ = null, zadnjiUR = null, verzijaPolica = -1, kljucH = '', kljucSig = '';
function postavi3D() {
  const S = st();
  /* nosači */
  const ziv = new Set();
  for (const c of S.nosaci) {
    ziv.add(c.id);
    const sd = c.sadrzaj || {};
    const g = L.postaviNosac(c.id, 0, 'petlja', { paleta: !!sd.paleta, izradak: sd.paleta ? sd.izradak || null : null, pcb: !!(sd.paleta && sd.izradak && sd.pcb) });
    const q = sim.pozaNosaca(c);
    g.position.set(q.x, q.z, -q.y); g.rotation.y = q.kut; g.visible = true;
    let v = vizN.get(c.id); if (!v || v.g !== g) { v = { g, osig: null }; vizN.set(c.id, v); }
    const n = sd.paleta && sd.izradak ? sd.osiguraci || 0 : 0;
    if (v.osigN !== n) {
      if (v.osig) g.remove(v.osig);
      v.osig = null; v.osigN = n;
      if (n > 0) { const og = new THREE.Group(); for (let i = 0; i < n; i++) { const o = new THREE.Mesh(new THREE.BoxGeometry(OSIG.a, OSIG.h * 0.4, OSIG.b), matOsig); o.position.set(i ? 0.025 : -0.025, MJERE.nosac.visina + MJERE.paleta.visina + 0.001 + I.visina + H_PCB + OSIG.h * 0.2, 0); og.add(o); } g.add(og); v.osig = og; }
    }
  }
  for (const id of [...vizN.keys()]) if (!ziv.has(id)) { L.ukloniNosac(id); vizN.delete(id); }
  /* zaustavljači, skretnica, trake */
  Object.values(S.zaust).forEach((z) => { if (!z.virtualni) L.zaustavljac(z.id, z.gore); });
  L.skretnica(S.skretnica);
  L.azuriraj(S.tTrake, SIM.vTrake);
  /* ASRS */
  const A = S.asrs;
  ASRS.postaviOsi(A.x, A.z, A.y, A.c); ASRS.hvataljka(A.otvorena);
  const kh = A.paletaH ? 'p' + (A.paletaH.izradak || '-') : '';
  if (kh !== kljucH) { kljucH = kh; ASRS.paletaUHvataljci(!!A.paletaH, { izradak: A.paletaH ? A.paletaH.izradak || null : null }); }
  if (A.verzija !== verzijaPolica) { verzijaPolica = A.verzija; A.police.forEach((p, i) => ASRS.postaviPaletu(i + 1, p ? (p.izradak ? { izradak: p.izradak } : {}) : null)); }
  /* KUKA */
  const K = S.kuka;
  if (kuka) {
    const qs = K.q.join(','); if (qs !== zadnjiQ) { zadnjiQ = qs; kuka.postavi(K.q); }
    kuka.alati.forEach((t, k) => {
      const naRobotu = K.alat === k + 1, mj = L.moduli.rass.mjestaAlata[k];
      if (naRobotu && t.parent !== kuka.flange) { kuka.flange.add(t); t.position.set(0, 0, HF); t.rotation.set(0, 0, 0); }
      else if (!naRobotu && mj && t.parent !== mj) { mj.add(t); t.position.set(0, 0, 0); t.rotation.set(PI / 2, 0, 0); }
      if (t.userData.otvori) t.userData.otvori(naRobotu ? K.prsti : 1);
    });
    tcpG.position.set(0, 0, K.alat ? PRIHVATNICE[K.alat - 1].tcp.z : 0);
  }
  /* radni komad */
  const R2 = S.rass, kuc = komad.getObjectByName('kuciste');
  if (R2.boja && matKomad[R2.boja]) kuc.material = matKomad[R2.boja];
  komad.getObjectByName('pcb').visible = R2.pcb === 'kuciste';
  komad.children.filter((o) => o.name === 'osig').forEach((o, i) => { o.visible = i < R2.osig; });
  if (R2.kuciste === 'tcp' && kuka) {
    if (komad.parent !== drzac) drzac.add(komad);
    komad.position.set(0, -I.visina / 2, 0); komad.rotation.set(0, 0, 0); komad.visible = true;
  } else if (R2.kuciste === 'naprava') {
    if (komad.parent !== scene) scene.add(komad);
    const N = sim.GEO.naprava; komad.position.copy(S3(N.x, N.y, N.z)); komad.rotation.set(0, 0, 0); komad.visible = true;
  } else komad.visible = false;
  pcbT.visible = R2.pcb === 'tcp'; pcbT.position.set(0, -H_PCB / 2, 0);
  osigT.visible = !!R2.osigTcp; osigT.position.set(0, -OSIG.h / 2, 0);
  slotPcb.forEach((m, i) => { m.visible = i >= SIM.kutijaPCB - R2.kutijaPCB && !(R2.pcb === 'tcp' && i === R2.slot); });
  ledKamere.forEach((m) => { m.material.emissiveIntensity = R2.kamera ? 3.2 : 0.25; });
  /* BRANCH handshake */
  const r = S.rob;
  if (hsSvjetla[0]) hsSvjetla[0].material.emissiveIntensity = r.q35 ? hsSvjetla[0].userData.e0 * 1.6 : 0.05;
  if (hsSvjetla[1]) hsSvjetla[1].material.emissiveIntensity = r.i35 ? 1.4 : 0.05;
  /* Robotino */
  if (rob) {
    rob.postaviPozu(r.x, r.y, r.phi); rob.postaviKotace(r.kotaci); rob.trake(r.traka);
    const sig = robSvjetla(); const ks = JSON.stringify(sig); if (ks !== kljucSig) { kljucSig = ks; rob.signalniStup(sig); }
  }
  /* UR3e */
  if (ur) { const qs = S.ur.q.join(','); if (qs !== zadnjiUR) { zadnjiUR = qs; ur.postavi(S.ur.q); } }
  /* praćenje nosača */
  if (ui.prati) {
    const c = aktivniNosac();
    if (c) { const q = sim.pozaNosaca(c); const cilj = S3(q.x, q.y, q.z); const d = cilj.clone().sub(controls.target); if (d.length() > 2e-3) { d.multiplyScalar(0.35); controls.target.add(d); camera.position.add(d); } }
  }
}
function robSvjetla() { const r = st().rob; const giba = Math.hypot(r.vx, r.vy) > 0.005 || Math.abs(r.w) > 0.01 || /preuzima|predaje|handshake/.test(r.stanje); return { crvena: r.bat < SIM.robotino.prag ? 1 : 0, narancasta: giba ? 1 : 0, zelena: 1 }; }
function aktivniNosac() {
  const S = st(); const akt = S.nalozi.filter((n) => n.stanje === 'u radu' && n.nosac != null);
  const n = akt[akt.length - 1]; if (!n) return null;
  return S.nosaci.find((c) => c.cid === n.nosac) || null;
}

/* odabir dijela mišem: naziv dijela iz cpf_podaci */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
let dolje = null;
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dolje || Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y) > 5) return;
  const b = renderer.domElement.getBoundingClientRect();
  mis.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const pog = ray.intersectObject(L.grupa, true).find((h) => h.object.visible && h.object.isMesh && !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.3) && !h.object.userData.bezDuha);
  let o = pog && pog.object, d = null, nosac = null;
  while (o) { if (o.userData.nosac && !nosac) nosac = o.userData.nosac; if (o.userData.nosacId && !nosac) nosac = o.userData.nosacId; if (o.userData.dio && nadjiDio(o.userData.dio)) { d = nadjiDio(o.userData.dio); break; } o = o.parent; }
  const el = $('sc-oznaka');
  if (nosac) { const c = st().nosaci.find((x) => x.id === nosac); el.textContent = 'Nosač ' + (c ? c.cid : '') + (c && c.rfid ? ' · RFID: ONo ' + c.rfid.ono + ', sljedeći resurs ' + (c.rfid.resurs ?? '—') + ', OpNo ' + c.rfid.op : ' · prazan') + (c && c.sadrzaj.paleta ? ' · s paletom' : ''); el.classList.add('vid'); ui.odabrano = 'nosac'; ui.odabranoSkupina = 'Linija'; }
  else if (d) { el.textContent = d.naziv + ' — ' + d.skupina; el.classList.add('vid'); ui.odabrano = d.id; ui.odabranoSkupina = d.skupina; }
  else { el.classList.remove('vid'); ui.odabrano = null; ui.odabranoSkupina = null; }
  ui.prljavo = true; provjeriKorak();
});

/* ================================================================== */
/* 4. Ploče stanica                                                    */
/* ================================================================== */
const MODULI_PLOCE = [...LINIJA, 'cobot'];
function crtajStanice() {
  $('stanice').innerHTML = MODULI_PLOCE.map((k) => {
    const m = st().moduli[k], lin = LINIJA.includes(k);
    const nac = lin ? '<label>Način <select data-a="nacin" data-m="' + k + '" aria-label="Način rada ' + esc(m.naziv) + '"><option value="mes">Automatic — MES</option><option value="default">Automatic — Default</option></select></label>' : '<span>samostalni modul</span>';
    const dod = k === 'rass' ? '<button type="button" class="st-t siroki" data-a="box" data-m="rass" title="Nova kutija PCB (stražnji otvor, tipka Box change)">Box change</button>'
      : k === 'cobot' ? '<button type="button" class="st-t siroki" data-a="demo" data-m="cobot" aria-pressed="false">Demo kobota</button>' : '';
    return '<div class="st-k" data-m="' + k + '"><div class="st-h"><b>' + esc(m.naziv) + '</b><span class="st-oz">' + esc(m.oznaka) + '</span></div>'
      + '<div class="st-meta">' + esc(m.nazivHr) + (m.resurs != null ? ' · Resource ID ' + m.resurs : '') + (m.konektor ? ' · lanac ' + m.konektor : ' · izvan lanca linije') + '</div>'
      + '<div class="st-r"><div class="sl-stup" aria-hidden="true"><i class="s-cr"></i><i class="s-na"></i><i class="s-ze"></i></div><div class="st-hmi" aria-label="HMI ' + esc(m.naziv) + '"><span></span><span></span><span></span></div></div>'
      + '<div class="st-p"><span class="chip">—</span>' + nac + '</div>'
      + '<div class="st-b"><button type="button" class="gljiva" data-a="gljiva" data-m="' + k + '" aria-pressed="false" aria-label="Nužni stop ' + esc(m.naziv) + '">STOP</button>'
      + '<button type="button" class="st-t reset" data-a="reset" data-m="' + k + '" aria-label="Reset ' + esc(m.naziv) + '"><i></i>Reset</button><button type="button" class="st-t start" data-a="start" data-m="' + k + '" aria-label="Start ' + esc(m.naziv) + '"><i></i>Start</button>' + dod + '</div>'
      + (k === 'rass' ? '<p class="pom" data-kutija></p>' : '') + '</div>';
  }).join('');
  $('st-legenda').textContent = 'Svjetla na pločama (konvencija simulatora): zeleno = automatski rad (treperi dok stanica radi operaciju), narančasto = čeka Start ili Reset, crveno = nužni stop ili greška. Lanac nužnog stopa: ' + UPRAVLJANJE.sigurnosniLanac.redoslijed.map((r) => NAZIV_RESURSA[r.modul] + ' ' + r.konektor).join(' – ') + '.';
}
const CHIP = { rad: ['miruje', 'rad'], cekaStart: ['čeka Start', 'ceka'], reset: ['Reset…', 'reset'], cekaReset: ['čeka Reset', 'ceka'], estop: ['nužni stop', 'estop'], greska: ['greška', 'greska'] };
function svjetlaModula(m) {
  switch (m.stanje) {
    case 'rad': return { ze: m.zauzet > 0 || (m.kljuc === 'cobot' && st().ur.demo) ? 't' : 1 };
    case 'cekaStart': return { na: 1 }; case 'reset': return { na: 't' }; case 'cekaReset': return { cr: 1, na: 1 };
    case 'estop': return { cr: 1 }; case 'greska': return { cr: 't' }; default: return {};
  }
}
function osvjeziStanice() {
  document.querySelectorAll('#stanice .st-k').forEach((el) => {
    const m = st().moduli[el.dataset.m]; if (!m) return;
    const [txt, cls] = m.stanje === 'rad' && (m.zauzet > 0 || (m.kljuc === 'cobot' && st().ur.demo)) ? ['zauzet', 'zauzet'] : CHIP[m.stanje] || ['—', ''];
    const ch = el.querySelector('.chip'); ch.textContent = txt + (m.nacin === 'default' ? ' · Default' : ''); ch.className = 'chip ' + cls;
    const sv = svjetlaModula(m);
    [['s-cr', sv.cr], ['s-na', sv.na], ['s-ze', sv.ze]].forEach(([c, v]) => { const i = el.querySelector('.' + c); i.classList.toggle('on', !!v); i.classList.toggle('treperi', v === 't'); });
    el.querySelectorAll('.st-hmi span').forEach((s, i) => { if (s.textContent !== (m.hmi[i] || '')) s.textContent = m.hmi[i] || ''; });
    el.querySelector('[data-a="gljiva"]').setAttribute('aria-pressed', String(!!m.gljiva));
    el.querySelector('[data-a="reset"]').classList.toggle('ceka', m.stanje === 'cekaReset' || (m.stanje === 'greska' && !(m.kljuc === 'rass' && st().rass.cekaKutiju)));
    el.querySelector('[data-a="start"]').classList.toggle('ceka', m.stanje === 'cekaStart');
    el.classList.toggle('estop', m.stanje === 'estop');
    const se = el.querySelector('select[data-a="nacin"]'); if (se && se.value !== m.nacin && document.activeElement !== se) se.value = m.nacin;
    const kt = el.querySelector('[data-kutija]'); if (kt) kt.textContent = 'Kutija PCB (PNo ' + MATERIJAL.kutijaPCB.mesPNo + '): ' + st().rass.kutijaPCB + ' / ' + SIM.kutijaPCB + ' pločica · alat na robotu: ' + (st().kuka.alat ? PRIHVATNICE[st().kuka.alat - 1].oznaka : 'nema') + (st().kuka.korak ? ' · ' + st().kuka.gibanje + ': ' + st().kuka.korak : '');
    const dm = el.querySelector('[data-a="demo"]'); if (dm) dm.setAttribute('aria-pressed', String(st().ur.demo));
  });
}
$('stanice').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'SELECT') return;
  const k = b.dataset.m;
  if (b.dataset.a === 'gljiva') sim.gljiva(k);
  else if (b.dataset.a === 'reset') { if (!sim.reset(k)) info(st().moduli[k].gljiva || LINIJA.some((j) => LINIJA.includes(k) && st().moduli[j].gljiva) ? 'Reset ne prolazi dok je gljiva pritisnuta.' : 'Reset nije potreban u ovom stanju.'); }
  else if (b.dataset.a === 'start') { if (!sim.start(k)) info('Start radi tek kad stanica čeka Start (nakon Reseta).'); }
  else if (b.dataset.a === 'box') sim.boxChange();
  else if (b.dataset.a === 'demo') sim.cobotDemo(!st().ur.demo);
  osvjeziStanice(); provjeriKorak(); ui.prljavo = true;
});
$('stanice').addEventListener('change', (e) => { const s = e.target.closest('select[data-a="nacin"]'); if (s) { sim.nacin(s.dataset.m, s.value); provjeriKorak(); } });
$('s-reset').addEventListener('click', () => { if (!sim.resetSve()) info(LINIJA.some((j) => st().moduli[j].gljiva) ? 'Reset ne prolazi dok je gljiva pritisnuta.' : 'Nijedna stanica ne čeka Reset.'); osvjeziStanice(); provjeriKorak(); });
$('s-start').addEventListener('click', () => { if (!sim.startSve()) info('Nijedna stanica ne čeka Start.'); osvjeziStanice(); provjeriKorak(); });

/* ================================================================== */
/* 5. MES                                                              */
/* ================================================================== */
const STANJE_POZ = { 'čeka': 'čeka', radi: 'radi', gotovo: 'gotovo' };
function opHtml(op) { const b = brojOp(op); return b.nedostaje ? '<span class="nd" tabindex="0" title="' + esc(b.napomena) + '" aria-label="broj operacije nedostaje">—</span>' : esc(b.tekst); }
function crtajFormu() {
  $('m-tip').innerHTML = TIPOVI_NALOGA.map((t) => '<option value="' + t.id + '">' + esc(t.naziv) + '</option>').join('');
  osvjeziZalihu();
  const opis = () => { const t = TIPOVI_NALOGA.find((x) => x.id === $('m-tip').value); $('m-opis').textContent = t ? 'Plan rada: ' + t.plan.map((o) => NAZIV_RESURSA[o.resurs] + ' ' + brojOp(o).tekst).join(' → ') + ' (' + t.opis + ').' : ''; const kr = t && t.id === 'krug'; $('m-osig').disabled = kr; };
  $('m-tip').addEventListener('change', opis); opis();
}
function osvjeziZalihu() {
  const z = sim.zaliha(), sel = $('m-boja'), v = sel.value;
  sel.innerHTML = BOJE.map((b) => '<option value="' + b + '">' + b + ' (' + (z.boje[b] || 0) + ')</option>').join('');
  if (v) sel.value = v;
  $('zaliha').textContent = 'Skladište ASRS32: palete s kućištem ' + BOJE.map((b) => b + ' ' + (z.boje[b] || 0)).join(' · ') + '; prazne palete ' + z.prazne + '; slobodna mjesta ' + z.slobodno + ' (od 32).';
}
$('m-posalji').addEventListener('click', () => {
  const n = sim.posaljiNalog({ tip: $('m-tip').value, boja: $('m-boja').value, osiguraci: +$('m-osig').value });
  ui.otvoreni.add(n.ono); info('Nalog ONo ' + n.ono + ' poslan (SetNewOrder).'); crtajNaloge(); provjeriKorak();
});
function crtajNaloge() {
  const S = st();
  const lista = S.nalozi.slice().reverse().slice(0, 10);
  $('nalozi').innerHTML = lista.length ? lista.map((n) => {
    const cls = n.stanje === 'gotov' ? 'gotov' : n.stanje === 'u radu' ? 'u-radu' : 'ceka';
    const tek = sim.tekuca(n);
    const otv = ui.otvoreni.has(n.ono) || (n.stanje !== 'gotov' && !ui.otvoreni.has(-n.ono));
    const red = n.pozicije.map((p) => {
      const tr = p.t1 != null ? kz(p.t1 - p.t0, 1) + ' s' : p.t0 != null ? 'od ' + kz(p.t0, 1) + ' s' : '';
      return '<tr class="' + (p.stanje === 'radi' ? 'radi' : p.stanje === 'gotovo' ? 'gotovo' : '') + '"><td>' + p.opos + '</td><td>' + esc(NAZIV_RESURSA[p.resurs]) + ' (' + (MES.resursi[p.resurs] ?? '—') + ')</td><td>' + opHtml(p.op) + '</td><td>' + esc(p.op.naziv) + '</td><td>' + esc(STANJE_POZ[p.stanje] || p.stanje) + (tr ? ' · ' + tr : '') + '</td></tr>';
    }).join('');
    const pod = 'Kućište ' + esc(n.boja) + (n.tip !== 'krug' ? ', osigurača ' + n.osiguraci : '') + ' · nosač (CarrierID) ' + (n.nosac ?? '—') + ' · polica ' + (n.polica ?? '—') + ' → ' + (n.policaSpremanja ?? '—') + (n.t1 != null ? ' · ukupno ' + kz(n.t1 - n.t0, 1) + ' s' : '');
    return '<details class="nalog" data-ono="' + n.ono + '"' + (otv ? ' open' : '') + '><summary><b>ONo ' + n.ono + '</b><span>' + esc(n.naziv) + '</span><span class="st ' + cls + '">' + esc(n.stanje) + (tek && n.stanje !== 'gotov' ? ' · OPos ' + tek.opos + '/' + n.pozicije.length : '') + '</span></summary>'
      + '<div class="omot-t"><table class="t-plan"><thead><tr><th>OPos</th><th>Resurs (ID)</th><th>OpNo</th><th>Operacija</th><th>Stanje</th></tr></thead><tbody>' + red + '</tbody></table></div><p class="pom" style="margin:4px 9px 7px">' + pod + '</p></details>';
  }).join('') : '<p class="pom">Još nema naloga. Odaberi vrstu naloga i klikni „Pošalji nalog”.</p>';
  const akt = S.nalozi.filter((n) => n.stanje !== 'gotov').length;
  $('mes-st').textContent = 'otvorenih naloga: ' + akt + ' · završenih: ' + (S.nalozi.length - akt);
  osvjeziZalihu();
}
$('nalozi').addEventListener('toggle', (e) => { const d = e.target.closest && e.target.closest('details[data-ono]'); if (!d) return; const o = +d.dataset.ono; if (d.open) { ui.otvoreni.add(o); ui.otvoreni.delete(-o); } else { ui.otvoreni.delete(o); ui.otvoreni.add(-o); } }, true);

/* ================================================================== */
/* 6. Robotino i dnevnik                                               */
/* ================================================================== */
function crtajRobotino() {
  $('robotino').innerHTML = '<div class="rb-k"><div class="sl-stup" aria-hidden="true" id="r-stup"><i class="s-cr"></i><i class="s-na"></i><i class="s-ze"></i></div><div style="flex:1;min-width:180px"><div class="st-hmi"><span id="r-st"></span><span id="r-poza"></span><span id="r-dod"></span></div>'
    + '<div class="bat" aria-label="Baterija"><b><i id="r-bat"></i></b><span id="r-bat-t">—</span><small class="pom">prag ' + Math.round(SIM.robotino.prag * 100) + ' %</small></div></div></div>'
    + '<table class="kin-t" aria-label="Svesmjerni pogon: brzine motora i robota"><thead><tr><th>Motor</th><th>n (1/min)</th><th></th></tr></thead><tbody>'
    + [1, 2, 3].map((i) => '<tr><td>M' + i + '</td><td id="r-m' + i + '">0</td><td><span class="kin-bar"><i id="r-b' + i + '"></i></span></td></tr>').join('')
    + '</tbody></table><p class="rb-sig" id="r-v"></p><p class="rb-sig">Docking-Kit BRANCH-a: <span class="led" id="r-q35"></span> Q3.5 signal Robotinu &nbsp; <span class="led cr" id="r-i35"></span> I3.5 Robotino detektiran</p>';
}
function osvjeziRobotino() {
  const r = st().rob, sv = robSvjetla();
  $('r-st').textContent = r.stanje; $('r-poza').textContent = 'x ' + kz(r.x, 2) + ' m · y ' + kz(r.y, 2) + ' m · φ ' + kz(r.phi * 180 / PI, 0) + '°';
  $('r-dod').textContent = r.nosac ? 'nosač ' + (st().nosaci.find((c) => c.id === r.nosac) || {}).cid + ' na prihvatu' : (r.naStanici ? 'kontakt sa stanicom' : 'prihvat prazan');
  $('r-bat').style.width = Math.round(r.bat * 100) + '%'; $('r-bat').classList.toggle('nisko', r.bat < SIM.robotino.prag); $('r-bat-t').textContent = kz(r.bat * 100, 1) + ' %';
  const nM = 3600;
  for (let i = 0; i < 3; i++) { $('r-m' + (i + 1)).textContent = kz(r.m[i], 0); const p = Math.max(-1, Math.min(1, r.m[i] / nM)); const b = $('r-b' + (i + 1)); b.style.left = (p < 0 ? 50 + p * 50 : 50) + '%'; b.style.width = Math.abs(p) * 50 + '%'; }
  $('r-v').textContent = 'vx ' + kz(r.vx, 2) + ' m/s · vy ' + kz(r.vy, 2) + ' m/s · ω ' + kz(r.w, 2) + ' rad/s (KS robota) · prijeđeno ' + kz(r.put, 1) + ' m';
  $('r-q35').classList.toggle('on', r.q35); $('r-i35').classList.toggle('on', r.i35);
  const s = $('r-stup'); [['s-cr', sv.crvena], ['s-na', sv.narancasta], ['s-ze', sv.zelena]].forEach(([c, v]) => s.querySelector('.' + c).classList.toggle('on', !!v));
}
const FILTAR = { sve: () => true, mes: (l) => l.vrsta === 'mes' || l.vrsta === 'op', rfid: (l) => l.vrsta === 'rfid', rob: (l) => l.vrsta === 'rob', sig: (l) => l.vrsta === 'sig' || l.vrsta === 'greska' };
let verzijaLoga = -1;
function crtajLog() {
  const S = st(); if (S.verzijaLoga === verzijaLoga) return; verzijaLoga = S.verzijaLoga;
  const f = FILTAR[ui.filtar] || FILTAR.sve;
  $('dnevnik').innerHTML = S.log.filter(f).slice(-70).reverse().map((l) => '<li class="v-' + l.vrsta + '"><time>' + kz(l.t, 1) + ' s</time><b>' + esc(l.izvor) + '</b>' + esc(l.tekst) + '</li>').join('');
}
$('log-filtar').addEventListener('change', () => { ui.filtar = $('log-filtar').value; verzijaLoga = -1; crtajLog(); });
function info(t) { $('poruka').textContent = t || ''; }

/* ================================================================== */
/* 7. Nizovi s automatskom provjerom                                   */
/* ================================================================== */
const OPS = MES.operacije.filter((o) => o.opNo != null);
const LINIJA_RADI = () => LINIJA.every((k) => st().moduli[k].stanje === 'rad');
const tipNaloga = (id) => TIPOVI_NALOGA.find((t) => t.id === id).naziv;
const ZAD = TIPOVI_NALOGA[0];
let niz = null, korakNiza = 0, ref = {}, refBat = 0;
const br = (e) => (st().brojac[e] || 0) - (ref[e] || 0);
const NIZOVI = [
  { id: 'upoznaj', naziv: 'Upoznaj liniju i stanja modula', opis: 'raspored prostora, dijelovi u 3D-u, stanja i načini rada stanica, Start linije, Resource ID.', koraci: [
    { u: 'Odaberi pogled „Odozgo” (gumbi iznad 3D prikaza) i pogledaj raspored: RASS – BRANCH – ASRS32 u liniji, CP-COBOT-M lijevo sprijeda, Robotino na stanici za punjenje uz desni zid, MES računalo.', p: 'Raspored prostora je procjena iz fotografija (pretpostavka u podacima). Linija se proteže od RASS-a (lijevo, x = 0) do ASRS-a (desno); BRANCH je okrenut za 180°, pa mu je krak grananja sprijeda, prema Robotinu.', ok: () => ui.pogled === 'odozgo' },
    { u: 'Klikni u 3D prikazu na bilo koji dio regalnog skladišta ASRS32 — oznaka gore lijevo pokazuje naziv dijela.', p: 'Klik na nosač pokazuje i što piše na njegovom RFID-u. Stakla ćelija i kućišta se preskaču, pa se može kliknuti i na dijelove iza njih.', ok: () => ui.odabranoSkupina === 'ASRS32' },
    { u: 'Stanice linije čekaju Start (narančasto svjetlo, „čeka Start”). Pritisni Start na svakoj stanici linije ili „Start linije”.', p: 'Nakon uključivanja i Reseta stanica je u početnom stanju; tek tipka Start pokreće automatski rad. CP-COBOT-M je samostalan modul i ne pripada lancu linije.', ok: LINIJA_RADI },
    { u: 'Prebaci ASRS32 u način „Automatic — Default” (izbornik na kartici stanice).', p: UPRAVLJANJE.nacini.map((n) => n.naziv + ': ' + n.opis).join('; ') + '.', ok: () => st().moduli.asrs.nacin === 'default' },
    { u: 'U Defaultu stanica radi po vlastitoj tablici prijelaza (state code i parametri na RFID-u), a MES joj ne dodjeljuje operacije — nalog bi stao. Vrati ASRS32 u način „Automatic — MES”.', p: MES.defaultParametri, ok: () => st().moduli.asrs.nacin === 'mes' },
    { u: 'Kojim brojem resursa (Resource ID) MES prepoznaje regalno skladište ASRS32 u ovom simulatoru?', p: 'Resource ID se postavlja na HMI-ju stanice (System → MES IP and resource settings); ovdje su brojevi pretpostavka koju treba uskladiti s MES4 u laboratoriju. Vidi metapodatke na kartici stanice.', k: 'izbor', izbor: { opcije: Object.entries(MES.resursi).map(([k, v]) => 'Resource ID ' + v + ' (' + NAZIV_RESURSA[k] + ')'), tocno: Object.keys(MES.resursi).indexOf('asrs') }, ok: () => false },
    { u: 'Kraj niza „Upoznaj liniju i stanja modula”. Odaberi sljedeći niz.', p: 'U slobodnom radu možeš slati naloge, mijenjati način rada i brzinu simulacije.', k: 'kraj', ok: () => false }] },
  { id: 'izdavanje', naziv: 'Izdavanje palete iz skladišta (212)', opis: 'nalog u MES-u, prazan nosač na zaustavljaču 1, upit MES-u, ciklus portala: X/Z, Y, hvatanje, C.', koraci: [
    { u: 'U kartici „MES — nalozi” odaberi „' + ZAD.naziv + '”, boju kućišta i broj osigurača, pa klikni „Pošalji nalog”.', p: MES.tokNaloga[0] + ' Plan rada ovog naloga: ' + ZAD.plan.map((o) => NAZIV_RESURSA[o.resurs] + ' ' + brojOp(o).tekst).join(' → ') + '.', ok: () => br('nalog') > 0 },
    { u: 'Prazan nosač dolazi na zaustavljač 1 (prednja traka ASRS-a). PLC čita RFID i pita MES ima li operaciju — prati Dnevnik. Pričekaj OpStart operacije 212.', p: MES.tokNaloga[1] + ' ' + MES.tokNaloga[2] + ' Prazni nosači staju na svakom zaustavljaču, ali obradu dobivaju samo kad MES tako odluči.', ok: () => br('opStart:212') > 0 },
    { u: 'Portal izdaje paletu: os C se okreće prema regalu, X i Z voze do police, Y izlazi, prihvatnica hvata, Y se vraća, C se okreće prema traci i paleta se spušta na nosač. Pričekaj OpEnd.', p: 'Osi X i Z su servo-osi, Y i C pneumatske (hod Y ' + Math.round(MJERE.asrs.os.yHod * 1000) + ' mm, C 0°/180°). Mjesta 1–16 su u prednjem regalu, 17–32 u stražnjem. Brzine osi nisu objavljene (pretpostavke).', ok: () => br('opEnd:212') > 0 },
    { u: 'Koji servis PLC šalje MES-u kad nosač stane na zaustavljač i stanica treba provjeriti ima li za njega operaciju?', p: 'Servisi MES4 (kodovi iz dokumentacije sučelja): ' + MES.servisi.map((s) => s.naziv + ' ' + s.kod).join(', ') + '.', k: 'izbor', izbor: { opcije: MES.servisi.map((s) => s.naziv), tocno: MES.servisi.findIndex((s) => s.naziv === 'GetOpForONoOPos') }, ok: () => false },
    { u: 'Kraj niza „Izdavanje palete iz skladišta”.', p: 'Nalog teče dalje: niz „Put nosača i RFID” prati nosač prema RASS-u.', k: 'kraj', ok: () => false }] },
  { id: 'rfid', naziv: 'Put nosača i RFID', opis: 'prednja traka, zaustavljač grananja, glavni zaustavljač RASS-a, povrat i skretanje na bypass.', koraci: [
    { u: 'Paleta je upravo izdana na nosač. Uključi „Prati nosač” ispod 3D prikaza.', p: 'Kamera prati nosač aktivnog naloga. Brzina traka u simulatoru je ' + kz(SIM.vTrake, 2) + ' m/s (pretpostavka; brzina nije objavljena).', ok: () => ui.prati },
    { u: 'Nosač vozi prednjom trakom prema RASS-u. Na zaustavljaču grananja BRANCH čita RFID: sljedeći resurs je RASS, pa skretnica ostaje u položaju „ravno”.', p: SCENARIJ.koraci[2].opis, ok: () => br('rfid:branchGrananje:nalog') > 0 },
    { u: 'Na glavnom zaustavljaču RASS-a PLC opet čita RFID. Nosač preko povrata na kraju linije prelazi na stražnju traku i skreće na treću traku (bypass). Pričekaj skretanje.', p: SCENARIJ.koraci[3].opis.split('.')[0] + '.', ok: () => br('naPut:bypassRASS') > 0 },
    { u: 'Što je u načinu MES zapisano na RFID oznaci nosača?', p: 'RFID: ' + MATERIJAL.rfid.tip + '. ' + MATERIJAL.odnos, k: 'izbor', izbor: { opcije: [MATERIJAL.rfid.mesNacin.join(', '), MATERIJAL.rfid.defaultNacin.join(', '), 'Samo CarrierID — sve ostalo zna samo MES', 'Cijeli plan rada naloga sa svim operacijama'], tocno: 0 }, ok: () => false },
    { u: 'Kraj niza „Put nosača i RFID”.', p: 'Klik na nosač u 3D prikazu pokazuje što piše na njegovom RFID-u.', k: 'kraj', ok: () => false }] },
  { id: 'montaza', naziv: 'Montaža u RASS-u', opis: 'radni položaj na bypassu, izmjena alata TOOL2/TOOL1/TOOL3, kućište u napravu, pločica, kamera, osigurači, PTP i LIN.', koraci: [
    { u: 'Nosač stiže na radni položaj robota na trećoj traci. Pričekaj OpStart montaže — broj operacije RASS-a nije objavljen, zato je u planu rada „—”.', p: 'Prijeđi pokazivačem preko „—” u tablici naloga: napomena kaže gdje se broj čita (MES4, Operations).', ok: () => br('opStart:rass') > 0 },
    { u: 'Robot uzima paralelnu prihvatnicu TOOL2 iz spremišta i prenosi kućište s palete u steznu napravu: PTP do točke iznad, LIN dolje, hvatanje, LIN gore. Odaberi pogled „RASS”.', p: 'Gibanja su izračunata kinematikom robota (inverzna kinematika za svaku točku, PTP interpolacija u osima, LIN pravac u prostoru). Trenutno gibanje i alat piše na kartici RASS.', ok: () => br('kucisteNaprava') > 0 },
    { u: 'Izmjena alata TOOL2 → TOOL1 (vakuumska prihvatnica): robot odlaže TOOL2 u vilicu spremišta, spaja izmjenjivač na TOOL1 i umeće tiskanu pločicu iz kutije u kućište.', p: 'Spremište ima mjesta ' + PRIHVATNICE.map((p) => p.oznaka).join(', ') + ' (broj mjesta je sukob izvora). ' + PRIHVATNICE.slice(0, 3).map((p) => p.oznaka + ': ' + p.naziv).join('; ') + '.', ok: () => br('pcbUmetnut') > 0 },
    { u: 'Robot se odmiče, a kamera provjerava orijentaciju pločice u kućištu.', p: nadjiDio('rassKamera') ? nadjiDio('rassKamera').opis : '', ok: () => br('kamera') > 0 },
    { u: 'TOOL3 umeće osigurače iz cijevi (broj iz naloga), zatim TOOL2 vraća sklop na paletu i robot ide u osnovni položaj. Pričekaj OpEnd.', p: 'Redoslijed koraka montaže je naša pretpostavka (program robota nije objavljen). Procjena trajanja montaže iz podataka: ' + (PROCJENA.rass ?? '—') + ' s; izmjereno vrijeme piše u planu rada naloga.', ok: () => br('opEnd:rass') > 0 },
    { u: 'Zašto robot radi na trećoj traci (bypass), a ne na glavnoj traci?', p: MODULI.rass.funkcija, k: 'izbor', izbor: { opcije: ['Da dugi ciklus montaže ne zaustavlja tok materijala na glavnim trakama', 'Jer robot ne doseže glavne trake', 'Jer na glavnim trakama nema RFID glava', 'Da nosač promijeni smjer vožnje'], tocno: 0 }, ok: () => false },
    { u: 'Kraj niza „Montaža u RASS-u”.', p: 'Nakon ' + SIM.kutijaPCB + ' montaža kutija PCB je prazna: RASS javlja grešku, a tipka „Box change” na kartici RASS umeće novu kutiju (zatim Reset i Start).', k: 'kraj', ok: () => false }] },
  { id: 'pohrana', naziv: 'Pohrana natrag (210/211)', opis: 'stražnja traka, zaustavljač 2 i 211 Store P2; kontrolni krug s 212 i 210 na zaustavljaču 1.', koraci: [
    { u: 'Montaža je gotova. Nosač se s bypassa vraća na stražnju traku i prolazi BRANCH (zaustavljač trake 1).', p: SCENARIJ.koraci[4].opis, ok: () => br('rfid:branchTraka1:nalog') > 0 },
    { u: 'Na zaustavljaču 2 ASRS-a MES dodjeljuje 211 Store P2: portal uzima paletu s nosača i sprema je na slobodnu policu. Pričekaj OpEnd.', p: SCENARIJ.koraci[5].opis + ' Prazan nosač nastavlja kružiti.', ok: () => br('opEnd:211') > 0 },
    { u: 'Koja operacija sprema paletu sa zaustavljača 1?', p: MES.operacije.filter((o) => o.opNo != null).map((o) => o.opNo + ' ' + o.naziv + ' — ' + o.opis).join('; ') + '.', k: 'izbor', izbor: { opcije: OPS.map((o) => o.opNo + ' ' + o.naziv), tocno: OPS.findIndex((o) => o.opNo === 210) }, ok: () => false },
    { u: 'Pošalji nalog „' + tipNaloga('krug') + '”: paleta se izdaje na zaustavljač 1 (212), obiđe cijelu petlju i sprema se sa zaustavljača 1 (210). Pričekaj kraj naloga.', p: 'Nosač pritom prolazi i zaustavljač 2 — operacija 210 pripada zaustavljaču 1, pa ga MES na zaustavljaču 2 ne obrađuje.', ok: () => br('opEnd:210') > 0 },
    { u: 'Kraj niza „Pohrana natrag”.', p: 'Zaliha u skladištu (ispod popisa naloga) mijenja se nakon svake operacije.', k: 'kraj', ok: () => false }] },
  { id: 'robotino', naziv: 'Predaja nosača Robotinu na BRANCH-u', opis: 'skretnica u krak, Fleet Manager, pristajanje, handshake, prijenos trakama, vožnja svesmjernim pogonom i povratak.', koraci: [
    { u: 'Pošalji nalog „' + tipNaloga('robotino') + '”.', p: 'Plan rada: ' + TIPOVI_NALOGA.find((t) => t.id === 'robotino').plan.map((o) => NAZIV_RESURSA[o.resurs] + ' ' + brojOp(o).tekst).join(' → ') + '. Brojevi operacija BRANCH-a i Robotina nisu objavljeni.', ok: () => st().nalozi.some((n) => n.tip === 'robotino' && n.t0 >= 0) && br('nalog') > 0 },
    { u: 'Nakon izdavanja nosač stane na zaustavljač grananja: sljedeći resurs je BRANCH, skretnica se otvara i nosač ide trakom 3 u krak. Odaberi pogled „BRANCH i Robotino”.', p: SCENARIJ.robotino[0].opis, ok: () => br('naPut:krakBRANCH') > 0 },
    { u: 'Na vrhu kraka BRANCH traži Robotina (MES → Fleet Manager). Robotino se odvaja od stanice za punjenje, vozi do BRANCH-a i pristaje uz krak.', p: UPRAVLJANJE.fleetManager + '.', ok: () => br('robotinoDock') > 0 },
    { u: 'Optički handshake (Q3.5 i I3.5 na kartici Robotino), pa trake BRANCH-a i prihvata prebacuju nosač na Robotina.', p: SCENARIJ.robotino[1].opis + ' Visina remena linije i ploha prihvata Robotina razlikuju se u podacima (pretpostavke) — nosač se pri prijenosu podiže.', ok: () => br('naRobotinu') > 0 },
    { u: 'Robotino vozi do CP-COBOT-M (odredište iza modula). Prati brzine motora M1–M3 na kartici Robotino: tri svesmjerna kotača zajedno daju vožnju u bilo kojem smjeru i zakret.', p: 'Brzine motora računa inverzna kinematika svesmjernog pogona iz područja Robotino (m_i = k · (−sin θ_i · vx + cos θ_i · vy + r_b · ω)), a položaj integrira odometrija. ' + SCENARIJ.nijeMoguce[0], ok: () => br('odrediste') > 0 },
    { u: 'Robotino se vraća, ponovno pristaje i predaje nosač natrag na krak.', p: SCENARIJ.robotino[3].opis, ok: () => br('povratakKrak') > 0 },
    { u: 'Nosač trakom 4 i zaustavljačem mjesta predaje odlazi na glavnu traku, prema montaži.', p: 'Spajanje na glavnu traku čeka prazninu između nosača.', ok: () => br('naPetlju:krakBRANCH') > 0 },
    { u: 'Može li Robotino u ovoj opremi predati nosač modulu CP-COBOT-M?', p: SCENARIJ.nijeMoguce.join(' '), k: 'izbor', izbor: { opcije: ['Ne — inačica M nema Robotino docking', 'Da, s bilo koje strane modula', 'Da, ali samo kad je kobot u načinu MES', 'Ne — Robotino CP-MR-C nosi samo kutije'], tocno: 0 }, ok: () => false },
    { u: 'Kraj niza „Predaja nosača Robotinu na BRANCH-u”.', p: 'Robotino bez naloga odlazi na stanicu za punjenje.', k: 'kraj', ok: () => false }] },
  { id: 'punjenje', naziv: 'Robotino na punjenje', opis: 'baterija ispod praga, Fleet Manager, prilaz po normali i pristajanje, punjenje snagom stanice.', koraci: [
    { u: 'Robotino stoji na parkirnom mjestu bez naloga, a baterija mu je pri kraju (kartica Robotino). Fleet Manager ga šalje na stanicu za punjenje.', p: 'Prag baterije za odlazak na punjenje u simulatoru je ' + Math.round(SIM.robotino.prag * 100) + ' % (pretpostavka; podešava se u Fleet Manageru). ' + MODULI.stanica.funkcija, ok: () => br('naPunjenje') > 0 },
    { u: 'Robotino prilazi stanici po njezinoj normali i pristaje. Odaberi pogled „Odozgo” ili približi kameru stanici uz desni zid.', p: 'Poza pristajanja dolazi iz kinematike Robotina: središte robota na normali prednje plohe stanice, robot okrenut stanici, kontakt za punjenje naprijed.', ok: () => br('punjenjeDock') > 0 },
    { u: 'Robotino se puni. Pričekaj da baterija naraste za 2 %.', p: 'Stanica daje najviše ' + MODULI.stanica.snaga + ' W; dok je robot spojen, radi na mrežnom napajanju. Vrijeme baterije u simulatoru teče ' + SIM.robotino.ubrzanjeBat + '× brže.', ok: () => st().rob.naStanici && st().rob.bat >= refBat + 0.02 },
    { u: 'Kada Robotino sam odlazi na stanicu za punjenje?', p: MODULI.stanica.funkcija, k: 'izbor', izbor: { opcije: ['Kad nema naloga ili mu je baterija prazna (prema postavkama Fleet Managera)', 'Samo kad ga operater odgura', 'Svakih sat vremena', 'Kad je linija u nužnom stopu'], tocno: 0 }, ok: () => false },
    { u: 'Kraj niza „Robotino na punjenje”.', p: 'Novi nalog „' + tipNaloga('robotino') + '” odvaja ga od stanice i kad baterija nije puna.', k: 'kraj', ok: () => false }] },
  { id: 'estop', naziv: 'Nužni stop na liniji i ponovno pokretanje', opis: 'gljiva na bilo kojoj stanici, lanac START – MID – END, Reset odbijen, otpuštanje, Reset, Start, nastavak naloga.', koraci: [
    { u: 'Robot u RASS-u montira. Pritisni gljivu nužnog stopa na bilo kojoj stanici linije (npr. na ASRS32).', p: UPRAVLJANJE.sigurnosniLanac.opis, ok: () => br('estop') > 0 },
    { u: 'Cijela linija stoji: trake, portal skladišta i robot. Pokušaj Reset dok je gljiva pritisnuta.', p: 'Dok je gljiva mehanički zaključana, sigurnosni krug se ne može potvrditi.', ok: () => br('resetOdbijen') > 0 },
    { u: 'Otpusti gljivu (ponovni klik na nju).', p: 'Otpuštanje samo omogućuje potvrdu — stanice se ne pokreću same.', ok: () => LINIJA.every((k) => !st().moduli[k].gljiva && st().moduli[k].stanje === 'cekaReset') },
    { u: 'Potvrdi tipkom Reset na svakoj stanici linije (ili „Reset linije”) i pričekaj kraj referenciranja.', p: UPRAVLJANJE.nacini[0].naziv + ': ' + UPRAVLJANJE.nacini[0].opis + '.', ok: () => LINIJA.every((k) => st().moduli[k].stanje === 'cekaStart') },
    { u: 'Pokreni stanice tipkom Start.', p: 'Start vraća stanice u automatski rad.', ok: LINIJA_RADI },
    { u: 'Prekinuta montaža se nastavlja. Pričekaj kraj naloga.', p: 'U simulatoru se operacija nastavlja gdje je stala; na stvarnoj liniji se prekinuta operacija može poništiti (OpReset) i ponoviti.', ok: () => br('nalogGotov') > 0 },
    { u: 'Što se dogodi kad pritisneš nužni stop na bilo kojoj stanici linije?', p: UPRAVLJANJE.sigurnosniLanac.opis, k: 'izbor', izbor: { opcije: ['Gase se svi aktuatori na povezanoj liniji (lanac ' + UPRAVLJANJE.sigurnosniLanac.redoslijed.map((r) => r.konektor).join(' – ') + ')', 'Staje samo ta stanica', 'Staju samo trake, roboti rade dalje', 'Nakon otpuštanja gljive linija se sama pokreće'], tocno: 0 }, ok: () => false },
    { u: 'Kraj niza „Nužni stop na liniji i ponovno pokretanje”.', p: 'Na stvarnoj liniji prije Reseta provjeri zašto je stop pritisnut i je li prostor oko stanica slobodan.', k: 'kraj', ok: () => false }] }
];
let gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-cpf-sim-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-cpf-sim-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }
const trenutni = () => (niz ? niz.koraci[korakNiza] : null);
function snimiRef() { ref = { ...st().brojac }; refBat = st().rob.bat; }
function crtajIzbornik() {
  $('nizovi').innerHTML = NIZOVI.map((n, i) => '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="br">' + (i + 1) + '</span>') + esc(n.naziv) + '</button></li>').join('');
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korakNiza + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k.u) : '<b>Slobodni rad.</b><br>Odaberi niz u izborniku ili radi sam: pošalji nalog u MES-u, mijenjaj načine rada, pritisni nužni stop, ubrzaj simulaciju (×5, ×20) ili prati nosač.';
  $('pomoc').textContent = k ? (k.p || '—') : 'Linija je u načinu MES i Automatic; tri prazna nosača kruže po petlji. Klik na dio u 3D prikazu pokazuje njegov naziv, a klik na nosač i sadržaj njegovog RFID-a.';
  const z = $('zadatak'); z.innerHTML = '';
  if (k && k.k === 'izbor') z.innerHTML = '<div class="odg">' + k.izbor.opcije.map((o, i) => '<button type="button" class="gumb tanki" data-izbor="' + i + '">' + esc(o) + '</button>').join('') + '</div>';
  $('dalje').hidden = !(k && k.k === 'dalje');
  $('ponovi').hidden = !(k && k.k === 'kraj');
  snimiRef(); crtajIzbornik();
}
function sljedeci() {
  if (!niz) return;
  korakNiza = Math.min(niz.koraci.length - 1, korakNiza + 1);
  if (trenutni().k === 'kraj') { gotovi.add(niz.id); spremiGotove(); }
  crtajKorak();
  provjeriKorak();
}
function provjeriKorak() {
  const k = trenutni(); if (!k || k.k === 'kraj' || k.k === 'izbor' || k.k === 'dalje') return;
  let ok = false; try { ok = !!k.ok(); } catch (e) { ok = false; }
  if (ok) { info('✓ ' + (korakNiza + 1) + '. korak je ispunjen.'); sljedeci(); }
}
/** brzo premotavanje jezgre bez iscrtavanja (priprema niza) */
function premotaj(uvjet, maxSek = 400) { const n = Math.round(maxSek / SIM.dt); for (let i = 0; i < n; i++) { sim.korak(SIM.dt); if (uvjet()) return true; } return false; }
function pripremi(id) {
  sim.pocetnoStanje(); ui.prati = false;
  const b = (e) => st().brojac[e] || 0;
  switch (id) {
    case 'upoznaj': LINIJA.forEach((k) => { const m = st().moduli[k]; m.stanje = 'cekaStart'; m.hmi = ['Reset gotov', 'pritisni Start', '']; }); pogled('linija'); break;
    case 'izdavanje': pogled('asrs'); break;
    case 'rfid': sim.posaljiNalog({ tip: 'mobitel', boja: BOJE[0], osiguraci: 2 }); premotaj(() => b('opEnd:212') > 0); pogled('linija'); break;
    case 'montaza': sim.posaljiNalog({ tip: 'mobitel', boja: BOJE[2], osiguraci: 2 }); premotaj(() => b('naPut:bypassRASS') > 0); pogled('rass'); break;
    case 'pohrana': sim.posaljiNalog({ tip: 'mobitel', boja: BOJE[3], osiguraci: 1 }); premotaj(() => b('opEnd:rass') > 0); pogled('linija'); break;
    case 'robotino': pogled('branch'); break;
    case 'punjenje': sim.pocetnoStanje({ robotino: { x: sim.RP.parking.x, y: sim.RP.parking.y, phi: sim.RP.parking.phi, naStanici: false, bat: SIM.robotino.prag + 0.004 } }); pogled('branch'); break;
    case 'estop': sim.posaljiNalog({ tip: 'mobitel', boja: BOJE[1], osiguraci: 2 }); premotaj(() => b('kucisteNaprava') > 0); pogled('rass'); break;
    default: break;
  }
  vizN.forEach((v, idn) => { L.ukloniNosac(idn); }); vizN.clear();
  verzijaPolica = -1; kljucH = ''; verzijaLoga = -1; zadnjiQ = null; zadnjiUR = null; kljucSig = '';
  ui.otvoreni.clear();
}
function pokreniNiz(id) {
  niz = null; korakNiza = 0; info('');
  pripremi(id);                                   /* bez aktivnog niza: priprema ne smije ispuniti korake */
  niz = NIZOVI.find((n) => n.id === id) || null;
  crtajKorak(); osvjeziSve();
  setTimeout(provjeriKorak, 0);
}
$('nizovi').addEventListener('click', (e) => { const b = e.target.closest('[data-niz]'); if (b) pokreniNiz(b.dataset.niz); });
$('izbornik').addEventListener('click', () => { niz = null; korakNiza = 0; crtajKorak(); info(''); });
$('dalje').addEventListener('click', () => sljedeci());
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); });
function odgovori(i) {
  const k = trenutni(); if (!k || k.k !== 'izbor') return false;
  if (+i === k.izbor.tocno) { info('Točno.'); sljedeci(); return true; }
  info('Nije točno — pogledaj pomoć.'); return false;
}
$('zadatak').addEventListener('click', (e) => { const b = e.target.closest('[data-izbor]'); if (b) odgovori(b.dataset.izbor); });

/* ================================================================== */
/* 8. Upravljanje simulacijom                                          */
/* ================================================================== */
document.querySelectorAll('#pogledi [data-pogled]').forEach((b) => b.addEventListener('click', () => { ui.prati = false; azurirajTraku(); pogled(b.dataset.pogled); }));
function azurirajTraku() {
  $('t-pauza').setAttribute('aria-pressed', String(ui.pauza)); $('t-pauza').textContent = ui.pauza ? 'Nastavi' : 'Pauza';
  $('t-prati').setAttribute('aria-pressed', String(ui.prati));
  document.querySelectorAll('[data-brzina]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.brzina === ui.brzina)));
}
$('t-pauza').addEventListener('click', () => { ui.pauza = !ui.pauza; azurirajTraku(); });
$('t-korak').addEventListener('click', () => { ui.pauza = true; azurirajTraku(); simuliraj(0.5); ui.prljavo = true; });
document.querySelectorAll('[data-brzina]').forEach((b) => b.addEventListener('click', () => { ui.brzina = +b.dataset.brzina; azurirajTraku(); }));
$('t-prati').addEventListener('click', () => {
  ui.prati = !ui.prati;
  const c = ui.prati && aktivniNosac();
  if (c) { const q = sim.pozaNosaca(c); controls.target.copy(S3(q.x, q.y, q.z)); camera.up.set(0, 1, 0); camera.position.copy(S3(q.x + 0.55, q.y - 1.25, q.z + 0.75)); controls.update(); }
  else if (ui.prati) info('Nema nosača s nalogom u radu — prati se čim nalog dobije nosač.');
  azurirajTraku(); provjeriKorak(); ui.prljavo = true;
});
controls.addEventListener('change', () => { ui.prljavo = true; });
function simuliraj(sek) {
  const n = Math.round(sek / SIM.dt);
  for (let i = 0; i < n; i++) { sim.korak(SIM.dt); if (i % 10 === 9) provjeriKorak(); }
  provjeriKorak(); osvjeziSve();
}
function osvjeziSve() { osvjeziStanice(); crtajNaloge(); osvjeziRobotino(); crtajLog(); $('sim-t').textContent = 't = ' + kz(st().t, 1) + ' s'; ui.prljavo = true; }

/* ================================================================== */
/* 9. Tekst ispod simulatora                                           */
/* ================================================================== */
function crtajTekst() {
  $('popis-nizova').innerHTML = NIZOVI.map((n) => '<li><b>' + esc(n.naziv) + '</b> — ' + esc(n.opis) + '</li>').join('');
  $('tok-naloga').innerHTML = MES.tokNaloga.map((t) => '<li>' + esc(t) + '</li>').join('');
  $('servisi').innerHTML = 'Servisi koje simulator prikazuje u dnevniku (MES4, kodovi iz dokumentacije sučelja): ' + MES.servisi.map((s) => '<code>' + esc(s.naziv) + '</code> ' + esc(s.kod)).join(', ') + '. Polja poruka: ' + MES.polja.map((p) => '<code>' + esc(p) + '</code>').join(' ') + '. ' + esc(MES.status) + '.';
  $('operacije').innerHTML = '<thead><tr><th>OpNo</th><th>Operacija</th><th>Opis</th><th>Resurs (ID)</th></tr></thead><tbody>' + MES.operacije.map((o) => '<tr><td>' + opHtml(o) + '</td><td>' + esc(o.naziv) + '</td><td>' + esc(o.opis) + '</td><td>' + esc(NAZIV_RESURSA[o.resurs]) + ' (' + (MES.resursi[o.resurs] ?? '—') + ')</td></tr>').join('') + '</tbody>';
  $('planovi').innerHTML = TIPOVI_NALOGA.map((t) => '<li><b>' + esc(t.naziv) + '</b>: ' + t.plan.map((o) => esc(NAZIV_RESURSA[o.resurs]) + ' ' + opHtml(o)).join(' → ') + ' — ' + esc(t.opis) + '.</li>').join('');
  $('lanac').textContent = UPRAVLJANJE.sigurnosniLanac.opis + ' Redoslijed u simulatoru: ' + UPRAVLJANJE.sigurnosniLanac.redoslijed.map((r) => NAZIV_RESURSA[r.modul] + ' ' + r.konektor).join(' – ') + ' (pretpostavka). ' + UPRAVLJANJE.vrataRass.opis + ' (' + UPRAVLJANJE.vrataRass.pl + ', ' + UPRAVLJANJE.vrataRass.kategorija + ').';
  $('nacini').innerHTML = UPRAVLJANJE.nacini.map((n) => '<li><b>' + esc(n.naziv) + '</b> — ' + esc(n.opis) + '</li>').join('') + '<li><b>Cycle end</b> — ' + esc(UPRAVLJANJE.ciklusKraj) + '</li>';
  $('nije-moguce').innerHTML = SCENARIJ.nijeMoguce.map((t) => '<li>' + esc(t) + '</li>').join('');
  const A = MJERE.asrs.os, Kp = SIM.kuka, Rb = SIM.robotino;
  $('zadano').textContent = 'Korak simulacije ' + Math.round(SIM.dt * 1000) + ' ms; brzina traka ' + kz(SIM.vTrake, 2) + ' m/s; ' + SIM.nosaca + ' nosača u petlji, najmanji razmak središta ' + Math.round(SIM.razmak * 1000) + ' mm; čitanje RFID-a ' + kz(SIM.tRfid, 1) + ' s, odgovor MES-a ' + kz(SIM.tMes, 1) + ' s; skretnica ' + kz(SIM.tSkretnica, 1) + ' s; referenciranje nakon Reseta ' + kz(SIM.tReset, 1) + ' s. ASRS: vX ' + kz(A.vX, 2) + ' m/s, vZ ' + kz(A.vZ, 2) + ' m/s, Y ' + kz(A.tY, 1) + ' s, C ' + kz(A.tC, 1) + ' s, hvatanje ' + kz(A.tHvat, 1) + ' s (procjena trajanja operacije iz podataka ~' + (PROCJENA.asrs ?? '—') + ' s). KUKA: PTP uz override ' + Math.round(Kp.override * 100) + ' % najvećih brzina osi, LIN ' + kz(Kp.vLin, 2) + ' m/s, izmjena alata ' + kz(Kp.tAlat, 1) + ' s, kamera ' + kz(Kp.tKamera, 1) + ' s. Robotino: v ≤ ' + kz(Rb.vMax, 2) + ' m/s, ω ≤ ' + kz(Rb.wMax, 2) + ' rad/s, pristajanje ' + kz(Rb.vPristajanje, 2) + ' m/s, trake prihvata ' + kz(Rb.vPrihvat, 2) + ' m/s, baterija ' + Math.round(E_BAT) + ' Wh, prag ' + Math.round(Rb.prag * 100) + ' %, stanica ' + MODULI.stanica.snaga + ' W. Kutija PCB: ' + SIM.kutijaPCB + ' pločice.';
  const POJ = [
    'Trake: nosači voze stalnom brzinom ' + kz(SIM.vTrake, 2) + ' m/s (vrijednost „brzo” iz podataka, koja je pretpostavka), bez ubrzanja i proklizavanja; drže najmanji razmak ' + Math.round(SIM.razmak * 1000) + ' mm. Svaki nosač staje na svakom zaustavljaču, gdje stanica čita RFID (' + kz(SIM.tRfid, 1) + ' s) i u načinu MES pita MES (' + kz(SIM.tMes, 1) + ' s). Zaustavljač se diže kad pušteni nosač odmakne ' + Math.round(SIM.odmakZaustavljaca * 1000) + ' mm.',
    'MES: naš pojednostavljeni prikaz MES4 — nalog, plan rada, pozicije, OpStart i OpEnd s pisanjem sljedećeg resursa na RFID. Poruke se ne šalju stvarnim protokolom (portovi ' + MES.portovi.servis + '/' + MES.portovi.status + '), nema OEE-a ni rasporeda. Brojevi operacija RASS-a, BRANCH-a i Robotina nedostaju i prikazuju se kao „—”. Paleta za izdavanje je prva na kojoj je kućište tražene boje, pohrana ide na prvo slobodno mjesto.',
    'ASRS32: osi X i Z voze istodobno, Y i C jedna za drugom; profil gibanja je glatki (kosinusni), a vremena su iz brzina osi u podacima uvećana za 25 %. Ciklus portala je naš (redoslijed prema opisu ciklusa „izdaj” u podacima modela); izmjereno trajanje operacije piše u planu rada.',
    'RASS: redoslijed montaže je naša pretpostavka (program robota nije objavljen): TOOL2 prenosi kućište u steznu napravu, TOOL1 umeće pločicu, kamera provjerava (uvijek ispravno), TOOL3 umeće osigurače, TOOL2 vraća sklop na paletu. Točke su iz rasporeda ćelije u podacima (pretpostavke); osigurač se uzima na vrhu cijevi. Svako gibanje računa inverzna kinematika robota: PTP linearno u osima, trajanje iz najvećih brzina osi uz override ' + Math.round(SIM.kuka.override * 100) + ' % i glatki profil; LIN po pravcu brzinom ' + kz(SIM.kuka.vLin, 2) + ' m/s. Sudari s okolinom se ne provjeravaju. Nakon ' + SIM.kutijaPCB + ' pločica kutija je prazna (kapacitet je sukob izvora).',
    'Robotino: Fleet Manager je sveden na jedan nalog transporta i pravilo „bez naloga na punjenje”. Vožnja ide kroz unaprijed zadane točke (bez karte, lasera i prepreka): regulator položaja s rampom ubrzanja ' + kz(SIM.robotino.aLin, 1) + ' m/s² i ' + kz(SIM.robotino.aKut, 1) + ' rad/s² daje (vx, vy, ω), a brzine motora i položaj računa kinematika svesmjernog pogona iz područja Robotino. Predaja je na sredini preusmjerivača kraka; nosač se pri prijenosu podiže s ravnine traka na plohu prihvata (nesklad visina u podacima). Odredište iza CP-COBOT-M (prihvat okrenut prema modulu) samo pokazuje vožnju, jer inačica M nema docking.',
    'Baterija Robotina: ' + Math.round(E_BAT) + ' Wh (iz podataka o robotu), potrošnja ' + SIM.robotino.pMir + ' W u mirovanju do ' + (SIM.robotino.pMir + SIM.robotino.pVoznja) + ' W u vožnji (procjena), punjenje snagom stanice umanjenom za potrošnju. Vrijeme baterije teče ' + SIM.robotino.ubrzanjeBat + '× brže, da se punjenje vidi.',
    'Sigurnost: nužni stop na bilo kojoj stanici linije zamrzne sve procese, trake i osi linije; nakon otpuštanja gljive, Reseta (' + kz(SIM.tReset, 1) + ' s) i Starta procesi se nastavljaju gdje su stali. Svjetla na pločama stanica su konvencija simulatora. CP-COBOT-M i Robotino imaju vlastiti nužni stop izvan lanca linije (pretpostavka; Robotino se ovdje ne zaustavlja). Vrata ćelije RASS-a se ne simuliraju.',
    'UR3e na CP-COBOT-M radi samo samostalni demo program kroz točke iznad kutija (inverzna kinematika iz područja Kobot UR3e), bez dijelova i bez veze s MES-om.',
    '3D prikaz se iscrtava samo kad se nešto promijeni, a dok simulacija teče najviše ~' + UI_FPS + ' slika u sekundi; fizika (100 Hz) ne ovisi o brzini iscrtavanja. Pri ×20 i sporom računalu simulacija može teći sporije od zadanog.'
  ];
  $('pojednostavljenja').innerHTML = POJ.map((t) => '<li>' + esc(t) + '</li>').join('');
  $('pp-uvod').textContent = TEKST_PRETPOSTAVKE;
  const re = /Brzina traka|Trajanje|Raspored prostora|Resource|OpNo|zaustavljač|Položaj robota|Spremište|Broj mjesta|naprava|Kamera|Cijevi|Kapacitet kutije|kraka|Razmak kraja|radne ravnine|Razmak osi|Brzina osi|Vrijeme hoda|Vrijeme zakreta|hvatanja|Redoslijed konektora|Raspored mjesta|bypass|Uvučeni položaj|Visina postolja|montažne ploče|Traka za kutije|Orijentacija nosača/i;
  $('pretpostavke').innerHTML = pretpostavke().filter((p) => re.test(p.sto) || p.vrsta === 'nedostaje').map((p) => '<li><b>' + esc(p.sto) + (p.vrijednost ? ': ' + esc(p.vrijednost) : '') + '</b>' + (p.vrsta === 'sukob' ? ' (sukob izvora)' : p.vrsta === 'nedostaje' ? ' (nedostaje)' : '') + ' — ' + esc(p.napomena) + '</li>').join('');
  const IZ = ['MES-IF', 'MAN-ASRS', 'IP-ASRS', 'MAN-RASS', 'IP-RASS', 'IP-BR', 'MAN-BR', 'MS-BR18', 'IP-MRC', 'CPMR-C', 'IP-COBM', 'FAC-140', 'FAC-150', 'FAC-222', 'FAC-248'];
  $('izvori').innerHTML = IZ.filter((k) => IZVORI[k]).map((k) => { let host = ''; try { host = new URL(IZVORI[k]).hostname; } catch (e) { host = IZVORI[k]; } return '<li>[' + esc(k) + '] <a href="' + esc(IZVORI[k]) + '" rel="noopener" target="_blank">' + esc(host) + '</a></li>'; }).join('');
}

/* ================================================================== */
/* 10. Petlja: fizika 100 Hz, prikaz na zahtjev                        */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); ui.prljavo = true; }
new ResizeObserver(velicina).observe(scenaEl);
let scenaVidljiva = true;
if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver((z) => { scenaVidljiva = z[0].isIntersecting; ui.prljavo = true; }).observe(scenaEl);
let rafId = 0, zadnje = performance.now(), akum = 0, zadnjiUI = 0, zadnjiRender = 0, zadnjaProvjera = 0, verzijaUI = -1;
function iscrtaj() { postavi3D(); renderer.render(scene, camera); ui.prljavo = false; zadnjiRender = performance.now(); }
function petlja(t) {
  rafId = 0;
  const dtR = Math.min(0.25, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  let tece = false;
  if (!ui.pauza) {
    akum += dtR * ui.brzina;
    let n = 0; const nMax = 2500;
    while (akum >= SIM.dt && n < nMax) { sim.korak(SIM.dt); akum -= SIM.dt; n++; }
    if (n >= nMax) akum = 0;
    tece = n > 0;
  }
  if (t - zadnjaProvjera > 100) { zadnjaProvjera = t; provjeriKorak(); }
  if (t - zadnjiUI > 250 || st().verzija !== verzijaUI) {
    if (t - zadnjiUI > 120) { zadnjiUI = t; verzijaUI = st().verzija; osvjeziStanice(); osvjeziRobotino(); crtajLog(); $('sim-t').textContent = 't = ' + kz(st().t, 1) + ' s'; $('sc-vrijeme').textContent = 't ' + kz(st().t, 1) + ' s · ×' + ui.brzina + (ui.pauza ? ' · pauza' : ''); }
  }
  if (t - zadnjiNalozi > 500) { zadnjiNalozi = t; if (st().verzija !== verzijaNaloga) { verzijaNaloga = st().verzija; crtajNaloge(); } }
  const ctrl = controls.update();
  if (scenaVidljiva && !ui.rucno && (ui.prljavo || ctrl || (tece && t - zadnjiRender > 1000 / UI_FPS))) iscrtaj();
  rafId = requestAnimationFrame(petlja);
}
let zadnjiNalozi = 0, verzijaNaloga = -1;
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; } else if (!rafId) { zadnje = performance.now(); rafId = requestAnimationFrame(petlja); } });

/* testna kuka */
window.__sim = {
  sim, get st() { return sim.st; }, NIZOVI, L, kuka, ur, rob, camera, controls, renderer, ui, SIM,
  get niz() { return niz; }, get korak() { return korakNiza; },
  pokreniNiz, provjeri: provjeriKorak, odgovori, sljedeci, pogled, iscrtaj, osvjeziSve,
  simuliraj, simulirajDok(uvjet, maxSek = 300) { const n = Math.round(maxSek / SIM.dt); for (let i = 0; i < n; i++) { sim.korak(SIM.dt); if (i % 10 === 9) provjeriKorak(); if (uvjet()) { provjeriKorak(); osvjeziSve(); return true; } } osvjeziSve(); return false; },
  klik(sel) { const e = document.querySelector(sel); if (e) e.click(); return !!e; }
};

/* pokretanje */
crtajStanice(); crtajFormu(); crtajRobotino(); crtajTekst(); crtajIzbornik(); crtajKorak(); azurirajTraku(); velicina(); pogled('linija'); osvjeziSve();
const uc = $('ucitavanje'); if (uc) uc.remove();
iscrtaj();
rafId = requestAnimationFrame(petlja);

/* v03 — poravnanje radnog prikaza (isto kao Kobot UR3e v02 i Robotino v03): na računalu kartica Stanice ide u desni stupac (ispod Robotina, iznad dnevnika),
   a laboratorij dobiva ostatak srednjeg stupca; nakon klika na niz ili gumb uputa i laboratorij stanu točno na zaslon */
(function () {
  const SIROKO = window.matchMedia('(min-width:1121px) and (min-height:600px)');
  const sred = document.querySelector('.sl-sredina'), desno = document.querySelector('.sl-desno'), stn = document.getElementById('k-stanice');
  if (!sred || !desno) return;
  function poravnaj() {
    if (!SIROKO.matches) return;
    const y = sred.getBoundingClientRect().top;
    if (Math.abs(y - 62) > 6 && y < window.innerHeight - 120) window.scrollTo({ top: window.scrollY + y - 62, behavior: 'smooth' });
  }
  function rasporedi() {
    if (stn) { if (SIROKO.matches) { if (stn.parentNode !== desno) { const log = document.getElementById('k-log'); if (log && log.parentNode === desno) desno.insertBefore(stn, log); else desno.appendChild(stn); } } else if (stn.parentNode !== sred) sred.appendChild(stn); }
    window.dispatchEvent(new Event('resize'));
  }
  rasporedi(); SIROKO.addEventListener('change', rasporedi);
  for (const s of ['.sl-izbornik', '.sl-uputa', '#pogledi']) { const el = document.querySelector(s); if (el) el.addEventListener('click', (e) => { if (e.target.closest('button')) poravnaj(); }); }
  window.__poravnaj = poravnaj;
})();
