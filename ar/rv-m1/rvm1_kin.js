/* FORTRONIQ · Mitsubishi Movemaster EX RV-M1 — kinematika: izravna (FK), analitička inverzna (IK, „lakat gore”), granice,
   dohvatljivost, zglobna (MO) i linearna (MS) interpolacija, trajanje gibanja iz brzina osi i SP, pretvorba u zapis točke robota.
   Parametri dolaze iz rvm1_podaci.js (MJERE, OSI, BRZINE, KONFIG, TL_ZADANO). Jedinice: m, rad. Matrice 4×4 kao niz od 16 brojeva, redak po redak.
   KS robota: X naprijed, Y lijevo, Z gore, ishodište na montažnoj plohi u osi J1.
   Kutovi (naša konvencija, pp): J1 od +X, pozitivno CCW odozgo (KONFIG.smjerJ1 = 'cw' okreće predznak); J2 od vodoravne; J3 prema nadlaktici
   (0 = ispružena, ≤ 0 lakat gore); J4 prema podlaktici; P = J2 + J3 + J4; R = J5.
   Okvir alata (prirubnica/TCP): z = smjer alata (od prirubnice prema van), y = normala ravnine ruke (pri J1 = 0 je +Y), x = y × z;
   R_alat = Rz(θ1)·Ry(−P)·Ry(90°)·Rz(J5). Istovjetno standardnoj DH tablici iz podataka uz θ4,DH = J4 + 90°.
   © ForTroniQ d.o.o. */
import { MJERE, OSI, BRZINE, KONFIG, TL_ZADANO } from './rvm1_podaci.js';

const PI = Math.PI;
export const PARAM = { d1: MJERE.d1, L2: MJERE.L2, L3: MJERE.L3, L4: MJERE.L4, tl: TL_ZADANO / 1000 };
const ZNAK_J1 = KONFIG.smjerJ1 === 'cw' ? -1 : 1;
const TL0 = TL_ZADANO / 1000;

/* ------------------------------------------------------------------ matrice */
export function jedinicna() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
export function pomnozi(A, B) {
  const C = new Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) C[4 * i + j] = A[4 * i] * B[j] + A[4 * i + 1] * B[4 + j] + A[4 * i + 2] * B[8 + j] + A[4 * i + 3] * B[12 + j];
  return C;
}
export function dhMatrica(theta, d, a, alpha) {
  const ct = Math.cos(theta), st = Math.sin(theta), ca = Math.cos(alpha), sa = Math.sin(alpha);
  return [ct, -st * ca, st * sa, a * ct, st, ct * ca, -ct * sa, a * st, 0, sa, ca, d, 0, 0, 0, 1];
}
/** okvir iz rotacije (stupci x, y, z) i položaja */
function okvirR(x, y, z, p) { return [x[0], y[0], z[0], p[0], x[1], y[1], z[1], p[1], x[2], y[2], z[2], p[2], 0, 0, 0, 1]; }

/* ------------------------------------------------------------------ izravna kinematika */
/** fk(q, tl) → { p [m] (TCP), P, R [rad], T (TCP), okviri[6] (0 baza, 1 rame, 2 lakat, 3 os nagiba, 4 prirubnica, 5 TCP), sake [m] (točka osi nagiba), prirubnica [m] } */
export function fk(q, tl = TL0) {
  const { d1, L2, L3, L4 } = PARAM;
  const t1 = ZNAK_J1 * q[0], c1 = Math.cos(t1), s1 = Math.sin(t1);
  const a2 = q[1], a3 = q[1] + q[2], P = q[1] + q[2] + q[3], R = q[4];
  /* u ravnini ruke: r (radijalno), z */
  const rL = L2 * Math.cos(a2), zL = d1 + L2 * Math.sin(a2);
  const rW = rL + L3 * Math.cos(a3), zW = zL + L3 * Math.sin(a3);
  const rF = rW + L4 * Math.cos(P), zF = zW + L4 * Math.sin(P);
  const rT = rW + (L4 + tl) * Math.cos(P), zT = zW + (L4 + tl) * Math.sin(P);
  const u = (r, z) => [r * c1, r * s1, z];
  const ravnina = (a) => ({ x: [Math.cos(a) * c1, Math.cos(a) * s1, Math.sin(a)], z: [-Math.sin(a) * c1, -Math.sin(a) * s1, Math.cos(a)] });
  const yN = [-s1, c1, 0];   /* normala ravnine ruke (lijevo pri J1 = 0) */
  const okvirClanka = (a, p) => { const r = ravnina(a); return okvirR(r.x, yN, r.z, p); };
  /* okvir alata: z = (cosP, sinP) u ravnini, y0 = yN, x0 = y0 × z; zatim okret R oko z */
  const zA = [Math.cos(P) * c1, Math.cos(P) * s1, Math.sin(P)];
  const x0 = [yN[1] * zA[2] - yN[2] * zA[1], yN[2] * zA[0] - yN[0] * zA[2], yN[0] * zA[1] - yN[1] * zA[0]];
  const cR = Math.cos(R), sR = Math.sin(R);
  const xA = [0, 1, 2].map((k) => cR * x0[k] + sR * yN[k]);
  const yA = [0, 1, 2].map((k) => -sR * x0[k] + cR * yN[k]);
  const okviri = [
    jedinicna(),
    okvirClanka(a2, [0, 0, d1]),
    okvirClanka(a3, u(rL, zL)),
    okvirClanka(P, u(rW, zW)),
    okvirR(xA, yA, zA, u(rF, zF)),
    okvirR(xA, yA, zA, u(rT, zT))
  ];
  return { p: u(rT, zT), P, R, T: okviri[5], okviri, sake: u(rW, zW), prirubnica: u(rF, zF), lakat: u(rL, zL) };
}
/** FK po standardnoj DH tablici (provjera): θ = (J1, J2, J3, J4 + 90°, J5), d = (d1, 0, 0, 0, L4), a = (0, L2, L3, 0, 0), α = (90°, 0, 0, 90°, 0) */
export function fkDH(q, tl = TL0) {
  const { d1, L2, L3, L4 } = PARAM;
  const th = [ZNAK_J1 * q[0], q[1], q[2], q[3] + PI / 2, q[4]], d = [d1, 0, 0, 0, L4 + tl], a = [0, L2, L3, 0, 0], al = [PI / 2, 0, 0, PI / 2, 0];
  let T = jedinicna(); for (let i = 0; i < 5; i++) T = pomnozi(T, dhMatrica(th[i], d[i], a[i], al[i]));
  return T;
}

