/* FORTRONIQ · Haas Desktop Mill — automatski rad CNC-a za robotsku stanicu (bez privjeska): program se učita, pokrene signalom,
   obrađuje pripremak u škripcu (visinska mreža) i na kraju (M30) daje signal „program gotov”. Sažeta inačica jezgre iz ngc.js.
   © ForTroniQ d.o.o. */
import { prevedi, razlozi } from './gkod.js?v=02';
import { pretvori } from './haas_gkod.js?v=02';
import { GEO } from './stroj_haas.js?v=02';

const HOD = GEO.HOD, XT0 = GEO.XT0, YT0 = GEO.YT0, NOS0 = GEO.NOS0;
const BRZI = 3600;
export const ALATI = { 1: { naziv: 'ravno glodalo Ø3 mm', d: 3, Lt: 24, vrsta: 'glodalo' }, 2: { naziv: 'ravno glodalo Ø6 mm', d: 6, Lt: 26, vrsta: 'glodalo' }, 3: { naziv: 'svrdlo Ø5 mm', d: 5, Lt: 30, vrsta: 'svrdlo' } };
const Lt = (t) => (ALATI[t] ? ALATI[t].Lt : 0), rAl = (t) => (ALATI[t] ? ALATI[t].d / 2 : 1.5);

export function napraviCNC(THREE, S, o = {}) {
  const BOJA = { bg: new THREE.Color(0xe8e0c8), br: new THREE.Color(0xb3a37a) };
  const st = { fiz: { X: -76, Y: 0, Z: 0 }, alatU: 2, S: 0, rpm: 0, cw: false, vrata: false, prog: null, run: null, alarm: null, poruka: 'READY', gotovSignal: false, uRadu: false, ubrzanje: 1, H: { 1: 0, 2: 0, 3: 0 }, off54: { X: 0, Y: 0, Z: 0 } };
  const vrh = () => ({ x: st.fiz.X + XT0, y: st.fiz.Y + YT0, z: NOS0 + st.fiz.Z - Lt(st.alatU) });
  const R = () => rAl(st.alatU);
  const na = (e, d) => { if (o.na) o.na(e, d); };
  /* --- ploča (visinska mreža) --- */
  let PL = null;
  function ukloniPlocu(zadrzi) { if (!PL) return; if (!zadrzi) { if (PL.mesh.parent) PL.mesh.parent.remove(PL.mesh); if (PL.rub.parent) PL.rub.parent.remove(PL.rub); } PL = null; }
  function napraviPlocu(L, W, H, x0, y0, bot) {
    ukloniPlocu();
    const k = L * W > 22000 ? 0.75 : 0.5, nx = Math.round(L / k) + 1, ny = Math.round(W / k) + 1, kx = L / (nx - 1), ky = W / (ny - 1);
    const vis = new Float32Array(nx * ny).fill(H), pos = new Float32Array(nx * ny * 3), col = new Float32Array(nx * ny * 3), idx = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const q = j * nx + i; pos.set([x0 + i * kx, bot + H, -(y0 + j * ky)], 3 * q); col.set([BOJA.bg.r, BOJA.bg.g, BOJA.bg.b], 3 * q);
      if (i < nx - 1 && j < ny - 1) { const a = q, b = q + 1, c = q + nx, d = q + nx + 1; idx.push(a, c, b, b, c, d); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
    const rub = []; for (let i = 0; i < nx; i++) rub.push(i); for (let j = 1; j < ny; j++) rub.push(j * nx + nx - 1); for (let i = nx - 2; i >= 0; i--) rub.push((ny - 1) * nx + i); for (let j = ny - 2; j > 0; j--) rub.push(j * nx);
    const rp = new Float32Array(rub.length * 6), ri = [];
    rub.forEach((q, n) => { const x = pos[3 * q], z = pos[3 * q + 2]; rp.set([x, bot + H, z, x, bot, z], 6 * n); const m = (n + 1) % rub.length; ri.push(2 * n, 2 * n + 1, 2 * m, 2 * m, 2 * n + 1, 2 * m + 1); });
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
    const rm = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6, side: THREE.DoubleSide }));
    /* dno */
    const dno = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.7, side: THREE.DoubleSide })); dno.rotation.x = Math.PI / 2; dno.position.set(x0 + L / 2, bot, -(y0 + W / 2)); rm.add(dno);
    mesh.userData.dio = rm.userData.dio = 'obradak';
    S.obrGrupa.add(mesh, rm);
    PL = { L, W, H, x0, y0, bot, top: bot + H, k, kx, ky, nx, ny, vis, mesh, rub: rm, rubIdx: rub, prljavo: false };
    return PL;
  }
  function osvjeziPlocu() {
    if (!PL || !PL.prljavo) return; PL.prljavo = false;
    const p = PL.mesh.geometry.attributes.position.array, c = PL.mesh.geometry.attributes.color.array, t = new THREE.Color();
    for (let q = 0; q < PL.vis.length; q++) { p[3 * q + 1] = PL.bot + PL.vis[q]; t.copy(BOJA.bg).lerp(BOJA.br, Math.min(1, (PL.H - PL.vis[q]) / 2.5)); c[3 * q] = t.r; c[3 * q + 1] = t.g; c[3 * q + 2] = t.b; }
    PL.mesh.geometry.attributes.position.needsUpdate = true; PL.mesh.geometry.attributes.color.needsUpdate = true; PL.mesh.geometry.computeVertexNormals();
    const rp = PL.rub.geometry.attributes.position.array; PL.rubIdx.forEach((q, n) => { rp[6 * n + 1] = PL.bot + PL.vis[q]; }); PL.rub.geometry.attributes.position.needsUpdate = true;
  }
  function ploca(t, rezi) {
    if (!PL) return 0; const h = t.z - PL.bot; if (h >= PL.H) return 0; const r = R();
    const i0 = Math.max(0, Math.floor((t.x - r - PL.x0) / PL.kx)), i1 = Math.min(PL.nx - 1, Math.ceil((t.x + r - PL.x0) / PL.kx));
    const j0 = Math.max(0, Math.floor((t.y - r - PL.y0) / PL.ky)), j1 = Math.min(PL.ny - 1, Math.ceil((t.y + r - PL.y0) / PL.ky));
    const r2 = r * r, hh = Math.max(0, h); let pr = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = PL.x0 + i * PL.kx - t.x, dy = PL.y0 + j * PL.ky - t.y; if (dx * dx + dy * dy > r2) continue;
      const q = j * PL.nx + i; if (PL.vis[q] > hh) { pr = Math.max(pr, PL.vis[q] - hh); if (rezi) { PL.vis[q] = hh; PL.prljavo = true; } }
    }
    return pr;
  }
  /* --- program --- */
  function alat(t) { st.alatU = t; const a = ALATI[t]; S.postaviAlat(a.Lt, a.d, a.vrsta); }
  function nultocka(top, x0, y0) { if (top === undefined) { if (!PL) return; top = PL.top; x0 = PL.x0; y0 = PL.y0; } st.off54 = { X: x0 - XT0, Y: y0 - YT0, Z: 0 }; Object.keys(ALATI).forEach((t) => { st.H[t] = top - NOS0 + Lt(+t); }); }
  function odaberi(tekst, ime) {
    const r = pretvori(tekst, { offsets: { 54: st.off54 }, H: st.H, Lt, polumjer: rAl, T0: st.alatU, programi: {} });
    const pv = prevedi(r.B.map((b) => b.kod).join('\n'), { start: { X: st.fiz.X, Y: st.fiz.Y, Z: st.fiz.Z, A: 0 }, G54: { X: 0, Y: 0, Z: 0, A: 0 }, T0: st.alatU, duljina: Lt, alatPostoji: () => true, korak: 0.5 });
    const vrti = new Uint8Array(r.B.length), Sr = new Float32Array(r.B.length); let v = 0, s = 0;
    r.B.forEach((b, i) => { const { w } = razlozi(b.kod); if (w.S !== undefined) s = w.S; if (w.M.includes(3) || w.M.includes(4)) v = 1; if (w.M.includes(5) || w.M.includes(30)) v = 0; vrti[i] = v; Sr[i] = s; });
    const ev = r.B.map((b, i) => (b.ev ? { i, ev: b.ev } : null)).filter(Boolean);
    st.prog = { ime, redci: String(tekst).replace(/\r/g, '').split('\n'), B: r.B, P: pv.P, vrti, Sr, ev, greske: r.greske.filter((g) => g.alarm) };
    return st.prog;
  }
  function start() {
    if (st.alarm) { st.poruka = 'ALARM — potreban RESET'; return false; }
    if (!st.prog) { st.poruka = 'Nema programa'; return false; }
    if (st.vrata) { st.poruka = 'DOOR OPEN — door hold'; na('doorHold'); return false; }
    if (st.run && st.run.ide) return false;
    if (st.run && !st.run.gotov && st.run.i > 0) { st.run.ide = true; st.uRadu = true; st.poruka = 'PROGRAM RUNNING — ' + st.prog.ime + ' (nastavak)'; na('start'); return true; }
    st.run = { i: 0, evI: 0, ide: true, gotov: false, trenBlok: -1, zapoceta: -1 };
    st.gotovSignal = false; st.uRadu = true; st.poruka = 'PROGRAM RUNNING — ' + st.prog.ime; na('start'); return true;
  }
  function stop(razlog) { if (st.run) st.run.ide = false; st.cw = false; st.uRadu = false; st.poruka = razlog || 'STOP'; }
  function reset() { st.alarm = null; st.run = null; st.cw = false; st.uRadu = false; st.poruka = 'READY'; }
  function korak(dt) {
    const A = st.run; if (A && A.ide && !st.alarm) {
      let ost = dt * st.ubrzanje;
      while (ost > 0 && A.i < st.prog.P.length) {
        const p = st.prog.P[A.i], blok = p[6];
        if (A.zapoceta !== A.i) { A.zapoceta = A.i; while (A.evI < st.prog.ev.length && st.prog.ev[A.evI].i <= blok) { const e = st.prog.ev[A.evI].ev; if (e.m06 !== undefined && e.m06 !== st.alatU) alat(e.m06); A.evI++; } }
        if (blok !== A.trenBlok) { A.trenBlok = blok; }
        st.cw = !!st.prog.vrti[blok]; st.S = Math.min(15000, st.prog.Sr[blok]); if (st.cw && st.rpm < st.S) st.rpm = st.S;
        const cilj = { X: p[0], Y: p[1], Z: p[2] + Lt(st.alatU) };
        for (const q of ['X', 'Y', 'Z']) if (cilj[q] < HOD[q][0] - 1e-6 || cilj[q] > HOD[q][1] + 1e-6) { st.alarm = { br: { X: 316, Y: 317, Z: 318 }[q], tekst: q + ' OVER TRAVEL RANGE' }; stop('ALARM ' + st.alarm.br + ' ' + st.alarm.tekst); na('alarm', st.alarm); return; }
        const d = { X: cilj.X - st.fiz.X, Y: cilj.Y - st.fiz.Y, Z: cilj.Z - st.fiz.Z };
        const v = p[4] === 0 ? BRZI : Math.min(BRZI, Math.max(1, p[5]));
        const t = (p[4] === 0 ? Math.max(Math.abs(d.X), Math.abs(d.Y), Math.abs(d.Z)) : Math.hypot(d.X, d.Y, d.Z)) / v * 60;
        let u; if (t <= ost) { u = 1; ost -= t; } else { u = ost / t; ost = 0; }
        const od = { ...st.fiz }, nov = u >= 1 ? cilj : { X: od.X + d.X * u, Y: od.Y + d.Y * u, Z: od.Z + d.Z * u };
        const n = Math.max(1, Math.ceil(Math.hypot(nov.X - od.X, nov.Y - od.Y, nov.Z - od.Z) / 0.4));
        for (let k = 1; k <= n; k++) { const s = k / n; st.fiz = { X: od.X + (nov.X - od.X) * s, Y: od.Y + (nov.Y - od.Y) * s, Z: od.Z + (nov.Z - od.Z) * s }; if (PL) ploca(vrh(), st.rpm > 500); }
        if (u >= 1) A.i++;
      }
      if (A.i >= st.prog.P.length) { A.ide = false; A.gotov = true; st.cw = false; st.uRadu = false; st.gotovSignal = true; st.poruka = 'PROGRAM END (M30) — ' + st.prog.ime; na('kraj'); }
    }
    const c = st.cw && !st.vrata ? st.S : 0, ac = 15000 * dt * Math.max(1, st.ubrzanje);
    st.rpm = st.rpm < c ? Math.min(c, st.rpm + ac) : Math.max(c, st.rpm - ac);
    if (st.rpm > 0) S.okreniAlat(S.kutAlata + Math.min(0.9, st.rpm / 15000 * 0.9));
    osvjeziPlocu();
    S.postaviOsi(st.fiz.X, st.fiz.Y, st.fiz.Z);
  }
  /* osi u položaj za utovar (stol naprijed, glava gore) — kao G53 G00 Z0. pa X-76 Y0 */
  function uPolozajUtovara(dt) {
    const c = { X: -76, Y: 0, Z: 0 }; const v = BRZI / 60 * dt * st.ubrzanje; let gotov = true;
    for (const q of ['Z', 'X', 'Y']) { const d = c[q] - st.fiz[q]; if (Math.abs(d) > 1e-6) { gotov = false; st.fiz[q] += Math.abs(d) <= v ? d : Math.sign(d) * v; if (q === 'Z') break; } }
    S.postaviOsi(st.fiz.X, st.fiz.Y, st.fiz.Z); return gotov;
  }
  alat(2);
  return { st, get PL() { return PL; }, napraviPlocu, ukloniPlocu, nultocka, odaberi, start, stop, reset, korak, uPolozajUtovara, alat, vrh };
}
