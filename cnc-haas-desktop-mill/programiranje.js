/* FORTRONIQ · Haas Desktop Mill — Programiranje: Haas dijalekt (objašnjivač bloka, riječi, ciklusi, G12/G13, potprogrami, provjera).  © ForTroniQ d.o.o. */
import { objasniHaas, pretvori, rijeci } from './haas_gkod.js?v=02';
import { PROGRAMI_H } from './programi_haas.js?v=02';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function kod(el, redci, oznaci = []) { el.innerHTML = redci.map((r, i) => '<span class="k">' + (i + 1) + '</span>' + (oznaci.includes(i) ? '<span class="w">' : '') + esc(r).replace(/\([^)]*\)/g, (m) => '<span class="c">' + m + '</span>') + (oznaci.includes(i) ? '</span>' : '')).join('\n'); }

/* 1. građa */
kod($('kod-grada'), PROGRAMI_H.O01002.tekst.split('\n'));

/* 2. objašnjivač */
function objasniSve() {
  const redci = $('blok-unos').value.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  let s = {}; const out = [];
  const pr = pretvori(redci.join('\n') + '\nM30', { offsets: { 54: { X: 0, Y: 0, Z: 0 } }, H: {}, Lt: () => 0, polumjer: () => 1.5, T0: 1 });
  redci.forEach((l, i) => {
    const o = objasniHaas(l, s); s = o.stanje;
    const g = pr.greske.find((q) => q.red === i && q.alarm);
    out.push('<div class="obj"><code>' + esc(l) + '</code><span>' + esc(o.tekst) + (g ? ' <b class="upoz">ALARM ' + g.alarm + ': ' + esc(g.tekst) + '</b>' : '') + '</span></div>');
  });
  $('blok-izlaz').innerHTML = out.join('') || '<p class="pom">Upiši blok.</p>';
}
$('objasni').addEventListener('click', objasniSve);
document.querySelectorAll('[data-primjer]').forEach((b) => b.addEventListener('click', () => { $('blok-unos').value = b.dataset.primjer; objasniSve(); }));
objasniSve();

/* 3. riječi */
const RIJECI = [
  ['%', 'početak / kraj programa pri prijenosu', '%', '840D: nema; Mach3: nije obvezno'],
  ['Onnnnn', 'broj programa (slovo O + 5 znamenki), naziv u zagradama', 'O01001 (KRUZNI DZEP)', '840D: naziv datoteke .MPF'],
  ['( … )', 'komentar — upravljanje ga preskače', '(PLOCA 120 X 90)', '840D: ; komentar'],
  ['Nnnn', 'broj bloka, nije obvezan; cilj za M97', 'N100 G01 X60. F400.', 'isto'],
  ['X10. / X10', 'decimalna točka obvezna: X10. = 10 mm, X10 = 0,010 mm', 'G00 X10. Y10.', '840D i Mach3: X10 = 10 mm'],
  ['G20 / G21', 'inči / milimetri (Setting 9 zadaje početni način)', 'G21', '840D: G70 / G71'],
  ['G28', 'povratak u nultočku stroja preko međutočke; G91 Z0. = ravno', 'G28 G91 Z0.', '840D: G74; Mach3: G28'],
  ['G53', 'koordinate stroja samo u tom bloku (ne poništava G54)', 'G53 G00 Z0.', '840D: G53 / SUPA'],
  ['G43 Hnn / G49', 'korekcija duljine alata iz zapisa H / isključena', 'G43 H02 Z25.', '840D: Dn uz T; Mach3: nema (nula na vrhu alata)'],
  ['G54 … G59, G154 Pn', 'pomak nultočke obratka (tablica OFFSET → WORK)', 'G54 G00 X0. Y0.', '840D: G54 … G57, G505 …'],
  ['G81 … G89, G73', 'modalni ciklusi bušenja s R, Z, Q, P, F; G80 poništava', 'G81 G99 X15. Y15. Z-12. R2. F120.', '840D: CYCLE81 …; Mach3: G81 …'],
  ['G98 / G99', 'povratak nakon ciklusa na početnu ravninu / na ravninu R', 'G98 G83 … Q3.', '840D: RTP / RFP u ciklusu'],
  ['G12 / G13', 'kružni džep iz središta: I, K, Q, Z, L, D, F', 'G91 G13 Z-5. I3. K30. Q3. D02 L2 F150.', '840D: POCKET4'],
  ['G187 Pn En', 'točnost / glatkoća putanje (P1 gruba … P3 fina)', 'G187 P2', '840D: CYCLE832'],
  ['M06', 'izmjena alata; na Desktop Millu ručna — program stane', 'T2 M06', 'Mach3: samo prihvaća'],
  ['M97 Pnnn Lk', 'lokalni potprogram: skok na redak N u istom programu, k puta', 'M97 P100 L3', '840D: REPEAT / LABEL'],
  ['M98 Pnnnnn Lk', 'poziv programa O iz memorije, k puta', 'M98 P1005 L2', '840D: poziv potprograma imenom'],
  ['M99', 'kraj potprograma (povratak); na kraju glavnog — petlja', 'M99', '840D: M17 / RET'],
  ['M00 / M01', 'zaustavljanje programa / samo ako je OPT STOP uključen', 'M01', 'isto'],
  ['M30', 'kraj programa i povratak na početak', 'M30', 'isto']
];
$('rijeci').innerHTML = RIJECI.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td><code>' + esc(r[2]) + '</code></td><td>' + esc(r[3]) + '</td></tr>').join('');

