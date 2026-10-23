/* FORTRONIQ · Kobot UR3e — kinematika (izravna, inverzna, Jakobijan, rotacijski vektor).
   Standardni DH parametri UR3e (Universal Robots, konvencija kao u službenom članku o DH parametrima):
   T_i = Rz(θi) · Tz(di) · Tx(ai) · Rx(αi). Jedinice: metri i radijani. Matrice 4×4 kao niz od 16 brojeva, redak po redak.
   © ForTroniQ d.o.o. */

export const DH = {
  a: [0, -0.24355, -0.2132, 0, 0, 0],
  d: [0.15185, 0, 0, 0.13105, 0.08535, 0.0921],
  alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0]
};
export const NAZIVI_ZGLOBOVA = ['Base', 'Shoulder', 'Elbow', 'Wrist 1', 'Wrist 2', 'Wrist 3'];
/* granice zglobova prema listu podataka: ±360°, Wrist 3 beskonačno (Infinity) */
export const GRANICE = [2 * Math.PI, 2 * Math.PI, 2 * Math.PI, 2 * Math.PI, 2 * Math.PI, Infinity];
const PI = Math.PI, DVA_PI = 2 * Math.PI;

/* ------------------------------------------------------------------ matrice */
export function jedinicna() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
export function pomnozi(A, B) {
  const C = new Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    C[4 * i + j] = A[4 * i] * B[j] + A[4 * i + 1] * B[4 + j] + A[4 * i + 2] * B[8 + j] + A[4 * i + 3] * B[12 + j];
  }
  return C;
}
/* inverz homogene transformacije (R^T, −R^T p) */
export function inverz(T) {
  const r = [T[0], T[4], T[8], T[1], T[5], T[9], T[2], T[6], T[10]];
  const p = [T[3], T[7], T[11]];
  return [r[0], r[1], r[2], -(r[0] * p[0] + r[1] * p[1] + r[2] * p[2]),
    r[3], r[4], r[5], -(r[3] * p[0] + r[4] * p[1] + r[5] * p[2]),
    r[6], r[7], r[8], -(r[6] * p[0] + r[7] * p[1] + r[8] * p[2]),
    0, 0, 0, 1];
}
/* jedna DH transformacija */
export function dhMatrica(theta, d, a, alpha) {
  const ct = Math.cos(theta), st = Math.sin(theta), ca = Math.cos(alpha), sa = Math.sin(alpha);
  return [ct, -st * ca, st * sa, a * ct,
    st, ct * ca, -ct * sa, a * st,
    0, sa, ca, d,
    0, 0, 0, 1];
}
const dhI = (i, th) => dhMatrica(th, DH.d[i], DH.a[i], DH.alpha[i]);

/* ------------------------------------------------------------------ rotacije */
export function rotIzMatrice(T) { return [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]]; }
/* rotacijski vektor (os · kut) iz rotacijske matrice, kao u PolyScopeu (rx, ry, rz u radijanima) */
export function rotVektor(T) {
  const r11 = T[0], r12 = T[1], r13 = T[2], r21 = T[4], r22 = T[5], r23 = T[6], r31 = T[8], r32 = T[9], r33 = T[10];
  const c = Math.max(-1, Math.min(1, (r11 + r22 + r33 - 1) / 2));
  const th = Math.acos(c);
  if (th < 1e-9) return [0, 0, 0];
  if (PI - th < 1e-6) {
    /* kut ≈ 180°: os iz dijagonale */
    let x = Math.sqrt(Math.max(0, (r11 + 1) / 2)), y = Math.sqrt(Math.max(0, (r22 + 1) / 2)), z = Math.sqrt(Math.max(0, (r33 + 1) / 2));
    if (x >= y && x >= z) { y = Math.sign(r12 + r21 || 1) * y; z = Math.sign(r13 + r31 || 1) * z; }
    else if (y >= x && y >= z) { x = Math.sign(r12 + r21 || 1) * x; z = Math.sign(r23 + r32 || 1) * z; }
    else { x = Math.sign(r13 + r31 || 1) * x; y = Math.sign(r23 + r32 || 1) * y; }
    const n = Math.hypot(x, y, z) || 1;
    return [th * x / n, th * y / n, th * z / n];
  }
  const s = 2 * Math.sin(th);
  return [th * (r32 - r23) / s, th * (r13 - r31) / s, th * (r21 - r12) / s];
}
/* rotacijska matrica 3×3 (niz od 9) iz rotacijskog vektora — Rodriguesova formula */
export function rotIzVektora(rv) {
  const th = Math.hypot(rv[0], rv[1], rv[2]);
  if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const x = rv[0] / th, y = rv[1] / th, z = rv[2] / th, c = Math.cos(th), s = Math.sin(th), v = 1 - c;
  return [c + x * x * v, x * y * v - z * s, x * z * v + y * s,
    y * x * v + z * s, c + y * y * v, y * z * v - x * s,
    z * x * v - y * s, z * y * v + x * s, c + z * z * v];
}
/* RPY (roll oko x, pitch oko y, yaw oko z; R = Rz·Ry·Rx), radijani */
export function rpy(T) {
  const r11 = T[0], r21 = T[4], r31 = T[8], r32 = T[9], r33 = T[10];
  const pitch = Math.atan2(-r31, Math.hypot(r11, r21));
  if (Math.abs(Math.cos(pitch)) < 1e-9) return [Math.atan2(T[1], T[5]) * (pitch > 0 ? 1 : -1), pitch, 0];
  return [Math.atan2(r32, r33), pitch, Math.atan2(r21, r11)];
}
/* poza (x, y, z, rx, ry, rz) → matrica 4×4 i obrnuto */
export function matricaIzPoze(p) {
  const R = rotIzVektora([p[3], p[4], p[5]]);
  return [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1];
}
export function pozaIzMatrice(T) { const rv = rotVektor(T); return [T[3], T[7], T[11], rv[0], rv[1], rv[2]]; }

