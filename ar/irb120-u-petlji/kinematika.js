// kinematika.js — direktna i inverzna kinematika ABB IRB 120 s alatom (bez three.js)
// KS baze: Z gore, metri. Kutovi zglobova u stupnjevima (kao na klizačima).
// Matrica = { R: [9] po recima, p: [3] }

export const PIVOTI = [[0, 0, 0], [0, 0, 0.290], [0, 0, 0.560], [0, 0, 0.630], [0.302, 0, 0.630], [0.302, 0, 0.630]];
export const OSI = [[0, 0, 1], [0, 1, 0], [0, 1, 0], [1, 0, 0], [0, 1, 0], [1, 0, 0]];
export const GRANICE = [[-165, 165], [-110, 110], [-110, 70], [-160, 160], [-120, 120], [-400, 400]];
const D2R = Math.PI / 180;

function rotOs(a, t) {               // Rodrigues, a jedinični vektor
  const c = Math.cos(t), s = Math.sin(t), v = 1 - c, [x, y, z] = a;
  return [c + x * x * v, x * y * v - z * s, x * z * v + y * s,
          y * x * v + z * s, c + y * y * v, y * z * v - x * s,
          z * x * v - y * s, z * y * v + x * s, c + z * z * v];
}
function mulR(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
}
function mulRv(A, v) { return [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]]; }
export function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function norm(a) { return Math.hypot(a[0], a[1], a[2]); }
export function unit(a) { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; }

// alat: { p: [3], R: [9 po recima] } u KS j6 (nulti položaj, osi kao baza)
export function alatIz(p, Rstupci) {   // Rstupci: [[x],[y],[z]] kao u alati.json (retci = osi baze)
  const R = [Rstupci[0][0], Rstupci[0][1], Rstupci[0][2], Rstupci[1][0], Rstupci[1][1], Rstupci[1][2], Rstupci[2][0], Rstupci[2][1], Rstupci[2][2]];
  return { p: p.slice(), R };
}

// FK: vraća { p, R, osi:[ω_i], ishodista:[o_i] }
export function fk(q, alat) {
  let R = [1, 0, 0, 0, 1, 0, 0, 0, 1], p = [0, 0, 0];
  const osi = [], ish = [];
  for (let i = 0; i < 6; i++) {
    const d = sub(PIVOTI[i], i ? PIVOTI[i - 1] : [0, 0, 0]);
    p = add(p, mulRv(R, d));
    const w = mulRv(R, OSI[i]);
    osi.push(w); ish.push(p.slice());
    R = mulR(R, rotOs(OSI[i], q[i] * D2R));
  }
  const j6 = { p: p.slice(), R: R.slice() };
  if (alat) { p = add(p, mulRv(R, alat.p)); R = mulR(R, alat.R); }
  return { p, R, osi, ish, j6 };
}
export function stupac(R, k) { return [R[k], R[3 + k], R[6 + k]]; }
export function tockaUj6(rez, pl) { return add(rez.j6.p, mulRv(rez.j6.R, pl)); }

function rijesi(A, b) {
  const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let m = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[m][c])) m = r;
    const t = M[c]; M[c] = M[m]; M[m] = t;
    if (Math.abs(M[c][c]) < 1e-12) continue;
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = Math.abs(M[r][r]) > 1e-12 ? s / M[r][r] : 0; }
  return x;
}

// IK za položaj vrha alata i smjer njegove osi z (zakret oko osi alata je slobodan)
// cilj: { p:[3], z:[3] }, q0: početni kutovi; vraća { q, ok, ep (m), ea (rad) }
export function ik(cilj, q0, alat, opc = {}) {
  const iter = opc.iter || 60, tolP = opc.tolP || 4e-4, tolA = opc.tolA || 6e-3, wR = opc.wR || 0.25;
  const q = q0.slice(); let rez, ep = 1, ea = 1;
  for (let it = 0; it < iter; it++) {
    rez = fk(q, alat);
    const z = stupac(rez.R, 2);
    const e = sub(cilj.p, rez.p);
    let er = cross(z, cilj.z);
    ep = norm(e); ea = Math.asin(Math.min(1, norm(er)));
    if (dot(z, cilj.z) < 0) ea = Math.PI - ea;
    if (ep < tolP && ea < tolA) return { q, ok: true, ep, ea };
    if (dot(z, cilj.z) < 0 && norm(er) < 1e-6) er = stupac(rez.R, 0);   // suprotno usmjereno: zakreni
    // projekcija: zakret oko vlastite osi z nije bitan
    const ez = dot(er, z); er = sub(er, mul(z, ez));
    const E = [e[0], e[1], e[2], er[0] * wR, er[1] * wR, er[2] * wR];
    const J = [[], [], [], [], [], []];
    for (let i = 0; i < 6; i++) {
      const w = rez.osi[i], v = cross(w, sub(rez.p, rez.ish[i]));
      const wp = sub(w, mul(z, dot(w, z)));
      J[0][i] = v[0]; J[1][i] = v[1]; J[2][i] = v[2];
      J[3][i] = wp[0] * wR; J[4][i] = wp[1] * wR; J[5][i] = wp[2] * wR;
    }
    const lam = 0.002 + 0.02 * Math.min(1, ep);
    const A = [];
    for (let r = 0; r < 6; r++) { A.push([]); for (let k = 0; k < 6; k++) { let s = 0; for (let j = 0; j < 6; j++) s += J[r][j] * J[k][j]; A[r].push(s + (r === k ? lam * lam : 0)); } }
    const y = rijesi(A, E);
    for (let j = 0; j < 6; j++) {
      let d = 0; for (let r = 0; r < 6; r++) d += J[r][j] * y[r];
      d = Math.max(-0.25, Math.min(0.25, d)) / D2R;
      q[j] = Math.max(GRANICE[j][0], Math.min(GRANICE[j][1], q[j] + d));
    }
  }
  return { q, ok: false, ep, ea };
}

