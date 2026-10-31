/* FORTRONIQ · Traktor s GPS navigacijom i sijačicom — simulator: postavke navigacije i sijačice, sjetva u ubrzanom vremenu,
   karta parcele (spojevi, uvratine, zone), lupa spoja, histogram odstupanja, pokazatelji, dijagnoza, ocjena i dnevnik.
   Model u ts_model.js. © ForTroniQ d.o.o. */
import { P, ZONE, NAVIGACIJE, SCENARIJI, UZROCI } from './ts_podaci.js';
import { pokazatelji, provjeri, postavke, istok, zona } from './ts_model.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',').replace('-', '−');
const tis = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const hhmm = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h + ':' + String(m).padStart(2, '0'); };
const BOJA_SPOJ = (d) => { const a = Math.abs(d); return a <= 0.05 ? '#2f8f4e' : a <= 0.10 ? '#c9a227' : a <= 0.35 ? '#e07b2a' : '#c2493d'; };
const BOJA_ZONA = { A: 'rgba(46,139,87,.28)', B: 'rgba(194,162,58,.28)', C: 'rgba(194,106,58,.30)' };

let S, O, R = null, anim = null, brzina = 300, sloj = 'spojevi', lupa = null, dijagnoza = false, dnevnik = [];

/* ---------------------------------------------------------------- scenarij i postavke */
$('s-scen').innerHTML = SCENARIJI.map((s) => `<option value="${s.id}">${esc(s.naziv)}</option>`).join('');
const q = new URLSearchParams(location.search).get('scenarij');
$('s-scen').value = SCENARIJI.some((s) => s.id === q) ? q : 'rucno';
$('s-scen').addEventListener('change', () => postaviScenarij($('s-scen').value));

$('post').innerHTML = `<label class="pz-par s"><span>Navigacija</span><select id="p-nav">${Object.entries(NAVIGACIJE).map(([k, n]) => `<option value="${k}">${esc(n.naziv)}</option>`).join('')}</select><i></i></label>
<label class="pz-par"><span>Brzina sjetve</span><input type="number" id="p-brzina" min="5" max="14" step="0.5" inputmode="decimal"><i>km/h</i></label>
<label class="pa-kvacica"><input type="checkbox" id="p-sekcije"> isključivanje sekcija (svaki red posebno, po GPS-u)</label>
<label class="pz-par"><span>Kompenzacija kašnjenja sekcija</span><input type="number" id="p-komp" min="0" max="0.8" step="0.05" inputmode="decimal"><i>s</i></label>
<label class="pz-par s"><span>Kad nestane RTK korekcije</span><select id="p-pravilo"><option value="nastavi">nastavi s lošijom točnošću</option><option value="cekaj">zaustavi i čekaj RTK FIX</option></select><i></i></label>
<p class="pom" id="p-opis"></p>`;
$('norma').innerHTML = ['A', 'B', 'C'].map((z) => `<label class="pz-par"><span><i class="pa-kv" style="background:${BOJA_ZONA[z].replace(/,\.\d+\)/, ',1)')}"></i>${esc(ZONE[z].naziv)}</span><input type="number" id="n-${z}" min="50000" max="95000" step="1000" inputmode="numeric"><i>zrna/ha</i></label>`).join('') +
  '<p class="pom">Norma se mijenja po karti zona (varijabilna norma). Za jednaku normu upiši isti broj u sve tri zone.</p>';

