// osnove.js — „Osnove CNC-a” (DOS ForTroniQ, područje CNC glodanje — SINUMERIK 840D)
// ES modul bez ovisnosti. Sav sadržaj, crteži (inline SVG) i logika vježbi i testa.
// Redoslijed tema i vrijednosti u vježbama slijede izvorni tečaj; tekst i crteži su naši.

const KLJUC = 'ftq-cnc-840d-osnove';
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

// ---------------------------------------------------------------- 2D simulacija glodanja: nacrt (XZ) iznad tlocrta (XY)
// o: {x:[a,b], y:[a,b], z:[a,b], ob:{x0,x1,y0,y1,z0,z1}, R, sir, oznaka}
class Sim2D {
  constructor(o) {
    this.o = o; const sir = o.sir || 600, m = 26;
    const kx = (sir - 2 * m) / (o.x[1] - o.x[0]);
    this.k = kx;
    this.hN = (o.z[1] - o.z[0]) * kx; this.hT = (o.y[1] - o.y[0]) * kx;
    const H = Math.round(m + this.hN + 34 + this.hT + m);
    this.svg = sv('svg', { viewBox: `0 0 ${sir} ${H}`, class: 'os-svg os-sim', role: 'img', 'aria-label': o.oznaka || 'Nacrt i tlocrt obratka s alatom' });
    this.m = m; this.yT0 = m + this.hN + 34; // gornji rub tlocrta
    const X = (x) => r1(m + (x - o.x[0]) * kx), ZN = (z) => r1(m + (o.z[1] - z) * kx), YT = (y) => r1(this.yT0 + (o.y[1] - y) * kx);
    this.X = X; this.ZN = ZN; this.YT = YT;
    const t1 = sv('text', { x: m, y: m - 8, class: 'oc-txs', 'text-anchor': 'start' }, this.svg); t1.textContent = 'Nacrt (X–Z)';
    const t2 = sv('text', { x: m, y: this.yT0 - 8, class: 'oc-txs', 'text-anchor': 'start' }, this.svg); t2.textContent = 'Tlocrt (X–Y)';
    const ob = o.ob;
    sv('rect', { x: X(ob.x0), y: ZN(ob.z1), width: r1((ob.x1 - ob.x0) * kx), height: r1((ob.z1 - ob.z0) * kx), class: 'oc-ob' }, this.svg);
    sv('rect', { x: X(ob.x0), y: YT(ob.y1), width: r1((ob.x1 - ob.x0) * kx), height: r1((ob.y1 - ob.y0) * kx), class: 'oc-ob' }, this.svg);
    this.gTragN = sv('g', { class: 'oc-trag' }, this.svg); this.gTragT = sv('g', { class: 'oc-trag' }, this.svg);
    this.gPut = sv('g', null, this.svg);
    // W u tlocrtu i nacrtu
    this.wT = sv('g', null, this.svg);
    const wNac = sv('line', { x1: X(o.x[0]), y1: ZN(0), x2: X(o.x[1]), y2: ZN(0), class: 'oc-tn oc-crt' }, this.svg); wNac.setAttribute('stroke-dasharray', '4 4');
    const tz = sv('text', { x: X(o.x[1]) - 2, y: ZN(0) - 4, class: 'oc-txs', 'text-anchor': 'end' }, this.svg); tz.textContent = 'Z0';
    // alat
    this.gAlatN = sv('g', { class: 'oc-alat-g' }, this.svg);
    this.alatN = sv('rect', { class: 'oc-alat' }, this.gAlatN);
    this.drzacN = sv('rect', { class: 'oc-drzac' }, this.gAlatN);
    this.gAlatT = sv('g', { class: 'oc-alat-g' }, this.svg);
    this.alatT = sv('circle', { class: 'oc-alat' }, this.gAlatT);
    this.krizT = sv('path', { class: 'oc-tn' }, this.gAlatT);
    this.rash = sv('g', { class: 'oc-rash', opacity: 0 }, this.svg);
    for (let i = 0; i < 4; i++) sv('line', { class: 'oc-voda' }, this.rash);
    this.status = sv('text', { x: sir - m, y: m - 8, class: 'oc-txs', 'text-anchor': 'end' }, this.svg);
    this.R = o.R || 5; this.Lalat = o.L || 30;
    this.poz = Object.assign({ x: o.start?.x ?? o.x[1] - 10, y: o.start?.y ?? o.y[1] - 10, z: o.start?.z ?? o.z[1] - 10 }, {});
    this.sakrij = !!o.sakrijAlat;
    this.crtajAlat();
    this.stani = null;
  }
  postaviAlat(R, L) { this.R = R; this.Lalat = L || this.Lalat; this.crtajAlat(); }
  crtajAlat() {
    const { X, ZN, YT, k } = this, p = this.poz, R = this.R;
    this.gAlatN.style.display = this.gAlatT.style.display = this.sakrij ? 'none' : '';
    this.alatN.setAttribute('x', r1(X(p.x - R))); this.alatN.setAttribute('y', r1(ZN(p.z + this.Lalat)));
    this.alatN.setAttribute('width', r1(2 * R * k)); this.alatN.setAttribute('height', r1(this.Lalat * k));
    this.drzacN.setAttribute('x', r1(X(p.x - R * 1.6 - 3))); this.drzacN.setAttribute('y', r1(ZN(p.z + this.Lalat + 14)));
    this.drzacN.setAttribute('width', r1((2 * R * 1.6 + 6) * k)); this.drzacN.setAttribute('height', r1(14 * k));
    this.alatT.setAttribute('cx', X(p.x)); this.alatT.setAttribute('cy', YT(p.y)); this.alatT.setAttribute('r', r1(R * k));
    const cx = X(p.x), cy = YT(p.y);
    this.krizT.setAttribute('d', `M${cx - 5} ${cy}L${cx + 5} ${cy}M${cx} ${cy - 5}L${cx} ${cy + 5}`);
    const ls = this.rash.querySelectorAll('line');
    ls.forEach((l, i) => { const xx = X(p.x - R - 6 + (i % 2) * (2 * R + 12)), y1 = ZN(p.z + 8 + i * 3); l.setAttribute('x1', xx); l.setAttribute('y1', y1); l.setAttribute('x2', xx + (i % 2 ? -5 : 5)); l.setAttribute('y2', y1 + 12); });
  }
  postaviStatus(t) { this.status.textContent = t; }
  hladenje(da) { this.rash.setAttribute('opacity', da ? 1 : 0); }
  ocistiTrag() { this.gTragN.innerHTML = ''; this.gTragT.innerHTML = ''; this.gPut.innerHTML = ''; }
  tragRez(a, b) { // trag rezanja ako je vrh alata ispod gornje plohe obratka
    const ob = this.o.ob, { X, ZN, YT, k } = this, R = this.R;
    const zmin = Math.min(a.z, b.z); if (zmin >= ob.z1 - 1e-6) return;
    const unutra = (p) => p.x + R > ob.x0 && p.x - R < ob.x1 && p.y + R > ob.y0 && p.y - R < ob.y1;
    if (!unutra(a) && !unutra(b)) return;
    sv('line', { x1: X(a.x), y1: YT(a.y), x2: X(b.x), y2: YT(b.y), class: 'oc-rez', 'stroke-width': r1(2 * R * k) }, this.gTragT);
    const xa = Math.max(ob.x0, Math.min(a.x, b.x) - R), xb = Math.min(ob.x1, Math.max(a.x, b.x) + R);
    if (xb > xa) sv('rect', { x: X(xa), y: ZN(ob.z1), width: r1((xb - xa) * k), height: r1((ob.z1 - Math.max(ob.z0, zmin)) * k), class: 'oc-rezf' }, this.gTragN);
  }
  linijaPuta(a, b, brzi) {
    sv('line', { x1: this.X(a.x), y1: this.YT(a.y), x2: this.X(b.x), y2: this.YT(b.y), class: brzi ? 'oc-put-g0' : 'oc-put-g1' }, this.gPut);
    sv('line', { x1: this.X(a.x), y1: this.ZN(a.z), x2: this.X(b.x), y2: this.ZN(b.z), class: brzi ? 'oc-put-g0' : 'oc-put-g1' }, this.gPut);
  }
  // pomaci: [{tip:'G0'|'G1'|'G2'|'G3', x,y,z (cilj), I,J (središte inkrementalno, za luk), blok, prije()}]
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
      const a = Object.assign({}, self.poz);
      const b = { x: m.x ?? a.x, y: m.y ?? a.y, z: m.z ?? a.z };
      if (m.tip === 'G2' || m.tip === 'G3') {
        const cx = a.x + (m.I || 0), cy = a.y + (m.J || 0), r = Math.hypot(a.x - cx, a.y - cy);
        let a0 = Math.atan2(a.y - cy, a.x - cx), a1 = Math.atan2(b.y - cy, b.x - cx), d = a1 - a0;
        if (m.tip === 'G2') { while (d >= 0) d -= 2 * PI; } else { while (d <= 0) d += 2 * PI; }
        const duz = Math.abs(d) * r, ms = Math.max(300, duz / 45 * 1000);
        let prev = a;
        stop = animiraj(ms, (u) => {
          const kut = a0 + d * u, p = { x: cx + r * Math.cos(kut), y: cy + r * Math.sin(kut), z: a.z + (b.z - a.z) * u };
          self.tragRez(prev, p); self.linijaPuta(prev, p, false); prev = p; self.poz = p; self.crtajAlat();
        }, () => { self.poz = b; self.crtajAlat(); dalje(); });
        return;
      }
      const duz = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), brzi = m.tip === 'G0';
      const ms = duz < 1e-6 ? 0 : Math.max(250, duz / (brzi ? 160 : 45) * 1000);
      let prev = a;
      const kl = brzi ? 'oc-put-g0' : 'oc-put-g1';
      const lt = sv('line', { x1: self.X(a.x), y1: self.YT(a.y), x2: self.X(a.x), y2: self.YT(a.y), class: kl }, self.gPut);
      const ln = sv('line', { x1: self.X(a.x), y1: self.ZN(a.z), x2: self.X(a.x), y2: self.ZN(a.z), class: kl }, self.gPut);
      stop = animiraj(ms, (u) => {
        const p = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
        if (!brzi) self.tragRez(prev, p);
        lt.setAttribute('x2', self.X(p.x)); lt.setAttribute('y2', self.YT(p.y)); ln.setAttribute('x2', self.X(p.x)); ln.setAttribute('y2', self.ZN(p.z));
        prev = p; self.poz = p; self.crtajAlat();
      }, () => { self.poz = b; self.crtajAlat(); stop = pauza(brzi ? 120 : 200, dalje); });
    };
    this.stani = () => { zaust = true; if (stop) stop(); };
    dalje();
  }
  zaustavi() { if (this.stani) this.stani(); this.stani = null; }
  vrati(p) { this.zaustavi(); this.poz = Object.assign({}, p); this.crtajAlat(); this.ocistiTrag(); this.hladenje(false); this.postaviStatus(''); }
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

// kvadranti s opisom predznaka (miš, dodir, tipkovnica)
function kvadranti(c, ex, ey, infoEl, osX) {
  const g = c.g('oc-kvg');
  const kv = [
    [0, 0, ex, ey, 'U ovom kvadrantu X i Y imaju pozitivan predznak: <b>(+X, +Y)</b>.', '+X  +Y'],
    [-ex, 0, 0, ey, 'Ovdje je X negativan, a Y pozitivan: <b>(−X, +Y)</b>.', '−X  +Y'],
    [-ex, -ey, 0, 0, 'Ovdje su i X i Y negativni: <b>(−X, −Y)</b>.', '−X  −Y'],
    [0, -ey, ex, 0, 'Ovdje je X pozitivan, a Y negativan: <b>(+X, −Y)</b>.', '+X  −Y'],
  ];
  kv.forEach(([xa, ya, xb, yb, t, kr]) => {
    const r = c.pravok(xa, ya, xb, yb, 'oc-kv', g);
    r.setAttribute('tabindex', '0'); r.setAttribute('role', 'button'); r.setAttribute('aria-label', t.replace(/<[^>]+>/g, ''));
    const lab = c.tekst((xa + xb) / 2, (ya + yb) / 2, kr, 'oc-kvt', g, { dy: 5 });
    const upali = () => { $$('.oc-kv', g).forEach((e) => e.classList.remove('akt')); $$('.oc-kvt', g).forEach((e) => e.classList.remove('akt')); r.classList.add('akt'); lab.classList.add('akt'); infoEl.innerHTML = t; };
    r.addEventListener('pointerenter', upali); r.addEventListener('focus', upali); r.addEventListener('click', upali);
    r.addEventListener('pointerleave', () => { r.classList.remove('akt'); lab.classList.remove('akt'); });
  });
  if (osX) {
    const l = c.lin(-ex, 0, ex, 0, 'oc-hit', g);
    l.setAttribute('tabindex', '0'); l.setAttribute('role', 'button'); l.setAttribute('aria-label', 'Sve točke na osi X imaju Y0.');
    const t = () => { infoEl.innerHTML = 'Sve točke na osi X imaju vrijednost <b>Y0</b>.'; };
    l.addEventListener('pointerenter', t); l.addEventListener('focus', t); l.addEventListener('click', t);
  }
  return g;
}

