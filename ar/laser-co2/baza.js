// FORTRONIQ · CO₂ laser · baza proizvoda po tipu: filtri, tablica debljina, račun vremena reza
import { VRSTE, DEBLJINE, parametri, fmtT } from './debljine.js?v=01';

const $ = s => document.querySelector(s);
const fmt = (v, d = 1) => Number(v).toLocaleString('hr-HR', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── filtri tipova ──
const kont = $('#tipovi'), kartice = [...kont.querySelectorAll('.tip')];
function filtriraj() {
  const q = $('#trazi').value.trim().toLowerCase(), m = $('#f-mat').value, red = $('#f-red').value;
  let n = 0;
  for (const k of kartice) {
    const ok = (!q || k.dataset.ime.includes(q) || k.textContent.toLowerCase().includes(q)) && (!m || k.dataset.mat.split(' ').includes(m));
    k.hidden = !ok; if (ok) n++;
  }
  const s = kartice.slice().sort((a, b) => {
    if ((a.dataset.tip === 'ostalo') !== (b.dataset.tip === 'ostalo')) return a.dataset.tip === 'ostalo' ? 1 : -1;
    return red === 'ime' ? a.dataset.ime.localeCompare(b.dataset.ime, 'hr') : b.dataset.n - a.dataset.n;
  });
  s.forEach(k => kont.append(k));
  const tp = x => (x % 10 === 1 && x % 100 !== 11) ? "tip" : ([2, 3, 4].includes(x % 10) && ![12, 13, 14].includes(x % 100)) ? "tipa" : "tipova";
  $("#f-broj").textContent = `${n} ${tp(n)} od ${kartice.length}`;
}
['#trazi', '#f-mat', '#f-red'].forEach(id => $(id).addEventListener('input', filtriraj));
filtriraj();

// ── tablica debljina ──
$('#tbl-deb thead').innerHTML = `<tr><th scope="col">Materijal</th>${DEBLJINE.map(T => `<th scope="col">${fmtT(T)} mm</th>`).join('')}</tr>`;
$('#tbl-deb tbody').innerHTML = Object.entries(VRSTE).map(([vr, V]) => `<tr><th scope="row">${V.naziv}<small>${V.opis}</small></th>${DEBLJINE.map(T => {
  const q = parametri(vr, T);
  return `<td class="${q.procjena ? 'pr' : 'mj'}" title="${q.izvor}">${q.p} %<small>${fmt(q.v, q.v % 1 ? 1 : 0)} mm/s</small></td>`;
}).join('')}</tr>`).join('');

// ── račun vremena ──
const rv = $('#r-vrsta'), rT = $('#r-T');
for (const [vr, V] of Object.entries(VRSTE)) rv.append(new Option(V.naziv, vr));
for (const T of DEBLJINE) rT.append(new Option(`${fmtT(T)} mm`, T));
rT.value = 3;
function racun() {
  const q = parametri(rv.value, +rT.value), L = Math.max(0, +$('#r-L').value || 0) * 1000, n = Math.max(1, Math.round(+$('#r-n').value || 1));
  const t = L / q.v * n;
  $('#racun-izlaz').innerHTML = `<b>${VRSTE[rv.value].naziv} ${fmtT(q.T)} mm:</b> snaga <b>${q.p} %</b>, brzina <b>${fmt(q.v, 1)} mm/s</b> ${q.procjena ? `<span class="info">(${q.izvor})</span>` : `<span class="info">(tvoj ${q.izvor})</span>`}<br>Čisto vrijeme reza ${fmt(L / 1000, 1)} m × ${n} ${n === 1 ? 'prolaz' : 'prolaza'}: <b>≈ ${fmt(t / 60, 1)} min</b> (bez praznih hodova, ubrzanja i graviranja).`;
}
[rv, rT, $('#r-L'), $('#r-n')].forEach(e => e.addEventListener('input', racun));
racun();
