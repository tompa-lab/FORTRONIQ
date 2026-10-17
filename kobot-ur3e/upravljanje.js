/* FORTRONIQ · Kobot UR3e — Upravljanje robotom (simulator s nizovima koraka).
   Privjesak, zaslon i tekst su naši (nazivi kartica i gumba na engleskom kao na upravljanju); kinematika iz DH parametara UR3e.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviUR3e } from './ur3e_model.js?v=01';
import { DH, NAZIVI_ZGLOBOVA, fk, ik, ikTocka, pomnozi, inverz, rotVektor, rotIzVektora, provjeriGranice, dhMatrica } from './ur3e_kin.js?v=01';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = Math.PI / 180;
const kr = (v, d = 1) => { const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v; return x.toFixed(d).replace('-', '−'); };
const krz = (v, d = 1) => kr(v, d).replace('.', ',');
const stup = (r) => r / D;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ================================================================== */
/* 1. Podaci (vrijednosti iz lista podataka; ostalo je označeno)       */
/* ================================================================== */
const HOME = [0, -90, 0, -90, 0, 0].map((x) => x * D);
const POC = [0, -90, 90, -90, -90, 0].map((x) => x * D);       /* početna radna poza: alat okrenut prema stolu */
const Q9 = [30, -70, 80, -100, -90, 0];                          /* zadatak niza Kinematika (°) */
const TCP_Z = 0.100;                                             /* TCP hvataljke: 100 mm duž osi z alata (naša pretpostavka) */
const MASA_HV = 0.60;                                            /* masa hvataljke (naša pretpostavka) */
const KOCKA_A = [-0.32, -0.12], KOCKA_B = [-0.12, -0.32], KOCKA_POLA = 0.015;
const PREPREKA = { min: [-0.37, 0.0, 0.0], max: [-0.23, 0.06, 0.24] };  /* u KS robota, m */
const K_OPRUGA = 10;                                             /* N/mm — procjena sile na prepreku (pretpostavka) */
const V_RUCNI = 250;                                             /* mm/s — ručni način (list podataka / priručnik) */
const SIG_POC = { sila: 150, brzina: 1500, ravnina: { aktivna: false, h: 100 }, tri: false };
const PRST = { otvoren: 0.032, prazan: 0.012, kocka: 0.020 };    /* polovica razmaka prstiju (m) */
const ZADANO = { MoveJ: { v: 60, a: 80 }, MoveL: { v: 250, a: 1200 } };
const STOL_Y = -0.78;                                            /* pod u sceni: stol visok 780 mm (pretpostavka) */

