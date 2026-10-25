/* FORTRONIQ · CNC tokarenje, SINUMERIK 840D — zajednički 3D model tokarilice s kosom posteljom i revolverskom glavom.
   Koriste ga stranice „Upoznavanje stroja” i „Postavljanje stroja”. Model i mjere su naši (pojednostavljeni).
   Konvencije (mm, Y scene = gore):
     os vretena leži na y = 0, z = 0; strojna os Z ide po osi x scene:  x = Z − ZX  (ZX = 300, čelo vretena je M, Z = 0)
     strojna os X je promjer i giba se po kosini postelje (45°): smjer u = (0, sin45, −cos45) — gore i natrag
     MKS položaj osi (X, Z) je referentna točka revolvera F (X kao promjer: X = 2 · udaljenost F od osi)
     vrh alata u MKS:  X = Xf − 2·L1,  Z = Zf − L2  (L1 = Length1, L2 = Length2 iz korekcija alata)
   © ForTroniQ d.o.o. */

export const ZX = 300;                                   /* x scene = Z − ZX */
export const KOS = Math.PI / 4;                          /* nagib postelje */
export const REF = { X: 300, Z: 450 };                   /* referentna točka (F) */
export const HOD = { X: [-10, 320], Z: [-30, 460] };
export const RS = 150;                                   /* polumjer kruga stanica na ploči revolvera */
/* pripremak: Ø80, čelo pripremka na Z = 128,539 (MKS), stegnut u čeljustima */
export const PRIPREMAK = { R: 40, Z0: 30, Z1: 128.539 };
export const STEZNA = { R: 105, Z1: 60, celjustZ1: 85 };   /* tijelo stezne glave Z 0 … 60, čeljusti do Z 85 */
/* alati u revolveru (stanica = broj alata). L1, L2, R: CD-ove vrijednosti korekcija za tu vrstu alata; T8 je naša pretpostavka */
export const ALATI = {
  1: { vrsta: 'vanjski', kut: 80, L1: 49.606, L2: 63.485, R: 0.8, naziv: 'T1 vanjski nož za grubo tokarenje 80°' },
  2: { vrsta: 'svrdlo', R0: 16, L1: 7.036, L2: 171.866, R: 0.3, naziv: 'T2 svrdlo za puno bušenje Ø32' },
  3: { vrsta: 'vanjski', kut: 35, L1: 52.258, L2: 63.589, R: 0.4, naziv: 'T3 vanjski nož za fino tokarenje 35°' },
  4: { vrsta: 'unutarnji', kut: 80, L1: 11.811, L2: 204.739, R: 0.8, naziv: 'T4 unutarnji nož za grubo tokarenje 80°' },
  5: { vrsta: 'usijecanje', sirina: 1.8, L1: 44.970, L2: 67.199, R: 0.1, naziv: 'T5 vanjski nož za usijecanje i odrezivanje 1,8 mm' },
  6: { vrsta: 'unutarnji', kut: 35, L1: 16.784, L2: 209.350, R: 0.4, naziv: 'T6 unutarnji nož za fino tokarenje 35°' },
  7: { vrsta: 'navoj', L1: 44.673, L2: 62.147, R: 0.1, naziv: 'T7 vanjski nož za navoj' },
  8: { vrsta: 'glodalo', R0: 5, L1: 30, L2: 150, R: 5, naziv: 'T8 glodalo za utore Ø10 (pogonjeni alat)' }
};

