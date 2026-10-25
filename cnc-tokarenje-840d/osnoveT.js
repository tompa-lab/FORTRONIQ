// osnoveT.js — „Osnove CNC-a” (DOS ForTroniQ, područje CNC tokarenje — SINUMERIK 840D)
// ES modul bez ovisnosti. Sav sadržaj, crteži (inline SVG) i logika vježbi i testa.
// Redoslijed tema i vrijednosti u vježbama slijede izvorni tečaj; tekst i crteži su naši.  © ForTroniQ d.o.o.

const KLJUC = 'ftq-cnc-tok-840d-osnove';
const NS = 'http://www.w3.org/2000/svg';
const MANJE_GIBANJA = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
const PI = Math.PI;

function h(tag, attrs, ...djeca) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const d of djeca) if (d != null) e.append(d);
  return e;
}
function sv(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
const r1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- brojevi
function fmt(v, d = 2) {
  if (v == null || !isFinite(v)) return '–';
  let t = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
  if (d > 0) t = t.replace(/\.?0+$/, '');
  if (t === '-0') t = '0';
  return t.replace('-', '−').replace('.', ',');
}
function nc(v) { // zapis u NC bloku: točka, znak minus
  const t = String(Math.round(v * 1000) / 1000);
  return t === '-0' ? '0' : t;
}
function broj(t) {
  if (t == null) return null;
  t = String(t).trim().replace(/\s+/g, '');
  if (t === '') return null;
  t = t.replace(/[−–]/g, '-').replace(',', '.');
  const m = t.match(/^([+-]?\d+(?:\.\d+)?)°(?:(\d+(?:\.\d+)?)['’′]?)?$/);
  if (m) {
    const st = parseFloat(m[1]), mi = m[2] ? parseFloat(m[2]) / 60 : 0;
    return m[1].startsWith('-') ? st - mi : st + mi;
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
  return parseFloat(t);
}
function mmss(sek) { sek = Math.max(0, Math.round(sek)); return Math.floor(sek / 60) + ':' + String(sek % 60).padStart(2, '0'); }
function izmijesaj(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------------------------------------------------------------- spremanje
const STANJE = (() => { try { return JSON.parse(localStorage.getItem(KLJUC)) || {}; } catch (e) { return {}; } })();
if (!STANJE.gotovo || typeof STANJE.gotovo !== 'object') STANJE.gotovo = {};
function spremi() { try { localStorage.setItem(KLJUC, JSON.stringify(STANJE)); } catch (e) { /* bez spremanja */ } }

// ---------------------------------------------------------------- čišćenje pri promjeni stranice
let CISTI = [];
function naCiscenje(f) { CISTI.push(f); return f; }
function ocisti() { for (const f of CISTI) { try { f(); } catch (e) { /* ništa */ } } CISTI = []; }

function animiraj(ms, fn, kraj) {
  let stop = false, id = 0, tm = 0;
  if (MANJE_GIBANJA || ms <= 0) {
    fn(1);
    tm = setTimeout(() => { if (!stop && kraj) kraj(); }, MANJE_GIBANJA ? 160 : 0);
    return () => { stop = true; clearTimeout(tm); };
  }
  const t0 = performance.now();
  const korak = (t) => {
    if (stop) return;
    const u = Math.min(1, (t - t0) / ms);
    fn(u);
    if (u < 1) id = requestAnimationFrame(korak); else if (kraj) kraj();
  };
  id = requestAnimationFrame(korak);
  return () => { stop = true; cancelAnimationFrame(id); };
}
function pauza(ms, kraj) { const t = setTimeout(kraj, MANJE_GIBANJA ? Math.min(ms, 200) : ms); return () => clearTimeout(t); }

// ---------------------------------------------------------------- crtež (SVG u milimetrima)
class Crtez {
  constructor(o) {
    this.o = o;
    const m = o.m ?? 28;
    this.ml = o.ml ?? m; this.mr = o.mr ?? m; this.mt = o.mt ?? m; this.mb = o.mb ?? m;
    const sir = o.sir || 600;
    this.k = (sir - this.ml - this.mr) / (o.x1 - o.x0);
    this.sir = sir; this.H = Math.round((o.y1 - o.y0) * this.k + this.mt + this.mb);
    this.svg = sv('svg', { viewBox: `0 0 ${sir} ${this.H}`, class: 'os-svg' + (o.cls ? ' ' + o.cls : ''), role: 'img', 'aria-label': o.oznaka || 'Crtež', focusable: 'false' });
  }
  X(x) { return r1(this.ml + (x - this.o.x0) * this.k); }
  Y(y) { return r1(this.mt + (this.o.y1 - y) * this.k); }
  L(mm) { return mm * this.k; }
  g(cls, p) { return sv('g', { class: cls || null }, p || this.svg); }
  lin(xa, ya, xb, yb, cls, p) { return sv('line', { x1: this.X(xa), y1: this.Y(ya), x2: this.X(xb), y2: this.Y(yb), class: cls }, p || this.svg); }
  d(tocke, zatvori) { return tocke.map((t, i) => (i ? 'L' : 'M') + this.X(t[0]) + ' ' + this.Y(t[1])).join('') + (zatvori ? 'Z' : ''); }
  poli(tocke, cls, p, zatvori) { return sv('path', { d: this.d(tocke, zatvori), class: cls }, p || this.svg); }
  put(d, cls, p) { return sv('path', { d, class: cls }, p || this.svg); }
  pravok(xa, ya, xb, yb, cls, p, rz) {
    return sv('rect', { x: this.X(Math.min(xa, xb)), y: this.Y(Math.max(ya, yb)), width: r1(this.L(Math.abs(xb - xa))), height: r1(this.L(Math.abs(yb - ya))), rx: rz ? r1(this.L(rz)) : null, class: cls }, p || this.svg);
  }
  krug(x, y, rmm, cls, p) { return sv('circle', { cx: this.X(x), cy: this.Y(y), r: r1(this.L(rmm)), class: cls }, p || this.svg); }
  tocka(x, y, rpx, cls, p) { return sv('circle', { cx: this.X(x), cy: this.Y(y), r: rpx, class: cls }, p || this.svg); }
  tekst(x, y, t, cls, p, o = {}) {
    const e = sv('text', { x: r1(this.X(x) + (o.dx || 0)), y: r1(this.Y(y) + (o.dy || 0)), class: cls || 'oc-tx', 'text-anchor': o.a || 'middle' }, p || this.svg);
    if (o.rot) e.setAttribute('transform', `rotate(${o.rot} ${e.getAttribute('x')} ${e.getAttribute('y')})`);
    e.textContent = t; return e;
  }
  // luk u mm, kutovi u radijanima (matematički smjer); smjer određuje predznak (a1 − a0)
  lukD(cx, cy, r, a0, a1, nastavi) {
    const xa = cx + r * Math.cos(a0), ya = cy + r * Math.sin(a0), xb = cx + r * Math.cos(a1), yb = cy + r * Math.sin(a1);
    const d = a1 - a0, vel = Math.abs(d) > PI ? 1 : 0, sw = d > 0 ? 0 : 1, R = r1(this.L(r));
    if (Math.abs(d) >= 2 * PI - 1e-6) { // puni krug iz dva dijela
      const am = a0 + d / 2, xm = cx + r * Math.cos(am), ym = cy + r * Math.sin(am);
      return (nastavi ? '' : `M${this.X(xa)} ${this.Y(ya)}`) + `A${R} ${R} 0 0 ${sw} ${this.X(xm)} ${this.Y(ym)}A${R} ${R} 0 0 ${sw} ${this.X(xb)} ${this.Y(yb)}`;
    }
    return (nastavi ? '' : `M${this.X(xa)} ${this.Y(ya)}`) + `A${R} ${R} 0 ${vel} ${sw} ${this.X(xb)} ${this.Y(yb)}`;
  }
  luk(cx, cy, r, a0, a1, cls, p) { return this.put(this.lukD(cx, cy, r, a0, a1), cls, p); }
  strelica(px, py, kut, vel = 8, cls = 'oc-strf', p) { // px koordinate; kut na zaslonu (rad), vrh u (px,py)
    const b = 0.36, x1 = px - vel * Math.cos(kut - b), y1 = py - vel * Math.sin(kut - b), x2 = px - vel * Math.cos(kut + b), y2 = py - vel * Math.sin(kut + b);
    return sv('path', { d: `M${r1(px)} ${r1(py)}L${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}Z`, class: cls }, p || this.svg);
  }
  strelicaMM(xa, ya, xb, yb, cls, p, vel) { // linija sa strelicom na kraju
    const g = this.g(null, p); this.lin(xa, ya, xb, yb, cls || 'oc-l', g);
    const kut = Math.atan2(this.Y(yb) - this.Y(ya), this.X(xb) - this.X(xa));
    this.strelica(this.X(xb), this.Y(yb), kut, vel || 9, 'oc-strf', g); return g;
  }
  mreza(korak, p) {
    const g = this.g('oc-mr', p), o = this.o;
    for (let x = Math.ceil(o.x0 / korak) * korak; x <= o.x1 + 1e-9; x += korak) this.lin(x, o.y0, x, o.y1, null, g);
    for (let y = Math.ceil(o.y0 / korak) * korak; y <= o.y1 + 1e-9; y += korak) this.lin(o.x0, y, o.x1, y, null, g);
    return g;
  }
  osi(o = {}) {
    const g = this.g('oc-osi', o.p), b = this.o;
    const xa = o.xa ?? b.x0, xb = o.xb ?? b.x1, ya = o.ya ?? b.y0, yb = o.yb ?? b.y1, x0 = o.x0 ?? 0, y0 = o.y0 ?? 0;
    this.lin(xa, y0, xb, y0, 'oc-os', g); this.lin(x0, ya, x0, yb, 'oc-os', g);
    this.strelica(this.X(xb) + 2, this.Y(y0), 0, 10, 'oc-osf', g);
    this.strelica(this.X(x0), this.Y(yb) - 2, -PI / 2, 10, 'oc-osf', g);
    this.tekst(xb, y0, o.lx || '+X', 'oc-txo', g, { dx: -4, dy: -9, a: 'end' });
    this.tekst(x0, yb, o.ly || '+Y', 'oc-txo', g, { dx: 9, dy: 10, a: 'start' });
    if (o.minus) { this.tekst(xa, y0, '−X', 'oc-txo', g, { dx: 2, dy: -9, a: 'start' }); this.tekst(x0, ya, '−Y', 'oc-txo', g, { dx: 9, dy: -4, a: 'start' }); }
    if (o.oznake) {
      const k = o.oznake;
      for (let x = Math.ceil(xa / k) * k; x <= xb - k / 2; x += k) if (Math.abs(x) > 1e-9) { this.lin(x, y0 - 0.9 / this.k * 3, x, y0 + 0.9 / this.k * 3, 'oc-os', g); this.tekst(x, y0, fmt(x, 1), 'oc-txs', g, { dy: 15 }); }
      for (let y = Math.ceil(ya / k) * k; y <= yb - k / 2; y += k) if (Math.abs(y) > 1e-9) { this.lin(x0 - 3 / this.k, y, x0 + 3 / this.k, y, 'oc-os', g); this.tekst(x0, y, fmt(y, 1), 'oc-txs', g, { dx: -6, dy: 4, a: 'end' }); }
    }
    return g;
  }
  W(x, y, p, oznaka = 'W') { // simbol nultočke obratka
    const g = this.g('oc-w', p), cx = this.X(x), cy = this.Y(y), r = 7;
    sv('circle', { cx, cy, r, class: 'oc-wk' }, g);
    sv('path', { d: `M${cx} ${cy}L${cx + r} ${cy}A${r} ${r} 0 0 0 ${cx} ${cy - r}Z M${cx} ${cy}L${cx - r} ${cy}A${r} ${r} 0 0 0 ${cx} ${cy + r}Z`, class: 'oc-wf' }, g);
    if (oznaka) { const t = sv('text', { x: cx - 10, y: cy + 18, class: 'oc-txb', 'text-anchor': 'end' }, g); t.textContent = oznaka; }
    return g;
  }
  M(x, y, p, oznaka = 'M') { // simbol nultočke stroja
    const g = this.g('oc-w', p), cx = this.X(x), cy = this.Y(y), r = 7;
    sv('circle', { cx, cy, r, class: 'oc-wk' }, g);
    sv('path', { d: `M${cx - r * .7} ${cy - r * .7}L${cx + r * .7} ${cy + r * .7}M${cx + r * .7} ${cy - r * .7}L${cx - r * .7} ${cy + r * .7}`, class: 'oc-mk' }, g);
    if (oznaka) { const t = sv('text', { x: cx - 10, y: cy + 18, class: 'oc-txb', 'text-anchor': 'end' }, g); t.textContent = oznaka; }
    return g;
  }
  // kote: (xa, yt)…(xb, yt) su točke predmeta, yd je visina kotne crte (mm)
  kotaH(xa, xb, yt, yd, t, p, o = {}) {
    const g = this.g('oc-kota', p), Y = this.Y(yd), A = this.X(xa), B = this.X(xb), sm = Math.sign(this.Y(yd) - this.Y(yt)) || 1;
    if (Math.abs(yt - yd) > 1e-6) { sv('line', { x1: A, y1: this.Y(yt) + sm * 3, x2: A, y2: Y + sm * 4 }, g); sv('line', { x1: B, y1: this.Y(yt) + sm * 3, x2: B, y2: Y + sm * 4 }, g); }
    sv('line', { x1: A, y1: Y, x2: B, y2: Y }, g);
    const lj = Math.min(A, B), dj = Math.max(A, B);
    this.strelica(lj, Y, PI, 8, 'oc-kf', g); this.strelica(dj, Y, 0, 8, 'oc-kf', g);
    const tx = sv('text', { x: r1((A + B) / 2 + (o.dx || 0)), y: Y - 5, class: 'oc-kt', 'text-anchor': 'middle' }, g); tx.textContent = t;
    return g;
  }
  kotaV(ya, yb, xt, xd, t, p, o = {}) {
    const g = this.g('oc-kota', p), X = this.X(xd), A = this.Y(ya), B = this.Y(yb), sm = Math.sign(this.X(xd) - this.X(xt)) || 1;
    if (Math.abs(xt - xd) > 1e-6) { sv('line', { x1: this.X(xt) + sm * 3, y1: A, x2: X + sm * 4, y2: A }, g); sv('line', { x1: this.X(xt) + sm * 3, y1: B, x2: X + sm * 4, y2: B }, g); }
    sv('line', { x1: X, y1: A, x2: X, y2: B }, g);
    const gor = Math.min(A, B), dol = Math.max(A, B);
    this.strelica(X, gor, -PI / 2, 8, 'oc-kf', g); this.strelica(X, dol, PI / 2, 8, 'oc-kf', g);
    const ty = r1((A + B) / 2 + (o.dy || 0)), tx = sv('text', { x: X - 5, y: ty, class: 'oc-kt', 'text-anchor': 'middle', transform: `rotate(-90 ${X - 5} ${ty})` }, g); tx.textContent = t;
    return g;
  }
}

// ---------------------------------------------------------------- vrtnja glodala (zajednička petlja)
const VRTNJA = { lista: [], id: 0, t: 0 };
function vrtiDodaj(g, cx, cy) { const o = { g, cx, cy, n: 0, kut: 0 }; VRTNJA.lista.push(o); vrtiPokreni(); return o; }
function vrtiPokreni() {
  if (MANJE_GIBANJA || VRTNJA.id) return;
  VRTNJA.t = performance.now();
  const korak = (t) => {
    const dt = Math.min(0.05, (t - VRTNJA.t) / 1000); VRTNJA.t = t;
    for (const o of VRTNJA.lista) {
      if (!o.n) continue;
      o.kut = (o.kut - o.n / 60 * 360 * dt * 0.22) % 360; // usporeno ×0,22 da se vrtnja vidi; smjer M3 (gledano odozgo u smjeru kazaljke)
      o.g.setAttribute('transform', `rotate(${r1(o.kut)} ${o.cx} ${o.cy})`);
    }
    VRTNJA.id = VRTNJA.lista.length ? requestAnimationFrame(korak) : 0;
  };
  VRTNJA.id = requestAnimationFrame(korak);
}
function vrtiOcisti() { if (VRTNJA.id) cancelAnimationFrame(VRTNJA.id); VRTNJA.id = 0; VRTNJA.lista = []; }

// glodalo gledano odozgo: tijelo, z oštrica; vraća grupu koja se vrti
function glodaloOdozgo(p, cx, cy, r, z, natpis) {
  const vanj = sv('g', { class: 'oc-glodalo' }, p);
  const g = sv('g', null, vanj);
  sv('circle', { cx, cy, r, class: 'oc-gl-tijelo' }, g);
  for (let i = 0; i < z; i++) {
    const a = i / z * 2 * PI, a2 = a + 0.42 * 2 * PI / z;
    const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a), x2 = cx + (r * 0.55) * Math.cos(a2), y2 = cy + (r * 0.55) * Math.sin(a2);
    sv('path', { d: `M${r1(cx)} ${r1(cy)}L${r1(x2)} ${r1(y2)}`, class: 'oc-gl-utor' }, g);
    sv('rect', { x: r1(x1 - r * 0.11), y: r1(y1 - r * 0.07), width: r1(r * 0.22), height: r1(r * 0.14), class: 'oc-gl-ost', transform: `rotate(${r1(a * 180 / PI + 90)} ${r1(x1)} ${r1(y1)})` }, g);
  }
  sv('circle', { cx, cy, r: r * 0.18, class: 'oc-gl-sred' }, g);
  if (natpis) { const t = sv('text', { x: cx, y: cy + r + 18, class: 'oc-txs', 'text-anchor': 'middle' }, vanj); t.textContent = natpis; }
  return g;
}

// ---------------------------------------------------------------- vježba s upisom (START, polja, INPUT, Rješenje, Ponovi)
// cfg: { zadaci:[{naslov, opis, polja:[{k, oz, tocno, tol, alt:[...], raspon:[a,b], modal}], savjet, pomoc}], crtez:{el, oznaci(i), rijeseno(i, cb), reset()}, kraj, naGotovo }
function vjezbaUnos(cfg) {
  const n = cfg.zadaci.length;
  const omot = h('div', { class: 'os-unos', role: 'group', 'aria-label': 'Prozor za unos' });
  const glava = h('div', { class: 'os-unos-h' }, h('span', { text: cfg.naslov || 'Prozor za unos' }), h('b', { class: 'os-nap', text: '0/' + n }));
  const zad = h('p', { class: 'os-zad', text: 'Klikni START, upiši vrijednosti i potvrdi s INPUT (ili Enter).' });
  const polja = h('div', { class: 'os-polja' });
  const bStart = h('button', { type: 'button', class: 'os-tipka os-start', text: 'START' });
  const bInput = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT', disabled: true });
  const bRj = h('button', { type: 'button', class: 'gumb tanki', text: 'Rješenje', disabled: true });
  const bPon = h('button', { type: 'button', class: 'gumb tanki', text: 'Ponovi', hidden: true });
  const por = h('p', { class: 'os-por', 'aria-live': 'polite' });
  const pomoc = h('details', { class: 'os-pomoc', hidden: true }, h('summary', { text: 'Kako se računa?' }), h('div'));
  omot.append(glava, zad, polja, h('div', { class: 'os-gumbi' }, bStart, bInput, bRj, bPon), por, pomoc);
  let i = -1, ulazi = [];
  function poruka(t, vrsta) { por.textContent = t; por.className = 'os-por' + (vrsta ? ' ' + vrsta : ''); }
  function prikaziZadatak() {
    const z = cfg.zadaci[i];
    glava.lastChild.textContent = (i + 1) + '/' + n;
    zad.innerHTML = z.opis;
    polja.innerHTML = ''; ulazi = [];
    for (const p of z.polja) {
      const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': (p.naziv || p.k) + (p.oz ? ' (' + p.oz + ')' : '') });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); naEnter(inp); } });
      inp.addEventListener('input', () => inp.classList.remove('krivo'));
      polja.append(h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: p.k }), inp, h('em', { text: p.oz || '' })));
      ulazi.push(inp);
    }
    if (z.pomoc) { pomoc.hidden = false; pomoc.open = false; pomoc.lastChild.innerHTML = z.pomoc; } else pomoc.hidden = true;
    if (cfg.crtez.oznaci) cfg.crtez.oznaci(i);
    ulazi[0].focus({ preventScroll: true });
  }
  function naEnter(inp) {
    const k = ulazi.indexOf(inp);
    const prazno = ulazi.findIndex((u, j) => j > k && u.value.trim() === '' && cfg.zadaci[i].polja[j].modal === undefined);
    if (prazno > -1) ulazi[prazno].focus(); else provjeri();
  }
  function provjeri() {
    if (i < 0 || i >= n) return;
    const z = cfg.zadaci[i], vr = [];
    let napomena = '';
    for (let j = 0; j < z.polja.length; j++) {
      const p = z.polja[j], u = ulazi[j];
      let v = broj(u.value);
      if (v === null) {
        if (p.modal !== undefined) { v = p.modal; }
        else { u.classList.add('krivo'); u.focus(); return poruka('Upiši vrijednost za ' + p.k + '.', 'krivo'); }
      } else if (p.modal !== undefined && Math.abs(v - p.modal) < 1e-9) napomena = ' ' + p.k + ' se ne mijenja — smiješ ga izostaviti, jer djeluje modalno.';
      if (Number.isNaN(v)) { u.classList.add('krivo'); u.focus(); return poruka('„' + u.value + '” nije broj. Decimalni znak smije biti zarez ili točka.', 'krivo'); }
      if (p.raspon && (v < p.raspon[0] - 1e-9 || v > p.raspon[1] + 1e-9)) { u.classList.add('krivo'); u.focus(); return poruka('Upisana vrijednost je izvan dopuštenog raspona (' + p.k + ': ' + fmt(p.raspon[0], 1) + ' … ' + fmt(p.raspon[1], 1) + ').', 'krivo'); }
      vr.push(v);
    }
    const krivi = [];
    z.polja.forEach((p, j) => { const ok = [p.tocno, ...(p.alt || [])].some((t) => Math.abs(vr[j] - t) <= (p.tol ?? 0.01)); if (!ok) krivi.push(j); });
    if (krivi.length) {
      krivi.forEach((j) => ulazi[j].classList.add('krivo')); ulazi[krivi[0]].focus();
      return poruka('Netočno: provjeri ' + krivi.map((j) => z.polja[j].k).join(' i ') + '. ' + (z.savjet || ''), 'krivo');
    }
    ulazi.forEach((u) => { u.disabled = true; });
    bInput.disabled = true; bRj.disabled = true;
    poruka('Točno.' + napomena + (z.potvrda ? ' ' + z.potvrda : ''), 'tocno');
    cfg.crtez.rijeseno(i, () => {
      i++;
      if (i >= n) {
        glava.lastChild.textContent = n + '/' + n + ' ✓';
        zad.textContent = cfg.kraj || 'Vježba je riješena.';
        bPon.hidden = false; bStart.disabled = true;
        if (cfg.naGotovo) cfg.naGotovo();
      } else { bInput.disabled = false; bRj.disabled = false; prikaziZadatak(); }
    });
  }
  bStart.addEventListener('click', () => {
    if (i >= 0) return;
    i = 0; bStart.disabled = true; bInput.disabled = false; bRj.disabled = false; poruka('');
    prikaziZadatak();
  });
  bInput.addEventListener('click', provjeri);
  bRj.addEventListener('click', () => {
    const z = cfg.zadaci[i]; if (!z) return;
    z.polja.forEach((p, j) => { ulazi[j].value = fmt(p.tocno, 3); ulazi[j].classList.remove('krivo'); });
    poruka('Rješenje je upisano u polja — potvrdi ga s INPUT.', '');
    bInput.focus();
  });
  bPon.addEventListener('click', () => {
    i = -1; polja.innerHTML = ''; bPon.hidden = true; bStart.disabled = false; bInput.disabled = true; bRj.disabled = true; pomoc.hidden = true;
    glava.lastChild.textContent = '0/' + n; zad.textContent = 'Klikni START, upiši vrijednosti i potvrdi s INPUT (ili Enter).'; poruka('');
    cfg.crtez.reset();
  });
  return omot;
}
// NC blok prikazan po riječima (za istaknuti blok u popisu)
function blokHTML(t) { return t.replace(/([A-Z]+)(=?[-\d.]+)?/g, (m) => '<span class="os-rij">' + m + '</span>'); }
function popisBlokova(blokovi) {
  const ol = h('ol', { class: 'os-prog', 'aria-label': 'NC program' });
  blokovi.forEach((b, i) => ol.append(h('li', { 'data-i': i, html: '<code>' + b + '</code>' })));
  ol.oznaci = (i) => $$('li', ol).forEach((li, j) => li.classList.toggle('akt', j === i));
  return ol;
}

// ================================================================= TEME
const TEME = [];
function tema(id, naziv, skup, stranice, o = {}) { TEME.push(Object.assign({ id, naziv, skup, stranice }, o)); }
const tekst = (html) => h('div', { class: 'os-tekst', html });
function dva(l, d, cls) { return h('div', { class: 'os-dva' + (cls ? ' ' + cls : '') }, h('div', { class: 'os-l' }, l), h('div', { class: 'os-d' }, d)); }
function slika(el, opis) { return h('figure', { class: 'os-slika' }, el, opis ? h('figcaption', { html: opis }) : null); }
function info(t) { return h('p', { class: 'os-info', 'aria-live': 'polite', html: t || '' }); }

// ---------------------------------------------------------------- 2D simulacija tokarenja: uzdužni presjek (Z vodoravno, X okomito)
// Obradak je rotacijsko tijelo: gornja polovica crta se punom bojom, donja zrcalno svjetlije. Alat je iznad osi (kosa postelja, X+ gore).
// o: { z:[a,b], r:[a,b], ob:{ z0, z1, R }, sir, start:{ x (promjer), z }, alat:'vanjski'|'svrdlo'|'unutarnji', Rn (polumjer oštrice za crtež), oznaka, celjusti }
class SimTok {
  constructor(o) {
    this.o = o; const sir = o.sir || 600, m = 24;
    const k = (sir - 2 * m) / (o.z[1] - o.z[0]); this.k = k;
    const H = Math.round(2 * m + (o.r[1] - o.r[0]) * k);
    this.svg = sv('svg', { viewBox: `0 0 ${sir} ${H}`, class: 'os-svg os-sim', role: 'img', 'aria-label': o.oznaka || 'Uzdužni presjek obratka s alatom' });
    this.Z = (z) => r1(m + (z - o.z[0]) * k); this.Rr = (r) => r1(m + (o.r[1] - r) * k);
    const { Z, Rr } = this, ob = o.ob;
    /* stezna glava i čeljusti lijevo od obratka */
    if (o.celjusti !== false) {
      const zc = ob.z0 - 0.5;
      sv('rect', { x: Z(o.z[0]) - 2, y: Rr(Math.min(o.r[1], ob.R + 30)), width: Math.max(0, Z(zc - 12) - Z(o.z[0]) + 2), height: r1((Math.min(o.r[1], ob.R + 30) - Math.max(o.r[0], -ob.R - 30)) * k), class: 'oc-stol' }, this.svg);
      for (const s of [1, -1]) { const ya = s * ob.R, yb = s * (ob.R + 14); sv('rect', { x: Z(zc - 12), y: Rr(Math.max(ya, yb)), width: r1(12 * k), height: r1(14 * k), class: 'oc-celj' }, this.svg); }
    }
    this.gOb = sv('g', null, this.svg);
    sv('line', { x1: Z(o.z[0]), y1: Rr(0), x2: Z(o.z[1]), y2: Rr(0), class: 'oc-osvr' }, this.svg);
    this.gPut = sv('g', null, this.svg);
    this.wZ = sv('g', null, this.svg);
    this.gAlat = sv('g', { class: 'oc-alat-g' }, this.svg);
    this.status = sv('text', { x: sir - m, y: 16, class: 'oc-txs', 'text-anchor': 'end' }, this.svg);
    /* profil obratka: stanice 0,2 mm, vanjski ro i unutarnji ri polumjer */
    this.dz = 0.2; this.n = Math.round((ob.z1 - ob.z0) / this.dz);
    this.ro = new Float32Array(this.n); this.ri = new Float32Array(this.n);
    this.vrsta = o.alat || 'vanjski'; this.Rn = o.Rn || 0.8;
    this.ocistiObradak();
    this.poz = Object.assign({}, o.start || { x: ob.R * 2 + 20, z: 10 });
    this.crtajAlat();
  }
  ocistiObradak() { this.ro.fill(this.o.ob.R); this.ri.fill(0); this.crtajObradak(); }
  zc(i) { return this.o.ob.z0 + (i + 0.5) * this.dz; }
  crtajObradak() {
    const { Z, Rr } = this, ob = this.o.ob; this.gOb.innerHTML = '';
    for (const s of [1, -1]) {
      let d = '';
      for (let i = 0; i < this.n; i++) {
        const a = this.ro[i], b = this.ri[i]; if (a <= b + 1e-6) continue;
        const za = Z(ob.z0 + i * this.dz), zb = Z(ob.z0 + (i + 1) * this.dz) + 0.6;
        d += `M${za} ${Rr(s * a)}L${zb} ${Rr(s * a)}L${zb} ${Rr(s * b)}L${za} ${Rr(s * b)}Z`;
      }
      sv('path', { d, class: s > 0 ? 'oc-ob oc-ob-tok' : 'oc-ob oc-ob-tok oc-ob-dolje' }, this.gOb);
    }
  }
  postaviAlat(vrsta, Rn) { this.vrsta = vrsta; if (Rn) this.Rn = Rn; this.crtajAlat(); }
  crtajAlat() {
    const { Z, Rr, k } = this, p = this.poz, g = this.gAlat; g.innerHTML = '';
    const tz = Z(p.z), tr = Rr(p.x / 2);
    if (this.vrsta === 'svrdlo') {
      const R0 = this.o.R0 || 8;
      sv('path', { d: `M${tz} ${tr}L${r1(tz + R0 * 0.6 * k)} ${Rr(p.x / 2 + R0)}L${r1(tz + 70 * k)} ${Rr(p.x / 2 + R0)}L${r1(tz + 70 * k)} ${Rr(p.x / 2 - R0)}L${r1(tz + R0 * 0.6 * k)} ${Rr(p.x / 2 - R0)}Z`, class: 'oc-alat' }, g);
      return;
    }
    if (this.vrsta === 'unutarnji') {
      sv('rect', { x: tz + 2, y: tr + 1.5 * k, width: r1(80 * k), height: r1(9 * k), class: 'oc-drzac' }, g);
      sv('path', { d: `M${tz} ${tr}L${r1(tz + 6 * k)} ${tr}L${r1(tz + 6 * k)} ${r1(tr + 5 * k)}Z`, class: 'oc-alat' }, g);
      sv('circle', { cx: tz, cy: tr, r: 2.4, class: 'oc-tk-s' }, g);
      return;
    }
    sv('rect', { x: r1(tz + 5 * k), y: r1(tr - 34 * k), width: r1(10 * k), height: r1(30 * k), class: 'oc-drzac' }, g);
    sv('path', { d: `M${tz} ${tr}L${r1(tz + 12 * k)} ${r1(tr - 1.5 * k)}L${r1(tz + 15 * k)} ${r1(tr - 10 * k)}L${r1(tz + 2 * k)} ${r1(tr - 9 * k)}Z`, class: 'oc-alat' }, g);
    sv('circle', { cx: tz, cy: tr, r: 2.4, class: 'oc-tk-s' }, g);
  }
  postaviStatus(t) { this.status.textContent = t; }
  ocistiPut() { this.gPut.innerHTML = ''; }
  /* skidanje materijala za vrh alata u (z, r) */
  rezi(z, r) {
    const ob = this.o.ob, i0 = Math.max(0, Math.floor((z - ob.z0) / this.dz)), v = this.vrsta;
    if (v === 'vanjski') { const i1 = Math.min(this.n - 1, Math.floor((z + 8 - ob.z0) / this.dz)); for (let i = i0; i <= i1; i++) if (this.ro[i] > r) { this.ro[i] = Math.max(0, r); this.izmjena = true; } }
    else if (v === 'unutarnji') { const i1 = Math.min(this.n - 1, Math.floor((z + 6 - ob.z0) / this.dz)); for (let i = i0; i <= i1; i++) if (this.ri[i] < r && this.ro[i] > r) { this.ri[i] = r; this.izmjena = true; } }
    else if (v === 'svrdlo') { const R0 = this.o.R0 || 8; for (let i = i0; i < this.n; i++) { const d = this.zc(i) - z, rr = Math.min(R0, d * 1.66); if (rr > this.ri[i] && this.ro[i] > rr) { this.ri[i] = rr; this.izmjena = true; } } }
  }
  /* pomaci: [{ tip:'G0'|'G1'|'G2'|'G3'|'cekaj', x, z (cilj; x promjer), I, K, b, prije() }] */
  izvedi(pomaci, naBlok, gotovo) {
    this.zaustavi();
    let i = 0, stop = null, zaust = false;
    const self = this;
    const dalje = () => {
      if (zaust) return;
      if (i >= pomaci.length) { self.stani = null; if (gotovo) gotovo(); return; }
      const m = pomaci[i++];
      if (naBlok) naBlok(m);
      if (m.prije) m.prije();
      if (m.tip === 'cekaj') { stop = pauza(m.ms || 500, dalje); return; }
      const a = Object.assign({}, self.poz), b = { x: m.x ?? a.x, z: m.z ?? a.z };
      const kl = m.tip === 'G0' ? 'oc-put-g0' : 'oc-put-g1';
      if (m.tip === 'G2' || m.tip === 'G3') {
        const cz = a.z + (m.K || 0), cr = a.x / 2 + (m.I || 0), R = Math.hypot(a.z - cz, a.x / 2 - cr);
        const a0 = Math.atan2(a.x / 2 - cr, a.z - cz); let d = Math.atan2(b.x / 2 - cr, b.z - cz) - a0;
        if (m.tip === 'G2') { while (d >= 0) d -= 2 * PI; } else { while (d <= 0) d += 2 * PI; }
        const put = sv('path', { d: '', class: kl }, self.gPut); let dd = `M${self.Z(a.z)} ${self.Rr(a.x / 2)}`;
        stop = animiraj(Math.max(400, Math.abs(d) * R / 30 * 1000), (u) => {
          const kut = a0 + d * u, z = cz + R * Math.cos(kut), r = cr + R * Math.sin(kut);
          dd += `L${self.Z(z)} ${self.Rr(r)}`; put.setAttribute('d', dd); self.rezi(z, r); self.poz = { x: 2 * r, z }; self.crtajAlat(); if (self.izmjena) { self.izmjena = false; self.crtajObradak(); }
        }, () => { self.poz = b; self.crtajAlat(); stop = pauza(150, dalje); });
        return;
      }
      const duz = Math.hypot(b.z - a.z, (b.x - a.x) / 2), brzi = m.tip === 'G0';
      const ms = duz < 1e-6 ? 0 : Math.max(250, duz / (brzi ? 120 : 30) * 1000);
      const ln = sv('line', { x1: self.Z(a.z), y1: self.Rr(a.x / 2), x2: self.Z(a.z), y2: self.Rr(a.x / 2), class: kl }, self.gPut);
      let zadnje = 0;
      stop = animiraj(ms, (u) => {
        const p = { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
        if (!brzi) { const n = Math.max(1, Math.ceil(Math.hypot((p.z - (self.poz.z)), (p.x - self.poz.x) / 2) / 0.2)); for (let q = 1; q <= n; q++) self.rezi(self.poz.z + (p.z - self.poz.z) * q / n, (self.poz.x + (p.x - self.poz.x) * q / n) / 2); }
        ln.setAttribute('x2', self.Z(p.z)); ln.setAttribute('y2', self.Rr(p.x / 2));
        self.poz = p; self.crtajAlat();
        const t = performance.now(); if (self.izmjena && t - zadnje > 60) { zadnje = t; self.izmjena = false; self.crtajObradak(); }
      }, () => { self.poz = b; self.crtajAlat(); if (self.izmjena) { self.izmjena = false; self.crtajObradak(); } stop = pauza(brzi ? 100 : 160, dalje); });
    };
    this.stani = () => { zaust = true; if (stop) stop(); };
    dalje();
  }
  zaustavi() { if (this.stani) this.stani(); this.stani = null; }
  vrati(p) { this.zaustavi(); this.poz = Object.assign({}, p); this.ocistiPut(); this.ocistiObradak(); this.crtajAlat(); this.postaviStatus(''); }
}

// kvadranti u ravnini Z–X (tokarenje): opis predznaka (miš, dodir, tipkovnica)
function kvadrantiZX(c, ez, ex, infoEl) {
  const g = c.g('oc-kvg');
  const kv = [
    [0, 0, ez, ex, 'Desno od W i iznad osi: <b>+Z, +X</b> — ovdje je alat kad je ispred čela obratka.', '+Z  +X'],
    [-ez, 0, 0, ex, 'Lijevo od W i iznad osi: <b>−Z, +X</b> — tu leže sve točke vanjske konture obratka.', '−Z  +X'],
    [-ez, -ex, 0, 0, 'Lijevo od W i ispod osi: <b>−Z, −X</b> — zrcalna slika gornje polovice; tu se ne programira.', '−Z  −X'],
    [0, -ex, ez, 0, 'Desno od W i ispod osi: <b>+Z, −X</b>.', '+Z  −X'],
  ];
  kv.forEach(([za, xa, zb, xb, t, kr]) => {
    const r = c.pravok(za, xa, zb, xb, 'oc-kv', g);
    r.setAttribute('tabindex', '0'); r.setAttribute('role', 'button'); r.setAttribute('aria-label', t.replace(/<[^>]+>/g, ''));
    const lab = c.tekst((za + zb) / 2, (xa + xb) / 2, kr, 'oc-kvt', g, { dy: 5 });
    const upali = () => { $$('.oc-kv', g).forEach((e) => e.classList.remove('akt')); $$('.oc-kvt', g).forEach((e) => e.classList.remove('akt')); r.classList.add('akt'); lab.classList.add('akt'); infoEl.innerHTML = t; };
    r.addEventListener('pointerenter', upali); r.addEventListener('focus', upali); r.addEventListener('click', upali);
    r.addEventListener('pointerleave', () => { r.classList.remove('akt'); lab.classList.remove('akt'); });
  });
  const l = c.lin(-ez, 0, ez, 0, 'oc-hit', g);
  l.setAttribute('tabindex', '0'); l.setAttribute('role', 'button'); l.setAttribute('aria-label', 'Sve točke na osi vretena imaju X0.');
  const t = () => { infoEl.innerHTML = 'Sve točke na osi vretena imaju <b>X0</b> — to je središte obratka.'; };
  l.addEventListener('pointerenter', t); l.addEventListener('focus', t); l.addEventListener('click', t);
  return g;
}
/* osi Z (vodoravno) i X (okomito) s natpisima */
function osiZX(c, o = {}) { return c.osi(Object.assign({ lx: '+Z', ly: '+X' }, o)); }
/* polovica profila (gornja) i zrcalna donja: tocke [[z, r], …] od čela do stražnjeg kraja */
function profil(c, tocke, p, samoGore) {
  const g = c.g(null, p);
  const gore = [[tocke[0][0], 0], ...tocke, [tocke[tocke.length - 1][0], 0]];
  c.poli(gore, 'oc-ob', g, true);
  if (!samoGore) c.poli(gore.map(([z, r]) => [z, -r]), 'oc-ob oc-ob-dolje', g, true);
  return g;
}
function osVretena(c, z0, z1, p) { return c.lin(z0, 0, z1, 0, 'oc-osvr', p); }

// ----------------------------------------------------------------- 0. Osnove tokarenja (korijen izbornika)
tema('osnove', 'Osnove tokarenja', 'korijen', [(box, api) => {
  box.append(tekst(`<p class="os-uvod">Ovo poglavlje vodi te kroz osnove bez kojih se CNC tokarilica ne može programirati: <b>geometriju</b> (kako se zadaju točke na obratku kad je X promjer), <b>tehnologiju</b> (brzina vrtnje, brzina rezanja i posmak) i <b>programiranje</b> (kako se iz toga piše NC program).</p>
  <ul class="os-lista"><li>Teme radiš redom ili po izboru u izborniku. Kvačica <b class="os-kv-oz">✓</b> označava završenu temu; pamti se samo u tvom pregledniku.</li>
  <li>Dulje teme imaju podstranice (npr. 1/7) — listaš ih gumbima <b>Natrag</b> i <b>Dalje</b>.</li>
  <li>U vježbama klikni <b>START</b>, upiši vrijednost i potvrdi tipkom <b>INPUT</b> ili Enter. Decimalni znak smije biti zarez ili točka.</li>
  <li>Animacije pokrećeš tipkom <b>CYCLE START</b>.</li>
  <li>Za teme računaj oko tri sata rada; završni test traje oko pola sata i na kraju daje potvrdu za ispis.</li></ul>`));
  const b1 = h('button', { type: 'button', class: 'gumb', text: 'Kreni: Ciljevi učenja' });
  b1.addEventListener('click', () => api.idi('ciljevi'));
  const b2 = h('button', { type: 'button', class: 'gumb tanki', text: 'Obriši oznake završenih tema' });
  b2.addEventListener('click', () => { STANJE.gotovo = {}; delete STANJE.test; spremi(); api.osvjezi(); b2.textContent = 'Oznake su obrisane'; });
  box.append(h('div', { class: 'os-gumbi' }, b1, b2));
}], { auto: true });

// ----------------------------------------------------------------- 1. Ciljevi učenja
const CILJ_GEO = ['koordinatni sustav Z–X', 'točke na obratku (X kao promjer)', 'apsolutne mjere', 'inkrementalne mjere', 'polarne mjere'];
const CILJ_TEH = ['brzina vrtnje n', 'brzina rezanja vc', 'brzina rezanja u praksi', 'stalna brzina rezanja G96 i LIMS', 'posmak f'];
const CILJ_PRO = ['građa programa', 'zaglavlje programa', 'adrese F, S, T, D, M', 'naredbe gibanja G0, G1, G2, G3', 'korekcija polumjera oštrice', 'korekcije alata', 'ciklusi i potprogrami'];
function ciljeviKartica(naslov, popis, id, api) {
  const b = h('button', { type: 'button', class: 'gumb tanki', text: 'Otvori: ' + naslov });
  b.addEventListener('click', () => api.idi(id));
  return h('div', { class: 'os-cilj' }, h('h3', { text: naslov }), h('ul', { class: 'os-lista' }, ...popis.map((t) => h('li', { text: t }))), b);
}
tema('ciljevi', 'Ciljevi učenja', 'korijen', [(box, api) => {
  box.append(tekst('<p>Nakon ovog poglavlja znat ćeš temeljna geometrijska, tehnološka i programska pravila CNC tokarenja. Za teme računaj oko <b>3 sata</b> učenja, a za završni test oko <b>30 minuta</b>.</p>'));
  box.append(h('div', { class: 'os-ciljevi' }, ciljeviKartica('Geometrija', CILJ_GEO, 'geometrija', api), ciljeviKartica('Tehnologija', CILJ_TEH, 'tehnologija', api), ciljeviKartica('Programiranje', CILJ_PRO, 'programiranje', api)));
}], { auto: true });

// ----------------------------------------------------------------- 2. Geometrija (naslov skupine)
function gumbiTema(api, ids) {
  return h('div', { class: 'os-gumbi' }, ...ids.map((id) => { const b = h('button', { type: 'button', class: 'gumb tanki' }); b.addEventListener('click', () => api.idi(id)); queueMicrotask(() => { b.textContent = (TEME.find((x) => x.id === id) || { naziv: id }).naziv; }); return b; }));
}
tema('geometrija', 'Geometrija', 'skupina', [(box, api) => {
  box.append(tekst(`<p>Prije svakog programa treba znati <b>gdje</b> je točka koju vrh alata mora doseći. Kod tokarenja obradak je rotacijsko tijelo, pa se svaka točka opisuje samo s dvije koordinate: <b>Z</b> uzduž osi vretena i <b>X</b> kao promjer. U ovoj skupini naučit ćeš:</p>
  <ul class="os-lista"><li>postaviti koordinatni sustav Z–X i nultočku obratka W na čelu,</li><li>očitati točke s crteža i upisati X kao promjer,</li>
  <li>zadati točku apsolutno (od W) i inkrementalno (od prethodne točke),</li><li>zadati točku polarno — polumjerom i kutom.</li></ul>`));
  box.append(gumbiTema(api, ['koord', 'tocke', 'abs', 'ink', 'polarno']));
}], { auto: true });

// ----------------------------------------------------------------- 3. Koordinatni sustavi
function crtezKoord(oznaka) {
  const c = new Crtez({ x0: -96, x1: 46, y0: -58, y1: 62, sir: 560, oznaka });
  osVretena(c, -94, 44);
  profil(c, [[0, 15], [-30, 15], [-30, 25], [-55, 25], [-55, 40], [-80, 40]]);
  osiZX(c, { xa: -92, xb: 42, ya: -54, yb: 58 });
  c.W(0, 0);
  c.tekst(-44, 46, 'obradak', 'oc-txs', null, { dy: 4 });
  return c;
}
tema('koord', 'Koordinatni sustavi', 'geo', [
  (box) => {
    box.append(dva(tekst(`<p>Na tokarilici se obradak vrti, a alat se giba u ravnini koja prolazi osi vretena. Zato su dovoljne dvije osi:</p>
      <ul class="os-lista"><li><b>os Z</b> leži na osi vretena — vrijednosti rastu od stezne glave prema konjiću (udesno),</li>
      <li><b>os X</b> je okomita na nju — na tokarilici s kosom posteljom vrijednosti rastu prema gore, od osi prema revolveru.</li></ul>
      <p>Nultočka obratka <b>W</b> je uvijek na osi vretena; uzduž osi stavlja se najčešće na <b>završno čelo</b> obratka. Tada sve točke na obratku imaju <b>negativan Z</b>.</p>
      <p>X se na tokarilici upisuje kao <b>promjer</b>: točka koja je 15 mm od osi ima X30. Mjere su u milimetrima.</p>`),
      slika(crtezKoord('Stepenasti obradak s nultočkom W na čelu i osima Z i X').svg, 'Stepenasti obradak; W je na osi, na desnom čelu. Donja polovica je zrcalna slika gornje.')));
  },
  (box) => {
    const inf = info('Prijeđi mišem preko kvadranta ili ga dodirni.');
    const c = crtezKoord('Četiri kvadranta koordinatnog sustava Z–X');
    kvadrantiZX(c, 92, 54, inf);
    box.append(dva(tekst(`<p>Osi dijele ravninu na <b>četiri kvadranta</b>. Za vanjsko tokarenje važan je samo gornji dio, jer je donji zrcalna slika:</p>
      <table class="os-tab"><thead><tr><th>Kvadrant</th><th>Z</th><th>X</th></tr></thead><tbody>
      <tr><td>gore desno (ispred čela)</td><td>+</td><td>+</td></tr><tr><td>gore lijevo (kontura obratka)</td><td>−</td><td>+</td></tr><tr><td>dolje lijevo</td><td>−</td><td>−</td></tr><tr><td>dolje desno</td><td>+</td><td>−</td></tr></tbody></table>
      <p>Točke na osi vretena imaju X0. Na tokarilici s <b>ravnom posteljom</b> i alatom ispred osi X+ ide prema korisniku, pa crtež bude zrcaljen — predznaci u programu ostaju isti.</p>`),
      h('div', null, slika(c.svg), inf)));
  },
], { auto: true });

// ----------------------------------------------------------------- 4. Točke na obratku (vježba) — vrijednosti s tečaja
const TOCKE_OB = [[0, 0], [0, 26], [-2, 30], [-25, 30], [-50, 50], [-50, 65], [-57.5, 80]];   /* [Z, X promjer] za P1 … P7 */
tema('tocke', 'Točke na obratku', 'geo', [(box, api) => {
  const c = new Crtez({ x0: -82, x1: 26, y0: -48, y1: 64, sir: 580, oznaka: 'Osovina s točkama P1 do P7 i kotama promjera i duljina' });
  osVretena(c, -80, 24);
  profil(c, [[0, 13], [-2, 15], [-25, 15], [-50, 25], [-50, 32.5], [-57.5, 40], [-75, 40]]);
  osiZX(c, { xa: -80, xb: 22, ya: -46, yb: 60 });
  c.W(0, 0, null, 'W');
  c.kotaH(-25, 0, 15, 50, '25'); c.kotaH(-50, 0, 32.5, 56, '50', null, { dx: -6 });
  c.kotaV(-15, 15, -12, -12, 'Ø30', null, { dy: 0 }); c.kotaV(-40, 40, -66, -70, 'Ø80');
  c.tekst(-50, 25, 'Ø50', 'oc-kt', null, { dx: -4, dy: -6, a: 'end' }); c.tekst(-50, 32.5, 'Ø65', 'oc-kt', null, { dx: 4, dy: -4, a: 'start' });
  c.tekst(-1, 14, '2 × 45°', 'oc-kt', null, { dx: 6, dy: -10, a: 'start' }); c.tekst(-55, 37, '45°', 'oc-kt', null, { dx: -8, dy: -2, a: 'end' });
  const gP = c.g(), oz = [];
  TOCKE_OB.forEach(([z, x], i) => {
    const g = c.g('oc-provrt', gP); c.tocka(z, x / 2, 4, 'oc-tk', g);
    c.tekst(z, x / 2, 'P' + (i + 1), 'oc-txb', g, { dx: i === 0 ? 10 : -6, dy: i < 2 ? -8 : -8, a: i === 0 ? 'start' : 'end' });
    const lab = c.tekst(z, x / 2, '', 'oc-txr', g, { dy: 18 });
    oz.push({ g, lab });
  });
  const crt = {
    oznaci(i) { oz.forEach((o, j) => o.g.classList.toggle('akt', j === i)); },
    rijeseno(i, cb) { oz[i].g.classList.remove('akt'); oz[i].g.classList.add('gotov'); oz[i].lab.textContent = 'X' + fmt(TOCKE_OB[i][1]) + ' Z' + fmt(TOCKE_OB[i][0]); pauza(500, cb); },
    reset() { oz.forEach((o) => { o.g.classList.remove('akt', 'gotov'); o.lab.textContent = ''; }); },
  };
  const savjeti = ['P1 je na osi, na čelu — tu je W.', 'Skošenje 2 × 45° smanjuje promjer 30 za 2 · 2 mm.', 'Na kraju skošenja promjer je 30, a Z je −2.', 'Kraj valjka Ø30: Z je −25.', 'Stožac završava na Ø50 kod Z−50.', 'Stepenica: Z je isti, promjer se mijenja na 65.', 'Skošenje 45° od Ø65 do Ø80: duljina (80 − 65) / 2 = 7,5 mm.'];
  const v = vjezbaUnos({
    naslov: 'Koordinate točaka',
    zadaci: TOCKE_OB.map(([z, x], i) => ({ opis: `Upiši koordinate točke <b>P${i + 1}</b> (apsolutno, od W; X kao promjer):`, savjet: savjeti[i],
      pomoc: i === 1 ? '<p>X = 30 − 2 · 2 = 26 (skošenje skida 2 mm sa svake strane promjera).</p>' : i === 6 ? '<p>Z = −50 − (80 − 65) / 2 = −57,5.</p>' : '',
      polja: [{ k: 'X', oz: 'Ø abs', tocno: x, raspon: [0, 100] }, { k: 'Z', oz: 'abs', tocno: z, tol: 0.05, raspon: [-80, 10] }] })),
    crtez: crt, kraj: 'Svih sedam točaka je zadano. X je uvijek promjer, a Z je negativan jer je W na čelu.', naGotovo: api.gotovo,
  });
  box.append(dva(h('div', null, tekst('<p>Na osovini je sedam točaka konture. W je na osi, na desnom čelu. Iz kota izračunaj koordinate svake točke: <b>X kao promjer</b>, Z od čela. Pazi na skošenja.</p>'), v), slika(c.svg, 'Crtež je pojednostavljen; kote su s izvornog tečaja.')));
}]);

// ----------------------------------------------------------------- 5. i 6. Apsolutne i inkrementalne mjere (isti put, vrijednosti s tečaja)
const PUT_AI = [[1, -0.8], [0, -0.8], [0, 34], [-3, 40], [-30, 40], [-60, 80]];   /* [Z, X promjer]: polazište i pet krajnjih točaka */
function crtezPuta(ink) {
  const c = new Crtez({ x0: -70, x1: 18, y0: -46, y1: 54, sir: 540, oznaka: 'Obradak s putom alata od P0 do P5' });
  osVretena(c, -68, 16);
  profil(c, [[0, 17], [-3, 20], [-30, 20], [-60, 40], [-66, 40]]);
  osiZX(c, { xa: -68, xb: 14, ya: -44, yb: 50 });
  c.W(0, 0, null, '');
  const gKomp = c.g('oc-komp'), gPut = c.g(), gT = c.g();
  const tocke = PUT_AI.map(([z, x], i) => {
    const g = c.g(i ? 'oc-cilj' : 'oc-pol', gT); c.tocka(z, x / 2, 4.5, 'oc-tk', g);
    c.tekst(z, x / 2, 'P' + i, 'oc-txb', g, { dx: i < 2 ? 10 : -8, dy: i === 1 ? 14 : -8, a: i < 2 ? 'start' : 'end' }); return g;
  });
  const alat = c.tocka(PUT_AI[0][0], PUT_AI[0][1] / 2, 7, 'oc-alat oc-alat-t');
  return {
    svg: c.svg,
    oznaci(i) {
      tocke.forEach((t, j) => t.classList.toggle('akt', j === i + 1));
      gKomp.innerHTML = '';
      if (ink) {
        const [za, xa] = PUT_AI[i], [zb, xb] = PUT_AI[i + 1], ra = xa / 2, rb = xb / 2;
        if (Math.abs(zb - za) > 1e-6) c.strelicaMM(za, ra, zb, ra, 'oc-komp-l', gKomp, 8);
        if (Math.abs(rb - ra) > 1e-6) c.strelicaMM(zb, ra, zb, rb, 'oc-komp-l', gKomp, 8);
      }
    },
    rijeseno(i, cb) {
      const [za, xa] = PUT_AI[i], [zb, xb] = PUT_AI[i + 1];
      const l = c.lin(za, xa / 2, za, xa / 2, 'oc-putl', gPut); gKomp.innerHTML = '';
      naCiscenje(animiraj(700, (u) => { const z = za + (zb - za) * u, r = (xa + (xb - xa) * u) / 2; l.setAttribute('x2', c.X(z)); l.setAttribute('y2', c.Y(r)); alat.setAttribute('cx', c.X(z)); alat.setAttribute('cy', c.Y(r)); },
        () => { tocke[i + 1].classList.remove('akt'); tocke[i + 1].classList.add('gotov'); pauza(250, cb); }));
    },
    reset() { gPut.innerHTML = ''; gKomp.innerHTML = ''; tocke.forEach((t) => t.classList.remove('akt', 'gotov')); alat.setAttribute('cx', c.X(PUT_AI[0][0])); alat.setAttribute('cy', c.Y(PUT_AI[0][1] / 2)); },
  };
}
tema('abs', 'Apsolutne mjere', 'geo', [(box, api) => {
  const crt = crtezPuta(false);
  const v = vjezbaUnos({
    naslov: 'Krajnja točka (abs)',
    zadaci: PUT_AI.slice(1).map(([z, x], i) => ({ opis: `Alat je u <b>P${i}</b> (X${fmt(PUT_AI[i][1])} Z${fmt(PUT_AI[i][0])}). Upiši apsolutne koordinate krajnje točke <b>P${i + 1}</b>:`,
      savjet: 'Apsolutna vrijednost uvijek se mjeri od W; X je promjer.',
      pomoc: i === 0 ? '<p>X−0,8: oštrica ima polumjer 0,4 mm, pa njezin teorijski vrh mora prijeći os za 2 · 0,4 = 0,8 mm (na promjeru) — inače u sredini čela ostane čepić.</p>' : i === 2 ? '<p>Skošenje 3 × 45°: od X34 (= 40 − 2 · 3) do X40, a Z se pomakne za 3 mm.</p>' : '',
      polja: [{ k: 'X', oz: 'Ø abs', tocno: x, tol: 0.05, raspon: [-5, 100] }, { k: 'Z', oz: 'abs', tocno: z, tol: 0.05, raspon: [-80, 10] }] })),
    crtez: crt, kraj: 'Put je zadan apsolutno: poravnanje čela, skošenje, valjak Ø40 i stožac do Ø80.', naGotovo: api.gotovo,
  });
  box.append(dva(h('div', null, tekst('<p>U prozoru za unos apsolutne mjere nose kraticu <b>abs</b>. Apsolutno zadana vrijednost uvijek se odnosi na <b>nultočku obratka W</b>, neovisno o tome gdje je alat. Kod tokarenja X je <b>promjer</b>.</p><p>Alat kreće iz P0 (X−0,8 Z1), poravna čelo, napravi skošenje 3 × 45°, valjak Ø40 duljine 30 mm i stožac do Ø80 na Z−60.</p>'), v), slika(crt.svg, 'Žuti krug je vrh alata.')));
}]);
tema('ink', 'Inkrementalne mjere', 'geo', [(box, api) => {
  const crt = crtezPuta(true);
  const zad = PUT_AI.slice(1).map(([z, x], i) => {
    const [za, xa] = PUT_AI[i], dr = (x - xa) / 2, dz = z - za;
    const red = `<p><b>X:</b> polumjer polazišta ${fmt(xa / 2)}, polumjer cilja ${fmt(x / 2)} → ${fmt(x / 2)} − (${fmt(xa / 2)}) = ${dr > 0 ? '+' : ''}${fmt(dr)}.</p><p><b>Z:</b> ${fmt(z)} − (${fmt(za)}) = ${dz > 0 ? '+' : ''}${fmt(dz)}.</p>`;
    return { opis: `Alat je u <b>P${i}</b>. Upiši put do <b>P${i + 1}</b> inkrementalno — X kao put u <b>polumjeru</b>:`,
      savjet: 'Inkrementalno upisuješ razliku od polazišta do cilja; u X je to razlika polumjera.', pomoc: red,
      polja: [{ k: 'X', oz: 'inc (r)', tocno: dr, tol: 0.05, raspon: [-60, 60] }, { k: 'Z', oz: 'inc', tocno: dz, tol: 0.05, raspon: [-60, 60] }] };
  });
  const v = vjezbaUnos({ naslov: 'Put do krajnje točke (inc)', zadaci: zad, crtez: crt, kraj: 'Isti put zadan je sada inkrementalno: (0 / −1), (+17,4 / 0), (+3 / −3), (0 / −27), (+20 / −30).', naGotovo: api.gotovo });
  box.append(dva(h('div', null, tekst('<p>Inkrementalne mjere u prozoru za unos nose kraticu <b>inc</b>. Ne upisuješ položaj, nego <b>razliku od polazišta do krajnje točke</b>, s predznakom smjera gibanja.</p><p>Kao na tečaju, inkrementalni X ovdje se upisuje kao put u <b>polumjeru</b>, dok je apsolutni X promjer (na SINUMERIKU to je podešenje DIAM90). Na drugim strojevima može biti drukčije — provjeri podešenje upravljanja.</p><p>Prvi pomak iz X100 Z20 do P0 iznosi X−50,4 Z−19 (100 / 2 + 0,4 = 50,4). Isprekidane strelice rastavljaju svaki pomak na dio u Z i dio u X.</p>'), v), slika(crt.svg, 'Isprekidane strelice: rastav pomaka usporedno s osima.')));
}]);

// ----------------------------------------------------------------- 7. Polarne mjere (R20 pod 140° i 195°)
const POLAR = [{ r: 20, a: 140, kota: '140°', alt: [-220] }, { r: 20, a: 195, kota: '195°', alt: [-165] }];
tema('polarno', 'Polarne mjere', 'geo', [(box, api) => {
  const c = new Crtez({ x0: -34, x1: 34, y0: -22, y1: 30, sir: 540, oznaka: 'Pol, polumjer i kut od osi +Z u ravnini Z–X' });
  c.osi({ xa: -32, xb: 30, ya: -20, yb: 26, lx: '+Z', ly: '+X' }); c.W(0, 0, null, 'pol');
  const gl = c.g('oc-leg'); const lx = 22, ly = 18;
  c.luk(lx, ly, 4, 0.15, 2.2, 'oc-legp', gl); c.tekst(lx, ly + 6, '+ kut', 'oc-txs', gl, { dy: -2 });
  c.luk(lx, ly - 9, 4, -0.15, -2.2, 'oc-legn', gl); c.tekst(lx, ly - 15, '− kut', 'oc-txs', gl, { dy: 4 });
  const gK = c.g(), gR = c.g();
  const alat = c.tocka(0, 0, 8, 'oc-alat oc-alat-t');
  const crt = {
    oznaci(i) {
      gK.innerHTML = ''; const z = POLAR[i], a = z.a * PI / 180, x = z.r * Math.cos(a), y = z.r * Math.sin(a);
      c.lin(0, 0, x, y, 'oc-l oc-crt', gK); c.lin(0, 0, 10, 0, 'oc-tn', gK);
      c.luk(0, 0, 7, 0, a, 'oc-kl', gK);
      const am = a / 2; c.tekst(10 * Math.cos(am), 10 * Math.sin(am), z.kota, 'oc-kt', gK, { dx: 2, dy: 5, a: 'start' });
      const nx = -Math.sin(a), ny = Math.cos(a); c.tekst(x / 2 + nx * 2.5, y / 2 + ny * 2.5, 'R' + z.r, 'oc-kt', gK, { dy: 4 });
      const g = c.g('oc-cilj akt', gK); c.tocka(x, y, 5, 'oc-tk', g); c.tekst(x, y, 'P' + (i + 1), 'oc-txb', g, { dx: -10, dy: -6, a: 'end' });
    },
    rijeseno(i, cb) {
      const z = POLAR[i], a = z.a * PI / 180, x = z.r * Math.cos(a), y = z.r * Math.sin(a);
      const l = c.lin(0, 0, 0, 0, 'oc-putl', gR); alat.setAttribute('cx', c.X(0)); alat.setAttribute('cy', c.Y(0));
      naCiscenje(animiraj(700, (u) => { l.setAttribute('x2', c.X(x * u)); l.setAttribute('y2', c.Y(y * u)); alat.setAttribute('cx', c.X(x * u)); alat.setAttribute('cy', c.Y(y * u)); },
        () => { const g = c.g('oc-cilj gotov', gR); c.tocka(x, y, 5, 'oc-tk', g); c.tekst(x, y, 'P' + (i + 1), 'oc-txb', g, { dx: -10, dy: -6, a: 'end' }); pauza(300, cb); }));
    },
    reset() { gK.innerHTML = ''; gR.innerHTML = ''; alat.setAttribute('cx', c.X(0)); alat.setAttribute('cy', c.Y(0)); },
  };
  const v = vjezbaUnos({
    naslov: 'Krajnja točka (polarno)',
    zadaci: POLAR.map((z, i) => ({ opis: `Upiši polumjer <b>RP</b> i kut <b>AP</b> krajnje točke <b>P${i + 1}</b> (pol je zadan, kut se mjeri od osi +Z):`,
      savjet: i ? 'Kut je veći od 180° — mjeri se dalje suprotno od kazaljke na satu (ili kao −165°).' : 'Kut od +Z do točke, suprotno od kazaljke na satu.',
      polja: [{ k: 'RP', naziv: 'polumjer', oz: 'mm', tocno: z.r, raspon: [0, 30] }, { k: 'AP', naziv: 'kut', oz: '°', tocno: z.a, alt: z.alt, tol: 0.05, raspon: [-360, 360] }] })),
    crtez: crt, kraj: 'Obje točke su zadane polarno. Za P2 vrijede i 195° i −165° — to je isti smjer.', naGotovo: api.gotovo,
  });
  box.append(dva(h('div', null, tekst('<p>Polarno se točka zadaje <b>polumjerom</b> (udaljenost od pola) i <b>kutom</b>. U ravnini tokarenja (G18) kut se mjeri od osi <b>+Z</b>. Pozitivan kut mjeri se <b>suprotno od kazaljke na satu</b>, negativan <b>u smjeru kazaljke</b>.</p><p>Polarne mjere na tokarilici koriste se rjeđe — npr. za točke na luku ili na kosini zadanoj kutom.</p>'), v), slika(c.svg, 'Desno gore: smjer pozitivnog i negativnog kuta.')));
}]);

// ================================================================= pomoćne funkcije za tehnologiju
function stupnjevi(naziv, vrijednosti, poc, jed, opis) { // klizač u stupnjevima (vrijednosti iz popisa)
  const id = 'k' + Math.random().toString(36).slice(2, 8);
  const inp = h('input', { type: 'range', id, min: 0, max: vrijednosti.length - 1, step: 1, value: vrijednosti.indexOf(poc), 'aria-valuetext': fmt(poc, 2) + ' ' + jed });
  const out = h('output', { for: id, text: fmt(poc, 2) + ' ' + jed });
  const ozn = h('div', { class: 'os-ozn', 'aria-hidden': 'true' }, ...vrijednosti.map((v) => h('span', { text: fmt(v, 2) })));
  const el = h('div', { class: 'polje os-klizac' }, h('label', { for: id, html: naziv }), out, inp, ozn, opis ? h('p', { class: 'pom', html: opis }) : null);
  const o = { el, inp, vr: () => vrijednosti[+inp.value], promjena: null };
  inp.addEventListener('input', () => { const v = o.vr(); out.textContent = fmt(v, 2) + ' ' + jed; inp.setAttribute('aria-valuetext', fmt(v, 2) + ' ' + jed); if (o.promjena) o.promjena(v); });
  return o;
}
function segment(naziv, vrijednosti, poc, jed) {
  const g = h('div', { class: 'segment', role: 'group', 'aria-label': naziv });
  const o = { el: h('div', { class: 'polje os-seg' }, h('span', { class: 'os-seg-n', html: naziv }), g), v: poc, promjena: null };
  vrijednosti.forEach((v) => { const b = h('button', { type: 'button', 'aria-pressed': String(v === poc), text: (typeof v === 'number' ? fmt(v, 2) : v) + (jed ? ' ' + jed : '') }); b.addEventListener('click', () => { o.v = v; $$('button', g).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); if (o.promjena) o.promjena(v); }); g.append(b); });
  return o;
}
function ish(naziv, jed) { const b = h('b'); const e = h('div', { class: 'ish' }, h('span', { html: naziv }), b); e.set = (v) => { b.innerHTML = v + (jed ? '<small>' + jed + '</small>' : ''); }; return e; }
function razinaVc(vc, cilj) {
  if (vc <= 0) return ['los', 'Vreteno stoji — alat ne reže.'];
  const r = vc / cilj;
  if (r < 0.55) return ['los', 'vc je mnogo premala — alat ne reže dobro.'];
  if (r < 0.9) return ['slabo', 'vc je premala — alat ne reže dobro.'];
  if (r <= 1.1) return ['dobro', 'vc je ispravna — alat reže dobro.'];
  if (r <= 1.6) return ['slabo', 'vc je prevelika — alat se prebrzo troši.'];
  return ['los', 'vc je mnogo prevelika — alat se troši mnogo prebrzo.'];
}
function svgPlatno(w, hh, oznaka) { return sv('svg', { viewBox: `0 0 ${w} ${hh}`, class: 'os-svg', role: 'img', 'aria-label': oznaka }); }
const formula = (html) => h('p', { class: 'os-formula', html });

// ================================================================= TEHNOLOGIJA (tokarenje)
/* obradak gledan sprijeda (s čela): stezna glava s tri čeljusti i obradak — sve se vrti; nož je nepomičan */
function celoObratka(p, cx, cy, r) {
  const vanj = sv('g', null, p);
  const g = sv('g', null, vanj);
  sv('circle', { cx, cy, r: r * 1.42, class: 'oc-stol' }, g);
  for (let i = 0; i < 3; i++) {
    const a = i * 120;
    sv('rect', { x: r1(cx - r * 0.16), y: r1(cy - r * 1.36), width: r1(r * 0.32), height: r1(r * 0.5), rx: 2, class: 'oc-celj', transform: `rotate(${a} ${cx} ${cy})` }, g);
  }
  sv('circle', { cx, cy, r, class: 'oc-ob' }, g);
  sv('line', { x1: cx, y1: cy, x2: cx, y2: r1(cy + r * 0.92), class: 'oc-ozn-vrt' }, g);
  sv('circle', { cx, cy, r: 2.5, class: 'oc-tk-s' }, g);
  return { vanj, g };
}
/* nož odozgo: vrh u (x, y) u pikselima, držač prema gore */
function nozCelo(p, x, y) {
  const g = sv('g', { class: 'oc-alat-g' }, p);
  sv('rect', { x: r1(x - 7), y: r1(y - 58), width: 14, height: 42, class: 'oc-drzac' }, g);
  sv('path', { d: `M${r1(x)} ${r1(y)}L${r1(x + 9)} ${r1(y - 18)}L${r1(x - 6)} ${r1(y - 18)}Z`, class: 'oc-alat' }, g);
  return g;
}
function crtezCela(d, rpx, oznaka, kota = true) {
  const w = Math.max(240, 2 * rpx * 1.42 + 60), hh = 2 * rpx * 1.42 + 90, cx = w / 2, cy = hh / 2 + 18, svg = svgPlatno(r1(w), r1(hh), oznaka);
  const ob = celoObratka(svg, cx, cy, rpx);
  nozCelo(svg, cx, cy - rpx);
  if (kota) {
    const y = cy + rpx * 1.42 + 18;
    sv('line', { x1: cx - rpx, y1: y, x2: cx + rpx, y2: y, class: 'oc-kotal' }, svg);
    sv('line', { x1: cx - rpx, y1: cy, x2: cx - rpx, y2: y + 4, class: 'oc-kotal' }, svg); sv('line', { x1: cx + rpx, y1: cy, x2: cx + rpx, y2: y + 4, class: 'oc-kotal' }, svg);
    const c = { svg }; Crtez.prototype.strelica.call(c, cx - rpx, y, PI, 8, 'oc-kf'); Crtez.prototype.strelica.call(c, cx + rpx, y, 0, 8, 'oc-kf');
    const t = sv('text', { x: cx, y: y - 5, class: 'oc-kt', 'text-anchor': 'middle' }, svg); t.textContent = 'Ø' + d;
  }
  const vr = vrtiDodaj(ob.g, cx, cy);
  return { svg, vr, cx, cy };
}

tema('tehnologija', 'Tehnologija', 'skupina', [(box, api) => {
  box.append(tekst(`<p>Za svaku obradu na tokarilici biraš dvije veličine: <b>brzinu vrtnje</b> vretena (ili brzinu rezanja) i <b>posmak</b>. Kod tokarenja se vrti <b>obradak</b>, pa je za brzinu rezanja mjerodavan promjer obratka na mjestu gdje oštrica reže. U ovoj skupini naučit ćeš:</p>
  <ul class="os-lista"><li>izračunati brzinu vrtnje n iz brzine rezanja v<sub>c</sub> i promjera obratka d,</li><li>objasniti zašto se pri poprečnom tokarenju brzina rezanja mijenja,</li>
  <li>odabrati brzinu vrtnje za različite promjere,</li><li>koristiti stalnu brzinu rezanja G96 s ograničenjem LIMS,</li><li>odabrati posmak f po okretaju i procijeniti njegov utjecaj na površinu.</li></ul>`));
  box.append(gumbiTema(api, ['brzina-vrtnje', 'brzina-rezanja', 'rezanje-praksa', 'rezanje-upravljanje', 'posmak']));
}], { auto: true });

// ----------------------------------------------------------------- Brzina vrtnje
tema('brzina-vrtnje', 'Brzina vrtnje', 'teh', [(box, api) => {
  const d = 100, cr = crtezCela(d, 84, 'Obradak promjera 100 mm u steznoj glavi, gledan sprijeda, s nožem na vrhu');
  const kl = stupnjevi('Brzina vrtnje <i>n</i>', [0, 100, 150, 200, 300], 0, 'o/min');
  const iN = ish('n', 'o/min'), iV = ish('v<sub>c</sub> = π · d · n / 1000', 'm/min');
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
  let bilo = false;
  const osvj = (n) => {
    const vc = PI * d * n / 1000; iN.set(fmt(n, 0)); iV.set(fmt(vc, 1)); cr.vr.n = n;
    const [r, t] = razinaVc(vc, 60); por.className = 'os-razina ' + r; por.textContent = t + (r === 'dobro' ? ' (' + fmt(vc, 1) + ' ≈ 60 m/min)' : '');
    if (r === 'dobro' && !bilo) { bilo = true; api.gotovo(); }
  };
  kl.promjena = osvj; osvj(0);
  box.append(dva(h('div', null, tekst(`<p>Brzina vrtnje kaže koliko se puta vreteno — a s njim stezna glava i obradak — okrene u minuti; jedinica je <b>o/min</b>. Kod tokarenja ovisi o brzini rezanja <i>v</i><sub>c</sub> i o <b>promjeru obratka</b> <i>d</i> na mjestu rezanja (kod glodanja je to promjer alata):</p>`),
    formula('<i>n</i> = <i>v</i><sub>c</sub> · 1000 / (π · <i>d</i>)'),
    tekst('<p><b>Zadatak:</b> za ovu obradu idealna je brzina rezanja oko <b>60 m/min</b>. Obradak ima promjer 100 mm. Namjesti brzinu vrtnje.</p>'),
    h('div', { class: 'racun' }, kl.el, h('div', { class: 'ishod' }, iN, iV), por)),
    slika(cr.svg, 'Obradak Ø100 mm u steznoj glavi s tri čeljusti; vrtnja je usporena da se vidi.')));
  naCiscenje(vrtiOcisti);
}]);

// ----------------------------------------------------------------- Brzina rezanja — osnove (poprečno tokarenje uz stalnu n)
tema('brzina-rezanja', 'Brzina rezanja — osnove', 'teh', [(box, api) => {
  const R = 40, k = 2.6, w = 330, hh = 330, cx = w / 2, cy = hh / 2 + 14;
  const svg = svgPlatno(w, hh, 'Čelo obratka Ø80 s tri točke na Ø80, Ø50 i Ø20 i nožem');
  const ob = celoObratka(svg, cx, cy, R * k);
  const TOCKE = [{ d: 80, oz: 'vanjski rub' }, { d: 50, oz: 'sredina' }, { d: 20, oz: 'blizu osi' }];
  TOCKE.forEach((t) => { if (t.d < 80) sv('circle', { cx, cy, r: r1(t.d / 2 * k), class: 'oc-tn oc-crt' }, svg); });
  const gT = sv('g', null, svg);
  const tk = TOCKE.map((t, i) => { const g = sv('g', { class: 'oc-cilj' }, gT); sv('circle', { cx, cy: r1(cy - t.d / 2 * k), r: 5, class: 'oc-tk' }, g); const e = sv('text', { x: cx + 12, y: r1(cy - t.d / 2 * k + 4), class: 'oc-txb', 'text-anchor': 'start' }, g); e.textContent = 'Ø' + t.d; return g; });
  const gN = sv('g', null, svg); let noz = nozCelo(gN, cx, cy - R * k);
  const vr = vrtiDodaj(ob.g, cx, cy);
  const kl = stupnjevi('Brzina vrtnje <i>n</i> (stalna)', [0, 200, 400, 600], 0, 'o/min');
  const seg = h('div', { class: 'segment', role: 'group', 'aria-label': 'Točka na čelu' });
  const iD = ish('promjer', 'mm'), iV = ish('v<sub>c</sub>', 'm/min');
  const tab = h('table', { class: 'os-tab' });
  const vidjeno = new Set(); let odabrana = 0;
  const osvjTab = () => { const n = kl.vr(); tab.innerHTML = '<thead><tr><th>Točka</th><th>Ø</th><th>v<sub>c</sub> pri ' + fmt(n, 0) + ' o/min</th></tr></thead><tbody>' + TOCKE.map((t, i) => `<tr${i === odabrana ? ' class="sel"' : ''}><td>${t.oz}</td><td>${t.d} mm</td><td>${fmt(PI * t.d * n / 1000, 1)} m/min</td></tr>`).join('') + '</tbody>'; };
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
  const osvj = () => {
    const n = kl.vr(), t = TOCKE[odabrana], vc = PI * t.d * n / 1000; vr.n = n;
    iD.set('Ø' + t.d); iV.set(fmt(vc, 1));
    tk.forEach((g, i) => g.classList.toggle('akt', i === odabrana));
    gN.innerHTML = ''; noz = nozCelo(gN, cx, cy - t.d / 2 * k);
    osvjTab();
    if (n > 0) vidjeno.add(odabrana);
    if (n > 0 && vidjeno.size === 3) { por.className = 'os-razina dobro'; por.textContent = 'Uz istu brzinu vrtnje brzina rezanja pada prema osi — na samoj osi je nula.'; api.gotovo(); }
    else { por.className = 'os-razina'; por.textContent = n > 0 ? 'Pogledaj sve tri točke.' : 'Namjesti brzinu vrtnje.'; }
  };
  TOCKE.forEach((t, i) => { const b = h('button', { type: 'button', 'aria-pressed': String(i === 0), text: 'Ø' + t.d }); b.addEventListener('click', () => { odabrana = i; $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); osvj(); }); seg.append(b); });
  tk.forEach((g, i) => { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Točka Ø' + TOCKE[i].d); const f = () => { $$('button', seg)[i].click(); }; g.addEventListener('click', f); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }); });
  kl.promjena = osvj; osvj();
  box.append(dva(h('div', null, tekst(`<p>Brzina rezanja <i>v</i><sub>c</sub> je brzina kojom površina obratka prolazi pokraj oštrice, u <b>m/min</b>:</p>`), formula('<i>v</i><sub>c</sub> = π · <i>d</i> · <i>n</i> / 1000'),
    tekst(`<p>Pri <b>poprečnom tokarenju</b> (tokarenju čela) nož ide od vanjskog promjera prema osi. Brzina vrtnje ostaje ista, ali točka na manjem promjeru u jednom okretaju prijeđe kraći put — brzina rezanja se smanjuje i na osi pada na nulu.</p><p><b>Zadatak:</b> namjesti brzinu vrtnje, a zatim odaberi redom sve tri točke na čelu i usporedi brzinu rezanja.</p>`),
    h('div', { class: 'racun' }, kl.el, h('div', { class: 'polje os-seg' }, h('span', { class: 'os-seg-n', text: 'Mjesto rezanja' }), seg), h('div', { class: 'ishod' }, iD, iV), tab, por)),
    slika(svg, 'Isprekidane kružnice: put točke na Ø50 i Ø20 u jednom okretaju.')));
  naCiscenje(vrtiOcisti);
}]);

// ----------------------------------------------------------------- Brzina rezanja — u praksi (tri promjera)
tema('rezanje-praksa', 'Brzina rezanja — u praksi', 'teh', [(box, api) => {
  const D = [40, 80, 160], R = [26, 46, 84], ok = [false, false, false], kart = [];
  const sveOk = h('p', { class: 'os-razina dobro', hidden: true, text: 'Sva tri obratka režu se s 50 m/min: veći promjer traži manju brzinu vrtnje — dvostruki promjer, upola manja brzina vrtnje.' });
  D.forEach((d, i) => {
    const cr = crtezCela(d, R[i], 'Obradak promjera ' + d + ' mm');
    const kl = stupnjevi('<i>n</i> za Ø' + d, [0, 100, 200, 300, 400], 0, 'o/min');
    const iV = ish('v<sub>c</sub>', 'm/min'), por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
    const osvj = (n) => {
      const vc = PI * d * n / 1000; iV.set(fmt(vc, 1)); cr.vr.n = n; const [r, t] = razinaVc(vc, 50);
      por.className = 'os-razina ' + r; por.textContent = t; ok[i] = r === 'dobro';
      if (ok.every(Boolean)) { api.gotovo(); sveOk.hidden = false; } else sveOk.hidden = true;
    };
    kl.promjena = osvj; kart.push(h('div', { class: 'os-tri-k racun' }, slika(cr.svg), kl.el, h('div', { class: 'ishod' }, iV), por)); queueMicrotask(() => osvj(0));
  });
  box.append(tekst(`<p>Ispravna brzina rezanja ovisi o materijalu obratka (čelik, lijev, aluminij …) i o materijalu oštrice (tvrdi metal, keramika, CBN …). Preporučene vrijednosti daju katalozi proizvođača alata; iz njih se za svaki promjer računa brzina vrtnje.</p>
    <p><b>Zadatak:</b> tri obratka imaju različite promjere. Za svaki namjesti brzinu vrtnje tako da brzina rezanja bude <b>50 m/min</b>.</p>`),
    h('div', { class: 'os-tri' }, ...kart), sveOk,
    tekst('<p class="pom">Pri uzdužnom tokarenju promjer se mijenja samo za dubinu rezanja, pa je dovoljna jedna brzina vrtnje po prolazu. Pri poprečnom tokarenju promjer se mijenja neprestano — zato upravljanje nudi <b>stalnu brzinu rezanja</b> (sljedeća tema).</p>'));
  naCiscenje(vrtiOcisti);
}]);

// ----------------------------------------------------------------- Brzina rezanja — upravljanje (G96, LIMS)
tema('rezanje-upravljanje', 'Brzina rezanja — upravljanje', 'teh', [(box, api) => {
  const VC = 200, LIMS = 5000, S97 = 800, D0 = 80;
  const nG96 = (d) => Math.min(LIMS, d > 0 ? VC * 1000 / (PI * d) : Infinity);
  /* graf: vodoravno promjer od 80 do 0 (kako nož ide prema osi), okomito brzina vrtnje */
  const w = 560, hh = 300, ml = 62, mr = 22, mt = 22, mb = 46, NM = 5500;
  const svg = svgPlatno(w, hh, 'Graf brzine vrtnje u ovisnosti o promjeru za G96 i G97');
  const GX = (d) => r1(ml + (D0 - d) / D0 * (w - ml - mr)), GY = (n) => r1(mt + (1 - n / NM) * (hh - mt - mb));
  const gm = sv('g', { class: 'oc-mr' }, svg);
  for (let n = 0; n <= 5000; n += 1000) { sv('line', { x1: ml, y1: GY(n), x2: w - mr, y2: GY(n) }, gm); const t = sv('text', { x: ml - 6, y: GY(n) + 4, class: 'oc-txs', 'text-anchor': 'end' }, svg); t.textContent = String(n); }
  for (let d = 80; d >= 0; d -= 10) { sv('line', { x1: GX(d), y1: mt, x2: GX(d), y2: hh - mb }, gm); const t = sv('text', { x: GX(d), y: hh - mb + 16, class: 'oc-txs', 'text-anchor': 'middle' }, svg); t.textContent = String(d); }
  sv('line', { x1: ml, y1: hh - mb, x2: w - mr, y2: hh - mb, class: 'oc-os' }, svg); sv('line', { x1: ml, y1: mt, x2: ml, y2: hh - mb, class: 'oc-os' }, svg);
  const tx = sv('text', { x: (ml + w - mr) / 2, y: hh - 8, class: 'oc-txb', 'text-anchor': 'middle' }, svg); tx.textContent = 'promjer d [mm] — nož ide prema osi →';
  const ty = sv('text', { x: 14, y: hh / 2, class: 'oc-txb', 'text-anchor': 'middle', transform: `rotate(-90 14 ${hh / 2})` }, svg); ty.textContent = 'n [o/min]';
  let d96 = ''; for (let d = D0; d >= 0.5; d -= 0.5) d96 += (d === D0 ? 'M' : 'L') + GX(d) + ' ' + GY(nG96(d)); d96 += 'L' + GX(0) + ' ' + GY(LIMS);
  sv('path', { d: d96, class: 'oc-putl' }, svg);
  sv('line', { x1: GX(D0), y1: GY(S97), x2: GX(0), y2: GY(S97), class: 'oc-komp-l' }, svg);
  sv('line', { x1: ml, y1: GY(LIMS), x2: w - mr, y2: GY(LIMS), class: 'oc-tn oc-crt' }, svg);
  const tl = sv('text', { x: w - mr - 4, y: GY(LIMS) - 6, class: 'oc-txs', 'text-anchor': 'end' }, svg); tl.textContent = 'LIMS = 5000';
  const t96 = sv('text', { x: GX(42) + 4, y: GY(nG96(42)) + 24, class: 'oc-txr', 'text-anchor': 'start' }, svg); t96.textContent = 'G96 S200';
  const t97 = sv('text', { x: GX(75), y: GY(S97) - 7, class: 'oc-txs', 'text-anchor': 'start' }, svg); t97.textContent = 'G97 S800';
  const tocka = sv('circle', { cx: GX(D0), cy: GY(nG96(D0)), r: 7, class: 'oc-alat' }, svg);
  /* čelo obratka s nožem */
  const cr = crtezCela(80, 70, 'Čelo obratka Ø80 s nožem koji ide prema osi', false), gN = sv('g', null, cr.svg);
  cr.svg.querySelector('.oc-alat-g').remove();
  let noz = nozCelo(gN, cr.cx, cr.cy - 70);
  const sMod = segment('Način', ['G96', 'G97'], 'G96', '');
  const iD = ish('d', 'mm'), iN = ish('n', 'o/min'), iV = ish('v<sub>c</sub>', 'm/min');
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
  const prog = h('p', { class: 'os-blok-rez' });
  const zavrseno = new Set();
  let stop = null;
  const stanje = (d) => {
    const g96 = sMod.v === 'G96', n = g96 ? nG96(d) : S97, vc = PI * d * n / 1000;
    iD.set(fmt(d, 1)); iN.set(fmt(n, 0)); iV.set(fmt(vc, 0)); cr.vr.n = n * 0.12;
    tocka.setAttribute('cx', GX(d)); tocka.setAttribute('cy', GY(n));
    gN.innerHTML = ''; noz = nozCelo(gN, cr.cx, cr.cy - d / 2 * (70 / 40));
    return { n, vc };
  };
  const vrati = () => { if (stop) stop(); stop = null; stanje(D0); por.className = 'os-razina'; por.textContent = ''; prog.innerHTML = '<code>' + (sMod.v === 'G96' ? 'N30 G96 S200 LIMS=5000 F0.3 M4' : 'N30 G97 S800 F0.3 M4') + '</code> → <code>N40 G0 X82 Z0</code> → <code>N50 G1 X0</code>'; };
  sMod.promjena = vrati;
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  bR.addEventListener('click', vrati);
  bS.addEventListener('click', () => {
    vrati(); const mod = sMod.v;
    stop = animiraj(6000, (u) => { stanje(D0 * (1 - u)); }, () => {
      stop = null; zavrseno.add(mod);
      por.className = 'os-razina ' + (mod === 'G96' ? 'dobro' : 'slabo');
      por.textContent = mod === 'G96' ? 'G96: brzina rezanja ostaje 200 m/min sve dok brzina vrtnje ne dosegne LIMS (5000 o/min, kod Ø12,7 mm). Bliže osi vreteno se više ne ubrzava, pa brzina rezanja pada.' : 'G97: brzina vrtnje je stalnih 800 o/min. Na Ø80 brzina rezanja je ~201 m/min, a prema osi pada na nulu — površina čela nije jednolika, a oštrica radi u lošim uvjetima.';
      if (zavrseno.size === 2) api.gotovo();
    });
  });
  naCiscenje(() => { if (stop) stop(); }); naCiscenje(vrtiOcisti);
  vrati();
  box.append(tekst(`<p>Upravljanje može samo održavati brzinu rezanja stalnom — to je <b>stalna brzina rezanja</b> <code>G96</code>. Adresa <b>S</b> tada ne znači brzinu vrtnje, nego brzinu rezanja u m/min. Upravljanje iz trenutačnog promjera (položaja osi X) neprestano računa brzinu vrtnje: što je promjer manji, vreteno se vrti brže.</p>
    <p>Blizu osi brzina vrtnje bi rasla bez granice. Zato se uz <code>G96</code> uvijek zadaje <b>najveća dopuštena brzina vrtnje</b> <code>LIMS</code> (npr. zbog stezne glave i neuravnoteženog obratka). <code>G97</code> isključuje stalnu brzinu rezanja: S je opet brzina vrtnje u o/min.</p>`),
    dva(h('div', null, h('div', { class: 'racun' }, sMod.el, prog, h('div', { class: 'ishod' }, iD, iN, iV), h('div', { class: 'os-gumbi' }, bS, bR), por)), slika(cr.svg, 'Čelo obratka; vrtnja je usporena.')),
    slika(svg, 'Puna crta: G96 S200 s ograničenjem LIMS · isprekidano narančasto: G97 S800. Žuti krug pokazuje trenutačno stanje.'),
    tekst('<p class="pom">Isprobaj oba načina. Kod bušenja i tokarenja navoja koristi se <code>G97</code>, jer je promjer stalan, a kod navoja brzina vrtnje ne smije se mijenjati tijekom prolaza.</p>'));
}]);

// ----------------------------------------------------------------- Posmak (f po okretaju, hrapavost)
tema('posmak', 'Posmak', 'teh', [(box, api) => {
  const n = 800, RN = 0.8;
  const w = 560, hh = 210, ml = 20, mr = 20, yS = 150, KX = (w - ml - mr) / 1.5, KY = 2.2; /* KX px/mm vodoravno, KY px/µm okomito */
  const svg = svgPlatno(w, hh, 'Uvećani profil površine nakon uzdužnog tokarenja: tragovi oštrice s polumjerom 0,8 mm');
  const tl = sv('text', { x: ml, y: 18, class: 'oc-txs', 'text-anchor': 'start' }, svg); tl.textContent = '← smjer posmaka (nož ide prema steznoj glavi)';
  const tr = sv('text', { x: w - mr, y: 18, class: 'oc-txb', 'text-anchor': 'end' }, svg);
  const gOb = sv('g', null, svg), gK = sv('g', { class: 'oc-kota' }, svg);
  const nos = sv('g', { class: 'oc-alat-g' }, svg);
  const crtaj = (f, u) => {
    gOb.innerHTML = ''; gK.innerHTML = '';
    const rt = f * f / (8 * RN) * 1000; /* µm */
    const xKraj = w - mr - u * (w - ml - mr); /* nož se giba ulijevo */
    let d = `M${ml} ${hh - 8}L${ml} ${yS}`; const tr0 = w - mr;
    /* profil: niz lukova (u uvećanju parabole) s razmakom f; desno od noža je obrađeno, lijevo neobrađeno */
    const korak = 0.004;
    for (let x = 0; x <= 1.5 + 1e-9; x += korak) {
      const X = ml + x * KX;
      let y;
      if (X < xKraj) y = yS - 100; /* neobrađeno (vrh) */
      else { const xr = (tr0 - X) / KX, m = ((xr % f) + f) % f, dz = Math.min(m, f - m); y = yS - Math.min(100, dz * dz / (2 * RN) * 1000 * KY); }
      d += `L${r1(X)} ${r1(y)}`;
    }
    d += `L${w - mr} ${hh - 8}Z`;
    sv('path', { d, class: 'oc-ob' }, gOb);
    /* nož (polumjer oštrice) na trenutnom položaju */
    nos.innerHTML = '';
    const Xn = xKraj, Yn = yS;
    sv('path', { d: `M${r1(Xn)} ${Yn}L${r1(Xn - 30)} ${Yn - 70}L${r1(Xn + 60)} ${Yn - 70}L${r1(Xn + 50)} ${Yn - 30}Z`, class: 'oc-alat' }, nos);
    if (u >= 1) {
      const X1 = w - mr - f * KX, X2 = X1 - f * KX, Yv = yS - rt * KY;
      sv('line', { x1: X1, y1: yS + 14, x2: X2, y2: yS + 14 }, gK); sv('line', { x1: X1, y1: Yv, x2: X1, y2: yS + 18 }, gK); sv('line', { x1: X2, y1: Yv, x2: X2, y2: yS + 18 }, gK);
      const c = { svg: gK }; Crtez.prototype.strelica.call(c, X1, yS + 14, 0, 7, 'oc-kf'); Crtez.prototype.strelica.call(c, X2, yS + 14, PI, 7, 'oc-kf');
      const t = sv('text', { x: (X1 + X2) / 2, y: yS + 32, class: 'oc-kt', 'text-anchor': 'middle' }, gK); t.textContent = 'f = ' + fmt(f, 1) + ' mm';
      if (rt * KY > 6) { sv('line', { x1: X2 - 14, y1: Yv, x2: X1 + 4, y2: Yv, class: 'oc-tn oc-crt' }, gK); const t2 = sv('text', { x: X2 - 18, y: (Yv + yS) / 2 + 4, class: 'oc-kt', 'text-anchor': 'end' }, gK); t2.textContent = 'Rt ≈ ' + fmt(rt, 1) + ' µm'; }
    }
  };
  const kl = stupnjevi('Posmak <i>f</i>', [0.1, 0.3, 0.5], 0.1, 'mm');
  const iF = ish('v<sub>f</sub> = n · f', 'mm/min'), iR = ish('R<sub>t</sub> ≈ f² / (8 · r<sub>ε</sub>)', 'µm'), iK = ish('Površina', '');
  const vidjeno = new Set(); let stop = null;
  const osvj = (f) => {
    const rt = f * f / (8 * RN) * 1000, kv = f <= 0.1 + 1e-9 ? 'fina' : f <= 0.3 + 1e-9 ? 'srednja' : 'gruba';
    iF.set(fmt(n * f, 0)); iR.set(fmt(rt, 1)); iK.set(kv); tr.textContent = 'površina: ' + kv;
    if (stop) stop(); stop = animiraj(1600, (u) => crtaj(f, u), () => { stop = null; });
    vidjeno.add(f); if (vidjeno.size === 3) api.gotovo();
  };
  kl.promjena = osvj; osvj(0.1);
  naCiscenje(() => { if (stop) stop(); });
  box.append(dva(h('div', null, tekst(`<p><b>Posmak</b> je put koji nož prijeđe u smjeru obrade. Na tokarilici se zadaje <b>po okretaju</b> vretena: <i>f</i> u <b>mm</b> (mm/okr). Brzina gibanja osi <i>v</i><sub>f</sub> tada slijedi brzinu vrtnje:</p>`),
    formula('<i>v</i><sub>f</sub> = <i>n</i> · <i>f</i>'),
    tekst(`<p>Oštrica noža nije šiljasta nego zaobljena polumjerom <i>r</i><sub>ε</sub> (npr. 0,8 mm). Svaki okretaj ostavi na površini trag u obliku luka; razmak tragova je upravo <i>f</i>. Veći posmak — dublji tragovi i grublja površina. Teorijska visina neravnina je približno <i>R</i><sub>t</sub> ≈ <i>f</i>² / (8 · <i>r</i><sub>ε</sub>).</p>
      <p>Isprobaj tri posmaka uz <b>n = 800 o/min</b> i <b>r<sub>ε</sub> = 0,8 mm</b>.</p>`),
    h('div', { class: 'racun' }, kl.el, h('div', { class: 'ishod' }, iF, iR, iK))),
    slika(svg, 'Profil je jako uvećan, okomito mnogo više nego vodoravno.')));
}]);

// ================================================================= PROGRAMIRANJE (tokarenje)
tema('programiranje', 'Programiranje', 'skupina', [(box, api) => {
  box.append(tekst(`<p>Iz geometrije i tehnologije nastaje <b>NC program</b>. U ovoj skupini naučit ćeš:</p>
  <ul class="os-lista"><li>od čega se sastoji program: blok, riječ, adresa, vrijednost,</li><li>što se piše u zaglavlje: ravnina G18, pomak nultočke, način mjera i jedinica posmaka,</li>
  <li>adrese F, S, T, D i M za alat i tehnologiju tokarenja,</li><li>naredbe gibanja G0, G1, G2 i G3 te kako se određuju I i K,</li><li>korekciju polumjera oštrice G40, G41, G42 i korekcije alata,</li><li>čemu služe ciklusi i potprogrami.</li></ul>`));
  box.append(gumbiTema(api, ['grada', 'zaglavlje', 'adrese', 'gibanja', 'korekcija-ostrice', 'korekcije-alata', 'ciklusi']));
}], { auto: true });

// ----------------------------------------------------------------- Građa programa
const BLOK_T = [['N', '10', 'broj bloka'], ['G', '1', 'pravocrtno gibanje posmakom'], ['X', '40', 'ciljni promjer Ø40 mm'], ['Z', '-30', 'ciljni položaj na osi Z'], ['F', '0.2', 'posmak 0,2 mm po okretaju'], ['S', '1200', 'brzina vrtnje 1200 o/min'], ['M', '4', 'vreteno se vrti lijevo']];
const OBJ_BLOK = {
  blok: '<b>Blok</b> (NC rečenica): program je niz blokova. Svaki blok sadrži jednu ili više naredbi i počinje brojem bloka.',
  rijec: '<b>Riječ</b>: blok se sastoji od jedne ili više riječi. Riječ je, na primjer, naredba gibanja <code>G1</code> — „idi pravocrtno posmakom”.',
  adresa: '<b>Adresa</b>: riječ se sastoji od adrese i vrijednosti. Svako slovo adrese ima svoje značenje: <code>G</code> tvori pripremne (geometrijske) naredbe, <code>X</code> i <code>Z</code> su osi, <code>F</code> posmak …',
  vrijednost: '<b>Vrijednost</b>: uz adresu uvijek ide vrijednost. Zajedno daju unaprijed određenu naredbu (<code>G1</code>) ili slobodno zadanu veličinu (promjer <code>X40</code>).',
};
function blokInteraktivni(rijeci, infoEl, nacin) {
  const red = h('div', { class: 'os-blok', 'data-nacin': nacin || 'rijec' });
  rijeci.forEach(([a, v, opis]) => {
    const b = h('button', { type: 'button', class: 'os-rijec', 'aria-label': a + v + ': ' + opis }, h('span', { class: 'os-a', text: a }), h('span', { class: 'os-v', text: v }));
    const f = () => { $$('.os-rijec', red).forEach((x) => x.classList.toggle('akt', x === b)); infoEl.innerHTML = '<code>' + a + v + '</code> — ' + opis + '.'; };
    b.addEventListener('click', f); b.addEventListener('pointerenter', f); b.addEventListener('focus', f);
    red.append(b);
  });
  return red;
}
tema('grada', 'Građa programa', 'pro', [
  (box) => {
    const inf = info(OBJ_BLOK.rijec), inf2 = info('Prijeđi mišem preko riječi ili je dodirni.');
    const red = blokInteraktivni(BLOK_T, inf2, 'rijec');
    const seg = h('div', { class: 'segment', role: 'group', 'aria-label': 'Što istaknuti' });
    [['blok', 'Blok'], ['rijec', 'Riječ'], ['adresa', 'Adresa'], ['vrijednost', 'Vrijednost']].forEach(([k, t]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(k === 'rijec'), text: t });
      b.addEventListener('click', () => { red.dataset.nacin = k; inf.innerHTML = OBJ_BLOK[k]; $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
      seg.append(b);
    });
    box.append(tekst('<p>Numerički upravljani strojevi obrađuju obradak automatski prema <b>NC programu</b>. Građu i naredbe takvih programa za većinu upravljanja propisuju norme <b>DIN 66025</b> i <b>ISO 6983</b>.</p><p>Ispod je tipičan blok iz programa za tokarenje. Odaberi što želiš istaknuti, a zatim prijeđi mišem preko riječi ili je dodirni.</p>'),
      h('div', { class: 'racun' }, seg, red, inf, inf2));
  },
  (box) => {
    const red = h('div', { class: 'os-redoslijed' }, ...[['N', 'broj bloka'], ['G', 'pripremne funkcije'], ['X Z', 'koordinate'], ['F', 'posmak'], ['S', 'brzina vrtnje / rezanja'], ['T', 'alat'], ['D', 'korekcija'], ['M', 'pomoćne funkcije']].map(([a, t], i) => h('div', { class: 'os-red-k' }, h('b', { text: a }), h('span', { text: t }), h('i', { text: String(i + 1) }))));
    box.append(tekst('<p><b>Oblik bloka.</b> Kao i obična rečenica, i NC blok ima pravila. Počinje <b>brojem bloka</b>, a zatim slijede riječi redom adresa:</p>'), red,
      tekst('<p>Primjer: <code>N10 G1 X40 Z-30 F0.2 S1200 M4</code>. Upravljanje bi često prihvatilo i drukčiji redoslijed, ali se dogovorni redoslijed lakše čita i manje je pogrešaka. Na tokarilici se os Y uobičajeno ne programira — sve se odvija u ravnini Z/X.</p>'));
  },
], { auto: true });

// ----------------------------------------------------------------- Zaglavlje programa (7 podstranica)
/* valjak u kosoj projekciji: Z udesno, X gore, +Y prema promatraču (dolje lijevo) */
function crtezRavninaT() {
  const svg = svgPlatno(460, 300, 'Valjak s ravninama G17, G18 i G19 u koordinatnom sustavu tokarilice');
  const s = 1.9, ox = 134, oy = 150, ky = 0.5, ay = 35 * PI / 180;
  const P = (z, x, y) => [r1(ox + z * s - y * s * ky * Math.cos(ay)), r1(oy - x * s + y * s * ky * Math.sin(ay))];
  const R = 30, L = 110, E = 44;
  const d = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + P(...p).join(' ')).join('') + 'Z';
  /* plašt valjka: obris obiju čela (elipse u kosoj projekciji) i spojnice */
  const elipsa = (z) => { const t = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * 2 * PI; t.push([z, R * Math.cos(a), R * Math.sin(a)]); } return t; };
  const e0 = elipsa(0), e1 = elipsa(L);
  const sve = [...e0, ...e1].map((p) => P(...p));
  /* konveksna ljuska točaka (obris valjka) */
  const lj = (() => { const t = sve.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const kr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of t) { while (lo.length >= 2 && kr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of t.reverse()) { while (up.length >= 2 && kr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); })();
  sv('path', { d: lj.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join('') + 'Z', class: 'oc-ob' }, svg);
  sv('path', { d: d(e1), class: 'oc-ob' }, svg);
  const ravni = {
    G18: [[-12, -E, 0], [L + 14, -E, 0], [L + 14, E, 0], [-12, E, 0]],
    G19: [[-12, 0, -E], [L + 14, 0, -E], [L + 14, 0, E], [-12, 0, E]],
    G17: [[L, -E, -E], [L, E, -E], [L, E, E], [L, -E, E]],
  };
  const el = {}; for (const [k, t] of Object.entries(ravni)) el[k] = sv('path', { d: d(t), class: 'oc-ravanT', 'data-r': k }, svg);
  /* os vretena */
  const [a1, b1] = P(-20, 0, 0), [a2, b2] = P(L + 30, 0, 0); sv('line', { x1: a1, y1: b1, x2: a2, y2: b2, class: 'oc-osvr' }, svg);
  /* osi u kutu */
  const os = (do_, t) => { const [x1, y1] = P(-36, 0, 0), [x2, y2] = P(-36 + do_[0], do_[1], do_[2]); sv('line', { x1, y1, x2, y2, class: 'oc-os' }, svg); Crtez.prototype.strelica.call({ svg }, x2, y2, Math.atan2(y2 - y1, x2 - x1), 9, 'oc-osf'); const e = sv('text', { x: x2 + (t === 'Y' ? -14 : 6), y: y2 + (t === 'Y' ? 12 : -4), class: 'oc-txo' }, svg); e.textContent = t; };
  os([26, 0, 0], 'Z'); os([0, 30, 0], 'X'); os([0, 0, 44], 'Y');
  const alat = sv('g', { class: 'oc-alat-os' }, svg);
  const strelica = (od, do_) => { alat.innerHTML = ''; const [x1, y1] = P(...od), [x2, y2] = P(...do_); sv('line', { x1, y1, x2, y2, class: 'oc-alat-l' }, alat); Crtez.prototype.strelica.call({ svg: alat }, x2, y2, Math.atan2(y2 - y1, x2 - x1), 11, 'oc-alat-f'); };
  const OSI = { G18: [[L / 2, 0, 78], [L / 2, 0, R + 3]], G17: [[L + 48, 0, 0], [L + 4, 0, 0]], G19: [[L / 2 + 20, 78, 0], [L / 2 + 20, R + 3, 0]] };
  return { svg, P, L, R, centri: { G18: [L / 2 - 30, -E + 12, 0], G19: [L / 2 - 30, 0, E - 12], G17: [L, 0, 0] },
    odaberi(k) { for (const [kk, e] of Object.entries(el)) e.classList.toggle('akt', kk === k); if (k) strelica(...OSI[k]); else alat.innerHTML = ''; } };
}
const MODAL_T = ['N10 G18 G54 G90 G95', 'N20 T1 D1', 'N30 G96 S200 LIMS=3000 M4', 'N40 G0 X82 Z0', 'N50 G1 X-0.8 F0.2', 'N60 G0 Z2', 'N70 G97 S1500', 'N80 G91 G0 X10'];
function aktivneFunkcijeT(do_) {
  const st = { ravnina: '—', pomak: '—', mjere: '—', posmak: '—', brzina: '—', gibanje: '—' };
  for (let i = 0; i <= do_; i++) for (const w of MODAL_T[i].split(' ')) {
    if (/^G1[789]$/.test(w)) st.ravnina = w; else if (/^G5[4-7]$/.test(w)) st.pomak = w; else if (/^G9[01]$/.test(w)) st.mjere = w; else if (/^G9[45]$/.test(w)) st.posmak = w; else if (/^G9[67]$/.test(w)) st.brzina = w; else if (/^G[0-3]$/.test(w)) st.gibanje = w;
  }
  return st;
}
/* nož za vanjsko tokarenje u crtežu (mm): vrh u (z, r), pločica i držač prema gore i desno */
function nozT(c, p) {
  const g = c.g('oc-alat-g', p), u = c.g(null, g);
  c.pravok(4, 9, 15, 44, 'oc-drzac', u);
  c.poli([[0, 0], [8, 1.5], [10, 10], [2, 9]], 'oc-alat', u, true);
  c.tocka(0, 0, 2.4, 'oc-tk-s', u);
  return { g, postavi(z, r) { u.setAttribute('transform', `translate(${r1(c.X(z) - c.X(0))} ${r1(c.Y(r) - c.Y(0))})`); } };
}
/* tokarilica u presjeku (koordinate stroja): stezna glava, čeljusti, obradak; M na čelu vretena */
const SG = { z0: 0, z1: 60, r: 105 }, CEL = { z0: 60, z1: 85, r0: 40, r1: 100 }, OBR = { z0: 30, z1: 128.539, r: 40 }, G54Z = 127.539;
function crtajStezno(c, p) {
  const g = c.g(null, p);
  c.pravok(SG.z0, Math.max(c.o.y0, -SG.r), SG.z1, Math.min(c.o.y1, SG.r), 'oc-stol', g);
  c.pravok(CEL.z0, CEL.r0, CEL.z1, Math.min(c.o.y1, CEL.r1), 'oc-celj', g);
  if (c.o.y0 < -CEL.r0) c.pravok(CEL.z0, -CEL.r0, CEL.z1, Math.max(c.o.y0, -CEL.r1), 'oc-celj', g);
  c.pravok(OBR.z0, Math.max(c.o.y0, -OBR.r), OBR.z1, OBR.r, 'oc-ob', g);
  return g;
}
function g54PraksaT(box) {
  const c = new Crtez({ x0: -14, x1: 252, y0: -16, y1: 118, sir: 580, oznaka: 'Presjek tokarilice: stezna glava, obradak, nultočka stroja M i nultočka obratka W' });
  crtajStezno(c);
  c.lin(-12, 0, 248, 0, 'oc-osvr');
  c.M(0, 0); c.W(G54Z, 0, null, 'W');
  c.kotaH(0, G54Z, 0, -12, 'Z 127,539');
  const gRez = c.g(), noz = nozT(c), udar = c.g('oc-udar'); udar.style.display = 'none';
  const START = { z: 228, r: 74 };
  let poz = Object.assign({}, START); noz.postavi(poz.z, poz.r);
  const P1 = ['%2003', 'N10 G18 G90 G95', 'N20 G54', 'N30 T1 D1 G96 S200 LIMS=3000 M4', 'N40 G0 X76 Z2', 'N50 G1 Z-20 F0.2'];
  const P2 = ['%2003', 'N10 G18 G90 G95', 'N20 T1 D1 G96 S200 LIMS=3000 M4', 'N30 G0 X76 Z2', 'N40 G1 Z-20 F0.2', 'N50 G0 X100'];
  const sProg = segment('Program', ['s G54', 'bez G54'], 's G54', ''), sTab = segment('Tablica pomaka', ['ispravne', '0.000'], 'ispravne', '');
  const listaOmot = h('div'), tab = h('table', { class: 'os-tab os-hmi-tab' });
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
  let lista = null, stop = null;
  const vrati = () => { if (stop) stop(); stop = null; poz = Object.assign({}, START); noz.postavi(poz.z, poz.r); gRez.innerHTML = ''; udar.style.display = 'none'; udar.innerHTML = ''; por.textContent = ''; por.className = 'os-razina'; };
  const osvj = () => {
    lista = popisBlokova(sProg.v === 's G54' ? P1 : P2); listaOmot.innerHTML = ''; listaOmot.append(lista);
    const v = sTab.v === 'ispravne' ? ['0.000', '127.539'] : ['0.000', '0.000'];
    tab.innerHTML = `<thead><tr><th>Pomak</th><th>X</th><th>Z</th></tr></thead><tbody><tr><td>G54</td><td>${v[0]}</td><td>${v[1]}</td></tr></tbody>`;
    vrati();
  };
  sProg.promjena = osvj; sTab.promjena = osvj;
  /* prva točka puta (z, r) u kojoj vrh noža ulazi u stezno, čeljusti ili obradak */
  const prepreka = (z, r) => {
    if (z >= OBR.z0 && z <= OBR.z1 && r < OBR.r) return 'obradak';
    if (z >= CEL.z0 && z <= CEL.z1 && r >= CEL.r0 && r <= CEL.r1) return 'čeljusti stezne glave';
    if (z >= SG.z0 && z <= SG.z1 && r <= SG.r) return 'steznu glavu';
    return null;
  };
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  bR.addEventListener('click', vrati);
  bS.addEventListener('click', () => {
    vrati();
    const ispravno = sProg.v === 's G54' && sTab.v === 'ispravne', off = ispravno ? G54Z : 0, prog = sProg.v === 's G54' ? P1 : P2;
    const pom = [];
    prog.forEach((b, i) => { const mx = b.match(/X(-?[\d.]+)/), mz = b.match(/Z(-?[\d.]+)/); if (mx || mz) pom.push({ i, r: mx ? +mx[1] / 2 : null, z: mz ? +mz[1] + off : null, g0: /G0\b/.test(b) }); });
    let k = 0;
    const dalje = () => {
      if (k >= pom.length) { lista.oznaci(-1); por.className = 'os-razina dobro'; por.textContent = 'Obrada je ispravna: nož je došao 2 mm ispred čela obratka i tokario Ø76 u duljini 20 mm.'; return; }
      const m = pom[k++]; lista.oznaci(m.i);
      const a = Object.assign({}, poz), b = { z: m.z ?? a.z, r: m.r ?? a.r };
      const duz = Math.hypot(b.z - a.z, b.r - a.r);
      let cilj = b, tko = null;
      for (let t = 0; t <= 1 + 1e-9; t += 0.2 / Math.max(duz, 0.2)) {
        const z = a.z + (b.z - a.z) * t, r = a.r + (b.r - a.r) * t, p = prepreka(z, r);
        if (p && (m.g0 || p !== 'obradak')) { cilj = { z, r }; tko = p; break; }
      }
      const dd = Math.hypot(cilj.z - a.z, cilj.r - a.r);
      stop = animiraj(Math.max(250, dd / (m.g0 ? 140 : 30) * 1000), (u) => {
        poz = { z: a.z + (cilj.z - a.z) * u, r: a.r + (cilj.r - a.r) * u }; noz.postavi(poz.z, poz.r);
        if (!m.g0 && poz.z < OBR.z1 && poz.r < OBR.r) { gRez.innerHTML = ''; c.pravok(poz.z, poz.r, OBR.z1, OBR.r, 'oc-rezf', gRez); }
      }, () => {
        if (tko) {
          udar.style.display = ''; c.krug(poz.z, poz.r, 7, 'oc-udar-k', udar); c.tekst(poz.z, poz.r, 'SUDAR', 'oc-udar-t', udar, { dy: -20 });
          por.className = 'os-razina los';
          por.textContent = 'Sudar! ' + (sProg.v === 'bez G54' ? 'Bez G54 u programu' : 'S vrijednošću 0.000 u tablici') + ' upravljanje računa Z od nultočke stroja M na čelu vretena. Cilj Z2 leži 2 mm ispred vretena — nož brzim hodom udari u ' + tko + '.';
          lista.oznaci(m.i); return;
        }
        stop = pauza(250, dalje);
      });
    };
    dalje();
  });
  naCiscenje(() => { if (stop) stop(); });
  osvj();
  box.append(dva(h('div', null, tekst('<p><b>Pomak nultočke u praksi.</b> Za ispravnu obradu moraju biti zadovoljena oba uvjeta: pomak (ovdje <code>G54</code>) mora biti pozvan u programu, a u tablici pomaka mora biti upisana ispravna vrijednost izmjerena pri postavljanju (na tokarilici najčešće samo Z).</p><p>Odaberi kombinaciju i pokreni program tipkom CYCLE START.</p>'),
    h('div', { class: 'racun' }, sProg.el, sTab.el, tab, listaOmot, h('div', { class: 'os-gumbi' }, bS, bR), por)), slika(c.svg, 'Presjek u koordinatama stroja (gornja polovica). Pomak u X je 0 — W leži na osi vretena.')));
}
function g90g91T(box) {
  const c = new Crtez({ x0: -112, x1: 14, y0: -18, y1: 26, sir: 560, oznaka: 'Os Z s nožem za usporedbu G90 i G91' });
  c.lin(-108, 0, 8, 0, 'oc-os'); c.strelica(c.X(10), c.Y(0), 0, 10, 'oc-osf');
  for (let z = -100; z <= 0; z += 20) { c.lin(z, -2, z, 2, 'oc-os'); c.tekst(z, 0, fmt(z, 0), 'oc-txs', null, { dy: 16 }); }
  c.W(0, 0, null, ''); c.tekst(10, 0, 'Z', 'oc-txo', null, { dy: -8 });
  const gPut = c.g(); const alat = c.krug(-10, 10, 5, 'oc-alat');
  let z = -10, stop = null;
  const por = h('p', { class: 'os-info', 'aria-live': 'polite', html: 'Nož je na <b>Z−10</b>.' });
  const idi = (cilj, txt) => {
    if (stop) stop();
    if (cilj < -100) { por.innerHTML = 'Pomak bi izveo nož iz prikaza (Z' + fmt(cilj, 0) + '). Klikni „Vrati na Z−10”.'; return; }
    const a = z, l = c.lin(a, 10, a, 10, 'oc-putl', gPut);
    stop = animiraj(600, (u) => { const zz = a + (cilj - a) * u; alat.setAttribute('cx', c.X(zz)); l.setAttribute('x2', c.X(zz)); }, () => { z = cilj; por.innerHTML = txt + ' → nož je sada na <b>Z' + fmt(cilj, 0) + '</b>.'; });
  };
  const b1 = h('button', { type: 'button', class: 'gumb', html: '<code>G90 Z-40</code>' }), b2 = h('button', { type: 'button', class: 'gumb', html: '<code>G91 Z-20</code>' }), b3 = h('button', { type: 'button', class: 'gumb tanki', text: 'Vrati na Z−10' });
  b1.addEventListener('click', () => idi(-40, 'G90 Z-40: idi NA položaj Z−40'));
  b2.addEventListener('click', () => idi(z - 20, 'G91 Z-20: idi ZA 20 mm u smjeru −Z'));
  b3.addEventListener('click', () => { if (stop) stop(); z = -10; gPut.innerHTML = ''; alat.setAttribute('cx', c.X(-10)); por.innerHTML = 'Nož je na <b>Z−10</b>.'; });
  naCiscenje(() => { if (stop) stop(); });
  box.append(tekst(`<p><b>Način mjera.</b> Položaje koje nož treba doseći možeš zadati u odnosu na nultočku obratka (<b>apsolutno</b>) ili u odnosu na trenutačni položaj noža (<b>inkrementalno</b>). Prema DIN/ISO apsolutno se uključuje s <code>G90</code>, a inkrementalno s <code>G91</code> (vidi vježbe u skupini Geometrija).</p>
    <div class="okvir"><p><code>G90</code> — idi <b>NA</b> položaj X/Z (X kao promjer)<br><code>G91</code> — idi <b>ZA</b> … mm u X/Z (X kao put u polumjeru, uz DIAM90)</p></div><p>Pri uključivanju stroja aktivan je <code>G90</code>. Isprobaj: klikni više puta na <code>G91 Z-20</code>.</p>`),
    slika(c.svg), h('div', { class: 'os-gumbi' }, b1, b2, b3), por);
}
tema('zaglavlje', 'Zaglavlje programa', 'pro', [
  (box) => {
    box.append(tekst(`<p>Kao NC programer mogao bi odmah početi s pozivom alata. Prije toga ipak treba poznavati nekoliko naredbi i osnovnih funkcija — razlikuju se od upravljanja do upravljanja.</p><p>Na početku programa obično stoje <b>broj</b>, <b>ime</b> i <b>vrsta</b> programa. Dio toga upravljanje upiše samo, pa se ne mora programirati.</p>`),
      h('div', { class: 'os-zagl' },
        h('div', { class: 'os-zagl-k' }, h('code', { text: '%2003' }), h('span', { text: 'broj' })),
        h('div', { class: 'os-zagl-k' }, h('code', { html: 'N_FLANSCH<span class="os-zagl-v">_MPF</span>' }), h('span', { html: 'ime i <b>oznaka vrste</b>' }))),
      tekst('<p class="pom"><code>MPF</code> označava glavni program (main program). Potprogrami imaju oznaku <code>SPF</code>.</p>'));
  },
  (box) => {
    const tb = h('table', { class: 'os-tab' }), lista = popisBlokova(MODAL_T);
    const osvj = (i) => { lista.oznaci(i); const st = aktivneFunkcijeT(i); tb.innerHTML = `<thead><tr><th>Skupina</th><th>Aktivno nakon bloka ${MODAL_T[i].split(' ')[0]}</th></tr></thead><tbody><tr><td>izbor ravnine</td><td>${st.ravnina}</td></tr><tr><td>pomak nultočke</td><td>${st.pomak}</td></tr><tr><td>način mjera</td><td>${st.mjere}</td></tr><tr><td>jedinica posmaka</td><td>${st.posmak}</td></tr><tr><td>brzina vrtnje / rezanja</td><td>${st.brzina}</td></tr><tr><td>vrsta gibanja</td><td>${st.gibanje}</td></tr></tbody>`; };
    $$('li', lista).forEach((li, i) => { li.tabIndex = 0; li.setAttribute('role', 'button'); li.addEventListener('click', () => osvj(i)); li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); osvj(i); } }); });
    osvj(0);
    box.append(dva(tekst(`<p>Na početak programa korisno je napisati osnovne funkcije koje vrijede za cijeli program:</p>
      <table class="os-tab"><tbody><tr><td>izbor ravnine</td><td><code>G17</code> <code>G18</code> <code>G19</code></td></tr><tr><td>pomak nultočke</td><td><code>G54</code> … <code>G57</code></td></tr><tr><td>način mjera</td><td><code>G90</code> <code>G91</code></td></tr><tr><td>mjerne jedinice posmaka</td><td><code>G94</code> <code>G95</code></td></tr><tr><td>brzina vrtnje / rezanja</td><td><code>G96</code> <code>G97</code></td></tr></tbody></table>
      <p>Funkcije su razvrstane u <b>skupine</b>. Svaka ostaje aktivna — djeluje <b>modalno</b> — sve dok se ne programira druga funkcija iz iste skupine i time je poništi.</p>`),
      h('div', { class: 'racun' }, h('p', { class: 'pom', text: 'Klikni blok i pogledaj što je aktivno nakon njega:' }), lista, tb)));
  },
  (box) => {
    const cr = crtezRavninaT(); const inf = info('');
    const OPIS = { G18: '<code>G18</code> — ravnina Z/X: ravnina tokarenja. Sva gibanja noža leže u njoj; okomito na nju je os Y.', G17: '<code>G17</code> — ravnina X/Y: čelo obratka. Koristi se za obradu čela pogonjenim alatom (npr. bušenje izvan osi), os alata je Z.', G19: '<code>G19</code> — ravnina Y/Z: plašt obratka. Koristi se za obradu plašta pogonjenim alatom (npr. utor za pero), os alata je X.' };
    const gumbi = h('div', { class: 'segment', role: 'group', 'aria-label': 'Ravnina obrade' });
    ['G18', 'G17', 'G19'].forEach((k) => { const b = h('button', { type: 'button', 'aria-pressed': String(k === 'G18'), text: k }); const f = () => { cr.odaberi(k); inf.innerHTML = OPIS[k]; $$('button', gumbi).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; b.addEventListener('click', f); b.addEventListener('pointerenter', f); b.addEventListener('focus', f); gumbi.append(b); });
    cr.odaberi('G18'); inf.innerHTML = OPIS.G18;
    box.append(dva(h('div', null, tekst('<p><b>Izbor ravnine.</b> I na tokarilici postoje tri ravnine, a programiraju se s <code>G17</code>, <code>G18</code> i <code>G19</code>. Za tokarenje je to uvijek <code>G18</code> — ravnina Z/X kroz os vretena. Na mnogim tokarilicama <code>G18</code> je osnovno stanje, ali ga je dobro napisati u zaglavlje.</p><p><code>G17</code> i <code>G19</code> trebaju tek kad revolver ima <b>pogonjene alate</b> (glodala i svrdla koja se sama vrte).</p>'), gumbi, inf), slika(cr.svg, 'Istaknuta je ravnina, strelica pokazuje os alata okomitu na nju.')));
  },
  (box) => {
    const c = new Crtez({ x0: -14, x1: 150, y0: -48, y1: 118, sir: 540, oznaka: 'Presjek: stezna glava, obradak, nultočka stroja M na čelu vretena i nultočka obratka W na čelu obratka' });
    crtajStezno(c); c.lin(-12, 0, 146, 0, 'oc-osvr');
    c.M(0, 0); c.W(G54Z, 0, null, 'W');
    c.strelicaMM(0, -26, G54Z, -26, 'oc-off', null, 9); c.lin(0, -4, 0, -30, 'oc-tn'); c.lin(G54Z, -4, G54Z, -30, 'oc-tn');
    c.tekst(G54Z / 2, -26, 'pomak Z (G54)', 'oc-txr', null, { dy: -6 });
    c.tekst(G54Z + 4, 40, 'obradak', 'oc-txs', null, { dy: -6, a: 'start' }); c.tekst(30, 108, 'stezna glava', 'oc-txs', null, { dy: 4 });
    box.append(dva(tekst(`<p><b>Pomak nultočke (teorija).</b> Da bi položaj nultočke obratka W u radnom prostoru bio jednoznačan, stroj ima svoju <b>nultočku stroja M</b>. Na tokarilici M leži na osi vretena, najčešće na <b>čelu vretena</b> (naležnoj plohi stezne glave).</p>
      <p><b>Pomak nultočke</b> opisuje gdje je W u odnosu na M. Budući da i W leži na osi vretena, pomak u X je 0 — mjeri se i upisuje samo <b>pomak u Z</b>, npr. zagrebavanjem čela (vidi poglavlje Postavljanje stroja). U programu se pomak poziva naredbom <code>G54</code> (ili <code>G55</code> …), a poništava npr. naredbom <code>G500</code>.</p>`), slika(c.svg, 'Pomak nultočke: od M do W samo u smjeru Z.')));
  },
  (box) => g54PraksaT(box),
  (box) => g90g91T(box),
  (box) => {
    box.append(tekst(`<p><b>Mjerne jedinice posmaka.</b> Uz dosad opisane funkcije postoje i druge koje se jednom napišu na početku programa ako vrijede za cijeli program. Takva je jedinica posmaka:</p>`),
      h('table', { class: 'os-tab', html: '<thead><tr><th>Funkcija</th><th>Značenje adrese F</th><th>Primjer</th></tr></thead><tbody><tr><td><code>G94</code></td><td>posmak u mm/min</td><td><code>G94 F200</code> — nož se giba 200 mm/min</td></tr><tr><td><code>G95</code></td><td>posmak u mm po okretaju</td><td><code>G95 F0.2 S1000</code> — 0,2 mm/okr · 1000 o/min = 200 mm/min</td></tr></tbody>' }),
      tekst('<p>Na tokarilici se posmak gotovo uvijek zadaje <b>po okretaju</b> (<code>G95</code>): debljina strugotine tada ne ovisi o brzini vrtnje, što je važno uz <code>G96</code>, kad se brzina vrtnje neprestano mijenja. Koja je funkcija aktivna pri uključivanju, određuje proizvođač stroja — zato <code>G95</code> napiši u zaglavlje.</p>'));
  },
], { auto: true });

