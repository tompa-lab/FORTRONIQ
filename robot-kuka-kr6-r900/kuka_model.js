/* FORTRONIQ · Industrijski robot KUKA KR AGILUS (KR 6 R900) — zajednički parametarski 3D model (naš crtež; bez vanjskih modela, tekstura, natpisa i logotipa).
   Koriste ga stranice „Upoznavanje robota”, „Upravljanje robotom”, AR i model CP Factory stanice.
   Sve mjere, nazivi i inačice dolaze iz kuka_podaci.js (MJERE, URDF, KONFIG, PRIHVATNICE, UPRAVLJAC, PRIVJESAK).
   Jedinice: METRI. korijen je u koordinatama scene (Y gore, podloga robota y = 0); unutra je grupa „robot” u KS robota ($ROBROOT, Z gore):
     x_s = x_r,  y_s = z_r,  z_s = −y_r.
   Kinematički lanac je URDF lanac (osi[i] se okreće oko osOsi[i] za KUKA kut A(i+1)); flange = $FLANGE (lokalna os z iz prirubnice prema van).
   Unutrašnjost osi (motor, kočnica, rezolver, prijenosnik, ležaj) je načelni prikaz — vrsta prijenosnika nije javno objavljena.
   Model ne pokreće vlastitu petlju; vremenski učinci (ventilatori, LED) računaju se u azuriraj(t).
   © ForTroniQ d.o.o. */
import { KONFIG, MJERE, URDF, DIJELOVI, PRIHVATNICE, UPRAVLJAC, PRIVJESAK, POGON, OSI, KUT_ISPRUZENE } from './kuka_podaci.js';
import * as KIN from './kuka_kin.js';

const NAZIV = new Map(DIJELOVI.map((d) => [d.id, d.naziv]));
const PI = Math.PI;
const SIXX = KONFIG.varijanta !== '-2';
const C5 = KONFIG.upravljac !== 'krc4compact';
const SP2 = KONFIG.privjesak !== 'smartpad';

/* ====================================================================== zajednički alati */
function alati(THREE, dijelovi) {
  const imaDoc = typeof document !== 'undefined';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o));
  const led = (c, i = 1.4) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.35 });
  const NAR = KONFIG.boja === 'narancasta';
  const M = {
    bijela: mat(NAR ? 0xe8731c : 0xeceae3, { roughness: 0.36, metalness: 0.04 }),
    bijelaT: mat(NAR ? 0xc85f12 : 0xd8d6cf, { roughness: 0.4, metalness: 0.04 }),
    siva: mat(NAR ? 0x2a2b2d : 0xa4a6a5, { roughness: NAR ? 0.55 : 0.38, metalness: NAR ? 0.15 : 0.55 }),
    sivaT: mat(NAR ? 0x1d1e20 : 0x8a8d8e, { roughness: 0.42, metalness: 0.5 }),
    tamna: mat(0x3b3f44, { roughness: 0.5, metalness: 0.2 }), tamnaS: mat(0x55595e, { roughness: 0.45, metalness: 0.2 }),
    crna: mat(0x1c1d1f, { roughness: 0.62 }), guma: mat(0x202224, { roughness: 0.92 }), kabel: mat(0x232527, { roughness: 0.75 }),
    celik: mat(0xb9bfc4, { metalness: 0.62, roughness: 0.3 }), celikT: mat(0x7f878d, { metalness: 0.55, roughness: 0.36 }),
    reduktor: mat(0x8e979d, { metalness: 0.5, roughness: 0.34 }), alu: mat(0xc9cdd1, { metalness: 0.5, roughness: 0.3 }), aluT: mat(0x9ea4a9, { metalness: 0.5, roughness: 0.34 }),
    bakar: mat(0xc0763a, { metalness: 0.65, roughness: 0.35 }), magnet: mat(0x8c3b3b, { metalness: 0.4, roughness: 0.4 }), magnetS: mat(0x3d5f8c, { metalness: 0.4, roughness: 0.4 }),
    tarno: mat(0x8a6a48, { roughness: 0.9 }), kuglica: mat(0xdfe4e8, { metalness: 0.7, roughness: 0.15 }), mjed: mat(0xc9a64a, { metalness: 0.7, roughness: 0.3 }),
    pcb: mat(0x1f6e3c, { roughness: 0.6 }), pcbP: mat(0x1d4f8a, { roughness: 0.6 }), cip: mat(0x16181a, { roughness: 0.45 }), zlato: mat(0xd2a445, { metalness: 0.8, roughness: 0.3 }),
    zuto: mat(0xf2c21a, { roughness: 0.45 }), crveno: mat(0xd4261c, { roughness: 0.4 }), zeleno: mat(0x2f9a48, { roughness: 0.55 }), zelenoT: mat(0x3fae5a, { roughness: 0.5 }),
    narancasto: mat(0xe8742a, { roughness: 0.5 }), plava: mat(0x1f6fc0, { roughness: 0.45 }), plavaS: mat(0x6aa8e6, { roughness: 0.35, transparent: true, opacity: 0.85 }),
    plavoSiva: mat(0x2b5f8f, { roughness: 0.5 }), bijeloP: mat(0xf1f2f2, { roughness: 0.55 }), crvenoT: mat(0x9e1d16, { roughness: 0.45 }),
    antracit: mat(0x4b5056, { roughness: 0.55, metalness: 0.2 }), antracitS: mat(0x5e646a, { roughness: 0.5, metalness: 0.2 }), resetka: mat(0x15171a, { roughness: 0.8 }),
    privjesak: mat(0x3d4248, { roughness: 0.55 }), privjesakS: mat(0x5d6369, { roughness: 0.5 }), tipka: mat(0x3a3f44, { roughness: 0.45 }), tipkaS: mat(0xc9cdd0, { roughness: 0.45 }),
    staklo: mat(0x1e2a33, { roughness: 0.12, metalness: 0.3 }), orange: mat(0xf28c28, { roughness: 0.4 }),
    ledZ: led(0x2ecc71), ledY: led(0xf5c518), ledR: led(0xff3b30), ledB: led(0x3fa9f5),
    pomocna: new THREE.MeshBasicMaterial({ color: 0x19b7c9, transparent: true, opacity: 0.85, depthTest: false })
  };
  M.ledZ.userData.led = true; M.ledY.userData.led = true; M.ledR.userData.led = true; M.ledB.userData.led = true;

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function orient(g, os) { if (os === 'z') g.rotateX(PI / 2); else if (os === 'x') g.rotateZ(-PI / 2); return g; }
  function add(p, o, x = 0, y = 0, z = 0) { o.position.x += x; o.position.y += y; o.position.z += z; p.add(o); return o; }
  function grupa(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; }
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  /* valjak duž osi os od a0 do a1 (polumjer r kod a0, r2 kod a1) */
  function cyl(r, a0, a1, os, m, seg = 32, r2) {
    let rb = r, rt = r2 ?? r; if (a1 < a0) { [a0, a1] = [a1, a0]; [rb, rt] = [rt, rb]; }
    const g = orient(new THREE.CylinderGeometry(rt, rb, a1 - a0, seg), os); const me = new THREE.Mesh(g, m); me.position[os] = (a0 + a1) / 2; return me;
  }
  /* rotacijsko tijelo: točke [r, a] (a duž osi os) */
  function lathe(pts, os, m, seg = 48, phi0 = 0, phiL = 2 * PI) { const g = orient(new THREE.LatheGeometry(pts.map(([r, a]) => new THREE.Vector2(Math.max(0, r), a)), seg, phi0, phiL), os); return new THREE.Mesh(g, m); }
  /* prsten (kolut s rupom) duž osi os */
  function prsten(ro, ri, a0, a1, os, m, seg = 48) { return lathe([[ri, a0], [ro, a0], [ro, a1], [ri, a1], [ri, a0]], os, m, seg); }
  function krug(r, cx = 0, cy = 0) { const s = new THREE.Shape(); s.absarc(cx, cy, r, 0, 2 * PI, false); return s; }
  function rupa(r, cx = 0, cy = 0) { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, 2 * PI, true); return p; }
  function zaobljeni(w, h, r, cx = 0, cy = 0, Tip = THREE.Shape) {
    const s = new Tip(), x = cx - w / 2, y = cy - h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  /* dvije kružnice spojene vanjskim tangentama (profil članka): središta (x1,y1) r1 i (x2,y2) r2 */
  function tangentni(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx), t = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / L)));
    const s = new THREE.Shape();
    s.moveTo(x1 + r1 * Math.cos(a + t), y1 + r1 * Math.sin(a + t));
    s.absarc(x1, y1, r1, a + t, a + 2 * PI - t, false);
    s.lineTo(x2 + r2 * Math.cos(a - t), y2 + r2 * Math.sin(a - t));
    s.absarc(x2, y2, r2, a - t, a + t, false);
    s.closePath(); return s;
  }
  /* glatke normale s pragom kuta (kao toCreasedNormals) — za izvučena tijela s obrubom */
  function zagladi(geo, kut = 0.95) {
    const g = geo.index ? geo.toNonIndexed() : geo, pos = g.attributes.position, n = pos.count;
    const fn = new Float32Array(n * 3), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
      for (let k = 0; k < 3; k++) { fn[(i + k) * 3] = e1.x; fn[(i + k) * 3 + 1] = e1.y; fn[(i + k) * 3 + 2] = e1.z; }
    }
    const mapa = new Map();
    for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 2e4) + ',' + Math.round(pos.getY(i) * 2e4) + ',' + Math.round(pos.getZ(i) * 2e4); let l = mapa.get(k); if (!l) { l = []; mapa.set(k, l); } l.push(i); }
    const out = new Float32Array(n * 3), cosT = Math.cos(kut);
    const nrm = (i) => { const x = fn[3 * i], y = fn[3 * i + 1], z = fn[3 * i + 2], L = Math.hypot(x, y, z); return L < 1e-30 ? null : [x / L, y / L, z / L]; };
    for (const l of mapa.values()) for (const i of l) {
      const ni = nrm(i); let sx = 0, sy = 0, sz = 0;
      if (ni) for (const j of l) { const nj = nrm(j); if (nj && nj[0] * ni[0] + nj[1] * ni[1] + nj[2] * ni[2] >= cosT) { sx += fn[3 * j]; sy += fn[3 * j + 1]; sz += fn[3 * j + 2]; } }
      const L = Math.hypot(sx, sy, sz) || 1; out[3 * i] = sx / L; out[3 * i + 1] = sy / L; out[3 * i + 2] = sz / L;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return g;
  }
  /* izvlačenje profila: os 'z' (profil u XY), 'y' (profil u XZ: sx → x, sy → z), 'x' (profil u YZ: sx → y, sy → z); d0…d1 duž osi; obrub {t, s, seg} */
  function izvuci(shape, d0, d1, os, m, ob = null, curve = 24) {
    const bt = ob ? ob.t : 0;
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-5, Math.abs(d1 - d0) - 2 * bt), curveSegments: curve, bevelEnabled: !!ob, bevelThickness: bt, bevelSize: ob ? ob.s : 0, bevelSegments: ob ? (ob.seg || 3) : 1 });
    const lo = Math.min(d0, d1) + bt;
    if (os === 'z') g.translate(0, 0, lo);
    else if (os === 'y') { g.translate(0, 0, -(lo + Math.abs(d1 - d0) - 2 * bt)); g.rotateX(PI / 2); }
    else { g.translate(0, 0, lo); g.rotateY(PI / 2); g.rotateX(PI / 2); }
    return new THREE.Mesh(ob ? zagladi(g) : g, m);
  }
  function cijev(p, tocke, r, m, seg = 64, rs = 10) {
    const k = new THREE.CatmullRomCurve3(tocke.map((t) => new THREE.Vector3(t[0], t[1], t[2])), false, 'centripetal');
    const me = new THREE.Mesh(new THREE.TubeGeometry(k, seg, r, rs, false), m); if (p) p.add(me); return me;
  }
  function stap(p, a, b, r, m, seg = 16, r2) {
    const A = V3(...a), B = V3(...b), L = A.distanceTo(B);
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, L, seg), m);
    me.position.copy(A).add(B).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(V3(0, 1, 0), B.clone().sub(A).normalize()); if (p) p.add(me); return me;
  }
  function kugla(r, m, s = 12) { return new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.max(6, s * 0.66 | 0)), m); }
  function platno(w, h, crtaj) {
    if (!imaDoc) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; crtaj(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  /* registar dijelova */
  function dio(id, ...obj) {
    let d = dijelovi.get(id); if (!d) { d = { naziv: NAZIV.get(id) || id, objekti: [] }; dijelovi.set(id, d); }
    obj.flat(Infinity).forEach((o) => { if (o) { d.objekti.push(o); o.userData.dio = id; } });
    return obj[0];
  }
  function dodaj(id, ...obj) { const d = dijelovi.get(id); if (d) obj.flat(Infinity).forEach((o) => { if (o && !d.objekti.includes(o)) d.objekti.push(o); }); }
  return { THREE, M, mat, V3, add, grupa, box, cyl, lathe, prsten, krug, rupa, zaobljeni, tangentni, izvuci, zagladi, cijev, stap, kugla, platno, dio, dodaj, orient, imaDoc };
}

/* spajanje nepomičnih meshova istog materijala (manje poziva iscrtavanja) — granice: userData.dio / anim / nespajaj */
function spojiStaticno(THREE, root) {
  root.updateMatrixWorld(true);
  const granica = (o) => o === root || !!(o.userData.dio || o.userData.anim || o.userData.nespajaj);
  const zadrzi = (c) => c.userData.dio || c.userData.led || c.userData.vlastitiMat || c.userData.nespajaj || c.userData.anim || c.material.userData.led || c.children.length || !c.visible || c.isInstancedMesh;
  const korijeni = []; root.traverse((o) => { if (!o.isMesh && granica(o) && !o.userData.nespajaj) korijeni.push(o); });
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
  korijeni.forEach((N) => {
    const poMat = new Map();
    const skupi = (o) => o.children.forEach((c) => {
      if (c.isMesh) { if (!zadrzi(c)) { const k = c.material.uuid; if (!poMat.has(k)) poMat.set(k, []); poMat.get(k).push(c); } }
      else if (!granica(c) && !c.isLine && !c.isPoints && c.visible) skupi(c);
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

/* ====================================================================== pogonski sklop osi (načelni): ležaj, prijenosnik, motor, kočnica, rezolver
   duž lokalne osi z: z = 0 izlaz (prema sljedećem članku), z = L strana poklopca. */
function gradiPogon(A, p, n, r, L) {
  const { THREE, M, grupa, add, cyl, prsten, box, kugla, izvuci, dio } = A;
  const g = grupa(p); g.userData.anim = true;
  const dijeloviU = [], vrti = [];
  const novi = (id, raz) => { const x = grupa(g); x.userData.anim = true; dio(id, x); dijeloviU.push({ g: x, raz, z0: 0 }); return x; };
  const zz = (u) => u * L;
  /* --- prijenosnik s izlaznim ležajem */
  const pr = novi('prijenosnik' + n, 1);
  add(pr, prsten(r * 1.26, r * 1.1, zz(0), zz(0.11), 'z', M.celikT, 40));          /* vanjski prsten ležaja */
  add(pr, prsten(r * 0.98, r * 0.84, zz(0), zz(0.11), 'z', M.celik, 40));          /* unutarnji prsten (izlaz) */
  for (let k = 0; k < 14; k++) { const a = k / 14 * 2 * PI, b = kugla(r * 0.075, M.kuglica, 8); b.position.set(Math.cos(a) * r * 1.04, Math.sin(a) * r * 1.04, zz(0.055)); pr.add(b); }
  add(pr, cyl(r * 1.18, zz(0.11), zz(0.33), 'z', M.reduktor, 40));                 /* zatvoreno kućište (vrsta prijenosnika nije objavljena) */
  add(pr, prsten(r * 1.2, r * 0.5, zz(0.33), zz(0.345), 'z', M.celikT, 40));
  for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * PI + 0.2, v = cyl(r * 0.07, zz(0.345), zz(0.37), 'z', M.celik, 6); v.position.x = Math.cos(a) * r * 0.95; v.position.y = Math.sin(a) * r * 0.95; pr.add(v); }
  add(pr, prsten(r * 0.8, r * 0.3, zz(0.0) - 0.0015, zz(0.0), 'z', M.celik, 32));   /* izlazna prirubnica */
  /* --- motor: stator s namotima, rotor s magnetima, vratilo */
  const mo = novi('motor' + n, 2);
  const m0 = zz(0.40), m1 = zz(0.70);
  add(mo, prsten(r * 1.0, r * 0.74, m0, m1, 'z', M.celikT, 40));
  add(mo, prsten(r * 1.02, r * 0.97, m0 - zz(0.02), m0, 'z', M.tamna, 40)); add(mo, prsten(r * 1.02, r * 0.97, m1, m1 + zz(0.02), 'z', M.tamna, 40));
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * 2 * PI, w = grupa(mo); w.rotation.z = a;
    add(w, box(r * 0.16, r * 0.2, (m1 - m0) * 1.1, M.bakar), r * 0.66, 0, (m0 + m1) / 2);
  }
  const rot = grupa(mo); rot.userData.anim = true; vrti.push(rot);
  add(rot, cyl(r * 0.5, m0 + 0.001, m1 - 0.001, 'z', M.celikT, 24));
  for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * PI, mg = box(r * 0.08, r * 0.3, (m1 - m0) * 0.9, k % 2 ? M.magnet : M.magnetS); mg.position.set(Math.cos(a) * r * 0.53, Math.sin(a) * r * 0.53, (m0 + m1) / 2); mg.rotation.z = a; rot.add(mg); }
  add(rot, cyl(r * 0.13, zz(0.34), zz(0.99), 'z', M.celik, 12));
  /* --- kočnica: tijelo s elektromagnetom, opruge, kotva, tarna ploča (vrti se) */
  const ko = novi('kocnica' + n, 3);
  const k0 = zz(0.73), k1 = zz(0.86);
  add(ko, prsten(r * 0.95, r * 0.35, k0 + (k1 - k0) * 0.55, k1, 'z', M.tamna, 36));
  add(ko, prsten(r * 0.78, r * 0.6, k0 + (k1 - k0) * 0.5, k0 + (k1 - k0) * 0.56, 'z', M.bakar, 36));
  add(ko, prsten(r * 0.92, r * 0.32, k0 + (k1 - k0) * 0.3, k0 + (k1 - k0) * 0.44, 'z', M.celik, 36));       /* kotva */
  for (let k = 0; k < 6; k++) { const a = k / 6 * 2 * PI + 0.3, s = cyl(r * 0.055, k0 + (k1 - k0) * 0.44, k0 + (k1 - k0) * 0.56, 'z', M.celik, 8); s.position.x = Math.cos(a) * r * 0.86; s.position.y = Math.sin(a) * r * 0.86; ko.add(s); }
  const tp = grupa(ko); tp.userData.anim = true; vrti.push(tp);
  add(tp, prsten(r * 0.86, r * 0.36, k0, k0 + (k1 - k0) * 0.28, 'z', M.tarno, 36));
  add(tp, prsten(r * 0.36, r * 0.13, k0, k0 + (k1 - k0) * 0.28, 'z', M.celikT, 16));
  /* --- rezolver: stator s namotima, rotor promjenjive reluktancije (vrti se) */
  const re = novi('resolver' + n, 4);
  const r0 = zz(0.885), r1 = zz(0.975);
  add(re, prsten(r * 0.82, r * 0.55, r0, r1, 'z', M.celikT, 36));
  for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * PI, w = box(r * 0.1, r * 0.1, (r1 - r0) * 1.25, M.bakar); w.position.set(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, (r0 + r1) / 2); w.rotation.z = a; re.add(w); }
  add(re, box(r * 0.5, r * 0.22, (r1 - r0) * 0.8, M.pcb), 0, -r * 0.95, (r0 + r1) / 2);
  const rr = grupa(re); rr.userData.anim = true; vrti.push(rr);
  { const s = new THREE.Shape(); for (let k = 0; k <= 48; k++) { const a = k / 48 * 2 * PI, rad = r * (0.43 + 0.06 * Math.cos(3 * a)); if (!k) s.moveTo(rad * Math.cos(a), rad * Math.sin(a)); else s.lineTo(rad * Math.cos(a), rad * Math.sin(a)); }
    s.holes.push(A.rupa(r * 0.13)); add(rr, izvuci(s, r0 + 0.0005, r1 - 0.0005, 'z', M.celik, null, 8)); }
  dijeloviU.forEach((d) => { d.z0 = d.g.position.z; });
  return { g, dijeloviU, vrti, L };
}

/* oznaka za umjeravanje: mjerni uložak (šesterokutni čep) i zarez — postavlja se na vanjsku plohu; lokalna z = normala plohe */
function gradiOznaku(A, p, n, pos, normala) {
  const { THREE, M, grupa, add, cyl, box, dio } = A;
  const g = grupa(p, pos[0], pos[1], pos[2]); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normala).normalize());
  add(g, cyl(0.0065, -0.002, 0.0015, 'z', M.celikT, 6)); add(g, cyl(0.0042, 0.0015, 0.003, 'z', M.celik, 16));
  add(g, box(0.003, 0.016, 0.0012, M.orange), 0.011, 0, 0.0); add(g, box(0.003, 0.016, 0.0012, M.orange), 0.0155, 0, 0.0);
  dio('umjeravanje' + n, g); return g;
}

