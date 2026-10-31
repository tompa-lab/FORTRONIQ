/* FORTRONIQ · Pametna kuhinja — model kuhinje (polje), program PLC-a, MES (nalozi po jelu), ERP (zalihe, nabava,
   serije) i HACCP zapis. Fiksni korak 1 s. Radi u pregledniku i u Node-u (bez DOM-a). Brojke iz pk_podaci.js.
   © ForTroniQ d.o.o. */
import { PRETP, PARAMETRI, SCENARIJI, SERIJE, NOVA_SERIJA, KUHINJA, MESO, NACINI } from './pk_podaci.js';

export const KORAK = 1;
const P = (k) => PRETP[k].v;
export function zadaniParametri() { const o = {}; PARAMETRI.forEach((p) => { o[p.id] = p.v; }); return o; }
const sat2 = (h) => { const m = Math.round((((h % 24) + 24) % 24) * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const JELO = { pizza: 'pizza', burger: 'burger', salata: 'salata' };

function slucajno(sjeme) { let a = sjeme >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* narudžbe scenarija: Poissonov dolazak po intervalima, 1–4 jela po narudžbi */
export function narudzbe(S) {
  const r = slucajno(S.sjeme || 1), out = [];
  let br = 0;
  (S.dolasci || []).forEach(([od, do_, naSat]) => {
    let t = od * 3600;
    for (;;) {
      t += -Math.log(1 - r()) * 3600 / naSat;
      if (t >= do_ * 3600) break;
      const n = 1 + [0.25, 0.6, 0.85, 1].findIndex((x) => r() < x || x === 1);
      const jela = [];
      for (let i = 0; i < n; i++) { const x = r(); jela.push(x < S.udio[0] ? 'pizza' : x < S.udio[0] + S.udio[1] ? 'burger' : 'salata'); }
      out.push({ id: ++br, t: Math.round(t), stol: 1 + Math.floor(r() * KUHINJA.stolova), jela });
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

export function napraviKuhinju(S, param, opc = {}) {
  const p = Object.assign(zadaniParametri(), S.param || {}, param || {});
  const t0 = S.odSata * 3600, trajanje = S.trajanje * 3600;
  const kvarovi = new Set(opc.kvarovi || []);
  const NAR = narudzbe(S).map((n) => Object.assign({}, n, { stavke: [], gotovo: null, aktivna: false }));
  const zal = {};
  Object.entries(SERIJE).forEach(([k, d]) => { zal[k] = ((S.zalihe && S.zalihe[k]) || d.serije).map(([s, n]) => ({ s, n })); });
  const kom = (k) => zal[k].reduce((a, b) => a + b.n, 0);
  const st = {
    t: t0, kvarovi, kvarT: null, man: {},
    T_PEC: P('tKuh'), T_ROS: P('tKuh'), T_HL: 2.5, T_NAM: 2.5, tJez: null,
    mem: { pec: false, ros: false, komp: false }, iz: {}, perPreostalo: (S.noc ? 0 : (S.perilice || 1)) * 2400, perUk: (S.noc ? 0 : (S.perilice || 1)) * 2400,
    stavke: [], nar: NAR, iduca: 0, ur: null, slag: null, sal: [], rob: { stanje: 'pult', tKraj: 0, tura: [] }, kon: { tKraj: 0, tura: [] },
    narudzbaERP: null, zapis: [], mes: [], dogadaji: [], premjesteno: false, otpisano: false, povucena: null, prijava: null,
    pok: { vraceno: 0, nesigurno: 0, prepeceno: 0, otkazano: 0, eUk: 0, ePec: 0, eRos: 0, ePer: 0, eHl: 0, eOst: 0, vrsna: 0, prekMin: 0, namIznad: 0, namMax: 2.5, hlMax: 2.5, pizze: 0, burgeri: 0, salate: 0 },
    tKompOn: null, tKompOff: t0, tHlIznad: null, sumP: 0, nP: 0, kvarOd: null,
  };
  const povijest = [];
  let zadnje = null, sid = 0;
  const dog = (t) => st.dogadaji.push({ t: st.t, tekst: t });
  const haccp = (vrsta, tekst, ok = true) => { st.zapis.push({ t: st.t, vrsta, tekst, ok }); if (st.zapis.length > 400) st.zapis.shift(); };

  function uzmi(k) {
    const z = zal[k].find((x) => x.n > 0 && x.s !== st.povucena);
    if (!z) return null;
    z.n--; return z.s;
  }
  function naruci(rucno) {
    if (st.narudzbaERP) return false;
    st.narudzbaERP = { tStize: st.t + P('dostava') * 60, kol: 40 };
    dog((rucno ? 'Ručna narudžba' : 'ERP: automatska narudžba') + ' — 40 pljeskavica, dostava za ' + P('dostava') + ' min.');
    return true;
  }

  function korak() {
    const dt = KORAK, t = st.t, sat = t / 3600;
    /* kvar po scenariju */
    if (S.kvarOd && !st.kvarT && sat >= S.kvarOd.sat) { st.kvarovi.add(S.kvarOd.id); st.kvarT = t; }
    if (!S.kvarOd && !st.kvarT && st.kvarovi.size) st.kvarT = t;
    const k = st.kvarovi;
    const noc = !!S.noc || sat >= 23.5 || sat < 6;
    const tKuh = noc ? 20 : P('tKuh');

    /* --- ERP: dolazak narudžbi i dostava --- */
    while (st.iduca < st.nar.length && st.nar[st.iduca].t <= t) {
      const n = st.nar[st.iduca++]; n.aktivna = true;
      n.jela.forEach((j) => {
        const vr = { pizza: 'sir', burger: 'meso', salata: 'salata' }[j];
        const s = uzmi(vr);
        const it = { id: ++sid, nar: n, vrsta: j, serija: s, faza: s ? { pizza: 'cekaUR', burger: 'cekaRos', salata: 'cekaSal' }[j] : 'otkazano', tFaza: t, tj: null, puta: 0 };
        if (!s) { st.pok.otkazano++; dog('Otkazano: ' + j + ' za stol ' + n.stol + ' — nema zalihe.'); }
        n.stavke.push(it); st.stavke.push(it);
      });
    }
    if (st.narudzbaERP && t >= st.narudzbaERP.tStize) { zal.meso.push({ s: NOVA_SERIJA, n: st.narudzbaERP.kol }); dog('Stigla dostava: ' + st.narudzbaERP.kol + ' pljeskavica (serija ' + NOVA_SERIJA + ').'); st.narudzbaERP = null; }
    if (p.minZal > 0 && kom('meso') < p.minZal && !st.narudzbaERP) naruci(false);
    if (S.povlacenje && !st.povucena && sat >= S.povlacenje.sat) {
      st.povucena = S.povlacenje.serija;
      dog('Dobavljač povlači seriju ' + st.povucena + ' (' + SERIJE.sir.naziv + '). ERP je blokirao preostale porcije te serije.');
      haccp('serija', 'Povlačenje serije ' + st.povucena + ' — potrebna sljedivost do stolova.', false);
    }

    /* --- osjetnici (izmjereno) --- */
    const T_HLm = k.has('osjetnikHl') ? 3.0 : st.T_HL;

    /* --- PLC --- */
    const sad = (h) => sat >= h && !S.noc;
    const enP = sad(p.pecStart) && sat < 22.5, enR = sad(p.rosStart) && sat < 22.5;
    if (st.T_PEC < p.pecOn) st.mem.pec = true; if (st.T_PEC > p.pecOff) st.mem.pec = false;
    if (st.T_ROS < p.rosOn) st.mem.ros = true; if (st.T_ROS > p.rosOff) st.mem.ros = false;
    if (T_HLm > p.hlOn) st.mem.komp = true; if (T_HLm < p.hlOff) st.mem.komp = false;
    const m = st.man, mv = (id, v) => (m[id] === null || m[id] === undefined ? v : m[id]);
    const iz = {};
    iz.GRIJ_PEC = mv('GRIJ_PEC', enP && st.mem.pec);
    iz.GRIJ_ROS = mv('GRIJ_ROS', enR && st.mem.ros);
    iz.KOMP = mv('KOMP', st.mem.komp);
    iz.NAPA = mv('NAPA', enP || enR);
    const pOst = S.noc ? 0.2 : P('ostalo');
    const pBez = pOst + (iz.GRIJ_PEC && st.T_PEC < P('pecMaks') ? P('pecSnaga') * (k.has('pecGrijac') ? 0.5 : 1) : 0) + (iz.GRIJ_ROS ? P('rosSnaga') : 0) + (iz.KOMP ? P('hlKompEl') : 0) + (iz.NAPA ? P('napa') : 0);
    const perTrazi = st.perPreostalo > 0 && sad(p.perStart) && sat < 23.5;
    const blok = p.blokada && pBez + P('perilica') > P('prag');
    iz.PERILICA = mv('PERILICA', perTrazi && !blok);
    const T_JEZ = st.tJez;
    iz.PUSTI = T_JEZ !== null && T_JEZ >= p.jezgraMin;

    /* --- fizika: peć, roštilj, hladnjak --- */
    const qPec = iz.GRIJ_PEC && st.T_PEC < P('pecMaks') ? P('pecSnaga') * 1000 * (k.has('pecGrijac') ? 0.5 : 1) : 0;
    st.T_PEC += (qPec - P('pecUA') * (st.T_PEC - tKuh)) / (P('pecC') * 1000) * dt;
    const qRos = iz.GRIJ_ROS ? P('rosSnaga') * 1000 : 0;
    st.T_ROS += (qRos - P('rosUA') * (st.T_ROS - tKuh)) / (P('rosC') * 1000) * dt;
    const servis = !noc && sat >= 18 && sat < 22;
    const vrata = servis && (t % 600) < 40;
    const qHl = P('hlUA') * (tKuh - st.T_HL) + (vrata ? 900 : 0) - (iz.KOMP && !k.has('hladnjak') ? P('hlKomp') : 0);
    st.T_HL += qHl / (P('hlC') * 1000) * dt;
    const cilj = st.premjesteno ? 3 : st.T_HL;
    if (!st.otpisano) st.T_NAM += (cilj - st.T_NAM) / (P('tauNam') * 3600) * dt;
    if (iz.KOMP) { st.tKompOff = null; if (st.tKompOn === null) st.tKompOn = t; } else { st.tKompOn = null; if (st.tKompOff === null) st.tKompOff = t; }
    if (T_HLm > p.alarmHl) { if (st.tHlIznad === null) st.tHlIznad = t; } else st.tHlIznad = null;

    /* --- MES: stanice --- */
    const SV = st.stavke;
    const u = (f) => SV.filter((x) => x.faza === f);
    const prijelaz = (x, f) => { x.faza = f; x.tFaza = t; };
    /* UR3e — priprema pizze */
    if (st.ur && t >= st.ur.tKraj) { prijelaz(st.ur.x, 'cekaPec'); st.ur = null; }
    if (!st.ur) { const x = u('cekaUR')[0]; if (x) { prijelaz(x, 'ur'); st.ur = { x, tKraj: t + P('ur3e') }; } }
    /* peć */
    const uPeci = u('pec');
    uPeci.forEach((x) => { x.pec += Math.max(0, st.T_PEC - 150) / (180 * P('pizzaT')) * dt; if (x.pec >= 1) { prijelaz(x, 'pult'); st.pok.pizze++; } });
    let nPec = u('pec').length;
    for (const x of u('cekaPec')) { if (nPec >= p.pecMax || st.T_PEC < p.pecMin) break; prijelaz(x, 'pec'); x.pec = 0; st.T_PEC -= P('pecPad'); nPec++; }
    /* roštilj */
    const tef = 0.5 * st.T_ROS;
    u('rostilj').forEach((x) => {
      x.tj += (tef - x.tj) / P('tauBurger') * dt;
      const van = p.rosSonda ? x.tj >= p.jezgraMin + 1 : t - x.tFaza >= p.rosVrijeme * 60;
      if (!van) return;
      st.tJez = x.tj;
      if (x.tj > 85) st.pok.prepeceno++;
      if (p.kontrola && x.tj < p.jezgraMin) {
        st.pok.vraceno++; x.puta++;
        haccp('jezgra', `Stol ${x.nar.stol}, burger (${x.serija}): jezgra ${x.tj.toFixed(1)} °C — VRAĆEN na roštilj`, false);
        prijelaz(x, 'rostilj');
        return;
      }
      if (!p.kontrola && x.tj < p.jezgraMin) st.pok.nesigurno++;
      haccp('jezgra', `Stol ${x.nar.stol}, burger (${x.serija}): jezgra ${x.tj.toFixed(1)} °C${p.kontrola ? ' — u redu' : ' — bez kontrole'}`, x.tj >= p.jezgraMin);
      prijelaz(x, 'cekaSlag');
    });
    let nRos = u('rostilj').length;
    for (const x of u('cekaRos')) { if (nRos >= p.rosMax || st.T_ROS < 170) break; prijelaz(x, 'rostilj'); x.tj = Math.max(2, st.T_NAM); st.T_ROS -= 3; nRos++; }
    /* slaganje */
    if (st.slag && t >= st.slag.tKraj) { prijelaz(st.slag.x, 'pult'); st.pok.burgeri++; st.slag = null; }
    if (!st.slag) { const x = u('cekaSlag')[0]; if (x) { prijelaz(x, 'slag'); st.slag = { x, tKraj: t + P('slaganje') }; } }
    /* salata — kuhar, dva mjesta */
    st.sal = st.sal.filter((s) => { if (t >= s.tKraj) { prijelaz(s.x, 'pult'); st.pok.salate++; return false; } return true; });
    while (st.sal.length < 2) { const x = u('cekaSal')[0]; if (!x) break; prijelaz(x, 'sal'); st.sal.push({ x, tKraj: t + P('salata') }); }
    /* dostava: Robotino ili konobar */
    const robRucno = m.ROBOT === false;
    const isporuci = (x) => { prijelaz(x, 'gotovo'); x.tIzdano = t; st.mes.push({ t, stol: x.nar.stol, nar: x.nar.id, jelo: x.vrsta, serija: x.serija }); };
    const R = st.rob;
    if (R.stanje === 'vozi' && t >= R.tIsp && R.tura.length) { R.tura.forEach(isporuci); R.tura = []; }
    if (R.stanje === 'vozi' && t >= R.tKraj) R.stanje = 'pult';
    const K = st.kon;
    if (K.tura.length && t >= K.tIsp) { K.tura.forEach(isporuci); K.tura = []; }
    const naPultu = u('pult');
    if (!robRucno && R.stanje === 'pult' && naPultu.length) {
      const tura = P('robTura') * (k.has('robotino') ? 5 : 1);
      R.tura = naPultu.slice(0, 4); R.tura.forEach((x) => prijelaz(x, 'vozi'));
      R.stanje = 'vozi'; R.tIsp = t + tura / 2; R.tKraj = t + tura;
    }
    if (robRucno && t >= K.tKraj && u('pult').length) {
      K.tura = u('pult').slice(0, 2); K.tura.forEach((x) => prijelaz(x, 'vozi'));
      K.tIsp = t + P('konobar') / 2; K.tKraj = t + P('konobar');
    }
    iz.ROB_PULT = R.stanje === 'pult';
    /* završene narudžbe — biper */
    st.nar.forEach((n) => {
      if (!n.aktivna || n.gotovo !== null) return;
      const ziv = n.stavke.filter((x) => x.faza !== 'otkazano');
      if (!ziv.length) { n.gotovo = -1; return; }
      if (ziv.every((x) => x.faza === 'gotovo')) { n.gotovo = t; n.cek = (t - n.t) / 60; }
    });

    /* --- snaga i energija --- */
    const pUk = pBez + (iz.PERILICA ? P('perilica') : 0);
    if (iz.PERILICA) st.perPreostalo -= dt;
    st.sumP += pUk; st.nP++;
    if (st.nP >= 60) { const pr = st.sumP / st.nP; st.pok.vrsna = Math.max(st.pok.vrsna, pr); if (pr > P('prag') + 1e-9) st.pok.prekMin++; st.sumP = 0; st.nP = 0; }
    const h = dt / 3600;
    st.pok.eUk += pUk * h; st.pok.ePec += qPec / 1000 * h; st.pok.eRos += qRos / 1000 * h; st.pok.ePer += (iz.PERILICA ? P('perilica') : 0) * h;
    st.pok.eHl += (iz.KOMP ? P('hlKompEl') : 0) * h; st.pok.eOst += (pOst + (iz.NAPA ? P('napa') : 0)) * h;
    if (st.T_NAM > P('namGranica') && !st.otpisano) st.pok.namIznad += dt / 60;
    st.pok.namMax = Math.max(st.pok.namMax, st.T_NAM); st.pok.hlMax = Math.max(st.pok.hlMax, st.T_HL);
    if (t % 900 === 0) haccp('hladnjak', `Hladnjak ${T_HLm.toFixed(1)} °C, namirnice ${st.T_NAM.toFixed(1)} °C`, T_HLm <= P('hlGranica') && st.T_NAM <= P('namGranica'));

    /* --- alarmi --- */
    const al = [];
    if (iz.GRIJ_PEC && enP && t - Math.max(t0, p.pecStart * 3600) > 2700 && st.T_PEC < p.pecMin) al.push({ id: 'pecSpora', t: `Peć se grije više od 45 min, a još je ispod ${p.pecMin} °C (${st.T_PEC.toFixed(0)} °C)` });
    if (st.tHlIznad !== null && t - st.tHlIznad >= 600) al.push({ id: 'hlVisoko', t: `Hladnjak iznad ${p.alarmHl} °C dulje od 10 min (${T_HLm.toFixed(1)} °C)` });
    if (st.tKompOn !== null && t - st.tKompOn > 3600) al.push({ id: 'hlKomp', t: 'Kompresor hladnjaka radi bez prestanka više od sat vremena' });
    if (st.tKompOff !== null && t - st.tKompOff > 5400) al.push({ id: 'hlMiruje', t: 'Kompresor hladnjaka miruje više od 90 minuta' });
    if (st.T_NAM > P('namGranica') && !st.premjesteno && !st.otpisano) al.push({ id: 'nam', t: `Namirnice u hladnjaku ${st.T_NAM.toFixed(1)} °C — iznad 5 °C, potrebna HACCP odluka` });
    const staro = u('pult').find((x) => t - x.tFaza > 240);
    if (staro) al.push({ id: 'robot', t: 'Jelo čeka dostavu na izdavanju dulje od 4 minute' });
    const cekaju = st.nar.filter((n) => n.aktivna && n.gotovo === null && (t - n.t) > 1200);
    if (cekaju.length) al.push({ id: 'cekanje', t: `Narudžba stola ${cekaju[0].stol} čeka dulje od 20 min (${cekaju.length} narudžbi)` });
    if (!S.noc && kom('meso') < 5) al.push({ id: 'zaliha', t: `Zaliha pljeskavica: ${kom('meso')} kom` + (st.narudzbaERP ? ' (narudžba na putu)' : '') });
    if (pUk > P('prag') + 1e-9) al.push({ id: 'snaga', t: `Snaga ${pUk.toFixed(1)} kW iznad ugovorene ${P('prag')} kW` });
    iz.SIRENA = mv('SIRENA', al.some((a) => ['hlVisoko', 'nam', 'pecSpora'].includes(a.id)));

    st.t += dt; st.iz = iz;
    const mjer = { T_PEC: st.T_PEC, T_ROS: st.T_ROS, T_JEZ: T_JEZ === null ? NaN : T_JEZ, T_HL: T_HLm, P_UK: pUk, VRATA_HL: vrata, PEC_PUNA: u('pec').length >= p.pecMax, ROB_PULT: iz.ROB_PULT };
    const stanje = {};
    SV.forEach((x) => { stanje[x.faza] = (stanje[x.faza] || 0) + 1; });
    zadnje = { m: mjer, iz, al, sat: st.t / 3600, stanje, zal: { meso: kom('meso'), sir: kom('sir'), salata: kom('salata') }, snage: { pBez, pUk, qPec, qRos, blok, perTrazi }, robRucno };
    if ((st.t - t0) % 60 === 0) {
      const akt = st.nar.filter((n) => n.aktivna && n.gotovo === null);
      povijest.push({ t: (st.t - t0) / 3600, pec: st.T_PEC, ros: st.T_ROS, hl: T_HLm, nam: st.T_NAM, P: pUk, red: SV.filter((x) => !['gotovo', 'otkazano'].includes(x.faza)).length,
        cek: akt.length ? Math.max(...akt.map((n) => (st.t - n.t) / 60)) : 0, prag: P('prag') });
    }
    return zadnje;
  }

  function pokazatelji() {
    const pk = st.pok, kraj = st.t;
    const sve = st.nar.filter((n) => n.aktivna && n.gotovo !== -1);
    const cek = sve.map((n) => (n.gotovo !== null ? n.cek : (kraj - n.t) / 60));
    const gotove = sve.filter((n) => n.gotovo !== null);
    const maxCek = cek.length ? Math.max(...cek) : 0, prosCek = cek.length ? cek.reduce((a, b) => a + b, 0) / cek.length : 0;
    const naVrijeme = sve.length ? sve.filter((n, i) => cek[i] <= 20).length / sve.length : 1;
    const zahvaceni = [...new Set(st.stavke.filter((x) => x.serija && x.serija === (S.povlacenje && S.povlacenje.serija) && x.faza !== 'otkazano').map((x) => x.nar.stol))].sort((a, b) => a - b);
    const serijaOk = !!st.prijava && st.prijava.length === zahvaceni.length && st.prijava.every((s, i) => s === zahvaceni[i]);
    const perilicaGotova = st.perPreostalo <= 0;
    const bodovi = Math.round(1000 * naVrijeme - 300 * pk.nesigurno - 20 * pk.vraceno - 50 * pk.otkazano - 10 * pk.prepeceno - 2 * pk.eUk - 5 * pk.namIznad - 20 * pk.prekMin);
    return Object.assign({}, pk, {
      narudzbi: sve.length, izdano: gotove.length, jela: st.stavke.filter((x) => x.faza === 'gotovo').length, uRadu: st.stavke.filter((x) => !['gotovo', 'otkazano'].includes(x.faza)).length,
      maxCek, prosCek, naVrijeme: naVrijeme * 100, zahvaceni, serijaOk, perilicaGotova, perOdradjeno: (st.perUk - Math.max(0, st.perPreostalo)) / 60, perUk: st.perUk / 60,
      premjesteno: st.premjesteno, otpisano: st.otpisano, trosak: pk.eUk * P('cijena'), bodovi,
      zalMeso: kom('meso'), zalSir: kom('sir'), zalSalata: kom('salata'),
    });
  }

  const Z = {
    S, p, st, t0, trajanje, korak, povijest, zal, kom,
    get zadnje() { return zadnje; },
    doKraja() { while (st.t - t0 < trajanje) korak(); return Z; },
    pokazatelji,
    premjesti() { if (st.premjesteno || st.otpisano) return false; st.premjesteno = true; dog('HACCP odluka: namirnice premještene u rezervni hladnjak.'); haccp('odluka', `Namirnice premještene u rezervni hladnjak (namirnice ${st.T_NAM.toFixed(1)} °C)`, st.T_NAM <= P('namGranica')); return true; },
    otpisi() { if (st.otpisano) return false; st.otpisano = true; dog('HACCP odluka: namirnice otpisane.'); haccp('odluka', `Namirnice otpisane (namirnice ${st.T_NAM.toFixed(1)} °C)`, true); return true; },
    naruci: () => naruci(true),
    prijavi(stolovi) { st.prijava = [...new Set(stolovi)].sort((a, b) => a - b); dog('Prijavljeni stolovi za povlačenje serije: ' + (st.prijava.join(', ') || 'nijedan') + '.'); },
  };
  return Z;
}

export function provjeri(S, pok, dij) {
  return S.provjera.map((c) => {
    let v;
    if (c.k === 'dijagnoza') v = dij && dij.uzrok ? dij.uzrok === (S.kvarOd && S.kvarOd.id) : null;
    else if (c.k === 'vrijemeDijag') v = dij && dij.uzrok === (S.kvarOd && S.kvarOd.id) ? dij.sati : null;
    else v = pok[c.k];
    let ok;
    if (v === null || v === undefined) ok = false;
    else if (c.op === '==') ok = v === c.v;
    else if (c.op === '<=') ok = v <= c.v + 1e-9;
    else if (c.op === '>=') ok = v >= c.v - 1e-9;
    else if (c.op === '<') ok = v < c.v; else ok = v > c.v;
    return { t: c.t, v, cilj: c.v, op: c.op, ok };
  });
}

/* ================================================================== uređivač recepata (jedan komad mesa) */
export function ispeci(rec) {
  const M = MESO.find((x) => x.id === rec.meso) || MESO[0], N = NACINI.find((x) => x.id === rec.nacin) || NACINI[0];
  const d = rec.debljina, tau = N.tau * M.tauF * Math.pow(d / 1.5, 2);
  const tef = N.ef * rec.temp + (N.id === 'dim' ? 0 : 0);
  let stigao = false, tj = rec.pocetna ?? 4, tPov = rec.pocetna ?? 4, t = 0, dosegnuto = null, maxT = tj, povrsina = 0;
  const krivulja = [];
  const dim = N.id === 'dim', kraj = rec.nacinVadenja === 'sonda' ? (dim ? 7 : 3) * 3600 : rec.vrijeme * 60;
  for (; t <= kraj; t += 5) {
    if (t % 30 === 0) krivulja.push({ t: t / 60, j: tj, s: tPov });
    if (rec.nacinVadenja === 'sonda' && tj >= rec.cilj) { stigao = true; break; }
    tj += (tef - tj) / tau * 5;
    tPov += (Math.min(rec.temp * 0.75, 0.9 * rec.temp) - tPov) / (tau * 0.12) * 5;
    if (tPov > 150) povrsina += 5 * (tPov - 150) / 60;
    maxT = Math.max(maxT, tj);
    if (dosegnuto === null && tj >= M.sigurno) dosegnuto = t / 60;
  }
  krivulja.push({ t: t / 60, j: tj, s: tPov });
  const odmor = tj + Math.min(4, d * 1.2) * (N.id === 'dim' ? 0.4 : 1);
  let ocjena, opis;
  const doseg = Math.max(tj, odmor);
  if (rec.nacinVadenja === 'sonda' && (!stigao || t > (dim ? 6 : 1.5) * 3600)) { ocjena = 'presporo'; opis = `Za ${(t / 60).toFixed(0)} min jezgra je dosegla ${tj.toFixed(0)} °C: pri ${rec.temp} °C meso se presporo zagrijava do ${rec.cilj} °C i isušuje se. Povisi temperaturu ili promijeni način pečenja.`; }
  else if (doseg < M.sigurno && M.id !== 'junetina') { ocjena = 'nesigurno'; opis = `Jezgra ${doseg.toFixed(0)} °C — ispod orijentacijske granice ${M.sigurno} °C. Jelo ne smije van.`; }
  else if (M.id === 'junetina' && doseg < M.dobro[0]) { ocjena = 'sirovo'; opis = `Jezgra ${doseg.toFixed(0)} °C — premalo pečeno za odrezak.`; }
  else if (doseg > M.dobro[1] + 6 || povrsina > 600) { ocjena = 'prepeceno'; opis = `Jezgra ${doseg.toFixed(0)} °C${povrsina > 600 ? ', površina zagorjela' : ''} — meso je suho.`; }
  else if (doseg > M.dobro[1]) { ocjena = 'dobro-'; opis = `Jezgra ${doseg.toFixed(0)} °C — sigurno, ali malo suše nego što treba.`; }
  else { ocjena = 'dobro'; opis = `Jezgra ${doseg.toFixed(0)} °C — sigurno i sočno.`; }
  return { krivulja, minuta: t / 60, jezgra: tj, odmor, dosegnuto, ocjena, opis, M, N, povrsina };
}

export { sat2 };
