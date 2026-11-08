/* FORTRONIQ · ABB IRB 120 — izravna i inverzna kinematika (standardni DH, mm, ABB kutovi u stupnjevima).
   DH ista kao na stranici „Kinematika i dinamika industrijskog robota”. © ForTroniQ d.o.o. */
export const DH = [[0, -90, 290, 0], [270, 0, 0, -90], [70, -90, 0, 0], [0, 90, 302, 0], [0, -90, 0, 0], [0, 0, 72, 180]]; // a, alfa, d, pomak
export const LIM = [[-165, 165], [-110, 110], [-110, 70], [-160, 160], [-120, 120], [-400, 400]];
const R = Math.PI / 180;
export function mm(A, B) { const C = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += A[i * 4 + k] * B[k * 4 + j]; C[i * 4 + j] = s; } return C; }
export function A(i, q) { const [a, al, d, p] = DH[i]; const t = (q + p) * R, ca = Math.cos(al * R), sa = Math.sin(al * R), ct = Math.cos(t), st = Math.sin(t);
  return [ct, -st * ca, st * sa, a * ct, st, ct * ca, -ct * sa, a * st, 0, sa, ca, d, 0, 0, 0, 1]; }
export function fk(q) { let T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; const okv = [T]; for (let i = 0; i < 6; i++) { T = mm(T, A(i, q[i])); okv.push(T); } return { T, okv, p: [T[3], T[7], T[11]] }; }
/* rotacija iz Eulerovih kutova ZYX (RobotStudio/ABB „EulerZYX”: z, y, x u stupnjevima) i obratno, te kvaternion kao u RAPID-u (q1 = w) */
export function rotZYX(z, y, x) { const cz = Math.cos(z * R), sz = Math.sin(z * R), cy = Math.cos(y * R), sy = Math.sin(y * R), cx = Math.cos(x * R), sx = Math.sin(x * R);
  return [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx]; }
export function zyx(T) { const r20 = T[8]; const y = Math.asin(Math.max(-1, Math.min(1, -r20))) / R; const z = Math.atan2(T[4], T[0]) / R, x = Math.atan2(T[9], T[10]) / R; return [z, y, x]; }
export function kvaternion(T) { const m00 = T[0], m11 = T[5], m22 = T[10]; let w, x, y, z; const tr = m00 + m11 + m22;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (T[9] - T[6]) / s; y = (T[2] - T[8]) / s; z = (T[4] - T[1]) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (T[9] - T[6]) / s; x = s / 4; y = (T[1] + T[4]) / s; z = (T[2] + T[8]) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (T[2] - T[8]) / s; x = (T[1] + T[4]) / s; y = s / 4; z = (T[6] + T[9]) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (T[4] - T[1]) / s; x = (T[2] + T[8]) / s; y = (T[6] + T[9]) / s; z = s / 4; }
  if (w < 0) { w = -w; x = -x; y = -y; z = -z; } return [w, x, y, z]; }
const norm = (a) => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
/* Analitička inverzna kinematika: cilj = položaj prirubnice tool0 p [mm] i rotacija Rm (3×3, redak po redak).
   Razdvajanje: središte zapešća pw = p − 72·z6 daje osi 1–3, orijentacija daje osi 4–6. Do 8 rješenja. */
export function ik(p, Rm) {
  const d6 = 72, d1 = 290, a2 = 270, a3 = 70, d4 = 302;
  const pw = [p[0] - d6 * Rm[2], p[1] - d6 * Rm[5], p[2] - d6 * Rm[8]];
  const L3 = Math.hypot(a3, d4), fi = Math.atan2(d4, a3);
  const out = [];
  const r0 = Math.hypot(pw[0], pw[1]);
  for (const sprijeda of [true, false]) {
    const q1 = (sprijeda ? Math.atan2(pw[1], pw[0]) : Math.atan2(-pw[1], -pw[0])) / R;
    const r = sprijeda ? r0 : -r0, s = pw[2] - d1;
    const D = (r * r + s * s - a2 * a2 - L3 * L3) / (2 * a2 * L3);
    if (Math.abs(D) > 1 + 1e-9) continue;
    for (const gore of [true, false]) {
      const g = Math.acos(Math.max(-1, Math.min(1, D))) * (gore ? 1 : -1);       /* γ: kut podlaktice (spojnica lakat–zapešće) prema nadlaktici */
      const ta = Math.atan2(s, r) - Math.atan2(L3 * Math.sin(g), a2 + L3 * Math.cos(g)); /* nagib nadlaktice od vodoravne */
      const b0 = Math.atan2(a3, d4);                                              /* spojnica lakat–zapešće u nultoj pozi: 70 gore, 302 naprijed */
      const q2 = 90 - ta / R, q3 = (b0 - g) / R - 90;
      const T03 = mm(mm(A(0, q1), A(1, q2)), A(2, q3));
      out.push({ q1, q2, q3, T03, sprijeda, gore });
    }
  }
  const rj = [];
  for (const o of out) {
    const T = o.T03; const R03 = [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]];
    const M = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += R03[k * 3 + i] * Rm[k * 3 + j]; M[i * 3 + j] = s; }
    for (const flip of [false, true]) {
      let c5 = M[8]; c5 = Math.max(-1, Math.min(1, c5));
      let q5 = Math.acos(c5) / R; if (flip) q5 = -q5;
      let q4, q6; const s5 = Math.sin(q5 * R);
      if (Math.abs(s5) < 1e-6) { q4 = 0; q6 = Math.atan2(M[3], M[0]) / R; }
      else { q4 = Math.atan2(-M[5] / s5, -M[2] / s5) / R; q6 = Math.atan2(-M[7] / s5, M[6] / s5) / R; }
      rj.push({ q: [o.q1, o.q2, o.q3, q4, q5, q6 - 180].map(norm), sprijeda: o.sprijeda, gore: o.gore, flip, singularno: Math.abs(s5) < 1e-3 });
    }
  }
  for (const r of rj) { const f = fk(r.q).T; r.greska = Math.hypot(f[3] - p[0], f[7] - p[1], f[11] - p[2]); let eo = 0; const Rf = [f[0], f[1], f[2], f[4], f[5], f[6], f[8], f[9], f[10]]; for (let i = 0; i < 9; i++) eo = Math.max(eo, Math.abs(Rf[i] - Rm[i])); r.greskaOr = eo; r.uOpsegu = r.q.every((v, i) => v >= LIM[i][0] - 1e-6 && v <= LIM[i][1] + 1e-6); }
  return rj;
}
