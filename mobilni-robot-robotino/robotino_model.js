/* FORTRONIQ · Mobilni robot Robotino (CP-MR-C) — zajednički parametarski 3D model (naš crtež; bez vanjskih modela, tekstura i logotipa).
   Koriste ga stranice „Upoznavanje robota”, „Upravljanje robotom” i AR. Sve mjere i inačice dolaze iz robotino_podaci.js (MJERE, KONFIG).
   Jedinice: METRI. korijen je u koordinatama scene (Y gore, pod y = 0); unutra je grupa u KS robota (Z gore):
     x_s = x_r,  y_s = z_r,  z_s = −y_r.   Os x robota (naprijed) = strana s laserskim skenerom i kontaktom za punjenje.
   Unutrašnjost (raspored pogonske jedinice, ploče, baterije) je načelni prikaz — vidi pretpostavke u podacima.
   Model ne pokreće vlastitu petlju; treperenje LED-ova računa se pri iscrtavanju (onBeforeRender) ili iz azuriraj(t).
   © ForTroniQ d.o.o. */
import { KONFIG, MJERE, DIJELOVI, SENZORI } from './robotino_podaci.js';

const NAZIV = new Map(DIJELOVI.map((d) => [d.id, d.naziv]));
const PI = Math.PI, RAD = PI / 180;

/* ====================================================================== zajednički alati */
function alati(THREE, dijelovi) {
  const imaDoc = typeof document !== 'undefined';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o));
  const led = (c, i = 1.6) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.35 });
  const M = {
    pokrov: mat(0xe3e6e8, { roughness: 0.48 }), maska: mat(0xf4f5f6, { roughness: 0.42 }), prorez: mat(0x2a2f33, { roughness: 0.8 }),
    inox: mat(0xc3c9cd, { metalness: 0.38, roughness: 0.32 }), inoxPrsten: mat(0xbcc2c6, { metalness: 0.38, roughness: 0.34 }), inoxT: mat(0x9aa2a8, { metalness: 0.38, roughness: 0.38 }),
    alu: mat(0xcfd4d7, { metalness: 0.32, roughness: 0.36 }), aluT: mat(0xaeb5ba, { metalness: 0.32, roughness: 0.4 }),
    crno: mat(0x17191b, { roughness: 0.7 }), guma: mat(0x1a1c1e, { roughness: 0.92 }), tamno: mat(0x2c3135, { roughness: 0.6 }),
    motor: mat(0x2a2e31, { metalness: 0.25, roughness: 0.42 }), celik: mat(0xb0b8bd, { metalness: 0.42, roughness: 0.3 }),
    zlato: mat(0xd2a445, { metalness: 0.8, roughness: 0.3 }), pcb: mat(0x1f6e3c, { roughness: 0.6 }), pcbP: mat(0x1d4f8a, { roughness: 0.6 }),
    cip: mat(0x16181a, { roughness: 0.45 }), bijelo: mat(0xf2f3f3, { roughness: 0.5 }), narancasto: mat(0xe8742a, { roughness: 0.5 }),
    festool: mat(0x34393c, { roughness: 0.55 }), festoolS: mat(0x4a5054, { roughness: 0.5 }), festoolZ: mat(0x2f9c57, { roughness: 0.5 }),
    bronca: mat(0xa88663, { metalness: 0.3, roughness: 0.45 }), broncaT: mat(0x7a6048, { metalness: 0.3, roughness: 0.5 }),
    valjak: mat(0xa7b2b8, { roughness: 0.32 }), remen: mat(0x1f2225, { roughness: 0.85 }), traka: mat(0x23272a, { roughness: 0.8 }),
    zuto: mat(0xf2c21a, { roughness: 0.45 }), crveno: mat(0xd4261c, { roughness: 0.4 }),
    staklo: mat(0xdbe6ee, { transparent: true, opacity: 0.26, roughness: 0.06, metalness: 0.1, depthWrite: false }),
    lece: mat(0x0d1114, { roughness: 0.12, metalness: 0.4 }),
    stanica: mat(0xeceeee, { roughness: 0.5 }), stanicaT: mat(0xd4d8da, { roughness: 0.55 }), reflektor: mat(0xf6f6f2, { roughness: 0.25 }),
    /* svjetla (uključeno / isključeno) */
    plavoOn: led(0x3d8bff, 2.2), plavoOff: mat(0x223047, { roughness: 0.3 }),
    crvenaOn: led(0xff2a1a, 2.0), crvenaOff: mat(0x5c1c17, { roughness: 0.3 }),
    narOn: led(0xff6a00, 2.0), narOff: mat(0x5e3c16, { roughness: 0.3 }),
    zelenaOn: led(0x1fdc6a, 2.0), zelenaOff: mat(0x1d4a2d, { roughness: 0.3 }),
    bijelaOn: led(0xfff6e0, 1.4), bijelaOff: mat(0xd9dcd8, { roughness: 0.25, transparent: true, opacity: 0.85 }),
    ledZ: led(0x2ecc71, 1.6), markerOn: led(0x2f6dff, 2.4), markerOff: mat(0x1b2740, { roughness: 0.4 })
  };
  ['crvenaOn', 'narOn', 'zelenaOn', 'plavoOn', 'markerOn', 'bijelaOn', 'ledZ'].forEach((k) => { M[k].toneMapped = false; });

  const box = (w, d, h, m) => new THREE.Mesh(new THREE.BoxGeometry(w, d, h), m);
  function add(p, o, x = 0, y = 0, z = 0) { o.position.x += x; o.position.y += y; o.position.z += z; p.add(o); return o; }
  function grupa(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; }
  function cylZ(r, z0, z1, m, seg = 32, rt) { const g = new THREE.CylinderGeometry(rt ?? r, r, Math.abs(z1 - z0), seg); g.rotateX(PI / 2); const me = new THREE.Mesh(g, m); me.position.z = (z0 + z1) / 2; return me; }
  function cylX(r, x0, x1, m, seg = 32) { const g = new THREE.CylinderGeometry(r, r, Math.abs(x1 - x0), seg); g.rotateZ(-PI / 2); const me = new THREE.Mesh(g, m); me.position.x = (x0 + x1) / 2; return me; }
  function cylY(r, y0, y1, m, seg = 32) { const g = new THREE.CylinderGeometry(r, r, Math.abs(y1 - y0), seg); const me = new THREE.Mesh(g, m); me.position.y = (y0 + y1) / 2; return me; }
  function izvuci(shape, z0, z1, m, o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, Object.assign({ depth: Math.abs(z1 - z0), bevelEnabled: false, curveSegments: 24 }, o));
    g.translate(0, 0, Math.min(z0, z1)); return new THREE.Mesh(g, m);
  }
  const krug = (r, cx = 0, cy = 0) => { const s = new THREE.Shape(); s.absarc(cx, cy, r, 0, PI * 2, false); return s; };
  const rupa = (r, cx = 0, cy = 0) => { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, PI * 2, true); return p; };
  function sektor(r0, r1, a0, a1) { const s = new THREE.Shape(); s.absarc(0, 0, r1, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true); s.closePath(); return s; }
  function prsten(ro, ri, z0, z1, m, curve = 64) { const s = krug(ro); s.holes.push(rupa(ri)); return izvuci(s, z0, z1, m, { curveSegments: curve }); }
  function zaobljeni(w, h, r, cx = 0, cy = 0, Klasa = THREE.Shape) {
    const s = new Klasa(), x = cx - w / 2, y = cy - h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  /* geometrija iz oblika u ravnini YZ (u→y, v→z), izvučena po x od x0 do x1 */
  const MYZ = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  function izvuciX(shape, x0, x1, m, o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, Object.assign({ depth: Math.abs(x1 - x0), bevelEnabled: false, curveSegments: 24 }, o));
    g.applyMatrix4(MYZ); g.translate(Math.min(x0, x1), 0, 0); return new THREE.Mesh(g, m);
  }
  /* oblik u ravnini XZ (u→x, v→z), izvučen po y od y0 do y1 */
  const MXZ = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  function izvuciY(shape, y0, y1, m, o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, Object.assign({ depth: Math.abs(y1 - y0), bevelEnabled: false, curveSegments: 24 }, o));
    g.applyMatrix4(MXZ); g.translate(0, Math.max(y0, y1), 0); return new THREE.Mesh(g, m);
  }
  function stap(p, a, b, r, m, seg = 16) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m);
    me.position.copy(A).add(B).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); p.add(me); return me;
  }
  function greda(p, a, b, w, m, geom) {   /* greda kvadratnog presjeka od a do b */
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const me = new THREE.Mesh(geom || new THREE.BoxGeometry(w, L, w), m);
    if (geom) me.scale.y = L;
    me.position.copy(A).add(B).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); p.add(me); return me;
  }
  function cijev(p, tocke, r, m, seg = 40, rs = 8) { const k = new THREE.CatmullRomCurve3(tocke.map((t) => new THREE.Vector3(...t))); const me = new THREE.Mesh(new THREE.TubeGeometry(k, seg, r, rs, false), m); p.add(me); return me; }
  /* aluminijski profil s utorima (presjek a × a) */
  function profilShape(a) {
    const h = a / 2, s = a * 0.11, d = a * 0.2, sh = new THREE.Shape();
    const P = [[-h, -h], [-s, -h], [-s, -h + d], [s, -h + d], [s, -h], [h, -h], [h, -s], [h - d, -s], [h - d, s], [h, s], [h, h], [s, h], [s, h - d], [-s, h - d], [-s, h], [-h, h], [-h, s], [-h + d, s], [-h + d, -s], [-h, -s]];
    sh.moveTo(...P[0]); P.slice(1).forEach((q) => sh.lineTo(...q)); sh.closePath(); sh.holes.push(rupa(a * 0.1)); return sh;
  }
  function platno(w, h, crtaj) {
    if (!imaDoc) return null;
    try {
      const c = document.createElement('canvas'); c.width = w; c.height = h; crtaj(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    } catch (e) { return null; }
  }
  function dio(id, ...obj) {
    let d = dijelovi.get(id); if (!d) { d = { naziv: NAZIV.get(id) || id, objekti: [] }; dijelovi.set(id, d); }
    obj.flat(Infinity).forEach((o) => { if (o) { d.objekti.push(o); o.userData.dio = id; } });
    return obj[0];
  }
  /* doda objekte dijelu (za isticanje cijelog sklopa) bez promjene userData.dio (odabir mišem i dalje daje najdublji dio) */
  function dodaj(id, ...obj) { const d = dijelovi.get(id); if (d) obj.flat(Infinity).forEach((o) => { if (o && !d.objekti.includes(o)) d.objekti.push(o); }); }
  return { THREE, M, dodaj, mat, box, add, grupa, cylZ, cylX, cylY, izvuci, izvuciX, izvuciY, krug, rupa, sektor, prsten, zaobljeni, stap, greda, cijev, profilShape, platno, dio, imaDoc };
}

/* spajanje nepomičnih meshova istog materijala (manje poziva iscrtavanja).
   Granice spajanja: čvorovi s userData.dio (zasebni dijelovi), userData.anim (pomični) i userData.nespajaj.
   Meshovi unutar granice spajaju se u nove meshove te granice (po materijalu); LED-ovi, teksture i registrirani meshovi ostaju. */