// ----------------------------------------------------------------- 0. Osnove glodanja (korijen izbornika)
tema('osnove', 'Osnove glodanja', 'korijen', [(box, api) => {
  box.append(tekst(`<p class="os-uvod">Ovo poglavlje vodi te kroz osnove bez kojih se CNC glodalica ne može programirati: <b>geometriju</b> (kako se zadaju točke na obratku), <b>tehnologiju</b> (koliko se brzo alat vrti i giba) i <b>programiranje</b> (kako se iz toga piše NC program).</p>
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
const CILJ_GEO = ['koordinatni sustavi', 'točke na obratku', 'apsolutne mjere', 'inkrementalne mjere', 'polarne mjere', 'zadavanje konture'];
const CILJ_TEH = ['brzina vrtnje n', 'brzina rezanja vc', 'posmak vf', 'posmak po zubu fz'];
const CILJ_PRO = ['građa programa', 'zaglavlje programa', 'adrese F, S, T, D, M', 'naredbe gibanja G0, G1, G2, G3', 'korekcija putanje alata', 'korekcije alata', 'ciklusi i potprogrami'];
function ciljeviKartica(naslov, popis, id, api) {
  const b = h('button', { type: 'button', class: 'gumb tanki', text: 'Otvori: ' + naslov });
  b.addEventListener('click', () => api.idi(id));
  return h('div', { class: 'os-cilj' }, h('h3', { text: naslov }), h('ul', { class: 'os-lista' }, ...popis.map((t) => h('li', { text: t }))), b);
}
tema('ciljevi', 'Ciljevi učenja', 'korijen', [(box, api) => {
  box.append(tekst('<p>Nakon ovog poglavlja znat ćeš temeljna geometrijska, tehnološka i programska pravila CNC glodanja. Za teme računaj oko <b>3 sata</b> učenja, a za završni test oko <b>30 minuta</b>.</p>'));
  box.append(h('div', { class: 'os-ciljevi' }, ciljeviKartica('Geometrija', CILJ_GEO, 'geometrija', api), ciljeviKartica('Tehnologija', CILJ_TEH, 'tehnologija', api), ciljeviKartica('Programiranje', CILJ_PRO, 'programiranje', api)));
}], { auto: true });

// ----------------------------------------------------------------- 2. Geometrija (naslov skupine)
tema('geometrija', 'Geometrija', 'skupina', [(box, api) => {
  box.append(tekst(`<p>Prije svakog programa treba znati <b>gdje</b> je točka koju alat mora doseći. U ovoj skupini naučit ćeš:</p>
  <ul class="os-lista"><li>postaviti koordinatni sustav i nultočku obratka W,</li><li>očitati koordinate točaka s crteža i odrediti predznake,</li>
  <li>zadati točku apsolutno (od W) i inkrementalno (od prethodne točke),</li><li>zadati točku polarno — polumjerom i kutom,</li><li>složiti cijelu konturu iz niza točaka i iskoristiti modalnost.</li></ul>`));
  box.append(h('div', { class: 'os-gumbi' }, ...['koord', 'tocke', 'abs', 'ink', 'polarno', 'kontura'].map((id) => {
    const t = TEME.find((x) => x.id === id) || { naziv: id }; const b = h('button', { type: 'button', class: 'gumb tanki', 'data-ide': id, text: '' });
    b.addEventListener('click', () => api.idi(id)); queueMicrotask(() => { b.textContent = (TEME.find((x) => x.id === id) || t).naziv; }); return b;
  })));
}], { auto: true });

// ----------------------------------------------------------------- 3. Koordinatni sustavi
function crtezKoord(oznaka) {
  const c = new Crtez({ x0: -92, x1: 94, y0: -60, y1: 62, sir: 560, oznaka });
  c.pravok(-65, -40, 65, 40, 'oc-ob');
  c.osi({ xa: -86, xb: 88, ya: -56, yb: 58, minus: true });
  c.W(0, 0);
  c.kotaH(-65, 65, 40, 52, '130', null, { dx: -24 });
  c.kotaV(-40, 40, 65, 80, '80', null, { dy: -24 });
  return c;
}
tema('koord', 'Koordinatni sustavi', 'geo', [
  (box) => {
    box.append(dva(tekst(`<p>Ishodište koordinatnog sustava na obratku zove se <b>nultočka obratka W</b> (workpiece zero). Biraš je slobodno — tako da kote s crteža možeš što jednostavnije prenijeti u program. Kod simetričnog dijela, kao na slici, W je najzgodnije staviti u sredinu.</p>
      <p>Položaj točke u ravnini određuju dvije međusobno okomite osi:</p>
      <ul class="os-lista"><li><b>os X</b> je vodoravna — vrijednosti rastu slijeva udesno,</li><li><b>os Y</b> je okomita — vrijednosti rastu odozdo prema gore.</li></ul>
      <p>U obradi metala mjere se zadaju u <b>milimetrima</b>.</p>`),
      slika(crtezKoord('Pravokutni dio 130 × 80 mm s nultočkom W u sredini i osima X i Y').svg, 'Simetričan dio 130 × 80 mm; nultočka W je u sredini.')));
  },
  (box) => {
    const inf = info('Prijeđi mišem preko kvadranta ili ga dodirni.');
    const c = crtezKoord('Četiri kvadranta koordinatnog sustava');
    kvadranti(c, 86, 56, inf, true);
    box.append(dva(tekst(`<p>Osi dijele ravninu na <b>četiri kvadranta</b>. Predznak koordinata ovisi o kvadrantu u kojem točka leži:</p>
      <table class="os-tab"><thead><tr><th>Kvadrant</th><th>X</th><th>Y</th></tr></thead><tbody>
      <tr><td>gore desno</td><td>+</td><td>+</td></tr><tr><td>gore lijevo</td><td>−</td><td>+</td></tr><tr><td>dolje lijevo</td><td>−</td><td>−</td></tr><tr><td>dolje desno</td><td>+</td><td>−</td></tr></tbody></table>
      <p>Točke koje leže na osi X imaju Y0, a točke na osi Y imaju X0.</p>`),
      h('div', null, slika(c.svg), inf)));
  },
], { auto: true });

// ----------------------------------------------------------------- 4. Točke na obratku (vježba)
const PROVRTI = [[65, 40], [-65, 40], [-65, -40], [65, -40], [50, 0], [-50, 0]];
tema('tocke', 'Točke na obratku', 'geo', [(box, api) => {
  const c = new Crtez({ x0: -96, x1: 102, y0: -74, y1: 80, sir: 580, oznaka: 'Ploča sa šest provrta i nultočkom W u sredini' });
  c.pravok(-80, -60, 80, 60, 'oc-ob');
  c.osi({ xa: -90, xb: 96, ya: -70, yb: 74, minus: true });
  const inf = info('Prijeđi mišem preko kvadranta ili osi X za pomoć s predznacima.');
  kvadranti(c, 80, 60, inf, true);
  c.W(0, 0);
  c.kotaH(-65, 65, 40, 70, '130', null, { dx: -24 }); c.kotaV(-40, 40, 65, 90, '80', null, { dy: -24 }); c.kotaH(-50, 50, 0, -18, '100', null, { dx: 20 });
  const gP = c.g(), oz = [];
  PROVRTI.forEach(([x, y], i) => {
    const g = c.g('oc-provrt', gP); c.krug(x, y, 5, 'oc-rupa', g);
    c.tekst(x, y, String(i + 1), 'oc-txb', g, { dx: x > 0 ? 14 : -14, dy: y >= 0 ? -10 : 18 });
    const lab = c.tekst(x, y, '', 'oc-txr', g, { dy: y >= 0 ? 24 : -16 });
    oz.push({ g, lab });
  });
  const crt = {
    oznaci(i) { oz.forEach((o, j) => o.g.classList.toggle('akt', j === i)); },
    rijeseno(i, cb) { oz[i].g.classList.remove('akt'); oz[i].g.classList.add('gotov'); oz[i].lab.textContent = 'X' + fmt(PROVRTI[i][0]) + ' Y' + fmt(PROVRTI[i][1]); pauza(500, cb); },
    reset() { oz.forEach((o) => { o.g.classList.remove('akt', 'gotov'); o.lab.textContent = ''; }); },
  };
  const savjeti = ['Provrt je gore desno: oba predznaka su pozitivna.', 'Provrt je gore lijevo: X je negativan.', 'Provrt je dolje lijevo: oba predznaka su negativna.', 'Provrt je dolje desno: Y je negativan.', 'Provrt leži na osi X.', 'Provrt leži na osi X, lijevo od W.'];
  const v = vjezbaUnos({
    naslov: 'Koordinate provrta',
    zadaci: PROVRTI.map(([x, y], i) => ({ opis: `Upiši koordinate <b>provrta ${i + 1}</b> (apsolutno, od W):`, savjet: savjeti[i],
      polja: [{ k: 'X', oz: 'abs', tocno: x, raspon: [-80, 80] }, { k: 'Y', oz: 'abs', tocno: y, raspon: [-60, 60] }] })),
    crtez: crt, kraj: 'Svih šest provrta je zadano. Kote 130, 80 i 100 su simetrične oko W — zato je svaka koordinata polovica kote.', naGotovo: api.gotovo,
  });
  box.append(dva(h('div', null, tekst('<p>Na ploči je šest provrta, a W je u sredini. Iz kota izračunaj koordinate svakog provrta i pazi na predznak. Dopušteni raspon: X −80 … 80, Y −60 … 60.</p>'), v), h('div', null, slika(c.svg), inf)));
}]);

// ----------------------------------------------------------------- 5. i 6. Apsolutne i inkrementalne mjere (isti put)
const PUT_AI = [[30, 10], [20, 50], [-10, 40], [10, 0]];
function crtezPuta(ink) {
  const c = new Crtez({ x0: -32, x1: 52, y0: -18, y1: 62, sir: 540, oznaka: 'Mreža 10 mm s polazištem i tri krajnje točke' });
  c.mreza(10); c.osi({ xa: -30, xb: 50, ya: -16, yb: 60, oznake: 10 }); c.W(0, 0, null, '');
  const gKomp = c.g('oc-komp'), gPut = c.g(), gT = c.g();
  const tocke = PUT_AI.map(([x, y], i) => {
    const g = c.g(i ? 'oc-cilj' : 'oc-pol', gT); c.tocka(x, y, 5, 'oc-tk', g);
    c.tekst(x, y, i ? 'P' + i : 'P0', 'oc-txb', g, { dx: 10, dy: -8, a: 'start' }); return g;
  });
  const alat = c.tocka(30, 10, 9, 'oc-alat oc-alat-t');
  return {
    svg: c.svg,
    oznaci(i) {
      tocke.forEach((t, j) => t.classList.toggle('akt', j === i + 1));
      gKomp.innerHTML = '';
      if (ink) {
        const [xa, ya] = PUT_AI[i], [xb, yb] = PUT_AI[i + 1];
        c.strelicaMM(xa, ya, xb, ya, 'oc-komp-l', gKomp, 8); c.strelicaMM(xb, ya, xb, yb, 'oc-komp-l', gKomp, 8);
        c.tekst((xa + xb) / 2, ya, (xb > xa ? '+' : '−') + fmt(Math.abs(xb - xa)), 'oc-txr', gKomp, { dy: ya > yb ? -6 : 16 });
        c.tekst(xb, (ya + yb) / 2, (yb > ya ? '+' : '−') + fmt(Math.abs(yb - ya)), 'oc-txr', gKomp, { dx: xb > xa ? 8 : -8, a: xb > xa ? 'start' : 'end' });
      }
    },
    rijeseno(i, cb) {
      const [xa, ya] = PUT_AI[i], [xb, yb] = PUT_AI[i + 1];
      const l = c.lin(xa, ya, xa, ya, 'oc-putl', gPut); gKomp.innerHTML = '';
      const st = animiraj(700, (u) => { const x = xa + (xb - xa) * u, y = ya + (yb - ya) * u; l.setAttribute('x2', c.X(x)); l.setAttribute('y2', c.Y(y)); alat.setAttribute('cx', c.X(x)); alat.setAttribute('cy', c.Y(y)); },
        () => { tocke[i + 1].classList.remove('akt'); tocke[i + 1].classList.add('gotov'); pauza(250, cb); });
      naCiscenje(st);
    },
    reset() { gPut.innerHTML = ''; gKomp.innerHTML = ''; tocke.forEach((t) => t.classList.remove('akt', 'gotov')); alat.setAttribute('cx', c.X(30)); alat.setAttribute('cy', c.Y(10)); },
  };
}
tema('abs', 'Apsolutne mjere', 'geo', [(box, api) => {
  const crt = crtezPuta(false);
  const v = vjezbaUnos({
    naslov: 'Krajnja točka (abs)',
    zadaci: PUT_AI.slice(1).map(([x, y], i) => ({ opis: `Alat je u <b>P${i}</b> (X${fmt(PUT_AI[i][0])} Y${fmt(PUT_AI[i][1])}). Upiši apsolutne koordinate krajnje točke <b>P${i + 1}</b>:`,
      savjet: 'Apsolutna vrijednost uvijek se mjeri od W, a ne od položaja alata.',
      polja: [{ k: 'X', oz: 'abs', tocno: x, raspon: [-20, 40] }, { k: 'Y', oz: 'abs', tocno: y, raspon: [-10, 55] }] })),
    crtez: crt, kraj: 'Put P0 → P1 → P2 → P3 je zadan apsolutno.', naGotovo: api.gotovo,
  });
  box.append(dva(h('div', null, tekst('<p>U prozoru za unos apsolutne mjere nose kraticu <b>abs</b>. Apsolutno zadana vrijednost uvijek se odnosi na <b>nultočku obratka W</b> — neovisno o tome gdje je alat.</p><p>Alat kreće iz P0 (X30 Y10). Krajnja točka svakog pomaka polazište je sljedećeg. Očitaj koordinate na mreži (razmak crta 10 mm).</p>'), v), slika(crt.svg, 'Mreža 10 mm; žuti krug je alat.')));
}]);
tema('ink', 'Inkrementalne mjere', 'geo', [(box, api) => {
  const crt = crtezPuta(true);
  const zad = PUT_AI.slice(1).map(([x, y], i) => {
    const [xa, ya] = PUT_AI[i], dx = x - xa, dy = y - ya;
    const red = (os, a, b, d) => `<p><b>${os}:</b> polazište ${os}${fmt(a)}, cilj ${os}${fmt(b)} → ${fmt(b)} − (${fmt(a)}) = ${d > 0 ? '+' : ''}${fmt(d)}; gibanje u smjeru <b>${d >= 0 ? '+' : '−'}${os}</b>, upisuješ <b>${d > 0 ? '+' : ''}${fmt(d)}</b>.</p>`;
    return { opis: `Alat je u <b>P${i}</b>. Upiši put do <b>P${i + 1}</b> inkrementalno (razliku s predznakom smjera):`,
      savjet: 'Inkrementalno upisuješ razliku od polazišta do cilja; predznak je smjer gibanja.', pomoc: red('X', xa, x, dx) + red('Y', ya, y, dy),
      polja: [{ k: 'X', oz: 'inc', tocno: dx, raspon: [-60, 60] }, { k: 'Y', oz: 'inc', tocno: dy, raspon: [-60, 60] }] };
  });
  const v = vjezbaUnos({ naslov: 'Put do krajnje točke (inc)', zadaci: zad, crtez: crt, kraj: 'Isti put zadan je sada inkrementalno: −10/+40, −30/−10, +20/−40.', naGotovo: api.gotovo });
  box.append(dva(h('div', null, tekst('<p>Inkrementalne mjere u prozoru za unos nose kraticu <b>inc</b>. Ne upisuješ položaj, nego <b>razliku od polazišta do krajnje točke</b>, s predznakom smjera gibanja.</p><p>Put je isti kao kod apsolutnih mjera. Isprekidane strelice na crtežu rastavljaju svaki pomak na dio u X i dio u Y.</p>'), v), slika(crt.svg, 'Isprekidane strelice: rastav pomaka usporedno s osima.')));
}]);

// ----------------------------------------------------------------- 7. Polarne mjere
const POLAR = [{ r: 50, a: 62.5, kota: '62°30\'', alt: [] }, { r: 40, a: -20, kota: '20°', alt: [340] }];
tema('polarno', 'Polarne mjere', 'geo', [(box, api) => {
  const c = new Crtez({ x0: -40, x1: 64, y0: -30, y1: 60, sir: 540, oznaka: 'Pol u W, krajnja točka zadana polumjerom i kutom' });
  c.osi({ xa: -38, xb: 60, ya: -28, yb: 56 }); c.W(0, 0, null, 'pol');
  // legenda smjera kuta
  const gl = c.g('oc-leg'); const lx = -24, ly = 40;
  c.luk(lx, ly, 9, 0.15, 2.2, 'oc-legp', gl); c.strelica(c.X(lx + 9 * Math.cos(2.2)), c.Y(ly + 9 * Math.sin(2.2)), Math.atan2(-Math.cos(2.2), -Math.sin(2.2)) , 8, 'oc-legpf', gl);
  c.tekst(lx, ly + 13, '+ kut', 'oc-txs', gl, { dy: -2 });
  c.luk(lx, ly - 20, 9, -0.15, -2.2, 'oc-legn', gl); c.strelica(c.X(lx + 9 * Math.cos(-2.2)), c.Y(ly - 20 + 9 * Math.sin(-2.2)), Math.atan2(Math.cos(-2.2), Math.sin(-2.2)), 8, 'oc-legnf', gl);
  c.tekst(lx, ly - 33, '− kut', 'oc-txs', gl, { dy: 4 });
  const gK = c.g(), gR = c.g();
  const alat = c.tocka(0, 0, 9, 'oc-alat oc-alat-t');
  const crt = {
    oznaci(i) {
      gK.innerHTML = ''; const z = POLAR[i], a = z.a * PI / 180, x = z.r * Math.cos(a), y = z.r * Math.sin(a);
      c.lin(0, 0, x, y, 'oc-l oc-crt', gK); c.lin(0, 0, 22, 0, 'oc-tn', gK);
      c.luk(0, 0, 16, 0, a, 'oc-kl', gK);
      const am = a / 2; c.tekst(21 * Math.cos(am), 21 * Math.sin(am), z.kota, 'oc-kt', gK, { dx: 4, dy: 5, a: 'start' });
      const nx = -Math.sin(a), ny = Math.cos(a); c.tekst(x / 2 + nx * 5, y / 2 + ny * 5, String(z.r), 'oc-kt', gK, { dy: 4 });
      const g = c.g('oc-cilj akt', gK); c.tocka(x, y, 5, 'oc-tk', g); c.tekst(x, y, 'P' + (i + 1), 'oc-txb', g, { dx: 10, dy: -6, a: 'start' });
    },
    rijeseno(i, cb) {
      const z = POLAR[i], a = z.a * PI / 180, x = z.r * Math.cos(a), y = z.r * Math.sin(a);
      const l = c.lin(0, 0, 0, 0, 'oc-putl', gR); alat.setAttribute('cx', c.X(0)); alat.setAttribute('cy', c.Y(0));
      naCiscenje(animiraj(700, (u) => { l.setAttribute('x2', c.X(x * u)); l.setAttribute('y2', c.Y(y * u)); alat.setAttribute('cx', c.X(x * u)); alat.setAttribute('cy', c.Y(y * u)); },
        () => { const g = c.g('oc-cilj gotov', gR); c.tocka(x, y, 5, 'oc-tk', g); c.tekst(x, y, 'P' + (i + 1), 'oc-txb', g, { dx: 10, dy: -6, a: 'start' }); pauza(300, cb); }));
    },
    reset() { gK.innerHTML = ''; gR.innerHTML = ''; alat.setAttribute('cx', c.X(0)); alat.setAttribute('cy', c.Y(0)); },
  };
  const v = vjezbaUnos({
    naslov: 'Krajnja točka (polarno)',
    zadaci: POLAR.map((z, i) => ({ opis: `Upiši polumjer <b>RP</b> i kut <b>AP</b> krajnje točke <b>P${i + 1}</b> (pol je u W, kut se mjeri od osi +X):`,
      savjet: i ? 'Kut je ispod osi X — mjeri se u smjeru kazaljke na satu, dakle negativno (ili kao 360° − 20°).' : 'Kut 62°30\' je 62,5°.',
      polja: [{ k: 'RP', naziv: 'polumjer', oz: 'mm', tocno: z.r, raspon: [0, 55] }, { k: 'AP', naziv: 'kut', oz: '°', tocno: z.a, alt: z.alt, tol: 0.05, raspon: [-360, 360] }] })),
    crtez: crt, kraj: 'Obje točke su zadane polarno. Za P2 vrijede i −20° i 340° — to je isti smjer.', naGotovo: api.gotovo,
  });
  box.append(dva(h('div', null, tekst('<p>Polarno se točka zadaje <b>polumjerom</b> (udaljenost od pola) i <b>kutom</b> (od osi +X). Pozitivan kut mjeri se <b>suprotno od kazaljke na satu</b>, negativan <b>u smjeru kazaljke</b>.</p><p>Kut smiješ upisati i u stupnjevima i minutama, npr. <code>62°30\'</code>.</p>'), v), slika(c.svg, 'Pol je u W; lijevo gore: smjer pozitivnog i negativnog kuta.')));
}]);

// ----------------------------------------------------------------- 8. Zadavanje konture
const P7 = [140 - 33.5 * Math.cos(26.5 * PI / 180), 15 + 33.5 * Math.sin(26.5 * PI / 180)];
const KONTURA = [[0, 0], [0, 50], [30, 50], [60, 80], [110, 80], [140, 55], [140, 15], P7, [80, 15], [80, 0], [0, 0]];
function ordinate(c, tocke, os, d, p) { // koordinatne kote: tocke [[vrijednost, polozaj predmeta]]; os 'x' ili 'y'; d položaj crte
  const g = c.g('oc-kota', p);
  for (const [v, f] of tocke) {
    if (os === 'x') { c.lin(v, f, v, d, null, g); c.tekst(v, d, fmt(v, 1), 'oc-kt', g, { dy: d > f ? -4 : 13 }); }
    else { c.lin(f, v, d, v, null, g); c.tekst(d, v, fmt(v, 1), 'oc-kt', g, { dx: d > f ? 4 : -4, dy: 4, a: d > f ? 'start' : 'end' }); }
  }
  return g;
}
tema('kontura', 'Zadavanje konture', 'geo', [(box, api) => {
  const c = new Crtez({ x0: -30, x1: 172, y0: -22, y1: 100, sir: 600, oznaka: 'Kontura P0 do P10 s kotama' });
  c.poli(KONTURA, 'oc-ob', null, true);
  c.osi({ xa: -14, xb: 166, ya: -14, yb: 96 });
  ordinate(c, [[30, 50], [60, 80], [110, 80]], 'x', 90); ordinate(c, [[80, 0], [140, 15]], 'x', -12);
  ordinate(c, [[50, 0], [80, 60]], 'y', -14); ordinate(c, [[15, 140], [55, 140]], 'y', 154);
  const gPol = c.g('oc-kota'); c.lin(140, 15, 112, 15, 'oc-tn', gPol); c.luk(140, 15, 20, PI, PI - 26.5 * PI / 180, 'oc-kl', gPol);
  c.tekst(140 - 24, 15 + 5.5, '26,5°', 'oc-kt', gPol, { a: 'end', dy: 2 }); c.tekst((140 + P7[0]) / 2 + 2, (15 + P7[1]) / 2 + 4, '33,5', 'oc-kt', gPol, { dy: -4, a: 'start' });
  c.W(0, 0, null, 'W = P0');
  const inf = info('Crveni odsječci: prijeđi mišem preko njih ili ih dodirni za objašnjenje modalnosti.');
  const OBJ = ['<b>P0 → P1</b>: polazište X0 Y0, cilj X0 Y50. X se ne mijenja, pa ga ne treba upisivati — upisuješ samo <b>Y50</b>. X djeluje <b>modalno</b>.',
    '<b>P1 → P2</b>: polazište X0 Y50, cilj X30 Y50. Y ostaje isti — upisuješ samo <b>X30</b>; Y djeluje modalno.',
    '<b>P2 → P3</b>: polazište X30 Y50, cilj X60 Y80. Mijenjaju se obje vrijednosti, pa upisuješ <b>X60 Y80</b> (nemodalno).'];
  const gH = c.g('oc-modal');
  for (let i = 0; i < 3; i++) {
    c.lin(...KONTURA[i], ...KONTURA[i + 1], 'oc-mod', gH);
    const hit = c.lin(...KONTURA[i], ...KONTURA[i + 1], 'oc-hit', gH);
    hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button'); hit.setAttribute('aria-label', OBJ[i].replace(/<[^>]+>/g, ''));
    const f = () => { inf.innerHTML = OBJ[i]; }; hit.addEventListener('pointerenter', f); hit.addEventListener('focus', f); hit.addEventListener('click', f);
  }
  const gOz = c.g(), gPut = c.g(), oz = [];
  const pomak = [[0, 0], [-12, 4], [-2, 12], [-6, 12], [6, 12], [10, 4], [10, -10], [0, -10], [-12, 4], [8, 16], [0, 0]];
  KONTURA.forEach(([x, y], i) => { if (i === 0 || i === 10) { oz.push(null); return; } const g = c.g('oc-cilj', gOz); c.tocka(x, y, 4, 'oc-tk', g); c.tekst(x, y, 'P' + i, 'oc-txb', g, { dx: pomak[i][0], dy: -pomak[i][1] + 4, a: pomak[i][0] > 0 ? 'start' : pomak[i][0] < 0 ? 'end' : 'middle' }); oz.push(g); });
  const alat = c.tocka(0, 0, 8, 'oc-alat oc-alat-t');
  const crt = {
    oznaci(i) { oz.forEach((g, j) => g && g.classList.toggle('akt', j === i + 1)); },
    rijeseno(i, cb) {
      const [xa, ya] = KONTURA[i], [xb, yb] = KONTURA[i + 1], l = c.lin(xa, ya, xa, ya, 'oc-putl', gPut);
      naCiscenje(animiraj(500, (u) => { const x = xa + (xb - xa) * u, y = ya + (yb - ya) * u; l.setAttribute('x2', c.X(x)); l.setAttribute('y2', c.Y(y)); alat.setAttribute('cx', c.X(x)); alat.setAttribute('cy', c.Y(y)); },
        () => { if (oz[i + 1]) { oz[i + 1].classList.remove('akt'); oz[i + 1].classList.add('gotov'); } pauza(150, cb); }));
    },
    reset() { gPut.innerHTML = ''; oz.forEach((g) => g && g.classList.remove('akt', 'gotov')); alat.setAttribute('cx', c.X(0)); alat.setAttribute('cy', c.Y(0)); },
  };
  const zad = KONTURA.slice(1).map(([x, y], j) => {
    const i = j + 1, [px, py] = KONTURA[j], ime = i === 10 ? 'P10 (natrag u W)' : 'P' + i;
    if (i === 7) return { opis: 'Točku <b>P7</b> zadaj <b>polarno</b> s polom u P6: polumjer RP i kut AP (od osi +X).', savjet: 'Kut 26,5° na crtežu mjeri se od vodoravne prema lijevo; od osi +X to je 180° − 26,5°.',
      polja: [{ k: 'RP', naziv: 'polumjer', oz: 'mm', tocno: 33.5, tol: 0.05, raspon: [0, 200] }, { k: 'AP', naziv: 'kut', oz: '°', tocno: 153.5, alt: [-206.5], tol: 0.1, raspon: [-360, 360] }] };
    const modX = Math.abs(x - px) < 1e-6, modY = Math.abs(y - py) < 1e-6;
    return { opis: `Upiši krajnju točku <b>${ime}</b> (abs).` + (modX || modY ? ' Ono što se ne mijenja smiješ ostaviti prazno.' : ''),
      savjet: 'Očitaj kotu točke od W (koordinatne kote uz crtež).',
      polja: [{ k: 'X', oz: 'abs', tocno: x, tol: 0.05, raspon: [-20, 160], modal: modX ? px : undefined }, { k: 'Y', oz: 'abs', tocno: y, tol: 0.05, raspon: [-20, 100], modal: modY ? py : undefined }] };
  });
  const v = vjezbaUnos({ naslov: 'Kontura P1 … P10', zadaci: zad, crtez: crt, kraj: 'Kontura je zatvorena. Kad se mijenja samo jedna os, upisuješ samo nju — druga djeluje modalno.', naGotovo: api.gotovo });
  box.append(dva(h('div', null, tekst('<p>Konturu gradiš kao niz krajnjih točaka od W (P0) do P10. Pazi na način zadavanja: sve točke su apsolutne, a <b>P7 je polarna</b> (pol u P6).</p><p><b>Modalno djelovanje:</b> točka se obično zadaje s X i Y. Ako je gibanje usporedno s osi, dovoljno je upisati samo vrijednost koja se mijenja; druga ostaje od prethodnog položaja.</p>'), v), h('div', null, slika(c.svg, 'Koordinatne kote od W; P7 je zadana duljinom 33,5 i kutom 26,5°.'), inf)));
}]);

// ================================================================= TEHNOLOGIJA
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
function crtezGlodala(d, z, rpx, oznaka) { // glodalo odozgo nad obratkom, s kotom promjera
  const w = Math.max(240, 2 * rpx + 80), hh = 2 * rpx + 80, svg = svgPlatno(w, hh, oznaka);
  sv('rect', { x: 14, y: hh / 2 - rpx * 0.75, width: w - 28, height: rpx * 1.5, class: 'oc-ob' }, svg);
  const g = glodaloOdozgo(svg, w / 2, hh / 2 - 6, rpx, z);
  const y = hh - 22; sv('line', { x1: w / 2 - rpx, y1: y, x2: w / 2 + rpx, y2: y, class: 'oc-kotal' }, svg);
  sv('line', { x1: w / 2 - rpx, y1: hh / 2 - 6, x2: w / 2 - rpx, y2: y + 4, class: 'oc-kotal' }, svg); sv('line', { x1: w / 2 + rpx, y1: hh / 2 - 6, x2: w / 2 + rpx, y2: y + 4, class: 'oc-kotal' }, svg);
  const c = { strelica: Crtez.prototype.strelica, svg }; c.strelica(w / 2 - rpx, y, PI, 8, 'oc-kf'); c.strelica(w / 2 + rpx, y, 0, 8, 'oc-kf');
  const t = sv('text', { x: w / 2, y: y - 5, class: 'oc-kt', 'text-anchor': 'middle' }, svg); t.textContent = 'Ø' + d;
  const vr = vrtiDodaj(g, w / 2, hh / 2 - 6);
  return { svg, vr };
}
const formula = (html) => h('p', { class: 'os-formula', html });

tema('tehnologija', 'Tehnologija', 'skupina', [(box, api) => {
  box.append(tekst(`<p>Na stroju za svaku obradu biraš dvije veličine: <b>brzinu vrtnje</b> vretena i <b>posmak</b>. Obje se izračunavaju iz preporuka za alat i materijal. U ovoj skupini naučit ćeš:</p>
  <ul class="os-lista"><li>izračunati brzinu vrtnje n iz brzine rezanja vc i promjera alata d,</li><li>objasniti zašto je za rezanje odlučujuća vc, a ne izravno n,</li><li>izračunati posmak vf iz n, posmaka po zubu fz i broja oštrica z,</li><li>procijeniti kako fz utječe na kvalitetu površine.</li></ul>`));
  box.append(h('div', { class: 'os-gumbi' }, ...['brzina-vrtnje', 'brzina-rezanja', 'posmak', 'posmak-po-zubu'].map((id) => { const b = h('button', { type: 'button', class: 'gumb tanki' }); b.addEventListener('click', () => api.idi(id)); queueMicrotask(() => { b.textContent = TEME.find((x) => x.id === id).naziv; }); return b; })));
}], { auto: true });

// ----------------------------------------------------------------- 10. Brzina vrtnje
tema('brzina-vrtnje', 'Brzina vrtnje', 'teh', [(box, api) => {
  const d = 63, cr = crtezGlodala(d, 6, 92, 'Čeono glodalo promjera 63 mm gledano odozgo');
  const kl = stupnjevi('Brzina vrtnje <i>n</i>', [0, 100, 200, 300], 0, 'o/min');
  const iN = ish('n', 'o/min'), iV = ish('v<sub>c</sub> = π · d · n / 1000', 'm/min');
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
  let bilo = false;
  const osvj = (n) => {
    const vc = PI * d * n / 1000; iN.set(fmt(n, 0)); iV.set(fmt(vc, 1)); cr.vr.n = n;
    const [r, t] = razinaVc(vc, 60); por.className = 'os-razina ' + r; por.textContent = t + (r === 'dobro' ? ' (' + fmt(vc, 1) + ' ≈ 60 m/min)' : '');
    if (r === 'dobro' && !bilo) { bilo = true; api.gotovo(); }
  };
  kl.promjena = osvj; osvj(0);
  box.append(dva(h('div', null, tekst(`<p>Za obradu biraš dvije veličine: <b>brzinu vrtnje</b> i <b>posmak</b>. Brzina vrtnje kaže koliko se puta alat okrene u minuti; jedinica je <b>o/min</b> (okretaja u minuti). Ovisi o brzini rezanja <i>v</i><sub>c</sub> i promjeru alata <i>d</i>:</p>`),
    formula('<i>n</i> = <i>v</i><sub>c</sub> · 1000 / (π · <i>d</i>)'),
    tekst('<p><b>Zadatak:</b> za ovu obradu idealna je brzina rezanja oko <b>60 m/min</b>. Glodalo ima promjer 63 mm. Namjesti brzinu vrtnje.</p>'),
    h('div', { class: 'racun' }, kl.el, h('div', { class: 'ishod' }, iN, iV), por)),
    slika(cr.svg, 'Čeono glodalo Ø63 mm; vrtnja je usporena da se vidi.')));
  naCiscenje(vrtiOcisti);
}]);

// ----------------------------------------------------------------- 11. Brzina rezanja
tema('brzina-rezanja', 'Brzina rezanja', 'teh', [(box, api) => {
  const D = [53, 80, 160], R = [34, 50, 96], ok = [false, false, false], kart = [];
  D.forEach((d, i) => {
    const cr = crtezGlodala(d, i === 2 ? 10 : 6, R[i], 'Glodalo promjera ' + d + ' mm');
    const kl = stupnjevi('<i>n</i> za Ø' + d, [0, 100, 200, 300], 0, 'o/min');
    const iV = ish('v<sub>c</sub>', 'm/min'), por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
    const osvj = (n) => {
      const vc = PI * d * n / 1000; iV.set(fmt(vc, 1)); cr.vr.n = n; const [r, t] = razinaVc(vc, 50);
      por.className = 'os-razina ' + r; por.textContent = t; ok[i] = r === 'dobro';
      if (ok.every(Boolean)) { api.gotovo(); sveOk.hidden = false; } else sveOk.hidden = true;
    };
    kl.promjena = osvj; kart.push(h('div', { class: 'os-tri-k racun' }, slika(cr.svg), kl.el, h('div', { class: 'ishod' }, iV), por)); queueMicrotask(() => osvj(0));
  });
  const sveOk = h('p', { class: 'os-razina dobro', hidden: true, text: 'Sva tri glodala režu sa 50 m/min: veće glodalo treba manju brzinu vrtnje.' });
  box.append(tekst(`<p>Brzina rezanja <i>v</i><sub>c</sub> je brzina kojom oštrica prolazi kroz materijal, u <b>m/min</b>:</p>`), formula('<i>v</i><sub>c</sub> = π · <i>d</i> · <i>n</i> / 1000'),
    tekst(`<p>Ispravna brzina rezanja ovisi o materijalu obratka (čelik, aluminij …) i materijalu alata (HSS, TiN, CBN …). Preporučene raspone daju katalozi proizvođača alata.</p><p><b>Zadatak:</b> tri glodala imaju različite promjere. Za svako namjesti brzinu vrtnje tako da brzina rezanja bude <b>50 m/min</b>.</p>`),
    h('div', { class: 'os-tri' }, ...kart), sveOk);
  naCiscenje(vrtiOcisti);
}]);

// ----------------------------------------------------------------- simulacija površine (tragovi oštrica)
function PovrsinaSim(oznaka) {
  const w = 560, hh = 170, cy = 92, H = 64, Rc = 44, x0 = 30, x1 = w - 50, xs = 230;
  const svg = svgPlatno(w, hh, oznaka);
  sv('rect', { x: 10, y: cy - H / 2, width: w - 20, height: H, class: 'oc-ob' }, svg);
  sv('rect', { x: 10, y: cy - H / 2, width: w - 20, height: H, class: 'oc-ob-ner' }, svg);
  const tragovi = sv('path', { class: 'oc-tragovi' }, svg);
  const omot = sv('g', null, svg);
  let rot = null, gl = null;
  const st = { n: 0, z: 5, fz: 0.1, x: xs, k: 0, d: '', id: 0, t: 0 };
  const strel = sv('g', { class: 'oc-kota' }, svg);
  const lab = sv('text', { x: w - 14, y: 22, class: 'oc-txb', 'text-anchor': 'end' }, svg);
  const lab2 = sv('text', { x: 14, y: 22, class: 'oc-txs', 'text-anchor': 'start' }, svg); lab2.textContent = 'smjer posmaka →';
  const th = Math.asin((H / 2 - 2) / Rc);
  const luk = (xk) => { const ax = xk - Rc * Math.cos(th), ay = cy - Rc * Math.sin(th), bx = xk - Rc * Math.cos(th), by = cy + Rc * Math.sin(th); return `M${r1(ax)} ${r1(ay)}A${Rc} ${Rc} 0 0 0 ${r1(bx)} ${r1(by)}`; };
  function noviAlat() { omot.innerHTML = ''; const g = sv('g', null, omot); gl = glodaloOdozgo(g, 0, 0, Rc, st.z); rot = { g: gl }; postavi(); }
  function postavi() { omot.firstChild.setAttribute('transform', `translate(${r1(st.x)} ${cy})`); }
  const korak = () => st.fz / 0.1 * 4.2; // razmak tragova u px (povećano)
  function tragoviDo(x) { let d = ''; const p = korak(); let k = 0; for (let xk = 10 + Rc * Math.cos(th); xk <= x; xk += p) { d += luk(xk); k++; } tragovi.setAttribute('d', d); }
  function kvaliteta() { return st.fz <= 0.1 + 1e-9 ? 'fino' : st.fz <= 0.2 + 1e-9 ? 'srednje' : 'grubo'; }
  function okvir() { lab.textContent = st.n ? 'površina: ' + kvaliteta() + ' (fz ' + fmt(st.fz, 2) + ' mm)' : 'vreteno stoji'; }
  let kut = 0;
  function petlja(t) {
    const dt = Math.min(0.05, (t - st.t) / 1000); st.t = t;
    const vf = st.n * st.fz * st.z; // mm/min
    if (vf > 0) {
      st.x += vf / 150 * 40 * dt;
      if (st.x > x1) { st.x = xs; }
      tragoviDo(st.x); postavi();
      kut = (kut - st.n / 60 * 360 * dt * 0.22) % 360; gl.setAttribute('transform', `rotate(${r1(kut)} 0 0)`);
    }
    st.id = requestAnimationFrame(petlja);
  }
  function staticno() { st.x = x1; postavi(); tragoviDo(st.n * st.fz * st.z > 0 ? x1 : 0); }
  noviAlat(); okvir();
  if (MANJE_GIBANJA) staticno(); else { st.t = performance.now(); st.id = requestAnimationFrame(petlja); }
  naCiscenje(() => cancelAnimationFrame(st.id));
  return {
    svg,
    postavi(o) { const zStari = st.z; Object.assign(st, o); if (st.z !== zStari) noviAlat(); st.x = xs; tragoviDo(xs); postavi(); okvir(); if (MANJE_GIBANJA) staticno(); },
    kvaliteta,
  };
}

// ----------------------------------------------------------------- 12. Posmak
tema('posmak', 'Posmak', 'teh', [(box, api) => {
  const n = 300, z = 5, sim = PovrsinaSim('Trag oštrica čeonog glodala na površini obratka');
  const kl = stupnjevi('Posmak <i>v</i><sub>f</sub>', [150, 300, 450], 150, 'mm/min');
  const iF = ish('f<sub>z</sub> = v<sub>f</sub> / (n · z)', 'mm'), iK = ish('Površina', '');
  const vidjeno = new Set();
  const osvj = (vf) => {
    const fz = vf / (n * z); sim.postavi({ n, z, fz }); iF.set(fmt(fz, 2)); iK.set(sim.kvaliteta());
    vidjeno.add(vf); if (vidjeno.size === 3) api.gotovo();
  };
  kl.promjena = osvj; osvj(150);
  box.append(dva(h('div', null, tekst(`<p><b>Posmak</b> <i>v</i><sub>f</sub> je druga veličina koju namještaš na stroju: brzina kojom se alat giba u smjeru obrade, u <b>mm/min</b>. Ovisi o brzini vrtnje <i>n</i> i posmaku po okretaju, a to je posmak po zubu <i>f</i><sub>z</sub> pomnožen brojem oštrica <i>z</i>:</p>`),
    formula('<i>v</i><sub>f</sub> = <i>n</i> · <i>f</i><sub>z</sub> · <i>z</i>'),
    tekst('<p>Kratko se kaže samo „posmak”, ali ga ne smiješ zamijeniti s <b>posmakom po zubu</b>. Na kvalitetu površine izravno ne djeluje <i>v</i><sub>f</sub>, nego <i>f</i><sub>z</sub> — put koji alat prijeđe od zahvata jedne oštrice do zahvata sljedeće. Isprobaj tri posmaka uz <b>n = 300 o/min</b> i <b>z = 5</b>.</p>'),
    h('div', { class: 'racun' }, kl.el, h('div', { class: 'ishod' }, iF, iK))),
    slika(sim.svg, 'Lukovi su tragovi oštrica (razmak povećan da se vidi); veći fz — grublja površina.')));
}]);

// ----------------------------------------------------------------- 13. Posmak po zubu
tema('posmak-po-zubu', 'Posmak po zubu', 'teh', [
  (box, api) => {
    const sim = PovrsinaSim('Trag oštrica pri različitom posmaku po zubu i broju oštrica');
    const sN = segment('Brzina vrtnje <i>n</i>', [0, 300], 300, 'o/min'), sZ = segment('Broj oštrica <i>z</i>', [5, 7], 5, '');
    const kF = stupnjevi('Posmak po zubu <i>f</i><sub>z</sub>', [0.1, 0.2, 0.3], 0.1, 'mm');
    const iF = ish('F = n · f<sub>z</sub> · z', 'mm/min'), iK = ish('Površina', '');
    const prom = new Set();
    const osvj = () => { const n = sN.v, z = sZ.v, fz = kF.vr(); sim.postavi({ n, z, fz }); iF.set(fmt(n * fz * z, 0)); iK.set(n ? sim.kvaliteta() : '—'); };
    sN.promjena = osvj; sZ.promjena = () => { prom.add('z'); osvj(); }; kF.promjena = () => { prom.add('f'); osvj(); }; osvj();
    box.append(dva(h('div', null, tekst(`<p>Posmak po zubu <i>f</i><sub>z</sub> određuje <b>kvalitetu površine</b>. Brzina gibanja alata računa se iz broja oštrica i brzine vrtnje:</p>`), formula('<i>v</i><sub>f</sub> = <i>n</i> · <i>f</i><sub>z</sub> · <i>z</i>'),
      tekst('<p>Broj oštrica izravno utječe na posmak. Isprobaj: uz isti <i>f</i><sub>z</sub> glodalo sa 7 oštrica ide brže od glodala s 5, a površina ostaje ista.</p>'),
      h('div', { class: 'racun' }, sN.el, sZ.el, kF.el, h('div', { class: 'ishod' }, iF, iK))), slika(sim.svg, 'Razmak tragova ovisi samo o fz; brzina gibanja o n · fz · z.')));
  },
  (box) => {
    box.append(tekst(`<p>Posmak po zubu ima smisla samo kod <b>glodala</b>. Kod <b>svrdla</b> se broj oštrica ne uzima u obzir: posmak se obično zadaje izravno (mm/min), a ponekad kao posmak po okretaju (mm).</p>`),
      h('div', { class: 'os-primjeri' },
        h('div', { class: 'racun' }, h('div', { class: 'racun-h' }, h('b', { text: 'Primjer: svrdlo Ø10' })),
          h('table', { class: 'os-tab', html: '<tbody><tr><td>posmak</td><td>150 mm/min</td></tr><tr><td>brzina rezanja</td><td>35 m/min</td></tr><tr><th>→ brzina vrtnje</th><th>≈ 1100 o/min</th></tr><tr><th>→ posmak po okretaju</th><th>≈ 0,14 mm</th></tr></tbody>' }),
          h('p', { class: 'pom', html: 'n = 35 · 1000 / (π · 10) ≈ 1114 o/min ≈ 1100 o/min; f = 150 / 1100 ≈ 0,14 mm' })),
        h('div', { class: 'racun' }, h('div', { class: 'racun-h' }, h('b', { text: 'Primjer: glodalo Ø10, 2 oštrice' })),
          h('table', { class: 'os-tab', html: '<tbody><tr><td>posmak po zubu</td><td>0,08 mm</td></tr><tr><td>brzina rezanja</td><td>120 m/min</td></tr><tr><th>→ brzina vrtnje</th><th>≈ 3800 o/min</th></tr><tr><th>→ posmak</th><th>≈ 600 mm/min</th></tr></tbody>' }),
          h('p', { class: 'pom', html: 'n = 120 · 1000 / (π · 10) ≈ 3820 o/min ≈ 3800 o/min; v<sub>f</sub> = 3800 · 0,08 · 2 ≈ 608 mm/min ≈ 600 mm/min' }))),
      tekst('<p>Kako se te vrijednosti upisuju u NC program (adrese S i F), vidjet ćeš u skupini <b>Programiranje</b>.</p>'));
  },
], { auto: true });

// ================================================================= PROGRAMIRANJE
tema('programiranje', 'Programiranje', 'skupina', [(box, api) => {
  box.append(tekst(`<p>Iz geometrije i tehnologije nastaje <b>NC program</b>. U ovoj skupini naučit ćeš:</p>
  <ul class="os-lista"><li>od čega se sastoji program: blok, riječ, adresa, vrijednost,</li><li>što se piše u zaglavlje: ravnina, pomak nultočke, način mjera i jedinice,</li>
  <li>adrese F, S, T, D i M za alat i tehnologiju,</li><li>naredbe gibanja G0, G1, G2 i G3 te kako se određuju I i J,</li><li>korekciju putanje G40, G41, G42 i korekcije alata,</li><li>čemu služe ciklusi i potprogrami.</li></ul>`));
  box.append(h('div', { class: 'os-gumbi' }, ...['grada', 'zaglavlje', 'adrese', 'gibanja', 'korekcija-putanje', 'korekcije-alata', 'ciklusi'].map((id) => { const b = h('button', { type: 'button', class: 'gumb tanki' }); b.addEventListener('click', () => api.idi(id)); queueMicrotask(() => { b.textContent = TEME.find((x) => x.id === id).naziv; }); return b; })));
}], { auto: true });

// ----------------------------------------------------------------- 15. Građa programa
const BLOK_PR = [['N', '10', 'broj bloka'], ['G', '1', 'pravocrtno gibanje posmakom'], ['X', '90.4', 'ciljni položaj na osi X'], ['Y', '20', 'ciljni položaj na osi Y'], ['F', '300', 'posmak 300 mm/min'], ['S', '1200', 'brzina vrtnje 1200 o/min'], ['M', '3', 'vreteno se vrti desno']];
const OBJ_BLOK = {
  blok: '<b>Blok</b> (NC rečenica): program je niz blokova. Svaki blok sadrži jednu ili više naredbi i počinje brojem bloka.',
  rijec: '<b>Riječ</b>: blok se sastoji od jedne ili više riječi. Riječ je, na primjer, naredba gibanja <code>G1</code> — „idi pravocrtno posmakom”.',
  adresa: '<b>Adresa</b>: riječ se sastoji od adrese i vrijednosti. Svako slovo adrese ima svoje značenje: <code>G</code> tvori pripremne (geometrijske) naredbe, <code>X</code> je os X, <code>F</code> posmak …',
  vrijednost: '<b>Vrijednost</b>: uz adresu uvijek ide vrijednost. Zajedno daju unaprijed određenu naredbu (<code>G1</code>) ili slobodno zadanu veličinu (položaj <code>X90.4</code>).',
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
    const red = blokInteraktivni(BLOK_PR, inf2, 'rijec');
    const seg = h('div', { class: 'segment', role: 'group', 'aria-label': 'Što istaknuti' });
    [['blok', 'Blok'], ['rijec', 'Riječ'], ['adresa', 'Adresa'], ['vrijednost', 'Vrijednost']].forEach(([k, t]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(k === 'rijec'), text: t });
      b.addEventListener('click', () => { red.dataset.nacin = k; inf.innerHTML = OBJ_BLOK[k]; $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
      seg.append(b);
    });
    box.append(tekst('<p>Numerički upravljani strojevi obrađuju obradak automatski prema <b>NC programu</b>. Građu i naredbe takvih programa za većinu upravljanja propisuju norme <b>DIN 66025</b> i <b>ISO 6983</b>.</p><p>Ispod je tipičan blok iz NC programa. Odaberi što želiš istaknuti, a zatim prijeđi mišem preko riječi ili je dodirni.</p>'),
      h('div', { class: 'racun' }, seg, red, inf, inf2));
  },
  (box) => {
    const red = h('div', { class: 'os-redoslijed' }, ...[['N', 'broj bloka'], ['G', 'pripremne funkcije'], ['X Y Z', 'koordinate'], ['F', 'posmak'], ['S', 'brzina vrtnje'], ['T', 'alat'], ['D', 'korekcija'], ['M', 'pomoćne funkcije']].map(([a, t], i) => h('div', { class: 'os-red-k' }, h('b', { text: a }), h('span', { text: t }), h('i', { text: String(i + 1) }))));
    box.append(tekst('<p><b>Oblik bloka.</b> Kao i obična rečenica, i NC blok ima pravila. Počinje <b>brojem bloka</b>, a zatim slijede riječi redom adresa:</p>'), red,
      tekst('<p>Primjer: <code>N10 G1 X90.4 Y20 F300 S1200 M3</code>. Upravljanje bi često prihvatilo i drukčiji redoslijed, ali se dogovorni redoslijed lakše čita i manje je pogrešaka.</p>'));
  },
], { auto: true });

// ----------------------------------------------------------------- 16. Zaglavlje programa (7 podstranica)
function crtezRavnina(odabir) {
  const svg = svgPlatno(440, 300, 'Kvadar s ravninama G17, G18 i G19');
  const s = 2.2, ox = 160, oy = 230, ky = 0.55, ay = 35 * PI / 180;
  const P = (x, y, z) => [r1(ox + x * s + y * s * ky * Math.cos(ay)), r1(oy - z * s - y * s * ky * Math.sin(ay))];
  const a = 80, b = 70, c = 45;
  const lice = (pts, cls, k) => sv('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + P(...p).join(' ')).join('') + 'Z', class: cls, 'data-r': k }, svg);
  lice([[0, 0, c], [a, 0, c], [a, b, c], [0, b, c]], 'oc-ravan', 'G17');
  lice([[0, 0, 0], [a, 0, 0], [a, 0, c], [0, 0, c]], 'oc-ravan', 'G18');
  lice([[a, 0, 0], [a, b, 0], [a, b, c], [a, 0, c]], 'oc-ravan', 'G19');
  const os = (do_, t) => { const [x1, y1] = P(-52, 0, 0), [x2, y2] = P(do_[0] - 52, do_[1], do_[2]); sv('line', { x1, y1, x2, y2, class: 'oc-os' }, svg); const c2 = { svg }; Crtez.prototype.strelica.call(c2, x2, y2, Math.atan2(y2 - y1, x2 - x1), 9, 'oc-osf'); const e = sv('text', { x: x2 + 6, y: y2 - 4, class: 'oc-txo' }, svg); e.textContent = t; };
  os([34, 0, 0], 'X'); os([0, 52, 0], 'Y'); os([0, 0, 38], 'Z');
  const alat = sv('g', { class: 'oc-alat-os' }, svg);
  const strelica = (od, do_) => { alat.innerHTML = ''; const [x1, y1] = P(...od), [x2, y2] = P(...do_); sv('line', { x1, y1, x2, y2, class: 'oc-alat-l' }, alat); Crtez.prototype.strelica.call({ svg: alat }, x2, y2, Math.atan2(y2 - y1, x2 - x1), 11, 'oc-alat-f'); };
  const OSI = { G17: [[a / 2, b / 2, c + 45], [a / 2, b / 2, c + 4]], G18: [[a / 2, -50, c / 2], [a / 2, -4, c / 2]], G19: [[a + 50, b / 2, c / 2], [a + 4, b / 2, c / 2]] };
  return { svg, P, dim: [a, b, c], odaberi(k) { $$('.oc-ravan', svg).forEach((e) => e.classList.toggle('akt', e.dataset.r === k)); strelica(...OSI[k]); } };
}
const MODAL_PROG = ['N10 G17 G54 G90 G94', 'N20 T1 M6', 'N30 G0 X10 Y10 S2000 M3', 'N40 G91 G1 X20 F200', 'N50 X20', 'N60 G90 G0 Z50'];
function aktivneFunkcije(do_) {
  const st = { ravnina: '—', pomak: '—', mjere: '—', posmak: '—', gibanje: '—' };
  for (let i = 0; i <= do_; i++) for (const w of MODAL_PROG[i].split(' ')) {
    if (/^G1[789]$/.test(w)) st.ravnina = w; else if (/^G5[4-7]$/.test(w)) st.pomak = w; else if (/^G9[01]$/.test(w)) st.mjere = w; else if (/^G9[45]$/.test(w)) st.posmak = w; else if (/^G[0-3]$/.test(w)) st.gibanje = w;
  }
  return st;
}
// pomak nultočke u praksi — nacrt X–Z, nultočka stroja M
function g54Praksa(box) {
  const c = new Crtez({ x0: -30, x1: 190, y0: -12, y1: 205, sir: 560, oznaka: 'Nacrt stroja: stol, obradak, nultočka stroja M i nultočka obratka W' });
  const OB = { x0: 12.563, x1: 112.563, z0: 104.883, z1: 134.883 }, STOL = { x0: -22, x1: 182, z0: 70, z1: 104.883 }, R = 5, Lal = 50;
  c.pravok(STOL.x0, STOL.z0, STOL.x1, STOL.z1, 'oc-stol'); c.pravok(OB.x0, OB.z0, OB.x1, OB.z1, 'oc-ob');
  c.lin(-25, 0, 186, 0, 'oc-tn'); c.lin(0, -8, 0, 200, 'oc-tn');
  c.M(0, 0); c.W(OB.x0, OB.z1, null, 'W');
  c.kotaH(0, OB.x0, 0, 160, 'X 12,563', null, { dx: 44 }); c.kotaV(0, OB.z1, 0, -16, 'Z 134,883');
  const gRez = c.g(), gAl = c.g('oc-alat-g'), alat = sv('rect', { class: 'oc-alat' }, gAl), drz = sv('rect', { class: 'oc-drzac' }, gAl);
  const udar = c.g('oc-udar'); udar.style.display = 'none';
  let poz = { x: 150, z: 185 };
  const crtaj = () => { alat.setAttribute('x', c.X(poz.x - R)); alat.setAttribute('y', c.Y(poz.z + Lal)); alat.setAttribute('width', r1(c.L(2 * R))); alat.setAttribute('height', r1(c.L(Lal))); drz.setAttribute('x', c.X(poz.x - 9)); drz.setAttribute('y', c.Y(poz.z + Lal + 12)); drz.setAttribute('width', r1(c.L(18))); drz.setAttribute('height', r1(c.L(12))); };
  crtaj();
  const P1 = ['% AB4711', 'N10 G17 G90 G94', 'N20 G54', 'N30 G0 X20 Y20', 'N40 G0 Z1', 'N50 G1 Z-5'];
  const P2 = ['% AB4711', 'N10 G17 G90 G94', 'N20 G0 X20 Y20', 'N30 G0 Z1', 'N40 G1 Z-5', 'N50 G1 X100 Y70'];
  const sProg = segment('Program', ['s G54', 'bez G54'], 's G54', ''), sTab = segment('Tablica pomaka', ['ispravne', '0.000'], 'ispravne', '');
  const listaOmot = h('div'), tab = h('table', { class: 'os-tab os-hmi-tab' });
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite' });
  let lista = null;
  const osvj = () => {
    lista = popisBlokova(sProg.v === 's G54' ? P1 : P2); listaOmot.innerHTML = ''; listaOmot.append(lista);
    const v = sTab.v === 'ispravne' ? ['12.563', '43.734', '134.883'] : ['0.000', '0.000', '0.000'];
    tab.innerHTML = `<thead><tr><th>Pomak</th><th>X</th><th>Y</th><th>Z</th></tr></thead><tbody><tr><td>G54</td><td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td></tr></tbody>`;
    vrati();
  };
  let stop = null;
  const vrati = () => { if (stop) stop(); stop = null; poz = { x: 150, z: 185 }; crtaj(); gRez.innerHTML = ''; udar.style.display = 'none'; udar.innerHTML = ''; por.textContent = ''; por.className = 'os-razina'; };
  sProg.promjena = osvj; sTab.promjena = osvj;
  const bStart = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bRes = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  bRes.addEventListener('click', vrati);
  bStart.addEventListener('click', () => {
    vrati();
    const ispravno = sProg.v === 's G54' && sTab.v === 'ispravne';
    const off = ispravno ? { x: 12.563, z: 134.883 } : { x: 0, z: 0 };
    const prog = sProg.v === 's G54' ? P1 : P2;
    const pom = [];
    prog.forEach((b, i) => { const mx = b.match(/X(-?[\d.]+)/), mz = b.match(/Z(-?[\d.]+)/); if (mx || mz) pom.push({ i, x: mx ? +mx[1] + off.x : null, z: mz ? +mz[1] + off.z : null, g0: /G0\b/.test(b) }); });
    let k = 0;
    const dalje = () => {
      if (k >= pom.length) { lista.oznaci(-1); por.className = 'os-razina dobro'; por.textContent = 'Obrada je ispravna: alat je došao na X20 Y20 u koordinatnom sustavu obratka i uronio 5 mm u obradak.'; return; }
      const m = pom[k++]; lista.oznaci(m.i);
      const a = Object.assign({}, poz), b = { x: m.x ?? a.x, z: m.z ?? a.z };
      // sudar: vrh alata ispod gornje plohe prepreke u području alata
      let zStop = null, tko = '';
      if (b.z < a.z) {
        const nadOB = b.x + R > OB.x0 && b.x - R < OB.x1, nadStol = b.x + R > STOL.x0 && b.x - R < STOL.x1;
        if (nadOB && m.g0 && b.z < OB.z1) { zStop = OB.z1; tko = 'obradak'; }
        else if (nadOB && !m.g0 && b.z < OB.z0) { zStop = OB.z0; tko = 'stol'; }
        else if (!nadOB && nadStol && b.z < STOL.z1) { zStop = STOL.z1; tko = 'stol'; }
      }
      const cilj = zStop != null ? { x: b.x, z: zStop } : b;
      const duz = Math.hypot(cilj.x - a.x, cilj.z - a.z);
      stop = animiraj(Math.max(250, duz / (m.g0 ? 140 : 30) * 1000), (u) => {
        poz = { x: a.x + (cilj.x - a.x) * u, z: a.z + (cilj.z - a.z) * u }; crtaj();
        if (!m.g0 && poz.z < OB.z1 && poz.x + R > OB.x0 && poz.x - R < OB.x1) { gRez.innerHTML = ''; c.pravok(poz.x - R, poz.z, poz.x + R, OB.z1, 'oc-rezf', gRez); }
      }, () => {
        if (zStop != null) {
          udar.style.display = ''; c.krug(poz.x, zStop, 9, 'oc-udar-k', udar); c.tekst(poz.x, zStop, 'SUDAR', 'oc-udar-t', udar, { dy: -26 });
          por.className = 'os-razina los';
          por.textContent = 'Sudar! ' + (sProg.v === 'bez G54' ? 'Bez G54 u programu' : 'S vrijednostima 0.000 u tablici') + ' upravljanje računa koordinate od nultočke stroja M, pa alat brzim hodom udari u ' + (tko === 'obradak' ? 'obradak' : 'stol') + '.';
          lista.oznaci(m.i); return;
        }
        stop = pauza(250, dalje);
      });
    };
    dalje();
  });
  naCiscenje(() => { if (stop) stop(); });
  osvj();
  box.append(dva(h('div', null, tekst('<p><b>Pomak nultočke u praksi.</b> Za ispravnu obradu moraju biti zadovoljena oba uvjeta: pomak (ovdje <code>G54</code>) mora biti pozvan u programu, a u tablici pomaka moraju biti upisane ispravne vrijednosti izmjerene pri postavljanju.</p><p>Odaberi kombinaciju i pokreni program tipkom CYCLE START.</p>'),
    h('div', { class: 'racun' }, sProg.el, sTab.el, tab, listaOmot, h('div', { class: 'os-gumbi' }, bStart, bRes), por)), slika(c.svg, 'Nacrt stroja (X–Z). Pomak u Y (43,734 mm) u nacrtu se ne vidi.')));
}
function g90g91(box) {
  const c = new Crtez({ x0: -8, x1: 172, y0: -18, y1: 26, sir: 560, oznaka: 'Os X s alatom za usporedbu G90 i G91' });
  c.lin(0, 0, 165, 0, 'oc-os'); c.strelica(c.X(166), c.Y(0), 0, 10, 'oc-osf');
  for (let x = 0; x <= 160; x += 20) { c.lin(x, -2, x, 2, 'oc-os'); c.tekst(x, 0, String(x), 'oc-txs', null, { dy: 16 }); }
  c.W(0, 0, null, ''); c.tekst(166, 0, 'X', 'oc-txo', null, { dy: -8 });
  const gPut = c.g(); const alat = c.krug(20, 10, 6, 'oc-alat');
  let x = 20, stop = null;
  const por = h('p', { class: 'os-info', 'aria-live': 'polite', html: 'Alat je na <b>X20</b>.' });
  const idi = (cilj, txt) => {
    if (stop) stop();
    if (cilj > 160) { por.innerHTML = 'Pomak bi izveo alat iz prikaza (X' + cilj + '). Klikni „Vrati na X20”.'; return; }
    const a = x, l = c.lin(a, 10, a, 10, 'oc-putl', gPut);
    stop = animiraj(600, (u) => { const xx = a + (cilj - a) * u; alat.setAttribute('cx', c.X(xx)); l.setAttribute('x2', c.X(xx)); }, () => { x = cilj; por.innerHTML = txt + ' → alat je sada na <b>X' + cilj + '</b>.'; });
  };
  const b1 = h('button', { type: 'button', class: 'gumb', html: '<code>G90 X40</code>' }), b2 = h('button', { type: 'button', class: 'gumb', html: '<code>G91 X40</code>' }), b3 = h('button', { type: 'button', class: 'gumb tanki', text: 'Vrati na X20' });
  b1.addEventListener('click', () => idi(40, 'G90 X40: idi NA položaj X40'));
  b2.addEventListener('click', () => idi(x + 40, 'G91 X40: idi ZA 40 mm u smjeru +X'));
  b3.addEventListener('click', () => { if (stop) stop(); x = 20; gPut.innerHTML = ''; alat.setAttribute('cx', c.X(20)); por.innerHTML = 'Alat je na <b>X20</b>.'; });
  naCiscenje(() => { if (stop) stop(); });
  box.append(tekst(`<p><b>Način mjera.</b> Položaje koje alat treba doseći možeš zadati u odnosu na koordinatni sustav obratka (<b>apsolutno</b>) ili u odnosu na trenutačni položaj alata (<b>inkrementalno</b>). Prema DIN/ISO apsolutno se uključuje s <code>G90</code>, a inkrementalno s <code>G91</code> (vidi vježbe u skupini Geometrija).</p>
    <div class="okvir"><p><code>G90</code> — idi <b>NA</b> položaj X/Y<br><code>G91</code> — idi <b>ZA</b> … mm u X/Y</p></div><p>Pri uključivanju stroja aktivan je <code>G90</code>. Isprobaj: klikni više puta na <code>G91 X40</code>.</p>`),
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
    const tb = h('table', { class: 'os-tab' }), lista = popisBlokova(MODAL_PROG);
    const osvj = (i) => { lista.oznaci(i); const st = aktivneFunkcije(i); tb.innerHTML = `<thead><tr><th>Skupina</th><th>Aktivno nakon bloka ${MODAL_PROG[i].split(' ')[0]}</th></tr></thead><tbody><tr><td>izbor ravnine</td><td>${st.ravnina}</td></tr><tr><td>pomak nultočke</td><td>${st.pomak}</td></tr><tr><td>način mjera</td><td>${st.mjere}</td></tr><tr><td>jedinica posmaka</td><td>${st.posmak}</td></tr><tr><td>vrsta gibanja</td><td>${st.gibanje}</td></tr></tbody>`; };
    $$('li', lista).forEach((li, i) => { li.tabIndex = 0; li.setAttribute('role', 'button'); li.addEventListener('click', () => osvj(i)); li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); osvj(i); } }); });
    osvj(0);
    box.append(dva(tekst(`<p>Na početak programa korisno je napisati osnovne funkcije koje vrijede za cijeli program:</p>
      <table class="os-tab"><tbody><tr><td>izbor ravnine</td><td><code>G17</code> <code>G18</code> <code>G19</code></td></tr><tr><td>pomak nultočke</td><td><code>G54</code> … <code>G57</code></td></tr><tr><td>način mjera</td><td><code>G90</code> <code>G91</code></td></tr><tr><td>mjerne jedinice posmaka</td><td><code>G94</code> <code>G95</code></td></tr></tbody></table>
      <p>Funkcije su razvrstane u <b>skupine</b>. Svaka ostaje aktivna — djeluje <b>modalno</b> — sve dok se ne programira druga funkcija iz iste skupine i time je poništi.</p>`),
      h('div', { class: 'racun' }, h('p', { class: 'pom', text: 'Klikni blok i pogledaj što je aktivno nakon njega:' }), lista, tb)));
  },
  (box) => {
    const cr = crtezRavnina(); const inf = info('');
    const OPIS = { G17: '<code>G17</code> — ravnina X/Y, alat je okomit na nju u smjeru osi Z (najčešće kod glodanja).', G18: '<code>G18</code> — ravnina Z/X, os alata je Y.', G19: '<code>G19</code> — ravnina Y/Z, os alata je X.' };
    const gumbi = h('div', { class: 'segment', role: 'group', 'aria-label': 'Ravnina obrade' });
    ['G17', 'G18', 'G19'].forEach((k) => { const b = h('button', { type: 'button', 'aria-pressed': String(k === 'G17'), text: k }); const f = () => { cr.odaberi(k); inf.innerHTML = OPIS[k]; $$('button', gumbi).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; b.addEventListener('click', f); b.addEventListener('pointerenter', f); b.addEventListener('focus', f); gumbi.append(b); });
    cr.odaberi('G17'); inf.innerHTML = OPIS.G17;
    box.append(dva(h('div', null, tekst('<p><b>Izbor ravnine.</b> Pri glodanju postoje tri moguće ravnine obrade, a programiraju se s <code>G17</code>, <code>G18</code> i <code>G19</code>. Alat stoji okomito na ravninu obrade. Najčešće je os alata Z, a ravnina obrade X/Y — to je <code>G17</code>.</p><p>Ravninu ne treba programirati ako je već određena građom stroja.</p>'), gumbi, inf), slika(cr.svg, 'Istaknuta je ravnina obrade, strelica pokazuje os alata.')));
  },
  (box) => {
    const c = new Crtez({ x0: -12, x1: 200, y0: -14, y1: 120, sir: 540, oznaka: 'Tlocrt stola: nultočka stroja M, obradak i nultočka obratka W' });
    c.pravok(-4, -6, 196, 112, 'oc-stol'); c.pravok(60, 40, 160, 100, 'oc-ob');
    c.M(0, 0); c.W(60, 40, null, 'W');
    c.strelicaMM(0, 0, 60, 0, 'oc-off', null, 9); c.strelicaMM(60, 0, 60, 40, 'oc-off', null, 9);
    c.tekst(30, 0, 'pomak X', 'oc-txr', null, { dy: -6 }); c.tekst(60, 20, 'pomak Y', 'oc-txr', null, { dx: 6, a: 'start' });
    c.lin(60, 40, 180, 40, 'oc-os'); c.lin(60, 40, 60, 112, 'oc-os'); c.tekst(178, 40, 'X', 'oc-txo', null, { dy: -6 }); c.tekst(60, 110, 'Y', 'oc-txo', null, { dx: 8, a: 'start' });
    box.append(dva(tekst(`<p><b>Pomak nultočke (teorija).</b> Da bi položaj nultočke obratka W u radnom prostoru bio jednoznačan, stroj ima svoju <b>nultočku stroja M</b>, a <b>pomak nultočke</b> opisuje gdje je W u odnosu na M.</p>
      <p>Pomak se određuje mjerenjem pripremka pri postavljanju stroja i upisuje u tablicu. Ovisno o upravljanju, može se spremiti velik broj pomaka. U programu se pozivaju naredbama <code>G54</code>, <code>G55</code> … , a poništavaju npr. naredbom <code>G53</code>.</p>`), slika(c.svg, 'Pomak nultočke: od M do W u X i Y (i u Z, koji se u tlocrtu ne vidi).')));
  },
  (box) => g54Praksa(box),
  (box) => g90g91(box),
  (box) => {
    box.append(tekst(`<p><b>Mjerne jedinice.</b> Uz dosad opisane funkcije postoje i druge koje se jednom napišu na početku programa ako vrijede za cijeli program. Takva je jedinica posmaka:</p>`),
      h('table', { class: 'os-tab', html: '<thead><tr><th>Funkcija</th><th>Značenje adrese F</th><th>Primjer</th></tr></thead><tbody><tr><td><code>G94</code></td><td>posmak u mm/min</td><td><code>G94 F200</code> — alat se giba 200 mm/min</td></tr><tr><td><code>G95</code></td><td>posmak u mm po okretaju</td><td><code>G95 F0.1 S2000</code> — 0,1 mm/okr · 2000 o/min = 200 mm/min</td></tr></tbody>' }),
      tekst('<p>Pri uključivanju stroja aktivan je <code>G94</code>.</p>'));
  },
], { auto: true });

// ----------------------------------------------------------------- 17. Adrese F, S, T, D, M
const ADRESE = {
  F: '<b>F — posmak.</b> Ovisno o tome je li aktivan G94 ili G95, F je posmak u mm/min ili u mm po okretaju. <code>F400</code> ovdje znači da se alat giba 400 mm/min.',
  S: '<b>S — brzina vrtnje.</b> <code>S4000</code> znači da se vreteno vrti 4000 okretaja u minuti.',
  T: '<b>T — broj alata.</b> Vrijednost nakon T je broj alata; često je jednaka broju mjesta u spremniku. Na taj broj vezane su i korekcije u tablici alata.',
  D: '<b>D — broj korekcije.</b> Ako alat ima više oštrica s vlastitim podacima, D bira odgovarajući slog korekcija. Ako D nije programiran, automatski vrijedi <code>D1</code>.',
  M: '<b>M — pomoćne funkcije.</b> Pozivaju razne funkcije stroja; većinu određuje proizvođač stroja, a samo su neke normirane. Uz poziv alata najčešće su: <code>M3</code> vreteno desno, <code>M4</code> vreteno lijevo, <code>M5</code> stop vretena, <code>M6</code> izmjena alata, <code>M8</code> hlađenje uključeno, <code>M9</code> hlađenje isključeno.',
};
const ADR_PROG = [['N120 T4 M6', 'poziv i izmjena alata'], ['N130 G0 X45 Y32', 'dolazak brzim hodom'], ['N140 G0 Z2 S4000 M3 M8', '… s brzinom vrtnje, desno, hlađenje'], ['N150 G1 Z-6 F200', 'uranjanje smanjenim posmakom'], ['N160 G1 X72 F400', 'glodanje utora većim posmakom']];
tema('adrese', 'Adrese F, S, T, D, M', 'pro', [(box) => {
  const inf = info('Prijeđi mišem preko obojenih adresa ili ih dodirni.');
  const tipicni = h('div', { class: 'os-blok os-adr-blok' });
  [['T', '1'], ['D', '1'], ['F', '400'], ['S', '4000'], ['M', '3']].forEach(([a, v]) => { const b = h('button', { type: 'button', class: 'os-rijec os-boja-' + a, 'aria-label': 'Adresa ' + a }, h('span', { class: 'os-a', text: a }), h('span', { class: 'os-v', text: v })); const f = () => { inf.innerHTML = ADRESE[a]; $$('.os-rijec', tipicni).forEach((x) => x.classList.toggle('akt', x === b)); }; b.addEventListener('click', f); b.addEventListener('pointerenter', f); b.addEventListener('focus', f); tipicni.append(b); });
  const sim = new Sim2D({ x: [0, 110], y: [0, 62], z: [-22, 50], ob: { x0: 8, x1: 102, y0: 6, y1: 56, z0: -20, z1: 0 }, R: 4, L: 26, start: { x: 96, y: 58, z: 36 }, sakrijAlat: true, oznaka: 'Animacija programa N120 do N160 u nacrtu i tlocrtu' });
  const lista = h('ol', { class: 'os-prog os-prog-op' }); ADR_PROG.forEach(([b, o]) => lista.append(h('li', null, h('code', { html: blokHTML(b) }), h('span', { text: o }))));
  const oznaci = (i) => $$('li', lista).forEach((li, j) => li.classList.toggle('akt', j === i));
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  const reset = () => { sim.sakrij = true; sim.vrati({ x: 96, y: 58, z: 36 }); oznaci(-1); };
  bR.addEventListener('click', reset);
  bS.addEventListener('click', () => {
    reset(); let st = { T: '', S: '', M: '', F: '' }; const stat = () => sim.postaviStatus([st.T, st.S, st.M, st.F].filter(Boolean).join(' · '));
    sim.izvedi([
      { tip: 'cekaj', ms: 700, b: 0, prije: () => { sim.sakrij = false; sim.crtajAlat(); st.T = 'T4'; stat(); } },
      { tip: 'G0', x: 45, y: 32, b: 1 },
      { tip: 'G0', z: 2, b: 2, prije: () => { st.S = 'S4000 M3'; st.M = 'M8'; stat(); sim.hladenje(true); } },
      { tip: 'G1', z: -6, b: 3, prije: () => { st.F = 'F200'; stat(); } },
      { tip: 'G1', x: 72, b: 4, prije: () => { st.F = 'F400'; stat(); } },
    ], (m) => oznaci(m.b), () => oznaci(-1));
  });
  naCiscenje(() => sim.zaustavi());
  box.append(tekst('<p>Adresama <b>F, S, T, D</b> i <b>M</b> poziva se alat i zadaje posmak, brzina i smjer vrtnje. Ispod su riječi tipičnog poziva alata — prijeđi mišem preko obojenih adresa:</p>'), tipicni, inf,
    tekst('<p>Dogovorno se F, S, T i M u bloku pišu tim redom, a jedan blok smije imati više M funkcija. Često se ipak poziv alata i tehnološki podaci pišu u zasebne blokove, na primjer:</p>'),
    dva(h('div', null, lista, h('div', { class: 'os-gumbi' }, bS, bR)), slika(sim.svg, 'Glodalo Ø8 mm (naša pretpostavka); gornja ploha obratka je Z0.')));
}], { auto: true });

// ----------------------------------------------------------------- 18. Naredbe gibanja G0, G1, G2, G3
function shemaGibanja(k) {
  const svg = svgPlatno(220, 140, 'Shema naredbe ' + k), C = { svg };
  const t = (x, y, s, cls) => { const e = sv('text', { x, y, class: cls || 'oc-txs', 'text-anchor': 'middle' }, svg); e.textContent = s; };
  sv('circle', { cx: 30, cy: 110, r: 5, class: 'oc-tk-s' }, svg); t(30, 132, 'početak');
  if (k === 'G0' || k === 'G1') { sv('line', { x1: 30, y1: 110, x2: 186, y2: 34, class: k === 'G0' ? 'oc-put-g0 deb' : 'oc-putl' }, svg); Crtez.prototype.strelica.call(C, 190, 32, Math.atan2(-78, 160), 11, 'oc-strf'); t(186, 22, 'cilj'); }
  else { const cw = k === 'G2'; sv('path', { d: cw ? 'M30 110 A80 80 0 0 1 190 110' : 'M30 110 A80 80 0 0 0 190 110', class: 'oc-putl' }, svg); Crtez.prototype.strelica.call(C, 190, 110, cw ? PI / 2 : -PI / 2, 11, 'oc-strf'); sv('circle', { cx: 110, cy: 110, r: 3, class: 'oc-tk-s' }, svg); t(110, 100, 'središte'); t(190, 132, 'cilj'); }
  return svg;
}
function simGibanja(start, blokovi, pomaci, oznaka) {
  const sim = new Sim2D({ x: [0, 95], y: [0, 52], z: [-12, 40], ob: { x0: 4, x1: 90, y0: 4, y1: 48, z0: -10, z1: 0 }, R: 4, L: 22, start, oznaka });
  const lista = popisBlokova(blokovi);
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  const reset = () => { sim.vrati(start); lista.oznaci(-1); };
  bR.addEventListener('click', reset);
  bS.addEventListener('click', () => { reset(); sim.izvedi(pomaci, (m) => lista.oznaci(m.b), () => lista.oznaci(-1)); });
  naCiscenje(() => sim.zaustavi());
  return dva(h('div', null, lista, h('div', { class: 'os-gumbi' }, bS, bR), h('p', { class: 'pom', html: 'Isprekidano: brzi hod G0 · puna crta: posmak G1.' })), slika(sim.svg));
}
function lukVjezba(box, k) {
  const G2 = k === 'G2', S = G2 ? [40, 50] : [50, 40], C = [70, 70], E = G2 ? [50, 100] : [100, 50];
  const I = C[0] - S[0], J = C[1] - S[1], r = Math.hypot(I, J);
  console.assert(Math.abs(Math.hypot(E[0] - C[0], E[1] - C[1]) - r) < 1e-9, 'krajnja točka nije na kružnici');
  const c = new Crtez({ x0: -6, x1: 122, y0: -6, y1: 116, sir: 500, oznaka: k + ': početna točka, središte i krajnja točka luka' });
  c.mreza(10); c.osi({ xa: -4, xb: 118, ya: -4, yb: 112, oznake: 20 }); c.W(0, 0, null, '');
  const a0 = Math.atan2(S[1] - C[1], S[0] - C[0]); let a1 = Math.atan2(E[1] - C[1], E[0] - C[0]), d = a1 - a0;
  if (G2) { while (d >= 0) d -= 2 * PI; } else { while (d <= 0) d += 2 * PI; }
  c.krug(C[0], C[1], r, 'oc-tn oc-crt');
  const gK = c.g(), gL = c.g();
  const tS = c.g('oc-pol'); c.tocka(...S, 5, 'oc-tk', tS); c.tekst(...S, 'početna točka', 'oc-txb', tS, { dx: G2 ? -8 : -8, dy: 18, a: 'end' });
  const tE = c.g('oc-cilj'); c.tocka(...E, 5, 'oc-tk', tE); c.tekst(...E, 'krajnja točka X' + E[0] + ' Y' + E[1], 'oc-txb', tE, { dx: 8, dy: G2 ? -8 : 18, a: 'start' });
  const tC = c.g(); c.tocka(...C, 4, 'oc-tk-s', tC); c.tekst(...C, 'središte', 'oc-txb', tC, { dx: 8, dy: -8, a: 'start' });
  const alat = c.tocka(...S, 8, 'oc-alat oc-alat-t');
  const koraci = [
    () => { gK.innerHTML = ''; c.strelicaMM(S[0], S[1], C[0], S[1], 'oc-komp-l', gK, 8); c.strelicaMM(C[0], S[1], C[0], C[1], 'oc-komp-l', gK, 8); c.tekst((S[0] + C[0]) / 2, S[1], 'I', 'oc-txr', gK, { dy: 16 }); c.tekst(C[0], (S[1] + C[1]) / 2, 'J', 'oc-txr', gK, { dx: 8, a: 'start' });
      return '<b>1. korak — rastavi put usporedno s osima.</b> Od početne točke do središta idi najprije usporedno s osi X (to je <b>I</b>), a zatim usporedno s osi Y (to je <b>J</b>).'; },
    () => { gK.innerHTML = ''; c.strelicaMM(S[0], S[1], C[0], S[1], 'oc-komp-l', gK, 8); c.strelicaMM(C[0], S[1], C[0], C[1], 'oc-komp-l', gK, 8); c.tekst((S[0] + C[0]) / 2, S[1], String(Math.abs(I)), 'oc-txr', gK, { dy: 16 }); c.tekst(C[0], (S[1] + C[1]) / 2, String(Math.abs(J)), 'oc-txr', gK, { dx: 8, a: 'start' });
      return `<b>2. korak — izračunaj duljine.</b> U smjeru X: ${C[0]} − ${S[0]} = ${Math.abs(I)} mm. U smjeru Y: ${C[1]} − ${S[1]} = ${Math.abs(J)} mm.`; },
    () => '<b>3. korak — odredi predznak.</b> Gledaj od početne točke prema središtu i usporedi sa smjerom osi. Ovdje se ide u smjeru <b>+X</b> i <b>+Y</b>, pa su I i J pozitivni. <br>Upiši I i J.',
  ];
  let kk = 0;
  const opis = h('p', { class: 'os-korak', 'aria-live': 'polite' });
  const nap = h('span', { class: 'os-nap-k', text: '1/3' });
  const bK = h('button', { type: 'button', class: 'gumb tanki', text: 'Sljedeći korak' });
  const unos = h('div', { class: 'os-unos', hidden: true }, h('div', { class: 'os-unos-h' }, h('span', { text: 'Središte luka (inc)' })));
  const iI = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'I' }), iJ = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'J' });
  const bIn = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' }), por = h('p', { class: 'os-por', 'aria-live': 'polite' });
  const blok = h('p', { class: 'os-blok-rez', hidden: true });
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START', hidden: true });
  unos.append(h('div', { class: 'os-polja' }, h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: 'I' }), iI, h('em', { text: 'inc' })), h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: 'J' }), iJ, h('em', { text: 'inc' }))), h('div', { class: 'os-gumbi' }, bIn), por);
  const pokaziKorak = () => { opis.innerHTML = koraci[kk](); nap.textContent = (kk + 1) + '/3'; bK.hidden = kk >= 2; unos.hidden = kk < 2; if (kk >= 2) iI.focus({ preventScroll: true }); };
  bK.addEventListener('click', () => { if (kk < 2) { kk++; pokaziKorak(); } });
  const provjeri = () => {
    const vi = broj(iI.value), vj = broj(iJ.value);
    if (vi === null || vj === null) return (por.textContent = 'Upiši I i J.', por.className = 'os-por krivo');
    if (Number.isNaN(vi) || Number.isNaN(vj)) return (por.textContent = 'Upiši brojeve (decimalni znak zarez ili točka).', por.className = 'os-por krivo');
    const ok = Math.abs(vi - I) < 0.01 && Math.abs(vj - J) < 0.01;
    if (!ok) { por.className = 'os-por krivo'; por.textContent = (Math.abs(Math.abs(vi) - Math.abs(I)) < 0.01 && Math.abs(Math.abs(vj) - Math.abs(J)) < 0.01) ? 'Duljine su dobre, ali provjeri predznak: gledaj od početne točke prema središtu.' : 'Netočno. I je udaljenost od početne točke do središta u smjeru X, J u smjeru Y.'; return; }
    por.className = 'os-por tocno'; por.textContent = 'Točno.';
    blok.hidden = false; blok.innerHTML = `<code>${k} X${E[0]} Y${E[1]} I${I} J${J}</code> — X i Y su krajnja točka (apsolutno), I i J središte (inkrementalno od početne točke).`;
    bS.hidden = false; bS.focus({ preventScroll: true });
  };
  bIn.addEventListener('click', provjeri); [iI, iJ].forEach((u) => u.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (u === iI && iJ.value.trim() === '') iJ.focus(); else provjeri(); } }));
  let stop = null;
  bS.addEventListener('click', () => {
    if (stop) stop(); gL.innerHTML = '';
    const p = c.put('', 'oc-putl', gL);
    stop = animiraj(1400, (u) => { const kut = a0 + d * u; p.setAttribute('d', c.lukD(C[0], C[1], r, a0, kut)); alat.setAttribute('cx', c.X(C[0] + r * Math.cos(kut))); alat.setAttribute('cy', c.Y(C[1] + r * Math.sin(kut))); });
  });
  naCiscenje(() => { if (stop) stop(); });
  pokaziKorak();
  const uvod = G2 ? `<p><b>G2 — kružno gibanje u smjeru kazaljke na satu.</b> Adrese X i Y daju <b>krajnju točku</b> (najčešće apsolutno), a adrese I i J <b>središte</b> luka (najčešće inkrementalno od početne točke):</p><ul class="os-lista"><li><b>I</b> je udaljenost od početne točke do središta u smjeru X,</li><li><b>J</b> je udaljenost od početne točke do središta u smjeru Y.</li></ul>`
    : `<p><b>G3 — kružno gibanje suprotno od kazaljke na satu.</b> Sve vrijedi kao za G2: X i Y su krajnja točka, I i J središte, inkrementalno od početne točke. I i J odredi u tri ista koraka.</p>`;
  box.append(dva(h('div', null, tekst(uvod), h('div', { class: 'racun' }, h('div', { class: 'racun-h' }, h('b', { text: 'Određivanje I i J' }), nap), opis, bK, unos, blok, h('div', { class: 'os-gumbi' }, bS))), slika(c.svg, `Početna točka X${S[0]} Y${S[1]}, središte X${C[0]} Y${C[1]}, polumjer ≈ ${fmt(r, 2)} mm.`)));
}
tema('gibanja', 'Naredbe gibanja G0, G1, G2, G3', 'pro', [
  (box) => {
    const inf = h('div', { class: 'os-shema' }); const opisi = { G0: 'G0 — pozicioniranje brzim hodom', G1: 'G1 — pravocrtno gibanje posmakom', G2: 'G2 — kružno gibanje u smjeru kazaljke na satu', G3: 'G3 — kružno gibanje suprotno od kazaljke na satu' };
    const seg = h('div', { class: 'segment', role: 'group', 'aria-label': 'Naredba gibanja' });
    const pok = (k) => { inf.innerHTML = ''; inf.append(shemaGibanja(k), h('p', { class: 'pom', text: opisi[k] })); $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x.textContent === k))); };
    ['G0', 'G1', 'G2', 'G3'].forEach((k) => { const b = h('button', { type: 'button', 'aria-pressed': 'false', text: k }); b.addEventListener('click', () => pok(k)); b.addEventListener('pointerenter', () => pok(k)); b.addEventListener('focus', () => pok(k)); seg.append(b); });
    pok('G0');
    box.append(dva(h('div', null, tekst('<p>Osi alata gibaju se naredbama gibanja <b>G0</b> do <b>G3</b>:</p><table class="os-tab"><tbody><tr><td><code>G0</code></td><td>pozicioniranje brzim hodom</td></tr><tr><td><code>G1</code></td><td>pravocrtno gibanje posmakom</td></tr><tr><td><code>G2</code></td><td>kružno gibanje u smjeru kazaljke na satu</td></tr><tr><td><code>G3</code></td><td>kružno gibanje suprotno od kazaljke na satu</td></tr></tbody></table><p>Odaberi naredbu za shemu.</p>'), seg), inf));
    box.append(tekst('<p>Primjer: alat ide brzim hodom iz trenutačnog položaja na <code>X10 Y30 Z2</code>, a zatim posmakom na <code>X70</code>. Klikni CYCLE START.</p>'),
      simGibanja({ x: 82, y: 46, z: 30 }, ['G0 X10 Y30 Z2', 'G1 X70 F300'], [{ tip: 'G0', x: 10, y: 30, z: 2, b: 0 }, { tip: 'G1', x: 70, b: 1 }], 'Animacija G0 i G1'));
  },
  (box) => {
    box.append(tekst('<p><b>G0 — pozicioniranje brzim hodom.</b> Osi se gibaju najvećom mogućom brzinom do programiranog cilja. Pritom u pravilu samo jedan pogon osi postigne najveću brzinu, a brzine ostalih osi upravljanje prilagodi tako da gibanje bude pravocrtno. Brzim hodom se ne reže!</p>'),
      simGibanja({ x: 70, y: 25, z: 30 }, ['; pozicioniranje u ravnini', 'G0 X10', '; dostava okomito', 'G0 Z1'], [{ tip: 'G0', x: 10, b: 1 }, { tip: 'G0', z: 1, b: 3 }], 'Animacija G0 X10 i G0 Z1'));
  },
  (box) => {
    box.append(tekst('<p><b>G1 — pravocrtno gibanje posmakom.</b> Osi se gibaju programiranim posmakom F po pravcu do zadanog cilja. F može biti aktivan modalno iz nekog prethodnog bloka ili se programira zajedno s G1 u istom bloku.</p>'),
      simGibanja({ x: 10, y: 25, z: 1 }, ['; uranjanje s G1', 'G1 Z-5 F100', '; glodanje utora s G1', 'G1 X80 F300'], [{ tip: 'G1', z: -5, b: 1 }, { tip: 'G1', x: 80, b: 3 }], 'Animacija G1 Z-5 i G1 X80'));
  },
  (box) => lukVjezba(box, 'G2'),
  (box) => lukVjezba(box, 'G3'),
], { auto: true });

// ----------------------------------------------------------------- 19. Korekcija putanje alata
const KOR_RIJESENO = new Set();
function putanjaSredista(m, s, R) { // m = −1: kontura ulijevo (1/2), +1: udesno (2/2); s: +1 G41, −1 G42, 0 G40
  const S = [20 * -m, -60];
  const el = [{ t: 'L', a: [0, -40], b: [45 * m, -40] }, { t: 'A', a: [45 * m, -40], b: [55 * m, -30], c: [45 * m, -30], cw: m < 0 }, { t: 'L', a: [55 * m, -30], b: [55 * m, 0] }];
  const off = (e) => {
    if (e.t === 'L') { const dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1], L = Math.hypot(dx, dy), nx = -dy / L * s * R, ny = dx / L * s * R; return { t: 'L', a: [e.a[0] + nx, e.a[1] + ny], b: [e.b[0] + nx, e.b[1] + ny] }; }
    const r = Math.hypot(e.a[0] - e.c[0], e.a[1] - e.c[1]), r2 = e.cw ? r + s * R : r - s * R;
    const pr = (p) => [e.c[0] + (p[0] - e.c[0]) / r * r2, e.c[1] + (p[1] - e.c[1]) / r * r2];
    return { t: 'A', a: pr(e.a), b: pr(e.b), c: e.c, r: r2, cw: e.cw };
  };
  const o = el.map(off);
  return [{ t: 'L', a: S, b: o[0].a }, ...o];
}
function korekcijaPutanje(box, m) {
  const ime = m < 0 ? '1/2' : '2/2', tocno = m < 0 ? 'G41' : 'G42', R = 5;
  const prog = ['N1 G17 G54 G90', 'N2 T1 M6', `N3 G0 X${-20 * m} Y-60 S1200 M3`, 'N4 G0 Z1', 'N5 G1 Z-5 F100', 'N6', 'N7 G1 X0 Y-40 F350 M8', `N8 G1 X${45 * m}`, `N9 ${m < 0 ? 'G2' : 'G3'} X${55 * m} Y-30 I0 J10`, 'N10 G1 Y0'];
  const c = new Crtez({ x0: -78, x1: 78, y0: -72, y1: 50, sir: 540, oznaka: 'Obradak s konturom i putanjom središta alata' });
  c.pravok(-55, -40, 55, 40, 'oc-ob', null, 10);
  c.osi({ xa: -70, xb: 72, ya: -68, yb: 46 }); c.W(0, 0, null, '');
  c.kotaH(-55, 55, 40, 46, '110'); c.kotaV(-40, 40, 55, 66, '80');
  c.kotaV(-60, 0, -20 * m, -20 * m + (m < 0 ? 12 : -12), '60'); c.kotaH(0, -20 * m, -60, -68, '20');
  c.tekst(49 * m, -36, 'R10', 'oc-kt', null, { dy: 4 });
  const kontura = [[20 * -m, -60], [0, -40], [45 * m, -40]];
  const gKon = c.g('oc-kontura'); c.poli(kontura, 'oc-l oc-crt', gKon); c.luk(45 * m, -30, 10, -PI / 2, m < 0 ? -PI : 0, 'oc-l oc-crt', gKon); c.lin(55 * m, -30, 55 * m, 0, 'oc-l oc-crt', gKon);
  c.tocka(20 * -m, -60, 4, 'oc-tk-s'); c.tekst(20 * -m, -60, 'start', 'oc-txs', null, { dx: m < 0 ? 8 : -8, dy: 4, a: m < 0 ? 'start' : 'end' });
  const gTrag = c.g(), gSr = c.g();
  const alat = c.krug(20 * -m, -60, R, 'oc-alat oc-alat-pr');
  // N6: odabir klikom (i povlačenjem mišem)
  let odabrano = null;
  const lista = popisBlokova(prog); const n6 = $$('li', lista)[5];
  const utor = h('span', { class: 'os-utor', 'aria-live': 'polite', text: '___' }); n6.querySelector('code').append(' ', utor);
  n6.addEventListener('dragover', (e) => e.preventDefault()); n6.addEventListener('drop', (e) => { e.preventDefault(); postavi(e.dataTransfer.getData('text/plain')); });
  const cipovi = h('div', { class: 'cipovi', role: 'group', 'aria-label': 'Funkcija za blok N6' });
  const postavi = (k) => { if (!/^G4[012]$/.test(k)) return; odabrano = k; utor.textContent = k; utor.classList.add('pun'); $$('.cip', cipovi).forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === k))); por.textContent = 'U blok N6 upisano je ' + k + '. Pokreni simulaciju tipkom CYCLE START.'; por.className = 'os-razina'; vrati(); };
  ['G40', 'G41', 'G42'].forEach((k) => { const b = h('button', { type: 'button', class: 'cip', draggable: 'true', 'aria-pressed': 'false', text: k }); b.addEventListener('click', () => postavi(k)); b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', k); }); cipovi.append(b); });
  const por = h('p', { class: 'os-razina', 'aria-live': 'polite', text: 'Klikni G40, G41 ili G42 (ili ga povuci u blok N6).' });
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  let stop = null;
  const vrati = () => { if (stop) stop(); stop = null; gTrag.innerHTML = ''; gSr.innerHTML = ''; alat.setAttribute('cx', c.X(20 * -m)); alat.setAttribute('cy', c.Y(-60)); lista.oznaci(-1); };
  bR.addEventListener('click', () => { vrati(); });
  bS.addEventListener('click', () => {
    if (!odabrano) { por.className = 'os-razina slabo'; por.textContent = 'Najprije u blok N6 stavi G40, G41 ili G42.'; return; }
    vrati();
    const s = odabrano === 'G41' ? 1 : odabrano === 'G42' ? -1 : 0, ok = odabrano === tocno;
    const seg = putanjaSredista(m, s, R);
    const tragD = [], sredD = [];
    const trag = c.put('', ok ? 'oc-zahvat' : 'oc-zarez', gTrag); trag.setAttribute('stroke-width', r1(c.L(2 * R)));
    const sred = c.put('', 'oc-sred', gSr);
    let i = 0; const blokovi = [6, 7, 8, 9];
    const dalje = () => {
      if (i >= seg.length) {
        lista.oznaci(-1);
        if (ok) { por.className = 'os-razina dobro'; por.textContent = 'Ispravno: ' + odabrano + ' drži središte alata ' + R + ' mm izvan konture (s lijeve strane gledano u smjeru gibanja za G41, s desne za G42), pa oštrica ide točno po konturi.'; KOR_RIJESENO.add(m); if (KOR_RIJESENO.size === 2 && korApi) korApi.gotovo(); }
        else if (s === 0) { por.className = 'os-razina los'; por.textContent = 'Alat zareže u dio: s G40 središte alata ide po konturi, pa glodalo odnese ' + R + ' mm (polumjer alata) previše.'; }
        else { por.className = 'os-razina los'; por.textContent = 'Alat zareže u dio: korekcija je na krivoj strani — središte je ' + R + ' mm unutar konture, pa glodalo odnese ' + 2 * R + ' mm previše. Gledaj u smjeru gibanja: na kojoj je strani materijal?'; }
        return;
      }
      const e = seg[i++]; lista.oznaci(blokovi[Math.min(i - 1, 3)]);
      const t0 = tragD.join('');
      if (e.t === 'L') {
        stop = animiraj(Math.max(250, Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) / 40 * 1000), (u) => { const x = e.a[0] + (e.b[0] - e.a[0]) * u, y = e.a[1] + (e.b[1] - e.a[1]) * u; const d = (t0 || `M${c.X(e.a[0])} ${c.Y(e.a[1])}`) + `L${c.X(x)} ${c.Y(y)}`; trag.setAttribute('d', d); sred.setAttribute('d', d); alat.setAttribute('cx', c.X(x)); alat.setAttribute('cy', c.Y(y)); },
          () => { tragD.length = 0; tragD.push((t0 || `M${c.X(e.a[0])} ${c.Y(e.a[1])}`) + `L${c.X(e.b[0])} ${c.Y(e.b[1])}`); stop = pauza(100, dalje); });
      } else {
        const a0 = Math.atan2(e.a[1] - e.c[1], e.a[0] - e.c[0]); let a1 = Math.atan2(e.b[1] - e.c[1], e.b[0] - e.c[0]), dd = a1 - a0;
        if (e.cw) { while (dd >= 0) dd -= 2 * PI; } else { while (dd <= 0) dd += 2 * PI; }
        stop = animiraj(Math.max(300, Math.abs(dd) * e.r / 40 * 1000), (u) => { const k = a0 + dd * u; const d = t0 + c.lukD(e.c[0], e.c[1], e.r, a0, k, true); trag.setAttribute('d', d); sred.setAttribute('d', d); alat.setAttribute('cx', c.X(e.c[0] + e.r * Math.cos(k))); alat.setAttribute('cy', c.Y(e.c[1] + e.r * Math.sin(k))); },
          () => { tragD.length = 0; tragD.push(t0 + c.lukD(e.c[0], e.c[1], e.r, a0, a1, true)); stop = pauza(100, dalje); });
      }
    };
    dalje();
  });
  naCiscenje(() => { if (stop) stop(); });
  box.append(dva(h('div', null, tekst(`<p><b>Program ${ime}.</b> Kontura se glodala ${m < 0 ? 'ulijevo' : 'udesno'} uz donji rub obratka. Glodalo ima promjer 10 mm (R = ${R} mm).</p>`), cipovi, lista, h('div', { class: 'os-gumbi' }, bS, bR), por),
    slika(c.svg, 'Isprekidano: programirana kontura · puna crta: putanja središta alata · pojas: ono što glodalo odnese.')));
}
let korApi = null;
tema('korekcija-putanje', 'Korekcija putanje alata', 'pro', [
  (box, api) => { korApi = api; box.append(tekst('<table class="os-tab"><tbody><tr><td><code>G40</code></td><td>bez korekcije putanje ili poništenje korekcije</td></tr><tr><td><code>G41</code></td><td>korekcija putanje lijevo od konture</td></tr><tr><td><code>G42</code></td><td>korekcija putanje desno od konture</td></tr></tbody></table><p>„Lijevo” i „desno” gleda se <b>u smjeru gibanja alata</b>. S uključenom korekcijom programiraš konturu iz crteža, a upravljanje samo pomakne središte alata za njegov polumjer. Stavi G40, G41 ili G42 u blok N6 i pokreni simulaciju.</p>')); korekcijaPutanje(box, -1); },
  (box, api) => { korApi = api; korekcijaPutanje(box, 1); },
]);

// ----------------------------------------------------------------- 20. Korekcije alata
const ALATI = { T1: { naziv: 'čeono glodalo', L: 95.2, R: 31.5 }, T2: { naziv: 'glodalo', L: 121.9, R: 6 } };
tema('korekcije-alata', 'Korekcije alata', 'pro', [(box, api) => {
  const vidjeno = new Set();
  const crt = h('div');
  const tb = h('table', { class: 'os-tab os-hmi-tab', html: '<thead><tr><th>T</th><th>D</th><th>vrsta</th><th>duljina L1</th><th>polumjer R</th></tr></thead><tbody>' + Object.entries(ALATI).map(([k, a]) => `<tr data-t="${k}"><td>${k.slice(1)}</td><td>1</td><td>${a.naziv}</td><td>${a.L.toFixed(3)}</td><td>${a.R.toFixed(3)}</td></tr>`).join('') + '</tbody>' });
  const crtaj = (k) => {
    const a = ALATI[k]; crt.innerHTML = '';
    const c = new Crtez({ x0: -48, x1: 62, y0: -132, y1: 34, sir: 380, oznaka: 'Alat ' + k + ' u vretenu s kotama duljine i polumjera' });
    c.pravok(-26, 6, 26, 32, 'oc-stol'); c.tekst(0, 19, 'vreteno', 'oc-txs', null, { dy: 4 });
    c.lin(-40, 0, 40, 0, 'oc-l oc-crt'); c.tekst(-40, 0, 'referentna točka', 'oc-txs', null, { dy: -5, a: 'start' });
    c.lin(0, 30, 0, -a.L - 6, 'oc-tn oc-crt');
    if (k === 'T1') { c.poli([[-16, 0], [16, 0], [16, -40], [-16, -40]], 'oc-drzac', null, true); c.poli([[-a.R, -60], [a.R, -60], [a.R, -a.L], [-a.R, -a.L]], 'oc-alat', null, true); c.poli([[-12, -40], [12, -40], [12, -60], [-12, -60]], 'oc-drzac', null, true); }
    else { c.poli([[-16, 0], [16, 0], [16, -45], [-16, -45]], 'oc-drzac', null, true); c.poli([[-a.R, -45], [a.R, -45], [a.R, -a.L], [-a.R, -a.L]], 'oc-alat', null, true); for (let y = -80; y > -a.L + 2; y -= 9) c.lin(-a.R, y, a.R, y - 6, 'oc-tn'); }
    c.kotaV(0, -a.L, Math.max(16, a.R), Math.max(16, a.R) + 12, 'L = ' + fmt(a.L, 1));
    c.kotaH(0, a.R, -a.L, -a.L - 12, 'R = ' + fmt(a.R, 1));
    crt.append(slika(c.svg, k + ' — ' + a.naziv + ': duljina L od referentne točke do vrha, polumjer R.'));
    $$('tr[data-t]', tb).forEach((tr) => tr.classList.toggle('sel', tr.dataset.t === k));
    vidjeno.add(k); if (vidjeno.size === 2) api.gotovo();
  };
  const sT = segment('Alat', ['T1', 'T2'], 'T1', ''); sT.promjena = crtaj; crtaj('T1');
  box.append(dva(h('div', null, tekst('<p>Duljina i polumjer svakog alata upisuju se u <b>spremnik korekcija alata</b> (Tool compensations). Svaki alat ima svoj broj. Prema tom broju upravljanje samo izračunava putanju za stvarne mjere alata — u programu se zato piše kontura iz crteža, a ne putanja središta alata.</p>'), sT.el, tb, tekst('<p class="pom">Duljina se mjeri od referentne točke vretena do vrha alata; polumjer koristi korekcija putanje G41/G42.</p>')), crt));
}]);

// ----------------------------------------------------------------- 21. Ciklusi / potprogrami
function ciklus(box, vrsta) {
  const krug = vrsta === 'krug';
  const sim = new Sim2D({ x: [0, 160], y: [0, 90], z: [-16, 36], ob: { x0: 8, x1: 152, y0: 2, y1: 84, z0: -14, z1: 0 }, R: krug ? 2.5 : 5, L: krug ? 30 : 24, start: { x: 150, y: 86, z: 30 }, oznaka: krug ? 'Ciklus kruga provrta u nacrtu i tlocrtu' : 'Ciklus pravokutnog džepa u nacrtu i tlocrtu' });
  const tb = h('table', { class: 'os-tab' });
  const pomaci = [];
  if (krug) {
    tb.innerHTML = '<tbody><tr><td>referentna točka X</td><td>75</td></tr><tr><td>referentna točka Y</td><td>35</td></tr><tr><td>polumjer</td><td>25 *</td></tr><tr><td>početni kut</td><td>0° *</td></tr><tr><td>kut koraka</td><td>60° *</td></tr><tr><td>dubina bušenja</td><td>−5</td></tr><tr><td>broj provrta</td><td>6</td></tr></tbody>';
    for (let i = 0; i < 6; i++) { const a = i * 60 * PI / 180, x = 75 + 25 * Math.cos(a), y = 35 + 25 * Math.sin(a); pomaci.push({ tip: 'G0', x, y, z: 2 }, { tip: 'G1', x: x + 0.01, z: -5 }, { tip: 'G0', z: 2 }); }
    pomaci.push({ tip: 'G0', z: 30 });
  } else {
    tb.innerHTML = '<tbody><tr><td>referentna točka X</td><td>80</td></tr><tr><td>referentna točka Y</td><td>50</td></tr><tr><td>duljina džepa</td><td>30</td></tr><tr><td>širina džepa</td><td>20</td></tr><tr><td>dubina džepa</td><td>−10</td></tr><tr><td>polumjer kuta</td><td>6</td></tr></tbody>';
    const cx = 80, cy = 50; pomaci.push({ tip: 'G0', x: cx, y: cy, z: 2 });
    for (const z of [-5, -10]) pomaci.push({ tip: 'G1', z }, { tip: 'G1', x: cx - 5 }, { tip: 'G1', x: cx + 5 }, { tip: 'G1', x: cx + 10, y: cy - 5 }, { tip: 'G1', x: cx + 10, y: cy + 5 }, { tip: 'G1', x: cx - 10 }, { tip: 'G1', y: cy - 5 }, { tip: 'G1', x: cx + 10 }, { tip: 'G1', x: cx, y: cy });
    pomaci.push({ tip: 'G0', z: 30 });
  }
  const bS = h('button', { type: 'button', class: 'os-tipka os-cstart', text: 'CYCLE START' }), bR = h('button', { type: 'button', class: 'os-tipka', text: 'RESET' });
  const por = h('p', { class: 'os-info', 'aria-live': 'polite' });
  const reset = () => { sim.vrati({ x: 150, y: 86, z: 30 }); por.textContent = ''; };
  bR.addEventListener('click', reset);
  bS.addEventListener('click', () => { reset(); sim.postaviStatus(krug ? 'svrdlo Ø5' : 'glodalo Ø10'); sim.izvedi(pomaci, null, () => { por.textContent = krug ? 'Gotovo: jednim pozivom ciklusa izbušeno je šest provrta.' : 'Gotovo: jednim pozivom ciklusa izglodan je džep 30 × 20 × 10 mm u dva prolaza po dubini.'; }); });
  naCiscenje(() => sim.zaustavi());
  box.append(dva(h('div', null, tekst(krug ? '<p><b>Primjer 1/2: krug provrta.</b> Umjesto da programiraš svaki provrt, ciklusu zadaš parametre, a on sam izračuna položaje i redom ih izbuši:</p>' : '<p><b>Primjer 2/2: pravokutni džep.</b> Ciklus iz zadanih mjera sam izračuna prolaze glodala po širini i dubini:</p>'), tb,
    tekst(krug ? '<p class="pom">* Polumjer, početni kut i kut koraka su naše vrijednosti za ovaj primjer.</p>' : '<p class="pom">Glodalo Ø10 mm i raspored prolaza su naša pretpostavka; stvarni ciklus prolaze računa sam.</p>'), h('div', { class: 'os-gumbi' }, bS, bR), por), slika(sim.svg)));
}
tema('ciklusi', 'Ciklusi / potprogrami', 'pro', [
  (box) => { box.append(tekst('<p><b>Ciklusi</b> su potprogrami kojima se zadaju parametri, a služe za cijele „lance gibanja” — npr. bušenje niza provrta ili glodanje džepa. Ciklusi postoje za mnoge obrade, a za posebne slijedove možeš napisati i vlastite potprograme.</p>')); ciklus(box, 'krug'); },
  (box) => { ciklus(box, 'dzep'); },
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

// ---- Geometrija: položaji
const TOCKE_TEST = (() => { const t = []; for (const sx of [1, -1]) for (const sy of [1, -1]) { for (const [x, y] of [[10, 10], [140, 10], [10, 90], [140, 90], [25, 50], [125, 50]]) t.push([sx * x, sy * y]); } return t; })();
function crtezPolozaja(T) {
  const c = new Crtez({ x0: -172, x1: 176, y0: -118, y1: 122, sir: 600, oznaka: 'Ploča s četiri polja i provrtima; tražena točka je istaknuta' });
  c.pravok(-150, -100, 150, 100, 'oc-ob');
  for (const sx of [1, -1]) for (const sy of [1, -1]) { c.pravok(sx * 10, sy * 10, sx * 140, sy * 90, 'oc-dzep'); c.krug(sx * 25, sy * 50, 6, 'oc-rupa'); c.krug(sx * 125, sy * 50, 6, 'oc-rupa'); }
  c.osi({ xa: -156, xb: 166, ya: -106, yb: 116, minus: true }); c.W(0, 0);
  ordinate(c, [[10, -90], [25, -50], [125, -50], [140, -90]], 'x', -106);
  ordinate(c, [[10, -140], [50, -125], [90, -140]], 'y', -156);
  c.kotaH(0, 150, 100, 116, '150'); c.kotaV(0, 100, 150, 168, '100');
  if (T) { const g = c.g('oc-trazena'); c.tocka(T[0], T[1], 9, 'oc-tr-k', g); c.tocka(T[0], T[1], 3, 'oc-tr-s', g); c.tekst(T[0], T[1], '?', 'oc-tr-t', g, { dx: T[0] > 0 ? 14 : -14, dy: T[1] > 0 ? -10 : 20 }); }
  return c;
}
function korakPolozaji(el, gotovo) {
  const izbor = izmijesaj(TOCKE_TEST).slice(0, 5);
  korakNiz(el, izbor.map((T) => (host, sljedeci) => {
    const c = crtezPolozaja(T); const x = ulaz('X', 'abs'), y = ulaz('Y', 'abs'); const por = h('p', { class: 'os-por' });
    const b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => {
      if (x.i.value.trim() === '' || y.i.value.trim() === '') { por.className = 'os-por krivo'; por.textContent = 'Upiši X i Y.'; return; }
      const ok = jednako(x.i.value, T[0]) && jednako(y.i.value, T[1]); x.i.disabled = y.i.disabled = b.disabled = true;
      povratna(por, ok, ok ? '' : 'Točka je X' + fmt(T[0]) + ' Y' + fmt(T[1]) + '.'); sljedeci(ok ? 1 : 0);
    };
    b.addEventListener('click', prov); enterNa([x.i, y.i], prov);
    host.append(dva(h('div', null, h('p', { html: 'Upiši koordinate istaknute točke (W je u sredini ploče; crtež je simetričan s obzirom na osi X i Y):' }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, x.el, y.el), h('div', { class: 'os-gumbi' }, b), por)), slika(c.svg)));
    x.i.focus({ preventScroll: true });
  }), gotovo);
}
// ---- Geometrija: pravci
const PRAVCI = [[[-20, 10], [30, 40], [50, -10]], [[40, -20], [-10, 30], [-40, -10]], [[-30, -30], [20, -10], [0, 40]]];
function korakPravci(el, gotovo) {
  const [A, M, B] = PRAVCI[Math.floor(Math.random() * PRAVCI.length)];
  const c = new Crtez({ x0: -52, x1: 62, y0: -42, y1: 52, sir: 520, oznaka: 'Početna točka, međutočka i krajnja točka na mreži 10 mm' });
  c.mreza(10); c.osi({ xa: -50, xb: 58, ya: -40, yb: 48, oznake: 10 }); c.W(0, 0, null, '');
  c.poli([A, M, B], 'oc-putl'); c.strelica(c.X(B[0]), c.Y(B[1]), Math.atan2(c.Y(B[1]) - c.Y(M[1]), c.X(B[0]) - c.X(M[0])), 10, 'oc-strf');
  [[A, 'P1'], [M, 'međutočka'], [B, 'P2']].forEach(([p, t]) => { c.tocka(p[0], p[1], 5, 'oc-tk-s'); c.tekst(p[0], p[1], t, 'oc-txb', null, { dx: 9, dy: -8, a: 'start' }); });
  const faze = [['Upiši koordinate <b>početne točke P1</b> (apsolutno):', 'abs', A], ['Upiši put od P1 do <b>međutočke</b> (inkrementalno):', 'inc', [M[0] - A[0], M[1] - A[1]]], ['Upiši put od međutočke do <b>krajnje točke P2</b> (inkrementalno):', 'inc', [B[0] - M[0], B[1] - M[1]]]];
  const host = h('div'); el.append(dva(host, slika(c.svg)));
  korakNiz(host, faze.map(([t, oz, v]) => (hh, sljedeci) => {
    const x = ulaz('X', oz), y = ulaz('Y', oz), por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => { if (x.i.value.trim() === '' || y.i.value.trim() === '') { por.className = 'os-por krivo'; por.textContent = 'Upiši X i Y.'; return; } const ok = jednako(x.i.value, v[0]) && jednako(y.i.value, v[1]); x.i.disabled = y.i.disabled = b.disabled = true; povratna(por, ok, ok ? '' : 'Točno je X' + fmt(v[0]) + ' Y' + fmt(v[1]) + '.'); sljedeci(ok ? 1 : 0); };
    b.addEventListener('click', prov); enterNa([x.i, y.i], prov);
    hh.append(h('p', { html: t }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, x.el, y.el), h('div', { class: 'os-gumbi' }, b), por)); x.i.focus({ preventScroll: true });
  }), gotovo);
}
// ---- Tehnologija
const BRZINE = [[63, 200], [80, 150], [125, 100], [40, 120], [50, 90]];
function korakBrzina(el, gotovo) {
  const izbor = izmijesaj(BRZINE).slice(0, 3);
  korakNiz(el, izbor.map(([d, vc]) => (host, sljedeci) => {
    const n = vc * 1000 / (PI * d), u = ulaz('n', 'o/min'), por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => { const v = broj(u.i.value); if (v == null || Number.isNaN(v)) { por.className = 'os-por krivo'; por.textContent = 'Upiši broj.'; return; } const ok = Math.abs(v - n) <= n * 0.03; u.i.disabled = b.disabled = true; povratna(por, ok, 'n = ' + vc + ' · 1000 / (π · ' + d + ') ≈ ' + fmt(n, 0) + ' o/min.'); sljedeci(ok ? 1 : 0); };
    b.addEventListener('click', prov); enterNa([u.i], prov);
    host.append(h('p', { html: `Glodalo promjera <b>d = ${d} mm</b> treba rezati brzinom <b>v<sub>c</sub> = ${vc} m/min</b>. Kolika je brzina vrtnje? (dopušteno odstupanje ±3 %)` }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, u.el), h('div', { class: 'os-gumbi' }, b), por)); u.i.focus({ preventScroll: true });
  }), gotovo);
}
function korakPovrsina(el, gotovo) {
  const n = [100, 200, 300][Math.floor(Math.random() * 3)], fz = [0.1, 0.2, 0.3][Math.floor(Math.random() * 3)], z = [5, 7, 10][Math.floor(Math.random() * 3)];
  const F2 = [150, 300, 450][Math.floor(Math.random() * 3)], fz2 = F2 / 1500;
  korakNiz(el, [
    (host, sljedeci) => {
      const F = n * fz * z, u = ulaz('F', 'mm/min'), por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
      const prov = () => { const v = broj(u.i.value); if (v == null || Number.isNaN(v)) { por.className = 'os-por krivo'; por.textContent = 'Upiši broj.'; return; } const ok = Math.abs(v - F) < 0.6; u.i.disabled = b.disabled = true; povratna(por, ok, 'F = ' + n + ' · ' + fmt(fz, 1) + ' · ' + z + ' = ' + fmt(F, 0) + ' mm/min.'); sljedeci(ok ? 1 : 0); };
      b.addEventListener('click', prov); enterNa([u.i], prov);
      host.append(h('p', { html: `Zadano je <b>n = ${n} o/min</b>, <b>f<sub>z</sub> = ${fmt(fz, 1)} mm</b>, <b>z = ${z}</b>. Koliki je posmak F u mm/min?` }), h('div', { class: 'os-unos' }, h('div', { class: 'os-polja' }, u.el), h('div', { class: 'os-gumbi' }, b), por)); u.i.focus({ preventScroll: true });
    },
    (host, sljedeci) => host.append(pitanjeMCQ(`Glodalo s <b>z = 5</b> oštrica vrti se s <b>n = 300 o/min</b>, a posmak je <b>F = ${F2} mm/min</b>. Kakva je površina?`, ['fina', 'srednja', 'gruba'], Math.round(fz2 * 10) - 1, sljedeci)),
    (host, sljedeci) => host.append(pitanjeMCQ('Uz iste <b>n</b> i <b>f<sub>z</sub></b> umjesto glodala s 5 uzmeš glodalo sa 7 oštrica. Što se događa s kvalitetom površine?', ['Poboljšava se.', 'Ne mijenja se — određuje je f<sub>z</sub>, a posmak F raste.', 'Pogoršava se.'], 1, sljedeci)),
    (host, sljedeci) => host.append(pitanjeMCQ('Što se događa ako namjestiš <b>f<sub>z</sub> = 0,3 mm</b> umjesto 0,1 mm, a n i z ostanu isti?', ['Posmak raste.', 'Posmak se ne mijenja.', 'Posmak se smanjuje.'], 0, sljedeci)),
    (host, sljedeci) => host.append(pitanjeMCQ('Posmak F i brzina vrtnje n ostaju isti, a umjesto 5 oštrica uzmeš glodalo sa 7. Što se događa s kvalitetom površine?', ['Poboljšava se — f<sub>z</sub> je manji.', 'Ne mijenja se.', 'Pogoršava se.'], 0, sljedeci)),
  ], gotovo);
}
// ---- Programiranje: pojmovi (12 pitanja)
const PIT_PRO = [
  ['Kojim se slovom adrese programiraju pripremne funkcije?', ['A', 'G', 'F', 'M', 'S'], 1],
  ['Od čega se sastoji programska riječ?', ['samo od slova adrese', 'od više povezanih naredbi', 'od niza slova adresa', 'od slova adrese i vrijednosti'], 3],
  ['Koji NC blok odgovara uputi: „Idi posmakom za 20 mm u negativnom smjeru osi X”?', ['<code>G91 G1 X20</code>', '<code>G0 X20</code>', '<code>G90 G1 X20</code>', '<code>G91 G1 X-20</code>'], 3],
  ['Pozovi glodalo T1 koje reže pri vrtnji udesno i namjesti brzinu vrtnje 600 o/min.', ['<code>G3 X600 M1</code>', '<code>S600 T1 M4</code>', '<code>G1 F600 M5</code>', '<code>S600 T1 M3</code>'], 3],
  ['Programiraj posmak od 140 mm/min.', ['<code>S140</code>', '<code>F140</code>', '<code>M140</code>', '<code>D140</code>'], 1],
  ['Alat je na X0 Y0. Što radi blok <code>G3 X-20 Y20 I-20 J0</code>?', ['Alat opisuje četvrtinu kruga u smjeru kazaljke na satu.', 'Alat opisuje puni krug suprotno od kazaljke na satu.', 'Alat opisuje četvrtinu kruga suprotno od kazaljke na satu.', 'Alat se pomakne za 20 mm na položaj X−20 Y20.'], 2],
  ['Što znači adresa S?', ['posmak', 'brzina vrtnje vretena', 'okomita koordinata', 'broj alata'], 1],
  ['Kojim se slovom adrese programiraju strojne (pomoćne) funkcije?', ['G', 'S', 'F', 'M', 'R'], 3],
  ['Koja tvrdnja o nultočki obratka je točna?', ['Unaprijed je određena na stroju.', 'Slobodno je bira programer ili operater.', 'Određuje je referentna točka.', 'Uvijek je u sredini obratka.'], 1],
  ['Od čega se sastoji NC program?', ['od poziva alata', 'od tablice znakova', 'od naredbi (instrukcija)', 'od definicija ravnina'], 2],
  ['Koja tvrdnja <b>ne vrijedi</b> za cikluse?', ['Olakšavaju programiranje.', 'Štede memoriju.', 'Služe za cikličko ponavljanje iste obrade.', 'Razlikuju se od upravljanja do upravljanja.'], 2],
];
const PAROVI = [['G2', 'G3', 'luk u smjeru kazaljke na satu', 'luk suprotno od kazaljke na satu'], ['G90 X40', 'G91 X40', 'idi NA položaj X40', 'idi ZA 40 mm u smjeru X'], ['M3', 'M5', 'vreteno desno', 'stop vretena'], ['G17', 'G18', 'ravnina X/Y', 'ravnina Z/X'], ['G41', 'G42', 'korekcija putanje lijevo', 'korekcija putanje desno']];
function korakPojmovi(el, gotovo) {
  const zad = PIT_PRO.map(([p, o, t]) => (host, sljedeci) => host.append(pitanjeMCQ(p, o, t, sljedeci)));
  zad.push((host, sljedeci) => {
    const redovi = PAROVI.map(([a, b, ta, tb]) => { const zamj = Math.random() < 0.5; return { a, b, ta: zamj ? tb : ta, tb: zamj ? ta : tb, tocno: !zamj, odg: null }; });
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
function korakBlokovi(el, gotovo) {
  korakNiz(el, [
    (host, sljedeci) => {
      const OZ = [['①', 'Blok'], ['②', 'Riječ'], ['③', 'Adresa'], ['④', 'Vrijednost']];
      const blok = h('div', { class: 'os-blok-test', html: '<span class="os-bt-cijeli" data-z="①"><span>N10 G17 </span><span class="os-bt-dio" data-z="②">G54</span><span> G90 </span><span class="os-bt-dio" data-z="③">F</span><span>200 S</span><span class="os-bt-dio" data-z="④">3000</span><span> T1 M03</span></span>' });
      const sel = OZ.map(([z]) => { const s = h('select', { 'aria-label': 'Pojam za oznaku ' + z }, h('option', { value: '', text: '— odaberi —' }), ...OZ.map(([, t]) => h('option', { value: t, text: t }))); return { z, s, el: h('label', { class: 'os-pridr' }, h('b', { text: z }), s) }; });
      const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
      bp.addEventListener('click', () => {
        if (sel.some((x) => !x.s.value)) { por.className = 'os-por krivo'; por.textContent = 'Pridruži pojam svakoj oznaci.'; return; }
        let n = 0; sel.forEach((x, k) => { const ok = x.s.value === OZ[k][1]; if (ok) n++; x.el.classList.add(ok ? 'ok' : 'ne'); x.s.disabled = true; }); bp.disabled = true;
        por.className = 'os-por ' + (n === 4 ? 'tocno' : 'krivo'); por.textContent = 'Točno pridruženo: ' + n + '/4. (① cijeli blok, ② riječ G54, ③ adresa F, ④ vrijednost 3000)'; sljedeci(n);
      });
      host.append(h('p', { class: 'pit', text: 'Pridruži pojmove označenim dijelovima bloka:' }), blok, h('div', { class: 'os-pridr-r' }, ...sel.map((x) => x.el)), bp, por);
    },
    (host, sljedeci) => {
      const c = new Crtez({ x0: -6, x1: 66, y0: -6, y1: 60, sir: 300, oznaka: 'Tlocrt' }); c.mreza(10); c.osi({ xa: -4, xb: 62, ya: -4, yb: 56, oznake: 10 }); c.W(0, 0, null, '');
      c.lin(20, 18, 40, 48, 'oc-putl'); c.tocka(20, 18, 5, 'oc-tk-s'); c.tocka(40, 48, 5, 'oc-tk-s'); c.tekst(20, 18, 'P1', 'oc-txb', null, { dx: 8, dy: 12, a: 'start' }); c.tekst(40, 48, 'P2', 'oc-txb', null, { dx: 8, dy: -6, a: 'start' });
      const n = new Crtez({ x0: -6, x1: 66, y0: -10, y1: 10, sir: 300, oznaka: 'Nacrt' }); n.lin(-4, 0, 62, 0, 'oc-os'); n.tekst(62, 0, 'Z0', 'oc-txs', null, { dy: -5, a: 'end' }); n.lin(20, 5, 40, -2, 'oc-putl'); n.tocka(20, 5, 4, 'oc-tk-s'); n.tocka(40, -2, 4, 'oc-tk-s'); n.tekst(20, 5, 'P1 (Z5)', 'oc-txs', null, { dy: -8 }); n.tekst(40, -2, 'P2 (Z−2)', 'oc-txs', null, { dy: 16 });
      const omot = h('div', { class: 'os-dvije-sl' }, slika(c.svg, 'Tlocrt (X–Y)'), slika(n.svg, 'Nacrt (X–Z)'));
      host.append(pitanjeMCQ('Crtež pokazuje putanju glodala od P1 do P2 (posmakom). Koji je blok programiran? Alat je bio u P1.', ['<code>G1 Z-12 F40</code>', '<code>G90 G1 X40 Y48</code>', '<code>G91 G1 X20 Y30 Z-7</code>', '<code>G0 X40 Y48 Z-12</code>'], 2, sljedeci, omot));
    },
    (host, sljedeci) => {
      const cr = crtezRavnina(); const [a, b, c] = cr.dim; const lab = (p, t) => { const [x, y] = cr.P(...p); const e = sv('text', { x, y: y + 6, class: 'oc-ravan-oz', 'text-anchor': 'middle' }, cr.svg); e.textContent = t; };
      lab([a / 2, b / 2, c], 'A'); lab([a / 2, 0, c / 2], 'B'); lab([a, b / 2, c / 2], 'C');
      const tocno = { A: 'G17', B: 'G18', C: 'G19' };
      const sel = ['A', 'B', 'C'].map((k) => { const s = h('select', { 'aria-label': 'Naredba za ravninu ' + k }, h('option', { value: '', text: '— odaberi —' }), ...['G17', 'G18', 'G19'].map((g) => h('option', { value: g, text: g }))); return { k, s, el: h('label', { class: 'os-pridr' }, h('b', { text: k }), s) }; });
      const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
      bp.addEventListener('click', () => { if (sel.some((x) => !x.s.value)) { por.className = 'os-por krivo'; por.textContent = 'Pridruži naredbu svakoj ravnini.'; return; } let n = 0; sel.forEach((x) => { const ok = x.s.value === tocno[x.k]; if (ok) n++; x.el.classList.add(ok ? 'ok' : 'ne'); x.s.disabled = true; }); bp.disabled = true; por.className = 'os-por ' + (n === 3 ? 'tocno' : 'krivo'); por.textContent = 'Točno: ' + n + '/3 (A = G17, B = G18, C = G19).'; sljedeci(n); });
      host.append(dva(h('div', null, h('p', { class: 'pit', text: 'Pridruži odgovarajuću naredbu trima vidljivim ravninama kvadra (smjer osi prikazan je lijevo od kvadra):' }), h('div', { class: 'os-pridr-r' }, ...sel.map((x) => x.el)), bp, por), slika(cr.svg)));
    },
    (host, sljedeci) => {
      const red = ['T1 M6', 'G0 X50 Y20 S1200 M3 M8', 'G0 Z1', 'G1 Z-5 F200', 'G1 X120 F400'];
      const s = slagalica(izmijesaj(red), ['N40', 'N50', 'N60', 'N70', 'N80'], red);
      const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
      bp.addEventListener('click', () => { if (!s.puno()) { por.className = 'os-por krivo'; por.textContent = 'Popuni svih pet blokova.'; return; } const n = s.provjeri(); bp.disabled = true; por.className = 'os-por ' + (n === 5 ? 'tocno' : 'krivo'); por.textContent = 'Na pravom mjestu: ' + n + '/5.'; sljedeci(n); });
      host.append(h('p', { class: 'pit', text: 'Složi blokove za glodanje utora u smislen redoslijed:' }), s, bp, por);
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
// ---- Programiranje: G2/G3 općenito
function korakG23opce(el, gotovo) {
  const c = new Crtez({ x0: -8, x1: 142, y0: -8, y1: 112, sir: 460, oznaka: 'Luk od točke A polumjera 20 mm' });
  c.osi({ xa: -6, xb: 138, ya: -6, yb: 108 }); c.W(0, 0, null, '');
  c.luk(100, 90, 20, -PI / 2, 0, 'oc-putl'); c.strelica(c.X(120), c.Y(90), -PI / 2, 10, 'oc-strf');
  c.tocka(100, 70, 5, 'oc-tk-s'); c.tekst(100, 70, 'A', 'oc-txb', null, { dx: -10, dy: 4, a: 'end' }); c.tocka(100, 90, 3, 'oc-tk-s');
  c.lin(100, 90, 100 + 20 * Math.cos(-2.4), 90 + 20 * Math.sin(-2.4), 'oc-tn'); c.tekst(92, 86, 'R20', 'oc-kt', null, { a: 'end' });
  ordinate(c, [[100, 70], [120, 90]], 'x', -2); ordinate(c, [[70, 100], [90, 120]], 'y', -2);
  const TV = [
    ['Luk se programira naredbom G3.', true], ['Luk se programira naredbom G2.', false], ['Krajnja točka je X120 Y90.', true], ['Krajnja točka je X100 Y70.', false], ['Uz G90 su X i Y krajnje točke zadani apsolutno, od W.', true],
    ['I = 0', true], ['J = 20', true], ['I = 20', false], ['J = −20', false], ['Središte je 20 mm iznad točke A.', true],
  ];
  const grupa = (od, do_) => { const g = h('div', { class: 'os-tvrdnje' }); TV.slice(od, do_).forEach(([t], k) => { const b = h('button', { type: 'button', class: 'os-tvrdnja', 'aria-pressed': 'false', 'data-k': od + k, html: t }); b.addEventListener('click', () => { if (g.closest('.os-g23').zak) return; b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); }); g.append(b); }); return g; };
  const omot = h('div', { class: 'os-g23' });
  const por = h('p', { class: 'os-por' }), bp = h('button', { type: 'button', class: 'gumb', text: 'Provjeri' });
  omot.append(h('p', { class: 'pit', text: 'Alat je u točki A. Klikni točne tvrdnje o smjeru gibanja i krajnjoj točki:' }), grupa(0, 5), h('p', { class: 'pit', text: 'Klikni točne tvrdnje o središtu (I, J inkrementalno od A):' }), grupa(5, 10), bp, por);
  bp.addEventListener('click', () => { omot.zak = true; bp.disabled = true; let n = 0; $$('.os-tvrdnja', omot).forEach((b) => { const k = +b.dataset.k, odab = b.getAttribute('aria-pressed') === 'true', ok = odab === TV[k][1]; if (ok) n++; b.classList.add(TV[k][1] ? 'jest' : 'nije'); if (!ok) b.classList.add('promasaj'); }); por.className = 'os-por ' + (n === 10 ? 'tocno' : 'krivo'); por.textContent = 'Točno procijenjenih tvrdnji: ' + n + '/10. Zeleno su točne tvrdnje.'; gotovo(n); });
  el.append(dva(omot, slika(c.svg, 'Kote od W: A je X100 Y70, središte X100 Y90.')));
}
// ---- Programiranje: G2/G3 posebno (zadaci s izvornog tečaja)
const LUKOVI = [
  [41, 2, 110, 60, 0, -20, 90, 80, 'q'], [41, 2, 20, 90, 20, 0, 0, 70, 'q'], [41, 3, -25, -35, 25, 0, -50, -10, 'q'], [42, 3, 55, -10, 0, 25, 30, -35, 'q'], [42, 3, 90, 90, -30, 0, 120, 60, 'q'],
  [42, 3, 0, 60, 0, -30, 30, 90, 'q'], [42, 2, 7.5, 50, 0, 40, 47.5, 10, 'q'], [42, 3, 100, 90, -20, 0, 120, 70, 'q'], [42, 3, 10, 60, 0, -20, 30, 80, 'q'], [41, 2, 10, 35, 0, 25, 35, 10, 'q'],
  [41, 2, 85, 10, -25, 0, 110, 35, 'q'], [41, 2, 120, 60, 0, -30, 90, 90, 'q'], [41, 2, 30, 90, 30, 0, 0, 60, 'q'], [42, 3, 57.5, -12.5, 0, 30, 27.5, -42.5, 'q'],
  [41, 2, 75, 5, 0, -40, 75, 85, 'p'], [42, 3, -30, -40, 0, -40, -30, 40, 'p'],
];
function crtezLuka(L) {
  const [g41, g2, ex, ey, I, J, sx, sy] = L, cx = sx + I, cy = sy + J, r = Math.hypot(I, J);
  const xs = [sx, ex, cx - r, cx + r, 0], ys = [sy, ey, cy - r, cy + r, 0];
  const x0 = Math.min(...xs) - 18, x1 = Math.max(...xs) + 22, y0 = Math.min(...ys) - 18, y1 = Math.max(...ys) + 18;
  const c = new Crtez({ x0, x1, y0, y1, sir: 440, oznaka: 'Luk s materijalom, početnom točkom i središtem' });
  c.mreza(10); c.osi({ xa: x0 + 2, xb: x1 - 4, ya: y0 + 2, yb: y1 - 4, oznake: 20 }); c.W(0, 0, null, '');
  const a0 = Math.atan2(sy - cy, sx - cx); let a1 = Math.atan2(ey - cy, ex - cx), d = a1 - a0;
  if (g2 === 2) { while (d >= 0) d -= 2 * PI; } else { while (d <= 0) d += 2 * PI; }
  const konveks = (g41 === 41 && g2 === 2) || (g41 === 42 && g2 === 3), rm = konveks ? r - 8 : r + 8;
  c.put(c.lukD(cx, cy, r, a0, a1) + 'L' + c.X(cx + rm * Math.cos(a1)) + ' ' + c.Y(cy + rm * Math.sin(a1)) + c.lukD(cx, cy, rm, a1, a0, true) + 'Z', 'oc-materijal');
  c.luk(cx, cy, r, a0, a1, 'oc-putl'); const ak = a1; const tx = -Math.sin(ak) * Math.sign(d), ty = Math.cos(ak) * Math.sign(d);
  c.strelica(c.X(ex), c.Y(ey), Math.atan2(-ty, tx), 10, 'oc-strf');
  c.tocka(sx, sy, 5, 'oc-tk-s'); c.tekst(sx, sy, 'početak X' + nc(sx) + ' Y' + nc(sy), 'oc-txb', null, { dx: 8, dy: -8, a: 'start' });
  c.tocka(ex, ey, 5, 'oc-tk-s'); c.tekst(ex, ey, 'cilj', 'oc-txb', null, { dx: 8, dy: 14, a: 'start' });
  c.tocka(cx, cy, 3, 'oc-tk-s'); c.lin(cx, cy, cx + r * Math.cos(a0 + d / 2), cy + r * Math.sin(a0 + d / 2), 'oc-tn');
  c.tekst(cx + r * 0.55 * Math.cos(a0 + d / 2), cy + r * 0.55 * Math.sin(a0 + d / 2), 'R' + fmt(r), 'oc-kt', null, { dx: 6, a: 'start' });
  return c;
}
function korakG23posebno(el, gotovo) {
  const q = izmijesaj(LUKOVI.filter((l) => l[8] === 'q')).slice(0, 3), p = izmijesaj(LUKOVI.filter((l) => l[8] === 'p')).slice(0, 1);
  korakNiz(el, [...q, ...p].map((L) => (host, sljedeci) => {
    const c = crtezLuka(L);
    const sK = h('select', { 'aria-label': 'Korekcija putanje' }, h('option', { value: '', text: 'G4?' }), h('option', { value: '41', text: 'G41' }), h('option', { value: '42', text: 'G42' }));
    const sG = h('select', { 'aria-label': 'Smjer luka' }, h('option', { value: '', text: 'G?' }), h('option', { value: '2', text: 'G2' }), h('option', { value: '3', text: 'G3' }));
    const x = ulaz('X', 'abs'), y = ulaz('Y', 'abs'), ii = ulaz('I', 'inc'), jj = ulaz('J', 'inc');
    const por = h('p', { class: 'os-por' }), b = h('button', { type: 'button', class: 'os-tipka os-input', text: 'INPUT' });
    const prov = () => {
      if (!sK.value || !sG.value || [x, y, ii, jj].some((u) => u.i.value.trim() === '')) { por.className = 'os-por krivo'; por.textContent = 'Odaberi G41/G42 i G2/G3 te upiši X, Y, I i J.'; return; }
      const okG = +sK.value === L[0] && +sG.value === L[1], okK = jednako(x.i.value, L[2]) && jednako(y.i.value, L[3]) && jednako(ii.i.value, L[4]) && jednako(jj.i.value, L[5]);
      [sK, sG, x.i, y.i, ii.i, jj.i, b].forEach((e) => { e.disabled = true; });
      povratna(por, okG && okK, 'Rješenje: <code>G' + L[0] + ' G' + L[1] + ' X' + nc(L[2]) + ' Y' + nc(L[3]) + ' I' + nc(L[4]) + ' J' + nc(L[5]) + '</code>' + (okG ? '' : ' — provjeri stranu materijala i smjer.')); sljedeci((okG ? 1 : 0) + (okK ? 1 : 0));
    };
    b.addEventListener('click', prov); enterNa([x.i, y.i, ii.i, jj.i], prov);
    host.append(dva(h('div', null, h('p', { class: 'pit', html: (L[8] === 'p' ? 'Programiraj <b>polukrug</b>.' : 'Programiraj <b>četvrtinu kruga</b>.') + ' Šrafirano je materijal; strelica pokazuje smjer gibanja. Mreža je 10 mm.' }),
      h('div', { class: 'os-unos' }, h('div', { class: 'os-polja os-polja-g' }, h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: 'G' }), sK), h('label', { class: 'os-polje' }, h('span', { class: 'os-adr', text: 'G' }), sG), x.el, y.el, ii.el, jj.el), h('div', { class: 'os-gumbi' }, b), por)), slika(c.svg)));
  }), gotovo);
}

const KORACI_TESTA = [
  { dio: 'geo', naslov: 'Geometrija — položaji', max: 5, fn: korakPolozaji },
  { dio: 'geo', naslov: 'Geometrija — pravci', max: 3, fn: korakPravci },
  { dio: 'teh', naslov: 'Tehnologija — brzina vrtnje', max: 3, fn: korakBrzina },
  { dio: 'teh', naslov: 'Tehnologija — kvaliteta površine', max: 5, fn: korakPovrsina },
  { dio: 'pro', naslov: 'Programiranje — pojmovi', max: 16, fn: korakPojmovi },
  { dio: 'pro', naslov: 'Programiranje — NC blokovi', max: 20, fn: korakBlokovi },
  { dio: 'pro', naslov: 'Programiranje — G2/G3 općenito', max: 10, fn: korakG23opce },
  { dio: 'pro', naslov: 'Programiranje — G2/G3 posebno', max: 8, fn: korakG23posebno },
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
      <tr><td>Geometrija</td><td>položaji točaka, pravci (abs/inc)</td><td>${DIJELOVI.geo.zadano / 60} min</td></tr>
      <tr><td>Tehnologija</td><td>brzina vrtnje, kvaliteta površine</td><td>${DIJELOVI.teh.zadano / 60} min</td></tr>
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
      potvrda.innerHTML = ''; potvrda.append(h('p', { class: 'os-pt-n', text: 'POTVRDA' }), h('p', { class: 'os-pt-ime', text: t }), h('p', { class: 'os-pt-t', html: `riješio/la je test <b>»Osnove CNC glodanja«</b> dana ${datum}<br>s ukupnim rezultatom <b>${uk} %</b>.` }),
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
const SKUP_NAZIV = { korijen: 'Osnove glodanja', skupina: '', geo: 'Geometrija', teh: 'Tehnologija', pro: 'Programiranje' };
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
