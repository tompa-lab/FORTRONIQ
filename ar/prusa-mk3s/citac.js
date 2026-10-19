// citac.js — čitanje datoteka modela u pregledniku: STL (binarni i ASCII), OBJ, 3MF (uz postavke PrusaSlicera), PLY, GLB/glTF,
// STEP/IGES (OpenCascade, occt-import-js, učitava se tek kad zatreba). Izlaz: { T: Float32Array trokuta (9 brojeva po trokutu, mm), info }.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const dek = new TextDecoder();

export function stl(buf) {
  const dv = new DataView(buf);
  if (buf.byteLength >= 84) {
    const n = dv.getUint32(80, true);
    if (84 + 50 * n === buf.byteLength) {
      const T = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) { const o = 84 + 50 * i + 12; for (let k = 0; k < 9; k++) T[9 * i + k] = dv.getFloat32(o + 4 * k, true); }
      return { T, info: 'binarni STL' };
    }
  }
  const s = dek.decode(buf), v = [], re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g; let m;
  while ((m = re.exec(s))) v.push(+m[1], +m[2], +m[3]);
  if (!v.length || v.length % 9) throw new Error('STL datoteka nije ispravna (ni binarna ni ASCII).');
  return { T: new Float32Array(v), info: 'ASCII STL' };
}

export function obj(buf) {
  const s = dek.decode(buf), V = [], out = [];
  for (const l of s.split(/\r?\n/)) {
    if (l.startsWith('v ')) { const p = l.trim().split(/\s+/); V.push([+p[1], +p[2], +p[3]]); }
    else if (l.startsWith('f ')) {
      const idx = l.trim().split(/\s+/).slice(1).map(t => { const i = parseInt(t.split('/')[0], 10); return i < 0 ? V.length + i : i - 1; });
      for (let k = 1; k + 1 < idx.length; k++) [idx[0], idx[k], idx[k + 1]].forEach(i => out.push(...V[i]));
    }
  }
  if (!out.length) throw new Error('OBJ datoteka nema ploha (f).');
  return { T: new Float32Array(out), info: 'OBJ, ' + V.length + ' vrhova' };
}

export function ply(buf) {
  const u8 = new Uint8Array(buf), kraj = dek.decode(u8.slice(0, Math.min(4096, u8.length))).indexOf('end_header');
  if (kraj < 0) throw new Error('PLY bez zaglavlja.');
  const zag = dek.decode(u8.slice(0, kraj)).split(/\r?\n/), pocetak = kraj + 'end_header'.length + (u8[kraj + 10] === 13 ? 2 : 1);
  const fmt = (zag.find(l => l.startsWith('format')) || '').split(' ')[1];
  let nv = 0, nf = 0, el = null; const svv = [], fl = [];
  zag.forEach(l => { const p = l.trim().split(/\s+/); if (p[0] === 'element') { el = p[1]; if (el === 'vertex') nv = +p[2]; if (el === 'face') nf = +p[2]; } else if (p[0] === 'property') { if (el === 'vertex') svv.push(p); else if (el === 'face') fl.push(p); } });
  const xi = svv.findIndex(p => p[p.length - 1] === 'x'), V = new Float32Array(nv * 3);
  const vel = { char: 1, uchar: 1, int8: 1, uint8: 1, short: 2, ushort: 2, int16: 2, uint16: 2, int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4, double: 8, float64: 8 };
  const out = [];
  if (fmt === 'ascii') {
    const red = dek.decode(u8.slice(pocetak)).split(/\r?\n/).filter(Boolean);
    for (let i = 0; i < nv; i++) { const p = red[i].trim().split(/\s+/).map(Number); V[3 * i] = p[xi]; V[3 * i + 1] = p[xi + 1]; V[3 * i + 2] = p[xi + 2]; }
    for (let i = 0; i < nf; i++) { const p = red[nv + i].trim().split(/\s+/).map(Number), n = p[0]; for (let k = 1; k + 1 < n; k++) [p[1], p[1 + k], p[2 + k]].forEach(j => out.push(V[3 * j], V[3 * j + 1], V[3 * j + 2])); }
  } else {
    const le = fmt === 'binary_little_endian', dv = new DataView(buf); let o = pocetak;
    const rd = (t) => { let v; switch (t) { case 'float': case 'float32': v = dv.getFloat32(o, le); break; case 'double': case 'float64': v = dv.getFloat64(o, le); break; case 'uchar': case 'uint8': v = dv.getUint8(o); break; case 'char': case 'int8': v = dv.getInt8(o); break; case 'short': case 'int16': v = dv.getInt16(o, le); break; case 'ushort': case 'uint16': v = dv.getUint16(o, le); break; case 'int': case 'int32': v = dv.getInt32(o, le); break; default: v = dv.getUint32(o, le); } o += vel[t]; return v; };
    for (let i = 0; i < nv; i++) for (let k = 0; k < svv.length; k++) { const v = rd(svv[k][1]); if (k >= xi && k < xi + 3) V[3 * i + k - xi] = v; }
    if (!nf) throw new Error('PLY je oblak točaka bez ploha — za ispis treba mreža trokuta (u CloudCompareu: Poisson ili Delaunay).');
    for (let i = 0; i < nf; i++) for (const p of fl) {
      if (p[1] === 'list') { const n = rd(p[2]), id = []; for (let k = 0; k < n; k++) id.push(rd(p[3])); for (let k = 1; k + 1 < n; k++) [id[0], id[k], id[k + 1]].forEach(j => out.push(V[3 * j], V[3 * j + 1], V[3 * j + 2])); }
      else rd(p[1]);
    }
  }
  if (!out.length) throw new Error('PLY je oblak točaka bez ploha — za ispis treba mreža trokuta.');
  return { T: new Float32Array(out), info: 'PLY (' + fmt + ')' };
}

