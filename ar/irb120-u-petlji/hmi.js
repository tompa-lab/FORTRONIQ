// hmi.js — simulirani operaterski panel Schneider HMI GTO2315 (Vijeo Designer), jedna stranica 800 × 480 px
// skalirana da stane u karticu. Namjerno „industrijski“ izgled (siva pozadina, reljefne tipke), ne FORTRONIQ stil.
// HMI razgovara samo s PLC-om: tipke su impulsi na ulaze I_Hmi*, prikaz čita izlaze i memoriju PLC-a.
// Struktura stranice gradi se jednom; osvježavaju se samo vrijednosti (tipke ostaju isti DOM elementi).
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class HMI {
  constructor(plc, el, opc = {}) {
    this.plc = plc; this.el = el; this.opc = opc;
    this.alarmi = [];                 // { vrijeme, sifra, tekst, vrsta, aktivan, potvrdjen }
    this.bioAlarm = false; this.tRobot = 0; this.zadnjiAlarmi = '';
    const lamp = (id, t) => '<div class="hmi-lamp"><i data-h="' + id + '"></i><span>' + esc(t) + '</span></div>';
    el.innerHTML = '<div class="hmi-skala"><div class="hmi-str" id="hmi-str">' +
      '<div class="hmi-naslov"><span>STANICA IRB 120 · PALETIZACIJA</span><span data-h="sat"></span></div>' +
      '<div class="hmi-tijelo"><div class="hmi-lijevo">' +
      '<div class="hmi-tipke"><button type="button" class="hmi-g zelena" data-hmi="start">START</button><button type="button" class="hmi-g crvena" data-hmi="stop">STOP</button><button type="button" class="hmi-g siva" data-hmi="reset">RESET</button></div>' +
      '<div class="hmi-brojac"><span>KOMADA</span><b data-h="komada">0</b><small data-h="paleta">na paleti: — / —</small></div>' +
      '<div class="hmi-stanje stoji" data-h="stanje">CIKLUS STOJI</div></div>' +
      '<div class="hmi-desno">' +
      '<div class="hmi-grupa"><h4>Traka (ATV320)</h4>' + lamp('Q_TrakaNaprijed', 'Naprijed') + lamp('I_Fotocelija', 'Fotoćelija') + '<div class="hmi-vr" data-h="traka"></div></div>' +
      '<div class="hmi-grupa"><h4>Okretni stol (Lexium 32)</h4>' + lamp('I_StolUPoz', 'U poziciji') + lamp('Q_StolIndeks', 'Indeksiranje') + '<div class="hmi-vr" data-h="stol"></div></div>' +
      '<div class="hmi-grupa"><h4>Robot (IRC5)</h4>' + lamp('I_RobotSpreman', 'Spreman') + lamp('Q_PredmetSpreman', 'Predmet spreman') + lamp('I_RobotUzeo', 'Uzeo') + '</div>' +
      '</div></div>' +
      '<div class="hmi-alarmi"><div class="hmi-alarmi-h"><span>ALARMI I PORUKE</span><button type="button" data-hmi="potvrdi">POTVRDI</button></div><table><tbody data-h="alarmi"></tbody></table></div>' +
      '</div></div>';
    this.str = el.querySelector('#hmi-str');
    this.h = {}; el.querySelectorAll('[data-h]').forEach(e => { this.h[e.dataset.h] = e; });
    this.boje = { Q_TrakaNaprijed: '#2ecc40', I_Fotocelija: '#ffb300', I_StolUPoz: '#2ecc40', Q_StolIndeks: '#ffb300', I_RobotSpreman: '#2ecc40', Q_PredmetSpreman: '#2ecc40', I_RobotUzeo: '#ffb300' };
    this.str.addEventListener('click', (ev) => { const b = ev.target.closest('[data-hmi]'); if (b) this.tipka(b.dataset.hmi); });
    new ResizeObserver(() => this.skaliraj()).observe(el);
    this.skaliraj();
    setInterval(() => this.osvjezi(), 100);
    this.crtaj();
  }
  skaliraj() {
    const w = this.el.querySelector('.hmi-skala').clientWidth || 800, s = Math.min(1, w / 800);
    this.str.style.transform = 'scale(' + s + ')';
    this.el.querySelector('.hmi-skala').style.height = (480 * s) + 'px';
  }
  tipka(ime) {
    if (ime === 'start') { this.plc.impuls('I_HmiStart'); this.poruka('I01', 'Start ciklusa s HMI-ja', 'info'); }
    if (ime === 'stop') { this.plc.impuls('I_HmiStop'); this.poruka('I02', 'Stop ciklusa s HMI-ja', 'info'); }
    if (ime === 'reset') { this.plc.impuls('I_HmiReset'); this.alarmi.forEach(a => { a.potvrdjen = true; }); this.alarmi = this.alarmi.filter(a => a.aktivan).concat(this.alarmi.filter(a => !a.aktivan).slice(0, 3)); this.opc.naReset && this.opc.naReset(); }
    if (ime === 'potvrdi') { this.alarmi.forEach(a => { a.potvrdjen = true; }); }
    this.opc.naTipku && this.opc.naTipku(ime);
    this.crtaj();
  }
  poruka(sifra, tekst, vrsta) {
    const isti = this.alarmi.find(a => a.sifra === sifra && a.aktivan);
    if (isti) return isti;
    const a = { vrijeme: new Date(), sifra, tekst, vrsta: vrsta || 'alarm', aktivan: vrsta !== 'info', potvrdjen: vrsta === 'info' };
    this.alarmi.unshift(a); if (this.alarmi.length > 12) this.alarmi.pop();
    return a;
  }
  ugasi(sifra) { for (const a of this.alarmi) if (a.sifra === sifra && a.aktivan) a.aktivan = false; }
  osvjezi() {
    const p = this.plc;
    const alarm = !!p.citaj('M_Alarm'), ciklus = !!p.citaj('M_Ciklus'), robot = !!p.citaj('I_RobotSpreman');
    if (alarm && !this.bioAlarm) this.poruka('A01', 'Traka radi 30 s, a predmet nije stigao — provjeri dodavanje predmeta', 'alarm');
    if (!alarm && this.bioAlarm) this.ugasi('A01');
    this.bioAlarm = alarm;
    // upozorenje: ciklus radi, robot nije u programu dulje od 3 s
    this.tRobot = ciklus && !robot ? this.tRobot + 0.1 : 0;
    if (this.tRobot > 3 && !this.alarmi.some(a => a.sifra === 'W01' && a.aktivan)) this.poruka('W01', 'Robot nije spreman (DO_2_spreman = 0) — pokreni program paletizacije', 'upoz');
    if ((robot || !ciklus) && this.alarmi.some(a => a.sifra === 'W01' && a.aktivan)) this.ugasi('W01');
    this.crtaj();
  }
  crtaj() {
    const p = this.plc, st = this.opc.stanje ? this.opc.stanje() : {}, h = this.h;
    const tekst = (el, t) => { if (el.textContent !== t) el.textContent = t; };
    tekst(h.sat, st.sat || '');
    tekst(h.komada, String(p.v.C_Komadi || 0));
    tekst(h.paleta, 'na paleti: ' + (st.naPaleti !== undefined ? st.naPaleti : '—') + ' / ' + (st.kapacitet || '—'));
    const ciklus = !!p.citaj('M_Ciklus'), alarm = !!p.citaj('M_Alarm');
    const kl = 'hmi-stanje ' + (alarm ? 'alarm' : ciklus ? 'radi' : 'stoji');
    if (h.stanje.className !== kl) h.stanje.className = kl;
    tekst(h.stanje, alarm ? 'ALARM' : ciklus ? 'CIKLUS RADI' : 'CIKLUS STOJI');
    for (const id in this.boje) { const b = p.citaj(id) ? this.boje[id] : '#4a4a4a'; if (h[id].style.background !== b) h[id].style.background = b; }
    tekst(h.traka, 'Referenca: ' + (p.citaj('Q_TrakaBrzina') || 0) + ' % · ' + (st.trakaMms !== undefined ? st.trakaMms + ' mm/s' : ''));
    tekst(h.stol, 'Kut: ' + (st.stolKut !== undefined ? st.stolKut + '°' : '—') + ' · pozicija ' + (st.stolPoz !== undefined ? st.stolPoz : '—'));
    const al = this.alarmi.length ? this.alarmi.map(a => '<tr class="' + a.vrsta + (a.aktivan ? ' akt' : '') + (a.potvrdjen ? ' potv' : '') + '"><td>' + a.vrijeme.toLocaleTimeString('hr-HR') + '</td><td>' + esc(a.sifra) + '</td><td>' + esc(a.tekst) + '</td><td>' + (a.aktivan ? 'AKTIVAN' : 'otišao') + (a.potvrdjen ? '' : ' · nepotvrđen') + '</td></tr>').join('') : '<tr><td colspan="4">Nema alarma.</td></tr>';
    if (al !== this.zadnjiAlarmi) { h.alarmi.innerHTML = al; this.zadnjiAlarmi = al; }
  }
  stanje() { return { alarmi: this.alarmi.map(a => ({ sifra: a.sifra, aktivan: a.aktivan, potvrdjen: a.potvrdjen })), komada: this.plc.v.C_Komadi || 0, ciklus: !!this.plc.citaj('M_Ciklus') }; }
}
