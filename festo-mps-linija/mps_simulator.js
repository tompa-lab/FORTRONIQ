/* FORTRONIQ · Festo MPS linija — Simulator linije.
   Logika linije: mps_tok.js (slijed koraka svake stanice, StationLink, robot u interpreteru DUM1 iz područja RV-M1);
   3D: mps_model.js (stanice + robot i kolica iz područja RV-M1). Upravljačke ploče, spremnik, praćenje izratka,
   program robota s trenutnim retkom i izmjenom, ulazi/izlazi, statistika i dnevnik. Svi podaci iz mps_podaci.js.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as P from './mps_podaci.js';
import { napraviModelLinije } from './mps_model.js';
import { napraviLiniju } from './mps_tok.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',').replace('-', '−');
const STANJA = { 'ceka-reset': 'čeka RESET', inicijalizacija: 'inicijalizacija', spremna: 'spremna', radi: 'radi', stop: 'STOP', nuzni: 'nužni stop', greska: 'greška' };

/* ================================================================== linija i scena */
let L = napraviLiniju();
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
scenaEl.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.02, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxDistance = 8; controls.minDistance = 0.12; controls.maxPolarAngle = Math.PI * 0.495;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.3));
{ const d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(1.5, 3, 2.5); scene.add(d1); const d2 = new THREE.DirectionalLight(0xffffff, 0.5); d2.position.set(-2, 1.5, -1.5); scene.add(d2); }
const M = napraviModelLinije(THREE, { kabeli: false, uzorci: false, pod: true });   /* bez spiralnog kabela: obnavlja se pri svakom gibanju robota */
scene.add(M.grupa);
const V = M.V;
/* oznaka praćenog izratka */
const strelica = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0x19b7c9, emissive: 0x19b7c9, emissiveIntensity: 0.6 }));
strelica.rotation.x = Math.PI; strelica.visible = false; strelica.userData.bezDuha = true; scene.add(strelica);

/* ================================================================== stanje stranice */
const st = { pauza: false, brzina: 1, prati: '', kamera: false, ioSt: 'obr', autoMat: false, startRobota: false, logFiltar: 'sve' };
try { const s = JSON.parse(localStorage.getItem('ftq-mps-simulator') || '{}'); if (s.brzina) st.brzina = s.brzina; if (s.ioSt) st.ioSt = s.ioSt; } catch (e) { /* bez spremanja */ }
const spremiPostavke = () => { try { localStorage.setItem('ftq-mps-simulator', JSON.stringify({ brzina: st.brzina, ioSt: st.ioSt })); } catch (e) { /* */ } };