// ----------------------------------------------------------------- Adrese F, S, T, D, M
const ADRESE_T = {
  T: '<b>T — broj alata.</b> Na tokarilici broj alata najčešće odgovara mjestu u revolveru. Kad upravljanje izvede T1, revolver se zakrene i alat s mjesta 1 dolazi u radni položaj — posebna naredba za izmjenu (kao M6 na glodalici) obično ne treba.',
  D: '<b>D — broj korekcije.</b> Bira slog korekcija alata (duljine Length1 i Length2, polumjer oštrice). Ako D nije programiran, automatski vrijedi <code>D1</code>.',
  F: '<b>F — posmak.</b> Uz <code>G95</code> F je posmak u mm po okretaju: <code>F0.25</code> znači da se nož u svakom okretaju pomakne 0,25 mm.',
  S: '<b>S — brzina.</b> Uz <code>G96</code> S je brzina rezanja u m/min (<code>S250</code> = 250 m/min), a uz <code>G97</code> brzina vrtnje u o/min.',
  M: '<b>M — pomoćne funkcije.</b> Većinu određuje proizvođač stroja, a samo su neke normirane. Uz tokarenje najčešće su: <code>M3</code> vreteno desno, <code>M4</code> vreteno lijevo, <code>M5</code> stop vretena, <code>M8</code> hlađenje uključeno, <code>M9</code> hlađenje isključeno, <code>M30</code> kraj programa.',
};
const ADR_PROG_T = [['N10 G96 S250 T1 M4', 'alat T1, stalna brzina rezanja 250 m/min, vreteno lijevo'], ['N20 G0 X44 Z2', 'dolazak brzim hodom ispred čela'], ['N30 G1 Z-40 F0.25 M8', 'uzdužno tokarenje Ø44, hlađenje'], ['N40 G1 X52 Z-46', 'skošenje i odmak preko stepenice']];
/* SimTok s oznakom W na čelu */
function simTokW(o) {
  const sim = new SimTok(o);
  const g = sv('g', { class: 'oc-w' }, sim.svg), cx = sim.Z(0), cy = sim.Rr(0);
  sv('circle', { cx, cy, r: 6, class: 'oc-wk' }, g);
  sv('path', { d: `M${cx} ${cy}L${cx + 6} ${cy}A6 6 0 0 0 ${cx} ${cy - 6}Z M${cx} ${cy}L${cx - 6} ${cy}A6 6 0 0 0 ${cx} ${cy + 6}Z`, class: 'oc-wf' }, g);
  const t = sv('text', { x: cx + 9, y: cy + 16, class: 'oc-txb', 'text-anchor': 'start' }, g); t.textContent = 'W';
  return sim;
}
tema('adrese', 'Adrese F, S, T, D, M', 'pro', [(box) => {
  const inf = info('Prijeđi mišem preko obojenih adresa ili ih dodirni.');
  const tipicni = h('div', { class: 'os-blok os-adr-blok' });
  [['T', '1'], ['D', '1'], ['F', '0.25'], ['S', '250'], ['M', '4']].forEach(([a, v]) => { const b = h('button', { type: 'button', class: 'os-rijec os-boja-' + a, 'aria-label': 'Adresa ' + a }, h('span', { class: 'os-a', text: a }), h('span', { class: 'os-v', text: v })); const f = () => { inf.innerHTML = ADRESE_T[a]; $$('.os-rijec', tipicni).forEach((x) => x.classList.toggle('akt', x === b)); }; b.addEventListener('click', f); b.addEventListener('pointerenter', f); b.addEventListener('focus', f); tipicni.append(b); });
  const START = { x: 92, z: 18 };
  const sim = simTokW({ z: [-70, 24], r: [-30, 48], ob: { z0: -64, z1: 0, R: 25 }, start: START, sir: 560, oznaka: 'Animacija programa N10 do N40: uzdužni presjek obratka s nožem' });
  const lista = h('ol', { class: 'os-prog os-prog-op' }); ADR_PROG_T.forEach(([b, o]) => lista.append(h('li', null, h('code', { html: blokHTML(b) }), h('span', { text: o }))));
  const oznaci = (i) => $$('li', lista).forEach((li, j) => li.classList.toggle('akt', j === i));
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  const reset = () => { sim.vrati(START); oznaci(-1); };
  bR.addEventListener('click', reset);
  bS.addEventListener('click', () => {
    reset(); const st = { T: '', S: '', F: '', M: '' }; const stat = () => sim.postaviStatus([st.T, st.S, st.F, st.M].filter(Boolean).join(' · '));
    sim.izvedi([
      { tip: 'cekaj', ms: 800, b: 0, prije: () => { st.T = 'T1'; st.S = 'G96 S250 M4'; stat(); } },
      { tip: 'G0', x: 44, z: 2, b: 1 },
      { tip: 'G1', z: -40, b: 2, prije: () => { st.F = 'F0.25'; st.M = 'M8'; stat(); } },
      { tip: 'G1', x: 52, z: -46, b: 3 },
    ], (m) => oznaci(m.b), () => oznaci(-1));
  });
  naCiscenje(() => sim.zaustavi());
  box.append(tekst('<p>Adresama <b>F, S, T, D</b> i <b>M</b> poziva se alat i zadaje posmak, brzina i smjer vrtnje. Ispod su riječi tipičnog poziva alata — prijeđi mišem preko obojenih adresa:</p>'), tipicni, inf,
    h('table', { class: 'os-tab', html: '<thead><tr><th>Blok</th><th>Značenje</th></tr></thead><tbody><tr><td><code>N5 G18 G54 G90 G95</code></td><td>ravnina tokarenja, pomak nultočke, apsolutne mjere, posmak po okretaju</td></tr><tr><td><code>N180 G96 F0.3 S240 T3 D1 M4</code></td><td>alat T3 s korekcijom D1, stalna brzina rezanja 240 m/min, posmak 0,3 mm/okr, vreteno lijevo</td></tr><tr><td><code>N245 G97 F0.1 S2500 T6 D1 M3</code></td><td>alat T6, stalna brzina vrtnje 2500 o/min, posmak 0,1 mm/okr, vreteno desno</td></tr></tbody>' }),
    tekst('<p>Dogovorno se F, S, T i M u bloku pišu tim redom, a jedan blok smije imati više M funkcija. Često se poziv alata i tehnološki podaci pišu u zaseban blok prije prvog gibanja, na primjer:</p>'),
    dva(h('div', null, lista, h('div', { class: 'os-gumbi' }, bS, bR)), slika(sim.svg, 'Obradak Ø50 mm; W je na čelu. Gornja polovica je presjek, donja zrcalna slika.')));
}], { auto: true });

