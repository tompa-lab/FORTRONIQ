// FORTRONIQ · CO₂ laser · 3D crtež strojeva G.Weike LG500DM i LC1390N (three.js)
// Crtano prema fotografijama strojeva; mjere kućišta su procjena, radna polja su iz specifikacije.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const BIJELA = 0xEEF0F0, SIVA_T = 0x3B4247, SIVA = 0x7C868C, CRNA = 0x15191B, PLAVA = 0x1F5FB0, STAKLO = 0x1E2A30;
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.08 }, o));
function kutija(w, h, d, m, x, y, z, rod) { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); rod.add(g); return g; }
function zaobljeni(w, h, r, d, m) { // zaobljeni pravokutnik u ravnini YZ (bočne kape LC1390N), izvučen po X
  const s = new THREE.Shape(); const x0 = -w / 2, y0 = 0, x1 = w / 2, y1 = h;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 });
  g.rotateY(Math.PI / 2); g.translate(-d / 2, 0, 0);
  return new THREE.Mesh(g, m);
}

function okvirPoklopca(w, d, s, h, m, mS, rod) { // okvir poklopca + staklo (z od šarke prema naprijed)
  kutija(w, h, s, m, 0, 0, s / 2, rod); kutija(w, h, s, m, 0, 0, d - s / 2, rod);
  kutija(s, h, d - 2 * s, m, -w / 2 + s / 2, 0, d / 2, rod); kutija(s, h, d - 2 * s, m, w / 2 - s / 2, 0, d / 2, rod);
  kutija(w - 2 * s + 20, 4, d - 2 * s + 20, mS, 0, h / 2 - 3, d / 2, rod);
}
export class Stroj3D {
  constructor(el) {
    this.el = el;
    this.r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(this.r.domElement);
    this.scena = new THREE.Scene();
    this.kam = new THREE.PerspectiveCamera(32, 1, 5, 40000);
    this.kon = new OrbitControls(this.kam, this.r.domElement);
    this.kon.enableDamping = true; this.kon.maxPolarAngle = Math.PI * 0.495;
    this.scena.add(new THREE.HemisphereLight(0xffffff, 0x6d7478, 1.25));
    const s = new THREE.DirectionalLight(0xffffff, 1.6); s.position.set(1200, 2600, 1800); this.scena.add(s);
    const s2 = new THREE.DirectionalLight(0xffffff, 0.45); s2.position.set(-1500, 900, -1200); this.scena.add(s2);
    const pod = new THREE.Mesh(new THREE.CircleGeometry(4200, 48), mat(0x9aa4a9, { transparent: true, opacity: 0.18, roughness: 1 }));
    pod.rotation.x = -Math.PI / 2; this.scena.add(pod);
    this.stroj = null; this.tip = null;
    new ResizeObserver(() => this.velicina()).observe(el);
    this.velicina();
    const petlja = () => { this.kon.update(); this.azuriraj(); this.r.render(this.scena, this.kam); requestAnimationFrame(petlja); };
    requestAnimationFrame(petlja);
  }
  velicina() { const w = this.el.clientWidth || 600, h = this.el.clientHeight || 400; this.r.setSize(w, h, false); this.kam.aspect = w / h; this.kam.updateProjectionMatrix(); }