// IK s više početnih konfiguracija (za kartu dosega)
export function ikSiroko(cilj, alat, q0) {
  // brzo odbacivanje: vrh alata ne mo\u017ee biti dalje od dosega zgloba 5 + duljine alata
  const dRame = norm(sub(cilj.p, [0, 0, 0.290]));
  const dAlat = alat ? norm(add(alat.p, [0.072, 0, 0])) : 0.072;
  if (dRame > 0.583 + dAlat + 0.005) return { q: q0 || [0, 0, 0, 0, 0, 0], ok: false, ep: dRame - 0.58, ea: 0 };
  const a1 = Math.atan2(cilj.p[1], cilj.p[0]) / D2R;
  const sjeme = [];
  if (q0) sjeme.push(q0);
  for (const q5 of [60, -60, 100, -100]) for (const q4 of [0, 90, -90, 180]) sjeme.push([a1, 10, -10, q4, q5, 0]);
  let naj = null;
  for (const s of sjeme) {
    const s1 = s.slice(); s1[0] = Math.max(-165, Math.min(165, s1[0]));
    const r = ik(cilj, s1, alat, { iter: 35 });
    if (r.ok) return r;
    if (!naj || r.ep + r.ea * 0.1 < naj.ep + naj.ea * 0.1) naj = r;
  }
  return naj;
}

// središte zgloba 5 za zadane q2, q3 (q1 = 0) — za omotač radnog prostora
export function srediste5(q2, q3) { const r = fk([0, q2, q3, 0, 0, 0]); return r.ish[4]; }

// ---------------------------------------------------------------------------
// Dodaci za simulator „IRB 120 u petlji“ (puna poza, kvaternioni, konfiguracija)
// ---------------------------------------------------------------------------

// tool0: prirubnica (72 mm ispred središta zgloba 5), os z alata = os prirubnice (ABB konvencija)
export const TOOL0 = { p: [0.072, 0, 0], R: [0, 0, 1, 0, 1, 0, -1, 0, 0] };

// pogreška orijentacije: vektor rotacije koji vodi R u Rc (mali kut ≈ točno)
function grijehR(R, Rc) {
  // E = Rc · Rᵀ, os·kut iz antisimetričnog dijela
  const E = mulR(Rc, transR(R));
  const v = [(E[7] - E[5]) / 2, (E[2] - E[6]) / 2, (E[3] - E[1]) / 2];
  const s = norm(v), c = (E[0] + E[4] + E[8] - 1) / 2, t = Math.atan2(s, c);
  if (s < 1e-9) {
    if (c > 0) return [0, 0, 0];
    // 180°: os iz dijagonale
    const ax = unit([Math.sqrt(Math.max(0, (E[0] + 1) / 2)), Math.sqrt(Math.max(0, (E[4] + 1) / 2)), Math.sqrt(Math.max(0, (E[8] + 1) / 2))]);
    return mul(ax, Math.PI);
  }
  return mul(v, t / s);
}
export function transR(A) { return [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]]; }
export { mulR, mulRv, rotOs };

