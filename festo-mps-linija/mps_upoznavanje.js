/* FORTRONIQ · Festo MPS linija — Upoznavanje linije (3D).
   Četiri stanice dio po dio (izbornik, isticanje, opis, podaci, izvori), animacije „Kako radi”, prikaz rada linije,
   tok materijala, izradci, upravljačke ploče i signali, veza PLC ↔ robot, pretpostavke i izvori.
   Svi nazivi, opisi, brojevi i pretpostavke iz mps_podaci.js; robot i kolica robotske stanice iz područja RV-M1.
   Iscrtavanje na zahtjev. © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as P from './mps_podaci.js';
import { napraviModelLinije } from './mps_model.js';
import { napraviLiniju } from './mps_tok.js';
import { TEME, prikazi } from './teme_mps.js';
import { ORG } from '../robot-mitsubishi-rv-m1/rvm1_podaci.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PR = P.pretpostavke();
const INDEKS = new Map(P.DIJELOVI.map((d, i) => [d.id, i]));
const STRANICA_ROBOTA = P.PODRUCJE_ROBOTA.upoznavanje;

/* ================================================================== scena */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
scenaEl.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.02, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 8; controls.minDistance = 0.12; controls.maxPolarAngle = Math.PI * 0.495;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.3));
{ const d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(1.5, 3, 2.5); scene.add(d1); const d2 = new THREE.DirectionalLight(0xffffff, 0.5); d2.position.set(-2, 1.5, -1.5); scene.add(d2); }
const M = napraviModelLinije(THREE, { kabeli: true, uzorci: true, pod: true });
scene.add(M.grupa);
M.pocetno(ORG);
const V = M.V;
const SVI = []; M.grupa.traverse((o) => { if (o.isMesh) SVI.push(o); });

/* ================================================================== stanje, iscrtavanje na zahtjev */
const st = { akt: null, otvorene: new Set(), istakni: true, rad: false, brzina: 1, L: null };
const vidjeni = new Set();
const KLJUC = 'ftq-mps-upoznavanje';
try { JSON.parse(localStorage.getItem(KLJUC) || '[]').forEach((x) => { if (INDEKS.has(x)) vidjeni.add(x); }); } catch (e) { /* bez spremanja */ }
function spremi() { try { localStorage.setItem(KLJUC, JSON.stringify([...vidjeni])); } catch (e) { /* bez spremanja */ } }
let rafId = 0, zadnje = performance.now(), let_ = null;
function trazi() { if (!rafId && !document.hidden) { zadnje = performance.now(); rafId = requestAnimationFrame(okvir); } }
document.addEventListener('visibilitychange', () => { if (!document.hidden) trazi(); });

