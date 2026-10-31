/* FORTRONIQ · Pametna kuhinja — Uređivač recepata: vrsta mesa, debljina, način i temperatura pečenja, vađenje po sondi
   ili po vremenu. Model jezgre i površine: ispeci() u pk_fizika.js; granice u pk_podaci.js (orijentacijske, provjeriti
   prema HACCP planu). Ocjena: sigurno i sočno / suho / nesigurno, zvjezdice i spremljeni recepti. © ForTroniQ d.o.o. */
import { MESO, NACINI } from './pk_podaci.js';
import { ispeci } from './pk_fizika.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const citaj = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const pisi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bez pohrane */ } };
const KLJUC = 'ftq-pametna-kuhinja-recepti';

$('r-meso').innerHTML = MESO.map((m) => `<option value="${m.id}">${esc(m.naziv)}</option>`).join('');
$('r-nacin').innerHTML = NACINI.map((n) => `<option value="${n.id}">${esc(n.naziv)}</option>`).join('');
const ZADACI = [
  { n: 'Burger za gosta', t: 'Pljeskavica 1,5 cm na roštilju: sigurna, a sočna.', r: { meso: 'mljeveno', debljina: 1.5, nacin: 'rostilj' } },
  { n: 'Pileći file', t: 'File 2 cm: sigurno ispečen ispod 20 minuta.', r: { meso: 'piletina', debljina: 2, nacin: 'rostilj' }, maxMin: 20 },
  { n: 'Dimljeni vrat', t: 'Svinjski vrat 2,5 cm toplo dimljen: sigurno i sočno.', r: { meso: 'svinjski', debljina: 2.5, nacin: 'dim' } },
  { n: 'Odrezak na točku', t: 'Junetina 3 cm na roštilju, jezgra 55–66 °C.', r: { meso: 'junetina', debljina: 3, nacin: 'rostilj' } },
];
let zadatak = null;
$('r-zadaci').innerHTML = ZADACI.map((z, i) => `<button type="button" class="pk-zad" data-z="${i}"><b>${esc(z.n)}</b><span>${esc(z.t)}</span></button>`).join('');
$('r-zadaci').addEventListener('click', (e) => {
  const b = e.target.closest('[data-z]'); if (!b) return;
  zadatak = ZADACI[+b.dataset.z];
  document.querySelectorAll('.pk-zad').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  Object.entries(zadatak.r).forEach(([k, v]) => { $('r-' + k).value = String(v); });
  nacin(); meso();
  $('r-zad-t').textContent = 'Zadatak: ' + zadatak.t;
});

function nacin() {
  const N = NACINI.find((x) => x.id === $('r-nacin').value);
  const t = $('r-temp'); t.min = N.tMin; t.max = N.tMax; t.step = 5;
  if (+t.value < N.tMin || +t.value > N.tMax || !zadatakTemp) t.value = N.t;
  zadatakTemp = false;
  $('r-temp-out').textContent = t.value + ' °C';
  $('r-nacin-o').textContent = N.okreni ? 'Na ploči se meso okreće; jezgra se grije s obje strane.' : N.id === 'dim' ? 'Toplo dimljenje na niskoj temperaturi: sporo, ali jednolično.' : 'Vrući zrak sa svih strana.';
}
let zadatakTemp = false;
function meso() {
  const M = MESO.find((x) => x.id === $('r-meso').value);
  $('r-meso-o').textContent = `Orijentacijska sigurna jezgra ${M.sigurno} °C, dobro ${M.dobro[0]}–${M.dobro[1]} °C.` + (M.napomena ? ' ' + M.napomena : '');
  if (document.activeElement !== $('r-cilj')) $('r-cilj').value = String(Math.min(M.dobro[1], M.sigurno + 1));
}
$('r-nacin').addEventListener('change', nacin); $('r-meso').addEventListener('change', meso);
$('r-temp').addEventListener('input', () => { $('r-temp-out').textContent = $('r-temp').value + ' °C'; });
$('r-debljina').addEventListener('input', () => { $('r-deb-out').textContent = hr(+$('r-debljina').value, 1) + ' cm'; });
document.querySelectorAll('[name="r-vad"]').forEach((r) => r.addEventListener('change', vadenje));
function vadenje() { const s = document.querySelector('[name="r-vad"]:checked').value === 'sonda'; $('r-cilj-p').hidden = !s; $('r-vr-p').hidden = s; }
nacin(); meso(); vadenje(); $('r-deb-out').textContent = hr(+$('r-debljina').value, 1) + ' cm';

