/* FORTRONIQ · Mobilni robot Robotino — kinematika tropotočnog svesmjernog pogona, odometrija i 2D senzori za simulator.
   Konvencija Festo / REC API (OmniDriveModel): kotači na θ = 60°, 180°, 300° od osi x robota,
     m_i = k · (−sin θ_i · vx + cos θ_i · vy + rb · ω),   k = 60 · gear / (2π · rw)      [1/min motora]
   KS robota: x naprijed, y lijevo, ω > 0 suprotno od kazaljke gledano odozgo. Jedinice: m, s, rad, 1/min.
   Svi parametri dolaze iz robotino_podaci.js (gear, rw, rb, nMotMax, inkPoOkr, mjere senzora).
   © ForTroniQ d.o.o. */
import { POGON, MJERE, SENZORI } from './robotino_podaci.js';

const PI = Math.PI;
const rad = (d) => d * PI / 180;
const cist = (v) => (Math.abs(v) < 1e-12 ? 0 : Math.abs(Math.abs(v) - 0.5) < 1e-12 ? Math.sign(v) * 0.5 : Math.abs(Math.abs(v) - 1) < 1e-12 ? Math.sign(v) : v);

/** kutovi kotača (rad) */
export const KUTOVI = MJERE.kutoviKotaca.map(rad);
const S = KUTOVI.map((t) => cist(Math.sin(t))), C = KUTOVI.map((t) => cist(Math.cos(t)));
/** faktor k = 60·gear/(2π·rw): (m/s obodne brzine kotača) → (1/min motora) */
export function faktorK() { return 60 * POGON.gear / (2 * PI * POGON.rw); }