function citaj() {
  const g = (id, lo, hi, d) => { const v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  return { nav: $('p-nav').value, brzina: g('p-brzina', 5, 14, 8), sekcije: $('p-sekcije').checked, komp: g('p-komp', 0, 0.8, 0), rtkPravilo: $('p-pravilo').value,
    norma: { A: g('n-A', 50000, 95000, 72000), B: g('n-B', 50000, 95000, 72000), C: g('n-C', 50000, 95000, 72000) } };
}
function upisi(o) {
  $('p-nav').value = o.nav; $('p-brzina').value = o.brzina; $('p-sekcije').checked = o.sekcije; $('p-komp').value = o.komp; $('p-pravilo').value = o.rtkPravilo;
  ['A', 'B', 'C'].forEach((z) => { $('n-' + z).value = o.norma[z]; });
  $('p-opis').textContent = NAVIGACIJE[o.nav].opis;
}
function postaviScenarij(id) {
  S = SCENARIJI.find((s) => s.id === id);
  $('s-cilj').innerHTML = esc(S.opis) + '<span class="pom">Uspjeh: ' + S.uvjeti.map((u) => esc(u[3])).join('; ') + '.</span>';
  O = postavke(S); upisi(O);
  dijagnoza = false;
  $('k-dijag').hidden = !S.kvar;
  $('d-odabir').innerHTML = UZROCI.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
  $('d-rez').textContent = '';
  lupa = null;
  ponisti();
  history.replaceState(null, '', '?scenarij=' + id);
}
function ponisti() {
  O = citaj(); upisi(O);
  R = null; anim = null;
  dnevnik = [{ t: 0, tekst: `Scenarij: ${S.naziv}. ${NAVIGACIJE[O.nav].naziv}, ${hr(O.brzina)} km/h, sekcije ${O.sekcije ? 'uključene' : 'isključene'}.` }];
  $('s-pokreni').textContent = 'Pokreni sjetvu'; $('s-pokreni').setAttribute('aria-pressed', 'false');
  $('rez').innerHTML = '<p class="pom">Ocjena se prikazuje kad je parcela zasijana.</p>';
  $('pok').innerHTML = '<p class="pom">Pokazatelji se računaju tijekom sjetve.</p>';
  osvjeziSat(); crtajSve();
}
$('post').addEventListener('change', () => { ponisti(); });
$('norma').addEventListener('change', () => { ponisti(); });
$('p-zadano').addEventListener('click', () => { upisi(postavke(S)); ponisti(); });

/* ---------------------------------------------------------------- sjetva */
function izracunaj() {
  O = citaj();
  R = pokazatelji(S, O);
  const ukupno = R.tGlavni + R.tUvratine;
  R.ukupno = ukupno;
  R.prohodi.forEach((p) => { if (p.k % 10 === 0) zapisi(p.t0, `Prohod ${p.k + 1} od ${P.prohoda}.`); });
  if (R.pad) {
    zapisi(R.pad.od, O.rtkPravilo === 'cekaj' ? 'RTK korekcija izgubljena: traktor stoji i čeka RTK FIX.' : 'Stanje korekcije RTK FIX → FLOAT/SBAS: autopilot nastavlja s lošijom točnošću.', true);
    zapisi(R.pad.do + (O.rtkPravilo === 'cekaj' ? 0 : 0), 'RTK korekcija ponovno dostupna (FIX).');
  }
  zapisi(R.tGlavni, 'Glavni prohodi gotovi; sjetva uvratina (4 prohoda uz rubove).');
  zapisi(ukupno, `Kraj: ${hr(R.k.povrsina, 2)} ha, ${hr(R.k.vrece, 1)} vreća sjemena, ${hhmm(ukupno)} h rada.`);
  dnevnik.sort((a, b) => a.t - b.t);
}
$('s-pokreni').addEventListener('click', () => {
  if (anim && anim.ide) { anim.ide = false; $('s-pokreni').textContent = 'Nastavi'; $('s-pokreni').setAttribute('aria-pressed', 'false'); return; }
  if (!R) { izracunaj(); anim = { t: 0 }; }
  if (!anim) anim = { t: 0 };
  if (anim.t >= R.ukupno) { zavrsi(); return; }
  anim.ide = true; anim.zadnje = performance.now();
  $('s-pokreni').textContent = 'Pauza'; $('s-pokreni').setAttribute('aria-pressed', 'true');
  requestAnimationFrame(korak);
});
$('s-ponovo').addEventListener('click', () => ponisti());
$('s-kraj').addEventListener('click', () => { if (!R) izracunaj(); anim = { t: R.ukupno, ide: false }; zavrsi(); });
document.querySelectorAll('#brzine button').forEach((b) => b.addEventListener('click', () => {
  brzina = +b.dataset.brzina; document.querySelectorAll('#brzine button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
}));
function korak(t) {
  if (!anim || !anim.ide) return;
  const dt = Math.min(0.25, (t - anim.zadnje) / 1000); anim.zadnje = t;
  anim.t = Math.min(R.ukupno, anim.t + dt * brzina);
  osvjeziSat(); crtajKartu(); prikaziDnevnik();
  if (anim.t >= R.ukupno) { zavrsi(); return; }
  requestAnimationFrame(korak);
}
function zavrsi() {
  if (anim) anim.ide = false;
  $('s-pokreni').textContent = 'Pokreni sjetvu'; $('s-pokreni').setAttribute('aria-pressed', 'false');
  osvjeziSat(); pokazi(); ocjena(); crtajSve();
}
function stanjeKorekcije(t) {
  if (!R || O.nav === 'rucno') return ['bez korekcije', ''];
  if (O.nav === 'sbas') return ['EGNOS', ''];
  if (R.pad && t >= R.pad.od && t < R.pad.do) return O.rtkPravilo === 'cekaj' ? ['ČEKA RTK FIX', 'ne'] : ['RTK FLOAT / SBAS', 'ne'];
  return ['RTK FIX', 'ok'];
}
function osvjeziSat() {
  const t = anim ? anim.t : 0;
  $('s-vrijeme').textContent = hhmm(t);
  $('s-napredak').style.width = (R ? 100 * t / R.ukupno : 0) + '%';
  const [n, c] = stanjeKorekcije(t);
  $('s-kor').textContent = n; $('s-kor').className = 'pa-znacka ' + c;
  const p = R ? polozaj(t) : null;
  $('s-prohod').textContent = p && p.k !== null ? `prohod ${p.k + 1} od ${P.prohoda}` : t >= (R ? R.tGlavni : Infinity) ? 'uvratine' : '—';
}
/* položaj traktora u trenutku t */
function polozaj(t) {
  for (const p of R.prohodi) {
    if (t < p.t0) return { k: null, x: p.smjer > 0 ? p.x0 : p.x1, y: p.yc };
    if (t <= p.tx[p.smjer > 0 ? p.n - 1 : 0] || t <= p.t1) {
      let i = 0;
      if (p.smjer > 0) { while (i < p.n - 1 && p.tx[i + 1] <= t) i++; }
      else { i = p.n - 1; while (i > 0 && p.tx[i - 1] <= t) i--; }
      return { k: p.k, x: p.x0 + i * 2, y: p.yc + p.e[i], i };
    }
  }
  return { k: null, x: 0, y: 0 };
}

/* ---------------------------------------------------------------- karta parcele */
const SLOJEVI = { spojevi: 'Spojevi prohoda', uvratine: 'Krajevi redova na uvratinama', zone: 'Zone tla i norma' };
$('slojevi').innerHTML = Object.entries(SLOJEVI).map(([k, n]) => `<button type="button" class="gumb tanki" data-sloj="${k}" aria-pressed="false">${esc(n)}</button>`).join('');
$('slojevi').addEventListener('click', (e) => { const b = e.target.closest('button[data-sloj]'); if (b) postaviSloj(b.dataset.sloj); });
function postaviSloj(s) {
  sloj = s;
  document.querySelectorAll('#slojevi button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.sloj === s ? 'true' : 'false'));
  const L = {
    spojevi: [['#2f8f4e', 'spoj ±5 cm'], ['#c9a227', '±10 cm'], ['#e07b2a', '±35 cm'], ['#c2493d', 'propušten ili dvostruk red'], ['#9bc68a', 'zasijano']],
    uvratine: [['#c2493d', 'preklop u uvratini'], ['#c9a227', 'propust ispred uvratine'], ['#b9a07c', 'uvratina']],
    zone: Object.entries(ZONE).map(([z, Z]) => [BOJA_ZONA[z].replace(/,\.\d+\)/, ',1)'), `${Z.naziv}: ${tis(O.norma[z])} zrna/ha`]),
  }[s];
  $('legenda').innerHTML = L.map(([c, n]) => `<li><i class="pa-kv" style="background:${c}"></i>${esc(n)}</li>`).join('');
  crtajKartu();
}
const kc = $('karta'), tip = $('karta-tip');
let geo = null;
function crtajKartu() {
  if (!S) return;
  const w = kc.clientWidth; if (!w) return;
  const marg = 20, sk = (w - 2 * marg) / P.duljina, h = Math.round(P.sirina * sk) + 2 * marg;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  kc.style.height = h + 'px';
  if (kc.width !== Math.round(w * dpr) || kc.height !== Math.round(h * dpr)) { kc.width = Math.round(w * dpr); kc.height = Math.round(h * dpr); }
  const x = kc.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const X = (m) => marg + m * sk, Y = (m) => h - marg - m * sk;
  geo = { X, Y, sk, marg, h };
  x.fillStyle = '#c7d6b8'; x.fillRect(0, 0, w, h);
  /* parcela */
  x.fillStyle = '#8b6d50'; x.beginPath(); x.moveTo(X(0), Y(0)); x.lineTo(X(istok(S, 0)), Y(0)); x.lineTo(X(istok(S, P.sirina)), Y(P.sirina)); x.lineTo(X(0), Y(P.sirina)); x.closePath(); x.fill();
  x.fillStyle = '#b9a07c';
  x.fillRect(X(0), Y(P.sirina), P.uvratina * sk, P.sirina * sk);
  x.beginPath(); x.moveTo(X(istok(S, 0) - P.uvratina), Y(0)); x.lineTo(X(istok(S, 0)), Y(0)); x.lineTo(X(istok(S, P.sirina)), Y(P.sirina)); x.lineTo(X(istok(S, P.sirina) - P.uvratina), Y(P.sirina)); x.closePath(); x.fill();
  if (sloj === 'zone') {
    for (let y = 0; y < P.sirina; y += 2) for (let xx = 0; xx < istok(S, y); xx += 4) { x.fillStyle = BOJA_ZONA[zona(xx + 2, y + 1)]; x.fillRect(X(xx), Y(y + 2), 4 * sk + 0.5, 2 * sk + 0.5); }
  }
  const t = anim ? anim.t : 0;
  if (R) {
    const pz = polozaj(t);
    /* zasijani prohodi */
    R.prohodi.forEach((p) => {
      if (p.t0 > t) return;
      let xa = p.x0, xb = p.x1;
      if (pz.k === p.k) { if (p.smjer > 0) xb = pz.x; else xa = pz.x; }
      x.fillStyle = sloj === 'zone' ? 'rgba(155,198,138,.35)' : '#9bc68a';
      x.fillRect(X(xa), Y(p.yc + P.zahvat / 2 - 0.15), (xb - xa) * sk, (P.zahvat - 0.3) * sk);
    });
    /* spojevi */
    if (sloj === 'spojevi') {
      R.spojevi.forEach((s) => {
        const b = R.prohodi[s.k + 1]; if (b.t0 > t) return;
        let n = s.d.length;
        if (pz.k === b.k) n = b.smjer > 0 ? Math.min(n, pz.i + 1) : n;
        x.lineWidth = Math.max(1.5, 0.9 * sk);
        for (let i = 0; i < n - 1; i += 1) {
          if (pz.k === b.k && b.smjer < 0 && i < pz.i) continue;
          x.strokeStyle = BOJA_SPOJ(s.d[i]); x.beginPath(); x.moveTo(X(s.x0 + i * 2), Y(s.y)); x.lineTo(X(s.x0 + (i + 1) * 2), Y(s.y)); x.stroke();
        }
      });
    }
    /* krajevi redova */
    if (sloj === 'uvratine') {
      const tGot = new Set(R.prohodi.filter((p) => p.t1 <= t).map((p) => p.k));
      R.kraj.forEach((k) => {
        if (!tGot.has(k.k) || Math.abs(k.s) < 0.05) return;
        const smjerX = k.strana === 'z' ? 1 : -1;      /* prema unutra */
        const duz = Math.max(2 / sk, Math.abs(k.s) * 3);
        x.strokeStyle = k.s > 0 ? '#c2493d' : '#c9a227'; x.lineWidth = Math.max(1.2, 0.5 * sk);
        const x0 = k.s > 0 ? k.x - smjerX * duz : k.x, x1 = k.s > 0 ? k.x : k.x + smjerX * duz;
        x.beginPath(); x.moveTo(X(x0), Y(k.y)); x.lineTo(X(x1), Y(k.y)); x.stroke();
      });
    }
    /* traktor */
    if (t < R.tGlavni && pz.k !== null) {
      x.fillStyle = '#10394A'; x.fillRect(X(pz.x) - 5, Y(pz.y) - 5, 10, 10); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(X(pz.x) - 5, Y(pz.y) - 5, 10, 10);
    }
  }
  if (lupa) { x.strokeStyle = '#10394A'; x.lineWidth = 2; x.strokeRect(X(lupa.x - 10), Y(lupa.y + 3), 20 * sk, 6 * sk); }
  x.fillStyle = '#10394A'; x.font = '600 11px "IBM Plex Sans", system-ui, sans-serif';
  x.fillText('S ↑', w - marg - 22, marg - 6);
  x.fillRect(X(0), h - 7, 50 * sk, 2); x.fillText('50 m', X(0) + 50 * sk + 6, h - 3);
  x.fillText('uvratina', X(0) + 2, marg - 6);
  crtajLupu();
}
function izKoordinata(e) {
  const r = kc.getBoundingClientRect();
  return { mx: (e.clientX - r.left - geo.marg) / geo.sk, my: (geo.h - (e.clientY - r.top) - geo.marg) / geo.sk, r };
}
kc.addEventListener('click', (e) => {
  if (!geo || !R) return;
  const { mx, my } = izKoordinata(e);
  const k = Math.round(my / P.zahvat) - 1;
  if (k < 0 || k >= P.prohoda - 1 || mx < P.uvratina || mx > istok(S, my) - P.uvratina) return;
  lupa = { k, x: Math.max(P.uvratina + 10, Math.min(istok(S, my) - P.uvratina - 10, mx)), y: (k + 1) * P.zahvat };
  crtajKartu();
});
kc.addEventListener('pointermove', (e) => {
  if (!geo) return;
  const { mx, my, r } = izKoordinata(e);
  if (mx < 0 || my < 0 || mx > istok(S, my) || my > P.sirina) { tip.hidden = true; return; }
  const z = zona(mx, my);
  let t = `<b>x ${Math.round(mx)} m, y ${Math.round(my)} m</b><span>zona ${z} · norma ${tis(O.norma[z])} zrna/ha</span>`;
  if (R) {
    const k = Math.round(my / P.zahvat) - 1;
    const s = R.spojevi[k];
    if (s && Math.abs(my - s.y) < 1.2) { const i = Math.round((mx - s.x0) / 2); if (i >= 0 && i < s.d.length) t += `<span>spoj ${k + 1}/${k + 2}: razmak ${Math.round((P.razmakRed + s.d[i]) * 100)} cm (${s.d[i] >= 0 ? '+' : ''}${Math.round(s.d[i] * 100)} cm)</span><span>klikni za lupu</span>`; }
  }
  tip.hidden = false; tip.innerHTML = t;
  tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 210) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
});
kc.addEventListener('pointerleave', () => { tip.hidden = true; });

/* lupa: 20 m uzduž spoja, 6 m poprijeko, redovi u mjerilu */
function crtajLupu() {
  const c = $('lupa'); const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.fillStyle = '#8b6d50'; x.fillRect(0, 0, w, h);
  x.font = '600 11px "IBM Plex Sans", system-ui, sans-serif';
  if (!R || !lupa || !(anim && anim.t >= R.prohodi[lupa.k + 1].t1)) { x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(R ? 'Klikni spoj na karti parcele (nakon što je zasijan).' : 'Lupa spoja nakon sjetve.', w / 2, h / 2); $('lupa-opis').textContent = ''; return; }
  const a = R.prohodi[lupa.k], b = R.prohodi[lupa.k + 1];
  const sx = w / 20, sy = h / 6, X = (m) => (m - (lupa.x - 10)) * sx, Y = (m) => h / 2 - (m - lupa.y) * sy;
  const red = (p, r, boja) => {
    const off = (r - (P.redova - 1) / 2) * P.razmakRed;
    x.strokeStyle = boja; x.lineWidth = 3; x.beginPath();
    for (let m = lupa.x - 10; m <= lupa.x + 10 + 1e-9; m += 2) { const i = Math.round((m - p.x0) / 2); const yy = p.yc + off + (p.e[Math.max(0, Math.min(p.n - 1, i))] || 0); if (m === lupa.x - 10) x.moveTo(X(m), Y(yy)); else x.lineTo(X(m), Y(yy)); }
    x.stroke();
  };
  for (let r = 0; r < P.redova; r++) { red(a, r, '#d8e9c9'); red(b, r, '#ffe7a8'); }
  const i = Math.round((lupa.x - a.x0) / 2), d = R.spojevi[lupa.k].d[Math.max(0, Math.min(R.spojevi[lupa.k].d.length - 1, i))];
  x.fillStyle = '#fff'; x.textAlign = 'left';
  x.fillText(`prohod ${lupa.k + 1}`, 6, h - 8); x.fillText(`prohod ${lupa.k + 2}`, 6, 14);
  x.textAlign = 'right'; x.fillText('20 m', w - 6, h - 8);
  $('lupa-opis').textContent = `Spoj ${lupa.k + 1}/${lupa.k + 2} na x = ${Math.round(lupa.x)} m: razmak zadnjeg i prvog reda ${Math.round((P.razmakRed + d) * 100)} cm (zadano 70 cm). Mjerilo poprijeko je 3,3 puta veće nego uzduž.`;
}

/* ---------------------------------------------------------------- histogram odstupanja spoja */
function boje() { const cs = getComputedStyle(document.documentElement); const g = (n) => cs.getPropertyValue(n).trim(); return { s1: g('--pz-s1'), al: g('--pz-al'), ink: g('--ink'), body: g('--body'), rule: g('--rule') }; }
let hovH = null;
function crtajHist() {
  const c = $('g-hist'); const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  x.font = '11px "IBM Plex Sans", system-ui, sans-serif';
  const B = boje(), L = 36, Rr = 10, T = 10, Bt = 22, pw = w - L - Rr, ph = h - T - Bt;
  x.strokeStyle = B.rule; x.beginPath(); x.moveTo(L, T + ph); x.lineTo(L + pw, T + ph); x.stroke();
  x.fillStyle = B.body; x.textAlign = 'center';
  for (let v = -30; v <= 30; v += 10) x.fillText((v > 0 ? '+' : '') + v + ' cm', L + (v + 31.25) / 62.5 * pw, h - 6);
  const gotovo = R && anim && anim.t >= R.ukupno;
  if (!gotovo) { x.fillText('Odstupanje razmaka na spojevima nakon sjetve', L + pw / 2, T + ph / 2); $('g-hist-tip').hidden = true; return; }
  const H = R.hist, ukupno = H.reduce((a, b) => a + b, 0), max = Math.max(...H);
  const bw = pw / H.length;
  H.forEach((n, i) => { const v = (i - 12) * 2.5; x.fillStyle = BOJA_SPOJ(v / 100); const hh = n / max * ph; x.fillRect(L + i * bw + 1, T + ph - hh, bw - 2, hh); });
  x.save(); x.setLineDash([4, 3]); x.strokeStyle = B.ink; [-10, 10].forEach((v) => { const px = L + (v + 31.25) / 62.5 * pw; x.beginPath(); x.moveTo(px, T); x.lineTo(px, T + ph); x.stroke(); }); x.restore();
  const tp = $('g-hist-tip');
  if (hovH !== null) {
    const i = Math.max(0, Math.min(H.length - 1, Math.floor((hovH * w - L) / bw)));
    const v = (i - 12) * 2.5;
    tp.hidden = false; tp.innerHTML = `<b>${v > 0 ? '+' : ''}${hr(v - 1.25, 2)} do ${v > 0 ? '+' : ''}${hr(v + 1.25, 2)} cm</b><span>${hr(100 * H[i] / ukupno)} % duljine spojeva</span>` + (i === 0 || i === H.length - 1 ? '<span>(i sve izvan raspona)</span>' : '');
    tp.style.left = Math.min(Math.max(0, L + i * bw + 10), w - 190) + 'px';
  } else tp.hidden = true;
}
$('g-hist').addEventListener('pointermove', (e) => { const r = $('g-hist').getBoundingClientRect(); hovH = (e.clientX - r.left) / r.width; crtajHist(); });
$('g-hist').addEventListener('pointerleave', () => { hovH = null; crtajHist(); });

/* ---------------------------------------------------------------- pokazatelji, dijagnoza, ocjena */
function pokazi() {
  const k = R.k;
  const red = (n, v) => `<dt>${esc(n)}</dt><dd>${v}</dd>`;
  $('pok').innerHTML = '<dl class="pz-bil">' +
    red('Spojevi unutar ±5 cm', hr(k.spoj5) + ' %') + red('Spojevi unutar ±10 cm', hr(k.spoj10) + ' %') + red('Prosječno odstupanje spoja', hr(k.srOdst) + ' cm') +
    red('Propušteni ili dvostruki redovi', hr(k.propust, 2) + ' % duljine') +
    red('Preklop u uvratinama', hr(k.preklopU, 2) + ' % (' + Math.round(k.preklopM) + ' m reda)') + red('Propust ispred uvratina', hr(k.propustU, 2) + ' % (' + Math.round(k.propustM) + ' m reda)') +
    red('Preskoci / dvojke', hr(k.preskoci) + ' % / ' + hr(k.dvojke) + ' %') +
    red('Površina', hr(k.povrsina, 2) + ' ha') + red('Sjeme', tis(k.zrna) + ' zrna (' + hr(k.vrece, 1) + ' vreća)') +
    red('Procjena prinosa', hr(k.prinosHa, 2) + ' t/ha') + red('Vrijeme rada', hhmm(k.vrijeme * 3600) + ' h' + (k.cekanje ? ` (čekanje ${Math.round(k.cekanje)} min)` : '')) +
    red('Gorivo', Math.round(k.gorivo) + ' L') + red('Prinos × cijena − sjeme', tis(k.dobit) + ' €') + red('Razlika prema jednakoj normi', (k.dobitHa >= 0 ? '+' : '') + hr(k.dobitHa) + ' €/ha') + '</dl>' +
    '<p class="pom">Cijene i prinos su procjena modela za usporedbu rješenja, ne kalkulacija gospodarstva.</p>';
}
$('d-provjeri').addEventListener('click', () => {
  const v = $('d-odabir').value; if (!v) return;
  dijagnoza = v === S.kvar;
  $('d-rez').innerHTML = dijagnoza ? '<span class="pz-ok">Točno.</span> Dok je RTK korekcija nedostupna, prijamnik radi s točnošću desetak centimetara, pa spojevi u tom dijelu parcele odstupaju više.'
    : '<span class="pz-ne">Nije to.</span> Pogledaj na karti spojeva gdje se odstupanja pojavljuju i usporedi s dnevnikom i stanjem korekcije.';
  if (R && anim && anim.t >= R.ukupno) ocjena();
});
function ocjena() {
  const pr = provjeri(S, R.k, dijagnoza);
  const ok = pr.every((p) => p.ok);
  const fmt = { spoj5: (v) => hr(v) + ' %', spoj10: (v) => hr(v) + ' %', propust: (v) => hr(v, 2) + ' %', preklopU: (v) => hr(v, 2) + ' %', propustU: (v) => hr(v, 2) + ' %', singulacija: (v) => hr(v) + ' %', vrijeme: (v) => hhmm(v * 3600) + ' h', dobitHa: (v) => (v >= 0 ? '+' : '') + hr(v) + ' €/ha', dijagnoza: (v) => (v ? 'upisan' : 'nije upisan') };
  $('rez').innerHTML = `<ul class="pz-prov">${pr.map((p) => `<li class="${p.ok ? 'ok' : 'ne'}"><b>${p.ok ? '✓' : '✗'}</b> ${esc(p.opis)} — ${esc(fmt[p.kljuc](p.v))}</li>`).join('')}</ul>` +
    `<p><b>${ok ? 'Scenarij je uspješan.' : 'Scenarij nije uspješan.'}</b> Bodovi: <b>${R.k.bodovi}</b>.</p>` +
    '<p class="pom">Bodovi = 10 × % spojeva unutar ±10 cm − 50 × % propuštenih ili dvostrukih redova − 300 × (preklop + propust na uvratinama, %) − 15 × (preskoci + dvojke, %) + razlika dobiti prema jednakoj normi (€/ha).</p>';
  window.__ts = { stanje: 'gotovo', k: R.k, pr: pr.map((p) => p.ok), ok };
}

/* ---------------------------------------------------------------- dnevnik */
function zapisi(t, tekst, upoz = false) { dnevnik.push({ t, tekst, upoz }); }
function prikaziDnevnik() {
  const tdo = anim ? anim.t : 0;
  $('log').innerHTML = dnevnik.filter((d) => d.t <= tdo + 1e-6).map((d) => `<li${d.upoz ? ' class="pz-ne"' : ''}><span class="t">${hhmm(d.t)}</span>${esc(d.tekst)}</li>`).reverse().join('');
}

function crtajSve() { crtajKartu(); crtajHist(); prikaziDnevnik(); }
new ResizeObserver(crtajSve).observe($('k-karta'));
new ResizeObserver(() => { crtajHist(); crtajLupu(); }).observe($('k-lupa'));
const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', crtajSve);
new MutationObserver(crtajSve).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

postaviScenarij($('s-scen').value);
postaviSloj('spojevi');
window.__ts = { stanje: 'plan' };