/* ================================================================== */
/* 2. Nizovi i koraci: [uputa, pomoć, kod]                             */
/* ================================================================== */
const NIZOVI = [
  { id: 'pokretanje', grupa: 'Osnove', naziv: 'Pokretanje', koraci: [
    ['Uključi privjesak za učenje tipkom za napajanje i pričekaj da se pokrene korisničko sučelje.', 'Tipka za napajanje je na privjesku lijevo ispod zaslona. Upravljanje (računalo u ormaru) se pokreće zajedno s privjeskom; robot je zasad bez napajanja.', 'privjesak'],
    ['Otvori zaslon za pokretanje robota: dodirni crveni gumb „Power off” lijevo dolje na zaslonu.', 'Gumb u donjoj traci uvijek pokazuje stanje robota: Power off (bez napajanja), Idle (napajanje uključeno, kočnice zakočene), Normal (spreman za rad).', 'init'],
    ['Provjeri nosivost: na prirubnici je hvataljka mase 0,60 kg. Upiši 0.60 u polje Payload i potvrdi gumbom Set.', 'Upravljanje mora znati masu alata — iz nje računa kompenzaciju gravitacije i procjenu sile. Kriva nosivost znači da robot pri slobodnom vođenju „pada” ili „diže se” i da sigurnosne funkcije reagiraju krivo. UR3e nosi najviše 3 kg.', 'payload'],
    ['Uključi napajanje robota gumbom ON.', 'Ormar daje napon motorima zglobova; robot prelazi u stanje Idle. Kočnice su još zakočene.', 'on'],
    ['Otpusti kočnice gumbom START. Gledaj zglobove u 3D prikazu: pri otpuštanju se malo trznu („Brake release”).', 'Pri otpuštanju svaki zglob se malo pomakne da se zatik kočnice izvuče iz krilca na vratilu motora — zato se čuje klik i vidi trzaj. Upravljanje pri tom provjerava i kočnice.', 'start'],
    ['Robot je u stanju Normal. Zatvori zaslon za pokretanje gumbom Exit.', 'Gumb Exit je na dnu prozora.', 'exit'],
    ['Kraj niza „Pokretanje”. Odaberi sljedeći niz.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'zglobovi', grupa: 'Osnove', naziv: 'Ručno pomicanje po zglobovima', koraci: [
    ['Otvori karticu Move.', 'Kartice su u gornjoj traci zaslona.', 'move'],
    ['Okreni zglob Base na +45° (±1°).', 'Drži gumb + uz Base. Robot se giba samo dok držiš gumb. Brzinu mijenjaš klizačem Speed u donjoj traci.', 'base45'],
    ['Zakreni rame (Shoulder) na −60° (±1°).', 'Shoulder diže i spušta nadlakticu. Pazi na stol: ako robot dotakne stol, slijedi zaštitno zaustavljanje.', 'sh60'],
    ['Okreni zglob Wrist 3 na +90° (±1°).', 'Wrist 3 okreće prirubnicu s hvataljkom. Prema listu podataka taj zglob nema graničnik (beskonačna vrtnja), a ostali imaju ±360°.', 'w390'],
    ['Upiši kut lakta (Elbow) 60 u polje uz Elbow i potvrdi tipkom Enter — robot će sam doći u taj položaj.', 'Polje s kutom se može urediti; nakon potvrde robot zglobno ide do upisanog kuta.', 'el60'],
    ['Vrati robota u početni položaj: drži gumb Home dok robot ne stane.', 'Home je položaj spremljen u instalaciji — ovdje robot uspravno (Shoulder −90°, Wrist 1 −90°, ostali 0°).', 'home'],
    ['Kraj niza „Ručno pomicanje po zglobovima”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'alat', grupa: 'Osnove', naziv: 'Pomicanje alata u Base i Tool', koraci: [
    ['Otvori karticu Move i odaberi koordinatni sustav Base (Feature).', 'Sustav Base ima ishodište u sredini podnožja robota, a os Z je os zgloba Base. Pogledaj osi u 3D prikazu.', 'base'],
    ['U sustavu Base pomakni alat 50 mm gore (+Z), bez pomaka u X i Y (±3 mm).', 'Drži gumb +Z. Pri gibanju alata svih šest zglobova se giba zajedno — upravljanje u svakom trenutku računa inverznu kinematiku.', 'gore50'],
    ['Pomakni alat 40 mm u smjeru −Y baze.', 'Gumbi −Y i +Y. Prikaz Y u kartici se smanjuje.', 'y40'],
    ['Zakreni alat oko osi Z baze za najmanje 30° (gumbi RZ).', 'Pri zakretu TCP ostaje na mjestu, a mijenja se samo orijentacija — rotacijski vektor rx, ry, rz.', 'rz30'],
    ['Prebaci koordinatni sustav na Tool.', 'U sustavu Tool osi su vezane uz alat: os Z alata ide iz prirubnice prema prstima hvataljke.', 'tool'],
    ['U sustavu Tool pomakni alat 30 mm duž osi Z alata (+Z). Gledaj kamo ide.', 'Alat je okrenut prema stolu, pa +Z alata znači prema dolje — isti gumb, suprotan smjer nego u sustavu Base.', 'toolz30'],
    ['Kraj niza „Pomicanje alata u Base i Tool”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'freedrive', grupa: 'Osnove', naziv: 'Slobodno vođenje', koraci: [
    ['Uključi slobodno vođenje gumbom Freedrive na boku privjeska.', 'Na stvarnom privjesku gumb je na stražnjoj strani i drži se cijelo vrijeme vođenja; robot se tada vodi rukom jer upravljanje kompenzira gravitaciju. U simulatoru se uključuje klikom.', 'fdOn'],
    ['Povuci robota mišem za alat (ili prstom) u 3D prikazu i pomakni TCP za najmanje 100 mm.', 'U načinu Free pomiču se svi zglobovi, a orijentacija alata se slobodno mijenja. Ako mišem povučeš pored robota, okreće se pogled. Mogu se rabiti i gumbi kartice Move.', 'fd100'],
    ['U kartici Move odaberi način slobodnog vođenja Plane.', 'Plane: alat se giba samo u vodoravnoj ravnini; visina i orijentacija ostaju.', 'plane'],
    ['Povuci alat u ravnini najmanje 60 mm — visina se ne smije promijeniti (±2 mm).', 'Povlači robota za alat.', 'plane60'],
    ['Odaberi način Rotation i zakreni alat za najmanje 30°.', 'Rotation: TCP ostaje na mjestu, mijenja se samo orijentacija. Povuci mišem lijevo-desno ili gore-dolje.', 'rot30'],
    ['Isključi slobodno vođenje (pusti gumb Freedrive).', 'Kad pustiš gumb, robot ostaje u položaju; zglobovi drže položaj motorima.', 'fdOff'],
    ['Kraj niza „Slobodno vođenje”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'program', grupa: 'Programiranje', naziv: 'Točke puta i program MoveJ', koraci: [
    ['Otvori karticu Program.', 'Program je stablo naredbi; na vrhu je Robot Program.', 'program'],
    ['Dodaj naredbu Move (gumb Move ispod stabla).', 'Nastaje naredba MoveJ s jednom točkom puta Waypoint_1. Točka je crvena dok nije postavljena.', 'dodajMove'],
    ['Pomakni robota u neki položaj (kartica Move ili Freedrive), vrati se u Program, odaberi Waypoint_1 i dodirni Set waypoint.', 'Set waypoint sprema trenutnu pozu robota (kutove svih šest zglobova i položaj alata).', 'wp1'],
    ['Odaberi naredbu MoveJ i dodaj drugu točku gumbom Add waypoint.', 'Nova točka Waypoint_2 dodaje se na kraj naredbe MoveJ.', 'wp2dodan'],
    ['Pomakni robota najmanje 100 mm dalje i postavi Waypoint_2 (Set waypoint).', 'Između dviju točaka mora biti barem 100 mm, da se gibanje dobro vidi.', 'wp2'],
    ['Pokreni program gumbom Play (▶) u donjoj traci.', 'Robot najprije ide do prve točke, zatim do druge. Pokazivač u stablu pokazuje naredbu koja se izvodi, a u 3D prikazu ostaje narančasta putanja alata.', 'play'],
    ['Pričekaj da program završi.', 'Pause zaustavlja program uz zadržani položaj, Stop ga prekida.', 'progKraj'],
    ['Kraj niza „Točke puta i program MoveJ”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'movel', grupa: 'Programiranje', naziv: 'MoveL i usporedba putanja', koraci: [
    ['Program s naredbom MoveJ i dvjema točkama je pripremljen. Pokreni ga (Play) i pričekaj kraj.', 'MoveJ interpolira kutove zglobova: svi zglobovi krenu i stanu zajedno, a alat ide po luku (narančasta putanja).', 'krajJ'],
    ['U kartici Program odaberi naredbu MoveJ i promijeni je u MoveL.', 'Odaberi MoveJ u stablu, zatim desno MoveL. Brzina se tada zadaje u mm/s (alat), ne u °/s (zglobovi).', 'uMoveL'],
    ['Pokreni program ponovno i pričekaj kraj.', 'MoveL vodi TCP po pravcu (plava putanja): upravljanje u svakom koraku računa inverznu kinematiku.', 'krajL'],
    ['Usporedi putanje u 3D prikazu (pogled Odozgo). Koja je kraća za alat, a koja za zglobove? Kad razmisliš, klikni Dalje.', 'MoveL je najkraći put za alat (pravac), ali zglobovi se pri tom gibaju složenije. MoveJ je najkraći put u zglobovima — obično je brži i daleko od singularnih položaja, pa se rabi za prijelaze kroz slobodan prostor. MoveL se rabi za prilaz predmetu i odmak od njega.', 'dalje'],
    ['Kraj niza „MoveL i usporedba putanja”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'uzmi', grupa: 'Programiranje', naziv: 'Uzmi i ostavi s hvataljkom', koraci: [
    ['Otvori karticu I/O i uključi alatni izlaz DO0 — hvataljka se zatvara.', 'Hvataljka je spojena na alatni priključak na prirubnici: DO0 = On zatvara prste, DO0 = Off ih otvara (naša pretpostavka o spoju).', 'do0on'],
    ['Isključi DO0 — hvataljka se otvara.', 'Ulaz DI1 javlja da je hvataljka otvorena, a DI0 da drži predmet.', 'do0off'],
    ['U kartici Program je pripremljen program bez hvatanja. Odaberi Waypoint_2 (kod kocke) i dodaj iza nje naredbu Set: Tool DO0 = On.', 'Gumb Set ispod stabla dodaje naredbu iza odabrane. Desno odaberi izlaz Tool DO0 i vrijednost On.', 'setOn'],
    ['Iza naredbe Set dodaj Wait od najmanje 0,5 s, da se hvataljka stigne zatvoriti.', 'Bez čekanja robot krene gore prije nego što prsti stisnu kocku. Prstima treba oko 0,4 s.', 'wait'],
    ['Odaberi Waypoint_5 (kod odlagališta) i iza nje dodaj Set: Tool DO0 = Off (i po želji Wait).', 'Pazi da je to izlaz DO0 i vrijednost Off.', 'setOff'],
    ['Pokreni program. Kocka mora završiti na zelenom odlagalištu.', 'Ako ne uspije, gumb „Vrati kocku” ispod 3D prikaza vraća kocku, a program se može ispraviti i pokrenuti ponovno.', 'kockaB'],
    ['Kraj niza „Uzmi i ostavi s hvataljkom”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'sigurnost', grupa: 'Sigurnost', naziv: 'Sigurnost: ravnina, brzina, sila, zaustavljanje', koraci: [
    ['Otvori karticu Installation i stavku Safety › Robot Limits.', 'Sigurnosne granice provodi sigurnosni sustav robota neovisno o programu (UR3e ima 23 podesive sigurnosne funkcije, PLd kategorija 3).', 'instalacija'],
    ['Postavi granicu sile na 100 N i granicu brzine TCP-a na 500 mm/s, pa potvrdi gumbom Apply.', 'Na stvarnom robotu sigurnosne postavke čuva lozinka, a promjena mijenja kontrolni zbroj (checksum).', 'limiti'],
    ['U stavci Planes uključi sigurnosnu ravninu na visini 100 mm iznad stola i potvrdi Apply.', 'Ravnina se prikaže u 3D prikazu. TCP mora ostati iznad nje.', 'ravnina'],
    ['U kartici Move spuštaj alat (−Z u sustavu Base) dok ga sigurnosna ravnina ne zaustavi.', 'Kad TCP dotakne ravninu, slijedi zaštitno zaustavljanje (Protective stop).', 'zRavnina'],
    ['Potvrdi zaustavljanje gumbom Enable robot.', 'Zaštitno zaustavljanje je kategorija 2: robot stane, a napajanje pogona ostaje uključeno, pa se rad nastavlja odmah nakon potvrde.', 'enable'],
    ['Pomiči alat vodoravno (+Y u sustavu Base) prema crvenoj prepreci dok ga ne zaustavi granica sile.', 'Procjena sile raste kako alat pritišće prepreku; pri 100 N robot staje. Silu vidiš u kartici Move.', 'zSila'],
    ['Potvrdi zaustavljanje (Enable robot) i odmakni alat od prepreke (−Y).', 'Robot se nakon potvrde smije gibati; odmakni ga barem malo.', 'odmak'],
    ['Pritisni gljivu za nužno zaustavljanje (E-stop) na privjesku.', 'E-stop je kategorija 1: robot se kontrolirano zaustavi, zatim se isključi napajanje motora i zakoče kočnice.', 'estop'],
    ['Otpusti gljivu i ponovno pokreni robota: zaslon za pokretanje, ON, START.', 'Nakon nužnog zaustavljanja robot je bez napajanja — treba ga ponovno uključiti i otpustiti kočnice.', 'ponovo'],
    ['U Installation › Hardware uključi uređaj 3PE i potvrdi Apply. Zatim u kartici Move pomakni robota držeći 3PE u srednjem položaju.', 'Gumb 3PE na boku privjeska mijenja položaj: pušten → lagano pritisnut → jako pritisnut. U ručnom načinu robot se giba samo kad je 3PE lagano pritisnut; pušten ili jako pritisnut znači zaustavljanje.', 'tri'],
    ['Prebaci način rada u Automatic (gumb u gornjoj traci zaslona).', 'U ručnom načinu (Manual) TCP ne smije brže od 250 mm/s. U automatskom načinu vrijede granice iz instalacije; 3PE tada ne treba držati.', 'auto'],
    ['Kraj niza „Sigurnost”.', 'Klikni „Izbornik” ili odaberi sljedeći niz.', 'kraj']] },
  { id: 'kinematika', grupa: 'Kinematika', naziv: 'Kinematika: provjeri položaj DH tablicom', koraci: [
    ['Postavi zglobove na Base 30°, Shoulder −70°, Elbow 80°, Wrist 1 −100°, Wrist 2 −90°, Wrist 3 0° (upiši kutove u kartici Move).', 'Svaki kut upiši u polje uz zglob i potvrdi tipkom Enter. Položaj alata je skriven dok ne riješiš zadatak.', 'kut9'],
    ['Iz DH tablice izračunaj X, Y i Z prirubnice (mm) i upiši ih u polja ispod tablice, pa klikni Provjeri.', 'Pomnoži T = T1·T2·…·T6, gdje je Ti = Rotz(θi)·Transz(di)·Transx(ai)·Rotx(αi). Zadnji stupac matrice T su X, Y, Z. Za UR postoji i zatvoreni oblik (si = sin θi, c23 = cos(θ2+θ3), s234 = sin(θ2+θ3+θ4) itd.): x1 = a2·c2 + a3·c23 + d5·s234 − d6·s5·c234; X = c1·x1 + s1·(d4 + d6·c5); Y = s1·x1 − c1·(d4 + d6·c5); Z = d1 + a2·s2 + a3·s23 − d5·c234 − d6·s5·s234. Pazi: a2 i a3 su negativni. Dopušteno odstupanje je ±1 mm.', 'dh'],
    ['Točno! Usporedi s prikazom na privjesku: upravljanje prikazuje TCP, koji je 100 mm dalje duž osi z alata. Klikni Dalje.', 'TCP = T · Transz(100 mm). Zato se Z na privjesku razlikuje od Z prirubnice kad alat nije okomit.', 'dalje'],
    ['Kraj niza „Kinematika”. Čestitamo — prošao si sve nizove!', 'Klikni „Izbornik”.', 'kraj']] }
];

/* ================================================================== */
/* 3. Stanje                                                          */
/* ================================================================== */
const st = {};
let idBr = 1, wpBr = 1;
const noviId = () => idBr++;
function prazanProgram(ime) { return { ime, korijen: { id: noviId(), tip: 'root', djeca: [] }, sel: null }; }
function pocetnoStanje() {
  Object.assign(st, {
    privjesak: 'on', bootT: 0, stanje: 'normal', prijelazT: 0, estop: false, estopDlg: false, initOtvoren: false,
    zastoj: null, payload: MASA_HV, payloadUnos: MASA_HV,
    q: POC.slice(), qPrev: POC.slice(), qV: [0, 0, 0, 0, 0, 0], kocenje: 0,
    tab: 'Run', instSub: 'tcp', feature: 'Base', brz: 1, ubrzanje: st.ubrzanje || 1,
    jog: null, auto: null, freedrive: false, fdNacin: 'Free', fdCilj: null, fdVuce: false,
    nacin: 'Manual', tri: 'pusten', sig: JSON.parse(JSON.stringify(SIG_POC)), sigUred: JSON.parse(JSON.stringify(SIG_POC)),
    io: { do: [false, false], di: [false, true] }, hv: { s: PRST.otvoren, drzi: false },
    kocka: { p: [KOCKA_A[0], KOCKA_A[1], KOCKA_POLA], yaw: 0, uRuci: false, rel: null, vz: 0 },
    prepreka: false, sila: 0, vTcp: 0, log: [], izv: null, trebaCrtati: false,
    dhUnos: ['', '', ''], skrij: false
  });
  idBr = 1; wpBr = 1;
  st.prog = prazanProgram('vjezba.urp');
}
pocetnoStanje();
let niz = null, korak = 0, gotovi = new Set();
try { JSON.parse(localStorage.getItem('ftq-ur3e-gotovi') || '[]').forEach((x) => gotovi.add(x)); } catch (e) { /* bez spremanja */ }
function spremiGotove() { try { localStorage.setItem('ftq-ur3e-gotovi', JSON.stringify([...gotovi])); } catch (e) { /* bez spremanja */ } }

/* ================================================================== */
/* 4. Kinematika TCP-a i pomoćne funkcije                              */
/* ================================================================== */
const ALAT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, TCP_Z, 0, 0, 0, 1];
const ALAT_INV = inverz(ALAT);
const tcpT = (q) => pomnozi(fk(q).T, ALAT);
const R9 = (T) => [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]];
const pT = (T) => [T[3], T[7], T[11]];
function mulR(A, B) { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[3 * i + j] = A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j]; return C; }
const trR = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
const sastavi = (R, p) => [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1];
const rvIzR = (R) => rotVektor(sastavi(R, [0, 0, 0]));
const kutR = (A, B) => { const v = rvIzR(mulR(A, trR(B))); return Math.hypot(v[0], v[1], v[2]); };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function ikTcp(Ttcp, q0, skok = 0.35) {
  const r = ik(pomnozi(Ttcp, ALAT_INV), q0, { najveciSkok: skok });
  if (!r.uspjeh) return null;
  let d = 0; for (let i = 0; i < 6; i++) d = Math.max(d, Math.abs(r.q[i] - q0[i]));
  return d <= skok * 1.5 ? r.q : null;
}
function tockeAlata(T6) {             /* točke hvataljke za provjeru sudara (u KS robota) */
  const s = st.hv.s, P = (x, y, z) => [T6[0] * x + T6[1] * y + T6[2] * z + T6[3], T6[4] * x + T6[5] * y + T6[6] * z + T6[7], T6[8] * x + T6[9] * y + T6[10] * z + T6[11]];
  return [[P(0, 0, 0.03), 0.04], [P(s, 0, 0.08), 0.007], [P(-s, 0, 0.08), 0.007], [P(s, 0, 0.105), 0.005], [P(-s, 0, 0.105), 0.005]];
}
/* provjera sudara: stol (krut), prepreka (procjena sile), sigurnosna ravnina (TCP) */
function provjeriSudar(q) {
  const { okviri } = fk(q);
  const o = okviri.map((T) => pT(T));
  const kugle = [];
  const seg = (a, b, r) => { for (let k = 0; k <= 6; k++) { const t = k / 6; kugle.push([[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], r]); } };
  seg(o[1], o[2], 0.045); seg(o[2], o[3], 0.038); seg(o[3], o[4], 0.034); seg(o[4], o[5], 0.034); seg(o[5], o[6], 0.034);
  tockeAlata(okviri[6]).forEach((k) => kugle.push(k));
  for (const [p, r] of kugle) if (p[2] - r < -0.0005) return { zaustavi: true, razlog: 'stol', sila: 0 };
  let sila = 0;
  if (st.prepreka) {
    for (const [p, r] of kugle) {
      const c = [0, 1, 2].map((i) => clamp(p[i], PREPREKA.min[i], PREPREKA.max[i]));
      const unutra = c[0] === p[0] && c[1] === p[1] && c[2] === p[2];
      let delta;
      if (unutra) { let m = Infinity; for (let i = 0; i < 3; i++) m = Math.min(m, p[i] - PREPREKA.min[i], PREPREKA.max[i] - p[i]); delta = r + m; }
      else delta = r - dist(p, c);
      if (delta > 0) sila = Math.max(sila, K_OPRUGA * delta * 1000);
    }
    if (sila > st.sig.sila) return { zaustavi: true, razlog: 'sila', sila };
  }
  if (st.sig.ravnina.aktivna) {
    const T = pomnozi(okviri[6], ALAT);
    if (T[11] < st.sig.ravnina.h / 1000) return { zaustavi: true, razlog: 'ravnina', sila };
  }
  return { zaustavi: false, sila };
}
function granicaBrzine() { return Math.min(st.sig.brzina, st.nacin === 'Manual' ? V_RUCNI : Infinity); }  /* mm/s */
function mozeGibati(tiho) {
  let r = null;
  if (st.privjesak !== 'on') r = 'Privjesak je isključen.';
  else if (st.estop) r = 'Gljiva za nužno zaustavljanje je pritisnuta.';
  else if (st.stanje === 'zastoj') r = 'Robot je u zaštitnom zaustavljanju — potvrdi gumbom Enable robot.';
  else if (st.stanje !== 'normal') r = 'Robot nije spreman (stanje ' + nazivStanja() + '). Pokreni ga na zaslonu za pokretanje: ON, zatim START.';
  else if (st.sig.tri && st.nacin === 'Manual' && st.tri !== 'lagano') r = st.tri === 'jako' ? '3PE je jako pritisnut — zaustavljanje. Pusti ga do srednjeg položaja.' : 'U ručnom načinu drži 3PE u srednjem položaju (lagano pritisnut).';
  if (r && !tiho) info(r);
  return !r;
}
/* primijeni novu pozu: granice, sudar, sigurnosne funkcije */
function primijeni(qn) {
  const izvan = provjeriGranice(qn);
  if (izvan.length) { info('Zglob ' + NAZIVI_ZGLOBOVA[izvan[0]] + ' je na granici ±360°.'); return false; }
  const s = provjeriSudar(qn);
  st.sila = s.sila;
  if (s.zaustavi) { zastoj(s.razlog, s.sila); return false; }
  st.q = qn;
  return true;
}
/* ograničenje brzine TCP-a: vrati faktor ≤ 1 za zadani pomak */
function faktorBrzine(q0, q1, dtR) {
  if (dtR <= 0) return 1;
  const v = dist(pT(tcpT(q0)), pT(tcpT(q1))) / dtR * 1000;
  const g = granicaBrzine();
  return v > g ? g / v : 1;
}

/* ================================================================== */
/* 5. Scena                                                           */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.02, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(-1.5, 3, 2); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.45); sun2.position.set(2, 1.5, -2); scene.add(sun2);
/* pod i stol */
const pod = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.95 }));
pod.rotation.x = -Math.PI / 2; pod.position.y = STOL_Y; scene.add(pod);
const mreza = new THREE.GridHelper(6, 30, 0x7d878c, 0x8c969b); mreza.position.y = STOL_Y + 0.001; scene.add(mreza);
const stol = new THREE.Group(); scene.add(stol);
const mStol = new THREE.MeshStandardMaterial({ color: 0xc8b597, roughness: 0.7 });
const mNoge = new THREE.MeshStandardMaterial({ color: 0x5d666c, roughness: 0.5, metalness: 0.4 });
const ploca = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.86), mStol); ploca.position.set(0.17, -0.02, 0.1); stol.add(ploca);
for (const [x, z] of [[-0.78, -0.28], [1.12, -0.28], [-0.78, 0.48], [1.12, 0.48]]) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.05, -STOL_Y - 0.04, 0.05), mNoge); n.position.set(x, (STOL_Y - 0.04) / 2, z); stol.add(n); }
/* robot (zajednički model) */
const M = napraviUR3e(THREE, {});
scene.add(M.korijen);
/* upravljački ormar, privjesak i kabel stoje na istom stolu kao robot (kako ih postavlja model) */
/* koordinatni sustav robota u sceni (x_s = x_r, y_s = z_r, z_s = −y_r) */
const rob = new THREE.Group(); rob.rotation.x = -Math.PI / 2; scene.add(rob);
const osiBaze = new THREE.Group(); rob.add(osiBaze);
[[0xd23b2e, [1, 0, 0]], [0x1d9e4b, [0, 1, 0]], [0x2f6fd6, [0, 0, 1]]].forEach(([c, v]) => {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.002), new THREE.Vector3(v[0] * 0.22, v[1] * 0.22, v[2] * 0.22 + 0.002)]);
  osiBaze.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true })));
  const kon = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 12), new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true }));
  kon.position.set(v[0] * 0.22, v[1] * 0.22, v[2] * 0.22 + 0.002); kon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...v)); kon.renderOrder = 3; osiBaze.add(kon);
});
osiBaze.children.forEach((c) => { c.renderOrder = 3; });
/* putanja alata */
const PUT_MAX = 6000;
const putPos = new Float32Array(PUT_MAX * 3), putBoja = new Float32Array(PUT_MAX * 3);
const putGeo = new THREE.BufferGeometry();
putGeo.setAttribute('position', new THREE.BufferAttribute(putPos, 3)); putGeo.setAttribute('color', new THREE.BufferAttribute(putBoja, 3)); putGeo.setDrawRange(0, 0);
const putanja = new THREE.LineSegments(putGeo, new THREE.LineBasicMaterial({ vertexColors: true })); putanja.frustumCulled = false; rob.add(putanja);
let putN = 0, putZadnja = null;
const BOJA_J = new THREE.Color(0xe07b00), BOJA_L = new THREE.Color(0x1a8fd6);
function dodajPut(p, vrsta) {
  if (putZadnja && putZadnja.vrsta === vrsta && dist(putZadnja.p, p) < 0.0015) return;
  if (putZadnja && putZadnja.vrsta === vrsta && putN < PUT_MAX - 2) {
    const c = vrsta === 'MoveL' ? BOJA_L : BOJA_J;
    putPos.set(putZadnja.p, 3 * putN); putPos.set(p, 3 * putN + 3);
    putBoja.set([c.r, c.g, c.b], 3 * putN); putBoja.set([c.r, c.g, c.b], 3 * putN + 3);
    putN += 2; putGeo.setDrawRange(0, putN); putGeo.attributes.position.needsUpdate = true; putGeo.attributes.color.needsUpdate = true;
  }
  putZadnja = { p: p.slice(), vrsta };
}
function obrisiPut() { putN = 0; putZadnja = null; putGeo.setDrawRange(0, 0); }
/* hvataljka (jednostavna, naša) na prirubnici */
const hvat = new THREE.Group(); M.tcp.add(hvat);
const mHv = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.5, metalness: 0.3 });
const mPrst = new THREE.MeshStandardMaterial({ color: 0x8c969c, roughness: 0.4, metalness: 0.5 });
const hvPloca = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 24), mHv); hvPloca.rotation.x = Math.PI / 2; hvPloca.position.z = 0.004; hvat.add(hvPloca);
const hvTijelo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.047), mHv); hvTijelo.position.z = 0.0315; hvat.add(hvTijelo);
const prsti = [1, -1].map((sg) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.022, 0.056), mPrst); p.position.set(sg * PRST.otvoren, 0, 0.083); hvat.add(p); return p; });
/* kocka i odlagalište */
const kocka = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0xf2a516, roughness: 0.45 })); rob.add(kocka);
const odl = new THREE.Group(); rob.add(odl);
{ const m = new THREE.MeshBasicMaterial({ color: 0x1d9e4b }); const s = 0.05, t = 0.004;
  [[0, s / 2, s + t, t], [0, -s / 2, s + t, t], [s / 2, 0, t, s], [-s / 2, 0, t, s]].forEach(([x, y, w, h]) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); r.position.set(x, y, 0.0006); odl.add(r); });
  odl.position.set(KOCKA_B[0], KOCKA_B[1], 0); }