/* ====================================================================== prihvatnice (TOOL1…TOOL4) — lokalna z = os alata (od dodirne plohe izmjenjivača prema van) */
function gradiAlat(A, i) {
  const { THREE, M, grupa, add, cyl, box, lathe, stap, cijev, kugla, dio } = A;
  const P = PRIHVATNICE[i - 1]; if (!P) return null;
  const g = new THREE.Group(); g.name = 'alat' + i; g.userData.anim = true;
  const hs = MJERE.izmjenjivac.visinaSlobodni, R = MJERE.izmjenjivac.promjer / 2;
  /* slobodni dio izmjenjivača */
  const sl = grupa(g);
  add(sl, lathe([[0, 0], [R * 0.86, 0], [R * 0.96, 0.002], [R * 0.96, hs - 0.003], [R, hs - 0.002], [R, hs], [0, hs]], 'z', M.alu, 40));
  add(sl, cyl(R * 0.97, hs * 0.45, hs * 0.55, 'z', M.aluT, 40));
  add(sl, box(0.012, 0.016, hs * 0.8, M.crna), R + 0.004, 0, hs * 0.5);
  dio('izmjenjivacSlobodni', sl);
  /* tijelo alata */
  const t = grupa(g, 0, 0, hs); const Lb = P.duljina;
  add(t, box(0.05, 0.05, 0.006, M.crna), 0, 0, 0.003);
  const prsti = [];
  if (P.vrsta === 'vakuum') {
    add(t, cyl(0.008, 0.006, 0.02, 'z', M.alu, 20));
    add(t, box(0.034, 0.016, 0.022, M.plavoSiva), 0.012, 0, 0.022);                /* ejektor (Venturijeva sapnica) */
    add(t, cyl(0.005, 0.03, 0.06, 'x', M.celikT, 12), 0, 0, 0.022).position.x = 0.03;
    add(t, cyl(0.0045, 0.02, Lb - 0.016, 'z', M.celik, 16));
    add(t, lathe([[0.0045, Lb - 0.016], [0.007, Lb - 0.014], [0.0055, Lb - 0.011], [0.008, Lb - 0.008], [0.006, Lb - 0.005], [0.011, Lb - 0.001], [0.0105, Lb], [0.0, Lb]], 'z', M.guma, 24));
    cijev(t, [[0.03, 0, 0.03], [0.04, 0, 0.012], [0.03, 0, -0.01]], 0.0025, M.plavaS, 16, 6);
  } else {
    const W = P.sirina, hod = P.hod || 0.01, hb = Math.min(0.05, Lb * 0.5);
    add(t, box(W, 0.032, hb, M.alu), 0, 0, 0.006 + hb / 2);
    add(t, box(W * 0.98, 0.034, 0.003, M.aluT), 0, 0, 0.006 + hb * 0.3);
    add(t, cyl(0.003, 0.0, 0.01, 'y', M.celik, 10), -W * 0.3, 0.016, 0.006 + hb * 0.7);
    add(t, cyl(0.003, 0.0, 0.01, 'y', M.celik, 10), W * 0.3, 0.016, 0.006 + hb * 0.7);
    for (const s of [-1, 1]) {
      const pr = grupa(t, s * hod, 0, 0.006 + hb); pr.userData.anim = true; pr.userData.s = s; pr.userData.hod = hod; prsti.push(pr);
      add(pr, box(0.014, 0.022, 0.008, M.celikT), s * 0.006, 0, 0.004);
      add(pr, box(0.007, 0.018, Lb - hb - 0.014, M.crna), s * 0.004, 0, 0.008 + (Lb - hb - 0.014) / 2);
      add(pr, box(0.004, 0.016, 0.012, M.guma), s * 0.0005, 0, Lb - hb - 0.012);
    }
  }
  dio(P.id, g);
  g.userData.otvori = (s) => { prsti.forEach((pr) => { pr.position.x = pr.userData.s * pr.userData.hod * (0.25 + 0.75 * Math.max(0, Math.min(1, s))); }); };
  g.userData.otvori(1);
  g.userData.tcp = P.tcp;
  return g;
}
export function napraviPrihvatnicu(THREE, i) {
  const dijelovi = new Map(); const A = alati(THREE, dijelovi);
  const g = gradiAlat(A, Math.max(1, Math.min(PRIHVATNICE.length, Number(i) || 1)));
  if (g) g.userData.dijelovi = dijelovi;
  return g || new THREE.Group();
}