/* ------------------------------------------------------------------ izravna kinematika */
export function fk(q) {
  const okviri = [jedinicna()];
  let T = okviri[0];
  for (let i = 0; i < 6; i++) { T = pomnozi(T, dhI(i, q[i])); okviri.push(T); }
  return { T, p: [T[3], T[7], T[11]], rpy: rpy(T), rv: rotVektor(T), okviri };
}

/* ------------------------------------------------------------------ Jakobijan (geometrijski, 6×6: redci vx vy vz wx wy wz) */
export function jacobian(q) {
  const { okviri } = fk(q);
  const pe = [okviri[6][3], okviri[6][7], okviri[6][11]];
  const J = [[], [], [], [], [], []];
  for (let i = 0; i < 6; i++) {
    const O = okviri[i];
    const z = [O[2], O[6], O[10]], o = [O[3], O[7], O[11]];
    const d = [pe[0] - o[0], pe[1] - o[1], pe[2] - o[2]];
    const v = [z[1] * d[2] - z[2] * d[1], z[2] * d[0] - z[0] * d[2], z[0] * d[1] - z[1] * d[0]];
    J[0][i] = v[0]; J[1][i] = v[1]; J[2][i] = v[2]; J[3][i] = z[0]; J[4][i] = z[1]; J[5][i] = z[2];
  }
  return J;
}

/* ------------------------------------------------------------------ pomoćno */
export function normKut(x) { let y = ((x + PI) % DVA_PI + DVA_PI) % DVA_PI - PI; if (y === -PI) y = PI; return y; }
/* odstupanje dviju poza: položaj (m) i kut (rad) */
export function odstupanje(A, B) {
  const dp = Math.hypot(A[3] - B[3], A[7] - B[7], A[11] - B[11]);
  /* kut relativne rotacije R = A^T B */
  const t = (A[0] * B[0] + A[4] * B[4] + A[8] * B[8]) + (A[1] * B[1] + A[5] * B[5] + A[9] * B[9]) + (A[2] * B[2] + A[6] * B[6] + A[10] * B[10]);
  const dk = Math.acos(Math.max(-1, Math.min(1, (t - 1) / 2)));
  return { dp, dk };
}
/* provjera granica zglobova: vraća popis indeksa zglobova izvan granica */
export function provjeriGranice(q) {
  const izvan = [];
  for (let i = 0; i < 6; i++) if (!Number.isFinite(q[i]) || Math.abs(q[i]) > GRANICE[i] + 1e-9) izvan.push(i);
  return izvan;
}
/* kut x prebaci u ekvivalent (x + k·2π) najbliži referenci, unutar granice zgloba */
function najbliziEkvivalent(x, ref, gr) {
  let y = x + Math.round((ref - x) / DVA_PI) * DVA_PI;
  if (Number.isFinite(gr)) {
    while (y > gr) y -= DVA_PI;
    while (y < -gr) y += DVA_PI;
  }
  return y;
}

