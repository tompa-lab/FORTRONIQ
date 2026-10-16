// FORTRONIQ · CO₂ laser · simulator strojeva G.Weike LG500DM i LC1390N
// Povezuje: 3D stroj, upravljačko polje s pločom PAD03 (kontroler MPC6565) i prozor programa LaserCut 5.3.
import { Stroj3D } from './stroj3d.js';
import { Kontroler } from './kontroler.js';
import { LaserCut } from './lc-prozor.js';
import { zadaniWorktable, citajDXF, leca, prorez, vrijeme, imeBoje } from './lc-jezgra.js';

const $ = s => document.querySelector(s);
const fmt = (v, d = 1) => Number(v).toLocaleString('hr-HR', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── strojevi (činjenice iz ponude, fotografija i videa; procjene označene) ──
const STROJEVI = {
  LG500DM: { naziv: 'G.Weike LG500DM', radno: '500 × 300 mm', snaga: 60, cijev: 'EFR 60 W', zOs: false, Imax: 20, hladnjak: 'CW3000', yTrans: 45.501, xTrans: 24 },
  LC1390N: { naziv: 'G.Weike LC1390N', radno: '1300 × 900 mm', snaga: 100, cijev: 'CO₂ 100 W', zOs: true, Imax: 28, hladnjak: 'CW-5000', yTrans: 31.75, xTrans: 31.75 }
};
const Y_ROT = 80; // Move osi Y kad je spojen rotacijski dodatak (Tomislav: 45.501 ↔ 80)
// materijali: preporuke iz Tomislavovih poslova (medijan) i programa kutije; debljina je zadana u simulatoru
const MATERIJALI = {
  karton3: { naziv: 'Karton 3 mm (valoviti)', T: 3, p: 65, v: 50, izvor: 'program 265X50MMPIZZA4', boja2d: '#C9A46E', rezKroz: '#2a1a0a', rezPola: '#8a6236' },
  sper3: { naziv: 'Šperploča 3 mm', T: 3, p: 75, v: 8, izvor: 'medijan tvojih poslova (šperploča)', boja2d: '#E6CFA3', zrnato: true, rezKroz: '#1b0f06', rezPola: '#7a5230' },
  sper4: { naziv: 'Šperploča 4 mm', T: 4, p: 75, v: 6, izvor: 'primjer Svjetionik', boja2d: '#D9BC8A', zrnato: true, rezKroz: '#1b0f06', rezPola: '#7a5230' },
  mdf3: { naziv: 'Mediapan (MDF) 3 mm', T: 3, p: 75, v: 5, izvor: 'medijan tvojih poslova (MDF)', boja2d: '#BE9A6E', rezKroz: '#120a04', rezPola: '#6b4423' },
  mdf6: { naziv: 'Mediapan (MDF) 6 mm', T: 6, p: 75, v: 5, izvor: 'primjer Svjetionik', boja2d: '#B8946A', rezKroz: '#120a04', rezPola: '#6b4423' },
  drvo6: { naziv: 'Drvo 6 mm', T: 6, p: 70, v: 8.5, izvor: 'tvoja testiranja: 70 %, 7–10 mm/s', boja2d: '#D7B47E', zrnato: true, rezKroz: '#1b0f06', rezPola: '#7a5230' },
  pleksi3: { naziv: 'Pleksiglas 3 mm', T: 3, p: 65, v: 22, izvor: 'medijan tvojih poslova (pleksi)', boja2d: '#CFE8EF', proziran: true, rezKroz: '#f4fbfd', rezPola: '#a9cfda' }
};
const GRAVURA = { drvo: [30, 600], staklo: [50, 600], kamen: [25, 600] }; // %, mm/s (medijani graviranja)
const LECE = [[38.1, '1,5″ (38,1 mm)', 2], [50.8, '2″ (50,8 mm)', 5], [63.5, '2,5″ (63,5 mm)', 9], [101.6, '4″ (101,6 mm)', 25]]; // f, naziv, razmak žarišta ispod mlaznice (procjena)

// ── primjeri za Import ──
const PRIMJERI = [
  { id: 'kutija265', naziv: 'Kutija za sat 265 × 265 × 50 (karton)' },
  { id: 'kutija300', naziv: 'Kutija za sat Ø 300 (karton)' },
  { id: 'pizza32', naziv: 'Kutija za pizzu 32 cm (karton)' },
  { id: 'matrica', naziv: 'Testna matrica brzina × snaga (9 boja)' },
  { id: 'kucica-0', naziv: 'Kućica — prizemlje' }, { id: 'kucica-1', naziv: 'Kućica — potkrovlje' }, { id: 'kucica-2', naziv: 'Kućica — ljestve, nosači, kapci' },
  { id: 'pcela-0', naziv: 'Pčela (rez i brojevi utora)' },
  ...[0, 1, 2, 3, 4, 5].map(i => ({ id: 'svjetionik-' + i, naziv: 'Svjetionik — ploča ' + (i + 1) })),
  ...[0, 1, 2, 3, 4, 5].map(i => ({ id: 'sjenica-' + i, naziv: 'Sjenica — ploča ' + (i + 1) }))
];
const PRIMJER_PODACI = {};
function ucitajSkriptu(ime) {
  if (PRIMJER_PODACI[ime]) return Promise.resolve(PRIMJER_PODACI[ime]);
  return new Promise((ok, ne) => {
    const staro = window.PRIMJER; const s = document.createElement('script'); s.src = ime + '.js?v=01';
    s.onload = () => { PRIMJER_PODACI[ime] = window.PRIMJER; window.PRIMJER = staro; s.remove(); ok(PRIMJER_PODACI[ime]); };
    s.onerror = () => { s.remove(); ne(new Error('nije moguće učitati ' + ime + '.js')); };
    document.head.append(s);
  });
}
async function ucitajPrimjer(id) {
  if (id.startsWith('kutija') || id === 'pizza32') {
    const K = await import('../cad-modeliranje/kutija.js?v=01');
    const p = Object.assign({}, K.ZADANO, { kutija265: {}, kutija300: { L: 318, D: 318, prozor: 240, sat: 300 }, pizza32: { L: 340, D: 340, H: 42, prozor: 0, drzaci: 0, sat: 0 } }[id]);
    const k = K.izracun(p), d = citajDXF(K.dxf(k));
    const sl = [7, 3, 4, 6, 5].map(a => ({ aci: a, mod: 'Cut', v: 50, p: 65, kp: 60, n: 1 }));
    return { objekti: d.objekti, ime: id === 'pizza32' ? 'PIZZA32' : 'KUT' + p.L, slojevi: sl, materijal: 'karton3', opis: `DXF iz simulatora CAD modeliranja (Sheet Metal): ${d.objekti.length} linija na 5 slojeva. Slojevi su poredani kako se režu: od dna popisa prema vrhu — unutarnji rezovi, držači, prozor, perforacija, a kontura zadnja. Linije spoji (Unite lines).` };
  }
  if (id === 'matrica') {
    const ob = [], sl = [], boje = [5, 1, 3, 2, 6, 4, 30, 8, 7], v = [5, 8, 12], p = [60, 70, 80];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const a = boje[r * 3 + c], x = c * 30, y = (2 - r) * 30; ob.push({ pts: [[x, y], [x + 25, y], [x + 25, y + 25], [x, y + 25], [x, y]], zatv: true, aci: a }); sl.push({ aci: a, mod: 'Cut', v: v[c], p: p[r], kp: Math.round(p[r] * 0.8), n: 1 }); }
    return { objekti: ob, ime: 'MATRICA', slojevi: sl, materijal: 'sper3', opis: 'Devet kvadrata 25 × 25 mm, svaki na svom sloju (boji): stupci brzina 5 / 8 / 12 mm/s, retci snaga 60 / 70 / 80 % (prijedlog). Nakon rezanja vidiš koji kvadrati su ispali — tako se traže parametri za novi materijal.' };
  }
  const [ime, br] = id.split('-'); const PR = await ucitajSkriptu(ime); const pi = +br;
  const pl = PR.ploce[pi], ob = [];
  for (const d of PR.dijelovi) {
    if (d.ploca !== pi) continue;
    const pom = q => [q[0] + d.cx, q[1] + d.cy];
    for (const r of d.rupe) ob.push({ pts: [...r.map(pom), pom(r[0])], zatv: true, aci: 5 });
    const mt = PR.materijali[d.mat]; ob.push({ pts: [...d.obris.map(pom), pom(d.obris[0])], zatv: true, aci: mt.dxfBoja || 7 });
  }
  for (const g of (PR.gravura || [])) if (g.ploca === pi) ob.push({ pts: g.tocke.map(q => [q[0], q[1]]), zatv: false, aci: 1 });
  const mat = PR.materijali[PR.dijelovi.find(d => d.ploca === pi)?.mat || Object.keys(PR.materijali)[0]];
  const mk = { 3: 'sper3', 4: 'sper4', 6: 'mdf6' }[mat.T] || 'sper3';
  const M = MATERIJALI[mk];
  const sl = [{ aci: mat.dxfBoja || 7, mod: 'Cut', v: M.v, p: M.p, kp: Math.round(M.p * 0.8), n: 1 }, { aci: 5, mod: 'Cut', v: M.v, p: M.p, kp: Math.round(M.p * 0.8), n: 1 }];
  if (PR.gravura) sl.push({ aci: 1, mod: 'Cut', v: 100, p: 15, kp: 12, n: 1 });
  return { objekti: ob, ime: (ime.slice(0, 5) + (pi + 1)).toUpperCase(), slojevi: sl, materijal: mk, opis: `${pl.naziv}: ${ob.length} obrisa. Plavo = rupe i utori (režu se prvi), ${mat.dxfBoja === 7 ? 'crno' : 'boja materijala'} = vanjski obris${PR.gravura ? ', crveno = brojevi utora (označavanje niskom snagom, prijedlog)' : ''}.` };
}

