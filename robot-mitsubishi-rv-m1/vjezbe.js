/* FORTRONIQ · Mitsubishi Movemaster EX RV-M1 — stranica „Vježbe s robotom”.
   Podaci vježbi: rvm1_vjezbe_podaci.js; podaci robota (tablice uz vježbe): rvm1_podaci.js; pregled gibanja: rvm1_mrl.js + rvm1_kin.js;
   3D (učitava se tek kad zatreba): three + rvm1_model.js. Napredak (kvačice) u localStorage, uvijek u try/catch. © ForTroniQ d.o.o. */
import * as PODACI from './rvm1_podaci.js';
import * as KIN from './rvm1_kin.js';
import { napraviDUM1 as napraviStroj } from './rvm1_mrl.js';
import { VJEZBE, TEZINE, OPREMA, SIGURNOST_OPCENITO, pripremaNaredbe, programRedci, tekstZaPreuzimanje, napraviScenarij } from './rvm1_vjezbe_podaci.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const zarez = (v) => String(v).replace('.', ',');
const br1 = (v) => { const r = Math.round(v * 10) / 10; return zarez((Object.is(r, -0) ? 0 : r).toFixed(1)); };
const STRELICA = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M1 6h9M6.5 2.2 10.3 6l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const KLJUC = 'ftq-rvm1-vjezbe';
const jePomak = (t) => /^pomak/.test(t.naziv || '');

