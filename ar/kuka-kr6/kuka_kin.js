/* FORTRONIQ · KUKA KR AGILUS (KR 6 R900) — kinematika: izravna (FK), analitička inverzna (IK, 8 rješenja, Status/Turn),
   Jakobijan, granice, singulariteti i interpolacije PTP / LIN / CIRC.
   Parametri dolaze iz kuka_podaci.js (DH, OSI). Standardni DH: T_i = Rz(θ_i)·Tz(d_i)·Tx(a_i)·Rx(α_i), θ_i = znak_i·A_i + pomak_i.
   Okvir 6 = $FLANGE (θ6 sadrži Rz(180°) prirubnice). Kutovi A1…A6 u KUKA konvenciji (radijani).
   Orijentacija A, B, C = KUKA Z-Y-X: R = Rz(A)·Ry(B)·Rx(C). Matrice 4×4 kao niz od 16 brojeva, redak po redak. Jedinice: m, rad.
   © ForTroniQ d.o.o. */
import { DH, OSI, KUT_ISPRUZENE } from './kuka_podaci.js';

const PI = Math.PI, DVA_PI = 2 * PI;
const L2 = DH.a[1], A3o = DH.a[2], D4 = DH.d[3], D6 = DH.d[5], A1o = DH.a[0], D1 = DH.d[0];
const L3 = Math.hypot(A3o, D4), BETA = Math.atan2(D4, A3o);

/* ------------------------------------------------------------------ matrice */
export function jedinicna() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
export function pomnozi(A, B) {
  const C = new Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) C[4 * i + j] = A[4 * i] * B[j] + A[4 * i + 1] * B[4 + j] + A[4 * i + 2] * B[8 + j] + A[4 * i + 3] * B[12 + j];
  return C;
}
export function inverz(T) {
  const r = [T[0], T[4], T[8], T[1], T[5], T[9], T[2], T[6], T[10]], p = [T[3], T[7], T[11]];
  return [r[0], r[1], r[2], -(r[0] * p[0] + r[1] * p[1] + r[2] * p[2]),
    r[3], r[4], r[5], -(r[3] * p[0] + r[4] * p[1] + r[5] * p[2]),
    r[6], r[7], r[8], -(r[6] * p[0] + r[7] * p[1] + r[8] * p[2]), 0, 0, 0, 1];
}
export function dhMatrica(theta, d, a, alpha) {
  const ct = Math.cos(theta), st = Math.sin(theta), ca = Math.cos(alpha), sa = Math.sin(alpha);
  return [ct, -st * ca, st * sa, a * ct, st, ct * ca, -ct * sa, a * st, 0, sa, ca, d, 0, 0, 0, 1];
}
const theta = (i, q) => DH.znak[i] * q + DH.pomak[i];

/* ------------------------------------------------------------------ orijentacija A, B, C (KUKA Z-Y-X) */
export function rotIzABC(A, B, C) {
  const ca = Math.cos(A), sa = Math.sin(A), cb = Math.cos(B), sb = Math.sin(B), cc = Math.cos(C), sc = Math.sin(C);
  return [ca * cb, ca * sb * sc - sa * cc, ca * sb * cc + sa * sc,
    sa * cb, sa * sb * sc + ca * cc, sa * sb * cc - ca * sc,
    -sb, cb * sc, cb * cc];
}
/** A, B, C iz matrice (16 ili 9). Kod B = ±90° (singularitet Eulerovih kutova) uzima se C = 0. */
export function abcIzMatrice(T) {
  const m = T.length === 16 ? [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]] : T;
  const r11 = m[0], r12 = m[1], r21 = m[3], r22 = m[4], r31 = m[6], r32 = m[7], r33 = m[8];
  const cb = Math.hypot(r11, r21);
  const B = Math.atan2(-r31, cb);
  if (cb < 1e-9) return [Math.atan2(-r12, r22), B, 0];
  return [Math.atan2(r21, r11), B, Math.atan2(r32, r33)];
}
/** okvir iz X, Y, Z (m) i A, B, C (rad) */
export function okvir(x, y, z, A = 0, B = 0, C = 0) {
  if (typeof x === 'object') ({ x, y, z, A = 0, B = 0, C = 0 } = x);
  const R = rotIzABC(A, B, C);
  return [R[0], R[1], R[2], x, R[3], R[4], R[5], y, R[6], R[7], R[8], z, 0, 0, 0, 1];
}
/** {x, y, z, A, B, C} iz okvira */
export function poza(T) { const [A, B, C] = abcIzMatrice(T); return { x: T[3], y: T[7], z: T[11], A, B, C }; }

