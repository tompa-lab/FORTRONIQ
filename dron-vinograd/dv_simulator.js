/* FORTRONIQ · Dron nad vinogradom — simulator: misija, let u ubrzanom vremenu, karta odozgo (let, NDVI, tretman, stvarno stanje),
   plan misije, baterija, histogram NDVI, karta tretmana, ocjena i dnevnik. Model u dv_model.js. © ForTroniQ d.o.o. */
import { P, PRETP, SCENARIJI, ZADANA_MISIJA } from './dv_podaci.js';
import { napraviVinograd, planiraj, let_i_mjerenje, ocijeni, provjeri, misijaScenarija, kartaScenarija } from './dv_model.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hr = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',').replace('-', '−');
const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* boje podataka na karti (iste u obje teme; podloga karte je svijetla) */
const NDVI_BOJA = (v) => {
  const t = Math.max(0, Math.min(1, (v - 0.3) / 0.55));
  const a = [[194, 73, 61], [222, 170, 60], [90, 160, 70], [30, 110, 60]];
  const f = t * 3, i = Math.min(2, Math.floor(f)), u = f - i;
  const c = a[i].map((x, k) => Math.round(x + (a[i + 1][k] - x) * u));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const STANJE = { zdrav: ['Zdrav', '#3f8f45'], stres: ['Vodni stres', '#d9a43a'], bolest: ['Plamenjača ili pepelnica', '#c2493d'], nema: ['Nema trsa', '#8a7a68'] };

let S, M, KT, V, PLAN, R = null, OC = null, ZAD = null, sloj = 'let', anim = null, brzina = 30;

/* ---------------------------------------------------------------- scenarij */
$('s-scen').innerHTML = SCENARIJI.map((s) => `<option value="${s.id}">${esc(s.naziv)}</option>`).join('');
const q = new URLSearchParams(location.search).get('scenarij');
$('s-scen').value = SCENARIJI.some((s) => s.id === q) ? q : 'prvi';
$('s-scen').addEventListener('change', () => postaviScenarij($('s-scen').value));

const PAR = [
  ['visina', 'Visina leta', 'm', 20, 120, 5],
  ['brzina', 'Brzina nad tlom', 'm/s', 2, 12, 0.5],
  ['preklopU', 'Preklapanje uzdužno', '%', 40, 90, 5],
  ['preklopB', 'Preklapanje bočno', '%', 30, 90, 5],
  ['rezerva', 'Rezerva baterije za povratak', '%', 15, 40, 5],
];
$('misija').innerHTML = PAR.map(([k, n, j, lo, hi, st]) => `<label class="pz-par"><span>${esc(n)}</span><input type="number" id="m-${k}" min="${lo}" max="${hi}" step="${st}" inputmode="decimal"><i>${esc(j)}</i></label>`).join('') +
  '<label class="pz-par s"><span>Smjer linija</span><select id="m-smjer"><option value="uz">uzduž redova (istok–zapad)</option><option value="poprijeko">poprijeko redova (sjever–jug)</option></select><i></i></label>';
$('tret').innerHTML = `<label class="pz-par"><span>Tretiraj kad je NDVI manji od</span><input type="number" id="k-prag" min="0.3" max="0.85" step="0.01" inputmode="decimal"><i></i></label>
<label class="pz-par"><span>… a veći ili jednak (donja granica, tlo)</span><input type="number" id="k-donja" min="0" max="0.6" step="0.01" inputmode="decimal"><i></i></label>
<label class="pa-kvacica"><input type="checkbox" id="k-nem"> tretiraj i sekcije koje nisu na karti</label>
<p class="pom">Prskalica radi po sekcijama od ${hrBr(P.segment)} m reda. Sekcija se tretira ako je u njoj barem jedan trs u zadanom rasponu NDVI.</p>`;
function hrBr(v) { return String(v).replace('.', ','); }

function citajMisiju() {
  const o = {};
  PAR.forEach(([k, , , lo, hi]) => { const v = parseFloat(String($('m-' + k).value).replace(',', '.')); o[k] = isFinite(v) ? Math.max(lo, Math.min(hi, v)) : ZADANA_MISIJA[k]; });
  o.smjer = $('m-smjer').value;
  return o;
}
function upisiMisiju(m) { PAR.forEach(([k]) => { $('m-' + k).value = m[k]; }); $('m-smjer').value = m.smjer; }
function citajKartu() {
  const g = (id, d) => { const v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) ? v : d; };
  return { prag: g('k-prag', 0.6), donja: g('k-donja', 0), nemapirano: $('k-nem').checked };
}
function upisiKartu(k) { $('k-prag').value = k.prag; $('k-donja').value = k.donja; $('k-nem').checked = k.nemapirano; }

