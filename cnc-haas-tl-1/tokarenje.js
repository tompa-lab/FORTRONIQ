/* FORTRONIQ · Haas TL-1 — jezgra tokarenja: obradak kao 2D mreža (z uzduž osi, r polumjer) u poluravnini,
   skidanje materijala alatom (vanjski nož, odrezivač, svrdlo, unutarnji nož, nož za navoj), sudari s držačem i steznom glavom,
   mreža → LatheGeometry (rotacijsko tijelo) za three.js.  Koordinate: x = os Z stroja (čelo stezne glave na 0, + prema konjiću),
   r = polumjer od osi vretena.  © ForTroniQ d.o.o. */

export const ALATI_TL = {
  1: { naziv: 'vanjski nož, desni (pločica 80°, r 0,8)', vrsta: 'vanjski', dx: 0, dr: 0 },
  2: { naziv: 'odrezivač / utorni nož 3 mm', vrsta: 'odrezivac', sirina: 3, dx: 8, dr: 0.3 },
  3: { naziv: 'svrdlo Ø12 mm (u nosaču alata, na osi)', vrsta: 'svrdlo', d: 12, dx: -30, dr: 0 },
  4: { naziv: 'nož za navoj 60°', vrsta: 'navoj', dx: -4, dr: 0.2 },
  5: { naziv: 'unutarnji nož (bušna motka Ø16)', vrsta: 'unutarnji', dx: -40, dr: -0.5 }
};

/* obradak: pripremak Ø D, duljina L, od toga `drz` mm u čeljustima; mreža korak k (mm) */
export function napraviObradak(THREE, grupa, { D, L, drz = 25, k = 0.25, boja = 0xc9ccd0, provrt = 0 }) {
  const R = D / 2, x0 = -drz, x1 = L - drz;
  const nx = Math.round((x1 - x0) / k), nr = Math.round(R / k);
  const cel = new Uint8Array(nx * nr);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nr; j++) cel[i * nr + j] = (j * k >= provrt / 2) ? 1 : 0;
  const O = { D, L, R, drz, x0, x1, k, nx, nr, cel, prljavo: true, mesh: null, odrezan: null, navoji: [], boja: new THREE.Color(boja), bojaR: new THREE.Color(0x8e9398) };
  const mat = new THREE.MeshStandardMaterial({ color: boja, metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide });
  O.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); O.mesh.userData.dio = 'obradak'; grupa.add(O.mesh);
  O.navojMesh = new THREE.Group(); grupa.add(O.navojMesh);
  osvjezi(THREE, O);
  return O;
}
export function ukloniObradak(O, grupa) { if (!O) return; grupa.remove(O.mesh); O.mesh.geometry.dispose(); grupa.remove(O.navojMesh); }

const idx = (O, i, j) => i * O.nr + j;
export function rVanjski(O, i) { for (let j = O.nr - 1; j >= 0; j--) if (O.cel[idx(O, i, j)]) return (j + 1) * O.k; return 0; }
export function rUnutarnji(O, i) { for (let j = 0; j < O.nr; j++) if (O.cel[idx(O, i, j)]) return j * O.k; return 0; }
export function stupacPrazan(O, i) { for (let j = 0; j < O.nr; j++) if (O.cel[idx(O, i, j)]) return false; return true; }
/* polumjer obratka na položaju x (mm), 0 ako nema materijala */
export function polumjerNa(O, x) { const i = Math.round((x - O.x0) / O.k); if (i < 0 || i >= O.nx) return 0; return rVanjski(O, i); }
/* čelo: najveći x s materijalom */
export function celo(O) { for (let i = O.nx - 1; i >= 0; i--) if (!stupacPrazan(O, i)) return O.x0 + (i + 1) * O.k; return O.x0; }

/* --- skidanje materijala -------------------------------------------------------------------------------
   alat: { vrsta, sirina, d }, vrh (xt, rt) u koordinatama obratka; vraća { skinuto (broj ćelija), sudar (tekst|null) } */