/* ------------------------------------------------------------------ izravna kinematika */
/** fk(q) → { T (FLANGE u ROBROOT), p [m], abc [rad], okviri[7] (0 = ROBROOT, 1…5 DH okviri, 6 = FLANGE), tockaZapesca } */
export function fk(q) {
  const okviri = [jedinicna()];
  let T = okviri[0];
  for (let i = 0; i < 6; i++) { T = pomnozi(T, dhMatrica(theta(i, q[i]), DH.d[i], DH.a[i], DH.alpha[i])); okviri.push(T); }
  return { T, p: [T[3], T[7], T[11]], abc: abcIzMatrice(T), okviri, tockaZapesca: [okviri[4][3], okviri[4][7], okviri[4][11]] };
}
/** TCP = FLANGE · alat (alat = okvir u FLANGE-u, npr. okvir(0,0,0.11)) */
export function fkAlat(q, alat) { const f = fk(q); const T = alat ? pomnozi(f.T, alat) : f.T; return { T, p: [T[3], T[7], T[11]], abc: abcIzMatrice(T) }; }

/* ------------------------------------------------------------------ Status i Turn */
/** Status: bit 0 — točka zapešća iza osi A1 (iznad glave); bit 1 — A3 > kut ispružene ruke (točka zapešća ispred pravca A2–A3); bit 2 — A5 < 0.
    Turn: bit i = 1 ako je A(i+1) < 0. (Shema prema Beckhoffu/FZI; vidi pretpostavke u podacima.) */
export function statusTurn(q) {
  const f = fk(q), w = f.tockaZapesca;
  const x1 = Math.cos(q[0]) * w[0] - Math.sin(q[0]) * w[1];   /* x točke zapešća u okviru zakrenutom za A1 (A1 oko −Z) */
  let status = 0;
  if (x1 < 0) status |= 1;
  if (q[2] > KUT_ISPRUZENE) status |= 2;
  if (q[4] < 0) status |= 4;
  let turn = 0;
  for (let i = 0; i < 6; i++) if (q[i] < 0) turn |= (1 << i);
  return { status, turn };
}

/* ------------------------------------------------------------------ granice */
export function uGranicama(q, tol = 1e-9) { return OSI.every((o, i) => q[i] >= o.min - tol && q[i] <= o.max + tol); }
export function ogranici(q) { return q.map((v, i) => Math.min(OSI[i].max, Math.max(OSI[i].min, v))); }
const norm = (a) => { a = ((a + PI) % DVA_PI + DVA_PI) % DVA_PI - PI; return a; };