function postaviScenarij(id) {
  S = SCENARIJI.find((s) => s.id === id);
  $('s-cilj').innerHTML = esc(S.opis) + '<span class="pom">Uspjeh: ' + S.uvjeti.map((u) => esc(u[3])).join('; ') + '.' + (S.vjetar ? ` Vjetar ${S.vjetar} m/s sa zapada.` : ' Bez vjetra.') + '</span>';
  M = misijaScenarija(S); KT = kartaScenarija(S);
  upisiMisiju(M); upisiKartu(KT);
  V = napraviVinograd(S);
  ZAD = null;
  ponisti();
  dnevnik = [];
  zapisi(0, `Scenarij: ${S.naziv}.`);
  history.replaceState(null, '', '?scenarij=' + id);
}

/* ---------------------------------------------------------------- plan (prije leta) */
function prikaziPlan() {
  PLAN = planiraj(M);
  const K = PLAN.K;
  const vOstro = K.gsd / P.ekspozicija;
  const red = (n, v, lose = false) => `<dt>${esc(n)}</dt><dd${lose ? ' class="lose"' : ''}>${v}</dd>`;
  $('plan').innerHTML = '<dl class="pz-bil">' +
    red('Veličina piksela na tlu (GSD)', hr(K.gsd * 100, 2) + ' cm', K.gsd * 100 > P.simptomRan && S.nalaz.rana) +
    red('Otisak snimke', hr(K.duz) + ' × ' + hr(K.sir) + ' m') +
    red('Broj linija leta', PLAN.nLin) + red('Razmak linija', hr(PLAN.stvRazmakLin) + ' m') +
    red('Razmak okidanja', hr(PLAN.korak) + ' m', PLAN.korak > PLAN.zeljeniKorak + 1e-9) +
    red('Stvarno preklapanje uzdužno / bočno', Math.round(PLAN.stvPreklopU) + ' % / ' + Math.round(PLAN.stvPreklopB) + ' %') +
    red('Pomak za vrijeme ekspozicije', hr(PLAN.zamucenje * 100, 2) + ' cm', PLAN.mutno) +
    red('Najveća brzina za oštru snimku', hr(vOstro) + ' m/s') + '</dl>' +
    (PLAN.mutno ? `<p class="pa-upoz">Pomak drona za vrijeme ekspozicije (${hr(PLAN.zamucenje * 100, 2)} cm) veći je od piksela (${hr(K.gsd * 100, 2)} cm): snimke će biti mutne.</p>` : '') +
    (PLAN.korak > PLAN.zeljeniKorak + 1e-9 ? `<p class="pa-upoz">Kamera ne može okidati češće od jednom u ${hrBr(P.okidanje)} s: pri ${hr(M.brzina)} m/s razmak okidanja je ${hr(PLAN.korak)} m, pa je stvarno uzdužno preklapanje ${Math.round(PLAN.stvPreklopU)} %.</p>` : '') +
    (M.visina > P.hMax ? '<p class="pa-upoz">Iznad 120 m let nije dopušten u otvorenoj kategoriji.</p>' : '');
}

