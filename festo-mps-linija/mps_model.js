/* FORTRONIQ · Festo MPS linija — parametarski 3D model stanica (three.js r163; THREE se predaje kao argument).
   Sve mjere i položaji iz mps_podaci.js; robotska stanica koristi model robota i kolica iz područja RV-M1
   (../robot-mitsubishi-rv-m1/rvm1_model.js: napraviRVM1, napraviStolMPS). Bez natpisa proizvođača.
   KS linije (x uz liniju, y prema stražnjoj strani, z gore) → scena: (x, z, −y).
   napraviModelLinije(THREE, opcije) → { grupa, robot, stol, dijelovi, istakni(id), dioOd(mesh), postavi(stanjeModela), izradci, tocke }
   © ForTroniQ d.o.o. */
import * as P from './mps_podaci.js';
import { napraviRVM1, napraviStolMPS } from '../robot-mitsubishi-rv-m1/rvm1_model.js';

export function napraviModelLinije(THREE, opcije = {}) {
  const O = Object.assign({ kabeli: true, pod: true, uzorci: false }, opcije);
  const M_ = P.MJERE, VRH = P.VRH_PLOCE, H = M_.kolica.visina, DUB = M_.kolica.dubina;
  const V = (x, y, z) => new THREE.Vector3(x, z, -y);
  const grupa = new THREE.Group(); grupa.name = 'Festo MPS linija';
  const dijelovi = new Map();
  /* ------------------------------------------------------------ materijali */
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o));
  const MT = {
    alu: std(0xc3c9cf, { metalness: 0.55, roughness: 0.38 }), aluT: std(0x9aa1a8, { metalness: 0.5, roughness: 0.45 }), utor: std(0x5d646b, { roughness: 0.8 }),
    kolica: std(0xe9e6dd, { roughness: 0.7 }), kolicaT: std(0xb9b7ae), crna: std(0x1c1e21, { roughness: 0.55 }), crnaM: std(0x2b2d31, { roughness: 0.4 }),
    siva: std(0x8b9097), plc: std(0x9c9fa5, { roughness: 0.5 }), plcT: std(0x5f6369), zelenoT: std(0x3d9a4b), cink: std(0xd5d8db, { metalness: 0.7, roughness: 0.3 }),
    plavo: std(0x2f71b8, { roughness: 0.45 }), plavoS: std(0x3d9bd2, { roughness: 0.45 }), plavaCijev: std(0x2a6fd6, { roughness: 0.5 }),
    prozirno: std(0xcfe3ee, { transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0, depthWrite: false }),
    plocaP: std(0x6f757c, { roughness: 0.5 }),
    zelena: std(0x2fa84f, { emissive: 0x000000 }), crvena: std(0xd23a2e), plavaT: std(0x2c64c8, { emissive: 0x000000 }), zuta: std(0xf2c230, { emissive: 0x000000 }), bijela: std(0xf2f2ee, { emissive: 0x000000 }),
    zrak: std(0x8fd6ff, { transparent: true, opacity: 0.0, emissive: 0x2a9fd6, emissiveIntensity: 0.6, depthWrite: false }),
    pod: std(0xd9d6cf, { roughness: 0.95 })
  };
  /* ------------------------------------------------------------ alati */
  const box = (w, d, h, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, s = 24, r2) => new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, h, s), m);
  const cijev = (r, rIn, h, m, s = 28) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r, 0, Math.PI * 2); const ho = new THREE.Path(); ho.absarc(0, 0, rIn, 0, Math.PI * 2, true); sh.holes.push(ho); const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: s }); g.rotateX(-Math.PI / 2); return new THREE.Mesh(g, m); };
  const cylX = (r, len, m, s = 16) => { const c = cyl(r, len, m, s); c.rotation.z = Math.PI / 2; return c; };
  const cylY = (r, len, m, s = 16) => { const c = cyl(r, len, m, s); c.rotation.x = Math.PI / 2; return c; };
  function na(rod, mesh, x, y, z) { mesh.position.copy(V(x, y, z)); rod.add(mesh); return mesh; }
  function G(rod, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.copy(V(x, y, z)); rod.add(g); return g; }
  function dio(id, ...obj) {
    const d = P.nadjiDio(id);
    if (!dijelovi.has(id)) dijelovi.set(id, { naziv: d ? d.naziv : id, objekti: [] });
    obj.forEach((o) => { if (!o) return; dijelovi.get(id).objekti.push(o); if (!o.userData.dioMps) o.userData.dioMps = id; });
  }
  /* kutija s donjim središtem u (x, y, z) */
  const kut = (rod, w, d, h, m, x, y, z) => na(rod, box(w, d, h, m), x, y, z + h / 2);
  const stup = (rod, r, h, m, x, y, z, s) => na(rod, cyl(r, h, m, s), x, y, z + h / 2);

  /* ------------------------------------------------------------ pod */
  if (O.pod) {
    const pod = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), MT.pod); pod.rotation.x = -Math.PI / 2; pod.position.copy(V(M_.kolica.duljinaLinije / 2, 0.6, -0.001)); pod.userData.bezDuha = true; grupa.add(pod);
  }

  /* ------------------------------------------------------------ kolica, ploča, upravljačka ploča — uske stanice */
  const ST = ['dist', 'isp', 'obr'];
  const sk = {};      /* grupe stanica */
  const panelMeshes = { start: [], reset: [], q1: [], q2: [] };
  function kolicaUska(id, i) {
    const x0 = M_.kolica.x0[i], w = M_.kolica.sirine[i], xc = x0 + w / 2;
    const g = G(grupa); g.name = P.STANICE[id].naziv; sk[id] = g;
    const k = G(g); dio('kolica', k);
    const hk = M_.kolica.plinta;
    kut(k, w - 0.004, DUB - 0.004, H - hk - 0.012, MT.kolica, xc, DUB / 2, hk);
    [[0.02, 0.02], [w - 0.02, 0.02], [0.02, DUB - 0.02], [w - 0.02, DUB - 0.02]].forEach(([a, b]) => {
      kut(k, 0.03, 0.03, H - hk, MT.kolicaT, x0 + a, b, hk);
      const kot = cylX(0.026, 0.022, MT.crna, 14); na(k, kot, x0 + a, b, 0.03);
      kut(k, 0.03, 0.03, 0.04, MT.cink, x0 + a, b, 0.045);
    });
    kut(k, w - 0.04, 0.004, 0.06, MT.utor, xc, -0.0005, H - 0.22);
    kut(k, w, DUB, 0.012, MT.aluT, xc, DUB / 2, H - 0.012);
    const pl = G(g); dio('profilnaPloca', pl);
    kut(pl, w, DUB, M_.ploca.debljina, MT.alu, xc, DUB / 2, H);
    const n = Math.round(w / M_.ploca.korakUtora);
    for (let u = 0; u < n; u++) kut(pl, M_.ploca.sirinaUtora, DUB + 0.001, 0.002, MT.utor, x0 + M_.ploca.korakUtora * (u + 0.5), DUB / 2, VRH - 0.0015);
    /* upravljačka ploča na prednjoj strani kolica, nagnuta */
    const up = G(g, xc, -0.035, VRH - 0.075); dio('upravljackaPloca', up);
    up.rotation.x = -(90 - M_.upravljackaPloca.nagib) * Math.PI / 180;
    const pw = M_.upravljackaPloca.sirina;
    kut(up, pw, 0.006, 0.10, MT.plocaP, 0, 0, -0.05);
    kut(up, pw, 0.05, 0.012, MT.plocaP, 0, 0.025, 0.05);
    const tip = (idd, m, xx, zz, r = 0.009) => { const t = cylY(r, 0.012, m, 18); na(up, t, xx, -0.006, zz); dio(idd, t); return t; };
    const s1 = tip('tipkaStart', MT.zelena.clone(), -pw / 2 + 0.04, 0.02);
    const s2 = tip('tipkaStop', MT.crvena, -pw / 2 + 0.08, 0.02);
    const s3 = tip('tipkaReset', MT.plavaT.clone(), -pw / 2 + 0.12, 0.02);
    const kl = G(up, -pw / 2 + 0.17, 0, 0.02); dio('kljucAutoMan', kl);
    na(kl, cylY(0.011, 0.01, MT.crna, 16), 0, -0.005, 0); na(kl, box(0.004, 0.012, 0.016, MT.cink), 0, -0.012, 0);
    const lq1 = tip('lampice', MT.bijela.clone(), -pw / 2 + 0.04, -0.025, 0.007);
    const lq2 = tip('lampice', MT.zuta.clone(), -pw / 2 + 0.08, -0.025, 0.007);
    const gl = G(up, pw / 2 - 0.045, 0, -0.005); dio('gljiva', gl);
    na(gl, cylY(0.013, 0.02, MT.crna, 16), 0, -0.01, 0); na(gl, cylY(0.022, 0.016, MT.crnaM, 24), 0, -0.026, 0);
    kut(gl, 0.05, 0.003, 0.05, MT.zuta, 0, 0.0, -0.025);
    panelMeshes.start.push([id, s1]); panelMeshes.reset.push([id, s3]); panelMeshes.q1.push([id, lq1]); panelMeshes.q2.push([id, lq2]);
    sk[id].gljiva = gl;
    /* PLC i I/O terminal na prednjem dijelu ploče, ventilski otok straga */
    const plc = G(g); dio('plc', plc);
    kut(plc, w * 0.62, 0.10, 0.07, MT.plc, xc + 0.02, 0.07, VRH);
    kut(plc, w * 0.25, 0.004, 0.035, MT.plcT, xc - 0.02, 0.019, VRH + 0.02);
    const sy = G(g); dio('sysLink', sy);
    kut(sy, 0.07, 0.05, 0.03, MT.zelenoT, x0 + 0.06, 0.07, VRH);
    for (let q = 0; q < 6; q++) kut(sy, 0.006, 0.02, 0.006, MT.zuta, x0 + 0.035 + q * 0.01, 0.06, VRH + 0.03);
    const vo = G(g); dio('ventilskiOtok', vo);
    kut(vo, 0.09, 0.05, 0.035, MT.siva, x0 + w - 0.07, DUB - 0.06, VRH);
    for (let q = 0; q < 4; q++) kut(vo, 0.012, 0.045, 0.03, MT.plavaCijev, x0 + w - 0.105 + q * 0.022, DUB - 0.06, VRH + 0.035);
    return g;
  }
  ST.forEach((id, i) => kolicaUska(id, i));
  /* StationLink: odašiljač (ulaz stanice) i prijamnik (izlaz prethodne) na granici */
  for (let i = 1; i < 3; i++) {
    const xb = M_.kolica.x0[i];
    const g = G(grupa); dio('stationLink', g);
    kut(g, 0.018, 0.024, 0.03, MT.crna, xb - 0.012, 0.18, VRH);
    kut(g, 0.018, 0.024, 0.03, MT.crna, xb + 0.012, 0.18, VRH);
    na(g, cylX(0.004, 0.003, MT.crvena, 10), xb - 0.0015, 0.18, VRH + 0.02);
  }

  /* ------------------------------------------------------------ distribucijska stanica */
  const D_ = M_.dist, sp = D_.spremnik, gD = sk.dist;
  const pzr = G(gD); dio('pripremaZraka', pzr);
  function pripremaZraka(rod, x, y) {
    kut(rod, 0.05, 0.012, 0.13, MT.aluT, x, y + 0.02, VRH);
    stup(rod, 0.018, 0.05, MT.prozirno, x, y, VRH + 0.035);
    stup(rod, 0.02, 0.03, MT.siva, x, y, VRH + 0.085);
    stup(rod, 0.016, 0.03, MT.plavaCijev, x, y, VRH + 0.115);
    na(rod, cylY(0.012, 0.012, MT.cink, 16), x - 0.025, y - 0.01, VRH + 0.1);
  }
  pripremaZraka(pzr, 0.05, 0.62);
  const spr = G(gD); dio('dSpremnik', spr);
  kut(spr, 0.08, 0.24, sp.zDno - VRH, MT.crna, sp.x, 0.43, VRH);                       /* crno podnožje s kanalom izbacivača */
  na(spr, cijev(0.0225, 0.0205, sp.visinaCijevi, MT.prozirno), sp.x, sp.y, sp.zDno + 0.004);
  kut(spr, 0.02, 0.02, sp.zDno - VRH + sp.visinaCijevi, MT.aluT, sp.x, sp.y + 0.04, VRH);
  kut(spr, 0.05, 0.012, 0.012, MT.aluT, sp.x, sp.y + 0.03, sp.zDno + sp.visinaCijevi - 0.02);
  const ssp = G(gD); dio('dSenzorSpremnika', ssp);
  kut(ssp, 0.012, 0.012, 0.016, MT.crnaM, sp.x - 0.03, sp.y, sp.zDno + 0.005); kut(ssp, 0.012, 0.012, 0.016, MT.crnaM, sp.x + 0.03, sp.y, sp.zDno + 0.005);
  const izb = G(gD); dio('dIzbacivac', izb);
  const yIzb0 = sp.y + 0.022;
  na(izb, cylY(0.012, 0.13, MT.alu, 18), sp.x, yIzb0 + 0.1, sp.zDno + 0.012);
  const izbKlip = G(izb, sp.x, yIzb0, sp.zDno);
  na(izbKlip, cylY(0.004, 0.04, MT.cink, 10), 0, 0.02, 0.012); kut(izbKlip, 0.04, 0.006, 0.02, MT.crnaM, 0, 0, 0.002);
  const sci = G(gD); dio('dSenzoriCilindra', sci);
  kut(sci, 0.006, 0.012, 0.005, MT.plavaCijev, sp.x + 0.012, yIzb0 + 0.06, sp.zDno + 0.025); kut(sci, 0.006, 0.012, 0.005, MT.plavaCijev, sp.x + 0.012, yIzb0 + 0.14, sp.zDno + 0.025);
  const prg = G(gD); dio('dPrigusni', prg);
  na(prg, cylX(0.005, 0.016, MT.plavaCijev, 10), sp.x - 0.018, yIzb0 + 0.05, sp.zDno + 0.012); na(prg, cylX(0.005, 0.016, MT.plavaCijev, 10), sp.x - 0.018, yIzb0 + 0.15, sp.zDno + 0.012);
  /* modul za premještanje */
  const os = D_.ruka.os, zR = D_.ruka.zSisaljke + 0.03;
  const zp = G(gD); dio('dZakretniPogon', zp);
  kut(zp, 0.03, 0.03, zR - VRH - 0.01, MT.aluT, os[0], os[1] + 0.05, VRH);
  kut(zp, 0.045, 0.03, 0.02, MT.aluT, os[0], os[1] + 0.03, zR - 0.03);
  stup(zp, 0.022, 0.04, MT.alu, os[0], os[1], zR + 0.008, 24);
  const mik = G(gD); dio('dMikroprekidaci', mik);
  kut(mik, 0.012, 0.01, 0.018, MT.crnaM, os[0] - 0.03, os[1] + 0.02, zR + 0.01); kut(mik, 0.012, 0.01, 0.018, MT.crnaM, os[0] + 0.03, os[1] + 0.02, zR + 0.01);
  const ej = G(gD); dio('dEjektor', ej);
  kut(ej, 0.03, 0.014, 0.014, MT.siva, os[0], os[1] + 0.08, zR - 0.03); na(ej, cylX(0.004, 0.012, MT.plavaCijev, 8), os[0] + 0.02, os[1] + 0.08, zR - 0.023);
  const vp = G(gD); dio('dVakuumPrekidac', vp);
  kut(vp, 0.022, 0.012, 0.03, MT.plavaCijev, os[0] - 0.035, os[1] + 0.08, zR - 0.04);
  const ruka = G(gD, os[0], os[1], zR); dio('dRuka', ruka);
  const rukaTijelo = box(D_.ruka.duljina + 0.03, 0.022, 0.012, MT.alu); rukaTijelo.position.set((D_.ruka.duljina) / 2, 0, 0); ruka.add(rukaTijelo);
  const sis = new THREE.Group(); sis.position.set(D_.ruka.duljina, 0, 0); ruka.add(sis); dio('dSisaljka', sis);
  const sTi = cyl(0.005, 0.03, MT.cink, 10); sTi.position.y = -0.02; sis.add(sTi);
  const sCa = cyl(0.009, 0.008, MT.crna, 16, 0.006); sCa.position.y = -(zR - (sp.zDno + 0.025)) + 0.004; sis.add(sCa);
  const sTi2 = cyl(0.003, zR - (sp.zDno + 0.025) - 0.03, MT.cink, 8); sTi2.position.y = -0.035 - (zR - (sp.zDno + 0.025) - 0.03) / 2 + 0.004; sis.add(sTi2);

  /* ------------------------------------------------------------ ispitna stanica */
  const I_ = M_.isp, di = I_.dizalo, gI = sk.isp;
  const zTop = di.zDolje + di.hod;
  const dz = G(gI); dio('tDizalo', dz);
  kut(dz, 0.04, 0.04, zTop - VRH + 0.12, MT.alu, di.x - 0.005, di.y + 0.06, VRH);
  na(dz, cyl(0.011, zTop - VRH + 0.06, MT.cink, 16), di.x + 0.022, di.y + 0.05, (VRH + zTop + 0.08) / 2);
  const kar = G(dz, di.x, di.y, di.zDolje);     /* nosač platforme (pomiče se) */
  kut(kar, 0.05, 0.04, 0.05, MT.aluT, -0.005, 0.04, -0.035);
  kut(kar, 0.07, 0.06, 0.006, MT.alu, 0.005, 0, -0.006);
  const izbI = G(kar); dio('tIzbacivac', izbI);
  na(izbI, cylX(0.009, 0.05, MT.alu, 16), -0.055, 0, 0.012);
  const izbIK = G(izbI, -0.03, 0, 0); kut(izbIK, 0.006, 0.03, 0.018, MT.crnaM, 0, 0, 0.003); na(izbIK, cylX(0.003, 0.03, MT.cink, 8), -0.015, 0, 0.012);
  const sdz = G(gI); dio('tSenzoriDizala', sdz);
  kut(sdz, 0.01, 0.012, 0.012, MT.plavaCijev, di.x + 0.015, di.y + 0.085, di.zDolje); kut(sdz, 0.01, 0.012, 0.012, MT.plavaCijev, di.x + 0.015, di.y + 0.085, zTop);
  const lv = G(gI); dio('tLancaniVodic', lv);
  const lvF = box(0.018, 0.01, 1, MT.crna); lv.add(lvF);
  const lvP = box(0.018, 0.01, 1, MT.crna); lv.add(lvP);
  const lvL = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12, Math.PI), MT.crna); lv.add(lvL);
  function lanac(zKar) {
    const xL = di.x - 0.04, yL = di.y + 0.11, zMin = VRH + 0.03;
    const zDno = Math.min(zKar, zMin + (zKar - zMin) / 2) - 0.02;
    const a = zKar - zDno, b = (VRH + 0.18) - zDno;
    lvF.scale.y = Math.max(0.01, b); lvF.position.copy(V(xL, yL + 0.02, zDno + b / 2));
    lvP.scale.y = Math.max(0.01, a); lvP.position.copy(V(xL, yL - 0.02, zDno + a / 2));
    lvL.position.copy(V(xL, yL, zDno)); lvL.rotation.set(0, Math.PI / 2, Math.PI);
  }
  const mp = G(gI); dio('tMjerniModul', mp);
  kut(mp, 0.03, 0.03, 0.10, MT.alu, di.x - 0.005, di.y + 0.06, zTop + 0.07);
  kut(mp, 0.03, 0.08, 0.02, MT.aluT, di.x, di.y + 0.025, zTop + 0.15);
  na(mp, cyl(0.012, 0.05, MT.alu, 16), di.x, di.y, zTop + 0.135);
  const sonda = G(mp, di.x, di.y, zTop + 0.11); dio('tAnalogniSenzor', sonda);
  na(sonda, cyl(0.007, 0.05, MT.siva, 14), 0, 0, -0.005); na(sonda, cyl(0.003, 0.02, MT.cink, 8), 0, 0, -0.04);
  const mpr = G(gI); dio('tModulPrepoznavanja', mpr);
  kut(mpr, 0.10, 0.012, 0.05, MT.aluT, di.x, di.y - 0.08, VRH);
  const kap = G(gI); dio('tKapacitivni', kap); na(kap, cylY(0.009, 0.05, MT.siva, 16), di.x - 0.03, di.y - 0.055, di.zDolje + 0.012);
  const opt = G(gI); dio('tOpticki', opt); kut(opt, 0.018, 0.03, 0.022, MT.crnaM, di.x, di.y - 0.05, di.zDolje + 0.002);
  const ind = G(gI); dio('tInduktivni', ind); na(ind, cylY(0.008, 0.045, MT.cink, 16), di.x + 0.03, di.y - 0.055, di.zDolje + 0.012);
  const bar = G(gI); dio('tBarijera', bar);
  kut(bar, 0.012, 0.012, 0.16, MT.crnaM, di.x - 0.06, di.y - 0.12, VRH); kut(bar, 0.012, 0.012, 0.16, MT.crnaM, di.x + 0.09, di.y - 0.12, VRH);
  /* zračni klizač i klizač škarta */
  function kanal(rod, od, doo, z0, z1, sir, m) {
    const dx = doo[0] - od[0], dy = doo[1] - od[1], L = Math.hypot(dx, dy), dzz = z1 - z0, Ls = Math.hypot(L, dzz);
    const g = new THREE.Group(); g.position.copy(V((od[0] + doo[0]) / 2, (od[1] + doo[1]) / 2, (z0 + z1) / 2)); rod.add(g);
    g.rotation.y = Math.atan2(dy, dx); const g2 = new THREE.Group(); g2.rotation.z = Math.atan2(dzz, L); g.add(g2);
    const dno = box(Ls, sir, 0.004, m); dno.position.y = -0.004; g2.add(dno);
    [-1, 1].forEach((s) => { const st2 = box(Ls, 0.004, 0.02, m); st2.position.set(0, 0.006, s * (sir / 2)); g2.add(st2); });
    g.g2 = g2; g.Ls = Ls;
    return g;
  }
  const zk = G(gI); dio('tZracniKlizac', zk);
  const zkK = kanal(zk, I_.zracniKlizac.od, I_.zracniKlizac.do, zTop, M_.obr.stol.zVrh, 0.046, MT.alu);
  const zrakM = MT.zrak.clone();
  const zrakS = box(zkK.Ls, 0.04, 0.003, zrakM); zrakS.userData.bezDuha = true; zrakS.position.y = 0.0; zkK.g2.add(zrakS);
  kut(zk, 0.012, 0.012, zTop - VRH - 0.01, MT.aluT, I_.zracniKlizac.od[0] + 0.03, I_.zracniKlizac.od[1] + 0.03, VRH);
  kut(zk, 0.012, 0.012, (zTop + M_.obr.stol.zVrh) / 2 - VRH - 0.01, MT.aluT, (I_.zracniKlizac.od[0] + I_.zracniKlizac.do[0]) / 2, I_.zracniKlizac.od[1] + 0.03, VRH);
  const ks = G(gI); dio('tKlizacSkarta', ks);
  kanal(ks, I_.klizacSkarta.od, I_.klizacSkarta.do, di.zDolje, di.zDolje - I_.klizacSkarta.pad, 0.046, MT.aluT);
  kut(ks, 0.006, 0.05, 0.03, MT.aluT, I_.klizacSkarta.do[0] + 0.025, I_.klizacSkarta.do[1], di.zDolje - I_.klizacSkarta.pad - 0.005);
  kut(ks, 0.02, 0.03, di.zDolje - VRH - 0.03, MT.aluT, (I_.klizacSkarta.od[0] + I_.klizacSkarta.do[0]) / 2, I_.klizacSkarta.od[1], VRH);

  /* ------------------------------------------------------------ obradna stanica */
  const OB = M_.obr, sT = OB.stol, gO = sk.obr;
  const mot = G(gO); dio('oMotorStola', mot);
  stup(mot, 0.07, sT.zVrh - VRH - 0.03, MT.plavo, sT.x, sT.y, VRH, 32);
  kut(mot, 0.05, 0.05, 0.05, MT.plavo, sT.x + 0.06, sT.y - 0.06, VRH);
  stup(mot, 0.03, 0.02, MT.aluT, sT.x, sT.y, sT.zVrh - 0.03, 20);
  const stol = G(gO, sT.x, sT.y, sT.zVrh); dio('oStol', stol);
  const disk = cyl(sT.polumjer, 0.008, MT.alu, 48); disk.position.y = -0.004; stol.add(disk);
  const gnz = new THREE.Group(); stol.add(gnz); dio('oGnijezda', gnz);
  for (let n = 0; n < sT.gnijezda; n++) {
    const a = n * 2 * Math.PI / sT.gnijezda;
    const r = cijev(0.024, 0.0205, 0.006, MT.aluT, 28); r.position.set(sT.rGnijezda * Math.cos(a), -0.001, -sT.rGnijezda * Math.sin(a)); gnz.add(r);
  }
  const sPol = G(gO); dio('oSenzorPolozaja', sPol); na(sPol, cylX(0.006, 0.03, MT.cink, 12), sT.x - 0.1, sT.y - 0.08, sT.zVrh - 0.02);
  const sPri = G(gO); dio('oSenzoriPrisutnosti', sPri);
  for (const m of ['ulaz', 'busenje', 'ispitivanje']) { const xy = P.MJESTA[m === 'ulaz' ? 'ulazObradne' : m]; kut(sPri, 0.012, 0.012, sT.zVrh - VRH - 0.02, MT.siva, xy[0] + (xy[0] - sT.x) * 0.45, xy[1] + (xy[1] - sT.y) * 0.45, VRH); }
  /* ispitivač */
  const [ix, iy] = P.MJESTA.ispitivanje, ux = (ix - sT.x) / sT.rGnijezda, uy = (iy - sT.y) / sT.rGnijezda;
  const isg = G(gO); dio('oIspitivac', isg);
  kut(isg, 0.025, 0.025, sT.zVrh - VRH + 0.12, MT.alu, ix + ux * 0.065, iy + uy * 0.065, VRH);
  kut(isg, 0.07, 0.025, 0.018, MT.aluT, ix + ux * 0.035, iy + uy * 0.035, sT.zVrh + 0.1);
  na(isg, cyl(0.011, 0.05, MT.alu, 16), ix, iy, sT.zVrh + 0.13);
  const isK = G(isg, ix, iy, sT.zVrh + 0.06); na(isK, cyl(0.004, 0.06, MT.cink, 10), 0, 0, 0.0);
  /* bušilica */
  const [bx, by] = P.MJESTA.busenje, vx = (bx - sT.x) / sT.rGnijezda, vy = (by - sT.y) / sT.rGnijezda;
  const bu = G(gO); dio('oBusilica', bu);
  kut(bu, 0.035, 0.035, sT.zVrh - VRH + 0.22, MT.alu, bx + vx * 0.08, by + vy * 0.08, VRH);
  kut(bu, 0.04, 0.03, 0.10, MT.aluT, bx + vx * 0.05, by + vy * 0.05, sT.zVrh + 0.08);
  const buS = G(bu, bx, by, sT.zVrh + 0.10);
  na(buS, cyl(0.02, 0.08, MT.siva, 20), 0, 0, 0.04); na(buS, cyl(0.022, 0.012, MT.crna, 20), 0, 0, 0.086);
  kut(buS, 0.03, 0.03, 0.04, MT.aluT, vx * 0.03, vy * 0.03, 0.02);
  const vret = new THREE.Group(); vret.position.copy(V(0, 0, -0.005)); buS.add(vret);
  const svrdlo = cyl(0.0025, 0.03, MT.cink, 6); svrdlo.position.y = -0.008; vret.add(svrdlo);
  const stz = G(gO); dio('oStezanje', stz);
  const sxA = bx - vy * 0.06, syA = by + vx * 0.06;
  kut(stz, 0.02, 0.02, sT.zVrh - VRH + 0.02, MT.aluT, sxA, syA, VRH);
  const stzK = G(stz, sxA, syA, sT.zVrh + 0.014); stzK.rotation.y = Math.atan2(-vx, vy);
  const stzC = cylX(0.007, 0.03, MT.alu, 12); stzC.position.x = 0.0; stzK.add(stzC);
  const stzP = new THREE.Group(); stzK.add(stzP); const stzR = cylX(0.0025, 0.03, MT.cink, 8); stzR.position.x = 0.025; stzP.add(stzR);
  const izl = G(gO); dio('oIzlaz', izl);
  const [ox, oy] = P.MJESTA.izlazObradne;
  kut(izl, 0.012, 0.012, sT.zVrh - VRH - 0.02, MT.siva, ox + 0.05, oy, VRH);
  const ozn = cijev(0.032, 0.029, 0.002, MT.zuta, 28); na(izl, ozn, ox, oy, VRH + 0.001);

  /* ------------------------------------------------------------ robotska i montažna stanica (kolica iz područja robota) */
  const R_ = M_.rob, xR0 = M_.kolica.x0[3], wR = M_.kolica.sirine[3];
  const gR = G(grupa); gR.name = P.STANICE.rob.naziv; sk.rob = gR;
  const stolR = napraviStolMPS(THREE, { celicnaPloca: false, upravljackaPloca: true });
  stolR.position.copy(V(xR0 + wR / 2, DUB / 2, 0)); stolR.rotation.y = -Math.PI / 2; gR.add(stolR);
  const sdj = stolR.userData.dijelovi;
  const sd = (id) => (sdj && sdj.get(id) ? sdj.get(id).objekti : []);
  dio('kolica', ...sd('kolicaMPS')); dio('profilnaPloca', ...sd('profilnaPloca')); dio('upravljackaPloca', ...sd('upravljackaPlocaMPS'));
  /* robot na čeličnoj ploči */
  const robot = napraviRVM1(THREE, { ploca: true, unutrasnjost: false, kabeli: O.kabeli });
  robot.korijen.position.copy(V(R_.robot.x, R_.robot.y, R_.zBaze)); robot.korijen.rotation.y = -Math.PI / 2;
  gR.add(robot.korijen);
  dio('rRobot', robot.korijen);
  const rd = (id) => (robot.dijelovi && robot.dijelovi.get(id) ? robot.dijelovi.get(id).objekti : []);
  rd('prihvatnica').forEach((o) => { o.userData.dioMps = 'rPrihvatnica'; }); dio('rPrihvatnica', ...rd('prihvatnica'));
  rd('celicnaPloca').forEach((o) => { o.userData.dioMps = 'rCelicnaPloca'; }); dio('rCelicnaPloca', ...rd('celicnaPloca'));
  /* montažno gnijezdo */
  const gn = R_.gnijezdo, [gw, gd, gh] = gn.mjere;
  const gnG = G(gR); dio('rGnijezdo', gnG);
  kut(gnG, gw, gd, gh, MT.plavoS, gn.x, gn.y, VRH);
  na(gnG, cyl(0.0205, 0.002, MT.crna, 28), gn.x, gn.y, VRH + gh + 0.0005);
  kut(gnG, gw + 0.03, gd + 0.01, 0.008, MT.aluT, gn.x, gn.y, VRH);
  const sbo = G(gR); dio('rSenzorBoje', sbo); kut(sbo, 0.014, 0.02, 0.014, MT.crnaM, gn.x + gw / 2 + 0.007, gn.y, VRH + gh - 0.03);
  /* paleta klipova */
  const pa = R_.paleta, pal = G(gR); dio('rPaleta', pal);
  const paX = pa.x0 + (pa.mjesta - 1) * pa.korak / 2;
  kut(pal, pa.mjesta * pa.korak + 0.02, Math.abs(pa.yCrni - pa.ySrebrni) + 0.04, pa.zDno - VRH, MT.aluT, paX, (pa.yCrni + pa.ySrebrni) / 2, VRH);
  for (let i = 0; i < pa.mjesta; i++) for (const y of [pa.yCrni, pa.ySrebrni]) na(pal, cyl(0.012, 0.0015, MT.crna, 16), pa.x0 + i * pa.korak, y, pa.zDno + 0.0004);
  /* spremnici poklopaca i opruga s cilindrima */
  const sCil = G(gR); dio('rCilindriSpremnika', sCil);
  const potiskivaci = {};
  function spremnikM(id, s, kljuc) {
    const g = G(gR); dio(id, g);
    kut(g, 0.07, 0.12, s.zIzlaz - VRH, MT.alu, s.x, (s.y + s.uzimanje[1]) / 2 + 0.01, VRH);
    na(g, cijev(s.promjer / 2, s.promjer / 2 - 0.002, s.visinaCijevi, MT.prozirno), s.x, s.y, s.zIzlaz + 0.003);
    kut(g, 0.012, 0.012, s.zIzlaz - VRH + s.visinaCijevi, MT.aluT, s.x + s.promjer / 2 + 0.012, s.y, VRH);
    na(sCil, cylY(0.01, 0.06, MT.alu, 14), s.x, s.y + 0.06, s.zIzlaz + 0.008);
    const pk = G(sCil, s.x, s.y + s.promjer / 2 + 0.002, s.zIzlaz); kut(pk, s.promjer * 0.9, 0.005, 0.012, MT.crnaM, 0, 0, 0.001);
    potiskivaci[kljuc] = { g: pk, y0: s.y + s.promjer / 2 + 0.002, hod: s.y - s.uzimanje[1] };
  }
  spremnikM('rSpremnikPoklopaca', R_.spremnikPoklopaca, 'poklopac');
  spremnikM('rSpremnikOpruga', R_.spremnikOpruga, 'opruga');
  /* izlazni klizač */
  const iz = R_.izlaz, izG = G(gR); dio('rIzlaz', izG);
  kanal(izG, iz.od, iz.do, iz.zDno, iz.zDno - iz.pad, 0.046, MT.alu);
  kut(izG, 0.05, 0.006, 0.03, MT.aluT, iz.do[0], iz.do[1] - 0.026, VRH);
  const prR = G(gR); dio('pripremaZraka', prR); pripremaZraka(prR, R_.pripremaZraka.x, R_.pripremaZraka.y);
  const suc = G(gR); dio('rSucelje', suc);
  kut(suc, 0.07, 0.10, 0.045, MT.plc, R_.sucelje.x, R_.sucelje.y, VRH);
  for (let q = 0; q < 8; q++) kut(suc, 0.006, 0.012, 0.006, MT.zelenoT, R_.sucelje.x - 0.025 + q * 0.007, R_.sucelje.y - 0.04, VRH + 0.045);
  dio('linija', sk.dist, sk.isp, sk.obr, sk.rob);
  /* nedostajući id-ovi koji se prikazuju na stranici bez vlastitog 3D dijela (izradci) dobiju se iz izradaka */

  /* ------------------------------------------------------------ izradci */
  const izradci = new Map();
  const matIzr = {};
  const IZ = P.IZRADCI;
  const mIz = (boja) => matIzr[boja] || (matIzr[boja] = std(boja === 'alu' || boja === 'srebrni' ? 0xc6ccd2 : boja === 'crveno' ? 0xc8312a : boja === 'opruga' ? 0x9aa3ab : 0x232529, boja === 'alu' || boja === 'srebrni' || boja === 'opruga' ? { metalness: 0.65, roughness: 0.32 } : { roughness: 0.45 }));
  const unutra = std(0x111214, { roughness: 0.8 });
  const geo = {};
  function geoKucista(h) { const k = 'k' + h; if (!geo[k]) { const rOut = IZ.kuciste.promjer / 2, rIn = M_.izradak.provrt / 2, dno = M_.izradak.dno; const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(rOut, 0), new THREE.Vector2(rOut, h), new THREE.Vector2(rIn, h), new THREE.Vector2(rIn, dno), new THREE.Vector2(0, dno)]; geo[k] = new THREE.LatheGeometry(pts, 32); } return geo[k]; }
  function napraviIzradak(i) {
    const g = new THREE.Group(); g.userData.izradak = i.id;
    if (i.vrsta === 'kuciste') {
      const m = new THREE.Mesh(geoKucista(i.visina), mIz(i.boja)); g.add(m);
      g.userData.dioMps = i.skartIzradak ? 'iSkart' : 'iKuciste';
      const rupa = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.0008, 10), unutra); rupa.position.set(0.012, i.visina + 0.0004, 0); rupa.visible = false; g.add(rupa); g.userData.rupa = rupa;
    } else if (i.vrsta === 'klip') {
      const h = IZ.klip.visina, r = IZ.klip.promjer / 2;
      const a = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h * 0.55, 24), mIz(i.boja)); a.position.y = h * 0.275; g.add(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, h * 0.45, 12), mIz('srebrni')); b.position.y = h * 0.775; g.add(b);
      g.userData.dioMps = 'iKlip';
    } else if (i.vrsta === 'opruga') {
      if (!geo.opr) { const r = IZ.opruga.promjer / 2, h = IZ.opruga.visina, n = 7; const pts = []; for (let k = 0; k <= n * 16; k++) { const t = k / (n * 16); pts.push(new THREE.Vector3(r * Math.cos(t * n * 2 * Math.PI), t * h, r * Math.sin(t * n * 2 * Math.PI))); } geo.opr = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 16, 0.0011, 5, false); }
      g.add(new THREE.Mesh(geo.opr, mIz('opruga'))); g.userData.dioMps = 'iOpruga';
    } else {
      const h = IZ.poklopac.visina, r = IZ.poklopac.promjer / 2;
      const a = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h * 0.6, 32), mIz('alu')); a.position.y = h * 0.3; g.add(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.6, h * 0.4, 24), mIz('alu')); b.position.y = h * 0.8; g.add(b);
      [0, 1].forEach((s) => { const u = new THREE.Mesh(new THREE.BoxGeometry(0.004, h * 0.5, 0.012), mIz('crno')); u.position.set((s ? 1 : -1) * r * 0.98, h * 0.3, 0); g.add(u); });
      g.userData.dioMps = 'iPoklopac';
    }
    g.traverse((c) => { if (c.isMesh) c.userData.izradak = i.id; });
    grupa.add(g);
    return g;
  }
  function postaviIzratke(lista) {
    const vid = new Set(), poId = new Map(lista.map((x) => [x.id, x]));
    for (const i of lista) {
      let g = izradci.get(i.id);
      if (!g) { g = napraviIzradak(i); izradci.set(i.id, g); if (aktivno) primijeniIsticanje(); }
      g.position.copy(V(i.p[0], i.p[1], i.p[2]));
      g.visible = true; vid.add(i.id);
      if (g.userData.rupa) g.userData.rupa.visible = !!i.izbusen;
      if (i.vrsta === 'poklopac') { const k = poId.get(i.roditelj); g.rotation.y = (k && k.sklop && k.sklop.zabravljen) || i._zab ? Math.PI / 2 : 0; }
      g.userData.cilindar = i.vrsta === 'kuciste' && i.sklop && i.sklop.klip && i.sklop.opruga && i.sklop.poklopac && i.sklop.zabravljen;
    }
    izradci.forEach((g, id) => { if (!vid.has(id)) g.visible = false; });
  }

  /* ------------------------------------------------------------ isticanje i odabir */
  const hiC = new Map(), duhC = new Map();
  const klon1 = (cache, m, f) => { let c = cache.get(m.uuid); if (!c) { c = m.clone(); f(c); cache.set(m.uuid, c); } return c; };
  const klon = (cache, m, f) => (Array.isArray(m) ? m.map((x) => klon1(cache, x, f)) : klon1(cache, m, f));
  let aktivno = null;
  function objektiDijela(id) {
    if (id === 'iKuciste' || id === 'iSkart' || id === 'iKlip' || id === 'iOpruga' || id === 'iPoklopac') return [...izradci.values()].filter((g) => g.visible && g.userData.dioMps === id);
    if (id === 'iCilindar') return [...izradci.values()].filter((g) => g.visible && g.userData.cilindar);
    return (dijelovi.get(id) || {}).objekti || [];
  }
  function primijeniIsticanje() {
    const odabrani = new Set();
    if (aktivno) objektiDijela(aktivno).forEach((o) => o.traverse((c) => { if (c.isMesh) odabrani.add(c); }));
    if (aktivno === 'iCilindar') { /* dijelovi sklopa prate kućište */ izradci.forEach((g) => { if (g.visible && !g.userData.cilindar && g.userData.dioMps !== 'iKuciste' && g.userData.dioMps !== 'iSkart') { const p = g.position; [...odabrani].some((m) => { const gp = m.parent && m.parent.position; if (gp && Math.hypot(gp.x - p.x, gp.z - p.z) < 0.005) { g.traverse((c) => { if (c.isMesh) odabrani.add(c); }); return true; } return false; }); } }); }
    grupa.traverse((o) => {
      if (!o.isMesh || o.userData.bezDuha) return;
      if (!o.userData.mpsM0) o.userData.mpsM0 = o.material;
      const m0 = o.userData.mpsM0;
      let m = m0;
      if (aktivno) {
        if (odabrani.has(o)) m = klon(hiC, m0, (c) => { if (c.emissive) { c.emissive = new THREE.Color(0x19b7c9); c.emissiveIntensity = 0.55; } c.transparent = false; c.opacity = 1; c.depthWrite = true; });
        else m = klon(duhC, m0, (c) => { c.transparent = true; c.opacity = 0.1; c.depthWrite = false; if (c.emissive) c.emissive.setHex(0); });
      }
      o.material = m;
    });
  }
  function istakni(id) { aktivno = id && (dijelovi.has(id) || id.startsWith('i')) ? id : null; primijeniIsticanje(); return aktivno; }
  /** id dijela (mps_podaci) za pogođeni mesh: najdublji predak s userData.dioMps */
  function dioOd(o) {
    for (let p = o; p && p !== grupa; p = p.parent) { const d = p.userData && p.userData.dioMps; if (d && P.nadjiDio(d)) return d; }
    return null;
  }
  const izradakOd = (o) => { for (let p = o; p && p !== grupa; p = p.parent) if (p.userData && p.userData.izradak) return p.userData.izradak; return null; };

  /* ------------------------------------------------------------ animacija iz stanja linije */
  const panel = { start: new Map(), reset: new Map(), q1: new Map(), q2: new Map() };
  for (const k in panelMeshes) panelMeshes[k].forEach(([id, m]) => panel[k].set(id, m));
  function lampica(m, on, boja) { const mt = m.userData.mpsM0 || m.material; if (!mt.emissive) return; mt.emissive.setHex(on ? boja : 0x000000); mt.emissiveIntensity = on ? 0.9 : 0; }
  /** stanje linije (mps_tok.stanjeModela()) → položaji aktuatora, robota i izradaka; lampice: { dist: {start, reset, q1, q2}, ... } */
  function postavi(sm, lampice) {
    if (!sm) return;
    const d = sm.dist;
    izbKlip.position.copy(V(sp.x, yIzb0 - D_.izbacivac.hod * d.izb, sp.zDno));
    ruka.rotation.y = Math.PI * (1 - d.ruka);
    const i = sm.isp;
    const zk2 = di.zDolje + di.hod * i.dizalo;
    kar.position.copy(V(di.x, di.y, zk2)); lanac(zk2);
    izbIK.position.copy(V(-0.03 + 0.045 * i.izb, 0, 0));
    sonda.position.copy(V(di.x, di.y, zTop + 0.11 - 0.055 * i.mjerni));
    zrakM.opacity = i.zracni ? 0.55 : 0.0;
    const o = sm.obr;
    stol.rotation.y = o.alfa;
    isK.position.copy(V(ix, iy, sT.zVrh + 0.06 - 0.03 * o.ispitivac));
    buS.position.copy(V(bx, by, sT.zVrh + 0.10 - 0.06 * o.busilica));
    vret.rotation.y = o.vreteno;
    stzP.position.x = 0.012 * o.stez;
    if (sm.rob) { robot.postavi(sm.rob.q); robot.prihvatnica(sm.rob.otvorenost); }
    if (sm.mont) for (const k of ['poklopac', 'opruga']) { const pk = potiskivaci[k]; pk.g.position.copy(V(R_[k === 'poklopac' ? 'spremnikPoklopaca' : 'spremnikOpruga'].x, pk.y0 - pk.hod * sm.mont[k], R_[k === 'poklopac' ? 'spremnikPoklopaca' : 'spremnikOpruga'].zIzlaz)); }
    if (sm.izradci) postaviIzratke(sm.izradci);
    if (lampice) for (const id of ['dist', 'isp', 'obr']) { const l = lampice[id]; if (!l) continue; lampica(panel.start.get(id), l.start, 0x2fd35a); lampica(panel.reset.get(id), l.reset, 0x3d7bff); lampica(panel.q1.get(id), l.q1, 0xffffff); lampica(panel.q2.get(id), l.q2, 0xffc21a); }
  }
  function gljiva(id, pritisnuta) { const g = sk[id] && sk[id].gljiva; if (g) g.children.forEach((c, k) => { if (k < 2) c.position.copy(V(0, (k ? -0.026 : -0.01) + (pritisnuta ? 0.006 : 0), 0)); }); }

  /* uzorci izradaka (za Upoznavanje bez simulacije) */
  const uz = [];
  if (O.uzorci) {
    let zz = sp.zDno;
    ['crveno', 'alu', 'crno', 'crveno'].forEach((b, k) => { const h = P.vrstaKucista(b).visina; uz.push({ id: 'U' + k, vrsta: 'kuciste', boja: b, visina: h, p: [sp.x, sp.y, zz] }); zz += h; });
    uz.push({ id: 'US', vrsta: 'kuciste', boja: 'alu', visina: 0.024, skartIzradak: true, p: [I_.klizacSkarta.do[0] - 0.01, I_.klizacSkarta.do[1], di.zDolje - I_.klizacSkarta.pad] });
    uz.push({ id: 'UT', vrsta: 'kuciste', boja: 'crveno', visina: 0.025, izbusen: true, p: [...P.MJESTA.izlazObradne, sT.zVrh] });
    uz.push({ id: 'UB', vrsta: 'kuciste', boja: 'alu', visina: 0.025, p: [...P.MJESTA.busenje, sT.zVrh] });
    uz.push({ id: 'UG', vrsta: 'kuciste', boja: 'crveno', visina: 0.025, p: [gn.x, gn.y, gn.zDno] });
    uz.push({ id: 'UK', vrsta: 'klip', boja: 'crni', p: [gn.x, gn.y, gn.zDno + M_.izradak.dno] });
    for (let k = 1; k < pa.mjesta; k++) { uz.push({ id: 'UKc' + k, vrsta: 'klip', boja: 'crni', p: [pa.x0 + k * pa.korak, pa.yCrni, pa.zDno] }); uz.push({ id: 'UKs' + k, vrsta: 'klip', boja: 'srebrni', p: [pa.x0 + k * pa.korak, pa.ySrebrni, pa.zDno] }); }
    let zo = R_.spremnikOpruga.zIzlaz; for (let k = 0; k < 6; k++) { uz.push({ id: 'UO' + k, vrsta: 'opruga', p: [R_.spremnikOpruga.x, R_.spremnikOpruga.y, zo] }); zo += IZ.opruga.visina; }
    let zp2 = R_.spremnikPoklopaca.zIzlaz; for (let k = 0; k < 6; k++) { uz.push({ id: 'UP' + k, vrsta: 'poklopac', p: [R_.spremnikPoklopaca.x, R_.spremnikPoklopaca.y, zp2] }); zp2 += IZ.poklopac.visina; }
    const c = { id: 'UC', vrsta: 'kuciste', boja: 'alu', visina: 0.025, p: [iz.do[0], iz.do[1] + 0.03, iz.zDno - iz.pad], sklop: { klip: 1, opruga: 1, poklopac: 1, zabravljen: true } };
    uz.push(c, { id: 'UCk', vrsta: 'klip', boja: 'crni', p: [c.p[0], c.p[1], c.p[2] + M_.izradak.dno] }, { id: 'UCo', vrsta: 'opruga', p: [c.p[0], c.p[1], c.p[2] + M_.izradak.dno + IZ.klip.visina - 0.004] }, { id: 'UCp', vrsta: 'poklopac', roditelj: 'UC', _zab: true, p: [c.p[0], c.p[1], c.p[2] + 0.025] });
    postaviIzratke(uz);
  }

  grupa.updateMatrixWorld(true);
  const tocke = {
    srediste: V(M_.kolica.duljinaLinije / 2, DUB / 2, VRH),
    stanice: Object.fromEntries(['dist', 'isp', 'obr', 'rob'].map((id, k) => [id, V(M_.kolica.x0[k] + M_.kolica.sirine[k] / 2, DUB / 2, VRH + 0.08)]))
  };
  /** početni položaj aktuatora i uzorci izradaka (Upoznavanje) */
  function pocetno(q) {
    postavi({ dist: { izb: 0, ruka: 0 }, isp: { dizalo: 0, izb: 0, mjerni: 0, zracni: false }, obr: { alfa: Math.PI, stez: 0, busilica: 0, vreteno: 0, ispitivac: 0 }, rob: q ? { q, otvorenost: 1 } : null, mont: { opruga: 0, poklopac: 0 }, izradci: uz });
  }
  return { grupa, robot, stol: stolR, dijelovi, istakni, dioOd, izradakOd, postavi, pocetno, gljiva, izradci, objektiDijela, tocke, V, materijali: MT, primijeniIsticanje };
}
