/* FORTRONIQ · Mala CNC glodalica 3020 — 3D model stroja (zajednički za „Upoznavanje stroja” i simulator Mach3).
   v05 (1. 11. 2026.) prema fotografijama i videu vlasnika: aluminijski stol s T-utorima MIRUJE, a giba se cijeli portal (os X)
   s nosačem osi Y i osi Z. Oznaka na gredi portala: X prema operateru, Y udesno, Z gore (pravilo desne ruke).
   Hod X 300 × Y 200 × Z 55 mm (vlasnik). Stezna glava (4. os A) i konjić leže uzduž osi X (dulja os); os A okreće se oko X.
   Koordinate okvira stola (u mm): x = smjer osi X stroja (prema operateru), y = smjer osi Y (udesno), z gore; ishodište = sredina gornje plohe stola.
   U three.js grupa „masina” ima x = X, y = z (gore), z = −Y, a zakrenuta je tako da X ide prema gledatelju, a Y udesno.  © ForTroniQ d.o.o. */

export const GEO = {
  HOD: { X: [0, 300], Y: [0, 200], Z: [-55, 0] },   /* hod osi (koordinate stroja; Z = 0 gore) — vlasnik */
  XT0: -110, YT0: -100,                             /* vrh alata u okviru stola kad su X = 0 i Y = 0: straga lijevo */
  TOOL_Z: 105,                                       /* os vretena je 105 mm ispred sredine grede portala (prema +X) */
  STOL: { L: 460, W: 290, H: 18 },                  /* stol: L po X (dulja os), W po Y — procjena s fotografija */
  A: { lice: -30, visina: 65, y: -55 },             /* 4. os: čelo čeljusti (x), visina osi iznad stola, položaj osi po Y (lijevo) */
  KONJIC_PARK: 95,                                   /* vrh konjića kad u steznoj glavi nema valjka */
  SKRIPAC: { x: 30, y: 70 },                         /* škripac desno od 4. osi; vreteno strši preko desnog ruba stola */
  PRIBOR_Y: 70,                                      /* (zadržano za starije pozive) */
  PANDZE: { x: 0, y: 0 },                            /* ploče na pandžama: sredina stola (4. os i škripac se tada skidaju) */
  R_ALATA: 1.5, ISTUR: 20                           /* glodalo Ø3, istak iz stezne čahure */
};

/* jednostavna okolina za odsjaje metala (bez vanjskih datoteka) */
export function postaviOkolinu(THREE, renderer, scene) {
  const env = new THREE.Scene();
  const g = new THREE.SphereGeometry(100, 96, 48); const c = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 100, az = Math.atan2(p.getZ(i), p.getX(i));
    let k = y > 0.15 ? 0.85 + 0.15 * y : (y > -0.05 ? 0.12 : 0.55 + 0.2 * (1 + y));               /* svijetli strop, tamni obzor, svijetli stolovi */
    if (y < 0.6) k *= 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(5 * az), 3);       /* okomite pruge (prozori, zidovi) za odsjaj kroma */
    c.push(k, k * 1.01, k * 1.03); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const svj = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [x, y, z] of [[0, 90, 0], [60, 60, -40], [-70, 50, 30], [85, 20, 30], [-80, 25, -45], [10, 30, 92]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(46, 4, 18), svj); b.position.set(x, y, z); b.lookAt(0, 0, 0); env.add(b); }
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.03).texture; pm.dispose();
}

/* kvalitetniji prikaz: ACES ton, meke sjene, ključno + pomoćno + odbijeno svjetlo */
export function postaviRender(THREE, renderer, scene, korijen) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xfdfcf8, 0x8a8f96, 0.9));
  const kljucno = new THREE.DirectionalLight(0xfff6e8, 2.1); kljucno.position.set(-500, 1200, 900); kljucno.castShadow = true;
  kljucno.shadow.mapSize.set(2048, 2048); Object.assign(kljucno.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 200, far: 3200 }); kljucno.shadow.camera.updateProjectionMatrix();
  kljucno.shadow.bias = -0.0004; kljucno.shadow.normalBias = 0.6; scene.add(kljucno); scene.add(kljucno.target);
  const pomocno = new THREE.DirectionalLight(0xe8f0ff, 0.55); pomocno.position.set(900, 500, -400); scene.add(pomocno);
  const straga = new THREE.DirectionalLight(0xffffff, 0.35); straga.position.set(0, 400, -1200); scene.add(straga);
  korijen.userData.renderer = renderer;
  korijen.traverse((m) => { if (m.isMesh && !(m.material && m.material.isMeshBasicMaterial)) { m.castShadow = true; m.receiveShadow = true; } });
}

