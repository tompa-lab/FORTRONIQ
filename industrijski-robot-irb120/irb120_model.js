/* FORTRONIQ · Industrijski robot ABB IRB 120 — 3D model za stranicu „Upoznavanje robota”.
   Vanjski oblik: zglobni GLB iz područja ar/irb120 (geometrija proizvođača pojednostavljena na ≈ 60 000 trokuta).
   Unutrašnjost (motori, prijenosnici, remeni, kočnice, resolveri, ploča enkodera, baterija, kabelski snop),
   upravljački ormar IRC5 Compact i privjesak FlexPendant su NAŠ NAČELNI CRTEŽ: raspored prema popisu dijelova
   u priručniku proizvoda, mjere i smještaj su procjena.
   Koordinate scene: metri, os y gore, x robota = x scene (naprijed), y robota = −z scene; postolje na y = 0.
   API: napraviIRB120(THREE, GLTFLoader, opcije) → Promise<{ korijen, zglobovi, postavi, tcp, dijelovi, rastavi,
        unutrasnjost, prihvatnica, ormar, privjesak, kabeli, pomocni, osi, q, NAZIVI_OSI }>
   © ForTroniQ d.o.o. */

export const NAZIVI_OSI = ['Os 1', 'Os 2', 'Os 3', 'Os 4', 'Os 5', 'Os 6'];
/* radni opseg osi [°] (specifikacija proizvoda IRB 120) */
export const OPSEG = [[-165, 165], [-110, 110], [-110, 70], [-160, 160], [-120, 120], [-400, 400]];
/* položaji za prikaz (ABB kutovi u stupnjevima) */
export const POLOZAJI = {
  nula: [0, 0, 0, 0, 0, 0],
  pocetni: [0, 0, 0, 0, 90, 0],                 /* nadlaktica vodoravno, prirubnica gleda prema dolje */
  ispruzen: [0, 0, -90, 0, 0, 0],               /* gornja ruka uspravno */
  sklopljen: [0, -30, 60, 0, 60, 0],            /* naš primjer složenog položaja */
  /* kalibracijski položaj prema priručniku: A1 −170,2°, A2 −115,1°, A3 +75,8°, A4 −174,7°, A5 −90°, A6 +90°;
     prikazuje se ograničen na radni opseg osi (vidi KALIBRACIJSKI_PRIRUCNIK) */
  kalibracijski: [-165, -110, 70, -160, -90, 90]
};
export const KALIBRACIJSKI_PRIRUCNIK = [-170.2, -115.1, 75.8, -174.7, -90, 90];
/* os vrtnje svakog čvora j1…j6 u sceni i predznak (kao u ar/irb120) */
const OS = [['y', 1], ['z', -1], ['z', -1], ['x', 1], ['z', -1], ['x', 1]];
/* koliko puta se rotor motora (u prikazu) okreće brže od osi */
const BRZINA_ROTORA = 30;