/* prepreka i sigurnosna ravnina */
const prepreka = new THREE.Mesh(new THREE.BoxGeometry(PREPREKA.max[0] - PREPREKA.min[0], PREPREKA.max[1] - PREPREKA.min[1], PREPREKA.max[2] - PREPREKA.min[2]), new THREE.MeshStandardMaterial({ color: 0xd2453a, roughness: 0.6, transparent: true, opacity: 0.85 }));
prepreka.position.set((PREPREKA.max[0] + PREPREKA.min[0]) / 2, (PREPREKA.max[1] + PREPREKA.min[1]) / 2, (PREPREKA.max[2] + PREPREKA.min[2]) / 2); rob.add(prepreka);
const ravnina = new THREE.Group(); rob.add(ravnina);
{ const g = new THREE.PlaneGeometry(0.9, 0.9); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xe0442f, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); ravnina.add(m);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xe0442f })); ravnina.add(e); ravnina.position.set(-0.2, -0.15, 0.1); }
/* pogledi */
const POGLEDI = {
  robot: { p: [-1.0, 0.68, 0.86], t: [-0.12, 0.2, 0.12] },
  odozgo: { p: [-0.16, 1.45, 0.17], t: [-0.16, 0, 0.16] },
  sprijeda: { p: [-1.45, 0.32, 0.18], t: [-0.1, 0.2, 0.15] },
  stanica: { p: [-0.75, 1.25, 2.05], t: [0.2, -0.05, 0.05] }
};
function pogled(ime) { const v = POGLEDI[ime]; camera.position.set(...v.p); controls.target.set(...v.t); controls.update(); }
pogled('robot');

let qVis = st.q.slice();
function postavi3D() {
  /* trzaj pri otpuštanju kočnica (samo prikaz) */
  qVis = st.q.slice();
  if (st.stanje === 'otpustanje') { const t = 1 - st.prijelazT / 1.0; const a = 0.7 * D * Math.exp(-4 * t) * (t > 0.08 ? 1 : 0); for (let i = 0; i < 6; i++) qVis[i] += a * Math.sin(38 * t + i * 1.3); }
  M.postavi(qVis);
  prsti[0].position.x = st.hv.s; prsti[1].position.x = -st.hv.s;
  /* kocka */
  const k = st.kocka;
  kocka.position.set(k.p[0], k.p[1], k.p[2]); kocka.rotation.set(0, 0, k.yaw);
  prepreka.visible = st.prepreka;
  ravnina.visible = st.sig.ravnina.aktivna; ravnina.position.z = st.sig.ravnina.h / 1000;
}

/* ================================================================== */
/* 6. Stanja robota, zaustavljanja, dnevnik                            */
/* ================================================================== */
let vrijemeSim = 0;
function zapis(razina, tekst) {
  const s = Math.floor(vrijemeSim); st.log.unshift({ t: String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'), razina, tekst });
  if (st.log.length > 60) st.log.pop();
}
function nazivStanja() {
  if (st.privjesak !== 'on') return 'Off';
  if (st.estop) return 'Emergency stop';
  return { poweroff: 'Power off', paljenje: 'Booting', idle: 'Idle', otpustanje: 'Brake release', normal: 'Normal', zastoj: 'Protective stop' }[st.stanje] || st.stanje;
}
const TEKST_ZASTOJ = {
  stol: 'Sudar: robot je dotaknuo stol. Sila u zglobovima premašila je dopušteno odstupanje.',
  sila: 'Granica sile TCP-a je premašena (alat pritišće prepreku).',
  ravnina: 'TCP je dotaknuo sigurnosnu ravninu (granica položaja TCP-a).',
  ik: 'Gibanje nije izvedivo: cilj je izvan dosega ili je robot u singularnom položaju.'
};
function zaustaviGibanja() {
  st.jog = null; st.auto = null; st.fdCilj = null;
  if (st.izv) { st.izv.pauza = true; }
}
function zastoj(razlog, sila) {
  if (st.stanje === 'zastoj') return;
  zaustaviGibanja(); if (st.izv) st.izv = null;
  st.stanje = 'zastoj'; st.zastoj = { razlog, sila: sila || 0 };
  zapis('p', 'Protective stop: ' + TEKST_ZASTOJ[razlog] + (razlog === 'sila' ? ' (' + Math.round(sila) + ' N)' : ''));
  info('Zaštitno zaustavljanje (Protective stop, kategorija 2): ' + TEKST_ZASTOJ[razlog]);
  dogadaj('zastoj', razlog); crtajEkran();
}
function omoguci() {
  if (st.stanje !== 'zastoj') return;
  st.stanje = 'normal'; st.zastoj = null; st.sila = 0; zapis('i', 'Robot enabled after protective stop.'); info('Robot je ponovno spreman.');
  dogadaj('enable'); crtajEkran();
}
function gljiva() {
  if (!st.estop) {
    st.estop = true; st.estopDlg = true;
    const giba = st.jog || st.auto || (st.izv && !st.izv.pauza) || st.fdCilj;
    zaustaviGibanja(); if (st.izv) st.izv = null;
    st.kocenje = giba ? 0.25 : 0;                 /* kategorija 1: kontrolirano zaustavljanje, zatim bez napajanja */
    if (!giba) { st.stanje = 'poweroff'; }
    st.freedrive = false;
    zapis('p', 'Emergency stop (Category 1): robot stopped, motor power removed, brakes engaged.');
    info('E-stop: kategorija zaustavljanja 1 — robot se kontrolirano zaustavio, zatim je isključeno napajanje motora i kočnice su zakočile.');
    dogadaj('estop');
  } else {
    st.estop = false;
    zapis('u', 'Emergency stop released. Robot is powered off.');
    info('Gljiva je otpuštena. Robot je bez napajanja: otvori zaslon za pokretanje i uključi ga (ON, START).');
    dogadaj('estopOtpusten');
  }
  $('gljiva').setAttribute('aria-pressed', String(st.estop));
  crtajEkran();
}
function tipkaPrivjeska() {
  if (st.privjesak === 'off') { st.privjesak = 'boot'; st.bootT = 1.8; }
  else if (st.privjesak === 'on') { st.privjesak = 'off'; st.stanje = 'poweroff'; st.initOtvoren = false; zaustaviGibanja(); st.izv = null; st.freedrive = false; }
  crtajEkran();
}
function initGumb(g) {
  if (g === 'ON') {
    if (st.estop) { info('Najprije otpusti gljivu E-stop.'); return; }
    if (st.stanje !== 'poweroff') return;
    st.stanje = 'paljenje'; st.prijelazT = 1.2; zapis('i', 'Power on requested.');
  } else if (g === 'START') {
    if (st.stanje !== 'idle') return;
    st.stanje = 'otpustanje'; st.prijelazT = 1.0; zapis('i', 'Brake release.');
  } else if (g === 'OFF') {
    if (['idle', 'normal', 'zastoj'].includes(st.stanje)) { zaustaviGibanja(); st.izv = null; st.stanje = 'poweroff'; st.freedrive = false; zapis('i', 'Robot powered off.'); }
  }
  crtajEkran();
}

/* ================================================================== */
/* 7. Gibanja: ručno, slobodno vođenje, automatski do cilja            */
/* ================================================================== */
function korakJog(dtR) {
  const j = st.jog; if (!j) return;
  if (!mozeGibati(true)) { st.jog = null; mozeGibati(false); return; }
  if (st.freedrive) {   /* gumbi u slobodnom vođenju poštuju način */
    const n = st.fdNacin;
    if ((n === 'Plane' && !(j.vrsta === 'lin' && j.os < 2)) || (n === 'Translation' && j.vrsta !== 'lin') || (n === 'Rotation' && j.vrsta !== 'rot')) { info('U načinu ' + n + ' to gibanje nije dopušteno.'); st.jog = null; return; }
  }
  const q = st.q; let qn = null;
  if (j.vrsta === 'zglob') {
    qn = q.slice(); qn[j.os] += j.smjer * 40 * D * st.brz * dtR;
    if (j.os < 5) qn[j.os] = clamp(qn[j.os], -2 * Math.PI, 2 * Math.PI);
  } else if (j.vrsta === 'home') {
    qn = q.slice(); let maks = 0; for (let i = 0; i < 6; i++) maks = Math.max(maks, Math.abs(HOME[i] - q[i]));
    if (maks < 1e-4) { st.jog = null; dogadaj('home'); crtajEkran(); return; }
    const k = Math.min(1, 40 * D * st.brz * dtR / maks);
    for (let i = 0; i < 6; i++) qn[i] = q[i] + (HOME[i] - q[i]) * k;
  } else {
    const T = tcpT(q), R = R9(T), p = pT(T);
    const e = [0, 0, 0]; e[j.os] = 1;
    const smjer = st.feature === 'Tool' ? [R[0] * e[0] + R[1] * e[1] + R[2] * e[2], R[3] * e[0] + R[4] * e[1] + R[5] * e[2], R[6] * e[0] + R[7] * e[1] + R[8] * e[2]] : e;
    let Tn;
    if (j.vrsta === 'lin') {
      const v = Math.min(200 * st.brz, granicaBrzine()) / 1000 * dtR * j.smjer;
      Tn = sastavi(R, [p[0] + smjer[0] * v, p[1] + smjer[1] * v, p[2] + smjer[2] * v]);
    } else {
      const th = 0.6 * st.brz * dtR * j.smjer;
      const Rr = rotIzVektora([e[0] * th, e[1] * th, e[2] * th]);
      Tn = sastavi(st.feature === 'Tool' ? mulR(R, Rr) : mulR(Rr, R), p);
    }
    qn = ikTcp(Tn, q);
    if (!qn) { st.jog = null; info('Robot ne može dalje u tom smjeru: cilj je izvan dosega ili je blizu singularnog položaja.'); crtajEkran(); return; }
  }
  const f = faktorBrzine(q, qn, dtR);
  if (f < 1) qn = q.map((x, i) => x + (qn[i] - x) * f);
  if (primijeni(qn)) dogadaj('gib');
}
function korakAuto(dtR) {
  const a = st.auto; if (!a) return;
  if (!mozeGibati(true)) { st.auto = null; return; }
  const q = st.q; let maks = 0; for (let i = 0; i < 6; i++) maks = Math.max(maks, Math.abs(a.cilj[i] - q[i]));
  if (maks < 1e-5) { st.auto = null; dogadaj('gib'); dogadaj('stigao'); crtajEkran(); return; }
  const k = Math.min(1, 45 * D * st.brz * dtR / maks);
  let qn = q.map((x, i) => x + (a.cilj[i] - x) * k);
  const f = faktorBrzine(q, qn, dtR); if (f < 1) qn = q.map((x, i) => x + (qn[i] - x) * f);
  if (!primijeni(qn)) st.auto = null;
}
function korakFreedrive(dtR) {
  if (!st.freedrive || !st.fdCilj) return;
  if (!mozeGibati(true)) { st.fdCilj = null; return; }
  const q = st.q, T = tcpT(q), R = R9(T), p = pT(T), c = st.fdCilj;
  const vmax = granicaBrzine() / 1000 * dtR;
  let qn = null;
  if (c.R) {   /* Rotation */
    const rv = rvIzR(mulR(c.R, trR(R))), th = Math.hypot(...rv);
    if (th < 1e-4) return;
    const k = Math.min(1, 1.2 * dtR / th);
    qn = ikTcp(sastavi(mulR(rotIzVektora(rv.map((x) => x * k)), R), p), q);
  } else {
    const d = [c.p[0] - p[0], c.p[1] - p[1], c.p[2] - p[2]], L = Math.hypot(...d);
    if (L < 2e-4) return;
    const k = Math.min(1, vmax / L), cilj = [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
    if (st.fdNacin === 'Free') { const r = ikTocka(cilj, q, [0, 0, TCP_Z], { iter: 6 }); qn = r.q; let m = 0; for (let i = 0; i < 6; i++) m = Math.max(m, Math.abs(qn[i] - q[i])); if (m > 0.5) qn = null; }
    else qn = ikTcp(sastavi(R, cilj), q);
  }
  if (!qn) { st.fdCilj = null; return; }
  if (primijeni(qn)) dogadaj('gib');
}
/* povlačenje robota mišem u 3D prikazu */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
let vuca = null;
function zrakaIz(e) { const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mis, camera); return ray; }
const sceneIzRob = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
const robIzScene = (v) => [v.x, -v.z, v.y];
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!st.freedrive) return;
  zrakaIz(e);
  const pogodak = ray.intersectObjects([M.korijen, hvat], true).find((h) => h.object.visible);
  if (!pogodak) return;
  e.stopImmediatePropagation();
  if (!mozeGibati(false)) return;
  controls.enabled = false; renderer.domElement.setPointerCapture(e.pointerId);
  const T = tcpT(st.q), p = pT(T);
  const n = new THREE.Vector3();
  if (st.fdNacin === 'Plane') n.set(0, 1, 0); else camera.getWorldDirection(n);
  vuca = { ravnina: new THREE.Plane().setFromNormalAndCoplanarPoint(n, sceneIzRob(p)), p0: p, R0: R9(T), x0: e.clientX, y0: e.clientY, z0: p[2] };
  st.fdVuce = true;
}, true);
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!vuca) return;
  if (st.fdNacin === 'Rotation') {
    const dx = (e.clientX - vuca.x0) * 0.01, dy = (e.clientY - vuca.y0) * 0.01;
    const des = new THREE.Vector3(); camera.getWorldDirection(des); const desno = new THREE.Vector3().crossVectors(des, new THREE.Vector3(0, 1, 0)).normalize();
    const osD = robIzScene(desno);
    const Rz = rotIzVektora([0, 0, dx]), Rd = rotIzVektora(osD.map((x) => x * dy));
    st.fdCilj = { R: mulR(Rz, mulR(Rd, vuca.R0)) };
    return;
  }
  zrakaIz(e); const t = new THREE.Vector3();
  if (!ray.ray.intersectPlane(vuca.ravnina, t)) return;
  const p = robIzScene(t);
  if (st.fdNacin === 'Plane') p[2] = vuca.z0;
  st.fdCilj = { p };
});
function krajVuce() { if (vuca) { vuca = null; controls.enabled = true; st.fdVuce = false; if (st.refOdgodi) { st.refOdgodi = false; st.fdCilj = null; snimiRef(); } } }
renderer.domElement.addEventListener('pointerup', krajVuce);
renderer.domElement.addEventListener('pointercancel', krajVuce);

