// teme_mps.js — 10 interaktivnih 2D tema „Kako radi” za Festo MPS liniju s robotom RV-M1
// (DOS ForTroniQ, područje festo-mps-linija). ES modul; jedina ovisnost je ./mps_podaci.js (jedini izvor istine).
// Izvozi: TEME (naslov, engl, uvod, kako, napomena), prikazi(el, id) → { unisti() } i postaviPodatke(obj).
// Tekst i grafika su vlastiti; što izvori ne objavljuju, označeno je kao pretpostavka ili pojednostavljenje.
import { TEME_POPIS, MJERE, VREMENA, IZRADCI, VRSTE_IZRADAKA, KONFIG, SIGNALI, ROBOT_SUCELJE, STATIONLINK, PLOCA, TOK, procjenaIspitne, vrstaKucista, programRobota } from './mps_podaci.js';

/* =========================================================== podaci (kopija; postaviPodatke ih može prepisati) */
const kopija = (o) => JSON.parse(JSON.stringify(o));
const D = { mjere: kopija(MJERE), vremena: kopija(VREMENA), izradci: kopija(IZRADCI), logika: KONFIG.logikaIspitne };
function spoji(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') spoji(a[k], b[k]); else a[k] = b[k]; } }
export function postaviPodatke(o) { if (o && typeof o === 'object') spoji(D, o); }

const hr = (n, d = 1) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d).replace('.', ',').replace('-', '−');
const mmT = (m, d = 1) => hr(m * 1000, d) + ' mm';
const PROG = programRobota().program;
const redakPrograma = (br) => PROG.find((l) => l.startsWith(br + ' ')) || '';
const ADR = (st, k) => { const a = [...SIGNALI[st].ulazi, ...SIGNALI[st].izlazi].find((x) => x.k === k); return a ? a.oz : '—'; };

/* =========================================================== tekstovi */
const teksti = {
  'spremnik-izbacivac': {
    get uvod() {
      const s = D.mjere.dist.spremnik;
      return [
        `Slagani spremnik distribucijske stanice je okomita cijev u koju se slaže do ${s.kapacitet} izradaka otvorom prema gore [AALTO1]. Najdonji izradak leži u kanalu ispod cijevi; dvoradni cilindar izbacivača gura ga van na mjesto uzimanja, a ostali izratci ostaju poduprti klipnjačom i padaju za jedno mjesto tek kad se cilindar vrati.`,
        `Cilindar upravlja 5/2 elektromagnetski ventil (${ADR('dist', 'izbacivac')}). Magnetski senzori na plaštu cilindra javljaju krajnje položaje (${ADR('dist', 'izbStraga')} straga, ${ADR('dist', 'izbSprijeda')} sprijeda), a optički jednosmjerni senzor kroz otvor na dnu cijevi javlja ima li izradaka (${ADR('dist', 'imaIzradaka')}). Jednosmjerni prigušni ventili na priključcima cilindra prigušuju izlazni zrak i tako određuju brzinu [AALTO1], [ACAD].`
      ];
    },
    kako: 'Pritisni „Izbaci”: ventil prebaci, klip izlazi i gura najdonji izradak; senzor sprijeda javi kraj hoda, ventil se vraća i ostali izratci padnu za jedno mjesto. Klizačem prigušnog ventila mijenjaš brzinu. Kad spremnik ostane prazan, optički snop više nije prekinut i stanica javlja „spremnik prazan”.',
    napomena: 'Hod i vremena su procjena; stvarni cilindar i senzori nisu očitani. Prigušivanje je prikazano kao linearna promjena brzine.'
  },
  'vakuum-zakretna-ruka': {
    get uvod() {
      return [
        `Modul za premještanje ima zakretni pneumatski pogon i laku ruku s vakuumskom sisaljkom. Kut zakreta je podesiv graničnicima; u ovoj liniji ruka se okreće ${D.mjere.dist.ruka.kut}° između spremnika i dizala ispitne stanice [AALTO1], [VUC19]. Krajnje položaje javljaju mikroprekidači (${ADR('dist', 'rukaSpremnik')}, ${ADR('dist', 'rukaDalje')}).`,
        `Vakuum stvara ejektor: mlaz stlačenog zraka kroz sapnicu povlači zrak iz voda sisaljke (Venturijev učinak), pa vakuum nastaje bez pumpe. Vakuumski prekidač javlja prihvat (${ADR('dist', 'vakuumOK')}) kad podtlak prijeđe prag; tek tada se ruka smije zakrenuti. Za odlaganje se vakuum isključuje i kratki mlaz zraka (${ADR('dist', 'otpuh')}) odvaja izradak od sisaljke.`
      ];
    },
    kako: 'Uključi vakuum dok je ruka kod spremnika: podtlak raste, a kad prijeđe prag, prekidač javi prihvat. Zakreni ruku prema dizalu i otpuhni izradak. Povećaj propuštanje (hrapava ploha, oštećena sisaljka): podtlak ne doseže prag, prekidač ne javlja prihvat, a ako ruku ipak zakreneš, izradak ispadne.',
    napomena: 'Iznosi podtlaka (najviše oko 75 kPa, prag 40 kPa) su ilustracija; stvarni ejektor i prag prekidača nisu očitani.'
  },
  'senzori-boja-materijal': {
    uvod: [
      'Ispitna stanica razlikuje izratke trima senzorima na donjem položaju dizala [AALTO1], [VUC19]. Kapacitivni senzor reagira na promjenu kapaciteta između svoje elektrode i okoline: vidi svaki izradak, i plastični i metalni — i jedini pouzdano vidi crni, pa služi kao „izradak prisutan”.',
      'Optički difuzni senzor šalje svjetlo i mjeri koliko se odbije: crvena plastika i aluminij odbijaju dovoljno, crna premalo. Induktivni senzor stvara izmjenično magnetsko polje; vrtložne struje nastaju samo u vodljivom metalu, pa javlja samo aluminijski izradak. Kombinacija triju signala daje boju i materijal.'
    ],
    kako: 'Odaberi izradak: snopovi i polja pokazuju što svaki senzor vidi, a tablica desno ističe redak koji odgovara signalima. Bez izratka nijedan senzor nije uključen.',
    napomena: 'Odbijanje svjetla i dosezi su ilustracija; adresa induktivnog senzora (I0.7) je pretpostavka.'
  },
  'mjerenje-visine': {
    get uvod() {
      return [
        `Dizalo podiže izradak u mjerni položaj, a mjerni cilindar spušta ticalo analognog senzora visine na gornju plohu. Napon senzora raste s visinom izratka. Crveno i aluminijsko kućište visoki su 25 mm, crno 22,5 mm, a kućišta za škart 23 i 24 mm [FC-200].`,
        `U završnom radu o ovoj liniji upravljač nema analogni ulaz, pa je senzor zamijenjen binarnim signalom „visina OK” — komparatorom s pragom (${ADR('isp', 'visinaOK')}) [VUC19]. Uz prag ${mmT(D.mjere.isp.pragVisine)} crno kućište pada na provjeri visine kao i škart. Logika ovisi o programu: drugi opis odbacuje crno bez mjerenja, a s nazivnom visinom prema boji i crno prolazi.`
      ];
    },
    kako: 'Odaberi izradak i logiku pa pritisni „Izmjeri”: ticalo se spusti, na grafu se pojavi napon, a odluka pošalje izradak na zračni klizač ili na klizač škarta. Pomakni prag i provjeri koja kućišta tada prolaze.',
    napomena: 'Pretvorba visine u napon (20–30 mm → 0–10 V) i prag su pretpostavka; stvarni senzor nije očitan.'
  },
  'okretni-stol': {
    get uvod() {
      const s = D.mjere.obr.stol;
      return [
        `Okretni stol obradne stanice ima ${s.gnijezda} gnijezda; DC motor ga preko prijenosnika okreće za jedno gnijezdo (60°), a induktivni senzor ispod stola (${ADR('obr', 'stolUPolozaju')}) javlja da je stol u položaju [VIC19], [TUE]. Upravljač tada isključi motor.`,
        'Stol je takt stanice: dok se na jednom mjestu ispituje, na drugom se buši, a na izlaznom mjestu robot preuzima izradak. Stol se smije okrenuti samo kad je izlazno mjesto prazno — inače bi izradak otišao na slobodno gnijezdo i robot ga ne bi našao [VIC19].'
      ];
    },
    kako: 'Stavi izradak na ulaz i pomakni stol koracima: na mjestu ispitivanja dobije oznaku provjere, na mjestu bušenja rupu. Kad izradak dođe na izlaz, stol odbija sljedeći korak dok „robot” ne uzme izradak. Uključi automatski rad za neprekidan takt.',
    napomena: 'Raspored mjesta (ulaz 180°, ispitivanje 120°, bušenje 60°, izlaz 0°) i korak 60° procijenjeni su s fotografija; jedan izvor navodi korak 90°.'
  },
  'busenje-provjera': {
    uvod: [
      'Ispitivač je cilindar s ticalom: ako ticalo dođe do donjeg položaja, izradak je ispravno položen (otvorom gore) i smije na bušenje [TUE]. Krivo položen izradak ticalo zaustavi visoko, signal izostane i upravljač ga ne buši.',
      'Na mjestu bušenja stezni cilindar pritisne izradak u gnijezdo, upravljač uključi motor bušilice, spusti bušilicu linearnom osi do donjeg senzora, zadrži je nekoliko sekundi i vrati gore; tek tada otpusti stezanje [TUE], [PATRAS], [VIC19]. Slijed je pisan kao niz koraka (SFC): svaki korak čeka svoj senzor.'
    ],
    kako: 'Pokreni slijed i prati korake u popisu: izlazi (Q) pokreću aktuatore, a sljedeći korak počinje tek kad senzor (I) javi kraj. Označi „izradak naopako”: ispitivač ne dolazi dolje i bušenje se preskače.',
    napomena: 'Adrese signala obradne stanice su naše (popis signala prema [PATRAS]); bušenje je prikazano bez skidanja čestica.'
  },
  'stationlink': {
    uvod: [
      STATIONLINK.opis,
      'Prethodna stanica predaje izradak samo kad prijamnik javi da je sljedeća spremna. Zato se stanice ne moraju žicama povezivati s upravljačem susjeda — svaka ima svoj program, a optički par prenosi jedan bit. Prekinut snop (prljavština, prepreka, kvar odašiljača) prijamnik vidi kao „zauzeta”, pa greška ne izaziva predaju u prazno.'
    ],
    kako: 'Prebaci sljedeću stanicu na „spremna” i „zauzeta” i prati snop. Kad prethodna ima izradak, čeka svjetlo; nakon predaje sljedeća javlja „zauzeta” dok ne obradi izradak. Stavi prepreku u snop: predaja staje iako je sljedeća spremna.',
    napomena: STATIONLINK.napomena + ' Prikaz invertiranja prijamnika je načelan.'
  },
  'start-stop-reset': {
    uvod: [
      'Svaka stanica ima istu upravljačku ploču: START sa žaruljicom, STOP, RESET sa žaruljicom, preklopku s ključem AUTO/MAN, dvije signalne lampice i crnu gljivu kao didaktički nužni stop [FC-198]. Ploča i program čine stroj stanja.',
      'Nakon uključenja trepće RESET: stanica traži inicijalizaciju, a aktuatori se vraćaju u početni položaj. Kad zasvijetli START, stanica je spremna. AUTO znači neprekidan rad, MAN jedan ciklus po pritisku tipke START. STOP zaustavlja glavni program do sljedećeg RESET-a, a nužni stop isključuje izlaze; nakon izvlačenja gljive potreban je RESET. Kod povezanih stanica inicijalizacija ide protiv toka materijala [IP-SEP], [VIC19].'
    ],
    kako: 'Klikni elemente ploče na crtežu ili gumbe: dijagram stanja pokazuje u kojem je stanju stanica i koji prijelaz je moguć. „RESET linije” pokazuje redoslijed inicijalizacije: najprije zadnja stanica, pa prema početku.',
    napomena: 'Značenje lampica Q1 i Q2 je izbor simulatora; stvarni program linije nije poznat.'
  },
  'montaza-cilindra': {
    uvod: [
      'Robot sklapa pneumatski cilindar od četiri dijela: kućišta, klipa, opruge i poklopca [FC-200], [IP-RS15]. Kućište s okretnog stola odloži u montažno gnijezdo, gdje senzor javlja boju: crni klip ide u crveno i aluminijsko kućište, srebrni u crno.',
      'Oprugu i poklopac izbacuju cilindri spremnika kojima robot upravlja izravno svojim izlazima, bez PLC-a (kao Festov modul za montažu iz 2015.). Poklopac se stavlja na kućište i zabravljuje zakretom šake za 90°; gotov cilindar ide na izlazni klizač. Klipove robot uzima s palete: točku računa naredbom PT iz kutova palete i brojila.'
    ],
    kako: 'Odaberi boju kućišta i prolazi korake: uz svaki korak su redci programa robota u jeziku Movemaster koji ga izvode. „Pokreni” izvodi cijeli slijed.',
    napomena: 'Redoslijed je prema Festovoj robotskoj stanici iz 2015.; opis za inačicu s RV-M1 nije nađen. Mjere klipa, opruge i poklopca su procjena.'
  },
  'plc-robot-rukovanje': {
    uvod: [
      'Upravljač obradne stanice i upravljačka jedinica robota DUM1 razgovaraju samo preko ulaza i izlaza: obradna stanica uključi izlaz „izradak spreman”, koji je na I/O kartici robota ulaz 0; robot nakon hvata uključi svoj izlaz 0 „preuzeto”, a obradna stanica tada isključi signal i smije okrenuti stol [VIC19].',
      'Na strani robota to je nekoliko redaka programa: petlja TB +0 / TI / GT čeka ulaz 0, a OB +0 i OB −0 daju potvrdu. DIP-preklopka SW1 bit 5 = 1 omogućuje signale s I/O kartice [VIC19]. Takvo dvostrano potvrđivanje (rukovanje) osigurava da nijedna strana ne krene prerano.'
    ],
    kako: 'Pokreni ciklus i prati vremenski dijagram signala: kursor se giba kroz vrijeme, a desno se ističe redak programa robota koji se upravo izvodi. Označi „robot u STOP-u”: signal „izradak spreman” ostaje uključen, a stol čeka — to je zastoj.',
    napomena: 'Dodjela bitova je pretpostavka simulatora; raspored pinova I/O kartice RV-M1 na liniji nije nađen.'
  }
};
export const TEME = {};
for (const t of TEME_POPIS) {
  const x = teksti[t.id] || { uvod: ['—'], kako: '—', napomena: '' };
  TEME[t.id] = Object.defineProperties({ naslov: t.naslov, engl: t.engl }, Object.getOwnPropertyDescriptors(x));
}

