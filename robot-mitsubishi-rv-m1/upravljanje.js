/* FORTRONIQ · Robot Mitsubishi Movemaster EX RV-M1 — Upravljanje robotom.
   Privjesak (HTML prema fotografiji), prednja ploča i bočna vrata DUM1, SIM RV, PC terminal (MDI), program s brojevima redaka,
   tablica pozicija, stanje, 3D scena (robot na stanici MPS, DUM1, privjesak, SIM RV) i veza s pravim robotom (Web Serial).
   Jezgra je stroj stanja DUM1 iz rvm1_mrl.js; svi podaci robota, naredbe, tipke, pogreške i RS-232C iz rvm1_podaci.js.
   Parametri samog simulatora (primjeri programa, prečaci, zvuk) su u bloku SIM i popisani na stranici. © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviRVM1, napraviDUM1, napraviPrivjesak, napraviSimRV, napraviStolMPS } from './rvm1_model.js?v=01';
import * as KIN from './rvm1_kin.js';
import * as PODACI from './rvm1_podaci.js';
import { napraviDUM1 as napraviUpravljac } from './rvm1_mrl.js?v=01';
import * as SER from './rvm1_serijski.js?v=01';

const { KONFIG, NAREDBE, GRUPE_NAREDBI, PRIVJESAK, DUM1_PLOCA, POGRESKE, SIMRV_SIGNALI, RS232, BRZINE, TL_ZADANO, MJERE, OSI,
  UPRAVLJANJE_ZADANO, IZVORI, NAZIV_ROBOTA, TEKST_PRETPOSTAVKE, pretpostavke, JEZIK, FORMAT_ODGOVORA, NEST } = PODACI;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = Math.PI / 180;
const kr = (v, d = 1) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d).replace('.', ',').replace('-', '−'); };
const TL0 = TL_ZADANO > 1 ? TL_ZADANO / 1000 : TL_ZADANO;
const IO_BITA = KONFIG.ioKartica === 'A16B16' ? 16 : 8;
const LS_KLJUC = 'ftq-rvm1-upravljanje-program';

/* ================================================================== */
/* 1. Parametri simulatora (nisu podaci robota — popisani na stranici) */
/* ================================================================== */
const SIM = {
  dtMax: 0.02,                 /* najveći korak simulacije [s] */
  zujaloHz: 2400,              /* frekvencija zujala u pregledniku (pretpostavka) */
  bipTipka: 0.03, bipKratko: 0.15,
  serRazmak: 150,              /* razmak između redaka pri slanju programa pravom robotu [ms] (bez kontrole toka) */
  serTimeout: 2500,            /* čekanje odgovora na WH [ms] */
  trag: 30000,                 /* najviše točaka traga TCP-a */
  /* raster primjera: kocka koju primjeri koriste (oko baze X0, Z0 nađene iz kinematike) */
  kocka: { dx: 60, dy: 80, dz: 80, zMin: 30 }   /* zMin: najniži vrh alata iznad montažne plohe [mm] (razmak od stola) */
};
/* prečaci tipkovnice → id tipke privjeska (brojke 0–9 se dodaju iz PRIVJESAK.tipke) */
const PRECACI = [['Q', 'X+'], ['A', 'X-'], ['W', 'Y+'], ['S', 'Y-'], ['E', 'Z+'], ['D', 'Z-'], ['R', 'P+'], ['F', 'P-'], ['T', 'R+'], ['G', 'R-'],
  ['O', 'O'], ['C', 'C'], ['Enter', 'ENT'], ['I', 'INC'], ['U', 'DEC'], ['P', 'P.S'], ['L', 'P.C'], ['N', 'NST'], ['H', 'ORG'], ['M', 'MOV'], ['J', 'STEP'],
  ['Z', 'PTP'], ['X', 'XYZ'], ['V', 'TOOL']];
PRIVJESAK.tipke.filter((t) => t.brojka != null).forEach((t) => PRECACI.push([String(t.brojka), t.id]));
const TIPKA = Object.fromEntries(PRIVJESAK.tipke.map((t) => [t.id, t]));
const JOG_ID = new Set(PRIVJESAK.tipke.filter((t) => t.ptp).map((t) => t.id));

/* ================================================================== */
/* 2. Stroj stanja DUM1                                                */
/* ================================================================== */
const dum = napraviUpravljac({ kin: KIN, podaci: PODACI });
const st = dum.stanje;
const ui = { prljavo: true, ubrzanje: 1, trag: true, edIzmijenjen: false, prenosimo: false, sigPoz: '', sigProg: '', povijest: [], povI: -1, drzane: new Map(), poruka: '' };

/* ================================================================== */
/* 3. Primjeri programa (točke iz kinematike: dohvatljive za trenutne mjere) */
/* ================================================================== */
function bazaPrimjera() {
  const { dx, dy, dz, zMin } = SIM.kocka;
  const ok = (x, y, z) => KIN.dohvatljivo(KIN.izTocke({ x, y, z, p: -90, r: 0 }), TL0);
  for (let z = zMin; z <= 300; z += 10) {
    const xs = [];
    for (let x = 100; x <= 500; x += 10) {
      let sve = true;
      for (const a of [-dx, 0, dx]) { for (const b of [-dy, 0, dy]) { for (const c of [0, dz / 2, dz]) if (!ok(x + a, b, z + c)) { sve = false; break; } if (!sve) break; } if (!sve) break; }
      if (sve) xs.push(x);
    }
    if (xs.length) return { x: xs[Math.floor(xs.length / 2)], z };
  }
  return { x: 300, z: 60, nijeNadjeno: true };
}
const BAZA = bazaPrimjera();
const pd = (n, x, y, z, p = -90, r = 0) => 'PD ' + n + ', ' + [x, y, z, p, r].map((v) => (Math.round(v * 10) / 10).toFixed(1)).join(', ');
function napraviPrimjere() {
  const X = BAZA.x, Z = BAZA.z, h = 60;
  return [
    { id: 'uzmi', naslov: 'Uzmi i odloži (GO, GC, MS)', opis: 'Dio se uzima na mjestu A (pozicija 2) i odlaže na mjesto B (pozicija 4); prilaz i odmak okomito, pravocrtno (MS). Prihvatnica GO/GC.',
      tekst: ["' Uzmi i odlozi: pozicije 1 iznad A, 2 na A, 3 iznad B, 4 na B", pd(1, X, -60, Z + h), pd(2, X, -60, Z), pd(3, X, 60, Z + h), pd(4, X, 60, Z),
        "10 ' uzmi i odlozi", '20 SP 4', '30 GO', '40 MO 1, O', '50 MS 2, 5, O', '60 GC', '70 TI 5', '80 MS 1, 5, C', '90 MO 3, C', '100 MS 4, 5, C', '110 GO', '120 TI 5', '130 MS 3, 5, O', '140 ED'].join('\n') },
    { id: 'petlja', naslov: 'Petlja RC/NX s brojilom', opis: 'Robot tri puta ide između pozicija 1 i 2 (RC 3 … NX), brojilo 1 broji prolaze (IC 1); vrijednost pročitaj s CR 1.',
      tekst: ["' Petlja: tri puta izmedju pozicija 1 i 2", pd(1, X, -dyP(), Z + 40), pd(2, X, dyP(), Z + 40),
        '10 SP 5', '20 SC 1, 0', '30 RC 3', '40 MO 1', '50 MO 2', '60 IC 1', '70 NX', '80 MO 1', '90 ED'].join('\n') },
    { id: 'paleta', naslov: 'Paleta PA/PT (3 × 2 točke)', opis: 'Paleta 1: kutovi su pozicije 10–13, redni brojevi točke u brojilima 11 (stupac) i 12 (red). PT 1 računa točku kao poziciju 1, MA 1, 2 prilazi 40 mm iznad nje.',
      tekst: ["' Paleta 1: kutovi 10 (ishodiste), 11 (kraj stupca), 12 (kraj reda), 13 (dijagonala)", 'PD 2, 0.0, 0.0, 40.0, 0.0, 0.0',
        pd(10, X - 40, -60, Z), pd(11, X + 40, -60, Z), pd(12, X - 40, 60, Z), pd(13, X + 40, 60, Z),
        '10 SP 5', '20 PA 1, 3, 2', '30 SC 12, 1', '40 SC 11, 1', '50 PT 1', '60 MA 1, 2, O', '70 MO 1, O', '80 TI 3', '90 MA 1, 2, O',
        '100 IC 11', '110 CP 11', '120 SM 4, 50', '130 IC 12', '140 CP 12', '150 SM 3, 40', '160 ED'].join('\n') },
    { id: 'ulaz', naslov: 'Čekanje ulaza (TB) i izlaz (OB)', opis: 'Robot čeka da na SIM RV uključiš ulaz 0 (TB +0), zatim se giba na poziciju 2 i za to vrijeme pali izlaz 0 (OB +0).',
      tekst: ["' Ceka ulaz 0 (SIM RV), zatim prenosi i javlja izlazom 0", pd(1, X - 40, 0, Z + 50), pd(2, X + 40, 0, Z + 50),
        '10 SP 4', '20 OB -0', '30 MO 1', "40 ' cekaj ulaz 0", '50 TB +0, 80', '60 TI 1', '70 GT 50', '80 OB +0', '90 MO 2', '100 TI 5', '110 OB -0', '120 ED'].join('\n') },
    { id: 'kvadrat', naslov: 'Crtanje kvadrata (MS)', opis: 'Prihvatnica drži olovku (GC); vrh alata ide pravocrtno (MS, 10 međutočaka) po kvadratu 80 × 80 mm. Uključi trag vrha alata.',
      tekst: ["' Kvadrat 80 x 80 mm pravocrtnim gibanjem", pd(1, X - 40, -40, Z), pd(2, X + 40, -40, Z), pd(3, X + 40, 40, Z), pd(4, X - 40, 40, Z), pd(5, X - 40, -40, Z + 40),
        '10 SP 3', '20 GC', '30 MO 5, C', '40 MS 1, 10, C', '50 MS 2, 10, C', '60 MS 3, 10, C', '70 MS 4, 10, C', '80 MS 1, 10, C', '90 MS 5, 10, C', '100 ED'].join('\n') }
  ];
  function dyP() { return 60; }
}
const PRIMJERI = napraviPrimjere();

/* ================================================================== */
/* 4. Pomoćno: ispis, terminal                                         */
/* ================================================================== */
function termIspis(vrsta, tekst) {
  const el = $('term-izlaz'); const d = document.createElement('div'); d.className = 'tm-' + vrsta; d.textContent = tekst; el.appendChild(d);
  while (el.childNodes.length > 400) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}