// ----------------------------------------------------------------- Naredbe gibanja G0, G1, G2, G3
function shemaGibanja(k) {
  const svg = svgPlatno(220, 140, 'Shema naredbe ' + k), C = { svg };
  const t = (x, y, s) => { const e = sv('text', { x, y, class: 'oc-txs', 'text-anchor': 'middle' }, svg); e.textContent = s; };
  sv('circle', { cx: 30, cy: 110, r: 5, class: 'oc-tk-s' }, svg); t(30, 132, 'početak');
  if (k === 'G0' || k === 'G1') { sv('line', { x1: 30, y1: 110, x2: 186, y2: 34, class: k === 'G0' ? 'oc-put-g0 deb' : 'oc-putl' }, svg); Crtez.prototype.strelica.call(C, 190, 32, Math.atan2(-78, 160), 11, 'oc-strf'); t(186, 22, 'cilj'); }
  else { const cw = k === 'G2'; sv('path', { d: cw ? 'M30 110 A80 80 0 0 1 190 110' : 'M30 110 A80 80 0 0 0 190 110', class: 'oc-putl' }, svg); Crtez.prototype.strelica.call(C, 190, 110, cw ? PI / 2 : -PI / 2, 11, 'oc-strf'); sv('circle', { cx: 110, cy: 110, r: 3, class: 'oc-tk-s' }, svg); t(110, 100, 'središte'); t(190, 132, 'cilj'); }
  return svg;
}
function simGibanjaT(start, blokovi, pomaci, oznaka) {
  const sim = simTokW({ z: [-50, 24], r: [-26, 34], ob: { z0: -45, z1: 0, R: 20 }, start, sir: 560, oznaka });
  const lista = popisBlokova(blokovi);
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  const reset = () => { sim.vrati(start); lista.oznaci(-1); };
  bR.addEventListener('click', reset);
  bS.addEventListener('click', () => { reset(); sim.izvedi(pomaci, (m) => lista.oznaci(m.b), () => lista.oznaci(-1)); });
  naCiscenje(() => sim.zaustavi());
  return dva(h('div', null, lista, h('div', { class: 'os-gumbi' }, bS, bR), h('p', { class: 'pom', html: 'Isprekidano: brzi hod G0 · puna crta: posmak G1. Obradak Ø40 mm.' })), slika(sim.svg));
}
/* G2 i G3 s tečaja: ista početna točka X15.358 Z-25, polumjer 20 */
function lukVjezbaT(box, k) {
  const G2 = k === 'G2', S = [-25, 7.679], C = G2 ? [-15, 25] : [-35, 25], E = G2 ? [-35, 25] : [-15, 25];
  const I = C[1] - S[1], K = C[0] - S[0], r = Math.hypot(I, K);
  console.assert(Math.abs(Math.hypot(E[0] - C[0], E[1] - C[1]) - r) < 1e-3, 'krajnja točka nije na kružnici');
  const c = new Crtez({ x0: -56, x1: 12, y0: -8, y1: 50, sir: 520, oznaka: k + ': početna točka, središte i krajnja točka luka u ravnini Z–X' });
  c.mreza(5); osVretena(c, -54, 10);
  const luk = (od, do_, n = 40) => { const a0 = Math.atan2(od[1] - C[1], od[0] - C[0]); let a1 = Math.atan2(do_[1] - C[1], do_[0] - C[0]), dd = a1 - a0; while (dd > PI) dd -= 2 * PI; while (dd < -PI) dd += 2 * PI; const t = []; for (let i = 0; i <= n; i++) { const a = a0 + dd * i / n; t.push([C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)]); } return t; };
  const prof = G2 ? [[0, S[1]], ...luk(S, E), [-52, 25]] : [[0, 25], ...luk(E, S), [-52, S[1]]];
  profil(c, prof, null, true);
  osiZX(c, { xa: -54, xb: 10, ya: -6, yb: 46 }); c.W(0, 0, null, '');
  const a0 = Math.atan2(S[1] - C[1], S[0] - C[0]); let a1 = Math.atan2(E[1] - C[1], E[0] - C[0]), d = a1 - a0;
  if (G2) { while (d >= 0) d -= 2 * PI; } else { while (d <= 0) d += 2 * PI; }
  c.krug(C[0], C[1], r, 'oc-tn oc-crt');
  const gK = c.g(), gL = c.g();
  const tS = c.g('oc-pol'); c.tocka(...S, 5, 'oc-tk', tS); c.tekst(...S, 'početna točka X15.358 Z−25', 'oc-txb', tS, { dx: 8, dy: 18, a: 'start' });
  const tE = c.g('oc-cilj'); c.tocka(...E, 5, 'oc-tk', tE); c.tekst(...E, 'krajnja točka X50 Z' + fmt(E[0], 0), 'oc-txb', tE, { dx: G2 ? -8 : 8, dy: -8, a: G2 ? 'end' : 'start' });
  const tC = c.g(); c.tocka(...C, 4, 'oc-tk-s', tC); c.tekst(...C, 'središte', 'oc-txb', tC, { dx: G2 ? 8 : -8, dy: -8, a: G2 ? 'start' : 'end' });
  const alat = c.tocka(...S, 8, 'oc-alat oc-alat-t');
  const koraci = [
    () => { gK.innerHTML = ''; c.strelicaMM(S[0], S[1], S[0], C[1], 'oc-komp-l', gK, 8); c.strelicaMM(S[0], C[1], C[0], C[1], 'oc-komp-l', gK, 8); c.tekst(S[0], (S[1] + C[1]) / 2, 'I', 'oc-txr', gK, { dx: 8, a: 'start' }); c.tekst((S[0] + C[0]) / 2, C[1], 'K', 'oc-txr', gK, { dy: -6 });
      return '<b>1. korak — rastavi put usporedno s osima.</b> Od početne točke do središta idi najprije usporedno s osi X (to je <b>I</b>), a zatim usporedno s osi Z (to je <b>K</b>).'; },
    () => { gK.innerHTML = ''; c.strelicaMM(S[0], S[1], S[0], C[1], 'oc-komp-l', gK, 8); c.strelicaMM(S[0], C[1], C[0], C[1], 'oc-komp-l', gK, 8); c.tekst(S[0], (S[1] + C[1]) / 2, fmt(Math.abs(I), 3), 'oc-txr', gK, { dx: 8, a: 'start' }); c.tekst((S[0] + C[0]) / 2, C[1], fmt(Math.abs(K), 3), 'oc-txr', gK, { dy: -6 });
      return `<b>2. korak — izračunaj duljine.</b> U smjeru X računaš <b>u polumjeru</b>: središte je na Ø50, početna točka na Ø15,358 → (50 − 15,358) / 2 = ${fmt(Math.abs(I), 3)} mm. U smjeru Z: od Z−25 do Z${fmt(C[0], 0)} = ${fmt(Math.abs(K), 0)} mm.`; },
    () => `<b>3. korak — odredi predznak.</b> Gledaj od početne točke prema središtu i usporedi sa smjerom osi. Ovdje se ide u smjeru <b>+X</b> i <b>${K > 0 ? '+Z' : '−Z'}</b>, pa je I pozitivan, a K ${K > 0 ? 'pozitivan' : 'negativan'}. <br>Upiši I i K.`,
  ];
  let kk = 0;
  const opis = h('p', { class: 'os-korak', 'aria-live': 'polite' });
  const nap = h('span', { class: 'os-nap-k', text: '1/3' });
  const bK = h('button', { type: 'button', class: 'gumb tanki', text: 'Sljedeći korak' });
  const unos = h('div', { class: 'os-unos', hidden: true }, h('div', { class: 'os-unos-h' }, h('span', { text: 'Središte luka (inc)' })));
  const iI = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'I' }), iK = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'K' });
  const bIn = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' }), por = h('p', { class: 'os-por', 'aria-live': 'polite' });
  const blok = h('p', { class: 'os-blok-rez', hidden: true });
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START', hidden: true });
  unos.append(h('div', { class: 'os-polja' }, h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: 'I' }), iI, h('em', { text: 'inc (r)' })), h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: 'K' }), iK, h('em', { text: 'inc' }))), h('div', { class: 'os-gumbi' }, bIn), por);
  const pokaziKorak = () => { opis.innerHTML = koraci[kk](); nap.textContent = (kk + 1) + '/3'; bK.hidden = kk >= 2; unos.hidden = kk < 2; if (kk >= 2) iI.focus({ preventScroll: true }); };
  bK.addEventListener('click', () => { if (kk < 2) { kk++; pokaziKorak(); } });
  const provjeri = () => {
    const vi = broj(iI.value), vk = broj(iK.value);
    if (vi === null || vk === null) return (por.textContent = 'Upiši I i K.', por.className = 'os-por krivo');
    if (Number.isNaN(vi) || Number.isNaN(vk)) return (por.textContent = 'Upiši brojeve (decimalni znak zarez ili točka).', por.className = 'os-por krivo');
    const ok = Math.abs(vi - I) < 0.01 && Math.abs(vk - K) < 0.01;
    if (!ok) { por.className = 'os-por krivo'; por.textContent = Math.abs(vi - 2 * I) < 0.02 ? 'I je upisan kao promjer — I se računa u polumjeru.' : (Math.abs(Math.abs(vi) - Math.abs(I)) < 0.01 && Math.abs(Math.abs(vk) - Math.abs(K)) < 0.01) ? 'Duljine su dobre, ali provjeri predznak: gledaj od početne točke prema središtu.' : 'Netočno. I je udaljenost od početne točke do središta u smjeru X (u polumjeru), K u smjeru Z.'; return; }
    por.className = 'os-por tocno'; por.textContent = 'Točno.';
    blok.hidden = false; blok.innerHTML = `<code>${k} X50 Z${nc(E[0])} I${nc(I)} K${nc(K)}</code> — X (promjer) i Z su krajnja točka (apsolutno), I i K središte (inkrementalno od početne točke).`;
    bS.hidden = false; bS.focus({ preventScroll: true });
  };
  bIn.addEventListener('click', provjeri); [iI, iK].forEach((u) => u.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (u === iI && iK.value.trim() === '') iK.focus(); else provjeri(); } }));
  let stop = null;
  bS.addEventListener('click', () => {
    if (stop) stop(); gL.innerHTML = '';
    const p = c.put('', 'oc-putl', gL);
    stop = animiraj(1400, (u) => { const kut = a0 + d * u; p.setAttribute('d', c.lukD(C[0], C[1], r, a0, kut)); alat.setAttribute('cx', c.X(C[0] + r * Math.cos(kut))); alat.setAttribute('cy', c.Y(C[1] + r * Math.sin(kut))); });
  });
  naCiscenje(() => { if (stop) stop(); });
  pokaziKorak();
  const uvod = G2 ? `<p><b>G2 — kružno gibanje u smjeru kazaljke na satu</b> (gledano kao na slici: Z udesno, X gore). Adrese X i Z daju <b>krajnju točku</b> (apsolutno, X kao promjer), a adrese I i K <b>središte</b> luka, inkrementalno od početne točke:</p><ul class="os-lista"><li><b>I</b> je udaljenost od početne točke do središta u smjeru X — <b>u polumjeru</b>,</li><li><b>K</b> je udaljenost od početne točke do središta u smjeru Z.</li></ul><p>Umjesto središta može se zadati i polumjer: <code>CR=20</code>.</p>`
    : `<p><b>G3 — kružno gibanje suprotno od kazaljke na satu.</b> Sve vrijedi kao za G2: X i Z su krajnja točka, I i K središte, inkrementalno od početne točke. Ovdje nož ide od stezne glave prema čelu. I i K odredi u tri ista koraka.</p>`;
  box.append(dva(h('div', null, tekst(uvod), h('div', { class: 'racun' }, h('div', { class: 'racun-h' }, h('b', { text: 'Određivanje I i K' }), nap), opis, bK, unos, blok, h('div', { class: 'os-gumbi' }, bS))), slika(c.svg, `Početna točka X15,358 Z−25, središte Ø50 Z${fmt(C[0], 0)}, polumjer ${fmt(r, 2)} mm. Mreža 5 mm.`)));
}
tema('gibanja', 'Naredbe gibanja G0, G1, G2, G3', 'pro', [
  (box) => {
    const inf = h('div', { class: 'os-shema' }); const opisi = { G0: 'G0 — pozicioniranje brzim hodom', G1: 'G1 — pravocrtno gibanje posmakom', G2: 'G2 — kružno gibanje u smjeru kazaljke na satu', G3: 'G3 — kružno gibanje suprotno od kazaljke na satu' };
    const seg = h('div', { class: 'segment', role: 'group', 'aria-label': 'Naredba gibanja' });
    const pok = (k) => { inf.innerHTML = ''; inf.append(shemaGibanja(k), h('p', { class: 'pom', text: opisi[k] })); $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x.textContent === k))); };
    ['G0', 'G1', 'G2', 'G3'].forEach((k) => { const b = h('button', { type: 'button', 'aria-pressed': 'false', text: k }); b.addEventListener('click', () => pok(k)); b.addEventListener('pointerenter', () => pok(k)); b.addEventListener('focus', () => pok(k)); seg.append(b); });
    pok('G0');
    box.append(dva(h('div', null, tekst('<p>Osi se gibaju naredbama gibanja <b>G0</b> do <b>G3</b>:</p><table class="os-tab"><tbody><tr><td><code>G0</code></td><td>pozicioniranje brzim hodom</td></tr><tr><td><code>G1</code></td><td>pravocrtno gibanje posmakom</td></tr><tr><td><code>G2</code></td><td>kružno gibanje u smjeru kazaljke na satu</td></tr><tr><td><code>G3</code></td><td>kružno gibanje suprotno od kazaljke na satu</td></tr></tbody></table><p>Odaberi naredbu za shemu. Smjer kazaljke gleda se na crtežu sa Z udesno i X gore — kao kod tokarilice s nožem iza osi (kosa postelja).</p>'), seg), inf));
    box.append(tekst('<p>Primjer: nož ide brzim hodom iz trenutačnog položaja na <code>X30 Z2</code>, a zatim posmakom do <code>Z-25</code>. Klikni CYCLE START.</p>'),
      simGibanjaT({ x: 60, z: 16 }, ['G0 X30 Z2', 'G1 Z-25 F0.2'], [{ tip: 'G0', x: 30, z: 2, b: 0 }, { tip: 'G1', z: -25, b: 1 }], 'Animacija G0 i G1'));
  },
  (box) => {
    box.append(tekst('<p><b>G0 — pozicioniranje brzim hodom.</b> Osi se gibaju najvećom mogućom brzinom do programiranog cilja. Pritom u pravilu samo jedan pogon postigne najveću brzinu, a brzinu druge osi upravljanje prilagodi tako da gibanje bude pravocrtno. Brzim hodom se ne reže! Zato se brzim hodom dolazi samo do sigurnosne točke ispred obratka — obično 1 do 2 mm.</p>'),
      simGibanjaT({ x: 60, z: 16 }, ['; pozicioniranje ispred čela', 'G0 X44 Z2', '; dostava na promjer', 'G0 X32'], [{ tip: 'G0', x: 44, z: 2, b: 1 }, { tip: 'G0', x: 32, b: 3 }], 'Animacija G0 X44 Z2 i G0 X32'));
  },
  (box) => {
    box.append(tekst('<p><b>G1 — pravocrtno gibanje posmakom.</b> Osi se gibaju programiranim posmakom F po pravcu do zadanog cilja. F može biti aktivan modalno iz nekog prethodnog bloka ili se programira zajedno s G1 u istom bloku. Uzdužno tokarenje je G1 samo u Z, poprečno samo u X, a stožac (kosina) G1 istodobno u X i Z.</p>'),
      simGibanjaT({ x: 32, z: 2 }, ['; uzdužno tokarenje s G1', 'G1 Z-30 F0.2', '; poprečno: stepenica do Ø42', 'G1 X42'], [{ tip: 'G1', z: -30, b: 1 }, { tip: 'G1', x: 42, b: 3 }], 'Animacija G1 Z-30 i G1 X42'));
  },
  (box) => lukVjezbaT(box, 'G2'),
  (box) => lukVjezbaT(box, 'G3'),
], { auto: true });

