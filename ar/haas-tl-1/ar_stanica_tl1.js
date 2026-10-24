/* FORTRONIQ · AR — robotska stanica Haas TL-1 + kobot UR3e, samo kinematika (bez kabine, privjeska i ormara), u radu.
   Logika stanice je ista kao na stranici „Opsluživanje stroja kobotom UR3e” (robot_tl1.js), bez privjeska i nizova: program robota ide u petlji.
   Mjere stanice u mm (grupa se u AR-u skalira 0,001).  © ForTroniQ d.o.o. */
import { napraviStrojTL1, GEO } from '../../cnc-haas-tl-1/stroj_tl1.js?v=02';
import { napraviCNC } from '../../cnc-haas-tl-1/cnc_auto_tl1.js?v=02';
import { PROGRAM_ROBOT_TL } from '../../cnc-haas-tl-1/programi_tl1.js?v=02';
import { napraviUR3e } from '../../cnc-haas-tl-1/ur3e_model.js?v=02';
import { fk, ik, pomnozi, inverz, rotVektor, rotIzVektora } from '../../cnc-haas-tl-1/ur3e_kin.js?v=02';

const D = Math.PI / 180;
const POD = -GEO.VISINA_VRETENA;
const BAZA = { x: 200, y: -100, z: 500 }, TCP_Z = 0.100, PRST = { otvoren: 0.040, prazan: 0.012, dio: 0.020 };
const DIO = { D: 40, L: 80, drz: 25, hvat: 25 }, PAL_U = [{ x: -160, z: 500 }, { x: -60, z: 500 }], PAL_I = [{ x: 440, z: 500 }, { x: 540, z: 500 }], PAL_Y = -100, DIO_Y = PAL_Y + 30;
const GLAVA_X = -DIO.drz + DIO.L / 2, ZADANO = { MoveJ: { v: 60, a: 80 }, MoveL: { v: 250, a: 1200 } }, T_VRATA = 2.0, CNC_PROGRAM = PROGRAM_ROBOT_TL;

function prozirno(g) { g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = Math.min(o.material.opacity, 0.22); o.material.depthWrite = false; o.castShadow = false; o.renderOrder = 5; } }); }

