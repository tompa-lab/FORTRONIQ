/* FORTRONIQ · Pametni plastenik — Simulator.
   Model i program PLC-a: pp_fizika.js; podaci i scenariji: pp_podaci.js.
   Dvije razine upravljanja: pravila „ako … onda …“ s pragovima i histerezom (početna) i ljestvičasti dijagram s istim
   signalima (napredna). SCADA ploča, grafovi, alarmi s vremenom, potrošnja vode i struje, indeks stresa,
   ručni rad, kvarovi, dijagnoza, ocjena, bodovi i najbolji rezultati. © ForTroniQ d.o.o. */
import { SCENARIJI, PARAMETRI, KVAROVI, SIGNALI, PRETP } from './pp_podaci.js';
import { napraviPlastenik, zadaniParametri, provjeri, KORAK } from './pp_fizika.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => { if (!isFinite(n)) return '—'; let s = (Math.round(n * 10 ** d) / 10 ** d).toFixed(d); if (/^-0(\.0+)?$/.test(s)) s = s.slice(1); const neg = s[0] === '-'; if (neg) s = s.slice(1); let [c, dd] = s.split('.'); if (c.length > 4) c = c.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (neg ? '−' : '') + c + (dd ? ',' + dd : ''); };
const sat2 = (h) => { const m = Math.round(((h % 24) + 24) % 24 * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const citaj = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const pisi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bez pohrane */ } };

/* ================================================================== stanje */
let S = SCENARIJI[0], par = zadaniParametri(), Z = null, radi = false, brzina = 600, acc = 0, zadnjiT = 0, gotovo = false;
let dij = { uzrok: null, sati: null }, zadnjeIzl = null, zadnjiAlarmi = new Set();
const man = {}, rucniKvarovi = new Set();
const vrijemeSim = () => (Z.st.t / 3600);

function novi() {
  Z = napraviPlastenik(S, par, { kvarovi: [...rucniKvarovi] });
  Object.assign(Z.st.man, man);
  dij = { uzrok: null, sati: null }; gotovo = false; acc = 0; zadnjeIzl = null; zadnjiAlarmi = new Set();
  Z.korak();
  $('log').innerHTML = '';
  dnevnik('Početak scenarija „' + S.naziv + '“ (' + S.datum + ').');
  $('rez').innerHTML = '<p class="pom">Ocjena se prikazuje na kraju scenarija.</p>';
  $('d-rez').textContent = ''; $('d-odabir').value = '';
  $('sezona').hidden = true;
  osvjezi(true);
}

/* ================================================================== scenariji */
$('s-scen').innerHTML = SCENARIJI.map((s) => `<option value="${s.id}">${esc(s.naziv)}</option>`).join('');
const OP = { '<=': '≤', '>=': '≥', '<': '<', '>': '>', '==': '=' };
function postaviScen(id) {
  S = SCENARIJI.find((x) => x.id === id) || SCENARIJI[0];
  $('s-scen').value = S.id;
  $('s-cilj').innerHTML = `<b>${esc(S.datum)}.</b> ${esc(S.cilj)}<span class="pom">Uspjeh: ` +
    S.provjera.map((c) => esc(c.t) + (typeof c.v === 'number' ? ' ' + OP[c.op] + ' ' + hr(c.v, c.v % 1 ? 1 : 0) : '')).join(' · ') + '</span>';
  $('k-dijag').hidden = !S.kvarOd;
  radi = false; $('s-pokreni').setAttribute('aria-pressed', 'false');
  $('s-pokreni').textContent = S.sezona ? 'Izračunaj sezonu' : 'Pokreni';
  $('s-kraj').hidden = !!S.sezona;
  novi();
}
$('s-scen').addEventListener('change', () => postaviScen($('s-scen').value));
$('s-pokreni').addEventListener('click', () => {
  if (S.sezona) { sezona(); return; }
  if (gotovo) novi();
  radi = !radi; zadnjiT = performance.now();
  $('s-pokreni').setAttribute('aria-pressed', radi ? 'true' : 'false');
  $('s-pokreni').textContent = radi ? 'Pauza' : 'Nastavi';
});
$('s-ponovo').addEventListener('click', () => { radi = false; $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = S.sezona ? 'Izračunaj sezonu' : 'Pokreni'; novi(); });
$('s-kraj').addEventListener('click', () => { if (gotovo || S.sezona) return; while (Z.st.t - Z.t0 < Z.trajanje - 1e-6) { Z.korak(); promjene(Z.zadnje); } kraj(); });
document.querySelectorAll('#brzine button').forEach((b) => b.addEventListener('click', () => {
  brzina = +b.dataset.brzina;
  document.querySelectorAll('#brzine button').forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
}));