/* ================================================================== kamera */
const POGLEDI = {
  linija: { n: 'Linija', p: [0.45, -1.55, 1.85], c: [0.95, 0.38, 0.82] },
  odozgo: { n: 'Odozgo', p: [0.9, -0.15, 3.0], c: [0.9, 0.38, 0.78] },
  dist: { n: 'Distribucijska', p: [0.0, -0.42, 1.18], c: [0.2, 0.42, 0.85] },
  isp: { n: 'Ispitna', p: [0.28, -0.45, 1.22], c: [0.55, 0.38, 0.92] },
  obr: { n: 'Obradna', p: [0.68, -0.38, 1.18], c: [0.9, 0.4, 0.88] },
  rob: { n: 'Robot', p: [1.62, -0.25, 1.25], c: [1.2, 0.4, 0.92] },
  mont: { n: 'Montaža', p: [1.85, -0.3, 1.2], c: [1.5, 0.38, 0.84] }
};
let let_ = null;
const faktor = () => (camera.aspect < 16 / 9 ? Math.pow((16 / 9) / camera.aspect, 0.6) : 1);
function pogled(ime, glatko = true) {
  const p = POGLEDI[ime]; const c = V(...p.c), poz = c.clone().add(V(...p.p).sub(c).multiplyScalar(faktor()));
  if (!glatko) { camera.position.copy(poz); controls.target.copy(c); controls.update(); }
  else let_ = { t0: performance.now(), d: 800, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz, c1: c };
  $('pogledi').querySelectorAll('[data-pogled]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pogled === ime)));
  trazi();
}
$('pogledi').innerHTML = Object.entries(POGLEDI).map(([k, p]) => `<button type="button" class="gumb tanki" data-pogled="${k}" aria-pressed="false">${esc(p.n)}</button>`).join('');
$('pogledi').addEventListener('click', (e) => { const b = e.target.closest('[data-pogled]'); if (b) pogled(b.dataset.pogled); });

/* ================================================================== upravljačke ploče (HTML) */
const IDS = ['dist', 'isp', 'obr', 'rob'];
function napraviPloce() {
  $('ploce').innerHTML = IDS.map((id) => `<div class="sm-ploca" data-st="${id}"><div class="sm-ploca-h"><h3>${esc(P.STANICE[id].naziv)}</h3><span class="sm-stanje" data-el="stanje"></span></div>
  <div class="sm-lampe"><span class="sm-lam zel" data-lam="start" title="žaruljica START"></span><span class="sm-lam pl" data-lam="reset" title="žaruljica RESET"></span><span class="sm-lam bij" data-lam="q1" title="lampica Q1"></span><span class="sm-lam zut" data-lam="q2" title="lampica Q2"></span></div>
  <div class="sm-tipke"><button type="button" class="sm-t zel" data-t="START" aria-label="START — ${esc(P.STANICE[id].kratko)}">START</button><button type="button" class="sm-t crv" data-t="STOP" aria-label="STOP — ${esc(P.STANICE[id].kratko)}">STOP</button><button type="button" class="sm-t pl" data-t="RESET" aria-label="RESET — ${esc(P.STANICE[id].kratko)}">RESET</button>
  <button type="button" class="sm-t kljuc" data-t="AUTO" aria-pressed="true" aria-label="Ključ AUTO/MAN — ${esc(P.STANICE[id].kratko)}">AUTO</button><button type="button" class="sm-t gljiva" data-t="GLJIVA" aria-pressed="false" aria-label="Gljiva nužni stop — ${esc(P.STANICE[id].kratko)}">STOP u nuždi</button></div>
  <p class="sm-opis" data-el="opis"></p></div>`).join('');
  $('ploce').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const id = b.closest('[data-st]').dataset.st, t = b.dataset.t;
    if (t === 'AUTO') { const s = L.stanice[id]; L.ploca(id, 'AUTO', !s.auto); }
    else if (t === 'GLJIVA') { const s = L.stanice[id]; L.ploca(id, 'GLJIVA', !s.gljiva); M.gljiva(id, L.stanice[id].gljiva); }
    else L.ploca(id, t);
    osvjeziPloce(); trazi();
  });
}
function osvjeziPloce() {
  IDS.forEach((id) => {
    const el = $('ploce').querySelector(`[data-st="${id}"]`), s = L.stanice[id], lam = L.lampice(id);
    const sEl = el.querySelector('[data-el="stanje"]');
    const txt = STANJA[s.stanje] + (s.zastoj ? ' · zastoj' : '');
    if (sEl.textContent !== txt) sEl.textContent = txt;
    sEl.className = 'sm-stanje s-' + s.stanje + (s.zastoj ? ' zastoj' : '');
    for (const k of ['start', 'reset', 'q1', 'q2']) el.querySelector(`[data-lam="${k}"]`).classList.toggle('on', !!lam[k]);
    const kl = el.querySelector('[data-t="AUTO"]'); kl.textContent = s.auto ? 'AUTO' : 'MAN'; kl.setAttribute('aria-pressed', String(s.auto));
    el.querySelector('[data-t="GLJIVA"]').setAttribute('aria-pressed', String(!!s.gljiva));
    let op = s.stanje === 'inicijalizacija' || s.stanje === 'radi' ? (s.opis || '') : s.stanje === 'greska' && id === 'rob' ? (L.robot.stanje.greska.poruka || L.rob.greskaInit || '') : '';
    if (s.zastoj && op) op = 'čeka: ' + op;
    const o = el.querySelector('[data-el="opis"]'); if (o.textContent !== op) o.textContent = op;
  });
}
$('l-reset').addEventListener('click', () => { L.resetLinije(); trazi(); });
$('l-start').addEventListener('click', () => { L.startLinije(); trazi(); });