/* ------------------------------------------------------------------ analitička inverzna kinematika (do 8 rješenja) */
export function ikSva(T, q6ref = 0) {
  const { a, d } = DH;
  const a2 = a[1], a3 = a[2], d1 = d[0], d4 = d[3], d5 = d[4], d6 = d[5];
  const rj = [];
  /* položaj okvira 5: p05 = p06 − d6 · z6 */
  const p05x = T[3] - d6 * T[2], p05y = T[7] - d6 * T[6];
  const R = Math.hypot(p05x, p05y);
  if (R < Math.abs(d4) - 1e-12) return rj;           /* točka unutar valjka oko osi baze — nema rješenja */
  const psi = Math.atan2(p05y, p05x), phi = Math.acos(Math.max(-1, Math.min(1, d4 / R)));
  for (const s1z of [1, -1]) {
    const t1 = psi + s1z * phi + PI / 2;
    const s1 = Math.sin(t1), c1 = Math.cos(t1);
    const c5 = (T[3] * s1 - T[7] * c1 - d4) / d6;
    if (Math.abs(c5) > 1 + 1e-9) continue;
    const t5a = Math.acos(Math.max(-1, Math.min(1, c5)));
    for (const s5z of [1, -1]) {
      const t5 = s5z * t5a, s5 = Math.sin(t5);
      let t6;
      if (Math.abs(s5) < 1e-8) t6 = q6ref;            /* singularnost zapešća: θ6 slobodan */
      else t6 = Math.atan2((-T[1] * s1 + T[5] * c1) / s5, (T[0] * s1 - T[4] * c1) / s5);
      /* T14 = inv(T01) · T06 · inv(T45 · T56) */
      const T01 = dhI(0, t1), T45 = dhI(4, t5), T56 = dhI(5, t6);
      const T14 = pomnozi(pomnozi(inverz(T01), T), inverz(pomnozi(T45, T56)));
      /* ishodište okvira 3 u okviru 1: T14 · (0, −d4, 0) */
      const x = T14[3] - d4 * T14[1], y = T14[7] - d4 * T14[5];
      const c3 = (x * x + y * y - a2 * a2 - a3 * a3) / (2 * a2 * a3);
      if (Math.abs(c3) > 1 + 1e-9) continue;
      const t3a = Math.acos(Math.max(-1, Math.min(1, c3)));
      for (const s3z of [1, -1]) {
        const t3 = s3z * t3a;
        const t2 = Math.atan2(y, x) - Math.atan2(a3 * Math.sin(t3), a2 + a3 * Math.cos(t3));
        const T13 = pomnozi(dhI(1, t2), dhI(2, t3));
        const T34 = pomnozi(inverz(T13), T14);
        const t4 = Math.atan2(T34[4], T34[0]);
        rj.push([t1, t2, t3, t4, t5, t6].map(normKut));
      }
    }
  }
  return rj;
}