/* ================================================================== */
/* 8. Program: stablo, prevođenje, izvođenje                           */
/* ================================================================== */
function sviCvorovi(c = st.prog.korijen, rod = null, out = []) { out.push({ c, rod }); (c.djeca || []).forEach((d) => sviCvorovi(d, c, out)); return out; }
function nadji(id) { return sviCvorovi().find((x) => x.c.id === id) || null; }
function noviWp(q = null) { return { id: noviId(), tip: 'wp', ime: 'Waypoint_' + (wpBr++), q: q ? q.slice() : null }; }
function noviMove(vrsta = 'MoveJ') { return { id: noviId(), tip: 'move', vrsta, v: ZADANO[vrsta].v, a: ZADANO[vrsta].a, djeca: [] }; }
function dodajCvor(tip) {
  if (!['move', 'wp', 'wait', 'set', 'loop'].includes(tip)) return;
  const P = st.prog; const sel = P.sel ? nadji(P.sel) : null;
  let novi;
  if (tip === 'wp') {
    if (sel && sel.c.tip === 'move') { novi = noviWp(); sel.c.djeca.push(novi); }
    else if (sel && sel.c.tip === 'wp') { novi = noviWp(); sel.rod.djeca.splice(sel.rod.djeca.indexOf(sel.c) + 1, 0, novi); }
    else { const m = noviMove(); novi = noviWp(); m.djeca.push(novi); umetni(m, sel); }
    P.sel = novi.id;
  } else {
    if (tip === 'move') { novi = noviMove(); const w = noviWp(); novi.djeca.push(w); umetni(novi, sel); P.sel = w.id; }
    else {
      if (tip === 'wait') novi = { id: noviId(), tip: 'wait', t: 1 };
      if (tip === 'set') novi = { id: noviId(), tip: 'set', izlaz: 0, val: true };
      if (tip === 'loop') novi = { id: noviId(), tip: 'loop', n: 3, djeca: [] };
      umetni(novi, sel); P.sel = novi.id;
    }
  }
  dogadaj('program'); crtajEkran();
}
function umetni(novi, sel) {
  const K = st.prog.korijen;
  if (!sel || sel.c.tip === 'root') { K.djeca.push(novi); return; }
  if (sel.c.tip === 'loop') { sel.c.djeca.push(novi); return; }
  if (sel.c.tip === 'wp' && novi.tip !== 'wp' && novi.tip !== 'move') { sel.rod.djeca.splice(sel.rod.djeca.indexOf(sel.c) + 1, 0, novi); return; }
  if (sel.c.tip === 'wp') { const m = nadji(sel.rod.id); m.rod.djeca.splice(m.rod.djeca.indexOf(m.c) + 1, 0, novi); return; }
  sel.rod.djeca.splice(sel.rod.djeca.indexOf(sel.c) + 1, 0, novi);
}
function pomakniCvor(sm) {
  const s = st.prog.sel && nadji(st.prog.sel); if (!s || !s.rod) return;
  const L = s.rod.djeca, i = L.indexOf(s.c), j = i + sm; if (j < 0 || j >= L.length) return;
  [L[i], L[j]] = [L[j], L[i]]; dogadaj('program'); crtajEkran();
}
function obrisiCvor() {
  const s = st.prog.sel && nadji(st.prog.sel); if (!s || !s.rod) return;
  const L = s.rod.djeca; L.splice(L.indexOf(s.c), 1); st.prog.sel = s.rod.tip === 'root' ? null : s.rod.id;
  dogadaj('program'); crtajEkran();
}
function prevedi() {
  const out = [];
  const rek = (c, mv) => {
    for (const d of c.djeca) {
      if (d.tip === 'move') rek(d, d);
      else if (d.tip === 'wp') out.push({ op: 'move', vrsta: mv ? mv.vrsta : 'MoveJ', v: mv ? mv.v : 60, a: mv ? mv.a : 80, q: d.q, cvor: d });
      else if (d.tip === 'wait') out.push({ op: 'wait', t: d.t, cvor: d });
      else if (d.tip === 'set') out.push({ op: 'set', izlaz: d.izlaz, val: d.val, cvor: d });
      else if (d.tip === 'loop') { const i = out.length; out.push({ op: 'ls', n: d.n, id: d.id, cvor: d }); rek(d, null); out.push({ op: 'le', start: i, n: d.n, id: d.id, cvor: d }); }
    }
  };
  rek(st.prog.korijen, null);
  return out;
}
/* trapezni profil: vrati funkciju s(t) i trajanje */
function profil(Dd, v, a) {
  if (Dd < 1e-9) return { T: 0, s: () => Dd };
  if (Dd < v * v / a) { const Th = Math.sqrt(Dd / a); return { T: 2 * Th, s: (t) => (t < Th ? 0.5 * a * t * t : Dd - 0.5 * a * (2 * Th - t) ** 2) }; }
  const ta = v / a, T = Dd / v + ta;
  return { T, s: (t) => (t < ta ? 0.5 * a * t * t : t < T - ta ? 0.5 * a * ta * ta + v * (t - ta) : Dd - 0.5 * a * (T - t) ** 2) };
}
function play() {
  if (st.izv && st.izv.pauza) { if (!mozeGibati(false)) return; st.izv.pauza = false; zapis('i', 'Program resumed.'); crtajEkran(); return; }
  if (st.izv) return;
  const instr = prevedi();
  if (!instr.length) { info('Program je prazan. Dodaj naredbu Move u kartici Program.'); return; }
  const nedef = instr.find((x) => x.op === 'move' && !x.q);
  if (nedef) { info(nedef.cvor.ime + ' nije postavljena — odaberi je i dodirni Set waypoint.'); st.tab = 'Program'; st.prog.sel = nedef.cvor.id; crtajEkran(); return; }
  if (!mozeGibati(false)) return;
  st.izv = { instr, pc: 0, gib: null, brojaci: {}, pauza: false, t0: vrijemeSim, vrste: new Set(), segmenti: [] };
  zapis('i', 'Program started: ' + st.prog.ime);
  dogadaj('play'); crtajEkran();
}
function pauza() { if (st.izv && !st.izv.pauza) { st.izv.pauza = true; zapis('i', 'Program paused.'); crtajEkran(); } }
function stop() { if (st.izv) { st.izv = null; zapis('i', 'Program stopped.'); crtajEkran(); } }
function korakProg(dtR) {
  const iz = st.izv; if (!iz || iz.pauza) return;
  if (!mozeGibati(true)) {
    if (st.sig.tri && st.nacin === 'Manual' && st.stanje === 'normal' && !st.estop) { iz.pauza = true; zapis('u', '3PE stop: program paused.'); info('3PE nije u srednjem položaju — program je zaustavljen (Pause).'); crtajEkran(); }
    return;
  }
  let preostalo = 6;    /* najviše nekoliko naredbi bez gibanja u jednom koraku */
  while (preostalo-- > 0 && st.izv) {
    if (iz.pc >= iz.instr.length) { zavrsiProgram(); return; }
    const ins = iz.instr[iz.pc];
    if (ins.op === 'set') { postaviIzlaz(ins.izlaz, ins.val); iz.pc++; continue; }
    if (ins.op === 'ls') { iz.brojaci[ins.id] = 0; iz.pc++; continue; }
    if (ins.op === 'le') { iz.brojaci[ins.id]++; if (ins.n === 0 || iz.brojaci[ins.id] < ins.n) iz.pc = ins.start + 1; else iz.pc++; continue; }
    if (ins.op === 'wait') {
      if (iz.cekaj === undefined) iz.cekaj = ins.t;
      iz.cekaj -= dtR; if (iz.cekaj <= 0) { iz.cekaj = undefined; iz.pc++; continue; }
      return;
    }
    if (ins.op === 'move') { if (korakMove(ins, dtR * st.brz)) { iz.gib = null; iz.pc++; continue; } return; }
  }
}
function korakMove(ins, dtE) {
  const iz = st.izv;
  if (!iz.gib) {
    const g = { vrsta: ins.vrsta, t: 0, q0: st.q.slice(), tocke: [pT(tcpT(st.q))] };
    if (ins.vrsta === 'MoveJ') {
      const dq = ins.q.map((x, i) => x - st.q[i]); const Dd = Math.max(...dq.map(Math.abs));
      g.dq = dq; g.Dd = Dd; g.pr = profil(Dd, Math.min(ins.v, 180) * D, ins.a * D);
    } else {
      const T0 = tcpT(st.q), T1 = tcpT(ins.q);
      g.p0 = pT(T0); g.dp = pT(T1).map((x, i) => x - g.p0[i]); g.R0 = R9(T0); g.rv = rvIzR(mulR(R9(T1), trR(g.R0)));
      const L = Math.hypot(...g.dp), th = Math.hypot(...g.rv);
      const pl = profil(L, ins.v / 1000, ins.a / 1000), pr = profil(th, 1.0, 4.0);
      g.pr = pl.T >= pr.T ? { T: pl.T, u: (t) => (L > 0 ? pl.s(t) / L : 1) } : { T: pr.T, u: (t) => (th > 0 ? pr.s(t) / th : 1) };
      g.cilj = ins.q;
    }
    iz.gib = g; iz.vrste.add(ins.vrsta); iz.segmenti.push(g);
  }
  const g = iz.gib;
  const pozaU = (t) => {
    if (g.vrsta === 'MoveJ') { const s = g.Dd > 0 ? g.pr.s(Math.min(t, g.pr.T)) / g.Dd : 1; return g.q0.map((x, i) => x + g.dq[i] * s); }
    const u = t >= g.pr.T ? 1 : g.pr.u(t);
    const p = g.p0.map((x, i) => x + g.dp[i] * u), R = mulR(rotIzVektora(g.rv.map((x) => x * u)), g.R0);
    return ikTcp(sastavi(R, p), st.q, 0.3);
  };
  const dtR = dtE / Math.max(st.brz, 1e-3);
  let tn = Math.min(g.t + dtE, g.pr.T), qn = pozaU(tn);
  if (qn) {   /* sigurnosno ograničenje brzine TCP-a */
    const f = faktorBrzine(st.q, qn, dtR);
    if (f < 0.999) { tn = g.t + (tn - g.t) * f; qn = pozaU(tn); }
  }
  if (!qn) { zastoj('ik'); return false; }
  if (!primijeni(qn)) return false;
  g.t = tn;
  const p = pT(tcpT(st.q)); g.tocke.push(p); dodajPut(p, g.vrsta);
  dogadaj('gib');
  return g.t >= g.pr.T - 1e-9;
}
function zavrsiProgram() {
  const iz = st.izv; st.izv = null;
  zapis('i', 'Program completed (' + krz(vrijemeSim - iz.t0, 1) + ' s).');
  info('Program je završio.');
  zadnjiSegmenti = iz.segmenti;
  dogadaj('programKraj', iz); crtajEkran();
}
let zadnjiSegmenti = [];
/* alatni izlazi i hvataljka */
function postaviIzlaz(i, val) { st.io.do[i] = !!val; zapis('i', 'Tool DO' + i + ' = ' + (val ? 'On' : 'Off')); dogadaj('io'); }
function korakHvataljke(dtR) {
  const h = st.hv, zatv = st.io.do[0], brz = (PRST.otvoren - PRST.prazan) / 0.4;
  const k = st.kocka;
  if (zatv) {
    if (!h.drzi) {
      h.s = Math.max(PRST.prazan, h.s - brz * dtR);
      if (h.s <= PRST.kocka + 1e-6 && !k.uRuci) {
        /* je li kocka među prstima? */
        const T = tcpT(st.q), R = R9(T), p = pT(T), d = [k.p[0] - p[0], k.p[1] - p[1], k.p[2] - p[2]];
        const l = [R[0] * d[0] + R[3] * d[1] + R[6] * d[2], R[1] * d[0] + R[4] * d[1] + R[7] * d[2], R[2] * d[0] + R[5] * d[1] + R[8] * d[2]];
        if (Math.abs(l[0]) < 0.012 && Math.abs(l[1]) < 0.014 && Math.abs(l[2]) < 0.014) {
          h.drzi = true; h.s = PRST.kocka; k.uRuci = true; k.rel = l; k.relYaw = k.yaw - Math.atan2(R[3], R[0]); k.vz = 0;
        }
      }
    }
  } else {
    h.s = Math.min(PRST.otvoren, h.s + brz * dtR);
    if (h.drzi && h.s > PRST.kocka + 0.002) { h.drzi = false; k.uRuci = false; k.vz = 0; }
  }
  /* kocka u hvataljci prati TCP */
  if (k.uRuci) {
    const T = tcpT(st.q), R = R9(T), r = k.rel;
    k.p = [T[3] + R[0] * r[0] + R[1] * r[1] + R[2] * r[2], T[7] + R[3] * r[0] + R[4] * r[1] + R[5] * r[2], T[11] + R[6] * r[0] + R[7] * r[1] + R[8] * r[2]];
    k.yaw = Math.atan2(R[3], R[0]) + k.relYaw;
  }
  /* kocka pada na stol */
  if (!k.uRuci && k.p[2] > KOCKA_POLA + 1e-6) { k.vz += 9.81 * dtR; k.p[2] = Math.max(KOCKA_POLA, k.p[2] - k.vz * dtR); if (k.p[2] <= KOCKA_POLA) k.vz = 0; }
  st.io.di[0] = h.drzi; st.io.di[1] = h.s >= PRST.otvoren - 1e-4;
}
function vratiKocku() { const k = st.kocka; Object.assign(k, { p: [KOCKA_A[0], KOCKA_A[1], KOCKA_POLA], yaw: 0, uRuci: false, rel: null, vz: 0 }); st.hv.drzi = false; }

