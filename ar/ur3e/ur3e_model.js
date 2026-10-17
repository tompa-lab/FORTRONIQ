/* FORTRONIQ · Kobot UR3e — zajednički 3D model (naš crtež, općeg izgleda UR kobota; bez vanjskih modela i tekstura).
   Koriste ga stranice „Upoznavanje robota”, „Upravljanje robotom” i AR.
   Jedinice: METRI. Korijen je u koordinatama scene (Y gore); unutar njega je grupa u KS robota (Z gore):
     x_r = x_s,  y_r = −z_s,  z_r = y_s ;  baza robota na y = 0.
   Kinematika: standardni DH parametri UR3e (Universal Robots). Zglob i (0..5) okreće se oko lokalne osi z svoje grupe.
   Vanjske mjere (promjeri zglobova, cijevi, pomaci cijevi od osi) i SVA unutrašnjost zgloba su naša procjena / načelni prikaz:
     promjer kućišta zgloba veličine 2 (Base, Shoulder) ≈ 90 mm, veličine 1 (Elbow) ≈ 75 mm, veličine 0 (Wrist 1–3) ≈ 63 mm.
   opcije: { unutrasnjost: true, ormar: true, privjesak: true, kabel: true, M: {materijali} }
   © ForTroniQ d.o.o. */

export const DH = { a: [0, -0.24355, -0.2132, 0, 0, 0], d: [0.15185, 0, 0, 0.13105, 0.08535, 0.0921], alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0] };
export const NAZIVI_ZGLOBOVA = ['Base', 'Shoulder', 'Elbow', 'Wrist 1', 'Wrist 2', 'Wrist 3'];
/* polumjer kućišta zgloba (m) — procjena prema veličini zgloba (2, 2, 1, 0, 0, 0) */
export const POLUMJER = [0.045, 0.045, 0.0375, 0.0315, 0.0315, 0.0315];
export const VELICINA = [2, 2, 1, 0, 0, 0];
/* položaji u kojima se robot često prikazuje (rad) */
export const POLOZAJI = {
  nula: [0, 0, 0, 0, 0, 0],                                         /* UR „zero position”: ispružen vodoravno */
  pocetni: [0, -Math.PI / 2, Math.PI / 2, -Math.PI / 2, -Math.PI / 2, 0],
  ispruzen: [0, -Math.PI / 2, 0, -Math.PI / 2, 0, 0],               /* uspravno */
  sklopljen: [0, -Math.PI * 0.62, Math.PI * 0.86, -Math.PI * 0.74, -Math.PI / 2, 0]
};

