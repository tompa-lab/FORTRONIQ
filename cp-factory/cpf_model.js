/* FORTRONIQ · Pametna tvornica CP Factory (Rel. B) — parametarski 3D model linije RASS – BRANCH – ASRS32, CP-COBOT-M i rasporeda prostora.
   Naš crtež prema fotografijama laboratorija (bez vanjskih modela, tekstura, natpisa i logotipa). Sve mjere i inačice iz cpf_podaci.js.
   Robote NE gradi: KUKA (../robot-kuka-kr6-r900/kuka_model.js), UR3e (../kobot-ur3e/ur3e_model.js) i Robotino sa stanicom
   (../mobilni-robot-robotino/robotino_model.js) stranica uvozi i stavlja na točke nosacRobota / sidra (vidi API_NAPOMENE.md).
   Jedinice: METRI. Scena: Y gore, pod y = 0. KS linije (tlocrt): x uz liniju, y prema stražnjoj strani, z gore → scena (x, z, −y).
   Model ne pokreće vlastitu petlju; trake se pomiču iz azuriraj(t).
   © ForTroniQ d.o.o. */
import { KONFIG, MJERE, DIJELOVI } from './cpf_podaci.js';

const NAZIV = new Map(DIJELOVI.map((d) => [d.id, d.naziv]));
const PI = Math.PI;
const ZT = MJERE.traka.visina, ZP = MJERE.paluba, HO = MJERE.ormar.visina, TW = MJERE.traka.sirina;
const BOJE_IZRATKA = { crna: 0x2a2c2f, siva: 0x9aa0a5, plava: 0x2f63b8, crvena: 0xc8322b };

