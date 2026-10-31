/* FORTRONIQ · Pametni plastenik — igra „Pomozi biljkama!“ (vizualni blokovi za mlađe polaznike).
   Dijete slaže pravila od blokova AKO [uvjet] → ONDA [radnja]; isti fizikalni model kao u simulatoru (pp_fizika.js)
   pokreće dan u ubrzanom vremenu, a crtež plastenika pokazuje sunce, toplomjer, biljke, vodu, prozor, zasjenu i grijač.
   © ForTroniQ d.o.o. */
import { napraviPlastenik } from './pp_fizika.js';
import { SCENARIJI } from './pp_podaci.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',').replace('-', '−');

/* ================================================================== blokovi */
export const UVJETI = [
  { id: 'vruce', ik: '🌡️', t: 'vruće je', opis: 'zrak topliji od 27 °C' },
  { id: 'hladno', ik: '🥶', t: 'hladno je', opis: 'zrak hladniji od 8 °C' },
  { id: 'suho', ik: '🏜️', t: 'zemlja je suha', opis: 'vlaga tla ispod 35 %' },
  { id: 'sunce', ik: '☀️', t: 'jako sunce', opis: 'ozračenje jače od 500 W/m²' },
  { id: 'vlazno', ik: '💧', t: 'zrak je vlažan', opis: 'vlaga zraka iznad 85 %' },
];
export const RADNJE = [
  { id: 'prozor', ik: '🪟', t: 'otvori prozor' },
  { id: 'grijac', ik: '🔥', t: 'upali grijač' },
  { id: 'zalij', ik: '🚿', t: 'zalij biljke' },
  { id: 'zasjena', ik: '⛱️', t: 'spusti zasjenu' },
  { id: 'ventilator', ik: '🌀', t: 'upali ventilator' },
];
const DANI = [
  { id: 'val', ik: '☀️', t: 'Vrući ljetni dan', opis: 'Vani je 35 °C i jako sunce.' },
  { id: 'noc', ik: '🌙', t: 'Hladna noć', opis: 'Noću se smrzava, vani je −3 °C.' },
  { id: 'normalan', ik: '🌱', t: 'Proljetni dan', opis: 'Toplo danju, svježe noću.' },
];
const MAKS = 6;
let pravila = [{ u: null, r: null }, { u: null, r: null }, { u: null, r: null }];
let dan = 'val', igra = null, radi = false, zadnji = 0, acc = 0;

/* stanje uvjeta s histerezom, da izlazi ne titraju */
function uvjet(id, m, z) {
  const h = (k, on, off) => { if (on) z[k] = true; if (off) z[k] = false; return !!z[k]; };
  if (id === 'vruce') return h('g_vruce', m.T_UN > 27, m.T_UN < 25);
  if (id === 'hladno') return h('g_hladno', m.T_UN < 8, m.T_UN > 10);
  if (id === 'suho') return h('g_suho', m.TLO < 35, m.TLO > 45);
  if (id === 'sunce') return h('g_sunce', m.G > 500, m.G < 400);
  if (id === 'vlazno') return h('g_vlazno', m.RH > 85, m.RH < 80);
  return false;
}
function program(m, p, z) {
  const akt = {};
  pravila.forEach((r) => { if (r.u && r.r && uvjet(r.u, m, z)) akt[r.r] = true; });
  const otvoriti = !!akt.prozor;
  return {
    izlazi: {
      VENTIL: !!akt.zalij, OTVORI: otvoriti && !m.P_OTV, ZATVORI: !otvoriti && !m.P_ZAT,
      GRIJ: !!akt.grijac && m.P_ZAT, ZAS: !!akt.zasjena, VENT: !!akt.ventilator, LED: false,
    }, uvjeti: {},
  };
}