/* ================================================================== graf */
function boje() { const cs = getComputedStyle(document.documentElement); const g = (n) => cs.getPropertyValue(n).trim(); return { s1: g('--pz-s1'), s2: g('--pz-s2'), s3: g('--pz-s3'), ink: g('--ink'), body: g('--body'), rule: g('--rule'), tanko: g('--tanko') }; }
let zadnji = null;
function graf() {
  const c = $('r-graf'); const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const B = boje(), L = 40, R = 12, T = 10, Bt = 24, pw = w - L - R, ph = h - T - Bt;
  x.font = '11px "IBM Plex Sans", system-ui, sans-serif';
  if (!zadnji) { x.fillStyle = B.body; x.textAlign = 'center'; x.fillText('Složi recept i klikni „Ispeci“.', w / 2, h / 2); return; }
  const K = zadnji.krivulja, tMax = Math.max(1, K[K.length - 1].t), hi = Math.max(100, ...K.map((r) => r.s)) + 5;
  const X = (t) => L + t / tMax * pw, Y = (v) => T + (1 - v / hi) * ph;
  const M = zadnji.M;
  x.fillStyle = B.tanko; x.fillRect(L, Y(M.dobro[1]), pw, Y(M.dobro[0]) - Y(M.dobro[1]));
  x.strokeStyle = B.rule; x.lineWidth = 1; x.fillStyle = B.body; x.textAlign = 'right';
  for (let v = 0; v <= hi; v += hi > 160 ? 40 : 20) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.fillText(String(v), L - 6, Y(v) + 4); }
  x.textAlign = 'center';
  const kor = tMax > 120 ? 30 : tMax > 40 ? 10 : tMax > 15 ? 5 : 2;
  for (let t = 0; t <= tMax + 1e-9; t += kor) x.fillText(t + ' min', X(t), h - 6);
  x.save(); x.setLineDash([4, 4]); x.strokeStyle = B.body; x.beginPath(); x.moveTo(L, Y(M.sigurno)); x.lineTo(L + pw, Y(M.sigurno)); x.stroke(); x.textAlign = 'left'; x.fillText('sigurno ' + M.sigurno + ' °C', L + 6, Y(M.sigurno) - 5); x.restore();
  [['s', 's3'], ['j', 's2']].forEach(([k, cc]) => { x.save(); x.strokeStyle = B[cc]; x.lineWidth = 2.2; x.beginPath(); K.forEach((r, i) => { const px = X(r.t), py = Y(r[k]); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); x.restore(); });
  const zz = K[K.length - 1]; x.fillStyle = B.s2; x.beginPath(); x.arc(X(zz.t), Y(zz.j), 4, 0, Math.PI * 2); x.fill();
}
new ResizeObserver(graf).observe($('r-graf'));

