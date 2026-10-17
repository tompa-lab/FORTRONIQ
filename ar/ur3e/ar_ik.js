// ar_ik.js — izravna i inverzna kinematika kobota UR3e za AR stranicu (ForTroniQ DOS, v01)
// Samostalan modul (bez three.js): DH parametri UR3e, kutovi u RADIJANIMA, duljine u METRIMA,
// koordinatni sustav baze robota (Z gore). Inverzna kinematika je numerička (prigušeni najmanji
// kvadrati s geometrijskim Jacobijanom) i služi kao zamjena kad modul ur3e_kin.js nije dostupan.
export const DH = {
  a: [0, -0.24355, -0.2132, 0, 0, 0],
  d: [0.15185, 0, 0, 0.13105, 0.08535, 0.0921],
  alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0]
};

// 4×4 matrice kao nizovi od 16 brojeva, redak po redak
function mnoz(A, B) {
  const C = new Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    let s = 0; for (let k = 0; k < 4; k++) s += A[r * 4 + k] * B[k * 4 + c]; C[r * 4 + c] = s;
  }
  return C;
}
function dhM(th, d, a, al) {
  const ct = Math.cos(th), st = Math.sin(th), ca = Math.cos(al), sa = Math.sin(al);
  return [ct, -st * ca, st * sa, a * ct, st, ct * ca, -ct * sa, a * st, 0, sa, ca, d, 0, 0, 0, 1];
}

// okviri: [T0 (jedinična), T1 … T6] u KS baze; T6 = prirubnica (tool0)
export function okviri(q, alat) {
  let T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const o = [T];
  for (let i = 0; i < 6; i++) { T = mnoz(T, dhM(q[i], DH.d[i], DH.a[i], DH.alpha[i])); o.push(T); }
  if (alat) o.push(mnoz(T, alat));
  return o;
}
export function fk(q, alat) { const o = okviri(q, alat); return o[o.length - 1]; }

// alat: pomak TCP-a po osi z prirubnice (m)
export function alatZ(dz) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, dz, 0, 0, 0, 1]; }

function kriz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function stup(T, c) { return [T[c], T[4 + c], T[8 + c]]; }

// pogreška položaja (m) i orijentacije (rad, polovica zbroja vektorskih umnožaka osi)
export function greska(T, C) {
  const ep = [C[3] - T[3], C[7] - T[7], C[11] - T[11]];
  const er = [0, 0, 0];
  for (let c = 0; c < 3; c++) { const v = kriz(stup(T, c), stup(C, c)); er[0] += v[0] / 2; er[1] += v[1] / 2; er[2] += v[2] / 2; }
  return ep.concat(er);
}

function rijesi(A, b) {
  const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let m = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[m][c])) m = r;
    [M[c], M[m]] = [M[m], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}

// geometrijski Jacobijan 6×6 (redci: vx vy vz wx wy wz)
export function jacobian(q, alat) {
  const o = okviri(q, alat), pe = stup(o[o.length - 1], 3);
  const J = [[], [], [], [], [], []];
  for (let i = 0; i < 6; i++) {
    const z = stup(o[i], 2), p = stup(o[i], 3);
    const v = kriz(z, [pe[0] - p[0], pe[1] - p[1], pe[2] - p[2]]);
    for (let r = 0; r < 3; r++) { J[r][i] = v[r]; J[r + 3][i] = z[r]; }
  }
  return J;
}

// cilj: 4×4 (redak po redak), q0: početni kutovi, granice: [[min,max]×6] u rad
export function ik(cilj, q0, opc = {}) {
  const alat = opc.alat || null, gr = opc.granice || null;
  const q = q0.slice(); let ok = false, e = null;
  for (let it = 0; it < (opc.iteracija || 300); it++) {
    e = greska(fk(q, alat), cilj);
    const np = Math.hypot(e[0], e[1], e[2]), nr = Math.hypot(e[3], e[4], e[5]);
    if (np < 1e-5 && nr < 1e-4) { ok = true; break; }
    const J = jacobian(q, alat), L2 = 1e-4;
    const A = [];
    for (let r = 0; r < 6; r++) { A.push([]); for (let k = 0; k < 6; k++) { let s = 0; for (let j = 0; j < 6; j++) s += J[r][j] * J[k][j]; A[r].push(s + (r === k ? L2 : 0)); } }
    const y = rijesi(A, e);
    for (let j = 0; j < 6; j++) {
      let d = 0; for (let r = 0; r < 6; r++) d += J[r][j] * y[r];
      d = Math.max(-0.15, Math.min(0.15, d));
      q[j] += d;
      if (gr) q[j] = Math.max(gr[j][0], Math.min(gr[j][1], q[j]));
    }
  }
  return { q, uspjeh: ok, greska: e ? Math.hypot(e[0], e[1], e[2]) : 0 };
}

// poza alata okrenutog prema dolje (z alata = −Z baze); os x alata vodoravno, u smjeru kuta psi
export function pozaDolje(x, y, z, psi) {
  const c = Math.cos(psi), s = Math.sin(psi);
  // x_t = (c, s, 0), z_t = (0, 0, −1), y_t = z_t × x_t = (s, −c, 0)
  return [c, s, 0, x, s, -c, 0, y, 0, 0, -1, z, 0, 0, 0, 1];
}
