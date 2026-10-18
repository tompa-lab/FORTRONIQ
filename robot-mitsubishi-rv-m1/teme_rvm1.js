// teme_rvm1.js — 16 interaktivnih 2D animacija „Kako radi” za robot Mitsubishi Movemaster EX RV-M1
// (DOS ForTroniQ, područje robot-mitsubishi-rv-m1). ES modul; uvozi samo vlastite module područja.
// Izvozi: TEME (popis {id, naslov, kratko}; uz to TEME[id] daje isti zapis), prikazi(el, id) → { unisti() },
// postaviPodatke(obj) — stranica (Upoznavanje) predaje podatke iz rvm1_podaci.js; objekti zamjenjuju zadane po ključu.
// Svi brojevi dolaze iz rvm1_podaci.js / rvm1_jezik_podaci.js (D), kinematika iz rvm1_kin.js (KIN), a ponašanje
// upravljačke jedinice u temama io-rukovanje, pogreske, eprom-ram i privjesak-rad iz interpretera rvm1_mrl.js.
// Brojevi koji nisu podatak robota označeni su u kodu s ILUSTR i na stranici kao „ilustrativno”.
// Izvorni dijelovi: src/teme_rvm1_dijelovi/ (python3 gradi.py). © ForTroniQ d.o.o.
import * as PODACI from './rvm1_podaci.js';
import * as KIN0 from './rvm1_kin.js';
import { napraviDUM1 } from './rvm1_mrl.js';

/* =========================================================== podaci (jedini izvor: rvm1_podaci.js) */
const D = Object.assign({}, PODACI);
let KIN = KIN0;
export function postaviPodatke(o) {
  if (!o || typeof o !== 'object') return;
  for (const k in o) {
    if (k === 'KIN' || k === 'kin') { if (o[k] && typeof o[k].fk === 'function') KIN = o[k]; continue; }
    if (o[k] !== undefined) D[k] = o[k];
  }
}
const RAD = Math.PI / 180;
const NAR = kod => (D.NAREDBA_PO_KODU && D.NAREDBA_PO_KODU[kod]) || null;
const osi = () => D.OSI;
const vMax = i => D.OSI[i].vMax;                       // °/s
const udioSP = sp => { const b = D.BRZINE && D.BRZINE[Math.max(0, Math.min(9, Math.round(sp)))]; return b ? b.udio : (sp + 1) / 10; };
const TLmm = () => (typeof D.TL_ZADANO === 'number' ? D.TL_ZADANO : 107);
const novaJedinica = () => napraviDUM1({ kin: KIN, podaci: D });

/* =========================================================== oblikovanje brojeva (hrvatski zapis) */
const hr = (n, d = 1) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d).replace('.', ',').replace('-', '−');
const hrp = (n, d = 1) => (n > 0.5 * Math.pow(10, -d) ? '+' : '') + hr(n, d);
const st = r => r / RAD;                                // rad → °
const kutovi = q => q.map(v => hr(st(v), 1) + '°').join(' · ');
/* zapis točke kao u odgovoru robota (FORMAT_ODGOVORA: predznak, 1 decimala, zarez kao razdjelnik) */
function zapisWH(t) {
  const f = v => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(1);
  return [t.x, t.y, t.z, t.p, t.r].map(f).join(',');
}
const bin = (v, n) => v.toString(2).padStart(n, '0');
const hex = (v, n = 2) => v.toString(16).toUpperCase().padStart(n, '0');

/* tekstovi i graditelji tema (puni se u dijelovima p3–p6) */
const TXT = {};
const GRAD = {};


/* =========================================================== DOM i SVG pomoćnici (boje samo iz CSS razreda) */
const NS = 'http://www.w3.org/2000/svg';
let brojac = 0;
function S(tag, a, rod) {
  const e = document.createElementNS(NS, tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v; else e.setAttribute(k, v);
  }
  if (rod) rod.appendChild(e);
  return e;
}
function H(tag, a, ...djeca) {
  const e = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const d of djeca) if (d != null) e.append(d);
  return e;
}
function T(g, x, y, txt, kl, anchor) { return S('text', { x: f1(x), y: f1(y), class: kl || 'trv-l', 'text-anchor': anchor || null, tekst: txt }, g); }
const ogr = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = v => (Math.round(v * 10) / 10).toString();
const frac = x => x - Math.floor(x);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const put = (arr, zat) => arr.length ? 'M' + arr.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + (zat ? 'Z' : '') : '';
function postavi(el, a) { for (const k in a) el.setAttribute(k, typeof a[k] === 'number' ? f1(a[k]) : a[k]); }
function tekst(el, t) { if (el.textContent !== t) el.textContent = t; }
function razred(el, k, v) { el.classList.toggle(k, !!v); }
function luk(cx, cy, r, a0, a1) {
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  const vel = Math.abs(a1 - a0) > Math.PI ? 1 : 0, sm = a1 > a0 ? 1 : 0;
  return `M${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 ${vel} ${sm} ${f1(x1)},${f1(y1)}`;
}
// kružni isječak prstena (r1 unutarnji, r2 vanjski), kutovi u rad
function isjecak(cx, cy, r1, r2, a0, a1) {
  const p0 = pol(cx, cy, r2, a0), p1 = pol(cx, cy, r2, a1), p2 = pol(cx, cy, r1, a1), p3 = pol(cx, cy, r1, a0), v = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const q = p => f1(p[0]) + ',' + f1(p[1]);
  return `M${q(p0)} A${f1(r2)},${f1(r2)} 0 ${v} 1 ${q(p1)} L${q(p2)} A${f1(r1)},${f1(r1)} 0 ${v} 0 ${q(p3)}Z`;
}
// strelica: boja iz razreda (currentColor), g.set(x1,y1,x2,y2)
function strel(g, x1, y1, x2, y2, kl = 'trv-c-ink', w = 2.5, gl = 11) {
  const gr = S('g', { class: 'trv-str ' + kl }, g);
  const ln = S('line', { 'stroke-width': w, 'stroke-linecap': 'round' }, gr);
  const pg = S('polygon', {}, gr);
  gr.set = (a, b, c, d) => {
    const dx = c - a, dy = d - b, L = Math.hypot(dx, dy);
    if (L < 1.5) { gr.style.display = 'none'; return; }
    gr.style.display = '';
    const ux = dx / L, uy = dy / L, g2 = Math.min(gl, L * 0.7), bx = c - ux * g2, by = d - uy * g2;
    postavi(ln, { x1: a, y1: b, x2: bx, y2: by });
    pg.setAttribute('points', `${f1(c)},${f1(d)} ${f1(bx - uy * g2 * 0.55)},${f1(by + ux * g2 * 0.55)} ${f1(bx + uy * g2 * 0.55)},${f1(by - ux * g2 * 0.55)}`);
  };
  gr.set(x1, y1, x2, y2);
  return gr;
}
// graf: okvir, mreža i pretvorba vrijednost → koordinata
function graf(g, x, y, w, h, o) {
  S('rect', { x, y, width: w, height: h, class: 'trv-graf' }, g);
  const X = v => x + (v - o.x0) / (o.x1 - o.x0) * w;
  const Y = v => y + h - (v - o.y0) / (o.y1 - o.y0) * h;
  for (const v of o.yt || []) {
    const yy = Y(v);
    S('line', { x1: x, y1: f1(yy), x2: x + w, y2: f1(yy), class: 'trv-mreza' }, g);
    if (o.ylab !== false) T(g, x - 6, yy + 5, (o.yf || String)(v), 'trv-ls', 'end');
  }
  for (const v of o.xt || []) {
    const xx = X(v);
    S('line', { x1: f1(xx), y1: y, x2: f1(xx), y2: y + h, class: 'trv-mreza' }, g);
    if (o.xlab !== false) T(g, xx, y + h + 18, (o.xf || String)(v), 'trv-ls', 'middle');
  }
  if (o.naslov) T(g, x, y - 8, o.naslov, 'trv-ls');
  return { X, Y, x, y, w, h };
}
// SVG element koji se ponaša kao gumb (klik, Enter, razmaknica)
function klikabilno(ctx, el, oznaka, fn) {
  el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', oznaka);
  el.classList.add('trv-klik');
  ctx.on(el, 'click', fn);
  ctx.on(el, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
}
// gumb koji se drži (pointer + tipkovnica): fn(true) pri pritisku, fn(false) pri otpuštanju
function drzi(ctx, el, fn) {
  let dolje = false;
  const pust = () => { if (dolje) { dolje = false; el.classList.remove('trv-drzi'); fn(false); } };
  ctx.on(el, 'pointerdown', e => { e.preventDefault(); if (el.setPointerCapture && e.pointerId != null) { try { el.setPointerCapture(e.pointerId); } catch (x) { /* ništa */ } } dolje = true; el.classList.add('trv-drzi'); fn(true); });
  ctx.on(el, 'pointerup', pust); ctx.on(el, 'pointercancel', pust); ctx.on(el, 'lostpointercapture', pust);
  ctx.on(el, 'keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); if (!dolje) { dolje = true; el.classList.add('trv-drzi'); fn(true); } } });
  ctx.on(el, 'keyup', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pust(); } });
  ctx.on(el, 'blur', pust);
  ctx.on(el, 'click', e => e.preventDefault());
}
// točka SVG-a iz događaja pokazivača (u koordinatama viewBoxa)
function tockaSVG(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const m = svg.getScreenCTM(); if (!m) return [0, 0];
  const q = p.matrixTransform(m.inverse()); return [q.x, q.y];
}
function sporo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

/* =========================================================== petlja i čišćenje (rAF samo dok je tema vidljiva) */
class Kontekst {
  constructor(root) {
    this.root = root; this.ciscenje = []; this.fje = []; this.rm = sporo();
    this.vidljiv = true; this.id = 0; this.tip = ''; this.zadnje = 0; this.zeli = false; this.unisten = false;
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver(z => {
        for (const u of z) this.vidljiv = u.isIntersecting;
        if (this.vidljiv) this._zakazi(); else this._stani();
      });
      this.io.observe(root);
    }
    this.on(document, 'visibilitychange', () => { if (document.hidden) this._stani(); else this._zakazi(); });
  }
  on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); this.ciscenje.push(() => el.removeEventListener(ev, fn, opt)); }
  petlja(fn) { this.fje.push(fn); }
  budi() { this.zeli = true; this._zakazi(); }
  _zakazi() {
    if (this.unisten || this.id || !this.zeli || !this.vidljiv || document.hidden) return;
    if (this.rm) { this.tip = 't'; this.id = setTimeout(() => this._okvir(performance.now()), 250); }
    else { this.tip = 'r'; this.id = requestAnimationFrame(t => this._okvir(t)); }
  }
  _stani() {
    if (!this.id) return;
    if (this.tip === 't') clearTimeout(this.id); else cancelAnimationFrame(this.id);
    this.id = 0; this.zadnje = 0;
  }
  _okvir(t) {
    this.id = 0;
    if (this.unisten) return;
    const dt = this.zadnje ? Math.min((t - this.zadnje) / 1000, this.rm ? 0.4 : 0.05) : (this.rm ? 0.25 : 1 / 60);
    this.zadnje = t;
    let dalje = false;
    for (const f of this.fje) { try { if (f(dt)) dalje = true; } catch (e) { console.error(e); } }
    this.zeli = dalje;
    if (dalje) this._zakazi(); else this.zadnje = 0;
  }
  odgodi(fn, ms) { const id = setTimeout(() => { if (!this.unisten) fn(); }, ms); this.ciscenje.push(() => clearTimeout(id)); return id; }
  unisti() {
    this.unisten = true; this._stani();
    if (this.io) this.io.disconnect();
    for (const c of this.ciscenje) { try { c(); } catch (e) { /* ništa */ } }
    this.ciscenje = []; this.fje = [];
  }
}

/* =========================================================== okvir jedne teme */
function okvir(el, id, ctx) {
  const T0 = TXT[id];
  const naslovT = (D.TEME_POPIS.find(t => t.id === id) || {}).naslov || id;
  const uid = 'trv' + (++brojac);
  let nk = 0;
  const sek = H('section', { class: 'trv', 'data-tema': id, 'aria-label': naslovT });
  const uvod = H('div', { class: 'trv-uvod' });
  for (const p of T0.uvod()) uvod.append(H('p', { tekst: p }));
  const scena = H('div', { class: 'trv-scena' });
  const upr = H('div', { class: 'trv-upr', role: 'group', 'aria-label': 'Upravljanje animacijom' });
  const ocitP = H('div', { class: 'trv-ocit' });
  const stanjeP = H('p', { class: 'trv-stanje', 'aria-live': 'polite' });
  const kako = H('div', { class: 'trv-kako' }, H('h4', { tekst: 'Kako radi' }), H('p', { tekst: T0.kako() }));
  const desno = H('div', { class: 'trv-desno' }, upr, stanjeP, ocitP, kako);
  // povezane naredbe (iz NAREDBE: kod, naziv, sintaksa, opis)
  const nar = (T0.naredbe || []).map(NAR).filter(Boolean);
  if (nar.length) {
    const ul = H('ul', { class: 'trv-nar', 'aria-label': 'Povezane naredbe' });
    for (const n of nar) ul.append(H('li', { title: n.opis }, H('code', { tekst: n.sintaksa }), H('span', { tekst: n.nazivHr })));
    desno.append(H('div', { class: 'trv-okviric' }, H('h4', { tekst: 'Povezane naredbe' }), ul));
  }
  // povezani dijelovi robota i opreme (DIJELOVI s tom temom)
  const dij = (D.dijeloviTeme ? D.dijeloviTeme(id) : []).map(d => d.naziv);
  if (dij.length) desno.append(H('div', { class: 'trv-okviric' }, H('h4', { tekst: 'Povezani dijelovi' }), H('p', { class: 'trv-sitno', tekst: dij.join(' · ') })));
  const nap = T0.napomena ? T0.napomena() : '';
  if (nap) desno.append(H('p', { class: 'trv-pretp' }, H('b', { tekst: 'Pretpostavke i pojednostavljenja: ' }), nap));
  sek.append(H('h3', { class: 'trv-naslov', tekst: naslovT }), uvod, H('div', { class: 'trv-tijelo' }, scena, desno));
  el.replaceChildren(sek);

  const ui = {
    uid, sek, scena, upr, ocitP, desno,
    svg(w, h, opis, kl) {
      const s = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opis, class: 'trv-svg' + (kl ? ' ' + kl : ''), focusable: 'false' });
      s.defs = S('defs', {}, s);
      s.clip = (x, y, w2, h2) => { const c = S('clipPath', { id: uid + '-cl' + (++nk) }, s.defs); S('rect', { x, y, width: w2, height: h2 }, c); return `url(#${c.id})`; };
      scena.append(s);
      return s;
    },
    red(kl, u) { const r = H('div', { class: 'trv-red' + (kl ? ' ' + kl : '') }); (u || upr).append(r); return r; },
    gumb(tekst0, fn, o = {}) {
      const b = H('button', {
        type: 'button', class: 'gumb' + (o.tanki ? ' tanki' : '') + ' trv-g' + (o.kl ? ' ' + o.kl : ''),
        'aria-label': o.aria || null, 'aria-pressed': o.pritisak == null ? null : String(!!o.pritisak), title: o.title || null
      });
      b.textContent = tekst0;
      if (fn) ctx.on(b, 'click', e => fn(e, b));
      let cilj = o.u;
      if (!cilj) { cilj = upr.lastElementChild; if (!cilj || !cilj.classList.contains('trv-red')) cilj = ui.red(); }
      cilj.append(b);
      return b;
    },
    // gumb pokreni/pauza
    igraj(st0, kljuc, tekst0, fn, u) {
      const b = ui.gumb(tekst0, () => { st0[kljuc] = !st0[kljuc]; osv(); if (fn) fn(st0[kljuc]); ctx.budi(); }, { pritisak: false, u, kl: 'trv-igraj' });
      const osv = () => { b.textContent = st0[kljuc] ? 'Pauza' : tekst0; b.setAttribute('aria-pressed', String(!!st0[kljuc])); };
      b.osvjezi = osv; osv();
      return b;
    },
    seg(oznaka, opcije, vr, fn, u) {
      const w = H('div', { class: 'trv-seg' });
      const lab = H('span', { class: 'trv-seg-o', tekst: oznaka, id: uid + '-s' + (++nk) });
      const box = H('div', { class: 'trv-seg-b', role: 'group', 'aria-labelledby': lab.id });
      const btn = opcije.map(([v, t]) => {
        const b = H('button', { type: 'button', 'aria-pressed': 'false' });
        b.textContent = t;
        ctx.on(b, 'click', () => { if (w.dataset.v === String(v)) return; w.postavi(v); fn(v); });
        box.append(b);
        return [v, b];
      });
      w.postavi = v => { w.dataset.v = String(v); for (const [vv, b] of btn) b.setAttribute('aria-pressed', String(vv === v)); };
      w.postavi(vr);
      w.append(lab, box);
      (u || upr).append(w);
      return w;
    },
    klizac(oznaka, min, max, korak, vr, fmt, fn, u) {
      const kid = uid + '-k' + (++nk);
      const w = H('div', { class: 'trv-kl' });
      const l = H('label', { for: kid, tekst: oznaka });
      const o = H('output', { for: kid });
      const i = H('input', { type: 'range', id: kid, min, max, step: korak, value: vr });
      const upd = () => { o.textContent = fmt(+i.value); };
      ctx.on(i, 'input', () => { upd(); fn(+i.value); });
      upd();
      w.append(H('div', { class: 'trv-kl-g' }, l, o), i);
      (u || upr).append(w);
      w.ulaz = i; w.osvjezi = upd;
      w.postavi = v => { i.value = v; upd(); };
      return w;
    },
    kvacica(oznaka, vr, fn, u) {
      const kid = uid + '-c' + (++nk);
      const i = H('input', { type: 'checkbox', id: kid });
      i.checked = !!vr;
      const w = H('label', { class: 'trv-kv', for: kid }, i, H('span', { tekst: oznaka }));
      ctx.on(i, 'change', () => fn(i.checked));
      (u || upr).append(w);
      w.ulaz = i;
      w.postavi = v => { i.checked = !!v; };
      return w;
    },
    ocit(redovi, u) {
      const dl = H('dl', { class: 'trv-oc' });
      const set = {};
      for (const [k, t] of redovi) {
        const dd = H('dd', { tekst: '—' });
        dl.append(H('div', {}, H('dt', { tekst: t }), dd));
        set[k] = (v, kl) => { if (dd.textContent !== v) dd.textContent = v; const c = kl ? 'trv-' + kl : ''; if (dd.className !== c) dd.className = c; };
      }
      (u || ocitP).append(dl);
      return set;
    },
    formula(naslov, n, u) {
      const box = H('div', { class: 'trv-formula' });
      if (naslov) box.append(H('h4', { tekst: naslov }));
      const red = [];
      for (let k = 0; k < n; k++) { const p = H('p', {}); box.append(p); red.push(p); }
      (u || ocitP).append(box);
      box.set = (k, txt) => { if (red[k] && red[k].textContent !== txt) red[k].textContent = txt; if (red[k]) red[k].style.display = txt ? '' : 'none'; };
      return box;
    },
    koraci(popis, u) {
      const ol = H('ol', { class: 'trv-koraci' });
      const li = popis.map(t => { const e = H('li', { tekst: t }); ol.append(e); return e; });
      (u || ocitP).append(ol);
      ol.postavi = (i, kv) => li.forEach((e, k) => { e.classList.toggle('trv-akt', k === i); e.classList.toggle('trv-gotov', k < i); e.classList.toggle('trv-kvar', k === i && !!kv); });
      ol.stavke = li;
      return ol;
    },
    log(u) {
      const ol = H('ol', { class: 'trv-log', 'aria-live': 'polite' });
      (u || ocitP).append(ol);
      ol.dodaj = (t, kl) => { const li = H('li', { tekst: t, class: kl ? 'trv-' + kl : null }); ol.prepend(li); while (ol.children.length > 7) ol.lastChild.remove(); };
      ol.ocisti = () => ol.replaceChildren();
      return ol;
    },
    sitno(txt, u) { const p = H('p', { class: 'trv-sitno', tekst: txt }); (u || ocitP).append(p); return p; },
    pretp(txt, u) { const p = H('p', { class: 'trv-oznaka-pp', tekst: txt }); (u || ocitP).append(p); return p; },
    stanje(txt, vrsta) {
      if (stanjeP.textContent !== txt) stanjeP.textContent = txt;
      const c = 'trv-stanje' + (vrsta ? ' trv-' + vrsta : '');
      if (stanjeP.className !== c) stanjeP.className = c;
    }
  };
  return ui;
}


