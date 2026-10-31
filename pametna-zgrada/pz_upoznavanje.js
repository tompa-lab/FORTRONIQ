/* FORTRONIQ · Pametna zgrada — Upoznavanje zgrade (3D).
   Dijelovi zgrade (izbornik, isticanje, opis, podaci, pretpostavke, izvori, signali), pogledi kamere,
   doba dana i godišnje doba (položaj Sunca, zračenje, procjena proizvodnje, žaluzine i rasvjeta).
   Svi nazivi, opisi i brojevi iz pz_podaci.js, Sunce i fotonapon iz pz_fizika.js. Iscrtavanje na zahtjev.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DIJELOVI, SKUPINE, PRETP, SIGNALI, IZVORI, SCENARIJI, ZGRADA } from './pz_podaci.js';
import { napraviModel } from './pz_model.js';
import { sunce, tVani, fnSnaga } from './pz_fizika.js';

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
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.2, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.maxDistance = 120; controls.minDistance = 3; controls.maxPolarAngle = Math.PI * 0.49;
const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6); scene.add(sun); scene.add(sun.target);
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
pogled('jug', true);

/* ================================================================== odabir i isticanje */
let odabran = null, iznad = null;
function istakni() {
  const samo = $('r-samo').checked;
  SVI.forEach((m) => {
    const d = m.userData.dio;
    const em = m.material.emissive; if (!em) return;
    em.setHex(m.userData.osnovna || 0);
    if (d === odabran && d !== 'zgrada') em.setRGB(0.05, 0.42, 0.46);
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
  $('k-skupina').textContent = (SKUPINE.find((s) => s.id === d.skupina) || {}).naziv + ' · ' + d.engl;
  $('k-tekst').innerHTML = d.tekst.map((t) => `<p>${esc(t)}</p>`).join('');
  const pod = Object.entries(d.podaci || {});
  $('k-podaci').hidden = !pod.length;
  $('k-podaci').innerHTML = pod.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  $('k-pretp').innerHTML = (d.pretp || []).length ? `<p class="uz-pretp"><b>Pretpostavka modela:</b> ${d.pretp.map((k) => esc(PRETP[k].t) + (PRETP[k].jed ? ' — ' + esc(hrBroj(PRETP[k].v)) + ' ' + esc(PRETP[k].jed) : '')).join('; ')}. Zamjenjuje se stvarnim podatkom zgrade.</p>` : '';
  const izv = [d.izvor, d.izvor2].filter(Boolean).map((k) => IZVORI[k]);
  $('k-izvor').hidden = !izv.length;
  $('k-izvor').innerHTML = izv.length ? 'Izvor: ' + izv.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.naziv)}</a>`).join(' · ') : '';
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

/* ================================================================== doba dana i godine */
const DANI = SCENARIJI.filter((s) => ['zima', 'usteda', 'ljeto', 'oblacno'].includes(s.id));
$('t-dan').innerHTML = DANI.map((s) => `<option value="${s.id}">${esc(s.datum)} (${esc(s.naziv.toLowerCase())})</option>`).join('');
$('t-dan').value = 'usteda';
function doba() {
  const S = SCENARIJI.find((s) => s.id === $('t-dan').value);
  const sat = parseFloat($('t-sat').value);
  const obl = S.obl[Math.min(23, Math.floor(sat))];
  const su = sunce(S.dan, sat, obl);
  const tv = tVani(sat, S.tMin, S.tMax);
  const fn = fnSnaga(su.poaFN, tv);
  /* položaj Sunca: smjer iz istoga modela (visina i satni kut) */
  const ljetno = S.dan >= 88 && S.dan <= 298;
  const om = 15 * (sat - (ljetno ? 1 : 0) - 0.0653 - 12) * Math.PI / 180;
  const vis = Math.asin(Math.min(1, su.sinh));
  const r = 80;
  sun.position.set(-Math.sin(om) * Math.cos(vis) * r, Math.max(2, Math.sin(vis) * r), Math.cos(om) * Math.cos(vis) * r);
  sun.intensity = su.sinh > 0.01 ? 0.4 + 1.4 * Math.min(1, su.ghi / 800) : 0.05;
  hemi.intensity = su.sinh > 0.01 ? 0.7 + 0.6 * Math.min(1, su.ghi / 600) : 0.35;
  const zal = su.ghi > 350;
  M.zaluzine(zal ? 0.7 : 0);
  const dnevno = 0.03 * 115 * su.ghi * (zal ? 0.4 : 1);
  const nast = sat >= 7.5 && sat < 15;
  const ras = nast ? Math.max(0, Math.min(1, (500 - dnevno) / 500)) : 0;
  M.rasvjeta(ras);
  const hh = Math.floor(sat), mm = Math.round((sat - hh) * 60);
  $('t-sat-out').textContent = String(hh).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0');
  $('t-info').textContent = `Vani ${hr(tv)} °C · zračenje ${Math.round(su.ghi)} W/m² · fotonapon ≈ ${hr(fn)} kW · žaluzine ${zal ? 'spuštene' : 'podignute'} · rasvjeta ${Math.round(ras * 100)} %` + (nast ? ' · nastava' : '');
  istakni();
}
$('t-sat').addEventListener('input', doba); $('t-dan').addEventListener('change', doba);
doba();

/* ================================================================== tablice ispod modela */
$('signali-in').innerHTML = `<div class="uz-tbl-omot"><table class="uz-tbl"><caption>Ulazi i izlazi upravljačkog sustava <span class="uz-oz">pretpostavka adresa</span></caption><thead><tr><th>Oznaka</th><th>Vrsta</th><th>Adresa</th><th>Opis</th><th>Jedinica</th></tr></thead><tbody>` +
  SIGNALI.map((s) => `<tr><td><b>${esc(s.id)}</b></td><td>${esc(s.vrsta)}</td><td>${esc(s.adr)}</td><td>${esc(s.naziv)}</td><td>${esc(s.jed)}</td></tr>`).join('') + '</tbody></table></div>';
$('pretp-in').innerHTML = `<div class="uz-tbl-omot"><table class="uz-pr"><thead><tr><th>Pretpostavka</th><th>Vrijednost</th></tr></thead><tbody>` +
  Object.values(PRETP).filter((x) => x.jed).map((x) => `<tr><td>${esc(x.t)}</td><td>${esc(hrBroj(x.v))} ${esc(x.jed)}</td></tr>`).join('') +
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
kartica(IND.has(hash) ? hash : 'zgrada');
if (!IND.has(hash)) pogled('jug', true);
requestAnimationFrame(petlja);
window.__pz = { ok: true, dijelova: DIJELOVI.length, mreza: SVI.length, zgrada: ZGRADA.kratko };