/* ================================================================== pravila „ako … onda …“ (početna razina) */
const ul = (id) => { const d = PARAMETRI.find((p) => p.id === id); return `<span class="pp-ul"><input type="number" inputmode="decimal" data-par="${id}" min="${d.min}" max="${d.max}" step="${d.korak}" value="${d.v}" aria-label="${esc(d.naziv)}"><i>${esc(d.jed)}</i></span>`; };
const PRAVILA = [
  { n: 'Navodnjavanje', t: `AKO vlaga tla padne ispod ${ul('tloOn')} → <b>OTVORI</b> elektroventil. <b>ZATVORI</b> ga kad vlaga poraste iznad ${ul('tloOff')}.`, par: ['tloOn', 'tloOff'] },
  { n: 'Krovni prozor', t: `AKO je zrak topliji od ${ul('pOtv')} → <b>OTVORI</b> krovni prozor. <b>ZATVORI</b> ga kad se ohladi ispod ${ul('pZat')}.`, par: ['pZat', 'pOtv'] },
  { n: 'Grijač', t: `AKO je zrak hladniji od ${ul('gOn')} → <b>UKLJUČI</b> grijač (samo uz zatvoren prozor). <b>ISKLJUČI</b> ga iznad ${ul('gOff')}.`, par: ['gOn', 'gOff'] },
  { n: 'Zasjena', t: `AKO je ozračenje jače od ${ul('zOn')} → <b>SPUSTI</b> zasjenu. <b>PODIGNI</b> je kad padne ispod ${ul('zOff')}.`, par: ['zOff', 'zOn'] },
  { n: 'Ventilator', t: `AKO je zrak topliji od ${ul('vT')} ILI je vlaga zraka iznad ${ul('vRH')} → <b>UKLJUČI</b> ventilator.`, par: null },
  { n: 'Rasvjeta', t: `<label class="kv"><input type="checkbox" data-par="led"> <b>UKLJUČI</b> dopunsku rasvjetu od 6 do 20 h kad je ozračenje ispod 50 W/m² (za rasadu).</label>`, par: null },
];
$('pravila').innerHTML = PRAVILA.map((r, i) => `<li class="pp-pravilo" data-i="${i}"><span class="pp-pn">${i + 1} ${esc(r.n)}</span><p>${r.t}</p><p class="pp-upoz" hidden></p></li>`).join('');
function citajPar() {
  document.querySelectorAll('[data-par]').forEach((el) => {
    const d = PARAMETRI.find((p) => p.id === el.dataset.par);
    let v = el.type === 'checkbox' ? (el.checked ? 1 : 0) : parseFloat(String(el.value).replace(',', '.'));
    if (!isFinite(v)) v = d.v;
    v = Math.min(d.max, Math.max(d.min, v));
    par[d.id] = v; if (Z) Z.p[d.id] = v;
  });
  PRAVILA.forEach((r, i) => {
    const u = document.querySelector(`.pp-pravilo[data-i="${i}"] .pp-upoz`);
    if (!r.par) return;
    const [a, b] = r.par; const los = par[b] <= par[a];
    u.hidden = !los; u.textContent = los ? 'Histereza: granica isključivanja mora biti iza granice uključivanja, inače izlaz titra.' : '';
  });
  const prom = PARAMETRI.filter((p) => par[p.id] !== p.v).length;
  $('p-prom').textContent = prom ? 'Promijenjeno: ' + prom : 'Zadani program';
}
$('pravila').addEventListener('change', (e) => { if (e.target.matches('[data-par]')) { citajPar(); dnevnik('Pravilo: „' + PARAMETRI.find((p) => p.id === e.target.dataset.par).naziv + '“ = ' + hr(par[e.target.dataset.par], 1).replace(',0', '') + '.'); osvjezi(true); } });
$('p-zadano').addEventListener('click', () => {
  document.querySelectorAll('[data-par]').forEach((el) => { const d = PARAMETRI.find((p) => p.id === el.dataset.par); if (el.type === 'checkbox') el.checked = !!d.v; else el.value = d.v; });
  citajPar(); dnevnik('Vraćen zadani program.'); osvjezi(true);
});

/* ================================================================== ručni rad */
const RUCNO = [
  { id: 'VENTIL', n: 'Elektroventil' }, { id: 'OTVORI', n: 'Prozor — otvori' }, { id: 'ZATVORI', n: 'Prozor — zatvori' }, { id: 'GRIJ', n: 'Grijač' },
  { id: 'ZAS', n: 'Zasjena' }, { id: 'VENT', n: 'Ventilator' }, { id: 'LED', n: 'Rasvjeta' },
];
$('rucno').innerHTML = RUCNO.map((r) => `<label class="pz-man"><span>${esc(r.n)}</span><select data-man="${r.id}" aria-label="${esc(r.n)}"><option value="">AUTO</option><option value="0">MAN 0</option><option value="1">MAN 1</option></select></label>`).join('');
$('rucno').addEventListener('change', (e) => {
  const s = e.target.closest('[data-man]'); if (!s) return;
  man[s.dataset.man] = s.value === '' ? null : s.value === '1';
  if (Z) Z.st.man[s.dataset.man] = man[s.dataset.man];
  s.classList.toggle('man', s.value !== '');
  dnevnik(RUCNO.find((r) => r.id === s.dataset.man).n + ': ' + (s.value === '' ? 'AUTO' : 'MAN ' + s.value) + '.');
  osvjezi(true);
});