// ---------- ZIP (za 3MF): središnji direktorij + DecompressionStream('deflate-raw') ----------
async function zip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf); let e = buf.byteLength - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('3MF nije ispravna ZIP arhiva.');
  const n = dv.getUint16(e + 10, true); let o = dv.getUint32(e + 16, true); const dat = {};
  for (let i = 0; i < n; i++) {
    const met = dv.getUint16(o + 10, true), cs = dv.getUint32(o + 20, true), ln = dv.getUint16(o + 28, true), le = dv.getUint16(o + 30, true), lk = dv.getUint16(o + 32, true), lh = dv.getUint32(o + 42, true);
    const ime = dek.decode(u8.slice(o + 46, o + 46 + ln));
    const ln2 = dv.getUint16(lh + 26, true), le2 = dv.getUint16(lh + 28, true), pod = u8.slice(lh + 30 + ln2 + le2, lh + 30 + ln2 + le2 + cs);
    dat[ime] = { met, pod }; o += 46 + ln + le + lk;
  }
  const citaj = async ime => {
    const d = dat[ime]; if (!d) return null;
    if (d.met === 0) return d.pod;
    if (typeof DecompressionStream === 'undefined') throw new Error('Preglednik ne zna raspakirati 3MF (nema DecompressionStream).');
    return new Uint8Array(await new Response(new Blob([d.pod]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  };
  return { imena: Object.keys(dat), citaj };
}
function matrica3mf(s) { if (!s) return null; const v = s.trim().split(/\s+/).map(Number); return v.length === 12 ? v : null; }
function primijeni(m, x, y, z) { return m ? [m[0] * x + m[3] * y + m[6] * z + m[9], m[1] * x + m[4] * y + m[7] * z + m[10], m[2] * x + m[5] * y + m[8] * z + m[11]] : [x, y, z]; }
export async function trimf(buf) {
  const z = await zip(buf), imeM = z.imena.find(i => /3dmodel\.model$/i.test(i)) || z.imena.find(i => /\.model$/i.test(i));
  if (!imeM) throw new Error('U 3MF arhivi nema 3D modela.');
  const xml = new DOMParser().parseFromString(dek.decode(await z.citaj(imeM)), 'application/xml');
  const obj = {};
  for (const o of xml.getElementsByTagName('object')) {
    const id = o.getAttribute('id'), mesh = o.getElementsByTagName('mesh')[0];
    if (mesh) {
      const V = [...mesh.getElementsByTagName('vertex')].map(v => [+v.getAttribute('x'), +v.getAttribute('y'), +v.getAttribute('z')]);
      const F = [...mesh.getElementsByTagName('triangle')].map(t => [+t.getAttribute('v1'), +t.getAttribute('v2'), +t.getAttribute('v3')]);
      obj[id] = { V, F };
    } else obj[id] = { komp: [...o.getElementsByTagName('component')].map(c => ({ id: c.getAttribute('objectid'), m: matrica3mf(c.getAttribute('transform')) })) };
  }
  // ms: matrice od unutarnje prema vanjskoj (redni vektor: p' = p · M)
  const dodaj = (id, ms, out) => { const o = obj[id]; if (!o) return; if (o.V) o.F.forEach(f => f.forEach(i => { let q = o.V[i]; ms.forEach(m => { q = primijeni(m, ...q); }); out.push(q[0], q[1], q[2]); })); else o.komp.forEach(c => dodaj(c.id, [c.m].concat(ms), out)); };
  const imena = {}; for (const o of xml.getElementsByTagName('object')) imena[o.getAttribute('id')] = o.getAttribute('name') || '';
  const build = xml.getElementsByTagName('item'), dijelovi = [];   // svaki predmet iz <build> zasebno (PrusaSlicer: jedan predmet = jedan item)
  if (build.length) for (const it of build) { const t = []; dodaj(it.getAttribute('objectid'), [matrica3mf(it.getAttribute('transform'))], t); if (t.length) dijelovi.push({ ime: imena[it.getAttribute('objectid')] || 'predmet ' + (dijelovi.length + 1), T: t }); }
  else Object.keys(obj).forEach(id => { const t = []; dodaj(id, [], t); if (t.length) dijelovi.push({ ime: imena[id] || 'predmet ' + (dijelovi.length + 1), T: t }); });
  // postavke PrusaSlicera spremljene u projekt
  let postavke = null;
  const cfg = z.imena.find(i => /Slic3r_PE\.config$|PrusaSlicer\.config$/i.test(i));
  if (cfg) { postavke = {}; dek.decode(await z.citaj(cfg)).split(/\r?\n/).forEach(l => { const m = /^; ([a-z_0-9]+) = (.*)$/.exec(l); if (m) postavke[m[1]] = m[2]; }); }
  const jed = (xml.documentElement.getAttribute('unit') || 'millimeter');
  const k = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 }[jed] || 1;
  let n = 0; dijelovi.forEach(d => { d.T = Float32Array.from(d.T); if (k !== 1) for (let i = 0; i < d.T.length; i++) d.T[i] *= k; n += d.T.length; });
  const T = new Float32Array(n); let o = 0; dijelovi.forEach(d => { T.set(d.T, o); o += d.T.length; });
  return { T, info: '3MF' + (postavke ? ', s postavkama PrusaSlicera' : ''), postavke, kartaVrsno: true, dijelovi: dijelovi.length > 1 ? dijelovi : null };
}

export function gltf(buf, ime) {
  return new Promise((ok, ne) => {
    new GLTFLoader().parse(buf, '', g => {
      g.scene.updateMatrixWorld(true); const out = [], v = new THREE.Vector3();
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const p = o.geometry.attributes.position, idx = o.geometry.index;
        const n = idx ? idx.count : p.count;
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld); out.push(v.x * 1000, -v.z * 1000, v.y * 1000); }
      });
      if (!out.length) return ne(new Error('U datoteci nema mreže.'));
      ok({ T: new Float32Array(out), info: 'glTF/GLB (metri → mm, Y gore → Z gore)' });
    }, e => ne(new Error('GLB/glTF se nije mogao pročitati: ' + (e && e.message || e))));
  });
}