/* 4. ciklusi */
kod($('kod-cik'), ['G81 G99 X15. Y15. Z-12. R2. F120.   (zadan i izveden)', 'X85.                                (isti ciklus, novo mjesto)', 'Y45.', 'X15.', 'G98 G83 X50. Y30. Z-12. Q3. R2. F120.', 'G80                                 (ciklus poništen)']);
{ const g = $('cik-svg');
  const L = (x1, y1, x2, y2, c = 'l') => '<line class="' + c + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  const T = (x, y, t, c = '') => '<text class="' + c + '" x="' + x + '" y="' + y + '">' + t + '</text>';
  const A = (x, y, r = 0) => '<path class="if" transform="translate(' + x + ' ' + y + ') rotate(' + r + ')" d="M0 -8 L6 4 L-6 4 Z"/>';
  let h = '<rect class="rf" x="60" y="170" width="520" height="50"/>' + L(60, 170, 580, 170, 'l');
  h += L(40, 60, 600, 60, 'l2 dash') + T(430, 54, 'početna ravnina (G98)', 'mali');
  h += L(40, 150, 600, 150, 'l2 dash') + T(430, 144, 'ravnina R (G99)', 'mali');
  /* G81 lijevo */
  h += T(120, 40, 'G81') + L(150, 60, 150, 150, 'l2 dash') + A(150, 150, 180) + L(150, 150, 150, 215, 't') + A(150, 213, 180) + L(165, 215, 165, 150, 'l2') + A(165, 152, 0) + T(175, 205, 'Z', 'mali') + T(175, 165, 'R', 'mali') + T(70, 120, 'G00', 'mali') + T(100, 190, 'G01 F', 'mali');
  /* G83 desno */
  h += T(330, 40, 'G83 Q') + L(360, 60, 360, 150, 'l2 dash') + A(360, 150, 180);
  [[150, 175], [175, 195], [195, 215]].forEach(([a, b], i) => { const x = 360 + i * 22; h += L(x, a, x, b, 't') + A(x, b - 2, 180); if (i < 2) { h += L(x + 11, b, x + 11, 150, 'l2') + A(x + 11, 152, 0); } });
  h += L(420, 215, 420, 60, 'l2') + A(420, 62, 0) + T(432, 110, 'G98', 'mali') + T(432, 200, 'Z', 'mali') + T(300, 190, 'Q', 'mali') + T(300, 165, 'R', 'mali');
  h += T(60, 245, 'ciklus: brzo do R → posmak do Z (G83 po Q s izlaskom) → brzo natrag na R (G99) ili na početnu ravninu (G98)', 'mali');
  g.innerHTML = h; }