/* numerička rezerva: prigušeni najmanji kvadrati (Levenberg–Marquardt) */
export function ikNumericka(T, q0, { iter = 200, tolP = 1e-7, tolK = 1e-6, samoPolozaj = false } = {}) {
  let q = q0.slice();
  let lam = 0.01;
  for (let k = 0; k < iter; k++) {
    const F = fk(q).T;
    const e = [T[3] - F[3], T[7] - F[7], T[11] - F[11]];
    /* pogreška orijentacije: ½ Σ (n_i × n_i*) */
    const cr = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const col = (M, j) => [M[j], M[4 + j], M[8 + j]];
    const w = [0, 0, 0];
    for (let j = 0; j < 3; j++) { const c = cr(col(F, j), col(T, j)); w[0] += c[0] / 2; w[1] += c[1] / 2; w[2] += c[2] / 2; }
    const ep = Math.hypot(e[0], e[1], e[2]), ew = Math.hypot(w[0], w[1], w[2]);
    if (ep < tolP && (samoPolozaj || ew < tolK)) return { q, uspjeh: true, greska: ep };
    const J = jacobian(q);
    const m = samoPolozaj ? 3 : 6;
    const err = samoPolozaj ? e : [...e, ...w];
    /* dq = J^T (J J^T + λ² I)^-1 err */
    const A = [];
    for (let i = 0; i < m; i++) { A.push([]); for (let j = 0; j < m; j++) { let s = 0; for (let c = 0; c < 6; c++) s += J[i][c] * J[j][c]; A[i].push(s + (i === j ? lam * lam : 0)); } }
    const y = rijesi(A, err);
    if (!y) break;
    for (let c = 0; c < 6; c++) { let s = 0; for (let i = 0; i < m; i++) s += J[i][c] * y[i]; q[c] += s; }
  }
  const F = fk(q).T;
  const ep = Math.hypot(T[3] - F[3], T[7] - F[7], T[11] - F[11]);
  const { dk } = odstupanje(F, T);
  return { q, uspjeh: ep < 1e-5 && (samoPolozaj || dk < 1e-4), greska: ep };
}
/* Gaussova eliminacija s djelomičnim izborom stožera */
function rijesi(A0, b0) {
  const n = b0.length, A = A0.map((r, i) => [...r, b0[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-14) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}

/* inverzna kinematika: analitička (8 rješenja) → rješenje najbliže qPocetni; ako nema, numerička rezerva */
export function ik(cilj, qPocetni = [0, -PI / 2, 0, -PI / 2, 0, 0], opcije = {}) {
  const q0 = qPocetni;
  const sva = ikSva(cilj, q0[5]);
  let naj = null, najD = Infinity;
  const tez = opcije.tezine || [1, 1, 1, 0.6, 0.6, 0.4];
  for (const r of sva) {
    const q = r.map((x, i) => najbliziEkvivalent(x, q0[i], GRANICE[i]));
    const F = fk(q).T, o = odstupanje(F, cilj);
    if (o.dp > 1e-6 || o.dk > 1e-5) continue;
    if (provjeriGranice(q).length) continue;
    let dd = 0; for (let i = 0; i < 6; i++) dd += tez[i] * (q[i] - q0[i]) ** 2;
    if (dd < najD) { najD = dd; naj = { q, greska: o.dp }; }
  }
  if (naj && (opcije.najveciSkok === undefined || Math.sqrt(najD) <= opcije.najveciSkok)) {
    return { q: naj.q, uspjeh: true, greska: naj.greska, nacin: 'analiticki', broj: sva.length };
  }
  const num = ikNumericka(cilj, q0);
  num.q = num.q.map((x, i) => najbliziEkvivalent(x, q0[i], GRANICE[i]));
  if (num.uspjeh && provjeriGranice(num.q).length) num.uspjeh = false;
  if (!num.uspjeh && naj) return { q: naj.q, uspjeh: true, greska: naj.greska, nacin: 'analiticki', broj: sva.length };
  return { ...num, nacin: 'numericki', broj: sva.length };
}

/* položajna IK za točku s pomakom u okviru prirubnice (npr. TCP): zadaje se samo položaj, orijentacija ostaje slobodna
   (prigušeni najmanji kvadrati; rabi se za slobodno vođenje „Free”) */
export function ikTocka(pCilj, q0, odmak = [0, 0, 0], { iter = 40, lam = 0.02 } = {}) {
  const q = q0.slice();
  let ep = Infinity;
  for (let k = 0; k < iter; k++) {
    const T = fk(q).T;
    const r = [T[0] * odmak[0] + T[1] * odmak[1] + T[2] * odmak[2], T[4] * odmak[0] + T[5] * odmak[1] + T[6] * odmak[2], T[8] * odmak[0] + T[9] * odmak[1] + T[10] * odmak[2]];
    const e = [pCilj[0] - T[3] - r[0], pCilj[1] - T[7] - r[1], pCilj[2] - T[11] - r[2]];
    ep = Math.hypot(e[0], e[1], e[2]);
    if (ep < 1e-6) break;
    const J = jacobian(q), Jt = [[], [], []];
    for (let c = 0; c < 6; c++) {
      const w = [J[3][c], J[4][c], J[5][c]];
      Jt[0][c] = J[0][c] + w[1] * r[2] - w[2] * r[1];
      Jt[1][c] = J[1][c] + w[2] * r[0] - w[0] * r[2];
      Jt[2][c] = J[2][c] + w[0] * r[1] - w[1] * r[0];
    }
    const A = [0, 1, 2].map((i) => [0, 1, 2].map((j) => { let s = 0; for (let c = 0; c < 6; c++) s += Jt[i][c] * Jt[j][c]; return s + (i === j ? lam * lam : 0); }));
    const y = rijesi(A, e); if (!y) break;
    for (let c = 0; c < 6; c++) q[c] += Jt[0][c] * y[0] + Jt[1][c] * y[1] + Jt[2][c] * y[2];
  }
  return { q, greska: ep, uspjeh: ep < 1e-4 };
}