// ----------------------------------------------------------------- Korekcija polumjera oštrice
const RN_KOR = 3;   /* polumjer oštrice na slici (povećano; stvarno npr. 0,8 mm) */
const KON_V = [[0, 0], [0, 10], [-10, 15], [-25, 15], [-25, 22], [-35, 22], [-45, 16], [-55, 16], [-55, 28]];   /* [Z, r] */
const KON_PROG = ['N1 G18 G54 G90 G95', 'N2 T1 D1', 'N3 G96 S200 LIMS=3000 M4', 'N4 G0 X0 Z3', 'N5', 'N6 G1 Z0 F0.15', 'N7 X20', 'N8 X30 Z-10', 'N9 Z-25', 'N10 X44', 'N11 Z-35', 'N12 X32 Z-45', 'N13 Z-55', 'N14 X56', 'N15 G40 G0 X70 Z5'];
function konR(z) { /* programirana kontura r(z), z između vrhova */
  for (let i = 0; i < KON_V.length - 1; i++) { const [za, ra] = KON_V[i], [zb, rb] = KON_V[i + 1]; if (Math.abs(zb - za) < 1e-9) continue; const lo = Math.min(za, zb), hi = Math.max(za, zb); if (z >= lo && z <= hi) return ra + (rb - ra) * (z - za) / (zb - za); }
  return z > 0 ? 0 : 30;
}
/* putanja središta oštrice: s = 0 (G40: središte = vrh P + (R, R)), +1 (G42: desno od konture), −1 (G41: lijevo) — točke [z, r, blok] */
function putanjaOstrice(s, R) {
  const V = KON_V, pts = [], start = [3 + R, R];
  const dir = (a, b) => { const dz = b[0] - a[0], dr = b[1] - a[1], L = Math.hypot(dz, dr); return [dz / L, dr / L]; };
  const dodaj = (a, b, blok) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.1)); for (let i = 1; i <= n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, blok]); };
  pts.push([start[0], start[1], 5]);
  if (s === 0) {
    dodaj(start, [V[0][0] + R, V[0][1] + R], 5);
    for (let k = 0; k < V.length - 1; k++) dodaj([V[k][0] + R, V[k][1] + R], [V[k + 1][0] + R, V[k + 1][1] + R], 6 + k);
    return pts;
  }
  const D = [], N = [];
  for (let k = 0; k < V.length - 1; k++) { const d = dir(V[k], V[k + 1]); D.push(d); N.push([s * d[1], -s * d[0]]); }
  /* spojne točke odmaknutih dužina */
  const poc = [], kraj = [];
  for (let k = 0; k < D.length; k++) { poc.push([V[k][0] + R * N[k][0], V[k][1] + R * N[k][1]]); kraj.push([V[k + 1][0] + R * N[k][0], V[k + 1][1] + R * N[k][1]]); }
  const luk = []; /* luk oko vrha (vanjski kut) ili presjecište (unutarnji kut) */
  for (let k = 0; k < D.length - 1; k++) {
    const cr = D[k][0] * D[k + 1][1] - D[k][1] * D[k + 1][0];
    if (s * cr > 0) { /* vanjski kut: luk oko vrha */
      const v = V[k + 1], a0 = Math.atan2(N[k][1], N[k][0]); let a1 = Math.atan2(N[k + 1][1], N[k + 1][0]), dd = a1 - a0; while (dd > PI) dd -= 2 * PI; while (dd < -PI) dd += 2 * PI;
      const t = []; const n = Math.max(2, Math.ceil(Math.abs(dd) * R / 0.1)); for (let i = 1; i < n; i++) { const a = a0 + dd * i / n; t.push([v[0] + R * Math.cos(a), v[1] + R * Math.sin(a)]); } luk.push(t);
    } else { /* unutarnji kut: presjecište odmaknutih pravaca */
      const p = kraj[k], q = poc[k + 1], d1 = D[k], d2 = D[k + 1], det = d1[0] * -d2[1] - d1[1] * -d2[0];
      if (Math.abs(det) > 1e-9) { const t = ((q[0] - p[0]) * -d2[1] - (q[1] - p[1]) * -d2[0]) / det; const X = [p[0] + d1[0] * t, p[1] + d1[1] * t]; kraj[k] = X; poc[k + 1] = X; }
      luk.push([]);
    }
  }
  dodaj(start, poc[0], 5);
  for (let k = 0; k < D.length; k++) { dodaj(poc[k], kraj[k], 6 + k); if (k < D.length - 1) { let a = kraj[k]; for (const t of luk[k]) { dodaj(a, t, 6 + k); a = t; } dodaj(a, poc[k + 1], 7 + k); } }
  return pts;
}
let korOstApi = null;
function korekcijaOstrice(box) {
  const R = RN_KOR, Z0 = -60, Z1 = 4, DZ = 0.05, NC = Math.round((Z1 - Z0) / DZ), RS = 30;
  const c = new Crtez({ x0: -64, x1: 14, y0: -5, y1: 40, sir: 560, oznaka: 'Uzdužni presjek: programirana kontura, putanja središta oštrice i izrađeni obradak' });
  osVretena(c, -63, 12); c.W(0, 0, null, '');
  const gOb = c.g(), gOdst = c.g(), gKon = c.g('oc-kontura'), gPut = c.g();
  c.poli(KON_V, 'oc-l oc-crt', gKon);
  const nos = c.g('oc-alat-g'), nosK = c.krug(3 + R, R, R, 'oc-alat oc-alat-pr', nos), nosS = c.tocka(3 + R, R, 2.4, 'oc-tk-s', nos);
  const prod = new Float32Array(NC); const zc = (i) => Z0 + (i + 0.5) * DZ;
  const ocistiOb = () => { for (let i = 0; i < NC; i++) prod[i] = zc(i) <= 0 ? RS : 0; };
  const crtajOb = () => { let d = `M${c.X(Z0)} ${c.Y(0)}`; for (let i = 0; i < NC; i++) d += `L${c.X(zc(i))} ${c.Y(prod[i])}`; d += `L${c.X(Z1)} ${c.Y(0)}Z`; gOb.innerHTML = ''; c.put(d, 'oc-ob', gOb); };
  const rezi = (Cz, Cr) => { const i0 = Math.max(0, Math.floor((Cz - R - Z0) / DZ)), i1 = Math.min(NC - 1, Math.ceil((Cz + R - Z0) / DZ)); for (let i = i0; i <= i1; i++) { const dz = zc(i) - Cz; if (Math.abs(dz) >= R) continue; const lo = Math.max(0, Cr - Math.sqrt(R * R - dz * dz)); if (lo < prod[i]) prod[i] = lo; } };
  ocistiOb(); crtajOb();
  /* odstupanja: višak (žuto) i zarez (crveno); zanemaruje se područje unutarnjih kutova (polumjer oštrice ondje je neizbježan) */
  const unutarnji = [[-25, 15], [-45, 16], [-55, 16]];
  const odstupanja = () => {
    gOdst.innerHTML = ''; let vMax = 0, zMax = 0; const vi = [], ze = [];
    for (let i = 0; i < NC; i++) {
      const z = zc(i); if (z > 0 || z < -55) { vi.push(null); ze.push(null); continue; }
      const k = konR(z), dv = prod[i] - k; let ign = unutarnji.some(([uz]) => Math.abs(z - uz) < R * 1.05);
      vi.push(!ign && dv > 0.08 ? [z, k, prod[i]] : null); ze.push(dv < -0.08 ? [z, k, prod[i]] : null);
      if (!ign && dv > vMax) vMax = dv; if (-dv > zMax) zMax = -dv;
    }
    const crtajPojas = (niz, cls) => { let run = []; const zatvori = () => { if (run.length > 1) { const gore = run.map((p) => [p[0], Math.max(p[1], p[2])]), dolje = run.map((p) => [p[0], Math.min(p[1], p[2])]).reverse(); c.poli([...gore, ...dolje], cls, gOdst, true); } run = []; }; niz.forEach((p) => { if (p) run.push(p); else zatvori(); }); zatvori(); };
    crtajPojas(vi, 'oc-visak'); crtajPojas(ze, 'oc-skart');
    return { vMax, zMax };
  };
  let odabrano = null;
  const lista = popisBlokova(KON_PROG); const n5 = $$('li', lista)[4];
  const utor = h('span', { class: 'os-utor', 'aria-live': 'polite', text: '___' }); n5.querySelector('code').append(' ', utor);
  n5.addEventListener('dragover', (e) => e.preventDefault()); n5.addEventListener('drop', (e) => { e.preventDefault(); postavi(e.dataTransfer.getData('text/plain')); });
  const cipovi = h('div', { class: 'cipovi', role: 'group', 'aria-label': 'Funkcija za blok N5' });
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite', text: 'Klikni G40, G41 ili G42 (ili ga povuci u blok N5).' });
  let stop = null;
  const vrati = () => { if (stop) stop(); stop = null; ocistiOb(); crtajOb(); gOdst.innerHTML = ''; gPut.innerHTML = ''; nos.setAttribute('transform', ''); lista.oznaci(-1); };
  const postavi = (k) => { if (!/^G4[012]$/.test(k)) return; odabrano = k; utor.textContent = k; utor.classList.add('pun'); $$('.cip', cipovi).forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === k))); por.textContent = 'U blok N5 upisano je ' + k + '. Pokreni simulaciju tipkom CYCLE START.'; por.className = 'os-razina'; vrati(); };
  ['G40', 'G41', 'G42'].forEach((k) => { const b = h('button', { type: 'button', class: 'cip', draggable: 'true', 'aria-pressed': 'false', text: k }); b.addEventListener('click', () => postavi(k)); b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', k); }); cipovi.append(b); });
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  bR.addEventListener('click', vrati);
  bS.addEventListener('click', () => {
    if (!odabrano) { por.className = 'os-razina slabo'; por.textContent = 'Najprije u blok N5 stavi G40, G41 ili G42.'; return; }
    vrati();
    const s = odabrano === 'G42' ? 1 : odabrano === 'G41' ? -1 : 0, pts = putanjaOstrice(s, R);
    const sred = c.put('', 'oc-sred', gPut); let dS = `M${c.X(pts[0][0])} ${c.Y(pts[0][1])}`, j = 1, zadnji = 0;
    const pomakni = (p) => nos.setAttribute('transform', `translate(${r1(c.X(p[0]) - c.X(3 + R))} ${r1(c.Y(p[1]) - c.Y(R))})`);
    stop = animiraj(pts.length * 0.1 / 22 * 1000, (u) => {
      const k = Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)));
      for (; j <= k; j++) { const p = pts[j]; rezi(p[0], p[1]); dS += `L${c.X(p[0])} ${c.Y(p[1])}`; }
      sred.setAttribute('d', dS); pomakni(pts[k]); lista.oznaci(pts[k][2]);
      const t = performance.now(); if (t - zadnji > 50) { zadnji = t; crtajOb(); }
    }, () => {
      for (; j < pts.length; j++) { const p = pts[j]; rezi(p[0], p[1]); dS += `L${c.X(p[0])} ${c.Y(p[1])}`; }
      sred.setAttribute('d', dS); crtajOb(); lista.oznaci(14);
      const { vMax, zMax } = odstupanja();
      stop = pauza(500, () => {
        stop = null; lista.oznaci(-1); nos.setAttribute('transform', `translate(${r1(c.X(10) - c.X(3 + R))} ${r1(c.Y(35) - c.Y(R))})`);
        if (s === 1) { por.className = 'os-razina dobro'; por.textContent = 'Ispravno: G42 vodi središte oštrice za polumjer R desno od konture (gledano u smjeru gibanja). Obradak ima točan oblik i na kosinama; u unutarnjim kutovima ostaje samo polumjer oštrice.'; if (korOstApi) korOstApi.gotovo(); }
        else if (s === 0) { por.className = 'os-razina los'; por.textContent = 'Bez korekcije (G40) upravljanje vodi teorijski vrh noža P. Uzdužne i poprečne plohe su točne, ali na kosinama nisu: na rastućoj kosini ostaje višak (žuto, do ' + fmt(vMax, 2) + ' mm), a na padajućoj oštrica zareže (crveno, do ' + fmt(zMax, 2) + ' mm) — škart.'; }
        else { por.className = 'os-razina los'; por.textContent = 'Kriva strana: s G41 središte oštrice ide unutar materijala, pa je cijela kontura zarezana (crveno, do ' + fmt(zMax, 2) + ' mm). Gledaj u smjeru gibanja: materijal je lijevo od noža, nož mora biti desno — G42.'; }
      });
    });
  });
  naCiscenje(() => { if (stop) stop(); });
  box.append(dva(h('div', null, tekst(`<p>Kontura se završno tokari od čela prema steznoj glavi. Polumjer oštrice na slici je povećan na <b>${R} mm</b> da se razlike vide (stvarno npr. 0,8 mm).</p>`), cipovi, lista, h('div', { class: 'os-gumbi' }, bS, bR), por),
    slika(c.svg, 'Isprekidano: programirana kontura · puna crta: putanja središta oštrice · žuto: višak · crveno: zarez.')));
}
tema('korekcija-ostrice', 'Korekcija polumjera oštrice', 'pro', [
  (box) => {
    const c = new Crtez({ x0: -16, x1: 22, y0: -8, y1: 22, sir: 420, oznaka: 'Oštrica s polumjerom: teorijski vrh P i središte S' });
    c.pravok(-16, -8, 0, 0, 'oc-materijal'); c.pravok(-16, 0, -6, 6, 'oc-materijal');
    const R = 5; const g = c.g();
    { const a1 = -75 * PI / 180, a2 = 185 * PI / 180, d1 = 15 * PI / 180, d2 = 95 * PI / 180;
      const T1 = [R + R * Math.cos(a1), R + R * Math.sin(a1)], T2 = [R + R * Math.cos(a2), R + R * Math.sin(a2)];
      const E1 = [T1[0] + 16 * Math.cos(d1), T1[1] + 16 * Math.sin(d1)], E2 = [T2[0] + 16 * Math.cos(d2), T2[1] + 16 * Math.sin(d2)], E3 = [E1[0] + E2[0] - T2[0], E1[1] + E2[1] - T2[1]];
      c.put(c.lukD(R, R, R, a2, a1 + 2 * PI) + `L${c.X(E1[0])} ${c.Y(E1[1])}L${c.X(E3[0])} ${c.Y(E3[1])}L${c.X(E2[0])} ${c.Y(E2[1])}Z`, 'oc-alat oc-alat-pr', g); }
    c.krug(R, R, R, 'oc-tn', g); c.tocka(R, R, 3, 'oc-tk-s', g); c.tekst(R, R, 'S', 'oc-txb', g, { dx: 8, dy: -4, a: 'start' });
    c.lin(-4, 0, 14, 0, 'oc-tn oc-crt'); c.lin(0, -4, 0, 14, 'oc-tn oc-crt');
    c.tocka(0, 0, 4, 'oc-tk', g); c.tekst(0, 0, 'P', 'oc-txb', g, { dx: -8, dy: 16, a: 'end' });
    c.lin(R, R, R + R * Math.cos(-2.4), R + R * Math.sin(-2.4), 'oc-l'); c.tekst(R - 3, R - 1, 'R', 'oc-kt', null, { a: 'end' });
    box.append(dva(tekst(`<p>Vrh tokarskog noža nije šiljast nego zaobljen <b>polumjerom oštrice</b> R (npr. 0,4 ili 0,8 mm). Korekcije alata (Length1, Length2) mjere se do <b>teorijskog vrha P</b> — sjecišta tangenti na oštricu u smjerovima X i Z. Upravljanje bez korekcije vodi upravo točku P po programiranoj konturi.</p>
      <ul class="os-lista"><li>Na <b>uzdužnim i poprečnim</b> plohama to je ispravno — oštrica dodiruje obradak upravo u točki tangente.</li><li>Na <b>kosinama i lukovima</b> oštrica dodiruje obradak drugdje, pa nastaju pogreške oblika: višak ili zarez.</li></ul>
      <p>Korekcija polumjera oštrice to ispravlja: upravljanje vodi <b>središte oštrice S</b> na udaljenosti R od konture.</p>
      <table class="os-tab"><tbody><tr><td><code>G40</code></td><td>bez korekcije ili poništenje korekcije</td></tr><tr><td><code>G41</code></td><td>korekcija lijevo od konture</td></tr><tr><td><code>G42</code></td><td>korekcija desno od konture</td></tr></tbody></table>
      <p>„Lijevo” i „desno” gleda se <b>u smjeru gibanja noža</b>. Za vanjsko tokarenje od čela prema steznoj glavi (s nožem iznad osi) to je <code>G42</code>. Upravljanje mora znati i <b>položaj oštrice</b> (smjer u kojem leži S od P) — upisuje se u korekcije alata.</p>`),
      slika(c.svg, 'Teorijski vrh P i središte oštrice S. Uvećano.')));
  },
  (box, api) => { korOstApi = api; box.append(tekst('<p><b>Simulacija.</b> Stavi G40, G41 ili G42 u blok N5 i pokreni program. Usporedi izrađeni obradak s programiranom konturom.</p>')); korekcijaOstrice(box); },
]);

