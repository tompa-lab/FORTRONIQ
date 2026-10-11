// radnik.js — jedno „računalo iz bazena” (Web Worker): ocjenjuje neuronske mreže na poligonima, kao 30 računala u radu (str. 65, 85).
// Prima: {id, mreze:[Float64Array], n, lin, zadaci:[[poligon, polozaj], ...]}; vraća ocjenu svake mreže (prosjek po zadacima, jedn. 18).
importScripts('jezgra.js');
onmessage = function (e) {
  var m = e.data, t0 = Date.now(), oc = [], dijelovi = [];
  for (var i = 0; i < m.mreze.length; i++) {
    var g = m.mreze[i], s = 0, d = null;
    for (var k = 0; k < m.zadaci.length; k++) {
      var r = EMIR.run(EMIR.CONFIGS[m.zadaci[k][0]], m.zadaci[k][1], g, m.n, m.lin);
      s += r.sc.sum;
      if (!d) d = { V: 0, Dif: 0, ex: 0, n: 0, d: 0, a: 0, exr: 0, nr: 0 };
      d.V += r.sc.Vr; d.Dif += r.sc.Difr; d.ex += r.sc.ex; d.n += r.sc.nr; d.d += r.sc.dr; d.a += r.sc.ar; d.exr += r.sc.exr;
    }
    var z = m.zadaci.length;
    oc.push(s / z);
    dijelovi.push({ V: d.V / z, Dif: d.Dif / z, ex: d.ex / z, n: d.n / z, d: d.d / z, a: d.a / z, exr: d.exr / z });
  }
  postMessage({ id: m.id, oc: oc, dijelovi: dijelovi, ms: Date.now() - t0 });
};
