/* FORTRONIQ · Pametna zgrada — 3D model (three.js), u metrima. Jug je prema +z.
   Oblik i raspored opreme su SHEMATSKI (pretpostavka): javno je poznato samo da je dogradnja pasivna kuća
   s fotonaponom, dizalicama topline i solarnim grijanjem vode. Svaka mreža nosi userData.dio = id iz DIJELOVI.
   © ForTroniQ d.o.o. */

export function napraviModel(THREE) {
  const grupa = new THREE.Group();
  const dijelovi = new Map();                       /* id → [mreže] */
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

  const L = 32, D = 14, H = 7.6;                     /* glavni blok */
  const x0 = -L / 2;

  /* tlo */
  const tlo = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), mat(0x9fb3a8, { roughness: 1 }));
  tlo.rotation.x = -Math.PI / 2; tlo.position.y = -0.01; grupa.add(tlo);
  const staza = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), mat(0xc9ced1, { roughness: 1 }));
  staza.rotation.x = -Math.PI / 2; staza.position.set(0, 0.005, D / 2 + 3); grupa.add(staza);

  /* zgrada: zidovi (bez južnog dijela učionice koji je staklen) */
  const zid = mat(0xeef0ee);
  const sjeverni = dodaj(kutija(L, H, 0.45, zid), 'zgrada'); sjeverni.position.set(0, H / 2, -D / 2 + 0.225);
  const zapadni = dodaj(kutija(0.45, H, D, zid), 'zgrada'); zapadni.position.set(x0 + 0.225, H / 2, 0);
  const istocni = dodaj(kutija(0.45, H, D, zid), 'zgrada'); istocni.position.set(-x0 - 0.225, H / 2, 0);
  const strop = dodaj(kutija(L, 0.5, D, mat(0xd9dddb)), 'zgrada'); strop.position.set(0, H + 0.25, 0);
  const podEtaza = dodaj(kutija(L - 0.9, 0.3, D - 0.9, mat(0xd2d6d4)), 'zgrada'); podEtaza.position.set(0, H / 2, 0);
  /* atika */
  [[0, -D / 2 + 0.15, L, 0.3], [0, D / 2 - 0.15, L, 0.3]].forEach(([x, z, w, d]) => { const a = dodaj(kutija(w, 0.8, d, zid), 'zgrada'); a.position.set(x, H + 0.9, z); });
  [[x0 + 0.15, 0], [-x0 - 0.15, 0]].forEach(([x, z]) => { const a = dodaj(kutija(0.3, 0.8, D, zid), 'zgrada'); a.position.set(x, H + 0.9, z); });

  /* južno pročelje: stupovi i ostakljenje (dvije etaže), žaluzine nad prozorima */
  const staklo = mat(0x5b8fb0, { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.38 });
  const okvir = mat(0x6b7479, { roughness: 0.5 });
  const zaluzineMreze = [];
  for (let et = 0; et < 2; et++) {
    const y = et * (H / 2) + 0.6, hp = H / 2 - 1.2;
    for (let i = 0; i < 8; i++) {
      const w = L / 8;
      const xc = x0 + w * i + w / 2;
      const presjek = et === 0 && i < 2;            /* tehnička prostorija prikazana u presjeku */
      if (presjek) { const st = dodaj(kutija(0.5, H / 2, 0.5, zid), 'zgrada'); st.position.set(x0 + w * i + 0.25 * (i === 0 ? 1 : 0), H / 4, D / 2 - 0.25); continue; }
      const s = dodaj(kutija(w - 0.5, hp, 0.08, staklo), 'ovojnica'); s.position.set(xc, y + hp / 2, D / 2 - 0.1);
      const st = dodaj(kutija(0.5, H / 2, 0.5, zid), 'zgrada'); st.position.set(x0 + w * i + 0.25 * (i === 0 ? 1 : 0), et * H / 2 + H / 4, D / 2 - 0.25);
      const zk = dodaj(kutija(w - 0.5, 0.28, 0.32, okvir), 'zaluzine'); zk.position.set(xc, y + hp + 0.18, D / 2 + 0.12);
      const zl = dodaj(kutija(w - 0.6, 1, 0.04, mat(0xb9c1c5, { roughness: 0.6 })), 'zaluzine');
      zl.position.set(xc, y + hp, D / 2 + 0.2); zl.scale.y = 0.05; zl.userData.vrh = y + hp; zl.userData.puna = hp;
      zaluzineMreze.push(zl);
    }
    const pl = et === 0 ? L - 8 : L;
    const parapet = dodaj(kutija(pl, 0.6, 0.45, zid), 'zgrada'); parapet.position.set((L - pl) / 2, et * H / 2 + 0.3, D / 2 - 0.225);
  }
  const zadnjiStup = dodaj(kutija(0.5, H, 0.5, zid), 'zgrada'); zadnjiStup.position.set(-x0 - 0.25, H / 2, D / 2 - 0.25);

  /* učionica iza stakla (istok, prizemlje): rasvjeta i osjetnici */
  const ucX = 9;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const lm = dodaj(kutija(1.2, 0.06, 0.3, mat(0xfafafa, { emissive: 0x000000 })), 'rasvjeta');
    lm.position.set(ucX - 3 + i * 3, H / 2 - 0.35, 1 + j * 3);
  }
  const stol = mat(0xc49a6c);
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.8), stol); s.position.set(ucX - 4 + i * 2.6, 0.75, 3.2); grupa.add(s); }
  const osj = dodaj(kutija(0.25, 0.25, 0.08, mat(0xffffff)), 'osjetnici'); osj.position.set(ucX + 4, 1.5, -D / 2 + 0.5);
  const osj2 = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20), mat(0xffffff)), 'osjetnici'); osj2.position.set(ucX, H / 2 - 0.36, 2.5);
  const osjCO2 = dodaj(kutija(0.3, 0.18, 0.08, mat(0xe8f4f5)), 'osjetnici'); osjCO2.position.set(ucX - 4, 1.6, -D / 2 + 0.5);

  /* tehnička prostorija (zapad, prizemlje) — u presjeku, s pregradnim zidom prema učionicama */
  const pregrada = dodaj(kutija(0.2, H / 2, D - 0.9, zid), 'zgrada'); pregrada.position.set(x0 + 8, H / 4, 0);
  const podTP = new THREE.Mesh(new THREE.BoxGeometry(8, 0.05, D - 0.9), mat(0xb7bec2, { roughness: 0.9 })); podTP.position.set(x0 + 4, 0.03, 0); grupa.add(podTP);
  const tpX = x0 + 4.0;
  const spremnik = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 28), mat(0xc8ccd0, { metalness: 0.4, roughness: 0.4 })), 'spremnik');
  spremnik.position.set(tpX - 2, 1.1, -2);
  const izmj = dodaj(kutija(0.7, 0.9, 0.25, mat(0xdfe3e6)), 'izmjenjivac'); izmj.position.set(tpX + 0.3, 1.6, -D / 2 + 0.6);
  const izmjZ = dodaj(kutija(0.3, 0.12, 0.02, mat(0x2ecad4, { emissive: 0x0b4b50 })), 'izmjenjivac'); izmjZ.position.set(tpX + 0.3, 1.75, -D / 2 + 0.74);
  const razvod = dodaj(kutija(1.2, 2.0, 0.35, mat(0x9aa5ab)), 'ormar'); razvod.position.set(tpX + 1.8, 1.0, -D / 2 + 0.65);
  const plc = dodaj(kutija(0.9, 2.0, 0.45, mat(0xd8dde0)), 'plc'); plc.position.set(tpX + 3.2, 1.0, -D / 2 + 0.7);
  const plcV = dodaj(kutija(0.86, 1.9, 0.02, mat(0xbfc7cb)), 'plc'); plcV.position.set(tpX + 3.2, 1.0, -D / 2 + 0.94);
  const stolS = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.7), stol); stolS.position.set(tpX + 2.5, 0.75, -1.2); grupa.add(stolS);
  const monitor = dodaj(kutija(0.9, 0.55, 0.05, mat(0x1b2a30, { emissive: 0x0d3a40 })), 'scada'); monitor.position.set(tpX + 2.5, 1.12, -1.4);
  const nogica = dodaj(kutija(0.08, 0.3, 0.08, mat(0x333a3e)), 'scada'); nogica.position.set(tpX + 2.5, 0.92, -1.42);
  /* cijevi od spremnika prema krovu (solarni krug) */
  const cijev = mat(0xb87333, { metalness: 0.5, roughness: 0.4 });
  const c1 = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H + 1, 10), cijev), 'kolektori'); c1.position.set(tpX - 2.8, (H + 1) / 2, -2.6);

  /* krov: fotonaponsko polje (6 redova × 10 modula, nagib 15°, jug) */
  const modul = mat(0x1d3557, { roughness: 0.35, metalness: 0.2 });
  const nosac = mat(0x8a9399);
  const fnGrupa = new THREE.Group(); grupa.add(fnGrupa);
  for (let r = 0; r < 6; r++) for (let i = 0; i < 10; i++) {
    const m = dodaj(kutija(1.0, 0.04, 1.7, modul), 'fn', fnGrupa);
    m.position.set(-3 + i * 1.05, H + 0.95, -5 + r * 2.0);
    m.rotation.x = 15 * Math.PI / 180;
  }
  for (let r = 0; r < 6; r++) { const n = dodaj(kutija(10.6, 0.3, 0.08, nosac), 'fn'); n.position.set(1.725, H + 0.6, -5.6 + r * 2.0); }

  /* solarni kolektori (zapadni dio krova, nagib 45°) */
  for (let i = 0; i < 8; i++) {
    const k = dodaj(kutija(1.05, 0.08, 2.0, mat(0x14262e, { roughness: 0.25, metalness: 0.4 })), 'kolektori');
    k.position.set(x0 + 2.2 + i * 1.12, H + 1.25, 2.6); k.rotation.x = 45 * Math.PI / 180;
    const o = dodaj(kutija(1.1, 0.06, 2.05, mat(0xc0c6ca, { metalness: 0.6 })), 'kolektori');
    o.position.copy(k.position); o.rotation.copy(k.rotation); o.position.y -= 0.03;
  }

  /* rekuperator (klima-komora) na krovu i kanali */
  const ahu = dodaj(kutija(4.2, 1.6, 1.8, mat(0xc9d0d4)), 'rekuperator'); ahu.position.set(x0 + 5, H + 1.3, -4.6);
  const kanal = mat(0xaab3b8, { metalness: 0.5, roughness: 0.4 });
  const k1 = dodaj(kutija(0.6, 0.6, 2.4, kanal), 'rekuperator'); k1.position.set(x0 + 3.4, H + 0.8, -2.6);
  const k2 = dodaj(kutija(0.6, 0.6, 2.4, kanal), 'rekuperator'); k2.position.set(x0 + 6.6, H + 0.8, -2.6);
  const usis = dodaj(kutija(0.9, 0.9, 0.2, mat(0x6b7479)), 'rekuperator'); usis.position.set(x0 + 2.8, H + 1.3, -5.6);

  /* meteorološka stanica na krovu */
  const stup = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 10), mat(0x8a9399)), 'meteo'); stup.position.set(-x0 - 2, H + 2.1, -5);
  const pir = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 20), mat(0xf2f2f2)), 'meteo'); pir.position.set(-x0 - 2, H + 3.65, -5);
  const kupola = dodaj(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xddeeff, { transparent: true, opacity: 0.7 })), 'meteo'); kupola.position.set(-x0 - 2, H + 3.71, -5);
  const kucica = dodaj(kutija(0.3, 0.4, 0.3, mat(0xffffff)), 'meteo'); kucica.position.set(-x0 - 2, H + 2.6, -4.8);

  /* dizalice topline (vanjske jedinice) uz sjeverni zid */
  for (let i = 0; i < 2; i++) {
    const v = dodaj(kutija(1.8, 1.4, 0.9, mat(0xe6e9eb)), 'dizalice'); v.position.set(x0 + 9 + i * 2.6, 0.7, -D / 2 - 0.9);
    const vent = dodaj(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 28), mat(0x3b4247)), 'dizalice');
    vent.rotation.x = Math.PI / 2; vent.position.set(x0 + 8.6 + i * 2.6, 0.75, -D / 2 - 1.36);
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.0), mat(0x7b828a)); post.position.set(x0 + 9 + i * 2.6, 0.06, -D / 2 - 0.9); grupa.add(post);
  }

  /* stanje: žaluzine (0–1) i rasvjeta (0–1) */
  function zaluzine(k) {
    zaluzineMreze.forEach((z) => { const h = Math.max(0.05, k * z.userData.puna); z.scale.y = h; z.position.y = z.userData.vrh - h / 2; });
  }
  function rasvjeta(k) {
    (dijelovi.get('rasvjeta') || []).forEach((m) => { m.material.emissive.setRGB(k * 0.95, k * 0.92, k * 0.75); m.userData.osnovna = m.material.emissive.getHex(); });
  }
  zaluzine(0); rasvjeta(0);

  const POGLEDI = {
    jug: { naziv: 'Jug', cam: [14, 19, 60], cilj: [0, 3.5, 0] },
    krov: { naziv: 'Krov', cam: [-2, 38, 22], cilj: [-3, H, -1] },
    tehnika: { naziv: 'Tehnička prostorija', cam: [x0 + 6.2, 3.6, 17.5], cilj: [x0 + 4.4, 1.2, -3] },
    sjever: { naziv: 'Sjever', cam: [x0 + 4, 6, -24], cilj: [x0 + 10.3, 1.2, -D / 2] },
  };
  /* kamera po dijelu */
  const POGLED_DIJELA = { fn: 'krov', kolektori: 'krov', rekuperator: 'krov', meteo: 'krov', dizalice: 'sjever', spremnik: 'tehnika', izmjenjivac: 'tehnika', ormar: 'tehnika', plc: 'tehnika', scada: 'tehnika' };

  return { grupa, dijelovi, zaluzine, rasvjeta, POGLEDI, POGLED_DIJELA, mjere: { L, D, H } };
}
