// postavke.js — zadane postavke rezača i materijali (Original Prusa i3 MK3S & MK3S+).
// Izvor brzina, ubrzanja, povlačenja, obruba, hlađenja i ograničenja stroja: PrusaSlicer 2.3.3 profil „Original Prusa i3 MK3S & MK3S+”,
// ispis 0,20 mm (konfiguracija zapisana na kraju stvarnog G-koda za MK3S). Materijali: tablica jedinice 1.13 (Upravljanje 3D printerom).
(function (glob) {
  const ZADANO = {
    h: 0.2, h1: 0.2, w: 0.45, w1: 0.42, wv: 0.45, perimetri: 2, gornji: 5, donji: 4, gornjiMin: 0.7, donjiMin: 0.5,
    ispuna: 25, uzorak: 'resetka', preklop: 0.25,
    potpore: 'ne', potporeKut: 55, potporeXY: 0.3, potporeRazmak: 2,
    brim: 0, obrub: 2, obrubRazmak: 4,
    brzine: { perimetar: 60, vanjski: 35, prepust: 30, malo: 25, ispuna: 200, puna: 200, gornja: 50, most: 30, praznine: 40, potpora: 50, obrub: 20, prvi: 20, hod: 180 },
    a: { perimetar: 800, ispuna: 1000, prvi: 1000, hod: 1000 },
    maxVol: 15, povlacenje: 0.8, povlacenjeV: 35, povlacenjePrag: 1, podizanje: 0.4,
    minVrijemeSloja: 15, minBrzina: 15, ventilator: true, ventilatorOd: 1, ventilatorPun: 4,
    promjer: 1.75, materijal: 'PLA', tMlaznica: 210, tMlaznica1: 210, tPodloga: 60, tPodloga1: 60, gustoca: 1.24, cijena: 25
  };
  // mlaznica i podloga (°C), gustoća (g/cm³) iz jedinice 1.13; maxVol (mm³/s) [PROCJENA prema uobičajenim profilima]
  const MATERIJALI = {
    PLA: { ime: 'PLA', t: 210, tp: 60, rho: 1.24, maxVol: 15, ventilator: true, raspon: '195–220 / 50–60 °C', napomena: 'Najlakši za ispis, malo se steže.' },
    PETG: { ime: 'PETG', t: 240, tp: 80, rho: 1.27, maxVol: 8, ventilator: true, raspon: '230–250 / 70–85 °C', napomena: 'Žilaviji od PLA, lijepi se jako za glatku podlogu.' },
    ABS: { ime: 'ABS', t: 245, tp: 105, rho: 1.04, maxVol: 11, ventilator: false, raspon: '230–250 / 95–110 °C', napomena: 'Jako se steže — traži komoru; MK3S nema komoru.' },
    ASA: { ime: 'ASA', t: 250, tp: 105, rho: 1.07, maxVol: 12, ventilator: false, raspon: '240–260 / 95–110 °C', napomena: 'Kao ABS, otporniji na UV.' },
    TPU: { ime: 'TPU', t: 225, tp: 50, rho: 1.21, maxVol: 1.35, ventilator: true, raspon: '215–235 / 40–60 °C', napomena: 'Savitljiv; traži izravni (direct drive) ekstruder — MK3S ga ima. Ispisuje se sporo.' },
    PA: { ime: 'Najlon (PA)', t: 260, tp: 85, rho: 1.14, maxVol: 8, ventilator: false, raspon: '250–270 / 70–100 °C', napomena: 'Jako upija vlagu — prije ispisa sušiti.' }
  };
  // MK3S: podaci stroja (PrusaSlicer profil)
  const PISAC = { ime: 'Original Prusa i3 MK3S & MK3S+', x: 250, y: 210, z: 210, mlaznica: 0.4, filament: 1.75, podlogaMax: 120, mlaznicaMax: 300 };
  glob.FTQ_POSTAVKE = { ZADANO, MATERIJALI, PISAC };
  if (typeof module !== 'undefined') module.exports = glob.FTQ_POSTAVKE;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
