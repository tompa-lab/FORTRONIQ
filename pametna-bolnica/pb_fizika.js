/* FORTRONIQ · Pametna bolnica s tabletičarom — model odjela: ERP (terapija, zalihe, serije, nabava), MES (nalog punjenja,
   doze do potvrde, zapis), stanica punjenja (UR3e, kamera, vaga, RFID), farmaceut, Robotino, sestre i dežurni, alarmi iz sobe,
   hladnjak za lijekove, PLC signali. Fiksni korak 1 s; radi i u Node-u. SIMULATOR ZA UČENJE, NE MEDICINSKI UREĐAJ.
   © ForTroniQ d.o.o. */
import { PRETP, PARAMETRI, TERMINI, LIJEKOVI, NESPOJIVI, PACIJENTI, GRESKE, ODBIJANJE } from './pb_podaci.js';

export const KORAK = 1;
const P = (k) => PRETP[k].v;
const L = new Map(LIJEKOVI.map((l) => [l.id, l]));
export function zadaniParametri() { const o = {}; PARAMETRI.forEach((p) => { o[p.id] = p.v; }); return o; }
export const sat2 = (h) => { const m = Math.round((((h % 24) + 24) % 24) * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const PRIO = { prijem: 0, pad: 1, spo2: 2, hitno: 2, doza: 3, poziv: 4 };
const TRAJ = { pad: 10, spo2: 6, poziv: 3, hitno: 3 };
const NAZ_AL = { pad: 'pad iz kreveta', spo2: 'pad saturacije', poziv: 'poziv sestri' };
const mijesaj = (a, s) => { const b = a.map((x, i) => [x, i]); for (let i = b.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export function pocetnaTerapija(S) {
  const t = PACIJENTI.map((p) => ({ id: p.id, lijekovi: p.terapija.map(([l, tt]) => ({ l, t: [...tt] })) }));
  (S.dodaj || []).forEach(([pid, l, tt]) => { const x = t.find((q) => q.id === pid); const y = x.lijekovi.find((q) => q.l === l); if (y) tt.forEach((k) => { if (!y.t.includes(k)) y.t.push(k); }); else x.lijekovi.push({ l, t: [...tt] }); });
  return t;
}
export function nespojivi(ter) {
  const out = [];
  ter.forEach((p) => TERMINI.forEach((_, k) => { const u = p.lijekovi.filter((x) => x.t.includes(k)).map((x) => x.l); NESPOJIVI.forEach(([a, b]) => { if (u.includes(a) && u.includes(b)) out.push({ pac: p.id, termin: k, a, b }); }); }));
  return out;
}

export function napraviOdjel(S, param, opc = {}) {
  const p = Object.assign(zadaniParametri(), S.param || {}, param || {});
  const t0 = Math.round(S.odSata * 3600), trajanje = Math.round(S.trajanje * 3600), tKraj = t0 + trajanje;
  const ter = pocetnaTerapija(S);
  const zal = {}; LIJEKOVI.forEach((l) => { zal[l.id] = ((S.zalihe && S.zalihe[l.id]) || l.serije).map(([s, n]) => ({ s, n })); });
  const kom = (l) => zal[l].reduce((a, b) => a + b.n, 0);
  const st = {
    t: t0, kvarovi: new Set(opc.kvarovi || []), kvarT: null, man: {},
    ter, doze: [], punjenje: null, farm: null, rob: { stanje: S.naOdjelu ? 'odjel' : 'ljekarna', tKraj: 0, tura: null }, naOdjeluT: S.naOdjelu ? t0 : null,
    zadaci: [], sestre: [], dezurni: null, odluke: [], mes: [], dog: [], greske: { ukupno: 0, ok: 0, krivo: 0 }, greska: null,
    T_HLL: 5, kompHl: false, tHlIznad: null, hitno: null, uzorci: null, prepreka: !!S.prepreka, narudzba: null, povucena: null, prijava: null,
    odbijanje: null, reakcije: {}, vit: PACIJENTI.map((q) => ({ id: q.id, puls: q.vit[0], spo2: q.vit[1], temp: q.vit[2], alarm: null })), upisT: -99, dezMin: 0, dodano: new Set(),
  };
  let zadnje = null, did = 0;
  const dog = (tekst) => st.dog.push({ t: st.t, tekst });
  const mes = (o) => { st.mes.push(Object.assign({ t: st.t }, o)); if (st.mes.length > 600) st.mes.shift(); };
  const uzmi = (l) => { const z = zal[l].find((x) => x.n > 0 && x.s !== st.povucena); if (!z) return null; z.n--; return z.s; };
  const kvar = (k) => st.kvarovi.has(k);

  /* doze za termine unutar scenarija */
  function slozi() {
    st.doze = [];
    TERMINI.forEach((tm, k) => {
      const tDue = tm.h * 3600; if (tDue < t0 || tDue > tKraj - 3600) return;
      st.ter.forEach((q) => q.lijekovi.forEach((x) => { if (x.t.includes(k)) st.doze.push({ id: ++did, pac: q.id, l: x.l, termin: k, tDue, faza: S.naOdjelu ? 'naOdjelu' : 'plan', serija: S.naOdjelu ? L.get(x.l).serije[0][0] : null, kriva: false }); }));
    });
  }
  slozi();
  const odluka = (o) => { o.id = 'o' + (++did); st.odluke.push(o); dog('Potrebna odluka: ' + o.naslov + '.'); return o; };
  function sestra(i) { return { i, zad: null, tKraj: 0, dez: false }; }
  for (let i = 0; i < p.sestre; i++) st.sestre.push(sestra(i));

  /* ================================================================== korak */
  function korak() {
    const dt = KORAK, t = st.t, sat = t / 3600;
    /* --- ERP: nabava i povlačenje --- */
    if (st.narudzba && t >= st.narudzba.tStize) { zal[st.narudzba.l].push({ s: st.narudzba.l + '-2450', n: st.narudzba.kol }); dog(`Stigla narudžba: ${st.narudzba.kol} kom ${L.get(st.narudzba.l).naziv}.`); st.narudzba = null; }
    if (p.minZal > 0 && !st.narudzba) { const l = LIJEKOVI.find((x) => kom(x.id) < p.minZal && potreba(x.id) > 0); if (l) naruci(l.id, false); }
    if (S.povlacenje && !st.povucena && sat >= S.povlacenje.sat) {
      st.povucena = S.povlacenje.serija;
      dog(`Proizvođač povlači seriju ${st.povucena}. ERP je blokirao preostale tablete te serije; neizdane doze zamijenjene su novom serijom.`);
      st.doze.forEach((d) => { if (d.serija === st.povucena && !['izdano', 'odbijeno', 'propusteno'].includes(d.faza)) { d.serija = uzmi(d.l) || d.serija; mes({ pac: d.pac, l: d.l, serija: d.serija, dog: 'zamijenjeno (povlačenje)' }); } });
    }
    /* --- stanica punjenja (UR3e) --- */
    if (!st.punjenje && !S.naOdjelu && t >= t0 + 300) {
      const red = st.doze.filter((d) => d.faza === 'plan').sort((a, b) => a.termin - b.termin || a.pac.localeCompare(b.pac));
      st.punjenje = { red, i: 0, tSljed: t + P('ur3e'), stoji: false, kraj: null, start: t };
      dog(`MES: nalog punjenja — ${red.length} tableta za ${new Set(red.map((d) => d.pac)).size} tabletičara.`);
    }
    const PU = st.punjenje;
    let radiRobot = false, masa = 0;
    if (PU && PU.kraj === null) {
      if (!PU.stoji) {
        radiRobot = true;
        const faza = (PU.tSljed - t) / P('ur3e');
        if (faza < 0.6) masa = L.get(PU.red[PU.i].l).masa;
        if (t >= PU.tSljed && PU.red[PU.i].faza !== 'plan') { PU.i++; PU.tSljed = t + 1; if (PU.i >= PU.red.length) { PU.kraj = t; st.farm = { tKraj: t + (p.dvostruka ? P('farmaceut') * 60 : 0) }; } }
        else if (t >= PU.tSljed) {
          const d = PU.red[PU.i];
          const g = (S.greske || []).find(([n]) => n === PU.i && !(PU.gotove || []).includes(n)) || (kvar('vaga') ? [PU.i, 'pala', true] : null);
          if (g) {
            PU.stoji = true; PU.gotove = (PU.gotove || []).concat(g[2] ? [] : [g[0]]);
            const G = GRESKE[g[1]], mj = mijesaj(G.opcije, (PU.i + 7) * 131);
            st.greska = { vrsta: g[1], d, rijeseno: false, zona: false, kvarVage: !!g[2] };
            if (!g[2]) st.greske.ukupno++;
            odluka({ vrsta: 'greska', naslov: 'Stanica punjenja: ' + G.n, opis: G.opis + ` Nalog: ${d.pac}, ${L.get(d.l).naziv}, ${TERMINI[d.termin].n}.`, opcije: mj.map(([x]) => x), tocna: mj.findIndex(([, i]) => i === 0) });
          } else {
            d.serija = uzmi(d.l);
            if (!d.serija) { d.faza = 'prazno'; dog(`Nema ${L.get(d.l).naziv} na zalihi — pretinac ostaje prazan (${d.pac}).`); }
            else { d.faza = 'napunjeno'; mes({ pac: d.pac, l: d.l, serija: d.serija, dog: 'napunjeno (UR3e)' }); }
            PU.i++; PU.tSljed = t + P('ur3e');
            if (PU.i >= PU.red.length) { PU.kraj = t; dog('Punjenje gotovo.' + (p.dvostruka ? ' Tabletičari idu na provjeru farmaceuta.' : ' Bez provjere farmaceuta.')); st.farm = { tKraj: t + (p.dvostruka ? P('farmaceut') * 60 : 0) }; }
          }
        }
      }
    }
    if (st.farm && !st.farm.gotov && t >= st.farm.tKraj) {
      st.farm.gotov = true;
      if (p.dvostruka) st.doze.forEach((d) => { if (d.kriva && d.vidljivo) { d.kriva = false; d.vidljivo = false; dog(`Farmaceut je pronašao krivu tabletu (${d.pac}) i zamijenio je.`); } });
      st.rob.cekaTura = true;
    }
    /* --- Robotino --- */
    const R = st.rob;
    if (R.cekaTura && R.stanje === 'ljekarna') { R.cekaTura = false; R.stanje = 'vozi'; R.tura = 'tabletičari'; R.tKraj = t + P('robTura') * 60; dog('Robotino vozi tabletičare na odjel.'); }
    if (R.stanje === 'vozi' && (st.prepreka || kvar('robotino'))) {
      R.tKraj += dt;
      if (!R.blok) { R.blok = true; if (st.prepreka) odluka({ vrsta: 'prepreka', naslov: 'Robotino stoji pred preprekom u hodniku', opis: 'Kolica za čišćenje zaprječuju hodnik prema odjelu.', opcije: ['Pošalji tehničara da ukloni prepreku', 'Čekaj da se prepreka sama ukloni', 'Vrati Robotina u ljekarnu'], tocna: 0 }); }
      if (st.prepreka && sat >= 8.5) { st.prepreka = false; dog('Prepreka je uklonjena (8:30).'); }
    } else R.blok = false;
    if (R.stanje === 'vozi' && t >= R.tKraj) {
      if (R.tura === 'tabletičari') { st.naOdjeluT = st.naOdjeluT || t; st.doze.forEach((d) => { if (d.faza === 'napunjeno') d.faza = 'naOdjelu'; }); dog('Tabletičari su na odjelu.'); }
      if (R.tura === 'hitno') { st.hitno.stigao = t; st.zadaci.push({ tip: 'hitno', prio: PRIO.hitno, t0: t, traj: TRAJ.hitno * 60, pac: st.hitno.pac, naziv: 'Hitni lijek' }); dog('Hitni lijek je na odjelu.'); }
      if (R.tura === 'uzorci') dog('Robotino je vratio uzorke iz laboratorija.');
      R.stanje = R.tura === 'uzorci' ? 'ljekarna' : 'povratak'; R.tKraj = t + (R.tura === 'uzorci' ? 0 : P('robTura') * 60); R.tura = null;
    }
    if (R.stanje === 'povratak' && t >= R.tKraj) R.stanje = 'ljekarna';
    if (!S.naOdjelu && !st.uzorci && sat >= 10.25) { st.uzorci = true; R.planUzorci = true; }
    if (R.planUzorci && R.stanje === 'ljekarna' && !(st.hitno && st.hitno.spreman && !st.hitno.poslan)) { R.planUzorci = false; R.stanje = 'vozi'; R.tura = 'uzorci'; R.tKraj = t + P('uzorci') * 60; dog('Robotino kreće na redovitu turu uzoraka (45 min).'); }
    if (S.hitno && !st.hitno && sat >= S.hitno) { st.hitno = { t, pac: 'P-104', l: 'E', spreman: false, tSpreman: t + 3 * 60 }; dog('HITNI NALOG: lijek za P-104 — priprema u ljekarni.'); }
    if (st.hitno && !st.hitno.spreman && t >= st.hitno.tSpreman) { st.hitno.spreman = true; dog('Hitni lijek je spreman za dostavu.'); }
    if (st.hitno && st.hitno.spreman && !st.hitno.poslan) {
      if (R.stanje === 'ljekarna') { st.hitno.poslan = true; R.stanje = 'vozi'; R.tura = 'hitno'; R.tKraj = t + P('robTura') * 60; dog('Robotino vozi hitni lijek.'); }
      else if (p.hitno && R.tura === 'uzorci') { R.tura = null; R.stanje = 'povratak'; R.tKraj = t + 5 * 60; R.planUzorci = true; dog('Hitni nalog ima prednost: Robotino prekida turu uzoraka i vraća se u ljekarnu (5 min).'); }
    }
    iz_ROB_ODJEL = R.stanje === 'vozi' ? false : (R.stanje === 'odjel' || (st.naOdjeluT && R.stanje === 'povratak' && t - (R.tKraj - P('robTura') * 60) < 60));

    /* --- doze: dospijevanje i zadaci sestrama --- */
    st.doze.forEach((d) => {
      if (d.faza === 'naOdjelu' && t >= d.tDue) {
        d.faza = 'dospjela';
        let z = st.zadaci.find((x) => x.tip === 'doza' && !x.uRadu && x.pac === d.pac && x.termin === d.termin);
        if (!z) { z = { tip: 'doza', prio: PRIO.doza, t0: d.tDue, traj: 0, dd: [], pac: d.pac, termin: d.termin, naziv: `Doze ${d.pac} (${TERMINI[d.termin].n})` }; st.zadaci.push(z); }
        z.dd.push(d);
      }
      if ((d.faza === 'plan' || d.faza === 'napunjeno' || d.faza === 'prazno') && t >= d.tDue && !d.cekaOdjel) { d.cekaOdjel = true; }
      if (!['izdano', 'odbijeno', 'propusteno', 'odbijenoCeka'].includes(d.faza) && t >= d.tDue + P('propustena') * 60) {
        d.faza = 'propusteno';
        st.zadaci.forEach((z) => { if (z.dd) z.dd = z.dd.filter((x) => x !== d); });
        st.sestre.forEach((s) => { if (s.zad && s.zad.dd && !s.zad.dd.length) s.zad = null; });
        st.zadaci = st.zadaci.filter((z) => !z.dd || z.dd.length);
        dog(`PROPUŠTENA DOZA: ${d.pac}, ${L.get(d.l).naziv}, ${TERMINI[d.termin].n}.`); mes({ pac: d.pac, l: d.l, serija: d.serija, dog: 'propušteno' });
      }
    });
    (S.zadaci || []).forEach((z, i) => { if (!st.dodano.has('z' + i) && sat >= z[0]) { st.dodano.add('z' + i); st.zadaci.push({ tip: 'prijem', prio: PRIO.prijem, t0: t, traj: z[2] * 60, naziv: z[1], neprekidno: true }); dog(z[1] + ' — sestra je zauzeta ' + z[2] + ' min.'); } });
    (S.alarmi || []).forEach((a, i) => { if (!st.dodano.has('a' + i) && sat >= a[0]) { st.dodano.add('a' + i); st.zadaci.push({ tip: a[2], prio: PRIO[a[2]], t0: t, traj: TRAJ[a[2]] * 60, pac: a[1], naziv: NAZ_AL[a[2]] + ' ' + a[1] }); const v = st.vit.find((x) => x.id === a[1]); v.alarm = a[2]; if (a[2] === 'spo2') v.spo2 = 86; dog(`ALARM iz sobe: ${NAZ_AL[a[2]]} (${a[1]}).`); } });
    /* sestre */
    const ceka = () => st.zadaci.filter((z) => !z.uRadu && z.t0 <= t);
    const redSort = (a, b) => (p.redoslijed ? (a.prio - b.prio) : 0) || a.t0 - b.t0;
    const trajanje = (z) => z.tip === 'doza' ? (p.nadzirano ? P('nadzor') : P('doza')) * 60 + (z.dd.some((d) => L.get(d.l).kontrolirani) && p.potpis ? P('potpis') * 60 : 0) : z.traj;
    const zavrsi = (s) => {
      const z = s.zad; s.zad = null; st.zadaci = st.zadaci.filter((x) => x !== z);
      if (z.tip === 'doza') {
        if (S.odbija && z.pac === S.odbija.pac && z.termin === S.odbija.termin && !st.odbijanje) {
          z.dd.forEach((d) => { d.faza = 'odbijenoCeka'; }); st.odbijanje = { dd: z.dd, ok: null };
          odluka({ vrsta: 'odbijanje', naslov: `${z.pac} odbija terapiju (${TERMINI[z.termin].n})`, opis: 'Pacijentica odbija uzeti lijekove iz tabletičara.', opcije: ODBIJANJE, tocna: 0 });
          return;
        }
        z.dd.forEach((d) => {
          d.faza = 'izdano'; d.tIzdano = t; d.nadzor = !!p.nadzirano; d.potpis = !!p.potpis; st.upisT = t;
          mes({ pac: d.pac, l: d.l, serija: d.serija, dog: d.kriva ? 'izdano — KRIVA TABLETA' : 'izdano' + (p.nadzirano ? ' (nadzirano)' : '') });
        });
      }
      if (['pad', 'spo2', 'poziv'].includes(z.tip)) { const v = st.vit.find((x) => x.id === z.pac); v.alarm = null; if (z.tip === 'spo2') v.spo2 = 94; dog(`Riješeno: ${z.naziv}.`); }
      if (z.tip === 'hitno') { st.hitno.dano = t; dog('Hitni lijek dan pacijentu P-104.'); }
      if (z.tip === 'prijem') dog('Prijem je gotov.');
    };
    st.sestre.forEach((s) => { if (s.zad && t >= s.tKraj) zavrsi(s); });
    /* dežurni */
    const cekaDoza = ceka().filter((z) => z.tip === 'doza');
    const cekaAl = ceka().filter((z) => ['pad', 'spo2', 'poziv'].includes(z.tip));
    const treba = (p.eskDoza > 0 && cekaDoza.some((z) => t - z.t0 >= p.eskDoza * 60)) || (p.eskAlarm > 0 && cekaAl.some((z) => z.prio <= 2 && t - z.t0 >= p.eskAlarm * 60));
    if (treba && !st.dezurni) { st.dezurni = { tDolazi: t + P('dezurni') * 60, tMin: t + 20 * 60 }; dog('Poziv dežurnom.'); }
    if (st.dezurni && !st.dezurni.tu && t >= st.dezurni.tDolazi) { st.dezurni.tu = true; const s = sestra(st.sestre.length); s.dez = true; st.sestre.push(s); dog('Dežurni je stigao na odjel.'); }
    if (st.dezurni && st.dezurni.tu) {
      st.dezMin += dt / 60;
      const ds = st.sestre.find((s) => s.dez);
      if (!ds.zad && !ceka().length && t >= st.dezurni.tMin) { st.sestre = st.sestre.filter((s) => !s.dez); st.dezurni = null; dog('Dežurni je otišao s odjela.'); }
    }
    /* dodjela zadataka */
    const dodijeli = (s, z) => { s.zad = z; z.uRadu = true; z.tStart = z.tStart || t; s.tKraj = t + (z.ostalo ?? trajanje(z)); if (['pad', 'spo2'].includes(z.tip) && st.reakcije[z.tip] === undefined) st.reakcije[z.tip] = (t - z.t0) / 60; };
    st.sestre.forEach((s) => { if (s.zad) return; const z = ceka().filter((x) => x.tip !== 'doza' || x.dd.length).sort(redSort)[0]; if (z) dodijeli(s, z); });
    if (p.redoslijed) {
      ceka().filter((z) => z.prio <= 1).forEach((z) => {
        const s = st.sestre.filter((x) => x.zad && !x.zad.neprekidno && x.zad.prio > z.prio).sort((a, b) => b.zad.prio - a.zad.prio)[0];
        if (!s) return;
        const st0 = s.zad; st0.uRadu = false; st0.ostalo = Math.max(30, s.tKraj - t); dog(`Prioritet: sestra prekida „${st0.naziv}“ zbog alarma „${z.naziv}“.`);
        s.zad = null; dodijeli(s, z);
      });
    }
    /* --- hladnjak za lijekove --- */
    if (st.T_HLL > p.hlOn) st.kompHl = true; if (st.T_HLL < p.hlOff) st.kompHl = false;
    st.T_HLL += ((20 - st.T_HLL) * 6 + (kvar('hladnjakL') ? 260 : 0) - (st.kompHl ? 180 : 0)) / 40000 * dt;
    if (st.T_HLL > 8) { if (st.tHlIznad === null) st.tHlIznad = t; } else st.tHlIznad = null;
    /* --- vitalni znakovi (izmišljeni) --- */
    st.vit.forEach((v, i) => { const b = PACIJENTI[i].vit; v.puls = b[0] + 4 * Math.sin(t / 900 + i) + (v.alarm === 'pad' ? 18 : v.alarm === 'spo2' ? 12 : 0); if (v.alarm !== 'spo2') v.spo2 = b[1] + 0.6 * Math.sin(t / 1300 + i * 2); v.temp = b[2] + 0.1 * Math.sin(t / 3000 + i); });

    /* --- alarmi --- */
    const al = [];
    st.doze.filter((d) => d.faza === 'dospjela' && t - d.tDue >= p.alarmMin * 60).slice(0, 1).forEach((d) => al.push({ id: 'doza', t: `Doza čeka dulje od ${p.alarmMin} min (${d.pac}, ${L.get(d.l).naziv})` }));
    const nCeka = st.doze.filter((d) => (d.faza === 'plan' || d.faza === 'napunjeno' || d.faza === 'prazno') && t >= d.tDue).length;
    if (nCeka) al.push({ id: 'tabletari', t: `Termin je počeo, a ${nCeka} tableta još nije na odjelu` });
    if (st.punjenje && st.punjenje.stoji) al.push({ id: 'robot', t: 'Stanica punjenja: UR3e stoji — ' + GRESKE[st.greska.vrsta].n });
    if (R.blok) al.push({ id: 'robotino', t: 'Robotino blokiran u hodniku' });
    st.vit.forEach((v) => { if (v.alarm) al.push({ id: 'soba-' + v.alarm, t: `Soba: ${NAZ_AL[v.alarm]} (${v.id})` }); });
    if (st.tHlIznad !== null && t - st.tHlIznad > 600) al.push({ id: 'hladnjak', t: `Hladnjak za lijekove iznad 8 °C (${st.T_HLL.toFixed(1)} °C)` });
    if (st.hitno && !st.hitno.dano) al.push({ id: 'hitno', t: `Hitni nalog u tijeku (${Math.round((t - st.hitno.t) / 60)} min)` });
    LIJEKOVI.forEach((l) => { if (potreba(l.id) > 0 && kom(l.id) < potreba(l.id) && !st.narudzba) al.push({ id: 'zaliha-' + l.id, t: `ERP: zaliha ${l.naziv} (${kom(l.id)} kom) ne pokriva sutrašnju terapiju (${potreba(l.id)} kom)` }); });

    const iz = {
      ROBOT: radiRobot, VAKUUM: radiRobot && masa > 0, LED: st.doze.some((d) => d.faza === 'dospjela'), UPIS: t - st.upisT < 5,
      ALARM_DOZA: al.some((a) => a.id === 'doza'), KOMP_HLL: st.kompHl, SVJETLO: st.vit.some((v) => v.alarm === 'poziv' || v.alarm === 'pad'),
    };
    Object.keys(iz).forEach((k) => { if (st.man[k] !== null && st.man[k] !== undefined) iz[k] = st.man[k]; });
    const gr = st.greska && !st.greska.rijeseno ? st.greska.vrsta : null;
    const m = {
      MASA: gr === 'pala' ? 0 : masa, T_HLL: st.T_HLL, KAMERA_OK: gr !== 'krivi', RFID_OK: gr !== 'rfid', ZONA: !(st.punjenje && st.punjenje.stoji) || (st.greska && st.greska.zona),
      POKLOPAC: st.sestre.some((s) => s.zad && s.zad.tip === 'doza'), PAD: st.vit.some((v) => v.alarm === 'pad'), POZIV: st.vit.some((v) => v.alarm === 'poziv'), ROB_ODJEL: !!iz_ROB_ODJEL,
    };
    st.t += dt;
    const brF = {}; st.doze.forEach((d) => { brF[d.faza] = (brF[d.faza] || 0) + 1; });
    zadnje = { m, iz, al, sat: st.t / 3600, brF, ceka: ceka().length, zauzete: st.sestre.filter((s) => s.zad).length };
    if ((st.t - t0) % 60 === 0) {
      povijest.push({ t: (st.t - t0) / 3600, dosp: brF.dospjela || 0, izd: brF.izdano || 0, ceka: ceka().length, zauz: st.sestre.filter((s) => s.zad).length, sestara: st.sestre.length,
        spo2: st.vit[5].spo2, puls: st.vit[5].puls, hl: st.T_HLL });
    }
    return zadnje;
  }
  let iz_ROB_ODJEL = false;
  const povijest = [];

  function potreba(l) { let n = 0; st.ter.forEach((q) => q.lijekovi.forEach((x) => { if (x.l === l) n += x.t.length; })); return n; }
  function naruci(l, rucno) {
    if (st.narudzba) return false;
    st.narudzba = { l, kol: 100, tStize: st.t + P('dostava') * 60 };
    dog(`${rucno ? 'Ručna narudžba' : 'ERP: prijedlog narudžbe prihvaćen'} — 100 kom ${L.get(l).naziv}, dostava za ${P('dostava') / 60} h.`);
    return true;
  }

  function pokazatelji() {
    const D = st.doze;
    const izd = D.filter((d) => d.faza === 'izdano');
    const naV = izd.filter((d) => d.tIzdano - d.tDue <= P('naVrijeme') * 60).length;
    const kasno = izd.length - naV;
    const kraj = st.t >= tKraj;
    const propusteno = D.filter((d) => d.faza === 'propusteno').length + (kraj ? D.filter((d) => !['izdano', 'odbijeno', 'odbijenoCeka', 'propusteno'].includes(d.faza) && d.tDue < tKraj - P('propustena') * 60).length : 0);
    const krivo = izd.filter((d) => d.kriva).length;
    const zahv = [...new Set(st.mes.filter((x) => x.dog.startsWith('izdano') && x.serija === (S.povlacenje && S.povlacenje.serija)).map((x) => x.pac))].sort();
    const serijaOk = !!st.prijava && st.prijava.length === zahv.length && st.prijava.every((x, i) => x === zahv[i]);
    const zaliheSutra = LIJEKOVI.every((l) => kom(l.id) + (st.narudzba && st.narudzba.l === l.id ? st.narudzba.kol : 0) >= potreba(l.id));
    const H = izd.filter((d) => L.get(d.l).kontrolirani);
    const reakPad = st.reakcije.pad ?? ((S.alarmi || []).some((a) => a[2] === 'pad') ? Infinity : 0);
    const reakSpo2 = st.reakcije.spo2 ?? ((S.alarmi || []).some((a) => a[2] === 'spo2') ? Infinity : 0);
    const hitnaMin = st.hitno ? ((st.hitno.stigao ?? st.t) - st.hitno.t) / 60 : 0;
    const naOdjelu = st.naOdjeluT ? st.naOdjeluT / 3600 : Infinity;
    const bodovi = Math.round(1000 * (D.length ? naV / D.length : 1) - 300 * krivo - 100 * propusteno - 30 * kasno - 20 * Math.max(0, (isFinite(reakPad) ? reakPad : 30) - 3) - 10 * Math.max(0, (isFinite(reakSpo2) ? reakSpo2 : 30) - 5) - 5 * Math.max(0, hitnaMin - 30) - 100 * nespojivi(st.ter).length - 0.5 * st.dezMin);
    return {
      doze: D.length, izdano: izd.length, naVrijeme: naV, kasno, propusteno, krivo, nespojivo: nespojivi(st.ter).length,
      greskeOk: st.greske.ukupno > 0 && st.greske.ok === st.greske.ukupno && !st.greska, greske: st.greske, naOdjelu, hitnaMin, reakPad, reakSpo2,
      zahvaceni: zahv, serijaOk, zaliheSutra, nadziranoSve: izd.length > 0 && izd.every((d) => d.nadzor), kontroliraniOk: H.length > 0 && H.every((d) => d.potpis),
      odbijanjeOk: !!(st.odbijanje && st.odbijanje.ok), dezMin: st.dezMin, punjenoU: st.punjenje && st.punjenje.kraj ? st.punjenje.kraj / 3600 : null, bodovi,
      udioNaVrijeme: D.length ? naV / D.length * 100 : 100,
    };
  }

  const Z = {
    S, p, st, t0, trajanje, korak, povijest, zal, kom, potreba,
    get zadnje() { return zadnje; },
    doKraja() { while (st.t < tKraj) korak(); return Z; },
    pokazatelji,
    /* propisivanje: premjesti lijek pacijenta iz termina u termin (samo prije punjenja) */
    premjesti(pac, l, iz, u) {
      if (st.punjenje) return 'Punjenje je već počelo — terapija se ne mijenja u ovom krugu.';
      const x = st.ter.find((q) => q.id === pac).lijekovi.find((y) => y.l === l);
      if (!x || !x.t.includes(iz) || x.t.includes(u)) return 'Premještanje nije moguće.';
      x.t = x.t.filter((k) => k !== iz).concat([u]).sort(); slozi(); dog(`Terapija: ${pac}, ${L.get(l).naziv} premješten iz termina „${TERMINI[iz].n}“ u „${TERMINI[u].n}“.`); return '';
    },
    odluci(id, k) {
      const o = st.odluke.find((x) => x.id === id); if (!o) return;
      st.odluke = st.odluke.filter((x) => x !== o);
      const ok = k === o.tocna;
      dog(`Odluka: „${o.opcije[k]}“ — ${ok ? 'ispravno' : 'pogrešno'}.`);
      if (o.vrsta === 'greska') {
        const g = st.greska; g.rijeseno = true; g.ok = ok;
        if (!g.kvarVage) { if (ok) st.greske.ok++; else st.greske.krivo++; }
        const d = g.d;
        if (!ok) {
          if (g.vrsta === 'prazan') { /* preskočen lijek: doze tog lijeka ostaju prazne */ st.punjenje.red.filter((x) => x.l === d.l && x.faza === 'plan').forEach((x) => { x.faza = 'prazno'; }); }
          else if (g.vrsta === 'pala' && o.opcije[k].startsWith('Potvrdi')) { d.faza = 'prazno'; st.punjenje.preskoci = true; }
          else { d.kriva = true; d.vidljivo = g.vrsta === 'krivi'; }
        }
        if (g.vrsta === 'prazan' && ok) { zal[d.l].push({ s: d.l + '-2449', n: 50 }); }
      }
      if (o.vrsta === 'prepreka') {
        if (k === 0) { st.prepreka = false; st.rob.tKraj += 180; dog('Tehničar uklanja prepreku (3 min).'); }
        if (o.opcije[k].startsWith('Vrati')) { st.prepreka = false; st.rob.stanje = 'ljekarna'; st.rob.cekaTura = true; st.rob.tKraj = st.t + 12 * 60; dog('Robotino se vraća i kreće ponovno.'); }
      }
      if (o.vrsta === 'odbijanje') { st.odbijanje.ok = ok; st.odbijanje.dd.forEach((d) => { d.faza = ok || k === 1 ? 'odbijeno' : 'izdano'; if (!ok && k === 2) { d.tIzdano = st.t; d.nadzor = !!Z.p.nadzirano; d.potpis = !!Z.p.potpis; } mes({ pac: d.pac, l: d.l, serija: d.serija, dog: ok ? 'odbijeno — upisano, liječnik obaviješten' : k === 2 ? 'upisano kao uzeto (POGREŠNO)' : 'ostavljeno na ormariću (POGREŠNO)' }); }); }
    },
    potvrdiZonu() { if (st.greska) st.greska.zona = true; },
    ponovniStart() {
      const g = st.greska; if (!g) return 'Robot ne stoji.';
      if (!g.rijeseno) return 'Najprije odaberi postupak za otklanjanje uzroka.';
      if (!g.zona) return 'Potvrdi da je zona robota prazna i da su zaštitna vrata zatvorena.';
      const PU = st.punjenje; PU.stoji = false; st.greska = null;
      if (PU.preskoci) { PU.preskoci = false; PU.i++; } else if (g.ok === false && g.vrsta !== 'prazan') { const d = PU.red[PU.i]; d.serija = uzmi(d.l); d.faza = 'napunjeno'; mes({ pac: d.pac, l: d.l, serija: d.serija, dog: 'napunjeno (nakon pogrešnog postupka)' }); PU.i++; }
      PU.tSljed = st.t + P('ur3e');
      if (PU.i >= PU.red.length) { PU.kraj = st.t; st.farm = { tKraj: st.t + (Z.p.dvostruka ? P('farmaceut') * 60 : 0) }; }
      dog('Siguran ponovni start stanice punjenja.'); return '';
    },
    naruci: (l) => naruci(l, true),
    prijavi(pac) { st.prijava = [...new Set(pac)].sort(); dog('Prijavljeni pacijenti za povlačenje serije: ' + (st.prijava.join(', ') || 'nijedan') + '.'); },
  };
  return Z;
}

export function provjeri(S, pok, dij) {
  return S.provjera.map((c) => {
    let v = c.k === 'dijagnoza' ? (dij && dij.uzrok ? dij.uzrok === (S.kvarOd && S.kvarOd.id) : null) : pok[c.k];
    let ok;
    if (v === null || v === undefined) ok = false;
    else if (c.op === '==') ok = v === c.v;
    else if (c.op === '<=') ok = v <= c.v + 1e-9;
    else ok = v >= c.v - 1e-9;
    return { t: c.t, v, cilj: c.v, op: c.op, ok };
  });
}