/* ================================================================== */
/* 9. Koraci: provjera događaja                                       */
/* ================================================================== */
function trenutni() { return niz ? niz.koraci[korak] : null; }
function snimiRef() { const T = tcpT(st.q); st.ref = { p: pT(T), R: R9(T), q: st.q.slice() }; }
function pomakRef() {
  const T = tcpT(st.q), p = pT(T), r = st.ref;
  return { d: [p[0] - r.p[0], p[1] - r.p[1], p[2] - r.p[2]], kut: kutR(R9(T), r.R), rv: rvIzR(mulR(R9(T), trR(r.R))) };
}
const blizu = (q, i, kut, tol = 1) => Math.abs(stup(q[i]) - kut) <= tol;
function nadjiMove(vrsta) { return sviCvorovi().map((x) => x.c).filter((c) => c.tip === 'move' && (!vrsta || c.vrsta === vrsta)); }
function redoslijedProvjera() {   /* niz Uzmi i ostavi: provjera položaja naredbi Set i Wait */
  const L = prevedi(), idx = (ime) => L.findIndex((x) => x.op === 'move' && x.cvor.ime === ime);
  const i2 = idx('Waypoint_2'), i3 = idx('Waypoint_3'), i5 = idx('Waypoint_5'), i6 = idx('Waypoint_6');
  const izmedu = (a, b, f) => a >= 0 && b > a && L.slice(a + 1, b).some(f);
  const setOn = izmedu(i2, i3, (x) => x.op === 'set' && x.izlaz === 0 && x.val);
  let wait = false;
  if (setOn) { const s = L.slice(i2 + 1, i3); const j = s.findIndex((x) => x.op === 'set' && x.izlaz === 0 && x.val); wait = s.slice(j + 1).some((x) => x.op === 'wait' && x.t >= 0.5); }
  const setOff = izmedu(i5, i6, (x) => x.op === 'set' && x.izlaz === 0 && !x.val);
  return { setOn, wait, setOff };
}
function dogadaj(e, pod) {
  const k = trenutni(); if (!k) return;
  const ok = (() => {
    switch (k[2]) {
      case 'privjesak': return st.privjesak === 'on';
      case 'init': return st.initOtvoren;
      case 'payload': return e === 'payload' && Math.abs(st.payload - 0.6) < 0.006;
      case 'on': return st.stanje === 'idle';
      case 'start': return st.stanje === 'normal';
      case 'exit': return !st.initOtvoren && st.stanje === 'normal';
      case 'move': return st.tab === 'Move';
      case 'base45': return e === 'gib' && blizu(st.q, 0, 45);
      case 'sh60': return e === 'gib' && blizu(st.q, 1, -60);
      case 'w390': return e === 'gib' && blizu(st.q, 5, 90);
      case 'el60': return e === 'stigao' && blizu(st.q, 2, 60, 0.5);
      case 'home': return e === 'home' && st.q.every((x, i) => Math.abs(x - HOME[i]) < 0.5 * D);
      case 'base': return st.tab === 'Move' && st.feature === 'Base';
      case 'gore50': { if (e !== 'gib') return false; const m = pomakRef(); return m.d[2] >= 0.049 && Math.abs(m.d[0]) < 0.003 && Math.abs(m.d[1]) < 0.003; }
      case 'y40': { if (e !== 'gib') return false; const m = pomakRef(); return m.d[1] <= -0.039 && Math.abs(m.d[0]) < 0.003 && Math.abs(m.d[2]) < 0.003; }
      case 'rz30': { if (e !== 'gib') return false; const m = pomakRef(); return m.kut >= 29 * D && Math.abs(m.rv[2]) / m.kut > 0.95 && Math.hypot(...m.d) < 0.003; }
      case 'tool': return st.feature === 'Tool';
      case 'toolz30': { if (e !== 'gib') return false; const m = pomakRef(), z = [st.ref.R[2], st.ref.R[5], st.ref.R[8]]; const pr = m.d[0] * z[0] + m.d[1] * z[1] + m.d[2] * z[2]; return pr >= 0.029 && Math.hypot(m.d[0] - pr * z[0], m.d[1] - pr * z[1], m.d[2] - pr * z[2]) < 0.003; }
      case 'fdOn': return st.freedrive;
      case 'fd100': return e === 'gib' && st.freedrive && Math.hypot(...pomakRef().d) >= 0.1;
      case 'plane': return st.fdNacin === 'Plane';
      case 'plane60': { if (e !== 'gib' || st.fdNacin !== 'Plane') return false; const m = pomakRef(); return Math.hypot(m.d[0], m.d[1]) >= 0.06 && Math.abs(m.d[2]) < 0.002; }
      case 'rot30': { if (e !== 'gib' || st.fdNacin !== 'Rotation' || !st.freedrive) return false; const m = pomakRef(); return m.kut >= 29 * D && Math.hypot(...m.d) < 0.003; }
      case 'fdOff': return !st.freedrive;
      case 'program': return st.tab === 'Program';
      case 'dodajMove': return nadjiMove().some((m) => m.djeca.some((d) => d.tip === 'wp'));
      case 'wp1': return nadjiMove().some((m) => m.djeca.filter((d) => d.tip === 'wp')[0] && m.djeca.filter((d) => d.tip === 'wp')[0].q);
      case 'wp2dodan': return nadjiMove().some((m) => m.djeca.filter((d) => d.tip === 'wp').length >= 2);
      case 'wp2': return nadjiMove().some((m) => { const w = m.djeca.filter((d) => d.tip === 'wp'); return w.length >= 2 && w[0].q && w[1].q && dist(pT(tcpT(w[0].q)), pT(tcpT(w[1].q))) >= 0.1; });
      case 'play': return e === 'play';
      case 'progKraj': return e === 'programKraj';
      case 'krajJ': return e === 'programKraj' && pod.vrste.has('MoveJ') && !pod.vrste.has('MoveL');
      case 'uMoveL': return nadjiMove('MoveL').length > 0 && nadjiMove('MoveJ').length === 0;
      case 'krajL': return e === 'programKraj' && pod.vrste.has('MoveL') && !pod.vrste.has('MoveJ');
      case 'dalje': return e === 'dalje';
      case 'do0on': return e === 'io' && st.io.do[0];
      case 'do0off': return e === 'io' && !st.io.do[0];
      case 'setOn': return e === 'program' && redoslijedProvjera().setOn;
      case 'wait': return e === 'program' && redoslijedProvjera().wait;
      case 'setOff': return e === 'program' && redoslijedProvjera().setOff;
      case 'kockaB': {
        if (e !== 'programKraj') return false;
        const kk = st.kocka, ok2 = !kk.uRuci && Math.hypot(kk.p[0] - KOCKA_B[0], kk.p[1] - KOCKA_B[1]) < 0.015 && kk.p[2] < KOCKA_POLA + 0.002;
        if (!ok2) info('Kocka nije na odlagalištu. Provjeri naredbe Set i Wait, klikni „Vrati kocku” i pokreni program ponovno.');
        return ok2;
      }
      case 'instalacija': return st.tab === 'Installation' && st.instSub === 'limits';
      case 'limiti': return e === 'apply' && st.sig.sila === 100 && st.sig.brzina === 500;
      case 'ravnina': return e === 'apply' && st.sig.ravnina.aktivna && Math.abs(st.sig.ravnina.h - 100) < 1;
      case 'zRavnina': return e === 'zastoj' && pod === 'ravnina';
      case 'enable': return e === 'enable';
      case 'zSila': return e === 'zastoj' && pod === 'sila';
      case 'odmak': return e === 'gib' && st.stanje === 'normal' && st.sila === 0;
      case 'estop': return st.estop;
      case 'ponovo': return !st.estop && st.stanje === 'normal';
      case 'tri': return e === 'gib' && st.sig.tri && st.nacin === 'Manual' && st.tri === 'lagano';
      case 'auto': return st.nacin === 'Automatic';
      case 'kut9': return (e === 'stigao' || e === 'gib') && Q9.every((x, i) => blizu(st.q, i, x, 0.1));
      case 'dh': return e === 'dhProvjera' && pod === true;
      default: return false;
    }
  })();
  if (ok) {
    korak++;
    if (korak >= niz.koraci.length - 1) { gotovi.add(niz.id); spremiGotove(); }
    crtajKorak();
  }
}

