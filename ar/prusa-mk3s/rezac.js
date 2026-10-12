// rezac.js — rezač (slicer) za Original Prusa i3 MK3S u pregledniku: od trokuta modela do G-koda.
// Slojevi presjekom ravninom, otoci i rupe (Clipper), perimetri pomakom obrisa, gornji/donji puni slojevi i mostovi iz razlike slojeva,
// ispuna (linije, rešetka, trokuti, giroid, koncentrično), potpore ispod prepusta, obrub i rub (brim), usporavanje kratkih slojeva,
// ventilator, povlačenje i podizanje Z, MK3S početni i završni G-kod. Treba ClipperLib (clipper.min.js).
// Obrazovni rezač: za stvarni ispis i dalje PrusaSlicer (nema „wipe”, „ironing”, promjenjive visine sloja, pametnog spajanja ispune po obodu…).
(function (glob) {
  'use strict';
  const CL = glob.ClipperLib;
  const SK = 1000;                      // Clipper radi s cijelim brojevima: 1 µm
  const PT = CL.PolyType, CT = CL.ClipType, PFT = CL.PolyFillType, JT = CL.JoinType, ET = CL.EndType;

  // ---------- Clipper pomoćne ----------
  const uC = L => L.map(p => ({ X: Math.round(p[0] * SK), Y: Math.round(p[1] * SK) }));
  const izC = P => P.map(p => [p.X / SK, p.Y / SK]);
  function op(a, b, tip, fill) {
    const c = new CL.Clipper(), r = new CL.Paths();
    if (a && a.length) c.AddPaths(a, PT.ptSubject, true);
    if (b && b.length) c.AddPaths(b, PT.ptClip, true);
    c.Execute(tip, r, fill || PFT.pftNonZero, fill || PFT.pftNonZero);
    return r;
  }
  const unija = (a, b) => op(a, b || [], CT.ctUnion);
  const razlika = (a, b) => (!a.length ? [] : !b || !b.length ? a : op(a, b, CT.ctDifference));
  const presjekP = (a, b) => (!a.length || !b || !b.length ? [] : op(a, b, CT.ctIntersection));
  function pomak(P, d, okruglo) {
    if (!P.length) return [];
    const o = new CL.ClipperOffset(2, 0.02 * SK), r = new CL.Paths();
    o.AddPaths(P, okruglo ? JT.jtRound : JT.jtMiter, ET.etClosedPolygon); o.Execute(r, d * SK);
    return r;
  }
  const povrsina = P => P.reduce((s, p) => s + CL.Clipper.Area(p), 0) / (SK * SK);
  function ocisti(P, minA) { return P.filter(p => Math.abs(CL.Clipper.Area(p)) / (SK * SK) >= (minA || 0.05)); }
  function otoci(P) {                       // [{vanjski, rupe}] u Clipper koordinatama
    const c = new CL.Clipper(), t = new CL.PolyTree();
    c.AddPaths(P, PT.ptSubject, true); c.Execute(CT.ctUnion, t, PFT.pftNonZero, PFT.pftNonZero);
    return CL.JS.PolyTreeToExPolygons(t).map(e => ({ vanjski: e.outer, rupe: e.holes, sve: [e.outer].concat(e.holes) }));
  }
  function odrezi(linije, P) {             // otvorene linije (Clipper) unutar područja P
    if (!linije.length || !P.length) return [];
    linije = linije.map(L => L.filter((p, i) => i === 0 || p.X !== L[i - 1].X || p.Y !== L[i - 1].Y)).filter(L => L.length >= 2);
    if (!linije.length) return [];
    const c = new CL.Clipper(), t = new CL.PolyTree();
    c.AddPaths(linije, PT.ptSubject, false); c.AddPaths(P, PT.ptClip, true);
    c.Execute(CT.ctIntersection, t, PFT.pftNonZero, PFT.pftNonZero);
    return CL.Clipper.OpenPathsFromPolyTree(t);
  }
  function granice(P) { let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18; P.forEach(p => p.forEach(q => { if (q.X < x0) x0 = q.X; if (q.X > x1) x1 = q.X; if (q.Y < y0) y0 = q.Y; if (q.Y > y1) y1 = q.Y; })); return [x0, y0, x1, y1]; }

  // ---------- presjek mreže ravninom ----------
  function pripremiTrokute(T) {           // trokuti sortirani po zmin za brzi prolaz kroz slojeve
    const n = T.length / 9, red = new Uint32Array(n), zmin = new Float32Array(n), zmax = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = 9 * i; zmin[i] = Math.min(T[o + 2], T[o + 5], T[o + 8]); zmax[i] = Math.max(T[o + 2], T[o + 5], T[o + 8]); red[i] = i; }
    red.sort((a, b) => zmin[a] - zmin[b]);
    return { T, n, red, zmin, zmax, poz: 0, aktivni: [] };
  }
  function presjek(M, z) {
    const { T, red, zmin, zmax } = M;
    while (M.poz < M.n && zmin[red[M.poz]] <= z) { M.aktivni.push(red[M.poz]); M.poz++; }
    M.aktivni = M.aktivni.filter(i => zmax[i] >= z);
    const seg = [];
    for (const t of M.aktivni) {
      const o = 9 * t, d0 = T[o + 2] - z, d1 = T[o + 5] - z, d2 = T[o + 8] - z;
      const v = [[T[o], T[o + 1], d0], [T[o + 3], T[o + 4], d1], [T[o + 6], T[o + 7], d2]];
      const pts = [];
      for (let k = 0; k < 3; k++) {
        const a = v[k], b = v[(k + 1) % 3];
        if ((a[2] > 0) !== (b[2] > 0)) { const s = a[2] / (a[2] - b[2]); pts.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]); }
      }
      if (pts.length === 2) seg.push(pts);
    }
    return lanciPetlji(seg);
  }
  function lanciPetlji(seg) {              // spoji odsječke u zatvorene petlje (krajevi zaokruženi na 1 µm)
    const k = p => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000);
    const mapa = new Map(), n = seg.length, kor = new Uint8Array(n);
    seg.forEach((s, i) => { [0, 1].forEach(j => { const kk = k(s[j]); let l = mapa.get(kk); if (!l) mapa.set(kk, l = []); l.push(i); }); });
    const petlje = [];
    for (let s = 0; s < n; s++) {
      if (kor[s]) continue; kor[s] = 1;
      const L = [seg[s][0], seg[s][1]], start = k(seg[s][0]); let kraj = seg[s][1];
      for (let g = 0; g < n; g++) {
        const kk = k(kraj); if (kk === start) break;
        const kand = (mapa.get(kk) || []).find(i => !kor[i]); if (kand == null) break;
        kor[kand] = 1; const a = seg[kand][0], b = seg[kand][1];
        kraj = k(a) === kk ? b : a; L.push(kraj);
      }
      if (L.length >= 3) petlje.push(L);   // i otvorene lance zatvaramo: popravak manjih rupa u mreži
    }
    return petlje;
  }

  // ---------- uzorci ispune ----------
  function paralelne(P, razmak, kut, pomakFaze) {   // paralelne linije pod kutom (°) kroz područje P, razmak u mm
    if (!P.length || razmak <= 0) return [];
    const [x0, y0, x1, y1] = granice(P), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + SK;
    const a = kut * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), s = razmak * SK;
    const lin = [];
    // linije su poravnate na globalnu mrežu (kao u rezaču), pa se slojevi s istim kutom poklapaju
    const d0 = cx * -sa + cy * ca, ph = (pomakFaze || 0) * s;
    const kmin = Math.floor((d0 - R - ph) / s), kmax = Math.ceil((d0 + R - ph) / s);
    const t0 = cx * ca + cy * sa;
    for (let k = kmin; k <= kmax; k++) {
      const d = k * s + ph;
      lin.push([{ X: Math.round(-sa * d + ca * (t0 - R)), Y: Math.round(ca * d + sa * (t0 - R)) }, { X: Math.round(-sa * d + ca * (t0 + R)), Y: Math.round(ca * d + sa * (t0 + R)) }]);
    }
    return odrezi(lin, P);
  }
  function giroid(P, z, period) {          // presjek giroida sin x cos y + sin y cos z + sin z cos x = 0 ravninom z; period u mm
    if (!P.length) return [];
    const [x0, y0, x1, y1] = granice(P).map(v => v / SK), k = 2 * Math.PI / period, h = period / 18;
    const nx = Math.ceil((x1 - x0) / h) + 2, ny = Math.ceil((y1 - y0) / h) + 2, X0 = x0 - h, Y0 = y0 - h;
    const sz = Math.sin(k * z), cz = Math.cos(k * z), f = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = k * (X0 + i * h), y = k * (Y0 + j * h); f[j * nx + i] = Math.sin(x) * Math.cos(y) + Math.sin(y) * cz + sz * Math.cos(x); }
    const seg = [], tocka = (i0, j0, i1, j1) => { const a = f[j0 * nx + i0], b = f[j1 * nx + i1], s = a / (a - b); return [X0 + (i0 + (i1 - i0) * s) * h, Y0 + (j0 + (j1 - j0) * s) * h]; };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const v = [f[j * nx + i], f[j * nx + i + 1], f[(j + 1) * nx + i + 1], f[(j + 1) * nx + i]];
      const rub = [[i, j, i + 1, j], [i + 1, j, i + 1, j + 1], [i, j + 1, i + 1, j + 1], [i, j, i, j + 1]];
      const pts = []; const pr = [[0, 1], [1, 2], [3, 2], [0, 3]];
      for (let e = 0; e < 4; e++) { const a = v[pr[e][0]], b = v[pr[e][1]]; if ((a > 0) !== (b > 0)) pts.push(tocka(...rub[e])); }
      if (pts.length === 2) seg.push(pts); else if (pts.length === 4) { seg.push([pts[0], pts[1]]); seg.push([pts[2], pts[3]]); }
    }
    // odsječke spoji u otvorene lance
    const kk = p => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4), mapa = new Map(), kor = new Uint8Array(seg.length);
    seg.forEach((s, i) => [0, 1].forEach(j => { const c = kk(s[j]); let l = mapa.get(c); if (!l) mapa.set(c, l = []); l.push(i); }));
    const lanci = [];
    const produzi = (L, kraj) => { for (;;) { const c = kk(kraj), n = (mapa.get(c) || []).find(i => !kor[i]); if (n == null) return; kor[n] = 1; kraj = kk(seg[n][0]) === c ? seg[n][1] : seg[n][0]; L.push(kraj); } };
    for (let s = 0; s < seg.length; s++) {
      if (kor[s]) continue; kor[s] = 1;
      const L = [seg[s][0], seg[s][1]]; produzi(L, seg[s][1]);
      const R = [seg[s][0]]; produzi(R, seg[s][0]);
      lanci.push(R.reverse().concat(L.slice(1)));
    }
    return odrezi(lanci.map(uC), P);
  }
  let GIROID_L = null;                     // duljina linija giroida po mm² za period 10 mm (kalibracija gustoće)
  function giroidKalibracija() {
    if (GIROID_L) return GIROID_L;
    const kv = [uC([[0, 0], [60, 0], [60, 60], [0, 60]])]; let L = 0, n = 0;
    for (let z = 0; z < 10; z += 1.25) { giroid(kv, z, 10).forEach(p => { for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].X - p[i - 1].X, p[i].Y - p[i - 1].Y) / SK; }); n++; }
    return GIROID_L = L / n / 3600;
  }
  function koncentricno(P, razmak) {
    const out = []; let R = pomak(P, -razmak / 2);
    for (let g = 0; g < 400 && R.length; g++) { R.forEach(p => out.push(p.concat([p[0]]))); R = pomak(R, -razmak); }
    return out;
  }

  // ---------- poredak puteva (najbliži sljedeći) ----------
  function poredaj(putevi, start, zatvoreni) {
    const ostalo = putevi.slice(), out = []; let p = start;
    while (ostalo.length) {
      let bi = 0, bd = Infinity, obrni = false;
      for (let i = 0; i < ostalo.length; i++) {
        const L = ostalo[i];
        if (zatvoreni) {
          const c = L.c || (L.c = L.reduce((a, q) => [a[0] + q[0] / L.length, a[1] + q[1] / L.length], [0, 0]));
          const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2; if (d < bd) { bd = d; bi = i; }
        } else {
          const a = L[0], b = L[L.length - 1];
          const da = (a[0] - p[0]) ** 2 + (a[1] - p[1]) ** 2, db = (b[0] - p[0]) ** 2 + (b[1] - p[1]) ** 2;
          if (da < bd) { bd = da; bi = i; obrni = false; } if (db < bd) { bd = db; bi = i; obrni = true; }
        }
      }
      let L = ostalo.splice(bi, 1)[0];
      if (zatvoreni) {   // šav na točki najbližoj prethodnom položaju
        let bk = 0, bd2 = Infinity; for (let k = 0; k < L.length; k++) { const d = (L[k][0] - p[0]) ** 2 + (L[k][1] - p[1]) ** 2; if (d < bd2) { bd2 = d; bk = k; } }
        L = L.slice(bk).concat(L.slice(0, bk + 1));
      }
      else if (obrni) L = L.slice().reverse();
      out.push(L); p = L[L.length - 1];
    }
    return { out, kraj: p };
  }

  // ---------- glavna funkcija ----------
  // T: Float32Array trokuta u koordinatama pisača (mm, z od 0); S: postavke; javi(udio, poruka) za napredak
  function izreži(T, S, javi) {
    javi = javi || (() => { });
    const M = pripremiTrokute(T);
    let zmax = 0; for (let i = 2; i < T.length; i += 3) if (T[i] > zmax) zmax = T[i];
    const zs = []; { let z = S.h1; while (z <= zmax + 1e-6) { zs.push(z); z += S.h; } if (!zs.length || zmax - zs[zs.length - 1] > S.h * 0.5) zs.push(zs.length ? zs[zs.length - 1] + S.h : S.h1); }
    const N = zs.length;
    // 1) presjeci slojeva (ravnina u sredini sloja)
    const R = [];
    for (let i = 0; i < N; i++) {
      const h = i ? zs[i] - zs[i - 1] : zs[0], zr = Math.min(zs[i] - h / 2, zmax - 1e-4);
      const petlje = presjek(M, Math.max(zr, 1e-4)).map(uC);
      R.push(ocisti(CL.Clipper.CleanPolygons(CL.Clipper.SimplifyPolygons(petlje, PFT.pftEvenOdd), 0.05 * SK), 0.02));
      if (i % 20 === 0) javi(0.25 * i / N, 'Presjeci slojeva ' + (i + 1) + '/' + N);
    }
    // 2) unutrašnjost, gornje i donje plohe
    const wv = S.wv, w = S.w, n = S.perimetri;
    const unutra = R.map((P, i) => n ? pomak(P, -(wv + (n - 1) * w) + S.preklop * w) : P);
    const izlozenoGore = R.map((P, i) => i + 1 < N ? ocisti(razlika(P, pomak(R[i + 1], -0.25 * w)), 0.5) : P);
    const izlozenoDolje = R.map((P, i) => i > 0 ? ocisti(razlika(P, pomak(R[i - 1], -0.25 * w)), 0.5) : P);
    const nG = Math.max(S.gornji, Math.ceil((S.gornjiMin || 0) / S.h - 1e-6)), nD = Math.max(S.donji, Math.ceil((S.donjiMin || 0) / S.h - 1e-6));
    // 3) potpore
    const potpore = new Array(N).fill(null).map(() => []), sucelje = new Array(N).fill(null).map(() => []);
    if (S.potpore !== 'ne') {
      const off = S.h / Math.tan(S.potporeKut * Math.PI / 180);
      const prepust = R.map((P, i) => i > 0 ? ocisti(razlika(P, pomak(R[i - 1], off)), 1.0) : []);
      let nosi = [], ispod = [];
      const sjena = []; { let u = []; for (let i = 0; i < N; i++) { u = unija(u, R[i]); sjena.push(u); } }
      for (let i = N - 2; i >= 0; i--) {
        nosi = unija(nosi, i + 2 < N ? prepust[i + 2] : []);         // razmak potpore od dijela: jedan sloj
        let s = razlika(nosi, pomak(R[i], S.potporeXY));
        if (S.potpore === 'podloga' && i > 0) s = razlika(s, pomak(sjena[i - 1], S.potporeXY));
        s = ocisti(s, 0.8);
        nosi = s.length ? nosi : [];
        if (S.potpore === 'podloga') nosi = razlika(nosi, i > 0 ? sjena[i - 1] : []);
        potpore[i] = s;
        if (i % 20 === 0) javi(0.25 + 0.15 * (N - i) / N, 'Potpore ' + (N - i) + '/' + N);
      }
      for (let i = 0; i < N; i++) {                                  // dva sloja ispod dijela su gusto sučelje
        if (!potpore[i].length) continue;
        const iznad = unija(i + 2 < N ? R[i + 2] : [], i + 3 < N ? R[i + 3] : []);
        sucelje[i] = presjekP(potpore[i], pomak(iznad, S.potporeXY + 0.5));
      }
    }
    // 4) putevi po slojevima
    const slojevi = [];
    let polozaj = [0, 0];
    const gustoca = Math.max(0, Math.min(1, S.ispuna / 100));
    for (let i = 0; i < N; i++) {
      const prvi = i === 0, wl = prvi ? S.w1 : w, sloj = { z: zs[i], h: i ? zs[i] - zs[i - 1] : zs[0], putevi: [] };
      const dodaj = (tip, L, zatvoren) => { if (L.length >= 2) sloj.putevi.push({ tip, t: L, zatvoren, w: tip === 'vanjski' ? (prvi ? S.w1 : wv) : wl }); };
      // obrub (skirt) i rub (brim) na prvom sloju
      if (prvi) {
        if (S.brim > 0 && R[0].length) { for (let k = Math.round(S.brim / S.w1); k >= 1; k--) { const ob = pomak(R[0], (k - 0.5) * S.w1, true); poredaj(ob.map(izC), polozaj, true).out.forEach(L => dodaj('obrub', L, true)); } }
        if (S.obrub > 0 && R[0].length) {
          const baza = pomak(unija(R[0], potpore[0]), S.brim + S.obrubRazmak, true);
          for (let k = S.obrub - 1; k >= 0; k--) { const ob = pomak(baza, k * S.w1, true); const r = poredaj(ob.map(izC), polozaj, true); r.out.forEach(L => dodaj('obrub', L, true)); polozaj = r.kraj; }
        }
      }
      // potpore
      if (potpore[i].length) {
        const gusto = sucelje[i], rijetko = razlika(potpore[i], gusto);
        const lin = paralelne(rijetko, S.potporeRazmak + w, 0).concat(paralelne(gusto, w * 1.6, 90));
        const r = poredaj(lin.map(izC), polozaj, false); r.out.forEach(L => dodaj('potpora', L, false)); polozaj = r.kraj;
      }
      // otoci: perimetri pa ispuna
      const ot = otoci(R[i]);
      const blizu = o => { const p = izC([o.vanjski[0]])[0]; return (p[0] - polozaj[0]) ** 2 + (p[1] - polozaj[1]) ** 2; };
      for (const o of ot.sort((a, b) => blizu(a) - blizu(b))) {
        const P = o.sve, petlje = [];
        for (let k = n - 1; k >= 0; k--) {
          const d = k === 0 ? -wv / 2 : -(wv + (k - 0.5) * w);
          const L = pomak(P, d); if (!L.length) continue;
          L.forEach(p => petlje.push({ k, L: izC(p) }));
        }
        for (let k = n - 1; k >= 0; k--) {
          const sk = petlje.filter(p => p.k === k).map(p => p.L);
          const r = poredaj(sk, polozaj, true); polozaj = r.kraj;
          r.out.forEach(L => {
            const opseg = L.reduce((s, p, j) => j ? s + Math.hypot(p[0] - L[j - 1][0], p[1] - L[j - 1][1]) : 0, 0);
            const tip = k === 0 ? (i > 0 && povrsina(presjekP([uC(L)], izlozenoDolje[i])) > 0.3 * opseg * w ? 'prepust' : 'vanjski') : 'perimetar';
            dodaj(tip, L, true);
            if (opseg < 2 * Math.PI * 6.5 && sloj.putevi.length) sloj.putevi[sloj.putevi.length - 1].malo = true;
          });
        }
      }
      // ispuna cijelog sloja (jednom po sloju, ne po otoku — brže za skenove s mnogo otočića)
      const U = unutra[i];
      if (U.length) {
        let gornja = [], most = [], puna = [];
        for (let j = 0; j < nG && i + j < N; j++) puna = unija(puna, izlozenoGore[i + j]);
        for (let j = 0; j < nD && i - j >= 0; j++) puna = unija(puna, izlozenoDolje[i - j]);
        gornja = ocisti(presjekP(U, izlozenoGore[i]), 0.3);
        most = i > 0 ? ocisti(razlika(presjekP(U, izlozenoDolje[i]), gornja), 0.3) : [];
        puna = ocisti(razlika(presjekP(U, pomak(puna, w)), unija(gornja, most)), 0.3);
        const rijetka = ocisti(razlika(U, unija(unija(gornja, most), puna)), 0.3);
        const kutSloja = (i % 2 ? -45 : 45);
        const skupine = [];
        if (prvi) skupine.push(['puna', paralelne(U, S.w1, kutSloja)]);
        else {
          if (rijetka.length && gustoca > 0) {
            let lin = [];
            const s1 = wl / gustoca;
            if (S.uzorak === 'linije') lin = paralelne(rijetka, s1, kutSloja);
            else if (S.uzorak === 'resetka') lin = paralelne(rijetka, 2 * s1, 45).concat(paralelne(rijetka, 2 * s1, -45));
            else if (S.uzorak === 'trokuti') lin = paralelne(rijetka, 3 * s1, 0).concat(paralelne(rijetka, 3 * s1, 60)).concat(paralelne(rijetka, 3 * s1, 120));
            else if (S.uzorak === 'koncentricno') lin = koncentricno(rijetka, s1);
            else if (S.uzorak === 'giroid') lin = giroid(rijetka, zs[i], 10 * giroidKalibracija() * wl / gustoca);
            skupine.push(['ispuna', lin]);
          }
          if (puna.length) skupine.push(['puna', paralelne(puna, wl, kutSloja)]);
          if (most.length) skupine.push(['most', paralelne(most, wl, kutSloja + 45)]);
          if (gornja.length) skupine.push(['gornja', paralelne(gornja, wl, kutSloja)]);
        }
        for (const [tip, lin] of skupine) { const r = poredaj(lin.map(izC), polozaj, false); r.out.forEach(L => dodaj(tip, L, false)); polozaj = r.kraj; }
            }
      slojevi.push(sloj);
      if (i % 10 === 0) javi(0.4 + 0.5 * i / N, 'Putevi ' + (i + 1) + '/' + N);
    }
    return slojevi;
  }

  // ---------- G-kod (MK3S, PrusaSlicer stil) ----------
  const f3 = v => (Math.round(v * 1000) / 1000).toFixed(3), f5 = v => (Math.round(v * 1e5) / 1e5).toFixed(5);
  function presjekTraga(w, h) { return (w - h) * h + Math.PI * (h / 2) ** 2; }   // pravokutnik s polukružnim krajevima (model PrusaSlicera)
  function gkod(slojevi, S, javi) {
    javi = javi || (() => { });
    const A = Math.PI * S.promjer ** 2 / 4, L = [];
    const v = S.brzine, vmaxVol = S.maxVol || 0;
    L.push('; generated by FORTRONIQ rezač (obrazovni) za Original Prusa i3 MK3S', ';', '; layer_height = ' + S.h, '; first_layer_height = ' + S.h1,
      '; perimeters = ' + S.perimetri, '; fill_density = ' + S.ispuna + '%', '; fill_pattern = ' + S.uzorak, '; support_material = ' + (S.potpore !== 'ne' ? 1 : 0),
      '; filament_type = ' + S.materijal, '; temperature = ' + S.tMlaznica, '; bed_temperature = ' + S.tPodloga, ';');
    L.push('M73 P0 R0', 'M201 X1000 Y1000 Z200 E5000 ; sets maximum accelerations, mm/sec^2', 'M203 X200 Y200 Z12 E120 ; sets maximum feedrates, mm/sec',
      'M204 P1250 R1250 T1250 ; sets acceleration (P, T) and retract acceleration (R), mm/sec^2', 'M205 X8.00 Y8.00 Z0.40 E4.50 ; sets the jerk limits, mm/sec',
      'M205 S0 T0 ; sets the minimum extruding and travel feed rate, mm/sec', 'M107', ';TYPE:Custom',
      'M862.3 P "MK3S" ; printer model check', 'M862.1 P0.4 ; nozzle diameter check', 'M115 U3.10.0 ; tell printer latest fw version', 'G90 ; use absolute coordinates',
      'M83 ; extruder relative mode', 'M104 S' + S.tMlaznica1 + ' ; set extruder temp', 'M140 S' + S.tPodloga1 + ' ; set bed temp', 'M190 S' + S.tPodloga1 + ' ; wait for bed temp',
      'M109 S' + S.tMlaznica1 + ' ; wait for extruder temp', 'G28 W ; home all without mesh bed level', 'G80 ; mesh bed leveling', 'G1 Y-3.0 F1000.0 ; go outside print area',
      'G92 E0.0', 'G1 X60.0 E9.0 F1000.0 ; intro line', 'G1 X100.0 E12.5 F1000.0 ; intro line', 'G92 E0.0', 'M221 S95', '', 'G21 ; set units to millimeters', 'G90 ; use absolute coordinates', 'M83 ; use relative distances for extrusion');
    let x = 100, y = -3, z = 0.2, F = 0, acc = 0, ventilator = 0;
    const mv = (nx, ny, nz, e, f, kom) => {
      let s = 'G1';
      if (nx != null && Math.abs(nx - x) > 5e-4) { s += ' X' + f3(nx); x = nx; }
      if (ny != null && Math.abs(ny - y) > 5e-4) { s += ' Y' + f3(ny); y = ny; }
      if (nz != null && Math.abs(nz - z) > 5e-4) { s += ' Z' + f3(nz); z = nz; }
      if (e) s += ' E' + f5(e);
      if (f && Math.abs(f - F) > 0.01) { s += ' F' + (f * 60).toFixed(3); F = f; }
      if (s !== 'G1') L.push(s + (kom ? ' ; ' + kom : ''));
    };
    const ubrz = a => { if (a !== acc) { L.push('M204 S' + a); acc = a; } };
    const povuci = () => { L.push('G1 E-' + f5(S.povlacenje) + ' F' + (S.povlacenjeV * 60).toFixed(3)); F = S.povlacenjeV; };
    const vrati = () => { L.push('G1 E' + f5(S.povlacenje) + ' F' + (S.povlacenjeV * 60).toFixed(3)); F = S.povlacenjeV; };
    const IME = { vanjski: 'External perimeter', perimetar: 'Perimeter', prepust: 'Overhang perimeter', ispuna: 'Internal infill', puna: 'Solid infill', gornja: 'Top solid infill', most: 'Bridge infill', obrub: 'Skirt', potpora: 'Support material' };
    let povuceno = false;
    slojevi.forEach((sl, i) => {
      const prvi = i === 0;
      // brzine sloja + usporavanje kratkih slojeva (slowdown_below_layer_time)
      const brz = p => {
        let b = prvi ? v.prvi : (p.malo && (p.tip === 'vanjski' || p.tip === 'perimetar')) ? v.malo : (v[p.tip] || v.perimetar);
        if (vmaxVol > 0) b = Math.min(b, vmaxVol / presjekTraga(p.w, sl.h));
        return b;
      };
      let tSloja = 0; sl.putevi.forEach(p => { let d = 0; for (let k = 1; k < p.t.length; k++) d += Math.hypot(p.t[k][0] - p.t[k - 1][0], p.t[k][1] - p.t[k - 1][1]); if (p.zatvoren) d += Math.hypot(p.t[0][0] - p.t[p.t.length - 1][0], p.t[0][1] - p.t[p.t.length - 1][1]); p.d = d; tSloja += d / brz(p); });
      const fak = !prvi && S.minVrijemeSloja > 0 && tSloja > 0 && tSloja < S.minVrijemeSloja ? tSloja / S.minVrijemeSloja : 1;
      L.push(';LAYER_CHANGE', ';Z:' + f3(sl.z).replace(/\.?0+$/, ''), ';HEIGHT:' + f3(sl.h).replace(/\.?0+$/, ''), ';BEFORE_LAYER_CHANGE', 'G92 E0.0', ';' + sl.z.toFixed(2), '', '');
      if (!povuceno) { povuci(); povuceno = true; }
      mv(null, null, sl.z + S.podizanje, 0, v.hod); L.push(';AFTER_LAYER_CHANGE');
      // ventilator: isključen na prvim slojevima, puna snaga od sloja full_fan_speed_layer
      if (S.ventilator && i >= S.ventilatorOd) { const vent = i + 1 >= S.ventilatorPun ? 255 : Math.round(255 * (i + 1 - S.ventilatorOd) / Math.max(1, S.ventilatorPun - S.ventilatorOd)); if (vent !== ventilator) { L.push('M106 S' + vent); ventilator = vent; } }
      if (i === 1) { if (S.tMlaznica !== S.tMlaznica1) L.push('M104 S' + S.tMlaznica); if (S.tPodloga !== S.tPodloga1) L.push('M140 S' + S.tPodloga); }
      let tipPret = '';
      sl.putevi.forEach(p => {
        const T = p.t.slice(); if (p.zatvoren) T.push(T[0]);
        const d0 = Math.hypot(T[0][0] - x, T[0][1] - y);
        if (d0 > S.povlacenjePrag && !povuceno) { povuci(); povuceno = true; }
        if (povuceno) {
          if (S.podizanje > 0 && d0 > S.povlacenjePrag) mv(null, null, sl.z + S.podizanje, 0, v.hod);
          ubrz(S.a.hod); mv(T[0][0], T[0][1], null, 0, v.hod); mv(null, null, sl.z, 0, v.hod); vrati(); povuceno = false;
        } else { ubrz(S.a.hod); mv(T[0][0], T[0][1], sl.z, 0, v.hod); }
        if (p.tip !== tipPret) { L.push(';TYPE:' + IME[p.tip], ';WIDTH:' + p.w.toFixed(2)); tipPret = p.tip; }
        ubrz(prvi ? S.a.prvi : (p.tip === 'vanjski' || p.tip === 'perimetar' || p.tip === 'prepust') ? S.a.perimetar : S.a.ispuna);
        const b = Math.max(S.minBrzina, brz(p) * fak), presj = presjekTraga(p.w, sl.h);
        for (let k = 1; k < T.length; k++) { const dl = Math.hypot(T[k][0] - x, T[k][1] - y); if (dl < 1e-4) continue; mv(T[k][0], T[k][1], null, dl * presj / A, b); }
      });
      if (i % 20 === 0) javi(0.9 + 0.08 * i / slojevi.length, 'G-kod ' + (i + 1) + '/' + slojevi.length);
    });
    if (!povuceno) povuci();
    L.push(';TYPE:Custom', '; Filament-specific end gcode', 'G4 ; wait', 'M221 S100', 'M104 S0 ; turn off temperature', 'M140 S0 ; turn off heatbed', 'M107 ; turn off fan',
      'G1 Z' + f3(Math.min(slojevi.length ? slojevi[slojevi.length - 1].z + 30 : 30, 210)) + ' ; Move print head up', 'G1 X0 Y200 F3000 ; home X axis', 'M84 ; disable motors', 'M73 P100 R0');
    return L.join('\n') + '\n';
  }
  // umetni M73 (postotak i preostale minute) i zaglavlje s procjenom, kao PrusaSlicer
  function dodajM73(tekst, r) {
    const red = tekst.split('\n'), T = r.ukupno.t, ubaci = new Map();
    let zadnji = -1;
    for (let i = 0; i < r.t1.length; i++) { const p = Math.floor(100 * r.t1[i] / T); if (p > zadnji && p < 100) { zadnji = p; ubaci.set(r.linija[i], 'M73 P' + p + ' R' + Math.round((T - r.t1[i]) / 60)); } }
    const out = [];
    red.forEach((l, i) => { if (ubaci.has(i)) out.push(ubaci.get(i)); out.push(l); });
    const s = Math.round(T), hms = (s >= 3600 ? Math.floor(s / 3600) + 'h ' : '') + Math.floor(s % 3600 / 60) + 'm ' + (s % 60) + 's';
    out.push('; filament used [mm] = ' + r.ukupno.filament_mm.toFixed(2), '; filament used [cm3] = ' + r.ukupno.cm3.toFixed(2), '; filament used [g] = ' + r.ukupno.g.toFixed(2),
      '; estimated printing time (normal mode) = ' + hms);
    return out.join('\n');
  }

  // ---------- analiza mreže ----------
  function analiza(T, kutPotpore) {
    const n = T.length / 9; let V = 0, A = 0, Ap = 0, Ak = 0;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], T[i + k]); hi[k] = Math.max(hi[k], T[i + k]); }
    const rubovi = new Map(), kk = (x, y, z) => Math.round(x * 1e3) + ',' + Math.round(y * 1e3) + ',' + Math.round(z * 1e3);
    const cosP = Math.cos((90 - kutPotpore) * Math.PI / 180);
    for (let t = 0; t < n; t++) {
      const o = 9 * t, ax = T[o], ay = T[o + 1], az = T[o + 2], bx = T[o + 3], by = T[o + 4], bz = T[o + 5], cx = T[o + 6], cy = T[o + 7], cz = T[o + 8];
      V += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz), a = l / 2; A += a;
      if (l > 0) {
        const nzz = nz / l, zsr = (az + bz + cz) / 3;
        if (nzz < -0.999 && zsr < lo[2] + 0.05) Ak += a;                          // dodir s podlogom
        else if (nzz < -cosP && zsr > lo[2] + 0.1) Ap += a * (-nzz);             // prepust (tlocrtna površina)
      }
      const vr = [kk(ax, ay, az), kk(bx, by, bz), kk(cx, cy, cz)];
      for (let e = 0; e < 3; e++) { const p = vr[e], q = vr[(e + 1) % 3], k = p < q ? p + '|' + q : q + '|' + p, s = p < q ? 1 : -1; const r = rubovi.get(k) || [0, 0]; r[0]++; r[1] += s; rubovi.set(k, r); }
    }
    let otvoreni = 0, viseStruki = 0, krivi = 0;
    rubovi.forEach(r => { if (r[0] === 1) otvoreni++; else if (r[0] > 2) viseStruki++; else if (r[1] !== 0) krivi++; });
    return { trokuta: n, volumen: Math.abs(V) / 1000, povrsina: A / 100, prepust: Ap / 100, dodir: Ak / 100, lo, hi, otvoreni, viseStruki, krivi, okrenut: V < 0 };
  }

  glob.FTQ_REZAC = { izreži, gkod, dodajM73, analiza, presjekTraga };
  if (typeof module !== 'undefined') module.exports = glob.FTQ_REZAC;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
