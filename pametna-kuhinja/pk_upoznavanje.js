/* FORTRONIQ · Pametna kuhinja — Upoznavanje sustava (3D).
   Dijelovi kuhinje (izbornik, isticanje, opis, uloga, pretpostavke, signali), pogledi kamere i faza smjene
   (peć, roštilj, Robotino, perilica, alarm hladnjaka). Svi nazivi, opisi i brojevi iz pk_podaci.js. Iscrtavanje na zahtjev.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DIJELOVI, SKUPINE, PRETP, SIGNALI, KUHINJA } from './pk_podaci.js';
import { napraviModel } from './pk_model.js';
const ULOGA = { osjetnik: 'Osjetnik (ulaz)', aktuator: 'Aktuator (izlaz)', upravljac: 'Upravljač i nadzor' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',').replace('-', '−');
const hrBroj = (v) => { const s = String(v).replace('.', ','); const [c, d] = s.split(','); const cc = c.length > 4 ? c.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : c; return d ? cc + ',' + d : cc; };
const SIG = new Map(SIGNALI.map((s) => [s.id, s]));
const IND = new Map(DIJELOVI.map((d, i) => [d.id, i]));

/* ================================================================== scena */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = false;
scenaEl.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 300);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 30; controls.minDistance = 0.6; controls.maxPolarAngle = Math.PI * 0.49;
const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(6, 12, 8); scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-30, 20, -20); scene.add(fill);
const M = napraviModel(THREE);
scene.add(M.grupa);
const SVI = []; M.grupa.traverse((o) => { if (o.isMesh && o.userData.dio) SVI.push(o); });
const ucitavanje = $('ucitavanje'); if (ucitavanje) ucitavanje.remove();

let treba = true;
const zatrazi = () => { treba = true; };
controls.addEventListener('change', zatrazi);

function velicina() {
  const w = scenaEl.clientWidth || 600, h = scenaEl.clientHeight || 400;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); zatrazi();
}
new ResizeObserver(velicina).observe(scenaEl);