/* ================================================================== */
/* 10. Zaslon privjeska                                                */
/* ================================================================== */
const IKONE = {
  Run: '<path d="M7 5v14l11-7z" fill="currentColor"/>',
  Program: '<path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  Installation: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  Move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
  'I/O': '<path d="M8 3v5M16 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  Log: '<path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linejoin="round"/>'
};
const ikona = (k) => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + k + '</svg>';
const SVG_PLAY = ikona('<path d="M7 5v14l11-7z" fill="currentColor"/>'), SVG_PAUSE = ikona('<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>'), SVG_STOP = ikona('<path d="M6 6h12v12H6z" fill="currentColor"/>');
function info(t) { $('poruka').textContent = t; }
function statusKlasa() {
  if (st.privjesak !== 'on') return 'ugasen';
  if (st.estop) return 'estop';
  return { poweroff: '', paljenje: 'idle', idle: 'idle', otpustanje: 'idle', normal: 'normal', zastoj: 'zastoj' }[st.stanje];
}
function crtajEkran() {
  if (st.jog) { st.trebaCrtati = true; return; }
  st.trebaCrtati = false;
  const el = $('ekran');
  /* sačuvaj fokus (npr. polje za upis) */
  const fok = document.activeElement && el.contains(document.activeElement) ? (document.activeElement.dataset.polje || document.activeElement.dataset.akcija || document.activeElement.dataset.drzi || document.activeElement.dataset.tab) : null;
  let h = '<div class="ps-gl"><div class="ps-tabs" role="tablist">';
  ['Run', 'Program', 'Installation', 'Move', 'I/O', 'Log'].forEach((t) => { h += '<button type="button" role="tab" class="ps-tab' + (st.tab === t ? ' akt' : '') + '" aria-selected="' + (st.tab === t) + '" data-tab="' + t + '">' + ikona(IKONE[t]) + '<span>' + t + '</span></button>'; });
  h += '</div><div class="ps-gl-d"><span class="ps-dat" title="Program">' + esc(st.prog.ime) + '</span><button type="button" class="ps-nacin' + (st.nacin === 'Automatic' ? ' auto' : '') + '" data-akcija="nacin" aria-label="Način rada: ' + st.nacin + ' (klikni za promjenu)">' + st.nacin + '</button></div></div>';
  h += '<div class="ps-tijelo">' + ({ Run: tabRun, Program: tabProgram, Installation: tabInstall, Move: tabMove, 'I/O': tabIO, Log: tabLog }[st.tab])() + '</div>';
  const izv = st.izv;
  h += '<div class="ps-pod"><button type="button" class="ps-status ' + statusKlasa() + '" data-akcija="init" data-ziv="status">' + nazivStanja() + '</button>' +
    '<label class="ps-brz">Speed <input type="range" min="10" max="100" step="5" value="' + Math.round(st.brz * 100) + '" data-polje="brz" aria-label="Brzina (Speed) u postocima"><output data-ziv="brz">' + Math.round(st.brz * 100) + ' %</output></label>' +
    '<span class="ps-v" data-ziv="vtcp"></span>' +
    '<div class="ps-play"><button type="button" data-akcija="play" aria-label="Play" class="' + (izv && !izv.pauza ? 'akt' : '') + '">' + SVG_PLAY + '</button><button type="button" data-akcija="pauza" aria-label="Pause" class="' + (izv && izv.pauza ? 'akt' : '') + '">' + SVG_PAUSE + '</button><button type="button" data-akcija="stop" aria-label="Stop">' + SVG_STOP + '</button></div></div>';
  /* prekrivni prozori */
  if (st.privjesak !== 'on') h += '<div class="ps-ugasen">' + (st.privjesak === 'off' ? '<b>Privjesak je isključen</b><span>Pritisni tipku za napajanje lijevo ispod zaslona.</span>' : '<b>Pokretanje…</b><div class="ps-traka"><i data-ziv="boot"></i></div><span>Upravljanje se pokreće.</span>') + '</div>';
  else if (st.estop || st.estopDlg) h += '<div class="ps-prek"><div class="ps-dlg estop" role="alertdialog" aria-label="Emergency stop"><h3>Emergency Stop</h3>' + (st.estop ? '<p>Robot je zaustavljen gljivom za nužno zaustavljanje (kategorija 1). Napajanje motora je isključeno, kočnice su zakočene.</p><p class="ps-mala">Otpusti gljivu zakretanjem (klikni je ponovno).</p>' : '<p>Gljiva je otpuštena. Robot je bez napajanja.</p><div class="ps-init-gumbi"><button type="button" class="ps-btn pl" data-akcija="estopOk">Initialize</button></div>') + '</div></div>';
  else if (st.stanje === 'zastoj') h += '<div class="ps-prek"><div class="ps-dlg zastoj" role="alertdialog" aria-label="Protective stop"><h3>Protective Stop</h3><p>' + esc(TEKST_ZASTOJ[st.zastoj.razlog]) + (st.zastoj.razlog === 'sila' ? ' Procijenjena sila: ' + Math.round(st.zastoj.sila) + ' N.' : '') + '</p><p class="ps-mala">Kategorija zaustavljanja 2: napajanje pogona ostaje uključeno. Ukloni uzrok i potvrdi.</p><div class="ps-init-gumbi"><button type="button" class="ps-btn pl" data-akcija="enable">Enable robot</button></div></div></div>';
  else if (st.initOtvoren) h += initDlg();
  el.innerHTML = h;
  if (fok) { const f = el.querySelector('[data-polje="' + fok + '"],[data-akcija="' + fok + '"],[data-drzi="' + fok + '"],[data-tab="' + fok + '"]'); if (f) f.focus(); }
  $('b-power').setAttribute('aria-pressed', String(st.privjesak !== 'off'));
  $('pr-led').classList.toggle('on', st.privjesak === 'on');
  $('b-freedrive').setAttribute('aria-pressed', String(st.freedrive));
  const t3 = $('b-3pe'); t3.classList.toggle('lagano', st.tri === 'lagano'); t3.classList.toggle('jako', st.tri === 'jako'); $('b-3pe-st').textContent = { pusten: 'pušten', lagano: 'lagano', jako: 'jako' }[st.tri];
  osvjeziZivo();
}
function initDlg() {
  const s = st.stanje, kl = s === 'normal' ? 'normal' : s === 'idle' ? 'idle' : (s === 'paljenje' || s === 'otpustanje') ? 'prijelaz' : '';
  return '<div class="ps-prek"><div class="ps-dlg" role="dialog" aria-label="Initialize robot"><h3>Initialize robot</h3>' +
    '<div class="ps-init-st"><i class="' + kl + '"></i><span data-ziv="initst">Robot: ' + nazivStanja() + '</span></div>' +
    '<div class="ps-red"><label>Payload <input type="number" min="0" max="3" step="0.01" value="' + st.payloadUnos.toFixed(2) + '" data-polje="payload" aria-label="Nosivost u kilogramima"> kg</label><button type="button" class="ps-btn" data-akcija="payloadSet">Set</button><span class="ps-mala">aktivno: ' + st.payload.toFixed(2) + ' kg</span></div>' +
    '<div class="ps-mala">TCP: Gripper (Z = ' + Math.round(TCP_Z * 1000) + ' mm) · nosivost robota najviše 3 kg</div>' +
    '<div class="ps-init-gumbi"><button type="button" class="ps-btn zel" data-akcija="initON"' + (s === 'poweroff' ? '' : ' disabled') + '>ON</button><button type="button" class="ps-btn zel" data-akcija="initSTART"' + (s === 'idle' ? '' : ' disabled') + '>START</button><button type="button" class="ps-btn crv" data-akcija="initOFF"' + (['idle', 'normal'].includes(s) ? '' : ' disabled') + '>OFF</button></div>' +
    (s === 'otpustanje' ? '<p class="ps-mala"><b>Brake release…</b> zglobovi se malo pomaknu dok se zatici kočnica izvlače.</p>' : '') +
    '<div class="ps-red" style="justify-content:flex-end"><button type="button" class="ps-btn pl" data-akcija="initExit">Exit</button></div></div></div>';
}
function opisNaredbe() {
  const iz = st.izv, ins = iz && iz.instr[Math.min(iz.pc, iz.instr.length - 1)];
  return ins ? (ins.op === 'move' ? ins.vrsta + ' → ' + ins.cvor.ime : ins.op === 'wait' ? 'Wait ' + krz(ins.t, 1) + ' s' : ins.op === 'set' ? 'Set Tool DO' + ins.izlaz + ' = ' + (ins.val ? 'On' : 'Off') : 'Loop') : '—';
}
function tabRun() {
  const iz = st.izv, opis = opisNaredbe();
  return '<div class="ps-g" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><div class="ps-panel"><h3>Program</h3><table class="ps-t"><tr><td>Program</td><td>' + esc(st.prog.ime) + '</td></tr><tr><td>Status</td><td data-ziv="pstatus">' + (iz ? (iz.pauza ? 'Paused' : 'Running') : 'Stopped') + '</td></tr><tr><td>Command</td><td data-ziv="naredba">' + esc(opis) + '</td></tr><tr><td>Time</td><td data-ziv="vrijeme">—</td></tr></table></div>' +
    '<div class="ps-panel"><h3>Robot</h3><table class="ps-t"><tr><td>State</td><td data-ziv="stanje2">' + nazivStanja() + '</td></tr><tr><td>Mode</td><td>' + st.nacin + '</td></tr><tr><td>TCP speed</td><td data-ziv="vtcp2"></td></tr><tr><td>Payload</td><td>' + st.payload.toFixed(2) + ' kg</td></tr><tr><td>Safety checksum</td><td>' + checksum() + '</td></tr></table></div></div>' +
    '<p class="ps-mala">Program se pokreće gumbom Play u donjoj traci. Gumb lijevo dolje otvara zaslon za pokretanje robota.</p>';
}
function tabMove() {
  const f = st.feature, dz = (k) => 'data-drzi="' + k + '"';
  const zg = NAZIVI_ZGLOBOVA.map((n, i) => '<div class="mv-zg"><span>' + n + '</span><button type="button" ' + dz('zglob:' + i + ':-1') + ' aria-label="' + n + ' minus">−</button><input type="number" step="0.1" data-polje="q' + i + '" data-ziv="q' + i + '" aria-label="Kut zgloba ' + n + ' u stupnjevima" value="' + stup(st.q[i]).toFixed(1) + '"><button type="button" ' + dz('zglob:' + i + ':1') + ' aria-label="' + n + ' plus">+</button><div class="mv-traka"><i data-ziv="tr' + i + '"></i></div></div>').join('');
  const gb = (k, t, l) => '<button type="button" ' + dz(k) + ' aria-label="' + l + '">' + t + '</button>';
  return '<div class="ps-g mv">' +
    '<div class="ps-panel"><h3>Move Tool</h3><div class="ps-red"><span class="ps-mala">Feature</span><div class="ps-seg">' + ['Base', 'Tool'].map((x) => '<button type="button" data-akcija="feature" data-v="' + x + '" aria-pressed="' + (f === x) + '">' + x + '</button>').join('') + '</div></div>' +
    '<div class="mv-tipke"><span></span>' + gb('lin:1:1', '+Y', 'Alat +Y') + '<span></span>' + gb('lin:0:-1', '−X', 'Alat −X') + '<span></span>' + gb('lin:0:1', '+X', 'Alat +X') + '<span></span>' + gb('lin:1:-1', '−Y', 'Alat −Y') + '<span></span></div>' +
    '<div class="mv-z">' + gb('lin:2:1', '+Z', 'Alat +Z') + gb('lin:2:-1', '−Z', 'Alat −Z') + '</div>' +
    '<div class="mv-rot">' + gb('rot:0:-1', 'RX−', 'Zakret oko X minus') + gb('rot:1:-1', 'RY−', 'Zakret oko Y minus') + gb('rot:2:-1', 'RZ−', 'Zakret oko Z minus') + gb('rot:0:1', 'RX+', 'Zakret oko X plus') + gb('rot:1:1', 'RY+', 'Zakret oko Y plus') + gb('rot:2:1', 'RZ+', 'Zakret oko Z plus') + '</div></div>' +
    '<div class="ps-panel mv-poz"><h3>Tool Position</h3><table class="ps-t">' + ['X', 'Y', 'Z'].map((o, i) => '<tr><td>' + o + '</td><td class="br" data-ziv="p' + i + '"></td><td>mm</td></tr>').join('') + ['RX', 'RY', 'RZ'].map((o, i) => '<tr><td>' + o + '</td><td class="br" data-ziv="r' + i + '"></td><td>rad</td></tr>').join('') + '</table>' +
    '<p class="ps-mala">TCP: Gripper · prikaz u sustavu Base</p><table class="ps-t"><tr><td>Force</td><td class="br" data-ziv="sila"></td><td>N</td></tr><tr><td>Speed</td><td class="br" data-ziv="vtcp3"></td><td>mm/s</td></tr></table></div>' +
    '<div class="ps-panel"><h3>Joint Position</h3>' + zg + '</div></div>' +
    '<div class="mv-dno"><button type="button" class="ps-btn pl" ' + dz('home') + '>Home</button><button type="button" class="ps-btn" data-akcija="freedrive" aria-pressed="' + st.freedrive + '">Freedrive</button><span class="ps-mala">Freedrive mode</span><div class="ps-seg">' + ['Free', 'Plane', 'Translation', 'Rotation'].map((x) => '<button type="button" data-akcija="fdNacin" data-v="' + x + '" aria-pressed="' + (st.fdNacin === x) + '">' + x + '</button>').join('') + '</div></div>';
}
function opisCvora(c) {
  if (c.tip === 'root') return 'Robot Program';
  if (c.tip === 'move') return c.vrsta;
  if (c.tip === 'wp') return c.ime + (c.q ? '' : ' <span class="nedef">(not set)</span>');
  if (c.tip === 'wait') return 'Wait: ' + krz(c.t, 1) + ' s';
  if (c.tip === 'set') return 'Set: Tool DO' + c.izlaz + ' = ' + (c.val ? 'On' : 'Off');
  if (c.tip === 'loop') return c.n === 0 ? 'Loop always' : 'Loop ' + c.n + ' times';
  return '';
}
function tabProgram() {
  const P = st.prog, izvId = st.izv && st.izv.instr[st.izv.pc] ? st.izv.instr[st.izv.pc].cvor.id : null;
  const dub = (c, d, out) => { out.push([c, d]); (c.djeca || []).forEach((x) => dub(x, d + 1, out)); return out; };
  const IK = { root: '▣', move: '↗', wp: '◉', wait: '⌛', set: '⏻', loop: '↻' };
  const stablo = dub(P.korijen, 0, []).map(([c, d]) => '<li><button type="button" data-akcija="sel" data-id="' + c.id + '" class="' + (P.sel === c.id || (!P.sel && c.tip === 'root') ? 'sel ' : '') + (izvId === c.id ? 'izv' : '') + '" style="padding-left:' + (4 + d * 14) + 'px"><span class="ik">' + IK[c.tip] + '</span>' + opisCvora(c) + '</button></li>').join('');
  const s = P.sel ? nadji(P.sel) : null, c = s ? s.c : P.korijen;
  let ur = '';
  if (c.tip === 'root') ur = '<h3>Robot Program</h3><p class="ps-mala">Odaberi naredbu u stablu ili dodaj novu gumbima ispod stabla. Naredba se dodaje iza odabrane; u naredbu Loop dodaje se unutra.</p><p class="ps-mala">Broj naredbi: ' + (sviCvorovi().length - 1) + '</p>';
  if (c.tip === 'move') ur = '<h3>Move</h3><div class="ps-seg">' + ['MoveJ', 'MoveL'].map((x) => '<button type="button" data-akcija="vrsta" data-v="' + x + '" aria-pressed="' + (c.vrsta === x) + '">' + x + '</button>').join('') + '</div>' +
    '<div class="ps-red"><label>Speed <input type="number" min="1" step="1" value="' + c.v + '" data-polje="v"> ' + (c.vrsta === 'MoveJ' ? '°/s' : 'mm/s') + '</label></div><div class="ps-red"><label>Acceleration <input type="number" min="1" step="1" value="' + c.a + '" data-polje="a"> ' + (c.vrsta === 'MoveJ' ? '°/s²' : 'mm/s²') + '</label></div>' +
    '<p class="ps-mala">' + (c.vrsta === 'MoveJ' ? 'MoveJ: zglobovi se gibaju zajedno (interpolacija u zglobovima); alat ide po luku.' : 'MoveL: TCP ide po pravcu; upravljanje stalno računa inverznu kinematiku.') + '</p><button type="button" class="ps-btn" data-akcija="dodajWp">Add waypoint</button>';
  if (c.tip === 'wp') {
    const T = c.q ? tcpT(c.q) : null;
    ur = '<h3>' + esc(c.ime) + '</h3><div class="ps-red"><button type="button" class="ps-btn pl" data-akcija="setWp">Set waypoint</button><button type="button" class="ps-btn" data-akcija="moveHere"' + (c.q ? '' : ' disabled') + '>Move here</button></div>' +
      (T ? '<table class="ps-t"><tr><td>X / Y / Z</td><td class="br">' + kr(T[3] * 1000) + ' / ' + kr(T[7] * 1000) + ' / ' + kr(T[11] * 1000) + ' mm</td></tr><tr><td>Joints</td><td class="br">' + c.q.map((x) => kr(stup(x), 1) + '°').join(' ') + '</td></tr></table>' : '<p class="ps-mala">Točka još nije postavljena. Dovedi robota u željeni položaj i dodirni Set waypoint.</p>');
  }
  if (c.tip === 'wait') ur = '<h3>Wait</h3><div class="ps-red"><label>Wait <input type="number" min="0" step="0.1" value="' + c.t + '" data-polje="t"> s</label></div>';
  if (c.tip === 'set') ur = '<h3>Set</h3><div class="ps-red"><label>Output <select data-polje="izlaz"><option value="0"' + (c.izlaz === 0 ? ' selected' : '') + '>Tool DO0</option><option value="1"' + (c.izlaz === 1 ? ' selected' : '') + '>Tool DO1</option></select></label></div><div class="ps-seg">' + [['On', true], ['Off', false]].map(([n, v]) => '<button type="button" data-akcija="setVal" data-v="' + n + '" aria-pressed="' + (c.val === v) + '">' + n + '</button>').join('') + '</div><p class="ps-mala">Tool DO0 = hvataljka (On zatvara, Off otvara).</p>';
  if (c.tip === 'loop') ur = '<h3>Loop</h3><div class="ps-red"><label>Times <input type="number" min="0" step="1" value="' + c.n + '" data-polje="n"></label></div><p class="ps-mala">0 = ponavljaj zauvijek (Loop always). Naredbe se dodaju u Loop kad je odabran.</p>';
  return '<div class="ps-g pg"><div class="ps-panel"><h3>' + esc(P.ime) + '</h3><ul class="pg-stablo">' + stablo + '</ul>' +
    '<div class="pg-alat">' + [['move', 'Move'], ['wp', 'Waypoint'], ['wait', 'Wait'], ['set', 'Set'], ['loop', 'Loop']].map(([t, n]) => '<button type="button" class="ps-btn" data-akcija="dodaj" data-tip="' + t + '">' + n + '</button>').join('') + '</div>' +
    '<div class="pg-alat"><button type="button" class="ps-btn" data-akcija="gore" aria-label="Pomakni naredbu gore">▲</button><button type="button" class="ps-btn" data-akcija="dolje" aria-label="Pomakni naredbu dolje">▼</button><button type="button" class="ps-btn" data-akcija="brisi">Delete</button></div></div>' +
    '<div class="ps-panel">' + ur + '</div></div>';
}
function checksum() { const s = JSON.stringify(st.sig); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h & 0xffff).toString(16).toUpperCase().padStart(4, '0'); }
function tabInstall() {
  const u = st.sigUred, sub = st.instSub;
  const st1 = (k, n) => '<button type="button" data-akcija="instSub" data-v="' + k + '" class="' + (sub === k ? 'akt' : '') + '">' + n + '</button>';
  let d = '';
  if (sub === 'tcp') d = '<h3>TCP</h3><table class="ps-t"><tr><td>Name</td><td>Gripper</td></tr><tr><td>X / Y / Z</td><td class="br">0.0 / 0.0 / ' + (TCP_Z * 1000).toFixed(1) + ' mm</td></tr><tr><td>RX / RY / RZ</td><td class="br">0 / 0 / 0 rad</td></tr></table><p class="ps-mala">TCP je točka alata kojom se programira — ovdje sredina prstiju hvataljke, 100 mm od prirubnice duž osi z alata.</p>';
  if (sub === 'payload') d = '<h3>Payload</h3><div class="ps-red"><label>Mass <input type="number" min="0" max="3" step="0.01" value="' + st.payloadUnos.toFixed(2) + '" data-polje="payload"> kg</label><button type="button" class="ps-btn" data-akcija="payloadSet">Set</button></div><p class="ps-mala">Aktivno: ' + st.payload.toFixed(2) + ' kg. Hvataljka ima 0,60 kg (naša pretpostavka); kocka je zanemarivo laka. Nosivost UR3e je 3 kg.</p>';
  if (sub === 'limits') d = '<h3>Robot Limits</h3><div class="ps-red"><label>Force <input type="number" min="50" max="250" step="5" value="' + u.sila + '" data-polje="sigSila"> N</label></div><div class="ps-red"><label>Tool speed <input type="number" min="100" max="3000" step="10" value="' + u.brzina + '" data-polje="sigBrz"> mm/s</label></div><p class="ps-mala">Aktivno: sila ' + st.sig.sila + ' N, brzina TCP-a ' + st.sig.brzina + ' mm/s. U ručnom načinu TCP najviše 250 mm/s.</p><button type="button" class="ps-btn pl" data-akcija="apply">Apply</button>';
  if (sub === 'planes') d = '<h3>Planes</h3><div class="ps-red"><label><input type="checkbox" data-polje="ravAkt"' + (u.ravnina.aktivna ? ' checked' : '') + '> Plane 1 (TCP iznad ravnine)</label></div><div class="ps-red"><label>Height <input type="number" min="0" max="400" step="5" value="' + u.ravnina.h + '" data-polje="ravH"> mm iznad stola</label></div><p class="ps-mala">Aktivno: ' + (st.sig.ravnina.aktivna ? 'ravnina na ' + st.sig.ravnina.h + ' mm' : 'nema ravnine') + '.</p><button type="button" class="ps-btn pl" data-akcija="apply">Apply</button>';
  if (sub === 'hardware') d = '<h3>Hardware</h3><div class="ps-red"><label><input type="checkbox" data-polje="tri"' + (u.tri ? ' checked' : '') + '> 3-Position Enabling Device (3PE)</label></div><p class="ps-mala">Aktivno: ' + (st.sig.tri ? '3PE uključen' : '3PE isključen') + '. S uređajem 3PE u ručnom načinu robot se giba samo dok je 3PE lagano pritisnut.</p><button type="button" class="ps-btn pl" data-akcija="apply">Apply</button>';
  return '<div class="ps-g in"><div class="ps-panel in-lista"><span class="gr">General</span>' + st1('tcp', 'TCP') + st1('payload', 'Payload') + '<span class="gr">Safety</span>' + st1('limits', 'Robot Limits') + st1('planes', 'Planes') + st1('hardware', 'Hardware') + '<div class="in-sig">Checksum <b>' + checksum() + '</b></div></div><div class="ps-panel">' + d + '</div></div>';
}
function tabIO() {
  const led = (on) => '<span class="io-led' + (on ? ' on' : '') + '"></span>';
  return '<div class="ps-g io"><div class="ps-panel"><h3>Tool Digital Output</h3>' +
    [0, 1].map((i) => '<div class="io-red"><button type="button" class="ps-btn" data-akcija="do" data-v="' + i + '" aria-pressed="' + st.io.do[i] + '">DO' + i + '</button><span data-ziv="dol' + i + '">' + led(st.io.do[i]) + '</span><span class="ps-mala">' + (i === 0 ? 'hvataljka: On = zatvori' : 'slobodan') + '</span></div>').join('') +
    '<h3 style="margin-top:8px">Tool Output Voltage</h3><p class="ps-mala">24 V (najviše 600 mA)</p></div>' +
    '<div class="ps-panel"><h3>Tool Digital Input</h3>' + [0, 1].map((i) => '<div class="io-red"><span data-ziv="di' + i + '">' + led(st.io.di[i]) + '</span><b>DI' + i + '</b><span class="ps-mala">' + (i === 0 ? 'predmet u hvataljci' : 'hvataljka otvorena') + '</span></div>').join('') +
    '<h3 style="margin-top:8px">Tool Analog Input</h3><table class="ps-t"><tr><td>AI0</td><td class="br">0.00 V</td></tr><tr><td>AI1</td><td class="br">0.00 V</td></tr></table></div></div><p class="ps-mala">Alatni priključak (M8, 8 polova) ima 2 digitalna ulaza, 2 digitalna izlaza i 2 analogna ulaza. Ulazi i izlazi ormara (16 DI, 16 DO) nisu prikazani.</p>';
}
function tabLog() {
  return '<div class="ps-panel"><h3>Log</h3><ul class="lg">' + (st.log.length ? st.log.map((x) => '<li><span>' + x.t + '</span><span class="r-' + x.razina + '">' + ({ p: '●', u: '▲', i: 'ℹ' }[x.razina]) + '</span><span>' + esc(x.tekst) + '</span></li>').join('') : '<li><span></span><span></span><span>Nema zapisa.</span></li>') + '</ul></div>';
}
/* žive vrijednosti (bez ponovnog crtanja) */
function osvjeziZivo() {
  const el = $('ekran'); const T = tcpT(st.q);
  const skr = st.skrij;
  const vr = {
    status: nazivStanja(), stanje2: nazivStanja(), initst: 'Robot: ' + nazivStanja(), brz: Math.round(st.brz * 100) + ' %',
    vtcp: 'TCP ' + Math.round(st.vTcp) + ' mm/s', vtcp2: Math.round(st.vTcp) + ' mm/s', vtcp3: String(Math.round(st.vTcp)), sila: String(Math.round(st.sila)),
    vrijeme: st.izv ? krz(vrijemeSim - st.izv.t0, 1) + ' s' : '—',
    naredba: opisNaredbe(), pstatus: st.izv ? (st.izv.pauza ? 'Paused' : 'Running') : 'Stopped'
  };
  /* pokazivač naredbe koja se izvodi */
  const izvId = st.izv && st.izv.instr[st.izv.pc] ? st.izv.instr[st.izv.pc].cvor.id : null;
  el.querySelectorAll('.pg-stablo [data-id]').forEach((b) => b.classList.toggle('izv', +b.dataset.id === izvId));
  el.querySelectorAll('.ps-play [data-akcija="play"]').forEach((b) => b.classList.toggle('akt', !!(st.izv && !st.izv.pauza)));
  el.querySelectorAll('.ps-play [data-akcija="pauza"]').forEach((b) => b.classList.toggle('akt', !!(st.izv && st.izv.pauza)));
  const rv = rotVektor(T);
  for (let i = 0; i < 3; i++) { vr['p' + i] = skr ? '???' : kr(T[3 + 4 * i] * 1000, 2); vr['r' + i] = skr ? '???' : kr(rv[i], 4); }
  el.querySelectorAll('[data-ziv]').forEach((n) => {
    const k = n.dataset.ziv;
    if (k[0] === 'q' && n.tagName === 'INPUT') { if (document.activeElement !== n) n.value = stup(st.q[+k[1]]).toFixed(1); return; }
    if (k.startsWith('tr')) { const i = +k[2]; n.style.left = (50 + 50 * clamp(st.q[i] / (2 * Math.PI), -1, 1)) + '%'; return; }
    if (k === 'boot') { n.style.width = Math.round(100 * (1 - st.bootT / 1.8)) + '%'; return; }
    if (k.startsWith('dol')) { n.innerHTML = '<span class="io-led' + (st.io.do[+k[3]] ? ' on' : '') + '"></span>'; return; }
    if (k.startsWith('di')) { n.innerHTML = '<span class="io-led' + (st.io.di[+k[2]] ? ' on' : '') + '"></span>'; return; }
    if (vr[k] !== undefined && n.textContent !== vr[k]) n.textContent = vr[k];
  });
  const sb = el.querySelector('.ps-status'); if (sb) sb.className = 'ps-status ' + statusKlasa();
  osvjeziKin();
}

