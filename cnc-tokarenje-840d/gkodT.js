/* FORTRONIQ · CNC tokarenje, SINUMERIK 840D — G-kod za tokarilicu: rastavljanje bloka i objašnjenje bloka na hrvatskom.
   X je promjer; posmak je u mm po okretaju (G95), osim uz G94.  © ForTroniQ d.o.o. */

const kr = (v) => { const s = (Math.round(v * 1000) / 1000).toString(); return s.replace('.', ',').replace('-', '−'); };

export function ocisti(red) {
  let s = String(red || ''); let kom = '';
  const k = s.indexOf(';'); if (k >= 0) { kom = s.slice(k + 1).trim(); s = s.slice(0, k); }
  return { kod: s.trim().toUpperCase(), kom };
}
/* w: adrese (G i M kao nizovi), ciklus: { ime, arg[] }, poziv: ime potprograma bez zagrada (npr. TCP), lims */
export function razlozi(red) {
  const { kod, kom } = ocisti(red);
  const w = { G: [], M: [] }; let ciklus = null, poziv = null;
  const c = kod.match(/^(?:N\d+\s+)?(CYCLE\d+)\s*\(([^)]*)\)/);
  if (c) ciklus = { ime: c[1], arg: c[2].split(',').map((q) => (q.trim() === '' ? null : parseFloat(q))) };
  else {
    const b = kod.replace(/^N\d+\s+/, '');
    if (/^[A-Z_][A-Z_0-9]{2,}$/.test(b) && !/^[GMXZIKFSTDN]\d/.test(b)) poziv = b;
    const l = kod.match(/LIMS\s*=\s*([-+]?\d*\.?\d+)/); if (l) w.LIMS = parseFloat(l[1]);
    const re = /(?:^|[^A-Z])([A-Z])\s*([-+]?\d*\.?\d+)/g; let m;
    const bez = kod.replace(/LIMS\s*=\s*[-+]?\d*\.?\d+/, ' ');
    while ((m = re.exec(bez))) { const a = m[1], v = parseFloat(m[2]); if (a === 'G' || a === 'M') w[a].push(v); else w[a] = v; }
  }
  return { kod, kom, w, ciklus, poziv };
}

const GOPIS = {
  4: 'zastoj (G4)', 17: 'ravnina XY (G17) — čelna obrada pogonjenim alatom', 18: 'ravnina ZX (G18) — uobičajeno tokarenje', 19: 'ravnina YZ (G19) — obodna obrada pogonjenim alatom',
  40: 'korekcija polumjera oštrice isključena (G40)', 41: 'korekcija polumjera oštrice, alat lijevo od konture (G41)', 42: 'korekcija polumjera oštrice, alat desno od konture (G42)',
  53: 'koordinate stroja samo u ovom bloku (G53)', 54: 'pomak nultočke G54 — vrijede koordinate obratka', 500: 'pomak nultočke isključen (G500)',
  70: 'mjere u inčima (G70)', 71: 'mjere u milimetrima (G71)', 90: 'apsolutne mjere (G90) — od nultočke obratka', 91: 'inkrementalne mjere (G91) — od trenutnog položaja',
  94: 'posmak u mm/min (G94)', 95: 'posmak u mm po okretaju (G95)', 96: 'stalna brzina rezanja (G96) — brzina vrtnje mijenja se s promjerom', 97: 'stalna brzina vrtnje (G97)'
};
const MOPIS = { 0: 'programirano zaustavljanje (M0)', 1: 'zaustavljanje po izboru (M1)', 2: 'kraj programa (M2)', 3: 'vreteno se vrti desno (M3)', 4: 'vreteno se vrti lijevo (M4)',
  5: 'vreteno stoji (M5)', 8: 'rashladno sredstvo uključeno (M8)', 9: 'rashladno sredstvo isključeno (M9)', 30: 'kraj programa s povratkom na početak (M30)' };

