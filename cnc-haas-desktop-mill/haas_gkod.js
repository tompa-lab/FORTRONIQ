/* FORTRONIQ · Haas dijalekt G-koda: predprocesor koji program za upravljanje Haas (NGC) pretvara u ravne blokove
   G0/G1/G2/G3 u koordinatama stroja (vrh alata), za zajednički prevoditelj gkod.js, te objašnjenje Haas riječi na hrvatskom.
   Riječi: % O N ( ) G20 G21 G28 G53 G43/G49 H G54–G59 G80–G89 G73 G98/G99 R Q P L G12/G13 I K Q D G04 G187 M97/M98/M99 M00/M01 M06.
   Ponašanje po Haas Mill Operator's Manualu (javno, haascnc.com) — zasloni i tekst su naši.  © ForTroniQ d.o.o. */
import { razlozi, objasni, ocisti } from './gkod.js?v=02';

const kr = (v) => (Math.round(v * 1000) / 1000).toString().replace('.', ',');
const CIKLUSI = [73, 74, 76, 81, 82, 83, 84, 85, 86, 87, 88, 89];
const G_POZNATI = new Set([0, 1, 2, 3, 4, 9, 12, 13, 17, 18, 19, 20, 21, 28, 40, 41, 42, 43, 44, 49, 50, 51, 53, 54, 55, 56, 57, 58, 59, 61, 64, 80, 90, 91, 94, 98, 99, 103, 154, 187, ...CIKLUSI]);
const M_POZNATI = new Set([0, 1, 2, 3, 4, 5, 6, 8, 9, 19, 30, 31, 33, 34, 35, 36, 41, 42, 51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 66, 67, 68, 69, 75, 76, 77, 78, 79, 88, 89, 95, 96, 97, 98, 99]);
const OSI = ['X', 'Y', 'Z'];