export function napraviStanicu(THREE, scene) {
  const stanica = new THREE.Group(); scene.add(stanica);
  const S = napraviStrojTL1(THREE, stanica);
  [S.kabina, S.privjesak, S.ormar].forEach((g) => { g.visible = false; });
  S.korijen.traverse((o) => { if (o.userData.dio === 'pod') o.visible = false; });
  prozirno(S.vrata);   /* klizna vrata se gibaju (dio kinematike): ostaju, ali prozirna */
  const cnc = napraviCNC(THREE, S, {});
  S.postaviOsi(-100, -300);
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.15 }, o));
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  { const post = new THREE.Group(); stanica.add(post); const vis = BAZA.y - POD;
    const b1 = box(260, 20, 260, mat(0x3a4044)); b1.position.set(BAZA.x, POD + 10, BAZA.z); post.add(b1);
    const b2 = box(160, vis - 32, 160, mat(0x7d868d, { metalness: 0.3 })); b2.position.set(BAZA.x, POD + 20 + (vis - 32) / 2, BAZA.z); post.add(b2);
    const b3 = box(220, 12, 220, mat(0x3a4044)); b3.position.set(BAZA.x, BAZA.y - 6, BAZA.z); post.add(b3);
    for (const [lista, x] of [[PAL_U, -110], [PAL_I, 490]]) {
      const n = box(240, vis - 12, 200, mat(0x9aa3aa, { metalness: 0.2 })); n.position.set(x, POD + (vis - 12) / 2, 500); post.add(n);
      const p = box(240, 12, 200, mat(0x2c5f8c)); p.position.set(x, PAL_Y - 6, 500); post.add(p);
      lista.forEach((q) => { for (const dz of [-30, 30]) { const v = box(60, 16, 16, mat(0x1d3a55)); v.position.set(q.x, PAL_Y + 8, q.z + dz); post.add(v); } });
    } }
  const M = napraviUR3e(THREE, { unutrasnjost: false, ormar: false, privjesak: false, kabel: false });
  const rob = new THREE.Group(); rob.scale.set(1000, 1000, 1000); rob.position.set(BAZA.x, BAZA.y, BAZA.z); stanica.add(rob); rob.add(M.korijen);
  const hvat = new THREE.Group(); M.tcp.add(hvat);
  const mHv = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.5, metalness: 0.3 }), mPrst = new THREE.MeshStandardMaterial({ color: 0x8c969c, roughness: 0.4, metalness: 0.5 });
  { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 24), mHv); pl.rotation.x = Math.PI / 2; pl.position.z = 0.004; hvat.add(pl);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.047), mHv); t.position.z = 0.0315; hvat.add(t); }
  const prsti = [1, -1].map((sg) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.06), mPrst); p.position.set(sg * PRST.otvoren, 0, 0.085); hvat.add(p); return p; });
  const mDio = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.45, roughness: 0.45 });
  const PRIPREMCI = [];
  function valjak() { const g = new THREE.CylinderGeometry(DIO.D / 2, DIO.D / 2, DIO.L, 32); g.rotateZ(Math.PI / 2); return new THREE.Mesh(g, mDio); }
  function napraviPripremke() {
    PRIPREMCI.forEach((b) => { if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh); }); PRIPREMCI.length = 0;
    PAL_U.forEach((q, i) => { const m = valjak(); m.position.set(q.x, DIO_Y, q.z); stanica.add(m); PRIPREMCI.push({ i, mesh: m, uRuci: false, uGlavi: false, obradjen: false, naPaleti: 'ulaz' }); });
  }
  const vTmp2 = new THREE.Vector3();
  function tcpTocka() { const v = new THREE.Vector3(0, 0, TCP_Z); M.tcp.updateWorldMatrix(true, false); return stanica.worldToLocal(M.tcp.localToWorld(v)); }
  function glavaSvijet() { return new THREE.Vector3(GLAVA_X, 0, 0); }
  function hvatTocka(b) { if (b.mesh) { b.mesh.updateWorldMatrix(true, false); const c = stanica.worldToLocal(b.mesh.getWorldPosition(vTmp2.clone())); c.x += DIO.hvat; return c; } const v = glavaSvijet(); v.x += DIO.hvat; return v; }
  const ALAT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, TCP_Z, 0, 0, 0, 1], ALAT_INV = inverz(ALAT);
  const tcpT = (q) => pomnozi(fk(q).T, ALAT);
  const R9 = (T) => [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]], pT = (T) => [T[3], T[7], T[11]];
  function mulR(A, B) { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[3 * i + j] = A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j]; return C; }
  const trR = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const sastavi = (R, p) => [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1];
  const rvIzR = (R) => rotVektor(sastavi(R, [0, 0, 0]));
  function ikTcp(Ttcp, q0, skok = 0.35) { const r = ik(pomnozi(Ttcp, ALAT_INV), q0, { najveciSkok: skok }); if (!r.uspjeh) return null; let d = 0; for (let i = 0; i < 6; i++) d = Math.max(d, Math.abs(r.q[i] - q0[i])); return d <= skok * 1.5 ? r.q : null; }
  const uRobot = (X, Y, Z) => [(X - BAZA.x) / 1000, -(Z - BAZA.z) / 1000, (Y - BAZA.y) / 1000];
  const sast = (cx, cy, cz, p) => [cx[0], cy[0], cz[0], p[0], cx[1], cy[1], cz[1], p[1], cx[2], cy[2], cz[2], p[2], 0, 0, 0, 1];
  const T_GORE = (p) => sast([0, 1, 0], [1, 0, 0], [0, 0, -1], p), T_SPRIJEDA = (p) => sast([0, 0, 1], [1, 0, 0], [0, 1, 0], p);
  function qZa(T, seed) { const r = ik(pomnozi(T, ALAT_INV), seed, {}); if (!r.uspjeh) throw new Error('IK'); return r.q; }
  const SEED_L = [-26, -78, 129, -142, -90, -26].map((x) => x * D), SEED_D = [154, -78, 129, -142, -90, 154].map((x) => x * D), SEED_G = [-85, -47, 90, -43, -265, 90].map((x) => x * D), SEED_H = [23, -125, 102, 23, -157, 90].map((x) => x * D);
  const TOCKE = {
    home: qZa(T_SPRIJEDA(uRobot(200, 250, 450)), SEED_H),
    glava_pred: qZa(T_SPRIJEDA(uRobot(GLAVA_X + DIO.hvat, 0, 150)), SEED_G), glava: qZa(T_SPRIJEDA(uRobot(GLAVA_X + DIO.hvat, 0, 0)), SEED_G),
    ulaz_gore: PAL_U.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y + 110, q.z)), SEED_L)), ulaz: PAL_U.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y, q.z)), SEED_L)),
    izlaz_gore: PAL_I.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y + 110, q.z)), SEED_D)), izlaz: PAL_I.map((q) => qZa(T_GORE(uRobot(q.x + DIO.hvat, DIO_Y, q.z)), SEED_D))
  };
  const mv = (vrsta, q) => ({ op: 'move', vrsta, q }), set = (izlaz, val) => ({ op: 'set', izlaz, val }), wt = (t) => ({ op: 'wait', t }), wdi = (ulaz, val) => ({ op: 'waitDI', ulaz, val }), wv = (otv) => ({ op: 'waitVrata', otv });
  const INSTR = [mv('MoveJ', () => TOCKE.home), { op: 'ls', n: 2, id: 'L1' },
    mv('MoveJ', (i) => TOCKE.ulaz_gore[i]), mv('MoveL', (i) => TOCKE.ulaz[i]), set(0, true), wt(0.5), mv('MoveL', (i) => TOCKE.ulaz_gore[i]), set(3, true), wv(true),
    mv('MoveJ', () => TOCKE.glava_pred), mv('MoveL', () => TOCKE.glava), set(1, true), wdi(2, true), set(0, false), wt(0.5), mv('MoveL', () => TOCKE.glava_pred), mv('MoveJ', () => TOCKE.home),
    set(3, false), wdi(1, true), set(2, true), wt(0.3), set(2, false), wdi(0, true), set(3, true), wv(true),
    mv('MoveJ', () => TOCKE.glava_pred), mv('MoveL', () => TOCKE.glava), set(0, true), wt(0.5), set(1, false), wdi(2, false), mv('MoveL', () => TOCKE.glava_pred),
    mv('MoveJ', (i) => TOCKE.izlaz_gore[i]), mv('MoveL', (i) => TOCKE.izlaz[i]), set(0, false), wt(0.5), mv('MoveL', (i) => TOCKE.izlaz_gore[i]), set(3, false),
    { op: 'le', id: 'L1' }, mv('MoveJ', () => TOCKE.home)];
  { const ls = INSTR.findIndex((x) => x.op === 'ls'), le = INSTR.findIndex((x) => x.op === 'le'); INSTR[le].start = ls; INSTR[le].n = INSTR[ls].n; }
  const st = {};
  function pocetno() { const ub = st.ubrzanje || 1, cik = st.ciklusa || 0, radi = !!st.radi; Object.assign(st, { q: TOCKE.home.slice(), izv: null, io: { do: [false, false, false, false], di: [false, true, false, false] }, hv: { s: PRST.otvoren, drzi: null }, vrata: { u: 0, cilj: 0 }, glava: { t: 0, stegnut: false }, do2prije: false, cncFaza: 'mir', ubrzanje: ub, obradjeni: 0, cekajNovi: 0, radi, ciklusa: cik }); }
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
        if (h.s <= PRST.dio + 1e-6) {
          const t = tcpTocka();
          const b = PRIPREMCI.find((b) => { if (b.uRuci) return false; const c = hvatTocka(b); return Math.hypot(c.x - t.x, c.y - t.y, c.z - t.z) < 18; });
          if (b) {
            if (!b.mesh) { const g = new THREE.Group(); g.position.copy(glavaSvijet()); stanica.add(g); if (cnc.O) { g.attach(cnc.O.mesh); cnc.ukloniObradak(true); } else g.add(valjak()); b.mesh = g; }
            hvat.attach(b.mesh); b.uRuci = true; b.uGlavi = false; b.naPaleti = null; h.drzi = b; h.s = PRST.dio;
          } else h.s = Math.max(PRST.prazan, h.s);
        }
      }
    } else {
      h.s = Math.min(PRST.otvoren, h.s + brz * dtR);
      if (h.drzi && h.s > PRST.dio + 0.002) { const b = h.drzi; h.drzi = null; b.uRuci = false; stanica.attach(b.mesh); odloziPripremak(b); }
    }
    st.io.di[3] = !!h.drzi;
  }
  function odloziPripremak(b) {
    const c = hvatTocka(b), v = glavaSvijet(); v.x += DIO.hvat;
    if (Math.hypot(c.x - v.x, c.y - v.y, c.z - v.z) < 25) { S.obrGrupa.attach(b.mesh); b.mesh.position.set(GLAVA_X, 0, 0); b.mesh.rotation.set(0, 0, 0); b.uGlavi = true; if (st.glava.stegnut) pretvoriUMrezu(b); return; }
    for (const [lista, ime] of [[PAL_I, 'izlaz'], [PAL_U, 'ulaz']]) for (const q of lista) if (Math.hypot(c.x - (q.x + DIO.hvat), c.z - q.z) < 35) {
      b.mesh.position.set(q.x, DIO_Y, q.z); b.mesh.rotation.set(0, 0, 0); b.naPaleti = ime; if (ime === 'izlaz' && b.obradjen) st.obradjeni++; return;
    }
    b.mesh.position.y = Math.max(DIO_Y, b.mesh.position.y);
  }
  function pretvoriUMrezu(b) { if (!b.mesh || b.obradjen || b.uRuci) return; b.mesh.parent.remove(b.mesh); b.mesh = null; cnc.napraviObradak(DIO.D, DIO.L, DIO.drz); cnc.nultocka(); cnc.odaberi(CNC_PROGRAM, 'O03010'); }
  function korakGlave(dtR) {
    const k = st.glava, zel = st.io.do[1];
    k.t = Math.max(0, Math.min(0.5, k.t + (zel ? dtR : -dtR))); S.celjustiNa(24 - 4 * (k.t / 0.5));
    const stegnut = zel && k.t >= 0.5 - 1e-6;
    if (stegnut !== k.stegnut) { k.stegnut = stegnut; const b = PRIPREMCI.find((b) => b.uGlavi && !b.uRuci); if (stegnut && b) pretvoriUMrezu(b); }
    st.io.di[2] = k.stegnut;
  }
  function korakVrata(dtR) { const v = st.vrata, du = dtR / T_VRATA; v.u = v.u < v.cilj ? Math.min(v.cilj, v.u + du) : Math.max(v.cilj, v.u - du); S.vrataNa(v.u); cnc.st.vrata = v.u > 0.01; st.io.di[1] = v.u <= 0.001; }
  function korakCnc(dt) {
    if (st.io.do[2] && !st.do2prije) { st.io.di[0] = false; if (!cnc.st.prog) cnc.odaberi(CNC_PROGRAM, 'O03010'); if (cnc.start()) st.cncFaza = 'radi'; }
    st.do2prije = st.io.do[2];
    cnc.st.ubrzanje = 1; cnc.korak(dt);
    if (st.cncFaza === 'radi' && cnc.st.run && cnc.st.run.gotov) { st.cncFaza = 'vracanje'; const b = PRIPREMCI.find((b) => b.uGlavi); if (b) b.obradjen = true; }
    if (st.cncFaza === 'vracanje' && cnc.uPolozajUtovara(dt)) { st.cncFaza = 'mir'; st.io.di[0] = true; }
    if (cnc.st.alarm) { cnc.reset(); st.cncFaza = 'mir'; st.io.di[0] = true; }
  }
  function reset() {
    pocetno(); cnc.ukloniObradak(); cnc.reset(); cnc.st.fiz = { X: -100, Z: -300 }; S.postaviOsi(-100, -300); cnc.nultocka(DIO.L - DIO.drz); cnc.odaberi(CNC_PROGRAM, 'O03010');
    napraviPripremke(); M.postavi(st.q); S.vrataNa(0); S.celjustiNa(24); prsti[0].position.x = PRST.otvoren; prsti[1].position.x = -PRST.otvoren;
  }
  function start() { if (!st.izv) { if (st.obradjeni >= 2 || PRIPREMCI.every((b) => b.naPaleti !== 'ulaz')) reset(); st.izv = { pc: 0, gib: null, brojaci: {}, i: 0 }; } st.radi = true; }
  function stop() { st.radi = false; }
  function korak(dtR) {
    if (!st.radi) return;
    const dts = dtR * st.ubrzanje;
    if (!st.izv && st.cekajNovi > 0) { st.cekajNovi -= dts; if (st.cekajNovi <= 0) { reset(); st.izv = { pc: 0, gib: null, brojaci: {}, i: 0 }; st.radi = true; } }
    korakProg(dts); M.postavi(st.q); rob.updateMatrixWorld(true);
    korakHvataljke(dts); korakGlave(dts); korakVrata(dts); korakCnc(dts);
  }
  reset();
  return { grupa: stanica, S, cnc, M, st, korak, start, stop, reset, PRIPREMCI, TOCKE, dno: POD, opseg: { x: [-800, 1600], z: [-400, 700], y: [POD, 400] }, naziv: 'Haas TL-1 + UR3e' };
}
