// FORTRONIQ · CO₂ laser · prozor programa LaserCut 5.3 (Leetro) u pregledniku
// Raspored, nazivi i dijalozi prema Tomislavovu videu „Lasecut5.3 … MACHINE SET UP” i uputama (DSP5.3).
import { aciHex, PALETA, imeBoje, citajDXF, pisiDXF, spojiLinije, okvir, uskladiSlojeve, noviSloj, izracunaj, vrijeme, MODOVI, stanjeU, duljina } from './lc-jezgra.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, at = {}, ...dj) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(at)) { if (k === 'cls') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v); } for (const d of dj.flat()) if (d != null) e.append(d.nodeType ? d : document.createTextNode(d)); return e; };
const br = (v, d = 2) => Number(v).toFixed(d);
const IK = { // ikone alatne trake (SVG, 16 × 16)
  novo: '<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#555"/><path d="M10 1v3h3" fill="none" stroke="#555"/>',
  otvori: '<path d="M1 4h5l1 1h7v9H1z" fill="#F2C94C" stroke="#9a7a1c"/>',
  spremi: '<rect x="2" y="2" width="12" height="12" fill="#3A6EA5"/><rect x="4" y="2" width="8" height="5" fill="#fff"/><rect x="5" y="10" width="6" height="4" fill="#ccc"/>',
  uvoz: '<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#555"/><path d="M8 5v7M5 9l3 3 3-3" stroke="#1B7F3A" stroke-width="1.8" fill="none"/>',
  izvoz: '<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#555"/><path d="M8 12V5M5 8l3-3 3 3" stroke="#B23B2A" stroke-width="1.8" fill="none"/>',
  zplus: '<circle cx="7" cy="7" r="5" fill="#fff" stroke="#444" stroke-width="1.5"/><path d="M11 11l4 4M5 7h4M7 5v4" stroke="#444" stroke-width="1.5"/>',
  zminus: '<circle cx="7" cy="7" r="5" fill="#fff" stroke="#444" stroke-width="1.5"/><path d="M11 11l4 4M5 7h4" stroke="#444" stroke-width="1.5"/>',
  ruka: '<path d="M5 15V7a1 1 0 0 1 2 0V3a1 1 0 0 1 2 0v4-5a1 1 0 0 1 2 0v5-3a1 1 0 0 1 2 0v6c0 3-2 5-4 5H8z" fill="#F5D7B8" stroke="#7a5a3a"/>',
  sve: '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#444"/><rect x="4" y="4" width="8" height="8" fill="#9CC3E6" stroke="#3A6EA5"/>',
  odaberi: '<path d="M3 1v13l3-3 2 4 2-1-2-4h4z" fill="#fff" stroke="#000"/>',
  crta: '<path d="M2 14L14 2" stroke="#000" stroke-width="1.5"/>',
  pravok: '<rect x="2" y="4" width="12" height="9" fill="none" stroke="#000" stroke-width="1.4"/>',
  elipsa: '<ellipse cx="8" cy="8" rx="6" ry="4.5" fill="none" stroke="#000" stroke-width="1.4"/>',
  niz: '<rect x="1" y="2" width="5" height="5" fill="none" stroke="#000"/><rect x="9" y="2" width="5" height="5" fill="none" stroke="#000"/><rect x="1" y="9" width="5" height="5" fill="none" stroke="#000"/><rect x="9" y="9" width="5" height="5" fill="none" stroke="#000"/>',
  spoji: '<path d="M2 12l4-8 4 8 4-8" fill="none" stroke="#000" stroke-width="1.4"/><circle cx="6" cy="4" r="1.6" fill="#B23B2A"/><circle cx="10" cy="12" r="1.6" fill="#B23B2A"/>',
  mjerilo: '<rect x="2" y="6" width="8" height="8" fill="none" stroke="#000"/><rect x="5" y="2" width="9" height="9" fill="none" stroke="#3A6EA5" stroke-dasharray="2 1"/>',
  rot: '<path d="M13 8a5 5 0 1 1-2-4" fill="none" stroke="#000" stroke-width="1.4"/><path d="M11 1v4h-4" fill="none" stroke="#000" stroke-width="1.4"/>',
  zrcalo: '<path d="M8 1v14" stroke="#888" stroke-dasharray="2 1"/><path d="M6 3L1 13h5zM10 3l5 10h-5z" fill="#9CC3E6" stroke="#000"/>',
  racun: '<rect x="2" y="1" width="12" height="14" fill="#5E7A8C"/><rect x="4" y="3" width="8" height="3" fill="#BFE3C8"/><g fill="#fff"><rect x="4" y="8" width="2" height="2"/><rect x="7" y="8" width="2" height="2"/><rect x="10" y="8" width="2" height="2"/><rect x="4" y="11" width="2" height="2"/><rect x="7" y="11" width="2" height="2"/><rect x="10" y="11" width="2" height="2"/></g>',
  simul: '<path d="M1 14L6 4l4 6 5-8" fill="none" stroke="#3A6EA5" stroke-width="1.6"/><circle cx="15" cy="2" r="1.6" fill="#B23B2A"/>',
  simbrz: '<path d="M2 12a6 6 0 1 1 12 0" fill="none" stroke="#000" stroke-width="1.4"/><path d="M8 12l3-5" stroke="#B23B2A" stroke-width="1.6"/>',
  sat: '<circle cx="8" cy="8" r="6.3" fill="#fff" stroke="#000" stroke-width="1.3"/><path d="M8 4v4l3 2" fill="none" stroke="#000" stroke-width="1.4"/>',
  ishod: '<path d="M1 15h14M1 15V1" stroke="#000"/><circle cx="4" cy="12" r="2.4" fill="none" stroke="#B23B2A" stroke-width="1.4"/>',
  postavke: '<circle cx="8" cy="8" r="3" fill="none" stroke="#000" stroke-width="1.6"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M13 3l-2 2M5 11l-2 2" stroke="#000" stroke-width="1.6"/>',
  brisi: '<path d="M3 4h10M6 4V2h4v2M4 4l1 11h6l1-11" fill="none" stroke="#000" stroke-width="1.3"/>',
  ponisti: '<path d="M5 3L1 7l4 4" fill="none" stroke="#000" stroke-width="1.5"/><path d="M1 7h8a5 5 0 0 1 0 10" fill="none" stroke="#000" stroke-width="1.5"/>'
};
const ikona = k => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('width', '16'); s.setAttribute('height', '16'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = IK[k]; return s; };