/* ================================================================== slaganje pravila */
function crtajPaletu() {
  $('p-uvjeti').innerHTML = UVJETI.map((b) => `<button type="button" class="ig-blok ig-u" draggable="true" data-vrsta="u" data-id="${b.id}" title="${esc(b.opis)}"><span class="ik" aria-hidden="true">${b.ik}</span>${esc(b.t)}</button>`).join('');
  $('p-radnje').innerHTML = RADNJE.map((b) => `<button type="button" class="ig-blok ig-r" draggable="true" data-vrsta="r" data-id="${b.id}"><span class="ik" aria-hidden="true">${b.ik}</span>${esc(b.t)}</button>`).join('');
}
function blok(vrsta, id) {
  const b = (vrsta === 'u' ? UVJETI : RADNJE).find((x) => x.id === id);
  return b ? `<span class="ig-blok ig-${vrsta} u-utoru"><span class="ik" aria-hidden="true">${b.ik}</span>${esc(b.t)}</span>` : `<span class="ig-prazno">${vrsta === 'u' ? 'stavi uvjet' : 'stavi radnju'}</span>`;
}
function crtajPravila() {
  $('pravila').innerHTML = pravila.map((r, i) => `<li class="ig-red" data-i="${i}"><span class="ig-rijec">AKO</span>` +
    `<button type="button" class="ig-utor" data-i="${i}" data-vrsta="u" aria-label="Uvjet pravila ${i + 1}">${blok('u', r.u)}</button>` +
    `<span class="ig-rijec">ONDA</span><button type="button" class="ig-utor" data-i="${i}" data-vrsta="r" aria-label="Radnja pravila ${i + 1}">${blok('r', r.r)}</button>` +
    `<button type="button" class="ig-x" data-brisi="${i}" aria-label="Obriši pravilo ${i + 1}">×</button></li>`).join('');
  $('dodaj').disabled = pravila.length >= MAKS;
  const puna = pravila.filter((r) => r.u && r.r).length;
  $('broj').textContent = puna ? `Složeno pravila: ${puna}` : 'Još nema složenih pravila.';
}
function stavi(vrsta, id, i) {
  if (i === undefined) { i = pravila.findIndex((r) => !r[vrsta]); if (i < 0) { if (pravila.length >= MAKS) return; pravila.push({ u: null, r: null }); i = pravila.length - 1; } }
  pravila[i][vrsta] = id; crtajPravila();
}
let odabrani = null;   /* za dodir: prvo blok, pa utor */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.ig-paleta .ig-blok');
  if (b) { stavi(b.dataset.vrsta, b.dataset.id); return; }
  const u = e.target.closest('.ig-utor');
  if (u) { const i = +u.dataset.i, v = u.dataset.vrsta; pravila[i][v] = null; crtajPravila(); return; }
  const x = e.target.closest('[data-brisi]');
  if (x) { pravila.splice(+x.dataset.brisi, 1); if (!pravila.length) pravila.push({ u: null, r: null }); crtajPravila(); }
});
document.addEventListener('dragstart', (e) => { const b = e.target.closest('.ig-paleta .ig-blok'); if (!b) return; odabrani = b; e.dataTransfer.setData('text/plain', b.dataset.vrsta + ':' + b.dataset.id); });
document.addEventListener('dragover', (e) => { const u = e.target.closest('.ig-utor'); if (u && odabrani && odabrani.dataset.vrsta === u.dataset.vrsta) { e.preventDefault(); u.classList.add('preko'); } });
document.addEventListener('dragleave', (e) => { const u = e.target.closest('.ig-utor'); if (u) u.classList.remove('preko'); });
document.addEventListener('drop', (e) => {
  const u = e.target.closest('.ig-utor'); if (!u || !odabrani) return; e.preventDefault();
  u.classList.remove('preko'); stavi(odabrani.dataset.vrsta, odabrani.dataset.id, +u.dataset.i); odabrani = null;
});
$('dodaj').addEventListener('click', () => { if (pravila.length < MAKS) { pravila.push({ u: null, r: null }); crtajPravila(); } });
$('ocisti').addEventListener('click', () => { pravila = [{ u: null, r: null }, { u: null, r: null }, { u: null, r: null }]; crtajPravila(); });