function napomena(t) { ui.poruka = t; const el = $('pr-stanje'); if (el) el.textContent = t; }

dum.na('odgovor', (t) => termIspis('o', '< ' + t));
dum.na('greska', (g) => {
  if (!g || !g.tip) { termIspis('i', '  pogreška poništena'); return; }
  if (g.tip === 1) termIspis('g', '! POGREŠKA I. VRSTE (' + (g.led || '') + '): ' + g.poruka + ' — isključi i uključi DUM1, zatim NEST');
  else termIspis('g', '! POGREŠKA II. VRSTE' + (g.redak ? ' u retku ' + g.redak : '') + ' [' + g.kod + ']: ' + g.poruka + ' — RESET ili RS');
});
dum.na('program', () => { if (!ui.prenosimo) ui.programIzvana = true; });

/** naredba s računala (terminal, tablica pozicija, gumbi programa) — u zrcalnom načinu ide i pravom robotu */
async function posaljiNaredbu(tekst) {
  const T = String(tekst ?? '').replace(/[\r\n]+/g, ' ').trim().toUpperCase();
  if (!T) return null;
  const zrc = ser.veza && ser.zrcali && !ser.veza.zatvoreno;
  if (zrc && SER.jeGibanje(T) && !ser.veza.sigurnostPotvrdena) {
    termIspis('g', '! „' + T + '” nije poslano ni simulatoru ni robotu: najprije potvrdi sigurnosni popis (zrcalni način).');
    return null;
  }
  termIspis('s', '> ' + T);
  const r = dum.posalji(T);
  if (r.odbijeno) termIspis('g', '  odbijeno: ' + r.odbijeno);
  if (r.cekanje) termIspis('i', '  čeka dok DUM1 ne završi (u redu: ' + r.uRedu + ')');
  if (r.upisano) termIspis('i', '  redak upisan u program');
  if (zrc) await serPosalji(T);
  ui.prljavo = true;
  return r;
}

/* ================================================================== */
/* 5. Privjesak                                                        */
/* ================================================================== */
const SEG = { a: 'M10 3H34L30 8H14Z', b: 'M36 5L31 10V29L36 32Z', c: 'M36 35L31 38V57L36 62Z', d: 'M10 65H34L30 60H14Z', e: 'M8 35L13 38V57L8 62Z', f: 'M8 5L13 10V29L8 32Z', g: 'M11 34L14 31H30L33 34L30 37H14Z' };
const ZNAK7 = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '', '!': 'b' };
function crtajZaslonPrivjeska() {
  $('tb-zaslon').innerHTML = Array.from({ length: (PRIVJESAK.zaslon && PRIVJESAK.zaslon.znamenke) || 4 }, (_, i) =>
    `<svg viewBox="0 0 46 70" data-z="${i}" aria-hidden="true" focusable="false"><g transform="skewX(-5) translate(4 0)">${Object.entries(SEG).map(([k, d]) => `<path class="seg" data-s="${k}" d="${d}"/>`).join('')}<circle class="seg" data-s="p" cx="40" cy="64" r="2.6"/></g></svg>`).join('');
}
function postaviZaslon(t) {
  const s = String(t ?? '').padEnd(4, ' ').slice(0, 4);
  document.querySelectorAll('#tb-zaslon svg').forEach((svg, i) => {
    const ch = s[i] || ' ', on = ZNAK7[ch] ?? '';
    svg.querySelectorAll('.seg').forEach((p) => p.classList.toggle('on', on.includes(p.dataset.s) || (ch === '!' && p.dataset.s === 'p')));
  });
  $('tb-zaslon').setAttribute('aria-label', 'Zaslon privjeska: „' + s + '”');
  if (privM) privM.userData.zaslon(s.replace(/ /g, ' '));
  ui.prljavo = true;
}
function crtajPrivjesak() {
  $('tb-natpis').textContent = PRIVJESAK.naziv;
  const emg = PRIVJESAK.elementi.find((e) => e.id === 'emg'); $('tb-emg-ozn').textContent = emg ? emg.natpis : 'EMG STOP';
  crtajZaslonPrivjeska();
  const t = [...PRIVJESAK.tipke].sort((a, b) => a.red - b.red || a.stupac - b.stupac);
  $('tb-tipke').innerHTML = t.map((k) => {
    const dij = String(k.natpis).split(' / ');
    const sad = dij.length > 1 ? `<span class="g${dij[0].length > 4 ? ' s' : ''}">${esc(dij[0])}</span><span class="d${dij[1].length > 4 ? ' s' : ''}">${esc(dij[1])}</span>` : esc(k.natpis);
    const opis = k.natpis.replace(' / ', ' ili ') + ': ' + (k.opis || '') + (k.brojka != null ? ' (brojka ' + k.brojka + ')' : '');
    return `<button type="button" class="tb-k ${k.boja === 'smeda' ? 'smeda' : 'bijela'}${dij.length > 1 ? ' dva' : ''}" data-tipka="${esc(k.id)}" style="grid-row:${k.red};grid-column:${k.stupac >= 3 ? k.stupac + 1 : k.stupac}" aria-label="${esc(opis)}" title="${esc(opis)}">${sad}</button>`;
  }).join('');
  postaviZaslon(dum.privjesak.zaslon());
}
function pritisniTipku(id, v, el) {
  const b = el || document.querySelector(`#tb-tipke [data-tipka="${CSS.escape(id)}"]`);
  if (v) { if (ui.drzane.has(id)) return; ui.drzane.set(id, true); } else { if (!ui.drzane.has(id)) return; ui.drzane.delete(id); }
  if (b) b.classList.toggle('drzi', v);
  if (privM) privM.userData.pritisni(id, v);
  dum.privjesak.tipka(id, v);
  osvjeziTb();
  if (v && !st.privjesakON && st.napajanje) napomenaTb('Privjesak je OFF — tipke ne rade. Prebaci preklopnik na ON.', true);
  else if (v && !st.napajanje) napomenaTb('DUM1 je isključen — tipke ne rade.', true);
  ui.prljavo = true;
}
function pustiSve() { [...ui.drzane.keys()].forEach((id) => pritisniTipku(id, false)); }
function napomenaTb(t, privremeno = false) { if (!privremeno && performance.now() < (ui.tbDo || 0)) return; if (privremeno) ui.tbDo = performance.now() + 2500; $('tb-stanje').textContent = t; }
function osvjeziTb() {
  const n = dum.privjesak.nacin, nac = (PRIVJESAK.nacini || []).find((x) => x.id === n);
  $('tb-nacin').textContent = n; $('tb-nacin-op').textContent = nac ? '— ' + nac.opis : '';
  $('tb-onoff').setAttribute('aria-checked', String(st.privjesakON));
  $('tb-emg').setAttribute('aria-pressed', String(!!st.emg.privjesak));
  if (!st.napajanje) napomenaTb('DUM1 je isključen'); else if (st.privjesakON) napomenaTb('ON — tipke aktivne, naredbe s računala se odbijaju'); else napomenaTb('OFF — rad s računala');
}
function veziPrivjesak() {
  const tb = $('tb-tipke');
  tb.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-tipka]'); if (!b || e.button > 0) return;
    e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* */ }
    pritisniTipku(b.dataset.tipka, true, b);
  });
  const pusti = (e) => { const b = e.target.closest && e.target.closest('[data-tipka]'); if (b) pritisniTipku(b.dataset.tipka, false, b); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => tb.addEventListener(ev, pusti));
  tb.addEventListener('keydown', (e) => { const b = e.target.closest('[data-tipka]'); if (!b || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); e.stopPropagation(); if (!e.repeat) pritisniTipku(b.dataset.tipka, true, b); });
  tb.addEventListener('keyup', (e) => { const b = e.target.closest('[data-tipka]'); if (!b || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); e.stopPropagation(); pritisniTipku(b.dataset.tipka, false, b); });
  tb.addEventListener('click', (e) => e.preventDefault());
  $('tb-onoff').addEventListener('click', () => { pustiSve(); dum.privjesak.ukljuci(!st.privjesakON); osvjeziTb(); });
  $('tb-emg').addEventListener('click', () => {
    const v = !st.emg.privjesak; dum.hitniStop('privjesak', v); if (privM) privM.userData.pritisni('EMG', v); osvjeziTb(); osvjeziDum1();
  });
  /* prečaci tipkovnice */
  const mapa = new Map(PRECACI.map(([k, id]) => [k.length === 1 ? k.toLowerCase() : k, id]));
  const uPolju = (t) => t && t.closest && t.closest('input,textarea,select,button:not(.tb-k),summary,a,label,[contenteditable]');
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || uPolju(e.target)) return;
    if (e.key === 'Escape') { if (!st.emg.dum1) { dum.hitniStop('dum1', true); osvjeziDum1(); } e.preventDefault(); return; }
    const id = mapa.get(e.key.length === 1 ? e.key.toLowerCase() : e.key); if (!id) return;
    e.preventDefault(); if (!e.repeat) pritisniTipku(id, true);
  });
  document.addEventListener('keyup', (e) => { const id = mapa.get(e.key.length === 1 ? e.key.toLowerCase() : e.key); if (id && ui.drzane.has(id)) pritisniTipku(id, false); });
  window.addEventListener('blur', pustiSve);
}
dum.na('zaslon', (t) => postaviZaslon(t));

