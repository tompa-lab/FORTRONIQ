/* FORTRONIQ · zajednički G-kod: rastavljanje bloka, objašnjenje bloka (hrvatski), prevođenje u putanju i opis operacija.
   Koriste ga simulator SINUMERIK 840D i simulator male glodalice 3020 (Mach3).  © ForTroniQ d.o.o. */

const br = (v, d = 3) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d).replace('.', ','); };
const kr = (v) => { const s = (Math.round(v * 1000) / 1000).toString(); return s.replace('.', ','); };   /* kratki broj */

/* ------------------------------------------------------------------ rastavljanje */
export function ocisti(red) {
  let s = String(red || ''); let kom = '';
  /* komentari u zagradama (Mach3/ISO), i ugniježđeni: skidaju se od unutra prema van */
  const kz = []; let pr;
  do { pr = s; s = s.replace(/\(([^()]*)\)/g, (m, t) => { kz.push(t); return ' '; }); } while (s !== pr);
  s = s.replace(/[()]/g, ' '); if (kz.length) kom = kz.reverse().join(' ').replace(/\s+/g, ' ');
  const k = s.indexOf(';'); if (k >= 0) { kom = (kom ? kom + ' ' : '') + s.slice(k + 1).trim(); s = s.slice(0, k); }
  return { kod: s.trim().toUpperCase(), kom: kom.trim() };
}
export function razlozi(red) {
  const sirovo = String(red || '').trim().toUpperCase();
  const w = { G: [], M: [] }; let ciklus = null;
  const c = sirovo.match(/^(?:N\d+\s+)?([A-Z_][A-Z0-9_]{2,})\s*\(([^)]*)\)/);
  if (c && /[A-Z_]{3,}/.test(c[1]) && !/^[GMXYZIJKFSTDNARP][-+.\d]/.test(c[1])) ciklus = { ime: c[1], arg: c[2].split(',').map((q) => (q.trim() === '' ? null : parseFloat(q))) };
  const { kod, kom } = ciklus ? { kod: sirovo, kom: '' } : ocisti(red);
  if (!ciklus) {
    const re = /([A-Z]{1,3})\s*(=)?\s*([-+]?\d*\.?\d+)/g; let m;
    while ((m = re.exec(kod))) { const a = m[1], v = parseFloat(m[3]); if (a === 'G' || a === 'M') w[a].push(v); else w[a] = v; }
  }
  return { kod, kom, w, ciklus };
}

/* ------------------------------------------------------------------ objašnjenje bloka */
const GOPIS = {
  0: 'brzi hod (G0) — najkraćim putem, bez rezanja', 1: 'pravocrtno gibanje posmakom (G1)', 2: 'kružno gibanje u smjeru kazaljke na satu (G2)',
  3: 'kružno gibanje suprotno od kazaljke na satu (G3)', 4: 'zastoj (G4)', 17: 'ravnina obrade XY, os alata Z (G17)', 18: 'ravnina obrade ZX (G18)', 19: 'ravnina obrade YZ (G19)',
  20: 'mjere u inčima (G20)', 21: 'mjere u milimetrima (G21)', 28: 'povratak u referentnu točku (G28)', 40: 'bez korekcije polumjera alata (G40)',
  41: 'korekcija polumjera alata lijevo od konture (G41)', 42: 'korekcija polumjera alata desno od konture (G42)', 43: 'korekcija duljine alata uključena (G43)',
  49: 'korekcija duljine alata isključena (G49)', 53: 'koordinate stroja za ovaj blok (G53)', 54: 'pomak nultočke G54 — vrijede koordinate obratka',
  55: 'pomak nultočke G55', 80: 'poništen ciklus bušenja (G80)', 90: 'apsolutne mjere (G90) — vrijednosti su od nultočke obratka',
  91: 'inkrementalne mjere (G91) — vrijednosti su od trenutnog položaja', 93: 'posmak kao recipročno vrijeme (G93)', 94: 'posmak u mm/min (G94)', 95: 'posmak u mm po okretaju (G95)'
};
const MOPIS = { 0: 'programirano zaustavljanje (M0)', 1: 'zaustavljanje po izboru (M1)', 2: 'kraj programa (M2)', 3: 'vreteno se vrti desno (M3)', 4: 'vreteno se vrti lijevo (M4)',
  5: 'vreteno stoji (M5)', 6: 'izmjena alata (M6)', 7: 'hlađenje maglom (M7)', 8: 'rashladno sredstvo uključeno (M8)', 9: 'rashladno sredstvo isključeno (M9)', 30: 'kraj programa s povratkom na početak (M30)' };