/* broj bez decimalne točke: Haas ga čita kao tisućinke (mm) — X1 = 0,001 mm. Vraća { v, bezTocke } */
function haasBroj(txt) { const bez = !/\./.test(txt); const v = parseFloat(txt); return { v: bez ? v / 1000 : v, bez }; }
/* rastavi blok u riječi uz Haas pravilo o decimalnoj točki (za X Y Z I J K R Q) */
export function rijeci(red) {
  const { kod, kom } = ocisti(red);
  const w = { G: [], M: [], _bez: [] };
  const re = /([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g; let m;
  while ((m = re.exec(kod))) {
    const a = m[1];
    if (a === 'G' || a === 'M') w[a].push(parseFloat(m[2]));
    else if ('XYZIJKRQ'.includes(a)) { const b = haasBroj(m[2]); w[a] = b.v; if (b.bez) w._bez.push(a + m[2]); }
    else w[a] = parseFloat(m[2]);
  }
  return { kod, kom, w };
}

/* ------------------------------------------------------------------ predprocesor
   o: { offsets: {54:{X,Y,Z}, …}, H: {1: h, …}, Lt: (T) => duljina od čela vretena do vrha, polumjer: (T) => r, T0, programi: {O…: tekst}, optStop }
   izlaz: { B: [{ kod, red, prog, ev }], greske: [{red, alarm, tekst}], info } — kod je blok za gkod.prevedi u okviru stroja (vrh alata), G54 = 0 */
export function pretvori(tekst, o) {
  const B = [], greske = [], info = { O: null, naziv: '', M30: false, alati: new Set(), G20: false };
  const Lt = o.Lt || (() => 0), rAl = o.polumjer || (() => 0);
  const st = { abs: true, g: 0, T: o.T0 || 0, Talat: o.T0 || 0, h: 0, g43: false, off: 54, cik: null, g98: true, F: 0, inch: false, R: null, Zc: null, Q: null, P: null };
  const offZ = () => (o.offsets[st.off] || { X: 0, Y: 0, Z: 0 });
  const tipZ = (zProg) => zProg + offZ().Z + (st.g43 ? (o.H[st.h] || 0) : 0) - Lt(st.Talat);    /* apsolutni Z programa → Z vrha alata u okviru stroja (čelo = 0) */
  const skal = (v) => (st.inch ? v * 25.4 : v);
  let dubina = null;
  const gr = (red, alarm, t) => greske.push({ red, alarm, tekst: t });
  const emit = (kod, red, ev) => B.push({ kod, red, ev: ev || null });

  function obradi(redci, razina) {
    for (let red = 0; red < redci.length; red++) {
      const rr = redci[red]; if (razina === 0 && info.M30) break;
      const { kod, w } = rijeci(rr);
      if (!kod) { if (razina === 0) emit('', red); continue; }
      if (kod === '%') { continue; }
      if (/^O\d+/.test(kod)) { const m = kod.match(/^O(\d+)/); if (razina === 0 && info.O === null) { info.O = m[1]; const k = ocisti(rr).kom; info.naziv = k; } continue; }
      if (w._bez.length) gr(red, null, 'riječ ' + w._bez.join(', ') + ' bez decimalne točke — Haas je čita kao tisućinke (npr. X1 = 0,001 mm)');
      /* nepoznate G i M riječi → alarm kao na stroju */
      for (const g of w.G) if (!G_POZNATI.has(g)) { gr(red, 310, 'G' + g + ' ovo upravljanje ne poznaje'); return; }
      for (const m of w.M) if (!M_POZNATI.has(m)) { gr(red, 311, 'M' + m + ' ovo upravljanje ne poznaje'); return; }
      /* potprogrami */
      if (w.M.includes(97) || w.M.includes(98)) {
        if (razina > 8) { gr(red, null, 'predubok poziv potprograma'); return; }
        const L = w.L !== undefined ? Math.max(0, Math.round(w.L)) : 1, p = w.P;
        if (w.M.includes(97)) {
          const i = redci.findIndex((q) => new RegExp('^N' + Math.round(p) + '(\\D|$)').test(rijeci(q).kod));
          if (i < 0) { gr(red, 314, 'M97 P' + p + ': nema retka N' + p + ' u programu'); return; }
          const kraj = redci.slice(i).findIndex((q) => rijeci(q).w.M.includes(99)); if (kraj < 0) { gr(red, 322, 'lokalni potprogram N' + p + ' nema M99'); return; }
          const pod = redci.slice(i, i + kraj);
          for (let k = 0; k < L; k++) obradiPod(pod, i, razina + 1);
        } else {
          const ime = 'O' + String(Math.round(p)).padStart(5, '0');
          const txt = o.programi && (o.programi[ime] || o.programi[ime.replace(/^O0+/, 'O')]);
          if (!txt) { gr(red, 314, 'M98 P' + p + ': program ' + ime + ' nije u memoriji'); return; }
          const pod = String(txt).replace(/\r/g, '').split('\n');
          for (let k = 0; k < L; k++) obradiPod(pod, -1, razina + 1);
        }
        continue;
      }
      if (w.M.includes(99)) { if (razina === 0) { info.M30 = true; emit('', red, { kraj: true }); } return; }
      if (razina === 0 && w.M.includes(99)) return;
      /* modalne riječi */
      w.G.forEach((g) => {
        if (g === 90) st.abs = true; if (g === 91) st.abs = false;
        if (g === 20) { st.inch = true; info.G20 = true; } if (g === 21) st.inch = false;
        if (g >= 54 && g <= 59) st.off = g;
        if (g === 154 && w.P !== undefined) st.off = 154;
        if (g === 43) { st.g43 = true; if (w.H !== undefined) st.h = w.H; }
        if (g === 49) st.g43 = false;
        if ([0, 1, 2, 3].includes(g)) { st.g = g; st.cik = null; }
        if (g === 80) st.cik = null;
        if (CIKLUSI.includes(g)) { st.cik = g; st.R = null; st.Zc = null; }
        if (g === 98) st.g98 = true; if (g === 99) st.g98 = false;
      });
      if (w.H !== undefined && !w.G.includes(43) && st.g43) st.h = w.H;
      if (w.F !== undefined) st.F = skal(w.F);
      if (w.T !== undefined) { st.T = w.T; info.alati.add(w.T); }
      const ev = {};
      if (w.M.includes(6)) { ev.m06 = st.T; st.Talat = st.T; }
      if (w.M.includes(0)) ev.m00 = true; if (w.M.includes(1)) ev.m01 = true;
      if (w.M.includes(30) || w.M.includes(2)) { ev.kraj = true; if (razina === 0) info.M30 = true; }
      if (w.G.includes(4)) ev.g04 = w.P !== undefined ? (String(rr).match(/P\s*[\d]*\.\d+/) ? w.P * 1000 : w.P) : 0;
      /* G53, G28 — gibanja u koordinatama stroja (čelo vretena) */
      if (w.G.includes(28)) {
        const osi = OSI.filter((a) => w[a] !== undefined); const cilj = osi.length ? osi : OSI;
        if (osi.length && osi.some((a) => Math.abs(w[a]) > 1e-9 || st.abs)) {
          /* međutočka: u G91 pomak, u G90 apsolutna točka obratka */
          const med = osi.map((a) => a + (st.abs ? kr0(a === 'Z' ? tipZ(skal(w[a])) : skal(w[a]) + offZ()[a]) : kr0(skal(w[a])))).join(' ');
          emit((st.abs ? 'G90 ' : 'G91 ') + 'G0 ' + med, red);
        }
        emit('G90 G0 ' + cilj.map((a) => a + (a === 'Z' ? kr0(-Lt(st.Talat)) : '0')).join(' '), red, Object.keys(ev).length ? ev : null);
        if (!st.abs) emit('G91', red);
        continue;
      }
      if (w.G.includes(53)) {
        const osi = OSI.filter((a) => w[a] !== undefined);
        if (osi.length) { emit('G90 G' + (st.g === 0 ? 0 : 1) + ' ' + osi.map((a) => a + kr0(a === 'Z' ? skal(w.Z) - Lt(st.Talat) : skal(w[a]))).join(' ') + (st.g ? ' F' + st.F : ''), red, Object.keys(ev).length ? ev : null); if (!st.abs) emit('G91', red); }
        continue;
      }
      /* G12 / G13 kružni džep */
      if (w.G.includes(12) || w.G.includes(13)) {
        const ccw = w.G.includes(13), I = skal(w.I || 0), K = w.K !== undefined ? skal(w.K) : I, Q = w.Q ? skal(w.Q) : 0, L = w.L ? Math.max(1, Math.round(w.L)) : 1;
        const rk = w.D ? rAl(st.Talat) : 0;
        if (I <= 0) { gr(red, 306, 'G12/G13: I (polumjer) nedostaje'); return; }
        if (!st.F) { gr(red, 320, 'G12/G13 bez posmaka F'); return; }
        let zRel = w.Z !== undefined ? skal(w.Z) : null;
        for (let k = 0; k < L; k++) {
          const zb = zRel === null ? '' : (st.abs ? ' Z' + kr0(tipZ(zRel)) : ' Z' + kr0(zRel));
          emit((st.abs ? 'G90' : 'G91') + ' G1' + zb + ' F' + st.F, red, k === 0 && Object.keys(ev).length ? ev : null);
          const polumjeri = []; for (let r = I; r <= K + 1e-9 && polumjeri.length < 200; r += Q || (K - I + 1)) polumjeri.push(Math.max(0, r - rk));
          if (polumjeri.length && Math.abs(polumjeri[polumjeri.length - 1] - Math.max(0, K - rk)) > 1e-6) polumjeri.push(Math.max(0, K - rk));
          let rp = 0;
          polumjeri.forEach((r) => { if (r <= 0) return; emit('G91 G1 X' + kr0(r - rp) + ' F' + st.F, red); emit('G91 G' + (ccw ? 3 : 2) + ' X0 Y0 I' + kr0(-r) + ' J0 F' + st.F, red); rp = r; });
          if (rp > 0) emit('G91 G1 X' + kr0(-rp) + ' F' + st.F, red);
          emit(st.abs ? 'G90' : 'G91', red);
        }
        continue;
      }
      /* ciklusi bušenja */
      if (st.cik) {
        if (w.R !== undefined) st.R = skal(w.R); if (w.Z !== undefined) st.Zc = skal(w.Z); if (w.Q !== undefined) st.Q = skal(w.Q); if (w.P !== undefined) st.P = w.P;
        const ima = ['X', 'Y'].some((a) => w[a] !== undefined) || CIKLUSI.some((c) => w.G.includes(c));
        if (w.L === 0) continue;                                       /* L0: samo definicija */
        if (!ima) continue;
        if (st.R === null || st.Zc === null) { gr(red, null, 'ciklus G' + st.cik + ' bez R ili Z'); return; }
        if (!st.F) { gr(red, 320, 'ciklus G' + st.cik + ' bez posmaka F (alarm 320 NO FEED RATE)'); return; }
        const L = w.L !== undefined ? Math.max(1, Math.round(w.L)) : 1;
        for (let k = 0; k < L; k++) {
          const xy = ['X', 'Y'].filter((a) => w[a] !== undefined).map((a) => a + kr0(skal(w[a]) + (st.abs ? offZ()[a] : 0))).join(' ');
          if (xy) emit((st.abs ? 'G90' : 'G91') + ' G0 ' + xy, red, k === 0 && Object.keys(ev).length ? ev : null);
          /* R i Z: u G90 apsolutno; u G91 R je od početne ravnine, Z od R — simulator računa od trenutne točke prevoditelja */
          const Rb = st.abs ? 'G90 G0 Z' + kr0(tipZ(st.R)) : 'G91 G0 Z' + kr0(st.R);
          emit(Rb, red);
          const dno = st.abs ? tipZ(st.Zc) : null, rav = st.abs ? tipZ(st.R) : null;
          if (st.cik === 83 || st.cik === 73) {
            const q = st.Q || Math.abs(st.abs ? dno - rav : st.Zc);
            if (st.abs) { let z = rav; let n = 0; while (z > dno + 1e-9 && n++ < 500) { z = Math.max(dno, z - q); emit('G90 G1 Z' + kr0(z) + ' F' + st.F, red); if (z > dno + 1e-9) emit(st.cik === 83 ? 'G90 G0 Z' + kr0(rav) : 'G91 G0 Z1', red); if (z > dno + 1e-9 && st.cik === 83) emit('G90 G0 Z' + kr0(z + 1), red); if (st.cik === 73 && z > dno + 1e-9) emit('G91 G0 Z-1', red); } }
            else { let d = 0; const D = Math.abs(st.Zc); let n = 0; while (d < D - 1e-9 && n++ < 500) { const s = Math.min(q, D - d); emit('G91 G1 Z' + kr0(-s) + ' F' + st.F, red); d += s; if (d < D - 1e-9) { emit('G91 G0 Z' + kr0(st.cik === 83 ? d : 1), red); emit('G91 G0 Z' + kr0(-(st.cik === 83 ? d - 1 : 1)), red); } } }
          } else {
            emit(st.abs ? 'G90 G1 Z' + kr0(dno) + ' F' + st.F : 'G91 G1 Z' + kr0(st.Zc) + ' F' + st.F, red);
          }
          const natrag = st.g98 ? 'pocetna' : 'R';
          const posm = (st.cik === 84 || st.cik === 85 || st.cik === 89) ? 'G1' : 'G0';
          if (st.abs) emit('G90 ' + posm + ' Z' + kr0(natrag === 'R' ? rav : Math.max(rav, dubina === null ? rav : dubina)) + (posm === 'G1' ? ' F' + st.F : ''), red);
          else emit('G91 ' + posm + ' Z' + kr0(natrag === 'R' ? Math.abs(st.Zc) : Math.abs(st.Zc) + Math.abs(st.R)) + (posm === 'G1' ? ' F' + st.F : ''), red);
          emit(st.abs ? 'G90' : 'G91', red);
        }
        continue;
      }
      /* obično gibanje: X Y Z u okvir stroja (vrh alata) */
      const osi = OSI.filter((a) => w[a] !== undefined);
      const gib = w.G.find((g) => [0, 1, 2, 3].includes(g));
      if (!osi.length) { emit([...w.G.filter((g) => [0, 1, 2, 3, 90, 91].includes(g)).map((g) => 'G' + g), w.F !== undefined ? 'F' + st.F : '', w.S !== undefined ? 'S' + w.S : '', w.T !== undefined ? 'T' + w.T : '', ...w.M.filter((m) => [3, 4, 5, 6, 8, 9, 30].includes(m)).map((m) => 'M' + m)].filter(Boolean).join(' '), red, Object.keys(ev).length ? ev : null); continue; }
      if (st.g >= 1 && !st.F) { gr(red, 320, 'gibanje G' + st.g + ' bez posmaka F (alarm 320 NO FEED RATE)'); return; }
      const dio = osi.map((a) => { const v = skal(w[a]); if (!st.abs) return a + kr0(v); return a + kr0(a === 'Z' ? tipZ(v) : v + offZ()[a]); });
      if (st.abs && w.Z !== undefined) dubina = tipZ(skal(w.Z));
      ['I', 'J', 'K', 'R'].forEach((a) => { if (w[a] !== undefined) dio.push(a + kr0(skal(w[a]))); });
      const prefiks = (st.abs ? 'G90 ' : 'G91 ') + 'G' + (gib !== undefined ? gib : st.g);
      emit(prefiks + ' ' + dio.join(' ') + (st.g >= 1 || (gib !== undefined && gib >= 1) ? ' F' + st.F : '') + (w.S !== undefined ? ' S' + w.S : '') + w.M.filter((m) => [3, 4, 5, 8, 9].includes(m)).map((m) => ' M' + m).join(''), red, Object.keys(ev).length ? ev : null);
    }
    function obradiPod(pod, pocetak, razina) { obradi(pod, razina); void pocetak; }
  }
  obradi(String(tekst).replace(/\r/g, '').split('\n'), 0);
  if (!info.M30) gr(B.length ? B[B.length - 1].red : 0, null, 'program nema M30 (kraj programa)');
  return { B, greske, info };
}
function kr0(v) { return (Math.round(v * 10000) / 10000).toString(); }

/* ------------------------------------------------------------------ objašnjenje Haas bloka (hrvatski) */
const GH = {
  12: 'kružni džep u smjeru kazaljke (G12)', 13: 'kružni džep suprotno od kazaljke (G13)', 20: 'mjere u inčima (G20)', 21: 'mjere u milimetrima (G21)',
  28: 'povratak u nultočku stroja preko međutočke (G28)', 43: 'korekcija duljine alata (G43) — program zadaje vrh alata', 49: 'korekcija duljine alata isključena (G49)',
  53: 'koordinate stroja samo u ovom bloku (G53)', 54: 'pomak nultočke G54', 55: 'pomak nultočke G55', 56: 'pomak nultočke G56', 57: 'pomak nultočke G57', 58: 'pomak nultočke G58', 59: 'pomak nultočke G59',
  73: 'ciklus bušenja s lomljenjem strugotine (G73)', 74: 'ciklus narezivanja lijevog navoja (G74)', 76: 'ciklus finog bušenja (G76)', 80: 'ciklus poništen (G80)', 81: 'ciklus bušenja (G81)', 82: 'ciklus bušenja sa zastojem na dnu (G82)',
  83: 'ciklus dubokog bušenja s izvlačenjem (G83)', 84: 'ciklus narezivanja navoja (G84)', 85: 'ciklus razvrtanja — posmak dolje i gore (G85)', 86: 'ciklus bušenja sa zaustavljanjem vretena (G86)', 89: 'ciklus razvrtanja sa zastojem (G89)',
  98: 'povratak na početnu ravninu nakon ciklusa (G98)', 99: 'povratak na ravninu R nakon ciklusa (G99)', 187: 'točnost putanje / glatkoća (G187)', 154: 'dodatni pomak nultočke G154 P'
};
const MH = { 97: 'poziv lokalnog potprograma — skok na redak N (M97)', 98: 'poziv potprograma iz memorije (M98)', 99: 'kraj potprograma / povratak (M99)', 19: 'orijentacija vretena (M19)' };
export function objasniHaas(red, stanje = {}) {
  const s = Object.assign({ abs: true, g: 0, F: 0, S: 0, T: 0, x: 0, y: 0, z: 0, a: 0 }, stanje);
  const { kod, kom, w } = rijeci(red);
  if (kod === '%') return { tekst: 'Znak % označava početak i kraj programa (prijenos na stroj).', stanje: s };
  if (/^O\d+/.test(kod)) return { tekst: 'Broj programa ' + kod.match(/^O\d+/)[0] + (kom ? ' s nazivom „' + kom + '”' : '') + ' — pod tim imenom program je u memoriji (LIST PROGRAM).', stanje: s };
  if (!kod) return objasni(red, s);
  const d = [];
  if (w._bez.length) d.push('POZOR: ' + w._bez.join(', ') + ' bez decimalne točke — Haas čita kao tisućinke mm');
  const gs = w.G, haasG = gs.filter((g) => GH[g] !== undefined && g !== 20 && g !== 21 && g !== 28 && g !== 43 && g !== 49 && g !== 53 && !CIKLUSI.includes(g) && g !== 12 && g !== 13);
  haasG.forEach((g) => d.push(GH[g] + (g === 43 && w.H !== undefined ? ' H' + w.H : '')));
  if (gs.includes(43)) d.push(GH[43] + ' — zapis H' + (w.H !== undefined ? w.H : '?') + ' iz tablice OFFSET');
  if (gs.includes(49)) d.push(GH[49]);
  if (gs.includes(28)) {
    const osi = OSI.filter((a) => w[a] !== undefined); const inc = gs.includes(91) || (!s.abs && !gs.includes(90));
    const nula = inc && osi.every((a) => Math.abs(w[a]) < 1e-9);
    const t = 'povratak u nultočku stroja (G28) ' + (osi.length ? 'za os' + (osi.length > 1 ? 'i ' : ' ') + osi.join(', ') : 'za sve osi') + (nula ? ' — G91 ' + osi.map((a) => a + '0').join(' ') + ' znači bez međutočke, ravno u nultočku' : osi.length ? ' preko međutočke ' + osi.map((a) => a + kr(w[a])).join(' ') + (inc ? ' (inkrementalno)' : '') : '');
    const mm = w.M.map((m) => MH[m] || '').filter(Boolean);
    return { tekst: (d.length ? d.join('; ') + '. ' : '') + t.charAt(0).toUpperCase() + t.slice(1) + '.' + (mm.length ? ' ' + mm.join('; ') + '.' : ''), stanje: Object.assign(s, inc ? {} : {}) };
  }
  if (gs.includes(53)) d.push(GH[53]);
  if (gs.includes(154)) d.push(GH[154] + (w.P || ''));
  if (gs.includes(20)) d.push(GH[20]); if (gs.includes(21)) d.push(GH[21]);
  const cik = gs.find((g) => CIKLUSI.includes(g));
  if (cik !== undefined || gs.includes(12) || gs.includes(13)) {
    const t = [];
    if (cik !== undefined) { t.push(GH[cik] + ' na ' + ['X', 'Y'].filter((a) => w[a] !== undefined).map((a) => a + kr(w[a])).join(' ')); if (w.R !== undefined) t.push('ravnina R ' + kr(w.R)); if (w.Z !== undefined) t.push('dno Z' + kr(w.Z)); if (w.Q !== undefined) t.push('dubina zahvata Q ' + kr(w.Q)); if (w.P !== undefined) t.push('zastoj P ' + w.P); if (w.F !== undefined) t.push('posmak ' + kr(w.F) + ' mm/min'); if (w.L !== undefined) t.push('L' + w.L + (w.L === 0 ? ' — samo zadavanje, bez izvođenja' : ' ponavljanja')); }
    else { t.push((gs.includes(13) ? GH[13] : GH[12]) + ' oko trenutne točke'); if (w.I !== undefined) t.push('polumjer I ' + kr(w.I)); if (w.K !== undefined) t.push('završni polumjer K ' + kr(w.K)); if (w.Q !== undefined) t.push('korak Q ' + kr(w.Q)); if (w.Z !== undefined) t.push('dubina Z' + kr(w.Z)); if (w.D !== undefined) t.push('korekcija polumjera D' + w.D); if (w.L !== undefined) t.push('L' + w.L + ' prolaza'); if (w.F !== undefined) t.push('posmak ' + kr(w.F) + ' mm/min'); }
    return { tekst: t.join(', ') + '.' + (kom ? ' Komentar: „' + kom + '”.' : ''), stanje: Object.assign(s, w.F !== undefined ? { F: w.F } : {}) };
  }
  w.M.forEach((m) => { if (MH[m]) d.push(MH[m] + (w.P !== undefined ? ' P' + w.P : '') + (w.L !== undefined ? ' L' + w.L + ' puta' : '')); });
  /* ostatak bloka objasni zajednički modul (bez Haas riječi) */
  const ostatak = kod.replace(/G(1[23]|2[018]|4[349]|5[3-9]|154|187|9[89])(?![\d.])/g, ' ').replace(/[HPLDEK]\s*[-+]?\d*\.?\d+/g, ' ').replace(/M9[789]/g, ' ').replace(/\s+/g, ' ').trim();
  const ima = /[GMXYZFST]/.test(ostatak);
  const o = ima ? objasni(ostatak + (kom ? ' (' + kom + ')' : ''), s) : { tekst: '', stanje: s };
  let tekst = (d.length ? d.join('; ') + (ima ? '. ' : '.') : '') + (o.tekst === 'Blok bez naredbe koju simulator objašnjava.' && d.length ? '' : o.tekst);
  if (!tekst) tekst = kom ? 'Komentar: „' + kom + '” — upravljanje ga ne izvodi.' : 'Prazan redak.';
  return { tekst: tekst.charAt(0).toUpperCase() + tekst.slice(1), stanje: o.stanje };
}

/* ------------------------------------------------------------------ pretvorba programa FreeCAD/Mach3 (P01 … P21) u Haas zapis */
export function uHaas(ime, G, o = {}) {
  const broj = String(o.broj || (1000 + (parseInt(ime.replace(/\D/g, ''), 10) || 0))).padStart(5, '0');
  const redci = String(G).replace(/\r/g, '').split('\n');
  const out = ['%', 'O' + broj + ' (' + (o.naziv || ime) + ')', '(' + (o.opis || 'PRIPREMAK ' + (o.L || '') + ' X ' + (o.W || '') + ' X ' + (o.H || '') + ' MM, G54 LIJEVI PREDNJI GORNJI KUT') + ')', 'G00 G17 G21 G40 G49 G80 G90'];
  let T = 1, S = null, glava = true;
  for (const r of redci) {
    const { kod, kom, w } = rijeci(r);
    if (glava) {
      if (w.T !== undefined) T = w.T;
      if (w.S !== undefined) S = w.S;
      if (!kod) { if (kom) out.push('(' + kom.toUpperCase().replace(/[^A-Z0-9 _.\-]/g, '') + ')'); continue; }
      if (!['X', 'Y', 'Z'].some((a) => w[a] !== undefined)) continue;             /* zaglavlje FreeCAD-a preskačemo do prvog gibanja */
      out.push('T' + T + ' M06', 'S' + Math.min(15000, Math.max(1500, Math.round(S || 12000))) + ' M03', 'G54 G00 X0. Y0.', 'G43 H' + String(T).padStart(2, '0') + ' Z25.');
      glava = false;
    }
    if (!kod) { if (kom) out.push('(' + kom.toUpperCase().replace(/[^A-Z0-9 _.\-]/g, '') + ')'); continue; }
    if (w.M.includes(30) || w.M.includes(2)) break;
    if (w.M.includes(5) && !w.G.length) continue;
    if (w.M.includes(6)) { out.push('T' + (w.T !== undefined ? w.T : T) + ' M06'); continue; }
    if (w.M.includes(3) && !['X', 'Y', 'Z'].some((a) => w[a] !== undefined)) { out.push('S' + Math.min(15000, Math.max(1500, Math.round(w.S || S || 12000))) + ' M03'); continue; }
    /* decimalna točka obvezna: X Y Z I J F */
    const t = kod.replace(/([XYZIJKRF])\s*([-+]?\d+)(?![\d.])/g, '$1$2.');
    out.push(t);
  }
  out.push('G00 Z25.', 'M05', 'G28 G91 Z0.', 'G90', 'M30', '%');
  return out.join('\n');
}