/* ================================================================== */
/* 6. DUM1: prednja ploča, bočna vrata, zujalo                          */
/* ================================================================== */
function bojaKlasa(b) { b = String(b || '').toLowerCase().replace(/ž/g, 'z'); return b.includes('zut') && b.includes('crven') ? 'emg' : b.includes('zut') ? 'zuta' : b.includes('crven') ? 'crvena' : b.includes('zelen') ? 'zelena' : 'bijela'; }
function crtajDum1() {
  $('dum-ploca').innerHTML = DUM1_PLOCA.prednja.map((el) => {
    const k = bojaKlasa(el.boja);
    const elem = el.vrsta === 'led'
      ? `<span class="led ${k}" data-led="${esc(el.id)}" role="img" aria-label="${esc(el.natpis)}: ugašena"></span>`
      : `<button type="button" class="dt ${k}" data-dt="${esc(el.id)}" ${el.id === 'emg' ? 'aria-pressed="false"' : ''} aria-label="${esc(el.natpis + ': ' + el.opis)}" title="${esc(el.opis)}"></button>`;
    return `<div class="dum-el">${elem}<span class="dum-oz">${esc(el.natpis)}</span></div>`;
  }).join('');
  const mr = DUM1_PLOCA.straznja.find((x) => x.id === 'mreza');
  $('mreza-ozn').textContent = 'Glavni prekidač ' + (mr ? mr.natpis : 'POWER') + ' (stražnja ploča)';
  /* bočna vrata */
  $('vr-led').innerHTML = DUM1_PLOCA.led.map((l) => { const p = POGRESKE.I.find((x) => x.led === l); return `<span title="${esc(p ? p.uzrok : '')}"><i class="led crvena" data-led="${l}"></i>${l}</span>`; }).join('');
  $('sw1').innerHTML = DUM1_PLOCA.sw1.map((b) => `<button type="button" class="sw" role="switch" data-sw="${b.bit}" aria-checked="${!!st.preklopnici.sw1[b.bit]}" aria-label="SW1 bit ${b.bit}: ${esc(b.naziv)} (gore: ${esc(b.gore)}, dolje: ${esc(b.dolje)})" title="${esc(b.naziv)}"><i></i>${b.bit}</button>`).join('');
  $('vr-st').innerHTML = `<span>${esc(DUM1_PLOCA.st1.naziv)}: <b id="st1-v"></b></span><label><input type="checkbox" id="st2"> ${esc(DUM1_PLOCA.st2.naziv)}</label>`;
  const kv = [['LED1', 'Servo pogreška (sudar)'], ['LED2', 'Odspoji kabel motora'], ['LED5', 'Prazna baterija']];
  $('kvarovi').innerHTML = kv.filter(([l]) => DUM1_PLOCA.led.includes(l)).map(([l, t]) => `<button type="button" class="gumb tanki" data-kvar="${l}">${esc(t)} (${l})</button>`).join('')
    + '<button type="button" class="gumb tanki" id="ext-emg" aria-pressed="false">Vanjski STOP u nuždi (EXT EMG STP)</button>';
  osvjeziSw1(); osvjeziDum1();
}
function osvjeziSw1() {
  document.querySelectorAll('#sw1 [data-sw]').forEach((b) => b.setAttribute('aria-checked', String(!!st.preklopnici.sw1[+b.dataset.sw])));
  $('sw1-op').innerHTML = DUM1_PLOCA.sw1.map((b) => `<li><b>${b.bit}</b> ${esc(b.naziv)}: <b>${esc(st.preklopnici.sw1[b.bit] ? b.gore : b.dolje)}</b></li>`).join('');
  const s1 = $('st1-v'); if (s1) s1.textContent = String(st.preklopnici.st1);
  const s2 = $('st2'); if (s2) s2.checked = !!st.preklopnici.st2;
}
function osvjeziDum1() {
  const L = st.led;
  document.querySelectorAll('[data-led]').forEach((el) => {
    const on = !!L[el.dataset.led]; el.classList.toggle('on', on);
    if (el.getAttribute('role') === 'img') el.setAttribute('aria-label', el.dataset.led.toUpperCase() + ': ' + (on ? 'svijetli' : 'ugašena'));
    if (dumM) dumM.postaviLED(el.dataset.led, on);
  });
  const emg = document.querySelector('[data-dt="emg"]'); if (emg) emg.setAttribute('aria-pressed', String(!!st.emg.dum1));
  const ee = $('ext-emg'); if (ee) ee.setAttribute('aria-pressed', String(!!st.emg.vanjski));
  $('glavni').setAttribute('aria-checked', String(st.napajanje));
  const g = st.greska, el = $('dum-greska');
  el.classList.toggle('g1', g.tip === 1); el.classList.toggle('g2', g.tip === 2);
  el.textContent = !st.napajanje ? 'Isključeno.' : g.tip === 1 ? 'Pogreška I. vrste (' + g.led + '): ' + g.poruka + '. ' + POGRESKE.ponistavanjeI
    : g.tip === 2 ? 'Pogreška II. vrste [' + g.kod + ']: ' + g.poruka + '. Poništavanje: ' + POGRESKE.ponistavanjeII.join(', ') + '.'
    : !st.nestGotov ? 'Uključeno — NEST nije napravljen (privjesak NST, ENT ili naredba NT).' : 'Spremno.';
  if (simM) simM.postaviSignal('POWER', st.napajanje);
  ui.prljavo = true;
}
function veziDum1() {
  $('dum-ploca').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dt]'); if (!b) return;
    const id = b.dataset.dt;
    if (id === 'emg') dum.hitniStop('dum1', !st.emg.dum1);
    else if (id === 'start') { if (!dum.startTipka(false)) napomena(st.preklopnici.sw1[5] ? 'START je preklopnikom SW1 bit 5 prebačen na vanjski ulaz.' : 'START ne pokreće: provjeri napajanje, pogrešku, privjesak (mora biti OFF) i program.'); }
    else if (id === 'stop') dum.stopTipka();
    else if (id === 'reset') dum.resetTipka();
    osvjeziDum1(); osvjeziTb();
  });
  $('glavni').addEventListener('click', () => {
    pustiSve();
    if (st.napajanje) dum.iskljuci(); else dum.ukljuci();
    osvjeziDum1(); osvjeziTb(); osvjeziSim();
  });
  $('sw1').addEventListener('click', (e) => { const b = e.target.closest('[data-sw]'); if (!b) return; const bit = +b.dataset.sw; dum.postaviPreklopnik('SW1', !st.preklopnici.sw1[bit], bit); osvjeziSw1(); });
  $('vr-st').addEventListener('change', (e) => { if (e.target.id === 'st2') dum.postaviPreklopnik('ST2', e.target.checked); });
  $('kvarovi').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'ext-emg') dum.hitniStop('vanjski', !st.emg.vanjski);
    else if (b.dataset.kvar) { if (!st.napajanje) napomena('DUM1 je isključen.'); else dum.sklopovskaGreska(b.dataset.kvar); }
    osvjeziDum1();
  });
  $('vrata').addEventListener('toggle', () => { if (dumM) { dumM.otvori($('vrata').open ? 1 : 0); ui.prljavo = true; } });
  $('zvuk').addEventListener('click', () => zvukUkljuci(!zvuk.on));
}
dum.na('led', () => osvjeziDum1());

/* zujalo: WebAudio, samo na zahtjev korisnika */
const zvuk = { ctx: null, gain: null, on: false, neprekidno: false, isprekidano: false, bipDo: 0 };
function zvukUkljuci(v) {
  try {
    if (v && !zvuk.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { napomena('Preglednik ne podržava zvuk (WebAudio).'); return; }
      zvuk.ctx = new AC(); const o = zvuk.ctx.createOscillator(); o.type = 'square'; o.frequency.value = SIM.zujaloHz;
      zvuk.gain = zvuk.ctx.createGain(); zvuk.gain.gain.value = 0; o.connect(zvuk.gain).connect(zvuk.ctx.destination); o.start();
    }
    zvuk.on = !!v;
    if (zvuk.ctx) { if (v) zvuk.ctx.resume(); else zvuk.ctx.suspend(); }
  } catch (e) { zvuk.on = false; }
  $('zvuk').setAttribute('aria-pressed', String(zvuk.on)); $('zvuk').textContent = zvuk.on ? 'Utišaj zujalo' : 'Uključi zvuk';
}
dum.na('zvuk', (z) => {
  if (z.vrsta === 'neprekidno') zvuk.neprekidno = !!z.ukljuceno;
  else if (z.vrsta === 'isprekidano') zvuk.isprekidano = !!z.ukljuceno;
  else if (z.vrsta === 'tipka' || z.vrsta === 'kratko') zvuk.bipDo = performance.now() + 1000 * (z.vrsta === 'tipka' ? SIM.bipTipka : SIM.bipKratko);
});
function azurirajZvuk() {
  if (!zvuk.gain) return;
  const t = zvuk.on && st.napajanje && (zvuk.neprekidno || (zvuk.isprekidano && st.led.error) || performance.now() < zvuk.bipDo);
  const v = t ? 0.05 : 0; if (zvuk.gain.gain.value !== v) zvuk.gain.gain.value = v;
}

/* ================================================================== */
/* 7. SIM RV                                                           */
/* ================================================================== */
function crtajSim() {
  const S = SIMRV_SIGNALI, ruk = (id) => S.rukovanje.find((x) => x.id === id) || { id, opis: '' };
  const prek = (ime, label, opis) => `<button type="button" class="sim-p" role="switch" aria-checked="false" data-sim="${ime}" aria-label="${esc(label + ': ' + opis)}" title="${esc(opis)}"><i></i></button>`;
  const ulazi = S.ulazi.slice(0, 8).map((u) => `<span class="sim-c">${prek(u.bit, 'INPUT bit ' + u.bit, u.opis)}${u.bit === 0 ? 'bit0' : u.natpis}</span>`).join('');
  const izlazi = S.izlazi.slice(0, 8).map((u) => `<span class="sim-c"><i class="sim-led" data-simizl="${u.bit}" title="${esc(u.opis)}"></i>${u.bit === 0 ? 'bit0' : u.natpis}</span>`).join('');
  $('simrv').innerHTML = `<div><div class="sim-grupa"><p class="sim-naslov">INPUT</p><div class="sim-hl"><span>H</span><span>L ↓</span></div><div class="sim-red">${ulazi}</div></div>
    <div class="sim-grupa" style="margin-top:8px"><p class="sim-naslov">OUTPUT</p><div class="sim-red">${izlazi}</div></div>
    <div class="sim-donje"><div class="sim-mala"><span class="sim-c">${prek('STB', 'STB', ruk('STB').opis)}STB</span><span class="sim-c">${prek('ACK', 'ACK', ruk('ACK').opis)}ACK</span></div>
    <div class="sim-mala"><span class="sim-c"><i class="sim-led zel" data-simsig="RDY" title="${esc(ruk('RDY').opis)}"></i>RDY</span><span class="sim-c"><i class="sim-led zel" data-simsig="BUSY" title="${esc(ruk('BUSY').opis)}"></i>BUSY</span></div></div></div>
    <div class="sim-desno"><span class="sim-ime">${esc(S.naziv)}</span><span class="sim-pw"><i class="sim-led zel" data-simsig="POWER" title="${esc(S.power.opis)}"></i>POWER</span></div>`;
  $('sim-napomena').textContent = 'Prekidač gore (H) = ulaz 1. ' + S.raspored.replace(/\s*\[foto\]/g, '') + ' Slijed rukovanja (pretpostavka): IN — ' + S.slijed.IN.join(' → ') + '; OT — ' + S.slijed.OT.join(' → ') + '.';
  $('simrv').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sim]'); if (!b) return;
    const k = b.dataset.sim, v = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(v));
    if (k === 'STB' || k === 'ACK') { dum.postaviUlaz(k, v); if (simM) simM.postaviSignal(k, v); }
    else { dum.postaviUlaz(+k, v); if (simM) simM.postaviUlaz(+k, v); }
    osvjeziSim(); ui.prljavo = true;
  });
  osvjeziSim();
}
function osvjeziSim() {
  document.querySelectorAll('[data-simizl]').forEach((l) => l.classList.toggle('on', st.napajanje && !!dum.izlaz(+l.dataset.simizl)));
  document.querySelectorAll('[data-simsig]').forEach((l) => { const s = l.dataset.simsig; l.classList.toggle('on', st.napajanje && (s === 'POWER' ? true : !!dum.izlaz(s))); });
  if (simM) { simM.postaviIzlaze(st.napajanje ? st.izlazi : 0); simM.postaviSignal('RDY', st.napajanje && !!st.signali.RDY); simM.postaviSignal('BUSY', st.napajanje && !!st.signali.BUSY); simM.postaviSignal('POWER', st.napajanje); }
  ui.prljavo = true;
}
dum.na('izlaz', () => osvjeziSim());

