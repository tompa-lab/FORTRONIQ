/* FORTRONIQ · CNC glodanje, SINUMERIK 840D — zajednički 3D model troosne vertikalne glodalice s križnim stolom.
   Koriste ga stranice „Upoznavanje stroja” i „Postavljanje stroja”. Model i mjere su naši (pojednostavljeni).
   Konvencije (mm, Y scene = gore):
     stol:      stol.position.x = −(X − XC);  stol.position.z = sanonice.position.z = Y − YC
     glava:     glava.position.y = Z  (Z = MKS položaj čela vretena; gornja ploha stola je y = 0)
     lok(x, y): MKS X/Y → lokalne koordinate stola [x − XC, −(y − YC)]
     alatG:     grupa u glavi; čelo vretena je na y = 0 glave, držač (steznik) zauzima −40 … 0
   © ForTroniQ d.o.o. */

export const XC = 120, YC = -15;
export const REF = { X: 435.194, Y: 345.770, Z: 398.672 };
export const HOD = { X: [-200, 440], Y: [-150, 350], Z: [80, 400] };
export const PLOCA = { x0: 59.437, y0: -60.342, L: 120, W: 90, top: 60, H: 20 };
/* alati u spremniku (geometrija razmjerna, duljine od čela vretena su naša pretpostavka; T6 kao sonda u tečaju) */
export const ALATI_SPREMNIK = {
  1: { vrsta: 'celno', L: 95, R: 31.5, naziv: 'T1 čeono glodalo Ø63' },
  2: { vrsta: 'utorno', L: 130, R: 10, naziv: 'T2 glodalo za utore Ø20' },
  3: { vrsta: 'utorno', L: 120, R: 5, naziv: 'T3 glodalo za utore Ø10' },
  4: { vrsta: 'svrdlo', L: 150, R: 4.25, naziv: 'T4 spiralno svrdlo Ø8,5' },
  5: { vrsta: 'ureznik', L: 140, R: 5, naziv: 'T5 ureznik M10' },
  6: { vrsta: 'sonda', L: 291.818, R: 2, naziv: 'T6 3D mjerna sonda' }
};