/* ================================================================== kamera i pogledi */
const POGLEDI = {
  linija: { n: 'Linija', p: [0.45, -1.55, 1.85], c: [0.95, 0.38, 0.82], o: 'Linija sprijeda, kao na fotografiji: slijeva distribucijska, ispitna i obradna stanica, desno robotska stanica s montažom.' },
  odozgo: { n: 'Odozgo', p: [0.9, -0.15, 3.0], c: [0.9, 0.38, 0.78], o: 'Tlocrt: tok materijala slijeva nadesno, upravljačke ploče su na prednjoj strani (dolje).' },
  dist: { n: 'Distribucijska', p: [0.0, -0.42, 1.18], c: [0.2, 0.42, 0.85], o: 'Distribucijska stanica: slagani spremnik s izbacivačem i zakretna ruka s vakuumskom sisaljkom.' },
  isp: { n: 'Ispitna', p: [0.28, -0.45, 1.22], c: [0.55, 0.38, 0.92], o: 'Ispitna stanica: senzori za boju i materijal, dizalo, mjerni modul, zračni klizač i klizač škarta.' },
  obr: { n: 'Obradna', p: [0.68, -0.38, 1.18], c: [0.9, 0.4, 0.88], o: 'Obradna stanica: okretni stol sa šest gnijezda, ispitivač i bušilica sa stezanjem.' },
  rob: { n: 'Robot', p: [1.62, -0.25, 1.25], c: [1.2, 0.4, 0.92], o: 'Robotska stanica: robot RV-M1 na čeličnoj ploči uzima izradak s okretnog stola.' },
  mont: { n: 'Montaža', p: [1.85, -0.3, 1.2], c: [1.5, 0.38, 0.84], o: 'Montaža: gnijezdo, paleta klipova, spremnici poklopaca i opruga, izlazni klizač.' }
};
const POGLED_SKUPINE = { 'Linija': 'linija', 'Distribucijska stanica': 'dist', 'Ispitna stanica': 'isp', 'Obradna stanica': 'obr', 'Robotska i montažna stanica': 'rob', 'Izradci': 'linija' };
function faktor() { return camera.aspect < 16 / 9 ? Math.pow((16 / 9) / camera.aspect, 0.6) : 1; }
function leti(poz, cilj, glatko = true) {
  if (!glatko) { let_ = null; camera.position.copy(poz); controls.target.copy(cilj); controls.update(); trazi(); return; }
  let_ = { t0: performance.now(), d: 850, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz.clone(), c1: cilj.clone() }; trazi();
}
function pogled(ime, glatko = true) {
  const p = POGLEDI[ime] || POGLEDI.linija;
  const c = V(...p.c), poz = c.clone().add(V(...p.p).sub(c).multiplyScalar(faktor()));
  leti(poz, c, glatko);
  $('pogledi').querySelectorAll('[data-pogled]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pogled === ime)));
  $('z-opis').textContent = p.o;
}
$('pogledi').innerHTML = Object.entries(POGLEDI).map(([k, p]) => `<button type="button" class="gumb tanki" data-pogled="${k}" aria-pressed="false">${esc(p.n)}</button>`).join('');
$('pogledi').addEventListener('click', (e) => { const b = e.target.closest('[data-pogled]'); if (b) pogled(b.dataset.pogled); });
function kutija(id) {
  const b = new THREE.Box3(), bb = new THREE.Box3(); let ok = false;
  M.objektiDijela(id).forEach((o) => { o.updateMatrixWorld(true); o.traverseVisible((c) => { if (!c.isMesh || !c.geometry) return; if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); bb.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld); if (!bb.isEmpty()) { b.union(bb); ok = true; } }); });
  return ok ? b : null;
}
function letiDo(id) {
  const d = P.nadjiDio(id); if (!d) return;
  if (id === 'linija' || id === 'kolica' || id === 'profilnaPloca' || id === 'stationLink' || id === 'plc' || id === 'sysLink' || id === 'ventilskiOtok') { pogled('linija'); return; }
  const b = kutija(id); if (!b) { pogled(POGLED_SKUPINE[d.skupina] || 'linija'); return; }
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.05, b.getSize(new THREE.Vector3()).length() / 2);
  const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
  const dist = Math.max(0.35, r / Math.sin(Math.min(vf, hf) / 2) * 1.6);
  const smjer = new THREE.Vector3(-0.25, 0.75, 1.0).normalize();
  if (d.skupina === 'Robotska i montažna stanica') smjer.set(0.55, 0.65, 0.9).normalize();
  leti(c.clone().add(smjer.multiplyScalar(dist)), c);
}

