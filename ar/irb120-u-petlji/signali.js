// signali.js — JEDNA tablica signala robot ↔ PLC ↔ oprema stanice i sloj za pristup PLC-u.
// Sve što se o signalima prikazuje (FlexPendant Inputs and Outputs, ladder, HMI, tablica na stranici)
// crta se iz ovog popisa, pa se ime ili adresa mijenja samo ovdje.
//
// Smjer je gledan s PLC-a: 'I' = ulaz u PLC, 'Q' = izlaz iz PLC-a, 'QW' = riječ (analogna referenca).
// Polje `robot` je ime signala na strani robota (IRC5, I/O ploča DSQC 652 u simulatoru) ili null
// kad signal ne ide na robota (senzor, pretvarač, servo, HMI).
//
// KAKO SE OVO KASNIJE SPAJA NA PRAVI PLC (vidi i odjeljak „Kako spojiti pravi PLC kasnije“ na stranici):
//  1. Žičano DI/DO: svaki redak s `robot` ≠ null je jedna žica između I/O ploče IRC5 i I/O kartice PLC-a
//     (24 V DC). Simulirani PLC se zamjenjuje stvarnim; simulator tada samo prikazuje stanja.
//  2. Modbus TCP ili OPC UA: objekt `SucjeljePLC` dolje ima samo dvije operacije, citaj(ime) i pisi(ime, v).
//     Most (npr. mali Node.js ili Python servis koji govori Modbus TCP prema M262/M241 ili OPC UA prema S7-1200)
//     implementira te dvije operacije preko WebSocketa; u simulatoru se umjesto emulacije poziva
//     `postaviSucelje(mostObjekt)`. Adrese po profilu su u tablici ispod (schneider / siemens).
//  Opcije komunikacije kontrolera IRC5 (DeviceNet, PROFINET, EtherNet/IP…) NISMO provjerili na stvarnom
//  kontroleru — prvi korak je žičani DI/DO, koji sigurno postoji.

export const SIGNALI = [
  // ---- ulazi u PLC ----
  { id: 'I_Fotocelija',      smjer: 'I',  schneider: '%IX0.0', siemens: 'I0.0', generic: 'DI0', robot: null,                  izvor: 'fotoćelija (kraj trake)',  opis: 'Predmet ispred fotoćelije na kraju trake.' },
  { id: 'I_RobotUzeo',       smjer: 'I',  schneider: '%IX0.1', siemens: 'I0.1', generic: 'DI1', robot: 'DO_1_uzeo',           izvor: 'robot DO',                  opis: 'Robot javlja da je uzeo predmet s trake (impuls PulseDO).' },
  { id: 'I_RobotSpreman',    smjer: 'I',  schneider: '%IX0.2', siemens: 'I0.2', generic: 'DI2', robot: 'DO_2_spreman',        izvor: 'robot DO',                  opis: 'Robot izvodi program paletizacije i spreman je uzimati predmete.' },
  { id: 'I_RobotStolIndeks', smjer: 'I',  schneider: '%IX0.3', siemens: 'I0.3', generic: 'DI3', robot: 'DO_3_stol_indeks',    izvor: 'robot DO',                  opis: 'Robot traži okret stola za jednu poziciju (impuls).' },
  { id: 'I_StolUPoz',        smjer: 'I',  schneider: '%IX0.4', siemens: 'I0.4', generic: 'DI4', robot: null,                  izvor: 'Lexium 32 (status)',        opis: 'Okretni stol je u poziciji i miruje (servo pogon Lexium 32 + BSH0551).' },
  { id: 'I_HmiStart',        smjer: 'I',  schneider: '%MX0.0', siemens: 'M0.0', generic: 'HMI_START', robot: null,            izvor: 'HMI GTO2315',               opis: 'Tipka Start na HMI-ju (trenutačni signal preko mreže).' },
  { id: 'I_HmiStop',         smjer: 'I',  schneider: '%MX0.1', siemens: 'M0.1', generic: 'HMI_STOP', robot: null,             izvor: 'HMI GTO2315',               opis: 'Tipka Stop na HMI-ju.' },
  { id: 'I_HmiReset',        smjer: 'I',  schneider: '%MX0.2', siemens: 'M0.2', generic: 'HMI_RESET', robot: null,            izvor: 'HMI GTO2315',               opis: 'Tipka Reset na HMI-ju: brojač na 0, alarmi potvrđeni.' },
  // ---- izlazi iz PLC-a ----
  { id: 'Q_TrakaNaprijed',   smjer: 'Q',  schneider: '%QX0.0', siemens: 'Q0.0', generic: 'DO0', robot: null,                  cilj: 'ATV320 (LI1 naprijed)',       opis: 'Pretvarač ATV320: traka naprijed.' },
  { id: 'Q_TrakaBrzina',     smjer: 'QW', schneider: '%QW0',   siemens: 'QW64', generic: 'AO0', robot: null,                  cilj: 'ATV320 (AI1 / Modbus)',       opis: 'Referenca brzine trake, 0–100 % (riječ).' },
  { id: 'Q_PredmetSpreman',  smjer: 'Q',  schneider: '%QX0.1', siemens: 'Q0.1', generic: 'DO1', robot: 'DI_1_predmet',        cilj: 'robot DI',                    opis: 'Predmet miruje na kraju trake, robot ga smije uzeti (robot čeka WaitDI DI_1_predmet,1).' },
  { id: 'Q_StolIndeks',      smjer: 'Q',  schneider: '%QX0.2', siemens: 'Q0.2', generic: 'DO2', robot: null,                  cilj: 'M262 motion → Lexium 32',     opis: 'Naredba servo pogonu: okreni stol za jednu poziciju (360°/N).' },
  { id: 'Q_StolUPoz',        smjer: 'Q',  schneider: '%QX0.3', siemens: 'Q0.3', generic: 'DO3', robot: 'DI_2_stol_u_poz',     cilj: 'robot DI',                    opis: 'Stol u poziciji, proslijeđeno robotu (WaitDI DI_2_stol_u_poz,1).' },
  { id: 'Q_CiklusAktivan',   smjer: 'Q',  schneider: '%QX0.4', siemens: 'Q0.4', generic: 'DO4', robot: 'DI_0_ciklus',         cilj: 'robot DI',                    opis: 'Ciklus pokrenut s HMI-ja; robot smije raditi.' },
  { id: 'Q_LampaZelena',     smjer: 'Q',  schneider: '%QX0.5', siemens: 'Q0.5', generic: 'DO5', robot: null,                  cilj: 'signalna lampa',              opis: 'Zelena lampa: ciklus radi.' },
  { id: 'Q_LampaCrvena',     smjer: 'Q',  schneider: '%QX0.6', siemens: 'Q0.6', generic: 'DO6', robot: null,                  cilj: 'signalna lampa',              opis: 'Crvena lampa: alarm na stanici.' },
];