/* matrica A (3×3): m = k · A · [vx, vy, ω] i njezin inverz (računa se jednom) */
function matricaA() { return [0, 1, 2].map((i) => [-S[i], C[i], POGON.rb]); }
function inverz3(A) {
  const [a, b, c] = A[0], [d, e, f] = A[1], [g, h, i] = A[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [[(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]];
}

/** inverzna kinematika: brzine robota (m/s, m/s, rad/s) → brzine motora [m1, m2, m3] (1/min) */
export function inverzna(vx, vy, w) {
  const k = faktorK();
  return [0, 1, 2].map((i) => k * (-S[i] * vx + C[i] * vy + POGON.rb * w));
}

/** direktna kinematika: [m1, m2, m3] (1/min) → { vx, vy, w } (m/s, m/s, rad/s) */
export function direktna(m) {
  const k = faktorK(), Ai = inverz3(matricaA());
  const u = [m[0] / k, m[1] / k, m[2] / k];
  return {
    vx: Ai[0][0] * u[0] + Ai[0][1] * u[1] + Ai[0][2] * u[2],
    vy: Ai[1][0] * u[0] + Ai[1][1] * u[1] + Ai[1][2] * u[2],
    w: Ai[2][0] * u[0] + Ai[2][1] * u[1] + Ai[2][2] * u[2]
  };
}

/** skalira (vx, vy, ω) jednim faktorom tako da nijedan motor ne prijeđe nMotMax (smjer gibanja ostaje isti).
    opc: { vMax, wMax, nMax } — dodatne softverske granice (npr. POGON.ogranicenja). */
export function ogranici(vx, vy, w, opc = {}) {
  let f = 1;
  const nMax = opc.nMax ?? POGON.nMotMax;
  if (opc.vMax != null) { const v = Math.hypot(vx, vy); if (v > opc.vMax) f = Math.min(f, opc.vMax / v); }
  if (opc.wMax != null && Math.abs(w) > opc.wMax) f = Math.min(f, opc.wMax / Math.abs(w));
  const m = inverzna(vx * f, vy * f, w * f);
  const mx = Math.max(...m.map(Math.abs));
  if (mx > nMax) f *= nMax / mx * (1 - 1e-12);
  return { vx: vx * f, vy: vy * f, w: w * f, faktor: f };
}

/** brzina robota iz KS robota u svjetski KS (zakret φ) */
export function uSvijet(x, y, phi, vx, vy) {
  const c = Math.cos(phi), s = Math.sin(phi);
  return [vx * c - vy * s, vx * s + vy * c];
}

/** brzina kotača duž njegove osi (m/s) — za vrtnju valjaka u prikazu: valjci se vrte kad robot klizi bočno na kotač */
export function brzineValjaka(vx, vy, w) {
  return [0, 1, 2].map((i) => C[i] * vx + S[i] * vy);
}
/** kut zakreta kotača (rad) iz brzine motora (1/min) i vremena (s) */
export function kutKotaca(m, dt) { return m / POGON.gear * 2 * PI / 60 * dt; }

/* ------------------------------------------------------------------ odometrija */
/** integracija pomaka uz stalnu brzinu tijekom dt (točno rješenje na SE(2)) */
function integriraj(st, vx, vy, w, dt) {
  const th = w * dt;
  let dx, dy;
  if (Math.abs(th) < 1e-9) { dx = vx * dt - vy * th * dt / 2; dy = vy * dt + vx * th * dt / 2; }
  else { const s = Math.sin(th), c = Math.cos(th); dx = (vx * s + vy * (c - 1)) / w; dy = (vx * (1 - c) + vy * s) / w; }
  const cp = Math.cos(st.phi), sp = Math.sin(st.phi);
  st.x += dx * cp - dy * sp; st.y += dx * sp + dy * cp; st.phi += th;
}

/** Odometrija iz brzina motora (i po želji žiroskopa).
    new Odometrija({ kvantizirano: false, x, y, phi })
    korak(dt, m [1/min], gyroW [rad/s] opc.) → this;  x, y, phi; ink [3] (cijeli inkrementi enkodera, 2000/okr motora)
    kvantizirano: true → brzine se računaju iz razlike cijelih inkremenata (kao na stvarnom robotu). */
export class Odometrija {
  constructor(o = {}) {
    this.kvantizirano = !!o.kvantizirano;
    this.x = o.x || 0; this.y = o.y || 0; this.phi = o.phi || 0;
    this.ink = [0, 0, 0]; this._inkF = [0, 0, 0];
    this.vx = 0; this.vy = 0; this.w = 0; this.put = 0;
  }
  postavi(x = 0, y = 0, phi = 0) { this.x = x; this.y = y; this.phi = phi; return this; }
  resetirajInkremente() { this.ink = [0, 0, 0]; this._inkF = [0, 0, 0]; return this; }
  korak(dt, m, gyroW) {
    if (!(dt > 0)) return this;
    const stari = this.ink.slice();
    for (let i = 0; i < 3; i++) { this._inkF[i] += (m[i] || 0) / 60 * POGON.inkPoOkr * dt; this.ink[i] = Math.trunc(this._inkF[i]); }
    const mm = this.kvantizirano ? this.ink.map((v, i) => (v - stari[i]) / POGON.inkPoOkr / dt * 60) : m;
    const v = direktna(mm);
    const w = (gyroW != null && Number.isFinite(gyroW)) ? gyroW : v.w;
    this.vx = v.vx; this.vy = v.vy; this.w = w;
    integriraj(this, v.vx, v.vy, w, dt);
    this.put += Math.hypot(v.vx, v.vy) * dt;
    return this;
  }
}

/* ------------------------------------------------------------------ IR senzor Sharp: napon ↔ udaljenost */
const KRIV = SENZORI.ir.krivulja.slice().sort((a, b) => a[0] - b[0]);
/** napon (V) za udaljenost d (m) — linearna interpolacija po 1/d; ispod ~3 cm napon opada (nejednoznačno područje) */
export function sharpNapon(d) {
  if (!(d > 0)) return KRIV[0][1] * 0.5;
  if (d <= KRIV[0][0]) return KRIV[0][1] * d / KRIV[0][0];
  for (let i = 1; i < KRIV.length; i++) {
    const [d0, u0] = KRIV[i - 1], [d1, u1] = KRIV[i];
    if (d <= d1) { const t = (1 / d - 1 / d0) / (1 / d1 - 1 / d0); return u0 + (u1 - u0) * t; }
  }
  const [dn, un] = KRIV[KRIV.length - 1]; return un * Math.pow(dn / d, 0.6);
}
/** udaljenost (m) za napon U (V) — na jednoznačnom dijelu krivulje [dometMin, dometMax] */
export function sharpUdaljenost(U) {
  const dmin = SENZORI.ir.dometMin, dmax = SENZORI.ir.dometMax;
  if (U >= sharpNapon(dmin)) return dmin;
  if (U <= sharpNapon(dmax)) return dmax;
  let a = dmin, b = dmax;
  for (let k = 0; k < 60; k++) { const c = (a + b) / 2; if (sharpNapon(c) > U) a = c; else b = c; }
  return (a + b) / 2;
}

/* ------------------------------------------------------------------ 2D zrake i sudari */
/** prepreke: [{tip:'seg', a:[x,y], b:[x,y]} | {tip:'krug', c:[x,y], r}] u svjetskom KS.
    Vraća udaljenost do prvog presjeka zrake (px,py, kut) ili maxD ako ga nema. */
export function zraka2D(px, py, kut, prepreke, maxD = Infinity) {
  const dx = Math.cos(kut), dy = Math.sin(kut);
  let best = maxD;
  for (const p of prepreke || []) {
    if (p.tip === 'seg') {
      const ex = p.b[0] - p.a[0], ey = p.b[1] - p.a[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const wx = p.a[0] - px, wy = p.a[1] - py;
      const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
      if (t >= 0 && u >= 0 && u <= 1 && t < best) best = t;
    } else if (p.tip === 'krug') {
      const fx = px - p.c[0], fy = py - p.c[1];
      const b = fx * dx + fy * dy, c = fx * fx + fy * fy - p.r * p.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const sq = Math.sqrt(disc);
      let t = -b - sq; if (t < 0) t = -b + sq;
      if (t >= 0 && t < best) best = t;
    }
  }
  return best;
}
const poza3 = (p) => (Array.isArray(p) ? { x: p[0], y: p[1], phi: p[2] || 0 } : { x: p.x || 0, y: p.y || 0, phi: p.phi || 0 });

/** položaji IR senzora u KS robota: [{ x, y, kut }] (kut u rad) */
export function polozajiIR() {
  return MJERE.ir.kutovi.map((d) => { const a = rad(d); return { x: MJERE.ir.polumjer * Math.cos(a), y: MJERE.ir.polumjer * Math.sin(a), kut: a }; });
}
/** 9 udaljenosti (m) od lica senzora; dometMax znači „nema prepreke u dometu”. opc.stozac: pola širine snopa (°) */
export function senzoriIR(poza, prepreke, opc = {}) {
  const P = poza3(poza), c = Math.cos(P.phi), s = Math.sin(P.phi);
  const dmax = SENZORI.ir.dometMax, st = rad(opc.stozac ?? SENZORI.ir.stozac);
  return polozajiIR().map((q) => {
    const ox = P.x + q.x * c - q.y * s, oy = P.y + q.x * s + q.y * c, a = P.phi + q.kut;
    let d = zraka2D(ox, oy, a, prepreke, dmax);
    if (st > 0) d = Math.min(d, zraka2D(ox, oy, a - st, prepreke, dmax), zraka2D(ox, oy, a + st, prepreke, dmax));
    return Math.min(d, dmax);
  });
}
/** napon 9 IR senzora (V) za iste ulaze kao senzoriIR */
export function naponiIR(poza, prepreke) { return senzoriIR(poza, prepreke).map(sharpNapon); }

/** laserski sken: n zraka od kutMin do kutMax (rad, relativno na robota); dometi u m (domet = nema odraza) */
export function laserSken(poza, prepreke, n = 241) {
  const P = poza3(poza), c = Math.cos(P.phi), s = Math.sin(P.phi), L = MJERE.laser;
  const ox = P.x + L.x * c - L.y * s, oy = P.y + L.x * s + L.y * c;
  const a0 = rad(L.kutMin), a1 = rad(L.kutMax), N = Math.max(2, n | 0);
  const kutovi = [], dometi = [];
  for (let i = 0; i < N; i++) {
    const a = a0 + (a1 - a0) * i / (N - 1);
    kutovi.push(a);
    let d = zraka2D(ox, oy, P.phi + a, prepreke, L.domet);
    if (d < (L.dometMin || 0)) d = L.dometMin || 0;
    dometi.push(d);
  }
  return { kutovi, dometi, izvor: [ox, oy], domet: L.domet };
}

/** udaljenost točke od dužine */
function udaljenostSeg(px, py, a, b) {
  const ex = b[0] - a[0], ey = b[1] - a[1], L2 = ex * ex + ey * ey;
  let t = L2 > 0 ? ((px - a[0]) * ex + (py - a[1]) * ey) / L2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - a[0] - t * ex, py - a[1] - t * ey);
}
/** sudar obrisa robota (krug r = promjer/2, ili opc.r) s preprekama */
export function sudarKrug(poza, prepreke, opc = {}) {
  const P = poza3(poza), r = opc.r ?? MJERE.promjerOsnovice / 2;
  for (const p of prepreke || []) {
    if (p.tip === 'seg' && udaljenostSeg(P.x, P.y, p.a, p.b) < r) return true;
    if (p.tip === 'krug' && Math.hypot(P.x - p.c[0], P.y - p.c[1]) < r + p.r) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ stanica za punjenje */
/** poza robota pristalog na stanicu (x, y, φ stanice): središte na normali prednje plohe, robot okrenut prema stanici */
export function pozaPristajanja(xs, ys, phis) {
  const d = MJERE.stanica.pristajanje;
  return { x: xs + d * Math.cos(phis), y: ys + d * Math.sin(phis), phi: phis + PI };
}
/** prepreke koje čini stanica u svjetskom KS.
    opc.za: 'sve' (zadano) | 'laser' (samo ono što je iznad ravnine skeniranja: reflektorski markeri i kutija 2D markera)
            | 'ir' / 'sudar' (samo tijelo stanice, visine 152 mm). Svaka prepreka ima i oznaku razina: 'tijelo' | 'marker'. */
export function preprekeStanice(xs, ys, phis, opc = {}) {
  const S0 = MJERE.stanica, c = Math.cos(phis), s = Math.sin(phis), za = opc.za || 'sve';
  const T = (x, y) => [xs + x * c - y * s, ys + x * s + y * c];
  const pravokutnik = (x0, x1, y0, y1, razina) => { const v = [T(x1, y0), T(x1, y1), T(x0, y1), T(x0, y0)]; return [0, 1, 2, 3].map((k) => ({ tip: 'seg', a: v[k], b: v[(k + 1) % 4], razina })); };
  const out = [];
  if (za !== 'laser') out.push(...pravokutnik(-S0.dubina, 0, -S0.sirina / 2, S0.sirina / 2, 'tijelo'));
  if (za === 'sve' || za === 'laser') {
    const rm = S0.razmakMarkera / 2, km = S0.kameraMarker;
    /* „lijevi” = lijevo gledano s robota koji prilazi = −y stanice */
    [-rm, rm].forEach((y, k) => out.push({ tip: 'krug', c: T(S0.marker.x, y), r: 0.012, razina: 'marker', reflektor: k ? 'desni' : 'lijevi' }));
    out.push(...pravokutnik(km.x - km.dubina / 2, km.x + km.dubina / 2, km.y - km.sirina / 2, km.y + km.sirina / 2, 'marker'));
  }
  return out;
}