/* ================================================================== izbor dana */
$('dani').innerHTML = DANI.map((d) => `<button type="button" class="ig-dan" data-dan="${d.id}" aria-pressed="${d.id === dan}"><span class="ik" aria-hidden="true">${d.ik}</span><b>${esc(d.t)}</b><span>${esc(d.opis)}</span></button>`).join('');
$('dani').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dan]'); if (!b) return; dan = b.dataset.dan;
  document.querySelectorAll('.ig-dan').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  pripremi();
});

/* ================================================================== crtež plastenika (SVG) */
const NB = 12;
function scena() {
  const s = ['<svg viewBox="0 0 640 360" class="ig-svg" role="img" aria-label="Plastenik s biljkama, suncem, toplomjerom i uređajima">'];
  s.push('<rect class="ig-nebo" id="ig-nebo" x="0" y="0" width="640" height="300"/>');
  s.push('<circle class="ig-sunce" id="ig-sunce" cx="80" cy="80" r="26"/><circle class="ig-mjesec" id="ig-mjesec" cx="560" cy="70" r="18"/>');
  s.push('<rect class="ig-trava" x="0" y="292" width="640" height="68"/>');
  s.push('<path class="ig-plastenik" d="M110 300V190A210 120 0 0 1 530 190V300Z"/>');
  s.push('<path class="ig-luk" d="M110 190A210 120 0 0 1 530 190M215 300V100M320 300V70M425 300V100"/>');
  s.push('<g id="ig-prozor"><path class="ig-krilo" id="ig-krilo" d="M320 70L420 80L420 92L320 82Z"/></g>');
  s.push('<rect class="ig-zasjena" id="ig-zasjena" x="140" y="150" width="360" height="10" rx="3"/>');
  s.push('<g id="ig-grijac"><rect class="ig-uredaj" x="122" y="250" width="34" height="40" rx="5"/><path class="ig-plamen" id="ig-plamen" d="M139 262c-6 8-6 14 0 18 6-4 6-10 0-18z"/></g>');
  s.push('<g id="ig-vent"><circle class="ig-uredaj" cx="505" cy="215" r="20"/><g id="ig-lopatice"><path class="ig-lop" d="M505 215l0-16 6 2zM505 215l14 8-5 4zM505 215l-14 8-1-6z"/></g></g>');
  s.push('<rect class="ig-gredica" x="150" y="282" width="340" height="14" rx="4"/>');
  for (let i = 0; i < NB; i++) {
    const x = 170 + i * 28;
    s.push(`<g class="ig-biljka" id="ig-b${i}" transform="translate(${x} 282)"><path class="ig-stab" d="M0 0V-38"/><ellipse class="ig-list" cx="-8" cy="-20" rx="9" ry="5"/><ellipse class="ig-list" cx="8" cy="-30" rx="9" ry="5"/><circle class="ig-plod" cx="4" cy="-14" r="4"/></g>`);
  }
  for (let i = 0; i < 6; i++) s.push(`<path class="ig-kap" id="ig-k${i}" d="M${175 + i * 58} 262c-3 5-4 8 0 10 4-2 3-5 0-10z"/>`);
  s.push('<g transform="translate(582 120)"><rect class="ig-toplomjer" x="0" y="0" width="22" height="150" rx="11"/><rect class="ig-ziva" id="ig-ziva" x="5" y="100" width="12" height="45" rx="6"/><circle class="ig-ziva" cx="11" cy="150" r="13"/></g>');
  s.push('<rect class="ig-pill" x="545" y="86" width="56" height="28" rx="14"/><text class="ig-tekst ig-na-pill" id="ig-t" x="573" y="106" text-anchor="middle"></text>');
  s.push('<text class="ig-tekst" id="ig-sat" x="20" y="340"></text>');
  s.push('</svg>');
  $('scena').innerHTML = s.join('');
}
scena();
function crtaj() {
  if (!igra) return;
  const q = igra.zadnje, st = igra.st, sat = q.sat;
  const nocno = q.m.G < 5;
  $('ig-nebo').classList.toggle('noc', nocno);
  const kut = Math.PI * Math.min(1, Math.max(0, (sat - 5) / 15));
  $('ig-sunce').setAttribute('cx', String(70 + 500 * (kut / Math.PI))); $('ig-sunce').setAttribute('cy', String(230 - 170 * Math.sin(kut)));
  $('ig-sunce').style.opacity = nocno ? '0' : String(0.4 + 0.6 * Math.min(1, q.m.G / 700));
  $('ig-mjesec').style.opacity = nocno ? '1' : '0';
  $('ig-prozor').setAttribute('transform', `rotate(${-28 * st.poz} 320 76)`);
  $('ig-zasjena').style.opacity = q.iz.ZAS ? '1' : '0.08';
  $('ig-plamen').style.opacity = q.snage.qGrij > 0 ? '1' : '0';
  $('ig-lopatice').setAttribute('transform', q.iz.VENT ? `rotate(${(performance.now() / 4) % 360} 505 215)` : '');
  for (let i = 0; i < 6; i++) $('ig-k' + i).style.opacity = q.iz.VENTIL ? String(0.4 + 0.6 * ((performance.now() / 300 + i) % 1)) : '0';
  const zdr = st.zdr, stres = st.S / 100;
  for (let i = 0; i < NB; i++) {
    const b = $('ig-b' + i);
    const ziva = zdr > (i + 0.5) / NB;
    b.classList.toggle('suha', !ziva);
    b.classList.toggle('stres', ziva && stres > 0.5);
    const nagib = ziva ? -stres * 25 : -60;
    b.setAttribute('transform', `translate(${170 + i * 28} 282) rotate(${nagib * (i % 2 ? 1 : -1) * 0.5})`);
  }
  const T = st.T;
  const v = Math.max(5, Math.min(140, (T + 10) / 55 * 140));
  $('ig-ziva').setAttribute('y', String(150 - v)); $('ig-ziva').setAttribute('height', String(v));
  $('ig-ziva').classList.toggle('vruce', T > 30); $('ig-ziva').classList.toggle('hladno', T < 8);
  $('ig-t').textContent = hr(T, 0) + ' °C';
  const h = Math.floor(sat), mi = Math.floor((sat - h) * 60);
  $('ig-sat').textContent = '🕒 ' + String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + '   💧 ' + hr(igra.pokazatelji().vodaL, 0) + ' L   ⚡ ' + hr(igra.pokazatelji().eUk, 0) + ' kWh';
  $('ig-stanje').textContent = `Zdrave biljke: ${hr(zdr * 100, 0)} % · stres ${hr(st.S, 0)} · vlaga tla ${hr(st.tlo, 0)} %`;
  $('ig-napredak').style.width = Math.min(100, (st.t - igra.t0) / igra.trajanje * 100) + '%';
}

