/* FORTRONIQ · Mitsubishi Movemaster EX RV-M1 — veza s pravim robotom preko RS-232C (Web Serial: Chrome/Edge na računalu).
   Bez DOM-a. Postavke veze dolaze iz podaci.RS232 (9600 Bd, parni paritet, 7 bita, 2 stop-bita, kraj retka CR ili CR+LF).
   Sigurnost: modul odbija prvu naredbu gibanja dok korisnik ne potvrdi SIGURNOSNI_POPIS (potvrdiSigurnost); stranica prikazuje
   popis i traži izričitu potvrdu. Nikad se ništa ne šalje automatski. Ugovor: API_RVM1.md. © ForTroniQ d.o.o. */
import { RS232, NAREDBE } from './rvm1_podaci.js';

const NAR = Object.fromEntries(NAREDBE.map((n) => [n.kod, n]));

/** provjere prije prve naredbe gibanja (prikazuje ih stranica; korisnik potvrđuje svaku) */
export const SIGURNOSNI_POPIS = [
  { id: 'prostor', tekst: 'Radni prostor robota je prazan: nema ljudi, ruku, alata ni predmeta na putanji ruke.' },
  { id: 'emg', tekst: 'Tipka EMG. STOP (na DUM1 ili na privjesku) je na dohvat ruke i znaš je odmah pritisnuti.' },
  { id: 'privjesak', tekst: 'Preklopnik privjeska je na OFF — inače DUM1 odbija naredbe s računala.' },
  { id: 'nest', tekst: 'Nakon uključenja prva naredba gibanja je NT (NEST); robot se pritom giba sam (J2, J3, J4, zatim J1 i J5).' },
  { id: 'brzina', tekst: 'Brzina je mala: za prve probe SP 1–3 (pošalji npr. SP 2 prije MO). Veće brzine tek kad je putanja provjerena.' },
  { id: 'tocke', tekst: 'Pozicije su provjerene (PR, ili najprije u simulatoru) prije MO, MS i RN; nepoznatu točku ne šalji.' },
  { id: 'hand', tekst: 'Preklopnik HAND AC/DC na stražnjoj ploči odgovara prihvatnici (DC za motornu prihvatnicu).' },
  { id: 'kabeli', tekst: 'Kabeli MOTOR POWER, MOTOR SIGNAL i kabel prihvatnice su spojeni i ne smetaju gibanju ruke.' }
];
/** najveća preporučena brzina za prve probe */
export const PREPORUKA_SP = 3;

/** je li Web Serial dostupan (Chrome/Edge na računalu, HTTPS ili localhost) */
export function podrzano() {
  return typeof navigator !== 'undefined' && !!navigator.serial && typeof navigator.serial.requestPort === 'function';
}

/** kod naredbe izravnog retka ('MO 5' → 'MO'); programski redak (s brojem) → null */
export function kodNaredbe(tekst) {
  const s = String(tekst ?? '').trim().toUpperCase();
  if (/^\d/.test(s)) return null;
  if (s.startsWith("'")) return "'";
  const m = /^([A-Z]{2})/.exec(s);
  return m ? m[1] : null;
}
/** pokreće li naredba robot ili prihvatnicu (MO, MS, NT, RN, GC …) — takve traže potvrdu sigurnosnog popisa */
export function jeGibanje(tekst) { const k = kodNaredbe(tekst); return !!(k && NAR[k] && NAR[k].pomice); }
/** upozorenje za SP veći od preporučenog, inače null */
export function provjeriBrzinu(tekst) {
  const m = /^\s*SP\s*(\d+)/i.exec(String(tekst ?? ''));
  if (m && parseInt(m[1], 10) > PREPORUKA_SP) return 'SP ' + m[1] + ' je veći od preporučenih SP 1–' + PREPORUKA_SP + ' za prve probe s pravim robotom.';
  return null;
}

/** tekst → ASCII bajtovi (7-bitni; znakovi izvan ASCII-ja postaju „?”) */
function uBajtove(t) {
  const b = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); b[i] = c < 128 ? c : 63; }
  return b;
}

/**
 * Otvara serijski port (korisnik ga bira u pregledniku) i vraća vezu.
 * opcije: { baud, paritet:'even'|'odd'|'none', dataBits, stopBits, kraj:'CR'|'CR+LF', port?, serial?, filtri? }
 * → veza { posalji(tekst), citajRedak(timeoutMs), naPrimljeno(fn), prekini(), potvrdiSigurnost(ids?), sigurnostPotvrdena, dnevnik, postavke }
 */