// Signali na strani robota (IRC5 Inputs and Outputs). DO_0_gripper ne ide na PLC: on upravlja prihvatnicom.
export const ROBOT_IO = [
  { ime: 'DI_0_ciklus',       tip: 'DI', opis: 'Ciklus aktivan (PLC Q_CiklusAktivan).' },
  { ime: 'DI_1_predmet',      tip: 'DI', opis: 'Predmet spreman na kraju trake (PLC Q_PredmetSpreman).' },
  { ime: 'DI_2_stol_u_poz',   tip: 'DI', opis: 'Okretni stol u poziciji (PLC Q_StolUPoz).' },
  { ime: 'DO_0_gripper',      tip: 'DO', opis: '1 = prsti zatvoreni (Set), 0 = otvoreni (Reset). Lokalno, ne ide na PLC.' },
  { ime: 'DO_1_uzeo',         tip: 'DO', opis: 'Impuls: predmet uzet s trake (PLC I_RobotUzeo).' },
  { ime: 'DO_2_spreman',      tip: 'DO', opis: 'Robot u programu paletizacije (PLC I_RobotSpreman).' },
  { ime: 'DO_3_stol_indeks',  tip: 'DO', opis: 'Impuls: zahtjev za okret stola (PLC I_RobotStolIndeks).' },
];

// Profili PLC-a: ime, adresa po profilu, naslov i izgled ladder dijagrama
export const PROFILI = {
  m262:   { ime: 'Schneider Modicon M262', model: 'TM262M15MESS8T', alat: 'EcoStruxure Machine Expert (Logic/Motion)', adresa: 'schneider', stil: 'schneider', napomena: 'Motion kontroler: servo os stola (Lexium 32) vodi se SERCOS III sabirnicom, ATV320 preko Modbus TCP ili žičano.' },
  m241:   { ime: 'Schneider Modicon M241', model: 'TM241CEC24R', alat: 'EcoStruxure Machine Expert', adresa: 'schneider', stil: 'schneider', napomena: 'Logički kontroler bez SERCOS-a: stol se indeksira žičanim signalima prema Lexiumu (impuls + status), ATV320 žičano ili Modbus.' },
  s71200: { ime: 'Siemens S7-1200', model: 'CPU 1214C', alat: 'TIA Portal (LAD)', adresa: 'siemens', stil: 'siemens', napomena: 'Isti program u LAD-u TIA Portala; adrese I0.x / Q0.x, tagovi s istim simboličkim imenima.' },
  gen:    { ime: 'Generički PLC', model: '—', alat: 'IEC 61131-3 LD', adresa: 'generic', stil: 'generic', napomena: 'Imena DI0…/DO0… bez proizvođača — za prijenos na bilo koji kontroler.' },
};

export function adresa(signal, profil) {
  const p = PROFILI[profil] || PROFILI.gen;
  return signal[p.adresa];
}
export function signal(id) { return SIGNALI.find(s => s.id === id) || null; }

// ---------------------------------------------------------------------------------
// Sučelje prema PLC-u: emulacija (plc.js) ili most prema stvarnom kontroleru.
// Obje strane rade samo s ovim objektom: stanica/robot čitaju izlaze PLC-a i pišu ulaze.
//   citaj(id)      -> trenutna vrijednost signala (0/1 ili broj za QW)
//   pisi(id, v)    -> postavi ULAZ PLC-a (senzor, robot DO, HMI tipka)
//   forsiraj(id,v) -> prisilna vrijednost (null = ukini); samo za vježbe
//   opis()         -> tekst o tome što je spojeno (emulacija / most)
// ---------------------------------------------------------------------------------
let sucelje = null;
export function postaviSucelje(s) { sucelje = s; }
export function SucjeljePLC() { return sucelje; }