/* ------------------------------------------------------------------ inverzna kinematika (analitička, sferni zglob) */
/** sva (do 8) rješenja za zadani FLANGE: [{q, status, uGranicama}] (kutovi A4, A6 normirani na (−π, π]) */
export function ikSva(T, qRef) {
  const ax = T[2], ay = T[6], az = T[10];
  const wx = T[3] - D6 * ax, wy = T[7] - D6 * ay, wz = T[11] - D6 * az;
  const rho = Math.hypot(wx, wy), phi = Math.atan2(wy, wx);
  const out = [];
  for (const iza of [0, 1]) {
    if (rho < 1e-9 && iza) continue;
    const th1 = iza ? phi + PI : phi;              /* θ1 = −A1 */
    const A1 = norm(-th1);
    const u = (iza ? -rho : rho) - A1o, v = -(wz - D1);
    const D = (u * u + v * v - L2 * L2 - L3 * L3) / (2 * L2 * L3);
    if (D > 1 + 1e-10 || D < -1 - 1e-10) continue;
    const Dc = Math.max(-1, Math.min(1, D));
    for (const lakat of [1, -1]) {
      const g = lakat * Math.acos(Dc);               /* g = θ3 + β */
      const th3 = g - BETA;
      const th2 = Math.atan2(v, u) - Math.atan2(L3 * Math.sin(g), L2 + L3 * Math.cos(g));
      const A2 = norm(th2), A3 = norm(th3 + PI / 2);
      /* R03 i R36 = R03ᵀ · R06 */
      let M = jedinicna();
      const qq = [A1, A2, A3];
      for (let i = 0; i < 3; i++) M = pomnozi(M, dhMatrica(theta(i, qq[i]), DH.d[i], DH.a[i], DH.alpha[i]));
      const R6 = pomnozi(T, dhRz(-PI));               /* ukloni Rz(180°) prirubnice */
      const R = pomnozi(inverz(M), R6);
      const r13 = R[2], r23 = R[6], r33 = R[10], r31 = R[8], r32 = R[9], r11 = R[0], r21 = R[4];
      const s5 = Math.hypot(r13, r23);
      for (const zap of [1, -1]) {
        let th4, th5, th6;
        if (s5 < 1e-10) {
          /* singularitet zapešća: A4 iz referentnog položaja, A6 iz zbroja */
          th5 = r33 > 0 ? 0 : PI;
          th4 = qRef ? -qRef[3] : 0;
          const zb = Math.atan2(r21, r11);
          th6 = r33 > 0 ? zb - th4 : th4 - zb;
          if (zap < 0) continue;
        } else {
          th5 = Math.atan2(zap * s5, r33);
          th4 = Math.atan2(zap * r23, zap * r13);
          th6 = Math.atan2(zap * r32, -zap * r31);
        }
        const q = [A1, A2, A3, norm(-th4), norm(-th5), norm(-th6)];
        out.push({ q, ...statusTurn(q), uGranicama: uGranicama(q) });
      }
    }
  }
  return out;
}
function dhRz(t) { const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }

/* zamjenske vrijednosti kuta (±2π) unutar granica osi */
function zamjene(i, v) { const o = OSI[i], r = []; for (const k of [-2, -1, 0, 1, 2]) { const w = v + k * DVA_PI; if (w >= o.min - 1e-9 && w <= o.max + 1e-9) r.push(w); } return r; }

/**
 * ik(T, qPocetni, {status, turn, alat}?) → { q, uspjeh, greska, sva }
 * T = FLANGE (ili TCP ako je zadan alat = okvir alata u FLANGE-u). Bez status/turn bira se rješenje najbliže qPocetni.
 * Sa status → samo rješenja s tim Status bitovima; s turn → za A4/A6 (i ostale) bira se zamjena (±360°) s traženim predznakom.
 */
export function ik(T, qPocetni, opcije = {}) {
  const q0 = qPocetni || [0, -PI / 2, PI / 2, 0, 0, 0];
  const Tf = opcije.alat ? pomnozi(T, inverz(opcije.alat)) : T;
  const osnovna = ikSva(Tf, q0);
  const sva = osnovna.map((r) => ({ q: r.q.slice(), status: r.status, turn: r.turn, uGranicama: r.uGranicama }));
  if (!osnovna.length) return { q: q0.slice(), uspjeh: false, greska: 'izvan dosega', sva };
  const kand = [];
  for (const r of osnovna) {
    if (opcije.status != null && r.status !== opcije.status) continue;
    const opc = r.q.map((v, i) => zamjene(i, v));
    if (opc.some((o) => !o.length)) continue;
    /* sve kombinacije zamjena (najviše 3 × 3 za A4 i A6) */
    const kombi = [[]];
    for (let i = 0; i < 6; i++) { const nova = []; kombi.forEach((k) => opc[i].forEach((v) => nova.push(k.concat(v)))); kombi.splice(0, kombi.length, ...nova); }
    for (const q of kombi) {
      if (opcije.turn != null) { let t = 0; for (let i = 0; i < 6; i++) if (q[i] < 0) t |= (1 << i); if (t !== opcije.turn) continue; }
      let d = 0; for (let i = 0; i < 6; i++) d += (q[i] - q0[i]) ** 2;
      kand.push({ q, d });
    }
  }
  if (!kand.length) {
    const ijedno = osnovna.some((r) => r.uGranicama || r.q.every((v, i) => zamjene(i, v).length));
    return { q: q0.slice(), uspjeh: false, greska: (opcije.status != null || opcije.turn != null) && ijedno ? 'nema rješenja sa zadanim Status/Turn' : 'izvan granica osi', sva };
  }
  kand.sort((a, b) => a.d - b.d);
  return { q: kand[0].q, uspjeh: true, greska: null, sva };
}

