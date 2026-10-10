// putanje.js — izvori crteža za flomaster: znak, tekst, slika (obris / šrafura), DXF
// Svaki izvor vraća { potezi: [[[x,y],...],...], jedinica_mm, ime } (y gore).
// Bez ovisnosti; koristi se i izvan scene s robotom (npr. vježbe s DXF-om).

// ---------------- pomoćne ----------------
export function okvir(potezi) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of potezi) for (const [x, y] of s) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
export function duljina(s) { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; }

// Ramer-Douglas-Peucker
export function pojednostavi(s, tol) {
  if (s.length < 3) return s;
  const zatvoren = s.length > 3 && s[0][0] === s[s.length - 1][0] && s[0][1] === s[s.length - 1][1];
  const keep = new Uint8Array(s.length); keep[0] = keep[s.length - 1] = 1;
  const st = [[0, s.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let dm = 0, im = -1;
    const [ax, ay] = s[a], [bx, by] = s[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = L > 1e-9 ? Math.abs((s[i][0] - ax) * dy - (s[i][1] - ay) * dx) / L : Math.hypot(s[i][0] - ax, s[i][1] - ay);
      if (d > dm) { dm = d; im = i; }
    }
    if (dm > tol && im > 0) { keep[im] = 1; st.push([a, im], [im, b]); }
  }
  const out = s.filter((_, i) => keep[i]);
  if (zatvoren && out.length < 3) return s;
  return out;
}

// redoslijed poteza: najbliži sljedeći, otvoreni se smiju okrenuti, zatvoreni početi u najbližoj točki
export function poredaj(potezi, start = [0, 0]) {
  const ost = potezi.filter(s => s.length > 1).map(s => s.slice());
  const out = []; let cur = start;
  while (ost.length) {
    let naj = Infinity, ni = 0, nacin = 0, nk = 0;
    for (let i = 0; i < ost.length; i++) {
      const s = ost[i], zatv = s.length > 3 && Math.hypot(s[0][0] - s[s.length - 1][0], s[0][1] - s[s.length - 1][1]) < 1e-6;
      if (zatv && s.length < 400) {
        for (let k = 0; k < s.length - 1; k++) { const d = Math.hypot(s[k][0] - cur[0], s[k][1] - cur[1]); if (d < naj) { naj = d; ni = i; nacin = 2; nk = k; } }
      } else {
        const d0 = Math.hypot(s[0][0] - cur[0], s[0][1] - cur[1]), d1 = Math.hypot(s[s.length - 1][0] - cur[0], s[s.length - 1][1] - cur[1]);
        if (d0 < naj) { naj = d0; ni = i; nacin = 0; }
        if (d1 < naj) { naj = d1; ni = i; nacin = 1; }
      }
    }
    let s = ost.splice(ni, 1)[0];
    if (nacin === 1) s.reverse();
    if (nacin === 2 && nk > 0) { s = s.slice(nk, s.length - 1).concat(s.slice(0, nk + 1)); }
    out.push(s); cur = s[s.length - 1];
  }
  return out;
}

// ---------------- marching squares (binarna mreža -> zatvoreni obrisi) ----------------
// mreza: Uint8Array w*h (1 = tamno). Vraća potezi u koordinatama piksela (y dolje).
export function obrisi(mreza, w, h) {
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : mreza[y * w + x];
  // rubovi između ćelija: svaki segment spaja sredine stranica kvadrata 2x2
  const segs = new Map(); const key = (x, y) => x + ',' + y;
  const dodaj = (a, b) => {
    const ka = key(a[0], a[1]);
    if (!segs.has(ka)) segs.set(ka, []);
    segs.get(ka).push(b);
  };
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const a = g(x, y), b = g(x + 1, y), c = g(x + 1, y + 1), d = g(x, y + 1);
    const idx = a * 8 + b * 4 + c * 2 + d;
    if (idx === 0 || idx === 15) continue;
    // točke na sredinama stranica (u dvostrukim koordinatama radi cijelih brojeva)
    const T = [2 * x + 2, 2 * y + 1], R = [2 * x + 3, 2 * y + 2], B = [2 * x + 2, 2 * y + 3], L = [2 * x + 1, 2 * y + 2];
    // orijentacija: tamno lijevo od smjera
    switch (idx) {
      case 1: dodaj(B, L); break; case 2: dodaj(R, B); break; case 3: dodaj(R, L); break;
      case 4: dodaj(T, R); break; case 5: dodaj(L, T); dodaj(R, B); break; case 6: dodaj(T, B); break;
      case 7: dodaj(T, L); break; case 8: dodaj(L, T); break; case 9: dodaj(B, T); break;
      case 10: dodaj(T, R); dodaj(B, L); break; case 11: dodaj(R, T); break; case 12: dodaj(L, R); break;
      case 13: dodaj(B, R); break; case 14: dodaj(L, B); break;
    }
  }
  const out = [];
  for (const [k0, lst] of segs) {
    while (lst.length) {
      const [sx, sy] = k0.split(',').map(Number);
      const put = [[sx / 2, sy / 2]];
      let nxt = lst.pop(), guard = 0;
      while (nxt && guard++ < 1e6) {
        put.push([nxt[0] / 2, nxt[1] / 2]);
        const k = key(nxt[0], nxt[1]);
        if (k === k0) break;
        const l2 = segs.get(k); nxt = l2 && l2.length ? l2.pop() : null;
      }
      if (put.length > 2) out.push(put);
    }
  }
  return out;
}