/* stanje: { abs, g, F, S, T, x, y, z, a } — trenutno stanje prije bloka (u koordinatama obratka); vraća tekst i novo stanje */
export function objasni(red, stanje = {}) {
  const s = Object.assign({ abs: true, g: 0, F: 0, S: 0, T: 0, x: 0, y: 0, z: 0, a: 0 }, stanje);
  const { kod, kom, w, ciklus } = razlozi(red);
  const dijelovi = [];
  if (!kod) {
    if (/^OP\s/i.test(kom)) return { tekst: 'Početak operacije „' + kom.slice(3).replace(/_/g, ' ') + '”.', stanje: s };
    return { tekst: kom ? 'Komentar: „' + kom + '” — upravljanje ga ne izvodi.' : 'Prazan redak.', stanje: s };
  }
  if (ciklus) {
    if (ciklus.ime === 'POCKET4') {
      const v = ciklus.arg;
      return { tekst: 'Ciklus kružnog džepa POCKET4: središte X' + kr(v[5]) + ' Y' + kr(v[6]) + ', polumjer ' + kr(v[4]) + ' mm, dubina ' + kr(v[3]) + ', dostava ' + kr(v[7]) + ' mm po prolazu, posmak u ravnini ' + kr(v[10]) + ' i u dubinu ' + kr(v[11]) + ' mm/min. Upravljanje samo izračuna sve prolaze.', stanje: s };
    }
    return { tekst: 'Poziv ciklusa ' + ciklus.ime + ' s parametrima (' + ciklus.arg.map((x) => (x === null ? '' : kr(x))).join(', ') + ').', stanje: s };
  }
  if (w.N !== undefined) dijelovi.push('blok N' + w.N);
  const gs = w.G.slice();
  gs.forEach((g) => { if (g === 90) s.abs = true; if (g === 91) s.abs = false; });
  const gibanje = gs.find((g) => [0, 1, 2, 3].includes(g));
  if (gibanje !== undefined) s.g = gibanje;
  gs.filter((g) => ![0, 1, 2, 3].includes(g)).forEach((g) => dijelovi.push(GOPIS[g] || 'funkcija G' + g));
  if (w.T !== undefined) { s.T = w.T; if (!w.M.includes(6)) dijelovi.push('odabran alat T' + w.T); }
  if (w.M.includes(6)) dijelovi.push('izmjena alata: u vreteno ide T' + s.T);
  if (w.D !== undefined) dijelovi.push('korekcijski zapis D' + w.D);
  if (w.S !== undefined) { s.S = w.S; dijelovi.push('brzina vrtnje ' + kr(w.S) + ' o/min'); }
  const imaGib = ['X', 'Y', 'Z', 'A'].some((o) => w[o] !== undefined);
  if (w.F !== undefined) { s.F = w.F; if (!imaGib) dijelovi.push('posmak ' + kr(w.F) + ' mm/min'); }
  w.M.filter((m) => m !== 6).forEach((m) => dijelovi.push(MOPIS[m] || 'pomoćna funkcija M' + m));
  const osi = ['X', 'Y', 'Z', 'A'].filter((o) => w[o] !== undefined);
  if (osi.length) {
    const pre = { x: s.x, y: s.y, z: s.z, a: s.a };
    const nov = (o, k) => (w[o] === undefined ? pre[k] : s.abs ? w[o] : pre[k] + w[o]);
    const n = { x: nov('X', 'x'), y: nov('Y', 'y'), z: nov('Z', 'z'), a: nov('A', 'a') };
    const cilj = osi.map((o) => o + kr(n[o.toLowerCase()]) + (o === 'A' ? '°' : '')).join(' ');
    const GIB = { 0: 'brzi hod (G0)', 1: 'pravocrtno gibanje posmakom (G1)', 2: 'kružno gibanje u smjeru kazaljke na satu (G2)', 3: 'kružno gibanje suprotno od kazaljke na satu (G3)' };
    let t = (GIB[s.g] || 'gibanje') + ' do ' + cilj + (s.abs ? '' : ' (inkrementalno)') + (s.g === 0 ? ' — najkraćim putem, bez rezanja' : '');
    const jed = osi.length === 1 && osi[0] === 'A' ? ' °/min' : osi.includes('A') ? ' jedinica/min (mm i ° zajedno)' : ' mm/min';
    if (s.g === 1 || s.g === 2 || s.g === 3) t += s.F ? ', posmak ' + kr(s.F) + jed : ' — POZOR: posmak F nije zadan';
    if (s.g === 2 || s.g === 3) {
      if (w.CR !== undefined || w.R !== undefined) t += ', polumjer ' + kr(Math.abs(w.CR !== undefined ? w.CR : w.R)) + ' mm';
      else { const cx = pre.x + (w.I || 0), cy = pre.y + (w.J || 0); t += ', središte I' + kr(w.I || 0) + ' J' + kr(w.J || 0) + ' od početne točke → X' + kr(cx) + ' Y' + kr(cy) + ', polumjer ' + kr(Math.hypot(pre.x - cx, pre.y - cy)) + ' mm'; }
    }
    const istoXY = Math.abs(n.x - pre.x) < 1e-6 && Math.abs(n.y - pre.y) < 1e-6;
    if (istoXY && n.z < pre.z - 1e-6) t += ' — alat ide dolje' + (n.z < 0 ? ' u materijal (uranjanje)' : '');
    else if (istoXY && n.z > pre.z + 1e-6) t += ' — alat se podiže';
    if (osi.includes('A')) t += osi.length > 1 ? ' — os A okreće se istodobno s linearnim osima' : ' — okreće se samo os A';
    dijelovi.push(t);
    Object.assign(s, n);
  }
  if (gibanje !== undefined && !osi.length) dijelovi.push('način gibanja G' + gibanje + ' postaje aktivan (modalno) — u ovom bloku nema gibanja');
  const tekst = dijelovi.length ? dijelovi.join('; ') + '.' : 'Blok bez naredbe koju simulator objašnjava.';
  return { tekst: tekst.charAt(0).toUpperCase() + tekst.slice(1) + (kom ? ' Komentar: „' + kom + '”.' : ''), stanje: s };
}