/* pogledi s glatkim prijelazom */
let prijelaz = null;
function pogled(id, odmah = false) {
  const p = M.POGLEDI[id]; if (!p) return;
  const doCam = new THREE.Vector3(...p.cam), doCilj = new THREE.Vector3(...p.cilj);
  if (odmah || matchMedia('(prefers-reduced-motion: reduce)').matches) { camera.position.copy(doCam); controls.target.copy(doCilj); controls.update(); zatrazi(); }
  else prijelaz = { t0: performance.now(), od: camera.position.clone(), odC: controls.target.clone(), doCam, doCilj };
  document.querySelectorAll('#pogledi button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pogled === id ? 'true' : 'false'));
}
$('pogledi').innerHTML = Object.entries(M.POGLEDI).map(([k, v]) => `<button type="button" class="gumb tanki" data-pogled="${k}" aria-pressed="false">${esc(v.naziv)}</button>`).join('');
$('pogledi').addEventListener('click', (e) => { const b = e.target.closest('button[data-pogled]'); if (b) pogled(b.dataset.pogled); });
pogled('cijela', true);

/* ================================================================== odabir i isticanje */
let odabran = null, iznad = null;
function istakni() {
  const samo = $('r-samo').checked;
  SVI.forEach((m) => {
    const d = m.userData.dio;
    const em = m.material.emissive; if (!em) return;
    em.setHex(m.userData.osnovna || 0);
    if (d === odabran) em.setRGB(0.05, 0.42, 0.46);
    else if (d === iznad) em.setRGB(0.02, 0.18, 0.2);
    if (m.material.userData.op0 === undefined) m.material.userData.op0 = m.material.opacity;
    const p = m.material.userData.op0;
    if (samo && odabran && d !== odabran) { m.material.transparent = true; m.material.opacity = Math.min(p, 0.18); }
    else { m.material.opacity = p; m.material.transparent = p < 1; }
  });
  zatrazi();
}
$('r-samo').addEventListener('change', istakni);

function kartica(id) {
  const d = DIJELOVI[IND.get(id)]; if (!d) return;
  odabran = id;
  $('k-naziv').textContent = d.naziv;
  $('k-skupina').textContent = (ULOGA[d.uloga] || '') + ' · ' + d.engl;
  $('k-tekst').innerHTML = d.tekst.map((t) => `<p>${esc(t)}</p>`).join('');
  $('k-podaci').hidden = true;
  $('k-pretp').innerHTML = (d.pretp || []).length ? `<p class="uz-pretp"><b>Procjena modela:</b> ${d.pretp.map((k) => esc(PRETP[k].t) + (PRETP[k].v !== '' ? ' — ' + esc(hrBroj(PRETP[k].v)) + (PRETP[k].jed ? '\u00a0' + esc(PRETP[k].jed) : '') : '')).join('; ')}.</p>` : '';
  $('k-izvor').hidden = true;
  const sig = (d.signali || []).map((s) => SIG.get(s)).filter(Boolean);
  $('k-signali').hidden = !sig.length;
  $('k-signali').innerHTML = sig.length ? `<p class="uz-dj-n">Signali upravljačkog sustava</p><ul class="uz-dj">${sig.map((s) => `<li><span class="cip" title="${esc(s.naziv)}">${esc(s.id)} · ${esc(s.vrsta)} ${esc(s.adr)}</span></li>`).join('')}</ul>` : '';
  document.querySelectorAll('#stablo .uz-st[data-dio]').forEach((b) => { const a = b.dataset.dio === id; b.classList.toggle('akt', a); b.setAttribute('aria-current', a ? 'true' : 'false'); });
  $('z-opis').textContent = 'Odabrano: ' + d.naziv + '.';
  const pg = M.POGLED_DIJELA[id]; if (pg) pogled(pg);
  istakni();
}

/* izbornik */
$('stablo').innerHTML = SKUPINE.map((s) => {
  const dd = DIJELOVI.filter((d) => d.skupina === s.id);
  return `<li><span class="uz-st skupina"><span class="t">${esc(s.naziv)}</span><span class="br">${dd.length}</span></span></li>` +
    dd.map((d) => `<li class="r2"><button type="button" class="uz-st" data-dio="${d.id}"><span class="t">${esc(d.naziv)}</span>${(d.pretp || []).length ? '<span class="pp" title="Sadrži pretpostavke"></span>' : ''}</button></li>`).join('');
}).join('');
$('brojac').textContent = DIJELOVI.length + ' dijelova';
$('stablo').addEventListener('click', (e) => { const b = e.target.closest('[data-dio]'); if (b) kartica(b.dataset.dio); });
$('k-prije').addEventListener('click', () => { const i = IND.get(odabran) ?? 0; kartica(DIJELOVI[(i - 1 + DIJELOVI.length) % DIJELOVI.length].id); });
$('k-dalje').addEventListener('click', () => { const i = IND.get(odabran) ?? -1; kartica(DIJELOVI[(i + 1) % DIJELOVI.length].id); });

/* klik i oblačić na modelu */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
const oblacic = $('oblacic');
function pogodak(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const h = ray.intersectObjects(SVI, false).find((x) => x.object.visible);
  return h ? h.object.userData.dio : null;
}
let dolje = null;
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dolje || Math.hypot(e.clientX - dolje[0], e.clientY - dolje[1]) > 6) return;
  const d = pogodak(e); if (d) kartica(d);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const d = pogodak(e);
  if (d !== iznad) { iznad = d; istakni(); }
  if (d) {
    const r = scenaEl.getBoundingClientRect();
    oblacic.hidden = false; oblacic.textContent = DIJELOVI[IND.get(d)].naziv;
    oblacic.style.left = Math.min(e.clientX - r.left + 14, r.width - 160) + 'px'; oblacic.style.top = (e.clientY - r.top + 12) + 'px';
  } else oblacic.hidden = true;
});
renderer.domElement.addEventListener('pointerleave', () => { oblacic.hidden = true; if (iznad) { iznad = null; istakni(); } });