/* ---------------------------------------------------------------- let */
function ponisti() {
  anim = null; R = null; OC = null;
  M = citajMisiju(); KT = citajKartu();
  prikaziPlan();
  ['ndvi', 'tretman', 'stvarno'].forEach((s) => { $('sl-' + s).disabled = true; });
  postaviSloj('let');
  $('s-vrijeme').textContent = '0:00'; $('s-bat').textContent = '100 %'; $('s-napredak').style.width = '0';
  $('s-pokreni').textContent = 'Pokreni let'; $('s-pokreni').setAttribute('aria-pressed', 'false');
  $('rez').innerHTML = '<p class="pom">Ocjena se prikazuje kad dron sleti.</p>';
  crtajSve();
}
function izracunajLet() {
  M = citajMisiju(); KT = citajKartu();
  R = let_i_mjerenje(S, M, V);
  OC = ocijeni(S, M, KT, R);
  /* događaji leta za dnevnik */
  dnevnik = dnevnik.slice(0, 1);
  zapisi(0, `Uzlijetanje, penjanje na ${M.visina} m.`);
  R.L.izvedeno.filter((s) => s.vrsta === 'snimanje').forEach((s) => zapisi(s.t0, `Linija ${s.lin + 1} od ${R.plan.nLin}${s.dio !== undefined ? ' (prekinuta)' : ''}.`));
  if (!R.L.zavrsen) zapisi(R.L.izvedeno.length ? R.L.izvedeno[R.L.izvedeno.length - 1].t0 + R.L.izvedeno[R.L.izvedeno.length - 1].t : 0, R.L.preVmax ? 'Brzina kroz zrak bila bi veća od najveće dopuštene: dron prekida misiju i vraća se.' : `Baterija na rezervi ${M.rezerva} %: dron prekida misiju i vraća se kući.`, true);
  if (R.plan.mutno) zapisi(1, 'Upozorenje: snimke su mutne (pomak veći od piksela).', true);
  zapisi(R.L.t, `Slijetanje. Let ${mmss(R.L.t)}, baterija ${Math.round(R.L.baterija)} %, snimki ${R.snim.length}.`);
}
$('s-pokreni').addEventListener('click', () => {
  if (anim && anim.ide) { anim.ide = false; $('s-pokreni').textContent = 'Nastavi'; $('s-pokreni').setAttribute('aria-pressed', 'false'); return; }
  if (!R) { izracunajLet(); anim = { t: 0, ide: true, zadnje: performance.now() }; }
  else if (!anim) anim = { t: R.L.t, ide: false };
  if (anim.t >= R.L.t) { zavrsi(); return; }
  anim.ide = true; anim.zadnje = performance.now();
  $('s-pokreni').textContent = 'Pauza'; $('s-pokreni').setAttribute('aria-pressed', 'true');
  requestAnimationFrame(korak);
});
$('s-ponovo').addEventListener('click', () => { ponisti(); dnevnik = dnevnik.slice(0, 1); prikaziDnevnik(); });
$('s-kraj').addEventListener('click', () => { if (!R) izracunajLet(); anim = { t: R.L.t, ide: false }; zavrsi(); });
document.querySelectorAll('#brzine button').forEach((b) => b.addEventListener('click', () => {
  brzina = +b.dataset.brzina; document.querySelectorAll('#brzine button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
}));
function korak(t) {
  if (!anim || !anim.ide) return;
  const dt = Math.min(0.25, (t - anim.zadnje) / 1000); anim.zadnje = t;
  anim.t = Math.min(R.L.t, anim.t + dt * brzina);
  osvjeziSat(); crtajKartu(); crtajBateriju(); prikaziDnevnik();
  if (anim.t >= R.L.t) { zavrsi(); return; }
  requestAnimationFrame(korak);
}
function baterijaU(t) { const tr = R.L.trag; let b = 100; for (const p of tr) { if (p.t > t) break; b = p.b; } return b; }
function polozajU(t) {
  const tr = R.L.trag; let a = tr[0];
  for (let i = 1; i < tr.length; i++) { const b = tr[i]; if (b.t >= t) { const f = (t - a.t) / Math.max(1e-9, b.t - a.t); return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; } a = b; }
  return { x: a.x, y: a.y };
}
function osvjeziSat() {
  const t = anim ? anim.t : 0;
  $('s-vrijeme').textContent = mmss(t);
  $('s-bat').textContent = Math.round(R ? baterijaU(t) : 100) + ' %';
  $('s-napredak').style.width = (R ? 100 * t / R.L.t : 0) + '%';
}
function zavrsi() {
  if (anim) anim.ide = false;
  $('s-pokreni').textContent = 'Pokreni let'; $('s-pokreni').setAttribute('aria-pressed', 'false');
  ['ndvi', 'tretman', 'stvarno'].forEach((s) => { $('sl-' + s).disabled = false; });
  osvjeziSat();
  if (sloj === 'let') postaviSloj('ndvi');
  ocjena();
  crtajSve();
}

/* promjena misije poništava let; promjena karte tretmana samo ponovno ocjenjuje */
$('misija').addEventListener('change', () => { M = citajMisiju(); upisiMisiju(M); ponisti(); zapisi(0, 'Misija promijenjena: ' + opisMisije(M) + '.'); prikaziDnevnik(); });
$('tret').addEventListener('change', () => { KT = citajKartu(); if (R && anim && anim.t >= R.L.t) { OC = ocijeni(S, M, KT, R); ocjena(); crtajSve(); } });
$('m-zadano').addEventListener('click', () => { upisiMisiju(misijaScenarija(S)); upisiKartu(kartaScenarija(S)); ponisti(); });
const opisMisije = (m) => `${m.visina} m, ${hrBr(m.brzina)} m/s, preklapanje ${m.preklopU}/${m.preklopB} %, ${m.smjer === 'uz' ? 'uzduž' : 'poprijeko'}, rezerva ${m.rezerva} %`;

/* ---------------------------------------------------------------- karta odozgo */
const SLOJEVI = { let: 'Let i snimke', ndvi: 'Karta NDVI', tretman: 'Karta tretmana', stvarno: 'Stvarno stanje' };
$('slojevi').innerHTML = Object.entries(SLOJEVI).map(([k, n]) => `<button type="button" class="gumb tanki" id="sl-${k}" data-sloj="${k}" aria-pressed="false">${esc(n)}</button>`).join('');
$('slojevi').addEventListener('click', (e) => { const b = e.target.closest('button[data-sloj]'); if (b && !b.disabled) postaviSloj(b.dataset.sloj); });
function postaviSloj(s) {
  sloj = s;
  document.querySelectorAll('#slojevi button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.sloj === s ? 'true' : 'false'));
  const L = {
    let: [['#e8efe2', 'Vinograd (redovi)'], ['#d46a1a', 'Putanja leta'], ['rgba(46,202,212,.35)', 'Otisak snimke']],
    ndvi: [[NDVI_BOJA(0.35), 'NDVI 0,35'], [NDVI_BOJA(0.5), '0,50'], [NDVI_BOJA(0.65), '0,65'], [NDVI_BOJA(0.8), '0,80'], ['#cfcfcf', 'nije na karti']],
    tretman: [['#e07b2a', 'Sekcija se tretira'], ['#e8efe2', 'Ne tretira se'], ['#c2493d', 'Bolestan trs (stvarno)']],
    stvarno: Object.values(STANJE),
  }[s];
  $('legenda').innerHTML = L.map(([c, n]) => `<li><i class="pa-kv" style="background:${c}"></i>${esc(n)}</li>`).join('');
  crtajKartu();
}
const kc = $('karta'), tip = $('karta-tip');
let geo = null;
function crtajKartu() {
  if (!S) return;
  const w = kc.clientWidth; if (!w) return;
  const marg = 22, h = Math.round((w - 2 * marg) * P.sirina / P.duljina) + 2 * marg;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  kc.style.height = h + 'px';
  if (kc.width !== Math.round(w * dpr) || kc.height !== Math.round(h * dpr)) { kc.width = Math.round(w * dpr); kc.height = Math.round(h * dpr); }
  const x = kc.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sk = (w - 2 * marg) / P.duljina;
  const X = (m) => marg + m * sk, Y = (m) => h - marg - m * sk;   /* sjever gore */
  geo = { X, Y, sk, marg, h };
  x.fillStyle = '#c7d6b8'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#b79c78'; x.fillRect(X(0), Y(P.sirina), P.duljina * sk, P.sirina * sk);
  const dw = Math.max(1, P.razmakTrs * sk - 0.4), dh = Math.max(1, P.krosnja * sk * 1.6);
  const tret = OC && sloj === 'tretman' ? new Set(OC.T.seg.filter((s) => s.tret).map((s) => s.red * 1000 + s.s)) : null;
  if (sloj === 'tretman' && OC) {
    x.fillStyle = 'rgba(224,123,42,.75)';
    OC.T.seg.forEach((s) => { if (s.tret) x.fillRect(X(s.s * P.segment), Y((s.red + 1) * P.razmakRed), P.segment * sk, P.razmakRed * sk); });
  }
  V.trs.forEach((t, i) => {
    let c = '#5c8f45';
    if (sloj === 'ndvi' && R) { const m = R.Mj.rez[i].m; c = m === null ? '#cfcfcf' : NDVI_BOJA(m); }
    else if (sloj === 'stvarno') c = STANJE[t.stanje][1];
    else if (sloj === 'tretman') c = t.stanje === 'bolest' ? '#c2493d' : tret && tret.has(t.red * 1000 + Math.floor(t.k / (P.segment / P.razmakTrs))) ? '#8a5a2a' : '#6f8f55';
    x.fillStyle = c; x.fillRect(X(t.x) - dw / 2, Y(t.y) - dh / 2, dw, dh);
  });
  /* putanja i otisci */
  const plan = R ? R.plan : PLAN;
  if (plan && (sloj === 'let' || !R)) {
    const tdo = anim ? anim.t : 0;
    if (R) {
      x.strokeStyle = 'rgba(23,101,110,.55)'; x.fillStyle = 'rgba(46,202,212,.10)'; x.lineWidth = 1;
      const hx = (plan.uz ? plan.K.duz : plan.K.sir) / 2, hy = (plan.uz ? plan.K.sir : plan.K.duz) / 2;
      R.snim.forEach((s) => { if (s.t <= tdo) { x.fillRect(X(s.x - hx), Y(s.y + hy), 2 * hx * sk, 2 * hy * sk); } });
    }
    x.strokeStyle = '#d46a1a'; x.lineWidth = 1.6; x.setLineDash(R ? [] : [5, 4]); x.beginPath();
    plan.linije.forEach((lin, i) => {
      const a = plan.uz ? [lin.od, lin.c] : [lin.c, lin.od], b = plan.uz ? [lin.do, lin.c] : [lin.c, lin.do];
      if (i === 0) x.moveTo(X(a[0]), Y(a[1])); else x.lineTo(X(a[0]), Y(a[1]));
      x.lineTo(X(b[0]), Y(b[1]));
    });
    x.stroke(); x.setLineDash([]);
    if (R && anim) {
      const p = polozajU(anim.t);
      x.fillStyle = '#10394A'; x.beginPath(); x.arc(X(p.x), Y(p.y), 6, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke();
    }
  }
  /* kuća, sjever, mjerilo, vjetar */
  x.fillStyle = '#10394A'; x.font = '600 11px "IBM Plex Sans", system-ui, sans-serif';
  x.beginPath(); x.arc(X(-10), Y(-10), 4, 0, Math.PI * 2); x.fill(); x.fillText('H', X(-10) + 6, Y(-10) + 4);
  x.fillText('S ↑', w - marg - 22, marg - 6);
  x.fillRect(X(0), h - 8, 50 * sk, 2); x.fillText('50 m', X(0) + 50 * sk + 6, h - 4);
  if (S.vjetar) x.fillText(`vjetar ${S.vjetar} m/s →`, X(0), marg - 6);
}
kc.addEventListener('pointermove', (e) => {
  if (!geo) return;
  const r = kc.getBoundingClientRect();
  const mx = (e.clientX - r.left - geo.marg) / geo.sk, my = (geo.h - (e.clientY - r.top) - geo.marg) / geo.sk;
  if (mx < 0 || my < 0 || mx > P.duljina || my > P.sirina) { tip.hidden = true; return; }
  const j = Math.min(V.nRed - 1, Math.max(0, Math.floor(my / P.razmakRed))), k = Math.min(V.nTrs - 1, Math.max(0, Math.floor(mx / P.razmakTrs)));
  const i = j * V.nTrs + k, t = V.trs[i];
  const mj = R && anim && anim.t >= R.L.t ? R.Mj.rez[i] : null;
  tip.hidden = false;
  tip.innerHTML = `<b>Red ${j + 1}, trs ${k + 1}</b>` + (mj ? `<span>snimki: ${mj.n}</span><span>NDVI izmjereno: ${mj.m === null ? 'nije na karti' : hr(mj.m, 2)}</span>` : '<span>podaci nakon leta</span>') +
    (sloj === 'stvarno' || sloj === 'tretman' ? `<span>stvarno: ${esc(STANJE[t.stanje][0].toLowerCase())}</span>` : '');
  tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 200) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
});
kc.addEventListener('pointerleave', () => { tip.hidden = true; });

/* ---------------------------------------------------------------- grafovi: baterija i histogram NDVI */
function boje() { const cs = getComputedStyle(document.documentElement); const g = (n) => cs.getPropertyValue(n).trim(); return { s1: g('--pz-s1'), s2: g('--pz-s2'), s3: g('--pz-s3'), al: g('--pz-al'), ink: g('--ink'), body: g('--body'), rule: g('--rule'), tanko: g('--tanko') }; }
function platno(c) {
  const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  x.font = '11px "IBM Plex Sans", system-ui, sans-serif';
  return { x, w, h };
}
let hovB = null, hovH = null;
function crtajBateriju() {
  const p = platno($('g-bat')); if (!p) return;
  const { x, w, h } = p, B = boje(), L = 40, Rr = 10, T = 8, Bt = 22, pw = w - L - Rr, ph = h - T - Bt;
  const tMax = R ? Math.max(60, R.L.t) : 20 * 60;
  const X = (t) => L + t / tMax * pw, Y = (b) => T + (1 - b / 100) * ph;
  x.strokeStyle = B.rule; x.fillStyle = B.body; x.lineWidth = 1;
  for (let b = 0; b <= 100; b += 25) { x.beginPath(); x.moveTo(L, Y(b)); x.lineTo(L + pw, Y(b)); x.stroke(); x.textAlign = 'right'; x.fillText(b + ' %', L - 5, Y(b) + 4); }
  x.textAlign = 'center';
  const kor = tMax > 900 ? 300 : 120;
  for (let t = 0; t <= tMax + 1; t += kor) x.fillText(Math.round(t / 60) + ' min', X(t), h - 6);
  x.save(); x.setLineDash([4, 4]); x.strokeStyle = B.al; x.beginPath(); x.moveTo(L, Y(M.rezerva)); x.lineTo(L + pw, Y(M.rezerva)); x.stroke(); x.restore();
  x.fillStyle = B.al; x.textAlign = 'right'; x.fillText('rezerva ' + M.rezerva + ' %', L + pw - 4, Y(M.rezerva) - 4);
  if (!R) return;
  const tdo = anim ? anim.t : R.L.t;
  x.strokeStyle = B.s1; x.lineWidth = 2; x.beginPath();
  let zad = null;
  R.L.trag.forEach((q, i) => { if (q.t > tdo) return; zad = q; if (i) x.lineTo(X(q.t), Y(q.b)); else x.moveTo(X(q.t), Y(q.b)); });
  x.stroke();
  if (zad) { x.fillStyle = B.s1; x.beginPath(); x.arc(X(zad.t), Y(zad.b), 3.5, 0, Math.PI * 2); x.fill(); }
  const tp = $('g-bat-tip');
  if (hovB !== null) {
    const t = Math.max(0, Math.min(tdo, (hovB * w - L) / pw * tMax));
    tp.hidden = false; tp.innerHTML = `<b>${mmss(t)}</b><span><i class="pz-sw s1"></i>baterija: ${Math.round(baterijaU(t))} %</span>`;
    tp.style.left = Math.min(Math.max(0, X(t) + 10), w - 180) + 'px';
  } else tp.hidden = true;
}
function crtajHist() {
  const p = platno($('g-hist')); if (!p) return;
  const { x, w, h } = p, B = boje(), L = 40, Rr = 10, T = 8, Bt = 22, pw = w - L - Rr, ph = h - T - Bt;
  const lo = 0.15, hi = 0.95, nb = 40, bw = (hi - lo) / nb;
  const X = (v) => L + (v - lo) / (hi - lo) * pw;
  const gotovo = R && anim && anim.t >= R.L.t;
  const kos = Array.from({ length: nb }, () => ({ zdrav: 0, stres: 0, bolest: 0, nema: 0 }));
  if (gotovo) R.Mj.rez.forEach((r, i) => { if (r.m === null) return; const b = Math.max(0, Math.min(nb - 1, Math.floor((r.m - lo) / bw))); kos[b][V.trs[i].stanje]++; });
  const max = Math.max(1, ...kos.map((k) => k.zdrav + k.stres + k.bolest + k.nema));
  const Ys = (n) => T + ph - Math.sqrt(n / max) * ph;
  x.strokeStyle = B.rule; x.lineWidth = 1; x.beginPath(); x.moveTo(L, T + ph); x.lineTo(L + pw, T + ph); x.stroke();
  x.fillStyle = B.body; x.textAlign = 'center';
  for (let v = 0.2; v <= 0.9 + 1e-9; v += 0.1) x.fillText(hr(v, 1), X(v), h - 6);
  x.textAlign = 'right'; x.fillText('broj trsova (√)', L + pw, T + 10);
  if (!gotovo) { x.textAlign = 'center'; x.fillText('Histogram NDVI nakon leta', L + pw / 2, T + ph / 2); }
  const red = ['zdrav', 'stres', 'bolest', 'nema'];
  kos.forEach((k, i) => {
    let acc = 0; const x0 = X(lo + i * bw) + 0.5, bwp = Math.max(1, pw / nb - 1);
    red.forEach((s) => { if (!k[s]) return; const y0 = Ys(acc), y1 = Ys(acc + k[s]); x.fillStyle = STANJE[s][1]; x.fillRect(x0, y1, bwp, y0 - y1); acc += k[s]; });
  });
  x.save(); x.setLineDash([4, 3]); x.lineWidth = 1.5;
  [[KT.prag, 'prag'], [KT.donja, 'donja']].forEach(([v, n]) => { if (v < lo || v > hi) return; x.strokeStyle = B.ink; x.beginPath(); x.moveTo(X(v), T); x.lineTo(X(v), T + ph); x.stroke(); x.fillStyle = B.ink; x.textAlign = 'left'; x.fillText(n + ' ' + hr(v, 2), X(v) + 3, T + 22); });
  x.restore();
  const tp = $('g-hist-tip');
  if (hovH !== null && gotovo) {
    const v = lo + Math.max(0, Math.min(0.9999, (hovH * w - L) / pw)) * (hi - lo), b = Math.floor((v - lo) / bw), k = kos[b];
    tp.hidden = false; tp.innerHTML = `<b>NDVI ${hr(lo + b * bw, 2)}–${hr(lo + (b + 1) * bw, 2)}</b>` + red.filter((s) => k[s]).map((s) => `<span><i class="pa-kv" style="background:${STANJE[s][1]}"></i>${esc(STANJE[s][0])}: ${k[s]}</span>`).join('');
    tp.style.left = Math.min(Math.max(0, X(v) + 10), w - 200) + 'px';
  } else tp.hidden = true;
}
[['g-bat', (v) => { hovB = v; crtajBateriju(); }], ['g-hist', (v) => { hovH = v; crtajHist(); }]].forEach(([id, f]) => {
  const c = $(id);
  c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); f((e.clientX - r.left) / r.width); });
  c.addEventListener('pointerleave', () => f(null));
});

