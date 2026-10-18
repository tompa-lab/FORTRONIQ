/* FORTRONIQ · Mitsubishi Movemaster EX RV-M1 — parametarski 3D model robota, upravljačke jedinice DUM1, privjeska, SIM RV i stola Festo MPS
   (naš crtež s fotografija; bez vanjskih modela, tekstura proizvođača, natpisa proizvođača i logotipa).
   Sve mjere i nazivi dolaze iz rvm1_podaci.js (MJERE, OSI, DIJELOVI, PRIHVATNICA, PRIVJESAK, SIMRV, STANICA). Jedinice: METRI.
   Robot: korijen je u koordinatama scene (Y gore, montažna ploha robota y = 0); unutra je grupa „robot” u KS robota (Z gore):
     x_s = x_r,  y_s = z_r,  z_s = −y_r.
   Lanac: osi[0] (J1, oko Z) → osi[1] (J2, oko −Y') → osi[2] (J3) → osi[3] (J4) → orijentacija (z = os alata) → osi[4] (J5, oko z) → flange, tcp.
   DUM1, privjesak, SIM RV i stol grade se u koordinatama scene (Y gore, dno na y = 0).
   Model nema vlastitu petlju ni stalne animacije (render na zahtjev); postavi()/prihvatnica()/postaviLED() mijenjaju stanje odmah.
   © ForTroniQ d.o.o. */
import { KONFIG, MJERE, OSI, DIJELOVI, PRIHVATNICA, PRIVJESAK, SIMRV, STANICA, TL_ZADANO, ORG } from './rvm1_podaci.js';
import * as KIN from './rvm1_kin.js';

const NAZIV = new Map(DIJELOVI.map((d) => [d.id, d.naziv]));
const PI = Math.PI;
const ZNAK_J1 = KONFIG.smjerJ1 === 'cw' ? -1 : 1;

/* ====================================================================== zajednički alati */
function alati(THREE, dijelovi) {
  const imaDoc = typeof document !== 'undefined';
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.08 }, o));
  const M = {
    lijev: mat(0x8e9294, { roughness: 0.62, metalness: 0.22 }), lijevT: mat(0x777b7d, { roughness: 0.6, metalness: 0.22 }),
    maslina: mat(0x8a8a6c, { roughness: 0.7, metalness: 0.05 }),
    bez: mat(0xd8cc96, { roughness: 0.55, metalness: 0.02 }), bezT: mat(0xcbbf88, { roughness: 0.55 }),
    ruka: mat(0xe0dfd7, { roughness: 0.42, metalness: 0.03 }), rukaS: mat(0xebeae3, { roughness: 0.38, metalness: 0.03 }), rukaT: mat(0xc9c8c0, { roughness: 0.45 }),
    crna: mat(0x1d1e20, { roughness: 0.5 }), crnaM: mat(0x121314, { roughness: 0.75 }), vijak: mat(0x18191a, { roughness: 0.35, metalness: 0.4 }),
    kabel: mat(0x161718, { roughness: 0.6 }), kabelS: mat(0x9b9ea1, { roughness: 0.6 }), kabelB: mat(0xd9d6cc, { roughness: 0.6 }),
    celik: mat(0xc3c8cc, { metalness: 0.7, roughness: 0.28 }), celikT: mat(0x7f868b, { metalness: 0.6, roughness: 0.35 }), cink: mat(0xb8bcbf, { metalness: 0.6, roughness: 0.35 }),
    plavaI: mat(0x2a5ad0, { roughness: 0.45 }), zlato: mat(0xd2a445, { metalness: 0.8, roughness: 0.3 }),
    bakar: mat(0xc0763a, { metalness: 0.65, roughness: 0.35 }), magnet: mat(0x8c3b3b, { roughness: 0.45 }), magnetS: mat(0x3d5f8c, { roughness: 0.45 }),
    tarno: mat(0x8a6a48, { roughness: 0.9 }), grafit: mat(0x2f2f2f, { roughness: 0.9 }), remen: mat(0x26282a, { roughness: 0.85 }),
    remenica: mat(0xa8adb1, { metalness: 0.55, roughness: 0.32 }), disk: mat(0x5f87a8, { metalness: 0.3, roughness: 0.25, transparent: true, opacity: 0.85 }),
    pcb: mat(0x1f6e3c, { roughness: 0.6 }), pcbP: mat(0x1d4f8a, { roughness: 0.6 }), cip: mat(0x16181a, { roughness: 0.45 }),
    mikro: mat(0x2b2d30, { roughness: 0.5 }), prekidacC: mat(0xc7372f, { roughness: 0.45 }), bijeloP: mat(0xf1f1ee, { roughness: 0.55 }),
    zuto: mat(0xf2c21a, { roughness: 0.45 }), crveno: mat(0xd4261c, { roughness: 0.4 }), zeleno: mat(0x1f9a52, { roughness: 0.45 }), bijelaT: mat(0xf4f4f0, { roughness: 0.45 }),
    dum: mat(0xd6d5cc, { roughness: 0.5, metalness: 0.05 }), dumT: mat(0xb4b4ac, { roughness: 0.5 }), dumP: mat(0xa8a9a4, { roughness: 0.55 }),
    alu: mat(0xc8ccd0, { metalness: 0.55, roughness: 0.32 }), aluT: mat(0x9fa5aa, { metalness: 0.5, roughness: 0.36 }),
    priv: mat(0x45463f, { roughness: 0.6 }), privT: mat(0x2f302b, { roughness: 0.6 }), smeda: mat(0xc0894a, { roughness: 0.55 }), krem: mat(0xeee6cf, { roughness: 0.55 }),
    sim: mat(0xebe7d9, { roughness: 0.55 }), simT: mat(0x55575a, { roughness: 0.55 }),
    kolica: mat(0xe8e6de, { roughness: 0.6 }), plavaPloca: mat(0x6c8399, { roughness: 0.5, metalness: 0.35 }), utor: mat(0x3e4247, { roughness: 0.7 }),
    staklo: mat(0x2a0d0d, { roughness: 0.15, metalness: 0.2 }),
    pomocna: new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.9, depthTest: false })
  };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function orient(g, os) { if (os === 'z') g.rotateX(PI / 2); else if (os === 'x') g.rotateZ(-PI / 2); return g; }
  function add(p, o, x = 0, y = 0, z = 0) { o.position.x += x; o.position.y += y; o.position.z += z; p.add(o); return o; }
  function grupa(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; }
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  /* valjak duž osi os od a0 do a1 */
  function cyl(r, a0, a1, os, m, seg = 28, r2) {
    let rb = r, rt = r2 ?? r; if (a1 < a0) { [a0, a1] = [a1, a0]; [rb, rt] = [rt, rb]; }
    const g = orient(new THREE.CylinderGeometry(rt, rb, a1 - a0, seg), os); const me = new THREE.Mesh(g, m); me.position[os] = (a0 + a1) / 2; return me;
  }
  function lathe(pts, os, m, seg = 40) { const g = orient(new THREE.LatheGeometry(pts.map(([r, a]) => new THREE.Vector2(Math.max(0, r), a)), seg), os); return new THREE.Mesh(g, m); }
  function prsten(ro, ri, a0, a1, os, m, seg = 40) { return lathe([[ri, a0], [ro, a0], [ro, a1], [ri, a1], [ri, a0]], os, m, seg); }
  function zaobljeni(w, h, r, cx = 0, cy = 0, Tip = THREE.Shape) {
    const s = new Tip(), x = cx - w / 2, y = cy - h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  /* dvije kružnice spojene vanjskim tangentama (profil članka) */
  function tangentni(x1, y1, r1, x2, y2, r2, Tip = THREE.Shape) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx), t = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / L)));
    const s = new Tip();
    s.moveTo(x1 + r1 * Math.cos(a + t), y1 + r1 * Math.sin(a + t));
    s.absarc(x1, y1, r1, a + t, a + 2 * PI - t, false);
    s.lineTo(x2 + r2 * Math.cos(a - t), y2 + r2 * Math.sin(a - t));
    s.absarc(x2, y2, r2, a - t, a + t, false);
    s.closePath(); return s;
  }
  /* izvlačenje profila: 'y' — profil u ravnini XZ (sx → x, sy → z), izvučen od y0 do y1; 'z' — profil u XY, od z0 do z1; 'x' — profil u YZ (sx → y, sy → z) */
  function izvuci(shape, a0, a1, os, m, ob = null, curve = 20) {
    const bt = ob ? ob.t : 0, L = Math.abs(a1 - a0), lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-5, L - 2 * bt), curveSegments: curve, bevelEnabled: !!ob, bevelThickness: bt, bevelSize: ob ? ob.s : 0, bevelSegments: ob ? (ob.seg || 2) : 1 });
    if (os === 'z') g.translate(0, 0, lo + bt);
    else if (os === 'y') { g.rotateX(PI / 2); g.translate(0, hi - bt, 0); }
    else { g.rotateX(PI / 2); g.rotateZ(PI / 2); g.translate(lo + bt, 0, 0); g.rotateZ(0); }
    g.computeVertexNormals();
    return new THREE.Mesh(g, m);
  }
  function cijev(p, tocke, r, m, seg = 48, rs = 8) {
    const k = new THREE.CatmullRomCurve3(tocke.map((t) => (t.isVector3 ? t : new THREE.Vector3(t[0], t[1], t[2]))), false, 'centripetal');
    const me = new THREE.Mesh(new THREE.TubeGeometry(k, seg, r, rs, false), m); if (p) p.add(me); return me;
  }
  /* spiralni kabel oko krivulje kroz točke: zavoji polumjera rz, korak k, debljina kabela rk */
  function spiralaGeo(tocke, rz, korak, rk, rs = 6) {
    const C = new THREE.CatmullRomCurve3(tocke.map((t) => (t.isVector3 ? t : new THREE.Vector3(t[0], t[1], t[2]))), false, 'centripetal');
    const L = C.getLength(), n = Math.max(2, L / korak), N = Math.min(600, Math.ceil(n * 14));
    const F = C.computeFrenetFrames(N, false), pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = C.getPointAt(u), a = 2 * PI * n * u, nn = F.normals[i], bb = F.binormals[i];
      pts.push(p.clone().addScaledVector(nn, rz * Math.cos(a)).addScaledVector(bb, rz * Math.sin(a)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, rk, rs, false);
  }
  function stap(p, a, b, r, m, seg = 12, r2) {
    const A = V3(...a), B = V3(...b), L = A.distanceTo(B);
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, L, seg), m);
    me.position.copy(A).add(B).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(V3(0, 1, 0), B.clone().sub(A).normalize()); if (p) p.add(me); return me;
  }
  function kugla(r, m, s = 12) { return new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.max(6, s * 0.66 | 0)), m); }
  /* naljepnica s tekstom (CanvasTexture); bez documenta (Node) vraća null */
  function platno(w, h, crtaj) {
    if (!imaDoc) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; crtaj(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { canvas: c }; return t;
  }
  function naljepnica(w, h, px, crtaj, boja = 0xffffff, o = {}) {
    const tex = platno(Math.round(w * px), Math.round(h * px), crtaj);
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: tex ? 0xffffff : boja, map: tex, roughness: 0.6, transparent: !!o.transparent }, o.mat || {}));
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.userData.vlastitiMat = true; return me;
  }
  /* led: vlastiti materijal, stanje uključeno/isključeno */
  function led(r, boja, dubina = 0.004, os = 'y') {
    const m = new THREE.MeshStandardMaterial({ color: boja, emissive: boja, emissiveIntensity: 0, roughness: 0.3 });
    const me = cyl(r, 0, dubina, os, m, 16); me.userData.vlastitiMat = true; me.userData.led = true;
    const boj = new THREE.Color(boja), tama = boj.clone().multiplyScalar(0.28);
    m.color.copy(tama);
    me.userData.postavi = (v) => { m.color.copy(v ? boj : tama); m.emissiveIntensity = v ? 1.6 : 0; me.userData.ukljuceno = !!v; };
    return me;
  }
  /* loft: presjeci [{z, a, b, n, cx, cy}] superelipsa |x/a|^n + |y/b|^n = 1 */
  function loft(presjeci, m, seg = 48, poklopci = [true, true]) {
    const pos = [], idx = [];
    const pt = (s, phi) => { const c = Math.cos(phi), si = Math.sin(phi), e = 2 / s.n; return [s.cx + s.a * Math.sign(c) * Math.abs(c) ** e, s.cy + s.b * Math.sign(si) * Math.abs(si) ** e, s.z]; };
    presjeci.forEach((s) => { for (let k = 0; k < seg; k++) pos.push(...pt(s, k / seg * 2 * PI)); });
    for (let i = 0; i < presjeci.length - 1; i++) for (let k = 0; k < seg; k++) {
      const a = i * seg + k, b = i * seg + (k + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, d, a, d, c);
    }
    const dodajPoklopac = (i, gore) => {
      const s = presjeci[i], c0 = pos.length / 3; pos.push(s.cx, s.cy, s.z);
      for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg; if (gore) idx.push(c0, a, b); else idx.push(c0, b, a); }
    };
    if (poklopci[0]) dodajPoklopac(0, false);
    if (poklopci[1]) dodajPoklopac(presjeci.length - 1, true);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const g2 = g.toNonIndexed(); g2.computeVertexNormals();
    /* glatke normale po bočnoj plohi */
    return new THREE.Mesh(zagladi(g2, 0.7), m);
  }
  function zagladi(g, kut = 0.9) {
    const pos = g.attributes.position, n = pos.count, fn = new Float32Array(n * 3), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < n; i += 3) { a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2); b.sub(a); c.sub(a); b.cross(c); for (let k = 0; k < 3; k++) { fn[(i + k) * 3] = b.x; fn[(i + k) * 3 + 1] = b.y; fn[(i + k) * 3 + 2] = b.z; } }
    const mapa = new Map();
    for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 1e5) + ',' + Math.round(pos.getY(i) * 1e5) + ',' + Math.round(pos.getZ(i) * 1e5); let l = mapa.get(k); if (!l) { l = []; mapa.set(k, l); } l.push(i); }
    const out = new Float32Array(n * 3), cosT = Math.cos(kut);
    const nrm = (i) => { const x = fn[3 * i], y = fn[3 * i + 1], z = fn[3 * i + 2], L = Math.hypot(x, y, z); return L < 1e-30 ? null : [x / L, y / L, z / L]; };
    for (const l of mapa.values()) for (const i of l) {
      const ni = nrm(i); let sx = 0, sy = 0, sz = 0;
      if (ni) for (const j of l) { const nj = nrm(j); if (nj && nj[0] * ni[0] + nj[1] * ni[1] + nj[2] * ni[2] >= cosT) { sx += nj[0]; sy += nj[1]; sz += nj[2]; } }
      const L = Math.hypot(sx, sy, sz) || 1; out[3 * i] = sx / L; out[3 * i + 1] = sy / L; out[3 * i + 2] = sz / L;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return g;
  }
  /* registar dijelova */
  function dio(id, ...obj) {
    let d = dijelovi.get(id); if (!d) { d = { naziv: NAZIV.get(id) || id, objekti: [] }; dijelovi.set(id, d); }
    obj.flat(Infinity).forEach((o) => { if (o) { d.objekti.push(o); o.userData.dio = id; } });
    return obj[0];
  }
  return { THREE, M, mat, V3, add, grupa, box, cyl, lathe, prsten, zaobljeni, tangentni, izvuci, cijev, spiralaGeo, stap, kugla, platno, naljepnica, led, loft, dio, orient, imaDoc };
}