/* ================================================================== faza smjene */
const FAZE = {
  priprema: { n: 'Priprema smjene (17:15)', pec: true, ros: false, burg: 0, rob: 'pult', per: false, al: false, tekst: 'Peć se grije od 17 h i još nije spremna za picu; roštilj se uključuje u 17:30; hladnjak drži 0–4 °C. Kuhinjski zaslon čeka prve narudžbe.' },
  servis: { n: 'Puna večer (19:30)', pec: true, ros: true, burg: 6, rob: 'put', per: false, al: false, tekst: 'UR3e priprema pice, peć i roštilj griju, sonda provjerava jezgru svakog burgera, Robotino vozi jela do pulta za konobare; napa radi.' },
  zatvaranje: { n: 'Nakon zatvaranja (22:45)', pec: false, ros: false, burg: 0, rob: 'suđe', per: true, al: false, tekst: 'Peć i roštilj su isključeni; perilica pere suđe dok je snaga mala; Robotino odvozi pladnjeve do perionice.' },
  kvar: { n: 'Kvar hladnjaka noću (00:30)', pec: false, ros: false, burg: 0, rob: 'pult', per: false, al: true, tekst: 'Kompresor radi, ali hladnjak se ne hladi: sirena i poruka dežurnom. Odluka o namirnicama upisuje se u HACCP zapis.' },
};
$('t-faza').innerHTML = Object.entries(FAZE).map(([k, v]) => `<option value="${k}">${esc(v.n)}</option>`).join('');
$('t-faza').value = 'servis';
function faza() {
  const f = FAZE[$('t-faza').value];
  M.pecGrije(f.pec); M.rostiljGrije(f.ros); M.brojBurgera(f.burg); M.robotino(f.rob); M.perilica(f.per); M.sirena(f.al); M.hladnjakAlarm(f.al);
  $('t-info').textContent = f.tekst;
  istakni();
}
$('t-faza').addEventListener('change', faza);
faza();

/* ================================================================== tablice ispod modela */
$('signali-in').innerHTML = `<div class="uz-tbl-omot"><table class="uz-tbl"><caption>Ulazi i izlazi upravljača <span class="uz-oz">primjer adresa</span></caption><thead><tr><th>Oznaka</th><th>Vrsta</th><th>Adresa</th><th>Opis</th><th>Raspon</th></tr></thead><tbody>` +
  SIGNALI.map((s) => `<tr><td><b>${esc(s.id)}</b></td><td>${esc(s.vrsta)}</td><td>${esc(s.adr)}</td><td>${esc(s.naziv)}</td><td>${esc(s.raspon)}</td></tr>`).join('') + '</tbody></table></div>';
$('pretp-in').innerHTML = `<div class="uz-tbl-omot"><table class="uz-pr"><thead><tr><th>Pretpostavka</th><th>Vrijednost</th></tr></thead><tbody>` +
  Object.values(PRETP).filter((x) => x.v !== '').map((x) => `<tr><td>${esc(x.t)}${x.s ? ' <span class="uz-oz">specifikacija</span>' : ''}</td><td>${esc(hrBroj(x.v))}${x.jed ? '\u00a0' + esc(x.jed) : ''}</td></tr>`).join('') +
  `<tr><td>${esc(PRETP.adrese.t)}</td><td>—</td></tr></tbody></table></div>`;

/* ================================================================== petlja */
function petlja(t) {
  requestAnimationFrame(petlja);
  if (prijelaz) {
    const k = Math.min(1, (t - prijelaz.t0) / 700), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(prijelaz.od, prijelaz.doCam, e); controls.target.lerpVectors(prijelaz.odC, prijelaz.doCilj, e);
    if (k >= 1) prijelaz = null; treba = true;
  }
  if (controls.update()) treba = true;
  if (!treba) return;
  treba = false; renderer.render(scene, camera);
}
velicina();
const hash = location.hash.replace('#', '');
kartica(IND.has(hash) ? hash : 'konstrukcija');
if (!IND.has(hash)) pogled('cijela', true);
requestAnimationFrame(petlja);
window.__pk = { ok: true, dijelova: DIJELOVI.length, mreza: SVI.length, naziv: KUHINJA.naziv };
