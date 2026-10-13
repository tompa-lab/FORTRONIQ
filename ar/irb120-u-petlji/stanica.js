// stanica.js — robotska stanica („postav“): pokretna traka s fotoćelijom (ATV320), okretni stol (Lexium 32 + BSH0551),
// paleta (raster), stalak za ploču i parametri postava. Fizika je namjerno jednostavna: predmeti na traci klize
// s trakom i staju na kraju, predmet na stolu okreće se sa stolom, predmet odložen na paletu ostaje.
// Robot (petlja.js) vidi predmete kao obične kockice u zajedničkom nizu `kockice`.
// Mjere u panelu su u mm i stupnjevima; u sceni su metri. KS baze: Z gore; scena: Y gore (g3).
import * as THREE from 'three';
import * as K from './kinematika.js';
import { SucjeljePLC } from './signali.js';

const D2R = Math.PI / 180;
const g3 = p => new THREE.Vector3(p[0], p[2], -p[1]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const $ = id => document.getElementById(id);

// ------------------------------------------------------------------------------- parametri postava
export const POSTAV = {
  rezim: 'robot',          // 'robot' = samo robot (kao danas) | 'stanica'
  preset: 'robot',
  traka: { L: 600, W: 150, h: 100, r: 510, fi: 66, psi: 180, v: 100, razmak: 250, brojKom: 12, slucY: 5, slucKut: 5, foto: 30 },
  stol: { uloga: 'nema', D: 300, N: 4, r: 340, fi: 45, h: 95, slotR: 100, vmax: 90, a: 180 },
  paleta: { nRed: 3, nStup: 2, nSloj: 2, px: 110, py: 70, pz: 18, r: 416, fi: -51, psi: 0 },
  ploha: { vrsta: 'vodoravno', r: 560, hd: 200, fi: 0, nagib: 0 },
  kamera: { h: 650, uzduz: 60, nagib: 0, sahovnica: false, vidljiva: false },
};
export const PRESETI = {
  robot: { ime: 'Samo robot (kao danas)', rezim: 'robot', stol: 'nema', ploha: 'vodoravno' },
  A: { ime: 'Stanica A: traka → paleta', rezim: 'stanica', stol: 'nema', ploha: 'okomito' },
  B: { ime: 'Stanica B: traka → okretni stol → paleta', rezim: 'stanica', stol: 'odlaganje', ploha: 'okomito' },
};
// polja panela: [grupa, ključ, naslov, min, max, korak, jedinica, pomoć]
const POLJA = [
  ['traka', 'L', 'Duljina trake', 300, 1200, 10, 'mm'], ['traka', 'W', 'Širina trake', 100, 300, 10, 'mm'], ['traka', 'h', 'Visina površine trake iznad stola', 40, 300, 5, 'mm'],
  ['traka', 'r', 'Kraj trake: udaljenost od osi robota', 300, 650, 5, 'mm', 'Vodoravno, od osi 1 do sredine kraja trake (mjesto prihvata).'], ['traka', 'fi', 'Kraj trake: kut oko robota', -150, 150, 1, '°', '0° je ravno ispred robota, pozitivno ulijevo (gledano odozgo).'],
  ['traka', 'psi', 'Smjer gibanja trake', -180, 180, 5, '°', 'Kut smjera u kojem predmeti putuju; traka se proteže iza kraja u suprotnom smjeru.'],
  ['traka', 'v', 'Brzina trake (ATV320 100 % = 200 mm/s)', 20, 200, 5, 'mm/s'], ['traka', 'razmak', 'Razmak predmeta na ulazu', 150, 600, 10, 'mm'], ['traka', 'brojKom', 'Broj predmeta u ciklusu', 1, 24, 1, 'kom'],
  ['traka', 'slucY', 'Slučajni bočni pomak', 0, 15, 1, '± mm', 'Za kasniji računalni vid: predmeti ne dolaze točno u sredinu.'], ['traka', 'slucKut', 'Slučajni zakret', 0, 15, 1, '± °'], ['traka', 'foto', 'Fotoćelija: udaljenost od kraja', 10, 120, 5, 'mm'],
  ['stol', 'D', 'Promjer stola', 200, 400, 10, 'mm'], ['stol', 'N', 'Broj pozicija', 2, 8, 1, ''], ['stol', 'r', 'Središte stola: udaljenost od osi robota', 200, 500, 5, 'mm'], ['stol', 'fi', 'Središte stola: kut oko robota', -150, 150, 1, '°'],
  ['stol', 'h', 'Visina površine stola iznad stola robota', 40, 250, 5, 'mm'], ['stol', 'slotR', 'Polumjer pozicija', 60, 180, 5, 'mm'], ['stol', 'vmax', 'Lexium 32: najveća brzina', 30, 180, 5, '°/s'], ['stol', 'a', 'Lexium 32: ubrzanje', 60, 360, 10, '°/s²', 'Indeksiranje je trapezni profil brzine.'],
  ['paleta', 'nRed', 'Redovi (X)', 1, 5, 1, ''], ['paleta', 'nStup', 'Stupci (Y)', 1, 4, 1, ''], ['paleta', 'nSloj', 'Slojevi', 1, 4, 1, ''], ['paleta', 'px', 'Korak X', 70, 200, 5, 'mm'], ['paleta', 'py', 'Korak Y', 65, 150, 5, 'mm'], ['paleta', 'pz', 'Visina sloja', 10, 40, 1, 'mm'],
  ['paleta', 'r', 'Središte palete: udaljenost od osi robota', 250, 550, 5, 'mm'], ['paleta', 'fi', 'Središte palete: kut oko robota', -150, 150, 1, '°'], ['paleta', 'psi', 'Zakret palete', -90, 90, 5, '°'],
  ['ploha', 'r', 'Ploča: udaljenost od osi robota', 300, 750, 5, 'mm', 'Do sredine donjeg ruba papira na ploči.'], ['ploha', 'hd', 'Ploča: visina donjeg ruba', 0, 500, 5, 'mm'], ['ploha', 'fi', 'Ploča: kut oko robota', -150, 150, 1, '°'], ['ploha', 'nagib', 'Ploča: nagib od okomice', -30, 60, 1, '°', '0° okomita ploča, gornji rub se naginje od robota.'],
  ['kamera', 'h', 'Kamera: visina iznad trake', 300, 1200, 10, 'mm'], ['kamera', 'uzduz', 'Kamera: pomak uzduž trake od kraja', -300, 300, 10, 'mm', 'Negativno = prema početku trake.'], ['kamera', 'nagib', 'Kamera: nagib od okomice', 0, 60, 1, '°', 'Naginje se prema početku trake.'],
];

const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.3 }, o));
const STOL_ROBOTA = { x0: -0.355, x1: 0.795, y0: -0.65, y1: 0.65 };   // ploha stola robota (za noge)