// ── stanje ──
const S = {
  tip: 'LC1390N', rot: false, rotD: 80, mat: 'sper3', leca: 50.8, fokusU: 0,
  hladnjak: false, odsis: false, zrak: false, poklopac: false, svjetlo: false, kljuc: false, gljiva: false, zelena: false,
  ubrzanje: 10, Z: { LG500DM: 0, LC1390N: 110 }, rucniFokus: 4,
  wt: { LG500DM: zadaniWorktable('LG500DM'), LC1390N: zadaniWorktable('LC1390N') },
  autofokus: null, vodic: {}
};
const dnevnikEl = $('#dnevnik');
function dnevnik(t, vrsta = '') {
  const li = document.createElement('li'); if (vrsta) li.className = vrsta;
  const sad = new Date(); li.innerHTML = `<time>${String(sad.getHours()).padStart(2, '0')}:${String(sad.getMinutes()).padStart(2, '0')}:${String(sad.getSeconds()).padStart(2, '0')}</time> `; li.append(t);
  dnevnikEl.prepend(li); while (dnevnikEl.children.length > 80) dnevnikEl.lastChild.remove();
}
const stroj = () => STROJEVI[S.tip];
const wt = () => S.wt[S.tip];
const d3 = new Stroj3D($('#scena')); $('#ucitavanje')?.remove();