/* ================================================================== izbornik i kartica */
const SK_ID = (s) => 'sk-' + P.SKUPINE.indexOf(s);
function izbornik() {
  const ul = $('stablo'); ul.innerHTML = '';
  P.SKUPINE.forEach((sk) => {
    const dj = P.dijeloviSkupine(sk), otv = st.otvorene.has(sk);
    const li = document.createElement('li');
    const n = dj.filter((d) => vidjeni.has(d.id)).length;
    li.innerHTML = `<button type="button" class="uz-st skupina${st.akt === null && st.sk === sk ? ' akt' : ''}" aria-expanded="${otv}" id="${SK_ID(sk)}"><span class="str" aria-hidden="true">${otv ? '▾' : '▸'}</span><span class="t">${esc(sk)}</span><span class="br">${n}/${dj.length}</span></button>`;
    li.firstChild.addEventListener('click', () => { if (otv) st.otvorene.delete(sk); else st.otvorene.add(sk); st.sk = sk; izbornik(); const v = POGLED_SKUPINE[sk]; pogled(v); prikaziSkupinu(sk); });
    ul.appendChild(li);
    if (otv) dj.forEach((d) => {
      const l2 = document.createElement('li'); l2.className = 'r2';
      l2.innerHTML = `<button type="button" class="uz-st${st.akt === d.id ? ' akt' : ''}" data-id="${d.id}" aria-current="${st.akt === d.id}"><span class="ok" aria-hidden="true">${vidjeni.has(d.id) ? '✓' : ''}</span><span class="t">${esc(d.naziv)}</span>${d.pretpostavka ? '<span class="pp" title="sadrži pretpostavku"></span><span class="vh">(pretpostavka)</span>' : ''}</button>`;
      l2.firstChild.addEventListener('click', () => odaberi(d.id));
      ul.appendChild(l2);
    });
  });
  $('brojac').textContent = vidjeni.size + ' / ' + P.DIJELOVI.length + ' pregledano';
}
function prikaziSkupinu(sk) {
  st.akt = null; M.istakni(null); trazi();
  const id = P.SKUPINA_STANICE[sk], S0 = id ? P.STANICE[id] : null;
  $('k-naziv').textContent = sk; $('k-skupina').textContent = S0 ? S0.engl + ' · kolica ' + S0.kolica : 'Festo MPS';
  if (S0) {
    $('k-tekst').innerHTML = `<p>${esc(S0.zadatak)}</p><p><b>Moduli:</b> ${esc(S0.moduli.join(', '))}.</p><p><b>Upravljanje:</b> ${esc(S0.plc)}.</p>`;
  } else if (sk === 'Izradci') $('k-tekst').innerHTML = `<p>${esc(P.IZRADCI.komplet)}</p>`;
  else $('k-tekst').innerHTML = `<p>${esc(P.nadjiDio('linija').opis)}</p>`;
  ['k-podaci', 'k-izvor', 'k-podr', 'k-tema-g'].forEach((x) => { $(x).hidden = true; }); $('k-pretp').innerHTML = '';
}
function odaberi(id, letjeti = true) {
  const d = P.nadjiDio(id); if (!d) return;
  st.akt = id; st.sk = d.skupina; st.otvorene.add(d.skupina);
  vidjeni.add(id); spremi();
  if (st.istakni) M.istakni(id); else M.istakni(null);
  if (letjeti) letiDo(id);
  $('k-naziv').textContent = d.naziv;
  $('k-skupina').textContent = d.skupina;
  $('k-tekst').innerHTML = `<p>${esc(d.opis)}</p>`;
  const dl = $('k-podaci');
  if (d.podaci && d.podaci.length) { dl.innerHTML = d.podaci.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join(''); dl.hidden = false; } else dl.hidden = true;
  $('k-pretp').innerHTML = d.pretpostavka && d.napomena ? `<p class="uz-pretp"><b>Pretpostavka:</b> ${esc(d.napomena)}</p>` : '';
  const izv = P.izvoriDijela(d);
  $('k-izvor').innerHTML = izv.length ? 'Izvor: ' + izv.map((x) => x.url ? `<a href="#izvor-${esc(x.kratica)}">${esc(x.kratica)}</a>` : `<a href="#izvor-${esc(x.kratica)}">${esc(x.kratica)}</a>`).join(', ') : ''; $('k-izvor').hidden = !izv.length;
  const podr = $('k-podr');
  if (['rRobot', 'rPrihvatnica', 'rCelicnaPloca', 'rSucelje'].includes(id)) { podr.innerHTML = `<a class="gumb tanki" href="${STRANICA_ROBOTA}">Robot RV-M1 dio po dio →</a>`; podr.hidden = false; } else podr.hidden = true;
  const tg = $('k-tema-g');
  if (d.tema && TEME[d.tema]) { tg.innerHTML = `<button type="button" class="gumb tanki" data-tema="${d.tema}">Kako radi: ${esc(TEME[d.tema].naslov)}</button>`; tg.hidden = false; } else tg.hidden = true;
  izbornik(); trazi();
  const b = document.querySelector(`.uz-st[data-id="${id}"]`); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
}
$('k-tema-g').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if (b) otvoriTemu(b.dataset.tema); });
$('k-prije').addEventListener('click', () => { const i = st.akt ? INDEKS.get(st.akt) : 0; odaberi(P.DIJELOVI[(i - 1 + P.DIJELOVI.length) % P.DIJELOVI.length].id); });
$('k-dalje').addEventListener('click', () => { const i = st.akt ? INDEKS.get(st.akt) : -1; odaberi(P.DIJELOVI[(i + 1) % P.DIJELOVI.length].id); });
$('r-samo').checked = true;
$('r-samo').addEventListener('change', (e) => { st.istakni = e.target.checked; M.istakni(st.istakni && st.akt ? st.akt : null); trazi(); });