// ----------------------------------------------------------------- Korekcije alata (Length1, Length2, polumjer)
const ALATI_T = [
  { t: 'T1', naziv: 'vanjski nož za grubu obradu 80°', L1: 49.606, L2: 63.485, R: 0.8, oblik: 'grubi' },
  { t: 'T2', naziv: 'svrdlo Ø32', L1: 7.036, L2: 171.866, R: 0.3 },
  { t: 'T3', naziv: 'vanjski nož za finu obradu 35°', L1: 52.258, L2: 63.589, R: 0.4, oblik: 'fini' },
  { t: 'T4', naziv: 'unutarnji nož za grubu obradu 80°', L1: 11.811, L2: 204.739, R: 0.8 },
  { t: 'T5', naziv: 'nož za usijecanje i odrezivanje 1,8 mm', L1: 44.970, L2: 67.199, R: 0.1 },
  { t: 'T6', naziv: 'unutarnji nož za finu obradu 35°', L1: 16.784, L2: 209.350, R: 0.4 },
  { t: 'T7', naziv: 'nož za navoj', L1: 44.673, L2: 62.147, R: 0.1 },
];
tema('korekcije-alata', 'Korekcije alata', 'pro', [(box, api) => {
  const vidjeno = new Set(); const crt = h('div');
  const tb = h('table', { class: 'os-tab os-hmi-tab', html: '<thead><tr><th>T</th><th>D</th><th>vrsta</th><th>Length1 (X)</th><th>Length2 (Z)</th><th>Radius</th></tr></thead><tbody>' + ALATI_T.map((a) => `<tr data-t="${a.t}"><td>${a.t.slice(1)}</td><td>1</td><td>${a.naziv}</td><td>${a.L1.toFixed(3)}</td><td>${a.L2.toFixed(3)}</td><td>${a.R.toFixed(3)}</td></tr>`).join('') + '</tbody>' });
  const crtaj = (k) => {
    const a = ALATI_T.find((x) => x.t === k); crt.innerHTML = '';
    const c = new Crtez({ x0: -78, x1: 30, y0: -62, y1: 30, sir: 460, oznaka: 'Alat ' + k + ' u revolveru s kotama Length1, Length2 i polumjerom oštrice' });
    const pz = -a.L2, pr = -a.L1;
    c.pravok(-12, -18, 26, 26, 'oc-stol'); c.tekst(16, 20, 'revolver', 'oc-txs', null, { dy: 4 });
    c.pravok(-8, pr + 9, 6, -6, 'oc-drzac'); c.pravok(pz + 4, pr + 9, 6, pr + 21, 'oc-drzac');
    if (a.oblik === 'fini') c.poli([[pz, pr], [pz + 13, pr + 3], [pz + 12, pr + 9], [pz + 3, pr + 9]], 'oc-alat', null, true);
    else c.poli([[pz, pr], [pz + 8, pr + 1.5], [pz + 10, pr + 9], [pz + 1.5, pr + 8]], 'oc-alat', null, true);
    c.lin(-20, 0, 24, 0, 'oc-tn oc-crt'); c.lin(0, -20, 0, 28, 'oc-tn oc-crt');
    c.tocka(0, 0, 4.5, 'oc-tk'); c.tekst(0, 0, 'F', 'oc-txb', null, { dx: 8, dy: -6, a: 'start' });
    c.tocka(pz, pr, 4, 'oc-tk-s'); c.tekst(pz, pr, 'P', 'oc-txb', null, { dx: -8, dy: 4, a: 'end' });
    c.kotaV(0, pr, 6, 18, 'Length1 = ' + fmt(a.L1, 3));
    c.kotaH(pz, 0, pr + 21, 14, 'Length2 = ' + fmt(a.L2, 3));
    c.tekst(pz, pr, 'R ' + fmt(a.R, 1), 'oc-kt', null, { dx: 6, dy: 18, a: 'start' });
    crt.append(slika(c.svg, k + ' — ' + a.naziv + ': Length1 u X i Length2 u Z od referentne točke revolvera F do teorijskog vrha P.'));
    $$('tr[data-t]', tb).forEach((tr) => tr.classList.toggle('sel', tr.dataset.t === k));
    vidjeno.add(k); if (vidjeno.size === 2) api.gotovo();
  };
  const sT = segment('Alat', ['T1', 'T3'], 'T1', ''); sT.promjena = crtaj; crtaj('T1');
  box.append(dva(h('div', null, tekst('<p>Mjere svakog alata upisuju se u <b>spremnik korekcija alata</b>. Kod tokarskog noža to su:</p><ul class="os-lista"><li><b>Length1</b> — udaljenost u smjeru X od referentne točke revolvera F do teorijskog vrha P (u polumjeru),</li><li><b>Length2</b> — udaljenost u smjeru Z od F do P,</li><li><b>Radius</b> — polumjer oštrice (za korekciju G41/G42) i položaj oštrice.</li></ul><p>Prema broju alata T i korekcije D upravljanje samo preračuna putanju za stvarne mjere — u programu se zato piše kontura iz crteža. Kako se Length1 i Length2 mjere zagrebavanjem, vidi u poglavlju Postavljanje stroja.</p>'), sT.el, h('div', { class: 'tablica-omot' }, tb)), crt));
}]);

