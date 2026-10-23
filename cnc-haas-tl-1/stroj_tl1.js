/* FORTRONIQ · Haas TL-1 — 3D model tokarilice prema fotografijama stvarnog stroja (20. 10. 2026.) i podacima proizvođača.
   Proizvođač (list specifikacija TL-1): hod X 203 mm · Z 762 mm, najveći promjer tokarenja 406 mm, duljina 762 mm, razmak šiljaka 762 mm,
   vreteno do 1 800 o/min, 7,5 kW, provrt 58 mm, nos A2-5, ručna stezna glava Ø203 mm, brzi hod 11,4 m/min, 2 223 kg, 380/400 V.
   S fotografija: bijela kabina s kliznim vratima (prozor, okomita ručka od inoxa) koja se otvaraju ulijevo preko vreteništa, tamnosivo
   postolje s nožicama, tamna unutrašnjost (stezna glava, suport s nosačem alata, rashladno crijevo), privjesak NGC na desnom dijelu
   kabine sa signalnom svjetiljkom, straga svijetlosivi električni ormar s glavnom sklopkom. Mjere kabine i visina vretena su procjena.
   Koordinate: 1 jedinica = 1 mm. Svijet: x = os Z stroja (+ prema konjiću), y gore, z prema rukovatelju (+ = os X stroja, od osi vretena).
   Os vretena: y = 0, z = 0; čelo stezne glave na x = 0. Vrh alata: x = ZT0 + Z, z = R0 + X/2 (X se programira kao promjer, kao na Haasu).
   Koordinate stroja (nakon ZERO RETURN): X 0 … −406 (promjer), Z 0 … −762.  Bez logotipa, serijskih brojeva i tuđih naljepnica.
   © ForTroniQ d.o.o. */

export const GEO = {
  HOD: { X: [-416, 0], Z: [-762, 0] },      /* X 5 mm preko osi (za čeono tokarenje do X−1.) — pretpostavka */
  R0: 203,                      /* polumjer vrha alata od osi vretena pri X = 0 (nultočka stroja) → X = −406 je os vretena */
  ZT0: 775,                     /* udaljenost vrha alata od čela stezne glave pri Z = 0 (pri Z = −762 vrh je 13 mm od čela glave) */
  GLAVA: { D: 203, L: 95, CELJUST: 25 },   /* stezna glava: promjer, duljina tijela, duljina čeljusti ispred čela */
  S_MAX: 1800, BRZI: 11400,
  VISINA_VRETENA: 1000,         /* visina osi vretena iznad poda (procjena) */
  KABINA: { X0: -1100, X1: 1450, Z0: -450, Z1: 420, Y0: -600, Y1: 700, OTVOR: { X0: -200, X1: 720, Y0: -330, Y1: 560 } }
};

export function postaviOkolinu(THREE, renderer, scene) {
  const env = new THREE.Scene();
  const g = new THREE.SphereGeometry(100, 32, 16); const c = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 100; const k = y > 0 ? 0.75 + 0.25 * y : 0.35 + 0.3 * (1 + y); c.push(k, k * 1.01, k * 1.04); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const svj = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [x, y, z] of [[0, 90, 0], [60, 60, -40], [-70, 50, 30]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 40), svj); b.position.set(x, y, z); b.lookAt(0, 0, 0); env.add(b); }
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.03).texture; pm.dispose();
}