export class LaserCut {
  constructor(korijen, o) {
    this.k = korijen; this.o = o; // {wt, setWt, stroj, kontroler, dnevnik, primjeri, ucitajPrimjer, promjena, pokreniNaStroju, materijal}
    this.objekti = []; this.slojevi = []; this.odabrani = new Set(); this.ime = 'bez naziva';
    this.odabraniSloj = -1; this.prljavo = true; this.posao = null; this.povijest = [];
    this.pogled = { s: 0.5, x: 0, y: 0 }; this.alat = 'odaberi';
    this.immediate = true; this.ref = 'gd'; this.times = 1; this.delay = 0;
    this.sim = null; this.simBrzina = 10;
    this.gradi();
    this.novo();
  }
  // ── izgradnja prozora ──
  gradi() {
    const k = this.k; k.innerHTML = ''; k.classList.add('lc');
    this.elNaslov = h('div', { cls: 'lc-naslov' }, h('span', { cls: 'lc-ikona', 'aria-hidden': 'true' }, '◆'), h('span', { id: 'lc-ime' }, ''), h('span', { cls: 'lc-tipke-prozora', 'aria-hidden': 'true' }, '–  ▢  ✕'));
    const izb = h('div', { cls: 'lc-izbornik', role: 'menubar' });
    const meni = {
      'File(F)': [['New', () => this.novo(), 'Ctrl+N'], ['Open…', () => this.dijalogUvoz(), 'Ctrl+O'], ['Save', () => this.izvoz(), 'Ctrl+S'], ['Save as…', () => this.izvoz(), ''], '-', ['Import…', () => this.dijalogUvoz(), 'Ctrl+I'], ['Export…', () => this.izvoz(), 'Ctrl+E'], '-', ['Machine-Options…', () => this.dijalogStroj(), 'Ctrl+J'], '-', ['Print…', null, ''], ['Exit', null, '']],
      'Edit(E)': [['Undo', () => this.ponisti(), 'Ctrl+Z'], '-', ['Delete', () => this.brisi(), 'Del'], ['Select all', () => this.odaberiSve(), 'Ctrl+A'], '-', ['Array copy…', () => this.dijalogNiz(), '']],
      'Draw(D)': [['Select', () => this.postaviAlat('odaberi'), ''], ['Line', () => this.postaviAlat('crta'), ''], ['Rectangle', () => this.postaviAlat('pravok'), ''], ['Ellipse', () => this.postaviAlat('elipsa'), '']],
      'Tools(T)': [['Unite lines…', () => this.dijalogSpoji(), ''], ['Scale…', () => this.dijalogMjerilo(), ''], ['Rotate 90°', () => this.rotiraj(), ''], ['Mirror horizontal', () => this.zrcali(true), ''], ['Mirror vertical', () => this.zrcali(false), '']],
      'Laser(L)': [['Calculate', () => this.izracunaj(), ''], ['Set stop point…', () => this.dijalogIshod(), ''], '-', ['Simulate process output', () => this.simuliraj(), ''], ['Set simulate speed…', () => this.dijalogSimBrzina(), ''], ['Simulate operating time', () => this.dijalogVrijeme(), ''], '-', ['DownLoad…', () => this.dijalogDownload(), '']],
      'View(V)': [['Zoom in', () => this.zum(1.4), ''], ['Zoom out', () => this.zum(1 / 1.4), ''], ['Full screen (worktable)', () => this.prikaziStol(), ''], ['Zoom to drawing', () => this.prikaziCrtez(), '']],
      'Help(H)': [['About LaserCut…', () => this.poruka('About', 'LaserCut 5.3 (Leetro) — simulacija u pregledniku za digitalni obrazovni sadržaj FORTRONIQ. Stvarni program radi s kontrolerom MPC6565 preko USB-a i USB ključa (softdog).'), '']]
    };
    for (const [ime, stavke] of Object.entries(meni)) {
      const g = h('button', { type: 'button', cls: 'lc-m', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, ime);
      const pad = h('div', { cls: 'lc-pad', role: 'menu', hidden: true });
      for (const s of stavke) {
        if (s === '-') { pad.append(h('hr')); continue; }
        const [t, fn, prec] = s;
        const b = h('button', { type: 'button', role: 'menuitem', disabled: !fn }, h('span', {}, t), h('small', {}, prec));
        if (fn) b.addEventListener('click', () => { this.zatvoriMeni(); fn(); });
        pad.append(b);
      }
      g.addEventListener('click', e => { e.stopPropagation(); const otv = pad.hidden; this.zatvoriMeni(); if (otv) { pad.hidden = false; g.setAttribute('aria-expanded', 'true'); } });
      izb.append(h('div', { cls: 'lc-mw' }, g, pad));
    }
    document.addEventListener('click', () => this.zatvoriMeni());
    const alati = h('div', { cls: 'lc-alati', role: 'toolbar', 'aria-label': 'Alatna traka LaserCuta' });
    const tb = (ik, nas, fn) => { const b = h('button', { type: 'button', title: nas, 'aria-label': nas }, ikona(ik)); b.addEventListener('click', fn); alati.append(b); return b; };
    tb('novo', 'New', () => this.novo()); tb('otvori', 'Open / Import', () => this.dijalogUvoz()); tb('spremi', 'Save (DXF)', () => this.izvoz());
    alati.append(h('i')); tb('uvoz', 'Import (Ctrl+I)', () => this.dijalogUvoz()); tb('izvoz', 'Export (Ctrl+E) — DXF-AutoCAD', () => this.izvoz());
    alati.append(h('i')); tb('zplus', 'Zoom in', () => this.zum(1.4)); tb('zminus', 'Zoom out', () => this.zum(1 / 1.4)); this.bRuka = tb('ruka', 'Move screen', () => this.postaviAlat('ruka')); tb('sve', 'Full screen', () => this.prikaziStol());
    alati.append(h('i')); tb('ponisti', 'Undo', () => this.ponisti()); tb('brisi', 'Delete', () => this.brisi());
    alati.append(h('i')); tb('niz', 'Array copy', () => this.dijalogNiz()); tb('spoji', 'Unite lines', () => this.dijalogSpoji()); tb('mjerilo', 'Scale', () => this.dijalogMjerilo()); tb('rot', 'Rotate 90°', () => this.rotiraj()); tb('zrcalo', 'Mirror', () => this.zrcali(true));
    alati.append(h('i')); tb('racun', 'Calculate', () => this.izracunaj()); tb('simul', 'Simulate process output', () => this.simuliraj()); tb('simbrz', 'Set simulate speed', () => this.dijalogSimBrzina()); tb('sat', 'Simulate operating time', () => this.dijalogVrijeme()); tb('ishod', 'Set stop point', () => this.dijalogIshod()); tb('postavke', 'Machine options (Ctrl+J)', () => this.dijalogStroj());
    const lijevo = h('div', { cls: 'lc-lijevo', role: 'toolbar', 'aria-label': 'Crtanje' });
    this.alatTipke = {};
    for (const [a, n] of [['odaberi', 'Select'], ['crta', 'Line'], ['pravok', 'Rectangle'], ['elipsa', 'Ellipse'], ['ruka', 'Move screen']]) { const b = h('button', { type: 'button', title: n, 'aria-label': n, 'aria-pressed': 'false' }, ikona(a)); b.addEventListener('click', () => this.postaviAlat(a)); lijevo.append(b); this.alatTipke[a] = b; }
    this.platno = h('canvas', { cls: 'lc-platno', tabindex: '0', 'aria-label': 'Radna površina LaserCuta: crtež na stolu stroja; kotačić za zum, povlačenje za odabir i pomicanje' });
    const sred = h('div', { cls: 'lc-sred' }, this.platno);
    // desna ploča
    const d = h('div', { cls: 'lc-desno' });
    this.tablica = h('table', { cls: 'lc-slojevi' }, h('thead', {}, h('tr', {}, ...['Layer', 'Mode', 'Speed', 'Power', 'On', '#'].map(t => h('th', { scope: 'col' }, t)))), h('tbody'));
    d.append(h('div', { cls: 'lc-sl-omot' }, this.tablica));
    const g4 = (...x) => h('div', { cls: 'lc-red4' }, ...x);
    const tip = (t, fn, at = {}) => { const b = h('button', Object.assign({ type: 'button', cls: 'lc-t' }, at), t); b.addEventListener('click', fn); return b; };
    d.append(g4(tip('Up', () => this.pomakniSloj(-1)), tip('Down', () => this.pomakniSloj(1)), tip('All', () => this.svimaIsto()), tip('Calculate', () => this.izracunaj())));
    // ručni pomak (Testing)
    const kr = h('div', { cls: 'lc-krizic' });
    const jog = (t, dx, dy, dz) => tip(t, () => this.o.jogPC(dx, dy, dz, this.korak, this.duljinaKoraka, this.sporo));
    kr.append(h('span'), jog('Y+', 0, 1, 0), h('span'), jog('Z+', 0, 0, 1),
      jog('X−', -1, 0, 0), tip('Datum', () => this.o.datumPC()), jog('X+', 1, 0, 0), tip('Z Datum', () => this.o.zDatumPC()),
      h('span'), jog('Y−', 0, -1, 0), h('span'), jog('Z−', 0, 0, -1));
    d.append(kr);
    this.korak = true; this.sporo = false; this.duljinaKoraka = 50;
    const cbSlow = h('input', { type: 'checkbox' }); cbSlow.addEventListener('change', () => this.sporo = cbSlow.checked);
    const cbStep = h('input', { type: 'checkbox', checked: true }); cbStep.addEventListener('change', () => this.korak = cbStep.checked);
    const inLen = h('input', { type: 'number', value: '50.00', step: '1', min: '0.1', cls: 'lc-ul' }); inLen.addEventListener('change', () => this.duljinaKoraka = Math.max(0.1, +inLen.value || 50));
    d.append(h('div', { cls: 'lc-red' }, h('label', {}, cbSlow, ' Slow'), h('label', {}, cbStep, ' Step'), h('label', {}, 'Length ', inLen)));
    this.inPow = h('input', { type: 'number', value: '45.00', min: '0', max: '100', cls: 'lc-ul' });
    const bLas = h('button', { type: 'button', cls: 'lc-t', 'aria-pressed': 'false' }, 'Laser On/Off');
    bLas.addEventListener('click', () => { const on = bLas.getAttribute('aria-pressed') !== 'true'; bLas.setAttribute('aria-pressed', on); this.o.laserPC(on, +this.inPow.value || 0); });
    this.bLas = bLas;
    d.append(h('div', { cls: 'lc-red' }, bLas, h('label', {}, 'Power ', this.inPow)));
    const inT = h('input', { type: 'number', value: '1', min: '1', max: '999', cls: 'lc-ul' }); inT.addEventListener('change', () => this.times = Math.max(1, inT.value | 0));
    const inD = h('input', { type: 'number', value: '0', min: '0', cls: 'lc-ul' }); inD.addEventListener('change', () => this.delay = Math.max(0, +inD.value || 0));
    d.append(h('div', { cls: 'lc-red' }, h('label', {}, 'Times ', inT), h('label', {}, 'Delay ', inD)));
    this.cbImm = h('input', { type: 'checkbox', checked: true }); this.cbImm.addEventListener('change', () => { this.immediate = this.cbImm.checked; this.oznaciPrljavo(); this.status(); });
    d.append(h('div', { cls: 'lc-red' }, tip('Run Box', () => this.o.runBox(this.okvirIzlaza(), this.immediate, this.refTocka())), tip('Clip Box', () => this.dijalogClip()), h('label', {}, this.cbImm, ' Immediate')));
    d.append(h('div', { cls: 'lc-red3' }, tip('Start', () => this.startPC()), tip('Pause', () => this.o.kontroler.tipka('start')), tip('Stop', () => this.o.kontroler.tipka('stop'))));
    this.selStroj = h('select', { cls: 'lc-ul', 'aria-label': 'Machine' });
    d.append(h('div', { cls: 'lc-red' }, h('label', {}, 'Machine ', this.selStroj), tip('DownLoad', () => this.dijalogDownload())));
    const tijelo = h('div', { cls: 'lc-tijelo' }, lijevo, sred, d);
    const paleta = h('div', { cls: 'lc-paleta', role: 'toolbar', 'aria-label': 'Paleta boja slojeva: označi dio crteža, pa klikni boju' });
    for (const a of PALETA) { const b = h('button', { type: 'button', title: imeBoje(a), 'aria-label': 'Sloj: ' + imeBoje(a), style: `background:${aciHex(a)}` }); b.addEventListener('click', () => this.oboji(a)); paleta.append(b); }
    this.elStatus = h('div', { cls: 'lc-status' }, h('span', { id: 'lc-s1' }, 'Ready'), h('span', { id: 'lc-s2' }), h('span', { id: 'lc-s3' }), h('span', { id: 'lc-s4' }));
    this.dlg = h('div', { cls: 'lc-dlg-sloj', hidden: true });
    k.append(this.elNaslov, izb, alati, tijelo, paleta, this.elStatus, this.dlg);
    this.mis();
    new ResizeObserver(() => this.nacrtaj()).observe(this.platno);
    this.platno.addEventListener('keydown', e => {
      if (e.key === 'Delete') { this.brisi(); e.preventDefault(); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'a') { this.odaberiSve(); e.preventDefault(); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'z') { this.ponisti(); e.preventDefault(); }
      else if (e.key === 'Escape' && this.sim) { this.sim = null; this.nacrtaj(); }
      else if (e.key.startsWith('Arrow') && this.odabrani.size) { const d = e.shiftKey ? 10 : 1; const [dx, dy] = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key]; this.pomakni(dx, dy, true); e.preventDefault(); }
    });
    this.postaviAlat('odaberi');
  }
  zatvoriMeni() { this.k.querySelectorAll('.lc-pad').forEach(p => p.hidden = true); this.k.querySelectorAll('.lc-m').forEach(b => b.setAttribute('aria-expanded', 'false')); }
  postaviAlat(a) { this.alat = a; for (const [k, b] of Object.entries(this.alatTipke)) b.setAttribute('aria-pressed', k === a); this.platno.style.cursor = a === 'ruka' ? 'grab' : a === 'odaberi' ? 'default' : 'crosshair'; }
  osvjeziStrojeve(popis, akt) { this.selStroj.innerHTML = ''; popis.forEach((s, i) => this.selStroj.append(h('option', { value: s, selected: s === akt }, `${i + 1}: ${s}`))); }