export class Stanica {
  // svijet: { scena, kockice, KOCKA, novaKockica(ime), ukloniKockicu(k), oznaci(id), toast(t), pocetnaPoza() }
  constructor(svijet) {
    this.s = svijet; this.P = POSTAV;
    this.grupa = new THREE.Group(); svijet.scena.add(this.grupa);
    this.traka = null; this.stol = null; this.paleta = null; this.ploca = null;
    this.stanjeTrake = { pomak: 0, radi: false, spawn: 0, brojac: 0 };
    this.stanjeStola = { kut: 0, cilj: 0, v: 0, uPoz: true, bioIndeks: false, indeksa: 0 };
    this.foto = false; this.fotoOd = 0; this.fotoOdReal = 0; this.cekamPlc = false; this.sat = 0;
    this.gradi();
  }
  // ------------------------------------------------------------ geometrija u KS baze (m)
  smjerTrake() { const a = this.P.traka.psi * D2R; return [Math.cos(a), Math.sin(a), 0]; }
  krajTrake() { const t = this.P.traka, a = t.fi * D2R; return [t.r / 1000 * Math.cos(a), t.r / 1000 * Math.sin(a), t.h / 1000]; }
  pocetakTrake() { const k = this.krajTrake(), d = this.smjerTrake(), L = this.P.traka.L / 1000; return [k[0] - d[0] * L, k[1] - d[1] * L, k[2]]; }
  // točka na traci: s = put od početka (m), lat = bočni pomak (+ ulijevo od smjera), z iznad površine
  tockaTrake(s, lat, dz) { const p = this.pocetakTrake(), d = this.smjerTrake(), n = [-d[1], d[0], 0]; return [p[0] + d[0] * s + n[0] * lat, p[1] + d[1] * s + n[1] * lat, p[2] + dz]; }
  srediste(o) { const a = o.fi * D2R; return [o.r / 1000 * Math.cos(a), o.r / 1000 * Math.sin(a)]; }
  // mjesto prihvata: središte predmeta kojeg je zaustavila fotoćelija (prednji rub na zraci + 2 mm preleta), bez slučajnih pomaka
  sZaustavljanja() { return this.P.traka.L / 1000 - this.P.traka.foto / 1000 - this.s.KOCKA.a / 2 + 0.002; }
  prihvat() { return this.tockaTrake(this.sZaustavljanja(), 0, this.s.KOCKA.h / 2); }
  // mjesto na paleti (i red, j stupac, k sloj): središte predmeta
  mjestoPalete(i, j, k) {
    const p = this.P.paleta, c = this.srediste(p), a = p.psi * D2R;
    const lx = (i - (p.nRed - 1) / 2) * p.px / 1000, ly = (j - (p.nStup - 1) / 2) * p.py / 1000;
    return [c[0] + lx * Math.cos(a) - ly * Math.sin(a), c[1] + lx * Math.sin(a) + ly * Math.cos(a), 0.01 + this.s.KOCKA.h / 2 + k * p.pz / 1000];
  }
  kutOdlaganja() { return this.P.paleta.psi * D2R; }
  // pozicije okretnog stola: kut prema robotu = odlaganje, +360/N = uzimanje
  kutStola(koji) { const c = this.srediste(this.P.stol); const a = Math.atan2(-c[1], -c[0]); return koji === 'uzmi' ? a + 2 * Math.PI / this.P.stol.N : a; }
  mjestoStola(koji) { const c = this.srediste(this.P.stol), a = this.kutStola(koji), r = this.P.stol.slotR / 1000; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), this.P.stol.h / 1000 + this.s.KOCKA.h / 2]; }
  // ploha za pisanje: p0 = donji lijevi kut papira (gledano od robota), ex desno, ey gore, ez prema robotu
  ploha() {
    const o = this.P.ploha;
    if (o.vrsta !== 'okomito') return { vrsta: 'vodoravno', p0: [0.285, -0.1885, 0.012], ex: [1, 0, 0], ey: [0, 1, 0], ez: [0, 0, 1], w: 0.21, h: 0.297 };
    const fi = o.fi * D2R, al = o.nagib * D2R, w = 0.297, h = 0.21;
    const ex = [Math.sin(fi), -Math.cos(fi), 0], ey = [Math.cos(fi) * Math.sin(al), Math.sin(fi) * Math.sin(al), Math.cos(al)], ez = K.cross(ex, ey);
    const c = [o.r / 1000 * Math.cos(fi), o.r / 1000 * Math.sin(fi), o.hd / 1000];
    return { vrsta: 'okomito', p0: K.sub(c, K.mul(ex, w / 2)), ex, ey, ez, w, h };
  }
  // ------------------------------------------------------------ izgradnja scene
  gradi() {
    while (this.grupa.children.length) this.grupa.remove(this.grupa.children[0]);
    const aktivna = this.P.rezim === 'stanica';
    this.traka = this.gradiTraku(); this.traka.visible = aktivna; this.grupa.add(this.traka);
    this.stol = this.gradiStol(); this.stol.visible = aktivna && this.P.stol.uloga !== 'nema'; this.grupa.add(this.stol);
    this.paleta = this.gradiPaletu(); this.paleta.visible = aktivna; this.grupa.add(this.paleta);
    this.ploca = this.gradiStalak(); this.ploca.visible = this.P.ploha.vrsta === 'okomito'; this.grupa.add(this.ploca);
    this.kamObj = this.gradiKameru(); this.kamObj.visible = aktivna; this.grupa.add(this.kamObj);
    this.osvjeziStol();
  }
  gradiTraku() {
    const t = this.P.traka, L = t.L / 1000, W = t.W / 1000, h = t.h / 1000;
    const g = new THREE.Group(); const p = this.pocetakTrake(); g.position.copy(g3([p[0], p[1], 0])); g.rotation.y = t.psi * D2R;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
    c.fillStyle = '#2E3A40'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#44535B'; for (let i = 0; i < 8; i++) c.fillRect(i * 32, 0, 3, 64);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(L / 0.1, 1);
    this.tekTrake = tex;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(L, 0.012, W), [mat(0x2E3A40), mat(0x2E3A40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), mat(0x2E3A40), mat(0x2E3A40), mat(0x2E3A40)]);
    belt.position.set(L / 2, h - 0.006, 0); belt.receiveShadow = true; belt.castShadow = true; g.add(belt);
    const alu = mat(0xB9C2C8, { metalness: 0.5, roughness: 0.4 });
    for (const z of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(L + 0.06, 0.05, 0.018), alu); r.position.set(L / 2, h - 0.03, z * (W / 2 + 0.012)); r.castShadow = true; g.add(r); }
    for (const x of [0, L]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, W + 0.01, 24), mat(0x6B7880)); v.rotation.x = Math.PI / 2; v.position.set(x, h - 0.026, 0); g.add(v); }
    // noge: na stol robota ako su unutar stola, inače do poda
    for (const [x, z] of [[0.06, -W / 2 - 0.012], [0.06, W / 2 + 0.012], [L - 0.06, -W / 2 - 0.012], [L - 0.06, W / 2 + 0.012]]) {
      const w = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), t.psi * D2R).add(g.position);
      const bx = w.x, by = -w.z, naStolu = bx > STOL_ROBOTA.x0 && bx < STOL_ROBOTA.x1 && by > STOL_ROBOTA.y0 && by < STOL_ROBOTA.y1;
      const dno = naStolu ? 0 : -0.74, vis = h - 0.055 - dno;
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.03, vis, 0.03), mat(0x5E676D)); n.position.set(x, dno + vis / 2, z); g.add(n);
    }
    // graničnik na kraju, motor s pretvaračem, fotoćelija
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, W + 0.02), mat(0xD9822B)); st.position.set(L + 0.006, h + 0.012, 0); g.add(st);
    const mot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.09), mat(0x3B4A52)); mot.position.set(L - 0.05, h - 0.09, W / 2 + 0.07); g.add(mot);
    const atv = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.03), mat(0x1F6B3A)); atv.position.set(L - 0.16, h - 0.1, W / 2 + 0.05); g.add(atv);
    const fx = L - t.foto / 1000;
    for (const z of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.024, 0.014), mat(0xF2C200)); f.position.set(fx, h + 0.012, z * (W / 2 + 0.02)); g.add(f); }
    this.zraka = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, W + 0.04), new THREE.MeshBasicMaterial({ color: 0x2ECC40 })); this.zraka.position.set(fx, h + 0.012, 0); g.add(this.zraka);
    return g;
  }
  gradiStol() {
    const o = this.P.stol, R = o.D / 2000, h = o.h / 1000, c = this.srediste(o);
    const g = new THREE.Group(); g.position.copy(g3([c[0], c[1], 0]));
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, h - 0.015, 24), mat(0x5E676D)); ped.position.y = (h - 0.015) / 2; ped.castShadow = true; g.add(ped);
    const srv = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 20), mat(0x2B3338)); srv.rotation.z = Math.PI / 2; srv.position.set(0.1, 0.045, 0); g.add(srv);
    const kut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.05), mat(0x8B96A0)); kut.position.set(0.06, 0.015, 0); g.add(kut);
    const disk = new THREE.Group(); disk.position.y = h; g.add(disk); this.disk = disk;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const cx = cv.getContext('2d');
    cx.fillStyle = '#8E9AA3'; cx.beginPath(); cx.arc(256, 256, 256, 0, 7); cx.fill();
    cx.strokeStyle = '#F2C200'; cx.lineWidth = 6; const rs = o.slotR / 1000 / R * 256;
    for (let k = 0; k < o.N; k++) { const a = k * 2 * Math.PI / o.N; cx.beginPath(); cx.arc(256 + rs * Math.cos(a), 256 - rs * Math.sin(a), 0.06 / R * 256, 0, 7); cx.stroke(); cx.fillStyle = '#2B3338'; cx.font = 'bold 40px sans-serif'; cx.textAlign = 'center'; cx.fillText(String(k + 1), 256 + (rs + 0.045 / R * 256) * Math.cos(a), 256 - (rs + 0.045 / R * 256) * Math.sin(a) + 14); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.015, 48), [mat(0x7A868F), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.3 }), mat(0x7A868F)]);
    d.position.y = -0.0075; d.castShadow = true; d.receiveShadow = true; disk.add(d);
    return g;
  }
  gradiPaletu() {
    const p = this.P.paleta, c = this.srediste(p), W = p.nRed * p.px / 1000 + 0.03, H = p.nStup * p.py / 1000 + 0.03;
    const g = new THREE.Group(); g.position.copy(g3([c[0], c[1], 0])); g.rotation.y = p.psi * D2R;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * H / W); const cx = cv.getContext('2d');
    cx.fillStyle = '#C9A26A'; cx.fillRect(0, 0, cv.width, cv.height); cx.strokeStyle = 'rgba(60,40,10,.6)'; cx.lineWidth = 3;
    const sx = cv.width / W, sy = cv.height / H;
    for (let i = 0; i < p.nRed; i++) for (let j = 0; j < p.nStup; j++) {
      const x = cv.width / 2 + ((i - (p.nRed - 1) / 2) * p.px / 1000 - 0.05) * sx, y = cv.height / 2 - ((j - (p.nStup - 1) / 2) * p.py / 1000 + 0.03) * sy;
      cx.strokeRect(x, y, 0.1 * sx, 0.06 * sy); cx.fillStyle = 'rgba(60,40,10,.55)'; cx.font = 'bold 22px sans-serif'; cx.fillText((i + 1) + '.' + (j + 1), x + 6, y + 24);
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const pl = new THREE.Mesh(new THREE.BoxGeometry(W, 0.01, H), [mat(0xA8844F), mat(0xA8844F), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), mat(0xA8844F), mat(0xA8844F), mat(0xA8844F)]);
    pl.position.y = 0.005; pl.receiveShadow = true; pl.castShadow = true; g.add(pl);
    return g;
  }
  gradiStalak() {
    const g = new THREE.Group(); const P = this.ploha(); if (P.vrsta !== 'okomito') return g;
    const o = this.P.ploha, fi = o.fi * D2R;
    const c = [o.r / 1000 * Math.cos(fi), o.r / 1000 * Math.sin(fi), 0], nz = K.mul(P.ez, -0.03);
    g.position.copy(g3([c[0] + nz[0], c[1] + nz[1], 0])); g.rotation.y = fi + Math.PI / 2;      // lokalni x = ex (desno)
    const vis = o.hd / 1000 + P.h + 0.05;
    for (const x of [-P.w / 2 - 0.02, P.w / 2 + 0.02]) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.025, vis, 0.025), mat(0x5E676D)); n.position.set(x, vis / 2, 0); n.castShadow = true; g.add(n); const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.2), mat(0x5E676D)); f.position.set(x, 0.01, 0); g.add(f); }
    const pr = new THREE.Mesh(new THREE.BoxGeometry(P.w + 0.07, 0.025, 0.025), mat(0x5E676D)); pr.position.set(0, vis - 0.0125, 0); g.add(pr);
    return g;
  }
  gradiKameru() {
    const g = new THREE.Group(); const t = this.P.traka, k = this.P.kamera;
    const L = t.L / 1000, h = t.h / 1000;
    const bazna = this.tockaTrake(L + k.uzduz / 1000, 0, 0);            // točka na traci ispod kamere
    const vrh = [bazna[0], bazna[1], h + k.h / 1000];
    // stup pokraj trake (s vanjske strane), prečka do kamere
    const n = [-this.smjerTrake()[1], this.smjerTrake()[0]]; const stup = [bazna[0] + n[0] * (t.W / 2000 + 0.06), bazna[1] + n[1] * (t.W / 2000 + 0.06)];
    const naStolu = stup[0] > STOL_ROBOTA.x0 && stup[0] < STOL_ROBOTA.x1 && stup[1] > STOL_ROBOTA.y0 && stup[1] < STOL_ROBOTA.y1;
    const dno = naStolu ? 0 : -0.74, visina = vrh[2] + 0.03 - dno;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, visina, 12), mat(0x5E676D)); s.position.copy(g3([stup[0], stup[1], dno + visina / 2])); g.add(s);
    const pre = new THREE.Mesh(new THREE.BoxGeometry(t.W / 2000 + 0.09, 0.02, 0.02), mat(0x5E676D)); const sr = [(stup[0] + vrh[0]) / 2, (stup[1] + vrh[1]) / 2, vrh[2] + 0.02]; pre.position.copy(g3(sr)); pre.rotation.y = t.psi * D2R + Math.PI / 2; g.add(pre);
    const kam = new THREE.Group(); kam.position.copy(g3(vrh)); g.add(kam); this.kamTijelo = kam;
    const tijelo = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.029, 0.024), mat(0x1A1F23, { roughness: 0.5 })); kam.add(tijelo);
    const leca = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16), mat(0x0A0C0E)); leca.position.set(0, -0.015, 0); kam.add(leca);
    // orijentacija: optička os prema dolje, nagnuta prema početku trake
    const d = this.smjerTrake(), nag = k.nagib * D2R;
    const os = [-d[0] * Math.sin(nag), -d[1] * Math.sin(nag), -Math.cos(nag)];            // smjer gledanja (baza)
    this.kamPoza = { p: vrh, os, gore: d };
    const cilj = K.add(vrh, os); kam.lookAt(g3(cilj));
    return g;
  }
  osvjeziStol() { if (this.disk) this.disk.rotation.y = this.stanjeStola.kut * D2R; }

  // ------------------------------------------------------------ predmeti
  dodajNaTraku() {
    const t = this.P.traka, k = this.s.novaKockica('predmet ' + (++this.stanjeTrake.brojac));
    k.stanica = true; k.nosac = 'traka'; k.s = 0.06; k.lat = (Math.random() * 2 - 1) * t.slucY / 1000; k.kut = (Math.random() * 2 - 1) * t.slucKut * D2R;
    this.postaviNaTraku(k);
  }
  postaviNaTraku(k) {
    const p = this.tockaTrake(k.s, k.lat, this.s.KOCKA.h / 2);
    k.mesh.position.copy(g3(p)); k.mesh.rotation.set(0, this.P.traka.psi * D2R + k.kut, 0);
  }
  dodajNaStol(koji) {
    const k = this.s.novaKockica('predmet ' + (++this.stanjeTrake.brojac)); k.stanica = true; k.nosac = 'stol';
    const p = this.mjestoStola(koji); k.mesh.position.copy(g3(p)); k.mesh.rotation.set(0, this.kutStola(koji) + Math.PI / 2, 0);
    this.disk.attach(k.mesh);
  }
  // oslonac za odloženi predmet (pusti() u petlja.js): visina oslonca, nosač i roditelj u sceni
  oslonac(x, y, zc) {
    if (this.P.rezim !== 'stanica') return { z: 0, nosac: null, parent: null };
    const t = this.P.traka, L = t.L / 1000, h = t.h / 1000;
    const p0 = this.pocetakTrake(), d = this.smjerTrake(), n = [-d[1], d[0]];
    const s = (x - p0[0]) * d[0] + (y - p0[1]) * d[1], lat = (x - p0[0]) * n[0] + (y - p0[1]) * n[1];
    if (s > -0.02 && s < L + 0.06 && Math.abs(lat) < t.W / 2000 + 0.03 && zc > h - 0.03) return { z: h, nosac: 'traka', parent: null, s: Math.min(L - this.s.KOCKA.a / 2, Math.max(0.05, s)), lat };
    if (this.P.stol.uloga !== 'nema') { const c = this.srediste(this.P.stol); if (Math.hypot(x - c[0], y - c[1]) < this.P.stol.D / 2000 + 0.02 && zc > this.P.stol.h / 1000 - 0.03) return { z: this.P.stol.h / 1000, nosac: 'stol', parent: this.disk }; }
    const p = this.P.paleta, c = this.srediste(p), a = -p.psi * D2R, lx = (x - c[0]) * Math.cos(a) - (y - c[1]) * Math.sin(a), ly = (x - c[0]) * Math.sin(a) + (y - c[1]) * Math.cos(a);
    if (Math.abs(lx) < p.nRed * p.px / 2000 + 0.015 && Math.abs(ly) < p.nStup * p.py / 2000 + 0.015) return { z: 0.01, nosac: 'paleta', parent: null };
    return { z: 0, nosac: null, parent: null };
  }
  naPaleti() { return this.s.kockice.filter(k => k.nosac === 'paleta' && !k.drzi).length; }
  kapacitet() { const p = this.P.paleta; return p.nRed * p.nStup * p.nSloj; }

  // ------------------------------------------------------------ korak fizike (dt = simulirano vrijeme, s)
  korak(dt) {
    if (this.P.rezim !== 'stanica') return;
    this.sat += dt;
    const plc = SucjeljePLC(); if (!plc) return;
    const t = this.P.traka, L = t.L / 1000, a = this.s.KOCKA.a;
    // ---- traka: ATV320 vrti remen dok je Q_TrakaNaprijed = 1, brzina iz reference (100 % = 200 mm/s)
    const radi = !!plc.citaj('Q_TrakaNaprijed'); const v = radi ? 0.2 * (plc.citaj('Q_TrakaBrzina') || 0) / 100 : 0;
    this.stanjeTrake.radi = radi; this.stanjeTrake.v = v;
    // PLC reagira na fotoćeliju unutar svog ciklusa (10 ms), a okvir simulacije traje i dulje: dok PLC ne isključi traku
    // (najviše 150 ms stvarnog vremena), predmet na zraci se drži na mjestu zaustavljanja (prelet 3 mm)
    if (this.cekamPlc && (!radi || performance.now() - this.fotoOdReal > 150)) this.cekamPlc = false;
    if (v > 0 && this.tekTrake) { this.stanjeTrake.pomak += v * dt; this.tekTrake.offset.x = -this.stanjeTrake.pomak / 0.1; }
    const naTraci = this.s.kockice.filter(k => k.nosac === 'traka' && !k.drzi).sort((p, q) => q.s - p.s);
    const sf = L - t.foto / 1000, sStop = this.sZaustavljanja();
    let ispred = L - a / 2 + a + 0.005;
    for (const k of naTraci) {
      let ns = Math.min(k.s + v * dt, ispred - a - 0.005, L - a / 2);
      // PLC zaustavi traku unutar jednog ciklusa (10 ms): predmet koji prekrije zraku ne prelazi je za više od 2–5 mm,
      // osim ako traka i dalje radi (forsirano) dulje od 0,1 s simuliranog vremena
      if ((!this.foto || this.cekamPlc) && k.s + a / 2 < sf + 0.01 && ns > sStop + 0.003) ns = Math.max(k.s, sStop + 0.003);
      k.s = ns; ispred = k.s; this.postaviNaTraku(k);
    }
    // ulaz predmeta: dok traka radi i ima mjesta na početku
    if (radi && this.stanjeTrake.brojac < t.brojKom && !naTraci.some(k => k.s < t.razmak / 1000)) this.dodajNaTraku();
    // ---- fotoćelija: predmet prekriva zraku na L - foto
    const foto = naTraci.some(k => k.s + a / 2 >= sf - 0.002 && k.s - a / 2 <= sf);
    if (foto !== this.foto) { this.foto = foto; this.fotoOd = this.sat; this.fotoOdReal = performance.now(); this.cekamPlc = foto; plc.pisi('I_Fotocelija', foto ? 1 : 0); this.zraka.material.color.set(foto ? 0xE2341D : 0x2ECC40); }
    if (foto && !radi && plc.citaj('M_Ciklus')) this.s.oznaci('st_senzor');
    // ---- okretni stol: Lexium 32 indeksira trapeznim profilom na naredbu Q_StolIndeks
    if (this.P.stol.uloga !== 'nema') {
      const st = this.stanjeStola, o = this.P.stol, ind = !!plc.citaj('Q_StolIndeks');
      if (ind && !st.bioIndeks && st.uPoz) { st.cilj += 360 / o.N; st.uPoz = false; st.pocetak = performance.now(); st.indeksa++; this.s.oznaci('st_stol'); }
      st.bioIndeks = ind;
      const d = st.cilj - st.kut;
      // status „u poziciji“ pada barem 80 ms stvarnog vremena, da ga PLC (ciklus 10 ms) sigurno vidi i pri ubrzanju simulacije
      const smijeStati = performance.now() - (st.pocetak || 0) > 80;
      if (Math.abs(d) < 0.02 && Math.abs(st.v) < 2) { st.kut = st.cilj; st.v = 0; if (!st.uPoz && smijeStati) st.uPoz = true; }
      else {
        const sg = Math.sign(d), stopni = st.v * st.v / (2 * o.a);
        if (Math.abs(d) <= stopni && Math.sign(st.v) === sg) st.v -= sg * o.a * dt; else st.v += sg * o.a * dt;
        st.v = Math.max(-o.vmax, Math.min(o.vmax, st.v));
        const novi = st.kut + st.v * dt;
        if ((novi - st.cilj) * sg >= 0) { st.kut = st.cilj; st.v = 0; if (smijeStati) st.uPoz = true; } else st.kut = novi;
      }
      plc.pisi('I_StolUPoz', st.uPoz ? 1 : 0);
      this.osvjeziStol();
      // stol kao drugo mjesto prihvata: na poziciju odlaganja „operater“ stavlja novi predmet
      if (o.uloga === 'prihvat' && st.uPoz && this.stanjeTrake.brojac < t.brojKom) {
        const m = this.mjestoStola('odlozi');
        if (!this.s.kockice.some(k => { const w = new THREE.Vector3(); k.mesh.getWorldPosition(w); return Math.hypot(w.x - m[0], -w.z - m[1]) < 0.05; })) this.dodajNaStol('odlozi');
      }
    } else plc.pisi('I_StolUPoz', 1);
    if (this.naPaleti() >= this.kapacitet()) this.s.oznaci('st_paleta');
  }
  // ------------------------------------------------------------ reset i presets
  reset() {
    for (const k of this.s.kockice.filter(k => k.stanica)) this.s.ukloniKockicu(k);
    this.stanjeTrake = { pomak: 0, radi: false, spawn: 0, brojac: 0 };
    this.stanjeStola = { kut: 0, cilj: 0, v: 0, uPoz: true, bioIndeks: false, indeksa: 0 };
    this.foto = false; this.cekamPlc = false; const plc = SucjeljePLC(); if (plc) { plc.pisi('I_Fotocelija', 0); plc.pisi('I_StolUPoz', 1); }
    if (this.zraka) this.zraka.material.color.set(0x2ECC40);
    this.osvjeziStol();
  }
  preset(ime) {
    const p = PRESETI[ime]; if (!p) return;
    this.P.preset = ime; this.P.rezim = p.rezim; this.P.stol.uloga = p.stol; this.P.ploha.vrsta = p.ploha;
    this.reset(); this.gradi();
    this.s.naPromjenu && this.s.naPromjenu('preset');
    if (ime !== 'robot') this.s.oznaci('st_postav');
    this.osvjeziPanel();
  }
  // ------------------------------------------------------------ stanje za FTQ_SIM i HMI
  stanje() {
    const st = this.stanjeStola, t = this.stanjeTrake;
    return {
      rezim: this.P.rezim, preset: this.P.preset, traka: { radi: t.radi, vMms: Math.round((t.v || 0) * 1000), dodano: t.brojac, naTraci: this.s.kockice.filter(k => k.nosac === 'traka').map(k => +(k.s * 1000).toFixed(0)) },
      foto: this.foto, stol: { uloga: this.P.stol.uloga, kut: +st.kut.toFixed(1), cilj: st.cilj, uPoz: st.uPoz, indeksa: st.indeksa, pozicija: Math.round(st.kut / (360 / this.P.stol.N)) % this.P.stol.N + 1 },
      paleta: { na: this.naPaleti(), kapacitet: this.kapacitet() }, ploha: this.P.ploha.vrsta, kamera: this.kamPoza,
    };
  }
  // ------------------------------------------------------------ panel postava (DOM)
  vezi(el) {
    this.el = el;
    const grupe = { traka: 'traka', stol: 'stol', paleta: 'paleta', ploha: 'ploha', kamera: 'kamera' };
    for (const g of Object.keys(grupe)) {
      const kont = el.querySelector('[data-postav="' + g + '"]'); if (!kont) continue;
      kont.insertAdjacentHTML('beforeend', POLJA.filter(f => f[0] === g).map(f => {
        const id = 'po-' + f[0] + '-' + f[1], v = this.P[f[0]][f[1]];
        return '<div class="polje"><label for="' + id + '">' + esc(f[2]) + '</label><div class="ulaz"><input type="range" id="' + id + '-r" min="' + f[3] + '" max="' + f[4] + '" step="' + f[5] + '" value="' + v + '" aria-label="' + esc(f[2]) + '" data-po="' + f[0] + '.' + f[1] + '"><input type="number" id="' + id + '" min="' + f[3] + '" max="' + f[4] + '" step="' + f[5] + '" value="' + v + '" data-po="' + f[0] + '.' + f[1] + '"><span>' + esc(f[6]) + '</span></div>' + (f[7] ? '<p class="pom">' + esc(f[7]) + '</p>' : '') + '</div>';
      }).join(''));
    }
    el.addEventListener('input', (ev) => {
      const i = ev.target.closest('[data-po]'); if (!i) return;
      const [g, k] = i.dataset.po.split('.'); const v = +i.value; if (isNaN(v)) return;
      this.P[g][k] = v;
      const par = el.querySelector('[data-po="' + i.dataset.po + '"]' + (i.type === 'range' ? ':not([type=range])' : '[type=range]')); if (par) par.value = v;
      if (g === 'traka' && k === 'v' && this.s.plc) this.s.plc.parametar('P_Brzina', Math.round(v / 2));   // ATV320: 100 % = 200 mm/s
      clearTimeout(this.tGradi); this.tGradi = setTimeout(() => { this.gradi(); this.s.naPromjenu && this.s.naPromjenu(g); this.osvjeziInfo(); }, 60);
    });
    const uloga = el.querySelector('#po-stol-uloga'); uloga.value = this.P.stol.uloga;
    uloga.addEventListener('change', () => { this.P.stol.uloga = uloga.value; this.reset(); this.gradi(); this.s.naPromjenu && this.s.naPromjenu('stol'); this.osvjeziInfo(); });
    el.querySelectorAll('[data-ploha]').forEach(b => b.addEventListener('click', () => { this.P.ploha.vrsta = b.dataset.ploha; this.gradi(); this.s.naPromjenu && this.s.naPromjenu('ploha'); this.osvjeziPanel(); }));
    const pre = el.querySelector('#po-preset'); pre.innerHTML = Object.entries(PRESETI).map(([k, p]) => '<option value="' + k + '">' + esc(p.ime) + '</option>').join('');
    pre.addEventListener('change', () => this.preset(pre.value));
    el.querySelector('#po-reset').addEventListener('click', () => { this.reset(); this.s.naReset && this.s.naReset(); this.s.toast && this.s.toast('Stanica vraćena: predmeti maknuti, brojači na 0.'); });
    el.querySelector('#po-doma').addEventListener('click', () => this.s.pocetnaPoza());
    this.osvjeziPanel();
    setInterval(() => this.osvjeziInfo(), 300);
  }
  osvjeziPanel() {
    if (!this.el) return;
    const el = this.el;
    el.querySelector('#po-preset').value = this.P.preset;
    el.querySelector('#po-stol-uloga').value = this.P.stol.uloga;
    el.querySelectorAll('[data-ploha]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ploha === this.P.ploha.vrsta ? 'true' : 'false'));
    el.querySelectorAll('[data-po]').forEach(i => { const [g, k] = i.dataset.po.split('.'); i.value = this.P[g][k]; });
    el.querySelector('#po-stol-polja').hidden = this.P.stol.uloga === 'nema';
    el.querySelector('#po-ploha-polja').hidden = this.P.ploha.vrsta !== 'okomito';
    el.querySelector('#po-upozorenje').hidden = this.P.rezim === 'stanica';
    this.osvjeziInfo();
  }
  osvjeziInfo() {
    if (!this.el) return;
    const st = this.stanjeStola, t = this.stanjeTrake, pr = this.prihvat(), pp = this.mjestoPalete(0, 0, 0);
    const f = v => (v * 1000).toFixed(0);
    const i = this.el.querySelector('#po-info');
    const tekst = 'Traka: ' + (t.radi ? 'radi, ' + Math.round((t.v || 0) * 1000) + ' mm/s' : 'stoji') + ' · dodano ' + t.brojac + ' / ' + this.P.traka.brojKom + ' · fotoćelija ' + (this.foto ? '1' : '0') +
      '\nMjesto prihvata (središte predmeta): X ' + f(pr[0]) + ', Y ' + f(pr[1]) + ', Z ' + f(pr[2]) + ' mm' +
      '\nPaleta 1.1 sloj 1: X ' + f(pp[0]) + ', Y ' + f(pp[1]) + ', Z ' + f(pp[2]) + ' mm · na paleti ' + this.naPaleti() + ' / ' + this.kapacitet() +
      (this.P.stol.uloga !== 'nema' ? '\nLexium 32: kut ' + st.kut.toFixed(1) + '°, cilj ' + st.cilj.toFixed(0) + '°, brzina ' + st.v.toFixed(0) + ' °/s, ' + (st.uPoz ? 'u poziciji' : 'okreće se') + ', indeksa: ' + st.indeksa : '');
    if (i.textContent !== tekst) i.textContent = tekst;
  }

  // ------------------------------------------------------------ RAPID paletizacije iz rastera
  // pomocnik.robtarget(p[m], R) -> [trans, rot, conf, extax] s konfiguracijom iz IK-a (ili null ako nedostižno)
  generirajRapid(pomocnik, datum) {
    const P = this.P, p = P.paleta, o = P.stol, uloga = o.uloga;
    const rt = (pt, kut, ime) => { const r = pomocnik.robtarget(K.add(pt, [0, 0, 0.141]), hvatR(kut)); if (!r) greske.push('Točka ' + ime + ' (' + pt.map(v => (v * 1000).toFixed(0)).join(', ') + ' mm) nije dostižna s prihvatnicom prema dolje.'); return r; };
    const hvatR = (kut) => { const x = [Math.cos(kut), Math.sin(kut), 0], z = [0, 0, -1], y = K.cross(z, x); return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]; };
    const greske = [];
    const pPrihvat = rt(this.prihvat(), P.traka.psi * D2R, 'pPrihvat');
    const pPaleta = rt(this.mjestoPalete(0, 0, 0), this.kutOdlaganja(), 'pPaleta');
    const zadnja = this.mjestoPalete(p.nRed - 1, p.nStup - 1, p.nSloj - 1); rt(zadnja, this.kutOdlaganja(), 'zadnje mjesto palete');
    let pOdl = null, pUzmi = null;
    if (uloga !== 'nema') { pOdl = rt(this.mjestoStola('odlozi'), this.kutStola('odlozi') + Math.PI / 2, 'pStolOdlozi'); pUzmi = rt(this.mjestoStola('uzmi'), this.kutStola('uzmi') + Math.PI / 2, 'pStolUzmi'); }
    if (greske.length) return { greske };
    const f = v => (Math.abs(v) < 5e-3 ? 0 : v).toFixed(2), q = v => (+v.toFixed(6)).toString();
    const RT = r => '[[' + r[0].map(f).join(',') + '],[' + r[1].map(q).join(',') + '],[' + r[2].join(',') + '],[9E9,9E9,9E9,9E9,9E9,9E9]]';
    const dom = pomocnik.pocetnaPoza.map(v => (+v.toFixed(2)).toString()).join(',');
    const varijanta = uloga === 'nema' ? 'A: traka -> paleta' : uloga === 'odlaganje' ? 'B: traka -> okretni stol -> paleta' : 'C: okretni stol -> paleta';
    const L = [
      'MODULE FTQ_STANICA',
      '  ! ForTroniQ - paletizacija na stanici, varijanta ' + varijanta + (datum ? ' (' + datum + ')' : ''),
      '  ! Generirano iz postava simulatora: raster ' + p.nRed + ' x ' + p.nStup + ' x ' + p.nSloj + ', korak ' + p.px + ' x ' + p.py + ' mm, sloj ' + p.pz + ' mm.',
      '  ! Signali prema PLC-u: WaitDI DI_1_predmet (predmet spreman), PulseDO DO_1_uzeo, Set/Reset DO_2_spreman' + (uloga !== 'nema' ? ', PulseDO DO_3_stol_indeks, WaitDI DI_2_stol_u_poz' : '') + '.',
      '  ! Tocke pPrihvat i pPaleta su izracunate iz postava; na stvarnom robotu ih treba nauciti (Modify Position, tool0).',
      '  ! ConfL/ConfJ Off: jednostavno uzmi-odlozi, konfiguracija zgloba nije bitna (kao u FTQ_PROBA).',
      '  CONST num nRed:=' + p.nRed + ';',
      '  CONST num nStup:=' + p.nStup + ';',
      '  CONST num nSloj:=' + p.nSloj + ';',
      '  CONST num px:=' + p.px + ';',
      '  CONST num py:=' + p.py + ';',
      '  CONST num pz:=' + p.pz + ';',
      '  CONST num zIznad:=80;',
      '  CONST jointtarget jDoma:=[[' + dom + '],[9E9,9E9,9E9,9E9,9E9,9E9]];',
      '  PERS robtarget pPrihvat:=' + RT(pPrihvat) + ';',
      '  PERS robtarget pPaleta:=' + RT(pPaleta) + ';',
    ];
    if (pOdl) L.push('  PERS robtarget pStolOdlozi:=' + RT(pOdl) + ';', '  PERS robtarget pStolUzmi:=' + RT(pUzmi) + ';');
    L.push('  PERS num nUzeto:=0;', '',
      '  PROC Paletizacija()',
      '    ConfL\\Off;',
      '    ConfJ\\Off;',
      '    MoveAbsJ jDoma,v200,fine,tool0;',
      '    Reset DO_0_gripper;',
      '    Set DO_2_spreman;',
      '    nUzeto:=0;',
      '    FOR k FROM 0 TO nSloj-1 DO',
      '      FOR j FROM 0 TO nStup-1 DO',
      '        FOR i FROM 0 TO nRed-1 DO',
      uloga === 'prihvat' ? '          UzmiSaStola;' : '          Uzmi;',
      ...(uloga === 'odlaganje' ? ['          OdloziNaStol;', '          UzmiSaStola;'] : []),
      '          Odlozi i,j,k;',
      '        ENDFOR',
      '      ENDFOR',
      '    ENDFOR',
      '    Reset DO_2_spreman;',
      '    MoveAbsJ jDoma,v200,fine,tool0;',
      '    TPWrite "Paleta puna, predmeta: "\\Num:=nUzeto;',
      '  ENDPROC', '');
    if (uloga !== 'prihvat') L.push(
      '  PROC Uzmi()',
      '    MoveJ Offs(pPrihvat,0,0,zIznad),v300,z10,tool0;',
      '    WaitDI DI_1_predmet,1;',
      '    MoveL pPrihvat,v100,fine,tool0;',
      '    Set DO_0_gripper;',
      '    WaitTime 0.3;',
      '    MoveL Offs(pPrihvat,0,0,zIznad),v100,fine,tool0;',
      '    PulseDO DO_1_uzeo;',
      '    nUzeto:=nUzeto+1;',
      '  ENDPROC', '');
    if (uloga === 'odlaganje') L.push(
      '  PROC OdloziNaStol()',
      '    WaitDI DI_2_stol_u_poz,1;',
      '    MoveJ Offs(pStolOdlozi,0,0,zIznad),v300,z10,tool0;',
      '    MoveL pStolOdlozi,v100,fine,tool0;',
      '    Reset DO_0_gripper;',
      '    WaitTime 0.3;',
      '    MoveL Offs(pStolOdlozi,0,0,zIznad),v100,fine,tool0;',
      '    PulseDO DO_3_stol_indeks;',
      '    WaitDI DI_2_stol_u_poz,0;',
      '  ENDPROC', '');
    if (uloga !== 'nema') L.push(
      '  PROC UzmiSaStola()',
      '    WaitDI DI_2_stol_u_poz,1;',
      '    MoveJ Offs(pStolUzmi,0,0,zIznad),v300,z10,tool0;',
      '    MoveL pStolUzmi,v100,fine,tool0;',
      '    Set DO_0_gripper;',
      '    WaitTime 0.3;',
      '    MoveL Offs(pStolUzmi,0,0,zIznad),v100,fine,tool0;',
      ...(uloga === 'prihvat' ? ['    PulseDO DO_1_uzeo;', '    nUzeto:=nUzeto+1;', '    PulseDO DO_3_stol_indeks;', '    WaitDI DI_2_stol_u_poz,0;'] : []),
      '  ENDPROC', '');
    L.push(
      '  PROC Odlozi(num i,num j,num k)',
      '    MoveJ Offs(pPaleta,i*px,j*py,k*pz+zIznad),v300,z10,tool0;',
      '    MoveL Offs(pPaleta,i*px,j*py,k*pz),v100,fine,tool0;',
      '    Reset DO_0_gripper;',
      '    WaitTime 0.3;',
      '    MoveL Offs(pPaleta,i*px,j*py,k*pz+zIznad),v100,fine,tool0;',
      '  ENDPROC',
      'ENDMODULE', '');
    return { tekst: L.join('\r\n'), greske: [], ime: 'FTQ_STANICA.mod', varijanta };
  }
}
export { g3, POLJA };
