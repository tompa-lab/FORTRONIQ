/* FORTRONIQ · Haas TL-1 — Programiranje: Haas dijalekt za tokarilicu (objašnjivač bloka, riječi, G71/G70, G74/G75/G76, potprogrami, provjera).  © ForTroniQ d.o.o. */
import { objasni, pretvori, rijeci } from './tl1_gkod.js?v=02';
import { PROGRAMI_TL } from './programi_tl1.js?v=02';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function kod(el, redci, oznaci = []) { el.innerHTML = redci.map((r, i) => '<span class="k">' + (i + 1) + '</span>' + (oznaci.includes(i) ? '<span class="w">' : '') + esc(r).replace(/\([^)]*\)/g, (m) => '<span class="c">' + m + '</span>') + (oznaci.includes(i) ? '</span>' : '')).join('\n'); }
const ALATI = { 1: { X: -406, Z: -695 }, 2: { X: -406.6, Z: -703 }, 3: { X: -406, Z: -665 }, 4: { X: -406.4, Z: -691 }, 5: { X: -405, Z: -655 } };

/* 1. građa */
kod($('kod-grada'), PROGRAMI_TL.O03001.tekst.split('\n'));

/* 2. objašnjivač */
function objasniSve() {
  const redci = $('blok-unos').value.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  let s = {}; const out = [];
  const pr = pretvori(redci.join('\n') + '\nM30', { alati: ALATI, off: { 54: { X: 0, Z: 0 } }, start: { X: -286, Z: -615 }, T0: 1 });
  redci.forEach((l, i) => {
    const o = objasni(l, s); s = o.stanje;
    const g = pr.greske.find((q) => q.red === i && q.alarm), u = pr.greske.find((q) => q.red === i && !q.alarm);
    out.push('<div class="obj"><code>' + esc(l) + '</code><span>' + esc(o.tekst) + (g ? ' <b class="upoz">ALARM ' + g.alarm + ': ' + esc(g.tekst) + '</b>' : '') + (u ? ' <b class="upoz">' + esc(u.tekst) + '</b>' : '') + '</span></div>');
  });
  $('blok-izlaz').innerHTML = out.join('') || '<p class="pom">Upiši blok.</p>';
}
$('objasni').addEventListener('click', objasniSve);
document.querySelectorAll('[data-primjer]').forEach((b) => b.addEventListener('click', () => { $('blok-unos').value = b.dataset.primjer.replace(/\\n/g, '\n'); objasniSve(); }));
objasniSve();

/* 3. riječi */
const RIJECI = [
  ['Onnnnn ( … )', 'broj programa i naziv; komentari u zagradama', 'O03001 (CEPIC)', 'isto kao na glodalici'],
  ['X / U', 'promjer apsolutno / inkrementalno (promjer!)', 'G01 X30. — U-2. je 1 mm po polumjeru', 'glodalica: X je udaljenost'],
  ['Z / W', 'udaljenost od čela apsolutno / inkrementalno', 'Z-40. — W-10.', 'isto'],
  ['X10. / X10', 'decimalna točka obvezna: X10 = 0,010 mm', 'X10.', 'isto'],
  ['G18 G21 G40 G99', 'sigurnosni blok tokarilice: ravnina XZ, mm, bez korekcije vrha, mm/okr', 'G18 G21 G40 G99', 'glodalica: G00 G17 G21 G40 G49 G80 G90'],
  ['Txxyy', 'alat xx s korekcijom yy (X i Z GEOMETRY + WEAR)', 'T0101', 'glodalica: T1 M06 + G43 H01'],
  ['G50 Snnnn', 'granica broja okretaja za G96', 'G50 S1500', 'glodalica: nema'],
  ['G96 Snnn', 'stalna rezna brzina u m/min — o/min raste kad se promjer smanjuje', 'G96 S150 M03', 'glodalica: nema (G97 je stalni o/min)'],
  ['G97 Snnnn', 'stalni broj okretaja (bušenje, navoj, odrezivanje na kraju)', 'G97 S800 M03', 'isto'],
  ['G98 / G99', 'posmak u mm/min / u mm/okr (zadano na tokarilici)', 'G99 F0.2', 'glodalica: G94 / G95'],
  [',C / ,R', 'skošenje / zaobljenje na kutu između dva bloka G01', 'G01 X30. ,C1.', 'glodalica: CHF/RND na 840D'],
  ['G71 P Q U W D F', 'grubo uzdužno tokarenje konture (blokovi P … Q), dodaci U (promjer) i W, dubina D', 'G71 P10 Q20 U0.5 W0.1 D2. F0.3', 'glodalica: nema; 840D: CYCLE95'],
  ['G72 P Q U W D F', 'grubo poprečno (čeono) tokarenje konture', 'G72 P10 Q20 U0.2 W0.5 D1.5 F0.25', '840D: CYCLE95 (čeono)'],
  ['G70 P Q', 'završna obrada konture P … Q s posmacima iz blokova profila', 'G70 P10 Q20', '—'],
  ['G74 Z K F', 'bušenje s čišćenjem strugotine (koraci K) na osi', 'G74 Z-30. K6. F0.1', 'glodalica: G83'],
  ['G75 X I F (Z K)', 'utor: prodor u X s čišćenjem po I; više utora s Z i K', 'G75 X26. I1.5 F0.06', '—'],
  ['G76 X Z K D F', 'navoj: mali promjer X, kraj Z, visina K, prvi prolaz D, korak F', 'G76 X27.55 Z-30. K1.23 D0.4 F2.', 'glodalica: G84 (urezivanje)'],
  ['G28 U0 W0', 'povratak u nultočku stroja (Z pa X u simulatoru)', 'G28 U0. W0.', 'glodalica: G28 G91 Z0.'],
  ['M97 / M98 / M99', 'lokalni potprogram / program iz memorije / povratak', 'M97 P100 L3', 'isto'],
  ['M08 / M09, M30', 'rashladno sredstvo uključeno / isključeno; kraj programa', 'M09 … M30', 'isto']
];
$('rijeci').innerHTML = RIJECI.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td><code>' + esc(r[2]) + '</code></td><td>' + esc(r[3]) + '</td></tr>').join('');