/* ================================================================== */
/* 8. Terminal i pomoć s naredbama                                     */
/* ================================================================== */
function crtajTerminal() {
  $('br-naredbi').textContent = NAREDBE.length;
  const html = GRUPE_NAREDBI.map((g) => {
    const n = NAREDBE.filter((x) => x.grupa === g.id);
    return `<div class="pg" data-grupa="${g.id}"><p class="pg-h">${g.slovo}. ${esc(g.naziv)} (${n.length})</p>${n.map((x) => `<button type="button" class="pn" data-primjer="${esc(x.primjer)}" data-trazi="${esc((x.kod + ' ' + x.naziv + ' ' + x.nazivHr + ' ' + x.opis).toLowerCase())}"><b>${esc(x.kod)}</b><span class="ps">${esc(x.sintaksa)} — ${esc(x.nazivHr)}${x.samoIzravno ? ' · samo izravno' : ''}</span><span class="po">${esc(x.opis)}</span><span class="pp">primjer: <code>${esc(x.primjer)}</code>${x.pretpostavka ? ' <span class="pz">(sintaksa ili ponašanje djelomično pretpostavljeni)</span>' : ''}</span></button>`).join('')}</div>`;
  }).join('');
  $('pomoc-popis').innerHTML = html;
  $('pomoc-popis').addEventListener('click', (e) => { const b = e.target.closest('[data-primjer]'); if (!b) return; const u = $('term-ulaz'); u.value = b.dataset.primjer; u.focus(); });
  $('pomoc-filtar').addEventListener('input', () => {
    const q = $('pomoc-filtar').value.trim().toLowerCase();
    document.querySelectorAll('#pomoc-popis .pn').forEach((b) => { b.hidden = !!q && !b.dataset.trazi.includes(q); });
    document.querySelectorAll('#pomoc-popis .pg').forEach((g) => { g.hidden = ![...g.querySelectorAll('.pn')].some((b) => !b.hidden); });
  });
  $('term-forma').addEventListener('submit', (e) => {
    e.preventDefault(); const u = $('term-ulaz'), t = u.value.trim(); if (!t) return;
    ui.povijest.push(t); if (ui.povijest.length > 100) ui.povijest.shift(); ui.povI = ui.povijest.length; u.value = '';
    posaljiNaredbu(t);
  });
  $('term-ulaz').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault(); const P = ui.povijest; if (!P.length) return;
    ui.povI = Math.max(0, Math.min(P.length, ui.povI + (e.key === 'ArrowUp' ? -1 : 1)));
    $('term-ulaz').value = ui.povI < P.length ? P[ui.povI] : '';
  });
  termIspis('i', 'Terminal kao PC spojen na RS-232C (' + RS232.zapis + '). DUM1 je isključen — uključi glavni prekidač.');
}

/* ================================================================== */
/* 9. Program                                                          */
/* ================================================================== */
const ed = () => $('ed-tekst');
function postaviTekst(t, izmijenjeno = true) { ed().value = String(t ?? '').replace(/\r\n?/g, '\n'); ui.edIzmijenjen = izmijenjeno; crtajBrojeve(); oznaciRedak(); osvjeziProgStanje(); }
function crtajBrojeve() { const n = ed().value.split('\n').length; $('ed-brin').innerHTML = Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join(''); skrolBrojeva(); }
function skrolBrojeva() { $('ed-brin').style.transform = `translateY(${-ed().scrollTop}px)`; oznaciRedak(); }
function redakUEditoru(broj) {
  if (broj == null) return -1;
  const L = ed().value.split('\n'); for (let i = 0; i < L.length; i++) { const m = /^\s*(\d+)/.exec(L[i]); if (m && +m[1] === broj) return i; }
  return -1;
}
function oznaciRedak() {
  const poz = (el, i) => { if (i < 0) { el.style.display = 'none'; return; } el.style.display = 'block'; el.style.top = (6 + i * 18 - ed().scrollTop) + 'px'; };
  poz($('ed-pok'), st.izvodi || dum.zauzet() ? redakUEditoru(st.redak) : -1);
  poz($('ed-gr'), st.greska.tip === 2 ? redakUEditoru(st.greska.redak) : -1);
}
function osvjeziProgStanje() {
  const n = st.program.size;
  const t = (n ? 'DUM1: ' + n + (n === 1 ? ' redak' : ' redaka') : 'DUM1: nema programa') + (ui.edIzmijenjen ? ' · uređivač nije prenesen' : '') + (ui.programIzvana ? ' · program u DUM1 mijenjan s terminala' : '');
  if (!ui.poruka) $('pr-stanje').textContent = t; else $('pr-stanje').textContent = ui.poruka;
  const r = st.redak, tx = r != null ? st.program.get(r) : null;
  $('pr-redak').textContent = st.izvodi ? 'Izvodi se redak ' + String(r).padStart(4, '0') + ': ' + (tx || '') : (r != null ? 'Zadnji redak: ' + String(r).padStart(4, '0') + ' ' + (tx || '') : '');
}
/** prenosi tekst uređivača u DUM1: DL 1, 2048, zatim redak po redak (s brojem → program, bez broja → izvršava se) */
function prenesi() {
  if (!st.napajanje) { napomena('Uključi DUM1 (glavni prekidač).'); return false; }
  if (st.privjesakON) { napomena('Privjesak je ON — za rad s računala prebaci ga na OFF.'); return false; }
  if (st.greska.tip) { napomena('Najprije poništi pogrešku (' + (st.greska.tip === 1 ? 'isključi i uključi DUM1' : 'RESET ili RS') + ').'); return false; }
  if (dum.zauzet()) { napomena('DUM1 još izvodi naredbu ili program — pričekaj ili STOP.'); return false; }
  ui.prenosimo = true; ui.poruka = '';
  let nProg = 0, nIzr = 0, greska = null;
  dum.posalji('DL 1, ' + JEZIK.redci.max);
  const L = ed().value.split('\n');
  for (let i = 0; i < L.length; i++) {
    const l = L[i].trim(); if (!l) continue;
    const r = dum.posalji(l.toUpperCase());
    if (r.greska || r.odbijeno || st.greska.tip) { greska = { i, l, r }; break; }
    if (/^\d/.test(l)) nProg++; else nIzr++;
  }
  ui.prenosimo = false; ui.programIzvana = false;
  if (greska) { napomena('Prijenos stao u retku ' + (greska.i + 1) + ' uređivača („' + greska.l + '”).'); termIspis('g', '  prijenos programa stao u retku ' + (greska.i + 1) + ': ' + greska.l); return false; }
  ui.edIzmijenjen = false;
  termIspis('i', '  preneseno u DUM1: ' + nProg + ' programskih redaka, ' + nIzr + ' izravnih naredbi');
  osvjeziProgStanje(); ui.prljavo = true;
  return true;
}
function veziProgram() {
  $('pr-primjer').innerHTML = PRIMJERI.map((p) => `<option value="${p.id}">${esc(p.naslov)}</option>`).join('');
  const opis = () => { const p = PRIMJERI.find((x) => x.id === $('pr-primjer').value); $('pr-opis').textContent = p ? p.opis : ''; };
  $('pr-primjer').addEventListener('change', opis); opis();
  $('pr-ucitaj-primjer').addEventListener('click', () => ucitajPrimjer($('pr-primjer').value));
  ed().addEventListener('input', () => { ui.edIzmijenjen = true; ui.poruka = ''; crtajBrojeve(); osvjeziProgStanje(); });
  ed().addEventListener('scroll', skrolBrojeva);
  $('pr-prenesi').addEventListener('click', () => prenesi());
  $('pr-iz').addEventListener('click', () => { postaviTekst(dum.ispisPrograma(), false); ui.programIzvana = false; ui.poruka = ''; osvjeziProgStanje(); });
  $('pr-rn').addEventListener('click', () => {
    ui.poruka = '';
    if (ui.edIzmijenjen && ed().value.trim() && !prenesi()) return;
    if (!st.napajanje) { napomena('Uključi DUM1.'); return; }
    if (st.privjesakON) { napomena('Privjesak je ON — prebaci ga na OFF.'); return; }
    if (!st.nestGotov) napomena('NEST još nije napravljen — prva naredba gibanja javit će pogrešku II. Pošalji NT.');
    posaljiNaredbu('RN');
  });
  $('pr-step').addEventListener('click', () => {
    ui.poruka = '';
    if (ui.edIzmijenjen && ed().value.trim() && !prenesi()) return;
    if (!dum.korak()) napomena(dum.zauzet() ? 'Pričekaj kraj tekućeg retka.' : 'Korak nije moguć (napajanje, pogreška ili nema programa).');
    else termIspis('i', '  STEP: redak ' + st.redak);
  });
  $('pr-stop').addEventListener('click', () => { dum.stopTipka(); termIspis('i', '  STOP: program staje nakon tekuće naredbe'); });
  $('pr-spremi').addEventListener('click', () => {
    const b = new Blob([ed().value.replace(/\n/g, '\r\n')], { type: 'text/plain' }); const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'program-rv-m1.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  $('pr-datoteka').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { postaviTekst(String(r.result)); napomena('Učitano: ' + f.name + ' — RN ga prenosi u DUM1.'); }; r.readAsText(f); e.target.value = '';
  });
  $('pr-lokalno').addEventListener('click', () => { try { localStorage.setItem(LS_KLJUC, ed().value); napomena('Program spremljen u ovaj preglednik.'); } catch (e) { napomena('Spremanje u preglednik nije dostupno.'); } });
  $('pr-lokalno-u').addEventListener('click', () => { let t = null; try { t = localStorage.getItem(LS_KLJUC); } catch (e) { /* */ } if (t) { postaviTekst(t); napomena('Vraćen program iz preglednika.'); } else napomena('U pregledniku nema spremljenog programa.'); });
}
function ucitajPrimjer(id) { const p = PRIMJERI.find((x) => x.id === id); if (!p) return; $('pr-primjer').value = id; postaviTekst(p.tekst); ui.poruka = ''; napomena('Primjer „' + p.naslov + '” u uređivaču — RN ga prenosi u DUM1 i pokreće.'); $('pr-opis').textContent = p.opis; }

