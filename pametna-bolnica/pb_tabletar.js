/* FORTRONIQ · Pametna bolnica — vježba „Napuni tabletičar“: polaznik prema propisanoj terapiji puni 28 pretinaca
   (7 dana × 4 termina), provjera nedostaje / višak / nespojivo, i prikaz pick-to-light izdavanja. Pacijenti i lijekovi
   su IZMIŠLJENI; simulator za učenje, ne medicinski uređaj. © ForTroniQ d.o.o. */
import { PACIJENTI, LIJEKOVI, TERMINI, DANI, NESPOJIVI } from './pb_podaci.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LJ = new Map(LIJEKOVI.map((l) => [l.id, l]));
let pac = PACIJENTI[0], odabran = null, kut = [], led = null, zapis = [];

$('t-pac').innerHTML = PACIJENTI.map((p) => `<option value="${p.id}">${p.id} — ${esc(p.ime)} (soba ${p.soba})</option>`).join('');
$('t-led-dan').innerHTML = DANI.map((d, i) => `<option value="${i}">${d}</option>`).join('');
$('t-led-term').innerHTML = TERMINI.map((t, i) => `<option value="${i}">${t.h} h — ${t.n}</option>`).join('');
$('t-paleta').innerHTML = LIJEKOVI.map((l) => `<button type="button" class="pb-lijek" data-l="${l.id}" aria-pressed="false"><i style="background:${l.hex}"></i>${esc(l.naziv)}<span class="pom"> ${esc(l.oblik)}, ${esc(l.boja)}</span></button>`).join('');