/* ================================================================== */
/* 11. Kartica DH parametara i izravne kinematike                      */
/* ================================================================== */
function crtajKin() {
  const r = NAZIVI_ZGLOBOVA.map((n, i) => '<tr><td>' + (i + 1) + '</td><td>' + n + '</td><td class="ziv" data-k="th' + i + '"></td><td>' + kr(DH.d[i] * 1000, 2) + '</td><td>' + kr(DH.a[i] * 1000, 2) + '</td><td>' + kr(stup(DH.alpha[i]), 0) + '</td></tr>').join('');
  $('kin').innerHTML = '<table class="kin-t"><thead><tr><th>i</th><th>zglob</th><th>θ<sub>i</sub> [°]</th><th>d<sub>i</sub> [mm]</th><th>a<sub>i</sub> [mm]</th><th>α<sub>i</sub> [°]</th></tr></thead><tbody>' + r + '</tbody></table>' +
    '<div class="kin-dva"><div><p class="kin-h">T = T1·T2·…·T6 (prirubnica u sustavu baze)</p><div class="kin-m" id="kin-m" aria-label="Matrica izravne kinematike"></div><p class="pom">Rotacija (stupci: osi x, y, z prirubnice) i položaj u mm. Zadnji redak je 0 0 0 1.</p></div>' +
    '<div class="kin-p"><p class="kin-h">Prirubnica (DH)</p><div><span>X</span><b data-k="fx"></b></div><div><span>Y</span><b data-k="fy"></b></div><div><span>Z</span><b data-k="fz"></b></div><div><span>rx / ry / rz</span><b data-k="frv"></b></div>' +
    '<p class="kin-h" style="margin-top:8px">TCP (+100 mm duž z alata)</p><div><span>X / Y / Z</span><b data-k="tp"></b></div><div><span>rx / ry / rz</span><b data-k="trv"></b></div><div><span>RPY</span><b data-k="trpy"></b></div></div></div>' +
    '<div class="kin-zad" id="kin-zad" hidden><p class="kin-h">Zadatak: položaj prirubnice</p><label>X <input type="number" step="0.1" id="dh-x" aria-label="Izračunati X u mm"> mm</label><label>Y <input type="number" step="0.1" id="dh-y" aria-label="Izračunati Y u mm"> mm</label><label>Z <input type="number" step="0.1" id="dh-z" aria-label="Izračunati Z u mm"> mm</label><button type="button" class="gumb tanki" id="dh-provjeri">Provjeri</button><p class="pom" id="dh-poruka" aria-live="polite"></p></div>';
  $('dh-provjeri').addEventListener('click', provjeriDH);
}
function provjeriDH() {
  const v = ['dh-x', 'dh-y', 'dh-z'].map((id) => parseFloat(String($(id).value).replace(',', '.')));
  const kutOk = Q9.every((x, i) => blizu(st.q, i, x, 0.1));
  const p = fk(st.q).p.map((x) => x * 1000);
  const ok = kutOk && v.every((x, i) => Number.isFinite(x) && Math.abs(x - p[i]) <= 1);
  $('dh-poruka').textContent = !kutOk ? 'Najprije postavi zadane kutove zglobova.' : ok ? 'Točno — sva tri broja su unutar ±1 mm.' : 'Nije točno: ' + ['X', 'Y', 'Z'].filter((o, i) => !(Math.abs(v[i] - p[i]) <= 1)).join(', ') + ' izvan ±1 mm. Provjeri predznake a2 i a3 (negativni!) i kutove u radijanima.';
  dogadaj('dhProvjera', ok);
}
let kinPotpis = '';
function osvjeziKin() {
  const potpis = st.q.map((x) => x.toFixed(5)).join(',') + st.skrij;
  if (potpis === kinPotpis) return; kinPotpis = potpis;
  const F = fk(st.q), T = F.T, Tt = tcpT(st.q), skr = st.skrij;
  const k = $('kin'); const s = (n, v) => { const e = k.querySelector('[data-k="' + n + '"]'); if (e) e.textContent = v; };
  for (let i = 0; i < 6; i++) s('th' + i, kr(stup(st.q[i]), 2));
  const m = []; for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) m.push(kr(T[4 * i + j], 4)); m.push(skr ? '???' : kr(T[4 * i + 3] * 1000, 2)); }
  m.push('0', '0', '0', '1');
  $('kin-m').innerHTML = m.map((x) => '<span>' + x + '</span>').join('');
  const mm = (x) => (skr ? '???' : kr(x * 1000, 2) + ' mm');
  s('fx', mm(T[3])); s('fy', mm(T[7])); s('fz', mm(T[11]));
  s('frv', F.rv.map((x) => kr(x, 4)).join(' / '));
  s('tp', skr ? '???' : [Tt[3], Tt[7], Tt[11]].map((x) => kr(x * 1000, 1)).join(' / ') + ' mm');
  const rt = rotVektor(Tt); s('trv', rt.map((x) => kr(x, 4)).join(' / '));
  const rp = fk(st.q).rpy; s('trpy', rp.map((x) => kr(stup(x), 1) + '°').join(' / '));
}

/* ================================================================== */
/* 12. Nizovi: izbornik, upute, početna stanja                         */
/* ================================================================== */
function crtajIzbornik() {
  const el = $('nizovi'); let h = '', g = '';
  NIZOVI.forEach((n, i) => { if (n.grupa !== g) { g = n.grupa; h += '<li class="grupa">' + esc(g) + '</li>'; } h += '<li><button type="button" class="niz' + (niz && niz.id === n.id ? ' akt' : '') + '" data-niz="' + n.id + '">' + (gotovi.has(n.id) ? '<span class="kv" aria-label="završeno">✓</span>' : '<span class="br">' + (i + 1) + '</span>') + esc(n.naziv) + '</button></li>'; });
  el.innerHTML = h;
  el.querySelectorAll('[data-niz]').forEach((b) => b.addEventListener('click', () => pokreniNiz(b.dataset.niz)));
}
function crtajKorak() {
  const k = trenutni();
  $('uputa').innerHTML = k ? '<b>Korak ' + (korak + 1) + ' od ' + niz.koraci.length + ' · ' + esc(niz.naziv) + '</b><br>' + esc(k[0]) : 'Odaberi niz u izborniku. Privjesak i robot rade i bez niza — isprobaj kartice Move, Program i Installation.';
  $('pomoc').textContent = k ? k[1] : 'Gumb u donjoj traci zaslona pokazuje stanje robota; klik otvara zaslon za pokretanje. Gljiva desno je nužno zaustavljanje.';
  $('dalje').hidden = !(k && k[2] === 'dalje');
  $('ponovi').hidden = !(k && k[2] === 'kraj');
  st.skrij = !!(niz && niz.id === 'kinematika' && korak <= 1);
  $('kin-zad').hidden = !(niz && niz.id === 'kinematika' && korak <= 1);
  if (st.jog || st.fdVuce) st.refOdgodi = true; else snimiRef();   /* ako se korak završi usred gibanja, referenca se uzima kad gibanje stane */
  crtajIzbornik(); crtajEkran();
}
function pripremi(id) {
  const ub = st.ubrzanje;
  pocetnoStanje(); st.ubrzanje = ub;
  obrisiPut(); zadnjiSegmenti = [];
  if (id === 'pokretanje') { st.privjesak = 'off'; st.stanje = 'poweroff'; st.payload = 0; st.payloadUnos = 0; }
  if (id === 'zglobovi') st.tab = 'Run';
  if (id === 'alat') { st.tab = 'Run'; st.feature = 'Tool'; }
  if (id === 'freedrive') st.tab = 'Move';
  if (id === 'program') st.tab = 'Run';
  if (id === 'movel') {
    st.tab = 'Program'; st.prog = prazanProgram('putanje.urp');
    const m = noviMove('MoveJ');
    m.djeca.push(noviWp(qZaTcp([-0.35, -0.10, 0.20])), noviWp(qZaTcp([0.05, -0.38, 0.20])));
    st.prog.korijen.djeca.push(m); st.prog.sel = m.id;
  }
  if (id === 'uzmi') {
    st.tab = 'Run'; st.prog = prazanProgram('uzmi_ostavi.urp');
    const zA = 0.12, zB = 0.12, P = st.prog.korijen.djeca;
    const add = (vrsta, p) => { const m = noviMove(vrsta); m.djeca.push(noviWp(qZaTcp(p))); P.push(m); };
    add('MoveJ', [KOCKA_A[0], KOCKA_A[1], zA]); add('MoveL', [KOCKA_A[0], KOCKA_A[1], KOCKA_POLA]); add('MoveL', [KOCKA_A[0], KOCKA_A[1], zA]);
    add('MoveJ', [KOCKA_B[0], KOCKA_B[1], zB]); add('MoveL', [KOCKA_B[0], KOCKA_B[1], KOCKA_POLA]); add('MoveL', [KOCKA_B[0], KOCKA_B[1], zB]);
  }
  if (id === 'sigurnost') { st.tab = 'Run'; st.prepreka = true; }
  if (id === 'kinematika') st.tab = 'Move';
}
function qZaTcp(p) {   /* zglobovi za TCP u točki p s alatom okrenutim prema stolu */
  const R = R9(tcpT(POC));
  return ikTcp(sastavi(R, p), POC, 10) || POC.slice();
}
function pokreniNiz(id) {
  niz = NIZOVI.find((n) => n.id === id); korak = 0;
  $('poruka').textContent = '';
  pripremi(id);
  if (id === 'movel' || id === 'uzmi') pogled('robot');
  if (id === 'sigurnost') pogled('robot');
  ['dh-x', 'dh-y', 'dh-z'].forEach((x) => { $(x).value = ''; }); $('dh-poruka').textContent = '';
  kinPotpis = '';
  crtajKorak();
}