/* ------------------------------------------------------------------ prevođenje u putanju */
/* opcije: start {X,Y,Z,A} — položaj nosa vretena u MKS (A u °); G54 {X,Y,Z,A}; T0 — alat u vretenu; duljina(T); polumjer(T);
   ciklus(ime, arg, stanje) — vraća niz točaka [X,Y,Zvrh,tip,F] u MKS-u ili null; korak — duljina dijela luka (mm)
   izlaz: P = [X, Y, Zvrh, A, tip(0/1), F, red, T, S] u MKS-u (vrh alata) */
export function prevedi(tekst, o) {
  const G54 = Object.assign({ X: 0, Y: 0, Z: 0, A: 0 }, o.G54); const korak = o.korak || 0.5;
  const P = []; const greske = []; let g = 0, F = 0, S = 0, T = o.T0 || 0, alat = o.T0 || 0, abs = true;
  const L = (t) => (t ? o.duljina(t) : 0);
  let x = o.start.X, y = o.start.Y, z = o.start.Z - L(alat), a = o.start.A || 0;
  const redci = String(tekst).replace(/\r/g, '').split('\n');
  const dodaj = (X, Y, Z, A, tip, f, red) => P.push([X, Y, Z, A, tip, f, red, alat, S]);
  redci.forEach((rr, red) => {
    const { kod, w, ciklus } = razlozi(rr); if (!kod) return;
    if (ciklus) {
      const q = o.ciklus ? o.ciklus(ciklus.ime, ciklus.arg, { alat, G54 }) : null;
      if (!q) { greske.push('red ' + (red + 1) + ': ciklus ' + ciklus.ime + ' ovo upravljanje ne poznaje'); return; }
      q.forEach((t) => dodaj(t[0], t[1], t[2], a, t[3], t[4], red));
      const zad = P[P.length - 1]; if (zad) { x = zad[0]; y = zad[1]; z = zad[2]; }
      return;
    }
    w.G.forEach((v) => { if ([0, 1, 2, 3].includes(v)) g = v; else if (v === 90) abs = true; else if (v === 91) abs = false; });
    if (w.F !== undefined) F = w.F; if (w.S !== undefined) S = w.S; if (w.T !== undefined) T = w.T;
    if (w.M.includes(6)) {
      if (o.alatPostoji && !o.alatPostoji(T)) { greske.push('red ' + (red + 1) + ': alat T' + T + ' nije u popisu alata'); return; }
      const nos = z + L(alat); alat = T; z = nos - L(alat);
    }
    const ima = ['X', 'Y', 'Z', 'A'].some((k) => w[k] !== undefined); if (!ima) return;
    const nx = w.X !== undefined ? (abs ? w.X + G54.X : x + w.X) : x;
    const ny = w.Y !== undefined ? (abs ? w.Y + G54.Y : y + w.Y) : y;
    const nz = w.Z !== undefined ? (abs ? w.Z + G54.Z : z + w.Z) : z;
    const na = w.A !== undefined ? (abs ? w.A + G54.A : a + w.A) : a;
    if (g <= 1) {
      if (g === 1 && !F) greske.push('red ' + (red + 1) + ': G1 bez posmaka F');
      const n = w.A !== undefined && Math.abs(na - a) > 0 ? Math.max(1, Math.ceil(Math.abs(na - a) / 2)) : 1;   /* luk osi A razbij na dijelove */
      for (let i = 1; i <= n; i++) dodaj(x + (nx - x) * i / n, y + (ny - y) * i / n, z + (nz - z) * i / n, a + (na - a) * i / n, g, g ? F : 0, red);
    } else {
      let cx, cy; const dx = nx - x, dy = ny - y, d = Math.hypot(dx, dy), cw = g === 2;
      if (w.CR !== undefined || w.R !== undefined) {
        const R = w.CR !== undefined ? w.CR : w.R, r = Math.abs(R);
        if (d > 2 * r + 1e-4 || d < 1e-9) { greske.push('red ' + (red + 1) + ': krivi polumjer luka'); return; }
        const h = Math.sqrt(Math.max(0, r * r - d * d / 4)), s2 = (cw ? 1 : -1) * (R < 0 ? -1 : 1);
        cx = (x + nx) / 2 + s2 * h * dy / d; cy = (y + ny) / 2 - s2 * h * dx / d;
      } else { cx = x + (w.I || 0); cy = y + (w.J || 0); }
      const r = Math.hypot(x - cx, y - cy), r2 = Math.hypot(nx - cx, ny - cy);
      if (Math.abs(r - r2) > 0.01) greske.push('red ' + (red + 1) + ': krajnja točka nije na kružnici (razlika ' + br(Math.abs(r - r2)) + ' mm)');
      const a0 = Math.atan2(y - cy, x - cx), a1 = Math.atan2(ny - cy, nx - cx); let da = a1 - a0;
      if (d < 1e-9) da = cw ? -2 * Math.PI : 2 * Math.PI; else if (cw) { while (da >= 0) da -= 2 * Math.PI; } else { while (da <= 0) da += 2 * Math.PI; }
      const n = Math.max(4, Math.ceil(Math.abs(da) * r / korak));
      if (!F) greske.push('red ' + (red + 1) + ': G' + g + ' bez posmaka F');
      for (let i = 1; i <= n; i++) { const q = a0 + da * i / n; dodaj(cx + r * Math.cos(q), cy + r * Math.sin(q), z + (nz - z) * i / n, a + (na - a) * i / n, 1, F, red); }
    }
    x = nx; y = ny; z = nz; a = na;
  });
  return { P, greske, redci };
}

