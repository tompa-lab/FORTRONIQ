/* FORTRONIQ · IRB 120 pick & place — uvećanje fotografija i kontrolne točke. © ForTroniQ d.o.o. */
const dlg = document.getElementById('lab-uvecaj'), slika = document.getElementById('lab-uvecaj-img'), opis = document.getElementById('lab-uvecaj-opis');
document.querySelectorAll('.pp-sl img, .lab-mreza img').forEach((img) => {
  img.tabIndex = 0; img.setAttribute('role', 'button');
  const otvori = () => {
    slika.src = img.currentSrc || img.src; slika.alt = img.alt;
    const fc = img.closest('figure').querySelector('figcaption'); opis.textContent = fc ? fc.textContent : '';
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal(); else window.open(img.src, '_blank');
  };
  img.addEventListener('click', otvori);
  img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); otvori(); } });
});
if (dlg) dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

const KLJUC = 'ftq-industrijski-robot-irb120-pick-and-place-kt';
let stanje = {};
try { stanje = JSON.parse(localStorage.getItem(KLJUC) || '{}') || {}; } catch (e) { stanje = {}; }
const kucice = [...document.querySelectorAll('.pp-kt input[data-kt]')];
const popis = document.getElementById('pp-kt-popis');
const ol = document.createElement('ol');
const stavke = kucice.map((k) => {
  const li = document.createElement('li');
  const a = document.createElement('a');
  const okvir = k.closest('.pp-kt'); okvir.id = 'kt-' + k.dataset.kt;
  a.href = '#kt-' + k.dataset.kt;
  a.textContent = okvir.textContent.replace(/\s+/g, ' ').trim();
  li.appendChild(a); ol.appendChild(li);
  return li;
});
if (popis) popis.appendChild(ol);
const osvjezi = () => kucice.forEach((k, i) => { k.checked = !!stanje[k.dataset.kt]; stavke[i].classList.toggle('ok', k.checked); });
kucice.forEach((k) => k.addEventListener('change', () => {
  stanje[k.dataset.kt] = k.checked;
  try { localStorage.setItem(KLJUC, JSON.stringify(stanje)); } catch (e) { /* pregledač ne pamti */ }
  osvjezi();
}));
osvjezi();

/* „Za one koji žele više”: otvori okvir kad se na njega skoči poveznicom */
const otvoriHash = () => {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return;
  const el = document.getElementById(h);
  if (el && el.tagName === 'DETAILS') el.open = true;
};
window.addEventListener('hashchange', otvoriHash);
otvoriHash();

