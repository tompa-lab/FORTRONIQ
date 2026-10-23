/* FORTRONIQ · Haas TL-1 — automatski rad CNC-a za robotsku stanicu (bez privjeska): program se učita, pokrene signalom,
   obrađuje pripremak u steznoj glavi (2D mreža → rotacijsko tijelo) i na kraju (M30) daje signal „program gotov”.
   Sažeta inačica jezgre iz ngc_tl1.js.  © ForTroniQ d.o.o. */
import { pretvori } from './tl1_gkod.js?v=02';
import { GEO } from './stroj_tl1.js?v=02';
import { ALATI_TL, napraviObradak as napraviO, ukloniObradak as ukloniO, rezi, uMaterijalu, osvjezi, provjeriOdrez, celo } from './tokarenje.js?v=02';

const HOD = GEO.HOD, R0 = GEO.R0, ZT0 = GEO.ZT0, BRZI = GEO.BRZI, S_MAX = GEO.S_MAX;
export const ALATI = ALATI_TL;

export function napraviCNC(THREE, S, o = {}) {
  const st = { fiz: { X: -100, Z: -300 }, alatU: 1, S: 0, Smax: 1800, css: false, rpm: 0, dir: 0, vrata: false, prog: null, run: null, alarm: null, poruka: 'READY', gotovSignal: false, uRadu: false, ubrzanje: 1, alati: {}, off54: { X: 0, Z: 0 } };
  Object.keys(ALATI).forEach((t) => { st.alati[t] = { X: -2 * R0 - 2 * ALATI[t].dr, Z: 0 }; });
  const vrh = () => { const a = ALATI[st.alatU]; return { x: ZT0 + st.fiz.Z + a.dx, r: R0 + st.fiz.X / 2 + a.dr }; };
  const na = (e, d) => { if (o.na) o.na(e, d); };
  let O = null;
  function napraviObradak(D, L, drz) { ukloniObradak(); O = napraviO(THREE, S.obrGrupa, { D, L, drz }); osvjezi(THREE, O); return O; }
  function ukloniObradak(zadrzi) { if (!O) return; if (!zadrzi) ukloniO(O, S.obrGrupa); O = null; }
  function alat(t) { st.alatU = t; const a = ALATI[t]; S.postaviAlat(a.vrsta); S.alatG.position.set(-40 + a.dx, 0, a.dr); }
  function nultocka(xc) { if (xc === undefined) { if (!O) return; xc = celo(O); } Object.keys(ALATI).forEach((t) => { st.alati[t].Z = xc - ZT0 - ALATI[t].dx; }); }
  function odaberi(tekst, ime) {
    const r = pretvori(tekst, { alati: st.alati, off: { 54: st.off54 }, start: { X: st.fiz.X, Z: st.fiz.Z }, T0: st.alatU, programi: {} });
    const ev = r.B.map((b, i) => (b.ev ? { i, ev: b.ev } : null)).filter(Boolean);
    st.prog = { ime, redci: String(tekst).replace(/\r/g, '').split('\n'), B: r.B, P: r.P, SB: r.S, ev, greske: r.greske.filter((g) => g.alarm) };
    return st.prog;
  }
  function start() {
    if (st.alarm) { st.poruka = 'ALARM — potreban RESET'; return false; }
    if (!st.prog) { st.poruka = 'Nema programa'; return false; }
    if (st.vrata) { st.poruka = 'DOOR OPEN — door hold'; na('doorHold'); return false; }
    if (st.run && st.run.ide) return false;
    if (st.run && !st.run.gotov && st.run.i > 0) { st.run.ide = true; st.uRadu = true; st.poruka = 'PROGRAM RUNNING — ' + st.prog.ime + ' (nastavak)'; na('start'); return true; }
    st.run = { i: 0, evI: 0, ide: true, gotov: false, trenBlok: -1, zapoceta: -1 };
    st.gotovSignal = false; st.uRadu = true; st.poruka = 'PROGRAM RUNNING — ' + st.prog.ime; na('start'); return true;
  }
  function stop(razlog) { if (st.run) st.run.ide = false; st.dir = 0; st.uRadu = false; st.poruka = razlog || 'STOP'; }
  function reset() { st.alarm = null; st.run = null; st.dir = 0; st.uRadu = false; st.poruka = 'READY'; }
  function rpmCilj() { if (!st.dir || st.vrata) return 0; let n = st.S; if (st.css) { const Dd = Math.max(1, 2 * Math.abs(R0 + st.fiz.X / 2 + ALATI[st.alatU].dr)); n = Math.min(st.Smax, 1000 * st.S / (Math.PI * Dd)); } return Math.min(S_MAX, n); }
  function korak(dt) {
    const A = st.run; if (A && A.ide && !st.alarm) {
      let ost = dt * st.ubrzanje;
      while (ost > 0 && A.i < st.prog.P.length) {
        const p = st.prog.P[A.i], blok = p[4];
        if (A.zapoceta !== A.i) { A.zapoceta = A.i; while (A.evI < st.prog.ev.length && st.prog.ev[A.evI].i <= blok) { const e = st.prog.ev[A.evI].ev; if (e.alat !== undefined && e.alat !== st.alatU) alat(e.alat); A.evI++; } }
        if (blok !== A.trenBlok) { A.trenBlok = blok; }
        const sb = st.prog.SB[blok]; st.dir = sb.dir; st.css = sb.css; st.Smax = sb.max || 1800; st.S = sb.S;
        { const c = rpmCilj(); if (c > st.rpm) st.rpm = c; }
        const cilj = { X: p[0], Z: p[1] };
        for (const q of ['X', 'Z']) if (cilj[q] < HOD[q][0] - 1e-6 || cilj[q] > HOD[q][1] + 1e-6) { st.alarm = { br: { X: 316, Z: 318 }[q], tekst: q + ' OVER TRAVEL RANGE' }; stop('ALARM ' + st.alarm.br + ' ' + st.alarm.tekst); na('alarm', st.alarm); return; }
        const d = { X: (cilj.X - st.fiz.X) / 2, Z: cilj.Z - st.fiz.Z };
        const v = p[2] === 0 ? BRZI : Math.min(BRZI, Math.max(0.5, p[5] ? p[3] * Math.max(st.rpm, 50) : p[3]));
        const t = (p[2] === 0 ? Math.max(Math.abs(d.X), Math.abs(d.Z)) : Math.hypot(d.X, d.Z)) / v * 60;
        let u; if (t <= ost) { u = 1; ost -= t; } else { u = ost / t; ost = 0; }
        const od = { ...st.fiz }, nov = u >= 1 ? cilj : { X: od.X + (cilj.X - od.X) * u, Z: od.Z + (cilj.Z - od.Z) * u };
        const n = Math.max(1, Math.ceil(Math.hypot((nov.X - od.X) / 2, nov.Z - od.Z) / 0.15));
        for (let k = 1; k <= n; k++) { const s = k / n; st.fiz = { X: od.X + (nov.X - od.X) * s, Z: od.Z + (nov.Z - od.Z) * s }; if (O) { const tt = vrh(); if (p[2] === 1 && st.rpm > 30) { const r = rezi(O, ALATI[st.alatU], tt.x, tt.r); if (r.skinuto) provjeriOdrez(O); } else if (uMaterijalu(O, ALATI[st.alatU], tt.x, tt.r) > 3) { st.alarm = { br: 9999, tekst: 'SUDAR (brzi hod / vreteno stoji)' }; stop('ALARM SUDAR'); na('alarm', st.alarm); return; } } }
        if (u >= 1) A.i++;
      }
      if (A.i >= st.prog.P.length) { A.ide = false; A.gotov = true; st.dir = 0; st.uRadu = false; st.gotovSignal = true; st.poruka = 'PROGRAM END (M30) — ' + st.prog.ime; na('kraj'); }
    }
    const c = rpmCilj(), ac = 1500 * dt * Math.max(1, st.ubrzanje);
    st.rpm = st.rpm < c ? Math.min(c, st.rpm + ac) : Math.max(c, st.rpm - ac);
    if (st.rpm > 0) S.okreniGlavu(S.kutGlave + Math.min(0.6, st.rpm / 1800 * 0.6));
    if (O) osvjezi(THREE, O);
    S.postaviOsi(st.fiz.X, st.fiz.Z);
  }
  /* osi u položaj za utovar: suport daleko (+X, +Z) — kao G28 */
  function uPolozajUtovara(dt) {
    const c = { X: -100, Z: -300 }; const v = BRZI / 60 * dt * st.ubrzanje; let gotov = true;
    for (const q of ['X', 'Z']) { const d = c[q] - st.fiz[q]; if (Math.abs(d) > 1e-6) { gotov = false; st.fiz[q] += Math.abs(d) <= v * (q === 'X' ? 2 : 1) ? d : Math.sign(d) * v * (q === 'X' ? 2 : 1); } }
    S.postaviOsi(st.fiz.X, st.fiz.Z); return gotov;
  }
  alat(1);
  return { st, get O() { return O; }, napraviObradak, ukloniObradak, nultocka, odaberi, start, stop, reset, korak, uPolozajUtovara, alat, vrh };
}
