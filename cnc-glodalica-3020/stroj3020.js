/* FORTRONIQ · Mala CNC glodalica 3020 — 3D model stroja (zajednički za „Upoznavanje stroja” i simulator Mach3).
   Mjere su približne (stroj nema natpisnu pločicu); hod X 300 × Y 200 × Z 55 mm je pretpostavka prema oznaci 3020.
   Koordinate: 1 jedinica = 1 mm. Okvir stola: x udesno, y prema natrag (os Y stroja), z gore; ishodište = sredina gornje plohe stola.
   U three.js: x = x, y = z (gore), z = −y (prema korisniku).  © ForTroniQ d.o.o. */

export const GEO = {
  HOD: { X: [0, 300], Y: [0, 200], Z: [-55, 0] },   /* hod osi (koordinate stroja; Z = 0 gore) — pretpostavka */
  XT0: -150, YT0: -100,                             /* položaj vrha alata u okviru stola kad su X = 0 i Y = 0 */
  TOOL_Z: 130,                                       /* os vretena u three.js (z) — portal je nepomičan */
  STOL: { L: 450, W: 280, H: 18 },                  /* stol s T-utorima — pretpostavka */
  A: { lice: -152, visina: 65, y: 0 },              /* 4. os: čelo čeljusti (x u okviru stola), visina osi iznad stola */
  R_ALATA: 1.5, ISTUR: 20                           /* glodalo Ø3, istak iz stezne čahure */
};

/* jednostavna okolina za odsjaje metala (bez vanjskih datoteka) */
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

