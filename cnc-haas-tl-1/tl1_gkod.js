/* FORTRONIQ · Haas TL-1 — Haas dijalekt G-koda za tokarilicu: pretvara program u ravne segmente u koordinatama stroja
   (vrh alata; X kao promjer) i događaje (izmjena alata, M00/M01, G04, M30). Podržano: %, O, N, komentari, G00–G03 (R ili I/K),
   ,C i ,R (skošenje/zaobljenje na pravokutnim kutovima), U/W (inkrementalno), G20/G21, G28 U0 W0, G53, G40/G41/G42 (bez učinka),
   G50 (granica o/min), G96/G97, G98/G99, G54–G59, G70/G71/G72/G74/G75/G76, G04, M00/M01/M03/M04/M05/M08/M09/M30, M97/M98/M99, Txxyy.
   Ponašanje prema Haas Lathe Operator's Manualu (javno); tekst poruka naš. Brojevi bez decimalne točke = tisućinke (kao na Haasu).
   © ForTroniQ d.o.o. */

const RIJEC = /([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g;
export const rijeci = {
  G00: 'brzi hod', G01: 'pravocrtno gibanje posmakom', G02: 'kružni luk u smjeru kazaljke', G03: 'kružni luk suprotno od kazaljke', G04: 'stanka (P ms)',
  G18: 'ravnina XZ (tokarilica)', G20: 'inči', G21: 'milimetri', G28: 'povratak u nultočku stroja', G40: 'bez korekcije polumjera vrha', G41: 'korekcija polumjera vrha lijevo', G42: 'korekcija polumjera vrha desno',
  G50: 'najveći broj okretaja (S)', G53: 'koordinate stroja (jedan blok)', G54: 'nultočka obratka 1', G70: 'ciklus završne obrade (P Q)', G71: 'ciklus grubog uzdužnog tokarenja (P Q U W D F)', G72: 'ciklus grubog poprečnog tokarenja',
  G74: 'ciklus bušenja s čišćenjem (Z K F)', G75: 'ciklus utora (X I F)', G76: 'ciklus narezivanja navoja (X Z K D F)', G96: 'stalna rezna brzina (S m/min)', G97: 'stalni broj okretaja (S o/min)', G98: 'posmak u mm/min', G99: 'posmak u mm/okr',
  M00: 'zaustavljanje programa', M01: 'uvjetno zaustavljanje', M03: 'vreteno naprijed', M04: 'vreteno natrag', M05: 'vreteno stop', M08: 'rashladno sredstvo uključeno', M09: 'rashladno sredstvo isključeno', M30: 'kraj programa',
  M97: 'lokalni potprogram (P = redak N)', M98: 'potprogram iz memorije (P = O-broj)', M99: 'povratak iz potprograma'
};

function rastavi(red) {
  let s = red.replace(/\r/g, ''); const kom = []; s = s.replace(/\(([^)]*)\)/g, (m, k) => { kom.push(k.trim()); return ' '; }).replace(/;.*$/, '');
  const w = { G: [], M: [] }; let opcC = null, opcR = null;
  s = s.replace(/,\s*C\s*([-+]?[\d.]+)/i, (m, v) => { opcC = v; return ' '; }).replace(/,\s*R\s*([-+]?[\d.]+)/i, (m, v) => { opcR = v; return ' '; });
  const up = s.toUpperCase(); let m; RIJEC.lastIndex = 0;
  while ((m = RIJEC.exec(up))) { const a = m[1], raw = m[2]; let v = parseFloat(raw); const bezTocke = !raw.includes('.');
    if (a === 'G' || a === 'M') { w[a].push(v); continue; }
    if (a === 'N' || a === 'O' || a === 'P' || a === 'L' || a === 'T' || a === 'S' || (a === 'Q')) { w[a] = raw; continue; }
    if (bezTocke && /^[XZUWIKRFDCH]$/.test(a) && Math.abs(v) >= 1) { v = v / 1000; w['_' + a] = true; }
    w[a] = v; }
  if (opcC !== null) w.C_ = parseFloat(opcC); if (opcR !== null) w.R_ = parseFloat(opcR);
  const prazan = !up.replace(/\s/g, '').length;
  return { w, kom, prazan, ostatak: up.replace(RIJEC, '').replace(/[\s%]/g, '') };
}

/* pretvori(tekst, opcije) → { B, P, S, greske, info }
   opcije: { alati: {T:{X,Z}}, off: {54:{X,Z}…}, start: {X,Z} (stroj), T0, O0 (aktivni offset), programi: {O: tekst}, cssStart }
   P: [Xm, Zm, g (0 brzi / 1 posmak), F, blok, fRev (true = mm/okr)]; S[blok] = { css, S, max, dir, hlad } */
export function pretvori(tekst, o = {}) {
  const alati = o.alati || {}, off = o.off || { 54: { X: 0, Z: 0 } };
  const B = [], P = [], SB = [], greske = [], info = { alati: new Set(), G: new Set(), M: new Set(), cikl: new Set() };
  const redci = String(tekst).replace(/\r/g, '').split('\n');
  const st = Object.assign({ X: o.start ? o.start.X : 0, Z: o.start ? o.start.Z : 0, g: 0, F: 0, fRev: true, mm: true, css: false, S: 0, max: 1800, dir: 0, hlad: false, T: o.T0 || 1, H: o.O0 || 1, G: 54, abs: true }, o.stanje || {});
  const toolX = () => (alati[st.T] && alati[st.T][st.H] ? alati[st.T][st.H].X : (alati[st.T] ? alati[st.T].X : 0));
  const toolZ = () => (alati[st.T] && alati[st.T][st.H] ? alati[st.T][st.H].Z : (alati[st.T] ? alati[st.T].Z : 0));
  const uRad = () => ({ X: st.X - toolX() - (off[st.G] ? off[st.G].X : 0), Z: st.Z - toolZ() - (off[st.G] ? off[st.G].Z : 0) });   /* trenutačni položaj u koordinatama obratka */
  const uStroj = (Xw, Zw) => ({ X: Xw + toolX() + (off[st.G] ? off[st.G].X : 0), Z: Zw + toolZ() + (off[st.G] ? off[st.G].Z : 0) });
  const sk = (v) => (st.mm ? v : v * 25.4);
  let blok = -1, kraj = false, dubina = 0;
  const greska = (red, t, alarm) => greske.push({ red, tekst: t, alarm });
  const noviBlok = (red, kod, ev) => { B.push({ red, kod, ev }); blok = B.length - 1; SB.push({ css: st.css, S: st.S, max: st.max, dir: st.dir, hlad: st.hlad }); return blok; };
  const dodaj = (Xm, Zm, g, F) => { P.push([Xm, Zm, g, F, blok, st.fRev]); st.X = Xm; st.Z = Zm; };
  const gibajW = (Xw, Zw, g, F) => { const m = uStroj(Xw, Zw); dodaj(m.X, m.Z, g, F); };
  /* luk u koordinatama obratka (polumjer r = X/2, z): od (r0,z0) do (r1,z1), smjer g (2 = CW, 3 = CCW u ravnini Z→desno, X→gore) */
  function luk(r0, z0, r1, z1, g, R, I, K, red, F) {
    let cz, cr;
    if (I !== undefined || K !== undefined) { cz = z0 + (K || 0); cr = r0 + (I || 0); }
    else { if (R === undefined) { greska(red, 'G02/G03 bez R ni I/K', 311); return; } const dz = z1 - z0, dr = r1 - r0, d = Math.hypot(dz, dr); if (d < 1e-9 || d / 2 > Math.abs(R) + 1e-6) { greska(red, 'luk: R je manji od polovine tetive', 311); return; }
      const h = Math.sqrt(Math.max(0, R * R - d * d / 4)), mz = (z0 + z1) / 2, mr = (r0 + r1) / 2, nz = -dr / d, nr = dz / d; const s = (g === 2 ? 1 : -1) * (R < 0 ? -1 : 1); cz = mz + s * h * nz; cr = mr + s * h * nr; }
    const a0 = Math.atan2(r0 - cr, z0 - cz), a1 = Math.atan2(r1 - cr, z1 - cz), rad = Math.hypot(r0 - cr, z0 - cz); let da = a1 - a0;
    if (g === 2) { if (da >= -1e-9) da -= 2 * Math.PI; } else { if (da <= 1e-9) da += 2 * Math.PI; }
    const n = Math.max(4, Math.ceil(Math.abs(da) * rad / 0.5));
    for (let i = 1; i <= n; i++) { const a = a0 + da * i / n; const z = i === n ? z1 : cz + rad * Math.cos(a), r = i === n ? r1 : cr + rad * Math.sin(a); gibajW(2 * r, z, 1, F); }
  }
  /* --- izvođenje jednog bloka (s rekurzijom za potprograme i cikluse) --- */
  const podprogrami = o.programi || {};
  function nadiN(redciP, n) { const t = 'N' + String(parseInt(n, 10)); return redciP.findIndex((l) => new RegExp('^\\s*N0*' + parseInt(n, 10) + '(?!\\d)', 'i').test(l) || l.trim().toUpperCase().startsWith(t + ' ')); }
  function izvedi(redciP, od, doKraja, razina, zaustavi) {
    for (let i = od; i < redciP.length && !kraj; i++) {
      const red = redciP[i]; const { w, kom, prazan, ostatak } = rastavi(red);
      if (zaustavi && zaustavi(w, i)) return i;
      if (prazan) { if (razina === 0) noviBlok(i, red.trim(), null); continue; }
      if (ostatak.length) greska(i, 'nepoznat znak u bloku: ' + ostatak, w.G.length || w.M.length ? undefined : undefined);
      let ev = null; const evDodaj = (k, v) => { ev = ev || {}; ev[k] = v; };
      /* M-kodovi */
      for (const m of w.M) { info.M.add(m);
        if (m === 3) { st.dir = 1; } else if (m === 4) { st.dir = -1; } else if (m === 5) { st.dir = 0; }
        else if (m === 8) st.hlad = true; else if (m === 9) st.hlad = false;
        else if (m === 0) evDodaj('m00', true); else if (m === 1) evDodaj('m01', true);
        else if (m === 30 || m === 2) { evDodaj('kraj', true); kraj = true; }
        else if (m === 97) { const n = w.P; if (n === undefined) { greska(i, 'M97 bez P', 311); continue; } const j = nadiN(redciP, n); if (j < 0) { greska(i, 'M97: redak N' + n + ' ne postoji', 311); continue; }
          if (dubina > 8) { greska(i, 'predubok poziv potprograma', 311); continue; } const L = w.L ? parseInt(w.L, 10) : 1; noviBlok(i, red.trim(), null); dubina++;
          for (let q = 0; q < L; q++) izvedi(redciP, j, false, razina + 1, (ww) => ww.M.includes(99)); dubina--; ev = null; }
        else if (m === 98) { const n = w.P; const ime = 'O' + String(parseInt(n, 10)).padStart(5, '0'); const t = podprogrami[ime]; if (!t) { greska(i, 'M98: program ' + ime + ' ne postoji', 311); continue; }
          if (dubina > 8) { greska(i, 'predubok poziv potprograma', 311); continue; } const L = w.L ? parseInt(w.L, 10) : 1; noviBlok(i, red.trim(), null); dubina++;
          const rp = t.replace(/\r/g, '').split('\n'); for (let q = 0; q < L; q++) izvedi(rp, 0, false, razina + 1, (ww) => ww.M.includes(99)); dubina--; }
        else if (m === 99) { if (razina === 0) { evDodaj('kraj', true); kraj = true; } }
        else if (![19, 41, 42, 10, 11, 21, 22, 23, 24, 31, 33, 34, 35, 36, 37, 38, 39, 43, 44, 51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 66, 67, 68, 69].includes(m)) greska(i, 'M' + m + ' nije podržan', 311); }
      if (kraj && w.M.some((m) => m === 30 || m === 2)) { noviBlok(i, red.trim(), ev); return i; }
      /* T */
      if (w.T !== undefined) { const t = String(w.T).padStart(4, '0'); const tn = parseInt(t.slice(0, 2), 10), hn = parseInt(t.slice(2), 10); info.alati.add(tn);
        if (!alati[tn]) greska(i, 'T' + t + ': alat ' + tn + ' ne postoji u tablici', 311);
        if (tn !== st.T) evDodaj('alat', tn); st.T = tn; st.H = hn || tn; }
      if (w.S !== undefined) { const Sv = parseFloat(w.S); if (w.G.includes(50)) st.max = Sv; else st.S = Sv; }
      /* G-kodovi: postavke */
      let gib = null, cikl = null;
      for (const g of w.G) { info.G.add(g);
        if (g === 0 || g === 1 || g === 2 || g === 3) { gib = g; st.g = g; }
        else if (g === 4) evDodaj('g04', Math.round((w.P !== undefined ? parseFloat(w.P) : (w.X !== undefined ? w.X * 1000 : 0))));
        else if (g === 18 || g === 40 || g === 41 || g === 42 || g === 50 || g === 80 || g === 90 || g === 91) { if (g === 90) st.abs = true; if (g === 91) st.abs = false; }
        else if (g === 20) st.mm = false; else if (g === 21) st.mm = true;
        else if (g === 96) st.css = true; else if (g === 97) st.css = false;
        else if (g === 98) st.fRev = false; else if (g === 99) st.fRev = true;
        else if (g >= 54 && g <= 59) st.G = g;
        else if (g === 28 || g === 53) { cikl = g; }
        else if ([70, 71, 72, 74, 75, 76].includes(g)) { cikl = g; info.cikl.add(g); }
        else greska(i, 'G' + g + ' nije podržan', 310); }
      if (w.F !== undefined) st.F = sk(w.F);
      if (w.G.includes(96) && (w.S === undefined) && !st.S) greska(i, 'G96 bez S');
      const b = noviBlok(i, red.trim(), ev);
      if (kraj) return i;
      /* ciljne koordinate obratka */
      const cur = uRad(); const hasX = w.X !== undefined || w.U !== undefined, hasZ = w.Z !== undefined || w.W !== undefined;
      const cilj = { X: w.X !== undefined ? sk(w.X) : w.U !== undefined ? cur.X + sk(w.U) : cur.X, Z: w.Z !== undefined ? sk(w.Z) : w.W !== undefined ? cur.Z + sk(w.W) : cur.Z };
      if (!st.abs && w.X !== undefined) cilj.X = cur.X + sk(w.X); if (!st.abs && w.Z !== undefined) cilj.Z = cur.Z + sk(w.Z);
      if (cikl === 28) { dodaj(st.X, 0, 0, 0); dodaj(0, 0, 0, 0); continue; }                             /* G28: Z pa X u nultočku stroja (pojednostavljeno) */
      if (cikl === 53) { dodaj(w.X !== undefined ? sk(w.X) : st.X, w.Z !== undefined ? sk(w.Z) : st.Z, w.G.includes(1) ? 1 : 0, st.F); continue; }
      if (cikl === 71 || cikl === 72) { const qi = ciklusGrubi(cikl, w, redciP, i, b); if (qi > i) i = qi; continue; }   /* nakon ciklusa upravljanje preskače blokove P … Q */
      if (cikl === 70) { const p = nadiN(redciP, w.P), q = w.Q !== undefined ? nadiN(redciP, w.Q) : -1; if (p < 0 || q < 0) { greska(i, 'G70 bez P/Q ili N-blokovi ne postoje', 311); continue; }
        const pocX = st.X, pocZ = st.Z; izvedi(redciP, p, false, razina + 1, (ww, j) => j > q);
        /* vrati se u početnu točku brzim hodom */ dodaj(pocX, st.Z, 0, 0); dodaj(pocX, pocZ, 0, 0); continue; }
      if (cikl === 74) { ciklus74(w, i); continue; }
      if (cikl === 75) { ciklus75(w, i); continue; }
      if (cikl === 76) { ciklus76(w, i); continue; }
      if (gib === null && (hasX || hasZ)) gib = st.g;
      if (gib === null) continue;
      if (gib === 1 && !(st.F > 0)) { greska(i, 'G01 bez posmaka F (alarm 320 NO FEED RATE)', 320); }
      if ((gib === 2 || gib === 3) && !(st.F > 0)) greska(i, 'G02/G03 bez posmaka F', 320);
      if (gib === 0) { if (w.C_ !== undefined || w.R_ !== undefined) greska(i, ',C / ,R samo uz G01'); gibajW(cilj.X, cilj.Z, 0, 0); }
      else if (gib === 1) {
        if (w.C_ !== undefined || w.R_ !== undefined) { kutSaSkosenjem(cilj, w, redciP, i); }
        else gibajW(cilj.X, cilj.Z, 1, st.F);
      } else { const c = uRad(); luk(c.X / 2, c.Z, cilj.X / 2, cilj.Z, gib, w.R !== undefined ? sk(w.R) : undefined, w.I !== undefined ? sk(w.I) : undefined, w.K !== undefined ? sk(w.K) : undefined, i, st.F); }
    }
    return redciP.length;
  }
  /* ,C / ,R: kut između ovog bloka (G01) i sljedećeg gibanja (pravokutni kut) */
  function kutSaSkosenjem(cilj, w, redciP, i) {
    const c = uRad(); let nxt = null;
    for (let j = i + 1; j < redciP.length; j++) { const r2 = rastavi(redciP[j]); if (r2.prazan) continue; if (r2.w.X !== undefined || r2.w.Z !== undefined || r2.w.U !== undefined || r2.w.W !== undefined) { nxt = r2.w; break; } break; }
    if (!nxt) { greska(i, ',C/,R: nema sljedećeg gibanja'); gibajW(cilj.X, cilj.Z, 1, st.F); return; }
    const n = { X: nxt.X !== undefined ? sk(nxt.X) : nxt.U !== undefined ? cilj.X + sk(nxt.U) : cilj.X, Z: nxt.Z !== undefined ? sk(nxt.Z) : nxt.W !== undefined ? cilj.Z + sk(nxt.W) : cilj.Z };
    const d1 = { r: (cilj.X - c.X) / 2, z: cilj.Z - c.Z }, d2 = { r: (n.X - cilj.X) / 2, z: n.Z - cilj.Z };
    const l1 = Math.hypot(d1.r, d1.z), l2 = Math.hypot(d2.r, d2.z); if (l1 < 1e-9 || l2 < 1e-9) { gibajW(cilj.X, cilj.Z, 1, st.F); return; }
    const u1 = { r: d1.r / l1, z: d1.z / l1 }, u2 = { r: d2.r / l2, z: d2.z / l2 };
    if (Math.abs(u1.r * u2.r + u1.z * u2.z) > 0.01) { greska(i, ',C/,R samo na pravokutnom kutu'); gibajW(cilj.X, cilj.Z, 1, st.F); return; }
    const v = w.C_ !== undefined ? sk(w.C_) : sk(w.R_);
    const A = { r: cilj.X / 2 - u1.r * v, z: cilj.Z - u1.z * v }, Bp = { r: cilj.X / 2 + u2.r * v, z: cilj.Z + u2.z * v };
    gibajW(2 * A.r, A.z, 1, st.F);
    if (w.C_ !== undefined) gibajW(2 * Bp.r, Bp.z, 1, st.F);
    else { const cen = { r: A.r + u2.r * v, z: A.z + u2.z * v }; const a0 = Math.atan2(A.r - cen.r, A.z - cen.z), a1 = Math.atan2(Bp.r - cen.r, Bp.z - cen.z); let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const nn = 8; for (let q = 1; q <= nn; q++) { const a = a0 + da * q / nn; gibajW(2 * (cen.r + v * Math.sin(a)), cen.z + v * Math.cos(a), 1, st.F); } }
    /* sljedeći blok nastavlja od B — označi da je početak već pomaknut: ništa, jer gibanje ide od trenutačne točke */
  }
  /* profil P…Q u koordinatama obratka (polumjer, z) */
  function profil(redciP, p, q) {
    const qi = nadiN(redciP, q); const spremi = { ...st }; const pts = []; const poc = uRad(); pts.push({ r: poc.X / 2, z: poc.Z, F: st.F });
    const pocP = P.length, pocB = B.length;
    izvedi(redciP, p, false, 1, (ww, j) => j > qi);
    const segs = P.splice(pocP); B.splice(pocB); SB.splice(pocB); blok = pocB - 1;
    segs.forEach((s) => { const Xw = s[0] - toolX() - (off[st.G] ? off[st.G].X : 0), Zw = s[1] - toolZ() - (off[st.G] ? off[st.G].Z : 0); pts.push({ r: Xw / 2, z: Zw, F: s[3], g: s[2] }); });
    Object.assign(st, spremi, { F: spremi.F });
    return pts;
  }
  function ciklusGrubi(g, w, redciP, i, b) {
    const p = w.P !== undefined ? nadiN(redciP, w.P) : -1, qi = w.Q !== undefined ? nadiN(redciP, w.Q) : -1; if (p < 0 || qi < 0) { greska(i, 'G' + g + ' bez P/Q ili N-blokovi ne postoje', 311); return -1; }
    const D = w.D !== undefined ? sk(w.D) : 1, U = w.U !== undefined ? sk(w.U) : 0, W = w.W !== undefined ? sk(w.W) : 0, F = w.F !== undefined ? sk(w.F) : st.F;
    if (!(F > 0)) greska(i, 'G' + g + ' bez posmaka F', 320);
    if (!(D > 0)) { greska(i, 'G' + g + ': D (dubina reza) mora biti > 0', 311); return -1; }
    const pts = profil(redciP, p, w.Q); const poc = uRad(); const r0 = poc.X / 2, z0 = poc.Z;
    if (g === 71) {
      /* profil od prvog bloka (X) prema steznoj glavi; prolazi na r = r0 − n·D do r_min + U/2 */
      const pr = pts.slice(1); if (pr.length < 2) { greska(i, 'G71: profil P…Q nema gibanja', 311); return -1; }
      const rMin = Math.min(...pr.map((q) => q.r)) + U / 2;
      for (let rp = r0 - D; rp > rMin - 1e-6; rp -= D) {
        const rr = Math.max(rp, rMin);
        /* z gdje profil (s dodatkom U/2, W) dosegne polumjer rr: hod po profilu od čela prema steznoj glavi */
        let zc = null;
        if (pr[0].r + U / 2 >= rr - 1e-9) zc = pr[0].z + W;
        else for (let q = 1; q < pr.length; q++) { const a = pr[q - 1], c = pr[q]; const ra = a.r + U / 2, rc = c.r + U / 2;
          if (ra < rr && rc >= rr) { const t = Math.abs(rc - ra) < 1e-9 ? 0 : (rr - ra) / (rc - ra); zc = (a.z + (c.z - a.z) * t) + W; break; } }
        if (zc === null) zc = pr[pr.length - 1].z + W;
        gibajW(2 * rr, z0, 0, 0); gibajW(2 * rr, zc, 1, F); gibajW(2 * (rr + Math.min(D, 1)), zc + Math.min(D, 1), 1, F); gibajW(2 * (rr + Math.min(D, 1)), z0, 0, 0);
        if (rr <= rMin + 1e-9) break;
      }
      gibajW(2 * r0, z0, 0, 0);
    } else {
      /* G72: prolazi paralelni s X, od z0 prema steznoj glavi; profil ide od z (najdalje) prema … */
      const pr = pts.slice(1); if (pr.length < 2) { greska(i, 'G72: profil P…Q nema gibanja', 311); return -1; }
      const zMin = Math.min(...pr.map((q) => q.z)) + W;
      for (let zp = z0 - D; zp > zMin - 1e-6; zp -= D) {
        const zz = Math.max(zp, zMin); let rc = null;
        if (pr[0].z + W <= zz + 1e-9) rc = pr[0].r + U / 2;
        else for (let q = 1; q < pr.length; q++) { const a = pr[q - 1], c = pr[q]; const za = a.z + W, zcc = c.z + W;
          if (za > zz && zcc <= zz) { const t = Math.abs(zcc - za) < 1e-9 ? 0 : (zz - za) / (zcc - za); rc = (a.r + (c.r - a.r) * t) + U / 2; break; } }
        if (rc === null) rc = pr[pr.length - 1].r + U / 2;
        gibajW(2 * r0, zz, 0, 0); gibajW(2 * rc, zz, 1, F); gibajW(2 * (rc + Math.min(D, 1)), zz + Math.min(D, 1), 1, F); gibajW(2 * r0, zz + Math.min(D, 1), 0, 0);
        if (zz <= zMin + 1e-9) break;
      }
      gibajW(2 * r0, z0, 0, 0);
    }
    void b; return qi;
  }
  function ciklus74(w, i) {
    const c = uRad(); const Zk = w.Z !== undefined ? sk(w.Z) : w.W !== undefined ? c.Z + sk(w.W) : null; if (Zk === null) { greska(i, 'G74 bez Z', 311); return; }
    const K = w.K !== undefined ? sk(w.K) : Math.abs(c.Z - Zk), F = w.F !== undefined ? sk(w.F) : st.F; if (!(F > 0)) greska(i, 'G74 bez F', 320);
    const X = w.X !== undefined ? sk(w.X) : c.X; let z = c.Z;
    while (z > Zk + 1e-9) { z = Math.max(Zk, z - Math.max(0.1, K)); gibajW(X, z, 1, F); gibajW(X, Math.min(c.Z, z + 1), 0, 0); if (z > Zk + 1e-9) gibajW(X, z + 0.5, 0, 0); }
    gibajW(X, c.Z, 0, 0);
  }
  function ciklus75(w, i) {
    const c = uRad(); const Xk = w.X !== undefined ? sk(w.X) : w.U !== undefined ? c.X + sk(w.U) : null; if (Xk === null) { greska(i, 'G75 bez X', 311); return; }
    const I = w.I !== undefined ? sk(w.I) : Math.abs(c.X - Xk) / 2, F = w.F !== undefined ? sk(w.F) : st.F; if (!(F > 0)) greska(i, 'G75 bez F', 320);
    const Zk = w.Z !== undefined ? sk(w.Z) : c.Z, K = w.K !== undefined ? sk(w.K) : 0; const z0 = c.Z;
    const utor = (z) => { let x = c.X; while (x > Xk + 1e-9) { x = Math.max(Xk, x - 2 * Math.max(0.1, I)); gibajW(x, z, 1, F); gibajW(Math.min(c.X, x + 1), z, 0, 0); if (x > Xk + 1e-9) gibajW(x + 0.4, z, 0, 0); } gibajW(c.X, z, 0, 0); };
    if (K > 0 && Zk < z0 - 1e-9) { for (let z = z0; z > Zk - 1e-9; z -= K) { gibajW(c.X, Math.max(z, Zk), 0, 0); utor(Math.max(z, Zk)); } gibajW(c.X, z0, 0, 0); } else utor(z0);
  }
  function ciklus76(w, i) {
    const c = uRad(); const Xm = w.X !== undefined ? sk(w.X) : null, Zk = w.Z !== undefined ? sk(w.Z) : w.W !== undefined ? c.Z + sk(w.W) : null;
    if (Xm === null || Zk === null) { greska(i, 'G76 bez X/Z', 311); return; }
    const K = w.K !== undefined ? sk(w.K) : (c.X - Xm) / 2, D = w.D !== undefined ? sk(w.D) : K / 4, F = w.F !== undefined ? sk(w.F) : st.F;
    if (!(F > 0)) greska(i, 'G76 bez F (korak navoja)', 320); if (st.css) greska(i, 'G76 uz G96: navoj se reže uz G97 (stalni o/min)');
    const Xv = Xm + 2 * K;                                                     /* vanjski promjer navoja */
    let n = 1, dub = 0; const prolazi = [];
    while (dub < K - 1e-6) { dub = Math.min(K, D * Math.sqrt(n)); prolazi.push(dub); n++; if (n > 40) break; }
    if (prolazi[prolazi.length - 1] < K) prolazi.push(K);
    const z0 = c.Z, x0 = c.X;
    prolazi.forEach((d) => { const x = Xv - 2 * d; gibajW(x, z0, 0, 0); gibajW(x, Zk, 1, F); gibajW(x0, Zk, 0, 0); gibajW(x0, z0, 0, 0); });
    const bl = B[blok]; bl.ev = Object.assign(bl.ev || {}, { navoj: { xA: Zk, xB: z0, p: F, Xm } });
  }
  /* glavni program: preskoči % i O-broj */
  izvedi(redci, 0, true, 0, null);
  if (!kraj) greske.push({ red: redci.length - 1, tekst: 'program bez M30' });
  return { B, P, S: SB, greske, info };
}

/* objašnjenje jednog retka programa (hrvatski) */
export function objasni(red, stanje = {}) {
  const { w, kom } = rastavi(red); const dijelovi = []; const s = { ...stanje };
  if (/^\s*%/.test(red)) return { tekst: 'Oznaka početka/kraja programa (%).', stanje: s };
  if (w.O !== undefined) dijelovi.push('Broj programa O' + String(w.O).padStart(5, '0') + (kom.length ? ' — naziv: ' + kom.join(' ') : ''));
  if (w.N !== undefined) dijelovi.push('N' + w.N + ' (broj bloka)');
  for (const g of w.G) { const k = 'G' + String(g).padStart(2, '0'); if (rijeci[k]) dijelovi.push(k + ' — ' + rijeci[k]); else dijelovi.push(k + ' — nije podržan u simulatoru'); if (g === 96) s.css = true; if (g === 97) s.css = false; if (g === 98) s.fmin = true; if (g === 99) s.fmin = false; if (g === 20) s.inch = true; if (g === 21) s.inch = false; }
  if (w.T !== undefined) { const t = String(w.T).padStart(4, '0'); dijelovi.push('T' + t + ' — alat ' + parseInt(t.slice(0, 2), 10) + ', korekcija ' + parseInt(t.slice(2), 10)); }
  if (w.S !== undefined) dijelovi.push('S' + w.S + (w.G.includes(50) ? ' — najveći broj okretaja' : s.css ? ' m/min (rezna brzina)' : ' o/min'));
  if (w.X !== undefined) dijelovi.push('X' + w.X + (w._X ? ' (bez točke = tisućinke!)' : '') + ' — promjer');
  if (w.Z !== undefined) dijelovi.push('Z' + w.Z + (w._Z ? ' (bez točke = tisućinke!)' : ''));
  if (w.U !== undefined) dijelovi.push('U' + w.U + ' — inkrementalno u X (promjer)' + (w.G.includes(71) || w.G.includes(72) ? ' / dodatak za završnu obradu' : ''));
  if (w.W !== undefined) dijelovi.push('W' + w.W + ' — inkrementalno u Z' + (w.G.includes(71) || w.G.includes(72) ? ' / dodatak za završnu obradu' : ''));
  if (w.I !== undefined) dijelovi.push('I' + w.I + (w.G.includes(75) ? ' — dubina čišćenja u X' : ' — središte luka (polumjer) od početka'));
  if (w.K !== undefined) dijelovi.push('K' + w.K + (w.G.includes(76) ? ' — visina navoja' : w.G.includes(74) ? ' — dubina čišćenja' : ' — središte luka u Z od početka'));
  if (w.R !== undefined) dijelovi.push('R' + w.R + ' — polumjer luka');
  if (w.D !== undefined) dijelovi.push('D' + w.D + (w.G.includes(76) ? ' — dubina prvog prolaza' : ' — dubina reza po prolazu'));
  if (w.P !== undefined) dijelovi.push('P' + w.P + (w.G.includes(4) ? ' ms stanke' : w.M.includes(97) ? ' — redak N potprograma' : w.M.includes(98) ? ' — O-broj potprograma' : ' — početni blok profila'));
  if (w.Q !== undefined) dijelovi.push('Q' + w.Q + ' — završni blok profila');
  if (w.L !== undefined) dijelovi.push('L' + w.L + ' ponavljanja');
  if (w.F !== undefined) dijelovi.push('F' + w.F + (w.G.includes(76) ? ' — korak navoja' : s.fmin ? ' mm/min' : ' mm/okr'));
  if (w.C_ !== undefined) dijelovi.push(',C' + w.C_ + ' — skošenje na kutu'); if (w.R_ !== undefined) dijelovi.push(',R' + w.R_ + ' — zaobljenje kuta');
  for (const m of w.M) { const k = 'M' + String(m).padStart(2, '0'); dijelovi.push(k + ' — ' + (rijeci[k] || 'nije podržan')); }
  if (!dijelovi.length && kom.length) dijelovi.push('Komentar: ' + kom.join(' '));
  return { tekst: dijelovi.join('; ') || '(prazno)', stanje: s };
}
