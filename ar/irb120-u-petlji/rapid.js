// rapid.js — podskup jezika ABB RAPID za simulator „Industrijski robot ABB IRB 120 u petlji“
// Leksički analizator, parser modula, provjera imena (kao kontroler IRC5 / RobotWare 6)
// i izvođenje rutina generatorima (svaka naredba = jedan korak; gibanja traži kontroler).
// Bez DOM-a i bez three.js — radi i u Node.js (za testove).

// ---------------------------------------------------------------- greške
export class RapidGreska extends Error {
  constructor(broj, naslov, opis, extra = {}) {
    super(naslov);
    this.broj = broj; this.naslov = naslov; this.opis = opis; Object.assign(this, extra);
  }
}

// ---------------------------------------------------------------- tipovi podataka (zapisi)
// Svako polje: [ime, tip]. Vrijednost zapisa u simulatoru je obični JS niz.
const N = 'num', B = 'bool', S = 'string';
export const ZAPISI = {
  pos: [['x', N], ['y', N], ['z', N]],
  orient: [['q1', N], ['q2', N], ['q3', N], ['q4', N]],
  confdata: [['cf1', N], ['cf4', N], ['cf6', N], ['cfx', N]],
  extjoint: [['eax_a', N], ['eax_b', N], ['eax_c', N], ['eax_d', N], ['eax_e', N], ['eax_f', N]],
  robjoint: [['rax_1', N], ['rax_2', N], ['rax_3', N], ['rax_4', N], ['rax_5', N], ['rax_6', N]],
  pose: [['trans', 'pos'], ['rot', 'orient']],
  robtarget: [['trans', 'pos'], ['rot', 'orient'], ['robconf', 'confdata'], ['extax', 'extjoint']],
  jointtarget: [['robax', 'robjoint'], ['extax', 'extjoint']],
  loaddata: [['mass', N], ['cog', 'pos'], ['aom', 'orient'], ['ix', N], ['iy', N], ['iz', N]],
  tooldata: [['robhold', B], ['tframe', 'pose'], ['tload', 'loaddata']],
  wobjdata: [['robhold', B], ['ufprog', B], ['ufmec', S], ['uframe', 'pose'], ['oframe', 'pose']],
  speeddata: [['v_tcp', N], ['v_ori', N], ['v_leax', N], ['v_reax', N]],
  zonedata: [['finep', B], ['pzone_tcp', N], ['pzone_ori', N], ['pzone_eax', N], ['zone_ori', N], ['zone_leax', N], ['zone_reax', N]],
};
const E9 = 9e9;
export function zadano(tip) {                 // početna vrijednost tipa (VAR bez inicijalizacije)
  if (tip === N || tip === 'dnum') return 0;
  if (tip === B) return false;
  if (tip === S) return '';
  if (tip === 'orient') return [1, 0, 0, 0];
  if (tip === 'extjoint') return [E9, E9, E9, E9, E9, E9];
  const z = ZAPISI[tip];
  if (!z) return null;                         // npr. clock, signaldo — u simulatoru bez vrijednosti
  return z.map(([, t]) => zadano(t));
}

// ---------------------------------------------------------------- unaprijed definirani podaci
const BRZINE = [5, 10, 20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000];
const ZONE = [0, 1, 5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 150, 200];
export const UGRADJENO = new Map();
BRZINE.forEach(v => UGRADJENO.set('v' + v, { ime: 'v' + v, tip: 'speeddata', vrsta: 'CONST', vrijednost: [v, 500, 5000, 1000], ugradjeno: true }));
UGRADJENO.set('vmax', { ime: 'vmax', tip: 'speeddata', vrsta: 'CONST', vrijednost: [7000, 500, 5000, 1000], ugradjeno: true });
UGRADJENO.set('fine', { ime: 'fine', tip: 'zonedata', vrsta: 'CONST', vrijednost: [true, 0, 0, 0, 0, 0, 0], ugradjeno: true });
ZONE.forEach(z => UGRADJENO.set('z' + z, { ime: 'z' + z, tip: 'zonedata', vrsta: 'CONST', vrijednost: [false, z, z * 1.5, z * 1.5, z * 0.15, z * 1.5, z * 0.15], ugradjeno: true }));
UGRADJENO.set('pi', { ime: 'pi', tip: N, vrsta: 'CONST', vrijednost: Math.PI, ugradjeno: true });

// ---------------------------------------------------------------- leksički analizator
const KLJUCNE = new Set(['MODULE', 'ENDMODULE', 'PROC', 'ENDPROC', 'FUNC', 'ENDFUNC', 'TRAP', 'ENDTRAP', 'CONST', 'PERS', 'VAR', 'LOCAL', 'TASK',
  'IF', 'THEN', 'ELSEIF', 'ELSE', 'ENDIF', 'WHILE', 'DO', 'ENDWHILE', 'FOR', 'FROM', 'TO', 'STEP', 'ENDFOR', 'TEST', 'CASE', 'DEFAULT', 'ENDTEST',
  'RETURN', 'EXIT', 'AND', 'OR', 'XOR', 'NOT', 'DIV', 'MOD', 'TRUE', 'FALSE', 'GOTO', 'RETRY', 'TRYNEXT', 'ERROR', 'BACKWARD', 'UNDO', 'RAISE']);
export function tokeni(tekst) {
  const T = []; let i = 0, l = 1; const n = tekst.length;
  while (i < n) {
    const c = tekst[i];
    if (c === '\n') { l++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '!') { while (i < n && tekst[i] !== '\n') i++; continue; }          // komentar do kraja retka
    if (/[A-Za-z]/.test(c)) {
      let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(tekst[j])) j++;
      const v = tekst.slice(i, j), V = v.toUpperCase();
      T.push(KLJUCNE.has(V) ? { t: 'kw', v: V, l } : { t: 'id', v, l }); i = j; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(tekst[i + 1] || ''))) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(tekst.slice(i));
      T.push({ t: 'br', v: parseFloat(m[0]), l }); i += m[0].length; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < n) { if (tekst[j] === '"') { if (tekst[j + 1] === '"') { s += '"'; j += 2; continue; } break; } if (tekst[j] === '\n') break; s += tekst[j]; j++; }
      T.push({ t: 'str', v: s, l }); i = j + 1; continue;
    }
    const dva = tekst.substr(i, 2);
    if ([':=', '<=', '>=', '<>'].includes(dva)) { T.push({ t: 'op', v: dva, l }); i += 2; continue; }
    if ('+-*/<>=()[]{},;.\\:'.includes(c)) { T.push({ t: 'op', v: c, l }); i++; continue; }
    throw new RapidGreska(40001, 'Syntax error', 'Unexpected character ' + JSON.stringify(c) + '.', { linija: l });
  }
  T.push({ t: 'kraj', v: '', l });
  return T;
}