/* =========================================================== 2D crtež robota (mjere iz MJERE, točke iz KIN.fk) */
const znakJ1 = () => (D.KONFIG && D.KONFIG.smjerJ1 === 'cw' ? -1 : 1);
/** točke ruke u ravnini ruke: r (radijalno, s predznakom) i z [m] */
function ravnina(q, tl) {
  const f = KIN.fk(q, tl), t1 = znakJ1() * q[0], c = Math.cos(t1), s = Math.sin(t1);
  const rz = p => [p[0] * c + p[1] * s, p[2]];
  return { S: [0, D.MJERE.d1], L: rz(f.lakat), W: rz(f.sake), F: rz(f.prirubnica), T: rz(f.p), P: f.P, f };
}
/** bočni pogled (ravnina ruke). o: {ox, oy (montažna ploha, os J1), k [px/m], prihvatnica} */
function robotBocno(g, o) {
  const M = D.MJERE, k = o.k, X = r => o.ox + r * k, Y = z => o.oy - z * k;
  const gr = S('g', { class: 'trv-robot' }, g);
  S('line', { x1: X(-0.2), y1: Y(0), x2: X(0.2), y2: Y(0), class: 'trv-pod' }, gr);
  const pn = M.podnozje, hL = pn.visinaLezaja || (M.d1 - 0.105);
  S('rect', { x: f1(X(-pn.dubina / 2)), y: f1(Y(pn.debljina)), width: f1(pn.dubina * k), height: f1(pn.debljina * k), rx: 2, class: 'trv-podnozje' }, gr);
  const b0 = pn.tijeloDolje[0] / 2, b1 = pn.tijeloGore;
  S('path', { d: put([[X(-b0), Y(pn.debljina)], [X(b0), Y(pn.debljina)], [X(b1), Y(hL)], [X(-b1), Y(hL)]], true), class: 'trv-podnozje' }, gr);
  S('rect', { x: f1(X(-M.struk.polumjer)), y: f1(Y(M.d1 - 0.02)), width: f1(2 * M.struk.polumjer * k), height: f1((M.d1 - 0.02 - hL) * k), class: 'trv-struk' }, gr);
  const R = M.rame;
  S('rect', { x: f1(X(-R.duljinaNatrag)), y: f1(Y(M.d1 + R.gore)), width: f1((R.duljinaNatrag + 0.02) * k), height: f1((R.gore + R.dolje) * k), rx: f1(0.02 * k), class: 'trv-rame' }, gr);
  S('circle', { cx: f1(X(0)), cy: f1(Y(M.d1)), r: f1(R.polumjerKape * k), class: 'trv-rame' }, gr);
  const clan = (w, kl) => { const a = S('line', { class: kl + '-o', 'stroke-width': f1(w * k + 3), 'stroke-linecap': 'round' }, gr); const b = S('line', { class: kl, 'stroke-width': f1(w * k), 'stroke-linecap': 'round' }, gr); return [a, b]; };
  const nad = clan(0.07, 'trv-clan'), pod = clan(0.058, 'trv-clan'), sak = clan(2 * M.saka.polumjer * 0.85, 'trv-sakac');
  const zg = [0, 1, 2].map(() => S('circle', { r: f1(0.022 * k), class: 'trv-zglob' }, gr));
  const alat = S('line', { class: 'trv-alat', 'stroke-width': 3, 'stroke-linecap': 'round' }, gr);
  const tijelo = S('path', { class: 'trv-prihv' }, gr);
  const prsti = [0, 1].map(() => S('path', { class: 'trv-prst' }, gr));
  const tcp = S('circle', { r: 4.5, class: 'trv-tcp' }, gr);
  const obj = { g: gr, X, Y, k };
  obj.postavi = (q, tl = TLmm() / 1000, otv = 1) => {
    const p = ravnina(q, tl);
    const P = [p.S, p.L, p.W, p.F, p.T].map(([r, z]) => [X(r), Y(z)]);
    const ln = (pr, a, b) => { for (const e of pr) postavi(e, { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); };
    ln(nad, P[0], P[1]); ln(pod, P[1], P[2]); ln(sak, P[2], P[3]);
    zg.forEach((c, i) => postavi(c, { cx: P[i][0], cy: P[i][1] }));
    const u = [Math.cos(p.P), -Math.sin(p.P)], n = [-u[1], u[0]];   // smjer alata i normala na zaslonu
    const PH = M.prihvatnica, imaP = o.prihvatnica !== false && D.KONFIG.prihvatnica;
    if (imaP) {
      const Lt = Math.min(PH.tijelo[2], Math.max(0.012, tl - 0.012)) * k, Wt = PH.tijelo[0] * k / 2;
      const A = P[3], B = [A[0] + u[0] * Lt, A[1] + u[1] * Lt];
      tijelo.setAttribute('d', put([[A[0] + n[0] * Wt, A[1] + n[1] * Wt], [B[0] + n[0] * Wt, B[1] + n[1] * Wt], [B[0] - n[0] * Wt, B[1] - n[1] * Wt], [A[0] - n[0] * Wt, A[1] - n[1] * Wt]], true));
      const pw = PH.prst[0] * k, raz = (ogr(otv, 0, 1) * (D.PRIHVATNICA.hod || 0.06) / 2) * k + pw / 2, Lf = Math.max(4, Math.hypot(P[4][0] - B[0], P[4][1] - B[1]) + 0.006 * k);
      prsti.forEach((e, i) => {
        const sg = i ? 1 : -1, c0 = [B[0] + n[0] * raz * sg, B[1] + n[1] * raz * sg], c1 = [c0[0] + u[0] * Lf, c0[1] + u[1] * Lf], h = pw / 2;
        e.setAttribute('d', put([[c0[0] + n[0] * h, c0[1] + n[1] * h], [c1[0] + n[0] * h, c1[1] + n[1] * h], [c1[0] - n[0] * h, c1[1] - n[1] * h], [c0[0] - n[0] * h, c0[1] - n[1] * h]], true));
      });
      alat.style.display = 'none'; tijelo.style.display = ''; prsti.forEach(e => (e.style.display = ''));
    } else {
      postavi(alat, { x1: P[3][0], y1: P[3][1], x2: P[4][0], y2: P[4][1] });
      alat.style.display = ''; tijelo.style.display = 'none'; prsti.forEach(e => (e.style.display = 'none'));
    }
    postavi(tcp, { cx: P[4][0], cy: P[4][1] });
    obj.tocke = P; obj.p = p;
    return P;
  };
  return obj;
}
/** pogled odozgo: zaslon gore = +X robota, lijevo = +Y robota. o: {ox, oy, k, granice} */
function robotOdozgo(g, o) {
  const M = D.MJERE, k = o.k, sx = (x, y) => o.ox - y * k, sy = (x, y) => o.oy - x * k;
  const gr = S('g', { class: 'trv-robot' }, g);
  if (o.granice !== false) {
    const J = D.OSI[0], R0 = o.rGr || 0.62, zn = znakJ1();
    const kut = d => -Math.PI / 2 - zn * d * RAD;           // kut na zaslonu za J1 = d (°)
    const tocke = (d0, d1) => { const r = []; for (let i = 0; i <= 40; i++) r.push(pol(o.ox, o.oy, R0 * k, kut(d0 + (d1 - d0) * i / 40))); return r; };
    S('path', { d: put([[o.ox, o.oy], ...tocke(J.maxDeg, 360 + J.minDeg)], true), class: 'trv-zabranjeno' }, gr);
    S('path', { d: put(tocke(J.minDeg, J.maxDeg)), class: 'trv-doseg' }, gr);
    for (const d of [J.minDeg, J.maxDeg]) { const [x2, y2] = pol(o.ox, o.oy, R0 * k, kut(d)); S('line', { x1: f1(o.ox), y1: f1(o.oy), x2: f1(x2), y2: f1(y2), class: 'trv-prag' }, gr); }
  }
  const pn = M.podnozje;
  S('rect', { x: f1(o.ox - pn.sirina / 2 * k), y: f1(o.oy - pn.dubina / 2 * k), width: f1(pn.sirina * k), height: f1(pn.dubina * k), rx: 3, class: 'trv-podnozje' }, gr);
  S('circle', { cx: f1(o.ox), cy: f1(o.oy), r: f1(M.struk.polumjer * k), class: 'trv-struk' }, gr);
  const rot = S('g', {}, gr);
  S('rect', { x: f1(-M.rame.sirina / 2 * k), y: f1(-0.02 * k), width: f1(M.rame.sirina * k), height: f1((M.rame.duljinaNatrag + 0.02) * k), rx: f1(0.02 * k), class: 'trv-rame' }, rot);
  const ruka = S('line', { x1: 0, y1: 0, class: 'trv-clan', 'stroke-width': f1(0.065 * k), 'stroke-linecap': 'round' }, rot);
  const saka = S('line', { class: 'trv-sakac', 'stroke-width': f1(0.05 * k), 'stroke-linecap': 'round' }, rot);
  const tcp = S('circle', { r: 4.5, class: 'trv-tcp' }, gr);
  const obj = { g: gr, sx, sy, k };
  obj.postavi = (q, tl = TLmm() / 1000) => {
    const p = ravnina(q, tl), t1 = znakJ1() * q[0];
    rot.setAttribute('transform', `translate(${f1(o.ox)} ${f1(o.oy)}) rotate(${f1(-t1 / RAD)})`);
    postavi(ruka, { x2: 0, y2: -p.W[0] * k });
    postavi(saka, { x1: 0, y1: -p.W[0] * k, x2: 0, y2: -p.T[0] * k });
    const x = p.f.p[0], y = p.f.p[1];
    postavi(tcp, { cx: sx(x, y), cy: sy(x, y) });
    obj.p = p;
  };
  return obj;
}


/* =========================================================== 1. DC motor s četkicama i inkrementalni enkoder */
TXT['dc-motor-enkoder'] = {
  kratko: 'Kako DC motor s četkicama stvara moment i kako enkoder s tragovima A, B i Z mjeri kut i smjer.',
  uvod: () => [
    `Svaku od pet osi pokreće DC servo motor s četkicama: J1, J2 i J3 po ${D.OSI[0].motorW} W, J4 i J5 po ${D.OSI[3].motorW} W (natpisna pločica). Stator ima permanentne magnete, a struja kroz namote rotora u njihovu polju stvara moment. Komutator na vratilu i dvije četkice svakih pola okretaja okreću smjer struje u namotu, pa moment stalno djeluje u istom smjeru. Smjer vrtnje određuje predznak napona, a brzinu njegov iznos.`,
    'Na vratilu je inkrementalni enkoder: disk s prorezima i dva optička senzora A i B, pomaknuta za četvrtinu koraka, daju dva pravokutna signala u kvadraturi. Upravljačka jedinica broji sve bridove obaju signala (četverostruko brojenje), a iz toga koji signal prednjači zna smjer. Treći trag Z daje jedan impuls po okretaju i služi za točno ishodište pri NEST-u.'
  ],
  kako: () => 'Pokreni motor i klizačem zadaj napon: predznak mijenja smjer, iznos brzinu. Prati koji je namot pod strujom i kako se signali A i B pomiču jedan prema drugom. Gumb „Korak” okreće vratilo za točno jedan brid (jedan impuls brojila). Kvačica „Z poništava brojilo” pokazuje kako ishodište postavlja nulu.',
  napomena: () => 'Broj proreza na disku (16) i brzina prikaza su ilustrativni — razlučivost enkodera i optička izvedba nisu u dostupnim izvorima. Da je enkoder na vratilu motora (prije prijenosa) je pretpostavka. Motor je nacrtan s tri namota radi jasnoće.',
  naredbe: ['NT', 'SP', 'WH']
};
GRAD['dc-motor-enkoder'] = function (ui, ctx) {
  const NP = 16;                                   // ILUSTR: proreza na disku
  const st = { radi: true, u: 0.6, th: 0.3, os: 0, z0: 0, zNul: false, prijeTh: 0.3, zProlaz: 0 };
  const svg = ui.svg(600, 450, 'Presjek DC motora s četkicama i komutatorom, disk enkodera sa senzorima A, B i Z te vremenski dijagram signala');
  // ---- motor
  const MX = 150, MY = 150;
  S('circle', { cx: MX, cy: MY, r: 112, class: 'trv-kuciste' }, svg);
  S('path', { d: isjecak(MX, MY, 80, 100, Math.PI * 1.15, Math.PI * 1.85), class: 'trv-mag-n' }, svg);
  S('path', { d: isjecak(MX, MY, 80, 100, Math.PI * 0.15, Math.PI * 0.85), class: 'trv-mag-s' }, svg);
  T(svg, MX, MY - 84, 'N', 'trv-lb trv-na-magnetu', 'middle'); T(svg, MX, MY + 98, 'S', 'trv-lb trv-na-magnetu', 'middle');
  const rot = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: 70, class: 'trv-rotor' }, rot);
  const namoti = [0, 1, 2].map(i => { const g = S('g', { transform: `rotate(${i * 120})` }, rot); S('rect', { x: -9, y: -66, width: 18, height: 36, rx: 3, class: 'trv-namot' }, g); return g.firstChild; });
  const kom = [0, 1, 2].map(i => S('path', { d: luk(0, 0, 24, (i * 120 - 85) * RAD, (i * 120 + 25) * RAD), class: 'trv-komutator', 'stroke-width': 10 }, rot));
  S('circle', { cx: 0, cy: 0, r: 8, class: 'trv-vratilo' }, rot);
  const cet = [-1, 1].map(s => S('rect', { x: MX + s * 34 - 8, y: MY - 9, width: 16, height: 18, rx: 2, class: 'trv-cetkica' }, svg));
  void cet;
  T(svg, MX - 52, MY + 4, '+', 'trv-lb', 'middle'); T(svg, MX + 52, MY + 4, '−', 'trv-lb', 'middle');
  const strM = S('g', { class: 'trv-str trv-c-teal' }, svg);
  S('path', { d: luk(MX, MY, 124, -Math.PI * 0.82, -Math.PI * 0.18), class: 'trv-luk-str', 'stroke-width': 3 }, strM);
  S('polygon', { points: (() => { const [x, y] = pol(MX, MY, 124, -Math.PI * 0.18); return `${f1(x + 2)},${f1(y + 12)} ${f1(x - 12)},${f1(y - 4)} ${f1(x + 9)},${f1(y - 9)}`; })() }, strM);
  T(svg, MX, 286, 'DC motor (presjek)', 'trv-ls', 'middle');
  // ---- enkoder
  const EX = 455, EY = 150, ER = 98;
  const disk = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: ER, class: 'trv-disk' }, disk);
  for (let i = 0; i < NP; i++) S('path', { d: luk(0, 0, ER - 12, (i / NP) * 2 * Math.PI, (i + 0.5) / NP * 2 * Math.PI), class: 'trv-prorez', 'stroke-width': 14 }, disk);
  const aZ = -Math.PI / 2 + 0.55, wZ = Math.PI / NP;   // Z-prorez je pod senzorom Z kad je θ u [−wZ, 0)
  S('path', { d: luk(0, 0, ER - 40, aZ - wZ, aZ), class: 'trv-prorez', 'stroke-width': 12 }, disk);
  S('circle', { cx: 0, cy: 0, r: 10, class: 'trv-vratilo' }, disk);
  const senz = (a, r, ime) => { const [x, y] = pol(EX, EY, r, a); const g = S('g', {}, svg); S('rect', { x: x - 9, y: y - 9, width: 18, height: 18, rx: 3, class: 'trv-senzor' }, g); T(svg, x, y - 15, ime, 'trv-lb', 'middle'); return g.firstChild; };
  const aA = -Math.PI / 2, aB = -Math.PI / 2 + (2 * Math.PI / NP) * 0.25 * 0 - (2 * Math.PI / NP) * 1.25;
  const sA = senz(aA, ER - 12, 'A'), sB = senz(aB, ER - 12, 'B'), sZ = senz(aZ - wZ / 2, ER - 40, 'Z');
  T(svg, EX, 286, `enkoder (${NP} proreza)`, 'trv-ls', 'middle');
  // ---- vremenski dijagram
  const GX = 60, GW = 520, GY = 320, RH = 36, POV = 260;
  const tr = { A: [], B: [], Z: [] };
  const linije = {};
  ['A', 'B', 'Z'].forEach((k, i) => {
    T(svg, GX - 12, GY + i * RH + 24, k, 'trv-lb', 'end');
    S('line', { x1: GX, y1: GY + i * RH + 28, x2: GX + GW, y2: GY + i * RH + 28, class: 'trv-mreza' }, svg);
    linije[k] = S('path', { class: 'trv-signal' + (k === 'Z' ? ' trv-signal-z' : '') }, svg);
  });
  const smjerT = T(svg, GX + GW, GY - 2, '', 'trv-ls', 'end');
  const signali = th => {
    const ph = NP * th / (2 * Math.PI);
    return { A: frac(ph) < 0.5 ? 1 : 0, B: frac(ph - 0.25) < 0.5 ? 1 : 0, Z: frac(th / (2 * Math.PI) + 0.5 / NP) < 0.25 / NP * 2 ? 1 : 0 };
  };
  const brojilo = () => Math.floor(4 * NP * st.th / (2 * Math.PI)) - st.z0;
  function osvjezi() {
    rot.setAttribute('transform', `translate(${MX} ${MY}) rotate(${f1(-st.th / RAD)})`);
    disk.setAttribute('transform', `translate(${EX} ${EY}) rotate(${f1(-st.th / RAD)})`);
    // namot pod strujom: onaj čiji je segment komutatora pod četkicama
    const a = ((-st.th / RAD) % 360 + 360) % 360;
    const akt = Math.floor(((a + 30) % 360) / 120);
    namoti.forEach((n, i) => { razred(n, 'trv-namot-on', i === (3 - akt) % 3 && Math.abs(st.u) > 0.01); });
    kom.forEach((n, i) => razred(n, 'trv-komutator-on', i === (3 - akt) % 3 && Math.abs(st.u) > 0.01));
    const s = signali(st.th);
    razred(sA, 'trv-senzor-on', s.A); razred(sB, 'trv-senzor-on', s.B); razred(sZ, 'trv-senzor-on', s.Z);
    strM.style.display = Math.abs(st.u) > 0.01 ? '' : 'none';
    strM.setAttribute('transform', st.u > 0 ? `translate(${2 * MX} 0) scale(-1 1)` : '');
    for (const k of ['A', 'B', 'Z']) {
      const arr = tr[k], i0 = ['A', 'B', 'Z'].indexOf(k), y1 = GY + i0 * RH + 28, y0 = y1 - 22;
      let d = '';
      const o0 = POV - arr.length;
      arr.forEach((v, j) => { const x = GX + GW * (j + o0) / POV, y = v ? y0 : y1; d += (j ? 'L' : 'M') + f1(x) + ',' + f1(y); if (j < arr.length - 1 && arr[j + 1] !== v) d += 'L' + f1(GX + GW * (j + 1 + o0) / POV) + ',' + f1(y); });
      linije[k].setAttribute('d', d);
    }
    const n = brojilo(), smjer = st.u > 0.01 ? 'A prednjači → smjer +' : st.u < -0.01 ? 'B prednjači → smjer −' : 'miruje';
    tekst(smjerT, smjer);
    const O = D.OSI[st.os];
    o.os(`${O.ime} (${O.oznaka}, ${O.naziv}): ${O.motorW} W${O.kocnica ? ', s kočnicom' : ''}`);
    o.u(hrp(st.u * 100, 0) + ' % (ilustrativno)');
    o.n(String(n)); o.kut(hr(n / (4 * NP) * 360, 1) + '°');
    o.ab(`A = ${s.A}, B = ${s.B}, Z = ${s.Z}`);
    o.z(String(st.zProlaz));
    if (Math.abs(st.u) < 0.01) ui.stanje('Napon je nula: nema struje kroz namot, motor ne daje moment.');
    else ui.stanje(`${st.u > 0 ? 'Pozitivan' : 'Negativan'} napon: struja kroz namot pod četkicama, moment ${st.u > 0 ? 'suprotno kazaljci' : 'u smjeru kazaljke'}. Brojilo ${st.u > 0 ? 'raste' : 'pada'} za 4 impulsa po prorezu.`, 'ok');
  }
  function okreni(d) {
    const prije = st.th; st.th += d;
    const k0 = Math.floor(prije / (2 * Math.PI) + 0.5 / NP), k1 = Math.floor(st.th / (2 * Math.PI) + 0.5 / NP);
    if (k0 !== k1) { st.zProlaz++; if (st.zNul) st.z0 = Math.floor(4 * NP * st.th / (2 * Math.PI)); }
    const s = signali(st.th);
    for (const k of ['A', 'B', 'Z']) { tr[k].push(s[k]); if (tr[k].length > POV) tr[k].shift(); }
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const w = st.u * 2 * Math.PI * 0.35;            // ILUSTR: najviše 0,35 okr/s na zaslonu
    const n = Math.max(1, Math.ceil(Math.abs(w * dt) / (2 * Math.PI / NP / 8)));
    for (let i = 0; i < n; i++) okreni(w * dt / n);
    osvjezi();
    return true;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r);
  ui.gumb('Korak (1 impuls)', () => { st.radi = false; bI.osvjezi(); const d = (st.u >= 0 ? 1 : -1) * 2 * Math.PI / NP / 4; for (let i = 0; i < 6; i++) okreni(d / 6); osvjezi(); }, { tanki: true, u: r });
  const bI = r.querySelector('.trv-igraj');
  ui.klizac('Napon na motoru', -100, 100, 5, st.u * 100, v => hrp(v, 0) + ' %', v => { st.u = v / 100; osvjezi(); ctx.budi(); });
  ui.seg('Os', D.OSI.map((x, i) => [i, x.ime]), 0, i => { st.os = i; osvjezi(); });
  ui.kvacica('Z poništava brojilo (kao NEST)', false, v => { st.zNul = v; });
  const o = ui.ocit([['os', 'Motor osi'], ['u', 'Napon'], ['n', 'Brojilo impulsa (× 4)'], ['kut', 'Kut vratila iz brojila'], ['ab', 'Signali'], ['z', 'Prolazi Z-faze']]);
  ui.sitno(`Snage motora s pločice: ${D.OSI.map(x => x.ime + ' ' + x.motorW + ' W').join(', ')}. Četkice se troše i mijenjaju se pri održavanju.`);
  for (let i = 0; i < 40; i++) okreni(0.002);
  osvjezi(); ctx.budi();
};