/* 4. G71/G70 */
kod($('kod-g71'), PROGRAMI_TL.O03002.tekst.split('\n'), [12, 13, 20, 21]);
{ const g = $('g71-svg');
  const L = (x1, y1, x2, y2, c = 'l') => '<line class="' + c + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  const T = (x, y, t, c = '') => '<text class="' + c + '" x="' + x + '" y="' + y + '">' + t + '</text>';
  /* os vretena vodoravno na y = 230; čelo na x = 540; polumjer 1 mm = 4 px */
  const X0 = 540, Y0 = 230, s = 4; const px = (z, r) => [X0 + z * s, Y0 - r * s];
  let h = L(40, Y0, 620, Y0, 'l2 dash') + T(44, Y0 - 6, 'os vretena (X 0)', 'mali');
  const pr = [[0, 0], [0, 10], [-20, 10], [-20, 17], [-40, 17], [-45, 22], [-45, 23], [-65, 23]];
  let d = 'M' + px(0, 0).join(' '); pr.forEach((p) => { d += ' L' + px(p[0], p[1]).join(' '); }); d += ' L' + px(-65, 0).join(' ') + ' Z';
  h += '<path class="pf" d="' + d + '"/>';
  h += '<rect class="rf" x="' + px(-65, 25)[0] + '" y="' + px(0, 25)[1] + '" width="' + (65 * s) + '" height="' + (2 * s) + '"/>';
  [24, 22, 20, 18, 16, 14, 12].forEach((r, i) => { const [x1, y] = px(2, r); let zc = -65; for (let q = 1; q < pr.length; q++) { const a = pr[q - 1], c = pr[q]; if (a[1] < r && c[1] >= r) { zc = a[0] + (c[0] - a[0]) * (r - a[1]) / (c[1] - a[1]); break; } } const [x2] = px(zc, r); h += L(x1, y, x2, y, 't') + L(x2, y, x2 + 6, y - 6, 'l2'); void i; });
  h += T(60, 60, 'G71: prolazi s D = 2 mm od pripremka Ø50 prema konturi (U/2 = 0,25 mm dodatka)', 'mali');
  h += T(60, 80, 'G70: završni prolaz po konturi N10 … N20 (žuto)', 'mali');
  h += '<path class="if" d="M' + px(1, 10).join(' ') + ' l-8 -5 l0 10 Z"/>' + T(px(4, 12)[0], px(0, 12)[1], 'N10 X20.', 'mali') + T(px(-62, 25)[0], px(0, 27)[1], 'N20 Z-65.', 'mali');
  g.innerHTML = h; }

/* 5. G74/G75/G76 */
kod($('kod-cik'), PROGRAMI_TL.O03003.tekst.split('\n'), [24, 30, 36]);

