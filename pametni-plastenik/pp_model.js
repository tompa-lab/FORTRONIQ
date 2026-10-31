/* FORTRONIQ · Pametni plastenik — 3D model (three.js), u metrima. Os x uzduž plastenika (20 m), z poprijeko (8 m), jug +z.
   Raspored opreme je SHEMATSKI (pretpostavka). Svaka mreža nosi userData.dio = id iz DIJELOVI. © ForTroniQ d.o.o. */

export function napraviModel(THREE) {
  const grupa = new THREE.Group();
  const dijelovi = new Map();
  const mat = (boja, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: boja, roughness: 0.75, metalness: 0.05 }, o));
  function dodaj(mesh, dio, roditelj = grupa) {
    mesh.userData.dio = dio;
    mesh.material = mesh.material.clone();
    mesh.userData.osnovna = mesh.material.emissive ? mesh.material.emissive.getHex() : 0;
    if (!dijelovi.has(dio)) dijelovi.set(dio, []);
    dijelovi.get(dio).push(mesh);
    roditelj.add(mesh);
    return mesh;
  }
  const kutija = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const valjak = (r, h, m, n = 16) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m);
  const L = 20, W = 8, H = 3.5, R = W / 2, sy = H / R;

  /* tlo oko plastenika i pod */
  const trava = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), mat(0x8fae7a, { roughness: 1 }));
  trava.rotation.x = -Math.PI / 2; trava.position.y = -0.01; grupa.add(trava);
  const pod = new THREE.Mesh(new THREE.PlaneGeometry(L, W), mat(0x9b8466, { roughness: 1 }));
  pod.rotation.x = -Math.PI / 2; pod.position.y = 0.005; grupa.add(pod);

  /* lukovi konstrukcije */
  const celik = mat(0xb7c0c6, { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i <= 8; i++) {
    const luk = dodaj(new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 6, 36, Math.PI), celik), 'konstrukcija');
    luk.rotation.y = Math.PI / 2; luk.scale.set(1, sy, 1); luk.position.x = -L / 2 + i * (L / 8);
  }
  const sljeme = dodaj(valjak(0.03, L, celik), 'konstrukcija'); sljeme.rotation.z = Math.PI / 2; sljeme.position.y = H;
  [-1, 1].forEach((s) => { const b = dodaj(valjak(0.03, L, celik), 'konstrukcija'); b.rotation.z = Math.PI / 2; b.position.set(0, 1.0, s * R * 0.93); });

  /* pokrov (polucilindar) i zabati */
  const folija = mat(0xdfeff2, { transparent: true, opacity: 0.22, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const pokrov = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 40, 1, true, 0, Math.PI), folija), 'pokrov');
  pokrov.rotation.z = Math.PI / 2; pokrov.scale.set(sy, 1, 1);   /* os valjka → x, polovica θ 0..π (lokalno +x) → gore */
  const oblik = new THREE.Shape(); oblik.moveTo(-R, 0);
  for (let i = 0; i <= 36; i++) { const a = Math.PI - i * Math.PI / 36; oblik.lineTo(R * Math.cos(a), H * Math.sin(a)); }
  oblik.lineTo(-R, 0);
  [-1, 1].forEach((s) => { const z = dodaj(new THREE.Mesh(new THREE.ShapeGeometry(oblik), folija), 'pokrov'); z.rotation.y = Math.PI / 2; z.position.x = s * L / 2; });
  const vrata = dodaj(kutija(0.05, 2.1, 1.4, mat(0x9aa5ab, { transparent: true, opacity: 0.5 })), 'konstrukcija'); vrata.position.set(-L / 2, 1.05, 0);

  /* krovni prozor (na šarki uz sljeme, otvara se prema jugu) */
  const prozorGr = new THREE.Group(); prozorGr.position.set(2, H, 0); grupa.add(prozorGr);
  const krilo = dodaj(kutija(6, 0.04, 1.3, mat(0xc9dfe4, { transparent: true, opacity: 0.55 })), 'prozor', prozorGr);
  krilo.position.set(0, 0.02, 0.65);
  const okvirK = dodaj(kutija(6.1, 0.06, 0.06, celik), 'prozor', prozorGr); okvirK.position.set(0, 0.03, 1.3);
  const motor = dodaj(kutija(0.35, 0.25, 0.25, mat(0x3b4247)), 'prozor'); motor.position.set(-1.3, H - 0.25, 0.3);
  const zupcanik = dodaj(valjak(0.02, 6, celik), 'prozor'); zupcanik.rotation.z = Math.PI / 2; zupcanik.position.set(2, H - 0.12, 0.3);

  /* zasjena (vodoravna mreža na 2,6 m) */
  const mreza = dodaj(new THREE.Mesh(new THREE.PlaneGeometry(L - 0.4, W - 2.2), mat(0x2f3a3f, { transparent: true, opacity: 0.55, side: THREE.DoubleSide })), 'zasjena');
  mreza.rotation.x = -Math.PI / 2; mreza.position.y = 2.6;
  const valjakZ = dodaj(valjak(0.06, L - 0.4, mat(0x6b7479)), 'zasjena'); valjakZ.rotation.z = Math.PI / 2; valjakZ.position.set(0, 2.65, -(W - 2.2) / 2);

  /* gredice, kapaljke i biljke (4 reda) */
  const zemlja = mat(0x6e5139, { roughness: 1 });
  const crijevo = mat(0x1d1f20, { roughness: 0.5 });
  const redovi = [-2.4, -0.8, 0.8, 2.4];
  redovi.forEach((z) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(L - 2.4, 0.22, 0.7), zemlja); g.position.set(0.6, 0.11, z); grupa.add(g);
    const c = dodaj(valjak(0.012, L - 2.4, crijevo, 6), 'navodnjavanje'); c.rotation.z = Math.PI / 2; c.position.set(0.6, 0.24, z + 0.12);
  });
  const nBiljaka = 4 * 28;
  const stabljika = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.025, 1.3, 6), mat(0x4c7a33), nBiljaka);
  const lisce = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 1), mat(0x3f8f3a, { roughness: 0.9 }), nBiljaka * 2);
  const plod = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0xd23b2a, { roughness: 0.5 }), nBiljaka * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
  let k = 0;
  redovi.forEach((z) => { for (let i = 0; i < 28; i++) {
    const x = -L / 2 + 2.0 + i * 0.62;
    m4.compose(v.set(x, 0.87, z), q.identity(), s3.set(1, 1, 1)); stabljika.setMatrixAt(k, m4);
    m4.compose(v.set(x + 0.05, 0.75, z), q, s3.set(1, 1.2, 1)); lisce.setMatrixAt(2 * k, m4);
    m4.compose(v.set(x - 0.04, 1.25, z + 0.03), q, s3.set(0.9, 1.1, 0.9)); lisce.setMatrixAt(2 * k + 1, m4);
    m4.compose(v.set(x + 0.18, 0.7, z + 0.16), q, s3.set(1, 1, 1)); plod.setMatrixAt(2 * k, m4);
    m4.compose(v.set(x - 0.15, 1.05, z - 0.14), q, s3.set(1, 1, 1)); plod.setMatrixAt(2 * k + 1, m4);
    k++;
  } });
  [stabljika, lisce, plod].forEach((im) => { im.instanceMatrix.needsUpdate = true; dodaj(im, 'biljke'); });

  /* glavni vod, elektroventil, filtar, spremnik vode */
  const pvc = mat(0x2d6ca8, { roughness: 0.5 });
  const razdjelnik = dodaj(valjak(0.03, W - 1.6, pvc, 8), 'navodnjavanje'); razdjelnik.rotation.x = Math.PI / 2; razdjelnik.position.set(-L / 2 + 1.1, 0.24, 0);
  const ventil = dodaj(kutija(0.16, 0.2, 0.16, mat(0x1f2a30)), 'navodnjavanje'); ventil.position.set(-L / 2 + 0.8, 0.45, -3.1);
  const zav = dodaj(valjak(0.05, 0.08, mat(0xe0b020), 12), 'navodnjavanje'); zav.position.set(-L / 2 + 0.8, 0.6, -3.1);
  const filtar = dodaj(valjak(0.06, 0.3, mat(0xc0392b), 12), 'navodnjavanje'); filtar.position.set(-L / 2 + 0.5, 0.45, -3.1);
  const dovod = dodaj(valjak(0.03, 2.4, pvc, 8), 'navodnjavanje'); dovod.rotation.z = Math.PI / 2; dovod.position.set(-L / 2 - 0.6, 0.3, -3.1);
  const ibc = dodaj(kutija(1.1, 1.1, 1.1, mat(0xe8eef0, { transparent: true, opacity: 0.85 })), 'navodnjavanje'); ibc.position.set(-L / 2 - 2.4, 0.65, -3.1);
  const kavez = dodaj(kutija(1.16, 0.05, 1.16, celik), 'navodnjavanje'); kavez.position.set(-L / 2 - 2.4, 0.1, -3.1);

  /* grijač (toplozračni, zapadni zabat) */
  const grijac = dodaj(kutija(0.8, 1.0, 0.6, mat(0xd6dadc)), 'grijac'); grijac.position.set(-L / 2 + 0.7, 0.9, 2.9);
  const resetka = dodaj(kutija(0.02, 0.6, 0.45, mat(0x3b4247, { emissive: 0x000000 })), 'grijac'); resetka.position.set(-L / 2 + 1.11, 0.95, 2.9);
  const noga = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), mat(0x7b828a)); noga.position.set(-L / 2 + 0.7, 0.2, 2.9); grupa.add(noga);

  /* ventilator (istočni zabat) */
  const kuciste = dodaj(kutija(0.25, 1.0, 1.0, mat(0x9aa5ab)), 'ventilator'); kuciste.position.set(L / 2 - 0.15, 2.0, 0);
  const lopatice = dodaj(valjak(0.42, 0.04, mat(0x2a3136), 24), 'ventilator'); lopatice.rotation.z = Math.PI / 2; lopatice.position.set(L / 2 - 0.3, 2.0, 0);

  /* LED rasvjeta uz sljeme */
  for (let i = 0; i < 5; i++) { const l = dodaj(kutija(1.2, 0.05, 0.12, mat(0xf4f4f4, { emissive: 0x000000 })), 'rasvjeta'); l.position.set(-7 + i * 3.5, 2.95, 0); }

  /* osjetnici */
  const stup = dodaj(valjak(0.015, 1.4, celik, 6), 'osjetnikT'); stup.position.set(1, 0.7, 0);
  for (let i = 0; i < 4; i++) { const d = dodaj(valjak(0.1 - i * 0.005, 0.025, mat(0xffffff), 16), 'osjetnikT'); d.position.set(1, 1.35 + i * 0.045, 0); }
  [[-3, -0.8], [4, 0.8]].forEach(([x, z]) => {
    const g = dodaj(kutija(0.08, 0.12, 0.04, mat(0x1c5b8a)), 'osjetnikTla'); g.position.set(x, 0.3, z);
    [-0.02, 0.02].forEach((o) => { const z2 = dodaj(kutija(0.012, 0.18, 0.012, mat(0x8a9399)), 'osjetnikTla'); z2.position.set(x + o, 0.17, z); });
  });

  /* meteo stanica i ormar upravljanja (vani, kod ulaza) */
  const jarbol = dodaj(valjak(0.04, 3, celik, 8), 'meteo'); jarbol.position.set(-L / 2 - 3, 1.5, 3.5);
  const pir = dodaj(valjak(0.12, 0.08, mat(0xf2f2f2), 16), 'meteo'); pir.position.set(-L / 2 - 3, 3.05, 3.5);
  const kup = dodaj(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xddeeff, { transparent: true, opacity: 0.7 })), 'meteo'); kup.position.set(-L / 2 - 3, 3.09, 3.5);
  const zast = dodaj(valjak(0.12, 0.25, mat(0xffffff), 12), 'meteo'); zast.position.set(-L / 2 - 2.85, 2.2, 3.5);
  const ormar = dodaj(kutija(0.6, 0.8, 0.25, mat(0xd8dde0)), 'plc'); ormar.position.set(-L / 2 - 0.6, 1.3, 1.6);
  const vratOrm = dodaj(kutija(0.56, 0.76, 0.02, mat(0xbfc7cb)), 'plc'); vratOrm.position.set(-L / 2 - 0.6, 1.3, 1.74);
  const lampa = dodaj(valjak(0.025, 0.02, mat(0x2ecad4, { emissive: 0x0b4b50 }), 10), 'plc'); lampa.rotation.x = Math.PI / 2; lampa.position.set(-L / 2 - 0.45, 1.55, 1.76);
  const stupO = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), celik); stupO.position.set(-L / 2 - 0.6, 0.7, 1.45); grupa.add(stupO);

  /* stanja */
  function prozor(k) { prozorGr.rotation.x = -Math.min(1, Math.max(0, k)) * 0.6; }
  function zasjena(k) { mreza.visible = k > 0.01; mreza.scale.set(1, Math.max(0.02, k), 1); mreza.position.z = -(W - 2.2) / 2 * (1 - k); }
  function rasvjeta(on) { (dijelovi.get('rasvjeta') || []).forEach((m) => { m.material.emissive.setHex(on ? 0xd8d0ff : 0); m.userData.osnovna = m.material.emissive.getHex(); }); }
  function grijanje(on) { resetka.material.emissive.setHex(on ? 0x8a2a0a : 0); resetka.userData.osnovna = resetka.material.emissive.getHex(); }
  function zdravlje(k) { lisce.material.color.setRGB(0.25 + 0.4 * (1 - k), 0.56 * k + 0.35 * (1 - k), 0.23 * k + 0.12 * (1 - k)); }
  prozor(0); zasjena(0); rasvjeta(false); grijanje(false);

  const POGLEDI = {
    vani: { naziv: 'Izvana', cam: [16, 11, 22], cilj: [0, 1.3, 0] },
    unutra: { naziv: 'Unutra', cam: [-8.5, 2.2, 2.2], cilj: [4, 1.0, -0.5] },
    krov: { naziv: 'Krov', cam: [6, 9, 8], cilj: [2, H, 0.4] },
    ulaz: { naziv: 'Ulaz i oprema', cam: [-17, 3.5, 5], cilj: [-L / 2, 1, -0.5] },
  };
  const POGLED_DIJELA = { prozor: 'krov', pokrov: 'vani', konstrukcija: 'vani', meteo: 'ulaz', plc: 'ulaz', navodnjavanje: 'ulaz', grijac: 'unutra', osjetnikT: 'unutra', osjetnikTla: 'unutra', biljke: 'unutra', zasjena: 'unutra', rasvjeta: 'unutra', ventilator: 'unutra' };
  return { grupa, dijelovi, prozor, zasjena, rasvjeta, grijanje, zdravlje, POGLEDI, POGLED_DIJELA, mjere: { L, W, H } };
}
