// kamera.js — kamera Logitech C920 iznad kraja trake: pogled iz kamere (mali prozor u sceni, drugi prolaz
// renderiranja istim rendererom kroz scissor), kalibracijski podaci (poza u KS baze, mm po pikselu na visini trake),
// šahovnica/ravnalo na traci i, po želji, prava kamera preko getUserMedia (bez detekcije — to je sljedeći korak).
import * as THREE from 'three';

const FOV_D = 78, SIRINA = 1920, VISINA = 1080;                 // C920: dijagonalni kut 78°, Full HD
const FOV_H = 2 * Math.atan(Math.tan(FOV_D / 2 * Math.PI / 180) * SIRINA / Math.hypot(SIRINA, VISINA)) * 180 / Math.PI;   // 70,4°
const FOV_V = 2 * Math.atan(Math.tan(FOV_D / 2 * Math.PI / 180) * VISINA / Math.hypot(SIRINA, VISINA)) * 180 / Math.PI;   // 43,3°
const g3 = p => new THREE.Vector3(p[0], p[2], -p[1]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class KameraC920 {
  // o: { renderer, scena, kut (element #scena), stanica, toast }
  constructor(o) {
    Object.assign(this, o);
    this.cam = new THREE.PerspectiveCamera(FOV_V, SIRINA / VISINA, 0.03, 8);
    this.vidljiv = false; this.uzivo = null; this.zadnji = 0;
    // šahovnica 8 × 5 polja po 20 mm na traci ispod kamere (za kalibraciju)
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const c = cv.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) { c.fillStyle = (i + j) % 2 ? '#111' : '#fafafa'; c.fillRect(i * 40, j * 40, 40, 40); }
    c.fillStyle = '#E2341D'; c.fillRect(0, 196, 320, 4); c.font = 'bold 14px sans-serif'; c.fillText('20 mm', 6, 190);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    this.sah = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.10), new THREE.MeshBasicMaterial({ map: tex })); this.sah.rotation.x = -Math.PI / 2; this.sah.visible = false; this.scena.add(this.sah);
    // prozor u sceni
    this.el = document.createElement('div'); this.el.className = 'kam-prozor'; this.el.hidden = true;
    this.el.innerHTML = '<div class="kam-glava"><b>Pogled kamere · C920</b><span class="kam-gumbi"><button type="button" data-kam="sah" aria-pressed="false" title="Šahovnica 20 mm na traci">Šahovnica</button><button type="button" data-kam="uzivo" aria-pressed="false">Prava kamera (C920)</button><button type="button" data-kam="zatvori" aria-label="Zatvori">×</button></span></div><div class="kam-slika"><video playsinline muted autoplay hidden></video><div class="kam-kriz"></div><div class="kam-mjera"><i></i><span></span></div><p class="kam-poruka" hidden></p></div><pre class="kam-kal"></pre>';
    this.kut.appendChild(this.el);
    this.video = this.el.querySelector('video');
    this.el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-kam]'); if (!b) return; const k = b.dataset.kam; if (k === 'zatvori') this.prikazi(false); if (k === 'sah') { this.sah.visible = !this.sah.visible; b.setAttribute('aria-pressed', String(this.sah.visible)); this.stanica.P.kamera.sahovnica = this.sah.visible; } if (k === 'uzivo') this.uzivoToggle(b); });
  }
  prikazi(v) { this.vidljiv = v; this.el.hidden = !v; this.stanica.P.kamera.vidljiva = v; if (!v) this.sah.visible = false, this.el.querySelector('[data-kam="sah"]').setAttribute('aria-pressed', 'false'); if (!v && this.uzivo) this.uzivoToggle(this.el.querySelector('[data-kam="uzivo"]')); }
  // geometrija: položaj i smjer iz stanice (stup iznad kraja trake)
  osvjezi() {
    const kp = this.stanica.kamPoza; if (!kp) return;
    this.cam.position.copy(g3(kp.p)); this.cam.up.copy(g3(kp.gore).multiplyScalar(-1)); this.cam.lookAt(g3([kp.p[0] + kp.os[0], kp.p[1] + kp.os[1], kp.p[2] + kp.os[2]]));
    const t = this.stanica.P.traka, k = this.stanica.P.kamera, L = t.L / 1000;
    const pod = this.stanica.tockaTrake(L + k.uzduz / 1000 - Math.tan(k.nagib * Math.PI / 180) * k.h / 1000, 0, 0.0006);
    this.sah.position.copy(g3(pod)); this.sah.rotation.set(-Math.PI / 2, 0, t.psi * Math.PI / 180);
    const D = k.h / 1000 / Math.cos(k.nagib * Math.PI / 180);                 // udaljenost po optičkoj osi do plohe trake
    const sirinaMm = 2 * D * Math.tan(FOV_H / 2 * Math.PI / 180) * 1000, mmPx = sirinaMm / SIRINA;
    this.kal = { D, sirinaMm, mmPx, visinaMm: 2 * D * Math.tan(FOV_V / 2 * Math.PI / 180) * 1000 };
    const w = this.el.querySelector('.kam-slika').clientWidth || 320;
    const txt = 'Poza kamere u KS baze: X ' + (kp.p[0] * 1000).toFixed(0) + ', Y ' + (kp.p[1] * 1000).toFixed(0) + ', Z ' + (kp.p[2] * 1000).toFixed(0) + ' mm · nagib ' + k.nagib + '° · optička os prema traci' +
      '\nC920: ' + SIRINA + ' × ' + VISINA + ' px, kut ' + FOV_H.toFixed(1) + '° × ' + FOV_V.toFixed(1) + '° (dijag. 78°)' +
      '\nUdaljenost do trake ' + (D * 1000).toFixed(0) + ' mm → vidno polje ' + sirinaMm.toFixed(0) + ' × ' + this.kal.visinaMm.toFixed(0) + ' mm' +
      '\n1 px = ' + mmPx.toFixed(3) + ' mm na visini trake (Full HD); pregled ' + w + ' px: 1 px = ' + (sirinaMm / w).toFixed(2) + ' mm';
    const pre = this.el.querySelector('.kam-kal'); if (pre.textContent !== txt) pre.textContent = txt;
    const m = this.el.querySelector('.kam-mjera'); m.querySelector('i').style.width = (50 / (sirinaMm / w)).toFixed(1) + 'px'; m.querySelector('span').textContent = '50 mm';
  }
  // crtanje nakon glavnog prolaza: scissor u donji lijevi kut platna scene
  crtaj(sad) {
    if (!this.vidljiv || this.uzivo) return;
    if (sad - this.zadnji < 80) return; this.zadnji = sad;
    this.osvjezi();
    const r = this.renderer, W = this.kut.clientWidth, H = this.kut.clientHeight;
    const sl = this.el.querySelector('.kam-slika'), rect = sl.getBoundingClientRect(), kr = this.kut.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height), x = Math.round(rect.left - kr.left), y = Math.round(H - (rect.bottom - kr.top));
    if (w < 10 || h < 10) return;
    r.setScissorTest(true); r.setScissor(x, y, w, h); r.setViewport(x, y, w, h);
    r.setClearColor(0x1b2226, 1); r.clear(); r.render(this.scena, this.cam);
    r.setClearColor(0x000000, 0); r.setScissorTest(false); r.setViewport(0, 0, W, H);
  }
  async uzivoToggle(b) {
    const por = this.el.querySelector('.kam-poruka');
    if (this.uzivo) { try { this.uzivo.getTracks().forEach(t => t.stop()); } catch (e) { /* */ } this.uzivo = null; this.video.hidden = true; this.video.srcObject = null; b.setAttribute('aria-pressed', 'false'); por.hidden = true; return; }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('getUserMedia nije dostupan');
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: SIRINA }, height: { ideal: VISINA } }, audio: false });
      this.uzivo = s; this.video.srcObject = s; this.video.hidden = false; b.setAttribute('aria-pressed', 'true'); por.hidden = true;
      this.toast && this.toast('Prava kamera uključena: slika uživo, bez detekcije (sljedeći korak).');
    } catch (e) {
      por.textContent = 'Prava kamera nije dostupna: ' + (e && e.message ? e.message : e) + '. Dopusti kameru u pregledniku ili spoji C920; stranica mora biti na https ili localhost.'; por.hidden = false;
      setTimeout(() => { por.hidden = true; }, 6000);
    }
  }
  stanje() { return { vidljiv: this.vidljiv, uzivo: !!this.uzivo, sahovnica: this.sah.visible, kal: this.kal || null, fov: [+FOV_H.toFixed(2), +FOV_V.toFixed(2)] }; }
}