export function rezi(O, alat, xt, rt, opcije = {}) {
  const k = O.k, v = alat.vrsta, dry = !!opcije.dry; let skinuto = 0, sudar = null, drzac = 0;
  if (xt > O.x1 + 1 || (v !== 'odrezivac' && v !== 'vanjski' && v !== 'navoj' ? false : rt > O.R + 1)) return { skinuto: 0, sudar: null };
  const i0 = Math.max(0, Math.floor((xt - O.x0) / k) - 1);
  const ukloni = (i, j) => { const q = idx(O, i, j); if (O.cel[q]) { if (!dry) O.cel[q] = 0; skinuto++; } };
  if (v === 'vanjski' || v === 'navoj') {
    /* režuća zona: x ≥ xt, r ≥ rt; držač: x ≥ xt + 6 i r ≥ rt + 6 (ako tamo ima materijala → sudar držača) */
    const j0 = Math.max(0, Math.floor(rt / k));
    for (let i = i0; i < O.nx; i++) { const x = O.x0 + i * k + k / 2; if (x < xt) continue;
      for (let j = j0; j < O.nr; j++) { const r = j * k + k / 2; if (r < rt) continue; const q = idx(O, i, j); if (!O.cel[q]) continue;
        if (x > xt + 6 && r > rt + 6) drzac++; if (!dry) O.cel[q] = 0; skinuto++; } }
    if (drzac > 4) sudar = 'drzac';
  } else if (v === 'odrezivac') {
    const w = alat.sirina || 3, j0 = Math.max(0, Math.floor(rt / k));
    for (let i = i0; i < O.nx; i++) { const x = O.x0 + i * k + k / 2; if (x < xt || x > xt + w) continue; for (let j = j0; j < O.nr; j++) { const r = j * k + k / 2; if (r >= rt) ukloni(i, j); } }
    /* držač odrezivača (širi od lista) iznad lista: materijal na r > rt + 22 u blizini reza → sudar */
    for (let i = Math.max(0, Math.floor((xt - 25 - O.x0) / k)); i < O.nx; i++) { const x = O.x0 + i * k + k / 2; if (x > xt + w + 25) break;
      for (let j = Math.max(0, Math.floor((rt + 22) / k)); j < O.nr; j++) { if (O.cel[idx(O, i, j)]) { drzac++; } } }
    if (drzac > 4) sudar = 'drzac';
  } else if (v === 'svrdlo') {
    const rd = (alat.d || 12) / 2;
    if (Math.abs(rt) > 0.15) { /* svrdlo izvan osi: ako ulazi u materijal → sudar */
      for (let i = i0; i < O.nx; i++) { const x = O.x0 + i * k + k / 2; if (x < xt || x > xt + 2) continue; for (let j = 0; j < O.nr; j++) { const r = j * k; if (Math.abs(r - rt) <= rd && O.cel[idx(O, i, j)]) { sudar = 'svrdloOs'; break; } } if (sudar) break; }
      return { skinuto: 0, sudar };
    }
    const vrh = rd / Math.tan(59 * Math.PI / 180);                                     /* visina šiljka 118° */
    for (let i = i0; i < O.nx; i++) { const x = O.x0 + i * k + k / 2; if (x < xt) continue;
      const rmax = x < xt + vrh ? rd * (x - xt) / vrh : rd;
      for (let j = 0; j < O.nr; j++) { const r = j * k + k / 2; if (r <= rmax) ukloni(i, j); else break; } }
  } else if (v === 'unutarnji') {
    for (let i = i0; i < O.nx; i++) { const x = O.x0 + i * k + k / 2; if (x < xt) continue;
      for (let j = 0; j < O.nr; j++) { const r = j * k + k / 2; if (r > rt) break; const q = idx(O, i, j); if (!O.cel[q]) continue; if (x > xt + 6 && r < rt - 7) drzac++; if (!dry) O.cel[q] = 0; skinuto++; } }
    if (drzac > 4) sudar = 'drzac';
  }
  if (skinuto && !dry) O.prljavo = true;
  return { skinuto, sudar };
}
/* provjera je li alat u materijalu bez rezanja (vreteno stoji / brzi hod): broj ćelija koje bi se skinule */
export function uMaterijalu(O, alat, xt, rt) { return rezi(O, alat, xt, rt, { dry: true }).skinuto; }
/* navoj: V-žljebovi na koraku p između x0 i x1, dubina do polumjera rt (prikaz prstenima umjesto zavojnice) */
export function urezNavoj(O, xA, xB, p, rt) {
  const k = O.k, t30 = Math.tan(Math.PI / 6); const xa = Math.min(xA, xB), xb = Math.max(xA, xB);
  for (let xc = xb; xc >= xa - 1e-6; xc -= p) {
    for (let i = Math.max(0, Math.floor((xc - p - O.x0) / k)); i < O.nx; i++) { const x = O.x0 + i * k + k / 2; if (x > xc + p) break;
      for (let j = Math.max(0, Math.floor(rt / k)); j < O.nr; j++) { const r = j * k + k / 2; if (r < rt) continue; if (Math.abs(x - xc) <= (r - rt) * t30 + k / 2) { const q = idx(O, i, j); if (O.cel[q]) { O.cel[q] = 0; } } } }
  }
  O.prljavo = true;
}
/* odrezivanje: ako je neki stupac desno od čeljusti prazan, dio desno od njega otpada */
export function provjeriOdrez(O) {
  const iC = Math.max(0, Math.round((0 - O.x0) / k0(O)) + 1);
  for (let i = iC; i < O.nx; i++) if (stupacPrazan(O, i)) {
    let ima = false; for (let q = i + 1; q < O.nx; q++) if (!stupacPrazan(O, q)) { ima = true; break; }
    if (!ima) return null;
    const dio = { i0: i + 1, x0: O.x0 + (i + 1) * O.k, x1: celo(O) };
    for (let q = i + 1; q < O.nx; q++) for (let j = 0; j < O.nr; j++) O.cel[idx(O, q, j)] = 0;
    O.prljavo = true; O.odrezan = dio; return dio;
  }
  return null;
}
const k0 = (O) => O.k;