let occtObecanje = null;
const OCCT = '../lib/occt/';   // occt-import-js 0.0.23 (LGPL-2.1, OpenCascade), na našem poslužitelju
function occt() {
  if (occtObecanje) return occtObecanje;
  occtObecanje = new Promise((ok, ne) => {
    const s = document.createElement('script'); s.src = OCCT + 'occt-import-js.js';
    s.onload = () => window.occtimportjs({ locateFile: f => OCCT + f }).then(ok, ne);
    s.onerror = () => { occtObecanje = null; ne(new Error('Čitač STEP datoteka (OpenCascade, ~7 MB) se nije mogao učitati. Provjeri vezu ili izvezi STL iz CAD-a.')); };
    document.head.appendChild(s);
  });
  return occtObecanje;
}
export async function step(buf, iges) {
  const o = await occt();
  const r = iges ? o.ReadIgesFile(new Uint8Array(buf), null) : o.ReadStepFile(new Uint8Array(buf), { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 });
  if (!r || !r.success) throw new Error('OpenCascade nije uspio pročitati datoteku.');
  const out = [];
  r.meshes.forEach(m => { const P = m.attributes.position.array, I = m.index.array; for (let i = 0; i < I.length; i++) out.push(P[3 * I[i]], P[3 * I[i] + 1], P[3 * I[i] + 2]); });
  return { T: new Float32Array(out), info: (iges ? 'IGES' : 'STEP') + ' (OpenCascade), ' + r.meshes.length + ' tijela' };
}

export async function ucitaj(datoteka) {
  const ime = datoteka.name, ext = (ime.split('.').pop() || '').toLowerCase(), buf = await datoteka.arrayBuffer();
  if (ext === 'stl') return stl(buf);
  if (ext === 'obj') return obj(buf);
  if (ext === '3mf') return trimf(buf);
  if (ext === 'ply') return ply(buf);
  if (ext === 'glb' || ext === 'gltf') return gltf(buf, ime);
  if (ext === 'step' || ext === 'stp') return step(buf, false);
  if (ext === 'iges' || ext === 'igs') return step(buf, true);
  if (ext === 'gcode' || ext === 'gco' || ext === 'g' || ext === 'bgcode') {
    if (ext === 'bgcode') throw new Error('Binarni G-kod (.bgcode) je za MK4/XL/MINI s novijim firmwareom. MK3S koristi običan .gcode — u PrusaSliceru isključi „Binary G-code”.');
    return { gkod: dek.decode(buf), info: 'G-kod' };
  }
  throw new Error('Format .' + ext + ' nije podržan. Podržano: STL, OBJ, 3MF, PLY, GLB/glTF, STEP/STP, IGES/IGS i G-kod.');
}
