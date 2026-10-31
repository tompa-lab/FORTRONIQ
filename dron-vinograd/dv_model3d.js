/* FORTRONIQ · Dron nad vinogradom — 3D prikaz (three.js), u metrima. Os x uzduž redova (zapad → istok), z poprijeko.
   Vinograd je isječak 120 × 72 m (u simulatoru je vinograd 300 × 150 m). Dron je na stvarnoj visini, ali nacrtan
   povećano ×6 da se vidi; otisak snimke na tlu je u mjerilu. Svaka mreža nosi userData.dio = id iz DIJELOVI. © ForTroniQ d.o.o. */
import { P } from './dv_podaci.js';
import { kamera } from './dv_model.js';

export function napraviModel(THREE) {
  const grupa = new THREE.Group();
  const mat = (boja, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: boja, roughness: 0.8, metalness: 0.05 }, o));
  function dodaj(mesh, dio, roditelj = grupa) {
    mesh.userData.dio = dio;
    mesh.material = mesh.material.clone();
    mesh.userData.osnovna = mesh.material.emissive ? mesh.material.emissive.getHex() : 0;
    roditelj.add(mesh);
    return mesh;
  }
  const kutija = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const valjak = (r, h, m, n = 14) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m);
  const L = 120, W = 72;
  const ox = -L / 2, oz = -W / 2;   /* vinograd centriran u ishodištu */

  /* tlo i trava oko vinograda */
  const trava = new THREE.Mesh(new THREE.PlaneGeometry(420, 320), mat(0x8fae7a, { roughness: 1 }));
  trava.rotation.x = -Math.PI / 2; trava.position.y = -0.02; grupa.add(trava);
  const tlo = dodaj(new THREE.Mesh(new THREE.PlaneGeometry(L + 4, W + 4), mat(0xa48a69, { roughness: 1 })), 'vinograd');
  tlo.rotation.x = -Math.PI / 2;

  /* trsovi (InstancedMesh), stupovi i žica */
  const nRed = Math.round(W / P.razmakRed), nTrs = Math.round(L / P.razmakTrs);
  const geoTrs = new THREE.BoxGeometry(1.1, 1.0, 0.55); geoTrs.translate(0, 1.2, 0);
  const trsovi = dodaj(new THREE.InstancedMesh(geoTrs, mat(0xffffff), nRed * nTrs), 'vinograd');
  const m4 = new THREE.Matrix4(), boja = new THREE.Color();
  let n = 0;
  const zariste = [{ x: 25, z: 10, r: 6 }, { x: -30, z: -18, r: 4 }];
  for (let j = 0; j < nRed; j++) for (let i = 0; i < nTrs; i++) {
    const x = ox + P.razmakTrs / 2 + i * P.razmakTrs, z = oz + P.razmakRed / 2 + j * P.razmakRed;
    const s = 0.85 + ((i * 7 + j * 13) % 10) / 40;
    m4.makeScale(s, s, s); m4.setPosition(x, 0, z); trsovi.setMatrixAt(n, m4);
    const bol = zariste.some((q) => Math.hypot(x - q.x, z - q.z) < q.r);
    boja.setHex(bol ? 0xb8a24a : z > W * 0.3 ? 0x86a54c : 0x6aa64a); trsovi.setColorAt(n, boja); n++;
  }
  trsovi.instanceMatrix.needsUpdate = true;
  const drvo = mat(0x7a6247);
  const geoStup = new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6); geoStup.translate(0, 0.95, 0);
  const stupovi = dodaj(new THREE.InstancedMesh(geoStup, drvo, nRed * 9), 'vinograd');
  n = 0;
  for (let j = 0; j < nRed; j++) for (let i = 0; i < 9; i++) { m4.makeTranslation(ox + i * L / 8, 0, oz + P.razmakRed / 2 + j * P.razmakRed); stupovi.setMatrixAt(n++, m4); }
  stupovi.instanceMatrix.needsUpdate = true;

  /* karta NDVI kao sloj na sjeveroistočnom kutu (tekstura iz platna) */
  const pl = document.createElement('canvas'); pl.width = 128; pl.height = 64;
  const cx = pl.getContext('2d');
  for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
    let v = 0.78 - (y > 40 ? (y - 40) / 80 : 0);
    if (Math.hypot(x - 90, y - 20) < 10) v = 0.47;
    if (Math.hypot(x - 30, y - 45) < 6) v = 0.5;
    const t = Math.max(0, Math.min(1, (v - 0.4) / 0.4));
    cx.fillStyle = `rgb(${Math.round(200 - 150 * t)},${Math.round(70 + 120 * t)},${Math.round(60 + 20 * t)})`; cx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(pl); tex.colorSpace = THREE.SRGBColorSpace;
  const karta = dodaj(new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.88, roughness: 1 })), 'karta');
  karta.rotation.x = -Math.PI / 2; karta.position.set(ox - 30, 0.05, oz + 18);
  const okvirK = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(40, 20)), new THREE.LineBasicMaterial({ color: 0x17656e }));
  okvirK.rotation.x = -Math.PI / 2; okvirK.position.copy(karta.position).add(new THREE.Vector3(0, 0.02, 0)); grupa.add(okvirK);

  /* pilot s daljinskim i tabletom */
  const pilot = new THREE.Group(); pilot.position.set(ox - 14, 0, oz - 10); grupa.add(pilot);
  const tijelo = dodaj(valjak(0.25, 1.2, mat(0x2b4c6f)), 'daljinski', pilot); tijelo.position.y = 0.95;
  const glavaP = dodaj(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(0xd9b38c)), 'daljinski', pilot); glavaP.position.y = 1.72;
  const noge = dodaj(kutija(0.38, 0.4, 0.22, mat(0x3a3a3a)), 'daljinski', pilot); noge.position.y = 0.2;
  const tab = dodaj(kutija(0.35, 0.03, 0.25, mat(0x111418)), 'daljinski', pilot); tab.position.set(0.25, 1.25, 0.15); tab.rotation.x = -0.6;
  const kuca = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 24), mat(0xffffff)); kuca.rotation.x = -Math.PI / 2; kuca.position.set(ox - 10, 0.03, oz - 10); grupa.add(kuca);

  /* dron (povećan ×6) */
  const dron = new THREE.Group(); grupa.add(dron);
  const D = new THREE.Group(); D.scale.setScalar(6); dron.add(D);
  const siva = mat(0x30363b, { roughness: 0.5 }), svj = mat(0xdfe5e8, { roughness: 0.45 });
  const tijeloD = dodaj(kutija(0.22, 0.08, 0.14, svj), 'okvir', D);
  const propeleri = [];
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const krak = dodaj(kutija(0.22, 0.02, 0.025, siva), 'okvir', D);
    krak.position.set(sx * 0.12, 0, sz * 0.08); krak.rotation.y = Math.atan2(-sz * 0.08, sx * 0.12);
    const mot = dodaj(valjak(0.022, 0.04, siva), 'motori', D); mot.position.set(sx * 0.21, 0.02, sz * 0.15);
    const pr = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.004, 24), mat(0x9fb3bd, { transparent: true, opacity: 0.45 })), 'motori', D);
    pr.position.set(sx * 0.21, 0.045, sz * 0.15); propeleri.push(pr);
  });
  const bat = dodaj(kutija(0.13, 0.04, 0.07, mat(0x1f6b74)), 'baterija', D); bat.position.set(-0.02, 0.06, 0);
  const kam = dodaj(kutija(0.06, 0.04, 0.06, mat(0x15191c)), 'kamera', D); kam.position.set(0.05, -0.065, 0);
  [-0.015, 0.015].forEach((dz) => [-0.012, 0.012].forEach((dx) => { const l = dodaj(valjak(0.007, 0.01, mat(0x0a2a4a, { metalness: 0.5 })), 'kamera', D); l.position.set(0.05 + dx, -0.09, dz); }));
  const dls = dodaj(new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf4f4f4)), 'dls', D); dls.position.set(-0.05, 0.08, 0);
  const jarbol = dodaj(valjak(0.004, 0.06, siva), 'gnss', D); jarbol.position.set(0.04, 0.07, 0);
  const gnss = dodaj(valjak(0.025, 0.01, mat(0xe8e8e8)), 'gnss', D); gnss.position.set(0.04, 0.105, 0);
  const plocica = dodaj(kutija(0.06, 0.012, 0.05, mat(0x2e8b57)), 'upravljac', D); plocica.position.set(0, 0.046, 0);

  /* otisak snimke na tlu i piramida vidnog polja */
  const otMat = new THREE.MeshBasicMaterial({ color: 0x2ecad4, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const otisak = dodaj(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), otMat), 'kamera');
  otisak.rotation.x = -Math.PI / 2; otisak.position.y = 0.08;
  const piramida = dodaj(new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x17656e })), 'kamera');

  /* putanja „kosilice" */
  const putanja = dodaj(new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xd46a1a })), 'putanja');

  let visina = 40;
  function postaviVisinu(h) {
    visina = h;
    const K = kamera(h);
    /* linije uzduž redova; isječak 120 × 72 m */
    const razmak = K.sir * 0.3;
    const nL = Math.max(1, Math.ceil(Math.max(0, W - K.sir) / razmak) + 1);
    const tocke = [];
    for (let i = 0; i < nL; i++) {
      const z = nL === 1 ? 0 : oz + K.sir / 2 + i * (W - K.sir) / (nL - 1);
      const a = ox - K.duz / 2, b = ox + L + K.duz / 2;
      if (i % 2 === 0) tocke.push(new THREE.Vector3(a, h, z), new THREE.Vector3(b, h, z)); else tocke.push(new THREE.Vector3(b, h, z), new THREE.Vector3(a, h, z));
    }
    putanja.geometry.dispose(); putanja.geometry = new THREE.BufferGeometry().setFromPoints(tocke);
    /* dron iznad sredine prve linije */
    const pz = nL === 1 ? 0 : oz + K.sir / 2;
    dron.position.set(ox + L * 0.42, h, pz);
    otisak.scale.set(K.duz, K.sir, 1); otisak.position.set(dron.position.x, 0.08, pz);
    const v = [], c = new THREE.Vector3(dron.position.x, h - 0.5, pz);
    [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(([sx, sz]) => v.push(c.x, c.y, c.z, c.x + sx * K.duz / 2, 0.1, pz + sz * K.sir / 2));
    piramida.geometry.dispose(); piramida.geometry = new THREE.BufferGeometry(); piramida.geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    POGLEDI.dron.cam = [dron.position.x - 18, h + 6, pz + 22]; POGLEDI.dron.cilj = [dron.position.x, h, pz];
    POGLEDI.putanja.cam = [0, Math.max(150, h * 2.6), 1]; POGLEDI.putanja.cilj = [0, 0, 0];
    return K;
  }

  const POGLEDI = {
    vinograd: { naziv: 'Vinograd', cam: [-95, 70, 105], cilj: [0, 8, 0] },
    dron: { naziv: 'Dron', cam: [0, 46, 22], cilj: [0, 40, 0] },
    putanja: { naziv: 'Putanja odozgo', cam: [0, 160, 1], cilj: [0, 0, 0] },
    red: { naziv: 'U redu', cam: [ox + 12, 1.7, oz + P.razmakRed * 10], cilj: [ox + 40, 1.1, oz + P.razmakRed * 10] },
    pilot: { naziv: 'Pilot i karta', cam: [ox - 22, 9, oz - 24], cilj: [ox - 22, 0.8, oz + 2] },
  };
  const POGLED_DIJELA = { okvir: 'dron', motori: 'dron', baterija: 'dron', kamera: 'dron', dls: 'dron', gnss: 'dron', upravljac: 'dron', daljinski: 'pilot', vinograd: 'red', putanja: 'putanja', karta: 'pilot' };

  function kontrola(vr) {
    const h = parseFloat(vr);
    const K = postaviVisinu(h);
    const hr = (x, d = 1) => x.toFixed(d).replace('.', ',');
    return { izlaz: Math.round(h) + ' m', info: `GSD ${hr(K.gsd * 100)} cm/px · otisak snimke ${hr(K.duz)} × ${hr(K.sir)} m · najveća oštra brzina ${hr(K.gsd / P.ekspozicija)} m/s · rani simptomi (${P.simptomRan} cm) ${K.gsd * 100 <= P.simptomRan ? 'vidljivi' : 'manji od piksela'}${h > P.hMax ? ' · iznad 120 m nije dopušteno u otvorenoj kategoriji' : ''}` };
  }
  let t0 = null;
  function animiraj(t) {
    if (t0 === null) t0 = t;
    const k = (t - t0) / 1000;
    propeleri.forEach((p, i) => { p.rotation.y = k * 40 * (i % 3 === 0 ? 1 : -1); });
    dron.position.y = visina + Math.sin(k * 1.3) * 0.15;
    return true;
  }
  return { grupa, POGLEDI, POGLED_DIJELA, kontrola, animiraj, pocetni: 'vinograd', maxUdaljenost: 600, minUdaljenost: 1 };
}
