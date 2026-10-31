/* FORTRONIQ · Pametna bolnica s tabletičarom — Simulator odjela.
   Model, PLC, ERP i MES: pb_fizika.js; podaci i scenariji: pb_podaci.js. SIMULATOR ZA UČENJE, NE MEDICINSKI UREĐAJ —
   pacijenti i lijekovi su izmišljeni. Pravila (početna razina) i ljestvičasti dijagram (napredna), SCADA ploča, sestrinska
   stanica, odluke, stanica punjenja, terapija i nespojivi lijekovi, zalihe, MES zapis i sljedivost, ocjena i bodovi.
   © ForTroniQ d.o.o. */
import { SCENARIJI, PARAMETRI, KVAROVI, SIGNALI, PRETP, LIJEKOVI, PACIJENTI, TERMINI, GRESKE } from './pb_podaci.js';
import { napraviOdjel, zadaniParametri, provjeri, nespojivi, KORAK } from './pb_fizika.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => { if (!isFinite(n)) return '—'; let s = (Math.round(n * 10 ** d) / 10 ** d).toFixed(d); if (/^-0(\.0+)?$/.test(s)) s = s.slice(1); const neg = s[0] === '-'; if (neg) s = s.slice(1); let [c, dd] = s.split('.'); if (c.length > 4) c = c.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (neg ? '−' : '') + c + (dd ? ',' + dd : ''); };
const sat2 = (h) => { const m = Math.round(((h % 24) + 24) % 24 * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const citaj = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const pisi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bez pohrane */ } };
const LJ = new Map(LIJEKOVI.map((l) => [l.id, l]));

/* ================================================================== stanje */
let S = SCENARIJI[0], par = zadaniParametri(), Z = null, radi = false, brzina = 600, acc = 0, zadnjiT = 0, gotovo = false;
let dij = { uzrok: null, sati: null }, zadnjiAlarmi = new Set(), zDog = 0, zDom = 0, zGraf = 0, zDuz = 0, zSpor = 0, zOdl = '';
const man = {}, rucniKvarovi = new Set();
const vrijemeSim = () => (Z.st.t / 3600);