/* ====================================================================== glavni model */
export function napraviKUKA(THREE, opcije = {}) {
  const O = Object.assign({ unutrasnjost: true, upravljac: true, privjesak: true, kabeli: true, spremiste: true, pribor: true, snop: true, alat: 1, spoji: true }, opcije);
  const dijelovi = new Map();
  const A = alati(THREE, dijelovi);
  const { M, V3, add, grupa, box, cyl, lathe, prsten, krug, rupa, zaobljeni, tangentni, izvuci, cijev, stap, kugla, platno, dio, dodaj } = A;
  const Mj = MJERE;

  /* ------------------------------------------------------------ korijen, lanac */
  const korijen = new THREE.Group(); korijen.name = 'KUKA_KR6_R900';
  const robot = grupa(korijen); robot.name = 'robot'; robot.rotation.x = -PI / 2;     /* KS robota: Z gore */
  const osi = [], osOsi = [], razmak = [], razmak0 = [];
  let rod = robot;
  for (let i = 0; i < 6; i++) {
    const Z = URDF.zglobovi[i];
    const xyz = i === 0 ? [0, 0, 0] : (i === 1 ? [Z.xyz[0], Z.xyz[1], Z.xyz[2] + URDF.zglobovi[0].xyz[2]] : Z.xyz);
    const rz = grupa(rod, ...xyz); rz.name = 'razmak' + (i + 1); rz.userData.anim = true; razmak.push(rz); razmak0.push(rz.position.clone());
    const o = grupa(rz); o.name = 'A' + (i + 1); o.userData.anim = true; osi.push(o); osOsi.push(V3(...Z.os));
    rod = o;
  }
  const flange = new THREE.Object3D(); flange.name = 'FLANGE'; flange.rotation.set(URDF.flange.rpy[0], URDF.flange.rpy[1], URDF.flange.rpy[2]); osi[5].add(flange);
  flange.userData.anim = true;
  const tcp = new THREE.Object3D(); tcp.name = 'TCP'; tcp.userData.anim = true; flange.add(tcp);
  const [L0, L1, L2, L3, L4, L5] = osi;
  const unutra = [];   /* posude unutrašnjosti: { g, os (indeks osi ili −1 = ostalo) } */
  const posuda = (p, os) => { const g = grupa(p); g.visible = false; g.userData.anim = true; g.userData.unutra = true; unutra.push({ g, os }); return g; };
  const ljuske = {};   /* id ljuske → meshovi (za prozirnost) */

  /* ============================================================ PODNOŽJE */
  const P = Mj.podnozje, H0 = P.visina, RB = P.polumjer, T = P.tlocrt;
  const pod = grupa(robot); pod.name = 'podnozje';
  {
    const bs = 0.003;
    add(pod, izvuci(zaobljeni(T[0] - 2 * bs, T[1] - 2 * bs, 0.026), 0, P.stopa, 'z', M.siva, { t: 0.0025, s: bs, seg: 2 }, 6));
    add(pod, lathe([[RB + 0.009, P.stopa - 0.001], [RB + 0.006, P.stopa + 0.004], [RB + 0.002, P.stopa + 0.012], [RB, P.stopa + 0.03], [RB, H0 - 0.012], [RB - 0.002, H0 - 0.004], [RB - 0.008, H0], [0, H0]], 'z', M.siva, 64));
    add(pod, prsten(RB + 0.0005, RB - 0.004, H0 - 0.05, H0 - 0.047, 'z', M.sivaT, 64));
  }
  dio('podnozje', pod); ljuske.podnozje = pod;
  { const g = grupa(robot); const h = P.razmakRupa / 2;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      add(g, cyl(0.011, P.stopa, P.stopa + 0.0015, 'z', M.celik, 24), sx * h, sy * h, 0);
      const v = add(g, cyl(0.0085, P.stopa + 0.0015, P.stopa + 0.0085, 'z', M.celik, 6), sx * h, sy * h, 0); v.rotation.z = 0.3;
    }
    add(g, cyl(0.004, P.stopa, P.stopa + 0.003, 'z', M.celikT, 12), h, 0, 0); add(g, box(0.006, 0.003, 0.003, M.celikT), -h, 0, P.stopa + 0.0015);
    dio('vijciTemelja', g); }
  { const g = grupa(robot, 0.003, RB + 0.0004, 0.085); g.rotation.x = PI / 2;
    add(g, box(0.05, 0.028, 0.0012, M.bijeloP)); add(g, box(0.042, 0.003, 0.0013, M.celikT), 0, 0.007, 0); add(g, box(0.03, 0.002, 0.0013, M.celikT), -0.006, 0, 0); add(g, box(0.036, 0.002, 0.0013, M.celikT), -0.003, -0.006, 0);
    dio('natpisnaPlocica', g); }
  /* sučelje A1 (kutija straga) */
  const S1 = Mj.suceljeA1, sx0 = -(RB - 0.035), sx1 = -(RB + S1.izbocenje - 0.035), sw = S1.sirina;
  const suc = grupa(robot); suc.name = 'suceljeA1'; suc.userData.anim = true;
  {
    const bs = 0.006, sh = new THREE.Shape();
    sh.moveTo(sx0 - bs, P.stopa + bs); sh.lineTo(sx1 + bs, P.stopa + bs); sh.lineTo(sx1 + bs, S1.visina - 0.03); sh.lineTo(sx1 + 0.03, S1.visina - bs - 0.01); sh.lineTo(sx0 - bs, S1.visina - bs); sh.closePath();
    add(suc, izvuci(sh, -sw / 2, sw / 2, 'y', M.siva, { t: 0.005, s: bs, seg: 3 }, 4));
    add(suc, box(0.004, sw * 0.86, S1.visina - 0.05, M.sivaT), sx1 - 0.0005, 0, P.stopa + (S1.visina - 0.05) / 2 + 0.008);
  }
  dio('suceljeA1', suc);
  const xL = sx1 - 0.002;   /* stražnja ploha priključaka */
  const konektor = (id, y, z, r, duz, okrugli = true) => {
    const g = grupa(suc, xL, y, z); g.rotation.y = -PI / 2;                     /* lokalna z → −x (prema van) */
    if (okrugli) { add(g, box(r * 2.5, r * 2.5, 0.004, M.tamna), 0, 0, 0.002); add(g, cyl(r, 0.004, 0.004 + duz * 0.45, 'z', M.celikT, 24)); add(g, cyl(r * 1.08, 0.004 + duz * 0.45, 0.004 + duz, 'z', M.crna, 24)); }
    else { add(g, box(r * 2.6, r * 2.2, 0.004, M.tamna), 0, 0, 0.002); add(g, box(r * 2.0, r * 1.7, duz, M.crna), 0, 0, 0.004 + duz / 2); add(g, box(r * 0.5, r * 2.0, duz * 0.6, M.celikT), r * 0.9, 0, 0.004 + duz * 0.3); }
    dio(id, g); return g;
  };
  konektor('x30', -0.032, 0.088, 0.016, 0.032);
  konektor('x31', 0.024, 0.098, 0.011, 0.028, false);
  konektor('x32', 0.05, 0.05, 0.0065, 0.012);
  konektor('xpn1', 0.022, 0.05, 0.006, 0.02);
  { const zrak = (id, y, z) => { const g = grupa(suc, xL, y, z); g.rotation.y = -PI / 2; add(g, cyl(0.006, 0, 0.004, 'z', M.celik, 6)); add(g, cyl(0.0045, 0.004, 0.012, 'z', M.celik, 16)); add(g, cyl(0.0048, 0.009, 0.0115, 'z', M.plava, 16)); dio(id, g); return g; };
    zrak('air1', -0.05, 0.04); zrak('air2', -0.03, 0.04); zrak('prikljucakNadtlaka', -0.008, 0.036).scale.setScalar(0.7);
    const pe = grupa(suc, xL, 0.054, 0.115); pe.rotation.y = -PI / 2; add(pe, cyl(0.004, 0, 0.008, 'z', M.celik, 6)); add(pe, box(0.012, 0.008, 0.0015, M.zuto), 0, 0, 0.003); add(pe, box(0.0025, 0.008, 0.0016, M.zelenoT), 0, 0, 0.0032); dio('zastitniVodic', pe); }
  /* unutrašnjost podnožja: RDC i vodovi */
  const U0 = posuda(robot, -1);
  { const g = grupa(U0, -0.035, 0, 0.065); add(g, box(0.07, 0.05, 0.003, M.pcb)); for (let k = 0; k < 5; k++) add(g, box(0.008, 0.008, 0.003, M.cip), -0.025 + k * 0.012, 0.008, 0.003); add(g, box(0.02, 0.012, 0.01, M.bijeloP), 0.02, -0.014, 0.006); add(g, box(0.07, 0.003, 0.03, M.celikT), 0, 0.027, 0.012); dio('rdc', g); }

  /* ============================================================ OKRETNI STUP (A1) */
  const St = Mj.stup, xA2 = URDF.zglobovi[1].xyz[0], zA2 = URDF.zglobovi[0].xyz[2], rG = St.polumjerGlavine;
  const py = Mj.nadlaktica.pomakY, dn = Mj.nadlaktica.debljina;
  const yN0 = py + dn / 2;                 /* unutarnja ploha nadlaktice (prema stupu) */
  const yG0 = yN0 + 0.006, yG1 = 0.064;    /* glavina A2 na stupu */
  const stup = grupa(L0); stup.name = 'okretniStup';
  {
    add(stup, prsten(RB - 0.004, RB - 0.03, H0, H0 + 0.0025, 'z', M.tamna, 64));
    add(stup, lathe([[0, H0 + 0.002], [St.polumjer + 0.0025, H0 + 0.002], [St.polumjer + 0.003, H0 + 0.006], [St.polumjer + 0.003, St.sivoDo - 0.004], [St.polumjer + 0.0015, St.sivoDo], [0, St.sivoDo]], 'z', M.siva, 64));
    add(stup, lathe([[0, St.sivoDo], [St.polumjer + 0.001, St.sivoDo], [St.polumjer, St.sivoDo + 0.04], [St.polumjer - 0.004, 0.29], [St.polumjer - 0.012, 0.318], [St.polumjer - 0.03, 0.334], [0.0, 0.34]], 'z', M.bijela, 64));
    add(stup, prsten(St.polumjer + 0.0015, St.polumjer - 0.01, St.sivoDo, St.sivoDo + 0.003, 'z', M.bijelaT, 64));
    /* sedlo prema glavini A2 */
    const bs = 0.011, rb = rG - bs, sh = new THREE.Shape();
    sh.moveTo(-0.07, 0.24); sh.lineTo(0.08, 0.24); sh.quadraticCurveTo(0.088, 0.3, xA2 + rb, zA2 - 0.012); sh.absarc(xA2, zA2, rb, -0.16, PI + 0.25, false); sh.quadraticCurveTo(-0.075, 0.33, -0.077, 0.27); sh.closePath();
    add(stup, izvuci(sh, yG0, yG1, 'y', M.bijela, { t: 0.011, s: bs, seg: 4 }, 32));
    /* glavina A2 (valjak duž y) */
    add(stup, lathe([[0, yG0], [rG - 0.003, yG0], [rG, yG0 + 0.004], [rG, yG1 - 0.012], [rG - 0.006, yG1 - 0.002], [rG - 0.016, yG1], [0, yG1]], 'y', M.bijela, 56), xA2, 0, zA2);
    /* poklopac glavine A2 (tamni prsten) */
    add(stup, prsten(rG - 0.016, rG - 0.03, yG1 - 0.001, yG1 + 0.0025, 'y', M.tamna, 56), xA2, 0, zA2);
    add(stup, cyl(rG - 0.03, yG1 - 0.001, yG1 + 0.0015, 'y', M.bijelaT, 48), xA2, 0, zA2);
    /* stražnji motorni poklopac (kosi) */
    const mp = grupa(stup, -0.05, 0.004, 0.282); mp.rotation.y = -0.62;
    add(mp, lathe([[0, -0.05], [0.044, -0.05], [0.046, -0.03], [0.046, 0.035], [0.042, 0.05], [0.03, 0.058], [0, 0.061]], 'z', M.bijela, 48));
    add(mp, prsten(0.03, 0.018, 0.0575, 0.0615, 'z', M.tamna, 40)); add(mp, cyl(0.018, 0.058, 0.0612, 'z', M.bijelaT, 32));
  }
  dio('okretniStup', stup); ljuske.okretniStup = stup;

  /* ============================================================ NADLAKTICA (A2) — okvir A2: x duž nadlaktice prema A3 */
  const Lnad = URDF.zglobovi[2].xyz[0], N = Mj.nadlaktica;
  const nad = grupa(L1); nad.name = 'nadlaktica';
  {
    const bs = 0.013;
    add(nad, izvuci(tangentni(0, 0, N.polumjerA2 - bs, Lnad, 0, N.polumjerA3 - bs), py - dn / 2, py + dn / 2, 'y', M.bijela, { t: 0.013, s: bs, seg: 4 }, 48));
    const yv = py - dn / 2;
    for (const [x, r] of [[0, N.polumjerA2], [Lnad, N.polumjerA3]]) {
      add(nad, prsten(r - 0.016, r - 0.03, yv + 0.0015, yv - 0.0025, 'y', M.tamna, 56), x, 0, 0);
      add(nad, cyl(r - 0.03, yv + 0.001, yv - 0.0018, 'y', M.bijelaT, 48), x, 0, 0);
      add(nad, cyl(0.008, yv - 0.0018, yv - 0.0028, 'y', M.tamnaS, 20), x, 0, 0);
    }
    /* razdjelna linija poklopca */
    add(nad, box(Lnad * 0.62, 0.0015, 0.004, M.bijelaT), Lnad * 0.5, yv + 0.0005, 0).rotation.x = PI / 2;
  }
  dio('nadlaktica', nad); ljuske.nadlaktica = nad;

  /* ============================================================ RUKA (A3) — okvir A3: x prema zapešću, os A4 na z = 0,035 */
  const zA4 = URDF.zglobovi[3].xyz[2], R3 = Mj.ruka, spoj = R3.spoj, rT = R3.polumjerCijevi, rL = R3.polumjerLakta;
  const ruka = grupa(L2); ruka.name = 'ruka';
  const yL0 = yN0 + 0.007, yL1 = 0.06;
  {
    add(ruka, lathe([[0, yL0], [rL - 0.004, yL0], [rL, yL0 + 0.005], [rL, yL1 - 0.012], [rL - 0.006, yL1 - 0.002], [rL - 0.016, yL1], [0, yL1]], 'y', M.bijela, 56));
    add(ruka, prsten(rL - 0.016, rL - 0.03, yL1 - 0.001, yL1 + 0.0025, 'y', M.tamna, 56));
    add(ruka, cyl(rL - 0.03, yL1 - 0.001, yL1 + 0.0015, 'y', M.bijelaT, 48));
    const tijelo = grupa(ruka, 0, 0, zA4);
    add(tijelo, lathe([[0, -0.082], [0.026, -0.081], [0.042, -0.076], [0.054, -0.064], [0.06, -0.045], [0.062, -0.02], [0.062, 0.025], [0.059, 0.062], [0.052, 0.11], [rT + 0.0005, 0.15], [rT, 0.17], [rT, spoj - 0.005], [rT - 0.001, spoj - 0.001], [0, spoj - 0.001]], 'x', M.bijela, 56));
    add(tijelo, prsten(rT + 0.0012, rT - 0.004, spoj - 0.006, spoj - 0.0015, 'x', M.tamna, 56));
    /* šav poklopca na vrhu */
    add(tijelo, box(0.13, 0.002, 0.0015, M.bijelaT), 0.03, 0, 0.0615).rotation.z = 0;
  }
  dio('ruka', ruka); ljuske.ruka = ruka;

  /* ============================================================ ZAPEŠĆE (A4) — okvir A4: os A4 = x, točka zapešća u x = 0,42 */
  const xW = URDF.zglobovi[4].xyz[0], Zp = Mj.zapesce, rZ = Zp.polumjer, yF = Zp.sirinaVilice / 2;
  const zap = grupa(L3); zap.name = 'zapesce';
  {
    add(zap, lathe([[0, spoj], [rT - 0.001, spoj], [rT + 0.004, spoj + 0.004], [rZ - 0.002, spoj + 0.013], [rZ, spoj + 0.024], [rZ, xW - 0.05], [rZ - 0.004, xW - 0.04], [rZ - 0.014, xW - 0.034], [0, xW - 0.033]], 'x', M.bijela, 56));
    const bs = 0.008;
    for (const s of [-1, 1]) {
      const y0 = s > 0 ? yF - 0.021 : -yF, y1 = s > 0 ? yF : -yF + 0.021;
      add(zap, izvuci(tangentni(xW - 0.07, 0, rZ - 0.006 - bs, xW, 0, Zp.polumjerA5 + 0.006 - bs), y0, y1, 'y', M.bijela, { t: 0.006, s: bs, seg: 3 }, 40));
      const yv = s * yF;
      add(zap, prsten(Zp.polumjerA5 - 0.004, Zp.polumjerA5 - 0.016, yv - s * 0.001, yv + s * 0.0025, 'y', M.tamna, 48), xW, 0, 0);
      add(zap, cyl(Zp.polumjerA5 - 0.016, yv - s * 0.001, yv + s * 0.0015, 'y', M.bijelaT, 40), xW, 0, 0);
    }
  }
  dio('zapesce', zap); ljuske.zapesce = zap;
  /* sučelje A4 (sixx na vrhu, -2 na boku) */
  {
    const g = grupa(L3, xW - 0.075, SIXX ? 0 : rZ - 0.004, SIXX ? rZ - 0.004 : 0); if (!SIXX) g.rotation.x = -PI / 2;
    add(g, izvuci(zaobljeni(0.044, 0.05, 0.008), 0, 0.012, 'z', M.tamna, { t: 0.002, s: 0.002, seg: 2 }, 6));
    dio('suceljeA4', g);
    const kon = (id, x, y, r, h, m2) => { const k = grupa(g, x, y, 0.012); add(k, cyl(r * 1.25, 0, 0.003, 'z', M.celikT, 6)); add(k, cyl(r, 0.003, h, 'z', m2 || M.celik, 20)); dio(id, k); return k; };
    kon('x41', -0.01, -0.012, 0.0065, 0.016); kon('xpn41', -0.01, 0.012, 0.0055, 0.014);
    for (let k = 0; k < (SIXX ? 6 : 2); k++) { const f = grupa(g, 0.012, -0.018 + k * 0.0072, 0.012); add(f, cyl(0.0024, 0, 0.007, 'z', M.celik, 10)); add(f, cyl(0.0026, 0.005, 0.0068, 'z', M.plava, 10)); dodaj('suceljeA4', f); }
  }

  /* ============================================================ PRIRUBNIČKI DIO (A5) i PRIRUBNICA (A6) */
  const kA6 = grupa(L4); kA6.name = 'kucisteA6';
  const rA5 = Zp.polumjerA5, rA6 = Zp.polumjerA6, yH = yF - 0.022;
  const dF = URDF.zglobovi[5].xyz[0], xKraj = dF - Mj.prirubnica.debljina - 0.006;
  {
    add(kA6, lathe([[0, -yH], [rA5 - 0.003, -yH], [rA5, -yH + 0.004], [rA5, yH - 0.004], [rA5 - 0.003, yH], [0, yH]], 'y', M.bijela, 48));
    add(kA6, lathe([[0, 0], [rA6, 0], [rA6, xKraj - 0.006], [rA6 - 0.002, xKraj - 0.002], [rA6 - 0.004, xKraj], [0, xKraj]], 'x', M.bijela, 48));
    add(kA6, prsten(rA6 + 0.0008, rA6 - 0.006, xKraj - 0.012, xKraj - 0.009, 'x', M.tamna, 48));
  }
  dio('kucisteA6', kA6); ljuske.kucisteA6 = kA6;
  const pri = grupa(flange); pri.name = 'prirubnica';
  {
    const Pr = Mj.prirubnica, rp = Pr.promjer / 2, sh = krug(rp);
    for (let k = 0; k < Pr.brojNavoja; k++) { const a = PI / 4 + k * 2 * PI / Pr.brojNavoja; sh.holes.push(rupa(0.0026, Math.cos(a) * Pr.krugRupa / 2, Math.sin(a) * Pr.krugRupa / 2)); }
    sh.holes.push(rupa(0.0026, Pr.krugRupa / 2, 0)); sh.holes.push(rupa(0.0062));
    add(pri, izvuci(sh, -Pr.debljina, 0, 'z', M.celik, null, 36));
    add(pri, cyl(0.0062, -Pr.debljina + 0.001, -0.0015, 'z', M.celikT, 24));
    add(pri, lathe([[0, -Pr.debljina - 0.006], [rA6 - 0.005, -Pr.debljina - 0.006], [rA6 - 0.004, -Pr.debljina - 0.002], [rp + 0.001, -Pr.debljina], [0, -Pr.debljina]], 'z', M.tamna, 48));
  }
  dio('prirubnica', pri);
  /* izmjenjivač — dio na robotu */
  const hf = Mj.izmjenjivac.visinaFiksni, RI = Mj.izmjenjivac.promjer / 2;
  const izm = grupa(flange); izm.name = 'izmjenjivacFiksni';
  add(izm, lathe([[0, 0], [RI * 0.82, 0], [RI * 0.9, 0.002], [RI * 0.96, 0.004], [RI, 0.006], [RI, hf - 0.004], [RI * 0.96, hf - 0.002], [RI * 0.9, hf], [0, hf]], 'z', M.alu, 48));
  add(izm, cyl(RI * 1.004, hf * 0.42, hf * 0.5, 'z', M.aluT, 48)); add(izm, cyl(RI * 1.004, hf * 0.62, hf * 0.66, 'z', M.aluT, 48));
  for (let k = 0; k < 2; k++) { const f = add(izm, cyl(0.0022, 0, 0.007, 'x', M.celik, 10), 0, 0, hf * 0.3); f.position.x = 0; f.rotation.z = k ? 2.4 : 2.0; }
  dio('izmjenjivacFiksni', izm);
  { const g = grupa(flange, RI + 0.006, 0, hf * 0.5); add(g, box(0.012, 0.018, hf * 0.7, M.crna)); for (let k = 0; k < 4; k++) add(g, cyl(0.0012, 0.0, 0.002, 'z', M.zlato, 8), 0.002, -0.006 + k * 0.004, hf * 0.35); dio('elektricniPrijenos', g); }
  /* TCP oznaka (skrivena; vidi pomocni.okviriDH i istakni) */
  { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.006), M.pomocna); m.renderOrder = 30; m.visible = false; m.userData.skriven = true; tcp.add(m); dio('tcp', m); }

  /* ============================================================ UNUTRAŠNJOST OSI (načelno) */
  const POG = [];
  if (O.unutrasnjost) {
    const U1 = posuda(L0, 0), U2 = posuda(L0, 1), U3 = posuda(L1, 2), U4 = posuda(L2, 3), U5 = posuda(L3, 4), U6 = posuda(L4, 5);
    const smjesti = (g, pos, rot) => { g.position.set(...pos); g.rotation.set(...rot); };
    let s;
    s = gradiPogon(A, U1, 'A1', 0.044, 0.14); smjesti(s.g, [0, 0, H0 + 0.006], [0, 0, 0]); POG.push(s);
    s = gradiPogon(A, U2, 'A2', 0.044, yG1 - yG0 - 0.004); smjesti(s.g, [xA2, yG0, zA2], [-PI / 2, 0, 0]); POG.push(s);
    s = gradiPogon(A, U3, 'A3', 0.04, 0.072); smjesti(s.g, [Lnad, yN0 + 0.004, 0], [PI / 2, 0, 0]); POG.push(s);
    s = gradiPogon(A, U4, 'A4', 0.03, 0.17); smjesti(s.g, [spoj - 0.004, 0, zA4], [0, -PI / 2, 0]); POG.push(s);
    s = gradiPogon(A, U5, 'A5', 0.021, 2 * yF - 0.008); smjesti(s.g, [xW, -yF + 0.004, 0], [-PI / 2, 0, 0]); POG.push(s);
    s = gradiPogon(A, U6, 'A6', 0.02, 0.04); smjesti(s.g, [xKraj - 0.004, 0, 0], [0, -PI / 2, 0]); POG.push(s);
  } else {
    /* bez unutrašnjosti: id-ovi i dalje postoje (mali skriveni markeri) */
    ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].forEach((n, i) => ['motor', 'prijenosnik', 'kocnica', 'resolver'].forEach((v) => { const m = kugla(0.004, M.celik, 6); m.visible = false; m.userData.skriven = true; osi[i].add(m); dio(v + n, m); }));
  }
  /* oznake za umjeravanje */
  gradiOznaku(A, robot, 'A1', [(RB + 0.0004) * Math.cos(-0.75), (RB + 0.0004) * Math.sin(-0.75), H0 - 0.016], [Math.cos(-0.75), Math.sin(-0.75), 0]);
  gradiOznaku(A, L0, 'A2', [xA2, yG0 + 0.014, zA2 + rG + 0.0003], [0, 0, 1]);
  gradiOznaku(A, L2, 'A3', [0, yL0 + 0.018, rL + 0.0004], [0, 0, 1]);
  gradiOznaku(A, L3, 'A4', [spoj + 0.02, 0, rZ + 0.0003], [0, 0, 1]);
  gradiOznaku(A, L3, 'A5', [xW - 0.052, yF + 0.0005, 0], [0, 1, 0]);
  gradiOznaku(A, L4, 'A6', [xKraj - 0.022, 0, rA6 + 0.0004], [0, 0, 1]);
  const tz = kugla(0.006, M.narancasto, 14); L3.add(tz); tz.position.set(xW, 0, 0); dio('tockaZapesca', tz);
  { const g = posuda(L3, -1); g.add(tz); }

  /* ventili, EtherCAT modul, unutarnji vodovi */
  const U3b = posuda(L3, -1), U2b = posuda(L2, -1), U1b = posuda(L1, -1), U0b = posuda(L0, -1);
  if (SIXX) {
    const g = grupa(U3b, xW - 0.095, 0, 0.022);
    for (let k = 0; k < 3; k++) { const v = grupa(g, k * 0.017, 0, 0); add(v, box(0.013, 0.03, 0.014, M.crna)); add(v, cyl(0.004, 0.015, 0.024, 'y', M.zuto, 12), 0, 0, 0); add(v, cyl(0.004, -0.024, -0.015, 'y', M.zuto, 12), 0, 0, 0); add(v, box(0.013, 0.012, 0.006, M.alu), 0, 0, -0.01); }
    dio('ventiliZapesca', g);
  }
  { const g = grupa(U2b, spoj - 0.06, 0, zA4 + 0.03); add(g, box(0.04, 0.026, 0.003, M.pcb)); add(g, box(0.012, 0.012, 0.003, M.cip), -0.008, 0, 0.003); add(g, box(0.01, 0.016, 0.006, M.bijeloP), 0.012, 0, 0.004); dio('ioModulZapesca', g); }
  const vod = (id, mat, r, segmenti) => { segmenti.forEach(([p, t]) => dio(id, cijev(p, t, r, mat, 40, 6))); };
  const off = (pts, dy, dz) => pts.map(([x, y, z]) => [x, y + dy, z + dz]);
  const putevi = [
    [U0, [[sx1 + 0.02, 0, 0.07], [-0.05, 0, 0.07], [-0.01, 0, 0.11], [0, 0, H0 + 0.004]]],
    [U0b, [[0, 0, H0 + 0.004], [0, 0, 0.3], [0.004, -0.02, 0.35], [xA2 - 0.02, yN0 + 0.01, zA2 - 0.02]]],
    [U1b, [[-0.02, py, -0.02], [0.08, py, -0.03], [Lnad - 0.08, py, -0.03], [Lnad - 0.02, py, -0.02]]],
    [U2b, [[0, yN0 + 0.01, -0.02], [0.03, -0.02, 0.0], [0.09, 0, zA4 + 0.035], [spoj - 0.01, 0, zA4 + 0.036]]],
    [U3b, [[spoj - 0.01, 0, 0.036], [spoj + 0.03, 0, 0.042], [xW - 0.075, 0, rZ - 0.008]]]
  ];
  putevi.forEach(([p, t]) => {
    dio('kabelskiSnop', cijev(p, off(t, 0, 0), 0.0055, M.crna, 40, 6));
    dio('zracniVodovi', cijev(p, off(t, 0.008, 0.004), 0.0035, M.plavaS, 40, 6));
    dio('sabirnicaEtherCAT', cijev(p, off(t, -0.008, 0.004), 0.0028, M.zeleno, 40, 6));
  });
  { /* obujmice energetskog sustava */
    const ob = [];
    putevi.forEach(([p, t]) => { const c = new THREE.CatmullRomCurve3(t.map((q) => V3(...q))); for (const u of [0.35, 0.75]) { const pt = c.getPoint(u), tg = c.getTangent(u); const m = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0018, 6, 16), M.celikT); m.position.copy(pt); m.quaternion.setFromUnitVectors(V3(0, 0, 1), tg); p.add(m); ob.push(m); } });
    dio('energetskiSustav', ob);
    dodaj('energetskiSustav', dijelovi.get('zracniVodovi').objekti, dijelovi.get('sabirnicaEtherCAT').objekti);
  }

  /* ============================================================ VANJSKI SNOP (plava spirala) — obnavlja se u postavi() */
  const snop = { mesh: null, jezgra: null, sidra: [] };
  if (O.snop) {
    const sid = (p, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
    snop.sidra = [sid(L2, -0.06, 0, zA4 + 0.07), sid(L2, 0.02, 0, zA4 + 0.068), sid(L2, 0.16, 0, zA4 + rT + 0.016), sid(L2, spoj - 0.03, 0, zA4 + rT + 0.017),
      sid(L3, xW - 0.06, 0, rZ + 0.016), sid(L3, xW + 0.03, 0, rZ + 0.03), sid(flange, RI + 0.02, 0, -0.03), sid(flange, RI + 0.006, 0, hf * 0.4)];
    const g = grupa(L2); g.userData.nespajaj = true; g.userData.anim = true;
    snop.mesh = new THREE.Mesh(new THREE.BufferGeometry(), M.plava); snop.mesh.userData.nespajaj = true; g.add(snop.mesh);
    snop.jezgra = new THREE.Mesh(new THREE.BufferGeometry(), M.plavaS); snop.jezgra.userData.nespajaj = true; g.add(snop.jezgra);
    /* držači na ruci i zapešću */
    const dr = [];
    for (const [p, x, z] of [[L2, 0.16, zA4 + rT], [L2, spoj - 0.03, zA4 + rT], [L3, xW - 0.06, rZ]]) { const h = grupa(p, x, 0, z); add(h, box(0.014, 0.03, 0.006, M.tamna), 0, 0, 0.003); add(h, new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 18), M.tamna), 0, 0, 0.016).rotation.y = PI / 2; dr.push(h); }
    dio('vanjskiSnop', snop.mesh, snop.jezgra, dr);
  } else { const m = kugla(0.003, M.plava, 6); m.visible = false; m.userData.skriven = true; L2.add(m); dio('vanjskiSnop', m); }
  const tA = new THREE.Matrix4(), tB = new THREE.Matrix4(), vT = new THREE.Vector3();
  function obnoviSnop() {
    if (!snop.mesh) return;
    robot.updateMatrixWorld(true);
    tA.copy(L2.matrixWorld).invert();
    const tocke = snop.sidra.map((o) => { tB.multiplyMatrices(tA, o.matrixWorld); return vT.setFromMatrixPosition(tB).clone(); });
    const k = new THREE.CatmullRomCurve3(tocke, false, 'centripetal');
    const Ld = k.getLength(), nZav = Math.max(20, Math.round(Ld / 0.0085)), nT = nZav * 8;
    const fr = k.computeFrenetFrames(Math.max(64, nZav), false);
    /* zavojnica oko krivulje (paralelni okviri) */
    const pts = [];
    for (let j = 0; j <= nT; j++) {
      const u = j / nT, kf = Math.min(fr.normals.length - 1, Math.round(u * (fr.normals.length - 1)));
      const a = j / 8 * 2 * PI, p0 = k.getPointAt(u), nn = fr.normals[kf], bb = fr.binormals[kf];
      pts.push(p0.clone().addScaledVector(nn, Math.cos(a) * 0.0105).addScaledVector(bb, Math.sin(a) * 0.0105));
    }
    snop.mesh.geometry.dispose(); snop.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nT, 0.0019, 4, false);
    snop.jezgra.geometry.dispose(); snop.jezgra.geometry = new THREE.TubeGeometry(k, 60, 0.0085, 8, false);
  }

  /* ============================================================ PRIHVATNICE i SPREMIŠTE */
  const alati4 = [];
  for (let i = 1; i <= PRIHVATNICE.length; i++) alati4.push(gradiAlat(A, i));
  const spremiste = { grupa: null, mjesta: [] };
  if (O.spremiste) {
    const g = grupa(robot, 0.0, 0.43, 0); g.name = 'spremiste'; spremiste.grupa = g; g.userData.anim = true;
    const n = Math.max(1, PRIHVATNICE.length), korak = 0.095, zF = 0.165, x0 = -korak * (n - 1) / 2;
    add(g, box(0.06, 0.06, 0.006, M.alu), x0 - 0.08, 0.0, 0.003);
    add(g, box(0.04, 0.04, zF + 0.01, M.alu), x0 - 0.08, 0.0, (zF + 0.01) / 2);
    add(g, box(korak * n + 0.06, 0.04, 0.04, M.alu), (x0 - 0.08 + x0 + korak * (n - 1) + 0.03) / 2, 0.02, zF - 0.02);
    for (let k = 0; k < n; k++) {
      const x = x0 + k * korak, w = 0.075, h = 0.07, so = MJERE.izmjenjivac.promjer * 0.8, sh = new THREE.Shape();
      sh.moveTo(-w / 2, -h / 2); sh.lineTo(-so / 2, -h / 2); sh.lineTo(-so / 2, 0); sh.absarc(0, 0, so / 2, PI, 0, true); sh.lineTo(so / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(-w / 2, h / 2); sh.closePath();
      add(g, izvuci(sh, zF, zF + 0.008, 'z', M.tamna, null, 12), x, -0.035, 0);
      add(g, cyl(0.004, zF + 0.008, zF + 0.012, 'z', M.celik, 12), x + 0.028, -0.015, 0);
      const m = new THREE.Object3D(); m.position.set(x, -0.035, zF + 0.004 + MJERE.izmjenjivac.visinaSlobodni * 0.5); m.rotation.x = PI; g.add(m); m.userData.anim = true; spremiste.mjesta.push(m);
    }
    dio('spremisteAlata', g);
  }
  let aktivniAlat = 0;
  function postaviAlat(i) {
    i = Math.max(0, Math.min(alati4.length, Math.round(Number(i) || 0)));
    alati4.forEach((t, k) => {
      if (k + 1 === i) { flange.add(t); t.position.set(0, 0, hf); t.rotation.set(0, 0, 0); }
      else if (spremiste.mjesta[k]) { spremiste.mjesta[k].add(t); t.position.set(0, 0, 0); t.rotation.set(0, 0, 0); }
      else if (t.parent) t.parent.remove(t);   /* bez spremišta: alat koji nije na robotu nije u sceni (stanica ga može postaviti sama: r.alati[k]) */
    });
    aktivniAlat = i;
    const P2 = PRIHVATNICE[i - 1];
    tcp.position.set(P2 ? P2.tcp.x : 0, P2 ? P2.tcp.y : 0, P2 ? P2.tcp.z : 0);
    tcp.rotation.set(0, 0, 0);
    korijen.updateMatrixWorld(true);
    if (snop.mesh) obnoviSnop();
  }
  function otvoriPrihvatnicu(s) { const t = alati4[aktivniAlat - 1]; if (t) t.userData.otvori(s); }

  /* ============================================================ UPRAVLJAČ */
  const upravljac = { grupa: null, otvori: () => {}, t: 0 };
  const vent = [], ledovi = [];
  const UP = UPRAVLJAC, [UW, UD, UH] = UP.mjere;
  const UX = -0.62, UY = 0.52;
  let prednjaU = null;   /* točke za kabele u KS robota */
  if (O.upravljac) {
    const g = grupa(robot, UX, UY, 0); g.rotation.z = PI / 2; g.name = 'upravljac'; upravljac.grupa = g; g.userData.anim = true;
    const st = 0.0015, z0 = 0.008, Hk = UH - z0;
    const kuc = grupa(g); kuc.name = 'kucisteUpravljaca';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(kuc, cyl(0.012, 0, z0, 'z', M.guma, 16), sx * (UW / 2 - 0.03), sy * (UD / 2 - 0.03), 0);
    add(kuc, box(UW, UD, st, M.antracit), 0, 0, z0 + st / 2);
    for (const sx of [-1, 1]) add(kuc, box(st, UD, Hk, M.antracit), sx * (UW / 2 - st / 2), 0, z0 + Hk / 2);
    add(kuc, box(UW, st, Hk, M.antracit), 0, UD / 2 - st / 2, z0 + Hk / 2);
    /* prednja ploča s rešetkom za ulaz zraka */
    const pr = grupa(kuc, 0, -UD / 2, z0);
    add(pr, box(UW, 0.004, Hk, M.antracitS), 0, 0.002, Hk / 2);
    const nR = C5 ? 9 : 16;
    for (let k = 0; k < nR; k++) add(pr, box(UW * 0.3, 0.0045, Hk * 0.035, M.resetka), -UW * 0.27, 0.0015, Hk * (0.18 + 0.68 * k / (nR - 1)));
    if (!C5) { for (const sx of [-1, 1]) { add(pr, box(0.012, 0.004, Hk, M.antracitS), sx * (UW / 2 + 0.006), 0.002, Hk / 2); add(pr, cyl(0.004, -0.04, 0, 'y', M.celik, 10), sx * (UW / 2 - 0.02), 0, Hk * 0.25); add(pr, cyl(0.004, -0.04, 0, 'y', M.celik, 10), sx * (UW / 2 - 0.02), 0, Hk * 0.75); stap(pr, [sx * (UW / 2 - 0.02), -0.04, Hk * 0.25], [sx * (UW / 2 - 0.02), -0.04, Hk * 0.75], 0.004, M.celik, 10); } }
    /* stražnja ploča: izlaz zraka */
    for (const x of [-UW * 0.22, UW * 0.25]) { add(kuc, prsten(Math.min(0.045, Hk * 0.42), Math.min(0.04, Hk * 0.38), UD / 2 - 0.0005, UD / 2 + 0.0015, 'y', M.resetka, 32), x, 0, z0 + Hk / 2); for (let k = -2; k <= 2; k++) add(kuc, box(Math.min(0.08, Hk * 0.76), 0.002, 0.002, M.resetka), x, UD / 2 + 0.0008, z0 + Hk / 2 + k * Hk * 0.12); }
    dio('kucisteUpravljaca', kuc);
    /* poklopac (otvara se oko stražnjeg ruba) */
    const lid = grupa(g, 0, UD / 2, UH); lid.userData.anim = true;
    add(lid, box(UW + 0.004, UD + 0.004, 0.003, M.antracit), 0, -UD / 2, 0.0015);
    for (let k = 0; k < 7; k++) add(lid, box(UW * 0.22, 0.004, 0.0032, M.resetka), UW * 0.24, -UD * (0.2 + 0.1 * k), 0.0016);
    dodaj('kucisteUpravljaca', lid); lid.userData.dio = 'kucisteUpravljaca';
    upravljac.otvori = (t) => { upravljac.t = Math.max(0, Math.min(1, Number(t) || 0)); lid.rotation.x = -upravljac.t * 1.75; korijen.updateMatrixWorld(true); };
    /* --- unutrašnjost: kontrolna kutija (lijevo) */
    const zi = z0 + st, hS = Math.min(Hk, 0.12);
    const pcb = (id, x, y, w, d, z, m = M.pcb) => { const q = grupa(g, x, y, z); add(q, box(w, d, 0.002, m), 0, 0, 0.001); for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(q, cyl(0.002, -(z - zi), 0, 'z', M.celik, 6), sx * (w / 2 - 0.006), sy * (d / 2 - 0.006), 0); dio(id, q); return q; };
    { const q = pcb('sistemskaPloca', -UW * 0.22, UD * 0.06, UW * 0.42, UD * 0.56, zi + 0.012);
      add(q, box(0.04, 0.04, 0.004, M.cip), -0.02, 0.02, 0.004); for (let k = 0; k < 8; k++) add(q, box(0.04, 0.0025, Math.min(0.025, hS * 0.22), M.alu), -0.02, 0.006 + k * 0.004, 0.006 + Math.min(0.025, hS * 0.22) / 2);
      for (let k = 0; k < 2; k++) add(q, box(0.067, 0.004, Math.min(0.03, hS * 0.25), M.pcbP), 0.045, -0.02 + k * 0.012, 0.002 + Math.min(0.03, hS * 0.25) / 2);
      add(q, box(0.05, 0.022, 0.004, M.crna), -0.03, -UD * 0.18, 0.004);                     /* SSD (opcija) */
      for (let k = 0; k < 6; k++) add(q, box(0.008, 0.008, 0.002, M.cip), 0.03 + (k % 3) * 0.014, 0.05 + (k / 3 | 0) * 0.014, 0.003); }
    { const q = grupa(g, -UW * 0.05, UD * 0.22, zi + 0.016); add(q, cyl(0.009, 0, 0.004, 'z', M.crna, 20)); add(q, cyl(0.0075, 0.004, 0.0072, 'z', M.celik, 20)); dio('baterijaRTC', q); }
    { const q = pcb('sucelnaPloca', -UW * 0.2, -UD * 0.36, UW * 0.5, UD * 0.18, zi + 0.008);
      for (let k = 0; k < 6; k++) add(q, box(0.016, 0.01, 0.008, M.crna), -UW * 0.2 + k * 0.035, -UD * 0.05, 0.005); }
    { const q = grupa(g, -UW * 0.44, -UD / 2 + 0.012, zi + Hk * 0.55); add(q, box(0.04, 0.002, 0.02, M.pcb));
      [M.ledZ, M.ledZ, M.ledY, M.ledR].forEach((m, k) => { const l = add(q, cyl(0.0022, -0.0145, -0.0105, 'y', m, 10), -0.012 + k * 0.008, 0, 0); ledovi.push(l); });
      dio('ledPloca', q); }
    /* --- pogonska kutija (desno) */
    const xp0 = UW * 0.04, xp1 = UW / 2 - 0.006, wP = xp1 - xp0;
    { const q = grupa(g); add(q, box(0.0015, UD - 0.01, Hk - 0.006, M.celikT), xp0, 0, zi + (Hk - 0.006) / 2); add(q, box(wP, UD - 0.01, 0.0015, M.celikT), (xp0 + xp1) / 2, 0, zi + 0.001);
      const hh = Math.min(Hk * 0.36, 0.06), hx = (xp0 + xp1) / 2 - 0.01;
      add(q, box(wP * 0.7, UD * 0.6, 0.006, M.alu), hx, -UD * 0.04, zi + 0.004);
      const nf = Math.round(wP * 0.7 / 0.006); for (let k = 0; k < nf; k++) add(q, box(0.0016, UD * 0.6, hh, M.alu), hx - wP * 0.35 + (k + 0.5) * wP * 0.7 / nf, -UD * 0.04, zi + 0.007 + hh / 2);
      dio('pogonskaKutija', q); }
    { const hh = Math.min(Hk * 0.36, 0.06), hx = (xp0 + xp1) / 2 - 0.01, zt = zi + 0.008 + hh;
      const q = pcb('servoPretvarac', hx, -UD * 0.04, wP * 0.72, UD * 0.6, zt, M.pcbP);
      for (let k = 0; k < 3; k++) add(q, cyl(0.009, 0.002, 0.002 + Math.min(0.03, Hk - hh - 0.03), 'z', M.crna, 16), -wP * 0.25 + k * 0.022, UD * 0.18, 0);
      for (let k = 0; k < 6; k++) add(q, box(0.022, 0.016, 0.006, M.cip), -wP * 0.25 + (k % 3) * 0.03, -0.03 + (k / 3 | 0) * 0.03, 0.005);
      add(q, box(0.03, 0.012, 0.01, M.bijeloP), wP * 0.2, -UD * 0.2, 0.006); }
    { const q = grupa(g, xp1 - 0.016, -UD * 0.05, zi + 0.012); add(q, box(0.016, UD * 0.55, 0.016, M.alu)); for (let k = 0; k < 10; k++) add(q, box(0.022, 0.0016, 0.012, M.alu), 0, -UD * 0.26 + k * UD * 0.055, 0); add(q, box(0.006, 0.01, 0.006, M.bijeloP), 0, UD * 0.29, 0); dio('kocniOtpornik', q); }
    { const q = grupa(g, xp0 + 0.04, UD * 0.36, zi + 0.02); add(q, box(0.05, 0.04, Math.min(0.035, Hk * 0.3), M.celik)); for (let k = 0; k < 4; k++) add(q, box(0.006, 0.008, 0.006, M.zelenoT), -0.018 + k * 0.012, -0.022, 0.0); dio('mrezniFiltar', q); }
    { const q = grupa(g); const rv = Math.min(0.04, Hk * 0.38);
      for (const x of [-UW * 0.22, UW * 0.25]) { const f = grupa(q, x, UD / 2 - 0.016, z0 + Hk / 2); add(f, box(rv * 2.1, 0.022, rv * 2.1, M.crna)); add(f, cyl(rv * 0.92, -0.0115, 0.0115, 'y', M.tamna, 28)); const ro = grupa(f); ro.userData.anim = true; vent.push(ro);
        for (let k = 0; k < 7; k++) { const b = box(rv * 0.78, 0.004, rv * 0.3, M.guma); b.position.set(Math.cos(k * 0.9) * rv * 0.45, 0, Math.sin(k * 0.9) * rv * 0.45); b.rotation.y = -k * 0.9; b.rotation.x = 0.4; ro.add(b); }
        add(ro, cyl(rv * 0.3, -0.012, 0.012, 'y', M.crna, 18)); }
      dio('ventilatorUpravljaca', q); }
    /* --- priključci na prednjoj ploči */
    const fz = (u) => z0 + Hk * u, fy = -UD / 2 - 0.0005;
    const naPrednjoj = (id, x, u, gr) => { const q = grupa(g, x, fy, fz(u)); gr(q); dio(id, q); return q; };
    naPrednjoj('usbSd', -UW * 0.07, 0.72, (q) => { add(q, box(0.026, 0.004, 0.004, M.crna)); add(q, box(0.014, 0.004, 0.007, M.celik), 0.02, 0, 0); add(q, box(0.014, 0.004, 0.007, M.celik), 0.036, 0, 0); });
    naPrednjoj('sabirnickaSucelja', UW * 0.02, 0.38, (q) => { for (let k = 0; k < 4; k++) { add(q, box(0.016, 0.006, 0.014, M.celik), k * 0.019, 0, 0); add(q, box(0.011, 0.007, 0.007, M.crna), k * 0.019, 0, -0.001); } });
    naPrednjoj('sigurnosnoSucelje', UW * 0.02, 0.75, (q) => { add(q, box(0.05, 0.008, 0.016, M.crna)); for (let k = 0; k < 10; k++) add(q, cyl(0.0008, -0.0045, -0.003, 'y', M.zlato, 6), -0.02 + k * 0.0045, 0, 0.003); add(q, cyl(0.0075, -0.012, 0, 'y', M.celikT, 18), 0.042, 0, 0); });
    naPrednjoj('xd12', UW * 0.17, 0.75, (q) => { add(q, box(0.05, 0.012, 0.012, M.zelenoT)); for (let k = 0; k < 8; k++) add(q, box(0.003, 0.013, 0.004, M.crna), -0.021 + k * 0.006, 0, 0.003); add(q, box(0.016, 0.01, 0.012, M.crna), 0.0, 0, -0.024); });
    naPrednjoj('prikljucciMotora', UW * 0.33, 0.45, (q) => { for (let k = 0; k < 2; k++) { add(q, box(0.04, 0.006, 0.03, M.celikT), k * 0.05, 0, 0); add(q, box(0.032, 0.03, 0.024, M.crna), k * 0.05, -0.016, 0); } });
    naPrednjoj('mrezniPrikljucak', UW * 0.17, 0.35, (q) => { add(q, box(0.028, 0.006, 0.02, M.crna)); add(q, box(0.02, 0.008, 0.012, M.celikT), 0, -0.001, 0); add(q, box(0.012, 0.008, 0.02, M.crvenoT), -0.024, 0, 0); });
    /* nazivi u dijelu „upravljac” (cijeli sklop) */
    dio('upravljac', g);
    prednjaU = (x, u) => { const p = new THREE.Vector3(x, fy - 0.03, fz(u)); p.applyAxisAngle(V3(0, 0, 1), PI / 2); return [p.x + UX, p.y + UY, p.z]; };
  }

  /* ============================================================ PRIVJESAK smartPAD */
  let privjesak = null;
  if (O.privjesak) {
    const [PW, PH, PD] = PRIVJESAK.mjere, d0 = PD * 0.55;
    privjesak = new THREE.Group(); privjesak.name = 'privjesak'; privjesak.userData.anim = true;
    const nosac = grupa(robot, O.upravljac ? UX + 0.02 : -0.45, O.upravljac ? UY - UW / 2 - 0.17 : 0.35, 0); nosac.userData.anim = true; nosac.name = 'privjesakNosac';
    nosac.add(privjesak);
    /* lokalno: x desno, y gore, z prema korisniku; stoji na donjem rubu, nagnut unatrag */
    const mB = new THREE.Matrix4().makeBasis(V3(0, 1, 0), V3(0, 0, 1), V3(1, 0, 0));
    privjesak.quaternion.setFromRotationMatrix(mB).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -0.32));
    privjesak.position.set(0, 0, PH / 2 * Math.cos(0.32) + 0.004);
    const tijelo = grupa(privjesak);
    add(tijelo, izvuci(zaobljeni(PW - 0.016, PH - 0.016, 0.03), -d0 / 2, d0 / 2, 'z', M.privjesak, { t: 0.008, s: 0.008, seg: 3 }, 10));
    for (const s of [-1, 1]) add(tijelo, izvuci(zaobljeni(0.05, PH * 0.72, 0.022), -PD / 2, -d0 / 2 + 0.006, 'z', M.privjesak, { t: 0.008, s: 0.006, seg: 3 }, 10), s * (PW / 2 - 0.034), -0.01, 0);
    add(tijelo, izvuci(zaobljeni(PW - 0.03, PH - 0.03, 0.022), d0 / 2 - 0.001, d0 / 2 + 0.0018, 'z', M.privjesakS, null, 10));
    dio('privjesak', privjesak);
    const zF = d0 / 2 + 0.0018;
    /* zaslon: naš pojednostavljeni smartHMI */
    const zw = 0.19, zh = 0.143, zx = 0.002, zy = -0.012;
    const tex = platno(760, 572, (c, w, h) => {
      c.fillStyle = '#eef1f3'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#3c4650'; c.fillRect(0, 0, w, 54);
      const ikone = [['S', '#2ecc71'], ['I', '#2ecc71'], ['R', '#f5c518'], ['T1', '#ffffff'], ['100 %', '#ffffff'], ['Tool[1]', '#ffffff'], ['Base[0]', '#ffffff']];
      c.font = 'bold 22px sans-serif'; let x = 14; ikone.forEach(([t, b]) => { const tw = c.measureText(t).width + 18; c.fillStyle = '#56616b'; c.fillRect(x, 10, tw, 34); c.fillStyle = b; c.fillText(t, x + 9, 35); x += tw + 8; });
      c.fillStyle = '#ffffff'; c.fillRect(14, 70, 470, h - 140); c.strokeStyle = '#c4ccd2'; c.strokeRect(14, 70, 470, h - 140);
      c.fillStyle = '#2f3a44'; c.font = '20px monospace';
      ['1  DEF Montaza()', '2  INI', '3  PTP HOME Vel=100 % DEFAULT', '4  WAIT FOR $IN[1]', '5  PTP P1 Vel=100 % PDAT1', '6  LIN P2 Vel=0.2 m/s CPDAT1', '7  $OUT[7]=TRUE', '8  LIN P1 Vel=0.5 m/s CPDAT2', '9  PTP HOME Vel=100 % DEFAULT', '10 END'].forEach((t, k) => {
        if (k === 4) { c.fillStyle = '#ffe9a8'; c.fillRect(16, 84 + k * 36, 466, 32); c.fillStyle = '#2f3a44'; } c.fillText(t, 24, 108 + k * 36); });
      c.fillStyle = '#dfe5ea'; c.fillRect(500, 70, w - 514, h - 140);
      c.fillStyle = '#2f3a44'; c.font = 'bold 20px sans-serif'; c.fillText('Osi', 516, 100);
      c.font = '20px sans-serif'; ['A1   0,0°', 'A2  −90,0°', 'A3   90,0°', 'A4   0,0°', 'A5   90,0°', 'A6   0,0°'].forEach((t, k) => c.fillText(t, 516, 140 + k * 40));
      c.fillStyle = '#3c4650'; c.fillRect(0, h - 56, w, 56); c.fillStyle = '#ffffff'; c.font = '20px sans-serif'; c.fillText('Pomoćna točka  ·  Točka  ·  Promijeni  ·  Gibanje  ·  Logika', 18, h - 20);
    });
    const zas = new THREE.Mesh(new THREE.PlaneGeometry(zw, zh), tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : M.staklo);
    zas.position.set(zx, zy, zF + 0.0006); zas.userData.vlastitiMat = true; privjesak.add(zas);
    add(privjesak, box(zw + 0.012, zh + 0.012, 0.0008, M.crna), zx, zy, zF - 0.0001);
    dio('zaslonPrivjeska', zas);
    const tipka = (p, x, y, w, h, m, d = 0.003) => add(p, izvuci(zaobljeni(w, h, Math.min(w, h) * 0.3), zF, zF + d, 'z', m, null, 6), x, y, 0);
    const okr = (p, x, y, r, m, d = 0.003, seg = 20) => add(p, cyl(r, zF, zF + d, 'z', m, seg), x, y, 0);
    const yT = PH / 2 - 0.024;
    { const g = grupa(privjesak); okr(g, -PW / 2 + 0.03, yT, 0.0055, M.tipka); okr(g, -PW / 2 + 0.03, yT, 0.0032, M.tipkaS, 0.0038, 16); dio('tipkaOdspajanja', g); }
    { const g = grupa(privjesak); okr(g, -PW / 2 + 0.058, yT, 0.009, M.celikT, 0.004, 24); okr(g, -PW / 2 + 0.058, yT, 0.0065, M.crna, 0.007, 20); add(g, box(0.0016, 0.007, 0.003, M.celik), -PW / 2 + 0.058, yT, zF + 0.0085); add(g, box(0.006, 0.016, 0.0022, M.celik), -PW / 2 + 0.058, yT, zF + 0.0115); dio('kljucnaSklopka', g); }
    { const g = grupa(privjesak, -PW / 2 + 0.098, yT, zF); add(g, cyl(0.0165, 0, 0.004, 'z', M.zuto, 32)); add(g, cyl(0.0085, 0.004, 0.012, 'z', M.crvenoT, 24)); add(g, lathe([[0, 0.012], [0.0128, 0.012], [0.0135, 0.016], [0.011, 0.021], [0, 0.0225]], 'z', M.crveno, 32)); dio('gljivaEstop', g); }
    { const g = grupa(privjesak, -PW / 2 + 0.03, -PH / 2 + 0.036, zF); add(g, cyl(0.016, 0, 0.004, 'z', M.tipka, 32)); add(g, lathe([[0, 0.004], [0.0125, 0.004], [0.0135, 0.008], [0.0125, 0.014], [0.009, 0.0175], [0, 0.0185]], 'z', M.privjesakS, 28)); dio('misa6D', g); }
    { const g = grupa(privjesak); for (let k = 0; k < 4; k++) tipka(g, -PW / 2 + 0.028, 0.058 - k * 0.019, 0.016, 0.013, M.tipka); dio('statusneTipke', g); }
    { const g = grupa(privjesak); tipka(g, -PW / 2 + 0.028, -0.026, 0.018, 0.013, M.tipkaS); dio('tipkaIzbornika', g); }
    { const g = grupa(privjesak); tipka(g, -PW / 2 + 0.028, -0.046, 0.018, 0.013, M.tipka); add(g, box(0.01, 0.0015, 0.0008, M.tipkaS), -PW / 2 + 0.028, -0.046, zF + 0.0034); dio('tipkaTipkovnice', g); }
    { const g = grupa(privjesak); tipka(g, PW / 2 - 0.03, PH / 2 - 0.022, 0.026, 0.012, M.tipka); tipka(g, PW / 2 - 0.03, PH / 2 - 0.038, 0.026, 0.012, M.tipka); dio('tipkeOverride', g); }
    { const g = grupa(privjesak); const n = PRIVJESAK.tipkeGibanja, y0 = PH / 2 - 0.058, dy = Math.min(0.0165, 0.13 / n);
      for (let k = 0; k < n; k++) { tipka(g, PW / 2 - 0.042, y0 - k * dy, 0.014, dy * 0.75, M.tipka); tipka(g, PW / 2 - 0.022, y0 - k * dy, 0.014, dy * 0.75, M.tipka);
        add(g, box(0.006, 0.0012, 0.0008, M.tipkaS), PW / 2 - 0.042, y0 - k * dy, zF + 0.0034); add(g, box(0.006, 0.0012, 0.0008, M.tipkaS), PW / 2 - 0.022, y0 - k * dy, zF + 0.0034); add(g, box(0.0012, 0.006, 0.0008, M.tipkaS), PW / 2 - 0.022, y0 - k * dy, zF + 0.0034); }
      dio('tipkeGibanja', g); }
    const yB = -PH / 2 + 0.02;
    { const g = grupa(privjesak); tipka(g, PW / 2 - 0.075, yB, 0.022, 0.014, M.tipka); const s = new THREE.Shape(); s.moveTo(0.003, -0.004); s.lineTo(0.003, 0.004); s.lineTo(-0.004, 0); s.closePath(); add(g, izvuci(s, zF + 0.003, zF + 0.0038, 'z', M.zelenoT, null, 2), PW / 2 - 0.075, yB, 0); dio('tipkaStartNazad', g); }
    { const g = grupa(privjesak); tipka(g, PW / 2 - 0.05, yB, 0.022, 0.014, M.tipka); const s = new THREE.Shape(); s.moveTo(-0.003, -0.004); s.lineTo(-0.003, 0.004); s.lineTo(0.004, 0); s.closePath(); add(g, izvuci(s, zF + 0.003, zF + 0.0038, 'z', M.zelenoT, null, 2), PW / 2 - 0.05, yB, 0); dio('tipkaStart', g); }
    { const g = grupa(privjesak); tipka(g, PW / 2 - 0.025, yB, 0.022, 0.014, M.tipka); add(g, box(0.006, 0.006, 0.0008, M.crveno), PW / 2 - 0.025, yB, zF + 0.0034); dio('tipkaStop', g); }
    /* stražnja strana */
    const zS = -PD / 2;
    { const g = grupa(privjesak); const n = PRIVJESAK.omogucavajuci;
      const pol = n >= 4 ? [[-1, 0.02], [1, 0.02], [-0.45, -0.07], [0.45, -0.07]] : [[-1, 0.0], [1, 0.0], [0, -0.07]];
      pol.forEach(([s, y]) => { if (Math.abs(s) === 1) add(g, izvuci(zaobljeni(0.016, 0.085, 0.006), zS - 0.006, zS + 0.002, 'z', M.tipkaS, null, 6), s * (PW / 2 - 0.034), y, 0); else add(g, izvuci(zaobljeni(0.07, 0.014, 0.006), -d0 / 2 - 0.006, -d0 / 2 + 0.002, 'z', M.tipkaS, null, 6), s * PW * 0.3, y, 0); });
      dio('omogucavajuci', g); }
    { const g = grupa(privjesak, 0, PH / 2 - 0.04, -d0 / 2 - 0.0085); add(g, cyl(0.009, 0, 0.004, 'z', M.tipka, 20)); add(g, cyl(0.007, -0.002, 0.0, 'z', M.zelenoT, 20)); g.rotation.x = PI; dio('startStraga', g); }
    { const g = grupa(privjesak, 0.05, PH / 2 - 0.035, -d0 / 2 - 0.0085); add(g, box(0.018, 0.012, 0.004, M.crna)); add(g, box(0.012, 0.0045, 0.0042, M.celik)); dio('usbPrivjeska', g); }
  }

  /* ============================================================ KABELI (robot ↔ upravljač, Ethernet, zrak, smartPAD) */
  const kabeli = new THREE.Group(); kabeli.name = 'kabeli'; robot.add(kabeli);
  if (O.kabeli) {
    const xo = xL - 0.04, zz = 0.011;
    const cilj = (x, u) => (prednjaU ? prednjaU(x, u) : [UX + 0.2, UY - 0.1, 0.05]);
    const mk = cilj(UW * 0.33, 0.45), pk = cilj(UW * 0.38, 0.45);
    dio('motorniKabel', cijev(kabeli, [[xL - 0.03, -0.032, 0.088], [xo - 0.03, -0.034, 0.07], [xo - 0.06, -0.02, zz + 0.01], [xo - 0.12, 0.06, zz], [(xo + mk[0]) / 2, (mk[1]) * 0.6, zz], [mk[0] + 0.06, mk[1] - 0.02, zz], [mk[0] + 0.01, mk[1], mk[2] - 0.02], [mk[0] - 0.02, mk[1], mk[2]]], 0.0105, M.kabel, 90, 12));
    dio('podatkovniKabel', cijev(kabeli, [[xL - 0.03, 0.024, 0.098], [xo - 0.02, 0.026, 0.08], [xo - 0.05, 0.03, zz + 0.01], [xo - 0.1, 0.1, zz], [(xo + pk[0]) / 2, pk[1] * 0.62 + 0.03, zz], [pk[0] + 0.06, pk[1] + 0.03, zz], [pk[0] + 0.01, pk[1] + 0.05, pk[2] - 0.02], [pk[0] - 0.02, pk[1] + 0.05, pk[2]]], 0.0075, M.kabel, 90, 10));
    dio('kabelPROFINET', cijev(kabeli, [[xL - 0.025, 0.022, 0.05], [xo - 0.01, 0.03, 0.03], [xo - 0.03, 0.0, zz - 0.005], [xo - 0.2, -0.25, zz - 0.006], [xo - 0.42, -0.36, zz - 0.006]], 0.0035, M.zeleno, 60, 8));
    dio('air1', cijev(kabeli, [[xL - 0.012, -0.05, 0.04], [xo, -0.055, 0.03], [xo - 0.02, -0.08, zz - 0.007], [xo - 0.2, -0.3, zz - 0.007], [xo - 0.4, -0.4, zz - 0.007]], 0.003, M.plavaS, 60, 6));
    if (privjesak && prednjaU) {
      const sp = cilj(UW * 0.4, 0.75);
      const n0 = privjesak.parent.position;
      const kp = cijev(kabeli, [[n0.x - 0.012, n0.y, 0.012], [n0.x - 0.03, n0.y + 0.01, 0.006], [n0.x + 0.06, n0.y + 0.06, 0.005], [sp[0] + 0.08, sp[1] - 0.02, 0.006], [sp[0] + 0.04, sp[1], sp[2] - 0.02], [sp[0] + 0.01, sp[1], sp[2]], [sp[0] - 0.02, sp[1], sp[2]]], 0.0045, M.kabel, 70, 8);
      dio('kabelPrivjeska', kp);
    }
  }
  if (!dijelovi.has('kabelPrivjeska')) { const m = kugla(0.003, M.kabel, 6); m.visible = false; m.userData.skriven = true; kabeli.add(m); dio('kabelPrivjeska', m); }
  ['motorniKabel', 'podatkovniKabel', 'kabelPROFINET'].forEach((id) => { if (!dijelovi.has(id)) { const m = kugla(0.003, M.kabel, 6); m.visible = false; m.userData.skriven = true; kabeli.add(m); dio(id, m); } });

  /* ============================================================ PRIBOR: uređaj za otpuštanje kočnica, EMD */
  const pribor = [];
  if (O.pribor) {
    const g = grupa(robot, UX + 0.06, UY + UW / 2 + 0.13, 0); g.rotation.z = 0.4; g.userData.anim = true;
    add(g, izvuci(zaobljeni(0.13, 0.085, 0.01), 0, 0.05, 'z', M.zuto, { t: 0.003, s: 0.003, seg: 2 }, 6));
    add(g, cyl(0.011, 0.05, 0.056, 'z', M.crna, 20), -0.03, 0, 0); add(g, box(0.003, 0.016, 0.006, M.celik), -0.03, 0, 0.059);
    add(g, cyl(0.012, 0.05, 0.054, 'z', M.tamna, 24), 0.03, 0, 0); add(g, cyl(0.0085, 0.054, 0.062, 'z', M.zelenoT, 20), 0.03, 0, 0);
    cijev(g, [[-0.065, 0, 0.02], [-0.11, 0.02, 0.01], [-0.16, 0.0, 0.006], [-0.22, -0.06, 0.006]], 0.005, M.kabel, 30, 8);
    dio('uredajOtpustanjaKocnica', g); pribor.push(g);
    const e = grupa(robot, UX + 0.24, UY + UW / 2 + 0.1, 0); e.rotation.z = -0.3; e.userData.anim = true;
    const e1 = grupa(e, 0, 0, 0.012); e1.rotation.y = PI / 2;
    add(e1, cyl(0.012, -0.03, 0.03, 'z', M.antracitS, 24)); add(e1, cyl(0.009, 0.03, 0.04, 'z', M.celik, 6)); add(e1, cyl(0.002, 0.04, 0.046, 'z', M.celik, 10)); add(e1, cyl(0.0125, -0.018, -0.012, 'z', M.orange, 24));
    cijev(e, [[-0.03, 0, 0.012], [-0.07, 0.03, 0.006], [-0.12, 0.02, 0.005], [-0.17, -0.04, 0.005]], 0.003, M.kabel, 30, 6);
    dio('emd', e); pribor.push(e);
  }

  /* ============================================================ cijeli robot (za isticanje i odabir) */
  /* „robot” = ruka s podnožjem (bez upravljača, privjeska, kabela i pribora); userData.dio se ne postavlja, pa odabir mišem daje najdublji dio */
  dijelovi.set('robot', { naziv: NAZIV.get('robot'), objekti: [pod, suc, razmak[0], U0, ...dijelovi.get('vijciTemelja').objekti, ...dijelovi.get('natpisnaPlocica').objekti, ...dijelovi.get('umjeravanjeA1').objekti] });

  /* ============================================================ POMOĆNI PRIKAZI */
  const osiG = [], okviriG = [];
  const linMat = (c) => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true });
  const duz = [0.16, 0.16, 0.13, 0.12, 0.09, 0.08];
  for (let i = 0; i < 6; i++) {
    const a = osOsi[i].clone(), Lh = duz[i];
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.clone().multiplyScalar(-Lh), a.clone().multiplyScalar(Lh)]), linMat(0xf2a51a));
    l.renderOrder = 20; l.visible = false; l.raycast = () => {}; razmak[i].add(l); osiG.push(l);
    const vrh = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 12), new THREE.MeshBasicMaterial({ color: 0xf2a51a, depthTest: false, transparent: true }));
    vrh.position.copy(a.clone().multiplyScalar(Lh)); vrh.quaternion.setFromUnitVectors(V3(0, 1, 0), a); vrh.renderOrder = 21; vrh.raycast = () => {}; l.add(vrh);
  }
  /* DH okviri: stalni pomak DH okvira i u okviru članka i (računa se iz FK pri q = 0) */
  function dodajOkvire() {
    postaviKute([0, 0, 0, 0, 0, 0]);
    const inv = new THREE.Matrix4().copy(robot.matrixWorld).invert();
    const fk = KIN.fk([0, 0, 0, 0, 0, 0]);
    const mDH = (T) => new THREE.Matrix4().set(...T);
    for (let i = 0; i <= 6; i++) {
      const ah = new THREE.AxesHelper(i === 6 ? 0.07 : 0.06); ah.material.depthTest = false; ah.material.transparent = true; ah.renderOrder = 22; ah.visible = false; ah.raycast = () => {};
      if (i === 0) robot.add(ah);
      else {
        const Lw = new THREE.Matrix4().multiplyMatrices(inv, osi[i - 1].matrixWorld);   /* članak i u KS robota */
        const rel = new THREE.Matrix4().copy(Lw).invert().multiply(mDH(fk.okviri[i]));
        rel.decompose(ah.position, ah.quaternion, ah.scale); osi[i - 1].add(ah);
      }
      okviriG.push(ah);
    }
    const at = new THREE.AxesHelper(0.05); at.material.depthTest = false; at.material.transparent = true; at.renderOrder = 22; at.visible = false; at.raycast = () => {}; tcp.add(at); okviriG.push(at);
  }
  /* radni prostor: granice putanje točke zapešća u ravnini ruke (rotira se s A1) i doseg na podlozi */
  const radniG = new THREE.Group(); radniG.visible = false; radniG.raycast = () => {}; L0.add(radniG);
  const radniPod = new THREE.Group(); radniPod.visible = false; robot.add(radniPod);
  {
    const tz2 = (a2, a3) => { const w = KIN.fk([0, a2, a3, 0, 0, 0]).tockaZapesca; return V3(w[0], 0, w[2]); };
    const lin = (f, n = 90) => { const pts = []; for (let k = 0; k <= n; k++) pts.push(f(k / n)); return pts; };
    const o1 = OSI[1], o2 = OSI[2];
    const krivulje = [
      lin((u) => tz2(o1.min + (o1.max - o1.min) * u, KUT_ISPRUZENE)),
      lin((u) => tz2(o1.min, o2.min + (o2.max - o2.min) * u)), lin((u) => tz2(o1.max, o2.min + (o2.max - o2.min) * u)),
      lin((u) => tz2(o1.min + (o1.max - o1.min) * u, o2.min)), lin((u) => tz2(o1.min + (o1.max - o1.min) * u, o2.max))
    ];
    krivulje.forEach((pts, k) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), linMat(k ? 0x19b7c9 : 0xf2a51a)); l.renderOrder = 19; radniG.add(l); });
    const luk = krivulje[0].filter((p) => p.x >= -1e-6).map((p) => new THREE.Vector2(p.x, p.z));
    const plast = new THREE.Mesh(A.orient(new THREE.LatheGeometry(luk, 64, PI / 2 + OSI[0].min, OSI[0].max - OSI[0].min), 'z'), new THREE.MeshBasicMaterial({ color: 0x19b7c9, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
    plast.raycast = () => {}; radniPod.add(plast);
    const kr = []; for (let k = 0; k <= 120; k++) { const a = OSI[0].min + (OSI[0].max - OSI[0].min) * k / 120; kr.push(V3(Mj.doseg * Math.cos(-a), Mj.doseg * Math.sin(-a), 0.002)); }
    kr.push(V3(0, 0, 0.002)); kr.unshift(V3(0, 0, 0.002));
    const lk = new THREE.Line(new THREE.BufferGeometry().setFromPoints(kr), linMat(0xf2a51a)); lk.renderOrder = 19; radniPod.add(lk);
  }
  const pomocni = {
    osi(v) { osiG.forEach((l) => { l.visible = !!v; }); },
    okviriDH(v) { okviriG.forEach((a) => { a.visible = !!v; }); dijelovi.get('tcp').objekti.forEach((o) => { o.visible = !!v; }); },
    radniProstor(v) { radniG.visible = !!v; radniPod.visible = !!v; }
  };

  /* ============================================================ STANJE, postavi, rastavi, unutrašnjost, isticanje */
  const q = [0, 0, 0, 0, 0, 0];
  const faktor = POGON.faktorPrikaza || 40;
  function postaviKute(qn) {
    for (let i = 0; i < 6; i++) {
      const v = Number(qn && qn[i]) || 0; q[i] = v;
      osi[i].quaternion.setFromAxisAngle(osOsi[i], v);
      if (POG[i]) POG[i].vrti.forEach((g) => { g.rotation.z = (v * faktor) % (2 * PI); });
    }
    korijen.updateMatrixWorld(true);
  }
  function postavi(qn) { postaviKute(qn); if (snop.mesh) obnoviSnop(); }

  const st = { unutra: false, os: [0, 0, 0, 0, 0, 0], rastav: 0, istaknuto: null };
  const LJ_OSI = [['okretniStup', 'podnozje'], ['okretniStup', 'nadlaktica'], ['nadlaktica', 'ruka'], ['ruka'], ['zapesce', 'kucisteA6'], ['kucisteA6']];
  const SVE_LJ = ['podnozje', 'okretniStup', 'nadlaktica', 'ruka', 'zapesce', 'kucisteA6'];
  let sviMeshevi = [];
  const hiC = new Map(), duhC = new Map(), prozC = new Map();
  const klon = (cache, m, f) => { let c = cache.get(m.uuid); if (!c) { c = m.clone(); f(c); cache.set(m.uuid, c); } return c; };
  const privremenoVidljivi = [];
  function primijeni() {
    /* vidljivost posuda unutrašnjosti */
    unutra.forEach(({ g, os }) => { g.visible = st.unutra || (os >= 0 && st.os[os] > 0); });
    privremenoVidljivi.splice(0).forEach((o) => { o.visible = false; });
    const prozIds = new Set(); if (st.unutra) SVE_LJ.forEach((x) => prozIds.add(x)); st.os.forEach((t, i) => { if (t > 0) LJ_OSI[i].forEach((x) => prozIds.add(x)); });
    const prozirni = new Set(); prozIds.forEach((id) => (dijelovi.get(id)?.objekti || []).forEach((o) => o.traverse((c) => { if (c.isMesh) prozirni.add(c); })));
    let odabrani = null;
    if (st.istaknuto && dijelovi.has(st.istaknuto)) {
      odabrani = new Set();
      dijelovi.get(st.istaknuto).objekti.forEach((o) => {
        o.traverse((c) => { if (c.isMesh) odabrani.add(c); });
        /* skriveni dio ili dio u skrivenoj posudi: privremeno vidljiv */
        let p = o; while (p && p !== korijen) { if (!p.visible && (p.userData.unutra || p.userData.skriven)) { p.visible = true; privremenoVidljivi.push(p); } p = p.parent; }
        o.traverse((c) => { if (!c.visible && c.userData.skriven) { c.visible = true; privremenoVidljivi.push(c); } });
      });
    }
    sviMeshevi.forEach((o) => {
      const m0 = o.userData.m0; if (!m0) return;
      let m = m0;
      if (odabrani) {
        if (odabrani.has(o)) m = (o.userData.led || m0.userData.led) ? m0 : klon(hiC, m0, (c) => { if (c.emissive) { c.emissive = new THREE.Color(0x19b7c9); c.emissiveIntensity = 0.45; } c.transparent = false; c.opacity = 1; c.depthWrite = true; });
        else m = klon(duhC, m0, (c) => { c.transparent = true; c.opacity = 0.1; c.depthWrite = false; if (c.emissive) c.emissive.setHex(0); });
      } else if (prozirni.has(o)) m = klon(prozC, m0, (c) => { c.transparent = true; c.opacity = 0.2; c.depthWrite = false; });
      o.material = m; o.userData.prozirno = prozirni.has(o);
    });
  }
  function istakni(id) { st.istaknuto = id && dijelovi.has(id) ? id : null; primijeni(); }
  function unutrasnjost(v) { st.unutra = !!v; primijeni(); }
  function rastaviOs(i, t) {
    const S = POG[i]; t = Math.max(0, Math.min(1, Number(t) || 0)); if (i < 0 || i > 5) return;
    st.os[i] = t;
    if (S) { const korak = S.L * 0.42 * t; S.dijeloviU.forEach((d) => { d.g.position.z = d.z0 + korak * d.raz; }); }
    primijeni(); korijen.updateMatrixWorld(true);
  }
  /* rastavljanje cijelog robota: članci se razmaknu duž lanca */
  const RAST = [[0, 0, 0.16], [0, -0.13, 0], [0, 0.12, 0], [0.12, 0, 0], [0.07, 0, 0], [0.06, 0, 0]];
  const suc0 = suc.position.clone();
  function rastavi(t) {
    t = Math.max(0, Math.min(1, Number(t) || 0)); st.rastav = t;
    razmak.forEach((r, i) => { r.position.set(razmak0[i].x + RAST[i][0] * t, razmak0[i].y + RAST[i][1] * t, razmak0[i].z + RAST[i][2] * t); });
    suc.position.set(suc0.x - 0.12 * t, suc0.y, suc0.z);
    alati4.forEach((a) => { if (a.parent === flange) a.position.z = hf + 0.07 * t; });
    korijen.updateMatrixWorld(true); if (snop.mesh) obnoviSnop();
  }
  /* vremenski učinci: ventilatori upravljača, LED-ice */
  function azuriraj(tS) {
    const tt = tS == null ? (typeof performance !== 'undefined' ? performance.now() / 1000 : 0) : Number(tS);
    vent.forEach((v, k) => { v.rotation.y = tt * (14 + k * 3); });
    ledovi.forEach((l, k) => { l.visible = k < 2 ? true : (k === 2 ? (tt % 1) < 0.5 : false); });
  }

  /* ------------------------------------------------------------ završetak gradnje */
  dodajOkvire();
  postaviAlat(Math.min(O.alat, alati4.length));
  if (O.spoji !== false) spojiStaticno(THREE, korijen);
  sviMeshevi = []; korijen.traverse((o) => { if (o.isMesh && !(o.material && o.material.isMeshBasicMaterial && o.material.depthTest === false)) { o.userData.m0 = o.material; sviMeshevi.push(o); } });
  /* alati u spremištu su također u korijenu (spremište je u robotu) */
  postavi([0, -PI / 2, PI / 2, 0, PI / 2, 0]);
  azuriraj(0);
  primijeni();

  return {
    korijen, osi, osOsi, postavi, flange, tcp, postaviAlat, dijelovi, istakni, rastavi, rastaviOs, unutrasnjost,
    upravljac, privjesak: privjesak || new THREE.Group(), kabeli, pomocni, azuriraj,
    /* dodatno (izvan ugovora) */
    robot, q, M, spremiste, pribor, alati: alati4, otvoriPrihvatnicu, stanje: st, get aktivniAlat() { return aktivniAlat; }
  };
}