/* 6. potprogrami */
kod($('kod-m97'), PROGRAMI_TL.O03004.tekst.split('\n'), [19, 23, 26]);

/* 7. provjera */
const KVIZ = [
  ['Što znači X30. u programu tokarilice Haas?', ['vrh alata je 30 mm od osi', 'promjer 30 mm (vrh alata je 15 mm od osi)', 'pomak u X od 30 mm'], 1, 'Na Haas tokarilicama X je uvijek promjer; polumjer je X/2.'],
  ['Koji blok uključuje alat 2 s njegovom korekcijom?', ['T2 M06 G43 H02', 'T0202', 'T2 D2'], 1, 'Txxyy: xx = alat, yy = korekcija iz tablice OFFSET (X i Z GEOMETRY). Na tokarilici nema G43 H.'],
  ['Što radi G96 S150 uz G50 S1500?', ['vreteno se vrti stalno 150 o/min', 'rezna brzina je stalno 150 m/min, a o/min rastu prema osi, najviše 1500', 'posmak je 150 mm/min'], 1, 'G96 = stalna rezna brzina u m/min; upravljanje računa o/min iz trenutačnog promjera, G50 ih ograničava.'],
  ['F0.2 uz G99 znači:', ['0,2 mm/min', '0,2 mm po okretaju vretena', '0,2 m/min'], 1, 'G99 (zadano na tokarilici) = posmak po okretaju; G98 = mm/min.'],
  ['Što opisuju P10 i Q20 u bloku G71 P10 Q20 U0.5 W0.1 D2. F0.3?', ['prvi i zadnji prolaz', 'brojeve blokova N10 … N20 koji opisuju konturu', 'dubinu i širinu reza'], 1, 'Kontura (profil) je u blokovima od N10 do N20; G71 ih čita, grubo tokari, a G70 P10 Q20 ih izvodi kao završni prolaz.'],
  ['Što znači U0.5 u bloku G71?', ['dodatak 0,5 mm po polumjeru', 'dodatak 0,5 mm na promjer (0,25 po polumjeru) za završnu obradu', 'brzi hod od 0,5 mm'], 1, 'U je u G71 dodatak u X (promjer), W dodatak u Z; ostaju za G70.'],
  ['G76 X27.55 Z-30. K1.23 D0.4 F2. — što je F2.?', ['posmak 2 mm/min', 'korak navoja 2 mm', 'dubina prolaza 2 mm'], 1, 'U G76 F je korak navoja (metrički M30 × 2 ima korak 2); K je visina navoja, D dubina prvog prolaza.'],
  ['Što se dogodi kad program na TL-1 s nosačem alata dođe do T0202?', ['revolver okrene alat 2', 'program stane i čeka ručnu izmjenu i CYCLE START', 'blok se preskače'], 1, 'TL-1 u radionici nema revolver: alat se mijenja ručno pri zaustavljenom vretenu i otvorenim vratima (pretpostavka ponašanja u simulatoru).']
];
{ const el = $('kviz'); let tocno = 0, odg = 0;
  el.innerHTML = '<div class="kviz-o">' + KVIZ.map((q, i) => '<div class="kviz"><p class="pit">' + (i + 1) + '. ' + esc(q[0]) + '</p><div class="odg">' + q[1].map((o, j) => '<button type="button" class="gumb tanki" data-q="' + i + '" data-o="' + j + '">' + esc(o) + '</button>').join('') + '</div><p class="obraz" id="obraz-' + i + '">' + esc(q[3]) + '</p></div>').join('') + '</div><p class="pom" id="kviz-rez">Odgovori na svih ' + KVIZ.length + ' pitanja.</p>';
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return; const q = +b.dataset.q, o = +b.dataset.o; const gumbi = el.querySelectorAll('[data-q="' + q + '"]'); if ([...gumbi].some((g) => g.disabled)) return;
    gumbi.forEach((g) => { g.disabled = true; if (+g.dataset.o === KVIZ[q][2]) g.classList.add('tocno'); }); if (o !== KVIZ[q][2]) b.classList.add('netocno'); else tocno++;
    odg++; $('obraz-' + q).classList.add('vidi');
    if (odg === KVIZ.length) $('kviz-rez').textContent = 'Rezultat: ' + tocno + ' od ' + KVIZ.length + (tocno === KVIZ.length ? ' — sve točno.' : ' — pogledaj objašnjenja i vrati se na odjeljke.');
  });
}
void rijeci;