const kontroleri = {};
for (const t of Object.keys(STROJEVI)) {
  kontroleri[t] = new Kontroler({
    wt: () => S.wt[t], stroj: () => STROJEVI[t], dnevnik, promjena: () => { osvjeziPad(); vodic(); },
    pomakniZ: dz => pomakniZ(dz), autofokus: () => autofokus(),
    provjeraPrijeStarta: d => provjeraPrijeStarta(d), gotovo: () => { S.vodic.gotovo = true; vodic(); }
  });
}
const K = () => kontroleri[S.tip];

const lc = new LaserCut($('#lc'), {
  wt, stroj, get kontroler() { return K(); }, dnevnik, primjeri: PRIMJERI, ucitajPrimjer,
  setWt: w => { S.wt[S.tip] = w; provjeriPuls(); },
  promjena: () => vodic(), glava: () => [K().X, K().Y],
  materijal: m => { postaviMaterijal(m); },
  preporuka: s => { const M = MATERIJALI[S.mat]; if (s.mod === 'Cut') return `Preporuka za ${M.naziv}: ${M.p} % / ${M.v} mm/s (${M.izvor}). Corner power malo niža od Power, da kutovi ne izgore.`; if (s.mod === 'Engrave') return `Graviranje (medijan tvojih poslova): drvo 30 % / 600 mm/s, staklo 50 % / 600, kamen 25 % / 600. Scan gap 0,1 mm.`; return ''; },
  jogPC: (dx, dy, dz, korak, duljina, sporo) => {
    const k = K(); if (!k.napon) { dnevnik('Nema veze s kontrolerom — stroj je isključen.', 'upoz'); return; }
    if (dz) { if (!stroj().zOs) { dnevnik('Z+/Z−: LG500DM nema os Z.', 'upoz'); return; } pomakniZ(dz * (korak ? Math.min(duljina, 10) : 5)); return; }
    const w = wt(), L = korak ? duljina : 50;
    k.gibanje([[Math.max(0, Math.min(w.xRange, k.X + dx * L)), Math.max(0, Math.min(w.yRange, k.Y + dy * L))]], sporo ? w.testSlow * 0.3 : w.testFast, w.workAcc);
  },
  datumPC: () => { const k = K(); if (!k.napon) return dnevnik('Datum: stroj je isključen.', 'upoz'); k.datum(); },
  zDatumPC: () => { if (!stroj().zOs) return dnevnik('Z Datum: LG500DM nema os Z.', 'upoz'); if (!K().napon) return dnevnik('Z Datum: stroj je isključen.', 'upoz'); autofokus(); },
  laserPC: (on, p) => { const k = K(); if (!k.napon) return; k.laserSnaga = p; k.laserVrijeme = 0; k.laserTipka = on; if (on) provjeraPaljenja(); },
  runBox: (b, imm, ref) => { const k = K(); if (!k.napon || !b) return dnevnik('Run Box: stroj je isključen ili nema crteža.', 'upoz'); const pm = imm ? [k.X - ref[0], k.Y - ref[1]] : [0, 0]; const q = { x0: b.x0 + pm[0], y0: b.y0 + pm[1], x1: b.x1 + pm[0], y1: b.y1 + pm[1] }; if (!k.uRasponu(q)) { dnevnik('Run Box: okvir izlazi iz radnog polja (SOFT STOP).', 'upoz'); return; } const x = k.X, y = k.Y; k.gibanje([[q.x1, q.y1], [q.x0, q.y1], [q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [x, y]], wt().testFast, wt().workAcc); dnevnik('Run Box: glava obilazi okvir crteža s isključenim laserom.'); },
  clipBox: (b, v, p, blank, imm, ref) => { const k = K(); if (!k.napon || !b) return; const pm = imm ? [k.X - ref[0], k.Y - ref[1]] : [0, 0]; const q = { x0: b.x0 + pm[0] - blank, y0: b.y0 + pm[1] - blank, x1: b.x1 + pm[0] + blank, y1: b.y1 + pm[1] + blank }; if (!k.uRasponu(q)) return dnevnik('Clip Box: okvir izlazi iz radnog polja.', 'upoz'); if (!provjeraPaljenja()) return; k.gibanje([[q.x1, q.y1], [q.x0, q.y1], [q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1]], v, wt().workAcc, 1); dnevnik(`Clip Box: izrezivanje okvira ${fmt(blank, 1)} mm oko crteža (${fmt(v, 0)} mm/s, ${fmt(p, 0)} %).`); }
});

// ── materijal, leća, fokus ──
function postaviMaterijal(m) { S.mat = m; $('#materijal').value = m; d3.materijal(MATERIJALI[m]); if (S.rot) d3.rotacija(true, S.rotD, MATERIJALI[m]); osvjeziFokus(); vodic(); }
function razmakLece() { return LECE.find(l => l[0] === S.leca)[2]; }
function greskaFokusa() { // + = materijal je iznad žarišta (mm)
  const gap = d3.razmakZa(S.Z[S.tip]);
  if (stroj().zOs) return razmakLece() - gap;
  return S.rucniFokus;
}
function fokusFaktor() { const e = Math.abs(greskaFokusa() - S.fokusU), dof = leca(S.leca).dof; return e <= dof / 2 ? 1 : Math.max(0.2, (dof / 2) / e); }
function osvjeziFokus() {
  const L = leca(S.leca), e = greskaFokusa();
  const ok = Math.abs(e - S.fokusU) <= L.dof / 2;
  $('#fokus-info').innerHTML = `Žarišna točka ≈ ${fmt(L.d0, 2)} mm, dubina fokusa ≈ ${fmt(L.dof, 1)} mm (procjena). Razmak mlaznica → materijal: <b>${fmt(d3.razmakZa(S.Z[S.tip]), 1)} mm</b>. Odstupanje fokusa: <b class="${ok ? '' : 'upoz'}">${fmt(e - S.fokusU, 1)} mm</b> ${ok ? '— u fokusu.' : '— izvan fokusa: rez je širi i slabiji.'}`;
  S.vodic.fokus = ok && !!MATERIJALI[S.mat];
}
function pomakniZ(dz) {
  if (!stroj().zOs) return;
  const w = wt(), z0 = S.Z[S.tip], gap = d3.razmakZa(z0);
  let z = Math.max(0, Math.min(w.zRange, z0 + dz));
  if (gap - (z - z0) < 0.5) { z = z0 + gap - 0.5; dnevnik('Z: materijal je dotaknuo mlaznicu — stol se dalje ne diže.', 'upoz'); }
  S.Z[S.tip] = z; d3.postaviZ(z); osvjeziFokus();
}
function autofokus() {
  if (!stroj().zOs) return dnevnik('Autofokus: LG500DM nema os Z.', 'upoz');
  if (S.rot) return dnevnik('Autofokus: s rotacijskim dodatkom fokus se postavlja ručno (Z strelice).', 'upoz');
  if (!S.mat) return dnevnik('Autofokus: na stolu nema materijala.', 'upoz');
  S.autofokus = { faza: 'gore' }; K().ekran = 'autofokus'; osvjeziPad();
  dnevnik('Autofokus (Z, pa Datum): stol se diže dok materijal ne pritisne mikroprekidač na glavi…');
}
function korakAutofokusa(dt) {
  const a = S.autofokus; if (!a) return;
  const gap = d3.razmakZa(S.Z[S.tip]);
  if (a.faza === 'gore') { const v = 20 * dt; if (gap - v <= 0.6) { pomakniZ(gap - 0.6); a.faza = 'dolje'; a.ost = Math.max(0, razmakLece() - S.fokusU - 0.6); dnevnik(`Mikroprekidač sklopio. Stol se spušta za ${fmt(a.ost, 1)} mm (ovisi o leći ${LECE.find(l => l[0] === S.leca)[1]}).`); } else pomakniZ(v); }
  else { const v = Math.min(a.ost, 6 * dt); pomakniZ(-v); a.ost -= v; if (a.ost <= 1e-3) { S.autofokus = null; K().ekran = 'glavni'; K().zNacin = false; osvjeziPad(); osvjeziFokus(); dnevnik('Autofokus gotov: vrh materijala je u žarištu leće.'); } }
}

// ── provjere sigurnosti ──
function provjeraPaljenja() {
  if (!S.hladnjak) { dnevnik(`Laser ne pali u simulatoru: hladnjak ${stroj().hladnjak} je isključen. Bez protoka vode CO₂ cijev se pregrije i pukne.`, 'upoz'); return false; }
  if (S.poklopac) dnevnik('Pozor: poklopac je otvoren dok laser radi — zraka i odbljesak opasni su za oči i kožu.', 'upoz');
  return true;
}
function provjeraPrijeStarta(d) {
  if (!S.hladnjak) { dnevnik(`Start odbijen u simulatoru: hladnjak ${stroj().hladnjak} je isključen.`, 'upoz'); return false; }
  if (S.poklopac) { dnevnik('Start odbijen u simulatoru: poklopac je otvoren. Zatvori poklopac prije obrade.', 'upoz'); return false; }
  if (!S.odsis) dnevnik('Odsis je isključen: dim ostaje u stroju, prlja leću i zrcala, a u prostoriju izlaze štetni plinovi.', 'upoz');
  if (!S.zrak) dnevnik('Zrak (kompresor) je isključen: bez puhanja drvo i karton mogu planuti, a rub je jače zagorio.', 'upoz');
  if (!S.mat && !S.rot) dnevnik('Na stolu nema materijala — laser reže po saćastom stolu.', 'upoz');
  if (fokusFaktor() < 1) dnevnik(`Materijal nije u fokusu (odstupanje ${fmt(greskaFokusa() - S.fokusU, 1)} mm): rez će biti širi i možda neće proći.`, 'upoz');
  if (S.rot && Math.abs(wt().yMove - Y_ROT) > 0.01) dnevnik(`Rotacijski dodatak je spojen, a Worktable → Y → Move je ${wt().yMove} (za rotaciju ${Y_ROT}). Crtež će na predmetu biti krivo razvučen.`, 'upoz');
  if (!S.rot && Math.abs(wt().yMove - stroj().yTrans) > 0.01) dnevnik(`Os Y je translacijska, a Worktable → Y → Move je ${wt().yMove} (treba ${stroj().yTrans}). Mjere po Y bit će krive.`, 'upoz');
  // prorez po slojevima
  const M = MATERIJALI[S.mat]; d.prorez = {};
  for (const [i, s] of d.slojevi.entries()) { const r = prorez(s, M, stroj().snaga, fokusFaktor()); d.prorez[i] = r; if (r !== null && r >= 0.85 && r < 1 && s.izlaz) dnevnik(`Sloj ${imeBoje(s.aci)}: procjena — rez je na granici (${fmt(r * 100, 0)} % potrebne energije); možda ostanu mostići.`, 'upoz');
    if (r !== null && r < 0.85 && s.izlaz) dnevnik(`Sloj ${imeBoje(s.aci)} (${s.v} mm/s, ${s.p} %): procjena — za ${M.naziv} na ${stroj().snaga} W rez vjerojatno NEĆE proći (${fmt(r * 100, 0)} % potrebne energije). Smanji brzinu, povećaj snagu ili dodaj prolaz (#).`, 'upoz'); }
  S.posao = d; return true;
}
// stvarni pomak osi s obzirom na Move u Worktableu (krivo postavljen Move → krive mjere)
function stvarnoXY(X, Y) {
  const w = wt(), st = stroj();
  return [X * st.xTrans / w.xMove, Y * (S.rot ? Y_ROT : st.yTrans) / w.yMove];
}
function provjeriPuls() { const w = wt(); if (S.rot && Math.abs(w.yMove - Y_ROT) < 0.01) dnevnik('Worktable: os Y postavljena za rotacijski dodatak (Move 80).'); }

// ── upravljačko polje ──
const padEl = $('#pad-lcd');
function osvjeziPad() {
  const k = K(); const r = k.retci();
  padEl.innerHTML = r.map(x => `<div>${x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\[(.*?)\]/g, '<mark>$1</mark>') || '&nbsp;'}</div>`).join('');
  padEl.classList.toggle('ugaseno', !k.napon);
  $('#pad-z').setAttribute('aria-pressed', k.zNacin);
  d3.crtajPlocu(r.map(x => x.replace(/[\[\]]/g, '')), k.napon);
  lc.nacrtaj();
}
document.querySelectorAll('#pad [data-k]').forEach(b => {
  const t = b.dataset.k;
  const dolje = e => { e.preventDefault(); b.classList.add('pritisnuto'); if (t === 'laser' && K().napon) provjeraPaljenja(); K().tipka(t, true); osvjeziPad(); vodic(); };
  const gore = () => { b.classList.remove('pritisnuto'); K().tipka(t, false); };
  b.addEventListener('pointerdown', dolje); b.addEventListener('pointerup', gore); b.addEventListener('pointerleave', gore); b.addEventListener('pointercancel', gore);
  b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) dolje(e); });
  b.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') gore(); });
});
function napajanje() {
  const k = K(), treba = S.kljuc && !S.gljiva;
  if (treba && !k.napon) { k.ukljuci(); d3.hladnjak(S.hladnjak); }
  if (!treba && k.napon) { k.iskljuci(); dnevnik(S.gljiva ? 'Gljiva za nuždu pritisnuta: napajanje pogona i lasera prekinuto. Otpusti je okretanjem.' : 'Ključ isključen: stroj je bez napajanja.', S.gljiva ? 'upoz' : ''); }
  osvjeziPad(); vodic();
}
function prekidac(id, fn) { const b = $(id); b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); fn(on); vodic(); }); }
prekidac('#p-kljuc', on => { S.kljuc = on; napajanje(); });
prekidac('#p-gljiva', on => { S.gljiva = on; napajanje(); });
prekidac('#p-zelena', on => { S.zelena = on; dnevnik(on ? 'Zelena tipka: uključeno (funkcija na stroju nije potvrđena).' : 'Zelena tipka: isključeno.'); });
prekidac('#p-svjetlo', on => { S.svjetlo = on; d3.svjetloUnutra(on); });
prekidac('#p-hladnjak', on => { S.hladnjak = on; d3.hladnjak(on); dnevnik(on ? `Hladnjak ${stroj().hladnjak} uključen — voda teče kroz plašt cijevi.` : `Hladnjak ${stroj().hladnjak} isključen.`, on ? '' : 'upoz'); });
prekidac('#p-odsis', on => { S.odsis = on; dnevnik(on ? 'Odsis uključen.' : 'Odsis isključen.'); });
prekidac('#p-zrak', on => { S.zrak = on; dnevnik(on ? 'Kompresor (puhanje zraka kroz mlaznicu) uključen.' : 'Kompresor isključen.'); });
prekidac('#p-poklopac', on => { S.poklopac = on; d3.poklopac(on); if (on && K().radi) dnevnik('Poklopac otvoren za vrijeme obrade!', 'upoz'); });