function spojiStaticno(THREE, root) {
  root.updateMatrixWorld(true);
  const granica = (o) => o === root || !!(o.userData.dio || o.userData.anim || o.userData.nespajaj);
  const zadrzi = (c) => c.userData.dio || c.userData.led || c.userData.vlastitiMat || c.userData.nespajaj || c.onBeforeRender !== THREE.Mesh.prototype.onBeforeRender || c.children.length || !c.visible;
  const korijeni = []; root.traverse((o) => { if (!o.isMesh && granica(o) && !o.userData.nespajaj) korijeni.push(o); });
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
  korijeni.forEach((N) => {
    const poMat = new Map();
    const skupi = (o) => o.children.forEach((c) => {
      if (c.isMesh) { if (!zadrzi(c)) { const k = c.material.uuid; if (!poMat.has(k)) poMat.set(k, []); poMat.get(k).push(c); } }
      else if (!granica(c) && !c.isLine && !c.isPoints) skupi(c);
    });
    skupi(N);
    inv.copy(N.matrixWorld).invert();
    poMat.forEach((lista) => {
      if (lista.length < 2) return;
      let n = 0; const geos = lista.map((c) => { rel.multiplyMatrices(inv, c.matrixWorld); const geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone(); geo.applyMatrix4(rel); n += geo.attributes.position.count; return geo; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
      geos.forEach((geo) => { pos.set(geo.attributes.position.array, o * 3); if (geo.attributes.normal) nor.set(geo.attributes.normal.array, o * 3); o += geo.attributes.position.count; geo.dispose(); });
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); mg.computeBoundingSphere();
      const m = new THREE.Mesh(mg, lista[0].material); lista.forEach((c) => c.parent.remove(c)); N.add(m);
    });
  });
}

/* treperenje: 1 Hz, pola periode uključeno */
function stanjeSvjetla(s, t) { return s === 1 || s === true || (s === 'treperi' && (t % 1) < 0.5); }

/* ====================================================================== nosač izratka */
function gradiNosac(A) {
  const { THREE, M, add, grupa, izvuci, zaobljeni, cylZ, box, dio } = A, N = MJERE.nosac;
  const g = new THREE.Group(); g.name = 'nosacIzratka';
  const L = N.duljina, W = N.sirina, H = N.visina;
  add(g, izvuci(zaobljeni(L, W, 0.012), 0, H * 0.55, M.tamno, { curveSegments: 6 }));
  const okvir = zaobljeni(L - 0.01, W - 0.01, 0.01); okvir.holes.push(zaobljeni(L - 0.04, W - 0.05, 0.008, 0, 0, THREE.Path));
  add(g, izvuci(okvir, H * 0.55, H, M.tamno, { curveSegments: 6 }));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(g, cylZ(0.004, H, H + 0.004, M.alu, 12), sx * (L / 2 - 0.014), sy * (W / 2 - 0.014), 0);
  add(g, box(0.03, 0.012, 0.0015, M.bijelo), L / 2 - 0.03, -W / 2 + 0.012, H + 0.0008);
  dio('nosacIzratka', g);
  const iz = grupa(g, 0, 0, H * 0.55);
  add(iz, izvuci(zaobljeni(0.11, 0.065, 0.012), 0, 0.022, M.bijelo, { curveSegments: 8, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 }));
  add(iz, izvuci(zaobljeni(0.09, 0.045, 0.008), 0.0225, 0.0245, M.pokrov, { curveSegments: 6 }));
  dio('izradak', iz);
  return g;
}
export function napraviNosac(THREE) { return gradiNosac(alati(THREE, new Map())); }

/* ====================================================================== stanica za punjenje */
function gradiStanicu(A, o = {}) {
  const { THREE, M, add, grupa, box, izvuci, izvuciX, zaobljeni, cylX, cylZ, platno, dio, cijev } = A;
  const S = MJERE.stanica, W = S.sirina, Dd = S.dubina, H = S.visina;
  const korijen = new THREE.Group(); korijen.name = 'StanicaZaPunjenje';
  const s = grupa(korijen); s.rotation.x = -PI / 2;          /* KS stanice: x = normala prednje plohe, y lijevo, z gore */
  /* tijelo */
  const tijelo = grupa(s);
  add(tijelo, izvuci(zaobljeni(Dd - 0.012, W - 0.012, 0.022, -Dd / 2, 0), 0.016, H - 0.006, M.stanica, { curveSegments: 8, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3 }));
  add(tijelo, izvuci(zaobljeni(Dd - 0.02, W - 0.02, 0.02, -Dd / 2, 0), 0, 0.012, M.stanicaT, { curveSegments: 6 }));
  /* prorezi: okomiti na prednjoj plohi, kosi na vrhu */
  const pr = [];
  for (let k = 0; k < 16; k++) pr.push(zaobljeni(0.006, 0.036, 0.003, -0.2 + k * 0.016 + 0.13, 0.05));
  add(tijelo, izvuciX(pr, 0.0, 0.0012, M.prorez, { curveSegments: 3 }));
  const pr2 = [];
  for (let k = 0; k < 7; k++) { const sh = new THREE.Shape(); const x0 = -0.13 + k * 0.0, y0 = -0.03 - k * 0.013; sh.moveTo(x0 + 0.05, y0); sh.lineTo(x0 + 0.05, y0 - 0.004); sh.lineTo(x0 - 0.06, y0 - 0.004 + 0.05); sh.lineTo(x0 - 0.06, y0 + 0.05); sh.closePath(); pr2.push(sh); }
  add(tijelo, izvuci(pr2, H - 0.0002, H + 0.0008, M.prorez, { curveSegments: 2 }));
  dio('stanica', tijelo);
  /* mrežni izvor (unutra) i kabel */
  const nap = grupa(s);
  add(nap, box(0.1, 0.16, 0.07, M.inoxT), -0.12, 0.12, 0.05);
  add(nap, box(0.07, 0.12, 0.004, M.pcb), -0.06, 0.1, 0.03);
  cijev(nap, [[-Dd, -0.2, 0.03], [-Dd - 0.05, -0.22, 0.02], [-Dd - 0.1, -0.15, 0.008], [-Dd - 0.2, -0.05, 0.008]], 0.004, M.tamno, 24, 6);
  dio('napajanjeStanice', nap);
  /* LED */
  const ledG = grupa(s, 0.0, 0.215, 0.118);
  const ledM = add(ledG, cylX(0.0035, -0.001, 0.0015, M.plavoOn, 16)); ledM.userData.led = true;
  dio('ledStanice', ledG);
  /* kontaktna ploča (6 polova) */
  const kp = grupa(s, 0, S.kontakt.y, S.kontakt.z);
  add(kp, box(0.006, S.kontakt.sirina, S.kontakt.visina, M.crno), 0.003, 0, 0);
  add(kp, box(0.002, S.kontakt.sirina - 0.012, S.kontakt.visina - 0.012, M.tamno), 0.0065, 0, 0);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) add(kp, box(0.0015, 0.012, 0.008, M.zlato), 0.0078, (c - 1) * 0.018, (r - 0.5) * 0.02);
  dio('kontaktnaPloca', kp);
  /* reflektorski markeri (lijevi = −y stanice, gledano s robota koji prilazi) */
  const texDots = platno(128, 148, (c, w, h) => { c.fillStyle = '#f4f4ef'; c.fillRect(0, 0, w, h); c.fillStyle = '#9aa0a3';
    for (let y = 10; y < h - 6; y += 9) for (let x = 8; x < w - 4; x += 9) { c.beginPath(); c.arc(x, y, 2.1, 0, 7); c.fill(); } });
  const matDots = texDots ? new THREE.MeshStandardMaterial({ map: texDots, roughness: 0.3 }) : M.reflektor;
  const markeri = {};
  [['lijevi', -1], ['desni', 1]].forEach(([ime, sy]) => {
    const g = grupa(s, S.marker.x, sy * S.razmakMarkera / 2, H);
    add(g, box(0.03, S.marker.sirina + 0.01, 0.01, M.crno), -0.006, 0, 0.005);
    add(g, box(0.006, S.marker.sirina + 0.006, S.marker.visina + 0.006, M.crno), -0.001, 0, 0.01 + S.marker.visina / 2);
    const pl = add(g, new THREE.Mesh(new THREE.PlaneGeometry(S.marker.sirina, S.marker.visina), matDots), 0.0025, 0, 0.01 + S.marker.visina / 2);
    pl.rotation.set(PI / 2, PI / 2, 0); pl.userData.vlastitiMat = !!texDots;
    markeri[ime] = g; dio(ime === 'lijevi' ? 'reflektorLijevi' : 'reflektorDesni', g);
  });
  /* osvijetljeni 2D marker za kameru */
  const KM = S.kameraMarker;
  const km = grupa(s, KM.x, KM.y, H);
  add(km, box(KM.dubina, KM.sirina, KM.visina, M.crno), 0, 0, KM.visina / 2 + 0.004);
  add(km, box(KM.dubina + 0.02, KM.sirina * 0.6, 0.008, M.crno), 0, 0, 0.004);
  for (const sy of [-1, 1]) for (const sz of [0.012, KM.visina - 0.008]) add(km, cylX(0.0028, KM.dubina / 2, KM.dubina / 2 + 0.0015, M.celik, 10), 0, sy * (KM.sirina / 2 - 0.009), sz + 0.004);
  const texM = platno(128, 160, (c, w, h) => { c.fillStyle = '#05070c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3f86ff'; c.shadowColor = '#3f86ff'; c.shadowBlur = 10; c.lineWidth = 9;
    c.strokeRect(18, 28, w - 36, w - 36); c.lineWidth = 8; c.beginPath(); c.moveTo(44, h - 54); c.lineTo(44, 54); c.lineTo(w - 44, 54); c.lineTo(w - 44, 76); c.lineTo(66, 76); c.lineTo(66, h - 54); c.stroke(); });
  const mOn = texM ? new THREE.MeshBasicMaterial({ map: texM, toneMapped: false }) : M.markerOn;
  const mOff = texM ? new THREE.MeshBasicMaterial({ map: texM, color: 0x333844, toneMapped: false }) : M.markerOff;
  const lice = add(km, new THREE.Mesh(new THREE.PlaneGeometry(KM.sirina - 0.012, KM.visina - 0.014), mOn), KM.dubina / 2 + 0.0008, 0, KM.visina / 2 + 0.004);
  lice.rotation.set(PI / 2, PI / 2, 0); lice.userData.led = true; lice.userData.vlastitiMat = true;
  dio('markerKamere', km);
  korijen.userData.dio = 'stanica';
  let svijetli = true;
  function svjetlo(v) { svijetli = !!v; ledM.material = svijetli ? M.plavoOn : M.plavoOff; lice.material = svijetli ? mOn : mOff; }
  function postaviPozu(x = 0, y = 0, phi = 0) { korijen.position.set(x, 0, -y); korijen.rotation.y = phi; korijen.updateMatrixWorld(true); }
  return { grupa: korijen, postaviPozu, markeri: { lijevi: markeri.lijevi, desni: markeri.desni, kamera: km }, kontakt: kp, svjetlo, svijetli: () => svijetli };
}
export function napraviStanicu(THREE, opcije = {}) {
  const dijelovi = opcije.dijelovi || new Map();
  const A = alati(THREE, dijelovi);
  const st = gradiStanicu(A, opcije);
  st.dijelovi = dijelovi;
  return st;
}