  // ── dokument ──
  zapamti() { this.povijest.push(JSON.stringify(this.objekti)); if (this.povijest.length > 25) this.povijest.shift(); }
  ponisti() { const p = this.povijest.pop(); if (!p) return; this.objekti = JSON.parse(p); this.odabrani.clear(); this.slojevi = uskladiSlojeve(this.objekti, this.slojevi); this.oznaciPrljavo(); this.tablicaSlojeva(); this.nacrtaj(); }
  novo() { this.objekti = []; this.slojevi = []; this.odabrani.clear(); this.povijest = []; this.ime = 'bez naziva'; this.posao = null; this.prljavo = true; this.naslov(); this.tablicaSlojeva(); this.prikaziStol(); this.status(); }
  naslov() { const s = this.o.stroj(); $('#lc-ime', this.k).textContent = `Lasercut5.3 - ${this.ime}  ·  ${s.naziv} ${s.radno}`; }
  ucitaj(objekti, ime, prijedlogSlojeva = null, smjesti = true) {
    this.zapamti();
    let ob = objekti.map(o => ({ pts: o.pts.map(p => [p[0], p[1]]), zatv: o.zatv, aci: o.aci }));
    if (smjesti && ob.length) { // smjesti crtež uz gornji desni kut stola (Datum je X+, Y+), 10 mm od ruba
      const b = okvir(ob.flatMap(o => o.pts)), wt = this.o.wt();
      const dx = wt.xRange - 10 - b.x1, dy = wt.yRange - 10 - b.y1;
      ob = ob.map(o => ({ ...o, pts: o.pts.map(([x, y]) => [x + dx, y + dy]) }));
    }
    this.objekti = ob; this.ime = ime; this.odabrani.clear();
    this.slojevi = uskladiSlojeve(this.objekti, prijedlogSlojeva ? prijedlogSlojeva.map(s => noviSloj(s.aci, s)) : []);
    if (prijedlogSlojeva) this.slojevi.sort((a, b) => prijedlogSlojeva.findIndex(s => s.aci === a.aci) - prijedlogSlojeva.findIndex(s => s.aci === b.aci));
    this.oznaciPrljavo(); this.naslov(); this.tablicaSlojeva(); this.prikaziCrtez(); this.status();
    const nesp = this.objekti.filter(o => !o.zatv).length;
    this.o.dnevnik(`LaserCut: Import „${ime}” — ${this.objekti.length} objekata, ${this.slojevi.length} slojeva (boja).` + (nesp > 20 ? ` ${nesp} otvorenih linija: spoji ih (Tools → Unite lines), inače glava radi puno praznih hodova.` : ''));
    this.provjeriStol();
  }
  provjeriStol() {
    const b = this.okvirSvega(), wt = this.o.wt(); if (!b) return;
    const w = b.x1 - b.x0, hh = b.y1 - b.y0;
    if (w > wt.xRange || hh > wt.yRange) this.o.dnevnik(`Crtež je ${br(w, 0)} × ${br(hh, 0)} mm, a radno polje ${wt.xRange} × ${wt.yRange} mm — ne stane na stol.` + (hh <= wt.xRange && w <= wt.yRange ? ' Zakreni ga za 90° (Tools → Rotate 90°).' : ' Treba veći stroj ili crtež podijeliti.'), 'upoz');
  }
  okvirSvega(samoIzlaz = false) {
    const izl = new Set(this.slojevi.filter(s => s.izlaz).map(s => s.aci));
    const ob = samoIzlaz ? this.objekti.filter(o => izl.has(o.aci)) : this.objekti;
    if (!ob.length) return null; return okvir(ob.flatMap(o => o.pts));
  }
  okvirIzlaza() { return this.okvirSvega(true); }
  refTocka(b = this.okvirIzlaza()) {
    if (!b) return [0, 0];
    return { gd: [b.x1, b.y1], gl: [b.x0, b.y1], dd: [b.x1, b.y0], dl: [b.x0, b.y0], c: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2] }[this.ref] || [b.x1, b.y1];
  }
  oznaciPrljavo() { this.prljavo = true; this.status(); this.o.promjena?.(); }

  // ── slojevi ──
  tablicaSlojeva() {
    const tb = this.tablica.tBodies[0]; tb.innerHTML = '';
    this.slojevi.forEach((s, i) => {
      const sel = h('select', { 'aria-label': 'Mode' }, ...MODOVI.map(m => h('option', { value: m, selected: m === s.mod }, m)));
      sel.addEventListener('change', () => { s.mod = sel.value; if (s.mod !== 'Cut' && s.v < 100) { s.v = s.mod === 'Hole' ? s.v : 300; s.p = s.mod === 'Hole' ? s.p : 30; } this.oznaciPrljavo(); this.tablicaSlojeva(); });
      const on = h('input', { type: 'checkbox', checked: s.izlaz, 'aria-label': 'Output' }); on.addEventListener('change', () => { s.izlaz = on.checked; this.oznaciPrljavo(); this.nacrtaj(); });
      const n = h('input', { type: 'number', value: s.n, min: '1', max: '99', 'aria-label': 'Broj prolaza' }); n.addEventListener('change', () => { s.n = Math.max(1, n.value | 0); this.oznaciPrljavo(); });
      const boja = h('button', { type: 'button', cls: 'lc-boja', style: `background:${aciHex(s.aci)}`, title: 'Dvoklik: Set options', 'aria-label': `Sloj ${imeBoje(s.aci)} — postavke` });
      boja.addEventListener('dblclick', () => this.dijalogSloj(i)); boja.addEventListener('keydown', e => { if (e.key === 'Enter') this.dijalogSloj(i); });
      const tr = h('tr', { cls: i === this.odabraniSloj ? 'akt' : '' }, h('td', {}, boja), h('td', {}, sel), h('td', {}, s.mod === 'Hole' ? '--' : br(s.v)), h('td', {}, br(s.p)), h('td', {}, on), h('td', {}, n));
      tr.addEventListener('click', e => { this.odabraniSloj = i; tb.querySelectorAll('tr').forEach((r, j) => r.classList.toggle('akt', j === i)); });
      tr.addEventListener('dblclick', e => { if (e.target.tagName === 'TD') this.dijalogSloj(i); });
      tb.append(tr);
    });
    if (!this.slojevi.length) tb.append(h('tr', {}, h('td', { colspan: '6', cls: 'lc-prazno' }, 'Nema slojeva — File → Import')));
  }
  pomakniSloj(d) {
    const i = this.odabraniSloj; if (i < 0 || i >= this.slojevi.length) { this.o.dnevnik('Up/Down: najprije klikni redak sloja u tablici.', 'upoz'); return; }
    const j = i + d; if (j < 0 || j >= this.slojevi.length) return;
    [this.slojevi[i], this.slojevi[j]] = [this.slojevi[j], this.slojevi[i]]; this.odabraniSloj = j; this.oznaciPrljavo(); this.tablicaSlojeva();
  }
  svimaIsto() {
    const s = this.slojevi[this.odabraniSloj]; if (!s) { this.o.dnevnik('All: najprije klikni redak sloja čije parametre kopiraš.', 'upoz'); return; }
    for (const x of this.slojevi) if (x !== s) Object.assign(x, { mod: s.mod, v: s.v, p: s.p, kp: s.kp, prek: s.prek, puh: s.puh, razmak: s.razmak, bidir: s.bidir });
    this.oznaciPrljavo(); this.tablicaSlojeva();
  }
  oboji(aci) {
    if (!this.odabrani.size) { this.o.dnevnik('Paleta: najprije označi dio crteža (klik ili povlačenje), pa klikni boju — tako nastaje novi sloj.', 'upoz'); return; }
    this.zapamti();
    for (const i of this.odabrani) this.objekti[i].aci = aci;
    this.slojevi = uskladiSlojeve(this.objekti, this.slojevi); this.oznaciPrljavo(); this.tablicaSlojeva(); this.nacrtaj();
  }

  // ── uređivanje ──
  odaberiSve() { this.objekti.forEach((o, i) => this.odabrani.add(i)); this.status(); this.nacrtaj(); }
  brisi() { if (!this.odabrani.size) return; this.zapamti(); this.objekti = this.objekti.filter((o, i) => !this.odabrani.has(i)); this.odabrani.clear(); this.slojevi = uskladiSlojeve(this.objekti, this.slojevi); this.oznaciPrljavo(); this.tablicaSlojeva(); this.nacrtaj(); }
  ciljevi() { return this.odabrani.size ? [...this.odabrani] : this.objekti.map((o, i) => i); }
  transformiraj(fn, zapamti = true) { if (zapamti) this.zapamti(); for (const i of this.ciljevi()) this.objekti[i].pts = this.objekti[i].pts.map(fn); this.oznaciPrljavo(); this.nacrtaj(); }
  pomakni(dx, dy, zap) { this.transformiraj(([x, y]) => [x + dx, y + dy], zap); }
  rotiraj() { const ids = this.ciljevi(); if (!ids.length) return; const b = okvir(ids.flatMap(i => this.objekti[i].pts)); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; this.transformiraj(([x, y]) => [cx - (y - cy), cy + (x - cx)]); this.provjeriStol(); }
  zrcali(vod) { const ids = this.ciljevi(); if (!ids.length) return; const b = okvir(ids.flatMap(i => this.objekti[i].pts)); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; this.transformiraj(([x, y]) => vod ? [2 * cx - x, y] : [x, 2 * cy - y]); }

  // ── izračun (Calculate) ──
  izracunaj(tiho = false) {
    const wt = this.o.wt();
    if (!this.objekti.length) { if (!tiho) this.o.dnevnik('Calculate: nema crteža.', 'upoz'); return null; }
    const b = this.okvirIzlaza(); if (!b) { this.o.dnevnik('Calculate: nijedan sloj nije uključen (stupac On).', 'upoz'); return null; }
    const ref = this.refTocka(b);
    this.posao = izracunaj(this.objekti, this.slojevi, wt, { start: ref, kraj: ref });
    this.posao.ref = ref; this.posao.okvirCrteza = b;
    this.prljavo = false; this.status();
    if (!tiho) {
      const st = this.posao.st;
      for (const u of new Set(st.upozorenja)) this.o.dnevnik(u, 'upoz');
      this.o.dnevnik(`Calculate: ${vrijeme(st.ukupno)} — rez ${br(st.rez / 1000, 2)} m, prazni hod ${br(st.prazno / 1000, 2)} m. Redoslijed slojeva: od dna popisa prema vrhu.`);
    }
    this.o.promjena?.();
    return this.posao;
  }
  datotekaZaKontroler(ime) {
    if (this.prljavo || !this.posao) this.izracunaj(true);
    if (!this.posao) return null;
    return { ime: ime.toUpperCase().slice(0, 8), posao: this.posao, okvir: this.posao.st.okvir || this.posao.okvirCrteza, immediate: this.immediate, ref: this.posao.ref, slojevi: this.slojevi.map(s => ({ ...s })), velicina: Math.round(this.posao.koraci.length * 0.06 + 1) };
  }
  startPC() {
    const k = this.o.kontroler; if (!k.napon) { this.o.dnevnik('Start: stroj nije uključen ili veza s kontrolerom ne radi (USB).', 'upoz'); return; }
    if (this.prljavo) { this.o.dnevnik('Start: crtež ili parametri su promijenjeni — najprije Calculate.', 'upoz'); return; }
    const d = this.datotekaZaKontroler(this.ime.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'PC'); if (!d) return;
    k.pokreni(d, 'LaserCut');
  }

  // ── simulacija putanje (Simulate process output) ──
  simuliraj() {
    if (this.prljavo || !this.posao) this.izracunaj(true);
    if (!this.posao) return;
    this.sim = { t: 0, zadnje: performance.now() };
    const korak = () => {
      if (!this.sim) return;
      const sad = performance.now(); this.sim.t += (sad - this.sim.zadnje) / 1000 * this.simBrzina; this.sim.zadnje = sad;
      this.nacrtaj();
      $('#lc-s1', this.k).textContent = `Simulate… ${vrijeme(this.sim.t)} / ${vrijeme(this.posao.st.ukupno)}  (Esc = kraj)`;
      if (this.sim.t < this.posao.st.ukupno) requestAnimationFrame(korak); else { $('#lc-s1', this.k).textContent = 'Ready'; this.sim.gotovo = true; this.nacrtaj(); }
    };
    requestAnimationFrame(korak); this.platno.focus();
  }

  // ── status ──
  status() {
    const s2 = $('#lc-s2', this.k), s3 = $('#lc-s3', this.k), s4 = $('#lc-s4', this.k); if (!s2) return;
    s2.textContent = `X=${br(this.misX ?? 0)}, Y=${br(this.misY ?? 0)}  selected=${this.odabrani.size}`;
    s3.textContent = this.posao && !this.prljavo ? `Worked times: ${vrijeme(this.posao.st.ukupno)}` : (this.objekti.length ? 'Calculate!' : '');
    s4.textContent = this.immediate ? 'Immediate mode' : 'Absolute mode';
  }

  // ── crtanje radne površine ──
  prikaziStol() { const wt = this.o.wt(); this.prikazi({ x0: 0, y0: 0, x1: wt.xRange, y1: wt.yRange }); }
  prikaziCrtez() { const b = this.okvirSvega(); if (b) this.prikazi({ x0: Math.min(0, b.x0), y0: Math.min(0, b.y0), x1: Math.max(this.o.wt().xRange, b.x1), y1: Math.max(this.o.wt().yRange, b.y1) }); else this.prikaziStol(); }
  prikazi(b) {
    const w = this.platno.clientWidth || 600, hh = this.platno.clientHeight || 400, m = 34;
    const s = Math.min((w - m - 20) / Math.max(1, b.x1 - b.x0), (hh - m - 20) / Math.max(1, b.y1 - b.y0));
    this.pogled = { s, x: b.x0 - (w - m - (b.x1 - b.x0) * s) / 2 / s + m / s * 0, y: b.y0 - (hh - m - (b.y1 - b.y0) * s) / 2 / s };
    this.pogled.x = b.x0 - ((w - m) / s - (b.x1 - b.x0)) / 2 - m / s;
    this.pogled.y = b.y0 - ((hh - m) / s - (b.y1 - b.y0)) / 2;
    this.nacrtaj();
  }
  zum(f, px, py) { const w = this.platno.clientWidth, hh = this.platno.clientHeight; px ??= w / 2; py ??= hh / 2; const [mx, my] = this.uMm(px, py); this.pogled.s *= f; this.pogled.x = mx - px / this.pogled.s; this.pogled.y = my - (hh - py) / this.pogled.s; this.nacrtaj(); }
  uMm(px, py) { const hh = this.platno.clientHeight; return [this.pogled.x + px / this.pogled.s, this.pogled.y + (hh - py) / this.pogled.s]; }
  uPx(x, y) { const hh = this.platno.clientHeight; return [(x - this.pogled.x) * this.pogled.s, hh - (y - this.pogled.y) * this.pogled.s]; }
  nacrtaj() {
    const c = this.platno, dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, hh = c.clientHeight;
    if (!w || !hh) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(hh * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr); }
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#DFF8F8'; x.fillRect(0, 0, w, hh);
    const wt = this.o.wt(), P = (a, b) => this.uPx(a, b), s = this.pogled.s;
    // mreža (crtkane crte) i ravnala u cm
    const kor = [10, 20, 50, 100, 150, 200, 500].find(k => k * s >= 46) || 1000;
    x.strokeStyle = 'rgba(80,120,130,.28)'; x.setLineDash([2, 3]); x.lineWidth = 1;
    const [mx0, my0] = this.uMm(0, hh), [mx1, my1] = this.uMm(w, 0);
    for (let gx = Math.ceil(mx0 / kor) * kor; gx <= mx1; gx += kor) { const [px] = P(gx, 0); x.beginPath(); x.moveTo(px, 0); x.lineTo(px, hh); x.stroke(); }
    for (let gy = Math.ceil(my0 / kor) * kor; gy <= my1; gy += kor) { const [, py] = P(0, gy); x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke(); }
    x.setLineDash([]);
    // radno polje
    const [ax, ay] = P(0, 0), [bx, by] = P(wt.xRange, wt.yRange);
    x.strokeStyle = '#000'; x.lineWidth = 2; x.strokeRect(ax, by, bx - ax, ay - by);
    // objekti
    const izl = new Map(this.slojevi.map(sl => [sl.aci, sl.izlaz]));
    this.objekti.forEach((o, i) => {
      x.strokeStyle = aciHex(o.aci) === '#FFFF00' ? '#C8B400' : aciHex(o.aci); x.lineWidth = this.odabrani.has(i) ? 1.6 : 1.1;
      x.globalAlpha = izl.get(o.aci) === false ? 0.3 : 1;
      if (this.odabrani.has(i)) x.setLineDash([5, 3]);
      x.beginPath(); o.pts.forEach(([a, b], j) => { const [px, py] = P(a, b); j ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); x.setLineDash([]);
    });
    x.globalAlpha = 1;
    // ručke odabira
    if (this.odabrani.size) {
      const b = okvir([...this.odabrani].flatMap(i => this.objekti[i].pts)); const [p0x, p0y] = P(b.x0, b.y0), [p1x, p1y] = P(b.x1, b.y1);
      x.fillStyle = '#000'; for (const [a, bb] of [[p0x, p0y], [p1x, p0y], [p0x, p1y], [p1x, p1y], [(p0x + p1x) / 2, p0y], [(p0x + p1x) / 2, p1y], [p0x, (p0y + p1y) / 2], [p1x, (p0y + p1y) / 2]]) x.fillRect(a - 3, bb - 3, 6, 6);
      x.strokeStyle = '#1A55C9'; x.lineWidth = 1.4; const cx = (p0x + p1x) / 2, cy = (p0y + p1y) / 2; x.beginPath(); x.moveTo(cx - 6, cy - 6); x.lineTo(cx + 6, cy + 6); x.moveTo(cx + 6, cy - 6); x.lineTo(cx - 6, cy + 6); x.stroke();
    }
    // simulacija putanje
    if (this.sim && this.posao) {
      const K = this.posao.koraci, t = this.sim.t;
      x.lineWidth = 1.6;
      for (const k of K) {
        if (k.t0 > t) break;
        const f = Math.min(1, (t - k.t0) / Math.max(k.t, 1e-9));
        const [p0x, p0y] = P(k.x0, k.y0), [p1x, p1y] = P(k.x0 + (k.x1 - k.x0) * f, k.y0 + (k.y1 - k.y0) * f);
        x.strokeStyle = k.laser ? '#1440E0' : 'rgba(20,64,224,.35)'; x.setLineDash(k.laser ? [] : [3, 3]);
        x.beginPath(); x.moveTo(p0x, p0y); x.lineTo(p1x, p1y); x.stroke();
      }
      x.setLineDash([]);
      const st = stanjeU(this.posao, t); if (st) { const [px, py] = P(st.x, st.y); x.fillStyle = '#E0201A'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill(); }
    }
    // položaj glave stroja
    const g = this.o.glava?.(); if (g) { const [px, py] = P(g[0], g[1]); x.strokeStyle = '#E0201A'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px - 8, py); x.lineTo(px + 8, py); x.moveTo(px, py - 8); x.lineTo(px, py + 8); x.stroke(); x.beginPath(); x.arc(px, py, 4, 0, 7); x.stroke(); }
    // okvir povlačenja
    if (this.okvirPov) { const r = this.okvirPov; x.strokeStyle = '#1A55C9'; x.setLineDash([4, 3]); x.strokeRect(Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.abs(r[2] - r[0]), Math.abs(r[3] - r[1])); x.setLineDash([]); }
    if (this.nacrt) { x.strokeStyle = '#000'; x.lineWidth = 1; x.beginPath(); this.nacrt.forEach(([a, b], j) => { const [px, py] = P(a, b); j ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); }
    // ravnala (cm)
    x.fillStyle = '#F4F4F4'; x.fillRect(0, hh - 22, w, 22); x.fillRect(0, 0, 30, hh);
    x.fillStyle = '#000'; x.font = '11px Arial, sans-serif'; x.textAlign = 'center';
    for (let gx = Math.ceil(mx0 / kor) * kor; gx <= mx1; gx += kor) { const [px] = P(gx, 0); if (px > 30) { x.fillText(String(Math.round(gx / 10)), px, hh - 7); x.fillRect(px, hh - 22, 1, 4); } }
    x.textAlign = 'right';
    for (let gy = Math.ceil(my0 / kor) * kor; gy <= my1; gy += kor) { const [, py] = P(0, gy); if (py < hh - 22) { x.fillText(String(Math.round(gy / 10)), 27, py + 4); x.fillRect(26, py, 4, 1); } }
  }

  // ── miš ──
  pogodak(mx, my) {
    const tol = 5 / this.pogled.s; let bi = -1, bd = tol;
    this.objekti.forEach((o, i) => {
      const p = o.pts;
      for (let j = 1; j < p.length; j++) {
        const [ax, ay] = p[j - 1], [bx, by] = p[j], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
        const t = L2 ? Math.max(0, Math.min(1, ((mx - ax) * dx + (my - ay) * dy) / L2)) : 0;
        const d = Math.hypot(mx - ax - t * dx, my - ay - t * dy); if (d < bd) { bd = d; bi = i; }
      }
    });
    return bi;
  }
  mis() {
    const c = this.platno; let pov = null;
    c.addEventListener('wheel', e => { e.preventDefault(); const r = c.getBoundingClientRect(); this.zum(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId); c.focus();
      const r = c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, [mx, my] = this.uMm(px, py);
      if (this.alat === 'ruka' || e.button === 1 || e.button === 2) { pov = { tip: 'ruka', px, py, x: this.pogled.x, y: this.pogled.y }; c.style.cursor = 'grabbing'; return; }
      if (this.alat !== 'odaberi') { pov = { tip: 'crtaj', x0: mx, y0: my }; return; }
      const i = this.pogodak(mx, my);
      if (i >= 0) {
        if (!this.odabrani.has(i)) { if (!e.shiftKey) this.odabrani.clear(); this.odabrani.add(i); }
        else if (e.shiftKey) this.odabrani.delete(i);
        this.zapamti(); pov = { tip: 'pomak', mx, my, dx: 0, dy: 0 };
      } else { if (!e.shiftKey) this.odabrani.clear(); pov = { tip: 'okvir', px, py }; this.okvirPov = [px, py, px, py]; }
      this.status(); this.nacrtaj();
    });
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, [mx, my] = this.uMm(px, py);
      this.misX = mx; this.misY = my; this.status();
      if (!pov) return;
      if (pov.tip === 'ruka') { this.pogled.x = pov.x - (px - pov.px) / this.pogled.s; this.pogled.y = pov.y + (py - pov.py) / this.pogled.s; this.nacrtaj(); }
      else if (pov.tip === 'pomak') { const dx = mx - pov.mx - pov.dx, dy = my - pov.my - pov.dy; pov.dx += dx; pov.dy += dy; for (const i of this.odabrani) this.objekti[i].pts = this.objekti[i].pts.map(([a, b]) => [a + dx, b + dy]); this.nacrtaj(); }
      else if (pov.tip === 'okvir') { this.okvirPov = [pov.px, pov.py, px, py]; this.nacrtaj(); }
      else if (pov.tip === 'crtaj') {
        const { x0, y0 } = pov;
        if (this.alat === 'crta') this.nacrt = [[x0, y0], [mx, my]];
        else if (this.alat === 'pravok') this.nacrt = [[x0, y0], [mx, y0], [mx, my], [x0, my], [x0, y0]];
        else { const cx = (x0 + mx) / 2, cy = (y0 + my) / 2, rx = Math.abs(mx - x0) / 2, ry = Math.abs(my - y0) / 2; this.nacrt = Array.from({ length: 97 }, (_, k) => [cx + rx * Math.cos(k / 96 * 2 * Math.PI), cy + ry * Math.sin(k / 96 * 2 * Math.PI)]); }
        this.nacrtaj();
      }
    });
    const kraj = () => {
      if (!pov) return;
      if (pov.tip === 'pomak') { if (Math.hypot(pov.dx, pov.dy) > 1e-6) this.oznaciPrljavo(); else this.povijest.pop(); }
      if (pov.tip === 'okvir' && this.okvirPov) {
        const [a, b, cc, d] = this.okvirPov; const [x0, y1] = this.uMm(Math.min(a, cc), Math.min(b, d)), [x1, y0] = this.uMm(Math.max(a, cc), Math.max(b, d));
        if (Math.abs(cc - a) > 3) this.objekti.forEach((o, i) => { const q = okvir(o.pts); if (q.x0 >= x0 && q.x1 <= x1 && q.y0 >= y0 && q.y1 <= y1) this.odabrani.add(i); });
        this.okvirPov = null;
      }
      if (pov.tip === 'crtaj' && this.nacrt && duljina(this.nacrt) > 0.5) {
        this.zapamti(); const aci = 7; const z = this.alat !== 'crta';
        this.objekti.push({ pts: this.nacrt, zatv: z, aci }); this.odabrani = new Set([this.objekti.length - 1]);
        this.slojevi = uskladiSlojeve(this.objekti, this.slojevi); this.tablicaSlojeva(); this.oznaciPrljavo();
      }
      this.nacrt = null; pov = null; this.platno.style.cursor = this.alat === 'ruka' ? 'grab' : 'default'; this.status(); this.nacrtaj();
    };
    c.addEventListener('pointerup', kraj); c.addEventListener('pointercancel', kraj);
    c.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ── dijalozi (izgled kao u programu) ──
  dijalog(naslov, tijelo, gumbi, sirina = 360) {
    this.dlg.innerHTML = '';
    const p = h('div', { cls: 'lc-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': naslov, style: `width:min(${sirina}px,96%)` });
    const z = h('button', { type: 'button', cls: 'lc-x', 'aria-label': 'Zatvori' }, '✕'); z.addEventListener('click', () => this.zatvori());
    p.append(h('div', { cls: 'lc-dlg-n' }, h('span', {}, naslov), z), h('div', { cls: 'lc-dlg-t' }, tijelo));
    if (gumbi?.length) { const g = h('div', { cls: 'lc-dlg-g' }); for (const [t, fn] of gumbi) { const b = h('button', { type: 'button', cls: 'lc-t' }, t); b.addEventListener('click', () => { if (fn() !== false) this.zatvori(); }); g.append(b); } p.append(g); }
    this.dlg.append(p); this.dlg.hidden = false;
    p.querySelector('input,select,button')?.focus();
    p.addEventListener('keydown', e => { if (e.key === 'Escape') this.zatvori(); });
    return p;
  }
  zatvori() { this.dlg.hidden = true; this.dlg.innerHTML = ''; this.platno.focus(); }
  poruka(n, t) { this.dijalog(n, h('p', {}, t), [['OK', () => true]]); }
  polje(oz, v, at = {}) { const i = h('input', Object.assign({ type: 'number', value: v, step: 'any' }, at)); return [h('label', { cls: 'lc-f' }, h('span', {}, oz), i), i]; }

  dijalogUvoz() {
    const sel = h('select', { size: '9', cls: 'lc-popis', 'aria-label': 'Primjeri' });
    for (const p of this.o.primjeri) sel.append(h('option', { value: p.id }, p.naziv));
    sel.selectedIndex = 0;
    const prev = h('canvas', { cls: 'lc-prev', width: '240', height: '180', 'aria-label': 'Preview' });
    const opis = h('p', { cls: 'lc-mali' }, '');
    const dat = h('input', { type: 'file', accept: '.dxf,.DXF', 'aria-label': 'DXF s računala' });
    let ucitano = null;
    const pokazi = async () => {
      const id = sel.value; opis.textContent = 'Učitavam…';
      try { ucitano = await this.o.ucitajPrimjer(id); opis.textContent = ucitano.opis || ''; this.crtajPreview(prev, ucitano.objekti); } catch (e) { opis.textContent = 'Greška: ' + e.message; }
    };
    sel.addEventListener('change', pokazi);
    dat.addEventListener('change', () => {
      const f = dat.files[0]; if (!f) return; const r = new FileReader();
      r.onload = () => { try { const d = citajDXF(r.result); ucitano = { objekti: d.objekti, ime: f.name.replace(/\.dxf$/i, ''), slojevi: null }; opis.textContent = `${f.name}: ${d.objekti.length} objekata` + (d.upozorenja.length ? ` · nije učitano: ${d.upozorenja.join(', ')}` : ''); this.crtajPreview(prev, d.objekti); } catch (e) { opis.textContent = 'Nije moguće pročitati DXF: ' + e.message; } };
      r.readAsText(f);
    });
    const t = h('div', { cls: 'lc-uvoz' }, h('div', {}, h('div', { cls: 'lc-mali' }, 'Look in: Primjeri FORTRONIQ'), sel, h('label', { cls: 'lc-f' }, h('span', {}, 'Files of type: All File Formats'), ''), h('label', { cls: 'lc-f lc-dat' }, h('span', {}, 'DXF s računala'), dat)), h('div', {}, h('div', { cls: 'lc-mali' }, 'Preview'), prev, opis));
    this.dijalog('Open', t, [['Open', () => { if (!ucitano) return false; this.ucitaj(ucitano.objekti, ucitano.ime, ucitano.slojevi); if (ucitano.materijal) this.o.materijal?.(ucitano.materijal); return true; }], ['Cancel', () => true]], 560);
    pokazi();
  }
  crtajPreview(c, ob) {
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); if (!ob?.length) return;
    const b = okvir(ob.flatMap(o => o.pts)), s = Math.min((c.width - 12) / (b.x1 - b.x0 || 1), (c.height - 12) / (b.y1 - b.y0 || 1));
    for (const o of ob) { x.strokeStyle = aciHex(o.aci) === '#FFFF00' ? '#C8B400' : aciHex(o.aci); x.lineWidth = 1; x.beginPath(); o.pts.forEach(([a, bb], j) => { const px = 6 + (a - b.x0) * s, py = c.height - 6 - (bb - b.y0) * s; j ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); }
  }
  izvoz() {
    if (!this.objekti.length) { this.poruka('Export', 'Nema crteža za izvoz.'); return; }
    const ime = h('input', { type: 'text', value: (this.ime || 'crtez').replace(/[^\w\-]/g, '_') });
    this.dijalog('Save As', h('div', {}, h('label', { cls: 'lc-f' }, h('span', {}, 'File name:'), ime), h('label', { cls: 'lc-f' }, h('span', {}, 'Save as type:'), h('select', {}, h('option', {}, 'DXF-AutoCAD')))), [['Save', () => {
      const blob = new Blob([pisiDXF(this.objekti)], { type: 'application/dxf' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (ime.value || 'crtez') + '.dxf'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      this.o.dnevnik(`Export: ${ime.value}.dxf (DXF-AutoCAD, slojevi po bojama).`); return true;
    }], ['Cancel', () => true]]);
  }
  dijalogNiz() {
    const ids = this.ciljevi(); if (!this.objekti.length) return;
    const [l1, r] = this.polje('Rows:', 1, { min: 1 }), [l2, gy] = this.polje('Gap:', 5), [l3, c] = this.polje('Columns:', 2, { min: 1 }), [l4, gx] = this.polje('Gap:', 5);
    this.dijalog('Array copy options', h('div', { cls: 'lc-2s' }, l1, l2, l3, l4), [['OK', () => {
      const R = Math.max(1, r.value | 0), C = Math.max(1, c.value | 0), b = okvir(ids.flatMap(i => this.objekti[i].pts)), w = b.x1 - b.x0, hh = b.y1 - b.y0;
      this.zapamti(); const izv = ids.map(i => this.objekti[i]);
      for (let a = 0; a < R; a++) for (let q = 0; q < C; q++) { if (!a && !q) continue; const dx = q * (w + (+gx.value || 0)), dy = -a * (hh + (+gy.value || 0)); for (const o of izv) this.objekti.push({ ...o, pts: o.pts.map(([x, y]) => [x + dx, y + dy]) }); }
      this.oznaciPrljavo(); this.nacrtaj(); this.provjeriStol(); return true;
    }], ['Cancel', () => true]]);
  }
  dijalogSpoji() {
    const [l, t] = this.polje('Unite tolerance:', '0.010', { min: 0, step: '0.001' });
    this.dijalog('Unite lines options', h('div', {}, l), [['OK', () => {
      const n0 = this.objekti.length; this.zapamti(); this.objekti = spojiLinije(this.objekti, Math.max(0.0005, +t.value || 0.01)); this.odabrani.clear();
      this.oznaciPrljavo(); this.nacrtaj(); this.o.dnevnik(`Unite lines: ${n0} → ${this.objekti.length} objekata (zatvorenih: ${this.objekti.filter(o => o.zatv).length}).`); return true;
    }]], 300);
  }
  dijalogMjerilo() {
    const ids = this.ciljevi(); if (!ids.length) return; const b = okvir(ids.flatMap(i => this.objekti[i].pts)), w = b.x1 - b.x0, hh = b.y1 - b.y0;
    const [l1] = this.polje('Length on x:', br(w), { disabled: true }), [l2] = this.polje('Length on y:', br(hh), { disabled: true });
    const [l3, nx] = this.polje('New length on x:', br(w)), [l4, ny] = this.polje('New length on y:', br(hh));
    const lock = h('input', { type: 'checkbox', checked: true });
    nx.addEventListener('input', () => { if (lock.checked && w) ny.value = br(+nx.value * hh / w); });
    ny.addEventListener('input', () => { if (lock.checked && hh) nx.value = br(+ny.value * w / hh); });
    this.dijalog('Scale options', h('div', { cls: 'lc-2s' }, l1, l2, l3, l4, h('label', {}, lock, ' razmjerno')), [['OK', () => {
      const sx = w ? (+nx.value || w) / w : 1, sy = hh ? (+ny.value || hh) / hh : 1;
      this.transformiraj(([x, y]) => [b.x0 + (x - b.x0) * sx, b.y0 + (y - b.y0) * sy]); this.provjeriStol(); return true;
    }], ['Cancel', () => true]]);
  }
  dijalogSloj(i) {
    const s = this.slojevi[i]; if (!s) return;
    const zag = h('div', { cls: 'lc-sloj-zag' }, h('i', { style: `background:${aciHex(s.aci)}` }), ` ${imeBoje(s.aci)} · ${s.mod}`);
    let t, ok;
    if (s.mod === 'Cut') {
      const [a, v] = this.polje('Speed:', br(s.v)), [b, p] = this.polje('Power:', br(s.p)), [c, kp] = this.polje('Corner power:', br(s.kp)), [d, pr] = this.polje('Overlap:', br(s.prek, 5));
      const rad = ['ne', 'rez', 'uvijek'].map((k, j) => h('label', {}, h('input', { type: 'radio', name: 'puh', value: k, checked: s.puh === k }), ' ' + ['Not blow', 'Blow while cutting', 'Always blow'][j]));
      t = h('div', { cls: 'lc-cut' }, h('div', {}, a, b, c, d), h('div', { cls: 'lc-radio' }, ...rad, h('button', { type: 'button', cls: 'lc-t', disabled: true, title: 'Napredne postavke (nisu u simulatoru)' }, '...')));
      ok = () => { Object.assign(s, { v: Math.max(0.1, +v.value || s.v), p: Math.max(0, Math.min(100, +p.value)), kp: Math.max(0, Math.min(100, +kp.value)), prek: Math.max(0, +pr.value || 0), puh: t.querySelector('input[name=puh]:checked').value }); };
    } else if (s.mod === 'Engrave' || s.mod === 'GradeEngrave') {
      const [a, v] = this.polje('Speed:', br(s.v)), [b, p] = this.polje(s.mod === 'GradeEngrave' ? 'Power (max):' : 'Power:', br(s.p)), [c, g] = this.polje('Scan gap:', br(s.razmak, 3)), [d, mp] = this.polje('Min-Power:', br(s.minP));
      const bi = h('input', { type: 'checkbox', checked: s.bidir });
      t = h('div', { cls: 'lc-2s' }, a, b, c, s.mod === 'GradeEngrave' ? d : h('span'), h('label', {}, bi, ' Bi-dir'), h('label', {}, h('input', { type: 'checkbox', checked: true }), ' Blow'));
      ok = () => { Object.assign(s, { v: Math.max(1, +v.value || s.v), p: Math.max(0, Math.min(100, +p.value)), razmak: Math.max(0.02, +g.value || 0.1), minP: Math.max(0, +mp.value || 0), bidir: bi.checked }); };
    } else {
      const [b, p] = this.polje('Power:', br(s.p)), [c, z] = this.polje('Radiation (s):', br(s.zracenje, 3));
      t = h('div', { cls: 'lc-2s' }, b, c, h('label', {}, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Hole on center'), h('label', {}, h('input', { type: 'checkbox', checked: true }), ' Blow'));
      ok = () => { Object.assign(s, { p: Math.max(0, Math.min(100, +p.value)), zracenje: Math.max(0, +z.value || 0) }); };
    }
    const preporuka = this.o.preporuka?.(s);
    this.dijalog({ Cut: 'Set cut options', Engrave: 'Set engrave options', GradeEngrave: 'Set grade engrave options', Hole: 'Set holes option' }[s.mod], h('div', {}, zag, t, preporuka ? h('p', { cls: 'lc-mali' }, preporuka) : null), [['OK', () => { ok(); this.oznaciPrljavo(); this.tablicaSlojeva(); return true; }], ['Cancel', () => true]], 420);
  }
  dijalogIshod() {
    const op = [['gd', 'gornji desni kut crteža'], ['gl', 'gornji lijevi kut'], ['dd', 'donji desni kut'], ['dl', 'donji lijevi kut'], ['c', 'središte crteža']];
    const t = h('div', { cls: 'lc-radio' }, ...op.map(([k, n]) => h('label', {}, h('input', { type: 'radio', name: 'ishod', value: k, checked: this.ref === k }), ' ' + n)), h('p', { cls: 'lc-mali' }, 'S uključenim Immediate ova točka crteža dolazi točno ispod trenutnog položaja glave, a glava se nakon obrade vraća u nju.'));
    this.dijalog('Set the stop point of laser head', t, [['OK', () => { this.ref = t.querySelector('input:checked').value; this.oznaciPrljavo(); return true; }], ['Cancel', () => true]]);
  }
  dijalogSimBrzina() {
    const r = h('input', { type: 'range', min: '1', max: '200', value: this.simBrzina, 'aria-label': 'Brzina simulacije' }); const o = h('span', {}, '×' + this.simBrzina);
    r.addEventListener('input', () => o.textContent = '×' + r.value);
    this.dijalog('Set simulate speed', h('div', { cls: 'lc-red' }, 'Slow ', r, ' Fast ', o), [['OK', () => { this.simBrzina = +r.value; return true; }]], 340);
  }
  dijalogVrijeme() {
    if (this.prljavo || !this.posao) this.izracunaj(true); if (!this.posao) return;
    const st = this.posao.st;
    const red = (a, b) => h('tr', {}, h('th', { scope: 'row' }, a), h('td', {}, b));
    const tb = h('table', { cls: 'lc-tbl' }, h('tbody', {}, red('Estimated time', vrijeme(st.ukupno * this.times + this.delay * (this.times - 1))), red('Cut length', br(st.rez / 1000, 3) + ' m'), red('Idle (space) length', br(st.prazno / 1000, 3) + ' m'), red('Cut time', vrijeme(st.tRez)), red('Engrave time', vrijeme(st.tGrav)), red('Idle time', vrijeme(st.tPrazno)), red('Times × Delay', `${this.times} × ${this.delay} s`)));
    const ps = h('table', { cls: 'lc-tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'Layer'), h('th', {}, 'Mode'), h('th', {}, 'Length'), h('th', {}, 'Time'))), h('tbody', {}, ...st.poSloju.map(x => h('tr', {}, h('td', {}, h('i', { cls: 'lc-kv', style: `background:${aciHex(x.aci)}` }), ' ' + imeBoje(x.aci)), h('td', {}, x.mod), h('td', {}, br(x.rez / 1000, 3) + ' m'), h('td', {}, vrijeme(x.t))))));
    this.dijalog('Simulate operating time', h('div', {}, tb, h('p', { cls: 'lc-mali' }, 'Redoslijed obrade (od dna popisa slojeva prema vrhu):'), ps), [['OK', () => true]], 420);
  }
  dijalogDownload() {
    const k = this.o.kontroler;
    const lista = h('select', { size: '8', cls: 'lc-popis lc-dl', 'aria-label': 'Datoteke u kontroleru' });
    const osvj = () => { lista.innerHTML = ''; k.datoteke.forEach((d, i) => lista.append(h('option', { value: i }, `${String(i + 1).padStart(2, ' ')}   ${d.ime.padEnd(10, ' ')} ${d.velicina} KB`))); };
    osvj();
    const ime = h('input', { type: 'text', maxlength: '8', value: (this.ime.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'FILE1').toUpperCase(), 'aria-label': 'Naziv datoteke u kontroleru' });
    const veza = () => { if (!k.napon) { this.o.dnevnik('DownLoad: nema veze s kontrolerom — uključi stroj (ključ) i pričekaj da se PAD03 pokrene.', 'upoz'); return false; } return true; };
    const b = (t, fn) => { const x = h('button', { type: 'button', cls: 'lc-t' }, t); x.addEventListener('click', () => { fn(); osvj(); }); return x; };
    const t = h('div', {}, h('div', { cls: 'lc-dl-zag' }, h('span', {}, 'No.'), h('span', {}, 'Filename'), h('span', {}, 'Size')), lista,
      h('label', { cls: 'lc-f' }, h('span', {}, 'Naziv (do 8 znakova):'), ime),
      h('div', { cls: 'lc-dl-g' },
        b('Download Cfg', () => { if (veza()) this.o.dnevnik('Download Cfg: postavke stroja (Machine options) poslane u kontroler.'); }),
        b('Download current file', () => { if (!veza()) return; const d = this.datotekaZaKontroler(ime.value || 'FILE1'); if (d && k.preuzmi(d)) this.o.dnevnik(`DownLoad: ${d.ime} (${vrijeme(d.posao.st.ukupno)}) je u memoriji kontrolera. Na PAD03 odaberi FILE i pritisni Start/Pause.`); }),
        b('Download file', () => this.o.dnevnik('Download file: preuzimanje gotove .mol datoteke s diska — u simulatoru koristi „Download current file”.')),
        b('Del', () => { if (veza() && lista.value !== '') k.obrisi(+lista.value); }),
        b('Del all', () => { if (veza()) k.obrisiSve(); }),
        b('Export Cfg', () => this.o.dnevnik('Export Cfg: postavke u .mol datoteku za USB disk (u simulatoru se ne stvara).')),
        b('Export file', () => this.o.dnevnik('Export file: obrada u .mol datoteku za USB disk (rad bez računala; u simulatoru se ne stvara).'))));
    this.dijalog('Download', t, [], 470);
  }
  dijalogClip() {
    const [a, v] = this.polje('Speed:', '25.0'), [b, p] = this.polje('Power:', '40.0'), [c, bl] = this.polje('Blank:', '2.00');
    this.dijalog('Cut Frame Options', h('div', {}, a, b, c), [['Cut', () => { this.o.clipBox(this.okvirIzlaza(), +v.value || 25, +p.value || 40, +bl.value || 0, this.immediate, this.refTocka()); return true; }], ['Save', () => true]], 300);
  }
  dijalogStroj() {
    const wt = { ...this.o.wt() }, s = this.o.stroj();
    const stranice = {
      'Motion-Card': () => h('div', { cls: 'lc-2s' }, ...[['Controller card type', 'MPC6565'], ['Machine number', '1'], ['Laser mode', 'PWM'], ['Laser maximum power', '100 %'], ['Laser tube', s.cijev + ' (iz specifikacije)']].map(([a, b]) => h('label', { cls: 'lc-f' }, h('span', {}, a), h('input', { type: 'text', value: b, disabled: true })))),
      'Worktable': () => {
        const f = (oz, k, at = {}) => { const [l, i] = this.polje(oz, wt[k], at); i.addEventListener('change', () => wt[k] = +i.value); return l; };
        const pu = os => { const i = h('input', { type: 'text', value: (wt[os + 'Move'] / wt[os + 'Puls']).toFixed(10), disabled: true }); const b = h('button', { type: 'button', cls: 'lc-t', title: 'Pulse unit calculation' }, '...'); b.addEventListener('click', () => this.dijalogPuls(wt, os, i)); return h('label', { cls: 'lc-f lc-pu' }, h('span', {}, '[Pulse Unit]'), i, b); };
        const dir = os => h('label', { cls: 'lc-f' }, h('span', {}, '[Datum Direction]'), h('select', { disabled: true }, h('option', {}, wt[os + 'Datum'])));
        const ad = h('input', { type: 'checkbox', checked: wt.autoDatum }); ad.addEventListener('change', () => wt.autoDatum = ad.checked);
        return h('div', {}, h('div', { cls: 'lc-osi' }, h('fieldset', {}, h('legend', {}, 'X Axis'), pu('x'), f('[Range]', 'xRange'), dir('x')), h('fieldset', {}, h('legend', {}, 'Y Axis'), pu('y'), f('[Range]', 'yRange'), dir('y'))),
          h('label', {}, ad, ' Auto Datum'),
          h('div', { cls: 'lc-2s' }, f('Start speed', 'startSpeed'), f('Datum speed', 'datumSpeed'), f('Quick speed', 'quickSpeed'), f('Const speed', 'constSpeed'), f('work-Acc', 'workAcc'), f('Test speed (fast)', 'testFast'), f('space-Acc', 'spaceAcc'), f('Test speed (slow)', 'testSlow'), f('Lasers space length', 'laserSpace'), f('X-MaxChangeSpeed', 'xJump'), h('span'), f('Y-MaxChangeSpeed', 'yJump')));
      },
      'Feeding': () => {
        if (!s.zOs) return h('p', {}, 'LG500DM nema motornu os Z (u specifikaciji stroja nije navedena) — fokus se podešava ručno. Ova stranica vrijedi za LC1390N (stol s podizanjem).');
        const f = (oz, k) => { const [l, i] = this.polje(oz, wt[k]); i.addEventListener('change', () => wt[k] = +i.value); return l; };
        return h('div', {}, h('div', { cls: 'lc-2s' }, f('[Range] *', 'zRange'), f('Datum speed *', 'zDatumSpeed'), f('Start speed *', 'zStart'), f('Acceleration *', 'zAcc'), f('Test speed (fast) *', 'zTestFast'), f('Test speed (slow) *', 'zTestSlow')), h('p', { cls: 'lc-mali' }, '* Raspon 180 mm iz specifikacije (stol s podizanjem 18 cm); ostale vrijednosti su procjena, nisu s tvog stroja.'));
      },
      'Cut': () => h('div', { cls: 'lc-2s' }, ...[['PWM frequency (Hz) *', '20000'], ['Curve disperse *', '0.1'], ['Min close-gas time *', '0'], ['Corner acc *', String(wt.workAcc * 2)], ['Gap on xy axis', '0'], ['Overlap length', '0']].map(([a, b]) => h('label', { cls: 'lc-f' }, h('span', {}, a), h('input', { type: 'text', value: b, disabled: true }))), h('label', {}, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Optimize: Inner-to-outer'), h('label', {}, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Automation set cut direction'), h('p', { cls: 'lc-mali' }, '* procjena. U simulatoru: unutarnji obrisi u sloju režu se prije vanjskih, a sljedeći je najbliži.')),
      'Engrave': () => { const f = (oz, k) => { const [l, i] = this.polje(oz, wt[k]); i.addEventListener('change', () => wt[k] = +i.value); return l; }; return h('div', {}, h('div', { cls: 'lc-2s' }, f('X acc *', 'gravAcc'), f('X start speed *', 'gravStart')), h('p', { cls: 'lc-mali' }, '* procjena — ubrzanje kod graviranja određuje duljinu preleta izvan crteža (v² / 2a).')); },
      'GradeEngrave': () => h('p', {}, 'Isto kao Engrave (upute, 6.7).'),
      'Hole': () => h('p', {}, 'PWM frekvencija za bušenje (upute, 6.8).')
    };
    const desno = h('div', { cls: 'lc-ms-d' });
    const stablo = h('div', { cls: 'lc-stablo', role: 'tree' });
    const otvori = k => { desno.innerHTML = ''; desno.append(stranice[k]()); stablo.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.k === k)); };
    const gr = (n, dj) => h('div', {}, h('div', { cls: 'lc-st-n' }, '⊟ ' + n), ...dj.map(k => { const b = h('button', { type: 'button', 'data-k': k, role: 'treeitem' }, k); b.addEventListener('click', () => otvori(k)); return b; }));
    stablo.append(gr('Machine options', ['Motion-Card', 'Worktable', 'Feeding']), gr('Work mode', ['Cut', 'Engrave', 'GradeEngrave', 'Hole']));
    this.dijalog('Machine Options', h('div', { cls: 'lc-ms' }, stablo, desno), [['Save', () => { this.o.setWt(wt); this.oznaciPrljavo(); this.naslov(); this.nacrtaj(); this.o.dnevnik('Machine Options: postavke spremljene. Ne zaboravi Download Cfg u kontroler.'); return true; }], ['Close', () => true]], 720);
    otvori('Worktable');
  }
  dijalogPuls(wt, os, izlaz) {
    const stari = this.dlg.firstChild; // ugniježđeni dijalog: privremeno sakrij
    const p = h('div', { cls: 'lc-dlg lc-dlg2', role: 'dialog', 'aria-label': 'Pulse unit calculation' });
    const [l1, mv] = this.polje('Move:', wt[os + 'Move'].toFixed(6)), [l2, np] = this.polje('Need pulse:', wt[os + 'Puls']);
    const ok = h('button', { type: 'button', cls: 'lc-t' }, 'OK');
    ok.addEventListener('click', () => { wt[os + 'Move'] = +mv.value || wt[os + 'Move']; wt[os + 'Puls'] = Math.max(1, np.value | 0); izlaz.value = (wt[os + 'Move'] / wt[os + 'Puls']).toFixed(10); p.remove(); });
    p.append(h('div', { cls: 'lc-dlg-n' }, h('span', {}, 'Pulse unit calcul...')), h('div', { cls: 'lc-dlg-t' }, l1, l2, h('p', { cls: 'lc-mali' }, 'Move = put (mm) za jedan okretaj motora; Need pulse = impulsa po okretaju. Tvoj zapis za os Y: Move 45.501 (translacija) ↔ 80 (rotacijski dodatak).')), h('div', { cls: 'lc-dlg-g' }, ok));
    stari.append(p); mv.focus();
  }
}