// ── odabir stroja ──
function postaviStroj(t) {
  if (K().radi) { dnevnik('Prije promjene stroja zaustavi obradu.', 'upoz'); return; }
  for (const [t2, k2] of Object.entries(kontroleri)) if (t2 !== t && k2.napon) k2.iskljuci();
  S.tip = t;
  document.querySelectorAll('[data-stroj]').forEach(b => b.setAttribute('aria-pressed', b.dataset.stroj === t));
  d3.postavi(t); d3.postaviZ(S.Z[t]); d3.materijal(MATERIJALI[S.mat]); d3.poklopac(S.poklopac); d3.svjetloUnutra(S.svjetlo); d3.hladnjak(S.hladnjak);
  if (S.rot) d3.rotacija(true, S.rotD, MATERIJALI[S.mat]);
  // stanje upravljačkog polja: svaki stroj ima svoje
  for (const [id, k] of [['#p-kljuc', 'kljuc'], ['#p-gljiva', 'gljiva']]) $(id).setAttribute('aria-pressed', S[k]);
  napajanje();
  document.body.dataset.stroj = t;
  $('#stroj-naziv').textContent = `${stroj().naziv} · ${stroj().cijev} · radno polje ${stroj().radno}`;
  $('#zona-z').hidden = !stroj().zOs; $('#zona-rucno').hidden = stroj().zOs;
  $('#p-svjetlo').closest('.kp-el').hidden = !stroj().zOs;
  lc.osvjeziStrojeve(Object.keys(STROJEVI), t); lc.naslov(); lc.oznaciPrljavo(); lc.prikaziStol(); lc.provjeriStol();
  osvjeziFokus(); osvjeziPad(); vodic();
}
document.querySelectorAll('[data-stroj]').forEach(b => b.addEventListener('click', () => postaviStroj(b.dataset.stroj)));