/* ================================================================== spremnik i materijal */
$('vrste').innerHTML = P.VRSTE_IZRADAKA.map((v) => `<button type="button" class="gumb tanki sm-vrsta v-${v.boja}${v.skart ? ' skart' : ''}" data-v="${v.id}"><i aria-hidden="true"></i>+ ${esc(v.naziv)}</button>`).join('');
$('vrste').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; if (!L.dodajUSpremnik(b.dataset.v)) poruka('Spremnik je pun (8 izradaka).'); osvjeziSpremnik(); trazi(); });
$('m-nasumicno').addEventListener('click', () => { const v = P.VRSTE_IZRADAKA; let n = 0; while (L.dist.spremnik.length < 8 && n++ < 8) L.dodajUSpremnik(v[Math.floor(Math.random() * v.length)].id); osvjeziSpremnik(); trazi(); });
$('m-isprazni').addEventListener('click', () => { L.isprazniSpremnik(); osvjeziSpremnik(); trazi(); });
$('m-logika').value = L.logika;
$('m-logika').addEventListener('change', (e) => L.postaviLogiku(e.target.value));
$('m-skart').addEventListener('click', () => { L.isprazniSkart(); trazi(); });
$('m-izlaz').addEventListener('click', () => { L.isprazniIzlaz(); trazi(); });
$('m-paleta').addEventListener('click', () => { L.dopuniPaletu(); trazi(); });
$('m-spremnici').addEventListener('click', () => { L.dopuniSpremnike(); trazi(); });
$('m-ploca').addEventListener('click', () => { L.pocistiPlocu(); trazi(); });
$('m-auto').addEventListener('change', (e) => { st.autoMat = e.target.checked; });
function osvjeziSpremnik() {
  const ol = $('stog');
  const html = L.dist.spremnik.map((id) => { const iz = L.izradci.get(id); return `<li class="sm-kom v-${iz.boja}${iz.skartIzradak ? ' skart' : ''}" title="${esc(L.opisIzratka(iz))}"><span>${esc(id)}</span></li>`; }).join('') || '<li class="prazno">prazan</li>';
  if (ol.innerHTML !== html) ol.innerHTML = html;
  $('spr-br').textContent = L.dist.spremnik.length + ' / 8';
  const R = L.rob;
  const mat = `Klizač škarta ${L.isp.skart.length}/3 · izlazni klizač ${R.izlaz.length}/${P.MJERE.rob.izlaz.kapacitet} · paleta: crni ${R.paleta.crni.filter(Boolean).length}, srebrni ${R.paleta.srebrni.filter(Boolean).length} · opruge ${R.opruge.stog.length + (R.opruge.uzimanje ? 1 : 0)} · poklopci ${R.poklopci.stog.length + (R.poklopci.uzimanje ? 1 : 0)}`;
  if ($('materijal').textContent !== mat) $('materijal').textContent = mat;
}

/* ================================================================== praćenje izratka */
function osvjeziPracenje() {
  const sel = $('t-prati');
  const kuc = [...L.izradci.values()].filter((i) => i.vrsta === 'kuciste' && i.gdje !== 'uklonjen');
  const opt = '<option value="">—</option>' + kuc.map((i) => `<option value="${i.id}"${i.id === st.prati ? ' selected' : ''}>${esc(i.id + ' · ' + L.opisIzratka(i))}</option>`).join('');
  if (sel.dataset.k !== opt) { sel.innerHTML = opt; sel.dataset.k = opt; }
  const iz = st.prati ? L.izradci.get(st.prati) : null;
  const box = $('pracenje');
  if (!iz) { box.hidden = true; strelica.visible = false; return; }
  box.hidden = false;
  const s = iz.sklop;
  const sk = s ? ['klip', 'opruga', 'poklopac'].filter((k) => s[k]).map((k) => k).join(', ') : '';
  const html = `<p><b>${esc(iz.id)}</b> · ${esc(L.opisIzratka(iz))} · sada: ${esc(iz.gdje)}${iz.status ? ' · ispitna: ' + esc(iz.status) : ''}${iz.izbusen ? ' · izbušen' : ''}${sk ? ' · u kućištu: ' + esc(sk) + (s.zabravljen ? ' (zabravljen)' : '') : ''}</p><ol>${iz.povijest.slice(-8).map((p) => `<li><span class="t">${hr(p.t)} s</span> ${esc(p.tekst)}</li>`).join('')}</ol>`;
  if (box.dataset.k !== html) { box.innerHTML = html; box.dataset.k = html; }
}
$('t-prati').addEventListener('change', (e) => { st.prati = e.target.value; osvjeziPracenje(); trazi(); });
$('t-kamera').addEventListener('change', (e) => { st.kamera = e.target.checked; });