export function napraviUR3e(THREE, opcije = {}) {
  const O = Object.assign({ unutrasnjost: true, ormar: true, privjesak: true, kabel: true }, opcije);
  const imaDoc = typeof document !== 'undefined';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.15 }, o));
  const M = Object.assign({
    alu: mat(0xcfd4d8, { metalness: 0.42, roughness: 0.38 }), aluT: mat(0xb4bbc1, { metalness: 0.45, roughness: 0.4 }),
    plavo: mat(0x7d9db6, { roughness: 0.42, metalness: 0.1 }), plavoT: mat(0x5f7f99, { roughness: 0.45 }),
    tamno: mat(0x2b3034, { roughness: 0.6 }), crno: mat(0x17191b, { roughness: 0.75 }), celik: mat(0xa9b1b7, { metalness: 0.5, roughness: 0.3 }),
    celikT: mat(0x7c858b, { metalness: 0.45, roughness: 0.38 }), bakar: mat(0xc0763a, { metalness: 0.65, roughness: 0.35 }),
    zeleno: mat(0x1f7a3d, { roughness: 0.6 }), zelenoS: mat(0x2b9a52, { roughness: 0.6 }), cip: mat(0x1a1d20, { roughness: 0.5 }),
    bijelo: mat(0xeef0f1, { roughness: 0.55 }), magnet: mat(0x8c3b3b, { metalness: 0.4, roughness: 0.4 }), magnetS: mat(0x3d5f8c, { metalness: 0.4, roughness: 0.4 }),
    tarno: mat(0x8a6a48, { roughness: 0.9 }), zuto: mat(0xf2c21a, { roughness: 0.45 }), crveno: mat(0xd4261c, { roughness: 0.4 }),
    narancasto: mat(0xe8742a, { roughness: 0.5 }), guma: mat(0x1e2124, { roughness: 0.95 }), kabel: mat(0x2a2d30, { roughness: 0.8 }),
    ormar: mat(0xdfe2e3, { roughness: 0.62, metalness: 0.08 }), ormarT: mat(0xc8ccce, { roughness: 0.6 }), ploca: mat(0xb9c0c4, { metalness: 0.5, roughness: 0.4 }),
    staklo: mat(0x1e2a33, { roughness: 0.15, metalness: 0.2 }), disk: mat(0x3a4a58, { metalness: 0.5, roughness: 0.25 }),
    ledZ: mat(0x2ecc71, { emissive: 0x2ecc71, emissiveIntensity: 0.9 }), ledY: mat(0xf5c518, { emissive: 0xf5c518, emissiveIntensity: 0.9 }),
    ledR: mat(0xff3b30, { emissive: 0xff3b30, emissiveIntensity: 0.9 }), ledB: mat(0x3fa9f5, { emissive: 0x3fa9f5, emissiveIntensity: 0.9 }),
    filtar: mat(0x9aa0a4, { roughness: 0.95 }), kuglica: mat(0xdfe4e8, { metalness: 0.6, roughness: 0.15 })
  }, O.M || {});

  /* ------------------------------------------------------------ pomoćne funkcije (geometrija uz os z) */
  const S32 = 40;
  function cylZ(r, z0, z1, m, seg = S32) { const g = new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg); g.rotateX(Math.PI / 2); const me = new THREE.Mesh(g, m); me.position.z = (z0 + z1) / 2; return me; }
  function konZ(r0, r1, z0, z1, m, seg = S32) { const g = new THREE.CylinderGeometry(r1, r0, Math.abs(z1 - z0), seg); g.rotateX(Math.PI / 2); if (z1 < z0) g.rotateX(Math.PI); const me = new THREE.Mesh(g, m); me.position.z = (z0 + z1) / 2; return me; }
  function krug(r, seg = 64) { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; }
  function rupa(r, x = 0, y = 0, seg) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; }
  function izvuci(shape, z0, z1, m, curve = 48) { const g = new THREE.ExtrudeGeometry(shape, { depth: Math.abs(z1 - z0), bevelEnabled: false, curveSegments: curve }); g.translate(0, 0, Math.min(z0, z1)); return new THREE.Mesh(g, m); }
  function prsten(ro, ri, z0, z1, m, curve = 56) { const s = krug(ro); s.holes.push(rupa(ri)); return izvuci(s, z0, z1, m, curve); }
  function cijevZ(ro, ri, z0, z1, m, seg = S32) { /* tankostijena cijev (otvorena) */
    const g = new THREE.CylinderGeometry(ro, ro, Math.abs(z1 - z0), seg, 1, true); g.rotateX(Math.PI / 2);
    const me = new THREE.Mesh(g, m.side === THREE.DoubleSide ? m : dvostrano(m)); me.position.z = (z0 + z1) / 2; return me;
  }
  const dvMap = new Map();
  function dvostrano(m) { let d = dvMap.get(m.uuid); if (!d) { d = m.clone(); d.side = THREE.DoubleSide; dvMap.set(m.uuid, d); } return d; }
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  function add(p, o, x = 0, y = 0, z = 0) { o.position.x += x; o.position.y += y; o.position.z += z; p.add(o); return o; }
  function grupa(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; }
  /* zupčanik s vanjskim zubima (profil zuba trapez), ili prsten s unutarnjim zubima */
  function zubiPut(n, rKor, rVrh, unutra) {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, da = Math.PI * 2 / n;
      const t = [[0, rKor], [0.18, rKor], [0.34, rVrh], [0.66, rVrh], [0.82, rKor]];
      t.forEach(([f, r]) => pts.push(new THREE.Vector2(Math.cos(a0 + f * da) * r, Math.sin(a0 + f * da) * r)));
    }
    if (unutra) pts.reverse();
    return pts;
  }
  function zupcanikVanjski(n, rKor, rVrh, rRupa, z0, z1, m) { const s = new THREE.Shape(zubiPut(n, rKor, rVrh, false)); if (rRupa) s.holes.push(rupa(rRupa)); return izvuci(s, z0, z1, m, 8); }
  function zupcanikUnutarnji(n, rVani, rKor, rVrh, z0, z1, m) { const s = krug(rVani); s.holes.push(new THREE.Path(zubiPut(n, rKor, rVrh, true))); return izvuci(s, z0, z1, m, 64); }
  function cijevKroz(p, tocke, r, m, seg = 64, rs = 10) { const k = new THREE.CatmullRomCurve3(tocke.map((t) => new THREE.Vector3(t[0], t[1], t[2]))); const me = new THREE.Mesh(new THREE.TubeGeometry(k, seg, r, rs, false), m); p.add(me); return me; }
  /* valjak od točke a do točke b */
  function stap(p, a, b, r, m, seg = 24) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m);
    me.position.copy(A).add(B).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); p.add(me); return me;
  }
  function stozac(p, a, b, ra, rb, m, seg = 32) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const me = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, L, seg), m);
    me.position.copy(A).add(B).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); p.add(me); return me;
  }
  function platno(w, h, crtaj) {
    if (!imaDoc) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; crtaj(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }

  /* registar dijelova: id → { naziv, objekti }; objekt dobiva userData.dio */
  const dijelovi = new Map();
  function dio(id, naziv, ...obj) {
    let d = dijelovi.get(id); if (!d) { d = { naziv, objekti: [] }; dijelovi.set(id, d); }
    obj.flat(Infinity).forEach((o) => { if (o) { d.objekti.push(o); o.userData.dio = id; } });
    return obj[0];
  }

  /* ------------------------------------------------------------ korijen i kinematički lanac */
  const korijen = new THREE.Group(); korijen.name = 'UR3e';
  const robot = grupa(korijen); robot.name = 'robot'; robot.rotation.x = -Math.PI / 2;   /* KS robota: Z gore */
  dio('robot', 'Kobot UR3e', robot);
  const okviri = [robot];   /* F0 … F6 (DH okviri) */
  const zglobovi = [], osZgloba = [];
  for (let i = 0; i < 6; i++) {
    const z = grupa(okviri[i]); z.name = 'zglob' + i; zglobovi.push(z); osZgloba.push(new THREE.Vector3(0, 0, 1));
    const f = grupa(z, DH.a[i], 0, DH.d[i]); f.rotation.x = DH.alpha[i]; f.name = 'F' + (i + 1);
    /* T = Rz(q) · Tz(d) · Tx(a) · Rx(α): pomak (a, 0, d) u okviru zgloba pa zakret oko x */
    okviri.push(f);
  }
  const tcp = new THREE.Object3D(); tcp.name = 'tcp'; okviri[6].add(tcp);

  /* ------------------------------------------------------------ zglob: kućište, poklopac i unutrašnjost */
  /* geometrija zgloba uz lokalnu os z: zP = kraj s poklopcem, zI = izlazni kraj */
  const ZG = [
    { zP: 0.010, zI: 0.108 },     /* Base     — u F0 (poklopac dolje, uz postolje) */
    { zP: -0.060, zI: 0.068 },    /* Shoulder — u F1 */
    { zP: 0.156, zI: 0.052 },     /* Elbow    — u F2 (poklopac s vanjske strane, uz nadlakticu) */
    { zP: -0.014, zI: 0.088 },    /* Wrist 1  — u F3 */
    { zP: -0.047, zI: 0.050 },    /* Wrist 2  — u F4 */
    { zP: -0.041, zI: 0.058 }     /* Wrist 3  — u F5 */
  ];
  const Z = [];   /* podaci o zglobovima za rastavljanje i unutrašnjost */
  const ime = (i) => NAZIVI_ZGLOBOVA[i];
  for (let i = 0; i < 6; i++) {
    const r = POLUMJER[i], sc = r / 0.045, { zP, zI } = ZG[i], s = Math.sign(zI - zP), L = Math.abs(zI - zP);
    const at = (u) => zP + s * u * L;                       /* položaj po osi od poklopca (u=0) do izlaza (u=1) */
    const seg = (u0, u1) => [Math.min(at(u0), at(u1)), Math.max(at(u0), at(u1))];
    const stat = grupa(okviri[i]);  stat.name = 'kuciste' + i;     /* nepomično prema prethodnom članku */
    const izl = grupa(zglobovi[i]); izl.name = 'izlaz' + i;         /* okreće se sa zglobom */
    const Rin = r - 0.0032 * sc;
    /* — kućište — */
    const matK = M.alu.clone(); matK.side = THREE.DoubleSide; const matP = M.plavo.clone(), matR = M.tamno.clone();
    const kuc = grupa(stat);
    const zk0 = at(0.045), zk1 = at(1.0);
    add(kuc, cijevZ(r, Rin, Math.min(zk0, zk1), Math.max(zk0, zk1), matK, 56));
    /* tamni prsten uz izlaz */
    const [r0, r1] = seg(0.93, 0.975); add(kuc, prsten(r + 0.0008, Rin, r0, r1, matR, 56));
    dio('zglob' + i, 'Kućište zgloba ' + ime(i), kuc);
    /* — poklopac (plavosivi) — */
    const pok = grupa(stat);
    const [p0, p1] = seg(0, 0.05);
    add(pok, cylZ(r + 0.0006, p0, p1, matP, 56));
    const kupola = cylZ(r * 0.72, s > 0 ? p0 - 0.0018 * sc : p1, s > 0 ? p0 : p1 + 0.0018 * sc, matP, 48); add(pok, kupola);
    const [b0, b1] = seg(0.05, 0.13); add(pok, prsten(r + 0.0007, Rin, b0, b1, matP, 56));     /* plavi pojas */
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + 0.5, v = cylZ(0.0024 * sc, s > 0 ? p0 - 0.0012 : p1, s > 0 ? p0 : p1 + 0.0012, M.celikT, 12); v.position.x = Math.cos(a) * r * 0.82; v.position.y = Math.sin(a) * r * 0.82; add(pok, v); }
    dio('poklopac' + i, 'Poklopac zgloba ' + ime(i), pok);
    const kucMat = [matK, matP, matR];

    const J = { i, r, sc, s, stat, izl, kuc, pok, kucMat, dijeloviU: [], unutra: false, t: 0, vrti: [] };
    Z.push(J);
    if (!O.unutrasnjost) continue;
    /* — unutrašnjost (načelni prikaz, razmjerno veličini zgloba) — */
    const U = grupa(stat); U.name = 'unutra' + i; U.visible = false;
    const UI = grupa(izl); UI.name = 'unutraIzlaz' + i; UI.visible = false;
    J.U = U; J.UI = UI;
    const novi = (p, id, naziv, raz) => { const g = grupa(p); dio(id, naziv, g); J.dijeloviU.push({ g, raz, z0: 0 }); return g; };
    /* šuplje vratilo (za kabele) */
    const vr = add(U, cijevZ(0.2 * Rin, 0.2 * Rin, ...seg(0.08, 0.92), M.celik, 24));
    vr.userData.dio = 'motor' + i;
    /* elektronika: dvije zelene pločice s čipovima i priključkom */
    const el = novi(U, 'elektronika' + i, 'Elektronika zgloba ' + ime(i), 7.0);
    [0.09, 0.15].forEach((u, k) => {
      const [e0, e1] = seg(u, u + 0.018); add(el, prsten(Rin * 0.9, Rin * 0.26, e0, e1, k ? M.zelenoS : M.zeleno, 40));
      const zc = s > 0 ? e0 - 0.0012 * sc : e1 + 0.0012 * sc;
      for (let c = 0; c < 5; c++) { const a = c * 1.25 + k, rr = Rin * (0.45 + 0.08 * (c % 3)); const ch = add(el, box(0.008 * sc, 0.008 * sc, 0.0022 * sc, M.cip)); ch.position.set(Math.cos(a) * rr, Math.sin(a) * rr, zc); ch.rotation.z = a; }
      if (!k) { const kon = add(el, box(0.012 * sc, 0.006 * sc, 0.004 * sc, M.bijelo)); kon.position.set(Rin * 0.62, 0, zc); }
    });
    /* enkoder motora: disk s pločicom (čitač) */
    const em = novi(U, 'enkoderMotora' + i, 'Enkoder motora, zglob ' + ime(i), 6.0);
    const [d0, d1] = seg(0.205, 0.215); const disk = add(em, prsten(Rin * 0.46, Rin * 0.2, d0, d1, M.disk, 48));
    const crtice = add(em, prsten(Rin * 0.45, Rin * 0.38, s > 0 ? d0 - 0.0004 : d1, s > 0 ? d0 : d1 + 0.0004, M.bijelo, 48));
    const em2 = grupa(em); em2.add(disk); em2.add(crtice); J.vrti.push({ g: em2, k: 100 });
    const [h0, h1] = seg(0.18, 0.24); const cit = add(em, box(0.016 * sc, 0.012 * sc, h1 - h0, M.zeleno)); cit.position.set(Rin * 0.5, 0, (h0 + h1) / 2);
    add(em, box(0.006 * sc, 0.006 * sc, 0.002 * sc, M.cip)).position.set(Rin * 0.5, 0, s > 0 ? h0 - 0.001 : h1 + 0.001);
    /* kočnica: krilce (prsten sa zubima) na tarnoj spojki + zatik s elektromagnetom */
    const ko = novi(U, 'kocnica' + i, 'Kočnica zgloba ' + ime(i), 5.0);
    const [t0, t1] = seg(0.26, 0.29), [t2, t3] = seg(0.29, 0.32);
    const krilce = grupa(ko);
    const kr = new THREE.Shape(); const nz = 6;
    for (let k = 0; k < nz; k++) { const a0 = k * Math.PI * 2 / nz; [[0, 0.5], [0.62, 0.5], [0.7, 0.66], [0.94, 0.66]].forEach(([f, rr], j) => { const x = Math.cos(a0 + f * Math.PI * 2 / nz) * Rin * rr, y = Math.sin(a0 + f * Math.PI * 2 / nz) * Rin * rr; if (!k && !j) kr.moveTo(x, y); else kr.lineTo(x, y); }); }
    kr.holes.push(rupa(Rin * 0.22)); add(krilce, izvuci(kr, t2, t3, M.celik, 8));
    add(krilce, prsten(Rin * 0.48, Rin * 0.22, t0, t1, M.tarno, 40));          /* tarna obloga (spojka) */
    J.vrti.push({ g: krilce, k: 100 });
    const [s0, s1] = seg(0.24, 0.36);
    const mag = grupa(ko); mag.position.set(0, Rin * 0.8, 0);
    add(mag, cylZ(Rin * 0.15, s0, s1, M.tamno, 20)); add(mag, cylZ(Rin * 0.155, s0 + (s1 - s0) * 0.25, s1 - (s1 - s0) * 0.25, M.bakar, 20));
    const zat = cylZ(Rin * 0.045, ...seg(0.295, 0.42), M.celik, 12); zat.position.set(0, Rin * 0.62, 0); add(ko, zat);
    dio('zatik' + i, 'Zatik kočnice, zglob ' + ime(i), zat);
    /* motor: stator s namotima i rotor s magnetima */
    const mo = novi(U, 'motor' + i, 'Motor zgloba ' + ime(i), 3.8);
    const [m0, m1] = seg(0.38, 0.62);
    add(mo, prsten(Rin * 0.93, Rin * 0.72, m0, m1, M.celikT, 48));
    const nN = 12;
    for (let k = 0; k < nN; k++) {
      const a = k * Math.PI * 2 / nN, nam = grupa(mo); nam.rotation.z = a;
      const zub = box(Rin * 0.12, Rin * 0.14, m1 - m0, M.celikT); zub.position.set(Rin * 0.64, 0, (m0 + m1) / 2); nam.add(zub);
      const kal = box(Rin * 0.1, Rin * 0.22, (m1 - m0) * 1.06, M.bakar); kal.position.set(Rin * 0.63, 0, (m0 + m1) / 2); nam.add(kal);
    }
    const rot = grupa(mo); J.vrti.push({ g: rot, k: 100 });
    add(rot, cylZ(Rin * 0.5, m0 + 0.002, m1 - 0.002, M.celikT, 32));
    for (let k = 0; k < 10; k++) { const a = k * Math.PI * 2 / 10, mg = box(Rin * 0.06, Rin * 0.27, (m1 - m0) * 0.92, k % 2 ? M.magnet : M.magnetS); mg.position.set(Math.cos(a) * Rin * 0.52, Math.sin(a) * Rin * 0.52, (m0 + m1) / 2); mg.rotation.z = a; rot.add(mg); }
    /* valni prijenosnik: generator vala, flexspline, circular spline */
    const pr = novi(U, 'prijenosnik' + i, 'Valni prijenosnik zgloba ' + ime(i), 0);
    const rp = Rin * 0.66, h = Rin * 0.04;
    const nF = Math.round(48 + 16 * VELICINA[i]), nC = nF + 2;     /* prikazani broj zuba je smanjen (stvarno ≈ 200/202) */
    const [w0, w1] = seg(0.64, 0.75);
    /* generator vala: eliptični kulisni disk + tankostijeni kuglični ležaj */
    const gv = novi(pr, 'generatorVala' + i, 'Generator vala, zglob ' + ime(i), 2.6);
    const gvR = grupa(gv); J.vrti.push({ g: gvR, k: 100 });
    const elA = rp - 1.55 * h - 0.0005, elB = elA * 0.9;
    const elS = new THREE.Shape(); elS.absellipse(0, 0, elA - Rin * 0.06, elB - Rin * 0.06, 0, Math.PI * 2, false); elS.holes.push(rupa(Rin * 0.2));
    add(gvR, izvuci(elS, w0, w1, M.celik, 48));
    const nK = 20;
    for (let k = 0; k < nK; k++) { const a = k * Math.PI * 2 / nK, kk = new THREE.Mesh(new THREE.SphereGeometry(Rin * 0.028, 10, 8), M.kuglica); kk.position.set(Math.cos(a) * (elA - Rin * 0.03), Math.sin(a) * (elB - Rin * 0.03), (w0 + w1) / 2); gvR.add(kk); }
    const vp = new THREE.Shape(); vp.absellipse(0, 0, elA, elB, 0, Math.PI * 2, false); const vh = new THREE.Path(); vh.absellipse(0, 0, elA - Rin * 0.012, elB - Rin * 0.012, 0, Math.PI * 2, true); vp.holes.push(vh);
    add(gvR, izvuci(vp, w0 + (w1 - w0) * 0.1, w1 - (w1 - w0) * 0.1, M.celikT, 48));
    /* flexspline: tankostijena čaša s vanjskim zubima na otvorenom kraju (spojena na izlaz) */
    const fx = novi(UI, 'flexspline' + i, 'Flexspline (fleksibilni zupčanik), zglob ' + ime(i), 1.6);
    add(fx, zupcanikVanjski(nF, rp - 1.25 * h, rp - 0.1 * h, rp - 1.5 * h, w0, w1, M.celik));
    const [c0, c1] = seg(0.64, 0.86);
    add(fx, cijevZ(rp - 1.5 * h, rp - 1.5 * h, c0, c1, M.celik, 56));
    const [dn0, dn1] = seg(0.86, 0.88); add(fx, prsten(rp - 1.5 * h, Rin * 0.22, dn0, dn1, M.celik, 48));
    const [hb0, hb1] = seg(0.86, 0.93); add(fx, prsten(Rin * 0.36, Rin * 0.22, hb0, hb1, M.celikT, 32));
    /* circular spline: kruti prsten s unutarnjim zubima (pričvršćen na kućište) */
    const cs = novi(U, 'circularSpline' + i, 'Circular spline (kruti prsten), zglob ' + ime(i), 0.6);
    add(cs, zupcanikUnutarnji(nC, Rin * 0.92, rp + 1.0 * h, rp, w0, w1, M.celikT));
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2, v = cylZ(Rin * 0.025, s > 0 ? w0 - 0.0012 : w1, s > 0 ? w0 : w1 + 0.0012, M.celik, 10); v.position.set(Math.cos(a) * Rin * 0.84, Math.sin(a) * Rin * 0.84, 0); cs.add(v); }
    /* enkoder zgloba: veći prsten na izlazu + čitač */
    const ez = novi(UI, 'enkoderZgloba' + i, 'Enkoder zgloba (izlazni), ' + ime(i), -0.0);
    const [ez0, ez1] = seg(0.9, 0.915); add(ez, prsten(Rin * 0.92, Rin * 0.7, ez0, ez1, M.disk, 56));
    add(ez, prsten(Rin * 0.9, Rin * 0.84, s > 0 ? ez0 - 0.0004 : ez1, s > 0 ? ez0 : ez1 + 0.0004, M.bijelo, 56));
    const ezc = add(U, box(0.016 * sc, 0.01 * sc, 0.008 * sc, M.zeleno)); const [ec0, ec1] = seg(0.865, 0.895); ezc.position.set(0, -Rin * 0.82, (ec0 + ec1) / 2); ezc.userData.dio = 'enkoderZgloba' + i;
    dijelovi.get('enkoderZgloba' + i).objekti.push(ezc);
    J.dijeloviU.push({ g: ezc, raz: 0, z0: ezc.position.z });
    J.dijeloviU.forEach((d) => { d.z0 = d.g.position.z; });
    J.pokZ0 = pok.position.z;
  }

  /* ------------------------------------------------------------ postolje, članci i cijevi */
  /* postolje (Ø128) s prirubnicom i izlazom kabela */
  const baza = grupa(robot); baza.name = 'baza';
  add(baza, cylZ(0.064, 0, 0.0065, M.aluT, 64));
  add(baza, konZ(0.0625, 0.05, 0.0065, 0.0125, M.alu, 64));
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, v = cylZ(0.0042, 0.0065, 0.0095, M.celikT, 12); v.position.set(Math.cos(a) * 0.054, Math.sin(a) * 0.054, 0); baza.add(v); }
  const izlaz = grupa(baza, 0.052, 0, 0.02); izlaz.rotation.y = Math.PI / 2;
  add(izlaz, cylZ(0.012, 0, 0.026, M.tamno, 24)); add(izlaz, cylZ(0.0145, 0.016, 0.026, M.crno, 24)); add(izlaz, cylZ(0.0085, 0.026, 0.05, M.kabel, 16));
  dio('baza', 'Postolje (montažna prirubnica)', baza);
  /* članak 1: vrat između baze i ramena */
  const cl1 = grupa(zglobovi[0]);
  add(cl1, cylZ(0.045, 0.108, 0.15185, Z[1].kucMat[0], 56));
  Z[1].vrat = cl1;
  add(cl1, prsten(0.0458, 0.044, 0.108, 0.111, M.tamno, 56));
  dio('zglob1', 'Kućište zgloba Shoulder', cl1);
  /* nadlaktica (članak 2) u okviru zgloba Shoulder: od osi ramena do osi lakta po −x */
  const nad = grupa(zglobovi[1]); nad.name = 'nadlaktica';
  const zU = 0.112, rU = 0.0305;
  add(nad, cylZ(0.045, 0.068, 0.15, M.alu, 56)); add(nad, cylZ(0.0442, 0.15, 0.1535, M.aluT, 56));
  add(nad, prsten(0.0458, 0.044, 0.068, 0.0715, M.tamno, 56));
  stozac(nad, [-0.03, 0, zU], [-0.072, 0, zU], 0.041, rU, M.alu);
  stap(nad, [-0.07, 0, zU], [DH.a[1] + 0.06, 0, zU], rU, M.alu, 40);
  stozac(nad, [DH.a[1] + 0.062, 0, zU], [DH.a[1] + 0.025, 0, zU], rU, 0.036, M.alu);
  dio('cijevNadlaktice', 'Cijev nadlaktice', nad);
  /* podlaktica (članak 3) u okviru zgloba Elbow: od osi lakta do osi Wrist 1 */
  const pod = grupa(zglobovi[2]); pod.name = 'podlaktica';
  const zF = 0.026, rF = 0.0245;
  add(pod, cylZ(0.0375, -0.001, 0.052, M.alu, 48)); add(pod, prsten(0.0383, 0.0365, 0.049, 0.052, M.tamno, 48));
  stozac(pod, [-0.025, 0, zF], [-0.06, 0, zF], 0.0335, rF, M.alu);
  stap(pod, [-0.058, 0, zF], [DH.a[2] + 0.05, 0, zF], rF, M.alu, 40);
  stozac(pod, [DH.a[2] + 0.052, 0, zF], [DH.a[2] + 0.02, 0, zF], rF, 0.0295, M.alu);
  dio('cijevPodlaktice', 'Cijev podlaktice', pod);
  /* članak 4 (izlaz Wrist 1 → kućište Wrist 2), članak 5 (izlaz Wrist 2 → kućište Wrist 3) */
  const cl4 = grupa(zglobovi[3]); add(cl4, cylZ(0.0315, 0.088, 0.1005, M.alu, 40)); add(cl4, prsten(0.0322, 0.031, 0.088, 0.0905, M.tamno, 40));
  dio('zglob4', 'Kućište zgloba Wrist 2', cl4);
  const cl5 = grupa(zglobovi[4]); add(cl5, cylZ(0.0315, 0.05, 0.0545, M.alu, 40)); add(cl5, prsten(0.0322, 0.031, 0.05, 0.0525, M.tamno, 40));
  dio('zglob5', 'Kućište zgloba Wrist 3', cl5);
  /* alatni kraj (članak 6): obujmica s alatnim priključkom M8, senzor F/T, prirubnica ISO 9409-1-50-4-M6 */
  const alat = grupa(zglobovi[5]);
  const obu = grupa(alat); add(obu, cylZ(0.0318, 0.058, 0.068, M.aluT, 48)); add(obu, prsten(0.0325, 0.031, 0.058, 0.0605, M.tamno, 48));
  dio('zglob5', 'Kućište zgloba Wrist 3', obu);
  const m8 = grupa(alat, 0.0318, 0, 0.0632); m8.rotation.y = Math.PI / 2;
  add(m8, cylZ(0.0062, 0, 0.007, M.celik, 20)); add(m8, cylZ(0.0052, 0.007, 0.0125, M.celikT, 6)); add(m8, cylZ(0.0035, 0.0125, 0.0135, M.crno, 16));
  for (let k = 0; k < 8; k++) { const a = k * Math.PI * 2 / 8, pin = cylZ(0.0004, 0.0128, 0.0137, M.zuto, 6); pin.position.set(Math.cos(a) * 0.0024, Math.sin(a) * 0.0024, 0); m8.add(pin); }
  dio('alatniPrikljucak', 'Alatni priključak M8 (8 polova)', m8);
  const ft = grupa(alat);
  add(ft, cylZ(0.0322, 0.068, 0.0835, M.alu, 56)); add(ft, prsten(0.0328, 0.0316, 0.0745, 0.0765, M.plavoT, 56));
  dio('ftSenzor', 'Senzor sile i momenta (F/T)', ft);
  const pri = grupa(alat);
  { const sh = krug(0.0315); for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; sh.holes.push(rupa(0.0033, Math.cos(a) * 0.025, Math.sin(a) * 0.025)); }
    sh.holes.push(rupa(0.003, 0.025, 0)); sh.holes.push(rupa(0.01575)); add(pri, izvuci(sh, 0.0835, 0.0921, M.celik, 40));
    add(pri, cylZ(0.01575, 0.0835, 0.0885, M.celikT, 40)); }
  dio('prirubnica', 'Prirubnica alata ISO 9409-1-50-4-M6', pri);

  /* ------------------------------------------------------------ upravljački ormar (Control Box) */
  const ormar = { grupa: null, otvori: () => {}, t: 0 };
  let kabel = null;
  const W = 0.46, H = 0.449, D = 0.254, OX = 0.8, OZ = -0.04;
  if (O.ormar) {
    const g = grupa(korijen, OX, 0, OZ); g.name = 'ormar'; ormar.grupa = g;
    const st = 0.0015 * 2;
    const tijelo = grupa(g);
    add(tijelo, box(W, H, st, M.ormar), 0, H / 2 + 0.03, -D / 2 + st / 2);
    add(tijelo, box(st, H, D, M.ormar), -W / 2 + st / 2, H / 2 + 0.03, 0);
    add(tijelo, box(st, H, D, M.ormar), W / 2 - st / 2, H / 2 + 0.03, 0);
    add(tijelo, box(W, st, D, M.ormar), 0, H + 0.03 - st / 2, 0);
    add(tijelo, box(W, st, D, M.ormar), 0, 0.03 + st / 2, 0);
    for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) for (const z of [-D / 2 + 0.04, D / 2 - 0.04]) add(tijelo, cylZ(0.016, 0, 0.03, M.guma, 16), x, 0, z).rotation.x = -Math.PI / 2;
    tijelo.children.slice(-4).forEach((n) => { n.position.y = 0.015; });
    /* filtri ventilatora na bočnim stranama */
    const ven = grupa(g);
    [-1, 1].forEach((sx) => {
      const f = grupa(ven, sx * (W / 2 + 0.004), 0.03 + H * (sx < 0 ? 0.32 : 0.62), 0); f.rotation.y = sx * Math.PI / 2;
      add(f, box(0.125, 0.125, 0.008, M.ormarT)); add(f, box(0.105, 0.105, 0.009, M.filtar));
      for (let k = -4; k <= 4; k++) add(f, box(0.105, 0.003, 0.0105, M.ormarT), 0, k * 0.012, 0);
      const fi = grupa(ven, sx * (W / 2 - 0.022), 0.03 + H * (sx < 0 ? 0.32 : 0.62), 0); fi.rotation.y = Math.PI / 2;
      add(fi, box(0.092, 0.092, 0.025, M.crno)); add(fi, cylZ(0.04, -0.013, 0.013, M.tamno, 32));
      const ro = grupa(fi); for (let k = 0; k < 7; k++) { const lop = box(0.034, 0.012, 0.004, M.guma); lop.position.set(Math.cos(k * 0.9) * 0.02, Math.sin(k * 0.9) * 0.02, 0); lop.rotation.z = k * 0.9 + 0.4; ro.add(lop); }
      add(fi, cylZ(0.012, -0.014, 0.014, M.crno, 20));
    });
    dio('ventilatori', 'Ventilatori s filtrima', ven);
    /* montažna ploča */
    const mp = add(g, box(W - 0.03, H - 0.03, 0.003, M.ploca), 0, H / 2 + 0.03, -D / 2 + 0.006);
    const zM = -D / 2 + 0.008, Y = (v) => 0.03 + v;
    /* izvor napajanja */
    const np = grupa(g, -0.12, Y(0.13), zM + 0.05);
    add(np, box(0.15, 0.2, 0.1, M.celik)); for (let k = 0; k < 9; k++) add(np, box(0.12, 0.004, 0.002, M.celikT), 0, -0.08 + k * 0.02, 0.051);
    add(np, box(0.05, 0.02, 0.01, M.zeleno), 0.04, 0.085, 0.052); add(np, new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), M.ledZ), -0.05, 0.088, 0.052);
    dio('napajanje', 'Izvor napajanja', np);
    /* upravljačka ploča (Control Board) */
    const cb = grupa(g, -0.07, Y(0.34), zM + 0.012);
    add(cb, box(0.26, 0.13, 0.003, M.zeleno));
    for (let k = 0; k < 8; k++) add(cb, box(0.02 + (k % 3) * 0.008, 0.016, 0.004, M.cip), -0.11 + k * 0.03, 0.02 * ((k % 2) ? 1 : -1), 0.003);
    for (let k = 0; k < 6; k++) add(cb, box(0.028, 0.012, 0.012, M.bijelo), -0.1 + k * 0.04, -0.056, 0.008);
    add(cb, box(0.05, 0.05, 0.006, M.cip), 0.08, 0.02, 0.004);
    dio('upravljackaPloca', 'Upravljačka ploča (Control Board)', cb);
    /* sigurnosna ploča s LED-icama */
    const sb = grupa(g, 0.14, Y(0.34), zM + 0.012);
    add(sb, box(0.13, 0.13, 0.003, M.zelenoS));
    [['ledZ', 0.03], ['ledY', 0.015], ['ledY', 0], ['ledB', -0.015]].forEach(([m, y], k) => { add(sb, new THREE.Mesh(new THREE.SphereGeometry(0.0034, 10, 8), M[m]), 0.045, y, 0.004); add(sb, box(0.03, 0.006, 0.002, M.bijelo), 0.015, y, 0.0025); });
    add(sb, box(0.032, 0.032, 0.005, M.cip), -0.03, 0.02, 0.004); add(sb, box(0.11, 0.014, 0.014, M.narancasto), 0, -0.05, 0.009);
    dio('sigurnosnaPloca', 'Sigurnosna ploča (Safety Control Board)', sb);
    /* Energy Eater: otpornik na hladnjaku s rebrima */
    const ee = grupa(g, 0.16, Y(0.13), zM + 0.03);
    add(ee, box(0.1, 0.17, 0.012, M.alu));
    for (let k = 0; k < 9; k++) add(ee, box(0.0025, 0.17, 0.045, M.alu), -0.045 + k * 0.0112, 0, 0.028);
    add(ee, box(0.06, 0.03, 0.02, M.cip), 0, 0.1, 0.01);
    dio('energyEater', 'Energy Eater (otpornik za kočnu energiju)', ee);
    /* računalo */
    const pc = grupa(g, 0.035, Y(0.13), zM + 0.05);
    add(pc, box(0.09, 0.17, 0.09, M.crno)); add(pc, cylZ(0.028, 0.045, 0.047, M.tamno, 24), 0, 0.03, 0);
    add(pc, box(0.04, 0.008, 0.004, M.ledB), 0, -0.06, 0.046);
    for (let k = 0; k < 3; k++) add(pc, box(0.012, 0.006, 0.006, M.celik), -0.025 + k * 0.025, -0.075, 0.046);
    dio('racunalo', 'Računalo (PolyScope, Linux)', pc);
    /* I/O priključnice (redne stezaljke u bojama) */
    const io = grupa(g, 0.0, Y(0.245), zM + 0.016);
    const boje = [M.zuto, M.crno, M.zelenoS, M.narancasto];
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { const blok = grupa(io, -0.165 + k * 0.11, r * 0.032 - 0.016, 0); for (let p = 0; p < 9; p++) { add(blok, box(0.0095, 0.022, 0.014, boje[k]), -0.04 + p * 0.01, 0, 0); add(blok, cylZ(0.0018, 0.007, 0.0085, M.celik, 8), -0.04 + p * 0.01, 0.004, 0); } }
    dio('ioPrikljucnice', 'I/O priključnice', io);
    /* osigurač i ulaz mrežnog kabela */
    add(g, box(0.02, 0.04, 0.02, M.crno), -0.2, Y(0.25), zM + 0.015);
    /* vrata (zglob s lijeve strane) */
    const vrS = grupa(g, -W / 2, 0, D / 2); ormar.vrata = vrS;
    add(vrS, box(W, H, 0.004, M.ormar), W / 2, H / 2 + 0.03, 0.002);
    add(vrS, box(W - 0.06, H - 0.06, 0.002, M.ormarT), W / 2, H / 2 + 0.03, 0.0045);
    add(vrS, cylZ(0.012, 0.004, 0.016, M.tamno, 24), W - 0.035, 0.03 + H * 0.55, 0);
    add(vrS, box(0.012, 0.004, 0.003, M.celik), W - 0.035, 0.03 + H * 0.55, 0.0175);
    for (let k = 0; k < 6; k++) add(vrS, box(0.1, 0.004, 0.003, M.tamno), W / 2, 0.03 + 0.06 + k * 0.01, 0.006);
    for (const y of [0.1, H - 0.05]) add(vrS, cylZ(0.006, -0.01, 0.01, M.celikT, 12), 0, 0.03 + y, 0).rotation.x = Math.PI / 2;
    dio('ormar', 'Upravljački ormar (Control Box)', g);
    ormar.otvori = (t) => { ormar.t = Math.max(0, Math.min(1, t)); vrS.rotation.y = -ormar.t * 1.85; };
  }

  /* ------------------------------------------------------------ privjesak za učenje (Teach Pendant) */
  let privjesak = null;
  if (O.privjesak) {
    const PW = 0.3, PH = 0.231, PD = 0.05;
    privjesak = new THREE.Group(); privjesak.name = 'privjesak';
    const nosac = grupa(korijen, OX + 0.06, 0.03 + H, OZ + 0.02); nosac.add(privjesak);
    add(nosac, box(0.16, 0.012, 0.08, M.tamno), 0, 0.006, 0); add(nosac, box(0.02, 0.09, 0.02, M.tamno), 0, 0.05, -0.02);
    privjesak.position.set(0, 0.13, 0.012); privjesak.rotation.x = -0.38;
    const sh = new THREE.Shape(); { const x = -PW / 2, y = -PH / 2, r = 0.02; sh.moveTo(x + r, y); sh.lineTo(x + PW - r, y); sh.quadraticCurveTo(x + PW, y, x + PW, y + r); sh.lineTo(x + PW, y + PH - r); sh.quadraticCurveTo(x + PW, y + PH, x + PW - r, y + PH); sh.lineTo(x + r, y + PH); sh.quadraticCurveTo(x, y + PH, x, y + PH - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); }
    const tijeloP = add(privjesak, izvuci(sh, -PD / 2, PD / 2 - 0.006, M.bijelo, 12));
    add(privjesak, izvuci(sh, PD / 2 - 0.006, PD / 2, M.tamno, 12));
    /* zaslon 12″ (1280 × 800) — naš načelni prikaz sučelja */
    const tex = platno(640, 400, (c, w, h) => {
      c.fillStyle = '#e9eef1'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b3a46'; c.fillRect(0, 0, w, 38);
      c.fillStyle = '#ffffff'; c.font = 'bold 16px sans-serif'; ['Run', 'Program', 'Installation', 'Move', 'I/O', 'Log'].forEach((t, k) => c.fillText(t, 14 + k * 92, 25));
      c.fillStyle = '#c9d4db'; c.fillRect(12, 52, 200, 300); c.fillStyle = '#fff'; c.fillRect(226, 52, 400, 300);
      c.fillStyle = '#556773'; c.font = '13px sans-serif'; ['▸ Robot Program', '   MoveJ', '     Waypoint_1', '     Waypoint_2', '   MoveL', '     Waypoint_3', '   Set DO[0]=On', '   Wait 0.5 s'].forEach((t, k) => c.fillText(t, 20, 76 + k * 22));
      c.strokeStyle = '#2f8fb0'; c.lineWidth = 3; c.beginPath(); c.moveTo(300, 300); c.lineTo(380, 150); c.lineTo(500, 180); c.lineTo(560, 110); c.stroke();
      c.fillStyle = '#2b3a46'; c.fillRect(0, h - 40, w, 40); c.fillStyle = '#4caf50'; c.beginPath(); c.arc(30, h - 20, 9, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = '13px sans-serif'; c.fillText('Normal  ·  Speed 100 %', 50, h - 15);
    });
    const zas = new THREE.Mesh(new THREE.PlaneGeometry(0.2585, 0.1616), tex ? new THREE.MeshBasicMaterial({ map: tex }) : M.staklo);
    zas.position.set(-0.008, -0.01, PD / 2 + 0.0008); privjesak.add(zas); zas.userData.vlastitiMat = true;
    dio('zaslonPrivjeska', 'Dodirni zaslon 12″', zas);
    /* gljiva za nužno zaustavljanje (gore desno) */
    const glj = grupa(privjesak, PW / 2 - 0.022, PH / 2 - 0.03, PD / 2);
    add(glj, cylZ(0.016, 0, 0.004, M.zuto, 32)); add(glj, cylZ(0.009, 0.004, 0.012, M.crveno, 24)); add(glj, konZ(0.014, 0.012, 0.012, 0.02, M.crveno, 32));
    dio('gljivaPrivjeska', 'Gljiva za nužno zaustavljanje', glj);
    add(privjesak, cylZ(0.006, PD / 2, PD / 2 + 0.004, M.tamno, 16), -PW / 2 + 0.02, PH / 2 - 0.022, 0);    /* tipka napajanja */
    /* straga: gumb Freedrive i 3PE ručke */
    const fd = grupa(privjesak, 0, PH / 2 - 0.035, -PD / 2);
    add(fd, cylZ(0.014, -0.006, 0, M.tamno, 24)); add(fd, cylZ(0.011, -0.01, -0.006, M.plavoT, 24));
    dio('freedriveGumb', 'Gumb Freedrive (slobodno vođenje)', fd);
    const tp = grupa(privjesak);
    [-1, 1].forEach((sx) => { const ru = grupa(tp, sx * (PW / 2 - 0.03), -0.01, -PD / 2 - 0.012); add(ru, box(0.03, 0.15, 0.022, M.guma)); add(ru, box(0.012, 0.09, 0.006, M.tamno), sx * -0.004, 0, -0.012); });
    dio('tripolozajni', 'Tri-položajni uređaj za omogućavanje (3PE)', tp);
    dio('privjesak', 'Privjesak za učenje (Teach Pendant)', privjesak, nosac);
    /* kabel privjeska (4,5 m — prikazan dio) */
    const kp = cijevKroz(korijen, [[OX + 0.06, 0.03 + H + 0.06, OZ - 0.06], [OX + 0.18, 0.03 + H + 0.02, OZ - 0.1], [OX + W / 2 + 0.03, 0.3, OZ - 0.08], [OX + W / 2 + 0.06, 0.1, OZ], [OX + W / 2 - 0.02, 0.06, OZ + 0.06]], 0.004, M.kabel, 48, 8);
    dio('privjesak', 'Privjesak za učenje (Teach Pendant)', kp);
  }

  /* ------------------------------------------------------------ kabel robota (6 m) baza → ormar */
  if (O.kabel) {
    /* izlaz iz baze je u KS robota u (0,102, 0, 0,02) po +x → u sceni (0,102, 0,02, 0) */
    const kx = O.ormar ? OX - W / 2 + 0.06 : 0.6, kz = O.ormar ? OZ - D / 2 + 0.05 : 0;
    kabel = cijevKroz(korijen, [[0.1, 0.02, 0], [0.16, 0.009, 0.0], [0.3, 0.009, 0.08], [0.45, 0.009, 0.1], [kx - 0.05, 0.009, kz + 0.25], [kx, 0.009, kz + 0.18], [kx, 0.012, kz + 0.1]], 0.0085, M.kabel, 80, 10);
    if (O.ormar) { const ul = add(ormar.grupa, cylZ(0.016, 0, 0.022, M.crno, 20), -W / 2 + 0.06, 0.035, -D / 2 + 0.05 + 0.1); ul.rotation.x = Math.PI / 2; }
    dio('kabelRobota', 'Kabel robota (6 m)', kabel);
  } else kabel = new THREE.Object3D();

  /* ------------------------------------------------------------ pomoćni prikazi: osi zglobova i DH okviri */
  const osiG = [], okviriG = [];
  const linMat = (c) => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true });
  for (let i = 0; i < 6; i++) {
    const r = POLUMJER[i], { zP, zI } = ZG[i], s = Math.sign(zI - zP);
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, zP - s * 0.05), new THREE.Vector3(0, 0, zI + s * 0.06)]);
    const l = new THREE.Line(g, linMat(0xf2a51a)); l.renderOrder = 20; l.visible = false; l.raycast = () => {}; okviri[i].add(l); osiG.push(l);
    const vrh = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.016, 12), new THREE.MeshBasicMaterial({ color: 0xf2a51a, depthTest: false, transparent: true }));
    vrh.geometry.rotateX(Math.PI / 2); vrh.position.z = zI + s * 0.06; if (s < 0) vrh.rotation.y = Math.PI; vrh.renderOrder = 21; vrh.raycast = () => {}; l.add(vrh);
  }
  for (let i = 0; i <= 6; i++) {
    const a = new THREE.AxesHelper(i === 6 ? 0.07 : 0.055); a.material.depthTest = false; a.material.transparent = true; a.renderOrder = 22; a.visible = false; a.raycast = () => {};
    okviri[i].add(a); okviriG.push(a);
  }
  const pomocni = {
    osi(v) { osiG.forEach((l) => { l.visible = !!v; }); },
    okviriDH(v) { okviriG.forEach((a) => { a.visible = !!v; }); },
    okviri
  };

  /* ------------------------------------------------------------ postavi, rastavi, unutrasnjost */
  const q = [0, 0, 0, 0, 0, 0];
  function postavi(qn) {
    for (let i = 0; i < 6; i++) {
      const v = Number(qn && qn[i]) || 0; q[i] = v;
      zglobovi[i].quaternion.setFromAxisAngle(osZgloba[i], v);
      /* rotor, generator vala, enkoder motora i krilce kočnice vrte se 100 × brže od izlaza (prijenosni omjer ≈ 100) */
      Z[i].vrti.forEach((x) => { x.g.rotation.z = (v * x.k) % (Math.PI * 2); });
    }
    korijen.updateMatrixWorld(true);
  }
  function primijeniUnutra(J) {
    const vid = J.unutra || J.t > 0;
    if (J.U) { J.U.visible = vid; J.UI.visible = vid; }
    J.kucMat.forEach((m, k) => {
      if (vid) { m.transparent = true; m.opacity = k === 1 ? 0.32 : 0.2; m.depthWrite = false; }
      else { m.transparent = false; m.opacity = 1; m.depthWrite = true; }
      m.needsUpdate = true;
    });
    J.kuc.traverse((o) => { if (o.isMesh) o.userData.prozirno = vid; });
    J.pok.traverse((o) => { if (o.isMesh) o.userData.prozirno = vid; });
    if (J.i === 1 && J.vrat) J.vrat.traverse((o) => { if (o.isMesh) o.userData.prozirno = vid; });
  }
  function rastavi(i, t) {
    const J = Z[i]; if (!J) return;
    J.t = Math.max(0, Math.min(1, Number(t) || 0));
    const korak = 0.03 * J.sc * J.t, smjer = -J.s;    /* sve se razmiče prema strani poklopca */
    J.dijeloviU.forEach((d) => { d.g.position.z = d.z0 + smjer * korak * d.raz; });
    J.pok.position.z = (J.pokZ0 || 0) + smjer * korak * 8.4;
    primijeniUnutra(J);
    korijen.updateMatrixWorld(true);
  }
  function unutrasnjost(i, vidljivo) { const J = Z[i]; if (!J) return; J.unutra = !!vidljivo; primijeniUnutra(J); }

  postavi(q);
  return {
    korijen, zglobovi, osZgloba, postavi, tcp, dijelovi, rastavi, unutrasnjost, ormar, privjesak, kabel, pomocni,
    /* dodatno (izvan ugovora): */
    q, okviri, M, POLUMJER, ZG
  };
}