  postavi(tip) {
    if (this.stroj) { this.scena.remove(this.stroj); this.stroj.traverse(o => { o.geometry?.dispose?.(); }); }
    this.tip = tip;
    const G = new THREE.Group(); this.stroj = G; this.scena.add(G);
    const lc = tip === 'LC1390N';
    // radno polje i položaj u prostoru
    const W = lc ? 1300 : 500, D = lc ? 900 : 300;
    this.W = W; this.D = D;
    const visinaStola = lc ? 760 : 700; // visina saćastog stola od poda (procjena)
    this.visinaStola = visinaStola;
    this.ox = -W / 2; this.oz = D / 2; // stroj X → x = ox + X ; stroj Y → z = oz − Y
    const mB = mat(BIJELA, { roughness: 0.4 }), mT = mat(SIVA_T), mS = mat(SIVA), mC = mat(CRNA), mP = mat(PLAVA);
    const mStaklo = mat(0x7a5a2a, { transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.1, depthWrite: false });
    this.gornjiRub = 0;
    if (lc) {
      // bočne kape (bijele, zaobljene), donji tamni paneli s plavom trakom, poklopac s velikim prozorom
      const dub = 1420, sir = 1900, kapa = 230, h = 1080;
      for (const sx of [-1, 1]) { const k = zaobljeni(dub, h, 70, kapa, mB); k.position.set(sx * (sir / 2 - kapa / 2), 90, 0); G.add(k); kutija(kapa - 20, 90, dub - 140, mC, sx * (sir / 2 - kapa / 2), 45, 0, G); }
      const sred = sir - 2 * kapa;
      kutija(sred, 640, 40, mT, 0, 90 + 320, dub / 2 - 20, G); // prednji donji panel
      kutija(sred, 34, 44, mP, 0, 90 + 600, dub / 2 - 18, G); // plava traka
      kutija(sred, 640, 40, mT, 0, 90 + 320, -dub / 2 + 20, G);
      kutija(sred, 40, dub, mT, 0, 90 + 20, 0, G);
      kutija(sred, 130, 40, mB, 0, 90 + 700, dub / 2 - 20, G); // prednja letvica ispod poklopca
      kutija(sred, 260, 180, mB, 0, 90 + 860, -dub / 2 + 90, G); // stražnji dio (cijev)
      kutija(sred, 60, 60, mC, 0, 90 + 30, dub / 2 - 60, G);
      this.gornjiRub = 90 + 770;
      // poklopac: šarka straga
      const pok = new THREE.Group(); pok.position.set(0, 90 + 990, -dub / 2 + 180); G.add(pok);
      const dp = dub - 200;
      okvirPoklopca(sred - 10, dp, 60, 18, mat(SIVA_T, { roughness: 0.3 }), mStaklo, pok);
      kutija(sred - 10, 200, 18, mat(SIVA_T), 0, -100, dp, pok); // prednja stranica poklopca
      kutija(sred - 160, 140, 4, mStaklo, 0, -90, dp + 10, pok);
      kutija(500, 16, 30, mC, 0, -40, dp + 26, pok); // ručka
      this.poklopacG = pok; this.poklopacMax = -1.2;
      // kontrolno polje gore desno (na desnoj kapi)
      const kp = new THREE.Group(); kp.position.set(sir / 2 - kapa / 2, 90 + h - 2, dub / 2 - 260); G.add(kp);
      kutija(kapa - 30, 6, 360, mat(0xD9DEE0), 0, 0, 0, kp);
      this.pad3d = this.ploca(kp, 0.32, -40); kp.rotation.x = 0;
      // hladnjak CW-5000 i PC (procjena položaja prema fotografiji)
      kutija(300, 520, 420, mB, -sir / 2 - 300, 260, 300, G);
      this.hladnjakLED = kutija(60, 26, 6, mat(0x22aa55, { emissive: 0x22aa55, emissiveIntensity: 0.6 }), -sir / 2 - 300, 470, 513, G);
      kutija(60, 600, 60, mC, sir / 2 + 260, 300, -200, G); kutija(520, 30, 380, mT, sir / 2 + 260, 620, -200, G);
      kutija(480, 320, 40, mC, sir / 2 + 260, 830, -330, G); kutija(440, 280, 6, mat(0x2a6f7a, { emissive: 0x1b4f57, emissiveIntensity: 0.6 }), sir / 2 + 260, 830, -308, G);
    } else {
      // LG500DM: stolni tip — bijeli ormar s vratima, sivi prednji pojas s upravljanjem, rešetka, bijeli gornji okvir, poklopac sa staklom
      const sir = 1080, dub = 760;
      kutija(sir, 560, dub, mB, 0, 80 + 280, 0, G);
      kutija(sir - 40, 500, 6, mat(0xF6F7F7), 0, 80 + 280, dub / 2 + 2, G);
      kutija(4, 480, 8, mS, 0, 80 + 280, dub / 2 + 4, G);
      for (const sx of [-1, 1]) kutija(60, 80, 60, mC, sx * (sir / 2 - 50), 40, dub / 2 - 50, G), kutija(60, 80, 60, mC, sx * (sir / 2 - 50), 40, -dub / 2 + 50, G);
      kutija(sir, 70, 24, mT, 0, 640 + 35, dub / 2 - 12, G); // rešetka (sprijeda)
      for (let i = 0; i < 38; i++) kutija(14, 40, 4, mat(0x1c2124), -sir / 2 + 40 + i * 26.6, 675, dub / 2 + 1, G);
      kutija(sir, 140, 24, mT, 0, 710 + 70, dub / 2 - 12, G); // sivi pojas s upravljanjem
      kutija(sir, 280, 24, mT, 0, 640 + 140, -dub / 2 + 12, G); // stražnja stijenka
      for (const sx of [-1, 1]) kutija(24, 280, dub, mT, sx * (sir / 2 - 12), 640 + 140, 0, G); // bočne stijenke
      // gornji bijeli okvir oko otvora
      kutija(sir, 70, 90, mB, 0, 885, dub / 2 - 45, G); kutija(sir, 70, 90, mB, 0, 885, -dub / 2 + 45, G);
      for (const sx of [-1, 1]) kutija(150, 70, dub, mB, sx * (sir / 2 - 75), 885, 0, G);
      this.gornjiRub = 850;
      const pok = new THREE.Group(); pok.position.set(0, 920, -dub / 2 + 20); G.add(pok);
      okvirPoklopca(sir - 10, dub - 40, 100, 36, mB, mStaklo, pok);
      kutija(260, 12, 26, mC, 0, 0, dub - 30, pok);
      this.poklopacG = pok; this.poklopacMax = -1.05;
      // odsis s desne strane, cijev
      kutija(380, 230, 300, mS, sir / 2 + 200, 760, -120, G);
      // upravljanje na sivom pojasu desno
      const kp = new THREE.Group(); kp.position.set(sir / 2 - 200, 780, dub / 2 + 1); G.add(kp);
      this.pad3d = this.ploca(kp, 0.25, 0, true);
      // hladnjak CW3000
      kutija(240, 380, 300, mB, -sir / 2 - 220, 190, 200, G);
      this.hladnjakLED = kutija(50, 20, 6, mat(0x22aa55, { emissive: 0x22aa55, emissiveIntensity: 0.6 }), -sir / 2 - 220, 330, 352, G);
    }
    // ── unutrašnjost: saćasti stol, portal, glava ──
    const Gs = new THREE.Group(); G.add(Gs); this.unutra = Gs;
    const saceTx = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#5c6366'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#a9b1b5'; x.lineWidth = 2; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const cx = i * 32 + (j % 2) * 16, cy = j * 28; x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; x.lineTo(cx + 15 * Math.cos(a), cy + 15 * Math.sin(a)); } x.closePath(); x.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 30, D / 30); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    this.stol = new THREE.Group(); Gs.add(this.stol);
    kutija(W + 60, 20, D + 60, mat(0x4a5054), 0, -10, 0, this.stol);
    const sace = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0xffffff, { map: saceTx, roughness: 0.9 })); sace.rotation.x = -Math.PI / 2; sace.position.y = 0.6; this.stol.add(sace);
    this.stol.position.y = this.visinaStola;
    // materijal (ploča) s teksturom izgaranja
    this.ploca3d = null; this.platnoT = document.createElement('canvas');
    // portal: tračnice lijevo/desno, greda po X, glava
    const visGreda = this.visinaStola + (lc ? 251 : 101);
    this.visGlave = visGreda;
    for (const sx of [-1, 1]) kutija(30, 40, D + 160, mat(0x9aa2a6, { metalness: 0.5 }), sx * (W / 2 + 60), visGreda + 20, 0, Gs);
    this.greda = new THREE.Group(); Gs.add(this.greda);
    kutija(W + 160, 46, 60, mat(0xB8C0C4, { metalness: 0.45, roughness: 0.35 }), 0, visGreda + 30, 0, this.greda);
    if (lc) kutija(W + 120, 20, 30, mat(0x222222), 0, visGreda + 48, -40, this.greda); // lančani vodič
    this.glava = new THREE.Group(); this.greda.add(this.glava);
    kutija(70, 90, 70, mat(0xC9CED1, { metalness: 0.4 }), 0, visGreda + 40, 40, this.glava);
    const cijev = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 60, 20), mat(0xD4B24A, { metalness: 0.7, roughness: 0.3 })); cijev.position.set(0, visGreda - 20, 40); this.glava.add(cijev);
    const mlaz = new THREE.Mesh(new THREE.ConeGeometry(11, 26, 20), mat(0xB89A3C, { metalness: 0.7, roughness: 0.3 })); mlaz.rotation.x = Math.PI; mlaz.position.set(0, visGreda - 63, 40); this.glava.add(mlaz);
    this.vrhMlaza = visGreda - 76; // visina vrha mlaznice od poda
    this.lecaY = visGreda - 10; // ravnina leće (procjena)
    if (lc) { const ms = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 28, 8), mat(0x333333)); ms.position.set(22, visGreda - 70, 40); this.glava.add(ms); this.mikro = ms; } // mikroprekidač autofokusa
    // crveni pokazivač i sjaj reza
    this.tocka = new THREE.Mesh(new THREE.CircleGeometry(2.6, 16), new THREE.MeshBasicMaterial({ color: 0xff2020 })); this.tocka.rotation.x = -Math.PI / 2; Gs.add(this.tocka);
    this.sjaj = new THREE.Mesh(new THREE.SphereGeometry(5, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.9 })); Gs.add(this.sjaj);
    this.snop = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 3.4, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); Gs.add(this.snop);
    this.svjetlo = new THREE.PointLight(0xffffff, 0, 2600, 1.2); this.svjetlo.position.set(0, this.visinaStola + 320, 0); Gs.add(this.svjetlo);
    this.iskra = new THREE.PointLight(0xffa040, 0, 400, 2); Gs.add(this.iskra);
    // rotacijski dodatak (4 kotačića) i valjak
    this.rot = new THREE.Group(); this.rot.visible = false; this.stol.add(this.rot);
    this.stanje = { X: W, Y: D, Z: 0, laser: false, snaga: 0, poklopac: 0, ciljPoklopac: 0 };
    this.materijal(null);
    this.pogled('koso');
  }

  // PAD03 i upravljačko polje kao tekstura na 3D modelu (crtano iz HTML-a ploče: samo naznaka)
  ploca(rod, mj, dz, okomito = false) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(512 * mj * 1.6, 256 * mj * 1.6), new THREE.MeshBasicMaterial({ map: t }));
    if (okomito) m.position.set(0, 0, 2); else { m.rotation.x = -Math.PI / 2 + 0.25; m.position.set(0, 26, dz); }
    rod.add(m);
    return { c, x, t };
  }
  crtajPlocu(lcdRetci, napon) {
    if (!this.pad3d) return;
    const { x, t } = this.pad3d;
    x.fillStyle = '#C9CDCF'; x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#2B2F31'; x.fillRect(14, 30, 250, 150);
    x.fillStyle = napon ? '#B9D84A' : '#59642E'; x.fillRect(24, 40, 230, 130);
    x.fillStyle = '#1D2A0E'; x.font = 'bold 22px monospace';
    if (napon) lcdRetci.forEach((r, i) => x.fillText(r.slice(0, 16), 32, 70 + i * 28));
    x.fillStyle = '#9FB8A6'; for (const [a, b] of [[300, 40], [360, 40], [420, 40], [360, 96], [300, 96], [420, 96], [360, 150]]) x.fillRect(a, b, 50, 44);
    for (let i = 0; i < 6; i++) x.fillRect(20 + i * 82, 200, 64, 40);
    t.needsUpdate = true;
  }

  materijal(m) { // m: {boja, T, rub} ili null (prazan stol)
    if (this.ploca3d) { this.stol.remove(this.ploca3d); this.ploca3d.geometry.dispose(); }
    this.ploca3d = null; this.T = m ? m.T : 0; this.matInfo = m;
    if (!m || this.rot.visible) return;
    const kx = 2048 / Math.max(this.W, this.D);
    this.platnoT.width = Math.round(this.W * kx); this.platnoT.height = Math.round(this.D * kx); this.kx = kx;
    const x = this.platnoT.getContext('2d'); x.fillStyle = m.boja2d; x.fillRect(0, 0, this.platnoT.width, this.platnoT.height);
    if (m.zrnato) { x.globalAlpha = 0.07; x.strokeStyle = '#7a5a30'; for (let i = 0; i < 260; i++) { x.beginPath(); const y = Math.random() * this.platnoT.height; x.moveTo(0, y); x.bezierCurveTo(this.platnoT.width * 0.3, y + 8, this.platnoT.width * 0.6, y - 8, this.platnoT.width, y + 3); x.stroke(); } x.globalAlpha = 1; }
    this.texT = new THREE.CanvasTexture(this.platnoT); this.texT.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.BoxGeometry(this.W, m.T, this.D);
    const bok = mat(new THREE.Color(m.boja2d).multiplyScalar(0.8).getHex(), { roughness: 0.85 });
    const vrh = mat(0xffffff, { map: this.texT, roughness: 0.85, transparent: !!m.proziran, opacity: m.proziran ? 0.75 : 1 });
    this.ploca3d = new THREE.Mesh(geo, [bok, bok, vrh, bok, bok, bok]);
    this.ploca3d.position.y = m.T / 2 + 0.7; this.stol.add(this.ploca3d);
  }
  ocisti() { if (this.matInfo) this.materijal(this.matInfo); if (this.rot.visible) this.rotacija(true, this.rotD, this.matInfo); }
  // spali odsječak (koordinate stroja, mm); jacina 0..1; kroz: prorezano
  spali(x0, y0, x1, y1, sir, jacina, kroz) {
    if (this.rot.visible) return this.spaliValjak(x0, y0, x1, y1, sir, jacina);
    if (!this.ploca3d) return;
    const x = this.platnoT.getContext('2d'), k = this.kx, H = this.platnoT.height;
    const m = this.matInfo;
    x.strokeStyle = kroz ? (m.rezKroz || '#1b0f06') : (m.rezPola || '#6b4423');
    x.globalAlpha = kroz ? 1 : Math.max(0.3, Math.min(0.65, jacina));
    x.lineWidth = Math.max(2.4, sir * k); x.lineCap = 'round';
    x.beginPath(); x.moveTo(x0 * k, H - y0 * k); x.lineTo(x1 * k, H - y1 * k); x.stroke(); x.globalAlpha = 1;
    this.texT.needsUpdate = true;
  }
  rotacija(on, d = 80, m = null) {
    this.rot.visible = on; this.rotD = d;
    while (this.rot.children.length) this.rot.remove(this.rot.children[0]);
    if (!on) { this.materijal(this.matInfo); this.stol.position.y = this.visinaStola; return; }
    if (this.ploca3d) { this.stol.remove(this.ploca3d); this.ploca3d = null; }
    const r = d / 2, Lv = Math.min(220, this.W * 0.5), cx = 0, cz = 0;
    const mO = mat(0x2f3437), mK = mat(0x111111, { roughness: 0.9 });
    kutija(Lv + 160, 30, 150, mO, cx, 15, cz, this.rot);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 18, 24), mK); k.rotation.z = Math.PI / 2; k.position.set(cx + sx * (Lv / 2 - 20), 52, cz + sz * (r * 0.62 + 10)); this.rot.add(k); }
    kutija(40, 60, 40, mat(0x6d757a), cx + Lv / 2 + 70, 60, cz, this.rot);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; this.platnoR = c;
    const xx = c.getContext('2d'); xx.fillStyle = '#8fb3bb'; xx.fillRect(0, 0, 1024, 512);
    this.texR = new THREE.CanvasTexture(c); this.texR.colorSpace = THREE.SRGBColorSpace;
    const valjak = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Lv, 64, 1, true), mat(0xffffff, { map: this.texR, transparent: true, opacity: 0.85, roughness: 0.15, side: THREE.DoubleSide }));
    valjak.rotation.z = Math.PI / 2; const v = new THREE.Group(); v.position.set(cx, 52 + Math.sqrt(Math.max(0, (22 + r) ** 2 - (r * 0.62 + 10) ** 2)), cz); v.add(valjak); this.rot.add(v);
    this.valjak = v; this.valjakL = Lv; this.valjakR = r;
    this.stol.position.y = this.visinaStola;
  }
  spaliValjak(x0, y0, x1, y1, sir, jacina) {
    if (!this.platnoR) return;
    const x = this.platnoR.getContext('2d'), opseg = 2 * Math.PI * this.valjakR;
    const u = X => (X - this.rotX0) / this.valjakL * 1024 + 512, v = Y => (((Y / opseg) % 1) + 1) % 1 * 512;
    x.strokeStyle = '#ffffff'; x.globalAlpha = Math.min(1, 0.5 + jacina); x.lineWidth = Math.max(2.5, sir / opseg * 512); x.lineCap = 'round';
    const a = v(y0), b = v(y1); x.beginPath(); x.moveTo(u(x0), a); x.lineTo(u(x1), Math.abs(b - a) > 256 ? a : b); x.stroke(); x.globalAlpha = 1;
    this.texR.needsUpdate = true;
  }
  // položaj glave (mm stroja), laser, snaga 0..100
  postaviGlavu(X, Y, laser, snaga, rotY = null) {
    const s = this.stanje; s.X = X; s.Y = Y; s.laser = laser; s.snaga = snaga; s.rotY = rotY;
  }
  postaviZ(z) { this.stanje.Z = z; }
  poklopac(otvoren) { this.stanje.ciljPoklopac = otvoren ? 1 : 0; }
  svjetloUnutra(on) { this.svjetlo.intensity = on ? 2.2 : 0; }
  hladnjak(on, alarm = false) { if (!this.hladnjakLED) return; const c = !on ? 0x333333 : alarm ? 0xdd3322 : 0x22aa55; this.hladnjakLED.material.color.setHex(c); this.hladnjakLED.material.emissive.setHex(on ? c : 0); }
  azuriraj() {
    if (!this.stroj) return;
    const s = this.stanje;
    s.poklopac += (s.ciljPoklopac - s.poklopac) * 0.12;
    this.poklopacG.rotation.x = this.poklopacMax * s.poklopac;
    // Z (LC1390N): stol se diže/spušta; s = pomak od donjeg položaja
    if (this.tip === 'LC1390N') this.stol.position.y = this.visinaStola + s.Z;
    const rotOn = this.rot.visible;
    const X = s.X, Y = rotOn ? this.rotYglave ?? this.D / 2 : s.Y;
    this.greda.position.z = this.oz - Y - 40;
    this.glava.position.x = this.ox + X;
    const vrh = this.stol.position.y + (rotOn ? (this.valjak.position.y + this.valjakR) : this.T + 0.8);
    const px = this.ox + X, pz = this.oz - Y;
    this.tocka.position.set(px - 8, vrh + 0.3, pz); this.tocka.visible = !s.laser;
    this.sjaj.position.set(px, vrh + 1, pz); this.sjaj.visible = s.laser;
    const sk = 0.6 + s.snaga / 100; this.sjaj.scale.setScalar(sk);
    const h = Math.max(1, this.vrhMlaza - vrh); this.snop.scale.set(1, h, 1); this.snop.position.set(px, vrh + h / 2, pz); this.snop.visible = s.laser;
    this.iskra.position.set(px, vrh + 10, pz); this.iskra.intensity = s.laser ? 1.5 + s.snaga / 40 : 0;
    if (rotOn && this.valjak) { this.valjak.rotation.x = -(s.rotY || 0) / this.valjakR; this.rotX0 = this.W / 2; }
  }
  // razmak vrh materijala → vrh mlaznice (za autofokus i provjeru fokusa)
  razmakZa(Z) { return this.vrhMlaza - (this.visinaStola + (this.tip === 'LC1390N' ? Z : 0) + (this.rot.visible ? this.valjak.position.y + this.valjakR : this.T + 0.8)); }
  razmakDoMlaznice() { const vrh = this.stol.position.y + (this.rot.visible ? this.valjak.position.y + this.valjakR : this.T + 0.8); return this.vrhMlaza - vrh; }
  pogled(v) {
    const cy = this.visinaStola || 800, r = this.tip === 'LC1390N' ? 3900 : 2500;
    this.kon.target.set(0, cy, 0);
    if (v === 'sprijeda') this.kam.position.set(0, cy + r * 0.25, r * 1.15);
    else if (v === 'odozgo') this.kam.position.set(0, cy + r * 1.3, 1);
    else if (v === 'glava') { const g = new THREE.Vector3(); this.glava.getWorldPosition(g); this.kon.target.set(this.ox + this.stanje.X, cy, this.oz - this.stanje.Y); const yy = this.rot.visible ? this.D / 2 : this.stanje.Y; this.kon.target.set(this.ox + this.stanje.X, cy, this.oz - yy); this.kam.position.set(this.ox + this.stanje.X + 140, cy + 640, this.oz - yy + 330); }
    else this.kam.position.set(r * 0.62, cy + r * 0.55, r * 0.9);
    this.kon.update();
  }
}
