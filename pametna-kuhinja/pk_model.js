/* FORTRONIQ · Pametna kuhinja — 3D model (three.js), u metrima. Kuhinja 10 × 6 m, os x lijevo–desno, z prema blagovaonici (+z).
   Raspored opreme je SHEMATSKI (pretpostavka). Svaka mreža nosi userData.dio = id iz DIJELOVI. © ForTroniQ d.o.o. */

export function napraviModel(THREE) {
  const grupa = new THREE.Group();
  const dijelovi = new Map();
  const mat = (boja, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: boja, roughness: 0.6, metalness: 0.1 }, o));
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
  const valjak = (r, h, m, n = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m);
  const W = 10, D = 6;
  const inox = mat(0xc9d1d6, { metalness: 0.55, roughness: 0.35 });
  const tamno = mat(0x3a4249, { metalness: 0.3, roughness: 0.5 });
  const bijelo = mat(0xeef2f3, { roughness: 0.5 });
  const teal = mat(0x13a39c, { roughness: 0.5 });

  /* pod i zidovi (niski, da se vidi unutra) */
  const pod = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0xb9c2c6, { roughness: 0.9 }));
  pod.rotation.x = -Math.PI / 2; grupa.add(pod);
  const plocice = new THREE.GridHelper(10, 20, 0x9aa5aa, 0x9aa5aa); plocice.scale.set(1, 1, 0.6); plocice.position.y = 0.002; plocice.material.opacity = 0.35; plocice.material.transparent = true; grupa.add(plocice);
  const zid = mat(0xe4e9ea, { roughness: 0.9 });
  const zS = kutija(W, 1.4, 0.1, zid); zS.position.set(0, 0.7, -D / 2 - 0.05); grupa.add(zS);
  const zL = kutija(0.1, 1.4, D, zid); zL.position.set(-W / 2 - 0.05, 0.7, 0); grupa.add(zL);

  /* —— hladnjak (komora) i šok hladnjak —— */
  const hl = dodaj(kutija(2.0, 2.3, 1.8, bijelo), 'hladnjak'); hl.position.set(-3.9, 1.15, -2.0);
  const hlV = dodaj(kutija(0.9, 1.9, 0.04, mat(0xdfe6e8)), 'hladnjak'); hlV.position.set(-3.6, 1.0, -1.08);
  const hlR = dodaj(kutija(0.05, 0.5, 0.05, inox), 'hladnjak'); hlR.position.set(-3.25, 1.05, -1.04);
  const hlZ = dodaj(kutija(0.32, 0.16, 0.03, mat(0x10394a, { emissive: 0x0d4a52 })), 'hladnjak'); hlZ.position.set(-4.4, 1.7, -1.08);
  const sok = dodaj(kutija(0.8, 1.8, 0.8, inox), 'sok'); sok.position.set(-2.4, 0.9, -2.5);
  const sokV = dodaj(kutija(0.7, 1.5, 0.03, mat(0xd6dde0)), 'sok'); sokV.position.set(-2.4, 0.95, -2.09);
  const rez = dodaj(kutija(0.7, 0.85, 0.7, inox), 'sok'); rez.position.set(-4.5, 0.43, 0.2);

  /* —— stanica za picu: stol, UR3e, peć —— */
  const stol = (x, z, w, d, dio) => {
    const g = dodaj(kutija(w, 0.05, d, inox), dio); g.position.set(x, 0.9, z);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const n = dodaj(kutija(0.04, 0.88, 0.04, inox), dio); n.position.set(x + a * (w / 2 - 0.05), 0.44, z + b * (d / 2 - 0.05)); });
    const p = dodaj(kutija(w - 0.1, 0.03, d - 0.1, inox), dio); p.position.set(x, 0.25, z);
  };
  stol(-1.1, -1.25, 1.4, 0.8, 'ur3e');
  [-1.5, -1.0].forEach((x, i) => { const t = dodaj(valjak(0.15, 0.015, mat(0xe8cfa0)), 'ur3e'); t.position.set(x, 0.935, -1.05); const u = dodaj(valjak(0.12, 0.005, mat(0xc0392b)), 'ur3e'); u.position.set(x, 0.945, -1.05); if (i) { const sir = dodaj(valjak(0.09, 0.004, mat(0xf6f1d8)), 'ur3e'); sir.position.set(x, 0.95, -1.05); } });
  /* UR3e — pojednostavljen (baza, rame, nadlaktica, podlaktica, zglob, lopata) */
  const ur = new THREE.Group(); ur.position.set(-0.6, 0.925, -1.45); grupa.add(ur);
  const urB = dodaj(valjak(0.065, 0.09, bijelo), 'ur3e', ur); urB.position.y = 0.045;
  const urP = dodaj(valjak(0.068, 0.012, teal), 'ur3e', ur); urP.position.y = 0.095;
  const rame = new THREE.Group(); rame.position.y = 0.15; rame.rotation.y = -0.5; ur.add(rame);
  const zg = (r, l, rod) => { const c = dodaj(valjak(r, l, bijelo), 'ur3e', rod); c.rotation.x = Math.PI / 2; return c; };
  zg(0.055, 0.12, rame);
  const nad = new THREE.Group(); nad.rotation.z = 0.55; rame.add(nad);
  const nL = dodaj(valjak(0.04, 0.244, bijelo), 'ur3e', nad); nL.position.y = 0.122;
  const lakat = new THREE.Group(); lakat.position.y = 0.244; lakat.rotation.z = -1.6; nad.add(lakat); zg(0.045, 0.1, lakat);
  const pod2 = dodaj(valjak(0.035, 0.213, bijelo), 'ur3e', lakat); pod2.position.y = 0.106;
  const zglob = new THREE.Group(); zglob.position.y = 0.213; zglob.rotation.z = 1.05; lakat.add(zglob); zg(0.035, 0.08, zglob);
  const prst = dodaj(valjak(0.032, 0.09, teal), 'ur3e', zglob); prst.position.y = 0.05;
  const lop = dodaj(kutija(0.02, 0.32, 0.26, inox), 'ur3e', zglob); lop.position.set(0, 0.24, 0); lop.rotation.z = Math.PI / 2;
  /* peć: postolje i dvije komore */
  const pecX = 0.25, pecZ = -2.45;
  stol(pecX, pecZ, 1.15, 0.95, 'pec');
  const pec = dodaj(kutija(1.05, 0.82, 0.9, inox), 'pec'); pec.position.set(pecX, 1.34, pecZ);
  const ust = [];
  [1.17, 1.53].forEach((y) => {
    const o = dodaj(kutija(0.86, 0.16, 0.02, mat(0x1b1f22, { emissive: 0x000000 })), 'pec'); o.position.set(pecX, y, pecZ + 0.46); ust.push(o);
    const rc = dodaj(kutija(0.6, 0.025, 0.03, tamno), 'pec'); rc.position.set(pecX, y + 0.1, pecZ + 0.48);
  });
  const pecZas = dodaj(kutija(0.18, 0.08, 0.02, mat(0x10394a, { emissive: 0x0d4a52 })), 'pec'); pecZas.position.set(pecX + 0.4, 1.65, pecZ + 0.47);
  const tk = dodaj(valjak(0.008, 0.25, mat(0xcc7a2e)), 'pec'); tk.rotation.x = Math.PI / 2; tk.position.set(pecX - 0.45, 1.6, pecZ + 0.5);

  /* —— roštilj, sonda, slaganje —— */
  const rX = 2.3, rZ = -2.45;
  const ormR = dodaj(kutija(1.4, 0.88, 0.85, inox), 'rostilj'); ormR.position.set(rX, 0.44, rZ);
  const ploca = dodaj(kutija(1.2, 0.06, 0.62, mat(0x2c3136, { metalness: 0.6, roughness: 0.4, emissive: 0x000000 })), 'rostilj'); ploca.position.set(rX, 0.92, rZ);
  const okvir = dodaj(kutija(1.3, 0.12, 0.05, inox), 'rostilj'); okvir.position.set(rX, 0.97, rZ - 0.34);
  const burgeri = [];
  for (let i = 0; i < 8; i++) { const b = dodaj(valjak(0.055, 0.025, mat(0x6b3b22, { roughness: 0.8 })), 'rostilj'); b.position.set(rX - 0.45 + (i % 4) * 0.3, 0.965, rZ - 0.12 + Math.floor(i / 4) * 0.24); burgeri.push(b); }
  const sTijelo = dodaj(kutija(0.12, 0.06, 0.2, mat(0x2b2f33)), 'sonda'); sTijelo.position.set(rX + 0.72, 1.0, rZ + 0.2);
  const sZas = dodaj(kutija(0.09, 0.005, 0.12, mat(0x10394a, { emissive: 0x0d4a52 })), 'sonda'); sZas.position.set(rX + 0.72, 1.033, rZ + 0.19);
  const sIgla = dodaj(valjak(0.004, 0.16, inox, 8), 'sonda'); sIgla.rotation.z = 1.2; sIgla.position.set(rX + 0.36, 0.99, rZ + 0.12);
  stol(3.6, -1.3, 0.9, 0.7, 'slaganje');
  const okv = dodaj(kutija(0.7, 0.5, 0.04, teal), 'slaganje'); okv.position.set(3.6, 1.2, -1.6);
  [0, 1, 2].forEach((i) => { const s = dodaj(valjak(0.06, 0.08, mat(0xd9a55b)), 'slaganje'); s.position.set(3.4 + i * 0.2, 0.97, -1.25); });
  /* napa iznad peći i roštilja */
  const napa = dodaj(kutija(3.4, 0.45, 1.1, inox), 'napa'); napa.position.set(1.3, 2.45, -2.4);
  const napaC = dodaj(kutija(0.5, 0.6, 0.5, inox), 'napa'); napaC.position.set(1.3, 2.95, -2.6);

  /* —— izdavanje: pult i kuhinjski zaslon (KDS) —— */
  const pult = dodaj(kutija(3.0, 1.0, 0.6, inox), 'kds'); pult.position.set(1.3, 0.5, 0.4);
  const grijL = dodaj(kutija(2.6, 0.04, 0.16, mat(0x9aa3a8, { metalness: 0.5, emissive: 0x3a1a06 })), 'kds'); grijL.position.set(1.3, 1.5, 0.35);
  [-0.9, 0.9].forEach((x) => { const s = dodaj(valjak(0.015, 0.48, inox, 8), 'kds'); s.position.set(1.3 + x, 1.25, 0.35); });
  const kdsS = dodaj(kutija(0.04, 0.7, 0.04, tamno), 'kds'); kdsS.position.set(-0.4, 1.35, 0.2);
  const kds = dodaj(kutija(0.75, 0.45, 0.04, mat(0x10394a, { emissive: 0x0e4c57 })), 'kds'); kds.position.set(-0.4, 1.75, 0.22);
  const tanjuri = [];
  for (let i = 0; i < 4; i++) { const t = dodaj(valjak(0.13, 0.02, bijelo), 'kds'); t.position.set(0.5 + i * 0.5, 1.01, 0.4); tanjuri.push(t); }

  /* —— Robotino s policom za pladnjeve —— */
  const rob = new THREE.Group(); rob.position.set(1.0, 0, 1.4); grupa.add(rob);
  const rb = dodaj(valjak(0.23, 0.2, mat(0x8e979c, { metalness: 0.4 })), 'robotino', rob); rb.position.y = 0.13;
  const rbB = dodaj(valjak(0.235, 0.04, teal), 'robotino', rob); rbB.position.y = 0.22;
  [0, 1, 2].forEach((i) => { const k = dodaj(valjak(0.05, 0.03, tamno, 12), 'robotino', rob); const a = i * 2 * Math.PI / 3; k.rotation.z = Math.PI / 2; k.rotation.y = a; k.position.set(Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2); });
  [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([x, z]) => { const s = dodaj(valjak(0.012, 0.75, inox, 8), 'robotino', rob); s.position.set(x, 0.62, z); });
  [0.55, 0.8, 1.0].forEach((y) => { const pl = dodaj(kutija(0.34, 0.015, 0.34, inox), 'robotino', rob); pl.position.y = y; });
  const tR = dodaj(kutija(0.3, 0.03, 0.3, mat(0xcc7a2e)), 'robotino', rob); tR.position.y = 1.02;
  const putanja = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1), mat(0x13a39c, { transparent: true, opacity: 0.6 }));
  putanja.rotation.x = -Math.PI / 2; putanja.position.set(1.0, 0.004, 2.25); putanja.scale.set(1, 1.7, 1); grupa.add(putanja);
  const put2 = putanja.clone(); put2.rotation.z = Math.PI / 2; put2.position.set(2.6, 0.004, 2.9); put2.scale.set(1, 3.2, 1); grupa.add(put2);

  /* —— perionica s trakom, kamera i sortiranje —— */
  const tX = 4.4;
  const traka = dodaj(kutija(0.6, 0.06, 3.2, mat(0x8a959b, { metalness: 0.5 })), 'perionica'); traka.position.set(tX, 0.92, 0.4);
  for (let i = 0; i < 16; i++) { const v = dodaj(valjak(0.02, 0.58, inox, 8), 'perionica'); v.rotation.z = Math.PI / 2; v.position.set(tX, 0.96, -1.1 + i * 0.2); }
  [[-1, -1.1], [1, -1.1], [-1, 1.9], [1, 1.9]].forEach(([a, z]) => { const n = dodaj(kutija(0.04, 0.9, 0.04, inox), 'perionica'); n.position.set(tX + a * 0.27, 0.45, z); });
  const per = dodaj(kutija(0.8, 1.3, 0.9, inox), 'perionica'); per.position.set(tX, 1.25, -0.4);
  const perL = dodaj(kutija(0.12, 0.05, 0.02, mat(0x1b1f22, { emissive: 0x000000 })), 'perionica'); perL.position.set(tX - 0.25, 1.7, 0.06);
  const kStup = dodaj(valjak(0.02, 1.0, tamno, 8), 'kamera'); kStup.position.set(tX + 0.45, 1.85, 1.1);
  const kNos = dodaj(kutija(0.5, 0.03, 0.03, tamno), 'kamera'); kNos.position.set(tX + 0.22, 2.33, 1.1);
  const kam = dodaj(kutija(0.1, 0.08, 0.14, mat(0x22272b)), 'kamera'); kam.position.set(tX, 2.28, 1.1);
  const leca = dodaj(valjak(0.025, 0.02, mat(0x0d4a52, { emissive: 0x0b3b40 }), 12), 'kamera'); leca.position.set(tX, 2.23, 1.1);
  ['vilice', 'žlice', 'noževi'].forEach((_, i) => { const k = dodaj(kutija(0.22, 0.16, 0.26, mat([0x13a39c, 0xcc7a2e, 0x3d5fc4][i])), 'kamera'); k.position.set(tX - 0.55, 0.65, 1.3 + i * 0.3); });
  const skretnica = dodaj(kutija(0.02, 0.06, 0.4, teal), 'kamera'); skretnica.position.set(tX - 0.2, 1.0, 1.55); skretnica.rotation.y = 0.5;
  const tanjurTr = []; for (let i = 0; i < 3; i++) { const t = dodaj(valjak(0.12, 0.02, bijelo), 'perionica'); t.position.set(tX, 1.0, 0.6 + i * 0.4); tanjurTr.push(t); }

  /* —— PLC ormar, brojilo, sirena —— */
  const orm = dodaj(kutija(0.6, 0.9, 0.25, mat(0xd6dcdf)), 'plc'); orm.position.set(-4.85, 1.5, 1.3); orm.rotation.y = Math.PI / 2;
  const lamp = dodaj(valjak(0.03, 0.02, mat(0x2ecad4, { emissive: 0x0b4b50 }), 10), 'plc'); lamp.rotation.z = Math.PI / 2; lamp.position.set(-4.72, 1.75, 1.15);
  const sir = dodaj(valjak(0.05, 0.1, mat(0xd33f2f, { emissive: 0x000000 }), 14), 'plc'); sir.position.set(-4.85, 2.05, 1.3);
  const broj = dodaj(kutija(0.3, 0.4, 0.15, mat(0xe9edef)), 'brojilo'); broj.position.set(-4.88, 1.45, 2.1); broj.rotation.y = Math.PI / 2;
  const brZ = dodaj(kutija(0.02, 0.08, 0.16, mat(0x10394a, { emissive: 0x0d4a52 })), 'brojilo'); brZ.position.set(-4.79, 1.52, 2.1);

  /* —— stanja —— */
  const grij = (m, on, boja) => { m.material.emissive.setHex(on ? boja : 0); m.userData.osnovna = m.material.emissive.getHex(); };
  function pecGrije(on) { ust.forEach((u) => grij(u, on, 0xa8360c)); }
  function rostiljGrije(on) { grij(ploca, on, 0x5a1a08); }
  function brojBurgera(n) { burgeri.forEach((b, i) => { b.visible = i < n; }); }
  function sirena(on) { grij(sir, on, 0xd33f2f); }
  function perilica(on) { grij(perL, on, 0x13a39c); }
  function robotino(gdje) { const P = { pult: [1.0, 1.4], put: [2.6, 2.5], suđe: [3.8, 1.6] }[gdje] || [1.0, 1.4]; rob.position.set(P[0], 0, P[1]); }
  function hladnjakAlarm(on) { hlZ.material.emissive.setHex(on ? 0x8a1a10 : 0x0d4a52); hlZ.userData.osnovna = hlZ.material.emissive.getHex(); }
  pecGrije(false); rostiljGrije(false); brojBurgera(0); sirena(false); perilica(false);

  const POGLEDI = {
    cijela: { naziv: 'Cijela kuhinja', cam: [6.5, 7.5, 9], cilj: [0, 0.8, -0.3] },
    stanice: { naziv: 'Peć, UR3e, roštilj', cam: [2.5, 2.45, 0.35], cilj: [0.6, 1.05, -2.1] },
    hladno: { naziv: 'Hladnjaci', cam: [-1.2, 2.4, 2.4], cilj: [-3.4, 1.1, -1.6] },
    transport: { naziv: 'Izdavanje i suđe', cam: [0.2, 2.8, 4.8], cilj: [2.6, 0.8, 0.8] },
    ormar: { naziv: 'Ormar i brojilo', cam: [-2.4, 1.9, 2.6], cilj: [-4.8, 1.5, 1.6] },
  };
  const POGLED_DIJELA = { kds: 'transport', ur3e: 'stanice', pec: 'stanice', rostilj: 'stanice', sonda: 'stanice', slaganje: 'stanice', napa: 'stanice', hladnjak: 'hladno', sok: 'hladno', robotino: 'transport', perionica: 'transport', kamera: 'transport', plc: 'ormar', brojilo: 'ormar' };
  return { grupa, dijelovi, pecGrije, rostiljGrije, brojBurgera, sirena, perilica, robotino, hladnjakAlarm, POGLEDI, POGLED_DIJELA, mjere: { W, D } };
}