/* stanje: { abs, g, F, S, T, x, z, g96, g95 } — stanje prije bloka (koordinate obratka, x kao promjer) */
export function objasni(red, stanje = {}) {
  const s = Object.assign({ abs: true, g: 0, F: 0, S: 0, T: 0, x: 0, z: 0, g96: false, g95: true }, stanje);
  const { kod, kom, w, ciklus, poziv } = razlozi(red);
  if (!kod) return { tekst: kom ? 'Komentar: „' + kom + '” — upravljanje ga ne izvodi.' : 'Prazan redak.', stanje: s };
  if (ciklus) {
    const v = ciklus.arg;
    if (ciklus.ime === 'CYCLE93') {
      return { tekst: 'Ciklus usijecanja CYCLE93: utor na promjeru Ø' + kr(v[0]) + ' od Z' + kr(v[1]) + ', širina ' + kr(v[2]) + ' mm, dubina ' + kr(v[3]) + ' mm, kutovi bokova ' + kr(v[5]) + '° i ' + kr(v[6]) +
        '°, prijelazi na bridovima ' + kr(v[7]) + ' mm, dostava ' + kr(v[13]) + ' mm po ubodu. Ciklus sam izračuna sve ubode i završni prolaz po bokovima.', stanje: s };
    }
    return { tekst: 'Poziv ciklusa ' + ciklus.ime + ' s parametrima (' + v.map((x) => (x === null ? '' : kr(x))).join(', ') + ').', stanje: s };
  }
  if (poziv === 'TCP') return { tekst: 'Poziv potprograma TCP (točka izmjene alata) — na ovom stroju brzim hodom odmiče revolver najprije u X, zatim u Z, da se može sigurno zakrenuti.' + (kom ? ' Komentar: „' + kom + '”.' : ''), stanje: s };
  if (poziv) return { tekst: 'Poziv potprograma ' + poziv + '.', stanje: s };
  const dijelovi = [];
  if (w.N !== undefined) dijelovi.push('blok N' + w.N);
  const gs = w.G.slice();
  gs.forEach((g) => { if (g === 90) s.abs = true; if (g === 91) s.abs = false; if (g === 96) s.g96 = true; if (g === 97) s.g96 = false; if (g === 95) s.g95 = true; if (g === 94) s.g95 = false; });
  const gibanje = gs.find((g) => [0, 1, 2, 3, 33].includes(g));
  if (gibanje !== undefined) s.g = gibanje;
  gs.filter((g) => ![0, 1, 2, 3, 33].includes(g)).forEach((g) => dijelovi.push(GOPIS[g] || 'funkcija G' + g));
  if (w.LIMS !== undefined) dijelovi.push('najveća brzina vrtnje ograničena na ' + kr(w.LIMS) + ' o/min (LIMS) — važno uz G96, jer bi se pri malom promjeru vreteno vrtjelo prebrzo');
  if (w.T !== undefined) { s.T = w.T; dijelovi.push('revolver se zakreće: alat T' + w.T + ' dolazi u radni položaj'); }
  if (w.D !== undefined) dijelovi.push('korekcijski zapis D' + w.D);
  if (w.S !== undefined) { s.S = w.S; dijelovi.push(s.g96 ? 'brzina rezanja ' + kr(w.S) + ' m/min (S uz G96)' : 'brzina vrtnje ' + kr(w.S) + ' o/min'); }
  const imaGib = w.X !== undefined || w.Z !== undefined;
  const jed = s.g95 ? ' mm/okr' : ' mm/min';
  if (w.F !== undefined) { s.F = w.F; if (!imaGib) dijelovi.push('posmak ' + kr(w.F) + jed); }
  w.M.forEach((m) => dijelovi.push(MOPIS[m] || 'pomoćna funkcija M' + m));
  if (imaGib) {
    const pre = { x: s.x, z: s.z };
    const n = { x: w.X === undefined ? pre.x : s.abs ? w.X : pre.x + w.X, z: w.Z === undefined ? pre.z : s.abs ? w.Z : pre.z + w.Z };
    const cilj = (w.X !== undefined ? 'X' + kr(n.x) + ' (Ø ' + kr(Math.abs(n.x)) + ')' : '') + (w.X !== undefined && w.Z !== undefined ? ' ' : '') + (w.Z !== undefined ? 'Z' + kr(n.z) : '');
    const GIB = { 0: 'brzi hod (G0)', 1: 'pravocrtno gibanje posmakom (G1)', 2: 'kružno gibanje u smjeru kazaljke na satu (G2)', 3: 'kružno gibanje suprotno od kazaljke na satu (G3)', 33: 'rezanje navoja (G33)' };
    let t = (GIB[s.g] || 'gibanje') + ' do ' + cilj + (s.abs ? '' : ' (inkrementalno)') + (s.g === 0 ? ' — bez rezanja' : '');
    if (s.g === 33) t += ', uspon navoja K = ' + kr(w.K || 0) + ' mm — posmak je vezan uz okretaj vretena, korekcije posmaka ne djeluju';
    else if (s.g >= 1 && s.g <= 3) t += s.F ? ', posmak ' + kr(s.F) + jed : ' — POZOR: posmak F nije zadan';
    if (s.g === 2 || s.g === 3) {
      if (w.CR !== undefined) t += ', polumjer ' + kr(w.CR) + ' mm';
      else { const cz = pre.z + (w.K || 0), cx = pre.x / 2 + (w.I || 0); t += ', središte I' + kr(w.I || 0) + ' K' + kr(w.K || 0) + ' od početne točke → Z' + kr(cz) + ', polumjer ' + kr(Math.hypot(pre.z - cz, pre.x / 2 - cx)) + ' mm'; }
    }
    if (s.g === 1 && w.X !== undefined && w.Z === undefined) t += n.x < pre.x ? ' — poprečno prema osi (čelo ili ubod)' : ' — odmak od osi';
    else if (s.g === 1 && w.Z !== undefined && w.X === undefined) t += n.z < pre.z ? ' — uzdužno tokarenje prema steznoj glavi' : ' — povratak uzdužno';
    if (n.x < 0 && s.g === 1) t += '; X je negativan da vrh oštrice s polumjerom prijeđe os i ne ostavi čepić';
    dijelovi.push(t);
    s.x = n.x; s.z = n.z;
  }
  if (gibanje !== undefined && !imaGib) dijelovi.push('način gibanja G' + gibanje + ' postaje aktivan (modalno) — u ovom bloku nema gibanja');
  const tekst = dijelovi.length ? dijelovi.join('; ') + '.' : 'Blok bez naredbe koju simulator objašnjava.';
  return { tekst: tekst.charAt(0).toUpperCase() + tekst.slice(1) + (kom ? ' Komentar: „' + kom + '”.' : ''), stanje: s };
}
