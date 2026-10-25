// teme2dT.js — 11 interaktivnih 2D tema za stranicu „Upoznavanje stroja”
// (DOS ForTroniQ, područje CNC tokarenje — SINUMERIK 840D). ES modul bez ovisnosti.
// Izvozi: TEME (naslovi, engleski izvorni nazivi, tekstovi) i prikazi(el, id) → { unisti() }.
// Tekst i grafika su vlastiti; brojevi označeni kao primjer su naše pretpostavke.
// Teme kuglicno, mjerni, regulacija, plc i napajanje iste su kao za glodalicu (teme2d.js), s tekstom prilagođenim tokarilici.

/* =========================================================== tekstovi */
export const TEME = {
  izvedbeT: {
    naslov: 'Izvedbe tokarilica: ravna i kosa postelja',
    engl: 'Design principle: flat bed and inclined bed',
    uvod: [
      'Kod tokarilice s ravnom posteljom vodilice su vodoravne, a alat dolazi s prednje strane, od korisnika. Strugotina pada ravno na saonice i vodilice i ondje se gomila.',
      'Kod kose postelje vodilice su nagnute (ovdje 45°), a revolver s alatima je iza i iznad osi vretena. Strugotina slobodno pada i klizi niz kosinu u korito transportera, korisnik je bliže steznoj glavi, a postelja je kruća jer sile rezanja idu u njezino tijelo.',
      'Na tokarilici X je promjer: X0 je na osi vretena, X60 znači da je vrh alata 30 mm od osi. Nultočka obratka W obično je na čelu obratka, pa su sve točke na obratku u negativnom Z.'
    ],
    kako: 'Odaberi izvedbu i pritisni „Strugotina” — pogledaj kamo pada. Tipkama ±X i ±Z gibaj alat: lijevo se vidi u kojem se smjeru giba na stroju, a desno gdje je vrh alata u odnosu na nultočku W. Pomak za 5 mm u X mijenja promjer za 5 mm, a udaljenost od osi samo za 2,5 mm.'
  },
  kuglicno: {
    naslov: 'Kuglično navojno vreteno',
    engl: 'Ball screw drive',
    uvod: [
      'Kuglično navojno vreteno pretvara vrtnju servomotora u pravocrtno gibanje saonica. Između vretena i matice kotrljaju se kuglice; na kraju matice ulaze u povratni kanal i vraćaju se na početak, pa kruže bez kraja.',
      'Na ovoj tokarilici vretenom se giba os Z (uzdužne saonice). Dvije matice međusobno su prednapregnute, pa pogon nema zračnosti ni pri promjeni smjera.'
    ],
    kako: 'Klizačem zadaj brzinu vrtnje. Matica se za svaki okretaj pomakne za jedan uspon P, pa je brzina posmaka v = n · P. S jednom maticom bez prednapona vidjet ćeš izgubljeni hod pri svakoj promjeni smjera; s dvije prednapregnute matice zadani i stvarni položaj se poklapaju.'
  },
  mjerni: {
    naslov: 'Izravni mjerni sustav — načelo prosvjetljavanja',
    engl: 'Direct measuring system',
    uvod: [
      'Kondenzor svjetlo iz LED-a usmjeri u paralelan snop. Snop prolazi kroz ploču za očitavanje i staklenu mjernu letvu s gustom rešetkom te pada na fotoelemente.',
      'Kad se letva pomakne, prozirne i neprozirne crtice naizmjence propuštaju i zaklanjaju svjetlo. Svaki korak daje jedan impuls (da/ne), a elektronika impulse broji i pretvara u položaj.',
      'Na ovoj tokarilici obje osi imaju izravni mjerni sustav: staklena mjerna letva pričvršćena je uz vodilicu, a glava za očitavanje giba se sa saonicama. Mjeri se stvarni položaj saonica, pa zračnost i toplinsko istezanje pogona ne ulaze u mjerenje.'
    ],
    kako: 'Pomakni letvu klizačem ili tipkama. Dva prozora na ploči za očitavanje pomaknuta su za četvrtinu periode, pa signal B kasni za signalom A. Iz toga elektronika zna smjer gibanja i broji četiri brida po periodi. Rešetka je jako uvećana; razdioba stvarne letve je nekoliko mikrometara.'
  },
  linearni: {
    naslov: 'Linearni motor',
    engl: 'Linear motor',
    uvod: [
      'Linearni motor je „razmotani” elektromotor: primarni dio s namotima pričvršćen je na saonice, a sekundarni dio — niz trajnih magneta — leži na nepomičnom dijelu stroja. Struja kroz namote stvara magnetsko polje koje putuje uzduž magneta i vuče saonice za sobom.',
      'Nema vretena, matice ni spojke, pa nema ni zračnosti i trošenja u prijenosu. Linearni motor postiže znatno veće ubrzanje i brzinu od pogona s kugličnim vretenom, pa su pomoćna vremena kraća. Zato stroj mora biti krući: iste sile kojima motor ubrzava saonice djeluju natrag na postelju.'
    ],
    kako: 'Pritisni „Pozicioniraj 300 mm”: oba pogona istodobno kreću s istim saonicama. Vrijednosti ubrzanja i brzine su primjer (linearni motor 20 m/s² i 120 m/min, kuglično vreteno 4 m/s² i 40 m/min), a gibanje je usporeno 6 puta. Klizačem promijeni masu saonica i pogledaj kako raste sila na postelju F = m · a.'
  },
  stezniPut: {
    naslov: 'Šuplji stezni cilindar — nadzor steznog puta',
    engl: 'Open centre clamping cylinder / clamping path monitoring',
    uvod: [
      'Hidraulički stezni cilindar na stražnjem kraju vretena vuče vučnu cijev, a ona preko klinova zatvara čeljusti stezne glave. Cilindar je šupalj (otvoreno središte), pa kroz vreteno može proći dugačka šipka.',
      'Na klipnjači je prsten za uključivanje, a uz njega dva osjetnika koji omeđuju dopušteni stezni put. Kad je obradak ispravno stegnut, klip stane između njih i PLC dopušta vrtnju vretena. Ako klip stane prerano ili ode predaleko (nema obratka, obradak je premalen), vreteno se ne smije pokrenuti.'
    ],
    kako: 'Odaberi obradak i pritisni „Stegni” (to radi nožna sklopka za steznu glavu). Klip se giba dok čeljusti ne dodirnu obradak. Klizačima pomakni osjetnike S1 i S2 — tako se podešava stezni put za novi promjer obratka. Mjere su primjer: hod klipa 30 mm, čeljust se primiče 0,5 mm po milimetru hoda klipa.'
  },
  tlakStezanja: {
    naslov: 'Tlak stezanja i sila stezanja',
    engl: 'Clamping pressure',
    uvod: [
      'Sila kojom čeljusti drže obradak razmjerna je tlaku u steznom cilindru. Puni obradak podnosi veliku silu, ali tankostijena cijev pod tri čeljusti postaje trokutasta. Tokariš je okruglu, a kad je otpustiš, opruži natrag — i tokareni promjer više nije okrugao.',
      'Tlak se ne smije samo smanjiti: tlačna sklopka dopušta vrtnju vretena tek iznad najmanjeg tlaka potrebnog za sigurno stezanje. Rješenje je drugo stezno sredstvo — njihajuće čeljusti ili stezna čahura raspodijele istu silu na više mjesta.'
    ],
    kako: 'Odaberi obradak i stezno sredstvo, namjesti tlak i pritisni „Stegni i pokreni vreteno”. Vrijednosti su primjer: sila stezanja 3 kN po baru, tlačna sklopka 25 bar, dopuštena deformacija 0,02 mm. Deformacija je na crtežu jako uvećana.'
  },
  g54mksT: {
    naslov: 'Nultočka stroja i pomak nultočke (G54)',
    engl: 'Machine zero point / zero point displacement',
    uvod: [
      'Nultočku stroja M odredio je proizvođač i ona se ne mijenja — na ovoj tokarilici leži na osi vretena, na čelu prirubnice vretena. Program pišeš od nultočke obratka W na čelu obratka, a upravljanje programiranim koordinatama dodaje pomak nultočke iz tablice (ovdje G54).',
      'Na tokarilici je W uvijek na osi vretena, pa je pomak G54 u X jednak nuli; mijenja se samo Z. Ako je u tablici kriv pomak, i ispravan program vodi alat na krivo mjesto.'
    ],
    kako: 'Odaberi vrijednosti u tablici G54 (ili upiši svoje) i pokreni program. Stvarni položaj vrha alata = pomak G54 + koordinata iz programa (uz korekcije alata). Hod je prikazan ubrzano.'
  },
  g54wksT: {
    naslov: 'Nultočka obratka, G54 i korekcije alata',
    engl: 'Workpiece zero point / zero point displacement',
    uvod: [
      'Nultočku obratka W biraš tako da kote s crteža možeš izravno upisivati u program — na tokarilici je to točka na osi, na završnom čelu obratka.',
      'Obrada je ispravna tek kad su ispravni i program, i pomak nultočke, i podaci alata: Length1 (L1) je udaljenost vrha alata od referentne točke revolvera F u smjeru X, a Length2 (L2) u smjeru Z.'
    ],
    kako: 'Promijeni pomak G54 ili korekciju alata i pokreni program. Ako je L2 upisan premalen, upravljanje misli da je vrh alata bliže konjiću nego što stvarno jest — G0 Z2 tada završi u obratku. Kriv L1 ne izaziva sudar, ali promjer izađe kriv i obradak je škart.'
  },
  regulacija: {
    naslov: 'Regulacijski krug osi',
    engl: 'Control with drive module',
    uvod: [
      'Upravljanje čita NC blokove, tumači ih i interpolacijom u svakom taktu računa zadani položaj svake osi. Te vrijednosti idu modulu osi koji napaja motor.',
      'Mjerni sustav (na ovoj tokarilici staklena mjerna letva) stalno javlja stvarni položaj, a regulator ga uspoređuje sa zadanim. Razlika je slijedna pogreška i iz nje nastaje nova naredba za brzinu.'
    ],
    kako: 'Pritisni „Cycle Start” i prati tok signala kroz krug. Na grafu su zadani (crtkano) i stvarni položaj osi Z. Stvarni zaostaje za zadanim približno za v / Kv; veći Kv smanjuje zaostajanje, a prevelik izaziva nadvišenje. Model je pojednostavljen, vrijednosti su primjer.'
  },
  plc: {
    naslov: 'PLC — uvjeti za pokretanje stroja',
    engl: 'PLC (Programmable Logic Controllers)',
    uvod: [
      'PLC stalno očitava ulaze i prema programu postavlja izlaze. Stroj smije krenuti samo kad su vrata zatvorena, gljiva za nužno zaustavljanje otpuštena i saonice nisu na graničnom prekidaču. Na tokarilici PLC uz to provjerava i je li obradak stegnut unutar steznog puta.',
      'Ti uvjeti povezani su I-vezom (AND): izlaz je 1 samo kad su svi ulazi 1.'
    ],
    kako: 'Mijenjaj stanje vrata, gljive i saonica i prati signal kroz I-vrata ili kroz ljestvičasti prikaz (LAD). Premošćenje sigurnosne sklopke prikazano je samo da vidiš zašto je zabranjeno: PLC tada „vidi” zatvorena vrata iako su otvorena. Na stvarnom stroju to je opasno po život.'
  },
  napajanje: {
    naslov: 'Napojni modul — napajanje elektronike',
    engl: 'Supply module with voltage supply',
    uvod: [
      'Mrežni napon ne može se izravno dovesti elektronici upravljanja. Najprije se filtrira, zatim transformira na niži napon, ispravlja iz izmjeničnog u istosmjerni, izglađuje i na kraju regulira na stalnu vrijednost.'
    ],
    kako: 'Uključi glavnu sklopku i biraj mjerne točke MP0–MP5 (na shemi ili tipkama). Osciloskop pokazuje napon na odabranoj točki. Vrijednosti su primjer: mreža 400 V / 50 Hz, transformator na 28 V, izlaz 24 V DC.'
  }
};

/* =========================================================== osnovni alati */
const NS = 'http://www.w3.org/2000/svg';
const B = { crv: '#d64535', zel: '#1f9d55', nar: '#e08a1e', pl: '#3d8bd9', ulje: '#c9962b', zut: '#f2c230' };
let brojac = 0;