/* ================================================================== program robota */
let progKljuc = '';
function osvjeziProgram() {
  const D = L.robot, s = D.stanje;
  const redci = [...s.program.keys()].sort((a, b) => a - b);
  const k = redci.join(',') + '|' + L.rob.ucitano;
  if (k !== progKljuc) {
    progKljuc = k;
    $('prog').innerHTML = redci.length ? redci.map((r) => `<div class="sm-red" role="listitem" data-r="${r}"><span class="br">${r}</span><code>${esc(s.program.get(r))}</code></div>`).join('') : '<p class="pom">Program još nije učitan — pritisni RESET na robotskoj stanici.</p>';
  }
  const akt = s.izvodi || L.rob.stanje === 'greska' ? (s.greska.redak || L.rob.redak) : null;
  const pre = $('prog').querySelector('.sm-red.akt');
  const nov = akt != null ? $('prog').querySelector(`.sm-red[data-r="${akt}"]`) : null;
  if (pre !== nov) {
    if (pre) pre.classList.remove('akt', 'gr');
    if (nov) { nov.classList.add('akt'); nov.classList.toggle('gr', s.greska.tip > 0); const pr = $('prog'); const top = nov.offsetTop - pr.offsetTop; if (top < pr.scrollTop || top > pr.scrollTop + pr.clientHeight - 24) pr.scrollTop = top - pr.clientHeight / 2; }
  }
  const t = D.tocka();
  const led = s.led;
  const dum = `<span class="sm-led ${led.power ? 'on zel' : ''}">POWER</span><span class="sm-led ${led.error ? 'on crv' : ''}">ERROR</span><span class="sm-led ${led.execute ? 'on zut' : ''}">EXECUTE</span>
  <span class="sm-wh">${s.napajanje ? `X ${hr(t.x)} · Y ${hr(t.y)} · Z ${hr(t.z)} · P ${hr(t.p)} · R ${hr(t.r)} · ${t.oc}` : 'DUM1 isključen'}</span>
  ${s.greska.tip ? `<span class="sm-gr">pogreška ${s.greska.tip === 1 ? 'I.' : 'II.'} vrste: ${esc(s.greska.poruka)}${s.greska.redak ? ' (redak ' + s.greska.redak + ')' : ''}</span>` : ''}`;
  if ($('dum').dataset.k !== dum) { $('dum').innerHTML = dum; $('dum').dataset.k = dum; }
  const ps = s.izvodi ? 'izvodi · SP ' + s.sp : s.napajanje ? (s.nestGotov ? 'miruje' : 'čeka NEST') : 'isključen';
  if ($('p-stanje').textContent !== ps) $('p-stanje').textContent = ps;
}
$('p-tekst').value = L.rob.programTekst;
$('p-ucitaj').addEventListener('click', () => {
  const g = L.postaviProgram($('p-tekst').value);
  if (g.length) { $('p-poruka').textContent = 'Greške: ' + g.map((x) => 'redak ' + x.redak + ' („' + x.tekst.trim() + '”): ' + x.poruka).join('; '); $('p-poruka').className = 'info gr'; return; }
  $('p-poruka').textContent = 'Program je prihvaćen; robotska stanica izvodi RESET i START.'; $('p-poruka').className = 'info ok';
  L.ploca('rob', 'STOP'); L.ploca('rob', 'RESET'); st.startRobota = true; trazi();
});
$('p-zadani').addEventListener('click', () => { $('p-tekst').value = L.zadaniProgram; $('p-poruka').textContent = 'Zadani program je u uređivaču — pritisni „Učitaj”.'; $('p-poruka').className = 'info'; });