export function napraviStroj(THREE, scene, opcije = {}) {
  const imaDoc = typeof document !== 'undefined';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.12 }, o));
  const M = Object.assign({
    siva: mat(0xb9c2c8), tamna: mat(0x3b4247), plava: mat(0x1f6f87), plavaT: mat(0x185a6d), celik: mat(0x9aa3aa, { metalness: 0.7, roughness: 0.3 }),
    alu: mat(0xd2d7db, { metalness: 0.4 }), zuta: mat(0xf2c21a), crvena: mat(0xc0392b), crna: mat(0x23282c, { roughness: 0.7 }),
    staklo: new THREE.MeshStandardMaterial({ color: 0x9fc6d4, transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false }),
    lim: new THREE.MeshStandardMaterial({ color: 0xd8dee2, transparent: true, opacity: 0.32, roughness: 0.5, metalness: 0.2, depthWrite: false }),
    limPun: mat(0xd3d9dd, { roughness: 0.6 }), okvir: mat(0x56616a, { roughness: 0.5, metalness: 0.3 }), limCelik: mat(0xb5bcc2, { metalness: 0.55, roughness: 0.35 }),
    postelja: mat(0x1f6f87, { roughness: 0.6 }), saonice: mat(0x46525a, { metalness: 0.25 }), karbid: mat(0xe3e7ea, { metalness: 0.8, roughness: 0.2 }),
    plocice: mat(0xc9a227, { metalness: 0.6, roughness: 0.3 }), ormar: mat(0xd9dcdc, { roughness: 0.65 }), modul: mat(0xc9ced0, { roughness: 0.5 }),
    modulT: mat(0x2f363b, { roughness: 0.6 }), kanal: mat(0x9ea4a8, { roughness: 0.7 }), bakar: mat(0xb87333, { metalness: 0.7, roughness: 0.35 }),
    cijev: mat(0x2f7fd0, { roughness: 0.5 }), ulje: new THREE.MeshStandardMaterial({ color: 0xe8b923, transparent: true, opacity: 0.75, roughness: 0.2 }),
    hidraulicno: new THREE.MeshStandardMaterial({ color: 0xd88a1e, transparent: true, opacity: 0.8, roughness: 0.2 }),
    posuda: new THREE.MeshStandardMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }),
    emulzija: mat(0xe6ece4, { roughness: 0.3 }), zelenaLED: mat(0x1d9e4b, { emissive: 0x1d9e4b, emissiveIntensity: 0.9 }),
    zutaLED: mat(0xf2c21a, { emissive: 0xf2c21a, emissiveIntensity: 0.8 }), plavaLED: mat(0x3fa9f5, { emissive: 0x3fa9f5, emissiveIntensity: 0.8 }),
    guma: mat(0x1b1e21, { roughness: 0.9 }), strugotina: mat(0x8d969c, { metalness: 0.7, roughness: 0.35 }),
    magnet: mat(0x5a4632, { roughness: 0.5, metalness: 0.4 }), letva: mat(0xbfe6ef, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }),
    obradak: mat(0xc9ced2, { metalness: 0.45, roughness: 0.35 })
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

  /* kosina postelje: u = smjer osi X (gore i natrag), n = normala kosine (gore i prema korisniku) */
  const SN = Math.sin(KOS), CS = Math.cos(KOS);
  const tocka = (x, t, nn) => new THREE.Vector3(x, t * SN + nn * CS, -t * CS + nn * SN);
  /* kutija poravnata s kosinom: x0…x1 po osi vretena, t0…t1 po u, n0…n1 po n */
  function kos(p, x0, x1, t0, t1, n0, n1, m) {
    const b = box(x1 - x0, t1 - t0, n1 - n0, m); b.rotation.x = -KOS;
    b.position.copy(tocka((x0 + x1) / 2, (t0 + t1) / 2, (n0 + n1) / 2)); p.add(b); return b;
  }
  /* valjak po osi x scene na položaju (t, n) */
  function valjakX(p, r, x0, x1, t, nn, m, s) { const v = tocka(0, t, nn); return stavi(p, cylX(r, x0, x1, m, v.y, v.z, s)); }
  const D = 200;                       /* kosina postelje leži na n = −D */

  /* ---------------------------------------------------------------- 1. postelja (nepomična) */
  const stroj = new THREE.Group(); stroj.name = 'stroj'; scene.add(stroj);
  const kt = (t) => [-141.42 - 0.7071 * t, -141.42 + 0.7071 * t];   /* [z, y] točke na kosini */
  const postelja = izvuciX([kt(-300), kt(520), [-620, kt(520)[1]], [-620, -820], [230, -820], [230, -470]], -950, 900, M.postelja);
  stroj.add(postelja);
  const posteljaD = [postelja, add(stroj, box(1950, 330, 950, M.plavaT), -25, -985, -175)];
  for (const x of [-900, 0, 850]) for (const z of [-560, 200]) posteljaD.push(add(stroj, cyl(40, 14, M.tamna), x, -1143, z));
  /* rebra u šupljini postelje (vide se s kraja) */
  for (const x of [-952, 902]) posteljaD.push(add(stroj, box(4, 600, 500, M.plavaT), x, -420, -250));
  dio('postelja', 'Postelja stroja', posteljaD);
  /* vodilice osi Z (za uzdužne saonice) */
  const vodZ = [];
  for (const t of [40, 440]) vodZ.push(kos(stroj, -620, 880, t - 17, t + 17, -D, -D + 16, M.celik));
  /* kuglično navojno vreteno Z */
  const vrZ = valjakX(stroj, 12, -580, 860, 240, -D + 15, M.celik, 24);
  if (navojTex) { const t = navojTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 144); t.needsUpdate = true; vrZ.material = mat(0xffffff, { map: t, metalness: 0.6, roughness: 0.32 }); }
  const vrZd = [vrZ, kos(stroj, -620, -575, 210, 270, -D, -D + 34, M.tamna), kos(stroj, 860, 900, 210, 270, -D, -D + 34, M.tamna)];
  const svZ = servo(100); svZ.g.rotation.order = 'YXZ'; svZ.g.rotation.set(0, Math.PI / 2, -KOS); svZ.g.position.copy(tocka(905, 240, -D + 15)); stroj.add(svZ.g);
  dio('servoZ', 'Servomotor osi Z', svZ.g);
  /* izravni mjerni sustav Z: staklena mjerna letva uz prednji rub kosine */
  const letvaZ = [kos(stroj, -560, 860, -50, -30, -D, -D + 8, M.okvir), kos(stroj, -555, 855, -47, -33, -D + 8, -D + 11, M.letva)];
  /* vodilice konjića (donji dio kosine) */
  const vodK = [];
  for (const t of [-250, -110]) vodK.push(kos(stroj, -120, 880, t - 15, t + 15, -D, -D + 18, M.celik));
  dio('vodiliceKonjica', 'Vodilice konjića', vodK);

  /* ---------------------------------------------------------------- 2. glava s glavnim vretenom (nepomično kućište) */
  const kuciste = izvuciX([[210, -492.8], [210, 240], [-250, 240], [-420, 137]], -900, -340, M.plava);
  stroj.add(kuciste);
  const glavaD = [kuciste, stavi(stroj, cylX(115, -340, -300, M.celik, 0, 0, 40)), stavi(stroj, cylX(70, -960, -900, M.celik, 0, 0, 32)),
    add(stroj, box(4, 380, 300, M.plavaT), -338, 20, 40)];
  for (const y of [-120, 120]) glavaD.push(add(stroj, box(8, 30, 260, M.plavaT), -620, y + (y > 0 ? 120 : 0), 0));
  /* mlaznica rashladnog sredstva iznad stezne glave */
  glavaD.push(cijev(stroj, [[-345, 230, -120], [-300, 200, -110], [-240, 130, -80], [-200, 82, -52]], 5, M.cijev, 20), add(stroj, kon(2.5, 5, 12, M.zuta), -196, 76, -46));
  dio('glava', 'Glava s glavnim vretenom', glavaD);
  /* glavni motor iza glave, remenski prijenos na stražnjem kraju */
  const mot = [stavi(stroj, cylX(110, -890, -560, M.crna, 360, -430, 36))];
  for (let i = 1; i < 7; i++) mot.push(stavi(stroj, cylX(113, -890 + i * 46, -886 + i * 46, M.guma, 360, -430, 36)));
  mot.push(stavi(stroj, cylX(70, -560, -540, M.okvir, 360, -430)), add(stroj, box(90, 70, 80, M.tamna), -700, 490, -430), stavi(stroj, cylX(40, -935, -890, M.okvir, 360, -430)));
  { const L = Math.hypot(360, 430), rem = add(stroj, box(30, L + 220, 220, M.limPun), -920, 180, -215); rem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 360, -430).normalize()); mot.push(rem); }
  dio('motor', 'Glavni pogonski motor', mot);
  /* kutni davač: pogonjen zupčastim remenom s glavnog vretena */
  const dav = [stavi(stroj, cylX(36, -990, -945, M.okvir, -220, 150, 28)), stavi(stroj, cylX(30, -1000, -990, M.crna, -220, 150, 28)), add(stroj, box(26, 30, 30, M.tamna), -970, -262, 150)];
  { const r = add(stroj, box(12, Math.hypot(220, 150) + 60, 44, M.crna), -948, -110, 75); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -220, 150).normalize()); dav.push(r); }
  dav.push(cijev(stroj, [[-970, -275, 150], [-990, -330, 120], [-1000, -420, 40], [-990, -470, -150]], 5, M.guma, 16));
  dio('davac', 'Kutni davač', dav);
  /* šuplji stezni cilindar na stražnjem kraju vretena */
  const cil = [stavi(stroj, cylX(100, -1110, -965, M.alu, 0, 0, 36)), stavi(stroj, cylX(104, -1120, -1108, M.okvir, 0, 0, 36)), stavi(stroj, cylX(104, -967, -957, M.okvir, 0, 0, 36)),
    stavi(stroj, cylX(32, -1135, -1118, M.crna, 0, 0, 24)), stavi(stroj, cylX(48, -1135, -1121, M.celik, 0, 0, 24))];
  for (const z of [-40, 40]) cil.push(cijev(stroj, [[-1060, 100, z], [-1060, 160, z * 1.4], [-1020, 230, z * 2], [-900, 260, -400], [-800, 120, -820]], 7, M.guma, 30));
  dio('cilindar', 'Šuplji stezni cilindar', cil);
  /* pokrov steznog cilindra s pokazivačem i podešavanjem tlaka te podešavanjem steznog puta */
  const pokrov = [add(stroj, box(220, 8, 300, M.limPun), -1065, 214, 0), add(stroj, box(220, 8, 300, M.limPun), -1065, -134, 0),
    add(stroj, box(8, 340, 300, M.limPun), -1171, 40, 0), add(stroj, box(220, 340, 8, M.limPun), -1065, 40, -150), add(stroj, box(220, 340, 6, M.lim), -1065, 40, 152)];
  pokrov[4].userData.staklo = true;
  dio('pokrovCil', 'Pokrov steznog cilindra', pokrov);
  const tlTex = platno(160, 90, (g) => { g.fillStyle = '#1b2124'; g.fillRect(0, 0, 160, 90); g.fillStyle = '#0c1a12'; g.fillRect(10, 14, 140, 62); g.fillStyle = '#4cf08a'; g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('30.0', 80, 46); g.font = '13px sans-serif'; g.fillStyle = '#9fb'; g.fillText('bar', 136, 80); });
  const tlakP = [add(stroj, box(90, 60, 14, M.tamna), -1115, 150, 160)];
  { const d = new THREE.Mesh(new THREE.PlaneGeometry(80, 45), tlTex ? new THREE.MeshBasicMaterial({ map: tlTex }) : M.crna); tlakP.push(add(stroj, d, -1115, 150, 167.2)); }
  dio('tlakPokaz', 'Pokazivač tlaka stezanja', tlakP);
  const tlakS = [add(stroj, box(70, 70, 20, M.okvir), -1015, 150, 162)];
  { const k = add(stroj, cyl(18, 26, M.crna, 20), -1015, 150, 184); k.rotation.x = Math.PI / 2; tlakS.push(k); tlakS.push(add(stroj, box(4, 14, 2, mat(0xffffff)), -1015, 160, 198)); }
  { const m = add(stroj, cyl(24, 8, mat(0xf4f6f6), 24), -1015, 60, 168); m.rotation.x = Math.PI / 2; tlakS.push(m, add(stroj, box(2, 18, 2, M.crvena), -1012, 66, 173)); }
  dio('tlakPodes', 'Podešavanje tlaka stezanja', tlakS);
  /* stezni put: dva granična osjetnika na letvi uz pomični prsten cilindra (vide se kroz prozorčić) */
  const put = [add(stroj, box(170, 10, 14, M.celik), -1040, -40, 135), add(stroj, box(16, 22, 26, M.zutaLED), -1085, -40, 135), add(stroj, box(16, 22, 26, M.zelenaLED), -1000, -40, 135),
    add(stroj, box(10, 40, 10, M.okvir), -1040, -70, 125)];
  for (const x of [-1085, -1000]) put.push(add(stroj, cyl(4, 30, M.celik, 10), x, -40, 155).rotateX(Math.PI / 2));
  dio('putPodes', 'Podešavanje steznog puta', put);

  /* ---------------------------------------------------------------- 3. stezna glava, čeljusti i obradak (vrte se s vretenom) */
  const vrtnja = new THREE.Group(); vrtnja.name = 'vrtnja'; scene.add(vrtnja);
  const SG = STEZNA;
  const sg = [stavi(vrtnja, cylX(SG.R, -ZX, SG.Z1 - ZX, M.celik, 0, 0, 48)), stavi(vrtnja, cylX(SG.R - 4, SG.Z1 - ZX, SG.Z1 - ZX + 1.5, M.okvir, 0, 0, 48)),
    stavi(vrtnja, cylX(28, SG.Z1 - ZX, SG.Z1 - ZX + 2, M.crna, 0, 0, 24))];
  for (let i = 0; i < 3; i++) { const a = i * 2 * Math.PI / 3 + Math.PI / 3; sg.push(add(vrtnja, box(6, 12, 12, M.tamna), SG.Z1 - ZX + 2, Math.cos(a) * 85, Math.sin(a) * 85)); }
  dio('steznaGlava', 'Stezna glava', sg);
  const celj = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(); g.rotation.x = i * 2 * Math.PI / 3; vrtnja.add(g);
    const x0 = SG.Z1 - ZX;
    celj.push(add(g, box(SG.celjustZ1 - SG.Z1, 30, 28, M.tamna), x0 + (SG.celjustZ1 - SG.Z1) / 2, PRIPREMAK.R + 15 + 30, 0));
    celj.push(add(g, box(SG.celjustZ1 - SG.Z1 - 8, 15, 28, M.tamna), x0 + (SG.celjustZ1 - SG.Z1 - 8) / 2, PRIPREMAK.R + 7.5, 0));
    celj.push(add(g, box(14, 50, 30, M.celik), x0 + 7, PRIPREMAK.R + 50, 0));
    for (let k = 0; k < 4; k++) celj.push(add(g, box(SG.celjustZ1 - SG.Z1 - 8, 1.2, 28.4, M.crna), x0 + (SG.celjustZ1 - SG.Z1 - 8) / 2, PRIPREMAK.R + 2 + k * 3, 0));
    celj.push(stavi(g, cylX(5, x0 + SG.celjustZ1 - SG.Z1 - 1, x0 + SG.celjustZ1 - SG.Z1 + 1, M.crna, PRIPREMAK.R + 40, 0, 10)));
  }
  dio('celjusti', 'Stezne čeljusti', celj);
  const obrG = new THREE.Group(); vrtnja.add(obrG);
  dio('obradak', 'Obradak', obrG);
  const ocisti = (g) => { while (g.children.length) { const c = g.children.pop(); c.traverse((o) => { if (o.geometry && o.geometry !== jed) o.geometry.dispose(); }); } };
  /* profil: niz [r, Z] (MKS) od stražnjeg kraja na osi, preko oboda do čela na osi */
  function postaviObradak(profil) {
    ocisti(obrG);
    const P = profil || [[0, PRIPREMAK.Z0], [PRIPREMAK.R, PRIPREMAK.Z0], [PRIPREMAK.R, PRIPREMAK.Z1], [0, PRIPREMAK.Z1]];
    /* svaka unutarnja točka dvaput: oštri bridovi (LatheGeometry računa normale iz susjednih dužina) */
    const T2 = []; P.forEach((p, k) => { T2.push(p); if (k > 0 && k < P.length - 1) T2.push(p); });
    const geo = new THREE.LatheGeometry(T2.map((p) => new THREE.Vector2(Math.max(0.001, p[0]), p[1] - ZX)), 64);
    geo.rotateZ(-Math.PI / 2);
    const me = new THREE.Mesh(geo, M.obradak); obrG.add(me);
    /* biljeg na obodu, da se vidi vrtnja */
    const zMax = Math.max(...P.map((p) => p[1])), rr = P.reduce((a, p) => (p[1] < zMax - 3 && p[1] > zMax - 15 ? Math.max(a, p[0]) : a), 0);
    if (rr > 2) { const b = add(obrG, box(8, 1, 4, M.crna), zMax - ZX - 9, rr + 0.2, 0); void b; }
    return me;
  }
  if (opcije.obradak !== false) postaviObradak();

  /* nultočke */
  const nulaW = new THREE.Group(); scene.add(nulaW);
  const nulaM = new THREE.Group(); scene.add(nulaM);
  dio('nulaW', 'Nultočka obratka W', nulaW); dio('nulaM', 'Nultočka stroja M', nulaM);
  function triada(g, d, r) {
    const mk = (c) => mat(c, { emissive: c, emissiveIntensity: 0.55 });
    const strelica = (m, smjer) => { const s = new THREE.Group(); add(s, cyl(r, d - 3 * r, m, 12), 0, (d - 3 * r) / 2, 0); add(s, kon(0, r * 2.2, 3 * r, m, 14), 0, d - 1.5 * r, 0); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), smjer); g.add(s); return s; };
    strelica(mk(0xd23b2a), new THREE.Vector3(0, SN, -CS));     /* X → u (gore i natrag) */
    strelica(mk(0x2b6fd6), new THREE.Vector3(1, 0, 0));         /* Z → +x */
    add(g, new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 14, 10), M.crna));
  }
  triada(nulaW, 46, 2); { const o = oznaka('W', '#17656E'); o.position.set(10, 40, 26); nulaW.add(o); }
  triada(nulaM, 60, 2.4); { const o = oznaka('M', '#B23B2A'); o.position.set(-14, 50, 40); nulaM.add(o); }
  nulaM.position.set(-ZX, 0, 0);
  function postaviW(Zw) { nulaW.position.set(Zw - ZX, 0, 0); }
  postaviW(PRIPREMAK.Z1 - 1);

  /* ---------------------------------------------------------------- 4. konjić (stoji na svojim vodilicama) */
  const konjic = new THREE.Group(); konjic.position.x = 120; stroj.add(konjic);
  const konD = [kos(konjic, 520, 780, -290, -70, -D + 18, -D + 52, M.plavaT), kos(konjic, 540, 760, -230, 30, -D + 52, -40, M.plava),
    stavi(konjic, cylX(82, 515, 765, M.plava, 0, 0, 36)), stavi(konjic, cylX(52, 765, 870, M.alu, 0, 0, 28)), stavi(konjic, cylX(56, 860, 872, M.okvir, 0, 0, 28))];
  for (const t of [-250, -110]) konD.push(kos(konjic, 530, 770, t - 22, t + 22, -D + 14, -D + 26, M.tamna));
  konD.push(cijev(konjic, [[860, 40, -30], [900, 80, -80], [930, 60, -250], [920, -250, -480]], 6, M.guma, 20));
  const pinolaK = stavi(konjic, cylX(46, 445, 520, M.celik, 0, 0, 32));
  dio('konjic', 'Konjić', konD, pinolaK);
  const siljak = [stavi(konjic, cylX(24, 425, 447, M.celik, 0, 0, 24))];
  { const k = kon(0.5, 22, 30, M.karbid, 28); k.rotation.z = Math.PI / 2; siljak.push(add(konjic, k, 410, 0, 0)); }
  dio('siljak', 'Šiljak', siljak);

  /* ---------------------------------------------------------------- 5. uzdužne saonice (os Z) i poprečne saonice (os X) s revolverom */
  const uzduzne = new THREE.Group(); uzduzne.name = 'uzduzne'; scene.add(uzduzne);
  const uzD = [kos(uzduzne, 75, 330, -20, 500, -D + 30, -D + 70, M.saonice)];
  dio('uzduzne', 'Uzdužne saonice', uzD);
  const kolZ = [];
  for (const x of [115, 290]) for (const t of [40, 440]) kolZ.push(kos(uzduzne, x - 40, x + 40, t - 30, t + 30, -D + 16, -D + 30, M.tamna));
  dio('vodiliceZ', 'Vodilice osi Z', vodZ, kolZ);
  const maticaZ = kos(uzduzne, 160, 245, 215, 265, -D + 3, -D + 30, M.okvir);
  dio('vretenoZ', 'Kuglično navojno vreteno osi Z', vrZd, maticaZ);
  const glavaZ = [kos(uzduzne, 180, 240, -58, -28, -D + 10, -D + 30, M.tamna), kos(uzduzne, 195, 225, -52, -36, -D + 30, -D + 34, M.zelenaLED)];
  dio('mjerniZ', 'Izravni mjerni sustav osi Z', letvaZ, glavaZ);
  const vodX = [];
  for (const x of [110, 295]) vodX.push(kos(uzduzne, x - 15, x + 15, -20, 500, -D + 70, -D + 86, M.celik));
  const magnetX = kos(uzduzne, 172, 233, -20, 500, -D + 70, -D + 78, M.magnet);
  const letvaX = [kos(uzduzne, 322, 330, -10, 490, -D + 60, -D + 80, M.okvir), kos(uzduzne, 330, 333, -5, 485, -D + 64, -D + 76, M.letva)];
  /* pokrovni lim nad vodilicama X */
  const poprecne = new THREE.Group(); poprecne.name = 'poprecne'; uzduzne.add(poprecne);
  const popD = [kos(poprecne, 80, 325, 0, 300, -D + 92, -D + 125, M.saonice)];
  dio('poprecne', 'Poprečne saonice', popD);
  const kolX = [];
  for (const x of [110, 295]) for (const t of [40, 260]) kolX.push(kos(poprecne, x - 22, x + 22, t - 34, t + 34, -D + 84, -D + 94, M.tamna));
  dio('vodiliceX', 'Vodilice osi X', vodX, kolX);
  const primarX = [kos(poprecne, 168, 237, 50, 250, -D + 80, -D + 92, M.bakar), kos(poprecne, 166, 239, 48, 252, -D + 89, -D + 92, M.tamna)];
  primarX.push(cijev(poprecne, [[240, 230, -70], [280, 250, -60], [330, 300, -40]].map((p) => [p[0], p[1] * SN + p[2] * CS, -p[1] * CS + p[2] * SN]), 6, M.guma, 12));
  dio('linmotX', 'Linearni motor osi X', magnetX, primarX);
  const glavaX = [kos(poprecne, 325, 345, 140, 170, -D + 62, -D + 82, M.tamna), kos(poprecne, 345, 348, 146, 164, -D + 66, -D + 78, M.zelenaLED)];
  dio('mjerniX', 'Izravni mjerni sustav osi X', letvaX, glavaX);

  /* revolverska glava */
  const rev = [kos(poprecne, 60, 300, RS - 105, RS + 105, -D + 125, 30, M.plava), valjakX(poprecne, 115, 60, 300, RS, 0, M.plava, 40), valjakX(poprecne, 62, 300, 420, RS, 0, M.crna, 28),
    valjakX(poprecne, 66, 300, 312, RS, 0, M.okvir, 28)];
  rev.push(cijev(poprecne, [[180, RS + 110, 40], [200, RS + 170, 60], [240, RS + 230, 30]].map((p) => [p[0], p[1] * SN + p[2] * CS, -p[1] * CS + p[2] * SN]), 9, M.guma, 12));
  const nosac = new THREE.Group(); nosac.position.copy(tocka(0, RS, 0)); nosac.rotation.x = -KOS; poprecne.add(nosac);
  const disk = new THREE.Group(); disk.name = 'disk'; nosac.add(disk);
  const ploha = new THREE.Mesh(new THREE.CylinderGeometry(178, 178, 60, 12), M.alu); ploha.rotation.z = Math.PI / 2; ploha.rotation.x = Math.PI / 12; ploha.position.x = 30; disk.add(ploha);
  const diskD = [ploha, add(disk, new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 4, 24), M.okvir), -2, 0, 0)];
  diskD[1].rotation.z = Math.PI / 2;
  dio('revolver', 'Revolverska glava', rev);
  const drz = [];
  const stanice = {};
  const ALT = Object.assign({}, ALATI, opcije.alati || {});
  for (let k = 1; k <= 12; k++) {
    const g = new THREE.Group(); g.rotation.x = (k - 1) * Math.PI / 6; disk.add(g); stanice[k] = g;
    /* broj stanice na obodu ploče */
    const br = oznaka(String(k), '#2f363b'); br.scale.set(12, 12, 1); br.position.set(36, -RS - 30, 0); g.add(br); diskD.push(br);
    const a = ALT[k];
    if (!a || k > 8) { diskD.push(stavi(g, cylX(22, -3, 0, M.okvir, -RS, 0, 20)), stavi(g, cylX(14, -4, -3, M.crna, -RS, 0, 16))); continue; }
    const tg = new THREE.Group(); g.add(tg);
    drz.push(...nacrtajAlatT(tg, a, true));
    dio('T' + k, a.naziv, tg);
  }
  dio('disk', 'Ploča revolvera', diskD);
  dio('drzaci', 'Držač alata', drz);

  /* ---------------------------------------------------------------- 6. alati za tokarenje (u okviru stanice: F je na (0, −RS, 0), alat prema −y, prema steznoj glavi −x) */
  function oblikKuta(a1, a2, l) { const d1 = [Math.cos(a1), Math.sin(a1)], d2 = [Math.cos(a2), Math.sin(a2)]; return oblik([[0, 0], [l * d1[0], l * d1[1]], [l * (d1[0] + d2[0]), l * (d1[1] + d2[1])], [l * d2[0], l * d2[1]]]); }
  function plocica(g, x, y, sh, m = M.plocice) { const p = izvuci(sh, 4, m); p.geometry.translate(0, 0, -2); p.position.set(x, y, 0); g.add(p); return p; }
  function nacrtajAlatT(g, a, sDrzacem) {
    const L1 = a.L1, L2 = a.L2, yv = -RS - L1, xv = -L2, dr = [];
    const blok = (x0, x1, y0, y1, z) => { const b = add(g, box(x1 - x0, y1 - y0, 2 * z, M.okvir), (x0 + x1) / 2, (y0 + y1) / 2, 0); dr.push(b); return b; };
    const v = a.vrsta;
    if (v === 'vanjski' || v === 'navoj' || v === 'usijecanje') {
      if (sDrzacem) { blok(-(L2 - 26), 0, -RS - 22, -RS + 30, 27); dr.push(stavi(g, cylX(20, -2, 0, M.celik, -RS, 0, 20))); }
      if (v === 'usijecanje') {
        add(g, box(26.2, L1 - 30, 20, M.tamna), xv + 14.9, yv + 18 + (L1 - 30) / 2 - 4, 0);
        add(g, box(1.8, 30, 16, M.karbid), xv + 0.9, yv + 15, 0);
        add(g, box(1.8, 3, 16, M.plocice), xv + 0.9, yv + 1.5, 0);
        return dr;
      }
      add(g, box(24, L1 - 24, 25, M.celik), xv + 6 + 12, yv + 10 + (L1 - 24) / 2, 0);
      if (v === 'navoj') { plocica(g, xv, yv, oblik([[0, 0], [4.6, 8], [-4.6, 8]])); add(g, box(10, 5, 6, M.tamna), xv + 2, yv + 11, 3); return dr; }
      const k = a.kut * Math.PI / 180;
      plocica(g, xv, yv, oblikKuta(0.06, 0.06 + k, a.kut > 50 ? 12.7 : 11));
      add(g, box(9, 4, 9, M.tamna), xv + 8, yv + 6, 3);
      return dr;
    }
    if (v === 'unutarnji') {
      const rb = a.kut > 50 ? 10 : 8, yc = yv - rb - 1.5;
      if (sDrzacem) { blok(-46, 0, yc - 26, -RS + 30, 27); dr.push(stavi(g, cylX(20, -2, 0, M.celik, -RS, 0, 20))); }
      stavi(g, cylX(rb, xv + 4, -46, M.celik, yc, 0, 20));
      const k = a.kut * Math.PI / 180;
      plocica(g, xv, yv, oblikKuta(-0.06, -0.06 - k, a.kut > 50 ? 9 : 8));
      return dr;
    }
    if (v === 'svrdlo') {
      const R0 = a.R0, vrh = R0 * Math.tan(31 * Math.PI / 180);
      if (sDrzacem) { blok(-52, 0, yv - 34, -RS + 30, 34); dr.push(stavi(g, cylX(20, -2, 0, M.celik, -RS, 0, 20))); }
      stavi(g, cylX(R0, xv + vrh, -52, M.karbid, yv, 0, 20));
      const k = kon(0.3, R0, vrh, M.karbid, 20); k.rotation.z = Math.PI / 2; add(g, k, xv + vrh / 2, yv, 0);
      for (const f of [0, Math.PI]) { const t = []; for (let i = 0; i <= 50; i++) { const s = i / 50, x = xv + vrh + s * (L2 - 70 - vrh), kk = f + x / 14; t.push([x, yv + Math.cos(kk) * R0, Math.sin(kk) * R0]); } cijev(g, t, R0 * 0.16, M.tamna, 50); }
      return dr;
    }
    /* pogonjeno glodalo */
    const R0 = a.R0;
    if (sDrzacem) { blok(-70, 0, yv - 28, -RS + 30, 30); dr.push(stavi(g, cylX(20, -2, 0, M.celik, -RS, 0, 20)), stavi(g, cylX(26, -100, -70, M.tamna, yv, 0, 24))); }
    stavi(g, cylX(14, -118, -100, M.celik, yv, 0, 20));
    stavi(g, cylX(R0, xv, -118, M.karbid, yv, 0, 18));
    for (let f = 0; f < 2; f++) { const t = []; for (let i = 0; i <= 30; i++) { const s = i / 30, x = xv + s * 22, kk = f * Math.PI + x / 5; t.push([x, yv + Math.cos(kk) * R0, Math.sin(kk) * R0]); } cijev(g, t, 0.6, M.tamna, 30); }
    return dr;
  }
  /* alat sam (bez držača) u zadanoj grupi — za prikaz izvan stroja */
  function postaviAlatUStanicu(T, a) {
    const g = stanice[T]; if (!g) return;
    for (let i = g.children.length - 1; i >= 0; i--) { const c = g.children[i]; if (!c.isSprite) { g.remove(c); } }
    if (a) { const tg = new THREE.Group(); g.add(tg); nacrtajAlatT(tg, a, true); }
  }

  /* ---------------------------------------------------------------- 7. električni ormar iza stroja (vrata straga) */
  const OX0 = -1200, OX1 = -350, OZ0 = -1200, OZ1 = -770, OY0 = -1150, OY1 = 850;
  const orm = [];
  const op = (w, h, d, m, x, y, z) => { const o = add(stroj, box(w, h, d, m), x, y, z); orm.push(o); return o; };
  op(15, OY1 - OY0, OZ1 - OZ0, M.ormar, OX0 + 7.5, (OY0 + OY1) / 2, (OZ0 + OZ1) / 2); op(15, OY1 - OY0, OZ1 - OZ0, M.ormar, OX1 - 7.5, (OY0 + OY1) / 2, (OZ0 + OZ1) / 2);
  op(OX1 - OX0, 15, OZ1 - OZ0, M.ormar, (OX0 + OX1) / 2, OY1 - 7.5, (OZ0 + OZ1) / 2); op(OX1 - OX0, 20, OZ1 - OZ0, M.tamna, (OX0 + OX1) / 2, OY0 + 10, (OZ0 + OZ1) / 2);
  op(OX1 - OX0, OY1 - OY0, 15, M.ormar, (OX0 + OX1) / 2, (OY0 + OY1) / 2, OZ1 - 7.5);
  op(10, OY1 - OY0 - 30, OZ1 - OZ0 - 20, M.ormar, -775, (OY0 + OY1) / 2, (OZ0 + OZ1) / 2 - 10);
  op(OX1 - OX0 - 30, OY1 - OY0 - 30, 4, mat(0xc4c9c6, { metalness: 0.4 }), (OX0 + OX1) / 2, (OY0 + OY1) / 2, -781);
  op(OX1 - OX0 - 30, 10, OZ1 - OZ0 - 20, M.okvir, (OX0 + OX1) / 2, -560, (OZ0 + OZ1) / 2);   /* polica: dolje su agregati */
  for (const y of [790, 420, 120, -200]) op(OX1 - OX0 - 40, 46, 70, M.kanal, (OX0 + OX1) / 2, y, -818);
  for (let i = 0; i < 14; i++) { op(20, 80, 70, mat(0xeef0f0), -1160 + i * 24, 200, -818); op(8, 18, 6, M.crna, -1160 + i * 24, 212, -855); }
  for (let i = 0; i < 30; i++) op(7, 50, 46, i % 5 === 4 ? mat(0x2c6fb0) : M.modul, -760 + i * 11, 30, -806);
  for (let i = 0; i < 4; i++) { op(48, 82, 110, M.modulT, -1150 + i * 70, -80, -837); op(30, 16, 4, mat(0xeef0f0), -1150 + i * 70, -60, -894); }
  op(220, 200, 110, M.modulT, -1050, -360, -837);
  for (let i = 0; i < 3; i++) orm.push(add(stroj, cyl(30, 170, M.bakar, 24), -1120 + i * 70, -360, -905));
  dio('ormar', 'Električni ormar', orm);
  const modul = (x, w, h, y, d) => { const g = []; g.push(add(stroj, box(w, h, d, M.modul), x, y, -783 - d / 2)); g.push(add(stroj, box(w - 4, h - 20, 3, M.modulT), x, y, -784 - d - 1.5)); return g; };
  const nap = modul(-1110, 100, 360, 600, 260);
  for (let i = 0; i < 7; i++) nap.push(add(stroj, box(3, 30, 250, M.okvir), -1146 + i * 12, 795, -913));
  nap.push(add(stroj, box(10, 10, 4, M.zelenaLED), -1128, 750, -1046), add(stroj, box(10, 10, 4, M.zutaLED), -1108, 750, -1046), add(stroj, box(60, 40, 6, M.crna), -1110, 460, -1048));
  dio('napojni', 'Napojni modul', nap);
  const ncu = modul(-978, 150, 360, 600, 260).concat(modul(-866, 60, 360, 600, 260));
  const ncuTex = platno(120, 60, (g) => { g.fillStyle = '#062a3a'; g.fillRect(0, 0, 120, 60); g.fillStyle = '#7fe0ff'; g.font = 'bold 26px monospace'; g.fillText('NCU', 16, 40); });
  { const d = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), ncuTex ? new THREE.MeshBasicMaterial({ map: ncuTex }) : M.plavaLED); d.rotation.y = Math.PI; ncu.push(add(stroj, d, -978, 720, -1047)); }
  for (const x of [-1010, -995, -866]) ncu.push(add(stroj, box(8, 8, 4, M.zelenaLED), x, 750, -1046));
  for (let i = 0; i < 3; i++) ncu.push(add(stroj, box(26, 14, 10, M.crna), -866, 500 + i * 30, -1050));
  dio('ncu', 'Upravljanje s pogonskim modulom (NCU)', ncu);
  const plc = [add(stroj, box(400, 35, 8, M.celik), -600, 600, -787)];
  [[60, -760], [80, -690], [40, -630], [40, -585], [40, -540], [40, -495], [40, -450]].forEach(([w, x], i) => {
    plc.push(add(stroj, box(w - 4, 125, 120, mat(0x4f5a62)), x, 600, -848));
    plc.push(add(stroj, box(w - 10, 90, 4, i < 2 ? M.modulT : mat(0x2c6a54)), x, 595, -910));
    plc.push(add(stroj, box(6, 6, 3, i === 1 ? M.zutaLED : M.zelenaLED), x - w / 2 + 10, 650, -912));
  });
  dio('plc', 'PLC', plc);
  /* hidraulički agregat (donji dio ormara, lijevo): spremnik, motor s crpkom, ventili, manometar */
  const hid = [add(stroj, box(340, 200, 330, mat(0x2d3a45, { roughness: 0.5 })), -1020, -1030, -990), add(stroj, box(344, 6, 334, M.tamna), -1020, -927, -990)];
  hid.push(stavi(stroj, cylX(55, -1100, -960, M.plava, -860, -1060, 28)), stavi(stroj, cylX(40, -960, -920, M.okvir, -860, -1060, 24)));
  for (let i = 0; i < 3; i++) { hid.push(add(stroj, box(50, 60, 70, M.okvir), -880 - i * 0, -890, -900 - i * 90)); hid.push(add(stroj, box(30, 30, 30, M.crna), -880, -845, -900 - i * 90)); }
  { const m = add(stroj, cyl(30, 10, mat(0xf4f6f6), 24), -1130, -880, -1160); m.rotation.x = Math.PI / 2; hid.push(m, add(stroj, cyl(31, 4, M.crna, 24), -1130, -880, -1166).rotateX(Math.PI / 2)); }
  hid.push(add(stroj, box(4, 80, 30, M.hidraulicno), -1192, -1010, -1100));
  hid.push(cijev(stroj, [[-880, -840, -900], [-860, -700, -820], [-860, -400, -760], [-820, 100, -500], [-800, 120, -400]], 7, M.guma, 24));
  dio('hidraulika', 'Hidraulički agregat', hid);
  /* centralno podmazivanje (donji dio ormara, desno) */
  const cp = [add(stroj, box(110, 60, 110, M.crna), -560, -1110, -1000), add(stroj, cyl(45, 160, M.posuda, 28), -560, -1000, -1000), add(stroj, cyl(42, 100, M.ulje, 28), -560, -1028, -1000),
    add(stroj, cyl(47, 10, M.crvena, 28), -560, -915, -1000), stavi(stroj, cylX(28, -500, -470, M.okvir, -1110, -1000))];
  { const m = add(stroj, cyl(16, 6, mat(0xf4f6f6), 24), -499, -1070, -960); m.rotation.z = Math.PI / 2; cp.push(m); }
  for (let i = 0; i < 3; i++) cp.push(cijev(stroj, [[-480, -1100, -980 + i * 10], [-430, -1000, -900 + i * 10], [-380, -700, -780 + i * 6], [-300, -330, -560 + i * 6]], 2.2, M.bakar, 16));
  dio('podmazivanje', 'Centralno podmazivanje', cp);
  /* vrata ormara (otvaraju se prema natrag) */
  const znakTex = platno(128, 112, (g) => { g.fillStyle = '#f2c21a'; g.strokeStyle = '#111'; g.lineWidth = 8; g.beginPath(); g.moveTo(64, 8); g.lineTo(122, 106); g.lineTo(6, 106); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#111'; g.beginPath(); g.moveTo(70, 34); g.lineTo(48, 74); g.lineTo(64, 72); g.lineTo(56, 98); g.lineTo(82, 58); g.lineTo(66, 60); g.closePath(); g.fill(); });
  function vrataOrmara(xh, w, s) {
    const pivot = new THREE.Group(); add(stroj, pivot, xh, (OY0 + OY1) / 2, OZ0 - 10);
    add(pivot, box(w, OY1 - OY0 - 10, 20, M.ormar), s * w / 2, 0, 0);
    for (let i = 0; i < 2; i++) { add(pivot, box(150, 150, 4, M.okvir), s * w / 2, -650 + i * 1350, -12); for (let j = 0; j < 7; j++) add(pivot, box(140, 6, 3, M.crna), s * w / 2, -650 + i * 1350 - 60 + j * 20, -14); }
    add(pivot, box(18, 110, 22, M.crna), s * (w - 32), -10, -25);
    return pivot;
  }
  const vrOL = vrataOrmara(OX0, -775 - OX0, 1), vrOD = vrataOrmara(OX1, OX1 + 775, -1);
  if (znakTex) { const z = new THREE.Mesh(new THREE.PlaneGeometry(110, 96), new THREE.MeshBasicMaterial({ map: znakTex, transparent: true })); z.rotation.y = Math.PI; add(vrOD, z, -(OX1 + 775) / 2, 760, -11); }
  dio('ormarVrata', 'Vrata električnog ormara', vrOL, vrOD);
  /* glavna sklopka na desnim vratima ormara */
  const sklopka = add(vrOD, cyl(40, 30, M.crvena), -(OX1 + 775) / 2, 250, -28); sklopka.rotation.x = Math.PI / 2; sklopka.name = 'sklopka';
  dio('sklopka', 'Glavna sklopka', sklopka, add(vrOD, box(110, 110, 8, M.zuta), -(OX1 + 775) / 2, 250, -12), add(vrOD, box(90, 22, 14, M.crvena), -(OX1 + 775) / 2, 250, -48));
  /* kabelski snop od ormara do stroja */
  dio('snop', 'Kabelski snop', cijev(stroj, [[-600, 850, -950], [-600, 980, -950], [-600, 1060, -850], [-600, 1060, -720], [-600, 1000, -650]], 28, M.guma, 50));

  /* ---------------------------------------------------------------- 8. kabina s kliznim vratima */
  const KX0 = -1250, KX1 = 1150, KZ0 = -700, KZ1 = 720, KY0 = -1150, KY1 = 1050, T = 6;
  const kab = [];
  const kp = (w, h, d, m, x, y, z) => { const o = add(stroj, box(w, h, d, m), x, y, z); kab.push(o); if (m === M.staklo) o.userData.staklo = true; return o; };
  kp(KX1 - KX0, KY1 - KY0, T, M.lim, (KX0 + KX1) / 2, (KY0 + KY1) / 2, KZ0 + T / 2);                     /* stražnja stijenka */
  kp(KX1 - KX0, T, KZ1 - KZ0, M.lim, (KX0 + KX1) / 2, KY1 - T / 2, (KZ0 + KZ1) / 2);                     /* krov */
  kp(T, 850, KZ1 - KZ0, M.limPun, KX0 + T / 2, -725, (KZ0 + KZ1) / 2); kp(T, 1350, KZ1 - KZ0, M.lim, KX0 + T / 2, 375, (KZ0 + KZ1) / 2);
  kp(T, 310, KZ1 - KZ0, M.limPun, KX1 - T / 2, -995, (KZ0 + KZ1) / 2);
  kp(T, 190, 300, M.limPun, KX1 - T / 2, -745, 90); kp(T, 190, 190, M.limPun, KX1 - T / 2, -745, 625);
  kp(T, 350, KZ1 - KZ0, M.limPun, KX1 - T / 2, -475, (KZ0 + KZ1) / 2); kp(T, 1350, KZ1 - KZ0, M.lim, KX1 - T / 2, 375, (KZ0 + KZ1) / 2);
  /* prednja strana: donja ploča, lijevi zatvoreni dio, nadvoj, desni prozor */
  kp(KX1 - KX0, 850, T, M.limPun, (KX0 + KX1) / 2, -725, KZ1 - T / 2);
  kp(490, 1350, T, M.limPun, -1005, 375, KZ1 - T / 2);
  kp(1120, 150, T, M.limPun, -200, 975, KZ1 - T / 2);
  kp(790, 100, T, M.limPun, 755, -250, KZ1 - T / 2); kp(790, 200, T, M.limPun, 755, 950, KZ1 - T / 2);
  kp(60, 1050, T, M.limPun, 390, 325, KZ1 - T / 2); kp(60, 1050, T, M.limPun, 1120, 325, KZ1 - T / 2);
  kp(670, 1050, T, M.staklo, 755, 325, KZ1 - T / 2);
  for (const [x, y, w, h] of [[-50, KY1 - 20, KX1 - KX0, 40], [-50, -300, KX1 - KX0, 40]]) kp(w, h, 40, M.okvir, x, y, KZ1 - 20);
  for (const x of [KX0 + 20, KX1 - 20]) for (const z of [KZ0 + 20, KZ1 - 20]) kp(40, KY1 - KY0, 40, M.okvir, x, (KY0 + KY1) / 2, z);
  /* unutarnja kosa ploha ispred postelje (strugotina klizi u korito transportera) */
  { const c = kp(1700, 4, 330, M.limCelik, -100, -420, 160); c.rotation.x = Math.atan2(180, 330); }
  dio('kabina', 'Kabina', kab);
  const vrata = new THREE.Group(); stroj.add(vrata);
  add(vrata, box(1120, 70, 6, M.limPun), -200, -265, KZ1 + 14); add(vrata, box(1120, 70, 6, M.limPun), -200, 865, KZ1 + 14);
  add(vrata, box(70, 1200, 6, M.limPun), -725, 300, KZ1 + 14); add(vrata, box(70, 1200, 6, M.limPun), 325, 300, KZ1 + 14);
  { const s = add(vrata, box(980, 1060, 3, M.staklo), -200, 300, KZ1 + 14); s.userData.staklo = true; }
  add(vrata, cyl(10, 320, M.celik), 290, 300, KZ1 + 44); add(vrata, box(16, 16, 26, M.celik), 290, 450, KZ1 + 30); add(vrata, box(16, 16, 26, M.celik), 290, 150, KZ1 + 30);
  dio('vrata', 'Vrata stroja', vrata);

  /* ---------------------------------------------------------------- 9. transporter strugotine, posude, crpka */
  const tr = [];
  const korito = (x0, x1) => { tr.push(add(stroj, box(x1 - x0, 6, 290, M.limCelik), (x0 + x1) / 2, -840, 380)); for (const z of [235, 525]) tr.push(add(stroj, box(x1 - x0, 90, 6, M.limCelik), (x0 + x1) / 2, -800, z)); };
  korito(-700, 1150);
  for (let x = -680; x < 1150; x += 60) tr.push(add(stroj, box(10, 8, 270, M.tamna), x, -833, 380));
  { const L = Math.hypot(650, 900), k = Math.atan2(900, 650); const kos2 = add(stroj, box(L, 130, 300, M.plava), 1475, -360, 380); kos2.rotation.z = k; tr.push(kos2); }
  tr.push(add(stroj, box(170, 210, 300, M.plava), 1840, 140, 380), add(stroj, box(120, 120, 240, M.plavaT), 1880, -10, 380));
  { const m = add(stroj, cyl(50, 160, M.crna, 24), 1840, 150, 610); m.rotation.x = Math.PI / 2; tr.push(m, add(stroj, box(70, 60, 50, M.tamna), 1840, 220, 610)); }
  dio('transporter', 'Transporter strugotine', tr);
  const kolica = [add(stroj, box(440, 8, 420, M.okvir), 1925, -1080, 380)];
  for (const [x, z] of [[1710, 380], [2140, 380]]) kolica.push(add(stroj, box(8, 420, 420, M.okvir), x, -860, z));
  for (const z of [174, 586]) kolica.push(add(stroj, box(440, 420, 8, M.okvir), 1925, -860, z));
  for (const x of [1760, 2090]) for (const z of [200, 560]) { const w = add(stroj, cyl(30, 20, M.crna, 20), x, -1120, z); w.rotation.x = Math.PI / 2; kolica.push(w); }
  { let sj = 11; const rnd = () => { sj = (sj * 16807) % 2147483647; return sj / 2147483647; };
    for (let i = 0; i < 40; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(6 + rnd() * 7, 1.2, 5, 10, 2 + rnd() * 3), M.strugotina); t.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6); kolica.push(add(stroj, t, 1740 + rnd() * 370, -1060 + rnd() * 160, 200 + rnd() * 360)); } }
  dio('posudaStr', 'Posuda za strugotinu', kolica);
  const ship = [add(stroj, box(530, 270, 360, mat(0x2d6f86, { roughness: 0.5 })), 1425, -1015, 380), add(stroj, box(534, 6, 364, M.tamna), 1425, -878, 380)];
  ship.push(add(stroj, box(120, 30, 120, M.okvir), 1240, -870, 280));
  dio('ship', 'Posuda rashladnog sredstva (SHIP)', ship);
  const crpka = [add(stroj, cyl(46, 130, M.plava, 24), 1320, -800, 470), add(stroj, cyl(48, 10, M.okvir, 24), 1320, -730, 470), add(stroj, cyl(30, 40, M.okvir, 20), 1320, -855, 470)];
  crpka.push(add(stroj, box(60, 40, 50, M.tamna), 1380, -770, 470));
  crpka.push(cijev(stroj, [[1320, -725, 470], [1320, -600, 470], [1200, -300, 300], [1150, 300, -200], [1100, 900, -600], [900, 1000, -650]], 9, M.guma, 40));
  dio('crpka', 'Crpka rashladnog sredstva', crpka);
  const raz = [add(stroj, box(40, 220, 14, M.okvir), 1620, -1000, 566), add(stroj, cyl(9, 200, M.posuda, 14), 1620, -1000, 576), add(stroj, cyl(7.5, 120, M.emulzija, 14), 1620, -1040, 576)];
  for (let i = 0; i < 6; i++) raz.push(add(stroj, box(12, 2, 2, M.crna), 1604, -1090 + i * 36, 576));
  raz.push(add(stroj, box(14, 4, 3, M.crvena), 1604, -1060, 577), add(stroj, box(14, 4, 3, M.zelenaLED), 1604, -925, 577));
  dio('razina', 'Pokazivač razine', raz);

  /* ---------------------------------------------------------------- 10. nožne sklopke i statusna svjetiljka */
  function nozna(x, boja) {
    const g = []; g.push(add(stroj, box(150, 60, 220, M.tamna), x, -1120, 1060), add(stroj, box(120, 14, 150, M.crna), x, -1083, 1070));
    const st = new THREE.Mesh(new THREE.TorusGeometry(80, 10, 8, 20, Math.PI), boja); st.rotation.y = Math.PI / 2; g.push(add(stroj, st, x, -1090, 1010));
    g.push(cijev(stroj, [[x, -1130, 950], [x + 20, -1145, 850], [x + 100, -1145, 780], [x + 150, -1100, 726]], 6, M.guma, 16));
    return g;
  }
  dio('noznaGlava', 'Nožna sklopka za steznu glavu', nozna(-560, M.plava));
  dio('noznaSiljak', 'Nožna sklopka za šiljak', nozna(-330, M.zuta));
  const lampa = add(stroj, cyl(18, 80, mat(0x666666, { emissive: 0x000000 })), 950, 1110, 600); lampa.name = 'lampa'; lampa.userData.vlastitiMat = true;
  dio('lampa', 'Statusna svjetiljka', lampa, add(stroj, cyl(18.6, 2, M.crna), 950, 1096, 600), add(stroj, cyl(18.6, 2, M.crna), 950, 1124, 600), add(stroj, cyl(19, 8, M.crna), 950, 1154, 600), add(stroj, cyl(10, 20, M.okvir), 950, 1060, 600));

  /* ---------------------------------------------------------------- 11. upravljačka ploča na zakretnom nosaču (desno sprijeda) */
  const ploca = new THREE.Group(); ploca.position.set(1400, 380, 880); ploca.rotation.y = -0.35; stroj.add(ploca);
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
  const nosacP = [add(stroj, box(120, 120, 20, M.okvir), 1100, 960, 730)];
  ploca.updateMatrixWorld(true);
  const vrhP = new THREE.Vector3(0, 400, -20).applyMatrix4(ploca.matrixWorld);
  nosacP.push(cijev(stroj, [[1100, 960, 740], [1180, 975, 820], [vrhP.x, 975, vrhP.z]], 22, M.okvir, 20));
  nosacP.push(add(ploca, cyl(22, 80, M.okvir), 0, 360, -20), add(ploca, cyl(30, 24, M.tamna), 0, 395, -20));
  dio('upravljanje', 'Upravljačka ploča', ploca, nosacP);

  /* ---------------------------------------------------------------- gibanje osi, revolver, vrtnja, otvaranje */
  const u = new THREE.Vector3(0, SN, -CS);
  const stanje = { X: REF.X, Z: REF.Z, T: 1, kut: 0 };
  function postaviOsi(X = stanje.X, Z = stanje.Z) {
    stanje.X = X; stanje.Z = Z;
    uzduzne.position.set(Z - ZX, 0, 0);
    poprecne.position.copy(u).multiplyScalar(X / 2);
  }
  function postaviRevolver(T) { stanje.T = T; disk.rotation.x = -(T - 1) * Math.PI / 6; }
  function postaviVrtnju(kut) { stanje.kut = kut; vrtnja.rotation.x = kut; }
  postaviOsi(); postaviRevolver(1);
  const otvaranje = { ormar: 0, vrata: 0 };
  function otvori(ime, t) {   /* t: 0 = zatvoreno … 1 = otvoreno */
    t = Math.max(0, Math.min(1, t)); otvaranje[ime] = t;
    if (ime === 'ormar') { vrOL.rotation.y = -1.65 * t; vrOD.rotation.y = 1.65 * t; }
    if (ime === 'vrata') vrata.position.x = 760 * t;
  }
  /* točka u sceni za MKS (X kao promjer, Z) */
  const uScenu = (X, Z) => new THREE.Vector3(Z - ZX, 0, 0).addScaledVector(u, X / 2);

  return { stroj, uzduzne, poprecne, disk, nosac, vrtnja, konjic, nulaW, nulaM, obrG, sklopka, lampa, ploca, vrata, dijelovi, M, stanje, stanice, ALATI: ALT,
    postaviOsi, postaviRevolver, postaviVrtnju, postaviObradak, postaviW, otvori, otvaranje, tocka, uScenu, nacrtajAlatT, postaviAlatUStanicu, REF, HOD, ZX, RS };
}