function S(tag, a, rod) {
  const e = document.createElementNS(NS, tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v;
    else if (typeof v === 'string' && v.startsWith('var(')) e.style.setProperty(k, v);
    else e.setAttribute(k, v);
  }
  if (rod) rod.appendChild(e);
  return e;
}
function H(tag, a, ...djeca) {
  const e = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const d of djeca) if (d != null) e.append(d);
  return e;
}
function T(g, x, y, txt, kl, anchor) {
  return S('text', { x, y, class: kl || 't2d-l', 'text-anchor': anchor || null, tekst: txt }, g);
}
const ogr = (v, a, b) => Math.max(a, Math.min(b, v));
const lin = (a, b, t) => a + (b - a) * t;
const hr = (n, d = 1) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d).replace('.', ',').replace('-', '−');
const nc = (n, d = 3) => (Math.abs(n) < 0.0005 ? 0 : n).toFixed(d);
const pribl = (a, b, k) => { const r = b - a; return Math.abs(r) <= k ? b : a + Math.sign(r) * k; };
function glatko(a, b, x) { const t = ogr((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

// strelica (linija + glava) koja se može naknadno pomicati: g.set(x1,y1,x2,y2)
function strel(g, x1, y1, x2, y2, o = {}) {
  const boja = o.boja || 'var(--ink)', w = o.w || 2.5, gl = o.gl || 11;
  const gr = S('g', { class: o.kl || null }, g);
  const ln = S('line', { stroke: boja, 'stroke-width': w, 'stroke-linecap': 'round' }, gr);
  const pg = S('polygon', { fill: boja }, gr);
  gr.set = (a, b, c, d) => {
    const dx = c - a, dy = d - b, L = Math.hypot(dx, dy);
    if (L < 1) { gr.style.display = 'none'; return; }
    gr.style.display = '';
    const ux = dx / L, uy = dy / L, g2 = Math.min(gl, L * 0.7);
    const bx = c - ux * g2, by = d - uy * g2;
    ln.setAttribute('x1', a.toFixed(1)); ln.setAttribute('y1', b.toFixed(1));
    ln.setAttribute('x2', bx.toFixed(1)); ln.setAttribute('y2', by.toFixed(1));
    pg.setAttribute('points', `${c.toFixed(1)},${d.toFixed(1)} ${(bx - uy * g2 * 0.55).toFixed(1)},${(by + ux * g2 * 0.55).toFixed(1)} ${(bx + uy * g2 * 0.55).toFixed(1)},${(by - ux * g2 * 0.55).toFixed(1)}`);
  };
  gr.set(x1, y1, x2, y2);
  return gr;
}
function opruga(x1, y1, x2, y2, n, a) { // cik-cak opruga kao niz točaka
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const pts = [[x1, y1]];
  const k0 = 0.08, k1 = 0.92;
  pts.push([x1 + dx * k0, y1 + dy * k0]);
  for (let i = 0; i < n; i++) {
    const t = k0 + (k1 - k0) * (i + 0.5) / n, s = i % 2 ? -a : a;
    pts.push([x1 + dx * t - uy * s, y1 + dy * t + ux * s]);
  }
  pts.push([x1 + dx * k1, y1 + dy * k1], [x2, y2]);
  return pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
}
function sporo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

/* ------------------------------------------------------- petlja i čišćenje */
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
    if (this.rm) { this.tip = 't'; this.id = setTimeout(() => this._okvir(performance.now()), 280); }
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
    const dt = this.zadnje ? Math.min((t - this.zadnje) / 1000, this.rm ? 0.4 : 0.06) : (this.rm ? 0.28 : 1 / 60);
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

/* ------------------------------------------------------- okvir jedne teme */
function okvir(el, id, ctx) {
  const T0 = TEME[id];
  const uid = 't2d' + (++brojac);
  let nk = 0;
  const sek = H('section', { class: 't2d', 'data-tema': id, 'aria-label': T0.naslov });
  const naslov = H('h3', { class: 't2d-naslov' }, T0.naslov + ' ', H('span', { class: 't2d-engl', tekst: '(' + T0.engl + ')' }));
  const uvod = H('div', { class: 't2d-uvod' });
  for (const p of T0.uvod) uvod.append(H('p', { tekst: p }));
  const scena = H('div', { class: 't2d-scena' });
  const upr = H('div', { class: 't2d-upr', role: 'group', 'aria-label': 'Upravljanje animacijom' });
  const ocitP = H('div', { class: 't2d-ocit' });
  const stanjeP = H('p', { class: 't2d-stanje', 'aria-live': 'polite' });
  const kako = H('div', { class: 't2d-kako' }, H('h4', { tekst: 'Kako radi' }), H('p', { tekst: T0.kako }));
  const desno = H('div', { class: 't2d-desno' }, upr, stanjeP, ocitP, kako);
  sek.append(naslov, uvod, H('div', { class: 't2d-tijelo' }, scena, desno));
  el.replaceChildren(sek);

  const ui = {
    uid, sek, scena, upr, ocitP,
    svg(w, h, opis) {
      const s = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opis, class: 't2d-svg', focusable: 'false' });
      const defs = S('defs', {}, s);
      const p = S('pattern', { id: uid + '-sr', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      S('rect', { width: 7, height: 7, class: 't2d-srafura-p' }, p);
      S('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 't2d-srafura-c' }, p);
      s.defs = defs; s.srafura = `url(#${uid}-sr)`;
      scena.append(s);
      return s;
    },
    red(kl) { const r = H('div', { class: 't2d-red' + (kl ? ' ' + kl : '') }); upr.append(r); return r; },
    // poziva fn(true/false) kad scena postane uža/šira od praga (drugačiji raspored crteža na mobitelu)
    uski(fn, prag = 520) {
      let zadnje = null;
      const pr = () => { const w = scena.clientWidth; if (!w) return; const u = w < prag; if (u !== zadnje) { zadnje = u; fn(u); } };
      pr();
      if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(pr); ro.observe(scena); ctx.ciscenje.push(() => ro.disconnect()); }
      return () => zadnje;
    },
    gumb(tekst, fn, o = {}) {
      const b = H('button', {
        type: 'button', class: 'gumb' + (o.tanki ? ' tanki' : '') + ' t2d-g' + (o.kl ? ' ' + o.kl : ''),
        'aria-label': o.aria || null, 'aria-pressed': o.pritisak == null ? null : String(!!o.pritisak)
      });
      b.textContent = tekst;
      if (fn) ctx.on(b, 'click', e => fn(e, b));
      let cilj = o.u;
      if (!cilj) { cilj = upr.lastElementChild; if (!cilj || !cilj.classList.contains('t2d-red')) cilj = ui.red(); }
      cilj.append(b);
      return b;
    },
    seg(oznaka, opcije, vr, fn, u) {
      const w = H('div', { class: 't2d-seg' });
      const lab = H('span', { class: 't2d-seg-o', tekst: oznaka, id: uid + '-s' + (++nk) });
      const box = H('div', { class: 't2d-seg-b', role: 'group', 'aria-labelledby': lab.id });
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
      const w = H('div', { class: 't2d-kl' });
      const l = H('label', { for: kid, tekst: oznaka });
      const o = H('output', { for: kid });
      const i = H('input', { type: 'range', id: kid, min, max, step: korak, value: vr });
      const upd = () => { o.textContent = fmt(+i.value); };
      ctx.on(i, 'input', () => { upd(); fn(+i.value); });
      upd();
      w.append(H('div', { class: 't2d-kl-g' }, l, o), i);
      (u || upr).append(w);
      w.ulaz = i; w.osvjezi = upd;
      return w;
    },
    ocit(redovi, u) {
      const dl = H('dl', { class: 't2d-oc' });
      const set = {};
      for (const [k, t] of redovi) {
        const dd = H('dd', { tekst: '—' });
        dl.append(H('div', {}, H('dt', { tekst: t }), dd));
        set[k] = (v, kl) => { if (dd.textContent !== v) dd.textContent = v; const c = kl || ''; if (dd.className !== c) dd.className = c; };
      }
      (u || ocitP).append(dl);
      return set;
    },
    stanje(txt, vrsta) {
      if (stanjeP.textContent !== txt) stanjeP.textContent = txt;
      const c = 't2d-stanje' + (vrsta ? ' t2d-' + vrsta : '');
      if (stanjeP.className !== c) stanjeP.className = c;
    }
  };
  return ui;
}


/* =========================================================== 2. kuglično vreteno */
function tKuglicno(ui, ctx) {
  const PV = 24;            // uspon u prikazu [px] ↔ 10 mm
  const ZR = 14;            // zračnost u prikazu [px] (jako uvećano)
  const XMIN = 170, XMAX = 430;
  const st = { radi: false, n: 1200, dvije: true, smjer: 1, xc: 300, xa: 300, kan: 0, kut: 0, zadnjiSmjer: 1 };
  const svg = ui.svg(600, 340, 'Presjek kugličnog navojnog vretena s maticama, kuglicama i povratnim kanalom; ispod detalj kuglice u utoru');
  const cy = 112, R = 30;
  const clip = S('clipPath', { id: ui.uid + '-vr' }, svg.defs);
  S('rect', { x: 20, y: cy - R, width: 560, height: 2 * R }, clip);
  // vreteno
  S('rect', { x: 20, y: cy - R, width: 560, height: 2 * R, rx: 3, class: 't2d-metal' }, svg);
  const navoj = S('g', { 'clip-path': `url(#${ui.uid}-vr)` }, svg);
  const navG = S('g', {}, navoj);
  for (let k = -2; k < 27; k++) {
    const x = 20 + k * PV;
    S('line', { x1: x, y1: cy - R, x2: x + PV / 2, y2: cy + R, class: 't2d-zavoj' }, navG);
    S('circle', { cx: x, cy: cy - R, r: 7, class: 't2d-utor' }, navG);
    S('circle', { cx: x + PV / 2, cy: cy + R, r: 7, class: 't2d-utor' }, navG);
  }
  S('line', { x1: 20, y1: cy, x2: 580, y2: cy, class: 't2d-os-crta' }, svg);
  T(svg, 22, cy + R + 22, 'vreteno (vrti se)', 't2d-ls');
  // motor (lijevo)
  S('rect', { x: 0, y: cy - 22, width: 20, height: 44, class: 't2d-tamno' }, svg);
  const strelV = S('g', {}, svg);
  const matG = S('g', {}, svg);
  const kugG = S('g', {}, svg);
  const kanG = S('g', {}, svg);
  let matice = [];
  const kugle = [];
  for (let i = 0; i < 40; i++) {
    const g = S('g', { class: 't2d-kugla' }, kugG);
    S('circle', { r: 7 }, g);
    S('line', { x1: -5, y1: 0, x2: 5, y2: 0 }, g);
    kugle.push(g);
  }
  function crtajMatice() {
    matG.replaceChildren(); kanG.replaceChildren(); matice = [];
    const dijelovi = st.dvije ? [[-100, -7], [7, 100]] : [[-78, 78]];
    for (const [a, b] of dijelovi) {
      const g = S('g', {}, matG);
      S('rect', { x: a, y: cy - R - 28, width: b - a, height: 26, class: 't2d-presjek', fill: svg.srafura }, g);
      S('rect', { x: a, y: cy + R + 2, width: b - a, height: 26, class: 't2d-presjek', fill: svg.srafura }, g);
      const kg = S('g', {}, kanG);
      const put = S('path', { d: `M${a + 10},${cy - R - 6} C${a + 10},${cy - R - 56} ${b - 10},${cy - R - 56} ${b - 10},${cy - R - 6}`, class: 't2d-kanal' }, kg);
      const kk = [];
      for (let i = 0; i < 6; i++) kk.push(S('circle', { r: 6, class: 't2d-kugla-k' }, kg));
      matice.push({ a, b, g, kg, put, kk, L: 0 });
    }
    if (st.dvije) {
      const g = S('g', {}, matG);
      S('rect', { x: -7, y: cy - R - 24, width: 14, height: 18, class: 't2d-odstojnik' }, g);
      S('rect', { x: -7, y: cy + R + 6, width: 14, height: 18, class: 't2d-odstojnik' }, g);
      strel(g, -18, cy + R + 44, -70, cy + R + 44, { boja: B.nar, w: 3, gl: 10 });
      strel(g, 18, cy + R + 44, 70, cy + R + 44, { boja: B.nar, w: 3, gl: 10 });
      T(g, 0, cy + R + 66, 'prednapon (odstojni prsten)', 't2d-ls', 'middle');
    } else {
      T(matG, 0, cy + R + 50, 'jedna matica bez prednapona', 't2d-ls', 'middle');
    }
    for (const m of matice) { try { m.L = m.put.getTotalLength(); } catch (e) { m.L = 0; } }
  }
  // detalj
  const det = S('g', {}, svg);
  T(det, 300, 234, 'Detalj: kuglica u utoru (uvećano)', 't2d-l', 'middle');
  const detG = S('g', {}, det);
  function crtajDetalj() {
    detG.replaceChildren();
    const parovi = st.dvije ? [[110, 'matica A'], [400, 'matica B']] : [[250, 'matica']];
    const d = [];
    for (const [x0, nat] of parovi) {
      const g = S('g', {}, detG);
      S('path', { d: `M${x0 - 80},300 L${x0 - 24},300 A24,24 0 0 0 ${x0 + 24},300 L${x0 + 80},300 L${x0 + 80},322 L${x0 - 80},322 Z`, class: 't2d-metal' }, g);
      const nut = S('g', {}, g);
      S('path', { d: `M${x0 - 80},264 L${x0 - 24},264 A24,24 0 0 1 ${x0 + 24},264 L${x0 + 80},264 L${x0 + 80},244 L${x0 - 80},244 Z`, class: 't2d-presjek', fill: svg.srafura }, nut);
      const kug = S('circle', { cx: x0, cy: 282, r: 19, class: 't2d-kugla-d' }, g);
      const k1 = S('circle', { r: 3.5, fill: B.crv }, g), k2 = S('circle', { r: 3.5, fill: B.crv }, g);
      const zr = S('text', { x: x0, y: 340, class: 't2d-ls', 'text-anchor': 'middle' }, g);
      T(g, x0 + 86, 258, nat, 't2d-ls');
      T(g, x0 + 86, 316, 'vreteno', 't2d-ls');
      d.push({ x0, nut, kug, k1, k2, zr });
    }
    detG.d = d;
  }
  function osvjeziDetalj() {
    const g = 5; // pomak u detalju
    const d = detG.d;
    const kont = (e, x0, dx, strana) => { // dodir kuglice s bokovima
      const bx = x0 + dx / 2;
      e.kug.setAttribute('cx', bx.toFixed(1));
      const a = 0.78;
      e.k1.setAttribute('cx', (bx + strana * 19 * Math.sin(a)).toFixed(1)); e.k1.setAttribute('cy', (282 + 19 * Math.cos(a)).toFixed(1));
      e.k2.setAttribute('cx', (bx - strana * 19 * Math.sin(a)).toFixed(1)); e.k2.setAttribute('cy', (282 - 19 * Math.cos(a)).toFixed(1));
    };
    if (st.dvije) {
      d[0].nut.setAttribute('transform', `translate(${-g} 0)`); kont(d[0], d[0].x0, -g, -1); d[0].zr.textContent = 'naliježe lijevo';
      d[1].nut.setAttribute('transform', `translate(${g} 0)`); kont(d[1], d[1].x0, g, 1); d[1].zr.textContent = 'naliježe desno';
    } else {
      const u = (st.xa - st.xc) / (ZR / 2);  // −1 … 1
      const dx = u * g * 2;
      d[0].nut.setAttribute('transform', `translate(${dx.toFixed(1)} 0)`);
      kont(d[0], d[0].x0, dx, Math.sign(u) || 1);
      d[0].zr.textContent = Math.abs(u) > 0.98 ? 'zračnost na suprotnoj strani' : 'kuglica prelazi zračnost — matica stoji';
      d[0].zr.style.fill = Math.abs(u) > 0.98 ? '' : B.crv;
    }
  }
  function osvjezi() {
    const ph = ((st.xc % PV) + PV) % PV;
    navG.setAttribute('transform', `translate(${ph.toFixed(2)} 0)`);
    matG.setAttribute('transform', `translate(${st.xa.toFixed(2)} 0)`);
    kanG.setAttribute('transform', `translate(${st.xa.toFixed(2)} 0)`);
    // kuglice u utorima
    let i = 0;
    for (const m of matice) {
      const a = st.xa + m.a + 9, b = st.xa + m.b - 9;
      for (const [y, off] of [[cy - R, 0], [cy + R, PV / 2]]) {
        for (let k = -2; k < 27; k++) {
          const x = 20 + k * PV + ph + off;
          if (x < a || x > b || i >= kugle.length) continue;
          const g = kugle[i++];
          g.style.display = '';
          g.setAttribute('transform', `translate(${x.toFixed(1)} ${y}) rotate(${(st.kut * 2).toFixed(0)})`);
        }
      }
      // kanal
      if (m.L) {
        m.kk.forEach((c, j) => {
          let u = ((st.kan + j / m.kk.length) % 1 + 1) % 1;
          if (st.zadnjiSmjer < 0) u = 1 - u;
          const p = m.put.getPointAtLength(u * m.L);
          c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
        });
      }
    }
    for (; i < kugle.length; i++) kugle[i].style.display = 'none';
    strelV.replaceChildren();
    if (st.radi && st.n > 0) {
      const s = st.smjer;
      strel(strelV, 300 - s * 40, 30, 300 + s * 40, 30, { boja: 'var(--teal)', w: 3, gl: 11 });
      T(strelV, 300, 18, s > 0 ? 'matica se giba udesno' : 'matica se giba ulijevo', 't2d-ls', 'middle');
    }
    osvjeziDetalj();
    const mm = v => v * 10 / PV;
    const v = st.n * 10 / 1000; // m/min
    o.n(st.n + ' o/min'); o.v(hr(v, 1) + ' m/min');
    const raz = st.dvije ? 0 : (st.xa - st.xc) / (ZR / 2) * 0.015;   // ±0,015 mm → ukupno 0,03 mm
    o.xc(hr(mm(st.xc - XMIN), 3) + ' mm');
    o.xa(hr(mm(st.xc - XMIN) + raz, 3) + ' mm');
    o.r((raz > 0 ? '+' : '') + hr(raz, 3) + ' mm', st.dvije ? 't2d-ok' : (Math.abs(st.xa - st.xc) < ZR / 2 - 0.3 ? 't2d-upoz' : ''));
  }
  ctx.petlja(dt => {
    if (!st.radi || st.n <= 0) { osvjezi(); return false; }
    const okr = st.n / 3000 * 1.4 * dt * st.smjer;   // okretaji u prikazu (usporeno)
    st.xc += okr * PV; st.kut += okr * 360;
    if (st.xc > XMAX) { st.xc = XMAX; st.smjer = -1; }
    if (st.xc < XMIN) { st.xc = XMIN; st.smjer = 1; }
    const prije = st.xa;
    if (st.dvije) st.xa = st.xc;
    else {
      const h = ZR / 2;
      if (st.xc - st.xa > h) st.xa = st.xc - h; else if (st.xc - st.xa < -h) st.xa = st.xc + h;
    }
    const dx = st.xa - prije;
    if (Math.abs(dx) > 1e-6) { st.zadnjiSmjer = Math.sign(dx); st.kan += Math.abs(dx) / 160; }
    if (!st.dvije && Math.abs(dx) < 1e-6) ui.stanje('Promjena smjera: vreteno se okreće, a matica stoji dok kuglice ne prijeđu zračnost — izgubljeni hod.', 'upoz');
    else if (st.dvije) ui.stanje('Dvije prednapregnute matice: matica slijedi vreteno bez izgubljenog hoda i pri promjeni smjera.', 'ok');
    else ui.stanje('Jedna matica: dok smjer ostaje isti, matica slijedi vreteno.');
    osvjezi();
    return true;
  });
  const bP = ui.gumb('Pokreni', (e, b) => { st.radi = !st.radi; b.textContent = st.radi ? 'Zaustavi' : 'Pokreni'; b.setAttribute('aria-pressed', String(st.radi)); ctx.budi(); }, { pritisak: false });
  ui.gumb('Promijeni smjer', () => { st.smjer *= -1; if (!st.radi) { st.radi = true; bP.textContent = 'Zaustavi'; bP.setAttribute('aria-pressed', 'true'); } ctx.budi(); }, { tanki: true, u: bP.parentNode });
  ui.klizac('Brzina vrtnje vretena n', 0, 3000, 100, st.n, v => v + ' o/min', v => { st.n = v; osvjezi(); ctx.budi(); });
  ui.seg('Matica', [[true, 'Dvije, prednapregnute'], [false, 'Jedna, bez prednapona']], st.dvije, v => { st.dvije = v; st.xa = st.dvije ? st.xc : st.xc - st.smjer * ZR / 2; crtajMatice(); crtajDetalj(); osvjezi(); ctx.budi(); });
  const o = ui.ocit([['n', 'Brzina vrtnje n'], ['v', 'Posmak v = n · P (P = 10 mm)'], ['xc', 'Zadani položaj (iz kuta vretena)'], ['xa', 'Stvarni položaj matice'], ['r', 'Stvarno − zadano (zračnost 0,03 mm, primjer)']]);
  // trenje
  const tr = H('div', { class: 't2d-trenje' });
  const traka = (txt, od, doo, vr) => H('div', { class: 't2d-tr-red' }, H('span', { tekst: txt }),
    H('div', { class: 't2d-tr-bar' }, H('i', { style: `left:${od}%;width:${doo - od}%` })), H('b', { tekst: vr }));
  tr.append(H('h4', { tekst: 'Kotrljajno prema kliznom trenju — stupanj djelovanja η' }),
    traka('Kuglično vreteno (kotrljanje)', 0, 90, '≈ 90 %'),
    traka('Trapezno vreteno (klizanje)', 0, 40, '≈ 30–50 %'),
    H('p', { class: 't2d-sitno', tekst: 'Tipične vrijednosti. Potreban moment M = F · P / (2π · η): za silu posmaka 5 kN i uspon 10 mm to je ≈ 8,8 N·m uz η = 0,9, a ≈ 19,9 N·m uz η = 0,4.' }));
  tr.querySelectorAll('.t2d-tr-bar')[1].append(H('i', { class: 't2d-raspon', style: 'left:30%;width:20%' }));
  ui.ocitP.append(tr);
  crtajMatice(); crtajDetalj(); osvjezi();
  ui.stanje('Pritisni „Pokreni”. Matica se na krajevima sama vraća.');
}

/* =========================================================== 3. mjerni sustav */
function tMjerni(ui, ctx) {
  const PER = 24, KOR = 6;           // perioda rešetke i korak brojanja u prikazu
  const st = { s: 3, auto: false, smjer: 1 };
  const svg = ui.svg(600, 440, 'Načelo prosvjetljavanja: LED, kondenzor, ploča za očitavanje, staklena mjerna letva, fotoelementi, brojilo');
  const cx = 170;
  // LED i snop
  const snop = S('g', {}, svg);
  S('polygon', { points: `${cx},50 82,94 258,94`, class: 't2d-svjetlo' }, snop);
  S('rect', { x: 82, y: 104, width: 176, height: 46, class: 't2d-svjetlo' }, snop);
  S('path', { d: `M${cx - 12},50 L${cx - 12},36 A12,12 0 0 1 ${cx + 12},36 L${cx + 12},50 Z`, fill: B.zut, stroke: 'var(--ink)', 'stroke-width': 1.5 }, svg);
  S('line', { x1: cx - 6, y1: 50, x2: cx - 6, y2: 60, stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
  S('line', { x1: cx + 6, y1: 50, x2: cx + 6, y2: 60, stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
  S('ellipse', { cx, cy: 99, rx: 92, ry: 9, class: 't2d-leca' }, svg);
  // ploča za očitavanje
  S('rect', { x: 70, y: 150, width: 200, height: 12, class: 't2d-tamno' }, svg);
  const prozori = { A: 84, B: 186 };
  for (const k in prozori) for (let i = 0; i < 3; i++) S('rect', { x: prozori[k] + i * PER, y: 150, width: 12, height: 12, class: 't2d-staklo' }, svg);
  // letva
  const pat = S('pattern', { id: ui.uid + '-res', width: PER, height: 22, patternUnits: 'userSpaceOnUse' }, svg.defs);
  S('rect', { x: 0, y: 0, width: 12, height: 22, class: 't2d-crtica' }, pat);
  S('rect', { x: 0, y: 172, width: 600, height: 22, class: 't2d-staklo' }, svg);
  S('rect', { x: 0, y: 172, width: 600, height: 22, fill: `url(#${ui.uid}-res)` }, svg);
  // prolazno svjetlo i fotoelementi
  const zr = {}, fe = {};
  for (const k in prozori) {
    zr[k] = S('rect', { x: prozori[k], y: 194, width: 60, height: 22, fill: B.zut }, svg);
    fe[k] = S('rect', { x: prozori[k], y: 216, width: 60, height: 18, stroke: 'var(--ink)', 'stroke-width': 1.5 }, svg);
    T(svg, prozori[k] + 30, 230, k, 't2d-lb', 'middle').classList.add('t2d-na-zutom');
    S('line', { x1: prozori[k] + 30, y1: 234, x2: prozori[k] + 30, y2: 256, class: 't2d-zica' }, svg);
  }
  S('rect', { x: 70, y: 256, width: 220, height: 30, rx: 6, class: 't2d-blok' }, svg);
  T(svg, 180, 277, 'brojilo i interpolacija', 't2d-ls', 'middle');
  // oznake
  const oz = (y, ty, t, x2) => { S('line', { x1: x2, y1: y, x2: 300, y2: ty - 5, class: 't2d-vodilja' }, svg); T(svg, 306, ty, t, 't2d-l'); };
  oz(40, 44, 'LED (izvor svjetla)', cx + 14);
  oz(99, 104, 'Kondenzor', 262);
  oz(156, 150, 'Ploča za očitavanje', 270);
  T(svg, 306, 215, 'Staklena mjerna letva ↔', 't2d-l');
  oz(226, 240, 'Fotoelementi A i B', 246);
  // donja ploča s očitanjima
  S('line', { x1: 0, y1: 300, x2: 600, y2: 300, class: 't2d-crta-t' }, svg);
  T(svg, 14, 324, 'Signali A i B', 't2d-ls');
  const sigA = S('polyline', { class: 't2d-signal', stroke: B.nar }, svg);
  const sigB = S('polyline', { class: 't2d-signal', stroke: B.pl }, svg);
  T(svg, 14, 362, 'A', 't2d-ls').style.fill = B.nar;
  T(svg, 14, 412, 'B', 't2d-ls').style.fill = B.pl;
  S('line', { x1: 135, y1: 332, x2: 135, y2: 425, stroke: 'var(--ink)', 'stroke-dasharray': '3 3' }, svg);
  T(svg, 285, 324, 'Brojilo (4 bita)', 't2d-ls');
  const bit = [];
  for (let i = 0; i < 4; i++) {
    const r = S('rect', { x: 285 + i * 36, y: 340, width: 30, height: 40, rx: 5 }, svg);
    const t = T(svg, 300 + i * 36, 369, '0', 't2d-bit', 'middle');
    bit.push([r, t]);
  }
  T(svg, 285, 404, '8 4 2 1', 't2d-ls').setAttribute('textLength', 128);
  T(svg, 445, 324, 'Prikaz položaja', 't2d-ls');
  const dez = T(svg, 445, 372, '0,000 mm', 't2d-broj');
  const imp = T(svg, 445, 402, 'impulsa: 0', 't2d-ls');

  const prop = (xw, s) => { const u = ((((xw - s - 12) % PER) + PER) % PER) / PER; return 1 - 2 * Math.min(u, 1 - u); };
  const dig = (xw, s) => prop(xw, s) > 0.5 ? 1 : 0;
  function osvjezi() {
    const s = st.s;
    pat.setAttribute('patternTransform', `translate(${s.toFixed(2)} 0)`);
    for (const k in prozori) {
      const t = prop(prozori[k], s);
      zr[k].setAttribute('opacity', (0.08 + 0.75 * t).toFixed(2));
      fe[k].setAttribute('fill', t > 0.5 ? B.zut : 'var(--tanko)');
      fe[k].style.fill = t > 0.5 ? B.zut : 'var(--tanko)';
    }
    // signali u okolini trenutnog položaja (±60 px)
    const ta = [], tb = [];
    for (let i = 0; i <= 120; i++) {
      const ss = s - 60 + i, x = 75 + i;
      ta.push(x + ',' + (dig(prozori.A, ss) ? 340 : 368));
      tb.push(x + ',' + (dig(prozori.B, ss) ? 392 : 420));
    }
    sigA.setAttribute('points', ta.join(' ')); sigB.setAttribute('points', tb.join(' '));
    const n = Math.floor(s / KOR);
    const m = ((n % 16) + 16) % 16;
    for (let i = 0; i < 4; i++) {
      const b = (m >> (3 - i)) & 1;
      bit[i][0].setAttribute('class', b ? 't2d-bit-1' : 't2d-bit-0');
      bit[i][1].textContent = String(b);
    }
    dez.textContent = hr(n * 0.005, 3) + ' mm';
    imp.textContent = 'impulsa: ' + n;
    o.a(dig(prozori.A, s) ? '1 (svijetlo)' : '0 (tamno)'); o.b(dig(prozori.B, s) ? '1 (svijetlo)' : '0 (tamno)');
    o.bin(m.toString(2).padStart(4, '0') + '  (dekadski ' + m + ')');
    if (kl.ulaz.value != Math.round(s)) { kl.ulaz.value = Math.round(s); kl.osvjezi(); }
  }
  function pomak(ds) {
    const prije = Math.floor(st.s / KOR);
    st.s = ogr(st.s + ds, 3, 483);
    const n = Math.floor(st.s / KOR);
    if (n !== prije) ui.stanje(`${n > prije ? 'Letva ide udesno: A prednjači pred B, brojilo broji naprijed' : 'Letva ide ulijevo: B prednjači pred A, brojilo broji unatrag'} (${n - prije > 0 ? '+' : ''}${n - prije} ${Math.abs(n - prije) === 1 ? 'impuls' : 'impulsa'}).`);
    osvjezi();
  }
  const kl = ui.klizac('Položaj letve', 3, 483, 1, st.s, v => hr(Math.floor(v / KOR) * 0.005, 3) + ' mm', v => pomak(v - st.s));
  const r = ui.red();
  ui.gumb('◀ korak', () => pomak(-KOR), { tanki: true, u: r, aria: 'Letva jedan korak ulijevo' });
  ui.gumb('korak ▶', () => pomak(KOR), { tanki: true, u: r, aria: 'Letva jedan korak udesno' });
  ui.gumb('Pokreni', (e, b) => { st.auto = !st.auto; b.textContent = st.auto ? 'Zaustavi' : 'Pokreni'; b.setAttribute('aria-pressed', String(st.auto)); ctx.budi(); }, { u: r, pritisak: false });
  const o = ui.ocit([['a', 'Fotoelement A'], ['b', 'Fotoelement B'], ['bin', 'Brojilo binarno']]);
  ctx.petlja(dt => {
    if (!st.auto) return false;
    let ns = st.s + st.smjer * 26 * dt;
    if (ns >= 483) { ns = 483; st.smjer = -1; }
    if (ns <= 3) { ns = 3; st.smjer = 1; }
    pomak(ns - st.s);
    return true;
  });
  osvjezi();
  ui.stanje('Jedan impuls = 5 µm (razdioba 20 µm, četiri brida po periodi — primjer).');
}


/* =========================================================== T1. izvedbe tokarilica: ravna i kosa postelja */
function tIzvedbeT(ui, ctx) {
  const st = { izv: 'kosa', x: 100, z: 20, cx: 100, cz: 20, cest: [], sjaj: 0 };
  const LIM = { x: [0, 140], z: [-60, 40] };
  const svg = ui.svg(640, 360, 'Lijevo: pogled s kraja stroja na ravnu ili kosu postelju, smjer osi X i pad strugotine; desno: tlocrt tokarenja s nultočkom obratka W na čelu');
  const OC = [150, 160], SK = 0.75;                       /* os vretena u pogledu s kraja, mjerilo px/mm */
  const L = S('g', {}, svg), R = S('g', {}, svg);
  T(L, 12, 22, 'Pogled s kraja (od konjića)', 't2d-l');
  T(L, 14, 344, '← korisnik', 't2d-ls');
  const gIzv = S('g', {}, L), gStr = S('g', {}, L), gAlat = S('g', {}, L);
  S('circle', { cx: OC[0], cy: OC[1], r: 78, class: 't2d-okvir-crtkan' }, L);
  S('circle', { cx: OC[0], cy: OC[1], r: 40 * SK, class: 't2d-obradak' }, L);
  S('line', { x1: OC[0] - 8, y1: OC[1], x2: OC[0] + 8, y2: OC[1], class: 't2d-kota' }, L); S('line', { x1: OC[0], y1: OC[1] - 8, x2: OC[0], y2: OC[1] + 8, class: 't2d-kota' }, L);
  /* desno: tlocrt */
  const W0 = [520, 196], s = 1.35;
  const px = (z) => W0[0] + z * s, py = (r) => W0[1] - r * s;
  T(R, 300, 22, 'Tlocrt: X je promjer, W na čelu', 't2d-l');
  S('rect', { x: 300, y: py(105), width: px(-78) - 300, height: 210 * s, class: 't2d-stol' }, R);
  for (const zn of [1, -1]) S('rect', { x: px(-78), y: zn > 0 ? py(92) : py(-40), width: 18 * s, height: 52 * s, class: 't2d-celjust' }, R);
  S('rect', { x: px(-78), y: py(40), width: 78 * s, height: 80 * s, class: 't2d-obradak' }, R);
  S('line', { x1: 300, y1: W0[1], x2: 630, y2: W0[1], class: 't2d-os-crta' }, R);
  strel(R, W0[0], W0[1], W0[0] + 92, W0[1], { boja: 'var(--teal)', w: 2.5, gl: 11 }); T(R, W0[0] + 96, W0[1] + 5, '+Z', 't2d-lb').style.fill = 'var(--teal)';
  strel(R, W0[0], W0[1], W0[0], W0[1] - 150, { boja: B.crv, w: 2.5, gl: 11 }); T(R, W0[0] - 8, W0[1] - 136, '+X (promjer)', 't2d-lb', 'end').style.fill = B.crv;
  { const g = S('g', { class: 't2d-nt-W' }, R); S('circle', { cx: W0[0], cy: W0[1], r: 8, class: 't2d-nt-k' }, g); S('path', { d: `M${W0[0]},${W0[1]} L${W0[0] + 8},${W0[1]} A8,8 0 0 1 ${W0[0]},${W0[1] + 8} Z M${W0[0]},${W0[1]} L${W0[0] - 8},${W0[1]} A8,8 0 0 1 ${W0[0]},${W0[1] - 8} Z`, class: 't2d-nt-p' }, g); T(g, W0[0] - 12, W0[1] + 24, 'W', 't2d-lb', 'end'); }
  T(R, px(-40), py(-62), 'točke na obratku: Z < 0', 't2d-ls', 'middle');
  const kotaD = S('line', { class: 't2d-kota', 'stroke-dasharray': '4 3' }, R);
  const kotaT = T(R, 0, 0, '', 't2d-ls');
  const alT = S('g', {}, R);
  S('polygon', { points: '0,0 26,-6 40,-40 14,-34', class: 't2d-alat-s' }, alT);
  S('rect', { x: 18, y: -110, width: 22, height: 74, class: 't2d-drzac' }, alT);
  S('circle', { cx: 0, cy: 0, r: 3, fill: B.crv }, alT);

  function crtaj() {
    gIzv.replaceChildren(); gAlat.replaceChildren();
    if (st.izv === 'ravna') {
      S('rect', { x: 40, y: 250, width: 230, height: 70, class: 't2d-stol' }, gIzv);
      for (const x of [60, 238]) S('rect', { x, y: 240, width: 14, height: 10, class: 't2d-metal' }, gIzv);
      T(gIzv, 155, 290, 'ravna postelja', 't2d-ls', 'middle');
      D.vod = [240, 252];
    } else {
      const P0 = [OC[0] + 42, OC[1] + 42], u = [0.7071, -0.7071];
      const a = [P0[0] - 150 * u[0], P0[1] - 150 * u[1]], b = [P0[0] + 120 * u[0], P0[1] + 120 * u[1]];
      S('polygon', { points: `${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},330 ${a[0]},330`, class: 't2d-stol' }, gIzv);
      for (const t of [-20, 90]) { const c = [P0[0] + t * u[0], P0[1] + t * u[1]]; S('rect', { x: -7, y: -14, width: 14, height: 14, class: 't2d-metal', transform: `translate(${c[0].toFixed(1)} ${c[1].toFixed(1)}) rotate(-45)` }, gIzv); }
      S('path', { d: `M${a[0] - 30},${a[1] - 8} L${a[0] - 30},${a[1] + 14} L${a[0] + 6},${a[1] + 14} L${a[0] + 6},${a[1] - 2}`, class: 't2d-simbol-c' }, gIzv);
      T(gIzv, a[0] - 12, a[1] - 16, 'korito', 't2d-ls', 'middle');
      T(gIzv, b[0] - 10, 316, 'kosa postelja 45°', 't2d-ls', 'end');
      D.kos = { a, b };
    }
    crtajAlat();
  }
  const D = {};
  function smjerX() { return st.izv === 'ravna' ? [-1, 0] : [0.7071, -0.7071]; }
  function vrh() { const d = smjerX(), r = st.x / 2 * SK; return [OC[0] + d[0] * r, OC[1] + d[1] * r]; }
  function crtajAlat() {
    gAlat.replaceChildren();
    const d = smjerX(), v = vrh();
    if (st.izv === 'ravna') {
      S('rect', { x: v[0] - 70, y: v[1] - 6, width: 64, height: 12, class: 't2d-alat-s' }, gAlat);
      S('polygon', { points: `${v[0]},${v[1]} ${v[0] - 10},${v[1] - 6} ${v[0] - 10},${v[1] + 6}`, class: 't2d-alat-s' }, gAlat);
      S('rect', { x: v[0] - 100, y: v[1] - 22, width: 34, height: 44, class: 't2d-drzac' }, gAlat);
      S('rect', { x: v[0] - 116, y: 222, width: 90, height: 18, class: 't2d-pomicni' }, gAlat);
      S('line', { x1: v[0] - 83, y1: v[1] + 22, x2: v[0] - 83, y2: 222, class: 't2d-kota' }, gAlat);
    } else {
      const c = [v[0] + d[0] * 62, v[1] + d[1] * 62];
      S('circle', { cx: c[0], cy: c[1], r: 46, class: 't2d-pomicni' }, gAlat);
      S('circle', { cx: c[0], cy: c[1], r: 8, class: 't2d-metal' }, gAlat);
      S('rect', { x: -6, y: 0, width: 12, height: 22, class: 't2d-alat-s', transform: `translate(${v[0].toFixed(1)} ${v[1].toFixed(1)}) rotate(45)` }, gAlat);
      T(gAlat, c[0], c[1] + 64, 'revolver', 't2d-ls', 'middle');
    }
    S('circle', { cx: v[0], cy: v[1], r: 3, fill: B.crv }, gAlat);
    const o0 = st.izv === 'ravna' ? [96, 120] : [214, 236];
    const gg = S('g', { class: 't2d-os' + (st.sjaj > 0 ? ' t2d-sjaj' : '') }, gAlat);
    strel(gg, o0[0], o0[1], o0[0] + d[0] * 60, o0[1] + d[1] * 60, { boja: B.crv, w: 3.2, gl: 12 });
    T(gg, o0[0] + d[0] * 74, o0[1] + d[1] * 74 + 6, '+X', 't2d-lb', 'middle').style.fill = B.crv;
  }
  function osvjezi() {
    const tx = px(st.z), ty = py(st.x / 2);
    alT.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)})`);
    kotaD.setAttribute('x1', tx); kotaD.setAttribute('y1', ty); kotaD.setAttribute('x2', tx); kotaD.setAttribute('y2', py(-st.x / 2));
    kotaT.setAttribute('x', tx + 6); kotaT.setAttribute('y', py(-st.x / 2) + 16); kotaT.textContent = 'Ø ' + hr(st.x, 0);
    o.x(hr(st.x, 1) + ' mm'); o.r(hr(st.x / 2, 1) + ' mm'); o.z(hr(st.z, 1) + ' mm');
    const u = st.z < 0 && st.x < 80;
    o.u(u ? 'u materijalu (rez)' : 'izvan obratka', u ? 't2d-upoz' : '');
    crtajAlat();
  }
  function jog(os, zn) {
    const k = 'c' + os, novo = ogr(st[k] + zn * 5, LIM[os][0], LIM[os][1]);
    if (novo === st[k]) { ui.stanje('Granica hoda u ovom prikazu.', 'upoz'); return; }
    st[k] = novo;
    if (os === 'x') { st.sjaj = 1.4; ui.stanje(`${zn > 0 ? '+X' : '−X'}: promjer se mijenja za 5 mm, a vrh alata pomakne se ${zn > 0 ? 'od osi' : 'prema osi'} za 2,5 mm. ${st.izv === 'kosa' ? 'Na kosoj postelji poprečne saonice idu po kosini gore-natrag (+X) ili dolje-naprijed (−X).' : 'Na ravnoj postelji poprečne saonice idu prema korisniku (+X) ili prema osi (−X).'}`); }
    else ui.stanje(`${zn > 0 ? '+Z' : '−Z'}: uzdužne saonice gibaju se ${zn > 0 ? 'prema konjiću, od stezne glave' : 'prema steznoj glavi'}. Z = 0 je čelo obratka; točke na obratku imaju negativan Z.`);
    ctx.budi();
  }
  function strugotina() {
    for (let i = 0; i < 14; i++) { const v = vrh(); st.cest.push({ x: v[0] + (Math.random() - 0.5) * 6, y: v[1] + 4, vx: (Math.random() - 0.5) * 40 + (st.izv === 'ravna' ? 30 : -20), vy: -Math.random() * 30, t: Math.random() * 0.8, st: 'pada' }); }
    ui.stanje(st.izv === 'ravna' ? 'Na ravnoj postelji strugotina pada na saonice i vodilice — gomila se i treba je stalno čistiti.' : 'Na kosoj postelji strugotina pada slobodno i klizi niz kosinu u korito transportera; vodilice su iza i iznad, izvan putanje strugotine.');
    ctx.budi();
  }
  function korakCestice(c, dt) {
    if (c.t > 0) { c.t -= dt; return true; }
    if (c.st === 'stoji') return false;
    if (c.st === 'klizi') { c.x -= 70 * dt; c.y += 70 * dt; if (c.x < (D.kos ? D.kos.a[0] - 10 : 0)) { c.st = 'stoji'; c.y = D.kos.a[1] + 8; } return true; }
    c.vy += 400 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
    if (st.izv === 'ravna') { const pod = c.x > 40 && c.x < 270 ? (c.x > (vrh()[0] - 116) && c.x < vrh()[0] - 26 ? 222 : 250) : 330; if (c.y >= pod) { c.y = pod - 2; c.st = 'stoji'; } }
    else { const { a, b } = D.kos, t = (c.x - a[0]) / (b[0] - a[0]), ys = a[1] + t * (b[1] - a[1]); if (t >= 0 && t <= 1 && c.y >= ys - 2) { c.y = ys - 2; c.st = 'klizi'; } if (c.y > 330) c.st = 'stoji'; }
    return true;
  }
  function crtajCestice() { gStr.replaceChildren(); for (const c of st.cest) S('circle', { cx: c.x.toFixed(1), cy: c.y.toFixed(1), r: 2.6, fill: B.ulje }, gStr); }
  ui.seg('Izvedba', [['kosa', 'Kosa postelja'], ['ravna', 'Ravna postelja']], st.izv, v => { st.izv = v; st.cest = []; crtajCestice(); crtaj(); osvjezi(); ui.stanje(v === 'kosa' ? 'Kosa postelja: revolver je iza i iznad osi, os X ide koso gore-natrag.' : 'Ravna postelja: alat dolazi s prednje strane, od korisnika, os X je vodoravna.'); });
  const r1 = ui.red('t2d-jog');
  for (const [os, zn] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]]) ui.gumb((zn > 0 ? '+' : '−') + os.toUpperCase(), () => jog(os, zn), { u: r1, tanki: true, aria: `Smjer ${zn > 0 ? 'plus' : 'minus'} ${os.toUpperCase()}` });
  const r2 = ui.red();
  ui.gumb('Strugotina', strugotina, { u: r2 });
  ui.gumb('Početni položaj', () => { st.cx = 100; st.cz = 20; st.cest = []; crtajCestice(); ui.stanje('Povratak u početni položaj.'); ctx.budi(); }, { u: r2, tanki: true });
  const o = ui.ocit([['x', 'X (promjer)'], ['r', 'Udaljenost vrha od osi'], ['z', 'Z (od čela)'], ['u', 'Vrh alata']]);
  ctx.petlja(dt => {
    let ide = false;
    for (const a of ['x', 'z']) { const k = 'c' + a; if (st[a] !== st[k]) { st[a] = pribl(st[a], st[k], 40 * dt); ide = true; } }
    if (st.cest.length) { let i2 = false; for (const c of st.cest) if (korakCestice(c, dt)) i2 = true; crtajCestice(); if (i2) ide = true; }
    if (st.sjaj > 0) { st.sjaj -= dt; ide = true; }
    osvjezi();
    return ide;
  });
  crtaj(); osvjezi();
  ui.stanje('Pritisni tipku smjera, npr. −X, ili „Strugotina”.');
}

/* =========================================================== T2. linearni motor */
function tLinearni(ui, ctx) {
  const P = { lin: { a: 20, v: 2 }, vr: { a: 4, v: 2 / 3 } };     /* m/s², m/s (primjer) */
  const st = { m: 200, cilj: 0.3, t: 0, radi: false, poc: 0, smjer: 1, s: { lin: 0, vr: 0 }, gotovo: { lin: null, vr: null }, kut: 0 };
  const svg = ui.svg(640, 380, 'Usporedba: linearni motor (gore) i servomotor s kugličnim navojnim vretenom (dolje) pri pozicioniranju za 300 mm');
  const X0 = 120, SX = 1.4;                                       /* 300 mm → 420 px */
  /* linearni motor */
  T(svg, 12, 26, 'Linearni motor', 't2d-l');
  S('rect', { x: 100, y: 120, width: 470, height: 24, class: 't2d-stol' }, svg);
  for (let i = 0; i < 23; i++) S('rect', { x: 104 + i * 20, y: 104, width: 18, height: 16, fill: i % 2 ? B.pl : B.crv, opacity: 0.55, stroke: 'var(--ink)', 'stroke-width': 0.8 }, svg);
  T(svg, 104, 160, 'sekundarni dio: trajni magneti (N/S) na postelji', 't2d-ls');
  const gLin = S('g', {}, svg);
  S('rect', { x: -28, y: 50, width: 96, height: 46, rx: 4, class: 't2d-pomicni' }, gLin);
  const zav = ['U', 'V', 'W'].map((f, i) => { const r = S('rect', { x: -22 + i * 30, y: 74, width: 26, height: 20, fill: B.nar, stroke: 'var(--ink)', 'stroke-width': 0.8 }, gLin); T(gLin, -9 + i * 30, 89, f, 't2d-ls', 'middle'); return r; });
  T(gLin, 20, 66, 'saonice', 't2d-ls', 'middle');
  const silaL = strel(svg, 0, 0, 1, 1, { boja: B.crv, w: 3, gl: 11 });
  /* kuglično vreteno */
  T(svg, 12, 206, 'Servomotor i kuglično navojno vreteno', 't2d-l');
  S('rect', { x: 100, y: 318, width: 470, height: 24, class: 't2d-stol' }, svg);
  S('rect', { x: 34, y: 262, width: 60, height: 50, rx: 4, class: 't2d-tamno' }, svg); T(svg, 64, 330, 'motor', 't2d-ls', 'middle');
  S('rect', { x: 94, y: 278, width: 14, height: 18, class: 't2d-metal' }, svg);
  S('rect', { x: 108, y: 281, width: 460, height: 12, class: 't2d-metal' }, svg);
  const navoj = S('g', {}, svg);
  for (let i = 0; i < 46; i++) S('line', { x1: 110 + i * 10, y1: 281, x2: 116 + i * 10, y2: 293, class: 't2d-zavoj' }, navoj);
  S('rect', { x: 566, y: 276, width: 10, height: 42, class: 't2d-tamno' }, svg);
  const gVr = S('g', {}, svg);
  S('rect', { x: -28, y: 234, width: 96, height: 40, rx: 4, class: 't2d-pomicni' }, gVr);
  S('rect', { x: 2, y: 274, width: 36, height: 26, class: 't2d-tamno' }, gVr);
  T(gVr, 20, 258, 'saonice', 't2d-ls', 'middle');
  const silaV = strel(svg, 0, 0, 1, 1, { boja: B.crv, w: 3, gl: 11 });
  const nat = { lin: T(svg, 620, 30, '', 't2d-lb', 'end'), vr: T(svg, 620, 210, '', 't2d-lb', 'end') };
  T(svg, 620, 372, 'gibanje usporeno 6 ×', 't2d-ls', 'end');
  function profil(p, s) {                                         /* vrijeme do položaja s (trapez) */
    const ta = p.v / p.a, sa = p.v * p.v / 2 / p.a;
    if (2 * sa >= st.cilj) { const T2 = Math.sqrt(st.cilj / p.a); return { T: 2 * T2, x: (t) => t < T2 ? p.a * t * t / 2 : st.cilj - p.a * (2 * T2 - t) ** 2 / 2, vmax: p.a * T2 }; }
    const Tk = st.cilj / p.v + ta;
    return { T: Tk, x: (t) => t < ta ? p.a * t * t / 2 : t < Tk - ta ? sa + p.v * (t - ta) : st.cilj - p.a * (Tk - t) ** 2 / 2, vmax: p.v };
  }
  const PR = { lin: profil(P.lin), vr: profil(P.vr) };
  void PR;
  function osvjezi() {
    const pos = (k) => st.smjer > 0 ? st.s[k] : st.cilj - st.s[k];
    const xl = X0 + pos('lin') * 1000 * SX, xv = X0 + pos('vr') * 1000 * SX;
    gLin.setAttribute('transform', `translate(${(xl - 20).toFixed(1)} 0)`); gVr.setAttribute('transform', `translate(${(xv - 20).toFixed(1)} 0)`);
    const faza = pos('lin') * 1000 / 40 * 2 * Math.PI;
    zav.forEach((r, i) => r.setAttribute('opacity', (0.25 + 0.75 * Math.abs(Math.sin(faza + i * 2.094))).toFixed(2)));
    navoj.setAttribute('transform', `translate(${((pos('vr') * 1000) % 10).toFixed(2)} 0)`);
    const aL = st.akt ? st.akt.lin : 0, aV = st.akt ? st.akt.vr : 0;
    const kL = Math.max(-1, Math.min(1, aL / P.lin.a)), kV = Math.max(-1, Math.min(1, aV / P.lin.a));
    silaL.set(330, 150, 330 - kL * 90, 150); silaV.set(330, 348, 330 - kV * 90, 348);
    for (const k of ['lin', 'vr']) nat[k].textContent = st.gotovo[k] != null ? hr(st.gotovo[k], 2) + ' s' : '';
    const F = (a) => hr(st.m * a / 1000, 1) + ' kN';
    o.lin(`a = ${P.lin.a} m/s², v = 120 m/min, F = ${F(P.lin.a)}`); o.vr(`a = ${P.vr.a} m/s², v = 40 m/min, F = ${F(P.vr.a)}`);
    o.t(st.gotovo.lin != null && st.gotovo.vr != null ? `linearni ${hr(st.gotovo.lin, 2)} s · vreteno ${hr(st.gotovo.vr, 2)} s` : '—');
  }
  function kreni() {
    if (st.radi) return;
    st.radi = true; st.t = 0; st.gotovo = { lin: null, vr: null }; st.s = { lin: 0, vr: 0 };
    ui.stanje('Oba pogona kreću istodobno… Crvene strelice na postelji su sila reakcije pri ubrzavanju i kočenju.');
    ctx.budi();
  }
  ui.gumb('Pozicioniraj 300 mm', kreni, { aria: 'Pokreni pozicioniranje obaju pogona za 300 mm' });
  ui.klizac('Masa saonica s revolverom', 100, 400, 50, st.m, v => hr(v, 0) + ' kg', v => { st.m = v; osvjezi(); });
  const o = ui.ocit([['lin', 'Linearni motor'], ['vr', 'Kuglično vreteno'], ['t', 'Vrijeme pozicioniranja']]);
  ctx.petlja(dt => {
    if (!st.radi) return false;
    st.t += dt / 6;
    st.akt = {};
    for (const k of ['lin', 'vr']) {
      const p = profil(P[k]);
      if (st.t >= p.T) { st.s[k] = st.cilj; if (st.gotovo[k] == null) st.gotovo[k] = p.T; st.akt[k] = 0; }
      else { st.s[k] = p.x(st.t); const t1 = Math.max(0, st.t - 0.002), v1 = (p.x(st.t) - p.x(t1)) / (st.t - t1 || 1), v0 = (p.x(t1) - p.x(Math.max(0, t1 - 0.002))) / 0.002; st.akt[k] = st.smjer * (v1 - v0) / 0.002; }
    }
    if (st.gotovo.lin != null && st.gotovo.vr != null) {
      st.radi = false; st.smjer = -st.smjer; st.akt = null;
      ui.stanje(`Linearni motor stigao je za ${hr(st.gotovo.lin, 2)} s, kuglično vreteno za ${hr(st.gotovo.vr, 2)} s. Sila na postelju pri ubrzavanju: ${hr(st.m * P.lin.a / 1000, 1)} kN prema ${hr(st.m * P.vr.a / 1000, 1)} kN — zato stroj s linearnim motorima mora biti krući.`, 'ok');
    }
    osvjezi();
    return st.radi;
  });
  osvjezi();
  ui.stanje('Pritisni „Pozicioniraj 300 mm”.');
}

/* =========================================================== T3. stezni cilindar i nadzor steznog puta */
function tStezniPut(ui, ctx) {
  const st = { obr: 80, s: 0, cilj: 0, S1: 6, S2: 10, nozna: false };
  const svg = ui.svg(680, 340, 'Presjek šupljeg steznog cilindra s klipom, vučnom cijevi i steznom glavom te osjetnici steznog puta S1 i S2 na klipnjači');
  const CY = 170, KS = 4, KR = 1.6;                    /* mjerilo hoda klipa i polumjera čeljusti */
  /* stezna glava (presjek, shematski) */
  S('rect', { x: 40, y: CY - 110, width: 70, height: 220, class: 't2d-kuciste' }, svg);
  T(svg, 75, CY + 132, 'stezna glava', 't2d-ls', 'middle');
  const gObr = S('g', {}, svg);
  const celG = S('rect', { x: 110, y: 0, width: 26, height: 36, class: 't2d-celjust-p' }, svg), celD = S('rect', { x: 110, y: 0, width: 26, height: 36, class: 't2d-celjust-p' }, svg);
  /* vreteno (shematski) i cilindar */
  S('rect', { x: 110, y: CY - 40, width: 230, height: 80, class: 't2d-okvir-crtkan' }, svg);
  T(svg, 262, CY - 48, 'glavno vreteno (šuplje)', 't2d-ls', 'middle');
  const cijev = S('rect', { y: CY - 10, height: 20, class: 't2d-motka' }, svg);
  S('rect', { x: 340, y: CY - 70, width: 170, height: 140, class: 't2d-presjek', fill: svg.srafura }, svg);
  S('rect', { x: 350, y: CY - 58, width: 150, height: 116, class: 't2d-komora' }, svg);
  const klip = S('rect', { y: CY - 56, width: 16, height: 112, class: 't2d-pomicni' }, svg);
  const ulje = S('rect', { x: 350, y: CY - 56, height: 112, fill: B.ulje, opacity: 0.35 }, svg);
  T(svg, 425, CY + 92, 'šuplji stezni cilindar', 't2d-ls', 'middle');
  S('rect', { x: 350, y: CY - 7, width: 150, height: 14, fill: 'var(--karta)', stroke: 'var(--body)', 'stroke-dasharray': '3 3' }, svg);
  T(svg, 425, CY + 4, 'otvor za šipku', 't2d-ls', 'middle').style.fontSize = '11px';
  const klipnj = S('rect', { y: CY - 18, height: 8, class: 't2d-motka' }, svg);
  const prsten = S('rect', { y: CY - 30, width: 12, height: 32, fill: B.zut, stroke: 'var(--ink)', 'stroke-width': 1.2 }, svg);
  S('line', { x1: 520, y1: CY - 52, x2: 670, y2: CY - 52, class: 't2d-metal', stroke: 'var(--ink)', 'stroke-width': 3 }, svg);
  T(svg, 520, CY - 112, 'letva s osjetnicima', 't2d-ls');
  const osj = {};
  for (const [k, oz, h] of [['S0', 'S0', -30], ['S1', 'S1', -46], ['S2', 'S2', -30]]) { const g = S('g', {}, svg); S('rect', { x: -6, y: -12, width: 12, height: 22, class: 't2d-tamno' }, g); const led = S('circle', { cx: 0, cy: -18, r: 5, fill: '#888' }, g); T(g, 0, h, oz, 't2d-ls', 'middle'); osj[k] = { g, led }; }
  const xKlip = (s) => 354 + s * KS, xPr = (s) => 524 + s * 4.6;
  const rCelj = (s) => 44 - 0.5 * s;
  function kontakt() { return st.obr ? (44 - st.obr / 2) / 0.5 : 30; }
  function osvjezi() {
    const s = st.s, xk = xKlip(s);
    klip.setAttribute('x', xk); ulje.setAttribute('width', Math.max(0, xk - 350));
    cijev.setAttribute('x', 124 + s * KS); cijev.setAttribute('width', xk - (124 + s * KS));
    klipnj.setAttribute('x', xk + 16); klipnj.setAttribute('width', xPr(s) - xk - 16);
    prsten.setAttribute('x', xPr(s));
    const r = rCelj(s) * KR;
    celG.setAttribute('y', CY - r - 36); celD.setAttribute('y', CY + r);
    gObr.replaceChildren();
    if (st.obr) S('rect', { x: 96, y: CY - st.obr / 2 * KR, width: 84, height: st.obr * KR, class: 't2d-obradak' }, gObr);
    osj.S0.g.setAttribute('transform', `translate(${xPr(0.5) + 6} ${CY - 52})`);
    osj.S1.g.setAttribute('transform', `translate(${xPr(st.S1) + 6} ${CY - 52})`);
    osj.S2.g.setAttribute('transform', `translate(${xPr(st.S2) + 6} ${CY - 52})`);
    const na = (S) => Math.abs(s - S) < 1.2 || (S === st.S1 && s >= st.S1);
    osj.S0.led.setAttribute('fill', s < 1 ? B.zel : '#888');
    osj.S1.led.setAttribute('fill', s >= st.S1 ? B.zel : '#888');
    osj.S2.led.setAttribute('fill', s > st.S2 ? B.crv : '#888');
    void na;
    const mir = Math.abs(st.s - st.cilj) < 0.01;
    let ocj = '—', kl = '';
    if (mir && st.cilj === 0) { ocj = 'otvoreno — vreteno blokirano'; kl = 't2d-upoz'; }
    else if (mir) {
      if (st.s < st.S1) { ocj = 'NE — klip nije dosegnuo S1'; kl = 't2d-opas'; }
      else if (st.s > st.S2) { ocj = 'NE — prekoračen stezni put'; kl = 't2d-opas'; }
      else { ocj = 'DA — stegnuto unutar steznog puta'; kl = 't2d-ok'; }
    }
    o.s(hr(st.s, 1) + ' mm'); o.r('Ø ' + hr(2 * rCelj(st.s), 1) + ' mm'); o.p(`S1 = ${hr(st.S1, 1)} mm · S2 = ${hr(st.S2, 1)} mm`); o.v(ocj, kl);
  }
  function ocijeni() {
    if (st.cilj === 0) { ui.stanje('Čeljusti su otvorene, osjetnik S0 javlja „otvoreno”. Vreteno se ne smije pokrenuti.', 'upoz'); return; }
    if (st.s < st.S1) ui.stanje(`Klip je stao na ${hr(st.s, 1)} mm, prije osjetnika S1. Obradak je prevelik za ovaj položaj čeljusti ili je nešto između čeljusti — PLC ne dopušta vrtnju.`, 'opas');
    else if (st.s > st.S2) ui.stanje(st.obr ? `Klip je prošao osjetnik S2 (${hr(st.s, 1)} mm): obradak Ø${st.obr} je premalen za podešeni stezni put. Pomakni S2 dalje ili promijeni čeljusti. Vreteno ostaje blokirano.` : 'Nema obratka: klip je otišao do kraja hoda i prošao S2. PLC ne dopušta vrtnju — inače bi se prazne čeljusti vrtjele, a obradak bi mogao odletjeti.', 'opas');
    else ui.stanje(`Obradak Ø${st.obr} je stegnut: klip je stao na ${hr(st.s, 1)} mm, između S1 i S2. PLC dopušta vrtnju vretena.`, 'ok');
  }
  ui.seg('Obradak', [[80, 'Ø80'], [76, 'Ø76'], [0, 'bez obratka']], st.obr, v => { st.obr = v; if (st.cilj > 0) st.cilj = kontakt(); ui.stanje('Odabran ' + (v ? 'obradak Ø' + v : 'rad bez obratka') + '.'); ctx.budi(); });
  const r = ui.red();
  ui.gumb('Stegni', () => { st.cilj = kontakt(); ui.stanje('Nožna sklopka: ulje ulazi iza klipa, klip vuče vučnu cijev, čeljusti se zatvaraju…'); ctx.budi(); }, { u: r });
  ui.gumb('Otpusti', () => { st.cilj = 0; ui.stanje('Otpuštanje: klip se vraća, čeljusti se otvaraju…'); ctx.budi(); }, { u: r, tanki: true });
  const k1 = ui.klizac('Osjetnik S1 (početak steznog puta)', 0, 30, 0.5, st.S1, v => hr(v, 1) + ' mm', v => { st.S1 = Math.min(v, st.S2 - 1); if (st.S1 !== v) { k1.ulaz.value = st.S1; k1.osvjezi(); } osvjezi(); if (Math.abs(st.s - st.cilj) < 0.01 && st.cilj) ocijeni(); });
  const k2 = ui.klizac('Osjetnik S2 (kraj steznog puta)', 0, 30, 0.5, st.S2, v => hr(v, 1) + ' mm', v => { st.S2 = Math.max(v, st.S1 + 1); if (st.S2 !== v) { k2.ulaz.value = st.S2; k2.osvjezi(); } osvjezi(); if (Math.abs(st.s - st.cilj) < 0.01 && st.cilj) ocijeni(); });
  const o = ui.ocit([['s', 'Hod klipa'], ['r', 'Otvor čeljusti'], ['p', 'Stezni put'], ['v', 'Dopuštenje vretena']]);
  ctx.petlja(dt => {
    if (Math.abs(st.s - st.cilj) < 0.01) return false;
    st.s = pribl(st.s, st.cilj, 12 * dt);
    if (Math.abs(st.s - st.cilj) < 0.01) { st.s = st.cilj; osvjezi(); ocijeni(); return false; }
    osvjezi(); return true;
  });
  osvjezi();
  ui.stanje('Odaberi obradak i pritisni „Stegni”.');
}

/* =========================================================== T4. tlak stezanja */
function tTlakStezanja(ui, ctx) {
  const K = 3, PMIN = 25, DOP = 0.02;                           /* kN/bar, bar, mm (primjer) */
  const C = { puni: { '3': 0.00005, '6': 0.00003, 'c': 0.00002 }, cijev: { '3': 0.0008, '6': 0.0002, 'c': 0.00008 } };
  const st = { obr: 'puni', sr: '3', p: 30, stegnuto: false, vrti: false, kut: 0, otp: false };
  const svg = ui.svg(620, 370, 'Pogled s kraja na obradak u steznoj glavi: tri čeljusti, njihajuće čeljusti ili stezna čahura; deformacija obratka jako uvećana; manometar i tlačna sklopka');
  const CX = 170, CY = 196, R = 96, RI = 82;
  T(svg, 12, 22, 'Pogled s kraja (deformacija uvećana)', 't2d-l');
  const gRot = S('g', {}, svg), gSr = S('g', {}, svg), gNak = S('g', {}, svg);
  /* manometar */
  const MX = 470, MY = 110;
  S('circle', { cx: MX, cy: MY, r: 64, class: 't2d-simbol' }, svg);
  for (let b = 0; b <= 40; b += 5) { const a = (-220 + b / 40 * 260) * Math.PI / 180; S('line', { x1: MX + Math.cos(a) * 54, y1: MY + Math.sin(a) * 54, x2: MX + Math.cos(a) * 62, y2: MY + Math.sin(a) * 62, class: 't2d-kota' }, svg); if (b % 10 === 0) T(svg, MX + Math.cos(a) * 42, MY + Math.sin(a) * 42 + 5, String(b), 't2d-ls', 'middle'); }
  { const a = (-220 + PMIN / 40 * 260) * Math.PI / 180; S('line', { x1: MX + Math.cos(a) * 46, y1: MY + Math.sin(a) * 46, x2: MX + Math.cos(a) * 66, y2: MY + Math.sin(a) * 66, stroke: B.crv, 'stroke-width': 3 }, svg); }
  T(svg, MX, MY + 34, 'bar', 't2d-ls', 'middle');
  const kaz = S('line', { x1: MX, y1: MY, stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
  S('circle', { cx: MX, cy: MY, r: 5, fill: 'var(--ink)' }, svg);
  T(svg, MX, MY + 84, 'crvena crta: tlačna sklopka 25 bar', 't2d-ls', 'middle');
  const vrLamp = S('circle', { cx: MX - 60, cy: 268, r: 10, fill: '#888', stroke: 'var(--ink)' }, svg);
  T(svg, MX - 44, 273, 'dopuštenje vretena', 't2d-ls');
  const natDef = T(svg, 190, 356, '', 't2d-l', 'middle');
  function oblik(rr, A, n, kut) {
    const p = [];
    for (let i = 0; i <= 120; i++) { const t = i / 120 * 2 * Math.PI; const r = rr - (n ? A * Math.cos(n * (t - kut)) : A); p.push((CX + r * Math.cos(t)).toFixed(1) + ',' + (CY + r * Math.sin(t)).toFixed(1)); }
    return p.join(' ');
  }
  function def() { return st.stegnuto ? C[st.obr][st.sr] * K * st.p : 0; }
  function crtaj() {
    gRot.replaceChildren(); gSr.replaceChildren(); gNak.replaceChildren();
    const d = def(), A = Math.min(30, d * 600), n = st.sr === '3' ? 3 : st.sr === '6' ? 6 : 0, k0 = -Math.PI / 2;
    S('polygon', { points: oblik(R, A, n, k0), class: 't2d-obradak' }, gRot);
    if (st.obr === 'cijev') S('polygon', { points: oblik(RI, A * 1.1, n, k0), fill: 'var(--karta)', stroke: 'var(--ink)', 'stroke-width': 1.2 }, gRot);
    S('line', { x1: CX + R - 12, y1: CY, x2: CX + R - 2, y2: CY, stroke: 'var(--ink)', 'stroke-width': 3 }, gRot);
    gRot.setAttribute('transform', `rotate(${(st.kut * 180 / Math.PI).toFixed(1)} ${CX} ${CY})`);
    const rr = R - A;
    if (st.sr === 'c') { S('circle', { cx: CX, cy: CY, r: R + 14, fill: 'none', stroke: 'var(--t2d-m2)', 'stroke-width': 24, opacity: 0.85 }, gSr); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; S('line', { x1: CX + Math.cos(a) * (R + 2), y1: CY + Math.sin(a) * (R + 2), x2: CX + Math.cos(a) * (R + 26), y2: CY + Math.sin(a) * (R + 26), stroke: 'var(--karta)', 'stroke-width': 3 }, gSr); } }
    else for (let i = 0; i < 3; i++) {
      const a = k0 + i * 2 * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
      const g = S('g', { transform: `translate(${(CX + c * rr).toFixed(1)} ${(CY + s * rr).toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(1)})` }, gSr);
      if (st.sr === '3') S('rect', { x: -16, y: -46, width: 32, height: 46, class: 't2d-celjust-p' }, g);
      else { S('rect', { x: -30, y: -50, width: 60, height: 34, class: 't2d-celjust-p' }, g); for (const x of [-20, 20]) S('rect', { x: x - 7, y: -16 - (Math.abs(x) * 0.0), width: 14, height: 16, class: 't2d-celjust-p' }, g); }
      strel(g, 0, -88, 0, -52, { boja: B.crv, w: 2.4, gl: 9 });
    }
    if (st.otp && st.dOtp > DOP) S('polygon', { points: oblik(R + 4, -Math.min(30, st.dOtp * 600) * 0.8, n, k0 + Math.PI / n), fill: 'none', stroke: B.crv, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, gNak);
    natDef.textContent = st.stegnuto ? `deformacija ${hr(d, 3)} mm (dopušteno ${hr(DOP, 2)} mm)` : 'otpušteno';
    natDef.style.fill = d > DOP ? B.crv : 'var(--ink)';
    const a = (-220 + st.p / 40 * 260) * Math.PI / 180;
    kaz.setAttribute('x2', (MX + Math.cos(a) * 50).toFixed(1)); kaz.setAttribute('y2', (MY + Math.sin(a) * 50).toFixed(1));
    vrLamp.setAttribute('fill', st.stegnuto && st.p >= PMIN ? B.zel : '#888');
    o.f(hr(K * st.p, 0) + ' kN'); o.d(st.stegnuto ? hr(d, 3) + ' mm' : '—', d > DOP ? 't2d-opas' : '');
    o.v(!st.stegnuto ? '—' : st.p >= PMIN ? 'DA' : 'NE (tlak ispod 25 bar)', !st.stegnuto ? '' : st.p >= PMIN ? 't2d-ok' : 't2d-opas');
  }
  function pokreni() {
    st.stegnuto = true; st.otp = false;
    const d = def(), ime = { '3': 'tri tvrde čeljusti', '6': 'njihajuće čeljusti', c: 'steznu čahuru' }[st.sr];
    if (st.p < PMIN) { st.vrti = false; ui.stanje(`Tlak ${st.p} bar je ispod praga tlačne sklopke (25 bar): sila stezanja ${K * st.p} kN nije dovoljna za sigurnu obradu, pa vreteno ne smije krenuti.${d > DOP ? ` Usto se ${st.obr === 'cijev' ? 'cijev' : 'obradak'} i dalje deformira (${hr(d, 3)} mm).` : ''}`, 'opas'); }
    else if (d > DOP) { st.vrti = true; ui.stanje(`Vreteno se vrti, ali ${st.obr === 'cijev' ? 'cijev' : 'obradak'} pod silom ${K * st.p} kN kroz ${ime} deformira se za ${hr(d, 3)} mm. Tokariš okrugao promjer na deformiranom obratku — pritisni „Otpusti” i pogledaj što ostane.`, 'upoz'); }
    else { st.vrti = true; ui.stanje(`Stegnuto kroz ${ime} silom ${K * st.p} kN, deformacija ${hr(d, 3)} mm — u granici. Tlačna sklopka dopušta vrtnju.`, 'ok'); }
    crtaj(); ctx.budi();
  }
  ui.seg('Obradak', [['puni', 'Puni Ø80'], ['cijev', 'Cijev Ø80 × 7']], st.obr, v => { st.obr = v; st.stegnuto = false; st.vrti = false; st.otp = false; crtaj(); ui.stanje(v === 'cijev' ? 'Tankostijena cijev: osjetljiva na silu stezanja.' : 'Puni obradak: podnosi punu silu stezanja.'); });
  ui.seg('Stezno sredstvo', [['3', 'Tri čeljusti'], ['6', 'Njihajuće čeljusti'], ['c', 'Stezna čahura']], st.sr, v => { st.sr = v; st.stegnuto = false; st.vrti = false; st.otp = false; crtaj(); ui.stanje(v === '3' ? 'Tri tvrde čeljusti: sila djeluje u tri točke.' : v === '6' ? 'Njihajuće čeljusti: svaka čeljust naliježe u dvije točke — šest dodirnih mjesta.' : 'Stezna čahura obuhvaća obradak po cijelom obodu.'); });
  ui.klizac('Tlak stezanja', 5, 40, 1, st.p, v => v + ' bar', v => { st.p = v; if (st.stegnuto) pokreni(); else crtaj(); });
  const r = ui.red();
  ui.gumb('Stegni i pokreni vreteno', pokreni, { u: r });
  ui.gumb('Otpusti', () => { const bio = st.vrti && def() > DOP && st.obr === 'cijev'; st.dOtp = bio ? def() : 0; st.vrti = false; st.stegnuto = false; st.otp = bio; crtaj(); ui.stanje(bio ? 'Cijev je otpuštena i opružila natrag. Promjer koji je tokaren okrugao sada je valovit (crtkano, uvećano) — obradak je škart. Smanjiti tlak ne pomaže jer tada vreteno ne smije krenuti; promijeni stezno sredstvo.' : 'Otpušteno.', bio ? 'opas' : ''); }, { u: r, tanki: true });
  const o = ui.ocit([['f', 'Sila stezanja'], ['d', 'Deformacija obratka'], ['v', 'Vreteno smije krenuti']]);
  ctx.petlja(dt => { if (!st.vrti) return false; st.kut += dt * 3; gRot.setAttribute('transform', `rotate(${(st.kut * 180 / Math.PI).toFixed(1)} ${CX} ${CY})`); return true; });
  crtaj();
  ui.stanje('Odaberi obradak i stezno sredstvo, namjesti tlak i pritisni „Stegni i pokreni vreteno”.');
}

/* =========================================================== T5./T6. G54 na tokarilici — M i W */
function tG54T(ui, ctx, wks) {
  const ISPR = { x: 0, z: 127.539 }, L1I = 49.606, L2I = 63.485;
  const FACE = 127.539, VG0 = 170, VG1 = 40;
  const START = { z: 250, x: 200 };                         /* vrh alata u MKS (X kao promjer) */
  const PROG = [
    { t: 'N10 G18 G90 G95', o: 'ravnina ZX, apsolutne mjere, posmak u mm/okr' },
    { t: 'N20 G54', o: 'pomak nultočke iz tablice' },
    { t: 'N30 T1 D1', o: 'vanjski nož za grubo tokarenje, korekcija D1' },
    { t: 'N40 G96 S200 M4', o: 'stalna brzina rezanja, vreteno lijevo' },
    { t: 'N50 G0 X76 Z2', o: 'brzi hod 2 mm ispred čela', g: 0, x: 76, z: 2 },
    { t: 'N60 G1 Z-25 F0.25', o: 'uzdužno tokarenje na Ø76', g: 1, z: -25 },
    { t: 'N70 G1 X84', o: 'izlaz iz materijala', g: 1, x: 84 },
    { t: 'N80 G0 X120 Z50', o: 'brzi hod od obratka', g: 0, x: 120, z: 50 },
    { t: 'N90 M30', o: 'kraj programa' }
  ];
  const st = { off: { ...ISPR }, L1: L1I, L2: L2I, p: { ...START }, radi: false, blok: -1, cilj: null, g: 0, sudar: null, rez: [], kraj: false, w: null };
  const svg = ui.svg(610, 380, 'Bokocrt stezne glave s obratkom, nultočkom stroja M i nultočkom obratka W, alat s referentnom točkom revolvera F i putanja vrha alata');
  const sc = 1.3, x = (Z) => 30 + (Z + 15) * sc, y = (r) => 222 - r * sc;
  S('line', { x1: 10, y1: y(0), x2: 600, y2: y(0), class: 't2d-os-crta' }, svg);
  S('rect', { x: x(-15), y: y(115), width: 15 * sc, height: 230 * sc, class: 't2d-stol' }, svg);
  S('rect', { x: x(0), y: y(105), width: 60 * sc, height: 210 * sc, class: 't2d-kuciste' }, svg);
  for (const zn of [1, -1]) S('rect', { x: x(60), y: zn > 0 ? y(100) : y(-40), width: 25 * sc, height: 60 * sc, class: 't2d-celjust' }, svg);
  const obr = S('rect', { x: x(40), y: y(40), width: (FACE - 40) * sc, height: 80 * sc, class: 't2d-obradak' }, svg);
  void obr;
  const gRez = S('g', {}, svg);
  T(svg, x(30), y(-128), 'stezna glava', 't2d-ls', 'middle');
  const trag = S('polyline', { class: 't2d-trag' }, svg);
  function nultocka(px, py, slovo, kl, dolje) {
    const gg = S('g', { class: kl }, svg);
    S('circle', { cx: px, cy: py, r: 8, class: 't2d-nt-k' }, gg);
    S('path', { d: `M${px},${py} L${px + 8},${py} A8,8 0 0 1 ${px},${py + 8} Z M${px},${py} L${px - 8},${py} A8,8 0 0 1 ${px},${py - 8} Z`, class: 't2d-nt-p' }, gg);
    T(gg, px - 10, dolje ? py + 24 : py - 12, slovo, 't2d-lb', 'end');
  }
  nultocka(x(0), y(0), 'M', 't2d-nt-M', true);
  nultocka(x(FACE), y(0), 'W', 't2d-nt-W', true);
  const vG = strel(svg, 0, 0, 1, 1, { boja: 'var(--teal)', w: 2, gl: 9 });
  const gG54 = S('g', {}, svg); S('circle', { r: 6, fill: 'none', stroke: B.crv, 'stroke-width': 2.5 }, gG54); S('path', { d: 'M-9,-9 L9,9 M-9,9 L9,-9', stroke: B.crv, 'stroke-width': 2 }, gG54); T(gG54, 10, -10, 'G54', 't2d-ls').style.fill = B.crv;
  /* alat: vrh u ishodištu grupe; F je na (L2, −L1) */
  const al = S('g', {}, svg);
  const alF = S('g', {}, al);
  S('polygon', { points: '0,0 14,-4 22,-20 8,-16', class: 't2d-alat-s' }, al);
  const drz = S('rect', { class: 't2d-drzac' }, al);
  const tF = S('g', {}, alF); S('circle', { r: 5, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 }, tF); S('path', { d: 'M-7,0 L7,0 M0,-7 L0,7', stroke: 'var(--ink)', 'stroke-width': 1.5 }, tF); T(tF, 9, -8, 'F', 't2d-lb');
  const kL1 = S('line', { class: 't2d-kota', 'stroke-dasharray': '4 3' }, al), kL2 = S('line', { class: 't2d-kota', 'stroke-dasharray': '4 3' }, al);
  const tL1 = T(al, 0, 0, 'L1', 't2d-ls'), tL2 = T(al, 0, 0, 'L2', 't2d-ls');
  S('circle', { r: 3, fill: B.crv }, al);
  const sud = S('g', { style: 'display:none' }, svg); S('polygon', { points: '0,-22 6,-7 22,-9 10,3 16,19 0,9 -16,19 -10,3 -22,-9 -6,-7', fill: B.crv, opacity: 0.9 }, sud);
  const natSud = T(svg, 600, 24, '', 't2d-lb', 'end'); natSud.style.fill = B.crv;

  /* upravljanje */
  const prog = H('ol', { class: 't2d-prog', 'aria-label': 'NC program' });
  const redovi = PROG.map(b => { const li = H('li', {}, H('code', { tekst: b.t }), H('span', { tekst: b.o })); prog.append(li); return li; });
  const mem = H('div', { class: 't2d-mem' });
  mem.append(H('h4', { tekst: 'Memorija upravljanja' }));
  const tab = H('table', { class: 't2d-tab' });
  tab.append(H('tr', {}, H('th', { tekst: 'Pomak' }), H('th', { tekst: 'X' }), H('th', { tekst: 'Z' })));
  const ulazi = {};
  const rG = H('tr', {}, H('th', { tekst: 'G54' }));
  for (const a of ['x', 'z']) {
    const i = H('input', { type: 'number', step: '0.001', inputmode: 'decimal', value: nc(st.off[a]), 'aria-label': 'G54 ' + a.toUpperCase() });
    ctx.on(i, 'change', () => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) st.off[a] = ogr(v, -300, 400); i.value = nc(st.off[a]); osvjezi(); });
    ulazi[a] = i; rG.append(H('td', {}, i));
  }
  tab.append(rG);
  const rT = H('tr', {}, H('th', { tekst: 'T1 D1' }));
  const iL = {};
  for (const [k, oz] of [['L1', 'Length1'], ['L2', 'Length2']]) {
    const i = H('input', { type: 'number', step: '0.001', inputmode: 'decimal', value: nc(st[k]), 'aria-label': 'T1 D1 ' + oz });
    if (!wks) i.disabled = true;
    ctx.on(i, 'change', () => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) st[k] = ogr(v, 20, 120); i.value = nc(st[k]); osvjezi(); });
    iL[k] = i; rT.append(H('td', {}, H('span', { class: 't2d-sitno', tekst: oz + ' ' }), i));
  }
  tab.append(rT);
  mem.append(tab, H('p', { class: 't2d-sitno', tekst: wks ? 'Stvarni alat: Length1 49.606, Length2 63.485 (primjer).' : 'Korekcije alata su ispravne.' }));
  const pres = H('div', { class: 't2d-red' });
  mem.append(pres);
  ui.upr.append(prog, mem);
  const postavi = (o, L1, L2, txt) => { if (st.radi) return; Object.assign(st.off, o); st.L1 = L1; st.L2 = L2; for (const a in ulazi) ulazi[a].value = nc(st.off[a]); iL.L1.value = nc(st.L1); iL.L2.value = nc(st.L2); ponisti(); ui.stanje(txt); };
  ui.gumb('Ispravno', () => postavi(ISPR, L1I, L2I, 'G54 = X 0 Z 127.539 — pomak od M do W na čelu obratka.'), { tanki: true, u: pres });
  ui.gumb('Z krivo', () => postavi({ ...ISPR, z: 117.539 }, L1I, L2I, 'G54 Z upisan kao 117.539 umjesto 127.539 (zamijenjena znamenka).'), { tanki: true, u: pres });
  ui.gumb('Sve 0.000', () => postavi({ x: 0, z: 0 }, L1I, L2I, 'Tablica G54 prazna (0.000) — kao da pomak nije izmjeren ili G54 nije pozvan.'), { tanki: true, u: pres });
  ui.gumb('X krivo', () => postavi({ ...ISPR, x: 10 }, L1I, L2I, 'G54 X upisan kao 10 umjesto 0.'), { tanki: true, u: pres });
  if (wks) {
    ui.gumb('Length2 kriv', () => postavi(ISPR, L1I, 53.485, 'Length2 alata upisan kao 53.485, a stvarni je 63.485.'), { tanki: true, u: pres });
    ui.gumb('Length1 kriv', () => postavi(ISPR, 47.606, L2I, 'Length1 alata upisan kao 47.606, a stvarni je 49.606.'), { tanki: true, u: pres });
  }
  const r = ui.red();
  const bS = ui.gumb('CYCLE START', () => pokreni(), { u: r, aria: 'CYCLE START — pokreni program' });
  ui.gumb('RESET', () => { ponisti(); ui.stanje('RESET: alat na početnom položaju.'); }, { u: r, tanki: true });
  const o = ui.ocit([['mks', 'Vrh alata u MKS (od M)'], ['wks', 'Vrh alata u WKS (kako ga vidi upravljanje)'], ['bl', 'Blok']]);

  function ponisti() {
    st.radi = false; st.blok = -1; st.cilj = null; st.sudar = null; st.rez = []; st.kraj = false; st.trag = [[START.z, START.x, 0]];
    st.p = { ...START }; st.w = null;
    sud.style.display = 'none'; natSud.textContent = ''; bS.disabled = false;
    osvjezi();
  }
  function pokreni() { if (st.radi) return; if (st.kraj || st.sudar) ponisti(); st.radi = true; st.blok = -1; bS.disabled = true; sljedeci(); ctx.budi(); }
  function sljedeci() {
    st.blok++;
    if (st.blok >= PROG.length) { zavrsi(); return; }
    const b = PROG[st.blok]; st.cilj = null;
    if (b.g != null) {
      st.w = st.w || { x: null, z: null };
      for (const a of ['x', 'z']) if (b[a] != null) st.w[a] = b[a];
      /* stvarni vrh = G54 + programirano + (upisana korekcija − stvarna korekcija) */
      const c = {
        x: b.x != null ? st.off.x + b.x + 2 * (st.L1 - L1I) : st.p.x,
        z: b.z != null ? st.off.z + b.z + (st.L2 - L2I) : st.p.z
      };
      st.cilj = c; st.g = b.g;
    } else st.pauza = 0.45;
    osvjezi();
  }
  function kolizija(p, g1) {
    const r = p.x / 2;
    if (p.z < 0) return 'prirubnicu vretena';
    if (p.z < 60 && r < 105) return 'steznu glavu';
    if (p.z < 85 && r < 100 && r > 40) return 'stezne čeljusti';
    if (p.z < FACE && p.z > 40 && r < 40) { const rr = st.rez.find(q => p.z >= q.z0 && p.z <= q.z1); const gr = rr ? rr.r : 40; if (r < gr - 0.01) { if (!g1) return 'obradak'; return '+rez'; } }
    return null;
  }
  function zavrsi() {
    st.radi = false; st.kraj = true; bS.disabled = false;
    const kriv = Math.abs(st.off.x - ISPR.x) > 0.0005 || Math.abs(st.off.z - ISPR.z) > 0.0005 || Math.abs(st.L1 - L1I) > 0.0005 || Math.abs(st.L2 - L2I) > 0.0005;
    const rez = st.rez.length ? st.rez[0] : null;
    if (!kriv) ui.stanje('Program je završen: na obratku je tokaren promjer Ø76 u duljini 25 mm od čela W. Obrada je ispravna.', 'ok');
    else if (!rez) ui.stanje('Program je završen bez sudara, ali alat je rezao zrak — promjer Ø76 nije izrađen.', 'upoz');
    else ui.stanje(`Program je završen bez sudara, ali izrađen je promjer Ø${hr(2 * rez.r, 1)} u duljini ${hr(FACE - rez.z0, 1)} mm — obradak je škart.`, 'upoz');
    osvjezi();
  }
  function osvjezi() {
    const p = st.p;
    al.setAttribute('transform', `translate(${x(p.z).toFixed(1)} ${y(p.x / 2).toFixed(1)})`);
    const fx = L2I * sc, fy = -L1I * sc;
    alF.setAttribute('transform', `translate(${fx.toFixed(1)} ${fy.toFixed(1)})`);
    drz.setAttribute('x', 14); drz.setAttribute('y', fy - 16); drz.setAttribute('width', fx - 6); drz.setAttribute('height', -fy);
    for (const [ln, x1, y1, x2, y2] of [[kL1, fx + 14, 0, fx + 14, fy], [kL2, 0, 14, fx, 14]]) { ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2); ln.style.display = wks ? '' : 'none'; }
    tL1.setAttribute('x', fx + 18); tL1.setAttribute('y', fy / 2); tL2.setAttribute('x', fx / 2 - 8); tL2.setAttribute('y', 30);
    tL1.style.display = tL2.style.display = wks ? '' : 'none';
    vG.set(x(0), y(0), x(st.off.z), y(st.off.x / 2));
    const ok = Math.abs(st.off.x - ISPR.x) < 0.5 && Math.abs(st.off.z - ISPR.z) < 0.5;
    gG54.setAttribute('transform', `translate(${x(st.off.z).toFixed(1)} ${y(st.off.x / 2).toFixed(1)})`); gG54.style.display = ok ? 'none' : '';
    trag.setAttribute('points', (st.trag || []).map(q => x(q[0]).toFixed(1) + ',' + y(q[1] / 2).toFixed(1)).join(' '));
    gRez.replaceChildren();
    for (const q of st.rez) for (const zn of [1, -1]) S('rect', { x: x(q.z0), y: zn > 0 ? y(40) : y(-q.r), width: (q.z1 - q.z0) * sc, height: (40 - q.r) * sc, fill: 'var(--karta)', stroke: 'var(--ink)', 'stroke-width': 1 }, gRez);
    redovi.forEach((li, i) => li.classList.toggle('t2d-akt', i === st.blok));
    o.mks(`X ${nc(p.x)}  Z ${nc(p.z)}`);
    o.wks(st.blok < 1 ? '— (G54 još nije pozvan)' : `X ${nc(p.x - st.off.x - 2 * (st.L1 - L1I))}  Z ${nc(p.z - st.off.z - (st.L2 - L2I))}`);
    o.bl(st.blok >= 0 && st.blok < PROG.length ? PROG[st.blok].t : (st.kraj ? 'kraj programa' : '—'));
  }
  ctx.petlja(dt => {
    if (!st.radi) return false;
    if (!st.cilj) { st.pauza -= dt; if (st.pauza <= 0) sljedeci(); return st.radi; }
    const v = st.g === 0 ? VG0 : VG1;
    let ost = v * dt;
    while (ost > 0 && st.cilj) {
      const dz = st.cilj.z - st.p.z, dx = (st.cilj.x - st.p.x) / 2, L = Math.hypot(dz, dx);
      if (L < 1e-6) { st.p = { ...st.cilj }; st.cilj = null; break; }
      const k = Math.min(1, ost, L);
      st.p = { z: st.p.z + dz / L * k, x: st.p.x + 2 * dx / L * k };
      ost -= k;
      const s = kolizija(st.p, st.g === 1);
      if (s === '+rez') {
        const r = st.p.x / 2; let q = st.rez.find(q2 => Math.abs(q2.r - r) < 0.05);
        if (!q) { q = { z0: st.p.z, z1: FACE, r }; st.rez.push(q); }
        q.z0 = Math.min(q.z0, st.p.z);
      } else if (s) {
        st.sudar = s; st.radi = false; st.cilj = null; bS.disabled = false;
        st.trag.push([st.p.z, st.p.x]);
        sud.setAttribute('transform', `translate(${x(st.p.z)} ${y(st.p.x / 2)})`); sud.style.display = ''; natSud.textContent = 'SUDAR!';
        const b = PROG[st.blok].t;
        const krivo = Math.abs(st.L2 - L2I) > 0.0005 && wks ? 'podatak alata Length2' : 'pomak nultočke G54';
        ui.stanje(`SUDAR u bloku ${b}: alat je ${st.g === 0 ? 'brzim hodom ' : ''}udario u ${s}. Program je bio ispravan — kriv je ${krivo}.`, 'opas');
        osvjezi(); return false;
      }
      if (L <= k + 1e-9) { st.p = { ...st.cilj }; st.cilj = null; }
    }
    const z0 = st.trag[st.trag.length - 1];
    if (!z0 || Math.hypot(z0[0] - st.p.z, (z0[1] - st.p.x) / 2) > 2 || !st.cilj) st.trag.push([st.p.z, st.p.x]);
    if (!st.cilj) st.pauza = 0.3;
    osvjezi();
    return true;
  });
  ponisti();
  ui.stanje(wks ? 'W je na osi, na čelu obratka. F je referentna točka revolvera; L1 i L2 su korekcije alata. Odaberi vrijednosti i pritisni CYCLE START.' : 'M je nultočka stroja na čelu prirubnice vretena. Vektor od M do W je pomak G54. Odaberi vrijednosti i pritisni CYCLE START.');
}

/* =========================================================== 11. regulacijski krug */
function tRegulacija(ui, ctx) {
  const P = 10;                                   // uspon vretena [mm]
  const st = { kv: 1.0, F: 2000, cilj: 80, xs: 0, xa: 0, v: 0, vs: 0, t: 0, radi: false, faza: -1, tf: 0, hist: [], tok: 0, start: 0, zadnjiT: 0 };
  const TV = 0.02;
  const svg = ui.svg(600, 440, 'Blok-shema regulacijskog kruga osi Z s povratnom vezom i graf zadanog i stvarnog položaja');
  const blok = (x, y, w, h, t1, t2) => {
    const g = S('g', { class: 't2d-rb' }, svg);
    S('rect', { x, y, width: w, height: h, rx: 7 }, g);
    T(g, x + w / 2, y + (t2 ? h / 2 - 3 : h / 2 + 5), t1, 't2d-l', 'middle');
    if (t2) T(g, x + w / 2, y + h / 2 + 15, t2, 't2d-ls', 'middle');
    return g;
  };
  const vod = (pts) => {
    const g = S('g', {}, svg);
    S('polyline', { points: pts, class: 't2d-vod-r' }, g);
    const t = S('polyline', { points: pts, class: 't2d-tok-r' }, g);
    const z = pts.trim().split(' ').slice(-2).map(p => p.split(',').map(Number));
    const [a, b] = z, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    S('polygon', { points: `${b[0]},${b[1]} ${b[0] - ux * 9 - uy * 5},${b[1] - uy * 9 + ux * 5} ${b[0] - ux * 9 + uy * 5},${b[1] - uy * 9 - ux * 5}`, fill: 'var(--ink)' }, g);
    g.tok = t; return g;
  };
  const bNC = blok(8, 24, 128, 52, 'NC blok', 'N50 G1 Z80');
  const bIP = blok(166, 24, 120, 52, 'Interpolacija', '(NCU)');
  const sum = S('g', { class: 't2d-rb' }, svg);
  S('circle', { cx: 330, cy: 50, r: 17 }, sum);
  T(sum, 330, 56, 'Σ', 't2d-lb', 'middle');
  T(svg, 304, 42, '+', 't2d-lb', 'middle'); T(svg, 344, 84, '−', 't2d-lb', 'middle');
  const bRP = blok(378, 24, 112, 52, 'Regulator', 'položaja (Kv)');
  const bMO = blok(470, 118, 122, 52, 'Modul osi Z', 'brzina, struja');
  const bSM = blok(306, 118, 128, 52, 'Servomotor', '');
  const bKV = blok(118, 118, 152, 52, 'Kuglično vreteno', '');
  const bRZ = blok(286, 204, 168, 40, 'Mjerni sustav', '');
  // mali stol u bloku vretena
  bKV.querySelector('text').setAttribute('y', 141);
  S('line', { x1: 130, y1: 162, x2: 258, y2: 162, stroke: 'var(--body)', 'stroke-width': 2 }, svg);
  const stolic = S('rect', { x: 130, y: 153, width: 24, height: 9, rx: 2, fill: 'var(--teal)' }, svg);
  const vodovi = [
    vod('136,50 166,50'), vod('286,50 313,50'), vod('347,50 378,50'),
    vod('490,50 531,50 531,118'), vod('470,144 434,144'), vod('306,144 270,144'),
    vod('370,170 370,204'),
    vod('286,224 100,224 100,100 330,100 330,67')
  ];
  T(svg, 290, 18, 'zadana vrijednost', 't2d-ls', 'middle');
  T(svg, 196, 114, 'stvarna vrijednost (povratna veza)', 't2d-ls', 'middle').setAttribute('y', 96);
  const redB = [bNC, bIP, sum, bRP, bMO, bSM, bKV, bRZ];
  // graf
  const gx0 = 56, gx1 = 588, gy0 = 420, gy1 = 280, YM = 90;
  st.TW = 4.5;
  S('rect', { x: gx0, y: gy1, width: gx1 - gx0, height: gy0 - gy1, class: 't2d-graf' }, svg);
  for (const y of [0, 40, 80]) { const yy = gy0 - y / YM * (gy0 - gy1); S('line', { x1: gx0, y1: yy, x2: gx1, y2: yy, class: 't2d-mreza' }, svg); T(svg, gx0 - 6, yy + 5, String(y), 't2d-ls', 'end'); }
  T(svg, gx0, gy1 - 10, 'Položaj osi Z [mm] u vremenu', 't2d-ls');
  const kZ = S('polyline', { class: 't2d-krivulja-z' }, svg), kS = S('polyline', { class: 't2d-krivulja' }, svg);
  T(svg, gx1, gy1 - 10, '— stvarno   - - zadano', 't2d-ls', 'end');
  const tOs = T(svg, gx1, gy0 + 0, '', 't2d-ls', 'end'); tOs.setAttribute('y', gy0 - 6);

  function interp(t) { // trapezni profil brzine, a = 400 mm/s²
    const A = 400, V = st.F / 60, D = st.cilj - st.start, s = Math.sign(D), Da = Math.abs(D);
    const ta = V / A, da = 0.5 * A * ta * ta;
    let x, v;
    if (2 * da >= Da) { const tp = Math.sqrt(Da / A); if (t < tp) { x = 0.5 * A * t * t; v = A * t; } else if (t < 2 * tp) { const u = 2 * tp - t; x = Da - 0.5 * A * u * u; v = A * u; } else { x = Da; v = 0; } }
    else { const tc = (Da - 2 * da) / V; if (t < ta) { x = 0.5 * A * t * t; v = A * t; } else if (t < ta + tc) { x = da + V * (t - ta); v = V; } else if (t < 2 * ta + tc) { const u = 2 * ta + tc - t; x = Da - 0.5 * A * u * u; v = A * u; } else { x = Da; v = 0; } }
    return [st.start + s * x, s * v];
  }
  function osvjezi() {
    stolic.setAttribute('x', (130 + st.xa / 90 * 104).toFixed(1));
    const zad = st.hist.map(h => (gx0 + h[0] / st.TW * (gx1 - gx0)).toFixed(1) + ',' + (gy0 - h[1] / YM * (gy0 - gy1)).toFixed(1));
    const stv = st.hist.map(h => (gx0 + h[0] / st.TW * (gx1 - gx0)).toFixed(1) + ',' + (gy0 - h[2] / YM * (gy0 - gy1)).toFixed(1));
    kZ.setAttribute('points', zad.join(' ')); kS.setAttribute('points', stv.join(' '));
    const e = st.xs - st.xa;
    o.zad(hr(st.xs, 3) + ' mm'); o.stv(hr(st.xa, 3) + ' mm');
    o.e(hr(e, 3) + ' mm', Math.abs(e) > 2.5 ? 't2d-upoz' : '');
    o.n(Math.round(st.v * 60 / P) + ' o/min');
    for (const v of vodovi) v.tok.style.strokeDashoffset = (-st.tok).toFixed(1);
  }
  ctx.petlja(dt => {
    st.tok += dt * 40;
    if (st.faza >= 0 && st.faza < redB.length) {     // praćenje toka signala prije gibanja
      st.tf += dt;
      if (st.tf > 0.22) { st.tf = 0; redB.forEach((b, i) => b.classList.toggle('t2d-akt', i === st.faza + 1)); st.faza++; }
      if (st.faza >= redB.length) { redB.forEach(b => b.classList.remove('t2d-akt')); st.radi = true; st.t = 0; st.hist = []; for (const v of vodovi) v.classList.add('t2d-tece'); }
      osvjezi();
      return true;
    }
    if (!st.radi) { osvjezi(); return false; }
    const kv = st.kv * 1000 / 60;  // (m/min)/mm → 1/s
    const h = 0.001, n = Math.max(1, Math.round(dt / h)), hh = dt / n;
    for (let i = 0; i < n; i++) {
      st.t += hh;
      const [xs, vs] = interp(st.t);
      st.xs = xs; st.vs = vs;
      const vref = ogr(kv * (xs - st.xa), -300, 300);
      st.v += (vref - st.v) / TV * hh;
      st.xa += st.v * hh;
    }
    st.hist.push([st.t, st.xs, st.xa]);
    const gotovo = st.t > 1.5 && Math.abs(st.xs - st.cilj) < 1e-6 && Math.abs(st.xa - st.cilj) < 0.002 && Math.abs(st.v) < 0.05;
    const e = st.xs - st.xa;
    if (Math.abs(Math.abs(st.vs) - st.F / 60) < 1e-6 && st.t > 0.3) ui.stanje(`Os se giba stalnom brzinom: stvarni položaj zaostaje za zadanim ${hr(Math.abs(e), 2)} mm (v / Kv = ${hr(Math.abs(st.vs) / kv, 2)} mm).`);
    if (gotovo || st.t > st.TW) {
      st.radi = false; bC.disabled = false;
      for (const v of vodovi) v.classList.remove('t2d-tece');
      const prebac = st.hist.reduce((m, q) => Math.max(m, (q[2] - st.cilj) * Math.sign(st.cilj - st.start)), 0);
      ui.stanje(`Os je na cilju Z${st.cilj}. ${prebac > 0.05 ? `Nadvišenje ${hr(prebac, 2)} mm — Kv je previsok za ovaj pogon.` : 'Bez nadvišenja.'} Pritisni ponovno „Cycle Start” za povratak.`, prebac > 0.05 ? 'upoz' : 'ok');
      st.cilj = st.cilj === 80 ? 0 : 80;
      bNC.querySelectorAll('text')[1].textContent = 'N50 G1 Z' + st.cilj;
    }
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bC = ui.gumb('Cycle Start', () => {
    if (st.radi || (st.faza >= 0 && st.faza < redB.length)) return;
    st.start = st.xa; st.faza = 0; st.tf = 0.22; bC.disabled = true;
    { const V = st.F / 60; st.TW = Math.max(3, Math.abs(st.cilj - st.start) / V + V / 400 + 0.8); tOs.textContent = 't [s], 0 … ' + hr(st.TW, 1); }
    redB.forEach(b => b.classList.remove('t2d-akt'));
    ui.stanje(`Upravljanje tumači blok N50 G1 Z${st.cilj} F${st.F}, interpolacija računa zadane položaje, a regulator uspoređuje zadano i stvarno…`);
    ctx.budi();
  }, { u: r, aria: 'Cycle Start — pokreni blok' });
  ui.klizac('Kv-faktor', 0.5, 3, 0.1, st.kv, v => hr(v, 1) + ' (m/min)/mm', v => { st.kv = v; });
  ui.klizac('Posmak F', 500, 5000, 100, st.F, v => v + ' mm/min', v => { st.F = v; });
  const o = ui.ocit([['zad', 'Zadani položaj Z'], ['stv', 'Stvarni položaj Z'], ['e', 'Slijedna pogreška'], ['n', 'Brzina motora (uspon 10 mm)']]);
  osvjezi();
  ui.stanje('Pritisni „Cycle Start”.');
}

/* =========================================================== 12. PLC */
function tPlc(ui, ctx) {
  const st = { vrata: true, gljiva: true, slobodno: true, most: false, prikaz: 'vrata', radi: false, kut: 0, vrPol: 1 };
  const svg = ui.svg(600, 380, 'Stroj s vratima, gljivom za nužno zaustavljanje i graničnim prekidačem; PLC logika s I-vratima ili ljestvičastim prikazom');
  // stroj (lijevo)
  const gS = S('g', {}, svg);
  S('rect', { x: 14, y: 40, width: 222, height: 230, rx: 8, class: 't2d-kuciste' }, gS);
  S('rect', { x: 26, y: 56, width: 198, height: 160, class: 't2d-komora' }, gS);
  // unutrašnjost: glava, alat, stol, granični prekidač
  S('rect', { x: 92, y: 60, width: 46, height: 46, class: 't2d-tamno' }, gS);
  const vret = S('g', { transform: 'translate(115 120)' }, gS);
  S('rect', { x: -5, y: -14, width: 10, height: 26, class: 't2d-alat-s' }, vret);
  const vrCrta = S('line', { x1: -5, y1: 0, x2: 5, y2: 0, stroke: 'var(--paper)', 'stroke-width': 2 }, vret);
  const stol = S('rect', { y: 176, width: 110, height: 12, rx: 2, class: 't2d-pomicni' }, gS);
  S('rect', { x: 30, y: 188, width: 190, height: 20, class: 't2d-metal' }, gS);
  const gp = S('g', {}, gS);
  S('rect', { x: 206, y: 168, width: 14, height: 18, class: 't2d-tamno' }, gp);
  const gpPol = S('line', { x1: 206, y1: 172, x2: 194, y2: 166, stroke: 'var(--ink)', 'stroke-width': 3 }, gp);
  T(gS, 206, 160, 'granični', 't2d-ls', 'middle');
  // vrata
  const vr = S('g', {}, gS);
  S('rect', { x: 26, y: 56, width: 100, height: 160, rx: 3, class: 't2d-vrata' }, vr);
  S('rect', { x: 40, y: 72, width: 72, height: 80, rx: 3, class: 't2d-prozor' }, vr);
  S('rect', { x: 112, y: 132, width: 6, height: 26, rx: 2, fill: 'var(--ink)' }, vr);
  const skl = S('rect', { x: 126, y: 58, width: 10, height: 14, class: 't2d-tamno' }, gS);
  // upravljačka ploča
  S('rect', { x: 14, y: 282, width: 222, height: 72, rx: 8, class: 't2d-kuciste' }, gS);
  const glj = S('g', { transform: 'translate(60 318)' }, gS);
  S('circle', { r: 24, fill: B.zut, stroke: 'var(--ink)', 'stroke-width': 1.5 }, glj);
  const gljG = S('circle', { r: 16, fill: B.crv, stroke: 'var(--ink)', 'stroke-width': 1.5 }, glj);
  T(gS, 60, 372, 'gljiva', 't2d-ls', 'middle');
  const lampa = S('circle', { cx: 190, cy: 318, r: 14, stroke: 'var(--ink)', 'stroke-width': 1.5 }, gS);
  T(gS, 190, 372, 'stroj radi', 't2d-ls', 'middle');
  const upoz = S('g', { style: 'display:none' }, gS);
  S('rect', { x: 26, y: 220, width: 198, height: 44, rx: 6, fill: B.crv }, upoz);
  T(upoz, 125, 240, 'OPASNOST PO ŽIVOT!', 't2d-lb', 'middle').style.fill = '#fff';
  T(upoz, 125, 258, 'vrata otvorena, stroj radi', 't2d-ls', 'middle').style.fill = '#fff';
  // logika (desno)
  const gL = S('g', {}, svg);
  function crtajLogiku() {
    gL.replaceChildren();
    const ul = [['I0.0', 'vrata zatvorena'], ['I0.1', 'gljiva otpuštena'], ['I0.2', 'granični slobodan']];
    if (st.prikaz === 'vrata') {
      gL.ul = ul.map(([a, t], i) => {
        const y = 92 + i * 70;
        const g = S('g', {}, gL);
        T(g, 262, y - 12, a + ' ' + t, 't2d-ls');
        const ln = S('line', { x1: 262, y1: y, x2: 420, y2: y, class: 't2d-signal-l' }, g);
        const v = T(g, 404, y + 24, '0', 't2d-lb', 'middle');
        return { ln, v };
      });
      S('rect', { x: 420, y: 64, width: 72, height: 168, rx: 4, class: 't2d-simbol' }, gL);
      T(gL, 456, 158, '&', 't2d-vrata-z', 'middle');
      gL.izl = S('line', { x1: 492, y1: 148, x2: 548, y2: 148, class: 't2d-signal-l' }, gL);
      gL.lam = S('circle', { cx: 566, cy: 148, r: 18, stroke: 'var(--ink)', 'stroke-width': 1.5 }, gL);
      gL.qv = T(gL, 520, 138, '0', 't2d-lb', 'middle');
      T(gL, 566, 196, 'Q0.0', 't2d-l', 'middle');
      T(gL, 598, 214, 'smije krenuti', 't2d-ls', 'end');
      T(gL, 262, 290, 'I-vrata (AND): izlaz je 1 samo', 't2d-ls');
      T(gL, 262, 308, 'kad su svi ulazi 1.', 't2d-ls');
    } else {
      S('line', { x1: 262, y1: 60, x2: 262, y2: 250, class: 't2d-sabirnica' }, gL);
      S('line', { x1: 590, y1: 60, x2: 590, y2: 250, class: 't2d-sabirnica' }, gL);
      const y = 150, xs = [300, 380, 460];
      gL.seg = [];
      const tocke = [262, ...xs.flatMap(x => [x - 12, x + 12]), 528, 552, 590];
      for (let i = 0; i < tocke.length - 1; i += 2) gL.seg.push(S('line', { x1: tocke[i], y1: y, x2: tocke[i + 1], y2: y, class: 't2d-signal-l' }, gL));
      gL.kont = ul.map(([a, t], i) => {
        const x = xs[i], g = S('g', {}, gL);
        S('path', { d: `M${x - 12},${y - 16} v32 M${x + 12},${y - 16} v32`, class: 't2d-simbol-c' }, g);
        T(g, x, y - 46, a, 't2d-ls', 'middle');
        T(g, x, y - 28, t.split(' ')[0], 't2d-ls', 'middle');
        const v = T(g, x, y + 40, '0', 't2d-lb', 'middle');
        return { g, v };
      });
      gL.zav = S('path', { d: `M532,${y - 16} Q522,${y} 532,${y + 16} M548,${y - 16} Q558,${y} 548,${y + 16}`, class: 't2d-simbol-c' }, gL);
      T(gL, 540, y - 28, 'Q0.0', 't2d-ls', 'middle');
      gL.qv = T(gL, 540, y + 40, '0', 't2d-lb', 'middle');
      T(gL, 262, 290, 'LAD: kontakti u nizu = I-veza.', 't2d-ls');
      T(gL, 262, 308, 'Struja teče samo kroz zatvorene.', 't2d-ls');
    }
    osvjezi();
  }
  const ulazi = () => [st.vrata || st.most, st.gljiva, st.slobodno];
  function osvjezi() {
    const u = ulazi(), q = u.every(Boolean);
    vr.setAttribute('transform', `translate(${((1 - st.vrPol) * 96).toFixed(1)} 0)`);
    skl.style.fill = st.most ? B.crv : '';
    stol.setAttribute('x', st.slobodno ? 60 : 96);
    gpPol.setAttribute('x2', st.slobodno ? 194 : 200); gpPol.setAttribute('y2', st.slobodno ? 166 : 176);
    gljG.setAttribute('r', st.gljiva ? 16 : 12);
    lampa.style.fill = st.radi ? B.zel : 'var(--tanko)';
    upoz.style.display = st.radi && !st.vrata ? '' : 'none';
    vrCrta.setAttribute('x1', (-5 * Math.cos(st.kut)).toFixed(1)); vrCrta.setAttribute('x2', (5 * Math.cos(st.kut)).toFixed(1));
    const boja = (e, on) => e.classList.toggle('t2d-signal-1', !!on);
    if (gL.ul) {
      gL.ul.forEach((x, i) => { boja(x.ln, u[i]); x.v.textContent = u[i] ? '1' : '0'; x.v.style.fill = u[i] ? B.zel : B.crv; });
      boja(gL.izl, q); gL.lam.style.fill = q ? B.zel : 'var(--tanko)';
    }
    if (gL.seg) {
      let tece = true;
      gL.seg.forEach((s, i) => { boja(s, tece); if (i < 3) tece = tece && u[i]; });
      gL.kont.forEach((k, i) => { k.v.textContent = u[i] ? '1' : '0'; k.v.style.fill = u[i] ? B.zel : B.crv; k.g.classList.toggle('t2d-zatv', !!u[i]); });
      gL.zav.classList.toggle('t2d-signal-1', q);
    }
    if (gL.qv) { gL.qv.textContent = q ? '1' : '0'; gL.qv.style.fill = q ? B.zel : B.crv; }
    // tablica
    const idx = (u[2] ? 4 : 0) + (u[1] ? 2 : 0) + (u[0] ? 1 : 0);
    tab.querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('t2d-akt', i === idx));
    bV.textContent = st.vrata ? 'Otvori vrata' : 'Zatvori vrata';
    bG.textContent = st.gljiva ? 'Pritisni gljivu' : 'Otpusti gljivu';
    bL.textContent = st.slobodno ? 'Saonice na granični' : 'Saonice s graničnog';
  }
  function provjeri(dog) {
    const u = ulazi(), q = u.every(Boolean);
    if (st.radi && !q) {
      st.radi = false;
      ui.stanje(`Q0.0 = 0: ${dog} — PLC je odmah zaustavio stroj.`, 'upoz');
    } else if (st.radi && !st.vrata && st.most) {
      ui.stanje('Vrata su otvorena, a stroj i dalje radi jer je sigurnosna sklopka premoštena. Opasnost po život — nikad ne premošćuj sigurnosne sklopke!', 'opas');
    } else if (dog) ui.stanje(`${dog}. Q0.0 = ${q ? 1 : 0}${q ? ' — stroj smije krenuti (CYCLE START).' : ' — pokretanje je blokirano.'}`, q ? 'ok' : null);
    osvjezi(); ctx.budi();
  }
  ctx.petlja(dt => {
    let ide = false;
    const c = st.vrata ? 1 : 0;
    if (st.vrPol !== c) { st.vrPol = pribl(st.vrPol, c, dt * 2.5); ide = true; }
    if (st.radi) { st.kut += dt * 14; ide = true; }
    osvjezi();
    return ide;
  });
  ui.seg('Prikaz', [['vrata', 'Logička vrata'], ['lad', 'Ljestvičasti (LAD)']], st.prikaz, v => { st.prikaz = v; crtajLogiku(); });
  const r = ui.red();
  const bV = ui.gumb('Otvori vrata', () => { st.vrata = !st.vrata; provjeri(st.vrata ? 'Vrata zatvorena' : 'Vrata otvorena'); }, { u: r, tanki: true });
  const bG = ui.gumb('Pritisni gljivu', () => { st.gljiva = !st.gljiva; provjeri(st.gljiva ? 'Gljiva otpuštena (zakretanjem)' : 'Gljiva za nužno zaustavljanje pritisnuta'); }, { u: r, tanki: true });
  const bL = ui.gumb('Saonice na granični', () => { st.slobodno = !st.slobodno; provjeri(st.slobodno ? 'Saonice odmaknute s graničnog prekidača' : 'Saonice su na graničnom prekidaču'); }, { u: r, tanki: true });
  const r2 = ui.red();
  ui.gumb('CYCLE START', () => {
    const q = ulazi().every(Boolean);
    if (!q) { ui.stanje('Start je blokiran: Q0.0 = 0. Ispuni sva tri uvjeta.', 'upoz'); return; }
    st.radi = true; ui.stanje(!st.vrata ? 'Stroj je krenuo s otvorenim vratima jer je sklopka premoštena. Opasnost po život!' : 'Stroj radi. Probaj otvoriti vrata ili pritisnuti gljivu.', !st.vrata ? 'opas' : 'ok'); osvjezi(); ctx.budi();
  }, { u: r2 });
  const lm = H('label', { class: 't2d-most' });
  const cb = H('input', { type: 'checkbox' });
  lm.append(cb, document.createTextNode(' Premosti sigurnosnu sklopku vrata (samo za pokazati — nikad na stroju!)'));
  r2.append(lm);
  ctx.on(cb, 'change', () => { st.most = cb.checked; provjeri(st.most ? 'Sklopka vrata premoštena: PLC uvijek vidi „vrata zatvorena”' : 'Premoštenje uklonjeno'); });
  const tab = H('table', { class: 't2d-tab t2d-istina' });
  tab.append(H('thead', {}, H('tr', {}, H('th', { tekst: 'I0.2' }), H('th', { tekst: 'I0.1' }), H('th', { tekst: 'I0.0' }), H('th', { tekst: 'Q0.0' }))));
  const tb = H('tbody');
  for (let i = 0; i < 8; i++) { const a = i & 1, b = (i >> 1) & 1, c = (i >> 2) & 1; tb.append(H('tr', {}, H('td', { tekst: String(c) }), H('td', { tekst: String(b) }), H('td', { tekst: String(a) }), H('td', { tekst: String(a & b & c) }))); }
  tab.append(tb);
  ui.ocitP.append(H('h4', { class: 't2d-podnaslov', tekst: 'Tablica istinitosti I-veze' }), tab);
  crtajLogiku();
  ui.stanje('Svi uvjeti su ispunjeni: Q0.0 = 1. Pritisni CYCLE START.', 'ok');
}

/* =========================================================== 13. napajanje */
function tNapajanje(ui, ctx) {
  const st = { ukljuceno: false, mp: 1, faza: 0, svjetlo: 0 };
  const svg = ui.svg(600, 548, 'Blok-shema napojnog modula od mreže do 24 V DC s mjernim točkama i osciloskopom');
  const blok = (x, y, t, ikona) => {
    const g = S('g', { class: 't2d-nb' }, svg);
    S('rect', { x, y, width: 150, height: 74, rx: 8 }, g);
    const ig = S('g', { transform: `translate(${x + 75} ${y + 26})`, class: 't2d-ikona' }, g);
    ikona(ig);
    T(g, x + 75, y + 64, t, 't2d-l', 'middle');
    return g;
  };
  const sinus = (g, a, w) => S('path', { d: `M${-w},0 C${-w * 0.6},${-a} ${-w * 0.4},${-a} 0,0 C${w * 0.4},${a} ${w * 0.6},${a} ${w},0` }, g);
  const bl = [
    blok(10, 20, 'Mreža 3~ 400 V', g => sinus(g, 14, 22)),
    blok(225, 20, 'Filtar', g => { S('path', { d: 'M-26,0 h8 c3,-10 9,-10 12,0 c3,-10 9,-10 12,0 h20 M14,0 v8 M6,8 h16 M6,13 h16 M14,13 v6' }, g); }),
    blok(440, 20, 'Transformator', g => { S('path', { d: 'M-20,-14 c12,0 12,7 0,7 c12,0 12,7 0,7 c12,0 12,7 0,7 c12,0 12,7 0,7 M20,-10 c-10,0 -10,6 0,6 c-10,0 -10,6 0,6 c-10,0 -10,6 0,6 M-3,-16 v34 M3,-16 v34' }, g); }),
    blok(440, 170, 'Ispravljač', g => { S('path', { d: 'M0,-17 L17,0 L0,17 L-17,0 Z M-6,-6 l6,-6 M-6,-12 l6,6 l6,-6' }, g); }),
    blok(225, 170, 'Filtarski lanac', g => { S('path', { d: 'M-26,0 h6 c3,-10 9,-10 12,0 c3,-10 9,-10 12,0 h22 M-22,0 v6 M-30,6 h16 M-30,11 h16 M18,0 v6 M10,6 h16 M10,11 h16' }, g); }),
    blok(10, 170, 'Regulacija', g => { S('rect', { x: -18, y: -14, width: 36, height: 28, rx: 3 }, g); T(g, 0, 5, '24 V', 't2d-ls', 'middle'); })
  ];
  const vod = pts => S('polyline', { points: pts, class: 't2d-vod-n' }, svg);
  const vodovi = [vod('160,57 225,57'), vod('375,57 440,57'), vod('515,94 515,170'), vod('440,207 375,207'), vod('225,207 160,207'), vod('85,244 85,300 210,300')];
  // izlaz
  const izl = S('g', {}, svg);
  S('rect', { x: 210, y: 282, width: 196, height: 36, rx: 6, class: 't2d-blok' }, izl);
  T(izl, 308, 305, '24 V DC → elektronika', 't2d-ls', 'middle');
  const ledI = S('circle', { cx: 424, cy: 300, r: 9, stroke: 'var(--ink)', 'stroke-width': 1.5 }, svg);
  // glavna sklopka
  const sk = S('g', { class: 't2d-sklopka', role: 'button', tabindex: '0', 'aria-label': 'Glavna sklopka' }, svg);
  S('circle', { cx: 60, cy: 132, r: 22, class: 't2d-sklopka-k' }, sk);
  const ruc = S('rect', { x: 56, y: 112, width: 8, height: 40, rx: 3, fill: B.crv }, sk);
  T(sk, 92, 128, 'glavna', 't2d-ls'); T(sk, 92, 144, 'sklopka', 't2d-ls');
  const natSk = T(sk, 26, 138, '0', 't2d-lb', 'middle');
  // mjerne točke
  const MP = [
    [192, 57, 'MP0', 'mreža prije filtra'], [407, 57, 'MP1', 'iza filtra'], [515, 132, 'MP2', 'iza transformatora'],
    [407, 207, 'MP3', 'iza ispravljača'], [192, 207, 'MP4', 'iza filtarskog lanca'], [150, 300, 'MP5', 'iza regulacije']
  ];
  const mpG = MP.map(([x, y, n], i) => {
    const g = S('g', { class: 't2d-mp', role: 'button', tabindex: '0', 'aria-label': `Mjerna točka ${n}` }, svg);
    S('circle', { cx: x, cy: y, r: 11 }, g);
    T(g, x, y - 17, n, 't2d-ls', 'middle');
    const f = () => odaberi(i);
    ctx.on(g, 'click', f);
    ctx.on(g, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } });
    return g;
  });
  // osciloskop
  const ox0 = 20, ox1 = 580, oy0 = 362, oy1 = 538, NDIV = 8;
  S('rect', { x: ox0 - 6, y: oy0 - 6, width: ox1 - ox0 + 12, height: oy1 - oy0 + 12, rx: 10, fill: '#1c2a2f' }, svg);
  S('rect', { x: ox0, y: oy0, width: ox1 - ox0, height: oy1 - oy0, rx: 4, fill: '#06140f' }, svg);
  for (let i = 1; i < 10; i++) S('line', { x1: ox0 + i * (ox1 - ox0) / 10, y1: oy0, x2: ox0 + i * (ox1 - ox0) / 10, y2: oy1, stroke: '#173a2c', 'stroke-width': 1 }, svg);
  for (let i = 1; i < NDIV; i++) S('line', { x1: ox0, y1: oy0 + i * (oy1 - oy0) / NDIV, x2: ox1, y2: oy0 + i * (oy1 - oy0) / NDIV, stroke: '#173a2c', 'stroke-width': 1 }, svg);
  const nula = S('line', { x1: ox0, x2: ox1, stroke: '#2f6d55', 'stroke-width': 1.5 }, svg);
  const trag = S('polyline', { fill: 'none', stroke: '#47e88f', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
  const oNat = T(svg, ox0 - 4, 344, '', 't2d-l');
  const oVd = T(svg, ox1 - 8, oy0 + 20, '', 't2d-osc', 'end');

  const OPIS = [
    { ac: true, vd: 200, t: 'MP0 · mreža: 400 V AC sa smetnjama (vršno ≈ 566 V)' },
    { ac: true, vd: 200, t: 'MP1 · iza filtra: čisti sinus 400 V AC' },
    { ac: true, vd: 10, t: 'MP2 · iza transformatora: 28 V AC (vršno ≈ 40 V)' },
    { ac: false, vd: 10, t: 'MP3 · ispravljeno: pulsirajući istosmjerni, vršno ≈ 38 V' },
    { ac: false, vd: 10, t: 'MP4 · izglađeno: ≈ 36 V, valovitost ≈ 3 V' },
    { ac: false, vd: 10, t: 'MP5 · regulirano: stalnih 24 V DC' }
  ];
  function napon(i, t) {   // t u sekundama
    const w = 2 * Math.PI * 50, s = Math.sin(w * t);
    switch (i) {
      case 0: return 566 * s + 45 * Math.sin(w * 23 * t) + (Math.abs(((t * 50) % 1) - 0.31) < 0.008 ? 160 : 0);
      case 1: return 566 * s;
      case 2: return 39.6 * s;
      case 3: return Math.max(0, 39.6 * Math.abs(s) - 1.4);
      case 4: { // kondenzator: vrh 38,2 V, linearno pražnjenje ≈ 3 V po poluperiodi
        const T2 = 0.01, u = ((t % T2) + T2) % T2;
        const vrh = 38.2, pad = 3.0;
        const isp = 39.6 * Math.abs(Math.sin(w * t)) - 1.4;
        const vrhT = 0.005; // vrh poluvala
        const dis = u >= vrhT ? vrh - pad * (u - vrhT) / T2 : vrh - pad * (u + T2 - vrhT) / T2;
        return Math.max(dis, isp);
      }
      case 5: return 24;
    }
    return 0;
  }
  function odaberi(i) {
    st.mp = i;
    mpG.forEach((g, j) => g.classList.toggle('t2d-akt', j === i));
    ui.stanje(st.ukljuceno ? OPIS[i].t + '.' : `Odabrana ${MP[i][2]} (${MP[i][3]}). Glavna sklopka je isključena — napona nema.`, st.ukljuceno ? null : 'upoz');
    osvjezi(); ctx.budi();
  }
  function sklopka() {
    st.ukljuceno = !st.ukljuceno;
    bS.textContent = st.ukljuceno ? 'Isključi glavnu sklopku' : 'Uključi glavnu sklopku';
    bS.setAttribute('aria-pressed', String(st.ukljuceno));
    st.svjetlo = st.ukljuceno ? 0 : 6;
    ui.stanje(st.ukljuceno ? 'Glavna sklopka uključena: napon prolazi kroz sve stupnjeve. Biraj mjerne točke.' : 'Glavna sklopka isključena: nema napona ni na jednoj mjernoj točki.', st.ukljuceno ? 'ok' : null);
    ctx.budi();
  }
  ctx.on(sk, 'click', sklopka);
  ctx.on(sk, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sklopka(); } });
  function osvjezi() {
    const on = st.ukljuceno;
    const n = on ? Math.min(6, Math.floor(st.svjetlo)) : 0;
    bl.forEach((b, i) => b.classList.toggle('t2d-pod', on && i < n));
    vodovi.forEach((v, i) => v.classList.toggle('t2d-pod', on && i < n));
    ledI.style.fill = on && n >= 6 ? B.zel : 'var(--tanko)';
    ruc.setAttribute('transform', on ? 'rotate(90 60 132)' : '');
    natSk.textContent = on ? 'I' : '0';
    const D = OPIS[st.mp];
    const pdiv = (oy1 - oy0) / NDIV;
    const yN = D.ac ? (oy0 + oy1) / 2 : oy1 - pdiv;
    nula.setAttribute('y1', yN); nula.setAttribute('y2', yN);
    const pts = [];
    for (let i = 0; i <= 280; i++) {
      const t = i / 280 * 0.04 + st.faza;
      const u = on && st.mp < n + 1 ? napon(st.mp, t) : 0;
      pts.push((ox0 + i * 2).toFixed(1) + ',' + ogr(yN - u / D.vd * pdiv, oy0 + 1, oy1 - 1).toFixed(1));
    }
    trag.setAttribute('points', pts.join(' '));
    oNat.textContent = on ? D.t : `${MP[st.mp][2]} · nema napona (glavna sklopka 0)`;
    oVd.textContent = D.vd + ' V/div · 4 ms/div';
  }
  ctx.petlja(dt => {
    let ide = false;
    if (st.ukljuceno) {
      if (st.svjetlo < 6) { st.svjetlo = Math.min(6, st.svjetlo + dt * 6); ide = true; }
      st.faza = (st.faza + dt * 0.004) % 0.02; ide = true;
    }
    osvjezi();
    return ide;
  });
  const r = ui.red();
  const bS = ui.gumb('Uključi glavnu sklopku', () => sklopka(), { u: r, pritisak: false });
  const r2 = ui.red('t2d-mp-tipke');
  MP.forEach(([, , n], i) => ui.gumb(n, () => odaberi(i), { u: r2, tanki: true, aria: `Mjerna točka ${n}: ${MP[i][3]}` }));
  odaberi(1);
  ui.stanje('Glavna sklopka je isključena. Uključi je i biraj mjerne točke.');
}


/* =========================================================== javno sučelje */
const GRADITELJI = {
  izvedbeT: tIzvedbeT, kuglicno: tKuglicno, mjerni: tMjerni, linearni: tLinearni, stezniPut: tStezniPut, tlakStezanja: tTlakStezanja,
  g54mksT: (ui, ctx) => tG54T(ui, ctx, false), g54wksT: (ui, ctx) => tG54T(ui, ctx, true),
  regulacija: tRegulacija, plc: tPlc, napajanje: tNapajanje
};
export function prikazi(el, id) {
  if (!el) throw new Error('teme2d: nedostaje element');
  if (!GRADITELJI[id]) {
    el.replaceChildren(H('p', { class: 't2d-stanje t2d-upoz', tekst: 'Tema „' + id + '” ne postoji.' }));
    return { unisti() { el.replaceChildren(); } };
  }
  const ctx = new Kontekst(el);
  let sek = null;
  try {
    const ui = okvir(el, id, ctx);
    sek = ui.sek;
    GRADITELJI[id](ui, ctx);
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
