// prijenos.js — prijenos modela između stranica DOS-a u istom pregledniku (IndexedDB): skener → Prusa MK3S i sl.
(function () {
  function baza() { return new Promise((ok, ne) => { const r = indexedDB.open('ftq-prijenos', 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => ok(r.result); r.onerror = () => ne(r.error); }); }
  window.FTQ_PRIJENOS = {
    spremi: async (ime, buf) => { const db = await baza(); return new Promise((ok, ne) => { const t = db.transaction('m', 'readwrite'); t.objectStore('m').put({ ime, buf, t: Date.now() }, 'zadnji'); t.oncomplete = ok; t.onerror = () => ne(t.error); }); },
    uzmi: async () => { const db = await baza(); return new Promise((ok, ne) => { const t = db.transaction('m', 'readwrite'), s = t.objectStore('m'), g = s.get('zadnji'); g.onsuccess = () => { s.delete('zadnji'); ok(g.result || null); }; g.onerror = () => ne(g.error); }); }
  };
})();