// ---------------------------------------------------------------- parser
class Parser {
  constructor(tekst) { this.T = tokeni(tekst); this.i = 0; }
  get g() { return this.T[this.i]; }
  sljedeci(k = 1) { return this.T[this.i + k]; }
  greska(poruka, tok) { const t = tok || this.g; throw new RapidGreska(40001, 'Syntax error', poruka, { linija: t.l }); }
  je(t, v) { const x = this.g; return x.t === t && (v === undefined || x.v === v); }
  jeKw(v) { return this.g.t === 'kw' && this.g.v === v; }
  jeOp(v) { return this.g.t === 'op' && this.g.v === v; }
  uzmi(t, v) {
    const x = this.g;
    if (x.t !== t || (v !== undefined && x.v !== v)) this.greska('Expected ' + (v || t) + ' but found ' + (x.v === '' ? 'end of file' : JSON.stringify(String(x.v))) + '.');
    this.i++; return x;
  }
  ident() { if (this.g.t !== 'id') this.greska('Expected identifier.'); return this.T[this.i++]; }

  modul() {
    this.uzmi('kw', 'MODULE');
    const ime = this.ident();
    const atributi = [];
    if (this.jeOp('(')) { this.i++; while (!this.jeOp(')')) { if (this.g.t === 'id') atributi.push(this.g.v.toUpperCase()); this.i++; if (this.g.t === 'kraj') this.greska('Missing ).'); } this.i++; }
    const M = { ime: ime.v, linija: ime.l, atributi, deklaracije: [], rutine: [] };
    while (!this.jeKw('ENDMODULE')) {
      if (this.g.t === 'kraj') this.greska('Missing ENDMODULE.');
      let lokalno = false;
      if (this.jeKw('LOCAL')) { lokalno = true; this.i++; }
      if (this.jeKw('TASK')) this.i++;
      if (this.jeKw('CONST') || this.jeKw('PERS') || this.jeKw('VAR')) { const d = this.deklaracija(); d.lokalno = lokalno; M.deklaracije.push(d); continue; }
      if (this.jeKw('PROC') || this.jeKw('FUNC') || this.jeKw('TRAP')) { const r = this.rutina(); r.lokalno = lokalno; M.rutine.push(r); continue; }
      this.greska('Unexpected ' + JSON.stringify(String(this.g.v)) + ' in module declaration part.');
    }
    const kraj = this.uzmi('kw', 'ENDMODULE');
    M.krajLinija = kraj.l;
    return M;
  }
  deklaracija() {
    const vrsta = this.T[this.i++].v, tip = this.ident(), ime = this.ident();
    let dim = null;
    if (this.jeOp('{')) { this.i++; dim = []; while (!this.jeOp('}')) { dim.push(this.izraz()); if (this.jeOp(',')) this.i++; } this.i++; }
    let init = null;
    if (this.jeOp(':=')) { this.i++; init = this.izraz(); }
    this.uzmi('op', ';');
    return { vrsta, tip: tip.v.toLowerCase(), ime: ime.v, linija: ime.l, init, dim };
  }
  rutina() {
    const vrsta = this.T[this.i++].v;
    let tipFunkcije = null;
    if (vrsta === 'FUNC') tipFunkcije = this.ident().v.toLowerCase();
    const ime = this.ident(); const parametri = [];
    if (vrsta !== 'TRAP') {
      this.uzmi('op', '(');
      while (!this.jeOp(')')) {
        let opc = false; if (this.jeOp('\\')) { opc = true; this.i++; }
        let nacin = 'IN'; if (this.jeKw('VAR') || this.jeKw('PERS') || (this.g.t === 'id' && /^INOUT$/i.test(this.g.v))) { nacin = this.g.v; this.i++; }
        const t = this.ident(), n = this.ident();
        parametri.push({ ime: n.v, tip: t.v.toLowerCase(), opc, nacin });
        if (this.jeOp(',')) this.i++; else if (!this.jeOp(')')) this.greska('Expected , or ).');
      }
      this.i++;
    }
    const R = { vrsta, ime: ime.v, linija: ime.l, parametri, tipFunkcije, lokalne: [], tijelo: [] };
    // lokalne deklaracije na početku rutine
    while (this.jeKw('VAR') || this.jeKw('CONST') || this.jeKw('PERS')) R.lokalne.push(this.deklaracija());
    const kraj = 'END' + vrsta;
    R.tijelo = this.blok([kraj, 'ERROR', 'UNDO', 'BACKWARD']);
    if (this.jeKw('ERROR') || this.jeKw('UNDO') || this.jeKw('BACKWARD')) {   // rukovatelji greškom: čitaju se, ne izvode
      this.i++; this.blok([kraj]);
    }
    const k = this.uzmi('kw', kraj); R.krajLinija = k.l;
    return R;
  }
  blok(krajevi) {
    const L = [];
    while (!(this.g.t === 'kw' && krajevi.includes(this.g.v))) {
      if (this.g.t === 'kraj') this.greska('Missing ' + krajevi[0] + '.');
      L.push(this.naredba());
    }
    return L;
  }
  naredba() {
    const t = this.g;
    if (t.t === 'kw') {
      switch (t.v) {
        case 'IF': return this.naredbaIf();
        case 'WHILE': { this.i++; const uvjet = this.izraz(); this.uzmi('kw', 'DO'); const tijelo = this.blok(['ENDWHILE']); const k = this.uzmi('kw', 'ENDWHILE'); return { t: 'while', l: t.l, uvjet, tijelo, kraj: k.l }; }
        case 'FOR': {
          this.i++; const v = this.ident(); this.uzmi('kw', 'FROM'); const od = this.izraz(); this.uzmi('kw', 'TO'); const doo = this.izraz();
          let korak = null; if (this.jeKw('STEP')) { this.i++; korak = this.izraz(); }
          this.uzmi('kw', 'DO'); const tijelo = this.blok(['ENDFOR']); const k = this.uzmi('kw', 'ENDFOR');
          return { t: 'for', l: t.l, var: v.v, od, do: doo, korak, tijelo, kraj: k.l };
        }
        case 'TEST': {
          this.i++; const izr = this.izraz(); const slucajevi = []; let zadani = null;
          while (this.jeKw('CASE')) { this.i++; const vr = [this.izraz()]; while (this.jeOp(',')) { this.i++; vr.push(this.izraz()); } this.uzmi('op', ':'); slucajevi.push({ vr, tijelo: this.blok(['CASE', 'DEFAULT', 'ENDTEST']) }); }
          if (this.jeKw('DEFAULT')) { this.i++; this.uzmi('op', ':'); zadani = this.blok(['ENDTEST']); }
          const k = this.uzmi('kw', 'ENDTEST');
          return { t: 'test', l: t.l, izr, slucajevi, zadani, kraj: k.l };
        }
        case 'RETURN': { this.i++; let izr = null; if (!this.jeOp(';')) izr = this.izraz(); this.uzmi('op', ';'); return { t: 'return', l: t.l, izr }; }
        case 'EXIT': { this.i++; this.uzmi('op', ';'); return { t: 'exit', l: t.l }; }
        case 'RETRY': case 'TRYNEXT': { this.i++; this.uzmi('op', ';'); return { t: 'prazno', l: t.l }; }
        default: this.greska('Unexpected keyword ' + t.v + '.');
      }
    }
    if (t.t !== 'id') this.greska('Expected instruction.');
    // dodjela: ime[.polje|{i}]* := izraz ;
    const s = this.sljedeci();
    if (s.t === 'op' && (s.v === ':=' || s.v === '.' || s.v === '{')) {
      const cilj = this.lijevaStrana(); this.uzmi('op', ':='); const izraz = this.izraz(); this.uzmi('op', ';');
      return { t: 'dodjela', l: t.l, cilj, izraz };
    }
    // poziv instrukcije ili procedure
    this.i++;
    const arg = this.argumenti(';');
    this.uzmi('op', ';');
    return { t: 'poziv', l: t.l, ime: t.v, arg };
  }
  naredbaIf() {
    const t = this.uzmi('kw', 'IF'); const uvjet = this.izraz();
    if (!this.jeKw('THEN')) {                     // kompaktni IF: IF uvjet naredba;
      const n = this.naredba(); return { t: 'if', l: t.l, grane: [{ uvjet, tijelo: [n] }], inace: null, kraj: n.l };
    }
    this.i++;
    const grane = [{ uvjet, tijelo: this.blok(['ELSEIF', 'ELSE', 'ENDIF']) }]; let inace = null;
    while (this.jeKw('ELSEIF')) { this.i++; const u = this.izraz(); this.uzmi('kw', 'THEN'); grane.push({ uvjet: u, tijelo: this.blok(['ELSEIF', 'ELSE', 'ENDIF']), l: this.g.l }); }
    if (this.jeKw('ELSE')) { this.i++; inace = this.blok(['ENDIF']); }
    const k = this.uzmi('kw', 'ENDIF');
    return { t: 'if', l: t.l, grane, inace, kraj: k.l };
  }
  lijevaStrana() {
    const ime = this.ident(); const put = [];
    for (;;) {
      if (this.jeOp('.')) { this.i++; put.push({ polje: this.ident().v }); continue; }
      if (this.jeOp('{')) { this.i++; put.push({ indeks: this.izraz() }); this.uzmi('op', '}'); continue; }
      break;
    }
    return { ime: ime.v, put, l: ime.l };
  }
  // argumenti instrukcije: izraz | \Prekidac | \Ime:=izraz | Ime:=izraz ; odvojeni zarezima (opcionalni i bez zareza)
  argumenti(kraj) {
    const A = [];
    while (!this.jeOp(kraj) && this.g.t !== 'kraj') {
      if (this.jeOp(',')) { this.i++; continue; }
      if (this.jeOp('\\')) {
        this.i++; const ime = this.ident();
        if (this.jeOp(':=')) { this.i++; A.push({ opc: ime.v, izraz: this.izraz() }); }
        else A.push({ opc: ime.v, prekidac: true });
        continue;
      }
      if (this.g.t === 'id' && this.sljedeci().t === 'op' && this.sljedeci().v === ':=') {
        const ime = this.ident(); this.i++; A.push({ ime: ime.v, izraz: this.izraz() }); continue;
      }
      A.push({ izraz: this.izraz() });
      if (!this.jeOp(',') && !this.jeOp('\\') && !this.jeOp(kraj)) this.greska('Expected , or ' + kraj + '.');
    }
    return A;
  }
  // ---- izrazi (prioriteti kao u RAPID-u) ----
  izraz() { return this.ili(); }
  ili() { let a = this.i_(); while (this.jeKw('OR') || this.jeKw('XOR')) { const o = this.T[this.i++].v; a = { t: 'bin', o, a, b: this.i_() }; } return a; }
  i_() { let a = this.ne(); while (this.jeKw('AND')) { this.i++; a = { t: 'bin', o: 'AND', a, b: this.ne() }; } return a; }
  ne() { if (this.jeKw('NOT')) { this.i++; return { t: 'un', o: 'NOT', a: this.ne() }; } return this.usporedba(); }
  usporedba() {
    let a = this.zbroj();
    while (this.g.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(this.g.v)) { const o = this.T[this.i++].v; a = { t: 'bin', o, a, b: this.zbroj() }; }
    return a;
  }
  zbroj() { let a = this.umnozak(); while (this.jeOp('+') || this.jeOp('-')) { const o = this.T[this.i++].v; a = { t: 'bin', o, a, b: this.umnozak() }; } return a; }
  umnozak() {
    let a = this.predznak();
    while (this.jeOp('*') || this.jeOp('/') || this.jeKw('DIV') || this.jeKw('MOD')) { const o = this.T[this.i++].v; a = { t: 'bin', o, a, b: this.predznak() }; }
    return a;
  }
  predznak() { if (this.jeOp('-')) { this.i++; return { t: 'un', o: '-', a: this.predznak() }; } if (this.jeOp('+')) { this.i++; return this.predznak(); } return this.osnovno(); }
  osnovno() {
    const t = this.g;
    if (t.t === 'br') { this.i++; return { t: 'br', v: t.v }; }
    if (t.t === 'str') { this.i++; return { t: 'str', v: t.v }; }
    if (t.t === 'kw' && (t.v === 'TRUE' || t.v === 'FALSE')) { this.i++; return { t: 'bool', v: t.v === 'TRUE' }; }
    if (this.jeOp('(')) { this.i++; const e = this.izraz(); this.uzmi('op', ')'); return e; }
    if (this.jeOp('[')) {
      this.i++; const el = [];
      while (!this.jeOp(']')) { el.push(this.izraz()); if (this.jeOp(',')) this.i++; else if (!this.jeOp(']')) this.greska('Expected , or ].'); }
      this.i++; return { t: 'agr', el };
    }
    if (t.t === 'id') {
      this.i++;
      let e;
      if (this.jeOp('(')) { this.i++; const arg = this.argumenti(')'); this.uzmi('op', ')'); e = { t: 'fun', ime: t.v, arg, l: t.l }; }
      else e = { t: 'id', ime: t.v, l: t.l };
      for (;;) {
        if (this.jeOp('.')) { this.i++; e = { t: 'polje', a: e, polje: this.ident().v }; continue; }
        if (this.jeOp('{')) { this.i++; const ix = this.izraz(); this.uzmi('op', '}'); e = { t: 'indeks', a: e, ix }; continue; }
        break;
      }
      return e;
    }
    this.greska('Unexpected ' + JSON.stringify(String(t.v)) + ' in expression.');
  }
}