/* ================================================================== napredak (localStorage, try/catch) */
function citajNapredak() { try { const s = localStorage.getItem(KLJUC); const o = s ? JSON.parse(s) : {}; return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
function pisiNapredak(o) { try { localStorage.setItem(KLJUC, JSON.stringify(o)); } catch (e) { /* privatni način ili blokirano spremište */ } }
let NAP = citajNapredak();
const gotovihKoraka = (v) => (Array.isArray(NAP[v.id]) ? NAP[v.id].filter((i) => i >= 0 && i < v.koraci.length).length : 0);

/* ================================================================== miješanje odgovora (stalno za svako pitanje) */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function poredak(n, sjeme) {
  let a = sjeme || 1; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const p = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p;
}

/* ================================================================== zaglavlje i popis */
const ukupnoMin = VJEZBE.reduce((s, v) => s + v.trajanje, 0);
$('hero-brojke').textContent = VJEZBE.length + ' vježbi · oko ' + Math.round(ukupnoMin / 60) + ' sati rada · ' + VJEZBE.filter((v) => v.program).length + ' gotovih programa · 3D pregled gibanja · radni list za ispis';
const tezinaHTML = (t) => '<span class="vj-tez" title="Težina: ' + esc(TEZINE[t]) + '">' + [1, 2, 3].map((i) => '<i class="' + (i <= t ? 'p' : '') + '"></i>').join('') + ' ' + esc(TEZINE[t]) + '</span>';

function karticaHTML(v, i) {
  const g = gotovihKoraka(v), n = v.koraci.length;
  return '<li class="vj-kartica' + (g === n ? ' gotova' : '') + '" data-id="' + v.id + '" data-tezina="' + v.tezina + '">'
    + '<div class="vj-kart-g"><span class="vj-br" aria-hidden="true">' + (i + 1) + '</span><div><h3><a href="#' + v.id + '">' + esc(v.naslov) + '</a></h3></div></div>'
    + '<p>' + esc(v.cilj) + '</p>'
    + '<div class="vj-red">' + tezinaHTML(v.tezina) + '<span class="vj-sat">' + v.trajanje + ' min</span>' + (v.program ? '<span>program: ' + programRedci(v).length + ' redaka</span>' : '<span>privjesak i naredbe</span>') + '</div>'
    + '<ul class="vj-cipovi" aria-label="Uvodi">' + v.kljucno.map((k) => '<li>' + esc(k) + '</li>').join('') + '</ul>'
    + '<p class="vj-oprema"><span class="vj-vh">Oprema: </span>' + esc(v.oprema.map((k) => OPREMA[k]).join(' · ')) + '</p>'
    + '<div class="vj-kart-d"><span class="vj-mini" aria-label="Napredak: ' + g + ' od ' + n + ' koraka"><b><i style="width:' + Math.round((100 * g) / n) + '%"></i></b>' + g + '/' + n + '</span><a class="gumb" href="#' + v.id + '" aria-label="Otvori vježbu ' + (i + 1) + ': ' + esc(v.naslov) + '">Otvori ' + STRELICA + '</a></div></li>';
}
let filtar = 0;
function crtajPopis() {
  $('vj-kartice').innerHTML = VJEZBE.map(karticaHTML).join('');
  primijeniFiltar();
}
function primijeniFiltar() {
  let n = 0;
  document.querySelectorAll('.vj-kartica').forEach((li) => { const vid = !filtar || +li.dataset.tezina === filtar; li.hidden = !vid; if (vid) n++; });
  $('vj-ukupno').textContent = n + ' od ' + VJEZBE.length;
  document.querySelectorAll('#vj-filtar button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.tezina === filtar)));
}
$('vj-filtar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; filtar = +b.dataset.tezina; primijeniFiltar(); });

/* opće sigurnosne napomene */
const sigLi = SIGURNOST_OPCENITO.map((s) => '<li>' + esc(s) + '</li>').join('');
$('vj-sig-popis').innerHTML = sigLi; $('vj-sig-opce').innerHTML = sigLi;

/* ================================================================== tablice iz podataka robota (dodatak) */
const PRETP = (() => { try { return PODACI.pretpostavke(); } catch (e) { return []; } })();
const PP_KLJUC = {
  pogreskeI: [], granice: ['Predznak osi J3', 'Raspon osi J4', 'Konvencija kutova'], brojke: ['zaslonu privjeska'],
  rs232: ['Kontrola toka RS-232C', 'Format odgovora'], prihvatnica: ['naredbe GP', 'Sila prihvatnice nakon'], paleta: ['palete (PA/PT)', 'naredbi PA i PT'],
  rukovanje: ['Slijed rukovanja', 'SIM RV i kartica'], memorija: ['Naredba WR', 'nakon isključenja']
};
function pretpHTML(kljuc) {
  const k = PP_KLJUC[kljuc] || []; if (!k.length) return '';
  const st = PRETP.filter((p) => k.some((x) => p.sto.includes(x))).slice(0, 3);
  if (!st.length) return '';
  return '<div class="vj-pretp">' + st.map((p) => '<p><b>' + (p.vrsta === 'sukob' ? 'Sukob izvora' : p.vrsta === 'nedostaje' ? 'Nedostaje' : 'Pretpostavka') + ':</b> ' + esc(p.sto) + ' — ' + esc(p.napomena) + '</p>').join('')
    + '<p>Popis svih pretpostavki: <a href="upoznavanje-robota.html#pretpostavke">Upoznavanje robota</a>.</p></div>';
}
const tbl = (cap, gl, redci) => '<div class="tablica-omot" role="region" tabindex="0" aria-label="' + esc(cap) + '"><table class="vj-tbl"><caption>' + esc(cap) + '</caption><thead><tr>' + gl.map((g) => '<th scope="col"' + (g[1] ? ' class="br"' : '') + '>' + esc(g[0]) + '</th>').join('') + '</tr></thead><tbody>'
  + redci.map((r) => '<tr>' + r.map((c, i) => '<td' + (gl[i] && gl[i][1] ? ' class="br"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
function dodatakHTML(kljuc) {
  let h = '';
  try {
    switch (kljuc) {
      case 'pogreskeI': h = tbl('Pogreška I. vrste: LED-ice uzroka iza bočnih vrata DUM1', [['LED'], ['Uzrok'], ['Poništavanje']], PODACI.POGRESKE.I.map((x) => [esc(x.led), esc(x.uzrok), esc(x.ponistavanje)]))
        + '<p class="pom">' + esc(PODACI.POGRESKE.znakoviI) + '</p>'; break;
      case 'granice': h = tbl('Rasponi osi i najveće brzine', [['Os'], ['Tipka'], ['Zglob'], ['Raspon [°]', 1], ['v max [°/s]', 1]],
        PODACI.OSI.map((o) => [esc(o.ime), esc(o.oznaka), esc(o.naziv), zarez(o.minDeg) + ' … ' + zarez(o.maxDeg), String(o.vMax)])); break;
      case 'brojke': h = tbl('Brojke na tipkama privjeska', [['Brojka', 1], ['Tipka']],
        PODACI.PRIVJESAK.tipke.filter((t) => t.brojka != null).sort((a, b) => a.brojka - b.brojka).map((t) => [String(t.brojka), esc(t.natpis)])); break;
      case 'rs232': { const R = PODACI.RS232; h = tbl('Serijska veza RS-232C', [['Postavka'], ['Vrijednost']], [
        ['Brzina', R.baud + ' Bd'], ['Format', R.bitovi + ' bita, paritet ' + esc(R.paritet) + ', ' + R.stop + ' stop-bita (' + esc(R.zapis) + ')'], ['Kraj retka', esc(R.kraj) + ' (SW1 bit ' + R.krajPremaSW1.bit + ' gore: ' + esc(R.krajPremaSW1.gore) + ')'],
        ['Priključak', esc(R.konektor)], ['Preklopnici', esc(R.postavke)]]); break; }
      case 'prihvatnica': { const H = PODACI.PRIHVATNICA, G = PODACI.UPRAVLJANJE_ZADANO.gp; h = tbl('Motorna prihvatnica', [['Podatak'], ['Vrijednost']], [
        ['Oznaka i vrsta', esc(H.oznaka + ' — ' + H.tip)], ['Hod prstiju', '0–' + H.hodMm + ' mm'], ['Stupnjevi sile', String(H.stupnjevaSile) + ' (GP 0–' + H.gp.max + ')'], ['Najveća sila držanja', '≈ ' + zarez(H.silaMaxKgf) + ' kgf'],
        ['Bez napajanja', esc(H.bezNapajanja)], ['Nakon uključenja (simulator)', 'GP ' + G.pocetna + ', ' + G.drzanja + ', ' + G.vrijeme], ['Priključak', esc(H.sucelje)]]); break; }
      case 'paleta': { const L = PODACI.PALETA; h = '<p class="pom">' + esc(L.opis) + '</p>' + tbl('Paleta i: kutne pozicije', [['Pozicija'], ['Uloga']],
        L.kutovi.map((k) => [L.baza + '·i' + (k.pomak ? ' + ' + k.pomak : '') + ' (za i = 1: ' + (L.baza + k.pomak) + ')', esc(k.naziv)]).concat([['brojilo ' + L.baza + '·i + ' + L.brojilaStupac, 'redni broj mjesta u stupcu (od 1)'], ['brojilo ' + L.baza + '·i + ' + L.brojilaRed, 'redni broj mjesta u redu (od 1)']])); break; }
      case 'rukovanje': { const S = PODACI.SIMRV_SIGNALI; h = tbl('Signali rukovanja na SIM RV', [['Signal'], ['Smjer'], ['Značenje']], S.rukovanje.map((s) => [esc(s.id), s.smjer === 'ulaz' ? 'ulaz u DUM1 (preklopnik)' : 'izlaz iz DUM1 (LED)', esc(s.opis)]))
        + '<p class="vj-dod-n">Slijed IN</p><ol class="tekst">' + S.slijed.IN.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol><p class="vj-dod-n">Slijed OT</p><ol class="tekst">' + S.slijed.OT.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>'; break; }
      case 'memorija': { const M = PODACI.JEDINICA.memorija; h = tbl('Memorija DUM1', [['Podatak'], ['Vrijednost']], [
        ['Pozicije', M.pozicija + ' (' + M.pozicijaKB + ' KB)'], ['Programski redci', M.redaka + ' (' + M.retciKB + ' KB)'], ['Pohrana', esc(M.pohrana)], ['Pri uključenju', esc(PODACI.DUM1_PLOCA.st2.naziv)]]); break; }
      default: return '';
    }
  } catch (e) { return ''; }
  return '<div class="vj-dod">' + h + pretpHTML(kljuc) + '</div>';
}

/* ================================================================== otvorena vježba */
let AKT = null;   // trenutna vježba
const OPIS_KAD = (k) => k.nakon != null ? 'nakon ' + zarez(k.nakon) + ' s' : k.redak != null ? 'kad program dođe do retka ' + k.redak : k.izlaz != null ? 'kad je izlaz ' + k.izlaz + ' = ' + k.v : k.signal != null ? 'kad je ' + k.signal + ' = ' + k.v : '';
const OPIS_ULAZ = (d) => (typeof d.ulaz === 'number' ? 'ulaz ' + d.ulaz : d.ulaz) + ' = ' + (d.v ? 'H' : 'L');

function crtajVjezbu(v) {
  const i = VJEZBE.indexOf(v);
  $('vj-brojac').textContent = 'Vježba ' + (i + 1) + ' od ' + VJEZBE.length;
  $('vj-naslov').textContent = (i + 1) + '. ' + v.naslov;
  $('vj-meta').innerHTML = '<li>' + tezinaHTML(v.tezina) + '</li><li class="vj-sat">' + v.trajanje + ' min</li><li>' + v.koraci.length + ' koraka · ' + v.pitanja.length + ' pitanja</li>'
    + '<li class="vj-op"><b>Oprema:</b>&nbsp;' + esc(v.oprema.map((k) => OPREMA[k]).join(', ')) + '</li>';
  $('vj-cilj').innerHTML = '<b>Cilj:</b> ' + esc(v.cilj);
  $('vj-sim').href = 'upravljanje-robotom.html?vjezba=' + encodeURIComponent(v.id);
  $('vj-sim').setAttribute('aria-label', 'Otvori vježbu ' + (i + 1) + ' u simulatoru (Upravljanje robotom)');
  $('vj-uvod').textContent = v.uvod;
  $('vj-dodatak').innerHTML = v.dodatak ? dodatakHTML(v.dodatak) : '';
  $('vj-napomena').hidden = !v.napomena; $('vj-napomena').textContent = v.napomena || '';
  $('vj-prosirenje').textContent = v.prosirenje;
  /* koraci */
  $('vj-koraci').innerHTML = v.koraci.map((k, j) => '<li data-i="' + j + '"><label class="vj-kor"><input type="checkbox" id="vj-k-' + j + '" aria-describedby="vj-kx-' + j + '"><span class="n" aria-hidden="true"></span><span class="t">' + esc(k.tekst) + '</span></label>'
    + ((k.naredba || k.provjera) ? '<div class="vj-kor-x" id="vj-kx-' + j + '">' + (k.naredba ? '<pre><code>' + esc(k.naredba) + '</code></pre>' : '') + (k.provjera ? '<p class="vj-vidi"><b>Provjera:</b> ' + esc(k.provjera) + '</p>' : '') + '</div>' : '') + '</li>').join('');
  osvjeziKvacice();
  /* program */
  const red = programRedci(v);
  $('vj-kopiraj').hidden = $('vj-preuzmi').hidden = !v.program;
  $('vj-kod').hidden = !v.program;
  $('vj-kod-c').innerHTML = red.map((l) => { const m = /^(\d+)\s(.*)$/.exec(l); return '<span class="vj-r' + (m && m[2].startsWith("'") ? ' kom' : '') + '" data-redak="' + (m ? m[1] : '') + '"><span class="rb">' + esc(m ? m[1] : '') + '</span>' + esc(m ? m[2] : l) + '</span>'; }).join('');
  const prip = pripremaNaredbe(v, { program: false });
  $('vj-prip-d').hidden = !prip.length; $('vj-prip').textContent = prip.join('\n');
  let prazno = $('vj-prog-prazno');
  if (!v.program) { if (!prazno) { prazno = document.createElement('p'); prazno.id = 'vj-prog-prazno'; prazno.className = 'vj-prazno'; $('vj-kod').before(prazno); } prazno.textContent = 'Ova se vježba radi privjeskom i izravnim naredbama — nema programa. U simulatoru otvori privjesak i DUM1.'; prazno.hidden = false; }
  else if (prazno) prazno.hidden = true;
  $('vj-program-n').textContent = v.program ? 'Program (' + red.length + ' redaka)' : 'Program';
  $('vj-poruka').textContent = '';
  /* pozicije */
  const poz = Object.entries(v.pocetno.pozicije || {}).map(([n, t]) => [+n, t]).sort((a, b) => a[0] - b[0]);
  $('vj-poz-k').hidden = !v.program;
  $('vj-poz').innerHTML = poz.length ? '<caption class="vj-vh">Pozicije vježbe</caption><thead><tr><th scope="col" class="br">Br.</th><th scope="col">Naziv</th><th scope="col" class="br">X</th><th scope="col" class="br">Y</th><th scope="col" class="br">Z</th><th scope="col" class="br">P</th><th scope="col" class="br">R</th><th scope="col">O/C</th></tr></thead><tbody>'
    + poz.map(([n, t]) => '<tr' + (jePomak(t) ? ' class="pomak"' : '') + '><td class="br">' + n + '</td><td>' + esc(t.naziv || '') + '</td>' + [t.x, t.y, t.z, t.p, t.r].map((x) => '<td class="br">' + br1(x) + '</td>').join('') + '<td>' + esc(t.oc || 'O') + '</td></tr>').join('') + '</tbody>'
    : '<tbody><tr><td>Vježba ne koristi pozicije — pregled pokazuje samo ulaze i izlaze.</td></tr></tbody>';
  /* scenariji za pregled */
  const sc = v.scenariji || [];
  $('vj-scen-l').hidden = sc.length < 2;
  $('vj-scen').innerHTML = sc.map((s, k) => '<option value="' + k + '">' + esc(s.naziv) + '</option>').join('');
  $('vj-stanje').textContent = v.program ? 'Pritisni „Pregledaj gibanje” — program se izvodi u simulatoru DUM1' + (sc.some((s) => s.dogadaji.length) ? ', a signale SIM RV daje odabrani scenarij.' : '.') : '';
  /* SIM RV */
  const sr = v.simRV || [];
  $('vj-sim-k').hidden = !sr.length && !sc.some((s) => s.dogadaji.length);
  $('vj-simrv').innerHTML = sr.length ? '<caption class="vj-vh">Signali SIM RV u vježbi</caption><thead><tr><th scope="col">Bit / signal</th><th scope="col">Smjer</th><th scope="col">Značenje</th></tr></thead><tbody>'
    + sr.map((s) => '<tr><td>' + esc(s.bit) + '</td><td>' + (s.smjer === 'ulaz' ? 'ulaz (preklopnik)' : 'izlaz (LED)') + '</td><td>' + esc(s.opis) + '</td></tr>').join('') + '</tbody>' : '';
  $('vj-scenariji').innerHTML = sc.filter((s) => s.dogadaji.length).map((s) => '<div class="vj-scen"><h4>Scenarij: ' + esc(s.naziv) + '</h4><ol>' + s.dogadaji.map((d) => '<li>' + esc(OPIS_KAD(d.kad)) + ': ' + esc(OPIS_ULAZ(d)) + (d.opis ? ' — ' + esc(d.opis) : '') + '</li>').join('') + '</ol></div>').join('');
  /* pitanja */
  crtajPitanja(v);
  /* sigurnost */
  $('vj-sig').innerHTML = v.sigurnost.map((s) => '<li>' + esc(s) + '</li>').join('');
  /* prethodna / sljedeća */
  const pr = VJEZBE[i - 1], sl = VJEZBE[i + 1];
  $('vj-prije').hidden = !pr; if (pr) { $('vj-prije').href = '#' + pr.id; $('vj-prije').innerHTML = '&#8592; ' + esc((i) + '. ' + pr.naslov); }
  $('vj-dalje').hidden = !sl; if (sl) { $('vj-dalje').href = '#' + sl.id; $('vj-dalje').innerHTML = esc((i + 2) + '. ' + sl.naslov) + ' &#8594;'; }
}

/* ---------------------------------------------------------------- kvačice */
function osvjeziKvacice() {
  const v = AKT; if (!v) return;
  const set = new Set(Array.isArray(NAP[v.id]) ? NAP[v.id] : []);
  document.querySelectorAll('#vj-koraci > li').forEach((li) => { const j = +li.dataset.i; const c = set.has(j); li.classList.toggle('gotov', c); li.querySelector('input').checked = c; });
  const g = gotovihKoraka(v), n = v.koraci.length;
  $('vj-napredak').textContent = g + ' od ' + n + ' koraka';
  $('vj-traka').style.width = Math.round((100 * g) / n) + '%';
}
$('vj-koraci').addEventListener('change', (e) => {
  const inp = e.target.closest('input[type=checkbox]'); if (!inp || !AKT) return;
  const j = +inp.closest('li').dataset.i;
  const set = new Set(Array.isArray(NAP[AKT.id]) ? NAP[AKT.id] : []);
  if (inp.checked) set.add(j); else set.delete(j);
  NAP[AKT.id] = [...set].sort((a, b) => a - b);
  pisiNapredak(NAP); osvjeziKvacice();
});
$('vj-ponisti').addEventListener('click', () => { if (!AKT) return; delete NAP[AKT.id]; pisiNapredak(NAP); osvjeziKvacice(); });

/* ---------------------------------------------------------------- pitanja */
let bodovi = {};
function crtajPitanja(v) {
  bodovi = {};
  $('vj-pitanja').classList.add('vj-pitanja');
  $('vj-pitanja').innerHTML = v.pitanja.map((q, j) => {
    const red = poredak(q.odgovori.length, hash(v.id + ':' + j));
    return '<div class="kviz" data-j="' + j + '"><p class="brojac">Pitanje ' + (j + 1) + ' od ' + v.pitanja.length + '</p><p class="pit" id="vj-p-' + j + '">' + esc(q.p) + '</p><div class="odg" role="group" aria-labelledby="vj-p-' + j + '">'
      + red.map((o) => '<button type="button" data-o="' + o + '">' + esc(q.odgovori[o]) + '</button>').join('') + '</div><p class="obraz" aria-live="polite"></p></div>';
  }).join('') + '<div class="gumbi vj-nepr"><button type="button" class="gumb tanki" id="vj-pit-opet">Odgovori ponovno</button></div>';
  $('vj-rezultat').textContent = '0 od ' + v.pitanja.length + ' odgovoreno';
}
$('vj-pitanja').addEventListener('click', (e) => {
  if (e.target.closest('#vj-pit-opet')) { crtajPitanja(AKT); return; }
  const b = e.target.closest('.odg button'); if (!b || !AKT) return;
  const box = b.closest('.kviz'), j = +box.dataset.j, q = AKT.pitanja[j];
  if (bodovi[j] !== undefined) return;
  const o = +b.dataset.o, tocno = o === q.tocan;
  bodovi[j] = tocno;
  box.querySelectorAll('.odg button').forEach((x) => { x.disabled = true; const xo = +x.dataset.o; if (xo === q.tocan) x.classList.add('tocno'); else if (x === b) x.classList.add('netocno'); });
  const ob = box.querySelector('.obraz'); ob.classList.add('vidi');
  ob.innerHTML = (tocno ? '<b>Točno.</b> ' : '<b>Netočno.</b> Točan je odgovor: „' + esc(q.odgovori[q.tocan]) + '”. ') + esc(q.obj || '');
  const n = Object.keys(bodovi).length, t = Object.values(bodovi).filter(Boolean).length;
  $('vj-rezultat').textContent = n < AKT.pitanja.length ? n + ' od ' + AKT.pitanja.length + ' odgovoreno, točno ' + t : 'Točno ' + t + ' od ' + AKT.pitanja.length;
});

/* ---------------------------------------------------------------- kopiraj / preuzmi / ispis */
function poruka(t) { $('vj-poruka').textContent = t; }
async function kopiraj(tekst, opis) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(tekst); poruka(opis + ' je kopiran(a) u međuspremnik.'); return; }
  } catch (e) { /* idi na zamjenski način */ }
  try {
    const ta = document.createElement('textarea'); ta.value = tekst; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand && document.execCommand('copy'); ta.remove();
    poruka(ok ? opis + ' je kopiran(a) u međuspremnik.' : 'Kopiranje nije uspjelo — označi tekst i kopiraj ga ručno.');
  } catch (e) { poruka('Kopiranje nije uspjelo — označi tekst i kopiraj ga ručno.'); }
}
$('vj-kopiraj').addEventListener('click', () => AKT && kopiraj(programRedci(AKT).join('\n'), 'Program'));
$('vj-kopiraj-prip').addEventListener('click', () => AKT && kopiraj(pripremaNaredbe(AKT, { program: false }).join('\n'), 'Priprema'));
$('vj-preuzmi').addEventListener('click', () => {
  if (!AKT) return;
  try {
    const url = URL.createObjectURL(new Blob([tekstZaPreuzimanje(AKT)], { type: 'text/plain;charset=us-ascii' }));
    const a = document.createElement('a'); a.href = url; a.download = 'rvm1_' + AKT.id + '_program.txt'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    poruka('Preuzeta je datoteka rvm1_' + AKT.id + '_program.txt (priprema i program).');
  } catch (e) { poruka('Preuzimanje nije uspjelo u ovom pregledniku.'); }
});
function pripremiIspis() { const d = $('vj-prip-d'); if (d) d.open = true; zaustaviPregled(); }
window.addEventListener('beforeprint', pripremiIspis);
$('vj-ispis').addEventListener('click', () => { pripremiIspis(); window.print(); });

/* ================================================================== usmjeravanje (#v01 … ) */
function prikazi() {
  const id = decodeURIComponent((location.hash || '').slice(1));
  const v = VJEZBE.find((x) => x.id === id) || null;
  zaustaviPregled();
  if (!v) {
    const bila = AKT; AKT = null;
    $('vj-vjezba').hidden = true; $('vj-popis').hidden = false;
    crtajPopis();
    document.title = document.title.replace(/^Vježba \d+: [^—]* — /, '');
    if (bila) { const a = document.querySelector('.vj-kartica[data-id="' + bila.id + '"] h3 a'); if (a) { a.focus({ preventScroll: true }); a.closest('li').scrollIntoView({ block: 'center' }); } }
    return;
  }
  AKT = v;
  $('vj-popis').hidden = true; $('vj-vjezba').hidden = false;
  crtajVjezbu(v);
  document.title = 'Vježba ' + (VJEZBE.indexOf(v) + 1) + ': ' + v.naslov + ' — ' + document.title.replace(/^Vježba \d+: [^—]* — /, '');
  $('vj-vjezba').scrollIntoView({ block: 'start' });
  $('vj-naslov').focus({ preventScroll: true });
  postaviScenu();
  pratiVidljivost();
}
window.addEventListener('hashchange', prikazi);
$('vj-natrag').addEventListener('click', (e) => { e.preventDefault(); history.pushState(null, '', location.pathname + location.search); prikazi(); });

/* ================================================================== 3D pregled (lijeno učitavanje) */
let T3 = null, T3obecanje = null, promatrac = null;
const R2S = (x, y, z) => [x, z, -y];   /* KS robota → scena */
function pratiVidljivost() {
  if (T3 || !AKT || !AKT.program) return;
  const el = $('vj-3d');
  if (!('IntersectionObserver' in window)) { uci3D(); return; }
  if (promatrac) promatrac.disconnect();
  promatrac = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { promatrac.disconnect(); promatrac = null; uci3D(); } }, { rootMargin: '200px' });
  promatrac.observe(el);
}
function uci3D() {
  if (T3obecanje) return T3obecanje;
  T3obecanje = (async () => {
    try {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      const { napraviRVM1 } = await import('./rvm1_model.js');
      const el = $('vj-3d');
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
      const s1 = new THREE.DirectionalLight(0xffffff, 1.55); s1.position.set(1.2, 2.6, 1.8); scene.add(s1);
      const s2 = new THREE.DirectionalLight(0xffffff, 0.55); s2.position.set(-2, 1.2, -1.6); scene.add(s2);
      const debljina = (PODACI.STANICA && PODACI.STANICA.celicnaPloca && PODACI.STANICA.celicnaPloca.mjere[2]) || 0.015;
      const stol = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.9), new THREE.MeshStandardMaterial({ color: 0xb9c3c8, roughness: 0.85, metalness: 0.15 }));
      stol.position.set(0.15, -debljina - 0.0101, 0); scene.add(stol);
      const r = napraviRVM1(THREE, { ploca: true, kabeli: false, unutrasnjost: false });
      scene.add(r.korijen);
      const markeri = new THREE.Group(); r.robot.add(markeri);
      const tragGeo = new THREE.BufferGeometry(); const tragPoz = new Float32Array(3 * 8000); tragGeo.setAttribute('position', new THREE.BufferAttribute(tragPoz, 3)); tragGeo.setDrawRange(0, 0);
      const trag = new THREE.Line(tragGeo, new THREE.LineBasicMaterial({ color: 0x17a3ad })); trag.frustumCulled = false; r.robot.add(trag);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false; controls.minDistance = 0.3; controls.maxDistance = 3;
      camera.position.set(...R2S(0.95, 0.75, 0.62)); controls.target.set(...R2S(0.2, 0.02, 0.1)); controls.update();
      const render = () => renderer.render(scene, camera);
      controls.addEventListener('change', render);
      const velicina = () => { const w = el.clientWidth || 300, h = el.clientHeight || 260; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (T3) uokviri(); render(); };
      if ('ResizeObserver' in window) new ResizeObserver(velicina).observe(el); else window.addEventListener('resize', velicina);
      const oznake = new Map();
      function oznaka(tekst) {
        if (oznake.has(tekst)) return oznake.get(tekst);
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        g.fillStyle = '#17656E'; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold ' + (tekst.length > 2 ? 26 : 32) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tekst, 32, 34);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        const m = new THREE.SpriteMaterial({ map: tex, depthTest: false }); oznake.set(tekst, m); return m;
      }
      const kuglaGeo = new THREE.SphereGeometry(0.007, 16, 10), kuglaMat = new THREE.MeshStandardMaterial({ color: 0x2ecad4, emissive: 0x0b4a50, roughness: 0.4 });
      const crtaMat = new THREE.LineBasicMaterial({ color: 0x17656e });
      el.querySelector('.vj-3d-ucit')?.remove();
      T3 = { THREE, renderer, scene, camera, controls, r, markeri, trag, tragGeo, tragPoz, n: 0, render, velicina, oznaka, kuglaGeo, kuglaMat, crtaMat };
      velicina(); postaviScenu();
      return T3;
    } catch (e) {
      const u = $('vj-3d-ucit'); if (u) u.textContent = '3D pregled nije dostupan u ovom pregledniku (WebGL). Tablica pozicija ispod vrijedi i bez njega.';
      $('vj-igraj').disabled = true;
      return null;
    }
  })();
  return T3obecanje;
}
/** kamera tako da se vide robot i sve pozicije vježbe (koso sprijeda, malo odozgo) */
function uokviri() {
  if (!T3 || !AKT) return;
  const { THREE, camera, controls } = T3;
  const t = [[0, 0, 0], [0, 0, 0.56], [0.12, 0.12, 0.3], [0.12, -0.12, 0.3]];
  for (const p of Object.values(AKT.pocetno.pozicije || {})) if (!jePomak(p)) t.push([p.x / 1000, p.y / 1000, p.z / 1000]);
  const mn = [0, 1, 2].map((k) => Math.min(...t.map((p) => p[k]))), mx = [0, 1, 2].map((k) => Math.max(...t.map((p) => p[k])));
  const c = mn.map((v, k) => (v + mx[k]) / 2);
  const rad = Math.max(...t.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]))) + 0.05;
  const fov = (camera.fov * Math.PI) / 180, fovH = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
  const d = 0.84 * rad / Math.sin(Math.min(fov, fovH) / 2);
  const s = [1, 0.62, 0.62], n = Math.hypot(...s);
  const cs = new THREE.Vector3(...R2S(...c));
  camera.position.copy(cs).add(new THREE.Vector3(...R2S(...s.map((v) => (v / n) * d))));
  controls.target.copy(cs); controls.update();
}
function tlVjezbe(v) { return (typeof v.pocetno.tl === 'number' ? v.pocetno.tl : PODACI.TL_ZADANO) / 1000; }
function postaviScenu() {
  if (!T3 || !AKT) return;
  const { THREE, r, markeri } = T3;
  while (markeri.children.length) markeri.remove(markeri.children[0]);
  const poz = AKT.pocetno.pozicije || {};
  const pomaci = Object.values(poz).filter(jePomak);
  for (const [n, t] of Object.entries(poz)) {
    if (jePomak(t)) continue;
    const p = [t.x / 1000, t.y / 1000, t.z / 1000];
    const k = new THREE.Mesh(T3.kuglaGeo, T3.kuglaMat); k.position.set(...p); markeri.add(k);
    if (/^kružnica(, točka|: kraj)/.test(t.naziv || '')) continue;   /* međutočke kružnice bez oznake (pregled ostaje čitljiv) */
    const s = new THREE.Sprite(T3.oznaka(String(n))); s.scale.set(0.026, 0.026, 1); s.position.set(p[0], p[1], p[2] + 0.028); s.renderOrder = 2; markeri.add(s);
    for (const d of pomaci) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p), new THREE.Vector3(p[0] + d.x / 1000, p[1] + d.y / 1000, p[2] + d.z / 1000)]);
      markeri.add(new THREE.Line(g, T3.crtaMat));
    }
  }
  r.postaviTL(tlVjezbe(AKT)); r.postavi(PODACI.ORG); r.prihvatnica(1);
  uokviri();
  T3.n = 0; T3.tragGeo.setDrawRange(0, 0);
  T3.render();
}