/* ================================================================== odabir mišem */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
let dolje = null;
function pogodak(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const h = ray.intersectObjects(M.grupa.children, true).find((x) => x.object.visible && !x.object.userData.bezDuha && (!x.object.material.transparent || x.object.material.opacity > 0.2));
  if (!h) return null;
  const iz = M.izradakOd(h.object);
  if (iz) { const g = M.izradci.get(iz); return g ? g.userData.dioMps : null; }
  return M.dioOd(h.object);
}
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dolje || Math.hypot(e.clientX - dolje[0], e.clientY - dolje[1]) > 5) return;
  const id = pogodak(e); if (id) odaberi(id, false);
});
let hoverT = 0;
renderer.domElement.addEventListener('pointermove', (e) => {
  const now = performance.now(); if (now - hoverT < 60 || e.buttons) return; hoverT = now;
  const id = pogodak(e), ob = $('oblacic');
  if (!id) { ob.hidden = true; return; }
  const r = scenaEl.getBoundingClientRect();
  ob.textContent = P.nadjiDio(id).naziv; ob.hidden = false;
  ob.style.left = Math.min(r.width - 160, e.clientX - r.left + 14) + 'px'; ob.style.top = (e.clientY - r.top + 12) + 'px';
});
renderer.domElement.addEventListener('pointerleave', () => { $('oblacic').hidden = true; });

/* ================================================================== prikaz rada (logika linije) */
function zapocniRad() {
  const L = napraviLiniju();
  L.napuniSpremnik(['crveno', 'alu', 'crno', 'crveno', 'alu-24', 'alu', 'crno-23', 'crveno']);
  L.resetLinije(); for (let i = 0; i < 600 && !L.redoslijed.every((s) => s.stanje === 'spremna'); i++) L.azuriraj(0.1);
  L.startLinije();
  st.L = L;
}
function statLinije() {
  const L = st.L; if (!L) { $('z-stat').textContent = ''; return; }
  $('z-stat').textContent = `dobri ${L.stat.dobri} · škart ${L.stat.skart} · sklopljeni ${L.stat.sklopljeni} · u spremniku ${L.dist.spremnik.length}`;
}
$('t-rad').addEventListener('click', () => {
  st.rad = !st.rad; $('t-rad').setAttribute('aria-pressed', String(st.rad)); $('t-rad').textContent = st.rad ? 'Zaustavi prikaz' : 'Prikaz rada';
  if (st.rad && !st.L) zapocniRad();
  trazi();
});
$('t-pocetno').addEventListener('click', () => { st.rad = false; st.L = null; $('t-rad').setAttribute('aria-pressed', 'false'); $('t-rad').textContent = 'Prikaz rada'; M.pocetno(ORG); statLinije(); pogled('linija'); });
$('brzina').addEventListener('click', (e) => { const b = e.target.closest('[data-brzina]'); if (!b) return; st.brzina = +b.dataset.brzina; $('brzina').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });

/* ================================================================== petlja */
function okvir(t) {
  rafId = 0;
  const dt = Math.min(0.1, (t - zadnje) / 1000); zadnje = t;
  let dalje = false;
  if (let_) { const u = Math.min(1, (t - let_.t0) / let_.d), e = u * u * (3 - 2 * u); camera.position.lerpVectors(let_.p0, let_.p1, e); controls.target.lerpVectors(let_.c0, let_.c1, e); if (u >= 1) let_ = null; dalje = true; }
  if (st.rad && st.L) {
    const L = st.L;
    L.azuriraj(dt * st.brzina);
    if (L.dist.spremnik.length < 2 && L.stat.ubaceno < 60) L.dodajUSpremnik(['crveno', 'alu', 'crno', 'alu-24', 'crveno', 'alu'][L.stat.ubaceno % 6]);
    if (L.isp.skart.length >= 3) L.isprazniSkart();
    if (L.rob.izlaz.length >= 5) L.isprazniIzlaz();
    if (L.robot.izlaz(5)) L.dopuniPaletu();
    if (L.rob.poklopci.stog.length < 2 || L.rob.opruge.stog.length < 2) L.dopuniSpremnike();
    M.postavi(L.stanjeModela(), { dist: L.lampice('dist'), isp: L.lampice('isp'), obr: L.lampice('obr') });
    if (st.istakni && st.akt && st.akt.startsWith('i')) M.istakni(st.akt);
    statLinije();
    dalje = true;
  }
  if (controls.update()) dalje = true;
  renderer.render(scene, camera);
  if (dalje) trazi();
}
controls.addEventListener('change', trazi);
function velicina() {
  const w = scenaEl.clientWidth, h = scenaEl.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); trazi();
}
new ResizeObserver(velicina).observe(scenaEl);

/* ================================================================== teme */
const dlg = $('tema-dlg'); let tema = null;
function otvoriTemu(id) {
  if (!TEME[id]) return;
  $('tema-naslov').textContent = 'Kako radi: ' + TEME[id].naslov;
  if (tema) { tema.unisti(); tema = null; }
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  tema = prikazi($('tema-el'), id);
}
function zatvoriTemu() { if (tema) { tema.unisti(); tema = null; } if (dlg.open) dlg.close(); }
$('tema-zatvori').addEventListener('click', zatvoriTemu);
dlg.addEventListener('close', () => { if (!dlg.open && tema) { tema.unisti(); tema = null; } });   /* zakašnjeli „close” ne smije uništiti novootvorenu temu */
$('teme-popis').innerHTML = P.TEME_POPIS.map((t) => {
  const dj = P.dijeloviTeme(t.id).slice(0, 4).map((d) => d.naziv).join(', ');
  return `<li><button type="button" data-tema="${t.id}"><b>${esc(t.naslov)}</b><span class="e">${esc(t.engl)}</span><span class="d">${esc(dj)}</span></button></li>`;
}).join('');
$('teme-broj').textContent = P.TEME_POPIS.length + ' animacija';
$('teme-popis').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if (b) otvoriTemu(b.dataset.tema); });