/* ================================================================== */
/* 10. Pozicije                                                        */
/* ================================================================== */
function potpisPozicija() { let s = st.pozicije.size + ':'; for (const [k, v] of st.pozicije) s += k + ',' + v.x + ',' + v.y + ',' + v.z + ',' + v.p + ',' + v.r + v.oc + ';'; return s; }
function crtajPozicije() {
  const red = [...st.pozicije.keys()].sort((a, b) => a - b);
  $('poz-broj').textContent = red.length + ' definirano';
  $('poz').tBodies[0].innerHTML = red.length ? red.map((n) => {
    const t = st.pozicije.get(n);
    return `<tr data-n="${n}" class="${n === st.pokazivacPozicije ? 'akt' : ''}"><td>${n}</td><td>${kr(t.x)}</td><td>${kr(t.y)}</td><td>${kr(t.z)}</td><td>${kr(t.p)}</td><td>${kr(t.r)}</td><td>${esc(t.oc || '')}</td><td><span class="gumbi"><button type="button" class="gumb tanki" data-p="mo" aria-label="MO ${n}: gibanje na poziciju ${n}">MO</button><button type="button" class="gumb tanki" data-p="ur" aria-label="Uredi poziciju ${n}">Uredi</button><button type="button" class="gumb tanki" data-p="pc" aria-label="PC ${n}: briši poziciju ${n}">Briši</button></span></td></tr>`;
  }).join('') : '<tr class="poz-prazno"><td colspan="8">Nema definiranih pozicija. Nauči ih privjeskom (P.S, broj, ENT), naredbom HE ili PD.</td></tr>';
}
function veziPozicije() {
  $('poz').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return; const n = +b.closest('tr').dataset.n, t = st.pozicije.get(n);
    if (b.dataset.p === 'mo') posaljiNaredbu('MO ' + n);
    else if (b.dataset.p === 'pc') posaljiNaredbu('PC ' + n);
    else if (t) { $('pn-br').value = n; $('pn-x').value = t.x; $('pn-y').value = t.y; $('pn-z').value = t.z; $('pn-p').value = t.p; $('pn-r').value = t.r; $('pn-oc').value = t.oc === 'C' ? 'C' : 'O'; $('pn-x').focus(); }
  });
  $('poz-nova').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = ['x', 'y', 'z', 'p', 'r'].map((k) => parseFloat($('pn-' + k).value));
    if (v.some((x) => !Number.isFinite(x))) { napomena('Upiši sve koordinate X, Y, Z, P, R.'); return; }
    await posaljiNaredbu('GF ' + ($('pn-oc').value === 'C' ? 1 : 0));
    await posaljiNaredbu('PD ' + (+$('pn-br').value) + ', ' + v.map((x) => x.toFixed(1)).join(', '));
  });
  $('pn-he').addEventListener('click', () => posaljiNaredbu('HE ' + (+$('pn-br').value)));
}

/* ================================================================== */
/* 11. Stanje                                                          */
/* ================================================================== */
function bin(v, n) { let s = ''; for (let b = n - 1; b >= 0; b--) { s += (v >> b) & 1; if (b && b % 4 === 0) s += ' '; } return s; }
function osvjeziStanje() {
  const t = dum.tocka(), g = st.greska;
  const br = st.brojila.map((v, i) => [i, v]).filter(([i, v]) => i && v).map(([i, v]) => i + ' = ' + v).join(', ') || 'sva 0';
  const akt = dum.aktivnost();
  const R = [
    ['Napajanje', st.napajanje ? 'uključeno, servo ' + (st.servo ? 'ON' : 'OFF') : 'isključeno'],
    ['NEST', st.nestGotov ? 'napravljen' : 'nije napravljen'],
    ['Privjesak', (st.privjesakON ? 'ON' : 'OFF') + ', način ' + st.nacin],
    ['Pogreška', g.tip ? (g.tip === 1 ? 'I. vrste (' + g.led + ')' : 'II. vrste [' + g.kod + ']') + ': ' + g.poruka : 'nema (ER = 0)', g.tip ? 'crv' : ''],
    ['Izvodi', st.izvodi ? 'program, redak ' + st.redak : akt ? akt : '—'],
    ['J1–J5 [°]', st.q.map((v) => kr(v / D)).join(' · ')],
    ['X, Y, Z [mm]', [t.x, t.y, t.z].map((v) => kr(v)).join(' · ')],
    ['P, R [°]', kr(t.p) + ' · ' + kr(t.r)],
    ['Prihvatnica', (st.prihvatnica.zatvorena ? 'C (zatvorena)' : 'O (otvorena)') + ', GP ' + [st.prihvatnica.sila.pocetna, st.prihvatnica.sila.drzanja, st.prihvatnica.sila.vrijeme].join(', ')],
    ['Brzina', 'SP ' + st.sp + ', ' + st.ubrzanje + ' (' + (BRZINE[st.sp] ? BRZINE[st.sp].mmS + ' mm/s najviše' : '') + ')'],
    ['TL', kr(st.tl * 1000) + ' mm'],
    ['Pozicija (brojač)', String(st.pokazivacPozicije)],
    ['Registar', String(st.registar)],
    ['Brojila', br],
    ['Ulazi', bin(st.ulazi, IO_BITA) + '  STB ' + st.signali.STB + ' ACK ' + st.signali.ACK],
    ['Izlazi', bin(st.izlazi, IO_BITA) + '  RDY ' + st.signali.RDY + ' BUSY ' + st.signali.BUSY]
  ];
  const html = R.map(([k, v, c]) => `<dt>${esc(k)}</dt><dd${c ? ` class="${c}"` : ''}>${esc(v)}</dd>`).join('');
  if ($('stanje').innerHTML !== html) $('stanje').innerHTML = html;
}

/* ================================================================== */
/* 12. Scena                                                           */
/* ================================================================== */
let robM = null, duhM = null, dumM = null, privM = null, simM = null, stol = null;
const scenaEl = $('scena');
const SOFTVERSKI = (() => {
  try { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); const r = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; if (e) g.getExtension('WEBGL_lose_context')?.loseContext(); return /swiftshader|llvmpipe|software/i.test(r); } catch (e) { return false; }
})();
const renderer = new THREE.WebGLRenderer({ antialias: !SOFTVERSKI, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SOFTVERSKI ? 1 : Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.02, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 0.25; controls.maxDistance = 7;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
{ const a = new THREE.DirectionalLight(0xffffff, 1.55); a.position.set(1.2, 2.6, 1.8); scene.add(a); const b = new THREE.DirectionalLight(0xffffff, 0.55); b.position.set(-2, 1.2, -1.6); scene.add(b); const c = new THREE.DirectionalLight(0xffffff, 0.35); c.position.set(-0.5, 0.4, 2.5); scene.add(c); }
const pod = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.MeshStandardMaterial({ color: 0xd2d6d6, roughness: 0.95 })); pod.rotation.x = -Math.PI / 2; pod.position.y = -0.0005; scene.add(pod);
stol = napraviStolMPS(THREE); scene.add(stol);
const MR = stol.userData.mjestoRobota.clone();
const R2S = (x, y, z) => new THREE.Vector3(MR.x + x, MR.y + z, MR.z - y);     /* KS robota [m] → scena */
robM = napraviRVM1(THREE, { ploca: false, unutrasnjost: false });
robM.korijen.position.copy(MR); scene.add(robM.korijen);
robM.postaviTL(st.tl); robM.postavi(st.q); robM.prihvatnica(st.prihvatnica.otvorenost);
/* duh-robot: položaj pravog robota iz odgovora na WH */
duhM = napraviRVM1(THREE, { ploca: false, unutrasnjost: false, kabeli: false });
{ const m = new THREE.MeshStandardMaterial({ color: 0x2ecad4, transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.5 }); duhM.korijen.traverse((o) => { if (o.isMesh) { o.material = m; o.renderOrder = 2; } }); }
duhM.korijen.position.copy(MR); duhM.korijen.visible = false; scene.add(duhM.korijen);
const DUM_POL = new THREE.Vector3(0.15, 0, 0.75);
dumM = napraviDUM1(THREE); dumM.grupa.position.copy(DUM_POL); scene.add(dumM.grupa); dumM.postaviLED('power', false);
const HD = MJERE.dum1[1];
privM = napraviPrivjesak(THREE); privM.position.set(DUM_POL.x - 0.03, HD, DUM_POL.z - 0.09); scene.add(privM);
simM = napraviSimRV(THREE); simM.grupa.position.set(DUM_POL.x - 0.1, HD, DUM_POL.z + 0.07); scene.add(simM.grupa); simM.postaviSignal('POWER', false);
/* trag TCP-a */
const tragPoz = new Float32Array(SIM.trag * 3); const tragGeo = new THREE.BufferGeometry(); tragGeo.setAttribute('position', new THREE.BufferAttribute(tragPoz, 3)); tragGeo.setDrawRange(0, 0);
const trag = new THREE.Line(tragGeo, new THREE.LineBasicMaterial({ color: 0xe07b00 })); trag.frustumCulled = false; scene.add(trag);
let tragN = 0, tragZadnja = null;
function dodajTrag(p) {
  if (tragZadnja && tragZadnja.distanceTo(p) < 0.001) return;
  if (tragN >= SIM.trag) { tragPoz.copyWithin(0, 3 * Math.floor(SIM.trag / 2)); tragN -= Math.floor(SIM.trag / 2); }
  tragPoz.set([p.x, p.y, p.z], tragN * 3); tragN++; tragZadnja = p.clone();
  tragGeo.attributes.position.needsUpdate = true; tragGeo.setDrawRange(0, tragN); ui.prljavo = true;
}
function obrisiTrag() { tragN = 0; tragZadnja = null; tragGeo.setDrawRange(0, 0); ui.prljavo = true; }
/* pozicije kao točke s brojem */
const pozGrupa = new THREE.Group(); scene.add(pozGrupa);
const tockaGeo = new THREE.SphereGeometry(0.004, 12, 8), tockaMat = new THREE.MeshBasicMaterial({ color: 0x17a2ad });
function crtajPozicije3D() {
  pozGrupa.children.slice().forEach((o) => { pozGrupa.remove(o); if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); } });
  for (const [n, t] of st.pozicije) {
    const T = KIN.izTocke(t); const p = R2S(T.x, T.y, T.z);
    const s = new THREE.Mesh(tockaGeo, tockaMat); s.position.copy(p); pozGrupa.add(s);
    const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d');
    g.fillStyle = 'rgba(10,40,46,.82)'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#e9fbfc'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 32, 17);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); sp.scale.set(0.032, 0.016, 1); sp.position.copy(p).add(new THREE.Vector3(0, 0.016, 0)); sp.renderOrder = 5; pozGrupa.add(sp);
  }
  ui.prljavo = true;
}
const KAMERE = {
  robot: { p: R2S(0.62, 1.05, 0.52), c: R2S(0.04, 0, 0.22) },
  stanica: { p: new THREE.Vector3(2.45, 1.85, 2.4), c: new THREE.Vector3(0.0, 0.6, 0.38) },
  dum1: { p: new THREE.Vector3(DUM_POL.x + 0.72, 0.62, DUM_POL.z + 0.42), c: new THREE.Vector3(DUM_POL.x, 0.16, DUM_POL.z) },
  odozgo: { p: R2S(0.12, -0.02, 1.5), c: R2S(0.12, 0, 0.05) }
};
function pogled(ime) { const k = KAMERE[ime]; if (!k) return; camera.up.set(0, 1, 0); camera.position.copy(k.p); controls.target.copy(k.c); camera.lookAt(k.c); controls.update(); ui.prljavo = true; }
let zadnjiQ = '', zadnjaOtv = -1, zadnjiTL = -1;
function postavi3D() {
  const qk = st.q.map((v) => v.toFixed(5)).join(',');
  if (st.tl !== zadnjiTL) { robM.postaviTL(st.tl); zadnjiTL = st.tl; }
  if (qk !== zadnjiQ) {
    zadnjiQ = qk; robM.postavi(st.q); ui.prljavo = true;
    if (ui.trag) { const f = KIN.fk(st.q, st.tl); dodajTrag(R2S(f.p[0], f.p[1], f.p[2])); }
  }
  const o = st.prihvatnica.otvorenost; if (o !== zadnjaOtv) { robM.prihvatnica(o); zadnjaOtv = o; ui.prljavo = true; }
}
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); ui.prljavo = true; }
new ResizeObserver(velicina).observe(scenaEl);
let scenaVidljiva = true;
if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver((z) => { scenaVidljiva = z[0].isIntersecting; ui.prljavo = true; }).observe(scenaEl);
controls.addEventListener('change', () => { ui.prljavo = true; });
function iscrtaj() { renderer.render(scene, camera); ui.prljavo = false; }

