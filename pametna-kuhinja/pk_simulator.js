/* FORTRONIQ · Pametna kuhinja — Simulator.
   Model, PLC, MES, ERP i HACCP: pk_fizika.js; podaci i scenariji: pk_podaci.js.
   Dvije razine upravljanja: pravila „ako … onda …“ (početna) i ljestvičasti dijagram s istim signalima (napredna).
   SCADA ploča, kuhinjski zaslon narudžbi, grafovi, alarmi, HACCP zapis i odluke, zalihe i nabava, sljedivost serije,
   ručni rad, kvarovi, dijagnoza, ocjena, bodovi i najbolji rezultati. © ForTroniQ d.o.o. */
import { SCENARIJI, PARAMETRI, KVAROVI, SIGNALI, PRETP, SERIJE } from './pk_podaci.js';
import { napraviKuhinju, zadaniParametri, provjeri, KORAK } from './pk_fizika.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => { if (!isFinite(n)) return '—'; let s = (Math.round(n * 10 ** d) / 10 ** d).toFixed(d); if (/^-0(\.0+)?$/.test(s)) s = s.slice(1); const neg = s[0] === '-'; if (neg) s = s.slice(1); let [c, dd] = s.split('.'); if (c.length > 4) c = c.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (neg ? '−' : '') + c + (dd ? ',' + dd : ''); };
const sat2 = (h) => { const m = Math.round(((h % 24) + 24) % 24 * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const citaj = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const pisi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bez pohrane */ } };
const PR = (k) => PRETP[k].v;

/* ================================================================== stanje */
let S = SCENARIJI[0], par = zadaniParametri(), Z = null, radi = false, brzina = 600, acc = 0, zadnjiT = 0, gotovo = false;
let dij = { uzrok: null, sati: null }, zadnjeIzl = null, zadnjiAlarmi = new Set(), zDog = 0, zDom = 0, zGraf = 0, zDuz = 0, zKds = 0;
const man = {}, rucniKvarovi = new Set();
const vrijemeSim = () => (Z.st.t / 3600);

function novi() {
  Z = napraviKuhinju(S, par, { kvarovi: [...rucniKvarovi] });
  Object.assign(Z.st.man, man);
  dij = { uzrok: null, sati: null }; gotovo = false; acc = 0; zadnjeIzl = null; zadnjiAlarmi = new Set(); zDog = 0;
  Z.korak();
  $('log').innerHTML = '';
  dnevnik('Početak scenarija „' + S.naziv + '“ (' + S.opis + ').');
  $('rez').innerHTML = '<p class="pom">Ocjena se prikazuje na kraju scenarija.</p>';
  $('d-rez').textContent = ''; $('d-odabir').value = '';
  $('h-prem').disabled = false; $('h-otp').disabled = false;
  $('sl-rez').textContent = ''; document.querySelectorAll('#sl-stolovi input').forEach((c) => { c.checked = false; });
  osvjezi(true);
}

/* ================================================================== scenariji */
$('s-scen').innerHTML = SCENARIJI.map((s) => `<option value="${s.id}">${esc(s.naziv)}</option>`).join('');
const OP = { '<=': '≤', '>=': '≥', '<': '<', '>': '>', '==': '=' };
function postaviScen(id) {
  S = SCENARIJI.find((x) => x.id === id) || SCENARIJI[0];
  $('s-scen').value = S.id;
  $('s-cilj').innerHTML = `<b>${esc(S.opis)}.</b> ${esc(S.cilj)}<span class="pom">Uspjeh: ` +
    S.provjera.map((c) => esc(c.t) + (typeof c.v === 'number' ? ' ' + OP[c.op] + ' ' + hr(c.v, c.v % 1 ? 1 : 0) : '')).join(' · ') + '</span>';
  $('k-dijag').hidden = !S.kvarOd;
  $('k-sljed').hidden = !S.povlacenje;
  /* početna pravila scenarija */
  par = Object.assign(zadaniParametri(), S.param || {});
  postaviPolja();
  radi = false; $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = 'Pokreni';
  novi();
}
$('s-scen').addEventListener('change', () => postaviScen($('s-scen').value));
$('s-pokreni').addEventListener('click', () => {
  if (gotovo) novi();
  radi = !radi; zadnjiT = performance.now();
  $('s-pokreni').setAttribute('aria-pressed', radi ? 'true' : 'false');
  $('s-pokreni').textContent = radi ? 'Pauza' : 'Nastavi';
});
$('s-ponovo').addEventListener('click', () => { radi = false; $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = 'Pokreni'; novi(); });
$('s-kraj').addEventListener('click', () => { if (gotovo) return; while (Z.st.t - Z.t0 < Z.trajanje - 1e-6) { Z.korak(); promjene(Z.zadnje); } kraj(); });
document.querySelectorAll('#brzine button').forEach((b) => b.addEventListener('click', () => {
  brzina = +b.dataset.brzina;
  document.querySelectorAll('#brzine button').forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
}));