/* ================================================================== */
/* 13. Povezivanje                                                    */
/* ================================================================== */
const ekran = $('ekran');
ekran.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]'); if (t) { st.tab = t.dataset.tab; dogadaj('tab'); crtajEkran(); return; }
  const b = e.target.closest('[data-akcija]'); if (!b || b.disabled) return;
  akcija(b.dataset.akcija, b.dataset);
});
function akcija(a, d = {}) {
  const P = st.prog, sel = P.sel ? nadji(P.sel) : null;
  switch (a) {
    case 'init': if (st.privjesak === 'on') { st.initOtvoren = true; dogadaj('init'); } break;
    case 'initON': initGumb('ON'); break;
    case 'initSTART': initGumb('START'); break;
    case 'initOFF': initGumb('OFF'); break;
    case 'initExit': st.initOtvoren = false; dogadaj('exit'); break;
    case 'payloadSet': {
      const v = st.payloadUnos;
      if (!(v >= 0 && v <= 3)) { info('Nosivost UR3e je najviše 3 kg.'); break; }
      st.payload = v; zapis('i', 'Payload set: ' + v.toFixed(2) + ' kg'); dogadaj('payload'); break;
    }
    case 'enable': omoguci(); return;
    case 'estopOk': st.estopDlg = false; st.initOtvoren = true; dogadaj('init'); break;
    case 'nacin': st.nacin = st.nacin === 'Manual' ? 'Automatic' : 'Manual'; zapis('i', 'Operational mode: ' + st.nacin); info(st.nacin === 'Manual' ? 'Ručni način: TCP najviše 250 mm/s.' : 'Automatski način: vrijede granice iz instalacije.'); dogadaj('nacin'); break;
    case 'feature': st.feature = d.v; dogadaj('feature'); break;
    case 'freedrive': prekidacFreedrive(); return;
    case 'fdNacin': st.fdNacin = d.v; st.fdCilj = null; snimiRefAkoTreba(); oznakaFd(); dogadaj('fdNacin'); break;
    case 'play': play(); return;
    case 'pauza': pauza(); return;
    case 'stop': stop(); return;
    case 'sel': P.sel = +d.id === P.korijen.id ? null : +d.id; break;
    case 'dodaj': dodajCvor(d.tip); return;
    case 'dodajWp': dodajCvor('wp'); return;
    case 'gore': pomakniCvor(-1); return;
    case 'dolje': pomakniCvor(1); return;
    case 'brisi': obrisiCvor(); return;
    case 'vrsta': if (sel && sel.c.tip === 'move' && sel.c.vrsta !== d.v) { sel.c.vrsta = d.v; sel.c.v = ZADANO[d.v].v; sel.c.a = ZADANO[d.v].a; dogadaj('program'); } break;
    case 'setWp': if (sel && sel.c.tip === 'wp') { sel.c.q = st.q.slice(); zapis('i', sel.c.ime + ' set.'); dogadaj('program'); } break;
    case 'moveHere': if (sel && sel.c.tip === 'wp' && sel.c.q && mozeGibati(false)) st.auto = { cilj: sel.c.q.slice() }; break;
    case 'setVal': if (sel && sel.c.tip === 'set') { sel.c.val = d.v === 'On'; dogadaj('program'); } break;
    case 'instSub': st.instSub = d.v; dogadaj('tab'); break;
    case 'apply': st.sig = JSON.parse(JSON.stringify(st.sigUred)); zapis('i', 'Safety configuration applied. Checksum ' + checksum()); info('Sigurnosne postavke su primijenjene (checksum ' + checksum() + ').'); dogadaj('apply'); break;
    case 'do': postaviIzlaz(+d.v, !st.io.do[+d.v]); break;
    default: break;
  }
  crtajEkran();
}
ekran.addEventListener('change', (e) => {
  const n = e.target.closest('[data-polje]'); if (!n) return;
  const k = n.dataset.polje, v = n.type === 'checkbox' ? n.checked : parseFloat(String(n.value).replace(',', '.'));
  const sel = st.prog.sel ? nadji(st.prog.sel) : null;
  if (k === 'brz') { st.brz = clamp(v / 100, 0.1, 1); return; }
  if (k[0] === 'q' && k.length === 2) { upisKuta(+k[1], v); return; }
  if (k === 'payload') { st.payloadUnos = v; return; }
  if (k === 'sigSila') { st.sigUred.sila = Math.round(clamp(v || 0, 50, 250)); n.value = st.sigUred.sila; return; }
  if (k === 'sigBrz') { st.sigUred.brzina = Math.round(clamp(v || 0, 100, 3000)); n.value = st.sigUred.brzina; return; }
  if (k === 'ravAkt') { st.sigUred.ravnina.aktivna = v; return; }
  if (k === 'ravH') { st.sigUred.ravnina.h = clamp(v || 0, 0, 400); n.value = st.sigUred.ravnina.h; return; }
  if (k === 'tri') { st.sigUred.tri = v; return; }
  if (sel) {
    if (k === 'v' && sel.c.tip === 'move') sel.c.v = clamp(v || 1, 1, sel.c.vrsta === 'MoveJ' ? 180 : 1000);
    if (k === 'a' && sel.c.tip === 'move') sel.c.a = clamp(v || 1, 1, sel.c.vrsta === 'MoveJ' ? 800 : 5000);
    if (k === 't' && sel.c.tip === 'wait') sel.c.t = clamp(v || 0, 0, 60);
    if (k === 'izlaz' && sel.c.tip === 'set') sel.c.izlaz = +n.value;
    if (k === 'n' && sel.c.tip === 'loop') sel.c.n = Math.max(0, Math.round(v || 0));
    /* samo natpis u stablu (cijeli zaslon se ne crta, da klik na sljedeći gumb ne propadne) */
    const lb = ekran.querySelector('[data-akcija="sel"][data-id="' + sel.c.id + '"]');
    if (lb) lb.innerHTML = '<span class="ik">' + lb.querySelector('.ik').textContent + '</span>' + opisCvora(sel.c);
    dogadaj('program');
  }
});
ekran.addEventListener('input', (e) => { const n = e.target.closest('[data-polje="brz"]'); if (n) { st.brz = clamp(+n.value / 100, 0.1, 1); osvjeziZivo(); } });
function upisKuta(i, stupnjeva) {
  if (!Number.isFinite(stupnjeva)) return;
  if (i < 5 && Math.abs(stupnjeva) > 360) { info('Granica zgloba je ±360°.'); crtajEkran(); return; }
  if (!mozeGibati(false)) { crtajEkran(); return; }
  const cilj = (st.auto ? st.auto.cilj : st.q).slice(); cilj[i] = stupnjeva * D; st.auto = { cilj };
}
/* gumbi koji se drže (jog, Home) */
function pocniJog(spec) {
  if (!mozeGibati(false)) return;
  if (spec === 'home') { st.jog = { vrsta: 'home' }; return; }
  const [vrsta, os, smjer] = spec.split(':'); st.jog = { vrsta, os: +os, smjer: +smjer };
}
function krajJog() { if (!st.jog) return; st.jog = null; if (st.refOdgodi) { st.refOdgodi = false; snimiRef(); } ekran.querySelectorAll('.drzi').forEach((b) => b.classList.remove('drzi')); if (st.trebaCrtati) crtajEkran(); }
ekran.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-drzi]'); if (!b) return; e.preventDefault(); b.classList.add('drzi'); pocniJog(b.dataset.drzi); });
document.addEventListener('pointerup', krajJog); document.addEventListener('pointercancel', krajJog);
ekran.addEventListener('keydown', (e) => { const b = e.target.closest('[data-drzi]'); if (b && (e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); b.classList.add('drzi'); pocniJog(b.dataset.drzi); } });
ekran.addEventListener('keyup', (e) => { const b = e.target.closest('[data-drzi]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); krajJog(); } });
ekran.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-drzi]')) e.preventDefault(); });
function snimiRefAkoTreba() { snimiRef(); }
function oznakaFd() { $('sc-oznaka').textContent = st.freedrive ? 'Freedrive · ' + st.fdNacin + ' — povuci robota za alat' : ''; $('sc-oznaka').classList.toggle('vid', st.freedrive); }
function prekidacFreedrive() {
  if (!st.freedrive) { if (!mozeGibati(false)) return; st.freedrive = true; zapis('i', 'Freedrive on (' + st.fdNacin + ').'); info('Freedrive: povuci robota za alat u 3D prikazu. Način: ' + st.fdNacin + '.'); }
  else { st.freedrive = false; st.fdCilj = null; krajVuce(); zapis('i', 'Freedrive off.'); }
  oznakaFd();
  dogadaj('freedrive'); crtajEkran();
}
$('b-freedrive').addEventListener('click', prekidacFreedrive);
$('b-3pe').addEventListener('click', () => {
  st.tri = { pusten: 'lagano', lagano: 'jako', jako: 'pusten' }[st.tri];
  if (st.tri === 'jako' && (st.jog || (st.izv && !st.izv.pauza))) { zaustaviGibanja(); zapis('u', '3PE stop.'); }
  info({ pusten: '3PE pušten: u ručnom načinu robot stoji.', lagano: '3PE lagano pritisnut (srednji položaj): gibanje je dopušteno.', jako: '3PE jako pritisnut: zaustavljanje (refleks pri opasnosti).' }[st.tri]);
  dogadaj('3pe'); crtajEkran();
});
$('b-power').addEventListener('click', tipkaPrivjeska);
$('gljiva').addEventListener('click', gljiva);
$('dalje').addEventListener('click', () => dogadaj('dalje'));
$('ponovi').addEventListener('click', () => { if (niz) pokreniNiz(niz.id); });
$('izbornik').addEventListener('click', () => { niz = null; korak = 0; crtajKorak(); });
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
$('t-okviri').addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); if (M.pomocni && M.pomocni.okviriDH) M.pomocni.okviriDH(on); });
$('t-osi').addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); osiBaze.visible = on; });
$('t-putanja').addEventListener('click', obrisiPut);
$('t-kocka').addEventListener('click', () => { if (st.kocka.uRuci) { info('Hvataljka drži kocku — najprije je otvori (DO0 = Off).'); return; } vratiKocku(); });
$('ubrzanje').addEventListener('change', () => { st.ubrzanje = +$('ubrzanje').value; });

/* ================================================================== */
/* 14. Petlja                                                         */
/* ================================================================== */
function logika(dt) {
  const dtR = dt * (st.ubrzanje || 1);
  vrijemeSim += dtR;
  if (st.privjesak === 'boot') { st.bootT -= dtR; if (st.bootT <= 0) { st.privjesak = 'on'; st.stanje = 'poweroff'; st.tab = 'Run'; zapis('i', 'PolyScope started. Robot is powered off.'); dogadaj('privjesak'); crtajEkran(); } }
  if (st.stanje === 'paljenje' || st.stanje === 'otpustanje') {
    st.prijelazT -= dtR;
    if (st.prijelazT <= 0) { const bio = st.stanje; st.stanje = bio === 'paljenje' ? 'idle' : 'normal'; zapis('i', bio === 'paljenje' ? 'Robot powered on (Idle).' : 'Brakes released. Robot is in Normal mode.'); dogadaj(st.stanje); crtajEkran(); }
  }
  if (st.kocenje > 0) {   /* kategorija 1: kontrolirano zaustavljanje pa isključenje napajanja */
    const k = st.kocenje / 0.25; const qn = st.q.map((x, i) => x + st.qV[i] * k * dtR);
    if (!provjeriSudar(qn).zaustavi) st.q = qn;
    st.kocenje -= dtR; if (st.kocenje <= 0) { st.kocenje = 0; st.stanje = 'poweroff'; crtajEkran(); }
  }
  const qPrije = st.q.slice();
  korakJog(dtR); korakAuto(dtR); korakFreedrive(dtR); korakProg(dtR); korakHvataljke(dtR);
  if (dtR > 0) {
    if (st.kocenje <= 0) st.qV = st.q.map((x, i) => (x - qPrije[i]) / dtR);
    const v = dist(pT(tcpT(qPrije)), pT(tcpT(st.q))) / dtR * 1000;
    st.vTcp = st.vTcp * 0.7 + v * 0.3; if (st.vTcp < 0.5) st.vTcp = 0;
  }
}
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(velicina).observe(scenaEl);
let zadnje = performance.now(), zadnjiZivo = 0;
function petlja(t) {
  const dt = Math.min(0.1, Math.max(0, (t - zadnje) / 1000)); zadnje = t;
  logika(dt);
  postavi3D();
  if (t - zadnjiZivo > 100) { zadnjiZivo = t; osvjeziZivo(); }
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(petlja);
}
crtajKin(); crtajIzbornik(); crtajKorak(); velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
/* testna kuka */
window.__ur3e = {
  st, NIZOVI, pokreniNiz, dogadaj, akcija, fk, ik, tcpT, HOME, POC, Q9, KOCKA_B, model: M, camera, controls, renderer,
  get niz() { return niz; }, get korak() { return korak; }, get segmenti() { return zadnjiSegmenti; },
  simuliraj(sek, dt = 1 / 60) { const n = Math.round(sek / dt); for (let i = 0; i < n; i++) logika(dt); postavi3D(); osvjeziZivo(); },
  drzi(spec, sek) { pocniJog(spec); const n = Math.round(sek * 60); for (let i = 0; i < n && st.jog; i++) logika(1 / 60); krajJog(); postavi3D(); osvjeziZivo(); },
  upisKuta, provjeriDH, gljiva, tipkaPrivjeska, prekidacFreedrive, omoguci, crtajEkran,
  fdCilj(c) { st.fdCilj = c; }
};
requestAnimationFrame(petlja);