/* 5. G12/G13 */
kod($('kod-840'), ['G54', 'T8', 'M6', 'S3000 M3', 'G0 X3 Y-6', 'G0 Z-5', 'G1 Y96 F300', 'G0 Z2', 'POCKET4(2,0,1,-10,30,60,45,5,0,0,150,300,0,11,,)', 'G0 Z100', 'M30'], [8]);
kod($('kod-haas'), PROGRAMI_H.O01001.tekst.split('\n'), [15]);

/* 6. potprogrami */
kod($('kod-m97'), PROGRAMI_H.O01003.tekst.split('\n'), [8, 16, 21]);

/* 7. provjera */
const KVIZ = [
  ['Što znači blok G00 X10 Y10 (bez decimalnih točaka) na Haasu?', ['brzi hod na X10 Y10 mm', 'brzi hod na X0,010 Y0,010 mm', 'alarm 310 INVALID G CODE'], 1, 'Haas broj bez decimalne točke čita kao tisućinke milimetra. Zato uvijek X10. Y10.'],
  ['Koji blok je ispravan redoslijed za prvo spuštanje alata s korekcijom duljine?', ['G43 H02 Z25.', 'G49 H02 Z25.', 'Z25. G43 H02 D02'], 0, 'G43 Hnn uključuje korekciju duljine iz zapisa H i smije doći tek nakon pozicioniranja u X i Y.'],
  ['Program ima G01 X50. bez posmaka F. Što se dogodi?', ['os ide posmakom iz zadnjeg programa', 'alarm 320 NO FEED RATE', 'os ide brzim hodom'], 1, 'Haas ne pretpostavlja posmak; G01 bez F zaustavlja program alarmom 320.'],
  ['Što radi G99 u bloku ciklusa G81?', ['vraća alat na početnu ravninu', 'vraća alat na ravninu R', 'poništava ciklus'], 1, 'G99 = povratak na R (brže između bliskih provrta); G98 = povratak na početnu ravninu; G80 poništava ciklus.'],
  ['Što znači M97 P100 L3?', ['poziv programa O00100 tri puta', 'skok na redak N100 u istom programu, tri puta', 'zastoj 100 ms, tri puta'], 1, 'M97 je lokalni potprogram (redak N u istom programu); M98 poziva program O iz memorije.'],
  ['Što se dogodi na Desktop Millu kad program dođe do T2 M06?', ['izmjenjivač stavi T2 u vreteno', 'program stane i čeka ručnu izmjenu i CYCLE START', 'blok se preskače'], 1, 'Desktop Mill nema izmjenjivač; alat se mijenja ručno pri zaustavljenom vretenu i otvorenim vratima.'],
  ['U koji zapis se upisuje izmjerena duljina alata T2?', ['G54 Z', 'H02 (OFFSET → TOOL)', 'D02'], 1, 'Duljina alata je u H; G54 Z ostaje 0 kad se duljine mjere na plohi obratka. D je polumjer/promjer za korekciju putanje.'],
  ['Što radi G91 G13 Z-5. I3. K30. Q3. L2 F150.?', ['buši 2 provrta Ø30', 'kružni džep polumjera 30 u dva prolaza po 5 mm, suprotno od kazaljke', 'kružnu konturu s korekcijom lijevo'], 1, 'G13 = kružni džep suprotno od kazaljke iz središta: I prva kružnica, K završni polumjer, Q korak, L prolazi, Z po prolazu (G91).']
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