// ----------------------------------------------------------------- Ciklusi / potprogrami
function ciklusBusenje(box) {
  const START = { x: 0, z: 24 };
  const sim = simTokW({ z: [-62, 30], r: [-30, 32], ob: { z0: -56, z1: 0, R: 25 }, alat: 'svrdlo', R0: 8, start: START, sir: 560, oznaka: 'Ciklus dubokog bušenja: uzdužni presjek obratka sa svrdlom' });
  const DUB = [-15, -25, -30, -35, -40], pomaci = [{ tip: 'G0', z: 2 }];
  let pret = 2; DUB.forEach((zd, i) => { if (i) pomaci.push({ tip: 'G0', z: pret + 1 }); pomaci.push({ tip: 'G1', z: zd, prije: () => sim.postaviStatus('ubod ' + (i + 1) + ': Z' + fmt(zd, 0)) }); pomaci.push({ tip: 'G0', z: 2 }); pret = zd; });
  pomaci.push({ tip: 'G0', z: 24 });
  const tb = h('table', { class: 'os-tab', html: '<tbody><tr><td>referentna ravnina (čelo)</td><td>Z0</td></tr><tr><td>sigurnosni razmak</td><td>2 mm</td></tr><tr><td>konačna dubina</td><td>Z−40</td></tr><tr><td>prva dubina bušenja</td><td>Z−15</td></tr><tr><td>degresija (smanjenje dubine uboda)</td><td>5 mm</td></tr><tr><td>najmanja dubina uboda</td><td>5 mm</td></tr><tr><td>način</td><td>odvođenje strugotine (svrdlo izlazi iz provrta)</td></tr></tbody>' });
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  const por = h('p', { class: 'os-info', 'aria-live': 'polite' });
  const reset = () => { sim.vrati(START); por.textContent = ''; };
  bR.addEventListener('click', reset);
  bS.addEventListener('click', () => { reset(); sim.izvedi(pomaci, null, () => { sim.postaviStatus(''); por.textContent = 'Gotovo: jednim pozivom ciklusa izbušen je provrt dubine 40 mm u pet uboda (15, 10, 5, 5 i 5 mm); nakon svakog uboda svrdlo izlazi i izbacuje strugotinu.'; }); });
  naCiscenje(() => sim.zaustavi());
  box.append(dva(h('div', null, tekst('<p><b>Primjer 1/2: duboko bušenje.</b> Svrdlo u osi obratka (X0) buši u više uboda. Prvi je ubod najdublji, a svaki sljedeći je kraći za iznos degresije — strugotina se tako lakše odvodi. Ciklus sam izračuna sve položaje:</p>'), tb,
    tekst('<p class="pom">Svrdlo Ø16 mm i sve vrijednosti su naš primjer. Na SINUMERIKU je to ciklus <code>CYCLE83</code>.</p>'), h('div', { class: 'os-gumbi' }, bS, bR), por), slika(sim.svg)));
}
function konR2(z) { if (z > 0) return 0; if (z >= -20) return 15; if (z >= -30) return 22 + (-20 - z) / 10 * 3; if (z >= -45) return 25; return 30; }
function ciklusSkidanje(box) {
  const START = { x: 76, z: 10 }, AP = 2.5, DOD = 0.3;
  const sim = simTokW({ z: [-58, 14], r: [-34, 40], ob: { z0: -54, z1: 0, R: 30 }, start: START, sir: 560, oznaka: 'Ciklus skidanja materijala: uzdužni presjek obratka s nožem' });
  const pomaci = []; const razine = [];
  for (let rc = 30 - AP; rc > 15 + DOD + 1e-6; rc -= AP) razine.push(rc);
  razine.push(15 + DOD);
  razine.forEach((rc, i) => {
    let ze = 0; while (ze > -54 && konR2(ze) + DOD < rc - 1e-6) ze -= 0.05;
    pomaci.push({ tip: 'G0', x: 2 * rc, z: 2, prije: () => sim.postaviStatus('grubo: prolaz ' + (i + 1) + '/' + razine.length) }, { tip: 'G1', z: ze }, { tip: 'G1', x: 2 * (rc + 0.5), z: ze + 0.5 }, { tip: 'G0', z: 2 });
  });
  const fin = [[30, 2], [30, -20], [44, -20], [50, -30], [50, -45], [62, -45]];
  pomaci.push({ tip: 'G0', x: fin[0][0], z: fin[0][1], prije: () => sim.postaviStatus('završna obrada po konturi') });
  fin.slice(1).forEach(([x, z]) => pomaci.push({ tip: 'G1', x, z }));
  pomaci.push({ tip: 'G0', x: 76, z: 10 });
  const tb = h('table', { class: 'os-tab', html: '<tbody><tr><td>kontura (potprogram)</td><td><code>KONTURA_SPF</code>: Ø30 / Ø44 / stožac do Ø50 / Ø50</td></tr><tr><td>dubina dostave</td><td>2,5 mm (u polumjeru)</td></tr><tr><td>dodatak za završnu obradu</td><td>0,3 mm</td></tr><tr><td>način</td><td>uzdužno, vanjski, gruba i završna obrada</td></tr></tbody>' });
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  const por = h('p', { class: 'os-info', 'aria-live': 'polite' });
  const reset = () => { sim.vrati(START); por.textContent = ''; };
  bR.addEventListener('click', reset);
  bS.addEventListener('click', () => { reset(); sim.izvedi(pomaci, null, () => { sim.postaviStatus(''); por.textContent = 'Gotovo: iz konture u potprogramu ciklus je sam izračunao ' + razine.length + ' grubih prolaza s dodatkom 0,3 mm i jedan završni prolaz po konturi.'; }); });
  naCiscenje(() => sim.zaustavi());
  box.append(dva(h('div', null, tekst('<p><b>Primjer 2/2: skidanje materijala po konturi.</b> Konturu gotovog dijela opišeš jednom — u potprogramu — a ciklus iz pripremka Ø60 sam izračuna grube prolaze i na kraju jednom prođe po konturi:</p>'), tb,
    tekst('<p class="pom">Vrijednosti su naš primjer. Na SINUMERIKU je to ciklus <code>CYCLE95</code>; utor iz programa VMDEMO izrađuje ciklus <code>CYCLE93</code>.</p>'), h('div', { class: 'os-gumbi' }, bS, bR), por), slika(sim.svg)));
}
tema('ciklusi', 'Ciklusi / potprogrami', 'pro', [
  (box) => {
    box.append(tekst('<p><b>Ciklusi</b> su potprogrami kojima se zadaju parametri, a služe za cijele „lance gibanja” — npr. bušenje u više uboda, usijecanje utora, skidanje materijala ili rezanje navoja. Za posebne slijedove možeš napisati i vlastite <b>potprograme</b> (oznaka <code>SPF</code>), npr. konturu dijela ili odlazak na točku izmjene alata (u programu VMDEMO to je potprogram <code>TCP</code>).</p>'),
      h('table', { class: 'os-tab', html: '<thead><tr><th>Obrada</th><th>Ciklus na SINUMERIKU 840D</th></tr></thead><tbody><tr><td>duboko bušenje</td><td><code>CYCLE83</code></td></tr><tr><td>usijecanje (utor)</td><td><code>CYCLE93</code></td></tr><tr><td>skidanje materijala po konturi</td><td><code>CYCLE95</code></td></tr><tr><td>navoj</td><td><code>CYCLE97</code></td></tr></tbody>' }));
    ciklusBusenje(box);
  },
  (box) => { ciklusSkidanje(box); },
], { auto: true });