/* ------------------------------------------------------------------ opis operacija (iz G-koda) */
const VRSTA = { 'Pocket Shape': 'džep po obliku (Pocket Shape)', Helix: 'provrt glodan po zavojnici (Helix)', 'Holding Tags': 'obris s mostićima (Holding Tags)', Profile: 'obris (Profile)', Drilling: 'bušenje (Drilling)', Face: 'čeono poravnavanje (Face)' };
export function opisiOperacije(G, ops, alati) {
  const redci = String(G).split('\n');
  return ops.map((op, i) => {
    const kraj = i + 1 < ops.length ? ops[i + 1].red : redci.length;
    let T = 0, S = 0, zmin = Infinity, razine = new Set(), Fu = new Set(), Fr = new Set(), luk = 0, lin = 0, uron = 0, g = 0, z = 10, x = 0, y = 0, abs = true;
    for (let k = 0; k < kraj && k < redci.length; k++) {
      const { kod, w } = razlozi(redci[k]); if (!kod) continue;
      if (w.T !== undefined) T = w.T; if (w.S !== undefined) S = w.S;
      w.G.forEach((v) => { if ([0, 1, 2, 3].includes(v)) g = v; if (v === 90) abs = true; if (v === 91) abs = false; });
      const nz = w.Z !== undefined ? (abs ? w.Z : z + w.Z) : z;
      const nx = w.X !== undefined ? (abs ? w.X : x + w.X) : x, ny = w.Y !== undefined ? (abs ? w.Y : y + w.Y) : y;
      if (k < op.red) { x = nx; y = ny; z = nz; continue; }
      const ravno = Math.abs(nx - x) < 1e-6 && Math.abs(ny - y) < 1e-6;
      if (g >= 1 && w.F !== undefined) { if (nz < z - 1e-6 && ravno) Fu.add(w.F); else Fr.add(w.F); }
      if (g >= 1 && nz < 0) { zmin = Math.min(zmin, nz); razine.add(Math.round(nz * 1000) / 1000); }
      if (g === 1 && nz < z - 1e-6) uron++;
      if (g === 2 || g === 3) luk++; else if (g === 1) lin++;
      x = nx; y = ny; z = nz;
    }
    const a = alati && alati[T] ? alati[T] : null;
    const dub = isFinite(zmin) ? -zmin : 0;
    const raz = [...razine].sort((p, q) => q - p);
    const dost = raz.length > 1 ? Math.abs(raz[0]) : dub;
    let t = (VRSTA[op.vrsta] || op.vrsta); t = t.charAt(0).toUpperCase() + t.slice(1) + '. Alat T' + T + (a ? ' (' + a + ')' : '') + ', ' + (S ? kr(S) + ' o/min' : 'brzina vrtnje iz prethodnog bloka') + '. ';
    if (dub) t += 'Najveća dubina ' + br(dub, 1) + ' mm (Z−' + br(dub, 3) + ')' + (op.vrsta === 'Helix' ? ', spuštanje po zavojnici' : raz.length > 1 ? ' na ' + raz.length + (raz.length % 10 >= 2 && raz.length % 10 <= 4 && (raz.length % 100 < 12 || raz.length % 100 > 14) ? ' razine' : ' razina') + ', prva na ' + br(dost, 1) + ' mm' : '') + '. ';
    if (Fu.size) t += 'Posmak uranjanja ' + [...Fu].map(kr).join(' / ') + ' mm/min';
    if (Fr.size) t += (Fu.size ? ', u ravnini ' : 'Posmak u ravnini ') + [...Fr].map(kr).join(' / ') + ' mm/min';
    if (Fu.size || Fr.size) t += '. ';
    t += 'Blokova: ' + Math.max(0, kraj - op.red - 1) + ' — pravocrtnih ' + lin + ', kružnih ' + luk + '.';
    return t;
  });
}