/* ================================================================== pravila „ako … onda …“ (početna razina) */
const D = (id) => PARAMETRI.find((p) => p.id === id);
const ul = (id) => { const d = D(id); return `<span class="pp-ul"><input type="number" inputmode="decimal" data-par="${id}" min="${d.min}" max="${d.max}" step="${d.korak}" value="${d.v}" aria-label="${esc(d.naziv)}"><i>${esc(d.jed)}</i></span>`; };
const kv = (id, t) => `<label class="kv"><input type="checkbox" data-par="${id}"> ${t}</label>`;
const PRAVILA = [
  { n: 'Peć za picu', t: `Peć se uključuje u ${ul('pecStart')}. AKO je kamen hladniji od ${ul('pecOn')} → <b>GRIJ</b>; ne grij iznad ${ul('pecOff')}. Pizza ulazi tek iznad ${ul('pecMin')}, najviše ${ul('pecMax')} istodobno.`, par: ['pecOn', 'pecOff'] },
  { n: 'Roštilj', t: `Roštilj se uključuje u ${ul('rosStart')}. AKO je ploča hladnija od ${ul('rosOn')} → <b>GRIJ</b>; ne grij iznad ${ul('rosOff')}. Na ploči najviše ${ul('rosMax')}.`, par: ['rosOn', 'rosOff'] },
  { n: 'Vađenje burgera', t: `<b>VADI</b> burger <select data-par="rosSonda" aria-label="Način vađenja burgera"><option value="1">kad sonda pokaže jezgru 1 °C iznad granice kontrole</option><option value="0">po vremenu</option></select> — vrijeme na roštilju ${ul('rosVrijeme')}.`, par: null },
  { n: 'Kontrola jezgre (HACCP)', t: `${kv('kontrola', '<b>KONTROLA</b> sondom:')} burger ide dalje tek kad je jezgra najmanje ${ul('jezgraMin')}, inače se <b>VRAĆA</b> na roštilj.`, par: null },
  { n: 'Hladnjak', t: `AKO je zrak u hladnjaku topliji od ${ul('hlOn')} → <b>KOMPRESOR</b>; isključi ispod ${ul('hlOff')}. <b>ALARM</b> iznad ${ul('alarmHl')} dulje od 10 minuta.`, par: ['hlOff', 'hlOn'] },
  { n: 'Perilica suđa', t: `Perilica kreće u ${ul('perStart')}. ${kv('blokada', '<b>ODGODI</b> perilicu dok bi ukupna snaga prešla ugovorenih ' + PR('prag') + ' kW.')}`, par: null },
  { n: 'Nabava (ERP)', t: `AKO zaliha pljeskavica padne ispod ${ul('minZal')} → ERP <b>NARUČUJE</b> 40 kom (0 = ne naručuje).`, par: null },
];
$('pravila').innerHTML = PRAVILA.map((r, i) => `<li class="pp-pravilo" data-i="${i}"><span class="pp-pn">${i + 1} ${esc(r.n)}</span><p>${r.t}</p><p class="pp-upoz" hidden></p></li>`).join('');
function postaviPolja() {
  document.querySelectorAll('[data-par]').forEach((el) => { const v = par[el.dataset.par]; if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v); });
  citajPar();
}
function citajPar() {
  document.querySelectorAll('[data-par]').forEach((el) => {
    const d = D(el.dataset.par);
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
  const pocetni = Object.assign(zadaniParametri(), S.param || {});
  const prom = PARAMETRI.filter((p) => par[p.id] !== pocetni[p.id]).length;
  $('p-prom').textContent = prom ? 'Promijenjeno: ' + prom : (S.param ? 'Početna pravila scenarija' : 'Zadani program');
}
$('pravila').addEventListener('change', (e) => { if (e.target.matches('[data-par]')) { citajPar(); const d = D(e.target.dataset.par); dnevnik('Pravilo: „' + d.naziv + '“ = ' + hr(par[d.id], 2).replace(/,00$/, '').replace(/(,\d)0$/, '$1') + (d.jed ? ' ' + d.jed : '') + '.'); osvjezi(true); } });
$('p-zadano').addEventListener('click', () => { par = Object.assign(zadaniParametri(), S.param || {}); postaviPolja(); if (Z) Object.assign(Z.p, par); dnevnik('Vraćena početna pravila.'); osvjezi(true); });

/* ================================================================== ručni rad */
const RUCNO = [
  { id: 'GRIJ_PEC', n: 'Grijači peći' }, { id: 'GRIJ_ROS', n: 'Grijač roštilja' }, { id: 'KOMP', n: 'Kompresor hladnjaka' },
  { id: 'NAPA', n: 'Napa' }, { id: 'PERILICA', n: 'Perilica suđa' }, { id: 'SIRENA', n: 'Sirena' },
];
$('rucno').innerHTML = RUCNO.map((r) => `<label class="pz-man"><span>${esc(r.n)}</span><select data-man="${r.id}" aria-label="${esc(r.n)}"><option value="">AUTO</option><option value="0">MAN 0</option><option value="1">MAN 1</option></select></label>`).join('') +
  '<label class="pz-man"><span>Dostava jela</span><select data-man="ROBOT" aria-label="Dostava jela"><option value="">Robotino</option><option value="0">konobar</option></select></label>';
$('rucno').addEventListener('change', (e) => {
  const s = e.target.closest('[data-man]'); if (!s) return;
  man[s.dataset.man] = s.value === '' ? null : s.value === '1';
  if (Z) Z.st.man[s.dataset.man] = man[s.dataset.man];
  s.classList.toggle('man', s.value !== '');
  dnevnik(s.dataset.man === 'ROBOT' ? 'Dostava jela: ' + (s.value === '' ? 'Robotino.' : 'konobar (ručno).') : RUCNO.find((r) => r.id === s.dataset.man).n + ': ' + (s.value === '' ? 'AUTO' : 'MAN ' + s.value) + '.');
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

/* ================================================================== HACCP odluke, ERP, sljedivost */
$('h-prem').addEventListener('click', () => { if (Z.premjesti()) { $('h-prem').disabled = true; osvjezi(true); } });
$('h-otp').addEventListener('click', () => { if (Z.otpisi()) { $('h-otp').disabled = true; $('h-prem').disabled = true; osvjezi(true); } });
$('e-naruci').addEventListener('click', () => { if (!Z.naruci()) $('e-stanje').textContent = 'Narudžba je već na putu.'; osvjezi(true); });
$('sl-stolovi').innerHTML = Array.from({ length: 20 }, (_, i) => `<label class="kv pk-stol"><input type="checkbox" value="${i + 1}"> ${i + 1}</label>`).join('');
$('sl-prijavi').addEventListener('click', () => {
  if (!Z.st.povucena) { $('sl-rez').textContent = 'Obavijest o povlačenju još nije stigla.'; return; }
  const odabrani = [...document.querySelectorAll('#sl-stolovi input:checked')].map((c) => +c.value);
  Z.prijavi(odabrani);
  const p = Z.pokazatelji();
  $('sl-rez').innerHTML = p.serijaOk ? '<b class="pz-ok">Točno.</b> Prijavljeni su svi stolovi koji su dobili seriju ' + esc(Z.st.povucena) + '.' : '<b class="pz-ne">Nije točno.</b> Usporedi prijavu sa zapisom MES-a (filtriraj po seriji).';
  if (gotovo) ocjena();
});
$('sl-serija').addEventListener('change', () => crtajSljed());

/* ================================================================== dnevnik */
function dnevnik(t) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="t">${Z ? sat2(vrijemeSim()) : '00:00'}</span> ${esc(t)}`;
  const l = $('log'); l.prepend(li); while (l.children.length > 200) l.lastChild.remove();
}
const NAZ = { GRIJ_PEC: 'Grijači peći', GRIJ_ROS: 'Grijač roštilja', KOMP: 'Kompresor hladnjaka', NAPA: 'Napa', PERILICA: 'Perilica suđa', SIRENA: 'Sirena' };
function promjene(q) {
  if (zadnjeIzl) for (const k of ['NAPA', 'PERILICA', 'SIRENA']) if (q.iz[k] !== zadnjeIzl[k]) dnevnik(NAZ[k] + (q.iz[k] ? ' — uključeno.' : ' — isključeno.'));
  zadnjeIzl = Object.assign({}, q.iz);
  const sad = new Set(q.al.map((a) => a.id));
  q.al.forEach((a) => { if (!zadnjiAlarmi.has(a.id)) dnevnik('ALARM: ' + a.t); });
  zadnjiAlarmi.forEach((id) => { if (!sad.has(id)) dnevnik('Alarm prestao (' + id + ').'); });
  zadnjiAlarmi = sad;
  while (zDog < Z.st.dogadaji.length) dnevnik(Z.st.dogadaji[zDog++].tekst);
}

/* ================================================================== SCADA ploča (SVG) */
const CV = {
  nar: [16, 14, 128, 84, 'Narudžbe i MES'], ur: [160, 14, 140, 84, 'UR3e — priprema pice'], pec: [314, 14, 150, 84, 'Peć za picu'], hl: [480, 14, 144, 84, 'Hladnjak'],
  zal: [16, 112, 128, 84, 'Zalihe (ERP)'], ros: [160, 112, 140, 84, 'Roštilj'], kon: [314, 112, 150, 84, 'Kontrola i slaganje'], per: [480, 112, 144, 84, 'Perilica suđa'],
  sal: [16, 210, 128, 84, 'Hladna kuhinja'], pult: [160, 210, 140, 84, 'Izdavanje i biper'], rob: [314, 210, 150, 84, 'Dostava'], str: [480, 210, 144, 104, 'Struja'],
  bod: [16, 330, 608, 56, 'Rezultat'],
};
function mimic() {
  const s = ['<svg viewBox="0 0 640 400" class="pz-mimic" role="img" aria-label="Nadzorna ploča kuhinje: narudžbe, stanice, hladnjak, zalihe, dostava i struja">'];
  const l = (id, d) => s.push(`<path id="l-${id}" class="tok" d="${d}"/>`);
  l('nur', 'M144 56h16'); l('upec', 'M300 56h14'); l('nros', 'M144 84h8V154h8'); l('zal', 'M80 112v-14'); l('pecpult', 'M389 98V104H307V203H230V210');
  l('roskon', 'M300 154h14'); l('konpult', 'M389 196V203H232'); l('salpult', 'M144 252h16'); l('pultrob', 'M300 252h14');
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
const brojF = (q, ...f) => f.reduce((a, x) => a + (q.stanje[x] || 0), 0);
function crtajMimic(q) {
  const m = q.m, iz = q.iz, st = Z.st, p = Z.pokazatelji(), k = st.kvarovi, pp = Z.p;
  const akt = st.nar.filter((n) => n.aktivna && n.gotovo === null);
  const najd = akt.length ? Math.max(...akt.map((n) => (st.t - n.t) / 60)) : 0;
  txt('v-nar', 'aktivnih ' + akt.length); txt('v2-nar', 'jela u radu ' + p.uRadu); txt('v3-nar', 'najdulje čeka ' + hr(najd, 0) + ' min'); txt('v4-nar', 'izdano ' + p.izdano + ' od ' + p.narudzbi);
  txt('v-ur', st.ur ? 'radi · stol ' + st.ur.x.nar.stol : 'čeka'); txt('v2-ur', 'u redu ' + brojF(q, 'cekaUR')); txt('v3-ur', 'umak i sir ' + PR('ur3e') + ' s'); txt('v4-ur', 'pizza izašlo ' + p.pizze);
  txt('v-pec', hr(m.T_PEC, 0) + ' °C'); txt('v2-pec', iz.GRIJ_PEC ? (k.has('pecGrijac') ? 'grije · samo 1,8 kW' : 'grije · 3,6 kW') : 'ne grije');
  txt('v3-pec', 'u peći ' + brojF(q, 'pec') + ' / ' + pp.pecMax + ' · čeka ' + brojF(q, 'cekaPec')); txt('v4-pec', m.T_PEC >= pp.pecMin ? 'spremna za picu' : 'nije spremna (< ' + pp.pecMin + ' °C)');
  txt('v-hl', 'zrak ' + hr(m.T_HL) + ' °C'); txt('v2-hl', 'namirnice ' + hr(st.T_NAM) + ' °C'); txt('v3-hl', 'kompresor ' + (iz.KOMP ? 'radi' : 'miruje'));
  txt('v4-hl', st.otpisano ? 'namirnice otpisane' : st.premjesteno ? 'namirnice u rezervnom' : 'granica 0–4 °C');
  txt('v-zal', 'pljeskavice ' + q.zal.meso); txt('v2-zal', 'mozzarella ' + q.zal.sir); txt('v3-zal', 'salata ' + q.zal.salata);
  txt('v4-zal', st.narudzbaERP ? 'dostava za ' + hr((st.narudzbaERP.tStize - st.t) / 60, 0) + ' min' : 'nema narudžbe');
  txt('v-ros', hr(m.T_ROS, 0) + ' °C'); txt('v2-ros', iz.GRIJ_ROS ? 'grije · 3 kW' : 'ne grije'); txt('v3-ros', 'na ploči ' + brojF(q, 'rostilj') + ' / ' + pp.rosMax + ' · čeka ' + brojF(q, 'cekaRos'));
  txt('v4-ros', pp.rosSonda ? 'vadi po sondi' : 'vadi nakon ' + hr(pp.rosVrijeme, 1).replace(',0', '') + ' min');
  txt('v-kon', 'jezgra ' + (isFinite(m.T_JEZ) ? hr(m.T_JEZ) + ' °C' : '—')); txt('v2-kon', pp.kontrola ? (iz.PUSTI ? 'PUSTI — u redu' : 'čeka granicu ' + pp.jezgraMin + ' °C') : 'KONTROLA ISKLJUČENA');
  txt('v3-kon', 'vraćeno ' + p.vraceno + ' · nesigurno ' + p.nesigurno); txt('v4-kon', 'slaganje ' + (st.slag ? 'radi' : 'čeka') + ' · burgera ' + p.burgeri);
  const pr = q.snage;
  txt('v-per', iz.PERILICA ? 'pere · 6 kW' : p.perilicaGotova && p.perUk > 0 ? 'pranje gotovo' : pr.perTrazi && pr.blok ? 'odgođena (snaga)' : p.perUk > 0 ? 'čeka · kreće ' + sat2(pp.perStart) : '—');
  txt('v2-per', 'odrađeno ' + hr(p.perOdradjeno, 0) + ' od ' + hr(p.perUk, 0) + ' min'); txt('v3-per', pp.blokada ? 'odgoda uključena' : 'bez odgode');
  txt('v-sal', 'u izradi ' + brojF(q, 'sal')); txt('v2-sal', 'čeka ' + brojF(q, 'cekaSal')); txt('v3-sal', 'salata izašlo ' + p.salate);
  const pult = st.stavke.filter((x) => x.faza === 'pult');
  txt('v-pult', 'na pultu ' + pult.length); txt('v2-pult', pult.length ? 'najdulje ' + hr(Math.max(...pult.map((x) => (st.t - x.tFaza) / 60)), 1) + ' min' : ''); txt('v3-pult', 'biper: ' + p.izdano + ' poziva gostima');
  txt('v-rob', q.robRucno ? 'konobar' : 'Robotino · ' + (st.rob.stanje === 'pult' ? 'na pultu' : 'vozi'));
  txt('v2-rob', q.robRucno ? 'do 2 tanjura · ' + PR('konobar') + ' s' : 'do 4 tanjura · tura ' + (PR('robTura') * (k.has('robotino') ? 5 : 1)) + ' s'); txt('v3-rob', 'u dostavi ' + brojF(q, 'vozi')); txt('v4-rob', 'izdano jela ' + p.jela);
  txt('v-str', hr(pr.pUk, 1) + ' kW sada'); txt('v2-str', 'najveća (1 min) ' + hr(p.vrsna, 1) + ' kW'); txt('v3-str', 'ugovoreno ' + PR('prag') + ' kW'); txt('v4-str', 'iznad praga ' + p.prekMin + ' min');
  txt('v5-str', 'ukupno ' + hr(p.eUk, 1) + ' kWh'); txt('v6-str', 'trošak ' + hr(p.trosak, 2) + ' €');
  txt('v-bod', 'bodovi ' + p.bodovi + ' · na vrijeme ' + hr(p.naVrijeme, 0) + ' % · najdulje ' + hr(p.maxCek, 1) + ' min · struja ' + hr(p.eUk, 1) + ' kWh');
  txt('v2-bod', 'bodovi = 1000 × udio narudžbi do 20 min − 300 × nesigurno − 20 × vraćeno − 50 × otkazano − 10 × prepečeno − 2 × kWh − 5 × min namirnica iznad 5 °C − 20 × min iznad praga');
  cls('l-nur', 'akt', !!st.ur); cls('l-upec', 'akt', brojF(q, 'cekaPec', 'pec') > 0); cls('l-nros', 'akt', brojF(q, 'cekaRos', 'rostilj') > 0); cls('l-zal', 'akt', akt.length > 0);
  cls('l-pecpult', 'akt', brojF(q, 'pec') > 0); cls('l-roskon', 'akt', brojF(q, 'rostilj') > 0); cls('l-konpult', 'akt', !!st.slag); cls('l-salpult', 'akt', brojF(q, 'sal') > 0);
  cls('l-pultrob', 'akt', brojF(q, 'vozi') > 0);
  const al = new Set(q.al.map((a) => a.id));
  cls('c-pec', 'alarm', al.has('pecSpora')); cls('c-hl', 'alarm', al.has('hlVisoko') || al.has('hlKomp') || al.has('hlMiruje') || al.has('nam')); cls('c-rob', 'alarm', al.has('robot'));
  cls('c-nar', 'alarm', al.has('cekanje')); cls('c-zal', 'alarm', al.has('zaliha')); cls('c-str', 'alarm', al.has('snaga'));
  [['pec', ['GRIJ_PEC']], ['ros', ['GRIJ_ROS']], ['hl', ['KOMP']], ['per', ['PERILICA']], ['rob', ['ROBOT']]].forEach(([c, kl]) => cls('c-' + c, 'man', kl.some((x) => st.man[x] !== null && st.man[x] !== undefined)));
  $('alarmi').innerHTML = q.al.length ? q.al.map((a) => `<li><b>ALARM</b> ${esc(a.t)}</li>`).join('') : '<li class="mir">Nema aktivnih alarma.</li>';
}

/* ================================================================== kuhinjski zaslon narudžbi (MES) */
const FAZA = { cekaUR: 'čeka UR3e', ur: 'UR3e', cekaPec: 'čeka peć', pec: 'u peći', cekaRos: 'čeka roštilj', rostilj: 'roštilj', cekaSlag: 'čeka slaganje', slag: 'slaganje', cekaSal: 'čeka kuhara', sal: 'priprema', pult: 'na pultu', vozi: 'dostava', gotovo: 'izdano', otkazano: 'otkazano' };
const JELO = { pizza: 'Pizza', burger: 'Burger', salata: 'Salata' };
function crtajKds() {
  const st = Z.st;
  const akt = st.nar.filter((n) => n.aktivna && n.gotovo === null).sort((a, b) => a.t - b.t);
  const zadnje = st.nar.filter((n) => n.gotovo > 0).sort((a, b) => b.gotovo - a.gotovo).slice(0, 3);
  const red = (n, gotova) => `<tr${gotova ? ' class="pk-got"' : ''}><td><b>${n.stol}</b><span class="pom"> #${n.id}</span></td><td>${n.stavke.map((x) => `<span class="pk-jelo pk-${x.faza}">${JELO[x.vrsta]} · ${FAZA[x.faza]}${x.puta ? ' ↺' : ''}</span>`).join(' ')}</td><td class="pz-r">${gotova ? hr(n.cek, 1) : hr((st.t - n.t) / 60, 0)} min</td></tr>`;
  $('kds').innerHTML = (akt.length || zadnje.length) ? `<table class="pk-kds"><thead><tr><th>Stol</th><th>Jela i korak</th><th class="pz-r">Čeka</th></tr></thead><tbody>` + akt.slice(0, 10).map((n) => red(n, false)).join('') +
    (akt.length > 10 ? `<tr><td colspan="3" class="pom">… i još ${akt.length - 10} narudžbi</td></tr>` : '') + zadnje.map((n) => red(n, true)).join('') + '</tbody></table>' : `<p class="pom">${S.noc ? 'Kuhinja je zatvorena — nema narudžbi.' : 'Još nema narudžbi. Restoran prima goste od 18 h.'}</p>`;
}

/* ================================================================== HACCP zapis, ERP, sljedivost */
function crtajHaccp() {
  const z = Z.st.zapis.slice(-40).reverse();
  $('haccp').innerHTML = z.length ? z.map((r) => `<li class="${r.ok ? '' : 'ne'}"><span class="t">${sat2(r.t / 3600)}</span> ${esc(r.tekst)}</li>`).join('') : '<li class="pom">Zapis se puni automatski: hladnjak svakih 15 minuta, svaka kontrola jezgre i svaka odluka.</li>';
  const st = Z.st;
  $('h-stanje').textContent = st.otpisano ? 'Namirnice su otpisane.' : st.premjesteno ? 'Namirnice su u rezervnom hladnjaku.' : 'Namirnice: ' + hr(st.T_NAM) + ' °C (granica 5 °C).';
}
function crtajErp(q) {
  const st = Z.st;
  const akt = (k) => { const z = Z.zal[k].find((x) => x.n > 0 && x.s !== st.povucena); return z ? z.s : '—'; };
  $('erp').innerHTML = '<table class="pz-io"><tbody>' + Object.entries(SERIJE).map(([k, d]) => `<tr><td><b>${esc(d.naziv)}</b></td><td>serija ${esc(akt(k))}</td><td class="pz-r">${q.zal[k]} ${esc(d.jed)}</td></tr>`).join('') + '</tbody></table>';
  $('e-stanje').textContent = st.narudzbaERP ? 'Narudžba na putu — stiže u ' + sat2(st.narudzbaERP.tStize / 3600) + '.' : (Z.p.minZal > 0 ? 'Automatska narudžba ispod ' + Z.p.minZal + ' kom.' : 'Automatska narudžba isključena.');
  $('e-naruci').disabled = !!st.narudzbaERP;
}
function crtajSljed() {
  const st = Z.st;
  if (!S.povlacenje) return;
  $('sl-obav').textContent = st.povucena ? 'Dobavljač povlači seriju ' + st.povucena + ' (' + SERIJE.sir.naziv + '). Pronađi u zapisu MES-a sve stolove koji su dobili jelo s tom serijom i označi ih.' : 'Obavijest dobavljača stiže u ' + sat2(S.povlacenje.sat) + '. Do tada prati izdavanje.';
  const serije = [...new Set(st.mes.map((r) => r.serija))].sort();
  const sel = $('sl-serija'), v = sel.value;
  if (sel.options.length - 1 !== serije.length) { sel.innerHTML = '<option value="">sve serije</option>' + serije.map((s) => `<option value="${s}">${s}</option>`).join(''); sel.value = serije.includes(v) ? v : ''; }
  const f = sel.value;
  const r = st.mes.filter((x) => !f || x.serija === f);
  $('sl-tbl').innerHTML = `<table class="pz-io"><thead><tr><th>Vrijeme</th><th>Stol</th><th>Jelo</th><th>Serija</th></tr></thead><tbody>` + r.slice(-60).reverse().map((x) => `<tr><td>${sat2(x.t / 3600)}</td><td>${x.stol}</td><td>${JELO[x.jelo]}</td><td>${esc(x.serija)}</td></tr>`).join('') + '</tbody></table>' + (r.length > 60 ? `<p class="pom">Prikazano zadnjih 60 od ${r.length}.</p>` : '');
}
/* ================================================================== ljestvičasti dijagram (napredna razina) */
function precke(q) {
  const m = q.m, iz = q.iz, p = Z.p, st = Z.st, sat = st.t / 3600;
  const k = (lab, on, neg = false, pod = '') => ({ lab, on: neg ? !on : on, neg, pod });
  const enP = !S.noc && sat >= p.pecStart && sat < 22.5, enR = !S.noc && sat >= p.rosStart && sat < 22.5;
  const al = new Set(q.al.map((a) => a.id));
  return [
    { n: '1 Peć za picu', k: [k(sat2(p.pecStart) + '–22:30', enP), k('T_PEC<' + p.pecOn, st.mem.pec, false, 'SR · R: >' + p.pecOff)], z: 'GRIJ_PEC', zon: iz.GRIJ_PEC },
    { n: '2 Roštilj', k: [k(sat2(p.rosStart) + '–22:30', enR), k('T_ROS<' + p.rosOn, st.mem.ros, false, 'SR · R: >' + p.rosOff)], z: 'GRIJ_ROS', zon: iz.GRIJ_ROS },
    { n: '3 Hladnjak', k: [k('T_HL>' + hr(p.hlOn), st.mem.komp, false, 'SR · R: <' + hr(p.hlOff))], z: 'KOMP', zon: iz.KOMP },
    { n: '4 Napa', k: [k('peć uklj.', enP)], ili: k('roštilj uklj.', enR), z: 'NAPA', zon: iz.NAPA },
    { n: '5 Perilica', k: [k('zahtjev', q.snage.perTrazi), k('P+6>' + PR('prag') + ' kW', q.snage.blok, true, p.blokada ? 'odgoda uklj.' : 'odgoda isklj.')], z: 'PERILICA', zon: iz.PERILICA },
    { n: '6 Kontrola jezgre', k: [k('T_JEZ≥' + p.jezgraMin, iz.PUSTI)], z: 'PUSTI', zon: iz.PUSTI },
    { n: '7 Alarm', k: [k('alarm hladnjaka', al.has('hlVisoko') || al.has('nam'))], ili: k('alarm peći', al.has('pecSpora')), z: 'SIRENA', zon: iz.SIRENA },
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
    return hr(x, { T_PEC: 0, T_ROS: 0 }[s.id] ?? 1) + (s.jed && isFinite(x) ? ' ' + s.jed : '');
  };
  $('io').innerHTML = SIGNALI.map((s) => `<tr><td><b>${esc(s.id)}</b></td><td>${esc(s.adr)}</td><td class="pz-r">${v(s)}${Z.st.man[s.id] !== null && Z.st.man[s.id] !== undefined ? ' <span class="uz-oz">MAN</span>' : ''}</td></tr>`).join('');
}

/* ================================================================== grafovi */
const GRAFOVI = [
  { el: 'g-pec', jed: '°C', ser: [['pec', 'Peć — kamen', 's2'], ['ros', 'Roštilj — ploča', 's1']], d: 0, min0: 0, prag: () => [Z ? Z.p.pecMin : 280] },
  { el: 'g-hl', jed: '°C', ser: [['hl', 'Hladnjak — zrak (izmjereno)', 's3'], ['nam', 'Namirnice', 's2']], d: 1, pojas: [0, 4], prag: [5] },
  { el: 'g-snaga', jed: 'kW', ser: [['P', 'Snaga kuhinje', 's1']], d: 1, min0: 0, prag: [PR('prag')] },
  { el: 'g-red', jed: '', ser: [['red', 'Jela u radu', 's3'], ['cek', 'Najdulje čekanje, min', 's2']], d: 0, min0: 0, prag: [20] },
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
  const korX = trajanjeH > 8 ? 2 : 1;
  for (let t = 0; t <= trajanjeH + 1e-9; t += korX) x.fillText(xLab(t), X(t), h - 6);
  const pragovi = typeof g.prag === 'function' ? g.prag() : g.prag;
  if (pragovi) { x.save(); x.setLineDash([4, 4]); x.strokeStyle = B.body; pragovi.forEach((v) => { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText('prag ' + v, L + pw - 4, Y(v) - 4); }); x.restore(); }
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
    ['Narudžbi / izdano', p.narudzbi + ' / ' + p.izdano], ['Jela izdano (pizza, burger, salata)', p.jela + ' (' + p.pizze + ', ' + p.burgeri + ', ' + p.salate + ')'], ['Otkazano (nema zalihe)', String(p.otkazano)],
    ['Čekanje prosječno / najdulje', hr(p.prosCek, 1) + ' / ' + hr(p.maxCek, 1) + ' min'], ['Narudžbe do 20 min', hr(p.naVrijeme, 0) + ' %'],
    ['Burgera vraćeno s kontrole', String(p.vraceno)], ['Nesigurno izdano', String(p.nesigurno)], ['Prepečeno (jezgra iznad 85 °C)', String(p.prepeceno)],
    ['Struja ukupno', hr(p.eUk, 1) + ' kWh'], ['— peć / roštilj', hr(p.ePec, 1) + ' / ' + hr(p.eRos, 1) + ' kWh'], ['— perilica / hladnjak', hr(p.ePer, 1) + ' / ' + hr(p.eHl, 1) + ' kWh'],
    ['Najveća snaga (1 min)', hr(p.vrsna, 1) + ' kW'], ['Minuta iznad ugovorene snage', String(p.prekMin)], ['Namirnice najviše', hr(p.namMax, 1) + ' °C'], ['Minuta namirnica iznad 5 °C', hr(p.namIznad, 0)],
    ['Trošak struje', hr(p.trosak, 2) + ' €'], ['Bodovi', String(p.bodovi)],
  ];
  $('bil').innerHTML = r.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
}

/* ================================================================== ocjena, bodovi i najbolji rezultati */
function kraj() {
  gotovo = true; radi = false;
  $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = 'Ponovi scenarij';
  dnevnik('Kraj scenarija.');
  osvjezi(true); ocjena();
}
function ocjena() {
  const p = Z.pokazatelji();
  const zad = napraviKuhinju(S, {}, { kvarovi: [...rucniKvarovi] }); zad.doKraja(); const pz = zad.pokazatelji();
  const prov = provjeri(S, p, dij);
  const fv = (c) => c.v === null || c.v === undefined ? 'nije upisano' : typeof c.v === 'boolean' ? (c.v ? 'da' : 'ne') : typeof c.v === 'number' ? hr(c.v, c.v % 1 ? 1 : 0) : esc(String(c.v));
  let h = '<ul class="pz-prov">' + prov.map((c) => `<li class="${c.ok ? 'ok' : 'ne'}"><b>${c.ok ? '✓' : '✗'}</b> ${esc(c.t)}: ${fv(c)}${typeof c.cilj === 'number' ? ' (cilj ' + OP[c.op] + ' ' + hr(c.cilj, c.cilj % 1 ? 1 : 0) + ')' : ''}</li>`).join('') + '</ul>';
  const svi = prov.every((c) => c.ok);
  const savjet = [S.id === 'hladnjakNoc' && !Z.st.premjesteno ? 'Reagiraj na alarm odlukom u kartici „HACCP zapis“.' : '', S.kvarOd && !dij.uzrok ? 'Upiši uzrok u kartici „Dijagnoza kvara“.' : '', S.povlacenje && !Z.st.prijava ? 'Prijavi stolove u kartici „Sljedivost serije“.' : ''].filter(Boolean).join(' ') || 'Promijeni pravila i ponovi scenarij.';
  h += `<p class="${svi ? 'pz-ok' : 'pz-ne'}"><b>${svi ? 'Uspjeh — uvjeti scenarija su ispunjeni.' : 'Uvjeti scenarija još nisu ispunjeni.'}</b> ${svi ? '' : savjet}</p>`;
  const red = (n, a, b, d = 1, j = '') => `<tr><td>${esc(n)}</td><td class="pz-r">${hr(a, d)}${j}</td><td class="pz-r">${hr(b, d)}${j}</td></tr>`;
  h += `<div class="uz-tbl-omot"><table class="uz-tbl pz-usp"><thead><tr><th>Pokazatelj</th><th class="pz-r">Tvoj program</th><th class="pz-r">${S.param ? 'Početna pravila' : 'Zadani program'}</th></tr></thead><tbody>` +
    red('Najdulje čekanje', p.maxCek, pz.maxCek, 1, ' min') + red('Prosječno čekanje', p.prosCek, pz.prosCek, 1, ' min') + red('Otkazano', p.otkazano, pz.otkazano, 0) + red('Vraćeno s kontrole', p.vraceno, pz.vraceno, 0) +
    red('Najveća snaga', p.vrsna, pz.vrsna, 1, ' kW') + red('Struja', p.eUk, pz.eUk, 1, ' kWh') + red('Namirnice iznad 5 °C', p.namIznad, pz.namIznad, 0, ' min') + red('Bodovi', p.bodovi, pz.bodovi, 0) + '</tbody></table></div>';
  const kljuc = 'ftq-pametna-kuhinja-najbolji-' + S.id;
  let najb = []; try { najb = JSON.parse(citaj(kljuc) || '[]') || []; } catch (e) { najb = []; }
  if (svi) { najb.push({ b: p.bodovi, d: new Date().toLocaleDateString('hr-HR') }); najb.sort((a, b) => b.b - a.b); najb = najb.slice(0, 5); pisi(kljuc, JSON.stringify(najb)); }
  if (najb.length) h += '<p class="pz-cilj"><b>Tvoji najbolji uspješni rezultati</b> (spremljeno u ovom pregledniku):</p><ol class="pp-najb">' + najb.map((r) => `<li><b>${r.b}</b> bodova <span class="pom">${esc(r.d)}</span></li>`).join('') + '</ol>';
  $('rez').innerHTML = h;
}

/* ================================================================== osvježavanje i petlja */
function osvjezi(sve = false) {
  const q = Z.zadnje; if (!q) return;
  const t = performance.now();
  promjene(q);
  if (sve || t - zDom > 120) {
    zDom = t;
    txt('s-vrijeme', sat2(vrijemeSim()));
    $('s-napredak').style.width = Math.min(100, (Z.st.t - Z.t0) / Z.trajanje * 100) + '%';
    crtajMimic(q); crtajLadder(q); crtajIO(q); crtajBilancu(); crtajErp(q);
  }
  if (sve || t - zKds > 400) { zKds = t; crtajKds(); crtajHaccp(); crtajSljed(); }
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
const pocetni = new URLSearchParams(location.search).get('scenarij') || location.hash.replace('#', '');
postaviScen(SCENARIJI.some((s) => s.id === pocetni) ? pocetni : 'normalna');
requestAnimationFrame(petlja);
window.__pk = { get Z() { return Z; }, postaviScen };
