// plc.js — emulirani PLC stanice (ciklus skeniranja 10 ms u pregledniku), ladder dijagram kao SVG s živim
// stanjima, forsiranje signala za vježbe i panel PLC-a s izborom profila (M262, M241, S7-1200, generički).
// Logika je zapisana JEDNOM kao popis grana (rungova); iz istog popisa se i izvodi i crta.
// Ovaj modul je sloj koji se kasnije zamjenjuje stvarnim PLC-om: vidi signali.js (SucjeljePLC).
import { SIGNALI, PROFILI, adresa, postaviSucelje } from './signali.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// interni bitovi, brojači i vremenski članovi (memorija PLC-a); adrese po profilu
const MEMORIJA = [
  { id: 'M_Ciklus',   schneider: '%MX1.0', siemens: 'M1.0', generic: 'M0', opis: 'Ciklus pokrenut (samodržanje Start/Stop).' },
  { id: 'M_Alarm',    schneider: '%MX1.1', siemens: 'M1.1', generic: 'M1', opis: 'Alarm stanice (predmet nije stigao u 30 s).' },
  { id: 'C_Komadi',   schneider: 'CTU_1',  siemens: 'IEC_Counter_0', generic: 'C0', opis: 'Brojač uzetih predmeta.' },
  { id: 'T_Traka',    schneider: 'TON_1',  siemens: 'IEC_Timer_0',   generic: 'T0', opis: 'Nadzor: traka radi, a predmet ne stiže (30 s).' },
  { id: 'P_Brzina',   schneider: '%MW10',  siemens: 'MW10',  generic: 'MW10', opis: 'Zadana brzina trake u % (iz postava stanice).' },
];

// Grane (rungovi): niz elemenata u seriji; 'par' = paralelne grane; zavojnice na kraju.
// k = kontakt (nc = normalno zatvoren, p = rastući brid), z = zavojnica (set/reset), ton = vremenski član,
// ctu = brojač, move = prijenos vrijednosti.
const GRANE = [
  { ime: 'Ciklus: Start / Stop (samodržanje)', el: [{ t: 'par', g: [[{ t: 'k', id: 'I_HmiStart' }], [{ t: 'k', id: 'M_Ciklus' }]] }, { t: 'k', id: 'I_HmiStop', nc: true }, { t: 'k', id: 'M_Alarm', nc: true }, { t: 'z', id: 'M_Ciklus' }] },
  { ime: 'Traka: radi dok fotoćelija ne vidi predmet', el: [{ t: 'k', id: 'M_Ciklus' }, { t: 'k', id: 'I_Fotocelija', nc: true }, { t: 'z', id: 'Q_TrakaNaprijed' }] },
  { ime: 'Referenca brzine na ATV320', el: [{ t: 'k', id: 'M_Ciklus' }, { t: 'move', od: 'P_Brzina', id: 'Q_TrakaBrzina' }] },
  { ime: 'Predmet spreman za robota (traka stoji)', el: [{ t: 'k', id: 'M_Ciklus' }, { t: 'k', id: 'I_Fotocelija' }, { t: 'k', id: 'Q_TrakaNaprijed', nc: true }, { t: 'z', id: 'Q_PredmetSpreman' }] },
  { ime: 'Brojač uzetih predmeta', el: [{ t: 'k', id: 'I_RobotUzeo', p: true }, { t: 'ctu', id: 'C_Komadi', reset: 'I_HmiReset' }] },
  { ime: 'Okretni stol: zahtjev robota → naredba servo pogonu', el: [{ t: 'k', id: 'I_RobotStolIndeks', p: true }, { t: 'k', id: 'I_StolUPoz' }, { t: 'z', id: 'Q_StolIndeks', set: true }] },
  { ime: 'Okretni stol: naredba se briše kad stol krene', el: [{ t: 'k', id: 'I_StolUPoz', nc: true }, { t: 'z', id: 'Q_StolIndeks', reset: true }] },
  { ime: 'Stol u poziciji → robot', el: [{ t: 'k', id: 'I_StolUPoz' }, { t: 'k', id: 'Q_StolIndeks', nc: true }, { t: 'z', id: 'Q_StolUPoz' }] },
  { ime: 'Ciklus → robot i zelena lampa', el: [{ t: 'k', id: 'M_Ciklus' }, { t: 'par', g: [[{ t: 'z', id: 'Q_CiklusAktivan' }], [{ t: 'z', id: 'Q_LampaZelena' }]] }] },
  { ime: 'Nadzor: traka radi 30 s bez predmeta → alarm', el: [{ t: 'k', id: 'M_Ciklus' }, { t: 'k', id: 'Q_TrakaNaprijed' }, { t: 'ton', id: 'T_Traka', pt: 30 }, { t: 'z', id: 'M_Alarm', set: true }] },
  { ime: 'Reset s HMI-ja briše alarm', el: [{ t: 'k', id: 'I_HmiReset' }, { t: 'z', id: 'M_Alarm', reset: true }] },
  { ime: 'Crvena lampa', el: [{ t: 'k', id: 'M_Alarm' }, { t: 'z', id: 'Q_LampaCrvena' }] },
];