export function napraviStrojTL1(THREE, scene) {
  const dijelovi = new Map();
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o));
  const M = {
    bijela: mat(0xe6e7e2, { roughness: 0.5, metalness: 0.1 }), bijelaT: mat(0xd4d5d0, { roughness: 0.55 }), ormar: mat(0xd2d4d0, { roughness: 0.5 }),
    postolje: mat(0x3a3d41, { roughness: 0.65, metalness: 0.2 }), unutra: mat(0x44474b, { roughness: 0.75 }), klizac: mat(0x4b5056, { roughness: 0.5, metalness: 0.3 }),
    lijev: mat(0x565b60, { roughness: 0.55, metalness: 0.25 }), celik: mat(0xdfe3e6, { metalness: 0.85, roughness: 0.22 }), celikT: mat(0x9aa0a5, { metalness: 0.7, roughness: 0.35 }),
    glava: mat(0x555a5f, { metalness: 0.6, roughness: 0.4 }), crna: mat(0x1e2124, { roughness: 0.6 }), crna2: mat(0x2f3336, { roughness: 0.5 }),
    staklo: new THREE.MeshStandardMaterial({ color: 0x0b0f12, transparent: true, opacity: 0.5, roughness: 0.25, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }),
    inox: mat(0xd8dcde, { metalness: 0.9, roughness: 0.2 }), crvena: mat(0xd2322a, { roughness: 0.45 }), zuta: mat(0xf2c21a), zelena: mat(0x1d9e4b),
    plava: mat(0x2b4fa8, { roughness: 0.5 }), pod: mat(0x9b9c98, { roughness: 0.9 }), obradak: mat(0xc9ccd0, { metalness: 0.6, roughness: 0.4 }),
    privjesak: mat(0xe6e7e2, { roughness: 0.5 }), ploca: mat(0xc1c4c0, { roughness: 0.6 }), alat: mat(0x3b3f43, { roughness: 0.5, metalness: 0.4 }), insert: mat(0xd9b35a, { metalness: 0.7, roughness: 0.3 }),
    pneu: mat(0x2c7fd6, { roughness: 0.4 })
  };
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, s = 28, r2) => new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, h, s), m);
  function add(p, o, x, y, z) { o.position.set(x, y, z); p.add(o); return o; }
  const cylX = (p, r, L, m, x, y, z, s) => { const c = add(p, cyl(r, L, m, s), x, y, z); c.rotation.z = Math.PI / 2; return c; };
  const cylZ = (p, r, L, m, x, y, z, s) => { const c = add(p, cyl(r, L, m, s), x, y, z); c.rotation.x = Math.PI / 2; return c; };
  function reg(id, naziv, ...obj) {
    if (!dijelovi.has(id)) dijelovi.set(id, { naziv, objekti: [] });
    const d = dijelovi.get(id);
    obj.forEach((o) => { d.objekti.push(o); o.traverse((m) => { if (m.isMesh && !m.userData.dio) m.userData.dio = id; }); });
  }
  function natpis(tekst, w, h, boja = '#e8eef1', poz = '#23272b', vel = 30, teza = 600) {
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.max(16, Math.round(256 * h / w)); const g = c.getContext('2d');
    g.fillStyle = poz; g.fillRect(0, 0, c.width, c.height); g.fillStyle = boja; g.font = teza + ' ' + vel + 'px "IBM Plex Sans",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    tekst.split('\n').forEach((t, i, a) => g.fillText(t, c.width / 2, c.height / 2 + (i - (a.length - 1) / 2) * vel * 1.15));
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  }

  const korijen = new THREE.Group(); scene.add(korijen);
  const K = GEO.KABINA, O = K.OTVOR, G = GEO.GLAVA;
  const POD = -GEO.VISINA_VRETENA;

  /* ---------------------------------------------------------------- pod */
  const pod = add(korijen, box(5200, 20, 3600, M.pod), 300, POD - 10, 300); pod.userData.dio = 'pod';

  /* ---------------------------------------------------------------- postolje i vodilice (os Z) */
  const postolje = new THREE.Group(); korijen.add(postolje);
  add(postolje, box(2500, 400, 820, M.postolje), 175, POD + 200, -30);                            /* tamnosivo podnožje ispod bijele kabine */
  add(postolje, box(2400, 300, 760, M.postolje), 225, POD + 550, -20);                            /* postolje (lijevano, tamnosivo) */
  for (const x of [-900, 1320]) for (const z of [-330, 300]) add(postolje, cyl(22, 60, M.crna, 12), x, POD + 30, z);   /* nožice */
  add(postolje, box(1700, 40, 700, M.crna2), 600, POD + 580, -10);                               /* korito za strugotinu */
  add(postolje, box(1600, 70, 120, M.lijev), 650, POD + 635, -170);                              /* prizmatične vodilice Z (stražnja) */
  add(postolje, box(1600, 70, 120, M.lijev), 650, POD + 635, 150);                               /* prednja */
  for (const z of [-170, 150]) add(postolje, box(1600, 8, 60, M.celikT), 650, POD + 674, z);
  cylX(postolje, 16, 1500, M.celik, 650, POD + 640, -10, 16);                                    /* kuglično vreteno osi Z */
  add(postolje, box(90, 90, 90, M.crna2), 1440, POD + 640, -10);                                 /* motor osi Z (desno) */
  reg('postolje', 'Postolje i vodilice osi Z', postolje);

  /* ---------------------------------------------------------------- vreteniste i stezna glava */
  const vreteniste = new THREE.Group(); korijen.add(vreteniste);
  add(vreteniste, box(520, 560, 520, M.unutra), -360, -40, -40);                                 /* kućište vreteništa */
  cylX(vreteniste, 95, 110, M.lijev, -105, 0, 0, 40);                                            /* nos vretena A2-5 */
  add(vreteniste, box(300, 240, 240, M.crna2), -560, 260, -120);                                 /* motor vretena (straga gore) */
  const glava = new THREE.Group(); vreteniste.add(glava);                                        /* stezna glava Ø203 (vrti se) */
  cylX(glava, G.D / 2, G.L, M.glava, -G.L / 2, 0, 0, 48);
  cylX(glava, G.D / 2 - 6, 2, M.celikT, 0.5, 0, 0, 48);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; const s = add(glava, box(6, 90, 14, M.crna), -2, Math.cos(a) * 55, Math.sin(a) * 55); s.rotation.x = -a; }   /* utori */
  const celjusti = []; const CELJ = 3;
  for (let i = 0; i < CELJ; i++) {
    const a = i * Math.PI * 2 / 3 + Math.PI / 2; const g = new THREE.Group(); glava.add(g); g.rotation.x = -a;
    const c = add(g, box(G.CELJUST, 42, 32, M.celik), G.CELJUST / 2, 0, 0); c.userData.r = 60; celjusti.push({ g, mesh: c });
    add(g, box(G.CELJUST - 8, 8, 24, M.celikT), G.CELJUST / 2 - 4, -25, 0);
  }
  let kutGlave = 0;
  function okreniGlavu(kut) { kutGlave = kut; glava.rotation.x = -kut; }
  function celjustiNa(r) { celjusti.forEach(({ mesh }) => { mesh.position.y = r + 21; mesh.userData.r = r; }); }
  celjustiNa(40);
  reg('vreteniste', 'Vreteniste, vreteno i motor', vreteniste);
  reg('glava', 'Stezna glava Ø203 mm (3 čeljusti)', glava);

  /* ---------------------------------------------------------------- suport (os Z), poprečne saonice (os X), nosač alata */
  const suport = new THREE.Group(); korijen.add(suport);
  add(suport, box(320, 90, 600, M.klizac), 0, POD + 720, 0);                                       /* saonice po vodilicama */
  for (const z of [-170, 150]) add(suport, box(330, 30, 150, M.lijev), 0, POD + 668, z);
  add(suport, box(60, 60, 60, M.crna2), 0, POD + 760, -330);                                       /* motor osi X (straga) */
  cylZ(suport, 10, 560, M.celik, 0, POD + 780, -30, 14);
  const poprecne = new THREE.Group(); suport.add(poprecne);
  add(poprecne, box(230, 60, 320, M.klizac), 0, POD + 795, 0);
  const nosac = new THREE.Group(); poprecne.add(nosac);                                            /* brzoizmjenjivi nosač alata */
  const NOS_Y = POD + 825;
  add(nosac, box(120, 30, 120, M.lijev), 0, NOS_Y + 15, 0);
  add(nosac, box(80, 230, 80, M.alat), 0, NOS_Y + 145, 0);                                     /* stup nosača (vrh alata na visini osi vretena) */
  add(nosac, cyl(14, 24, M.celik, 16), 0, NOS_Y + 272, 0); cylX(nosac, 6, 90, M.celik, 40, NOS_Y + 270, 0, 10);   /* ručica stezanja */
  const alatG = new THREE.Group(); nosac.add(alatG);                                               /* držač + alat; vrh alata u (0, 0, 0) svijeta suporta */
  let alatMesh = [];
  const DRZAC_Y = 0;                                                                               /* vrh alata je na visini osi vretena (y = 0) */
  function postaviAlat(vrsta) {
    alatMesh.forEach((m) => { alatG.remove(m); m.geometry.dispose(); }); alatMesh = [];
    const d = (o) => { alatMesh.push(o); o.userData.dio = 'nosac'; return o; };
    d(add(alatG, box(70, 60, 50, M.celikT), 20, 30, -40));                                         /* brzoizmjenjivi držač */
    if (vrsta === 'odrezivac') { d(add(alatG, box(60, 20, 20, M.alat), 30, 10, -20)); d(add(alatG, box(3, 14, 22, M.insert), -1.5, 7, -17)); }   /* odrezivač/utorni nož 3 mm */
    else if (vrsta === 'svrdlo') { d(cylX(alatG, 20, 60, M.celikT, 40, 0, 0, 20)); d(cylX(alatG, 6, 70, M.celik, -25, 0, 0, 14)); d(add(alatG, cyl(6, 8, M.celik, 14, 0.5), -64, 0, 0)).rotation.z = Math.PI / 2; }   /* svrdlo Ø12 u držaču na osi */
    else if (vrsta === 'navoj') { d(add(alatG, box(70, 20, 20, M.alat), 35, 10, -14)); const i = d(add(alatG, box(10, 6, 10, M.insert), 2, 3, -5)); i.rotation.y = Math.PI / 4; }
    else if (vrsta === 'unutarnji') { d(cylX(alatG, 9, 110, M.alat, 50, 0, -4, 14)); d(add(alatG, box(8, 6, 8, M.insert), -3, 3, -1)).rotation.y = Math.PI / 4; }
    else { d(add(alatG, box(80, 20, 20, M.alat), 40, 10, -12)); const i = d(add(alatG, box(12, 6, 12, M.insert), 3, 3, -3)); i.rotation.y = Math.PI / 4; }   /* vanjski nož (desni, pločica 80°) */
    alatG.position.set(-40, DRZAC_Y, 0);                                                           /* pomak držača tako da je vrh na (0,0,0) suporta */
  }
  postaviAlat('vanjski');
  /* rashladno crijevo (plavo, segmentno) s nosača alata */
  { const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(30, NOS_Y + 280, 20), new THREE.Vector3(10, NOS_Y + 320, 70), new THREE.Vector3(-60, NOS_Y + 240, 60), new THREE.Vector3(-70, NOS_Y + 190, 20)]), 24, 6, 8, false);
    const c = new THREE.Mesh(t, M.plava); c.userData.dio = 'nosac'; nosac.add(c); }
  reg('suport', 'Suport — os Z', suport);
  reg('poprecne', 'Poprečne saonice — os X', poprecne);
  reg('nosac', 'Nosač alata (brzoizmjenjivi) i alat', nosac);

  /* ---------------------------------------------------------------- konjić (ručni) */
  const konjic = new THREE.Group(); korijen.add(konjic);
  add(konjic, box(260, 240, 260, M.lijev), 1330, POD + 800, -10);
  add(konjic, box(260, 60, 300, M.klizac), 1330, POD + 710, -10);
  cylX(konjic, 30, 200, M.celik, 1150, 0, 0, 24);                                                  /* pinola */
  const sil = add(konjic, cyl(30, 60, M.celikT, 24, 4), 1020, 0, 0); sil.rotation.z = Math.PI / 2;   /* rotirajući šiljak */
  cylX(konjic, 8, 60, M.celik, 1490, 0, 0, 10); const kol = cylX(konjic, 70, 14, M.crna2, 1528, 0, 0, 32); void kol;   /* ručno kolo */
  cylX(konjic, 10, 120, M.celik, 1330, 150, 0, 10);                                               /* ručica stezanja */
  reg('konjic', 'Konjić (ručni) s rotirajućim šiljkom', konjic);

  /* ---------------------------------------------------------------- kabina (bijela) */
  const kabina = new THREE.Group(); korijen.add(kabina);
  const KW = K.X1 - K.X0, KD = K.Z1 - K.Z0, KX = (K.X0 + K.X1) / 2, KZ = (K.Z0 + K.Z1) / 2;
  add(kabina, box(KW, K.Y1 - K.Y0, 20, M.bijela), KX, (K.Y0 + K.Y1) / 2, K.Z0 + 10);               /* stražnja stijenka */
  add(kabina, box(20, K.Y1 - K.Y0, KD, M.bijela), K.X0 + 10, (K.Y0 + K.Y1) / 2, KZ);              /* lijeva */
  add(kabina, box(20, K.Y1 - K.Y0, KD, M.bijela), K.X1 - 10, (K.Y0 + K.Y1) / 2, KZ);              /* desna */
  add(kabina, box(KW, 20, KD, M.bijela), KX, K.Y1 - 10, KZ);                                      /* krov */
  add(kabina, box(KW, O.Y0 - K.Y0, 20, M.bijela), KX, (K.Y0 + O.Y0) / 2, K.Z1 - 10);              /* donja prednja ploča (sokl) */
  add(kabina, box(O.X0 - K.X0, K.Y1 - O.Y0, 20, M.bijela), (K.X0 + O.X0) / 2, (O.Y0 + K.Y1) / 2, K.Z1 - 10);   /* lijevi fiksni dio (iznad vreteništa) */
  add(kabina, box(K.X1 - O.X1, K.Y1 - O.Y0, 20, M.bijela), (O.X1 + K.X1) / 2, (O.Y0 + K.Y1) / 2, K.Z1 - 10);   /* desni fiksni dio (nosi privjesak) */
  add(kabina, box(O.X1 - O.X0, K.Y1 - O.Y1, 20, M.bijela), (O.X0 + O.X1) / 2, (O.Y1 + K.Y1) / 2, K.Z1 - 10);   /* nadvoj iznad otvora */
  add(kabina, natpis('', 170, 46, '#ffffff', '#f4f4f4'), O.X1 - 120, O.Y1 + 70, K.Z1 + 0.6);      /* mjesto naljepnica upozorenja (prazno) */
  add(kabina, box(KW - 40, 20, 8, M.inox), KX, O.Y0 + 10, K.Z1 + 4);                              /* vodilica vrata */
  add(kabina, box(1500, 12, 30, mat(0xfff4d6, { emissive: 0xfff0c0, emissiveIntensity: 0 })), 500, K.Y1 - 40, K.Z0 + 120).userData.dio = 'kabina';   /* LED rasvjeta */
  const svjetlo = kabina.children[kabina.children.length - 1];
  add(kabina, box(1650, O.Y1 - POD - 600, 10, M.unutra), 600, (O.Y1 + POD + 600) / 2, -300);     /* unutarnja stražnja stijenka (štitnik) */
  /* signalna svjetiljka na krovu desnog dijela */
  const lampa = add(kabina, cyl(28, 70, mat(0xd9dde0, { transparent: true, opacity: 0.6 }), 24), 1100, K.Y1 + 45, 300); lampa.userData.dio = 'kabina';
  add(kabina, cyl(30, 12, M.crna2, 24), 1100, K.Y1 + 6, 300).userData.dio = 'kabina';
  reg('kabina', 'Kabina s rasvjetom i signalnom svjetiljkom', kabina);
  /* klizna vrata: prozor, okomita ručka; otvorena = pomaknuta ulijevo preko vreteništa */
  const vrata = new THREE.Group(); korijen.add(vrata);
  const VW = O.X1 - O.X0 + 40, VH = O.Y1 - O.Y0 + 20;
  { const okvir = new THREE.Shape(); okvir.moveTo(-VW / 2, 0); okvir.lineTo(VW / 2, 0); okvir.lineTo(VW / 2, VH); okvir.lineTo(-VW / 2, VH); okvir.lineTo(-VW / 2, 0);
    const r = new THREE.Path(); const px0 = -VW / 2 + 70, px1 = VW / 2 - 150, py0 = 180, py1 = VH - 100, k = 40;
    r.moveTo(px0 + k, py0); r.lineTo(px1 - k, py0); r.lineTo(px1, py0 + k); r.lineTo(px1, py1 - k); r.lineTo(px1 - k, py1); r.lineTo(px0 + k, py1); r.lineTo(px0, py1 - k); r.lineTo(px0, py0 + k); r.lineTo(px0 + k, py0);
    okvir.holes.push(r);
    const g = new THREE.ExtrudeGeometry(okvir, { depth: 24, bevelEnabled: false }); g.translate(0, 0, 0);
    vrata.add(new THREE.Mesh(g, M.bijela));
    const st = new THREE.Mesh(new THREE.PlaneGeometry(px1 - px0, py1 - py0), M.staklo); st.position.set((px0 + px1) / 2, (py0 + py1) / 2, 12); vrata.add(st);
    const h = 260; add(vrata, cyl(12, h, M.inox, 16), VW / 2 - 70, VH / 2, 60); for (const sy of [-1, 1]) cylZ(vrata, 10, 50, M.inox, VW / 2 - 70, VH / 2 + sy * (h / 2 - 12), 36, 14);   /* okomita ručka */
    add(vrata, natpis('TL-1', 200, 80, '#d2322a', '#e6e7e2', 72, 800), -VW / 2 + 150, 95, 24.6);   /* oznaka modela (naš natpis, bez logotipa) */
  }
  const VR_Z = K.Z1 + 16, VR_OTV = O.X0 - VW / 2 - 20, VR_ZATV = (O.X0 + O.X1) / 2;
  vrata.position.set(VR_ZATV, O.Y0 - 10, VR_Z);
  function vrataNa(u) { vrata.position.x = VR_ZATV + (VR_OTV - VR_ZATV) * u; }                     /* u = 1 otvorena (ulijevo), 0 zatvorena */
  reg('vrata', 'Klizna zaštitna vrata s prozorom', vrata);

  /* ---------------------------------------------------------------- privjesak NGC na desnom dijelu kabine */
  const privjesak = new THREE.Group(); korijen.add(privjesak);
  const PW = 400, PH = 500, PD = 170;
  privjesak.position.set(1030, -80, K.Z1 + PD / 2 - 6);
  add(privjesak, box(PW, PH, PD, M.privjesak), 0, PH / 2, 0);
  add(privjesak, box(PW - 24, PH - 24, 2, M.ploca), 0, PH / 2, PD / 2 + 1);                           /* prednja (siva) ploča */
  const zasC = document.createElement('canvas'); zasC.width = 384; zasC.height = 288; const zasT = new THREE.CanvasTexture(zasC);
  const zaslon = add(privjesak, new THREE.Mesh(new THREE.PlaneGeometry(230, 172), new THREE.MeshBasicMaterial({ map: zasT })), 60, PH - 125, PD / 2 + 2.6);
  add(privjesak, box(242, 184, 1, M.crna), 60, PH - 125, PD / 2 + 2.2);
  { const c = document.createElement('canvas'); c.width = 512; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#c1c4c0'; g.fillRect(0, 0, 512, 300);
    const key = (x, y, w, h, b) => { g.fillStyle = b; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + h - 2, w, 2); };
    key(8, 8, 46, 16, '#e07a2a'); key(58, 8, 30, 16, '#4aa3d8'); key(92, 8, 30, 16, '#4aa3d8');
    for (let i = 0; i < 4; i++) key(8 + i * 30, 30, 26, 16, '#9c9f9b');
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) key(140 + i * 30, 8 + r * 22, 26, 16, '#9c9f9b');
    for (let r = 0; r < 6; r++) for (let i = 0; i < 5; i++) key(270 + i * 46, 8 + r * 22, 42, 16, i === 0 ? '#bfe0f0' : '#9c9f9b');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) key(8 + i * 30, 60 + r * 22, 26, 16, (r + i) % 2 ? '#4aa3d8' : '#9c9f9b');
    key(170, 60, 26, 16, '#4aa3d8'); key(200, 60, 26, 16, '#9c9f9b'); key(230, 60, 26, 16, '#4aa3d8'); key(170, 82, 26, 16, '#9c9f9b'); key(230, 82, 26, 16, '#9c9f9b'); key(170, 104, 26, 16, '#4aa3d8'); key(200, 104, 26, 16, '#9c9f9b'); key(230, 104, 26, 16, '#4aa3d8');
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) key(8 + i * 30, 150 + r * 22, 26, 16, r === 3 ? (i === 1 ? '#e8a2a2' : i < 3 ? '#a6d8b0' : '#9c9f9b') : '#9c9f9b');
    for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) key(150 + i * 36, 150 + r * 22, 32, 16, r === 0 && i === 0 ? '#e8d57a' : '#9c9f9b');
    const t = new THREE.CanvasTexture(c); add(privjesak, new THREE.Mesh(new THREE.PlaneGeometry(280, 160), new THREE.MeshBasicMaterial({ map: t })), 40, 110, PD / 2 + 2.6); }
  const estop = add(privjesak, cyl(18, 12, M.crvena, 28, 16), -145, PH - 180, PD / 2 + 8); estop.rotation.x = Math.PI / 2; estop.userData.klik = 'estop';
  add(privjesak, cyl(25, 3, M.zuta, 28), -145, PH - 180, PD / 2 + 3).rotation.x = Math.PI / 2;
  add(privjesak, natpis('EMERGENCY STOP', 76, 8, '#333', '#c1c4c0', 30, 600), -145, PH - 145, PD / 2 + 2.7);
  const gumbOn = add(privjesak, cyl(10, 6, M.zelena, 20), -168, PH - 70, PD / 2 + 4); gumbOn.rotation.x = Math.PI / 2; gumbOn.userData.klik = 'powerOn';
  const gumbOff = add(privjesak, cyl(10, 6, M.crvena, 20), -120, PH - 70, PD / 2 + 4); gumbOff.rotation.x = Math.PI / 2; gumbOff.userData.klik = 'powerOff';
  add(privjesak, natpis('POWER ON', 44, 8, '#333', '#c1c4c0', 36, 600), -168, PH - 48, PD / 2 + 2.7); add(privjesak, natpis('POWER OFF', 44, 8, '#333', '#c1c4c0', 36, 600), -120, PH - 48, PD / 2 + 2.7);
  add(privjesak, natpis('HANDLE JOG', 64, 8, '#333', '#c1c4c0', 34, 600), -145, PH - 235, PD / 2 + 2.7);
  const kotac = add(privjesak, cyl(32, 12, M.celikT, 40), -145, PH - 285, PD / 2 + 8); kotac.rotation.x = Math.PI / 2; kotac.userData.klik = 'kotac';
  add(privjesak, cyl(22, 4, M.privjesak, 32), -145, PH - 285, PD / 2 + 14).rotation.x = Math.PI / 2;
  add(privjesak, cyl(2.5, 6, M.crna, 10), -145 + 26, PH - 285, PD / 2 + 14).rotation.x = Math.PI / 2;
  const cs = add(privjesak, cyl(10, 6, M.zelena, 20), -168, 45, PD / 2 + 4); cs.rotation.x = Math.PI / 2; cs.userData.klik = 'cycleStart';
  const fh = add(privjesak, cyl(10, 6, M.crvena, 20), -120, 45, PD / 2 + 4); fh.rotation.x = Math.PI / 2;
  add(privjesak, natpis('CYCLE START', 44, 8, '#333', '#c1c4c0', 30, 600), -168, 67, PD / 2 + 2.7); add(privjesak, natpis('FEED HOLD', 44, 8, '#333', '#c1c4c0', 30, 600), -120, 67, PD / 2 + 2.7);
  add(privjesak, cyl(16, 40, M.celikT, 16), 120, PH + 20, -20);                                     /* nosač signalne svjetiljke / kabela */
  reg('privjesak', 'Privjesak upravljanja NGC', privjesak);

  /* ---------------------------------------------------------------- električni ormar straga (svijetlosivi) s glavnom sklopkom */
  const ormar = new THREE.Group(); korijen.add(ormar);
  const OX = 1050, OZ = K.Z0 - 150;
  add(ormar, box(760, 1500, 300, M.ormar), OX, POD + 760, OZ);
  add(ormar, box(2, 1380, 6, M.celikT), OX - 60, POD + 760, OZ - 150);                              /* rub vrata ormara */
  const sklopkaPl = add(ormar, natpis('', 90, 110, '#777', '#f2f2f2'), OX + 110, POD + 1150, OZ - 151); sklopkaPl.rotation.y = Math.PI;
  const sklopka = add(ormar, box(14, 60, 10, M.crna), OX + 110, POD + 1150, OZ - 158); sklopka.userData.klik = 'sklopka';   /* ručica glavne sklopke */
  add(ormar, natpis('I   OFF', 60, 12, '#222', '#f2f2f2', 36, 700), OX + 110, POD + 1215, OZ - 152).rotation.y = Math.PI;
  const pl = add(ormar, natpis('', 130, 90, '#777', '#c9ccce'), OX - 170, POD + 1120, OZ - 151); pl.rotation.y = Math.PI;      /* natpisna pločica (prazna) */
  add(ormar, natpis('', 150, 150, '#1a3a7a', '#f2f2f2'), OX + 270, POD + 1150, OZ - 151).rotation.y = Math.PI;                  /* pločica za dizanje (prazna) */
  for (const y of [POD + 1430, POD + 90]) add(ormar, cyl(10, 8, M.crna, 12), OX - 300, y, OZ - 152).rotation.x = Math.PI / 2;  /* brave */
  reg('ormar', 'Električni ormar i glavna sklopka (straga)', ormar);

  /* ---------------------------------------------------------------- obradak (grupa na steznoj glavi) i oznake nultočaka */
  const obrGrupa = new THREE.Group(); glava.add(obrGrupa);
  function trokut(boja, d = 50) {
    const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: boja, depthTest: false });
    [[1, 0, 0], [0, 0, 1]].forEach((v, i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, d, 8), m); c.renderOrder = 5; c.position.set(v[0] * d / 2, 0, v[2] * d / 2); if (i === 0) c.rotation.z = Math.PI / 2; else c.rotation.x = Math.PI / 2; g.add(c); });
    const k = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), m); k.renderOrder = 5; g.add(k); return g;
  }
  const nulaM = trokut(0xff4d3a, 80); korijen.add(nulaM); nulaM.visible = false; nulaM.position.set(GEO.ZT0, 0, GEO.R0);
  const nulaW = trokut(0x2ecad4, 60); korijen.add(nulaW); nulaW.visible = false; nulaW.position.set(80, 0, 0);
  const nultocke = new THREE.Group(); korijen.add(nultocke);
  reg('nultocke', 'Nultočka stroja i nultočka obratka', nultocke, nulaM, nulaW);

  /* ---------------------------------------------------------------- zaslon privjeska */
  function zaslonTekst(ukljucen, nacin, osi) {
    const g = zasC.getContext('2d'); g.fillStyle = ukljucen ? '#0d1b26' : '#05080b'; g.fillRect(0, 0, 384, 288);
    if (ukljucen) {
      g.fillStyle = '#1f3b52'; g.fillRect(0, 0, 384, 26); g.fillStyle = '#e8f1f7'; g.font = '700 15px "IBM Plex Sans",Arial'; g.textAlign = 'left'; g.fillText(nacin || 'MEM', 10, 18);
      g.fillStyle = '#142a3a'; g.fillRect(8, 36, 220, 190); g.fillStyle = '#9fb3bb'; for (let i = 0; i < 10; i++) g.fillRect(16, 46 + i * 18, 60 + (i * 53) % 120, 6);
      g.fillStyle = '#0a1420'; g.fillRect(238, 36, 138, 80);
      ['X', 'Z'].forEach((o, i) => { g.fillStyle = '#cfd8dc'; g.font = '700 16px monospace'; g.textAlign = 'left'; g.fillText(o, 246, 62 + i * 30); g.fillStyle = '#3bff6e'; g.textAlign = 'right'; g.fillText(osi ? osi[i] : '0.000', 368, 62 + i * 30); });
      g.fillStyle = '#1f3b52'; g.fillRect(0, 262, 384, 26);
    }
    zasT.needsUpdate = true;
  }
  zaslonTekst(false);

  /* ---------------------------------------------------------------- položaj osi */
  function postaviOsi(X, Z) { suport.position.x = GEO.ZT0 + Z; poprecne.position.z = GEO.R0 + X / 2; }
  postaviOsi(0, 0);

  return {
    korijen, postolje, vreteniste, glava, suport, poprecne, nosac, alatG, konjic, kabina, vrata, privjesak, ormar, obrGrupa, nulaM, nulaW, dijelovi, M, GEO,
    klik: { estop, powerOn: gumbOn, powerOff: gumbOff, kotac, cycleStart: cs, sklopka }, svjetlo, lampa, zaslon, celjusti,
    postaviOsi, okreniGlavu, celjustiNa, postaviAlat, zaslonTekst, vrataNa, get kutGlave() { return kutGlave; },
    /* vrh alata u svijetu za koordinate stroja (X promjer, Z) */
    vrh: (X, Z) => new THREE.Vector3(GEO.ZT0 + Z, 0, GEO.R0 + X / 2)
  };
}