export async function napraviIRB120(THREE, GLTFLoader, opcije = {}) {
  const O = Object.assign({ glb: '../ar/irb120/irb120.glb', ormar: true, privjesak: true, kabel: true }, opcije);
  const gltf = await new Promise((ok, ne) => new GLTFLoader().load(O.glb, ok, undefined, ne));
  const korijen = new THREE.Group(); korijen.name = 'irb120-scena';
  const robot = gltf.scene.getObjectByName('irb120') || gltf.scene;
  korijen.add(gltf.scene);

  /* ---------------------------------------------------------------- materijali */
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.15 }, o));
  const M = {
    motor: mat(0x2c3136, { roughness: 0.55, metalness: 0.3 }), motorK: mat(0x40474e, { roughness: 0.5, metalness: 0.3 }),
    rotor: mat(0xb87333, { metalness: 0.6, roughness: 0.35 }), celik: mat(0xa9b1b7, { metalness: 0.55, roughness: 0.3 }),
    celikT: mat(0x7c858b, { metalness: 0.5, roughness: 0.36 }), prijenosnik: mat(0x8fa7b3, { metalness: 0.5, roughness: 0.32 }),
    kocnica: mat(0xd9631e, { roughness: 0.45 }), resolver: mat(0x2f8f5b, { roughness: 0.5 }), remen: mat(0x1b1d1f, { roughness: 0.9 }),
    zeleno: mat(0x1f7a3d, { roughness: 0.6 }), zelenoS: mat(0x2b9a52, { roughness: 0.6 }), cip: mat(0x1a1d20, { roughness: 0.5 }),
    baterija: mat(0xd8b326, { roughness: 0.5 }), kabel: mat(0x33383c, { roughness: 0.8 }), zrak: mat(0x2f6fb5, { roughness: 0.55 }),
    oznaka: mat(0xf29a1a, { roughness: 0.45, emissive: 0x3a2000 }), prikljucak: mat(0x6d757b, { metalness: 0.5, roughness: 0.35 }),
    ormar: mat(0xd9dcdd, { roughness: 0.6, metalness: 0.08 }), ormarT: mat(0x3a4045, { roughness: 0.6 }), ploca: mat(0xb9c0c4, { metalness: 0.5, roughness: 0.4 }),
    crveno: mat(0xd4261c, { roughness: 0.4 }), zuto: mat(0xf2c21a, { roughness: 0.45 }), bijelo: mat(0xf2f3f3, { roughness: 0.4, emissive: 0x333333 }),
    crno: mat(0x17191b, { roughness: 0.75 }), alu: mat(0xcfd4d8, { metalness: 0.42, roughness: 0.38 }), guma: mat(0x1e2124, { roughness: 0.95 }),
    privjesak: mat(0x3b4148, { roughness: 0.6 }), privjesakS: mat(0x9aa3a9, { roughness: 0.5 }), plavo: mat(0x2b6fb0, { roughness: 0.5 }),
    ledZ: mat(0x33dd66, { emissive: 0x22aa44 }), narancasto: mat(0xe8742a, { roughness: 0.5 })
  };
  const zaslonMat = (() => {
    if (typeof document === 'undefined') return mat(0x1b2a38);
    const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
    g.fillStyle = '#e9eef2'; g.fillRect(0, 0, 256, 192); g.fillStyle = '#2b6fb0'; g.fillRect(0, 0, 256, 22);
    g.fillStyle = '#ffffff'; g.font = 'bold 12px sans-serif'; g.fillText('ABB', 8, 15); g.fillText('Manual · Motors Off', 120, 15);
    g.fillStyle = '#b9c4cc'; for (let k = 0; k < 6; k++) g.fillRect(12, 34 + k * 22, 150, 14);
    g.fillStyle = '#d3dce2'; g.fillRect(176, 34, 68, 130); g.fillStyle = '#7d8b95'; g.font = '10px sans-serif'; g.fillText('jog', 196, 52);
    g.fillStyle = '#4b5a64'; g.fillRect(0, 172, 256, 20);
    const t = new THREE.CanvasTexture(c); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35 });
  })();

  /* ---------------------------------------------------------------- pomoćne funkcije */
  const grupa = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const add = (p, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); p.add(m); return m; };
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  /* valjak duž osi 'x' | 'y' | 'z' */
  function cyl(r, L, m, os = 'y', seg = 28, r2) {
    const g = new THREE.CylinderGeometry(r2 == null ? r : r2, r, L, seg);
    if (os === 'x') g.rotateZ(-Math.PI / 2); else if (os === 'z') g.rotateX(Math.PI / 2);
    return new THREE.Mesh(g, m);
  }
  function prsten(r1, r2, L, m, os = 'y', seg = 36) {
    const s = new THREE.Shape(); s.absarc(0, 0, r2, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, r1, 0, Math.PI * 2, true); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false, curveSegments: seg }); g.translate(0, 0, -L / 2);
    if (os === 'x') g.rotateY(Math.PI / 2); else if (os === 'y') g.rotateX(-Math.PI / 2);
    return new THREE.Mesh(g, m);
  }
  const V = (os) => (os === 'x' ? new THREE.Vector3(1, 0, 0) : os === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1));
  const cijev = (tocke, r, m, zatvoreno = false) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tocke.map((p) => new THREE.Vector3(...p)), zatvoreno), zatvoreno ? 80 : 48, r, 8, zatvoreno), m);

  /* registar dijelova */
  const dijelovi = new Map();
  function dio(id, naziv, ...obj) {
    let d = dijelovi.get(id); if (!d) { d = { naziv, objekti: [] }; dijelovi.set(id, d); }
    obj.flat(Infinity).forEach((o) => { if (o) { d.objekti.push(o); o.userData.dio = id; } });
    return d;
  }

  /* ---------------------------------------------------------------- čvorovi GLB-a */
  const zglobovi = [1, 2, 3, 4, 5, 6].map((k) => robot.getObjectByName('j' + k));
  const L = ['baza', 'clanak1', 'clanak2', 'clanak3', 'clanak4', 'clanak5', 'clanak6'].map((n) => robot.getObjectByName('l_' + n));
  const ljuske = [];
  L.forEach((o) => { if (!o) return; o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.castShadow = false; ljuske.push(m); } }); });
  const alatCvorovi = ['prst_p', 'prst_n', 'l_alat_tijelo'].map((n) => robot.getObjectByName(n)).filter(Boolean);
  /* omot prihvatnice: stranica mijenja vidljivost pojedinih mesheva, pa se prihvatnica skriva preko roditeljske grupe */
  const alatOmot = new THREE.Group(); alatOmot.name = 'prihvatnica'; zglobovi[5].add(alatOmot);
  alatCvorovi.forEach((o) => { alatOmot.attach(o); });
  alatOmot.visible = false;
  /* TCP bez alata: središte prirubnice (tool0), 72 mm ispred osi 5 */
  const tcp = new THREE.Object3D(); tcp.name = 'tool0'; tcp.position.set(0.072, 0, 0); zglobovi[5].add(tcp);
  const tcpAlata = robot.getObjectByName('tcp') || null;

  dio('baza', 'Postolje (base)', L[0]);
  dio('okretnoKuciste', 'Okretno kućište (swing housing)', L[1]);
  dio('donjaRuka', 'Donja ruka (lower arm)', L[2]);
  dio('gornjaRuka', 'Gornja ruka (upper arm)', L[3]);
  dio('kucisteZapesca', 'Kućište zapešća (wrist housing)', L[4]);
  dio('nagibnoKuciste', 'Nagibno kućište (tilt house)', L[5]);
  dio('prirubnica', 'Prirubnica alata (tool flange)', L[6]);
  dio('prihvatnica', 'Prihvatnica (naš primjer alata)', alatCvorovi);

  /* ---------------------------------------------------------------- unutrašnjost: pogoni osi (načelni prikaz) */
  const U = [];          /* grupe unutrašnjosti po osi 0…5; 6 = postolje (ploča enkodera, baterija, kabelski snop) */
  const rotori = [];     /* { g, os, i } */
  const osi = [];        /* za kameru: { cvor, os (lokalno), sredina (lokalno), r } */
  const root = robot;    /* nepomični dio (postolje) */
  for (let i = 0; i <= 6; i++) U.push(null);
  function uGrupa(i, roditelj) { const g = grupa(roditelj); g.name = 'unutra' + (i + 1); g.visible = false; (U[i] = U[i] || []).push(g); return g; }

  /* jedan pogon: prijenosnik u točki P (os 'os'), motor uz njega (smjer s) ili odmaknut s remenom */
  function pogon(i, roditelj, o) {
    const g = uGrupa(i, roditelj), n = i + 1, os = o.os, e = V(os);
    const P = new THREE.Vector3(...o.P);
    /* prijenosnik */
    const pr = grupa(g, P.x, P.y, P.z);
    add(pr, prsten(o.rG * 0.45, o.rG, o.LG, M.prijenosnik, os));
    add(pr, prsten(o.rG * 0.25, o.rG * 0.62, o.LG * 1.12, M.celikT, os));
    dio('prijenosnik' + n, 'Prijenosnik osi ' + n, pr);
    /* motor */
    const Pm = o.Pm ? new THREE.Vector3(...o.Pm) : P.clone().add(e.clone().multiplyScalar(o.s * (o.LG / 2 + 0.004)));
    const mo = grupa(g, Pm.x, Pm.y, Pm.z);
    const c = (d) => e.clone().multiplyScalar(o.s * d);
    const tijelo = add(mo, cyl(o.rM, o.LM, M.motor, os, 28), ...c(o.LM / 2).toArray());
    add(mo, cyl(o.rM * 1.04, o.LM * 0.12, M.motorK, os, 28), ...c(o.LM * 0.06).toArray());
    const rot = grupa(mo, ...c(o.LM / 2).toArray());
    add(rot, cyl(o.rM * 0.5, o.LM * 1.06, M.rotor, os, 18));
    add(rot, box(...(os === 'x' ? [o.LM * 1.07, o.rM * 0.18, o.rM * 1.02] : os === 'y' ? [o.rM * 1.02, o.LM * 1.07, o.rM * 0.18] : [o.rM * 1.02, o.rM * 0.18, o.LM * 1.07]), M.celik));
    rotori.push({ g: rot, os, i });
    void tijelo;
    dio('motor' + n, 'Motor osi ' + n, mo);
    /* kočnica i resolver na stražnjem kraju motora */
    const kc = grupa(mo, ...c(o.LM + 0.004).toArray()); add(kc, cyl(o.rM * 0.96, 0.006, M.kocnica, os, 28)); add(kc, cyl(o.rM * 0.5, 0.0072, M.celikT, os, 18));
    dio('kocnica' + n, 'Kočnica motora osi ' + n, kc);
    const rs = grupa(mo, ...c(o.LM + 0.014).toArray()); add(rs, cyl(o.rM * 0.62, 0.012, M.resolver, os, 22)); add(rs, box(...(os === 'x' ? [0.004, o.rM * 0.5, o.rM * 0.3] : os === 'y' ? [o.rM * 0.5, 0.004, o.rM * 0.3] : [o.rM * 0.5, o.rM * 0.3, 0.004]), M.cip), ...c(0.008).toArray());
    dio('resolver' + n, 'Resolver (mjerni sustav) osi ' + n, rs);
    /* remenski prijenos (osi 3 i 5): mala remenica na motoru, velika na prijenosniku, remen */
    if (o.remen) {
      const rm = grupa(g); const zr = o.remen.ravnina;   /* ravnina remena: koordinata duž osi */
      const p1 = Pm.clone(), p2 = P.clone(); const os2 = os === 'z' ? 'z' : os;
      const k = os2 === 'z' ? 2 : os2 === 'x' ? 0 : 1;
      p1.setComponent(k, zr); p2.setComponent(k, zr);
      add(rm, cyl(o.remen.r1, 0.012, M.celik, os2, 24), ...p1.toArray());
      add(rm, cyl(o.remen.r2, 0.012, M.celik, os2, 32), ...p2.toArray());
      /* zatvorena putanja remena oko obje remenice */
      const d = p2.clone().sub(p1), lenD = d.length(); d.normalize();
      const n2 = new THREE.Vector3().crossVectors(V(os2), d).normalize();
      const pts = [];
      for (let a = 0; a <= 16; a++) { const t = Math.PI / 2 + a / 16 * Math.PI; pts.push(p1.clone().add(d.clone().multiplyScalar(Math.cos(t) * (o.remen.r1 + 0.0025))).add(n2.clone().multiplyScalar(Math.sin(t) * (o.remen.r1 + 0.0025))).toArray()); }
      for (let a = 0; a <= 16; a++) { const t = -Math.PI / 2 + a / 16 * Math.PI; pts.push(p2.clone().add(d.clone().multiplyScalar(Math.cos(t) * (o.remen.r2 + 0.0025))).add(n2.clone().multiplyScalar(Math.sin(t) * (o.remen.r2 + 0.0025))).toArray()); }
      void lenD;
      const rem = cijev(pts, 0.0028, M.remen, true); rm.add(rem);
      dio('remen' + n, 'Zupčasti remen osi ' + n, rm);
    }
    osi[i] = { cvor: roditelj, os: V(os), sredina: P.clone(), r: Math.max(o.rG, o.rM) * 1.6 };
    return g;
  }
  /* os 1: motor i prijenosnik koaksijalno u postolju (os okomita) */
  pogon(0, root, { os: 'y', P: [0, 0.148, 0], rG: 0.05, LG: 0.026, rM: 0.036, LM: 0.07, s: -1 });
  /* os 2: motor i prijenosnik koaksijalno u okretnom kućištu (os vodoravna, poprečno) */
  pogon(1, zglobovi[0], { os: 'z', P: [0, 0.29, 0.062], rG: 0.046, LG: 0.026, rM: 0.032, LM: 0.068, s: -1 });
  /* os 3: prijenosnik u donjoj ruci kod lakta, motor uz rame, zupčasti remen */
  pogon(2, zglobovi[1], { os: 'z', P: [0, 0.27, 0.062], Pm: [0, 0.075, 0.07], rG: 0.04, LG: 0.022, rM: 0.027, LM: 0.06, s: -1, remen: { ravnina: 0.088, r1: 0.011, r2: 0.03 } });
  /* os 4: motor i prijenosnik u gornjoj ruci, os uzdužna */
  pogon(3, zglobovi[2], { os: 'x', P: [0.128, 0.07, 0], rG: 0.034, LG: 0.022, rM: 0.027, LM: 0.075, s: -1 });
  /* os 5: motor u kućištu zapešća, zupčasti remen do prijenosnika na osi 5 */
  pogon(4, zglobovi[3], { os: 'z', P: [0.302, 0, -0.046], Pm: [0.212, 0.008, -0.042], rG: 0.022, LG: 0.012, rM: 0.019, LM: 0.05, s: 1, remen: { ravnina: -0.054, r1: 0.008, r2: 0.019 } });
  /* os 6: motor i prijenosnik u nagibnom kućištu, os prema prirubnici */
  pogon(5, zglobovi[4], { os: 'x', P: [0.042, 0, 0], rG: 0.018, LG: 0.012, rM: 0.015, LM: 0.04, s: -1 });

  /* postolje: ploča enkodera, baterija, kabelski snop, priključci */
  const UB = uGrupa(6, root);
  const pe = grupa(UB, -0.14, 0.075, 0); add(pe, box(0.004, 0.07, 0.09, M.zeleno));
  for (let k = 0; k < 4; k++) add(pe, box(0.004, 0.012, 0.014, M.cip), 0.003, -0.02 + k * 0.014, (k % 2 ? 1 : -1) * 0.02);
  add(pe, box(0.01, 0.012, 0.03, M.bijelo), 0.006, 0.03, 0);
  dio('plocaEnkodera', 'Ploča sučelja enkodera (Encoder Interface, XS2)', pe);
  const bat = grupa(UB, -0.17, 0.035, 0.035); add(bat, box(0.026, 0.022, 0.06, M.baterija)); add(bat, box(0.027, 0.006, 0.02, M.crno), 0, 0.012, 0);
  dio('baterija', 'Baterija (pamćenje okretaja)', bat);
  const snop = [];
  snop.push(cijev([[-0.205, 0.05, 0], [-0.12, 0.05, -0.02], [-0.03, 0.08, -0.01], [0, 0.13, 0]], 0.0065, M.kabel));
  UB.add(snop[0]);
  const s1 = cijev([[0, 0.16, 0], [0, 0.24, -0.01], [-0.02, 0.28, -0.05], [-0.03, 0.29, -0.085]], 0.006, M.kabel); uGrupa(6, zglobovi[0]).add(s1); snop.push(s1);
  const s2 = cijev([[-0.03, 0.0, -0.085], [-0.04, 0.13, -0.088], [-0.03, 0.27, -0.08]], 0.006, M.kabel); uGrupa(6, zglobovi[1]).add(s2); snop.push(s2);
  const s3 = cijev([[-0.03, 0.0, -0.06], [-0.055, 0.08, -0.03], [-0.02, 0.115, 0.0], [0.08, 0.115, 0.0], [0.14, 0.095, 0.0]], 0.0055, M.kabel); uGrupa(6, zglobovi[2]).add(s3); snop.push(s3);
  const s4 = cijev([[0.155, 0.03, 0.0], [0.23, 0.035, 0.02], [0.285, 0.022, -0.028]], 0.005, M.kabel); uGrupa(6, zglobovi[3]).add(s4); snop.push(s4);
  dio('kabelskiSnop', 'Unutarnji kabelski snop', snop);

  /* priključci na postolju (vidljivi izvana): R1.MP, R1.SMB, R1.CP/CS i četiri zračna priključka */
  const pr1 = grupa(root, -0.212, 0, 0);
  add(pr1, cyl(0.015, 0.02, M.prikljucak, 'x'), 0, 0.05, 0.035);
  add(pr1, cyl(0.012, 0.02, M.prikljucak, 'x'), 0, 0.05, -0.035);
  dio('prikljucciPostolja', 'Priključci kabela robota R1.MP i R1.SMB', pr1);
  const zp = grupa(root, -0.212, 0, 0);
  add(zp, cyl(0.009, 0.018, M.prikljucak, 'x'), 0, 0.11, -0.035);
  for (let k = 0; k < 4; k++) add(zp, cyl(0.0042, 0.016, M.zrak, 'x', 12), 0, 0.11, 0.0 + k * 0.014);
  dio('zrakIPrikljucci', 'Korisnički priključci na postolju (R1.CP/CS, zrak)', zp);
  /* R3.CP/CS i izlazi zraka na gornjoj ruci */
  const r3 = grupa(zglobovi[2], -0.07, 0.125, 0);
  add(r3, cyl(0.008, 0.016, M.prikljucak, 'y'), 0, 0, -0.014);
  for (let k = 0; k < 4; k++) add(r3, cyl(0.0036, 0.014, M.zrak, 'y', 12), 0, 0, 0.004 + k * 0.009);
  dio('prikljucakR3', 'Korisnički priključci na gornjoj ruci (R3.CP/CS, zrak)', r3);

  /* oznake za kalibraciju (sinkronizacijske oznake) na svakoj osi */
  const oz = [];
  [[root, [0.089, 0.158, 0]], [zglobovi[0], [0.104, 0.17, 0]], [zglobovi[1], [0.06, 0.0, 0.106]], [zglobovi[2], [0.0, 0.02, 0.064]],
   [zglobovi[3], [0.165, 0.058, 0]], [zglobovi[4], [0.0, 0.04, 0.034]], [zglobovi[5], [0.066, 0.019, 0]]].forEach(([p, x]) => { oz.push(add(p, box(0.014, 0.004, 0.004, M.oznaka), ...x)); });
  dio('oznakeKalibracije', 'Oznake za kalibraciju', oz);

  /* ---------------------------------------------------------------- upravljački ormar IRC5 Compact (načelni prikaz) */
  const ormar = { grupa: null, otvori: () => {}, t: 0 };
  const OW = 0.449, OH = 0.31, OD = 0.442, OX = 0.82, OZ = 0.02;
  const ormarUnutra = [];
  if (O.ormar) {
    const g = grupa(korijen, OX, 0, OZ); g.name = 'ormar'; ormar.grupa = g;
    const t = 0.003;
    const tijelo = grupa(g);
    add(tijelo, box(OW, OH - 0.012, t, M.ormar), 0, OH / 2, -OD / 2 + t / 2);           /* stražnja */
    add(tijelo, box(t, OH - 0.012, OD, M.ormar), -OW / 2 + t / 2, OH / 2, 0);
    add(tijelo, box(t, OH - 0.012, OD, M.ormar), OW / 2 - t / 2, OH / 2, 0);
    add(tijelo, box(OW, t, OD, M.ormar), 0, 0.006 + t / 2, 0);                       /* dno */
    for (const x of [-OW / 2 + 0.04, OW / 2 - 0.04]) for (const z of [-OD / 2 + 0.04, OD / 2 - 0.04]) add(tijelo, cyl(0.014, 0.012, M.guma, 'y', 14), x, 0.006, z);
    /* prednja ploča s upravljačkim elementima */
    const pr = grupa(g, 0, 0, OD / 2);
    add(pr, box(OW, OH - 0.012, 0.006, M.ormar), 0, OH / 2, -0.003);
    add(pr, box(0.17, 0.12, 0.002, M.ormarT), -0.1, OH * 0.6, 0.001);
    const gs = grupa(pr, -0.16, OH * 0.6, 0.004); add(gs, cyl(0.028, 0.01, M.zuto, 'z')); add(gs, box(0.012, 0.05, 0.016, M.crveno), 0, 0, 0.01);
    dio('glavnaSklopka', 'Glavna sklopka', gs);
    const pn = grupa(pr, -0.075, OH * 0.66, 0.004); add(pn, cyl(0.014, 0.008, M.crno, 'z')); add(pn, box(0.004, 0.016, 0.01, M.alu), 0, 0, 0.007);
    dio('preklopnikNacina', 'Preklopnik načina rada (ključ)', pn);
    const mo = grupa(pr, -0.075, OH * 0.48, 0.004); add(mo, cyl(0.013, 0.01, M.bijelo, 'z')); add(mo, prsten(0.013, 0.017, 0.006, M.ormarT, 'z'));
    dio('tipkaMotorsOn', 'Tipka Motors On', mo);
    const es = grupa(pr, 0.03, OH * 0.6, 0.004); add(es, cyl(0.032, 0.004, M.zuto, 'z')); add(es, cyl(0.018, 0.012, M.crveno, 'z', 28, 0.022), 0, 0, 0.008);
    dio('gljivaOrmara', 'Gljiva za nužno zaustavljanje na ormaru', es);
    const ok = grupa(pr, 0.11, OH * 0.6, 0.004); add(ok, box(0.034, 0.034, 0.006, M.ormarT)); add(ok, cyl(0.008, 0.008, M.crno, 'z'), 0, 0, 0.005);
    const pok = add(ok, box(0.036, 0.036, 0.003, new THREE.MeshStandardMaterial({ color: 0xbfd6e2, transparent: true, opacity: 0.45, roughness: 0.2 })), 0, 0, 0.011); pok.userData.vlastitiMat = true;
    dio('otpustanjeKocnica', 'Tipka za otpuštanje kočnica (ispod poklopca)', ok);
    for (let k = 0; k < 10; k++) add(pr, box(0.07, 0.003, 0.002, M.ormarT), 0.17, 0.05 + k * 0.016, 0.001);      /* rešetka za zrak */
    /* gornji poklopac (otvara se) */
    const pkS = grupa(g, 0, OH, -OD / 2); ormar.poklopac = pkS;
    add(pkS, box(OW, 0.006, OD, M.ormar), 0, -0.003, OD / 2);
    add(pkS, box(OW * 0.6, 0.002, 0.04, M.ormarT), 0, 0.001, OD - 0.04);
    /* unutrašnjost */
    const Yb = 0.012;
    const u = (id, naziv, x, z, w, h, d, m, ukras) => { const q = grupa(g, x, Yb + h / 2, z); add(q, box(w, h, d, m)); if (ukras) ukras(q, w, h, d); dio(id, naziv, q); ormarUnutra.push(q); return q; };
    u('pogonskaJedinica', 'Pogonska jedinica (drive unit)', -0.1, -0.08, 0.18, 0.2, 0.17, M.celik, (q, w, h, d) => { for (let k = 0; k < 8; k++) add(q, box(0.003, h * 0.9, d * 0.9, M.alu), -w / 2 + 0.02 + k * 0.02, 0, 0); });
    u('glavnoRacunalo', 'Glavno računalo (main computer)', 0.1, -0.1, 0.16, 0.06, 0.15, M.crno, (q, w, h, d) => { for (let k = 0; k < 4; k++) add(q, box(0.012, 0.006, 0.006, M.celik), -0.05 + k * 0.03, 0, d / 2 + 0.003); add(q, box(0.04, 0.006, 0.003, M.ledZ), 0.04, 0.02, d / 2 + 0.002); });
    u('osnoRacunalo', 'Osno računalo (axis computer)', 0.1, 0.06, 0.14, 0.012, 0.11, M.zeleno, (q) => { for (let k = 0; k < 5; k++) add(q, box(0.016, 0.006, 0.016, M.cip), -0.05 + k * 0.025, 0.008, 0); });
    u('napajanje24V', 'Napajanje 24 V (power supply)', 0.1, 0.17, 0.12, 0.08, 0.06, M.celik, (q, w, h) => { for (let k = 0; k < 6; k++) add(q, box(w * 0.85, 0.003, 0.002, M.celikT), 0, -h / 2 + 0.012 + k * 0.012, 0.031); });
    u('ioPloca', 'I/O ploča (16 ulaza, 16 izlaza)', -0.1, 0.12, 0.17, 0.012, 0.1, M.zelenoS, (q) => { for (let k = 0; k < 8; k++) add(q, box(0.016, 0.012, 0.012, M.narancasto), -0.07 + k * 0.02, 0.012, 0.04); });
    u('sigurnosnaPloca', 'Sigurnosna ploča (safety board)', -0.1, 0.12, 0.12, 0.012, 0.06, M.zeleno, (q) => { add(q, box(0.03, 0.006, 0.03, M.cip), 0, 0.008, 0); [0.02, 0.035].forEach((x) => add(q, new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), M.ledZ), x, 0.008, 0.02)); }).position.y = 0.16;
    u('sklopnici', 'Sklopnici (K42, K43 motori; K44 kočnice)', 0.0, 0.16, 0.06, 0.06, 0.05, M.crno, (q) => { for (let k = 0; k < 3; k++) add(q, box(0.016, 0.05, 0.044, M.ormarT), -0.02 + k * 0.02, 0.004, 0); });
    u('otpornikKocenja', 'Otpornik za kočenje (bleeder)', 0.0, -0.17, 0.12, 0.03, 0.05, M.alu, (q) => { for (let k = 0; k < 6; k++) add(q, box(0.003, 0.03, 0.05, M.celikT), -0.05 + k * 0.02, 0.01, 0); });
    u('mrezniFilter', 'Mrežni filtar (line filter)', 0.19, 0.17, 0.05, 0.05, 0.04, M.celikT);
    const ven = grupa(g); [-0.06, 0.06].forEach((z) => { const f = grupa(ven, OW / 2 - 0.022, OH * 0.45, z); add(f, box(0.025, 0.08, 0.08, M.crno)); add(f, cyl(0.032, 0.026, M.ormarT, 'x', 24)); });
    dio('ventilatori', 'Ventilatori', ven); ormarUnutra.push(ven);
    /* stražnji priključci ormara za kabele robota */
    const sp = grupa(g, 0, 0, -OD / 2 - 0.004); add(sp, cyl(0.015, 0.012, M.prikljucak, 'z'), -0.08, 0.12, 0); add(sp, cyl(0.012, 0.012, M.prikljucak, 'z'), 0.0, 0.12, 0);
    dio('prikljucciOrmara', 'Priključci XS1 (snaga) i XS2 (signal) na ormaru', sp);
    dio('ormar', 'Upravljački ormar IRC5 Compact', g);
    ormar.otvori = (t2) => { ormar.t = Math.max(0, Math.min(1, t2)); pkS.rotation.x = -ormar.t * 1.9; ormarUnutra.forEach((q) => { q.visible = ormar.t > 0.02; }); };
    ormar.otvori(0);
  }

  /* ---------------------------------------------------------------- privjesak FlexPendant (načelni prikaz) */
  let privjesak = null;
  if (O.privjesak) {
    const PW = 0.28, PH = 0.19, PD = 0.06;
    const nos = grupa(korijen, OX + OW / 2 + 0.2, 0.004, OZ + 0.06); nos.rotation.x = -1.25; nos.rotation.y = -0.25;   /* leži na stolu desno od ormara */
    privjesak = grupa(nos, 0, PH / 2 + 0.005, 0); privjesak.name = 'privjesak';
    add(privjesak, box(PW, PH, PD * 0.6, M.privjesak));
    add(privjesak, box(PW * 0.94, PH * 0.94, PD * 0.62, M.privjesakS), 0, 0, -0.002);
    const zs = grupa(privjesak, -0.02, 0.0, PD * 0.31 + 0.001); const zsm = add(zs, new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.115), zaslonMat)); zsm.userData.vlastitiMat = true;
    dio('zaslonPrivjeska', 'Dodirni zaslon u boji', zs);
    const pal = grupa(privjesak, 0.1, -0.02, PD * 0.31 + 0.001); add(pal, cyl(0.014, 0.006, M.crno, 'z')); add(pal, cyl(0.006, 0.026, M.crno, 'z'), 0, 0, 0.016); add(pal, new THREE.Mesh(new THREE.SphereGeometry(0.009, 14, 10), M.crno), 0, 0, 0.03);
    dio('palica', 'Palica (joystick)', pal);
    const gl = grupa(privjesak, 0.1, 0.06, PD * 0.31 + 0.001); add(gl, cyl(0.018, 0.004, M.zuto, 'z')); add(gl, cyl(0.011, 0.012, M.crveno, 'z', 24, 0.014), 0, 0, 0.007);
    dio('gljivaPrivjeska', 'Gljiva za nužno zaustavljanje', gl);
    const tp = grupa(privjesak, 0.1, -0.075, PD * 0.31 + 0.001);
    for (let k = 0; k < 4; k++) add(tp, box(0.014, 0.01, 0.005, M.plavo), -0.03 + k * 0.02, 0.0, 0);
    dio('programirljiveTipke', 'Programirljive tipke A–D i tipke za gibanje', tp);
    const ss = grupa(privjesak, -0.02, -0.08, PD * 0.31 + 0.001);
    [[-0.04, M.zeleno], [-0.015, M.crveno], [0.01, M.ormarT], [0.035, M.ormarT]].forEach(([x, m]) => add(ss, box(0.018, 0.01, 0.005, m), x, 0, 0));
    dio('tipkeStart', 'Tipke Start, Stop, korak naprijed i natrag', ss);
    const tri = grupa(privjesak, 0.075, -0.01, -PD * 0.32); add(tri, box(0.11, 0.03, 0.016, M.crno)); add(tri, box(0.1, 0.02, 0.006, M.ormarT), 0, 0, -0.01);
    dio('tripolozajni', 'Tripoložajni uređaj za omogućavanje', tri);
    const usb = grupa(privjesak, -PW / 2 - 0.001, 0.04, 0); add(usb, box(0.003, 0.012, 0.006, M.celik));
    dio('usbPrivjeska', 'USB priključak', usb);
    dio('privjesak', 'Privjesak FlexPendant', privjesak);
  }

  /* ---------------------------------------------------------------- kabeli */
  const kabeli = grupa(korijen); kabeli.name = 'kabeli';
  if (O.kabel) {
    const k1 = cijev([[-0.222, 0.05, 0.035], [-0.3, 0.02, 0.1], [-0.2, 0.012, 0.36], [0.4, 0.012, 0.34], [OX - 0.12, 0.02, OZ - OD / 2 - 0.08], [OX - 0.08, 0.12, OZ - OD / 2 - 0.016]], 0.009, M.kabel);
    const k2 = cijev([[-0.222, 0.05, -0.035], [-0.31, 0.02, 0.06], [-0.22, 0.01, 0.38], [0.42, 0.01, 0.36], [OX - 0.02, 0.02, OZ - OD / 2 - 0.08], [OX, 0.12, OZ - OD / 2 - 0.016]], 0.007, M.kabel);
    kabeli.add(k1, k2);
    dio('kabelRobota', 'Kabeli robota: snaga (R1.MP) i signal (R1.SMB)', k1, k2);
    if (privjesak) { const k3 = cijev([[OX + OW / 2 - 0.02, 0.08, OZ + OD / 2 + 0.004], [OX + OW / 2 + 0.06, 0.03, OZ + OD / 2 + 0.06], [OX + OW / 2 + 0.16, 0.012, OZ + 0.2], [OX + OW / 2 + 0.2, 0.02, OZ + 0.0]], 0.0045, M.kabel); kabeli.add(k3); dio('kabelPrivjeska', 'Kabel privjeska', k3); }
  }
  dio('robot', 'Robot IRB 120', robot);

  /* ---------------------------------------------------------------- pomoćni prikaz: osi vrtnje */
  const osiG = [];
  zglobovi.forEach((z, i) => {
    const [o] = OS[i]; const g = new THREE.Group(); g.visible = false; z.add(g); osiG.push(g);
    const lm = new THREE.LineDashedMaterial({ color: 0xe8742a, dashSize: 0.012, gapSize: 0.008 });
    const a = V(o).multiplyScalar(0.16), geo = new THREE.BufferGeometry().setFromPoints([a.clone().negate(), a]);
    const l = new THREE.Line(geo, lm); l.computeLineDistances(); l.raycast = () => {}; g.add(l);
  });
  const pomocni = { osi(v) { osiG.forEach((g) => { g.visible = !!v; }); } };

  /* ---------------------------------------------------------------- postavljanje kutova */
  const q = POLOZAJI.pocetni.slice();
  function postavi(qd) {
    for (let i = 0; i < 6; i++) {
      const v = Number(qd[i]) || 0; q[i] = v; const [o, s] = OS[i]; const z = zglobovi[i]; if (!z) continue;
      z.rotation.set(0, 0, 0); z.rotation[o] = s * v * Math.PI / 180;
    }
    rotori.forEach((r) => { r.g.rotation.set(0, 0, 0); r.g.rotation[r.os] = q[r.i] * BRZINA_ROTORA * Math.PI / 180; });
    korijen.updateMatrixWorld(true);
  }

  /* ---------------------------------------------------------------- unutrašnjost i rastavljanje */
  const vidU = [false, false, false, false, false, false, false];
  let tR = 0;
  /* koje ljuske treba učiniti poluprozirnima za pogled u os i (0…5) ili postolje (6) */
  const LJ = [[0, 1], [1, 2], [2, 3], [3, 4], [4], [5, 4], [0, 1, 2, 3, 4]];
  function primijeni() {
    const svi = tR > 0.001;
    const proz = new Set();
    vidU.forEach((v, i) => { if (v || svi) LJ[i].forEach((k) => proz.add(k)); });
    if (svi) [0, 1, 2, 3, 4, 5].forEach((k) => proz.add(k));
    U.forEach((gr, i) => { (gr || []).forEach((g) => { g.visible = vidU[i] || svi; }); });
    L.forEach((o, k) => { if (!o) return; const p = proz.has(k); o.traverse((m) => { if (!m.isMesh) return; const ma = m.userData.m0 || m.material; ma.transparent = p; ma.opacity = p ? (svi ? 0.3 : 0.22) : 1; ma.depthWrite = !p; ma.needsUpdate = true; m.userData.prozirno = p; }); });
  }
  function unutrasnjost(i, vidljivo) {
    if (i === 'sve') { for (let k = 0; k < 7; k++) vidU[k] = !!vidljivo; }
    else if (i >= 0 && i <= 6) vidU[i] = !!vidljivo;
    primijeni();
  }
  /* rastavljanje: članci se razmiču duž lanca (pomaci čvorova j1…j6 prema prethodnom članku) */
  const P0 = zglobovi.map((z) => z.position.clone());
  const RAZ = [[0, 0.09, 0], [0, 0.07, 0.0], [0, 0.07, 0], [0.07, 0.0, 0], [0.06, 0, 0], [0.05, 0, 0]];
  function rastavi(t) {
    tR = Math.max(0, Math.min(1, Number(t) || 0));
    zglobovi.forEach((z, i) => { z.position.copy(P0[i]).add(new THREE.Vector3(...RAZ[i]).multiplyScalar(tR)); });
    primijeni(); korijen.updateMatrixWorld(true);
  }
  function prihvatnica(v) { alatOmot.visible = !!v; korijen.updateMatrixWorld(true); }

  postavi(q);
  primijeni();
  return {
    korijen, robot, zglobovi, postavi, tcp, tcpAlata, dijelovi, rastavi, unutrasnjost, prihvatnica, ormar, privjesak, kabeli, pomocni,
    osi, q, M, NAZIVI_OSI, OPSEG, get tRastav() { return tR; }
  };
}