/* ================================================================== ulazi i izlazi */
$('io-st').innerHTML = IDS.map((id) => `<button type="button" data-io="${id}" aria-pressed="${id === st.ioSt}">${esc(P.STANICE[id].kratko)}</button>`).join('');
$('io-st').addEventListener('click', (e) => { const b = e.target.closest('[data-io]'); if (!b) return; st.ioSt = b.dataset.io; spremiPostavke(); $('io-st').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); osvjeziIO(true); });
function osvjeziIO() {
  const io = L.io(st.ioSt);
  const red = (u) => `<li class="${u.v ? 'on' : ''}"><i aria-hidden="true"></i><b>${esc(u.oz)}</b><span>${esc(u.naziv)}</span><span class="vh">${u.v ? '1' : '0'}</span></li>`;
  const html = `<div><h3>Ulazi</h3><ul>${io.ulazi.map(red).join('')}</ul></div><div><h3>Izlazi</h3><ul>${io.izlazi.map(red).join('')}</ul></div>`;
  if ($('io').dataset.k !== html) { $('io').innerHTML = html; $('io').dataset.k = html; }
}

/* ================================================================== statistika i dnevnik */
function osvjeziStat() {
  const s = L.stat;
  const html = [['Ubačeno u spremnik', s.ubaceno], ['Dobri (ispitna)', s.dobri], ['Škart (ispitna)', s.skart], ['Sklopljeni cilindri', s.sklopljeni], ['Nepotpuni sklopovi', s.nepotpuni], ['Ispušteni dijelovi', s.ispusteni], ['Uklonio operater', s.uklonjeni]].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
  if ($('stat').dataset.k !== html) { $('stat').innerHTML = html; $('stat').dataset.k = html; }
}
const NAZ = { dist: 'distribucijska', isp: 'ispitna', obr: 'obradna', rob: 'robotska', linija: 'linija' };
function dodajLog(z) {
  if (st.logFiltar !== 'sve' && (st.logFiltar === 'greska' ? !['greska', 'upoz'].includes(z.vrsta) : z.stanica !== st.logFiltar)) return;
  const li = document.createElement('li'); li.className = 'v-' + z.vrsta;
  li.innerHTML = `<span class="t">${hr(z.t)} s</span> <b>${esc(NAZ[z.stanica] || z.stanica)}</b> ${esc(z.tekst)}`;
  const ol = $('dnevnik'); ol.prepend(li); while (ol.children.length > 200) ol.lastChild.remove();
}
function spojiDnevnik() { $('dnevnik').innerHTML = ''; L.dnevnik.slice(-200).forEach(dodajLog); L.na('dnevnik', dodajLog); }
$('log-filtar').addEventListener('change', (e) => { st.logFiltar = e.target.value; $('dnevnik').innerHTML = ''; L.dnevnik.slice(-200).forEach(dodajLog); });