function novi() {
  Z = napraviOdjel(S, par, { kvarovi: [...rucniKvarovi] });
  Object.assign(Z.st.man, man);
  dij = { uzrok: null, sati: null }; gotovo = false; acc = 0; zadnjiAlarmi = new Set(); zDog = 0; zOdl = '';
  Z.korak();
  $('log').innerHTML = '';
  dnevnik('Početak scenarija „' + S.naziv + '“ (' + S.opis + ').');
  $('rez').innerHTML = '<p class="pom">Ocjena se prikazuje na kraju scenarija.</p>';
  $('d-rez').textContent = ''; $('d-odabir').value = ''; $('t-poruka').textContent = '';
  $('sl-rez').textContent = ''; document.querySelectorAll('#sl-pac input').forEach((c) => { c.checked = false; });
  $('pu-zona').checked = false; $('pu-poruka').textContent = '';
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
  $('k-sljed').hidden = !S.povlacenje;
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

/* ================================================================== pravila */
const D = (id) => PARAMETRI.find((p) => p.id === id);
const ul = (id) => { const d = D(id); return `<span class="pp-ul"><input type="number" inputmode="decimal" data-par="${id}" min="${d.min}" max="${d.max}" step="${d.korak}" value="${d.v}" aria-label="${esc(d.naziv)}"><i>${esc(d.jed)}</i></span>`; };
const kv = (id, t) => `<label class="kv"><input type="checkbox" data-par="${id}"> ${t}</label>`;
const PRAVILA = [
  { n: 'Smjena', t: `U smjeni rade ${ul('sestre')} sestre. Zadaci se rješavaju <select data-par="redoslijed" aria-label="Redoslijed zadataka"><option value="0">po vremenu dolaska</option><option value="1">po prioritetu: pad, saturacija, hitno, doze, poziv</option></select>.`, par: null },
  { n: 'Doze', t: `AKO doza čeka dulje od ${ul('alarmMin')} → <b>ALARM</b>. AKO čeka dulje od ${ul('eskDoza')} → <b>POZOVI DEŽURNOG</b> (0 = ne zove).`, par: null },
  { n: 'Alarmi iz sobe', t: `AKO alarm pada ili saturacije čeka dulje od ${ul('eskAlarm')} → <b>POZOVI DEŽURNOG</b> (0 = ne zove).`, par: null },
  { n: 'Ljekarna', t: `${kv('dvostruka', '<b>DVOSTRUKA PROVJERA</b> farmaceuta prije slanja tabletičara na odjel.')}`, par: null },
  { n: 'Izdavanje', t: `${kv('nadzirano', '<b>NADZIRANO</b> uzimanje — sestra ostaje dok pacijent ne uzme lijek.')} ${kv('potpis', '<b>DRUGI POTPIS</b> za Lijek H (stroža evidencija).')}`, par: null },
  { n: 'Transport', t: `${kv('hitno', '<b>HITNI NALOG</b> ima prednost pred redovitom turom Robotina.')}`, par: null },
  { n: 'Nabava (ERP)', t: `AKO zaliha lijeka padne ispod ${ul('minZal')} → ERP <b>NARUČUJE</b> 100 kom (0 = ne naručuje).`, par: null },
  { n: 'Hladnjak za lijekove', t: `AKO je topliji od ${ul('hlOn')} → <b>KOMPRESOR</b>; isključi ispod ${ul('hlOff')}.`, par: ['hlOff', 'hlOn'] },
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
  if (Z) { while (Z.st.sestre.filter((s) => !s.dez).length < par.sestre) Z.st.sestre.push({ i: Z.st.sestre.length, zad: null, tKraj: 0, dez: false }); while (Z.st.sestre.filter((s) => !s.dez).length > par.sestre) { const i = Z.st.sestre.findIndex((s) => !s.dez && !s.zad); if (i < 0) break; Z.st.sestre.splice(i, 1); } }
  const pocetni = Object.assign(zadaniParametri(), S.param || {});
  const prom = PARAMETRI.filter((p) => par[p.id] !== pocetni[p.id]).length;
  $('p-prom').textContent = prom ? 'Promijenjeno: ' + prom : (S.param ? 'Početna pravila scenarija' : 'Zadani program');
}
$('pravila').addEventListener('change', (e) => { if (e.target.matches('[data-par]')) { citajPar(); const d = D(e.target.dataset.par); dnevnik('Pravilo: „' + d.naziv + '“ = ' + hr(par[d.id], 1).replace(/,0$/, '') + (d.jed ? ' ' + d.jed : '') + '.'); osvjezi(true); } });
$('p-zadano').addEventListener('click', () => { par = Object.assign(zadaniParametri(), S.param || {}); postaviPolja(); if (Z) Object.assign(Z.p, par); dnevnik('Vraćena početna pravila.'); osvjezi(true); });

/* ================================================================== ručni rad, kvarovi, dijagnoza */
const RUCNO = [{ id: 'KOMP_HLL', n: 'Kompresor hladnjaka za lijekove' }, { id: 'SVJETLO', n: 'Svjetlo poziva' }, { id: 'ALARM_DOZA', n: 'Alarm doze' }];
$('rucno').innerHTML = RUCNO.map((r) => `<label class="pz-man"><span>${esc(r.n)}</span><select data-man="${r.id}" aria-label="${esc(r.n)}"><option value="">AUTO</option><option value="0">MAN 0</option><option value="1">MAN 1</option></select></label>`).join('');
$('rucno').addEventListener('change', (e) => {
  const s = e.target.closest('[data-man]'); if (!s) return;
  man[s.dataset.man] = s.value === '' ? null : s.value === '1';
  if (Z) Z.st.man[s.dataset.man] = man[s.dataset.man];
  s.classList.toggle('man', s.value !== '');
  dnevnik(RUCNO.find((r) => r.id === s.dataset.man).n + ': ' + (s.value === '' ? 'AUTO' : 'MAN ' + s.value) + '.');
  osvjezi(true);
});
$('kvarovi').innerHTML = KVAROVI.map((k) => `<label class="kv"><input type="checkbox" data-kvar="${k.id}"> ${esc(k.naziv)}</label>`).join('');
$('kvarovi').addEventListener('change', (e) => {
  const c = e.target.closest('[data-kvar]'); if (!c) return;
  if (c.checked) rucniKvarovi.add(c.dataset.kvar); else rucniKvarovi.delete(c.dataset.kvar);
  if (Z) { if (c.checked) { Z.st.kvarovi.add(c.dataset.kvar); Z.st.kvarT = Z.st.kvarT || Z.st.t; } else Z.st.kvarovi.delete(c.dataset.kvar); }
  $('k-dijag').hidden = !rucniKvarovi.size;
  dnevnik('Kvar „' + KVAROVI.find((k) => k.id === c.dataset.kvar).naziv + '“ ' + (c.checked ? 'uključen' : 'isključen') + ' (nastavnik).');
  osvjezi(true);
});
$('d-odabir').innerHTML = '<option value="">— odaberi uzrok —</option>' + KVAROVI.map((k) => `<option value="${k.id}">${esc(k.naziv)}</option>`).join('') + '<option value="nema">Nema kvara</option>';
$('d-provjeri').addEventListener('click', () => {
  const v = $('d-odabir').value; if (!v) { $('d-rez').textContent = 'Odaberi uzrok.'; return; }
  const ok = rucniKvarovi.has(v);
  $('d-rez').innerHTML = ok ? '<b class="pz-ok">Točno.</b> ' + esc(KVAROVI.find((k) => k.id === v).opis) : '<b class="pz-ne">Nije to.</b> Usporedi izmjerene vrijednosti s očekivanima i pogledaj alarme.';
  dnevnik('Dijagnoza: „' + $('d-odabir').options[$('d-odabir').selectedIndex].text + '“ — ' + (ok ? 'točno' : 'netočno') + '.');
});

/* ================================================================== odluke, stanica punjenja, terapija, zalihe, sljedivost */
$('odluke').addEventListener('click', (e) => { const b = e.target.closest('[data-odl]'); if (!b) return; Z.odluci(b.dataset.odl, +b.dataset.k); osvjezi(true); });
$('pu-zona').addEventListener('change', () => { if ($('pu-zona').checked) Z.potvrdiZonu(); });
$('pu-start').addEventListener('click', () => { const r = Z.ponovniStart(); $('pu-poruka').textContent = r || 'Stanica punjenja ponovno radi.'; if (!r) $('pu-zona').checked = false; osvjezi(true); });
$('terapija').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pom]'); if (!b) return;
  const [pac, l, iz] = b.dataset.pom.split('|'); const k = +iz;
  const x = Z.st.ter.find((q) => q.id === pac).lijekovi.find((y) => y.l === l);
  const u = [1, 2, 3].map((d) => (k + d) % 4).find((n) => !x.t.includes(n));
  const r = u === undefined ? 'Nema slobodnog termina.' : Z.premjesti(pac, l, k, u);
  $('t-poruka').textContent = r || `${pac}: ${LJ.get(l).naziv} premješten u termin „${TERMINI[u].n}“.`;
  osvjezi(true);
});
$('zalihe').addEventListener('click', (e) => { const b = e.target.closest('[data-nar]'); if (!b) return; Z.naruci(b.dataset.nar); osvjezi(true); });
$('sl-pac').innerHTML = PACIJENTI.map((p) => `<label class="kv pk-stol"><input type="checkbox" value="${p.id}"> ${p.id}</label>`).join('');
$('sl-prijavi').addEventListener('click', () => {
  if (!Z.st.povucena) { $('sl-rez').textContent = 'Obavijest o povlačenju još nije stigla.'; return; }
  Z.prijavi([...document.querySelectorAll('#sl-pac input:checked')].map((c) => c.value));
  const p = Z.pokazatelji();
  $('sl-rez').innerHTML = p.serijaOk ? '<b class="pz-ok">Točno.</b> Prijavljeni su svi pacijenti koji su dobili seriju ' + esc(Z.st.povucena) + '.' : '<b class="pz-ne">Nije točno.</b> Filtriraj zapis MES-a po seriji i gledaj samo izdane doze.';
  if (gotovo) ocjena();
});
$('sl-serija').addEventListener('change', () => crtajMes());

