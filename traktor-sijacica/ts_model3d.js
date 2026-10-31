/* FORTRONIQ · Traktor s GPS navigacijom i sijačicom — 3D prikaz (three.js), u metrima.
   Os x uzduž prohoda (traktor vozi prema +x), z poprijeko. Prikazan je isječak parcele s dva prohoda i spojem između njih;
   razmak na spoju mijenja se prema odabranoj korekciji (tipično odstupanje, ne slučajno). Svaka mreža nosi userData.dio. © ForTroniQ d.o.o. */
import { P } from './ts_podaci.js';

export function napraviModel(THREE) {
  const grupa = new THREE.Group();
  const mat = (boja, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: boja, roughness: 0.75, metalness: 0.08 }, o));
  function dodaj(mesh, dio, roditelj = grupa) {
    mesh.userData.dio = dio;
    mesh.material = mesh.material.clone();
    mesh.userData.osnovna = mesh.material.emissive ? mesh.material.emissive.getHex() : 0;
    roditelj.add(mesh);
    return mesh;
  }
  const kutija = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const valjak = (r, h, m, n = 18) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m);
  const Z = P.zahvat;   /* 4,2 m */

  /* parcela: tlo, uvratina na istoku, zone tla (prozirne plohe) */
  const tlo = dodaj(new THREE.Mesh(new THREE.PlaneGeometry(160, 70), mat(0x7b5f45, { roughness: 1 })), 'parcela');
  tlo.rotation.x = -Math.PI / 2;
  const uvr = dodaj(new THREE.Mesh(new THREE.PlaneGeometry(P.uvratina, 70), mat(0x8b6d50, { roughness: 1 })), 'parcela');
  uvr.rotation.x = -Math.PI / 2; uvr.position.set(80 - P.uvratina / 2, 0.01, 0);
  const trava = new THREE.Mesh(new THREE.PlaneGeometry(500, 400), mat(0x8fae7a, { roughness: 1 })); trava.rotation.x = -Math.PI / 2; trava.position.y = -0.03; grupa.add(trava);
  [['A', 0x2e8b57, -40, -18], ['B', 0xc2a23a, 30, -18], ['C', 0xc26a3a, 0, 22]].forEach(([, b, x, z], i) => {
    const pl = dodaj(new THREE.Mesh(new THREE.PlaneGeometry(i === 2 ? 160 : 80, i === 2 ? 26 : 44), new THREE.MeshBasicMaterial({ color: b, transparent: true, opacity: 0.13, depthWrite: false })), 'zone');
    pl.rotation.x = -Math.PI / 2; pl.position.set(x, 0.02, z);
  });

  /* AB linija i redovi: prohod 1 (gotov, z < 0) i prohod 2 (sije se, z > 0) */
  const ab = dodaj(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-80, 0.04, -Z / 2), new THREE.Vector3(80, 0.04, -Z / 2)]), new THREE.LineDashedMaterial({ color: 0x17656e, dashSize: 2, gapSize: 1.2 })), 'terminal');
  ab.computeLineDistances();
  const redMat = mat(0x4b3626, { roughness: 1 });
  const red = (x0, x1, z, roditelj = grupa) => { const g = dodaj(kutija(x1 - x0, 0.03, 0.12, redMat), 'sijacica', roditelj); g.position.set((x0 + x1) / 2, 0.02, z); return g; };
  for (let r = 0; r < 6; r++) red(-80, 80 - P.uvratina, -Z + (r + 0.5) * P.razmakRed);
  const prohod2 = new THREE.Group(); grupa.add(prohod2);
  for (let r = 0; r < 6; r++) red(-80, -4.2, (r + 0.5) * P.razmakRed, prohod2);
  /* oznaka spoja */
  const spoj = dodaj(kutija(30, 0.02, 0.03, new THREE.MeshBasicMaterial({ color: 0xd46a1a })), 'marker'); spoj.position.set(-30, 0.05, 0);

  /* traktor (vozi prema +x, sredina iznad z = Z/2) */
  const tr = new THREE.Group(); tr.position.set(0, 0, Z / 2); grupa.add(tr);
  const zel = mat(0x2f7d3a, { roughness: 0.5 }), crna = mat(0x1d1f21, { roughness: 0.9 }), metal = mat(0xb7c0c6, { metalness: 0.6, roughness: 0.4 });
  const hauba = dodaj(kutija(2.4, 1.1, 1.0, zel), 'traktor', tr); hauba.position.set(1.4, 1.35, 0);
  const sasija = dodaj(kutija(3.8, 0.4, 0.9, crna), 'traktor', tr); sasija.position.set(0.6, 0.8, 0);
  const kab = dodaj(kutija(1.6, 1.5, 1.5, mat(0xbfe3ea, { transparent: true, opacity: 0.35, roughness: 0.1 })), 'traktor', tr); kab.position.set(-0.6, 2.35, 0);
  const krov = dodaj(kutija(1.8, 0.12, 1.7, zel), 'traktor', tr); krov.position.set(-0.6, 3.15, 0);
  [[-1.0, 0.9, 0.95, 0.55], [1.9, 0.55, 0.85, 0.4]].forEach(([x, r, z, s]) => [-1, 1].forEach((sz) => { const k = dodaj(valjak(r, s, crna, 24), 'traktor', tr); k.rotation.x = Math.PI / 2; k.position.set(x, r, sz * z); }));
  const ant = dodaj(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2f2f2)), 'antena', tr); ant.position.set(-0.3, 3.21, 0);
  const antP = dodaj(valjak(0.17, 0.05, mat(0xf2f2f2)), 'antena', tr); antP.position.set(-0.3, 3.23, 0);
  const term = dodaj(kutija(0.06, 0.24, 0.32, mat(0x15191c)), 'terminal', tr); term.position.set(-0.05, 2.25, 0.45); term.rotation.y = -0.4;
  const volan = dodaj(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), crna), 'autopilot', tr); volan.position.set(0.0, 2.05, 0); volan.rotation.y = Math.PI / 2; volan.rotation.x = 0.5;
  const motorV = dodaj(valjak(0.09, 0.12, mat(0xd46a1a)), 'autopilot', tr); motorV.position.set(0.05, 1.93, 0); motorV.rotation.z = 0.5;

  /* sijačica (iza traktora) */
  const sij = new THREE.Group(); sij.position.set(-3.6, 0, 0); tr.add(sij);
  const greda = dodaj(kutija(0.25, 0.25, Z + 0.2, metal), 'sijacica', sij); greda.position.set(0, 0.9, 0);
  const vuca = dodaj(kutija(1.3, 0.15, 0.15, metal), 'sijacica', sij); vuca.position.set(1.05, 0.85, 0);
  const vent = dodaj(valjak(0.32, 0.25, mat(0xd8d8d8)), 'sijacica', sij); vent.rotation.z = Math.PI / 2; vent.position.set(0.25, 1.35, 0);
  for (let r = 0; r < 6; r++) {
    const z = (r - 2.5) * P.razmakRed;
    const okvirS = dodaj(kutija(0.9, 0.35, 0.2, mat(0xc23a2e, { roughness: 0.5 })), 'sijacica', sij); okvirS.position.set(-0.45, 0.6, z);
    const disk = dodaj(valjak(0.2, 0.03, metal), 'sijacica', sij); disk.rotation.x = Math.PI / 2; disk.position.set(-0.2, 0.22, z);
    const kot = dodaj(valjak(0.17, 0.08, crna), 'sijacica', sij); kot.rotation.x = Math.PI / 2; kot.position.set(-0.8, 0.17, z);
    const spr = dodaj(kutija(0.45, 0.5, 0.36, mat(0xe4e0d6)), 'spremnik', sij); spr.position.set(-0.4, 1.05, z);
    const sek = dodaj(kutija(0.14, 0.14, 0.14, mat(0x2ecad4, { roughness: 0.4 })), 'sekcije', sij); sek.position.set(-0.05, 0.62, z);
  }
  [-1, 1].forEach((s) => {
    const krak = dodaj(kutija(0.08, 0.08, 1.8, metal), 'marker', sij); krak.position.set(-0.2, 0.55, s * (Z / 2 + 0.9)); krak.rotation.x = s * 0.25;
    const dm = dodaj(valjak(0.18, 0.03, metal), 'marker', sij); dm.rotation.x = Math.PI / 2; dm.position.set(-0.2, 0.18, s * (Z / 2 + 1.75));
  });

  /* RTK bazna stanica na rubu parcele */
  const baza = new THREE.Group(); baza.position.set(-70, 0, -32); grupa.add(baza);
  [0, 2.1, 4.2].forEach((a) => { const n = dodaj(valjak(0.025, 1.7, metal, 6), 'baza', baza); n.position.set(Math.cos(a) * 0.35, 0.8, Math.sin(a) * 0.35); n.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); });
  const bAnt = dodaj(new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2f2f2)), 'baza', baza); bAnt.position.y = 1.62;
  const radio = dodaj(kutija(0.25, 0.32, 0.12, mat(0xd8b23a)), 'baza', baza); radio.position.set(0, 0.85, 0.05);
  const sib = dodaj(valjak(0.012, 0.9, crna, 6), 'baza', baza); sib.position.set(0.1, 1.45, 0.05);

  const POGLEDI = {
    traktor: { naziv: 'Traktor', cam: [9, 5.5, 11], cilj: [-0.5, 1.4, Z / 2] },
    sijacica: { naziv: 'Sijačica', cam: [-10, 3.2, 6], cilj: [-3.8, 0.7, Z / 2] },
    spoj: { naziv: 'Spoj prohoda', cam: [-26, 7, 0.01], cilj: [-26, 0, 0] },
    parcela: { naziv: 'Parcela', cam: [-95, 55, 75], cilj: [0, 0, 0] },
    baza: { naziv: 'Bazna stanica', cam: [-64, 3, -26], cilj: [-70, 1, -32] },
  };
  const POGLED_DIJELA = { traktor: 'traktor', antena: 'traktor', terminal: 'traktor', autopilot: 'traktor', sijacica: 'sijacica', sekcije: 'sijacica', marker: 'spoj', spremnik: 'sijacica', baza: 'baza', parcela: 'parcela', zone: 'parcela' };

  const TIPICNO = { rucno: [0.14, 'vozač s markerom: spoj tipično ±14 cm, pogreške se zbrajaju iz prohoda u prohod'],
    sbas: [0.2, 'autopilot s EGNOS-om: pogreška se polako mijenja, između susjednih prohoda tipično ±10–20 cm'],
    rtk: [0.025, 'autopilot s RTK-om: spoj tipično ±2–3 cm'] };
  function kontrola(v) {
    const [d, t] = TIPICNO[v] || TIPICNO.rtk;
    prohod2.position.z = d; tr.position.z = Z / 2 + d;
    const cm = Math.round(d * 100);
    return { izlaz: '', info: `${t} · na prikazu razmak na spoju ${70 + cm} cm umjesto 70 cm (odstupanje ${cm} cm)` };
  }
  return { grupa, POGLEDI, POGLED_DIJELA, kontrola, pocetni: 'traktor', maxUdaljenost: 400, minUdaljenost: 1 };
}