/* ====================================================================== zajednički alati */
function alati(THREE, dijelovi) {
  const imaDoc = typeof document !== 'undefined';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.08 }, o));
  const led = (c, i = 1.5) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.35 });
  const M = {
    okvir: mat(0xa3a8ad, { roughness: 0.5 }), ormar: mat(0xc2c6c9, { roughness: 0.5 }), ploca: mat(0xbcc0c3, { roughness: 0.45 }),
    paluba: mat(0xb7bbbe, { roughness: 0.5 }), kuciste: mat(0xd9dbd8, { roughness: 0.45 }), kucisteT: mat(0xc9ccc9, { roughness: 0.5 }),
    alu: mat(0xc7ccd0, { metalness: 0.35, roughness: 0.38 }), aluT: mat(0x9aa2a8, { metalness: 0.35, roughness: 0.42 }), celik: mat(0x8d959b, { metalness: 0.4, roughness: 0.4 }),
    crno: mat(0x1a1c1e, { roughness: 0.65 }), tamno: mat(0x2e3337, { roughness: 0.6 }), tamnoSivo: mat(0x3a3f44, { roughness: 0.5 }),
    bijelo: mat(0xf1f2f2, { roughness: 0.5 }), zuto: mat(0xf2c21a, { roughness: 0.45 }), crveno: mat(0xd4261c, { roughness: 0.4 }),
    zeleno: mat(0x2fa04f, { roughness: 0.4 }), plavo: mat(0x2f6fc8, { roughness: 0.4 }), narancasto: mat(0xe8742a, { roughness: 0.5 }),
    tirkiz: mat(0x1d8d93, { roughness: 0.6 }), tirkizT: mat(0x16767b, { roughness: 0.65 }), pcb: mat(0x1f6e3c, { roughness: 0.55 }),
    plcB: mat(0xd8dbdb, { roughness: 0.5 }), plcT: mat(0x41474c, { roughness: 0.5 }), ventil: mat(0x5c7f99, { roughness: 0.45 }), montaza: mat(0xb3b8bb, { metalness: 0.3, roughness: 0.45 }),
    kabel: mat(0x202326, { roughness: 0.8 }), kabelZ: mat(0x3a8f4a, { roughness: 0.7 }), guma: mat(0x1c1e20, { roughness: 0.9 }),
    nosac: mat(0x2b2e31, { roughness: 0.6 }), paleta: mat(0xbfc5c9, { metalness: 0.45, roughness: 0.35 }),
    stol: mat(0xeceeed, { roughness: 0.6 }), ekran: mat(0x0f1317, { roughness: 0.25, metalness: 0.2 }),
    kompresor: mat(0xc4c9cc, { metalness: 0.55, roughness: 0.3 }), pod: mat(0xd6d8d5, { roughness: 0.92 }),
    oznaka: mat(0xe2b21b, { roughness: 0.7 }), oznakaT: mat(0x19b7c9, { roughness: 0.7 }),
    /* prozirno */
    dim: mat(0x262b30, { transparent: true, opacity: 0.72, roughness: 0.12, metalness: 0.15, depthWrite: false }),
    dimS: mat(0x30373d, { transparent: true, opacity: 0.6, roughness: 0.12, metalness: 0.15, depthWrite: false }),
    staklo: mat(0xd2dee6, { transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    stakloA: mat(0x262e35, { transparent: true, opacity: 0.66, roughness: 0.08, metalness: 0.15, depthWrite: false }),
    cijevOs: mat(0xdfe8ee, { transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }),
    /* svjetla */
    ledZ: led(0x23d16a, 1.6), ledB: led(0xffffff, 0.9), ledP: led(0x3d8bff, 1.6), kupola: mat(0xf7f7f5, { roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.15 })
  };
  ['ledZ', 'ledB', 'ledP'].forEach((k) => { M[k].toneMapped = false; });
  const JK = new THREE.BoxGeometry(1, 1, 1);
  /* kvadar zadan rasponima u KS tlocrta (x, y, z) unutar grupe p (scena: x, z, −y) */
  function K(p, x0, x1, y0, y1, z0, z1, m) {
    const me = new THREE.Mesh(JK, m);
    me.scale.set(Math.max(1e-4, Math.abs(x1 - x0)), Math.max(1e-4, Math.abs(z1 - z0)), Math.max(1e-4, Math.abs(y1 - y0)));
    me.position.set((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2); if (p) p.add(me); return me;
  }
  /* kvadar oko središta (x, y), dimenzije a (x) × b (y), z0..z1 */
  const Kc = (p, x, y, a, b, z0, z1, m) => K(p, x - a / 2, x + a / 2, y - b / 2, y + b / 2, z0, z1, m);
  function cylV(p, r, x, y, z0, z1, m, seg = 16, rt) { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt ?? r, r, Math.abs(z1 - z0), seg), m); me.position.set(x, (z0 + z1) / 2, -y); if (p) p.add(me); return me; }
  function cylX(p, r, x0, x1, y, z, m, seg = 16) { const g = new THREE.CylinderGeometry(r, r, Math.abs(x1 - x0), seg); g.rotateZ(PI / 2); const me = new THREE.Mesh(g, m); me.position.set((x0 + x1) / 2, z, -y); if (p) p.add(me); return me; }
  function cylY(p, r, x, y0, y1, z, m, seg = 16) { const g = new THREE.CylinderGeometry(r, r, Math.abs(y1 - y0), seg); g.rotateX(PI / 2); const me = new THREE.Mesh(g, m); me.position.set(x, z, -(y0 + y1) / 2); if (p) p.add(me); return me; }
  function grupa(p, x = 0, y = 0, z = 0, ime) { const g = new THREE.Group(); g.position.set(x, z, -y); if (ime) g.name = ime; if (p) p.add(g); return g; }
  /* oblik u ravnini tlocrta (x, y), izvučen po z od z0 do z1 */
  const MP = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
  function izvuciP(p, shape, z0, z1, m, o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, Object.assign({ depth: Math.abs(z1 - z0), bevelEnabled: false, curveSegments: 24 }, o));
    g.applyMatrix4(MP); g.translate(0, Math.min(z0, z1), 0); const me = new THREE.Mesh(g, m); if (p) p.add(me); return me;
  }
  function luk(r0, r1, a0, a1, cx = 0, cy = 0) { const s = new THREE.Shape(); s.absarc(cx, cy, r1, a0, a1, a1 < a0); s.absarc(cx, cy, r0, a1, a0, a1 > a0); s.closePath(); return s; }
  function zaobljeni(w, h, r, cx = 0, cy = 0, Klasa = THREE.Shape) {
    const s = new Klasa(), x = cx - w / 2, y = cy - h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function cijev(p, tocke, r, m, seg = 24, rs = 6) { const k = new THREE.CatmullRomCurve3(tocke.map(([x, y, z]) => new THREE.Vector3(x, z, -y))); const me = new THREE.Mesh(new THREE.TubeGeometry(k, seg, r, rs, false), m); if (p) p.add(me); return me; }
  /* ravni element na plohi: strana 'p' (lice prema −y), 's' (+y), 'l' (−x), 'd' (+x); (x, y, z) = točka na plohi */
  const ROT = { p: 0, s: PI, l: -PI / 2, d: PI / 2 };
  function naPlohi(p, geo, m, x, y, z, strana, odmak = 0.0015) {
    const me = new THREE.Mesh(geo, m); const n = { p: [0, -1], s: [0, 1], l: [-1, 0], d: [1, 0] }[strana];
    me.position.set(x + n[0] * odmak, z, -(y + n[1] * odmak)); me.rotation.y = ROT[strana]; if (p) p.add(me); return me;
  }
  /* naljepnica upozorenja: jednostavan žuti trokut s tamnim rubom (bez simbola i teksta) */
  const trokut = (a) => { const s = new THREE.Shape(); s.moveTo(-a / 2, -a * 0.433); s.lineTo(a / 2, -a * 0.433); s.lineTo(0, a * 0.433); s.closePath(); return new THREE.ShapeGeometry(s); };
  const TR_C = trokut(0.07), TR_Z = trokut(0.058);
  function naljepnica(p, x, y, z, strana) { return [naPlohi(p, TR_C, M.crno, x, y, z, strana, 0.0012), naPlohi(p, TR_Z, M.zuto, x, y, z - 0.001, strana, 0.002)]; }
  const OVAL = new THREE.CircleGeometry(0.5, 28);
  function oval(p, x, y, z, strana, a, b, m) { const o = naPlohi(p, OVAL, m || M.tamno, x, y, z, strana); o.scale.set(a, b, 1); return o; }
  function platno(w, h, crtaj) {
    if (!imaDoc) return null;
    try { const c = document.createElement('canvas'); c.width = w; c.height = h; crtaj(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; } catch (e) { return null; }
  }
  function dio(id, ...obj) {
    let d = dijelovi.get(id); if (!d) { d = { naziv: NAZIV.get(id) || id, objekti: [] }; dijelovi.set(id, d); }
    obj.flat(Infinity).forEach((o) => { if (o) { if (!d.objekti.includes(o)) d.objekti.push(o); o.userData.dio = id; } });
    return obj.flat(Infinity)[0];
  }
  /* doda objekte dijelu (isticanje cijelog sklopa) bez promjene userData.dio */
  function dodaj(id, ...obj) { const d = dijelovi.get(id); if (d) obj.flat(Infinity).forEach((o) => { if (o && !d.objekti.includes(o)) d.objekti.push(o); }); }
  /* tekstura remena (pomiče se u azuriraj) */
  const remenSlika = platno(64, 16, (g, w, h) => { g.fillStyle = '#2b2e31'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3e42'; for (let i = 0; i < 4; i++) g.fillRect(i * 16, 0, 5, h); });
  const remeni = [];
  function remenMat(L, smjer) {
    const m = M.tamno.clone(); m.color.setHex(0x2e3134);
    if (remenSlika) { const t = remenSlika.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, L / 0.064), 1); m.map = t; m.color.setHex(0xffffff); }
    remeni.push({ m, smjer, L }); return m;
  }
  /* zaslon HMI-ja: jednostavno sučelje bez teksta */
  const hmiTex = platno(128, 80, (g, w, h) => {
    g.fillStyle = '#e8ecef'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f4f7a'; g.fillRect(0, 0, w, 12);
    g.fillStyle = '#c9d1d8'; g.fillRect(6, 18, 70, 54); g.fillStyle = '#9fb0bd'; for (let i = 0; i < 4; i++) g.fillRect(10, 22 + i * 12, 62, 7);
    g.fillStyle = '#2fa04f'; g.fillRect(84, 18, 38, 16); g.fillStyle = '#d0d6da'; g.fillRect(84, 38, 38, 14); g.fillRect(84, 56, 38, 14);
  });
  M.hmi = hmiTex ? new THREE.MeshBasicMaterial({ map: hmiTex }) : mat(0x6f8ea8, { emissive: 0x24384a, emissiveIntensity: 0.5 });
  M.hmi.userData = { svijetli: true };
  return { THREE, M, K, Kc, cylV, cylX, cylY, grupa, izvuciP, luk, zaobljeni, cijev, naPlohi, naljepnica, oval, platno, dio, dodaj, remenMat, remeni, imaDoc };
}

/* spajanje nepomičnih meshova istog materijala (manje poziva iscrtavanja) — kao u modelu Robotina */
function spojiStaticno(THREE, root) {
  root.updateMatrixWorld(true);
  const granica = (o) => o === root || !!(o.userData.dio || o.userData.anim || o.userData.nespajaj);
  const zadrzi = (c) => c.userData.dio || c.userData.vlastitiMat || c.userData.nespajaj || c.isInstancedMesh || c.children.length || !c.visible;
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


/* drugi korak spajanja: sestrinski meshovi istog dijela i istog materijala (npr. dio(id, [mesh, mesh, …])) spajaju se u jedan mesh tog dijela */
function spojiDijelove(THREE, root, dijelovi) {
  root.updateMatrixWorld(true);
  const moze = (c) => c.isMesh && c.userData.dio && !c.isInstancedMesh && !c.children.length && !c.userData.anim && !c.userData.vlastitiMat && !c.userData.nespajaj && !c.userData.led && c.visible && !Array.isArray(c.material);
  const cvorovi = []; root.traverse((o) => { if (o.children && o.children.length > 1) cvorovi.push(o); });
  cvorovi.forEach((N) => {
    const grupe = new Map();
    N.children.forEach((c) => { if (moze(c)) { const k = c.userData.dio + '|' + c.material.uuid; if (!grupe.has(k)) grupe.set(k, []); grupe.get(k).push(c); } });
    grupe.forEach((lista) => {
      if (lista.length < 2) return;
      let n = 0; const geos = lista.map((c) => { c.updateMatrix(); const geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone(); geo.applyMatrix4(c.matrix); n += geo.attributes.position.count; return geo; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
      geos.forEach((geo) => { pos.set(geo.attributes.position.array, o * 3); if (geo.attributes.normal) nor.set(geo.attributes.normal.array, o * 3); o += geo.attributes.position.count; geo.dispose(); });
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); mg.computeBoundingSphere();
      const id = lista[0].userData.dio, m = new THREE.Mesh(mg, lista[0].material); m.userData.dio = id;
      lista.forEach((c) => N.remove(c)); N.add(m);
      const d = dijelovi.get(id); if (d) { d.objekti = d.objekti.filter((x) => !lista.includes(x)); d.objekti.push(m); }
    });
  });
}

/* ====================================================================== putevi nosača (KS tlocrta linije) */
/** Putevi se računaju iz MJERE i KONFIG.raspored. Segment: { tip:'l', a:[x,y], b:[x,y], L } | { tip:'a', c:[x,y], r, k0, k1, L } (kut se mijenja od k0 do k1). */
export function putevi() {
  const R = KONFIG.raspored, T = MJERE.traka, r = T.povratR;
  const yF = R.rass.y - T.razmak / 2, yB = R.rass.y + T.razmak / 2, yM = (yF + yB) / 2;
  const xL = R.rass.x - MJERE.modul.sirina / 2 + r, xR = R.asrs.x + MJERE.modul.sirina / 2 - r;
  const l = (a, b) => ({ tip: 'l', a, b, L: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  const a = (c, rr, k0, k1) => ({ tip: 'a', c, r: rr, k0, k1, L: Math.abs(k1 - k0) * rr });
  const sastavi = (ime, seg, zatvoren, opis) => { let s = 0; seg.forEach((g) => { g.s0 = s; s += g.L; }); return { ime, segmenti: seg, L: s, zatvoren, opis }; };
  const petlja = sastavi('petlja', [
    l([xR, yF], [xL, yF]), a([xL, yM], r, -PI / 2, -3 * PI / 2), l([xL, yB], [xR, yB]), a([xR, yM], r, PI / 2, -PI / 2)
  ], true, 'Glavna petlja: prednja traka od ASRS-a prema RASS-u, povrat kod RASS-a, stražnja traka prema ASRS-u, povrat kod ASRS-a. s = 0 na početku prednje trake (desni kraj).');
  /* bypass RASS-a: sa stražnje trake na treću traku i natrag */
  const B = MJERE.rass.bypass, x0r = R.rass.x - MJERE.modul.sirina / 2;
  const by = sastavi('bypassRASS', [
    l([x0r + B.x0 - B.prijelaz, yB], [x0r + B.x0, B.y]), l([x0r + B.x0, B.y], [x0r + B.x1, B.y]), l([x0r + B.x1, B.y], [x0r + B.x1 + B.prijelaz, yB])
  ], false, 'Treća traka RASS-a: skretanje sa stražnje trake, radni položaj robota, povratak na stražnju traku.');
  /* krak BRANCH-a: s prednje trake van (traka 3), preusmjerivač, natrag (traka 4) */
  const Kk = MJERE.branch.krak, rot = KONFIG.raspored.branch.kut === 180 ? -1 : 1;
  const xc = R.branch.x + rot * Kk.x, rk = Kk.razmak / 2;
  const yEnd = R.branch.y - MJERE.modul.dubina / 2 - Kk.izbacaj;
  const xOut = xc + rk, xIn = xc - rk;                       // traka teče u −x: prvo se nailazi na veći x
  const krak = sastavi('krakBRANCH', [
    l([xOut, yF], [xOut, yEnd + rk]), a([xc, yEnd + rk], rk, 0, -PI), l([xIn, yEnd + rk], [xIn, yF])
  ], false, 'Krak grananja: traka 3 van, preusmjerivač na kraju (mjesto predaje Robotinu), traka 4 natrag na prednju traku.');
  const sNa = (x) => xR - x;                                  // s na prednjoj traci (segment 0 petlje) za zadani x
  const sNaB = (x) => petlja.segmenti[2].s0 + (x - xL);       // s na stražnjoj traci
  const spojevi = {
    bypassRASS: { izlaz: sNaB(by.segmenti[0].a[0]), ulaz: sNaB(by.segmenti[2].b[0]) },
    krakBRANCH: { izlaz: sNa(xOut), ulaz: sNa(xIn) }
  };
  return { petlja, bypassRASS: by, krakBRANCH: krak, spojevi, yF, yB, xL, xR, yEnd, sNa, sNaB };
}
/** točka na putu: { x, y, z, kut } (kut = smjer vožnje u tlocrtu, rad od osi x) */
export function tockaPuta(put, s) {
  let u = Number(s) || 0;
  if (put.zatvoren) u = ((u % put.L) + put.L) % put.L; else u = Math.max(0, Math.min(put.L, u));
  let g = put.segmenti[put.segmenti.length - 1];
  for (const q of put.segmenti) { if (u <= q.s0 + q.L + 1e-12) { g = q; break; } }
  const t = g.L > 0 ? (u - g.s0) / g.L : 0;
  if (g.tip === 'l') return { x: g.a[0] + (g.b[0] - g.a[0]) * t, y: g.a[1] + (g.b[1] - g.a[1]) * t, z: ZT, kut: Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0]) };
  const k = g.k0 + (g.k1 - g.k0) * t, sm = Math.sign(g.k1 - g.k0);
  return { x: g.c[0] + g.r * Math.cos(k), y: g.c[1] + g.r * Math.sin(k), z: ZT, kut: k + sm * PI / 2 };
}

/* ====================================================================== nosač, paleta, kutija */
function gradiPaletu(A, o = {}) {
  const { THREE, M, K, Kc, izvuciP, zaobljeni } = A, P = MJERE.paleta, I = MJERE.izradak;
  const g = new THREE.Group(); g.name = 'paleta';
  K(g, -P.duljina / 2, P.duljina / 2, -P.sirina / 2, P.sirina / 2, 0, P.visina, M.paleta);
  Kc(g, 0, 0, 0.122, 0.072, P.visina, P.visina + 0.003, M.aluT);           // gnijezdo
  if (o.izradak) {
    const m = A.M['iz_' + o.izradak] || (A.M['iz_' + o.izradak] = A.M.ormar.clone()); m.color.setHex(BOJE_IZRATKA[o.izradak] ?? 0x2a2c2f);
    const iz = izvuciP(g, zaobljeni(I.duljina, I.sirina, 0.01), P.visina + 0.001, P.visina + 0.001 + I.visina, m, { curveSegments: 4 }); iz.name = 'izradak';
    if (o.pcb) Kc(g, 0, 0, 0.098, 0.052, P.visina + I.visina + 0.001, P.visina + I.visina + 0.0026, M.pcb).name = 'pcb';
  }
  return g;
}
function gradiNosac(A, o = {}) {
  const { THREE, M, K, Kc, cylV } = A, N = MJERE.nosac;
  const g = new THREE.Group(); g.name = 'nosac';
  const L = N.duljina, W = N.sirina, H = N.visina;
  K(g, -L / 2, L / 2, -W / 2, W / 2, 0, H * 0.6, M.nosac);
  K(g, -L / 2, L / 2, -W / 2, -W / 2 + 0.012, H * 0.6, H, M.nosac); K(g, -L / 2, L / 2, W / 2 - 0.012, W / 2, H * 0.6, H, M.nosac);
  K(g, -L / 2, -L / 2 + 0.012, -W / 2, W / 2, H * 0.6, H, M.nosac); K(g, L / 2 - 0.012, L / 2, -W / 2, W / 2, H * 0.6, H, M.nosac);
  for (let k = 0; k < 4; k++) cylV(g, 0.0035, -0.03 + k * 0.02, -W / 2 + 0.006, H, H + 0.0008, M.alu, 8);   // 4-bitni kod (vijci)
  Kc(g, L / 2 - 0.03, 0, 0.022, 0.022, H, H + 0.001, M.bijelo);           // RFID tag
  if (o.paleta !== false) { const p = gradiPaletu(A, o); p.position.y = H; g.add(p); }
  return g;
}
function gradiKutiju(A, o = {}) {
  const { THREE, M, K, Kc } = A, B = MJERE.kutija;
  const g = new THREE.Group(); g.name = 'kutija';
  const a = o.uzduz === 'y' ? B.sirina : B.duljina, b = o.uzduz === 'y' ? B.duljina : B.sirina, h = B.visina, t = 0.006;
  K(g, -a / 2, a / 2, -b / 2, b / 2, 0, 0.008, M.tirkiz);
  K(g, -a / 2, a / 2, -b / 2, -b / 2 + t, 0, h, M.tirkiz); K(g, -a / 2, a / 2, b / 2 - t, b / 2, 0, h, M.tirkiz);
  K(g, -a / 2, -a / 2 + t, -b / 2, b / 2, 0, h, M.tirkiz); K(g, a / 2 - t, a / 2, -b / 2, b / 2, 0, h, M.tirkiz);
  K(g, -a / 2 - 0.004, a / 2 + 0.004, -b / 2 - 0.004, b / 2 + 0.004, h - 0.012, h, M.tirkizT);     // obod
  K(g, -a / 2 + 0.03, a / 2 - 0.03, -b / 2 + 0.03, b / 2 - 0.03, 0.008, 0.03, M.tamno);              // umetak
  const lab = o.uzduz === 'y' ? [a / 2 + 0.0035, 0] : [0, -b / 2 - 0.0035];
  if (o.uzduz === 'y') K(g, lab[0] - 0.001, lab[0], -0.08, 0.08, h * 0.25, h * 0.7, M.bijelo); else K(g, -0.08, 0.08, lab[1], lab[1] + 0.001, h * 0.25, h * 0.7, M.bijelo);
  if (o.sadrzaj === 'pcb') { for (const sx of [-1, 1]) for (const sy of [-1, 1]) Kc(g, sx * a * 0.22, sy * b * 0.22, o.uzduz === 'y' ? 0.055 : 0.1, o.uzduz === 'y' ? 0.1 : 0.055, 0.03, 0.033, M.pcb); }
  if (o.sadrzaj === 'poklopci') { for (let i = 0; i < 4; i++) for (const sy of [-1, 1]) Kc(g, -a * 0.33 + i * a * 0.22, sy * b * 0.2, 0.06, 0.11, 0.03, 0.04, i % 2 ? M.crveno : M.tamnoSivo); }
  return g;
}
export function napraviPaletu(THREE, o = {}) { return gradiPaletu(alati(THREE, new Map()), o); }
export function napraviNosac(THREE, o = {}) { return gradiNosac(alati(THREE, new Map()), o); }
export function napraviKutiju(THREE, o = {}) { return gradiKutiju(alati(THREE, new Map()), o); }

/* ====================================================================== zajednički elementi modula */
/** jedno krilo/par krila zatamnjenih vrata na plohi. strana 'p'|'s' (a = raspon x, ravnina = y) ili 'l'|'d' (a = raspon y, ravnina = x) */
function vrata(A, p, strana, a0, a1, z0, z1, ravnina, o = {}) {
  const { M, K, naljepnica } = A, out = [], n = (strana === 'p' || strana === 'l') ? -1 : 1, t0 = ravnina + n * 0.002, t1 = ravnina + n * 0.008;
  const kr = o.krila ?? 2, w = (a1 - a0) / kr;
  const B = (u0, u1, v0, v1, m, d0 = t0, d1 = t1) => (strana === 'p' || strana === 's') ? K(p, u0, u1, Math.min(d0, d1), Math.max(d0, d1), v0, v1, m) : K(p, Math.min(d0, d1), Math.max(d0, d1), u0, u1, v0, v1, m);
  for (let k = 0; k < kr; k++) {
    const u0 = a0 + k * w + 0.004, u1 = a0 + (k + 1) * w - 0.004;
    out.push(B(u0, u1, z0, z1, M.dim));
    const vanjski = k === 0 ? u0 : u1, unutra = k === 0 ? u1 : u0, sv = k === 0 ? 1 : -1;
    for (const zz of [z0 + 0.05, z1 - 0.07]) out.push(B(vanjski - (sv < 0 ? 0.03 : 0), vanjski + (sv > 0 ? 0.03 : 0), zz, zz + 0.05, M.crno, t0, t1 + n * 0.012));
    out.push(B(unutra - 0.015, unutra + 0.015, z0 + 0.02, z0 + 0.05, M.crno, t0, t1 + n * 0.006));             // brava
    if (o.naljepnice !== false) {
      const um = (u0 + u1) / 2 + (k === 0 ? -1 : 1) * 0.06, zm = z1 - (z1 - z0) * 0.28;
      const st = strana; const xx = (st === 'p' || st === 's') ? um : t1, yy = (st === 'p' || st === 's') ? t1 : um;
      out.push(naljepnica(p, xx, yy, zm, st));
    }
  }
  return out.flat();
}
/** postolje (ormar) modula: okvir, plinta s kotačima, paluba; vraća { okvir:[], plinta:[] } */
function ormarOkvir(A, p, x0, x1, y0, y1, H, o = {}) {
  const { M, K, cylV } = A, f = MJERE.ormar.okvir, pl = MJERE.ormar.plinta, out = [];
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) out.push(K(p, x === x0 ? x0 : x1 - f, x === x0 ? x0 + f : x1, y === y0 ? y0 : y1 - f, y === y0 ? y0 + f : y1, pl - 0.03, H, M.okvir));
  if (o.sredina) for (const y of o.sredina) { out.push(K(p, x0, x0 + f, y - f / 2, y + f / 2, pl - 0.03, H, M.okvir)); out.push(K(p, x1 - f, x1, y - f / 2, y + f / 2, pl - 0.03, H, M.okvir)); }
  /* donji okvir i plinta */
  out.push(K(p, x0, x1, y0, y0 + f, pl - 0.04, pl + 0.05, M.okvir), K(p, x0, x1, y1 - f, y1, pl - 0.04, pl + 0.05, M.okvir));
  out.push(K(p, x0, x0 + f, y0, y1, pl - 0.04, pl + 0.05, M.okvir), K(p, x1 - f, x1, y0, y1, pl - 0.04, pl + 0.05, M.okvir));
  out.push(K(p, x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, pl - 0.03, pl - 0.02, M.okvir));
  /* gornji okvir */
  out.push(K(p, x0, x1, y0, y0 + f, H - 0.03, H, M.okvir), K(p, x0, x1, y1 - f, y1, H - 0.03, H, M.okvir), K(p, x0, x0 + f, y0, y1, H - 0.03, H, M.okvir), K(p, x1 - f, x1, y0, y1, H - 0.03, H, M.okvir));
  const kot = [];
  for (const [x, y] of [[x0 + 0.07, y0 + 0.07], [x1 - 0.07, y0 + 0.07], [x0 + 0.07, y1 - 0.07], [x1 - 0.07, y1 - 0.07]]) {
    kot.push(cylV(p, 0.012, x, y, 0.06, pl - 0.04, M.celik, 10));
    const kg = A.cylX(p, 0.032, x - 0.012, x + 0.012, y + 0.03, 0.032, M.guma, 14); kot.push(kg);
    kot.push(K(p, x - 0.02, x + 0.02, y, y + 0.05, 0.05, 0.07, M.celik));
    kot.push(cylV(p, 0.022, x + 0.045, y - 0.03, 0.0, 0.012, M.crno, 12), cylV(p, 0.007, x + 0.045, y - 0.03, 0.012, pl - 0.04, M.celik, 8));   // nožica
  }
  return { okvir: out, kotaci: kot };
}
/** kosa upravljačka ploča na rubu y0 (prednja ploha modula). Vraća { ploca, hmi, nuzni, sklopka, manometar } */
function upravljackaPloca(A, p, x0, x1, y0, o = {}) {
  const { THREE, M, K, Kc, cylV, grupa } = A, P = MJERE.ormar.ploca, d = P.dubina, nag = P.nagib * PI / 180;
  const z0 = HO - 0.02;
  /* prednja ploha ispod ploče */
  const lice = K(p, x0 + 0.01, x1 - 0.01, y0, y0 + 0.012, HO - 0.12, z0 + 0.005, M.ploca);
  const g = grupa(p, 0, y0, z0); g.rotation.x = nag;                                      /* lokalno: x uz rub, −z scene = prema natrag, y = normala */
  const L = (u0, u1, v0, v1, w0, w1, m) => K(g, u0, u1, v0, v1, w0, w1, m);              // v = udaljenost od prednjeg ruba (u KS tlocrta grupe: y)
  const plo = [lice, L(x0 + 0.01, x1 - 0.01, 0, d, -0.03, 0, M.ploca), K(p, x0 + 0.01, x1 - 0.01, y0 + d * Math.cos(nag) - 0.01, y0 + d * Math.cos(nag) + 0.03, z0, z0 + d * Math.sin(nag) + 0.002, M.ploca)];
  const xs = x0 + 0.1, xh = x0 + (x1 - x0) * 0.66;
  /* glavna sklopka */
  const skl = [cylV(g, 0.03, xs, 0.055, 0, 0.012, M.crno, 20), Kc(g, xs, 0.055, 0.012, 0.05, 0.012, 0.03, M.crno)];
  /* manometar */
  const man = o.manometar ? [cylV(g, 0.022, xs, 0.14, 0, 0.012, M.crno, 20), cylV(g, 0.018, xs, 0.14, 0.012, 0.014, M.bijelo, 20)] : [];
  /* polja za natpise */
  for (let k = 0; k < 3; k++) plo.push(L(xs + 0.07 + k * 0.115, xs + 0.18 + k * 0.115, 0.06, 0.15, 0, 0.003, M.bijelo));
  /* HMI */
  const hmi = [Kc(g, xh, 0.1, 0.23, 0.165, 0, 0.02, M.tamnoSivo), Kc(g, xh, 0.1, 0.19, 0.115, 0.02, 0.021, M.hmi)];
  /* nužni stop i tipke */
  const xn = xh + 0.19;
  const nuz = [Kc(g, xn, 0.07, 0.07, 0.07, 0, 0.01, M.zuto), cylV(g, 0.012, xn, 0.07, 0.01, 0.035, M.crveno, 16), cylV(g, 0.022, xn, 0.07, 0.035, 0.05, M.crveno, 20)];
  const tip = [cylV(g, 0.012, xn, 0.15, 0, 0.012, M.bijelo, 14), cylV(g, 0.012, xn + 0.05, 0.15, 0, 0.012, M.plavo, 14), cylV(g, 0.012, xn + 0.05, 0.07, 0, 0.012, M.zeleno, 14)];
  return { ploca: [...plo, ...tip], hmi, nuzni: nuz, sklopka: skl, manometar: man, grupa: g };
}
/** montažna ploča u ormaru s PLC-om, preklopnikom, relejima i ventilima (načelni prikaz) */
function opremaOrmara(A, p, xc, yPloca, k, o = {}) {
  const { M, K, Kc, cylV, dio } = A, n = o.n ?? -1;          /* n = smjer prema vratima (−1 = prema −y) */
  const y0 = yPloca, y1 = yPloca + n * 0.012;
  const plo = K(p, xc - 0.5, xc + 0.5, Math.min(y0, y1), Math.max(y0, y1), 0.16, 0.76, M.montaza);
  const D = (y, d) => [Math.min(y, y + n * d), Math.max(y, y + n * d)];
  const yy = (d) => D(y1, d);
  const plc = [];
  /* ET200SP: CPU + uski moduli */
  plc.push(K(p, xc - 0.42, xc - 0.34, ...yy(0.075), 0.58, 0.70, M.plcT));
  for (let i = 0; i < 12; i++) plc.push(K(p, xc - 0.335 + i * 0.016, xc - 0.322 + i * 0.016, ...yy(0.07), 0.585, 0.69, i % 3 ? M.plcB : M.plcT));
  plc.push(K(p, xc - 0.45, xc + 0.45, ...yy(0.02), 0.57, 0.585, M.alu));                      // DIN šina
  dio(k + 'Plc', plc);
  dio(k + 'Preklopnik', [K(p, xc - 0.1, xc - 0.04, ...yy(0.06), 0.59, 0.70, M.plcT), K(p, xc - 0.095, xc - 0.045, ...yy(0.061), 0.67, 0.68, M.ledZ)]);
  /* RFID čvor (u ormaru) */
  const rfid = K(p, xc + 0.02, xc + 0.09, ...yy(0.05), 0.59, 0.71, M.tamnoSivo);
  /* sigurnosni releji (žuto-sivi) i stezaljke */
  const rel = [];
  for (let i = 0; i < (o.releja ?? 2); i++) rel.push(K(p, xc - 0.42 + i * 0.03, xc - 0.397 + i * 0.03, ...yy(0.07), 0.40, 0.50, M.zuto), K(p, xc - 0.42 + i * 0.03, xc - 0.397 + i * 0.03, ...yy(0.071), 0.47, 0.50, M.plcT));
  const stez = [K(p, xc - 0.3, xc + 0.45, ...yy(0.045), 0.40, 0.47, M.plcB), K(p, xc - 0.45, xc + 0.45, ...yy(0.02), 0.39, 0.405, M.alu)];
  /* ventilski otok i priprema zraka */
  const ven = [K(p, xc - 0.1, xc + 0.16, ...yy(0.06), 0.22, 0.29, M.ventil)];
  for (let i = 0; i < 6; i++) ven.push(K(p, xc - 0.09 + i * 0.04, xc - 0.065 + i * 0.04, ...yy(0.085), 0.25, 0.32, M.crno));
  ven.push(K(p, xc + 0.22, xc + 0.29, ...yy(0.06), 0.24, 0.33, M.ventil), cylV(p, 0.02, xc + 0.255, y1 + n * 0.09, 0.18, 0.24, M.cijevOs, 12));
  dio(k + 'Ventili', ven);
  return { ploca: plo, plc, rfid, releji: rel, stezaljke: stez };
}
/** traka (remen 80 mm s bočnim profilima) od (ax, ay) do (bx, by) u grupi p; smjer vožnje +1 = od a prema b */
function traka(A, p, ax, ay, bx, by, o = {}) {
  const { THREE, M, K } = A, L = Math.hypot(bx - ax, by - ay), kut = Math.atan2(by - ay, bx - ax);
  const g = new THREE.Group(); g.position.set(ax, 0, -ay); g.rotation.y = kut; p.add(g);
  const z = o.z ?? ZT, w = o.sirina ?? TW, prod = o.produzi ?? 0;
  const rem = K(g, -prod, L + prod, -w / 2, w / 2, z - 0.012, z, A.remenMat(L, o.smjer ?? 1)); rem.userData.vlastitiMat = true; rem.userData.remen = true;
  const pr = [K(g, -prod, L + prod, -w / 2 - 0.016, -w / 2, z - 0.05, z - 0.002, M.alu), K(g, -prod, L + prod, w / 2, w / 2 + 0.016, z - 0.05, z - 0.002, M.alu)];
  if (o.vodilice !== false) pr.push(K(g, -prod, L + prod, -w / 2 - 0.022, -w / 2 - 0.016, z - 0.02, z + 0.012, M.alu), K(g, -prod, L + prod, w / 2 + 0.016, w / 2 + 0.022, z - 0.02, z + 0.012, M.alu));
  if (o.nosaci !== false) for (let s = 0.08; s < L - 0.04; s += 0.3) pr.push(K(g, s - 0.015, s + 0.015, -w / 2, w / 2, o.zDno ?? ZP, z - 0.05, M.aluT));
  return { grupa: g, remen: rem, profili: pr };
}
/** povrat (polukrug) — remen u luku i vanjska vodilica */
function povrat(A, p, cx, cy, r, k0, k1, o = {}) {
  const { M, izvuciP, luk } = A, w = TW, z = o.z ?? ZT;
  const out = [izvuciP(p, luk(r - w / 2, r + w / 2, k0, k1, cx, cy), z - 0.012, z, M.tamno, { curveSegments: 20 }),
    izvuciP(p, luk(r + w / 2, r + w / 2 + 0.018, k0, k1, cx, cy), z - 0.05, z + 0.012, M.alu, { curveSegments: 20 }),
    izvuciP(p, luk(Math.max(0.001, r - w / 2 - 0.016), r - w / 2, k0, k1, cx, cy), z - 0.05, z - 0.002, M.alu, { curveSegments: 20 })];
  out.push(A.K(p, cx - 0.03, cx + 0.03, cy - 0.03, cy + 0.03, o.zDno ?? ZP, z - 0.05, M.aluT));
  return out;
}
/** zaustavljač: tijelo uz stazu + klin koji se podiže (userData.anim) */
function zaustavljac(A, p, x, y, os = 'x') {
  const { THREE, M, K, Kc } = A;
  const tij = os === 'x' ? K(p, x - 0.02, x + 0.02, y - 0.03, y + 0.03, ZT - 0.075, ZT - 0.05, M.ventil) : K(p, x - 0.03, x + 0.03, y - 0.02, y + 0.02, ZT - 0.075, ZT - 0.05, M.ventil);
  const klinG = new THREE.Group(); klinG.position.set(x, 0, -y); klinG.userData.anim = true; p.add(klinG);
  const klin = os === 'x' ? Kc(klinG, 0, 0, 0.012, 0.03, ZT - 0.05, ZT + 0.008, M.aluT) : Kc(klinG, 0, 0, 0.03, 0.012, ZT - 0.05, ZT + 0.008, M.aluT);
  return { tijelo: tij, klinG, klin, postavi(gore) { klinG.position.y = gore ? 0 : -0.016; } };
}
/** RFID glava M18 i senzor uz stazu */
function rfidGlava(A, p, x, y) { return [A.cylV(p, 0.009, x, y, ZT - 0.07, ZT - 0.006, A.M.tamnoSivo, 14), A.cylV(p, 0.0095, x, y, ZT - 0.03, ZT - 0.022, A.M.narancasto, 14)]; }
function senzor(A, p, x, y, z = ZT + 0.002) { return [A.Kc(p, x, y, 0.012, 0.03, z - 0.012, z + 0.018, A.M.crno), A.Kc(p, x, y, 0.008, 0.031, z + 0.005, z + 0.01, A.M.ledZ)]; }

/* ====================================================================== ASRS32 */
function gradiASRS(A, o = {}) {
  const { THREE, M, K, Kc, cylV, cylX, cylY, grupa, dio, dodaj, naljepnica } = A, S = MJERE.asrs, W = MJERE.modul.sirina / 2, Dm = MJERE.modul.dubina / 2;
  const g = new THREE.Group(); g.name = 'ASRS32';
  const k = 'asrs';
  /* ormar */
  const orm = ormarOkvir(A, g, -W, W, -Dm, Dm, HO);
  dio(k + 'Ormar', orm.okvir, orm.kotaci, K(g, -W + 0.03, W - 0.03, -Dm + 0.02, -Dm + 0.03, MJERE.ormar.plinta + 0.05, 0.16, M.okvir), K(g, -W + 0.03, W - 0.03, Dm - 0.03, Dm - 0.02, MJERE.ormar.plinta, HO - 0.03, M.ormar),
    K(g, -W, W, -Dm, Dm, HO, ZP, M.paluba));
  const zv = HO - 0.12;
  dio(k + 'VrataOrmara', vrata(A, g, 'p', -W + 0.04, W - 0.04, 0.165, zv, -Dm), vrata(A, g, 'd', -Dm + 0.04, Dm - 0.04, 0.165, zv, W, { krila: 1 }), vrata(A, g, 'l', -Dm + 0.04, Dm - 0.04, 0.165, zv, -W, { krila: 1, naljepnice: false }));
  const up = upravljackaPloca(A, g, -W, W, -Dm, { manometar: true });
  dio(k + 'Ploca', up.ploca); dio(k + 'Hmi', up.hmi); dio(k + 'NuzniStop', up.nuzni); dio(k + 'GlavnaSklopka', up.sklopka); dio('asrsManometar', up.manometar);
  const op = opremaOrmara(A, g, 0, Dm - 0.05, k, { releja: 4 });
  dio(k + 'Rfid', op.rfid); dio('asrsSigurnost', op.releji); dodaj(k + 'Plc', op.stezaljke);
  dio('asrsServo', [K(g, 0.18, 0.25, Dm - 0.12, Dm - 0.062, 0.42, 0.62, M.tamnoSivo), K(g, 0.27, 0.34, Dm - 0.12, Dm - 0.062, 0.42, 0.62, M.tamnoSivo), K(g, 0.19, 0.24, Dm - 0.121, Dm - 0.12, 0.58, 0.6, M.ledZ)]);
  /* trake */
  const yF = -MJERE.traka.razmak / 2, yB = MJERE.traka.razmak / 2;
  const Rk = MJERE.traka.povratR;
  const tF = traka(A, g, W - Rk, yF, -W, yF, { smjer: 1 }), tB = traka(A, g, -W, yB, W - Rk, yB, { smjer: 1 });
  dio(k + 'Trake', tF.grupa, tB.grupa);
  dio('krajLinijeDesno', povrat(A, g, W - Rk, 0, Rk, PI / 2, -PI / 2));
  /* zaustavljači ST1 (prednja traka) i ST2 (stražnja) */
  const xs = S.stoper.x;
  const z1 = zaustavljac(A, g, xs - 0.09, yF), z2 = zaustavljac(A, g, xs + 0.09, yB);
  dio('asrsZaustavljac', z1.tijelo, z2.tijelo); dio('asrsST1', z1.klinG); dio('asrsST2', z2.klinG);
  dodaj('asrsZaustavljac', z1.klinG, z2.klinG);
  dodaj(k + 'Rfid', rfidGlava(A, g, xs, yF + 0.072), rfidGlava(A, g, xs, yB - 0.072));
  dio(k + 'Senzori', senzor(A, g, xs - 0.05, yF - 0.07), senzor(A, g, xs + 0.06, yF - 0.07), senzor(A, g, xs + 0.05, yB + 0.07), senzor(A, g, xs - 0.06, yB + 0.07), senzor(A, g, W - 0.08, yF - 0.07), senzor(A, g, -W + 0.08, yB + 0.07));
  /* kućište */
  const zb = S.kucisteOd, zt = S.visina, f = 0.05;
  const ku = [];
  for (const [x, y] of [[-W, -Dm], [W - f, -Dm], [-W, Dm - f], [W - f, Dm - f]]) ku.push(K(g, x, x + f, y, y + f, zb, zt, M.kuciste));
  ku.push(K(g, -W, W, -Dm, -Dm + f, zb, zb + 0.07, M.kuciste), K(g, -W, W, -Dm, -Dm + f, zt - 0.06, zt, M.kuciste), K(g, -W, W, Dm - f, Dm, zt - 0.06, zt, M.kuciste), K(g, -W, W, Dm - f, Dm, zb, zb + 0.05, M.kuciste));
  ku.push(K(g, -W, -W + f, -Dm, Dm, zt - 0.06, zt, M.kuciste), K(g, W - f, W, -Dm, Dm, zt - 0.06, zt, M.kuciste), K(g, -W, -W + f, -Dm, Dm, zb, zb + 0.05, M.kuciste), K(g, W - f, W, -Dm, Dm, zb, zb + 0.05, M.kuciste));
  ku.push(K(g, -W + 0.02, W - 0.02, -Dm + 0.02, Dm - 0.02, zt - 0.025, zt + 0.004, M.kucisteT));                         // krov
  ku.push(K(g, -W + f, W - f, Dm - 0.012, Dm - 0.006, zb + 0.05, zt - 0.06, M.stakloA));                                // stražnje staklo
  ku.push(K(g, -W + 0.006, -W + 0.012, -Dm + f, Dm - f, zb + 0.05, zt - 0.06, M.stakloA), K(g, W - 0.012, W - 0.006, -Dm + f, Dm - f, zb + 0.05, zt - 0.06, M.stakloA));
  /* ispod kućišta: prednja pregrada iza ploče i bočni „tunel” oko traka */
  ku.push(K(g, -W + 0.02, W - 0.02, -Dm + MJERE.ormar.ploca.dubina, -Dm + MJERE.ormar.ploca.dubina + 0.012, ZP, zb, M.kucisteT));
  for (const x of [-W, W - 0.012]) for (const [a, b] of [[-Dm, yF - 0.075], [yF + 0.075, yB - 0.075], [yB + 0.075, Dm]]) ku.push(K(g, x, x + 0.012, a, b, ZP, zb + 0.05, M.kucisteT));
  dio('asrsKuciste', ku);
  /* prednja staklena vrata */
  const vr = [];
  vr.push(K(g, -0.02, 0.02, -Dm, -Dm + f, zb, zt, M.kuciste));
  for (const [a, b] of [[-W + f, -0.02], [0.02, W - f]]) vr.push(K(g, a, b, -Dm + 0.004, -Dm + 0.012, zb + 0.07, zt - 0.06, M.stakloA));
  for (const x of [-W + 0.01, W - 0.05, -0.02]) for (const z of [zb + 0.1, zt - 0.16]) vr.push(K(g, x, x + 0.04, -Dm - 0.012, -Dm, z, z + 0.07, M.crno));
  dio('asrsVrata', vr);
  /* regali: 4 × 4 sprijeda i straga */
  const Rg = S.regal, rg = { p: [], s: [] }, mjesta = [];
  const xMjesta = (c) => Rg.x0 + c * Rg.dx;
  for (const [st, sy] of [['p', -1], ['s', 1]]) {
    const yc = sy * Rg.y, yo = sy * (Rg.y + 0.07);
    for (let c = 0; c <= Rg.stupaca; c++) { const x = xMjesta(c) - Rg.dx / 2; rg[st].push(K(g, x - 0.006, x + 0.006, yo - 0.006, yo + 0.006, Rg.z0 - 0.05, zt - 0.06, M.aluT)); }
    for (let r = 0; r < Rg.razina; r++) {
      const zr = Rg.z0 + r * Rg.dz;
      rg[st].push(K(g, xMjesta(0) - Rg.dx / 2, xMjesta(Rg.stupaca - 1) + Rg.dx / 2, yo - 0.006, yo + 0.006, zr - 0.024, zr - 0.012, M.aluT));
      for (let c = 0; c < Rg.stupaca; c++) {
        const x = xMjesta(c);
        for (const sx of [-1, 1]) rg[st].push(K(g, x + sx * 0.082, x + sx * 0.07, yc - 0.065, yo, zr - 0.012, zr, M.aluT));
        mjesta.push({ x, y: yc, z: zr, c: st === 'p' ? 0 : PI });
      }
    }
  }
  /* numeracija: 1–16 sprijeda, 17–32 straga; slijeva nadesno (gledano sprijeda) i odozdo prema gore */
  const MJ = [];
  for (const st of [0, 1]) for (let r = 0; r < Rg.razina; r++) for (let c = 0; c < Rg.stupaca; c++) MJ.push(mjesta[st * 16 + r * Rg.stupaca + c]);
  dio('asrsRegalPrednji', rg.p); dio('asrsRegalStraznji', rg.s);
  /* palete na policama (InstancedMesh: paleta + izradak) */
  const P = MJERE.paleta, I = MJERE.izradak;
  const pGeo = new THREE.BoxGeometry(P.duljina, P.visina, P.sirina); pGeo.translate(0, P.visina / 2, 0);
  const iGeo = new THREE.BoxGeometry(I.duljina, I.visina, I.sirina); iGeo.translate(0, P.visina + I.visina / 2 + 0.001, 0);
  const instP = new THREE.InstancedMesh(pGeo, M.paleta, 32), instI = new THREE.InstancedMesh(iGeo, M.bijelo.clone(), 32);
  instI.material.color.setHex(0xffffff);
  g.add(instP, instI);
  const stanjePolica = new Array(32).fill(null);
  const mt = new THREE.Matrix4(), nula = new THREE.Matrix4().makeScale(0, 0, 0), boja = new THREE.Color();
  function postaviPaletu(n, st) {
    const i = n - 1; if (i < 0 || i > 31) return; const m = MJ[i];
    stanjePolica[i] = st ? (typeof st === 'object' ? st : {}) : null;
    if (st) { mt.makeTranslation(m.x, m.z, -m.y); instP.setMatrixAt(i, mt); } else instP.setMatrixAt(i, nula);
    const iz = st && st.izradak; if (iz) { instI.setMatrixAt(i, mt); instI.setColorAt(i, boja.setHex(BOJE_IZRATKA[iz] ?? 0x2a2c2f)); } else instI.setMatrixAt(i, nula);
    instP.instanceMatrix.needsUpdate = true; instI.instanceMatrix.needsUpdate = true; if (instI.instanceColor) instI.instanceColor.needsUpdate = true;
    instP.computeBoundingSphere(); instI.computeBoundingSphere();
  }
  const pocetno = o.police || ((n) => (n <= 12 ? { izradak: ['crna', 'siva', 'plava', 'crvena'][n % 4] } : n <= 20 || (n > 24 && n <= 28) ? {} : null));
  for (let n = 1; n <= 32; n++) postaviPaletu(n, pocetno(n));
  dio('asrsPalete', instP, instI);
  /* portal: stup Z desno straga, konzolna os X, osi C i Y, prihvatnica */
  const Os = S.os, xz = 0.50, yz = 0.33;
  const stup = [K(g, xz - 0.04, xz + 0.04, yz - 0.04, yz + 0.04, ZP, zt + S.stupIznad - 0.02, M.alu), K(g, xz - 0.07, xz + 0.07, yz - 0.11, yz + 0.11, zt, zt + S.stupIznad, M.kuciste), K(g, xz - 0.072, xz + 0.072, yz - 0.112, yz + 0.112, zt + S.stupIznad - 0.012, zt + S.stupIznad, M.kucisteT)];
  dio('asrsOsZ', stup);
  const zG = grupa(g, 0, 0, 0, 'osZ'); zG.userData.anim = true;
  const zK = [K(zG, xz - 0.05, xz + 0.05, yz - 0.09, yz - 0.04, 0.12, 0.25, M.aluT), K(zG, xz - 0.04, xz + 0.04, 0, yz - 0.09, 0.17, 0.215, M.aluT)];
  const servoZ = [cylV(zG, 0.03, xz, yz - 0.18, 0.215, 0.32, M.crno, 18), Kc(zG, xz, yz - 0.18, 0.05, 0.05, 0.3, 0.335, M.tamnoSivo)];
  dodaj('asrsOsZ', zK);
  const greda = [K(zG, Os.xMin - 0.1, xz + 0.04, -0.035, 0.035, 0.17, 0.22, M.alu), K(zG, Os.xMin - 0.1, xz + 0.04, -0.012, 0.012, 0.22, 0.226, M.crno)];
  dio('asrsOsX', greda, servoZ);
  const xG = grupa(zG, 0, 0, 0, 'osX'); xG.userData.anim = true;
  const xK = [K(xG, -0.05, 0.05, -0.05, 0.05, 0.125, 0.17, M.aluT)];
  dodaj('asrsOsX', xK); xK.forEach((m) => { m.userData.dio = 'asrsOsX'; });
  const cG = grupa(xG, 0, 0, 0, 'osC'); cG.userData.anim = true;
  dio('asrsOsC', [cylV(cG, 0.034, 0, 0, 0.1, 0.125, M.tamnoSivo, 20), cylV(cG, 0.04, 0, 0, 0.098, 0.104, M.alu, 20)]);
  const yBody = [K(cG, -0.025, 0.025, -0.31, -0.05, 0.07, 0.098, M.alu), K(cG, -0.027, 0.027, -0.31, -0.29, 0.068, 0.1, M.aluT), K(cG, -0.027, 0.027, -0.07, -0.05, 0.068, 0.1, M.aluT)];
  const yG = grupa(cG, 0, 0, 0, 'osY'); yG.userData.anim = true;
  const yKl = [K(yG, -0.03, 0.03, -0.04, 0.04, 0.062, 0.07, M.aluT)];
  dio('asrsOsY', yBody, yKl);
  const hv = [Kc(yG, 0, 0, 0.07, 0.05, 0.022, 0.062, M.tamnoSivo)];
  const prsti = [];
  for (const sx of [-1, 1]) { const pg = grupa(yG, 0, 0, 0); pg.userData.anim = true; Kc(pg, 0, 0, 0.008, 0.04, -0.004, 0.03, M.aluT); Kc(pg, -sx * 0.02, 0, 0.04, 0.03, 0.022, 0.03, M.aluT); prsti.push({ g: pg, sx }); }
  const bg53 = cylV(yG, 0.004, 0.02, -0.03, 0.01, 0.022, M.crno, 8);
  dio('asrsHvataljka', hv, prsti.map((q) => q.g), bg53);
  const paletaH = gradiPaletu(A, { izradak: 'crna' }); yG.add(paletaH); paletaH.visible = false;
  dodaj('asrsHvataljka', paletaH);
  /* animacija osi */
  const st = { x: Os.xMax, z: Os.zMin, y: 0, c: 0, otvorena: true };
  function postaviOsi(x = st.x, z = st.z, y = st.y, c = st.c) {
    st.x = Math.max(Os.xMin, Math.min(Os.xMax, x)); st.z = Math.max(Os.zMin - 0.01, Math.min(Os.zMax + 0.01, z)); st.y = Math.max(0, Math.min(Os.yHod, y)); st.c = c;
    zG.position.y = st.z; xG.position.x = st.x; cG.rotation.y = st.c; yG.position.z = Os.yOdmak + st.y;
  }
  function hvataljka(otvorena) { st.otvorena = !!otvorena; prsti.forEach((q) => { q.g.position.x = q.sx * (st.otvorena ? 0.1 : MJERE.paleta.duljina / 2 + 0.005); }); }
  function paletaUHvataljci(v, op = {}) {
    paletaH.visible = !!v;
    const iz = paletaH.getObjectByName('izradak'); if (iz) { iz.visible = op.izradak !== null && op.izradak !== false; if (op.izradak && BOJE_IZRATKA[op.izradak] != null) { iz.material = iz.material.clone(); iz.material.color.setHex(BOJE_IZRATKA[op.izradak]); } }
  }
  const zMin = Os.zMin;
  function pozaMjesta(n) { const m = MJ[n - 1]; return m ? { x: m.x, z: m.z, y: Os.yHod, c: m.c } : null; }
  function pozaStopera(kk) { return { x: xs, z: zMin, y: 0, c: kk === 2 ? PI : 0 }; }
  postaviOsi(Os.xMax, Os.zMin + 0.3, 0, 0); hvataljka(true);
  return { grupa: g, postaviOsi, hvataljka, paletaUHvataljci, postaviPaletu, stanjePolica, pozaMjesta, pozaStopera, mjesta: MJ, zaustavljaci: { ST1: z1, ST2: z2 }, osi: { zG, xG, cG, yG }, stanje: st,
    trake: { prednja: tF, straznja: tB } };
}

/* ====================================================================== BRANCH */
function gradiBRANCH(A, o = {}) {
  const { THREE, M, K, Kc, cylV, grupa, dio, dodaj, izvuciP, luk, naljepnica } = A, Bm = MJERE.branch, W = MJERE.modul.sirina / 2, Dm = MJERE.modul.dubina / 2;
  const g = new THREE.Group(); g.name = 'BRANCH'; const k = 'branch';
  /* lokalno: −y = prednja (operaterska) strana s HMI-jem i aplikacijskim modulom; +y = stražnja strana s krakom grananja */
  const orm = ormarOkvir(A, g, -W, W, -Dm, Dm, HO);
  dio(k + 'Ormar', orm.okvir, orm.kotaci, K(g, -W, W, -Dm, Dm, HO, ZP, M.paluba), K(g, -W + 0.03, W - 0.03, -Dm + 0.02, -Dm + 0.03, MJERE.ormar.plinta + 0.05, 0.16, M.okvir));
  const zv = HO - 0.12;
  /* stražnja strana (krak): dva krila + uvučena sredina s ručkom */
  const vs = [...vrata(A, g, 's', -W + 0.04, -0.2, 0.165, zv, Dm, { krila: 1, naljepnice: false }), ...vrata(A, g, 's', 0.2, W - 0.04, 0.165, zv, Dm, { krila: 1, naljepnice: false })];
  vs.push(K(g, -0.2, 0.2, Dm - 0.03, Dm - 0.02, 0.12, HO - 0.03, M.ormar), K(g, -0.13, 0.13, Dm - 0.02, Dm + 0.005, zv - 0.02, zv, M.crno));
  vs.push(K(g, -W + 0.12, -W + 0.17, Dm + 0.008, Dm + 0.01, 0.17, 0.25, M.bijelo), K(g, W - 0.17, W - 0.12, Dm + 0.008, Dm + 0.01, 0.17, 0.25, M.bijelo));
  vs.push(K(g, -W + 0.03, W - 0.03, Dm - 0.012, Dm, zv, HO - 0.03, M.ormar));
  dio(k + 'VrataOrmara', vrata(A, g, 'p', -W + 0.04, W - 0.04, 0.165, zv, -Dm), vs);
  const up = upravljackaPloca(A, g, -W, W, -Dm, {});
  dio(k + 'Ploca', up.ploca); dio(k + 'Hmi', up.hmi); dio(k + 'NuzniStop', up.nuzni); dio(k + 'GlavnaSklopka', up.sklopka);
  const op = opremaOrmara(A, g, 0, 0, k, { releja: 2 });
  dio(k + 'Rfid', op.rfid); dodaj(k + 'Plc', op.releji, op.stezaljke);
  /* glavne trake: lokalno −y = stražnja traka linije (aplikacija), +y = prednja traka linije (krak) */
  const yA = -MJERE.traka.razmak / 2, yK = MJERE.traka.razmak / 2;
  const t1 = traka(A, g, -W, yK, W, yK, { smjer: 1 }), t2 = traka(A, g, W, yA, -W, yA, { smjer: 1 });
  dio(k + 'Trake', t1.grupa, t2.grupa);
  /* krak grananja */
  const Kk = Bm.krak, rk = Kk.razmak / 2, xc = Kk.x, yEnd = Dm + Kk.izbacaj;
  const t3 = traka(A, g, xc - rk, yK, xc - rk, yEnd - rk, { smjer: 1, nosaci: false }), t4 = traka(A, g, xc + rk, yEnd - rk, xc + rk, yK, { smjer: 1, nosaci: false });
  const kr = [t3.grupa, t4.grupa, K(g, xc - rk - 0.06, xc + rk + 0.06, Dm - 0.05, yEnd - rk, ZP - 0.06, ZT - 0.05, M.ormar), K(g, xc - rk - 0.06, xc + rk + 0.06, Dm - 0.05, Dm + 0.02, 0.6, ZP - 0.06, M.ormar)];
  dio('branchKrak', kr);
  dio('branchPetlja', povrat(A, g, xc, yEnd - rk, rk, PI, 0, { zDno: ZT - 0.06 }));
  /* pokrovi pogona traka uz krak (sivi blokovi na fotografiji) */
  dodaj(k + 'Ormar', K(g, -W + 0.03, xc - rk - 0.08, yK + 0.07, Dm - 0.01, ZP, ZT + 0.008, M.ormar), K(g, xc + rk + 0.08, W - 0.03, yK + 0.07, Dm - 0.01, ZP, ZT + 0.008, M.ormar));
  /* bijela prečka na kraju kraka */
  dodaj('branchKrak', K(g, xc - 0.17, xc + 0.17, yEnd + 0.012, yEnd + 0.03, ZT - 0.045, ZT - 0.012, M.bijelo), K(g, xc - 0.16, xc - 0.14, yEnd - 0.04, yEnd + 0.012, ZT - 0.06, ZT - 0.012, M.alu), K(g, xc + 0.14, xc + 0.16, yEnd - 0.04, yEnd + 0.012, ZT - 0.06, ZT - 0.012, M.alu));
  /* skretnica: ruka na zakretnom cilindru (userData.anim) */
  const sk = grupa(g, xc - rk - 0.16, yK - 0.065, 0, 'skretnica'); sk.userData.anim = true;
  const ruka = [K(sk, 0, 0.2, -0.008, 0.008, ZT - 0.004, ZT + 0.022, M.bijelo), cylV(sk, 0.014, 0, 0, ZT - 0.01, ZT + 0.03, M.aluT, 14)];
  const cil = cylV(g, 0.022, xc - rk - 0.16, yK - 0.065, ZP, ZT - 0.01, M.ventil, 16);
  dio('branchSkretnica', sk, cil);
  /* zaustavljači: grananje (prije skretnice), traka 1, traka 4 (mjesto predaje) */
  const zg = zaustavljac(A, g, xc - rk - 0.24, yK), z1 = zaustavljac(A, g, 0.3, yA), z4 = zaustavljac(A, g, xc + rk, yEnd - rk - 0.12, 'y');
  dio(k + 'Zaustavljac', zg.tijelo, zg.klinG, z1.tijelo, z1.klinG);
  dio('branchMjestoPredaje', z4.tijelo, z4.klinG, Kc(g, xc, yEnd - 0.015, 0.05, 0.02, ZT - 0.03, ZT - 0.024, M.oznakaT));
  dodaj(k + 'Rfid', rfidGlava(A, g, xc - rk - 0.3, yK - 0.072), rfidGlava(A, g, 0.36, yA + 0.072));
  dio(k + 'Senzori', senzor(A, g, -W + 0.1, yK + 0.07), senzor(A, g, W - 0.1, yK + 0.07), senzor(A, g, -W + 0.1, yA - 0.07), senzor(A, g, W - 0.1, yA - 0.07));
  dio('branchSenzoriSudara', senzor(A, g, xc - rk - 0.04, yK - 0.075), senzor(A, g, xc + rk + 0.04, yK - 0.075), senzor(A, g, xc - rk - 0.075, yEnd - rk - 0.1));
  /* optički handshake na kraju kraka */
  const hs = grupa(g, xc + rk + 0.1, yEnd - 0.02, 0);
  const hsM = [K(hs, -0.012, 0.012, -0.012, 0.012, ZP - 0.02, ZT + 0.02, M.alu), Kc(hs, 0, 0.005, 0.05, 0.03, ZT + 0.02, ZT + 0.07, M.crno)];
  const hsL = [A.cylY(hs, 0.007, -0.012, 0.02, 0.024, ZT + 0.045, M.ledP, 12), A.cylY(hs, 0.007, 0.012, 0.02, 0.024, ZT + 0.045, M.crveno, 12)];
  dio('branchHandshake', hs); hsL.forEach((m) => { m.userData.led = true; });
  /* kutni prijenosnik (poklopci na krajevima, između traka) */
  dio('branchKutniPrijenosnik', K(g, -W + 0.01, -W + 0.08, yA + 0.06, yK - 0.06, ZP, ZT - 0.01, M.aluT), K(g, W - 0.08, W - 0.01, yA + 0.06, yK - 0.06, ZP, ZT - 0.01, M.aluT));
  /* aplikacijski modul (portal na prednjoj liniji, iznad trake yA) */
  const Ap = Bm.aplikacija, ap = grupa(g, Ap.x, yA, 0, 'aplikacijskiModul');
  const apM = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) apM.push(K(ap, sx * Ap.sirina / 2 - 0.0125, sx * Ap.sirina / 2 + 0.0125, sy * Ap.dubina / 2 - 0.0125, sy * Ap.dubina / 2 + 0.0125, ZP, ZP + Ap.visina, M.alu));
  apM.push(K(ap, -Ap.sirina / 2 - 0.02, Ap.sirina / 2 + 0.02, -Ap.dubina / 2 - 0.02, Ap.dubina / 2 + 0.02, ZP, ZP + 0.012, M.alu));
  for (const z of [ZT + 0.1, ZP + Ap.visina - 0.0125]) for (const sy of [-1, 1]) apM.push(K(ap, -Ap.sirina / 2, Ap.sirina / 2, sy * Ap.dubina / 2 - 0.0125, sy * Ap.dubina / 2 + 0.0125, z - 0.0125, z + 0.0125, M.alu));
  apM.push(K(ap, -0.02, 0.02, -0.02, 0.02, ZT + 0.12, ZP + Ap.visina - 0.03, M.aluT));                    // okomita os
  apM.push(Kc(ap, 0, 0, 0.14, 0.09, ZP + Ap.visina - 0.02, ZP + Ap.visina + 0.06, M.bijelo));           // gornja kutija
  const kup = new THREE.Mesh(new THREE.SphereGeometry(0.035, 18, 10, 0, PI * 2, 0, PI / 2), M.kupola); kup.position.set(0, ZP + Ap.visina + 0.06, 0); ap.add(kup); apM.push(kup);
  apM.push(Kc(ap, 0, 0, 0.08, 0.07, ZT + 0.16, ZT + 0.26, KONFIG.branchModul ? M.plcB : M.ormar));  // generička jedinica
  apM.push(K(ap, -0.012, 0.012, -0.03, 0.03, ZT + 0.12, ZT + 0.16, M.aluT));
  dio('branchAplikacija', ap); ap.userData.napomena = KONFIG.branchModul ? '' : KONFIG.branchModulNapomena;
  function skretnica(t) { sk.rotation.y = Math.max(0, Math.min(1, Number(t) || 0)) * 0.62; }
  skretnica(0);
  return { grupa: g, skretnica, zaustavljaci: { grananje: zg, traka1: z1, traka4: z4 }, nosacAplikacije: ap, handshake: { grupa: hs, svjetla: hsL } };
}

/* ====================================================================== RASS */
function gradiRASS(A, o = {}) {
  const { THREE, M, K, Kc, cylV, cylX, cylY, grupa, dio, dodaj, izvuciP, oval, naljepnica } = A, S = MJERE.rass, W = MJERE.modul.sirina / 2, Dm = MJERE.modul.dubina / 2;
  const g = new THREE.Group(); g.name = 'RASS'; const k = 'rass';
  const Y1 = S.dubina - Dm;                         /* stražnji rub (lokalno, 1,2 m) */
  const P0 = (x, y) => [x - MJERE.modul.sirina / 2, y - Dm];   /* KS tlocrta modula: x od lijevog ruba, y od prednjeg ruba → lokalno */
  /* ormar dvostruke dubine */
  const orm = ormarOkvir(A, g, -W, W, -Dm, Y1, HO, { sredina: [Dm] });
  const ZC = S.ploca, yPl = 0.5;
  dio(k + 'Ormar', orm.okvir, orm.kotaci, K(g, -W, W, -Dm, yPl, HO, ZP, M.paluba), K(g, -W + 0.01, W - 0.01, yPl, Y1 - 0.01, ZC - 0.014, ZC, M.alu), K(g, -W + 0.01, W - 0.01, yPl, yPl + 0.012, ZC, ZP, M.paluba), K(g, -W + 0.03, W - 0.03, -Dm + 0.02, -Dm + 0.03, MJERE.ormar.plinta + 0.05, 0.16, M.okvir));
  const zv = HO - 0.12;
  const vo = [vrata(A, g, 'p', -W + 0.04, W - 0.04, 0.165, zv, -Dm), vrata(A, g, 's', -W + 0.04, W - 0.04, 0.165, 0.68, Y1), vrata(A, g, 'l', -Dm + 0.04, Dm - 0.02, 0.165, zv, -W, { krila: 1, naljepnice: false })];
  /* bokovi robotskog dijela: sivi lim s dva ovalna otvora */
  const bok = [];
  for (const [x, st] of [[-W, 'l'], [W, 'd']]) {
    bok.push(K(g, st === 'l' ? x - 0.004 : x - 0.004, st === 'l' ? x + 0.004 : x + 0.004, Dm + 0.02, Y1 - 0.04, MJERE.ormar.plinta + 0.05, HO - 0.03, M.ormar));
    for (const yy of [Dm + 0.2, Y1 - 0.25]) bok.push(oval(g, x, yy, 0.45, st, 0.2, 0.08, M.tamno));
  }
  dio(k + 'VrataOrmara', vo, bok);
  const up = upravljackaPloca(A, g, -W, W, -Dm, {});
  dio(k + 'Ploca', up.ploca); dio(k + 'Hmi', up.hmi); dio(k + 'NuzniStop', up.nuzni); dio(k + 'GlavnaSklopka', up.sklopka);
  const op = opremaOrmara(A, g, 0, Dm - 0.02, k, { releja: 4 });
  dio(k + 'Rfid', op.rfid); dio('rassSigurnost', op.releji); dodaj(k + 'Plc', op.stezaljke);
  /* upravljač robota u stražnjem ormaru */
  dio('rassUpravljacRobota', [K(g, -0.42, 0.08, Y1 - 0.36, Y1 - 0.1, 0.2, 0.36, M.tamnoSivo), K(g, -0.4, 0.06, Y1 - 0.101, Y1 - 0.098, 0.24, 0.32, M.crno), K(g, -0.38, -0.34, Y1 - 0.1, Y1 - 0.095, 0.3, 0.31, M.ledZ),
    A.cijev(g, [[-0.2, Y1 - 0.36, 0.3], [-0.1, Y1 - 0.5, 0.55], [S.robot.x - W, S.robot.y - Dm, ZC - 0.02]], 0.014, M.kabel)]);
  /* stražnji pojas: otvor za kutije i tipka Box change */
  const To = S.trakaKutije, xo = To.x - W, Ot = S.otvor;
  const po = [K(g, -W + 0.02, xo - Ot.sirina / 2, Y1 - 0.012, Y1, 0.68, Ot.z1, M.ormar), K(g, xo + Ot.sirina / 2, W - 0.02, Y1 - 0.012, Y1, 0.68, Ot.z1, M.ormar), K(g, xo - Ot.sirina / 2, xo + Ot.sirina / 2, Y1 - 0.012, Y1, 0.68, Ot.z0, M.ormar),
    K(g, xo - Ot.sirina / 2 - 0.012, xo + Ot.sirina / 2 + 0.012, Y1 - 0.004, Y1 + 0.004, Ot.z0 - 0.012, Ot.z0, M.crno), K(g, -W + 0.02, W - 0.02, Y1 - 0.012, Y1 + 0.004, Ot.z1, Ot.z1 + 0.025, M.okvir)];
  po.push(cylY(g, 0.016, -0.12, Y1, Y1 + 0.012, 0.95, M.zeleno, 18), K(g, -0.15, -0.09, Y1, Y1 + 0.004, 0.92, 0.98, M.okvir));
  dio('rassOtvorKutije', po);
  /* trake: dvije glavne + bypass s kosim prijelazima */
  const yF = -MJERE.traka.razmak / 2, yB = MJERE.traka.razmak / 2, B = S.bypass;
  const tF = traka(A, g, W, yF, -W + MJERE.traka.povratR, yF, { smjer: 1 }), tB = traka(A, g, -W + MJERE.traka.povratR, yB, W, yB, { smjer: 1 });
  dio(k + 'Trake', tF.grupa, tB.grupa);
  const [bx0] = P0(B.x0, 0), [bx1] = P0(B.x1, 0), yby = B.y - Dm;
  const tb1 = traka(A, g, bx0 - B.prijelaz, yB, bx0, yby, { produzi: 0.03, nosaci: false }), tb2 = traka(A, g, bx0, yby, bx1, yby, {}), tb3 = traka(A, g, bx1, yby, bx1 + B.prijelaz, yB, { produzi: 0.03, nosaci: false });
  dio('rassBypass', tb1.grupa, tb2.grupa, tb3.grupa);
  /* povrat na lijevom kraju linije */
  dio('krajLinijeLijevo', povrat(A, g, -W + MJERE.traka.povratR, 0, MJERE.traka.povratR, -PI / 2, -3 * PI / 2));
  /* zaustavljač na radnom položaju robota + senzori orijentacije */
  const xr = B.radniX - W;
  const zr = zaustavljac(A, g, xr + 0.09, yby), zu = zaustavljac(A, g, 0.3, yF);
  dio(k + 'Zaustavljac', zr.tijelo, zr.klinG, zu.tijelo, zu.klinG);
  dodaj(k + 'Rfid', rfidGlava(A, g, xr, yby - 0.072), rfidGlava(A, g, 0.39, yF - 0.072));
  dio(k + 'Senzori', senzor(A, g, -0.4, yF - 0.07), senzor(A, g, 0.4, yF - 0.07), senzor(A, g, 0.4, yB - 0.07));
  const so = [];
  for (const dx of [-0.05, 0, 0.05]) so.push(Kc(g, xr + dx, yby + 0.075, 0.016, 0.016, ZT - 0.01, ZT + 0.05, M.crno), Kc(g, xr + dx, yby - 0.075, 0.016, 0.016, ZT - 0.01, ZT + 0.05, M.crno));
  dio('rassSenzoriOrijentacije', so);
  /* ćelija: Al-profili, staklo, vrata sprijeda i straga */
  const f = S.profil, yc0 = -Dm + MJERE.ormar.ploca.dubina, zc0 = ZP, zc1 = S.visina, yMid = Dm + 0.1;
  const ce = [];
  for (const x of [-W, W - f]) for (const y of [yc0, yMid - f / 2, Y1 - f]) ce.push(K(g, x, x + f, y, y + f, zc0, zc1, M.alu));
  for (const y of [yc0, Y1 - f]) for (const z of [zc0, zc1 - f]) ce.push(K(g, -W, W, y, y + f, z, z + f, M.alu));
  for (const x of [-W, W - f]) for (const z of [zc0, zc1 - f]) ce.push(K(g, x, x + f, yc0, Y1, z, z + f, M.alu));
  for (const x of [-W, W - f]) ce.push(K(g, x, x + f, yc0, Y1, 1.32, 1.32 + f, M.alu));
  ce.push(K(g, -W + f, W - f, yMid - f / 2, yMid + f / 2, zc1 - f, zc1, M.alu));
  for (const x of [-W + 0.004, W - 0.008]) for (const [a, b] of [[yc0 + f, yMid - f / 2], [yMid + f / 2, Y1 - f]]) ce.push(K(g, x, x + 0.004, a, b, zc0 + f, zc1 - f, M.staklo));
  ce.push(K(g, -W + f, W - f, yc0 + f, Y1 - f, zc1 - 0.006, zc1 - 0.002, M.staklo));
  dio('rassCelija', ce);
  const vc = [];
  for (const [yv, z0] of [[yc0, zc0 + f], [Y1 - f, Ot.z1 + 0.03]]) {
    for (const [a, b] of [[-W + f, -0.006], [0.006, W - f]]) {
      vc.push(K(g, a, b, yv + 0.012, yv + 0.016, z0 + 0.02, zc1 - f - 0.01, M.staklo));
      vc.push(K(g, a, a + 0.025, yv, yv + f, z0, zc1 - f, M.alu), K(g, b - 0.025, b, yv, yv + f, z0, zc1 - f, M.alu), K(g, a, b, yv, yv + f, z0, z0 + 0.025, M.alu), K(g, a, b, yv, yv + f, zc1 - f - 0.025, zc1 - f, M.alu));
      const xh = a < 0 ? b - 0.05 : a + 0.05, ys = yv === yc0 ? yv - 0.012 : yv + f + 0.012;
      vc.push(K(g, xh - 0.008, xh + 0.008, Math.min(yv, ys), Math.max(yv, ys) + (yv === yc0 ? 0 : 0), 1.25, 1.42, M.crno));
    }
  }
  if (S.visina) vc.push(K(g, -W + f, -W + f + 0.03, yc0 - 0.01, yc0, 1.0, 1.06, M.crno), K(g, W - f - 0.03, W - f, yc0 - 0.01, yc0, 1.0, 1.06, M.crno));
  dio('rassVrata', vc);
  /* postolje robota i točka montaže */
  const xR = S.robot.x - W, yR = S.robot.y - Dm, zR = ZC + S.robot.postolje;
  dio('rassPostoljeRobota', Kc(g, xR, yR, 0.32, 0.32, ZC, ZC + 0.012, M.celik), Kc(g, xR, yR, 0.26, 0.26, ZC + 0.012, zR, M.celik));
  const nosacRobota = grupa(g, xR, yR, zR, 'nosacRobota'); nosacRobota.rotation.y = S.robot.kut; nosacRobota.userData.nespajaj = true;
  dio('robotKUKA', nosacRobota);
  if (o.robot) nosacRobota.add(o.robot);
  /* spremište alata TOOL1–TOOL4 */
  const Mg = S.magazin, xm = Mg.x - W, ym = Mg.y - Dm;
  const mag = [K(g, xm - 0.02, xm + 0.02, ym - 0.02, ym + 0.02, ZC, zc1 - f, M.alu)];
  const mjestaAlata = [], alati = [], adapteri = [];
  for (let i = 0; i < Mg.broj; i++) {
    const zz = Mg.z0 + i * Mg.korak;
    mag.push(K(g, xm + 0.02, xm + 0.1, ym - 0.04, ym + 0.04, zz - 0.012, zz, M.crno), K(g, xm + 0.06, xm + 0.1, ym - 0.045, ym - 0.03, zz, zz + 0.02, M.crno), K(g, xm + 0.06, xm + 0.1, ym + 0.03, ym + 0.045, zz, zz + 0.02, M.crno));
    mag.push(Kc(g, xm + 0.03, ym + 0.05, 0.012, 0.012, zz - 0.01, zz + 0.012, M.zuto));
    const mj = grupa(g, xm + 0.08, ym, zz, 'TOOL' + (i + 1)); mj.userData.nespajaj = true; mjestaAlata.push(mj);
    if (o.alati !== false) {
      adapteri.push(cylV(mj, 0.024, 0, 0, 0.0, 0.022, M.aluT, 18));
      if (i === 0) alati.push(cylV(mj, 0.012, 0, 0, -0.06, 0.0, M.alu, 14), cylV(mj, 0.022, 0, 0, -0.075, -0.06, M.crno, 18));
      else alati.push(Kc(mj, 0, 0, 0.04, 0.05, -0.04, 0.0, M.tamnoSivo), Kc(mj, -0.012, 0, 0.008, 0.02, -0.075, -0.04, M.alu), Kc(mj, 0.012, 0, 0.008, 0.02, -0.075, -0.04, M.alu));
    }
  }
  dio('rassMagazin', mag); dio('rassIzmjenjivac', adapteri.length ? adapteri : mjestaAlata); dio('rassPrihvatnice', alati.length ? alati : mjestaAlata);
  /* stezna naprava */
  const Nv = S.naprava, xn = Nv.x - W, yn = Nv.y - Dm;
  const nap = [Kc(g, xn, yn, Nv.a + 0.02, Nv.b + 0.02, ZC, ZP, M.aluT), Kc(g, xn, yn, Nv.a, Nv.b, ZP, ZP + 0.02, M.alu), Kc(g, xn, yn, 0.12, 0.07, ZP + 0.02, ZP + 0.032, M.aluT)];
  for (const [dx, dy] of [[-0.075, -0.05], [0.075, -0.05], [-0.075, 0.05], [0.075, 0.05]]) nap.push(Kc(g, xn + dx, yn + dy, 0.02, 0.02, ZP + 0.02, ZP + 0.055, M.celik));
  nap.push(Kc(g, xn - 0.07, yn, 0.03, 0.03, ZP + 0.02, ZP + 0.04, M.ventil));
  dio('rassNaprava', nap);
  /* kamera s LED reflektorom */
  const Km = S.kamera, xk = Km.x - W, yk = Km.y - Dm;
  const kam = [K(g, xk + 0.12, xk + 0.15, yk - 0.015, yk + 0.015, ZC, Km.z + 0.06, M.alu), K(g, xk - 0.02, xk + 0.15, yk - 0.012, yk + 0.012, Km.z + 0.04, Km.z + 0.06, M.alu),
    Kc(g, xk, yk, 0.05, 0.05, Km.z - 0.04, Km.z + 0.04, M.tamnoSivo), cylV(g, 0.015, xk, yk, Km.z - 0.065, Km.z - 0.04, M.crno, 16), cylV(g, 0.04, xk, yk, Km.z - 0.09, Km.z - 0.08, M.ledB, 24, 0.035)];
  dio('rassKamera', kam);
  /* cijevi za osigurače */
  const Os = S.osiguraci, xf = Os.x - W, yf = Os.y - Dm;
  const osi = [Kc(g, xf, yf, 0.1, 0.05, ZC, ZP + 0.03, M.aluT)];
  for (let i = 0; i < Os.broj; i++) { osi.push(cylV(g, 0.008, xf - 0.03 + i * 0.03, yf, ZP + 0.03, ZP + 0.03 + Os.visina, M.cijevOs, 12)); osi.push(cylV(g, 0.004, xf - 0.03 + i * 0.03, yf, ZP + 0.03, ZP + 0.12, M.crveno, 8)); }
  osi.push(K(g, xf - 0.05, xf + 0.05, yf + 0.02, yf + 0.03, ZP + 0.2, ZP + 0.23, M.alu));
  dio('rassOsiguraci', osi);
  /* traka za kutije (dvije uske trake po y) i kutija PCB */
  const yk0 = To.y0 - Dm, yk1 = Y1;
  const tk = [traka(A, g, xo - 0.1, yk1, xo - 0.1, yk0, { sirina: 0.04, z: To.z + 0.02, vodilice: false, nosaci: false, smjer: 1 }), traka(A, g, xo + 0.1, yk1, xo + 0.1, yk0, { sirina: 0.04, z: To.z + 0.02, vodilice: false, nosaci: false, smjer: 1 })];
  const tkO = [K(g, xo - 0.165, xo - 0.155, yk0, yk1, To.z, To.z + 0.07, M.alu), K(g, xo + 0.155, xo + 0.165, yk0, yk1, To.z, To.z + 0.07, M.alu), Kc(g, xo - 0.17, yk0 + 0.05, 0.03, 0.04, To.z, To.z + 0.05, M.ventil), Kc(g, xo + 0.17, yk0 + 0.05, 0.03, 0.04, To.z, To.z + 0.05, M.ventil)];
  tkO.push(...senzor(A, g, xo - 0.175, yk0 + 0.15, To.z + 0.04), ...senzor(A, g, xo - 0.175, yk1 - 0.1, To.z + 0.04), ...rfidGlava(A, g, xo, yk0 + 0.12).map((m) => { m.position.y -= ZT - To.z - 0.02; return m; }));
  dio('rassTrakaKutije', tk.map((t) => t.grupa), tkO);
  const kut = gradiKutiju(A, { uzduz: 'y', sadrzaj: 'pcb' }); kut.position.set(xo, To.z + 0.02, -(yk0 + MJERE.kutija.duljina / 2 + 0.01)); g.add(kut);
  dio('rassKutijaPCB', kut);
  return { grupa: g, nosacRobota, mjestaAlata, kutija: kut, zaustavljaci: { radni: zr, glavna: zu } };
}

/* ====================================================================== CP-COBOT-M */
function gradiCOBOT(A, o = {}) {
  const { THREE, M, K, Kc, cylV, cylY, grupa, dio, dodaj, oval, naljepnica } = A, C = MJERE.cobot, W = C.sirina / 2, D = C.dubina / 2, H = C.stol;
  const g = new THREE.Group(); g.name = 'CP-COBOT-M';
  /* donji ormar */
  const orm = ormarOkvir(A, g, -W, W, -D, D, 0.62);
  const dno = [K(g, -W, W, -D, D, 0.6, 0.62, M.okvir)];
  const bok = [];
  for (const [x, st] of [[-W, 'l'], [W, 'd']]) { bok.push(K(g, x - 0.004, x + 0.004, -D + 0.03, D - 0.03, MJERE.ormar.plinta, 0.6, M.ormar)); for (const yy of [-0.2, 0.2]) bok.push(oval(g, x, yy, 0.36, st, 0.17, 0.07, M.tamno)); }
  dio('cobotOrmar', orm.okvir, orm.kotaci, dno, K(g, -W + 0.03, W - 0.03, D - 0.012, D, MJERE.ormar.plinta, 0.6, M.ormar));
  dio('cobotBezDockinga', bok);
  const vr = vrata(A, g, 'p', -W + 0.035, W - 0.035, 0.165, 0.5, -D, { krila: 1 });
  /* upravljačka traka sprijeda */
  const tr = [K(g, -W + 0.03, W - 0.03, -D - 0.006, -D + 0.01, 0.5, 0.6, M.ormar)];
  const zT = 0.55;
  tr.push(cylY(g, 0.012, -0.3, -D - 0.014, -D - 0.006, zT, M.bijelo, 14), cylY(g, 0.012, -0.24, -D - 0.014, -D - 0.006, zT, M.plavo, 14), cylY(g, 0.012, 0.0, -D - 0.014, -D - 0.006, zT, M.bijelo, 14), cylY(g, 0.012, 0.05, -D - 0.014, -D - 0.006, zT, M.bijelo, 14));
  const nuz = [Kc(g, -0.12, -D - 0.008, 0.06, 0.008, zT - 0.03, zT + 0.03, M.zuto), cylY(g, 0.018, -0.12, -D - 0.03, -D - 0.012, zT, M.crveno, 18)];
  const man = [cylY(g, 0.02, 0.16, -D - 0.014, -D - 0.006, zT, M.bijelo, 18)];
  const skl = [cylY(g, 0.026, 0.27, -D - 0.022, -D - 0.006, zT, M.crno, 18)];
  dio('cobotPloca', tr, man, skl, nuz);
  dodaj('cobotOrmar', vr);
  /* gornje tamno kućište s mjestima za kutije */
  const yb = -D + 0.31;                                    /* stražnji rub mjesta za kutije */
  const gor = [K(g, -W, W, yb, D, 0.62, H, M.tamnoSivo), K(g, -W, -W + 0.03, -D, yb, 0.62, H - 0.03, M.tamnoSivo), K(g, W - 0.03, W, -D, yb, 0.62, H - 0.03, M.tamnoSivo), K(g, -0.012, 0.012, -D + 0.02, yb, C.kutije.z, H - 0.04, M.tamnoSivo)];
  gor.push(K(g, -W + 0.03, W - 0.03, -D, yb, C.kutije.z - 0.02, C.kutije.z, M.alu), K(g, -W + 0.03, W - 0.03, -D - 0.004, -D + 0.01, C.kutije.z - 0.11, C.kutije.z - 0.02, M.alu));
  gor.push(K(g, -0.3, -0.1, -D - 0.006, -D - 0.004, C.kutije.z - 0.08, C.kutije.z - 0.05, M.crno), K(g, 0.1, 0.3, -D - 0.006, -D - 0.004, C.kutije.z - 0.08, C.kutije.z - 0.05, M.crno));
  dio('cobotStol', gor);
  const kut = [];
  for (const [i, sx] of [[1, -1], [2, 1]]) {
    const kb = gradiKutiju(A, { sadrzaj: 'poklopci' }); kb.position.set(sx * 0.21, C.kutije.z, -(-D + 0.165)); g.add(kb); kut.push(kb);
    dio('cobotKutija' + i, kb);
  }
  dio('cobotRfid', Kc(g, -0.21, -D + 0.165, 0.05, 0.05, C.kutije.z - 0.05, C.kutije.z - 0.02, M.tamnoSivo), Kc(g, 0.21, -D + 0.165, 0.05, 0.05, C.kutije.z - 0.05, C.kutije.z - 0.02, M.tamnoSivo));
  /* robot: točka montaže */
  const xR = C.robot.x, yR = C.robot.y;
  dodaj('cobotStol', cylV(g, 0.075, xR, yR, H, H + 0.012, M.alu, 28));
  const nosacRobota = grupa(g, xR, yR, H + 0.012, 'nosacRobota'); nosacRobota.rotation.y = -PI / 2; nosacRobota.userData.nespajaj = true;
  dio('robotUR3e', nosacRobota); if (o.robot) nosacRobota.add(o.robot);
  /* privjesak na zakretnom nosaču desno */
  const pr = grupa(g, W + 0.02, -0.05, H - 0.05);
  const prM = [K(pr, -0.02, 0.02, -0.02, 0.02, -0.04, 0.04, M.alu), K(pr, 0, 0.22, -0.012, 0.012, 0.0, 0.025, M.alu)];
  const tab = grupa(pr, 0.24, -0.04, 0.06); tab.rotation.x = 0.9; tab.rotation.y = -0.4;
  prM.push(K(tab, -0.15, 0.15, -0.1, 0.1, -0.015, 0.015, M.bijelo), K(tab, -0.12, 0.08, -0.08, 0.08, 0.015, 0.017, M.ekran), cylV(tab, 0.012, 0.12, 0.06, 0.015, 0.03, M.crveno, 14));
  dio('cobotPrivjesak', prM);
  /* upravljač i sigurnost u ormaru */
  dio('cobotUpravljac', [K(g, -0.38, 0.1, 0.05, D - 0.04, 0.2, 0.42, M.tamnoSivo), K(g, -0.36, -0.32, 0.049, 0.05, 0.38, 0.39, M.ledZ)]);
  dio('cobotSigurnost', [K(g, 0.16, 0.19, D - 0.12, D - 0.04, 0.32, 0.42, M.zuto), K(g, 0.2, 0.23, D - 0.12, D - 0.04, 0.32, 0.42, M.zuto), K(g, 0.25, 0.36, D - 0.12, D - 0.04, 0.3, 0.44, M.plcB)]);
  return { grupa: g, nosacRobota, kutije: kut, privjesak: pr };
}

export function napraviASRS(THREE, o = {}) { const dijelovi = new Map(), A = alati(THREE, dijelovi); const r = gradiASRS(A, o); if (o.spoji !== false) { spojiStaticno(THREE, r.grupa); spojiDijelove(THREE, r.grupa, dijelovi); } return Object.assign(r, { dijelovi, M: A.M, istakni: istaknuce(THREE, r.grupa, dijelovi), azuriraj: pomakTraka(A) }); }
export function napraviBRANCH(THREE, o = {}) { const dijelovi = new Map(), A = alati(THREE, dijelovi); const r = gradiBRANCH(A, o); if (o.spoji !== false) { spojiStaticno(THREE, r.grupa); spojiDijelove(THREE, r.grupa, dijelovi); } return Object.assign(r, { dijelovi, M: A.M, istakni: istaknuce(THREE, r.grupa, dijelovi), azuriraj: pomakTraka(A) }); }
export function napraviRASS(THREE, o = {}) { const dijelovi = new Map(), A = alati(THREE, dijelovi); const r = gradiRASS(A, o); if (o.spoji !== false) { spojiStaticno(THREE, r.grupa); spojiDijelove(THREE, r.grupa, dijelovi); } return Object.assign(r, { dijelovi, M: A.M, istakni: istaknuce(THREE, r.grupa, dijelovi), azuriraj: pomakTraka(A) }); }
export function napraviCOBOT(THREE, o = {}) { const dijelovi = new Map(), A = alati(THREE, dijelovi); const r = gradiCOBOT(A, o); if (o.spoji !== false) { spojiStaticno(THREE, r.grupa); spojiDijelove(THREE, r.grupa, dijelovi); } return Object.assign(r, { dijelovi, M: A.M, istakni: istaknuce(THREE, r.grupa, dijelovi) }); }

/* pomak tekstura remena: t (s), brzina (m/s) */
function pomakTraka(A) {
  return function azuriraj(t, brzina = MJERE.traka.brzinaSpora) {
    const s = (Number(t) || 0) * brzina;
    A.remeni.forEach((r) => { if (r.m.map) r.m.map.offset.x = -(s * r.smjer) / 0.064; });
  };
}
/* isticanje dijela: odabrani dobije tirkiznu emisiju, ostalo prozirnost 0,1 (kao Robotino) */
function istaknuce(THREE, ...korijeni) {
  const dijelovi = korijeni.pop();
  const hiCache = new Map(), duhCache = new Map();
  function sviMeshevi() { const out = []; korijeni.forEach((k) => k.traverse((o) => { if (o.isMesh && !o.userData.bezDuha) out.push(o); })); return out; }
  return function istakni(id) {
    const svi = sviMeshevi();
    svi.forEach((o) => { if (o.userData.matIst) { o.material = o.userData.matIst; o.userData.matIst = null; } });
    if (!id || !dijelovi.has(id)) return;
    const odabrani = new Set();
    dijelovi.get(id).objekti.forEach((o) => o.traverse((c) => { if (c.isMesh) odabrani.add(c); }));
    svi.forEach((o) => {
      const m0 = o.material; if (!m0 || Array.isArray(m0)) return; o.userData.matIst = m0;
      if (odabrani.has(o)) {
        let h = hiCache.get(m0.uuid); if (!h) { h = m0.clone(); if (h.emissive) { h.emissive = new THREE.Color(0x19b7c9); h.emissiveIntensity = 0.45; } if (!m0.transparent) { h.transparent = false; h.opacity = 1; h.depthWrite = true; } hiCache.set(m0.uuid, h); }
        o.material = h;
      } else {
        let d = duhCache.get(m0.uuid); if (!d) { d = m0.clone(); d.transparent = true; d.opacity = Math.min(0.1, m0.opacity * 0.4); d.depthWrite = false; if (d.emissive) d.emissive.setHex(0); duhCache.set(m0.uuid, d); }
        o.material = d;
      }
    });
  };
}

/* ====================================================================== cijela linija i prostor */
export function napraviLiniju(THREE, opcije = {}) {
  const O = Object.assign({ pod: true, cobot: true, okolina: true, spoji: true }, opcije);
  const dijelovi = new Map(), A = alati(THREE, dijelovi);
  const { M, K, Kc, cylV, cylX, grupa, dio, dodaj, cijev } = A;
  const Rp = KONFIG.raspored;
  const grupaL = new THREE.Group(); grupaL.name = 'CPFLinija';
  /* moduli */
  const smjesti = (r, poz) => { r.grupa.position.set(poz.x, 0, -poz.y); r.grupa.rotation.y = (poz.kut || 0) * PI / 180; grupaL.add(r.grupa); };
  const rass = gradiRASS(A, { robot: O.robotRass, alati: O.alatiRass }); smjesti(rass, Rp.rass);
  const branch = gradiBRANCH(A, {}); smjesti(branch, Rp.branch);
  const asrs = gradiASRS(A, { police: O.police }); smjesti(asrs, Rp.asrs);
  let cobot = null;
  if (O.cobot) { cobot = gradiCOBOT(A, { robot: O.robotCobot }); smjesti(cobot, Rp.cobot); }
  /* tok materijala: oznaka smjera na podu ispred linije (tanka strelica) */
  const P = putevi();
  const tok = grupa(grupaL, 0, 0, 0, 'tok');
  const xA = Rp.rass.x - 0.6, xB = Rp.asrs.x + 0.6;
  const strelice = [];
  for (let x = xB - 0.4; x > xA + 0.3; x -= 0.6) { const s = new THREE.Shape(); s.moveTo(x - 0.08, 0); s.lineTo(x + 0.04, 0.05); s.lineTo(x + 0.04, -0.05); s.closePath(); strelice.push(s); }
  const st = A.izvuciP(tok, strelice, 0.001, 0.0025, M.oznakaT);
  st.position.z = 0.12;                                                  /* ispred linije: y = −0,12 */
  dio('linijaTok', tok);
  /* spoj između stanica i lanac nužnog stopa (straga dolje na spojevima modula) */
  const spoj = [], lanac = [];
  const yS = Rp.rass.y - MJERE.modul.dubina / 2 + 0.06;
  for (const xj of [Rp.rass.x + 0.6, Rp.branch.x + 0.6]) {
    spoj.push(cijev(grupaL, [[xj - 0.25, yS + 0.05, 0.09], [xj - 0.12, yS - 0.03, 0.012], [xj + 0.12, yS - 0.03, 0.012], [xj + 0.25, yS + 0.05, 0.09]], 0.012, M.kabel));
    spoj.push(cijev(grupaL, [[xj - 0.2, yS + 0.08, 0.08], [xj - 0.08, yS - 0.05, 0.008], [xj + 0.1, yS - 0.07, 0.008], [xj + 0.22, yS + 0.08, 0.08]], 0.006, M.kabelZ));
  }
  const bojaLanca = { START: M.zeleno, MID: M.zuto, END: M.crveno };
  [['rass', Rp.rass], ['branch', Rp.branch], ['asrs', Rp.asrs]].forEach(([kk, poz]) => {
    const kon = ({ rass: 'START', branch: 'MID', asrs: 'END' })[kk];
    const zr = poz.kut === 180 ? -1 : 1;
    lanac.push(Kc(grupaL, poz.x - zr * 0.45, poz.y - zr * (MJERE.modul.dubina / 2 + 0.008), 0.05, 0.016, 0.12, 0.155, bojaLanca[kon]));
  });
  dio('spojnaCijev', spoj); dio('sigurnosniLanac', lanac);
  /* MES računalo (stol s dva zaslona) */
  const mr = grupa(grupaL, Rp.mesRacunalo.x, Rp.mesRacunalo.y, 0, 'mesRacunalo'); mr.rotation.y = (Rp.mesRacunalo.kut || 0) * PI / 180;
  const stol = [K(mr, -0.7, 0.7, -0.35, 0.35, 0.72, 0.75, M.stol), K(mr, -0.68, -0.64, -0.33, 0.33, 0, 0.72, M.stol), K(mr, 0.64, 0.68, -0.33, 0.33, 0, 0.72, M.stol), K(mr, -0.64, 0.64, 0.3, 0.32, 0.3, 0.72, M.stol)];
  const zas = (x) => [Kc(mr, x, 0.18, 0.2, 0.15, 0.75, 0.76, M.crno), K(mr, x - 0.02, x + 0.02, 0.17, 0.19, 0.76, 0.9, M.crno), K(mr, x - 0.26, x + 0.26, 0.15, 0.17, 0.88, 1.2, M.crno), K(mr, x - 0.245, x + 0.245, 0.149, 0.15, 0.895, 1.185, M.ekran)];
  dio('mesRacunalo', stol, zas(-0.3), Kc(mr, -0.25, -0.1, 0.42, 0.14, 0.75, 0.765, M.tamnoSivo), K(mr, 0.38, 0.6, -0.2, 0.15, 0.0, 0.42, M.tamnoSivo));
  dio('fleetManager', zas(0.3));
  /* kompresori */
  const komp = [];
  for (const kp of [Rp.kompresor, Rp.kompresor2]) {
    const kg = grupa(grupaL, kp.x, kp.y, 0);
    komp.push(cylV(kg, 0.17, 0, 0, 0.07, 0.36, M.kompresor, 28), cylV(kg, 0.17, 0, 0, 0.36, 0.38, M.celik, 28, 0.15), cylV(kg, 0.11, 0, 0, 0.38, 0.52, M.kompresor, 24), cylV(kg, 0.12, 0, 0, 0.44, 0.46, M.celik, 24));
    komp.push(cijev(kg, [[0.15, -0.12, 0.06], [0.2, -0.13, 0.5], [0.12, -0.14, 0.72], [-0.12, -0.14, 0.72], [-0.2, -0.13, 0.5], [-0.15, -0.12, 0.06]], 0.012, M.crno, 30));
    komp.push(A.cylY(kg, 0.04, 0.16, -0.14, -0.1, 0.04, M.guma, 16), A.cylY(kg, 0.04, -0.16, -0.14, -0.1, 0.04, M.guma, 16), cylV(kg, 0.025, 0.12, 0.12, 0.38, 0.42, M.bijelo, 16));
  }
  dio('kompresor', komp);
  /* Robotino: pozicija pristajanja na BRANCH-u (oznaka na podu) i sidra za modele s područja Robotino */
  const kr = MJERE.branch.krak;
  const dock = { x: P.krakBRANCH.segmenti[1].c[0], y: P.yEnd - MJERE.branch.predaja.razmak - 0.25, phi: 0 };
  const predaja = { x: dock.x, y: P.yEnd, z: ZT, kut: -PI / 2 };
  const sidRob = grupa(grupaL, dock.x, dock.y, 0, 'sidroRobotino'); sidRob.userData.nespajaj = true;
  const sidSt = new THREE.Group(); sidSt.name = 'sidroStanica'; sidSt.userData.nespajaj = true; grupaL.add(sidSt);
  const stanica = { x: Rp.zidDesno - 0.212 - 0.01, y: Rp.stanica.y, phi: PI };
  sidSt.position.set(stanica.x, 0, -stanica.y); sidSt.rotation.y = stanica.phi;
  const okvirOznake = (p, a, b, m) => { const s = A.zaobljeni(a, b, 0.02); s.holes.push(A.zaobljeni(a - 0.05, b - 0.05, 0.01, 0, 0, THREE.Path)); return A.izvuciP(p, s, 0.001, 0.002, m, { curveSegments: 4 }); };
  const ozD = grupa(grupaL, dock.x, dock.y, 0, 'oznakaDocking'); okvirOznake(ozD, 0.56, 0.62, M.oznaka);
  const ozS = grupa(grupaL, stanica.x - 0.247, stanica.y, 0, 'oznakaPunjenje'); okvirOznake(ozS, 0.62, 0.62, M.oznaka);
  dio('robotinoDocking', ozD); dio('robotino', sidRob); dio('stanicaPunjenja', sidSt, ozS);
  if (O.robotino) sidRob.add(O.robotino);
  if (O.stanica) sidSt.add(O.stanica);
  /* pod (pločice 0,6 m) i desni zid (neobavezno) */
  if (O.pod) {
    const tex = A.platno(256, 256, (g2, w, h) => { g2.fillStyle = '#d7d9d6'; g2.fillRect(0, 0, w, h); g2.strokeStyle = '#c4c7c4'; g2.lineWidth = 2; g2.strokeRect(1, 1, w - 2, h - 2); });
    const pm = M.pod.clone(); if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(9.6 / 0.6, 7.8 / 0.6); pm.map = tex; }
    const pod = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 7.8), pm); pod.rotation.x = -PI / 2; pod.position.set(0.95, -0.0005, -(-1.6)); pod.userData.bezDuha = true; pod.userData.nespajaj = true; pod.name = 'pod';
    grupaL.add(pod);
  }
  if (O.zid) {
    const zid = K(grupaL, Rp.zidDesno, Rp.zidDesno + 0.2, -4.5, 2.2, 0, 3.0, M.ormar.clone()); zid.material.color.setHex(0xb9bbb8); zid.userData.bezDuha = true; zid.userData.nespajaj = true; zid.name = 'zid';
  }
  /* nosači na trakama */
  const nosaci = new Map();
  function postaviNosac(id, s, put = 'petlja', op = {}) {
    let n = nosaci.get(id);
    const kljuc = JSON.stringify({ p: op.paleta !== false, i: op.izradak || null, c: !!op.pcb });
    if (!n || n.kljuc !== kljuc) {
      if (n) grupaL.remove(n.g);
      const g2 = gradiNosac(A, { paleta: op.paleta !== false, izradak: op.izradak || null, pcb: !!op.pcb }); g2.name = 'nosac_' + id;
      g2.userData.nosacId = id; grupaL.add(g2); n = { g: g2, kljuc }; nosaci.set(id, n);
      g2.traverse((c) => { if (c.isMesh) c.userData.nosac = id; });
      dodaj('nosac', g2);
    }
    const pt = typeof put === 'string' ? P[put] : put;
    const q = tockaPuta(pt, s);
    n.g.position.set(q.x, q.z, -q.y); n.g.rotation.y = q.kut; n.g.visible = op.vidljiv !== false;
    n.put = pt.ime; n.s = s;
    return n.g;
  }
  function ukloniNosac(id) { const n = nosaci.get(id); if (!n) return; grupaL.remove(n.g); nosaci.delete(id); const d = dijelovi.get('nosac'); if (d) d.objekti = d.objekti.filter((o) => o !== n.g); }
  /* zaustavljači (tablica za simulator): s na putu i objekt */
  const sB = (xLok, poz, rot = 1) => poz.x + rot * xLok;
  const zaust = {
    asrsST1: { modul: 'asrs', put: 'petlja', s: P.sNa(sB(MJERE.asrs.stoper.x - 0.09, Rp.asrs)) - 0.09, obj: asrs.zaustavljaci.ST1 },
    asrsST2: { modul: 'asrs', put: 'petlja', s: P.sNaB(sB(MJERE.asrs.stoper.x + 0.09, Rp.asrs)) - 0.09, obj: asrs.zaustavljaci.ST2 },
    rassRadni: { modul: 'rass', put: 'bypassRASS', s: P.bypassRASS.segmenti[1].s0 + (MJERE.rass.bypass.radniX - MJERE.rass.bypass.x0) + 0.0, obj: rass.zaustavljaci.radni },
    rassGlavna: { modul: 'rass', put: 'petlja', s: P.sNa(Rp.rass.x + 0.3) - 0.09, obj: rass.zaustavljaci.glavna },
    branchGrananje: { modul: 'branch', put: 'petlja', s: P.sNa(Rp.branch.x + (MJERE.branch.krak.razmak / 2 + 0.24)) - 0.09, obj: branch.zaustavljaci.grananje },
    branchTraka1: { modul: 'branch', put: 'petlja', s: P.sNaB(Rp.branch.x - 0.3) - 0.09, obj: branch.zaustavljaci.traka1 },
    branchTraka4: { modul: 'branch', put: 'krakBRANCH', s: P.krakBRANCH.segmenti[2].s0 + (P.yEnd + MJERE.branch.krak.razmak / 2 + 0.12 - 0.09 - P.krakBRANCH.segmenti[2].a[1]), obj: branch.zaustavljaci.traka4 }
  };
  Object.values(zaust).forEach((z) => { const q = tockaPuta(P[z.put], z.s); z.x = q.x; z.y = q.y; });
  function zaustavljacF(id, gore) { const z = zaust[id]; if (z) z.obj.postavi(!!gore); }
  Object.keys(zaust).forEach((id) => zaustavljacF(id, true));
  /* predložak nosača za Upoznavanje (vidljiv na ST1) */
  const uzorak = gradiNosac(A, { izradak: 'crna' }); grupaL.add(uzorak);
  const qn = tockaPuta(P.petlja, zaust.asrsST1.s);
  uzorak.position.set(qn.x, ZT, -qn.y); uzorak.rotation.y = qn.kut; uzorak.name = 'nosacUzorak';
  dio('nosac', uzorak);
  dio('rfidOznaka', uzorak.children.filter((c) => c.isMesh && c.material === M.bijelo || c.material === M.alu));
  const pal = uzorak.getObjectByName('paleta'); dio('paleta', pal); const izr = pal.getObjectByName('izradak'); dio('izradak', izr);
  dio('kutijaKLT', []); dodaj('kutijaKLT', rass.kutija); if (cobot) dodaj('kutijaKLT', ...cobot.kutije);
  /* točke za stranice i simulator (KS tlocrta linije; poze {x, y, phi} kao postaviPozu u modelima Robotina) */
  const S = MJERE.rass.robot;
  const tocke = {
    predajaRobotinu: predaja,
    robotinoDocking: dock,
    punjenje: stanica,
    robotinoPunjenje: { x: stanica.x + 0.247 * Math.cos(stanica.phi), y: stanica.y + 0.247 * Math.sin(stanica.phi), phi: (stanica.phi + PI) % (2 * PI), napomena: 'približno; točno: K.pozaPristajanja(punjenje.x, punjenje.y, punjenje.phi) iz robotino_kin.js' },
    robotKUKA: { x: Rp.rass.x - 0.6 + S.x, y: Rp.rass.y - MJERE.modul.dubina / 2 + S.y, z: MJERE.rass.ploca + S.postolje, phi: S.kut },
    robotUR3e: cobot ? { x: Rp.cobot.x + MJERE.cobot.robot.x, y: Rp.cobot.y + MJERE.cobot.robot.y, z: MJERE.cobot.stol + 0.012, phi: -PI / 2 } : null,
    asrsST1: { x: zaust.asrsST1.x, y: zaust.asrsST1.y, z: ZT }, asrsST2: { x: zaust.asrsST2.x, y: zaust.asrsST2.y, z: ZT },
    rassRadni: { x: zaust.rassRadni.x, y: zaust.rassRadni.y, z: ZT },
    branchKrak: { x: P.krakBRANCH.segmenti[0].a[0], y: P.krakBRANCH.segmenti[0].a[1] },
    kutijaPCB: { x: Rp.rass.x - 0.6 + MJERE.rass.trakaKutije.x, y: Rp.rass.y - MJERE.modul.dubina / 2 + MJERE.rass.trakaKutije.y0 + MJERE.kutija.duljina / 2 + 0.01, z: MJERE.rass.trakaKutije.z + 0.02 },
    sredinaLinije: { x: (xA + xB) / 2, y: Rp.rass.y, z: 1.0 }
  };
  /* spajanje i isticanje */
  if (O.spoji) { spojiStaticno(THREE, grupaL); spojiDijelove(THREE, grupaL, dijelovi); }
  const istakni = istaknuce(THREE, grupaL, dijelovi);
  const azurirajTrake = pomakTraka(A);
  function azuriraj(t, brzina) { azurirajTrake(t, brzina); }
  function prikljuci(id, objekt) { if (!objekt) return; let d = dijelovi.get(id); if (!d) { d = { naziv: NAZIV.get(id) || id, objekti: [] }; dijelovi.set(id, d); } d.objekti.push(objekt); objekt.traverse((c) => { if (!c.userData.dio) c.userData.dio = id; }); }
  const nedostaju = DIJELOVI.filter((d) => !dijelovi.has(d.id)).map((d) => d.id);
  if (nedostaju.length && typeof console !== 'undefined') console.warn('CPF model: dijelovi bez geometrije', nedostaju);
  grupaL.updateMatrixWorld(true);
  return {
    grupa: grupaL,
    moduli: { asrs, branch, rass, cobot },
    trake: { putevi: P, tocka: (put, s) => tockaPuta(typeof put === 'string' ? P[put] : put, s), duljina: (put) => (typeof put === 'string' ? P[put] : put).L, spojevi: P.spojevi },
    tocke, zaustavljaci: zaust, zaustavljac: zaustavljacF,
    sidra: { robotino: sidRob, stanica: sidSt, kuka: rass.nosacRobota, ur3e: cobot ? cobot.nosacRobota : null },
    dijelovi, istakni, postaviNosac, ukloniNosac, nosaci, azuriraj, prikljuci, skretnica: branch.skretnica,
    M
  };
}