// materijal, leća, rotacija
const selM = $('#materijal'); for (const [k, m] of Object.entries(MATERIJALI)) selM.append(new Option(`${m.naziv} — ${m.p} % / ${m.v} mm/s`, k));
selM.value = S.mat; selM.addEventListener('change', () => postaviMaterijal(selM.value));
const selL = $('#leca'); for (const [f, n] of LECE) selL.append(new Option(n, f)); selL.value = S.leca;
selL.addEventListener('change', () => { S.leca = +selL.value; osvjeziFokus(); dnevnik(`Leća ${LECE.find(l => l[0] === S.leca)[1]}: ${stroj().zOs ? 'ponovi autofokus (Z, pa Datum).' : 'ponovno postavi visinu glave mjerkom.'}`); });
$('#fokus-u').addEventListener('change', e => { S.fokusU = e.target.checked ? MATERIJALI[S.mat].T / 3 : 0; osvjeziFokus(); });
$('#mjerka').addEventListener('click', () => { S.rucniFokus = S.fokusU; osvjeziFokus(); dnevnik('Ručni fokus: glava otpuštena, mjerka između mlaznice i materijala, glava stegnuta — materijal je u žarištu.'); vodic(); });
$('#rucno-gore').addEventListener('click', () => { S.rucniFokus += 1; osvjeziFokus(); });
$('#rucno-dolje').addEventListener('click', () => { S.rucniFokus -= 1; osvjeziFokus(); });
$('#rotacija').addEventListener('change', e => {
  if (K().napon) { e.target.checked = S.rot; dnevnik('Rotacijski dodatak spaja se samo dok je stroj isključen (izlaz pogona Y prespaja se na motor rotacije). Isključi ključ.', 'upoz'); return; }
  S.rot = e.target.checked; d3.rotacija(S.rot, S.rotD, MATERIJALI[S.mat]);
  dnevnik(S.rot ? `Rotacijski dodatak postavljen na stol i spojen na izlaz osi Y. U LaserCutu: Machine Options → Worktable → Y → „…” → Move ${Y_ROT}.` : `Rotacijski dodatak skinut. Vrati Y → Move na ${stroj().yTrans}.`);
  osvjeziFokus(); vodic();
});
$('#rot-d').addEventListener('change', e => { S.rotD = Math.max(20, Math.min(200, +e.target.value || 80)); if (S.rot) d3.rotacija(true, S.rotD, MATERIJALI[S.mat]); $('#rot-opseg').textContent = fmt(Math.PI * S.rotD, 1); });
$('#ubrzanje').addEventListener('change', e => S.ubrzanje = +e.target.value);
document.querySelectorAll('[data-pogled]').forEach(b => b.addEventListener('click', () => d3.pogled(b.dataset.pogled)));
$('#ocisti').addEventListener('click', () => { d3.ocisti(); dnevnik('Nova ploča materijala na stolu.'); });

