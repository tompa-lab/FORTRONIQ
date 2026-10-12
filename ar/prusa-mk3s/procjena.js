// procjena.js — čitač G-koda i procjena trajanja ispisa za Original Prusa i3 MK3S (i svaki Marlin pisač s klasičnim jerkom).
// Planer gibanja kao u firmwareu i u PrusaSliceru (GCodeProcessor, način „normal”): ograničenja brzine i ubrzanja po osima,
// prijelazne brzine po pravilu „jerk”, trapezni profil brzine, unaprijedni i povratni prolaz planera.
// Radi u pregledniku, u Web Workeru i u Nodeu (globalni FTQ_PROCJENA).
(function (glob) {
  'use strict';
  const OSI = 4; // X, Y, Z, E

  // Ograničenja stroja: Original Prusa i3 MK3S & MK3S+ (PrusaSlicer, machine_max_*; prva vrijednost = način „normal”).
  const MK3S = {
    max_v: [200, 200, 12, 120],          // mm/s   M203
    max_a: [1000, 1000, 200, 5000],      // mm/s²  M201
    jerk: [8, 8, 0.4, 4.5],              // mm/s   M205 X Y Z E
    a_ispis: 1250, a_povlacenje: 1250, a_hod: 1250,   // M204 P R T (gornje granice za M204 S)
    min_v_ispis: 0, min_v_hod: 0
  };

  function kopija(o) { return JSON.parse(JSON.stringify(o)); }
  const maxDopustena = (a, v, d) => Math.sqrt(Math.max(0, v * v - 2 * a * d));
  const putUbrzanja = (v0, v1, a) => a === 0 ? 0 : (v1 * v1 - v0 * v0) / (2 * a);
  const putPresjeka = (v0, v1, a, d) => a === 0 ? 0 : (2 * a * d - v0 * v0 + v1 * v1) / (4 * a);
  const brzinaNaPutu = (v0, d, a) => Math.sqrt(Math.max(0, v0 * v0 + 2 * a * d));

  function trapez(b) {
    const v0 = b.ulaz, v1 = b.izlaz, vc = b.krstarenje, a = b.a, d = b.d;
    let du = Math.max(0, putUbrzanja(v0, vc, a)), dk = Math.max(0, putUbrzanja(vc, v1, -a)), dc = d - du - dk, vv = vc;
    if (dc < 0) { du = Math.min(Math.max(putPresjeka(v0, v1, a, d), 0), d); dc = 0; vv = brzinaNaPutu(v0, du, a); dk = d - du; }
    b.du = du; b.dc = dc; b.vv = vv;
    const tu = a > 0 ? Math.max(0, (vv - v0) / a) : 0;
    const tk = a > 0 ? Math.max(0, (vv - v1) / a) : 0;
    const tc = vv > 0 ? dc / vv : 0;
    b.t = tu + tc + tk;
  }

  // Planer: blokovi se dodaju jedan po jedan; vrijeme bloka postaje konačno kad je blok dovoljno daleko iza (kao u PrusaSliceru).
  function Planer(lim) {
    this.lim = lim || kopija(MK3S);
    this.a_ispis = this.lim.a_ispis; this.a_hod = this.lim.a_hod; this.a_povlacenje = this.lim.a_povlacenje;
    this.blokovi = []; this.gotovo = 0;
    this.pret = { v: 0, osi: [0, 0, 0, 0], sigurna: 0 };
  }
  Planer.prototype.M204 = function (S, P, R, T) {
    const L = this.lim;
    if (S != null) { this.a_ispis = Math.min(S, L.a_ispis); this.a_hod = Math.min(S, L.a_hod); if (T != null) this.a_povlacenje = Math.min(T, L.a_povlacenje); }
    else { if (P != null) this.a_ispis = Math.min(P, L.a_ispis); if (R != null) this.a_povlacenje = Math.min(R, L.a_povlacenje); if (T != null) this.a_hod = Math.min(T, L.a_hod); }
  };
  // delta: [dx, dy, dz, de] u mm, F u mm/s; vraća blok (vrijeme se upisuje kasnije)
  Planer.prototype.dodaj = function (delta, F, oznaka) {
    const L = this.lim;
    const dxyz = Math.hypot(delta[0], delta[1], delta[2]);
    const d = dxyz > 0 ? dxyz : Math.abs(delta[3]);
    if (d <= 0) return null;
    const samoE = dxyz === 0, ispis = delta[3] > 0 && !samoE;
    let v = Math.max(F, ispis ? L.min_v_ispis : L.min_v_hod);
    const inv = 1 / d, osi = [0, 0, 0, 0], abs = [0, 0, 0, 0];
    let fak = 1;
    for (let k = 0; k < OSI; k++) { osi[k] = v * delta[k] * inv; abs[k] = Math.abs(osi[k]); if (abs[k] > 0 && L.max_v[k]) fak = Math.min(fak, L.max_v[k] / abs[k]); }
    v *= fak; if (fak < 1) for (let k = 0; k < OSI; k++) { osi[k] *= fak; abs[k] *= fak; }
    let a = samoE ? this.a_povlacenje : (delta[3] > 0 ? this.a_ispis : this.a_hod);
    for (let k = 0; k < OSI; k++) { const r = Math.abs(delta[k]) * inv; if (r > 0 && a * r > L.max_a[k]) a = L.max_a[k] / r; }
    let sigurna = v;
    for (let k = 0; k < OSI; k++) if (abs[k] > L.jerk[k]) sigurna = Math.min(sigurna, L.jerk[k]);
    const p = this.pret; let vj = sigurna;
    if (this.blokovi.length > this.gotovo && p.v > 1e-4) {
      const vecaPret = p.v > v, fs = vecaPret ? v / p.v : p.v / v;
      vj = vecaPret ? v : p.v;
      let vf = 1, ogr = false;
      for (let k = 0; k < OSI; k++) {
        let vi = p.osi[k], vu = osi[k];
        if (vecaPret) vi *= fs;
        if (ogr) { vi *= vf; vu *= vf; }
        const j = vi > vu ? ((vu > 0 || vi < 0) ? vi - vu : Math.max(vi, -vu)) : ((vu < 0 || vi > 0) ? vu - vi : Math.max(-vi, vu));
        if (j > L.jerk[k]) { vf *= L.jerk[k] / j; ogr = true; }
      }
      if (ogr) vj *= vf;
      const prag = vj * 0.99;
      if (p.sigurna > prag && sigurna > prag) vj = sigurna;
    }
    const vdop = maxDopustena(-a, sigurna, d);
    const b = { d, a, krstarenje: v, ulaz: Math.min(vj, vdop), izlaz: sigurna, maxUlaz: vj, nominalna: v <= vdop, sigurna, t: 0, oznaka };
    this.blokovi.push(b);
    this.pret = { v, osi, sigurna };
    if (this.blokovi.length - this.gotovo > 64) this.izracunaj(false);
    return b;
  };
  Planer.prototype.izracunaj = function (sve) {
    const B = this.blokovi, n = B.length, od = this.gotovo;
    if (n - od < 2 && !sve) return;
    for (let i = n - 2; i >= od; i--) {          // povratni prolaz
      const c = B[i], nx = B[i + 1];
      if (c.ulaz !== c.maxUlaz) {
        if (!c.nominalna && c.maxUlaz > nx.ulaz) c.ulaz = Math.min(c.maxUlaz, maxDopustena(-c.a, nx.ulaz, c.d));
        else c.ulaz = c.maxUlaz;
      }
    }
    for (let i = od + 1; i < n; i++) {           // unaprijedni prolaz
      const p = B[i - 1], c = B[i];
      if (!p.nominalna && p.ulaz < c.ulaz) c.ulaz = Math.min(c.ulaz, maxDopustena(-p.a, p.ulaz, p.d));
    }
    const kraj = sve ? n : n - 32;               // zadnjih 32 bloka još se mogu promijeniti
    for (let i = od; i < kraj; i++) { const c = B[i]; c.izlaz = i + 1 < n ? B[i + 1].ulaz : c.sigurna; trapez(c); }
    this.gotovo = Math.max(od, kraj);
  };

  // ---------------- čitanje G-koda ----------------
  const TIPOVI = {
    'External perimeter': 'vanjski', 'Perimeter': 'perimetar', 'Overhang perimeter': 'prepust', 'Internal infill': 'ispuna',
    'Solid infill': 'puna', 'Top solid infill': 'gornja', 'Bridge infill': 'most', 'Gap fill': 'praznine', 'Skirt': 'obrub', 'Skirt/Brim': 'obrub', 'Brim': 'obrub',
    'Support material': 'potpora', 'Support material interface': 'potpora', 'Wipe tower': 'ostalo', 'Custom': 'ostalo'
  };
  function broj(s, slovo) { const i = s.indexOf(slovo); if (i < 0) return null; const m = /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i.exec(s.slice(i + 1)); return m ? parseFloat(m[0]) : null; }

  // Vraća: { pomaci: Float32Array (x0 y0 z0 x1 y1 z1 po pomaku), tip: Uint8Array, t1: Float32Array (kraj pomaka u s), e: Float32Array (mm filamenta),
  //          linija: Int32Array (redak G-koda), slojevi: [{z, t0, t1, i0, i1}], ukupno: {...}, rezac: {...} }
  const KODOVI = ['hod', 'vanjski', 'perimetar', 'prepust', 'ispuna', 'puna', 'gornja', 'most', 'praznine', 'obrub', 'potpora', 'ostalo', 'povlacenje'];
  function citaj(tekst, opc) {
    opc = opc || {};
    const lim = kopija(opc.lim || MK3S);
    const red = tekst.split(/\r?\n/);
    // ograničenja stroja iz G-koda (M201/M203/M205) imaju prednost
    for (let i = 0; i < Math.min(red.length, 400); i++) {
      const r = red[i].split(';')[0].trim().toUpperCase();
      if (r.startsWith('M201 ')) ['X', 'Y', 'Z', 'E'].forEach((s, k) => { const v = broj(r, s); if (v != null) lim.max_a[k] = v; });
      else if (r.startsWith('M203 ')) ['X', 'Y', 'Z', 'E'].forEach((s, k) => { const v = broj(r, s); if (v != null) lim.max_v[k] = v; });
      else if (r.startsWith('M205 ')) { ['X', 'Y', 'Z', 'E'].forEach((s, k) => { const v = broj(r, s); if (v != null) lim.jerk[k] = v; }); const S = broj(r, 'S'), T = broj(r, 'T'); if (S != null) lim.min_v_ispis = S; if (T != null) lim.min_v_hod = T; }
      else if (r.startsWith('M204 ') && /P|R|T/.test(r.slice(5)) && broj(r, 'S') == null) { const P = broj(r, 'P'), R = broj(r, 'R'), T = broj(r, 'T'); if (P != null) lim.a_ispis = P; if (R != null) lim.a_povlacenje = R; if (T != null) lim.a_hod = T; }
    }
    const pl = new Planer(lim);
    let x = 0, y = 0, z = 0, e = 0, F = 1500 / 60, absXYZ = true, absE = true, tip = 'ostalo', inch = false;
    const P = [], T = [], E = [], LIN = [], B = [], cekanja = [];
    const slojevi = []; let sloj = null;
    let rezac = { ime: '', procjena: '', procjenaS: null, filament_mm: null, filament_g: null, filament_cm3: null, cijena: null, postavke: {} };
    let temp = { mlaznica: 0, podloga: 0 }, dos = { mlaznica: 22, podloga: 22 }, gotovaZ = 0, maxZ = 0, min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9], eUk = 0;
    const g1 = (r, i, brzi) => {
      const nx = broj(r, 'X'), ny = broj(r, 'Y'), nz = broj(r, 'Z'), ne = broj(r, 'E'), nf = broj(r, 'F');
      if (nf != null) F = nf / 60;
      if (nx == null && ny == null && nz == null && ne == null) return;
      const k = inch ? 25.4 : 1;
      const tx = nx == null ? x : (absXYZ ? nx * k : x + nx * k), ty = ny == null ? y : (absXYZ ? ny * k : y + ny * k), tz = nz == null ? z : (absXYZ ? nz * k : z + nz * k);
      let de = 0; if (ne != null) { de = absE ? ne * k - e : ne * k; e = absE ? ne * k : e + ne * k; }
      const blok = pl.dodaj([tx - x, ty - y, tz - z, de], F, null);
      if (blok) {
        const xyz = (tx !== x || ty !== y || tz !== z);
        const t = !xyz ? 'povlacenje' : (de > 1e-6 ? (tip in TIPOVI ? TIPOVI[tip] : 'ostalo') : 'hod');
        P.push(x, y, z, tx, ty, tz); E.push(de); LIN.push(i); B.push(blok); T.push(KODOVI.indexOf(t));
        if (de > 0 && xyz) { eUk += de; { min[0] = Math.min(min[0], x, tx); min[1] = Math.min(min[1], y, ty); min[2] = Math.min(min[2], tz); max[0] = Math.max(max[0], x, tx); max[1] = Math.max(max[1], y, ty); max[2] = Math.max(max[2], tz); maxZ = Math.max(maxZ, tz); } }
        if (de > 1e-6 && xyz && tz > 0.05 && (sloj === null || tz > sloj.z + 1e-4)) { sloj = { z: tz, i0: P.length / 6 - 1 }; slojevi.push(sloj); }
      }
      x = tx; y = ty; z = tz;
    };
    for (let i = 0; i < red.length; i++) {
      const sir = red[i]; if (!sir) continue;
      if (sir[0] === ';') {
        if (sir.startsWith(';TYPE:')) tip = sir.slice(6).trim();
        else if (sir.startsWith('; generated by')) rezac.ime = sir.slice(15).trim();
        else if (sir.startsWith('; estimated printing time (normal mode)')) { rezac.procjena = sir.split('=')[1].trim(); rezac.procjenaS = uSekunde(rezac.procjena); }
        else if (sir.startsWith('; filament used [mm]')) rezac.filament_mm = parseFloat(sir.split('=')[1]);
        else if (sir.startsWith('; filament used [g]')) rezac.filament_g = parseFloat(sir.split('=')[1]);
        else if (sir.startsWith('; filament used [cm3]')) rezac.filament_cm3 = parseFloat(sir.split('=')[1]);
        else if (sir.startsWith('; total filament cost') || sir.startsWith('; filament cost')) rezac.cijena = parseFloat(sir.split('=')[1]);
        else if (/^; [a-z_0-9]+ = /.test(sir) && i > red.length - 600) { const j = sir.indexOf(' = '); rezac.postavke[sir.slice(2, j)] = sir.slice(j + 3); }
        continue;
      }
      const r = sir.split(';')[0].trim().toUpperCase(); if (!r) continue;
      const c = r.split(/\s+/)[0];
      if (c === 'G1' || c === 'G0') g1(r, i);
      else if (c === 'G90') { absXYZ = true; absE = true; }
      else if (c === 'G91') { absXYZ = false; absE = false; }
      else if (c === 'M82') absE = true;
      else if (c === 'M83') absE = false;
      else if (c === 'G20') inch = true;
      else if (c === 'G21') inch = false;
      else if (c === 'G92') { const ne = broj(r, 'E'), nx = broj(r, 'X'), ny = broj(r, 'Y'), nz = broj(r, 'Z'); if (ne != null) e = ne; if (nx != null) x = nx; if (ny != null) y = ny; if (nz != null) z = nz; }
      else if (c === 'G28') { x = 0; y = 0; z = 0; }
      else if (c === 'M204') pl.M204(broj(r, 'S'), broj(r, 'P'), broj(r, 'R'), broj(r, 'T'));
      else if (c === 'G4') { const S = broj(r, 'S'), Pm = broj(r, 'P'); const t = (S || 0) + (Pm || 0) / 1000; if (t > 0) { const b = { t, cekanje: true }; pl.izracunaj(true); pl.blokovi.push(b); pl.gotovo = pl.blokovi.length; P.push(x, y, z, x, y, z); E.push(0); LIN.push(i); B.push(b); T.push(KODOVI.indexOf('ostalo')); } }
      else if (c === 'M104' || c === 'M109') { const S = broj(r, 'S'); if (S != null && S > 0) { if (c === 'M109') { cekanja.push({ i, vrsta: 'mlaznica', od: dos.mlaznica, na: S, poz: P.length / 6 }); dos.mlaznica = S; } temp.mlaznica = S; } }
      else if (c === 'M140' || c === 'M190') { const S = broj(r, 'S'); if (S != null && S > 0) { if (c === 'M190') { cekanja.push({ i, vrsta: 'podloga', od: dos.podloga, na: S, poz: P.length / 6 }); dos.podloga = S; } temp.podloga = S; } }
    }
    pl.izracunaj(true);
    const n = B.length, t1 = new Float32Array(n);
    let tUk = 0; const poTipu = {}, duljPoTipu = {};
    KODOVI.forEach(k => { poTipu[k] = 0; duljPoTipu[k] = 0; });
    for (let i = 0; i < n; i++) {
      tUk += B[i].t; t1[i] = tUk;
      const k = KODOVI[T[i]]; poTipu[k] += B[i].t;
      const o = 6 * i; duljPoTipu[k] += Math.hypot(P[o + 3] - P[o], P[o + 4] - P[o + 1], P[o + 5] - P[o + 2]);
    }
    for (let s = 0; s < slojevi.length; s++) {
      const S = slojevi[s]; S.i1 = s + 1 < slojevi.length ? slojevi[s + 1].i0 - 1 : n - 1;
      S.t0 = S.i0 > 0 ? t1[S.i0 - 1] : 0; S.t1 = t1[S.i1]; S.h = s ? S.z - slojevi[s - 1].z : S.z;
    }
    const D = opc.promjer || parseFloat(rezac.postavke.filament_diameter) || 1.75;
    const rho = opc.gustoca || parseFloat(rezac.postavke.filament_density) || 1.24;
    const A = Math.PI * D * D / 4;
    return {
      pomaci: new Float32Array(P), tip: new Uint8Array(T), t1, e: new Float32Array(E), linija: new Int32Array(LIN), redaka: red.length,
      slojevi, poTipu, duljPoTipu, kodovi: KODOVI, cekanja, lim,
      ukupno: { t: tUk, filament_mm: eUk, cm3: eUk * A / 1000, g: eUk * A / 1000 * rho, slojeva: slojevi.length, visina: maxZ, min, max },
      rezac
    };
  }
  function uSekunde(s) { let t = 0; const m = /(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/.exec(s.trim()); if (!m) return null; t = (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0); return t; }
  // procjena grijanja (s): podloga MK52 i mlaznica E3D V6 od sobne temperature; [PROCJENA] — mjeri se na stvarnom pisaču
  function grijanje(od, na, vrsta) {
    const T0 = Math.max(od || 22, 22);
    if (na <= T0) return 0;
    if (vrsta === 'podloga') return Math.max(0, (na - T0)) * 2.6 + (na > 90 ? (na - 90) * 4 : 0);
    return Math.max(0, (na - T0)) * 0.55;
  }
  glob.FTQ_PROCJENA = { MK3S, Planer, citaj, uSekunde, grijanje, KODOVI };
  if (typeof module !== 'undefined') module.exports = glob.FTQ_PROCJENA;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