// ---------------- tekst (jednopotezni font) ----------------
export function tekst(niz, font, opc = {}) {
  const h = opc.visina || 40, razmak = opc.razmak ?? 0.12, prored = opc.prored || 1.5, kurziv = opc.kurziv || 0;
  const potezi = []; const redovi = String(niz).split('\n');
  redovi.forEach((red, ri) => {
    let x = 0; const y0 = -ri * h * prored; const pocetak = potezi.length;
    for (const c of red) {
      const g = font[c] || font['?']; if (!g) continue;
      for (const s of g.s) potezi.push(s.map(p => [x + (p[0] + p[1] * kurziv) * h, y0 + p[1] * h]));
      x += (g.a + razmak) * h;
    }
    if (opc.poravnanje !== 'lijevo') {           // centriraj red
      const dio = potezi.slice(pocetak); if (!dio.length) return;
      const b = okvir(dio), dx = -(b[0] + b[2]) / 2;
      for (const s of dio) for (const p of s) p[0] += dx;
    }
  });
  return { potezi, slojevi: [{ ime: 'Tekst', potezi, vrsta: '01', debljina: 'debela' }], jedinica_mm: 1, ime: 'Tekst' };
}

// ---------------- slika -> potezi ----------------
// img: HTMLImageElement / ImageBitmap; opc: { prag (0-255 ili 'auto'), obrni, nacin: 'obris'|'srafura'|'oba', korak_px, maks }
export function slikaUMrezu(img, opc = {}) {
  const maks = opc.maks || 360;
  const k = Math.min(1, maks / Math.max(img.width, img.height));
  const w = Math.max(8, Math.round(img.width * k)), h = Math.max(8, Math.round(img.height * k));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data, siva = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3] / 255;
    siva[i] = Math.round((0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) * a + 255 * (1 - a));
  }
  let prag = opc.prag;
  if (prag === 'auto' || prag == null) prag = otsu(siva);
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = (siva[i] < prag) !== !!opc.obrni ? 1 : 0;
  return { m, w, h, prag };
}
function otsu(siva) {
  const hist = new Array(256).fill(0); for (const v of siva) hist[v]++;
  const n = siva.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue; const wF = n - wB; if (!wF) break;
    sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; t = i; }
  }
  return t;
}
export function mrezaUPoteze(mr, opc = {}) {
  const { m, w, h } = mr; const nacin = opc.nacin || 'obris'; const obris = [], srafura = [];
  if (nacin !== 'srafura') {
    for (const s of obrisi(m, w, h)) {
      const p = pojednostavi(s, opc.tol || 0.6);
      if (duljina(p) >= (opc.minDuljina || 3)) obris.push(p);
    }
  }
  if (nacin !== 'obris') {
    const korak = Math.max(1, opc.korak_px || 2);
    let smjer = 1;
    for (let y = korak / 2; y < h; y += korak) {
      const yi = Math.min(h - 1, Math.floor(y)); const red = [];
      let x = 0;
      while (x < w) {
        while (x < w && !m[yi * w + x]) x++;
        if (x >= w) break;
        const a = x; while (x < w && m[yi * w + x]) x++;
        if (x - a >= 1) red.push([[a + 0.15, y], [x - 0.15, y]]);
      }
      if (smjer < 0) red.reverse().forEach(s => s.reverse());
      srafura.push(...red); smjer = -smjer;
    }
  }
  const fl = s => s.map(([x, y]) => [x, h - y]);
  const slojevi = [];
  if (srafura.length) slojevi.push({ ime: 'Šrafura', potezi: srafura.map(fl), vrsta: '01', debljina: 'tanka' });
  if (obris.length) slojevi.push({ ime: 'Obris', potezi: obris.map(fl), vrsta: '01', debljina: 'debela' });
  return { potezi: slojevi.flatMap(s => s.potezi), slojevi, jedinica_mm: null, ime: 'Slika', w, h };
}