export class PLC {
  constructor(opc = {}) {
    this.profil = opc.profil || 'm262';
    this.v = {};                       // slika procesa: id -> vrijednost
    for (const s of SIGNALI) this.v[s.id] = 0;
    for (const m of MEMORIJA) this.v[m.id] = 0;
    this.v.P_Brzina = 100;
    this.force = {};                   // id -> prisilna vrijednost
    this.stanjeEl = new Map();         // stanje bridova, timera, brojača
    this.tok = {};                     // tok energije po elementu za crtanje: kljuc -> bool
    this.zavojnice = {};               // zadnje stanje zavojnica po ključu
    this.ciklusa = 0; this.radi = true; this.scanMs = 10;
    this.naIzlaz = opc.naIzlaz || (() => {});   // (id, v) kad se promijeni izlaz Q
    this.dogadjaji = [];               // zapisnik za HMI alarm listu
    this.zadnjiIzlazi = {};
    this.timer = setInterval(() => this.skeniraj(), this.scanMs);
    postaviSucelje(this.sucelje());
  }
  // ---- sučelje (signali.js) ----
  sucelje() {
    return {
      citaj: (id) => this.citaj(id),
      pisi: (id, v) => this.pisi(id, v),
      forsiraj: (id, v) => this.forsiraj(id, v),
      opis: () => 'Emulirani PLC u pregledniku (' + PROFILI[this.profil].ime + '), ciklus ' + this.scanMs + ' ms.',
    };
  }
  citaj(id) { return id in this.force ? this.force[id] : (this.v[id] || 0); }
  // ulaz se upisuje u sliku procesa; na promjenu odmah slijedi jedan ciklus skeniranja, jer je stvarni PLC (10 ms)
  // brži od okvira simulacije (i do 100 ms) — tako se ne gube kratki impulsi robota (PulseDO) ni brid fotoćelije
  pisi(id, v) { const n = typeof v === 'number' ? v : (v ? 1 : 0); const promjena = this.v[id] !== n; this.v[id] = n; if (promjena && !this.uSkenu) this.skeniraj(); }
  impuls(id, ms = 150) { this.pisi(id, 1); setTimeout(() => this.pisi(id, 0), ms); }
  forsiraj(id, v) { if (v === null || v === undefined) delete this.force[id]; else this.force[id] = v ? 1 : 0; }
  parametar(id, v) { this.v[id] = v; }
  postaviProfil(p) { if (PROFILI[p]) this.profil = p; }