/* ================================================================== dnevnik */
function dnevnik(t) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="t">${Z ? sat2(vrijemeSim()) : '00:00'}</span> ${esc(t)}`;
  const l = $('log'); l.prepend(li); while (l.children.length > 250) l.lastChild.remove();
}
function promjene(q) {
  const sad = new Set(q.al.map((a) => a.id));
  q.al.forEach((a) => { if (!zadnjiAlarmi.has(a.id)) dnevnik('ALARM: ' + a.t); });
  zadnjiAlarmi = sad;
  while (zDog < Z.st.dog.length) dnevnik(Z.st.dog[zDog++].tekst);
}

/* ================================================================== SCADA ploča */
const CV = {
  his: [16, 14, 140, 84, 'ERP — terapija i zalihe'], lj: [172, 14, 150, 84, 'Ljekarna — UR3e'], farm: [338, 14, 134, 84, 'Farmaceut'], rob: [488, 14, 136, 84, 'Robotino'],
  mes: [16, 112, 140, 84, 'MES — doze'], odjel: [172, 112, 150, 84, 'Odjel — tabletičari'], ses: [338, 112, 134, 84, 'Sestre'], soba: [488, 112, 136, 84, 'Sobe — alarmi'],
  hl: [16, 210, 140, 84, 'Hladnjak za lijekove'], hit: [172, 210, 150, 84, 'Hitni nalog'], dez: [338, 210, 134, 84, 'Dežurni'], odl: [488, 210, 136, 84, 'Odluke'],
  bod: [16, 310, 608, 70, 'Rezultat'],
};
function mimic() {
  const s = ['<svg viewBox="0 0 640 396" class="pz-mimic" role="img" aria-label="Nadzorna ploča odjela: terapija, ljekarna, farmaceut, Robotino, doze, sestre, alarmi iz soba, hladnjak, hitni nalog i dežurni">'];
  const l = (id, d) => s.push(`<path id="l-${id}" class="tok" d="${d}"/>`);
  l('hislj', 'M156 56h16'); l('ljfarm', 'M322 56h16'); l('farmrob', 'M472 56h16'); l('robodj', 'M556 98V104H247V112'); l('odjses', 'M322 154h16'); l('sessoba', 'M472 154h16'); l('mesodj', 'M156 154h16'); l('sesdez', 'M405 196v14');
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
  const st = Z.st, p = Z.pokazatelji(), PU = st.punjenje, b = q.brF;
  const nesp = nespojivi(st.ter).length;
  txt('v-his', 'pacijenata ' + PACIJENTI.length); txt('v2-his', 'doza danas ' + p.doze); txt('v3-his', nesp ? 'NESPOJIVO: ' + nesp : 'nespojivih nema'); txt('v4-his', st.narudzba ? 'narudžba na putu' : 'nema narudžbe');
  txt('v-lj', !PU ? 'čeka nalog (6:05)' : PU.kraj !== null ? 'punjenje gotovo' : PU.stoji ? 'STOJI — greška' : 'puni ' + PU.i + ' / ' + PU.red.length);
  txt('v2-lj', PU && PU.kraj === null && !PU.stoji && PU.red[PU.i] ? PU.red[PU.i].pac + ' · ' + LJ.get(PU.red[PU.i].l).naziv : ''); txt('v3-lj', 'masa ' + hr(q.m.MASA, 0) + ' mg'); txt('v4-lj', 'kamera ' + (q.m.KAMERA_OK ? 'u redu' : 'NE') + ' · RFID ' + (q.m.RFID_OK ? 'u redu' : 'NE'));
  txt('v-farm', !st.farm ? 'čeka' : st.farm.gotov ? 'provjereno' : 'provjerava'); txt('v2-farm', Z.p.dvostruka ? 'dvostruka provjera' : 'BEZ PROVJERE'); txt('v3-farm', 'grešaka ' + st.greske.ukupno + ' · ispravno ' + st.greske.ok);
  const R = st.rob;
  txt('v-rob', { ljekarna: 'u ljekarni', vozi: 'vozi', povratak: 'vraća se', odjel: 'na odjelu' }[R.stanje] || R.stanje); txt('v2-rob', R.tura ? { 'tabletičari': 'tabletičari', hitno: 'HITNI LIJEK', uzorci: 'tura uzoraka' }[R.tura] : ''); txt('v3-rob', R.blok ? 'BLOKIRAN' : ''); txt('v4-rob', st.naOdjeluT ? 'na odjelu u ' + sat2(st.naOdjeluT / 3600) : 'tabletičari još nisu stigli');
  txt('v-mes', 'izdano ' + p.izdano + ' / ' + p.doze); txt('v2-mes', 'na vrijeme ' + p.naVrijeme + ' · kasno ' + p.kasno); txt('v3-mes', 'propušteno ' + p.propusteno + ' · krivo ' + p.krivo); txt('v4-mes', 'odbijeno ' + ((b.odbijeno || 0) + (b.odbijenoCeka || 0)));
  txt('v-odjel', 'dospjelo ' + (b.dospjela || 0)); txt('v2-odjel', 'čeka termin ' + (b.naOdjelu || 0)); txt('v3-odjel', 'LED ' + (q.iz.LED ? 'svijetli' : 'ne svijetli')); txt('v4-odjel', 'nije na odjelu ' + ((b.plan || 0) + (b.napunjeno || 0) + (b.prazno || 0)));
  txt('v-ses', 'zauzete ' + q.zauzete + ' / ' + st.sestre.length); txt('v2-ses', 'zadataka čeka ' + q.ceka); txt('v3-ses', Z.p.redoslijed ? 'po prioritetu' : 'po vremenu dolaska'); txt('v4-ses', Z.p.nadzirano ? 'nadzirano uzimanje' : '');
  const al = st.vit.filter((v) => v.alarm);
  txt('v-soba', al.length ? al.length + ' alarm' + (al.length > 1 ? 'a' : '') : 'mirno'); txt('v2-soba', al.map((v) => v.id + ' ' + v.alarm).join(', ').slice(0, 26)); txt('v3-soba', 'pad ' + (isFinite(p.reakPad) && st.reakcije.pad !== undefined ? hr(p.reakPad, 1) + ' min' : '—') + ' · SpO₂ ' + (st.reakcije.spo2 !== undefined ? hr(p.reakSpo2, 1) + ' min' : '—'));
  txt('v-hl', hr(q.m.T_HLL, 1) + ' °C'); txt('v2-hl', 'kompresor ' + (q.iz.KOMP_HLL ? 'radi' : 'miruje')); txt('v3-hl', 'raspon 2–8 °C');
  txt('v-hit', st.hitno ? (st.hitno.dano ? 'dano pacijentu' : st.hitno.stigao ? 'na odjelu' : st.hitno.poslan ? 'u dostavi' : 'priprema') : '—'); txt('v2-hit', st.hitno ? hr(p.hitnaMin, 0) + ' min od naloga' : ''); txt('v3-hit', Z.p.hitno ? 'prednost uključena' : 'bez prednosti');
  txt('v-dez', st.dezurni ? (st.dezurni.tu ? 'na odjelu' : 'dolazi') : 'nije pozvan'); txt('v2-dez', 'ukupno ' + hr(p.dezMin, 0) + ' min'); txt('v3-dez', 'doze ' + (Z.p.eskDoza || '—') + ' · sobe ' + (Z.p.eskAlarm || '—') + ' min');
  txt('v-odl', st.odluke.length ? st.odluke.length + ' čeka' : 'nema'); txt('v2-odl', st.odluke[0] ? st.odluke[0].naslov.slice(0, 24) : '');
  txt('v-bod', 'bodovi ' + p.bodovi + ' · na vrijeme ' + hr(p.udioNaVrijeme, 0) + ' % · propušteno ' + p.propusteno + ' · krivo ' + p.krivo);
  txt('v2-bod', 'bodovi = 1000 × udio doza na vrijeme − 300 × krive − 100 × propuštene − 30 × kasne − 100 × nespojivi');
  txt('v3-bod', '− 20 × min reakcije na pad iznad 3 − 10 × min na saturaciju iznad 5 − 5 × min hitnog iznad 30 − 0,5 × min dežurnog');
  cls('l-hislj', 'akt', PU && PU.kraj === null); cls('l-ljfarm', 'akt', st.farm && !st.farm.gotov); cls('l-farmrob', 'akt', R.stanje === 'vozi'); cls('l-robodj', 'akt', R.stanje === 'vozi' && R.tura !== 'uzorci');
  cls('l-mesodj', 'akt', (b.dospjela || 0) > 0); cls('l-odjses', 'akt', q.zauzete > 0); cls('l-sessoba', 'akt', al.length > 0); cls('l-sesdez', 'akt', !!st.dezurni);
  const A = new Set(q.al.map((a) => a.id.split('-')[0]));
  cls('c-lj', 'alarm', A.has('robot')); cls('c-rob', 'alarm', A.has('robotino')); cls('c-mes', 'alarm', A.has('doza')); cls('c-odjel', 'alarm', A.has('tabletari')); cls('c-soba', 'alarm', A.has('soba'));
  cls('c-hl', 'alarm', A.has('hladnjak')); cls('c-hit', 'alarm', A.has('hitno')); cls('c-his', 'alarm', A.has('zaliha') || nesp > 0); cls('c-odl', 'alarm', st.odluke.length > 0);
  cls('c-hl', 'man', st.man.KOMP_HLL !== null && st.man.KOMP_HLL !== undefined);
  $('alarmi').innerHTML = q.al.length ? q.al.map((a) => `<li><b>ALARM</b> ${esc(a.t)}</li>`).join('') : '<li class="mir">Nema aktivnih alarma.</li>';
}

/* ================================================================== sestrinska stanica, odluke, stanica punjenja */
const FAZA = { plan: 'u ljekarni', napunjeno: 'napunjeno', prazno: 'PRAZNO', naOdjelu: 'čeka termin', dospjela: 'LED — dospjelo', izdano: 'izdano', propusteno: 'PROPUŠTENO', odbijeno: 'odbijeno', odbijenoCeka: 'odbija' };
function crtajStanicu() {
  const st = Z.st, t = st.t;
  $('stanica').innerHTML = `<table class="pk-kds"><thead><tr><th>Pacijent</th><th>Doze danas</th><th class="pz-r">Puls · SpO₂ · T</th></tr></thead><tbody>` + PACIJENTI.map((P, i) => {
    const v = st.vit[i], dd = st.doze.filter((d) => d.pac === P.id);
    return `<tr${v.alarm ? ' class="pb-al"' : ''}><td><b>${P.id}</b> ${esc(P.ime)}<span class="pom"> · soba ${P.soba}/${P.krevet}</span>${v.alarm ? `<span class="pb-oz">${{ pad: 'PAD', spo2: 'SpO₂', poziv: 'POZIV' }[v.alarm]}</span>` : ''}</td><td>` +
      dd.map((d) => `<span class="pk-jelo pb-${d.faza}${d.kriva ? ' pb-kriva' : ''}" title="${esc(LJ.get(d.l).naziv + ', ' + TERMINI[d.termin].n + ': ' + FAZA[d.faza])}">${TERMINI[d.termin].h}h ${d.l}</span>`).join(' ') +
      `</td><td class="pz-r">${hr(v.puls, 0)} · ${hr(v.spo2, 0)} % · ${hr(v.temp, 1)}</td></tr>`;
  }).join('') + '</tbody></table>';
}
function crtajOdluke() {
  const st = Z.st, k = st.odluke.map((o) => o.id).join(',');
  if (k !== zOdl) {
    zOdl = k;
    $('odluke').innerHTML = st.odluke.length ? st.odluke.map((o) => `<div class="pb-odl"><p><b>${esc(o.naslov)}</b><br>${esc(o.opis)}</p><div class="pk-odl">${o.opcije.map((x, i) => `<button type="button" class="gumb tanki" data-odl="${o.id}" data-k="${i}">${esc(x)}</button>`).join('')}</div></div>`).join('') : '<p class="pom">Nema odluka na čekanju. Kad robot stane, Robotino zapne ili pacijent odbije terapiju, ovdje biraš postupak.</p>';
  }
  const PU = st.punjenje;
  $('pu-stanje').innerHTML = !PU ? 'Nalog punjenja stiže u 6:05.' : PU.kraj !== null ? `Punjenje gotovo u ${sat2(PU.kraj / 3600)}.` : PU.stoji ? `<b class="pz-ne">UR3e stoji:</b> ${esc(GRESKE[st.greska.vrsta].n)}. ${st.greska.rijeseno ? 'Postupak je odabran — potvrdi zonu i pokreni.' : 'Odaberi postupak u kartici Odluke.'}` : `UR3e puni tabletu ${PU.i + 1} od ${PU.red.length}.`;
  $('pu-start').disabled = !(PU && PU.stoji);
}
function crtajTerapiju() {
  const st = Z.st, nesp = nespojivi(st.ter), mozePom = !st.punjenje;
  const jeN = (pac, k, l) => nesp.some((n) => n.pac === pac && n.termin === k && (n.a === l || n.b === l));
  $('terapija').innerHTML = `<table class="pk-kds"><thead><tr><th>Pacijent</th>${TERMINI.map((tm) => `<th>${tm.h} h</th>`).join('')}</tr></thead><tbody>` + st.ter.map((q) => `<tr><td><b>${q.id}</b></td>` + TERMINI.map((_, k) =>
    `<td>${q.lijekovi.filter((x) => x.t.includes(k)).map((x) => `<button type="button" class="pb-lijek${jeN(q.id, k, x.l) ? ' nesp' : ''}" data-pom="${q.id}|${x.l}|${k}" ${mozePom ? '' : 'disabled'} title="${esc(LJ.get(x.l).naziv)}${mozePom ? ' — klik premješta u sljedeći slobodni termin' : ''}"><i style="background:${LJ.get(x.l).hex}"></i>${x.l}</button>`).join('')}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
  $('t-nesp').innerHTML = nesp.length ? `<b class="pz-ne">Nespojivo u istom terminu:</b> ` + nesp.map((n) => `${n.pac} — ${n.a} i ${n.b} (${TERMINI[n.termin].h} h)`).join('; ') : '<span class="pz-ok">Nema nespojivih lijekova u istom terminu.</span>';
}
function crtajZalihe() {
  const st = Z.st;
  $('zalihe').innerHTML = `<table class="pz-io"><thead><tr><th>Lijek</th><th class="pz-r">Zaliha</th><th class="pz-r">Sutra</th><th></th></tr></thead><tbody>` + LIJEKOVI.map((l) => {
    const z = Z.kom(l.id), tr = Z.potreba(l.id), los = z < tr && !(st.narudzba && st.narudzba.l === l.id);
    return `<tr><td><i class="pb-tab" style="background:${l.hex}"></i>${esc(l.naziv)}${l.kontrolirani ? ' <span class="uz-oz">stroža evidencija</span>' : ''}</td><td class="pz-r${los ? ' pz-ne' : ''}">${z}</td><td class="pz-r">${tr}</td><td class="pz-r"><button type="button" class="gumb tanki pb-mali" data-nar="${l.id}" ${st.narudzba ? 'disabled' : ''}>Naruči</button></td></tr>`;
  }).join('') + '</tbody></table>';
  $('z-stanje').textContent = st.narudzba ? `Narudžba: 100 kom ${LJ.get(st.narudzba.l).naziv}, stiže u ${sat2(st.narudzba.tStize / 3600)}.` : (Z.p.minZal > 0 ? 'ERP naručuje ispod ' + Z.p.minZal + ' kom.' : 'Automatska narudžba isključena.');
}
function crtajMes() {
  const st = Z.st, serije = [...new Set(st.mes.map((r) => r.serija).filter(Boolean))].sort();
  const sel = $('sl-serija'), v = sel.value;
  if (sel.options.length - 1 !== serije.length) { sel.innerHTML = '<option value="">sve serije</option>' + serije.map((s) => `<option value="${s}">${s}</option>`).join(''); sel.value = serije.includes(v) ? v : ''; }
  const f = sel.value, r = st.mes.filter((x) => !f || x.serija === f);
  $('mes').innerHTML = `<table class="pz-io"><thead><tr><th>Vrijeme</th><th>Pacijent</th><th>Lijek</th><th>Serija</th><th>Događaj</th></tr></thead><tbody>` + r.slice(-50).reverse().map((x) => `<tr><td>${sat2(x.t / 3600)}</td><td>${x.pac}</td><td>${x.l}</td><td>${esc(x.serija || '—')}</td><td>${esc(x.dog)}</td></tr>`).join('') + '</tbody></table>' + (r.length > 50 ? `<p class="pom">Prikazano zadnjih 50 od ${r.length}.</p>` : '');
  if (S.povlacenje) $('sl-obav').textContent = st.povucena ? `Proizvođač povlači seriju ${st.povucena}. U zapisu MES-a filtriraj po seriji i označi pacijente kojima je doza te serije izdana.` : `Obavijest proizvođača stiže u ${sat2(S.povlacenje.sat)}.`;
}