export function napraviStroj3020(THREE, scene) {
  const dijelovi = new Map();
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o));
  /* tekstura navoja za vretena */
  const navoj = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#c9ced2'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#6f777d'; g.lineWidth = 10;
    for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 40); return t;
  })();
  const M = {
    alu: mat(0xc9cfd4, { metalness: 0.6, roughness: 0.42 }), aluT: mat(0x9aa2a8, { metalness: 0.55, roughness: 0.45 }),
    plava: mat(0x1f5fae, { metalness: 0.35, roughness: 0.42 }), crna: mat(0x23272b, { roughness: 0.6 }), crna2: mat(0x34393e, { roughness: 0.5 }),
    celik: mat(0xe1e5e8, { metalness: 0.85, roughness: 0.22 }), sivo: mat(0x8e979d, { metalness: 0.4 }), vreteno: mat(0xe4e7ea, { metalness: 0.8, roughness: 0.22 }),
    navoj: new THREE.MeshStandardMaterial({ map: navoj, metalness: 0.7, roughness: 0.3 }), utor: mat(0x3a4045), mdf: mat(0xb48a5a, { roughness: 0.85 }),
    crvena: mat(0xd2322a, { roughness: 0.45 }), zuta: mat(0xf2c21a), zelena: mat(0x1d9e4b), cijevP: mat(0x2c7fd6, { roughness: 0.35, transparent: true, opacity: 0.85 }),
    cijevC: mat(0x1b1d1f, { roughness: 0.4 }), radni: mat(0x7a6650, { roughness: 0.9 }), lcd: mat(0x0d1a12, { emissive: 0x000000 }),
    plavaKut: mat(0x355f8c, { metalness: 0.4, roughness: 0.4 }), mjed: mat(0xc8a24a, { metalness: 0.8, roughness: 0.3 }), glodalo: mat(0xf0f2f4, { metalness: 0.95, roughness: 0.12 })
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
  /* koračni motor NEMA 23 (57 × 57 × 76 mm); smjer osi: 'x', 'y', 'z' (three) */
  function nema(p, smjer, x, y, z, duz = 76) {
    const g = new THREE.Group(); add(p, g, x, y, z);
    add(g, box(57, duz - 16, 57, M.crna), 0, 0, 0);
    add(g, box(57, 8, 57, M.sivo), 0, duz / 2 - 4, 0); add(g, box(57, 8, 57, M.sivo), 0, -duz / 2 + 4, 0);
    add(g, cyl(19, 2, M.sivo), 0, duz / 2 + 1, 0); add(g, cyl(4.2, 20, M.celik, 12), 0, duz / 2 + 10, 0);
    for (const [a, b] of [[23.5, 23.5], [-23.5, 23.5], [23.5, -23.5], [-23.5, -23.5]]) add(g, cyl(2.6, 3, M.celik, 8), a, -duz / 2 - 1, b);
    add(g, box(14, 10, 10, M.crna2), 0, -duz / 2 + 14, 30);
    if (smjer === 'x') g.rotation.z = -Math.PI / 2; if (smjer === '-x') g.rotation.z = Math.PI / 2;
    if (smjer === 'z') g.rotation.x = Math.PI / 2; if (smjer === '-z') g.rotation.x = -Math.PI / 2;
    if (smjer === '-y') g.rotation.x = Math.PI;
    return g;
  }
  function natpis(tekst, w, h, boja = '#e8eef1', poz = '#23272b', vel = 30) {
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w); const g = c.getContext('2d');
    g.fillStyle = poz; g.fillRect(0, 0, c.width, c.height); g.fillStyle = boja; g.font = '600 ' + vel + 'px "IBM Plex Sans",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    tekst.split('\n').forEach((t, i, a) => g.fillText(t, c.width / 2, c.height / 2 + (i - (a.length - 1) / 2) * vel * 1.15));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })); return m;
  }

  const korijen = new THREE.Group(); scene.add(korijen);
  const TZ = GEO.TOOL_Z;

  /* ---------------------------------------------------------------- radni stol (podloga) */
  const podloga = add(korijen, box(1500, 30, 900, M.radni), 140, -133, 120); podloga.userData.dio = 'podloga';

  /* ---------------------------------------------------------------- okvir (postolje) */
  const okvir = new THREE.Group(); korijen.add(okvir);
  const zC = TZ, zL = 500;
  for (const sx of [-1, 1]) {
    add(okvir, box(40, 60, zL, M.alu), sx * 222, -70, zC);                    /* uzdužni profil 40 × 60 */
    add(okvir, box(4, 8, zL, M.utor), sx * 243, -70, zC);
    add(okvir, box(4, 8, zL, M.utor), sx * 201, -70, zC);
    for (const sz of [-1, 1]) add(okvir, cyl(14, 18, M.crna2, 16), sx * 222, -109, zC + sz * 230);   /* nožice */
  }
  add(okvir, box(484, 60, 14, M.plava), 0, -70, zC - zL / 2 - 7);              /* stražnja ploča */
  add(okvir, box(484, 60, 14, M.plava), 0, -70, zC + zL / 2 + 7);              /* prednja ploča */
  add(okvir, box(484, 6, 70, M.crna), 0, -97, zC - zL / 2 + 40);
  /* vodilice osi Y (okrugle Ø16 na nosačima) */
  const osY = new THREE.Group(); korijen.add(osY);
  add(okvir, box(484, 6, zL, M.crna2), 0, -97, zC);
  for (const sx of [-1, 1]) {
    add(osY, box(30, 54, zL - 20, M.aluT), sx * 150, -67, zC);
    cylZ(osY, 8, zL - 24, M.celik, sx * 150, -32, zC, 20);
  }
  reg('okvir', 'Okvir (postolje)', okvir);

  /* ---------------------------------------------------------------- portal (nepomičan) */
  const portal = new THREE.Group(); korijen.add(portal);
  const strana = new THREE.Shape(); strana.moveTo(-100, -100); strana.lineTo(70, -100); strana.lineTo(45, 340); strana.lineTo(-75, 340); strana.lineTo(-100, -100);
  for (const sx of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(strana, { depth: 15, bevelEnabled: false }), M.plava);
    g.rotation.y = Math.PI / 2; g.position.set(sx > 0 ? 245 : -260, 0, 0); portal.add(g);
    /* three: ExtrudeGeometry u ravnini XY oblika, zakret oko y → oblik x → −z; y ostaje y */
  }
  add(portal, box(500, 160, 40, M.alu), 0, 232, -10);                           /* greda X */
  for (const yy of [190, 274]) add(portal, box(500, 5, 3, M.utor), 0, yy, 11);
  for (const yy of [180, 285]) { add(portal, box(500, 12, 10, M.aluT), 0, yy, 14); cylX(portal, 8, 500, M.celik, 0, yy, 24, 20); }
  const motorX = nema(portal, '-x', 260 + 15 + 46, 232, 24); reg('motori', 'Koračni motori NEMA 23', motorX);
  add(portal, box(14, 70, 70, M.crna), 267, 232, 24);
  add(portal, box(440, 4, 44, M.aluT), 0, 314, -10);                            /* nosač lanca za kabele */
  for (let i = 0; i < 22; i++) add(portal, box(16, 16, 34, M.crna2), -200 + i * 19, 324, -10);
  reg('portal', 'Portal i os X', portal);

  /* nosač osi X (klizi po gredi) */
  const nosacX = new THREE.Group(); korijen.add(nosacX);
  for (const yy of [180, 285]) for (const sx of [-1, 1]) add(nosacX, box(40, 26, 22, M.crna2), sx * 38, yy, 26);
  add(nosacX, box(140, 200, 14, M.plava), 0, 235, 41);
  add(nosacX, box(36, 26, 26, M.mjed), 0, 232, 30);                             /* matica vretena X */
  for (const sx of [-1, 1]) add(nosacX, box(22, 200, 14, M.aluT), sx * 46, 235, 55);
  const zr1 = add(nosacX, cyl(6, 200, M.celik, 16), -46, 235, 62), zr2 = add(nosacX, cyl(6, 200, M.celik, 16), 46, 235, 62);
  add(nosacX, box(140, 14, 70, M.plava), 0, 342, 70);                           /* gornja ploča osi Z */
  add(nosacX, box(140, 14, 70, M.plava), 0, 128, 70);
  const motorZ = nema(nosacX, '-y', 0, 349 + 38, 74); reg('motori', 'Koračni motori NEMA 23', motorZ);
  reg('portal', 'Portal i os X', nosacX);

  /* os Z: klizna ploča, obujmica vretena */
  const glavaZ = new THREE.Group(); nosacX.add(glavaZ);
  for (const yy of [190, 270]) for (const sx of [-1, 1]) add(glavaZ, box(26, 30, 18, M.crna2), sx * 46, yy, 66);
  add(glavaZ, box(120, 170, 10, M.alu), 0, 230, 80);
  add(glavaZ, box(30, 22, 18, M.mjed), 0, 300, 72);                            /* matica vretena Z */
  add(glavaZ, box(100, 50, 14, M.alu), 0, 200, 92);
  const obujmica = add(glavaZ, cyl(42, 52, M.alu, 36), 0, 200, TZ); obujmica.userData.obujmica = true;
  add(glavaZ, box(3, 52, 10, M.utor), 0, 200, TZ + 40);
  add(glavaZ, box(26, 44, 10, M.alu), 0, 200, TZ + 46);
  for (const yy of [188, 212]) cylX(glavaZ, 3.2, 34, M.crna, 0, yy, TZ + 47, 8);
  reg('osZ', 'Os Z (vertikalno gibanje vretena)', glavaZ, zr1, zr2);

  /* vreteno (vodeno hlađeno Ø65, 800 W) — vrh alata je u ishodištu grupe */
  const vreteno = new THREE.Group(); glavaZ.add(vreteno); vreteno.position.set(0, 60, TZ);
  add(vreteno, cyl(32.5, 180, M.vreteno, 40), 0, 25 + 90, 0);
  for (const yy of [60, 150]) add(vreteno, cyl(33.2, 3, M.aluT, 40), 0, yy, 0);
  add(vreteno, cyl(30, 12, M.crna, 32), 0, 211, 0);
  add(vreteno, cyl(9, 22, M.crna2, 16), 18, 228, 0);                             /* utikač napajanja */
  add(vreteno, cyl(20, 8, M.vreteno, 28), 0, 21, 0);
  const matica = add(vreteno, cyl(10, 11, M.celik, 6), 0, 12, 0);              /* matica ER11 */
  for (const sx of [-1, 1]) { const n = cylZ(vreteno, 3.5, 14, M.mjed, sx * 12, 196, -32 - 6, 10); void n; }
  /* cijevi za vodu i kabel */
  const cijev = (tocke, m, r) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tocke.map((p) => new THREE.Vector3(...p))), 40, r, 10, false), m);
  vreteno.add(cijev([[-12, 196, -45], [-14, 200, -62], [-14, 250, -66], [-12, 300, -90], [-8, 330, -125]], M.cijevP, 4.5));
  vreteno.add(cijev([[12, 196, -45], [14, 200, -60], [14, 252, -64], [12, 300, -88], [8, 330, -122]], M.cijevP, 4.5));
  vreteno.add(cijev([[18, 238, 0], [20, 270, -12], [10, 310, -70], [0, 334, -128]], M.cijevC, 4));
  /* alat */
  const alatG = new THREE.Group(); vreteno.add(alatG);
  add(alatG, cyl(1.59, 22, M.celik, 16), 0, 12 + 11 - 4, 0);
  add(alatG, cyl(GEO.R_ALATA, 10, M.glodalo, 16), 0, 5, 0);
  for (let i = 0; i < 4; i++) { const s = add(alatG, box(0.6, 3.2, 3.15, M.sivo), 0, 1.6 + i * 2.2, 0); s.rotation.y = i * 0.9; }
  reg('vreteno', 'Vreteno i alat', vreteno);

  /* ---------------------------------------------------------------- stol (giba se po Y) */
  const stol = new THREE.Group(); korijen.add(stol);
  const S = GEO.STOL;
  add(stol, box(S.L, 8, S.W, M.alu), 0, -S.H + 4, 0);
  const utori = [-100, -50, 0, 50, 100];
  { const rub = [-S.W / 2, ...utori.flatMap((u) => [u - 4, u + 4]), S.W / 2];
    for (let k = 0; k < rub.length; k += 2) { const a = rub[k], b = rub[k + 1]; add(stol, box(S.L, 10, b - a, M.alu), 0, -5, -(a + b) / 2); }
    utori.forEach((u) => { add(stol, box(S.L, 1, 14, M.utor), 0, -9.5, -u); }); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(stol, box(46, 22, 50, M.crna2), sx * 150, -29, sz * 95);
  add(stol, box(40, 24, 34, M.mjed), 0, -30, 0);                                /* matica vretena Y */
  reg('stol', 'Stol s T-utorima i os Y', stol, osY);

  /* navojna vretena */
  const vrY = cylZ(korijen, 8, zL - 30, M.navoj, 0, -32, zC, 18);
  const vrX = cylX(portal, 8, 490, M.navoj, 0, 232, 24, 18);
  const vrZ = add(nosacX, cyl(6, 200, M.navoj, 16), 0, 235, 70);
  add(korijen, box(60, 60, 12, M.crna), 0, -40, zC - zL / 2 - 20);
  const motorY = nema(korijen, 'z', 0, -40, zC - zL / 2 - 26 - 38); reg('motori', 'Koračni motori NEMA 23', motorY);
  reg('vretena', 'Navojna vretena osi X, Y i Z', vrX, vrY, vrZ);

  /* ---------------------------------------------------------------- 4. os A i konjić (na stolu, lijevo) */
  const A = GEO.A; const hA = A.visina;
  const osAtijelo = new THREE.Group(); add(stol, osAtijelo, 0, 0, 0);
  add(osAtijelo, box(70, 12, 110, M.crna2), A.lice - 58, 6, 0);                     /* podnožje */
  add(osAtijelo, box(40, hA + 34, 96, M.crna), A.lice - 58, (hA + 34) / 2 + 12, 0);  /* kućište ležaja i remena */
  const motorA = nema(osAtijelo, 'x', A.lice - 78 - 38 - 2, 40, 0); reg('motori', 'Koračni motori NEMA 23', motorA);
  const osA = new THREE.Group(); add(stol, osA, A.lice, hA, -A.y);              /* okreće se oko x */
  const glavaA = new THREE.Group(); osA.add(glavaA);
  cylX(glavaA, 40, 26, M.sivo, -27, 0, 0, 40);
  cylX(glavaA, 34, 4, M.aluT, -13, 0, 0, 40);
  for (let i = 0; i < 3; i++) {                                                  /* tri čeljusti */
    const k = new THREE.Group(); glavaA.add(k); k.rotation.x = i * 2 * Math.PI / 3;
    add(k, box(14, 16, 14, M.celik), -7.5, 28, 0); add(k, box(14, 6, 18, M.celik), -7.5, 39, 0);
  }
  add(osAtijelo, box(4, 8, 4, M.crvena), A.lice - 36, hA + 44, 0);               /* oznaka A0 na kućištu */
  const obrA = new THREE.Group(); osA.add(obrA);
  reg('osA', '4. os A (okretna stezna glava)', osAtijelo, osA);

  const konjic = new THREE.Group(); stol.add(konjic);                           /* ishodište = vrh šiljka */
  add(konjic, box(80, 12, 90, M.crna2), 48, -hA + 6, 0);
  add(konjic, box(60, hA - 16, 50, M.plava), 50, -(hA - 12) / 2 - 2, 0);
  cylX(konjic, 22, 60, M.plava, 50, 0, 0, 28);
  cylX(konjic, 6, 20, M.celik, 88, 0, 0, 12);
  { const k = add(konjic, new THREE.Mesh(new THREE.TorusGeometry(24, 3, 8, 28), M.celik), 98, 0, 0); k.rotation.y = Math.PI / 2; }
  for (let i = 0; i < 3; i++) { const sp = add(konjic, cyl(1.6, 46, M.celik, 6), 98, 0, 0); sp.rotation.x = i * Math.PI / 3; }
  cylX(konjic, 11, 36, M.celik, 30, 0, 0, 20);
  { const s = add(konjic, cyl(9, 14, M.celik, 20, 0.5), 7, 0, 0); s.rotation.z = Math.PI / 2; }
  { const r = add(konjic, cyl(2.5, 30, M.celik, 10), 30, 30, 0); r.rotation.x = 0.3; add(konjic, cyl(5, 10, M.crvena, 14), 30, 44, -4); }
  reg('konjic', 'Konjić', konjic);

  /* ---------------------------------------------------------------- škripac i stezne pandže */
  const skripac = new THREE.Group(); stol.add(skripac);
  const pandze = new THREE.Group(); stol.add(pandze);
  const obrGrupa = new THREE.Group(); stol.add(obrGrupa);
  const pribor = { skripac: null, pandze: null };
  function isprazni(g) { while (g.children.length) { const c = g.children.pop(); c.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); } }
  /* bušilični škripac: čeljusti paralelne s X (širina 100 mm), otvor po Y do 60 mm; pripremak na podlošcima */
  function skripacZa(L, W, H, xc = 0, yc = 0) {
    isprazni(skripac); isprazni(pandze); skripac.visible = true; pandze.visible = false;
    const cel = 19, bot = 27, zc = -yc;                                            /* bot = donja ploha pripremka (podlošci) */
    const Lt = 150, sir = Math.max(W, 20);
    add(skripac, box(Lt, 8, 150, M.plavaKut), xc, 4, zc - 8);                      /* podnožje s utorima za vijke */
    add(skripac, box(Lt - 30, 12, 130, M.plavaKut), xc, 14, zc - 8);
    for (const sx of [-1, 1]) add(skripac, box(14, 4, 30, M.utor), xc + sx * 62, 8.5, zc - 8);
    const nep = add(skripac, box(110, 39 - 20, 22, M.plavaKut), xc, 20 + 9.5, zc - sir / 2 - 11);            /* nepomična čeljust (straga) */
    add(skripac, box(104, 12, 3, M.celik), xc, 33, zc - sir / 2 - 1.5);
    add(skripac, box(110, 39 - 20, 22, M.plavaKut), xc, 20 + 9.5, zc + sir / 2 + 11);                       /* pomična čeljust (sprijeda) */
    add(skripac, box(104, 12, 3, M.celik), xc, 33, zc + sir / 2 + 1.5);
    add(skripac, box(110, 30, 14, M.plavaKut), xc, 20, zc - sir / 2 - 30);
    cylZ(skripac, 7, 70, M.celik, xc, 22, zc + sir / 2 + 50, 16);                   /* vreteno škripca */
    cylX(skripac, 3, 70, M.celik, xc, 22, zc + sir / 2 + 84, 10);                   /* ručica */
    for (const sx of [-1, 1]) add(skripac, cyl(5, 8, M.crvena, 14), xc + sx * 35, 22, zc + sir / 2 + 84).rotation.z = Math.PI / 2;
    for (const sz of [-1, 1]) add(skripac, box(Math.min(L, 100), bot - 20, 5, M.celik), xc, 20 + (bot - 20) / 2, zc + sz * (W / 2 - 4));   /* podlošci */
    void nep; void cel;
    pribor.skripac = { celjusti: [
      { x0: xc - 55, x1: xc + 55, y0: yc + sir / 2, y1: yc + sir / 2 + 22, z0: 20, z1: 39 },
      { x0: xc - 55, x1: xc + 55, y0: yc - sir / 2 - 22, y1: yc - sir / 2, z0: 20, z1: 39 }], dno: 20, bot };
    skripac.traverse((m) => { if (m.isMesh) m.userData.dio = 'skripac'; });
    return { x0: xc - L / 2, y0: yc - W / 2, bot, top: bot + H };
  }
  /* podložna MDF ploča 8 mm i četiri stezne pandže na T-utorima */
  function pandzeZa(L, W, H, xc = 0, yc = 0) {
    isprazni(skripac); isprazni(pandze); skripac.visible = false; pandze.visible = true;
    const D = 8, zc = -yc;
    add(pandze, box(Math.min(L + 40, S.L - 10), D, Math.min(W + 40, S.W - 6), M.mdf), xc, D / 2, zc);
    const top = D + H;
    const tocke = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    tocke.forEach(([sx, sy]) => {
      const x = xc + sx * (L / 2 - 18), y = yc + sy * (W / 2 + 2);
      const g = new THREE.Group(); add(pandze, g, x, 0, -y);
      add(g, box(20, top - 2, 16, M.crna2), 0, (top - 2) / 2, -sy * 30);          /* stepenasti blok */
      const st = add(g, box(16, 8, 62, M.celik), 0, top + 4, -sy * 10);            /* stezna letva */
      st.rotation.x = sy * 0.04;
      add(g, cyl(4, top + 22, M.celik, 10), 0, (top + 22) / 2 - 2, -sy * 12);
      add(g, cyl(7, 6, M.crna, 6), 0, top + 11, -sy * 12);                       /* matica */
    });
    pribor.pandze = { D, top };
    pandze.traverse((m) => { if (m.isMesh) m.userData.dio = 'pandze'; });
    return { x0: xc - L / 2, y0: yc - W / 2, bot: D, top };
  }
  function bezPribora() { isprazni(skripac); isprazni(pandze); skripac.visible = pandze.visible = false; pribor.skripac = pribor.pandze = null; }
  reg('skripac', 'Bušilični škripac', skripac);
  reg('pandze', 'Stezne pandže i podložna ploča', pandze);

  /* ---------------------------------------------------------------- upravljačka kutija, pretvarač, računalo */
  const upravljanje = new THREE.Group(); add(korijen, upravljanje, 470, -118, 230);
  add(upravljanje, box(230, 150, 250, M.crna), 0, 75, 0);
  add(upravljanje, box(232, 4, 252, M.plava), 0, 150, 0);
  add(upravljanje, natpis('POWER', 60, 14, '#cfd8dc', '#23272b', 44), -70, 122, 125.6);
  add(upravljanje, natpis('E-STOP', 70, 14, '#f2c21a', '#23272b', 44), 50, 122, 125.6);
  add(upravljanje, natpis('USB', 40, 12, '#cfd8dc', '#23272b', 50), -70, 52, 125.6);
  const sklopka = add(upravljanje, box(24, 34, 10, M.crvena), -70, 92, 128); sklopka.userData.klik = 'sklopka';
  const gljivaPod = add(upravljanje, cyl(30, 6, M.zuta, 28), 50, 88, 127); gljivaPod.rotation.x = Math.PI / 2;
  const gljiva = add(upravljanje, cyl(24, 16, M.crvena, 28, 20), 50, 88, 138); gljiva.rotation.x = Math.PI / 2; gljiva.userData.klik = 'gljiva';
  const usbUt = add(upravljanje, box(16, 8, 4, M.crna2), -70, 36, 126);
  const svj = add(upravljanje, cyl(5, 4, mat(0x2a2a2a, { emissive: 0x000000 }), 12), -70, 140, 127); svj.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) add(upravljanje, box(2, 60, 120, M.crna2), -116, 80, -40 + i * 2 - 6 + i * 14);
  const kabel = (tocke, r = 3, m = M.cijevC) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tocke.map((p) => new THREE.Vector3(...p))), 50, r, 8, false), m);
  korijen.add(kabel([[400, -82, 357], [400, -105, 380], [450, -113, 420], [600, -114, 420], [680, -112, 380]], 2.4));          /* USB */
  korijen.add(kabel([[355, -60, 200], [300, -100, 180], [260, -110, 100], [200, -105, -140], [0, -80, -230]], 5));             /* motorni kabeli */
  const racunalo = new THREE.Group(); add(korijen, racunalo, 780, -118, 330); racunalo.rotation.y = -0.55;
  add(racunalo, box(300, 14, 210, M.crna2), 0, 7, 0);
  const ekran = add(racunalo, box(300, 200, 8, M.crna), 0, 112, -100); ekran.rotation.x = -0.18;
  const zasC = document.createElement('canvas'); zasC.width = 320; zasC.height = 200; const zasT = new THREE.CanvasTexture(zasC);
  const zaslon = add(racunalo, new THREE.Mesh(new THREE.PlaneGeometry(282, 180), new THREE.MeshBasicMaterial({ map: zasT })), 0, 112, -95.2); zaslon.rotation.x = -0.18;
  reg('upravljanje', 'Upravljačka kutija, USB i računalo', upravljanje, racunalo, usbUt);

  const pretvarac = new THREE.Group(); add(korijen, pretvarac, 470, -118, -10);
  add(pretvarac, box(120, 190, 140, mat(0x3c4247)), 0, 95, 0);
  add(pretvarac, box(110, 60, 2, M.crna), 0, 150, 71);
  const lcdC = document.createElement('canvas'); lcdC.width = 256; lcdC.height = 96; const lcdT = new THREE.CanvasTexture(lcdC);
  const lcd = add(pretvarac, new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshBasicMaterial({ map: lcdT })), 0, 158, 72.2);
  const pot = add(pretvarac, cyl(11, 10, M.crna2, 20), -25, 115, 76); pot.rotation.x = Math.PI / 2;
  const potOz = add(pretvarac, box(2, 9, 2, M.zuta), -25, 120, 82);
  const run = add(pretvarac, box(16, 10, 4, M.zelena), 18, 120, 72); const stop = add(pretvarac, box(16, 10, 4, M.crvena), 38, 120, 72);
  const prek = add(pretvarac, box(26, 12, 6, M.crna2), 0, 80, 72);
  add(pretvarac, natpis('PC   RUČNO', 60, 10, '#cfd8dc', '#3c4247', 30), 0, 94, 71.2);
  for (let i = 0; i < 9; i++) add(pretvarac, box(118, 2, 2, M.crna), 0, 20 + i * 6, 71);
  korijen.add(kabel([[430, -40, -10], [330, -70, -90], [290, 40, -120], [250, 250, -60], [215, 324, -12]], 4.2));                   /* kabel vretena */
  reg('pretvarac', 'Pretvarač frekvencije 0,75 kW', pretvarac);
  function zaslonTekst(ukljucen, osi) {
    const g = zasC.getContext('2d'); g.fillStyle = ukljucen ? '#5d6f80' : '#05080b'; g.fillRect(0, 0, 320, 200);
    if (ukljucen) {
      g.fillStyle = '#f1f3f5'; g.fillRect(8, 8, 150, 184); g.fillStyle = '#9aa7b0'; for (let i = 0; i < 12; i++) g.fillRect(14, 16 + i * 14, 60 + (i * 37) % 80, 6);
      g.fillStyle = '#ffd24a'; g.fillRect(12, 44, 142, 12);
      ['X', 'Y', 'Z', 'A'].forEach((o, i) => { g.fillStyle = '#0b0f12'; g.fillRect(170, 12 + i * 34, 140, 28); g.fillStyle = '#3bff6e'; g.font = '700 20px monospace'; g.textAlign = 'right'; g.fillText(osi ? osi[i] : '+0.0000', 304, 33 + i * 34); g.textAlign = 'left'; g.fillStyle = '#cfd8dc'; g.fillText(o, 174, 33 + i * 34); });
      g.fillStyle = '#2f9e44'; g.fillRect(170, 160, 66, 30); g.fillStyle = '#c92a2a'; g.fillRect(244, 160, 66, 30);
    }
    zasT.needsUpdate = true;
  }
  zaslonTekst(false);
  function lcdTekst(t, ziv) {
    const g = lcdC.getContext('2d'); g.fillStyle = ziv ? '#0e2a18' : '#0a0f0c'; g.fillRect(0, 0, 256, 96);
    if (ziv) { g.fillStyle = '#4dff8a'; g.font = '700 54px "IBM Plex Mono",monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(t, 240, 52); }
    lcdT.needsUpdate = true;
  }
  lcdTekst('', false);

  /* ---------------------------------------------------------------- oznake nultočaka */
  const nultocke = new THREE.Group(); korijen.add(nultocke); nultocke.visible = false;
  function trokut(boja, d = 50) {
    const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: boja, depthTest: false });
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]].forEach((v, i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, d, 8), m); c.renderOrder = 5; c.position.set(v[0] * d / 2, v[1] * d / 2, v[2] * d / 2); if (i === 0) c.rotation.z = Math.PI / 2; if (i === 1) c.rotation.x = Math.PI / 2; g.add(c); });
    const k = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), m); k.renderOrder = 5; g.add(k); return g;
  }
  const nulaM = trokut(0xff4d3a, 60); stol.add(nulaM); nulaM.visible = false;
  const nulaW = trokut(0x2ecad4, 45); stol.add(nulaW); nulaW.visible = false;
  reg('nultocke', 'Nultočka stroja i nultočka obratka', nultocke, nulaW);

  /* ---------------------------------------------------------------- položaj osi */
  let Ztop = 60;
  /* vreteno je stegnuto u obujmici tako da je vrh alata pri Z = 0 na visini Ztop iznad stola */
  function postaviZtop(h) { Ztop = h; vreteno.position.y = h; nulaM.position.set(GEO.XT0, h, -GEO.YT0); }
  function postaviOsi(X, Y, Z, Agr) {
    nosacX.position.x = X + GEO.XT0;
    glavaZ.position.y = Z;
    stol.position.z = TZ + GEO.YT0 + Y;           /* alat je u okviru stola na y = Y + YT0 */
    osA.rotation.x = (Agr || 0) * Math.PI / 180;
  }
  /* vreteno je u obujmici; visina vrha alata nad stolom pri Z = 0 je Ztop (podešava se prema pripremku) */
  function vrhNadStolom(Z) { return Z + Ztop; }
  postaviZtop(60);
  function okreniAlat(kut) { alatG.rotation.y = kut; matica.rotation.y = kut; }
  function konjicNa(x) { konjic.position.set(x, hA, -A.y); }
  konjicNa(165);
  postaviOsi(150, 100, 0, 0);

  return {
    korijen, okvir, stol, portal, nosacX, glavaZ, vreteno, alatG, skripac, pandze, osA, obrA, konjic, obrGrupa, pretvarac, upravljanje, racunalo,
    nultocke, nulaM, nulaW, dijelovi, M, GEO,
    klik: { sklopka, gljiva }, svjetlo: svj, zaslon, potOz, pribor,
    postaviOsi, postaviZtop, get Ztop() { return Ztop; }, vrhNadStolom, okreniAlat, konjicNa, skripacZa, pandzeZa, bezPribora, lcdTekst, zaslonTekst,
    /* položaj točke iz okvira stola u three.js (lokalno u grupi stola) */
    uStol: (x, y, z) => new THREE.Vector3(x, z, -y)
  };
}