/* ================================================================== kvarovi i dijagnoza */
$('kvarovi').innerHTML = KVAROVI.map((k) => `<label class="kv"><input type="checkbox" data-kvar="${k.id}"> ${esc(k.naziv)}</label>`).join('');
$('kvarovi').addEventListener('change', (e) => {
  const c = e.target.closest('[data-kvar]'); if (!c) return;
  if (c.checked) rucniKvarovi.add(c.dataset.kvar); else rucniKvarovi.delete(c.dataset.kvar);
  if (Z) { if (c.checked) Z.st.kvarovi.add(c.dataset.kvar); else Z.st.kvarovi.delete(c.dataset.kvar); }
  dnevnik('Kvar „' + KVAROVI.find((k) => k.id === c.dataset.kvar).naziv + '“ ' + (c.checked ? 'uključen' : 'isključen') + ' (nastavnik).');
  osvjezi(true);
});
$('d-odabir').innerHTML = '<option value="">— odaberi uzrok —</option>' + KVAROVI.map((k) => `<option value="${k.id}">${esc(k.naziv)}</option>`).join('') + '<option value="nema">Nema kvara</option>';
$('d-provjeri').addEventListener('click', () => {
  const v = $('d-odabir').value; if (!v) { $('d-rez').textContent = 'Odaberi uzrok.'; return; }
  const tocno = S.kvarOd && S.kvarOd.id;
  if (!Z.st.kvarT) { $('d-rez').textContent = 'Kvar se još nije pojavio — nastavi simulaciju i prati vrijednosti.'; return; }
  dij = { uzrok: v, sati: (Z.st.t - Z.st.kvarT) / 3600 };
  const ok = v === tocno;
  $('d-rez').innerHTML = (ok ? '<b class="pz-ok">Točno.</b> ' + esc(KVAROVI.find((k) => k.id === tocno).opis) : '<b class="pz-ne">Nije to.</b> Usporedi izmjerene vrijednosti s onim što bi trebale biti i pogledaj alarme.') + ` <span class="pom">(${hr(dij.sati, 1)} h nakon kvara)</span>`;
  dnevnik('Dijagnoza: „' + $('d-odabir').options[$('d-odabir').selectedIndex].text + '“ — ' + (ok ? 'točno' : 'netočno') + '.');
  if (gotovo) ocjena();
});