  // ---- jedan ciklus skeniranja ----
  skeniraj() {
    if (!this.radi || this.uSkenu) return;
    this.uSkenu = true;
    this.ciklusa++;
    const dt = this.scanMs / 1000;
    GRANE.forEach((g, gi) => { this.serija(g.el, gi + '', true, dt); });
    // promjene izlaza prema van (robot DI, stanica)
    for (const s of SIGNALI) {
      if (s.smjer === 'I') continue;
      const v = this.citaj(s.id);
      if (this.zadnjiIzlazi[s.id] !== v) { this.zadnjiIzlazi[s.id] = v; this.naIzlaz(s.id, v); }
    }
    this.uSkenu = false;
  }
  // izvodi niz elemenata; vraća tok na izlazu; bilježi tok po elementu za crtanje
  serija(el, kljuc, tok, dt) {
    this.tok[kljuc + 'ul'] = tok;
    el.forEach((e, i) => {
      const k = kljuc + '.' + i;
      if (e.t === 'par') {
        let izlaz = false;
        e.g.forEach((grana, gi) => { if (this.serija(grana, k + '.' + gi, tok, dt)) izlaz = true; });
        tok = izlaz;
      } else if (e.t === 'k') {
        let v = !!this.citaj(e.id);
        if (e.p) { const st = this.stanjeEl.get(k) || { bio: false }; const brid = v && !st.bio; st.bio = v; this.stanjeEl.set(k, st); v = brid; }
        if (e.nc) v = !v;
        this.tok[k + 'k'] = v;
        tok = tok && v;
      } else if (e.t === 'ton') {
        const st = this.stanjeEl.get(k) || { t: 0 };
        st.t = tok ? Math.min(e.pt, st.t + dt) : 0; this.stanjeEl.set(k, st);
        this.v[e.id] = +st.t.toFixed(2);
        tok = tok && st.t >= e.pt;
      } else if (e.t === 'ctu') {
        const st = this.stanjeEl.get(k) || { bio: false };
        if (tok && !st.bio) this.v[e.id] = (this.v[e.id] || 0) + 1;
        st.bio = tok; this.stanjeEl.set(k, st);
        if (e.reset && this.citaj(e.reset)) this.v[e.id] = 0;
      } else if (e.t === 'move') {
        if (tok) this.v[e.id] = this.v[e.od]; else this.v[e.id] = 0;
      } else if (e.t === 'z') {
        if (e.set) { if (tok) this.v[e.id] = 1; }
        else if (e.reset) { if (tok) this.v[e.id] = 0; }
        else this.v[e.id] = tok ? 1 : 0;
        if (e.id in this.force) this.v[e.id] = this.force[e.id];
        this.zavojnice[k] = !!this.citaj(e.id);
      }
      this.tok[k] = tok;
    });
    return tok;
  }
  stanje() {
    const o = { profil: this.profil, ciklusa: this.ciklusa, force: Object.assign({}, this.force), signali: {} };
    for (const s of SIGNALI) o.signali[s.id] = this.citaj(s.id);
    for (const m of MEMORIJA) o.signali[m.id] = this.v[m.id];
    return o;
  }
  zaustavi() { clearInterval(this.timer); }
}

// ---------------------------------------------------------------------------------
// Crtanje ladder dijagrama (SVG). Izgled ovisi o profilu: Machine Expert (Schneider),
// TIA Portal LAD (Siemens) ili IEC generički. Boje preko CSS varijabli u index.html.
// ---------------------------------------------------------------------------------
const OPIS_ID = {}; for (const s of SIGNALI) OPIS_ID[s.id] = s; for (const m of MEMORIJA) OPIS_ID[m.id] = m;
function adr(id, profil) { const s = OPIS_ID[id]; return s ? adresa(s, profil) : ''; }
const SIR = 106, VIS = 66;   // ćelija elementa

function sirinaEl(e) { if (e.t === 'par') return Math.max(...e.g.map(g => g.reduce((a, x) => a + sirinaEl(x), 0))); return 1; }
function visinaEl(e) { if (e.t === 'par') return e.g.reduce((a, g) => a + Math.max(...g.map(visinaEl)), 0); return 1; }

