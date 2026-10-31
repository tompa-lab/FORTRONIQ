/* FORTRONIQ · Pametna zgrada — Simulator upravljanja.
   Model zgrade i program PLC-a: pz_fizika.js; podaci i scenariji: pz_podaci.js.
   Nadzorna ploča (SCADA): tokovi energije, vrijednosti, alarmi; ljestvičasti prikaz programa s trenutnim stanjem;
   parametri programa, ručni rad, kvarovi, povijest (grafovi), bilanca dana, dijagnoza i ocjena scenarija.
   © ForTroniQ d.o.o. */
import { SCENARIJI, PARAMETRI, KVAROVI, SIGNALI, PRETP } from './pz_podaci.js';
import { napraviZgradu, zadaniParametri, provjeri, KORAK, copGrij, eerHlad } from './pz_fizika.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => { if (!isFinite(n)) return '—'; let s = (Math.round(n * 10 ** d) / 10 ** d).toFixed(d); if (s === '-0' || /^-0\.0+$/.test(s)) s = s.slice(1); const neg = s[0] === '-'; if (neg) s = s.slice(1); let [c, dd] = s.split('.'); if (c.length > 4) c = c.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (neg ? '−' : '') + c + (dd ? ',' + dd : ''); };
const vrijeme = (sat) => { const m = Math.round(sat * 60); return String(Math.floor(m / 60) % 25).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const NS = 'http://www.w3.org/2000/svg';

/* ================================================================== stanje */
let S = SCENARIJI[0];
let par = zadaniParametri();
let Z = null, tocno = null, dijagnoza = null, radi = false, brzina = 1200, acc = 0, zadnjiT = 0, gotovo = false;
let zadnjeIzl = null, zadnjiAlarmi = new Set();
const man = {};
const rucniKvarovi = new Set();

function novi() {
  const opc = { kvarovi: [...rucniKvarovi] };
  tocno = S.kvarOd ? S.kvarOd.id : null;
  if (S.skriveni) {
    const izbor = ['izmj', 'tun', 'dt', 'filtar', 'co2', 'spump'];
    tocno = izbor[Math.floor(Math.random() * izbor.length)];
    opc.kvarOd = { id: tocno, sat: 6 + Math.random() * 3 };
  }
  Z = napraviZgradu(S, par, opc);
  Object.assign(Z.st.man, man);
  dijagnoza = null; gotovo = false; acc = 0; zadnjeIzl = null; zadnjiAlarmi = new Set();
  Z.korak();
  $('log').innerHTML = '';
  dnevnik('Početak scenarija „' + S.naziv + '“ (' + S.datum + ').');
  $('rez').innerHTML = '<p class="pom">Ocjena se prikazuje kad simulacija dođe do 24:00.</p>';
  $('d-rez').textContent = '';
  $('d-odabir').value = '';
  osvjezi(true);
}

/* ================================================================== scenariji */
$('s-scen').innerHTML = SCENARIJI.map((s) => `<option value="${s.id}">${esc(s.naziv)}</option>`).join('');
function postaviScen(id) {
  S = SCENARIJI.find((x) => x.id === id) || SCENARIJI[0];
  $('s-scen').value = S.id;
  $('s-cilj').innerHTML = `<b>${esc(S.datum)}.</b> ${esc(S.cilj)}` + (S.provjera.length ? '<br><span class="pom">Provjera na kraju dana: ' + S.provjera.map((c) => esc(c.t) + (c.m === 'dijagnoza' ? '' : ' ' + ({ '<=': '≤', '>=': '≥', '==': '=' }[c.op]) + ' ' + hr(c.v, c.v % 1 ? 1 : 0))).join(' · ') + '</span>' : '');
  $('k-dijag').hidden = !(S.kvarOd || S.skriveni);
  $('k-kvar').querySelectorAll('input').forEach((i) => { i.disabled = !!S.skriveni; });
  $('godina').hidden = !S.godina;
  zaustavi();
  if (S.godina) { $('s-pokreni').textContent = 'Izračunaj četiri dana'; }
  else $('s-pokreni').textContent = 'Pokreni';
  novi();
}
$('s-scen').addEventListener('change', () => postaviScen($('s-scen').value));

function zaustavi() { radi = false; $('s-pokreni').setAttribute('aria-pressed', 'false'); if (!S.godina) $('s-pokreni').textContent = gotovo ? 'Pokreni' : 'Pokreni'; }
$('s-pokreni').addEventListener('click', () => {
  if (S.godina) { godina(); return; }
  if (gotovo) novi();
  radi = !radi; zadnjiT = performance.now();
  $('s-pokreni').setAttribute('aria-pressed', radi ? 'true' : 'false');
  $('s-pokreni').textContent = radi ? 'Pauza' : 'Nastavi';
});
$('s-ponovo').addEventListener('click', () => { zaustavi(); novi(); $('s-pokreni').textContent = 'Pokreni'; });
$('s-kraj').addEventListener('click', () => { if (S.godina) { godina(); return; } if (gotovo) return; Z.doKraja(24); kraj(); });
document.querySelectorAll('#brzine button').forEach((b) => b.addEventListener('click', () => {
  brzina = +b.dataset.brzina;
  document.querySelectorAll('#brzine button').forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
}));

/* ================================================================== parametri */
$('param').innerHTML = PARAMETRI.map((p) => p.bool
  ? `<label class="kv pz-par-b"><input type="checkbox" data-par="${p.id}"> ${esc(p.naziv)}</label>`
  : `<label class="pz-par"><span>${esc(p.naziv)}</span><input type="number" inputmode="decimal" data-par="${p.id}" min="${p.min}" max="${p.max}" step="${p.korak}" value="${p.v}"><i>${esc(p.jed)}</i></label>`).join('');
function citajPar() {
  document.querySelectorAll('[data-par]').forEach((el) => {
    const d = PARAMETRI.find((p) => p.id === el.dataset.par);
    let v = el.type === 'checkbox' ? (el.checked ? 1 : 0) : parseFloat(String(el.value).replace(',', '.'));
    if (!isFinite(v)) v = d.v;
    v = Math.min(d.max, Math.max(d.min, v));
    par[d.id] = v; if (Z) Z.p[d.id] = v;
  });
  const prom = PARAMETRI.filter((p) => par[p.id] !== p.v).length;
  $('p-prom').textContent = prom ? 'Promijenjeno: ' + prom : 'Zadani program';
}
$('param').addEventListener('change', (e) => { if (e.target.matches('[data-par]')) { citajPar(); dnevnik('Parametar „' + PARAMETRI.find((p) => p.id === e.target.dataset.par).naziv + '“ = ' + hr(par[e.target.dataset.par], 1).replace(',0', '') + '.'); osvjezi(true); } });
$('p-zadano').addEventListener('click', () => {
  document.querySelectorAll('[data-par]').forEach((el) => { const d = PARAMETRI.find((p) => p.id === el.dataset.par); if (el.type === 'checkbox') el.checked = !!d.v; else el.value = d.v; });
  citajPar(); dnevnik('Vraćen zadani program.'); osvjezi(true);
});

/* ================================================================== ručni rad */
const RUCNO = [
  { id: 'GRIJ', n: 'Grijanje (DT)', v: [['', 'AUTO'], ['0', '0'], ['1', '1']] },
  { id: 'HLAD', n: 'Hlađenje (DT)', v: [['', 'AUTO'], ['0', '0'], ['1', '1']] },
  { id: 'VENT', n: 'Ventilacija', v: [['', 'AUTO'], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']] },
  { id: 'BYP', n: 'Obilazni vod', v: [['', 'AUTO'], ['0', '0'], ['1', '1']] },
  { id: 'ZAL', n: 'Žaluzine', v: [['', 'AUTO'], ['0', 'gore'], ['1', 'dolje']] },
  { id: 'RASV', n: 'Rasvjeta', v: [['', 'AUTO'], ['0', '0 %'], ['50', '50 %'], ['100', '100 %']] },
  { id: 'SPUMP', n: 'Solarna crpka', v: [['', 'AUTO'], ['0', '0'], ['1', '1']] },
  { id: 'EGRIJ', n: 'El. grijač PTV', v: [['', 'AUTO'], ['0', '0'], ['1', '1']] },
];
$('rucno').innerHTML = RUCNO.map((r) => `<label class="pz-man"><span>${esc(r.n)}</span><select data-man="${r.id}" aria-label="${esc(r.n)}">${r.v.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>`).join('');
$('rucno').addEventListener('change', (e) => {
  const s = e.target.closest('[data-man]'); if (!s) return;
  const id = s.dataset.man, v = s.value;
  const bool = !['VENT', 'RASV'].includes(id);
  man[id] = v === '' ? null : (bool ? v === '1' : +v);
  if (Z) Z.st.man[id] = man[id];
  s.classList.toggle('man', v !== '');
  dnevnik(RUCNO.find((r) => r.id === id).n + ': ' + (v === '' ? 'AUTO' : 'MAN ' + s.options[s.selectedIndex].text) + '.');
  osvjezi(true);
});

/* ================================================================== kvarovi (ručno) */
$('kvarovi').innerHTML = KVAROVI.map((k) => `<label class="kv"><input type="checkbox" data-kvar="${k.id}"> ${esc(k.naziv)}</label>`).join('');
$('kvarovi').addEventListener('change', (e) => {
  const c = e.target.closest('[data-kvar]'); if (!c) return;
  if (c.checked) rucniKvarovi.add(c.dataset.kvar); else rucniKvarovi.delete(c.dataset.kvar);
  if (Z) { if (c.checked) Z.st.kvarovi.add(c.dataset.kvar); else Z.st.kvarovi.delete(c.dataset.kvar); }
  dnevnik('Kvar „' + KVAROVI.find((k) => k.id === c.dataset.kvar).naziv + '“ ' + (c.checked ? 'uključen' : 'isključen') + ' (nastavnik).');
  osvjezi(true);
});

/* ================================================================== dijagnoza */
$('d-odabir').innerHTML = '<option value="">— odaberi uzrok —</option>' + KVAROVI.map((k) => `<option value="${k.id}">${esc(k.naziv)}</option>`).join('') + '<option value="nema">Nema kvara</option>';
$('d-provjeri').addEventListener('click', () => {
  const v = $('d-odabir').value; if (!v) { $('d-rez').textContent = 'Odaberi uzrok.'; return; }
  const aktivan = Z.st.kvarovi.has(tocno);
  if (!aktivan && (S.skriveni || S.kvarOd)) { $('d-rez').textContent = 'Kvar se još nije pojavio — nastavi simulaciju i prati vrijednosti.'; return; }
  dijagnoza = v;
  const ok = v === tocno;
  $('d-rez').innerHTML = ok ? '<b class="pz-ok">Točno.</b> ' + esc(KVAROVI.find((k) => k.id === tocno).opis) : '<b class="pz-ne">Nije to.</b> Pogledaj alarme, povijest i usporedi izmjerene vrijednosti s očekivanima.';
  dnevnik('Dijagnoza: „' + $('d-odabir').options[$('d-odabir').selectedIndex].text + '“ — ' + (ok ? 'točno' : 'netočno') + '.');
  if (gotovo) ocjena();
});

/* ================================================================== dnevnik */
function dnevnik(t) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="t">${Z ? vrijeme(Z.st.t / 3600) : '00:00'}</span> ${esc(t)}`;
  const l = $('log'); l.prepend(li);
  while (l.children.length > 200) l.lastChild.remove();
}
const NAZIV_IZL = { GRIJ: 'Grijanje', HLAD: 'Hlađenje', BYP: 'Obilazni vod', ZAL: 'Žaluzine', SPUMP: 'Solarna crpka', EGRIJ: 'Električni grijač PTV', VENT: 'Ventilacija' };
function promjene(q) {
  if (zadnjeIzl) for (const k of Object.keys(NAZIV_IZL)) {
    if (q.iz[k] !== zadnjeIzl[k]) dnevnik(NAZIV_IZL[k] + (k === 'VENT' ? ' — stupanj ' + q.iz[k] : (q.iz[k] ? ' uključen' + (k === 'ZAL' ? 'e (dolje)' : '') : ' isključen' + (k === 'ZAL' ? 'e (gore)' : ''))) + '.');
  }
  zadnjeIzl = Object.assign({}, q.iz);
  const sad = new Set(q.al.map((a) => a.id));
  q.al.forEach((a) => { if (!zadnjiAlarmi.has(a.id)) dnevnik('ALARM: ' + a.t); });
  zadnjiAlarmi.forEach((id) => { if (!sad.has(id)) dnevnik('Alarm prestao (' + id + ').'); });
  zadnjiAlarmi = sad;
}

/* ================================================================== nadzorna ploča (SVG) */
const CV = {   /* x, y, w, h, naslov */
  sunce: [16, 14, 128, 70, 'Sunce i vrijeme'], fn: [16, 96, 128, 56, 'Fotonapon'], izmj: [16, 166, 128, 56, 'Izmjenjivač'],
  razvod: [236, 170, 150, 50, 'Glavni razvod'], mreza: [496, 170, 128, 50, 'Mreža'],
  opr: [170, 270, 100, 62, 'Oprema'], vent: [290, 270, 100, 62, 'Ventilacija'], rasv: [400, 270, 100, 62, 'Rasvjeta'], dt: [510, 270, 114, 62, 'Dizalica topline'],
  prostor: [236, 14, 220, 132, 'Prostor'], rek: [496, 14, 128, 58, 'Rekuperator'], zal: [496, 96, 128, 50, 'Žaluzine'],
  kol: [16, 268, 128, 56, 'Solarni kolektori'], spr: [16, 340, 128, 56, 'Spremnik PTV'], egr: [170, 346, 100, 52, 'El. grijač'],
};
function mimic() {
  const s = [];
  s.push('<svg viewBox="0 0 640 404" class="pz-mimic" role="img" aria-label="Nadzorna ploča: tokovi energije i vrijednosti zgrade">');
  const linija = (id, d) => s.push(`<path id="l-${id}" class="tok" d="${d}"/>`);
  linija('fn', 'M80 84v12'); linija('izmj', 'M80 152v14'); linija('izr', 'M144 195h92'); linija('mr', 'M386 195h110');
  linija('raz', 'M311 220v25');
  linija('opr', 'M311 245H220v25'); linija('vent', 'M311 245H340v25'); linija('rasv', 'M311 245H450v25'); linija('dt', 'M311 245H567v25');
  linija('egrel', 'M311 245H280V372h-10');
  linija('dtp', 'M624 300h8V84H456'); linija('rek', 'M496 43H456'); linija('zal', 'M496 121H456'); linija('kol', 'M80 324v16'); linija('egr', 'M170 372h-26');
  Object.entries(CV).forEach(([id, [x, y, w, h, n]]) => {
    s.push(`<g id="c-${id}" class="cvor"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><text class="n" x="${x + 8}" y="${y + 16}">${esc(n)}</text>`);
    s.push(`<text class="v" id="v-${id}" x="${x + 8}" y="${y + 32}"></text>`);
    const red = Math.floor((h - 34) / 13);
    for (let i = 0; i < red; i++) s.push(`<text class="v2" id="v${i + 2}-${id}" x="${x + 8}" y="${y + 46 + i * 13}"></text>`);
    s.push('</g>');
  });
  s.push('<path id="sm-mr" class="if" d="M0 0"/>');
  s.push('</svg>');
  $('mimic').innerHTML = s.join('');
}
mimic();
const txt = (id, t) => { const e = $(id); if (e && e.textContent !== t) e.textContent = t; };
const cls = (id, c, on) => { const e = $(id); if (e) e.classList.toggle(c, !!on); };

function crtajMimic(q) {
  const sn = q.snage, m = q.m, iz = q.iz;
  txt('v-sunce', 'G ' + hr(m.G_SUN, 0) + ' W/m²');
  txt('v2-sunce', 'vani ' + hr(m.T_VAN) + ' °C');
  txt('v3-sunce', 'naoblaka ' + hr(q.obl * 100, 0) + ' %');
  txt('v-fn', hr(q.sun.poaFN, 0) + ' W/m² na module');
  txt('v2-fn', 'očekivano ' + hr(sn.fnOcek) + ' kW');
  txt('v-izmj', hr(m.P_FN) + ' kW');
  txt('v2-izmj', m.P_FN > 0.05 ? 'proizvodi' : (m.G_SUN > 50 ? 'ne proizvodi!' : 'noć / malo sunca'));
  txt('v-razvod', 'potrošnja ' + hr(sn.pPotr) + ' kW');
  txt('v2-razvod', 'FN pokriva ' + hr(sn.pPotr > 0 ? Math.min(100, m.P_FN / sn.pPotr * 100) : 0, 0) + ' %');
  txt('v-mreza', (m.P_MR >= 0 ? 'uvoz ' : 'izvoz ') + hr(Math.abs(m.P_MR)) + ' kW');
  txt('v2-mreza', m.P_MR >= 0 ? '→ zgrada' : '← u mrežu');
  txt('v-dt', hr(sn.pDT) + ' kW');
  txt('v2-dt', m.DT_ERR ? 'GREŠKA' : (iz.GRIJ ? 'grije · COP ' + hr(copGrij(m.T_VAN)) : iz.HLAD ? 'hladi · EER ' + hr(eerHlad(m.T_VAN)) : 'miruje'));
  txt('v3-dt', iz.GRIJ || iz.HLAD ? 'toplina ' + hr(Math.abs(sn.qDT) / 1000) + ' kW' : '');
  txt('v-vent', 'stupanj ' + iz.VENT);
  txt('v2-vent', hr(sn.protok, 0) + ' m³/h');
  txt('v3-vent', hr(sn.pVent, 2) + ' kW · ' + hr(m.DP_F, 0) + ' Pa');
  txt('v-rasv', iz.RASV + ' %');
  txt('v2-rasv', hr(sn.pRasv) + ' kW');
  txt('v3-rasv', hr(m.E_LUX, 0) + ' lx');
  txt('v-opr', hr(sn.pOprema) + ' kW');
  txt('v2-opr', q.N + ' osoba');
  txt('v3-opr', '');
  txt('v-prostor', 'T ' + hr(m.T_UN) + ' °C · zadano ' + hr(q.uvjeti.spG) + ' / ' + hr(q.uvjeti.spH));
  txt('v2-prostor', 'CO₂ ' + hr(m.CO2, 0) + ' ppm · ' + (m.PRIS ? 'prisutnost' : 'prazno'));
  txt('v3-prostor', 'solarni dobici ' + hr(sn.qSol / 1000) + ' kW');
  txt('v4-prostor', 'unutarnji dobici ' + hr(sn.qUnutr / 1000) + ' kW');
  txt('v5-prostor', 'gubici ' + hr(sn.qGub / 1000) + ' kW');
  txt('v6-prostor', 'dizalica topline ' + (sn.qDT >= 0 ? '+' : '−') + hr(Math.abs(sn.qDT) / 1000) + ' kW');
  txt('v7-prostor', vrijeme(q.sat) + (q.sat >= 7.5 && q.sat < 15 ? ' · nastava' : ''));
  txt('v-rek', iz.BYP ? 'bypass otvoren' : 'povrat ' + PRETP.rekup.v + ' %');
  txt('v2-rek', 'gubitak ' + hr(sn.hVent * (m.T_UN - m.T_VAN) / 1000) + ' kW');
  txt('v-zal', iz.ZAL ? 'spuštene' : 'podignute');
  txt('v2-zal', iz.ZAL ? 'propuštaju 25 %' : '');
  txt('v-kol', 'T ' + hr(m.T_KOL, 0) + ' °C');
  txt('v2-kol', iz.SPUMP ? (Z.st.kvarovi.has('spump') ? 'nalog, nema protoka' : 'crpka · ' + hr(Math.max(0, sn.qPrijenos) / 1000) + ' kW') : 'crpka miruje');
  txt('v-spr', 'T ' + hr(m.T_SPR) + ' °C');
  txt('v2-spr', m.T_SPR < 44 ? 'premalo za PTV!' : 'PTV ≥ 45 °C');
  txt('v-egr', iz.EGRIJ ? '6,0 kW' : '0 kW');
  txt('v2-egr', iz.EGRIJ ? (q.uvjeti.egrij.visak ? 'višak FN-a' : 'dogrijavanje') : '');
  cls('l-fn', 'akt', m.P_FN > 0.05); cls('l-izmj', 'akt', m.P_FN > 0.05); cls('l-izr', 'akt', m.P_FN > 0.05);
  cls('l-mr', 'akt', Math.abs(m.P_MR) > 0.05); cls('l-mr', 'izvoz', m.P_MR < -0.05);
  cls('l-dt', 'akt', sn.pDT > 0); cls('l-dtp', 'akt', sn.pDT > 0); cls('l-dtp', 'hlad', iz.HLAD);
  cls('l-raz', 'akt', true); cls('l-vent', 'akt', iz.VENT > 0); cls('l-rasv', 'akt', iz.RASV > 0); cls('l-opr', 'akt', true); cls('l-zal', 'akt', iz.ZAL);
  cls('l-rek', 'akt', iz.VENT > 0); cls('l-kol', 'akt', iz.SPUMP && !Z.st.kvarovi.has('spump')); cls('l-egr', 'akt', iz.EGRIJ); cls('l-egrel', 'akt', iz.EGRIJ);
  const al = new Set(q.al.map((a) => a.id));
  cls('c-izmj', 'alarm', al.has('fn')); cls('c-dt', 'alarm', al.has('dt')); cls('c-vent', 'alarm', al.has('filtar')); cls('c-rek', 'alarm', al.has('filtar'));
  cls('c-prostor', 'alarm', al.has('tun') || al.has('co2')); cls('c-spr', 'alarm', al.has('spr')); cls('c-kol', 'alarm', al.has('spump') || al.has('stag'));
  ['dt', 'vent', 'rasv', 'zal', 'egr', 'kol'].forEach((c) => {
    const kl = { dt: ['GRIJ', 'HLAD'], vent: ['VENT', 'BYP'], rasv: ['RASV'], zal: ['ZAL'], egr: ['EGRIJ'], kol: ['SPUMP'] }[c];
    cls('c-' + c, 'man', kl.some((k) => Z.st.man[k] !== null && Z.st.man[k] !== undefined));
  });
  /* strelica smjera na vodu prema mreži */
  $('sm-mr').setAttribute('d', Math.abs(m.P_MR) < 0.05 ? 'M0 0' : (m.P_MR > 0 ? 'M396 189l-10 6 10 6z' : 'M486 189l10 6-10 6z'));
  $('alarmi').innerHTML = q.al.length ? q.al.map((a) => `<li><b>ALARM</b> ${esc(a.t)}</li>`).join('') : '<li class="mir">Nema aktivnih alarma.</li>';
}

/* ================================================================== ljestvičasti prikaz (SVG) */
function precke(q) {
  const u = q.uvjeti, m = q.m, iz = q.iz, p = Z.p;
  const k = (lab, on, neg = false, pod = '') => ({ lab, on: neg ? !on : on, neg, pod });
  return [
    { n: '1 Grijanje', k: [k('T_UN<' + hr(u.spG - p.hist), u.grij.mem, false, 'SR · R: >' + hr(u.spG + p.hist)), k('HLAD', u.hlad.mem, true), k('DT_ERR', m.DT_ERR, true)], z: 'GRIJ', zon: iz.GRIJ },
    { n: '2 Hlađenje', k: [k('T_UN>' + hr(u.spH + p.hist), u.hlad.mem, false, 'SR · R: <' + hr(u.spH - p.hist)), k('GRIJ', u.grij.mem, true), k('DT_ERR', m.DT_ERR, true)], z: 'HLAD', zon: iz.HLAD },
    { n: '3 Noćno hlađenje', k: [k('T_UN>' + hr(p.byp), u.byp.iznad), k('T_VAN<T_UN−2', u.byp.hladnije), k('GRIJ', !u.byp.bezGrij, true)], z: 'BYP', zon: iz.BYP },
    { n: '4 Ventilacija, 2. stupanj', k: [k('PRIS', m.PRIS), k('CO2≥' + hr(p.co2a, 0), u.vent.a)], z: 'VENT≥2', zon: iz.VENT >= 2 },
    { n: '5 Ventilacija, 3. stupanj', k: [k('PRIS', m.PRIS), k('CO2≥' + hr(p.co2b, 0), u.vent.b)], ili: k('BYP · prazno', u.vent.byp), z: 'VENT=3', zon: iz.VENT === 3 },
    { n: '6 Žaluzine', k: [k('G>' + hr(p.zalG, 0), u.zal.g), k('T_UN>' + hr(p.zalT), u.zal.t)], z: 'ZAL', zon: iz.ZAL },
    { n: '7 Rasvjeta (I-regulator)', k: [k('PRIS', m.PRIS), k('E_LUX<' + hr(p.lux, 0), u.rasv.malo)], z: 'RASV↑', zon: m.PRIS && u.rasv.malo },
    { n: '8 Solarna crpka', k: [k('ΔT>' + hr(p.dTon, 0) + ' K', u.spump.mem, false, 'SR · R: <' + hr(p.dToff) + ' K'), k('T_SPR>85', u.spump.zast, true)], z: 'SPUMP', zon: iz.SPUMP },
    { n: '9 Dogrijavanje PTV-a', k: [k('T_SPR<' + hr(p.ptvMin, 0), u.egrij.mem, false, 'SR · R: >' + hr(p.ptvMin + 5, 0))], ili: k('višak FN', u.egrij.visak), z: 'EGRIJ', zon: iz.EGRIJ },
  ];
}
function crtajLadder(q) {
  const P = precke(q), red = 74, dod = 38, s = [];
  const W = 420, xL = 10, xR = 410, x0 = 22, x1 = 318, xc = 360;
  const visina = P.length * red + P.filter((x) => x.ili).length * dod;
  s.push(`<svg viewBox="0 0 ${W} ${visina + 10}" class="pz-lad" role="img" aria-label="Ljestvičasti prikaz programa PLC-a s trenutnim stanjem kontakata">`);
  s.push(`<path class="l" d="M${xL} 4V${visina + 6}M${xR} 4V${visina + 6}"/>`);
  const lin = (a) => (a ? 'pz-ak' : 'l');
  let y = 30;
  P.forEach((pr) => {
    s.push(`<text class="text pz-n" x="${x0 - 6}" y="${y - 19}">${esc(pr.n)}</text>`);
    const n = pr.k.length, korak = (x1 - x0) / Math.max(n, 2);
    let tok = true;
    s.push(`<path class="pz-ak" d="M${xL} ${y}H${x0}"/>`);
    let xk = x0;
    pr.k.forEach((c, i) => {
      const cx = xk + korak / 2, prije = tok;
      tok = tok && c.on;
      s.push(`<path class="${lin(prije)}" d="M${xk} ${y}H${cx - 6}"/>`);
      s.push(`<path class="${c.on ? 'pz-ak2' : 'l2'}" d="M${cx - 6} ${y - 10}v20M${cx + 6} ${y - 10}v20${c.neg ? `M${cx - 9} ${y + 9}L${cx + 9} ${y - 9}` : ''}"/>`);
      s.push(`<text class="text" x="${cx}" y="${y + 23}" text-anchor="middle">${esc(c.lab)}</text>`);
      if (c.pod) s.push(`<text class="text mali" x="${cx}" y="${y + 36}" text-anchor="middle">${esc(c.pod)}</text>`);
      if (i === 0 && pr.ili) {
        const yy = y + dod + 8, ili = pr.ili;
        s.push(`<path class="${lin(prije && ili.on)}" d="M${xk} ${y}V${yy}H${cx - 6}M${cx + 6} ${yy}H${xk + korak}V${y}"/>`);
        s.push(`<path class="${ili.on ? 'pz-ak2' : 'l2'}" d="M${cx - 6} ${yy - 10}v20M${cx + 6} ${yy - 10}v20"/>`);
        s.push(`<text class="text" x="${cx}" y="${yy + 23}" text-anchor="middle">${esc(ili.lab)}</text>`);
        tok = prije && (c.on || ili.on);
      }
      s.push(`<path class="${lin(tok)}" d="M${cx + 6} ${y}H${xk + korak}"/>`);
      xk += korak;
    });
    const on = pr.zon;
    s.push(`<path class="${lin(tok && on)}" d="M${xk} ${y}H${xc - 12}"/>`);
    s.push(`<path class="${on ? 'pz-ak2' : 'l2'}" d="M${xc - 6} ${y - 10}a11 11 0 0 0 0 20M${xc + 6} ${y - 10}a11 11 0 0 1 0 20"/>`);
    s.push(`<path class="${lin(on)}" d="M${xc + 12} ${y}H${xR}"/>`);
    s.push(`<text class="text pz-zav" x="${xc}" y="${y + 24}" text-anchor="middle">${esc(pr.z)}</text>`);
    y += red + (pr.ili ? dod : 0);
  });
  s.push('</svg>');
  $('ladder').innerHTML = s.join('');
}

/* ================================================================== ulazi i izlazi */
function crtajIO(q) {
  const v = (s) => {
    const id = s.id;
    const x = id in q.m ? q.m[id] : q.iz[id];
    if (typeof x === 'boolean') return `<span class="pz-bit${x ? ' on' : ''}">${x ? '1' : '0'}</span>`;
    const d = { T_UN: 1, T_VAN: 1, G_SUN: 0, CO2: 0, E_LUX: 0, T_KOL: 0, T_SPR: 1, P_FN: 1, P_MR: 1, DP_F: 0, VENT: 0, RASV: 0 }[id] ?? 1;
    return hr(x, d) + (s.jed ? ' ' + s.jed : '');
  };
  $('io').innerHTML = SIGNALI.map((s) => {
    const man = Z.st.man[s.id] !== null && Z.st.man[s.id] !== undefined;
    return `<tr><td><b>${esc(s.id)}</b></td><td>${esc(s.adr)}</td><td class="pz-r">${v(s)}${man ? ' <span class="uz-oz">MAN</span>' : ''}</td></tr>`;
  }).join('');
}

/* ================================================================== bilanca */
function crtajBilancu() {
  const p = Z.pokazatelji();
  const r = [
    ['Proizvodnja FN', hr(p.eFN) + ' kWh'], ['Potrošnja zgrade', hr(p.ePotr) + ' kWh'], ['Uvoz iz mreže', hr(p.eUvoz) + ' kWh'], ['Izvoz u mrežu', hr(p.eIzvoz) + ' kWh'],
    ['Samodostatnost', hr(p.samodostatnost, 0) + ' %'], ['Vlastita potrošnja FN-a', hr(p.vlastita, 0) + ' %'],
    ['Dizalica topline (el.)', hr(p.eDT) + ' kWh'], ['Toplina grijanja / hlađenja', hr(p.qGrij) + ' / ' + hr(p.qHlad) + ' kWh'],
    ['Ventilacija', hr(p.eVent) + ' kWh'], ['Rasvjeta', hr(p.eRasv) + ' kWh'], ['El. grijač PTV', hr(p.eEgrij) + ' kWh'], ['Solarna toplina u spremnik', hr(p.qSol) + ' kWh'],
    ['Sati nastave < 20 °C / > 26 °C', hr(p.satiHladno, 2) + ' / ' + hr(p.satiToplo, 2)], ['Sati nastave CO₂ > 1200 ppm', hr(p.satiCO2, 2)], ['Sati PTV < 44 °C', hr(p.satiPTV, 2)],
    ['Trošak (uvoz − otkup)', hr(p.trosak, 2) + ' €'], ['Emisije zbog uvoza', hr(p.kgCO2) + ' kg CO₂'],
  ];
  if (S.kvarOd || p.izgubljeno > 0.05) r.push(['Izgubljena proizvodnja FN', hr(p.izgubljeno) + ' kWh']);
  $('bil').innerHTML = r.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
}

/* ================================================================== grafovi (canvas) */
const GRAFOVI = [
  { el: 'g-snaga', jed: 'kW', ser: [['pFN', 'Fotonapon', 's1'], ['pPotr', 'Potrošnja', 's2'], ['pMR', 'Mreža (+ uvoz, − izvoz)', 's3']], d: 1 },
  { el: 'g-temp', jed: '°C', ser: [['tUn', 'Prostor (izmjereno)', 's1'], ['tSpr', 'Spremnik PTV', 's2'], ['tVan', 'Vani', 's3']], d: 1, pojas: [20, 26] },
  { el: 'g-zrak', jed: 'ppm', ser: [['co2', 'CO₂ (izmjereno)', 's1']], d: 0, prag: [1000, 1200], min0: 400 },
];
function boje() {
  const cs = getComputedStyle(document.documentElement);
  return { s1: cs.getPropertyValue('--pz-s1').trim(), s2: cs.getPropertyValue('--pz-s2').trim(), s3: cs.getPropertyValue('--pz-s3').trim(), ink: cs.getPropertyValue('--ink').trim(), body: cs.getPropertyValue('--body').trim(), rule: cs.getPropertyValue('--rule').trim(), tanko: cs.getPropertyValue('--tanko').trim() };
}
GRAFOVI.forEach((g) => {
  const omot = $(g.el).parentElement;
  omot.insertAdjacentHTML('afterbegin', `<ul class="pz-leg">${g.ser.map(([, n, c]) => `<li><i class="pz-sw ${c}"></i>${esc(n)}</li>`).join('')}</ul>`);
  const c = $(g.el);
  c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); g.hover = (e.clientX - r.left) / r.width; crtajGraf(g); });
  c.addEventListener('pointerleave', () => { g.hover = null; crtajGraf(g); });
});
function crtajGraf(g) {
  const c = $(g.el); const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const B = boje(), H = Z ? Z.povijest : [];
  const L = 44, R = 12, T = 8, Bt = 22, pw = w - L - R, ph = h - T - Bt;
  let lo = Infinity, hi = -Infinity;
  H.forEach((r) => g.ser.forEach(([k]) => { lo = Math.min(lo, r[k]); hi = Math.max(hi, r[k]); }));
  if (g.pojas) { lo = Math.min(lo, g.pojas[0] - 2); hi = Math.max(hi, g.pojas[1] + 1); }
  if (g.prag) { hi = Math.max(hi, g.prag[1] + 100); }
  if (g.min0 !== undefined) lo = Math.min(lo, g.min0);
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (g.jed === 'kW') { lo = Math.min(lo, 0); }
  const raspon = hi - lo || 1; lo -= raspon * 0.05; hi += raspon * 0.05;
  const korakY = (() => { const r = (hi - lo) / 4, e = Math.pow(10, Math.floor(Math.log10(r))); return [1, 2, 2.5, 5, 10].map((k) => k * e).find((k) => k >= r) || r; })();
  const X = (t) => L + t / 24 * pw, Y = (v) => T + (1 - (v - lo) / (hi - lo)) * ph;
  x.font = '11px "IBM Plex Sans", system-ui, sans-serif'; x.fillStyle = B.body; x.strokeStyle = B.rule; x.lineWidth = 1;
  if (g.pojas) { x.fillStyle = B.tanko; x.fillRect(L, Y(g.pojas[1]), pw, Y(g.pojas[0]) - Y(g.pojas[1])); x.fillStyle = B.body; }
  for (let v = Math.ceil(lo / korakY) * korakY; v <= hi; v += korakY) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(hr(v, korakY < 1 ? 1 : 0), L - 6, Y(v) + 4); }
  x.textAlign = 'center';
  for (let t = 0; t <= 24; t += 3) { x.fillText(String(t).padStart(2, '0') + 'h', X(t), h - 6); }
  if (g.prag) { x.save(); x.setLineDash([4, 4]); x.strokeStyle = B.body; g.prag.forEach((v) => { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(hr(v, 0) + ' ppm', L + pw - 4, Y(v) - 4); }); x.restore(); }
  if (g.jed === 'kW') { x.save(); x.strokeStyle = B.body; x.beginPath(); x.moveTo(L, Y(0)); x.lineTo(L + pw, Y(0)); x.stroke(); x.restore(); }
  g.ser.forEach(([k, , c]) => {
    if (H.length < 2) return;
    x.save(); x.strokeStyle = B[c]; x.lineWidth = 2; x.lineJoin = 'round'; x.beginPath();
    H.forEach((r, i) => { const px = X(r.t), py = Y(r[k]); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
    x.stroke(); x.restore();
  });
  /* oznaka vrijednosti na kraju crte (izravna oznaka) */
  if (H.length) { const z = H[H.length - 1]; g.ser.forEach(([k, , c]) => { x.fillStyle = B[c]; x.beginPath(); x.arc(X(z.t), Y(z[k]), 3.5, 0, Math.PI * 2); x.fill(); }); }
  /* križić i oblačić */
  if (g.hover !== null && g.hover !== undefined && H.length) {
    const t = Math.max(0, Math.min(24, (g.hover * w - L) / pw * 24));
    let best = H[0]; for (const r of H) if (Math.abs(r.t - t) < Math.abs(best.t - t)) best = r;
    const px = X(best.t);
    x.save(); x.strokeStyle = B.ink; x.globalAlpha = 0.5; x.beginPath(); x.moveTo(px, T); x.lineTo(px, T + ph); x.stroke(); x.restore();
    g.ser.forEach(([k, , c]) => { x.fillStyle = B[c]; x.beginPath(); x.arc(px, Y(best[k]), 4, 0, Math.PI * 2); x.fill(); });
    const tip = $(g.el + '-tip');
    tip.hidden = false;
    tip.innerHTML = `<b>${vrijeme(best.t)}</b>` + g.ser.map(([k, n, c]) => `<span><i class="pz-sw ${c}"></i>${esc(n)}: ${hr(best[k], g.d)} ${g.jed}</span>`).join('');
    tip.style.left = Math.min(Math.max(0, px + 10), w - 190) + 'px';
  } else { const tip = $(g.el + '-tip'); if (tip) tip.hidden = true; }
}
function crtajGrafove() { GRAFOVI.forEach(crtajGraf); }
new ResizeObserver(crtajGrafove).observe($('k-graf'));
const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', crtajGrafove);
new MutationObserver(crtajGrafove).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ================================================================== ocjena */
function kraj() {
  gotovo = true; radi = false;
  $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = 'Ponovi dan';
  dnevnik('Kraj dana (24:00).');
  osvjezi(true); ocjena();
}
function ocjena() {
  const p = Z.pokazatelji();
  const zad = napraviZgradu(S, zadaniParametri(), { kvarovi: [...rucniKvarovi], kvarOd: S.skriveni ? { id: tocno, sat: 0 } : undefined });
  zad.doKraja(); const pz = zad.pokazatelji();
  const prov = provjeri(S, p, dijagnoza, tocno);
  const red = (n, a, b, d = 1, j = '') => `<tr><td>${esc(n)}</td><td class="pz-r">${hr(a, d)}${j}</td><td class="pz-r">${hr(b, d)}${j}</td></tr>`;
  let h = '';
  if (prov.length) h += '<ul class="pz-prov">' + prov.map((c) => `<li class="${c.ok ? 'ok' : 'ne'}"><b>${c.ok ? '✓' : '✗'}</b> ${esc(c.t)}: ${c.v === null || c.v === undefined ? 'nije odabrano' : (typeof c.v === 'number' ? hr(c.v, c.v % 1 ? 1 : 0) : esc((KVAROVI.find((k) => k.id === c.v) || { naziv: c.v === 'nema' ? 'nema kvara' : c.v }).naziv))}${c.op !== '==' ? ' (cilj ' + ({ '<=': '≤', '>=': '≥' }[c.op]) + ' ' + hr(c.cilj, c.cilj % 1 ? 1 : 0) + ')' : ''}</li>`).join('') + '</ul>';
  const svi = prov.length && prov.every((c) => c.ok);
  if (prov.length) h += `<p class="${svi ? 'pz-ok' : 'pz-ne'}"><b>${svi ? 'Cilj scenarija je ispunjen.' : 'Cilj scenarija još nije ispunjen.'}</b> ${svi ? '' : (prov.some((c) => c.t.includes('uzrok') && !c.ok) ? 'Odaberi uzrok u kartici „Dijagnoza kvara“.' : 'Promijeni parametre programa i ponovi dan.')}</p>`;
  h += `<div class="uz-tbl-omot"><table class="uz-tbl pz-usp"><thead><tr><th>Pokazatelj</th><th class="pz-r">Tvoj program</th><th class="pz-r">Zadani program</th></tr></thead><tbody>` +
    red('Uvoz iz mreže', p.eUvoz, pz.eUvoz, 1, ' kWh') + red('Samodostatnost', p.samodostatnost, pz.samodostatnost, 0, ' %') + red('Dizalica topline (el.)', p.eDT, pz.eDT, 1, ' kWh') +
    red('Sati nastave izvan 20–26 °C', p.satiHladno + p.satiToplo, pz.satiHladno + pz.satiToplo, 2) + red('Najviši CO₂ u nastavi', p.maxCO2, pz.maxCO2, 0, ' ppm') + red('Trošak', p.trosak, pz.trosak, 2, ' €') + '</tbody></table></div>';
  if (S.kvarOd || S.skriveni) h += `<p class="pom">Izgubljena proizvodnja fotonapona zbog kvara: <b>${hr(p.izgubljeno)} kWh</b>.</p>`;
  $('rez').innerHTML = h;
}

/* ================================================================== četiri dana */
function godina() {
  zaustavi();
  const dani = S.godina.map((id) => SCENARIJI.find((x) => x.id === id));
  const rez = dani.map((d) => { const z = napraviZgradu(d, par, { kvarovi: [...rucniKvarovi] }); z.doKraja(); return { d, p: z.pokazatelji(), z }; });
  Z = rez[rez.length - 1].z; gotovo = true;
  osvjezi(true);
  const s = (k) => rez.reduce((a, r) => a + r.p[k], 0);
  $('rez').innerHTML = `<div class="uz-tbl-omot"><table class="uz-tbl pz-usp"><thead><tr><th>Dan</th><th class="pz-r">FN</th><th class="pz-r">Potrošnja</th><th class="pz-r">Uvoz</th><th class="pz-r">Izvoz</th><th class="pz-r">Samodost.</th></tr></thead><tbody>` +
    rez.map((r) => `<tr><td>${esc(r.d.datum)}</td><td class="pz-r">${hr(r.p.eFN, 0)}</td><td class="pz-r">${hr(r.p.ePotr, 0)}</td><td class="pz-r">${hr(r.p.eUvoz, 0)}</td><td class="pz-r">${hr(r.p.eIzvoz, 0)}</td><td class="pz-r">${hr(r.p.samodostatnost, 0)} %</td></tr>`).join('') +
    `</tbody></table></div><p class="pom">Vrijednosti u kWh po danu. Grubo za godinu (četiri dana × 91 dan, samo radni dani, <span class="uz-oz">procjena</span>): fotonapon ≈ ${hr(s('eFN') * 91 / 1000, 1)} MWh, potrošnja ≈ ${hr(s('ePotr') * 91 / 1000, 1)} MWh, uvoz ≈ ${hr(s('eUvoz') * 91 / 1000, 1)} MWh, izvoz ≈ ${hr(s('eIzvoz') * 91 / 1000, 1)} MWh.</p>`;
  crtajStupce(rez);
  dnevnik('Izračunana četiri tipična dana; grafovi prikazuju zadnji (jesen).');
}
function crtajStupce(rez) {
  const c = $('g-godina'); const w = c.clientWidth, h = c.clientHeight; if (!w) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const B = boje(); const L = 40, T = 10, Bt = 34, pw = w - L - 10, ph = h - T - Bt;
  const hi = Math.max(...rez.map((r) => Math.max(r.p.eFN, r.p.ePotr))) * 1.1;
  const Y = (v) => T + (1 - v / hi) * ph;
  x.font = '11px "IBM Plex Sans", system-ui, sans-serif'; x.strokeStyle = B.rule; x.fillStyle = B.body;
  for (let v = 0; v <= hi; v += 50) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(String(v), L - 6, Y(v) + 4); }
  const gw = pw / rez.length, bw = Math.min(34, gw / 3);
  rez.forEach((r, i) => {
    const cx = L + gw * i + gw / 2;
    [['eFN', 's1', -1], ['ePotr', 's2', 1]].forEach(([k, col, sm]) => {
      const bx = cx + (sm < 0 ? -bw - 1 : 1), by = Y(r.p[k]);
      x.fillStyle = B[col]; x.beginPath(); if (x.roundRect) x.roundRect(bx, by, bw, Y(0) - by, [4, 4, 0, 0]); else x.rect(bx, by, bw, Y(0) - by); x.fill();
      x.fillStyle = B.ink; x.textAlign = 'center'; x.fillText(hr(r.p[k], 0), bx + bw / 2, by - 4);
    });
    x.fillStyle = B.body; x.textAlign = 'center'; x.fillText(r.d.datum, cx, h - 18);
  });
}

/* ================================================================== osvježavanje */
let zadnjiDom = 0, zadnjiGraf = 0, zadnjaDuljina = -1;
function osvjezi(sve = false) {
  const q = Z.zadnje; if (!q) return;
  const t = performance.now();
  promjene(q);
  if (sve || t - zadnjiDom > 120) {
    zadnjiDom = t;
    txt('s-vrijeme', vrijeme(Z.st.t / 3600));
    $('s-napredak').style.width = Math.min(100, Z.st.t / 864) + '%';
    crtajMimic(q); crtajLadder(q); crtajIO(q); crtajBilancu();
  }
  if (sve || (Z.povijest.length !== zadnjaDuljina && t - zadnjiGraf > 250)) { zadnjiGraf = t; zadnjaDuljina = Z.povijest.length; crtajGrafove(); }
}
function petlja(t) {
  requestAnimationFrame(petlja);
  if (!radi || gotovo) { zadnjiT = t; return; }
  const dt = Math.min(0.25, (t - zadnjiT) / 1000); zadnjiT = t;
  acc += dt * brzina;
  let n = 0;
  while (acc >= KORAK && n < 600) { Z.korak(); promjene(Z.zadnje); acc -= KORAK; n++; if (Z.st.t >= 86400 - 1e-6) break; }
  osvjezi();
  if (Z.st.t >= 86400 - 1e-6) kraj();
}

/* vježbe ispod simulatora otvaraju scenarij */
document.querySelectorAll('[data-otvori-scen]').forEach((b) => b.addEventListener('click', () => {
  postaviScen(b.dataset.otvoriScen);
  $('k-scen').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}));

citajPar();
const pocetni = new URLSearchParams(location.search).get('scenarij');
postaviScen(SCENARIJI.some((s) => s.id === pocetni) ? pocetni : 'zima');
requestAnimationFrame(petlja);
window.__pz = { get Z() { return Z; }, postaviScen, godina, get tocno() { return tocno; } };
