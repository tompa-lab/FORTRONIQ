// FORTRONIQ · CO₂ laser · kontroler Leetro MPC6565 i ploča PAD03
// Ponašanje ploče prema „Laser Engraving & Cutting Control System Manual” (DSP5.3), pogl. 7 i 9.
import { profil, putUVremenu, stanjeU, vrijeme } from './lc-jezgra.js';

const BOOT = ['SYSTEM STARTING', 'PLEASE  WAIT', '     V4.0.0', ''];
const IZB = ['CUT CONTROL', 'LASER SET', 'JOG SET', 'LANGUAGE'];
const POLJA = ['FILE', 'SPEED', 'PLOW', 'PHIGH', 'PIECES', 'DEL'];

export class Kontroler {
  constructor(opc) {
    this.o = opc; // { wt(), stroj(), dnevnik(txt, vrsta), promjena() }
    this.datoteke = []; this.tren = -1;
    this.napon = false; this.ekran = 'iskljuceno'; this.kursor = 0; this.oznaceno = true;
    this.brzina = 100; this.pNisko = 100; this.pVisoko = 100; this.komada = 1;
    this.izbKursor = 0; this.laserVrijeme = 0; this.laserSnaga = 100; this.jogUdaljenost = 0; this.setPolje = 0; this.jezik = 2;
    this.X = 0; this.Y = 0; this.Z = 0; this.datumOK = false; this.zNacin = false;
    this.gib = null;          // aktivno pomoćno gibanje {koraci:[{x0,y0,x1,y1,pr,laser}], t, gotovo}
    this.obrada = null;       // {dat, t, pomak, komad, pauza, stop}
    this.laserTipka = false;  // drži se tipka Laser
    this.greska = null; this.vrijemeObrade = 0;
  }
  // ── napajanje ──
  ukljuci() {
    if (this.napon) return; this.napon = true; this.ekran = 'boot'; this.bootT = 0; this.datumOK = false;
    this.o.dnevnik('PAD03: SYSTEM STARTING — kontroler se pokreće.');
  }
  iskljuci() { this.napon = false; this.ekran = 'iskljuceno'; this.gib = null; this.obrada = null; this.laserTipka = false; }
  get radi() { return !!(this.obrada && !this.obrada.pauza && !this.obrada.stop); }

  // ── datoteke u memoriji kontrolera (DownLoad) ──
  preuzmi(dat) {
    const i = this.datoteke.findIndex(d => d.ime === dat.ime);
    if (i < 0 && this.datoteke.length >= 32) { this.greska = 'OUT OF MEMORY'; this.ekran = 'greska'; this.o.dnevnik('PAD03: OUT OF MEMORY — u kontroleru je već 32 datoteke (najviše). Obriši datoteke (Del / Del all).', 'upoz'); return false; }
    if (i >= 0) this.datoteke[i] = dat; else this.datoteke.push(dat);
    this.tren = i >= 0 ? i : this.datoteke.length - 1;
    if (this.ekran === 'glavni' || this.ekran === 'boot') this.ekran = 'glavni';
    this.o.promjena(); return true;
  }
  obrisi(i) { this.datoteke.splice(i, 1); this.tren = Math.min(this.tren, this.datoteke.length - 1); this.o.promjena(); }
  obrisiSve() { this.datoteke = []; this.tren = -1; this.o.promjena(); }