// Parsira tekst modula. Vraća modul s izvornim recima (za prikaz, Modify Position i spremanje).
export function parsirajModul(tekst) {
  const p = new Parser(tekst);
  const M = p.modul();
  M.linije = tekst.replace(/\r\n?/g, '\n').split('\n');
  while (M.linije.length && M.linije[M.linije.length - 1] === '') M.linije.pop();
  M.sustavni = M.atributi.includes('SYSMODULE');
  M.samoCitanje = M.atributi.includes('VIEWONLY') || M.atributi.includes('READONLY');
  return M;
}

// ---------------------------------------------------------------- formatiranje vrijednosti
export function fmtBroj(v) {
  if (!isFinite(v)) return String(v);
  if (Math.abs(v) >= 1e9) return (v < 0 ? '-' : '') + '9E+09';
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  let s = (+v.toFixed(6)).toString();
  if (s.includes('e')) s = v.toFixed(6);
  return s;
}
export function uTekst(v) {
  if (Array.isArray(v)) return '[' + v.map(uTekst).join(',') + ']';
  if (typeof v === 'number') return fmtBroj(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
  return '';
}
const kopija = v => Array.isArray(v) ? v.map(kopija) : v;
export { kopija };

// ---------------------------------------------------------------- program (zadatak T_ROB1)
const lc = s => String(s).toLowerCase();
const INSTRUKCIJE = new Set(['movel', 'movej', 'moveabsj', 'movec', 'waittime', 'set', 'reset', 'setdo', 'pulsedo', 'tpwrite', 'tperase', 'confl', 'confj', 'singarea',
  'stop', 'incr', 'decr', 'add', 'clear', 'accset', 'velset', 'waituntil', 'waitdi', 'waitdo', 'break', 'stopmove', 'startmove']);
const FUNKCIJE = { offs: 'robtarget', reltool: 'robtarget', crobt: 'robtarget', cjointt: 'jointtarget', abs: N, round: N, trunc: N, sqrt: N, sin: N, cos: N, tan: N, atan2: N, numtostr: S, doutput: N, dinput: N, distance: N, strlen: N, present: B };

export class Program {
  constructor() { this.moduli = []; this.signali = new Set(); }   // signali = imena digitalnih izlaza (mala slova)

  // ---- moduli ----
  dodajModul(tekst, opc = {}) {
    const M = parsirajModul(tekst);
    M.datoteka = opc.datoteka || (M.ime + (M.sustavni ? '.sys' : '.mod'));
    M.promijenjen = false;
    this.moduli.push(M);
    this.osvjeziImena();
    this.inicijaliziraj(M);
    return M;
  }
  ukloniModul(M) { this.moduli = this.moduli.filter(m => m !== M); this.osvjeziImena(); }
  modul(ime) { const k = lc(ime); return this.moduli.find(m => lc(m.prikaz) === k) || this.moduli.find(m => lc(m.ime) === k); }

  // Prikazno ime modula: dvostruko ime (ili rutina s imenom modula) => IME#2, kao na FlexPendantu
  osvjeziImena() {
    const vidjeno = new Map();
    for (const m of this.moduli) {
      const k = lc(m.ime);
      let dvoznacno = vidjeno.has(k);
      if (!dvoznacno) dvoznacno = this.moduli.some(o => o.rutine.some(r => lc(r.ime) === k && (o === m || !r.lokalno)) || o.deklaracije.some(d => lc(d.ime) === k && (o === m || !d.lokalno)));
      const n = (vidjeno.get(k) || 0) + 1; vidjeno.set(k, n);
      m.prikaz = dvoznacno ? m.ime + '#' + Math.max(2, n) : m.ime;
      m.dvoznacno = dvoznacno;
    }
  }

  // ---- inicijalizacija podataka modula ----
  inicijaliziraj(M) {
    for (const d of M.deklaracije) {
      d.modul = M;
      try {
        if (d.init) d.vrijednost = this.procijeni(d.init, { modul: M, lok: null })[0];
        else d.vrijednost = zadano(d.tip);
      } catch (e) { d.vrijednost = zadano(d.tip); d.greskaInit = e.message; }
    }
  }

  // ---- traženje imena ----
  sviPodaci(ime) {
    const k = lc(ime), R = [];
    for (const m of this.moduli) for (const d of m.deklaracije) if (lc(d.ime) === k) R.push(d);
    return R;
  }
  podatak(ime, modul, lok) {
    const k = lc(ime);
    if (lok && lok.has(k)) return lok.get(k);
    if (modul) { const d = modul.deklaracije.find(x => lc(x.ime) === k); if (d) return d; }
    for (const m of this.moduli) { if (m === modul) continue; const d = m.deklaracije.find(x => lc(x.ime) === k && !x.lokalno); if (d) return d; }
    return UGRADJENO.get(k) || null;
  }
  rutina(ime, modul) {
    const k = lc(ime);
    if (modul) { const r = modul.rutine.find(x => lc(x.ime) === k); if (r) return { r, m: modul }; }
    for (const m of this.moduli) { const r = m.rutine.find(x => lc(x.ime) === k && !x.lokalno); if (r) return { r, m }; }
    return null;
  }
  sveRutine() { const L = []; for (const m of this.moduli) for (const r of m.rutine) L.push({ r, m }); return L; }

  // ---- provjera programa (Check Program) ----
  provjeri() {
    const G = [];
    const greska = (m, l, tekst) => G.push({ modul: m, linija: l, tekst: 'Error in T_ROB1 - ' + m.prikaz + ' - Line ' + l + ': ' + tekst, kratko: tekst });
    for (const m of this.moduli) if (m.dvoznacno) greska(m, m.linija, 'Module name ' + m.ime + ' ambiguous');
    // globalne rutine
    const rut = new Map();
    for (const m of this.moduli) for (const r of m.rutine) {
      if (r.lokalno) continue;
      const k = lc(r.ime);
      if (rut.has(k)) greska(m, r.linija, 'Global routine name ' + r.ime + ' ambiguous'); else rut.set(k, { r, m });
    }
    // globalni podaci (PERS istog tipa smiju se dijeliti)
    const pod = new Map();
    for (const m of this.moduli) for (const d of m.deklaracije) {
      if (d.lokalno) continue;
      const k = lc(d.ime);
      if (UGRADJENO.has(k) && !m.sustavni) { greska(m, d.linija, 'Global data name ' + d.ime + ' ambiguous'); continue; }
      const p = pod.get(k);
      if (p && !(p.vrsta === 'PERS' && d.vrsta === 'PERS' && p.tip === d.tip)) greska(m, d.linija, 'Global data name ' + d.ime + ' ambiguous');
      else if (!p) pod.set(k, d);
      if (rut.has(k)) greska(m, d.linija, 'Name ' + d.ime + ' ambiguous (routine and data)');
    }
    // nepoznate rutine i podaci u naredbama
    for (const m of this.moduli) for (const r of m.rutine) {
      const lokalni = new Set(r.lokalne.map(d => lc(d.ime)).concat(r.parametri.map(p => lc(p.ime))));
      const hodaj = (L, petlje) => {
        for (const s of L) {
          if (s.t === 'poziv') {
            const k = lc(s.ime);
            if (!INSTRUKCIJE.has(k) && !this.rutina(s.ime, m)) greska(m, s.l, 'Reference error: Routine name ' + s.ime + ' is not defined');
            s.arg.forEach(a => a.izraz && this.provjeriIzraz(a.izraz, m, lokalni, petlje, greska, s.l));
          } else if (s.t === 'dodjela') {
            if (!lokalni.has(lc(s.cilj.ime)) && !petlje.has(lc(s.cilj.ime)) && !this.podatak(s.cilj.ime, m)) greska(m, s.l, 'Reference error: Data name ' + s.cilj.ime + ' is not defined');
            else { const d = this.podatak(s.cilj.ime, m); if (d && d.vrsta === 'CONST') greska(m, s.l, 'Data ' + s.cilj.ime + ' is a constant and cannot be assigned'); }
            this.provjeriIzraz(s.izraz, m, lokalni, petlje, greska, s.l);
          } else if (s.t === 'if') { s.grane.forEach(g => { this.provjeriIzraz(g.uvjet, m, lokalni, petlje, greska, s.l); hodaj(g.tijelo, petlje); }); if (s.inace) hodaj(s.inace, petlje); }
          else if (s.t === 'while') { this.provjeriIzraz(s.uvjet, m, lokalni, petlje, greska, s.l); hodaj(s.tijelo, petlje); }
          else if (s.t === 'for') { const p2 = new Set(petlje); p2.add(lc(s.var)); hodaj(s.tijelo, p2); }
          else if (s.t === 'test') { s.slucajevi.forEach(c => hodaj(c.tijelo, petlje)); if (s.zadani) hodaj(s.zadani, petlje); }
        }
      };
      hodaj(r.tijelo, new Set());
    }
    return G;
  }
  provjeriIzraz(e, m, lokalni, petlje, greska, l) {
    if (!e) return;
    switch (e.t) {
      case 'id': { const k = lc(e.ime); if (!lokalni.has(k) && !petlje.has(k) && !this.signali.has(k) && !this.podatak(e.ime, m)) greska(m, l, 'Reference error: Data name ' + e.ime + ' is not defined'); break; }
      case 'bin': this.provjeriIzraz(e.a, m, lokalni, petlje, greska, l); this.provjeriIzraz(e.b, m, lokalni, petlje, greska, l); break;
      case 'un': case 'polje': this.provjeriIzraz(e.a, m, lokalni, petlje, greska, l); break;
      case 'indeks': this.provjeriIzraz(e.a, m, lokalni, petlje, greska, l); this.provjeriIzraz(e.ix, m, lokalni, petlje, greska, l); break;
      case 'agr': e.el.forEach(x => this.provjeriIzraz(x, m, lokalni, petlje, greska, l)); break;
      case 'fun': {
        const k = lc(e.ime);
        if (!(k in FUNKCIJE) && !this.rutina(e.ime, m)) greska(m, l, 'Reference error: Function ' + e.ime + ' is not defined');
        e.arg.forEach(a => a.izraz && this.provjeriIzraz(a.izraz, m, lokalni, petlje, greska, l)); break;
      }
    }
  }

  // ---- procjena izraza: vraća [vrijednost, tip] ----
  // ok = { modul, lok (Map lokalnih), kontroler (CRobT, CJointT, DOutput) }
  procijeni(e, ok) {
    switch (e.t) {
      case 'br': return [e.v, N];
      case 'str': return [e.v, S];
      case 'bool': return [e.v, B];
      case 'agr': return [e.el.map(x => this.procijeni(x, ok)[0]), null];
      case 'id': {
        const d = this.podatak(e.ime, ok.modul, ok.lok);
        if (!d) throw new RapidGreska(40301, 'Reference error', 'Data name ' + e.ime + ' is not defined.', { linija: e.l });
        return [d.vrijednost, d.tip];
      }
      case 'polje': {
        const [v, t] = this.procijeni(e.a, ok);
        const z = ZAPISI[t];
        const i = z ? z.findIndex(f => lc(f[0]) === lc(e.polje)) : -1;
        if (i < 0) throw new RapidGreska(40302, 'Reference error', 'Component ' + e.polje + ' not found in data type ' + (t || '?') + '.');
        return [v[i], z[i][1]];
      }
      case 'indeks': { const [v, t] = this.procijeni(e.a, ok); const ix = this.procijeni(e.ix, ok)[0]; return [v[ix - 1], t]; }
      case 'un': {
        const [a, t] = this.procijeni(e.a, ok);
        if (e.o === 'NOT') return [!a, B];
        return [Array.isArray(a) ? a.map(x => -x) : -a, t];
      }
      case 'bin': {
        const [a, ta] = this.procijeni(e.a, ok), [b] = this.procijeni(e.b, ok);
        switch (e.o) {
          case '+': if (typeof a === 'string') return [a + b, S]; if (Array.isArray(a)) return [a.map((x, i) => x + b[i]), ta]; return [a + b, N];
          case '-': if (Array.isArray(a)) return [a.map((x, i) => x - b[i]), ta]; return [a - b, N];
          case '*': return [a * b, N];
          case '/': if (b === 0) throw new RapidGreska(40306, 'Execution error', 'Division by zero.'); return [a / b, N];
          case 'DIV': return [Math.trunc(a / b), N];
          case 'MOD': return [a % b, N];
          case '=': return [jednako(a, b), B];
          case '<>': return [!jednako(a, b), B];
          case '<': return [a < b, B]; case '>': return [a > b, B]; case '<=': return [a <= b, B]; case '>=': return [a >= b, B];
          case 'AND': return [a && b, B]; case 'OR': return [a || b, B]; case 'XOR': return [!!a !== !!b, B];
        }
        break;
      }
      case 'fun': return this.funkcija(e, ok);
    }
    throw new RapidGreska(40303, 'Execution error', 'Expression not supported in simulator.');
  }
  funkcija(e, ok) {
    const k = lc(e.ime);
    const poz = e.arg.filter(a => !a.opc && !a.ime).map(a => this.procijeni(a.izraz, ok)[0]);
    const opc = {}; e.arg.filter(a => a.opc || a.ime).forEach(a => { opc[lc(a.opc || a.ime)] = a.prekidac ? true : this.procijeni(a.izraz, ok)[0]; });
    switch (k) {
      case 'offs': { const p = kopija(poz[0]); p[0] = [p[0][0] + poz[1], p[0][1] + poz[2], p[0][2] + poz[3]]; return [p, 'robtarget']; }
      case 'reltool': {
        const p = kopija(poz[0]); const R = kvatMat(p[1]);
        const d = [poz[1], poz[2], poz[3]];
        p[0] = [p[0][0] + R[0] * d[0] + R[1] * d[1] + R[2] * d[2], p[0][1] + R[3] * d[0] + R[4] * d[1] + R[5] * d[2], p[0][2] + R[6] * d[0] + R[7] * d[1] + R[8] * d[2]];
        let Q = R;
        for (const [os, kut] of [['rx', opc.rx], ['ry', opc.ry], ['rz', opc.rz]]) if (kut) Q = mnoziR(Q, rotR(os, kut * Math.PI / 180));
        p[1] = matKvat(Q); return [p, 'robtarget'];
      }
      case 'crobt': return [ok.kontroler.crobt(opc.tool, opc.wobj), 'robtarget'];
      case 'cjointt': return [ok.kontroler.cjointt(), 'jointtarget'];
      case 'doutput': return [ok.kontroler.doutput(e.arg[0].izraz.ime), N];
      case 'dinput': return [ok.kontroler.dinput(e.arg[0].izraz.ime), N];
      case 'abs': return [Math.abs(poz[0]), N];
      case 'round': { const d = opc.dec || 0, f = Math.pow(10, d); return [Math.round(poz[0] * f) / f, N]; }
      case 'trunc': { const d = opc.dec || 0, f = Math.pow(10, d); return [Math.trunc(poz[0] * f) / f, N]; }
      case 'sqrt': return [Math.sqrt(poz[0]), N];
      case 'sin': return [Math.sin(poz[0] * Math.PI / 180), N];
      case 'cos': return [Math.cos(poz[0] * Math.PI / 180), N];
      case 'tan': return [Math.tan(poz[0] * Math.PI / 180), N];
      case 'atan2': return [Math.atan2(poz[0], poz[1]) * 180 / Math.PI, N];
      case 'numtostr': return [fmtBroj(+poz[0].toFixed(poz[1] || 0)), S];
      case 'strlen': return [String(poz[0]).length, N];
      case 'distance': return [Math.hypot(poz[0][0] - poz[1][0], poz[0][1] - poz[1][1], poz[0][2] - poz[1][2]), N];
      case 'present': return [true, B];
    }
    throw new RapidGreska(40304, 'Reference error', 'Function ' + e.ime + ' is not defined.');
  }

  // dodjela vrijednosti (cijeli podatak ili polje zapisa)
  dodijeli(cilj, v, ok) {
    const d = this.podatak(cilj.ime, ok.modul, ok.lok);
    if (!d) throw new RapidGreska(40301, 'Reference error', 'Data name ' + cilj.ime + ' is not defined.');
    if (d.vrsta === 'CONST') throw new RapidGreska(40305, 'Execution error', 'Data ' + cilj.ime + ' is a constant.');
    if (!cilj.put.length) { d.vrijednost = kopija(v); d.promjena = (d.promjena || 0) + 1; return d; }
    let obj = d.vrijednost, t = d.tip;
    for (let i = 0; i < cilj.put.length; i++) {
      const k = cilj.put[i]; let ix;
      if (k.polje) { const z = ZAPISI[t]; ix = z.findIndex(f => lc(f[0]) === lc(k.polje)); if (ix < 0) throw new RapidGreska(40302, 'Reference error', 'Component ' + k.polje + ' not found.'); t = z[ix][1]; }
      else ix = this.procijeni(k.indeks, ok)[0] - 1;
      if (i === cilj.put.length - 1) obj[ix] = kopija(v); else obj = obj[ix];
    }
    d.promjena = (d.promjena || 0) + 1;
    return d;
  }

  // ---- izvođenje (generatori) ----
  // Svaka naredba prije izvođenja daje { vrsta:'redak', s, m, r } — to je položaj programskog pokazivača (PP).
  // Gibanja, čekanja i zaustavljanja daje kao zahtjeve; kontroler ih izvodi i nastavlja generator.
  *izvrsiRutinu(r, m, put, kontroler, argumenti) {
    const lok = new Map();
    r.parametri.forEach((p, i) => lok.set(lc(p.ime), { ime: p.ime, tip: p.tip, vrsta: 'VAR', vrijednost: argumenti ? argumenti[i] : zadano(p.tip) }));
    for (const d of r.lokalne) lok.set(lc(d.ime), { ime: d.ime, tip: d.tip, vrsta: d.vrsta, vrijednost: d.init ? this.procijeni(d.init, { modul: m, lok, kontroler })[0] : zadano(d.tip) });
    const ok = { modul: m, lok, kontroler, r };
    try { yield* this.blok(r.tijelo, ok, put); }
    catch (e) { if (e && e.povratak) return e.vrijednost; throw e; }
  }
  *blok(L, ok, put) {
    let i = put && put.length ? put[0] : 0;
    let ostatak = put && put.length > 1 ? put.slice(1) : null;
    for (; i < L.length; i++) {
      const s = L[i];
      if (ostatak) { const o = ostatak; ostatak = null; yield* this.unutra(s, ok, o); continue; }
      yield { vrsta: 'redak', s, m: ok.modul, r: ok.r };
      yield* this.naredba(s, ok);
    }
  }
  // ulazak u složenu naredbu na zadanom putu (PP to Cursor unutar IF/WHILE/FOR)
  *unutra(s, ok, put) {
    if (s.t === 'if') { const g = put[0]; const tijelo = g < s.grane.length ? s.grane[g].tijelo : s.inace; yield* this.blok(tijelo, ok, put.slice(1)); return; }
    if (s.t === 'while') { yield* this.blok(s.tijelo, ok, put); yield* this.naredba(s, ok); return; }
    if (s.t === 'for') { yield* this.naredba(s, ok); return; }
    if (s.t === 'test') { const c = put[0]; const tijelo = c < s.slucajevi.length ? s.slucajevi[c].tijelo : s.zadani; yield* this.blok(tijelo, ok, put.slice(1)); return; }
    yield { vrsta: 'redak', s, m: ok.modul, r: ok.r }; yield* this.naredba(s, ok);
  }
  *naredba(s, ok) {
    const P = (e) => this.procijeni(e, ok)[0];
    switch (s.t) {
      case 'prazno': return;
      case 'dodjela': this.dodijeli(s.cilj, P(s.izraz), ok); return;
      case 'if': {
        for (const g of s.grane) if (P(g.uvjet)) { yield* this.blok(g.tijelo, ok); return; }
        if (s.inace) yield* this.blok(s.inace, ok); return;
      }
      case 'while': { let n = 0; while (P(s.uvjet)) { yield* this.blok(s.tijelo, ok); if (++n > 1e6) throw new RapidGreska(40307, 'Execution error', 'Too many loop iterations.'); } return; }
      case 'for': {
        const od = P(s.od), doo = P(s.do), k = s.korak ? P(s.korak) : (doo >= od ? 1 : -1);
        const kl = lc(s.var), staro = ok.lok.get(kl);
        const v = { ime: s.var, tip: N, vrsta: 'VAR', vrijednost: od }; ok.lok.set(kl, v);
        try { for (v.vrijednost = od; k > 0 ? v.vrijednost <= doo : v.vrijednost >= doo; v.vrijednost += k) yield* this.blok(s.tijelo, ok); }
        finally { if (staro) ok.lok.set(kl, staro); else ok.lok.delete(kl); }
        return;
      }
      case 'test': {
        const v = P(s.izr);
        for (const c of s.slucajevi) if (c.vr.some(x => jednako(P(x), v))) { yield* this.blok(c.tijelo, ok); return; }
        if (s.zadani) yield* this.blok(s.zadani, ok); return;
      }
      case 'return': throw { povratak: true, vrijednost: s.izr ? P(s.izr) : undefined };
      case 'exit': yield { vrsta: 'exit', s }; return;
      case 'poziv': yield* this.poziv(s, ok); return;
    }
  }
  *poziv(s, ok) {
    const k = lc(s.ime);
    const poz = s.arg.filter(a => !a.opc && !a.ime && a.izraz);
    const opcija = ime => s.arg.find(a => lc(a.opc || a.ime || '') === lc(ime));
    const vr = a => a ? this.procijeni(a.izraz, ok) : [undefined, null];
    const K = ok.kontroler;
    switch (k) {
      case 'movel': case 'movej': {
        const [cilj] = vr(poz[0]), [brzina] = vr(poz[1]), [zona] = vr(poz[2]), [alat] = vr(poz[3]);
        const w = opcija('WObj'); const wobj = w ? vr(w)[0] : this.podatak('wobj0').vrijednost;
        const alatIme = poz[3] && poz[3].izraz.t === 'id' ? poz[3].izraz.ime : '?';
        const wobjIme = w && w.izraz.t === 'id' ? w.izraz.ime : 'wobj0';
        const vOpc = opcija('V'); const v = vOpc ? vr(vOpc)[0] : brzina[0];
        yield { vrsta: 'gibanje', tip: k === 'movel' ? 'L' : 'J', cilj, v, zona, alat, wobj, alatIme, wobjIme, s, m: ok.modul, r: ok.r };
        return;
      }
      case 'moveabsj': {
        const [cilj] = vr(poz[0]), [brzina] = vr(poz[1]);
        yield { vrsta: 'gibanje', tip: 'A', cilj, v: brzina[0], alat: vr(poz[3])[0], s, m: ok.modul, r: ok.r };
        return;
      }
      case 'waittime': { const t = vr(poz[0])[0]; yield { vrsta: 'cekaj', t }; return; }
      case 'set': K.io(poz[0].izraz.ime, 1); return;
      case 'reset': K.io(poz[0].izraz.ime, 0); return;
      case 'setdo': K.io(poz[0].izraz.ime, vr(poz[1])[0] ? 1 : 0); return;
      case 'pulsedo': { const pl = opcija('PLength'); const t = pl ? vr(pl)[0] : 0.2; K.io(poz[0].izraz.ime, 1); yield { vrsta: 'cekaj', t }; K.io(poz[0].izraz.ime, 0); return; }
      // WaitDI / WaitDO: kontroler provjerava signal u svakom okviru; \MaxTime -> greška 40308 nakon isteka
      case 'waitdi': case 'waitdo': { const ime = poz[0].izraz.ime, v = vr(poz[1])[0] ? 1 : 0; const mt = opcija('MaxTime'); yield { vrsta: 'cekajSignal', ime, v, ulaz: k === 'waitdi', maxT: mt ? vr(mt)[0] : null, s }; return; }
      case 'tpwrite': {
        let t = String(vr(poz[0])[0]); const n = opcija('Num');
        if (n) t += fmtBroj(+(+vr(n)[0]).toFixed(6));
        K.ispis(t); return;
      }
      case 'tperase': K.ispis(null); return;
      case 'confl': K.postavka('confL', !opcija('Off')); return;
      case 'confj': K.postavka('confJ', !opcija('Off')); return;
      case 'singarea': K.postavka('singArea', opcija('Wrist') ? 'Wrist' : 'Off'); return;
      case 'accset': case 'velset': case 'break': case 'stopmove': case 'startmove': return;
      case 'stop': yield { vrsta: 'stop', s }; return;
      case 'incr': case 'decr': case 'add': case 'clear': {
        const c = poz[0].izraz; const cilj = { ime: c.t === 'id' ? c.ime : c.a.ime, put: [] };
        const sada = vr(poz[0])[0];
        const nova = k === 'incr' ? sada + 1 : k === 'decr' ? sada - 1 : k === 'add' ? sada + vr(poz[1])[0] : 0;
        this.dodijeli(cilj, nova, ok); return;
      }
      case 'waituntil': { const mt = opcija('MaxTime'); yield { vrsta: 'cekajUvjet', uvjet: () => !!vr(poz[0])[0], maxT: mt ? vr(mt)[0] : null, s }; return; }
    }
    // korisnička procedura
    const nadjeno = this.rutina(s.ime, ok.modul);
    if (!nadjeno) throw new RapidGreska(40301, 'Reference error', 'Routine name ' + s.ime + ' is not defined.', { linija: s.l });
    const args = nadjeno.r.parametri.map((p, i) => poz[i] ? vr(poz[i])[0] : zadano(p.tip));
    yield* this.izvrsiRutinu(nadjeno.r, nadjeno.m, null, K, args);
  }

  // put (indeksi) do naredbe u zadanom retku rutine — za PP to Cursor
  putDoRetka(r, linija) {
    const trazi = (L) => {
      for (let i = 0; i < L.length; i++) {
        const s = L[i];
        if (s.l === linija) return [i];
        if (s.t === 'if') {
          for (let g = 0; g < s.grane.length; g++) { const p = trazi(s.grane[g].tijelo); if (p) return [i, g].concat(p); }
          if (s.inace) { const p = trazi(s.inace); if (p) return [i, s.grane.length].concat(p); }
        }
        if (s.t === 'while') { const p = trazi(s.tijelo); if (p) return [i].concat(p); }
        if (s.t === 'test') {
          for (let c = 0; c < s.slucajevi.length; c++) { const p = trazi(s.slucajevi[c].tijelo); if (p) return [i, c].concat(p); }
          if (s.zadani) { const p = trazi(s.zadani); if (p) return [i, s.slucajevi.length].concat(p); }
        }
      }
      return null;
    };
    return trazi(r.tijelo);
  }
  // rutina koja sadrži redak modula
  rutinaURetku(m, linija) { return m.rutine.find(r => linija >= r.linija && linija <= r.krajLinija) || null; }
}

function jednako(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => jednako(x, b[i]));
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a));
  return a === b;
}