// ---------------- vrste crta po ISO 128 (duljine elemenata u visekratnicima debljine d) ----------------
export const VRSTE_CRTA = {
  '01': { ime: 'puna', uzorak: null },
  '02': { ime: 'crtkana', uzorak: [12, 3] },
  '04': { ime: 'crta-točka', uzorak: [24, 3, 0.5, 3] },
  '05': { ime: 'crta-dvije točke', uzorak: [24, 3, 0.5, 3, 0.5, 3] },
};
// razlaze potez na crtice (svaka crtica je zaseban potez, flomaster se izmedu podize)
export function crtkaj(s, vrsta, d) {
  const u = VRSTE_CRTA[vrsta] && VRSTE_CRTA[vrsta].uzorak;
  if (!u || s.length < 2) return [s];
  const L = u.map(x => Math.max(x * d, x < 1 ? 0.3 : 0.6));
  const out = []; let ui = 0, ost = L[0], cur = [s[0]];
  const dolje = () => ui % 2 === 0;
  for (let k = 1; k < s.length; k++) {
    let a = s[k - 1], b = s[k];
    let seg = Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0));
    while (seg > 1e-9) {
      if (seg <= ost) { if (dolje()) cur.push(b); ost -= seg; seg = 0; }
      else {
        const t = ost / seg, p = a.map((v, i) => v + (b[i] - v) * t);
        if (dolje()) { cur.push(p); out.push(cur); cur = []; } else cur = [p];
        a = p; seg -= ost; ui = (ui + 1) % L.length; ost = L[ui];
        if (dolje()) cur = [p];
      }
    }
  }
  if (dolje() && cur.length > 1) out.push(cur);
  return out.filter(c => c.length > 1);
}

