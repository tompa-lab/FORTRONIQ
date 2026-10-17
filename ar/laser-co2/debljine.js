// FORTRONIQ · CO₂ laser · debljine ploča 0,5–3 mm i parametri rezanja
// Sidra su iz Tomislavovih programa (LaserCut 5.3, .INI); sve ostale debljine su PROCJENA:
// potrebna energija po milimetru reza (snaga / brzina) raste razmjerno debljini,
// pa se uz istu snagu brzina mijenja obrnuto razmjerno debljini. Kad bi brzina prešla V_MAX,
// brzina ostaje V_MAX, a snaga se smanji (ne ispod P_MIN).
export const DEBLJINE = [0.5, 1, 1.5, 2, 2.5, 3];
export const V_MAX = 100;  // mm/s — najveća brzina reza u tvojim programima (karton)
export const P_MIN = 15;   // % — najmanja snaga reza u tvojim programima
export const P_MAX = 85;   // %

// t: tvoje izmjerene točke (debljina iz imena programa); izvor se navodi na stranici
export const VRSTE = {
  karton: { naziv: 'Karton', opis: 'valoviti karton i ljepenka', tocke: [{ T: 3, p: 65, v: 50, izvor: 'program 265X50MMPIZZA4 (karton 3 mm)' }],
    boja2d: '#C9A46E', rezKroz: '#2a1a0a', rezPola: '#8a6236', dxfBoja: 7 },
  sper: { naziv: 'Šperploča', opis: 'topola, breza', tocke: [{ T: 3, p: 70, v: 12, izvor: 'program Stalak za 6 satova (šperploča 3 mm)' }, { T: 4, p: 75, v: 10, izvor: 'program Kućica za lutke (šperploča 4 mm)' }, { T: 6, p: 80, v: 8, izvor: 'program Šperploča 6 mm topola' }],
    boja2d: '#E6CFA3', zrnato: true, rezKroz: '#1b0f06', rezPola: '#7a5230' },
  pleksi: { naziv: 'Pleksiglas', opis: 'lijevani akril (PMMA)', tocke: [{ T: 3, p: 60, v: 15, izvor: 'program Stalak 3 mm (pleksi)' }],
    boja2d: '#CFE8EF', proziran: true, rezKroz: '#f4fbfd', rezPola: '#a9cfda' },
  mdf: { naziv: 'Mediapan (MDF)', opis: 'ispod 2 mm rijetko se proizvodi', tocke: [{ T: 7, p: 75, v: 5, izvor: 'program Stalak za slike (MDF 7 mm)' }],
    boja2d: '#BE9A6E', rezKroz: '#120a04', rezPola: '#6b4423' },
  drvo: { naziv: 'Drvo (masiv)', opis: 'furnir i letvice', tocke: [{ T: 6, p: 70, v: 8.5, izvor: 'tvoja testiranja DRVO6MM: 70 %, 7–10 mm/s' }],
    boja2d: '#D7B47E', zrnato: true, rezKroz: '#1b0f06', rezPola: '#7a5230' }
};

const r1 = x => Math.round(x * 10) / 10;
export const kljuc = (vrsta, T) => vrsta + String(T).replace('.', '_');
export const fmtT = T => String(T).replace('.', ',');

// parametri rezanja za vrstu i debljinu; procjena = true ako debljina nije iz tvog programa
export function parametri(vrsta, T) {
  const V = VRSTE[vrsta]; if (!V) return null;
  const tocna = V.tocke.find(t => Math.abs(t.T - T) < 1e-6);
  if (tocna) return { T, p: tocna.p, v: tocna.v, izvor: tocna.izvor, procjena: false };
  const ref = V.tocke.reduce((a, b) => Math.abs(b.T - T) < Math.abs(a.T - T) ? b : a); // najbliža izmjerena debljina
  let v = ref.v * ref.T / T, p = ref.p;
  if (v > V_MAX) { p = ref.p * (T / ref.T) * (V_MAX / ref.v); v = V_MAX; }
  p = Math.max(P_MIN, Math.min(P_MAX, Math.round(p)));
  return { T, p, v: r1(v), izvor: `procjena iz ${fmtT(ref.T)} mm (${ref.p} % / ${ref.v} mm/s)`, procjena: true };
}

// svi materijali za simulator: ključ → { naziv, T, p, v, izvor, … }
export function materijali(dodatno = []) {
  const M = {};
  const dodaj = (vrsta, T) => {
    const V = VRSTE[vrsta], q = parametri(vrsta, T);
    M[kljuc(vrsta, T)] = { vrsta, naziv: `${V.naziv} ${fmtT(T)} mm`, T, p: q.p, v: q.v, izvor: q.izvor, procjena: q.procjena,
      boja2d: V.boja2d, zrnato: V.zrnato, proziran: V.proziran, rezKroz: V.rezKroz, rezPola: V.rezPola };
  };
  for (const vrsta of Object.keys(VRSTE)) for (const T of DEBLJINE) dodaj(vrsta, T);
  for (const [vrsta, T] of dodatno) if (!M[kljuc(vrsta, T)]) dodaj(vrsta, T);
  return M;
}

// tablica za ispis: [{vrsta, naziv, redovi:[{T,p,v,procjena,izvor}]}]
export function tablica() {
  return Object.entries(VRSTE).map(([vrsta, V]) => ({ vrsta, naziv: V.naziv, opis: V.opis, redovi: DEBLJINE.map(T => parametri(vrsta, T)) }));
}