/* --- mreža → rotacijsko tijelo ---------------------------------------------------------------------- */
export function osvjezi(THREE, O) {
  if (!O.prljavo) return; O.prljavo = false;
  let iA = -1, iB = -1; for (let i = 0; i < O.nx; i++) if (!stupacPrazan(O, i)) { if (iA < 0) iA = i; iB = i; }
  const g = O.mesh.geometry; O.mesh.geometry = new THREE.BufferGeometry(); g.dispose();
  if (iA < 0) return;
  const pts = []; const push = (r, x) => { const p = pts[pts.length - 1]; if (!p || Math.abs(p.x - r) > 1e-6 || Math.abs(p.y - x) > 1e-6) pts.push(new THREE.Vector2(r, x)); };
  /* vanjski profil od lijevog kraja (u čeljustima) do čela, desno čelo, unutarnji profil natrag, lijevo čelo */
  let rp = -1;
  for (let i = iA; i <= iB; i++) { const r = rVanjski(O, i), xa = O.x0 + i * O.k, xb = xa + O.k; if (Math.abs(r - rp) > 1e-6) { if (rp >= 0) push(rp, xa); push(r, xa); rp = r; } if (i === iB) push(r, xb); }
  const xb = O.x0 + (iB + 1) * O.k; let ri = rUnutarnji(O, iB); push(ri, xb); rp = ri;
  for (let i = iB; i >= iA; i--) { const r = rUnutarnji(O, i), xa = O.x0 + i * O.k, xbb = xa + O.k; if (Math.abs(r - rp) > 1e-6) { push(rp, xbb); push(r, xbb); rp = r; } if (i === iA) push(r, xa); }
  push(rVanjski(O, iA), O.x0 + iA * O.k);
  const geo = new THREE.LatheGeometry(pts, 64); geo.rotateZ(-Math.PI / 2);     /* os Y → os X svijeta */
  geo.computeVertexNormals(); O.mesh.geometry = geo;
}