/* =========================================================== 2. prijenos zupčastim remenom */
TXT['zupcasti-remen'] = {
  kratko: 'Kako zupčasti remen prenosi gibanje s motora na zglob i zašto preskok zuba kvari točnost.',
  uvod: () => [
    'Prema prospektu RV-M1 ima prijenos zupčastim remenom, a priručnik remene navodi pri održavanju osi J2, J3 i J4. Zupčasti remen prenosi gibanje oblikom (zubi u utorima remenice), bez proklizavanja, pa je omjer stalan i jednak omjeru broja zubi remenica. Motori J2 i J3 mogu tako stajati u kućištu ramena, iza osi, gdje svojom masom djelomično uravnotežuju ruku.',
    'Remen mora biti ispravno napet. Labav remen pod opterećenjem može preskočiti zub: motor se okrene do kraja, a zglob zaostane za jedan zub. Enkoder na motoru to ne vidi, pa upravljač misli da je ruka na pravom mjestu — robot postaje netočan sve do ponovnog NEST-a.'
  ],
  kako: () => 'Odaberi os i pokreni motor. Za J2 i J4 crta pokazuje jedan remen, za J3 dva stupnja (motor u ramenu → os ramena → lakat). Uključi „labav remen” i povećaj opterećenje: brojač preskočenih zubi raste, a razlika između kuta koji računa upravljač i stvarnog kuta zgloba postaje vidljiva.',
  napomena: () => 'Broj zubi remenica (12 i 36) i opterećenje su ilustrativni — prijenosni omjeri nisu u izvorima. J1 i J5 nisu na remen; za njih je prikazan zupčanički prijenos kao pretpostavka. Položaj enkodera na motoru je pretpostavka.',
  naredbe: ['NT', 'SP', 'MJ']
};
GRAD['zupcasti-remen'] = function (ui, ctx) {
  const Z1 = 12, Z2 = 36;                          // ILUSTR
  const st = { radi: true, os: 1, v: 0.5, lab: false, F: 0.3, thM: 0, thI: 0, skok: 0, akum: 0 };
  const svg = ui.svg(600, 330, 'Remenski prijenos: mala remenica na motoru, velika na zglobu, zupčasti remen; za J3 dva stupnja');
  const gR = S('g', {}, svg), gZ = S('g', {}, svg);
  function remenica(g, cx, cy, r, z) {
    const gg = S('g', {}, g);
    S('circle', { cx: 0, cy: 0, r, class: 'trv-remenica' }, gg);
    for (let i = 0; i < z; i++) { const a = i / z * 360; S('rect', { x: -3, y: -r - 3, width: 6, height: 6, transform: `rotate(${a})`, class: 'trv-zub' }, gg); }
    S('line', { x1: 0, y1: 0, x2: 0, y2: -r + 6, class: 'trv-oznaka-k', 'stroke-width': 3 }, gg);
    S('circle', { cx: 0, cy: 0, r: 6, class: 'trv-vratilo' }, gg);
    gg.cx = cx; gg.cy = cy;
    return gg;
  }
  function remen(g, a, ra, b, rb) {   // vanjske tangente dviju kružnica (a lijevo, b desno, ista visina)
    const d = b[0] - a[0], fi = Math.asin((rb - ra) / d);
    const p1 = [a[0] - ra * Math.sin(fi), a[1] - ra * Math.cos(fi)], p2 = [b[0] - rb * Math.sin(fi), b[1] - rb * Math.cos(fi)];
    const p3 = [b[0] - rb * Math.sin(fi), b[1] + rb * Math.cos(fi)], p4 = [a[0] - ra * Math.sin(fi), a[1] + ra * Math.cos(fi)];
    const dd = `M${f1(p1[0])},${f1(p1[1])} L${f1(p2[0])},${f1(p2[1])} A${rb},${rb} 0 1 1 ${f1(p3[0])},${f1(p3[1])} L${f1(p4[0])},${f1(p4[1])} A${ra},${ra} 0 0 1 ${f1(p1[0])},${f1(p1[1])}Z`;
    S('path', { d: dd, class: 'trv-remen-p' }, g);
    return S('path', { d: dd, class: 'trv-remen' }, g);
  }
  // jednostupanjski (J2, J4) i dvostupanjski (J3)
  const R1 = 26, R2 = R1 * Z2 / Z1;
  let rem = [], rems = [];
  function gradi() {
    gR.replaceChildren(); gZ.replaceChildren(); rem = []; rems = [];
    const O = D.OSI[st.os];
    if (O.remen) {
      if (st.os === 2) {
        const m = remenica(gR, 90, 170, R1, Z1), s1 = remenica(gR, 280, 170, R2 * 0.75, Math.round(Z2 * 0.75)), s2 = remenica(gR, 280, 170, R1, Z1), l = remenica(gR, 500, 170, R2 * 0.75, Math.round(Z2 * 0.75));
        rem.push(remen(gR, [90, 170], R1, [280, 170], R2 * 0.75));
        rem.push(remen(gR, [280, 170], R1, [500, 170], R2 * 0.75));
        gR.append(m, s1, s2, l); rems = [[m, 1, 0], [s1, 1 / (0.75 * Z2 / Z1), 0], [s2, 1 / (0.75 * Z2 / Z1), 0], [l, 1 / Math.pow(0.75 * Z2 / Z1, 2), 1]];
        T(gR, 90, 290, 'motor J3 (rame)', 'trv-ls', 'middle'); T(gR, 280, 290, 'međuremenica na osi ramena', 'trv-ls', 'middle'); T(gR, 500, 290, 'lakat J3', 'trv-ls', 'middle');
      } else {
        const m = remenica(gR, 130, 165, R1, Z1), l = remenica(gR, 430, 165, R2, Z2);
        rem.push(remen(gR, [130, 165], R1, [430, 165], R2));
        gR.append(m, l); rems = [[m, 1, 0], [l, Z1 / Z2, 1]];
        T(gR, 130, 290, 'motor ' + O.ime, 'trv-ls', 'middle'); T(gR, 430, 290, 'zglob ' + O.ime + ' (' + O.naziv + ')', 'trv-ls', 'middle');
      }
    } else {
      const m = remenica(gZ, 200, 165, 40, 14), l = remenica(gZ, 200 + 40 + 100 + 4, 165, 100, 35);
      gZ.append(m, l); rems = [[m, 1, 0], [l, -14 / 35, 0]];
      T(gZ, 200, 290, 'motor ' + O.ime + ' (zupčanik)', 'trv-ls', 'middle'); T(gZ, 344, 290, 'izlaz ' + O.ime + ' — pretpostavka', 'trv-ls', 'middle');
    }
    osvjezi();
  }
  const omjer = () => { if (!D.OSI[st.os].remen) return 35 / 14; return st.os === 2 ? Math.pow(0.75 * Z2 / Z1, 2) : Z2 / Z1; };
  function osvjezi() {
    for (const [g, k, izl] of rems) g.setAttribute('transform', `translate(${g.cx} ${g.cy}) rotate(${f1((st.thM * k - (izl ? st.akum : 0)) / RAD)})`);
    const kor = 2 * Math.PI * R1 / Z1;
    for (const e of rem) e.style.strokeDashoffset = f1(-st.thM * R1 % (kor * 100));
    const O = D.OSI[st.os], i = omjer();
    const racun = st.thM / i, stvarno = racun - st.akum;
    o.os(`${O.ime}: ${O.prijenos}`);
    o.i(hr(i, 2) + ' : 1 (ilustrativno)');
    o.m(hr(st.thM / RAD, 0) + '°'); o.r(hr(racun / RAD, 1) + '°'); o.s(hr(stvarno / RAD, 1) + '°');
    o.e(hr(st.akum / RAD, 1) + '°', st.akum > 1e-6 ? 'opas' : 'ok'); o.k(String(st.skok));
    if (!O.remen) ui.stanje(`${O.ime} nema remen prema izvorima — ovdje je prikazan zupčanički prijenos (pretpostavka). Zupčanici ne preskaču, ali imaju zračnost.`, 'upoz');
    else if (st.akum > 1e-6) ui.stanje(`Remen je preskočio ${st.skok} ${st.skok === 1 ? 'zub' : 'zuba'}: upravljač iz enkodera motora računa ${hr(racun / RAD, 1)}°, a zglob je stvarno na ${hr(stvarno / RAD, 1)}°. Pogrešku ne vidi nijedan senzor — treba napeti remen i ponoviti NEST.`, 'opas');
    else if (st.lab) ui.stanje('Remen je labav, ali pri malom opterećenju još ne preskače. Povećaj opterećenje.', 'upoz');
    else ui.stanje('Napet remen: zubi su stalno u zahvatu, kut zgloba je točno kut motora podijeljen omjerom.', 'ok');
  }
  ctx.petlja(dt => {
    if (!st.radi) return false;
    const w = st.v * 4;                               // ILUSTR rad/s na motoru (prikaz)
    st.thM += w * dt;
    if (D.OSI[st.os].remen && st.lab && st.F > 0.6 && Math.abs(w) > 0.1) {
      st.tr = (st.tr || 0) + dt * (st.F - 0.6) * 3;   // ILUSTR učestalost preskoka
      if (st.tr > 1) { st.tr = 0; st.skok++; st.akum += 2 * Math.PI / (st.os === 2 ? Math.round(Z2 * 0.75) : Z2) * Math.sign(w); }
    }
    osvjezi();
    return true;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r);
  ui.gumb('Napni remen i NEST', () => { st.lab = false; kvL.postavi(false); st.akum = 0; st.skok = 0; osvjezi(); }, { tanki: true, u: r });
  ui.seg('Os', D.OSI.map((x, i) => [i, x.ime + (x.remen ? ' (remen)' : '')]), st.os, i => { st.os = i; st.akum = 0; st.skok = 0; gradi(); });
  ui.klizac('Brzina motora', -100, 100, 5, st.v * 100, v => hrp(v, 0) + ' %', v => { st.v = v / 100; ctx.budi(); });
  ui.klizac('Opterećenje zgloba', 0, 100, 5, st.F * 100, v => hr(v, 0) + ' % (ilustrativno)', v => { st.F = v / 100; osvjezi(); });
  const kvL = ui.kvacica('Labav remen (može preskočiti zub)', false, v => { st.lab = v; osvjezi(); });
  const o = ui.ocit([['os', 'Prijenos osi'], ['i', 'Omjer remenica'], ['m', 'Kut motora (enkoder)'], ['r', 'Kut zgloba koji računa upravljač'], ['s', 'Stvarni kut zgloba'], ['e', 'Pogreška položaja'], ['k', 'Preskočenih zubi']]);
  gradi(); ctx.budi();
};

/* =========================================================== 3. kočnice J2 i J3 i ručno otpuštanje */
TXT['kocnica'] = {
  kratko: 'Zašto samo rame i lakat imaju kočnicu i kako se kočnice otpuštaju s privjeska.',
  uvod: () => {
    const sKoc = D.OSI.filter(o => o.kocnica).map(o => o.ime).join(' i ');
    return [
      `Kočnice imaju samo ${sKoc} (rame i lakat) — osi na koje sila teža djeluje najvećim momentom. Kad se isključi servo napajanje (isključenje, STOP u nuždi, pogreška I. vrste), kočnice drže nadlakticu i podlakticu da ruka ne padne. Struk J1 se ne giba pod težinom, a šaka J4/J5 ima male motore i mali krak tereta.`,
      'Ako ruku treba pomaknuti bez servo napajanja (npr. osloboditi zaglavljen predmet), kočnice se otpuštaju s privjeska: preklopnik SW1 bit 6 u DUM1 na ON, privjesak ON i držanje tipke ENT. Ruka tada pada pod vlastitom težinom — treba je pridržavati rukom.'
    ];
  },
  kako: () => 'Isključi servo tipkom EMG. STOP i vidi da kočnice J2 i J3 zatvaraju. Zatim prođi postupak otpuštanja: SW1 bit 6, privjesak ON i drži ENT (mišem, prstom ili razmaknicom). Bez kvačice „pridržavam ruku” ruka pada; pusti ENT i kočnice odmah zatvaraju.',
  napomena: () => 'Izvedba kočnice (opružna elektromagnetska, zatvorena bez struje) i brzina pada ruke su pretpostavka i ilustracija; priručnik potvrđuje samo da kočnice postoje na J2 i J3 i postupak otpuštanja. Prikaz ne simulira sudar s podlogom.',
  naredbe: ['NT', 'RS']
};
GRAD['kocnica'] = function (ui, ctx) {
  const ORG = D.ORG.slice();
  const st = { servo: true, sw6: false, tb: false, ent: false, drzim: false, q: [0, 60 * RAD, -70 * RAD, -60 * RAD, 0], emg: false };
  const svg = ui.svg(600, 420, 'Bočni pogled robota s oznakama kočnica na ramenu i laktu; ruka pada kad su kočnice otpuštene bez servo napajanja');
  const rb = robotBocno(svg, { ox: 220, oy: 380, k: 560 });
  const koc = [0, 1].map(() => { const g = S('g', {}, svg); S('rect', { x: -15, y: -15, width: 30, height: 30, rx: 6, class: 'trv-koc' }, g); T(g, 0, 6, 'K', 'trv-lb trv-na-koc', 'middle'); return g; });
  const kT = [T(svg, 0, 0, '', 'trv-ls'), T(svg, 0, 0, '', 'trv-ls')];
  // LED/oznake
  const sv = S('g', {}, svg);
  const ledS = S('circle', { cx: 380, cy: 40, r: 10, class: 'trv-led trv-led-zel' }, sv); T(sv, 398, 46, 'servo napajanje', 'trv-ls');
  const ledK = S('circle', { cx: 380, cy: 70, r: 10, class: 'trv-led trv-led-crv' }, sv); T(sv, 398, 76, 'kočnice J2/J3 zatvorene', 'trv-ls');
  const pad = T(svg, 300, 30, '', 'trv-alarm', 'middle');
  const otpust = () => !st.servo && st.sw6 && st.tb && st.ent;
  const kor = ui.koraci([
    'Servo napajanje isključeno (isključenje ili pogreška I. vrste).',
    'SW1 bit 6 na ON (iza bočnih vrata DUM1).',
    'Privjesak na ON.',
    'Drži ENT i pridržavaj ruku — kočnice J2 i J3 su otpuštene.',
    'Pusti ENT, vrati SW1 bit 6 na OFF; nakon uključenja NEST.'
  ]);
  function osvjezi() {
    rb.postavi(st.q, TLmm() / 1000, 0.6);
    const P = rb.tocke;
    [P[0], P[1]].forEach((p, i) => { koc[i].setAttribute('transform', `translate(${f1(p[0] - 30)} ${f1(p[1] - 30)})`); postavi(kT[i], { x: p[0] - 52, y: p[1] - 50 }); });
    const ot = otpust();
    koc.forEach(g => { razred(g.firstChild, 'trv-koc-otp', ot || st.servo); });
    tekst(kT[0], 'J2'); tekst(kT[1], 'J3');
    razred(ledS, 'trv-on', st.servo); razred(ledK, 'trv-on', !(ot || st.servo));
    tekst(pad, ot && !st.drzim ? 'RUKA PADA — PRIDRŽAVAJ!' : '');
    o.servo(st.servo ? 'uključeno' : 'isključeno', st.servo ? 'ok' : 'opas');
    o.koc(st.servo ? 'otpuštene (motori drže)' : ot ? 'otpuštene ručno' : 'zatvorene', ot ? 'upoz' : st.servo ? 'ok' : 'opas');
    o.ost(D.OSI.filter(x => !x.kocnica).map(x => x.ime).join(', ') + ' — bez kočnice');
    o.j2(hr(st.q[1] / RAD, 1) + '°'); o.j3(hr(st.q[2] / RAD, 1) + '°');
    const korak = st.servo ? -1 : !st.sw6 ? 1 : !st.tb ? 2 : !st.ent ? 3 : 3;
    kor.postavi(st.servo ? -1 : st.ent && st.sw6 && st.tb ? 3 : korak);
    if (st.servo) ui.stanje('Servo je uključen: motori drže ruku, kočnice su otpuštene. Pritisni EMG. STOP.', 'ok');
    else if (ot && !st.drzim) ui.stanje('Kočnice su otpuštene, a ruka nije pridržana: nadlaktica i podlaktica padaju pod vlastitom težinom.', 'opas');
    else if (ot) ui.stanje('Kočnice su otpuštene, ruka je pridržana. Pusti ENT kad je ruka u sigurnom položaju.', 'upoz');
    else if (st.ent && !(st.sw6 && st.tb)) ui.stanje('ENT bez SW1 bit 6 = ON i privjeska ON ne otpušta kočnice.', 'upoz');
    else ui.stanje('Servo je isključen (pogreška I. vrste): kočnice J2 i J3 drže ruku u položaju.', 'opas');
  }
  ctx.petlja(dt => {
    if (otpust() && !st.drzim) {
      const v = 18 * RAD * dt;                         // ILUSTR brzina pada
      st.q[1] = Math.max(D.OSI[1].min, st.q[1] - v);
      st.q[2] = Math.max(D.OSI[2].min, st.q[2] - v * 1.2);
    }
    osvjezi();
    return otpust() && !st.drzim;
  });
  const r = ui.red();
  const bE = ui.gumb('EMG. STOP', () => { st.servo = false; st.emg = true; osvjezi(); }, { kl: 'trv-g-stop', u: r });
  ui.gumb('Isključi, uključi i NEST', () => { st.servo = true; st.ent = false; st.q = [0, 60 * RAD, -70 * RAD, -60 * RAD, 0]; osvjezi(); }, { tanki: true, u: r });
  void bE; void ORG;
  ui.kvacica('SW1 bit 6 = ON (otpuštanje s privjeska)', false, v => { st.sw6 = v; osvjezi(); ctx.budi(); });
  ui.kvacica('Privjesak ON', false, v => { st.tb = v; osvjezi(); ctx.budi(); });
  ui.kvacica('Pridržavam ruku', false, v => { st.drzim = v; osvjezi(); ctx.budi(); });
  const r2 = ui.red();
  const bEnt = ui.gumb('ENT (drži)', null, { u: r2, aria: 'ENT na privjesku — drži za otpuštanje kočnica', kl: 'trv-g-drzi' });
  drzi(ctx, bEnt, v => { st.ent = v; bEnt.setAttribute('aria-pressed', String(v)); osvjezi(); ctx.budi(); });
  const o = ui.ocit([['servo', 'Servo napajanje'], ['koc', 'Kočnice J2 i J3'], ['ost', 'Ostale osi'], ['j2', 'J2 (rame)'], ['j3', 'J3 (lakat)']]);
  const sw = D.DUM1_PLOCA.sw1.find(b => b.bit === 6);
  ui.sitno(`SW1 bit ${sw.bit}: ${sw.naziv.charAt(0).toLowerCase() + sw.naziv.slice(1)} (gore: ${sw.gore}, dolje: ${sw.dolje}).`);
  osvjezi();
};

/* =========================================================== 4. NEST — traženje mehaničkog ishodišta */
TXT['nest'] = {
  kratko: 'Redoslijed osi pri NEST-u i kako granični prekidač i Z-faza enkodera daju točno ishodište.',
  uvod: () => {
    const R = D.NEST.redoslijed;
    return [
      `Enkoderi su inkrementalni: nakon uključenja upravljačka jedinica ne zna gdje je ruka. Zato je NEST obvezan nakon svakog uključenja — dok nije napravljen, naredbe gibanja javljaju pogrešku II. vrste. Pokreće se naredbom NT s računala (privjesak OFF) ili na privjesku slijedom NST, ENT; za to vrijeme svijetli EXECUTE.`,
      `Redoslijed je propisan: najprije ${R[0].join(', ')} (ruka se sklapa i podiže od podloge), zatim ${R[1].join(' i ')}. Svaka os ide prema svom graničnom prekidaču; prekidač javlja da je ishodište blizu, a točan položaj daje prvi impuls Z-faze enkodera nakon prekidača. Prije NEST-a ruku treba ručno dovesti u siguran položaj.`
    ];
  },
  kako: () => 'Odaberi početni položaj i pokreni NEST. Prati redoslijed u tablici i vremenski dijagram: brzo traženje prekidača, odmicanje, polagani prilaz i zaustavljanje na Z-impulsu. „Korak” zaustavlja animaciju nakon svakog događaja (prekidač ili Z-faza), a klizač usporava prikaz.',
  napomena: () => `Priručnik daje redoslijed osi i to da se koriste granični prekidači i Z-faza; tijek pojedine osi (brzo traženje, odmicanje, polagani prilaz) je uobičajen postupak i ovdje je pretpostavka. Brzina traženja: SP ${D.UPRAVLJANJE_ZADANO.nestSp}, polagani prilaz 10 % te brzine (ilustrativno). Kutovi ishodišta su pretpostavka (${kutovi(D.NEST.q)}); priručnik potvrđuje samo J5 ≈ ±179,9°.`,
  naredbe: ['NT', 'OG', 'HO']
};
GRAD['nest'] = function (ui, ctx) {
  const POC = {
    dolje: [-40, 25, -50, -40, 30].map(v => v * RAD),
    okrenut: [110, 55, -35, 10, -100].map(v => v * RAD),
    ispruzen: [-80, 15, -15, 20, 120].map(v => v * RAD)
  };
  const SP = D.UPRAVLJANJE_ZADANO.nestSp, PREK = 2 * RAD, HIST = 0.6 * RAD;   // ILUSTR: prekidač 2° prije Z, histereza 0,6°
  const RED = D.NEST.redoslijed.map(f => f.map(n => D.OSI.findIndex(o => o.ime === n)));
  const st = { radi: false, korak: false, poc: 'dolje', q: POC.dolje.slice(), t: 0, faza: -1, brzina: 1, gotovo: false };
  let osS = [];
  const svg = ui.svg(600, 520, 'NEST: bočni pogled ruke, pogled odozgo za J1, brojčanik J5 i vremenski dijagram prekidača i Z-faze za svih pet osi');
  const rb = robotBocno(svg, { ox: 130, oy: 300, k: 400 });
  const ro = robotOdozgo(svg, { ox: 440, oy: 150, k: 165, rGr: 0.6 });
  T(svg, 130, 24, 'bočno (J2, J3, J4)', 'trv-ls', 'middle'); T(svg, 440, 24, 'odozgo (J1)', 'trv-ls', 'middle');
  // J5 brojčanik
  const J5x = 545, J5y = 270;
  S('circle', { cx: J5x, cy: J5y, r: 32, class: 'trv-disk' }, svg);
  const j5k = S('line', { x1: J5x, y1: J5y, class: 'trv-kazaljka', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  T(svg, J5x, J5y + 50, 'J5', 'trv-ls', 'middle');
  const ledE = S('circle', { cx: 330, cy: 288, r: 9, class: 'trv-led trv-led-zel' }, svg); T(svg, 344, 294, 'EXECUTE', 'trv-ls');
  // vremenski dijagram
  const GX = 70, GW = 510, GY = 340, RH = 34;
  const imena = RED.flat();
  const tlin = {}, zlin = {};
  imena.forEach((i, r) => {
    const y = GY + r * RH;
    T(svg, GX - 10, y + 22, D.OSI[i].ime, 'trv-lb', 'end');
    S('line', { x1: GX, y1: y + 28, x2: GX + GW, y2: y + 28, class: 'trv-mreza' }, svg);
    tlin[i] = S('path', { class: 'trv-signal' }, svg);
    zlin[i] = S('g', {}, svg);
  });
  const kursor = S('line', { y1: GY - 4, y2: GY + RH * 5, class: 'trv-kursor' }, svg);
  const legT = T(svg, GX, GY - 10, 'gore: prekidač aktivan · narančasto: Z-impuls · vrijeme →', 'trv-ls');
  void legT;
  const tab = H('table', { class: 'trv-tab' });
  tab.append(H('thead', {}, H('tr', {}, H('th', { tekst: 'Os' }), H('th', { tekst: 'Faza' }), H('th', { tekst: 'Kut' }), H('th', { tekst: 'Stanje' }))));
  const tb = H('tbody'); tab.append(tb);
  const redT = {};
  imena.forEach(i => { const tds = [H('td', { tekst: D.OSI[i].ime }), H('td', { tekst: String(RED.findIndex(f => f.includes(i)) + 1) }), H('td'), H('td')]; const tr = H('tr', {}, ...tds); tb.append(tr); redT[i] = { tr, tds }; });
  ui.ocitP.append(H('div', { class: 'trv-tab-om' }, tab));
  const o = ui.ocit([['f', 'Faza'], ['t', 'Vrijeme'], ['tz', 'Procjena za NEST (podatak)']]);
  const NAZ = { ceka: 'čeka', trazi: 'traži prekidač (brzo)', preko: 'usporava', odmak: 'odmiče od prekidača', prilaz: 'polagani prilaz', z: 'čeka Z-impuls', gotov: 'ishodište ✓' };
  function nova() {
    st.q = POC[st.poc].slice(); st.t = 0; st.faza = -1; st.gotovo = false;
    osS = D.OSI.map((O, i) => {
      const qZ = D.NEST.q[i], dir = (qZ - st.q[i]) >= 0 ? 1 : -1;
      return { i, qZ, dir, qS: qZ - dir * PREK, stanje: 'ceka', zapis: [], z: [], vB: O.vMaxRad * udioSP(SP) };
    });
    for (const s of osS) s.zapis.push([0, 0]);
    osvjezi();
  }
  const prek = s => (s.dir > 0 ? st.q[s.i] >= s.qS : st.q[s.i] <= s.qS) ? 1 : 0;
  function korakOsi(s, dt) {
    const q = st.q, i = s.i; let dog = false;
    const mic = (v, cilj) => { const d = cilj - q[i], m = v * dt; if (Math.abs(d) <= m) { q[i] = cilj; return true; } q[i] += Math.sign(d) * m; return false; };
    switch (s.stanje) {
      case 'trazi': { const prije = prek(s); q[i] += s.dir * s.vB * dt; if (!prije && prek(s)) { s.stanje = 'preko'; dog = true; } break; }
      case 'preko': if (mic(s.vB * 0.5, s.qS + s.dir * PREK * 0.75)) s.stanje = 'odmak'; break;
      case 'odmak': if (mic(s.vB * 0.1, s.qS - s.dir * HIST)) { s.stanje = 'prilaz'; dog = true; } break;
      case 'prilaz': { q[i] += s.dir * s.vB * 0.1 * dt; if (prek(s)) s.stanje = 'z'; break; }
      case 'z': if (mic(s.vB * 0.1, s.qZ)) { s.stanje = 'gotov'; s.z.push(st.t); dog = true; } break;
      default: break;
    }
    s.zapis.push([st.t, prek(s)]);
    return dog;
  }
  function pocniFazu() { for (const i of RED[st.faza]) osS[i].stanje = prek(osS[i]) ? 'odmak' : 'trazi'; }
  function korak(dt) {
    if (st.gotovo) return false;
    if (st.faza < 0) { st.faza = 0; pocniFazu(); }
    st.t += dt;
    let dog = false;
    for (const i of RED[st.faza]) if (korakOsi(osS[i], dt)) dog = true;
    for (const s of osS) if (!RED[st.faza].includes(s.i)) s.zapis.push([st.t, prek(s)]);
    if (RED[st.faza].every(i => osS[i].stanje === 'gotov')) {
      if (st.faza + 1 < RED.length) { st.faza++; pocniFazu(); dog = true; }
      else { st.gotovo = true; st.radi = false; bP.osvjezi(); dog = true; }
    }
    return dog;
  }
  function osvjezi() {
    rb.postavi(st.q, TLmm() / 1000, 1); ro.postavi(st.q);
    const a5 = -Math.PI / 2 - st.q[4];
    postavi(j5k, { x2: J5x + 26 * Math.cos(a5), y2: J5y + 26 * Math.sin(a5) });
    const tMax = Math.max(4, st.t * 1.05);
    for (const s of osS) {
      const r = imena.indexOf(s.i), y1 = GY + r * RH + 28, y0 = y1 - 18;
      const X = t => GX + GW * t / tMax;
      let d = '', prev = null;
      for (const [t, v] of s.zapis) { const x = X(t), y = v ? y0 : y1; if (prev == null) d = 'M' + f1(x) + ',' + f1(y); else if (prev !== v) d += 'L' + f1(x) + ',' + f1(prev ? y0 : y1) + 'L' + f1(x) + ',' + f1(y); prev = v; }
      if (s.zapis.length) d += 'L' + f1(X(s.zapis[s.zapis.length - 1][0])) + ',' + f1(prev ? y0 : y1);
      tlin[s.i].setAttribute('d', d);
      zlin[s.i].replaceChildren();
      for (const tz of s.z) S('line', { x1: f1(X(tz)), x2: f1(X(tz)), y1: y0 - 6, y2: y1 + 2, class: 'trv-zimp', 'stroke-width': 3 }, zlin[s.i]);
      const R = redT[s.i];
      R.tds[2].textContent = hr(st.q[s.i] / RAD, 1) + '°';
      R.tds[3].textContent = NAZ[s.stanje];
      R.tr.classList.toggle('trv-akt', st.faza >= 0 && RED[st.faza].includes(s.i) && s.stanje !== 'gotov');
    }
    postavi(kursor, { x1: GX + GW * st.t / tMax, x2: GX + GW * st.t / tMax });
    razred(ledE, 'trv-on', st.faza >= 0 && !st.gotovo);
    o.f(st.gotovo ? 'gotovo' : st.faza < 0 ? 'čeka NT' : `${st.faza + 1}: ${RED[st.faza].map(i => D.OSI[i].ime).join(', ')}`);
    o.t(hr(st.t, 1) + ' s'); o.tz('≈ ' + hr(D.NEST.vrijeme, 0) + ' s (pretpostavka)');
    if (st.gotovo) ui.stanje(`NEST je gotov za ${hr(st.t, 1)} s: brojila svih osi postavljena su na ishodište (${kutovi(D.NEST.q)}). Sada su dopuštene sve naredbe gibanja.`, 'ok');
    else if (st.faza < 0) ui.stanje('Robot je uključen, ali ne zna položaj osi. Pokreni NEST (NT ili NST, ENT).');
    else ui.stanje(`Faza ${st.faza + 1}: ${RED[st.faza].map(i => D.OSI[i].ime + ' — ' + NAZ[osS[i].stanje]).join('; ')}.`, 'plavo');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const h = dt * st.brzina, n = Math.max(1, Math.ceil(h / 0.01));
    for (let k = 0; k < n; k++) { if (korak(h / n) && st.korak) { st.radi = false; bP.osvjezi(); break; } }
    osvjezi();
    return st.radi;
  });
  const r = ui.red();
  const bP = ui.igraj(st, 'radi', 'Pokreni NEST (NT)', v => { if (v && st.gotovo) nova(); st.korak = false; }, r);
  ui.gumb('Korak', () => { if (st.gotovo) nova(); st.korak = true; st.radi = true; bP.osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  ui.gumb('Iznova', () => { st.radi = false; bP.osvjezi(); nova(); }, { tanki: true, u: r });
  ui.seg('Početni položaj (ručno doveden)', [['dolje', 'ruka dolje'], ['okrenut', 'okrenut struk'], ['ispruzen', 'ispružena']], st.poc, v => { st.poc = v; st.radi = false; bP.osvjezi(); nova(); });
  ui.klizac('Brzina prikaza', 0.25, 2, 0.25, 1, v => '× ' + hr(v, 2), v => { st.brzina = v; });
  nova();
};


/* =========================================================== 5. zglobno i linearno gibanje (MO i MS) */
TXT['zglobno-linearno'] = {
  kratko: 'Usporedba putanje vrha alata pri MO (zglobna interpolacija) i MS (pravac kroz n međutočaka).',
  uvod: () => {
    const ms = NAR('MS'), n = ms ? ms.argumenti[1] : { min: 1, max: 99 };
    return [
      'Naredbom MO a robot ide na poziciju a zglobnom interpolacijom: svaki zglob se okreće jednoliko od početnog do krajnjeg kuta, sve osi kreću i stižu istodobno. To je najbrže i najmirnije gibanje, ali vrh alata (TCP) ne ide po pravcu — opisuje luk koji ovisi o položaju ruke.',
      `Naredbom MS a, n vrh alata ide po pravcu do pozicije a. Upravljačka jedinica na pravcu izračuna n međutočaka (${n.min}–${n.max}) inverznom kinematikom i između njih giba zglobno. S malim n putanja je izlomljena u lukove, s većim je bliža pravcu. Ako ijedna međutočka nije dohvatljiva, MS javlja pogrešku II. vrste prije početka gibanja.`
    ];
  },
  kako: () => 'Odaberi par točaka i naredbu, pa pokreni. Gore lijevo je tlocrt, desno pogled sprijeda, dolje kutovi zglobova kroz vrijeme. Klizačem mijenjaj broj međutočaka n i prati najveće odstupanje od pravca. Brzina SP mijenja trajanje (izračun iz najvećih brzina osi).',
  napomena: () => 'Putanje su izračunate kinematikom modela (rvm1_kin.js) uz pretpostavljenu visinu ramena d1 i duljinu alata TL. Ubrzanje i usporenje su zanemareni; trajanje MS raspodijeljeno je jednako na sve odsječke (pretpostavka). Kartezijske točke parova su primjeri.',
  naredbe: ['MO', 'MS', 'SP', 'PD']
};
GRAD['zglobno-linearno'] = function (ui, ctx) {
  const PAROVI = [                                    // primjeri točaka (mm, °) — ILUSTR
    [{ x: 300, y: -150, z: 100, p: -90, r: 0 }, { x: 300, y: 150, z: 100, p: -90, r: 0 }],
    [{ x: 350, y: 0, z: 150, p: -90, r: 0 }, { x: 150, y: 250, z: 200, p: -90, r: 0 }],
    [{ x: 320, y: -100, z: 40, p: -90, r: 0 }, { x: 200, y: 200, z: 40, p: -90, r: 0 }]
  ];
  const ms = NAR('MS'), nMax = ms ? ms.argumenti[1].max : 99;
  const st = { par: 0, nac: 'oba', n: 3, sp: D.BRZINE.zadano, radi: true, t: 0, cekaj: 0 };
  let A, B, TA, TB, qA, qB, pMO = [], pMS = [], qMS = [], greskaMS = null, tMO = 1, tMS = 1;
  const svg = ui.svg(600, 560, 'Putanja vrha alata pri MO i MS u tlocrtu i pogledu sprijeda te kutovi zglobova kroz vrijeme');
  const K1 = 560, OX = 150, OY = 300;                  // tlocrt: gore = +X, lijevo = +Y
  const ro = robotOdozgo(svg, { ox: OX, oy: OY, k: K1, granice: false });
  ro.g.setAttribute('clip-path', svg.clip(0, 30, 300, 300));
  const tl = (x, y) => [OX - y * K1, OY - x * K1];
  const K2 = 640, FX = 450, FY = 300;                  // sprijeda: lijevo = +Y, gore = +Z
  const fr = (y, z) => [FX - y * K2, FY - z * K2];
  S('line', { x1: 305, y1: 10, x2: 305, y2: 320, class: 'trv-mreza' }, svg);
  S('line', { x1: 315, y1: FY, x2: 590, y2: FY, class: 'trv-pod' }, svg);
  T(svg, 10, 22, 'tlocrt (X gore, Y lijevo)', 'trv-ls'); T(svg, 315, 22, 'sprijeda (Y lijevo, Z gore)', 'trv-ls');
  const v = {};
  for (const [gk, g] of [['t', svg], ['f', svg]]) {
    v[gk] = { prav: S('path', { class: 'trv-putanja-p' }, g), mo: S('path', { class: 'trv-put-mo' }, g), ms: S('path', { class: 'trv-put-ms' }, g), mt: S('g', {}, g), dMO: S('circle', { r: 6, class: 'trv-tocka-mo' }, g), dMS: S('circle', { r: 6, class: 'trv-tocka-ms' }, g) };
  }
  const oznA = [T(svg, 0, 0, 'A', 'trv-lb'), T(svg, 0, 0, 'B', 'trv-lb'), T(svg, 0, 0, 'A', 'trv-lb'), T(svg, 0, 0, 'B', 'trv-lb')];
  // kutovi zglobova
  const G = graf(svg, 60, 360, 520, 150, { x0: 0, x1: 1, y0: -120, y1: 120, yt: [-90, 0, 90], xt: [0, 0.5, 1], xf: x => x === 1 ? 'kraj' : x ? 'pola' : 'početak', naslov: 'kutovi J1–J4 (°): crtkano MO, puno MS' });
  const jl = [0, 1, 2, 3].map(i => ({ mo: S('path', { class: `trv-jl trv-j${i + 1} trv-crtkano` }, svg), ms: S('path', { class: `trv-jl trv-j${i + 1}` }, svg) }));
  [0, 1, 2, 3].forEach(i => T(svg, 70 + i * 60, 548, 'J' + (i + 1), `trv-ls trv-tj${i + 1}`));
  const kurG = S('line', { y1: 360, y2: 510, class: 'trv-kursor' }, svg);
  const greskaT = T(svg, 450, 200, '', 'trv-alarm', 'middle');
  const fx = ui.formula('Program', 4);
  const o = ui.ocit([['l', 'Duljina pravca A → B'], ['tmo', 'Trajanje MO'], ['tms', 'Trajanje MS'], ['dmo', 'Najveće odstupanje MO od pravca'], ['dms', 'Najveće odstupanje MS od pravca'], ['q', 'Kutovi (MS)']]);
  const udalj = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2, s = ogr((ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L2, 0, 1); return Math.hypot(ap[0] - s * ab[0], ap[1] - s * ab[1], ap[2] - s * ab[2]); };
  function izracun() {
    [A, B] = PAROVI[st.par];
    TA = KIN.izTocke(A); TB = KIN.izTocke(B);
    const tlm = TLmm() / 1000;
    qA = KIN.ik(TA, tlm).q; qB = KIN.ik(TB, tlm, qA).q;
    pMO = []; for (let k = 0; k <= 80; k++) pMO.push(KIN.fk(KIN.interpolirajZglobno(qA, qB, k / 80), tlm).p);
    const r = KIN.linearnoTocke(TA, TB, st.n, tlm);
    greskaMS = r.greska ? `MS: međutočka ${r.indeks} nije dohvatljiva (${r.greska}) — pogreška II` : null;
    qMS = r.q || []; pMS = [];
    for (let j = 0; j + 1 < qMS.length; j++) for (let k = 0; k < 10; k++) pMS.push(KIN.fk(KIN.interpolirajZglobno(qMS[j], qMS[j + 1], k / 10), tlm).p);
    if (qMS.length) pMS.push(KIN.fk(qMS[qMS.length - 1], tlm).p);
    tMO = Math.max(0.2, KIN.trajanje(qA, qB, st.sp)); tMS = Math.max(0.2, KIN.trajanjeLinearno(TA, TB, st.sp, tlm));
    crtaj();
  }
  const qMSu = u => { if (qMS.length < 2) return qA; const m = qMS.length - 1, x = ogr(u, 0, 1) * m, j = Math.min(m - 1, Math.floor(x)); return KIN.interpolirajZglobno(qMS[j], qMS[j + 1], x - j); };
  function crtaj() {
    const pa = KIN.fk(qA).p, pb = KIN.fk(qB).p;
    const pathT = arr => put(arr.map(p => tl(p[0], p[1]))), pathF = arr => put(arr.map(p => fr(p[1], p[2])));
    v.t.prav.setAttribute('d', pathT([pa, pb])); v.f.prav.setAttribute('d', pathF([pa, pb]));
    const prikMO = st.nac !== 'ms', prikMS = st.nac !== 'mo';
    v.t.mo.setAttribute('d', prikMO ? pathT(pMO) : ''); v.f.mo.setAttribute('d', prikMO ? pathF(pMO) : '');
    v.t.ms.setAttribute('d', prikMS ? pathT(pMS) : ''); v.f.ms.setAttribute('d', prikMS ? pathF(pMS) : '');
    for (const gk of ['t', 'f']) {
      v[gk].mt.replaceChildren();
      if (prikMS) qMS.forEach(q => { const p = KIN.fk(q).p, [x, y] = gk === 't' ? tl(p[0], p[1]) : fr(p[1], p[2]); S('circle', { cx: f1(x), cy: f1(y), r: 3.5, class: 'trv-medjutocka' }, v[gk].mt); });
    }
    const [ax, ay] = tl(pa[0], pa[1]), [bx, by] = tl(pb[0], pb[1]), [cx, cy] = fr(pa[1], pa[2]), [dx, dy] = fr(pb[1], pb[2]);
    postavi(oznA[0], { x: ax + 8, y: ay - 8 }); postavi(oznA[1], { x: bx + 8, y: by - 8 }); postavi(oznA[2], { x: cx + 8, y: cy - 10 }); postavi(oznA[3], { x: dx + 8, y: dy - 10 });
    jl.forEach((l, i) => {
      const dMO = [], dMS = [];
      for (let k = 0; k <= 60; k++) { const u = k / 60; dMO.push([G.X(u), G.Y(ogr(KIN.interpolirajZglobno(qA, qB, u)[i] / RAD, -120, 120))]); if (qMS.length > 1) dMS.push([G.X(u), G.Y(ogr(qMSu(u)[i] / RAD, -120, 120))]); }
      l.mo.setAttribute('d', prikMO ? put(dMO) : ''); l.ms.setAttribute('d', prikMS ? put(dMS) : '');
    });
    tekst(greskaT, greskaMS && prikMS ? 'pogreška II: MS nedostižan' : '');
    const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]) * 1000;
    const dmo = Math.max(...pMO.map(p => udalj(p, pa, pb))) * 1000, dms = pMS.length ? Math.max(...pMS.map(p => udalj(p, pa, pb))) * 1000 : NaN;
    o.l(hr(L, 1) + ' mm'); o.tmo(hr(tMO, 2) + ' s (SP ' + st.sp + ')'); o.tms(greskaMS ? '—' : hr(tMS, 2) + ' s (SP ' + st.sp + ')');
    o.dmo(hr(dmo, 1) + ' mm', dmo > 5 ? 'upoz' : 'ok'); o.dms(greskaMS ? greskaMS : hr(dms, 1) + ' mm (n = ' + st.n + ')', greskaMS ? 'opas' : dms > 5 ? 'upoz' : 'ok');
    const pd = (a, t) => `PD ${a}, ${[t.x, t.y, t.z, t.p, t.r].map(x => x.toFixed(1)).join(', ')}`;
    fx.set(0, pd(1, A)); fx.set(1, pd(2, B)); fx.set(2, 'MO 1');
    fx.set(3, st.nac === 'mo' ? 'MO 2' : st.nac === 'ms' ? `MS 2, ${st.n}` : `MO 2   ili   MS 2, ${st.n}`);
  }
  function animiraj() {
    const tlm = TLmm() / 1000;
    const uMO = ogr(st.t / tMO, 0, 1), uMS = ogr(st.t / tMS, 0, 1);
    const qmo = KIN.interpolirajZglobno(qA, qB, uMO), qms = qMSu(uMS);
    const pmo = KIN.fk(qmo, tlm).p, pms = KIN.fk(qms, tlm).p;
    const vid = (e, b) => { e.style.display = b ? '' : 'none'; };
    const pMOk = st.nac !== 'ms', pMSk = st.nac !== 'mo' && !greskaMS;
    let x, y;
    [x, y] = tl(pmo[0], pmo[1]); postavi(v.t.dMO, { cx: x, cy: y }); [x, y] = fr(pmo[1], pmo[2]); postavi(v.f.dMO, { cx: x, cy: y });
    [x, y] = tl(pms[0], pms[1]); postavi(v.t.dMS, { cx: x, cy: y }); [x, y] = fr(pms[1], pms[2]); postavi(v.f.dMS, { cx: x, cy: y });
    vid(v.t.dMO, pMOk); vid(v.f.dMO, pMOk); vid(v.t.dMS, pMSk); vid(v.f.dMS, pMSk);
    ro.postavi(st.nac === 'mo' || greskaMS ? qmo : qms, tlm);
    const u = st.nac === 'mo' ? uMO : uMS;
    postavi(kurG, { x1: G.X(u), x2: G.X(u) });
    o.q(kutovi((st.nac === 'mo' || greskaMS ? qmo : qms).slice(0, 4)));
    const kraj = Math.max(st.nac !== 'ms' ? tMO : 0, st.nac !== 'mo' && !greskaMS ? tMS : 0);
    if (greskaMS && st.nac !== 'mo') ui.stanje(greskaMS + '. Robot se ne pomiče.', 'opas');
    else if (st.t >= kraj) ui.stanje(st.nac === 'mo' ? `MO je gotov za ${hr(tMO, 2)} s: zglobovi su se okretali jednoliko, a TCP je opisao luk.` : `MS je gotov: TCP je prošao ${st.n} međutočaka na pravcu; između njih zglobovi se gibaju zglobno.`, 'ok');
    else ui.stanje(st.nac === 'oba' ? 'Narančasto MO (zglobno), tirkizno MS (linearno). Isti početak i kraj, različita putanja i trajanje.' : st.nac === 'mo' ? 'MO: sve osi kreću i stižu istodobno.' : 'MS: TCP prati pravac kroz međutočke.', 'plavo');
    return kraj;
  }
  ctx.petlja(dt => {
    if (!st.radi) { animiraj(); return false; }
    const kraj = animiraj();
    if (st.t >= kraj) { st.cekaj += dt; if (st.cekaj > 1.2) { st.t = 0; st.cekaj = 0; } }
    else st.t += dt;
    return true;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r);
  ui.gumb('Iznova', () => { st.t = 0; st.cekaj = 0; animiraj(); ctx.budi(); }, { tanki: true, u: r });
  ui.seg('Naredba', [['mo', 'MO'], ['ms', 'MS'], ['oba', 'MO i MS']], st.nac, x => { st.nac = x; st.t = 0; crtaj(); animiraj(); ctx.budi(); });
  ui.seg('Točke A → B', PAROVI.map((p, i) => [i, 'par ' + (i + 1)]), 0, i => { st.par = i; st.t = 0; izracun(); animiraj(); ctx.budi(); });
  ui.klizac('Međutočaka n (MS)', 1, Math.min(nMax, 30), 1, st.n, x => String(x), x => { st.n = x; izracun(); animiraj(); });
  ui.klizac('Brzina SP', 0, 9, 1, st.sp, x => 'SP ' + x + ' (' + hr(udioSP(x) * 100, 0) + ' %)', x => { st.sp = x; st.t = 0; izracun(); animiraj(); });
  ui.sitno(`Klizač n ide do 30 radi preglednosti; naredba MS prima ${ms ? ms.argumenti[1].min + '–' + ms.argumenti[1].max : '1–99'}.`);
  izracun(); animiraj(); ctx.budi();
};

/* =========================================================== 6. kinematika robota s 5 osi */
TXT['ik-5-osi'] = {
  kratko: 'Inverzna kinematika RV-M1: J1 iz tlocrta, dvozglobni trokut u ravnini ruke i P = J2 + J3 + J4.',
  uvod: () => [
    'Robot ima pet osi: struk J1 okreće cijelu ruku oko okomite osi, a rame J2, lakat J3 i nagib šake J4 imaju vodoravne, međusobno usporedne osi. Zato nadlaktica, podlaktica, šaka i os alata uvijek leže u jednoj okomitoj ravnini kroz os J1. Okret šake J5 vrti alat samo oko njegove vlastite osi.',
    'Posljedica: TCP i os alata moraju ležati u toj ravnini. Robot ne može zakrenuti alat bočno (nema šeste osi); točku zadaje pet brojeva X, Y, Z, P, R. Inverzna kinematika je zato analitička: J1 = atan2(y, x), zatim se u ravnini od TCP-a oduzme duljina šake i alata u smjeru P, a za točku šake riješi se trokut nadlaktica–podlaktica (lakat gore). Na kraju J4 = P − J2 − J3.'
  ],
  kako: () => 'Vuci TCP u tlocrtu ili u bočnom pogledu (ili zadaj X, Y, Z, P, R klizačima). Formule desno računaju se uživo. Klizačem „željeni smjer alata u tlocrtu” zadaj bočni zakret alata: ako ne leži u ravnini ruke, točka je nedostižna — gumb pomiče TCP u ravninu tog smjera. Kvačica prikazuje drugo rješenje (ruka „preko glave”, J1 + 180°), ako je u granicama osi.',
  napomena: () => `Kutovi su u našoj konvenciji (J2 od vodoravne, J3 ≤ 0, P = J2 + J3 + J4) — kako robot sam broji kutove nije u dostupnim izvorima. Visina ramena d1 = ${hr(D.MJERE.d1 * 1000, 0)} mm je pretpostavka; L2, L3, L4 i TL iz izvora.`,
  naredbe: ['MP', 'PD', 'WH', 'MJ']
};
GRAD['ik-5-osi'] = function (ui, ctx) {
  const M = D.MJERE, tlm = () => TLmm() / 1000;
  const st = { x: 350, y: 170, z: 150, p: -45, r: 0, psi: null, iza: false, q: D.ORG.slice() };
  st.psi = Math.atan2(st.y, st.x) / RAD;
  const svg = ui.svg(600, 430, 'Tlocrt s ravninom ruke kroz os J1 i bočni pogled ravnine ruke s trokutom nadlaktica–podlaktica i kutovima J2, J3, J4');
  const OX = 130, OY = 250, K1 = 300;
  const ro = robotOdozgo(svg, { ox: OX, oy: OY, k: K1, rGr: 0.62 });
  ro.g.setAttribute('clip-path', svg.clip(0, 0, 266, 430));
  const ravL = S('line', { class: 'trv-ravnina' }, svg);
  const psiS = strel(svg, 0, 0, 1, 1, 'trv-c-nar', 3);
  const metaT = S('circle', { r: 9, class: 'trv-meta' }, svg);
  T(svg, 10, 20, 'tlocrt — vuci TCP', 'trv-ls');
  S('line', { x1: 268, y1: 8, x2: 268, y2: 420, class: 'trv-mreza' }, svg);
  const BX = 345, BY = 380, K2 = 380;
  const rb = robotBocno(svg, { ox: BX, oy: BY, k: K2 });
  T(svg, 280, 20, 'ravnina ruke (r, z) — vuci TCP', 'trv-ls');
  const troku = S('path', { class: 'trv-trokut' }, svg);
  const sakaV = S('line', { class: 'trv-crtica-t' }, svg);
  const metaB = S('circle', { r: 9, class: 'trv-meta' }, svg);
  const lukovi = [0, 1, 2].map(() => S('path', { class: 'trv-luk' }, svg));
  const lukT = [0, 1, 2].map(() => T(svg, 0, 0, '', 'trv-ls trv-t-pl'));
  const wT = T(svg, 0, 0, 'šaka', 'trv-ls');
  const fx = ui.formula('Inverzna kinematika (uživo)', 7);
  const o = ui.ocit([['q', 'J1 … J5'], ['p', 'Provjera P = J2 + J3 + J4'], ['g', 'Granice osi'], ['wh', 'Zapis točke (WH)']]);
  function rjesi() {
    const t = KIN.izTocke({ x: st.x, y: st.y, z: st.z, p: st.p, r: st.r });
    const res = KIN.ik(t, tlm(), st.q);
    let izbor = null;
    if (res.sva && res.sva.length) {
      const a = Math.atan2(t.y, t.x), zn = znakJ1();
      const isti = s => Math.abs(Math.atan2(Math.sin(zn * s.q[0] - a), Math.cos(zn * s.q[0] - a))) < 1e-6;
      izbor = res.sva.find(s => (st.iza ? !isti(s) : isti(s))) || null;
    }
    return { t, res, izbor };
  }
  function osvjezi() {
    const { t, res, izbor } = rjesi();
    const ok = izbor && izbor.uGranicama;
    if (ok) st.q = izbor.q.slice();
    ro.postavi(st.q); rb.postavi(st.q, tlm(), 0.5);
    // tlocrt: ravnina ruke i meta
    const j1 = Math.atan2(t.y, t.x), R0 = 0.66 * K1;
    const ugl = a => [-Math.sin(a), -Math.cos(a)];
    const [ux, uy] = ugl(j1);
    postavi(ravL, { x1: OX - ux * R0 * 0.35, y1: OY - uy * R0 * 0.35, x2: OX + ux * R0, y2: OY + uy * R0 });
    const mx = OX - t.y * K1, my = OY - t.x * K1;
    postavi(metaT, { cx: mx, cy: my });
    const cosP = Math.cos(st.p * RAD), psi = st.psi * RAD, [px, py] = ugl(psi);
    if (Math.abs(cosP) > 0.05) { psiS.set(mx, my, mx + px * 46 * Math.sign(cosP), my + py * 46 * Math.sign(cosP)); } else psiS.set(0, 0, 0, 0);
    // bočno: meta, trokut, kutovi
    const r = Math.hypot(t.x, t.y) * (st.iza ? -1 : 1), L45 = M.L4 + tlm();
    const rw = r - L45 * Math.cos(t.P), zw = t.z - L45 * Math.sin(t.P);
    const X = rr => BX + rr * K2, Y = zz => BY - zz * K2;
    postavi(metaB, { cx: X(r), cy: Y(t.z) });
    postavi(sakaV, { x1: X(rw), y1: Y(zw), x2: X(r), y2: Y(t.z) });
    postavi(wT, { x: X(rw) + 10, y: Y(zw) + 18 });
    if (ok) {
      const P = rb.tocke;
      troku.setAttribute('d', put([P[0], P[1], P[2]], true));
      const q = st.q;
      const lk = (i, c, a0, a1, txt) => { const rr = 34 + i * 4; lukovi[i].setAttribute('d', luk(c[0], c[1], rr, Math.min(a0, a1), Math.max(a0, a1))); const am = (a0 + a1) / 2; postavi(lukT[i], { x: c[0] + (rr + 14) * Math.cos(am), y: c[1] + (rr + 14) * Math.sin(am) + 5 }); tekst(lukT[i], txt); };
      lk(0, P[0], 0, -q[1], 'J2'); lk(1, P[1], -q[1], -(q[1] + q[2]), 'J3'); lk(2, P[2], -(q[1] + q[2]), -(q[1] + q[2] + q[3]), 'J4');
    } else { troku.setAttribute('d', ''); lukovi.forEach(l => l.setAttribute('d', '')); lukT.forEach(l => tekst(l, '')); }
    razred(metaT, 'trv-meta-opas', !ok); razred(metaB, 'trv-meta-opas', !ok);
    // formule
    const q = ok ? st.q : (izbor ? izbor.q : null), d = v => hr(v / RAD, 1) + '°', m = v => hr(v * 1000, 1);
    const c3 = (rw * rw + (zw - M.d1) ** 2 - M.L2 ** 2 - M.L3 ** 2) / (2 * M.L2 * M.L3);
    fx.set(0, `J1 = atan2(y, x) = atan2(${m(t.y)}, ${m(t.x)}) = ${d(j1)}${st.iza ? ' → J1 + 180° (iza osi)' : ''}`);
    fx.set(1, `r = √(x² + y²) = ${m(Math.abs(r))} mm`);
    fx.set(2, `šaka: r_w = r − (L4 + TL)·cos P = ${m(rw)} mm; z_w = z − (L4 + TL)·sin P = ${m(zw)} mm`);
    fx.set(3, `cos J3 = (r_w² + (z_w − d1)² − L2² − L3²) / (2·L2·L3) = ${hr(c3, 3)}${Math.abs(c3) > 1 ? ' → |cos| > 1: izvan dosega' : ''}`);
    fx.set(4, q ? `J3 = −acos(…) = ${d(q[2])};  J2 = atan2(z_w − d1, r_w) − atan2(L3·sin J3, L2 + L3·cos J3) = ${d(q[1])}` : 'J2, J3: nema rješenja');
    fx.set(5, q ? `J4 = P − J2 − J3 = ${hr(st.p, 1)}° − ${d(q[1])} − (${d(q[2])}) = ${d(q[3])}` : '');
    fx.set(6, q ? `J5 = R = ${d(q[4])}` : '');
    o.q(q ? kutovi(q) : '—');
    o.p(q ? `${d(q[1])} + ${d(q[2])} + ${d(q[3])} = ${d(q[1] + q[2] + q[3])}` : '—');
    const g = q ? KIN.uGranicama(q) : { ok: false, os: -1 };
    o.g(ok ? 'sve osi u granicama' : (res.razlog || (st.iza ? 'drugo rješenje ne postoji' : 'nedostižno')), ok ? 'ok' : 'opas');
    void g;
    o.wh(ok ? zapisWH(KIN.uTocku(st.q, tlm())) : '—');
    // smjer alata u tlocrtu
    const naRav = a => { const dd = Math.abs(((a - j1) / RAD % 180 + 540) % 180); return Math.min(dd, 180 - dd) < 0.6; };
    if (!ok) ui.stanje(`Točka nije dohvatljiva: ${res.razlog || 'nema rješenja u granicama'}. Na robotu bi naredba gibanja javila pogrešku II. vrste.`, 'opas');
    else if (Math.abs(cosP) > 0.05 && !naRav(psi)) ui.stanje(`Smjer alata ${hr(st.psi, 0)}° u tlocrtu ne leži u ravnini ruke (J1 = ${d(j1)}). S 5 osi os alata uvijek leži u okomitoj ravnini kroz os J1 — ovakav položaj alata je nedostižan. Pomakni TCP u ravninu tog smjera.`, 'upoz');
    else if (Math.abs(cosP) <= 0.05) ui.stanje('Alat gleda okomito (P = ±90°): smjer u tlocrtu nema značenja, a okret alata oko vlastite osi daje J5 (R). To je najčešći položaj za prihvat odozgo.', 'ok');
    else ui.stanje('Os alata leži u ravnini ruke — položaj je ostvariv.', 'ok');
  }
  // vučenje
  function vuci(el, fn) {
    let akt = false;
    ctx.on(el, 'pointerdown', e => { akt = true; try { el.setPointerCapture(e.pointerId); } catch (x) { /* ništa */ } fn(e); });
    ctx.on(el, 'pointermove', e => { if (akt) fn(e); });
    ctx.on(el, 'pointerup', () => { akt = false; }); ctx.on(el, 'pointercancel', () => { akt = false; });
  }
  vuci(svg, e => {
    const [sx, sy] = tockaSVG(svg, e);
    if (sx < 268) { st.x = Math.round((OY - sy) / K1 * 1000); st.y = Math.round((OX - sx) / K1 * 1000); }
    else {
      const j1 = Math.atan2(st.y, st.x), r = (sx - BX) / K2 * 1000 * (st.iza ? -1 : 1);
      st.x = Math.round(r * Math.cos(j1)); st.y = Math.round(r * Math.sin(j1)); st.z = Math.round((BY - sy) / K2 * 1000);
    }
    st.x = ogr(st.x, -650, 650); st.y = ogr(st.y, -650, 650); st.z = ogr(st.z, -100, 700);
    kl.x.postavi(st.x); kl.y.postavi(st.y); kl.z.postavi(st.z);
    osvjezi();
  });
  svg.style.touchAction = 'none';
  const kl = {};
  kl.x = ui.klizac('X (naprijed)', -650, 650, 1, st.x, v => hr(v, 0) + ' mm', v => { st.x = v; osvjezi(); });
  kl.y = ui.klizac('Y (lijevo)', -650, 650, 1, st.y, v => hr(v, 0) + ' mm', v => { st.y = v; osvjezi(); });
  kl.z = ui.klizac('Z (gore)', -100, 700, 1, st.z, v => hr(v, 0) + ' mm', v => { st.z = v; osvjezi(); });
  ui.klizac('P (nagib alata od vodoravne)', -180, 180, 1, st.p, v => hrp(v, 0) + '°', v => { st.p = v; osvjezi(); });
  ui.klizac('R (okret = J5)', -180, 180, 1, st.r, v => hrp(v, 0) + '°', v => { st.r = v; osvjezi(); });
  const kPsi = ui.klizac('Željeni smjer alata u tlocrtu', -180, 180, 1, Math.round(st.psi), v => hrp(v, 0) + '°', v => { st.psi = v; osvjezi(); });
  const r2 = ui.red();
  ui.gumb('Pomakni TCP u ravninu tog smjera', () => {
    const rr = Math.hypot(st.x, st.y); st.x = Math.round(rr * Math.cos(st.psi * RAD)); st.y = Math.round(rr * Math.sin(st.psi * RAD));
    kl.x.postavi(st.x); kl.y.postavi(st.y); osvjezi();
  }, { tanki: true, u: r2 });
  ui.gumb('ORG', () => { const t = KIN.uTocku(D.ORG, tlm()); Object.assign(st, { x: Math.round(t.x), y: Math.round(t.y), z: Math.round(t.z), p: Math.round(t.p), r: Math.round(t.r) }); for (const k of ['x', 'y', 'z']) kl[k].postavi(st[k]); osvjezi(); }, { tanki: true, u: r2 });
  ui.kvacica('Drugo rješenje: šaka iza osi J1 (J1 + 180°)', false, v => { st.iza = v; osvjezi(); });
  void kPsi;
  osvjezi();
};

/* =========================================================== 7. duljina alata TL i TCP */
TXT['alat-tl'] = {
  kratko: 'Što mijenja naredba TL: položaj TCP-a, očitanje WH i zglobove za istu spremljenu poziciju.',
  uvod: () => {
    const tl = NAR('TL'), a = tl ? tl.argumenti[0] : { min: 0, max: 300 };
    return [
      `Sve koordinate robota (WH, HE, PD, MO, MS …) odnose se na vrh alata — TCP. Njegov položaj zadaje naredba TL l: udaljenost l [mm] od prirubnice šake po osi alata. S motornom prihvatnicom zadano je ${TLmm()} mm; prirubnica je ${hr(D.MJERE.L4 * 1000, 0)} mm od osi nagiba J4. Simulator prima TL od ${a.min} do ${a.max} mm.`,
      'Pozicije se pamte kao X, Y, Z, P, R vrha alata. Ako se TL promijeni nakon učenja, ista pozicija znači drugi položaj prirubnice: robot će zglobove postaviti drugačije da TCP dođe u istu točku. Obrnuto, uz iste zglobove WH nakon promjene TL javlja drugu točku. Naredba MT a, d giba duž osi alata od pozicije a.'
    ];
  },
  kako: () => 'Mijenjaj TL klizačem. U načinu „isti zglobovi” ruka miruje, a TCP i očitanje WH se mijenjaju. U načinu „ista pozicija” TCP ostaje u spremljenoj točki, a ruka se pomiče. Klizač d pokazuje točku za MT 1, d (prilaz odozgo uz d < 0).',
  napomena: () => `Zadani TL je sukob izvora (${TLmm()} mm prema priručniku, 102 mm prema jednom radu). Spremljena pozicija 1 i raspon klizača d su primjer. Predznak d u MT (+ naprijed u smjeru alata) nije potvrđen u izvoru.`,
  naredbe: ['TL', 'WH', 'MT', 'HE']
};
GRAD['alat-tl'] = function (ui, ctx) {
  const tlArg = (NAR('TL') || { argumenti: [{ min: 0, max: 300 }] }).argumenti[0];
  const P1 = { x: 260, y: 0, z: 120, p: -90, r: 0 };                       // ILUSTR spremljena pozicija 1
  const T1 = KIN.izTocke(P1), tl0 = TLmm() / 1000;
  const q0 = KIN.ik(T1, tl0).q;
  const st = { tl: TLmm(), nac: 'zglobovi', d: -40, q: q0.slice(), cilj: q0.slice(), gr: '' };
  const svg = ui.svg(600, 390, 'Bočni pogled robota s kotom duljine alata TL od prirubnice do TCP-a i točkom za MT');
  const BX = 150, BY = 370, K = 560;
  const rb = robotBocno(svg, { ox: BX, oy: BY, k: K });
  const X = r => BX + r * K, Y = z => BY - z * K;
  const p1 = S('g', {}, svg); const [p1x, p1y] = [X(Math.hypot(T1.x, T1.y)), Y(T1.z)];
  S('path', { d: `M${f1(p1x - 9)},${f1(p1y)} L${f1(p1x + 9)},${f1(p1y)} M${f1(p1x)},${f1(p1y - 9)} L${f1(p1x)},${f1(p1y + 9)}`, class: 'trv-kriz' }, p1);
  T(p1, p1x + 12, p1y + 18, 'pozicija 1', 'trv-ls');
  const kota = S('line', { class: 'trv-kota' }, svg), kT = T(svg, 0, 0, '', 'trv-ls trv-t-pl');
  const kota4 = S('line', { class: 'trv-kota trv-kota-2' }, svg), k4T = T(svg, 0, 0, '', 'trv-ls');
  const mt = S('circle', { r: 6, class: 'trv-tocka-ms' }, svg), mtL = S('line', { class: 'trv-crtica-t' }, svg), mtT = T(svg, 0, 0, '', 'trv-ls');
  const o = ui.ocit([['tl', 'TL'], ['wh', 'WH (TCP)'], ['pr', 'Prirubnica (X, Y, Z)'], ['q', 'Zglobovi'], ['mt', 'Točka za MT 1, d']]);
  function osvjezi() {
    const tlm = st.tl / 1000;
    rb.postavi(st.q, tlm, 0.7);
    const P = rb.tocke, f = KIN.fk(st.q, tlm);
    const n = [Math.sin(f.P), Math.cos(f.P)];   // normala na zaslonu (lijevo od smjera alata)
    const off = 46;
    postavi(kota, { x1: P[3][0] + n[0] * off, y1: P[3][1] + n[1] * off, x2: P[4][0] + n[0] * off, y2: P[4][1] + n[1] * off });
    postavi(kT, { x: (P[3][0] + P[4][0]) / 2 + n[0] * (off + 8), y: (P[3][1] + P[4][1]) / 2 + n[1] * (off + 8) + 5 });
    kT.setAttribute('text-anchor', n[0] < 0 ? 'end' : 'start');
    tekst(kT, 'TL = ' + hr(st.tl, 0) + ' mm');
    postavi(kota4, { x1: P[2][0] - n[0] * 30, y1: P[2][1] - n[1] * 30, x2: P[3][0] - n[0] * 30, y2: P[3][1] - n[1] * 30 });
    postavi(k4T, { x: P[2][0] - n[0] * 38, y: (P[2][1] + P[3][1]) / 2 - n[1] * 38 + 5 });
    k4T.setAttribute('text-anchor', n[0] < 0 ? 'start' : 'end');
    tekst(k4T, 'L4 = ' + hr(D.MJERE.L4 * 1000, 0) + ' mm');
    // MT 1, d: od pozicije 1 duž osi alata
    const u = [Math.cos(T1.P), -Math.sin(T1.P)], r1 = Math.hypot(T1.x, T1.y);
    const mx = X(r1) + u[0] * st.d / 1000 * K, my = Y(T1.z) + u[1] * st.d / 1000 * K;
    postavi(mt, { cx: mx, cy: my }); postavi(mtL, { x1: X(r1), y1: Y(T1.z), x2: mx, y2: my }); postavi(mtT, { x: mx + 10, y: my - 6 });
    tekst(mtT, `MT 1, ${hr(st.d, 0)}`);
    const tW = KIN.uTocku(st.q, tlm);
    o.tl(hr(st.tl, 1) + ' mm' + (Math.abs(st.tl - TLmm()) < 0.05 ? ' (zadano)' : ''));
    o.wh(zapisWH(tW));
    o.pr(f.prirubnica.map(v => hr(v * 1000, 1)).join(', ') + ' mm');
    o.q(kutovi(st.q));
    o.mt(`X ${hr(P1.x + st.d * Math.cos(T1.P), 1)}, Z ${hr(P1.z + st.d * Math.sin(T1.P), 1)} mm`);
    if (st.gr) ui.stanje(st.gr, 'opas');
    else if (st.nac === 'zglobovi') ui.stanje(`Isti zglobovi, TL = ${hr(st.tl, 0)} mm: ruka miruje; ${Math.abs(st.tl - TLmm()) < 0.5 ? 'TL je zadani — promijeni ga klizačem.' : `TCP je ${hr(Math.abs(st.tl - TLmm()), 0)} mm ${st.tl > TLmm() ? 'dalje od prirubnice' : 'bliže prirubnici'} — WH javlja drugu točku.`}`, 'plavo');
    else ui.stanje(`Ista pozicija 1: robot postavlja zglobove tako da TCP s TL = ${hr(st.tl, 0)} mm bude u spremljenoj točki; prirubnica se pomiče za razliku duljine alata.`, 'ok');
  }
  function cilj() {
    st.gr = '';
    if (st.nac === 'zglobovi') st.cilj = q0.slice();
    else {
      const r = KIN.ik(T1, st.tl / 1000, st.q);
      if (r.uspjeh) st.cilj = r.q.slice(); else st.gr = `TL = ${hr(st.tl, 0)} mm: pozicija 1 nije dohvatljiva (${r.razlog}) — pogreška II pri MO 1.`;
    }
    ctx.budi();
  }
  ctx.petlja(dt => {
    let jos = false;
    st.q = st.q.map((v, i) => { const d = st.cilj[i] - v, m = 60 * RAD * dt; if (Math.abs(d) > 1e-5) jos = true; return Math.abs(d) <= m ? st.cilj[i] : v + Math.sign(d) * m; });
    osvjezi();
    return jos;
  });
  const kTL = ui.klizac('Duljina alata TL', tlArg.min, tlArg.max, 1, st.tl, v => hr(v, 0) + ' mm', v => { st.tl = v; cilj(); osvjezi(); });
  ui.seg('Nakon promjene TL', [['zglobovi', 'isti zglobovi'], ['pozicija', 'ista pozicija (MO 1)']], st.nac, v => { st.nac = v; cilj(); osvjezi(); });
  ui.klizac('Pomak d za MT 1, d', -80, 40, 5, st.d, v => hrp(v, 0) + ' mm', v => { st.d = v; osvjezi(); });
  const r = ui.red();
  ui.gumb('Zadani TL', () => { st.tl = TLmm(); kTL.postavi(st.tl); cilj(); osvjezi(); }, { tanki: true, u: r });
  osvjezi();
};

/* =========================================================== 8. paleta: točke rešetke (PA, PT) */
TXT['paleta'] = {
  kratko: 'Kako PA i PT iz četiri naučena kuta računaju bilo koju točku rešetke palete.',
  uvod: () => {
    const P = D.PALETA, b = P.baza;
    return [
      'Za slaganje predmeta u rešetku nije potrebno učiti svaku točku. Nauče se samo četiri kuta palete, a naredba PA i, j, k zadaje da paleta i ima j točaka u smjeru stupca i k točaka u smjeru reda. Naredba PT i iz rednih brojeva u brojilima izračuna koordinate točke i spremi ih kao poziciju i, na koju se robot zatim giba s MO.',
      `U simulatoru su kutovi palete i pozicije ${b}·i (ishodište), ${b}·i+1 (kraj stupca), ${b}·i+2 (kraj reda) i ${b}·i+3 (dijagonalni kut); redni broj u stupcu je u brojilu ${b}·i+${P.brojilaStupac}, a u redu u brojilu ${b}·i+${P.brojilaRed}. Točka se računa bilinearno između četiriju kutova, pa paleta smije biti zakrenuta i blago iskrivljena.`
    ];
  },
  kako: () => 'Zadaj broj točaka j i k, zakret i iskrivljenje palete, pa pokreni program. Program se izvodi redak po redak: PT računa točku, MO giba robot, IC/CP/SM vode petlje po stupcu i redu. „Korak” izvodi jedan redak.',
  napomena: () => 'Sintaksa PA/PT i raspored kutnih pozicija i brojila nisu nađeni u dostupnim izvorima (poglavlje s opisom naredbi nedostaje) — preuzeti su iz srodnih Movemaster upravljača i iz rasporeda simulatora (PALETA). Mjere palete u tlocrtu su ilustrativne.',
  naredbe: ['PA', 'PT', 'SC', 'IC', 'CP', 'SM', 'MO']
};
GRAD['paleta'] = function (ui, ctx) {
  const P = D.PALETA, I = 1, b = P.baza, BS = b * I + P.brojilaStupac, BR = b * I + P.brojilaRed;
  const st = { j: 4, k: 3, alfa: 10, isk: 0, radi: true, pc: 0, t: 0, br: {}, reg: 0, poz: null, gotove: [], q: D.ORG.slice(), q0: D.ORG.slice(), q1: D.ORG.slice(), tg: 0 };
  const svg = ui.svg(600, 420, 'Tlocrt palete s četiri kutne pozicije, točkama rešetke i rukom robota');
  const OX = 300, OY = 445, K = 1050;
  const ro = robotOdozgo(svg, { ox: OX, oy: OY, k: K, granice: false });
  const tl = (x, y) => [OX - y * K, OY - x * K];
  const gP = S('g', {}, svg), gT = S('g', {}, svg);
  const kurT = S('circle', { r: 11, class: 'trv-isticanje' }, svg);
  const kutovi4 = () => {                                  // kutovi palete (m) — ILUSTR mjere 150 × 100 mm
    const O = [0.265, 0.080], a = st.alfa * RAD;
    const smS = [Math.sin(a), -Math.cos(a)], smR = [Math.cos(a), Math.sin(a)];   // stupac ≈ −Y, red ≈ +X
    const P0 = O, P1 = [O[0] + smS[0] * 0.150, O[1] + smS[1] * 0.150], P2 = [O[0] + smR[0] * 0.100, O[1] + smR[1] * 0.100];
    const d = st.isk / 1000;
    const P3 = [P1[0] + P2[0] - O[0] + d, P1[1] + P2[1] - O[1] - d];
    return [P0, P1, P2, P3];
  };
  const tocka = (c, r) => {
    const [P0, P1, P2, P3] = kutovi4(), u = st.j > 1 ? (c - 1) / (st.j - 1) : 0, v = st.k > 1 ? (r - 1) / (st.k - 1) : 0;
    return [0, 1].map(i => (1 - u) * (1 - v) * P0[i] + u * (1 - v) * P1[i] + (1 - u) * v * P2[i] + u * v * P3[i]);
  };
  const program = () => [
    `PA ${I}, ${st.j}, ${st.k}`, `SC ${BR}, 1`, `SC ${BS}, 1`, `PT ${I}`, `MO ${I}`, `IC ${BS}`, `CP ${BS}`, `SM ${st.j + 1}, 40`, `IC ${BR}`, `CP ${BR}`, `SM ${st.k + 1}, 30`, 'ED'
  ];
  const ol = H('ol', { class: 'trv-prog', 'aria-label': 'Program palete' });
  ui.ocitP.append(H('div', { class: 'trv-okviric' }, H('h4', { tekst: 'Program' }), ol));
  const o = ui.ocit([['br', `Brojila ${BS} (stupac) i ${BR} (red)`], ['reg', 'Registar usporedbe (CP)'], ['poz', `Pozicija ${I} (iz PT)`], ['n', 'Točaka u rešetki']]);
  function crtajPaletu() {
    gP.replaceChildren(); gT.replaceChildren();
    const K4 = kutovi4();
    S('path', { d: put([K4[0], K4[1], K4[3], K4[2]].map(p => tl(p[0], p[1])), true), class: 'trv-paleta' }, gP);
    K4.forEach((p, i) => { const [x, y] = tl(p[0], p[1]); S('rect', { x: f1(x - 6), y: f1(y - 6), width: 12, height: 12, class: 'trv-kut-p' }, gP); T(gP, x + (i === 1 || i === 3 ? 10 : -10), y + (i >= 2 ? -10 : 22), String(b * I + P.kutovi[i].pomak), 'trv-lb', i === 1 || i === 3 ? 'start' : 'end'); });
    for (let r = 1; r <= st.k; r++) for (let c = 1; c <= st.j; c++) {
      const [x, y] = tl(...tocka(c, r));
      const e = S('circle', { cx: f1(x), cy: f1(y), r: 6, class: 'trv-tocka-p' + (st.gotove.some(g => g[0] === c && g[1] === r) ? ' trv-tocka-p-on' : '') }, gT);
      e.dataset.c = c; e.dataset.r = r;
    }
    ol.replaceChildren(...program().map((t, i) => H('li', { class: i === st.pc ? 'trv-akt' : null }, H('span', { class: 'trv-br', tekst: String((i + 1) * 10) }), H('code', { tekst: t }))));
  }
  function iznova() { st.gr = ''; st.pc = 0; st.br = {}; st.reg = 0; st.poz = null; st.gotove = []; st.t = 0; crtajPaletu(); osvjezi(); }
  function izvedi() {   // jedan redak programa; vraća trajanje retka (s, ILUSTR)
    const L = program(), red = L[st.pc]; if (!red) return 0;
    const [kod, ...ar] = red.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
    const a = ar.map(Number);
    let sljedeci = st.pc + 1, T0 = 0.3;
    switch (kod) {
      case 'SC': st.br[a[0]] = a[1]; break;
      case 'IC': st.br[a[0]] = (st.br[a[0]] || 0) + 1; break;
      case 'CP': st.reg = st.br[a[0]] || 0; break;
      case 'SM': if (st.reg < a[0]) sljedeci = a[1] / 10 - 1; break;
      case 'PT': { const c = st.br[BS], r = st.br[BR]; st.poz = { c, r, p: tocka(c, r) }; break; }
      case 'MO': {
        const tq = KIN.ik({ x: st.poz.p[0], y: st.poz.p[1], z: 0.06, P: -Math.PI / 2, R: 0 }, TLmm() / 1000, st.q);
        if (tq.uspjeh) { st.q0 = st.q.slice(); st.q1 = tq.q; st.tg = 0; T0 = Math.max(0.5, KIN.trajanje(st.q0, st.q1, D.BRZINE.zadano)); st.gr = ''; }
        else st.gr = `MO ${I}: točka nije dohvatljiva (${tq.razlog}) — pogreška II.`;
        st.gotove.push([st.poz.c, st.poz.r]); break;
      }
      case 'ED': sljedeci = -1; break;
      default: break;
    }
    st.pc = sljedeci;
    crtajPaletu();
    return T0;
  }
  function osvjezi() {
    ro.postavi(st.q);
    if (st.poz) { const [x, y] = tl(...st.poz.p); postavi(kurT, { cx: x, cy: y }); kurT.style.display = ''; } else kurT.style.display = 'none';
    o.br(`${st.br[BS] ?? '—'} · ${st.br[BR] ?? '—'}`);
    o.reg(String(st.reg));
    o.poz(st.poz ? `stupac ${st.poz.c}, red ${st.poz.r}: X ${hr(st.poz.p[0] * 1000, 1)}, Y ${hr(st.poz.p[1] * 1000, 1)} mm` : '—');
    o.n(`${st.j} × ${st.k} = ${st.j * st.k}`);
    if (st.gr) ui.stanje(st.gr, 'opas');
    else if (st.pc < 0) ui.stanje(`Program je gotov: robot je obišao svih ${st.j * st.k} točaka palete iz samo četiri naučene pozicije.`, 'ok');
    else ui.stanje(`Redak ${(st.pc + 1) * 10}: ${program()[st.pc]}`, 'plavo');
  }
  ctx.petlja(dt => {
    if (st.tg < 1) { st.tg = Math.min(1, st.tg + dt / 0.5); st.q = KIN.interpolirajZglobno(st.q0, st.q1, st.tg); }
    if (st.radi) {
      st.t -= dt;
      if (st.t <= 0) { if (st.pc < 0) { st.t = 1.5; iznova(); } else st.t = izvedi(); }
    }
    osvjezi();
    return st.radi || st.tg < 1;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r);
  ui.gumb('Korak (1 redak)', () => { st.radi = false; r.querySelector('.trv-igraj').osvjezi(); if (st.pc < 0) iznova(); else izvedi(); osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  ui.gumb('Iznova', () => { iznova(); ctx.budi(); }, { tanki: true, u: r });
  ui.klizac('j — točaka u smjeru stupca', 1, 8, 1, st.j, v => String(v), v => { st.j = v; iznova(); ctx.budi(); });
  ui.klizac('k — točaka u smjeru reda', 1, 8, 1, st.k, v => String(v), v => { st.k = v; iznova(); ctx.budi(); });
  ui.klizac('Zakret palete', -30, 30, 1, st.alfa, v => hrp(v, 0) + '°', v => { st.alfa = v; crtajPaletu(); osvjezi(); });
  ui.klizac('Iskrivljenje dijagonalnog kuta', 0, 40, 1, st.isk, v => hr(v, 0) + ' mm', v => { st.isk = v; crtajPaletu(); osvjezi(); });
  const fx = ui.formula('Bilinearna interpolacija', 2);
  fx.set(0, `u = (stupac − 1)/(j − 1), v = (red − 1)/(k − 1)`);
  fx.set(1, `P = (1−u)(1−v)·P${b * I} + u(1−v)·P${b * I + 1} + (1−u)v·P${b * I + 2} + uv·P${b * I + 3}`);
  ui.sitno(`Simulator prima do ${P.brojPaleta} paleta i do ${P.maxTocaka} točaka po smjeru; klizači idu do 8 radi preglednosti.`);
  iznova(); ctx.budi();
};


/* =========================================================== 9. ulazi, izlazi i rukovanje STB/BUSY, RDY/ACK */
TXT['io-rukovanje'] = {
  kratko: 'Vremenski dijagram naredbi IN i OT: 8 podatkovnih bitova i signali STB, BUSY, RDY, ACK na SIM RV.',
  uvod: () => {
    const n = D.KONFIG.ioKartica === 'A16B16' ? 16 : 8;
    return [
      `Kartica ${D.KONFIG.ioKartica === 'A16B16' ? 'A16/B16' : 'A8/B8'} ima ${n} ulaza i ${n} izlaza. Naredbe ID i OD čitaju i pišu port odmah, bez potvrde. Naredbe IN i OT prenose cijeli bajt uz rukovanje: druga strana (PLC, računalo ili ručni simulator SIM RV) i robot signalima potvrđuju da je podatak spreman i preuzet, pa se ništa ne izgubi ni ne pročita napola.`,
      'IN: vanjski uređaj postavi podatak i javi STB; robot pročita port u registar i javi BUSY; uređaj spusti STB; robot spusti BUSY. OT: robot postavi podatak na izlaz i javi RDY; uređaj preuzme podatak i javi ACK; robot spusti RDY; uređaj spusti ACK. Dok čeka, robot stoji na toj naredbi (svijetli EXECUTE).'
    ];
  },
  kako: () => 'Prekidačima na SIM RV postavi ulazni bajt i pošalji IN, ili klizačem zadaj vrijednost i pošalji OT. Uz „vanjski uređaj automatski” STB i ACK prebacuje simulirani uređaj; bez toga klikni STB i ACK na SIM RV sam i prati korake. Dijagram crta stanje svih signala onako kako ih vodi interpreter DUM1.',
  napomena: () => 'PRETPOSTAVKA: vremenski dijagram STB/ACK/RDY/BUSY i raspored pinova nisu u dostupnoj dokumentaciji (dodatak priručnika nedostaje). Uloga signala i slijed izvedeni su iz rasporeda na SIM RV (STB i ACK su preklopnici prema robotu, RDY i BUSY LED-ice od robota) i iz naziva signala. Kašnjenja simuliranog vanjskog uređaja su ilustrativna.',
  naredbe: ['IN', 'OT', 'ID', 'OD', 'OB', 'TB', 'DR']
};
GRAD['io-rukovanje'] = function (ui, ctx) {
  const dum = novaJedinica(); dum.ukljuci();
  const S0 = dum.stanje, SIG = D.SIMRV_SIGNALI;
  const st = { v: 0xA5, auto: true, t: 0, zadnja: null, cekaj: 0, hist: [], tisina: 0 };
  [1, 0, 1, 1, 0, 1, 0, 0].forEach((b, i) => dum.postaviUlaz(i, b));   // početni ulazni bajt (primjer)
  // ---- SIM RV
  const sv = ui.svg(600, 210, 'Ručni simulator SIM RV: 8 prekidača ulaza, 8 LED-ica izlaza, prekidači STB i ACK, LED-ice RDY i BUSY');
  S('rect', { x: 6, y: 6, width: 588, height: 198, rx: 12, class: 'trv-kutija-sim' }, sv);
  T(sv, 20, 30, 'SIM RV', 'trv-lb'); T(sv, 110, 30, 'INPUT (prema DUM1)', 'trv-ls'); T(sv, 400, 30, 'OUTPUT (iz DUM1)', 'trv-ls');
  const ulazi = [], izlazi = [];
  for (let k = 0; k < 8; k++) {
    const bit = 7 - k, x = 30 + k * 32;
    const g = S('g', { transform: `translate(${x} 48)` }, sv);
    S('rect', { x: 0, y: 0, width: 22, height: 50, rx: 4, class: 'trv-prekidac' }, g);
    const ruc = S('rect', { x: 3, y: 4, width: 16, height: 20, rx: 3, class: 'trv-rucica' }, g);
    T(g, 11, 68, String(bit), 'trv-ls', 'middle');
    klikabilno(ctx, g, 'Ulazni bit ' + bit, () => { dum.postaviUlaz(bit, dum.ulaz(bit) ? 0 : 1); zabiljezi(); osvjezi(); ctx.budi(); });
    ulazi.push({ bit, ruc });
  }
  T(sv, 30, 134, 'H gore = 1', 'trv-ls');
  for (let k = 0; k < 8; k++) { const bit = 7 - k, x = 330 + k * 32; izlazi.push({ bit, led: S('circle', { cx: x + 11, cy: 66, r: 10, class: 'trv-led trv-led-crv' }, sv) }); T(sv, x + 11, 100, String(bit), 'trv-ls', 'middle'); }
  const sigEl = {};
  [['STB', 330, 'prekidač'], ['ACK', 400, 'prekidač'], ['RDY', 470, 'LED'], ['BUSY', 540, 'LED']].forEach(([id, x, vr]) => {
    const g = S('g', { transform: `translate(${x} 128)` }, sv);
    if (vr === 'prekidač') {
      S('rect', { x: 0, y: 0, width: 44, height: 30, rx: 5, class: 'trv-prekidac' }, g);
      sigEl[id] = S('rect', { x: 3, y: 3, width: 18, height: 24, rx: 3, class: 'trv-rucica' }, g);
      klikabilno(ctx, g, 'Signal ' + id, () => { dum.postaviUlaz(id, dum.ulaz(id) ? 0 : 1); zabiljezi(); osvjezi(); ctx.budi(); });
    } else sigEl[id] = S('circle', { cx: 22, cy: 15, r: 11, class: 'trv-led trv-led-zel' }, g);
    T(g, 22, 52, id, 'trv-lb', 'middle');
  });
  const ledEx = S('circle', { cx: 190, cy: 156, r: 9, class: 'trv-led trv-led-zel' }, sv); T(sv, 204, 162, 'EXECUTE', 'trv-ls');
  const regT = T(sv, 30, 190, '', 'trv-kod');
  // ---- vremenski dijagram
  const vd = ui.svg(600, 300, 'Vremenski dijagram: ulazni bajt, STB, BUSY, izlazni bajt, RDY, ACK');
  const GX = 90, GW = 495, PROZ = 6, redovi = [['ul', 'ulazi D0–D7', 'bus'], ['STB', 'STB →', 's'], ['BUSY', '← BUSY', 's'], ['iz', 'izlazi D0–D7', 'bus'], ['RDY', '← RDY', 's'], ['ACK', 'ACK →', 's']];
  const lin = {};
  redovi.forEach(([k, naz], i) => {
    const y = 18 + i * 44;
    T(vd, GX - 8, y + 24, naz, 'trv-ls', 'end');
    S('line', { x1: GX, y1: y + 30, x2: GX + GW, y2: y + 30, class: 'trv-mreza' }, vd);
    lin[k] = { y, p: S('path', { class: 'trv-signal' }, vd), g: S('g', {}, vd) };
  });
  T(vd, GX + GW, 296, '← zadnjih 6 s (vrijeme teče samo dok traje rukovanje)', 'trv-ls', 'end');
  const korNas = ui.sitno('');
  const kor = ui.koraci(SIG.slijed.IN);
  const o = ui.ocit([['reg', 'Registar (DR)'], ['iz', 'Izlazni port'], ['ex', 'DUM1'], ['odg', 'Zadnji odgovor']]);
  function zabiljezi() {
    const s = S0.signali;
    st.hist.push({ t: st.t, ul: S0.ulazi & 255, iz: S0.izlazi & 255, STB: s.STB, BUSY: s.BUSY, RDY: s.RDY, ACK: s.ACK });
    while (st.hist.length > 2 && st.hist[1].t < st.t - PROZ - 1) st.hist.shift();
  }
  function crtajDijagram() {
    const t0 = st.t - PROZ, X = t => GX + GW * ogr((t - t0) / PROZ, 0, 1);
    for (const [k, , vr] of redovi) {
      const L = lin[k], y1 = L.y + 30, y0 = L.y + 8;
      let d = '', prev = null;
      L.g.replaceChildren();
      const seg = [];
      st.hist.forEach((h, j) => {
        const x = X(h.t), v = h[k];
        if (vr === 's') { const y = v ? y0 : y1; if (prev == null) d = `M${f1(x)},${f1(y)}`; else if (prev !== v) d += `L${f1(x)},${f1(prev ? y0 : y1)}L${f1(x)},${f1(y)}`; }
        else if (prev == null || prev !== v) {
          if (prev != null && x > GX + 4) d += `M${f1(x - 4)},${f1(y0)}L${f1(x + 4)},${f1(y1)}M${f1(x - 4)},${f1(y1)}L${f1(x + 4)},${f1(y0)}`;
          seg.push([x, v]);
        }
        prev = v;
        if (j === st.hist.length - 1) { if (vr === 's') d += `L${f1(GX + GW)},${f1(v ? y0 : y1)}`; }
      });
      if (vr === 'bus') {
        d = `M${GX},${y0}L${GX + GW},${y0}M${GX},${y1}L${GX + GW},${y1}` + d;
        seg.forEach(([x, v], j) => { const x2 = j + 1 < seg.length ? seg[j + 1][0] : GX + GW; if (x2 - x > 44 || j === seg.length - 1) T(L.g, Math.min(x, GX + GW - 44) + 6, y0 + 16, '&' + hex(v), 'trv-kod'); });
      }
      L.p.setAttribute('d', d);
    }
  }
  function korak() {
    const akt = dum.aktivnost(), s = S0.signali;
    if (akt === 'in') return s.BUSY ? 3 : 0;
    if (akt === 'ot') return s.RDY ? 2 : 4;
    return st.zadnja ? 5 : -1;
  }
  function osvjezi() {
    ulazi.forEach(u => { const v = dum.ulaz(u.bit); postavi(u.ruc, { y: v ? 4 : 26 }); razred(u.ruc, 'trv-rucica-on', v); });
    izlazi.forEach(z => razred(z.led, 'trv-on', dum.izlaz(z.bit)));
    for (const id of ['STB', 'ACK']) { const v = S0.signali[id]; postavi(sigEl[id], { x: v ? 23 : 3 }); razred(sigEl[id], 'trv-rucica-on', v); }
    for (const id of ['RDY', 'BUSY']) razred(sigEl[id], 'trv-on', S0.signali[id]);
    razred(ledEx, 'trv-on', S0.led.execute);
    tekst(regT, `registar = ${S0.registar} = &${hex(S0.registar & 255)} = ${bin(S0.registar & 255, 8)}b`);
    crtajDijagram();
    const k = korak();
    if (st.zadnja) { const sl = SIG.slijed[st.zadnja]; if (kor.stavke.length !== sl.length || kor.stavke[0].textContent !== sl[0]) { kor.stavke.forEach((li, i) => (li.textContent = sl[i])); } }
    kor.postavi(k);
    tekst(korNas, st.zadnja ? `Koraci naredbe ${st.zadnja} (pretpostavka):` : 'Koraci rukovanja (pretpostavka):');
    o.reg(`${S0.registar} (&${hex(S0.registar & 255)})`); o.iz(`${S0.izlazi & 255} (&${hex(S0.izlazi & 255)}, ${bin(S0.izlazi & 255, 8)}b)`);
    o.ex(dum.zauzet() ? 'čeka na rukovanje (EXECUTE)' : 'spreman', dum.zauzet() ? 'upoz' : 'ok');
    const akt = dum.aktivnost();
    if (akt === 'in') ui.stanje(S0.signali.BUSY ? 'Robot je pročitao port u registar i javio BUSY. Čeka da vanjski uređaj spusti STB.' : 'IN: robot čeka STB — vanjski uređaj javlja da je podatak na ulazima spreman.', 'upoz');
    else if (akt === 'ot') ui.stanje(S0.signali.RDY ? 'OT: podatak je na izlazima, RDY = 1. Robot čeka ACK.' : 'Uređaj je potvrdio s ACK, robot je spustio RDY. Čeka da uređaj spusti ACK.', 'upoz');
    else if (st.zadnja) ui.stanje(`${st.zadnja} je gotov — rukovanje je završeno, program može nastaviti sa sljedećim retkom.`, 'ok');
    else ui.stanje('Postavi ulazni bajt i pošalji IN, ili zadaj vrijednost i pošalji OT.');
  }
  function auto(dt) {
    if (!st.auto) return;
    const akt = dum.aktivnost(), s = S0.signali;
    st.cekaj += dt;
    const D1 = 0.7, D2 = 0.5;                                // ILUSTR kašnjenja vanjskog uređaja
    if (akt === 'in' && !s.STB && !s.BUSY && st.cekaj > D1) { dum.postaviUlaz('STB', 1); st.cekaj = 0; }
    else if (akt === 'in' && s.STB && s.BUSY && st.cekaj > D2) { dum.postaviUlaz('STB', 0); st.cekaj = 0; }
    else if (akt === 'ot' && s.RDY && !s.ACK && st.cekaj > D1) { dum.postaviUlaz('ACK', 1); st.cekaj = 0; }
    else if (!akt && s.ACK && st.cekaj > D2) { dum.postaviUlaz('ACK', 0); st.cekaj = 0; }
    else if (akt === 'ot' && !s.RDY && s.ACK && st.cekaj > D2) { dum.postaviUlaz('ACK', 0); st.cekaj = 0; }
  }
  ctx.petlja(dt => {
    const aktivno = dum.zauzet() || S0.signali.ACK || S0.signali.STB;
    if (aktivno) st.tisina = 0; else st.tisina += dt;
    if (aktivno || st.tisina < 1) { st.t += dt; auto(dt); dum.azuriraj(dt); zabiljezi(); }
    osvjezi();
    return aktivno || st.tisina < 1;
  });
  const posalji = (txt, nac) => {
    if (dum.zauzet()) { o.odg('pričekaj kraj rukovanja', 'upoz'); return; }
    const r = dum.posalji(txt); st.zadnja = nac || null; st.cekaj = 0; st.tisina = 0;
    o.odg(r.odgovor != null ? `${txt} → ${r.odgovor}` : r.greska ? `${txt} → pogreška II (${r.greska.kod})` : `${txt} → izvodi se`, r.greska ? 'opas' : '');
    zabiljezi(); osvjezi(); ctx.budi();
  };
  const r = ui.red();
  ui.gumb('Pošalji IN', () => posalji('IN', 'IN'), { u: r });
  const bOT = ui.gumb('Pošalji OT', () => posalji('OT ' + st.v, 'OT'), { u: r });
  ui.klizac('Vrijednost za OT / OD', 0, 255, 1, st.v, v => `${v} = &${hex(v)} = ${bin(v, 8)}b`, v => { st.v = v; bOT.textContent = 'Pošalji OT ' + v; });
  bOT.textContent = 'Pošalji OT ' + st.v;
  const r2 = ui.red();
  ui.gumb('ID (bez rukovanja)', () => posalji('ID', null), { tanki: true, u: r2 });
  ui.gumb('OD (bez rukovanja)', () => posalji('OD ' + st.v, null), { tanki: true, u: r2 });
  ui.gumb('DR', () => posalji('DR', null), { tanki: true, u: r2 });
  ui.kvacica('Vanjski uređaj automatski (STB i ACK)', true, v => { st.auto = v; st.cekaj = 0; ctx.budi(); });
  zabiljezi(); osvjezi();
};

/* =========================================================== 10. RS-232C: okvir znaka i naredbe čitanja */
TXT['rs232'] = {
  kratko: 'Okvir znaka na RS-232C (start, 7 bitova, parni paritet, 2 stop-bita) i vrijeme slanja naredbe.',
  uvod: () => {
    const R = D.RS232;
    return [
      `Računalo i DUM1 razgovaraju preko RS-232C (konektor ${R.konektor.split(' ')[0]}) u formatu ${R.zapis.replace('COM1: ', '')}: ${R.baud} Bd, ${R.bitovi} podatkovnih bitova, ${R.paritet === 'E' ? 'parni' : R.paritet === 'O' ? 'neparni' : 'bez'} paritet, ${R.stop} stop-bita. Naredba se šalje kao tekst velikim slovima i završava znakom CR (ili CR+LF, ovisno o preklopniku SW1 bit 1).`,
      'Svaki znak putuje kao zaseban okvir: linija u mirovanju je na logičkoj 1, start-bit (0) najavljuje znak, zatim idu podatkovni bitovi od najnižeg (D0), paritetni bit koji dopunjuje broj jedinica do parnog i stop-bitovi (1). Naredbe čitanja (WH, PR, CR, DR, ER, LR) vraćaju odgovor istim formatom; ostale naredbe ne šalju ništa natrag.'
    ];
  },
  kako: () => 'Upiši naredbu (npr. NT) ili odaberi primjer. Gore su znakovi poruke, u sredini okvir odabranog znaka bit po bit s logičkom razinom i naponom linije, dolje cijela poruka na vremenskoj osi. Pokreni prijenos (usporeno) ili idi bit po bit. Za naredbe čitanja prebaci smjer na odgovor robota.',
  napomena: () => `Napon linije (logička 1 = negativan napon, 0 = pozitivan) je prema normi RS-232; iznos ±12 V je ilustrativan. Format odgovora na naredbe čitanja je pretpostavka (${D.FORMAT_ODGOVORA.pozicija.primjer} za WH). Prikaz je usporen; stvarno trajanje je ispisano. Kontrola toka: ${D.RS232.kontrolaToka === 'none' ? 'bez sklopovske kontrole toka (pretpostavka)' : D.RS232.kontrolaToka}.`,
  naredbe: ['WH', 'PR', 'ER', 'CR', 'DR', 'LR', 'NT']
};
GRAD['rs232'] = function (ui, ctx) {
  const R = D.RS232, FO = D.FORMAT_ODGOVORA;
  const nB = R.bitovi, nS = R.stop, par = R.paritet, BIT = 1 / R.baud, NB = 1 + nB + (par === 'N' ? 0 : 1) + nS;
  const st = { tekst: 'NT', smjer: 'pc', crlf: false, radi: false, poz: 0, akum: 0, brz: 0.12, odabran: 0 };
  const ODG = { WH: FO.pozicija.primjer, PR: FO.pozicija.primjer, CR: FO.brojilo.primjer, DR: FO.registar.primjer, ER: FO.greska.primjer, LR: FO.redak.primjer };
  const okvir = kod => {
    const d = []; for (let i = 0; i < nB; i++) d.push((kod >> i) & 1);
    const jed = d.reduce((a, b) => a + b, 0);
    const p = par === 'E' ? jed % 2 : par === 'O' ? 1 - jed % 2 : null;
    const bitovi = [{ n: 'S', v: 0 }, ...d.map((v, i) => ({ n: 'D' + i, v }))];
    if (p != null) bitovi.push({ n: 'P', v: p });
    for (let i = 0; i < nS; i++) bitovi.push({ n: 'T' + (i + 1), v: 1 });
    return { bitovi, jed, p };
  };
  let poruka = [];
  const kraj = () => (st.crlf ? R.krajPremaSW1.gore : R.krajPremaSW1.dolje).split('+').map(x => x === 'CR' ? 13 : 10);
  function gradi() {
    let txt = st.tekst;
    if (st.smjer === 'dum') { const kod = st.tekst.trim().toUpperCase().split(/\s+/)[0]; txt = ODG[kod] != null ? ODG[kod] : null; }
    poruka = [];
    if (txt != null) for (const ch of txt) poruka.push({ z: ch, kod: ch.charCodeAt(0) });
    for (const c of (txt != null ? kraj() : [])) poruka.push({ z: c === 13 ? 'CR' : 'LF', kod: c });
    poruka.forEach(p => { p.ok = p.kod < (1 << nB); p.f = okvir(p.kod & ((1 << nB) - 1)); });
    st.poz = 0; st.odabran = 0;
    crtajZnakove(); osvjezi();
  }
  // SVG 1: znakovi
  const s1 = ui.svg(600, 92, 'Znakovi poruke s heksadekadskim kodom');
  const gZ = S('g', {}, s1);
  // SVG 2: okvir znaka
  const s2 = ui.svg(600, 230, 'Okvir odabranog znaka: start-bit, podatkovni bitovi od D0, paritetni bit, stop-bitovi; logička razina i napon linije');
  const OX = 70, BW = 38, Y1 = 70, Y0 = 150;
  T(s2, OX - 10, Y1 + 5, '1', 'trv-lb', 'end'); T(s2, OX - 10, Y0 + 5, '0', 'trv-lb', 'end');
  T(s2, 590, Y1 + 5, '−12 V', 'trv-ls', 'end'); T(s2, 590, Y0 + 5, '+12 V', 'trv-ls', 'end');
  const bitBox = [], bitLab = [], bitVal = [];
  for (let i = 0; i < NB + 1; i++) {
    bitBox.push(S('rect', { x: OX + (i + 0.5) * BW, y: 40, width: BW, height: 130, class: 'trv-bit' }, s2));
    bitLab.push(T(s2, OX + (i + 1) * BW, 196, '', 'trv-ls', 'middle'));
    bitVal.push(T(s2, OX + (i + 1) * BW, 218, '', 'trv-lb', 'middle'));
  }
  const val = S('path', { class: 'trv-signal trv-signal-deb' }, s2);
  const nasZ = T(s2, OX, 22, '', 'trv-lb');
  ui.sitno('Okvir: mir. = mirovanje (1) · S = start-bit (0) · D0…D' + (nB - 1) + ' podaci, najniži prvi · P = paritetni bit · T = stop-bit (1).', ui.scena);
  // SVG 3: cijela poruka
  const s3 = ui.svg(600, 110, 'Cijela poruka na vremenskoj osi, okvir po okvir');
  const MX = 30, MW = 550;
  const msgP = S('path', { class: 'trv-signal' }, s3), msgG = S('g', {}, s3), msgK = S('line', { y1: 18, y2: 78, class: 'trv-kursor' }, s3);
  const msgT = T(s3, MX, 100, '', 'trv-ls');
  const o = ui.ocit([['fmt', 'Format'], ['bit', 'Trajanje bita'], ['zn', 'Bitova po znaku · trajanje znaka'], ['uk', 'Poruka'], ['z', 'Odabrani znak']]);
  function crtajZnakove() {
    gZ.replaceChildren();
    const w = Math.min(54, 580 / Math.max(1, poruka.length));
    poruka.forEach((p, i) => {
      const g = S('g', { transform: `translate(${f1(10 + i * w)} 8)` }, gZ);
      S('rect', { x: 0, y: 0, width: f1(w - 4), height: 72, rx: 6, class: 'trv-znak' + (p.ok ? '' : ' trv-znak-los') }, g);
      T(g, (w - 4) / 2, 30, p.z === ' ' ? '␠' : p.z, 'trv-lb', 'middle');
      T(g, (w - 4) / 2, 56, '&' + hex(p.kod), 'trv-kod', 'middle');
      klikabilno(ctx, g, `Znak ${p.z}, kod ${p.kod}`, () => { st.odabran = i; st.poz = i * NB; osvjezi(); });
      p.g = g;
    });
    // cijela poruka
    const ukupno = poruka.length * NB + 4, X = b => MX + MW * b / ukupno, yH = 26, yL = 64;
    let d = `M${MX},${yH}L${f1(X(2))},${yH}`, prev = 1;
    msgG.replaceChildren();
    poruka.forEach((p, i) => {
      p.f.bitovi.forEach((b, j) => { const x = X(2 + i * NB + j); if (b.v !== prev) d += `L${f1(x)},${prev ? yH : yL}L${f1(x)},${b.v ? yH : yL}`; prev = b.v; });
      S('line', { x1: f1(X(2 + i * NB)), x2: f1(X(2 + i * NB)), y1: 14, y2: 82, class: 'trv-mreza' }, msgG);
      if (MW / poruka.length > 22) T(msgG, X(2 + i * NB + NB / 2), 14, p.z, 'trv-ls', 'middle');
    });
    d += `L${f1(X(ukupno))},${prev ? yH : yL}`;
    msgP.setAttribute('d', d);
  }
  function osvjezi() {
    const nz = poruka.length;
    if (!nz) {
      tekst(nasZ, 'Za ovu naredbu robot ne šalje odgovor.'); val.setAttribute('d', '');
      bitLab.forEach(e => tekst(e, '')); bitVal.forEach(e => tekst(e, '')); bitBox.forEach(e => razred(e, 'trv-bit-akt', false));
      o.uk('—'); o.z('—'); ui.stanje('Odgovor šalju samo naredbe čitanja (WH, PR, CR, DR, ER, LR).', 'upoz'); return;
    }
    const zi = Math.min(nz - 1, Math.floor(st.poz / NB)), bi = st.poz - zi * NB;
    if (st.radi || st.odabran !== zi) st.odabran = zi;
    const p = poruka[st.odabran];
    poruka.forEach((q, i) => razred(q.g.firstChild, 'trv-znak-akt', i === st.odabran));
    // valni oblik okvira: mirovanje + bitovi
    const bit = [{ n: 'mir.', v: 1 }, ...p.f.bitovi];
    let d = `M${OX},${Y1}`, prev = 1;
    bit.forEach((b, i) => { const x = OX + (i + 0.5) * BW; if (b.v !== prev) d += `L${f1(x)},${prev ? Y1 : Y0}L${f1(x)},${b.v ? Y1 : Y0}`; prev = b.v; });
    d += `L${f1(OX + (bit.length + 0.5) * BW)},${prev ? Y1 : Y0}`;
    val.setAttribute('d', d);
    bit.forEach((b, i) => { tekst(bitLab[i], b.n); tekst(bitVal[i], String(b.v)); razred(bitBox[i], 'trv-bit-akt', i > 0 && st.odabran === zi && i - 1 === bi && (st.radi || st.poz > 0)); razred(bitBox[i], 'trv-bit-p', b.n === 'P'); });
    const d7 = bin(p.kod & ((1 << nB) - 1), nB);
    tekst(nasZ, `„${p.z}” = &${hex(p.kod)} = ${d7}b · jedinica ${p.f.jed} → P = ${p.f.p ?? '—'}`);
    const ukupno = nz * NB + 4, xk = MX + MW * (2 + st.poz) / ukupno;
    postavi(msgK, { x1: xk, x2: xk });
    tekst(msgT, `${nz} znakova × ${NB} bitova = ${nz * NB} bitova · ${hr(nz * NB * BIT * 1000, 2)} ms`);
    o.fmt(`${R.baud} Bd, ${nB} bita, ${par === 'E' ? 'parni (E)' : par === 'O' ? 'neparni (O)' : 'bez'} paritet, ${nS} stop`);
    o.bit(`1 / ${R.baud} s = ${hr(BIT * 1e6, 1)} µs`);
    o.zn(`1 + ${nB} + ${par === 'N' ? 0 : 1} + ${nS} = ${NB} · ${hr(NB * BIT * 1000, 3)} ms (≈ ${hr(R.baud / NB, 0)} znakova/s)`);
    o.uk(`${nz} znakova (s ${st.crlf ? 'CR+LF' : 'CR'}) → ${hr(nz * NB * BIT * 1000, 2)} ms`);
    o.z(`„${p.z}” = ${p.kod} = &${hex(p.kod)} = ${d7}b (D${nB - 1}…D0), paritet ${p.f.p ?? '—'}`);
    const los = poruka.filter(q => !q.ok).length, mala = /[a-zčćšđž]/.test(st.tekst) && st.smjer === 'pc';
    if (los) ui.stanje(`${los} znak(ova) nije u ${nB}-bitnom ASCII-ju (npr. dijakritici) — ne može se poslati.`, 'opas');
    else if (mala) ui.stanje('Poruka sadrži mala slova: simulator ih prihvaća, ali pravom robotu šalji velika slova.', 'upoz');
    else if (st.smjer === 'dum') ui.stanje(`Odgovor robota (format je pretpostavka): „${poruka.slice(0, -kraj().length).map(q => q.z).join('')}” + ${st.crlf ? 'CR+LF' : 'CR'}.`, 'plavo');
    else ui.stanje(`Računalo šalje „${st.tekst}” + ${st.crlf ? 'CR+LF' : 'CR'}: ${nz} okvira po ${NB} bitova.`, 'plavo');
  }
  ctx.petlja(dt => {
    if (!st.radi) return false;
    st.akum += dt;
    while (st.akum >= st.brz) { st.akum -= st.brz; st.poz++; if (st.poz >= poruka.length * NB) { st.poz = 0; st.radi = false; bP.osvjezi(); break; } }
    osvjezi();
    return st.radi;
  });
  // unos
  const ulaz = H('input', { type: 'text', value: st.tekst, maxlength: 24, class: 'trv-unos', 'aria-label': 'Naredba za slanje', spellcheck: 'false', autocomplete: 'off' });
  const rU = ui.red('trv-red-unos'); rU.append(H('label', { class: 'trv-unos-l' }, H('span', { tekst: 'Naredba' }), ulaz));
  ctx.on(ulaz, 'input', () => { st.tekst = ulaz.value; gradi(); });
  const rP = ui.red();
  for (const pr of ['NT', 'WH', 'ER', 'PR 5', 'MO 1, C']) ui.gumb(pr, () => { st.tekst = pr; ulaz.value = pr; gradi(); }, { tanki: true, u: rP, aria: 'Primjer: ' + pr });
  ui.seg('Smjer', [['pc', 'računalo → DUM1'], ['dum', 'odgovor DUM1 → računalo']], st.smjer, v => { st.smjer = v; gradi(); });
  ui.kvacica('SW1 bit 1 gore: kraj retka CR+LF (dolje: CR)', false, v => { st.crlf = v; gradi(); });
  const r = ui.red();
  const bP = ui.igraj(st, 'radi', 'Pošalji (usporeno)', v => { if (v && st.poz >= poruka.length * NB - 1) st.poz = 0; }, r);
  ui.gumb('Bit po bit', () => { st.radi = false; bP.osvjezi(); st.poz = (st.poz + 1) % Math.max(1, poruka.length * NB); osvjezi(); }, { tanki: true, u: r });
  ui.seg('Usporenje prikaza', [[0.25, '0,25 s/bit'], [0.12, '0,12 s/bit'], [0.04, '0,04 s/bit']], st.brz, v => { st.brz = v; });
  gradi();
};

/* =========================================================== 11. motorna prihvatnica i sila stiska (GP) */
TXT['prihvatnica-sila'] = {
  kratko: 'Kako GP zadaje početnu silu, silu držanja i trajanje početne sile motorne prihvatnice HM-01.',
  uvod: () => {
    const P = D.PRIHVATNICA;
    return [
      `Prihvatnica ${P.oznaka} je dvoprstna prihvatnica s DC servo motorom: hod prstiju je 0–${P.hodMm} mm, a silu upravljačka jedinica zadaje strujom motora u ${P.stupnjevaSile} stupnjeva (najviše ≈ ${hr(P.silaMaxKgf, 1)} kgf). Preklopnik HAND na stražnjoj ploči DUM1 mora biti na DC.`,
      'Naredba GP s, r, t zadaje tri broja: početnu silu s kojom prsti stisnu predmet, silu držanja r na koju se sila spusti nakon vremena t × 0,1 s, i to vrijeme. Velika kratka početna sila sigurno zahvati predmet, a manja sila držanja ne grije motor i ne gnječi predmet. Bez napajanja prihvatnica gubi silu držanja.'
    ];
  },
  kako: () => 'Zadaj GP klizačima i širinu predmeta, pa pritisni GC (zatvori). Graf prikazuje razmak prstiju i silu kroz vrijeme: zatvaranje, dodir, početna sila, pad na silu držanja. GO otvara. Uključi „nestanak napajanja” dok drži predmet.',
  napomena: () => `Linearan odnos stupnja i sile (stupanj / ${D.PRIHVATNICA.stupnjevaSile - 1} × ${hr(D.PRIHVATNICA.silaMaxKgf, 1)} kgf) je pretpostavka; rasponi GP (sile 0–15, vrijeme 0–99) izvedeni su iz 16 stupnjeva jer poglavlje s opisom naredbi nedostaje. Brzina prstiju (puni hod ≈ ${hr(D.PRIHVATNICA.vrijemeHoda, 1)} s) i širina predmeta su ilustrativne.`,
  naredbe: ['GP', 'GC', 'GO', 'GF', 'TI']
};
GRAD['prihvatnica-sila'] = function (ui, ctx) {
  const P = D.PRIHVATNICA, gp = NAR('GP'), A = gp ? gp.argumenti : [{ max: 15 }, { max: 15 }, { max: 99 }];
  const z0 = P.gp && Array.isArray(P.gp.zadano) ? P.gp.zadano : [10, 6, 10];
  const st = { s: z0[0], r: z0[1], t: z0[2], w: 30, otv: 1, faza: 'otvoreno', tk: 0, F: 0, nap: true, vr: 0, zap: [] };
  const sila = lv => lv / (P.stupnjevaSile - 1) * P.silaMaxKgf;   // kgf (pretpostavka: linearno)
  const svg = ui.svg(600, 250, 'Pogled na prste prihvatnice i predmet; strelice pokazuju silu stiska');
  const CX = 300, CY = 120, KK = 3.4;                                  // px po mm
  S('rect', { x: CX - 130, y: 18, width: 260, height: 46, rx: 8, class: 'trv-prihv' }, svg);
  T(svg, CX, 47, P.oznaka + ' (motor, mehanizam)', 'trv-lb trv-na-tamnom', 'middle');
  const pred = S('rect', { y: CY - 26, height: 92, rx: 4, class: 'trv-predmet' }, svg);
  const prst = [0, 1].map(() => S('rect', { y: 64, width: 22, height: 118, rx: 4, class: 'trv-prst' }, svg));
  const sF = [strel(svg, 0, 0, 1, 1, 'trv-c-crv', 4), strel(svg, 0, 0, 1, 1, 'trv-c-crv', 4)];
  const kotaW = S('line', { class: 'trv-kota' }, svg), kotaT = T(svg, CX, 222, '', 'trv-ls', 'middle');
  const s2 = ui.svg(600, 244, 'Graf razmaka prstiju i sile kroz vrijeme');
  const TM = 4;
  const G = graf(s2, 60, 20, 480, 170, { x0: 0, x1: TM, y0: 0, y1: 1, yt: [0, 0.5, 1], ylab: false, xt: [0, 1, 2, 3, 4], xf: v => v + ' s' });
  T(s2, 52, 26, `${P.hodMm} mm`, 'trv-ls', 'end'); T(s2, 52, 194, '0', 'trv-ls', 'end');
  T(s2, 548, 26, `${hr(P.silaMaxKgf, 1)} kgf`, 'trv-ls'); T(s2, 548, 194, '0', 'trv-ls');
  const lR = S('path', { class: 'trv-krivulja-b' }, s2), lF = S('path', { class: 'trv-krivulja-r' }, s2);
  T(s2, 60, 238, 'plavo: razmak prstiju · crveno: sila', 'trv-ls');
  const fx = ui.formula('Program', 3);
  const o = ui.ocit([['f', 'Faza'], ['raz', 'Razmak prstiju'], ['sila', 'Sila stiska'], ['gp', 'GP s, r, t']]);
  const NAZ = { otvoreno: 'otvorena', zatvara: 'zatvara se', pocetna: 'početna sila', drzanje: 'sila držanja', otvara: 'otvara se', prazno: 'zatvorena bez predmeta', bezNap: 'bez napajanja' };
  function osvjezi() {
    const raz = st.otv * P.hodMm;
    const xl = CX - raz / 2 * KK - 22, xr = CX + raz / 2 * KK;
    postavi(prst[0], { x: xl }); postavi(prst[1], { x: xr });
    if (st.w > 0) { postavi(pred, { x: CX - st.w / 2 * KK, width: st.w * KK }); pred.style.display = ''; } else pred.style.display = 'none';
    const Fp = st.F / Math.max(0.1, P.silaMaxKgf);
    if (st.F > 0.01) { sF[0].set(xl - 60 * Fp - 8, 150, xl - 4, 150); sF[1].set(xr + 26 + 60 * Fp + 8, 150, xr + 26, 150); } else { sF[0].set(0, 0, 0, 0); sF[1].set(0, 0, 0, 0); }
    postavi(kotaW, { x1: xl + 22, y1: 200, x2: xr, y2: 200 });
    tekst(kotaT, `razmak ${hr(raz, 1)} mm · predmet ${st.w ? hr(st.w, 0) + ' mm' : 'nema'}`);
    const X = G.X, Y = G.Y;
    lR.setAttribute('d', put(st.zap.map(z => [X(z[0]), Y(z[1])])));
    lF.setAttribute('d', put(st.zap.map(z => [X(z[0]), Y(z[2] / P.silaMaxKgf)])));
    fx.set(0, `GP ${st.s}, ${st.r}, ${st.t}`); fx.set(1, st.faza === 'otvara' || st.faza === 'otvoreno' ? 'GO' : 'GC'); fx.set(2, `TI ${Math.max(st.t, 3)}   ' pričekaj stisak`);
    o.f(NAZ[st.faza] || st.faza, st.faza === 'bezNap' ? 'opas' : '');
    o.raz(hr(raz, 1) + ' mm'); o.sila(`${hr(st.F, 2)} kgf ≈ ${hr(st.F * 9.81, 1)} N`, st.faza === 'bezNap' ? 'opas' : '');
    o.gp(`početna ${st.s} (${hr(sila(st.s), 2)} kgf), držanja ${st.r} (${hr(sila(st.r), 2)} kgf), ${hr(st.t / 10, 1)} s`);
    if (st.faza === 'bezNap') ui.stanje(`Nestalo je napajanja: ${P.bezNapajanja} — predmet može ispasti.`, 'opas');
    else if (st.faza === 'pocetna') ui.stanje(`Dodir s predmetom: početna sila ${st.s} drži se još ${hr(Math.max(0, st.t / 10 - st.tk), 1)} s.`, 'upoz');
    else if (st.faza === 'drzanje') ui.stanje(`Sila je pala na silu držanja ${st.r} (${hr(sila(st.r), 2)} kgf): predmet je čvrsto držan, a motor manje opterećen.`, 'ok');
    else if (st.faza === 'prazno') ui.stanje('Prsti su se zatvorili do kraja bez predmeta — stisnuti su jedan uz drugi istom silom.', 'upoz');
    else if (st.faza === 'zatvara') ui.stanje('GC: prsti se zatvaraju do dodira s predmetom.', 'plavo');
    else if (st.faza === 'otvara') ui.stanje('GO: prsti se otvaraju na puni hod.', 'plavo');
    else ui.stanje('Prihvatnica je otvorena. Zadaj GP i pritisni GC.');
  }
  ctx.petlja(dt => {
    const v = 1 / Math.max(0.1, P.vrijemeHoda);                   // udio hoda u sekundi
    const cilj = st.w / P.hodMm;
    st.vr += dt;
    switch (st.faza) {
      case 'zatvara': st.otv = Math.max(cilj, st.otv - v * dt); st.F = 0; if (st.otv <= cilj + 1e-9) { st.faza = st.w > 0 ? 'pocetna' : 'prazno'; st.tk = 0; } break;
      case 'pocetna': st.tk += dt; st.F = sila(st.s); if (st.tk >= st.t / 10) st.faza = 'drzanje'; break;
      case 'drzanje': case 'prazno': st.F = st.faza === 'prazno' ? (st.tk < st.t / 10 ? sila(st.s) : sila(st.r)) : sila(st.r); st.tk += dt; break;
      case 'otvara': st.F = 0; st.otv = Math.min(1, st.otv + v * dt); if (st.otv >= 1) st.faza = 'otvoreno'; break;
      case 'bezNap': st.F = 0; break;
      default: break;
    }
    if (st.vr <= TM) st.zap.push([st.vr, st.otv, st.F]);
    osvjezi();
    return st.vr <= TM || st.faza === 'zatvara' || st.faza === 'otvara' || st.faza === 'pocetna';
  });
  const nova = faza => { if (!st.nap) return; st.faza = faza; st.vr = 0; st.zap = [[0, st.otv, st.F]]; osvjezi(); ctx.budi(); };
  const r = ui.red();
  ui.gumb('GC (zatvori)', () => nova('zatvara'), { u: r });
  ui.gumb('GO (otvori)', () => nova('otvara'), { u: r, tanki: true });
  ui.klizac('s — početna sila', 0, A[0].max, 1, st.s, v => `${v} (${hr(sila(v), 2)} kgf)`, v => { st.s = v; osvjezi(); });
  ui.klizac('r — sila držanja', 0, A[1].max, 1, st.r, v => `${v} (${hr(sila(v), 2)} kgf)`, v => { st.r = v; osvjezi(); });
  ui.klizac('t — trajanje početne sile', 0, A[2].max, 1, st.t, v => `${v} × 0,1 s = ${hr(v / 10, 1)} s`, v => { st.t = v; osvjezi(); });
  ui.klizac('Širina predmeta (0 = bez predmeta)', 0, P.hodMm, 1, st.w, v => hr(v, 0) + ' mm', v => { st.w = v; if (st.faza !== 'zatvara') { st.faza = 'otvara'; st.F = 0; } osvjezi(); ctx.budi(); });
  ui.kvacica('Nestanak napajanja', false, v => { st.nap = !v; if (v) { st.faza = 'bezNap'; st.F = 0; } else st.faza = st.otv >= 1 ? 'otvoreno' : 'otvara'; st.vr = 0; st.zap = [[0, st.otv, st.F]]; osvjezi(); ctx.budi(); });
  ui.sitno(`HAND AC/DC: ${P.sucelje}.`);
  nova('zatvara');   // odmah pokaži jedan stisak
};

/* =========================================================== 12. pogreške I. i II. vrste */
TXT['pogreske'] = {
  kratko: 'Razlika pogrešaka I. i II. vrste: ERROR trepće ili svijetli, LED1–LED5, zujalo i poništavanje.',
  uvod: () => [
    `Pogreška I. vrste je sklopovska: ${D.POGRESKE.znakoviI} Uzroci su prevelika servo pogreška, odspojen kabel, STOP u nuždi (na DUM1, vanjski ili na privjesku) i prazna baterija. ${D.POGRESKE.ponistavanjeI}`,
    `Pogreška II. vrste je programska: ${D.POGRESKE.znakoviII} Uzroci su pogreška prijenosa naredbe (nepoznata naredba, krivi format), neizvediva naredba (argument izvan raspona, nedefinirana pozicija, nedohvatljiva točka, gibanje prije NEST-a) i pogreška upisa u EPROM. Poništava se: ${D.POGRESKE.ponistavanjeII.join(', ')}.`
  ],
  kako: () => 'Izazovi pogrešku gumbima ispod (sklopovsku ili slanjem neispravne naredbe) i prati prednju ploču DUM1, LED-ice iza bočnih vrata i odgovor na ER. Zatim je pokušaj poništiti: RESET i RS djeluju samo na II. vrstu; I. vrstu poništava tek isključenje i uključenje, a nakon toga treba NEST. Tipke na crtežu DUM1 (EMG. STOP, START, STOP, RESET) mogu se kliknuti.',
  napomena: () => 'Ponašanje daje interpreter DUM1 (rvm1_mrl.js). Robot uzrok pogreške II ne prikazuje kodom; oznake II-… su naše, za nastavu. Zujalo je prikazano simbolom, bez zvuka.',
  naredbe: ['ER', 'RS', 'NT']
};
GRAD['pogreske'] = function (ui, ctx) {
  const dum = novaJedinica(), S0 = dum.stanje;
  const odradi = () => { for (let i = 0; i < 4000 && dum.zauzet(); i++) dum.azuriraj(0.02); };
  dum.ukljuci(); dum.posalji('NT'); odradi();
  const st = { t: 0 };
  const svg = ui.svg(600, 300, 'Prednja ploča DUM1 s LED-icama POWER, ERROR, EXECUTE i tipkama, te LED1–LED5 i zujalo iza bočnih vrata');
  S('rect', { x: 10, y: 10, width: 330, height: 280, rx: 10, class: 'trv-dum1' }, svg);
  T(svg, 24, 34, 'DUM1 — prednja ploča', 'trv-lb trv-na-tamnom');
  const el = {};
  const PR = D.DUM1_PLOCA.prednja;
  PR.forEach((p, i) => {
    const y = 62 + i * 32;
    if (p.vrsta === 'led') el[p.id] = S('circle', { cx: 40, cy: y, r: 10, class: 'trv-led ' + (p.id === 'power' ? 'trv-led-zut' : p.id === 'error' ? 'trv-led-crv' : 'trv-led-zel') }, svg);
    else {
      const g = S('g', {}, svg);
      el[p.id] = S(p.id === 'emg' ? 'circle' : 'rect', p.id === 'emg' ? { cx: 40, cy: y, r: 13, class: 'trv-gljiva' } : { x: 26, y: y - 10, width: 28, height: 20, rx: 4, class: 'trv-tipka trv-tipka-' + p.id }, g);
      klikabilno(ctx, g, p.natpis, () => akcija(p.id));
    }
    T(svg, 66, y + 6, p.natpis, 'trv-l trv-na-tamnom');
  });
  S('rect', { x: 352, y: 10, width: 238, height: 280, rx: 10, class: 'trv-dum1-bok' }, svg);
  T(svg, 366, 34, 'iza bočnih vrata', 'trv-lb');
  const ledU = D.POGRESKE.I.map((p, i) => { const y = 64 + i * 34; const c = S('circle', { cx: 384, cy: y, r: 10, class: 'trv-led trv-led-crv' }, svg); T(svg, 402, y + 6, p.led, 'trv-l'); return c; });
  const zuj = S('g', { transform: 'translate(500 120)' }, svg);
  S('rect', { x: -18, y: -14, width: 22, height: 28, rx: 3, class: 'trv-zujalo' }, zuj);
  const valovi = [14, 26, 38].map(r => S('path', { d: luk(0, 0, r, -0.7, 0.7), class: 'trv-val' }, zuj));
  T(svg, 500, 172, 'zujalo', 'trv-ls', 'middle');
  const erT = T(svg, 470, 240, '', 'trv-kod', 'middle');
  const log = ui.log();
  const o = ui.ocit([['vr', 'Vrsta pogreške (ER)'], ['uz', 'Uzrok'], ['servo', 'Servo · kočnice J2/J3'], ['nest', 'NEST']]);
  function zapisi(txt, r) {
    const kl = r && (r.greska || r.odbijeno) ? 'opas' : 'ok';
    log.dodaj(txt + (r ? (r.odgovor != null ? ' → ' + r.odgovor : r.odbijeno ? ' → odbijeno: ' + r.odbijeno : r.greska ? ' → pogreška II (' + r.greska.kod + ')' : r === true ? ' → izvedeno' : r === false ? ' → bez učinka' : ' → izvedeno') : ''), kl);
  }
  function akcija(id) {
    let r;
    switch (id) {
      case 'emg': { const pr = !S0.emg.dum1; r = dum.hitniStop('dum1', pr); zapisi(pr ? 'EMG. STOP pritisnut' : 'EMG. STOP otpušten', r ? { greska: { kod: r.kod } } : true); break; }
      case 'start': zapisi('START', dum.startTipka()); break;
      case 'stop': dum.zaustavi(); zapisi('STOP', true); break;
      case 'reset': zapisi('RESET (tipka)', dum.resetTipka()); break;
      default: break;
    }
    osvjezi(); ctx.budi();
  }
  function osvjezi() {
    const L = S0.led;
    for (const id of ['power', 'error', 'execute']) razred(el[id], 'trv-on', L[id]);
    razred(el.emg, 'trv-gljiva-dolje', S0.emg.dum1);
    ledU.forEach((c, i) => razred(c, 'trv-on', L['LED' + (i + 1)]));
    const tip = S0.greska.tip, blink = L.error;
    valovi.forEach(v => razred(v, 'trv-on', tip === 2 || (tip === 1 && blink)));
    tekst(erT, `ER → ${tip}`);
    o.vr(tip === 0 ? '0 — nema pogreške' : tip === 1 ? '1 — I. vrsta (sklopovska)' : '2 — II. vrsta (programska)', tip ? 'opas' : 'ok');
    o.uz(tip ? `${S0.greska.kod}: ${S0.greska.poruka}` : '—');
    o.servo((S0.servo ? 'uključen' : 'isključen') + ' · ' + (S0.servo ? 'otpuštene' : 'zatvorene'), S0.servo ? 'ok' : 'opas');
    o.nest(S0.napajanje ? (S0.nestGotov ? 'napravljen' : 'potreban') : 'DUM1 isključen', S0.nestGotov ? 'ok' : 'upoz');
    if (!S0.napajanje) ui.stanje('DUM1 je isključen. Ukloni uzrok (otpusti EMG. STOP, spoji kabel, zamijeni bateriju) i uključi.', 'upoz');
    else if (tip === 1) ui.stanje(`Pogreška I. vrste (${S0.greska.led}): ERROR trepće, zujalo je isprekidano, servo je isključen i J2/J3 koče. RESET i RS ne pomažu — isključi i uključi DUM1, zatim NEST.`, 'opas');
    else if (tip === 2) ui.stanje(`Pogreška II. vrste (${S0.greska.kod}): ERROR svijetli stalno, zujalo zvuči neprekidno, servo ostaje uključen. Poništi tipkom RESET, naredbom RS (privjesak OFF) ili ulazom RESET.`, 'opas');
    else if (!S0.nestGotov) ui.stanje('DUM1 je uključen bez pogreške, ali NEST još nije napravljen: naredbe gibanja javit će pogrešku II.', 'upoz');
    else ui.stanje('Nema pogreške: POWER svijetli, robot je spreman.', 'ok');
  }
  ctx.petlja(dt => {
    st.t += dt; dum.azuriraj(dt); osvjezi();
    return S0.greska.tip === 1 || dum.zauzet();
  });
  const I = { LED1: 'Sudar / preopterećenje', LED2: 'Odspojen kabel', LED3: 'EMG. STOP na DUM1', LED4: 'EMG STOP privjeska', LED5: 'Prazna baterija' };
  ui.upr.append(H('p', { class: 'trv-podnaslov', tekst: 'Izazovi pogrešku I. vrste' }));
  const r1 = ui.red();
  for (const p of D.POGRESKE.I) ui.gumb(`${p.led}: ${I[p.led] || p.led}`, () => {
    let r;
    if (p.led === 'LED3') { r = dum.hitniStop('dum1', true); } else if (p.led === 'LED4') { r = dum.hitniStop('privjesak', true); } else r = dum.sklopovskaGreska(p.led);
    zapisi(I[p.led], r ? { greska: { kod: r.kod } } : false); osvjezi(); ctx.budi();
  }, { tanki: true, u: r1, title: p.uzrok });
  ui.upr.append(H('p', { class: 'trv-podnaslov', tekst: 'Izazovi pogrešku II. vrste (naredba s računala)' }));
  const r2 = ui.red();
  for (const [t, nar] of [['Nepoznata naredba', 'XY'], ['Izvan raspona', 'SP 12'], ['Nedefinirana pozicija', 'MO 600'], ['Nedohvatljiva točka', 'MP 900, 0, 0, -90, 0'], ['Gibanje prije NEST-a', 'MJ 10, 0, 0, 0, 0']]) {
    ui.gumb(`${t} (${nar})`, () => { const r = dum.posalji(nar); zapisi(nar, r); osvjezi(); ctx.budi(); }, { tanki: true, u: r2 });
  }
  ui.upr.append(H('p', { class: 'trv-podnaslov', tekst: 'Poništavanje' }));
  const r3 = ui.red();
  ui.gumb('RESET', () => akcija('reset'), { u: r3 });
  ui.gumb('RS s računala', () => { const r = dum.posalji('RS'); zapisi('RS', r); osvjezi(); ctx.budi(); }, { u: r3, tanki: true });
  ui.gumb('Ulaz RESET', () => { zapisi('ulaz RESET', dum.namjenskiUlaz('RESET', true)); osvjezi(); }, { u: r3, tanki: true });
  const r4 = ui.red();
  ui.gumb('Otpusti EMG tipke', () => { dum.hitniStop('dum1', false); dum.hitniStop('privjesak', false); zapisi('EMG tipke otpuštene', true); osvjezi(); }, { u: r4, tanki: true });
  ui.gumb('Isključi DUM1', () => { dum.iskljuci(); zapisi('isključenje', true); osvjezi(); }, { u: r4, tanki: true });
  ui.gumb('Uključi DUM1', () => { dum.ukljuci(); zapisi('uključenje', true); osvjezi(); ctx.budi(); }, { u: r4, tanki: true });
  ui.gumb('NT (NEST)', () => { const r = dum.posalji('NT'); zapisi('NT', r); osvjezi(); ctx.budi(); }, { u: r4, tanki: true });
  ui.kvacica('Privjesak ON (naredbe s računala se odbijaju)', false, v => { dum.privjesak.ukljuci(v); zapisi(v ? 'privjesak ON' : 'privjesak OFF', true); osvjezi(); });
  osvjezi();
};


/* =========================================================== 13. memorija: RAM s baterijom i EPROM */
TXT['eprom-ram'] = {
  kratko: 'Gdje DUM1 čuva program i pozicije: RAM s baterijom, EPROM, naredbe WR i TR i preklopnik ST2.',
  uvod: () => {
    const M = D.JEDINICA.memorija;
    return [
      `DUM1 pamti do ${M.pozicija} pozicija (${M.pozicijaKB} KB) i ${M.redaka} programskih redaka (${M.retciKB} KB). Radna memorija je statički RAM koji nakon isključenja čuva sadržaj zahvaljujući bateriji BAT-M1 (traje ≈ 2 godine). Kad se baterija isprazni, program i pozicije nestaju pri prvom isključenju.`,
      'Za trajnu pohranu jedinica ima EPROM s ugrađenim programatorom: naredba WR (na privjesku WRT, ENT) upisuje sadržaj RAM-a u EPROM, a TR (TRN, ENT) ga vraća u RAM. Preklopnik ST2 iza bočnih vrata pri svakom uključenju sam kopira EPROM u RAM. Uz SW1 bit 2 jedinica provjerava bateriju i praznu javlja pogreškom I. vrste (LED5).'
    ];
  },
  kako: () => 'Upiši nekoliko redaka i definiraj poziciju, pa isključi i uključi — uz ispravnu bateriju sadržaj ostaje. Isprazni bateriju i ponovi: RAM je prazan, a s WR spremljen sadržaj vraća TR ili ST2. Uključi i provjeru baterije (SW1 bit 2).',
  napomena: () => `Ponašanje naredbi daje interpreter DUM1. Trajanje upisa WR (${D.UPRAVLJANJE_ZADANO.trajanjeWR} s) i gubitak cijelog RAM-a pri praznoj bateriji su pretpostavka simulatora. Vrsta procesora i čipova memorije nije u izvorima; blokovi su načelni.`,
  naredbe: ['WR', 'TR', 'NW', 'PD', 'DL']
};
GRAD['eprom-ram'] = function (ui, ctx) {
  const dum = novaJedinica(), S0 = dum.stanje;
  const PROG = ['10 NT', '20 SP 4', '30 MO 1', '40 GC', '50 MO 2', '60 GO', '70 GT 30'];
  const st = { bat: true, st2: false, sw2: false, wr: 0, sljed: 0, akt: '' };
  dum.ukljuci();
  const svg = ui.svg(600, 330, 'Blokovi memorije DUM1: procesor, RAM s baterijom, EPROM, strelice WR, TR i ST2');
  const blok = (x, y, w, h, nas, kl) => { const g = S('g', {}, svg); S('rect', { x, y, width: w, height: h, rx: 10, class: kl || 'trv-blok' }, g); T(g, x + 12, y + 24, nas, 'trv-lb'); return g; };
  blok(220, 12, 160, 56, 'CPU', 'trv-blok trv-blok-cpu'); T(svg, 300, 58, `${D.ROBOT.naredbi} naredbi`, 'trv-ls', 'middle');
  blok(14, 100, 236, 186, 'RAM (statički)'); blok(350, 100, 236, 186, 'EPROM');
  const bat = S('g', { transform: 'translate(40 296)' }, svg);
  const batT = S('rect', { x: 0, y: 0, width: 70, height: 26, rx: 4, class: 'trv-baterija' }, bat); S('rect', { x: 70, y: 8, width: 6, height: 10, class: 'trv-baterija' }, bat);
  const batR = S('rect', { x: 3, y: 3, width: 64, height: 20, rx: 2, class: 'trv-baterija-r' }, bat);
  T(svg, 124, 314, 'BAT-M1', 'trv-ls');
  const ram = T(svg, 26, 150, '', 'trv-kod'), eprom = T(svg, 362, 150, '', 'trv-kod');
  const ramL = [], epL = [];
  for (let i = 0; i < 6; i++) { ramL.push(T(svg, 26, 176 + i * 18, '', 'trv-kod')); epL.push(T(svg, 362, 176 + i * 18, '', 'trv-kod')); }
  const sWR = strel(svg, 256, 160, 344, 160, 'trv-c-teal', 3), sTR = strel(svg, 344, 220, 256, 220, 'trv-c-nar', 3);
  T(svg, 300, 150, 'WR', 'trv-lb', 'middle'); T(svg, 300, 244, 'TR / ST2', 'trv-lb', 'middle');
  S('line', { x1: 300, y1: 68, x2: 300, y2: 100, class: 'trv-vodilja' }, svg); S('line', { x1: 132, y1: 100, x2: 300, y2: 84, class: 'trv-vodilja' }, svg); S('line', { x1: 468, y1: 100, x2: 300, y2: 84, class: 'trv-vodilja' }, svg);
  const trak = S('rect', { x: 350, y: 292, width: 0, height: 10, rx: 3, class: 'trv-stupac' }, svg);
  const napT = T(svg, 590, 320, '', 'trv-ls', 'end');
  const log = ui.log();
  const o = ui.ocit([['ram', 'RAM'], ['ep', 'EPROM'], ['nap', 'Napajanje'], ['gr', 'Pogreška']]);
  const ispis = (prog, poz) => { const r = [...prog.keys()].sort((a, b) => a - b).map(k => k + ' ' + prog.get(k)); return { r, n: r.length, p: poz.size }; };
  function osvjezi() {
    const a = ispis(S0.program, S0.pozicije), b = ispis(S0.eprom.program, S0.eprom.pozicije);
    tekst(ram, `${a.n} redaka · ${a.p} pozicija`); tekst(eprom, S0.eprom.upisano ? `${b.n} redaka · ${b.p} pozicija` : 'prazan (nije upisan)');
    ramL.forEach((t, i) => tekst(t, a.r[i] ? a.r[i] : (i === 0 && !a.n ? '— prazno —' : '')));
    epL.forEach((t, i) => tekst(t, b.r[i] || ''));
    razred(batT, 'trv-baterija-prazna', !st.bat); razred(batR, 'trv-baterija-prazna', !st.bat);
    sWR.style.opacity = st.akt === 'WR' ? '1' : '.25'; sTR.style.opacity = st.akt === 'TR' ? '1' : '.25';
    const wr = dum.aktivnost() === 'cekanje';
    postavi(trak, { width: wr ? 236 * ogr(st.wr / D.UPRAVLJANJE_ZADANO.trajanjeWR, 0, 1) : 0 });
    tekst(napT, S0.napajanje ? 'DUM1 uključen' : 'DUM1 isključen');
    o.ram(`${a.n} / ${D.JEDINICA.memorija.redaka} redaka, ${a.p} / ${D.JEDINICA.memorija.pozicija} pozicija`);
    o.ep(S0.eprom.upisano ? `${b.n} redaka, ${b.p} pozicija` : 'nije upisan');
    o.nap(S0.napajanje ? 'uključeno' : 'isključeno', S0.napajanje ? 'ok' : 'upoz');
    o.gr(S0.greska.tip ? `${S0.greska.kod}: ${S0.greska.poruka}` : 'nema', S0.greska.tip ? 'opas' : 'ok');
    if (wr) ui.stanje('WR: upis RAM → EPROM ugrađenim programatorom traje — ne isključuj jedinicu.', 'upoz');
    else if (S0.greska.tip === 1) ui.stanje('Pogreška I. vrste (LED5): baterija je prazna. Zamijeni bateriju, isključi i uključi.', 'opas');
    else if (!S0.napajanje) ui.stanje(st.bat ? 'Isključeno: RAM čuva sadržaj iz baterije.' : 'Isključeno s praznom baterijom: sadržaj RAM-a se gubi.', st.bat ? 'ok' : 'opas');
    else ui.stanje(S0.eprom.upisano ? 'EPROM sadrži sigurnosnu kopiju; TR ili ST2 vraćaju je u RAM.' : 'EPROM je prazan — WR sprema RAM trajno.', 'plavo');
  }
  const posalji = txt => { const r = dum.posalji(txt); log.dodaj(txt + (r.greska ? ' → pogreška II (' + r.greska.kod + ')' : r.odbijeno ? ' → odbijeno' : ' → u redu'), r.greska || r.odbijeno ? 'opas' : 'ok'); return r; };
  ctx.petlja(dt => {
    const wr = dum.aktivnost() === 'cekanje';
    if (wr) st.wr += dt;
    dum.azuriraj(dt);
    if (!dum.zauzet() && st.akt === 'WR') st.akt = '';
    osvjezi();
    return wr || dum.zauzet();
  });
  const r = ui.red();
  ui.gumb('Upiši redak', () => { if (!S0.napajanje) return; const t = PROG[st.sljed % PROG.length]; st.sljed++; posalji(t); osvjezi(); }, { u: r });
  ui.gumb('Definiraj poziciju', () => { if (!S0.napajanje) return; const t = KIN.uTocku(D.ORG, TLmm() / 1000); const n = S0.pozicije.size + 1; posalji(`PD ${n}, ${t.x.toFixed(1)}, ${(t.y + 10 * n).toFixed(1)}, ${t.z.toFixed(1)}, ${t.p.toFixed(1)}, ${t.r.toFixed(1)}`); osvjezi(); }, { u: r, tanki: true });
  ui.gumb('NW (briši RAM)', () => { if (!S0.napajanje) return; posalji('NW'); st.sljed = 0; osvjezi(); }, { u: r, tanki: true });
  const r2 = ui.red();
  ui.gumb('WR (RAM → EPROM)', () => { if (!S0.napajanje) return; st.akt = 'WR'; st.wr = 0; posalji('WR'); osvjezi(); ctx.budi(); }, { u: r2 });
  ui.gumb('TR (EPROM → RAM)', () => { if (!S0.napajanje) return; st.akt = 'TR'; posalji('TR'); osvjezi(); ctx.odgodi(() => { st.akt = ''; osvjezi(); }, 900); }, { u: r2 });
  const r3 = ui.red();
  ui.gumb('Isključi', () => { dum.iskljuci(); log.dodaj('isključenje', 'ok'); osvjezi(); }, { u: r3, tanki: true });
  ui.gumb('Uključi', () => {
    if (S0.napajanje) return;
    const izgubljeno = !st.bat;
    dum.postaviPreklopnik('ST2', false);
    dum.ukljuci();
    if (izgubljeno) { dum.posalji('NW'); log.dodaj('RAM izgubljen (prazna baterija)', 'opas'); }
    dum.postaviPreklopnik('ST2', st.st2);
    if (st.st2) { dum.posalji('TR'); st.akt = 'TR'; log.dodaj('ST2: EPROM → RAM pri uključenju', 'ok'); ctx.odgodi(() => { st.akt = ''; osvjezi(); }, 900); }
    if (!st.bat && st.sw2) dum.sklopovskaGreska('LED5');
    log.dodaj('uključenje', 'ok'); osvjezi(); ctx.budi();
  }, { u: r3, tanki: true });
  ui.kvacica('Baterija BAT-M1 prazna', false, v => { st.bat = !v; osvjezi(); });
  ui.kvacica('ST2: kopiraj EPROM → RAM pri uključenju', false, v => { st.st2 = v; });
  ui.kvacica('SW1 bit 2: provjera baterije (LED5)', false, v => { st.sw2 = v; dum.postaviPreklopnik('SW1', v, 2); });
  posalji(PROG[0]); posalji(PROG[1]); st.sljed = 2;
  osvjezi();
};

/* =========================================================== 14. radni prostor i granice osi */
TXT['radni-prostor'] = {
  kratko: 'Doseg točke šake i TCP-a u ravnini ruke, raspon struka ±150° i granice svih pet osi.',
  uvod: () => {
    const O = D.OSI;
    return [
      `Radni prostor određuju duljine članaka (nadlaktica ${hr(D.MJERE.L2 * 1000, 0)} mm, podlaktica ${hr(D.MJERE.L3 * 1000, 0)} mm) i granice zglobova: ${O.map(o => `${o.ime} ${hrp(o.minDeg, 0)}° … ${hrp(o.maxDeg, 0)}°`).join(', ')}. U ravnini ruke točka šake (os nagiba J4) opisuje područje omeđeno lukovima koje daju krajnji kutovi ramena i lakta.`,
      `TCP je od točke šake udaljen još ${hr(D.MJERE.L4 * 1000, 0)} mm do prirubnice i duljinu alata TL, u smjeru P = J2 + J3 + J4. Struk se okreće ${O[0].raspon}°, pa iza robota ostaje mrtvi kut od ${360 - O[0].raspon}°. Točka izvan dosega ili izvan granica neke osi na robotu javlja pogrešku II. vrste.`
    ];
  },
  kako: () => 'Pomiči zglobove klizačima i prati ruku u bočnom pogledu i tlocrtu te trake granica dolje. Plavo je područje točke šake, crtkano područje TCP-a za trenutni nagib P. Klikni bilo gdje u bočni pogled: provjera kaže je li točka dohvatljiva s tim nagibom i zašto nije.',
  napomena: () => `Visina ramena d1 = ${hr(D.MJERE.d1 * 1000, 0)} mm je pretpostavka (izmjeriti); s njom se pomiče cijelo područje. Dodatno ograničenje nagiba šake u nekim položajima ruke (crtež u priručniku nije dostupan) i sudari s podnožjem nisu uzeti u obzir.`,
  naredbe: ['MJ', 'MP', 'WH']
};
GRAD['radni-prostor'] = function (ui, ctx) {
  const O = D.OSI, M = D.MJERE;
  const st = { q: [20 * RAD, 60 * RAD, -80 * RAD, -70 * RAD, 0], proba: null };
  const svg = ui.svg(600, 560, 'Radni prostor: bočni pogled s područjem točke šake i TCP-a, tlocrt s rasponom struka i trake granica osi');
  const BX = 150, BY = 330, K = 400;
  const X = r => BX + r * K, Y = z => BY - z * K;
  const obris = KIN.obrisRadnogProstora(60);
  S('path', { d: put(obris.map(([r, z]) => [X(r), Y(z)]), true), class: 'trv-podrucje' }, svg);
  const obT = S('path', { class: 'trv-podrucje-t' }, svg);
  const rb = robotBocno(svg, { ox: BX, oy: BY, k: K });
  T(svg, 10, 20, 'ravnina ruke (r, z)', 'trv-ls');
  const prob = S('g', {}, svg); const probC = S('circle', { r: 8, class: 'trv-meta' }, prob);
  S('line', { x1: 392, y1: 8, x2: 392, y2: 400, class: 'trv-mreza' }, svg);
  const ro = robotOdozgo(svg, { ox: 495, oy: 200, k: 150, rGr: 0.6 });
  const rMax = Math.max(...obris.map(p => p[0]));
  S('circle', { cx: 495, cy: 200, r: f1(rMax * 150), class: 'trv-doseg' }, svg);
  T(svg, 400, 20, 'tlocrt', 'trv-ls');
  // trake granica
  const tr = O.map((o, i) => {
    const y = 420 + i * 27, x0 = 70, w = 470, Xa = d => x0 + (d - o.minDeg) / (o.maxDeg - o.minDeg) * w;
    T(svg, 60, y + 13, o.ime, 'trv-lb', 'end');
    S('rect', { x: x0, y, width: w, height: 16, rx: 8, class: 'trv-traka' }, svg);
    const ozn = S('rect', { y: y - 3, width: 6, height: 22, rx: 2, class: 'trv-traka-ozn' }, svg);
    T(svg, x0, y + 30 - 18, String(o.minDeg), 'trv-ls trv-na-traci', 'start');
    T(svg, x0 + w, y + 12, String(o.maxDeg), 'trv-ls trv-na-traci', 'end');
    const vt = T(svg, x0 + w + 8, y + 13, '', 'trv-ls');
    return { ozn, vt, Xa };
  });
  const o = ui.ocit([['wh', 'TCP (WH)'], ['sk', 'Točka šake'], ['p', 'P = J2 + J3 + J4'], ['d', 'Najveći doseg točke šake od osi J1'], ['pr', 'Provjera točke']]);
  function osvjezi() {
    const q = st.q, tl = TLmm() / 1000;
    rb.postavi(q, tl, 0.5); ro.postavi(q, tl);
    const P = q[1] + q[2] + q[3], L = M.L4 + tl;
    obT.setAttribute('d', put(obris.map(([r, z]) => [X(r + L * Math.cos(P)), Y(z + L * Math.sin(P))]), true));
    tr.forEach((t, i) => { postavi(t.ozn, { x: t.Xa(q[i] / RAD) - 3 }); tekst(t.vt, hr(q[i] / RAD, 0) + '°'); });
    const f = KIN.fk(q, tl);
    o.wh(zapisWH(KIN.uTocku(q, tl)));
    o.sk(f.sake.map(v => hr(v * 1000, 1)).join(', ') + ' mm');
    o.p(hr(P / RAD, 1) + '°');
    o.d(hr(rMax * 1000, 0) + ' mm (+ ' + hr(L * 1000, 0) + ' mm do TCP-a)');
    if (st.proba) {
      const [r, z] = st.proba, a = znakJ1() * q[0];
      const res = KIN.ik({ x: r * Math.cos(a), y: r * Math.sin(a), z, P, R: q[4] }, tl, q);
      postavi(probC, { cx: X(r), cy: Y(z) }); prob.style.display = '';
      razred(probC, 'trv-meta-opas', !res.uspjeh);
      o.pr(`r ${hr(r * 1000, 0)}, z ${hr(z * 1000, 0)} mm: ${res.uspjeh ? 'dohvatljivo' : res.razlog}`, res.uspjeh ? 'ok' : 'opas');
      if (res.uspjeh) ui.stanje(`Točka (r ${hr(r * 1000, 0)} mm, z ${hr(z * 1000, 0)} mm) je dohvatljiva s nagibom P = ${hr(P / RAD, 0)}°.`, 'ok');
      else ui.stanje(`Točka nije dohvatljiva s P = ${hr(P / RAD, 0)}°: ${res.razlog}. Robot bi javio pogrešku II. vrste. Probaj drugi nagib (J4).`, 'opas');
    } else { prob.style.display = 'none'; o.pr('klikni u bočni pogled'); ui.stanje('Plavo: doseg točke šake (granice J2 i J3). Crtkano: doseg TCP-a uz trenutni nagib P.', 'plavo'); }
  }
  ctx.on(svg, 'click', e => { const [sx, sy] = tockaSVG(svg, e); if (sx > 392 || sy > 400) return; st.proba = [(sx - BX) / K, (BY - sy) / K]; osvjezi(); });
  const kl = O.map((os, i) => ui.klizac(`${os.ime} — ${os.naziv}`, os.minDeg, os.maxDeg, 1, Math.round(st.q[i] / RAD), v => hrp(v, 0) + '°', v => { st.q[i] = v * RAD; osvjezi(); }));
  const r = ui.red();
  ui.gumb('ORG', () => { st.q = D.ORG.slice(); kl.forEach((k, i) => k.postavi(Math.round(st.q[i] / RAD))); osvjezi(); }, { tanki: true, u: r });
  ui.gumb('Najveći doseg', () => { st.q = [0, 0, 0, 0, 0]; kl.forEach((k, i) => k.postavi(0)); st.proba = null; osvjezi(); }, { tanki: true, u: r });
  ui.gumb('Provjeri točku ispred robota', () => { st.proba = [0.42, 0.05]; osvjezi(); }, { tanki: true, u: r });
  osvjezi();
};

/* =========================================================== 15. servo pojačalo i regulacija položaja */
TXT['servo-pojacalo'] = {
  kratko: 'Zatvoreni regulacijski krug osi: zadani i stvarni položaj, regulator, PWM, motor, enkoder i nadzor servo pogreške.',
  uvod: () => [
    'Za svaku os DUM1 ima servo pojačalo. Interpolator svakih nekoliko milisekundi daje zadani položaj osi; enkoder na motoru javlja stvarni. Razlika je servo pogreška — regulator iz nje (i iz brzine) računa napon, a pojačalo ga ostvaruje impulsno širinskom modulacijom (PWM) preko mosta tranzistora, u oba smjera. Tako DC motor slijedi zadani položaj.',
    'Upravljačka jedinica stalno nadzire servo pogrešku. Ako postane prevelika — zbog sudara, preopterećenja, kvara enkodera ili blokirane osi — javlja pogrešku I. vrste s LED1: isključuje servo napajanje, a J2 i J3 koče.'
  ],
  kako: () => 'Pokreni gibanje (os ide naprijed-natrag) i mijenjaj pojačanje regulatora: malo pojačanje daje veliko zaostajanje, veliko nadvišenje i titranje. Dodaj stalni teret: bez integralnog člana ostaje pogreška u mirovanju. Uključi blokadu (sudar) — pogreška raste preko praga i javlja se LED1.',
  napomena: () => 'Struktura regulatora, parametri motora, ubrzanje, prag servo pogreške i iznosi pojačanja nisu u dostupnim izvorima — sve brojke u ovoj temi su ilustrativne. Iz podataka su samo najveće brzine osi (za interpolator) i snage motora.',
  naredbe: ['SP', 'MO', 'ER']
};
GRAD['servo-pojacalo'] = function (ui, ctx) {
  const AMAX = 900, PRAG = 6;                                  // ILUSTR: °/s², prag servo pogreške [°]
  const st = { radi: true, os: 1, kp: 6, ki: false, tau: 0, blok: false, th: 0, w: 0, ref: 0, refW: 0, cilj: 40, amp: 40, integ: 0, u: 0, gr: false, tgr: 0, t: 0, zap: [], sp: 4 };
  const svg = ui.svg(600, 170, 'Blok-shema regulacijskog kruga: interpolator, zbrajalo, regulator, PWM pojačalo, DC motor, enkoder');
  const bl = [['Interpolator', 10], ['Regulator', 160], ['PWM most', 290], ['DC motor', 420]];
  const vrijed = {};
  bl.forEach(([n, x]) => { S('rect', { x, y: 30, width: 110, height: 54, rx: 8, class: 'trv-blok' }, svg); T(svg, x + 55, 52, n, 'trv-l', 'middle'); vrijed[n] = T(svg, x + 55, 74, '', 'trv-kod', 'middle'); });
  S('circle', { cx: 140, cy: 57, r: 10, class: 'trv-blok' }, svg); T(svg, 140, 62, 'Σ', 'trv-ls', 'middle');
  strel(svg, 120, 57, 129, 57); strel(svg, 151, 57, 159, 57); strel(svg, 270, 57, 289, 57); strel(svg, 400, 57, 419, 57); strel(svg, 530, 57, 590, 57);
  S('rect', { x: 420, y: 112, width: 110, height: 40, rx: 8, class: 'trv-blok' }, svg); T(svg, 475, 137, 'Enkoder', 'trv-l', 'middle');
  S('path', { d: 'M560,57 L560,132 L531,132', class: 'trv-vodilja-p' }, svg);
  S('path', { d: 'M419,132 L140,132 L140,68', class: 'trv-vodilja-p' }, svg); strel(svg, 140, 80, 140, 68);
  T(svg, 146, 126, '− stvarni položaj', 'trv-ls');
  const led1 = S('circle', { cx: 50, cy: 132, r: 10, class: 'trv-led trv-led-crv' }, svg); T(svg, 66, 138, 'LED1', 'trv-ls');
  const s2 = ui.svg(600, 316, 'Graf zadanog i stvarnog položaja te servo pogreške s pragom');
  const TW = 5;
  const G1 = graf(s2, 60, 30, 520, 140, { x0: 0, x1: TW, y0: -10, y1: 60, yt: [0, 20, 40, 60], xlab: false, naslov: 'položaj osi (°): crtkano zadani, puno stvarni' });
  const G2 = graf(s2, 60, 206, 520, 80, { x0: 0, x1: TW, y0: -12, y1: 12, yt: [-PRAG, 0, PRAG], yf: v => hr(v, 0), xt: [0, 1, 2, 3, 4, 5], xf: v => v + ' s', naslov: `servo pogreška (°), prag ±${PRAG}° (ilustrativno)` });
  const lRef = S('path', { class: 'trv-krivulja-z' }, s2), lTh = S('path', { class: 'trv-krivulja' }, s2), lE = S('path', { class: 'trv-krivulja-r' }, s2);
  S('line', { x1: 60, x2: 580, y1: f1(G2.Y(PRAG)), y2: f1(G2.Y(PRAG)), class: 'trv-prag' }, s2); S('line', { x1: 60, x2: 580, y1: f1(G2.Y(-PRAG)), y2: f1(G2.Y(-PRAG)), class: 'trv-prag' }, s2);
  const o = ui.ocit([['os', 'Os'], ['e', 'Servo pogreška'], ['u', 'Napon (PWM)'], ['w', 'Brzina osi']]);
  function korak(dt) {
    const O = D.OSI[st.os], vZ = O.vMax * udioSP(st.sp);
    // interpolator: trapezni profil prema cilju
    const d = st.cilj - st.ref, sgn = Math.sign(d), zaust = st.refW * st.refW / (2 * AMAX * 0.6);
    if (Math.abs(d) < 1e-3 && Math.abs(st.refW) < 1) { st.ref = st.cilj; st.refW = 0; }
    else { const a = Math.abs(d) <= zaust ? -sgn * AMAX * 0.6 * Math.sign(st.refW * sgn) : sgn * AMAX * 0.6; st.refW = ogr(st.refW + a * dt, -vZ, vZ); st.ref += st.refW * dt; if (Math.sign(st.cilj - st.ref) !== sgn) { st.ref = st.cilj; st.refW = 0; } }
    const e = st.ref - st.th;
    if (!st.gr) {
      if (st.ki) st.integ = ogr(st.integ + e * dt, -20, 20); else st.integ = 0;
      st.u = ogr((st.kp * e + (st.ki ? 4 * st.integ : 0)) / 20 - 0.6 * st.w / O.vMax + st.refW / O.vMax, -1, 1);
    } else st.u = 0;
    const acc = AMAX * 2 * st.u - (AMAX * 2 / O.vMax) * st.w - st.tau * AMAX;
    if (st.blok) { st.w = 0; } else { st.w += acc * dt; st.th += st.w * dt; }
    if (st.gr && !st.blok && O.kocnica) st.w = 0;
    if (!st.gr && Math.abs(e) > PRAG) { st.tgr += dt; if (st.tgr > 0.15) { st.gr = true; } } else st.tgr = 0;
    st.t += dt;
    st.zap.push([st.t, st.ref, st.th, e]);
    while (st.zap.length && st.zap[0][0] < st.t - TW) st.zap.shift();
  }
  function osvjezi() {
    const t0 = st.t - TW, X1 = t => G1.X(t - t0);
    const kr = (k, G) => put(st.zap.map(z => [X1(z[0]), G.Y(ogr(z[k], G === G1 ? -10 : -12, G === G1 ? 60 : 12))]));
    lRef.setAttribute('d', kr(1, G1)); lTh.setAttribute('d', kr(2, G1)); lE.setAttribute('d', kr(3, G2));
    const O = D.OSI[st.os], e = st.ref - st.th;
    tekst(vrijed.Interpolator, hr(st.ref, 1) + '°'); tekst(vrijed.Regulator, 'e = ' + hr(e, 2) + '°'); tekst(vrijed['PWM most'], hr(st.u * 100, 0) + ' %'); tekst(vrijed['DC motor'], hr(st.w, 0) + ' °/s');
    razred(led1, 'trv-on', st.gr);
    o.os(`${O.ime}: ${O.motorW} W, najviše ${O.vMax} °/s (SP ${st.sp}: ${hr(O.vMax * udioSP(st.sp), 0)} °/s)`);
    o.e(hr(e, 2) + '°', Math.abs(e) > PRAG ? 'opas' : Math.abs(e) > PRAG / 2 ? 'upoz' : 'ok');
    o.u(hrp(st.u * 100, 0) + ' %'); o.w(hr(st.w, 1) + ' °/s');
    if (st.gr) ui.stanje(`Servo pogreška je prešla prag: pogreška I. vrste, LED1. Servo napajanje je isključeno${O.kocnica ? ', kočnica drži os' : ''}. Poništavanje: isključi, ukloni uzrok, uključi i NEST.`, 'opas');
    else if (st.blok) ui.stanje('Os je blokirana (sudar): zadani položaj odmiče, stvarni stoji, pogreška raste…', 'upoz');
    else if (st.tau > 0 && !st.ki) ui.stanje('Stalni teret: P-regulator treba pogrešku da bi dao napon koji drži teret — ostaje pogreška u mirovanju. Uključi I-član.', 'upoz');
    else ui.stanje('Stvarni položaj slijedi zadani; zaostajanje ovisi o pojačanju i brzini.', 'ok');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const n = Math.max(1, Math.ceil(dt / 0.002));
    for (let i = 0; i < n; i++) korak(dt / n);
    if (Math.abs(st.cilj - st.ref) < 1e-3 && Math.abs(st.refW) < 1) { st.mir = (st.mir || 0) + dt; if (st.mir > 0.9 && !st.blok) { st.cilj = st.cilj ? 0 : st.amp; st.mir = 0; } }
    osvjezi();
    return true;
  });
  const r = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r);
  ui.gumb('Isključi, uključi i NEST', () => { st.gr = false; st.blok = false; kvB.postavi(false); st.th = st.ref; st.w = 0; st.integ = 0; ctx.budi(); }, { tanki: true, u: r });
  ui.seg('Os', D.OSI.map((x, i) => [i, x.ime]), st.os, i => { st.os = i; });
  ui.klizac('Pojačanje regulatora Kp', 1, 30, 1, st.kp, v => hr(v, 0) + ' (ilustrativno)', v => { st.kp = v; });
  ui.klizac('Stalni teret', 0, 0.4, 0.02, st.tau, v => hr(v * 100, 0) + ' % (ilustrativno)', v => { st.tau = v; });
  ui.klizac('Brzina SP', 0, 9, 1, st.sp, v => 'SP ' + v, v => { st.sp = v; });
  ui.kvacica('I-član (uklanja pogrešku u mirovanju)', false, v => { st.ki = v; });
  const kvB = ui.kvacica('Blokada osi (sudar)', false, v => { st.blok = v; ctx.budi(); });
  osvjezi(); ctx.budi();
};

/* =========================================================== 16. rad s privjeskom: učenje i provjera točaka */
TXT['privjesak-rad'] = {
  kratko: 'Učenje točke privjeskom: NEST, ručno vođenje u PTP/XYZ/TOOL, P.S broj ENT i provjera s MOV.',
  uvod: () => {
    const P = D.PRIVJESAK;
    return [
      `Privjesak (${P.naziv}, kabel ${P.kabel}) služi za ručno vođenje i učenje točaka. S preklopnikom na ON tipke su aktivne, a naredbe s računala se odbijaju. Nakon uključenja prvo se napravi NEST (NST, ENT). Ručno vođenje radi u tri načina: PTP po zglobovima (B, S, E, P, R), XYZ po koordinatama vrha alata i TOOL u smjeru alata.`,
      `Točka se uči tako da se robot dovede u položaj i spremi slijedom P.S, broj, ENT; provjerava se s MOV, broj, ENT (robot ide na točku brzinom SP ${D.UPRAVLJANJE_ZADANO.movSp}). Broj se upisuje tipkama s brojkama (npr. 1 je na +OPTION, 5 na C). Zaslon s ${P.zaslon.znamenke} znamenke pokazuje broj pozicije; „-” znači da je postupak izveden, „!” da se ne može izvesti.`
    ];
  },
  kako: () => 'Uključi privjesak (ON), napravi NEST, vodi robot držeći tipke gibanja, spremi točku s P.S, 1, ENT, odvezi robot i provjeri je s MOV, 1, ENT. Tipke rade mišem, dodirom i tipkovnicom (Enter ili razmaknica, držanje za vođenje). „Demonstracija” sama odradi cijeli postupak.',
  napomena: () => 'Privjesak i jedinica su simulirani interpreterom DUM1 (rvm1_mrl.js). Brzine ručnog vođenja i izgled zaslona tijekom unosa su pretpostavka simulatora. Na pravom robotu: radni prostor slobodan, EMG STOP na dohvat ruke, prve probe malom brzinom.',
  naredbe: ['NT', 'HE', 'MO', 'PC', 'IP', 'DP']
};
GRAD['privjesak-rad'] = function (ui, ctx) {
  const dum = novaJedinica(), S0 = dum.stanje, PV = D.PRIVJESAK;
  dum.ukljuci();
  const st = { demo: null, jogano: false, mov: false, nakonSpremanja: false, emg: false };
  const svg = ui.svg(600, 300, 'Robot u bočnom pogledu i tlocrtu dok se vodi privjeskom; oznake spremljenih točaka');
  const rb = robotBocno(svg, { ox: 170, oy: 285, k: 420 });
  const ro = robotOdozgo(svg, { ox: 470, oy: 170, k: 210, rGr: 0.6 });
  S('line', { x1: 360, y1: 8, x2: 360, y2: 292, class: 'trv-mreza' }, svg);
  T(svg, 10, 20, 'bočno', 'trv-ls'); T(svg, 370, 20, 'tlocrt', 'trv-ls');
  const gT = S('g', {}, svg);
  // privjesak (HTML)
  const tb = H('div', { class: 'trv-tb', role: 'group', 'aria-label': 'Privjesak RV-M1 Teaching Box' });
  const zaslon = H('div', { class: 'trv-tb-zaslon', 'aria-live': 'polite', 'aria-label': 'Zaslon privjeska' });
  const onoff = H('button', { type: 'button', class: 'trv-tb-onoff', 'aria-pressed': 'false', tekst: 'OFF' });
  const emg = H('button', { type: 'button', class: 'trv-tb-emg', 'aria-pressed': 'false', 'aria-label': 'EMG STOP na privjesku', tekst: 'EMG STOP' });
  const nac = H('span', { class: 'trv-tb-nacin' });
  tb.append(H('div', { class: 'trv-tb-gore' }, onoff, nac, emg), zaslon);
  const mreza = H('div', { class: 'trv-tb-tipke' });
  const tipke = {};
  for (const t of [...PV.tipke].sort((a, b) => a.red - b.red || a.stupac - b.stupac)) {
    const b = H('button', { type: 'button', class: 'trv-tb-t trv-tb-' + t.boja, 'aria-label': t.natpis + (t.opis ? ': ' + t.opis : ''), title: t.opis || t.natpis, style: `grid-row:${t.red};grid-column:${t.stupac}` });
    b.textContent = t.natpis;
    drzi(ctx, b, v => { dum.privjesak.tipka(t.id, v); if (v) zabiljeziTipku(t.id); osvjezi(); ctx.budi(); });
    mreza.append(b); tipke[t.id] = b;
  }
  tb.append(mreza);
  ui.scena.append(tb);
  ctx.on(onoff, 'click', () => { dum.privjesak.ukljuci(!S0.privjesakON); osvjezi(); });
  ctx.on(emg, 'click', () => { st.emg = !st.emg; dum.privjesak.tipka('EMG', st.emg); osvjezi(); ctx.budi(); });
  const kor = ui.koraci(['Privjesak ON', 'NST, ENT — NEST', 'Vođenje: drži tipku gibanja (npr. XYZ, pa Z−)', 'P.S, 1 (+OPTION), ENT — spremi točku 1', 'Odvezi robot drugamo', 'MOV, 1, ENT — provjeri točku']);
  const o = ui.ocit([['z', 'Zaslon'], ['n', 'Način · NEST'], ['wh', 'Položaj (WH)'], ['poz', 'Spremljene pozicije']]);
  function zabiljeziTipku(id) {
    if (/^[XYZPR][+-]$/.test(id) && S0.nestGotov) { st.jogano = true; if (S0.pozicije.size) st.nakonSpremanja = true; }
  }
  dum.na('gibanje', e => { if (e && e.faza === 'kraj' && /^MOV/.test(e.naredba || '')) st.mov = true; });
  function osvjezi() {
    const q = S0.q;
    rb.postavi(q, S0.tl, S0.prihvatnica.otvorenost); ro.postavi(q, S0.tl);
    gT.replaceChildren();
    for (const [n, t] of S0.pozicije) {
      const T1 = KIN.izTocke(t), r = Math.hypot(T1.x, T1.y), a = Math.atan2(T1.y, T1.x), a1 = znakJ1() * q[0];
      const rr = r * Math.cos(a - a1);
      const [x, y] = [rb.X(rr), rb.Y(T1.z)];
      S('circle', { cx: f1(x), cy: f1(y), r: 6, class: 'trv-tocka-p trv-tocka-p-on' }, gT); T(gT, x + 9, y - 6, String(n), 'trv-lb');
      const [tx, ty] = [ro.sx(T1.x, T1.y), ro.sy(T1.x, T1.y)];
      S('circle', { cx: f1(tx), cy: f1(ty), r: 5, class: 'trv-tocka-p trv-tocka-p-on' }, gT); T(gT, tx + 8, ty - 5, String(n), 'trv-ls');
    }
    const z = dum.privjesak.zaslon();
    zaslon.textContent = z.replace(/ /g, ' ');
    zaslon.setAttribute('aria-label', 'Zaslon privjeska: ' + (z.trim() || 'prazan'));
    onoff.textContent = S0.privjesakON ? 'ON' : 'OFF'; onoff.setAttribute('aria-pressed', String(S0.privjesakON));
    emg.setAttribute('aria-pressed', String(st.emg)); razred(emg, 'trv-tb-emg-dolje', st.emg);
    tekst(nac, S0.privjesakON ? dum.privjesak.nacin : '');
    razred(tb, 'trv-tb-off', !S0.privjesakON);
    for (const id of ['PTP', 'XYZ', 'TOOL']) razred(tipke[id], 'trv-tb-akt', S0.privjesakON && dum.privjesak.nacin === id);
    const vodi = dum.privjesak.vodi; for (const id in tipke) if (/^[XYZPR][+-]$/.test(id)) razred(tipke[id], 'trv-tb-vodi', vodi.includes(id));
    o.z(`„${z}”`);
    o.n(`${dum.privjesak.nacin} · ${S0.nestGotov ? 'NEST napravljen' : 'NEST potreban'}`, S0.nestGotov ? 'ok' : 'upoz');
    o.wh(zapisWH(KIN.uTocku(q, S0.tl)));
    o.poz(S0.pozicije.size ? [...S0.pozicije].map(([n, t]) => `${n}: ${zapisWH(t)}`).join(' | ') : 'nema');
    const k = !S0.privjesakON ? 0 : !S0.nestGotov ? 1 : !st.jogano && !S0.pozicije.size ? 2 : !S0.pozicije.size ? 3 : !st.nakonSpremanja && !st.mov ? 4 : !st.mov ? 5 : 6;
    kor.postavi(k);
    if (S0.greska.tip === 1) ui.stanje(`Pogreška I. vrste (${S0.greska.led}): ${S0.greska.poruka}. Otpusti EMG STOP, isključi i uključi DUM1, pa NEST.`, 'opas');
    else if (S0.greska.tip === 2) ui.stanje(`Pogreška II. vrste: ${S0.greska.poruka}.`, 'opas');
    else if (!S0.privjesakON) ui.stanje('Privjesak je OFF: tipke ne djeluju. Prebaci preklopnik na ON.');
    else if (dum.zauzet()) ui.stanje('Robot se giba (EXECUTE svijetli)…', 'plavo');
    else if (k === 6) ui.stanje('Točka 1 je naučena i provjerena: MOV 1 doveo je robot točno u spremljeni položaj.', 'ok');
    else ui.stanje(kor.stavke[Math.min(k, 5)].textContent + '.', 'plavo');
  }
  // demonstracija: niz tipki s čekanjem
  function demo() {
    const D0 = [];
    const t = (id, ms = 160) => D0.push({ id, ms });
    const drz = (id, ms) => D0.push({ id, drzi: ms });
    const cekaj = () => D0.push({ cekaj: true });
    if (st.emg) { st.emg = false; dum.privjesak.tipka('EMG', false); }
    if (S0.greska.tip) { dum.iskljuci(); dum.ukljuci(); }
    if (!S0.privjesakON) D0.push({ on: true });
    if (!S0.nestGotov) { t('NST'); t('ENT'); cekaj(); }
    t('XYZ'); drz('Z-', 1400); drz('X+', 900); t('C', 400);
    t('P.S'); t('OPT+'); t('ENT', 500);
    t('PTP'); drz('X-', 1100); drz('Y-', 600); t('O', 400);
    t('MOV'); t('OPT+'); t('ENT'); cekaj();
    st.demo = { niz: D0, i: 0, t: 0, faza: 0 };
    ctx.budi();
  }
  function demoKorak(dt) {
    const d = st.demo; if (!d) return false;
    const a = d.niz[d.i];
    if (!a) { st.demo = null; return false; }
    d.t += dt * 1000;
    if (a.on) { dum.privjesak.ukljuci(true); d.i++; d.t = 0; return true; }
    if (a.cekaj) { if (!dum.zauzet() && d.t > 300) { d.i++; d.t = 0; } return true; }
    if (a.drzi) {
      if (d.faza === 0) { dum.privjesak.tipka(a.id, true); zabiljeziTipku(a.id); razred(tipke[a.id], 'trv-drzi', true); d.faza = 1; }
      if (d.t >= a.drzi) { dum.privjesak.tipka(a.id, false); razred(tipke[a.id], 'trv-drzi', false); d.faza = 0; d.i++; d.t = 0; }
      return true;
    }
    if (d.faza === 0) { dum.privjesak.tipka(a.id, true); zabiljeziTipku(a.id); razred(tipke[a.id], 'trv-drzi', true); d.faza = 1; }
    if (d.t >= a.ms) { dum.privjesak.tipka(a.id, false); razred(tipke[a.id], 'trv-drzi', false); d.faza = 0; d.i++; d.t = 0; }
    return true;
  }
  ctx.petlja(dt => {
    const dm = demoKorak(dt);
    dum.azuriraj(dt);
    osvjezi();
    return dm || dum.zauzet() || dum.privjesak.vodi.length > 0;
  });
  const r = ui.red();
  ui.gumb('Demonstracija', () => demo(), { u: r });
  ui.gumb('Isključi i uključi DUM1', () => { st.demo = null; dum.iskljuci(); dum.ukljuci(); st.jogano = false; st.mov = false; st.nakonSpremanja = false; osvjezi(); }, { tanki: true, u: r });
  ui.sitno(`Brojke na tipkama: ${PV.tipke.filter(t => t.brojka != null).sort((a, b) => a.brojka - b.brojka).map(t => t.brojka + ' = ' + t.natpis.split(' / ')[0]).join(', ')}.`);
  osvjezi();
};


/* =========================================================== izvoz: popis tema i prikaz */
export const TEME = D.TEME_POPIS.filter(t => TXT[t.id] && GRAD[t.id]).map(t => ({ id: t.id, naslov: t.naslov, kratko: TXT[t.id].kratko }));
for (const t of TEME) Object.defineProperty(TEME, t.id, { value: t, enumerable: false });

export function prikazi(el, id) {
  if (!el) throw new Error('teme_rvm1: nedostaje element');
  if (!GRAD[id] || !TXT[id]) {
    el.replaceChildren(H('p', { class: 'trv-stanje trv-upoz', tekst: 'Tema „' + id + '” ne postoji.' }));
    return { unisti() { el.replaceChildren(); } };
  }
  const ctx = new Kontekst(el);
  let sek = null;
  try {
    const ui = okvir(el, id, ctx);
    sek = ui.sek;
    GRAD[id](ui, ctx);
  } catch (e) {
    ctx.unisti();
    throw e;
  }
  let gotovo = false;
  return {
    unisti() {
      if (gotovo) return;
      gotovo = true;
      ctx.unisti();
      if (sek && sek.parentNode === el) el.removeChild(sek);
    }
  };
}