// ================================================================= TEST
const DIJELOVI = { geo: { naziv: 'Geometrija', zadano: 240 }, teh: { naziv: 'Tehnologija', zadano: 180 }, pro: { naziv: 'Programiranje', zadano: 900 } };
const TEST = { aktivan: false, koraci: [], i: 0, bod: {}, max: {}, vrijeme: { geo: 0, teh: 0, pro: 0 }, timer: 0 };
function prekiniTest() { clearInterval(TEST.timer); TEST.timer = 0; TEST.aktivan = false; if (E.nav) E.nav.hidden = false; }

function ulaz(k, oz) { const i = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': k + (oz ? ' (' + oz + ')' : '') }); return { i, el: h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: k }), i, oz ? h('em', { text: oz }) : null) }; }
function jednako(t, v, tol = 0.01) { const b = broj(t); return b != null && !Number.isNaN(b) && Math.abs(b - v) <= tol; }
function povratna(el, ok, t) { el.className = 'os-por ' + (ok ? 'tocno' : 'krivo'); el.innerHTML = (ok ? 'Točno. ' : 'Netočno. ') + (t || ''); }
function enterNa(ulazi, fn) { ulazi.forEach((u, j) => u.addEventListener('keydown', (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const sl = ulazi.slice(j + 1).find((x) => x.value.trim() === ''); if (sl) sl.focus(); else fn(); })); }

// ---- MCQ (jedan klik, odmah povratna informacija)
function pitanjeMCQ(pit, odg, tocan, gotovo, svg) {
  const el = h('div', { class: 'kviz' }, h('p', { class: 'pit', html: pit }), svg || null);
  const odgEl = h('div', { class: 'odg' }); const obr = h('p', { class: 'obraz' });
  izmijesaj(odg.map((t, j) => [t, j])).forEach(([t, j]) => {
    const b = h('button', { type: 'button', html: t });
    b.addEventListener('click', () => {
      $$('button', odgEl).forEach((x) => { x.disabled = true; }); const ok = j === tocan;
      b.classList.add(ok ? 'tocno' : 'netocno'); if (!ok) $$('button', odgEl).find((x) => x.dataset.j === String(tocan)).classList.add('tocno');
      obr.classList.add('vidi'); obr.textContent = ok ? 'Točno.' : 'Netočno — točan odgovor je označen zeleno.'; gotovo(ok ? 1 : 0);
    });
    b.dataset.j = j; odgEl.append(b);
  });
  el.append(odgEl, obr); return el;
}
// ---- slaganje redoslijeda klikom
function slagalica(elementi, mjesta, tocniRed) {
  const el = h('div', { class: 'os-slag' });
  const ponuda = h('div', { class: 'cipovi', role: 'group', 'aria-label': 'Ponuđeno' }); const red = h('ol', { class: 'os-slag-red' });
  const st = mjesta.map(() => null);
  const crtaj = () => {
    ponuda.innerHTML = ''; red.innerHTML = '';
    elementi.forEach((t) => { if (st.includes(t)) return; const b = h('button', { type: 'button', class: 'cip', html: '<code>' + t + '</code>' }); b.addEventListener('click', () => { const k = st.indexOf(null); if (k > -1) { st[k] = t; crtaj(); } }); ponuda.append(b); });
    mjesta.forEach((m, k) => { const b = h('button', { type: 'button', class: 'os-mjesto' + (st[k] ? ' pun' : ''), 'aria-label': m + ': ' + (st[k] || 'prazno') + (st[k] ? ' — klikni za vraćanje' : ''), html: '<b>' + m + '</b> ' + (st[k] ? '<code>' + st[k] + '</code>' : '<i>…</i>') }); b.addEventListener('click', () => { if (st[k] && !el.zakljucano) { st[k] = null; crtaj(); } }); red.append(h('li', null, b)); });
  };
  crtaj();
  el.append(h('p', { class: 'pom', text: 'Klikni ponuđene stavke redom kojim idu; klik na popunjeno mjesto vraća stavku.' }), ponuda, red);
  el.puno = () => st.every(Boolean);
  el.provjeri = () => { el.zakljucano = true; let n = 0; $$('.os-mjesto', red).forEach((b, k) => { const ok = st[k] === tocniRed[k]; if (ok) n++; b.classList.add(ok ? 'ok' : 'ne'); if (!ok) b.insertAdjacentHTML('beforeend', ' <small>→ ' + tocniRed[k] + '</small>'); }); $$('button', ponuda).forEach((b) => { b.disabled = true; }); return n; };
  return el;
}
// ---- korak testa s pod-zadacima
function korakNiz(el, zadaci, gotovo) { // zadaci: [(host, sljedeci(bodovi)) => void]
  let i = 0, uk = 0; const host = h('div'); const brojac = h('p', { class: 'brojac' });
  el.append(brojac, host);
  const dalje = () => {
    if (i >= zadaci.length) { gotovo(uk); return; }
    brojac.textContent = 'Zadatak ' + (i + 1) + '/' + zadaci.length; host.innerHTML = '';
    const zad = zadaci[i++];
    zad(host, (b) => { uk += b; const bt = h('button', { type: 'button', class: 'gumb tanki os-sljedeci', text: i < zadaci.length ? 'Sljedeći zadatak' : 'Završi ovaj dio' }); bt.addEventListener('click', dalje); host.append(bt); bt.focus({ preventScroll: true }); });
  };
  dalje();
}


// ---- Geometrija: položaji (osovina; X kao promjer)
const OSOVINA_T = [[0, 12], [-3, 15], [-20, 15], [-20, 20], [-35, 20], [-45, 28], [-60, 28], [-60, 35], [-80, 35]];   /* [Z, r] */
const TOCKE_TEST_T = OSOVINA_T.slice(0, 8);
function crtezOsovine(T, oznaka) {
  const c = new Crtez({ x0: -92, x1: 18, y0: -50, y1: 50, sir: 580, oznaka: oznaka || 'Stepenasta osovina s kotama; tražena točka je istaknuta' });
  osVretena(c, -90, 16);
  profil(c, OSOVINA_T);
  c.W(0, 0, null, 'W');
  /* Z-ordinate ispod osovine */
  const gK = c.g('oc-kota');
  c.lin(0, -42, -80, -42, null, gK);
  for (const z of [0, -3, -20, -35, -45, -60, -80]) { c.lin(z, -40, z, -44, null, gK); c.tekst(z, -42, fmt(z, 0), 'oc-kt', gK, { dy: 15 }); }
  /* promjeri iznad stepenica */
  [[-11.5, 15, 'Ø30'], [-27.5, 20, 'Ø40'], [-52.5, 28, 'Ø56'], [-70, 35, 'Ø70']].forEach(([z, r, t]) => c.tekst(z, r, t, 'oc-kt', null, { dy: -6 }));
  c.tekst(0, 12, '3 × 45°', 'oc-kt', null, { dx: 6, dy: -8, a: 'start' });
  if (T) { const g = c.g('oc-trazena'); c.tocka(T[0], T[1], 9, 'oc-tr-k', g); c.tocka(T[0], T[1], 3, 'oc-tr-s', g); c.tekst(T[0], T[1], '?', 'oc-tr-t', g, { dx: 14, dy: -10 }); }
  return c;
}
function korakPolozajiT(el, gotovo) {
  const izbor = izmijesaj(TOCKE_TEST_T).slice(0, 5);
  korakNiz(el, izbor.map((T) => (host, sljedeci) => {
    const c = crtezOsovine(T); const x = ulaz('X', 'Ø abs'), z = ulaz('Z', 'abs'); const por = h('p', { class: 'os-por' });
    const b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => {
      if (x.i.value.trim() === '' || z.i.value.trim() === '') { por.className = 'os-por krivo'; por.textContent = 'Upiši X i Z.'; return; }
      const ok = jednako(x.i.value, 2 * T[1]) && jednako(z.i.value, T[0]); x.i.disabled = z.i.disabled = b.disabled = true;
      povratna(por, ok, ok ? '' : 'Točka je X' + fmt(2 * T[1]) + ' Z' + fmt(T[0]) + (jednako(x.i.value, T[1]) ? ' — X se upisuje kao promjer, ne polumjer.' : '.')); sljedeci(ok ? 1 : 0);
    };
    b.addEventListener('click', prov); enterNa([x.i, z.i], prov);
    host.append(dva(h('div', null, h('p', { html: 'Upiši koordinate istaknute točke. W je na osi, na desnom čelu; <b>X je promjer</b>.' }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, x.el, z.el), h('div', { class: 'os-gumbi' }, b), por)), slika(c.svg)));
    x.i.focus({ preventScroll: true });
  }), gotovo);
}
// ---- Geometrija: pravci (abs, zatim inc s X u polumjeru)
const PRAVCI_T = [[[2, 20], [-3, 30], [-20, 30]], [[-20, 30], [-20, 40], [-35, 40]], [[-35, 40], [-45, 56], [-60, 56]]];   /* [Z, X promjer] */
function korakPravciT(el, gotovo) {
  const [A, M, B] = PRAVCI_T[Math.floor(Math.random() * PRAVCI_T.length)];
  const c = crtezOsovine(null, 'Osovina s putom noža: početna točka, međutočka i krajnja točka');
  c.poli([A, M, B].map(([z, x]) => [z, x / 2]), 'oc-putl'); c.strelica(c.X(B[0]), c.Y(B[1] / 2), Math.atan2(c.Y(B[1] / 2) - c.Y(M[1] / 2), c.X(B[0]) - c.X(M[0])), 10, 'oc-strf');
  [[A, 'P1'], [M, 'međutočka'], [B, 'P2']].forEach(([p, t]) => { c.tocka(p[0], p[1] / 2, 5, 'oc-tk-s'); c.tekst(p[0], p[1] / 2, t, 'oc-txb', null, { dx: 9, dy: -8, a: 'start' }); });
  const faze = [['Upiši koordinate <b>početne točke P1</b> (apsolutno, X kao promjer):', 'Ø abs', [A[1], A[0]]], ['Upiši put od P1 do <b>međutočke</b> (inkrementalno, X kao put u polumjeru):', 'inc', [(M[1] - A[1]) / 2, M[0] - A[0]]], ['Upiši put od međutočke do <b>krajnje točke P2</b> (inkrementalno, X u polumjeru):', 'inc', [(B[1] - M[1]) / 2, B[0] - M[0]]]];
  const host = h('div'); el.append(dva(host, slika(c.svg)));
  korakNiz(host, faze.map(([t, oz, v]) => (hh, sljedeci) => {
    const x = ulaz('X', oz === 'inc' ? 'inc (r)' : oz), z = ulaz('Z', oz === 'inc' ? 'inc' : 'abs'), por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => { if (x.i.value.trim() === '' || z.i.value.trim() === '') { por.className = 'os-por krivo'; por.textContent = 'Upiši X i Z.'; return; } const ok = jednako(x.i.value, v[0]) && jednako(z.i.value, v[1]); x.i.disabled = z.i.disabled = b.disabled = true; povratna(por, ok, ok ? '' : 'Točno je X' + fmt(v[0]) + ' Z' + fmt(v[1]) + '.'); sljedeci(ok ? 1 : 0); };
    b.addEventListener('click', prov); enterNa([x.i, z.i], prov);
    hh.append(h('p', { html: t }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, x.el, z.el), h('div', { class: 'os-gumbi' }, b), por)); x.i.focus({ preventScroll: true });
  }), gotovo);
}
// ---- Tehnologija
const BRZINE_T = [[40, 200], [80, 150], [100, 250], [60, 120], [125, 180]];   /* [promjer obratka, vc] */
function korakBrzinaT(el, gotovo) {
  const izbor = izmijesaj(BRZINE_T).slice(0, 3);
  korakNiz(el, izbor.map(([d, vc]) => (host, sljedeci) => {
    const n = vc * 1000 / (PI * d), u = ulaz('n', 'o/min'), por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => { const v = broj(u.i.value); if (v == null || Number.isNaN(v)) { por.className = 'os-por krivo'; por.textContent = 'Upiši broj.'; return; } const ok = Math.abs(v - n) <= n * 0.03; u.i.disabled = b.disabled = true; povratna(por, ok, 'n = ' + vc + ' · 1000 / (π · ' + d + ') ≈ ' + fmt(n, 0) + ' o/min.'); sljedeci(ok ? 1 : 0); };
    b.addEventListener('click', prov); enterNa([u.i], prov);
    host.append(h('p', { html: `Obradak promjera <b>d = ${d} mm</b> treba tokariti brzinom rezanja <b>v<sub>c</sub> = ${vc} m/min</b>. Kolika je brzina vrtnje? (dopušteno odstupanje ±3 %)` }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, u.el), h('div', { class: 'os-gumbi' }, b), por)); u.i.focus({ preventScroll: true });
  }), gotovo);
}
function korakPosmakT(el, gotovo) {
  const n = [500, 800, 1000, 1250][Math.floor(Math.random() * 4)], f = [0.1, 0.15, 0.2, 0.25, 0.3][Math.floor(Math.random() * 5)];
  korakNiz(el, [
    (host, sljedeci) => {
      const F = n * f, u = ulaz('vf', 'mm/min'), por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
      u.el.querySelector('.os-adr').innerHTML = 'v<sub>f</sub>';
      const prov = () => { const v = broj(u.i.value); if (v == null || Number.isNaN(v)) { por.className = 'os-por krivo'; por.textContent = 'Upiši broj.'; return; } const ok = Math.abs(v - F) < 0.6; u.i.disabled = b.disabled = true; povratna(por, ok, 'v<sub>f</sub> = ' + n + ' · ' + fmt(f, 2) + ' = ' + fmt(F, 1) + ' mm/min.'); sljedeci(ok ? 1 : 0); };
      b.addEventListener('click', prov); enterNa([u.i], prov);
      host.append(h('p', { html: `Zadano je <b>n = ${n} o/min</b> i posmak <b>f = ${fmt(f, 2)} mm</b> po okretaju. Kolikom se brzinom giba nož (v<sub>f</sub> u mm/min)?` }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, u.el), h('div', { class: 'os-gumbi' }, b), por)); u.i.focus({ preventScroll: true });
    },
    (host, sljedeci) => host.append(pitanjeMCQ('Uz <code>G96 S180</code> nož tokari promjer <b>60 mm</b>. Kolika je brzina vrtnje?', ['≈ 955 o/min', '≈ 3000 o/min', '180 o/min', '≈ 10 800 o/min'], 0, sljedeci)),
    (host, sljedeci) => host.append(pitanjeMCQ('Pri poprečnom tokarenju uz <code>G96</code> nož ide prema osi. Što se događa s brzinom vrtnje?', ['Raste — sve do vrijednosti LIMS.', 'Ostaje ista.', 'Smanjuje se.'], 0, sljedeci)),
    (host, sljedeci) => host.append(pitanjeMCQ('Čemu služi <code>LIMS</code>?', ['ograničava najveću brzinu vrtnje uz G96', 'ograničava posmak', 'zadaje brzinu rezanja', 'zaustavlja vreteno na kraju programa'], 0, sljedeci)),
    (host, sljedeci) => host.append(pitanjeMCQ('Posmak povećaš s <b>f = 0,1 mm</b> na <b>f = 0,3 mm</b>, a polumjer oštrice ostaje isti. Kakva je površina?', ['Grublja — visina neravnina raste s kvadratom posmaka (oko 9 puta).', 'Ista — površinu određuje samo brzina rezanja.', 'Finija.'], 0, sljedeci)),
  ], gotovo);
}
// ---- Programiranje: pojmovi
const PIT_PRO_T = [
  ['Kojim se slovom adrese programiraju pripremne funkcije?', ['A', 'G', 'F', 'M', 'S'], 1],
  ['Od čega se sastoji programska riječ?', ['samo od slova adrese', 'od više povezanih naredbi', 'od niza slova adresa', 'od slova adrese i vrijednosti'], 3],
  ['Koji NC blok odgovara uputi: „Idi posmakom za 20 mm u negativnom smjeru osi Z”?', ['<code>G91 G1 Z20</code>', '<code>G0 Z-20</code>', '<code>G90 G1 Z-20</code>', '<code>G91 G1 Z-20</code>'], 3],
  ['Pozovi nož T3 s korekcijom D1, uz stalnu brzinu rezanja 240 m/min i vrtnju vretena ulijevo.', ['<code>G97 S240 T3 D1 M4</code>', '<code>G96 S240 T3 D1 M4</code>', '<code>G96 F240 T3 D1 M3</code>', '<code>G96 S240 T3 D1 M5</code>'], 1],
  ['Programiraj posmak od 0,2 mm po okretaju.', ['<code>G94 F0.2</code>', '<code>G95 F0.2</code>', '<code>G95 S0.2</code>', '<code>G96 F0.2</code>'], 1],
  ['Što znači X40 u bloku <code>G90 G1 X40 Z-30</code> na tokarilici?', ['polumjer 40 mm', 'promjer 40 mm', 'put od 40 mm', 'brzinu rezanja'], 1],
  ['Što znači adresa S kad je aktivan <code>G96</code>?', ['brzinu vrtnje u o/min', 'brzinu rezanja u m/min', 'posmak', 'broj alata'], 1],
  ['Kojim se slovom adrese programiraju strojne (pomoćne) funkcije?', ['G', 'S', 'F', 'M', 'R'], 3],
  ['Gdje se na tokarilici najčešće postavlja nultočka obratka W?', ['na osi vretena, na završnom čelu obratka', 'na čelu vretena', 'na vrhu noža', 'na vrhu čeljusti'], 0],
  ['Koja ravnina vrijedi za uobičajeno tokarenje?', ['G17', 'G18', 'G19', 'G54'], 1],
  ['Koja tvrdnja <b>ne vrijedi</b> za cikluse?', ['Olakšavaju programiranje.', 'Štede memoriju.', 'Služe za cikličko ponavljanje iste obrade.', 'Razlikuju se od upravljanja do upravljanja.'], 2],
];
const PAROVI_T = [['G2', 'G3', 'luk u smjeru kazaljke na satu', 'luk suprotno od kazaljke na satu'], ['G90 Z-40', 'G91 Z-40', 'idi NA položaj Z−40', 'idi ZA 40 mm u smjeru −Z'], ['M3', 'M5', 'vreteno desno', 'stop vretena'], ['G96', 'G97', 'stalna brzina rezanja', 'stalna brzina vrtnje'], ['G41', 'G42', 'korekcija oštrice lijevo od konture', 'korekcija oštrice desno od konture']];
function korakPojmoviT(el, gotovo) {
  const zad = PIT_PRO_T.map(([p, o, t]) => (host, sljedeci) => host.append(pitanjeMCQ(p, o, t, sljedeci)));
  zad.push((host, sljedeci) => {
    const redovi = PAROVI_T.map(([a, b, ta, tb]) => { const zamj = Math.random() < 0.5; return { a, b, ta: zamj ? tb : ta, tb: zamj ? ta : tb, tocno: !zamj, odg: null }; });
    const tab = h('div', { class: 'os-tn-tab' });
    redovi.forEach((r, k) => {
      const g = h('div', { class: 'segment', role: 'group', 'aria-label': 'Tvrdnja ' + (k + 1) });
      ['točno', 'netočno'].forEach((t) => { const b = h('button', { type: 'button', 'aria-pressed': 'false', text: t }); b.addEventListener('click', () => { if (tab.zak) return; r.odg = t === 'točno'; $$('button', g).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }); g.append(b); });
      r.el = h('div', { class: 'os-tn-red' }, h('p', { html: `<code>${r.a}</code> — ${r.ta}; <code>${r.b}</code> — ${r.tb}` }), g); tab.append(r.el);
    });
    const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
    bp.addEventListener('click', () => {
      if (redovi.some((r) => r.odg === null)) { por.className = 'os-por krivo'; por.textContent = 'Odgovori na svih pet tvrdnji.'; return; }
      tab.zak = true; bp.disabled = true; let n = 0; redovi.forEach((r) => { const ok = r.odg === r.tocno; if (ok) n++; r.el.classList.add(ok ? 'ok' : 'ne'); });
      por.className = 'os-por ' + (n === 5 ? 'tocno' : 'krivo'); por.textContent = 'Točnih odgovora: ' + n + '/5.'; sljedeci(n);
    });
    host.append(h('p', { class: 'pit', html: 'Za svaki par odluči: je li tvrdnja <b>točna</b> ili <b>netočna</b>?' }), tab, bp, por);
  });
  korakNiz(el, zad, gotovo);
}
// ---- Programiranje: NC blokovi
function korakBlokoviT(el, gotovo) {
  korakNiz(el, [
    (host, sljedeci) => {
      const OZ = [['①', 'Blok'], ['②', 'Riječ'], ['③', 'Adresa'], ['④', 'Vrijednost']];
      const blok = h('div', { class: 'os-blok-test', html: '<span class="os-bt-cijeli" data-z="①"><span>N10 G18 </span><span class="os-bt-dio" data-z="②">G54</span><span> G90 </span><span class="os-bt-dio" data-z="③">F</span><span>0.2 S</span><span class="os-bt-dio" data-z="④">200</span><span> T1 D1 M4</span></span>' });
      const sel = OZ.map(([z]) => { const s = h('select', { 'aria-label': 'Pojam za oznaku ' + z }, h('option', { value: '', text: '— odaberi —' }), ...OZ.map(([, t]) => h('option', { value: t, text: t }))); return { z, s, el: h('label', { class: 'os-pridr' }, h('b', { text: z }), s) }; });
      const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
      bp.addEventListener('click', () => {
        if (sel.some((x) => !x.s.value)) { por.className = 'os-por krivo'; por.textContent = 'Pridruži pojam svakoj oznaci.'; return; }
        let n = 0; sel.forEach((x, k) => { const ok = x.s.value === OZ[k][1]; if (ok) n++; x.el.classList.add(ok ? 'ok' : 'ne'); x.s.disabled = true; }); bp.disabled = true;
        por.className = 'os-por ' + (n === 4 ? 'tocno' : 'krivo'); por.textContent = 'Točno pridruženo: ' + n + '/4. (① cijeli blok, ② riječ G54, ③ adresa F, ④ vrijednost 200)'; sljedeci(n);
      });
      host.append(h('p', { class: 'pit', text: 'Pridruži pojmove označenim dijelovima bloka:' }), blok, h('div', { class: 'os-pridr-r' }, ...sel.map((x) => x.el)), bp, por);
    },
    (host, sljedeci) => {
      const c = new Crtez({ x0: -46, x1: 10, y0: -4, y1: 32, sir: 420, oznaka: 'Uzdužni presjek: put noža od P1 do P2' });
      c.mreza(5); osVretena(c, -44, 8); profil(c, [[0, 25], [-42, 25]], null, true); c.W(0, 0, null, '');
      c.lin(2, 20, -30, 20, 'oc-putl'); c.strelica(c.X(-30), c.Y(20), PI, 10, 'oc-strf');
      c.tocka(2, 20, 5, 'oc-tk-s'); c.tocka(-30, 20, 5, 'oc-tk-s'); c.tekst(2, 20, 'P1', 'oc-txb', null, { dx: 6, dy: -8, a: 'start' }); c.tekst(-30, 20, 'P2', 'oc-txb', null, { dy: -8 });
      c.tekst(-15, 25, 'Ø50', 'oc-kt', null, { dy: -6 }); c.tekst(-30, 20, 'Ø40', 'oc-kt', null, { dx: -8, dy: 16, a: 'end' }); c.tekst(-30, 0, 'Z−30', 'oc-kt', null, { dy: 14 });
      host.append(pitanjeMCQ('Crtež pokazuje put noža od P1 (X40 Z2) do P2 posmakom. Koji je blok programiran (G90 je aktivan)?', ['<code>G1 Z-30 F0.2</code>', '<code>G0 Z-30</code>', '<code>G1 X-30 F0.2</code>', '<code>G1 X20 Z-30 F0.2</code>'], 0, sljedeci, slika(c.svg, 'Mreža 5 mm')));
    },
    (host, sljedeci) => {
      const cr = crtezRavninaT(); cr.odaberi(null);
      const OZN = { A: 'G18', B: 'G17', C: 'G19' };
      const lab = (k) => { const [x, y] = cr.P(...cr.centri[OZN[k]]); const e = sv('text', { x, y: y + 6, class: 'oc-ravan-oz', 'text-anchor': 'middle' }, cr.svg); e.textContent = k; };
      ['A', 'B', 'C'].forEach(lab);
      const sel = ['A', 'B', 'C'].map((k) => { const s = h('select', { 'aria-label': 'Naredba za ravninu ' + k }, h('option', { value: '', text: '— odaberi —' }), ...['G17', 'G18', 'G19'].map((g) => h('option', { value: g, text: g }))); return { k, s, el: h('label', { class: 'os-pridr' }, h('b', { text: k }), s) }; });
      const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
      bp.addEventListener('click', () => { if (sel.some((x) => !x.s.value)) { por.className = 'os-por krivo'; por.textContent = 'Pridruži naredbu svakoj ravnini.'; return; } let n = 0; sel.forEach((x) => { const ok = x.s.value === OZN[x.k]; if (ok) n++; x.el.classList.add(ok ? 'ok' : 'ne'); x.s.disabled = true; }); bp.disabled = true; por.className = 'os-por ' + (n === 3 ? 'tocno' : 'krivo'); por.textContent = 'Točno: ' + n + '/3 (A = G18, B = G17, C = G19).'; sljedeci(n); });
      host.append(dva(h('div', null, h('p', { class: 'pit', text: 'Pridruži odgovarajuću naredbu trima ravninama (osi su prikazane lijevo od valjka):' }), h('div', { class: 'os-pridr-r' }, ...sel.map((x) => x.el)), bp, por), slika(cr.svg)));
    },
    (host, sljedeci) => {
      const red = ['G18 G54 G90 G95', 'T1 D1', 'G96 S320 LIMS=3000 M4 M8', 'G0 X32 Z0', 'G1 X-0.8 F0.1'];
      const s = slagalica(izmijesaj(red), ['N10', 'N20', 'N30', 'N40', 'N50'], red);
      const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
      bp.addEventListener('click', () => { if (!s.puno()) { por.className = 'os-por krivo'; por.textContent = 'Popuni svih pet blokova.'; return; } const n = s.provjeri(); bp.disabled = true; por.className = 'os-por ' + (n === 5 ? 'tocno' : 'krivo'); por.textContent = 'Na pravom mjestu: ' + n + '/5.'; sljedeci(n); });
      host.append(h('p', { class: 'pit', text: 'Složi blokove za poravnavanje čela u smislen redoslijed:' }), s, bp, por);
    },
    (host, sljedeci) => {
      const red = ['N', 'G', 'F', 'S', 'T', 'D', 'M'];
      const s = slagalica(izmijesaj(red), red.map((_, k) => String(k + 1) + '.'), red);
      const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
      bp.addEventListener('click', () => { if (!s.puno()) { por.className = 'os-por krivo'; por.textContent = 'Rasporedi svih sedam adresa.'; return; } const n = s.provjeri(); bp.disabled = true; por.className = 'os-por ' + (n === 7 ? 'tocno' : 'krivo'); por.textContent = 'Na pravom mjestu: ' + n + '/7 (N, G, F, S, T, D, M).'; sljedeci(n); });
      host.append(h('p', { class: 'pit', text: 'Rasporedi slova adresa redom kojim se pišu u bloku prema DIN 66025:' }), s, bp, por);
    },
  ], gotovo);
}
// ---- Programiranje: G2/G3 općenito (zaobljenje R5 na Ø60)
function korakG23opceT(el, gotovo) {
  const c = new Crtez({ x0: -24, x1: 10, y0: -4, y1: 36, sir: 440, oznaka: 'Zaobljenje polumjera 5 mm od točke A na Ø50 do Ø60' });
  c.mreza(5); osVretena(c, -22, 8);
  const luk = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * PI / 2; luk.push([-5 + 5 * Math.cos(a), 25 + 5 * Math.sin(a)]); }
  profil(c, [[0, 25], ...luk, [-22, 30]], null, true); c.W(0, 0, null, '');
  c.poli(luk, 'oc-putl'); c.strelica(c.X(-5), c.Y(30), PI, 10, 'oc-strf');
  c.tocka(0, 25, 5, 'oc-tk-s'); c.tekst(0, 25, 'A', 'oc-txb', null, { dx: 10, dy: 4, a: 'start' }); c.tocka(-5, 25, 3, 'oc-tk-s');
  c.lin(-5, 25, -5 + 5 * Math.cos(2.3), 25 + 5 * Math.sin(2.3), 'oc-tn'); c.tekst(-8.5, 27, 'R5', 'oc-kt', null, { a: 'end' });
  c.tekst(-14, 30, 'Ø60', 'oc-kt', null, { dy: -6 }); c.tekst(4, 12.5, 'Ø50', 'oc-kt', null, { a: 'start' }); c.tekst(-5, 0, 'Z−5', 'oc-kt', null, { dy: 14 });
  const TV = [
    ['Luk se programira naredbom G3.', true], ['Luk se programira naredbom G2.', false], ['Krajnja točka je X60 Z−5.', true], ['Krajnja točka je X30 Z−5.', false], ['X krajnje točke upisuje se kao promjer.', true],
    ['I = 0', true], ['K = −5', true], ['I = 5', false], ['K = 5', false], ['Središte je 5 mm lijevo od točke A (u smjeru −Z).', true],
  ];
  const grupa = (od, do_) => { const g = h('div', { class: 'os-tvrdnje' }); TV.slice(od, do_).forEach(([t], k) => { const b = h('button', { type: 'button', class: 'os-tvrdnja', 'aria-pressed': 'false', 'data-k': od + k, html: t }); b.addEventListener('click', () => { if (g.closest('.os-g23').zak) return; b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); }); g.append(b); }); return g; };
  const omot = h('div', { class: 'os-g23' });
  const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
  omot.append(h('p', { class: 'pit', text: 'Nož je u točki A (X50 Z0). Klikni točne tvrdnje o smjeru gibanja i krajnjoj točki:' }), grupa(0, 5), h('p', { class: 'pit', text: 'Klikni točne tvrdnje o središtu (I, K inkrementalno od A, I u polumjeru):' }), grupa(5, 10), bp, por);
  bp.addEventListener('click', () => { omot.zak = true; bp.disabled = true; let n = 0; $$('.os-tvrdnja', omot).forEach((b) => { const k = +b.dataset.k, odab = b.getAttribute('aria-pressed') === 'true', ok = odab === TV[k][1]; if (ok) n++; b.classList.add(TV[k][1] ? 'jest' : 'nije'); if (!ok) b.classList.add('promasaj'); }); por.className = 'os-por ' + (n === 10 ? 'tocno' : 'krivo'); por.textContent = 'Točno procijenjenih tvrdnji: ' + n + '/10. Zeleno su točne tvrdnje (G3 X60 Z-5 I0 K-5).'; gotovo(n); });
  el.append(dva(omot, slika(c.svg, 'Mreža 5 mm. Središte luka je na Ø50, Z−5.')));
}
// ---- Programiranje: G2/G3 posebno — [G, krajX, krajZ, I, K, početakX, početakZ, vrsta]
const LUKOVI_T = [
  [3, 30, -5, 0, -5, 20, 0, 'q'], [2, 40, -25, 5, 0, 30, -20, 'q'], [3, 60, -40, 0, -10, 40, -30, 'q'], [2, 40, -20, 10, 0, 20, -10, 'q'], [3, 40, -20, 0, -20, 0, 0, 'q'],
  [2, 50, -35, 0, -10, 50, -15, 'p'], [3, 30, -30, 0, -10, 30, -10, 'p'],
];
function crtezLukaT(L) {
  const [g, ex, ez, I, K, sx, sz] = L, sr = sx / 2, er = ex / 2, cz = sz + K, cr = sr + I, r = Math.hypot(I, K);
  const z0 = Math.min(sz, ez, cz - r) - 8, z1 = Math.max(sz, ez, cz + r, 0) + 8, y1 = Math.max(sr, er, cr + r) + 8;
  const c = new Crtez({ x0: z0, x1: z1, y0: -4, y1, sir: 440, oznaka: 'Luk na obratku: materijal, početna točka, smjer i središte' });
  c.mreza(5); osVretena(c, z0 + 1, z1 - 1); c.W(0, 0, null, '');
  const a0 = Math.atan2(sr - cr, sz - cz); let a1 = Math.atan2(er - cr, ez - cz), d = a1 - a0;
  if (g === 2) { while (d >= 0) d -= 2 * PI; } else { while (d <= 0) d += 2 * PI; }
  const t = []; for (let i = 0; i <= 48; i++) { const a = a0 + d * i / 48; t.push([cz + r * Math.cos(a), cr + r * Math.sin(a)]); }
  c.poli([[sz, 0], ...t, [ez, 0]], 'oc-materijal', null, true);
  c.poli(t, 'oc-putl'); const ak = a1, tz = -Math.sin(ak) * Math.sign(d), tr = Math.cos(ak) * Math.sign(d);
  c.strelica(c.X(ez), c.Y(er), Math.atan2(-tr, tz), 10, 'oc-strf');
  c.tocka(sz, sr, 5, 'oc-tk-s'); c.tekst(sz, sr, 'početak X' + nc(sx) + ' Z' + nc(sz), 'oc-txb', null, { dx: 8, dy: sr > 2 ? 16 : -8, a: 'start' });
  c.tocka(ez, er, 5, 'oc-tk-s'); c.tekst(ez, er, 'cilj', 'oc-txb', null, { dx: -8, dy: -8, a: 'end' });
  c.tocka(cz, cr, 3, 'oc-tk-s'); c.lin(cz, cr, cz + r * Math.cos(a0 + d / 2), cr + r * Math.sin(a0 + d / 2), 'oc-tn');
  c.tekst(cz + r * 0.5 * Math.cos(a0 + d / 2), cr + r * 0.5 * Math.sin(a0 + d / 2), 'R' + fmt(r), 'oc-kt', null, { dx: 6, a: 'start' });
  return c;
}
function korakG23posebnoT(el, gotovo) {
  const q = izmijesaj(LUKOVI_T.filter((l) => l[7] === 'q')).slice(0, 3), p = izmijesaj(LUKOVI_T.filter((l) => l[7] === 'p')).slice(0, 1);
  korakNiz(el, [...q, ...p].map((L) => (host, sljedeci) => {
    const c = crtezLukaT(L);
    const sG = h('select', { 'aria-label': 'Smjer luka' }, h('option', { value: '', text: 'G?' }), h('option', { value: '2', text: 'G2' }), h('option', { value: '3', text: 'G3' }));
    const x = ulaz('X', 'Ø abs'), z = ulaz('Z', 'abs'), ii = ulaz('I', 'inc (r)'), kk = ulaz('K', 'inc');
    const por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => {
      if (!sG.value || [x, z, ii, kk].some((u) => u.i.value.trim() === '')) { por.className = 'os-por krivo'; por.textContent = 'Odaberi G2 ili G3 i upiši X, Z, I i K.'; return; }
      const okG = +sG.value === L[0], okK = jednako(x.i.value, L[1]) && jednako(z.i.value, L[2]) && jednako(ii.i.value, L[3]) && jednako(kk.i.value, L[4]);
      [sG, x.i, z.i, ii.i, kk.i, b].forEach((e) => { e.disabled = true; });
      povratna(por, okG && okK, 'Rješenje: <code>G' + L[0] + ' X' + nc(L[1]) + ' Z' + nc(L[2]) + ' I' + nc(L[3]) + ' K' + nc(L[4]) + '</code>' + (okG ? '' : ' — provjeri smjer luka.')); sljedeci((okG ? 1 : 0) + (okK ? 1 : 0));
    };
    b.addEventListener('click', prov); enterNa([x.i, z.i, ii.i, kk.i], prov);
    host.append(dva(h('div', null, h('p', { class: 'pit', html: (L[7] === 'p' ? 'Programiraj <b>polukrug</b>.' : 'Programiraj <b>četvrtinu kruga</b>.') + ' Ispunjeno je materijal; strelica pokazuje smjer gibanja noža. Mreža je 5 mm; X krajnje točke je promjer, I je u polumjeru.' }),
      h('div', { class: 'os-unos' }, h('div', { class: 'os-polja os-polja-g' }, h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: 'G' }), sG), x.el, z.el, ii.el, kk.el), h('div', { class: 'os-gumbi' }, b), por)), slika(c.svg)));
  }), gotovo);
}