/* Euler ZYX (ABB: EZ, EY, EX) ↔ kvaternion (ABB: q1 = w, q2 = x, q3 = y, q4 = z) */
const D = Math.PI / 180;
const uKvat = (ez, ey, ex) => {
  const cz = Math.cos(ez * D / 2), sz = Math.sin(ez * D / 2), cy = Math.cos(ey * D / 2), sy = Math.sin(ey * D / 2), cx = Math.cos(ex * D / 2), sx = Math.sin(ex * D / 2);
  return [cz * cy * cx + sz * sy * sx, cz * cy * sx - sz * sy * cx, cz * sy * cx + sz * cy * sx, sz * cy * cx - cz * sy * sx];
};
const uEuler = (q) => {
  let [w, x, y, z] = q; const n = Math.hypot(w, x, y, z) || 1; w /= n; x /= n; y /= n; z /= n;
  const ez = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  const ey = Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x))));
  const ex = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
  return [ez / D, ey / D, ex / D];
};
const hr = (v, d) => v.toFixed(d).replace('-', '−').replace('.', ',');
document.querySelectorAll('.pp-rot').forEach((box) => {
  box.innerHTML = '<h5>Probaj: Eulerovi kutovi ↔ kvaternion (ABB zapis)</h5>' +
    ['EZ', 'EY', 'EX'].map((k) => `<div class="red"><label for="pp-${k}">${k}</label><input type="range" min="-180" max="180" step="0.01" data-k="${k}" aria-label="${k} klizač"><input type="number" id="pp-${k}" min="-180" max="180" step="0.01" data-k="${k}"></div>`).join('') +
    '<div class="q">' + [1, 2, 3, 4].map((i) => `<div><label for="pp-q${i}">q${i}</label><input type="number" id="pp-q${i}" step="0.00001" min="-1" max="1" data-q="${i - 1}"></div>`).join('') + '</div>' +
    '<div class="gumbi"><button type="button" class="gumb tanki" data-pr="p1">Kvaternion s robota (točka p1)</button><button type="button" class="gumb tanki" data-pr="omot">Prijeđi granicu 180°</button><button type="button" class="gumb tanki" data-pr="ey90">EY = 90°</button></div>' +
    '<p class="info" aria-live="polite"></p>';
  const kut = {}, info = box.querySelector('.info');
  const qPolja = [...box.querySelectorAll('[data-q]')];
  const postavi = (e, iz) => {
    ['EZ', 'EY', 'EX'].forEach((k, i) => { kut[k] = e[i]; box.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { el.value = e[i].toFixed(2); }); });
    const q = uKvat(e[0], e[1], e[2]);
    if (iz !== 'q') qPolja.forEach((el, i) => { el.value = q[i].toFixed(5); });
    return q;
  };
  box.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.k) { const e = ['EZ', 'EY', 'EX'].map((k) => (k === t.dataset.k ? parseFloat(t.value) || 0 : kut[k])); postavi(e); info.textContent = ''; }
    else if (t.dataset.q) { const q = qPolja.map((el) => parseFloat(el.value) || 0); postavi(uEuler(q), 'q'); info.textContent = 'Kutovi izračunati iz upisanog kvaterniona (prije računa se normira na duljinu 1).'; }
  });
  box.addEventListener('click', (ev) => {
    const pr = ev.target.dataset && ev.target.dataset.pr;
    if (pr === 'p1') {
      const q = [0.00015, 0.73023, 0.68320, 0]; qPolja.forEach((el, i) => { el.value = q[i].toFixed(5); }); postavi(uEuler(q), 'q');
      info.textContent = 'q s robota za p1 → EZ ≈ 86,2°, EY ≈ 0°, EX ≈ 180°: isti položaj kao na zaslonu Jogginga.';
    } else if (pr === 'omot') {
      const a = uKvat(kut.EZ, kut.EY, 179.99), b0 = uKvat(kut.EZ, kut.EY, -179.99);
      const zn = a.reduce((s, v, i) => s + v * b0[i], 0) < 0 ? -1 : 1, b = b0.map((v) => v * zn);
      postavi([kut.EZ, kut.EY, -179.99]); qPolja.forEach((el, i) => { el.value = b[i].toFixed(5); });
      const r = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
      info.textContent = 'EX 179,99° → −179,99°: kut je skočio za 359,98°, a kvaternion se promijenio najviše za ' + hr(r, 5) + ' — robot se zakrenuo za samo 0,02°.' + (zn < 0 ? ' (Formula je dala −q; promijenjeni su predznaci jer su q i −q isti položaj.)' : '');
    } else if (pr === 'ey90') {
      postavi([30, 90, 0]); const q1 = uKvat(30, 90, 0), q2 = uKvat(60, 90, 30);
      const r = Math.max(...q1.map((v, i) => Math.abs(v - q2[i])));
      info.textContent = 'Uz EY = 90° kombinacije (EZ 30°, EX 0°) i (EZ 60°, EX 30°) daju isti kvaternion (razlika ' + hr(r, 5) + ') — Eulerovi kutovi tu nisu jednoznačni.';
    }
  });
  postavi([parseFloat(box.dataset.ez) || 0, parseFloat(box.dataset.ey) || 0, parseFloat(box.dataset.ex) || 0]);
});

/* Provjeri se */
const kvizovi = [...document.querySelectorAll('#pp-kviz .kviz')];
const rez = document.getElementById('pp-kviz-rez');
const brojac = () => {
  const odg = kvizovi.filter((k) => k.dataset.gotov);
  const ok = odg.filter((k) => k.dataset.gotov === 'da').length;
  if (rez) rez.textContent = odg.length ? `Odgovoreno ${odg.length} od ${kvizovi.length}, točno iz prve ${ok}.` : '';
};
kvizovi.forEach((k) => {
  const t = parseInt(k.dataset.t, 10);
  k.querySelectorAll('.odg button').forEach((b, i) => b.addEventListener('click', () => {
    b.classList.add(i === t ? 'tocno' : 'netocno');
    if (!k.dataset.gotov) k.dataset.gotov = i === t ? 'da' : 'ne';
    if (i === t) k.querySelector('.obraz').classList.add('vidi');
    brojac();
  }));
});
document.querySelectorAll('#pp-kviz .obraz a').forEach((a) => a.addEventListener('click', () => setTimeout(otvoriHash, 0)));