/* ================================================================== igranje */
function pripremi() {
  radi = false; acc = 0;
  igra = napraviPlastenik(dan, {}, { program, odSata: dan === 'noc' ? 12 : 5 });
  igra.korak();
  $('kreni').textContent = 'Pokreni dan!'; $('kreni').setAttribute('aria-pressed', 'false');
  $('ishod').hidden = true;
  crtaj();
}
$('kreni').addEventListener('click', () => {
  if (!igra || igra.st.t - igra.t0 >= igra.trajanje - 1) pripremi();
  radi = !radi; zadnji = performance.now();
  $('kreni').textContent = radi ? 'Pauza' : 'Nastavi';
  $('kreni').setAttribute('aria-pressed', radi ? 'true' : 'false');
  if (radi) $('scena').scrollIntoView({ block: 'nearest' });
});
$('ponovo').addEventListener('click', pripremi);

const SAVJETI = {
  voda: 'Biljke su dobro, ali potrošeno je puno vode. Zalijevaj samo kad je zemlja suha.',
  struja: 'Biljke su dobro, ali grijač je radio predugo. Neka grije samo kad je hladno.',
};
/* pravila koja pomažu u pojedinom danu, redom kojim ih predlažemo */
const KORISNA = {
  val: [['vruce', 'prozor'], ['sunce', 'zasjena'], ['vruce', 'ventilator'], ['suho', 'zalij']],
  noc: [['hladno', 'grijac'], ['vruce', 'prozor']],
  normalan: [['vruce', 'prozor'], ['hladno', 'grijac'], ['suho', 'zalij']],
};
function savjetPravila() {
  const ima = (u, r) => pravila.some((x) => x.u === u && x.r === r);
  const fali = (KORISNA[dan] || []).find(([u, r]) => !ima(u, r));
  if (!fali) return 'Pravila su dobra — probaj ih poredati drukčije ili makni ono koje smeta.';
  const U = UVJETI.find((x) => x.id === fali[0]), R = RADNJE.find((x) => x.id === fali[1]);
  return `Probaj dodati pravilo: AKO ${U.t} → ONDA ${R.t}.`;
}
function kraj() {
  radi = false;
  const p = igra.pokazatelji();
  const S = SCENARIJI.find((s) => s.id === dan);
  const pr = p.prezivjele;
  let zv = pr >= 95 ? 3 : pr >= 80 ? 2 : pr >= 50 ? 1 : 0;
  let savjet = '';
  if (pr < 95) savjet = (p.maxT > 32 ? 'Biljkama je bilo prevruće. ' : p.minT < 8 ? 'Biljkama je bilo prehladno. ' : 'Zemlja se osušila. ') + savjetPravila();
  else if (p.vodaM3 > 1.5) { zv = Math.min(zv, 2); savjet = SAVJETI.voda; }
  else if (dan === 'noc' && p.grijacUdio > 85) { zv = Math.min(zv, 2); savjet = SAVJETI.struja; }
  $('ishod').hidden = false;
  $('zvjezdice').innerHTML = [0, 1, 2].map((i) => `<span class="${i < zv ? 'puna' : ''}" aria-hidden="true">★</span>`).join('');
  $('zvjezdice').setAttribute('aria-label', zv + ' od 3 zvjezdice');
  $('ishod-t').textContent = (zv === 3 ? 'Bravo! Biljke su sretne.' : zv === 2 ? 'Dobro je! Još malo i bit će savršeno.' : zv === 1 ? 'Neke biljke su preživjele. Pokušaj ponovno!' : 'Joj, biljke nisu preživjele. Složi bolja pravila!') + ' ' + savjet;
  $('ishod-b').textContent = `Preživjelo ${p.biljke} od 400 biljaka · voda ${hr(p.vodaL, 0)} L · struja ${hr(p.eUk, 0)} kWh · ${S.naziv}`;
  $('kreni').textContent = 'Igraj opet'; $('kreni').setAttribute('aria-pressed', 'false');
}
function petlja(t) {
  requestAnimationFrame(petlja);
  if (!igra) return;
  if (radi) {
    const dt = Math.min(0.1, (t - zadnji) / 1000); zadnji = t;
    acc += dt * 2880;                                     /* dan u 30 sekundi */
    let n = 0;
    while (acc >= 1 && n < 400) { igra.korak(1); acc -= 1; n++; if (igra.st.t - igra.t0 >= igra.trajanje) break; }
    if (igra.st.t - igra.t0 >= igra.trajanje) kraj();
  }
  crtaj();
}
crtajPaletu(); crtajPravila(); pripremi(); requestAnimationFrame(petlja);
window.__igra = { get igra() { return igra; }, get pravila() { return pravila; }, stavi, pripremi };