/* ------------------------------------------------------------------ Jakobijan (geometrijski, u ROBROOT; po KUKA kutovima) */
/** jacobian(q) → 6×6 [[vx…],[vy…],[vz…],[wx…],[wy…],[wz…]] — stupac i = brzina FLANGE-a za dA_i/dt = 1 rad/s */
export function jacobian(q) {
  const f = fk(q), pe = f.p, J = [[], [], [], [], [], []];
  for (let i = 0; i < 6; i++) {
    const O = f.okviri[i], z = [O[2], O[6], O[10]], o = [O[3], O[7], O[11]], s = DH.znak[i];
    const r = [pe[0] - o[0], pe[1] - o[1], pe[2] - o[2]];
    const v = [z[1] * r[2] - z[2] * r[1], z[2] * r[0] - z[0] * r[2], z[0] * r[1] - z[1] * r[0]];
    J[0][i] = s * v[0]; J[1][i] = s * v[1]; J[2][i] = s * v[2]; J[3][i] = s * z[0]; J[4][i] = s * z[1]; J[5][i] = s * z[2];
  }
  return J;
}
export function determinanta(M) {
  const n = M.length, A = M.map((r) => r.slice()); let det = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-15) return 0;
    if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; det = -det; }
    det *= A[c][c];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; }
  }
  return det;
}

/* ------------------------------------------------------------------ singulariteti */
/** singularnost(q, prag?) → { tip: null|'iznadGlave'|'ispruzena'|'zapesce', mjera (0 = u singularitetu … 1 = daleko), iznadGlave [m], ispruzena [rad], zapesce [rad], det }
    Pragovi (zadano): točka zapešća 50 mm od osi A1, A3 unutar 5° od ispružene ruke, |A5| < 5°. */
export function singularnost(q, prag = {}) {
  const P = Object.assign({ iznadGlave: 0.05, ispruzena: 5 * PI / 180, zapesce: 5 * PI / 180 }, prag);
  const w = fk(q).tockaZapesca;
  const m = { iznadGlave: Math.hypot(w[0], w[1]), ispruzena: Math.abs(q[2] - KUT_ISPRUZENE), zapesce: Math.abs(norm(q[4])) };
  const rel = { iznadGlave: m.iznadGlave / P.iznadGlave, ispruzena: m.ispruzena / P.ispruzena, zapesce: m.zapesce / P.zapesce };
  let tip = null, min = Infinity;
  for (const k of Object.keys(rel)) if (rel[k] < min) { min = rel[k]; tip = k; }
  return { tip: min < 1 ? tip : null, najblizi: tip, mjera: Math.min(1, min), ...m, det: determinanta(jacobian(q)) };
}

/* ------------------------------------------------------------------ interpolacije */
/** PTP: sve osi istodobno (s ∈ [0, 1]; profil brzine zadaje pozivatelj) */
export function interpolirajPTP(q0, q1, s) { return q0.map((v, i) => v + (q1[i] - v) * s); }
/** sinkroni PTP: trajanje [s] uz najveće brzine osi (rad/s) i faktor override-a (0…1) */
export function trajanjePTP(q0, q1, override = 1) { let t = 0; for (let i = 0; i < 6; i++) t = Math.max(t, Math.abs(q1[i] - q0[i]) / (OSI[i].vMaxRad * Math.max(1e-3, override))); return t; }