function crtajSeriju(el, kljuc, x0, y0, plc, out, stil) {
  let x = x0;
  el.forEach((e, i) => {
    const k = kljuc + '.' + i;
    const tok = plc.tok[k];
    if (e.t === 'par') {
      const w = sirinaEl(e) * SIR;
      let y = y0;
      const ulaz = i ? plc.tok[kljuc + '.' + (i - 1)] : plc.tok[kljuc + 'ul'];
      const vrhovi = [];
      e.g.forEach((grana, gi) => {
        const h = Math.max(...grana.map(visinaEl)) * VIS;
        const kraj = crtajSeriju(grana, k + '.' + gi, x + 14, y, plc, out, stil);
        const tokGrane = plc.tok[k + '.' + gi + '.' + (grana.length - 1)];
        out.push(linija(x, y + VIS / 2, x + 14, y + VIS / 2, ulaz, stil));
        out.push(linija(kraj, y + VIS / 2, x + w + 28, y + VIS / 2, tokGrane, stil));
        vrhovi.push(y + VIS / 2);
        y += h;
      });
      // okomite spojnice
      out.push(linija(x, vrhovi[0], x, vrhovi[vrhovi.length - 1], ulaz, stil));
      out.push(linija(x + w + 28, vrhovi[0], x + w + 28, vrhovi[vrhovi.length - 1], tok, stil));
      x += w + 28;
      return;
    }
    const cx = x + SIR / 2, cy = y0 + VIS / 2;
    const ulaz = i ? plc.tok[kljuc + '.' + (i - 1)] : plc.tok[kljuc + 'ul'];
    out.push(linija(x, cy, cx - 16, cy, ulaz, stil));
    out.push(linija(cx + 16, cy, x + SIR, cy, tok, stil));
    const ime = e.id, a = adr(ime, plc.profil);
    const vrij = plc.citaj(ime);
    const kl = 'el' + (tok ? ' tok' : '');
    if (e.t === 'k') {
      const zatv = plc.tok[k + 'k'];
      out.push('<g class="' + kl + (zatv ? ' zatv' : '') + '"><text class="ime" x="' + cx + '" y="' + (cy - 20) + '" text-anchor="middle">' + esc(ime) + '</text>' +
        '<path d="M' + (cx - 16) + ' ' + (cy - 11) + 'v22M' + (cx + 16) + ' ' + (cy - 11) + 'v22"/>' +
        (e.nc ? '<path d="M' + (cx + 8) + ' ' + (cy - 11) + 'L' + (cx - 8) + ' ' + (cy + 11) + '"/>' : '') +
        (e.p ? '<text class="p" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">P</text>' : '') +
        '<text class="adr" x="' + cx + '" y="' + (cy + 24) + '" text-anchor="middle">' + esc(a) + (vrij && !e.p ? ' = 1' : '') + '</text></g>');
    } else if (e.t === 'z') {
      const z = plc.zavojnice[k];
      out.push('<g class="' + kl + (z ? ' zatv' : '') + '"><text class="ime" x="' + cx + '" y="' + (cy - 20) + '" text-anchor="middle">' + esc(ime) + '</text>' +
        '<path d="M' + (cx - 10) + ' ' + (cy - 12) + 'a16 16 0 0 0 0 24M' + (cx + 10) + ' ' + (cy - 12) + 'a16 16 0 0 1 0 24"/>' +
        (e.set ? '<text class="p" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">S</text>' : e.reset ? '<text class="p" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">R</text>' : '') +
        '<text class="adr" x="' + cx + '" y="' + (cy + 24) + '" text-anchor="middle">' + esc(a) + ' = ' + vrij + '</text></g>');
    } else {
      const naslov = e.t === 'ton' ? 'TON' : e.t === 'ctu' ? 'CTU' : 'MOVE';
      const red2 = e.t === 'ton' ? 'PT ' + e.pt + ' s · ET ' + (plc.v[e.id] || 0).toFixed(1) : e.t === 'ctu' ? 'CV = ' + (plc.v[e.id] || 0) : plc.v[e.od] + ' → ' + adr(e.id, plc.profil);
      out.push('<g class="' + kl + ' box"><rect x="' + (cx - 34) + '" y="' + (cy - 22) + '" width="68" height="44" rx="2"/>' +
        '<text class="ime" x="' + cx + '" y="' + (cy - 26) + '" text-anchor="middle">' + esc(ime) + '</text>' +
        '<text class="bx" x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle">' + naslov + '</text>' +
        '<text class="adr" x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle">' + esc(red2) + '</text></g>');
    }
    x += SIR;
  });
  return x;
}
function linija(x1, y1, x2, y2, tok, stil) { return '<path class="veza' + (tok ? ' tok' : '') + '" d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '"/>'; }

export function ladderSVG(plc, samo) {
  const stil = PROFILI[plc.profil].stil;
  const grane = samo ? GRANE.filter((g, i) => samo.includes(i)) : GRANE;
  const W = 24 + Math.max(...grane.map(g => g.el.reduce((a, e) => a + sirinaEl(e), 0))) * SIR + 60;
  const out = []; let y = 10;
  grane.forEach((g, gi) => {
    const i = GRANE.indexOf(g);
    const h = Math.max(...g.el.map(visinaEl)) * VIS + 18;
    out.push('<text class="naslov" x="24" y="' + (y + 10) + '">' + (stil === 'siemens' ? 'Network ' + (i + 1) + ': ' : stil === 'schneider' ? 'Rung ' + (i + 1) + ' — ' : (i + 1) + '. ') + esc(g.ime) + '</text>');
    const kraj = crtajSeriju(g.el, i + '', 24, y + 18, plc, out, stil);
    out.push(linija(kraj, y + 18 + VIS / 2, W - 24, y + 18 + VIS / 2, plc.tok[i + '.' + (g.el.length - 1)], stil));
    y += h + 10;
  });
  const sine = '<path class="sina" d="M24 6V' + (y - 4) + '"/><path class="sina" d="M' + (W - 24) + ' 6V' + (y - 4) + '"/>';
  return '<svg class="ladder ' + stil + '" viewBox="0 0 ' + W + ' ' + y + '" width="' + W + '" height="' + y + '" role="img" aria-label="Ladder dijagram PLC-a s trenutnim stanjima">' + sine + out.join('') + '</svg>';
}

// ---------------------------------------------------------------------------------
// Panel PLC-a: profil, zaglavlje, ladder, tablica I/O s forsiranjem
// ---------------------------------------------------------------------------------
export function plcPanel(plc, el, opc = {}) {
  const $ = (s) => el.querySelector(s);
  const sel = $('#plc-profil');
  sel.innerHTML = Object.entries(PROFILI).map(([k, p]) => '<option value="' + k + '"' + (k === plc.profil ? ' selected' : '') + '>' + esc(p.ime) + '</option>').join('');
  sel.addEventListener('change', () => { plc.postaviProfil(sel.value); opc.naProfil && opc.naProfil(sel.value); crtaj(true); });
  let zadnji = '';
  function glava() {
    const p = PROFILI[plc.profil];
    $('#plc-glava').innerHTML = '<b>' + esc(p.ime) + '</b> · ' + esc(p.model) + ' · ' + esc(p.alat) + '<br><span class="pom">' + esc(p.napomena) + '</span>';
  }
  // tablica I/O: gradi se jednom (i pri promjeni profila), vrijednosti se osvježavaju na mjestu (gumbi ostaju isti elementi)
  function gradiTablicu() {
    const red = (s, mem) => '<tr data-r="' + esc(s.id) + '"><td><code>' + esc(s.id) + '</code></td><td>' + esc(adresa(s, plc.profil)) + '</td><td class="v" data-v="' + esc(s.id) + '"></td>' +
      '<td>' + (s.robot ? '<code>' + esc(s.robot) + '</code>' : (s.izvor || s.cilj || '—')) + '</td>' +
      '<td class="f">' + (mem || s.smjer === 'QW' ? '' : '<button type="button" data-f="' + s.id + ':1">1</button><button type="button" data-f="' + s.id + ':0">0</button><button type="button" data-f="' + s.id + ':-" title="Bez forsiranja">—</button>') + '</td></tr>';
    $('#plc-io').innerHTML = '<table><thead><tr><th>Signal</th><th>Adresa</th><th>Stanje</th><th>Robot / oprema</th><th>Forsiraj</th></tr></thead><tbody>' +
      '<tr class="grupa"><td colspan="5">Ulazi (I)</td></tr>' + SIGNALI.filter(s => s.smjer === 'I').map(s => red(s)).join('') +
      '<tr class="grupa"><td colspan="5">Izlazi (Q)</td></tr>' + SIGNALI.filter(s => s.smjer !== 'I').map(s => red(s)).join('') +
      '<tr class="grupa"><td colspan="5">Memorija (M, C, T)</td></tr>' + MEMORIJA.map(m => red(m, true)).join('') + '</tbody></table>';
    osvjeziTablicu();
  }
  function osvjeziTablicu() {
    const svi = SIGNALI.map(s => [s, false]).concat(MEMORIJA.map(m => [m, true]));
    for (const [s, mem] of svi) {
      const v = mem ? plc.v[s.id] : plc.citaj(s.id), f = s.id in plc.force;
      const c = $('[data-v="' + s.id + '"]'); if (!c) continue;
      const h = (s.smjer === 'QW' || (mem && /^(C|T|P)_/.test(s.id))) ? String(v) : (v ? '<b class="jedan">1</b>' : '0');
      if (c.innerHTML !== h) c.innerHTML = h;
      const r = c.parentElement; if (r.classList.contains('forsiran') !== f) r.classList.toggle('forsiran', f);
      r.querySelectorAll('[data-f]').forEach(b => { const k = b.dataset.f.split(':')[1]; const akt = k === '-' ? !f : (f && plc.force[s.id] === +k); const a = akt ? 'true' : 'false'; if (b.getAttribute('aria-pressed') !== a) b.setAttribute('aria-pressed', a); });
    }
  }
  function crtaj(sila) {
    if (!opc.vidljiv || opc.vidljiv()) {
      const svg = ladderSVG(plc);
      if (svg !== zadnji || sila) { $('#plc-ladder').innerHTML = svg; zadnji = svg; }
      const st = $('#plc-stanje'); if (st) st.textContent = 'RUN · ciklus ' + plc.scanMs + ' ms · skeniranja: ' + plc.ciklusa + (Object.keys(plc.force).length ? ' · FORSIRANO: ' + Object.keys(plc.force).join(', ') : '');
      osvjeziTablicu();
    }
    if (sila) { glava(); gradiTablicu(); }
  }
  $('#plc-io').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-f]'); if (!b) return;
    const [id, v] = b.dataset.f.split(':');
    plc.forsiraj(id, v === '-' ? null : +v);
    opc.naForce && opc.naForce(id, v);
    crtaj(true);
  });
  crtaj(true);
  setInterval(() => crtaj(false), 120);
  return { crtaj, GRANE, MEMORIJA };
}
export { GRANE, MEMORIJA };