// ── vodič (postupak rada) ──
const KORACI = [
  ['hladnjak', 'Uključi hladnjak, odsis i kompresor', () => S.hladnjak && S.odsis && S.zrak],
  ['napon', 'Ključ uključen, gljiva otpuštena — PAD03 se pokreće, glava ide u Datum', () => K().napon && K().datumOK],
  ['mat', 'Materijal na stolu (poklopac otvoren pa zatvoren)', () => !!S.mat || S.rot],
  ['fokus', 'Fokus: LC1390N — tipka Z, pa Datum (autofokus); LG500DM — mjerka', () => fokusFaktor() >= 1],
  ['crtez', 'LaserCut: Import, slojevi po bojama, parametri, Calculate', () => lc.objekti.length > 0 && !lc.prljavo],
  ['dl', 'DownLoad u kontroler (Download current file)', () => K().datoteke.length > 0],
  ['test', 'PAD03: Test — okvir crteža leži na materijalu', () => !!S.vodic.test],
  ['start', 'Poklopac zatvoren, Start/Pause', () => !!S.vodic.start],
  ['gotovo', 'Kraj: pričekaj odsis, otvori poklopac, izvadi dijelove', () => !!S.vodic.gotovo]
];
const vodicEl = $('#vodic');
function vodic() {
  vodicEl.innerHTML = KORACI.map(([id, t, f], i) => `<li class="${f() ? 'ok' : ''}"><span aria-hidden="true">${f() ? '✓' : i + 1}</span>${t}</li>`).join('');
}

