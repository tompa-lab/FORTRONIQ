/* FORTRONIQ · AR — robotska stanica Haas Desktop Mill + kobot UR3e, samo kinematika (bez kabine, upravljačke jedinice i klupe), u radu.
   Logika stanice je ista kao na stranici „Opsluživanje stroja kobotom UR3e” (robot_haas.js), bez privjeska i nizova: program robota ide u petlji.
   Mjere stanice u mm (grupa se u AR-u skalira 0,001).  © ForTroniQ d.o.o. */
import { napraviStrojHaas, GEO } from '../../cnc-haas-desktop-mill/stroj_haas.js?v=02';
import { napraviCNC } from '../../cnc-haas-desktop-mill/cnc_auto.js?v=02';
import { napraviUR3e } from '../../cnc-haas-desktop-mill/ur3e_model.js?v=02';
import { fk, ik, pomnozi, inverz, rotVektor, rotIzVektora, matricaIzPoze } from '../../cnc-haas-desktop-mill/ur3e_kin.js?v=02';

const D = Math.PI / 180;
const BAZA = { x: 0, y: 0, z: 560 }, TCP_Z = 0.100, PRST = { otvoren: 0.040, prazan: 0.012, ploca: 0.030 }, PLOCA = { L: 60, W: 40, H: 10 };
const PAL_U = [-345, -255], PAL_I = [255, 345], PAL_Z = 560, ZADANO = { MoveJ: { v: 60, a: 80 }, MoveL: { v: 250, a: 1200 } }, T_VRATA = 1.5;
const CNC_PROGRAM = `%
O01010 (ROBOT DZEP)
G00 G17 G21 G40 G49 G80 G90
T2 M06
S6000 M03
G54 G00 X30. Y20.
G43 H02 Z15.
G01 Z0. F300.
G91 G13 Z-3. I3. K10. Q3. D02 L1 F400.
G90 G00 Z15.
G81 G99 X8. Y8. Z-4. R2. F300.
X52.
Y32.
X8.
G80
G00 Z25.
M05
G28 G91 Z0.
G90
M30
%`;

function prozirno(g) { g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = Math.min(o.material.opacity, 0.22); o.material.depthWrite = false; o.castShadow = false; o.renderOrder = 5; } }); }