/* ================================================================== ljestvičasti dijagram (napredna razina) */
function precke(q) {
  const m = q.m, iz = q.iz, p = Z.p, st = Z.st;
  const k = (lab, on, neg = false, pod = '') => ({ lab, on: neg ? !on : on, neg, pod });
  const nalog = !!(st.punjenje && st.punjenje.kraj === null);
  return [
    { n: '1 UR3e — dozvola rada', k: [k('nalog', nalog), k('ZONA', m.ZONA), k('KAMERA_OK', m.KAMERA_OK), k('RFID_OK', m.RFID_OK)], z: 'ROBOT', zon: iz.ROBOT },
    { n: '2 Vakuum', k: [k('ROBOT', iz.ROBOT), k('hvat', m.MASA > 0)], z: 'VAKUUM', zon: iz.VAKUUM },
    { n: '3 LED pretinca', k: [k('doza dospjela', iz.LED)], z: 'LED', zon: iz.LED },
    { n: '4 Upis doze', k: [k('POKLOPAC', m.POKLOPAC)], z: 'UPIS', zon: iz.UPIS },
    { n: '5 Alarm doze', k: [k('čeka>' + p.alarmMin + ' min', iz.ALARM_DOZA)], z: 'ALARM_DOZA', zon: iz.ALARM_DOZA },
    { n: '6 Hladnjak za lijekove', k: [k('T_HLL>' + hr(p.hlOn), st.kompHl, false, 'SR · R: <' + hr(p.hlOff))], z: 'KOMP_HLL', zon: iz.KOMP_HLL },
    { n: '7 Svjetlo poziva', k: [k('POZIV', m.POZIV)], ili: k('PAD', m.PAD), z: 'SVJETLO', zon: iz.SVJETLO },
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
  const v = (s) => { const x = s.id in q.m ? q.m[s.id] : q.iz[s.id]; if (typeof x === 'boolean') return `<span class="pz-bit${x ? ' on' : ''}">${x ? '1' : '0'}</span>`; return hr(x, s.id === 'MASA' ? 0 : 1) + (s.jed ? ' ' + s.jed : ''); };
  $('io').innerHTML = SIGNALI.map((s) => `<tr><td><b>${esc(s.id)}</b></td><td>${esc(s.adr)}</td><td class="pz-r">${v(s)}${Z.st.man[s.id] !== null && Z.st.man[s.id] !== undefined ? ' <span class="uz-oz">MAN</span>' : ''}</td></tr>`).join('');
}

/* ================================================================== grafovi */
const GRAFOVI = [
  { el: 'g-doze', jed: '', ser: [['dosp', 'Doze dospjele, čekaju sestru', 's2'], ['izd', 'Izdane doze (ukupno)', 's1']], d: 0, min0: 0 },
  { el: 'g-ses', jed: '', ser: [['zauz', 'Zauzete sestre', 's1'], ['sestara', 'Sestara na odjelu (s dežurnim)', 's3'], ['ceka', 'Zadataka u redu', 's2']], d: 0, min0: 0 },
  { el: 'g-vit', jed: '', ser: [['spo2', 'SpO₂ P-106, %', 's3'], ['puls', 'Puls P-106, /min', 's2']], d: 0, prag: [90] },
  { el: 'g-hl', jed: '°C', ser: [['hl', 'Hladnjak za lijekove', 's3']], d: 1, pojas: [2, 8] },
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

/* ================================================================== bilanca, ocjena */
function crtajBilancu() {
  const p = Z.pokazatelji();
  const r = [
    ['Doze danas / izdano', p.doze + ' / ' + p.izdano], ['Na vrijeme (do 60 min)', String(p.naVrijeme)], ['Kasno / propušteno', p.kasno + ' / ' + p.propusteno], ['Krive doze izdane', String(p.krivo)],
    ['Nespojivi parovi', String(p.nespojivo)], ['Greške punjenja (ispravno / ukupno)', p.greske.ok + ' / ' + p.greske.ukupno], ['Punjenje gotovo', p.punjenoU ? sat2(p.punjenoU) : '—'],
    ['Tabletičari na odjelu', isFinite(p.naOdjelu) ? sat2(p.naOdjelu) : '—'], ['Hitni lijek', Z.st.hitno ? hr(p.hitnaMin, 0) + ' min' : '—'],
    ['Reakcija: pad / saturacija', (Z.st.reakcije.pad !== undefined ? hr(p.reakPad, 1) : '—') + ' / ' + (Z.st.reakcije.spo2 !== undefined ? hr(p.reakSpo2, 1) : '—') + ' min'], ['Dežurni na odjelu', hr(p.dezMin, 0) + ' min'],
    ['Zaliha pokriva sutra', p.zaliheSutra ? 'da' : 'ne'], ['Bodovi', String(p.bodovi)],
  ];
  $('bil').innerHTML = r.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
}
function kraj() {
  gotovo = true; radi = false;
  $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = 'Ponovi scenarij';
  dnevnik('Kraj scenarija.');
  osvjezi(true); ocjena();
}
function ocjena() {
  const p = Z.pokazatelji();
  const zad = napraviOdjel(S, {}, { kvarovi: [...rucniKvarovi] }); zad.doKraja(); const pz = zad.pokazatelji();
  const prov = provjeri(S, p, dij);
  const fv = (c) => c.v === null || c.v === undefined ? 'nije upisano' : typeof c.v === 'boolean' ? (c.v ? 'da' : 'ne') : !isFinite(c.v) ? 'nije postignuto' : c.k === 'naOdjelu' ? sat2(c.v) : hr(c.v, c.v % 1 ? 1 : 0);
  let h = '<ul class="pz-prov">' + prov.map((c, i) => { c.k = S.provjera[i].k; return `<li class="${c.ok ? 'ok' : 'ne'}"><b>${c.ok ? '✓' : '✗'}</b> ${esc(c.t)}: ${fv(c)}${typeof c.cilj === 'number' ? ' (cilj ' + OP[c.op] + ' ' + (c.k === 'naOdjelu' ? sat2(c.cilj) : hr(c.cilj, c.cilj % 1 ? 1 : 0)) + ')' : ''}</li>`; }).join('') + '</ul>';
  const svi = prov.every((c) => c.ok);
  const sav = [S.povlacenje && !Z.st.prijava ? 'Prijavi pacijente u kartici „Sljedivost serije“.' : '', Z.st.odluke.length ? 'Na čekanju su odluke u kartici „Odluke“.' : '', Z.st.punjenje && Z.st.punjenje.stoji ? 'Stanica punjenja stoji — otkloni uzrok i sigurno ponovno pokreni.' : ''].filter(Boolean).join(' ') || 'Promijeni pravila ili odluke i ponovi scenarij.';
  h += `<p class="${svi ? 'pz-ok' : 'pz-ne'}"><b>${svi ? 'Uspjeh — uvjeti scenarija su ispunjeni.' : 'Uvjeti scenarija još nisu ispunjeni.'}</b> ${svi ? '' : sav}</p>`;
  const red = (n, a, b, d = 0, j = '') => `<tr><td>${esc(n)}</td><td class="pz-r">${hr(a, d)}${j}</td><td class="pz-r">${hr(b, d)}${j}</td></tr>`;
  h += `<div class="uz-tbl-omot"><table class="uz-tbl pz-usp"><thead><tr><th>Pokazatelj</th><th class="pz-r">Tvoj program</th><th class="pz-r">${S.param ? 'Početna pravila' : 'Zadani program'}</th></tr></thead><tbody>` +
    red('Doze na vrijeme', p.udioNaVrijeme, pz.udioNaVrijeme, 0, ' %') + red('Propuštene doze', p.propusteno, pz.propusteno) + red('Kasne doze', p.kasno, pz.kasno) + red('Krive doze', p.krivo, pz.krivo) +
    red('Dežurni', p.dezMin, pz.dezMin, 0, ' min') + red('Bodovi', p.bodovi, pz.bodovi) + '</tbody></table></div><p class="pom">Zadani program ne donosi odluke umjesto tebe (greške punjenja, prepreka, odbijanje ostaju neriješene).</p>';
  const kljuc = 'ftq-pametna-bolnica-najbolji-' + S.id;
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
  if (sve || t - zDom > 150) {
    zDom = t;
    txt('s-vrijeme', sat2(vrijemeSim()));
    $('s-napredak').style.width = Math.min(100, (Z.st.t - Z.t0) / Z.trajanje * 100) + '%';
    crtajMimic(q); crtajLadder(q); crtajIO(q); crtajBilancu(); crtajOdluke();
  }
  if (sve || t - zSpor > 500) { zSpor = t; crtajStanicu(); crtajTerapiju(); crtajZalihe(); crtajMes(); }
  if (sve || (Z.povijest.length !== zDuz && t - zGraf > 250)) { zGraf = t; zDuz = Z.povijest.length; crtajGrafove(); }
}
function petlja(t) {
  requestAnimationFrame(petlja);
  if (!radi || gotovo) { zadnjiT = t; return; }
  const dt = Math.min(0.25, (t - zadnjiT) / 1000); zadnjiT = t;
  acc += dt * brzina;
  let n = 0;
  const brOdl = Z.st.odluke.length;
  while (acc >= KORAK && n < 2000) { Z.korak(); promjene(Z.zadnje); acc -= KORAK; n++; if (Z.st.t - Z.t0 >= Z.trajanje - 1e-6) break; if (Z.st.odluke.length > brOdl) break; }
  if (Z.st.odluke.length > brOdl) { radi = false; acc = 0; $('s-pokreni').setAttribute('aria-pressed', 'false'); $('s-pokreni').textContent = 'Nastavi'; dnevnik('Simulacija je zaustavljena: potrebna je odluka (kartica „Odluke“).'); osvjezi(true); return; }
  osvjezi();
  if (Z.st.t - Z.t0 >= Z.trajanje - 1e-6) kraj();
}
const pocetni = new URLSearchParams(location.search).get('scenarij') || location.hash.replace('#', '');
postaviScen(SCENARIJI.some((s) => s.id === pocetni) ? pocetni : 'izdavanje');
requestAnimationFrame(petlja);
window.__pb = { get Z() { return Z; }, postaviScen };