/* ================================================================== */
/* 13. Pravi robot (Web Serial)                                        */
/* ================================================================== */
const ser = { veza: null, zrcali: false, prog: null, prekiniSlanje: false };
function serLog(t) { const el = $('ser-log'); if (!el) return; el.textContent += t + '\n'; el.scrollTop = el.scrollHeight; }
async function serPosalji(T) {
  if (!ser.veza) return false;
  try {
    const r = await ser.veza.posalji(T); serLog('> ' + T);
    if (r && r.upozorenje) { termIspis('r', '  robot: upozorenje — ' + r.upozorenje); serLog('  upozorenje: ' + r.upozorenje); }
    return true;
  } catch (e) { termIspis('g', '  robot: nije poslano — ' + e.message); serLog('  nije poslano: ' + e.message); return false; }
}
function crtajPravi() {
  const p = $('pravi');
  const upoz = `<div class="ser-upoz"><b>Zaustavljanje pravog robota:</b> tipka EMG. STOP na DUM1 ili EMG STOP na privjesku — drži je na dohvat ruke. RS-232C nema naredbu za zaustavljanje gibanja; ništa na ovoj stranici ne zaustavlja robot.</div>`;
  if (!SER.podrzano()) {
    p.innerHTML = `<div class="ser-blok">${upoz}<p class="rv-mala">Veza s pravim robotom radi u pregledniku <b>Chrome</b> ili <b>Edge na računalu</b> (Web Serial; ne radi na mobitelu, u Firefoxu ni Safariju). Treba: USB–RS-232 prilagodnik, kabel do priključka ${esc(RS232.konektor)}, postavke <b>${esc(RS232.zapis)}</b> (${RS232.baud} Bd, parni paritet, ${RS232.bitovi} bita, ${RS232.stop} stop-bita, kraj retka ${esc(RS232.kraj)}). ${esc(RS232.postavke)}</p></div>`;
    $('ser-stanje').textContent = 'nije podržano u ovom pregledniku';
    return;
  }
  p.innerHTML = `<div class="ser-blok">${upoz}
  <div class="ser-red"><span>${esc(RS232.zapis)} · kraj retka</span><select id="ser-kraj" aria-label="Kraj retka"><option value="${esc(RS232.krajPremaSW1.dolje)}">${esc(RS232.krajPremaSW1.dolje)} (SW1 bit ${RS232.krajPremaSW1.bit} dolje)</option><option value="${esc(RS232.krajPremaSW1.gore)}">${esc(RS232.krajPremaSW1.gore)} (SW1 bit ${RS232.krajPremaSW1.bit} gore)</option></select><button type="button" class="gumb" id="ser-spoji">Spoji</button><button type="button" class="gumb tanki" id="ser-prekini" disabled>Prekini</button></div>
  <div id="ser-spojeno" hidden>
   <p class="rv-mala"><b>Sigurnosni popis</b> — prije prve naredbe gibanja potvrdi svaku stavku:</p>
   <ul class="ser-popis">${SER.SIGURNOSNI_POPIS.map((s) => `<li><label><input type="checkbox" data-sig="${esc(s.id)}"> <span>${esc(s.tekst)}</span></label></li>`).join('')}</ul>
   <div class="ser-red"><button type="button" class="gumb" id="ser-potvrdi" disabled>Potvrđujem sigurnosni popis</button><span id="ser-potvrda" class="rv-mala"></span></div>
   <div class="ser-red"><label><input type="checkbox" id="ser-zrcali"> Zrcali: naredbe iz terminala, tablice pozicija i RN idu i simulatoru i pravom robotu</label></div>
   <div class="ser-red"><button type="button" class="gumb tanki" id="ser-wh">Čitaj položaj (WH)</button><span id="ser-wh-odg" class="rv-mala"></span></div>
   <form class="ser-red" id="ser-forma" autocomplete="off"><input type="text" id="ser-ulaz" aria-label="Naredba samo pravom robotu" placeholder="naredba samo robotu, npr. ER"><button type="submit" class="gumb tanki">Pošalji robotu</button></form>
   <div class="ser-prog" id="ser-prog"><p class="rv-mala"><b>Program u robot</b> — redci iz uređivača šalju se jedan po jedan, svaki tvojim klikom (ili svi preostali uz potvrdu). Redci bez broja (PD …) robot izvršava odmah. Točke primjera su izračunate za simulator: najprije ih provjeri na pravom robotu.</p><div class="ser-red"><button type="button" class="gumb tanki" id="ser-prog-poc">Pripremi slanje programa</button></div><div id="ser-prog-in"></div></div>
   <button type="button" class="ser-stop" id="ser-stop">STOP slanja<small>zaustavlja slanje sa stranice i simulator — NE zaustavlja robot: za to EMG STOP</small></button>
   <div class="ser-log" id="ser-log" aria-live="polite" aria-label="Promet prema robotu"></div>
  </div></div>`;
  $('ser-stanje').textContent = 'nije spojeno';
  $('ser-spoji').addEventListener('click', serSpoji);
  $('ser-prekini').addEventListener('click', serPrekini);
  p.addEventListener('change', (e) => {
    if (e.target.dataset.sig) $('ser-potvrdi').disabled = !SER.SIGURNOSNI_POPIS.every((s) => p.querySelector(`[data-sig="${s.id}"]`).checked) || (ser.veza && ser.veza.sigurnostPotvrdena);
    if (e.target.id === 'ser-zrcali') { ser.zrcali = e.target.checked; $('term-veza').textContent = ser.zrcali ? 'zrcalno: simulator + pravi robot' : ''; }
  });
  $('ser-potvrdi').addEventListener('click', () => {
    try { ser.veza.potvrdiSigurnost(SER.SIGURNOSNI_POPIS.filter((s) => p.querySelector(`[data-sig="${s.id}"]`).checked).map((s) => s.id)); $('ser-potvrda').innerHTML = '<span class="ser-ok">potvrđeno</span> — preporuka: SP ' + SER.PREPORUKA_SP + ' ili manje, prva naredba NT'; $('ser-potvrdi').disabled = true; }
    catch (e) { $('ser-potvrda').textContent = e.message; }
  });
  $('ser-wh').addEventListener('click', serWH);
  $('ser-forma').addEventListener('submit', async (e) => { e.preventDefault(); const t = $('ser-ulaz').value.trim().toUpperCase(); if (!t) return; $('ser-ulaz').value = ''; termIspis('s', '> (samo robot) ' + t); await serPosalji(t); });
  $('ser-prog-poc').addEventListener('click', serProgPripremi);
  $('ser-stop').addEventListener('click', () => { ser.prekiniSlanje = true; ser.prog = null; $('ser-prog-in').innerHTML = ''; dum.stopTipka(); termIspis('g', '! STOP slanja: stranica više ništa ne šalje. Pravi robot zaustavlja samo EMG STOP.'); serLog('STOP slanja (robot se ne zaustavlja ovim gumbom)'); });
}
async function serSpoji() {
  try {
    ser.veza = await SER.spoji({ kraj: $('ser-kraj').value });
    ser.veza.naPrimljeno((l) => { serLog('< ' + l); termIspis('r', '< robot: ' + l); });
    $('ser-spojeno').hidden = false; $('ser-spoji').disabled = true; $('ser-prekini').disabled = false;
    $('ser-stanje').textContent = 'spojeno · ' + RS232.zapis;
    termIspis('i', 'Veza s pravim robotom otvorena (' + RS232.zapis + '). Ništa se ne šalje bez tvog klika.');
  } catch (e) { $('ser-stanje').textContent = 'spajanje nije uspjelo'; termIspis('g', '! Veza nije otvorena: ' + e.message); ser.veza = null; }
}
async function serPrekini() {
  if (ser.veza) { try { await ser.veza.prekini(); } catch (e) { /* */ } }
  ser.veza = null; ser.zrcali = false; ser.prog = null;
  $('ser-spojeno').hidden = true; $('ser-spoji').disabled = false; $('ser-prekini').disabled = true; $('ser-stanje').textContent = 'nije spojeno'; $('term-veza').textContent = '';
  const z = $('ser-zrcali'); if (z) z.checked = false;
  document.querySelectorAll('[data-sig]').forEach((c) => { c.checked = false; }); $('ser-potvrda').textContent = ''; $('ser-potvrdi').disabled = true;
}
async function serWH() {
  if (!ser.veza) return;
  serLog('> WH');
  const l = await ser.veza.upitaj('WH', SIM.serTimeout);
  if (l == null) { $('ser-wh-odg').textContent = 'nema odgovora (provjeri kabel, postavke i je li privjesak OFF)'; return; }
  const v = l.split((FORMAT_ODGOVORA.pozicija && FORMAT_ODGOVORA.pozicija.razdjelnik) || ',').map((s) => parseFloat(s));
  if (v.length < 5 || v.slice(0, 5).some((x) => !Number.isFinite(x))) { $('ser-wh-odg').textContent = 'odgovor „' + l + '” nije u očekivanom zapisu'; return; }
  const T = KIN.izTocke({ x: v[0], y: v[1], z: v[2], p: v[3], r: v[4] });
  const r = KIN.ik(T, st.tl, st.q);
  if (!r.uspjeh) { $('ser-wh-odg').textContent = l + ' — simulator tu točku ne može postaviti (' + r.razlog + '); provjeri mjere i konvenciju osi (KONFIG.osXY).'; duhM.korijen.visible = false; ui.prljavo = true; return; }
  duhM.postavi(r.q); duhM.postaviTL(st.tl); duhM.korijen.visible = true; ui.prljavo = true;
  $('ser-wh-odg').textContent = 'robot: ' + l + ' → prikazan kao prozirni robot (J1–J5: ' + r.q.map((x) => kr(x / D)).join(', ') + '°)';
}
function serProgPripremi() {
  const redci = ed().value.split('\n').map((l) => l.trim().toUpperCase()).filter(Boolean);
  if (!redci.length) { $('ser-prog-in').innerHTML = '<p class="rv-mala">Uređivač je prazan.</p>'; return; }
  ser.prog = { redci, i: 0 }; ser.prekiniSlanje = false; crtajSerProg();
}
function crtajSerProg() {
  const P = ser.prog, el = $('ser-prog-in'); if (!P) { el.innerHTML = ''; return; }
  if (P.i >= P.redci.length) { el.innerHTML = `<p class="rv-mala"><span class="ser-ok">Poslano svih ${P.redci.length} redaka.</span> Pokretanje: RN (u zrcalnom načinu gumb RN ili naredba RN robotu).</p>`; return; }
  el.innerHTML = `<p class="rv-mala">Redak ${P.i + 1} od ${P.redci.length}: <code>${esc(P.redci[P.i])}</code></p><div class="ser-red"><button type="button" class="gumb tanki" id="ser-redak">Pošalji ovaj redak</button><button type="button" class="gumb tanki" id="ser-sve">Potvrđujem: pošalji sve preostale (${P.redci.length - P.i})</button><button type="button" class="gumb tanki" id="ser-odustani">Odustani</button></div>`;
  $('ser-redak').addEventListener('click', async () => { if (await serPosalji(P.redci[P.i])) { P.i++; crtajSerProg(); } });
  $('ser-sve').addEventListener('click', async () => {
    ser.prekiniSlanje = false;
    while (ser.prog === P && P.i < P.redci.length && !ser.prekiniSlanje) { if (!(await serPosalji(P.redci[P.i]))) break; P.i++; await new Promise((r) => setTimeout(r, SIM.serRazmak)); }
    crtajSerProg();
  });
  $('ser-odustani').addEventListener('click', () => { ser.prog = null; crtajSerProg(); });
}