function novi() {
  pac = PACIJENTI.find((p) => p.id === $('t-pac').value) || PACIJENTI[0];
  kut = Array.from({ length: 7 }, () => Array.from({ length: 4 }, () => []));
  led = null; zapis = [];
  $('t-terapija').innerHTML = '<table class="pk-kds"><thead><tr><th>Lijek</th>' + TERMINI.map((t) => `<th>${t.h} h</th>`).join('') + '</tr></thead><tbody>' +
    pac.terapija.map(([l, tt]) => `<tr><td><i class="pb-tab" style="background:${LJ.get(l).hex}"></i>${esc(LJ.get(l).naziv)}${LJ.get(l).kontrolirani ? ' <span class="uz-oz">stroža evidencija</span>' : ''}</td>` + TERMINI.map((_, k) => `<td>${tt.includes(k) ? '1 tbl.' : ''}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
  $('t-rez').innerHTML = ''; $('t-zvj').innerHTML = ''; $('t-zapis').innerHTML = '';
  crtaj();
}
function crtaj() {
  $('t-kutija').innerHTML = '<div class="pb-kut" role="grid" aria-label="Tabletičar: 7 dana × 4 termina">' +
    '<div></div>' + DANI.map((d) => `<div class="pb-kh">${d}</div>`).join('') +
    TERMINI.map((t, k) => `<div class="pb-kh">${t.h} h</div>` + DANI.map((_, d) => `<button type="button" class="pb-pr${led && led[0] === d && led[1] === k ? ' led' : ''}" data-d="${d}" data-k="${k}" aria-label="${DANI[d]} ${t.h} h: ${kut[d][k].map((l) => LJ.get(l).naziv).join(', ') || 'prazno'}">${kut[d][k].map((l) => `<i style="background:${LJ.get(l).hex}" title="${esc(LJ.get(l).naziv)}"></i>`).join('')}</button>`).join('')).join('') + '</div>';
}
$('t-pac').addEventListener('change', novi);
$('t-paleta').addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; odabran = odabran === b.dataset.l ? null : b.dataset.l; document.querySelectorAll('#t-paleta [data-l]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.l === odabran ? 'true' : 'false')); $('t-uputa').textContent = odabran ? `Odabran ${LJ.get(odabran).naziv} — klikni pretinac.` : 'Odaberi lijek pa klikni pretinac; klik na pretinac bez odabranog lijeka vadi zadnju tabletu.'; });
$('t-kutija').addEventListener('click', (e) => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  const d = +b.dataset.d, k = +b.dataset.k;
  if (led && led[0] === d && led[1] === k) { otvori(); return; }
  if (odabran) kut[d][k].push(odabran); else kut[d][k].pop();
  crtaj();
});
$('t-kopiraj').addEventListener('click', () => { for (let d = 1; d < 7; d++) for (let k = 0; k < 4; k++) kut[d][k] = [...kut[0][k]]; crtaj(); });
$('t-isprazni').addEventListener('click', () => { kut = Array.from({ length: 7 }, () => Array.from({ length: 4 }, () => [])); crtaj(); });
$('t-provjeri').addEventListener('click', () => {
  const nedostaje = [], visak = [], nesp = [];
  for (let d = 0; d < 7; d++) for (let k = 0; k < 4; k++) {
    const treba = pac.terapija.filter(([, tt]) => tt.includes(k)).map(([l]) => l), ima = kut[d][k];
    treba.forEach((l) => { if (!ima.includes(l)) nedostaje.push(`${DANI[d]} ${TERMINI[k].h} h: ${LJ.get(l).naziv}`); });
    const br = {}; ima.forEach((l) => { br[l] = (br[l] || 0) + 1; });
    Object.entries(br).forEach(([l, n]) => { const t = treba.includes(l) ? 1 : 0; if (n > t) visak.push(`${DANI[d]} ${TERMINI[k].h} h: ${LJ.get(l).naziv}${n - t > 1 ? ' ×' + (n - t) : ''}`); });
    NESPOJIVI.forEach(([a, b]) => { if (ima.includes(a) && ima.includes(b)) nesp.push(`${DANI[d]} ${TERMINI[k].h} h: ${a} i ${b}`); });
  }
  const gr = nedostaje.length + visak.length + nesp.length;
  const z = gr === 0 ? 3 : gr <= 2 ? 2 : gr <= 6 ? 1 : 0;
  $('t-zvj').innerHTML = [0, 1, 2].map((i) => `<span class="${i < z ? 'puna' : ''}">★</span>`).join(''); $('t-zvj').setAttribute('aria-label', z + ' od 3 zvjezdice');
  const lista = (n, a) => a.length ? `<p><b>${n} (${a.length}):</b> ${a.slice(0, 8).map(esc).join('; ')}${a.length > 8 ? ' …' : ''}</p>` : '';
  $('t-rez').innerHTML = gr === 0 ? '<p class="pz-ok"><b>Tabletičar je ispravno napunjen.</b> Farmaceut bi sada potvrdio dvostruku provjeru.</p>' : lista('Nedostaje', nedostaje) + lista('Višak', visak) + lista('Nespojivo u istom pretincu', nesp);
});
/* pick-to-light */
$('t-led').addEventListener('click', () => { led = [+$('t-led-dan').value, +$('t-led-term').value]; crtaj(); $('t-led-o').textContent = `Sestra je dobila obavijest: ${pac.id}, ${DANI[led[0]]} ${TERMINI[led[1]].h} h. Svijetli LED ispod pretinca — klikni pretinac (otvaranje poklopca).`; });
function otvori() {
  const [d, k] = led, s = kut[d][k];
  zapis.unshift(`${DANI[d]} ${TERMINI[k].h} h · ${pac.id} · ${s.length ? s.map((l) => LJ.get(l).naziv).join(', ') : 'PRAZAN PRETINAC'} · senzor poklopca: otvoren · ${s.length ? 'doza upisana' : 'upozorenje: pretinac prazan'}`);
  kut[d][k] = []; led = null; crtaj();
  $('t-zapis').innerHTML = zapis.map((x) => `<li>${esc(x)}</li>`).join('');
  $('t-led-o').textContent = 'Poklopac otvoren, doza upisana u dokumentaciju (MES).';
}
novi();
window.__tab = { get kut() { return kut; } };