// ---------------- DXF ----------------
export function dxf(tekstDat) {
  const L = tekstDat.split(/\r\n|\r|\n/); const par = [];
  for (let i = 0; i + 1 < L.length; i += 2) par.push([parseInt(L[i].trim(), 10), L[i + 1].trim()]);
  let i = 0, jedinice = 4; const blokovi = {}; const ent = []; let upozorenja = new Set(); const tabSlojeva = {};
  // zaglavlje: $INSUNITS
  for (let k = 0; k < par.length - 2; k++) if (par[k][0] === 9 && par[k][1] === '$INSUNITS') { jedinice = parseInt(par[k + 1][1], 10); break; }
  const mmPo = { 0: 1, 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 }[jedinice] || 1;
  function citajEntitete(kraj) {      // čita od i do ENDSEC/ENDBLK; vraća listu entiteta
    const lst = [];
    while (i < par.length) {
      const [c, v] = par[i];
      if (c === 0 && (v === kraj || v === 'ENDSEC')) return lst;
      if (c === 0) {
        const e = { tip: v, g: [] }; i++;
        while (i < par.length && par[i][0] !== 0) { e.g.push(par[i]); i++; }
        if (v === 'POLYLINE') {        // VERTEX ... SEQEND
          e.vrhovi = [];
          while (i < par.length && par[i][1] !== 'SEQEND') {
            if (par[i][0] === 0 && par[i][1] === 'VERTEX') {
              const vx = { g: [] }; i++;
              while (i < par.length && par[i][0] !== 0) { vx.g.push(par[i]); i++; }
              e.vrhovi.push(vx);
            } else i++;
          }
          i++; while (i < par.length && par[i][0] !== 0) i++;
        }
        lst.push(e); continue;
      }
      i++;
    }
    return lst;
  }
  while (i < par.length) {
    if (par[i][0] === 0 && par[i][1] === 'SECTION' && par[i + 1]) {
      const ime = par[i + 1][1]; i += 2;
      if (ime === 'ENTITIES') ent.push(...citajEntitete('ENDSEC'));
      else if (ime === 'TABLES') {
        while (i < par.length && !(par[i][0] === 0 && par[i][1] === 'ENDSEC')) {
          if (par[i][0] === 0 && par[i][1] === 'LAYER') {
            i++; let nm = null, col = 7, lt = 'CONTINUOUS';
            while (i < par.length && par[i][0] !== 0) { if (par[i][0] === 2) nm = par[i][1]; if (par[i][0] === 62) col = parseInt(par[i][1], 10); if (par[i][0] === 6) lt = par[i][1]; i++; }
            if (nm) tabSlojeva[nm] = { boja: Math.abs(col), vrsta: lt.toUpperCase() };
          } else i++;
        }
      }
      else if (ime === 'BLOCKS') {
        while (i < par.length && !(par[i][0] === 0 && par[i][1] === 'ENDSEC')) {
          if (par[i][0] === 0 && par[i][1] === 'BLOCK') {
            i++; const zag = []; while (i < par.length && par[i][0] !== 0) { zag.push(par[i]); i++; }
            const ime2 = (zag.find(p => p[0] === 2) || [0, ''])[1];
            const bx = +(zag.find(p => p[0] === 10) || [0, 0])[1], by = +(zag.find(p => p[0] === 20) || [0, 0])[1];
            const sad = citajEntitete('ENDBLK');
            blokovi[ime2] = { sad, bx, by };
            while (i < par.length && !(par[i][0] === 0 && par[i][1] === 'ENDBLK')) i++;
            i++;
          } else i++;
        }
      } else { while (i < par.length && !(par[i][0] === 0 && par[i][1] === 'ENDSEC')) i++; }
    }
    i++;
  }
  const g1 = (e, c, d = 0) => { const p = e.g.find(x => x[0] === c); return p ? parseFloat(p[1]) : d; };
  const gs = (e, c) => e.g.filter(x => x[0] === c).map(x => parseFloat(x[1]));
  const luk = (cx, cy, r, a0, a1) => {      // CCW, radijani
    while (a1 <= a0) a1 += 2 * Math.PI;
    const n = Math.max(8, Math.ceil((a1 - a0) / (Math.PI / 36) * Math.max(1, Math.sqrt(r / 20))));
    const out = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  };
  const bulgeSeg = (p0, p1, b) => {
    if (!b) return [p1];
    const th = 4 * Math.atan(b), dx = p1[0] - p0[0], dy = p1[1] - p0[1], c = Math.hypot(dx, dy);
    if (c < 1e-12) return [p1];
    const r = c / (2 * Math.sin(th / 2)), mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    const h = r * Math.cos(th / 2), nx = -dy / c, ny = dx / c;
    const cx = mx + nx * h, cy = my + ny * h;
    let a0 = Math.atan2(p0[1] - cy, p0[0] - cx), a1 = Math.atan2(p1[1] - cy, p1[0] - cx);
    let pts = b > 0 ? luk(cx, cy, Math.abs(r), a0, a1) : luk(cx, cy, Math.abs(r), a1, a0).reverse();
    return pts.slice(1);
  };
  function bspline(ctrl, deg, knots, n = 120) {
    const out = []; const k0 = knots[deg], k1 = knots[knots.length - deg - 1];
    for (let s = 0; s <= n; s++) {
      const t = Math.min(k1 - 1e-9, k0 + (k1 - k0) * s / n);
      let kk = deg; while (kk < knots.length - deg - 2 && t >= knots[kk + 1]) kk++;
      const d = []; for (let j = 0; j <= deg; j++) d.push(ctrl[Math.min(ctrl.length - 1, Math.max(0, kk - deg + j))].slice());
      for (let r = 1; r <= deg; r++) for (let j = deg; j >= r; j--) {
        const ii = kk - deg + j, den = knots[ii + deg - r + 1] - knots[ii]; const a = den ? (t - knots[ii]) / den : 0;
        d[j] = [(1 - a) * d[j - 1][0] + a * d[j][0], (1 - a) * d[j - 1][1] + a * d[j][1]];
      }
      out.push(d[deg]);
    }
    return out;
  }
  function uPoteze(lista, T, dubina = 0, slojRod = '0') {
    const out = [];
    const dodajP = (e, s) => { s.sloj = tg(e); s.lt = ((e.g.find(x => x[0] === 6) || [0, ''])[1] || '').toUpperCase(); out.push(s); };
    const tg = e => { const s = (e.g.find(x => x[0] === 8) || [0, slojRod])[1]; return s === '0' && slojRod !== '0' ? slojRod : s; };
    const tr = p => [T.a * p[0] + T.b * p[1] + T.c, T.d * p[0] + T.e * p[1] + T.f];
    for (const e of lista) {
      const t = e.tip;
      if (t === 'LINE') dodajP(e, [[g1(e, 10), g1(e, 20)], [g1(e, 11), g1(e, 21)]].map(tr));
      else if (t === 'LWPOLYLINE') {
        const xs = gs(e, 10), ys = gs(e, 20); const zat = (g1(e, 70) & 1) === 1;
        const bul = []; let vi = -1;            // bulge pripada zadnjem vrhu
        for (const [c, v] of e.g) { if (c === 10) { vi++; bul[vi] = 0; } if (c === 42 && vi >= 0) bul[vi] = parseFloat(v); }
        const P = xs.map((x, k) => [x, ys[k]]); if (!P.length) continue;
        const s = [P[0]];
        for (let k = 1; k < P.length; k++) s.push(...bulgeSeg(P[k - 1], P[k], bul[k - 1]));
        if (zat) s.push(...bulgeSeg(P[P.length - 1], P[0], bul[P.length - 1]));
        dodajP(e, s.map(tr));
      } else if (t === 'POLYLINE') {
        const zat = (g1(e, 70) & 1) === 1; const V = (e.vrhovi || []).map(v => ({ p: [g1(v, 10), g1(v, 20)], b: g1(v, 42) }));
        if (!V.length) continue; const s = [V[0].p];
        for (let k = 1; k < V.length; k++) s.push(...bulgeSeg(V[k - 1].p, V[k].p, V[k - 1].b));
        if (zat) s.push(...bulgeSeg(V[V.length - 1].p, V[0].p, V[V.length - 1].b));
        dodajP(e, s.map(tr));
      } else if (t === 'CIRCLE') dodajP(e, luk(g1(e, 10), g1(e, 20), g1(e, 40), 0, 2 * Math.PI).map(tr));
      else if (t === 'ARC') dodajP(e, luk(g1(e, 10), g1(e, 20), g1(e, 40), g1(e, 50) * Math.PI / 180, g1(e, 51) * Math.PI / 180).map(tr));
      else if (t === 'ELLIPSE') {
        const cx = g1(e, 10), cy = g1(e, 20), mx = g1(e, 11), my = g1(e, 21), rat = g1(e, 40, 1);
        let a0 = g1(e, 41, 0), a1 = g1(e, 42, 2 * Math.PI); while (a1 <= a0) a1 += 2 * Math.PI;
        const n = 96, s = [];
        for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n, ca = Math.cos(a), sa = Math.sin(a); s.push([cx + mx * ca - my * rat * sa, cy + my * ca + mx * rat * sa]); }
        dodajP(e, s.map(tr));
      } else if (t === 'SPLINE') {
        const fx = gs(e, 11), fy = gs(e, 21);
        if (fx.length > 1) { dodajP(e, fx.map((x, k) => [x, fy[k]]).map(tr)); continue; }
        const cxs = gs(e, 10), cys = gs(e, 20), kn = gs(e, 40), deg = g1(e, 71, 3);
        const C = cxs.map((x, k) => [x, cys[k]]);
        if (C.length > deg && kn.length === C.length + deg + 1) dodajP(e, bspline(C, deg, kn).map(tr)); else if (C.length > 1) dodajP(e, C.map(tr));
      } else if (t === 'INSERT' && dubina < 6) {
        const b = blokovi[(e.g.find(x => x[0] === 2) || [0, ''])[1]]; if (!b) continue;
        const sx = g1(e, 41, 1), sy = g1(e, 42, 1), rot = g1(e, 50, 0) * Math.PI / 180, ix = g1(e, 10), iy = g1(e, 20);
        const c = Math.cos(rot), s = Math.sin(rot);
        // lokalno: (p - bazna točka) * mjerilo, zakret, pomak; zatim roditeljska T
        const L2 = { a: c * sx, b: -s * sy, c: ix - (c * sx * b.bx - s * sy * b.by), d: s * sx, e: c * sy, f: iy - (s * sx * b.bx + c * sy * b.by) };
        const T2 = { a: T.a * L2.a + T.b * L2.d, b: T.a * L2.b + T.b * L2.e, c: T.a * L2.c + T.b * L2.f + T.c,
                     d: T.d * L2.a + T.e * L2.d, e: T.d * L2.b + T.e * L2.e, f: T.d * L2.c + T.e * L2.f + T.f };
        out.push(...uPoteze(b.sad, T2, dubina + 1, tg(e)));
      } else if (['TEXT', 'MTEXT', 'HATCH', 'DIMENSION', 'SOLID', '3DFACE'].includes(t)) upozorenja.add(t);
    }
    return out;
  }
  const potezi = uPoteze(ent, { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0 }).filter(s => s.length > 1);
  // grupiranje po slojevima; vrsta crte iz entiteta ili tablice slojeva
  const vrstaIz = lt => /HIDDEN|DASH(?!DOT)|DASHED|CRTK/.test(lt) ? '02' : /CENTER|DASHDOT|CRTA.?TOC|AXIS|OSI/.test(lt) ? '04' : /PHANTOM|DIVIDE|BORDER/.test(lt) ? '05' : '01';
  const mapa = new Map();
  for (const s of potezi) {
    const t = tabSlojeva[s.sloj] || {}; const lt = s.lt && s.lt !== 'BYLAYER' ? s.lt : (t.vrsta || 'CONTINUOUS');
    const vr = vrstaIz(lt), kljuc = s.sloj + '|' + vr;
    if (!mapa.has(kljuc)) {
      const tanka = vr !== '01' || /KOT|DIM|SRAF|HATCH|POMO|TANK|THIN/i.test(s.sloj);
      mapa.set(kljuc, { ime: s.sloj + (vr !== '01' && [...mapa.keys()].some(k => k.startsWith(s.sloj + '|')) ? ' (' + VRSTE_CRTA[vr].ime + ')' : ''), potezi: [], vrsta: vr, debljina: tanka ? 'tanka' : 'debela', aci: t.boja });
    }
    mapa.get(kljuc).potezi.push(s);
  }
  return { potezi, slojevi: [...mapa.values()], jedinica_mm: mmPo, ime: 'DXF', upozorenja: [...upozorenja] };
}

