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