/* ---------------------------------------------------------------- pregled gibanja: interpreter DUM1 + scenarij */
let PR = null;   // { d, sc, t, raf, zadnje, brzina, spanovi }
const bitovi = (b) => { const s = (b & 255).toString(2).padStart(8, '0'); return s.slice(0, 4) + ' ' + s.slice(4); };
function stanjeTekst(d, t, kraj) {
  const s = d.stanje;
  const g = s.greska.tip ? (s.greska.tip === 1 ? 'POGREŠKA I' : 'POGREŠKA II') + (s.greska.redak ? ' u retku ' + s.greska.redak : '') + ': ' + s.greska.poruka : '';
  return (kraj ? (g ? 'Program je stao. ' : 'Program je završio. ') : '') + 't = ' + zarez(t.toFixed(1)) + ' s · redak ' + (s.redak ?? '—') + ' · SP ' + s.sp + ' · TL ' + zarez(Math.round(s.tl * 1000)) + ' mm\n'
    + 'ulazi 7–0: ' + bitovi(s.ulazi) + ' · izlazi 7–0: ' + bitovi(s.izlazi) + ' · STB ' + s.signali.STB + ' BUSY ' + s.signali.BUSY + ' RDY ' + s.signali.RDY + ' ACK ' + s.signali.ACK + (g ? '\n' + g : '');
}
function istakniRedak(ln) {
  if (!PR) return;
  if (PR.akt === ln) return;
  if (PR.aktEl) PR.aktEl.classList.remove('akt');
  PR.akt = ln; PR.aktEl = ln != null ? PR.spanovi.get(String(ln)) : null;
  if (PR.aktEl) {
    PR.aktEl.classList.add('akt');
    const pre = $('vj-kod'), y = PR.aktEl.offsetTop - pre.offsetTop;
    if (y < pre.scrollTop || y > pre.scrollTop + pre.clientHeight - 24) pre.scrollTop = Math.max(0, y - pre.clientHeight / 2);
  }
}
async function pokreniPregled() {
  if (!AKT || !AKT.program) return;
  zaustaviPregled();
  const t3 = T3 || await uci3D();
  const v = AKT;
  const d = napraviStroj({ kin: KIN, podaci: PODACI });
  d.ukljuci(); d.posalji('NT'); d.azuriraj(60);
  for (const l of pripremaNaredbe(v)) { d.posalji(l); d.azuriraj(0.001); }
  const k = +($('vj-scen').value || 0), scen = (v.scenariji || [])[k] || null;
  const sc = napraviScenarij(d, scen);
  if (t3) { t3.n = 0; t3.tragGeo.setDrawRange(0, 0); t3.r.postaviTL(d.stanje.tl); }
  const r = d.posalji('RN');
  const spanovi = new Map(); document.querySelectorAll('#vj-kod-c .vj-r').forEach((s) => spanovi.set(s.dataset.redak, s));
  PR = { d, sc, t: 0, raf: 0, zadnje: performance.now(), spanovi, v, akt: null, aktEl: null };
  $('vj-igraj').setAttribute('aria-pressed', 'true'); $('vj-igraj').innerHTML = '&#9632; Zaustavi pregled';
  if (r && r.greska) { zavrsiPregled(true); return; }
  const DT = 0.02;
  const okvir = (sad) => {
    if (!PR || PR.v !== AKT) return;
    const brz = +$('vj-brzina').value || 1;
    let dt = Math.min(0.1, Math.max(0, (sad - PR.zadnje) / 1000)) * brz; PR.zadnje = sad;
    while (dt > 1e-6) { const h = Math.min(DT, dt); sc.korak(h); d.azuriraj(h); PR.t += h; dt -= h; }
    if (T3) {
      T3.r.postaviTL(d.stanje.tl); T3.r.postavi(d.stanje.q); T3.r.prihvatnica(d.stanje.prihvatnica.otvorenost);
      const f = KIN.fk(d.stanje.q, d.stanje.tl).p;
      if (T3.n < 8000) { T3.tragPoz.set(f, 3 * T3.n); T3.n++; T3.tragGeo.attributes.position.needsUpdate = true; T3.tragGeo.setDrawRange(0, T3.n); }
      T3.render();
    }
    istakniRedak(d.stanje.redak);
    const kraj = (!d.stanje.izvodi && !d.zauzet()) || d.stanje.greska.tip !== 0 || PR.t > 900;
    $('vj-stanje').textContent = stanjeTekst(d, PR.t, kraj);
    if (kraj) { zavrsiPregled(false); return; }
    PR.raf = requestAnimationFrame(okvir);
  };
  PR.raf = requestAnimationFrame(okvir);
}
function zavrsiPregled(odmah) {
  if (!PR) return;
  if (odmah) $('vj-stanje').textContent = stanjeTekst(PR.d, PR.t, true);
  cancelAnimationFrame(PR.raf); PR.sc.odjavi();
  istakniRedak(null);
  PR = null;
  $('vj-igraj').setAttribute('aria-pressed', 'false'); $('vj-igraj').innerHTML = '&#9654; Pregledaj gibanje';
}
function zaustaviPregled() { if (PR) zavrsiPregled(false); }
$('vj-igraj').addEventListener('click', () => { if (PR) { zaustaviPregled(); $('vj-stanje').textContent += '\nPregled je zaustavljen.'; } else pokreniPregled(); });
$('vj-scen').addEventListener('change', () => { if (PR) pokreniPregled(); });

/* ================================================================== početak */
crtajPopis();
prikazi();
window.VJEZBE_STRANICA = { VJEZBE, uci3D, get T3() { return T3; }, get pregled() { return PR ? { t: PR.t, redak: PR.d.stanje.redak, izvodi: PR.d.stanje.izvodi, greska: PR.d.stanje.greska.tip } : null; } };