export function napraviStroj(THREE, scene, opcije = {}) {
  const P = Object.assign({}, PLOCA, opcije.ploca || {});
  const imaDoc = typeof document !== 'undefined';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.12 }, o));
  const M = Object.assign({
    siva: mat(0xb9c2c8), tamna: mat(0x3b4247), plava: mat(0x1f6f87), plavaT: mat(0x185a6d), celik: mat(0x9aa3aa, { metalness: 0.7, roughness: 0.3 }),
    alu: mat(0xd2d7db, { metalness: 0.4 }), zuta: mat(0xf2c21a), crvena: mat(0xc0392b), crna: mat(0x23282c, { roughness: 0.7 }),
    staklo: new THREE.MeshStandardMaterial({ color: 0x9fc6d4, transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false }),
    lim: new THREE.MeshStandardMaterial({ color: 0xd8dee2, transparent: true, opacity: 0.32, roughness: 0.5, metalness: 0.2, depthWrite: false }),
    limPun: mat(0xd3d9dd, { roughness: 0.6 }), okvir: mat(0x56616a, { roughness: 0.5, metalness: 0.3 }), limCelik: mat(0xb5bcc2, { metalness: 0.55, roughness: 0.35 }),
    stol: mat(0xa3acb3, { metalness: 0.55, roughness: 0.38 }), saonice: mat(0x46525a, { metalness: 0.25 }), karbid: mat(0xe3e7ea, { metalness: 0.8, roughness: 0.2 }),
    plocice: mat(0xc9a227, { metalness: 0.6, roughness: 0.3 }), ormar: mat(0xd9dcdc, { roughness: 0.65 }), modul: mat(0xc9ced0, { roughness: 0.5 }),
    modulT: mat(0x2f363b, { roughness: 0.6 }), kanal: mat(0x9ea4a8, { roughness: 0.7 }), bakar: mat(0xb87333, { metalness: 0.7, roughness: 0.35 }),
    cijev: mat(0x2f7fd0, { roughness: 0.5 }), ulje: new THREE.MeshStandardMaterial({ color: 0xe8b923, transparent: true, opacity: 0.75, roughness: 0.2 }),
    posuda: new THREE.MeshStandardMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }),
    emulzija: mat(0xe6ece4, { roughness: 0.3 }), zelenaLED: mat(0x1d9e4b, { emissive: 0x1d9e4b, emissiveIntensity: 0.9 }),
    zutaLED: mat(0xf2c21a, { emissive: 0xf2c21a, emissiveIntensity: 0.8 }), plavaLED: mat(0x3fa9f5, { emissive: 0x3fa9f5, emissiveIntensity: 0.8 }),
    guma: mat(0x1b1e21, { roughness: 0.9 }), strugotina: mat(0x8d969c, { metalness: 0.7, roughness: 0.35 })
  }, opcije.M || {});

  /* ---------------------------------------------------------------- pomoćne funkcije */
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, s = 28) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, s), m);
  const kon = (r1, r2, h, m, s = 28) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), m);
  function add(p, o, x = 0, y = 0, z = 0) { o.position.set(x, y, z); p.add(o); return o; }
  /* valjak po osi x (od x0 do x1) ili z (od z0 do z1); položaj je već postavljen, dodaje se s stavi(p, o) */
  function cylX(r, x0, x1, m, y = 0, z = 0, s) { const c = cyl(r, x1 - x0, m, s); c.rotation.z = Math.PI / 2; c.position.set((x0 + x1) / 2, y, z); return c; }
  function cylZ(r, z0, z1, m, x = 0, y = 0, s) { const c = cyl(r, z1 - z0, m, s); c.rotation.x = Math.PI / 2; c.position.set(x, y, (z0 + z1) / 2); return c; }
  function stavi(p, o) { p.add(o); return o; }
  const oblik = (pts) => new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  function izvuci(shape, d, m, b = 0) { return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, steps: 1, curveSegments: 24 }), m); }
  /* profil (x, y) izvučen po z od z0 do z1 */
  function izvuciZ(pts, z0, z1, m) { const me = izvuci(oblik(pts), z1 - z0, m); me.geometry.translate(0, 0, z0); return me; }
  /* profil (z, y) izvučen po x od x0 do x1 */
  function izvuciX(pts, x0, x1, m) { const me = izvuci(oblik(pts.map((p) => [-p[0], p[1]])), x1 - x0, m); me.geometry.rotateY(Math.PI / 2); me.geometry.translate(x0, 0, 0); return me; }
  /* tlocrt (x, z) izvučen po y od y0 do y1, s obrubom b */
  function izvuciY(shape, y0, y1, m, b = 0) { const me = izvuci(shape, y1 - y0 - 2 * b, m, b); me.geometry.rotateX(-Math.PI / 2); me.geometry.translate(0, y0 + b, 0); return me; }
  function zaobljeno(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
  /* zaobljena kutija w × h (x, y), duljina d po z (od 0 do d) */
  function rkut(w, h, d, r, m) { return izvuci(zaobljeno(w, h, r), d, m); }
  function greda(p, a, b, w, h, m) {   /* kutija od točke a do točke b (vodoravno, u ravnini xz) */
    const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz);
    const g = box(L, h, w, m); g.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); g.rotation.y = Math.atan2(-dz, dx); p.add(g); return g;
  }
  function cijev(p, tocke, r, m, seg = 40) {
    const k = new THREE.CatmullRomCurve3(tocke.map((t) => new THREE.Vector3(t[0], t[1], t[2])));
    const me = new THREE.Mesh(new THREE.TubeGeometry(k, seg, r, 10, false), m); p.add(me); return me;
  }
  function platno(w, h, crtaj) {
    if (!imaDoc) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; crtaj(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const navojTex = platno(64, 64, (g) => { g.fillStyle = '#a9b1b7'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#5d666c'; g.lineWidth = 9; for (const o of [-64, 0, 64]) { g.beginPath(); g.moveTo(o, 64); g.lineTo(o + 64, 0); g.stroke(); } });
  function vreteno(r, duljina) {   /* kuglično navojno vreteno (os po y), s „navojem” iz teksture */
    let m = M.celik;
    if (navojTex) { const t = navojTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, duljina / 10); t.needsUpdate = true; m = mat(0xffffff, { map: t, metalness: 0.6, roughness: 0.32 }); }
    return cyl(r, duljina, m, 24);
  }
  function oznaka(tekst, boja) {
    const t = platno(128, 128, (g) => { g.fillStyle = boja; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 76px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tekst, 64, 70); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: t ? 0xffffff : new THREE.Color(boja), transparent: true }));
    s.scale.set(26, 26, 1); s.renderOrder = 20; return s;
  }

  /* registar dijelova: id → { naziv, objekti } ; svaki objekt dobiva userData.dio */
  const dijelovi = new Map();
  function dio(id, naziv, ...obj) {
    let d = dijelovi.get(id); if (!d) { d = { naziv, objekti: [] }; dijelovi.set(id, d); }
    obj.flat(Infinity).forEach((o) => { if (o) { d.objekti.push(o); o.userData.dio = id; } });
    return obj[0];
  }

  /* teleskopski pokrovni limovi: n limova jedinične kutije, postavi(a, b) ih rasporedi od a do b po osi os */
  const jed = new THREE.BoxGeometry(1, 1, 1);
  function teleskop(parent, n, m, os, mjere, poz, pomak) {
    const ploce = [];
    for (let k = 0; k < n; k++) {
      const p = new THREE.Mesh(jed, m); parent.add(p); ploce.push(p);
      for (const o of ['x', 'y', 'z']) if (o !== os) { p.scale[o] = mjere[o]; p.position[o] = poz[o] + (pomak[o] || 0) * k; }
    }
    return {
      ploce,
      postavi(a, b) {
        const len = b - a;
        if (len < 0.5) { ploce.forEach((p) => { p.scale[os] = 0.001; p.position[os] = a; }); return; }
        const lp = n > 1 ? Math.min(len, len / n * 1.3) : len;
        ploce.forEach((p, k) => { const s = a + (n > 1 ? k * (len - lp) / (n - 1) : 0); p.position[os] = s + lp / 2; p.scale[os] = lp; });
      }
    };
  }
  /* servomotor s davačem; os motora je lokalni +z od 0 (prirubnica) prema davaču; priključci na lokalnoj +x strani */
  function servo(dl = 100, sir = 110) {
    const g = new THREE.Group();
    stavi(g, cylZ(36, 0, 30, M.alu));
    add(g, box(sir + 8, sir + 8, 14, M.crna), 0, 0, 37);
    const t = add(g, rkut(sir, sir, dl, 14, M.crna), 0, 0, 44);
    for (let i = 1; i < 6; i++) add(g, box(sir + 2, sir + 2, 2.5, M.guma), 0, 0, 44 + i * dl / 6);
    add(g, rkut(sir - 6, sir - 6, 8, 12, M.tamna), 0, 0, 44 + dl);
    const enk = stavi(g, cylZ(36, 52 + dl, 78 + dl, M.okvir));
    add(g, box(26, 34, 40, M.tamna), sir / 2 + 13, 18, 44 + dl * 0.75);
    add(g, box(26, 26, 30, M.tamna), sir / 2 + 13, -22, 44 + dl * 0.75);
    void t;
    return { g, enk, duljina: 78 + dl };
  }

  /* ---------------------------------------------------------------- 1. postolje (stroj, nepomično) */
  const stroj = new THREE.Group(); stroj.name = 'stroj'; scene.add(stroj);
  const postolje = izvuciZ([[-330, -240], [330, -240], [330, -400], [430, -480], [430, -790], [-430, -790], [-430, -480], [-330, -400]], -600, 620, M.plava);
  stroj.add(postolje);
  const podloga = [];
  for (const x of [-380, 380]) for (const z of [-540, 10, 560]) { podloga.push(add(stroj, cyl(40, 14, M.tamna), x, -813, z), add(stroj, cyl(14, 18, M.celik), x, -797, z)); }
  for (const s of [-1, 1]) for (const z of [-330, 10, 350]) podloga.push(add(stroj, box(2, 180, 220, M.plavaT), s * 431, -640, z));
  podloga.push(add(stroj, box(560, 8, 1200, M.plavaT), 0, -236, 10));     /* brušene letve ispod vodilica */
  dio('postolje', 'Postolje stroja', postolje, podloga);

  /* vodilice Y */
  const vodY = [];
  for (const x of [-230, 230]) {
    vodY.push(add(stroj, box(34, 30, 985, M.celik), x, -217, 107.5));
    for (let z = -360; z <= 590; z += 60) vodY.push(add(stroj, cyl(5, 1, M.tamna, 10), x, -201.5, z));
  }
  /* kuglično vreteno Y */
  const vrY = add(stroj, vreteno(16, 1032), 0, -215, 96); vrY.rotation.x = Math.PI / 2;
  const vrYd = [vrY, add(stroj, box(100, 50, 36, M.tamna), 0, -215, 598), add(stroj, box(90, 50, 40, M.tamna), 0, -215, -410)];
  /* servomotor Y (sprijeda) */
  const svY = servo(100); add(stroj, svY.g, 0, -215, 616);
  dio('servoY', 'Servomotor osi Y s neizravnim mjernim sustavom', svY.g);

  /* ---------------------------------------------------------------- 2. stup */
  const stup = izvuciX([[-390, -240], [-390, 1080], [-520, 1080], [-585, 840], [-585, -240]], -210, 210, M.plava);
  stroj.add(stup);
  const stupD = [stup, add(stroj, box(520, 30, 217, M.plava), 0, -225, -483.5), add(stroj, box(430, 12, 120, M.plavaT), 0, 1086, -450)];
  for (const s of [-1, 1]) { stupD.push(add(stroj, box(3, 820, 120, M.plavaT), s * 211, 380, -480)); stupD.push(add(stroj, box(3, 820, 40, M.plavaT), s * 211, 380, -555)); }
  dio('stup', 'Stup stroja', stupD);
  const vodZ = [];
  for (const x of [-140, 140]) { vodZ.push(add(stroj, box(34, 1010, 25, M.celik), x, 565, -377.5)); for (let y = 90; y <= 1050; y += 60) vodZ.push(add(stroj, cyl(5, 1, M.tamna, 10), x, y, -364.5)); }
  vodZ.forEach((o) => { if (o.geometry.type === 'CylinderGeometry') o.rotation.x = Math.PI / 2; });
  const vrZ = add(stroj, vreteno(14, 980), 0, 590, -380);
  const vrZd = [vrZ, add(stroj, box(80, 30, 30, M.tamna), 0, 1065, -380), add(stroj, box(80, 30, 30, M.tamna), 0, 115, -380)];
  const svZ = servo(90); svZ.g.rotation.x = -Math.PI / 2; add(stroj, svZ.g, 0, 1080, -380);
  dio('mjerniZ', 'Servomotor osi Z s neizravnim mjernim sustavom', svZ.g);
  /* lanac protuutega i protuuteg */
  const lanacD = [], lanacP = [], lanacS = [];
  for (const x of [-90, 90]) {
    const l = add(stroj, cyl(64, 14, M.tamna, 32), x, 1160, -436); l.rotation.z = Math.PI / 2; lanacD.push(l);
    const zub = new THREE.Mesh(new THREE.TorusGeometry(64, 4, 6, 32), M.celik); zub.rotation.y = Math.PI / 2; lanacD.push(add(stroj, zub, x, 1160, -436));
    lanacD.push(add(stroj, box(14, 80, 30, M.plavaT), x + (x > 0 ? 16 : -16), 1125, -436));
    const p = add(stroj, new THREE.Mesh(jed, M.crna), x, 900, -372); p.scale.set(14, 100, 10); lanacP.push(p);
    const s = add(stroj, new THREE.Mesh(jed, M.crna), x, 900, -500); s.scale.set(14, 100, 10); lanacS.push(s);
  }
  const protuuteg = add(stroj, box(300, 300, 110, M.tamna), 0, 700, -500);
  dio('lanac', 'Lanac protuutega', lanacD, lanacP, lanacS, protuuteg);
  /* okomiti pokrovni limovi */
  const pokVd = teleskop(stroj, 4, M.limCelik, 'y', { x: 330, z: 2.5 }, { x: 0, z: -360.75 }, { z: 2.5 });
  const pokVg = teleskop(stroj, 4, M.limCelik, 'y', { x: 330, z: 2.5 }, { x: 0, z: -360.75 }, { z: 2.5 });
  dio('limoviV', 'Okomiti pokrovni limovi', pokVd.ploce, pokVg.ploce);

  /* ---------------------------------------------------------------- 3. križne saonice (giba se po Y) */
  const sanonice = new THREE.Group(); sanonice.name = 'sanonice'; scene.add(sanonice);
  const sanTijelo = izvuciX([[-210, -85], [-45, -85], [-45, -125], [45, -125], [45, -85], [210, -85], [210, -140], [170, -190], [-170, -190], [-210, -140]], -400, 400, M.saonice);
  sanonice.add(sanTijelo);
  const sanD = [sanTijelo];
  for (const s of [-1, 1]) sanD.push(add(sanonice, box(6, 60, 300, M.tamna), s * 403, -140, 0));
  dio('saonice', 'Križne saonice', sanD);
  const kolY = [];
  for (const x of [-230, 230]) for (const z of [-140, 140]) kolY.push(add(sanonice, box(70, 26, 100, M.tamna), x, -203, z));
  dio('vodiliceY', 'Vodilice osi Y', vodY, kolY);
  const maticaY = add(sanonice, box(70, 40, 100, M.okvir), 0, -210, 0);
  dio('vretenoY', 'Kuglično navojno vreteno osi Y', vrYd, maticaY);
  /* vreteno X u utoru saonica */
  const vrX = add(sanonice, vreteno(14, 790), 0, -100, 0); vrX.rotation.z = Math.PI / 2;
  const vrXd = [vrX, add(sanonice, box(25, 40, 80, M.tamna), -387.5, -105, 0), add(sanonice, box(25, 40, 80, M.tamna), 387.5, -105, 0)];
  const kolX = [];
  for (const x of [-250, 250]) for (const z of [-140, 140]) kolX.push(add(sanonice, box(100, 13, 66, M.tamna), x, -78.5, z));
  /* remenski prijenos i servomotor X na desnom kraju saonica */
  const remX = add(sanonice, box(20, 100, 110, M.okvir), 410, -125, 0);
  const svX = servo(90, 100); svX.g.rotation.y = Math.PI / 2; add(sanonice, svX.g, 420, -140, 0);
  dio('mjerniX', 'Servomotor osi X s neizravnim mjernim sustavom', svX.g, remX);
  /* vodoravni pokrovni limovi: ispred i iza saonica (na postolju) i na krajevima saonica */
  const pokYp = teleskop(stroj, 4, M.limCelik, 'z', { x: 760, y: 3 }, { x: 0, y: -91.5 }, { y: -3 });
  const pokYz = teleskop(stroj, 4, M.limCelik, 'z', { x: 760, y: 3 }, { x: 0, y: -91.5 }, { y: -3 });
  const pokXd = teleskop(sanonice, 3, M.limCelik, 'x', { y: 2.5, z: 400 }, { y: -66, z: 0 }, { y: 2.5 });
  const pokXl = teleskop(sanonice, 3, M.limCelik, 'x', { y: 2.5, z: 400 }, { y: -66, z: 0 }, { y: 2.5 });
  const pokB = [];   /* bočne stranice teleskopskih limova Y (do postolja) */
  for (const sx of [-1, 1]) for (let j = 0; j < 2; j++) pokB.push(teleskop(stroj, 4, M.limCelik, 'z', { x: 3, y: 140 }, { x: sx * 378.5, y: -162 }, { x: -sx * 3 }));
  dio('limoviH', 'Vodoravni pokrovni limovi', pokYp.ploce, pokYz.ploce, pokXd.ploce, pokXl.ploce, pokB.map((t) => t.ploce));

  /* ---------------------------------------------------------------- 4. stezni stol (giba se po X i Y) */
  const stol = new THREE.Group(); stol.name = 'stol'; scene.add(stol);
  const prof = [[-210, -70], [210, -70], [210, 0]];
  for (const c of [160, 80, 0, -80, -160]) prof.push([c + 7, 0], [c + 7, -14], [c + 12, -14], [c + 12, -24], [c - 12, -24], [c - 12, -14], [c - 7, -14], [c - 7, 0]);
  prof.push([-210, 0]);
  const stolTijelo = izvuciX(prof, -380, 380, M.stol); stol.add(stolTijelo);
  const stolD = [stolTijelo];
  for (const s of [-1, 1]) stolD.push(add(stol, box(4, 50, 380, M.tamna), s * 382, -38, 0));
  dio('stol', 'Stezni stol', stolD);
  const vodX = [];
  for (const z of [-140, 140]) vodX.push(add(stol, box(760, 14, 34, M.celik), 0, -77, z));
  dio('vodiliceX', 'Vodilice osi X', vodX, kolX);
  const maticaX = [add(stol, box(60, 16, 40, M.okvir), 0, -78, 0), add(stol, box(100, 44, 44, M.okvir), 0, -100, 0)];
  dio('vretenoX', 'Kuglično navojno vreteno osi X', vrXd, maticaX);
  const lok = (x, y) => [x - XC, -(y - YC)];

  /* škripac, stezne pandže, obradak, nultočke */
  const skripacGrupa = new THREE.Group(); stol.add(skripacGrupa);
  const pandzeGrupa = new THREE.Group(); stol.add(pandzeGrupa);
  const obrGrupa = new THREE.Group(); stol.add(obrGrupa);
  const nulaW = new THREE.Group(); stol.add(nulaW);
  const nulaM = new THREE.Group(); stol.add(nulaM);
  dio('skripac', 'Škripac', skripacGrupa); dio('pandze', 'Stezne pandže', pandzeGrupa); dio('obradak', 'Obradak', obrGrupa);
  dio('nulaW', 'Nultočka obratka W', nulaW); dio('nulaM', 'Nultočka stroja M', nulaM);
  const ocisti = (g) => { while (g.children.length) { const c = g.children.pop(); c.traverse((o) => { if (o.geometry && o.geometry !== jed) o.geometry.dispose(); }); } };
  function triada(g, d, r) {
    const mk = (c) => mat(c, { emissive: c, emissiveIntensity: 0.55 });
    const strelica = (m, rot) => { const s = new THREE.Group(); add(s, cyl(r, d - 3 * r, m, 12), 0, (d - 3 * r) / 2, 0); add(s, kon(0, r * 2.2, 3 * r, m, 14), 0, d - 1.5 * r, 0); rot(s); g.add(s); return s; };
    strelica(mk(0xd23b2a), (s) => { s.rotation.z = -Math.PI / 2; });     /* X → +x */
    strelica(mk(0x1d9e4b), (s) => { s.rotation.x = -Math.PI / 2; });     /* Y → −z */
    strelica(mk(0x2b6fd6), () => {});                                     /* Z → +y */
    add(g, new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 14, 10), M.crna));
  }
  function postaviSkripac(L = P.L, W = P.W, top = P.top, H = P.H, x0 = P.x0, y0 = P.y0) {
    ocisti(skripacGrupa); ocisti(pandzeGrupa);
    const [vx, vz] = lok(x0 + L / 2, y0 + W / 2), bot = top - H, hc = top - 4;
    const zb0 = vz - (W / 2 + 70), zb1 = vz + (W / 2 + 120), bx = L / 2 + 40;
    add(skripacGrupa, box(2 * bx, 22, zb1 - zb0, M.tamna), vx, 11, (zb0 + zb1) / 2);
    for (const s of [-1, 1]) add(skripacGrupa, box(26, 14, 70, M.tamna), vx + s * (bx + 13), 7, vz - 40);
    add(skripacGrupa, box(L + 50, 8, zb1 - zb0 - 30, M.celik), vx, 26, (zb0 + zb1) / 2 - 10);       /* vodilica čeljusti */
    const jaw = (z0, z1) => add(skripacGrupa, box(L + 60, hc - 22, z1 - z0, M.plavaT), vx, 22 + (hc - 22) / 2, (z0 + z1) / 2);
    jaw(vz - W / 2 - 18 - 55, vz - W / 2 - 18);                                                       /* nepomična čeljust */
    jaw(vz + W / 2 + 18, vz + W / 2 + 18 + 55);                                                       /* pomična čeljust */
    for (const s of [-1, 1]) add(skripacGrupa, box(L + 60, hc - 30, 18, M.celik), vx, 30 + (hc - 30) / 2, vz + s * (W / 2 + 9));
    for (const s of [-1, 1]) add(skripacGrupa, box(L + 20, Math.max(2, bot - 30), 12, M.karbid), vx, 30 + Math.max(2, bot - 30) / 2, vz + s * (W / 2 - 14));   /* podložne letve */
    const zv = vz + W / 2 + 73;
    add(skripacGrupa, box(60, 40, 20, M.tamna), vx, 32, zb1 - 10);
    stavi(skripacGrupa, cylZ(11, zv - 10, zb1 + 22, M.celik, vx, 38));
    stavi(skripacGrupa, cylZ(13, zb1 + 22, zb1 + 34, M.tamna, vx, 38, 6));
    add(skripacGrupa, box(130, 12, 12, M.celik), vx, 38, zb1 + 28);
    for (const s of [-1, 1]) stavi(skripacGrupa, cylZ(9, zb1 + 22, zb1 + 34, M.crna, vx + s * 62, 38));
    /* stezne pandže na oba kraja postolja škripca (T-vijak u utoru) */
    const zs = [-160, -80, 0, 80, 160].reduce((a, c) => (Math.abs(c - (vz + W / 2 + 30)) < Math.abs(a - (vz + W / 2 + 30)) ? c : a), 80);
    for (const s of [-1, 1]) {
      const kraj = vx + s * bx, xs0 = kraj - s * 18, xs1 = kraj + s * 92, xm = (xs0 + xs1) / 2;
      add(pandzeGrupa, box(Math.abs(xs1 - xs0), 12, 30, M.celik), xm, 28, zs);
      add(pandzeGrupa, box(28, 22, 34, M.tamna), xs1 - s * 12, 11, zs);
      for (let i = 0; i < 3; i++) add(pandzeGrupa, box(28, 1.4, 34.4, M.crna), xs1 - s * 12, 4 + i * 7, zs);
      const xb = kraj + s * 32;
      add(pandzeGrupa, cyl(6, 74, M.celik, 14), xb, 23, zs);
      add(pandzeGrupa, cyl(11, 3, M.celik, 18), xb, 35.5, zs);
      add(pandzeGrupa, cyl(10, 9, M.tamna, 6), xb, 41.5, zs);
      add(pandzeGrupa, box(22, 8, 22, M.tamna), xb, -18, zs);
    }
    nulaW.position.set(...[lok(x0, y0)[0], top, lok(x0, y0)[1]]);
  }
  function postaviObradak(L = P.L, W = P.W, H = P.H, top = P.top, x0 = P.x0, y0 = P.y0) {
    ocisti(obrGrupa);
    const [vx, vz] = lok(x0 + L / 2, y0 + W / 2);
    add(obrGrupa, box(L, H, W, mat(0xc9ced2, { metalness: 0.45, roughness: 0.35 })), vx, top - H / 2, vz);
  }
  triada(nulaW, 34, 1.8); { const o = oznaka('W', '#17656E'); o.position.set(-8, 22, 8); nulaW.add(o); }
  {
    const [mx, mz] = lok(0, 0); nulaM.position.set(mx, 0, mz);
    triada(nulaM, 18, 1.4);
    for (let i = 0; i < 4; i++) { const q = new THREE.Mesh(new THREE.CircleGeometry(11, 12, i * Math.PI / 2, Math.PI / 2), i % 2 ? M.crna : mat(0xffffff)); q.rotation.x = -Math.PI / 2; q.position.y = 0.6; nulaM.add(q); }
    const o = oznaka('M', '#B23B2A'); o.position.set(-10, 26, -6); nulaM.add(o);
  }
  postaviSkripac();
  if (opcije.obradak !== false) postaviObradak();

  /* ---------------------------------------------------------------- 5. glava vretena (giba se po Z) */
  const glava = new THREE.Group(); glava.name = 'glava'; scene.add(glava);
  const nosac = [add(glava, box(360, 380, 30, M.plavaT), 0, 230, -350)];
  const kolZ = [];
  for (const x of [-140, 140]) for (const y of [90, 370]) kolZ.push(add(glava, box(70, 90, 24, M.tamna), x, y, -374));
  dio('vodiliceZ', 'Vodilice osi Z', vodZ, kolZ);
  const maticaZ = add(glava, box(70, 80, 26, M.okvir), 0, 200, -375);
  dio('vretenoZ', 'Kuglično navojno vreteno osi Z', vrZd, maticaZ);
  const tlocrt = new THREE.Shape(); tlocrt.moveTo(-130, 335); tlocrt.lineTo(130, 335); tlocrt.lineTo(130, 90); tlocrt.lineTo(105, 0); tlocrt.absarc(0, 0, 105, 0, Math.PI, true); tlocrt.lineTo(-130, 90); tlocrt.closePath();
  const tijelo = izvuciY(tlocrt, 60, 336, M.plava, 6); glava.add(tijelo);
  const kuciste = add(glava, cyl(86, 34, M.alu, 36), 0, 45, 0);
  const vratilo = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(30, 0), new THREE.Vector2(42, 0), new THREE.Vector2(42, 336), new THREE.Vector2(30, 336)], 28), M.celik);
  glava.add(vratilo);
  for (const y of [70, 110, 290]) add(glava, new THREE.Mesh(new THREE.TorusGeometry(50, 7, 8, 28), M.tamna), 0, y, 0).rotation.x = Math.PI / 2;
  /* mlaznice rashladnog sredstva */
  const mlaz = [];
  for (const s of [-1, 1]) { mlaz.push(cijev(glava, [[s * 70, 62, 60], [s * 78, 40, 80], [s * 62, 20, 82], [s * 40, 12, 66]], 4, M.cijev, 20)); mlaz.push(add(glava, kon(2.5, 4, 10, M.zuta), s * 38, 10, 64)); }
  dio('glava', 'Glava vretena', nosac, tijelo, kuciste, vratilo, mlaz);
  /* pinola s jedinicom za stezanje alata */
  const pinola = [add(glava, cyl(62, 30, M.celik, 36), 0, 15, 0)];
  pinola.push(add(glava, cyl(10, 440, M.okvir, 14), 0, 220, 0));
  for (let i = 0; i < 18; i++) { const t = add(glava, kon(28, 16, 5, i % 2 ? M.zuta : M.celik, 24), 0, 150 + i * 6, 0); t.rotation.x = i % 2 ? Math.PI : 0; pinola.push(t); }
  pinola.push(add(glava, cyl(16, 30, M.tamna, 14), 0, 32, 0));
  dio('pinola', 'Pinola sa steznom jedinicom alata', pinola);
  /* steznik (držač SK40) — ime 'steznik', vrti se s vretenom */
  const steznik = new THREE.Mesh(new THREE.LatheGeometry([[0, -40], [21, -40], [24, -35], [24, -18], [31.75, -16], [31.75, -11], [27, -8], [31.75, -5], [31.75, 0], [0, 0]].map((p) => new THREE.Vector2(p[0], p[1])), 32), M.celik);
  steznik.name = 'steznik'; glava.add(steznik);
  for (const s of [-1, 1]) add(steznik, box(8, 6, 14, M.tamna), s * 29, -8, 0);
  dio('glava', 'Glava vretena', steznik);
  const alatG = new THREE.Group(); alatG.name = 'alatG'; glava.add(alatG);
  /* remenski pokrov (obloga glave) */
  const remen = new THREE.Shape(); remen.moveTo(80, 0); remen.absarc(0, 0, 80, 0, Math.PI, true); remen.lineTo(-80, 200); remen.absarc(0, 200, 80, Math.PI, 0, true); remen.closePath();
  const obloga = izvuciY(remen, 336, 356, M.limPun, 2); glava.add(obloga);
  dio('obloga', 'Obloga glave (remenski prijenos)', obloga, add(glava, box(4, 16, 120, M.okvir), 82, 346, -100));
  /* glavni motor */
  const mot = new THREE.Group(); add(glava, mot, 0, 356, -200);
  { const t = rkut(150, 150, 124, 22, M.crna); t.rotation.x = -Math.PI / 2; mot.add(t); for (let i = 1; i < 6; i++) add(mot, box(152, 3, 152, M.guma), 0, i * 20, 0); add(mot, cyl(62, 12, M.okvir, 32), 0, 130, 0); add(mot, box(46, 60, 70, M.tamna), 98, 70, 0); add(mot, cyl(9, 30, M.crna), 98, 70, 48).rotation.x = Math.PI / 2; }
  dio('motor', 'Glavni pogonski motor', mot);
  /* stezni cilindar */
  const cil = [add(glava, cyl(58, 74, M.alu, 32), 0, 393, 0), add(glava, cyl(60, 6, M.okvir, 32), 0, 359, 0), add(glava, cyl(48, 6, M.okvir, 32), 0, 433, 0)];
  cil.push(add(glava, cyl(7, 26, M.celik), 64, 400, 0)); cil[cil.length - 1].rotation.z = Math.PI / 2;
  cil.push(cijev(glava, [[76, 400, 0], [110, 405, -20], [130, 380, -120], [130, 300, -300]], 5, M.cijev, 20));
  dio('cilindar', 'Stezni cilindar', cil);

  /* ---------------------------------------------------------------- 6. alati */
  function drzac(g) {
    const d = new THREE.Mesh(steznik.geometry, M.celik); g.add(d);
    add(g, kon(15, 22, 50, M.celik), 0, 25, 0); add(g, cyl(7, 12, M.celik), 0, 56, 0);
    return d;
  }
  function nacrtajAlat(g, a, sDrzacem) {
    if (sDrzacem) drzac(g);
    const L = a.L, R = a.R, v = a.vrsta || 'utorno';
    if (v === 'celno') {
      add(g, cyl(18, Math.max(1, L - 80), M.celik), 0, -40 - (L - 80) / 2, 0);
      add(g, kon(R - 4, R, 40, M.tamna, 36), 0, -L + 20, 0);
      for (let i = 0; i < 5; i++) { const k = i / 5 * Math.PI * 2; const p = add(g, box(9, 10, 3, M.plocice), Math.cos(k) * (R - 3), -L + 5, Math.sin(k) * (R - 3)); p.rotation.y = -k; }
      return;
    }
    if (v === 'sonda') {
      add(g, cyl(10, Math.max(1, L - 150), M.celik), 0, -40 - Math.max(1, L - 150) / 2, 0);
      add(g, cyl(22, 54, M.tamna, 28), 0, -L + 83, 0); add(g, cyl(22.4, 6, M.plavaLED, 28), 0, -L + 92, 0); add(g, cyl(22, 10, M.crvena, 28), 0, -L + 115, 0);
      add(g, kon(12, 5, 14, M.celik), 0, -L + 49, 0);
      add(g, cyl(1.5, 40, M.karbid, 10), 0, -L + 2 + 20, 0);
      add(g, new THREE.Mesh(new THREE.SphereGeometry(R, 16, 12), mat(0xb3123a, { roughness: 0.2 })), 0, -L + R, 0);
      return;
    }
    if (v === 'svrdlo') {
      const vrh = R / Math.tan(59 * Math.PI / 180);
      add(g, cyl(R, L - 40 - vrh, M.karbid, 18), 0, -40 - (L - 40 - vrh) / 2, 0);
      add(g, kon(R, 0.01, vrh, M.karbid, 18), 0, -L + vrh / 2, 0);
      for (const f of [0, Math.PI]) { const tocke = []; for (let i = 0; i <= 60; i++) { const t = i / 60, y = -L + vrh + t * (L - 70 - vrh), k = f + y / 9; tocke.push([Math.cos(k) * R, y, Math.sin(k) * R]); } cijev(g, tocke, R * 0.18, M.tamna, 60); }
      return;
    }
    if (v === 'ureznik') {
      add(g, cyl(R * 0.8, L - 70, M.celik, 18), 0, -40 - (L - 70) / 2, 0);
      for (let i = 0; i < 18; i++) add(g, cyl(i % 2 ? R : R * 0.84, 1.5, M.karbid, 18), 0, -L + 4 + i * 1.5, 0);
      add(g, kon(R * 0.84, R * 0.5, 4, M.karbid, 18), 0, -L + 2, 0);
      return;
    }
    /* utorno glodalo */
    const rez = Math.max(2, Math.min(L - 45, Math.max(20, R * 3.2))), sh = Math.max(R, 6);
    add(g, cyl(sh, L - 40 - rez, M.celik, 20), 0, -40 - (L - 40 - rez) / 2, 0);
    add(g, cyl(R, rez, M.karbid, 20), 0, -L + rez / 2, 0);
    for (let f = 0; f < 3; f++) { const tocke = []; for (let i = 0; i <= 40; i++) { const t = i / 40, y = -L + t * rez, k = f * 2.094 + y / (R * 1.4); tocke.push([Math.cos(k) * R, y, Math.sin(k) * R]); } cijev(g, tocke, Math.max(0.5, R * 0.1), M.tamna, 40); }
  }
  function postaviAlat(a) { ocisti(alatG); if (a && a.L > 0) nacrtajAlat(alatG, a, false); }

  /* spremnik alata (okretni, 6 mjesta) lijevo od stupa i izmjenjivač s dvostrukom hvataljkom */
  const SC = [-480, -170], SR = 150, a0 = Math.atan2(170, 480);
  const spremnik = [add(stroj, cyl(170, 26, M.tamna, 48), SC[0], 392, SC[1]), add(stroj, cyl(46, 80, M.okvir, 24), SC[0], 510, SC[1]), add(stroj, cyl(30, 20, M.crna, 24), SC[0], 560, SC[1])];
  spremnik.push(greda(stroj, [-215, 557, -470], [SC[0], 557, SC[1]], 60, 34, M.plavaT));
  spremnik.push(add(stroj, box(10, 70, 80, M.plavaT), -215, 540, -470));
  const limDvo = new THREE.MeshStandardMaterial({ color: 0xd3d9dd, roughness: 0.6, side: THREE.DoubleSide });
  const oblS = new THREE.Mesh(new THREE.CylinderGeometry(188, 188, 65, 48, 1, true), limDvo);
  const oblogaS = [add(stroj, oblS, SC[0], 437.5, SC[1]), add(stroj, cyl(190, 4, M.limPun, 48), SC[0], 470, SC[1])];
  { const smjer = Math.atan2(480, 170); const sk = new THREE.Mesh(new THREE.CylinderGeometry(188, 188, 75, 40, 1, true, smjer + 0.9, Math.PI * 2 - 1.8), limDvo); oblogaS.push(add(stroj, sk, SC[0], 367.5, SC[1])); }
  dio('oblogaSpremnika', 'Obloga spremnika alata', oblogaS);
  const alatiSpremnik = {};
  for (let k = 0; k < 6; k++) {
    const a = a0 + k * Math.PI / 3, px = SC[0] + SR * Math.cos(a), pz = SC[1] + SR * Math.sin(a);
    const vil = add(stroj, box(50, 7, 30, M.okvir), SC[0] + (SR + 8) * Math.cos(a), 375.5, SC[1] + (SR + 8) * Math.sin(a)); vil.rotation.y = -a; spremnik.push(vil);
    const g = new THREE.Group(); add(stroj, g, px, 376, pz); g.rotation.y = -a;
    nacrtajAlat(g, ALATI_SPREMNIK[k + 1], true);
    alatiSpremnik[k + 1] = g; dio('T' + (k + 1), ALATI_SPREMNIK[k + 1].naziv, g);
  }
  dio('spremnik', 'Spremnik alata', spremnik);
  const izmj = [add(stroj, cyl(38, 26, M.okvir, 28), -250, 372, -60), add(stroj, box(50, 22, 340, M.tamna), -250, 372, -60), add(stroj, cyl(20, 85, M.celik), -250, 427, -60),
    add(stroj, box(80, 60, 80, M.plavaT), -250, 500, -60), add(stroj, box(40, 30, 380, M.plavaT), -250, 515, -270), add(stroj, box(42, 30, 40, M.plavaT), -230, 515, -450)];
  for (const s of [-1, 1]) { izmj.push(add(stroj, box(18, 28, 46, M.tamna), -268, 372, -60 + s * 160)); izmj.push(add(stroj, box(18, 28, 46, M.tamna), -232, 372, -60 + s * 160)); izmj.push(add(stroj, box(56, 30, 10, M.tamna), -250, 372, -60 + s * 186)); }
  dio('izmjenjivac', 'Izmjenjivač alata', izmj);

  /* ---------------------------------------------------------------- 7. kabina */
  const KX = 790, KZF = 830, KZB = -600, KYT = 925, KZH = -300, KYH = 1300, FY = -820, T = 6;
  const kab = [];
  const K = (o) => { kab.push(o); return o; };
  const kp = (w, h, d, m, x, y, z) => K(add(stroj, box(w, h, d, m), x, y, z));
  for (const s of [-1, 1]) {
    const x = s * (KX - T / 2), zc = (KZF + KZB) / 2;
    kp(T, 40, KZF - KZB, M.limPun, x, -800, zc);
    kp(T, 260, KZF - KZB, M.limPun, x, -390, zc);
    kp(T, 260, 40, M.limPun, x, -650, -580);
    kp(T, 260, 970, M.limPun, x, -650, 345);
    kp(T, 1080, 1350, M.staklo, x, 340, 115).userData.staklo = true;
    kp(T + 2, 60, KZF - KZB, M.okvir, x, -230, zc); kp(T + 2, 45, KZF - KZB, M.okvir, x, 902, zc);
    kp(T + 2, 1140, 40, M.okvir, x, 340, -580); kp(T + 2, 1140, 40, M.okvir, x, 340, 810);
    kp(T, KYH - KYT, KZH - KZB, M.lim, x, (KYT + KYH) / 2, (KZH + KZB) / 2);
    kp(40, KYH - FY, 40, M.okvir, s * 770, (FY + KYH) / 2, -580);
    kp(40, KYT - FY, 40, M.okvir, s * 770, (FY + KYT) / 2, 810);
    kp(40, KYH - KYT, 40, M.okvir, s * 770, (KYT + KYH) / 2, -320);
    kp(40, 40, KZF - KZH, M.okvir, s * 770, 905, (KZF + KZH) / 2);
    kp(40, 40, KZH - KZB, M.okvir, s * 770, 1280, (KZH + KZB) / 2);
  }
  /* prednja strana: donja ploha s otvorima za posude za strugotinu, bočne ploče, nadvoj */
  kp(910, -90 - FY, T, M.limPun, 0, (FY - 90) / 2, KZF - T / 2);
  for (const s of [-1, 1]) {
    kp(25, -90 - FY, T, M.limPun, s * 777.5, (FY - 90) / 2, KZF - T / 2);
    kp(310, 20, T, M.limPun, s * 610, -810, KZF - T / 2);
    kp(310, 470, T, M.limPun, s * 610, -325, KZF - T / 2);
    kp(150, KYT + 90, T, M.limPun, s * 715, (KYT - 90) / 2, KZF - T / 2);
  }
  kp(1280, 45, T, M.limPun, 0, 902.5, KZF - T / 2);
  kp(1580, 30, 40, M.okvir, 0, -75, KZF - 20);
  /* stražnja stijenka, krov, nadogradnja iznad stupa */
  kp(KX * 2, KYH - FY, T, M.lim, 0, (FY + KYH) / 2, KZB + T / 2);
  kp(KX * 2, T, KZF - KZH, M.lim, 0, KYT - T / 2, (KZF + KZH) / 2);
  kp(KX * 2, KYH - KYT, T, M.lim, 0, (KYT + KYH) / 2, KZH - T / 2);
  kp(KX * 2, T, KZH - KZB, M.lim, 0, KYH - T / 2, (KZH + KZB) / 2);
  kp(1580, 40, 40, M.okvir, 0, 905, 810); kp(1580, 40, 40, M.okvir, 0, 1280, -580); kp(1580, 40, 40, M.okvir, 0, 1280, -320);
  /* kose plohe dna kabine (strugotina klizi u posude) i pokrov ispred postolja */
  for (const s of [-1, 1]) { const c = kp(517, 4, 1418, M.limCelik, s * 555, -372.5, 115); c.rotation.z = -s * Math.atan2(255, 450); }
  { const c = kp(660, 4, 212, M.limCelik, 0, -120, 721); c.rotation.x = Math.atan2(40, 206); }
  /* pregrade servisnih prostora */
  for (const s of [-1, 1]) {
    kp(T, 270, 420, M.limPun, s * 603, -655, -350);
    kp(184, T, 420, M.limPun, s * 692, -523, -350);
    kp(184, 270, T, M.limPun, s * 692, -655, -563); kp(184, 270, T, M.limPun, s * 692, -655, -137);
  }
  dio('kabina', 'Kabina', kab);
  /* vrata stroja (klizna) */
  function vrata(x0, x1, z) {
    const g = new THREE.Group(); stroj.add(g); const w = x1 - x0, xc = (x0 + x1) / 2;
    add(g, box(w, 80, 6, M.limPun), xc, -50, z); add(g, box(w, 80, 6, M.limPun), xc, 840, z);
    add(g, box(60, 810, 6, M.limPun), x0 + 30, 395, z); add(g, box(60, 810, 6, M.limPun), x1 - 30, 395, z);
    const st = add(g, box(w - 120, 810, 3, M.staklo), xc, 395, z); st.userData.staklo = true;
    const ruc = x0 < 0 ? x1 - 40 : x0 + 40;
    add(g, cyl(10, 300, M.celik), ruc, 330, z + 30); add(g, box(16, 16, 26, M.celik), ruc, 470, z + 16); add(g, box(16, 16, 26, M.celik), ruc, 190, z + 16);
    return g;
  }
  const vrataL = vrata(-640, 10, 839), vrataD = vrata(-10, 640, 845);
  dio('vrataL', 'Vrata stroja, lijeva', vrataL); dio('vrataD', 'Vrata stroja, desna', vrataD);
  /* statusna svjetiljka (ime 'lampa', isti položaj kao prije) */
  const lampa = add(stroj, cyl(16, 70, mat(0x666666, { emissive: 0x000000 })), 560, 960, 420); lampa.name = 'lampa'; lampa.userData.vlastitiMat = true;
  dio('lampa', 'Statusna svjetiljka', lampa, add(stroj, cyl(16.6, 2, M.crna), 560, 948, 420), add(stroj, cyl(16.6, 2, M.crna), 560, 972, 420), add(stroj, cyl(17, 5, M.crna), 560, 997.5, 420));
  /* glavna sklopka (ime 'sklopka', isti položaj) na stražnjoj strani, desno od električnog ormara */
  const sklopka = add(stroj, cyl(40, 30, M.crvena), 160, 420, -605); sklopka.rotation.x = Math.PI / 2; sklopka.name = 'sklopka';
  dio('sklopka', 'Glavna sklopka', sklopka, add(stroj, box(110, 110, 8, M.zuta), 160, 420, -604), add(stroj, box(90, 22, 14, M.crvena), 160, 420, -625));

  /* servisni poklopci (otvaraju se) */
  function poklopac(s) {
    const pivot = new THREE.Group(); add(stroj, pivot, s * 793, -650, -140);
    add(pivot, box(6, 260, 420, M.limPun), 0, 0, -210);
    for (let i = 0; i < 6; i++) add(pivot, box(2, 8, 240, M.okvir), s * 3.5, 70 - i * 22, -250);
    add(pivot, box(14, 60, 14, M.crna), s * 8, 0, -30);
    return pivot;
  }
  const poklopacD = poklopac(1), poklopacL = poklopac(-1);
  dio('poklopacD', 'Desni servisni poklopac', poklopacD); dio('poklopacL', 'Lijevi servisni poklopac', poklopacL);
  /* pneumatska jedinica (iza desnog poklopca) */
  const pn = [];
  const pa = (o) => { pn.push(o); return o; };
  pa(add(stroj, box(4, 240, 200, M.okvir), 608, -655, -450));
  pa(add(stroj, box(40, 50, 170, M.tamna), 640, -600, -450));
  const filt = pa(add(stroj, cyl(22, 80, M.posuda), 640, -665, -500)); filt.userData.staklo = false;
  pa(add(stroj, cyl(18, 50, M.emulzija), 640, -675, -500));
  pa(add(stroj, cyl(22, 80, M.posuda), 640, -665, -400)); pa(add(stroj, cyl(18, 40, M.ulje), 640, -685, -400));
  { const mano = pa(add(stroj, cyl(24, 8, mat(0xf4f6f6), 28), 664, -598, -450)); mano.rotation.z = Math.PI / 2; const k = pa(add(stroj, cyl(25, 4, M.crna, 28), 669, -598, -450)); k.rotation.z = Math.PI / 2; pa(add(stroj, box(2, 20, 2, M.crvena), 671, -593, -452)); }
  pa(add(stroj, box(30, 26, 26, M.tamna), 640, -560, -450));
  for (let i = 0; i < 4; i++) { const z = -350 + i * 26; pa(add(stroj, box(34, 70, 22, M.okvir), 640, -720, z)); pa(add(stroj, box(26, 26, 22, M.crna), 640, -672, z)); pa(add(stroj, box(4, 6, 6, M.zutaLED), 658, -668, z)); }
  pa(add(stroj, box(40, 20, 120, M.tamna), 640, -765, -310));
  for (let i = 0; i < 3; i++) pa(cijev(stroj, [[640, -637, -350 + i * 26], [660, -600, -340 + i * 26], [700, -560, -300 + i * 30], [700, -528, -280 + i * 30]], 4, M.cijev, 16));
  pa(cijev(stroj, [[640, -575, -450], [690, -560, -480], [720, -540, -520], [720, -528, -545]], 5, M.cijev, 16));
  dio('pneumatika', 'Pneumatska jedinica', pn);
  /* centralno podmazivanje (iza desnog poklopca) */
  const cp = [add(stroj, box(110, 60, 110, M.crna), 680, -760, -230), add(stroj, cyl(45, 150, M.posuda, 28), 680, -655, -230), add(stroj, cyl(42, 95, M.ulje, 28), 680, -682, -230),
    add(stroj, cyl(47, 10, M.crvena, 28), 680, -575, -230), stavi(stroj, cylX(28, 735, 765, M.okvir, -760, -230))];
  { const m = add(stroj, cyl(16, 6, mat(0xf4f6f6), 24), 736, -720, -190); m.rotation.z = Math.PI / 2; cp.push(m); }
  for (let i = 0; i < 3; i++) cp.push(cijev(stroj, [[700, -735, -200 + i * 10], [740, -700, -180 + i * 10], [760, -600, -170 + i * 8], [770, -528, -165 + i * 6]], 2.2, M.bakar, 16));
  dio('podmazivanje', 'Centralno podmazivanje', cp);
  /* posuda rashladnog sredstva (SHIP) s crpkom i posuda kliznog ulja (iza lijevog poklopca) */
  const ship = [add(stroj, box(170, 200, 250, mat(0x2d6f86, { roughness: 0.5 })), -697, -700, -430), add(stroj, box(174, 6, 254, M.tamna), -697, -597, -430),
    add(stroj, cyl(36, 50, M.crna, 24), -697, -570, -470), add(stroj, cyl(16, 14, M.okvir), -697, -538, -470), add(stroj, box(4, 60, 30, M.posuda), -611, -700, -380)];
  ship.push(cijev(stroj, [[-697, -545, -440], [-680, -530, -400], [-640, -527, -330]], 5, M.guma, 12));
  dio('ship', 'Posuda rashladnog sredstva (SHIP)', ship);
  const klizno = [add(stroj, box(130, 100, 120, mat(0x51473a, { roughness: 0.5 })), -715, -750, -230), add(stroj, box(124, 4, 114, M.ulje), -715, -705, -230)];
  klizno.push(cijev(stroj, [[-715, -700, -230], [-700, -620, -220], [-680, -528, -210]], 6, M.guma, 12));
  dio('klizno', 'Posuda kliznog ulja', klizno);
  /* pokazivač temperature SHIP-a (izvana, iznad lijevog poklopca) */
  const tTex = platno(180, 100, (g) => { g.fillStyle = '#1b2124'; g.fillRect(0, 0, 180, 100); g.fillStyle = '#0c1a12'; g.fillRect(12, 18, 156, 64); g.fillStyle = '#4cf08a'; g.font = 'bold 44px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('23.4°', 90, 52); });
  const tmp = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), tTex ? new THREE.MeshBasicMaterial({ map: tTex }) : M.crna); tmp.rotation.y = -Math.PI / 2;
  dio('temperatura', 'Pokazivač temperature rashladnog sredstva', add(stroj, box(8, 60, 100, M.tamna), -794, -440, -320), add(stroj, tmp, -798.5, -440, -320));
  /* posude za strugotinu (ladice sprijeda) */
  function posudaStr(s) {
    const g = new THREE.Group(); stroj.add(g);
    const x0 = s * 455, x1 = s * 765, xc = (x0 + x1) / 2, w = Math.abs(x1 - x0);
    add(g, box(w, 4, 620, M.limCelik), xc, -798, 512); add(g, box(4, 230, 620, M.limCelik), x0, -685, 512); add(g, box(4, 230, 620, M.limCelik), x1, -685, 512);
    add(g, box(w, 230, 4, M.limCelik), xc, -685, 204);
    add(g, box(w + 10, 250, 6, M.tamna), xc, -680, 833);
    stavi(g, cylX(8, xc - 90, xc + 90, M.celik, -620, 862)); for (const d of [-80, 80]) add(g, box(12, 12, 26, M.celik), xc + d, -620, 849);
    let sj = 7 + (s > 0 ? 3 : 0); const rnd = () => { sj = (sj * 16807) % 2147483647; return sj / 2147483647; };
    for (let i = 0; i < 26; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(5 + rnd() * 5, 1.1, 5, 10, 2 + rnd() * 3), M.strugotina); t.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6); add(g, t, xc + (rnd() - 0.5) * (w - 40), -790 + rnd() * 18, 260 + rnd() * 520); }
    return g;
  }
  dio('strugotinaD', 'Desna posuda za strugotinu', posudaStr(1)); dio('strugotinaL', 'Lijeva posuda za strugotinu', posudaStr(-1));

  /* ---------------------------------------------------------------- 8. električni ormar (iza stroja, vrata straga) */
  const OX0 = -760, OX1 = 60, OZ0 = -1020, OZ1 = -630, OY0 = -800, OY1 = 1150, OD = -380;
  const orm = [];
  const op = (w, h, d, m, x, y, z) => { const o = add(stroj, box(w, h, d, m), x, y, z); orm.push(o); return o; };
  op(15, OY1 - OY0, OZ1 - OZ0, M.ormar, OX0 + 7.5, (OY0 + OY1) / 2, (OZ0 + OZ1) / 2); op(15, OY1 - OY0, OZ1 - OZ0, M.ormar, OX1 - 7.5, (OY0 + OY1) / 2, (OZ0 + OZ1) / 2);
  op(OX1 - OX0, 15, OZ1 - OZ0, M.ormar, (OX0 + OX1) / 2, OY1 - 7.5, (OZ0 + OZ1) / 2); op(OX1 - OX0, 15, OZ1 - OZ0, M.ormar, (OX0 + OX1) / 2, OY0 + 7.5, (OZ0 + OZ1) / 2);
  op(OX1 - OX0, OY1 - OY0, 15, M.ormar, (OX0 + OX1) / 2, (OY0 + OY1) / 2, OZ1 - 7.5);
  op(10, OY1 - OY0 - 30, OZ1 - OZ0 - 20, M.ormar, OD, (OY0 + OY1) / 2, (OZ0 + OZ1) / 2 - 10);
  op(OX1 - OX0, 20, OZ1 - OZ0, M.tamna, (OX0 + OX1) / 2, -810, (OZ0 + OZ1) / 2);
  op(OX1 - OX0 - 30, OY1 - OY0 - 30, 4, mat(0xc4c9c6, { metalness: 0.4 }), (OX0 + OX1) / 2, (OY0 + OY1) / 2, -641);
  /* kabelski kanali */
  for (const y of [1080, 560, 290, 40, -230]) op(OX1 - OX0 - 40, 46, 70, M.kanal, (OX0 + OX1) / 2, y, -678);
  /* zaštitne sklopke, stezaljke, sklopnici (desni dio) */
  for (let i = 0; i < 12; i++) { op(20, 80, 70, mat(0xeef0f0), -350 + i * 24, 200, -678); op(8, 18, 6, M.crna, -350 + i * 24, 212, -715); }
  for (let i = 0; i < 34; i++) op(7, 50, 46, i % 5 === 4 ? mat(0x2c6fb0) : M.modul, -355 + i * 11, 110, -666);
  for (let i = 0; i < 4; i++) { op(48, 82, 110, M.modulT, -330 + i * 70, -110, -697); op(30, 16, 4, mat(0xeef0f0), -330 + i * 70, -90, -754); }
  /* lijevi dio: transformator, rastavljač, sklopnici */
  op(260, 230, 110, M.modulT, -570, -560, -705);
  for (let i = 0; i < 3; i++) orm.push(add(stroj, cyl(36, 200, M.bakar, 24), -650 + i * 80, -560, -780));
  op(140, 200, 130, M.modulT, -560, 750, -705); op(30, 70, 30, M.crvena, -560, 750, -785);
  for (let i = 0; i < 4; i++) op(52, 90, 110, M.modulT, -690 + i * 70, 300, -697);
  for (let i = 0; i < 14; i++) op(20, 80, 70, mat(0xeef0f0), -720 + i * 24, 40 + 160, -678);
  dio('ormar', 'Električni ormar', orm);
  /* napojni modul, NCU s pogonskim modulima, PLC */
  const modul = (x, w, h, y, d, imeDio) => { const g = []; g.push(add(stroj, box(w, h, d, M.modul), x, y, -643 - d / 2)); g.push(add(stroj, box(w - 4, h - 20, 3, M.modulT), x, y, -644 - d - 1.5)); return g; };
  const nap = modul(-312, 100, 380, 800, 260);
  for (let i = 0; i < 7; i++) nap.push(add(stroj, box(3, 30, 250, M.okvir), -350 + i * 12, 1005, -773));
  nap.push(add(stroj, box(10, 10, 4, M.zelenaLED), -330, 960, -906), add(stroj, box(10, 10, 4, M.zutaLED), -310, 960, -906), add(stroj, box(60, 40, 6, M.crna), -312, 650, -908));
  dio('napojni', 'Napojni modul', nap);
  const ncu = modul(-179, 150, 380, 800, 260).concat(modul(-66, 60, 380, 800, 260), modul(2, 60, 380, 800, 260));
  const ncuTex = platno(120, 60, (g) => { g.fillStyle = '#062a3a'; g.fillRect(0, 0, 120, 60); g.fillStyle = '#7fe0ff'; g.font = 'bold 26px monospace'; g.fillText('NCU', 16, 40); });
  { const d = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), ncuTex ? new THREE.MeshBasicMaterial({ map: ncuTex }) : M.plavaLED); d.rotation.y = Math.PI; ncu.push(add(stroj, d, -179, 930, -907)); }
  for (const x of [-210, -195, -66, 2]) ncu.push(add(stroj, box(8, 8, 4, M.zelenaLED), x, 960, -906));
  for (const x of [-66, 2]) for (let i = 0; i < 3; i++) ncu.push(add(stroj, box(26, 14, 10, M.crna), x, 700 + i * 30, -910));
  dio('ncu', 'Upravljanje s pogonskim modulima (NCU)', ncu);
  const plc = [add(stroj, box(400, 35, 8, M.celik), -150, 430, -647)];
  [[60, -330], [80, -255], [40, -190], [40, -145], [40, -100], [40, -55], [40, -10]].forEach(([w, x], i) => {
    plc.push(add(stroj, box(w - 4, 125, 120, mat(0x4f5a62)), x, 430, -708));
    plc.push(add(stroj, box(w - 10, 90, 4, i < 2 ? M.modulT : mat(0x2c6a54)), x, 425, -770));
    plc.push(add(stroj, box(6, 6, 3, i === 1 ? M.zutaLED : M.zelenaLED), x - w / 2 + 10, 480, -772));
  });
  dio('plc', 'PLC', plc);
  /* vrata ormara (otvaraju se) s ručkama */
  const znakTex = platno(128, 112, (g) => { g.fillStyle = '#f2c21a'; g.strokeStyle = '#111'; g.lineWidth = 8; g.beginPath(); g.moveTo(64, 8); g.lineTo(122, 106); g.lineTo(6, 106); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#111'; g.beginPath(); g.moveTo(70, 34); g.lineTo(48, 74); g.lineTo(64, 72); g.lineTo(56, 98); g.lineTo(82, 58); g.lineTo(66, 60); g.closePath(); g.fill(); });
  function vrataOrmara(xh, w, s) {
    const pivot = new THREE.Group(); add(stroj, pivot, xh, (OY0 + OY1) / 2, OZ0 - 10);
    add(pivot, box(w, OY1 - OY0 - 10, 20, M.ormar), s * w / 2, 0, 0);
    add(pivot, box(w - 40, 4, 2, M.okvir), s * w / 2, (OY1 - OY0) / 2 - 30, -11);
    for (let i = 0; i < 2; i++) { add(pivot, box(150, 150, 4, M.okvir), s * w / 2, -650 + i * 1350, -12); for (let j = 0; j < 7; j++) add(pivot, box(140, 6, 3, M.crna), s * w / 2, -650 + i * 1350 - 60 + j * 20, -14); }
    const ruc = [add(pivot, box(34, 150, 8, M.okvir), s * (w - 32), 0, -13), add(pivot, box(18, 110, 22, M.crna), s * (w - 32), -10, -25), add(pivot, cyl(7, 6, M.celik, 12), s * (w - 32), 60, -18)];
    ruc[2].rotation.x = Math.PI / 2;
    return { pivot, ruc };
  }
  const vrOL = vrataOrmara(OX0, OD - OX0, 1), vrOD = vrataOrmara(OX1, OX1 - OD, -1);
  if (znakTex) { const z = new THREE.Mesh(new THREE.PlaneGeometry(110, 96), new THREE.MeshBasicMaterial({ map: znakTex, transparent: true })); z.rotation.y = Math.PI; add(vrOD.pivot, z, -(OX1 - OD) / 2, 760, -11); }
  dio('ormarL', 'Električni ormar, lijevi dio', vrOL.pivot); dio('ormarD', 'Električni ormar, desni dio', vrOD.pivot);
  dio('rucka', 'Ručka vrata ormara', vrOL.ruc, vrOD.ruc);
  /* kabelski snop od ormara do stroja */
  const snop = [cijev(stroj, [[-180, 1150, -760], [-180, 1270, -760], [-180, 1345, -680], [-180, 1345, -560], [-180, 1300, -470]], 30, M.guma, 50),
    cijev(stroj, [[-110, 1150, -700], [-110, 1240, -700], [-110, 1320, -640], [-110, 1320, -560], [-110, 1300, -500]], 16, mat(0x2b3034), 50)];
  snop.push(add(stroj, box(160, 20, 120, M.tamna), -150, 1160, -730));
  dio('snop', 'Kabelski snop', snop);

  /* ---------------------------------------------------------------- 9. upravljačka ploča na zakretnom nosaču (desno sprijeda) */
  const ploca = new THREE.Group(); ploca.position.set(1070, 400, 960); ploca.rotation.y = -0.35; stroj.add(ploca);
  { const t = rkut(500, 640, 110, 18, mat(0x3a4248, { roughness: 0.5 })); t.position.z = -55; ploca.add(t); }
  const pTex = platno(768, 992, (g, w, h) => {
    const s = 1.6, R = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x * s, y * s, ww * s, hh * s); };
    R(0, 0, 480, 620, '#2a3036');
    R(12, 12, 400, 250, '#1a1f23'); R(20, 20, 384, 234, '#dfe6ea');
    for (let i = 0; i < 4; i++) R(24 + i * 95, 24, 90, 14, '#ffffff');
    R(24, 42, 376, 12, '#c7d3d9'); R(24, 62, 376, 14, '#2d7f97');
    for (let i = 0; i < 6; i++) R(24, 80 + i * 18, 376, 16, i % 2 ? '#e9eff2' : '#f7fafb');
    R(24, 196, 376, 50, '#eef3f5');
    for (let i = 0; i < 8; i++) R(418, 22 + i * 29, 48, 24, '#cfd8dc');
    for (let i = 0; i < 8; i++) R(20 + i * 49, 268, 44, 20, '#cfd8dc');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) R(20 + c * 27, 300 + r * 24, 23, 20, '#e9edef');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) R(300 + c * 24, 300 + r * 24, 20, 20, '#e9edef');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) R(378 + c * 30, 300 + r * 24, 26, 20, r === 3 && c > 0 ? '#f2c21a' : '#e9edef');
    R(12, 404, 456, 204, '#20262b');
    for (let c = 0; c < 6; c++) R(24 + c * 34, 416, 28, 22, '#e9edef');
    for (let c = 0; c < 6; c++) R(24 + c * 34, 444, 28, 22, '#e9edef');
    for (let c = 0; c < 3; c++) R(240 + c * 34, 416, 28, 22, '#e9edef');
    R(240, 444, 28, 22, '#e9edef'); R(274, 444, 28, 22, '#cfd8dc'); R(308, 444, 28, 22, '#e9edef');
    R(24, 476, 50, 26, '#e9edef'); R(84, 476, 50, 26, '#f3c4bd'); R(144, 476, 50, 26, '#bfe8c9');
    R(206, 476, 50, 26, '#f3c4bd'); R(266, 476, 50, 26, '#bfe8c9'); R(326, 476, 50, 26, '#f3c4bd'); R(386, 476, 50, 26, '#bfe8c9');
    R(140, 530, 40, 26, '#1d9e4b');
    g.fillStyle = '#f2c21a'; g.beginPath(); g.arc(70 * s, 555 * s, 38 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a535a'; for (const x of [330, 410]) { g.beginPath(); g.arc(x * s, 555 * s, 30 * s, 0, Math.PI * 2); g.fill(); }
  });
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(480, 620), pTex ? new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.5 }) : M.tamna); f.position.z = 55.6; ploca.add(f); }
  const gljiva = add(ploca, cyl(26, 22, M.crvena, 28), -170, -245, 66); gljiva.rotation.x = Math.PI / 2;
  add(ploca, new THREE.Mesh(new THREE.SphereGeometry(26, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.crvena), -170, -245, 77).rotation.x = Math.PI / 2;
  for (const x of [90, 170]) { const k = add(ploca, cyl(18, 20, M.crna, 24), x, -245, 65); k.rotation.x = Math.PI / 2; add(ploca, box(4, 14, 2, mat(0xffffff)), x, -235, 76); }
  const nosacP = [];
  nosacP.push(add(stroj, box(20, 120, 120, M.okvir), 800, 780, 700));
  ploca.updateMatrixWorld(true);
  const vrhP = new THREE.Vector3(0, 400, -20).applyMatrix4(ploca.matrixWorld);
  nosacP.push(cijev(stroj, [[810, 780, 700], [930, 790, 780], [vrhP.x, 790, vrhP.z]], 22, M.okvir, 20));
  nosacP.push(add(ploca, cyl(22, 80, M.okvir), 0, 360, -20), add(ploca, cyl(30, 24, M.tamna), 0, 395, -20));
  dio('upravljanje', 'Upravljačka ploča', ploca, nosacP);

  /* ---------------------------------------------------------------- gibanje osi i otvaranje */
  const stanje = { X: REF.X, Y: REF.Y, Z: REF.Z };
  function postaviOsi(X = stanje.X, Y = stanje.Y, Z = stanje.Z) {
    stanje.X = X; stanje.Y = Y; stanje.Z = Z;
    const c = -(X - XC), zs = Y - YC;
    stol.position.set(c, 0, zs); sanonice.position.set(0, 0, zs); glava.position.set(0, Z, 0);
    pokYp.postavi(zs + 210, 618); pokYz.postavi(-352, zs - 210);
    pokB[0].postavi(zs + 210, 618); pokB[1].postavi(-352, zs - 210); pokB[2].postavi(zs + 210, 618); pokB[3].postavi(-352, zs - 210);
    pokXd.postavi(c + 380, 400); pokXl.postavi(-400, c - 380);
    pokVd.postavi(-236, Z + 38); pokVg.postavi(Z + 422, 1076);
    lanacP.forEach((m) => { const a = Z + 420; m.scale.y = 1160 - a; m.position.y = (a + 1160) / 2; });
    const cw = 1010 - Z; protuuteg.position.y = cw - 150;
    lanacS.forEach((m) => { m.scale.y = 1160 - cw; m.position.y = (cw + 1160) / 2; });
  }
  postaviOsi();
  const otvaranje = { ormar: 0, poklopacD: 0, poklopacL: 0 };
  function otvori(ime, t) {   /* t: 0 = zatvoreno … 1 = otvoreno */
    t = Math.max(0, Math.min(1, t)); otvaranje[ime] = t;
    if (ime === 'ormar') { vrOL.pivot.rotation.y = 1.65 * t; vrOD.pivot.rotation.y = -1.65 * t; }
    if (ime === 'poklopacD') poklopacD.rotation.y = -1.75 * t;
    if (ime === 'poklopacL') poklopacL.rotation.y = 1.75 * t;
  }

  return { stroj, stol, sanonice, glava, alatG, steznik, sklopka, lampa, skripacGrupa, obrGrupa, pandzeGrupa, XC, YC, lok, postaviOsi, dijelovi,
    REF, HOD, M, stanje, otvori, otvaranje, postaviAlat, postaviSkripac, postaviObradak, nacrtajAlat, alatiSpremnik, ploca };
}