/* ================================================================== */
/* 14. Tekst stranice                                                  */
/* ================================================================== */
function crtajTekst() {
  $('inacica-krat').textContent = NAZIV_ROBOTA + ' · I/O kartica ' + (KONFIG.ioKartica === 'A16B16' ? 'A16/B16' : 'A8/B8') + ' · prihvatnica ' + (KONFIG.prihvatnica || 'nema');
  $('sig-uvod').textContent = 'Kad radiš s pravim robotom: radni prostor prazan, EMG. STOP na dohvat ruke, nakon uključenja prvo NEST, za prve probe mala brzina (SP 1–' + SER.PREPORUKA_SP + '). Simulator ne provjerava sudare sa stolom ni s predmetima.';
  const tk = (id) => (TIPKA[id] ? TIPKA[id].natpis : id);
  const KORACI = [
    'Uključi glavni prekidač DUM1 (desno od prednje ploče). Svijetli POWER; robot još ne zna gdje je.',
    'Privjesak: preklopnik na ON, zatim ' + tk('NST') + ', ' + tk('ENT') + ' — NEST (svijetli EXECUTE, osi idu redom: ' + NEST.redoslijed.map((g) => g.join(', ')).join(' → ') + ').',
    'Ručno vođenje: ' + tk('PTP') + ' (po zglobovima), ' + tk('XYZ') + ' (vrh alata u X, Y, Z) ili ' + tk('TOOL') + ' (u smjeru alata); drži tipke ' + tk('X+') + ' … ' + tk('R-') + '. Prihvatnica: ' + tk('O') + ' i ' + tk('C') + '.',
    'Nauči točku: ' + tk('P.S') + ', broj (tipke s brojkama, npr. ' + tk('OPT+') + ' za 1), ' + tk('ENT') + '. Zaslon pokazuje „-001”.',
    'Provjeri točku: ' + tk('MOV') + ', broj, ' + tk('ENT') + ' (robot ide brzinom SP ' + (BRZINE.privjesakMOV || 4) + ').',
    'Privjesak na OFF — tek tada DUM1 prima naredbe s računala.',
    'S računala: u terminalu npr. SP 3, MO 1, WH; ili učitaj primjer programa i pritisni RN. STOP na DUM1 zaustavlja program nakon tekuće naredbe.',
    'Pogreška II (ERROR svijetli stalno): RESET na DUM1 ili RS. Pogreška I (ERROR trepće, npr. EMG STOP): otpusti tipku, isključi i uključi DUM1, ponovno NEST.'
  ];
  $('prvi-koraci').innerHTML = KORACI.map((k) => `<li>${esc(k)}</li>`).join('');
  const opisPrec = (id) => { const t = TIPKA[id]; return t ? t.natpis + (t.ptp ? ' (drži)' : '') : id; };
  const grupe = {};
  PRECACI.forEach(([k, id]) => { (grupe[id] = grupe[id] || []).push(k === 'Enter' ? 'Enter' : k); });
  $('tab-precaci').innerHTML = '<thead><tr><th>Tipka privjeska</th><th>Prečac</th></tr></thead><tbody>' + Object.entries(grupe).map(([id, ks]) => `<tr><td>${esc(opisPrec(id))}</td><td>${ks.map((k) => `<kbd>${esc(k)}</kbd>`).join(' ')}</td></tr>`).join('')
    + '<tr><td>EMG. STOP na DUM1 (pritisne; otpušta se klikom)</td><td><kbd>Esc</kbd></td></tr><tr><td>Povijest naredbi u terminalu</td><td><kbd>↑</kbd> <kbd>↓</kbd></td></tr></tbody>';
  $('tab-tipke').innerHTML = '<thead><tr><th>Tipka</th><th>Slijed</th><th>PTP</th><th>XYZ / TOOL</th><th>Djelovanje</th></tr></thead><tbody>' + PRIVJESAK.tipke.map((t) => `<tr><td><code>${esc(t.natpis)}</code></td><td>${esc(t.slijed || '—')}</td><td>${esc(t.ptp || '—')}</td><td>${esc(t.xyz ? t.xyz + (t.tool && t.tool !== t.xyz ? ' / ' + t.tool : '') : '—')}</td><td>${esc(t.opis || '')}${t.naredba ? ' (kao ' + esc(t.naredba) + ')' : ''}</td></tr>`).join('') + '</tbody>';
  $('pog-uvod').textContent = POGRESKE.znakoviI + ' ' + POGRESKE.znakoviII;
  $('tab-pogI').innerHTML = '<thead><tr><th>Pogreška I</th><th>Uzrok</th><th>Poništavanje</th></tr></thead><tbody>' + POGRESKE.I.map((x) => `<tr><td>${esc(x.led)}</td><td>${esc(x.uzrok)}</td><td>${esc(x.ponistavanje)}</td></tr>`).join('') + '</tbody>';
  $('tab-pogII').innerHTML = '<thead><tr><th>Pogreška II (naša oznaka)</th><th>Vrsta</th><th>Uzrok</th></tr></thead><tbody>' + POGRESKE.II.map((x) => `<tr><td><code>${esc(x.kod)}</code></td><td>${esc(x.skupina)}</td><td>${esc(x.uzrok)}</td></tr>`).join('') + '</tbody>';
  const Z = UPRAVLJANJE_ZADANO;
  const POJ = [
    'Stroj stanja upravljačke jedinice slijedi priručnik: nakon uključenja gibanje tek nakon NEST-a, privjesak ON blokira računalo, EMG STOP je pogreška I (servo isključen, J2 i J3 koče), pogreška II staje na retku i poništava se RESET-om ili s RS.',
    'Ručno vođenje: PTP ' + kr((Z.jogZglobni || 0) * 100, 0) + ' % najveće brzine osi, XYZ i TOOL ' + kr((Z.jogLinearni || 0) * 1000, 0) + ' mm/s i ' + kr((Z.jogKutni || 0) / D, 0) + ' °/s (pretpostavke iz podataka). Prije NEST-a dopušteno je samo PTP vođenje.',
    'Prikaz načina PTP/XYZ/TOOL ispod privjeska je pomoć simulatora; pravi privjesak ga nema.',
    'Gumb „STEP — redak” u programu je pomoć simulatora; na pravom robotu izvođenje redak po redak radi samo tipkom STEP na privjesku.',
    'Prijenos programa šalje redak po redak kao terminal: najprije DL 1, ' + JEZIK.redci.max + ', zatim redci s brojem idu u program, a redci bez broja (npr. PD, GF) se izvršavaju odmah. Komentari u primjerima su bez dijakritičkih znakova jer DUM1 prima 7-bitni ASCII.',
    'Točke primjera računaju se iz kinematike za trenutne mjere robota (baza X = ' + BAZA.x + ' mm, Z = ' + BAZA.z + ' mm, alat prema dolje, najniže ' + SIM.kocka.zMin + ' mm iznad montažne plohe); kad se mjere promijene u podacima, primjeri se sami prilagode. Ishodište koordinata pravog robota nije potvrđeno — prije slanja primjera pravom robotu provjeri točke (WH, PR) i kreni malom brzinom.',
    'Zujalo zvuči u pregledniku tek kad ga uključiš (frekvencija ' + SIM.zujaloHz + ' Hz je pretpostavka). SW1 bit 8 isključuje zujalo kao na DUM1.',
    'POWER na SIM RV svijetli dok je DUM1 uključen (vanjsko napajanje I/O je pretpostavka). Namjenski ulazi START, STOP, RESET nisu na SIM RV.',
    'Sudari ruke sa stolom, DUM1 ili predmetima se ne provjeravaju; dinamika i opterećenje se ne računaju.',
    'Veza s pravim robotom: pri slanju programa razmak između redaka je ' + SIM.serRazmak + ' ms (bez kontrole toka; pretpostavka). Odgovor na WH prikazuje se kao prozirni robot; ako se ne poklapa sa stvarnim, treba uskladiti konvenciju osi i pomake nula u podacima.'
  ];
  $('pojednostavljenja').innerHTML = POJ.map((t) => `<li>${esc(t)}</li>`).join('');
  const pp = pretpostavke().filter((x) => !x.id);
  $('pp-uvod').textContent = TEKST_PRETPOSTAVKE;
  $('pp-sazetak').textContent = 'Prikaži popis (' + pp.length + ')';
  $('pretpostavke').innerHTML = pp.map((x) => `<li><b>${esc(x.vrsta === 'sukob' ? 'Sukob izvora' : x.vrsta === 'nedostaje' ? 'Nedostaje' : 'Pretpostavka')}: ${esc(x.sto)}</b>${x.vrijednost ? ' — ' + esc(x.vrijednost) : ''}. ${esc(x.napomena || '')}</li>`).join('');
  const krat = new Set();
  const dodaj = (s) => String(s || '').split(/[,\s]+/).forEach((k) => { if (IZVORI[k]) krat.add(k); });
  NAREDBE.forEach((n) => dodaj(n.izvor)); [PRIVJESAK.izvor, DUM1_PLOCA.izvor, POGRESKE.izvor, RS232.izvor, SIMRV_SIGNALI.izvor, JEZIK.izvor].forEach(dodaj);
  $('izvori').innerHTML = [...krat].map((k) => { const i = IZVORI[k]; return `<li>${i.url ? `<a href="${esc(i.url)}" rel="noopener" target="_blank">${esc(i.naziv)}</a>` : esc(i.naziv)}</li>`; }).join('');
}