// ---------------- postavljanje na ploču ----------------
// crtez -> potezi u mm na ploči (ishodište = središte ploče, u desno, v gore)
export function naPlocu(crtez, ploca, opc = {}) {
  const rub = opc.rub ?? 30, posto = (opc.velicina ?? 100) / 100;
  const slojevi = crtez.slojevi || [{ ime: crtez.ime || 'Crtež', potezi: crtez.potezi, vrsta: '01', debljina: 'debela' }];
  const sve = slojevi.flatMap(s => s.potezi);
  const b = okvir(sve); const cw = b[2] - b[0] || 1, ch = b[3] - b[1] || 1;
  const kFit = Math.min((ploca.w - 2 * rub) / cw, (ploca.h - 2 * rub) / ch);
  const k = (opc.stvarno && crtez.jedinica_mm) ? crtez.jedinica_mm : kFit * posto;
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, dx = opc.dx || 0, dy = opc.dy || 0;
  const rot = (opc.zakret || 0) * Math.PI / 180, c = Math.cos(rot), s_ = Math.sin(rot);
  const tr = p => { const x = (p[0] - cx) * k, y = (p[1] - cy) * k; return p.length > 2 ? [x * c - y * s_ + dx, x * s_ + y * c + dy, p[2] * k] : [x * c - y * s_ + dx, x * s_ + y * c + dy]; };
  let start = [-ploca.w / 2, -ploca.h / 2], izvan = false;
  const izlaz = slojevi.map(sl => {
    let pot = sl.potezi.map(s => s.map(tr));
    pot = pot.map(s => s[0].length > 2 ? s : pojednostavi(s, 0.08)).filter(s => duljina(s) > 0.3 || s.length === 2);
    pot = poredaj(pot, start); if (pot.length) { const z = pot[pot.length - 1]; start = z[z.length - 1]; }
    if (pot.some(s => s.some(([u, v]) => Math.abs(u) > ploca.w / 2 || Math.abs(v) > ploca.h / 2))) izvan = true;
    return Object.assign({}, sl, { potezi: pot });
  });
  const bo = okvir(izlaz.flatMap(s => s.potezi));
  return { slojevi: izlaz, potezi: izlaz.flatMap(s => s.potezi), mjerilo: k, izvan, sirina: bo[2] - bo[0], visina: bo[3] - bo[1], okvir: bo, transf: tr };
}