const KORACI_TESTA = [
  { dio: 'geo', naslov: 'Geometrija — položaji', max: 5, fn: korakPolozajiT },
  { dio: 'geo', naslov: 'Geometrija — pravci', max: 3, fn: korakPravciT },
  { dio: 'teh', naslov: 'Tehnologija — brzina vrtnje', max: 3, fn: korakBrzinaT },
  { dio: 'teh', naslov: 'Tehnologija — brzina rezanja i posmak', max: 5, fn: korakPosmakT },
  { dio: 'pro', naslov: 'Programiranje — pojmovi', max: 16, fn: korakPojmoviT },
  { dio: 'pro', naslov: 'Programiranje — NC blokovi', max: 20, fn: korakBlokoviT },
  { dio: 'pro', naslov: 'Programiranje — G2/G3 općenito', max: 10, fn: korakG23opceT },
  { dio: 'pro', naslov: 'Programiranje — G2/G3 posebno', max: 8, fn: korakG23posebnoT },
];

tema('test', 'Test', 'korijen', [(box, api) => {
  const glava = h('div', { class: 'os-test-glava' }), tijelo = h('div', { class: 'os-test-tijelo' });
  box.append(glava, tijelo);
  const sat = h('span', { class: 'os-sat', 'aria-live': 'off' });
  const pocetak = () => {
    prekiniTest(); glava.innerHTML = ''; tijelo.innerHTML = ''; api.brojac('');
    const prije = STANJE.test ? h('p', { class: 'os-razina dobro', text: 'Test si već riješio/la s rezultatom ' + STANJE.test.rez + ' % (' + STANJE.test.datum + '). Možeš ga ponoviti.' }) : null;
    const b = h('button', { type: 'button', class: 'gumb', text: 'Započni test' });
    b.addEventListener('click', start);
    tijelo.append(tekst(`<p>Test provjerava sve tri skupine. Za svaki dio mjeri se vrijeme; zadano vrijeme je orijentacijsko i ne utječe na bodove.</p>
      <table class="os-tab"><thead><tr><th>Dio</th><th>Zadaci</th><th>Zadano vrijeme</th></tr></thead><tbody>
      <tr><td>Geometrija</td><td>položaji točaka (X kao promjer), pravci (abs/inc)</td><td>${DIJELOVI.geo.zadano / 60} min</td></tr>
      <tr><td>Tehnologija</td><td>brzina vrtnje, brzina rezanja, posmak</td><td>${DIJELOVI.teh.zadano / 60} min</td></tr>
      <tr><td>Programiranje</td><td>pojmovi, NC blokovi, G2/G3 općenito i posebno</td><td>${DIJELOVI.pro.zadano / 60} min</td></tr></tbody></table>
      <div class="okvir pazi"><h4>Važno</h4><p>Ako tijekom testa odabereš drugu temu u izborniku, pitat ću te želiš li prekinuti test — upisani odgovori tada se gube.</p></div>`), prije || '', h('div', { class: 'os-gumbi' }, b));
  };
  const start = () => {
    TEST.aktivan = true; TEST.i = 0; TEST.bod = {}; TEST.vrijeme = { geo: 0, teh: 0, pro: 0 }; E.nav.hidden = true;
    clearInterval(TEST.timer);
    TEST.timer = setInterval(() => { const k = KORACI_TESTA[TEST.i]; if (!k || !TEST.aktivan) return; TEST.vrijeme[k.dio]++; osvjSat(); }, 1000);
    naCiscenje(() => clearInterval(TEST.timer));
    korak();
  };
  const osvjSat = () => { const k = KORACI_TESTA[TEST.i]; if (!k) return; const v = TEST.vrijeme[k.dio], z = DIJELOVI[k.dio].zadano; sat.textContent = DIJELOVI[k.dio].naziv + ' · ' + mmss(v) + ' / ' + mmss(z); sat.classList.toggle('preko', v > z); };
  const korak = () => {
    const k = KORACI_TESTA[TEST.i]; glava.innerHTML = ''; tijelo.innerHTML = '';
    api.brojac('korak ' + (TEST.i + 1) + '/' + KORACI_TESTA.length);
    glava.append(h('h3', { text: k.naslov }), sat); osvjSat();
    const dalje = h('button', { type: 'button', class: 'gumb', hidden: true, text: TEST.i < KORACI_TESTA.length - 1 ? 'Dalje: ' + KORACI_TESTA[TEST.i + 1].naslov : 'Na vrednovanje' });
    dalje.addEventListener('click', () => { TEST.i++; if (TEST.i >= KORACI_TESTA.length) vrednovanje(); else { korak(); box.closest('.os-rad')?.scrollIntoView({ block: 'start', behavior: MANJE_GIBANJA ? 'auto' : 'smooth' }); } });
    const host = h('div');
    tijelo.append(host, h('div', { class: 'os-test-dalje' }, dalje));
    k.fn(host, (b) => { TEST.bod[TEST.i] = Math.min(k.max, b); dalje.hidden = false; dalje.focus({ preventScroll: true }); });
  };
  const vrednovanje = () => {
    prekiniTest(); glava.innerHTML = ''; tijelo.innerHTML = ''; api.brojac('vrednovanje');
    const rez = {}; for (const d of Object.keys(DIJELOVI)) { let b = 0, m = 0; KORACI_TESTA.forEach((k, i) => { if (k.dio === d) { b += TEST.bod[i] || 0; m += k.max; } }); rez[d] = Math.round(b / m * 100); }
    const uk = Math.round((rez.geo + rez.teh + rez.pro) / 3), ukV = TEST.vrijeme.geo + TEST.vrijeme.teh + TEST.vrijeme.pro, ukZ = DIJELOVI.geo.zadano + DIJELOVI.teh.zadano + DIJELOVI.pro.zadano;
    const datum = new Date().toLocaleDateString('hr-HR');
    STANJE.test = { rez: uk, datum }; STANJE.gotovo.test = true; spremi(); api.osvjezi();
    glava.append(h('h3', { text: 'Vrednovanje' }));
    const red = (d) => `<tr><td>${DIJELOVI[d].naziv}</td><td>${mmss(DIJELOVI[d].zadano)}</td><td>${mmss(TEST.vrijeme[d])}</td><td><b>${rez[d]} %</b></td></tr>`;
    const ime = h('input', { type: 'text', autocomplete: 'name', 'aria-label': 'Ime i prezime za potvrdu', placeholder: 'Ime i prezime' });
    const bP = h('button', { type: 'button', class: 'gumb', text: 'Izradi potvrdu' }), bIsp = h('button', { type: 'button', class: 'gumb tanki', text: 'Ispiši potvrdu', hidden: true }), bPon = h('button', { type: 'button', class: 'gumb tanki', text: 'Ponovi test' });
    const potvrda = h('div', { class: 'os-potvrda', hidden: true });
    const por = h('p', { class: 'os-por' });
    bP.addEventListener('click', () => {
      const t = ime.value.trim(); if (!t) { por.className = 'os-por krivo'; por.textContent = 'Upiši ime za potvrdu.'; ime.focus(); return; } por.textContent = '';
      potvrda.innerHTML = ''; potvrda.append(h('p', { class: 'os-pt-n', text: 'POTVRDA' }), h('p', { class: 'os-pt-ime', text: t }), h('p', { class: 'os-pt-t', html: `riješio/la je test <b>»Osnove CNC tokarenja«</b> dana ${datum}<br>s ukupnim rezultatom <b>${uk} %</b>.` }),
        h('table', { class: 'os-tab', html: `<tbody><tr><td>Geometrija</td><td>${rez.geo} %</td></tr><tr><td>Tehnologija</td><td>${rez.teh} %</td></tr><tr><td>Programiranje</td><td>${rez.pro} %</td></tr></tbody>` }),
        h('p', { class: 'os-pt-pot', text: 'ForTroniQ d.o.o. — digitalni obrazovni sadržaji' }));
      potvrda.hidden = false; bIsp.hidden = false; bIsp.focus({ preventScroll: true });
      let isp = document.getElementById('os-ispis'); if (!isp) { isp = h('div', { id: 'os-ispis', 'aria-hidden': 'true' }); document.body.append(isp); }
      isp.innerHTML = ''; isp.append(potvrda.cloneNode(true)); isp.firstChild.hidden = false;
    });
    bIsp.addEventListener('click', () => window.print());
    bPon.addEventListener('click', pocetak);
    tijelo.append(h('div', { class: 'tablica-omot' }, h('table', { class: 'os-tab os-vred', html: `<thead><tr><th>Dio</th><th>Zadano vrijeme</th><th>Utrošeno vrijeme</th><th>Rezultat</th></tr></thead><tbody>${red('geo')}${red('teh')}${red('pro')}<tr class="uk"><td>Ukupno</td><td>${mmss(ukZ)}</td><td>${mmss(ukV)}</td><td><b>${uk} %</b></td></tr></tbody>` })),
      h('p', { class: 'pom', text: 'Ukupni rezultat je prosjek triju dijelova. Vrijeme se prikazuje u minutama i sekundama.' }),
      h('div', { class: 'os-unos os-potvrda-unos' }, h('div', { class: 'os-unos-h' }, h('span', { text: 'Potvrda' })), h('label', { class: 'os-polje os-polje-ime' }, h('span', { class: 'os-adr', text: 'Ime' }), ime), h('div', { class: 'os-gumbi' }, bP, bIsp, bPon), por), potvrda);
    ime.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); bP.click(); } });
  };
  pocetak();
}]);

// ================================================================= LJUSKA: izbornik, kretanje, dijalog
const SKUP_NAZIV = { korijen: 'Osnove tokarenja', skupina: '', geo: 'Geometrija', teh: 'Tehnologija', pro: 'Programiranje' };
const E = {};
let TREN = { t: null, s: 0 };
function oznaciGotovo(id) { if (STANJE.gotovo[id]) return; STANJE.gotovo[id] = true; spremi(); osvjeziKvacice(); }
function osvjeziKvacice() {
  let n = 0;
  $$('button[data-id]', E.teme).forEach((b) => { const g = !!STANJE.gotovo[b.dataset.id]; if (g) n++; b.querySelector('.os-kv').textContent = g ? '✓' : ''; b.classList.toggle('gotov', g); b.setAttribute('aria-label', b.dataset.naziv + (g ? ' (završeno)' : '')); });
  E.nap.textContent = n + '/' + TEME.length;
}
function izgradiIzbornik() {
  const gumb = (t) => { const b = h('button', { type: 'button', class: 'os-tb', 'data-id': t.id, 'data-naziv': t.naziv }, h('span', { class: 'os-kv', 'aria-hidden': 'true' }), h('span', { class: 'os-tn', text: t.naziv })); b.addEventListener('click', () => { idi(t.id); if (matchMedia('(max-width: 980px)').matches) { E.izb.classList.remove('otvoren'); E.izbG.setAttribute('aria-expanded', 'false'); } }); return b; };
  const korijen = TEME.find((t) => t.id === 'osnove');
  const unutra = h('ol');
  let podlista = null;
  for (const t of TEME) {
    if (t.id === 'osnove') continue;
    if (t.skup === 'skupina') { podlista = h('ol'); unutra.append(h('li', { class: 'os-skupina' }, gumb(t), podlista)); }
    else if (t.skup === 'korijen') { podlista = null; unutra.append(h('li', null, gumb(t))); }
    else (podlista || unutra).append(h('li', null, gumb(t)));
  }
  E.teme.innerHTML = ''; E.teme.append(h('li', { class: 'os-korijen' }, gumb(korijen), unutra));
  osvjeziKvacice();
}
function pitajPrekid(da) {
  const stari = document.activeElement;
  const ne = h('button', { type: 'button', class: 'gumb', text: 'Ne, nastavi test' }), bDa = h('button', { type: 'button', class: 'gumb tanki', text: 'Da, prekini test' });
  const dlg = h('div', { class: 'os-dijalog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'os-dlg-n' }, h('div', { class: 'os-dlg-k' }, h('h3', { id: 'os-dlg-n', text: 'Prekinuti test?' }), h('p', { text: 'Ako sada prekineš test, svi upisani odgovori se gube. Želiš li zaista prekinuti test?' }), h('div', { class: 'os-gumbi' }, ne, bDa)));
  const zatvori = () => { dlg.remove(); document.removeEventListener('keydown', tip, true); if (stari && stari.focus) stari.focus({ preventScroll: true }); };
  const tip = (e) => { if (e.key === 'Escape') { e.preventDefault(); zatvori(); } if (e.key === 'Tab') { const f = [ne, bDa]; const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + 1) % 2].focus(); } };
  ne.addEventListener('click', zatvori); bDa.addEventListener('click', () => { zatvori(); da(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) zatvori(); });
  document.addEventListener('keydown', tip, true);
  document.body.append(dlg); ne.focus();
}
function idi(id, s = 0, zadnja) {
  if (TEST.aktivan && id === 'test' && TREN.t && TREN.t.id === 'test') return;
  if (TEST.aktivan && id !== 'test') { pitajPrekid(() => { prekiniTest(); prikazi(id, s, zadnja); }); return; }
  prikazi(id, s, zadnja);
}
function prikazi(id, s = 0, zadnja) {
  const t = TEME.find((x) => x.id === id) || TEME[0];
  if (zadnja) s = t.stranice.length - 1;
  s = Math.max(0, Math.min(s, t.stranice.length - 1));
  const ista = TREN.t === t && TREN.s === s;
  ocisti(); vrtiOcisti();
  TREN = { t, s };
  $$('button[data-id]', E.teme).forEach((b) => { if (b.dataset.id === t.id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  E.skup.textContent = t.skup === 'skupina' ? 'Skupina' : SKUP_NAZIV[t.skup];
  E.naslov.textContent = t.naziv;
  const vise = t.stranice.length > 1;
  E.str.textContent = vise ? (s + 1) + '/' + t.stranice.length : ''; E.str.hidden = !vise;
  E.sadrzaj.innerHTML = '';
  const api = { gotovo: () => oznaciGotovo(t.id), idi: (x) => idi(x), osvjezi: osvjeziKvacice, brojac: (txt) => { E.str.hidden = !txt; E.str.textContent = txt; } };
  try { t.stranice[s](E.sadrzaj, api); } catch (e) { console.error(e); E.sadrzaj.append(h('p', { class: 'os-razina los', text: 'Greška pri prikazu stranice.' })); }
  const i = TEME.indexOf(t), sl = TEME[i + 1], pr = TEME[i - 1];
  E.natrag.disabled = s === 0 && !pr;
  E.natrag.textContent = s > 0 ? '← Natrag' : pr ? '← ' + pr.naziv : '← Natrag';
  E.dalje.disabled = s === t.stranice.length - 1 && !sl;
  E.dalje.textContent = s < t.stranice.length - 1 ? 'Dalje →' : sl ? 'Dalje: ' + sl.naziv + ' →' : 'Kraj';
  if (t.auto && s === t.stranice.length - 1) oznaciGotovo(t.id);
  try { history.replaceState(null, '', '#' + t.id + (s ? '-' + (s + 1) : '')); } catch (e) { /* ništa */ }
  if (!ista && E.prvi === false) { const r = E.rad.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.6) E.rad.scrollIntoView({ block: 'start', behavior: MANJE_GIBANJA ? 'auto' : 'smooth' }); }
  E.prvi = false;
}
function init() {
  Object.assign(E, { teme: $('#os-teme'), naslov: $('#os-naslov'), skup: $('#os-skup'), str: $('#os-str'), sadrzaj: $('#os-sadrzaj'), natrag: $('#os-natrag'), dalje: $('#os-dalje'), nap: $('#os-napredak'), izb: $('#os-izbornik'), izbG: $('#os-izb-gumb'), rad: $('#os-rad'), nav: $('.os-nav'), prvi: true });
  if (!E.teme || !E.sadrzaj) return;
  izgradiIzbornik();
  E.natrag.addEventListener('click', () => { const { t, s } = TREN; if (s > 0) idi(t.id, s - 1); else { const pr = TEME[TEME.indexOf(t) - 1]; if (pr) idi(pr.id, 0, true); } });
  E.dalje.addEventListener('click', () => { const { t, s } = TREN; if (s < t.stranice.length - 1) idi(t.id, s + 1); else { const sl = TEME[TEME.indexOf(t) + 1]; if (sl) idi(sl.id, 0); } });
  E.izbG.addEventListener('click', () => { const o = E.izb.classList.toggle('otvoren'); E.izbG.setAttribute('aria-expanded', String(o)); });
  addEventListener('beforeunload', (e) => { if (TEST.aktivan) { e.preventDefault(); e.returnValue = ''; } });
  const izHasha = () => { const m = (location.hash || '').slice(1).match(/^([a-z-]+?)(?:-(\d+))?$/); const t = m && TEME.find((x) => x.id === m[1]); return t ? [t.id, m[2] ? +m[2] - 1 : 0] : null; };
  addEventListener('hashchange', () => { const z = izHasha(); if (z && !(TREN.t && TREN.t.id === z[0] && TREN.s === z[1])) idi(z[0], z[1]); });
  const z = izHasha();
  prikazi(z ? z[0] : 'osnove', z ? z[1] : 0);
}
init();