function quatIzMatrice(T) {
  const m00 = T[0], m01 = T[1], m02 = T[2], m10 = T[4], m11 = T[5], m12 = T[6], m20 = T[8], m21 = T[9], m22 = T[10], tr = m00 + m11 + m22;
  let w, x, y, z;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); w = 0.25 / s; x = (m21 - m12) * s; y = (m02 - m20) * s; z = (m10 - m01) * s; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s; }
  return [w, x, y, z];
}
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map((v) => -v); d = -d; }
  if (d > 0.9995) { const r = a.map((v, i) => v + (b[i] - v) * t); const n = Math.hypot(...r); return r.map((v) => v / n); }
  const th = Math.acos(d), s = Math.sin(th), k0 = Math.sin((1 - t) * th) / s, k1 = Math.sin(t * th) / s;
  return a.map((v, i) => k0 * v + k1 * b[i]);
}
function matricaIzQuat(qt, p) {
  const [w, x, y, z] = qt;
  return [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y), p[0],
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x), p[1],
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y), p[2], 0, 0, 0, 1];
}
/** LIN: položaj po pravcu, orijentacija jednoliko (slerp) od T0 do T1 */
export function interpolirajLIN(T0, T1, s) {
  const p = [0, 1, 2].map((k) => T0[3 + 4 * k] + (T1[3 + 4 * k] - T0[3 + 4 * k]) * s);
  return matricaIzQuat(slerp(quatIzMatrice(T0), quatIzMatrice(T1), s), p);
}
/** krug kroz tri točke: { c, r, n, u, v, kut } ili null (točke na pravcu) */
export function krugKrozTocke(p0, pm, p1) {
  const a = [pm[0] - p0[0], pm[1] - p0[1], pm[2] - p0[2]], b = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const cr = (x, y) => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  const dot = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const n = cr(a, b), nn = dot(n, n);
  if (nn < 1e-14) return null;
  const t1 = cr(n, a), t2 = cr(b, n);
  const k = 1 / (2 * nn);
  const off = [0, 1, 2].map((i) => (dot(b, b) * t1[i] + dot(a, a) * t2[i]) * k);
  const c = [p0[0] + off[0], p0[1] + off[1], p0[2] + off[2]], r = Math.hypot(...off);
  const nl = Math.sqrt(nn), nu = n.map((x) => x / nl);
  const u = [(p0[0] - c[0]) / r, (p0[1] - c[1]) / r, (p0[2] - c[2]) / r], v = cr(nu, u);
  const kutDo = (p) => { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; let t = Math.atan2(dot(d, v), dot(d, u)); if (t < 0) t += DVA_PI; return t; };
  return { c, r, n: nu, u, v, kut: kutDo(p1), kutPom: kutDo(pm) };
}
/** CIRC: luk kroz pomoćnu točku Tpom do T1; orijentacija jednoliko od T0 do T1 (kao zadano u KSS — orijentacija pomoćne točke se ne koristi) */
export function interpolirajCIRC(T0, Tpom, T1, s) {
  const P = (T) => [T[3], T[7], T[11]];
  const k = krugKrozTocke(P(T0), P(Tpom), P(T1));
  if (!k) return interpolirajLIN(T0, T1, s);
  const t = k.kut * s, ct = Math.cos(t), st = Math.sin(t);
  const p = [0, 1, 2].map((i) => k.c[i] + k.r * (ct * k.u[i] + st * k.v[i]));
  return matricaIzQuat(slerp(quatIzMatrice(T0), quatIzMatrice(T1), s), p);
}
/** duljina putanje LIN / CIRC [m] (za trajanje uz $VEL.CP) */
export function duljinaLIN(T0, T1) { return Math.hypot(T1[3] - T0[3], T1[7] - T0[7], T1[11] - T0[11]); }
export function duljinaCIRC(T0, Tpom, T1) { const P = (T) => [T[3], T[7], T[11]]; const k = krugKrozTocke(P(T0), P(Tpom), P(T1)); return k ? k.r * k.kut : duljinaLIN(T0, T1); }