// Puna IK (položaj + orijentacija), prigušeni najmanji kvadrati, sjeme q0.
// opc.granice=false: ne reže na granice (da se vidi traži li cilj os izvan opsega)
// opc.maska: [true/false ×6] – false = os se ne mijenja
export function ikPuna(cilj, q0, alat, opc = {}) {
  const iter = opc.iter || 80, tolP = opc.tolP || 1e-5, tolA = opc.tolA || 2e-4;
  const reze = opc.granice !== false, maska = opc.maska || [1, 1, 1, 1, 1, 1];
  const q = q0.slice(); let ep = 1, ea = 1;
  const wR = 0.3;   // težina orijentacije (m po rad)
  for (let it = 0; it < iter; it++) {
    const rez = fk(q, alat);
    const e = sub(cilj.p, rez.p), er = grijehR(rez.R, cilj.R);
    ep = norm(e); ea = norm(er);
    if (ep < tolP && ea < tolA) return { q, ok: true, ep, ea };
    const E = [e[0], e[1], e[2], er[0] * wR, er[1] * wR, er[2] * wR];
    const J = [[], [], [], [], [], []];
    for (let i = 0; i < 6; i++) {
      const w = rez.osi[i], v = cross(w, sub(rez.p, rez.ish[i])), m = maska[i] ? 1 : 0;
      J[0][i] = v[0] * m; J[1][i] = v[1] * m; J[2][i] = v[2] * m;
      J[3][i] = w[0] * wR * m; J[4][i] = w[1] * wR * m; J[5][i] = w[2] * wR * m;
    }
    const lam = 0.0005 + 0.01 * Math.min(1, ep + ea * 0.1);
    const A = [];
    for (let r = 0; r < 6; r++) { A.push([]); for (let k = 0; k < 6; k++) { let s = 0; for (let j = 0; j < 6; j++) s += J[r][j] * J[k][j]; A[r].push(s + (r === k ? lam * lam : 0)); } }
    const y = rijesi(A, E);
    for (let j = 0; j < 6; j++) {
      if (!maska[j]) continue;
      let d = 0; for (let r = 0; r < 6; r++) d += J[r][j] * y[r];
      d = Math.max(-0.2, Math.min(0.2, d)) / D2R;
      q[j] += d;
      if (reze) q[j] = Math.max(GRANICE[j][0], Math.min(GRANICE[j][1], q[j]));
    }
  }
  return { q, ok: false, ep, ea };
}

// ---- kvaternion (ABB: [q1 q2 q3 q4] = [w x y z]) <-> matrica (po recima) ----
export function matUKvat(R) {
  const X = [R[0], R[3], R[6]], Y = [R[1], R[4], R[7]], Z = [R[2], R[5], R[8]];
  const m00 = X[0], m11 = Y[1], m22 = Z[2], tr = m00 + m11 + m22; let w, x, y, z;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (Y[2] - Z[1]) / s; y = (Z[0] - X[2]) / s; z = (X[1] - Y[0]) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (Y[2] - Z[1]) / s; x = s / 4; y = (Y[0] + X[1]) / s; z = (Z[0] + X[2]) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (Z[0] - X[2]) / s; x = (Y[0] + X[1]) / s; y = s / 4; z = (Z[1] + Y[2]) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (X[1] - Y[0]) / s; x = (Z[0] + X[2]) / s; y = (Z[1] + Y[2]) / s; z = s / 4; }
  if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
  return [w, x, y, z];
}
export function kvatUMat(qq) {
  let [w, x, y, z] = qq; const n = Math.hypot(w, x, y, z) || 1; w /= n; x /= n; y /= n; z /= n;
  return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
          2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
          2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
}
// sferna interpolacija dviju matrica (t ∈ [0,1])
export function slerpR(A, B, t) {
  let a = matUKvat(A), b = matUKvat(B), d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map(v => -v); d = -d; }
  let r;
  if (d > 0.9995) r = a.map((v, i) => v + (b[i] - v) * t);
  else { const th = Math.acos(d), s = Math.sin(th); r = a.map((v, i) => (v * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s); }
  return kvatUMat(r);
}
export function kutIzmedu(A, B) { return norm(grijehR(A, B)); }

// ---- ABB confdata [cf1, cf4, cf6, cfx] iz kutova zglobova ----
export function kvadrant(kut) { return Math.floor(kut / 90 + 1e-9); }
export function konfiguracija(q) {
  const r = fk(q);
  const c = r.ish[4];                       // središte zgloba 5
  const a1 = q[0] * D2R;
  const ispred = c[0] * Math.cos(a1) + c[1] * Math.sin(a1) >= 0;           // ispred osi 1
  // ispred/iza produžetka donje ruke (os 2 -> os 3)
  const o2 = r.ish[1], o3 = r.ish[2], dl = sub(o3, o2), dw = sub(c, o2);
  const smjer = [Math.cos(a1), Math.sin(a1), 0];
  const kr = dot(cross(dl, dw), cross(smjer, [0, 0, 1]));
  const ispredRuke = kr <= 0;
  const cfx = (ispred ? 0 : 4) + (ispredRuke ? 0 : 2) + (q[4] >= 0 ? 0 : 1);
  return [kvadrant(q[0]), kvadrant(q[3]), kvadrant(q[5]), cfx];
}