export function napraviStroj3020(THREE, scene) {
  const dijelovi = new Map();
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o));
  const navoj = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#c9ced2'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#6f777d'; g.lineWidth = 10;
    for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 40); return t;
  })();
  const M = {
    alu: mat(0xc3c9ce, { metalness: 0.7, roughness: 0.38 }), aluT: mat(0x9aa2a8, { metalness: 0.6, roughness: 0.42 }),
    bez: mat(0xccc7ad, { metalness: 0.05, roughness: 0.72 }), bezT: mat(0xb4ae94, { metalness: 0.05, roughness: 0.75 }),
    plava: mat(0xd2ccb4, { metalness: 0.08, roughness: 0.62 }),
    crna: mat(0x23272b, { roughness: 0.6 }), crna2: mat(0x34393e, { roughness: 0.5 }),
    celik: mat(0xe1e5e8, { metalness: 0.85, roughness: 0.22 }), sivo: mat(0x8e979d, { metalness: 0.4 }), vreteno: mat(0xf4f6f8, { metalness: 1, roughness: 0.07, envMapIntensity: 1.35 }),
    navoj: new THREE.MeshStandardMaterial({ map: navoj, metalness: 0.7, roughness: 0.3 }), utor: mat(0x3a4045), mdf: mat(0xb48a5a, { roughness: 0.85 }),
    crvena: mat(0xd2322a, { roughness: 0.45 }), zuta: mat(0xf2c21a), zelena: mat(0x1d9e4b), plavi: mat(0x2f78c4, { roughness: 0.4 }),
    cijevP: mat(0xc9a46a, { roughness: 0.35, transparent: true, opacity: 0.85 }), cijevC: mat(0x1b1d1f, { roughness: 0.4 }), radni: mat(0xe8e8e4, { roughness: 0.9 }),
    plavaKut: mat(0x355f8c, { metalness: 0.4, roughness: 0.4 }), mjed: mat(0xc8a24a, { metalness: 0.8, roughness: 0.3 }), glodalo: mat(0xf0f2f4, { metalness: 0.95, roughness: 0.12 }),
    glava: mat(0x5c5046, { metalness: 0.55, roughness: 0.5 })
  };
  /* kvadar sa zaobljenim bridovima (izgled lima i odljevaka); vrlo tanki ostaju oštri */
  function rgeo(w, h, d, b) {
    const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b, r = Math.min(b * 1.2, x, y) * 0.9;
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 3 });
    g.translate(0, 0, -(d - 2 * b) / 2); return g;
  }
  const box = (w, h, d, m) => { const mi = Math.min(w, h, d); return new THREE.Mesh(mi >= 6 ? rgeo(w, h, d, Math.min(1.6, mi * 0.18)) : new THREE.BoxGeometry(w, h, d), m); };
  const cyl = (r, h, m, s = 28, r2) => new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, h, s), m);
  function add(p, o, x, y, z) { o.position.set(x, y, z); p.add(o); return o; }
  const cylX = (p, r, L, m, x, y, z, s) => { const c = add(p, cyl(r, L, m, s), x, y, z); c.rotation.z = Math.PI / 2; return c; };
  const cylZ = (p, r, L, m, x, y, z, s) => { const c = add(p, cyl(r, L, m, s), x, y, z); c.rotation.x = Math.PI / 2; return c; };
  function reg(id, naziv, ...obj) {
    if (!dijelovi.has(id)) dijelovi.set(id, { naziv, objekti: [] });
    const d = dijelovi.get(id);
    obj.forEach((o) => { d.objekti.push(o); o.traverse((m) => { if (m.isMesh && !m.userData.dio) m.userData.dio = id; }); });
  }
  /* koračni motor NEMA 23 (57 × 57 × 76 mm); smjer osi: 'x', '-x', 'z', '-z', 'y', '-y' */
  function nema(p, smjer, x, y, z, duz = 76) {
    const g = new THREE.Group(); add(p, g, x, y, z);
    add(g, box(57, duz - 16, 57, M.crna), 0, 0, 0);
    add(g, box(57, 8, 57, M.sivo), 0, duz / 2 - 4, 0); add(g, box(57, 8, 57, M.sivo), 0, -duz / 2 + 4, 0);
    add(g, cyl(19, 2, M.sivo), 0, duz / 2 + 1, 0); add(g, cyl(4.2, 20, M.celik, 12), 0, duz / 2 + 10, 0);
    add(g, box(14, 10, 10, M.crna2), 0, -duz / 2 + 14, 30);
    if (smjer === 'x') g.rotation.z = -Math.PI / 2; if (smjer === '-x') g.rotation.z = Math.PI / 2;
    if (smjer === 'z') g.rotation.x = Math.PI / 2; if (smjer === '-z') g.rotation.x = -Math.PI / 2;
    if (smjer === '-y') g.rotation.x = Math.PI;
    return g;
  }
  function platno(w, h, crtaj, px = 4) {
    const c = document.createElement('canvas'); c.width = Math.round(w * px); c.height = Math.round(h * px); const g = c.getContext('2d'); g.scale(px, px); crtaj(g);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  }

  const korijen = new THREE.Group(); scene.add(korijen);
  const TZ = GEO.TOOL_Z;

  /* ---------------------------------------------------------------- radni stol (podloga) */
  const podloga = add(korijen, box(1900, 30, 1000, M.radni), -250, -133, 80); podloga.userData.dio = 'podloga';

  /* stroj: okvir stola (x = X, y gore, z = −Y), zakrenut tako da X ide prema gledatelju, a Y udesno */
  const masina = new THREE.Group(); korijen.add(masina); masina.rotation.y = -Math.PI / 2;

  /* ---------------------------------------------------------------- postolje (u svojem okviru: z_o uzduž X, x_o = −Y) */
  const okvir = new THREE.Group(); masina.add(okvir); okvir.rotation.y = Math.PI / 2; okvir.position.x = -40;   /* postolje je dulje straga zbog hoda portala */
  const zL = 600, BO = 168;
  for (const sx of [-1, 1]) {
    add(okvir, box(10, 92, zL, M.bez), sx * BO, -64, 0);                                  /* bočne stranice postolja */
    add(okvir, box(36, 40, zL - 20, M.aluT), sx * (BO - 24), -48, 0);                      /* uzdužni nosač s vodilicom portala */
    cylZ(okvir, 8, zL - 30, M.celik, sx * (BO - 24), -22, 0, 18);                          /* okrugla vodilica osi X */
    for (const sz of [-1, 1]) add(okvir, cyl(16, 12, M.crna2, 16), sx * (BO - 10), -116, sz * (zL / 2 - 30));   /* nožice */
  }
  const prednja = add(okvir, box(2 * BO + 10, 92, 10, M.bez), 0, -64, zL / 2 + 5);           /* prednja ploča s ležajem vretena */
  void prednja;
  cylZ(okvir, 10, 8, M.celik, 0, -60, zL / 2 + 13, 18); cylZ(okvir, 6, 10, M.celik, 0, -60, zL / 2 + 18, 6);
  for (const sx of [-1, 1]) cylZ(okvir, 6, 3, M.crna, sx * 120, -64, zL / 2 + 11, 14);          /* rupe za vijke */
  add(okvir, box(2 * BO + 10, 92, 10, M.bez), 0, -64, -zL / 2 - 5);                          /* stražnja ploča */
  add(okvir, box(2 * BO, 6, zL, M.bezT), 0, -107, 0);                                       /* dno */
  reg('okvir', 'Postolje (okvir)', okvir);

  /* ---------------------------------------------------------------- stol (miruje) s T-utorima uzduž osi X */
  const stol = new THREE.Group(); masina.add(stol);
  const S = GEO.STOL;
  const utori = [-108, -72, -36, 0, 36, 72, 108];                                          /* 7 T-utora uzduž X */
  { const s = new THREE.Shape(), W2 = S.W / 2, H = S.H;                                     /* presjek aluminijskog profila (u = Y, v = gore) */
    s.moveTo(-W2, -H); for (let k = 0; k < 8; k++) { const u0 = -W2 + k * (S.W / 8); s.lineTo(u0 + 8, -H); s.lineTo(u0 + 13, -H + 5); s.lineTo(u0 + 18, -H); }
    s.lineTo(W2, -H); s.lineTo(W2, 0);
    for (const u of [...utori].reverse()) { s.lineTo(u + 4, 0); s.lineTo(u + 4, -3); s.lineTo(u + 8, -3); s.lineTo(u + 8, -11); s.lineTo(u - 8, -11); s.lineTo(u - 8, -3); s.lineTo(u - 4, -3); s.lineTo(u - 4, 0); }
    s.lineTo(-W2, 0); s.lineTo(-W2, -H);
    const prof = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: S.L, bevelEnabled: false }), M.alu);
    prof.rotation.y = Math.PI / 2; add(stol, prof, -S.L / 2, 0, 0);
    for (const u of [-127, -90, -54, -18, 18, 54, 90, 127]) add(stol, box(S.L, 0.4, 0.8, M.aluT), 0, 0.1, -u); }   /* spojevi profila */
  for (const sz of [-1, 1]) add(stol, box(S.L, 20, 10, M.aluT), 0, -24, sz * 110);           /* nosači stola */
  reg('stol', 'Stol s T-utorima (miruje)', stol);

  /* ---------------------------------------------------------------- portal (giba se po X) s nosačem osi Y i osi Z
     okvir portala: x_g = smjer osi Y, z_g = smjer osi X (os vretena je na z_g = TZ, ispred grede) */
  const portal = new THREE.Group(); masina.add(portal); portal.rotation.y = Math.PI / 2;
  /* bočne ploče: stup 64 mm s kosim stopalom, debljina 14 (kao na fotografijama) */
  const stranica = new THREE.Shape(); stranica.moveTo(-58, -12); stranica.lineTo(92, -12); stranica.lineTo(92, 4); stranica.lineTo(76, 46); stranica.lineTo(76, 312);
  stranica.lineTo(-36, 312); stranica.lineTo(-36, 46); stranica.lineTo(-58, 4); stranica.lineTo(-58, -12);
  for (const sx of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(stranica, { depth: 14, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2 }), M.bez);
    g.rotation.y = -Math.PI / 2; g.position.set(sx * 183 + 7, 0, 0); portal.add(g);                /* oblik: x → z_g, y → y */
    add(portal, box(46, 10, 140, M.bez), sx * 162, -8, 17);                                    /* stopalo prema klizaču */
    add(portal, box(40, 22, 56, M.crna2), sx * 144, -22, 0);                                  /* klizač na vodilici X */
    const ukruta = new THREE.Shape(); ukruta.moveTo(0, 0); ukruta.lineTo(26, 0); ukruta.lineTo(0, 30); ukruta.lineTo(0, 0);
    for (const sz of [-1, 1]) { const k = new THREE.Mesh(new THREE.ExtrudeGeometry(ukruta, { depth: 8, bevelEnabled: false }), M.bez); k.rotation.y = sz > 0 ? 0 : Math.PI; k.position.set(sx * 176 - 4, -2, sz > 0 ? 72 : -32); if (sx > 0) { k.scale.x = -1; } portal.add(k); }
    for (const yy of [298, 60]) for (const zz of [-18, 18, 58]) cylX(portal, 3.2, 2, M.celik, sx * 191, yy, zz, 10);   /* vijci na bočnoj ploči */
  }
  add(portal, box(394, 8, 48, M.bez), 0, 316, -12);                                         /* gornja letva (stražnji dio) */
  for (const sx of [-1, 1]) { add(portal, box(34, 8, 66, M.bez), sx * 180, 316, 45);          /* uha letve nad bočnim pločama */
    for (const zz of [-28, 66]) cylZ(portal, 2.6, 2, M.celik, sx * 184, 320.5, zz, 10).rotation.x = 0; }
  add(portal, box(352, 34, 4, M.bez), 0, 296, 10);                                           /* prednji rub otvora grede */
  add(portal, box(352, 150, 6, M.bez), 0, 237, -33);                                         /* stražnja stijenka grede */
  add(portal, box(352, 6, 66, M.bez), 0, 163, -2);                                           /* dno grede */
  add(portal, box(352, 120, 4, M.bez), 0, 236, 30);                                          /* prednja pokrovna ploča (paralelna s osi Y) */
  for (const yy of [196, 282]) cylX(portal, 8, 352, M.celik, 0, yy, 4, 20);                /* vodilice osi Y unutar grede */
  const motorY = nema(portal, 'x', -(190 + 4 + 38), 246, 0); reg('motori', 'Koračni motori NEMA 23', motorY);   /* motor osi Y na lijevoj bočnoj ploči */
  add(portal, box(6, 64, 64, M.crna2), -193, 246, 0);
  /* oznaka osi na gornjoj letvi: Z (točka = gore), X prema operateru, Y udesno — kao na stroju */
  const oznaka = platno(90, 26, (g) => { g.fillStyle = '#ccc7ad'; g.fillRect(0, 0, 90, 26); g.strokeStyle = '#a0522d'; g.fillStyle = '#a0522d'; g.lineWidth = 1.4;
    g.beginPath(); g.arc(14, 9, 6, 0, 7); g.stroke(); g.font = '600 7px Arial'; g.fillText('Z', 11.5, 11.5);
    g.beginPath(); g.arc(40, 9, 6, 0, 7); g.stroke(); g.beginPath(); g.arc(40, 9, 1.4, 0, 7); g.fill();
    g.beginPath(); g.moveTo(46, 9); g.lineTo(80, 9); g.stroke(); g.fillText('Y', 82, 11.5);
    g.beginPath(); g.moveTo(40, 15); g.lineTo(40, 22); g.stroke(); g.beginPath(); g.moveTo(36, 19); g.lineTo(40, 24); g.lineTo(44, 19); g.fill(); g.fillText('X', 46, 24); });
  oznaka.rotation.x = -Math.PI / 2; add(portal, oznaka, -60, 320.2, 20);
  reg('portal', 'Portal — os X i nosač osi Y', portal);

  /* nosač osi Y: ploča ispred pokrovne ploče, klizi po vodilicama u gredi */
  const nosacX = new THREE.Group(); portal.add(nosacX);
  for (const yy of [196, 282]) for (const sx of [-1, 1]) add(nosacX, box(36, 24, 20, M.crna2), sx * 36, yy, 18);
  add(nosacX, box(36, 26, 22, M.mjed), 0, 240, 4);                                           /* matica vretena Y */
  add(nosacX, box(128, 196, 10, M.bez), 0, 240, 38);                                         /* ploča nosača */
  add(nosacX, box(128, 14, 34, M.bez), 0, 331, 55); add(nosacX, box(128, 14, 34, M.bez), 0, 149, 55);   /* nosači vodilica Z */
  const zr1 = add(nosacX, cyl(6, 170, M.celik, 16), -44, 240, 56), zr2 = add(nosacX, cyl(6, 170, M.celik, 16), 44, 240, 56);
  const motorZ = nema(nosacX, '-y', 6, 362, 50); reg('motori', 'Koračni motori NEMA 23', motorZ);
  add(nosacX, box(64, 8, 64, M.crna2), 6, 326, 50);
  add(nosacX, box(8, 120, 50, M.bez), -40, 312, 50);                                         /* uspravna ploča nosača motora Z (strši iznad portala) */
  reg('portal', 'Portal — os X i nosač osi Y', nosacX);

  /* os Z: klizna ploča i bež obujmica vretena s četiri vijka */
  const glavaZ = new THREE.Group(); nosacX.add(glavaZ);
  for (const yy of [195, 265]) for (const sx of [-1, 1]) add(glavaZ, box(26, 28, 14, M.crna2), sx * 44, yy, 62);
  add(glavaZ, box(114, 172, 10, M.bez), 0, 232, 72);
  add(glavaZ, box(28, 22, 18, M.mjed), 0, 292, 60);
  const obujmica = add(glavaZ, box(112, 80, 88, M.bez), 0, 206, TZ - 4); obujmica.userData.obujmica = true;
  add(glavaZ, box(112, 14, 72, M.bez), 0, 300, TZ - 12);                                     /* gornja obujmica vretena */
  add(glavaZ, box(112, 40, 8, M.bez), 0, 276, TZ - 44);
  for (const yy of [184, 228]) for (const sx of [-1, 1]) { const v = cylZ(glavaZ, 4.2, 3, M.crna, sx * 44, yy, TZ + 40.5, 14); void v; }
  for (const yy of [184, 228]) for (const sz of [-1, 1]) cylX(glavaZ, 4.2, 3, M.crna, 57.5, yy, TZ - 4 + sz * 30, 14);
  const natpisST = platno(30, 14, (g) => { g.fillStyle = '#e8eef4'; g.fillRect(0, 0, 30, 14); g.fillStyle = '#1d3f7a'; g.font = '700 11px Arial'; g.fillText('ST', 6, 11.5); }, 6);
  natpisST.rotation.y = Math.PI / 2; add(glavaZ, natpisST, 56.3, 262, TZ);
  reg('osZ', 'Os Z (vertikalno gibanje vretena)', glavaZ, zr1, zr2);

  /* vreteno (vodeno hlađeno Ø65, 800 W) — vrh alata je u ishodištu grupe */
  const vreteno = new THREE.Group(); glavaZ.add(vreteno); vreteno.position.set(0, 60, TZ);
  add(vreteno, cyl(32.5, 225, M.vreteno, 48), 0, 25 + 112.5, 0);
  for (const yy of [60, 150, 205]) add(vreteno, cyl(33.2, 2.5, M.aluT, 48), 0, yy, 0);
  add(vreteno, cyl(34, 9, M.vreteno, 48), 0, 254, 0); add(vreteno, cyl(26, 6, M.celik, 40), 0, 261, 0);
  add(vreteno, box(30, 4, 30, M.celik), 0, 265, 0);
  add(vreteno, cyl(12, 30, M.vreteno, 24), 0, 281, 0); add(vreteno, cyl(13, 10, M.celik, 24), 0, 290, 0);   /* utikač napajanja (aviation) */
  for (let i = 0; i < 12; i++) { const r = add(vreteno, box(1.2, 10, 2, M.sivo), Math.cos(i * 0.52) * 13, 290, Math.sin(i * 0.52) * 13); r.rotation.y = -i * 0.52; }
  add(vreteno, cyl(20, 8, M.vreteno, 28), 0, 21, 0);
  const matica = add(vreteno, cyl(10, 11, M.celik, 6), 0, 12, 0);                          /* matica ER11 */
  for (const [xx, zz] of [[-24, -6], [-19, 14]]) { add(vreteno, cyl(3.5, 12, M.celik, 10), xx, 270, zz); add(vreteno, cyl(5, 5, M.celik, 6), xx, 266, zz); }   /* priključci vode na vrhu */
  const cijev = (tocke, m, r) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tocke.map((p) => new THREE.Vector3(...p))), 40, r, 10, false), m);
  vreteno.add(cijev([[-24, 276, -6], [-26, 320, -8], [-20, 360, -30], [-10, 375, -80], [0, 360, -140]], M.cijevP, 4.5));
  vreteno.add(cijev([[-19, 276, 14], [-20, 322, 12], [-14, 366, -22], [-4, 380, -78], [6, 364, -138]], M.cijevP, 4.5));
  vreteno.add(cijev([[0, 295, 0], [0, 330, -4], [6, 362, -40], [30, 372, -100], [60, 360, -130]], M.cijevC, 4));
  const alatG = new THREE.Group(); vreteno.add(alatG);
  add(alatG, cyl(1.59, 22, M.celik, 16), 0, 12 + 11 - 4, 0);
  add(alatG, cyl(GEO.R_ALATA, 10, M.glodalo, 16), 0, 5, 0);
  for (let i = 0; i < 4; i++) { const s = add(alatG, box(0.6, 3.2, 3.15, M.sivo), 0, 1.6 + i * 2.2, 0); s.rotation.y = i * 0.9; }
  reg('vreteno', 'Vreteno i alat', vreteno);

  /* navojna vretena i motor osi X (straga, ispod stola) */
  const vrX = cylZ(okvir, 8, zL - 40, M.navoj, 0, -60, 0, 18);
  const vrY = cylX(portal, 8, 350, M.navoj, 0, 240, 4, 18);
  const vrZ = add(nosacX, cyl(6, 170, M.navoj, 16), 0, 240, 52);
  add(portal, box(60, 30, 40, M.mjed), 0, -46, 0);                                         /* matica vretena X na portalu */
  const motorX = nema(okvir, 'z', 0, -60, -zL / 2 - 10 - 38); reg('motori', 'Koračni motori NEMA 23', motorX);
  reg('vretena', 'Navojna vretena osi X, Y i Z', vrX, vrY, vrZ);

  /* lanac za kabele uz lijevu stranu (portal ga vuče po X) */
  function lanacPo(p, tocke, sir = 26, vis = 22, kor = 17) {                                 /* lanac za kabele: članci uzduž krivulje */
    const k = new THREE.CatmullRomCurve3(tocke.map((q) => new THREE.Vector3(...q))), n = Math.max(2, Math.round(k.getLength() / kor));
    const g = new THREE.Group(); p.add(g);
    for (let i = 0; i < n; i++) { const a = k.getPointAt((i + 0.5) / n), b = k.getPointAt(Math.min(1, (i + 0.5) / n + 0.01));
      const c = new THREE.Mesh(new THREE.BoxGeometry(kor - 2, vis, sir), M.crna); c.position.copy(a); c.lookAt(b); c.rotateY(Math.PI / 2); g.add(c);
      const z = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, sir + 2, 8), M.crna2); z.rotation.x = Math.PI / 2; z.position.set(-kor / 2 + 1, 0, 0); c.add(z); }
    return g;
  }
  const lanac = new THREE.Group(); masina.add(lanac);
  lanacPo(lanac, [[-330, -100, 222], [-100, -100, 222], [60, -100, 222]], 40, 24, 18);          /* donji krak lanca uz lijevu stranu */
  const lanacP = lanacPo(portal, [[-205, -88, 40], [-205, -88, 90], [-205, -40, 120], [-205, 10, 90], [-205, 20, 40]], 40, 24, 18);   /* petlja na portalu */
  const lanacG = lanacPo(portal, [[60, 350, -20], [130, 372, -20], [200, 345, -20], [212, 280, -20], [210, 220, -20]], 30, 20, 16);   /* lanac osi Y desno gore */
  reg('upravljanje', 'Upravljačka kutija, USB i računalo', lanac, lanacP, lanacG);

  /* ---------------------------------------------------------------- 4. os A (stezna glava) i konjić — uzduž osi X, lijevo na stolu */
  const A = GEO.A; const hA = A.visina;
  const osAtijelo = new THREE.Group(); add(stol, osAtijelo, 0, 0, -A.y);
  const xF = A.lice - 63;                                                                  /* prednja ploha kućišta */
  add(osAtijelo, box(70, 10, 150, M.bez), xF - 28, 5, 0);                                    /* podnožje s utorima */
  for (const sz of [-1, 1]) add(osAtijelo, box(30, 1, 10, M.utor), xF - 28, 10.6, sz * 60);
  add(osAtijelo, box(50, hA + 48, 112, M.bez), xF - 25, (hA + 48) / 2 + 10, 0);              /* kućište vretena (visoki blok) */
  add(osAtijelo, box(4, 26, 112, M.bezT), xF - 52, hA + 30, 0);
  const korito = new THREE.Group(); add(osAtijelo, korito, xF - 50, 0, 0);                   /* korito do stražnje ploče s remenom */
  add(korito, box(70, 8, 90, M.bez), -35, hA - 18, 0);
  for (const sz of [-1, 1]) add(korito, box(70, 36, 6, M.bez), -35, hA, sz * 42);
  add(korito, box(8, hA + 55, 190, M.bez), -74, (hA + 55) / 2 + 2, -30);                     /* stražnja ploča (nosi remen) */
  const remen = new THREE.Group(); add(korito, remen, -82, 0, 0);                            /* remenski prijenos (stražnja strana) */
  const ym = 38, zm = -74;                                                                   /* os motora: niže i u stranu */
  cylX(remen, 30, 14, M.crna2, 0, hA, 0, 32); cylX(remen, 12, 16, M.celik, -2, hA, 0, 16);
  cylX(remen, 12, 14, M.crna2, 0, ym, zm, 20); cylX(remen, 5, 16, M.celik, -2, ym, zm, 10);
  { const dy = ym - hA, dz = zm, L = Math.hypot(dy, dz), k = Math.atan2(dy, -dz), ny = Math.cos(k), nz = Math.sin(k);
    for (const s of [-1, 1]) { const b = add(remen, box(8, 3, L, M.crna), 0, (hA + ym) / 2 + s * 21 * ny, zm / 2 + s * 21 * nz); b.rotation.x = k; } }
  const motorA = nema(korito, '-x', -36, ym, zm); reg('motori', 'Koračni motori NEMA 23', motorA);   /* motor paralelno s osi, vratilo prema remenu */
  const osA = new THREE.Group(); add(stol, osA, A.lice, hA, -A.y);                         /* okreće se oko X */
  const glavaA = new THREE.Group(); osA.add(glavaA);
  cylX(glavaA, 44, 8, M.aluT, -59, 0, 0, 40);                                               /* prirubnica */
  cylX(glavaA, 50, 40, M.glava, -35, 0, 0, 44);                                             /* tijelo stezne glave Ø100 */
  cylX(glavaA, 14, 2, M.crna2, -14.5, 0, 0, 24);
  for (let i = 0; i < 3; i++) {                                                             /* tri stepenaste čeljusti */
    const k = new THREE.Group(); glavaA.add(k); k.rotation.x = i * 2 * Math.PI / 3;
    add(k, box(14, 18, 14, M.glava), -7.5, 29, 0); add(k, box(14, 10, 18, M.glava), -7.5, 42, 0);
    const kv = add(k, cyl(4, 3, M.crna, 6), -15.5, 38, 0); kv.rotation.z = Math.PI / 2;
  }
  add(osAtijelo, box(4, 8, 4, M.crvena), xF - 2, hA + 52, 0);                                /* oznaka A0 */
  const obrA = new THREE.Group(); osA.add(obrA);
  reg('osA', '4. os A (stezna glava, remen, motor)', osAtijelo, osA);

  const konjic = new THREE.Group(); stol.add(konjic);                                        /* ishodište = vrh šiljka; tijelo prema +X */
  add(konjic, box(90, 10, 80, M.bez), 55, -hA + 5, 0);
  add(konjic, box(70, hA + 18, 52, M.bez), 55, -hA + 10 + (hA + 18) / 2, 0);
  cylX(konjic, 7, 12, M.celik, 14, 0, 0, 14);
  { const s = add(konjic, cyl(7, 14, M.celik, 20, 0.5), 3, 0, 0); s.rotation.z = Math.PI / 2; }
  const zvijezda = (p, x, y, z, os) => { const g = new THREE.Group(); add(p, g, x, y, z); add(g, cyl(5, 14, M.celik, 10), 0, -7, 0);
    for (let i = 0; i < 5; i++) { const b = add(g, box(5, 8, 22, M.crna), 0, 4, 0); b.rotation.y = i * Math.PI / 5 * 2; b.position.set(Math.sin(i * 1.2566) * 6, 4, Math.cos(i * 1.2566) * 6); }
    add(g, cyl(8, 8, M.crna, 16), 0, 4, 0); if (os === 'x') g.rotation.z = -Math.PI / 2; return g; };
  zvijezda(konjic, 40, 28 + 7, 0);                                                           /* stezanje pinole (gore) */
  zvijezda(konjic, 98, 0, 0, 'x');                                                           /* ručica pinole (straga) */
  reg('konjic', 'Konjić', konjic);

  /* ---------------------------------------------------------------- škripac i stezne pandže */
  const skripac = new THREE.Group(); stol.add(skripac);
  const pandze = new THREE.Group(); stol.add(pandze);
  const obrGrupa = new THREE.Group(); stol.add(obrGrupa);
  const pribor = { skripac: null, pandze: null };
  function isprazni(g) { while (g.children.length) { const c = g.children.pop(); c.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); } }
  /* Dvije izvedbe škripca, iste čeljusti (paralelne s X, širina ≈ 100 mm, otvor po Y do 60 mm):
     'original' — lijevani bušilični škripac sa stroja (podnožje s utorima, dugo vreteno, ručica T), vreteno prema +Y (strši preko desnog ruba stola);
     'pojednostavljeni' — prvotni model. */
  let vrstaSkr = 'original', zadnjiSkr = null;
  function skripacOriginal(L, W, H, xc, yc, bot = 27) {
    const zc = -yc, sir = Math.max(W, 20), sg = -1;                                 /* sg = −1: vreteno prema +Y */
    const liv = mat(0x8b9094, { metalness: 0.35, roughness: 0.72 }), tam = mat(0x4a433c, { metalness: 0.45, roughness: 0.6 });
    add(skripac, box(124, 10, 150, liv), xc, 5, zc + sg * 5);
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      add(skripac, box(34, 8, 40, liv), xc + sx * 79, 4, zc + sg * 5 + sz * 52);
      add(skripac, box(12, 1, 26, M.utor), xc + sx * 82, 8.6, zc + sg * 5 + sz * 52);
    }
    for (const sx of [-1, 1]) add(skripac, box(16, 16, 146, liv), xc + sx * 54, 18, zc + sg * 5);
    add(skripac, box(124, 22, 24, liv), xc, 28, zc - sg * (sir / 2 + 12));                 /* nepomična čeljust */
    add(skripac, box(108, 14, 3, tam), xc, 32, zc - sg * (sir / 2 + 1.5));
    add(skripac, box(124, 22, 26, liv), xc, 28, zc + sg * (sir / 2 + 13));                 /* pomična čeljust */
    add(skripac, box(108, 14, 3, tam), xc, 32, zc + sg * (sir / 2 + 1.5));
    add(skripac, box(44, 26, 20, liv), xc, 23, zc + sg * 70);                         /* glava s maticom vretena */
    cylZ(skripac, 6, 45, M.navoj, xc, 24, zc + sg * (sir / 2 + 26 + 22.5), 16);          /* vreteno (kraj ostaje unutar portala) */
    const kr = zc + sg * (sir / 2 + 26 + 45);
    add(skripac, cyl(9, 16, M.celik, 16), xc, 24, kr).rotation.x = Math.PI / 2;
    cylX(skripac, 3.5, 90, M.celik, xc, 24, kr + sg * 4, 10);
    for (const sx of [-1, 1]) add(skripac, new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), M.celik), xc + sx * 45, 24, kr + sg * 4);
    for (const sz of [-1, 1]) add(skripac, box(Math.min(L, 100), bot - 20, 5, M.celik), xc, 20 + (bot - 20) / 2, zc + sz * (W / 2 - 4));
    pribor.skripac = { celjusti: [
      { x0: xc - 62, x1: xc + 62, y0: yc + sir / 2, y1: yc + sir / 2 + 26, z0: 17, z1: 39 },
      { x0: xc - 62, x1: xc + 62, y0: yc - sir / 2 - 24, y1: yc - sir / 2, z0: 17, z1: 39 }], dno: 20, bot,
      tijelo: { x0: xc - 96, x1: xc + 96, y0: yc - 70, y1: yc + 80 } };
    return { x0: xc - L / 2, y0: yc - W / 2, bot, top: bot + H };
  }
  function skripacZa(L, W, H, xc = GEO.SKRIPAC.x, yc = GEO.SKRIPAC.y, bot = 27) {
    isprazni(skripac); isprazni(pandze); skripac.visible = true; pandze.visible = false; prikaziA(true);
    zadnjiSkr = [L, W, H, xc, yc, bot];
    if (vrstaSkr === 'original') { const r = skripacOriginal(L, W, H, xc, yc, bot); skripac.traverse((m) => { if (m.isMesh) m.userData.dio = 'skripac'; }); return r; }
    const zc = -yc, Lt = 150, sir = Math.max(W, 20);
    add(skripac, box(Lt, 8, 150, M.plavaKut), xc, 4, zc - 8);
    add(skripac, box(Lt - 30, 12, 130, M.plavaKut), xc, 14, zc - 8);
    for (const sx of [-1, 1]) add(skripac, box(14, 4, 30, M.utor), xc + sx * 62, 8.5, zc - 8);
    add(skripac, box(110, 19, 22, M.plavaKut), xc, 29.5, zc - sir / 2 - 11);
    add(skripac, box(104, 12, 3, M.celik), xc, 33, zc - sir / 2 - 1.5);
    add(skripac, box(110, 19, 22, M.plavaKut), xc, 29.5, zc + sir / 2 + 11);
    add(skripac, box(104, 12, 3, M.celik), xc, 33, zc + sir / 2 + 1.5);
    add(skripac, box(110, 30, 14, M.plavaKut), xc, 20, zc - sir / 2 - 30);
    cylZ(skripac, 7, 70, M.celik, xc, 22, zc + sir / 2 + 50, 16);
    cylX(skripac, 3, 70, M.celik, xc, 22, zc + sir / 2 + 84, 10);
    for (const sx of [-1, 1]) add(skripac, cyl(5, 8, M.crvena, 14), xc + sx * 35, 22, zc + sir / 2 + 84).rotation.z = Math.PI / 2;
    for (const sz of [-1, 1]) add(skripac, box(Math.min(L, 100), bot - 20, 5, M.celik), xc, 20 + (bot - 20) / 2, zc + sz * (W / 2 - 4));
    pribor.skripac = { celjusti: [
      { x0: xc - 55, x1: xc + 55, y0: yc + sir / 2, y1: yc + sir / 2 + 22, z0: 20, z1: 39 },
      { x0: xc - 55, x1: xc + 55, y0: yc - sir / 2 - 22, y1: yc - sir / 2, z0: 20, z1: 39 }], dno: 20, bot,
      tijelo: { x0: xc - 75, x1: xc + 75, y0: yc - 60, y1: yc + 75 } };
    skripac.traverse((m) => { if (m.isMesh) m.userData.dio = 'skripac'; });
    return { x0: xc - L / 2, y0: yc - W / 2, bot, top: bot + H };
  }
  /* podložna MDF ploča 8 mm i četiri stezne pandže na T-utorima; 4. os i škripac se tada skidaju sa stola */
  function pandzeZa(L, W, H, xc = GEO.PANDZE.x, yc = GEO.PANDZE.y) {
    isprazni(skripac); isprazni(pandze); skripac.visible = false; pandze.visible = true; prikaziA(false); zadnjiSkr = null;
    const D = 8, zc = -yc;
    add(pandze, box(Math.min(L + 40, S.L - 10), D, Math.min(W + 40, S.W - 6), M.mdf), xc, D / 2, zc);
    const top = D + H;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const x = xc + sx * (L / 2 - 18), y = yc + sy * (W / 2 + 2);
      const g = new THREE.Group(); add(pandze, g, x, 0, -y);
      add(g, box(20, top - 2, 16, M.crna2), 0, (top - 2) / 2, -sy * 30);
      const st = add(g, box(16, 8, 62, M.celik), 0, top + 4, -sy * 10); st.rotation.x = sy * 0.04;
      add(g, cyl(4, top + 22, M.celik, 10), 0, (top + 22) / 2 - 2, -sy * 12);
      add(g, cyl(7, 6, M.crna, 6), 0, top + 11, -sy * 12);
    });
    pribor.pandze = { D, top };
    pandze.traverse((m) => { if (m.isMesh) m.userData.dio = 'pandze'; });
    return { x0: xc - L / 2, y0: yc - W / 2, bot: D, top };
  }
  let imaA = true;
  function prikaziA(v) { imaA = v; osAtijelo.visible = osA.visible = konjic.visible = v; }
  function bezPribora() { isprazni(skripac); isprazni(pandze); skripac.visible = pandze.visible = false; pribor.skripac = pribor.pandze = null; zadnjiSkr = null; prikaziA(true); }
  function vrstaSkripca(v) { if (v === undefined) return vrstaSkr; vrstaSkr = v === 'pojednostavljeni' ? v : 'original'; if (zadnjiSkr && skripac.visible) skripacZa(...zadnjiSkr); return vrstaSkr; }
  reg('skripac', 'Bušilični škripac', skripac);
  reg('pandze', 'Stezne pandže i podložna ploča', pandze);

  /* ---------------------------------------------------------------- upravljačka kutija „CNC Controller” (lijevo od stroja), kao na fotografiji */
  const upravljanje = new THREE.Group(); add(korijen, upravljanje, -540, -118, 120);
  const KW = 360, KD = 300, KH = 150, KF = 55, KS = 70;                                     /* širina, dubina, visina, visina okomitog dijela, uvlaka kosine */
  { const sh = new THREE.Shape(); sh.moveTo(-KD / 2, 0); sh.lineTo(KD / 2, 0); sh.lineTo(KD / 2, KF); sh.lineTo(KD / 2 - KS, KH); sh.lineTo(-KD / 2, KH); sh.lineTo(-KD / 2, 0);
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: KW, bevelEnabled: false }), M.bez);
    g.rotation.y = -Math.PI / 2; g.position.set(KW / 2, 0, 0); upravljanje.add(g); }
  for (let i = 0; i < 5; i++) add(upravljanje, box(2, 8, 60, M.crna2), KW / 2 + 0.5, 80 + i * 13, -40);   /* prorezi za zrak (bok) */
  const kut = Math.atan2(KS, KH - KF), visP = Math.hypot(KS, KH - KF);
  const ploca = new THREE.Group(); add(upravljanje, ploca, 0, (KF + KH) / 2, KD / 2 - KS / 2); ploca.rotation.x = -kut;
  const PW = KW - 24, PH = visP - 14;
  const natpisi = platno(PW, PH, (g) => {
    g.fillStyle = '#d6d0b8'; g.fillRect(0, 0, PW, PH); g.strokeStyle = '#1b1b1b'; g.lineWidth = 0.7; g.fillStyle = '#1b1b1b';
    g.font = '700 9px Arial'; g.fillText('CNC Controller', 12, 12);
    g.strokeRect(8, 16, 186, PH - 22); g.fillRect(8, 16, 186, 9); g.fillStyle = '#fff'; g.font = '700 6.4px Arial'; g.fillText('Spindle motor control', 60, 22.8);
    g.fillStyle = '#1b1b1b'; g.font = '700 5px Arial'; g.fillText('PC', 120, 43); g.fillText('Manually', 136, 67);
    g.fillRect(134, PH - 20, 54, 8); g.strokeRect(204, 18, PW - 212, PH - 24);
    g.fillRect(216, PH - 18, 32, 8); g.fillRect(270, PH - 18, 34, 8); g.fillText('ON', 245, 36); g.fillText('OFF', 245, 62);
    g.fillStyle = '#fff'; g.font = '700 5.4px Arial'; g.fillText('Spindle mode', 139, PH - 14); g.fillText('Power', 223, PH - 12); g.fillText('Stop', 280, PH - 12);
  });
  add(ploca, natpisi, 0, 0, 0.6);
  const px = (u) => u - PW / 2, py = (v) => PH / 2 - v;                                     /* koordinate s platna (lijevo-gore) u ploču */
  const pretvarac = new THREE.Group(); ploca.add(pretvarac);
  add(pretvarac, box(70, 56, 3, M.crna), px(64), py(52), 2);                                  /* pretvarač PRT-E750 ugrađen u ploču */
  const prtNatpis = platno(30, 5, (g) => { g.fillStyle = '#111'; g.fillRect(0, 0, 30, 5); g.fillStyle = '#ddd'; g.font = '4px Arial'; g.fillText('PRT-E750', 6, 4); }, 8);
  add(pretvarac, prtNatpis, px(64), py(30), 3.6);
  const lcdC = document.createElement('canvas'); lcdC.width = 256; lcdC.height = 80; const lcdT = new THREE.CanvasTexture(lcdC);
  const lcd = add(pretvarac, new THREE.Mesh(new THREE.PlaneGeometry(42, 13), new THREE.MeshBasicMaterial({ map: lcdT })), px(64), py(40), 3.6); void lcd;
  const run = add(pretvarac, cyl(4.5, 3, M.zelena, 18), px(48), py(56), 4.5); run.rotation.x = Math.PI / 2;
  const stop = add(pretvarac, cyl(4.5, 3, M.crvena, 18), px(62), py(56), 4.5); stop.rotation.x = Math.PI / 2;
  const pot = add(pretvarac, cyl(6.5, 6, M.crna, 20), px(80), py(56), 6); pot.rotation.x = Math.PI / 2;
  const potOz = add(pretvarac, box(1.4, 5, 1.4, M.zuta), px(80), py(53), 9.2);
  for (let i = 0; i < 4; i++) { const b = add(pretvarac, cyl(4, 3, M.plavi, 18), px(40 + i * 14), py(70), 4.5); b.rotation.x = Math.PI / 2; }
  const prsten = add(ploca, cyl(10, 4, M.celik, 28), px(146), py(46), 2.5); prsten.rotation.x = Math.PI / 2;
  const prek = add(ploca, box(5, 14, 7, M.crna), px(146), py(46), 7);                        /* preklopnik PC / Manually */
  const sklopka = add(ploca, box(13, 19, 8, mat(0xb0261d, { roughness: 0.35 })), px(230), py(48), 4.5); sklopka.userData.klik = 'sklopka';   /* svijetleća sklopka Power */
  add(ploca, box(17, 23, 2, M.crna), px(230), py(48), 1.5);
  const gljivaPod = add(ploca, cyl(23, 3, M.zuta, 32), px(288), py(46), 2); gljivaPod.rotation.x = Math.PI / 2;
  const gNatpis = platno(44, 44, (g) => { g.fillStyle = '#f2c21a'; g.beginPath(); g.arc(22, 22, 22, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = '700 6px Arial'; g.textAlign = 'center';
    g.save(); g.translate(22, 22); for (const [i, ch] of [...'EMERGENCY'].entries()) { g.save(); g.rotate(-1.15 + i * 0.29); g.fillText(ch, 0, -16); g.restore(); } g.restore(); g.fillText('STOP', 22, 41); }, 8);
  add(ploca, gNatpis, px(288), py(46), 3.6);
  const gljiva = add(ploca, cyl(15, 12, M.crvena, 32, 13), px(288), py(46), 10); gljiva.rotation.x = Math.PI / 2; gljiva.userData.klik = 'gljiva';
  const usbUt = add(upravljanje, box(16, 8, 4, M.crna2), 100, 60, -KD / 2 - 2);
  korijen.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-440, 50, -80], [-420, 0, -120], [-320, -70, -180], [-230, -90, -230]].map((p) => new THREE.Vector3(...p))), 50, 5, 8, false), M.cijevC));
  reg('upravljanje', 'Upravljačka kutija (CNC Controller), USB i računalo', upravljanje, usbUt);
  reg('pretvarac', 'Pretvarač frekvencije PRT-E750 (u upravljačkoj kutiji)', pretvarac, prek, prsten);

  /* računalo s Mach3 (desno od stroja) */
  const racunalo = new THREE.Group(); add(korijen, racunalo, 520, -118, 140); racunalo.rotation.y = -0.6;
  add(racunalo, box(300, 14, 210, M.crna2), 0, 7, 0);
  const ekran = add(racunalo, box(300, 200, 8, M.crna), 0, 112, -100); ekran.rotation.x = -0.18;
  const zasC = document.createElement('canvas'); zasC.width = 320; zasC.height = 200; const zasT = new THREE.CanvasTexture(zasC);
  const zaslon = add(racunalo, new THREE.Mesh(new THREE.PlaneGeometry(282, 180), new THREE.MeshBasicMaterial({ map: zasT })), 0, 112, -95.2); zaslon.rotation.x = -0.18;
  reg('upravljanje', 'Upravljačka kutija (CNC Controller), USB i računalo', racunalo);
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
  function lcdTekst(t, ziv) {                                                                /* crveni 7-segmentni prikaz pretvarača */
    const g = lcdC.getContext('2d'); g.fillStyle = '#1a0505'; g.fillRect(0, 0, 256, 80);
    g.fillStyle = ziv ? '#ff3b2f' : '#3a0d0b'; g.font = '700 62px "IBM Plex Mono",monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(ziv ? t : '8888', 244, 44);
    lcdT.needsUpdate = true;
  }
  lcdTekst('', false);
  function gljivaStanje(pritisnuta) { gljiva.position.z = pritisnuta ? 7 : 11; }
  function sklopkaStanje(uk) { sklopka.material.emissive.setHex(uk ? 0x9a1a10 : 0); sklopka.material.color.setHex(uk ? 0xff5a46 : 0xb0261d); }

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
  function postaviZtop(h) { Ztop = h; vreteno.position.y = h; nulaM.position.set(GEO.XT0, h, -GEO.YT0); }
  function postaviOsi(X, Y, Z, Agr) {
    portal.position.x = GEO.XT0 + X - TZ;     /* portal nosi os vretena TZ ispred grede: vrh alata je na x = X + XT0 */
    nosacX.position.x = GEO.YT0 + Y;          /* nosač osi Y: vrh alata je na y = Y + YT0 */
    glavaZ.position.y = Z;
    osA.rotation.x = (Agr || 0) * Math.PI / 180;
  }
  function vrhNadStolom(Z) { return Z + Ztop; }
  postaviZtop(60);
  function okreniAlat(k) { alatG.rotation.y = k; matica.rotation.y = k; }
  function konjicNa(x) { konjic.position.set(x, hA, -A.y); }
  konjicNa(GEO.KONJIC_PARK);
  postaviOsi(150, 100, 0, 0);

  return {
    korijen, masina, okvir, stol, portal, nosacX, glavaZ, vreteno, alatG, skripac, pandze, osA, obrA, konjic, obrGrupa, pretvarac, upravljanje, racunalo,
    nultocke, nulaM, nulaW, dijelovi, M, GEO,
    klik: { sklopka, gljiva }, svjetlo: sklopka, zaslon, potOz, pribor,
    postaviOsi, postaviZtop, get Ztop() { return Ztop; }, vrhNadStolom, okreniAlat, konjicNa, skripacZa, pandzeZa, bezPribora, vrstaSkripca, prikaziA, get imaA() { return imaA; },
    lcdTekst, zaslonTekst, gljivaStanje, sklopkaStanje,
    /* točka iz okvira stola (x = X, y = Y, z gore) u lokalne koordinate grupe stola */
    uStol: (x, y, z) => new THREE.Vector3(x, z, -y)
  };
}
