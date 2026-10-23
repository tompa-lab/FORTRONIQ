/* FORTRONIQ · Haas Desktop Mill — 3D model stroja prema fotografijama stvarnog stroja (20. 10. 2026.) i podacima proizvođača.
   Proizvođač: hod X 152 × Y 254 × Z 76 mm, čelo vretena–stol najviše 80 mm, stol 460 × 270 mm sa 6 T-utora 10 mm na razmaku 45 mm,
   vreteno ER11 do 15 000 o/min, brzi hod 3,6 m/min. S fotografija: tamnosiva (antracit) kabina s velikim prednjim prozorom koji se
   otvara PREMA GORE, donja prednja traka s ručkom, ventilator i natpis na lijevoj strani, priključci straga; unutra tamno kućište,
   aluminijski stol i saonice, stup s vodilicama Z i lancem za kabele, aluminijska glava sa srebrnim cilindričnim vretenom;
   upravljanje je ZASEBNA jedinica (privjesak u kućištu s ručkom) koja stoji na stolu uz stroj. Mjere kabine i privjeska su procjena s fotografija.
   Koordinate: 1 jedinica = 1 mm. Okvir stola: x udesno, y prema natrag, z gore; ishodište = sredina gornje plohe stola.
   U three.js: x = x, y = z (gore), z = −y.  Os vretena je nepomična u x i z; stol se giba po X, saonice po Y, glava po Z.
   Koordinate stroja (nakon ZERO RETURN): X 0 … −152, Y 0 … −254, Z 0 … −76.  Bez logotipa i serijskih brojeva.  © ForTroniQ d.o.o. */