/* ------------------------------------------------------------------ granice */
/** uGranicama(q) → { ok, os } (os = indeks prve osi izvan granica, ili −1) */
export function uGranicama(q, tol = 1e-9) {
  for (let i = 0; i < 5; i++) if (!(q[i] >= OSI[i].min - tol && q[i] <= OSI[i].max + tol)) return { ok: false, os: i };
  return { ok: true, os: -1 };
}
export function ogranici(q) { return q.map((v, i) => Math.min(OSI[i].max, Math.max(OSI[i].min, v))); }
const norm = (a) => { a = ((a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a; };

/* ------------------------------------------------------------------ inverzna kinematika */
/** ik({x, y, z, P, R}, tl, qRef?) → { q, uspjeh, razlog, sva }  — analitički, „lakat gore” (J3 ≤ 0); x, y, z [m] TCP, P, R [rad].
    P i R su kao na robotu (P = J2 + J3 + J4 u ravnini ruke, R = J5). Kandidati za J1: atan2(y, x) i atan2 + 180° (šaka iza osi J1, „preko glave”).
    Od rješenja u granicama bira se ono najbliže qRef (ako je zadan), inače prvo. razlog: 'izvan dosega' | 'izvan granica osi J…' */
export function ik(t, tl = TL0, qRef = null) {
  const { d1, L2, L3 } = PARAM, L4 = PARAM.L4;
  const x = t.x, y = t.y, z = t.z, P = t.P ?? -PI / 2, R = t.R ?? 0;
  const rr = Math.hypot(x, y);
  const t1a = rr < 1e-9 ? (qRef ? ZNAK_J1 * qRef[0] : 0) : Math.atan2(y, x);
  const kandidati = [{ t1: t1a, r: rr }, { t1: norm(t1a + PI), r: -rr }];
  const sva = []; let razlog = 'izvan dosega';
  for (const k of kandidati) {
    const rw = k.r - (L4 + tl) * Math.cos(P), zw = z - d1 - (L4 + tl) * Math.sin(P);
    const D = rw * rw + zw * zw, c3 = (D - L2 * L2 - L3 * L3) / (2 * L2 * L3);
    if (c3 > 1 + 1e-12 || c3 < -1 - 1e-12) continue;
    const j3 = -Math.acos(Math.max(-1, Math.min(1, c3)));
    const j2 = norm(Math.atan2(zw, rw) - Math.atan2(L3 * Math.sin(j3), L2 + L3 * Math.cos(j3)));
    const j4 = norm(P - j2 - j3);
    const q = [ZNAK_J1 * k.t1, j2, j3, j4, R];
    const g = uGranicama(q, 1e-7);
    sva.push({ q, uGranicama: g.ok });
    if (!g.ok && razlog === 'izvan dosega') razlog = 'izvan granica osi ' + OSI[g.os].ime;
  }
  const dobra = sva.filter((s) => s.uGranicama);
  if (!dobra.length) return { q: sva.length ? sva[0].q : null, uspjeh: false, razlog, sva };
  let best = dobra[0];
  if (qRef && dobra.length > 1) { const d = (s) => s.q.reduce((a, v, i) => a + Math.abs(v - qRef[i]), 0); best = dobra.reduce((a, b) => (d(b) < d(a) ? b : a)); }
  return { q: best.q, uspjeh: true, razlog: '', sva };
}
/** dohvatljivo(tocka, tl) → bool (tocka = {x,y,z,P,R} u m/rad) */
export function dohvatljivo(tocka, tl = TL0) { return ik(tocka, tl).uspjeh; }

/* ------------------------------------------------------------------ interpolacije i trajanje */
/** zglobna interpolacija (MO, MJ): s ∈ [0, 1] */
export function interpolirajZglobno(q0, q1, s) { return q0.map((v, i) => v + (q1[i] - v) * s); }
/** linearna interpolacija točke (MS): T0, T1 = {x,y,z,P,R}; vraća točku na pravcu (P i R linearno) */
export function linearno(T0, T1, s) {
  const L = (a, b) => a + (b - a) * s;
  return { x: L(T0.x, T1.x), y: L(T0.y, T1.y), z: L(T0.z, T1.z), P: L(T0.P ?? -PI / 2, T1.P ?? -PI / 2), R: L(T0.R ?? 0, T1.R ?? 0) };
}
/** MS a, n: n međutočaka → niz od n + 2 kutova zglobova (početak, međutočke, kraj) ili { greska, indeks } */
export function linearnoTocke(T0, T1, n, tl = TL0) {
  const out = [];
  for (let k = 0; k <= n + 1; k++) {
    const r = ik(linearno(T0, T1, k / (n + 1)), tl);
    if (!r.uspjeh) return { greska: r.razlog, indeks: k, q: out };
    out.push(r.q);
  }
  return { q: out };
}
/** udio najveće brzine za SP 0–9 (iz BRZINE) */
export function udioSP(sp) { const b = BRZINE[Math.max(0, Math.min(9, Math.round(Number(sp) || 0)))]; return b ? b.udio : 1; }
/** trajanje zglobnog gibanja [s]: najsporija os uz vMax osi × udio SP; ubrzanje 'H' | 'L' | null dodaje vrijeme ubrzanja i usporenja (pp) */
export function trajanje(q0, q1, sp = 9, ubrzanje = null) {
  const u = udioSP(sp); let t = 0;
  for (let i = 0; i < 5; i++) t = Math.max(t, Math.abs(q1[i] - q0[i]) / (OSI[i].vMaxRad * u));
  if (ubrzanje && t > 0 && BRZINE.ubrzanje) t += BRZINE.ubrzanje[ubrzanje] || 0;
  return t;
}
/** trajanje linearnog gibanja [s]: duljina / (1000 mm/s × udio SP), ali ne kraće od zglobnog trajanja krajnjih točaka */
export function trajanjeLinearno(T0, T1, sp = 9, tl = TL0) {
  const d = Math.hypot(T1.x - T0.x, T1.y - T0.y, T1.z - T0.z);
  let t = d / ((BRZINE.najveca || 1000) / 1000 * udioSP(sp));
  const a = ik(T0, tl), b = ik(T1, tl);
  if (a.uspjeh && b.uspjeh) t = Math.max(t, trajanje(a.q, b.q, sp));
  return t;
}

/* ------------------------------------------------------------------ zapis točke kao na robotu */
const r1 = (v) => Math.round(v * 10) / 10;
/** uTocku(q, tl, oc) → { x, y, z [mm], p, r [°], oc } (na 0,1; KONFIG.osXY = 'x-lijevo' zamjenjuje X i Y kao u priručniku) */
export function uTocku(q, tl = TL0, oc = 'O') {
  const f = fk(q, tl);
  let X = f.p[0] * 1000, Y = f.p[1] * 1000;
  if (KONFIG.osXY === 'x-lijevo') [X, Y] = [Y, X];
  const st = 180 / PI;
  return { x: r1(X), y: r1(Y), z: r1(f.p[2] * 1000), p: r1(f.P * st), r: r1(f.R * st), oc: oc === 'C' || oc === true ? 'C' : 'O' };
}
/** izTocke({x,y,z,p,r}) [mm, °] → { x, y, z [m], P, R [rad] } */
export function izTocke(t) {
  let X = Number(t.x) / 1000, Y = Number(t.y) / 1000;
  if (KONFIG.osXY === 'x-lijevo') [X, Y] = [Y, X];
  const D = PI / 180;
  return { x: X, y: Y, z: Number(t.z) / 1000, P: Number(t.p ?? t.P ?? -90) * D, R: Number(t.r ?? t.R ?? 0) * D };
}

/* ------------------------------------------------------------------ radni prostor (za pomoćne prikaze i temu) */
/** obris dohvatljivog područja točke osi nagiba (šake) u ravnini ruke: [[r, z], …] (m), zatvoren */
export function obrisRadnogProstora(n = 48) {
  const { d1, L2, L3 } = PARAM, o = OSI;
  const tocka = (j2, j3) => [L2 * Math.cos(j2) + L3 * Math.cos(j2 + j3), d1 + L2 * Math.sin(j2) + L3 * Math.sin(j2 + j3)];
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push(tocka(o[1].min + (o[1].max - o[1].min) * k / n, o[2].max));   /* ispružena */
  for (let k = 0; k <= n; k++) pts.push(tocka(o[1].max, o[2].max + (o[2].min - o[2].max) * k / n));
  for (let k = 0; k <= n; k++) pts.push(tocka(o[1].max - (o[1].max - o[1].min) * k / n, o[2].min));   /* najviše savijena */
  for (let k = 0; k <= n; k++) pts.push(tocka(o[1].min, o[2].min + (o[2].max - o[2].min) * k / n));
  return pts;
}