/* spajanje nepomičnih meshova istog materijala (manje poziva iscrtavanja); granice: userData.dio / anim / unutra / nespajaj */
function spojiStaticno(THREE, root) {
  root.updateMatrixWorld(true);
  const granica = (o) => o === root || !!(o.userData.dio || o.userData.anim || o.userData.unutra || o.userData.nespajaj);
  const zadrzi = (c) => c.userData.dio || c.userData.led || c.userData.vlastitiMat || c.userData.nespajaj || c.userData.anim || c.userData.skriven || c.material.map || c.children.length || !c.visible || c.isInstancedMesh;
  const korijeni = []; root.traverse((o) => { if (!o.isMesh && granica(o)) korijeni.push(o); });
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

/* isticanje dijela, prozirnost ljuski i skrivena unutrašnjost — zajedničko svim modelima */
function sustavIsticanja(THREE, korijen, dijelovi) {
  const st = { istaknuto: null, prozirniId: new Set(), unutraVidljivo: () => false };
  let sviMeshevi = [];
  const hiC = new Map(), duhC = new Map(), prozC = new Map();
  const klon1 = (cache, m, f) => { let c = cache.get(m.uuid); if (!c) { c = m.clone(); f(c); cache.set(m.uuid, c); } return c; };
  const klon = (cache, m, f) => (Array.isArray(m) ? m.map((x) => klon1(cache, x, f)) : klon1(cache, m, f));
  const privremeno = [];
  function popisi() { sviMeshevi = []; korijen.traverse((o) => { if (o.isMesh && !(o.material && o.material.isMeshBasicMaterial && o.material.depthTest === false)) { o.userData.m0 = o.material; sviMeshevi.push(o); } }); }
  function primijeni() {
    korijen.traverse((o) => { if (o.userData.unutra) o.visible = st.unutraVidljivo(o); });
    privremeno.splice(0).forEach((o) => { o.visible = false; });
    const prozirni = new Set(); st.prozirniId.forEach((id) => (dijelovi.get(id)?.objekti || []).forEach((o) => o.traverse((c) => { if (c.isMesh) prozirni.add(c); })));
    let odabrani = null;
    if (st.istaknuto && dijelovi.has(st.istaknuto)) {
      odabrani = new Set();
      dijelovi.get(st.istaknuto).objekti.forEach((o) => {
        o.traverse((c) => { if (c.isMesh) odabrani.add(c); });
        let p = o; while (p && p !== korijen) { if (!p.visible && (p.userData.unutra || p.userData.skriven)) { p.visible = true; privremeno.push(p); } p = p.parent; }
        o.traverse((c) => { if (!c.visible && (c.userData.skriven || c.userData.unutra) && (c === o || c.userData.dio === st.istaknuto)) { c.visible = true; privremeno.push(c); } });
      });
    }
    sviMeshevi.forEach((o) => {
      const m0 = o.userData.m0; if (!m0) return;
      let m = m0;
      if (odabrani) {
        if (odabrani.has(o)) m = o.userData.led ? m0 : klon(hiC, m0, (c) => { if (c.emissive) { c.emissive = new THREE.Color(0x19b7c9); c.emissiveIntensity = 0.5; } c.transparent = false; c.opacity = 1; c.depthWrite = true; });
        else m = klon(duhC, m0, (c) => { c.transparent = true; c.opacity = 0.1; c.depthWrite = false; if (c.emissive && !o.userData.led) c.emissive.setHex(0); });
      } else if (prozirni.has(o)) m = klon(prozC, m0, (c) => { c.transparent = true; c.opacity = 0.18; c.depthWrite = false; });
      o.material = m; o.userData.prozirno = prozirni.has(o);
    });
  }
  function istakni(id) { st.istaknuto = id && dijelovi.has(id) ? id : null; primijeni(); return st.istaknuto; }
  return { st, popisi, primijeni, istakni, get meshevi() { return sviMeshevi; } };
}

/* ====================================================================== ROBOT */
export function napraviRVM1(THREE, opcije = {}) {
  const O = Object.assign({ prihvatnica: KONFIG.prihvatnica !== null, kabeli: true, ploca: true, unutrasnjost: true, spoji: true }, opcije);
  const dijelovi = new Map();
  const A = alati(THREE, dijelovi);
  const { M, add, grupa, box, cyl, prsten, zaobljeni, tangentni, izvuci, cijev, spiralaGeo, stap, kugla, naljepnica, loft, dio, V3 } = A;
  const Mj = MJERE, d1 = Mj.d1, L2 = Mj.L2, L3 = Mj.L3, L4 = Mj.L4, P = Mj.podnozje, RM = Mj.rame;
  const hL = P.visinaLezaja, hS = hL + P.prsten;            /* vrh podnožja, dno struka */
  const zKd = d1 - RM.dolje, zKg = d1 + RM.gore;           /* dno i vrh kućišta ramena */

  const korijen = new THREE.Group(); korijen.name = 'RV-M1';
  const robot = grupa(korijen); robot.rotation.x = -PI / 2; robot.name = 'robot (KS robota)';
  const osi = [], razmak = [], unutra = [];   /* unutra: { g, os } — pogonski sklopovi */
  const UN = (p, os, id) => { const g = grupa(p); g.userData.unutra = true; g.userData.anim = true; g.visible = false; unutra.push({ g, os }); if (id) dio(id, g); return g; };
  const vijakGlava = (p, x, y, z, os, r = 0.0032) => { const v = cyl(r, 0, 0.002, os, M.vijak, 10); v.position[os] += 0; v.position.x += x; v.position.y += y; v.position.z += z; p.add(v); return v; };

  /* ------------------------------------------------------------ čelična ploča (opcija) */
  if (O.ploca) {
    const [pw, pd, ph] = STANICA.celicnaPloca.mjere;
    const pl = grupa(robot); dio('celicnaPloca', pl);
    add(pl, box(pw, pd, ph, M.plavaPloca), 0, 0, -ph / 2);
  }

  /* ------------------------------------------------------------ PODNOŽJE (nepomično) */
  const baza = grupa(robot); baza.name = 'podnožje'; dio('robot', baza);
  {
    const pr = grupa(baza); dio('prirubnicaPodnozja', pr);
    const s = new THREE.Shape(), hx = P.dubina / 2, hy = P.sirina / 2, c = 0.028;
    s.moveTo(-hx + c, -hy); s.lineTo(hx - c, -hy); s.lineTo(hx, -hy + c); s.lineTo(hx, hy - c); s.lineTo(hx - c, hy); s.lineTo(-hx + c, hy); s.lineTo(-hx, hy - c); s.lineTo(-hx, -hy + c); s.closePath();
    const rx = P.razmakRupaX / 2, ry = P.razmakRupaY / 2;
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const h = new THREE.Path(); h.absarc(a * rx, b * ry, P.promjerRupe / 2, 0, 2 * PI, true); s.holes.push(h); });
    pr.add(izvuci(s, 0, P.debljina, 'z', M.lijev, { t: 0.002, s: 0.002 }, 6));
    const vj = grupa(baza); dio('vijciPodnozja', vj);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      add(vj, cyl(0.0068, P.debljina, P.debljina + 0.008, 'z', M.cink, 16), a * rx, b * ry, 0);
      add(vj, cyl(0.0035, P.debljina + 0.0075, P.debljina + 0.0082, 'z', M.crnaM, 6), a * rx, b * ry, 0);
      add(vj, cyl(0.009, P.debljina, P.debljina + 0.0016, 'z', M.cink, 16), a * rx, b * ry, 0);
    });
    /* lijevano tijelo: od zaobljenog pravokutnika do kruga */
    const tijelo = grupa(baza); dio('podnozje', tijelo);
    const pres = []; const N = 9;
    for (let i = 0; i <= N; i++) {
      const u = i / N, e = u;
      pres.push({ z: P.debljina + (hL - P.debljina) * u, a: P.tijeloDolje[0] / 2 + (P.tijeloGore - P.tijeloDolje[0] / 2) * e, b: P.tijeloDolje[1] / 2 + (P.tijeloGore - P.tijeloDolje[1] / 2) * e, n: 5 - 3 * e, cx: 0, cy: 0 });
    }
    tijelo.add(loft(pres, M.lijev, 56));
    /* prednji poklopac (maslinasti), prati nagib prednje plohe */
    const pk = grupa(baza); dio('poklopacPodnozja', pk);
    const h0 = P.debljina + 0.02, h1 = hL - 0.04, xAt = (z) => { const u = (z - P.debljina) / (hL - P.debljina), e = u; return P.tijeloDolje[0] / 2 + (P.tijeloGore - P.tijeloDolje[0] / 2) * e; };
    const nag = Math.atan2(xAt(h0) - xAt(h1), h1 - h0);
    const pg = grupa(pk, (xAt(h0) + xAt(h1)) / 2 + 0.0006, 0, (h0 + h1) / 2); pg.rotation.y = -nag;
    add(pg, box(0.003, 0.082, h1 - h0, M.maslina), 0.0004, 0, 0);
    [[1, 0.6], [-1, -0.6]].forEach(([s2, dz]) => add(pg, cyl(0.0026, 0.0018, 0.0034, 'x', M.vijak, 8), 0, s2 * 0.035, dz * (h1 - h0) / 1.3));
    /* kutija priključaka straga */
    const kp = grupa(baza); dio('kutijaPrikljucaka', kp);
    const K = P.kutijaPrikljucaka, kx1 = -P.tijeloDolje[0] / 2 - K.dubina * 0.55, kx0 = -0.03;
    kp.add(izvuci(zaobljeni(kx0 - kx1, K.sirina, 0.016, (kx0 + kx1) / 2, 0), P.debljina, P.debljina + K.visina, 'z', M.lijev, { t: 0.004, s: 0.004 }, 6));
    const ploca = grupa(kp, kx1 - 0.0035, 0, P.debljina + K.visina / 2);
    add(ploca, box(0.004, K.sirina - 0.024, K.visina - 0.02, M.crna));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(ploca, cyl(0.0035, -0.004, -0.002, 'x', M.cink, 8), 0, a * (K.sirina / 2 - 0.02), b * (K.visina / 2 - 0.018)));
    const kon = (id, z) => { const g = grupa(ploca, 0, 0, z); dio(id, g); add(g, box(0.008, 0.072, 0.017, M.cink), -0.004); add(g, box(0.006, 0.062, 0.010, M.plavaI), -0.007); return g; };
    kon('konektorPower', 0.026); kon('konektorSignal', -0.026);
    const nal = naljepnica(0.07, 0.012, 4000, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = `${h * 0.5}px sans-serif`; g.textBaseline = 'middle'; g.fillText('⇩POWER  ⇧SIGNAL', w * 0.05, h * 0.55); }, 0xf2f2f2);
    nal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, -1, 0), V3(0, 0, 1), V3(-1, 0, 0))); nal.position.set(-0.0025, 0, 0); ploca.add(nal); dio('kutijaPrikljucaka', nal);
    /* ležaj J1 (čelični prsten) */
    const lz = grupa(baza); dio('lezajJ1', lz);
    lz.add(prsten(P.tijeloGore + 0.002, P.tijeloGore - 0.012, hL, hS, 'z', M.celik, 48));
    /* graničnik J1 (nepomični dio) */
    const gr = grupa(baza); dio('granicnikJ1', gr);
    add(gr, box(0.016, 0.012, 0.010, M.lijevT), -P.tijeloGore + 0.002, 0, hL - 0.004);
  }
  /* unutrašnjost podnožja: motor J1, enkoder, prijenos, granični prekidač, vodovi */
  const POG = [[], [], [], [], []];   /* po osi: { g, smjer: Vector3, raz } */
  function motorSklop(p, os, duz, r, idMotor, idEnk, idKoc, i, smjer) {
    /* duž lokalne osi 'os' (+): motor [0, duz], kolektor s četkicama, kočnica, enkoder; vraća krajeve */
    const mo = UN(p, i, idMotor); mo.userData.unutra = false; mo.visible = true;   /* posuda je vidljiva preko roditelja */
    const kuc = cyl(r, 0, duz, os, M.celikT, 24); mo.add(kuc);
    mo.add(cyl(r * 1.02, -0.002, 0.003, os, M.crna, 24));
    mo.add(cyl(r * 0.18, -0.012, duz + 0.006, os, M.celik, 10));
    const br = grupa(mo); dio('cetkiceMotora', br);
    const o2 = os === 'x' ? 'y' : 'x';
    [-1, 1].forEach((s2) => { const b = box(0.005, 0.005, 0.005, M.grafit); b.position[os] = duz + 0.004; b.position[o2] = s2 * r * 0.55; br.add(b); });
    add(br, cyl(r * 0.42, duz, duz + 0.008, os, M.bakar, 16));
    POG[i].push({ g: mo, smjer, raz: 1 });
    let a = duz + 0.012;
    if (idKoc) {
      const ko = UN(p, i, idKoc); ko.userData.unutra = false; ko.visible = true;
      ko.add(cyl(r * 0.95, a, a + 0.012, os, M.crna, 24)); ko.add(cyl(r * 0.8, a + 0.012, a + 0.016, os, M.tarno, 24)); ko.add(cyl(r * 0.6, a + 0.006, a + 0.009, os, M.bakar, 20));
      POG[i].push({ g: ko, smjer, raz: 1.7 }); a += 0.02;
    }
    const en = UN(p, i, idEnk); en.userData.unutra = false; en.visible = true;
    en.add(cyl(r * 0.85, a, a + 0.0015, os, M.disk, 24)); en.add(cyl(r * 0.9, a + 0.003, a + 0.012, os, M.mikro, 20));
    const gl = box(0.006, 0.006, 0.006, M.cip); gl.position[os] = a; gl.position[o2] = r * 0.7; en.add(gl);
    POG[i].push({ g: en, smjer, raz: idKoc ? 2.4 : 2 });
    return a + 0.012;
  }
  function granicni(p, id, x, y, z, rot = 0) {
    const g = grupa(p, x, y, z); dio(id, g); g.rotation.z = rot;
    add(g, box(0.014, 0.006, 0.008, M.mikro)); add(g, box(0.012, 0.0008, 0.001, M.celik), 0.004, 0, 0.0048); add(g, cyl(0.0012, -0.002, 0.002, 'y', M.bijeloP, 8), 0.010, 0, 0.0048);
    return g;
  }
  function remenGeo(x1, y1, r1, x2, y2, r2, deb = 0.0018) {
    const s = tangentni(x1, y1, r1 + deb, x2, y2, r2 + deb); s.holes.push(tangentni(x1, y1, r1, x2, y2, r2, THREE.Path));
    return s;
  }
  function remenica(p, os, r, a0, a1, id = 'remenice') { const m = cyl(r, a0, a1, os, M.remenica, 24); const g = grupa(p); g.add(m); g.add(cyl(r * 1.15, a0 - 0.001, a0, os, M.remenica, 24)); g.add(cyl(r * 1.15, a1, a1 + 0.001, os, M.remenica, 24)); dio(id, g); return g; }
  const unBaza = UN(baza, 0);
  {
    const mg = grupa(unBaza, 0.032, 0.03, P.debljina + 0.012);
    motorSklop(mg, 'z', 0.06, 0.02, 'motorJ1', 'enkoderJ1', null, 0, V3(1.6, 0, 0));   /* rastavljanje: van kroz prednji poklopac */
    /* motor stoji prema gore: izlaz gore — okreni */
    mg.rotation.x = PI; mg.position.z = P.debljina + 0.012 + 0.075;
    const pj = grupa(unBaza); dio('prijenosJ1', pj);
    add(pj, cyl(0.009, hL - 0.012, hL - 0.002, 'z', M.celik, 14), 0.032, 0.03, 0); add(pj, cyl(0.003, P.debljina + 0.1, hL - 0.01, 'z', M.celik, 8), 0.032, 0.03, 0);
    granicni(unBaza, 'granicniJ1', -0.05, 0.03, hL - 0.012);
    const vod = grupa(unBaza); dio('unutarnjiVodovi', vod);
    cijev(vod, [[-0.07, 0.01, P.debljina + 0.05], [-0.03, 0.0, P.debljina + 0.07], [-0.01, -0.02, hL - 0.01], [0, -0.02, hS + 0.02]], 0.006, M.kabelS, 20, 6);
  }

  /* ------------------------------------------------------------ STRUK (J1) i KUĆIŠTE RAMENA */
  razmak[0] = grupa(robot); const os0 = grupa(razmak[0]); osi.push(os0); os0.name = 'J1'; dio('robot', razmak[0]);
  {
    const sk = grupa(os0); dio('struk', sk);
    sk.add(cyl(Mj.struk.polumjer, hS, hS + 0.026, 'z', M.lijev, 48));
    add(sk, prsten(Mj.struk.polumjer + 0.0005, Mj.struk.polumjer - 0.004, hS + 0.012, hS + 0.0135, 'z', M.lijevT, 48));
    const pres = []; const N = 7, z0 = hS + 0.026, z1 = zKd + 0.012;
    for (let i = 0; i <= N; i++) { const u = i / N, e = u * u * (3 - 2 * u); pres.push({ z: z0 + (z1 - z0) * u, a: Mj.struk.polumjer + (Mj.struk.vrat[0] / 2 + 0.012 - Mj.struk.polumjer) * e, b: Mj.struk.polumjer + (Mj.struk.vrat[1] / 2 + 0.03 - Mj.struk.polumjer) * e, n: 2 + 2.5 * e, cx: -0.028 * e, cy: 0 }); }
    sk.add(loft(pres, M.lijev, 48, [false, true]));
    /* zupčasti vijenac J1 (unutra) */
    const vj = UN(os0, 0); dio('prijenosJ1', vj);
    vj.add(prsten(0.06, 0.05, hL - 0.012, hL - 0.002, 'z', M.celikT, 48));
    /* graničnik na struku */
    const gr = grupa(os0); dio('granicnikJ1', gr); add(gr, box(0.012, 0.012, 0.008, M.lijevT), -Mj.struk.polumjer + 0.003, 0.016, hS + 0.006);
    /* uvodnica kabela straga */
    const uv = grupa(os0); dio('uvodnicaKabela', uv);
    const ux = -Mj.struk.polumjer - 0.008, uz = hS + 0.02;
    add(uv, cyl(0.011, 0, 0.016, 'x', M.kabelB, 14), ux - 0.012, -0.03, uz); add(uv, cyl(0.0085, 0, 0.012, 'x', M.kabelB, 6), ux - 0.024, -0.03, uz);
    add(uv, cyl(0.011, 0, 0.016, 'x', M.kabelB, 14), ux - 0.012, 0.03, uz); add(uv, cyl(0.0085, 0, 0.012, 'x', M.kabelB, 6), ux - 0.024, 0.03, uz);
  }
  {
    /* kućište ramena: bočni blokovi, stražnji most, kape */
    const kr = grupa(os0); dio('kucisteRamena', kr);
    const Lb = RM.duljinaNatrag, yo = RM.sirina / 2, yi = RM.utor / 2;
    const profil = zaobljeni(Lb + 0.02, RM.gore + RM.dolje, 0.024, -Lb / 2 + 0.01, d1 + (RM.gore - RM.dolje) / 2);
    kr.add(izvuci(profil, yi, yo, 'y', M.bez, { t: 0.006, s: 0.004, seg: 2 }, 8));
    kr.add(izvuci(profil, -yo, -yi, 'y', M.bez, { t: 0.006, s: 0.004, seg: 2 }, 8));
    const most = zaobljeni(Lb - 0.07, RM.gore + RM.dolje, 0.024, -Lb / 2 - 0.035 + 0.01, d1 + (RM.gore - RM.dolje) / 2);
    kr.add(izvuci(most, -yi - 0.002, yi + 0.002, 'y', M.bez, { t: 0.003, s: 0.003, seg: 1 }, 8));
    /* dno prednjeg dijela prema struku */
    add(kr, box(0.06, RM.utor + 0.004, 0.022, M.bez), -0.04, 0, zKd + 0.011);
    /* naljepnice na vrhu i natpisna pločica straga */
    add(kr, box(0.05, 0.035, 0.0008, M.bijeloP), -0.12, 0.04, zKg + 0.0006); add(kr, box(0.04, 0.03, 0.0008, M.bijeloP), -0.12, -0.045, zKg + 0.0006);
    const np = grupa(os0); dio('natpisnaPlocica', np); add(np, box(0.0008, 0.06, 0.035, M.alu), -Lb - 0.0005, 0, d1 - 0.02);
    const kapa = (id, s) => { const g = grupa(os0); dio(id, g); const y0 = s * yo; g.add(cyl(RM.polumjerKape, y0, y0 + s * RM.izbocenjeKape * 0.6, 'y', M.bez, 48)); g.add(cyl(RM.polumjerKape * 0.82, y0 + s * RM.izbocenjeKape * 0.6, y0 + s * RM.izbocenjeKape, 'y', M.bez, 48)); g.children.forEach((c) => { c.position.z += d1; }); return g; };
    kapa('kapaRamenaD', -1); kapa('kapaRamenaL', 1);
    /* spiralni kabeli uz struk (od stražnjeg dna kućišta do uvodnice) */
    if (O.kabeli) {
      const sp = grupa(os0); dio('spiralniKabeli', sp);
      const ux = -Mj.struk.polumjer - 0.034, uz = hS + 0.02;
      [-0.03, 0.03].forEach((yy, k) => {
        const geo = spiralaGeo([[-0.14, yy, zKd - 0.004], [-0.155 - 0.01 * k, yy * 1.6, zKd - 0.03], [-0.15, yy * 2.2, hS - 0.02 - 0.008 * k], [-0.125, yy * 1.8, hS - 0.01], [ux - 0.012, yy, uz + 0.004], [ux + 0.004, yy, uz]], 0.014, 0.0088, 0.0036, 6);
        sp.add(new THREE.Mesh(geo, M.kabel));
      });
      add(sp, cyl(0.008, zKd - 0.012, zKd, 'z', M.kabel, 10), -0.14, -0.03, 0); add(sp, cyl(0.008, zKd - 0.012, zKd, 'z', M.kabel, 10), -0.14, 0.03, 0);
    }
    /* unutra: motori J2 i J3 u stražnjem dijelu, remeni do osi ramena */
    const u2 = UN(os0, 1), u3 = UN(os0, 2);
    const xm = -0.15, zm = d1 - 0.012, rm = 0.021;
    const m2 = grupa(u2, xm, -0.088, zm);                       /* sklop od y = −0,088 prema sredini (+y) */
    motorSklop(m2, 'y', 0.04, rm, 'motorJ2', 'enkoderJ2', 'kocnicaJ2', 1, V3(-1, 0, 0));
    const m3 = grupa(u3, xm, 0.088, zm); m3.rotation.z = PI;     /* zrcalno (od +0,088 prema sredini); lokalni +x je u roditelju −x */
    motorSklop(m3, 'y', 0.04, rm, 'motorJ3', 'enkoderJ3', 'kocnicaJ3', 2, V3(1, 0, 0));
    /* remenice i remeni (ravnina y = ±0,092) */
    const yb = 0.093;
    remenica(u2, 'y', 0.011, -yb - 0.006, -yb + 0.006).children.forEach((c) => { c.position.x += xm; c.position.z += zm; });
    remenica(u3, 'y', 0.011, yb - 0.006, yb + 0.006).children.forEach((c) => { c.position.x += xm; c.position.z += zm; });
    const r2 = grupa(u2); dio('remenJ2', r2); r2.add(izvuci(remenGeo(xm, zm, 0.011, 0, d1, 0.036), -yb - 0.005, -yb + 0.005, 'y', M.remen, null, 24));
    const r3 = grupa(u3); dio('remenJ3', r3); r3.add(izvuci(remenGeo(xm, zm, 0.011, 0, d1, 0.03), yb - 0.005, yb + 0.005, 'y', M.remen, null, 24));
    granicni(u2, 'granicniJ2', -0.03, -0.06, d1 + 0.04);
    const vod = grupa(u2); dio('unutarnjiVodovi', vod); cijev(vod, [[-0.17, 0, zKd + 0.01], [-0.12, 0, d1 - 0.05], [-0.05, 0, d1 - 0.06]], 0.005, M.kabelS, 16, 6);
  }

  /* ------------------------------------------------------------ NADLAKTICA (J2) */
  razmak[1] = grupa(os0, 0, 0, d1); const os1 = grupa(razmak[1]); osi.push(os1); os1.name = 'J2';
  const NA = Mj.nadlaktica, PLm = Mj.podlaktica;
  {
    const na = grupa(os1); dio('nadlaktica', na);
    const w = NA.sirina / 2;
    na.add(izvuci(tangentni(0, 0, NA.rRame, L2, 0, NA.rLakat), -w, w, 'y', M.ruka, { t: 0.006, s: 0.004, seg: 2 }, 28));
    const pk = grupa(os1); dio('poklopacNadlaktice', pk);
    const vj = grupa(os1); dio('vijciPoklopaca', vj);
    [-1, 1].forEach((s) => {
      const y0 = s * w, y1 = s * (w + 0.0022);
      pk.add(izvuci(tangentni(0.035, 0, NA.rRame * 0.62, L2 - 0.03, 0, NA.rLakat * 0.62), Math.min(y0, y1), Math.max(y0, y1), 'y', M.rukaS, { t: 0.0008, s: 0.0008, seg: 1 }, 20));
      [[0.03, 0.035], [0.12, 0.034], [0.21, 0.031], [0.03, -0.035], [0.12, -0.034], [0.21, -0.031]].forEach(([x, z]) => { const v = cyl(0.0028, y0, y0 + s * 0.0032, 'y', M.vijak, 10); v.position.x = x; v.position.z = z; vj.add(v); });
      /* disk osi lakta */
      add(pk, cyl(0.022, s * (w + 0.0022), s * (w + 0.003), 'y', M.rukaS, 28), L2, 0, 0);
      add(vj, cyl(0.0025, s * (w + 0.003), s * (w + 0.0042), 'y', M.vijak, 10), L2, 0, 0);
    });
    const osr = grupa(os1); dio('osRamena', osr); osr.add(cyl(0.012, -RM.sirina / 2 - 0.002, RM.sirina / 2 + 0.002, 'y', M.celik, 16));
    /* unutra: remenice na osi ramena, drugi remen J3 kroz nadlakticu */
    const u = UN(os1, 2);
    remenica(u, 'y', 0.036, -0.098, -0.086); remenica(u, 'y', 0.03, 0.086, 0.098);
    remenica(u, 'y', 0.022, 0.012, 0.024); remenica(u, 'y', 0.022, 0.012, 0.024).children.forEach((c) => { c.position.x += L2; });
    const r3b = grupa(u); dio('remenJ3', r3b); r3b.add(izvuci(remenGeo(0, 0, 0.022, L2, 0, 0.022), 0.013, 0.023, 'y', M.remen, null, 24));
    granicni(u, 'granicniJ3', L2 - 0.055, -0.02, 0.03);
    const vod = grupa(u); dio('unutarnjiVodovi', vod); cijev(vod, [[0.02, -0.02, -0.02], [0.12, -0.02, -0.025], [L2 - 0.03, -0.02, -0.02]], 0.004, M.kabelS, 16, 6);
  }

  /* ------------------------------------------------------------ PODLAKTICA (J3) */
  razmak[2] = grupa(os1, L2, 0, 0); const os2 = grupa(razmak[2]); osi.push(os2); os2.name = 'J3';
  const sidroKabela = new THREE.Object3D(); /* za spiralni kabel prihvatnice */
  {
    const pl = grupa(os2); dio('podlaktica', pl);
    const w = PLm.sirina / 2, wv = w - 0.008;   /* vilica šake: dvije ploče */
    pl.add(izvuci(tangentni(-0.004, 0, PLm.rLakat, L3 - 0.05, 0, PLm.rSaka), -w, w, 'y', M.ruka, { t: 0.005, s: 0.004, seg: 2 }, 24));
    [-1, 1].forEach((s) => pl.add(izvuci(tangentni(L3 - 0.07, 0, PLm.rSaka, L3, 0, PLm.rSaka), s > 0 ? wv : -w, s > 0 ? w : -wv, 'y', M.ruka, { t: 0.002, s: 0.002, seg: 1 }, 24)));
    const pk = grupa(os2); dio('poklopacPodlaktice', pk); const vj = grupa(os2); dio('vijciPoklopaca', vj);
    [-1, 1].forEach((s) => {
      const y0 = s * w, y1 = s * (w + 0.002);
      pk.add(izvuci(tangentni(0.035, 0, PLm.rLakat * 0.66, L3 - 0.03, 0, PLm.rSaka * 0.66), Math.min(y0, y1), Math.max(y0, y1), 'y', M.rukaS, { t: 0.0008, s: 0.0008, seg: 1 }, 20));
      [[0.04, 0.026], [0.13, 0.022], [0.04, -0.026], [0.13, -0.022]].forEach(([x, z]) => { const v = cyl(0.0026, y0, y0 + s * 0.003, 'y', M.vijak, 10); v.position.x = x; v.position.z = z; vj.add(v); });
    });
    const kj = grupa(os2); dio('kucisteJ4', kj); kj.add(izvuci(zaobljeni(0.05, 0.032, 0.006, 0.075, 0), PLm.rLakat * -1 - 0.018, -PLm.rLakat + 0.004, 'z', M.rukaT, { t: 0.002, s: 0.002 }, 4));
    const ol = grupa(os2); dio('osLakta', ol); ol.add(cyl(0.01, -NA.sirina / 2 - 0.004, NA.sirina / 2 + 0.004, 'y', M.celik, 14));
    const on = grupa(os2); dio('osNagiba', on); add(on, cyl(0.008, -w - 0.001, w + 0.001, 'y', M.celik, 12), L3, 0, 0);
    /* crni kabel uz podlakticu do sidra spiralnog kabela */
    if (O.kabeli && O.prihvatnica) {
      const kb = grupa(os2); dio('kabelPrihvatnice', kb);
      cijev(kb, [[0.03, -w - 0.003, 0.03], [0.06, -w - 0.004, 0.01], [0.1, -w - 0.004, -0.02], [L3 - 0.04, -w - 0.004, -PLm.rSaka - 0.002]], 0.0022, M.kabel, 24, 6);
      sidroKabela.position.set(L3 - 0.04, -w - 0.004, -PLm.rSaka - 0.002); os2.add(sidroKabela);
    }
    /* unutra: motor J4, remen do osi nagiba */
    const u = UN(os2, 3);
    const m4 = grupa(u, 0.05, -0.022, 0.004); m4.rotation.z = 0;
    motorSklop(m4, 'y', 0.026, 0.013, 'motorJ4', 'enkoderJ4', null, 3, V3(0, 1, 0));
    m4.scale.y = 1;
    remenica(u, 'y', 0.008, -0.026, -0.018).children.forEach((c) => { c.position.x += 0.05; c.position.z += 0.004; });
    remenica(u, 'y', 0.02, -0.026, -0.018).children.forEach((c) => { c.position.x += L3; });
    const r4 = grupa(u); dio('remenJ4', r4); r4.add(izvuci(remenGeo(0.05, 0.004, 0.008, L3, 0, 0.02), -0.0255, -0.0185, 'y', M.remen, null, 24));
    granicni(u, 'granicniJ4', L3 - 0.03, 0.012, 0.022);
    const vod = grupa(u); dio('unutarnjiVodovi', vod); cijev(vod, [[0.0, 0.012, -0.02], [0.07, 0.012, -0.02], [L3 - 0.02, 0.012, -0.015]], 0.0035, M.kabelS, 14, 6);
  }

  /* ------------------------------------------------------------ ŠAKA (J4) i OKRET (J5) */
  razmak[3] = grupa(os2, L3, 0, 0); const os3 = grupa(razmak[3]); osi.push(os3); os3.name = 'J4';
  const orij = grupa(os3); orij.rotation.y = PI / 2; orij.name = 'os alata (z)';   /* lokalna z = smjer alata */
  const SKm = Mj.saka;
  {
    const sk = grupa(orij); dio('saka', sk);
    sk.add(cyl(0.024, -(PLm.sirina / 2 - 0.0085), PLm.sirina / 2 - 0.0085, 'y', M.crna, 28));
    add(sk, box(0.036, PLm.sirina - 0.018, 0.03, M.crna), 0, 0, 0.012);
    const ko = grupa(orij); dio('kucisteOkreta', ko);
    ko.add(cyl(SKm.polumjer, 0.026, L4 - 0.007, 'z', M.crna, 40));
    ko.add(prsten(SKm.polumjer + 0.0004, SKm.polumjer - 0.003, L4 - 0.024, L4 - 0.022, 'z', M.crnaM, 40));
    /* unutra: motor J5 s enkoderom, zupčanici */
    const u = UN(orij, 4);
    const m5 = grupa(u, 0.014, 0, L4 - 0.012); m5.rotation.x = PI;
    motorSklop(m5, 'z', 0.022, 0.009, 'motorJ5', 'enkoderJ5', null, 4, V3(1, 0, 0));
    const pj = grupa(u); dio('prijenosJ5', pj); add(pj, cyl(0.016, L4 - 0.012, L4 - 0.008, 'z', M.celikT, 24)); add(pj, cyl(0.006, L4 - 0.012, L4 - 0.008, 'z', M.celik, 12), 0.014, 0, 0);
    granicni(u, 'granicniJ5', -0.02, 0, L4 - 0.02);
  }
  razmak[4] = grupa(orij); const os4 = grupa(razmak[4]); osi.push(os4); os4.name = 'J5';
  const flange = new THREE.Object3D(); flange.name = 'prirubnica'; flange.position.z = L4; os4.add(flange);
  const tcp = new THREE.Object3D(); tcp.name = 'TCP'; tcp.position.z = L4 + TL_ZADANO / 1000; os4.add(tcp);
  {
    const pr = grupa(os4); dio('prirubnicaSake', pr);
    pr.add(cyl(SKm.prirubnicaR, L4 - 0.007, L4, 'z', M.celikT, 32));
    for (let k = 0; k < 4; k++) { const a = k / 4 * 2 * PI + PI / 4; add(pr, cyl(0.0018, L4 - 0.001, L4 + 0.0004, 'z', M.vijak, 8), Math.cos(a) * 0.017, Math.sin(a) * 0.017, 0); }
    /* TCP oznaka (skrivena; prikazuje je istakni('tcp') i pomocni.okviri) */
    const tm = new THREE.Mesh(new THREE.OctahedronGeometry(0.007), new THREE.MeshBasicMaterial({ color: 0x19b7c9 })); tm.userData.skriven = true; tm.visible = false; tcp.add(tm); dio('tcp', tm);
  }
  /* prihvatnica HM-01 */
  razmak[5] = grupa(flange); const prihv = razmak[5];
  const prsti = [];
  const sidroPrihv = new THREE.Object3D();
  let otvorenost = 1;
  if (O.prihvatnica) {
    const [tw, td, tl] = Mj.prihvatnica.tijelo, [fw, fd, fl] = Mj.prihvatnica.prst;
    const ph = grupa(prihv); dio('prihvatnica', ph);
    add(ph, box(tw, td, tl, M.crna), 0, 0, tl / 2);
    add(ph, box(tw + 0.002, td + 0.002, 0.004, M.crnaM), 0, 0, 0.002);
    add(ph, box(tw * 0.42, td + 0.0012, tl * 0.6, M.crnaM), 0, 0, tl * 0.5);   /* šav poklopca */
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(ph, cyl(0.0022, td / 2, td / 2 + 0.0012, 'y', M.vijak, 8), a * tw * 0.3, 0, tl * (b > 0 ? 0.85 : 0.15)));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(ph, cyl(0.0022, -td / 2 - 0.0012, -td / 2, 'y', M.vijak, 8), a * tw * 0.3, 0, tl * (b > 0 ? 0.85 : 0.15)));
    add(ph, box(tw * 0.9, 0.012, 0.012, M.crnaM), 0, 0, tl + 0.006);   /* vodilica prstiju */
    const kn = grupa(prihv); dio('konektorPrihvatnice', kn);
    add(kn, cyl(0.0055, td / 2, td / 2 + 0.014, 'y', M.cink, 16), 0, 0, tl * 0.55); add(kn, cyl(0.0042, td / 2 + 0.014, td / 2 + 0.024, 'y', M.cink, 6), 0, 0, tl * 0.55);
    sidroPrihv.position.set(0, td / 2 + 0.024, tl * 0.55); prihv.add(sidroPrihv);
    const pg = grupa(prihv); dio('prstiPrihvatnice', pg);
    [-1, 1].forEach((s) => {
      const f = grupa(pg); f.userData.anim = true; f.userData.s = s;
      add(f, box(fw, fd, fl, M.crna), 0, 0, tl + 0.012 + fl / 2 - 0.004);
      add(f, box(fw * 0.5, fd * 1.25, 0.008, M.crna), s * fw * 0.1, 0, tl + 0.008);
      add(f, box(0.0025, fd * 0.85, fl * 0.55, M.crnaM), -s * (fw / 2 + 0.0008), 0, tl + 0.012 + fl * 0.6);
      prsti.push(f);
    });
    const um = UN(prihv, -1, 'motorPrihvatnice'); um.add(cyl(0.011, 0.01, 0.042, 'z', M.celikT, 18)); um.add(cyl(0.004, 0.042, 0.06, 'z', M.celik, 8));
    const mh = UN(prihv, -1, 'mehanizamPrihvatnice'); mh.add(cyl(0.0035, -tw * 0.42, tw * 0.42, 'x', M.celik, 10)); mh.children[0].position.z = tl - 0.006; add(mh, box(0.008, 0.008, 0.008, M.mjed || M.zlato), 0, 0, tl - 0.006);
  }
  /* spiralni kabel prihvatnice — geometrija se obnavlja u postavi() */
  const spirala = { mesh: null };
  if (O.kabeli && O.prihvatnica) { spirala.mesh = new THREE.Mesh(new THREE.BufferGeometry(), M.kabel); spirala.mesh.userData.nespajaj = true; robot.add(spirala.mesh); dio('kabelPrihvatnice', spirala.mesh); }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _inv = new THREE.Matrix4();
  function obnoviSpiralu() {
    if (!spirala.mesh) return;
    korijen.updateMatrixWorld(true); _inv.copy(robot.matrixWorld).invert();
    sidroKabela.getWorldPosition(_a).applyMatrix4(_inv); sidroPrihv.getWorldPosition(_b).applyMatrix4(_inv);
    const d = _a.distanceTo(_b), sred = _a.clone().add(_b).multiplyScalar(0.5); sred.z -= 0.025 + 0.15 * d;
    const p1 = _a.clone().lerp(sred, 0.45), p2 = _b.clone().lerp(sred, 0.45);
    const geo = spiralaGeo([_a, p1, sred, p2, _b], 0.0075, 0.0062, 0.0021, 5);
    spirala.mesh.geometry.dispose(); spirala.mesh.geometry = geo;
  }

  /* ------------------------------------------------------------ kabeli prema DUM1 (početni komadi) */
  const kabeli = grupa(robot); kabeli.name = 'kabeli';
  if (O.kabeli) {
    const kx = -P.tijeloDolje[0] / 2 - P.kutijaPrikljucaka.dubina * 0.55 - 0.012, kz = P.debljina + P.kutijaPrikljucaka.visina / 2;
    const k1 = grupa(kabeli); dio('kabelPower', k1); add(k1, box(0.014, 0.07, 0.02, M.cink), kx, 0, kz + 0.026); cijev(k1, [[kx - 0.006, 0, kz + 0.026], [kx - 0.06, 0.0, kz + 0.02], [kx - 0.12, -0.03, 0.012], [kx - 0.3, -0.06, 0.006]], 0.0055, M.kabel, 24, 8);
    const k2 = grupa(kabeli); dio('kabelSignal', k2); add(k2, box(0.014, 0.07, 0.02, M.cink), kx, 0, kz - 0.026); cijev(k2, [[kx - 0.006, 0, kz - 0.026], [kx - 0.05, 0.02, kz - 0.03], [kx - 0.12, 0.04, 0.01], [kx - 0.3, 0.07, 0.006]], 0.005, M.kabel, 24, 8);
  }

  /* ------------------------------------------------------------ pomoćni prikazi */
  const pomG = { osi: [], okviri: [], rp: [] };
  {
    const strelica = (p, pos, smjer, L = 0.11) => {
      const g = grupa(p); g.position.copy(pos); g.quaternion.setFromUnitVectors(V3(0, 1, 0), smjer.clone().normalize());
      const m = M.pomocna;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, L, 8), m); s.position.y = 0; g.add(s);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 12), m); c.position.y = L / 2 + 0.011; g.add(c);
      const lukG = new THREE.TorusGeometry(0.022, 0.0016, 6, 24, PI * 1.4); const luk = new THREE.Mesh(lukG, m); luk.rotation.x = PI / 2; luk.position.y = L / 2 - 0.01; g.add(luk);
      g.renderOrder = 10; g.traverse((o) => { o.renderOrder = 10; }); g.visible = false; pomG.osi.push(g); return g;
    };
    strelica(baza, V3(0, 0, d1 + 0.12), V3(0, 0, ZNAK_J1), 0.16);
    strelica(os0, V3(0, -RM.sirina / 2 - 0.05, d1), V3(0, -1, 0));
    strelica(os1, V3(L2, -NA.sirina / 2 - 0.05, 0), V3(0, -1, 0));
    strelica(os2, V3(L3, -PLm.sirina / 2 - 0.05, 0), V3(0, -1, 0));
    strelica(os4, V3(0, 0, L4 + 0.03), V3(0, 0, 1), 0.08);
    const okv = (p, z = 0, vel = 0.07) => { const a = new THREE.AxesHelper(vel); a.position.z = z; a.material.depthTest = false; a.renderOrder = 11; a.visible = false; p.add(a); pomG.okviri.push(a); };
    okv(robot, 0, 0.12); okv(os1); okv(os2); okv(os3); okv(os4, L4, 0.05); okv(tcp, 0, 0.05);
    /* radni prostor: obris točke šake u ravnini ruke (na struku) + luk dosega na podlozi */
    const obris = KIN.obrisRadnogProstora(40).map(([r, z]) => V3(r, 0, z));
    const lm = new THREE.LineBasicMaterial({ color: 0xff8a1f, depthTest: false, transparent: true });
    const lin = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(obris), lm); lin.renderOrder = 10; os0.add(lin); pomG.rp.push(lin);
    const sh = new THREE.Shape(obris.map((v) => new THREE.Vector2(v.x, v.z)));
    const plo = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    plo.rotation.x = PI / 2; os0.add(plo); pomG.rp.push(plo);
    const doseg = L2 + L3, pts = [];
    for (let k = 0; k <= 60; k++) { const a = OSI[0].min + (OSI[0].max - OSI[0].min) * k / 60; pts.push(V3(Math.cos(a * ZNAK_J1) * doseg, Math.sin(a * ZNAK_J1) * doseg, 0.002)); }
    pts.push(V3(0, 0, 0.002)); pts.unshift(V3(0, 0, 0.002));
    const lukL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm); baza.add(lukL); pomG.rp.push(lukL);
    pomG.rp.forEach((o) => { o.visible = false; });
  }
  const pomocni = {
    osi(v) { pomG.osi.forEach((o) => { o.visible = !!v; }); },
    okviri(v) { pomG.okviri.forEach((o) => { o.visible = !!v; }); dijelovi.get('tcp').objekti.forEach((o) => { o.visible = !!v; }); },
    radniProstor(v) { pomG.rp.forEach((o) => { o.visible = !!v; }); }
  };

  /* ------------------------------------------------------------ stanje i funkcije */
  const q = [0, 0, 0, 0, 0];
  const OSOSI = [V3(0, 0, ZNAK_J1), V3(0, -1, 0), V3(0, -1, 0), V3(0, -1, 0), V3(0, 0, 1)];
  function postavi(qn) {
    for (let i = 0; i < 5; i++) { const v = Number(qn && qn[i]) || 0; q[i] = v; osi[i].quaternion.setFromAxisAngle(OSOSI[i], v); }
    korijen.updateMatrixWorld(true); obnoviSpiralu();
  }
  function prihvatnica(s) {
    otvorenost = Math.max(0, Math.min(1, Number(s)));
    const raz = 0.002 + (PRIHVATNICA.hod / 2) * otvorenost, fw = Mj.prihvatnica.prst[0];
    prsti.forEach((f) => { f.position.x = f.userData.s * (raz + fw / 2); });
    korijen.updateMatrixWorld(true);
  }
  function postaviTL(m) { tcp.position.z = L4 + Math.max(0, Number(m) || 0); korijen.updateMatrixWorld(true); }

  const sus = sustavIsticanja(THREE, korijen, dijelovi);
  const st = { unutra: false, os: [0, 0, 0, 0, 0], rastav: 0 };
  const LJ_OSI = [['podnozje', 'poklopacPodnozja', 'kutijaPrikljucaka', 'struk'], ['kucisteRamena', 'kapaRamenaD'], ['kucisteRamena', 'kapaRamenaL', 'nadlaktica', 'poklopacNadlaktice', 'vijciPoklopaca'], ['podlaktica', 'poklopacPodlaktice', 'kucisteJ4', 'vijciPoklopaca'], ['kucisteOkreta', 'saka', 'prihvatnica']];
  const SVE_LJ = ['podnozje', 'poklopacPodnozja', 'kutijaPrikljucaka', 'struk', 'kucisteRamena', 'kapaRamenaD', 'kapaRamenaL', 'nadlaktica', 'poklopacNadlaktice', 'vijciPoklopaca', 'podlaktica', 'poklopacPodlaktice', 'kucisteJ4', 'kucisteOkreta', 'saka', 'prihvatnica', 'spiralniKabeli'];
  sus.st.unutraVidljivo = (o) => { const u = unutra.find((x) => x.g === o); if (!u) return st.unutra; return st.unutra || (u.os >= 0 && st.os[u.os] > 0); };
  function primijeni() {
    const s = new Set(); if (st.unutra) SVE_LJ.forEach((x) => s.add(x)); st.os.forEach((t, i) => { if (t > 0) LJ_OSI[i].forEach((x) => s.add(x)); });
    sus.st.prozirniId = s; sus.primijeni();
  }
  function istakni(id) { sus.st.istaknuto = id && dijelovi.has(id) ? id : null; primijeni(); return sus.st.istaknuto; }
  function unutrasnjost(v) { st.unutra = !!v; primijeni(); }
  POG.forEach((l) => l.forEach((d) => { d.p0 = d.g.position.clone(); }));
  function rastaviOs(i, t) {
    if (i < 0 || i > 4) return; t = Math.max(0, Math.min(1, Number(t) || 0)); st.os[i] = t;
    POG[i].forEach((d) => { d.g.position.copy(d.p0).addScaledVector(d.smjer, 0.045 * d.raz * t); });
    primijeni(); korijen.updateMatrixWorld(true);
  }
  const RAST = [V3(0, 0, 0.11), V3(0, 0, 0.11), V3(0.07, 0, 0), V3(0.06, 0, 0), V3(0, 0, 0.035), V3(0, 0, 0.035)];
  const razmak0 = razmak.map((r) => r.position.clone());
  function rastavi(t) {
    t = Math.max(0, Math.min(1, Number(t) || 0)); st.rastav = t;
    razmak.forEach((r, i) => { r.position.copy(razmak0[i]).addScaledVector(RAST[i], t); });
    korijen.updateMatrixWorld(true); obnoviSpiralu();
  }
  function azuriraj() { /* model nema vremenskih učinaka; postoji radi ugovora */ }

  /* ------------------------------------------------------------ završetak gradnje */
  if (O.spoji !== false) spojiStaticno(THREE, korijen);
  sus.popisi();
  postavi(ORG); prihvatnica(1);
  primijeni();
  if (!O.unutrasnjost) unutra.forEach(({ g }) => { g.parent && g.parent.remove(g); });

  return {
    korijen, osi, postavi, prihvatnica, flange, tcp, postaviTL, dijelovi, istakni, rastavi, rastaviOs, unutrasnjost, pomocni, azuriraj,
    /* dodatno (izvan ugovora) */
    robot, q, M, osOsi: OSOSI, kabeli, stanje: st, get otvorenost() { return otvorenost; }
  };
}