// ---- male matrice za RelTool (kvaternion [w x y z], matrica po recima) ----
export function kvatMat(q) {
  let [w, x, y, z] = q; const n = Math.hypot(w, x, y, z) || 1; w /= n; x /= n; y /= n; z /= n;
  return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
}
function mnoziR(A, B) { const C = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C.push(A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]); return C; }
function rotR(os, t) { const c = Math.cos(t), s = Math.sin(t); if (os === 'rx') return [1, 0, 0, 0, c, -s, 0, s, c]; if (os === 'ry') return [c, 0, s, 0, 1, 0, -s, 0, c]; return [c, -s, 0, s, c, 0, 0, 0, 1]; }
export function matKvat(R) {
  const tr = R[0] + R[4] + R[8]; let w, x, y, z;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (R[7] - R[5]) / s; y = (R[2] - R[6]) / s; z = (R[3] - R[1]) / s; }
  else if (R[0] > R[4] && R[0] > R[8]) { const s = Math.sqrt(1 + R[0] - R[4] - R[8]) * 2; w = (R[7] - R[5]) / s; x = s / 4; y = (R[1] + R[3]) / s; z = (R[2] + R[6]) / s; }
  else if (R[4] > R[8]) { const s = Math.sqrt(1 + R[4] - R[0] - R[8]) * 2; w = (R[2] - R[6]) / s; x = (R[1] + R[3]) / s; y = s / 4; z = (R[5] + R[7]) / s; }
  else { const s = Math.sqrt(1 + R[8] - R[0] - R[4]) * 2; w = (R[3] - R[1]) / s; x = (R[2] + R[6]) / s; y = (R[5] + R[7]) / s; z = s / 4; }
  if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
  return [w, x, y, z];
}