export async function spoji(opcije = {}) {
  const o = {
    baud: RS232.baud, paritet: RS232.paritetWebSerial || 'even', dataBits: RS232.bitovi, stopBits: RS232.stop,
    kraj: RS232.kraj, flowControl: RS232.kontrolaToka === 'hardware' ? 'hardware' : 'none',
    ...opcije
  };
  const serial = o.serial || (typeof navigator !== 'undefined' ? navigator.serial : null);
  if (!o.port && (!serial || typeof serial.requestPort !== 'function')) throw new Error('Web Serial nije podržan: treba Chrome ili Edge na računalu.');
  const port = o.port || await serial.requestPort(o.filtri ? { filters: o.filtri } : {});
  await port.open({ baudRate: o.baud, dataBits: o.dataBits, stopBits: o.stopBits, parity: o.paritet, flowControl: o.flowControl, bufferSize: 4096 });

  const writer = port.writable.getWriter();
  const reader = port.readable.getReader();
  const linije = [], cekaci = [], slusaci = [], dnevnik = [];
  let buf = '', zadnjiCR = false, zatvoreno = false, sigurnost = false, greskaCitanja = null;

  function predaj(l) {
    dnevnik.push({ smjer: '<', tekst: l, vrijeme: Date.now() });
    slusaci.slice().forEach((fn) => { try { fn(l); } catch (e) { /* slušač ne smije srušiti vezu */ } });
    const c = cekaci.shift();
    if (c) { clearTimeout(c.t); c.res(l); } else linije.push(l);
  }
  const petlja = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const b of value || []) {
          const ch = String.fromCharCode(b & 0x7f);
          if (ch === '\r' || ch === '\n') {
            if (ch === '\n' && zadnjiCR) { zadnjiCR = false; continue; }
            zadnjiCR = ch === '\r';
            predaj(buf); buf = '';
          } else { zadnjiCR = false; buf += ch; }
        }
      }
    } catch (e) { greskaCitanja = e; } finally {
      zatvoreno = true;
      cekaci.splice(0).forEach((c) => { clearTimeout(c.t); c.res(null); });
    }
  })();

  const veza = {
    postavke: { ...o, port: undefined, serial: undefined },
    dnevnik,
    get sigurnostPotvrdena() { return sigurnost; },
    get zatvoreno() { return zatvoreno; },
    get greska() { return greskaCitanja; },
    /** korisnik je potvrdio sve stavke SIGURNOSNI_POPIS (ids = popis potvrđenih id-ova; bez argumenta = sve) */
    potvrdiSigurnost(ids) {
      const sve = SIGURNOSNI_POPIS.map((s) => s.id);
      const pot = Array.isArray(ids) ? ids : sve;
      const fali = sve.filter((id) => !pot.includes(id));
      if (fali.length) throw new Error('Nisu potvrđene sve sigurnosne provjere: ' + fali.join(', '));
      sigurnost = true;
      return true;
    },
    /** šalje jedan redak; dodaje CR ili CR+LF. Naredba gibanja prije potvrde sigurnosnog popisa baca pogrešku. */
    async posalji(tekst) {
      if (zatvoreno) throw new Error('Veza je zatvorena.');
      const t = String(tekst ?? '').replace(/[\r\n]+/g, ' ').trim();
      if (jeGibanje(t) && !sigurnost) throw new Error('Prije prve naredbe gibanja potvrdi sigurnosni popis.');
      const kraj = o.kraj === 'CR+LF' ? '\r\n' : '\r';
      await writer.write(uBajtove(t + kraj));
      dnevnik.push({ smjer: '>', tekst: t, vrijeme: Date.now() });
      return { poslano: t, upozorenje: provjeriBrzinu(t) };
    },
    /** sljedeći primljeni redak (bez CR/LF) ili null nakon timeoutMs */
    citajRedak(timeoutMs = 2000) {
      if (linije.length) return Promise.resolve(linije.shift());
      if (zatvoreno) return Promise.resolve(null);
      return new Promise((res) => {
        const c = { res };
        c.t = setTimeout(() => { const i = cekaci.indexOf(c); if (i >= 0) cekaci.splice(i, 1); res(null); }, timeoutMs);
        cekaci.push(c);
      });
    },
    /** šalje naredbu čitanja (WH, PR, CR, DR, ER, LR) i čeka odgovor */
    async upitaj(tekst, timeoutMs = 2000) { linije.length = 0; await veza.posalji(tekst); return veza.citajRedak(timeoutMs); },
    /** poziva fn(redak) za svaki primljeni redak; vraća funkciju za odjavu */
    naPrimljeno(fn) { slusaci.push(fn); return () => { const i = slusaci.indexOf(fn); if (i >= 0) slusaci.splice(i, 1); }; },
    /** zatvara port */
    async prekini() {
      if (zatvoreno && !port.readable) return;
      try { await reader.cancel(); } catch (e) { /* već zatvoreno */ }
      await petlja;
      try { reader.releaseLock(); } catch (e) { /* */ }
      try { writer.releaseLock(); } catch (e) { /* */ }
      try { await port.close(); } catch (e) { /* */ }
      zatvoreno = true;
    }
  };
  return veza;
}