/* ================================================================== tok materijala, izradci, upravljanje, podaci */
$('tok-in').innerHTML = P.TOK.map((t) => `<div class="uz-blok"><h3><button type="button" class="pok" data-pogled="${t.stanica}">${esc(P.STANICE[t.stanica].naziv)}</button></h3><ol>${t.koraci.map((k) => `<li>${esc(k)}</li>`).join('')}</ol></div>`).join('');
$('tok-in').addEventListener('click', (e) => { const b = e.target.closest('[data-pogled]'); if (b) { pogled(b.dataset.pogled); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
const oz = (v) => v ? ' <span class="uz-oz">pretpostavka</span>' : '';
{
  const K = P.IZRADCI.kuciste, I = P.IZRADCI;
  const mm = (m) => String(Math.round(m * 10000) / 10).replace('.', ',') + ' mm';
  $('izradci-in').innerHTML = `<div class="uz-podaci-in">
  <div class="uz-blok"><h3>Kućišta</h3><div class="uz-tbl-omot"><table class="uz-tbl"><thead><tr><th>Boja</th><th>Visina</th><th>Materijal</th><th>Ispitna (${esc(P.KONFIG.logikaIspitne)})</th></tr></thead><tbody>
  ${K.vrste.map((v) => `<tr><td>${esc(v.naziv)}</td><td class="br">${mm(v.visina)}</td><td>${esc(v.materijal)}</td><td>${P.procjenaIspitne(v.id, v.visina) ? 'dobar' : 'škart'}</td></tr>`).join('')}
  ${K.skart.map((h) => `<tr><td>škart (sve boje)</td><td class="br">${mm(h)}</td><td>—</td><td>${P.procjenaIspitne('crveno', h) ? 'dobar' : 'škart'}</td></tr>`).join('')}
  </tbody></table></div><p class="pom">Promjer ${mm(K.promjer)}. ${esc(K.napomena)} [${esc(K.izvor)}]</p></div>
  <div class="uz-blok"><h3>Klip, opruga, poklopac</h3><div class="uz-tbl-omot"><table class="uz-tbl"><thead><tr><th>Dio</th><th>Mjere</th><th>Napomena</th></tr></thead><tbody>
  <tr><td>klip</td><td class="br">Ø${mm(I.klip.promjer)} × ${mm(I.klip.visina)}${oz(true)}</td><td>${esc(I.klip.vrste.map((v) => v.naziv + ' → ' + v.zaKuciste.join(', ')).join('; '))}</td></tr>
  <tr><td>opruga</td><td class="br">Ø${mm(I.opruga.promjer)} × ${mm(I.opruga.visina)}${oz(true)}</td><td>tlačna, na svornjak klipa</td></tr>
  <tr><td>poklopac</td><td class="br">Ø${mm(I.poklopac.promjer)} × ${mm(I.poklopac.visina)}${oz(true)}</td><td>zabravljuje se zakretom</td></tr>
  </tbody></table></div><p class="pom">${esc(I.komplet)} Najveća širina izratka u stanici ${mm(I.najvecaSirina)}. [${esc(I.izvor)}]</p></div></div>`;
}
{
  const tbl = (naslov, red) => `<div class="uz-tbl-omot"><table class="uz-tbl"><caption>${esc(naslov)}</caption><thead><tr><th>Signal</th><th>Značenje</th></tr></thead><tbody>${red.map((u) => `<tr><td class="br">${esc(u.oz)}</td><td>${esc(u.naziv)}</td></tr>`).join('')}</tbody></table></div>`;
  const io = ['dist', 'isp', 'obr'].map((id) => `<div class="uz-blok"><h3>${esc(P.STANICE[id].naziv)}</h3>${tbl('Ulazi', P.SIGNALI[id].ulazi)}${tbl('Izlazi', P.SIGNALI[id].izlazi)}<p class="pom">Izvor adresa: ${esc(P.SIGNALI[id].izvor)}.</p></div>`).join('');
  const RS = P.ROBOT_SUCELJE;
  const rob = `<div class="uz-blok"><h3>Robotska stanica: I/O kartica DUM1 (${esc(RS.kartica)})</h3>${tbl('Ulazi robota', RS.ulazi.map((u) => ({ oz: 'ulaz ' + u.bit, naziv: u.naziv + ' (' + u.izvor + ')' })))}${tbl('Izlazi robota', RS.izlazi.map((u) => ({ oz: 'izlaz ' + u.bit, naziv: u.naziv })))}<p class="pom">${esc(RS.sw1Bit5)}. Nužni stop: ${esc(RS.nuzni)}. <span class="uz-oz">pretpostavka</span></p></div>`;
  $('upr-in').innerHTML = `<p class="pom">Svaka stanica ima istu upravljačku ploču. Signali i adrese su prema primjeru Siemensa i opisima stanica; stvarne adrese linije nisu nađene i označene su kao pretpostavka.</p>
  <div class="uz-podaci-in"><div class="uz-blok"><h3>Elementi ploče</h3><div class="uz-tbl-omot"><table class="uz-tbl"><thead><tr><th>Element</th><th>Uloga</th></tr></thead><tbody>${P.PLOCA.elementi.map((e) => `<tr><td>${esc(e.naziv)}<br><span class="pom">${esc(e.vrsta)}</span></td><td>${esc(e.opis)}</td></tr>`).join('')}</tbody></table></div>
  <h3>Logika rada</h3><ol>${P.PLOCA.logika.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
  <h3>SysLink i StationLink</h3><p>${esc(P.SYSLINK.konektor)}: ${esc(P.SYSLINK.ulazi)}, ${esc(P.SYSLINK.izlazi)}; ${esc(P.SYSLINK.terminal)}. ${esc(P.SYSLINK.napomena)}</p><p>${esc(P.STATIONLINK.opis)}</p>
  <p class="pom">Napajanje ${esc(P.NAPAJANJE.napon)} (${esc(P.NAPAJANJE.struja)}), zrak ${esc(P.NAPAJANJE.zrak)}. Program robota: ${esc(P.PROGRAM_OPIS)}</p></div>
  ${io}${rob}</div>`;
}
$('podaci-in').innerHTML = Object.values(P.STANICE).map((s) => `<div class="uz-blok"><h3><button type="button" class="pok" data-pogled="${s.id}">${esc(s.naziv)}</button></h3><p>${esc(s.zadatak)}</p>
<div class="uz-tbl-omot"><table class="uz-tbl"><tbody><tr><td>Kolica</td><td>${esc(s.kolica)}</td></tr><tr><td>Moduli</td><td><ul>${s.moduli.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></td></tr><tr><td>Aktuatori</td><td><ul>${s.aktuatori.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></td></tr><tr><td>Senzori</td><td><ul>${s.senzori.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></td></tr><tr><td>Upravljanje</td><td>${esc(s.plc)}</td></tr><tr><td>Izvor</td><td>${esc(s.izvor)}</td></tr></tbody></table></div></div>`).join('');
$('podaci-in').addEventListener('click', (e) => { const b = e.target.closest('[data-pogled]'); if (b) { pogled(b.dataset.pogled); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

/* ================================================================== pretpostavke i izvori */
$('pretp-uvod').innerHTML = `<p>${esc(P.TEKST_PRETPOSTAVKE)}</p><p class="pom">Ukupno: ${PR.filter((p) => p.vrsta === 'pretpostavka').length} pretpostavki, ${PR.filter((p) => p.vrsta === 'sukob').length} sukoba izvora, ${PR.filter((p) => p.vrsta === 'nedostaje').length} podataka koji nedostaju.</p>`;
$('pretp-tablice').innerHTML = [['sukob', 'Sukobi izvora'], ['nedostaje', 'Podaci koji nedostaju'], ['pretpostavka', 'Pretpostavke']].map(([v, n]) => {
  const red = PR.filter((p) => p.vrsta === v);
  if (!red.length) return '';
  return `<div class="tablica-omot"><table class="uz-pr"><caption>${esc(n)} (${red.length})</caption><thead><tr><th>Što</th><th>Vrijednost</th><th>Napomena</th></tr></thead><tbody>${red.map((p) => `<tr><td>${p.id ? `<button type="button" class="pok" data-id="${p.id}">${esc(p.sto)}</button>` : esc(p.sto)}</td><td>${esc(p.vrijednost)}</td><td>${esc(p.napomena)}</td></tr>`).join('')}</tbody></table></div>`;
}).join('');
$('pretp-tablice').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { odaberi(b.dataset.id); $('k-scena').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
$('izvori').innerHTML = Object.entries(P.IZVORI).map(([k, v]) => `<li id="izvor-${esc(k)}"><b>[${esc(k)}]</b> ${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.naziv)}</a>` : esc(v.naziv)}</li>`).join('');

/* ================================================================== pokretanje */
$('hero-brojke').textContent = `${Object.keys(P.STANICE).length} stanice · ${P.DIJELOVI.length} dijelova · ${P.TEME_POPIS.length} animacija · ${PR.length} označenih pretpostavki. Prijeđi mišem preko modela za naziv dijela, klikni dio da ga odabereš.`;
izbornik();
velicina();
pogled('linija', false);
$('ucitavanje').remove();
renderer.render(scene, camera);
window.MPS_UPOZNAVANJE = { M, st, odaberi, otvoriTemu, zatvoriTemu, pogled };