/* ====================================================================== robot */
export function napraviRobotino(THREE, opcije = {}) {
  const O = Object.assign({ stanica: KONFIG.stanica, nadogradnja: KONFIG.nadogradnja, laser: KONFIG.laser, kamera: KONFIG.kamera, baterije: KONFIG.baterije }, opcije);
  const dijelovi = new Map();
  const A = alati(THREE, dijelovi);
  const { M, dodaj, box, add, grupa, cylZ, cylX, cylY, izvuci, izvuciX, izvuciY, krug, rupa, sektor, prsten, zaobljeni, stap, greda, cijev, profilShape, platno, dio } = A;
  const R4 = KONFIG.generacija !== 'R3';
  const vrijeme = { t: null };
  const sad = () => (vrijeme.t != null ? vrijeme.t : (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);

  /* ---------------------------------------------------------------- mjere */
  const R = MJERE.promjerOsnovice / 2, zT = MJERE.zracnostTla, Hb = MJERE.odbojnik.visina, Tb = MJERE.odbojnik.debljina;
  const zPr = MJERE.prsten.vrh, zP = MJERE.paluba, zK = MJERE.visinaOsnovice, zF = MJERE.prednjaPloca.visina;
  const Rs = MJERE.ir.polumjer, Rc = R - 0.011, Rd = Rc - 0.001;
  const RW = MJERE.rw, RB = MJERE.rb, BW = MJERE.sirinaKotaca;
  const aF = MJERE.prednjaPloca.kutPola * RAD, rIn = MJERE.prednjaPloca.polumjerUnutra;
  const aO = (MJERE.otvorKotaca.sirina / 2) / Rc, zO = MJERE.otvorKotaca.vrh;
  const TH = MJERE.kutoviKotaca.map((d) => d * RAD);

  /* ---------------------------------------------------------------- korijen i glavne grupe */
  const korijen = new THREE.Group(); korijen.name = 'Robotino';
  const pozicija = grupa(korijen); pozicija.name = 'robot';
  pozicija.rotation.x = -PI / 2;                                  /* KS robota: Z gore */
  const gOsnova = grupa(pozicija), gObod = grupa(pozicija), gBocni = grupa(pozicija), gPloca = grupa(pozicija);
  const gUJ = grupa(pozicija), gKupola = grupa(pozicija), gPrednji = grupa(pozicija), gSnaga = grupa(pozicija);
  const gNad = grupa(pozicija); gNad.name = 'nadogradnja';
  [gOsnova, gObod, gBocni, gPloca, gUJ, gKupola, gPrednji, gSnaga, gNad].forEach((g) => { g.userData.anim = true; });
  const pokrovGrupe = [];
  const pk = (o) => { pokrovGrupe.push(o); return o; };

  /* ---------------------------------------------------------------- šasija (nosiva ploča s izrezima za kotače) */
  {
    const sh = krug(R - 0.014);
    TH.forEach((t) => {
      const c = Math.cos(t), s = Math.sin(t), p = new THREE.Path();
      const pts = [[RB - 0.034, -0.066], [RB + 0.034, -0.066], [RB + 0.034, 0.066], [RB - 0.034, 0.066]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
      p.moveTo(...pts[3]); p.lineTo(...pts[2]); p.lineTo(...pts[1]); p.lineTo(...pts[0]); p.closePath(); sh.holes.push(p);
    });
    const g = grupa(gOsnova);
    add(g, izvuci(sh, zT, zT + 0.004, M.inoxT, { curveSegments: 64 }));
    /* nosači stupova (odstojnici) ispod palube */
    [90, 150, 210, 270].forEach((d) => { const a = d * RAD; add(g, cylZ(0.0035, zT + 0.004, zP - 0.004, M.celik, 10), Math.cos(a) * 0.203, Math.sin(a) * 0.203, 0); });
    dio('sasija', g);
  }
  /* ---------------------------------------------------------------- odbojnik (zaobljeni gumeni profil po obodu) */
  {
    const pts = [], rr = 0.006, ri = R - Tb, z0 = zT, z1 = zT + Hb;
    const lukP = (cx, cz, a0, a1) => { for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * k / 4; pts.push(new THREE.Vector2(cx + rr * Math.cos(a), cz + rr * Math.sin(a))); } };
    pts.push(new THREE.Vector2(ri, z0));
    lukP(R - rr, z0 + rr, -PI / 2, 0); lukP(R - rr, z1 - rr, 0, PI / 2);
    pts.push(new THREE.Vector2(ri, z1)); pts.push(new THREE.Vector2(ri, z0));
    const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p.x, p.y)), 96); g.rotateX(PI / 2);
    const me = new THREE.Mesh(g, M.guma);
    dio('odbojnik', add(gObod, me));
  }
  /* ---------------------------------------------------------------- donji prsten (inox) s prozorčićima IR senzora */
  const irPolozaji = [];
  {
    const g = grupa(gObod);
    add(g, prsten(Rs, Rs - 0.0025, zT + Hb, zPr, M.inoxPrsten, 96));
    add(g, prsten(Rs + 0.001, Rs - 0.0025, zPr - 0.003, zPr, M.inoxT, 96));
    dio('donjiPrsten', pk(g));
    /* IR senzori Sharp GP2Y0A41SK0F (9 × 40°) */
    const ir = grupa(gObod);
    const gProzor = new THREE.BoxGeometry(0.0022, 0.03, 0.014), gTijelo = new THREE.BoxGeometry(0.0135, 0.0295, 0.013), gLeca = new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 14);
    MJERE.ir.kutovi.forEach((d, k) => {
      const a = d * RAD, s1 = grupa(ir, Math.cos(a) * Rs, Math.sin(a) * Rs, MJERE.ir.visina); s1.rotation.z = a;
      add(s1, new THREE.Mesh(gProzor, M.crno), 0.0006, 0, 0);
      add(s1, new THREE.Mesh(gTijelo, M.tamno), -0.009, 0, 0);
      for (const sy of [-0.0075, 0.0075]) { const l = new THREE.Mesh(gLeca, M.lece); l.rotation.z = PI / 2; add(s1, l, 0.0018, sy, 0); }
      irPolozaji.push({ polozaj: [Math.cos(a) * Rs, Math.sin(a) * Rs, MJERE.ir.visina], kut: a, kutDeg: d });
      if (k === 0) dio('ir1', s1);
    });
    dio('irNiz', ir);
  }
  /* ---------------------------------------------------------------- bočni pokrovi s otvorima za kotače */
  {
    const g = grupa(gBocni);
    const deb = 0.003, seg = (a0, a1, z0, z1) => add(g, izvuci(sektor(Rc - deb, Rc, a0, a1), z0, z1, M.pokrov, { curveSegments: 40 }));
    const t1 = TH[0], t2 = TH[1], t3 = TH[2];
    seg(t1 + aO, t2 - aO, zPr, zP);                 /* straga lijevo */
    seg(t2 + aO, t3 - aO, zPr, zP);                 /* straga desno */
    seg(t3 + aO - 2 * PI, t1 - aO, zPr, zF);        /* naprijed (niži) */
    [t1, t2, t3].forEach((t) => seg(t - aO, t + aO, zO, zP));   /* nadvoji iznad otvora */
    /* rubovi otvora (tamni okvir) */
    TH.forEach((t) => { for (const s of [-1, 1]) { const a = t + s * aO, e = add(g, box(0.006, 0.003, zO - zPr, M.tamno), Math.cos(a) * (Rc - 0.002), Math.sin(a) * (Rc - 0.002), (zO + zPr) / 2); e.rotation.z = a; } });
    dio('bocniPokrovi', pk(g));
    /* maske: dvije na donjim pokrovima, dvije na pokrovu upravljačke jedinice */
    const mg = grupa(gBocni), mk = grupa(gKupola);
    [(t1 + t2) / 2, (t2 + t3) / 2].forEach((a) => add(mg, izvuci(sektor(Rc, Rc + 0.003, a - 0.36, a + 0.36), 0.092, 0.188, M.maska, { curveSegments: 20 })));
    [96, 264].forEach((d) => add(mk, izvuci(sektor(Rd, Rd + 0.003, d * RAD - 0.3, d * RAD + 0.3), zP + 0.018, zK - 0.016, M.maska, { curveSegments: 20 })));
    dio('maske', pk(mg), pk(mk));
    /* ručke (udubljeni hvat na stražnjim pokrovima) */
    const ru = grupa(gBocni);
    [150, 210].forEach((d) => { const a = d * RAD; add(ru, izvuci(sektor(Rc - 0.012, Rc + 0.001, a - 0.16, a + 0.16), zP - 0.03, zP - 0.012, M.tamno, { curveSegments: 10 })); });
    dio('rucke', ru);
  }
  /* ---------------------------------------------------------------- gornja ploča i spuštena prednja ploča */
  {
    const g = grupa(gPloca);
    const sh = new THREE.Shape(); sh.absarc(0, 0, Rc, aF, 2 * PI - aF, false); sh.absarc(0, 0, rIn, -aF, aF, false); sh.closePath();
    add(g, izvuci(sh, zP - 0.004, zP, M.pokrov, { curveSegments: 64 }));
    dio('gornjaPloca', pk(g));
    const f = grupa(gPloca);
    add(f, izvuci(sektor(rIn, Rc, -aF, aF), zF - 0.004, zF, M.pokrov, { curveSegments: 32 }));
    add(f, izvuci(sektor(rIn - 0.003, rIn, -aF, aF), zF, zP, M.pokrov, { curveSegments: 24 }));
    for (const s of [-1, 1]) { const a = s * aF, w = add(f, box(Rc - rIn, 0.003, zP - zF, M.pokrov), Math.cos(a) * (Rc + rIn) / 2, Math.sin(a) * (Rc + rIn) / 2, (zP + zF) / 2); w.rotation.z = a; }
    dio('prednjaPloca', pk(f));
  }
  /* ---------------------------------------------------------------- pokrov upravljačke jedinice (kupola) */
  const tipkaloLED = { stanje: 'plavo', mesh: null };
  {
    const g = grupa(gKupola);
    const bt = 0.008, rx = MJERE.kupola.rubX, zr = MJERE.kupola.zarez;
    const Ri = Rd - bt, rxi = rx - bt, zri = zr + bt, ae = Math.acos(rxi / Ri);
    const sh = new THREE.Shape();
    sh.moveTo(rxi, Ri * Math.sin(ae)); sh.absarc(0, 0, Ri, ae, 2 * PI - ae, false);
    sh.lineTo(rxi, -zri); sh.absarc(rxi, 0, zri, -PI / 2, PI / 2, true); sh.closePath();
    add(g, izvuci(sh, zP + bt, zK - bt, M.pokrov, { curveSegments: 64, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 4 }));
    /* kosi rashladni prorezi (dvije skupine lukova) */
    const sl = [];
    for (let k = 0; k < 8; k++) { const r0 = 0.118 + k * 0.0105; sl.push(sektor(r0, r0 + 0.0042, 98 * RAD, 152 * RAD)); sl.push(sektor(r0, r0 + 0.0042, 208 * RAD, 262 * RAD)); }
    add(g, izvuci(sl, zK - 0.0006, zK + 0.0007, M.prorez, { curveSegments: 16 }));
    dio('pokrovUpravljacke', pk(g));
    /* glavno tipkalo s LED prstenom */
    const tp = grupa(gKupola, MJERE.tipkalo.x, MJERE.tipkalo.y, zK);
    const r = MJERE.tipkalo.promjer / 2;
    add(tp, cylZ(r * 1.45, -0.001, 0.0022, M.celik, 32));
    add(tp, cylZ(r * 0.92, 0.0015, 0.0052, M.bijelo, 32, r * 0.86));
    dio('glavnoTipkalo', tp);
    const lr = new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, r * 0.13, 8, 40), M.plavoOn); lr.position.z = 0.0024; lr.userData.led = true;
    tp.add(lr); tipkaloLED.mesh = lr;
    dio('ledPrsten', lr);
  }

  /* ---------------------------------------------------------------- pogonske jedinice */
  const P = MJERE.pogon, e = P.pomakMotora, zm = P.visinaMotora, xb = P.xRemena;
  const rRk = P.rRemeniceKotaca, rRm = P.rRemeniceMotora, omjerRemena = rRk / rRm;
  const jedinice = [], kotaci = [];
  /* zajedničke geometrije valjaka */
  const V = MJERE.valjci, rv = V.promjer / 2, Lv = V.duljina, Rcen = RW - rv;
  const profV = [];
  for (let k = 0; k <= 10; k++) { const y = -Lv / 2 + Lv * k / 10; profV.push(new THREE.Vector2(Math.max(0.0025, Math.sqrt(RW * RW - y * y) - Rcen), y)); }
  profV.unshift(new THREE.Vector2(0.0022, -Lv / 2)); profV.push(new THREE.Vector2(0.0022, Lv / 2));
  const gValjak = new THREE.LatheGeometry(profV, 14);
  const gZatik = new THREE.CylinderGeometry(0.0021, 0.0021, Lv + 0.006, 8);
  const gZatikNosac = (() => {   /* zatik + dva nosača kao jedna geometrija */
    const dijelovi = [gZatik.clone().toNonIndexed()];
    for (const sy of [-1, 1]) { const b = new THREE.BoxGeometry(0.004, 0.006, 0.012).toNonIndexed(); b.translate(0, sy * (Lv / 2 + 0.0035), -0.003); dijelovi.push(b); }
    let n = 0; dijelovi.forEach((g) => { n += g.attributes.position.count; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    dijelovi.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return g;
  })();
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qs = new THREE.Quaternion(), _p = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1), _osY = new THREE.Vector3(0, 1, 0);
  /* položaji valjaka: U.razmak (0..1, rastavljanje) i U.vrtnja (rad, vrtnja oko vlastite osi) */
  function postaviValjke(U) {
    const s = U.razmak;
    U.V0.forEach((v, k) => {
      const r = Math.hypot(v.p.y, v.p.z), f = (r + 0.014 * s) / r;
      _p.set(v.p.x * (1 + 1.6 * s), v.p.y * f, v.p.z * f);
      _m4.compose(_p, v.q, _s1); U.imZ.setMatrixAt(k, _m4);
      _q.copy(v.q).multiply(_qs.setFromAxisAngle(_osY, U.vrtnja)); _m4.compose(_p, _q, _s1); U.imV.setMatrixAt(k, _m4);
    });
    U.imV.instanceMatrix.needsUpdate = true; U.imZ.instanceMatrix.needsUpdate = true; U.imV.computeBoundingSphere(); U.imZ.computeBoundingSphere();
  }
  const diskShape = (() => { const s = krug(0.05); for (let k = 0; k < 6; k++) { const a = k * PI / 3 + PI / 6; s.holes.push(rupa(0.0085, Math.cos(a) * 0.031, Math.sin(a) * 0.031)); } s.holes.push(rupa(0.0086)); return s; })();
  function remenShape(c1, r1, c2, r2) {
    const hull = (R1, R2, rev) => {
      const dx = c2[0] - c1[0], dy = c2[1] - c1[1], L = Math.hypot(dx, dy), b = Math.atan2(dy, dx), f = Math.acos((R1 - R2) / L), pts = [];
      for (let k = 0; k <= 10; k++) { const a = b - f + 2 * f * k / 10; pts.push(new THREE.Vector2(c2[0] + R2 * Math.cos(a), c2[1] + R2 * Math.sin(a))); }
      for (let k = 0; k <= 24; k++) { const a = b + f + (2 * PI - 2 * f) * k / 24; pts.push(new THREE.Vector2(c1[0] + R1 * Math.cos(a), c1[1] + R1 * Math.sin(a))); }
      return rev ? pts.reverse() : pts;
    };
    const s = new THREE.Shape(hull(r1 + 0.0022, r2 + 0.0022, false)); s.holes.push(new THREE.Path(hull(r1, r2, true))); return s;
  }

  TH.forEach((t, k) => {
    const i = k + 1;
    const J = grupa(pozicija); J.rotation.z = t; J.name = 'pogon' + i; J.userData.anim = true;      /* KS jedinice: x radijalno (os kotača), y tangencijalno, z gore */
    const U = { J, i, t, d: {} };
    const novi = (id) => { const g = grupa(J); dio(id + i, g); U.d[id] = g; return g; };
    /* nosač jedinice */
    const nos = novi('pogonskaJedinica');
    add(nos, box(0.004, 0.15, 0.118, M.aluT), xb - 0.008, 0.035, zT + 0.004 + 0.059);
    add(nos, box(0.004, 0.062, 0.072, M.aluT), RB + BW / 2 + 0.01, 0, zT + 0.004 + 0.036);
    add(nos, box(RB + BW / 2 + 0.012 - (xb - 0.008), 0.006, 0.034, M.aluT), (RB + BW / 2 + 0.012 + xb - 0.008) / 2, -0.069, zT + 0.004 + 0.017);
    add(nos, box(RB + BW / 2 + 0.012 - (xb - 0.008), 0.03, 0.004, M.aluT), (RB + BW / 2 + 0.012 + xb - 0.008) / 2, -0.081, zT + 0.006);
    /* osovina, ležajevi i uskočnici */
    const osv = novi('osovina');
    add(osv, cylX(0.0085, xb - 0.014, RB + BW / 2 + 0.016, M.celik, 20), 0, 0, RW);
    for (const x of [xb - 0.012, RB + BW / 2 + 0.006]) { add(osv, cylX(0.016, x, x + 0.009, M.celik, 24), 0, 0, RW); add(osv, cylX(0.0118, x - 0.0005, x + 0.0095, M.tamno, 20), 0, 0, RW); }
    add(osv, cylX(0.0098, RB + BW / 2 + 0.0152, RB + BW / 2 + 0.0168, M.crno, 20), 0, 0, RW);
    /* vrtnja osovine: remenica kotača + kotač s valjcima */
    const os = grupa(J, 0, 0, RW); os.name = 'osovina' + i; os.userData.anim = true;
    const rem = novi('remen');
    const remK = grupa(os); add(remK, cylX(rRk, xb - 0.004, xb + 0.004, M.alu, 24)); add(remK, cylX(rRk + 0.0025, xb - 0.0048, xb - 0.004, M.aluT, 24)); add(remK, cylX(rRk + 0.0025, xb + 0.004, xb + 0.0048, M.aluT, 24));
    dio('remen' + i, remK);
    const kot = grupa(os, RB, 0, 0); kot.name = 'kotac' + i;
    add(kot, cylX(0.016, -BW / 2 + 0.002, BW / 2 - 0.002, M.alu, 24));
    add(kot, izvuciX(diskShape, -0.002, 0.002, M.alu, { curveSegments: 20 }));
    const vanjskiDisk = krug(0.043); vanjskiDisk.holes.push(rupa(0.0086));
    for (const s of [-1, 1]) add(kot, izvuciX(vanjskiDisk, s * (BW / 2) - 0.0015, s * (BW / 2) + 0.0015, M.alu, { curveSegments: 24 }));
    dio('kotac' + i, kot);
    /* valjci: dva InstancedMesha po kotaču (plašt + zatik s nosačima); položaj i vrtnja svakog valjka u nizu V0 */
    const val = grupa(kot);
    const nRed = V.redova, poRedu = V.poKotacu / nRed, xr = BW / 4 + 0.0005, nV = V.poKotacu;
    const imV = new THREE.InstancedMesh(gValjak, M.valjak, nV), imZ = new THREE.InstancedMesh(gZatikNosac, M.celik, nV);
    imV.userData.nespajaj = true; imZ.userData.nespajaj = true; val.add(imV); val.add(imZ);
    const V0 = [];
    for (let r = 0; r < nRed; r++) for (let n = 0; n < poRedu; n++) {
      const a = (n + (r % 2) * 0.5) * 2 * PI / poRedu, xo = nRed === 1 ? 0 : (r === 0 ? -xr : xr);
      V0.push({ p: new THREE.Vector3(xo, Rcen * Math.cos(a), Rcen * Math.sin(a)), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -Math.sin(a), Math.cos(a))) });
    }
    dio('valjci' + i, val);
    U.os = os; U.kot = kot; U.val = val; U.imV = imV; U.imZ = imZ; U.V0 = V0; U.vrtnja = 0; U.razmak = 0; postaviValjke(U);
    U.remK = remK;
    /* remen (zupčasti, plosnati) između remenica */
    const remB = add(rem, izvuciX(remenShape([0, RW], rRk, [e, zm], rRm), xb - 0.0035, xb + 0.0035, M.remen, { curveSegments: 4 }));
    const remM = grupa(rem, 0, e, zm); remM.userData.anim = true; add(remM, cylX(rRm, xb - 0.004, xb + 0.004, M.alu, 20)); add(remM, cylX(rRm + 0.0022, xb + 0.004, xb + 0.0048, M.aluT, 20));
    for (let z = 0; z < 6; z++) { const sp = add(remM, box(0.009, 0.0016, 0.0016, M.aluT), xb, 0, 0); sp.position.y = Math.cos(z * PI / 3) * (rRm - 0.002); sp.position.z = Math.sin(z * PI / 3) * (rRm - 0.002); }
    U.remM = remM; U.remB = remB;
    /* planetarni reduktor (prirubnica na nosaču) */
    const Lr = MJERE.reduktor.duljina, rm = MJERE.motor.promjer / 2, Lm = MJERE.motor.duljina, Le = MJERE.enkoder.duljina, re = MJERE.enkoder.promjer / 2;
    const x1 = xb - 0.01, x0 = x1 - Lr;
    const red = novi('reduktor'); red.position.set(0, e, zm);
    add(red, box(0.005, 0.044, 0.044, M.aluT), x1 - 0.0025, 0, 0);
    add(red, cylX(rm, x0, x1 - 0.005, M.alu, 28)); add(red, cylX(rm + 0.0008, x0 + Lr * 0.45, x0 + Lr * 0.5, M.aluT, 28));
    add(red, cylX(0.006, x1, xb, M.celik, 12));
    for (const [yy, zz] of [[0.016, 0.016], [-0.016, 0.016], [0.016, -0.016], [-0.016, -0.016]]) add(red, cylX(0.0022, x1 - 0.006, x1 + 0.0008, M.celik, 8), 0, yy, zz);
    /* motor */
    const mot = novi('motor'); mot.position.set(0, e, zm);
    const xm1 = x0, xm0 = xm1 - Lm;
    add(mot, cylX(rm, xm0 + 0.004, xm1 - 0.004, M.motor, 28));
    add(mot, cylX(rm - 0.001, xm1 - 0.004, xm1, M.alu, 28)); add(mot, cylX(rm - 0.001, xm0, xm0 + 0.004, M.alu, 28));
    add(mot, box(0.016, 0.012, 0.008, M.crno), xm0 + 0.012, 0, rm + 0.003);
    for (const s of [-1, 1]) add(mot, box(0.003, 0.0025, 0.006, M.zlato), xm0 + 0.012 + s * 0.004, 0, rm + 0.009);
    /* enkoder */
    const enk = novi('enkoder'); enk.position.set(0, e, zm);
    add(enk, cylX(re, xm0 - Le, xm0, M.tamno, 24)); add(enk, cylX(re * 0.6, xm0 - Le - 0.002, xm0 - Le, M.crno, 20));
    const disk = grupa(enk); disk.userData.anim = true; add(disk, cylX(re * 0.8, xm0 - Le * 0.55, xm0 - Le * 0.45, M.lece, 24)); U.disk = disk;
    cijev(enk, [[xm0 - Le * 0.5, 0, re], [xm0 - Le * 0.5 - 0.004, -0.01, re + 0.012], [xm0 - 0.03, -0.03, re + 0.02], [-0.02 - RB * 0.1, -0.05, 0.03]], 0.0022, M.crno, 20, 6);
    /* položaji za rastavljanje */
    U.rast = [[mot, -0.045], [enk, -0.085], [red, -0.012], [kot, 0.075], [val, 0.035], [remK, 0.0], [osv, 0.03]];
    U.rast.forEach((q) => { q[2] = q[0].position.x; });
    U.remZ0 = rem.position.z; U.remG = rem;
    dodaj('pogonskaJedinica' + i, J.children);
    jedinice.push(U); kotaci.push(os);
  });

  /* ---------------------------------------------------------------- napajanje: baterije, ležišta, ploča razvoda, elektronika punjenja */
  const gBat = [];
  {
    const B = MJERE.baterija, ld = grupa(pozicija);
    if (O.baterije === 'olovne2') {
      [120, 240].forEach((dd, k) => {
        const a = dd * RAD, g = grupa(pozicija, Math.cos(a) * 0.15, Math.sin(a) * 0.15, zT + 0.004); g.rotation.z = a; g.userData.smjer = a;
        add(g, box(0.065, 0.151, 0.094, M.tamno), 0, 0, 0.047); add(g, box(0.067, 0.153, 0.006, M.crno), 0, 0, 0.097);
        add(g, box(0.012, 0.012, 0.006, M.crveno), 0, 0.055, 0.103); add(g, box(0.012, 0.012, 0.006, M.crno), 0, -0.055, 0.103);
        dio('baterija' + (k + 1), g); gBat.push(g);
      });
      const l = grupa(ld); [120, 240].forEach((dd) => { const a = dd * RAD; const pl = add(l, box(0.075, 0.165, 0.003, M.crno), Math.cos(a) * 0.15, Math.sin(a) * 0.15, zT + 0.0055); pl.rotation.z = a; });
      dio('drzaciBaterija', l);
    } else {
      const n = O.baterije === 'festool2' ? 2 : 4;
      const lez = grupa(ld);
      for (let k = 0; k < n; k++) {
        const a = B.kutovi[k] * RAD, g = grupa(pozicija, Math.cos(a) * B.polumjer, Math.sin(a) * B.polumjer, B.z); g.rotation.z = a; g.userData.smjer = a;
        /* tijelo paketa (x radijalno, y tangencijalno) */
        add(g, izvuciY(zaobljeni(B.b, B.c * 0.7, 0.008, 0, B.c * 0.35), -B.a / 2, B.a / 2, M.festool, { curveSegments: 4 }));
        add(g, izvuciY(zaobljeni(B.b * 0.86, B.c * 0.34, 0.01, -0.004, B.c * 0.83), -B.a / 2 + 0.006, B.a / 2 - 0.006, M.festoolS, { curveSegments: 4 }));
        add(g, box(0.004, B.a * 0.5, 0.012, M.festoolZ), B.b / 2 + 0.001, 0, B.c * 0.52);
        const ledB = add(g, box(0.0016, 0.026, 0.003, M.ledZ), B.b / 2 + 0.0035, -0.01, B.c * 0.3); ledB.userData.led = true;
        dio('baterija' + (k + 1), g); gBat.push(g);
        const l = add(lez, box(B.b + 0.004, B.a + 0.004, 0.005, M.crno), Math.cos(a) * B.polumjer, Math.sin(a) * B.polumjer, B.z - 0.0025); l.rotation.z = a;
        for (const s of [-1, 1]) { const st = add(lez, cylZ(0.004, zT + 0.004, B.z - 0.005, M.crno, 8), Math.cos(a) * B.polumjer + Math.cos(a + s * PI / 2) * B.a * 0.35, Math.sin(a) * B.polumjer + Math.sin(a + s * PI / 2) * B.a * 0.35, 0); st.userData.x = 0; }
      }
      dio('drzaciBaterija', lez);
    }
    /* elektronika punjenja (okomita pločica straga, iza baterija) */
    const ep = grupa(gSnaga, -0.105, 0, 0.13);
    add(ep, box(0.003, 0.09, 0.05, M.pcb), 0, 0, 0.025);
    for (let q = 0; q < 4; q++) add(ep, box(0.006, 0.012, 0.01, M.cip), 0.004, -0.03 + q * 0.02, 0.02 + (q % 2) * 0.015);
    add(ep, cylX(0.006, 0.003, 0.016, M.tamno, 12), 0, 0.032, 0.038);
    dio('elektronikaPunjenja', ep);
    /* ploča razvoda napajanja */
    const ps = grupa(gSnaga, -0.01, 0, 0.168);
    add(ps, box(0.15, 0.12, 0.0018, M.pcb));
    for (let q = 0; q < 3; q++) add(ps, box(0.018, 0.02, 0.012, M.cip), -0.045 + q * 0.035, -0.03, 0.0069);
    for (let q = 0; q < 4; q++) add(ps, cylZ(0.0055, 0.001, 0.02, M.tamno, 14), 0.045, -0.04 + q * 0.025, 0);
    for (let q = 0; q < 6; q++) add(ps, box(0.012, 0.006, 0.008, M.bijelo), -0.06 + q * 0.022, 0.05, 0.005);
    for (let q = 0; q < 3; q++) add(ps, box(0.03, 0.004, 0.006, M.inoxT), -0.04 + q * 0.035, 0.035, 0.004);   /* priključci plosnatih kabela IR */
    [0, 1, 2].forEach((q) => add(ps, cylZ(0.004, -0.06, -0.002, M.celik, 8), -0.065 + q * 0.065, 0.055 - (q % 2) * 0.11, 0));
    dio('plocaSnage', ps);
  }

  /* ---------------------------------------------------------------- upravljačka jedinica (pod kupolom) */
  {
    const zu = zP + 0.002;
    const uj = grupa(gUJ);
    add(uj, izvuci(sektor(0.02, 0.19, 100 * RAD, 260 * RAD), zu, zu + 0.003, M.aluT, { curveSegments: 24 }));
    dio('upravljackaJedinica', uj);
    /* COM Express: nosiva ploča + modul + hladnjak s rebrima */
    const pc = grupa(gUJ, -0.11, -0.005, zu + 0.003);
    add(pc, box(0.13, 0.15, 0.0018, M.pcb), 0, 0, 0.004);
    add(pc, box(0.095, 0.125, 0.004, M.pcbP), 0, 0, 0.011);
    add(pc, box(0.09, 0.118, 0.006, M.alu), 0, 0, 0.0165);
    for (let q = 0; q < 9; q++) add(pc, box(0.086, 0.002, 0.026, M.alu), 0, -0.052 + q * 0.013, 0.0325);
    dio('racunaloCOM', pc);
    const mc = grupa(gUJ, -0.03, 0.105, zu + 0.007);
    add(mc, box(0.06, 0.07, 0.0018, M.pcb)); add(mc, box(0.016, 0.016, 0.0025, M.cip), 0, 0.008, 0.002); add(mc, box(0.01, 0.01, 0.002, M.cip), 0.016, -0.016, 0.0018);
    add(mc, box(0.016, 0.014, 0.012, M.inox), -0.02, -0.024, 0.007);   /* Ethernet prema računalu */
    dio('mikrokontroler', mc);
    const io = grupa(gUJ, -0.04, -0.125, zu + 0.007);
    add(io, box(0.09, 0.05, 0.0018, M.pcb)); for (let q = 0; q < 4; q++) add(io, box(0.008, 0.008, 0.002, M.cip), -0.03 + q * 0.02, 0.006, 0.0018);
    dio('ioPloca', io);
    const xd = grupa(gUJ, -0.04, -0.143, zu + 0.008);
    for (let q = 0; q < 4; q++) { const b = grupa(xd, -0.033 + q * 0.022, 0, 0); for (let p = 0; p < 4; p++) { add(b, box(0.0048, 0.012, 0.01, M.festoolZ), -0.0075 + p * 0.005, 0, 0.005); add(b, box(0.0025, 0.002, 0.003, M.narancasto), -0.0075 + p * 0.005, -0.005, 0.011); } }
    dio('prikljucciIO', xd);
    const wl = grupa(gUJ, -0.16, 0.085, zu + 0.026);
    add(wl, box(0.05, 0.026, 0.011, M.tamno)); add(wl, box(0.012, 0.014, 0.006, M.inox), 0.03, 0, 0); add(wl, box(0.004, 0.003, 0.002, M.plavoOn), -0.018, 0.008, 0.0065);
    dio('wlan', wl);
    const su = grupa(gUJ, -(Rd - 0.012), 0, zP + 0.05);
    [[-0.045, M.inox, 0.016, 0.014], [-0.025, M.inox, 0.014, 0.007], [-0.008, M.pcbP, 0.014, 0.007], [0.008, M.pcbP, 0.014, 0.007], [0.024, M.inox, 0.016, 0.006], [0.044, M.crno, 0.016, 0.013]]
      .forEach(([y, m, w, h]) => add(su, box(0.016, w, h, m), 0, y, 0));
    dio('sucelja', su);
    if (R4) {
      const v12 = grupa(gUJ, -0.115, -0.13, zu + 0.006); for (let q = 0; q < 2; q++) { add(v12, box(0.012, 0.01, 0.012, M.narancasto), q * 0.015, 0, 0.006); add(v12, box(0.004, 0.004, 0.003, M.bijelo), q * 0.015, -0.004, 0.0135); }
      dio('izlaz12V', v12);
      const m4 = grupa(gUJ, -0.08, 0.15, zu + 0.006); add(m4, box(0.012, 0.012, 0.012, M.narancasto), 0, 0, 0.006); add(m4, box(0.012, 0.008, 0.006, M.crno), 0.016, 0, 0.003);
      dio('prikljucakMotor4', m4);
    }
    const gy = grupa(gUJ, -0.02, -0.07, zu + 0.006);
    add(gy, box(0.03, 0.03, 0.0016, M.pcbP)); add(gy, box(0.012, 0.012, 0.004, M.cip), 0, 0, 0.0025);
    dio('ziroskop', gy);
    dodaj('upravljackaJedinica', gUJ.children);
  }

  /* ---------------------------------------------------------------- senzori na dnu: optički (svjetlovodi) i induktivni */
  {
    const op = grupa(gOsnova);
    const o1 = MJERE.opticki;
    for (const s of [-1, 1]) {
      add(op, box(0.03, 0.01, 0.02, M.tamno), o1.x - 0.04, s * o1.y, zT + 0.014);
      add(op, cylZ(0.003, zT - 0.006, zT + 0.006, M.crno, 10), o1.x, s * o1.y, 0);
      cijev(op, [[o1.x - 0.025, s * o1.y, zT + 0.02], [o1.x - 0.005, s * o1.y, zT + 0.02], [o1.x, s * o1.y, zT + 0.008]], 0.0012, M.crno, 10, 5);
    }
    dio('optickiSenzori', op);
    const ind = grupa(gOsnova, MJERE.induktivni.x, MJERE.induktivni.y, 0);
    add(ind, cylZ(0.006, zT - 0.008, zT + 0.04, M.celik, 16)); add(ind, cylZ(0.0062, zT - 0.0085, zT - 0.006, M.tamno, 16));
    for (const z of [zT - 0.002, zT + 0.006]) add(ind, cylZ(0.0095, z, z + 0.003, M.celik, 6));
    cijev(ind, [[0, 0, zT + 0.04], [0, 0, zT + 0.05], [-0.03, 0, zT + 0.055], [-0.06, 0.01, zT + 0.05]], 0.0022, M.tamno, 12, 6);
    dio('induktivniSenzor', ind);
  }

  /* ---------------------------------------------------------------- prednji dio: laserski skener, kamera, kontakt za punjenje */
  let laserInfo = null;
  if (O.laser) {
    const L = MJERE.laser, zl = L.visinaOsi;
    const nos = grupa(gPrednji, L.x, L.y, zF);
    const tip = O.laser;
    const zb = tip === 'sick-nanoscan3' ? zl - 0.045 : zl - 0.05;     /* donji rub tijela skenera */
    add(nos, box(0.075, 0.075, zb - zF, M.crno), 0, 0, (zb - zF) / 2);
    add(nos, box(0.02, 0.05, 0.012, M.tamno), -0.045, 0, 0.008);
    dio('nosacLasera', nos);
    const sk = grupa(gPrednji, L.x, L.y, zb);
    if (tip === 'sick-nanoscan3') {
      const dm = SENZORI.laser[tip].mjere;
      add(sk, izvuci(zaobljeni(dm[2], dm[0], 0.02), 0, dm[1] * 0.45, M.zuto, { curveSegments: 6 }));
      add(sk, izvuci(zaobljeni(dm[2] * 0.82, dm[0] * 0.86, 0.03, 0.006), dm[1] * 0.45, dm[1] * 0.78, M.lece, { curveSegments: 8 }));
      add(sk, izvuci(zaobljeni(dm[2] * 0.6, dm[0] * 0.7, 0.02, -0.01), dm[1] * 0.78, dm[1], M.zuto, { curveSegments: 6 }));
    } else {
      add(sk, izvuci(zaobljeni(0.05, 0.05, 0.004), 0, 0.04, M.crno, { curveSegments: 3 }));
      add(sk, cylZ(0.0205, 0.04, 0.059, M.lece, 32));
      add(sk, cylZ(0.0215, 0.0585, 0.0605, M.tamno, 32));
      add(sk, cylZ(0.025, 0.0605, 0.07, tip === 'hokuyo-ust10' ? M.tamno : M.crno, 32));
      add(sk, box(0.008, 0.008, 0.0006, M.bijelo), 0.004, 0.006, 0.0703);
      add(sk, box(0.004, 0.022, 0.012, M.tamno), -0.027, 0, 0.012);
      cijev(sk, [[-0.029, 0, 0.012], [-0.04, 0, 0.012], [-0.055, 0.02, -0.01], [-0.06, 0.04, -0.03]], 0.0025, M.crno, 16, 6);
    }
    dio('laserSkener', sk);
    laserInfo = { polozaj: [L.x, L.y, zl], kutMin: L.kutMin * RAD, kutMax: L.kutMax * RAD, domet: L.domet };
  }
  let kameraInfo = null;
  if (O.kamera) {
    const K = MJERE.kamera, dm = SENZORI.kamera[O.kamera].mjere;
    const nk = grupa(gPrednji);
    const xs = K.x - 0.055;
    add(nk, box(0.004, 0.022, K.z - zF - 0.006, M.alu), xs, 0, (K.z + zF - 0.006) / 2);
    add(nk, box(K.x - xs + 0.004, 0.022, 0.003, M.alu), (K.x + xs) / 2 - 0.004, 0, K.z - dm[2] / 2 - 0.0015);
    add(nk, box(0.016, 0.03, 0.004, M.alu), xs, 0, zF + 0.002);
    dio('nosacKamere', nk);
    const ca = grupa(gPrednji, K.x, 0, K.z);
    if (O.kamera === 'd435') {
      add(ca, izvuciY(zaobljeni(dm[1], dm[2], 0.006), -dm[0] / 2, dm[0] / 2, M.aluT, { curveSegments: 4 }));
      add(ca, box(0.0012, dm[0] - 0.006, dm[2] - 0.006, M.crno), dm[1] / 2 + 0.0006, 0, 0);
      [-0.033, -0.008, 0.012, 0.035].forEach((y, q) => add(ca, cylX(q === 1 ? 0.0045 : 0.0038, dm[1] / 2 + 0.0008, dm[1] / 2 + 0.0018, M.lece, 16), 0, y, 0));
    } else {
      add(ca, izvuciY(zaobljeni(dm[1], dm[2], 0.01), -dm[0] / 2, dm[0] / 2, M.crno, { curveSegments: 6 }));
      add(ca, cylX(0.007, dm[1] / 2 - 0.002, dm[1] / 2 + 0.002, M.lece, 20));
    }
    dio('kamera', ca);
    kameraInfo = { polozaj: [K.x, 0, K.z], smjer: [1, 0, 0] };
  }
  {
    const Kk = MJERE.kontakt, a = Kk.a;
    const kc = grupa(gPrednji, Kk.x - a / 2, Kk.y, Kk.z);
    add(kc, izvuci(zaobljeni(a, a, 0.004), -a / 2, a / 2, M.crno, { curveSegments: 3 }));
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) add(kc, cylX(0.0028, a / 2, a / 2 + 0.004, M.zlato, 10), 0, (c - 1) * 0.013, (r - 0.5) * 0.016);
    add(kc, box(0.025, 0.03, 0.003, M.tamno), -a / 2 - 0.006, 0, -a / 2 + 0.005);
    dio('kontaktPunjenja', kc);
  }

  /* ---------------------------------------------------------------- nadogradnja CP-MR: toranj, kutija RESET/START, prihvat nosača, signalni stup, nužni stop */
  const nad = { reset: null, resetUpaljen: false, signal: { crvena: 0, narancasta: 0, zelena: 1 }, segmenti: {}, rebra: [], nosac: null, prihvat: null };
  if (O.nadogradnja === 'cp-mr-c') {
    const T = MJERE.toranj, tx = T.x, zPl = MJERE.prihvat.z;
    /* toranj: inox U-profil s izrezima + aluminijski profil */
    const tor = grupa(gNad, tx, T.y, 0);
    { const w = T.inox.sirina / 2, d = T.inox.dubina / 2, s = 0.002, sh = new THREE.Shape();
      [[d, -w], [-d, -w], [-d, w], [d, w], [d, w - s], [-d + s, w - s], [-d + s, -w + s], [d, -w + s]].forEach((q, k) => (k ? sh.lineTo(...q) : sh.moveTo(...q))); sh.closePath();
      add(tor, izvuci(sh, zP, T.inox.vrh, M.inox, { curveSegments: 2 }));
      add(tor, box(0.1, 0.08, 0.004, M.inox), 0, 0, zP + 0.002);
      [[0.37, 0.024, 0.034], [0.45, 0.024, 0.034], [0.53, 0.018, 0.018], [0.57, 0.024, 0.03]].forEach(([z, ww, hh]) => add(tor, box(0.0012, ww, hh, M.crno), -d - 0.0005, 0, z));
      cijev(tor, [[0.004, 0.012, zP + 0.01], [0.002, 0.01, 0.4], [0.004, 0.012, T.inox.vrh + 0.02]], 0.004, M.crno, 12, 6);
      cijev(tor, [[0.006, -0.012, zP + 0.01], [0.004, -0.01, 0.4], [0.006, -0.008, T.inox.vrh + 0.02]], 0.0035, M.tamno, 12, 6); }
    dio('toranj', tor);
    const pa = T.al.sirina, gProf = new THREE.ExtrudeGeometry(profilShape(pa), { depth: 1, bevelEnabled: false, curveSegments: 8 });
    const profil = (p, x, y, z0, z1) => { const m = new THREE.Mesh(gProf, M.alu); m.scale.z = z1 - z0; m.position.set(x, y, z0); p.add(m); return m; };
    const al = grupa(gNad, tx, T.y, 0); profil(al, 0, 0, T.inox.vrh - 0.02, T.vrh);
    dio('alProfil', al);
    /* kutija RESET/START na stražnjoj strani tornja */
    const KR = MJERE.kutijaResetStart;
    const kr = grupa(gNad, tx - pa / 2 - KR.dubina / 2 - 0.004, T.y, KR.zSredina);
    add(kr, izvuci(zaobljeni(KR.dubina, KR.sirina, 0.004), -KR.visina / 2, KR.visina / 2, M.inox, { curveSegments: 3 }));
    add(kr, box(0.004, 0.03, 0.12, M.inoxT), KR.dubina / 2 + 0.002, 0, 0);
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) add(kr, cylX(0.0025, -KR.dubina / 2 - 0.001, -KR.dubina / 2, M.celik, 8), 0, sy * (KR.sirina / 2 - 0.008), sz * (KR.visina / 2 - 0.008));
    const natpis = (txt) => { const t = platno(256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#3a3f43'; c.font = 'bold 40px sans-serif'; c.textBaseline = 'middle'; c.fillText(txt, 8, h / 2 + 2); }); return t; };
    [['RESET', 0.06], ['START', -0.06]].forEach(([txt, z]) => { const t = natpis(txt); if (!t) return; const pl = add(kr, new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.0125), new THREE.MeshBasicMaterial({ map: t, transparent: true })), -KR.dubina / 2 - 0.0008, 0.028, z); pl.rotation.set(PI / 2, -PI / 2, 0); pl.userData.vlastitiMat = true; });
    dio('kutijaResetStart', kr);
    const tipka = (z, matOn, id) => {
      const g = grupa(kr, -KR.dubina / 2, -0.022, z);
      add(g, cylX(0.0145, -0.004, 0, M.crno, 28)); add(g, cylX(0.0125, -0.006, -0.004, M.celik, 28));
      const l = add(g, cylX(0.0105, -0.011, -0.0055, matOn, 28)); l.userData.led = true;
      dio(id, g); return l;
    };
    nad.reset = tipka(0.04, M.plavoOff, 'tipkaloReset');
    nad.start = tipka(-0.04, M.bijelaOff, 'tipkaloStart');
    /* transportna jedinica: lokalni KS prihvata — X duž traka (= os y robota), Y poprijeko (+Y = straga), Z gore; ishodište na gornjoj plohi traka */
    const pr = grupa(gNad, tx, T.y, zPl); pr.rotation.z = PI / 2; nad.prihvat = pr;
    pr.userData.dio = 'prihvatNosaca';
    const PH = MJERE.prihvat, Lp = PH.duljina, Wp = PH.sirina, Lb = Lp - 0.04;
    const fr = grupa(pr);
    const gProf3 = new THREE.ExtrudeGeometry(profilShape(0.03), { depth: 1, bevelEnabled: false, curveSegments: 6 });
    const prof3 = (p, a, b) => { const m = new THREE.Mesh(gProf3, M.alu); const A3 = new THREE.Vector3(...a), B3 = new THREE.Vector3(...b); m.scale.z = A3.distanceTo(B3); m.position.copy(A3); p.add(m); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), B3.clone().sub(A3).normalize()); return m; };
    for (const y of [-0.085, 0.085]) prof3(fr, [-Lp / 2, y, -0.04], [Lp / 2, y, -0.04]);
    for (const x of [-Lp / 2 + 0.015, 0, Lp / 2 - 0.015]) prof3(fr, [x, -Wp / 2 + 0.01, -0.04], [x, Wp / 2 - 0.01, -0.04]);
    /* nosač: profil od vrha tornja do okvira, kosi upornici */
    const np = grupa(pr);
    { const m = new THREE.Mesh(gProf, M.alu); m.scale.z = (zPl - 0.055) - T.vrh; m.position.set(0, 0, T.vrh - zPl); np.add(m); }
    for (const sx of [-1, 1]) prof3(np, [0, sx * 0.0, -0.2], [sx * 0.16, 0, -0.055]);
    for (const sy of [-1, 1]) prof3(np, [0, 0, -0.14], [0, sy * 0.08, -0.055]);
    add(np, box(0.07, 0.07, 0.006, M.aluT), 0, 0, -0.058);
    dio('nosacPrihvata', np);
    dio('prihvatNosaca', fr);
    /* trake: gornji i donji ogranak, valjci na krajevima, ležište, rebra */
    const gRebro = new THREE.BoxGeometry(0.0042, PH.sirinaTrake, 0.0016);
    const traka = (y, id) => {
      const g = grupa(pr, 0, y, 0);
      add(g, box(Lb, PH.sirinaTrake, 0.003, M.traka), 0, 0, -0.0015);
      add(g, box(Lb, PH.sirinaTrake, 0.003, M.traka), 0, 0, -0.0255);
      for (const sx of [-1, 1]) {
        const om2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, PH.sirinaTrake, 20, 1, false, sx > 0 ? 0 : PI, PI), M.traka);
        om2.position.set(sx * Lb / 2, 0, -0.0135); g.add(om2);
        add(g, cylY(0.012, -PH.sirinaTrake / 2 - 0.003, PH.sirinaTrake / 2 + 0.003, M.aluT, 20), sx * Lb / 2, 0, -0.0135);
      }
      add(g, box(Lb - 0.01, PH.sirinaTrake + 0.006, 0.018, M.aluT), 0, 0, -0.0135);
      const nR = Math.floor(Lb / PH.korakRebara);
      const im = new THREE.InstancedMesh(gRebro, M.crno, nR); im.userData.nespajaj = true; im.position.z = 0.0008; g.add(im); nad.rebra.push({ im, L: Lb, n: nR, korak: PH.korakRebara });
      dio(id, g); return g;
    };
    traka(PH.razmakTraka / 2, 'trakaPrihvata');
    traka(-PH.razmakTraka / 2, 'trakaIzdavanja');
    /* bočne vodilice (L-profil) */
    const vo = grupa(pr);
    for (const s of [-1, 1]) { add(vo, box(Lp, 0.002, 0.03, M.alu), 0, s * (Wp / 2 - 0.006), -0.006); add(vo, box(Lp, 0.016, 0.002, M.alu), 0, s * (Wp / 2 - 0.013), -0.022); }
    dio('vodilice', vo);
    /* preusmjerivač (kosa vodilica) */
    const pu = grupa(pr, Lb / 2 - 0.06, 0, 0);
    const pp1 = add(pu, box(0.075, 0.003, 0.008, M.inoxT), 0, 0, -0.004); pp1.rotation.z = 0.5;
    add(pu, cylZ(0.004, -0.02, -0.004, M.celik, 10), 0.03, 0.015, 0);
    dio('preusmjerivac', pu);
    dodaj('prihvatNosaca', vo, pu, pr.children.filter((c) => c.userData.dio === 'trakaPrihvata' || c.userData.dio === 'trakaIzdavanja'));
    /* motor trake */
    const mt = grupa(pr, -0.08, -0.03, -0.075);
    add(mt, cylY(0.018, -0.03, 0.04, M.motor, 24)); add(mt, cylY(0.019, 0.04, 0.07, M.alu, 24)); add(mt, box(0.03, 0.02, 0.03, M.crno), 0, -0.04, 0);
    add(mt, box(0.008, 0.008, 0.06, M.remen), 0, 0.075, 0.03);
    dio('motorTrake', mt);
    /* E/A kutija na −X kraju */
    const ea = grupa(pr, -Lp / 2 + MJERE.eaKutija.duljina / 2 - 0.01, 0, -0.03 - MJERE.eaKutija.visina / 2);
    const EAd = MJERE.eaKutija;
    add(ea, box(EAd.duljina, EAd.sirina, EAd.visina, M.bronca));
    add(ea, box(EAd.duljina + 0.004, EAd.sirina + 0.004, 0.006, M.broncaT), 0, 0, EAd.visina / 2 - 0.003);
    const rez = []; for (let q = 0; q < 5; q++) rez.push(zaobljeni(0.15, 0.006, 0.003, 0, -0.03 + q * 0.012));
    add(ea, izvuciX(rez, -EAd.duljina / 2 - 0.0012, -EAd.duljina / 2, M.broncaT, { curveSegments: 2 }));
    add(ea, box(0.0015, 0.05, 0.022, M.bijelo), -EAd.duljina / 2 - 0.0008, 0.06, 0.03);
    for (let q = 0; q < 3; q++) add(ea, cylZ(0.006, -EAd.visina / 2 - 0.012, -EAd.visina / 2, M.crno, 12), 0.03, -0.06 + q * 0.06, 0);
    dio('eaKutija', ea);
    const sr = grupa(ea, 0.01, -0.03, 0.02); add(sr, box(0.09, 0.022, 0.06, M.stanicaT)); add(sr, box(0.004, 0.018, 0.02, M.zuto), -0.046, 0, 0.012);
    for (let q = 0; q < 3; q++) { const l = add(sr, box(0.003, 0.004, 0.004, q ? M.zelenaOn : M.narOn), -0.046, -0.006 + q * 0.006, -0.012); l.userData.led = true; }
    dio('sigurnosniRelej', sr);
    /* senzori prihvata */
    const b1 = grupa(pr, 0.03, 0.0, -0.06);
    add(b1, box(0.03, 0.012, 0.02, M.tamno)); cijev(b1, [[0.015, 0, 0.005], [0.03, 0, 0.02], [0.035, 0, 0.058]], 0.0014, M.crno, 10, 5);
    add(b1, cylZ(0.003, 0.054, 0.0595, M.crno, 10), 0.035, 0, 0);
    dio('bg1', b1);
    const hs = (y, id, lec) => { const g = grupa(pr, Lp / 2 + 0.012, y, -0.04); add(g, box(0.024, 0.02, 0.03, M.tamno)); add(g, cylX(0.006, 0.012, 0.0145, lec, 14)); add(g, box(0.012, 0.03, 0.004, M.aluT), -0.01, 0, 0.017); dio(id, g); };
    hs(0.07, 'handshakePrijemnik', M.lece); hs(-0.07, 'handshakeOdasiljac', M.crvenaOff);
    const ip = grupa(pr, Lp / 2 + 0.008, 0, -0.07);
    add(ip, box(0.004, 0.17, 0.03, M.aluT), -0.004, 0, 0);
    [-0.065, 0, 0.065].forEach((y) => { add(ip, box(0.0135, 0.0295, 0.013, M.tamno), 0.006, y, 0); for (const s of [-0.0075, 0.0075]) add(ip, cylX(0.0035, 0.0128, 0.0145, M.lece, 12), 0, y + s, 0); });
    dio('irPozicioniranje', ip);
    /* signalni stup (Werma) */
    const SS = MJERE.signalniStup;
    const sxL = SS.y, syL = -(SS.x - tx);
    const ss = grupa(pr, sxL, syL, 0);
    add(ss, box(0.06, Math.abs(syL) - Wp / 2 + 0.03, 0.004, M.aluT), 0, -Math.sign(syL) * ((Math.abs(syL) - Wp / 2) / 2 - 0.008), -0.008);
    add(ss, cylZ(0.028, -0.006, 0.006, M.crno, 32));
    const hSeg = SS.segment, zSeg0 = (SS.vrh - zPl) - SS.broj * hSeg - 0.008;
    add(ss, cylZ(0.011, 0.006, zSeg0, M.crno, 20));
    add(ss, cylZ(SS.promjer / 2, zSeg0 - 0.006, zSeg0, M.crno, 32));
    [['zelena', 'svjetloZeleno', M.zelenaOn, M.zelenaOff], ['narancasta', 'svjetloNarancasto', M.narOn, M.narOff], ['crvena', 'svjetloCrveno', M.crvenaOn, M.crvenaOff]].forEach(([k, id, on, off], q) => {
      const z0 = zSeg0 + q * hSeg;
      const g = grupa(ss);
      const sg = add(g, cylZ(SS.promjer / 2 - 0.001, z0 + 0.002, z0 + hSeg - 0.002, off, 32)); sg.userData.led = true;
      add(g, cylZ(SS.promjer / 2, z0 + hSeg - 0.002, z0 + hSeg, M.tamno, 32));
      nad.segmenti[k] = { m: sg, on, off }; dio(id, g);
    });
    add(ss, cylZ(SS.promjer / 2, zSeg0 + SS.broj * hSeg, zSeg0 + SS.broj * hSeg + 0.008, M.crno, 32, SS.promjer / 2 - 0.004));
    dio('signalniStup', ss);
    /* nužni stop: stup, prozirno kućište, gljiva */
    const NS = MJERE.nuzniStop, nxL = NS.y, nyL = -(NS.x - tx);
    const st = grupa(pr, nxL, nyL, 0);
    const gProfNS = new THREE.ExtrudeGeometry(profilShape(NS.profil), { depth: 1, bevelEnabled: false, curveSegments: 6 });
    { const m = new THREE.Mesh(gProfNS, M.alu); m.scale.z = (NS.vrhStupa - zPl) + 0.045; m.position.z = -0.045; st.add(m); }
    add(st, box(0.03, Math.abs(nyL) - Wp / 2 + 0.02, 0.03, M.aluT), 0, -Math.sign(nyL) * ((Math.abs(nyL) - Wp / 2) / 2), -0.04);
    dio('stupNuznogStopa', st);
    const zk0 = NS.vrhStupa - zPl, KN = NS.kuciste;
    const ku = grupa(pr, nxL, nyL, zk0);
    add(ku, box(0.034, 0.05, 0.006, M.crno), 0, 0.004, 0.003);
    add(ku, box(0.006, 0.05, 0.03, M.crno), 0, 0.026, -0.012);
    add(ku, box(KN.a, KN.a, KN.v, M.staklo), 0, 0, 0.006 + KN.v / 2);
    for (let q = 0; q < 2; q++) add(ku, box(0.02, 0.012, 0.03, M.tamno), -0.012 + q * 0.024, 0, 0.026);
    add(ku, box(0.03, 0.03, 0.006, M.crno), 0, 0, 0.006 + KN.v - 0.003);
    dio('kucisteNuznogStopa', ku);
    const gl = grupa(ku, 0, 0, 0.006 + KN.v);
    add(gl, cylZ(0.024, 0, 0.004, M.zuto, 32)); add(gl, cylZ(0.011, 0.004, 0.01, M.crveno, 24));
    const kap = new THREE.Mesh(new THREE.SphereGeometry(NS.gljiva / 2, 28, 10, 0, 2 * PI, 0, PI * 0.42), M.crveno); kap.rotation.x = PI / 2; kap.position.z = 0.002; kap.scale.set(1, 0.55, 1); gl.add(kap);
    add(gl, cylZ(NS.gljiva / 2, 0.009, 0.013, M.crveno, 32));
    dio('nuzniStop', gl);
    /* nosač izratka na trakama */
    const nos = gradiNosac(A); pr.add(nos); nad.nosac = nos;
    /* kabeli nadogradnje (u lokalnom KS prihvata) */
    const kb = grupa(pr), dz = -zPl;
    cijev(kb, [[-Lp / 2 + 0.08, 0.06, -0.155], [-0.16, 0.06, -0.2], [-0.04, 0.03, -0.25], [-0.022, 0.018, -0.35], [-0.022, 0.016, dz + 0.65], [-0.02, 0.015, dz + T.inox.vrh - 0.01]], 0.0045, M.crno, 48, 6);
    cijev(kb, [[-Lp / 2 + 0.08, 0.0, -0.155], [-0.15, -0.02, -0.21], [-0.03, -0.025, -0.27], [-0.02, -0.022, -0.4], [-0.018, -0.02, dz + T.inox.vrh - 0.01]], 0.0035, M.tamno, 48, 6);
    cijev(kb, [[nxL, nyL - 0.01, -0.03], [nxL - 0.02, nyL - 0.03, -0.08], [0.0, 0.03, -0.15], [-0.01, 0.02, -0.3]], 0.0025, M.crno, 32, 6);
    cijev(kb, [[0.0, 0.05, KR.zSredina - zPl - 0.09], [0.0, 0.035, KR.zSredina - zPl - 0.13], [0.0, 0.022, KR.zSredina - zPl - 0.2]], 0.003, M.tamno, 16, 6);
    dio('kabeliNadogradnje', kb);
  }

  /* ---------------------------------------------------------------- stanica za punjenje (zasebna grupa, nije u korijenu robota) */
  let stanica = null;
  if (O.stanica) { stanica = gradiStanicu(A, {}); }

  /* ---------------------------------------------------------------- zrake senzora (prikaz) */
  const linMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const irGeo = new THREE.BufferGeometry(); irGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 2 * 3), 3)); irGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9 * 2 * 3), 3));
  const irLinije = new THREE.LineSegments(irGeo, linMat); irLinije.visible = false; irLinije.frustumCulled = false; irLinije.raycast = () => {}; irLinije.renderOrder = 5; pozicija.add(irLinije);
  const NLmax = 1100;
  const lzGeo = new THREE.BufferGeometry(); lzGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NLmax * 2 * 3), 3)); lzGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NLmax * 2 * 3), 3));
  const lzLinije = new THREE.LineSegments(lzGeo, linMat.clone()); lzLinije.material.opacity = 0.45; lzLinije.visible = false; lzLinije.frustumCulled = false; lzLinije.raycast = () => {}; lzLinije.renderOrder = 5; pozicija.add(lzLinije);
  const tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NLmax * 3), 3));
  const lzTocke = new THREE.Points(tGeo, new THREE.PointsMaterial({ color: 0xff3b30, size: 0.012, sizeAttenuation: true, depthWrite: false })); lzTocke.visible = false; lzTocke.frustumCulled = false; lzTocke.raycast = () => {}; pozicija.add(lzTocke);
  function zrakeIR(ud) {
    if (!ud) { irLinije.visible = false; return; }
    const p = irGeo.attributes.position.array, c = irGeo.attributes.color.array, dmax = SENZORI.ir.dometMax;
    irPolozaji.forEach((s, k) => {
      const d = Math.max(0, Math.min(dmax, Number(ud[k]) || dmax)), ca = Math.cos(s.kut), sa = Math.sin(s.kut), hit = d < dmax - 1e-6;
      p.set([s.polozaj[0], s.polozaj[1], s.polozaj[2], s.polozaj[0] + ca * d, s.polozaj[1] + sa * d, s.polozaj[2]], k * 6);
      const col = hit ? [1, 0.42, 0.1] : [0.35, 0.55, 0.75]; c.set([...col, ...col], k * 6);
    });
    irGeo.attributes.position.needsUpdate = true; irGeo.attributes.color.needsUpdate = true; irLinije.visible = true;
  }
  function zrakeLaser(ranges) {
    if (!ranges || !laserInfo || !ranges.length) { lzLinije.visible = false; lzTocke.visible = false; return; }
    const n = Math.min(NLmax, ranges.length), p = lzGeo.attributes.position.array, c = lzGeo.attributes.color.array, tp = tGeo.attributes.position.array;
    const [ox, oy, oz] = laserInfo.polozaj, a0 = laserInfo.kutMin, a1 = laserInfo.kutMax, dmax = laserInfo.domet;
    let nt = 0;
    for (let k = 0; k < n; k++) {
      const a = n > 1 ? a0 + (a1 - a0) * k / (n - 1) : 0, d = Math.min(dmax, Math.max(0, Number(ranges[k]) || 0)), hit = d < dmax - 1e-6 && d > 0;
      const x = ox + Math.cos(a) * d, y = oy + Math.sin(a) * d;
      p.set([ox, oy, oz, x, y, oz], k * 6);
      const col = hit ? [1, 0.25, 0.2] : [0.6, 0.6, 0.65]; c.set([...col, ...col], k * 6);
      if (hit) { tp.set([x, y, oz], nt * 3); nt++; }
    }
    lzGeo.setDrawRange(0, n * 2); tGeo.setDrawRange(0, nt);
    lzGeo.attributes.position.needsUpdate = true; lzGeo.attributes.color.needsUpdate = true; tGeo.attributes.position.needsUpdate = true;
    lzLinije.visible = true; lzTocke.visible = nt > 0;
  }

  /* ---------------------------------------------------------------- stanja svjetala */
  function primijeniSvjetla() {
    const t = sad();
    if (tipkaloLED.mesh) { const s = tipkaloLED.stanje; tipkaloLED.mesh.material = (s === 'plavo' || (s === 'treperi' && (t % 1) < 0.5)) ? M.plavoOn : M.plavoOff; }
    Object.keys(nad.segmenti).forEach((k) => { const sg = nad.segmenti[k]; sg.m.material = stanjeSvjetla(nad.signal[k], t) ? sg.on : sg.off; });
    if (nad.reset) nad.reset.material = stanjeSvjetla(nad.resetUpaljen, t) ? M.plavoOn : M.plavoOff;
  }
  /* treperenje bez vlastite petlje: prije iscrtavanja svjetleći dijelovi provjere stanje (učinak u sljedećem kadru) */
  const treperiMesh = [tipkaloLED.mesh, nad.reset, ...Object.values(nad.segmenti).map((s) => s.m)].filter(Boolean);
  treperiMesh.forEach((m) => { m.onBeforeRender = () => { if (!istaknutoId) primijeniSvjetla(); }; });
  function tipkalo(stanje) { tipkaloLED.stanje = stanje === 'treperi' ? 'treperi' : stanje === 'ugaseno' ? 'ugaseno' : 'plavo'; primijeniSvjetla(); }
  function signalniStup(s = {}) { ['crvena', 'narancasta', 'zelena'].forEach((k) => { if (k in s) nad.signal[k] = s[k]; }); primijeniSvjetla(); }
  function lampicaReset(v) { nad.resetUpaljen = !!v; primijeniSvjetla(); }
  function azuriraj(t) { vrijeme.t = (t == null ? null : Number(t)); primijeniSvjetla(); }

  /* ---------------------------------------------------------------- trake i nosač */
  let pomakTrake = 0;
  function trake(pomak) {
    pomakTrake = Number(pomak) || 0;
    nad.rebra.forEach((r) => {
      for (let q = 0; q < r.n; q++) { let x = (q * r.korak + pomakTrake) % r.L; if (x < 0) x += r.L; _m4.makeTranslation(-r.L / 2 + x, 0, 0); r.im.setMatrixAt(q, _m4); }
      r.im.instanceMatrix.needsUpdate = true; r.im.computeBoundingSphere();
    });
  }
  function postaviNosac(s = 0, vidljiv = true) { if (!nad.nosac) return; nad.nosac.position.x = Number(s) || 0; nad.nosac.visible = !!vidljiv; }

  /* ---------------------------------------------------------------- poza, kotači */
  function postaviPozu(x = 0, y = 0, phi = 0) { korijen.position.set(x, 0, -y); korijen.rotation.y = phi; korijen.updateMatrixWorld(true); }
  const kutKotaca = [0, 0, 0], kutValjaka = [0, 0, 0];
  function postaviKotace(kutovi, valjci) {
    jedinice.forEach((U, k) => {
      const a = Number(kutovi && kutovi[k]) || 0; kutKotaca[k] = a;
      U.os.rotation.x = -a;                                   /* +kut = kotač gura robota u smjeru (−sin θ, cos θ) */
      U.remM.rotation.x = -a * omjerRemena;
      U.disk.rotation.x = -a * 32;
      if (valjci) { const v = Number(valjci[k]) || 0; kutValjaka[k] = v; U.vrtnja = v; postaviValjke(U); }
    });
  }

  /* ---------------------------------------------------------------- rastavljanje i unutrašnjost */
  const st = { t: 0, pogon: [0, 0, 0], unutra: false };
  /* položaj cijele pogonske jedinice: radijalno van pri rastavljanju robota ili kad se rastavlja sama jedinica (tada i malo gore) */
  function postaviJedinicu(U) {
    const sp = st.pogon[U.i - 1] || 0, r = Math.max(0.17 * st.t, 0.2 * sp), z = 0.07 * sp * (1 - st.t);
    U.J.position.set(Math.cos(U.t) * r, Math.sin(U.t) * r, z);
  }
  const pomaci = [[gObod, 0.18], [gBocni, 0.32], [gPloca, 0.42], [gUJ, 0.52], [gKupola, 0.64], [gSnaga, 0.22], [gNad, 0.82], [gPrednji, 0.42]];
  function rastavi(t) {
    st.t = Math.max(0, Math.min(1, Number(t) || 0)); const s = st.t;
    pomaci.forEach(([g, dz]) => { g.position.z = dz * s; });
    gPrednji.position.x = 0.16 * s;
    jedinice.forEach(postaviJedinicu);
    gBat.forEach((g) => { const a = g.userData.smjer, r0 = g.userData.r0 ?? (g.userData.r0 = Math.hypot(g.position.x, g.position.y)); g.position.x = Math.cos(a) * (r0 + 0.24 * s); g.position.y = Math.sin(a) * (r0 + 0.24 * s); });
    primijeniProzirnost(); korijen.updateMatrixWorld(true);
  }
  function rastaviPogon(i, t) {
    const U = jedinice[i]; if (!U) return;
    const s = Math.max(0, Math.min(1, Number(t) || 0)); st.pogon[i] = s;
    U.rast.forEach(([g, dx, x0]) => { g.position.x = x0 + dx * s; });
    U.remG.position.z = U.remZ0 + 0.07 * s;
    U.razmak = s; postaviValjke(U);
    postaviJedinicu(U); primijeniProzirnost(); korijen.updateMatrixWorld(true);
  }
  const prozirniMat = [M.pokrov, M.maska, M.inoxPrsten];
  function primijeniProzirnost() {
    const vid = st.unutra || st.pogon.some((v) => v > 0);
    prozirniMat.forEach((m) => {
      if (vid) { m.transparent = true; m.opacity = m === M.inoxPrsten ? 0.3 : 0.16; m.depthWrite = false; }
      else { m.transparent = false; m.opacity = 1; m.depthWrite = true; }
      m.needsUpdate = true;
    });
    pokrovGrupe.forEach((g) => g.traverse((o) => { if (o.isMesh) o.userData.prozirno = vid; }));
  }
  function unutrasnjost(v) { st.unutra = !!v; primijeniProzirnost(); }

  /* ---------------------------------------------------------------- isticanje dijela */
  const hiCache = new Map(), duhCache = new Map();
  let istaknutoId = null;
  function sviMeshevi() { const out = []; korijen.traverse((o) => { if (o.isMesh) out.push(o); }); if (stanica) stanica.grupa.traverse((o) => { if (o.isMesh) out.push(o); }); return out; }
  function istakni(id) {
    const svi = sviMeshevi();
    svi.forEach((o) => { if (o.userData.matIst) { o.material = o.userData.matIst; o.userData.matIst = null; } });
    istaknutoId = null;
    if (!id || !dijelovi.has(id)) { primijeniSvjetla(); return; }
    istaknutoId = id;
    const odabrani = new Set();
    dijelovi.get(id).objekti.forEach((o) => o.traverse((c) => { if (c.isMesh) odabrani.add(c); }));
    svi.forEach((o) => {
      if (o.userData.led && odabrani.has(o)) return;
      const m0 = o.material; o.userData.matIst = m0;
      if (odabrani.has(o)) {
        let h = hiCache.get(m0.uuid); if (!h) { h = m0.clone(); if (h.emissive && !o.userData.led) { h.emissive = new THREE.Color(0x19b7c9); h.emissiveIntensity = 0.42; } h.transparent = false; h.opacity = 1; h.depthWrite = true; hiCache.set(m0.uuid, h); }
        o.material = h;
      } else {
        let d = duhCache.get(m0.uuid); if (!d) { d = m0.clone(); d.transparent = true; d.opacity = 0.1; d.depthWrite = false; if (d.emissive) d.emissive.setHex(0); duhCache.set(m0.uuid, d); }
        o.material = d;
      }
    });
  }

  /* ---------------------------------------------------------------- senzori (KS robota) */
  const senzori = {
    ir: irPolozaji.map((s) => ({ polozaj: s.polozaj.slice(), kut: s.kut, kutDeg: s.kutDeg })),
    laser: laserInfo,
    opticki: [-1, 1].map((s) => ({ polozaj: [MJERE.opticki.x, s * MJERE.opticki.y, 0], smjer: [0, 0, -1] })),
    induktivni: { polozaj: [MJERE.induktivni.x, MJERE.induktivni.y, 0], smjer: [0, 0, -1] },
    kamera: kameraInfo,
    kontakt: { polozaj: [MJERE.kontakt.x, MJERE.kontakt.y, MJERE.kontakt.z] }
  };

  if (O.spoji !== false) { spojiStaticno(THREE, korijen); if (stanica) spojiStaticno(THREE, stanica.grupa); }
  primijeniSvjetla(); trake(0); postaviKotace([0, 0, 0]); korijen.updateMatrixWorld(true);
  return {
    korijen, postaviPozu, postaviKotace, kotaci, dijelovi, istakni, rastavi, rastaviPogon, unutrasnjost,
    tipkalo, signalniStup, lampicaReset, trake, nosac: nad.nosac || new THREE.Object3D(), postaviNosac, senzori, zrakeIR, zrakeLaser,
    /* dodatno (izvan ugovora) */
    stanica, azuriraj, M, robot: pozicija, prihvat: nad.prihvat, stanje: st, jedinice
  };
}