/* ---------------------------------------------------------------- ocjena */
function ocjena() {
  const k = OC.k, pr = provjeri(S, k);
  if (!ZAD) { const Mz = misijaScenarija(S), Kz = kartaScenarija(S); const Rz = let_i_mjerenje(S, Mz, V); ZAD = ocijeni(S, Mz, Kz, Rz).k; }
  const ok = pr.every((p) => p.ok);
  const fmt = { pokrivenost: (v) => hr(v) + ' %', baterija: (v) => Math.round(v) + ' %', zavrsen: (v) => (v ? 'da' : 'ne'), mutno: (v) => v + ' mutnih', odziv: (v) => hr(v) + ' %', tretirano: (v) => hr(v) + ' %' };
  $('rez').innerHTML = `<ul class="pz-prov">${pr.map((p) => `<li class="${p.ok ? 'ok' : 'ne'}"><b>${p.ok ? '✓' : '✗'}</b> ${esc(p.opis)} — ${esc(fmt[p.kljuc](p.v))}</li>`).join('')}</ul>` +
    `<p><b>${ok ? 'Scenarij je uspješan.' : 'Scenarij nije uspješan.'}</b> Bodovi: <b>${k.bodovi}</b> (zadana misija: ${ZAD.bodovi}).</p>` +
    '<dl class="pz-bil">' +
    `<dt>Trajanje leta</dt><dd>${mmss(k.trajanje * 60)}</dd><dt>Baterija nakon slijetanja</dt><dd>${Math.round(k.baterija)} %</dd>` +
    `<dt>Snimki</dt><dd>${k.nSnimki}</dd><dt>Trsova na karti</dt><dd>${hr(k.pokrivenost)} %</dd>` +
    `<dt>Bolesnih trsova</dt><dd>${k.bolesnih}</dd><dt>Od njih u tretiranim sekcijama</dt><dd>${hr(k.odziv)} %</dd>` +
    `<dt>Tretirano od vinograda</dt><dd>${hr(k.tretirano)} %</dd><dt>Škropivo</dt><dd>${Math.round(k.skropivo)} L od ${Math.round(k.skropivoSve)} L</dd>` +
    `<dt>Najveća brzina kroz zrak</dt><dd>${hr(k.vzMax)} m/s</dd></dl>` +
    '<p class="pom">Bodovi = 10 × pokrivenost × udio otkrivenih bolesnih trsova − 4 × postotak tretiranog vinograda; −150 ako misija nije završena.</p>';
  zapisi(R.L.t, `Ocjena: ${ok ? 'uspjeh' : 'nije uspjelo'}, ${k.bodovi} bodova.`);
  prikaziDnevnik();
  window.__dv = { stanje: 'gotovo', k, pr: pr.map((p) => p.ok), ok };
}

/* ---------------------------------------------------------------- dnevnik */
let dnevnik = [];
function zapisi(t, tekst, upoz = false) { dnevnik.push({ t, tekst, upoz }); }
function prikaziDnevnik() {
  const tdo = anim ? anim.t : 0;
  $('log').innerHTML = dnevnik.filter((d) => d.t <= tdo + 1e-6 || d.t === 0).map((d) => `<li${d.upoz ? ' class="pz-ne"' : ''}><span class="t">${mmss(d.t)}</span>${esc(d.tekst)}</li>`).reverse().join('');
}

function crtajSve() { crtajKartu(); crtajBateriju(); crtajHist(); prikaziDnevnik(); }
new ResizeObserver(crtajSve).observe($('k-karta'));
new ResizeObserver(() => { crtajBateriju(); crtajHist(); }).observe($('k-graf'));
const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', crtajSve);
new MutationObserver(crtajSve).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

postaviScenarij($('s-scen').value);
window.__dv = { stanje: 'plan', PRETP: Object.keys(PRETP).length };