/* ================================================================== pečenje i ocjena */
const ZVJ = { dobro: 3, 'dobro-': 2, prepeceno: 1, sirovo: 1, presporo: 1, nesigurno: 0 };
const NASLOV = { dobro: 'Sigurno i sočno!', 'dobro-': 'Sigurno, ali malo suho', prepeceno: 'Prepečeno', sirovo: 'Premalo pečeno', presporo: 'Presporo', nesigurno: 'Nesigurno — ne smije van!' };
function recept() {
  const vad = document.querySelector('[name="r-vad"]:checked').value;
  return { meso: $('r-meso').value, debljina: +$('r-debljina').value, nacin: $('r-nacin').value, temp: +$('r-temp').value, nacinVadenja: vad, cilj: +$('r-cilj').value, vrijeme: +$('r-vrijeme').value };
}
function ispis(r, x) {
  let z = ZVJ[x.ocjena];
  let extra = '';
  if (zadatak && zadatak.maxMin && x.minuta > zadatak.maxMin && z === 3) { z = 2; extra = ` Zadatak traži manje od ${zadatak.maxMin} minuta.`; }
  $('r-ishod').hidden = false;
  $('r-zvj').innerHTML = [0, 1, 2].map((i) => `<span class="${i < z ? 'puna' : ''}">★</span>`).join('');
  $('r-zvj').setAttribute('aria-label', z + ' od 3 zvjezdice');
  $('r-ocj').textContent = NASLOV[x.ocjena];
  $('r-ocj').className = x.ocjena === 'nesigurno' ? 'pz-ne' : z === 3 ? 'pz-ok' : '';
  $('r-opis').textContent = x.opis + extra;
  $('r-pod').innerHTML = `<dt>Vrijeme pečenja</dt><dd>${hr(x.minuta, 1)} min</dd><dt>Jezgra pri vađenju</dt><dd>${hr(x.jezgra, 1)} °C</dd><dt>Jezgra nakon odmora (2–3 min)</dt><dd>${hr(x.odmor, 1)} °C</dd>` +
    `<dt>Sigurna granica dosegnuta</dt><dd>${x.dosegnuto === null ? 'nije' : 'nakon ' + hr(x.dosegnuto, 1) + ' min'}</dd>`;
}
$('r-peci').addEventListener('click', () => { const r = recept(); zadnji = ispeci(r); graf(); ispis(r, zadnji); });

/* spremljeni recepti */
function popis() {
  let L = []; try { L = JSON.parse(citaj(KLJUC) || '[]') || []; } catch (e) { L = []; }
  $('r-moji').innerHTML = L.length ? L.map((x, i) => `<li><button type="button" class="gumb tanki" data-uc="${i}">${esc(x.ime)}</button> <span class="pom">${esc(MESO.find((m) => m.id === x.r.meso).naziv)} · ${hr(x.r.debljina, 1)} cm · ${esc(NACINI.find((n) => n.id === x.r.nacin).naziv)} ${x.r.temp} °C · ${x.r.nacinVadenja === 'sonda' ? 'sonda ' + x.r.cilj + ' °C' : x.r.vrijeme + ' min'}</span></li>`).join('') : '<li class="pom">Još nema spremljenih recepata (spremaju se u ovom pregledniku).</li>';
  return L;
}
$('r-spremi').addEventListener('click', () => {
  const ime = $('r-ime').value.trim() || 'Recept ' + new Date().toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  const L = popis(); L.unshift({ ime, r: recept() }); pisi(KLJUC, JSON.stringify(L.slice(0, 12))); popis(); $('r-ime').value = '';
});
$('r-moji').addEventListener('click', (e) => {
  const b = e.target.closest('[data-uc]'); if (!b) return;
  const x = popis()[+b.dataset.uc]; if (!x) return;
  zadatakTemp = true;
  ['meso', 'debljina', 'nacin', 'cilj', 'vrijeme'].forEach((k) => { $('r-' + k).value = String(x.r[k]); });
  nacin(); $('r-temp').value = String(x.r.temp); $('r-temp-out').textContent = x.r.temp + ' °C'; $('r-deb-out').textContent = hr(x.r.debljina, 1) + ' cm';
  document.querySelector(`[name="r-vad"][value="${x.r.nacinVadenja}"]`).checked = true; vadenje(); meso(); $('r-cilj').value = String(x.r.cilj);
  zadnji = ispeci(x.r); graf(); ispis(x.r, zadnji);
});
popis(); graf();
window.__rec = { ispeci, recept };