// ---------------- 3D CAD model (STL, OBJ) -> putanje ----------------
// vraca Float32Array trokuta (x,y,z po vrhu, 9 brojeva po trokutu)
export function citajModel(buf, ime) {
  const ext = (ime || '').toLowerCase().split('.').pop();
  const u8 = new Uint8Array(buf);
  if (ext === 'obj') return citajObj(new TextDecoder().decode(u8));
  // STL: binarni ako se duljina slaze s brojem trokuta
  if (u8.length >= 84) {
    const dv = new DataView(buf); const n = dv.getUint32(80, true);
    if (84 + n * 50 === u8.length) {
      const out = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) for (let j = 0; j < 9; j++) out[i * 9 + j] = dv.getFloat32(84 + i * 50 + 12 + j * 4, true);
      return out;
    }
  }
  const t = new TextDecoder().decode(u8); const v = [];
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g; let m;
  while ((m = re.exec(t))) v.push(+m[1], +m[2], +m[3]);
  if (!v.length) throw new Error('nije prepoznat STL ni OBJ');
  return new Float32Array(v);
}
function citajObj(t) {
  const V = [], out = [];
  for (const red of t.split(/\r?\n/)) {
    const d = red.trim().split(/\s+/);
    if (d[0] === 'v') V.push([+d[1], +d[2], +d[3]]);
    else if (d[0] === 'f') {
      const ix = d.slice(1).map(x => { const k = parseInt(x.split('/')[0], 10); return k < 0 ? V.length + k : k - 1; });
      for (let k = 1; k + 1 < ix.length; k++) for (const j of [ix[0], ix[k], ix[k + 1]]) out.push(...V[j]);
    }
  }
  return new Float32Array(out);
}
// orijentacija: koja os modela gleda od ploce ('z','y','x' ili s minusom); jedinica u mm
export function pripremiModel(tri, opc = {}) {
  const os = opc.os || 'z', k = opc.mm || 1, n = tri.length / 3;
  const P = new Float32Array(tri.length);
  for (let i = 0; i < n; i++) {
    let x = tri[i * 3] * k, y = tri[i * 3 + 1] * k, z = tri[i * 3 + 2] * k, X, Y, Z;
    if (os === 'z') { X = x; Y = y; Z = z; } else if (os === '-z') { X = x; Y = -y; Z = -z; }
    else if (os === 'y') { X = x; Y = -z; Z = y; } else if (os === '-y') { X = x; Y = z; Z = -y; }
    else if (os === 'x') { X = y; Y = z; Z = x; } else { X = -y; Y = z; Z = -x; }
    P[i * 3] = X; P[i * 3 + 1] = Y; P[i * 3 + 2] = Z;
  }
  let zmin = Infinity, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zmax = -Infinity;
  for (let i = 0; i < n; i++) { zmin = Math.min(zmin, P[i * 3 + 2]); zmax = Math.max(zmax, P[i * 3 + 2]); x0 = Math.min(x0, P[i * 3]); x1 = Math.max(x1, P[i * 3]); y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (let i = 0; i < n; i++) { P[i * 3] -= cx; P[i * 3 + 1] -= cy; P[i * 3 + 2] -= zmin; }
  return { P, w: x1 - x0, h: y1 - y0, visina: zmax - zmin };
}
// putanje iz modela: obris na ploci (s razmakom) i bridovi gornjih ploha (3D, z = visina)
export function modelUPoteze(M, opc = {}) {
  const P = M.P, nt = P.length / 9, razmak = opc.razmak ?? 2, res = opc.res || 0.5;
  const slojevi = [];
  // 1) obris: projekcija trokuta na plocu u mrezu, prosirena za razmak
  const pad = razmak + 4, w = Math.ceil((M.w + 2 * pad) / res), h = Math.ceil((M.h + 2 * pad) / res);
  const m = new Uint8Array(w * h), ox = -M.w / 2 - pad, oy = -M.h / 2 - pad;
  for (let t = 0; t < nt; t++) {
    const ax = (P[t * 9] - ox) / res, ay = (P[t * 9 + 1] - oy) / res, bx = (P[t * 9 + 3] - ox) / res, by = (P[t * 9 + 4] - oy) / res, cx = (P[t * 9 + 6] - ox) / res, cy = (P[t * 9 + 7] - oy) / res;
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (Math.abs(d) < 1e-9) continue;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / d, l2 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / d, l3 = 1 - l1 - l2;
      if (l1 >= -0.02 && l2 >= -0.02 && l3 >= -0.02) m[y * w + x] = 1;
    }
  }
  const r = Math.round(razmak / res);           // prosirenje za razmak (kvadratna jezgra po redovima i stupcima)
  let m2 = m;
  if (r > 0) {
    const t1 = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) t1[y * w + k] = 1;
    m2 = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (t1[y * w + x]) for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m2[k * w + x] = 1;
  }
  const ob = obrisi(m2, w, h).map(s => pojednostavi(s.map(([x, y]) => [ox + x * res, oy + y * res]), 0.15))
    .filter(s => { const b = okvir([s]); return Math.max(b[2] - b[0], b[3] - b[1]) > 6; });
  // samo vanjski obris (najveci) i unutarnji otvori koji prolaze kroz dio
  if (ob.length) slojevi.push({ ime: 'Obris dijela na ploči', potezi: ob, vrsta: '01', debljina: 'debela', ravno: true });
  // 2) bridovi gornjih ploha: rubovi ploha okrenutih prema gore (n_z > 0,5), uz kut izmedu ploha > 25 stupnjeva
  const kljuc = (x, y, z) => Math.round(x * 100) + ',' + Math.round(y * 100) + ',' + Math.round(z * 100);
  const bridovi = new Map(), N = [];
  for (let t = 0; t < nt; t++) {
    const a = [P[t * 9], P[t * 9 + 1], P[t * 9 + 2]], b = [P[t * 9 + 3], P[t * 9 + 4], P[t * 9 + 5]], c = [P[t * 9 + 6], P[t * 9 + 7], P[t * 9 + 8]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const L = Math.hypot(...n) || 1;
    N.push([n[0] / L, n[1] / L, n[2] / L]);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const kp = kljuc(...p), kq = kljuc(...q), k = kp < kq ? kp + '|' + kq : kq + '|' + kp;
      if (!bridovi.has(k)) bridovi.set(k, { p: kp < kq ? p : q, q: kp < kq ? q : p, t: [] });
      bridovi.get(k).t.push(t);
    }
  }
  const odabrani = [];
  for (const e of bridovi.values()) {
    const t = e.t; if (t.length !== 2) { if (t.length === 1 && N[t[0]][2] > 0.5) odabrani.push(e); continue; }
    const n1 = N[t[0]], n2 = N[t[1]], cosK = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
    if (cosK < Math.cos(25 * Math.PI / 180) && (n1[2] > 0.5 || n2[2] > 0.5) && Math.max(e.p[2], e.q[2]) > 0.3) odabrani.push(e);
  }
  // ulancavanje bridova u poteze
  const sus = new Map(); const dk = p => kljuc(...p);
  odabrani.forEach((e, i) => { for (const p of [e.p, e.q]) { const k = dk(p); if (!sus.has(k)) sus.set(k, []); sus.get(k).push(i); } });
  const iskor = new Uint8Array(odabrani.length), lanci = [];
  for (let i = 0; i < odabrani.length; i++) {
    if (iskor[i]) continue; iskor[i] = 1;
    const lanac = [odabrani[i].p, odabrani[i].q];
    for (const smjer of [1, 0]) {
      let kraj = smjer ? lanac[lanac.length - 1] : lanac[0];
      for (;;) {
        const kand = (sus.get(dk(kraj)) || []).find(j => !iskor[j]); if (kand == null) break;
        iskor[kand] = 1; const e = odabrani[kand]; const sl = dk(e.p) === dk(kraj) ? e.q : e.p;
        if (smjer) lanac.push(sl); else lanac.unshift(sl); kraj = sl;
      }
    }
    if (duljina(lanac) > 1) lanci.push(lanac.map(p => [p[0], p[1], p[2]]));
  }
  if (lanci.length) slojevi.push({ ime: 'Bridovi gornjih ploha (3D)', potezi: lanci, vrsta: '01', debljina: 'debela' });
  return { slojevi, potezi: slojevi.flatMap(s => s.potezi), jedinica_mm: 1, ime: opc.ime || '3D model', model: M };
}