/* ================================================================== dnevnik */
function dnevnik(t) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="t">${Z ? sat2(vrijemeSim()) : '00:00'}</span> ${esc(t)}`;
  const l = $('log'); l.prepend(li); while (l.children.length > 200) l.lastChild.remove();
}
const NAZ = { VENTIL: 'Elektroventil', OTVORI: 'Prozor — otvaranje', ZATVORI: 'Prozor — zatvaranje', GRIJ: 'Grijač', ZAS: 'Zasjena', VENT: 'Ventilator', LED: 'Rasvjeta' };
function promjene(q) {
  if (zadnjeIzl) for (const k of Object.keys(NAZ)) if (q.iz[k] !== zadnjeIzl[k]) dnevnik(NAZ[k] + (q.iz[k] ? ' — uključeno.' : ' — isključeno.'));
  zadnjeIzl = Object.assign({}, q.iz);
  const sad = new Set(q.al.map((a) => a.id));
  q.al.forEach((a) => { if (!zadnjiAlarmi.has(a.id)) dnevnik('ALARM: ' + a.t); });
  zadnjiAlarmi.forEach((id) => { if (!sad.has(id)) dnevnik('Alarm prestao (' + id + ').'); });
  zadnjiAlarmi = sad;
}

/* ================================================================== SCADA ploča (SVG) */
const CV = {
  sunce: [16, 14, 128, 70, 'Vrijeme vani'], grij: [16, 100, 128, 56, 'Grijač'], navod: [16, 172, 128, 70, 'Navodnjavanje'], spr: [16, 258, 128, 56, 'Voda'],
  pokrov: [160, 14, 140, 70, 'Pokrov i zasjena'], prozor: [314, 14, 140, 70, 'Krovni prozor'], zrak: [160, 100, 294, 106, 'Zrak u plasteniku'],
  tlo: [160, 222, 140, 70, 'Tlo'], biljke: [314, 222, 140, 70, 'Biljke'],
  vent: [470, 14, 154, 70, 'Ventilator'], led: [470, 100, 154, 56, 'Rasvjeta'], struja: [470, 172, 154, 142, 'Struja'],
  bod: [16, 330, 608, 56, 'Rezultat'],
};
function mimic() {
  const s = ['<svg viewBox="0 0 640 400" class="pz-mimic" role="img" aria-label="Nadzorna ploča plastenika: vrijeme, zrak, tlo, biljke, aktuatori, voda i struja">'];
  const l = (id, d) => s.push(`<path id="l-${id}" class="tok" d="${d}"/>`);
  l('sun', 'M144 49h16'); l('zas', 'M230 84v16'); l('pro', 'M384 84v16'); l('vent', 'M470 49h-8V128H454'); l('led', 'M470 140H454');
  l('grij', 'M144 128h16'); l('navod', 'M144 207h8V257h8'); l('spr', 'M80 258v-16'); l('tb', 'M300 257h14'); l('zb', 'M384 206v16');
  Object.entries(CV).forEach(([id, [x, y, w, h, n]]) => {
    s.push(`<g id="c-${id}" class="cvor"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><text class="n" x="${x + 8}" y="${y + 16}">${esc(n)}</text><text class="v" id="v-${id}" x="${x + 8}" y="${y + 32}"></text>`);
    const red = Math.floor((h - 34) / 13);
    for (let i = 0; i < red; i++) s.push(`<text class="v2" id="v${i + 2}-${id}" x="${x + 8}" y="${y + 46 + i * 13}"></text>`);
    s.push('</g>');
  });
  s.push('</svg>');
  $('mimic').innerHTML = s.join('');
}
mimic();
const txt = (id, t) => { const e = $(id); if (e && e.textContent !== t) e.textContent = t; };
const cls = (id, c, on) => { const e = $(id); if (e) e.classList.toggle(c, !!on); };
function crtajMimic(q) {
  const m = q.m, iz = q.iz, sn = q.snage, p = Z.pokazatelji(), k = Z.st.kvarovi;
  txt('v-sunce', 'G ' + hr(m.G, 0) + ' W/m²'); txt('v2-sunce', 'vani ' + hr(m.T_VAN) + ' °C'); txt('v3-sunce', 'naoblaka ' + hr(q.obl * 100, 0) + ' %');
  txt('v-grij', iz.GRIJ ? (k.has('grijac') ? 'nalog, ne grije' : '20 kW') : 'isključen'); txt('v2-grij', iz.GRIJ ? 'radi' : '');
  txt('v-navod', iz.VENTIL ? 'ventil otvoren' : 'ventil zatvoren'); txt('v2-navod', iz.VENTIL ? (k.has('ventil') ? 'nalog, nema protoka' : PRETP.voda.v + ' m³/h') : ''); txt('v3-navod', 'crpka ' + (iz.VENTIL ? '0,5 kW' : 'miruje'));
  txt('v-spr', hr(p.vodaL, 0) + ' L'); txt('v2-spr', 'od početka');
  txt('v-pokrov', 'unutra ' + hr(sn.gIn, 0) + ' W/m²'); txt('v2-pokrov', 'sunce ' + hr(sn.qSun / 1000) + ' kW'); txt('v3-pokrov', iz.ZAS ? 'zasjena SPUŠTENA' : 'zasjena podignuta');
  const poz = Z.st.poz;
  txt('v-prozor', poz >= 0.999 ? 'otvoren' : poz <= 0.001 ? 'zatvoren' : 'kreće ' + hr(poz * 100, 0) + ' %');
  txt('v2-prozor', 'OTV ' + (m.P_OTV ? '1' : '0') + ' · ZAT ' + (m.P_ZAT ? '1' : '0')); txt('v3-prozor', iz.OTVORI ? 'motor: otvara' : iz.ZATVORI ? 'motor: zatvara' : 'motor: miruje');
  txt('v-zrak', 'T ' + hr(m.T_UN) + ' °C · vlaga ' + hr(m.RH, 0) + ' %');
  txt('v2-zrak', 'izmjena zraka ' + hr(sn.mdot, 2) + ' kg/s');
  txt('v3-zrak', 'gubici ' + hr(sn.qGub / 1000) + ' kW · grijač ' + hr(sn.qGrij / 1000) + ' kW');
  txt('v4-zrak', 'transpiracija hladi ' + hr(sn.fLat * 100, 0) + ' % sunca');
  txt('v5-zrak', sat2(q.sat) + ' · ' + (m.G > 5 ? 'dan' : 'noć'));
  txt('v6-zrak', '');
  txt('v-tlo', 'vlaga ' + hr(m.TLO, 0) + ' %'); txt('v2-tlo', 'isušivanje ' + hr(sn.et, 2) + ' %/h'); txt('v3-tlo', 'granice 30–60 %');
  txt('v-biljke', 'stres ' + hr(Z.st.S, 0) + ' / 100'); txt('v2-biljke', 'zdrave ' + hr(Z.st.zdr * 100, 1) + ' %'); txt('v3-biljke', p.biljke + ' od ' + PRETP.biljke.v + ' biljaka');
  txt('v-vent', iz.VENT ? 'radi · 0,75 kW' : 'isključen'); txt('v2-vent', iz.VENT ? PRETP.ventilator.v + ' kg/s' : ''); txt('v3-vent', '');
  txt('v-led', iz.LED ? 'uključena · 2 kW' : 'isključena'); txt('v2-led', par.led ? 'pravilo omogućeno' : 'pravilo isključeno');
  txt('v-struja', hr(sn.uk, 2) + ' kW sada'); txt('v2-struja', 'ukupno ' + hr(p.eUk, 1) + ' kWh'); txt('v3-struja', 'grijač ' + hr(p.eGrij, 1) + ' kWh');
  txt('v4-struja', 'ventilator ' + hr(p.eVent, 1) + ' kWh'); txt('v5-struja', 'crpka ' + hr(p.eCrpka, 2) + ' kWh'); txt('v6-struja', 'rasvjeta ' + hr(p.eLed, 1) + ' kWh'); txt('v7-struja', 'trošak ' + hr(p.trosak, 2) + ' €');
  txt('v-bod', 'bodovi ' + p.bodovi + ' · preživjele ' + hr(p.prezivjele, 1) + ' % · voda ' + hr(p.vodaM3, 2) + ' m³ · struja ' + hr(p.eUk, 1) + ' kWh');
  txt('v2-bod', 'bodovi = 1000 × udio zdravih biljaka − 0,1 × litre vode − 2 × kWh (po danu)');
  cls('l-sun', 'akt', m.G > 5); cls('l-zas', 'akt', sn.gIn > 5); cls('l-pro', 'akt', poz > 0.01); cls('l-vent', 'akt', iz.VENT); cls('l-led', 'akt', iz.LED);
  cls('l-grij', 'akt', sn.qGrij > 0); cls('l-navod', 'akt', iz.VENTIL && !k.has('ventil')); cls('l-spr', 'akt', iz.VENTIL && !k.has('ventil')); cls('l-tb', 'akt', true); cls('l-zb', 'akt', true);
  const al = new Set(q.al.map((a) => a.id));
  cls('c-navod', 'alarm', al.has('ventil')); cls('c-prozor', 'alarm', al.has('prozor') || al.has('prozorZ')); cls('c-grij', 'alarm', al.has('grijac'));
  cls('c-zrak', 'alarm', al.has('vruce') || al.has('hladno') || al.has('rh')); cls('c-tlo', 'alarm', al.has('suho')); cls('c-biljke', 'alarm', al.has('stres'));
  [['navod', ['VENTIL']], ['prozor', ['OTVORI', 'ZATVORI']], ['grij', ['GRIJ']], ['pokrov', ['ZAS']], ['vent', ['VENT']], ['led', ['LED']]].forEach(([c, kl]) => cls('c-' + c, 'man', kl.some((x) => Z.st.man[x] !== null && Z.st.man[x] !== undefined)));
  $('alarmi').innerHTML = q.al.length ? q.al.map((a) => `<li><b>ALARM</b> ${esc(a.t)}</li>`).join('') : '<li class="mir">Nema aktivnih alarma.</li>';
}

/* ================================================================== ljestvičasti dijagram (napredna razina) */
function precke(q) {
  const u = q.uvjeti, m = q.m, iz = q.iz, p = Z.p;
  const k = (lab, on, neg = false, pod = '') => ({ lab, on: neg ? !on : on, neg, pod });
  return [
    { n: '1 Navodnjavanje', k: [k('TLO<' + hr(p.tloOn, 0) + ' %', u.ventil.mem, false, 'SR · R: >' + hr(p.tloOff, 0) + ' %')], z: 'VENTIL', zon: iz.VENTIL },
    { n: '2 Prozor — otvori', k: [k('T_UN>' + hr(p.pOtv), u.prozor.mem, false, 'SR · R: <' + hr(p.pZat)), k('P_OTV', m.P_OTV, true)], z: 'OTVORI', zon: iz.OTVORI },
    { n: '3 Prozor — zatvori', k: [k('prozor traži', u.prozor.mem, true), k('P_ZAT', m.P_ZAT, true)], z: 'ZATVORI', zon: iz.ZATVORI },
    { n: '4 Grijač', k: [k('T_UN<' + hr(p.gOn), u.grij.mem, false, 'SR · R: >' + hr(p.gOff)), k('P_ZAT', m.P_ZAT)], z: 'GRIJ', zon: iz.GRIJ },
    { n: '5 Zasjena', k: [k('G>' + hr(p.zOn, 0), u.zas.mem, false, 'SR · R: <' + hr(p.zOff, 0))], z: 'ZAS', zon: iz.ZAS },
    { n: '6 Ventilator', k: [k('T_UN>' + hr(p.vT), u.vent.t)], ili: k('RH>' + hr(p.vRH, 0) + ' %', u.vent.rh), z: 'VENT', zon: iz.VENT },
    { n: '7 Rasvjeta', k: [k('omogućeno', u.led.en), k('G<50', u.led.tamno), k('6–20 h', u.led.vrijeme)], z: 'LED', zon: iz.LED },
  ];
}
function crtajLadder(q) {
  const P = precke(q), red = 74, dod = 38, s = [];
  const W = 420, xL = 10, xR = 410, x0 = 22, x1 = 318, xc = 360;
  const visina = P.length * red + P.filter((x) => x.ili).length * dod;
  s.push(`<svg viewBox="0 0 ${W} ${visina + 10}" class="pz-lad" role="img" aria-label="Ljestvičasti dijagram programa s trenutnim stanjem kontakata">`);
  s.push(`<path class="l" d="M${xL} 4V${visina + 6}M${xR} 4V${visina + 6}"/>`);
  const lin = (a) => (a ? 'pz-ak' : 'l');
  let y = 30;
  P.forEach((pr) => {
    s.push(`<text class="text pz-n" x="${x0 - 6}" y="${y - 19}">${esc(pr.n)}</text>`);
    const korak = (x1 - x0) / Math.max(pr.k.length, 2);
    let tok = true, xk = x0;
    s.push(`<path class="pz-ak" d="M${xL} ${y}H${x0}"/>`);
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
    const x = s.id in q.m ? q.m[s.id] : q.iz[s.id];
    if (typeof x === 'boolean') return `<span class="pz-bit${x ? ' on' : ''}">${x ? '1' : '0'}</span>`;
    return hr(x, { G: 0, RH: 0, TLO: 1 }[s.id] ?? 1) + (s.jed ? ' ' + s.jed : '');
  };
  $('io').innerHTML = SIGNALI.map((s) => `<tr><td><b>${esc(s.id)}</b></td><td>${esc(s.adr)}</td><td class="pz-r">${v(s)}${Z.st.man[s.id] !== null && Z.st.man[s.id] !== undefined ? ' <span class="uz-oz">MAN</span>' : ''}</td></tr>`).join('');
}

/* ================================================================== grafovi */
const GRAFOVI = [
  { el: 'g-temp', jed: '°C', ser: [['T', 'Zrak unutra (izmjereno)', 's1'], ['tVan', 'Vani', 's3']], d: 1, pojas: [15, 30] },
  { el: 'g-vlaga', jed: '%', ser: [['tlo', 'Vlaga tla (izmjereno)', 's2'], ['RH', 'Vlaga zraka', 's3']], d: 0, pojas: [30, 60], min0: 0, max0: 100 },
  { el: 'g-ozr', jed: 'W/m²', ser: [['G', 'Vani', 's2'], ['gIn', 'U plasteniku', 's1']], d: 0, min0: 0 },
  { el: 'g-biljke', jed: '', ser: [['S', 'Indeks stresa', 's2'], ['zdr', 'Zdrave biljke, %', 's1']], d: 0, prag: [50], min0: 0, max0: 100 },
];
function boje() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  return { s1: g('--pz-s1'), s2: g('--pz-s2'), s3: g('--pz-s3'), ink: g('--ink'), body: g('--body'), rule: g('--rule'), tanko: g('--tanko') };
}
GRAFOVI.forEach((g) => {
  const c = $(g.el);
  c.parentElement.insertAdjacentHTML('afterbegin', `<ul class="pz-leg">${g.ser.map(([, n, k]) => `<li><i class="pz-sw ${k}"></i>${esc(n)}</li>`).join('')}</ul>`);
  c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); g.hover = (e.clientX - r.left) / r.width; crtajGraf(g); });
  c.addEventListener('pointerleave', () => { g.hover = null; crtajGraf(g); });
});
function crtajGraf(g, H = Z ? Z.povijest : [], trajanjeH = Z ? Z.trajanje / 3600 : 24, xLab = (t) => sat2(t + (Z ? Z.t0 / 3600 : 0))) {
  const c = $(g.el); const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const B = boje(), L = 44, R = 12, T = 8, Bt = 22, pw = w - L - R, ph = h - T - Bt;
  let lo = Infinity, hi = -Infinity;
  H.forEach((r) => g.ser.forEach(([k]) => { lo = Math.min(lo, r[k]); hi = Math.max(hi, r[k]); }));
  if (g.pojas) { lo = Math.min(lo, g.pojas[0] - 2); hi = Math.max(hi, g.pojas[1] + 2); }
  if (g.min0 !== undefined) lo = Math.min(lo, g.min0);
  if (g.max0 !== undefined) hi = Math.max(hi, g.max0);
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  const rs = hi - lo || 1; if (g.min0 === undefined) lo -= rs * 0.05; if (g.max0 === undefined) hi += rs * 0.05;
  const kY = (() => { const r = (hi - lo) / 4, e = Math.pow(10, Math.floor(Math.log10(r))); return [1, 2, 2.5, 5, 10].map((k) => k * e).find((k) => k >= r) || r; })();
  const X = (t) => L + t / trajanjeH * pw, Y = (v) => T + (1 - (v - lo) / (hi - lo)) * ph;
  x.font = '11px "IBM Plex Sans", system-ui, sans-serif'; x.fillStyle = B.body; x.strokeStyle = B.rule; x.lineWidth = 1;
  if (g.pojas) { x.fillStyle = B.tanko; x.fillRect(L, Y(g.pojas[1]), pw, Y(g.pojas[0]) - Y(g.pojas[1])); x.fillStyle = B.body; }
  for (let v = Math.ceil(lo / kY) * kY; v <= hi + 1e-9; v += kY) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(hr(v, kY < 1 ? 1 : 0), L - 6, Y(v) + 4); }
  x.textAlign = 'center';
  const korX = trajanjeH > 48 ? 24 * 15 : 3;
  for (let t = 0; t <= trajanjeH + 1e-9; t += korX) x.fillText(xLab(t), X(t), h - 6);
  if (g.prag) { x.save(); x.setLineDash([4, 4]); x.strokeStyle = B.body; g.prag.forEach((v) => { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText('prag ' + v, L + pw - 4, Y(v) - 4); }); x.restore(); }
  g.ser.forEach(([k, , cc]) => {
    if (H.length < 2) return;
    x.save(); x.strokeStyle = B[cc]; x.lineWidth = 2; x.lineJoin = 'round'; x.beginPath();
    H.forEach((r, i) => { const px = X(r.t), py = Y(r[k]); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
    x.stroke(); x.restore();
  });
  if (H.length) { const zz = H[H.length - 1]; g.ser.forEach(([k, , cc]) => { x.fillStyle = B[cc]; x.beginPath(); x.arc(X(zz.t), Y(zz[k]), 3.5, 0, Math.PI * 2); x.fill(); }); }
  const tip = $(g.el + '-tip');
  if (g.hover !== null && g.hover !== undefined && H.length) {
    const t = Math.max(0, Math.min(trajanjeH, (g.hover * w - L) / pw * trajanjeH));
    let best = H[0]; for (const r of H) if (Math.abs(r.t - t) < Math.abs(best.t - t)) best = r;
    const px = X(best.t);
    x.save(); x.strokeStyle = B.ink; x.globalAlpha = 0.5; x.beginPath(); x.moveTo(px, T); x.lineTo(px, T + ph); x.stroke(); x.restore();
    g.ser.forEach(([k, , cc]) => { x.fillStyle = B[cc]; x.beginPath(); x.arc(px, Y(best[k]), 4, 0, Math.PI * 2); x.fill(); });
    tip.hidden = false;
    tip.innerHTML = `<b>${trajanjeH > 48 ? 'dan ' + Math.floor(best.t / 24 + 1) + ', ' : ''}${sat2(best.t + (Z ? Z.t0 / 3600 : 0))}</b>` + g.ser.map(([k, n, cc]) => `<span><i class="pz-sw ${cc}"></i>${esc(n)}: ${hr(best[k], g.d)}${g.jed ? ' ' + g.jed : ''}</span>`).join('');
    tip.style.left = Math.min(Math.max(0, px + 10), w - 200) + 'px';
  } else if (tip) tip.hidden = true;
}
function crtajGrafove() { GRAFOVI.forEach((g) => crtajGraf(g)); }
new ResizeObserver(crtajGrafove).observe($('k-graf'));
const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', crtajGrafove);
new MutationObserver(crtajGrafove).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ================================================================== bilanca */
function crtajBilancu() {
  const p = Z.pokazatelji();
  const r = [
    ['Preživjele biljke', hr(p.prezivjele, 1) + ' % (' + p.biljke + ')'], ['Najveći indeks stresa', hr(p.stresMax, 0)], ['Sati u stresu (iznad 50)', hr(p.satiStres, 1)],
    ['Voda', hr(p.vodaL, 0) + ' L'], ['Struja ukupno', hr(p.eUk, 1) + ' kWh'], ['— grijač', hr(p.eGrij, 1) + ' kWh'], ['— ventilator', hr(p.eVent, 1) + ' kWh'],
    ['— crpka, motor, rasvjeta', hr(p.eCrpka + p.eMotor + p.eLed, 2) + ' kWh'], ['Najniža / najviša T unutra', hr(p.minT) + ' / ' + hr(p.maxT) + ' °C'],
    ['Najniža T noću', isFinite(p.minTnoc) && p.minTnoc < 90 ? hr(p.minTnoc) + ' °C' : '—'], ['Grijač radi noću', hr(p.grijacUdio, 0) + ' %'],
    ['Sati s vlagom zraka iznad 90 %', hr(p.satiRH90, 1)], ['Trošak (struja i voda)', hr(p.trosak, 2) + ' €'], ['Bodovi', String(p.bodovi)],
  ];
  $('bil').innerHTML = r.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
}

/* ================================================================== ocjena, bodovi i najbolji rezultati */
function kraj() {
  gotovo = true; radi = false;
  $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = S.sezona ? 'Izračunaj sezonu' : 'Ponovi scenarij';
  dnevnik('Kraj scenarija.');
  osvjezi(true); ocjena();
}
function ocjena() {
  const p = Z.pokazatelji();
  const zad = napraviPlastenik(S, zadaniParametri(), { kvarovi: [...rucniKvarovi] }); zad.doKraja(); const pz = zad.pokazatelji();
  const prov = provjeri(S, p, dij);
  const fv = (c) => c.v === null || c.v === undefined ? 'nije upisano' : typeof c.v === 'boolean' ? (c.v ? 'da' : 'ne') : typeof c.v === 'number' ? hr(c.v, c.v % 1 ? 1 : 0) : esc((KVAROVI.find((k) => k.id === c.v) || { naziv: c.v === 'nema' ? 'nema kvara' : c.v }).naziv);
  let h = '<ul class="pz-prov">' + prov.map((c) => `<li class="${c.ok ? 'ok' : 'ne'}"><b>${c.ok ? '✓' : '✗'}</b> ${esc(c.t)}: ${fv(c)}${typeof c.cilj === 'number' ? ' (cilj ' + OP[c.op] + ' ' + hr(c.cilj, c.cilj % 1 ? 1 : 0) + ')' : ''}</li>`).join('') + '</ul>';
  const svi = prov.every((c) => c.ok);
  h += `<p class="${svi ? 'pz-ok' : 'pz-ne'}"><b>${svi ? 'Uspjeh — uvjeti scenarija su ispunjeni.' : 'Uvjeti scenarija još nisu ispunjeni.'}</b> ${svi ? '' : (S.kvarOd && !dij.uzrok ? 'Upiši uzrok u kartici „Dijagnoza kvara“.' : 'Promijeni pravila i ponovi scenarij.')}</p>`;
  const red = (n, a, b, d = 1, j = '') => `<tr><td>${esc(n)}</td><td class="pz-r">${hr(a, d)}${j}</td><td class="pz-r">${hr(b, d)}${j}</td></tr>`;
  h += `<div class="uz-tbl-omot"><table class="uz-tbl pz-usp"><thead><tr><th>Pokazatelj</th><th class="pz-r">Tvoj program</th><th class="pz-r">Zadani program</th></tr></thead><tbody>` +
    red('Preživjele biljke', p.prezivjele, pz.prezivjele, 1, ' %') + red('Najveći stres', p.stresMax, pz.stresMax, 0) + red('Voda', p.vodaM3, pz.vodaM3, 2, ' m³') +
    red('Struja', p.eUk, pz.eUk, 1, ' kWh') + red('Bodovi', p.bodovi, pz.bodovi, 0) + '</tbody></table></div>';
  /* najbolji rezultati (u ovom pregledniku) */
  const kljuc = 'ftq-pametni-plastenik-najbolji-' + S.id;
  let najb = []; try { najb = JSON.parse(citaj(kljuc) || '[]') || []; } catch (e) { najb = []; }
  if (svi) { najb.push({ b: p.bodovi, d: new Date().toLocaleDateString('hr-HR'), par: Object.assign({}, par) }); najb.sort((a, b) => b.b - a.b); najb = najb.slice(0, 5); pisi(kljuc, JSON.stringify(najb)); }
  if (najb.length) h += '<p class="pz-cilj"><b>Tvoji najbolji uspješni rezultati</b> (spremljeno u ovom pregledniku):</p><ol class="pp-najb">' + najb.map((r) => `<li><b>${r.b}</b> bodova <span class="pom">${esc(r.d)}</span></li>`).join('') + '</ol>';
  $('rez').innerHTML = h;
}

/* ================================================================== sezona */
function sezona() {
  const t0 = performance.now();
  Z = napraviPlastenik(S, par, { kvarovi: [...rucniKvarovi] });
  Z.doKraja(); gotovo = true;
  osvjezi(true);
  const p = Z.pokazatelji(), D = Z.povijest;
  const tjedni = [];
  for (let w = 0; w < 13; w++) {
    const d = D.filter((r) => r.t >= w * 168 && r.t < (w + 1) * 168); if (!d.length) continue;
    tjedni.push({ w: w + 1, tmin: Math.min(...d.map((r) => r.Ts)), tmax: Math.max(...d.map((r) => r.Ts)), S: Math.max(...d.map((r) => r.S)), zdr: d[d.length - 1].zdr });
  }
  $('sez-tbl').innerHTML = '<div class="uz-tbl-omot"><table class="uz-tbl pz-usp"><thead><tr><th>Tjedan</th><th class="pz-r">Najniža T</th><th class="pz-r">Najviša T</th><th class="pz-r">Najveći stres</th><th class="pz-r">Zdrave</th></tr></thead><tbody>' +
    tjedni.map((r) => `<tr><td>${r.w}.</td><td class="pz-r">${hr(r.tmin)} °C</td><td class="pz-r">${hr(r.tmax)} °C</td><td class="pz-r">${hr(r.S, 0)}</td><td class="pz-r">${hr(r.zdr, 1)} %</td></tr>`).join('') + '</tbody></table></div>' +
    `<p class="pom">Izračun 90 dana trajao je ${hr((performance.now() - t0) / 1000, 1)} s (korak 10 s). Vrijeme po danima: približne višegodišnje vrijednosti za kontinentalnu Hrvatsku uz slučajna odstupanja (<span class="uz-oz">procjena</span>).</p>`;
  $('sezona').hidden = false;
  ocjena();
  dnevnik('Izračunana sezona od 90 dana.');
}

/* ================================================================== osvježavanje i petlja */
let zDom = 0, zGraf = 0, zDuz = -1;
function osvjezi(sve = false) {
  const q = Z.zadnje; if (!q) return;
  const t = performance.now();
  promjene(q);
  if (sve || t - zDom > 120) {
    zDom = t;
    const prosloH = (Z.st.t - Z.t0) / 3600;
    txt('s-vrijeme', S.sezona ? 'dan ' + Math.min(90, Math.floor(prosloH / 24) + 1) : sat2(vrijemeSim()));
    $('s-napredak').style.width = Math.min(100, (Z.st.t - Z.t0) / Z.trajanje * 100) + '%';
    crtajMimic(q); crtajLadder(q); crtajIO(q); crtajBilancu();
  }
  if (sve || (Z.povijest.length !== zDuz && t - zGraf > 250)) { zGraf = t; zDuz = Z.povijest.length; crtajGrafove(); }
}
function petlja(t) {
  requestAnimationFrame(petlja);
  if (!radi || gotovo) { zadnjiT = t; return; }
  const dt = Math.min(0.25, (t - zadnjiT) / 1000); zadnjiT = t;
  acc += dt * brzina;
  let n = 0;
  while (acc >= KORAK && n < 2000) { Z.korak(); promjene(Z.zadnje); acc -= KORAK; n++; if (Z.st.t - Z.t0 >= Z.trajanje - 1e-6) break; }
  osvjezi();
  if (Z.st.t - Z.t0 >= Z.trajanje - 1e-6) kraj();
}

document.querySelectorAll('[data-otvori-scen]').forEach((b) => b.addEventListener('click', () => { postaviScen(b.dataset.otvoriScen); $('k-scen').scrollIntoView({ block: 'start' }); }));
citajPar();
const pocetni = new URLSearchParams(location.search).get('scenarij') || location.hash.replace('#', '');
postaviScen(SCENARIJI.some((s) => s.id === pocetni) ? pocetni : 'normalan');
requestAnimationFrame(petlja);
window.__pp = { get Z() { return Z; }, postaviScen, sezona };