export function napraviStanicu(THREE, scene) {
  const stanica = new THREE.Group(); scene.add(stanica);
  const S = napraviStrojHaas(THREE, stanica);
  /* samo kinematika: sakrij kabinu, vrata, upravljačku jedinicu, stražnju stranu i klupu */
  [S.kabina, S.privjesak, S.ormar].forEach((g) => { g.visible = false; });
  S.korijen.traverse((o) => { if (o.userData.dio === 'podloga' || (o.isMesh && o.geometry.type === 'TubeGeometry' && !o.userData.dio)) o.visible = false; });
  prozirno(S.vrata);   /* vrata se gibaju (dio kinematike): ostaju, ali prozirna */
  const cnc = napraviCNC(THREE, S, {});
  const VISE = S.skripacZa(PLOCA.L, PLOCA.W, PLOCA.H, 0, 0, true);
  S.postaviOsi(-76, 0, 0);
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o));
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  { const post = new THREE.Group(); stanica.add(post);
    const b1 = box(220, 20, 220, mat(0x3a4044)); b1.position.set(BAZA.x, -160, BAZA.z); post.add(b1);
    const b2 = box(140, 138, 140, mat(0x7d868d, { metalness: 0.3 })); b2.position.set(BAZA.x, -81, BAZA.z); post.add(b2);
    const b3 = box(200, 12, 200, mat(0x3a4044)); b3.position.set(BAZA.x, -6, BAZA.z); post.add(b3);
    for (const x of [-300, 300]) {
      const n = box(220, 158, 180, mat(0x9aa3aa, { metalness: 0.2 })); n.position.set(x, -91, PAL_Z); post.add(n);
      const p = box(200, 12, 140, mat(0x2c5f8c)); p.position.set(x, -6, PAL_Z); post.add(p);
      for (const sx of [-45, 45]) { const u = box(70, 2, 50, mat(0x1d3a55)); u.position.set(x + sx, 0.5, PAL_Z); post.add(u); }
    } }
  const M = napraviUR3e(THREE, { unutrasnjost: false, ormar: false, privjesak: false, kabel: false });
  const rob = new THREE.Group(); rob.scale.set(1000, 1000, 1000); rob.position.set(BAZA.x, BAZA.y, BAZA.z); stanica.add(rob); rob.add(M.korijen);
  const hvat = new THREE.Group(); M.tcp.add(hvat);
  const mHv = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.5, metalness: 0.3 }), mPrst = new THREE.MeshStandardMaterial({ color: 0x8c969c, roughness: 0.4, metalness: 0.5 });
  { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 24), mHv); pl.rotation.x = Math.PI / 2; pl.position.z = 0.004; hvat.add(pl);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.047), mHv); t.position.z = 0.0315; hvat.add(t); }
  const prsti = [1, -1].map((sg) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.056), mPrst); p.position.set(sg * PRST.otvoren, 0, 0.083); hvat.add(p); return p; });
  const mVosak = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7 });
  const PRIPREMCI = [];
  function napraviPripremke() {
    PRIPREMCI.forEach((b) => { if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh); }); PRIPREMCI.length = 0;
    PAL_U.forEach((x, i) => { const m = box(PLOCA.L, PLOCA.H, PLOCA.W, mVosak); m.position.set(x, PLOCA.H / 2 + 1, PAL_Z); stanica.add(m); PRIPREMCI.push({ i, mesh: m, uRuci: false, uSkripcu: false, obradjen: false, naPaleti: 'ulaz' }); });
  }
  const vTmp2 = new THREE.Vector3();
  function tcpTocka() { const v = new THREE.Vector3(0, 0, TCP_Z); M.tcp.updateWorldMatrix(true, false); return stanica.worldToLocal(M.tcp.localToWorld(v)); }
  function viseSvijet() { S.stol.updateWorldMatrix(true, false); return stanica.worldToLocal(S.stol.localToWorld(new THREE.Vector3(0, VISE.top, 0))); }
  function srediste(b) { if (b.mesh) { b.mesh.updateWorldMatrix(true, false); return stanica.worldToLocal(b.mesh.getWorldPosition(vTmp2.clone())); } const v = viseSvijet(); v.y -= PLOCA.H / 2; return v; }
  /* kinematika */
  const ALAT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, TCP_Z, 0, 0, 0, 1], ALAT_INV = inverz(ALAT);
  const tcpT = (q) => pomnozi(fk(q).T, ALAT);
  const R9 = (T) => [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]], pT = (T) => [T[3], T[7], T[11]];
  function mulR(A, B) { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[3 * i + j] = A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j]; return C; }
  const trR = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const sastavi = (R, p) => [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1];
  const rvIzR = (R) => rotVektor(sastavi(R, [0, 0, 0]));
  function ikTcp(Ttcp, q0, skok = 0.35) { const r = ik(pomnozi(Ttcp, ALAT_INV), q0, { najveciSkok: skok }); if (!r.uspjeh) return null; let d = 0; for (let i = 0; i < 6; i++) d = Math.max(d, Math.abs(r.q[i] - q0[i])); return d <= skok * 1.5 ? r.q : null; }
  const uRobot = (X, Y, Z) => [(X - BAZA.x) / 1000, -(Z - BAZA.z) / 1000, (Y - BAZA.y) / 1000];
  function qZa(p, seed) { const T = matricaIzPoze([p[0], p[1], p[2], Math.PI, 0, 0]); const r = ik(pomnozi(T, ALAT_INV), seed, {}); if (!r.uspjeh) throw new Error('IK: ' + p); return r.q; }
  const SEED_L = [-22, -79, 108, -119, -90, 68].map((x) => x * D), SEED_S = [-108, -60, 76, -106, -90, -18].map((x) => x * D), SEED_D = [22, -79, 108, -119, -90, 112].map((x) => x * D);
  const viseW = new THREE.Vector3(S.stol.position.x, VISE.top, S.saonice.position.z);
  const TOCKE = {
    home: qZa(uRobot(0, 230, 330), SEED_S),
    vise_gore: qZa(uRobot(viseW.x, viseW.y + 95, viseW.z), SEED_S), vise: qZa(uRobot(viseW.x, viseW.y + 5, viseW.z), SEED_S),
    ulaz_gore: PAL_U.map((x) => qZa(uRobot(x, PLOCA.H + 1 + 85, PAL_Z), SEED_L)), ulaz: PAL_U.map((x) => qZa(uRobot(x, PLOCA.H + 1 + 5, PAL_Z), SEED_L)),
    izlaz_gore: PAL_I.map((x) => qZa(uRobot(x, PLOCA.H + 1 + 85, PAL_Z), SEED_D)), izlaz: PAL_I.map((x) => qZa(uRobot(x, PLOCA.H + 1 + 5, PAL_Z), SEED_D))
  };
  const mv = (vrsta, q) => ({ op: 'move', vrsta, q }), set = (izlaz, val) => ({ op: 'set', izlaz, val }), wt = (t) => ({ op: 'wait', t }), wdi = (ulaz, val) => ({ op: 'waitDI', ulaz, val }), wv = (otv) => ({ op: 'waitVrata', otv });
  const INSTR = [mv('MoveJ', () => TOCKE.home), { op: 'ls', n: 2, id: 'L1' },
    mv('MoveJ', (i) => TOCKE.ulaz_gore[i]), mv('MoveL', (i) => TOCKE.ulaz[i]), set(0, true), wt(0.5), mv('MoveL', (i) => TOCKE.ulaz_gore[i]), set(3, true), wv(true),
    mv('MoveJ', () => TOCKE.vise_gore), mv('MoveL', () => TOCKE.vise), set(1, true), wdi(2, true), set(0, false), wt(0.5), mv('MoveL', () => TOCKE.vise_gore), mv('MoveJ', () => TOCKE.home),
    set(3, false), wdi(1, true), set(2, true), wt(0.3), set(2, false), wdi(0, true), set(3, true), wv(true),
    mv('MoveJ', () => TOCKE.vise_gore), mv('MoveL', () => TOCKE.vise), set(0, true), wt(0.5), set(1, false), wdi(2, false), mv('MoveL', () => TOCKE.vise_gore),
    mv('MoveJ', (i) => TOCKE.izlaz_gore[i]), mv('MoveL', (i) => TOCKE.izlaz[i]), set(0, false), wt(0.5), mv('MoveL', (i) => TOCKE.izlaz_gore[i]), set(3, false),
    { op: 'le', id: 'L1' }, mv('MoveJ', () => TOCKE.home)];
  { const ls = INSTR.findIndex((x) => x.op === 'ls'), le = INSTR.findIndex((x) => x.op === 'le'); INSTR[le].start = ls; INSTR[le].n = INSTR[ls].n; }
  const st = {};
  function pocetno() { const ub = st.ubrzanje || 1, cik = st.ciklusa || 0, radi = !!st.radi; Object.assign(st, { q: TOCKE.home.slice(), izv: null, io: { do: [false, false, false, false], di: [false, true, false, false] }, hv: { s: PRST.otvoren, drzi: null }, vrata: { u: 0, cilj: 0 }, skripac: { t: 0, stegnut: false }, do2prije: false, cncFaza: 'mir', ubrzanje: ub, obradjeni: 0, cekajNovi: 0, radi, ciklusa: cik }); }
  pocetno();
  function profil(Dd, v, a) {
    if (Dd < 1e-9) return { T: 0, s: () => Dd };
    if (Dd < v * v / a) { const Th = Math.sqrt(Dd / a); return { T: 2 * Th, s: (t) => (t < Th ? 0.5 * a * t * t : Dd - 0.5 * a * (2 * Th - t) ** 2) }; }
    const ta = v / a, T = Dd / v + ta;
    return { T, s: (t) => (t < ta ? 0.5 * a * t * t : t < T - ta ? 0.5 * a * ta * ta + v * (t - ta) : Dd - 0.5 * a * (T - t) ** 2) };
  }
  function korakProg(dtR) {
    const iz = st.izv; if (!iz) return;
    let preostalo = 6;
    while (preostalo-- > 0 && st.izv) {
      if (iz.pc >= INSTR.length) { st.izv = null; st.ciklusa++; st.cekajNovi = 2.5; return; }
      const ins = INSTR[iz.pc];
      if (ins.op === 'set') { postaviIzlaz(ins.izlaz, ins.val); iz.pc++; continue; }
      if (ins.op === 'ls') { iz.brojaci[ins.id] = 0; iz.i = 0; iz.pc++; continue; }
      if (ins.op === 'le') { iz.brojaci[ins.id]++; iz.i = iz.brojaci[ins.id]; if (iz.brojaci[ins.id] < ins.n) iz.pc = ins.start + 1; else iz.pc++; continue; }
      if (ins.op === 'wait') { if (iz.cekaj === undefined) iz.cekaj = ins.t; iz.cekaj -= dtR; if (iz.cekaj <= 0) { iz.cekaj = undefined; iz.pc++; continue; } return; }
      if (ins.op === 'waitDI') { if (st.io.di[ins.ulaz] === ins.val) { iz.pc++; continue; } return; }
      if (ins.op === 'waitVrata') { if (ins.otv ? st.vrata.u >= 0.999 : st.vrata.u <= 0.001) { iz.pc++; continue; } return; }
      if (ins.op === 'move') { if (korakMove(ins, dtR)) { iz.gib = null; iz.pc++; continue; } return; }
    }
  }
  function korakMove(ins, dtE) {
    const iz = st.izv;
    if (!iz.gib) {
      const cilj = ins.q(iz.i); const g = { vrsta: ins.vrsta, t: 0, q0: st.q.slice(), cilj };
      if (ins.vrsta === 'MoveJ') { const dq = cilj.map((x, i) => x - st.q[i]); const Dd = Math.max(...dq.map(Math.abs)); g.dq = dq; g.Dd = Dd; g.pr = profil(Dd, ZADANO.MoveJ.v * D, ZADANO.MoveJ.a * D); }
      else { const T0 = tcpT(st.q), T1 = tcpT(cilj); g.p0 = pT(T0); g.dp = pT(T1).map((x, i) => x - g.p0[i]); g.R0 = R9(T0); g.rv = rvIzR(mulR(R9(T1), trR(g.R0)));
        const L = Math.hypot(...g.dp), th = Math.hypot(...g.rv); const pl = profil(L, ZADANO.MoveL.v / 1000, ZADANO.MoveL.a / 1000), pr = profil(th, 1.0, 4.0);
        g.pr = pl.T >= pr.T ? { T: pl.T, u: (t) => (L > 0 ? pl.s(t) / L : 1) } : { T: pr.T, u: (t) => (th > 0 ? pr.s(t) / th : 1) }; }
      iz.gib = g;
    }
    const g = iz.gib;
    const pozaU = (t) => {
      if (g.vrsta === 'MoveJ') { const s = g.Dd > 0 ? g.pr.s(Math.min(t, g.pr.T)) / g.Dd : 1; return g.q0.map((x, i) => x + g.dq[i] * s); }
      const u = t >= g.pr.T ? 1 : g.pr.u(t); if (u >= 1) return g.cilj;
      const p = g.p0.map((x, i) => x + g.dp[i] * u), R = mulR(rotIzVektora(g.rv.map((x) => x * u)), g.R0);
      return ikTcp(sastavi(R, p), st.q, 0.3);
    };
    const tn = Math.min(g.t + dtE, g.pr.T), qn = pozaU(tn);
    if (!qn) { st.izv = null; st.cekajNovi = 2; return false; }
    st.q = qn; g.t = tn;
    return g.t >= g.pr.T - 1e-9;
  }
  function postaviIzlaz(i, val) { if (st.io.do[i] === !!val) return; st.io.do[i] = !!val; if (i === 3) st.vrata.cilj = val ? 1 : 0; }
  function korakHvataljke(dtR) {
    const h = st.hv, zatv = st.io.do[0], brz = (PRST.otvoren - PRST.prazan) / 0.4;
    prsti[0].position.x = h.s; prsti[1].position.x = -h.s;
    if (zatv) {
      if (!h.drzi) {
        h.s = Math.max(PRST.prazan, h.s - brz * dtR);
        if (h.s <= PRST.ploca + 1e-6) {
          const t = tcpTocka();
          const b = PRIPREMCI.find((b) => { if (b.uRuci) return false; const c = srediste(b); return Math.hypot(c.x - t.x, c.z - t.z) < 15 && Math.abs((c.y + PLOCA.H / 2 + 5) - t.y) < 8; });
          if (b) {
            if (!b.mesh) { const g = new THREE.Group(); const c = viseSvijet(); c.y -= PLOCA.H / 2; g.position.copy(c); stanica.add(g); g.attach(cnc.PL.mesh); g.attach(cnc.PL.rub); cnc.ukloniPlocu(true); b.mesh = g; }
            hvat.attach(b.mesh); b.uRuci = true; b.uSkripcu = false; b.naPaleti = null; h.drzi = b; h.s = PRST.ploca;
          } else h.s = Math.max(PRST.prazan, h.s);
        }
      }
    } else {
      h.s = Math.min(PRST.otvoren, h.s + brz * dtR);
      if (h.drzi && h.s > PRST.ploca + 0.002) { const b = h.drzi; h.drzi = null; b.uRuci = false; stanica.attach(b.mesh); odloziPripremak(b); }
    }
    st.io.di[3] = !!h.drzi;
  }
  function odloziPripremak(b) {
    const c = srediste(b), v = viseSvijet();
    if (Math.hypot(c.x - v.x, c.z - v.z) < 25 && Math.abs(c.y - (v.y - PLOCA.H / 2)) < 20) {
      S.stol.attach(b.mesh); b.mesh.position.set(0, VISE.bot + PLOCA.H / 2, 0); b.mesh.rotation.set(0, 0, 0); b.uSkripcu = true; if (st.skripac.stegnut) pretvoriUMrezu(b); return;
    }
    for (const [lista, ime] of [[PAL_I, 'izlaz'], [PAL_U, 'ulaz']]) for (const x of lista) if (Math.hypot(c.x - x, c.z - PAL_Z) < 30) {
      b.mesh.position.set(x, PLOCA.H / 2 + 1, PAL_Z); b.mesh.rotation.set(0, 0, 0); b.naPaleti = ime; if (ime === 'izlaz' && b.obradjen) st.obradjeni++; return;
    }
    b.mesh.position.y = Math.max(PLOCA.H / 2 + 1, b.mesh.position.y);
  }
  function pretvoriUMrezu(b) {
    if (!b.mesh || b.obradjen || b.uRuci) return;
    b.mesh.parent.remove(b.mesh); b.mesh = null; cnc.napraviPlocu(PLOCA.L, PLOCA.W, PLOCA.H, -PLOCA.L / 2, -PLOCA.W / 2, VISE.bot); cnc.nultocka(); cnc.odaberi(CNC_PROGRAM, 'O01010');
  }
  function korakSkripca(dtR) {
    const k = st.skripac, zel = st.io.do[1];
    k.t = Math.max(0, Math.min(0.5, k.t + (zel ? dtR : -dtR)));
    const stegnut = zel && k.t >= 0.5 - 1e-6;
    if (stegnut !== k.stegnut) { k.stegnut = stegnut; const b = PRIPREMCI.find((b) => b.uSkripcu && !b.uRuci); if (stegnut && b) pretvoriUMrezu(b); }
    st.io.di[2] = k.stegnut;
  }
  function korakVrata(dtR) {
    const v = st.vrata, du = dtR / T_VRATA;
    v.u = v.u < v.cilj ? Math.min(v.cilj, v.u + du) : Math.max(v.cilj, v.u - du);
    S.vrataNa(v.u);
    cnc.st.vrata = v.u > 0.01; st.io.di[1] = v.u <= 0.001;
  }
  function korakCnc(dt) {
    if (st.io.do[2] && !st.do2prije) { st.io.di[0] = false; if (!cnc.st.prog) cnc.odaberi(CNC_PROGRAM, 'O01010'); if (cnc.start()) st.cncFaza = 'radi'; }
    st.do2prije = st.io.do[2];
    cnc.st.ubrzanje = 1; cnc.korak(dt);
    if (st.cncFaza === 'radi' && cnc.st.run && cnc.st.run.gotov) { st.cncFaza = 'vracanje'; const b = PRIPREMCI.find((b) => b.uSkripcu); if (b) b.obradjen = true; }
    if (st.cncFaza === 'vracanje' && cnc.uPolozajUtovara(dt)) { st.cncFaza = 'mir'; st.io.di[0] = true; }
    if (cnc.st.alarm) { cnc.reset(); st.cncFaza = 'mir'; st.io.di[0] = true; }
  }
  function reset() {
    pocetno(); cnc.ukloniPlocu(); cnc.reset(); cnc.st.fiz = { X: -76, Y: 0, Z: 0 }; S.postaviOsi(-76, 0, 0); cnc.nultocka(VISE.top, -PLOCA.L / 2, -PLOCA.W / 2); cnc.odaberi(CNC_PROGRAM, 'O01010');
    napraviPripremke(); M.postavi(st.q); S.vrataNa(0); prsti[0].position.x = PRST.otvoren; prsti[1].position.x = -PRST.otvoren;
  }
  function start() { if (!st.izv) { if (st.obradjeni >= 2 || PRIPREMCI.every((b) => b.naPaleti !== 'ulaz')) reset(); st.izv = { pc: 0, gib: null, brojaci: {}, i: 0 }; } st.radi = true; }
  function stop() { st.radi = false; }
  function korak(dtR) {
    if (!st.radi) return;
    const dts = dtR * st.ubrzanje;
    if (!st.izv && st.cekajNovi > 0) { st.cekajNovi -= dts; if (st.cekajNovi <= 0) { reset(); st.izv = { pc: 0, gib: null, brojaci: {}, i: 0 }; st.radi = true; } }
    korakProg(dts); M.postavi(st.q); rob.updateMatrixWorld(true);
    korakHvataljke(dts); korakSkripca(dts); korakVrata(dts); korakCnc(dts);
  }
  reset();
  /* mjere za postavljanje: ploha klupe je na y = DNO (mm); opseg stanice (mm) */
  return { grupa: stanica, S, cnc, M, st, korak, start, stop, reset, PRIPREMCI, TOCKE, dno: GEO.KABINA.DNO, opseg: { x: [-500, 800], z: [-400, 700], y: [GEO.KABINA.DNO, 500] }, naziv: 'Haas Desktop Mill + UR3e' };
}