/* ================================================================== */
/* 15. URL parametri ?program= i ?vjezba=                               */
/* ================================================================== */
function dekodirajProgram(s) {
  if (!s) return null;
  const t = s.trim();
  if (/^[A-Za-z0-9+/_-]+=*$/.test(t) && t.length >= 8) {
    try {
      const b = atob(t.replace(/-/g, '+').replace(/_/g, '/'));
      const tx = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
      if (/^[\x09\x0a\x0d\x20-\x7e -ſ„”]*$/.test(tx) && /\n|^\s*\d+\s+\S/.test(tx)) return tx;
    } catch (e) { /* nije base64 */ }
  }
  return t;
}
function primijeniPocetno(p) {
  if (!p) return;
  const red = [];
  const poz = p.pozicije;
  const ubaci = (n, v) => {
    const t = Array.isArray(v) ? { x: v[0], y: v[1], z: v[2], p: v[3] ?? -90, r: v[4] ?? 0, oc: v[5] } : v;
    if (!t || ![t.x, t.y, t.z].every(Number.isFinite)) return;
    red.push('GF ' + (t.oc === 'C' || t.oc === 1 || t.oc === true ? 1 : 0)); red.push(pd(n, t.x, t.y, t.z, t.p ?? -90, t.r ?? 0));
  };
  if (Array.isArray(poz)) poz.forEach((t) => ubaci(t.n ?? t.broj, t));
  else if (poz && typeof poz === 'object') Object.entries(poz).forEach(([n, v]) => ubaci(+n, v));
  if (red.length) red.push('GF 0');
  return red;
}
async function ucitajIzUrl() {
  let q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
  const pr = q.get('program');
  if (pr) { const t = dekodirajProgram(pr); if (t) { postaviTekst(t); napomena('Program iz poveznice je u uređivaču — uključi DUM1, NEST i RN.'); } }
  const vj = q.get('vjezba');
  if (vj) {
    try {
      const M = await import('./rvm1_vjezbe_podaci.js');
      const V = (typeof M.vjezba === 'function' ? M.vjezba(vj) : null) || (M.VJEZBE || []).find((x) => String(x.id) === vj);
      if (V) {
        /* priprema (TL, SP, GF + PD) i program — funkcijom iz podataka vježbi, ako postoji */
        const redci = typeof M.pripremaNaredbe === 'function' ? M.pripremaNaredbe(V)
          : [...(primijeniPocetno(V.pocetno) || []), ...String(V.program || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)];
        if (redci.length) { postaviTekst(["' vjezba " + String(V.id).replace(/[^\x20-\x7e]/g, '')].concat(redci).join('\n')); napomena('Vježba „' + (V.naslov || vj) + '” je u uređivaču — uključi DUM1, NEST, zatim RN.'); }
        else napomena('Vježba „' + (V.naslov || vj) + '” nema programa ni pozicija — radi se privjeskom i terminalom.');
      }
    } catch (e) { /* vježbe još ne postoje — parametar se zanemaruje */ }
  }
}

/* ================================================================== */
/* 16. Gumbi scene, petlja                                             */
/* ================================================================== */
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
const prek = (id, f) => $(id).addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); f(on); ui.prljavo = true; });
prek('t-trag', (on) => { ui.trag = on; trag.visible = on; });
prek('t-pozicije', (on) => { pozGrupa.visible = on; });
prek('t-prostor', (on) => robM.pomocni.radniProstor(on));
$('t-obrisi').addEventListener('click', obrisiTrag);
$('ubrzanje').addEventListener('change', () => { ui.ubrzanje = +$('ubrzanje').value || 1; });

function korakSim(dt) {
  let ost = dt;
  while (ost > 1e-9) { const h = Math.min(SIM.dtMax, ost); dum.azuriraj(h); ost -= h; postavi3D(); }
}
let zadnjiPanel = 0;
function osvjeziPanele(sad, sila = false) {
  if (!sila && sad - zadnjiPanel < 120) return; zadnjiPanel = sad;
  osvjeziStanje(); osvjeziProgStanje(); oznaciRedak(); osvjeziTb();
  const sp = potpisPozicija(); if (sp !== ui.sigPoz) { ui.sigPoz = sp; crtajPozicije(); crtajPozicije3D(); }
  else { const a = document.querySelector('#poz tr.akt'); if ((a ? +a.dataset.n : -1) !== st.pokazivacPozicije) crtajPozicije(); }
  const oz = $('sc-oznaka'), txt = st.izvodi ? 'Program: redak ' + st.redak : dum.aktivnost() === 'gibanje' ? 'Gibanje' : dum.privjesak.vodi.length ? 'Ručno vođenje ' + dum.privjesak.nacin : '';
  oz.textContent = txt; oz.classList.toggle('vid', !!txt);
}
let rafId = 0, zadnje = performance.now();
function petlja(t) {
  rafId = 0;
  const dt = Math.min(0.25, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  korakSim(dt * ui.ubrzanje);
  azurirajZvuk();
  osvjeziPanele(t);
  const c = controls.update();
  if (scenaVidljiva && (ui.prljavo || c)) iscrtaj();
  rafId = requestAnimationFrame(petlja);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; pustiSve(); } else if (!rafId) { zadnje = performance.now(); rafId = requestAnimationFrame(petlja); } });

/* pokretanje */
crtajPrivjesak(); veziPrivjesak(); crtajDum1(); veziDum1(); crtajSim(); crtajTerminal(); veziProgram(); veziPozicije(); crtajPravi(); crtajTekst();
postaviTekst(PRIMJERI[0].tekst, true); $('pr-primjer').value = PRIMJERI[0].id; ui.poruka = '';
crtajPozicije(); osvjeziTb(); osvjeziDum1(); osvjeziSim(); osvjeziPanele(0, true);
pogled('stanica'); velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
iscrtaj();
rafId = requestAnimationFrame(petlja);
ucitajIzUrl();

/* testna kuka */
window.__upr = {
  dum, st, KIN, PODACI, SER, PRIMJERI, BAZA, ser, ui, robM, duhM, dumM, simM, privM, camera, renderer, iscrtaj, pogled,
  ucitajPrimjer, prenesi, posaljiNaredbu, postaviTekst, dekodirajProgram,
  simuliraj(sek, dt = SIM.dtMax) { const n = Math.round(sek / dt); for (let i = 0; i < n; i++) korakSim(dt); osvjeziPanele(performance.now(), true); ui.prljavo = true; iscrtaj(); },
  simulirajDok(uvjet, maxSek = 120, dt = SIM.dtMax) { const n = Math.round(maxSek / dt); let ok = false; for (let i = 0; i < n; i++) { korakSim(dt); if (uvjet()) { ok = true; break; } } osvjeziPanele(performance.now(), true); ui.prljavo = true; iscrtaj(); return ok; },
  get tragN() { return tragN; }, get pozicije3D() { return pozGrupa.children.length; }
};