// ---------------- tekst u okviru (fontovi, B/I/U, poravnanje, prelamanje, okvir) ----------------
// F = window.FTQ_FONTOVI; opc: { font, deb, kurziv, podcrtano, visina (mm, veliko slovo), prored (x visina), razmak (x visina),
//   poravnanje: 'lijevo'|'sredina'|'desno'|'obostrano', sirina, visinaOkvira (mm, 0 = bez/auto), margina (mm), okvir (bool), prilagodi (bool) }
export function tekstOkvir(niz, F, opc = {}) {
  const fam = F[opc.font] || F.sans;
  const varijanta = opc.deb && opc.kurziv ? (fam.bi || fam.b || fam.i) : opc.deb ? fam.b : opc.kurziv ? (fam.i || null) : null;
  const G = varijanta || fam.r;
  const umjetnoDeb = opc.deb && !(opc.kurziv ? (fam.bi || fam.b) : fam.b);
  const umjetnoKurziv = opc.kurziv && !(opc.deb ? (fam.bi || fam.i) : fam.i);
  let h = opc.visina || 30;
  const prored = opc.prored || 1.6, razmak = opc.razmak ?? 0.06, mrg = opc.margina ?? 8;
  const gl = c => G[c] || G['?'];
  const sirinaRijeci = (r, hh) => { let w = 0; for (const c of r) w += (gl(c)[0] / 21 + razmak) * hh; return Math.max(0, w - razmak * hh); };
  const prazno = hh => (gl(' ')[0] / 21 + razmak) * hh;
  function slozi(hh, bezPrelamanja) {
    const unutra = opc.sirina > 0 && !bezPrelamanja ? Math.max(5, opc.sirina - 2 * mrg) : Infinity;
    const redovi = [];
    for (const par of String(niz).split('\n')) {
      const rijeci = par.split(/ +/).filter((r, i, a) => r.length || a.length === 1);
      let red = [], w = 0;
      for (const r of rijeci) {
        const wr = sirinaRijeci(r, hh), dod = red.length ? prazno(hh) + wr : wr;
        if (red.length && w + dod > unutra + 1e-6) { redovi.push({ rijeci: red, w, kraj: false }); red = [r]; w = wr; }
        else { red.push(r); w += dod; }
      }
      redovi.push({ rijeci: red, w, kraj: true });
    }
    return { redovi, unutra };
  }
  let { redovi, unutra } = slozi(h);
  if (opc.prilagodi && opc.sirina > 0) {        // tekst se prilagodi okviru, kao „Smanji tekst pri preljevu" u Wordu
    if (opc.visinaOkvira > 0) {                  // širina i visina zadane: najveća visina slova kod koje složeni tekst stane (s ponovnim prelamanjem)
      const unutraH = Math.max(2, opc.visinaOkvira - 2 * mrg);
      const stane = hh => { const z = slozi(hh); return Math.max(0, ...z.redovi.map(r => r.w)) <= z.unutra + 1e-6 && (z.redovi.length - 1) * prored * hh + 1.25 * hh <= unutraH; };
      let lo = 0.5, hi = Math.max(1, unutraH / 1.25);
      if (stane(hi)) lo = hi; else for (let it = 0; it < 32; it++) { const m = (lo + hi) / 2; if (stane(m)) lo = m; else hi = m; }
      h = lo;
    } else {                                     // samo širina: najdulji redak (bez novog prelamanja) popuni širinu
      const z0 = slozi(h, true), najsira = Math.max(1, ...z0.redovi.map(r => r.w));
      h *= (opc.sirina - 2 * mrg) / najsira * 0.9999;
    }
    ({ redovi, unutra } = slozi(h));
  }
  const sirinaBloka = isFinite(unutra) ? unutra : Math.max(0, ...redovi.map(r => r.w));
  const tekst = [], crte = [], sh = umjetnoKurziv ? 0.22 : 0;
  redovi.forEach((red, ri) => {
    const yb = -h - ri * h * prored;                 // osnovna crta (vrh prvog reda na y = 0)
    let x = 0, praz = prazno(h);
    if (opc.poravnanje === 'sredina') x = (sirinaBloka - red.w) / 2;
    else if (opc.poravnanje === 'desno') x = sirinaBloka - red.w;
    else if (opc.poravnanje === 'obostrano' && !red.kraj && red.rijeci.length > 1) praz += (sirinaBloka - red.w) / (red.rijeci.length - 1);
    const x0 = x;
    red.rijeci.forEach((r, wi) => {
      for (const c of r) {
        const [adv, st] = gl(c);
        for (const s of st) {
          const p = []; for (let k = 0; k < s.length; k += 2) { const yy = (9 - s[k + 1]) / 21 * h; p.push([x + s[k] / 21 * h + yy * sh, yb + yy]); }
          tekst.push(p);
          if (umjetnoDeb) tekst.push(p.map(([a, b]) => [a + 0.035 * h, b]));
        }
        x += (adv / 21 + razmak) * h;
      }
      x -= razmak * h; if (wi < red.rijeci.length - 1) x += praz;
    });
    if (opc.podcrtano && x > x0) crte.push([[x0, yb - 0.2 * h], [x, yb - 0.2 * h]]);
  });
  const slojevi = [{ ime: 'Tekst', potezi: tekst.concat(crte), vrsta: '01', debljina: opc.deb ? 'debela' : 'tanka' }];
  if (opc.okvir) {
    const vis = opc.visinaOkvira > 0 ? opc.visinaOkvira : (redovi.length - 1) * h * prored + h + 2 * mrg + 0.25 * h;
    const x0 = -mrg, y0 = mrg, x1 = sirinaBloka + mrg, y1 = mrg - vis;
    slojevi.push({ ime: 'Okvir teksta', potezi: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]], vrsta: '01', debljina: 'debela' });
  }
  return { slojevi, potezi: slojevi.flatMap(s => s.potezi), jedinica_mm: 1, ime: 'Tekst', visinaSlova: h, redova: redovi.length };
}