  // ── retci zaslona ──
  retci() {
    const dat = this.datoteke[this.tren];
    const ime = dat ? dat.ime : '--------';
    const k = (polje, txt) => (this.ekran === 'glavni' && this.oznaceno && POLJA[this.kursor] === polje) ? `[${txt}]` : txt;
    const p3 = v => String(v).padStart(3, ' ');
    switch (this.ekran) {
      case 'iskljuceno': return ['', '', '', ''];
      case 'boot': return BOOT;
      case 'glavni': return [`FILE ${k('FILE', ime)}`, `  SPEED ${k('SPEED', p3(this.brzina) + '%')}`, `POWER ${k('PLOW', p3(this.pNisko))}/${k('PHIGH', p3(this.pVisoko) + '%')}`, `PIECES${k('PIECES', p3(this.komada))}  ${k('DEL', 'DEL')}`];
      case 'obrada': return [`FILE ${ime}`, `  SPEED ${p3(this.brzina)}%`, `POWER ${p3(this.pNisko)}/${p3(this.pVisoko)}%`, `TIME  ${vrijeme(this.vrijemeObrade).replace(/:/g, '-')}`];
      case 'stop': return ['', ' STOP PROCESSING', '', ''];
      case 'izbornik': return IZB.map((t, i) => (i === this.izbKursor ? '>' : ' ') + t);
      case 'laserSet': return ['LASER TIME SET', (this.setPolje === 0 ? '>' : ' ') + String(this.laserVrijeme).padStart(6, ' ') + 'ms', 'POWER SET', (this.setPolje === 1 ? '>' : ' ') + p3(this.laserSnaga) + '%'];
      case 'jogSet': return ['DISTANCE SET', '', '   ' + this.jogUdaljenost.toFixed(1).padStart(6, ' ') + ' MM', ''];
      case 'jezik': return ['简体中文', '繁体中文', 'ENGLISH', ''].map((t, i) => i < 3 ? (i === this.jezik ? '>' : ' ') + t : t);
      case 'greska': return ['', '  ' + this.greska, '', ''];
      case 'datum': return ['', '   DATUM ...', '', ''];
      case 'test': return ['', '   TEST ...', '', ''];
      case 'autofokus': return ['', '  Z DATUM ...', '', ''];
    }
    return ['', '', '', ''];
  }

  // ── pomoćna gibanja (Datum, Test, jog, Cut BDR) ──
  gibanje(tocke, v, a, laser = 0, nakon = null) {
    const wt = this.o.wt(), K = []; let x = this.X, y = this.Y, t = 0;
    for (const [px, py] of tocke) { const L = Math.hypot(px - x, py - y); if (L > 1e-6) { const pr = profil(L, Math.min(wt.startSpeed, v), Math.min(wt.startSpeed, v), v, a); K.push({ pr, x0: x, y0: y, x1: px, y1: py, t0: t, laser }); t += pr.t; } x = px; y = py; }
    this.gib = { K, t: 0, T: t, nakon };
  }
  datum() {
    const wt = this.o.wt();
    this.ekran = 'datum';
    this.gibanje([[wt.xRange, wt.yRange]], wt.datumSpeed, wt.workAcc, 0, () => { this.datumOK = true; this.ekran = 'glavni'; this.o.dnevnik('Datum: glava je u ishodištu stroja (prekidači X+ i Y+, Datum Direction „P Dir”).'); });
  }
  okvirTrenutne(dat) {
    const b = dat.okvir; if (!b) return null;
    const pm = this.pomakZa(dat);
    return { x0: b.x0 + pm[0], y0: b.y0 + pm[1], x1: b.x1 + pm[0], y1: b.y1 + pm[1] };
  }
  pomakZa(dat) { return dat.immediate ? [this.X - dat.ref[0], this.Y - dat.ref[1]] : [0, 0]; }
  uRasponu(b) { const wt = this.o.wt(); return b.x0 >= -0.01 && b.y0 >= -0.01 && b.x1 <= wt.xRange + 0.01 && b.y1 <= wt.yRange + 0.01; }

