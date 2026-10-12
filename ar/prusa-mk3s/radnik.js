// radnik.js — Web Worker: rezanje modela, G-kod i procjena trajanja izvan glavne niti (stranica ostaje glatka).
importScripts('clipper.min.js', 'rezac.js', 'procjena.js');
function rezultat(g, S) {
  const r = self.FTQ_PROCJENA.citaj(g, S ? { promjer: S.promjer, gustoca: S.gustoca } : {});
  const prenesi = [r.pomaci.buffer, r.tip.buffer, r.t1.buffer, r.e.buffer, r.linija.buffer];
  return { r, prenesi };
}
onmessage = e => {
  const d = e.data;
  try {
    if (d.vrsta === 'rezi') {
      const t0 = performance.now();
      const javi = (u, p) => postMessage({ vrsta: 'napredak', id: d.id, u, p });
      const sl = self.FTQ_REZAC.izreži(d.T, d.S, javi);
      javi(0.9, 'Pišem G-kod');
      let g = self.FTQ_REZAC.gkod(sl, d.S, javi);
      javi(0.97, 'Procjena trajanja');
      g = self.FTQ_REZAC.dodajM73(g, self.FTQ_PROCJENA.citaj(g, { promjer: d.S.promjer, gustoca: d.S.gustoca }));
      const { r, prenesi } = rezultat(g, d.S);
      postMessage({ vrsta: 'gotovo', id: d.id, gkod: g, r, ms: performance.now() - t0, izvor: 'rezac' }, prenesi);
    } else if (d.vrsta === 'gkod') {
      const t0 = performance.now();
      const { r, prenesi } = rezultat(d.gkod, d.S);
      postMessage({ vrsta: 'gotovo', id: d.id, gkod: d.gkod, r, ms: performance.now() - t0, izvor: 'gkod' }, prenesi);
    } else if (d.vrsta === 'analiza') {
      postMessage({ vrsta: 'analiza', id: d.id, a: self.FTQ_REZAC.analiza(d.T, d.kut) });
    }
  } catch (err) { postMessage({ vrsta: 'greska', id: d.id, poruka: String(err && err.message || err) }); }
};