/* ====================================================================== UPRAVLJAČKA JEDINICA DUM1 (scena: Y gore, prednja ploča prema +X) */
export function napraviDUM1(THREE, opcije = {}) {
  const O = Object.assign({ kabeli: true }, opcije);
  const dijelovi = new Map();
  const A = alati(THREE, dijelovi);
  const { M, add, grupa, box, cyl, zaobljeni, izvuci, cijev, naljepnica, led, dio } = A;
  const [W, H, D] = MJERE.dum1;   /* širina (Z), visina (Y), dubina (X) */
  const grupaD = new THREE.Group(); grupaD.name = 'DUM1';
  const korp = grupa(grupaD); dio('dum1', korp);
  const kuc = grupa(korp); dio('kucisteDum1', kuc);
  /* kućište: donji okvir i poklopac koji prelazi preko bokova */
  add(kuc, box(D - 0.004, H - 0.004, W - 0.012, M.dum), 0, H / 2, 0);
  add(kuc, box(D, 0.003, W, M.dum), 0, H - 0.0015, 0);
  [-1, 1].forEach((s) => add(kuc, box(D, H * 0.9, 0.003, M.dum), 0, H * 0.55, s * (W / 2 - 0.0015)));
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(kuc, box(0.03, 0.01, 0.03, M.crnaM), a * (D / 2 - 0.03), 0.005, b * (W / 2 - 0.03)));
  /* upozorenja na poklopcu (bez teksta proizvođača) */
  [[-0.08, 0.1], [0.02, 0.05], [0.0, -0.11]].forEach(([x, z]) => add(kuc, box(0.07, 0.0006, 0.06, M.bijeloP), x, H + 0.0003, z));
  /* ---- prednja ploča */
  const pp = grupa(korp, D / 2, 0, 0); dio('prednjaPloca', pp);
  const zS = W / 2 - 0.06;   /* stupac elemenata (lijevo gledano sprijeda = +Z) */
  add(pp, box(0.002, H * 0.62, 0.042, M.dumP), 0.001, H * 0.42, zS);
  const nl = naljepnica(W * 0.5, H * 0.8, 1200, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#5b5b58'; g.font = `${Math.round(h * 0.045)}px sans-serif`; g.textBaseline = 'middle';
    const red = [['POWER', 0.06], ['EMG. STOP', 0.25], ['ERROR', 0.39], ['EXECUTE', 0.47], ['START', 0.6], ['STOP', 0.73], ['RESET', 0.86]];
    red.forEach(([t, y]) => g.fillText(t, w * 0.03, h * y));
  }, 0xd6d5cc, { transparent: true });
  nl.rotation.y = PI / 2; nl.position.set(0.0012, H * 0.48, zS - 0.04 - W * 0.25); pp.add(nl);
  const yEl = (f) => H * (0.88 - f * 0.8);
  const ledovi = {};
  const mkLed = (ime, id, boja, f) => { const l = led(0.005, boja, 0.004, 'x'); l.position.set(0.002, yEl(f), zS); pp.add(l); dio(id, l); add(pp, A.prsten(0.0068, 0.005, 0, 0.002, 'x', M.crnaM, 16), 0.001, yEl(f), zS); ledovi[ime] = l; return l; };
  mkLed('power', 'ledPower', 0xf5c518, 0.06); mkLed('error', 'ledError', 0xff3b30, 0.39); mkLed('execute', 'ledExecute', 0x2ecc71, 0.47);
  const tipke = {};
  const mkTipka = (ime, id, m, f, okvir) => {
    const g = grupa(pp, 0, yEl(f), zS); dio(id, g);
    if (okvir) add(g, box(0.006, 0.03, 0.03, M.zuto), 0.003);
    add(g, box(0.004, 0.024, 0.024, M.crnaM), 0.002);
    const t = box(0.008, 0.019, 0.019, m); t.position.x = 0.006; g.add(t); t.userData.tipka = ime; tipke[ime] = t; return g;
  };
  mkTipka('emg', 'tipkaEmg', M.crveno, 0.25, true); mkTipka('start', 'tipkaStart', M.zeleno, 0.6); mkTipka('stop', 'tipkaStop', M.crveno, 0.73); mkTipka('reset', 'tipkaReset', M.bijelaT, 0.86);
  /* ---- bočna vrata (strana +Z) s LED1–5, SW1–SW3, ST1, ST2 iza njih */
  const vrata = grupa(korp, D / 2 - 0.04, H * 0.5, W / 2 + 0.009); dio('bocnaVrata', vrata);   /* šarka uz prednji rub */
  add(vrata, box(0.19, 0.15, 0.003, M.dumT), -0.08, 0, 0.0016);
  add(vrata, box(0.012, 0.03, 0.006, M.crnaM), -0.16, 0, 0.004);
  const unP = grupa(korp, D / 2 - 0.12, H * 0.5, W / 2 + 0.001);
  add(unP, box(0.17, 0.13, 0.002, M.dumT), 0, 0, -0.0005); add(unP, box(0.15, 0.11, 0.002, M.pcb), 0, 0, 0.001);
  const ledU = {};
  for (let k = 1; k <= 5; k++) { const l = led(0.0028, 0xff3b30, 0.004, 'z'); l.position.set(-0.06 + (k - 1) * 0.014, 0.035, 0); unP.add(l); dio('led' + k, l); ledU['LED' + k] = l; }
  const sw1 = grupa(unP, 0.03, 0.035, 0); dio('sw1', sw1); add(sw1, box(0.046, 0.012, 0.006, M.prekidacC), 0, 0, 0.002);
  for (let k = 0; k < 8; k++) add(sw1, box(0.003, 0.004, 0.003, M.bijeloP), -0.019 + k * 0.0054, (k === 7 ? 0.0022 : -0.0022), 0.0055);
  const sw23 = grupa(unP, -0.03, -0.01, 0); dio('sw2sw3', sw23); add(sw23, box(0.026, 0.01, 0.006, M.pcbP), -0.016, 0, 0.002); add(sw23, box(0.026, 0.01, 0.006, M.pcbP), 0.016, 0, 0.002);
  const st12 = grupa(unP, 0.04, -0.012, 0); dio('st1st2', st12); add(st12, box(0.012, 0.006, 0.006, M.mikro), -0.01, 0, 0.002); add(st12, box(0.012, 0.006, 0.006, M.mikro), 0.01, 0, 0.002); add(st12, box(0.003, 0.004, 0.004, M.bijeloP), -0.013, 0, 0.006); add(st12, box(0.003, 0.004, 0.004, M.bijeloP), 0.013, 0, 0.006);
  const zuj = grupa(unP, 0.05, -0.04, 0); dio('zujalo', zuj); add(zuj, cyl(0.007, 0, 0.007, 'z', M.crnaM, 16));
  /* ---- stražnja ploča (−X): kartice lijevo (gledano straga), hladnjak u sredini, mrežni modul desno */
  const sp = grupa(korp, -D / 2, 0, 0); dio('strazanjaPloca', sp);
  add(sp, box(0.003, H - 0.01, W - 0.01, M.dumT), -0.0015, H / 2, 0);
  /* gledano straga desno je +Z; kartice su na −Z… uzmi: kartice z ∈ [−W/2, −0,03], hladnjak [−0,03; 0,09], mrežni modul [0,09; W/2] */
  const hl = grupa(sp); dio('hladnjak', hl);
  for (let k = 0; k < 14; k++) add(hl, box(0.03, H * 0.72, 0.0022, M.aluT), -0.018, H * 0.42, -0.026 + k * 0.0085);
  add(hl, box(0.006, H * 0.74, 0.12, M.aluT), -0.004, H * 0.42, 0.029);
  const kartica = (z, id, kon) => { const g = grupa(sp, 0, 0, z); add(g, box(0.004, H * 0.8, 0.03, M.cink), -0.003, H * 0.47, 0); add(g, box(0.006, 0.008, 0.008, M.cink), -0.006, H * 0.85, 0); add(g, box(0.006, 0.008, 0.008, M.cink), -0.006, H * 0.1, 0); if (kon) { const k = grupa(g); dio(id, k); kon(k); } return g; };
  const kC = (k) => { add(k, box(0.012, 0.07, 0.016, M.cink), -0.009, H * 0.55, 0); add(k, box(0.006, 0.06, 0.009, M.plavaI), -0.016, H * 0.55, 0); };
  const kD = (k, y = 0.55) => { add(k, box(0.01, 0.05, 0.013, M.cink), -0.008, H * y, 0); add(k, box(0.006, 0.042, 0.008, M.crnaM), -0.014, H * y, 0); };
  kartica(-W / 2 + 0.03, 'prikljucakCentronics', kC);
  kartica(-W / 2 + 0.065, 'prikljucakRs232', (k) => kD(k));
  kartica(-W / 2 + 0.1, 'prikljucakIO', (k) => { kC(k); });
  kartica(-W / 2 + 0.135, 'prikljucakPrivjeska', (k) => { add(k, cyl(0.009, -0.016, -0.004, 'x', M.cink, 16), 0, H * 0.55, 0); });
  /* mrežni modul: prekidač, pločica, osigurač, priključnica, HAND, EXT EMG, motorni priključci */
  const zm = W / 2 - 0.045;
  add(sp, box(0.004, H * 0.9, 0.08, M.dumT), -0.004, H * 0.47, zm);
  const mp = grupa(sp); dio('mrezniPrekidac', mp); add(mp, box(0.008, 0.02, 0.03, M.crnaM), -0.008, H * 0.86, zm); add(mp, box(0.004, 0.016, 0.012, M.bijeloP), -0.012, H * 0.86, zm + 0.006);
  add(mp, box(0.008, 0.026, 0.032, M.crnaM), -0.008, H * 0.12, zm);
  add(sp, box(0.001, 0.035, 0.06, M.alu), -0.0065, H * 0.66, zm);   /* natpisna pločica (bez podataka) */
  const os_ = grupa(sp); dio('osigurac', os_); add(os_, cyl(0.007, -0.014, -0.004, 'x', M.crnaM, 16), 0, H * 0.4, zm - 0.018);
  const hd = grupa(sp); dio('preklopnikHand', hd); add(hd, box(0.006, 0.014, 0.01, M.crnaM), -0.008, H * 0.4, zm + 0.018); add(hd, cyl(0.0015, -0.02, -0.01, 'x', M.celik, 8), 0, H * 0.4 + 0.004, zm + 0.018);
  const ee = grupa(sp); dio('stezaljkaExtEmg', ee); add(ee, box(0.008, 0.012, 0.03, M.zeleno), -0.008, H * 0.26, zm); add(ee, cyl(0.003, -0.014, -0.006, 'x', M.cink, 10), 0, H * 0.26, zm + 0.025);
  const pm = grupa(sp); dio('prikljucciMotora', pm);
  add(pm, box(0.012, 0.065, 0.02, M.cink), -0.009, H * 0.2, 0.02); add(pm, box(0.006, 0.055, 0.012, M.plavaI), -0.016, H * 0.2, 0.02);
  add(pm, box(0.012, 0.065, 0.02, M.cink), -0.009, H * 0.2, 0.065); add(pm, box(0.006, 0.055, 0.012, M.plavaI), -0.016, H * 0.2, 0.065);
  /* ---- unutrašnjost (prikaz s unutrasnjost(true)) */
  const un = grupa(korp); un.userData.unutra = true; un.visible = false;
  const tr = grupa(un); dio('transformator', tr); add(tr, box(0.09, 0.08, 0.08, M.celikT), 0.06, 0.05, W / 2 - 0.08); add(tr, box(0.05, 0.07, 0.085, M.bakar), 0.06, 0.05, W / 2 - 0.08);
  const sv = grupa(un); dio('servoPojacala', sv);
  for (let k = 0; k < 3; k++) { add(sv, box(0.2, 0.002, 0.12, M.pcb), -0.06, 0.03 + k * 0.045, 0.02); for (let j = 0; j < 6; j++) add(sv, box(0.012, 0.012, 0.004, M.cip), -D / 2 + 0.05, 0.04 + k * 0.045, -0.02 + j * 0.016); }
  const cpu = grupa(un); dio('cpuKartica', cpu); add(cpu, box(0.22, 0.12, 0.002, M.pcb), -0.04, 0.09, -W / 2 + 0.05); add(cpu, box(0.03, 0.03, 0.004, M.cip), -0.04, 0.1, -W / 2 + 0.053);
  const mem = grupa(un); dio('memorija', mem); add(mem, box(0.22, 0.12, 0.002, M.pcb), -0.04, 0.09, -W / 2 + 0.085); add(mem, box(0.04, 0.012, 0.004, M.cip), -0.02, 0.11, -W / 2 + 0.088); add(mem, box(0.04, 0.012, 0.004, M.cip), -0.02, 0.09, -W / 2 + 0.088);
  const ep = grupa(un); dio('eprom', ep); add(ep, box(0.04, 0.014, 0.004, M.cip), -0.08, 0.1, -W / 2 + 0.088); add(ep, box(0.008, 0.006, 0.0012, M.disk), -0.08, 0.1, -W / 2 + 0.0905);
  const io = grupa(un); dio('ioKartica', io); add(io, box(0.22, 0.12, 0.002, M.pcbP), -0.04, 0.09, -W / 2 + 0.12);
  const bat = grupa(un); dio('baterija', bat); add(bat, cyl(0.007, -W / 2 + 0.122, -W / 2 + 0.135, 'z', M.celik, 16), 0.0, 0.07, 0); add(bat, cyl(0.007, -W / 2 + 0.135, -W / 2 + 0.137, 'z', M.crnaM, 16), 0.0, 0.07, 0);
  /* ---- kabeli (početni komadi) */
  if (O.kabeli) {
    const stub = (id, z, y, r, m = M.kabel) => { const g = grupa(korp); dio(id, g); cijev(g, [[-D / 2 - 0.02, y, z], [-D / 2 - 0.08, y - 0.02, z], [-D / 2 - 0.14, 0.01, z + 0.02], [-D / 2 - 0.3, 0.006, z + 0.05]], r, m, 20, 8); return g; };
    stub('kabelPower', 0.02, H * 0.2, 0.0055); stub('kabelSignal', 0.065, H * 0.2, 0.005);
    stub('kabelSimRV', -W / 2 + 0.1, H * 0.55, 0.004, M.kabelS); stub('kabelRS232', -W / 2 + 0.065, H * 0.55, 0.003, M.kabelB);
    stub('kabelPrivjeska', -W / 2 + 0.135, H * 0.55, 0.004); stub('kabelMrezni', zm, H * 0.12, 0.0035);
  }
  const sus = sustavIsticanja(THREE, grupaD, dijelovi);
  let unutraV = false;
  sus.st.unutraVidljivo = () => unutraV;
  const LJ = ['kucisteDum1', 'strazanjaPloca', 'hladnjak', 'bocnaVrata', 'prednjaPloca'];
  function primijeni() { sus.st.prozirniId = new Set(unutraV ? LJ : []); sus.primijeni(); }
  spojiStaticno(THREE, grupaD); sus.popisi();
  function postaviLED(ime, stanje) {
    const l = ledovi[String(ime).toLowerCase()] || ledU[String(ime).toUpperCase()];
    if (l) l.userData.postavi(!!stanje);
  }
  function otvori(t) { t = Math.max(0, Math.min(1, Number(t) || 0)); vrata.rotation.y = t * 1.9; grupaD.updateMatrixWorld(true); }
  postaviLED('power', true); primijeni();
  return {
    grupa: grupaD, led: ledovi, ledUzroka: ledU, postaviLED, tipke, otvori, dijelovi,
    istakni(id) { sus.st.istaknuto = id && dijelovi.has(id) ? id : null; primijeni(); return sus.st.istaknuto; },
    unutrasnjost(v) { unutraV = !!v; primijeni(); }
  };
}

