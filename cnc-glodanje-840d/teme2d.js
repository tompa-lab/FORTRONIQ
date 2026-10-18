// teme2d.js — 13 interaktivnih 2D tema za stranicu „Upoznavanje stroja”
// (DOS ForTroniQ, područje CNC glodanje — SINUMERIK 840D). ES modul bez ovisnosti.
// Izvozi: TEME (naslovi, engleski izvorni nazivi, tekstovi) i prikazi(el, id) → { unisti() }.
// Tekst i grafika su vlastiti; brojevi označeni kao primjer su naše pretpostavke.

/* =========================================================== tekstovi */
export const TEME = {
  izvedbe: {
    naslov: 'Izvedbe glodalica: konzolna i s križnim stolom',
    engl: 'Design principle: console design and cross table design',
    uvod: [
      'Pri programiranju uvijek zamišljaš da se giba alat, a obradak miruje: +X je udesno, +Y od tebe (prema stupu), +Z prema gore.',
      'Na stvarnom stroju često se giba stol s obratkom. Tada se stol giba suprotno od programiranog smjera, a takav smjer označava se crticom: X′, Y′, Z′.'
    ],
    kako: 'Odaberi izvedbu i pritišći tipke smjera. U pogledu „Programer” giba se samo alat; u pogledu „Stvarni stroj” gibaju se sklopovi koji se na toj izvedbi doista gibaju. Položaj alata prema obratku u oba je pogleda isti — zato program ne ovisi o izvedbi stroja.'
  },
  kuglicno: {
    naslov: 'Kuglično navojno vreteno',
    engl: 'Ball screw drive',
    uvod: [
      'Kuglično navojno vreteno pretvara vrtnju servomotora u pravocrtno gibanje saonica. Između vretena i matice kotrljaju se kuglice; na kraju matice ulaze u povratni kanal i vraćaju se na početak, pa kruže bez kraja.',
      'Dvije matice međusobno su prednapregnute, pa pogon nema zračnosti ni pri promjeni smjera.'
    ],
    kako: 'Klizačem zadaj brzinu vrtnje. Matica se za svaki okretaj pomakne za jedan uspon P, pa je brzina posmaka v = n · P. S jednom maticom bez prednapona vidjet ćeš izgubljeni hod pri svakoj promjeni smjera; s dvije prednapregnute matice zadani i stvarni položaj se poklapaju. Prikaz je usporen, a zračnost jako uvećana.'
  },
  mjerni: {
    naslov: 'Mjerni sustav — načelo prosvjetljavanja',
    engl: 'Indirect measuring system',
    uvod: [
      'Kondenzor svjetlo iz LED-a usmjeri u paralelan snop. Snop prolazi kroz ploču za očitavanje i staklenu mjernu letvu s gustom rešetkom te pada na fotoelemente.',
      'Kad se letva pomakne, prozirne i neprozirne crtice naizmjence propuštaju i zaklanjaju svjetlo. Svaki korak daje jedan impuls (da/ne), a elektronika impulse broji i pretvara u položaj.',
      'Na ovom stroju mjerni sustav je u servomotoru: mjeri se kut vrtnje motora, a položaj saonica računa se preko uspona vretena (neizravno mjerenje). Isto načelo koristi i staklena mjerna letva na saonicama (izravno mjerenje).'
    ],
    kako: 'Pomakni letvu klizačem ili tipkama. Dva prozora na ploči za očitavanje pomaknuta su za četvrtinu periode, pa signal B kasni za signalom A. Iz toga elektronika zna smjer gibanja i broji četiri brida po periodi. Rešetka je jako uvećana; razdioba 20 µm i korak 5 µm su primjer.'
  },
  stickslip: {
    naslov: 'Centralno podmazivanje i efekt stick-slip',
    engl: 'Central lubrication / Stick-Slip effect',
    uvod: [
      'Saonice klize po vodilicama bez trzanja samo ako između njih stalno ima uljnog filma. Centralno podmazivanje u razmacima potiskuje ulje do svih kliznih mjesta.',
      'Bez maziva statičko trenje postaje znatno veće od kliznog. Saonice tada zapinju i trzaju (stick-slip): pogon napinje elastični prijenos dok se saonice ne otrgnu i ne preskoče. U najgorem slučaju vodilice se oštete — zato redovito provjeravaj razinu maziva.'
    ],
    kako: 'Pogon vuče saonice stalnom brzinom preko elastičnog člana (opruga zamjenjuje elastičnost vretena, spojke i ležajeva). Odaberi „Bez maziva” ili pusti da se spremnik isprazni pa usporedi brzinu saonica na grafu: s mazivom je mirna, bez maziva skače između nule i vršnih vrijednosti. Vremena i razmaci podmazivanja jako su skraćeni.'
  },
  g54mks: {
    naslov: 'Nultočka stroja i pomak nultočke (G54)',
    engl: 'Machine zero point / zero point displacement',
    uvod: [
      'Nultočku stroja M odredio je proizvođač i ona se ne mijenja. Program pišeš od nultočke obratka W, a upravljanje programiranim koordinatama dodaje pomak nultočke iz tablice (ovdje G54).',
      'Ispravan program nije dovoljan: ako je u tablici kriv pomak između M i W, alat ide na krivo mjesto i može udariti u obradak ili škripac.'
    ],
    kako: 'Odaberi vrijednosti u tablici G54 (ili upiši svoje) i pokreni program. Stvarni položaj vrha alata = pomak G54 + koordinata iz programa (uz korekciju duljine alata). Prati obje projekcije: tlocrt X–Y i bokocrt X–Z. Hod je prikazan ubrzano.'
  },
  g54wks: {
    naslov: 'Nultočka obratka i pomak nultočke (G54)',
    engl: 'Workpiece zero point / zero point displacement',
    uvod: [
      'Nultočku obratka W biraš sam, tako da kote s crteža možeš izravno upisivati u program — ovdje je u lijevom prednjem gornjem kutu obratka.',
      'Obrada je ispravna tek kad su ispravni i program i pomak nultočke. Jednako moraju biti ispravni podaci alata (duljina, polumjer) i tehnološki podaci (brzina vrtnje, posmak).'
    ],
    kako: 'Promijeni pomak G54 ili duljinu alata i pokreni program. Ako je duljina alata upisana premala, upravljanje misli da je vrh alata više nego što stvarno jest — G0 Z1 tada završi u obratku. Kriva vrijednost X ili Y ne mora izazvati sudar, ali utor završi na krivom mjestu (škart).'
  },
  stezanje: {
    naslov: 'Stezanje alata SK40 u pinoli',
    engl: 'Tool clamping device for SK40',
    uvod: [
      'Alat se u vretenu drži mehanički: paket tanjurastih opruga povlači vlačnu motku prema gore, čeljusti obuhvate zatezni svornjak i uvuku konus SK40 u vreteno.',
      'Zbog sigurnosti prevladava sila opruga: kad nema zraka, alat ostaje stegnut. Tek kad zrak uđe u prostor klipa, klip stisne opruge i otpusti alat.'
    ],
    kako: 'Pritisni „Zrak u klip”: klip najprije prijeđe slobodni hod, zatim potiskuje vlačnu motku prema dolje i sabija opruge, a čeljusti ulaze u širi dio provrta i otvaraju se. Tada možeš izvaditi ili umetnuti alat. Kad ispustiš zrak (ili zrak nestane), opruge opet stegnu alat.'
  },
  pneumatika: {
    naslov: 'Pneumatska jedinica za otpuštanje alata',
    engl: 'Pneumatic unit / tool clamping device',
    uvod: [
      'Tipka za izmjenu alata daje električni signal elektromagnetu 3/2 razvodnika. Zrak tada teče kroz nepovratni ventil jednosmjernog prigušnog ventila i brzo puni cilindar.',
      'Kad tipku pustiš, opruga vrati razvodnik, a opruge cilindra istiskuju zrak kroz prigušnicu prema ispuhu — cilindar se vraća polako.'
    ],
    kako: 'Drži tipku pritisnutu (mišem, prstom ili razmaknicom) pa je pusti. Klizačem mijenjaš prigušenje, tj. vrijeme povratka. Razvodnik se na shemi pomakne tako da se aktivni položaj poravna s priključcima 1, 2 i 3 — tako se čitaju pneumatske sheme.'
  },
  oslonac: {
    naslov: 'Stezne pandže — sila oslonca',
    engl: 'Clamping claws / Support force principle',
    uvod: [
      'Stezna pandža je poluga: jednim krajem pritišće obradak, drugim se oslanja na podložni blok, a između njih pritežeš vijak.',
      'Iz ravnoteže momenata oko vijka vrijedi F_obr · l1 = F_osl · l2. Uz istu silu vijka obradak je stegnut to jače što je vijak bliže obratku.'
    ],
    kako: 'Pomakni vijak klizačem i pokreni pritezanje. Sila vijka je 10 kN (primjer) i dijeli se: F_obr = F_v · l2 / (l1 + l2), F_osl = F_v · l1 / (l1 + l2). Zaključak: vijak postavi što bliže obratku, a podložni blok neka bude iste visine kao stezno mjesto, da pandža bude vodoravna.'
  },
  sonda: {
    naslov: '3D mjerna sonda — određivanje nultočke',
    engl: 'Remote measuring probe',
    uvod: [
      'Mjerna sonda stavlja se u vreteno kao alat. Kad kuglica dodirne obradak, sonda bežično javi upravljanju trenutak dodira, a upravljanje zapamti položaj osi.',
      'Mjerni ciklus iz tih položaja izračuna rub, plohu ili središte i sam upiše nultočku — npr. u kut obratka ili u središte kružnog džepa.'
    ],
    kako: 'Odaberi način i pokreni mjerenje. Pri dodiru u smjeru +X rub je za polumjer kuglice ispred njezina središta (X_rub = X_središte + r); pri dodiru u smjeru −Z ploha je za r ispod središta. Za kružni džep dovoljna su tri dodira: kroz tri točke prolazi samo jedna kružnica. Kuglica Ø 6 mm i mjere obratka su primjer.'
  },
  regulacija: {
    naslov: 'Regulacijski krug osi',
    engl: 'Control with drive module',
    uvod: [
      'Upravljanje čita NC blokove, tumači ih i interpolacijom u svakom taktu računa zadani položaj svake osi. Te vrijednosti idu modulu osi koji napaja servomotor.',
      'Mjerni sustav na motoru (rezolver ili enkoder) stalno javlja stvarni položaj, a regulator ga uspoređuje sa zadanim. Razlika je slijedna pogreška i iz nje nastaje nova naredba za brzinu.'
    ],
    kako: 'Pritisni „Cycle Start” i prati tok signala kroz krug. Na grafu su zadani (crtkano) i stvarni položaj osi Y. Stvarni zaostaje za zadanim približno za v / Kv; veći Kv smanjuje zaostajanje, a prevelik izaziva nadvišenje. Model je pojednostavljen: P-regulator položaja i jedan član kašnjenja umjesto pogona (vremenska konstanta 20 ms je pretpostavka).'
  },
  plc: {
    naslov: 'PLC — uvjeti za pokretanje stroja',
    engl: 'PLC (Programmable Logic Controllers)',
    uvod: [
      'PLC stalno očitava ulaze i prema programu postavlja izlaze. Stroj smije krenuti samo kad su vrata zatvorena, gljiva za nužno zaustavljanje otpuštena i saonice nisu na graničnom prekidaču.',
      'Ta tri uvjeta povezana su I-vezom (AND): izlaz je 1 samo kad su svi ulazi 1.'
    ],
    kako: 'Mijenjaj stanje vrata, gljive i saonica i prati signal kroz I-vrata ili kroz ljestvičasti prikaz (LAD). Premošćenje sigurnosne sklopke prikazano je samo da vidiš zašto je zabranjeno: PLC tada „vidi” zatvorena vrata iako su otvorena. Na stvarnim strojevima sigurnosne funkcije izvode sigurnosni sklopovi ili sigurnosni PLC; ovdje je prikazana samo logika.'
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

/* =========================================================== 1. izvedbe */
function tIzvedbe(ui, ctx) {
  const st = { izv: 'konz', pogled: 'stroj', rel: { x: 0, y: 0, z: 0 }, cilj: { x: 0, y: 0, z: 0 }, sjaj: 0 };
  const LIM = { x: [-80, 80], y: [-40, 40], z: [-10, 50] };
  const svg = ui.svg(560, 414, 'Glodalica u kosoj projekciji: sklopovi koji se gibaju i smjerovi osi X, Y, Z te X′, Y′, Z′');
  const P = (x, y, z) => [150 + x + y * 0.42, 390 - z - y * 0.3];
  const pm = (dx, dy, dz) => `translate(${(dx + dy * 0.42).toFixed(2)} ${(-dz - dy * 0.3).toFixed(2)})`;
  const sc = S('g', {}, svg);
  let D = { g: {}, strel: [], tri: {} };

  function kut(g, x, y, z, w, d, h, kl) {
    const p = (a, b, c) => P(a, b, c).map(v => v.toFixed(1)).join(',');
    const gg = S('g', { class: kl }, g);
    S('polygon', { points: [p(x, y, z + h), p(x, y + d, z + h), p(x + w, y + d, z + h), p(x + w, y, z + h)].join(' '), class: 't2d-gore' }, gg);
    S('polygon', { points: [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)].join(' '), class: 't2d-bok' }, gg);
    S('polygon', { points: [p(x, y, z), p(x + w, y, z), p(x + w, y, z + h), p(x, y, z + h)].join(' '), class: 't2d-lice' }, gg);
    return gg;
  }
  function strelP(g, a, b, tekst, boja, lanac, os, tpos) {
    const gg = S('g', { class: 't2d-os' }, g);
    const p1 = P(...a), p2 = P(...b);
    strel(gg, p1[0], p1[1], p2[0], p2[1], { boja, w: 3.5, gl: 13 });
    const tp = tpos || [p2[0] + (p2[0] - p1[0]) * 0.18, p2[1] + (p2[1] - p1[1]) * 0.18 + 6];
    T(gg, tp[0], tp[1], tekst, 't2d-lb', 'middle').style.fill = boja.startsWith('var') ? boja : boja;
    D.strel.push({ g: gg, lanac, os });
    return gg;
  }
  function crtaj() {
    sc.replaceChildren();
    D = { g: {}, strel: [], tri: {} };
    // trijada programiranja
    const tri = S('g', {}, sc);
    T(tri, 16, 28, 'Program (giba se alat)', 't2d-ls');
    const O = [52, 118];
    const tv = { x: [58, 0], y: [46, -33], z: [0, -58] };
    for (const a of ['x', 'y', 'z']) {
      const gg = S('g', { class: 't2d-os' }, tri);
      strel(gg, O[0], O[1], O[0] + tv[a][0], O[1] + tv[a][1], { boja: 'var(--teal)', w: 3.5, gl: 12 });
      T(gg, O[0] + tv[a][0] * 1.28 + (a === 'z' ? 0 : 2), O[1] + tv[a][1] * 1.22 + 6, '+' + a.toUpperCase(), 't2d-lb', 'middle').style.fill = 'var(--teal)';
      D.tri[a] = gg;
    }
    const kv = st.izv === 'konz';
    if (kv) {
      kut(sc, -40, 0, 0, 340, 170, 30, 't2d-k-siv');            // postolje
      kut(sc, 60, 120, 30, 140, 80, 290, 't2d-k-siv');           // stup
      const kon = S('g', {}, sc); kut(kon, 50, 30, 80, 160, 90, 60, 't2d-k-pom2');   // konzola
      const sed = S('g', {}, kon); kut(sed, 70, 40, 140, 120, 70, 20, 't2d-k-pom');  // poprečne saonice
      const stol = S('g', {}, sed); kut(stol, -20, 50, 160, 300, 50, 18, 't2d-k-pom2'); // stol
      kut(stol, 100, 55, 178, 60, 40, 20, 't2d-k-obr');                            // obradak
      const gl = S('g', {}, sc);
      kut(gl, 95, 40, 260, 70, 80, 60, 't2d-k-siv');
      kut(gl, 124, 74, 236, 12, 12, 24, 't2d-k-siv');
      kut(gl, 127, 77, 214, 6, 6, 22, 't2d-k-alat');
      D.g = { kon, sed, stol, gl };
      const ov = S('g', {}, sc);
      strelP(ov, [262, 50, 169], [205, 50, 169], 'X′', B.nar, ['kon', 'sed', 'stol'], 'x', null);
      strelP(ov, [300, 105, 150], [300, 25, 150], 'Y′', B.nar, ['kon', 'sed'], 'y', null);
      strelP(ov, [30, 30, 140], [30, 30, 88], 'Z′', B.nar, ['kon'], 'z', null);
      const t = S('g', {}, sc);
      T(t, 300, 406, 'konzola (Z′) · poprečne saonice (Y′) · stol (X′)', 't2d-ls', 'middle');
    } else {
      kut(sc, -40, 0, 0, 340, 200, 60, 't2d-k-siv');            // postolje
      kut(sc, 70, 150, 60, 120, 50, 260, 't2d-k-siv');           // stup
      const kr = S('g', {}, sc); kut(kr, 40, 30, 60, 180, 110, 25, 't2d-k-pom');      // križne saonice
      const stol = S('g', {}, kr); kut(stol, -20, 45, 85, 300, 80, 20, 't2d-k-pom2'); // stol
      kut(stol, 100, 65, 105, 60, 40, 20, 't2d-k-obr');
      const gl = S('g', {}, sc);
      kut(gl, 90, 70, 200, 80, 80, 60, 't2d-k-pom');
      kut(gl, 124, 104, 178, 12, 12, 22, 't2d-k-siv');
      kut(gl, 127, 107, 155, 6, 6, 23, 't2d-k-alat');
      D.g = { kr, stol, gl };
      const ov = S('g', {}, sc);
      strelP(ov, [262, 45, 95], [205, 45, 95], 'X′', B.nar, ['kr', 'stol'], 'x', null);
      strelP(ov, [300, 120, 72], [300, 30, 72], 'Y′', B.nar, ['kr'], 'y', null);
      strelP(ov, [205, 110, 222], [205, 110, 272], 'Z', 'var(--teal)', ['gl'], 'z', null);
      const t = S('g', {}, sc);
      T(t, 300, 406, 'križne saonice (Y′) · stol (X′) · glava vretena (Z)', 't2d-ls', 'middle');
    }
    primijeni();
  }
  function primijeni() {
    const r = st.rel, tr = { kon: [0, 0, 0], sed: [0, 0, 0], stol: [0, 0, 0], kr: [0, 0, 0], gl: [0, 0, 0] };
    if (st.pogled === 'prog') tr.gl = [r.x, r.y, r.z];
    else if (st.izv === 'konz') { tr.kon = [0, 0, -r.z]; tr.sed = [0, -r.y, 0]; tr.stol = [-r.x, 0, 0]; }
    else { tr.kr = [0, -r.y, 0]; tr.stol = [-r.x, 0, 0]; tr.gl = [0, 0, r.z]; }
    for (const k in D.g) D.g[k].setAttribute('transform', pm(...tr[k]));
    for (const a of D.strel) {
      const s = [0, 0, 0];
      for (const k of a.lanac) { s[0] += tr[k][0]; s[1] += tr[k][1]; s[2] += tr[k][2]; }
      a.g.setAttribute('transform', pm(...s));
      a.g.style.display = st.pogled === 'prog' ? 'none' : '';
    }
    o.x(hr(r.x, 0) + ' mm'); o.y(hr(r.y, 0) + ' mm'); o.z(hr(r.z, 0) + ' mm');
  }
  const ime = {
    konz: { x: ['stol', 'giba'], y: ['poprečne saonice', 'gibaju'], z: ['konzola', 'giba'] },
    kriz: { x: ['stol', 'giba'], y: ['križne saonice', 'gibaju'], z: ['glava vretena', 'giba'] }
  };
  const smjer = { x: ['ulijevo', 'udesno'], y: ['prema tebi', 'od tebe (prema stupu)'], z: ['prema dolje', 'prema gore'] };
  function jog(os, zn) {
    const novo = ogr(st.cilj[os] + zn * 20, LIM[os][0], LIM[os][1]);
    const OS = os.toUpperCase(), zz = zn > 0 ? '+' : '−';
    if (novo === st.cilj[os]) { ui.stanje(`Granica hoda za os ${OS} u ovom prikazu.`, 'upoz'); return; }
    st.cilj[os] = novo;
    let txt = `Program ${zz}${OS}: alat se prema obratku giba ${smjer[os][zn > 0 ? 1 : 0]}. `;
    if (st.pogled === 'prog') txt += 'Ovako zamišljaš gibanje pri programiranju.';
    else {
      const [n, gl] = ime[st.izv][os];
      if (st.izv === 'konz' || os !== 'z') txt += `Na stroju se ${n} ${gl} ${smjer[os][zn > 0 ? 0 : 1]}, tj. u smjeru ${zz}${OS}′.`;
      else txt += `Na stroju se ${n} ${gl} ${smjer[os][zn > 0 ? 1 : 0]} — isti smjer kao u programu, bez crtice.`;
    }
    ui.stanje(txt);
    for (const k in D.tri) D.tri[k].classList.toggle('t2d-sjaj', k === os);
    for (const a of D.strel) a.g.classList.toggle('t2d-sjaj', a.os === os);
    st.sjaj = 1.6;
    ctx.budi();
  }
  ui.seg('Izvedba', [['konz', 'Konzolna'], ['kriz', 'Križni stol']], st.izv, v => { st.izv = v; crtaj(); ui.stanje(v === 'konz' ? 'Konzolna izvedba: obradak se giba u sve tri osi (X′, Y′, Z′), alat samo rotira.' : 'Izvedba s križnim stolom: stol giba obradak u X′ i Y′, a glava vretena giba alat u Z.'); });
  ui.seg('Pogled', [['stroj', 'Stvarni stroj'], ['prog', 'Programer (giba se alat)']], st.pogled, v => { st.pogled = v; primijeni(); ui.stanje(v === 'prog' ? 'Pogled programera: zamišljaš da obradak miruje, a giba se samo alat.' : 'Stvarni stroj: gibaju se sklopovi koji se na ovoj izvedbi doista gibaju.'); });
  const r1 = ui.red('t2d-jog');
  for (const [os, zn] of [['x', -1], ['x', 1], ['y', -1], ['y', 1], ['z', -1], ['z', 1]]) {
    const z = zn > 0 ? '+' : '−';
    ui.gumb(z + os.toUpperCase(), () => jog(os, zn), { u: r1, tanki: true, aria: `Programirani smjer ${zn > 0 ? 'plus' : 'minus'} ${os.toUpperCase()}` });
  }
  ui.gumb('Početni položaj', () => { st.cilj = { x: 0, y: 0, z: 0 }; ui.stanje('Povratak u početni položaj.'); ctx.budi(); }, { tanki: true, u: ui.red() });
  const o = ui.ocit([['x', 'Alat prema obratku X'], ['y', 'Alat prema obratku Y'], ['z', 'Alat prema obratku Z']]);
  ctx.petlja(dt => {
    let ide = false;
    for (const a of ['x', 'y', 'z']) {
      if (st.rel[a] !== st.cilj[a]) { st.rel[a] = pribl(st.rel[a], st.cilj[a], 90 * dt); ide = true; }
    }
    primijeni();
    if (st.sjaj > 0) {
      st.sjaj -= dt;
      if (st.sjaj <= 0) { for (const k in D.tri) D.tri[k].classList.remove('t2d-sjaj'); for (const a of D.strel) a.g.classList.remove('t2d-sjaj'); }
    }
    return ide || st.sjaj > 0;
  });
  crtaj();
  ui.stanje('Pritisni tipku smjera, npr. +X.');
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

/* =========================================================== 4. stick-slip */
function tStickslip(ui, ctx) {
  const SC = 600;                 // px po metru
  const m = 1, k = 60, N = 9.81, VD = 0.05;
  const st = { radi: true, mod: 'mazano', xd: 0.0, xb: 0.0, v: 0, zap: false, film: 1, razina: 0.8, tPumpa: 0, puls: 0, trosenje: 0, ogrebotine: 0, t: 0, povijest: [], zapinjanja: [] };
  const X0 = 30, L0 = 0.17; // početak na vodilici, duljina prijenosa
  const svg = ui.svg(600, 400, 'Saonice na vodilici vučene preko opruge, spremnik centralnog podmazivanja i graf brzine saonica');
  // vodilica
  S('rect', { x: 20, y: 74, width: 452, height: 28, class: 't2d-metal' }, svg);
  const film = S('rect', { x: 20, y: 69, width: 452, height: 5, fill: B.ulje }, svg);
  const ogrG = S('g', {}, svg);
  T(svg, 24, 122, 'vodilica', 't2d-ls');
  // saonice, opruga, pogon
  const sao = S('g', {}, svg);
  S('rect', { x: 0, y: 22, width: 82, height: 47, rx: 4, class: 't2d-pomicni' }, sao);
  T(sao, 41, 51, 'saonice', 't2d-ls', 'middle');
  const opr = S('polyline', { class: 't2d-opruga' }, svg);
  const pog = S('g', {}, svg);
  S('rect', { x: 0, y: 34, width: 24, height: 24, rx: 3, class: 't2d-tamno' }, pog);
  T(pog, 12, 20, 'pogon', 't2d-ls', 'middle');
  const strPog = strel(pog, 28, 46, 52, 46, { boja: 'var(--teal)', w: 2.5, gl: 9 });
  // spremnik
  S('rect', { x: 500, y: 20, width: 80, height: 130, rx: 4, class: 't2d-spremnik' }, svg);
  const ulje = S('rect', { x: 502, width: 76, fill: B.ulje, opacity: 0.85 }, svg);
  S('line', { x1: 496, y1: 118, x2: 584, y2: 118, stroke: B.crv, 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
  T(svg, 494, 112, 'MIN', 't2d-ls', 'end').style.fill = B.crv;
  T(svg, 540, 170, 'spremnik maziva', 't2d-ls', 'middle');
  S('polyline', { points: '500,140 484,140 484,88 472,88', class: 't2d-cijev' }, svg);
  const kapi = [0, 1, 2].map(() => S('circle', { r: 4, fill: B.ulje }, svg));
  // graf
  const gx0 = 50, gx1 = 585, gy0 = 380, gy1 = 225, VMAX = 0.25, TW = 9;
  S('rect', { x: gx0, y: gy1, width: gx1 - gx0, height: gy0 - gy1, class: 't2d-graf' }, svg);
  for (const v of [0, 0.1, 0.2]) {
    const y = gy0 - v / VMAX * (gy0 - gy1);
    S('line', { x1: gx0, y1: y, x2: gx1, y2: y, class: 't2d-mreza' }, svg);
    T(svg, gx0 - 6, y + 5, hr(v, 1), 't2d-ls', 'end');
  }
  T(svg, gx0, gy1 - 8, 'Brzina saonica v [m/s] u vremenu', 't2d-ls');
  const yd = gy0 - VD / VMAX * (gy0 - gy1);
  S('line', { x1: gx0, y1: yd, x2: gx1, y2: yd, stroke: 'var(--body)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, svg);
  T(svg, gx1 - 4, yd - 6, 'brzina pogona', 't2d-ls', 'end');
  const krivulja = S('polyline', { class: 't2d-krivulja' }, svg);

  function korak(dt) {
    const f = glatko(0.05, 0.35, st.film);
    const mus = lin(0.35, 0.07, f), muk = lin(0.20, 0.07, f), c = lin(0.6, 8, f);
    const h = 0.0005;
    const n = Math.max(1, Math.round(dt / h));
    const hh = dt / n;
    for (let i = 0; i < n; i++) {
      st.xd += VD * hh;
      const Fs = k * (st.xd - st.xb - L0);
      if (st.zap) {
        if (Math.abs(Fs) > mus * N) { st.zap = false; }
        else { st.v = 0; continue; }
      }
      const smj = st.v !== 0 ? Math.sign(st.v) : Math.sign(Fs);
      const a = (Fs - smj * (muk * N + c * Math.abs(st.v))) / m;
      let nv = st.v + a * hh;
      if (st.v !== 0 && Math.sign(nv) !== Math.sign(st.v)) {
        nv = 0;
        if (Math.abs(Fs) <= mus * N) { st.zap = true; if (f < 0.5) { st.zapinjanja.push(st.t); st.trosenje += 0.1; } }
      }
      st.v = nv;
      const dx = st.v * hh;
      st.xb += dx;
      st.film = Math.max(0, st.film - Math.abs(dx) * 3.2);
    }
    // vraćanje prikaza na početak vodilice
    if (X0 + st.xd * SC + 112 > 466) { st.xd -= 0.36; st.xb -= 0.36; }
  }
  function osvjezi() {
    const xb = X0 + st.xb * SC, xd = X0 + st.xd * SC;
    sao.setAttribute('transform', `translate(${xb.toFixed(1)} 0)`);
    pog.setAttribute('transform', `translate(${(xd + 82 + 6).toFixed(1)} 0)`);
    opr.setAttribute('points', opruga(xb + 82, 46, xd + 88, 46, 10, 7));
    film.setAttribute('opacity', (0.15 + 0.85 * glatko(0, 0.35, st.film)).toFixed(2));
    film.setAttribute('height', (1 + 4 * glatko(0, 0.35, st.film)).toFixed(1));
    film.setAttribute('y', (74 - (1 + 4 * glatko(0, 0.35, st.film))).toFixed(1));
    const hU = 126 * st.razina;
    ulje.setAttribute('y', (148 - hU).toFixed(1)); ulje.setAttribute('height', hU.toFixed(1));
    kapi.forEach((c, i) => {
      if (st.puls <= 0) { c.style.display = 'none'; return; }
      c.style.display = '';
      const u = ((1 - st.puls / 0.9) * 1.6 + i * 0.25) % 1;
      const pts = [[500, 140], [484, 140], [484, 88], [472, 88]];
      const dd = [16, 52, 12], L = 80; let s = u * L, j = 0;
      while (j < 2 && s > dd[j]) { s -= dd[j]; j++; }
      const t = ogr(s / dd[j], 0, 1);
      c.setAttribute('cx', lin(pts[j][0], pts[j + 1][0], t).toFixed(1)); c.setAttribute('cy', lin(pts[j][1], pts[j + 1][1], t).toFixed(1));
    });
    const nOgr = Math.min(14, Math.floor(st.trosenje));
    while (st.ogrebotine < nOgr) {
      const x = 40 + ((st.ogrebotine * 97) % 400);
      S('line', { x1: x, y1: 78, x2: x + 14, y2: 96, stroke: B.crv, 'stroke-width': 2 }, ogrG);
      st.ogrebotine++;
    }
    // graf
    const p = [], t1 = st.t, t0 = t1 - TW;
    for (const [t, v] of st.povijest) {
      if (t < t0) continue;
      p.push((gx0 + (t - t0) / TW * (gx1 - gx0)).toFixed(1) + ',' + (gy0 - ogr(v / VMAX, -0.02, 1.02) * (gy0 - gy1)).toFixed(1));
    }
    krivulja.setAttribute('points', p.join(' '));
    st.zapinjanja = st.zapinjanja.filter(t => t > st.t - 3);
    const trza = st.zapinjanja.length > 1;
    o.raz(Math.round(st.razina * 100) + ' %', st.razina < 0.25 ? 't2d-opas' : '');
    o.film(st.film > 0.35 ? 'ima' : st.film > 0.05 ? 'tanak' : 'nema', st.film > 0.35 ? 't2d-ok' : 't2d-opas');
    o.gib(trza ? 'trzajuće (stick-slip)' : 'mirno', trza ? 't2d-opas' : 't2d-ok');
    o.tr(st.trosenje < 1 ? 'bez oštećenja' : st.trosenje < 6 ? 'ogrebotine' : 'oštećena vodilica', st.trosenje < 1 ? 't2d-ok' : 't2d-opas');
    if (st.mod === 'suho') ui.stanje('Bez maziva: saonice zapinju (brzina 0), pa se otrgnu i preskoče. Tako se vodilice troše i oštećuju.', 'opas');
    else if (st.razina <= 0.001 && st.film < 0.35) ui.stanje('Spremnik je prazan — uljni film nestaje i počinje stick-slip. Dopuni spremnik!', 'opas');
    else if (st.razina < 0.25) ui.stanje('Razina maziva ispod oznake MIN — dopuni spremnik.', 'upoz');
    else ui.stanje('Podmazano: uljni film odvaja saonice od vodilice, gibanje je mirno.', 'ok');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    st.t += dt;
    // centralno podmazivanje: impuls svakih 4 s (skraćeno)
    if (st.mod === 'mazano') {
      st.tPumpa += dt;
      if (st.tPumpa > 4) {
        st.tPumpa = 0;
        if (st.razina > 0.001) { st.razina = Math.max(0, st.razina - 0.11); st.puls = 0.9; }
      }
    }
    if (st.puls > 0) { st.puls -= dt; if (st.puls <= 0.3 && st.puls + dt > 0.3) st.film = 1; }
    korak(dt);
    st.povijest.push([st.t, st.v]);
    while (st.povijest.length && st.povijest[0][0] < st.t - TW - 0.5) st.povijest.shift();
    osvjezi();
    return true;
  });
  ui.seg('Vodilica', [['mazano', 'Podmazano'], ['suho', 'Bez maziva']], st.mod, v => {
    st.mod = v;
    if (v === 'suho') st.film = 0;
    else { st.tPumpa = 4; }
    ctx.budi();
  });
  const r = ui.red();
  ui.gumb('Zaustavi', (e, b) => { st.radi = !st.radi; b.textContent = st.radi ? 'Zaustavi' : 'Pokreni'; b.setAttribute('aria-pressed', String(st.radi)); ctx.budi(); }, { u: r, pritisak: true });
  ui.gumb('Dopuni spremnik', () => { st.razina = 1; if (st.mod === 'mazano') st.tPumpa = 4; ui.stanje('Spremnik dopunjen.', 'ok'); ctx.budi(); }, { u: r, tanki: true });
  ui.gumb('Nova vodilica', () => { st.trosenje = 0; st.ogrebotine = 0; ogrG.replaceChildren(); ctx.budi(); }, { u: r, tanki: true });
  const o = ui.ocit([['raz', 'Razina u spremniku'], ['film', 'Uljni film'], ['gib', 'Gibanje saonica'], ['tr', 'Stanje vodilice']]);
  st.xb = 0; st.xd = L0; // početno bez napetosti
  osvjezi();
  ctx.budi();
}

/* =========================================================== 5./6. G54 — M i W */
function tG54(ui, ctx, wks) {
  const ISPR = { x: 12.563, y: 43.734, z: 134.883 };
  const L_ISPR = 120, R_AL = 5, VG0 = 170, VG1 = 40;
  const WP = { x1: 12.563, x2: 142.563, y1: 43.734, y2: 123.734, z1: 94.883, z2: 134.883 };
  const PREPREKE = [
    { ime: 'prednju čeljust škripca', x1: 7, x2: 148, y1: 23.734, y2: 43.734, z1: 0, z2: 124.883 },
    { ime: 'stražnju čeljust škripca', x1: 7, x2: 148, y1: 123.734, y2: 143.734, z1: 0, z2: 124.883 },
    { ime: 'podlogu u škripcu', x1: 7, x2: 148, y1: 43.734, y2: 123.734, z1: 0, z2: 94.883 }
  ];
  const START = { x: 200, y: 175, z: 250 };
  const PROG = [
    { t: 'N10 G17 G90 G94', o: 'ravnina XY, apsolutne mjere, posmak u mm/min' },
    { t: 'N20 G54', o: 'pomak nultočke iz memorije (tablice)' },
    { t: 'N30 T3 D1 S2500 M3', o: 'glodalo Ø10, korekcija D1, vreteno uključeno' },
    { t: 'N40 G0 X20 Y20', o: 'brzi hod iznad početka utora', g: 0, x: 20, y: 20 },
    { t: 'N50 G0 Z1', o: 'brzi hod na 1 mm iznad obratka', g: 0, z: 1 },
    { t: 'N60 G1 Z-5 F150', o: 'posmakom 5 mm u dubinu', g: 1, z: -5 },
    { t: 'N70 G1 X100 Y70', o: 'glodanje utora', g: 1, x: 100, y: 70 },
    { t: 'N80 G0 Z50', o: 'brzi hod iznad obratka', g: 0, z: 50 },
    { t: 'N90 M30', o: 'kraj programa' }
  ];
  const st = { off: { ...ISPR }, L: L_ISPR, p: { ...START }, radi: false, blok: -1, cilj: null, g: 0, sudar: null, rez: false, trag: [], kraj: false, wcs: { x: null, y: null, z: null } };
  const svg = ui.svg(610, 336, 'Tlocrt i bokocrt stola sa škripcem, obratkom, nultočkom stroja M i nultočkom obratka W te putanjom alata');
  // preslikavanja
  const tx = X => 20 + (X + 30), ty = Y => 262 - (Y + 10);
  const sx = X => 322 + (X + 30), sz = Z => 300 - (Z + 10);
  // --- tlocrt
  const gT = S('g', {}, svg);
  T(gT, 20, 22, 'Tlocrt (X–Y)', 't2d-l');
  S('rect', { x: tx(-30), y: ty(200), width: 280, height: 210, class: 't2d-stol' }, gT);
  for (const y of [10, 70, 130, 190]) S('line', { x1: tx(-30), y1: ty(y), x2: tx(250), y2: ty(y), class: 't2d-utorT' }, gT);
  for (const b of PREPREKE.slice(0, 2)) S('rect', { x: tx(b.x1), y: ty(b.y2), width: b.x2 - b.x1, height: b.y2 - b.y1, class: 't2d-celjust' }, gT);
  S('rect', { x: tx(WP.x1), y: ty(WP.y2), width: 130, height: 80, class: 't2d-obradak' }, gT);
  const utor = S('polyline', { class: 't2d-utor-rez', 'stroke-width': 2 * R_AL }, gT);
  const tragT = S('polyline', { class: 't2d-trag' }, gT);
  // --- bokocrt
  const gS = S('g', {}, svg);
  T(gS, 322, 22, 'Bokocrt (X–Z)', 't2d-l');
  const clipS = S('clipPath', { id: ui.uid + '-bc' }, svg.defs);
  S('rect', { x: 322, y: 30, width: 282, height: 280 }, clipS);
  const gSc = S('g', { 'clip-path': `url(#${ui.uid}-bc)` }, gS);
  S('rect', { x: sx(-30), y: sz(0), width: 280, height: 18, class: 't2d-stol' }, gSc);
  S('rect', { x: sx(7), y: sz(124.883), width: 141, height: 124.883, class: 't2d-celjust' }, gSc);
  S('rect', { x: sx(WP.x1), y: sz(WP.z2), width: 130, height: 40, class: 't2d-obradak' }, gSc);
  const utorS = S('rect', { class: 't2d-utor-bok' }, gSc);
  const tragS = S('polyline', { class: 't2d-trag' }, gSc);
  // nultočke
  function nultocka(g, x, y, slovo, kl, gore) {
    const gg = S('g', { class: kl }, g);
    S('circle', { cx: x, cy: y, r: 8, class: 't2d-nt-k' }, gg);
    S('path', { d: `M${x},${y} L${x + 8},${y} A8,8 0 0 1 ${x},${y + 8} Z M${x},${y} L${x - 8},${y} A8,8 0 0 1 ${x},${y - 8} Z`, class: 't2d-nt-p' }, gg);
    T(gg, x - 11, gore ? y - 8 : y + 22, slovo, 't2d-lb', 'end');
    return gg;
  }
  nultocka(gT, tx(0), ty(0), 'M', 't2d-nt-M');
  nultocka(gS, sx(0), sz(0), 'M', 't2d-nt-M', true);
  nultocka(gT, tx(WP.x1), ty(WP.y1), 'W', 't2d-nt-W');
  nultocka(gS, sx(WP.x1), sz(WP.z2), 'W', 't2d-nt-W', true);
  // G54 vektor i oznaka
  const vT = strel(gT, 0, 0, 1, 1, { boja: 'var(--teal)', w: 2, gl: 9 });
  const vS = strel(gS, 0, 0, 1, 1, { boja: 'var(--teal)', w: 2, gl: 9 });
  const gG54T = S('g', {}, gT), gG54S = S('g', {}, gS);
  for (const g of [gG54T, gG54S]) { S('circle', { r: 6, fill: 'none', stroke: B.crv, 'stroke-width': 2.5 }, g); S('path', { d: 'M-9,-9 L9,9 M-9,9 L9,-9', stroke: B.crv, 'stroke-width': 2 }, g); T(g, 10, -8, 'G54', 't2d-ls').style.fill = B.crv; }
  // alat
  const alT = S('g', {}, gT);
  S('circle', { r: 20, class: 't2d-drzac-t' }, alT); S('circle', { r: R_AL, class: 't2d-alat-t' }, alT);
  const alS = S('g', {}, gSc);
  S('rect', { x: -20, y: -130, width: 40, height: 80, class: 't2d-drzac' }, alS);
  S('rect', { x: -R_AL, y: -40, width: 2 * R_AL, height: 40, class: 't2d-alat-s' }, alS);
  const sudT = S('g', { style: 'display:none' }, gT), sudS = S('g', { style: 'display:none' }, gS);
  for (const g of [sudT, sudS]) { S('polygon', { points: '0,-22 6,-7 22,-9 10,3 16,19 0,9 -16,19 -10,3 -22,-9 -6,-7', fill: B.crv, opacity: 0.9 }, g); }
  const natSud = T(gT, 300, 22, '', 't2d-lb', 'end'); natSud.style.fill = B.crv;
  ui.uski(u => { svg.setAttribute('viewBox', u ? '0 0 312 626' : '0 0 610 336'); gS.setAttribute('transform', u ? 'translate(-302 306)' : ''); });

  // --- upravljanje: program i memorija
  const prog = H('ol', { class: 't2d-prog', 'aria-label': 'NC program' });
  const redovi = PROG.map(b => { const li = H('li', {}, H('code', { tekst: b.t }), H('span', { tekst: b.o })); prog.append(li); return li; });
  const mem = H('div', { class: 't2d-mem' });
  mem.append(H('h4', { tekst: 'Memorija upravljanja' }));
  const tab = H('table', { class: 't2d-tab' });
  tab.append(H('tr', {}, H('th', { tekst: 'Pomak' }), H('th', { tekst: 'X' }), H('th', { tekst: 'Y' }), H('th', { tekst: 'Z' })));
  const ulazi = {};
  const rG = H('tr', {}, H('th', { tekst: 'G54' }));
  for (const a of ['x', 'y', 'z']) {
    const i = H('input', { type: 'number', step: '0.001', inputmode: 'decimal', value: nc(st.off[a]), 'aria-label': 'G54 ' + a.toUpperCase() });
    ctx.on(i, 'change', () => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) st.off[a] = ogr(v, -999, 999); i.value = nc(st.off[a]); osvjezi(); });
    ulazi[a] = i; rG.append(H('td', {}, i));
  }
  tab.append(rG);
  const rL = H('tr', {}, H('th', { tekst: 'T3 D1 L1' }));
  const iL = H('input', { type: 'number', step: '0.001', inputmode: 'decimal', value: nc(st.L), 'aria-label': 'Duljina alata T3 D1' });
  if (!wks) iL.disabled = true;
  ctx.on(iL, 'change', () => { const v = parseFloat(String(iL.value).replace(',', '.')); if (isFinite(v)) st.L = ogr(v, 50, 200); iL.value = nc(st.L); osvjezi(); });
  rL.append(H('td', { colspan: '3' }, iL, H('span', { class: 't2d-sitno', tekst: wks ? ' stvarna duljina alata 120.000 (primjer)' : ' (ispravno)' })));
  tab.append(rL);
  mem.append(tab);
  const pres = H('div', { class: 't2d-red' });
  mem.append(pres);
  ui.upr.append(prog, mem);
  const postavi = (o, L, txt) => { if (st.radi) return; Object.assign(st.off, o); st.L = L; for (const a in ulazi) ulazi[a].value = nc(st.off[a]); iL.value = nc(st.L); ponisti(); ui.stanje(txt); };
  ui.gumb('Ispravno', () => postavi(ISPR, L_ISPR, 'G54 = X 12.563 Y 43.734 Z 134.883 — to je pomak od M do W.'), { tanki: true, u: pres });
  ui.gumb('Z krivo', () => postavi({ ...ISPR, z: 124.883 }, L_ISPR, 'G54 Z upisan kao 124.883 umjesto 134.883 (zamijenjena znamenka).'), { tanki: true, u: pres });
  ui.gumb('Sve 0.000', () => postavi({ x: 0, y: 0, z: 0 }, L_ISPR, 'Tablica G54 prazna (0.000) — kao da pomak nije izmjeren ili G54 nije pozvan.'), { tanki: true, u: pres });
  ui.gumb('X krivo', () => postavi({ ...ISPR, x: 112.563 }, L_ISPR, 'G54 X upisan kao 112.563 umjesto 12.563.'), { tanki: true, u: pres });
  if (wks) ui.gumb('Duljina alata kriva', () => postavi(ISPR, 110, 'Duljina alata upisana kao 110.000, a stvarna je 120.000.'), { tanki: true, u: pres });
  const r = ui.red();
  const bS = ui.gumb('CYCLE START', () => pokreni(), { u: r, aria: 'CYCLE START — pokreni program' });
  ui.gumb('RESET', () => { ponisti(); ui.stanje('RESET: alat na početnom položaju.'); }, { u: r, tanki: true });
  const o = ui.ocit([['mks', 'Vrh alata u MKS (od M)'], ['wks', 'Vrh alata u WKS (od W, kako ga vidi upravljanje)'], ['bl', 'Blok']]);

  function ponisti() {
    st.radi = false; st.blok = -1; st.cilj = null; st.sudar = null; st.rez = false; st.kraj = false; st.trag = [[START.x, START.y, START.z, 0]];
    st.p = { ...START }; st.wcs = { x: null, y: null, z: null }; st.utor = [];
    sudT.style.display = 'none'; sudS.style.display = 'none'; natSud.textContent = '';
    bS.disabled = false;
    osvjezi();
  }
  function pokreni() {
    if (st.radi) return;
    if (st.kraj || st.sudar) ponisti();
    st.radi = true; st.blok = -1; bS.disabled = true;
    sljedeci();
    ctx.budi();
  }
  function sljedeci() {
    st.blok++;
    if (st.blok >= PROG.length) { zavrsi(); return; }
    const b = PROG[st.blok];
    st.cilj = null;
    if (b.g != null) {
      for (const a of ['x', 'y', 'z']) if (b[a] != null) st.wcs[a] = b[a];
      const dL = st.L - L_ISPR;
      const c = {
        x: b.x != null ? st.off.x + b.x : st.p.x,
        y: b.y != null ? st.off.y + b.y : st.p.y,
        z: b.z != null ? st.off.z + b.z + dL : st.p.z
      };
      if (c.x < -30 || c.x > 250 || c.y < -10 || c.y > 200 || c.z > 300) {
        st.sudar = { tip: 'alarm', txt: `Alarm u bloku ${b.t.split(' ')[0]}: cilj je izvan područja hoda (softverski granični prekidač). Program je zaustavljen.` };
        st.radi = false; bS.disabled = false; ui.stanje(st.sudar.txt, 'upoz'); osvjezi(); return;
      }
      st.cilj = c; st.g = b.g;
    } else {
      st.pauza = 0.45;
    }
    osvjezi();
  }
  function kolizija(p, g1, gore) {
    const uKrug = (b, r) => { const dx = Math.max(b.x1 - p.x, 0, p.x - b.x2), dy = Math.max(b.y1 - p.y, 0, p.y - b.y2); return dx * dx + dy * dy < r * r; };
    if (p.z < 0) return 'stol';
    for (const b of PREPREKE) {
      if (uKrug(b, R_AL) && p.z < b.z2 && p.z + 40 > b.z1) return b.ime;
      if (uKrug(b, 20) && p.z + 40 < b.z2) return b.ime;
    }
    if (uKrug(WP, R_AL) && p.z < WP.z2 && p.z + 40 > WP.z1) {
      if (!g1 && !(gore && st.rez)) return 'obradak';
      st.rez = true;
    }
    if (uKrug(WP, 20) && p.z + 40 < WP.z2) return 'obradak (držačem alata)';
    return null;
  }
  function zavrsi() {
    st.radi = false; st.kraj = true; bS.disabled = false;
    const kriv = Math.abs(st.off.x - ISPR.x) > 0.0005 || Math.abs(st.off.y - ISPR.y) > 0.0005 || Math.abs(st.off.z - ISPR.z) > 0.0005 || Math.abs(st.L - L_ISPR) > 0.0005;
    if (!kriv) ui.stanje('Program je završen: utor 5 mm dubok, od X20 Y20 do X100 Y70 od nultočke W. Obrada je ispravna.', 'ok');
    else if (!st.rez) ui.stanje('Program je završen bez sudara, ali alat je rezao zrak — utora nema na obratku.', 'upoz');
    else ui.stanje('Program je završen bez sudara, ali utor je na krivome mjestu ili krive dubine — obradak je škart.', 'upoz');
    osvjezi();
  }
  function osvjezi() {
    const p = st.p;
    alT.setAttribute('transform', `translate(${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)})`);
    alS.setAttribute('transform', `translate(${sx(p.x).toFixed(1)} ${sz(p.z).toFixed(1)})`);
    vT.set(tx(0), ty(0), tx(st.off.x), ty(st.off.y));
    vS.set(sx(0), sz(0), sx(st.off.x), sz(st.off.z));
    const ok = Math.abs(st.off.x - ISPR.x) < 0.5 && Math.abs(st.off.y - ISPR.y) < 0.5 && Math.abs(st.off.z - ISPR.z) < 0.5;
    gG54T.setAttribute('transform', `translate(${tx(st.off.x).toFixed(1)} ${ty(st.off.y).toFixed(1)})`);
    gG54S.setAttribute('transform', `translate(${sx(st.off.x).toFixed(1)} ${sz(st.off.z).toFixed(1)})`);
    gG54T.style.display = ok ? 'none' : ''; gG54S.style.display = ok ? 'none' : '';
    tragT.setAttribute('points', st.trag.map(q => tx(q[0]).toFixed(1) + ',' + ty(q[1]).toFixed(1)).join(' '));
    tragS.setAttribute('points', st.trag.map(q => sx(q[0]).toFixed(1) + ',' + sz(q[2]).toFixed(1)).join(' '));
    const u = st.utor || [];
    utor.setAttribute('points', u.map(q => tx(q[0]).toFixed(1) + ',' + ty(q[1]).toFixed(1)).join(' '));
    if (u.length) {
      const xs = u.map(q => q[0]), zm = Math.min(...u.map(q => q[2]));
      const x1 = Math.max(WP.x1, Math.min(...xs) - R_AL), x2 = Math.min(WP.x2, Math.max(...xs) + R_AL);
      utorS.setAttribute('x', sx(x1)); utorS.setAttribute('width', Math.max(0, x2 - x1));
      utorS.setAttribute('y', sz(WP.z2)); utorS.setAttribute('height', Math.max(0, WP.z2 - zm));
    } else utorS.setAttribute('width', 0);
    redovi.forEach((li, i) => li.classList.toggle('t2d-akt', i === st.blok));
    const w = a => st.wcs[a] == null ? '—' : nc(p[a] - st.off[a] - (a === 'z' ? st.L - L_ISPR : 0));
    o.mks(`X ${nc(p.x)}  Y ${nc(p.y)}  Z ${nc(p.z)}`);
    o.wks(st.blok < 1 ? '— (G54 još nije pozvan)' : `X ${w('x')}  Y ${w('y')}  Z ${w('z')}`);
    o.bl(st.blok >= 0 && st.blok < PROG.length ? PROG[st.blok].t : (st.kraj ? 'kraj programa' : '—'));
  }
  ctx.petlja(dt => {
    if (!st.radi) return false;
    if (!st.cilj) {
      st.pauza -= dt;
      if (st.pauza <= 0) sljedeci();
      return st.radi;
    }
    const v = st.g === 0 ? VG0 : VG1;
    let ostatak = v * dt;
    while (ostatak > 0 && st.cilj) {
      const dx = st.cilj.x - st.p.x, dy = st.cilj.y - st.p.y, dz = st.cilj.z - st.p.z, L = Math.hypot(dx, dy, dz);
      const k = Math.min(1, ostatak, L);
      if (L < 1e-6) { st.p = { ...st.cilj }; st.cilj = null; break; }
      st.p = { x: st.p.x + dx / L * k, y: st.p.y + dy / L * k, z: st.p.z + dz / L * k };
      ostatak -= k;
      const s = kolizija(st.p, st.g === 1, Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9 && dz > 0);
      if (st.g === 1 && st.rez) {
        const insideXY = st.p.x > WP.x1 - R_AL && st.p.x < WP.x2 + R_AL && st.p.y > WP.y1 - R_AL && st.p.y < WP.y2 + R_AL && st.p.z < WP.z2;
        if (insideXY) (st.utor = st.utor || []).push([st.p.x, st.p.y, st.p.z]);
      }
      if (s) {
        st.sudar = { tip: 'sudar', s };
        st.radi = false; st.cilj = null; bS.disabled = false;
        st.trag.push([st.p.x, st.p.y, st.p.z, st.g]);
        sudT.setAttribute('transform', `translate(${tx(st.p.x)} ${ty(st.p.y)})`); sudT.style.display = '';
        sudS.setAttribute('transform', `translate(${sx(st.p.x)} ${sz(st.p.z)})`); sudS.style.display = '';
        natSud.textContent = 'SUDAR!';
        const b = PROG[st.blok].t;
        ui.stanje(`SUDAR u bloku ${b}: alat je ${st.g === 0 ? 'brzim hodom ' : ''}udario u ${s}. Program je bio ispravan — kriv je ${Math.abs(st.L - L_ISPR) > 0.0005 && wks ? 'podatak o duljini alata' : 'pomak nultočke G54'}.`, 'opas');
        osvjezi();
        return false;
      }
      if (L <= k + 1e-9) { st.p = { ...st.cilj }; st.cilj = null; }
    }
    const zadnji = st.trag[st.trag.length - 1];
    if (!zadnji || Math.hypot(zadnji[0] - st.p.x, zadnji[1] - st.p.y, zadnji[2] - st.p.z) > 2 || !st.cilj) st.trag.push([st.p.x, st.p.y, st.p.z, st.g]);
    if (!st.cilj) { st.pauza = 0.3; }
    osvjezi();
    return true;
  });
  ponisti();
  ui.stanje(wks ? 'W je u lijevom prednjem gornjem kutu obratka. Odaberi vrijednosti i pritisni CYCLE START.' : 'M je nultočka stroja. Vektor od M do W je pomak G54. Odaberi vrijednosti i pritisni CYCLE START.');
}

/* =========================================================== 7. stezanje SK40 */
function tStezanje(ui, ctx) {
  const st = { zrak: false, d: 0, alat: 1, alatCilj: 1 };   // d: hod klipa 0…26, alat: 1 umetnut, 0 izvađen
  const svg = ui.svg(560, 480, 'Presjek pinole: stezni cilindar s klipom, paket tanjurastih opruga, vlačna motka, čeljusti, zatezni svornjak i alat s konusom SK40');
  const CX = 200;
  // dovod zraka
  const dovod = S('line', { x1: CX, y1: 0, x2: CX, y2: 30, 'stroke-width': 8, class: 't2d-cijev-z' }, svg);
  // cilindar
  S('rect', { x: CX - 82, y: 22, width: 164, height: 72, rx: 4, class: 't2d-kuciste' }, svg);
  S('rect', { x: CX - 70, y: 30, width: 140, height: 56, class: 't2d-komora' }, svg);
  const zrakK = S('rect', { x: CX - 70, y: 30, width: 140, height: 4, fill: B.pl, opacity: 0.55 }, svg);
  const klip = S('g', {}, svg);
  S('rect', { x: CX - 68, y: 34, width: 136, height: 14, rx: 2, class: 't2d-pomicni' }, klip);
  S('rect', { x: CX - 8, y: 48, width: 16, height: 44, class: 't2d-pomicni' }, klip);
  // vreteno (pinola) u presjeku
  const zid = s => {
    const k = (x, y) => (CX + s * x) + ',' + y;
    return [k(72, 96), k(40, 96), k(40, 270), k(12, 270), k(12, 282), k(20, 282), k(20, 338), k(30, 338), k(30, 352), k(46, 420), k(72, 420)].join(' ');
  };
  S('polygon', { points: zid(-1), class: 't2d-presjek', fill: svg.srafura }, svg);
  S('polygon', { points: zid(1), class: 't2d-presjek', fill: svg.srafura }, svg);
  // opruge
  const opG = S('g', {}, svg);
  const oprL = S('polyline', { class: 't2d-tanjur' }, opG), oprD = S('polyline', { class: 't2d-tanjur' }, opG);
  // vlačna motka s ovratnikom i čeljustima
  const motka = S('g', {}, svg);
  S('rect', { x: CX - 7, y: 104, width: 14, height: 198, class: 't2d-motka' }, motka);
  S('rect', { x: CX - 37, y: 108, width: 74, height: 12, rx: 2, class: 't2d-motka' }, motka);
  const celL = S('polygon', { class: 't2d-celjust-p' }, svg), celD = S('polygon', { class: 't2d-celjust-p' }, svg);
  // alat
  const alat = S('g', {}, svg);
  S('rect', { x: CX - 9, y: 316, width: 18, height: 14, rx: 6, class: 't2d-svornjak' }, alat);
  S('rect', { x: CX - 5, y: 330, width: 10, height: 24, class: 't2d-svornjak' }, alat);
  S('polygon', { points: `${CX - 29},353 ${CX + 29},353 ${CX + 45},420 ${CX - 45},420`, class: 't2d-drzac-k' }, alat);
  S('path', { d: `M${CX - 56},420 L${CX + 56},420 L${CX + 56},428 L${CX + 49},432 L${CX + 56},436 L${CX + 56},444 L${CX - 56},444 L${CX - 56},436 L${CX - 49},432 L${CX - 56},428 Z`, class: 't2d-drzac-k' }, alat);
  S('rect', { x: CX - 16, y: 444, width: 32, height: 30, class: 't2d-alat-s' }, alat);
  for (let i = 0; i < 3; i++) S('line', { x1: CX - 16, y1: 450 + i * 9, x2: CX + 16, y2: 444 + i * 9 + 12, stroke: 'var(--paper)', 'stroke-width': 2 }, alat);
  // sile
  const fOpr = strel(svg, CX + 56, 250, CX + 56, 150, { boja: B.zel, w: 4, gl: 13 });
  const fKlip = strel(svg, CX + 100, 36, CX + 100, 80, { boja: B.pl, w: 4, gl: 13 });
  const tOpr = T(svg, CX + 64, 205, 'sila opruga', 't2d-ls'); tOpr.style.fill = B.zel;
  // oznake
  const oz = (y, t, x2, y2) => { S('line', { x1: 302, y1: y - 5, x2, y2, class: 't2d-vodilja' }, svg); T(svg, 306, y, t, 't2d-l'); };
  oz(14, 'Dovod zraka', CX + 6, 10);
  oz(58, 'Klip', CX + 68, 42);
  oz(182, 'Paket tanjurastih opruga', CX + 36, 190);
  oz(246, 'Vlačna motka', CX + 7, 246);
  oz(300, 'Čeljusti', CX + 22, 322);
  oz(338, 'Zatezni svornjak', CX + 9, 324);
  oz(390, 'Konus SK40 (7:24)', CX + 40, 392);
  oz(462, 'Alat', CX + 16, 458);
  T(svg, 16, 200, 'Pinola', 't2d-l');
  T(svg, 16, 220, '(vreteno)', 't2d-ls');
  const natS = T(svg, 16, 470, '', 't2d-lb');

  function osvjezi() {
    const d = st.d, dd = Math.max(0, d - 12);
    klip.setAttribute('transform', `translate(0 ${d.toFixed(1)})`);
    zrakK.setAttribute('height', (4 + d).toFixed(1));
    zrakK.setAttribute('opacity', st.zrak || d > 0.5 ? 0.55 : 0);
    dovod.style.stroke = st.zrak ? B.pl : 'var(--rule)';
    motka.setAttribute('transform', `translate(0 ${dd.toFixed(1)})`);
    // opruge između ovratnika (120+dd) i ramena (270)
    const y0 = 120 + dd, y1 = 270, n = 12, hS = (y1 - y0) / n;
    const pl = [], pd = [];
    for (let i = 0; i <= n; i++) { const x = i % 2 ? 12 : 37; pl.push((CX - x) + ',' + (y0 + i * hS).toFixed(1)); pd.push((CX + x) + ',' + (y0 + i * hS).toFixed(1)); }
    oprL.setAttribute('points', pl.join(' ')); oprD.setAttribute('points', pd.join(' '));
    // čeljusti: zatvorene u uskom provrtu, otvorene u širem
    const otv = glatko(4, 13, dd);
    const fx = lin(20, 29, otv), uk = lin(6, 15, otv), y = 300 + dd;
    const cel = s => {
      const k = (x, yy) => (CX + s * x).toFixed(1) + ',' + yy.toFixed(1);
      return [k(7, y - 4), k(fx - 9, y - 4), k(fx, y + 18), k(fx, y + 36), k(uk, y + 36), k(uk, y + 30), k(fx - 9, y + 26), k(7, y + 10)].join(' ');
    };
    celL.setAttribute('points', cel(-1)); celD.setAttribute('points', cel(1));
    alat.setAttribute('transform', `translate(0 ${((1 - st.alat) * 70).toFixed(1)})`);
    alat.setAttribute('opacity', (0.25 + 0.75 * st.alat).toFixed(2));
    const stegnut = dd < 4 && st.alat > 0.99;
    fOpr.style.display = dd < 13 ? '' : 'none';
    fKlip.style.display = st.zrak && d > 2 ? '' : 'none';
    tOpr.style.display = fOpr.style.display;
    natS.textContent = st.alat < 0.01 ? 'Alat izvađen' : stegnut ? 'Alat STEGNUT' : (dd > 10 ? 'Alat OTPUŠTEN' : 'prijelaz…');
    natS.style.fill = stegnut ? B.zel : (dd > 10 || st.alat < 0.99 ? B.nar : '');
    o.zrak(st.zrak ? 'ima (oko 6 bar, primjer)' : 'nema', st.zrak ? 't2d-plavo' : '');
    o.sila(stegnut ? 'oko 10 kN (primjer)' : (st.alat < 0.99 ? '—' : dd > 10 ? '0 kN — alat slobodan' : 'pada…'), stegnut ? 't2d-ok' : 't2d-upoz');
    bI.disabled = !(dd > 13 && st.zrak);
    bI.textContent = st.alatCilj > 0.5 ? 'Izvadi alat' : 'Umetni alat';
  }
  ctx.petlja(dt => {
    const cilj = st.zrak ? 26 : 0;
    const v = st.zrak ? 60 : 90;
    let ide = false;
    if (st.d !== cilj) { st.d = pribl(st.d, cilj, v * dt); ide = true; }
    // alat se ne može izvaditi dok je stegnut
    if (st.alat !== st.alatCilj) { st.alat = pribl(st.alat, st.alatCilj, 1.4 * dt); ide = true; }
    osvjezi();
    return ide;
  });
  const r = ui.red();
  const bZ = ui.gumb('Zrak u klip', (e, b) => {
    st.zrak = !st.zrak;
    b.setAttribute('aria-pressed', String(st.zrak));
    b.textContent = st.zrak ? 'Ispusti zrak' : 'Zrak u klip';
    if (!st.zrak && st.alatCilj < 0.5) { ui.stanje('Nema alata u vretenu — opruge zatvaraju čeljusti naprazno. Umetni alat prije ispuštanja zraka.', 'upoz'); }
    else ui.stanje(st.zrak ? 'Zrak ulazi u prostor klipa: sila klipa nadvlada opruge, vlačna motka ide dolje, čeljusti se otvaraju.' : 'Zrak je ispušten: opruge povlače vlačnu motku gore, čeljusti hvataju svornjak — alat je stegnut.', st.zrak ? null : 'ok');
    ctx.budi();
  }, { u: r, pritisak: false });
  ui.gumb('Nestanak zraka', () => {
    if (!st.zrak) { ui.stanje('Zraka ionako nema — alat je stegnut silom opruga.', 'ok'); return; }
    st.zrak = false; bZ.setAttribute('aria-pressed', 'false'); bZ.textContent = 'Zrak u klip';
    ui.stanje('Nestanak zraka: klip gubi silu, opruge same stežu. Alat ne može ispasti — zato je stezanje izvedeno oprugama.', 'ok');
    ctx.budi();
  }, { u: r, tanki: true });
  const bI = ui.gumb('Izvadi alat', () => {
    st.alatCilj = st.alatCilj > 0.5 ? 0 : 1;
    ui.stanje(st.alatCilj ? 'Alat umetnut — ispusti zrak da se stegne.' : 'Alat izvađen iz vretena.');
    ctx.budi();
  }, { u: r, tanki: true });
  const o = ui.ocit([['zrak', 'Zrak u prostoru klipa'], ['sila', 'Stezna sila na svornjaku']]);
  osvjezi();
  ui.stanje('Bez zraka alat je stegnut silom paketa opruga.', 'ok');
}

/* =========================================================== 8. pneumatika */
function tPneumatika(ui, ctx) {
  const st = { tipka: false, ventil: 0, x: 0, tPovrat: 2.5, tok: 0, zadrzi: false };
  const svg = ui.svg(620, 330, 'Pneumatska shema: izvor zraka, 3/2 razvodnik s elektromagnetom i oprugom, jednosmjerni prigušni ventil, jednoradni cilindar s oprugom, ispuh');
  const L = (pts, kl) => S('polyline', { points: pts, class: kl || 't2d-vod' }, svg);
  // vodovi
  const vP = L('76,280 260,280 260,252', 't2d-vod');
  const vA = L('270,198 270,92 330,92', 't2d-vod');
  const vA2 = L('390,92 420,92', 't2d-vod');
  const vR = L('290,252 290,274', 't2d-vod');
  const vCv = L('330,92 330,58 350,58', 't2d-vod');   // grana nepovratnog ventila
  const vCv2 = L('378,58 390,58 390,92', 't2d-vod');
  const vPr = L('330,92 350,92', 't2d-vod'), vPr2 = L('372,92 390,92', 't2d-vod');
  const tokP = L('76,280 260,280 260,252', 't2d-tok'), tokA = L('270,252 270,92 330,92 330,58 390,58 390,92 420,92', 't2d-tok');
  const tokR = L('420,92 390,92 330,92 270,92 270,252 290,252 290,276', 't2d-tok');
  // izvor
  S('circle', { cx: 60, cy: 280, r: 16, class: 't2d-simbol' }, svg);
  S('polygon', { points: '60,268 70,286 50,286', fill: 'var(--ink)' }, svg);
  T(svg, 60, 316, 'izvor zraka', 't2d-ls', 'middle');
  T(svg, 60, 254, '6 bar', 't2d-ls', 'middle');
  // ispuh
  S('polygon', { points: '282,276 298,276 290,290', class: 't2d-simbol' }, svg);
  T(svg, 304, 292, 'ispuh (3)', 't2d-ls');
  // razvodnik
  const razv = S('g', {}, svg);
  S('rect', { x: 200, y: 200, width: 50, height: 50, class: 't2d-simbol' }, razv);
  S('rect', { x: 250, y: 200, width: 50, height: 50, class: 't2d-simbol' }, razv);
  // lijevi kvadrat (aktivni): 1 → 2, 3 zatvoren
  strel(razv, 210, 246, 220, 204, { boja: 'var(--ink)', w: 2, gl: 8 });
  S('path', { d: 'M234,246 L234,236 M228,236 L240,236', class: 't2d-simbol-c' }, razv);
  // desni kvadrat (miran): 2 → 3, 1 zatvoren
  strel(razv, 270, 204, 290, 246, { boja: 'var(--ink)', w: 2, gl: 8 });
  S('path', { d: 'M260,246 L260,236 M254,236 L266,236', class: 't2d-simbol-c' }, razv);
  // elektromagnet i opruga
  const mag = S('rect', { x: 176, y: 212, width: 24, height: 26, class: 't2d-simbol' }, razv);
  S('line', { x1: 176, y1: 238, x2: 200, y2: 212, class: 't2d-simbol-c' }, razv);
  T(razv, 188, 206, 'Y1', 't2d-ls', 'middle');
  S('polyline', { points: opruga(300, 225, 330, 225, 6, 8), class: 't2d-simbol-c' }, razv);
  T(svg, 276, 194, '2', 't2d-ls'); T(svg, 248, 268, '1', 't2d-ls');
  T(svg, 225, 312, '3/2 razvodnik', 't2d-l', 'middle');
  // jednosmjerni prigušni ventil
  S('rect', { x: 318, y: 40, width: 84, height: 66, class: 't2d-okvir-crtkan' }, svg);
  S('path', { d: 'M352,84 Q361,92 352,100 M370,84 Q361,92 370,100', class: 't2d-simbol-c' }, svg);
  strel(svg, 348, 104, 376, 78, { boja: 'var(--ink)', w: 1.5, gl: 7 });
  S('path', { d: 'M362,49 L352,58 L362,67', class: 't2d-simbol-c' }, svg);
  const kugla = S('circle', { cx: 362, cy: 58, r: 6, class: 't2d-simbol' }, svg);
  T(svg, 360, 30, 'jednosmjerni prigušni ventil', 't2d-ls', 'middle');
  // cilindar
  S('rect', { x: 420, y: 70, width: 110, height: 44, class: 't2d-simbol' }, svg);
  const komora = S('rect', { x: 421, y: 71, height: 42, fill: B.pl, opacity: 0.4 }, svg);
  const klip = S('g', {}, svg);
  S('rect', { x: 0, y: 72, width: 8, height: 40, fill: 'var(--ink)' }, klip);
  S('rect', { x: 8, y: 88, width: 120, height: 8, class: 't2d-pomicni' }, klip);
  const oprC = S('polyline', { class: 't2d-simbol-c' }, svg);
  T(svg, 475, 140, 'cilindar s oprugom', 't2d-ls', 'middle');
  T(svg, 475, 158, '→ potiskuje vlačnu motku', 't2d-ls', 'middle');
  const tlak = T(svg, 420, 62, '', 't2d-ls');
  // tipka na shemi
  const tip = S('g', {}, svg);
  S('rect', { x: 120, y: 150, width: 56, height: 30, rx: 6, class: 't2d-simbol' }, tip);
  const tipL = S('circle', { cx: 148, cy: 165, r: 9 }, tip);
  S('polyline', { points: '176,165 188,165 188,212', class: 't2d-zica' }, svg);
  T(svg, 148, 140, 'tipka', 't2d-ls', 'middle');

  function osvjezi() {
    const v = st.ventil;  // 0 miran … 1 aktivan
    razv.setAttribute('transform', `translate(${(v * 50).toFixed(1)} 0)`);
    const px = 421 + st.x * 60;
    klip.setAttribute('transform', `translate(${px.toFixed(1)} 0)`);
    komora.setAttribute('width', Math.max(0, px - 421).toFixed(1));
    komora.setAttribute('opacity', (0.12 + 0.45 * (st.tipka ? 1 : st.x)).toFixed(2));
    oprC.setAttribute('points', opruga(px + 8, 80, 528, 80, 8, 6));
    const tlakP = st.tipka ? 6 : 6 * st.x * 0.6;
    tlak.textContent = 'tlak u cilindru ≈ ' + hr(tlakP, 1) + ' bar';
    mag.style.fill = st.tipka ? B.zut : '';
    tipL.style.fill = st.tipka ? B.zel : 'var(--rule)';
    const pod = st.tipka;
    for (const e of [vP]) e.classList.toggle('t2d-tlak', true);
    for (const e of [vA, vA2, vCv, vCv2, vPr, vPr2]) e.classList.toggle('t2d-tlak', pod || st.x > 0.01);
    vR.classList.toggle('t2d-tlak', !pod && st.x > 0.01);
    tokP.style.display = pod && st.x < 0.999 ? '' : 'none';
    tokA.style.display = pod && st.x < 0.999 ? '' : 'none';
    tokR.style.display = !pod && st.x > 0.001 ? '' : 'none';
    for (const e of [tokP, tokA]) e.style.strokeDashoffset = (-st.tok * 1.6).toFixed(1);
    tokR.style.strokeDashoffset = (-st.tok * 0.5).toFixed(1);
    kugla.setAttribute('cx', pod && st.x < 0.999 ? 369 : 362);
    o.pol(st.ventil > 0.5 ? 'aktivan: 1 → 2, 3 zatvoren' : 'miran: 2 → 3, 1 zatvoren');
    o.cil(st.x > 0.999 ? 'izvučen (alat otpušten)' : st.x < 0.001 ? 'uvučen (alat stegnut)' : (st.tipka ? 'izvlači se — brzo' : 'vraća se — polako, kroz prigušnicu'), st.x > 0.999 ? 't2d-plavo' : st.x < 0.001 ? 't2d-ok' : 't2d-upoz');
  }
  function tipka(d) {
    if (st.tipka === d) return;
    st.tipka = d;
    bT.setAttribute('aria-pressed', String(d));
    ui.stanje(d ? 'Tipka pritisnuta: Y1 pod naponom, razvodnik spaja 1 → 2. Zrak teče kroz nepovratni ventil i brzo puni cilindar.' : 'Tipka puštena: opruga vraća razvodnik (2 → 3). Opruge cilindra istiskuju zrak kroz prigušnicu u ispuh — povratak je spor.', d ? 'plavo' : null);
    ctx.budi();
  }
  ctx.petlja(dt => {
    st.tok += dt * 60;
    st.ventil = pribl(st.ventil, st.tipka ? 1 : 0, dt * 12);
    let ide = false;
    if (st.tipka && st.ventil > 0.99) { if (st.x < 1) { st.x = Math.min(1, st.x + dt / 0.35); ide = true; } }
    else if (!st.tipka && st.ventil < 0.01 && st.x > 0) { st.x = Math.max(0, st.x - dt / st.tPovrat); ide = true; }
    if (st.ventil > 0.001 && st.ventil < 0.999) ide = true;
    osvjezi();
    return ide;
  });
  const r = ui.red();
  const bT = ui.gumb('Tipka za izmjenu alata (drži)', null, { u: r, pritisak: false, aria: 'Tipka za izmjenu alata — drži pritisnuto' });
  bT.classList.add('t2d-drzi');
  ctx.on(bT, 'pointerdown', e => { e.preventDefault(); try { bT.setPointerCapture(e.pointerId); } catch (x) { /* */ } tipka(true); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) ctx.on(bT, ev, () => { if (!st.zadrzi) tipka(false); });
  ctx.on(bT, 'keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); tipka(true); } });
  ctx.on(bT, 'keyup', e => { if ((e.key === ' ' || e.key === 'Enter') && !st.zadrzi) { e.preventDefault(); tipka(false); } });
  ctx.on(bT, 'blur', () => { if (!st.zadrzi) tipka(false); });
  ctx.on(bT, 'contextmenu', e => e.preventDefault());
  ui.gumb('Zadrži / pusti', (e, b) => { st.zadrzi = !st.zadrzi; b.setAttribute('aria-pressed', String(st.zadrzi)); tipka(st.zadrzi); }, { u: r, tanki: true, pritisak: false, aria: 'Zadrži tipku pritisnutom ili je pusti' });
  ui.klizac('Prigušnica — vrijeme povratka', 1, 5, 0.5, st.tPovrat, v => hr(v, 1) + ' s', v => { st.tPovrat = v; });
  const o = ui.ocit([['pol', 'Razvodnik'], ['cil', 'Cilindar']]);
  osvjezi();
  ui.stanje('Pritisni i drži tipku za izmjenu alata.');
}

/* =========================================================== 9. sila oslonca */
function tOslonac(ui, ctx) {
  const FV = 10, SK = 2;           // kN, px/mm
  const XA = 170, XB = 490, LUK = (XB - XA) / SK;  // 160 mm
  const st = { l1: 40, F: 0, cilj: 0, kut: 0 };
  const svg = ui.svg(600, 340, 'Stezna pandža: obradak lijevo, podložni blok desno, vijak između; sile na obratku, osloncu i vijku');
  // stol s T-utorom
  S('rect', { x: 10, y: 250, width: 580, height: 60, class: 't2d-stol' }, svg);
  S('path', { d: 'M10,262 L590,262 M10,298 L590,298', class: 't2d-utorT' }, svg);
  T(svg, 16, 330, 'stol s T-utorom', 't2d-ls');
  // obradak i oslonac
  S('rect', { x: 30, y: 170, width: 155, height: 80, class: 't2d-obradak' }, svg);
  T(svg, 100, 216, 'obradak', 't2d-l', 'middle');
  S('path', { d: 'M470,250 L470,190 L486,190 L486,170 L520,170 L520,250 Z', class: 't2d-blok-osl' }, svg);
  T(svg, 528, 216, 'oslonac', 't2d-l');
  // pandža
  S('path', { d: `M${XA - 18},150 L${XB + 22},150 L${XB + 22},164 L${XB + 6},170 L${XB - 6},170 L${XB - 14},164 L${XA + 14},164 L${XA + 6},170 L${XA - 6},170 L${XA - 18},164 Z`, class: 't2d-pandza' }, svg);
  S('rect', { x: XA + 40, y: 154, width: XB - XA - 80, height: 6, rx: 3, class: 't2d-prorez' }, svg);
  // vijak, matica, T-matica
  const vij = S('g', {}, svg);
  S('rect', { x: -6, y: 112, width: 12, height: 168, class: 't2d-motka' }, vij);
  S('rect', { x: -22, y: 268, width: 44, height: 22, class: 't2d-motka' }, vij);
  S('rect', { x: -18, y: 144, width: 36, height: 6, class: 't2d-pomicni' }, vij);
  const mat = S('rect', { x: -14, y: 126, width: 28, height: 18, class: 't2d-tamno' }, vij);
  const crtaM = S('line', { y1: 128, y2: 142, stroke: 'var(--paper)', 'stroke-width': 2 }, vij);
  // kote
  const kote = S('g', {}, svg);
  const k1 = S('line', { y1: 96, y2: 96, class: 't2d-kota' }, kote), k2 = S('line', { y1: 96, y2: 96, class: 't2d-kota' }, kote);
  for (const x of [XA, XB]) S('line', { x1: x, y1: 88, x2: x, y2: 104, class: 't2d-kota' }, kote);
  const kv = S('line', { y1: 88, y2: 104, class: 't2d-kota' }, kote);
  const t1 = T(kote, 0, 88, '', 't2d-l', 'middle'), t2 = T(kote, 0, 88, '', 't2d-l', 'middle');
  // sile
  const fA = strel(svg, XA, 120, XA, 165, { boja: B.zel, w: 5, gl: 15 });
  const fB = strel(svg, XB, 120, XB, 165, { boja: B.nar, w: 5, gl: 15 });
  const fV = strel(svg, 0, 60, 0, 120, { boja: B.pl, w: 5, gl: 15 });
  const tA = T(svg, XA, 0, '', 't2d-lb', 'middle'), tB = T(svg, XB, 0, '', 't2d-lb', 'middle'), tV = T(svg, 0, 0, '', 't2d-lb', 'middle');
  tA.style.fill = B.zel; tB.style.fill = B.nar; tV.style.fill = B.pl;

  function osvjezi() {
    const l1 = st.l1, l2 = LUK - l1, xv = XA + l1 * SK;
    vij.setAttribute('transform', `translate(${xv} 0)`);
    const kx = Math.cos(st.kut) * 12;
    crtaM.setAttribute('x1', kx.toFixed(1)); crtaM.setAttribute('x2', kx.toFixed(1));
    k1.setAttribute('x1', XA); k1.setAttribute('x2', xv); k2.setAttribute('x1', xv); k2.setAttribute('x2', XB);
    kv.setAttribute('x1', xv); kv.setAttribute('x2', xv);
    t1.setAttribute('x', (XA + xv) / 2); t1.textContent = 'l1 = ' + Math.round(l1) + ' mm';
    t2.setAttribute('x', (xv + XB) / 2); t2.textContent = 'l2 = ' + Math.round(l2) + ' mm';
    t1.style.display = xv - XA > 74 ? '' : 'none';
    t2.style.display = XB - xv > 74 ? '' : 'none';
    const F = st.F, Fa = F * l2 / LUK, Fb = F * l1 / LUK;
    const dl = f => 8 + f / FV * 80;
    fA.set(XA, 168 - dl(Fa), XA, 168); fA.style.display = F > 0.05 ? '' : 'none';
    fB.set(XB, 170 - 2 - dl(Fb), XB, 170 - 2); fB.style.display = F > 0.05 ? '' : 'none';
    fV.set(xv + 34, 118 - dl(F) * 0.5, xv + 34, 118 + dl(F) * 0.5);
    fV.style.display = F > 0.05 ? '' : 'none';
    tA.setAttribute('y', 168 - dl(Fa) - 8); tA.textContent = 'F_obr = ' + hr(Fa, 1) + ' kN';
    tB.setAttribute('y', 168 - dl(Fb) - 8); tB.textContent = 'F_osl = ' + hr(Fb, 1) + ' kN';
    tV.setAttribute('x', xv + 34); tV.setAttribute('y', 118 - dl(F) * 0.5 - 8); tV.textContent = 'F_v = ' + hr(F, 1) + ' kN';
    for (const t of [tA, tB, tV]) t.style.display = F > 0.05 ? '' : 'none';
    // da se natpisi ne preklapaju
    if (Math.abs(xv + 34 - XA) < 130) tA.setAttribute('x', Math.min(XA, xv - 30) - 20); else tA.setAttribute('x', XA);
    if (Math.abs(xv + 34 - XB) < 130) tB.setAttribute('x', Math.max(XB, xv + 100) + 10); else tB.setAttribute('x', XB);
    tA.setAttribute('text-anchor', tA.getAttribute('x') != XA ? 'end' : 'middle');
    tB.setAttribute('text-anchor', tB.getAttribute('x') != XB ? 'start' : 'middle');
    o.fa(hr(Fa, 2) + ' kN', l1 <= LUK / 3 ? 't2d-ok' : l1 >= LUK * 2 / 3 ? 't2d-opas' : '');
    o.fb(hr(Fb, 2) + ' kN');
    o.ud(Math.round(FV * l2 / LUK / FV * 100) + ' % sile vijka ide na obradak');
    o.m(`${hr(Fa * l1, 0)} = ${hr(Fb * l2, 0)} kN·mm`);
  }
  ctx.petlja(dt => {
    if (st.F === st.cilj) { osvjezi(); return false; }
    const prije = st.F;
    st.F = pribl(st.F, st.cilj, FV / 1.6 * dt);
    st.kut += (st.F - prije) * 1.2;
    osvjezi();
    if (st.F === st.cilj) ui.stanje(st.cilj ? zakljucak() : 'Vijak otpušten.', st.cilj ? (st.l1 <= LUK / 3 ? 'ok' : st.l1 >= LUK * 2 / 3 ? 'upoz' : null) : null);
    return true;
  });
  const zakljucak = () => {
    const p = Math.round((LUK - st.l1) / LUK * 100);
    return st.l1 <= LUK / 3 ? `Vijak je blizu obratka: ${p} % sile vijka steže obradak. Tako treba.` : st.l1 >= LUK * 2 / 3 ? `Vijak je blizu oslonca: samo ${p} % sile ide na obradak, većina opterećuje oslonac.` : `Vijak je u sredini: obradak dobiva ${p} % sile vijka.`;
  };
  const kl = ui.klizac('Položaj vijka l1 (od obratka)', 16, 144, 1, st.l1, v => v + ' mm', v => { st.l1 = v; osvjezi(); if (st.F > 0 && st.F === st.cilj) ui.stanje(zakljucak()); });
  const r = ui.red();
  ui.gumb('Pritegni vijak', (e, b) => { st.cilj = st.cilj ? 0 : FV; b.textContent = st.cilj ? 'Otpusti vijak' : 'Pritegni vijak'; b.setAttribute('aria-pressed', String(!!st.cilj)); ctx.budi(); }, { u: r, pritisak: false });
  const r2 = ui.red();
  for (const [t, v] of [['Uz obradak', 24], ['U sredini', 80], ['Uz oslonac', 136]]) ui.gumb(t, () => { st.l1 = v; kl.ulaz.value = v; kl.osvjezi(); osvjezi(); if (st.F > 0) ui.stanje(zakljucak()); }, { u: r2, tanki: true });
  const o = ui.ocit([['fa', 'Sila na obratku F_obr = F_v · l2 / (l1 + l2)'], ['fb', 'Sila na osloncu F_osl = F_v · l1 / (l1 + l2)'], ['ud', 'Udio'], ['m', 'Ravnoteža momenata F_obr · l1 = F_osl · l2']]);
  osvjezi();
  ui.stanje('Sila vijka F_v = 10 kN (primjer). Pritegni vijak i mijenjaj njegov položaj.');
}

/* =========================================================== 10. 3D sonda */
function tSonda(ui, ctx) {
  const RK = 3;                                   // polumjer kuglice (Ø6, primjer)
  const W0 = { x: 12.563, y: 43.734, z: 134.883 };
  const WP = { x1: 12.563, x2: 142.563, y1: 43.734, y2: 123.734, z1: 94.883, z2: 134.883 };
  const DZ = { x: 77.563, y: 83.734, R: 20, dno: 119.883 };   // kružni džep Ø40, dubina 15
  const st = { mod: 'kut', p: { x: 60, y: 90, z: 170 }, put: [], i: 0, radi: false, dodiri: [], signal: 0, rez: null };
  const svg = ui.svg(600, 330, 'Mjerna sonda u tlocrtu i bokocrtu: prilazi rubovima, plohi ili kružnom džepu, a pri dodiru bežično šalje signal');
  const g = S('g', {}, svg);
  let M = {};
  function crtaj() {
    g.replaceChildren();
    const kut = st.mod === 'kut';
    // tlocrt
    const s1 = kut ? 1.65 : 4.2;
    const ox = kut ? 40 : 60 - (DZ.x - 32) * s1, oy = kut ? 268 : 290 + (DZ.y - 45) * s1;
    const tx = X => ox + (X + 10) * s1 - (kut ? 0 : 0), ty = Y => oy - (Y - 25) * s1;
    const tX = kut ? (X => 30 + (X + 10) * s1) : (X => 30 + (X - (DZ.x - 33)) * s1);
    const tY = kut ? (Y => 300 - (Y - 20) * s1) : (Y => 300 - (Y - (DZ.y - 30)) * s1);
    // bokocrt (X–Z)
    const s2 = kut ? 2.2 : 2.6;
    const bX = kut ? (X => 360 + (X + 15) * s2) : (X => 335 + (X - (DZ.x - 48)) * s2);
    const bZ = Z => 300 - (Z - (kut ? 95 : 105)) * s2;
    M = { tX, tY, bX, bZ };
    const clipT = S('clipPath', { id: ui.uid + '-ct' }, g); S('rect', { x: 10, y: 34, width: 315, height: 280 }, clipT);
    const clipB = S('clipPath', { id: ui.uid + '-cb' }, g); S('rect', { x: 335, y: 34, width: 260, height: 280 }, clipB);
    const gTop = S('g', {}, g), gBok = S('g', {}, g);
    const gT = S('g', { 'clip-path': `url(#${ui.uid}-ct)` }, gTop), gB = S('g', { 'clip-path': `url(#${ui.uid}-cb)` }, gBok);
    T(gTop, 14, 24, 'Tlocrt (X–Y)', 't2d-l'); T(gBok, 338, 24, 'Bokocrt (X–Z)', 't2d-l');
    M.sep = S('line', { x1: 330, y1: 30, x2: 330, y2: 318, class: 't2d-crta-t' }, g);
    M.gBok = gBok;
    S('rect', { x: tX(WP.x1), y: tY(WP.y2), width: (WP.x2 - WP.x1) * s1, height: (WP.y2 - WP.y1) * s1, class: 't2d-obradak' }, gT);
    S('rect', { x: bX(WP.x1), y: bZ(WP.z2), width: (WP.x2 - WP.x1) * s2, height: (WP.z2 - WP.z1) * s2, class: 't2d-obradak' }, gB);
    if (!kut) {
      S('circle', { cx: tX(DZ.x), cy: tY(DZ.y), r: DZ.R * s1, class: 't2d-dzep' }, gT);
      S('rect', { x: bX(DZ.x - DZ.R), y: bZ(WP.z2) - 1, width: 2 * DZ.R * s2, height: (WP.z2 - DZ.dno) * s2 + 1, class: 't2d-dzep' }, gB);
    }
    // sonda
    M.sT = S('g', {}, gT);
    M.kT = S('circle', { r: RK * s1, class: 't2d-kuglica' }, M.sT);
    S('circle', { r: 14 * s1 * (kut ? 1 : 0.5), class: 't2d-drzac-t' }, M.sT);
    M.sB = S('g', {}, gB);
    S('rect', { x: -1.5 * s2, y: -32 * s2, width: 3 * s2, height: 32 * s2, class: 't2d-ticalo' }, M.sB);
    S('rect', { x: -14 * s2, y: -72 * s2, width: 28 * s2, height: 40 * s2, rx: 4, class: 't2d-sonda-t' }, M.sB);
    M.led = S('circle', { cx: 0, cy: -40 * s2, r: 4, fill: B.zel, opacity: 0.25 }, M.sB);
    M.kB = S('circle', { r: RK * s2, class: 't2d-kuglica' }, M.sB);
    // prijemnik i signal
    M.prij = S('g', { transform: 'translate(292 62)' }, gTop);
    S('rect', { x: -16, y: -12, width: 32, height: 24, rx: 4, class: 't2d-tamno' }, M.prij);
    T(M.prij, 0, 30, 'prijemnik', 't2d-ls', 'middle');
    M.val = S('g', {}, gBok);
    M.tocke = S('g', {}, gTop); M.tockeB = S('g', {}, gBok);
    M.rez = S('g', {}, gTop); M.rezB = S('g', {}, gBok);
    raspored();
    osvjezi();
  }
  function raspored() {
    const u = !!st.uski;
    svg.setAttribute('viewBox', u ? '0 0 335 640' : '0 0 600 330');
    if (M.gBok) M.gBok.setAttribute('transform', u ? 'translate(-325 312)' : '');
    if (M.sep) M.sep.style.display = u ? 'none' : '';
  }
  function plan() {
    const P = [];
    const mv = (x, y, z, v, op) => P.push({ x, y, z, v: v || 160, op });
    if (st.mod === 'kut') {
      mv(60, 90, 170); mv(60, 90, 150, 160, 'Z: prilaz iznad plohe');
      P.push({ dodir: 'z', smjer: -1, v: 25 });
      mv(st.p.x, 90, 165); mv(-12, 90, 165); mv(-12, 90, 125, 160, 'X: spuštanje lijevo od obratka');
      P.push({ dodir: 'x', smjer: 1, v: 25 });
      mv(-12, 90, 125); mv(-12, 90, 165); mv(60, 30, 165); mv(60, 30, 125, 160, 'Y: spuštanje ispred obratka');
      P.push({ dodir: 'y', smjer: 1, v: 25 });
      mv(60, 30, 125); mv(60, 30, 170);
    } else {
      const s0 = { x: DZ.x + 3.2, y: DZ.y - 2.1 };
      mv(s0.x, s0.y, 170, 160); mv(s0.x, s0.y, 127, 160, 'spuštanje u džep (približno u sredinu)');
      for (const a of [90, 210, 330]) { P.push({ dodir: 'kut', kut: a, s0, v: 25 }); P.push({ x: s0.x, y: s0.y, z: 127, v: 60 }); }
      P.push({ centar: true, v: 60 });
      P.push({ gore: true, v: 160 });
    }
    return P;
  }
  function pokreni() {
    st.put = plan(); st.i = 0; st.dodiri = []; st.rez = null; st.radi = true;
    M.tocke.replaceChildren(); M.tockeB.replaceChildren(); M.rez.replaceChildren(); M.rezB.replaceChildren(); log.replaceChildren();
    bP.disabled = true;
    ui.stanje('Mjerenje teče…');
    ctx.budi();
  }
  function dodir(os, smjer, kutA) {
    let txt, z = { x: st.p.x, y: st.p.y, z: st.p.z };
    if (os === 'z') { z.z = st.p.z - RK; txt = `Dodir u smjeru −Z: ploha Z = ${nc(z.z)} (središte kuglice ${nc(st.p.z)} − r)`; }
    else if (os === 'x') { z.x = st.p.x + RK; txt = `Dodir u smjeru +X: rub X = ${nc(z.x)} (središte ${nc(st.p.x)} + r)`; }
    else if (os === 'y') { z.y = st.p.y + RK; txt = `Dodir u smjeru +Y: rub Y = ${nc(z.y)} (središte ${nc(st.p.y)} + r)`; }
    else { const a = kutA * Math.PI / 180; z.x = st.p.x + RK * Math.cos(a); z.y = st.p.y + RK * Math.sin(a); txt = `Dodir ${st.dodiri.length + 1} (smjer ${kutA}°): X = ${nc(z.x)}, Y = ${nc(z.y)}`; }
    st.dodiri.push(z);
    st.signal = 0.9;
    log.append(H('li', { tekst: txt }));
    S('circle', { cx: M.tX(z.x), cy: M.tY(z.y), r: 4, fill: B.crv }, M.tocke);
    if (os !== 'y' && os !== 'kut') S('circle', { cx: M.bX(z.x), cy: M.bZ(z.z), r: 4, fill: B.crv }, M.tockeB);
    ui.stanje('Dodir! Sonda bežično javlja signal, upravljanje sprema položaj osi. ' + txt);
  }
  function srediste() {
    const [a, b, c] = st.dodiri;
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    const s = q => q.x * q.x + q.y * q.y;
    const ux = (s(a) * (b.y - c.y) + s(b) * (c.y - a.y) + s(c) * (a.y - b.y)) / d;
    const uy = (s(a) * (c.x - b.x) + s(b) * (a.x - c.x) + s(c) * (b.x - a.x)) / d;
    const r = Math.hypot(a.x - ux, a.y - uy);
    return { x: ux, y: uy, r };
  }
  function rezultat() {
    M.rez.replaceChildren(); M.rezB.replaceChildren();
    if (st.mod === 'kut') {
      const [dz, dx, dy] = st.dodiri;
      st.rez = { x: dx.x, y: dy.y, z: dz.z };
      const n = (gg, x, y) => { const q = S('g', { class: 't2d-nt-W' }, gg); S('circle', { cx: x, cy: y, r: 8, class: 't2d-nt-k' }, q); S('path', { d: `M${x},${y} L${x + 8},${y} A8,8 0 0 1 ${x},${y + 8} Z M${x},${y} L${x - 8},${y} A8,8 0 0 1 ${x},${y - 8} Z`, class: 't2d-nt-p' }, q); T(q, x - 10, y + 22, 'W', 't2d-lb', 'end'); };
      n(M.rez, M.tX(st.rez.x), M.tY(st.rez.y)); n(M.rezB, M.bX(st.rez.x), M.bZ(st.rez.z));
      ui.stanje(`Mjerni ciklus je upisao nultočku u kut obratka: G54 X ${nc(st.rez.x)}  Y ${nc(st.rez.y)}  Z ${nc(st.rez.z)}.`, 'ok');
    } else {
      const c = srediste();
      st.rez = c;
      S('circle', { cx: M.tX(c.x), cy: M.tY(c.y), r: 5, fill: B.zel }, M.rez);
      S('path', { d: `M${M.tX(c.x) - 12},${M.tY(c.y)} h24 M${M.tX(c.x)},${M.tY(c.y) - 12} v24`, stroke: B.zel, 'stroke-width': 2 }, M.rez);
      ui.stanje(`Središte džepa: X ${nc(c.x)}  Y ${nc(c.y)}, promjer Ø ${nc(2 * (c.r + 0), 3)} mm (dodirne točke). Nultočka X/Y upisana u središte.`, 'ok');
    }
    o.rez(st.mod === 'kut' ? `X ${nc(st.rez.x)}  Y ${nc(st.rez.y)}  Z ${nc(st.rez.z)}` : `X ${nc(st.rez.x)}  Y ${nc(st.rez.y)}  Ø ${nc(2 * st.rez.r)}`, 't2d-ok');
  }
  function osvjezi() {
    const p = st.p;
    M.sT.setAttribute('transform', `translate(${M.tX(p.x).toFixed(1)} ${M.tY(p.y).toFixed(1)})`);
    M.sB.setAttribute('transform', `translate(${M.bX(p.x).toFixed(1)} ${M.bZ(p.z).toFixed(1)})`);
    M.led.setAttribute('opacity', st.signal > 0 ? 1 : 0.25);
    M.val.replaceChildren();
    if (st.signal > 0) {
      const x0 = M.bX(p.x) + 16, y0 = M.bZ(p.z) - 100;
      for (let i = 0; i < 3; i++) {
        const r = 10 + i * 12 + (0.9 - st.signal) * 30;
        S('path', { d: `M${x0 + r * 0.7},${y0 - r * 0.7} A${r},${r} 0 0 1 ${x0 + r * 0.7},${y0 + r * 0.7}`, fill: 'none', stroke: B.zel, 'stroke-width': 2.5, opacity: Math.max(0, st.signal - i * 0.15) }, M.val);
      }
    }
    o.pol(`X ${nc(p.x)}  Y ${nc(p.y)}  Z ${nc(p.z)}`);
  }
  ctx.petlja(dt => {
    if (st.signal > 0) st.signal = Math.max(0, st.signal - dt);
    if (!st.radi) { osvjezi(); return st.signal > 0; }
    const k = st.put[st.i];
    if (!k) { st.radi = false; bP.disabled = false; rezultat(); osvjezi(); return st.signal > 0; }
    let korak = (k.v || 100) * dt;
    if (k.dodir) {
      if (k.dodir === 'kut') {
        const a = k.kut * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
        st.p.x += ux * korak; st.p.y += uy * korak;
        if (Math.hypot(st.p.x - DZ.x, st.p.y - DZ.y) >= DZ.R - RK) {
          // točan položaj dodira na kružnici
          const dx = k.s0.x - DZ.x, dy = k.s0.y - DZ.y, Rr = DZ.R - RK;
          const b = dx * ux + dy * uy, c = dx * dx + dy * dy - Rr * Rr, t = -b + Math.sqrt(b * b - c);
          st.p.x = k.s0.x + ux * t; st.p.y = k.s0.y + uy * t;
          dodir('kut', 0, k.kut); st.i++;
        }
      } else {
        const os = k.dodir, gran = os === 'z' ? WP.z2 + RK : os === 'x' ? WP.x1 - RK : WP.y1 - RK;
        st.p[os] += k.smjer * korak;
        if ((k.smjer < 0 && st.p[os] <= gran) || (k.smjer > 0 && st.p[os] >= gran)) { st.p[os] = gran; dodir(os, k.smjer); st.i++; }
      }
    } else if (k.centar) {
      const c = srediste();
      const d = Math.hypot(c.x - st.p.x, c.y - st.p.y);
      if (d < korak) { st.p.x = c.x; st.p.y = c.y; st.i++; } else { st.p.x += (c.x - st.p.x) / d * korak; st.p.y += (c.y - st.p.y) / d * korak; }
    } else if (k.gore) {
      st.p.z = Math.min(170, st.p.z + korak); if (st.p.z >= 170) st.i++;
    } else {
      const dx = k.x - st.p.x, dy = k.y - st.p.y, dz = k.z - st.p.z, L = Math.hypot(dx, dy, dz);
      if (k.op && !k.najavljeno) { k.najavljeno = true; ui.stanje(k.op); }
      if (L <= korak) { st.p = { x: k.x, y: k.y, z: k.z }; st.i++; }
      else { st.p.x += dx / L * korak; st.p.y += dy / L * korak; st.p.z += dz / L * korak; }
    }
    osvjezi();
    return true;
  });
  ui.seg('Mjerenje', [['kut', 'Kut obratka (X, Y, Z)'], ['dzep', 'Kružni džep (središte)']], st.mod, v => {
    st.mod = v; st.radi = false; bP.disabled = false; st.p = v === 'kut' ? { x: 60, y: 90, z: 170 } : { x: DZ.x + 3.2, y: DZ.y - 2.1, z: 170 };
    st.dodiri = []; log.replaceChildren(); o.rez('—'); crtaj();
    ui.stanje(v === 'kut' ? 'Tri dodira: ploha (−Z), lijevi rub (+X), prednji rub (+Y).' : 'Tri dodira pod 120° u džepu; sonda ne mora biti točno u sredini.');
  });
  const r = ui.red();
  const bP = ui.gumb('Pokreni mjerenje', () => pokreni(), { u: r });
  const o = ui.ocit([['pol', 'Središte kuglice (MKS)'], ['rez', 'Rezultat mjernog ciklusa']]);
  const log = H('ol', { class: 't2d-log', 'aria-label': 'Zapis dodira' });
  ui.ocitP.append(log);
  crtaj();
  ui.uski(u => { st.uski = u; raspored(); });
  ui.stanje('Tri dodira: ploha (−Z), lijevi rub (+X), prednji rub (+Y). Kuglica Ø 6 mm.');
}

/* =========================================================== 11. regulacijski krug */
function tRegulacija(ui, ctx) {
  const P = 10;                                   // uspon vretena [mm]
  const st = { kv: 1.0, F: 2000, cilj: 80, xs: 0, xa: 0, v: 0, vs: 0, t: 0, radi: false, faza: -1, tf: 0, hist: [], tok: 0, start: 0, zadnjiT: 0 };
  const TV = 0.02;
  const svg = ui.svg(600, 440, 'Blok-shema regulacijskog kruga osi Y s povratnom vezom i graf zadanog i stvarnog položaja');
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
  const bNC = blok(8, 24, 128, 52, 'NC blok', 'N50 G1 Y80');
  const bIP = blok(166, 24, 120, 52, 'Interpolacija', '(NCU)');
  const sum = S('g', { class: 't2d-rb' }, svg);
  S('circle', { cx: 330, cy: 50, r: 17 }, sum);
  T(sum, 330, 56, 'Σ', 't2d-lb', 'middle');
  T(svg, 304, 42, '+', 't2d-lb', 'middle'); T(svg, 344, 84, '−', 't2d-lb', 'middle');
  const bRP = blok(378, 24, 112, 52, 'Regulator', 'položaja (Kv)');
  const bMO = blok(470, 118, 122, 52, 'Modul osi Y', 'brzina, struja');
  const bSM = blok(306, 118, 128, 52, 'Servomotor', '');
  const bKV = blok(118, 118, 152, 52, 'Kuglično vreteno', '');
  const bRZ = blok(286, 204, 168, 40, 'Rezolver / enkoder', '');
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
  T(svg, gx0, gy1 - 10, 'Položaj osi Y [mm] u vremenu', 't2d-ls');
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
      ui.stanje(`Os je na cilju Y${st.cilj}. ${prebac > 0.05 ? `Nadvišenje ${hr(prebac, 2)} mm — Kv je previsok za ovaj pogon.` : 'Bez nadvišenja.'} Pritisni ponovno „Cycle Start” za povratak.`, prebac > 0.05 ? 'upoz' : 'ok');
      st.cilj = st.cilj === 80 ? 0 : 80;
      bNC.querySelectorAll('text')[1].textContent = 'N50 G1 Y' + st.cilj;
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
    ui.stanje(`Upravljanje tumači blok N50 G1 Y${st.cilj} F${st.F}, interpolacija računa zadane položaje, a regulator uspoređuje zadano i stvarno…`);
    ctx.budi();
  }, { u: r, aria: 'Cycle Start — pokreni blok' });
  ui.klizac('Kv-faktor', 0.5, 3, 0.1, st.kv, v => hr(v, 1) + ' (m/min)/mm', v => { st.kv = v; });
  ui.klizac('Posmak F', 500, 5000, 100, st.F, v => v + ' mm/min', v => { st.F = v; });
  const o = ui.ocit([['zad', 'Zadani položaj Y'], ['stv', 'Stvarni položaj Y'], ['e', 'Slijedna pogreška'], ['n', 'Brzina motora (uspon 10 mm)']]);
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
  izvedbe: tIzvedbe, kuglicno: tKuglicno, mjerni: tMjerni, stickslip: tStickslip,
  g54mks: (ui, ctx) => tG54(ui, ctx, false), g54wks: (ui, ctx) => tG54(ui, ctx, true),
  stezanje: tStezanje, pneumatika: tPneumatika, oslonac: tOslonac, sonda: tSonda,
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
