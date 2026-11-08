/* FORTRONIQ · IRB 120 u laboratoriju — uvećanje fotografije. © ForTroniQ d.o.o. */
const dlg = document.getElementById('lab-uvecaj'), slika = document.getElementById('lab-uvecaj-img'), opis = document.getElementById('lab-uvecaj-opis');
document.querySelectorAll('.lab-mreza img').forEach((img) => {
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