/* ====================================================================== PRIVJESAK (scena: leži na y = 0, tipkovnica gore, kraj sa zaslonom prema +X) */
export function napraviPrivjesak(THREE) {
  const dijelovi = new Map();
  const A = alati(THREE, dijelovi);
  const { M, add, grupa, box, cyl, zaobljeni, izvuci, cijev, platno, dio, imaDoc } = A;
  const [Wp, Lp, Tp] = MJERE.privjesak;   /* širina (Z), duljina (X), debljina (Y) */
  const g = new THREE.Group(); g.name = 'privjesak';
  const tijelo = grupa(g); dio('privjesak', tijelo);
  const s = zaobljeni(Lp, Wp, 0.012);
  const t0 = izvuci(s, 0, Tp, 'z', M.priv, { t: 0.003, s: 0.003, seg: 2 }, 8); t0.rotation.x = -PI / 2; tijelo.add(t0);   /* profil u XZ-ravnini scene */
  /* gornji dio: udubine za ON/OFF i EMG, zaslon */
  const xTop = Lp / 2;
  const onoff = grupa(g, xTop - 0.025, Tp, -Wp / 2 + 0.024); dio('preklopnikPrivjeska', onoff);
  add(onoff, box(0.028, 0.002, 0.028, M.privT), 0, 0.0002, 0); const ruc = cyl(0.0022, 0, 0.012, 'y', M.bijeloP, 10); ruc.rotation.z = 0.35; onoff.add(ruc);
  const emg = grupa(g, xTop - 0.025, Tp, Wp / 2 - 0.024); dio('emgPrivjeska', emg);
  add(emg, box(0.028, 0.002, 0.028, M.privT), 0, 0.0002, 0); add(emg, box(0.017, 0.007, 0.017, M.zuto), 0, 0.002, 0); const emgT = box(0.014, 0.006, 0.014, M.crveno); emgT.position.y = 0.005; emgT.userData.tipka = 'EMG'; emg.add(emgT);
  const zas = grupa(g, xTop - 0.062, Tp + 0.0004, 0); dio('zaslonPrivjeska', zas);
  let zasTex = platno(256, 64, (c, w, h) => { c.fillStyle = '#2a0707'; c.fillRect(0, 0, w, h); });
  const zm = new THREE.MeshStandardMaterial({ color: zasTex ? 0xffffff : 0x3a0b0b, map: zasTex, emissive: 0xffffff, emissiveMap: zasTex, emissiveIntensity: zasTex ? 0.9 : 0, roughness: 0.2 });
  const zmesh = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.02), zm); zmesh.rotation.x = -PI / 2; zmesh.rotation.z = -PI / 2; zmesh.userData.vlastitiMat = true; zas.add(zmesh);
  add(zas, box(0.026, 0.0008, 0.064, M.privT), 0, -0.0004, 0);
  function zaslon(tekst) {
    if (!zasTex) return; const c = zasTex.userData.canvas.getContext('2d'), w = 256, h = 64;
    c.fillStyle = '#2a0707'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3b2f'; c.font = 'bold 50px monospace'; c.textBaseline = 'middle';
    const t = String(tekst ?? '').padStart(4, ' ').slice(-4); for (let k = 0; k < 4; k++) c.fillText(t[k], 18 + k * 58, 34);
    zasTex.needsUpdate = true;
  }
  zaslon('');
  /* tipke iz PRIVJESAK.tipke (red 1–7, stupac 1–4) */
  const tipkeM = new Map();
  const red0 = xTop - 0.088, korakR = 0.0175, korakS = 0.0195;
  const idDijela = (t) => (['PTP', 'XYZ', 'TOOL'].includes(t.id) ? 'tipkeNacina' : t.id === 'ENT' ? 'tipkaEnt' : (t.id === 'O' || t.id === 'C') ? 'tipkeOC' : t.boja === 'smeda' ? 'tipkeFunkcija' : 'tipkeGibanja');
  const lista = (PRIVJESAK && Array.isArray(PRIVJESAK.tipke) && PRIVJESAK.tipke.length) ? PRIVJESAK.tipke : [];
  const okvir = grupa(g); add(okvir, box(0.13, 0.0008, Wp - 0.012, M.privT), red0 - 0.055, Tp + 0.0002, 0);
  lista.forEach((t) => {
    const x = red0 - (t.red - 1) * korakR, z = (t.stupac - 2.5) * korakS + (t.stupac >= 3 ? 0.004 : 0) - 0.002;
    const tex = imaDoc ? platno(96, 80, (c, w, h) => {
      c.fillStyle = t.boja === 'smeda' ? '#c0894a' : '#eee6cf'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2a2a2a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const dijelovi2 = String(t.natpis).split(' / ');
      if (dijelovi2.length > 1) { c.font = `bold ${dijelovi2[0].length > 4 ? 17 : 24}px sans-serif`; c.fillText(dijelovi2[0], w / 2, h * 0.3); c.font = 'bold 22px sans-serif'; c.fillText(dijelovi2[1], w / 2, h * 0.72); }
      else { c.font = `bold ${t.natpis.length > 3 ? 24 : 28}px sans-serif`; c.fillText(t.natpis, w / 2, h / 2); }
    }) : null;
    const mt = new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : (t.boja === 'smeda' ? 0xc0894a : 0xeee6cf), map: tex, roughness: 0.55 });
    const mb = t.boja === 'smeda' ? M.smeda : M.krem;
    const kg = new THREE.Mesh(new THREE.BoxGeometry(0.0165, 0.004, 0.0148), [mb, mb, mt, mb, mb, mb]); kg.rotation.y = -PI / 2;
    kg.position.set(x, Tp + 0.002, z); kg.userData.vlastitiMat = true; kg.userData.tipka = t.id; kg.userData.y0 = kg.position.y;
    g.add(kg); dio(idDijela(t), kg); tipkeM.set(t.id, kg);
  });
  /* kabel s uvodnicom na donjem kraju */
  const kb = grupa(g); dio('kabelPrivjeska', kb);
  add(kb, cyl(0.007, -Lp / 2 - 0.02, -Lp / 2 + 0.002, 'x', M.kabelS, 12), 0, Tp * 0.5, 0);
  cijev(kb, [[-Lp / 2 - 0.02, Tp * 0.5, 0], [-Lp / 2 - 0.08, 0.006, 0.01], [-Lp / 2 - 0.2, 0.005, 0.06], [-Lp / 2 - 0.3, 0.005, 0.0]], 0.004, M.kabel, 24, 8);
  spojiStaticno(THREE, g);
  const sus = sustavIsticanja(THREE, g, dijelovi); sus.popisi();
  g.userData = Object.assign(g.userData, {
    dijelovi, tipke: tipkeM, zaslon,
    pritisni(id, v) { const k = tipkeM.get(id) || (id === 'EMG' ? emgT : null); if (k) k.position.y = (k.userData.y0 ?? k.position.y) - (v ? 0.0015 : 0); },
    istakni(id) { return sus.istakni(id); }
  });
  return g;
}

