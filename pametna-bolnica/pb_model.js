/* FORTRONIQ · Pametna bolnica — 3D model (three.js), u metrima. Lijevo ljekarna sa stanicom punjenja, sredina hodnik i
   sestrinska stanica, desno bolnička soba s dva kreveta. Raspored je SHEMATSKI. Svaka mreža nosi userData.dio = id iz DIJELOVI.
   © ForTroniQ d.o.o. */

export function napraviModel(THREE) {
  const grupa = new THREE.Group();
  const dijelovi = new Map();
  const mat = (boja, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: boja, roughness: 0.6, metalness: 0.08 }, o));
  function dodaj(mesh, dio, roditelj = grupa) {
    mesh.userData.dio = dio; mesh.material = mesh.material.clone();
    mesh.userData.osnovna = mesh.material.emissive ? mesh.material.emissive.getHex() : 0;
    if (!dijelovi.has(dio)) dijelovi.set(dio, []); dijelovi.get(dio).push(mesh); roditelj.add(mesh); return mesh;
  }
  const kutija = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const valjak = (r, h, m, n = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m);
  const inox = mat(0xc9d1d6, { metalness: 0.5, roughness: 0.35 }), bijelo = mat(0xf0f3f4), tamno = mat(0x3a4249), teal = mat(0x13a39c);

  /* pod i niski zidovi */
  const pod = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), mat(0xc4ced2, { roughness: 0.9 })); pod.rotation.x = -Math.PI / 2; grupa.add(pod);
  const zid = mat(0xe6ebec, { roughness: 0.9 });
  [[0, -4.05, 12, 0.1], [-6.05, 0, 0.1, 8]].forEach(([x, z, w, d]) => { const m = kutija(w, 1.3, d, zid); m.position.set(x, 0.65, z); grupa.add(m); });
  [[-3.75, 0, 4.5], [3.75, 0, 4.5]].forEach(([x, z, w]) => { const m = kutija(w, 1.3, 0.08, zid); m.position.set(x, 0.65, z); grupa.add(m); });
  const pregr = kutija(0.08, 1.3, 4, zid); pregr.position.set(0.5, 0.65, -2); grupa.add(pregr);

  /* tabletičar: kutija 7 × 4 pretinca s LED-om */
  function tabletar(x, y, z, dio, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; grupa.add(g);
    const tij = dodaj(kutija(0.3, 0.035, 0.18, mat(0xe2e8ea)), dio, g); tij.position.y = 0.018;
    const led = [];
    for (let d = 0; d < 7; d++) for (let tm = 0; tm < 4; tm++) {
      const c = dodaj(kutija(0.034, 0.008, 0.034, mat(0x9fd8e6, { transparent: true, opacity: 0.85, emissive: 0x000000 })), dio, g); c.position.set(-0.12 + d * 0.04, 0.04, -0.06 + tm * 0.04); led.push(c);
    }
    return led;
  }

  /* —— ljekarna: stanica punjenja —— */
  const stol = dodaj(kutija(2.2, 0.06, 1.0, inox), 'ur3e'); stol.position.set(-3.6, 0.9, -2.6);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const n = dodaj(kutija(0.05, 0.88, 0.05, inox), 'ur3e'); n.position.set(-3.6 + a * 1.03, 0.44, -2.6 + b * 0.43); });
  const ur = new THREE.Group(); ur.position.set(-3.6, 0.93, -2.75); grupa.add(ur);
  const zg = (r, l, rod) => { const c = dodaj(valjak(r, l, bijelo), 'ur3e', rod); c.rotation.x = Math.PI / 2; return c; };
  const b0 = dodaj(valjak(0.065, 0.1, bijelo), 'ur3e', ur); b0.position.y = 0.05;
  const b1 = dodaj(valjak(0.068, 0.012, teal), 'ur3e', ur); b1.position.y = 0.105;
  const rame = new THREE.Group(); rame.position.y = 0.16; rame.rotation.y = 0.9; ur.add(rame); zg(0.055, 0.12, rame);
  const nad = new THREE.Group(); nad.rotation.z = 0.5; rame.add(nad);
  const nL = dodaj(valjak(0.04, 0.244, bijelo), 'ur3e', nad); nL.position.y = 0.122;
  const lak = new THREE.Group(); lak.position.y = 0.244; lak.rotation.z = -1.7; nad.add(lak); zg(0.045, 0.1, lak);
  const pL = dodaj(valjak(0.035, 0.213, bijelo), 'ur3e', lak); pL.position.y = 0.106;
  const zgl = new THREE.Group(); zgl.position.y = 0.213; zgl.rotation.z = 1.2; lak.add(zgl); zg(0.035, 0.08, zgl);
  const sis = dodaj(valjak(0.012, 0.1, tamno, 10), 'ur3e', zgl); sis.position.y = 0.07;
  const vak = dodaj(valjak(0.018, 0.012, mat(0x2c3136), 12), 'ur3e', zgl); vak.position.y = 0.125;
  const boje = [0xf4f4f0, 0xf2cf3a, 0xf3a6b8, 0x5d85d8, 0xee8a3c, 0xe9ece8, 0x58b37a, 0xc95454];
  const polica = dodaj(kutija(1.0, 0.04, 0.25, inox), 'spremnici'); polica.position.set(-4.35, 1.12, -2.95);
  boje.forEach((c, i) => { const s = dodaj(valjak(0.045, 0.2, mat(c, { transparent: true, opacity: 0.9 })), 'spremnici'); s.position.set(-4.8 + i * 0.125, 1.24, -2.95); const k = dodaj(valjak(0.047, 0.02, tamno), 'spremnici'); k.position.set(-4.8 + i * 0.125, 1.35, -2.95); });
  const kS = dodaj(valjak(0.015, 0.7, tamno, 8), 'kamera'); kS.position.set(-3.1, 1.28, -3.0);
  const kN = dodaj(kutija(0.3, 0.025, 0.025, tamno), 'kamera'); kN.position.set(-3.22, 1.62, -3.0);
  const kam = dodaj(kutija(0.08, 0.06, 0.1, mat(0x22272b)), 'kamera'); kam.position.set(-3.35, 1.58, -3.0);
  const vaga = dodaj(kutija(0.22, 0.05, 0.22, mat(0xdfe5e7)), 'vaga'); vaga.position.set(-3.15, 0.955, -2.45);
  const vZ = dodaj(kutija(0.1, 0.004, 0.04, mat(0x10394a, { emissive: 0x0d4a52 })), 'vaga'); vZ.position.set(-3.15, 0.982, -2.36);
  const cit = dodaj(kutija(0.14, 0.03, 0.1, mat(0x2b2f33)), 'citac'); cit.position.set(-4.1, 0.945, -2.3);
  const citL = dodaj(kutija(0.06, 0.004, 0.02, mat(0x13a39c, { emissive: 0x0b4b50 })), 'citac'); citL.position.set(-4.1, 0.962, -2.26);
  const ledLj = tabletar(-3.7, 0.93, -2.3, 'citac');
  const zast = dodaj(kutija(2.2, 0.9, 0.02, mat(0xbfe6ea, { transparent: true, opacity: 0.25, depthWrite: false })), 'ur3e'); zast.position.set(-3.6, 1.38, -2.1);
  const fs = dodaj(kutija(1.2, 0.05, 0.6, mat(0xd9dee0)), 'farmaceut'); fs.position.set(-1.6, 0.75, -3.3);
  const fsN = dodaj(kutija(1.1, 0.72, 0.5, mat(0xc9d0d3)), 'farmaceut'); fsN.position.set(-1.6, 0.36, -3.3);
  const fsZ = dodaj(kutija(0.45, 0.3, 0.03, mat(0x10394a, { emissive: 0x0d4a52 })), 'farmaceut'); fsZ.position.set(-1.6, 1.0, -3.5);
  for (let i = 0; i < 4; i++) tabletar(-1.95 + i * 0.25, 0.775, -3.15, 'farmaceut', 0).forEach(() => {});
  const his = dodaj(kutija(0.5, 1.8, 0.5, mat(0x2f363b)), 'his'); his.position.set(-5.6, 0.9, -3.6);
  const hisL = dodaj(kutija(0.3, 0.02, 0.01, mat(0x13a39c, { emissive: 0x0b4b50 })), 'his'); hisL.position.set(-5.6, 1.5, -3.34);

  /* —— hodnik, Robotino s kolicima, sestrinska stanica —— */
  const rob = new THREE.Group(); rob.position.set(-1.5, 0, 0.8); grupa.add(rob);
  const rb = dodaj(valjak(0.23, 0.2, mat(0x8e979c, { metalness: 0.4 })), 'robotino', rob); rb.position.y = 0.13;
  const rbB = dodaj(valjak(0.235, 0.04, teal), 'robotino', rob); rbB.position.y = 0.22;
  const kol = dodaj(kutija(0.4, 0.5, 0.36, inox), 'robotino', rob); kol.position.y = 0.5;
  for (let i = 0; i < 4; i++) { const tb = dodaj(kutija(0.3, 0.03, 0.18, mat(0xe2e8ea)), 'robotino', rob); tb.position.set(0, 0.6 + i * 0.07 - 0.1, 0); }
  const put = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.05), mat(0x13a39c, { transparent: true, opacity: 0.6 })); put.rotation.x = -Math.PI / 2; put.position.set(0, 0.004, 0.8); grupa.add(put);
  const sd = dodaj(kutija(2.4, 0.06, 0.7, mat(0xd9dee0)), 'stanica'); sd.position.set(0.2, 0.8, 2.6);
  const sdN = dodaj(kutija(2.4, 0.78, 0.1, mat(0xbcc5c9)), 'stanica'); sdN.position.set(0.2, 0.39, 2.25);
  [-0.6, 0.2, 1.0].forEach((x) => { const z = dodaj(kutija(0.6, 0.38, 0.03, mat(0x10394a, { emissive: 0x0e4c57 })), 'stanica'); z.position.set(x, 1.12, 2.8); z.rotation.x = -0.15; const n = dodaj(kutija(0.04, 0.2, 0.04, tamno), 'stanica'); n.position.set(x, 0.92, 2.82); });
  const mesZ = dodaj(kutija(0.8, 0.5, 0.04, mat(0x0e3a44, { emissive: 0x0b3b40 })), 'mes'); mesZ.position.set(-2.2, 1.6, 3.6);
  const mesN = dodaj(kutija(0.05, 1.3, 0.05, tamno), 'mes'); mesN.position.set(-2.2, 0.65, 3.6);

  /* —— bolnička soba —— */
  const kreveti = [];
  [[2.6, -2.2], [4.9, -2.2]].forEach(([x, z], i) => {
    const okv = dodaj(kutija(0.95, 0.35, 2.0, mat(0xd2d8db)), 'krevet'); okv.position.set(x, 0.42, z);
    const mad = dodaj(kutija(0.88, 0.14, 1.9, mat(0xf6f8f8)), 'krevet'); mad.position.set(x, 0.66, z);
    const jas = dodaj(kutija(0.6, 0.1, 0.35, bijelo), 'krevet'); jas.position.set(x, 0.78, z - 0.72);
    const dek = dodaj(kutija(0.9, 0.06, 1.1, mat(0x9fc7d3)), 'krevet'); dek.position.set(x, 0.76, z + 0.35);
    const uz = dodaj(kutija(1.0, 0.7, 0.06, inox), 'krevet'); uz.position.set(x, 0.6, z - 1.02);
    kreveti.push(mad);
    const orm = dodaj(kutija(0.45, 0.75, 0.45, mat(0xe6ddcf)), 'tabletar'); orm.position.set(x + 0.8, 0.38, z - 0.6);
    const led = tabletar(x + 0.8, 0.76, z - 0.6, 'tabletar'); if (i === 0) kreveti.led = led; else kreveti.led2 = led;
    const st = dodaj(valjak(0.02, 1.6, inox, 8), 'monitor'); st.position.set(x - 0.75, 0.8, z - 0.85);
    const mon = dodaj(kutija(0.34, 0.26, 0.08, tamno), 'monitor'); mon.position.set(x - 0.75, 1.55, z - 0.8);
    const monZ = dodaj(kutija(0.28, 0.2, 0.01, mat(0x07161a, { emissive: 0x063a3e })), 'monitor'); monZ.position.set(x - 0.75, 1.55, z - 0.755); kreveti['mon' + i] = monZ;
    const pum = dodaj(kutija(0.16, 0.2, 0.12, mat(0xe8ecee)), 'pumpa'); pum.position.set(x - 0.75, 1.1, z - 0.78);
    const vr = dodaj(valjak(0.05, 0.14, mat(0xdff2f6, { transparent: true, opacity: 0.6 })), 'pumpa'); vr.position.set(x - 0.75, 1.85, z - 0.85);
    const tip = dodaj(kutija(0.08, 0.12, 0.03, mat(0xd33f2f, { emissive: 0x000000 })), 'tipka'); tip.position.set(x + 0.2, 1.0, -3.98); kreveti['tip' + i] = tip;
  });
  const hl = dodaj(kutija(0.55, 0.85, 0.55, bijelo), 'hladnjakL'); hl.position.set(5.6, 0.43, -0.5);
  const hlV = dodaj(kutija(0.5, 0.75, 0.02, mat(0xdde7ea, { transparent: true, opacity: 0.7 })), 'hladnjakL'); hlV.position.set(5.32, 0.45, -0.5); hlV.rotation.y = Math.PI / 2;
  const hlZ = dodaj(kutija(0.02, 0.06, 0.14, mat(0x10394a, { emissive: 0x0d4a52 })), 'hladnjakL'); hlZ.position.set(5.31, 0.75, -0.5);
  const svj = dodaj(kutija(0.25, 0.08, 0.06, mat(0xf7f2e6, { emissive: 0x000000 })), 'tipka'); svj.position.set(1.4, 1.38, 0.04);

  /* —— stanja —— */
  const em = (m, h) => { m.material.emissive.setHex(h); m.userData.osnovna = h; };
  function led(dan, termin, on) { [kreveti.led, kreveti.led2, ledLj].forEach((L) => L.forEach((c, i) => em(c, on && i === dan * 4 + termin ? 0x17d6c9 : 0x000000))); }
  function poziv(on) { em(svj, on ? 0xd8b04a : 0); em(kreveti.tip0, on ? 0x8a1a10 : 0); }
  function alarmMonitor(on) { em(kreveti.mon1, on ? 0x7a1010 : 0x063a3e); }
  function robotino(gdje) { const X = { ljekarna: -2.3, hodnik: 0.0, soba: 1.8 }[gdje] ?? -1.5; rob.position.set(X, 0, 0.8); }
  function robotRadi(on) { rame.rotation.y = on ? 0.2 : 0.9; nad.rotation.z = on ? 0.75 : 0.5; }
  led(2, 0, false); poziv(false); alarmMonitor(false);
  const POGLEDI = {
    cijela: { naziv: 'Cijeli odjel', cam: [4.5, 8.5, 10], cilj: [0, 0.6, -0.6] },
    ljekarna: { naziv: 'Ljekarna', cam: [-2.2, 2.2, -0.6], cilj: [-3.7, 1.0, -2.7] },
    soba: { naziv: 'Bolnička soba', cam: [3.6, 2.6, 0.9], cilj: [3.6, 0.8, -2.2] },
    hodnik: { naziv: 'Hodnik i stanica', cam: [3.0, 2.4, 4.4], cilj: [-0.6, 0.8, 1.6] },
  };
  const POGLED_DIJELA = { his: 'ljekarna', mes: 'hodnik', ur3e: 'ljekarna', spremnici: 'ljekarna', kamera: 'ljekarna', vaga: 'ljekarna', citac: 'ljekarna', farmaceut: 'ljekarna', robotino: 'hodnik', tabletar: 'soba', krevet: 'soba', monitor: 'soba', pumpa: 'soba', hladnjakL: 'soba', tipka: 'soba', stanica: 'hodnik' };
  return { grupa, dijelovi, led, poziv, alarmMonitor, robotino, robotRadi, POGLEDI, POGLED_DIJELA };
}