// ── ampermetar ──
const igla = $('#amp-igla'), ampTxt = $('#amp-v');
function ampermetar(mA) { const k = Math.max(0, Math.min(30, mA)) / 30; igla.setAttribute('transform', `rotate(${-60 + 120 * k} 60 62)`); ampTxt.textContent = fmt(mA, 1) + ' mA'; }

// ── glavna petlja ──
let zadnje = performance.now(), sloj3 = null;
function petlja(sad) {
  const dtS = Math.min(0.1, (sad - zadnje) / 1000); zadnje = sad;
  const k = K();
  korakAutofokusa(dtS);
  const ub = k.radi || k.gib ? S.ubrzanje : 1;
  const r = k.korak(dtS * ub, dtS);
  if (k.ekran === 'test' || (k.gib && k.ekran === 'glavni')) S.vodic.test = S.vodic.test || k.ekran === 'test';
  if (k.radi) S.vodic.start = true;
  // paljenje
  let laser = r.laser && S.hladnjak, sn = laser ? r.snaga : 0;
  if (r.laser && !S.hladnjak && !S.upozHl) { S.upozHl = true; dnevnik('Laser ne pali: hladnjak je isključen (u simulatoru zaštita cijevi).', 'upoz'); }
  if (!r.laser) S.upozHl = false;
  if (laser) {
    const M = MATERIJALI[S.mat], d = S.posao;
    for (const s of r.spali) {
      const [x0, y0, x1, y1, slj, j, tocka, sir] = s;
      const kroz = d && d.prorez && d.prorez[slj] != null ? d.prorez[slj] >= 0.85 : (j > 0.5);
      const [a0, b0] = stvarnoXY(x0, y0), [a1, b1] = stvarnoXY(x1, y1);
      d3.spali(a0, b0, a1, b1, sir || leca(S.leca).d0 * (2 - fokusFaktor()) * 1.5, j * fokusFaktor(), kroz);
    }
  }
  const [X, Y] = stvarnoXY(k.X, k.Y);
  d3.postaviGlavu(X, Y, laser, sn, S.rot ? Y : null);
  ampermetar(laser ? stroj().Imax * sn / 100 : 0);
  $('#lampa').classList.toggle('upaljena', laser);
  // zaslon i status
  if (k.radi || k.gib || S.autofokus || k.ekran === 'boot') { osvjeziPadLagano(); }
  requestAnimationFrame(petlja);
}
let zadnjiPad = 0;
function osvjeziPadLagano() { const t = performance.now(); if (t - zadnjiPad > 120) { zadnjiPad = t; osvjeziPad(); } }
postaviStroj('LC1390N');
vodic(); osvjeziFokus();
requestAnimationFrame(petlja);
dnevnik('Simulator spreman. Kreni od upravljačkog polja: hladnjak, odsis i kompresor, pa ključ.');
// učitaj prvi primjer u LaserCut (kao da je datoteka otvorena)
ucitajPrimjer('kutija265').then(p => { lc.ucitaj(p.objekti, p.ime, p.slojevi); postaviMaterijal(p.materijal); }).catch(() => { });
window.ftqLaser = { S, K, lc, d3 };