/* =========================================================== osnovni alati */
const NS = 'http://www.w3.org/2000/svg';
const B = { crv: '#d64535', zel: '#1f9d55', nar: '#e08a1e', pl: '#3d8bd9', zut: '#f2c230', lj: '#8e5cc4' };
let brojac = 0;

function S(tag, a, rod) {
  const e = document.createElementNS(NS, tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v;
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
  return S('text', { x, y, class: kl || 'tms-l', 'text-anchor': anchor || null, tekst: txt }, g);
}
const ogr = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = v => v.toFixed(1);
const RAD = Math.PI / 180;
const frac = x => x - Math.floor(x);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const pts = arr => arr.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
const put = (arr, zat) => arr.length ? 'M' + arr.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + (zat ? 'Z' : '') : '';
const kutN = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function postavi(el, a) { for (const k in a) el.setAttribute(k, typeof a[k] === 'number' ? f1(a[k]) : a[k]); }

// strelica (linija + glava): g.set(x1,y1,x2,y2)
function strel(g, x1, y1, x2, y2, o = {}) {
  const boja = o.boja || 'var(--ink)', w = o.w || 2.5, gl = o.gl || 11;
  const gr = S('g', { class: o.kl || null }, g);
  const ln = S('line', { 'stroke-width': w, 'stroke-linecap': 'round' }, gr);
  const pg = S('polygon', {}, gr);
  gr.boja = b => { ln.style.stroke = b; pg.style.fill = b; };
  gr.boja(boja);
  gr.set = (a, b, c, d) => {
    const dx = c - a, dy = d - b, L = Math.hypot(dx, dy);
    if (L < 1.5) { gr.style.display = 'none'; return; }
    gr.style.display = '';
    const ux = dx / L, uy = dy / L, g2 = Math.min(gl, L * 0.7);
    const bx = c - ux * g2, by = d - uy * g2;
    ln.setAttribute('x1', f1(a)); ln.setAttribute('y1', f1(b));
    ln.setAttribute('x2', f1(bx)); ln.setAttribute('y2', f1(by));
    pg.setAttribute('points', `${f1(c)},${f1(d)} ${f1(bx - uy * g2 * 0.55)},${f1(by + ux * g2 * 0.55)} ${f1(bx + uy * g2 * 0.55)},${f1(by - ux * g2 * 0.55)}`);
  };
  gr.set(x1, y1, x2, y2);
  return gr;
}
function luk(cx, cy, r, a0, a1) {
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  const vel = Math.abs(a1 - a0) > Math.PI ? 1 : 0, sm = a1 > a0 ? 1 : 0;
  return `M${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 ${vel} ${sm} ${f1(x1)},${f1(y1)}`;
}
// graf: okvir, mreža i pretvorba vrijednost → koordinata
function graf(g, x, y, w, h, o) {
  S('rect', { x, y, width: w, height: h, class: 'tms-graf' }, g);
  const X = v => x + (v - o.x0) / (o.x1 - o.x0) * w;
  const Y = v => y + h - (v - o.y0) / (o.y1 - o.y0) * h;
  for (const v of o.yt || []) {
    const yy = Y(v);
    S('line', { x1: x, y1: f1(yy), x2: x + w, y2: f1(yy), class: v === 0 && o.y0 < 0 ? 'tms-mreza0' : 'tms-mreza' }, g);
    if (o.ylab !== false) T(g, x - 6, yy + 5, (o.yf || String)(v), 'tms-ls', 'end');
  }
  for (const v of o.xt || []) {
    const xx = X(v);
    S('line', { x1: f1(xx), y1: y, x2: f1(xx), y2: y + h, class: 'tms-mreza' }, g);
    if (o.xlab !== false) T(g, xx, y + h + 18, (o.xf || String)(v), 'tms-ls', 'middle');
  }
  if (o.naslov) T(g, x, y - 9, o.naslov, 'tms-ls');
  return { X, Y, x, y, w, h };
}
// SVG element koji se ponaša kao gumb (klik, Enter, razmaknica)
function klikabilno(ctx, el, oznaka, fn) {
  el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', oznaka);
  el.classList.add('tms-klik');
  ctx.on(el, 'click', fn);
  ctx.on(el, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
}
function sporo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
// presjek zrake (px,py, smjer ux,uy) s preprekama [{tip:'seg',a,b}|{tip:'krug',c,r}] → udaljenost ili Infinity
function zraka(px, py, ux, uy, prepreke) {
  let best = Infinity;
  for (const o of prepreke) {
    if (o.tip === 'seg') {
      const ex = o.b[0] - o.a[0], ey = o.b[1] - o.a[1];
      const den = ux * ey - uy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const wx = o.a[0] - px, wy = o.a[1] - py;
      const t = (wx * ey - wy * ex) / den, s = (wx * uy - wy * ux) / den;
      if (t > 1e-9 && s >= 0 && s <= 1 && t < best) best = t;
    } else {
      const wx = px - o.c[0], wy = py - o.c[1];
      const b = wx * ux + wy * uy, c = wx * wx + wy * wy - o.r * o.r, d = b * b - c;
      if (d < 0) continue;
      const t = -b - Math.sqrt(d);
      if (t > 1e-9 && t < best) best = t;
    }
  }
  return best;
}

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
    // u načinu „manje gibanja” animacija ide u koracima od 0,25 s
    const dt = this.zadnje ? Math.min((t - this.zadnje) / 1000, this.rm ? 0.4 : 0.1) : (this.rm ? 0.25 : 1 / 60);
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
  const uid = 'tms' + (++brojac);
  let nk = 0;
  const sek = H('section', { class: 'tms', 'data-tema': id, 'aria-label': T0.naslov });
  const naslov = H('h3', { class: 'tms-naslov' }, T0.naslov + ' ', H('span', { class: 'tms-engl', tekst: '(' + T0.engl + ')' }));
  const uvod = H('div', { class: 'tms-uvod' });
  for (const p of T0.uvod) uvod.append(H('p', { tekst: p }));
  const scena = H('div', { class: 'tms-scena' });
  const upr = H('div', { class: 'tms-upr', role: 'group', 'aria-label': 'Upravljanje animacijom' });
  const ocitP = H('div', { class: 'tms-ocit' });
  const stanjeP = H('p', { class: 'tms-stanje', 'aria-live': 'polite' });
  const kako = H('div', { class: 'tms-kako' }, H('h4', { tekst: 'Kako radi' }), H('p', { tekst: T0.kako }));
  if (T0.napomena) kako.append(H('p', { class: 'tms-pretp' }, H('b', { tekst: 'Pojednostavljenja: ' }), T0.napomena));
  const desno = H('div', { class: 'tms-desno' }, upr, stanjeP, ocitP, kako);
  sek.append(naslov, uvod, H('div', { class: 'tms-tijelo' }, scena, desno));
  el.replaceChildren(sek);

  const ui = {
    uid, sek, scena, upr, ocitP, desno,
    svg(w, h, opis, kl) {
      const s = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opis, class: 'tms-svg' + (kl ? ' ' + kl : ''), focusable: 'false' });
      const defs = S('defs', {}, s);
      const p = S('pattern', { id: uid + '-sr' + (++nk), width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      S('rect', { width: 7, height: 7, class: 'tms-srafura-p' }, p);
      S('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'tms-srafura-c' }, p);
      s.defs = defs; s.srafura = `url(#${p.id})`;
      s.clip = (x, y, w2, h2) => { const c = S('clipPath', { id: uid + '-cl' + (++nk) }, defs); S('rect', { x, y, width: w2, height: h2 }, c); return `url(#${c.id})`; };
      scena.append(s);
      return s;
    },
    red(kl, u) { const r = H('div', { class: 'tms-red' + (kl ? ' ' + kl : '') }); (u || upr).append(r); return r; },
    skupina(u) { const g = H('div', { class: 'tms-skupina' }); (u || upr).append(g); return g; },
    gumb(tekst, fn, o = {}) {
      const b = H('button', {
        type: 'button', class: 'gumb' + (o.tanki ? ' tanki' : '') + ' tms-g' + (o.kl ? ' ' + o.kl : ''),
        'aria-label': o.aria || null, 'aria-pressed': o.pritisak == null ? null : String(!!o.pritisak)
      });
      b.textContent = tekst;
      if (fn) ctx.on(b, 'click', e => fn(e, b));
      let cilj = o.u;
      if (!cilj) { cilj = upr.lastElementChild; if (!cilj || !cilj.classList.contains('tms-red')) cilj = ui.red(); }
      cilj.append(b);
      return b;
    },
    // gumb play/pause s istim izgledom kao u svim temama
    igraj(st, kljuc, tekst, fn, u) {
      const b = ui.gumb(tekst, () => { st[kljuc] = !st[kljuc]; osv(); if (fn) fn(st[kljuc]); ctx.budi(); }, { pritisak: false, u });
      const osv = () => { b.textContent = st[kljuc] ? 'Pauza' : tekst; b.setAttribute('aria-pressed', String(!!st[kljuc])); };
      b.osvjezi = osv;
      return b;
    },
    seg(oznaka, opcije, vr, fn, u) {
      const w = H('div', { class: 'tms-seg' });
      const lab = H('span', { class: 'tms-seg-o', tekst: oznaka, id: uid + '-s' + (++nk) });
      const box = H('div', { class: 'tms-seg-b', role: 'group', 'aria-labelledby': lab.id });
      const btn = opcije.map(([v, t]) => {
        const b = H('button', { type: 'button', 'aria-pressed': 'false' });
        b.textContent = t;
        ctx.on(b, 'click', () => { if (w.dataset.v === String(v)) return; w.postavi(v); fn(v); });
        box.append(b);
        return [v, b];
      });
      w.postavi = v => { w.dataset.v = String(v); for (const [vv, b] of btn) b.setAttribute('aria-pressed', String(vv === v)); };
      w.gumbi = btn;
      w.postavi(vr);
      w.append(lab, box);
      (u || upr).append(w);
      return w;
    },
    klizac(oznaka, min, max, korak, vr, fmt, fn, u) {
      const kid = uid + '-k' + (++nk);
      const w = H('div', { class: 'tms-kl' });
      const l = H('label', { for: kid, tekst: oznaka });
      const o = H('output', { for: kid });
      const i = H('input', { type: 'range', id: kid, min, max, step: korak, value: vr });
      const upd = () => { o.textContent = fmt(+i.value); };
      ctx.on(i, 'input', () => { upd(); fn(+i.value); });
      upd();
      w.append(H('div', { class: 'tms-kl-g' }, l, o), i);
      (u || upr).append(w);
      w.ulaz = i; w.osvjezi = upd;
      w.postavi = v => { i.value = v; upd(); };
      return w;
    },
    kvacica(oznaka, vr, fn, u) {
      const kid = uid + '-c' + (++nk);
      const i = H('input', { type: 'checkbox', id: kid });
      i.checked = !!vr;
      const w = H('label', { class: 'tms-kv', for: kid }, i, H('span', { tekst: oznaka }));
      ctx.on(i, 'change', () => fn(i.checked));
      (u || upr).append(w);
      w.ulaz = i;
      w.postavi = v => { i.checked = !!v; };
      return w;
    },
    ocit(redovi, u) {
      const dl = H('dl', { class: 'tms-oc' });
      const set = {};
      for (const [k, t] of redovi) {
        const dd = H('dd', { tekst: '—' });
        const dt = H('dt', { tekst: t });
        dl.append(H('div', {}, dt, dd));
        set[k] = (v, kl) => { if (dd.textContent !== v) dd.textContent = v; const c = kl ? 'tms-' + kl : ''; if (dd.className !== c) dd.className = c; };
        set[k].naziv = t2 => { if (dt.textContent !== t2) dt.textContent = t2; };
      }
      (u || ocitP).append(dl);
      return set;
    },
    // okvir s formulama (redovi se osvježavaju uživo)
    formula(naslov, n, u) {
      const box = H('div', { class: 'tms-formula' });
      if (naslov) box.append(H('h4', { tekst: naslov }));
      const red = [];
      for (let k = 0; k < n; k++) { const p = H('p', {}); box.append(p); red.push(p); }
      (u || ocitP).append(box);
      box.set = (k, txt) => { if (red[k] && red[k].textContent !== txt) red[k].textContent = txt; if (red[k]) red[k].style.display = txt ? '' : 'none'; };
      return box;
    },
    sitno(txt, u) { const p = H('p', { class: 'tms-sitno', tekst: txt }); (u || ocitP).append(p); return p; },
    stanje(txt, vrsta) {
      if (stanjeP.textContent !== txt) stanjeP.textContent = txt;
      const c = 'tms-stanje' + (vrsta ? ' tms-' + vrsta : '');
      if (stanjeP.className !== c) stanjeP.className = c;
    }
  };
  return ui;
}

/* ------------------------------------------------------- zajednički crteži */
// Robotino odozgo: g, središte, mjerilo px/m, kut φ (rad, 0 = os x robota prema gore na zaslonu)

/* ------------------------------------------------------- zajednički crteži linije */
// tlocrt: KS linije (m, y prema stražnjoj strani) → zaslon (y dolje); prednja strana linije je dolje
function lampa(rod, x, y, txt, r = 7) {
  const c = S('circle', { cx: x, cy: y, r, class: 'tms-lampa' }, rod);
  if (txt) T(rod, x + r + 6, y + 5, txt, 'tms-ls');
  c.upali = (on, kl = 'tms-lampa-on') => { c.classList.toggle(kl, !!on); };
  return c;
}
// popis klikabilnih dijelova (legenda) + opis
function legenda(ui, ctx, stavke, fn) {
  const ul = H('ul', { class: 'tms-legenda' });
  const gumbi = stavke.map((st, i) => {
    const b = H('button', { type: 'button', 'aria-pressed': 'false' }, H('b', { tekst: String(i + 1) }), st.naziv);
    ctx.on(b, 'click', () => fn(i));
    ul.append(H('li', {}, b));
    return b;
  });
  ui.upr.append(ul);
  return i => gumbi.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
}
const glatko = u => u * u * (3 - 2 * u);
const IZV = s => (s ? ' [' + s + ']' : '');



/* =========================================================== crteži MPS */
const KUC = { crveno: 'tms-kuc-crveno', alu: 'tms-kuc-alu', crno: 'tms-kuc-crno' };
// kućište sa strane: donji središnji rub u (x, y), mjerilo s px/m
function kuciste(rod, boja, s, vis) {
  const g = S('g', { class: 'tms-izr' }, rod);
  const w = 0.040 * s;
  const tijelo = S('rect', { x: -w / 2, y: -vis * s, width: w, height: vis * s, rx: 2, class: KUC[boja] || KUC.crveno }, g);
  const provrt = S('rect', { x: -0.012 * s, y: -vis * s, width: 0.024 * s, height: 3, class: 'tms-provrt' }, g);
  g.boja = (b, v) => { tijelo.setAttribute('class', KUC[b] || KUC.crveno); if (v != null) { tijelo.setAttribute('y', f1(-v * s)); tijelo.setAttribute('height', f1(v * s)); provrt.setAttribute('y', f1(-v * s)); } };
  g.na = (x, y) => g.setAttribute('transform', `translate(${f1(x)} ${f1(y)})`);
  return g;
}
// pneumatski cilindar vodoravno: tijelo od x0 do x0+L, klip izlazi u smjeru dir (+1 desno)
function cilindar(rod, x0, y, L, h, hod, dir = 1) {
  const g = S('g', {}, rod);
  S('rect', { x: x0, y: y - h / 2, width: L, height: h, rx: 3, class: 'tms-cil' }, g);
  const klip = S('rect', { x: 0, y: y - h / 2 + 2, width: 6, height: h - 4, class: 'tms-klip' }, g);
  const sipka = S('rect', { x: 0, y: y - 3, width: L, height: 6, class: 'tms-sipka' }, g);
  const glava = S('rect', { x: 0, y: y - h / 2 - 4, width: 8, height: h + 8, rx: 2, class: 'tms-glava' }, g);
  g.postavi = (u) => {
    const xk = dir > 0 ? x0 + 4 + u * (L - 14) : x0 + L - 10 - u * (L - 14);
    klip.setAttribute('x', f1(xk));
    const xs = dir > 0 ? xk + 6 : xk - L + 0;
    const xEnd = dir > 0 ? x0 + L + u * hod : x0 - u * hod;
    if (dir > 0) { sipka.setAttribute('x', f1(xk + 6)); sipka.setAttribute('width', f1(Math.max(0, xEnd - xk - 6))); glava.setAttribute('x', f1(xEnd)); }
    else { sipka.setAttribute('x', f1(xEnd)); sipka.setAttribute('width', f1(Math.max(0, xk - xEnd))); glava.setAttribute('x', f1(xEnd - 8)); }
    return xEnd;
  };
  g.postavi(0);
  return g;
}
// senzor (mali pravokutnik) s natpisom i lampicom
function senzor(rod, x, y, w, h, txt) {
  const r = S('rect', { x, y, width: w, height: h, rx: 2, class: 'tms-senzor' }, rod);
  if (txt) T(rod, x + w / 2, y - 6, txt, 'tms-ls', 'middle');
  r.upali = (on) => r.classList.toggle('tms-senzor-on', !!on);
  return r;
}
const bit = (v) => (v ? '1' : '0');

/* =========================================================== 1. slagani spremnik i izbacivač */
function tSpremnik(ui, ctx) {
  const sp = D.mjere.dist.spremnik, s = 1500, Tz = D.vremena.izbacivacSpremnika;
  const svg = ui.svg(720, 420, 'Slagani spremnik s dvoradnim cilindrom izbacivača, 5/2 ventilom i senzorima, pogled sa strane');
  const y0 = 340, xm = 300, hod = D.mjere.dist.izbacivac.hod * s;
  S('rect', { x: 20, y: y0, width: 680, height: 18, class: 'tms-ploca' }, svg);
  S('rect', { x: xm - 50, y: y0 - 10, width: 100 + hod + 20, height: 10, class: 'tms-tamno' }, svg);
  const cijevH = sp.visinaCijevi * s * 0.9;
  S('rect', { x: xm - 34, y: y0 - 10 - cijevH, width: 68, height: cijevH, class: 'tms-cijev' }, svg);
  T(svg, xm, y0 - 18 - cijevH, 'slagani spremnik', 'tms-ls', 'middle');
  const izr = S('g', {}, svg);
  const cil = cilindar(svg, 40, y0 - 10 - 18, 170, 26, 0, 1);
  const potisak = S('rect', { x: 0, y: y0 - 10 - 34, width: 10, height: 32, rx: 2, class: 'tms-glava' }, svg);
  const sStraga = senzor(svg, 60, y0 - 10 - 40, 18, 8, ADR('dist', 'izbStraga'));
  const sSprijeda = senzor(svg, 172, y0 - 10 - 40, 18, 8, ADR('dist', 'izbSprijeda'));
  const snop = S('line', { x1: xm - 46, y1: y0 - 26, x2: xm + 46, y2: y0 - 26, class: 'tms-snop' }, svg);
  S('rect', { x: xm - 54, y: y0 - 34, width: 10, height: 16, class: 'tms-senzor' }, svg); const prij = S('rect', { x: xm + 44, y: y0 - 34, width: 10, height: 16, class: 'tms-senzor' }, svg);
  T(svg, xm + 60, y0 - 40, ADR('dist', 'imaIzradaka'), 'tms-ls');
  const mjU = S('rect', { x: xm + hod - 30, y: y0 - 12, width: 60, height: 4, class: 'tms-oznaka' }, svg);
  T(svg, xm + hod, y0 + 36, 'mjesto uzimanja', 'tms-ls', 'middle');
  /* 5/2 ventil */
  const vg = S('g', { transform: 'translate(470 60)' }, svg);
  T(vg, 0, -10, '5/2 ventil ' + ADR('dist', 'izbacivac'), 'tms-ls');
  const vb = [S('rect', { x: 0, y: 0, width: 70, height: 50, class: 'tms-ventil' }, vg), S('rect', { x: 70, y: 0, width: 70, height: 50, class: 'tms-ventil' }, vg)];
  strel(vg, 12, 40, 30, 10, { w: 2 }); strel(vg, 58, 10, 40, 40, { w: 2 }); strel(vg, 82, 40, 82, 10, { w: 2 }); strel(vg, 128, 10, 128, 40, { w: 2 });
  S('rect', { x: 140, y: 12, width: 22, height: 26, class: 'tms-svitak' }, vg);
  const vodA = S('path', { d: 'M 40 0 L 40 -30 L -330 -30 L -330 170', class: 'tms-vod' }, vg);
  const vodB = S('path', { d: 'M 100 0 L 100 -42 L -170 -42 L -170 170', class: 'tms-vod' }, vg);
  const st = { stog: ['crveno', 'alu', 'crno', 'crveno', 'alu'], u: 0, Q: 0, faza: 'mir', t: 0, brz: 1, auto: false, naMjestu: null, zadnjiH: 0 };
  const vis = (b) => vrstaKucista(b).visina;
  function crtajStog() {
    izr.replaceChildren();
    const k = s * 0.9;
    let y = y0 - 10, start = 0;
    if ((st.faza === 'van' || st.faza === 'drzi') && st.stog.length) { const b = st.stog[0]; kuciste(izr, b, k, vis(b)).na(xm + st.u * hod, y0 - 10); y -= vis(b) * k; start = 1; }
    else if (st.faza === 'nazad') y -= st.zadnjiH * k * st.u;
    for (let i = start; i < st.stog.length; i++) { const b = st.stog[i]; kuciste(izr, b, k, vis(b)).na(xm, y); y -= vis(b) * k; }
    if (st.naMjestu) kuciste(izr, st.naMjestu, k, vis(st.naMjestu)).na(xm + hod, y0 - 10);
  }
  ctx.petlja((dt) => {
    let dalje = false;
    if (st.faza === 'van') { st.u = Math.min(1, st.u + dt * st.brz / Tz); if (st.u >= 1) { st.faza = 'drzi'; st.t = 0; } dalje = true; }
    else if (st.faza === 'drzi') { st.t += dt; if (st.t > 0.35) { st.naMjestu = st.stog.shift(); st.zadnjiH = vis(st.naMjestu); st.Q = 0; st.faza = 'nazad'; } dalje = true; }
    else if (st.faza === 'nazad') { st.u = Math.max(0, st.u - dt * st.brz / Tz); if (st.u <= 0) { st.faza = 'mir'; ui.stanje(st.stog.length ? 'Izbacivač je natrag; izratci su pali za jedno mjesto.' : 'Spremnik je prazan: optički snop više nije prekinut (' + ADR('dist', 'imaIzradaka') + ' = 0).', st.stog.length ? 'ok' : 'upoz'); st.t = 0; } dalje = true; }
    else if (st.naMjestu) { st.t += dt; if (st.t > 1.0) { st.naMjestu = null; if (st.auto && st.stog.length) izbaci(); } dalje = true; }
    const xEnd = cil.postavi(st.faza === 'van' || st.faza === 'drzi' || st.faza === 'nazad' ? st.u : 0);
    potisak.setAttribute('x', f1(40 + 170 + st.u * hod - 4));
    void xEnd;
    sStraga.upali(st.u <= 0.001); sSprijeda.upali(st.u >= 0.999);
    const ima = st.stog.length > 0;
    snop.classList.toggle('tms-snop-on', !ima); prij.classList.toggle('tms-senzor-on', !ima);
    vb[0].classList.toggle('tms-ventil-on', !st.Q); vb[1].classList.toggle('tms-ventil-on', !!st.Q);
    vodA.classList.toggle('tms-vod-tlak', !st.Q); vodB.classList.toggle('tms-vod-tlak', !!st.Q);
    mjU.classList.toggle('tms-oznaka-on', !!st.naMjestu);
    crtajStog();
    o.q(bit(st.Q), st.Q ? 'ok' : ''); o.s1(bit(st.u <= 0.001)); o.s2(bit(st.u >= 0.999)); o.s6(bit(ima), ima ? '' : 'upoz'); o.n(st.stog.length + ' / ' + sp.kapacitet);
    return dalje;
  });
  function izbaci() {
    if (st.faza !== 'mir') return;
    if (!st.stog.length) { ui.stanje('Spremnik je prazan — upravljač ne smije izbaciti (' + ADR('dist', 'imaIzradaka') + ' = 0).', 'upoz'); return; }
    if (st.naMjestu) { ui.stanje('Mjesto uzimanja je zauzeto — čeka da ga ruka odnese.', 'upoz'); return; }
    st.Q = 1; st.faza = 'van'; ui.stanje('Ventil prebacuje (' + ADR('dist', 'izbacivac') + ' = 1): tlak u stražnjoj komori, klip izlazi i gura najdonji izradak.', 'plavo'); ctx.budi();
  }
  const r = ui.red();
  ui.gumb('Izbaci (' + ADR('dist', 'izbacivac') + ')', izbaci, { u: r });
  ui.gumb('Napuni spremnik', () => { if (st.faza !== 'mir') return; const b = ['crveno', 'alu', 'crno']; while (st.stog.length < sp.kapacitet) st.stog.push(b[st.stog.length % 3]); ui.stanje('Spremnik je pun (' + sp.kapacitet + ' izradaka).', 'ok'); ctx.budi(); }, { tanki: true, u: r });
  ui.klizac('Prigušni ventil (brzina klipa)', 30, 100, 5, 100, (x) => x + ' %', (x) => { st.brz = x / 100; });
  ui.kvacica('Automatski: izbaci čim se mjesto uzimanja oslobodi', false, (v) => { st.auto = v; if (v && st.faza === 'mir' && !st.naMjestu) izbaci(); });
  const o = ui.ocit([['q', ADR('dist', 'izbacivac') + ' izbacivač'], ['s1', ADR('dist', 'izbStraga') + ' straga'], ['s2', ADR('dist', 'izbSprijeda') + ' sprijeda'], ['s6', ADR('dist', 'imaIzradaka') + ' ima izradaka'], ['n', 'U spremniku']]);
  ui.sitno('Kapacitet spremnika ' + sp.kapacitet + ' izradaka, hod izbacivača ' + mmT(D.mjere.dist.izbacivac.hod, 0) + ' (procjena) [AALTO1].');
  ctx.budi(); ui.stanje('Pritisni „Izbaci”.');
}

/* =========================================================== 2. vakuum i zakretna ruka */
function tVakuum(ui, ctx) {
  const svg = ui.svg(720, 420, 'Zakretna ruka s vakuumskom sisaljkom odozgo i shema ejektora s vakuumskim prekidačem');
  const cx = 210, cy = 250, R = 150, PRAG = 40, MAKS = 75;
  S('rect', { x: 20, y: 60, width: 400, height: 330, rx: 8, class: 'tms-ploca' }, svg);
  S('path', { d: luk(cx, cy, R, Math.PI, 2 * Math.PI), class: 'tms-putanja' }, svg);
  S('circle', { cx: cx - R, cy, r: 26, class: 'tms-tamno' }, svg); T(svg, cx - R, cy + 50, 'spremnik', 'tms-ls', 'middle');
  S('rect', { x: cx + R - 30, y: cy - 30, width: 60, height: 60, rx: 4, class: 'tms-al' }, svg); T(svg, cx + R, cy + 50, 'dizalo ispitne', 'tms-ls', 'middle');
  const mk1 = senzor(svg, cx - 40, cy + 26, 14, 10, ADR('dist', 'rukaSpremnik')), mk2 = senzor(svg, cx + 26, cy + 26, 14, 10, ADR('dist', 'rukaDalje'));
  const ruka = S('g', {}, svg);
  S('rect', { x: 0, y: -9, width: R + 14, height: 18, rx: 6, class: 'tms-al' }, ruka);
  const cup = S('circle', { cx: R, cy: 0, r: 15, class: 'tms-sisaljka' }, ruka);
  S('circle', { cx, cy, r: 22, class: 'tms-pogon' }, svg);
  const izr = S('circle', { cx: cx - R, cy, r: 20, class: 'tms-kuc-crveno' }, svg);
  /* ejektor */
  const eg = S('g', { transform: 'translate(450 80)' }, svg);
  T(eg, 0, 0, 'ejektor (Venturi)', 'tms-ls');
  S('path', { d: 'M 0 40 L 90 40 L 120 50 L 150 40 L 240 40 L 240 70 L 150 60 L 120 70 L 90 60 L 0 60 Z', class: 'tms-ejektor' }, eg);
  const mlaz = S('path', { d: 'M 5 50 L 235 50', class: 'tms-vod' }, eg);
  const usis = S('path', { d: 'M 120 70 L 120 140', class: 'tms-vod' }, eg);
  T(eg, 0, 30, ADR('dist', 'vakuum') + ' tlak 6 bar', 'tms-ls'); T(eg, 250, 54, 'ispuh', 'tms-ls');
  T(eg, 130, 110, 'vod sisaljke', 'tms-ls');
  const gx = 20, gy = 170, gw = 200, gh = 20;
  S('rect', { x: gx, y: gy, width: gw, height: gh, rx: 4, class: 'tms-graf' }, eg);
  const bar = S('rect', { x: gx, y: gy, width: 0, height: gh, rx: 4, class: 'tms-vak' }, eg);
  S('line', { x1: gx + gw * PRAG / 80, y1: gy - 6, x2: gx + gw * PRAG / 80, y2: gy + gh + 6, class: 'tms-prag' }, eg);
  T(eg, gx + gw * PRAG / 80, gy - 10, 'prag −' + PRAG + ' kPa', 'tms-ls', 'middle');
  T(eg, gx, gy + gh + 22, '0', 'tms-ls'); T(eg, gx + gw, gy + gh + 22, '−80 kPa', 'tms-ls', 'end');
  const lv = lampa(eg, 30, 250, ADR('dist', 'vakuumOK') + ' vakuumski prekidač: prihvaćeno');
  const st = { kut: 0, cilj: 0, vak: 0, Q1: false, otpuh: 0, leak: 0, gdje: 'spremnik' };
  ctx.petlja((dt) => {
    const maks = MAKS * (1 - st.leak);
    const ciljV = st.Q1 && (st.gdje === 'ruka' || (st.gdje === 'spremnik' && st.kut < 0.02)) ? maks : st.Q1 ? maks * 0.25 : 0;
    st.vak += (ciljV - st.vak) * Math.min(1, dt * 6);
    if (st.otpuh > 0) { st.otpuh -= dt; st.vak = Math.max(0, st.vak - dt * 300); }
    const kutPrije = st.kut;
    if (st.kut < st.cilj) st.kut = Math.min(st.cilj, st.kut + dt / D.vremena.zakret);
    if (st.kut > st.cilj) st.kut = Math.max(st.cilj, st.kut - dt / D.vremena.zakret);
    if (st.gdje === 'spremnik' && st.vak >= PRAG && st.kut < 0.02) { st.gdje = 'ruka'; ui.stanje('Podtlak je prešao prag: prekidač javlja prihvat (' + ADR('dist', 'vakuumOK') + ' = 1). Ruka se smije zakrenuti.', 'ok'); }
    if (st.gdje === 'ruka' && st.vak < PRAG * 0.6 && st.kut > 0.02 && st.kut < 0.98) { st.gdje = 'pao'; ui.stanje('Podtlak je pao ispod granice držanja — izradak je ispao tijekom zakreta! Upravljač smije zakrenuti ruku tek uz ' + ADR('dist', 'vakuumOK') + ' = 1.', 'opas'); }
    if (st.gdje === 'ruka' && st.kut >= 0.98 && st.vak < 5) { st.gdje = 'dizalo'; ui.stanje('Izradak je odložen na dizalo ispitne stanice.', 'ok'); }
    const f = Math.PI * (1 - st.kut);
    ruka.setAttribute('transform', `translate(${cx} ${cy}) rotate(${f1(-f / RAD)})`);
    const vrh = [cx + R * Math.cos(f), cy - R * Math.sin(f)];
    if (st.gdje === 'ruka') { izr.setAttribute('cx', f1(vrh[0])); izr.setAttribute('cy', f1(vrh[1])); izr.style.opacity = 1; }
    else if (st.gdje === 'spremnik') { izr.setAttribute('cx', cx - R); izr.setAttribute('cy', cy); izr.style.opacity = 1; }
    else if (st.gdje === 'dizalo') { izr.setAttribute('cx', cx + R); izr.setAttribute('cy', cy); izr.style.opacity = 1; }
    else { izr.setAttribute('cx', f1(vrh[0])); izr.setAttribute('cy', f1(vrh[1] + 40)); izr.style.opacity = 0.35; }
    cup.classList.toggle('tms-sisaljka-on', st.vak >= PRAG);
    bar.setAttribute('width', f1(gw * Math.min(80, st.vak) / 80));
    bar.classList.toggle('tms-vak-ok', st.vak >= PRAG);
    mlaz.classList.toggle('tms-vod-tlak', st.Q1 || st.otpuh > 0); usis.classList.toggle('tms-vod-vak', st.vak > 3);
    lv.upali(st.vak >= PRAG && st.gdje === 'ruka');
    mk1.upali(st.kut <= 0.001); mk2.upali(st.kut >= 0.999);
    o.v('−' + hr(st.vak, 0) + ' kPa', st.vak >= PRAG ? 'ok' : st.vak > 5 ? 'upoz' : ''); o.i3(bit(st.vak >= PRAG && st.gdje === 'ruka'));
    o.i4(bit(st.kut <= 0.001)); o.i5(bit(st.kut >= 0.999)); o.q1(bit(st.Q1)); o.q2(bit(st.otpuh > 0));
    return Math.abs(st.kut - kutPrije) > 1e-6 || Math.abs(st.vak - ciljV) > 0.2 || st.otpuh > 0 || st.kut !== st.cilj;
  });
  const seg = ui.seg('Zakret', [[0, 'prema spremniku (' + ADR('dist', 'zakretSpremnik') + ')'], [1, 'prema dizalu (' + ADR('dist', 'zakretDalje') + ')']], 0, (v) => { st.cilj = v; ctx.budi(); });
  const r = ui.red();
  const bV = ui.gumb('Vakuum (' + ADR('dist', 'vakuum') + ')', () => { st.Q1 = !st.Q1; bV.setAttribute('aria-pressed', String(st.Q1)); if (!st.Q1 && st.gdje === 'ruka' && st.kut > 0.98) ui.stanje('Vakuum isključen — za sigurno odvajanje daj i kratki mlaz (otpuhivanje).', 'plavo'); ctx.budi(); }, { pritisak: false, u: r, tanki: true });
  ui.gumb('Otpuhivanje (' + ADR('dist', 'otpuh') + ')', () => { st.Q1 = false; bV.setAttribute('aria-pressed', 'false'); st.otpuh = D.vremena.otpuhivanje + 0.1; ctx.budi(); }, { tanki: true, u: r });
  ui.gumb('Novi izradak', () => { st.gdje = 'spremnik'; st.cilj = 0; seg.postavi(0); st.Q1 = false; bV.setAttribute('aria-pressed', 'false'); ui.stanje('Novi izradak čeka na mjestu uzimanja.'); ctx.budi(); }, { tanki: true, u: r });
  ui.klizac('Propuštanje (hrapava ploha, oštećena sisaljka)', 0, 80, 5, 0, (x) => x + ' %', (x) => { st.leak = x / 100; ctx.budi(); });
  const o = ui.ocit([['v', 'Podtlak'], ['i3', ADR('dist', 'vakuumOK') + ' prihvat'], ['i4', ADR('dist', 'rukaSpremnik') + ' kod spremnika'], ['i5', ADR('dist', 'rukaDalje') + ' kod dizala'], ['q1', ADR('dist', 'vakuum') + ' vakuum'], ['q2', ADR('dist', 'otpuh') + ' otpuh']]);
  ctx.budi(); ui.stanje('Uključi vakuum, pa zakreni ruku prema dizalu.');
}

/* =========================================================== 3. senzori: boja i materijal */
function tSenzori(ui, ctx) {
  const svg = ui.svg(720, 400, 'Kapacitivni, optički i induktivni senzor ispred izratka na dizalu ispitne stanice');
  const wx = 470, wy = 120, ww = 150, wh = 230;
  const izr = S('rect', { x: wx, y: wy, width: ww, height: wh, rx: 6, class: 'tms-kuc-crveno' }, svg);
  const nema = T(svg, wx + ww / 2, wy + wh / 2, 'nema izratka', 'tms-l', 'middle');
  const red = [{ y: 165, ime: 'kapacitivni', oz: ADR('isp', 'prisutan') }, { y: 235, ime: 'optički', oz: ADR('isp', 'nijeCrno') }, { y: 305, ime: 'induktivni', oz: ADR('isp', 'metal') }];
  const els = red.map((r) => {
    const g = S('g', {}, svg);
    S('rect', { x: 60, y: r.y - 16, width: 150, height: 32, rx: 6, class: 'tms-senzor-t' }, g);
    T(g, 70, r.y + 6, r.ime + ' (' + r.oz + ')', 'tms-ls');
    const l = S('circle', { cx: 222, cy: r.y, r: 7, class: 'tms-lampa' }, g);
    return { g, l };
  });
  const polje = [0, 1, 2].map((k) => S('path', { d: `M 240 ${165 - 20 + k * 0} Q ${300 + k * 40} ${165} 240 ${185}`, class: 'tms-polje' }, svg));
  polje.forEach((p, k) => p.setAttribute('d', `M 232 ${150 - k * 8} Q ${290 + k * 70} 165 232 ${180 + k * 8}`));
  const snop1 = S('line', { x1: 232, y1: 228, x2: wx, y2: 228, class: 'tms-snop' }, svg);
  const snop2 = S('line', { x1: wx, y1: 242, x2: 232, y2: 242, class: 'tms-snop' }, svg);
  const zav = [0, 1, 2, 3].map((k) => S('path', { d: '', class: 'tms-polje' }, svg));
  zav.forEach((z, k) => z.setAttribute('d', `M 232 ${296 + k * 6} C 300 ${280 + k * 6} 300 ${330 - k * 6} 232 ${314 - k * 6}`));
  const vrt = [0, 1].map((k) => S('ellipse', { cx: wx + 40, cy: 305, rx: 18 + k * 12, ry: 10 + k * 7, class: 'tms-vrtlog' }, svg));
  const ODB = { crveno: 0.7, alu: 0.9, crno: 0.15 };
  const tab = H('table', { class: 'tms-tab' });
  tab.innerHTML = '<thead><tr><th>izradak</th><th>kap.</th><th>opt.</th><th>ind.</th></tr></thead>';
  const tb = H('tbody'); tab.append(tb);
  const R = [['nema', 0, 0, 0], ['crveno', 1, 1, 0], ['alu', 1, 1, 1], ['crno', 1, 0, 0]];
  const redovi = R.map((r) => { const tr = H('tr'); r.forEach((c, i) => tr.append(H(i ? 'td' : 'th', { tekst: i ? String(c) : (r[0] === 'alu' ? 'aluminijsko' : r[0]) }))); tb.append(tr); return tr; });
  ui.ocitP.append(tab);
  const st = { b: 'crveno', t: 0 };
  ctx.petlja((dt) => {
    st.t += dt;
    const b = st.b, ima = b !== 'nema';
    izr.style.display = ima ? '' : 'none'; nema.style.display = ima ? 'none' : '';
    if (ima) izr.setAttribute('class', KUC[b]);
    const kap = ima, opt = ima && ODB[b] > 0.4, ind = ima && vrstaKucista(b).metal;
    polje.forEach((p, k) => { p.classList.toggle('tms-polje-on', kap); p.style.opacity = kap ? String(0.35 + 0.65 * frac(st.t * 0.8 - k * 0.3)) : '0.25'; });
    snop1.classList.add('tms-snop-on'); snop2.classList.toggle('tms-snop-on', ima);
    snop2.style.opacity = ima ? String(ODB[b]) : '0'; snop2.style.strokeWidth = ima ? String(2 + ODB[b] * 6) : '2';
    zav.forEach((z) => z.classList.toggle('tms-polje-on', ind));
    vrt.forEach((v, k) => { v.style.display = ind ? '' : 'none'; v.style.opacity = String(0.3 + 0.7 * frac(st.t * 1.2 + k * 0.5)); });
    els[0].l.classList.toggle('tms-lampa-on', kap); els[1].l.classList.toggle('tms-lampa-on', opt); els[2].l.classList.toggle('tms-lampa-on', ind);
    const ri = ['nema', 'crveno', 'alu', 'crno'].indexOf(b);
    redovi.forEach((tr, i) => tr.classList.toggle('tms-akt', i === ri));
    o.k(bit(kap)); o.op(bit(opt)); o.in(bit(ind));
    o.z(!ima ? 'nema izratka' : ind ? 'aluminijsko (metal)' : opt ? 'crveno (plastika)' : 'crno (plastika)');
    return true;
  });
  ui.seg('Izradak na dizalu', [['nema', 'nema'], ['crveno', 'crveno'], ['alu', 'aluminijsko'], ['crno', 'crno']], 'crveno', (v) => { st.b = v; ctx.budi(); });
  const o = ui.ocit([['k', ADR('isp', 'prisutan') + ' kapacitivni'], ['op', ADR('isp', 'nijeCrno') + ' optički'], ['in', ADR('isp', 'metal') + ' induktivni'], ['z', 'Zaključak upravljača']]);
  ctx.budi(); ui.stanje('Odaberi izradak i prati koji senzor ga vidi.');
}

/* =========================================================== 4. mjerenje visine */
function tMjerenje(ui, ctx) {
  const svg = ui.svg(720, 420, 'Mjerni modul ispitne stanice s analognim senzorom visine i grafom napona s pragom');
  const s = 3000, yP = 300, xL = 150;
  S('rect', { x: xL - 70, y: yP, width: 140, height: 12, class: 'tms-al' }, svg);
  S('rect', { x: xL - 100, y: 40, width: 18, height: 280, class: 'tms-al' }, svg);
  S('rect', { x: xL - 100, y: 40, width: 120, height: 18, class: 'tms-al' }, svg);
  S('rect', { x: xL - 14, y: 58, width: 28, height: 60, rx: 3, class: 'tms-cil' }, svg);
  const sonda = S('g', {}, svg);
  S('rect', { x: xL - 8, y: 0, width: 16, height: 70, rx: 2, class: 'tms-senzor-t' }, sonda);
  S('rect', { x: xL - 3, y: 70, width: 6, height: 30, class: 'tms-sipka' }, sonda);
  const izr = kuciste(svg, 'crveno', s, 0.025); izr.na(xL, yP);
  const zrK = S('path', { d: `M ${xL + 50} ${yP - 60} L ${xL + 190} ${yP - 20}`, class: 'tms-putanja' }, svg); T(svg, xL + 130, yP - 60, 'zračni klizač', 'tms-ls', 'middle');
  const skK = S('path', { d: `M ${xL + 50} ${yP + 50} L ${xL + 190} ${yP + 80}`, class: 'tms-putanja' }, svg); T(svg, xL + 130, yP + 105, 'klizač škarta', 'tms-ls', 'middle');
  const gr = graf(svg, 420, 60, 260, 250, { x0: 20, x1: 30, y0: 0, y1: 10, xt: [20, 22, 24, 26, 28, 30], yt: [0, 2, 4, 6, 8, 10], naslov: 'napon senzora (V) prema visini (mm)', xf: String });
  S('line', { x1: gr.X(20), y1: gr.Y(0), x2: gr.X(30), y2: gr.Y(10), class: 'tms-krivulja' }, svg);
  const prag = S('line', { class: 'tms-prag' }, svg);
  const tocka = S('circle', { r: 7, class: 'tms-tocka' }, svg);
  const st = { v: VRSTE_IZRADAKA[0], log: D.logika, prag: D.mjere.isp.pragVisine * 1000, faza: 'mir', u: 0, t: 0, rez: null, izl: 0 };
  const volt = (mm) => (mm - 20) / 10 * 10;
  function odluka() {
    if (st.log === 'visina-25' || st.log === 'crno-van') { const okV = st.v.visina * 1000 >= st.prag - 1e-9; return st.log === 'crno-van' ? okV && !vrstaKucista(st.v.boja).crno : okV; }
    return procjenaIspitne(st.v.boja, st.v.visina, 'visina-boja');
  }
  ctx.petlja((dt) => {
    let dalje = false;
    if (st.faza === 'dolje') { st.u = Math.min(1, st.u + dt / D.vremena.mjerniCilindar); if (st.u >= 1) { st.faza = 'mjeri'; st.t = 0; } dalje = true; }
    else if (st.faza === 'mjeri') { st.t += dt; if (st.t > D.vremena.mjerenje) { st.rez = odluka(); st.faza = 'gore'; ui.stanje(st.rez ? 'Visina OK: izradak ide na zračni klizač prema obradnoj stanici.' : 'Visina nije OK: izradak ide na klizač škarta.', st.rez ? 'ok' : 'upoz'); } dalje = true; }
    else if (st.faza === 'gore') { st.u = Math.max(0, st.u - dt / D.vremena.mjerniCilindar); if (st.u <= 0) { st.faza = 'van'; st.izl = 0; } dalje = true; }
    else if (st.faza === 'van') { st.izl = Math.min(1, st.izl + dt / 0.8); if (st.izl >= 1) st.faza = 'mir'; dalje = true; }
    const vis = st.v.visina, vrh = yP - vis * s;
    const yS = 118 - 30 + st.u * (vrh - 100 - 118 + 30);
    sonda.setAttribute('transform', `translate(0 ${f1(Math.min(yS, vrh - 100))})`);
    izr.boja(st.v.boja, vis);
    if (st.faza === 'van' || (st.faza === 'mir' && st.rez != null)) { const k = st.rez ? zrK : skK; const L = k.getTotalLength(); const p = k.getPointAtLength(L * st.izl); izr.na(p.x, p.y + (st.rez ? 0 : -10)); izr.style.opacity = String(1 - 0.6 * st.izl); }
    else { izr.na(xL, yP); izr.style.opacity = '1'; }
    zrK.classList.toggle('tms-putanja-on', st.rez === true && st.faza !== 'dolje'); skK.classList.toggle('tms-putanja-on', st.rez === false && st.faza !== 'dolje');
    postavi(prag, { x1: gr.X(20), y1: gr.Y(volt(st.prag)), x2: gr.X(30), y2: gr.Y(volt(st.prag)) });
    const vm = vis * 1000;
    postavi(tocka, { cx: gr.X(vm), cy: gr.Y(volt(vm)) }); tocka.style.display = st.faza === 'mjeri' || st.rez != null ? '' : 'none';
    tocka.classList.toggle('tms-tocka-opas', st.rez === false);
    o.h(hr(vm, 1) + ' mm'); o.u(st.faza === 'mjeri' || st.rez != null ? hr(volt(vm), 2) + ' V' : '—'); o.p(hr(st.prag, 1) + ' mm = ' + hr(volt(st.prag), 2) + ' V');
    o.i3(st.rez == null ? '—' : bit(st.rez), st.rez ? 'ok' : st.rez === false ? 'opas' : '');
    return dalje;
  });
  const sel = H('select', { 'aria-label': 'Izradak' });
  VRSTE_IZRADAKA.forEach((v) => sel.append(H('option', { value: v.id, tekst: v.naziv })));
  ctx.on(sel, 'change', () => { st.v = VRSTE_IZRADAKA.find((x) => x.id === sel.value); st.rez = null; st.faza = 'mir'; st.u = 0; ctx.budi(); });
  const rs = ui.red(); rs.append(H('label', { class: 'tms-kv' }, H('span', { tekst: 'Izradak: ' }), sel));
  ui.seg('Logika ispitne stanice', [['visina-25', 'prag visine'], ['visina-boja', 'nazivna prema boji'], ['crno-van', 'crno van']], st.log, (v) => { st.log = v; st.rez = null; ctx.budi(); });
  ui.klizac('Prag visine', 220, 250, 1, Math.round(st.prag * 10), (x) => hr(x / 10, 1) + ' mm', (x) => { st.prag = x / 10; st.rez = null; ctx.budi(); });
  ui.gumb('Izmjeri (' + ADR('isp', 'mjerni') + ')', () => { if (st.faza !== 'mir' && st.faza !== 'van') return; st.rez = null; st.faza = 'dolje'; st.u = 0; ui.stanje('Mjerni cilindar spušta ticalo na izradak…', 'plavo'); ctx.budi(); });
  const o = ui.ocit([['h', 'Visina izratka'], ['u', 'Napon senzora'], ['p', 'Prag'], ['i3', ADR('isp', 'visinaOK') + ' visina OK']]);
  ctx.budi(); ui.stanje('Odaberi izradak i pritisni „Izmjeri”.');
}

/* =========================================================== 5. okretni stol */
function tStol(ui, ctx) {
  const svg = ui.svg(720, 440, 'Okretni stol obradne stanice odozgo sa šest gnijezda, mjestima ulaza, ispitivanja, bušenja i izlaza prema robotu');
  const cx = 330, cy = 225, R = 165, rG = 120, n = D.mjere.obr.stol.gnijezda, kor = 2 * Math.PI / n;
  const POL = D.mjere.obr.polozaji;
  S('circle', { cx, cy, r: R + 22, class: 'tms-ploca' }, svg);
  const stol = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: R, class: 'tms-stol' }, stol);
  for (let k = 0; k < n; k++) S('rect', { x: R - 12, y: -4, width: 8, height: 8, class: 'tms-metal', transform: `rotate(${f1(-k * 60)})` }, stol);
  const gn = [];
  for (let k = 0; k < n; k++) { const a = k * kor; const g = S('g', { transform: `translate(${f1(rG * Math.cos(a))} ${f1(-rG * Math.sin(a))})` }, stol); S('circle', { r: 30, class: 'tms-gn' }, g); const iz = S('circle', { r: 24, class: 'tms-kuc-crveno' }, g); const ok = S('path', { d: 'M -9 0 L -3 7 L 10 -8', class: 'tms-kvaka' }, g); const ru = S('circle', { r: 6, class: 'tms-rupa' }, g); gn.push({ g, iz, ok, ru }); }
  const opisM = { ulaz: 'ulaz (zračni klizač)', ispitivanje: 'ispitivanje', busenje: 'bušenje', izlaz: 'izlaz' };
  for (const k in POL) { const a = POL[k] * RAD; const x = cx + (R + 45) * Math.cos(a), y = cy - (R + 45) * Math.sin(a); T(svg, x, y + 5, opisM[k], 'tms-ls', Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle'); }
  const sP = senzor(svg, cx + R + 4, cy + 30, 16, 12, ''); T(svg, cx + R + 26, cy + 42, ADR('obr', 'stolUPolozaju'), 'tms-ls');
  const robot = S('g', {}, svg); S('rect', { x: 630, y: 195, width: 60, height: 60, rx: 10, class: 'tms-pogon' }, robot); T(robot, 660, 285, 'robot', 'tms-ls', 'middle');
  const st = { alfa: Math.PI, okret: null, gn: new Array(n).fill(null), auto: false, t: 0, br: 0 };
  const boje = ['crveno', 'alu', 'crveno'];
  const naM = (m) => { const a = (((POL[m] * RAD - st.alfa) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const k = Math.round(a / kor) % n; return st.okret ? -1 : k; };
  function korak() {
    if (st.okret) return;
    const iz = st.gn[naM('izlaz')];
    if (iz) { ui.stanje('Izlazno mjesto je zauzeto: stol se ne smije okrenuti dok robot ne preuzme izradak.', 'upoz'); return false; }
    if (!st.gn[naM('ulaz')] && !st.gn[naM('ispitivanje')] && !st.gn[naM('busenje')]) { ui.stanje('Na ulazu, ispitivanju i bušenju nema izradaka — nema razloga za korak.', 'upoz'); return false; }
    st.okret = { od: st.alfa, p: 0 }; ui.stanje('Motor stola (' + ADR('obr', 'motorStola') + ') okreće stol za 60°; senzor položaja privremeno je 0.', 'plavo'); ctx.budi(); return true;
  }
  ctx.petlja((dt) => {
    let dalje = st.auto;
    if (st.okret) {
      st.okret.p = Math.min(1, st.okret.p + dt / D.vremena.okretStola); st.alfa = st.okret.od - kor * glatko(st.okret.p); dalje = true;
      if (st.okret.p >= 1) {
        st.alfa = st.okret.od - kor; st.okret = null;
        const ki = st.gn[naM('ispitivanje')]; if (ki) ki.isp = true;
        const kb = st.gn[naM('busenje')]; if (kb) kb.bus = true;
        const kz = st.gn[naM('izlaz')];
        ui.stanje(kz ? 'Izradak je na izlazu: upravljač javlja robotu „izradak spreman” (' + ADR('obr', 'zaRobot') + ').' : 'Stol je u položaju; na ispitivanju i bušenju izvršene su operacije.', kz ? 'ok' : '');
      }
    }
    if (st.auto) { st.t += dt; if (st.t > 1.2 && !st.okret) { st.t = 0; const k = naM('izlaz'); if (st.gn[k]) { st.gn[k] = null; st.br++; } else { const u = naM('ulaz'); if (!st.gn[u]) st.gn[u] = { b: boje[st.br % 3] }; korak(); } } }
    stol.setAttribute('transform', `translate(${cx} ${cy}) rotate(${f1(-st.alfa / RAD)})`);
    gn.forEach((g, k) => { const iz = st.gn[k]; g.iz.style.display = iz ? '' : 'none'; if (iz) g.iz.setAttribute('class', KUC[iz.b]); g.ok.style.display = iz && iz.isp ? '' : 'none'; g.ru.style.display = iz && iz.bus ? '' : 'none'; });
    sP.upali(!st.okret);
    const has = (m) => !!st.gn[naM(m)];
    o.i0(bit(has('ulaz'))); o.i1(bit(has('ispitivanje'))); o.i2(bit(has('busenje'))); o.i3(bit(has('izlaz'))); o.i4(bit(!st.okret)); o.q0(bit(!!st.okret)); o.q6(bit(!st.okret && has('izlaz')), !st.okret && has('izlaz') ? 'ok' : ''); o.br(String(st.br));
    return dalje;
  });
  const r = ui.red();
  ui.gumb('Izradak na ulaz', () => { const k = naM('ulaz'); if (k < 0 || st.gn[k]) { ui.stanje('Ulazno gnijezdo je zauzeto ili se stol okreće.', 'upoz'); return; } st.gn[k] = { b: boje[st.br % 3] }; ui.stanje('Izradak je skliznuo u ulazno gnijezdo (' + ADR('obr', 'naUlazu') + ' = 1).'); ctx.budi(); }, { u: r });
  ui.gumb('Korak stola (' + ADR('obr', 'motorStola') + ')', korak, { u: r, tanki: true });
  ui.gumb('Robot uzima', () => { const k = naM('izlaz'); if (k < 0 || !st.gn[k]) { ui.stanje('Na izlazu nema izratka.', 'upoz'); return; } st.gn[k] = null; st.br++; ui.stanje('Robot je preuzeo izradak; izlazno mjesto je slobodno.', 'ok'); ctx.budi(); }, { u: r, tanki: true });
  ui.kvacica('Automatski rad (ulaz, takt, robot)', false, (v) => { st.auto = v; st.t = 0; ctx.budi(); });
  const o = ui.ocit([['i0', ADR('obr', 'naUlazu') + ' na ulazu'], ['i1', ADR('obr', 'naIspitivanju') + ' na ispitivanju'], ['i2', ADR('obr', 'naBusenju') + ' na bušenju'], ['i3', ADR('obr', 'naIzlazu') + ' na izlazu'], ['i4', ADR('obr', 'stolUPolozaju') + ' stol u položaju'], ['q0', ADR('obr', 'motorStola') + ' motor stola'], ['q6', ADR('obr', 'zaRobot') + ' → robot'], ['br', 'Preuzeto']]);
  ctx.budi(); ui.stanje('Stavi izradak na ulaz i pomiči stol.');
}

/* =========================================================== 6. ispitivanje, stezanje, bušenje */
function tBusenje(ui, ctx) {
  const svg = ui.svg(720, 400, 'Ispitivač i modul za bušenje sa steznim cilindrom, pogled sa strane');
  const yS = 320, s = 2600;
  S('rect', { x: 40, y: yS, width: 640, height: 14, class: 'tms-stol' }, svg);
  const xI = 200, xB = 500;
  S('rect', { x: xI - 70, y: 60, width: 16, height: yS - 60, class: 'tms-al' }, svg); S('rect', { x: xI - 70, y: 60, width: 90, height: 16, class: 'tms-al' }, svg);
  S('rect', { x: xI - 12, y: 76, width: 24, height: 60, rx: 3, class: 'tms-cil' }, svg);
  const tic = S('rect', { x: xI - 3, y: 136, width: 6, height: 80, class: 'tms-sipka' }, svg);
  const iz1 = kuciste(svg, 'alu', s, 0.025); iz1.na(xI, yS);
  const naop = S('rect', { x: xI - 0.02 * s, y: yS - 0.025 * s, width: 0.04 * s, height: 10, class: 'tms-tamno' }, svg); naop.style.display = 'none';
  T(svg, xI, yS + 40, 'ispitivač', 'tms-ls', 'middle');
  S('rect', { x: xB + 70, y: 40, width: 20, height: yS - 40, class: 'tms-al' }, svg);
  const bus = S('g', {}, svg);
  S('rect', { x: xB - 26, y: 0, width: 52, height: 90, rx: 5, class: 'tms-motor' }, bus); S('rect', { x: xB + 26, y: 20, width: 46, height: 30, class: 'tms-al' }, bus);
  const svrdlo = S('path', { d: `M ${xB - 4} 90 L ${xB + 4} 90 L ${xB + 2} 140 L ${xB} 148 L ${xB - 2} 140 Z`, class: 'tms-svrdlo' }, bus);
  const iz2 = kuciste(svg, 'alu', s, 0.025); iz2.na(xB, yS);
  const stez = cilindar(svg, xB - 200, yS - 30, 90, 22, 70, 1);
  T(svg, xB, yS + 40, 'bušenje', 'tms-ls', 'middle');
  const KOR = [
    ['Ispitivač dolje', ADR('obr', 'ispitivac') + ' = 1'], ['Provjera položaja', ADR('obr', 'ispitivacOK')], ['Ispitivač gore', ADR('obr', 'ispitivac') + ' = 0'],
    ['Stezanje', ADR('obr', 'stezanje') + ' = 1'], ['Motor i bušilica dolje', ADR('obr', 'motorBusilice') + ', ' + ADR('obr', 'busilicaDolje') + ' → ' + ADR('obr', 'busilicaDolje').replace('Q', 'I')],
    ['Bušenje (zadržavanje)', 'vrijeme'], ['Bušilica gore', ADR('obr', 'busilicaGore') + ' → ' + ADR('obr', 'busilicaGore')], ['Otpuštanje, motor stop', ADR('obr', 'stezanje') + ' = 0']
  ];
  const ol = H('ol', { class: 'tms-koraci' }); const li = KOR.map(([a, b]) => { const l = H('li', {}, H('span', {}, H('b', { tekst: a }), ' · ' + b)); ol.append(l); return l; });
  ui.ocitP.append(ol);
  const st = { k: -1, t: 0, ti: 0, bu: 0, sz: 0, rot: 0, naop: false, tB: D.vremena.busenje, izbusen: false, ok: null };
  const TT = [0.5, 0.25, 0.5, 0.3, 0.7, null, 0.7, 0.3];
  ctx.petlja((dt) => {
    let dalje = st.k >= 0;
    if (st.k >= 0) {
      st.t += dt; const T0 = st.k === 5 ? st.tB : TT[st.k]; const u = Math.min(1, st.t / T0);
      if (st.k === 0) st.ti = st.naop ? Math.min(u, 0.55) : u;
      if (st.k === 1 && st.t >= T0) { st.ok = !st.naop; if (!st.ok) { ui.stanje('Ticalo nije došlo do donjeg položaja (' + ADR('obr', 'ispitivacOK') + ' = 0): izradak je krivo položen i ne buši se.', 'opas'); } }
      if (st.k === 2) st.ti = (st.naop ? 0.55 : 1) * (1 - u);
      if (st.k === 3) st.sz = u;
      if (st.k === 4) st.bu = u;
      if (st.k === 5 && st.t >= T0) st.izbusen = true;
      if (st.k === 6) st.bu = 1 - u;
      if (st.k === 7) st.sz = 1 - u;
      if (st.k >= 4 && st.k <= 6) st.rot += dt * 30;
      if (st.t >= T0) { st.k++; st.t = 0; if (st.k === 3 && st.ok === false) st.k = -1; if (st.k >= KOR.length) { st.k = -1; ui.stanje('Slijed je gotov: izradak je izbušen i otpušten; stol se smije okrenuti.', 'ok'); } }
    }
    li.forEach((l, i) => l.classList.toggle('tms-akt', i === st.k));
    tic.setAttribute('y', f1(136 + st.ti * (yS - 0.025 * s - 216 + 10)));
    bus.setAttribute('transform', `translate(0 ${f1(60 + st.bu * (yS - 0.025 * s - 148 - 60 + 14))})`);
    svrdlo.setAttribute('transform', `translate(${f1(Math.sin(st.rot) * 1.2)} 0)`);
    stez.postavi(st.sz);
    naop.style.display = st.naop ? '' : 'none';
    o.q5(bit(st.k === 0 || st.k === 1)); o.i5(st.ok == null ? '—' : bit(st.ok), st.ok === false ? 'opas' : st.ok ? 'ok' : '');
    o.q4(bit(st.sz > 0.5)); o.q1(bit(st.k >= 4 && st.k <= 6)); o.i6(bit(st.bu <= 0.001)); o.i7(bit(st.bu >= 0.999)); o.r(st.izbusen ? 'da' : 'ne', st.izbusen ? 'ok' : '');
    return dalje;
  });
  const r = ui.red();
  ui.gumb('Pokreni slijed', () => { if (st.k >= 0) return; st.k = 0; st.t = 0; st.izbusen = false; st.ok = null; ui.stanje('Slijed teče: svaki korak čeka svoj senzor ili vrijeme.', 'plavo'); ctx.budi(); }, { u: r });
  ui.kvacica('Izradak naopako (otvorom dolje)', false, (v) => { st.naop = v; ctx.budi(); });
  ui.klizac('Vrijeme bušenja', 5, 30, 1, Math.round(st.tB * 10), (x) => hr(x / 10, 1) + ' s', (x) => { st.tB = x / 10; });
  const o = ui.ocit([['q5', ADR('obr', 'ispitivac') + ' ispitivač dolje'], ['i5', ADR('obr', 'ispitivacOK') + ' ispravno položen'], ['q4', ADR('obr', 'stezanje') + ' stezanje'], ['q1', ADR('obr', 'motorBusilice') + ' motor bušilice'], ['i6', ADR('obr', 'busilicaGore') + ' bušilica gore'], ['i7', ADR('obr', 'busilicaDolje') + ' bušilica dolje'], ['r', 'Izbušeno']]);
  ctx.budi(); ui.stanje('Pritisni „Pokreni slijed”.');
}

/* =========================================================== 7. StationLink */
function tStationLink(ui, ctx) {
  const svg = ui.svg(720, 360, 'Dvije stanice s optičkim parom StationLink: prijamnik na izlazu prethodne, odašiljač na ulazu sljedeće');
  S('rect', { x: 40, y: 120, width: 280, height: 160, rx: 10, class: 'tms-stanica' }, svg); T(svg, 180, 110, 'prethodna stanica (npr. ispitna)', 'tms-ls', 'middle');
  S('rect', { x: 400, y: 120, width: 280, height: 160, rx: 10, class: 'tms-stanica' }, svg); T(svg, 540, 110, 'sljedeća stanica (npr. obradna)', 'tms-ls', 'middle');
  const prij = S('rect', { x: 300, y: 180, width: 20, height: 30, rx: 3, class: 'tms-senzor' }, svg); T(svg, 296, 240, 'prijamnik', 'tms-ls', 'end');
  const odas = S('rect', { x: 400, y: 180, width: 20, height: 30, rx: 3, class: 'tms-senzor' }, svg); T(svg, 424, 240, 'odašiljač', 'tms-ls');
  const snop = S('line', { x1: 400, y1: 195, x2: 320, y2: 195, class: 'tms-snop' }, svg);
  const prep = S('rect', { x: 352, y: 170, width: 14, height: 50, rx: 3, class: 'tms-tamno' }, svg);
  const izr = S('circle', { r: 18, class: 'tms-kuc-crveno' }, svg);
  const lP = lampa(svg, 70, 150, 'ima izradak za predaju'), lS = lampa(svg, 430, 150, 'spremna primiti');
  const st = { sljSpremna: true, prepreka: false, ima: true, x: 180, faza: 'ceka', t: 0, obrada: 0, auto: true };
  ctx.petlja((dt) => {
    const svjetlo = st.sljSpremna && !st.prepreka;
    const iRaw = svjetlo ? 0 : 1, spremna = !iRaw;
    if (st.faza === 'ceka' && st.ima && spremna) { st.faza = 'predaja'; st.t = 0; ui.stanje('Snop svijetli: prethodna stanica predaje izradak.', 'ok'); }
    else if (st.faza === 'ceka' && st.ima && !spremna) ui.stanje(st.prepreka && st.sljSpremna ? 'Snop je prekinut: prijamnik to tumači kao „zauzeta” i predaja čeka — sigurno ponašanje kod prljavštine ili kvara.' : 'Sljedeća stanica je zauzeta: prethodna čeka.', 'upoz');
    if (st.faza === 'predaja') { st.t += dt; st.x = 180 + 360 * Math.min(1, st.t / 1.2); if (st.t >= 1.2) { st.faza = 'obrada'; st.ima = false; st.sljSpremna = false; st.obrada = 0; ui.stanje('Izradak je predan; sljedeća stanica gasi odašiljač dok ga obrađuje (zauzeta).', 'plavo'); } }
    if (st.faza === 'obrada') { st.obrada += dt; if (st.obrada > 2.5 && st.auto) { st.sljSpremna = true; seg.postavi(1); st.faza = 'ceka'; st.ima = true; st.x = 180; } }
    snop.classList.toggle('tms-snop-on', svjetlo); snop.setAttribute('x2', st.prepreka ? '366' : '320');
    prep.style.display = st.prepreka ? '' : 'none';
    odas.classList.toggle('tms-senzor-on', st.sljSpremna); prij.classList.toggle('tms-senzor-on', svjetlo);
    izr.style.display = st.ima || st.faza === 'predaja' || st.faza === 'obrada' ? '' : 'none';
    postavi(izr, { cx: st.faza === 'obrada' ? 540 : st.x, cy: 255 });
    lP.upali(st.ima); lS.upali(st.sljSpremna);
    o.q(bit(st.sljSpremna)); o.sv(svjetlo ? 'da' : 'ne'); o.i(bit(iRaw)); o.t(spremna ? 'sljedeća spremna' : 'sljedeća zauzeta', spremna ? 'ok' : 'upoz');
    return true;
  });
  const seg = ui.seg('Sljedeća stanica', [[0, 'zauzeta'], [1, 'spremna']], 1, (v) => { st.sljSpremna = !!v; ctx.budi(); });
  ui.kvacica('Prepreka u snopu (prljavština, kvar)', false, (v) => { st.prepreka = v; ctx.budi(); });
  ui.kvacica('Sljedeća stanica sama obradi izradak i ponovno javi spremnost', true, (v) => { st.auto = v; });
  ui.gumb('Novi izradak za predaju', () => { if (st.faza === 'predaja') return; st.ima = true; st.x = 180; st.faza = 'ceka'; ctx.budi(); }, { tanki: true });
  const o = ui.ocit([['q', 'Odašiljač (Q sljedeće)'], ['sv', 'Svjetlo na prijamniku'], ['i', 'Prijamnik (invertirajući) → I prethodne'], ['t', 'Tumačenje u programu']]);
  ctx.budi(); ui.stanje('Prethodna stanica ima izradak i čeka svjetlo.');
}

/* =========================================================== 8. upravljačka ploča i stroj stanja */
function tPloca(ui, ctx) {
  const svg = ui.svg(720, 440, 'Upravljačka ploča stanice i dijagram stanja: čeka RESET, inicijalizacija, spremna, radi, STOP, nužni stop');
  const pl = S('g', { transform: 'translate(30 40)' }, svg);
  S('rect', { x: 0, y: 0, width: 250, height: 200, rx: 10, class: 'tms-panel' }, pl);
  const tipka = (x, y, kl, txt, fn) => { const g = S('g', { transform: `translate(${x} ${y})` }, pl); const c = S('circle', { r: 17, class: kl }, g); T(g, 0, 38, txt, 'tms-ls tms-svj', 'middle'); klikabilno(ctx, g, txt, fn); return c; };
  const cStart = tipka(45, 45, 'tms-t-zel', 'START', () => dog('START'));
  tipka(115, 45, 'tms-t-crv', 'STOP', () => dog('STOP'));
  const cReset = tipka(185, 45, 'tms-t-pl', 'RESET', () => dog('RESET'));
  const kljuc = S('g', { transform: 'translate(45 130)' }, pl); S('circle', { r: 15, class: 'tms-tamno' }, kljuc); const kl = S('rect', { x: -3, y: -12, width: 6, height: 24, class: 'tms-metal' }, kljuc); T(kljuc, 0, 38, 'AUTO/MAN', 'tms-ls tms-svj', 'middle'); klikabilno(ctx, kljuc, 'ključ AUTO/MAN', () => dog('AUTO'));
  const q1 = lampa(pl, 100, 130, ''), q2 = lampa(pl, 145, 130, ''); T(pl, 100, 160, 'Q1', 'tms-ls tms-svj', 'middle'); T(pl, 145, 160, 'Q2', 'tms-ls tms-svj', 'middle');
  const gl = S('g', { transform: 'translate(208 140)' }, pl); S('rect', { x: -32, y: -32, width: 64, height: 64, rx: 6, class: 'tms-zuta-p' }, gl); const glC = S('circle', { r: 24, class: 'tms-gljiva' }, gl); klikabilno(ctx, gl, 'gljiva nužni stop', () => dog('GLJIVA'));
  T(pl, 125, 225, 'klikni elemente ploče', 'tms-ls', 'middle');
  const CV = { 'ceka-reset': [395, 60, 'čeka RESET'], inicijalizacija: [600, 60, 'inicijalizacija'], spremna: [600, 175, 'spremna'], radi: [600, 290, 'radi'], stop: [395, 290, 'STOP'], nuzni: [395, 175, 'nužni stop'] };
  const PR = [['ceka-reset', 'inicijalizacija', 'RESET'], ['inicijalizacija', 'spremna', 'gotovo'], ['spremna', 'radi', 'START'], ['radi', 'spremna', 'MAN: kraj ciklusa'], ['radi', 'stop', 'STOP'], ['stop', 'inicijalizacija', 'RESET'], ['nuzni', 'ceka-reset', 'gljiva izvučena']];
  PR.forEach(([a, b, t]) => { const [x1, y1] = CV[a], [x2, y2] = CV[b]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy); const ox = dy / L * 8, oy = -dx / L * 8; strel(svg, x1 + dx / L * 55 + ox, y1 + dy / L * 22 + oy, x2 - dx / L * 55 + ox, y2 - dy / L * 22 + oy, { w: 2, boja: 'var(--body)' }); const vert = Math.abs(dx) < 1; T(svg, (x1 + x2) / 2 + ox * (vert ? 1.4 : 0.6), (y1 + y2) / 2 + oy * (vert ? 0 : 2.2) + 4, t, 'tms-ls', vert ? (ox < 0 ? 'end' : 'start') : 'middle'); });
  const cv = {}; for (const k in CV) { const [x, y, t] = CV[k]; const g = S('g', {}, svg); S('rect', { x: x - 60, y: y - 20, width: 120, height: 40, rx: 20, class: 'tms-cvor' }, g); T(g, x, y + 5, t, 'tms-l', 'middle'); cv[k] = g; }
  T(svg, 500, 345, 'nužni stop: iz svakog stanja', 'tms-ls', 'middle');
  const li = S('g', { transform: 'translate(30 330)' }, svg);
  T(li, 0, 0, 'RESET linije (inicijalizacija protiv toka):', 'tms-ls');
  const stn = ['distr.', 'ispitna', 'obradna', 'robotska'].map((t, i) => { const g = S('g', { transform: `translate(${i * 70} 14)` }, li); const r = S('rect', { width: 62, height: 34, rx: 6, class: 'tms-stanica' }, g); T(g, 31, 22, t, 'tms-ls', 'middle'); return r; });
  const st = { s: 'ceka-reset', auto: true, gljiva: false, t: 0, tc: 0, lin: -1, tl: 0, ciklusi: 0 };
  function dog(e) {
    if (e === 'GLJIVA') { st.gljiva = !st.gljiva; if (st.gljiva) { st.s = 'nuzni'; ui.stanje('Nužni stop: izlazi isključeni, cilindri s jednostranim ventilima se vraćaju, vakuum se gubi.', 'opas'); } else { st.s = 'ceka-reset'; ui.stanje('Gljiva izvučena — stanica traži RESET (trepće).', 'upoz'); } }
    else if (e === 'AUTO') { st.auto = !st.auto; ui.stanje('Ključ: ' + (st.auto ? 'AUTO — neprekidan rad.' : 'MAN — jedan ciklus po tipki START.')); }
    else if (st.s === 'nuzni') ui.stanje(e + ' ne djeluje dok je gljiva pritisnuta.', 'upoz');
    else if (e === 'RESET' && (st.s === 'ceka-reset' || st.s === 'stop')) { st.s = 'inicijalizacija'; st.t = 0; ui.stanje('Inicijalizacija: aktuatori u početni položaj.', 'plavo'); }
    else if (e === 'START' && st.s === 'spremna') { st.s = 'radi'; st.tc = 0; ui.stanje('Stanica radi (' + (st.auto ? 'AUTO' : 'MAN') + ').', 'ok'); }
    else if (e === 'STOP' && (st.s === 'radi' || st.s === 'spremna' || st.s === 'inicijalizacija')) { st.s = 'stop'; ui.stanje('STOP: glavni program je zaustavljen do RESET-a.', 'upoz'); }
    else ui.stanje(e + ' u stanju „' + CV[st.s][2] + '” nema učinka.', 'upoz');
    ctx.budi();
  }
  ctx.petlja((dt) => {
    st.t += dt;
    if (st.s === 'inicijalizacija' && st.t > 1.4) { st.s = 'spremna'; ui.stanje('Inicijalizacija gotova — START svijetli.', 'ok'); }
    if (st.s === 'radi') { st.tc += dt; if (st.tc > 2.2) { st.tc = 0; st.ciklusi++; if (!st.auto) { st.s = 'spremna'; ui.stanje('MAN: jedan ciklus gotov.', 'ok'); } } }
    if (st.lin >= 0) { st.tl += dt; if (st.tl > 0.8) { st.tl = 0; st.lin++; if (st.lin > 4) st.lin = -1; } }
    const trep = Math.floor(st.t / 0.5) % 2 === 0;
    cStart.classList.toggle('tms-t-svijetli', st.s === 'spremna');
    cReset.classList.toggle('tms-t-svijetli', (st.s === 'ceka-reset' || st.s === 'stop') ? trep : st.s === 'inicijalizacija');
    q1.upali(st.s === 'radi'); q2.upali(st.s === 'nuzni' && trep, 'tms-lampa-zut');
    glC.classList.toggle('tms-gljiva-p', st.gljiva);
    kl.setAttribute('transform', st.auto ? 'rotate(45)' : 'rotate(-45)');
    for (const k in cv) cv[k].classList.toggle('tms-cvor-akt', k === st.s);
    stn.forEach((r, i) => { const red = 3 - i; r.classList.toggle('tms-stanica-akt', st.lin >= 0 && red === st.lin); r.classList.toggle('tms-stanica-gotova', st.lin >= 0 && red < st.lin); });
    o.s(CV[st.s][2]); o.k(st.auto ? 'AUTO' : 'MAN'); o.c(String(st.ciklusi));
    return true;
  });
  const r = ui.red();
  for (const e of ['RESET', 'START', 'STOP']) ui.gumb(e, () => dog(e), { u: r, tanki: e !== 'START' });
  const r2 = ui.red();
  ui.gumb('Ključ AUTO/MAN', () => dog('AUTO'), { u: r2, tanki: true });
  ui.gumb('Gljiva', () => dog('GLJIVA'), { u: r2, tanki: true, kl: 'tms-g-stop' });
  ui.gumb('RESET linije', () => { st.lin = 0; st.tl = 0; ui.stanje('Najprije se inicijalizira robotska (zadnja), pa obradna, ispitna i distribucijska — tako nijedna stanica ne preda izradak sljedećoj koja još nije u početnom položaju.', 'plavo'); ctx.budi(); }, { u: r2, tanki: true });
  const o = ui.ocit([['s', 'Stanje'], ['k', 'Način'], ['c', 'Ciklusa']]);
  ctx.budi(); ui.stanje('RESET trepće: pritisni RESET, pa START.');
}

/* =========================================================== 9. robotska montaža cilindra */
function tMontaza(ui, ctx) {
  const svg = ui.svg(720, 420, 'Montaža cilindra u gnijezdu: kućište, klip, opruga i poklopac te prihvatnica robota');
  const s = 3000, yG = 340, xG = 330;
  S('rect', { x: 20, y: yG + 30, width: 680, height: 14, class: 'tms-ploca' }, svg);
  S('rect', { x: xG - 80, y: yG - 40, width: 160, height: 70, rx: 4, class: 'tms-plavi' }, svg); T(svg, xG, yG + 62, 'montažno gnijezdo', 'tms-ls', 'middle');
  const mjesta = { kuciste: [110, yG], klip: [520, yG + 20], opruga: [610, yG], poklopac: [675, yG] };
  T(svg, 110, yG + 62, 'okretni stol', 'tms-ls', 'middle'); T(svg, 520, yG + 62, 'paleta', 'tms-ls', 'middle'); T(svg, 640, yG + 62, 'spremnici', 'tms-ls', 'middle');
  const kuc = kuciste(svg, 'crveno', s, 0.025);
  const H_ = D.izradci;
  const klip = S('g', {}, svg); const kA = S('rect', { x: -H_.klip.promjer * s / 2, y: -H_.klip.visina * s * 0.55, width: H_.klip.promjer * s, height: H_.klip.visina * s * 0.55, rx: 2, class: 'tms-kuc-crno' }, klip); S('rect', { x: -6, y: -H_.klip.visina * s, width: 12, height: H_.klip.visina * s * 0.45, class: 'tms-metal' }, klip);
  const opr = S('path', { d: (() => { let d = ''; const w = H_.opruga.promjer * s / 2, h = H_.opruga.visina * s; for (let k = 0; k <= 8; k++) d += (k ? 'L' : 'M') + f1((k % 2 ? w : -w)) + ' ' + f1(-k * h / 8) + ' '; return d; })(), class: 'tms-opruga' }, svg);
  const pok = S('g', {}, svg); S('rect', { x: -0.02 * s, y: -H_.poklopac.visina * s, width: 0.04 * s, height: H_.poklopac.visina * s, rx: 3, class: 'tms-kuc-alu' }, pok); const zub = S('rect', { x: -6, y: -H_.poklopac.visina * s - 6, width: 12, height: 6, class: 'tms-tamno' }, pok);
  S('rect', { x: 595, y: yG - 150, width: 30, height: 150, class: 'tms-cijev' }, svg); S('rect', { x: 640, y: yG - 110, width: 70, height: 110, class: 'tms-cijev' }, svg);
  const hv = S('g', { class: 'tms-hvat' }, svg); S('rect', { x: -36, y: -96, width: 72, height: 50, rx: 5, class: 'tms-motor' }, hv); S('rect', { x: -10, y: -130, width: 20, height: 34, class: 'tms-motor' }, hv); const pL = S('rect', { x: -48, y: -46, width: 10, height: 46, rx: 2, class: 'tms-prst' }, hv), pD = S('rect', { x: 38, y: -46, width: 10, height: 46, rx: 2, class: 'tms-prst' }, hv);
  const KR = [
    { t: 'Robot čeka ulaz 0, uzima kućište s okretnog stola i javlja „preuzeto”', r: [90, 130, 140, 150], d: 'kuciste', od: 'kuciste', do: 'g' },
    { t: 'Odlaže kućište u gnijezdo; senzori javljaju prisutnost (ulaz 2) i boju (ulaz 1)', r: [180, 190, 210, 240], d: null },
    { t: 'Prema boji uzima klip s palete (PT 1 ili PT 2)', r: [250, 270, 320, 380, 390], d: 'klip', od: 'klip', do: null },
    { t: 'Umeće klip u kućište', r: [400, 410, 420], d: 'klip', od: null, do: 'gk' },
    { t: 'Izlazom 1 izbacuje oprugu, uzima je i stavlja na klip', r: [440, 450, 500, 530], d: 'opruga', od: 'opruga', do: 'go' },
    { t: 'Izlazom 2 izbacuje poklopac i uzima ga', r: [550, 560, 710, 720], d: 'poklopac', od: 'poklopac', do: null },
    { t: 'Stavlja poklopac na kućište', r: [740, 750], d: 'poklopac', od: null, do: 'gp' },
    { t: 'Zakretom šake za 90° zabravljuje poklopac (pozicija 15: R = 90°)', r: [760, 770], d: null, zab: true },
    { t: 'Gotov cilindar odlaže na izlazni klizač i daje impuls „sklopljeno” (izlaz 3)', r: [790, 840, 850, 870], d: 'sve', od: 'g', do: 'izlaz' }
  ];
  const ol = H('ol', { class: 'tms-koraci' });
  const li = KR.map((k) => { const l = H('li', {}, H('span', {}, k.t, H('br'), H('code', { class: 'tms-kod', tekst: k.r.map(redakPrograma).filter(Boolean).join('  ·  ') }))); ol.append(l); return l; });
  ui.ocitP.append(ol);
  const st = { k: -1, u: 0, boja: 'crveno', auto: false, zab: 0 };
  const gornjiK = () => yG - vrstaKucista(st.boja).visina * s;
  const P0 = () => ({ kuc: st.k < 1 ? mjesta.kuciste : [xG, yG], klip: st.k < 2 ? mjesta.klip : st.k < 4 ? [xG, yG - 0.004 * s] : [xG, yG - 0.004 * s], opr: st.k < 5 ? [mjesta.opruga[0], yG - 140] : [xG, yG - (0.004 + H_.klip.visina - 0.004) * s], pok: st.k < 6 ? [mjesta.poklopac[0], yG - 160] : [xG, gornjiK()] });
  function polozaj(dioIme) {
    const pos = { kuc: mjesta.kuciste, klip: mjesta.klip, opr: [mjesta.opruga[0], yG], pok: [mjesta.poklopac[0] - 5, yG] };
    const done = st.k < 0 ? -1 : st.k;
    if (done >= 1) pos.kuc = [xG, yG];
    if (done >= 3) pos.klip = [xG, yG - 0.004 * s];
    if (done >= 4) pos.opr = [xG, yG - (H_.klip.visina) * s];
    if (done >= 6) pos.pok = [xG, gornjiK()];
    if (done >= 8) { const dx = 640 - xG; pos.kuc = [xG + dx, yG]; pos.klip = [xG + dx, yG - 0.004 * s]; pos.opr = [xG + dx, yG - H_.klip.visina * s]; pos.pok = [xG + dx, gornjiK()]; }
    return pos[dioIme];
  }
  void P0;
  ctx.petlja((dt) => {
    let dalje = false;
    const prije = { kuc: polozaj('kuc'), klip: polozaj('klip'), opr: polozaj('opr'), pok: polozaj('pok') };
    if (st.k >= 0 && st.u < 1) { st.u = Math.min(1, st.u + dt / 1.1); dalje = true; if (st.u >= 1 && st.auto && st.k < KR.length - 1) { st.k++; st.u = 0; } }
    if (KR[st.k] && KR[st.k].zab) st.zab = st.u; else if (st.k > 7) st.zab = 1; else if (st.k < 7) st.zab = 0;
    li.forEach((l, i) => l.classList.toggle('tms-akt', i === st.k));
    /* interpolacija dijela koji se nosi */
    const k = KR[st.k];
    const nos = k && k.d ? (k.d === 'sve' ? ['kuc', 'klip', 'opr', 'pok'] : [{ kuciste: 'kuc', klip: 'klip', opruga: 'opr', poklopac: 'pok' }[k.d]]) : [];
    const uk = glatko(st.u);
    const prethodni = (ime) => { const kk = st.k; st.k = kk - 1; const p = polozaj(ime); st.k = kk; return p; };
    const crt = (ime, el, fn) => {
      let p = polozaj(ime);
      if (nos.includes(ime) && st.u < 1) { const a = prethodni(ime); p = [a[0] + (p[0] - a[0]) * uk, a[1] + (p[1] - a[1]) * uk - Math.sin(Math.PI * uk) * 90]; }
      fn(el, p);
    };
    crt('kuc', kuc, (el, p) => { el.boja(st.boja, vrstaKucista(st.boja).visina); el.na(p[0], p[1]); });
    crt('klip', klip, (el, p) => el.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])})`));
    crt('opr', opr, (el, p) => el.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])})`));
    crt('pok', pok, (el, p) => el.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])})`));
    kA.setAttribute('class', st.boja === 'crno' ? 'tms-kuc-alu' : 'tms-kuc-crno');
    zub.setAttribute('x', f1(-6 + 24 * Math.sin(st.zab * Math.PI / 2)));
    const cilj = nos.length ? (() => { const ime = nos[nos.length - 1]; let p = polozaj(ime); if (st.u < 1) { const a = prethodni(ime); p = [a[0] + (p[0] - a[0]) * uk, a[1] + (p[1] - a[1]) * uk - Math.sin(Math.PI * uk) * 90]; } return p; })() : [xG, yG - 120];
    hv.setAttribute('transform', `translate(${f1(cilj[0])} ${f1(cilj[1] - (nos.length ? 10 : 0))})`);
    const zat = nos.length && st.u < 1 ? 1 : 0;
    pL.setAttribute('x', f1(-48 + zat * 14)); pD.setAttribute('x', f1(38 - zat * 14));
    void prije;
    o.k(st.k < 0 ? '—' : (st.k + 1) + ' / ' + KR.length); o.b(vrstaKucista(st.boja).naziv); o.u1(bit(!vrstaKucista(st.boja).crno)); o.kl(st.boja === 'crno' ? 'srebrni (PT 2)' : 'crni (PT 1)');
    return dalje;
  });
  ui.seg('Kućište', [['crveno', 'crveno'], ['alu', 'aluminijsko'], ['crno', 'crno']], 'crveno', (v) => { st.boja = v; st.k = -1; st.u = 0; ui.stanje('Novo kućište čeka na okretnom stolu.'); ctx.budi(); });
  const r = ui.red();
  ui.gumb('Sljedeći korak', () => { if (st.k >= KR.length - 1) { st.k = -1; } st.k++; st.u = 0; st.auto = false; ui.stanje(KR[st.k].t + '.', st.k === KR.length - 1 ? 'ok' : 'plavo'); ctx.budi(); }, { u: r });
  ui.gumb('Pokreni cijeli slijed', () => { st.k = 0; st.u = 0; st.auto = true; ui.stanje('Robot izvodi program montaže.', 'plavo'); ctx.budi(); }, { u: r, tanki: true });
  const o = ui.ocit([['k', 'Korak'], ['b', 'Kućište'], ['u1', 'Ulaz 1 (nije crno)'], ['kl', 'Klip']]);
  ctx.budi(); ui.stanje('Odaberi boju kućišta i prolazi korake.');
}

/* =========================================================== 10. rukovanje PLC ↔ robot */
function tRukovanje(ui, ctx) {
  const svg = ui.svg(720, 400, 'Vremenski dijagram signala između obradne stanice i robota');
  const X0 = 210, X1 = 690, TT = 10;
  const TR = [
    { n: 'obradna: izradak na izlazu (' + ADR('obr', 'naIzlazu') + ')', f: (t, z) => (t >= 0.5 && t < (z ? 99 : 4.6)) },
    { n: 'obradna ' + ADR('obr', 'zaRobot') + ' → robot ulaz 0', f: (t, z) => (t >= 0.8 && t < (z ? 99 : 4.2)) },
    { n: 'robot: prihvatnica zatvorena (GC)', f: (t, z) => (!z && t >= 3.4 && t < 7.2) },
    { n: 'robot izlaz 0 → obradna ' + ADR('obr', 'robotPreuzeo'), f: (t, z) => (!z && t >= 4.0 && t < 5.4) },
    { n: 'obradna: motor stola (' + ADR('obr', 'motorStola') + ')', f: (t, z) => (!z && t >= 5.0 && t < 6.0) }
  ];
  const yR = (i) => 70 + i * 62;
  const X = (t) => X0 + (X1 - X0) * t / TT;
  TR.forEach((tr, i) => {
    T(svg, 10, yR(i) + 4, tr.n.length > 30 ? tr.n.slice(0, 30) + '…' : tr.n, 'tms-ls');
    S('line', { x1: X0, y1: yR(i) + 14, x2: X1, y2: yR(i) + 14, class: 'tms-mreza' }, svg);
    tr.p = S('path', { d: '', class: 'tms-signal' }, svg);
  });
  for (let t = 0; t <= TT; t += 2) T(svg, X(t), 385, t + ' s', 'tms-ls', 'middle');
  const kur = S('line', { x1: X0, y1: 40, x2: X0, y2: 370, class: 'tms-kursor' }, svg);
  const st = { t: 0, radi: false, zast: false, brz: 1 };
  function crtaj() {
    TR.forEach((tr, i) => { let d = '', pre = null; for (let t = 0; t <= Math.min(st.t, TT) + 1e-9; t += 0.05) { const v = tr.f(t, st.zast) ? 1 : 0; const y = yR(i) + 14 - v * 26; if (pre === null) d += `M ${f1(X(t))} ${f1(y)}`; else if (v !== pre) d += ` L ${f1(X(t))} ${f1(yR(i) + 14 - pre * 26)} L ${f1(X(t))} ${f1(y)}`; else d += ` L ${f1(X(t))} ${f1(y)}`; pre = v; } tr.p.setAttribute('d', d); });
  }
  /* redak programa robota prema vremenu */
  const RED = st.zast ? [] : [[0, 90], [1.5, 130], [2.6, 140], [4.0, 150], [4.3, 160], [5.4, 170], [5.6, 180]];
  const ol = H('ol', { class: 'tms-koraci tms-prog' });
  const linije = [90, 100, 110, 130, 140, 150, 160, 170, 180].map((b) => { const l = H('li', {}, H('code', { class: 'tms-kod', tekst: redakPrograma(b) })); ol.append(l); return [b, l]; });
  ui.ocitP.append(ol);
  ctx.petlja((dt) => {
    if (st.radi) { st.t += dt * st.brz; if (st.t >= TT) { st.t = TT; st.radi = false; bI.osvjezi(); ui.stanje(st.zast ? 'Robot nije preuzeo izradak: „izradak spreman” je ostao uključen, stol čeka — zastoj linije.' : 'Ciklus gotov: obradna je isključila signal tek kad je robot potvrdio preuzimanje, a stol se okrenuo nakon potvrde.', st.zast ? 'upoz' : 'ok'); } }
    crtaj();
    postavi(kur, { x1: X(st.t), x2: X(st.t) });
    let akt = 90;
    if (!st.zast) { for (const [t, b] of RED) if (st.t >= t) akt = b; if (st.t < 1.5) akt = [90, 100, 110][Math.floor(st.t * 4) % 3]; }
    else akt = [90, 100, 110][Math.floor(st.t * 4) % 3];
    linije.forEach(([b, l]) => l.classList.toggle('tms-akt', b === akt));
    o.t(hr(st.t, 1) + ' s'); o.u0(bit(TR[1].f(st.t, st.zast))); o.q0(bit(TR[3].f(st.t, st.zast)));
    return st.radi;
  });
  const bI = ui.igraj(st, 'radi', 'Pokreni ciklus', (v) => { if (v && st.t >= TT) st.t = 0; });
  ui.klizac('Brzina prikaza', 25, 200, 25, 100, (x) => x + ' %', (x) => { st.brz = x / 100; });
  ui.kvacica('Robot u STOP-u (ne preuzima)', false, (v) => { st.zast = v; st.t = 0; ctx.budi(); });
  const o = ui.ocit([['t', 'Vrijeme'], ['u0', 'Robot ulaz 0'], ['q0', 'Robot izlaz 0']]);
  ui.sitno(ROBOT_SUCELJE.sw1Bit5 + '.');
  ctx.budi(); ui.stanje('Pritisni „Pokreni ciklus”.');
}

/* =========================================================== popis graditelja */
const GRADITELJI = {
  'spremnik-izbacivac': tSpremnik, 'vakuum-zakretna-ruka': tVakuum, 'senzori-boja-materijal': tSenzori, 'mjerenje-visine': tMjerenje,
  'okretni-stol': tStol, 'busenje-provjera': tBusenje, 'stationlink': tStationLink, 'start-stop-reset': tPloca,
  'montaza-cilindra': tMontaza, 'plc-robot-rukovanje': tRukovanje
};
void PLOCA; void TOK;

/* =========================================================== izvoz */
export function prikazi(el, id) {
  if (!el) throw new Error('teme_mps: nedostaje element');
  if (!GRADITELJI[id] || !TEME[id]) {
    el.replaceChildren(H('p', { class: 'tms-stanje tms-upoz', tekst: 'Tema „' + id + '” ne postoji.' }));
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