/* ====================================================================== SIM RV (scena: leži na y = 0, duljina duž X, natpisi čitljivi s +Z) */
export function napraviSimRV(THREE) {
  const dijelovi = new Map();
  const A = alati(THREE, dijelovi);
  const { M, add, grupa, box, cyl, naljepnica, led, dio, cijev } = A;
  const [Ls, Ws, Hs] = MJERE.simRV;
  const g = new THREE.Group(); g.name = 'SIM RV';
  const t = grupa(g); dio('simRv', t);
  add(t, box(Ls, 0.014, Ws, M.simT), 0, 0.007, 0); add(t, box(Ls, Hs - 0.014, Ws, M.sim), 0, 0.014 + (Hs - 0.014) / 2, 0);
  const nl = naljepnica(Ls * 0.96, Ws * 0.92, 1400, (c, w, h) => {
    c.fillStyle = '#ebe7d9'; c.fillRect(0, 0, w, h); c.strokeStyle = '#222'; c.lineWidth = 3;
    const rr = (x, y, ww, hh) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, ww, hh, 14) : c.rect(x, y, ww, hh); c.stroke(); };
    rr(w * 0.03, h * 0.08, w * 0.62, h * 0.36); rr(w * 0.03, h * 0.5, w * 0.62, h * 0.24); rr(w * 0.03, h * 0.78, w * 0.26, h * 0.18); rr(w * 0.33, h * 0.78, w * 0.32, h * 0.18); rr(w * 0.72, h * 0.72, w * 0.25, h * 0.2);
    c.fillStyle = '#222'; c.font = `${Math.round(h * 0.06)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('INPUT', w * 0.34, h * 0.13); c.fillText('OUTPUT', w * 0.34, h * 0.55);
    for (let b = 0; b < 8; b++) { c.fillText(String(b), w * (0.07 + b * 0.075), h * 0.4); c.fillText(String(b), w * (0.07 + b * 0.075), h * 0.7); }
    c.fillText('STB', w * 0.1, h * 0.92); c.fillText('ACK', w * 0.22, h * 0.92); c.fillText('RDY', w * 0.42, h * 0.92); c.fillText('BUSY', w * 0.56, h * 0.92); c.fillText('POWER', w * 0.845, h * 0.88);
    c.font = `bold ${Math.round(h * 0.11)}px sans-serif`; c.fillText('SIM RV', w * 0.83, h * 0.35);
  }, 0xebe7d9);
  nl.rotation.x = -PI / 2; nl.position.set(0, Hs + 0.0004, 0); t.add(nl);
  /* koordinate na plohi: x ∈ [−Ls/2, Ls/2], z: gore na naljepnici = −Z (prema natpisu) */
  const px = (u) => -Ls * 0.48 + u * Ls * 0.96, pz = (v) => -Ws * 0.46 + v * Ws * 0.92;
  const prek = (u, v, id, k) => { const p = grupa(g, px(u), Hs, pz(v)); dio(id, p); add(p, cyl(0.004, 0, 0.003, 'y', M.celik, 12)); const r = grupa(p, 0, 0.003, 0); r.userData.anim = true; add(r, cyl(0.0014, 0, 0.011, 'y', M.celik, 8)); r.rotation.x = 0.4; r.userData.k = k; return r; };
  const ulaziR = [], ulazi = [0, 0, 0, 0, 0, 0, 0, 0], sig = { STB: 0, ACK: 0 };
  for (let b = 0; b < 8; b++) ulaziR.push(prek(0.07 + b * 0.075, 0.26, 'prekidaciUlaza', b));
  const stbR = prek(0.1, 0.84, 'prekidacStb', 'STB'), ackR = prek(0.22, 0.84, 'prekidacAck', 'ACK');
  ulaziR.forEach((r, b) => { r.children[0].userData.ulaz = b; });
  stbR.children[0].userData.signal = 'STB'; ackR.children[0].userData.signal = 'ACK';
  const izl = [];
  for (let b = 0; b < 8; b++) { const l = led(0.0026, 0xff3b30, 0.003, 'y'); l.position.set(px(0.07 + b * 0.075), Hs, pz(0.6)); g.add(l); dio('ledIzlaza', l); izl.push(l); }
  const rdy = led(0.0026, 0x2ecc71, 0.003, 'y'); rdy.position.set(px(0.42), Hs, pz(0.84)); g.add(rdy); dio('ledRdyBusy', rdy);
  const busy = led(0.0026, 0x2ecc71, 0.003, 'y'); busy.position.set(px(0.56), Hs, pz(0.84)); g.add(busy); dio('ledRdyBusy', busy);
  const pw = led(0.003, 0x2ecc71, 0.003, 'y'); pw.position.set(px(0.845), Hs, pz(0.8)); g.add(pw); dio('ledPowerSim', pw);
  /* kabeli s rebrastim uvodnicama */
  const kb = grupa(g); dio('kabelSimRV', kb);
  [-0.025, 0.025].forEach((zz, k) => { for (let i = 0; i < 5; i++) add(kb, cyl(0.0062 - i * 0.0004, 0, 0.004, 'x', M.kabelS, 12), Ls / 2 + i * 0.0045, Hs * 0.55, zz); cijev(kb, [[Ls / 2 + 0.02, Hs * 0.55, zz], [Ls / 2 + 0.08, 0.008, zz + 0.02 * (k ? 1 : -1)], [Ls / 2 + 0.25, 0.005, zz * 3]], 0.0035, M.kabelS, 16, 6); });
  spojiStaticno(THREE, g);
  const sus = sustavIsticanja(THREE, g, dijelovi); sus.popisi();
  const nagni = (r, v) => { r.rotation.x = v ? -0.4 : 0.4; };
  function postaviIzlaze(bajt) { for (let b = 0; b < 8; b++) izl[b].userData.postavi(((bajt >> b) & 1) === 1); }
  function postaviUlaz(bit, v) { if (bit >= 0 && bit < 8) { ulazi[bit] = v ? 1 : 0; nagni(ulaziR[bit], v); } }
  function postaviSignal(id, v) {
    const k = String(id).toUpperCase();
    if (k === 'RDY') rdy.userData.postavi(v); else if (k === 'BUSY') busy.userData.postavi(v); else if (k === 'POWER') pw.userData.postavi(v);
    else if (k === 'STB') { sig.STB = v ? 1 : 0; nagni(stbR, v); } else if (k === 'ACK') { sig.ACK = v ? 1 : 0; nagni(ackR, v); }
  }
  pw.userData.postavi(true);
  return {
    grupa: g, dijelovi, postaviIzlaze, postaviUlaz, postaviSignal,
    ulazi() { return ulazi.reduce((a, v, b) => a | (v << b), 0); },
    signali() { return { ...sig }; },
    istakni(id) { return sus.istakni(id); }
  };
}

/* ====================================================================== STOL Festo MPS (scena: dno kolica na y = 0, središte tlocrta u ishodištu, prednja strana (upravljačka ploča) prema +X) */
export function napraviStolMPS(THREE, opcije = {}) {
  const O = Object.assign({ celicnaPloca: true, upravljackaPloca: true }, opcije);
  const dijelovi = new Map();
  const A = alati(THREE, dijelovi);
  const { M, add, grupa, box, cyl, dio } = A;
  const S = STANICA, W = S.kolica.sirina, Dd = S.kolica.dubina, H = S.kolica.visina, tp = S.profilnaPloca.debljina;
  const g = new THREE.Group(); g.name = 'Festo MPS — robotska stanica';
  /* kolica: stupovi, bočne ploče, police, kotači */
  const k = grupa(g); dio('kolicaMPS', k);
  const hK = 0.07;   /* visina kotača */
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
    add(k, box(0.04, H - hK, 0.04, M.aluT), a * (Dd / 2 - 0.02), hK + (H - hK) / 2, b * (W / 2 - 0.02));
    add(k, cyl(0.03, 0.0, 0.025, 'z', M.crnaM, 16), a * (Dd / 2 - 0.05), 0.03, b * (W / 2 - 0.06) - 0.0125);
    add(k, box(0.03, 0.04, 0.03, M.celikT), a * (Dd / 2 - 0.05), 0.07, b * (W / 2 - 0.06));
  });
  [-1, 1].forEach((s) => {
    add(k, box(Dd - 0.08, H - hK - 0.06, 0.006, M.kolica), 0, hK + (H - hK) / 2, s * (W / 2 - 0.003));
    add(k, box(0.16, 0.06, 0.001, M.utor), 0, H * 0.72, s * (W / 2 + 0.0004));   /* otvor za ruku */
  });
  add(k, box(0.006, H - hK - 0.06, W - 0.08, M.kolica), -Dd / 2 + 0.003, hK + (H - hK) / 2, 0);
  add(k, box(Dd - 0.04, 0.02, W - 0.04, M.kolica), 0, hK + 0.04, 0);
  add(k, box(Dd, 0.012, W, M.aluT), 0, H - 0.006, 0);
  /* Al-profilna ploča s utorima (duž X) */
  const pl = grupa(g); dio('profilnaPloca', pl);
  add(pl, box(Dd, tp, W, M.alu), 0, H + tp / 2, 0);
  const n = Math.floor(W / S.profilnaPloca.korakUtora);
  for (let i = 0; i < n; i++) add(pl, box(Dd + 0.001, 0.002, S.profilnaPloca.sirinaUtora, M.utor), 0, H + tp - 0.0008, -W / 2 + S.profilnaPloca.korakUtora * (i + 0.5));
  const vrh = H + tp;
  /* čelična ploča robota */
  const [cx, cz] = S.celicnaPloca.polozaj, [pw, pd, ph] = S.celicnaPloca.mjere;
  if (O.celicnaPloca) {
    const cp = grupa(g); dio('celicnaPloca', cp);
    add(cp, box(pw, ph, pd, M.plavaPloca), cx, vrh + ph / 2, -cz);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(cp, cyl(0.007, vrh + ph, vrh + ph + 0.006, 'y', M.cink, 12), cx + a * (pw / 2 - 0.02), 0, -cz + b * (pd / 2 - 0.02)));
  }
  /* upravljačka ploča na prednjem rubu */
  if (O.upravljackaPloca) {
    const up = grupa(g, Dd / 2 + 0.03, vrh - 0.02, 0); dio('upravljackaPlocaMPS', up);
    const nag = grupa(up); nag.rotation.z = 0.9;
    add(nag, box(0.006, 0.085, W, M.dumP));
    const el = (z, m, r = 0.009, vis = 0.008) => add(nag, cyl(r, 0.003, 0.003 + vis, 'x', m, 16), 0, 0.01, z);
    el(-0.25, M.zeleno); el(-0.21, M.crveno); el(-0.17, M.plavaI);
    add(nag, box(0.012, 0.02, 0.02, M.crnaM), 0.008, 0.01, -0.12); add(nag, box(0.016, 0.004, 0.012, M.celik), 0.016, 0.01, -0.12);
    el(-0.07, M.bijeloP, 0.008, 0.006); el(-0.03, M.zuto, 0.008, 0.006);
    add(nag, cyl(0.012, 0.003, 0.02, 'x', M.crnaM, 14), 0, 0.01, 0.05); add(nag, cyl(0.02, 0.02, 0.03, 'x', M.crnaM, 20), 0, 0.01, 0.05);
    add(up, box(0.03, 0.03, W, M.dumP), -0.02, -0.03, 0);
  }
  spojiStaticno(THREE, g);
  const sus = sustavIsticanja(THREE, g, dijelovi); sus.popisi();
  g.userData = Object.assign(g.userData, {
    dijelovi, vrhPloce: vrh,
    mjestoRobota: new THREE.Vector3(cx, vrh + (O.celicnaPloca ? ph : 0), -cz),
    istakni(id) { return sus.istakni(id); }
  });
  return g;
}

/* ====================================================================== pomoćno: svi id-ovi koje modeli mogu izgraditi */
export function svaGradiva(THREE) {
  const r = napraviRVM1(THREE), d = napraviDUM1(THREE), p = napraviPrivjesak(THREE), s = napraviSimRV(THREE), t = napraviStolMPS(THREE);
  return { robot: r, dum1: d, privjesak: p, simRV: s, stol: t };
}