export const GEO = {
  HOD: { X: [-152, 0], Y: [-254, 0], Z: [-76, 0] },
  XT0: 76, YT0: 127,            /* položaj osi vretena u okviru stola kad su X = 0 i Y = 0 (nultočka stroja) */
  NOS0: 80,                     /* visina čela vretena iznad stola pri Z = 0 */
  STOL: { L: 460, W: 270, H: 30 }, UTORI: [-112.5, -67.5, -22.5, 22.5, 67.5, 112.5],
  R_ALATA: 1.5,
  KABINA: { W: 720, D: 700, H: 600, DNO: -170 }   /* vanjske mjere kabine (procjena s fotografija); dno = ploha stola na kojem stroj stoji */
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

export function napraviStrojHaas(THREE, scene) {
  const dijelovi = new Map();
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o));
  const M = {
    antracit: mat(0x3a3d40, { roughness: 0.62, metalness: 0.2 }), antracitT: mat(0x2b2e31, { roughness: 0.7, metalness: 0.15 }), unutra: mat(0x33363a, { roughness: 0.75 }),
    alu: mat(0xd2d6d9, { metalness: 0.55, roughness: 0.38 }), aluT: mat(0xb2b8bd, { metalness: 0.5, roughness: 0.42 }), celik: mat(0xe1e5e8, { metalness: 0.85, roughness: 0.22 }),
    vreteno: mat(0xd9dde0, { metalness: 0.8, roughness: 0.25 }), crna: mat(0x1e2124, { roughness: 0.6 }), crna2: mat(0x2f3336, { roughness: 0.5 }), utor: mat(0x5a6066),
    staklo: new THREE.MeshStandardMaterial({ color: 0x0b0f12, transparent: true, opacity: 0.55, roughness: 0.25, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }),
    inox: mat(0xd8dcde, { metalness: 0.9, roughness: 0.2 }), crvena: mat(0xd2322a, { roughness: 0.45 }), zuta: mat(0xf2c21a), zelena: mat(0x1d9e4b),
    glodalo: mat(0xf0f2f4, { metalness: 0.95, roughness: 0.12 }), radni: mat(0xc9a56a, { roughness: 0.85 }), mdf: mat(0xb48a5a, { roughness: 0.85 }),
    plavaKut: mat(0x355f8c, { metalness: 0.4, roughness: 0.4 }), mjed: mat(0xc8a24a, { metalness: 0.8, roughness: 0.3 }), pneu: mat(0x2c7fd6, { roughness: 0.4 }),
    privjesak: mat(0xc9cbc7, { roughness: 0.55, metalness: 0.15 }), privjesakT: mat(0xa9aca8, { roughness: 0.55 }), lanac: mat(0x1b1d1f, { roughness: 0.8 })
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
  const S = GEO.STOL, NOS0 = GEO.NOS0, K = GEO.KABINA;
  const DNO = K.DNO;                                    /* ploha stola (klupe) na kojoj stroj stoji */
  const KW = K.W, KD = K.D, KH = K.H, KZ = 20;             /* KD 700: stup mora stati iza saonica u krajnjem stražnjem položaju */          /* kabina: širina, dubina, visina; KZ = pomak sredine kabine prema naprijed */
  const VRH = DNO + KH;

  /* ---------------------------------------------------------------- radna klupa (podloga) */
  const podloga = add(korijen, box(2000, 40, 1000, M.radni), 300, DNO - 20, 80); podloga.userData.dio = 'podloga';

  /* ---------------------------------------------------------------- postolje stroja i vodilice osi Y */
  const postolje = new THREE.Group(); korijen.add(postolje);
  add(postolje, box(KW - 40, 14, KD - 40, M.unutra), 0, DNO + 7, KZ);                       /* dno kabine */
  add(postolje, box(560, 50, 600, M.antracitT), 0, DNO + 39, KZ);                             /* temeljna ploča */
  for (const sx of [-1, 1]) { add(postolje, box(40, 30, 580, M.aluT), sx * 190, DNO + 79, KZ); cylZ(postolje, 7, 560, M.celik, sx * 190, DNO + 98, KZ, 16); }   /* vodilice Y */
  add(postolje, box(70, 70, 70, M.crna2), 0, DNO + 100, KZ - 280);                            /* motor osi Y */
  reg('postolje', 'Postolje i vodilice osi Y', postolje);

  /* ---------------------------------------------------------------- saonice (os Y) i stol (os X) */
  const saonice = new THREE.Group(); korijen.add(saonice);
  add(saonice, box(540, 36, 240, M.alu), 0, -S.H - 18, 0);
  for (const sx of [-1, 1]) add(saonice, box(50, 20, 240, M.crna2), sx * 190, -S.H - 46, 0);
  for (const sz of [-1, 1]) { add(saonice, box(540, 10, 30, M.aluT), 0, -S.H - 5, sz * 95); cylX(saonice, 7, 520, M.celik, 0, -S.H + 2, sz * 95, 16); }   /* vodilice X */
  add(saonice, box(70, 60, 60, M.crna2), 300, -S.H - 18, 0);                                   /* motor osi X */
  reg('saonice', 'Saonice — os Y', saonice);

  const stol = new THREE.Group(); saonice.add(stol);
  add(stol, box(S.L, S.H - 10, S.W, M.alu), 0, -(S.H - 10) / 2 - 10, 0);
  { const rub = [-S.W / 2, ...GEO.UTORI.flatMap((u) => [u - 5, u + 5]), S.W / 2];
    for (let k = 0; k < rub.length; k += 2) { const a = rub[k], b = rub[k + 1]; add(stol, box(S.L, 10, b - a, M.alu), 0, -5, -(a + b) / 2); }
    GEO.UTORI.forEach((u) => { add(stol, box(S.L, 1, 18, M.utor), 0, -9.5, -u); }); }
  add(stol, box(40, 20, 30, M.mjed), 0, -S.H - 8, 60);
  reg('stol', 'Stol s T-utorima — os X', stol);

  /* ---------------------------------------------------------------- stup (os Z) */
  const stup = new THREE.Group(); korijen.add(stup);
  const ZS = -325;                                                                              /* stražnja ravnina stupa; čelo stupa na z = −245 (iza saonica u krajnjem položaju) */
  add(stup, box(220, KH - 100, 60, M.antracitT), 0, DNO + 40 + (KH - 100) / 2, ZS + 30);       /* stup (čelo na z = −265) */
  for (const sx of [-1, 1]) { add(stup, box(30, 300, 24, M.aluT), sx * 70, NOS0 + 150, ZS + 72); add(stup, cyl(7, 290, M.celik, 16), sx * 70, NOS0 + 150, ZS + 86); }   /* vodilice Z */
  add(stup, cyl(8, 290, M.celik, 16), 0, NOS0 + 150, ZS + 82);                                /* vreteno osi Z */
  add(stup, box(70, 70, 70, M.crna2), 0, NOS0 + 330, ZS + 70);                                /* motor osi Z */
  const lanac = new THREE.Group(); stup.add(lanac);                                             /* lanac za kabele (lijevo) */
  for (let i = 0; i < 14; i++) add(lanac, box(28, 14, 18, M.lanac), -150, NOS0 + 40 + i * 15, ZS + 50 + Math.sin(i / 13 * Math.PI) * 60);
  reg('stup', 'Stup i vodilice osi Z', stup);

  /* ---------------------------------------------------------------- glava (os Z) i vreteno */
  const glavaZ = new THREE.Group(); korijen.add(glavaZ);
  add(glavaZ, box(150, 160, 30, M.alu), 0, NOS0 + 90, ZS + 104);                              /* klizač Z (na vodilicama) */
  add(glavaZ, box(70, 110, 210, M.alu), 0, NOS0 + 80, -103);                                  /* ruka glave od klizača do osi vretena */
  const vreteno = new THREE.Group(); glavaZ.add(vreteno);
  add(vreteno, box(100, 110, 84, M.alu), 0, NOS0 + 75, -10);                                   /* aluminijski blok nosača vretena */
  add(vreteno, cyl(31, 150, M.vreteno, 40), 0, NOS0 + 120, 0);                                 /* cilindrično integrirano vreteno/motor */
  add(vreteno, cyl(32, 22, M.crna2, 40), 0, NOS0 + 56, 0); add(vreteno, cyl(33, 6, M.aluT, 40), 0, NOS0 + 190, 0);   /* crni prsten na dnu motora */
  add(vreteno, cyl(12, 18, M.crna, 16), 22, NOS0 + 203, 0);                                    /* priključak kabela na vrhu */
  add(vreteno, cyl(16, 20, M.vreteno, 32), 0, NOS0 + 10, 0);                                   /* nos vretena */
  const matica = add(vreteno, cyl(9.5, 11, M.celik, 8), 0, NOS0 - 5.5, 0);                     /* matica ER11 */
  const alatG = new THREE.Group(); vreteno.add(alatG); alatG.position.y = NOS0;
  let alatMesh = [];
  function postaviAlat(Lt, d, vrsta) {
    alatMesh.forEach((m) => { alatG.remove(m); m.geometry.dispose(); }); alatMesh = [];
    const r = d / 2, drzac = Math.max(6, Lt - 14);
    alatMesh.push(add(alatG, cyl(r + 0.1, drzac, M.celik, 16), 0, -11 - drzac / 2, 0));
    const rez = Lt - 11 - drzac;
    alatMesh.push(add(alatG, cyl(r, rez, M.glodalo, 16, vrsta === 'svrdlo' ? 0.2 : r), 0, -11 - drzac - rez / 2, 0));
    for (let i = 0; i < 3; i++) { const s = add(alatG, box(0.4, rez * 0.7, d * 1.02, M.aluT), 0, -11 - drzac - rez * 0.45, 0); s.rotation.y = i * 1.05; alatMesh.push(s); }
    alatMesh.forEach((m) => { m.userData.dio = 'vreteno'; });
  }
  postaviAlat(24, 3, 'glodalo');
  reg('glava', 'Glava — os Z', glavaZ);
  reg('vreteno', 'Vreteno ER11 i alat', vreteno);

  /* ---------------------------------------------------------------- kabina (antracit, prozor prema gore) */
  const kabina = new THREE.Group(); korijen.add(kabina);
  const ZF = KZ + KD / 2;                                                                        /* prednja ravnina */
  add(kabina, box(KW, KH, 20, M.antracit), 0, DNO + KH / 2, KZ - KD / 2 + 10);                 /* stražnja stijenka */
  for (const sx of [-1, 1]) add(kabina, box(20, KH, KD, M.antracit), sx * (KW / 2 - 10), DNO + KH / 2, KZ);   /* bočne stijenke */
  const TRAKA = 110;                                                                            /* donja prednja traka */
  add(kabina, box(KW, TRAKA, 20, M.antracit), 0, DNO + TRAKA / 2, ZF - 10);
  add(kabina, natpis('', 160, 56, '#ffffff', '#f4f4f4'), -200, DNO + TRAKA / 2, ZF + 0.6);     /* mjesto naljepnice upozorenja lijevo (prazno — bez tuđih znakova) */
  add(kabina, box(160, 12, 0.5, mat(0xd42a2a)), -200, DNO + TRAKA / 2 + 22, ZF + 0.7);
  add(kabina, natpis('', 130, 56, '#ffffff', '#f4f4f4'), 200, DNO + TRAKA / 2, ZF + 0.6);      /* mjesto naljepnice desno (prazno) */
  /* lijeva strana: ventilator i natpis DESKTOP MILL (naš, bez logotipa) */
  { const v = add(kabina, cyl(44, 4, M.crna2, 32), -KW / 2 - 1, DNO + KH - 140, KZ + 120); v.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const t = add(kabina, new THREE.Mesh(new THREE.TorusGeometry(8 + i * 8, 1.2, 6, 32), M.aluT), -KW / 2 - 3.5, DNO + KH - 140, KZ + 120); t.rotation.y = Math.PI / 2; }
    const n = add(kabina, natpis('DESKTOP\nMILL', 110, 70, '#ffffff', '#c8201e', 34, 700), -KW / 2 - 1, DNO + KH - 140, KZ - 60); n.rotation.y = -Math.PI / 2; }
  /* stražnja strana: natpisna pločica (prazna), priključak napajanja, ventilator, priključci upravljanja */
  const ormar = new THREE.Group(); korijen.add(ormar);
  { const z = KZ - KD / 2 - 0.6;
    const pl = add(ormar, natpis('', 120, 80, '#777', '#c9ccce'), 200, DNO + 160, z); pl.rotation.y = Math.PI;
    const n2 = add(ormar, natpis('CONTROL CBL 1      CONTROL CBL 2', 170, 14, '#e8eef1', '#2b2e31', 13, 500), -120, DNO + 120, z); n2.rotation.y = Math.PI;
    for (const x of [-150, -90]) { const c = add(ormar, cyl(10, 8, M.crna, 16), x, DNO + 95, z - 3); c.rotation.x = Math.PI / 2; }
    add(ormar, box(40, 22, 10, M.crna), 40, DNO + 95, z - 4);
    const v = add(ormar, cyl(40, 4, M.crna2, 32), 230, DNO + 90, z - 1); v.rotation.x = Math.PI / 2; }
  reg('kabina', 'Kabina', kabina);
  reg('ormar', 'Stražnja strana: napajanje i priključci upravljanja', ormar);
  /* vrata = poklopac: prednji panel s prozorom + krov, šarke na stražnjem gornjem rubu kabine — podižu se prema gore i natrag */
  const ZB = KZ - KD / 2;                                                                       /* stražnja ravnina kabine */
  const vrata = new THREE.Group(); korijen.add(vrata); vrata.position.set(0, VRH, ZB + 10);       /* os šarki: stražnji gornji rub */
  const VH = KH - TRAKA;                                                                        /* visina prednjeg panela (od vrha trake do krova) */
  add(vrata, box(KW, 20, KD - 20, M.antracit), 0, -10, (KD - 20) / 2);                          /* krov (dio poklopca) */
  for (const sx of [-1, 1]) add(vrata, cyl(9, 24, M.crna, 16), sx * 300, 12, 60);               /* osovine / graničnici šarki na vrhu straga */
  const svjetlo = add(vrata, box(300, 8, 24, mat(0xfff4d6, { emissive: 0xfff0c0, emissiveIntensity: 0 })), 0, -24, KD - 120); svjetlo.userData.dio = 'vrata';
  { const okvir = new THREE.Shape(); okvir.moveTo(-KW / 2, -VH); okvir.lineTo(KW / 2, -VH); okvir.lineTo(KW / 2, 0); okvir.lineTo(-KW / 2, 0); okvir.lineTo(-KW / 2, -VH);
    const r = new THREE.Path(); const px = KW / 2 - 70, py0 = -VH + 70, py1 = -60, k = 60;                         /* osmerokutni prozor */
    r.moveTo(-px + k, py0); r.lineTo(px - k, py0); r.lineTo(px, py0 + k); r.lineTo(px, py1 - k); r.lineTo(px - k, py1); r.lineTo(-px + k, py1); r.lineTo(-px, py1 - k); r.lineTo(-px, py0 + k); r.lineTo(-px + k, py0);
    okvir.holes.push(r);
    const g = new THREE.ExtrudeGeometry(okvir, { depth: 20, bevelEnabled: false }); g.translate(0, 0, KD - 20);
    const panel = new THREE.Mesh(g, M.antracit); vrata.add(panel);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(2 * px, py1 - py0), M.staklo); st.position.set(0, (py0 + py1) / 2, KD - 10); vrata.add(st);
    cylX(vrata, 7, 180, M.inox, 0, -VH + 22, KD + 8, 14); for (const sx of [-1, 1]) cylZ(vrata, 7, 20, M.inox, sx * 90, -VH + 22, KD - 2, 14);   /* ručka na dnu prednjeg panela */
  }
  reg('vrata', 'Zaštitna vrata — poklopac s prozorom (podiže se prema gore)', vrata);

  /* ---------------------------------------------------------------- privjesak upravljanja — zasebna jedinica na klupi desno od stroja */
  const privjesak = new THREE.Group(); korijen.add(privjesak);
  const PW = 360, PH = 430, PD = 220;
  privjesak.position.set(KW / 2 + 60 + PW / 2, DNO + 14, ZF - PD / 2 - 40); privjesak.rotation.y = -0.18;
  add(privjesak, box(PW, PH, PD, M.privjesak), 0, PH / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(privjesak, cyl(10, 14, M.crna, 12), sx * (PW / 2 - 30), -7, sz * (PD / 2 - 30));   /* nožice */
  { const r = 11, h = 70; for (const sx of [-1, 1]) add(privjesak, cyl(r, h, M.inox, 16), sx * 110, PH + h / 2 - 4, -20);                  /* ručka */
    cylX(privjesak, r, 220 + 2 * r, M.inox, 0, PH + h - 4, -20, 16); }
  add(privjesak, box(PW - 16, PH - 16, 2, M.privjesakT), 0, PH / 2, PD / 2 + 1);                 /* prednja ploča */
  const zasC = document.createElement('canvas'); zasC.width = 384; zasC.height = 288; const zasT = new THREE.CanvasTexture(zasC);
  const zaslon = add(privjesak, new THREE.Mesh(new THREE.PlaneGeometry(210, 158), new THREE.MeshBasicMaterial({ map: zasT })), 50, PH - 110, PD / 2 + 2.6);
  add(privjesak, box(222, 170, 1, M.crna), 50, PH - 110, PD / 2 + 2.2);                          /* okvir zaslona */
  /* tipkovnica kao tekstura (polje tipki u bojama kao na stvarnom privjesku; nazivi se ne čitaju) */
  { const c = document.createElement('canvas'); c.width = 512; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#c1c4c0'; g.fillRect(0, 0, 512, 300);
    const key = (x, y, w, h, b) => { g.fillStyle = b; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + h - 2, w, 2); };
    key(8, 8, 46, 16, '#e07a2a'); key(58, 8, 30, 16, '#4aa3d8'); key(92, 8, 30, 16, '#4aa3d8');                                           /* RESET, POWER UP, RECOVER */
    for (let i = 0; i < 4; i++) key(8 + i * 30, 30, 26, 16, '#9c9f9b');                                                                     /* F1–F4 */
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) key(140 + i * 30, 8 + r * 22, 26, 16, '#9c9f9b');                                /* DISPLAY */
    for (let r = 0; r < 6; r++) for (let i = 0; i < 5; i++) key(270 + i * 46, 8 + r * 22, 42, 16, i === 0 ? '#bfe0f0' : '#9c9f9b');         /* MODE */
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) key(8 + i * 30, 60 + r * 22, 26, 16, (r + i) % 2 ? '#4aa3d8' : '#9c9f9b');      /* JOG */
    key(170, 60, 26, 16, '#4aa3d8'); key(200, 60, 26, 16, '#9c9f9b'); key(230, 60, 26, 16, '#4aa3d8'); key(170, 82, 26, 16, '#9c9f9b'); key(230, 82, 26, 16, '#9c9f9b'); key(170, 104, 26, 16, '#4aa3d8'); key(200, 104, 26, 16, '#9c9f9b'); key(230, 104, 26, 16, '#4aa3d8');   /* CURSOR */
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) key(8 + i * 30, 150 + r * 22, 26, 16, r === 3 ? (i === 1 ? '#e8a2a2' : i < 3 ? '#a6d8b0' : '#9c9f9b') : '#9c9f9b');   /* OVERRIDES */
    for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) key(150 + i * 36, 150 + r * 22, 32, 16, r === 0 && i === 0 ? '#e8d57a' : '#9c9f9b');   /* ALPHA */
    const t = new THREE.CanvasTexture(c); add(privjesak, new THREE.Mesh(new THREE.PlaneGeometry(260, 150), new THREE.MeshBasicMaterial({ map: t })), 30, 100, PD / 2 + 2.6); }
  const estop = add(privjesak, cyl(17, 12, M.crvena, 28, 15), -130, PH - 150, PD / 2 + 8); estop.rotation.x = Math.PI / 2; estop.userData.klik = 'estop';
  add(privjesak, cyl(23, 3, M.zuta, 28), -130, PH - 150, PD / 2 + 3).rotation.x = Math.PI / 2;
  add(privjesak, natpis('EMERGENCY STOP', 70, 8, '#333', '#c1c4c0', 30, 600), -130, PH - 118, PD / 2 + 2.7);
  const gumbOn = add(privjesak, cyl(9, 6, M.zelena, 20), -150, PH - 60, PD / 2 + 4); gumbOn.rotation.x = Math.PI / 2; gumbOn.userData.klik = 'powerOn';
  const gumbOff = add(privjesak, cyl(9, 6, M.crvena, 20), -108, PH - 60, PD / 2 + 4); gumbOff.rotation.x = Math.PI / 2; gumbOff.userData.klik = 'powerOff';
  add(privjesak, natpis('POWER ON', 40, 8, '#333', '#c1c4c0', 36, 600), -150, PH - 40, PD / 2 + 2.7); add(privjesak, natpis('POWER OFF', 40, 8, '#333', '#c1c4c0', 36, 600), -108, PH - 40, PD / 2 + 2.7);
  add(privjesak, natpis('HANDLE JOG', 60, 8, '#333', '#c1c4c0', 34, 600), -130, PH - 200, PD / 2 + 2.7);
  const kotac = add(privjesak, cyl(30, 12, M.aluT, 40), -130, PH - 245, PD / 2 + 8); kotac.rotation.x = Math.PI / 2; kotac.userData.klik = 'kotac';
  add(privjesak, cyl(20, 4, M.privjesak, 32), -130, PH - 245, PD / 2 + 14).rotation.x = Math.PI / 2;
  add(privjesak, cyl(2.5, 6, M.crna, 10), -130 + 24, PH - 245, PD / 2 + 14).rotation.x = Math.PI / 2;
  const cs = add(privjesak, cyl(9, 6, M.zelena, 20), -150, 40, PD / 2 + 4); cs.rotation.x = Math.PI / 2; cs.userData.klik = 'cycleStart';
  const fh = add(privjesak, cyl(9, 6, M.crvena, 20), -108, 40, PD / 2 + 4); fh.rotation.x = Math.PI / 2;
  add(privjesak, natpis('CYCLE START', 40, 8, '#333', '#c1c4c0', 30, 600), -150, 60, PD / 2 + 2.7); add(privjesak, natpis('FEED HOLD', 40, 8, '#333', '#c1c4c0', 30, 600), -108, 60, PD / 2 + 2.7);
  /* kabeli privjeska prema stražnjoj strani stroja */
  const kabel = (tocke, r = 3, m = M.crna) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tocke.map((p) => new THREE.Vector3(...p))), 40, r, 8, false), m);
  korijen.add(kabel([[KW / 2 + 60 + PW / 2, DNO + 40, ZF - PD - 40], [KW / 2 + 90, DNO + 10, KZ - KD / 2 - 60], [-90, DNO + 20, KZ - KD / 2 - 60], [-90, DNO + 95, KZ - KD / 2 - 8]], 3));
  reg('privjesak', 'Privjesak upravljanja NGC (zasebna jedinica s ručkom)', privjesak);

  /* ---------------------------------------------------------------- škripac i stezne pandže (na stolu) */
  const skripac = new THREE.Group(); stol.add(skripac);
  const pandze = new THREE.Group(); stol.add(pandze);
  const obrGrupa = new THREE.Group(); stol.add(obrGrupa);
  const pribor = { skripac: null, pandze: null };
  function isprazni(g) { while (g.children.length) { const c = g.children.pop(); c.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); } }
  function skripacZa(L, W, H, xc = 0, yc = 0, pneumatski = false) {
    isprazni(skripac); isprazni(pandze); skripac.visible = true; pandze.visible = false;
    const zc = -yc, sir = Math.max(W, 20), top = Math.max(24, 10 + H), bot = top - H;
    add(skripac, box(150, 8, 150, M.plavaKut), xc, 4, zc - 10);
    for (const sx of [-1, 1]) add(skripac, box(14, 4, 30, M.utor), xc + sx * 62, 8.5, zc - 10);
    add(skripac, box(110, 12, 24, M.plavaKut), xc, 14, zc - sir / 2 - 12);
    add(skripac, box(104, 10, 3, M.celik), xc, 15, zc - sir / 2 - 1.5);
    add(skripac, box(110, 12, 24, M.plavaKut), xc, 14, zc + sir / 2 + 12);
    add(skripac, box(104, 10, 3, M.celik), xc, 15, zc + sir / 2 + 1.5);
    add(skripac, box(110, 12, 20, M.plavaKut), xc, 14, zc - sir / 2 - 34);
    if (pneumatski) { cylZ(skripac, 16, 60, M.pneu, xc, 14, zc + sir / 2 + 60, 20); add(skripac, box(6, 6, 20, M.crna), xc + 40, 14, zc + sir / 2 + 88); }
    else { cylZ(skripac, 6, 60, M.celik, xc, 14, zc + sir / 2 + 50, 16); cylX(skripac, 3, 60, M.celik, xc, 14, zc + sir / 2 + 78, 10); }
    for (const sz of [-1, 1]) add(skripac, box(Math.min(L, 100), bot - 8, 5, M.celik), xc, 8 + (bot - 8) / 2, zc + sz * (W / 2 - 4));
    pribor.skripac = { celjusti: [
      { x0: xc - 55, x1: xc + 55, y0: yc + sir / 2, y1: yc + sir / 2 + 24, z0: 8, z1: 20 },
      { x0: xc - 55, x1: xc + 55, y0: yc - sir / 2 - 24, y1: yc - sir / 2, z0: 8, z1: 20 }], dno: 8, bot, xc, yc, pneumatski };
    skripac.traverse((m) => { if (m.isMesh) m.userData.dio = 'skripac'; });
    return { x0: xc - L / 2, y0: yc - W / 2, bot, top };
  }
  function pandzeZa(L, W, H, xc = 0, yc = 0) {
    isprazni(skripac); isprazni(pandze); skripac.visible = false; pandze.visible = true;
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
  function bezPribora() { isprazni(skripac); isprazni(pandze); skripac.visible = pandze.visible = false; pribor.skripac = pribor.pandze = null; }
  reg('skripac', 'Niski škripac', skripac);
  reg('pandze', 'Stezne pandže i podložna ploča', pandze);

  /* ---------------------------------------------------------------- oznake nultočaka */
  function trokut(boja, d = 50) {
    const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: boja, depthTest: false });
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]].forEach((v, i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, d, 8), m); c.renderOrder = 5; c.position.set(v[0] * d / 2, v[1] * d / 2, v[2] * d / 2); if (i === 0) c.rotation.z = Math.PI / 2; if (i === 1) c.rotation.x = Math.PI / 2; g.add(c); });
    const k = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), m); k.renderOrder = 5; g.add(k); return g;
  }
  const nulaM = trokut(0xff4d3a, 60); stol.add(nulaM); nulaM.visible = false; nulaM.position.set(GEO.XT0, NOS0, -GEO.YT0);
  const nulaW = trokut(0x2ecad4, 45); stol.add(nulaW); nulaW.visible = false;
  const nultocke = new THREE.Group(); korijen.add(nultocke);
  reg('nultocke', 'Nultočka stroja i nultočka obratka', nultocke, nulaM, nulaW);

  /* ---------------------------------------------------------------- zaslon privjeska */
  function zaslonTekst(ukljucen, nacin, osi) {
    const g = zasC.getContext('2d'); g.fillStyle = ukljucen ? '#0d1b26' : '#05080b'; g.fillRect(0, 0, 384, 288);
    if (ukljucen) {
      g.fillStyle = '#1f3b52'; g.fillRect(0, 0, 384, 26); g.fillStyle = '#e8f1f7'; g.font = '700 15px "IBM Plex Sans",Arial'; g.textAlign = 'left'; g.fillText(nacin || 'MEM', 10, 18);
      g.fillStyle = '#142a3a'; g.fillRect(8, 36, 220, 190); g.fillStyle = '#9fb3bb'; for (let i = 0; i < 10; i++) g.fillRect(16, 46 + i * 18, 60 + (i * 53) % 120, 6);
      g.fillStyle = '#0a1420'; g.fillRect(238, 36, 138, 110);
      ['X', 'Y', 'Z'].forEach((o, i) => { g.fillStyle = '#cfd8dc'; g.font = '700 16px monospace'; g.textAlign = 'left'; g.fillText(o, 246, 62 + i * 30); g.fillStyle = '#3bff6e'; g.textAlign = 'right'; g.fillText(osi ? osi[i] : '0.000', 368, 62 + i * 30); });
      g.fillStyle = '#1f3b52'; g.fillRect(0, 262, 384, 26);
    }
    zasT.needsUpdate = true;
  }
  zaslonTekst(false);

  /* ---------------------------------------------------------------- položaj osi, vrata, alat */
  function postaviOsi(X, Y, Z) { saonice.position.z = Y + GEO.YT0; stol.position.x = -(X + GEO.XT0); glavaZ.position.y = Z; }
  function vrataNa(u) { vrata.rotation.x = -u * 1.35; }                                        /* podizanje poklopca oko stražnjeg gornjeg ruba (≈ 77°) */
  let kutAlata = 0;
  function okreniAlat(kut) { kutAlata = kut; alatG.rotation.y = kut; matica.rotation.y = kut; }
  postaviOsi(-76, -127, 0);

  return {
    korijen, postolje, saonice, stol, stup, glavaZ, vreteno, alatG, skripac, pandze, obrGrupa, kabina, vrata, privjesak, ormar, nulaM, nulaW, dijelovi, M, GEO,
    klik: { estop, powerOn: gumbOn, powerOff: gumbOff, kotac, cycleStart: cs }, svjetlo, zaslon, pribor,
    postaviOsi, okreniAlat, postaviAlat, skripacZa, pandzeZa, bezPribora, zaslonTekst, vrataNa, get kutAlata() { return kutAlata; },
    uStol: (x, y, z) => new THREE.Vector3(x, z, -y)
  };
}