  // ── tipke ploče ──
  tipka(t, dolje = true) {
    if (!this.napon || this.ekran === 'boot') return;
    if (t === 'laser') { this.laserTipka = dolje; if (dolje && this.laserVrijeme > 0) this.laserDo = performance.now() + this.laserVrijeme; return; }
    if (!dolje) { if (['gore', 'dolje', 'lijevo', 'desno'].includes(t)) this.drzi = null; return; }
    const wt = this.o.wt(), s = this.o.stroj();
    if (this.ekran === 'greska') { if (t === 'esc') { this.ekran = 'glavni'; this.greska = null; } return; }
    if (this.ekran === 'stop') { if (t === 'esc') { this.ekran = 'glavni'; this.obrada = null; } return; }
    if (t === 'z') { if (s.zOs) { this.zNacin = !this.zNacin; this.o.dnevnik(this.zNacin ? 'Z: strelice ↑ ↓ sada pomiču stol (os Z). Datum u ovom načinu pokreće autofokus.' : 'Z: strelice opet pomiču glavu po X i Y.'); } else this.o.dnevnik('Tipka Z: ova funkcija treba sklopovsku podršku (os Z) — LG500DM je nema, fokus se podešava ručno.', 'upoz'); this.o.promjena(); return; }
    if (this.ekran === 'obrada') {
      const ob = this.obrada;
      if (t === 'start') { ob.pauza = !ob.pauza; this.o.dnevnik(ob.pauza ? 'Pause: obrada zaustavljena (meko kočenje).' : 'Start/Pause: obrada se nastavlja.'); }
      else if (t === 'stop') { ob.stop = true; this.ekran = 'stop'; this.o.dnevnik('Stop: obrada prekinuta, glava se vraća na početnu točku. Na višoj brzini najprije Pause, pa Stop (upute, 8.4).', 'upoz'); this.gibanje([ob.povratak], wt.quickSpeed, wt.spaceAcc); }
      else if (t === 'lijevo') this.pVisoko = Math.max(0, this.pVisoko - 1);
      else if (t === 'desno') this.pVisoko = Math.min(100, this.pVisoko + 1);
      else if (t === 'gore') this.brzina = Math.min(100, this.brzina + 1);
      else if (t === 'dolje') this.brzina = Math.max(0, this.brzina - 1);
      this.o.promjena(); return;
    }
    if (this.ekran === 'izbornik') {
      if (t === 'gore' || t === 'lijevo') this.izbKursor = (this.izbKursor + 3) % 4;
      else if (t === 'dolje' || t === 'desno') this.izbKursor = (this.izbKursor + 1) % 4;
      else if (t === 'esc') this.ekran = 'glavni';
      else if (t === 'enter') {
        if (this.izbKursor === 0) { const d = this.datoteke[this.tren]; if (!d) this.o.dnevnik('CUT BDR: nema datoteke u kontroleru.', 'upoz'); else { const b = this.okvirTrenutne(d); if (!this.uRasponu(b)) { this.greska = 'SOFT STOP'; this.ekran = 'greska'; } else { this.ekran = 'glavni'; this.o.dnevnik('CUT BDR: glava reže okvir oko datoteke (laser uključen).', 'upoz'); this.gibanje([[b.x1, b.y1], [b.x0, b.y1], [b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1]], Math.min(d.vOkvir || 20, wt.testFast), wt.workAcc, 1); } } }
        else this.ekran = ['', 'laserSet', 'jogSet', 'jezik'][this.izbKursor], this.setPolje = 0;
      }
      this.o.promjena(); return;
    }
    if (this.ekran === 'laserSet') {
      if (t === 'lijevo' || t === 'desno') this.setPolje = 1 - this.setPolje;
      else if (t === 'gore') { if (this.setPolje) this.laserSnaga = Math.min(100, this.laserSnaga + 5); else this.laserVrijeme = Math.min(99999, this.laserVrijeme + 50); }
      else if (t === 'dolje') { if (this.setPolje) this.laserSnaga = Math.max(0, this.laserSnaga - 5); else this.laserVrijeme = Math.max(0, this.laserVrijeme - 50); }
      else if (t === 'enter' || t === 'esc') this.ekran = 'izbornik';
      this.o.promjena(); return;
    }
    if (this.ekran === 'jogSet') {
      if (t === 'gore') this.jogUdaljenost = Math.round((this.jogUdaljenost + 1) * 10) / 10;
      else if (t === 'desno') this.jogUdaljenost = Math.round((this.jogUdaljenost + 10) * 10) / 10;
      else if (t === 'dolje') this.jogUdaljenost = Math.max(0, Math.round((this.jogUdaljenost - 1) * 10) / 10);
      else if (t === 'lijevo') this.jogUdaljenost = Math.max(0, Math.round((this.jogUdaljenost - 10) * 10) / 10);
      else if (t === 'enter' || t === 'esc') this.ekran = 'izbornik';
      this.o.promjena(); return;
    }
    if (this.ekran === 'jezik') {
      if (t === 'gore' || t === 'lijevo') this.jezik = (this.jezik + 2) % 3; else if (t === 'dolje' || t === 'desno') this.jezik = (this.jezik + 1) % 3;
      else if (t === 'enter' || t === 'esc') { this.ekran = 'izbornik'; if (this.jezik !== 2) this.o.dnevnik('LANGUAGE: u simulatoru zaslon ostaje na engleskom (na stroju se prebacuje na kineski).'); }
      this.o.promjena(); return;
    }
    if (this.ekran !== 'glavni') return;
    if (this.gib && t !== 'stop') return; // dok traje Datum/Test, ploča čeka
    // glavni zaslon
    if (t === 'menu') { this.ekran = 'izbornik'; this.izbKursor = 0; }
    else if (t === 'esc') { this.oznaceno = false; this.o.dnevnik('Esc: polja se više ne mijenjaju — strelice sada ručno pomiču glavu.'); }
    else if (t === 'enter') {
      if (!this.oznaceno) this.oznaceno = true;
      else if (POLJA[this.kursor] === 'DEL') { if (this.tren >= 0) { this.o.dnevnik(`DEL: datoteka ${this.datoteke[this.tren].ime} obrisana iz kontrolera.`); this.obrisi(this.tren); } }
      else this.o.dnevnik('Enter: postavke spremljene.');
    }
    else if (t === 'datum') {
      if (this.zNacin && s.zOs) { this.o.autofokus(); }
      else this.datum();
    }
    else if (t === 'test') {
      const d = this.datoteke[this.tren]; if (!d) { this.o.dnevnik('Test: u kontroleru nema datoteke.', 'upoz'); return; }
      const b = this.okvirTrenutne(d);
      if (!this.uRasponu(b)) { this.greska = 'SOFT STOP'; this.ekran = 'greska'; this.o.dnevnik('SOFT STOP: okvir datoteke izlazi iz radnog polja. Pomakni glavu (Esc, pa strelice) ili isključi Immediate i ponovno preuzmi datoteku.', 'upoz'); this.o.promjena(); return; }
      const v = wt.autoDatum ? wt.testFast : wt.testSlow, x = this.X, y = this.Y;
      this.ekran = 'test'; this.o.dnevnik('Test: glava obilazi okvir datoteke s isključenim laserom — provjeri leži li materijal ispod cijelog crteža.');
      this.gibanje([[b.x1, b.y1], [b.x0, b.y1], [b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [x, y]], v, wt.workAcc, 0, () => { this.ekran = 'glavni'; });
    }
    else if (t === 'start') this.pokreni();
    else if (['gore', 'dolje', 'lijevo', 'desno'].includes(t)) {
      if (this.oznaceno) {
        if (t === 'lijevo') this.kursor = (this.kursor + POLJA.length - 1) % POLJA.length;
        else if (t === 'desno') this.kursor = (this.kursor + 1) % POLJA.length;
        else { const d = t === 'gore' ? 1 : -1, P = POLJA[this.kursor];
          if (P === 'FILE' && this.datoteke.length) this.tren = (this.tren + d + this.datoteke.length) % this.datoteke.length;
          if (P === 'SPEED') this.brzina = Math.max(1, Math.min(100, this.brzina + d));
          if (P === 'PLOW') this.pNisko = Math.max(0, Math.min(100, this.pNisko + d));
          if (P === 'PHIGH') this.pVisoko = Math.max(0, Math.min(100, this.pVisoko + d));
          if (P === 'PIECES') this.komada = Math.max(1, Math.min(999, this.komada + d)); }
      } else if (this.zNacin && (t === 'gore' || t === 'dolje')) { this.drzi = { z: t === 'gore' ? 1 : -1 }; }
      else {
        const dx = t === 'lijevo' ? -1 : t === 'desno' ? 1 : 0, dy = t === 'gore' ? 1 : t === 'dolje' ? -1 : 0;
        if (this.jogUdaljenost > 0) { const nx = Math.max(0, Math.min(wt.xRange, this.X + dx * this.jogUdaljenost)), ny = Math.max(0, Math.min(wt.yRange, this.Y + dy * this.jogUdaljenost)); this.gibanje([[nx, ny]], wt.autoDatum ? wt.testFast : wt.testSlow, wt.workAcc); }
        else this.drzi = { dx, dy };
      }
    }
    else if (t === 'stop') { if (this.gib) { this.gib = null; this.ekran = 'glavni'; } }
    this.o.promjena();
  }

  // ── obrada datoteke ──
  pokreni(dat = null, izvor = 'PAD03') {
    const d = dat || this.datoteke[this.tren];
    if (!d) { this.o.dnevnik('Start/Pause: u kontroleru nema datoteke — u LaserCutu Calculate, pa DownLoad.', 'upoz'); return false; }
    const prov = this.o.provjeraPrijeStarta(d); if (prov === false) return false;
    const pm = this.pomakZa(d), b = this.okvirTrenutne(d);
    if (b && !this.uRasponu(b)) {
      this.greska = d.immediate ? 'SOFT STOP' : 'LIMIT STOP'; this.ekran = 'greska';
      this.o.dnevnik(d.immediate ? 'SOFT STOP: s uključenim Immediate crtež kreće od trenutnog položaja glave i izlazi iz radnog polja. Pomakni glavu strelicama ili isključi Immediate i ponovno preuzmi.' : 'LIMIT STOP: crtež izlazi iz radnog polja stola.', 'upoz');
      this.o.promjena(); return false;
    }
    const pocetak = [this.X, this.Y];
    this.obrada = { dat: d, t: 0, pomak: pm, komad: 1, pauza: false, stop: false, povratak: pocetak, prilaz: null, izvor };
    // prilaz s trenutnog položaja do početka posla (ako nije Immediate)
    const k0 = d.posao.koraci[0];
    if (k0) { const sx = k0.x0 + pm[0], sy = k0.y0 + pm[1]; const L = Math.hypot(sx - this.X, sy - this.Y); if (L > 0.01) { const wt = this.o.wt(); this.obrada.prilaz = { pr: profil(L, wt.startSpeed, wt.startSpeed, wt.quickSpeed, wt.spaceAcc), x0: this.X, y0: this.Y, x1: sx, y1: sy, t: 0 }; } }
    this.vrijemeObrade = 0; this.ekran = 'obrada';
    this.o.dnevnik(`${izvor}: Start — obrada datoteke ${d.ime} (${d.immediate ? 'Immediate: od položaja glave' : 'po koordinatama crteža'}), ${this.komada} kom.`);
    this.o.promjena(); return true;
  }

  // korak simulacije; dt u s (već pomnoženo ubrzanjem simulacije); vraća stanje glave i odsječke za paljenje
  korak(dt, dtStvarno) {
    const out = { laser: false, snaga: 0, spali: [] };
    if (!this.napon) return out;
    const wt = this.o.wt();
    if (this.ekran === 'boot') { this.bootT += dtStvarno; if (this.bootT > 1.6) { this.ekran = 'glavni'; if (wt.autoDatum) this.datum(); } return out; }
    // ručno pomicanje dok se drži strelica
    if (this.drzi && !this.gib && !this.obrada) {
      if (this.drzi.z) this.o.pomakniZ(this.drzi.z * 5 * dt);
      else { const v = wt.autoDatum ? wt.testFast * 0.25 : wt.testSlow * 0.25; this.X = Math.max(0, Math.min(wt.xRange, this.X + this.drzi.dx * v * dt)); this.Y = Math.max(0, Math.min(wt.yRange, this.Y + this.drzi.dy * v * dt)); }
    }
    // pomoćno gibanje
    if (this.gib) {
      const g = this.gib, t0 = g.t; g.t = Math.min(g.T, g.t + dt);
      for (const k of g.K) {
        const a = Math.max(t0, k.t0), b = Math.min(g.t, k.t0 + k.pr.t); if (b < k.t0) continue;
        const f = tt => { const [s] = putUVremenu(k.pr, tt - k.t0); const q = k.pr.L ? s / k.pr.L : 1; return [k.x0 + (k.x1 - k.x0) * q, k.y0 + (k.y1 - k.y0) * q]; };
        const [x, y] = f(b); this.X = x; this.Y = y;
        if (k.laser && b > a) { const [xa, ya] = f(a); out.spali.push([xa, ya, x, y, 1, 0.6]); out.laser = true; out.snaga = 60; }
      }
      if (g.t >= g.T) { const n = g.nakon; this.gib = null; if (this.ekran === 'datum' || this.ekran === 'test') this.ekran = 'glavni'; if (n) n(); }
      return out;
    }
    // ručno paljenje (Laser)
    if (this.laserTipka || (this.laserDo && performance.now() < this.laserDo)) { out.laser = true; out.snaga = this.laserSnaga; out.spali.push([this.X, this.Y, this.X + 0.01, this.Y, 1, this.laserSnaga / 100, true]); if (this.laserVrijeme > 0 && performance.now() >= this.laserDo) this.laserTipka = false; }
    // obrada
    const ob = this.obrada;
    if (ob && !ob.pauza && !ob.stop) {
      const ddt = dt * this.brzina / 100;
      this.vrijemeObrade += dt;
      if (ob.prilaz) {
        const p = ob.prilaz; p.t = Math.min(p.pr.t, p.t + ddt); const [s] = putUVremenu(p.pr, p.t); const q = p.pr.L ? s / p.pr.L : 1;
        this.X = p.x0 + (p.x1 - p.x0) * q; this.Y = p.y0 + (p.y1 - p.y0) * q;
        if (p.t >= p.pr.t) ob.prilaz = null; return out;
      }
      const P = ob.dat.posao, T = P.st.ukupno, t0 = ob.t;
      ob.t = Math.min(T, ob.t + ddt);
      const s0 = stanjeU(P, t0), s1 = stanjeU(P, ob.t);
      if (s0 && s1) {
        const K = P.koraci;
        for (let i = s0.i; i <= s1.i; i++) {
          const k = K[i]; if (!k.laser) continue;
          const a = Math.max(t0, k.t0), b = Math.min(ob.t, k.t0 + k.t); if (b <= a && k.laser !== 3) continue;
          const sa = putUVremenu(k, a - k.t0)[0], sb = putUVremenu(k, b - k.t0)[0];
          const pt = s => { const q = k.L ? s / k.L : 1; return [k.x0 + (k.x1 - k.x0) * q + ob.pomak[0], k.y0 + (k.y1 - k.y0) * q + ob.pomak[1]]; };
          const sn = (k.p * this.pVisoko / 100) / 100;
          if (k.laser === 1) { const [xa, ya] = pt(sa), [xb, yb] = pt(sb); out.spali.push([xa, ya, xb, yb, k.sloj, sn]); }
          else if (k.laser === 2) { for (const [p, q] of k.iv) { const lo = Math.max(p, sa), hi = Math.min(q, sb); if (hi > lo) { const [xa, ya] = pt(lo), [xb, yb] = pt(hi); out.spali.push([xa, ya, xb, yb, k.sloj, sn, false, k.sirina]); } } }
          else if (k.laser === 3) { const [xa, ya] = pt(0); out.spali.push([xa, ya, xa + 0.01, ya, k.sloj, sn, true]); }
        }
        this.X = s1.x + ob.pomak[0]; this.Y = s1.y + ob.pomak[1];
        out.laser = s1.laser && ob.t < T; out.snaga = s1.snaga * this.pVisoko / 100; out.v = s1.v * this.brzina / 100; out.sloj = s1.k.sloj;
      }
      if (ob.t >= T) {
        if (ob.komad < this.komada) { ob.komad++; ob.t = 0; this.o.dnevnik(`PIECES: komad ${ob.komad} od ${this.komada}.`); }
        else { this.o.dnevnik(`Gotovo: ${ob.dat.ime}, vrijeme ${vrijeme(this.vrijemeObrade)}. Pričekaj da odsis izvuče dim, pa otvori poklopac.`); this.obrada = null; this.ekran = 'glavni'; this.o.gotovo?.(); }
        this.o.promjena();
      }
    }
    return out;
  }
}