// ---------------------------------------------------------------- pretvarač G-kod -> RAPID (PC strana petlje)
// Piše modul kao ispravljeni FTQ_PROBA.mod: tool0 + pNula + zProba, rutine <prefiks>_Nula i <prefiks>_Pisi.
// Nikad ne piše PROC main() i odbija ime rutine jednako imenu modula (RAPID ne razlikuje velika i mala slova).
export function provjeriImeRapid(ime) {
  if (!ime) return 'Ime je prazno.';
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(ime)) return 'Ime smije imati samo slova bez kvačica, brojke i _, i mora početi slovom.';
  if (ime.length > 32) return 'Ime smije imati najviše 32 znaka.';
  if (KLJUCNE.has(ime.toUpperCase())) return 'Ime ' + ime + ' je rezervirana riječ RAPID-a.';
  return '';
}
export function gkodURapid(txt, o) {
  o = Object.assign({ modul: 'FTQ_PROBA', prefiks: 'FTQ', zProba: 30, izvor: 'G-kod', datum: '', wobj: null }, o || {});
  // o.wobj = { ime, trans[mm], rot[q] }: ploha za pisanje kao radni objekt (okomita ploča); bez njega wobj0 kao na stvarnom robotu
  const W = o.wobj ? o.wobj.ime : 'wobj0';
  const greske = [];
  let g = provjeriImeRapid(o.modul); if (g) greske.push('Modul: ' + g);
  g = provjeriImeRapid(o.prefiks); if (g) greske.push('Prefiks rutina: ' + g);
  const rNula = o.prefiks + '_Nula', rPisi = o.prefiks + '_Pisi';
  // imena brzina: vPr_* kao u datoteci s robota; uz drugi prefiks v<prefiks>_* da se CONST ne sudare s već učitanim modulom
  const vp = o.prefiks.toUpperCase() === 'FTQ' ? 'vPr' : 'v' + o.prefiks;
  for (const r of [rNula, rPisi]) {
    if (lc(r) === lc(o.modul)) greske.push('Rutina ' + r + ' ima isto ime kao modul ' + o.modul + ' (RAPID ne razlikuje velika i mala slova) — kontroler bi modul preimenovao u ' + o.modul + '#2.');
    if (lc(r) === 'main') greske.push('Rutina se ne smije zvati main.');
  }
  if (lc(o.modul) === 'mainmodule' || lc(o.modul) === 'base' || lc(o.modul) === 'user') greske.push('Modul ' + o.modul + ' već postoji u robotu (sustavni modul ili program paletizacije).');
  if (greske.length) return { greske };
  const L = String(txt).split(/\r?\n/);
  let x = 0, y = 0, z = 0, abs = true, n = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const out = [];
  const f = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(2);
  for (const raw of L) {
    const s = raw.trim(); if (!s || s[0] === ';' || s[0] === '(') continue;
    const c = s.split(';')[0].toUpperCase();
    if (/\bG91\b/.test(c)) abs = false; if (/\bG90\b/.test(c)) abs = true;
    if (/\bM0?0\b|\bM0?1\b/.test(c)) out.push('    Stop;');
    const gg = c.match(/\bG0?([01])\b/);
    const gx = c.match(/X(-?[\d.]+)/), gy = c.match(/Y(-?[\d.]+)/), gz = c.match(/Z(-?[\d.]+)/);
    if (!gx && !gy && !gz) continue;
    if (!gg && /\bT\d/.test(c)) continue;
    const nx = gx ? +gx[1] : (abs ? x : 0), ny = gy ? +gy[1] : (abs ? y : 0), nz = gz ? +gz[1] : (abs ? z : 0);
    if (abs) { x = nx; y = ny; z = nz; } else { x += nx; y += ny; z += nz; }
    const brzo = gg ? gg[1] === '0' : false, samoZ = gz && !gx && !gy;
    const v = brzo ? vp + '_Prijelaz' : (samoZ ? vp + '_Z' : vp + '_Crt'), zn = (brzo || samoZ) ? 'fine' : 'z1';
    const ins = n === 0 ? 'MoveJ' : 'MoveL';
    if (z <= 0.001) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    out.push('    ' + ins + ' Offs(pNula,' + f(x) + ',' + f(y) + ',' + f(z) + '+zProba),' + v + ',' + zn + ',tool0\\WObj:=' + W + ';');
    n++;
  }
  if (!n) return { greske: ['U G-kodu nema nijednog pomaka G0/G1 s koordinatama X, Y ili Z.'] };
  const ascii = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '?').replace(/"/g, "'");
  const sir = isFinite(maxX - minX) ? (maxX - minX).toFixed(1) : '0', vis = isFinite(maxY - minY) ? (maxY - minY).toFixed(1) : '0';
  const H = [
    'MODULE ' + o.modul,
    '  ! ForTroniQ - proba crtanja na IRB120 BEZ mjerenja alata' + (o.datum ? ' (' + ascii(o.datum) + ')' : ''),
    '  ! Tekst iz ' + ascii(o.izvor) + ' (' + sir + ' x ' + vis + ' mm), pomaci samo po X i Y ' + (o.wobj ? 'radnog objekta ' + W + ' (ravnina ploce).' : 'baze robota.'),
    '  ! pNula = vrh flomastera na nultoj tocki teksta, razina pisanja; uci se s tool0 / ' + W + ' (Modify Position u ' + rNula + ').',
    '  ! Orijentacija se ne mijenja, pa se vrh flomastera giba isto kao prirubnica.',
    ...(o.wobj ? ['  ! ' + W + ': X desno po ploci, Y gore, Z od ploce prema robotu. Vrijednost je iz simulatora; na stvarnom robotu',
      '  ! radni objekt izmjeri s 3 tocke (Program Data -> wobjdata -> Define) ili ga naucimo rucno.',
      '  PERS wobjdata ' + W + ':=[FALSE,TRUE,"",[[' + o.wobj.trans.map(fmtBroj).join(',') + '],[' + o.wobj.rot.map(fmtBroj).join(',') + ']],[[0,0,0],[1,0,0,0]]];'] : []),
    '  PERS robtarget pNula:=[[0,0,0],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];',
    '  ! zProba > 0: prolaz u zraku iznad razine pisanja; 0 = stvarno crtanje',
    '  PERS num zProba:=' + fmtBroj(o.zProba) + ';',
    '  CONST speeddata ' + vp + '_Crt:=v50;',
    '  CONST speeddata ' + vp + '_Prijelaz:=v100;',
    '  CONST speeddata ' + vp + '_Z:=v20;',
    '',
    '  PROC ' + rNula + '()',
    '    ! Ovdje se uci nulta tocka: kursor na pNula, Modify Position.',
    '    MoveL pNula,v20,fine,tool0\\WObj:=' + W + ';',
    '  ENDPROC',
    '',
    '  PROC ' + rPisi + '()',
    '    ConfL\\Off;',
    '    SingArea\\Wrist;',
    '    IF pNula.trans.x = 0 AND pNula.trans.y = 0 AND pNula.trans.z = 0 THEN',
    '      TPWrite "FTQ: pNula nije naucena (' + rNula + ', Modify Position).";',
    '      EXIT;',
    '    ENDIF',
    '    TPWrite "FTQ proba: ' + n + ' pomaka, zProba = "\\Num:=zProba;',
  ];
  return { tekst: H.concat(out, ['    ConfL\\On;', '  ENDPROC', 'ENDMODULE', '']).join('\r\n'), n, rutine: [rNula, rPisi], greske: [] };
}