/* ================================================================== simulacijska petlja */
function poruka(t) { $('sc-oznaka').textContent = t; clearTimeout(poruka.id); poruka.id = setTimeout(() => { $('sc-oznaka').textContent = ''; }, 3500); }
let rafId = 0, zadnje = performance.now(), uiT = 0;
function trazi() { if (!rafId && !document.hidden) { zadnje = performance.now(); rafId = requestAnimationFrame(okvir); } }
document.addEventListener('visibilitychange', () => { if (!document.hidden) trazi(); });
function operater() {
  if (L.isp.skart.length >= 3) L.isprazniSkart();
  if (L.rob.izlaz.length >= P.MJERE.rob.izlaz.kapacitet - 1) L.isprazniIzlaz();
  if (L.robot.izlaz(5)) L.dopuniPaletu();
  if (L.rob.poklopci.stog.length < 2 || L.rob.opruge.stog.length < 2) L.dopuniSpremnike();
}
function okvir(t) {
  rafId = 0;
  const dt = Math.min(0.25, (t - zadnje) / 1000); zadnje = t;   /* sporo iscrtavanje ne usporava simulaciju (do 0,25 s po slici) */
  let dalje = false;
  if (let_) { const u = Math.min(1, (t - let_.t0) / let_.d), e = u * u * (3 - 2 * u); camera.position.lerpVectors(let_.p0, let_.p1, e); controls.target.lerpVectors(let_.c0, let_.c1, e); if (u >= 1) let_ = null; dalje = true; }
  if (!st.pauza) {
    L.azuriraj(dt * st.brzina);
    if (st.autoMat) operater();
    if (st.startRobota && L.rob.stanje === 'spremna') { st.startRobota = false; L.ploca('rob', 'START'); }
    if (st.startRobota && L.rob.stanje === 'greska') st.startRobota = false;
    dalje = true;
  }
  M.postavi(L.stanjeModela(), { dist: L.lampice('dist'), isp: L.lampice('isp'), obr: L.lampice('obr') });
  const iz = st.prati ? L.izradci.get(st.prati) : null;
  if (iz && iz.gdje !== 'uklonjen') {
    strelica.visible = true; strelica.position.copy(V(iz.p[0], iz.p[1], iz.p[2] + (iz.visina || 0.02) + 0.035 + 0.006 * Math.sin(t / 200)));
    if (st.kamera) { const c = V(iz.p[0], iz.p[1], iz.p[2]); controls.target.lerp(c, 0.08); }
  } else strelica.visible = false;
  uiT += dt;
  if (uiT > 0.15) { uiT = 0; osvjeziPloce(); osvjeziSpremnik(); osvjeziProgram(); osvjeziIO(); osvjeziStat(); osvjeziPracenje(); $('sim-t').textContent = 't = ' + hr(L.t) + ' s'; }
  controls.update();
  renderer.render(scene, camera);
  if (dalje || st.kamera) trazi();
}
controls.addEventListener('change', trazi);
$('t-pauza').addEventListener('click', () => { st.pauza = !st.pauza; $('t-pauza').setAttribute('aria-pressed', String(st.pauza)); $('t-pauza').textContent = st.pauza ? 'Nastavi' : 'Pauza'; trazi(); });
document.querySelectorAll('[data-brzina]').forEach((b) => {
  b.setAttribute('aria-pressed', String(+b.dataset.brzina === st.brzina));
  b.addEventListener('click', () => { st.brzina = +b.dataset.brzina; spremiPostavke(); document.querySelectorAll('[data-brzina]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
});
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); trazi(); }
new ResizeObserver(velicina).observe(scenaEl);

/* ================================================================== tekstovi ispod simulatora (iz podataka) */
$('koraci-rada').innerHTML = [
  'Stavi izratke u spremnik (gumbi „+ crveno 25 mm” itd.) ili „Napuni nasumično”. Na početku je u spremniku šest izradaka.',
  'Pritisni RESET linije (ili RESET na svakoj ploči): inicijalizacija ide protiv toka materijala — najprije robotska stanica (DUM1 se uključuje i izvodi NEST, program se učitava), zatim obradna, ispitna i distribucijska. Kad na pločama zasvijetli START, stanice su spremne.',
  'Pritisni START linije: stanice rade u načinu AUTO (ključem prebaci na MAN za jedan ciklus). Distribucijska izbacuje izradak, ispitna ga prepoznaje i mjeri, obradna ga ispituje i buši, a robot ga preuzima i sklapa cilindar.',
  'Prati signale odabrane stanice u tablici ulaza i izlaza, redak programa robota i dnevnik. Odaberi izradak u „Prati izradak” za njegov put kroz liniju.',
  'Zaustavi stanicu tipkom STOP (za nastavak RESET pa START) ili pritisni gljivu na bilo kojoj ploči: cijela linija staje, a robot ulazi u pogrešku I. vrste. Izvuci gljivu i pritisni RESET linije.'
].map((x) => `<li>${esc(x)}</li>`).join('');
$('zadaci').innerHTML = [
  'Pokreni liniju s mješavinom izradaka i provjeri da broj dobrih i škarta odgovara visinama u tablici izradaka.',
  'Pusti da se klizač škarta napuni (tri komada): ispitna stanica javlja zastoj (lampica Q2). Nađi uzrok u opisu ploče i u dnevniku i ukloni ga.',
  'Promijeni logiku ispitne stanice na „nazivna visina prema boji”: crno kućište sada prolazi — provjeri da robot u njega stavlja srebrni klip.',
  'U programu robota promijeni brzinu (redak 20 SP 5 → SP 8), učitaj program i usporedi vrijeme ciklusa robota.',
  'Upiši u poziciju 4 točku izvan dosega (npr. PD 4, 700.0, 0.0, 100.0, -90.0, 0.0): robot staje pogreškom II. vrste na retku MO 4. Vrati zadani program i pritisni RESET.',
  'Kad paleta klipova ostane prazna, robot uključuje izlaz 5 i čeka ulaz 7. Dopuni paletu i prati kako program nastavlja (redci 600–695).'
].map((x) => `<li>${esc(x)}</li>`).join('');
$('veza').textContent = 'Upravljač obradne stanice javlja robotu „izradak spreman”, a robot nakon hvata javlja „preuzeto”; robot sam upravlja spremnicima opruga i poklopaca. ' + P.ROBOT_SUCELJE.sw1Bit5 + '. Nužni stop: ' + P.ROBOT_SUCELJE.nuzni + '.';
$('t-sucelje').innerHTML = '<thead><tr><th>Bit</th><th>Ulaz DUM1</th><th>Izlaz DUM1</th></tr></thead><tbody>' + P.ROBOT_SUCELJE.ulazi.map((u, i) => `<tr><td>${u.bit}</td><td>${esc(u.naziv)} <span class="pom">(${esc(u.izvor)})</span></td><td>${esc(P.ROBOT_SUCELJE.izlazi[i].naziv)}</td></tr>`).join('') + '</tbody>';
$('pojednostavljenja').innerHTML = [
  'Stanice rade po našem slijedu koraka napisanom prema opisima Festovih stanica i završnih radova; stvarni PLC programi linije nisu poznati.',
  'Aktuatori se gibaju jednoliko u zadanom vremenu; prigušivanje, tlak i masa nisu modelirani. Bušenje je postupak bez skidanja čestica.',
  'Robot je pravi interpreter jezika Movemaster s kinematikom RV-M1, ali sudari se ne provjeravaju; hvat izratka uspijeva kad je vrh alata unutar 12 mm od izratka.',
  'Na RESET robotske stanice simulator sam isključi i uključi DUM1 i izvede NEST — na pravom robotu to radi operater.',
  'Kod inicijalizacije simulator sam uklanja izratke koji su ostali na sisaljci, u prihvatnici ili u gnijezdu (u stvarnosti ih uklanja operater).',
  'Vremena aktuatora, kapaciteti klizača i spremnika te raspored modula na robotskoj stanici su procjena.'
].map((x) => `<li>${esc(x)}</li>`).join('');
const PR = P.pretpostavke();
const VAZNE = /vremena|logika|gnijezda|raspored mjesta|dodjela ulaza|točke robota|nužni stop|uloga dviju|položaj robota|upravljanje robotske|adrese|kapacitet|prag/i;
$('pp-uvod').textContent = P.TEKST_PRETPOSTAVKE;
$('pretpostavke').innerHTML = PR.filter((p) => VAZNE.test(p.sto)).map((p) => `<li><b>${esc(p.sto)}</b>${p.vrijednost ? ': ' + esc(p.vrijednost) : ''} — ${esc(p.napomena)}${p.vrsta === 'sukob' ? ' <span class="sm-oz sukob">sukob izvora</span>' : ''}</li>`).join('') + '<li>Ostale pretpostavke: <a href="upoznavanje-linije.html#pretpostavke">Upoznavanje linije</a>.</li>';
$('izvori').innerHTML = ['VUC19', 'VIC19', 'IP-RS15', 'ML-RS11', 'FC-200', 'FC-198', 'IP-SEP', 'ACAD', 'PATRAS', 'AALTO1', 'TUE'].map((k) => { const v = P.IZVORI[k]; return `<li><b>[${esc(k)}]</b> ${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.naziv)}</a>` : esc(v.naziv)}</li>`; }).join('');

/* ================================================================== pokretanje */
L.napuniSpremnik(['crveno', 'alu', 'crno', 'crveno-23', 'alu', 'crveno']);
napraviPloce();
spojiDnevnik();
velicina();
pogled('linija', false);
$('ucitavanje').remove();
okvir(performance.now());
window.MPS_SIM = { get L() { return L; }, M, st };
