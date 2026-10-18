// teme_cpf.js — 14 interaktivnih 2D tema „Kako radi” za Pametnu tvornicu CP Factory (Rel. B)
// (DOS ForTroniQ, područje cp-factory). ES modul; jedina ovisnost je ./cpf_podaci.js (jedini izvor istine).
// Izvozi: TEME (naslov, engl, uvod, kako, napomena), prikazi(el, id) → { unisti() } i postaviPodatke(obj).
// Tekst i grafika su vlastiti. Što izvori ne objavljuju, označeno je kao pretpostavka, pojednostavljenje ili „nedostaje”.
import { KONFIG, MJERE, MODULI, MATERIJAL, MES, UPRAVLJANJE, SCENARIJ, TEME as NAZIVI } from './cpf_podaci.js';
import { putevi, tockaPuta } from './cpf_model.js';

/* =========================================================== podaci
   Brojevi se preuzimaju iz cpf_podaci.js; postaviPodatke({...}) ih može prepisati (dubinsko spajanje) prije prikaza. */
const kopija = o => JSON.parse(JSON.stringify(o));     // vlastita kopija: postaviPodatke ne mijenja cpf_podaci.js
const D = {
  konfig: kopija(KONFIG), mjere: kopija(MJERE), moduli: kopija(MODULI), materijal: kopija(MATERIJAL), mes: kopija(MES), upr: kopija(UPRAVLJANJE), scenarij: kopija(SCENARIJ)
};
/* Napomena: tlocrt traka (putevi, tockaPuta) računa cpf_model.js iz cpf_podaci.js, isto kao 3D model. */
function spoji(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') spoji(a[k], b[k]); else a[k] = b[k]; } }
export function postaviPodatke(o) { if (o && typeof o === 'object') spoji(D, o); }

/* =========================================================== oblikovanje brojeva */
const hr = (n, d = 1) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d).replace('.', ',').replace('-', '−');
const mmT = (m, d = 0) => hr(m * 1000, d) + ' mm';
const opNo = o => (o == null ? '[nedostaje]' : String(o));

/* =========================================================== tekstovi
   Naslovi dolaze iz cpf_podaci.js (TEME); brojevi iz D (tj. iz cpf_podaci.js), kratice izvora u uglatim zagradama. */
const M_ = () => D.moduli, MJ = () => D.mjere, U_ = () => D.upr, ME = () => D.mes;
const opisOp = n => { const o = (ME().operacije || []).find(x => x.opNo === n); return o ? `${o.opNo} ${o.naziv}` : String(n); };
const opRes = r => (ME().operacije || []).find(x => x.resurs === r) || {};
const teksti = {
  tokMaterijala: {
    engl: 'Material flow, carrier loop',
    get uvod() {
      const m = M_(), mj = MJ();
      return [
        `Linija ${m.rass.oznaka.replace('-C11R40', '')} – ${m.branch.oznaka.replace('-C11', '')} – ${m.asrs.oznaka.replace('-C11', '')} je zatvorena petlja za nosače izradaka. Prednja traka vozi od ASRS-a prema RASS-u, na kraju linije nosač prelazi na stražnju traku i vraća se prema ASRS-u. Trake su široke ${hr(mj.traka.sirina * 1000, 0)} mm [MAN-ASRS], a moduli su dugi po ${hr(mj.modul.sirina * 1000, 0)} mm, pa je linija duga ${hr(mj.modul.sirina * 3, 1)} m.`,
        `Nosač (${D.materijal.nosac.mjere}, MES PNo ${D.materijal.nosac.mesPNo}) nosi paletu (PNo ${D.materijal.paleta.mesPNo}), a paleta jedan izradak [FAC-150]. Nosači stalno kruže; svaki zaustavljač ih zadrži samo kad stanica za njih ima operaciju. ASRS izdaje paletu na nosač (${opisOp(212)}) i sprema je natrag (${opisOp(211)}); RASS montira na trećoj traci (bypass), pa dugi ciklus robota ne zaustavlja petlju [IP-RASS]. Na BRANCH-u nosač može skrenuti u krak i otići Robotinom.`
      ];
    },
    kako: 'Pokreni liniju i dodaj naloge. Svaki nalog čeka prazan nosač na zaustavljaču 1 ASRS-a; tamo nosač dobije paletu s poklopcem, putuje do RASS-a, skreće na bypass na montažu i vraća se na zaustavljač 2, gdje se paleta sprema. Uključi transport Robotinom: nosač tada prije RASS-a skrene u krak BRANCH-a i čeka da ga Robotino odveze i vrati. Klizačem ubrzaj prikaz; nosači se ne sudaraju jer svaki čeka razmak do nosača ispred.',
    get napomena() {
      const t = MJ().traka;
      return `Brzine traka (${hr(t.brzinaSpora, 2)} i ${hr(t.brzinaBrza, 2)} m/s), trajanja operacija (ASRS ~${D.scenarij.koraci[1].trajanje} s, RASS ~${D.scenarij.koraci[3].trajanje} s) i oblik bypassa su pretpostavke iz cpf_podaci.js; Festo ih ne objavljuje. OpNo montaže u RASS-u, BRANCH-a i Robotina nedostaju (pročitati u MES4). Vrijeme vožnje Robotina je ilustracija. Krajevi linije prikazani su kao polukružni povrat.`;
    }
  },
  osnovniModul: {
    engl: 'Basic conveyor module (Rel. B)',
    get uvod() {
      const u = U_();
      return [
        `Sve tri stanice linije građene su na istom osnovnom modulu Rel. B: ormar ${hr(MJ().modul.sirina * 1000, 0)} × ${hr(MJ().modul.dubina * 1000, 0)} mm na kotačićima, s dvjema trakama u suprotnim smjerovima. Svaka staza ima zaustavljač, senzore nosača i RFID glavu ispod remena. U ormaru su vlastiti PLC (${u.plc.tip}), HMI ${u.hmi.tip}, preklopnik ${u.preklopnik.tip}, pneumatika i električni razvod [${u.plc.izvor}].`,
        `Modul je samostalan: na njega se dograđuje aplikacija (portal ASRS-a, robotska ćelija RASS-a, krak grananja BRANCH-a). Stanice se spajaju jednim spojnim kabelom i cijevi: ${u.spoj.charAt(0).toLowerCase() + u.spoj.slice(1)} [MAN-ASRS]. Zato se linija produljuje ili preslaguje bez novog ožičenja.`
      ];
    },
    kako: 'Odaberi stanicu: podaci s pločice i broj ulaza i izlaza mijenjaju se. Pokreni nosač: prati kako se ulazi (senzori) i izlazi (motor trake, zaustavljač) PLC-a pale u stupcu desno. Klikni dio modula na crtežu ili u popisu za opis.',
    napomena: 'Smještaj PLC-a, ventilskog otoka i senzora uz stazu je načelan; oznake signala (npr. BG20, MB20) uzete su s ASRS-a [MAN-ASRS] i prikazane za sve stanice. Prikazana je jedna staza; stvarni modul ima dvije s istim elementima.'
  },
  rfid: {
    engl: 'RFID carrier identification',
    get uvod() {
      const r = D.materijal.rfid;
      return [
        `Svaki nosač ima RFID tag; glava ispod staze na zaustavljaču ga čita i u njega piše. Sustav: ${r.tip} [${r.izvor}]. Tag je pasivan: napaja ga elektromagnetsko polje glave, pa radi samo kad je nosač iznad glave, na udaljenosti do 30 mm.`,
        `Tag je „putni list” izratka. U načinu MES na njemu su ${r.mesNacin.join(', ')} [MAN-ASRS]: stanica iz njega zna kojem nalogu nosač pripada i je li ona sljedeći resurs. U načinu Default na tagu su ${r.defaultNacin.join(' i ')}, a svaka stanica sama odlučuje prema tablici prijelaza. Uz RFID nosač ima i 4-bitni kod od četiri vijka koji čitaju induktivni senzori [FAC-150].`
      ];
    },
    kako: 'Odaberi način (MES ili Default) i pusti nosač na glavu: glava ga čita čim uđe u polje. „Piši (OpEnd)” upisuje sljedeći resurs i operaciju, kao na kraju operacije. Klizačem povećaj razmak taga i glave iznad 30 mm — čitanje ne uspije. Kvačica 4-bitnog koda pokazuje kako se broj nosača kodira vijcima.',
    napomena: 'Veličina polja i trajanje čitanja/pisanja su ilustracija; memorijski raspored taga i kodiranje polja Festo ne objavljuje. Vrijednosti u tablici su primjer. Granica 30 mm prikazana je kao oštra, u stvarnosti ovisi o tagu, glavi i okolini.'
  },
  zaustavljac: {
    engl: 'Stopper and working position',
    get uvod() {
      return [
        'Zaustavljač je pneumatski klin ispod staze. U mirovanju je gore, nosač naleti na njega i stoji, a remen klizi ispod nosača. Senzor javlja da je nosač stigao; tek tada glava čita RFID i stanica odlučuje: ima li operaciju, radi je, a ako nema, odmah spušta klin [MAN-ASRS].',
        'Spušteni klin javlja senzor spuštenog položaja (na ASRS-u G1_BG20, ventil G1_MB20). Klin se drži dolje samo dok nosač ne prijeđe preko njega, pa se diže prije sljedećeg nosača — tako se nosači razdvajaju jedan po jedan. Nosači koji stignu za vrijeme operacije čekaju u redu na remenu.'
      ];
    },
    kako: 'Pokreni nosače i promatraj vremenski dijagram: senzor nosača, RFID, operacija, klin dolje, motor trake. Klizačem mijenjaj trajanje operacije i vrijeme spuštanja klina. Isključi „Operacija za ovaj nosač” — stanica pročita RFID i odmah pusti nosač. Ako je klin dolje predugo, sljedeći nosač prođe neobrađen.',
    get napomena() { return `Vremena (čitanje RFID-a, hod klina) i oblik klina su ilustracija; Festo ih ne objavljuje. Brzina remena ${hr(MJ().traka.brzinaSpora, 2)} m/s je pretpostavka iz cpf_podaci.js. Prikazan je nosač duljine ${hr(MJ().nosac.duljina * 1000, 0)} mm s duljom stranicom u smjeru vožnje (također pretpostavka).`; }
  },
  regalnoSkladiste: {
    engl: 'Automated high-bay storage for pallets (AS/RS)',
    get uvod() {
      const a = MJ().asrs, m = M_().asrs;
      return [
        `${m.oznaka.replace('-C11', '')} sprema palete na 32 mjesta: 16 u prednjem i 16 u stražnjem regalu, numeriranih slijeva nadesno i odozdo prema gore [MAN-ASRS], [UPV]. Kartezijski robot ima servo osi X i Z (Festo EMMS-AS s regulatorima CMMP-AS na PROFINET-u), pneumatsku os Y (cilindar DGC-18-140, hod ${hr(a.os.yHod * 1000, 0)} mm) i zakretnu os C (DRQD-B-20-180, 0°/180°), te paralelnu prihvatnicu HGPT-20 sa svjetlovodom „shelf free” [${m.izvor.replace(', foto', '')}].`,
        `Dvije trake imaju po jedan radni položaj: ST1 na prednjoj i ST2 na stražnjoj traci. Izdavanje (${opisOp(212)}, ${opisOp(213)}) uzima paletu s police i stavlja je na nosač; spremanje (${opisOp(210)}, ${opisOp(211)}) radi obrnuto. Os C okreće prihvatnicu prema regalu ili traci s iste strane, a Y ju uvlači u policu. Zalihu po mjestima vodi MES.`
      ];
    },
    kako: 'Klikni mjesto u regalu (puno ili prazno), odaberi zaustavljač i pritisni „Izdaj” ili „Spremi”. Portal vozi X i Z istodobno, zatim slijede Y, prihvatnica i C; popis koraka i vrijeme ciklusa prate se desno. Izdavanje s praznog ili spremanje na puno mjesto javlja grešku, kao svjetlovod „shelf free”. Bočni pogled pokazuje kamo gleda os C i koliko izlazi os Y.',
    get napomena() {
      const o = MJ().asrs.os;
      return `Raspored 4 × 4 mjesta po regalu, visine polica, izvedba portala i brzine osi (X ${hr(o.vX, 2)} m/s, Z ${hr(o.vZ, 2)} m/s, Y ${hr(o.tY, 1)} s, C ${hr(o.tC, 1)} s, hvat ${hr(o.tHvat, 1)} s) su pretpostavke; Festo ne objavljuje hod X i Z ni ciklusna vremena. Gibanje osi je jednoliko (bez rampi ubrzanja).`;
    }
  },
  robotskaMontaza: {
    engl: 'Robot assembly cell',
    get uvod() {
      const m = M_().rass;
      return [
        `${m.nazivHr} ${m.oznaka}: ${m.funkcija.charAt(0).toLowerCase() + m.funkcija.slice(1)} [IP-RASS]`,
        `Robot mijenja alate izmjenjivačem Zimmer WWR40 iz spremišta: vakuumska prihvatnica za tiskanu pločicu, paralelne prihvatnice Festo DHPS-16 za poklopce i DHPS-10 za osigurače [IP-RASS]. Tiskane pločice dolaze u kutiji (PNo ${D.materijal.kutijaPCB.mesPNo}) koja se umeće trakom sa stražnje strane, a osigurači iz tri cijevi s detekcijom. Kamera s LED reflektorom provjerava orijentaciju; svjetlosne barijere na bypassu provjeravaju položaj izratka.`
      ];
    },
    kako: 'Odaberi broj osigurača u nalogu i pokreni slijed ili ga prolazi korak po korak. Robot (pogled odozgo) uzima alat, PCB iz kutije i osigurače iz cijevi; pri svakoj izmjeni alata ide do spremišta. Otvori vrata ćelije ili izvadi kutiju PCB: robot se zaustavlja (sigurnosni stop) i nastavlja tek kad uvjet nestane.',
    get napomena() { return `Inačica s robotom KUKA (RASS-C11R40) nije javno dokumentirana: raspored ćelije, redoslijed koraka (uključivo uporabu stezne naprave), broj mjesta u spremištu (TOOL1–TOOL4 s plakata u ćeliji; Festo za R15 navodi 3) i umetak kutije (4 gnijezda; Festo navodi 10 PCB-a) su pretpostavke iz fotografija. U pogledu odozgo ruka je crta od baze do prirubnice (zakret osi A1); visina se ne vidi.`; }
  },
  grananje: {
    engl: 'Branch, deflector arm',
    get uvod() {
      const b = M_().branch;
      return [
        `${b.nazivHr} ${b.oznaka}: ${b.funkcija.split('.')[0].charAt(0).toLowerCase() + b.funkcija.split('.')[0].slice(1)} [IP-BR]. Skretnica je zakretni krak s pneumatskim zakretnim cilindrom; senzori W1_BG30 (ravno) i W1_BG31 (bypass otvoren) javljaju njezin položaj [MAN-BR].`,
        'Krak ima dvije trake: traka 3 vodi nosač van, preusmjerivač na kraju ga prebaci, a traka 4 ga vraća na glavnu traku. Prije zakretanja skretnice senzori BG42/BG45 moraju javiti da je područje slobodno; na povratku traka 4 pušta nosač na glavnu traku tek kad je mjesto spajanja („kritični odsječak”) prazno. U ovoj liniji modul je okrenut za 180°, pa krak strši prema prolazu, gdje pristaje Robotino.'
      ];
    },
    kako: 'Pokreni nosače. U načinu „prema RFID-u” klizač određuje koliki dio nosača ima nalog za krak. Prati senzore skretnice i zaustavljače: nosač čeka na zaustavljaču grananja dok se skretnica ne postavi. Uključi kvar senzora područja — skretnica se više ne zakreće (blokada), a nosači čekaju.',
    napomena: 'Geometrija kraka (izbačaj, razmak traka) je procjena iz fotografije, a numeracija traka i položaj zaustavljača tumačenje I/O tablice [IP-BR]. Na prednjoj liniji je aplikacijski modul (tip nije utvrđen) — u ovoj temi nije prikazan. Nosač u kraku ovdje se odmah vraća; čekanje na Robotina pokazuje tema „Predaja Robotinu”.'
  },
  predajaRobotinu: {
    engl: 'Carrier handover to the mobile robot',
    get uvod() {
      return [
        `BRANCH s Robotino Docking-Kitom je mjesto predaje nosača mobilnom robotu ${M_().robotino.oznaka} [IP-BR]. Robotino pristaje na vrh kraka; dvije strane se dogovaraju optičkim handshakeom: izlaz BRANCH-a %Q3.5 (GF35) daje signal prema Robotinu, a ulaz %I3.5 (KG35) javlja da je Robotino detektiran [IP-BR], [MAN-BR].`,
        'Na Robotinu su dvije uzdužne trake i polukružni preusmjerivač: nosač uđe na jednu traku, preusmjerivač ga prebaci na drugu i izdaje ga u ispravnom položaju [CPMR-C]. Pri predaji obje strane istodobno voze trake u istom smjeru. Vožnje Robotinu dodjeljuje Fleet Manager prema nalozima iz MES4.'
      ];
    },
    kako: 'Odaberi smjer i pokreni slijed ili ga prolazi korak po korak. Gore je pogled odozgo, dolje dijagram signala između BRANCH-a i Robotina. Uključi kvar „Robotino nije poravnat”: KG35 ne javlja Robotina, BRANCH ne daje signal i predaja ne počinje.',
    get napomena() {
      return `Točan protokol handshakea i vremena nisu objavljeni — slijed je načelan. Visina predaje nije usklađena: ravnina traka linije ${hr(MJ().traka.visina * 1000, 0)} mm i prihvat Robotina ~1020 mm su obje pretpostavke. Razmak traka kraka (${hr(MJ().branch.krak.razmak * 1000, 0)} mm) i Robotina (~100 mm) se razlikuju, pa nosač u prikazu prelazi na sredinu prihvata. OpNo transporta Robotinom nedostaje.`;
    }
  },
  mesNalozi: {
    engl: 'MES4 orders, work plans and PLC services',
    get uvod() {
      const m = ME();
      return [
        `${m.sustav.split(':')[0]} vodi proizvodnju: korisnik u pregledniku napravi nalog (ONo), nalog ima pozicije (OPos), a svaka pozicija plan rada (WPNo) s koracima (StepNo). Korak je operacija (OpNo) koju izvodi resurs (ResourceID) — npr. ${opisOp(212)} na ASRS-u [${m.izvor}].`,
        `PLC svake stanice razgovara s MES-om preko TCP/IP-a. ${m.statusPeriod === 1 ? 'Svake sekunde' : 'Svakih ' + m.statusPeriod + ' s'} šalje status na port ${m.portovi.status} (ResourceId, način rada, Busy, Error); ako ${m.statusTimeout} s nema poruke, MES zatvara vezu. Servisi idu na port ${m.portovi.servis}: ${m.servisi.map(s => s.naziv + ' (' + s.kod + ')').join(', ')} [MES-IF].`
      ];
    },
    kako: 'Pritisni „Novi nalog”: MES napravi nalog prema planu rada. Zatim „Nosač na zaustavljaču” za resurs na redu: PLC pita MES, MES odgovara operacijom, slijede OpStart i OpEnd, a OpEnd upisuje sljedeći korak na RFID nosača. Isključi status stanice — nakon 5 s MES prekida vezu i stanica ne dobiva operacije.',
    get napomena() {
      return `Resource ID-ovi (${Object.entries(ME().resursi).map(([k, v]) => k.toUpperCase() + ' ' + v).join(', ')}) su pretpostavka — postavljaju se na HMI-ju stanice. OpNo RASS-a nedostaje (Festo ga ne objavljuje; pročitati u MES4). Format telegrama je pojednostavljen: prikazana su samo polja koja se mijenjaju. Upotreba GetFirstOpForRsc za prazan nosač je naše tumačenje naziva servisa.`;
    }
  },
  plcHmi: {
    engl: 'PLC, HMI, PROFINET and Ethernet',
    get uvod() {
      const u = U_();
      return [
        `Svaka stanica ima vlastiti sigurnosni PLC ${u.plc.tip} (${u.plc.opis}), zaslon ${u.hmi.tip} i neupravljivi preklopnik ${u.preklopnik.tip} [${u.plc.izvor}]. Na preklopnik su spojeni PLC, HMI, RFID čvor Turck TBEN-S2 i — ovisno o stanici — servo regulatori (ASRS) ili upravljač robota (RASS).`,
        `Razlikuju se dvije vrste prometa: ciklička razmjena I/O podataka (PROFINET IO, npr. s regulatorima osi ASRS-a ili s CP-COBOT-om [FAC-140]) i povremene TCP/IP poruke prema MES računalu (status svake sekunde, servisni pozivi). ${u.opcUa}.`
      ];
    },
    kako: 'Klikni uređaj (ili gumb) za opis. Trake ispod stanica pokazuju broj ulaza i izlaza PLC-a, a donji crtež ciklus PLC-a. Uključi prekid spojnog kabela između BRANCH-a i ASRS-a: ASRS ostaje bez veze prema MES-u, nakon 5 s MES zatvara vezu, a stanica i dalje radi lokalno (njezin PLC nije ovisan o mreži).',
    napomena: 'Topologija (preklopnici povezani u lanac kroz spojne kabele, MES računalo na kraju lanca) je pretpostavka iz opisa spojne cijevi; Festo ne objavljuje shemu mreže linije. Brzine paketa u animaciji su ilustracija (PROFINET ciklus je reda milisekundi, status MES-u jednom u sekundi).'
  },
  sigurnosniKrug: {
    engl: 'Emergency stop chain, safety doors, reset',
    get uvod() {
      const s = U_().sigurnosniLanac, v = U_().vrataRass;
      return [
        `${s.opis.replace(/\.$/, '')} [${s.izvor}].`,
        `Ćelija RASS-a ima servisna vrata s dvokanalnim sigurnosnim prekidačima (${v.pl}, ${v.kategorija}): automatski rad moguć je samo sa zatvorenim vratima, a bez kutije PCB u ćeliji robot je u sigurnosnom stopu 1 [${v.izvor}]. Sigurnosni releji (RASS: ${U_().releji.rass}; ASRS: ${U_().releji.asrs.split(';')[0]}) uspoređuju oba kanala: ako se kanali ne slažu, to je kvar i relej ne dopušta ponovno uključenje.`
      ];
    },
    kako: 'Pritisni gljivu na bilo kojoj stanici: lanac se prekine i aktuatori svih stanica ostanu bez energije. Otpusti gljivu — linija i dalje stoji dok ne pritisneš Reset. Otvori vrata ćelije RASS-a ili uključi kvar „kratki spoj u kanalu 2” da vidiš nadzor dvaju kanala.',
    get napomena() { return `Redoslijed konektora (${U_().sigurnosniLanac.redoslijed.map(r => r.modul.toUpperCase() + ' ' + r.konektor).join(' – ')}) je pretpostavka. Shema je načelna: stvarne veze releja, povratne veze i Flexi Soft logiku prikazuju sheme stanica. Vrata ćelije ovdje zaustavljaju samo robot RASS-a (pojednostavljenje). CP-COBOT-M ima vlastiti krug i nije u lancu linije.`; }
  },
  nacinRada: {
    engl: 'Operating modes: Reset, Setup, Automatic (Default / MES)',
    get uvod() {
      const n = U_().nacini;
      return [
        `Načini rada stanice [MAN-ASRS]: ${n.map(x => x.naziv + ' — ' + x.opis).join('; ')}.`,
        `${U_().ciklusKraj.replace(/\s*\[.*\]$/, '')}. U načinu Default odluku donosi PLC iz podataka na RFID-u nosača (state code i parametri), pa linija radi i bez MES računala; u načinu MES svaka operacija se traži od MES4.`
      ];
    },
    kako: 'Uključi stanicu, pritisni Reset i odaberi način. U Setupu ručno pokreći aktuatore (kao na HMI-ju ASRS-a). U Automaticu odaberi Default ili MES i pusti nosač na zaustavljač: u Defaultu odluku daje parametar 1 s RFID-a, u MES-u odgovor MES4. „Cycle end” dovrši ciklus i zaustavi stanicu.',
    get napomena() { return `Tablica parametara Default načina je s ASRS-a [MAN-ASRS]; ostale stanice imaju svoje. Prijelazi između načina su pojednostavljeni (npr. potvrda greške nije prikazana). Trajanja su ilustracija.`; }
  },
  pneumatika: {
    engl: 'Compressed air, service unit, valve terminal, cylinders',
    get uvod() {
      return [
        `Svaka stanica treba zrak od ${hr(M_().asrs.tlak * 10, 0)} bar (${hr(M_().asrs.tlak, 1)} MPa na pločici) i protok najmanje 40 l/min [MAN-ASRS]; u laboratoriju zrak daju dva prijenosna kompresora. Zrak ulazi kroz spojnu cijev, prolazi pripremnu jedinicu (filtar, regulator, manometar) i dolazi do elektromagnetskih ventila.`,
        'Pneumatski su: zaustavljači svih stanica, skretnica BRANCH-a (zakretni cilindar), osi Y (DGC-18-140) i C (DRQD-B-20-180) te prihvatnica HGPT-20 ASRS-a, a u RASS-u indekser trake za kutije, stezna naprava i vakuum prihvatnice za PCB (Venturi) [MAN-ASRS], [IP-RASS]. Sila klipa je F = p · A, a potrošnja zraka raste s volumenom cilindra i tlakom.'
      ];
    },
    kako: 'Odaberi stanicu i klikni ventil (ili gumb) da prebaciš aktuator; zrak teče prema strani cilindra koja je pod tlakom. Klizačem mijenjaj tlak: sila i potrošnja zraka cilindra osi Y računaju se uživo. Isključi kompresor: aktuatori se više ne gibaju, a PLC to otkriva jer senzori krajnjih položaja ne stignu u zadanom vremenu.',
    napomena: 'Shema je načelna: tipovi ventila i ventilskog otoka, izvedba zaustavljača (jednoradni/dvoradni) i spojevi nisu objavljeni. Sila i potrošnja računaju se samo za cilindar osi Y iz oznake DGC-18-140 (klip Ø18 mm, hod 140 mm) [izračun], bez trenja i bez volumena cijevi. Prag tlaka za gibanje je ilustracija.'
  },
  kobotModul: {
    engl: 'Collaborative robot module CP-COBOT-M',
    get uvod() {
      const c = M_().cobot;
      return [
        `${c.oznaka} (${c.narudzbeni}): ${c.funkcija.split('.')[0].charAt(0).toLowerCase() + c.funkcija.split('.')[0].slice(1)} [IP-COBM], [FAC-140]. Robot UR3e nosi do 3 kg s dosegom 500 mm, a vakuumska prihvatnica VADMI-45 sa senzorom BP22 javlja da je dio usisan [SCH-COB].`,
        `Dvije transportne kutije (PNo ${D.materijal.kutijaPoklopaca.mesPNo}, ${D.materijal.kutijaPoklopaca.sadrzaj}) stoje na mjestima BOX 1 i BOX 2; RFID glave ispod njih (TF80/TF81) javljaju koja je kutija umetnuta [SCH-COB]. Kobot radi bez zaštitne ograde: sigurnosne funkcije robota ograničavaju silu i brzinu, pa operater smije ući u radni prostor. Inačica M nema docking — kutije dobavlja operater, a Robotino ih ne može predati [FAC-140].`
      ];
    },
    kako: 'Odaberi smjer premještanja i pokreni: robot prenosi poklopce jedan po jedan iz jedne kutije u drugu, a senzor BP22 javlja usisani dio. Pritisni „Dodir” — robot otkrije neočekivanu silu i stane (zaštitni stop), a nastavlja tek potvrdom na privjesku. Izvadi kutiju: RFID je više ne vidi i robot čeka. Klizačem mijenjaj brzinu programa.',
    napomena: 'Raspored kutija i robota na stolu je procjena iz fotografije, a gnijezda u kutiji (2 × 4) ilustracija za 8 poklopaca. Reakcija na dodir je načelna: granice sile, brzine i sigurnosne zone podešavaju se u sigurnosnoj konfiguraciji robota i nisu objavljene za ovaj modul. U pogledu odozgo ruka je pojednostavljena na dva dijela; doseg 500 mm mjeri se u prostoru, a ne u tlocrtu.'
  }
};
export const TEME = {};
for (const k in NAZIVI) {
  const t = teksti[k] || { engl: '', uvod: ['—'], kako: '—', napomena: '' };
  TEME[k] = Object.defineProperties({ naslov: NAZIVI[k] }, Object.getOwnPropertyDescriptors(t));
}
/* =========================================================== osnovni alati */
const NS = 'http://www.w3.org/2000/svg';
const B = { crv: '#d64535', zel: '#1f9d55', nar: '#e08a1e', pl: '#3d8bd9', zut: '#f2c230', lj: '#8e5cc4' };
let brojac = 0;

function S(tag, a, rod) {
  const e = document.createElementNS(NS, tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v;
    else e.setAttribute(k, v);
  }
  if (rod) rod.appendChild(e);
  return e;
}
function H(tag, a, ...djeca) {
  const e = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (v == null || v === false) continue;
    if (k === 'tekst') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const d of djeca) if (d != null) e.append(d);
  return e;
}
function T(g, x, y, txt, kl, anchor) {
  return S('text', { x, y, class: kl || 'tcf-l', 'text-anchor': anchor || null, tekst: txt }, g);
}
const ogr = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = v => v.toFixed(1);
const RAD = Math.PI / 180;
const frac = x => x - Math.floor(x);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const pts = arr => arr.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
const put = (arr, zat) => arr.length ? 'M' + arr.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + (zat ? 'Z' : '') : '';
const kutN = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function postavi(el, a) { for (const k in a) el.setAttribute(k, typeof a[k] === 'number' ? f1(a[k]) : a[k]); }

// strelica (linija + glava): g.set(x1,y1,x2,y2)
function strel(g, x1, y1, x2, y2, o = {}) {
  const boja = o.boja || 'var(--ink)', w = o.w || 2.5, gl = o.gl || 11;
  const gr = S('g', { class: o.kl || null }, g);
  const ln = S('line', { 'stroke-width': w, 'stroke-linecap': 'round' }, gr);
  const pg = S('polygon', {}, gr);
  gr.boja = b => { ln.style.stroke = b; pg.style.fill = b; };
  gr.boja(boja);
  gr.set = (a, b, c, d) => {
    const dx = c - a, dy = d - b, L = Math.hypot(dx, dy);
    if (L < 1.5) { gr.style.display = 'none'; return; }
    gr.style.display = '';
    const ux = dx / L, uy = dy / L, g2 = Math.min(gl, L * 0.7);
    const bx = c - ux * g2, by = d - uy * g2;
    ln.setAttribute('x1', f1(a)); ln.setAttribute('y1', f1(b));
    ln.setAttribute('x2', f1(bx)); ln.setAttribute('y2', f1(by));
    pg.setAttribute('points', `${f1(c)},${f1(d)} ${f1(bx - uy * g2 * 0.55)},${f1(by + ux * g2 * 0.55)} ${f1(bx + uy * g2 * 0.55)},${f1(by - ux * g2 * 0.55)}`);
  };
  gr.set(x1, y1, x2, y2);
  return gr;
}
function luk(cx, cy, r, a0, a1) {
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  const vel = Math.abs(a1 - a0) > Math.PI ? 1 : 0, sm = a1 > a0 ? 1 : 0;
  return `M${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 ${vel} ${sm} ${f1(x1)},${f1(y1)}`;
}
// graf: okvir, mreža i pretvorba vrijednost → koordinata
function graf(g, x, y, w, h, o) {
  S('rect', { x, y, width: w, height: h, class: 'tcf-graf' }, g);
  const X = v => x + (v - o.x0) / (o.x1 - o.x0) * w;
  const Y = v => y + h - (v - o.y0) / (o.y1 - o.y0) * h;
  for (const v of o.yt || []) {
    const yy = Y(v);
    S('line', { x1: x, y1: f1(yy), x2: x + w, y2: f1(yy), class: v === 0 && o.y0 < 0 ? 'tcf-mreza0' : 'tcf-mreza' }, g);
    if (o.ylab !== false) T(g, x - 6, yy + 5, (o.yf || String)(v), 'tcf-ls', 'end');
  }
  for (const v of o.xt || []) {
    const xx = X(v);
    S('line', { x1: f1(xx), y1: y, x2: f1(xx), y2: y + h, class: 'tcf-mreza' }, g);
    if (o.xlab !== false) T(g, xx, y + h + 18, (o.xf || String)(v), 'tcf-ls', 'middle');
  }
  if (o.naslov) T(g, x, y - 9, o.naslov, 'tcf-ls');
  return { X, Y, x, y, w, h };
}
// SVG element koji se ponaša kao gumb (klik, Enter, razmaknica)
function klikabilno(ctx, el, oznaka, fn) {
  el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', oznaka);
  el.classList.add('tcf-klik');
  ctx.on(el, 'click', fn);
  ctx.on(el, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
}
function sporo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
// presjek zrake (px,py, smjer ux,uy) s preprekama [{tip:'seg',a,b}|{tip:'krug',c,r}] → udaljenost ili Infinity
function zraka(px, py, ux, uy, prepreke) {
  let best = Infinity;
  for (const o of prepreke) {
    if (o.tip === 'seg') {
      const ex = o.b[0] - o.a[0], ey = o.b[1] - o.a[1];
      const den = ux * ey - uy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const wx = o.a[0] - px, wy = o.a[1] - py;
      const t = (wx * ey - wy * ex) / den, s = (wx * uy - wy * ux) / den;
      if (t > 1e-9 && s >= 0 && s <= 1 && t < best) best = t;
    } else {
      const wx = px - o.c[0], wy = py - o.c[1];
      const b = wx * ux + wy * uy, c = wx * wx + wy * wy - o.r * o.r, d = b * b - c;
      if (d < 0) continue;
      const t = -b - Math.sqrt(d);
      if (t > 1e-9 && t < best) best = t;
    }
  }
  return best;
}

/* ------------------------------------------------------- petlja i čišćenje */
class Kontekst {
  constructor(root) {
    this.root = root; this.ciscenje = []; this.fje = []; this.rm = sporo();
    this.vidljiv = true; this.id = 0; this.tip = ''; this.zadnje = 0; this.zeli = false; this.unisten = false;
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver(z => {
        for (const u of z) this.vidljiv = u.isIntersecting;
        if (this.vidljiv) this._zakazi(); else this._stani();
      });
      this.io.observe(root);
    }
    this.on(document, 'visibilitychange', () => { if (document.hidden) this._stani(); else this._zakazi(); });
  }
  on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); this.ciscenje.push(() => el.removeEventListener(ev, fn, opt)); }
  petlja(fn) { this.fje.push(fn); }
  budi() { this.zeli = true; this._zakazi(); }
  _zakazi() {
    if (this.unisten || this.id || !this.zeli || !this.vidljiv || document.hidden) return;
    if (this.rm) { this.tip = 't'; this.id = setTimeout(() => this._okvir(performance.now()), 250); }
    else { this.tip = 'r'; this.id = requestAnimationFrame(t => this._okvir(t)); }
  }
  _stani() {
    if (!this.id) return;
    if (this.tip === 't') clearTimeout(this.id); else cancelAnimationFrame(this.id);
    this.id = 0; this.zadnje = 0;
  }
  _okvir(t) {
    this.id = 0;
    if (this.unisten) return;
    // u načinu „manje gibanja” animacija ide u koracima od 0,25 s
    const dt = this.zadnje ? Math.min((t - this.zadnje) / 1000, this.rm ? 0.4 : 0.1) : (this.rm ? 0.25 : 1 / 60);
    this.zadnje = t;
    let dalje = false;
    for (const f of this.fje) { try { if (f(dt)) dalje = true; } catch (e) { console.error(e); } }
    this.zeli = dalje;
    if (dalje) this._zakazi(); else this.zadnje = 0;
  }
  odgodi(fn, ms) { const id = setTimeout(() => { if (!this.unisten) fn(); }, ms); this.ciscenje.push(() => clearTimeout(id)); return id; }
  unisti() {
    this.unisten = true; this._stani();
    if (this.io) this.io.disconnect();
    for (const c of this.ciscenje) { try { c(); } catch (e) { /* ništa */ } }
    this.ciscenje = []; this.fje = [];
  }
}

/* ------------------------------------------------------- okvir jedne teme */
function okvir(el, id, ctx) {
  const T0 = TEME[id];
  const uid = 'tcf' + (++brojac);
  let nk = 0;
  const sek = H('section', { class: 'tcf', 'data-tema': id, 'aria-label': T0.naslov });
  const naslov = H('h3', { class: 'tcf-naslov' }, T0.naslov + ' ', H('span', { class: 'tcf-engl', tekst: '(' + T0.engl + ')' }));
  const uvod = H('div', { class: 'tcf-uvod' });
  for (const p of T0.uvod) uvod.append(H('p', { tekst: p }));
  const scena = H('div', { class: 'tcf-scena' });
  const upr = H('div', { class: 'tcf-upr', role: 'group', 'aria-label': 'Upravljanje animacijom' });
  const ocitP = H('div', { class: 'tcf-ocit' });
  const stanjeP = H('p', { class: 'tcf-stanje', 'aria-live': 'polite' });
  const kako = H('div', { class: 'tcf-kako' }, H('h4', { tekst: 'Kako radi' }), H('p', { tekst: T0.kako }));
  if (T0.napomena) kako.append(H('p', { class: 'tcf-pretp' }, H('b', { tekst: 'Pojednostavljenja: ' }), T0.napomena));
  const desno = H('div', { class: 'tcf-desno' }, upr, stanjeP, ocitP, kako);
  sek.append(naslov, uvod, H('div', { class: 'tcf-tijelo' }, scena, desno));
  el.replaceChildren(sek);

  const ui = {
    uid, sek, scena, upr, ocitP, desno,
    svg(w, h, opis, kl) {
      const s = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opis, class: 'tcf-svg' + (kl ? ' ' + kl : ''), focusable: 'false' });
      const defs = S('defs', {}, s);
      const p = S('pattern', { id: uid + '-sr' + (++nk), width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      S('rect', { width: 7, height: 7, class: 'tcf-srafura-p' }, p);
      S('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'tcf-srafura-c' }, p);
      s.defs = defs; s.srafura = `url(#${p.id})`;
      s.clip = (x, y, w2, h2) => { const c = S('clipPath', { id: uid + '-cl' + (++nk) }, defs); S('rect', { x, y, width: w2, height: h2 }, c); return `url(#${c.id})`; };
      scena.append(s);
      return s;
    },
    red(kl, u) { const r = H('div', { class: 'tcf-red' + (kl ? ' ' + kl : '') }); (u || upr).append(r); return r; },
    skupina(u) { const g = H('div', { class: 'tcf-skupina' }); (u || upr).append(g); return g; },
    gumb(tekst, fn, o = {}) {
      const b = H('button', {
        type: 'button', class: 'gumb' + (o.tanki ? ' tanki' : '') + ' tcf-g' + (o.kl ? ' ' + o.kl : ''),
        'aria-label': o.aria || null, 'aria-pressed': o.pritisak == null ? null : String(!!o.pritisak)
      });
      b.textContent = tekst;
      if (fn) ctx.on(b, 'click', e => fn(e, b));
      let cilj = o.u;
      if (!cilj) { cilj = upr.lastElementChild; if (!cilj || !cilj.classList.contains('tcf-red')) cilj = ui.red(); }
      cilj.append(b);
      return b;
    },
    // gumb play/pause s istim izgledom kao u svim temama
    igraj(st, kljuc, tekst, fn, u) {
      const b = ui.gumb(tekst, () => { st[kljuc] = !st[kljuc]; osv(); if (fn) fn(st[kljuc]); ctx.budi(); }, { pritisak: false, u });
      const osv = () => { b.textContent = st[kljuc] ? 'Pauza' : tekst; b.setAttribute('aria-pressed', String(!!st[kljuc])); };
      b.osvjezi = osv;
      return b;
    },
    seg(oznaka, opcije, vr, fn, u) {
      const w = H('div', { class: 'tcf-seg' });
      const lab = H('span', { class: 'tcf-seg-o', tekst: oznaka, id: uid + '-s' + (++nk) });
      const box = H('div', { class: 'tcf-seg-b', role: 'group', 'aria-labelledby': lab.id });
      const btn = opcije.map(([v, t]) => {
        const b = H('button', { type: 'button', 'aria-pressed': 'false' });
        b.textContent = t;
        ctx.on(b, 'click', () => { if (w.dataset.v === String(v)) return; w.postavi(v); fn(v); });
        box.append(b);
        return [v, b];
      });
      w.postavi = v => { w.dataset.v = String(v); for (const [vv, b] of btn) b.setAttribute('aria-pressed', String(vv === v)); };
      w.gumbi = btn;
      w.postavi(vr);
      w.append(lab, box);
      (u || upr).append(w);
      return w;
    },
    klizac(oznaka, min, max, korak, vr, fmt, fn, u) {
      const kid = uid + '-k' + (++nk);
      const w = H('div', { class: 'tcf-kl' });
      const l = H('label', { for: kid, tekst: oznaka });
      const o = H('output', { for: kid });
      const i = H('input', { type: 'range', id: kid, min, max, step: korak, value: vr });
      const upd = () => { o.textContent = fmt(+i.value); };
      ctx.on(i, 'input', () => { upd(); fn(+i.value); });
      upd();
      w.append(H('div', { class: 'tcf-kl-g' }, l, o), i);
      (u || upr).append(w);
      w.ulaz = i; w.osvjezi = upd;
      w.postavi = v => { i.value = v; upd(); };
      return w;
    },
    kvacica(oznaka, vr, fn, u) {
      const kid = uid + '-c' + (++nk);
      const i = H('input', { type: 'checkbox', id: kid });
      i.checked = !!vr;
      const w = H('label', { class: 'tcf-kv', for: kid }, i, H('span', { tekst: oznaka }));
      ctx.on(i, 'change', () => fn(i.checked));
      (u || upr).append(w);
      w.ulaz = i;
      w.postavi = v => { i.checked = !!v; };
      return w;
    },
    ocit(redovi, u) {
      const dl = H('dl', { class: 'tcf-oc' });
      const set = {};
      for (const [k, t] of redovi) {
        const dd = H('dd', { tekst: '—' });
        const dt = H('dt', { tekst: t });
        dl.append(H('div', {}, dt, dd));
        set[k] = (v, kl) => { if (dd.textContent !== v) dd.textContent = v; const c = kl ? 'tcf-' + kl : ''; if (dd.className !== c) dd.className = c; };
        set[k].naziv = t2 => { if (dt.textContent !== t2) dt.textContent = t2; };
      }
      (u || ocitP).append(dl);
      return set;
    },
    // okvir s formulama (redovi se osvježavaju uživo)
    formula(naslov, n, u) {
      const box = H('div', { class: 'tcf-formula' });
      if (naslov) box.append(H('h4', { tekst: naslov }));
      const red = [];
      for (let k = 0; k < n; k++) { const p = H('p', {}); box.append(p); red.push(p); }
      (u || ocitP).append(box);
      box.set = (k, txt) => { if (red[k] && red[k].textContent !== txt) red[k].textContent = txt; if (red[k]) red[k].style.display = txt ? '' : 'none'; };
      return box;
    },
    sitno(txt, u) { const p = H('p', { class: 'tcf-sitno', tekst: txt }); (u || ocitP).append(p); return p; },
    stanje(txt, vrsta) {
      if (stanjeP.textContent !== txt) stanjeP.textContent = txt;
      const c = 'tcf-stanje' + (vrsta ? ' tcf-' + vrsta : '');
      if (stanjeP.className !== c) stanjeP.className = c;
    }
  };
  return ui;
}

/* ------------------------------------------------------- zajednički crteži */
// Robotino odozgo: g, središte, mjerilo px/m, kut φ (rad, 0 = os x robota prema gore na zaslonu)

/* ------------------------------------------------------- zajednički crteži linije */
// tlocrt: KS linije (m, y prema stražnjoj strani) → zaslon (y dolje); prednja strana linije je dolje
function tlocrt(x0, y1, s, ox, oy) {
  return { X: x => ox + (x - x0) * s, Y: y => oy + (y1 - y) * s, s };
}
// put iz cpf_model.js (segmenti l/a) → SVG path
function putD(p, P) {
  let d = '';
  for (const g of p.segmenti) {
    if (g.tip === 'l') {
      if (!d) d += `M${f1(P.X(g.a[0]))},${f1(P.Y(g.a[1]))}`;
      d += `L${f1(P.X(g.b[0]))},${f1(P.Y(g.b[1]))}`;
    } else {
      const x0 = g.c[0] + g.r * Math.cos(g.k0), y0 = g.c[1] + g.r * Math.sin(g.k0);
      const x1 = g.c[0] + g.r * Math.cos(g.k1), y1 = g.c[1] + g.r * Math.sin(g.k1);
      if (!d) d += `M${f1(P.X(x0))},${f1(P.Y(y0))}`;
      const vel = Math.abs(g.k1 - g.k0) > Math.PI + 1e-6 ? 1 : 0, sm = g.k1 > g.k0 ? 1 : 0;
      d += `A${f1(g.r * P.s)},${f1(g.r * P.s)} 0 ${vel} ${sm} ${f1(P.X(x1))},${f1(P.Y(y1))}`;
    }
  }
  return d;
}
// traka (remen) duž puta: tamna podloga s nepomičnim rebrima; gibanje pokazuju strelice koje putuju duž trake
// (pomicanje crtkanog uzorka bilo bi jako sporo za iscrtavanje). pomak(px) = prijeđeni put remena u px.
function trakaPut(rod, d, sir, kl) {
  const g = S('g', { class: 'tcf-traka-g' + (kl ? ' ' + kl : '') }, rod);
  const pp = S('path', { d, class: 'tcf-traka', 'stroke-width': f1(sir) }, g);
  S('path', { d, class: 'tcf-traka-r', 'stroke-width': f1(sir * 0.7) }, g);
  let L = 0, strel = [], zadnji = null;
  const RAZ = Math.max(46, sir * 3.2);
  g.pomak = px => {
    if (!L) {
      try { L = pp.getTotalLength(); } catch (e) { L = 0; }
      if (!L) return;
      const n = Math.max(1, Math.floor(L / RAZ));
      const a = sir * 0.32;
      strel = Array.from({ length: n }, () => S('path', { d: `M${f1(-a)},${f1(-a)} L${f1(a * 0.6)},0 L${f1(-a)},${f1(a)}`, class: 'tcf-traka-s' }, g));
    }
    const q = Math.round(px * 2) / 2;
    if (q === zadnji) return;
    zadnji = q;
    const kor = L / strel.length;
    strel.forEach((s, i) => {
      const u = ((q + i * kor) % L + L) % L;
      const a = pp.getPointAtLength(u), b = pp.getPointAtLength(Math.min(L, u + 1));
      const k = Math.atan2(b.y - a.y, b.x - a.x) / RAD;
      s.setAttribute('transform', `translate(${f1(a.x)} ${f1(a.y)}) rotate(${f1(u + 1 >= L ? 0 : k)})`);
    });
  };
  return g;
}
// nosač odozgo (lokalno: x u smjeru vožnje); o: { s px/m }
function nosacOdozgo(rod, s, o = {}) {
  const N = D.mjere.nosac, P = D.mjere.paleta, I = D.mjere.izradak;
  const vanjski = S('g', { class: 'tcf-nos' }, rod);
  const g = S('g', {}, vanjski);
  S('rect', { x: f1(-N.duljina / 2 * s), y: f1(-N.sirina / 2 * s), width: f1(N.duljina * s), height: f1(N.sirina * s), rx: 2, class: 'tcf-nosac' }, g);
  const pal = S('rect', { x: f1(-P.duljina / 2 * s + 1.5), y: f1(-P.sirina / 2 * s + 1.5), width: f1(P.duljina * s - 3), height: f1(P.sirina * s - 3), rx: 1.5, class: 'tcf-paleta' }, g);
  const iz = S('rect', { x: f1(-I.duljina / 2 * s), y: f1(-I.sirina / 2 * s), width: f1(I.duljina * s), height: f1(I.sirina * s), rx: 2.5, class: 'tcf-izradak' }, g);
  const pcb = S('rect', { x: f1(-I.duljina / 2 * s * 0.75), y: f1(-I.sirina / 2 * s * 0.65), width: f1(I.duljina * s * 0.75), height: f1(I.sirina * s * 0.65), rx: 1, class: 'tcf-pcb' }, g);
  const oz = S('text', { x: 0, y: f1(-N.sirina / 2 * s - 4), class: 'tcf-ls tcf-nos-br', 'text-anchor': 'middle' }, vanjski);
  vanjski.stanje = (st, br) => {
    pal.style.display = st === 'prazan' ? 'none' : '';
    iz.style.display = st === 'paleta' || st === 'pcb' ? '' : 'none';
    pcb.style.display = st === 'pcb' ? '' : 'none';
    if (br != null) oz.textContent = br;
  };
  vanjski.postavi = (x, y, kut) => { vanjski.setAttribute('transform', `translate(${f1(x)} ${f1(y)})`); g.setAttribute('transform', `rotate(${f1(-kut / RAD)})`); };
  vanjski.stanje('prazan');
  return vanjski;
}
// lampica s natpisom (za I/O)
function lampa(rod, x, y, txt, r = 7) {
  const c = S('circle', { cx: x, cy: y, r, class: 'tcf-lampa' }, rod);
  if (txt) T(rod, x + r + 6, y + 5, txt, 'tcf-ls');
  c.upali = (on, kl = 'tcf-lampa-on') => { c.classList.toggle(kl, !!on); };
  return c;
}
// popis klikabilnih dijelova (legenda) + opis
function legenda(ui, ctx, stavke, fn) {
  const ul = H('ul', { class: 'tcf-legenda' });
  const gumbi = stavke.map((st, i) => {
    const b = H('button', { type: 'button', 'aria-pressed': 'false' }, H('b', { tekst: String(i + 1) }), st.naziv);
    ctx.on(b, 'click', () => fn(i));
    ul.append(H('li', {}, b));
    return b;
  });
  ui.upr.append(ul);
  return i => gumbi.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
}
const glatko = u => u * u * (3 - 2 * u);
const IZV = s => (s ? ' [' + s + ']' : '');

/* =========================================================== 1. tok materijala */
function tTokMaterijala(ui, ctx) {
  const PU = putevi(), R = D.konfig.raspored, MJ = D.mjere;
  const P = tlocrt(-0.05, 1.68, 156, 12, 10);
  const svg = ui.svg(620, 400, 'Tlocrt linije RASS – BRANCH – ASRS: petlja traka, bypass RASS-a, krak BRANCH-a, nosači i Robotino');
  S('rect', { x: 2, y: 2, width: 616, height: 396, rx: 10, class: 'tcf-graf' }, svg);
  const W = MJ.modul.sirina, Dd = MJ.modul.dubina;
  const modul = (x, y0, y1, txt, kl) => {
    S('rect', { x: f1(P.X(x - W / 2)), y: f1(P.Y(y1)), width: f1(W * P.s), height: f1((y1 - y0) * P.s), rx: 4, class: kl || 'tcf-modul' }, svg);
    T(svg, P.X(x), P.Y(y1) + 18, txt, 'tcf-ls', 'middle');
  };
  modul(R.rass.x, R.rass.y + Dd / 2, R.rass.y + Dd / 2 + (MJ.rass.dubina - Dd), '', 'tcf-modul tcf-modul-c');
  T(svg, P.X(R.rass.x - W / 2) + 8, P.Y(R.rass.y + Dd / 2 + (MJ.rass.dubina - Dd)) + 18, 'robotska ćelija', 'tcf-ls');
  modul(R.rass.x, R.rass.y - Dd / 2, R.rass.y + Dd / 2, '');
  modul(R.branch.x, R.branch.y - Dd / 2, R.branch.y + Dd / 2, '');
  modul(R.asrs.x, R.asrs.y - Dd / 2, R.asrs.y + Dd / 2, '');
  T(svg, P.X(R.rass.x), P.Y(-0.02) + 14, 'RASS', 'tcf-lb', 'middle');
  T(svg, P.X(R.branch.x) + 70, P.Y(-0.02) + 14, 'BRANCH', 'tcf-lb', 'middle');
  T(svg, P.X(R.asrs.x), P.Y(-0.02) + 14, 'ASRS32', 'tcf-lb', 'middle');
  T(svg, 14, 392, 'prednja strana linije (HMI RASS-a i ASRS-a)', 'tcf-ls');
  // oprema u ćeliji (samo orijentir)
  S('circle', { cx: f1(P.X(MJ.rass.robot.x)), cy: f1(P.Y(MJ.rass.robot.y)), r: 13, class: 'tcf-robot-baza' }, svg);
  T(svg, P.X(MJ.rass.robot.x) - 18, P.Y(MJ.rass.robot.y) + 5, 'robot', 'tcf-ls', 'end');
  const tk = MJ.rass.trakaKutije;
  S('rect', { x: f1(P.X(tk.x - 0.15)), y: f1(P.Y(tk.y0 + 0.4)), width: f1(0.3 * P.s), height: f1(0.4 * P.s), rx: 3, class: 'tcf-kutija' }, svg);
  T(svg, P.X(tk.x), P.Y(tk.y0 + 0.2) + 5, 'PCB', 'tcf-ls tcf-na-kutiji', 'middle');
  // trake
  const trake = [trakaPut(svg, putD(PU.petlja, P), MJ.traka.sirina * P.s), trakaPut(svg, putD(PU.bypassRASS, P), MJ.traka.sirina * P.s), trakaPut(svg, putD(PU.krakBRANCH, P), MJ.traka.sirina * P.s)];
  // zaustavljači (položaj na putu)
  const xST = R.asrs.x + MJ.asrs.stoper.x;
  const B = MJ.rass.bypass, x0r = R.rass.x - W / 2;
  const ZA = {
    ST1: { put: 'petlja', s: PU.sNa(xST), nat: 'ST1' },
    ST2: { put: 'petlja', s: PU.sNaB(xST), nat: 'ST2' },
    radni: { put: 'bypassRASS', s: PU.bypassRASS.segmenti[0].L + (x0r + B.radniX - PU.bypassRASS.segmenti[1].a[0]), nat: 'radni položaj' },
    krak: { put: 'krakBRANCH', s: PU.krakBRANCH.L / 2, nat: '' }
  };
  const PUT = { petlja: PU.petlja, bypassRASS: PU.bypassRASS, krakBRANCH: PU.krakBRANCH };
  for (const k in ZA) {
    const z = ZA[k], t = tockaPuta(PUT[z.put], z.s);
    const nx = -Math.sin(t.kut), ny = Math.cos(t.kut);
    if (!z.nat) { z.el = S('g', {}, svg); continue; }
    z.el = S('line', { x1: f1(P.X(t.x + nx * 0.05)), y1: f1(P.Y(t.y + ny * 0.05)), x2: f1(P.X(t.x - nx * 0.05)), y2: f1(P.Y(t.y - ny * 0.05)), class: 'tcf-zaust-t' }, svg);
    if (z.nat) T(svg, P.X(t.x) + (k === 'ST2' ? -4 : 6), P.Y(t.y) + (k === 'ST1' ? 26 : k === 'ST2' ? -14 : -12), z.nat, 'tcf-ls', k === 'ST2' ? 'end' : 'start');
  }
  // smjer vožnje
  const strelica = (x, y, kut) => { const g = S('g', { transform: `translate(${f1(P.X(x))} ${f1(P.Y(y))}) rotate(${f1(-kut / RAD)})` }, svg); S('path', { d: 'M-7,-6 L5,0 L-7,6Z', class: 'tcf-smjer' }, g); };
  strelica(2.7, PU.yF - 0.1, Math.PI); strelica(1.0, PU.yB + 0.12, 0);
  // Robotino
  const rob = S('g', { class: 'tcf-rob' }, svg);
  S('circle', { cx: 0, cy: 0, r: f1(0.235 * P.s), class: 'tcf-sasija' }, rob);
  S('rect', { x: -9, y: -14, width: 18, height: 28, rx: 3, class: 'tcf-prihvat' }, rob);
  const robNos = S('rect', { x: -6, y: -10, width: 12, height: 20, rx: 2, class: 'tcf-nosac' }, rob);
  T(svg, P.X(1.8) + 44, P.Y(-0.45) + 5, 'Robotino', 'tcf-ls');
  const dock = { x: 1.8, y: -0.45 };
  // nosači
  const gN = S('g', {}, svg);
  const st = { radi: false, ubrz: 8, brzo: false, n: 4, robotino: false, nalozi: [], gotovo: 0, t: 0, pomak: 0, brN: 0, brNalog: 1000, log: [], odabran: null, robT: 0, robNosac: null };
  let nosaci = [];
  function napravi() {
    gN.replaceChildren(); nosaci = [];
    for (let i = 0; i < st.n; i++) {
      const el = nosacOdozgo(gN, P.s);
      const n = { id: i + 1, put: 'petlja', s: (PU.petlja.L / st.n) * i + 0.3, stanje: 'prazan', nalog: null, cilj: null, op: null, opT: 0, el };
      klikabilno(ctx, el, 'Nosač ' + n.id, () => { st.odabran = n; prikazNosaca(); });
      el.stanje('prazan', n.id);
      nosaci.push(n);
    }
    st.odabran = null; prikazNosaca();
  }
  const v = () => (st.brzo ? MJ.traka.brzinaBrza : MJ.traka.brzinaSpora);
  rob.style.pointerEvents = 'none';
  const T_ASRS = D.scenarij.koraci[1].trajanje, T_RASS = D.scenarij.koraci[3].trajanje, T_ROB = 30;
  const OP = { ST1: opisOp(212), ST2: opisOp(211) };
  const opRass = 'OpNo ' + opNo(opRes('rass').opNo) + ' montaža';
  function zapis(t) { ui.stanje(t.charAt(0).toUpperCase() + t.slice(1) + '.', 'plavo'); st.log.unshift(`${hr(st.t, 0)} s · ${t}`); st.log.length = Math.min(st.log.length, 6); logEl.replaceChildren(...st.log.map(x => H('li', { tekst: x }))); }
  // razmak do nosača ispred na istom putu (središta)
  const G = MJ.nosac.duljina + 0.04;
  function slobodno(n) {
    const p = PUT[n.put]; let min = Infinity;
    for (const m of nosaci) {
      if (m === n || m.put !== n.put || m.skriven) continue;
      let d = m.s - n.s;
      if (p.zatvoren) d = ((d % p.L) + p.L) % p.L;
      if (d > 0 && d < min) min = d;
    }
    return min - G;
  }
  function zauzetoOko(put, s, r) {
    const p = PUT[put];
    return nosaci.some(m => { if (m.put !== put || m.skriven) return false; let d = Math.abs(m.s - s); if (p.zatvoren) d = Math.min(d, p.L - d); return d < r; });
  }
  function korak(dt) {
    const ds0 = v() * dt;
    for (const n of nosaci) {
      if (n.skriven) continue;
      if (n.op) {
        n.opT -= dt;
        if (n.opT <= 0) zavrsiOp(n); else continue;
      }
      const p = PUT[n.put];
      let ds = Math.min(ds0, Math.max(0, slobodno(n)));
      if (ds <= 0) continue;
      const s0 = n.s, s1 = s0 + ds;
      const preko = x => (p.zatvoren ? (((x - s0) % p.L) + p.L) % p.L : x - s0) <= ds && (p.zatvoren ? (((x - s0) % p.L) + p.L) % p.L : x - s0) > 0;
      // zaustavljači
      let stao = false;
      for (const k in ZA) {
        const z = ZA[k];
        if (z.put !== n.put || !preko(z.s)) continue;
        const posao = k === 'ST1' ? (n.stanje === 'prazan' && st.nalozi.length > 0) : k === 'ST2' ? n.cilj === 'asrs' : k === 'radni' ? n.cilj === 'rass' : k === 'krak' ? n.cilj === 'robotino' : false;
        if (posao) { n.s = z.s; pocniOp(n, k); stao = true; break; }
      }
      if (stao) continue;
      // grananja
      if (n.put === 'petlja') {
        const sp = PU.spojevi;
        const cilj = n.cilj === 'rass' ? 'bypassRASS' : n.cilj === 'robotino' ? 'krakBRANCH' : null;
        if (cilj && preko(sp[cilj].izlaz)) {
          if (zauzetoOko(cilj, 0, G)) { n.s = sp[cilj].izlaz; continue; }
          n.put = cilj; n.s = Math.max(0, s1 - sp[cilj].izlaz); continue;
        }
        n.s = ((s1 % p.L) + p.L) % p.L;
      } else {
        if (s1 >= p.L) {
          const ul = PU.spojevi[n.put].ulaz;
          if (zauzetoOko('petlja', ul, G)) { n.s = p.L; continue; }
          n.put = 'petlja'; n.s = ul + (s1 - p.L);
        } else n.s = s1;
      }
    }
  }
  function pocniOp(n, k) {
    n.op = k;
    if (k === 'ST1') { n.opT = T_ASRS; n.nalog = st.nalozi.shift(); zapis(`nosač ${n.id}: ${OP.ST1} (nalog ${n.nalog.br})`); }
    else if (k === 'ST2') { n.opT = T_ASRS; zapis(`nosač ${n.id}: ${OP.ST2}`); }
    else if (k === 'radni') { n.opT = T_RASS; zapis(`nosač ${n.id}: RASS, ${opRass}`); }
    else if (k === 'krak') { n.opT = T_ROB; n.skriven = true; st.robNosac = n; st.robT = 0; zapis(`nosač ${n.id}: predaja Robotinu (OpNo ${opNo(opRes('robotino').opNo)})`); }
    ZA[k].el.classList.add('tcf-zaust-akt');
    osvjeziOcit();
  }
  function zavrsiOp(n) {
    const k = n.op; n.op = null; ZA[k].el.classList.remove('tcf-zaust-akt');
    if (k === 'ST1') { n.stanje = 'paleta'; n.cilj = n.nalog.robotino ? 'robotino' : 'rass'; }
    else if (k === 'ST2') { n.stanje = 'prazan'; n.cilj = null; st.gotovo++; zapis(`nalog ${n.nalog.br} gotov, paleta spremljena`); n.nalog = null; }
    else if (k === 'radni') { n.stanje = 'pcb'; n.cilj = 'asrs'; }
    else if (k === 'krak') { n.skriven = false; n.cilj = 'rass'; st.robNosac = null; n.s += 0.001; zapis(`nosač ${n.id}: Robotino ga je vratio u krak`); }
    n.el.stanje(n.stanje);
    // nakon operacije zaustavljač pušta nosač: pomakni ga malo naprijed da ne stane ponovno
    if (k !== 'krak') n.s += 0.001;
    osvjeziOcit(); prikazNosaca();
  }
  function crtaj() {
    for (const n of nosaci) {
      if (n.skriven) { n.el.style.display = 'none'; continue; }
      n.el.style.display = '';
      const t = tockaPuta(PUT[n.put], n.s);
      n.el.postavi(P.X(t.x), P.Y(t.y), t.kut);
      n.el.classList.toggle('tcf-odabran', st.odabran === n);
    }
    trake.forEach(tr => tr.pomak(st.pomak));
    // Robotino: vožnja s nosačem i natrag
    let rx = dock.x, ry = dock.y;
    if (st.robNosac) {
      const u = st.robT / T_ROB, a = u < 0.15 ? 0 : u > 0.85 ? 0 : Math.sin((u - 0.15) / 0.7 * Math.PI);
      rx = dock.x + 1.3 * a; ry = dock.y - 0.18 * a;
    }
    rob.setAttribute('transform', `translate(${f1(P.X(rx))} ${f1(P.Y(ry))})`);
    robNos.style.display = st.robNosac ? '' : 'none';
    rob.style.opacity = st.robotino || st.robNosac ? '1' : '0.35';
  }
  function osvjeziOcit() {
    o.nal(String(st.nalozi.length)); o.rad(String(nosaci.filter(n => n.nalog).length)); o.got(String(st.gotovo)); o.t(hr(st.t, 0) + ' s');
    o.v(hr(v(), 2) + ' m/s' + IZV('pretpostavka'));
  }
  function prikazNosaca() {
    const n = st.odabran;
    if (!n) { o2.c('—'); o2.s('—'); o2.r('—'); return; }
    o2.c(String(n.id)); o2.s(n.nalog ? 'ONo ' + n.nalog.br : 'bez naloga');
    o2.r(n.cilj === 'rass' ? 'RASS (Res ' + D.mes.resursi.rass + ')' : n.cilj === 'asrs' ? 'ASRS (Res ' + D.mes.resursi.asrs + ')' : n.cilj === 'robotino' ? 'Robotino (Res ' + D.mes.resursi.robotino + ')' : '—');
  }
  ctx.petlja(dt => {
    if (st.radi) {
      const d = dt * st.ubrz;
      st.t += d; st.pomak += v() * d * P.s;
      const kor = Math.ceil(d / 0.05);
      for (let i = 0; i < kor; i++) korak(d / kor);
      if (st.robNosac) st.robT += d;
      osvjeziOcit();
    }
    crtaj();
    return st.radi;
  });
  const r1 = ui.red();
  ui.igraj(st, 'radi', 'Pokreni liniju', null, r1);
  ui.gumb('Novi nalog', () => { st.nalozi.push({ br: ++st.brNalog, robotino: st.robotino }); zapis(`MES4: novi nalog ${st.brNalog}${st.robotino ? ' (s Robotinom)' : ''}`); osvjeziOcit(); ctx.budi(); }, { tanki: true, u: r1 });
  ui.seg('Brzina traka', [[false, 'Sporo'], [true, 'Brzo']], false, x => { st.brzo = x; osvjeziOcit(); ctx.budi(); });
  ui.klizac('Ubrzanje prikaza', 1, 20, 1, st.ubrz, x => '×' + x, x => { st.ubrz = x; });
  ui.klizac('Broj nosača na petlji', 2, 6, 1, st.n, x => String(x), x => { st.n = x; st.nalozi = []; st.robNosac = null; napravi(); osvjeziOcit(); ctx.budi(); });
  ui.kvacica('Novi nalozi s transportom Robotinom (krak BRANCH-a)', false, x => { st.robotino = x; ctx.budi(); });
  const o = ui.ocit([['nal', 'Nalozi u redu (čekaju ST1)'], ['rad', 'Nalozi u radu'], ['got', 'Gotovi nalozi'], ['t', 'Simulirano vrijeme'], ['v', 'Brzina traka']]);
  ui.sitno('Klikni nosač na crtežu: ispod se prikazuje što piše na njegovu RFID-u.');
  const o2 = ui.ocit([['c', 'Odabrani nosač'], ['s', 'Nalog'], ['r', 'Sljedeći resurs']]);
  const logEl = H('ol', { class: 'tcf-log', 'aria-label': 'Dnevnik događaja' }); ui.ocitP.append(logEl);
  napravi();
  st.nalozi.push({ br: ++st.brNalog, robotino: false }, { br: ++st.brNalog, robotino: false });
  osvjeziOcit(); crtaj();
  ui.stanje('U redu su dva naloga. Pokreni liniju: prvi prazan nosač na ST1 dobit će paletu.');
}

/* =========================================================== 2. osnovni modul */
function tOsnovniModul(ui, ctx) {
  const MJ = D.mjere, sc = 0.4;                       // px/mm
  const svg = ui.svg(600, 412, 'Osnovni modul odozgo: dvije trake, zaustavljač, senzori, RFID glava, PLC, ventili, upravljačka ploča i spojevi');
  S('rect', { x: 2, y: 2, width: 596, height: 408, rx: 10, class: 'tcf-graf' }, svg);
  const ox = 60, oy = 30, Wm = MJ.modul.sirina * 1000 * sc, Dm = MJ.modul.dubina * 1000 * sc;
  const X = mm => ox + mm * sc, Y = mm => oy + Dm - mm * sc;    // mm od prednjeg lijevog kuta, y prema natrag
  const dijelovi = [];
  const dio = (naziv, opis, crtaj) => { const g = S('g', { class: 'tcf-dio' }, svg); crtaj(g); dijelovi.push({ naziv, opis, g }); const i = dijelovi.length - 1; klikabilno(ctx, g, naziv, () => odaberi(i)); return g; };
  S('rect', { x: ox, y: oy, width: Wm, height: Dm, rx: 6, class: 'tcf-modul' }, svg);
  const yF = (MJ.modul.dubina / 2 - MJ.traka.razmak / 2) * 1000, yB = (MJ.modul.dubina / 2 + MJ.traka.razmak / 2) * 1000, w = MJ.traka.sirina * 1000;
  const traka = (y, smjer) => { const g = trakaPut(svg, `M${f1(smjer < 0 ? X(1200) : X(0))},${f1(Y(y))}H${f1(smjer < 0 ? X(0) : X(1200))}`, w * sc); return g; };
  const tF = traka(yF, -1), tB = traka(yB, 1);
  // dijelovi
  const xZ = 420;
  dio('Transportne trake', () => `Dvije trake s remenom širine ${hr(MJ.traka.sirina * 1000, 0)} mm, motori 24 V DC, dvosmjerno, sporo/brzo [IP-ASRS]. Razmak osi traka ${hr(MJ.traka.razmak * 1000, 0)} mm i visina ravnine ${hr(MJ.traka.visina * 1000, 0)} mm su pretpostavke.`, g => {
    S('rect', { x: X(1200) - 22, y: Y(yF) - 14, width: 18, height: 28, rx: 3, class: 'tcf-motor' }, g); S('rect', { x: X(0) + 4, y: Y(yB) - 14, width: 18, height: 28, rx: 3, class: 'tcf-motor' }, g);
    T(g, X(1200) - 13, Y(yF) - 20, 'M', 'tcf-ls', 'middle');
  });
  const zG = dio('Zaustavljač (klin, MB20 / BG20)', () => 'Pneumatski klin ispod staze zadržava nosač na radnom položaju; ventil MB20 ga spušta, senzor BG20 javlja spušteni položaj (oznake s ASRS-a) [MAN-ASRS].', g => {
    S('rect', { x: X(xZ) - 5, y: Y(yF) - 18, width: 10, height: 36, rx: 2, class: 'tcf-zaust' }, g);
  });
  const rG = dio('RFID glava', () => `Glava ispod staze čita i piše tag nosača dok stoji na zaustavljaču (${D.materijal.rfid.tip}) [${D.materijal.rfid.izvor}].`, g => {
    S('rect', { x: X(xZ + 80) - 14, y: Y(yF) - 10, width: 28, height: 20, rx: 4, class: 'tcf-rfid' }, g);
  });
  const sen = [];
  dio('Senzori nosača', () => 'Senzor na ulazu javlja dolazak nosača, senzor na zaustavljaču da nosač stoji na radnom položaju, a senzor na izlazu da je otišao. Na ASRS-u uz zaustavljač su četiri induktivna senzora (prisutnost + 4-bitni kod) [IP-ASRS].', g => {
    for (const [x, t] of [[1080, 'ulaz'], [xZ + 80, 'na zaust.'], [120, 'izlaz']]) {
      const c = S('circle', { cx: X(x), cy: Y(yF) + 22, r: 6, class: 'tcf-senzor' }, g); sen.push(c);
      T(g, X(x), Y(yF) + 44, t, 'tcf-ls', 'middle');
    }
  });
  dio('PLC (ET200SP CPU 1512SP F-1 PN)', () => `${D.upr.plc.tip}: ${D.upr.plc.opis} [${D.upr.plc.izvor}]. Čita senzore, upravlja trakama i zaustavljačima te razgovara s MES-om.`, g => {
    S('rect', { x: X(560), y: Y(468), width: 150, height: 44, rx: 4, class: 'tcf-blok' }, g);
    for (let i = 0; i < 8; i++) S('rect', { x: X(560) + 8 + i * 17, y: Y(468) + 8, width: 12, height: 28, rx: 1, class: 'tcf-modul-io' }, g);
    T(g, X(560) + 75, Y(468) - 6, 'PLC (u ormaru)', 'tcf-ls', 'middle');
  });
  dio('Ventilski otok i priprema zraka', () => 'Zrak 6 bar dolazi spojnom cijevi; elektromagnetski ventili upravljaju zaustavljačima i aktuatorima aplikacije. Tip ventilskog otoka nije objavljen (načelni prikaz).', g => {
    S('rect', { x: X(150), y: Y(468), width: 100, height: 44, rx: 4, class: 'tcf-blok' }, g);
    for (let i = 0; i < 5; i++) S('rect', { x: X(150) + 8 + i * 18, y: Y(468) + 10, width: 13, height: 24, rx: 2, class: 'tcf-ventil' }, g);
    T(g, X(150) + 50, Y(468) - 6, 'ventili', 'tcf-ls', 'middle');
  });
  dio('Upravljačka ploča (HMI, sklopka, gljiva)', () => `Kosa ploča uz prednji rub: glavna sklopka, ${D.upr.hmi.tip}, gljiva nužnog stopa i tipke [IP-ASRS].`, g => {
    S('rect', { x: X(250), y: Y(0) + 4, width: 700 * sc, height: 26, rx: 4, class: 'tcf-ploca-u' }, g);
    S('circle', { cx: X(300), cy: Y(0) + 17, r: 8, class: 'tcf-tamno' }, g);
    S('rect', { x: X(600), y: Y(0) + 7, width: 50, height: 20, rx: 2, class: 'tcf-hmi' }, g);
    S('circle', { cx: X(880), cy: Y(0) + 17, r: 9, class: 'tcf-gljiva' }, g);
  });
  dio('Spojevi prema susjednim stanicama', () => `${D.upr.spoj} [MAN-ASRS].`, g => {
    S('rect', { x: X(0) - 26, y: Y(400) - 16, width: 22, height: 32, rx: 4, class: 'tcf-spoj' }, g); S('rect', { x: X(1200) + 4, y: Y(400) - 16, width: 22, height: 32, rx: 4, class: 'tcf-spoj' }, g);
    T(g, X(0) - 15, Y(400) + 34, 'XZ1', 'tcf-ls', 'middle'); T(g, X(1200) + 15, Y(400) + 34, 'XZ2', 'tcf-ls', 'middle');
  });
  T(svg, ox, 404, 'prednja strana (operater)', 'tcf-ls');
  T(svg, X(600), Y(400) + 34, 'u ormaru, ispod palube', 'tcf-ls', 'middle');
  // nosač
  const nos = nosacOdozgo(svg, sc * 1000);
  nos.stanje('paleta');
  const st = { radi: false, x: 1250, faza: 'van', t: 0, pomak: 0, modul: 'asrs', odabran: -1 };
  const xStop = xZ + 80;                               // središte nosača na zaustavljaču
  const v = MJ.traka.brzinaSpora * 1000;
  const IO = { ulaz: 0, naz: 0, izl: 0, bg20: 0, rfid: 0, mot: 0, mb20: 0 };
  ctx.petlja(dt => {
    if (st.radi) {
      st.t += dt; IO.mot = 1;
      st.pomak += v * dt * sc;
      if (st.faza === 'van') { st.x = 1300; st.faza = 'vozi'; }
      if (st.faza === 'vozi') { st.x -= v * dt * 2.5; if (st.x <= xStop) { st.x = xStop; st.faza = 'citaj'; st.t = 0; } }
      else if (st.faza === 'citaj') { IO.rfid = st.t > 0.4 ? 1 : 0; if (st.t > 1.2) { st.faza = 'radi'; st.t = 0; } }
      else if (st.faza === 'radi') { if (st.t > 2) { st.faza = 'pusti'; st.t = 0; } }
      else if (st.faza === 'pusti') { IO.mb20 = 1; IO.bg20 = st.t > 0.25 ? 1 : 0; st.x -= v * dt * 2.5; if (st.x < xStop - 170) { IO.mb20 = 0; IO.bg20 = 0; st.faza = 'odlazi'; } }
      else if (st.faza === 'odlazi') { st.x -= v * dt * 2.5; if (st.x < -120) { st.faza = 'van'; } }
    } else IO.mot = 0;
    IO.ulaz = Math.abs(st.x - 1080) < 80 ? 1 : 0; IO.naz = Math.abs(st.x - xStop) < 30 ? 1 : 0; IO.izl = Math.abs(st.x - 120) < 80 ? 1 : 0;
    if (st.faza !== 'citaj' && st.faza !== 'radi') IO.rfid = 0;
    nos.postavi(X(st.x), Y(yF), Math.PI); nos.style.display = st.x > 1240 || st.x < -100 ? 'none' : '';
    tF.pomak(st.pomak); tB.pomak(st.pomak);
    zG.classList.toggle('tcf-dolje', !!IO.mb20);
    sen[0].classList.toggle('tcf-senzor-on', !!IO.ulaz); sen[1].classList.toggle('tcf-senzor-on', !!IO.naz); sen[2].classList.toggle('tcf-senzor-on', !!IO.izl);
    rG.classList.toggle('tcf-rfid-akt', !!IO.rfid);
    for (const k in IO) io[k](IO[k] ? '1' : '0', IO[k] ? 'ok' : '');
    ui.stanje({ van: 'Čeka se nosač.', vozi: 'Nosač vozi prema zaustavljaču; senzor na ulazu ga vidi.', citaj: 'Nosač stoji na klinu; RFID glava čita tag.', radi: 'Operacija stanice (npr. portal ASRS-a uzima paletu).', pusti: 'Ventil MB20 spušta klin, BG20 potvrđuje; nosač odlazi.', odlazi: 'Klin je opet gore i čeka sljedeći nosač.' }[st.faza] || '');
    return st.radi;
  });
  ui.igraj(st, 'radi', 'Pokreni nosač');
  ui.seg('Stanica', [['rass', 'RASS'], ['branch', 'BRANCH'], ['asrs', 'ASRS32']], 'asrs', k => { st.modul = k; pod(); });
  const odaberiL = legenda(ui, ctx, dijelovi, i => odaberi(i));
  const io = ui.ocit([['ulaz', 'DI senzor ulaza'], ['naz', 'DI nosač na zaustavljaču'], ['bg20', 'DI BG20 klin dolje'], ['rfid', 'RFID očitan'], ['izl', 'DI senzor izlaza'], ['mot', 'DO motor trake'], ['mb20', 'DO MB20 spusti klin']]);
  const op = ui.ocit([['oz', 'Oznaka'], ['nap', 'Napajanje'], ['sn', 'Snaga / masa'], ['io', 'Ulazi / izlazi'], ['tl', 'Tlak']]);
  const opis = ui.sitno('Klikni dio za opis.');
  function odaberi(i) {
    st.odabran = i; odaberiL(i);
    dijelovi.forEach((d, j) => d.g.classList.toggle('tcf-istaknut', j === i));
    opis.textContent = dijelovi[i].naziv + ': ' + dijelovi[i].opis();
  }
  function pod() {
    const m = D.moduli[st.modul];
    op.oz(m.oznaka); op.nap(m.napajanje); op.sn(m.snaga + ' W / ' + m.masa + ' kg' + IZV('pločica')); op.io(m.io || '—'); op.tl(hr(m.tlak, 1) + ' MPa');
  }
  pod(); ctx.budi();
}

/* =========================================================== 3. RFID */
function tRfid(ui, ctx) {
  const svg = ui.svg(600, 300, 'Bočni presjek: nosač s RFID tagom iznad glave ispod staze, elektromagnetsko polje i prijenos podataka');
  S('rect', { x: 2, y: 2, width: 596, height: 296, rx: 10, class: 'tcf-graf' }, svg);
  const sc = 2.2;                                     // px/mm
  const yRem = 170;                                   // gornja ploha remena
  S('rect', { x: 20, y: yRem, width: 560, height: 10, class: 'tcf-remen-b' }, svg);
  const rebra = S('line', { x1: 20, y1: yRem + 5, x2: 580, y2: yRem + 5, class: 'tcf-remen-r' }, svg);
  S('rect', { x: 20, y: yRem + 10, width: 560, height: 30, class: 'tcf-profil' }, svg);
  T(svg, 26, yRem + 32, 'profil trake', 'tcf-ls');
  // glava
  const xG = 300;
  const glava = S('g', {}, svg);
  const gGl = S('rect', { x: xG - 28, y: yRem + 46, width: 56, height: 30, rx: 5, class: 'tcf-rfid' }, glava);
  T(svg, xG + 36, yRem + 66, 'RFID glava (13,56 MHz)', 'tcf-ls');
  const polje = [0, 1, 2].map(i => S('path', { class: 'tcf-polje' }, svg));
  // nosač (bočno)
  const N = D.mjere.nosac;
  const gN = S('g', {}, svg);
  const nosH = 15 * sc, nosL = N.duljina * 1000 * sc * 0.75;
  S('rect', { x: -nosL / 2, y: -nosH, width: nosL, height: nosH, rx: 3, class: 'tcf-nosac' }, gN);
  S('rect', { x: -nosL / 2 + 6, y: -nosH - 10, width: nosL - 12, height: 10, rx: 2, class: 'tcf-paleta' }, gN);
  S('rect', { x: -nosL / 2 + 20, y: -nosH - 26, width: nosL - 40, height: 16, rx: 3, class: 'tcf-izradak' }, gN);
  const tag = S('rect', { x: -14, y: -6, width: 28, height: 5, rx: 1, class: 'tcf-tag' }, gN);
  const vijci = [0, 1, 2, 3].map(i => S('rect', { x: -nosL / 2 + 22 + i * 18, y: -3, width: 8, height: 3, class: 'tcf-vijak' }, gN));
  const razmT = T(svg, 20, 30, '', 'tcf-l');
  const bitovi = S('g', {}, svg);
  const st = { mod: 'mes', razmak: 12, x: -120, faza: 'stoji', t: 0, id: 3, kod: false, pisano: false, pomak: 0, uPolju: false, ok: false };
  // tablica memorije taga
  const tab = H('table', { class: 'tcf-tab' }); ui.ocitP.append(H('h4', { class: 'tcf-podnaslov', tekst: 'Podaci na tagu' }), tab);
  const res = D.mes.resursi, ops = D.mes.operacije;
  function retci() {
    if (st.mod === 'mes') {
      const nakon = st.pisano;
      return [['Carrier ID', String(st.id)], ['ONo (nalog)', '1001'], ['OPos (pozicija)', '1'], ['PNo (dio)', String(D.materijal.paleta.mesPNo)],
        ['Resource (sljedeći)', nakon ? 'RASS = ' + res.rass : 'ASRS = ' + res.asrs], ['Operation (sljedeća)', nakon ? opNo(opRes('rass').opNo) : String(ops[2].opNo)]];
    }
    return [['State code', st.pisano ? '3' : '2'], ['Parametar 1', st.pisano ? '0' : '12'], ['Parametar 2', String(D.materijal.paleta.mesPNo)], ['Parametar 3', '0'], ['Parametar 4', '0']];
  }
  function tablica(akt) {
    tab.replaceChildren(H('tr', {}, H('th', { tekst: 'Polje' }), H('th', { tekst: 'Vrijednost' })));
    for (const [k, v] of retci()) tab.append(H('tr', { class: akt ? 'tcf-akt-r' : null }, H('td', { tekst: k }), H('td', { tekst: st.ok || akt ? v : '?' })));
  }
  const xStop = xG;
  const v = 110;
  function pusti() { st.x = -120; st.faza = 'vozi'; st.ok = false; st.pisano = false; tablica(false); ui.stanje('Nosač dolazi na zaustavljač.'); ctx.budi(); }
  ctx.petlja(dt => {
    st.t += dt;
    if (st.faza === 'vozi') { st.x += v * dt; st.pomak += v * dt; if (st.x >= xStop) { st.x = xStop; st.faza = 'citaj'; st.t = 0; } }
    else if (st.faza === 'odlazi') { st.x += v * dt; st.pomak += v * dt; if (st.x > 720) st.faza = 'stoji'; }
    else if (st.faza === 'citaj' || st.faza === 'pisi') {
      if (st.razmak > 30) { if (st.t > 1.5) { st.faza = 'mir'; ui.stanje(`Razmak ${st.razmak} mm je veći od dometa (do 30 mm): glava ne napaja tag i čitanje ne uspijeva. Stanica javlja grešku.`, 'opas'); } }
      else if (st.t > 1.2) {
        if (st.faza === 'citaj') { st.ok = true; ui.stanje(st.mod === 'mes' ? 'Tag očitan: PLC sad pita MES ima li operaciju za ovaj ONo/OPos na ovom resursu.' : 'Tag očitan: PLC prema state codeu i parametru 1 sam odlučuje što radi (tablica prijelaza).', 'ok'); }
        else { st.pisano = true; ui.stanje(st.mod === 'mes' ? 'OpEnd: na tag su upisani sljedeći resurs (RASS) i operacija. OpNo RASS-a nije objavljen — u stvarnom sustavu ga zadaje MES4.' : 'Upisan je novi state code; sljedeća stanica će iz njega znati što treba.', 'ok'); }
        tablica(true); st.faza = 'mir';
      }
    }
    // crtanje
    const yN = yRem - (st.razmak - 12) * sc * 0.6;
    gN.setAttribute('transform', `translate(${f1(st.x)} ${f1(yN)})`);
    gN.style.display = st.x < -100 || st.x > 700 ? 'none' : '';
    rebra.style.strokeDashoffset = f1(-st.pomak);
    st.uPolju = Math.abs(st.x - xG) < 50 && st.razmak <= 30;
    const aktivno = st.faza === 'citaj' || st.faza === 'pisi';
    polje.forEach((p, i) => {
      const r = 22 + i * 22 + (aktivno ? (st.t * 30) % 22 : 0);
      p.setAttribute('d', `M${xG - r * 1.6},${yRem + 46} A${f1(r * 1.6)},${f1(r * 1.25)} 0 0 1 ${xG + r * 1.6},${yRem + 46}`);
      p.style.opacity = aktivno ? String(0.75 - i * 0.2) : '0.15';
    });
    gGl.classList.toggle('tcf-rfid-akt', aktivno);
    tag.classList.toggle('tcf-tag-on', aktivno && st.uPolju);
    bitovi.replaceChildren();
    if (aktivno && st.uPolju) for (let i = 0; i < 4; i++) {
      const u = ((st.t * 1.6 + i / 4) % 1), gore = st.faza === 'pisi';
      const y = gore ? yRem + 44 - u * (44 + 10) : yN - 4 + u * (yRem + 44 - yN + 4);
      S('rect', { x: xG - 10 + i * 6, y: f1(y), width: 4, height: 6, class: 'tcf-bit' }, bitovi);
    }
    razmT.textContent = `razmak tag – glava ${st.razmak} mm`;
    vijci.forEach((vj, i) => { vj.style.display = st.kod && ((st.id >> i) & 1) ? '' : 'none'; });
    o.st(st.uPolju ? 'u polju' : 'izvan polja', st.uPolju ? 'ok' : (st.razmak > 30 ? 'opas' : ''));
    o.kod(st.kod ? (st.id.toString(2).padStart(4, '0') + ' = ' + st.id) : '—');
    return st.faza === 'vozi' || st.faza === 'odlazi' || st.faza === 'citaj' || st.faza === 'pisi';
  });
  const r1 = ui.red();
  ui.gumb('Pokreni nosač', () => pusti(), { u: r1 });
  ui.gumb('Čitaj', () => { if (st.faza === 'mir' || st.faza === 'stoji' && st.x === xStop) { st.faza = 'citaj'; st.t = 0; ctx.budi(); } else if (st.x !== xStop) ui.stanje('Nosač nije na zaustavljaču — glava nema što čitati.', 'upoz'); }, { tanki: true, u: r1 });
  ui.gumb('Piši (OpEnd)', () => { if (st.x === xStop && (st.faza === 'mir')) { st.faza = 'pisi'; st.t = 0; ctx.budi(); } else ui.stanje('Najprije neka nosač stoji na zaustavljaču i bude očitan.', 'upoz'); }, { tanki: true, u: r1 });
  ui.gumb('Pusti nosač', () => { if (st.x === xStop) { st.faza = 'odlazi'; ui.stanje('Zaustavljač se spušta, nosač odlazi sa svojim podacima.'); ctx.budi(); } }, { tanki: true, u: r1 });
  ui.seg('Način rada', [['mes', 'MES'], ['default', 'Default']], 'mes', m => { st.mod = m; st.pisano = false; tablica(false); });
  ui.klizac('Razmak tag – glava', 4, 50, 1, st.razmak, x => x + ' mm', x => { st.razmak = x; ctx.budi(); });
  ui.kvacica('Prikaži 4-bitni kod (vijci na dnu nosača)', false, x => { st.kod = x; ctx.budi(); });
  ui.klizac('Broj nosača u kodu (1–15)', 1, 15, 1, st.id, x => String(x), x => { st.id = x; tablica(false); ctx.budi(); });
  const o = ui.ocit([['st', 'Tag'], ['kod', '4-bitni kod (BCD)']]);
  tablica(false); pusti();
}

/* =========================================================== 4. zaustavljač */
function tZaustavljac(ui, ctx) {
  const svg = ui.svg(600, 190, 'Bočni pogled: traka, nosači, zaustavljač s klinom, senzor nosača i RFID glava');
  S('rect', { x: 2, y: 2, width: 596, height: 186, rx: 10, class: 'tcf-graf' }, svg);
  const sc = 0.6;                                    // px/mm
  const yRem = 110, xK = 400;                         // klin
  const Lnos = D.mjere.nosac.duljina * 1000 * sc;
  S('rect', { x: 10, y: yRem, width: 580, height: 8, class: 'tcf-remen-b' }, svg);
  const rebra = S('line', { x1: 10, y1: yRem + 4, x2: 590, y2: yRem + 4, class: 'tcf-remen-r' }, svg);
  S('rect', { x: 10, y: yRem + 8, width: 580, height: 22, class: 'tcf-profil' }, svg);
  const klin = S('rect', { x: xK, y: yRem - 16, width: 8, height: 30, rx: 2, class: 'tcf-zaust' }, svg);
  S('rect', { x: xK - 6, y: yRem + 14, width: 20, height: 28, rx: 3, class: 'tcf-cil' }, svg);
  T(svg, xK + 18, yRem + 40, 'zaustavljač (MB20 / BG20)', 'tcf-ls');
  const xS = xK - Lnos / 2 - 2;
  const sen = S('circle', { cx: xS, cy: yRem + 52, r: 6, class: 'tcf-senzor' }, svg);
  const snop = S('line', { x1: xS, y1: yRem + 46, x2: xS, y2: yRem - 10, class: 'tcf-snop' }, svg);
  T(svg, xS - 12, yRem + 57, 'senzor', 'tcf-ls', 'end');
  S('rect', { x: xK - Lnos / 2 - 14, y: yRem + 10, width: 28, height: 10, rx: 2, class: 'tcf-rfid' }, svg);
  T(svg, 16, 26, 'smjer vožnje →', 'tcf-ls');
  const gN = S('g', {}, svg);
  // vremenski dijagram
  const svg2 = ui.svg(600, 210, 'Vremenski dijagram signala zaustavljača', 'tcf-svg2');
  const TR = [['sen', 'senzor nosača'], ['rfid', 'RFID čitanje'], ['op', 'operacija'], ['dolje', 'klin dolje (BG20)'], ['mot', 'motor trake']];
  const OKNO = 16, gx = 150, gw = 430;
  TR.forEach(([k, t], i) => { T(svg2, 8, 34 + i * 36, t, 'tcf-ls'); S('line', { x1: gx, y1: 40 + i * 36, x2: gx + gw, y2: 40 + i * 36, class: 'tcf-mreza' }, svg2); });
  const krivulje = TR.map(() => S('path', { class: 'tcf-krivulja' }, svg2));
  T(svg2, gx + gw, 204, 'sada', 'tcf-ls', 'end'); T(svg2, gx, 204, '−' + OKNO + ' s', 'tcf-ls');
  const st = { radi: false, tOp: 3, tDolje: 0.8, posao: true, auto: true, t: 0, faza: 'gore', tf: 0, pomak: 0, hist: [], dolazak: 0, obradjeno: 0, neobr: 0, idN: 0, trenutni: null };
  const v = D.mjere.traka.brzinaSpora * 1000 * sc * 2;   // prikaz ubrzan 2×
  let nosaci = [];
  function dodaj() {
    const minX = nosaci.length ? Math.min(...nosaci.map(n => n.x)) : 999;
    if (minX < 20 + Lnos) return;
    const g = S('g', {}, gN);
    S('rect', { x: -Lnos / 2, y: -8, width: Lnos, height: 8, rx: 2, class: 'tcf-nosac' }, g);
    S('rect', { x: -Lnos / 2 + 4, y: -12, width: Lnos - 8, height: 4, class: 'tcf-paleta' }, g);
    const iz = S('rect', { x: -Lnos / 2 + 12, y: -18, width: Lnos - 24, height: 6, rx: 2, class: 'tcf-izradak' }, g);
    nosaci.push({ id: ++st.idN, x: -Lnos / 2, g, iz, obr: false, prosao: false });
  }
  function korak(dt) {
    st.t += dt; st.tf += dt; st.pomak += v * dt;
    if (st.auto) { st.dolazak -= dt; if (st.dolazak <= 0) { dodaj(); st.dolazak = 3.2; } }
    // logika zaustavljača
    const naKlinu = nosaci.find(n => Math.abs(n.x + Lnos / 2 - xK) < 1.5);
    if (st.faza === 'gore' && naKlinu && !naKlinu.obr) { st.faza = 'citaj'; st.tf = 0; st.trenutni = naKlinu; }
    else if (st.faza === 'citaj' && st.tf > 0.5) { st.faza = st.posao ? 'op' : 'dolje'; st.tf = 0; }
    else if (st.faza === 'op' && st.tf > st.tOp) { st.faza = 'dolje'; st.tf = 0; if (st.trenutni) { st.trenutni.obr = true; st.obradjeno++; } }
    else if (st.faza === 'dolje' && st.tf > st.tDolje) { st.faza = 'gore'; st.tf = 0; if (st.trenutni) st.trenutni.obr = true; st.trenutni = null; }
    // gibanje nosača (redom od najdesnijeg)
    nosaci.sort((a, b) => b.x - a.x);
    let prednji = Infinity;
    for (const n of nosaci) {
      let x1 = n.x + v * dt;
      const klinGore = st.faza !== 'dolje';
      if (klinGore && n.x + Lnos / 2 <= xK + 0.01 && x1 + Lnos / 2 > xK) x1 = xK - Lnos / 2;
      x1 = Math.min(x1, prednji - Lnos - 1);
      if (n.x + Lnos / 2 <= xK && x1 + Lnos / 2 > xK + 2 && !n.obr && st.trenutni !== n) { n.neobr = true; st.neobr++; ui.stanje(`Nosač ${n.id} je prošao neobrađen: klin je bio dolje predugo pa je sljedeći nosač „proklizao” ispod njega.`, 'opas'); }
      n.x = Math.max(n.x, x1);
      prednji = n.x;
    }
    nosaci = nosaci.filter(n => { if (n.x > 640) { n.g.remove(); return false; } return true; });
    // povijest signala
    const senz = nosaci.some(n => Math.abs(n.x + Lnos / 2 - xK) < 2.5) ? 1 : 0;
    if (st.hist.length && st.t - st.hist[st.hist.length - 1][0] < 0.05) return;
    st.hist.push([st.t, senz, st.faza === 'citaj' ? 1 : 0, st.faza === 'op' ? 1 : 0, st.faza === 'dolje' ? 1 : 0, 1]);
    while (st.hist.length && st.hist[0][0] < st.t - OKNO) st.hist.shift();
  }
  function crtaj() {
    for (const n of nosaci) { n.g.setAttribute('transform', `translate(${f1(n.x)} ${yRem})`); n.iz.classList.toggle('tcf-izradak-gotov', n.obr && !n.neobr); n.g.classList.toggle('tcf-nos-greska', !!n.neobr); }
    rebra.style.strokeDashoffset = f1(-st.pomak);
    klin.setAttribute('y', f1(st.faza === 'dolje' ? yRem + 2 : yRem - 16));
    const senz = st.hist.length ? st.hist[st.hist.length - 1][1] : 0;
    sen.classList.toggle('tcf-senzor-on', !!senz); snop.classList.toggle('tcf-snop-on', !!senz);
    krivulje.forEach((k, i) => {
      const y0 = 40 + i * 36, hgt = 20;
      const pts = st.hist.map(h => [gx + gw - (st.t - h[0]) / OKNO * gw, y0 - h[i + 1] * hgt]);
      let d = '';
      pts.forEach((p, j) => { d += (j ? `L${f1(p[0])},${f1(pts[j - 1][1])}L` : 'M') + `${f1(p[0])},${f1(p[1])}`; });
      k.setAttribute('d', d);
    });
    o.f({ gore: 'klin gore, čeka', citaj: 'čita RFID', op: 'operacija', dolje: 'klin dolje' }[st.faza]);
    o.ob(String(st.obradjeno)); o.ne(String(st.neobr), st.neobr ? 'opas' : '');
    const tPr = (Lnos + 2) / v; o.tp(hr(tPr, 1) + ' s');
  }
  ctx.petlja(dt => { if (st.radi) korak(dt); crtaj(); return st.radi; });
  const r1 = ui.red();
  ui.igraj(st, 'radi', 'Pokreni', null, r1);
  ui.gumb('Dodaj nosač', () => { dodaj(); ctx.budi(); }, { tanki: true, u: r1 });
  ui.kvacica('Nosači dolaze sami (svakih 3,2 s)', true, x => { st.auto = x; });
  ui.kvacica('Operacija za ovaj nosač (inače samo čitanje i propuštanje)', true, x => { st.posao = x; });
  ui.klizac('Trajanje operacije', 0.5, 10, 0.5, st.tOp, x => hr(x, 1) + ' s', x => { st.tOp = x; });
  ui.klizac('Klin dolje', 0.3, 4, 0.1, st.tDolje, x => hr(x, 1) + ' s', x => { st.tDolje = x; });
  const o = ui.ocit([['f', 'Stanje zaustavljača'], ['tp', 'Nosač prijeđe klin za'], ['ob', 'Obrađeno nosača'], ['ne', 'Prošlo neobrađeno']]);
  ui.sitno('Klin smije biti dolje samo dok nosač ne prijeđe preko njega. Ako je dolje dulje od vremena prijelaza, a sljedeći nosač je odmah iza, i on prođe. Prikaz je ubrzan 2×.');
  crtaj(); ui.stanje('Pokreni: nosači stižu s lijeva i redom staju na klinu.');
}

/* =========================================================== 5. regalno skladište */
function tRegalnoSkladiste(ui, ctx) {
  const A = D.mjere.asrs, O = A.os, RG = A.regal, MJ = D.mjere;
  const RZ = RG.razina, SU = RG.stupaca, NM = RZ * SU;          // mjesta po regalu
  const s = 222;
  const svg = ui.svg(620, 340, 'Pogled sprijeda na regal ASRS-a s portalom (osi X i Z) i bočni presjek s osima Y i C');
  S('rect', { x: 2, y: 2, width: 616, height: 336, rx: 10, class: 'tcf-graf' }, svg);
  // pogled sprijeda: lokalni x (−0,6…0,6) i z (0,85…1,95)
  const FX = x => 18 + (x + 0.6) * s, FZ = z => 10 + (2.22 - z) * s;
  S('rect', { x: FX(-0.6), y: FZ(A.visina), width: 1.2 * s, height: (A.visina - A.kucisteOd) * s, rx: 4, class: 'tcf-kuciste-s' }, svg);
  T(svg, FX(-0.58), FZ(A.visina) + 16, 'pogled sprijeda', 'tcf-ls');
  // trake (prednja pokriva stražnju)
  S('rect', { x: FX(-0.6), y: FZ(MJ.traka.visina) - 2, width: 1.2 * s, height: 10, class: 'tcf-remen-b' }, svg);
  const xSt = MJ.asrs.stoper.x;
  S('rect', { x: FX(xSt) - 3, y: FZ(MJ.traka.visina) + 8, width: 6, height: 12, class: 'tcf-zaust' }, svg);
  T(svg, FX(xSt), FZ(MJ.traka.visina) + 34, 'ST1 / ST2', 'tcf-ls', 'middle');
  const nosST = S('g', { style: 'pointer-events:none' }, svg);
  const LP = MJ.paleta.duljina * s;
  S('rect', { x: -LP / 2, y: -4, width: LP, height: 4, class: 'tcf-nosac' }, nosST);
  const palST = S('rect', { x: -LP / 2 + 2, y: -7, width: LP - 4, height: 3, class: 'tcf-paleta' }, nosST);
  // police
  const celije = [];
  const mjesto = (n) => { const i = (n - 1) % NM; return { st: i % SU, rz: Math.floor(i / SU), straga: n > NM }; };
  const xM = st2 => RG.x0 + RG.dx * st2, zM = rz => RG.z0 + RG.dz * rz;
  for (let i = 0; i < NM; i++) {
    const st2 = i % SU, rz = Math.floor(i / SU), x = xM(st2), z = zM(rz);
    const g = S('g', { class: 'tcf-celija' }, svg);
    S('rect', { x: FX(x) - LP / 2 - 5, y: FZ(z) - 2, width: LP + 10, height: 4, class: 'tcf-polica' }, g);
    const p = S('rect', { x: FX(x) - LP / 2, y: FZ(z) - 9, width: LP, height: 6, rx: 1, class: 'tcf-paleta' }, g);
    const izr = S('rect', { x: FX(x) - LP / 2 + 6, y: FZ(z) - 16, width: LP - 12, height: 7, rx: 2, class: 'tcf-izradak' }, g);
    const br = T(g, FX(x), FZ(z) - 22, '', 'tcf-ls tcf-br-m', 'middle');
    const ok = S('rect', { x: FX(x) - LP / 2 - 6, y: FZ(z) - 34, width: LP + 12, height: 38, rx: 4, class: 'tcf-odabir' }, g);
    celije.push({ g, p, izr, br, ok, i });
  }
  // portal: stup Z desno, konzola X, kolica, prihvatnica
  const XS = FX(O.xMax + 0.16);
  S('rect', { x: XS - 6, y: FZ(A.visina + A.stupIznad), width: 12, height: (A.visina + A.stupIznad - 0.9) * s, class: 'tcf-stup' }, svg);
  const gZ = S('g', { style: 'pointer-events:none' }, svg);
  S('rect', { x: FX(O.xMin - 0.1), y: -5, width: XS - FX(O.xMin - 0.1), height: 6, rx: 2, class: 'tcf-konzola' }, gZ);
  const gX = S('g', {}, gZ);
  S('rect', { x: -16, y: -16, width: 32, height: 12, rx: 3, class: 'tcf-kolica' }, gX);
  const hv = [S('rect', { x: -LP / 2 - 4, y: 1, width: 4, height: 9, class: 'tcf-celjust' }, gX), S('rect', { x: LP / 2, y: 1, width: 4, height: 9, class: 'tcf-celjust' }, gX)];
  const palH = S('g', {}, gX);
  S('rect', { x: -LP / 2 + 1, y: 4, width: LP - 2, height: 5, rx: 1, class: 'tcf-paleta' }, palH);
  S('rect', { x: -LP / 2 + 7, y: -3, width: LP - 14, height: 7, rx: 2, class: 'tcf-izradak' }, palH);
  T(svg, XS + 10, FZ(1.9), 'Z', 'tcf-lb tcf-os-z');
  // bočni presjek: lokalni y (−0,45…0,45), isti z
  const BX = y => 400 + (y + 0.42) * 240, BZ = FZ;
  T(svg, BX(-0.42), FZ(A.visina) + 16, 'presjek (sprijeda lijevo)', 'tcf-ls');
  const yF = -MJ.traka.razmak / 2, yB = MJ.traka.razmak / 2;
  for (const y of [yF, yB]) S('rect', { x: BX(y) - 8, y: BZ(MJ.traka.visina) - 2, width: 16, height: 10, class: 'tcf-remen-b' }, svg);
  T(svg, BX(yF), BZ(MJ.traka.visina) + 26, 'ST1', 'tcf-ls', 'middle'); T(svg, BX(yB), BZ(MJ.traka.visina) + 26, 'ST2', 'tcf-ls', 'middle');
  for (const y of [-RG.y, RG.y]) for (let rz = 0; rz < RZ; rz++) S('rect', { x: BX(y) - 14, y: BZ(zM(rz)) - 2, width: 28, height: 4, class: 'tcf-polica' }, svg);
  T(svg, BX(-RG.y), BZ(zM(RZ - 1)) - 18, 'prednji', 'tcf-ls', 'middle'); T(svg, BX(RG.y), BZ(zM(RZ - 1)) - 18, 'stražnji', 'tcf-ls', 'middle');
  const gB = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: 7, class: 'tcf-zglob' }, gB);
  const ruka = S('rect', { y: -3, height: 6, rx: 2, class: 'tcf-ruka-y' }, gB);
  const palB = S('rect', { y: -9, width: 20, height: 5, rx: 1, class: 'tcf-paleta' }, gB);
  const kut = S('text', { x: 0, y: -16, class: 'tcf-ls', 'text-anchor': 'middle' }, gB);
  // stanje
  const pune = Array.from({ length: 2 * NM }, (_, i) => (i * 7 + 3) % 5 !== 0);
  const st = { x: O.xMax, z: zM(RZ - 1), y: 0, c: 0, hv: true, nosi: false, n: 6, st: 1, regal: 'p', plan: [], k: -1, u: 0, t: 0, radi: false, paletaST: false, opis: '' };
  function naziv(n) { const m = mjesto(n); return `mjesto ${n} (${m.straga ? 'stražnji' : 'prednji'} regal, stupac ${m.st + 1}, razina ${m.rz + 1})`; }
  function osvjeziPolice() {
    const straga = st.regal === 's';
    celije.forEach(c => {
      const n = c.i + 1 + (straga ? NM : 0);
      const puno = pune[n - 1];
      c.p.style.display = puno ? '' : 'none'; c.izr.style.display = puno ? '' : 'none';
      c.br.textContent = String(n);
      c.g.classList.toggle('tcf-akt', n === st.n);
    });
  }
  celije.forEach(c => klikabilno(ctx, c.g, 'Odaberi mjesto ' + (c.i + 1), () => { if (st.radi) return; st.n = c.i + 1 + (st.regal === 's' ? NM : 0); osvjeziPolice(); ui.stanje('Odabrano: ' + naziv(st.n) + (pune[st.n - 1] ? ' — puno.' : ' — prazno.')); osvjeziOcit(); }));
  const opAsrs = (vrsta, k) => (D.mes.operacije.find(o => o.resurs === 'asrs' && o.naziv.startsWith(vrsta) && o.naziv.endsWith('P' + k)) || {}).opNo;
  // plan ciklusa
  function plan(izdaj) {
    const m = mjesto(st.n), cM = m.straga ? O.cKut : 0, cS = st.st === 1 ? 0 : O.cKut;
    const pM = { x: xM(m.st), z: zM(m.rz) }, pS = { x: xSt, z: O.zMin };
    const L = [];
    const xz = (p, txt) => L.push({ txt, t: Math.max(Math.abs(p.x - (L.cx ?? st.x)) / O.vX, Math.abs(p.z - (L.cz ?? st.z)) / O.vZ, 0.2), x0: L.cx ?? st.x, z0: L.cz ?? st.z, x1: p.x, z1: p.z, tip: 'xz' }) && (L.cx = p.x, L.cz = p.z);
    const c = (c1, txt) => { const c0 = L.cc ?? st.c; if (Math.abs(c1 - c0) > 1e-6) L.push({ txt, t: O.tC, c0, c1, tip: 'c' }); L.cc = c1; };
    const y = (y1, txt) => L.push({ txt, t: O.tY, y0: y1 ? 0 : O.yHod, y1, tip: 'y' });
    const h = (zat, txt, fn) => L.push({ txt, t: O.tHvat, zat, tip: 'h', fn });
    if (st.y > 0) L.push({ txt: 'Y uvuci', t: O.tY, y0: st.y, y1: 0, tip: 'y' });
    if (izdaj) {
      c(cM, 'C prema regalu');
      xz(pM, `X/Z na mjesto ${st.n}`);
      y(O.yHod, 'Y van u policu');
      h(true, 'prihvatnica zatvori', () => { pune[st.n - 1] = false; st.nosi = true; osvjeziPolice(); });
      y(0, 'Y uvuci s paletom');
      c(cS, `C prema traci ST${st.st}`);
      xz(pS, `X/Z na ST${st.st}`);
      h(false, 'prihvatnica otvori: paleta na nosaču', () => { st.nosi = false; st.paletaST = true; });
    } else {
      c(cS, `C prema traci ST${st.st}`);
      xz(pS, `X/Z na ST${st.st}`);
      h(true, 'prihvatnica zatvori: paleta s nosača', () => { st.nosi = true; st.paletaST = false; });
      c(cM, 'C prema regalu');
      xz(pM, `X/Z na mjesto ${st.n}`);
      y(O.yHod, 'Y van u policu');
      h(false, 'prihvatnica otvori', () => { pune[st.n - 1] = true; st.nosi = false; osvjeziPolice(); });
      y(0, 'Y uvuci');
    }
    return L;
  }
  function kreni(izdaj) {
    if (st.radi) return;
    const op = opAsrs(izdaj ? 'Release' : 'Store', st.st);
    if (izdaj && !pune[st.n - 1]) { ui.stanje(`Mjesto ${st.n} je prazno — svjetlovod „shelf free” (BG53) javlja slobodnu policu; ${op} se ne može izvesti.`, 'opas'); return; }
    if (!izdaj && pune[st.n - 1]) { ui.stanje(`Mjesto ${st.n} je zauzeto — spremanje bi udarilo u paletu. MES za spremanje bira slobodno mjesto.`, 'opas'); return; }
    st.plan = plan(izdaj); st.k = 0; st.u = 0; st.t = 0; st.radi = true; st.paletaST = !izdaj; st.izdaj = izdaj;
    st.opis = `${op} — ${izdaj ? 'izdavanje s mjesta ' + st.n + ' na nosač na ST' + st.st : 'spremanje s nosača na ST' + st.st + ' na mjesto ' + st.n}`;
    crtajPlan(); ui.stanje(st.opis, 'plavo'); ctx.budi();
  }
  const kor = H('ol', { class: 'tcf-koraci' });
  function crtajPlan() { kor.replaceChildren(...st.plan.map((p, i) => H('li', { tekst: `${p.txt} (${hr(p.t, 1)} s)`, class: i === st.k ? 'tcf-akt' : i < st.k ? 'tcf-gotov' : null }))); }
  ctx.petlja(dt => {
    if (st.radi) {
      st.t += dt;
      const p = st.plan[st.k];
      st.u = Math.min(1, st.u + dt / p.t);
      const g = glatko(st.u);
      if (p.tip === 'xz') { st.x = p.x0 + (p.x1 - p.x0) * g; st.z = p.z0 + (p.z1 - p.z0) * g; }
      else if (p.tip === 'c') st.c = p.c0 + (p.c1 - p.c0) * g;
      else if (p.tip === 'y') st.y = p.y0 + (p.y1 - p.y0) * g;
      else if (p.tip === 'h') st.hv = !p.zat ? st.u > 0.5 : st.u < 0.5;
      if (st.u >= 1) {
        if (p.fn) p.fn();
        if (p.tip === 'h') st.hv = !p.zat;
        st.k++; st.u = 0;
        if (st.k >= st.plan.length) { st.radi = false; ui.stanje(`${st.opis}: gotovo za ${hr(st.t, 1)} s. MES ažurira zalihu.`, 'ok'); }
        crtajPlan();
      }
    }
    // crtanje
    gZ.setAttribute('transform', `translate(0 ${f1(FZ(st.z) - 10)})`);
    gX.setAttribute('transform', `translate(${f1(FX(st.x))} 0)`);
    hv[0].setAttribute('x', f1(st.hv ? -LP / 2 - 7 : -LP / 2 - 3)); hv[1].setAttribute('x', f1(st.hv ? LP / 2 + 3 : LP / 2 - 1));
    palH.style.display = st.nosi ? '' : 'none';
    nosST.setAttribute('transform', `translate(${f1(FX(xSt))} ${f1(FZ(MJ.traka.visina) - 2)})`);
    palST.style.display = st.paletaST ? '' : 'none';
    nosST.style.display = st.radi || st.paletaST ? '' : 'none';
    const smjer = Math.cos(st.c) > 0 ? -1 : 1;           // c = 0 → prema prednjoj strani (−y)
    const duz = O.yOdmak + st.y;
    gB.setAttribute('transform', `translate(${f1(BX(0))} ${f1(BZ(st.z) - 6)})`);
    const L = duz * 240 * Math.abs(Math.cos(st.c)) + 4;
    ruka.setAttribute('x', f1(smjer < 0 ? -L : 0)); ruka.setAttribute('width', f1(L));
    palB.setAttribute('x', f1(smjer < 0 ? -L - 6 : L - 14)); palB.style.display = st.nosi ? '' : 'none';
    kut.textContent = 'C ' + hr(st.c / RAD, 0) + '°';
    osvjeziOcit();
    return st.radi;
  });
  function osvjeziOcit() {
    o.os(`X ${hr(st.x * 1000, 0)} mm · Z ${hr(st.z * 1000, 0)} mm`); o.yc(`Y ${hr(st.y * 1000, 0)} mm · C ${hr(st.c / RAD, 0)}°`);
    o.m(String(st.n)); o.z(pune.filter(Boolean).length + ' / ' + 2 * NM); o.t(hr(st.t, 1) + ' s');
  }
  const r1 = ui.red();
  ui.gumb('Izdaj na nosač', () => kreni(true), { u: r1 });
  ui.gumb('Spremi s nosača', () => kreni(false), { tanki: true, u: r1 });
  ui.seg('Zaustavljač', [[1, 'ST1 (prednja traka)'], [2, 'ST2 (stražnja traka)']], 1, k => { st.st = k; });
  ui.seg('Prikaži regal', [['p', 'Prednji 1–' + NM], ['s', 'Stražnji ' + (NM + 1) + '–' + 2 * NM]], 'p', r => { st.regal = r; const m = mjesto(st.n); st.n = m.st + m.rz * SU + 1 + (r === 's' ? NM : 0); osvjeziPolice(); osvjeziOcit(); });
  ui.upr.append(kor);
  const o = ui.ocit([['m', 'Odabrano mjesto'], ['os', 'Osi X / Z (servo)'], ['yc', 'Osi Y / C (pneumatika)'], ['t', 'Vrijeme ciklusa'], ['z', 'Zauzeto mjesta']]);
  ui.sitno(`Hod osi Y ${hr(O.yHod * 1000, 0)} mm [MAN-ASRS]; C 0° gleda prema prednjem regalu i prednjoj traci (ST1), 180° prema stražnjem regalu i ST2. Brojevi na policama su MES mjesta.`);
  osvjeziPolice(); osvjeziOcit(); ctx.budi();
  ui.stanje('Odaberi mjesto i pritisni „Izdaj na nosač” ili „Spremi s nosača”.');
}

/* =========================================================== 6. robotska montaža */
function tRobotskaMontaza(ui, ctx) {
  const MJ = D.mjere, RS = MJ.rass;
  const P = tlocrt(-0.02, 1.64, 278, 150, 12);
  const svg = ui.svg(600, 370, 'Tlocrt robotske ćelije RASS: robot, bypass s radnim položajem, stezna naprava, kamera, cijevi osigurača, spremište alata i kutija s tiskanim pločicama');
  S('rect', { x: 2, y: 2, width: 596, height: 366, rx: 10, class: 'tcf-graf' }, svg);
  const W = MJ.modul.sirina;
  S('rect', { x: P.X(0), y: P.Y(RS.dubina), width: W * P.s, height: (RS.dubina - 0.8) * P.s, rx: 4, class: 'tcf-modul tcf-modul-c' }, svg);
  S('rect', { x: P.X(0), y: P.Y(0.8), width: W * P.s, height: 0.2 * P.s, class: 'tcf-modul' }, svg);
  T(svg, P.X(0) - 8, P.Y(1.58), 'stražnja', 'tcf-ls', 'end'); T(svg, P.X(0) - 8, P.Y(1.58) + 18, 'strana', 'tcf-ls', 'end');
  T(svg, P.X(0) - 8, P.Y(1.30), 'robotska', 'tcf-ls', 'end'); T(svg, P.X(0) - 8, P.Y(1.30) + 18, 'ćelija', 'tcf-ls', 'end');
  T(svg, P.X(0) - 8, P.Y(0.62), 'prema', 'tcf-ls', 'end'); T(svg, P.X(0) - 8, P.Y(0.62) + 18, 'liniji', 'tcf-ls', 'end');
  // bypass i stražnja glavna traka (isječak)
  const B = RS.bypass, yB = D.konfig.raspored.rass.y + MJ.traka.razmak / 2;
  const trB = trakaPut(svg, `M${f1(P.X(B.x0 - B.prijelaz))},${f1(P.Y(yB))}L${f1(P.X(B.x0))},${f1(P.Y(B.y))}L${f1(P.X(B.x1))},${f1(P.Y(B.y))}L${f1(P.X(B.x1 + B.prijelaz))},${f1(P.Y(yB))}`, MJ.traka.sirina * P.s);
  const trG = trakaPut(svg, `M${f1(P.X(0))},${f1(P.Y(yB))}H${f1(P.X(W))}`, MJ.traka.sirina * P.s);
  T(svg, P.X(B.x1 + B.prijelaz) + 4, P.Y(B.y) + 5, 'bypass', 'tcf-ls');
  for (let i = 0; i < 3; i++) S('line', { x1: f1(P.X(B.radniX - 0.1 + i * 0.1)), y1: f1(P.Y(B.y + 0.07)), x2: f1(P.X(B.radniX - 0.1 + i * 0.1)), y2: f1(P.Y(B.y + 0.1)), class: 'tcf-barijera' }, svg);
  // oprema
  const Np = RS.naprava, Ka = RS.kamera, Os = RS.osiguraci, Mg = RS.magazin, Tk = RS.trakaKutije;
  const naprava = S('rect', { x: P.X(Np.x - Np.a / 2), y: P.Y(Np.y + Np.b / 2), width: Np.a * P.s, height: Np.b * P.s, rx: 3, class: 'tcf-naprava' }, svg);
  T(svg, P.X(Np.x), P.Y(Np.y - Np.b / 2) + 16, 'naprava', 'tcf-ls', 'middle');
  const cijevi = [];
  for (let i = 0; i < Os.broj; i++) { const c = S('circle', { cx: P.X(Os.x + 0.07), cy: P.Y(Os.y - 0.06 + i * 0.06), r: 7, class: 'tcf-cijev-o' }, svg); cijevi.push(c); }
  T(svg, P.X(Os.x + 0.07) + 12, P.Y(Os.y) + 5, 'osigurači', 'tcf-ls');
  const brAlata = Mg.broj;
  const alati = [];
  for (let i = 0; i < brAlata; i++) {
    const y = Mg.y + 0.14 - i * 0.075;
    const g = S('g', {}, svg);
    S('rect', { x: P.X(Mg.x) - 13, y: P.Y(y) - 10, width: 26, height: 20, rx: 3, class: 'tcf-drzac' }, g);
    const a = S('circle', { cx: P.X(Mg.x), cy: P.Y(y), r: 7, class: 'tcf-alat tcf-alat-' + i }, g);
    T(g, P.X(Mg.x) + 18, P.Y(y) + 5, 'T' + (i + 1), 'tcf-ls');
    alati.push({ x: Mg.x, y, a });
  }
  T(svg, P.X(Mg.x) - 14, P.Y(Mg.y + 0.14) - 16, 'spremište alata', 'tcf-ls');
  // kutija PCB (2 × 2 gnijezda)
  const kut = { x0: Tk.x - 0.15, x1: Tk.x + 0.15, y0: Tk.y0, y1: Tk.y0 + 0.4 };
  const gKut = S('g', {}, svg);
  S('rect', { x: P.X(kut.x0), y: P.Y(kut.y1), width: 0.3 * P.s, height: 0.4 * P.s, rx: 4, class: 'tcf-kutija' }, gKut);
  const gnijezda = [];
  for (let i = 0; i < 4; i++) {
    const x = Tk.x - 0.07 + (i % 2) * 0.14, y = Tk.y0 + 0.12 + Math.floor(i / 2) * 0.16;
    const r = S('rect', { x: P.X(x) - 15, y: P.Y(y) - 21, width: 30, height: 42, rx: 2, class: 'tcf-pcb' }, gKut);
    gnijezda.push({ x, y, r, puno: true });
  }
  T(svg, P.X(kut.x1) + 6, P.Y(kut.y1) + 14, 'kutija PCB', 'tcf-ls');
  T(svg, P.X(kut.x1) + 6, P.Y(kut.y1) + 32, '(PNo ' + D.materijal.kutijaPCB.mesPNo + ')', 'tcf-ls');
  // kamera
  const gKam = S('g', {}, svg);
  const kamPolje = S('circle', { cx: P.X(Ka.x), cy: P.Y(Ka.y), r: 34, class: 'tcf-kam-polje' }, gKam);
  S('rect', { x: P.X(Ka.x) - 9, y: P.Y(Ka.y) - 7, width: 18, height: 14, rx: 3, class: 'tcf-kamera' }, gKam);
  T(svg, P.X(Ka.x) - 36, P.Y(Ka.y) - 18, 'kamera', 'tcf-ls', 'end');
  // nosač na radnom položaju
  const nos = nosacOdozgo(svg, P.s);
  // robot (pogled odozgo: ruka od baze do prirubnice)
  const rb = { x: RS.robot.x, y: RS.robot.y };
  S('circle', { cx: P.X(rb.x), cy: P.Y(rb.y), r: 24, class: 'tcf-robot-baza' }, svg);
  const ruka1 = S('line', { class: 'tcf-ruka1' }, svg), ruka2 = S('line', { class: 'tcf-ruka2' }, svg);
  const zglob = S('circle', { r: 8, class: 'tcf-zglob' }, svg);
  const tcp = S('circle', { r: 9, class: 'tcf-tcp' }, svg);
  const tcpT = S('text', { class: 'tcf-ls tcf-tcp-t', 'text-anchor': 'middle' }, svg);
  const nosiEl = S('rect', { width: 22, height: 14, rx: 2, class: 'tcf-izradak' }, svg);
  const nosiPcb = S('rect', { width: 18, height: 10, rx: 1, class: 'tcf-pcb' }, svg);
  const nosiOs = S('circle', { r: 4, class: 'tcf-osigurac' }, svg);
  T(svg, P.X(rb.x) + 20, P.Y(rb.y) - 30, D.konfig.robotRass === 'kuka-kr6' ? 'KUKA KR 6 R900' : 'robot', 'tcf-ls', 'end');
  const ALATI = [['V', 'vakuumska prihvatnica (PCB)'], ['P', 'prihvatnica DHPS-16 (poklopci)'], ['O', 'prihvatnica DHPS-10 (osigurači)'], ['–', 'rezervno mjesto']];
  const st = { nOs: 2, k: -1, u: 0, auto: false, ceka: false, vrata: false, kutija: true, stop: false, pos: { x: rb.x - 0.05, y: rb.y - 0.35 }, alat: -1, nosi: null, tNos: 0, kucisteU: 'paleta', pcbU: false, osU: 0, osCijevi: [10, 10, 10], pcbIdx: 0, t: 0, potvrda: false };
  const tcpN = { x: B.radniX, y: B.y }, napravaT = { x: Np.x, y: Np.y }, kameraT = { x: Ka.x, y: Ka.y };
  function koraci() {
    const L = [];
    const idi = (cilj, txt, akcija, t = 1.4) => L.push({ cilj, txt, akcija, t });
    const zamijeni = (novi) => {
      if (st._alat >= 0) idi(alati[st._alat], `odloži alat T${st._alat + 1} u spremište`, () => { st.alat = -1; });
      idi(alati[novi], `uzmi alat T${novi + 1}: ${ALATI[novi][1]}`, () => { st.alat = novi; });
      st._alat = novi;
    };
    st._alat = st.alat;
    L.push({ cilj: null, txt: 'nosač stiže na radni položaj; barijere provjere orijentaciju izratka', t: 2.4, nosac: true });
    zamijeni(1);
    idi(tcpN, 'uzmi kućište s palete', () => { st.nosi = 'kuciste'; st.kucisteU = 'robot'; });
    idi(napravaT, 'odloži kućište u steznu napravu; naprava steže', () => { st.nosi = null; st.kucisteU = 'naprava'; });
    zamijeni(0);
    const g = gnijezda.find(x => x.puno) || gnijezda[0];
    idi(g, 'vakuumom uzmi PCB iz kutije', () => { g.puno = false; st.nosi = 'pcb'; });
    idi(kameraT, 'kamera provjerava orijentaciju PCB-a', null, 1.8);
    idi(napravaT, 'umetni PCB u kućište', () => { st.nosi = null; st.pcbU = true; });
    if (st.nOs > 0) {
      zamijeni(2);
      for (let i = 0; i < st.nOs; i++) {
        const c = { x: Os.x + 0.07, y: Os.y - 0.06 + i * 0.06 };
        idi(c, `uzmi osigurač iz cijevi ${i + 1}`, () => { st.osCijevi[i]--; st.nosi = 'os'; });
        idi(napravaT, `umetni osigurač ${i + 1}`, () => { st.nosi = null; st.osU++; });
      }
    }
    zamijeni(1);
    idi(napravaT, 'naprava otpušta; uzmi gotov izradak', () => { st.nosi = 'kuciste'; st.kucisteU = 'robot'; });
    idi(kameraT, 'kamera provjerava gotov izradak', null, 1.8);
    idi(tcpN, 'vrati izradak na paletu; OpEnd → sljedeći resurs ASRS', () => { st.nosi = null; st.kucisteU = 'paleta'; });
    L.push({ cilj: null, txt: 'zaustavljač se spušta, nosač odlazi', t: 2.4, odlazi: true });
    return L;
  }
  let PLAN = [];
  const kor = H('ol', { class: 'tcf-koraci tcf-koraci-g' });
  function crtajKorake() { kor.replaceChildren(...PLAN.map((p, i) => H('li', { tekst: p.txt, class: i === st.k ? 'tcf-akt' : i < st.k ? 'tcf-gotov' : null }))); const a = kor.children[st.k]; if (a && a.scrollIntoView && st.auto) { try { a.parentNode.scrollTop = a.offsetTop - a.parentNode.offsetTop - 40; } catch (e) { /* */ } } }
  function reset() { st.k = -1; st.alat = -1; st.nosi = null; st.kucisteU = 'paleta'; st.pcbU = false; st.osU = 0; st.tNos = 0; st.pos = { x: rb.x - 0.05, y: rb.y - 0.35 }; PLAN = koraci(); crtajKorake(); }
  function kreni(i) { st.k = i; st.u = 0; st.od = { ...st.pos }; st.ceka = false; crtajKorake(); if (PLAN[i]) ui.stanje(`${i + 1}. ${PLAN[i].txt}`, 'plavo'); }
  const blok = () => st.vrata || !st.kutija || st.potvrda;
  ctx.petlja(dt => {
    st.t += dt;
    if (st.k >= 0 && st.k < PLAN.length && !st.ceka) {
      if (blok()) {
        ui.stanje(st.vrata ? `Vrata ćelije su otvorena: dvokanalni prekidači (${D.upr.vrataRass.pl}, ${D.upr.vrataRass.kategorija}) zaustavljaju robot. Zatvori vrata i potvrdi (Reset).` : !st.kutija ? 'Nema kutije PCB u ćeliji → sigurnosni stop 1: robot se ne smije gibati.' : 'Vrata su zatvorena — za nastavak potvrdi tipkom Reset.', 'opas');
      } else {
        const p = PLAN[st.k];
        st.u = Math.min(1, st.u + dt / p.t);
        if (p.cilj) { const g = glatko(st.u); st.pos = { x: st.od.x + (p.cilj.x - st.od.x) * g, y: st.od.y + (p.cilj.y - st.od.y) * g }; }
        if (p.nosac) st.tNos = st.u; if (p.odlazi) st.tNos = 1 + st.u;
        if (st.u >= 1) {
          if (p.akcija) p.akcija();
          if (st.k === PLAN.length - 1) { st.ceka = true; st.auto = false; bA.osvjezi(); ui.stanje('Montaža je gotova: izradak ima tiskanu pločicu i ' + st.osU + ' osigurača. Nosač odlazi prema ASRS-u.', 'ok'); }
          else if (st.auto) kreni(st.k + 1); else st.ceka = true;
        }
      }
    }
    // crtanje
    trB.pomak(st.t * 20); trG.pomak(st.t * 20);
    const xn = st.tNos <= 1 ? B.x0 + (B.radniX - B.x0) * glatko(Math.min(1, st.tNos)) : B.radniX + (B.x1 - B.radniX) * glatko(st.tNos - 1);
    nos.postavi(P.X(xn), P.Y(B.y), 0);
    nos.stanje(st.kucisteU === 'paleta' ? (st.pcbU ? 'pcb' : 'paleta') : 'prazan');
    nos.style.display = st.k < 0 ? 'none' : '';
    const bx = P.X(rb.x), by = P.Y(rb.y), tx = P.X(st.pos.x), ty = P.Y(st.pos.y);
    const ex = bx + (tx - bx) * 0.52, ey = by + (ty - by) * 0.52;
    postavi(ruka1, { x1: bx, y1: by, x2: ex, y2: ey }); postavi(ruka2, { x1: ex, y1: ey, x2: tx, y2: ty });
    postavi(zglob, { cx: ex, cy: ey }); postavi(tcp, { cx: tx, cy: ty }); postavi(tcpT, { x: tx, y: ty + 5 });
    tcpT.textContent = st.alat >= 0 ? ALATI[st.alat][0] : '';
    tcp.classList.toggle('tcf-tcp-alat', st.alat >= 0);
    alati.forEach((a, i) => a.a.style.opacity = st.alat === i ? '0.15' : '1');
    nosiEl.style.display = st.nosi === 'kuciste' ? '' : 'none'; postavi(nosiEl, { x: tx - 11, y: ty + 10 });
    nosiPcb.style.display = st.nosi === 'pcb' ? '' : 'none'; postavi(nosiPcb, { x: tx - 9, y: ty + 10 });
    nosiOs.style.display = st.nosi === 'os' ? '' : 'none'; postavi(nosiOs, { cx: tx, cy: ty + 14 });
    naprava.classList.toggle('tcf-naprava-puna', st.kucisteU === 'naprava');
    gnijezda.forEach(g => g.r.style.opacity = g.puno ? '1' : '0.15');
    gKut.style.opacity = st.kutija ? '1' : '0.2';
    const p = PLAN[st.k];
    kamPolje.classList.toggle('tcf-kam-akt', !!(p && p.cilj === kameraT && st.u > 0.7));
    cijevi.forEach((c, i) => c.classList.toggle('tcf-cijev-prazna', st.osCijevi[i] <= 0));
    o.k(st.k < 0 ? '—' : `${st.k + 1} / ${PLAN.length}`); o.a(st.alat >= 0 ? `T${st.alat + 1} — ${ALATI[st.alat][1]}` : 'bez alata');
    o.p(gnijezda.filter(g => g.puno).length + ' / ' + gnijezda.length); o.c(st.osCijevi.join(' / '));
    return st.auto || (st.k >= 0 && !st.ceka);
  });
  const r = ui.red();
  const bA = ui.igraj(st, 'auto', 'Pokreni slijed', v => { if (v) { if (st.k < 0 || (st.k === PLAN.length - 1 && st.ceka)) { reset(); kreni(0); } else if (st.ceka) kreni(st.k + 1); } }, r);
  ui.gumb('Sljedeći korak', () => { st.auto = false; bA.osvjezi(); if (st.k < 0 || st.k === PLAN.length - 1) { reset(); kreni(0); } else kreni(st.k + 1); ctx.budi(); }, { tanki: true, u: r });
  ui.gumb('Na početak', () => { st.auto = false; bA.osvjezi(); reset(); ui.stanje('Ćelija čeka nosač.'); ctx.budi(); }, { tanki: true, u: r });
  ui.seg('Osigurača u nalogu', [[0, '0'], [1, '1'], [2, '2']], 2, n => { st.nOs = n; st.auto = false; bA.osvjezi(); reset(); ctx.budi(); });
  const r2 = ui.red();
  ui.kvacica('Vrata ćelije otvorena', false, v => { st.vrata = v; if (!v) st.potvrda = true; ctx.budi(); }, r2);
  ui.kvacica('Kutija PCB izvađena', false, v => { st.kutija = !v; ctx.budi(); }, r2);
  ui.gumb('Reset (potvrda)', () => { if (!st.vrata) { st.potvrda = false; ui.stanje('Potvrđeno: robot smije nastaviti.', 'ok'); ctx.budi(); } }, { tanki: true });
  ui.gumb('Napuni kutiju i cijevi', () => { gnijezda.forEach(g => g.puno = true); st.osCijevi = [10, 10, 10]; ctx.budi(); }, { tanki: true });
  ui.upr.append(kor);
  const o = ui.ocit([['k', 'Korak'], ['a', 'Alat na izmjenjivaču'], ['p', 'PCB u kutiji'], ['c', 'Osigurača u cijevima (pp)']]);
  reset(); ctx.budi();
  ui.stanje('Pritisni „Pokreni slijed” ili „Sljedeći korak”.');
}

/* =========================================================== 7. grananje */
function tGrananje(ui, ctx) {
  const PU = putevi(), R = D.konfig.raspored, MJ = D.mjere, K = PU.krakBRANCH;
  const P = tlocrt(1.12, 0.71, 380, 72, 8);
  const svg = ui.svg(600, 420, 'Tlocrt modula BRANCH: glavne trake, skretnica, krak s trakama 3 i 4, zaustavljači i senzori');
  S('rect', { x: 2, y: 2, width: 596, height: 416, rx: 10, class: 'tcf-graf' }, svg);
  const W = MJ.modul.sirina, Dd = MJ.modul.dubina;
  S('rect', { x: P.X(R.branch.x - W / 2), y: P.Y(R.branch.y + Dd / 2), width: W * P.s, height: Dd * P.s, rx: 6, class: 'tcf-modul' }, svg);
  T(svg, P.X(R.branch.x), P.Y(0.69) + 12, 'straga: HMI i aplikacijski modul (modul okrenut 180°)', 'tcf-ls', 'middle');
  const xA = P.X(R.branch.x - W / 2) - 2, xB = P.X(R.branch.x + W / 2) + 2;
  const tF = trakaPut(svg, `M${f1(xB)},${f1(P.Y(PU.yF))}H${f1(xA)}`, MJ.traka.sirina * P.s);
  const tB = trakaPut(svg, `M${f1(xA)},${f1(P.Y(PU.yB))}H${f1(xB)}`, MJ.traka.sirina * P.s);
  const tK = trakaPut(svg, putD(K, P), MJ.traka.sirina * P.s);
  T(svg, xB - 6, P.Y(PU.yF) - 22, '← glavna traka (od ASRS-a)', 'tcf-ls', 'end');
  T(svg, xA + 6, P.Y(PU.yB) - 22, 'glavna traka prema ASRS-u →', 'tcf-ls');
  const xOut = K.segmenti[0].a[0], xIn = K.segmenti[2].b[0], yEnd = PU.yEnd;
  T(svg, P.X(xOut) + 18, P.Y(-0.05), 'traka 3', 'tcf-ls'); T(svg, P.X(xIn) - 18, P.Y(-0.05), 'traka 4', 'tcf-ls', 'end');
  T(svg, P.X(xIn) - 18, P.Y(yEnd + 0.04), 'vrh kraka: predaja', 'tcf-ls', 'end');
  // zaustavljači
  const xG = xOut + 0.16, sK4 = K.L - 0.14;
  const zG = S('line', { x1: P.X(xG), y1: P.Y(PU.yF + 0.05), x2: P.X(xG), y2: P.Y(PU.yF - 0.05), class: 'tcf-zaust-t' }, svg);
  T(svg, P.X(xG) + 6, P.Y(PU.yF) + 32, 'zaust. grananja', 'tcf-ls');
  const t4 = tockaPuta(K, sK4);
  const z4 = S('line', { x1: P.X(t4.x - 0.05), y1: P.Y(t4.y), x2: P.X(t4.x + 0.05), y2: P.Y(t4.y), class: 'tcf-zaust-t' }, svg);
  T(svg, P.X(t4.x) - 26, P.Y(t4.y) + 5, 'zaust. trake 4', 'tcf-ls', 'end');
  const z1 = S('line', { x1: P.X(R.branch.x), y1: P.Y(PU.yB + 0.05), x2: P.X(R.branch.x), y2: P.Y(PU.yB - 0.05), class: 'tcf-zaust-t' }, svg);
  T(svg, P.X(R.branch.x) + 8, P.Y(PU.yB) + 32, 'zaust. trake 1 (aplikacija)', 'tcf-ls');
  // skretnica: krak oko zgloba
  const piv = { x: xOut - 0.04, y: PU.yF + 0.055 };
  const skr = S('line', { class: 'tcf-skretnica' }, svg);
  S('circle', { cx: P.X(piv.x), cy: P.Y(piv.y), r: 6, class: 'tcf-zglob' }, svg);
  T(svg, P.X(piv.x) - 8, P.Y(piv.y) - 8, 'skretnica', 'tcf-ls', 'end');
  // senzori
  const s30 = lampa(svg, P.X(xOut + 0.16), P.Y(-0.11), 'W1_BG30 ravno');
  const s31 = lampa(svg, P.X(xOut + 0.16), P.Y(-0.18), 'W1_BG31 krak');
  const s42 = lampa(svg, P.X(xOut + 0.16), P.Y(-0.25), 'BG42/BG45 područje');
  const podr = S('rect', { x: P.X(xIn - 0.1), y: P.Y(PU.yF + 0.06), width: (xOut - xIn + 0.22) * P.s, height: 0.12 * P.s, class: 'tcf-podrucje' }, svg);
  const gN = S('g', {}, svg);
  const st = { radi: false, nacin: 'rfid', udio: 0.5, kvar: false, skr: 0, skrCilj: 0, t: 0, pomak: 0, dol: 0, ravno: 0, krak: 0, id: 0 };
  let nos = [];
  const v = MJ.traka.brzinaSpora * 2;                 // prikaz ubrzan 2×
  const G = MJ.nosac.duljina + 0.04;
  function dodaj() {
    if (nos.some(n => n.put === 'g' && n.x > R.branch.x + W / 2 - G)) return;
    const uKrak = st.nacin === 'krak' || (st.nacin === 'rfid' && Math.random() < st.udio);
    const el = nosacOdozgo(gN, P.s); el.stanje(uKrak ? 'paleta' : 'prazan', uKrak ? 'K' : '');
    nos.push({ id: ++st.id, put: 'g', x: R.branch.x + W / 2 + 0.1, s: 0, uKrak, el });
  }
  const podrucjeZauzeto = () => st.kvar || nos.some(n => (n.put === 'g' && n.x < xG - 0.02 && n.x > xIn - 0.12) || (n.put === 'k' && (n.s < 0.12 || n.s > K.L - 0.06)));
  function korak(dt) {
    st.t += dt; st.pomak += v * dt * P.s;
    st.dol -= dt; if (st.dol <= 0) { dodaj(); st.dol = 2.2 + Math.random() * 1.6; }
    // skretnica
    const naZ = nos.find(n => n.put === 'g' && Math.abs(n.x - xG) < 0.004);
    if (naZ) { const treba = naZ.uKrak ? 1 : 0; if (st.skrCilj !== treba && !podrucjeZauzeto()) st.skrCilj = treba; }
    st.skr += Math.sign(st.skrCilj - st.skr) * Math.min(Math.abs(st.skrCilj - st.skr), dt / 0.6);
    // glavna traka (vožnja u −x)
    const gl = nos.filter(n => n.put === 'g').sort((a, b) => a.x - b.x);
    let iza = -Infinity;
    for (const n of gl) {
      let x1 = n.x - v * dt;
      x1 = Math.max(x1, iza + G);
      if (n.x >= xG - 0.0005 && x1 < xG) {
        const smije = (n.uKrak ? st.skr >= 0.999 : st.skr <= 0.001);
        if (!smije) x1 = xG;
      }
      // spajanje: ne ulazi u kritični odsječak dok se nosač iz kraka spaja
      if (n.x > xIn + G && x1 <= xIn + G && nos.some(m => m.put === 'k' && m.s > K.L - 0.06)) x1 = Math.max(x1, xIn + G);
      if (n.uKrak && n.x >= xOut && x1 < xOut) { n.put = 'k'; n.s = xOut - x1; st.krak++; continue; }
      n.x = x1; iza = n.x;
    }
    // krak
    const kr = nos.filter(n => n.put === 'k').sort((a, b) => b.s - a.s);
    let ispred = Infinity;
    for (const n of kr) {
      let s1 = Math.min(n.s + v * dt, ispred - G);
      if (n.s <= sK4 + 0.0005 && s1 > sK4) {
        const slobodno = !nos.some(m => m.put === 'g' && m.x > xIn - G && m.x < xIn + G + 0.05);
        if (!slobodno) s1 = sK4;
      }
      if (s1 >= K.L) { n.put = 'g'; n.x = xIn - (s1 - K.L); n.uKrak = false; n.el.stanje('paleta', ''); continue; }
      n.s = Math.max(n.s, s1); ispred = n.s;
    }
    nos = nos.filter(n => { if (n.put === 'g' && n.x < R.branch.x - W / 2 - 0.12) { n.el.remove(); if (!n.bioKrak) st.ravno++; return false; } return true; });
    for (const n of nos) if (n.put === 'k') n.bioKrak = true;
  }
  function crtaj() {
    for (const n of nos) {
      if (n.put === 'g') n.el.postavi(P.X(n.x), P.Y(PU.yF), Math.PI);
      else { const t = tockaPuta(K, n.s); n.el.postavi(P.X(t.x), P.Y(t.y), t.kut); }
    }
    tF.pomak(st.pomak); tB.pomak(st.pomak); tK.pomak(st.pomak);
    const a = -42 * st.skr * RAD, L = 0.17;
    postavi(skr, { x1: P.X(piv.x), y1: P.Y(piv.y), x2: P.X(piv.x + L * Math.cos(a)), y2: P.Y(piv.y + L * Math.sin(a)) });
    s30.upali(st.skr <= 0.001); s31.upali(st.skr >= 0.999);
    const zau = podrucjeZauzeto();
    s42.upali(!zau); s42.upali(zau, 'tcf-lampa-crv');
    podr.classList.toggle('tcf-podrucje-zauz', zau);
    o.r(String(st.ravno)); o.k(String(st.krak)); o.u(String(nos.filter(n => n.put === 'k').length));
    o.s(st.skr <= 0.001 ? 'ravno (W1_BG30)' : st.skr >= 0.999 ? 'krak (W1_BG31)' : 'zakreće se…', st.skr > 0.001 && st.skr < 0.999 ? 'upoz' : 'ok');
  }
  ctx.petlja(dt => { if (st.radi) { const n = Math.ceil(dt / 0.04); for (let i = 0; i < n; i++) korak(dt / n); } crtaj(); return st.radi; });
  const r1 = ui.red();
  ui.igraj(st, 'radi', 'Pokreni nosače', null, r1);
  ui.gumb('Dodaj nosač', () => { dodaj(); ctx.budi(); }, { tanki: true, u: r1 });
  ui.seg('Odluka o skretanju', [['rfid', 'Prema RFID-u'], ['ravno', 'Sve ravno'], ['krak', 'Sve u krak']], 'rfid', m => { st.nacin = m; });
  ui.klizac('Udio nosača s nalogom za krak', 0, 100, 10, 50, x => x + ' %', x => { st.udio = x / 100; });
  ui.kvacica('Kvar: senzor područja skretnice stalno javlja „zauzeto”', false, x => { st.kvar = x; ui.stanje(x ? 'Senzor područja javlja zauzeto: PLC ne smije zakretati skretnicu. Nosači s nalogom za krak čekaju na zaustavljaču grananja — iza njih stoji cijela traka.' : 'Senzor je ispravan.', x ? 'opas' : 'ok'); ctx.budi(); });
  const o = ui.ocit([['s', 'Skretnica'], ['r', 'Prošlo ravno'], ['k', 'Skrenulo u krak'], ['u', 'Nosača u kraku']]);
  ui.sitno('Nosači označeni s K imaju u RFID-u nalog za krak (npr. transport Robotinom). Prikaz je ubrzan 2×.');
  crtaj(); ctx.budi();
  ui.stanje('Pokreni nosače: skretnica se zakreće samo za nosače s nalogom za krak i samo kad je područje slobodno.');
}


/* =========================================================== 8. predaja Robotinu */
function tPredajaRobotinu(ui, ctx) {
  const PU = putevi(), MJ = D.mjere, K = PU.krakBRANCH;
  const P = tlocrt(0.75, 0.33, 270, 10, 4);
  const st = { smjer: 'daje', korak: -1, u: 0, auto: false, ceka: false, kvar: false, greska: false, t: 0 };
  const svg = ui.svg(600, 330, 'Pogled odozgo: vrh kraka BRANCH-a s trakama 3 i 4 i mobilni robot Robotino s prihvatom s dvije trake i preusmjerivačem; signali GF35 i KG35');
  S('rect', { x: 2, y: 2, width: 596, height: 326, rx: 10, class: 'tcf-graf' }, svg);
  const R = D.konfig.raspored, W = MJ.modul.sirina;
  S('rect', { x: P.X(R.branch.x - W / 2), y: P.Y(0.33) - 6, width: W * P.s, height: (0.33) * P.s + 6, class: 'tcf-modul' }, svg);
  T(svg, P.X(R.branch.x - W / 2) + 8, P.Y(0.1), 'BRANCH (isječak)', 'tcf-ls');
  const tPr = trakaPut(svg, `M${f1(P.X(R.branch.x + W / 2))},${f1(P.Y(PU.yF))}H${f1(P.X(R.branch.x - W / 2))}`, MJ.traka.sirina * P.s);
  const tK = trakaPut(svg, putD(K, P), MJ.traka.sirina * P.s);
  const xOut = K.segmenti[0].a[0], xIn = K.segmenti[2].b[0], yEnd = PU.yEnd, rk = K.segmenti[1].r, xc = (xOut + xIn) / 2;
  T(svg, P.X(xOut) + 16, P.Y(-0.12), 'traka 3', 'tcf-ls'); T(svg, P.X(xIn) - 16, P.Y(-0.12), 'traka 4', 'tcf-ls', 'end');
  // signali BRANCH-a (na prednjem rubu modula)
  const lx = P.X(xOut + 0.2);
  const gf = lampa(svg, lx, P.Y(0.135), 'GF35 %Q3.5 → Robotino', 6);
  const kg = lampa(svg, lx, P.Y(0.065), 'KG35 %I3.5 Robotino tu', 6);
  const zr1 = S('line', { class: 'tcf-hs-zraka' }, svg), zr2 = S('line', { class: 'tcf-hs-zraka' }, svg);
  // Robotino: lokalno u metrima, +y_l prema liniji (gore na zaslonu)
  const s = P.s, PH = 0.25;
  const gR = S('g', {}, svg);
  S('circle', { cx: 0, cy: 0, r: f1(0.235 * s), class: 'tcf-sasija' }, gR);
  S('rect', { x: f1(-0.11 * s), y: f1(-PH * s), width: f1(0.22 * s), height: f1(2 * PH * s), rx: 5, class: 'tcf-prihvat' }, gR);
  const rbB = trakaPut(gR, `M${f1(0.05 * s)},${f1(-0.24 * s)}V${f1(0.16 * s)}`, 0.06 * s);
  const rbA = trakaPut(gR, `M${f1(-0.05 * s)},${f1(0.16 * s)}V${f1(-0.24 * s)}`, 0.06 * s);
  S('path', { d: `M${f1(-0.09 * s)},${f1(0.16 * s)} A${f1(0.09 * s)},${f1(0.07 * s)} 0 0 0 ${f1(0.09 * s)},${f1(0.16 * s)}`, class: 'tcf-preusm' }, gR);
  T(gR, f1(-0.05 * s), f1(0.235 * s - 6), 'A', 'tcf-ls', 'middle'); T(gR, f1(0.05 * s), f1(0.235 * s - 6), 'B', 'tcf-ls', 'middle');
  const hsR = S('circle', { cx: f1(0.15 * s), cy: f1(-0.2 * s), r: 5, class: 'tcf-hs' }, gR);
  const bgN = S('circle', { cx: f1(0.15 * s), cy: f1(0.0), r: 5, class: 'tcf-lampa' }, gR);
  T(gR, f1(0.15 * s + 9), 5, 'senzor nosača', 'tcf-ls');
  T(svg, 10, 322, 'Robotino ' + D.moduli.robotino.oznaka, 'tcf-ls');
  const nos = nosacOdozgo(svg, P.s);
  nos.stanje('paleta');
  // slijedni dijagram
  const svg2 = ui.svg(600, 300, 'Slijedni dijagram signala između BRANCH-a i Robotina', 'tcf-svg2');
  const LB = 110, LR = 490;
  S('rect', { x: LB - 70, y: 6, width: 140, height: 30, rx: 6, class: 'tcf-blok' }, svg2); T(svg2, LB, 27, 'BRANCH (PLC)', 'tcf-l', 'middle');
  S('rect', { x: LR - 70, y: 6, width: 140, height: 30, rx: 6, class: 'tcf-blok' }, svg2); T(svg2, LR, 27, 'Robotino', 'tcf-l', 'middle');
  S('line', { x1: LB, y1: 36, x2: LB, y2: 296, class: 'tcf-zivotna' }, svg2); S('line', { x1: LR, y1: 36, x2: LR, y2: 296, class: 'tcf-zivotna' }, svg2);
  const gPor = S('g', {}, svg2);
  const kor = H('ol', { class: 'tcf-koraci' });
  const KORACI = () => {
    const daje = st.smjer === 'daje';
    return [
      ['Robotino prilazi naučenoj poziciji', 'r', 'r', 3, 'Fleet Manager je Robotinu dodijelio vožnju do BRANCH-a; Robotino vozi na naučenu poziciju ispred kraka.'],
      ['KG35 = 1: Robotino detektiran', 'r', 'b', 1.2, 'Prijemnik na BRANCH-u (KG35, ulaz %I3.5) vidi svjetlo Robotina: Robotino je na mjestu.'],
      [daje ? 'nosač stiže na vrh kraka' : 'krak je prazan, traka 4 spremna', 'b', 'b', daje ? 2.5 : 1.2, daje ? 'Skretnica je poslala nosač trakom 3; on čeka na vrhu kraka.' : 'BRANCH provjeri da u kraku nema nosača.'],
      ['GF35 = 1: BRANCH spreman', 'b', 'r', 1.2, 'BRANCH pali izlaz %Q3.5 (GF35): svjetlo prema Robotinu znači „spreman za prijenos”.'],
      [daje ? 'trake rade: nosač prelazi na Robotino' : 'trake rade: nosač prelazi u krak', 'b', 'r', 5, daje ? 'Traka 3 gura nosač na traku B Robotina, preusmjerivač ga prebaci na traku A, a A ga uvuče do kraja.' : 'Traka B vozi nosač do preusmjerivača, on ga prebaci na traku A, a A ga izdaje traci 4 BRANCH-a.'],
      [daje ? 'senzor Robotina: nosač na prihvatu' : 'nosač u kraku: trake staju', daje ? 'r' : 'b', daje ? 'b' : 'r', 1.2, daje ? 'Senzor nosača na Robotinu javlja nosač — trake staju, BRANCH gasi GF35.' : 'BRANCH vidi nosač na traci 4 — trake staju, GF35 se gasi.'],
      ['Robotino odlazi, KG35 = 0', 'r', 'r', 2.6, daje ? 'Robotino vozi nosač prema odredištu iz naloga.' : 'Robotino odlazi prazan (npr. na stanicu za punjenje).']
    ];
  };
  function crtajPoruke() {
    gPor.replaceChildren(); kor.replaceChildren();
    KORACI().forEach(([t, od, d], i) => {
      const y = 62 + i * 34, kl = i < st.korak ? 'tcf-por tcf-por-g' : i === st.korak ? 'tcf-por tcf-por-akt' : 'tcf-por';
      const g = S('g', { class: kl }, gPor);
      const x0 = od === 'b' ? LB : LR;
      if (od === d) { const sm = od === 'b' ? 1 : -1; S('path', { d: `M${x0},${y - 8} h${40 * sm} v14 h${-36 * sm}`, class: 'tcf-por-l' }, g); T(g, x0 + 50 * sm, y + 4, t, 'tcf-ls', sm > 0 ? 'start' : 'end'); }
      else { const x2 = od === 'b' ? LR : LB, sm = x2 > x0 ? -10 : 10; S('line', { x1: x0, y1: y, x2: x2 + sm, y2: y, class: 'tcf-por-l' }, g); S('polygon', { points: `${x2},${y} ${x2 + sm},${y - 5} ${x2 + sm},${y + 5}`, class: 'tcf-por-v' }, g); T(g, 300, y - 6, t, 'tcf-ls', 'middle'); }
      kor.append(H('li', { tekst: t, class: i === st.korak ? 'tcf-akt' : i < st.korak ? 'tcf-gotov' : null }));
    });
  }
  // točka na izlomljenoj crti [[x, y], …] za u ∈ [0, 1] → [x, y, kut]
  function poLiniji(L, u) {
    const d = [0];
    for (let i = 1; i < L.length; i++) d.push(d[i - 1] + Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]));
    const z = ogr(u, 0, 1) * d[d.length - 1];
    let i = 1; while (i < L.length - 1 && d[i] < z) i++;
    const t = d[i] > d[i - 1] ? (z - d[i - 1]) / (d[i] - d[i - 1]) : 0;
    return [L[i - 1][0] + (L[i][0] - L[i - 1][0]) * t, L[i - 1][1] + (L[i][1] - L[i - 1][1]) * t, Math.atan2(L[i][1] - L[i - 1][1], L[i][0] - L[i - 1][0])];
  }
  const yc = yEnd - MJ.branch.predaja.razmak - PH;             // središte Robotina pri pristajanju
  const sTip = K.segmenti[0].L, s4 = K.L - 0.14;
  function osvjezi() {
    const daje = st.smjer === 'daje', k = st.korak, u = st.u;
    let ry = yc, rf = 0;
    const ODM = 0.38;
    if (k < 0) { ry = yc - ODM; rf = 0.3; }
    else if (k === 0) { const g = glatko(u); ry = yc - ODM * (1 - g); rf = 0.3 * (1 - g); }
    else if (k === 6 && !st.greska) ry = yc - ODM * glatko(u);
    if (st.kvar && k >= 0 && k <= 1) rf = 0.2;
    gR.setAttribute('transform', `translate(${f1(P.X(xc))} ${f1(P.Y(ry))}) rotate(${f1(-rf / RAD)})`);
    const kgOn = k >= 1 && k <= 5 && !st.kvar ? 1 : 0, gfOn = k >= 3 && k <= 4 && !st.greska ? 1 : 0;
    kg.upali(kgOn); gf.upali(gfOn); hsR.classList.toggle('tcf-hs-on', !!kgOn);
    const hx = P.X(xc + 0.15), hy = P.Y(ry + 0.2);
    postavi(zr1, { x1: hx, y1: hy, x2: lx, y2: P.Y(0.065) }); zr1.style.display = kgOn ? '' : 'none';
    postavi(zr2, { x1: lx, y1: P.Y(0.135), x2: hx, y2: hy }); zr2.style.display = gfOn ? '' : 'none';
    const tr = k === 4 && !st.greska, pom = st.t * 40;
    [tK, rbA, rbB].forEach(r => r.pomak(tr ? pom : 0)); tPr.pomak(st.t * 20);
    // put nosača (tlocrt)
    const B_ul = [xc + 0.05, yc + 0.24], B_dno = [xc + 0.05, yc - 0.14], A_dno = [xc - 0.05, yc - 0.14], A_kraj = [xc - 0.05, yc + 0.06], B_kraj = [xc + 0.05, yc + 0.06];
    let x, y, kut, vid = k >= 0;
    if (daje) {
      if (k <= 1) vid = false;
      if (k === 2) { const t = tockaPuta(K, sTip * glatko(u)); x = t.x; y = t.y; kut = t.kut; }
      else if (k === 3) { const t = tockaPuta(K, sTip); x = t.x; y = t.y; kut = t.kut; }
      else if (k === 4) [x, y, kut] = poLiniji([[xOut, yEnd + rk], B_ul, B_dno, A_dno, A_kraj], glatko(u));
      else if (k >= 5) { x = A_kraj[0]; y = A_kraj[1] + (ry - yc); kut = Math.PI / 2; }
    } else {
      if (k <= 3) { x = B_kraj[0]; y = B_kraj[1] + (ry - yc); kut = -Math.PI / 2; }
      else if (k === 4) { const t4 = tockaPuta(K, s4); [x, y, kut] = poLiniji([B_kraj, B_dno, A_dno, [xc - 0.05, yc + PH], [xIn, yEnd + rk], [t4.x, t4.y]], glatko(u)); }
      else { const t = tockaPuta(K, s4); x = t.x; y = t.y; kut = t.kut; }
    }
    nos.style.display = vid ? '' : 'none';
    if (vid) nos.postavi(P.X(x), P.Y(y), kut);
    const naPrih = vid && y < yEnd - 0.02;
    bgN.classList.toggle('tcf-lampa-on', naPrih && Math.abs(x - (xc - 0.05)) < 0.06 && y > yc - 0.06 + (ry - yc));
    o.k(k < 0 ? '—' : `${k + 1} / 7`); o.kg(String(kgOn), kgOn ? 'ok' : ''); o.gf(String(gfOn), gfOn ? 'ok' : ''); o.t(tr ? 'rade' : 'stoje');
    o.z(hr(MJ.traka.visina * 1000, 0) + ' mm / ~1020 mm (obje pp)');
  }
  function kreni(i) { st.korak = i; st.u = 0; st.ceka = false; crtajPoruke(); const K2 = KORACI()[i]; if (K2) ui.stanje(`${i + 1}. ${K2[4]}`, 'plavo'); }
  ctx.petlja(dt => {
    st.t += dt;
    if (st.korak >= 0 && !st.ceka && !st.greska) {
      const K2 = KORACI()[st.korak];
      st.u = Math.min(1, st.u + dt / K2[3]);
      if (st.korak === 1 && st.kvar && st.u >= 1) {
        st.greska = true; st.auto = false; bA.osvjezi();
        ui.stanje('Robotino nije poravnat: KG35 ne vidi njegov signal. BRANCH ne pali GF35 i predaja ne počinje; Robotino javlja grešku i ponavlja pristajanje.', 'opas');
      } else if (st.u >= 1) {
        if (st.korak === 6) { st.ceka = true; st.auto = false; bA.osvjezi(); ui.stanje(st.smjer === 'daje' ? 'Predaja je gotova: nosač je na Robotinu.' : 'Preuzimanje je gotovo: nosač čeka na traci 4 i ide na glavnu traku.', 'ok'); }
        else if (st.auto) kreni(st.korak + 1); else st.ceka = true;
      }
    }
    osvjezi();
    return st.auto || (st.korak >= 0 && !st.ceka && !st.greska) || st.korak === 4;
  });
  const r = ui.red();
  const bA = ui.igraj(st, 'auto', 'Pokreni slijed', v => { if (v) { if (st.korak < 0 || st.greska || (st.korak === 6 && st.ceka)) { st.greska = false; kreni(0); } else if (st.ceka) kreni(st.korak + 1); } }, r);
  ui.gumb('Sljedeći korak', () => { st.auto = false; bA.osvjezi(); if (st.greska) return; if (st.korak < 0 || st.korak === 6) kreni(0); else kreni(st.korak + 1); ctx.budi(); }, { tanki: true, u: r });
  ui.gumb('Na početak', () => { st.auto = false; bA.osvjezi(); st.korak = -1; st.greska = false; st.ceka = false; crtajPoruke(); ui.stanje('Robotino čeka nalog.'); ctx.budi(); }, { tanki: true, u: r });
  ui.seg('Smjer', [['daje', 'BRANCH → Robotino'], ['prima', 'Robotino → BRANCH']], 'daje', v => { st.smjer = v; st.korak = -1; st.greska = false; st.auto = false; bA.osvjezi(); crtajPoruke(); ui.stanje(v === 'daje' ? 'Nosač iz kraka prelazi na Robotino.' : 'Robotino vraća nosač u krak.'); ctx.budi(); });
  ui.kvacica('Kvar: Robotino nije poravnat (KG35 ne javlja)', false, v => { st.kvar = v; ctx.budi(); });
  ui.upr.append(kor);
  const o = ui.ocit([['k', 'Korak'], ['kg', 'KG35 %I3.5 (Robotino tu)'], ['gf', 'GF35 %Q3.5 (signal Robotinu)'], ['t', 'Trake'], ['z', 'Visina: linija / prihvat']]);
  ui.sitno('Handshake ima samo jedan bit u svakom smjeru — dovoljno da se strane dogovore „tu sam” / „kreni”. Pristajanje i odlazak vodi Fleet Manager.');
  crtajPoruke(); osvjezi(); ui.stanje('Pritisni „Pokreni slijed” ili „Sljedeći korak”.'); ctx.budi();
}

/* =========================================================== 9. MES nalozi */
function tMesNalozi(ui, ctx) {
  const M = D.mes, RES = M.resursi;
  const svc = n => { const s = M.servisi.find(x => x.naziv === n); return s ? `${s.naziv} (${s.kod})` : n; };
  // plan rada iz scenarija: koraci koji imaju operaciju
  const PLAN = D.scenarij.koraci.filter(k => 'opNo' in k).map((k, i) => ({ step: (i + 1) * 10, res: k.resurs, opNo: k.opNo, naziv: k.naslov }));
  const svg = ui.svg(620, 250, 'Struktura naloga u MES4: nalog, pozicija, plan rada, koraci s operacijama i resursima');
  S('rect', { x: 2, y: 2, width: 616, height: 246, rx: 10, class: 'tcf-graf' }, svg);
  const blok = (x, y, w, h, t1, t2, kl) => { const g = S('g', { class: 'tcf-rb' + (kl ? ' ' + kl : '') }, svg); S('rect', { x, y, width: w, height: h, rx: 6 }, g); T(g, x + 8, y + 20, t1, 'tcf-l'); if (t2) T(g, x + 8, y + 40, t2, 'tcf-ls'); return g; };
  const bN = blok(12, 14, 150, 50, 'Nalog', 'ONo —');
  const bP = blok(12, 84, 150, 50, 'Pozicija', 'OPos 1, PNo ' + D.materijal.paleta.mesPNo);
  const bW = blok(12, 154, 150, 50, 'Plan rada', 'WPNo 1');
  S('path', { d: 'M87,64 V84 M87,134 V154', class: 'tcf-vod-r' }, svg);
  T(svg, 12, 236, 'MES4 u pregledniku', 'tcf-ls');
  const bS = PLAN.map((p, i) => {
    const y = 14 + i * 62, g = blok(200, y, 404, 52, `StepNo ${p.step}: ${p.res.toUpperCase()} (Res ${RES[p.res] ?? '—'})`, `OpNo ${opNo(p.opNo)} · ${p.naziv}`, p.opNo == null ? 'tcf-isk' : '');
    S('path', { d: `M162,179 H182 V${y + 26} H200`, class: 'tcf-vod-r' }, svg);
    return g;
  });
  // slijedni dijagram PLC ↔ MES
  const svg2 = ui.svg(620, 330, 'Slijedni dijagram poruka između PLC-a stanice i MES4: status na portu 2001, servisi na portu 2000', 'tcf-svg2');
  const LP = 110, LM = 510;
  S('rect', { x: LP - 80, y: 6, width: 160, height: 32, rx: 6, class: 'tcf-blok' }, svg2);
  const tPLC = T(svg2, LP, 27, 'PLC stanice', 'tcf-l', 'middle');
  S('rect', { x: LM - 80, y: 6, width: 160, height: 32, rx: 6, class: 'tcf-blok' }, svg2); T(svg2, LM, 27, 'MES4', 'tcf-l', 'middle');
  S('line', { x1: LP, y1: 38, x2: LP, y2: 326, class: 'tcf-zivotna' }, svg2); S('line', { x1: LM, y1: 38, x2: LM, y2: 326, class: 'tcf-zivotna' }, svg2);
  T(svg2, 310, 54, `status → port ${M.portovi.status}, ${M.statusPeriod === 1 ? 'svake sekunde' : 'svakih ' + M.statusPeriod + ' s'}`, 'tcf-ls', 'middle');
  const hb = S('circle', { cx: LP, cy: 62, r: 5, class: 'tcf-paket' }, svg2);
  const hbLamp = lampa(svg2, 560, 58, '', 6);
  const gPor = S('g', {}, svg2);
  const paket = S('circle', { r: 6, class: 'tcf-paket tcf-paket-s' }, svg2);
  const st = { nalog: null, step: 0, poruke: [], anim: null, red: [], t: 0, hb: true, hbT: 0, bez: 0, veza: true, res: 'asrs', fields: {}, carrier: 3, rfid: null };
  const red = [];               // poruke koje čekaju animaciju
  function poruka(od, txt, polja, nakon) { red.push({ od, txt, polja, nakon }); ctx.budi(); }
  function crtajPoruke() {
    gPor.replaceChildren();
    st.poruke.slice(-7).forEach((p, i) => {
      const y = 92 + i * 33, g = S('g', { class: 'tcf-por tcf-por-g' + (p.zadnja ? ' tcf-por-akt' : '') }, gPor);
      const x1 = p.od === 'p' ? LP : LM, x2 = p.od === 'p' ? LM : LP, sm = x2 > x1 ? -10 : 10;
      S('line', { x1, y1: y, x2: x2 + sm, y2: y, class: 'tcf-por-l' }, g);
      S('polygon', { points: `${x2},${y} ${x2 + sm},${y - 5} ${x2 + sm},${y + 5}`, class: 'tcf-por-v' }, g);
      T(g, 310, y - 6, p.txt, 'tcf-ls', 'middle');
    });
  }
  function telegram(p) { for (const k in p) st.fields[k] = p[k]; for (const k of ['ResourceID', 'ONo', 'OPos', 'WPNo', 'StepNo', 'OpNo', 'CarrierID', 'PNo']) tg[k](st.fields[k] == null ? '—' : String(st.fields[k])); }
  function osvjeziPlan() {
    bN.querySelectorAll('text')[1].textContent = st.nalog ? 'ONo ' + st.nalog : 'ONo —';
    bS.forEach((g, i) => { g.classList.toggle('tcf-akt', !!st.nalog && i === st.step); g.classList.toggle('tcf-gotov-b', !!st.nalog && i < st.step); });
    [bN, bP, bW].forEach(g => g.classList.toggle('tcf-akt', !!st.nalog && st.step < PLAN.length));
  }
  function novi() {
    if (st.nalog && st.step < PLAN.length) { ui.stanje('Nalog ' + st.nalog + ' još nije gotov.', 'upoz'); return; }
    st.nalog = (st.nalog || 1000) + 1; st.step = 0; st.rfid = null;
    ui.stanje(`Korisnik je u pregledniku napravio nalog; MES4 je dodijelio ONo ${st.nalog} i plan rada s ${PLAN.length} koraka. (PLC može nalog napraviti i servisom ${svc('SetNewOrder')}.)`, 'plavo');
    osvjeziPlan(); telegram({ ONo: st.nalog, OPos: 1, WPNo: 1, StepNo: PLAN[0].step, OpNo: PLAN[0].opNo, ResourceID: null, CarrierID: null, PNo: D.materijal.paleta.mesPNo });
  }
  function nosac(res) {
    if (red.length || st.anim) return;
    const rid = RES[res];
    tPLC.textContent = 'PLC ' + res.toUpperCase() + ' (Res ' + rid + ')';
    if (!st.veza && res === 'asrs') { ui.stanje(`Veza ASRS-a s MES-om je zatvorena (nema statusa ${M.statusTimeout} s). PLC ne može pitati MES; nosač čeka ili prolazi bez operacije.`, 'opas'); return; }
    const prazan = !st.rfid;
    const kor = st.nalog && st.step < PLAN.length ? PLAN[st.step] : null;
    if (prazan) poruka('p', svc('GetFirstOpForRsc'), { ResourceID: rid, CarrierID: st.carrier, ONo: null, OPos: null });
    else poruka('p', svc('GetOpForONoOPos'), { ResourceID: rid, CarrierID: st.carrier, ONo: st.rfid.ONo, OPos: 1 });
    const ima = kor && kor.res === res && (prazan ? st.step === 0 : st.rfid.res === res);
    if (!ima) {
      poruka('m', 'nema operacije za ovaj resurs', { OpNo: null }, () => ui.stanje(`MES nema operaciju za ${res.toUpperCase()}: zaustavljač se spušta i nosač prolazi.` + (kor ? ` Sljedeći korak naloga čeka resurs ${kor.res.toUpperCase()}.` : ' Nema otvorenog naloga.'), 'upoz'));
      return;
    }
    poruka('m', `OpNo ${opNo(kor.opNo)}, ONo ${st.nalog}, StepNo ${kor.step}`, { ONo: st.nalog, OPos: 1, StepNo: kor.step, OpNo: kor.opNo });
    poruka('p', svc('OpStart'), {}, () => ui.stanje(`${res.toUpperCase()} izvodi operaciju ${opNo(kor.opNo)} (${kor.naziv}).` + (kor.opNo == null ? ' OpNo nije objavljen — u laboratoriju ga pročitaj u MES4 (Operations).' : ''), 'plavo'));
    poruka('p', svc('OpEnd'), {});
    poruka('m', 'potvrda; sljedeći korak upisan u RFID', {}, () => {
      st.step++;
      const sl = PLAN[st.step];
      st.rfid = sl ? { ONo: st.nalog, res: sl.res } : null;
      telegram(sl ? { StepNo: sl.step, OpNo: sl.opNo } : { StepNo: null, OpNo: null });
      osvjeziPlan();
      ui.stanje(sl ? `Na RFID nosača upisano: sljedeći resurs ${sl.res.toUpperCase()} (Res ${RES[sl.res]}), operacija ${opNo(sl.opNo)}. Zaustavljač se spušta.` : `Nalog ${st.nalog} je gotov; paleta je spremljena, MES ažurira zalihu.`, 'ok');
    });
  }
  ctx.petlja(dt => {
    st.t += dt;
    // status (heartbeat)
    st.hbT += dt;
    if (st.hb) { st.bez = 0; if (!st.veza) { st.veza = true; ui.stanje('Status ASRS-a ponovno stiže: MES otvara vezu.', 'ok'); } }
    else { st.bez += dt; if (st.veza && st.bez > M.statusTimeout) { st.veza = false; ui.stanje(`Od ASRS-a ${M.statusTimeout} s nije stigao status: MES zatvara vezu. Stanica više ne dobiva operacije.`, 'opas'); } }
    const f = (st.hbT % M.statusPeriod) / M.statusPeriod;
    hb.setAttribute('cx', f1(LP + (LM - LP) * f)); hb.style.display = st.hb ? '' : 'none';
    hbLamp.upali(st.veza); hbLamp.upali(!st.veza, 'tcf-lampa-crv');
    o.v(st.veza ? 'otvorena' : 'zatvorena', st.veza ? 'ok' : 'opas'); o.b(st.hb ? '—' : hr(st.bez, 1) + ' s', st.hb ? '' : 'upoz');
    // poruke
    if (!st.anim && red.length) { st.anim = red.shift(); st.anim.u = 0; }
    if (st.anim) {
      const a = st.anim; a.u += dt / 0.9;
      const x1 = a.od === 'p' ? LP : LM, x2 = a.od === 'p' ? LM : LP, y = 92 + Math.min(st.poruke.length, 6) * 33;
      postavi(paket, { cx: x1 + (x2 - x1) * Math.min(1, a.u), cy: y }); paket.style.display = '';
      if (a.u >= 1) {
        st.poruke.forEach(p => p.zadnja = false);
        st.poruke.push({ od: a.od, txt: a.txt, zadnja: true }); crtajPoruke(); telegram(a.polja || {});
        if (a.nakon) a.nakon();
        st.anim = null;
      }
    } else paket.style.display = 'none';
    return true;
  });
  const r1 = ui.red();
  ui.gumb('Novi nalog', () => novi(), { u: r1 });
  ui.gumb('Očisti dijagram', () => { st.poruke = []; crtajPoruke(); }, { tanki: true, u: r1 });
  ui.podnaslov = H('p', { class: 'tcf-podnaslov', tekst: 'Nosač stiže na zaustavljač' }); ui.upr.append(ui.podnaslov);
  const r2 = ui.red();
  for (const res of ['asrs', 'branch', 'rass']) ui.gumb(res.toUpperCase(), () => nosac(res), { tanki: true, u: r2, aria: 'Nosač stiže na zaustavljač stanice ' + res.toUpperCase() });
  ui.kvacica(`ASRS šalje status (port ${M.portovi.status})`, true, v => { st.hb = v; ctx.budi(); });
  const o = ui.ocit([['v', 'Veza ASRS ↔ MES'], ['b', 'Bez statusa']]);
  ui.ocitP.append(H('h4', { class: 'tcf-podnaslov', tekst: 'Polja zadnjeg telegrama' }));
  const tg = ui.ocit([['ResourceID', 'ResourceID'], ['ONo', 'ONo'], ['OPos', 'OPos'], ['WPNo', 'WPNo'], ['StepNo', 'StepNo'], ['OpNo', 'OpNo'], ['CarrierID', 'CarrierID'], ['PNo', 'PNo']]);
  ui.sitno(`Polja sučelja [MES-IF]: ${M.polja.join(', ')}. Brojevi StepNo (10, 20, 30) su primjer.`);
  osvjeziPlan(); telegram({}); crtajPoruke(); ctx.budi();
  ui.stanje('Pritisni „Novi nalog”, pa redom nosač na ASRS, RASS i ponovno ASRS.');
}

/* =========================================================== 10. PLC i HMI */
function tPlcHmi(ui, ctx) {
  const U = D.upr, MO = D.moduli;
  const svg = ui.svg(620, 360, 'Mreža linije: MES računalo i tri stanice, u svakoj preklopnik Scalance, PLC, HMI, RFID čvor i uređaji stanice');
  S('rect', { x: 2, y: 2, width: 616, height: 356, rx: 10, class: 'tcf-graf' }, svg);
  const ured = [];
  const opisi = {};
  function uredjaj(id, x, y, w, h, t1, t2, opis) {
    const g = S('g', { class: 'tcf-rb' }, svg);
    S('rect', { x, y, width: w, height: h, rx: 5 }, g);
    T(g, x + w / 2, y + (t2 ? 17 : 21), t1, 'tcf-ls', 'middle'); if (t2) T(g, x + w / 2, y + 33, t2, 'tcf-ls', 'middle');
    opisi[id] = opis; ured.push({ id, g, x: x + w / 2, y: y + h / 2, top: y, bot: y + h });
    klikabilno(ctx, g, t1, () => odaberi(id));
    return ured[ured.length - 1];
  }
  const ST = [['rass', 'RASS', 26], ['branch', 'BRANCH', 222], ['asrs', 'ASRS32', 418]];
  const mes = uredjaj('mes', 238, 12, 144, 40, 'MES računalo', 'MES4, preglednik', `${D.mes.sustav}. Prima status svake sekunde (port ${D.mes.portovi.status}) i servisne pozive (port ${D.mes.portovi.servis}).`);
  const vodovi = [], sw = {}, devs = {};
  for (const [k, naziv, x] of ST) {
    S('rect', { x, y: 74, width: 176, height: 276, rx: 8, class: 'tcf-stanica-o' }, svg);
    T(svg, x + 8, 92, naziv, 'tcf-lb');
    sw[k] = uredjaj(k + 'Sw', x + 22, 102, 132, 40, 'Scalance XB008', '8 priključaka', `${U.preklopnik.tip}: neupravljivi preklopnik; spaja uređaje stanice i dalje susjednu stanicu i MES.`);
    const d = [uredjaj(k + 'Plc', x + 8, 162, 76, 48, 'PLC', '1512SP F', `${U.plc.tip} — ${U.plc.opis}. I/O: ${MO[k].io}.`),
      uredjaj(k + 'Hmi', x + 92, 162, 76, 48, 'HMI', 'TP700', `${U.hmi.tip}: stanje, poruke, ručni rad (Setup), postavke MES IP i Resource ID.`),
      uredjaj(k + 'Rfid', x + 8, 224, 76, 48, 'RFID', 'TBEN-S2', 'Turck TBEN-S2-2RFID-4DXP: čvor s dvije glave za čitanje i pisanje tagova nosača.')];
    if (k === 'asrs') d.push(uredjaj('asrsServo', x + 92, 224, 76, 48, 'CMMP-AS', 'osi X i Z', 'Dva servo regulatora Festo CMMP-AS-C2-3A-M3 (PROFINET) za motore EMMS-AS osi X i Z [IP-ASRS].'));
    if (k === 'rass') d.push(uredjaj('rassRobot', x + 92, 224, 76, 48, 'upravljač', 'robota', 'Upravljač robota razmjenjuje signale s PLC-om stanice (za inačicu R15 objavljeno 15 DI / 5 DO robota) [IP-RASS]. Tip upravljača KUKA inačice nije potvrđen.'));
    if (k === 'branch') d.push(uredjaj('branchApl', x + 92, 224, 76, 48, 'aplikacijski', 'modul', 'Aplikacijski modul CP-AM na prednjoj liniji; tip nije utvrđen, pa ni način povezivanja.'));
    devs[k] = d;
    // sabirnice: lijevi stupac uređaja spaja se lijevo, desni desno, pa gore do preklopnika
    d.forEach((u, j) => { u.str = j % 2 === 0 ? x + 4 : x + 172; u.rub = j % 2 === 0 ? u.x - 38 : u.x + 38; });
    S('path', { d: `M${x + 4},248 V152 H${x + 172} V248 M${f1(sw[k].x)},152 V${f1(sw[k].bot)}`, class: 'tcf-mreza-v' }, svg);
    for (const u of d) S('path', { d: `M${f1(u.rub)},${f1(u.y)} H${f1(u.str)}`, class: 'tcf-mreza-v' }, svg);
    S('rect', { x: x + 8, y: 286, width: 160, height: 54, rx: 5, class: 'tcf-io-p' }, svg);
    const io = (MO[k].io || '').match(/(\d+)\s*DI\s*\/\s*(\d+)\s*DO/);
    const di = io ? +io[1] : 0, dO = io ? +io[2] : 0;
    T(svg, x + 14, 303, `I/O: ${di} DI / ${dO} DO`, 'tcf-ls');
    S('rect', { x: x + 14, y: 310, width: Math.min(150, di * 4), height: 8, rx: 2, class: 'tcf-bar-di' }, svg);
    S('rect', { x: x + 14, y: 322, width: Math.min(150, dO * 4), height: 8, rx: 2, class: 'tcf-bar-do' }, svg);
  }
  // lanac preklopnika: MES — RASS — BRANCH — ASRS (pretpostavka)
  const lanac = [
    S('path', { d: `M${mes.x - 72},${mes.y} H${sw.rass.x} V${sw.rass.top}`, class: 'tcf-mreza-l' }, svg),
    S('path', { d: `M${sw.rass.x + 66},${sw.rass.y} H${sw.branch.x - 66}`, class: 'tcf-mreza-l' }, svg),
    S('path', { d: `M${sw.branch.x + 66},${sw.branch.y} H${sw.asrs.x - 66}`, class: 'tcf-mreza-l' }, svg)
  ];
  const prekid = S('g', { class: 'tcf-prekid' }, svg);
  S('path', { d: `M${(sw.branch.x + sw.asrs.x) / 2 - 7},${sw.branch.y - 9} l14,18 M${(sw.branch.x + sw.asrs.x) / 2 + 7},${sw.branch.y - 9} l-14,18`, class: 'tcf-prekid-x' }, prekid);
  // paketi
  const gP = S('g', {}, svg);
  const st = { prekid: false, bez: 0, veza: true, t: 0, odabran: null, radi: true };
  const paketi = [];
  const doSw = (u, k) => [[u.rub, u.y], [u.str, u.y], [u.str, 152], [sw[k].x, 152], [sw[k].x, sw[k].bot]];
  function put(a, b, k) { return doSw(a, k).concat(doSw(b, k).reverse()); }
  function putMes(k) { const L = doSw(devs[k][0], k); L.push([sw[k].x, sw[k].y]); const ord = ['asrs', 'branch', 'rass']; for (let i = ord.indexOf(k); i < ord.length; i++) { L.push([sw[ord[i]].x, sw[ord[i]].y]); } L.push([sw.rass.x, mes.y]); L.push([mes.x - 72, mes.y]); return L; }
  function salji(L, kl, trajanje) { const el = S('circle', { r: 4.5, class: 'tcf-paket ' + kl }, gP); paketi.push({ L, el, u: 0, tr: trajanje }); }
  let tPn = 0, tSt = 0;
  // PLC ciklus (drugi crtež)
  const svg2 = ui.svg(620, 120, 'Ciklus PLC-a: čitanje ulaza, program, pisanje izlaza', 'tcf-svg2');
  const fz = [['čitaj ulaze', 30], ['program + F-program', 230], ['piši izlaze', 430]];
  const fzb = fz.map(([t, x]) => { const g = S('g', { class: 'tcf-rb' }, svg2); S('rect', { x, y: 30, width: 170, height: 46, rx: 6 }, g); T(g, x + 85, 58, t, 'tcf-ls', 'middle'); return g; });
  S('path', { d: 'M200,53 H230 M400,53 H430 M600,53 V88 H15 V53 H30', class: 'tcf-vod-r' }, svg2);
  T(svg2, 300, 110, 'ciklus se ponavlja (reda veličine milisekundi)', 'tcf-ls', 'middle');
  ctx.petlja(dt => {
    st.t += dt; tPn += dt; tSt += dt;
    if (tPn > 0.25) { tPn = 0; for (const [k] of ST) for (const u of devs[k]) if (u.id.endsWith('Hmi') ? Math.random() < 0.3 : true) { if (u === devs[k][0]) continue; salji(put(devs[k][0], u, k), 'tcf-paket-pn', 0.6); } }
    // jednostavno: PROFINET između PLC-a i uređaja preko preklopnika
    if (tSt > 1) { tSt = 0; for (const [k] of ST) { if (st.prekid && k === 'asrs') continue; salji(putMes(k), 'tcf-paket-s', 1.6); } }
    if (st.prekid) { st.bez += dt; if (st.veza && st.bez > D.mes.statusTimeout) { st.veza = false; ui.stanje(`ASRS ${D.mes.statusTimeout} s ne šalje status: MES zatvara vezu. ASRS i dalje radi lokalno (Default način), ali ne dobiva MES operacije.`, 'opas'); } }
    for (let i = paketi.length - 1; i >= 0; i--) {
      const p = paketi[i]; p.u += dt / p.tr;
      if (p.u >= 1) { p.el.remove(); paketi.splice(i, 1); continue; }
      const d = [0]; for (let j = 1; j < p.L.length; j++) d.push(d[j - 1] + Math.hypot(p.L[j][0] - p.L[j - 1][0], p.L[j][1] - p.L[j - 1][1]));
      const z = p.u * d[d.length - 1]; let j = 1; while (j < p.L.length - 1 && d[j] < z) j++;
      const t = d[j] > d[j - 1] ? (z - d[j - 1]) / (d[j] - d[j - 1]) : 0;
      postavi(p.el, { cx: p.L[j - 1][0] + (p.L[j][0] - p.L[j - 1][0]) * t, cy: p.L[j - 1][1] + (p.L[j][1] - p.L[j - 1][1]) * t });
    }
    const f = Math.floor((st.t * 3) % 3); fzb.forEach((g, i) => g.classList.toggle('tcf-akt', i === f));
    prekid.style.display = st.prekid ? '' : 'none'; lanac[2].classList.toggle('tcf-mreza-pr', st.prekid);
    o.v(st.veza ? 'otvorena' : 'zatvorena', st.veza ? 'ok' : 'opas'); o.b(st.prekid ? hr(st.bez, 1) + ' s' : '—');
    return true;
  });
  function odaberi(id) { st.odabran = id; ured.forEach(u => u.g.classList.toggle('tcf-akt-o', u.id === id)); opis.textContent = opisi[id]; }
  ui.kvacica('Prekid spojnog kabela BRANCH – ASRS', false, v => { st.prekid = v; st.bez = 0; if (!v) { st.veza = true; ui.stanje('Kabel je spojen: status ASRS-a opet stiže, MES otvara vezu.', 'ok'); } else ui.stanje('Kabel je prekinut: paketi ASRS-a ne stižu do MES-a. PROFINET unutar ASRS-a radi dalje.', 'upoz'); ctx.budi(); });
  const r1 = ui.red();
  ui.gumb('PLC ASRS', () => odaberi('asrsPlc'), { tanki: true, u: r1 }); ui.gumb('Servo regulatori', () => odaberi('asrsServo'), { tanki: true, u: r1 }); ui.gumb('MES', () => odaberi('mes'), { tanki: true, u: r1 });
  const o = ui.ocit([['v', 'Veza ASRS ↔ MES'], ['b', 'ASRS bez statusa']]);
  const opis = ui.sitno('Klikni uređaj na crtežu za opis.');
  ui.sitno('Tirkizne točke: ciklički PROFINET IO unutar stanice. Narančaste: status prema MES-u (TCP/IP) jednom u sekundi.');
  ctx.budi(); ui.stanje('Mreža radi: svaka stanica šalje status MES-u, a PLC ciklički razmjenjuje podatke sa svojim uređajima.');
}

/* =========================================================== 11. sigurnosni krug */
function tSigurnosniKrug(ui, ctx) {
  const SL = D.upr.sigurnosniLanac, red = SL.redoslijed;
  const svg = ui.svg(620, 360, 'Sigurnosni lanac linije: dva kanala kroz gljive nužnog stopa svih stanica, sigurnosni releji, vrata ćelije RASS-a i tipka Reset');
  S('rect', { x: 2, y: 2, width: 616, height: 356, rx: 10, class: 'tcf-graf' }, svg);
  const X0 = 20, SW = 190;
  const st = { gljiva: red.map(() => false), vrata: false, kutija: true, kvar: false, relej: 'ON', robot: 'ON', t: 0, potvrdaRobot: false };
  const gl = [], kan = [[], []], rel = [], akt = [];
  red.forEach((r, i) => {
    const x = X0 + i * (SW + 10);
    S('rect', { x, y: 44, width: SW, height: 300, rx: 8, class: 'tcf-stanica-o' }, svg);
    T(svg, x + 10, 64, r.modul.toUpperCase(), 'tcf-lb'); T(svg, x + SW - 10, 64, r.konektor, 'tcf-ls tcf-konektor', 'end');
    // gljiva
    const g = S('g', {}, svg);
    S('circle', { cx: x + 46, cy: 168, r: 26, class: 'tcf-zuta-p' }, g);
    const c = S('circle', { cx: x + 46, cy: 168, r: 17, class: 'tcf-gljiva' }, g);
    T(svg, x + 46, 212, 'nužni stop', 'tcf-ls', 'middle');
    S('path', { d: `M${x + 62},152 L${x + 111},${120}`, class: 'tcf-veza-m' }, svg);
    for (const yy of [92, 128]) { S('line', { x1: x + 150, y1: yy, x2: x + 150, y2: 168, class: 'tcf-veza-m' }, svg); }
    klikabilno(ctx, g, 'Gljiva nužnog stopa ' + r.modul.toUpperCase(), () => { st.gljiva[i] = !st.gljiva[i]; ctx.budi(); });
    gl.push({ g, c });
    // kontakti kanala 1 i 2
    for (let k = 0; k < 2; k++) {
      const y = 92 + k * 36;
      const kt = S('line', { x1: x + 96, y1: y, x2: x + 126, y2: y, class: 'tcf-kontakt' }, svg);
      kan[k].push(kt);
    }
    // relej
    const rg = S('g', { class: 'tcf-rb' }, svg); S('rect', { x: x + 100, y: 168, width: 84, height: 44, rx: 5 }, rg); T(rg, x + 142, 187, 'sig. relej', 'tcf-ls', 'middle'); T(rg, x + 142, 204, r.modul === 'rass' ? 'UE410, Flexi' : 'UE410', 'tcf-ls', 'middle');
    rel.push(rg);
    // aktuatori (trake)
    const tr = trakaPut(svg, `M${x + 14},${262}H${x + SW - 14}`, 14);
    T(svg, x + 14, 290, 'trake, zaustavljači, ventili', 'tcf-ls');
    akt.push(tr);
  });
  function zadnjaX() { return (red.length - 1) * (SW + 10); }
  // vodiči kanala kroz lanac
  for (let k = 0; k < 2; k++) {
    const y = 92 + k * 36;
    T(svg, 6, y - 6, 'K' + (k + 1), 'tcf-ls');
    red.forEach((r, i) => {
      const x = X0 + i * (SW + 10);
      S('line', { x1: i === 0 ? 8 : x - 10, y1: y, x2: x + 96, y2: y, class: 'tcf-kanal-v' }, svg);
      S('line', { x1: x + 126, y1: y, x2: x + SW + (i === red.length - 1 ? 8 : 0), y2: y, class: 'tcf-kanal-v' }, svg);
    });
  }
  T(svg, 10, 28, 'START', 'tcf-ls'); T(svg, 610, 28, 'END', 'tcf-ls', 'end');
  const premostenje = S('path', { d: `M${X0 + zadnjaX() + 92},128 v12 h38 v-12`, class: 'tcf-kvar-l' }, svg);
  // vrata i robot RASS-a
  const iR = red.findIndex(r => r.modul === 'rass');
  const xr = X0 + Math.max(0, iR) * (SW + 10);
  const vrata = S('rect', { x: xr + 110, y: 222, width: 64, height: 22, rx: 3, class: 'tcf-vrata' }, svg);
  T(svg, xr + 142, 238, 'vrata', 'tcf-ls', 'middle');
  const robot = S('circle', { cx: xr + 150, cy: 312, r: 12, class: 'tcf-robot-baza' }, svg);
  const robotT = T(svg, xr + 14, 318, 'robot', 'tcf-ls');
  const resetL = lampa(svg, 560, 24, '', 8);
  T(svg, 546, 29, 'Reset', 'tcf-ls', 'end');
  const zadnja = red.length - 1;
  const kanal2 = () => st.gljiva.every((g, i) => !g || (st.kvar && i === zadnja));
  function logika() {
    const k1 = st.gljiva.every(g => !g);
    const k2 = kanal2();
    if (k1 !== k2) st.relej = 'KVAR';
    else if (!k1 && st.relej === 'ON') st.relej = 'OFF';
    // robot
    if (st.relej !== 'ON' || st.vrata) { if (st.robot === 'ON') st.robot = 'STOP'; }
    return { k1, k2 };
  }
  ctx.petlja(dt => {
    st.t += dt;
    const { k1, k2 } = logika();
    gl.forEach((g, i) => g.c.classList.toggle('tcf-gljiva-p', st.gljiva[i]));
    red.forEach((r, i) => {
      kan[0][i].setAttribute('y2', st.gljiva[i] ? 84 : 92); kan[0][i].classList.toggle('tcf-kontakt-o', st.gljiva[i]);
      kan[1][i].setAttribute('y2', st.gljiva[i] ? 120 : 128); kan[1][i].classList.toggle('tcf-kontakt-o', st.gljiva[i]);
      rel[i].classList.toggle('tcf-akt', st.relej === 'ON'); rel[i].classList.toggle('tcf-vruce', st.relej === 'KVAR');
      const radi = st.relej === 'ON' && !(r.modul === 'rass' && false);
      akt[i].pomak(radi ? st.t * 30 : 0); akt[i].classList.toggle('tcf-traka-stoji', !radi);
    });
    premostenje.style.display = st.kvar ? '' : 'none';
    vrata.classList.toggle('tcf-vrata-otv', st.vrata);
    const rOK = st.robot === 'ON' && st.kutija;
    robot.classList.toggle('tcf-robot-stop', !rOK); robotT.textContent = 'robot: ' + (rOK ? 'radi' : !st.kutija && st.robot === 'ON' ? 'sigurnosni stop 1' : 'stoji');
    const trebaReset = (st.relej === 'OFF' && k1 && k2) || (st.relej === 'ON' && st.robot === 'STOP' && !st.vrata);
    resetL.upali(trebaReset && Math.floor(st.t * 2) % 2 === 0);
    o.k1(k1 ? 'zatvoren' : 'otvoren', k1 ? 'ok' : 'opas'); o.k2(k2 ? 'zatvoren' : 'otvoren', k2 ? 'ok' : 'opas');
    o.r({ ON: 'uključen', OFF: 'isključen — čeka Reset', KVAR: 'KVAR (kanali se ne slažu)' }[st.relej], st.relej === 'ON' ? 'ok' : st.relej === 'KVAR' ? 'opas' : 'upoz');
    o.l(st.relej === 'ON' ? 'pod energijom' : 'bez energije', st.relej === 'ON' ? 'ok' : 'opas');
    return true;
  });
  const r1 = ui.red();
  ui.gumb('Reset', () => {
    const k1 = st.gljiva.every(g => !g), k2 = kanal2();
    if (st.relej === 'KVAR') { if (!st.kvar && k1 && k2) { st.relej = 'ON'; st.robot = st.vrata ? 'STOP' : 'ON'; ui.stanje('Kvar je uklonjen i oba kanala su zatvorena: Reset je prihvaćen.', 'ok'); } else ui.stanje('Relej je u kvaru: kanali se ne slažu. Ukloni kvar, otpusti gljive i ponovi Reset.', 'opas'); }
    else if (!k1) ui.stanje('Gljiva je još pritisnuta: lanac je otvoren i Reset se ne prihvaća.', 'upoz');
    else { st.relej = 'ON'; if (!st.vrata) st.robot = 'ON'; ui.stanje(st.vrata ? 'Linija je uključena, ali vrata ćelije su otvorena: robot RASS-a stoji.' : 'Reset prihvaćen: linija i robot su pod energijom.', st.vrata ? 'upoz' : 'ok'); }
    ctx.budi();
  }, { u: r1, kl: 'tcf-g-reset' });
  ui.gumb('Otpusti sve gljive', () => { st.gljiva = st.gljiva.map(() => false); ui.stanje('Gljive su otpuštene — linija i dalje stoji dok ne pritisneš Reset.', 'upoz'); ctx.budi(); }, { tanki: true, u: r1 });
  const r2 = ui.red();
  red.forEach((r, i) => ui.gumb('Gljiva ' + r.modul.toUpperCase(), () => { st.gljiva[i] = !st.gljiva[i]; ui.stanje(st.gljiva[i] ? `Pritisnut nužni stop na ${r.modul.toUpperCase()}: oba kanala se otvaraju, svi aktuatori na liniji ostaju bez energije.` : 'Gljiva je otpuštena; za ponovno pokretanje potreban je Reset.', st.gljiva[i] ? 'opas' : 'upoz'); ctx.budi(); }, { tanki: true, u: r2 }));
  ui.kvacica(`Vrata ćelije RASS-a otvorena (${D.upr.vrataRass.pl}, ${D.upr.vrataRass.kategorija})`, false, v => { st.vrata = v; ui.stanje(v ? 'Vrata otvorena: dvokanalni prekidači zaustavljaju robot. Trake linije rade dalje (pojednostavljenje).' : 'Vrata zatvorena — robot se ne pokreće sam; potreban je Reset.', v ? 'opas' : 'upoz'); ctx.budi(); });
  ui.kvacica('Kutija PCB izvađena iz ćelije RASS-a', false, v => { st.kutija = !v; ui.stanje(v ? 'Nema kutije u ćeliji: robot je u sigurnosnom stopu 1.' : 'Kutija je umetnuta.', v ? 'upoz' : 'ok'); ctx.budi(); });
  ui.kvacica('Kvar: kratki spoj u kanalu 2 (zadnja stanica)', false, v => { st.kvar = v; ui.stanje(v ? 'Kanal 2 je premošten. Dok se ništa ne pritisne, kvar se ne vidi — pritisni gljivu zadnje stanice: kanal 1 se otvori, kanal 2 ne, a relej otkrije nesklad.' : 'Premoštenje je uklonjeno.', v ? 'upoz' : 'ok'); ctx.budi(); });
  const o = ui.ocit([['k1', 'Kanal 1'], ['k2', 'Kanal 2'], ['r', 'Sigurnosni releji'], ['l', 'Aktuatori linije']]);
  ui.sitno('Klikni gljivu na crtežu ili gumb. Lampica Reset treperi kad je lanac zatvoren i čeka potvrdu.');
  ctx.budi(); ui.stanje('Linija radi. Pritisni bilo koju gljivu nužnog stopa.');
}

/* =========================================================== 12. načini rada */
function tNacinRada(ui, ctx) {
  const N = D.upr.nacini;
  // tablica parametra 1 (Default) iz teksta u podacima
  function tablicaDefault() {
    const m = /parametar 1:\s*(.*?);\s*parametar 2/i.exec(D.mes.defaultParametri || '');
    if (!m) return [];
    const L = [];
    for (const dio of m[1].split(';')) {
      const q = /^\s*([\d/]+)\s*=\s*(.+)$/.exec(dio); if (!q) continue;
      const kodovi = q[1].split('/'), opis = q[2].trim();
      if (kodovi.length === 1) { L.push({ kod: kodovi[0], opis }); continue; }
      const r = /^(\S+)\s+(.*)$/.exec(opis), glag = r ? r[1].split('/') : [], ost = r ? r[2] : '';
      kodovi.forEach((k, i) => L.push({ kod: k, opis: (glag[i] || glag[0] || '') + ' ' + ost }));
    }
    return L;
  }
  const TAB = tablicaDefault();
  const svg = ui.svg(620, 220, 'Dijagram stanja načina rada stanice: isključeno, Reset, spremno, Setup, Automatic (Default ili MES), Cycle end');
  S('rect', { x: 2, y: 2, width: 616, height: 216, rx: 10, class: 'tcf-graf' }, svg);
  const cvor = {};
  const blok = (id, x, y, w, h, t1, t2) => { const g = S('g', { class: 'tcf-rb' }, svg); S('rect', { x, y, width: w, height: h, rx: 8 }, g); T(g, x + w / 2, y + (t2 ? 19 : 26), t1, 'tcf-l', 'middle'); if (t2) T(g, x + w / 2, y + 37, t2, 'tcf-ls', 'middle'); cvor[id] = g; return g; };
  S('rect', { x: 190, y: 14, width: 270, height: 124, rx: 10, class: 'tcf-okvir-auto' }, svg);
  T(svg, 200, 34, 'Automatic', 'tcf-lb');
  blok('isk', 14, 20, 140, 44, 'isključeno');
  blok('reset', 14, 92, 140, 44, 'Reset', 'početno stanje');
  blok('spremno', 14, 164, 140, 44, 'spremno', 'čeka izbor');
  blok('setup', 190, 164, 150, 44, 'Setup', 'ručni rad');
  blok('default', 204, 60, 116, 52, 'Default', 'RFID + tablica');
  blok('mes', 330, 60, 116, 52, 'MES', 'odluka MES4');
  blok('cycle', 476, 60, 132, 52, 'Cycle end', 'dovrši i stani');
  // prijelazi (crta + glava strelice na kraju)
  for (const L of [[[84, 64], [84, 92]], [[84, 136], [84, 164]], [[154, 186], [190, 186]], [[154, 172], [176, 120], [204, 98]], [[446, 86], [476, 86]], [[542, 112], [542, 196], [340, 196]], [[214, 164], [214, 152], [120, 152], [120, 164]]]) {
    S('path', { d: 'M' + L.map(t => t.join(',')).join(' L'), class: 'tcf-vod-r' }, svg);
    const [a, b] = L.slice(-2), k = Math.atan2(b[1] - a[1], b[0] - a[0]);
    S('polygon', { points: [[b[0], b[1]], [b[0] - 9 * Math.cos(k) + 5 * Math.sin(k), b[1] - 9 * Math.sin(k) - 5 * Math.cos(k)], [b[0] - 9 * Math.cos(k) - 5 * Math.sin(k), b[1] - 9 * Math.sin(k) + 5 * Math.cos(k)]].map(t => t.map(f1).join(',')).join(' '), class: 'tcf-glava-v' }, svg);
  }
  // mala stanica
  const svg2 = ui.svg(620, 170, 'ASRS: zaustavljač ST1 s nosačem i portal; odluka o operaciji', 'tcf-svg2');
  const tr = trakaPut(svg2, 'M600,130H20', 16);
  S('rect', { x: 300, y: 138, width: 8, height: 14, class: 'tcf-zaust' }, svg2);
  T(svg2, 312, 160, 'ST1', 'tcf-ls');
  const gNos = S('g', {}, svg2);
  S('rect', { x: -26, y: -8, width: 52, height: 8, rx: 2, class: 'tcf-nosac' }, gNos);
  const nPal = S('rect', { x: -22, y: -12, width: 44, height: 4, class: 'tcf-paleta' }, gNos);
  const gPor = S('g', {}, svg2);
  S('rect', { x: -6, y: 0, width: 12, height: 70, class: 'tcf-stup' }, gPor);
  S('rect', { x: -20, y: 68, width: 40, height: 8, rx: 2, class: 'tcf-kolica' }, gPor);
  const porPal = S('rect', { x: -18, y: 78, width: 36, height: 4, class: 'tcf-paleta' }, gPor);
  const porC = T(gPor, 26, 80, 'C 0°', 'tcf-ls');
  const odl = T(svg2, 20, 28, '', 'tcf-l');
  const odl2 = T(svg2, 20, 50, '', 'tcf-ls');
  const st = { nap: false, stanje: 'isk', nacin: 'auto', izvor: 'default', par: TAB.length ? TAB[TAB.length - 3]?.kod || TAB[0].kod : '', mesOk: true, t: 0, tS: 0, nos: null, x: 560, z: 0, c: 0, hv: false, porPal: false, ceka: false };
  const prijelaz = (s2, txt, vr) => { st.stanje = s2; st.tS = 0; if (txt) ui.stanje(txt, vr); osvjeziGumbe(); ctx.budi(); };
  function odluka() {
    if (st.izvor === 'default') {
      const r = TAB.find(x => x.kod === st.par);
      if (!r) return { akcija: null, tekst: 'nema zapisa u tablici' };
      const drugi = /zaustavljač\s*2/.test(r.opis), izd = /izdaj/.test(r.opis), spr = /spremi/.test(r.opis);
      return { akcija: drugi ? null : izd ? 'izdaj' : spr ? 'spremi' : null, tekst: `parametar 1 = ${r.kod}: ${r.opis}` + (drugi ? ' → nije za ST1, nosač prolazi' : '') };
    }
    if (!st.mesOk) return { akcija: 'ceka', tekst: 'MES nije dostupan: PLC ne dobiva odgovor, nosač čeka' };
    return { akcija: 'izdaj', tekst: `MES4: ${opisOp(212)} (servis ${(D.mes.servisi.find(s => s.naziv === 'GetOpForONoOPos') || {}).naziv || ''})` };
  }
  ctx.petlja(dt => {
    st.t += dt; st.tS += dt;
    if (st.stanje === 'reset') { st.x += (560 - st.x) * Math.min(1, dt * 3); st.z += (0 - st.z) * Math.min(1, dt * 3); st.c = 0; if (st.tS > 2.4) prijelaz('spremno', 'Stanica je u početnom stanju (osi referencirane, zaustavljači gore). Odaberi način.', 'ok'); }
    const radi = st.stanje === 'default' || st.stanje === 'mes' || st.stanje === 'cycle';
    if (st.nos) {
      const n = st.nos;
      if (n.faza === 'vozi') { if (radi) n.x -= 60 * dt; if (n.x <= 304) { n.x = 304; n.faza = 'odluka'; n.t = 0; } }
      else if (n.faza === 'odluka') {
        n.t += dt;
        if (n.t > 0.8) { const o2 = odluka(); n.odl = o2; odl.textContent = o2.tekst; odl2.textContent = st.izvor === 'default' ? 'odluku donosi PLC iz RFID-a (bez MES-a)' : 'PLC pita MES preko porta ' + D.mes.portovi.servis; n.faza = o2.akcija === 'ceka' ? 'ceka' : o2.akcija ? 'op' : 'pusti'; n.t = 0; }
      } else if (n.faza === 'ceka') { if (st.mesOk) n.faza = 'odluka'; }
      else if (n.faza === 'op') {
        n.t += dt;
        const izd = n.odl.akcija === 'izdaj';
        st.x = 304 + 240 * (1 - Math.min(1, n.t / 1.2)) * (n.t < 1.2 ? 1 : 0) + (n.t > 2.4 ? 240 * Math.min(1, (n.t - 2.4) / 1.2) : 0);
        st.porPal = izd ? n.t < 1.8 : n.t >= 1.8 && n.t < 3.6;
        if (n.t >= 1.8) n.pal = izd;
        if (n.t > 3.6) { n.faza = 'pusti'; st.porPal = false; }
      } else if (n.faza === 'pusti') { n.x -= 60 * dt; if (n.x < -40) { st.nos = null; if (st.stanje === 'cycle') prijelaz('spremno', 'Cycle end: ciklus je dovršen, zaustavljači su gore, trake stoje.', 'ok'); } }
    } else if (st.stanje === 'cycle') prijelaz('spremno', 'Cycle end: nema započetog ciklusa — stanica staje odmah.', 'ok');
    // crtanje
    for (const k in cvor) cvor[k].classList.toggle('tcf-akt', k === st.stanje || (k === 'default' && st.stanje === 'default') || (k === 'mes' && st.stanje === 'mes'));
    if (st.nos) { gNos.setAttribute('transform', `translate(${f1(st.nos.x)} 122)`); gNos.style.display = ''; nPal.style.display = st.nos.pal ? '' : 'none'; } else gNos.style.display = 'none';
    gPor.setAttribute('transform', `translate(${f1(st.x)} ${f1(30 + st.z)})`);
    porPal.style.display = st.porPal ? '' : 'none'; porC.textContent = 'C ' + hr(st.c, 0) + '°';
    tr.pomak(radi || st.stanje === 'setup' ? st.t * 30 : 0);
    o.s({ isk: 'isključeno', reset: 'Reset u tijeku', spremno: 'spremno', setup: 'Setup (ručno)', default: 'Automatic — Default', mes: 'Automatic — MES', cycle: 'Cycle end' }[st.stanje]);
    o.l(st.stanje === 'cycle' ? 'svijetli crveno' : radi ? 'svijetli' : '—');
    return st.stanje === 'reset' || !!st.nos || st.stanje === 'setup' || radi;
  });
  const r1 = ui.red();
  ui.kvacica('Glavna sklopka uključena', false, v => { st.nap = v; if (!v) { st.nos = null; prijelaz('isk', 'Stanica je bez napona.'); } else ui.stanje('Napon je uključen. Pritisni Reset.'); osvjeziGumbe(); }, r1);
  const r2 = ui.red();
  const bReset = ui.gumb('Reset', () => { if (!st.nap) return; if (st.stanje === 'default' || st.stanje === 'mes') { ui.stanje('U automatskom radu najprije Cycle end.', 'upoz'); return; } prijelaz('reset', 'Reset: osi se referenciraju, zaustavljači se dižu, trake staju.', 'plavo'); }, { u: r2 });
  const bStart = ui.gumb('Start', () => {
    if (st.stanje !== 'spremno') { ui.stanje('Start je moguć samo iz stanja „spremno” (nakon Reseta).', 'upoz'); return; }
    if (st.nacin === 'setup') prijelaz('setup', 'Setup: aktuatori se pokreću ručno, jedan po jedan.', 'plavo');
    else prijelaz(st.izvor, st.izvor === 'default' ? 'Automatic — Default: svaka stanica radi po RFID-u nosača i tablici prijelaza.' : 'Automatic — MES: operacije dodjeljuje MES4.', 'ok');
  }, { tanki: true, u: r2 });
  const bCyc = ui.gumb('Cycle end', () => { if (st.stanje === 'default' || st.stanje === 'mes') prijelaz('cycle', 'Cycle end: stanica dovršava započeti ciklus pa staje.', 'upoz'); else if (st.stanje === 'setup') prijelaz('spremno', 'Setup je završen.'); }, { tanki: true, u: r2 });
  ui.seg('Način', [['setup', 'Setup'], ['auto', 'Automatic']], 'auto', v => { st.nacin = v; osvjeziGumbe(); });
  ui.seg('Automatic', [['default', 'Default'], ['mes', 'MES']], 'default', v => { st.izvor = v; if (st.stanje === 'default' || st.stanje === 'mes') { st.stanje = v; ui.stanje(v === 'mes' ? 'Prebačeno na MES: odluke daje MES4.' : 'Prebačeno na Default: odluke iz RFID-a.'); } });
  const r3 = ui.red();
  const bNos = ui.gumb('Nosač na ST1', () => { if (st.nos) return; st.nos = { x: 640, faza: 'vozi', pal: false, t: 0 }; const o2 = TAB.find(x => x.kod === st.par); if (o2 && /spremi/.test(o2.opis) && st.izvor === 'default') st.nos.pal = true; ctx.budi(); }, { u: r3 });
  ui.kvacica('MES računalo nedostupno', false, v => { st.mesOk = !v; ctx.budi(); }, r3);
  if (TAB.length) ui.seg('Default: parametar 1 na RFID-u nosača', TAB.map(x => [x.kod, x.kod]), st.par, v => { st.par = v; const r = TAB.find(x => x.kod === v); ui.stanje('Parametar 1 = ' + v + ': ' + (r ? r.opis : '') + '.'); });
  ui.upr.append(H('p', { class: 'tcf-podnaslov', tekst: 'Setup — ručne naredbe (kao na HMI-ju ASRS-a)' }));
  const r4 = ui.red();
  const rucno = [
    ui.gumb('X ←', () => { st.x = Math.max(80, st.x - 40); }, { tanki: true, u: r4, aria: 'Os X lijevo' }),
    ui.gumb('X →', () => { st.x = Math.min(580, st.x + 40); }, { tanki: true, u: r4, aria: 'Os X desno' }),
    ui.gumb('Z ↑', () => { st.z = Math.max(-20, st.z - 10); }, { tanki: true, u: r4, aria: 'Os Z gore' }),
    ui.gumb('Z ↓', () => { st.z = Math.min(20, st.z + 10); }, { tanki: true, u: r4, aria: 'Os Z dolje' }),
    ui.gumb('Okreni 0°/180°', () => { st.c = st.c ? 0 : 180; }, { tanki: true, u: r4 }),
    ui.gumb('Prihvatnica', () => { st.porPal = !st.porPal; }, { tanki: true, u: r4 })
  ];
  rucno.forEach(b => b.addEventListener('click', () => ctx.budi()));
  function osvjeziGumbe() {
    const s2 = st.stanje;
    bReset.disabled = !st.nap; bStart.disabled = !st.nap; bCyc.disabled = !(s2 === 'default' || s2 === 'mes' || s2 === 'setup');
    bNos.disabled = !(s2 === 'default' || s2 === 'mes');
    rucno.forEach(b => { b.disabled = s2 !== 'setup'; });
  }
  const o = ui.ocit([['s', 'Stanje stanice'], ['l', 'Lampica tipke']]);
  ui.sitno('Načini [MAN-ASRS]: ' + N.map(x => x.naziv).join(', ') + '. Tablica Default načina: ' + (TAB.length ? TAB.map(x => x.kod + ' = ' + x.opis).join('; ') : D.mes.defaultParametri) + '.');
  osvjeziGumbe(); ctx.budi();
  ui.stanje('Uključi glavnu sklopku, pa Reset i Start.');
}

/* =========================================================== 13. pneumatika */
function tPneumatika(ui, ctx) {
  const pNom = D.moduli.asrs.tlak * 10, Y = D.mjere.asrs.os;
  const AKT = {
    asrs: [['Os Y (DGC-18-140)', 'lin'], ['Os C (DRQD-B-20-180)', 'rot'], ['Prihvatnica (HGPT-20)', 'hv'], ['Zaustavljač ST1', 'zau']],
    branch: [['Skretnica (zakretni cilindar)', 'rot'], ['Zaustavljač grananja', 'zau'], ['Zaustavljač trake 1', 'zau'], ['Zaustavljač trake 4', 'zau']],
    rass: [['Zaustavljač radnog položaja', 'zau'], ['Indekser trake za kutije', 'lin'], ['Stezna naprava', 'lin'], ['Vakuum prihvatnice PCB (Venturi)', 'vak']]
  };
  const svg = ui.svg(620, 330, 'Pneumatska shema stanice: kompresor, pripremna jedinica s manometrom, ventilski otok i aktuatori');
  S('rect', { x: 2, y: 2, width: 616, height: 326, rx: 10, class: 'tcf-graf' }, svg);
  // kompresor, priprema
  const gK = S('g', {}, svg);
  S('circle', { cx: 46, cy: 168, r: 26, class: 'tcf-kompresor' }, gK);
  const kKr = S('path', { d: 'M46,150 L60,176 L32,176Z', class: 'tcf-kompresor-t' }, gK);
  T(svg, 46, 214, 'kompresor', 'tcf-ls', 'middle');
  const dovod = S('path', { d: 'M72,168 H112', class: 'tcf-cijev' }, svg);
  const dovodT = S('path', { d: 'M72,168 H112', class: 'tcf-zrak' }, svg);
  S('rect', { x: 112, y: 140, width: 56, height: 56, rx: 6, class: 'tcf-blok' }, svg);
  T(svg, 140, 132, 'priprema', 'tcf-ls', 'middle'); T(svg, 140, 236, 'filtar + regulator', 'tcf-ls', 'middle');
  S('circle', { cx: 140, cy: 168, r: 18, class: 'tcf-manometar' }, svg);
  const igla = S('line', { x1: 140, y1: 168, x2: 140, y2: 154, class: 'tcf-igla' }, svg);
  const pT = T(svg, 140, 264, '', 'tcf-lb', 'middle');
  S('path', { d: 'M168,168 H206', class: 'tcf-cijev' }, svg);
  const dovod2 = S('path', { d: 'M168,168 H206', class: 'tcf-zrak' }, svg);
  T(svg, 222, 22, 'ventili', 'tcf-ls', 'middle');
  const gV = S('g', {}, svg), gA = S('g', {}, svg);
  const st = { mod: 'asrs', p: pNom, pMreza: pNom, komp: true, t: 0, akt: [], greska: '' };
  function izgradi() {
    gV.replaceChildren(); gA.replaceChildren();
    st.akt = AKT[st.mod].map(([naziv, tip], i) => {
      const y = 36 + i * 72;
      const a = { naziv, tip, poz: 0, cilj: 0, y, tGr: 0 };
      const v = S('g', {}, gV);
      S('rect', { x: 206, y: y + 6, width: 34, height: 46, rx: 4, class: 'tcf-ventil-b' }, v);
      a.vb = S('rect', { x: 210, y: y + 10, width: 26, height: 18, rx: 2, class: 'tcf-ventil' }, v);
      S('rect', { x: 210, y: y + 30, width: 26, height: 18, rx: 2, class: 'tcf-ventil tcf-ventil-2' }, v);
      klikabilno(ctx, v, 'Ventil: ' + naziv, () => { a.cilj = a.cilj ? 0 : 1; a.tGr = 0; st.greska = ''; ctx.budi(); });
      S('path', { d: `M206,168 V${y + 29}`, class: 'tcf-cijev tcf-cijev-t' }, gV);
      a.l1 = S('path', { d: `M240,${y + 19} H${tip === 'zau' ? 310 : 300}`, class: 'tcf-cijev' }, gA);
      a.l2 = S('path', { d: `M240,${y + 39} H${tip === 'zau' ? 310 : 300}`, class: 'tcf-cijev' }, gA);
      a.z1 = S('path', { d: `M240,${y + 19} H300`, class: 'tcf-zrak' }, gA);
      a.z2 = S('path', { d: `M240,${y + 39} H300`, class: 'tcf-zrak' }, gA);
      const g = S('g', { transform: `translate(300 ${y})` }, gA);
      T(g, 0, 0, naziv, 'tcf-ls');
      if (tip === 'lin') {
        S('rect', { x: 0, y: 10, width: 140, height: 38, rx: 4, class: 'tcf-cil' }, g);
        a.klip = S('rect', { y: 12, width: 10, height: 34, class: 'tcf-klip' }, g);
        a.sipka = S('rect', { y: 25, height: 8, width: 130, class: 'tcf-sipka' }, g);
      } else if (tip === 'rot') {
        S('circle', { cx: 40, cy: 30, r: 22, class: 'tcf-cil' }, g);
        a.kaz = S('line', { x1: 40, y1: 30, x2: 62, y2: 30, class: 'tcf-sipka-l' }, g);
        T(g, 72, 34, '0° / 180°', 'tcf-ls');
      } else if (tip === 'hv') {
        S('rect', { x: 10, y: 14, width: 60, height: 14, rx: 3, class: 'tcf-cil' }, g);
        a.c1 = S('rect', { y: 28, width: 8, height: 22, class: 'tcf-sipka' }, g); a.c2 = S('rect', { y: 28, width: 8, height: 22, class: 'tcf-sipka' }, g);
        S('rect', { x: 28, y: 36, width: 24, height: 6, class: 'tcf-paleta' }, g);
      } else if (tip === 'zau') {
        S('rect', { x: 14, y: 22, width: 30, height: 30, rx: 3, class: 'tcf-cil' }, g);
        a.klin = S('rect', { x: 25, width: 8, height: 26, rx: 2, class: 'tcf-zaust' }, g);
        g.querySelector('text').setAttribute('x', '150'); g.querySelector('text').setAttribute('y', '20');
        S('rect', { x: 0, y: 14, width: 120, height: 6, class: 'tcf-remen-b' }, g);
        T(g, 52, 46, 'jednoradni s oprugom (pretp.)', 'tcf-ls');
      } else if (tip === 'vak') {
        S('rect', { x: 0, y: 14, width: 60, height: 18, rx: 3, class: 'tcf-cil' }, g); T(g, 66, 28, 'ejektor', 'tcf-ls');
        S('path', { d: 'M20,32 v6 l-8,8 h36 l-8,-8 v-6', class: 'tcf-cil' }, g);
        a.pcb = S('rect', { x: 8, width: 44, height: 5, class: 'tcf-pcb' }, g);
        a.ispuh = S('path', { d: 'M60,23 h40', class: 'tcf-zrak' }, g);
      }
      a.sen = lampa(g, tip === 'zau' ? 140 : -12, tip === 'zau' ? 15 : -5, '', 5);
      return a;
    });
  }
  const A_y = Math.PI * 0.018 * 0.018 / 4, hod = Y.yHod;
  ctx.petlja(dt => {
    st.t += dt;
    // tlak mreže
    if (st.komp) st.pMreza += (pNom + 1 - st.pMreza) * Math.min(1, dt * 1.5); else st.pMreza *= Math.exp(-dt / 3);
    const p = Math.min(st.p, st.pMreza);
    const pMin = 2;
    for (const a of st.akt) {
      const tHod = a.tip === 'rot' ? Y.tC : a.tip === 'hv' ? Y.tHvat : a.tip === 'zau' ? 0.3 : Y.tY;
      const k = p > pMin ? Math.min(1.2, (p - pMin) / (pNom - pMin)) : 0;
      if (a.tip === 'zau' && a.cilj === 0) a.poz = Math.max(0, a.poz - dt / 0.3);       // opruga vraća klin gore
      else a.poz += Math.sign(a.cilj - a.poz) * Math.min(Math.abs(a.cilj - a.poz), dt * k / tHod);
      if (Math.abs(a.cilj - a.poz) > 0.001) { a.tGr += dt; if (a.tGr > 2 && !st.greska) { st.greska = a.naziv; ui.stanje(`PLC: „${a.naziv}” nije stigao u krajnji položaj u zadanom vremenu (senzor ne javlja). Uzrok: premali tlak.`, 'opas'); } } else a.tGr = 0;
      // crtanje
      const tece1 = a.cilj === 1 && p > 0.3, tece2 = a.cilj === 0 && p > 0.3 && a.tip !== 'zau' && a.tip !== 'vak';
      a.z1.style.display = tece1 ? '' : 'none'; a.z2.style.display = tece2 ? '' : 'none';
      a.z1.style.strokeDashoffset = f1(-st.t * 40); a.z2.style.strokeDashoffset = f1(-st.t * 40);
      a.vb.classList.toggle('tcf-ventil-on', a.cilj === 1);
      a.sen.upali(a.poz > 0.99 || a.poz < 0.01);
      if (a.tip === 'lin') { const x = 4 + a.poz * 120; a.klip.setAttribute('x', f1(x)); a.sipka.setAttribute('x', f1(x + 10)); }
      else if (a.tip === 'rot') { const k2 = a.poz * Math.PI; postavi(a.kaz, { x2: 40 + 22 * Math.cos(k2), y2: 30 - 22 * Math.sin(k2) }); }
      else if (a.tip === 'hv') { a.c1.setAttribute('x', f1(18 + a.poz * 8)); a.c2.setAttribute('x', f1(54 - a.poz * 8)); }
      else if (a.tip === 'zau') a.klin.setAttribute('y', f1(-2 + a.poz * 24));
      else if (a.tip === 'vak') { a.pcb.setAttribute('y', f1(a.poz > 0.5 ? 46 : 58)); a.ispuh.style.display = a.cilj && p > pMin ? '' : 'none'; a.ispuh.style.strokeDashoffset = f1(-st.t * 40); }
    }
    igla.setAttribute('x2', f1(140 + 15 * Math.sin((p / 10) * Math.PI * 1.5 - Math.PI * 0.75))); igla.setAttribute('y2', f1(168 - 15 * Math.cos((p / 10) * Math.PI * 1.5 - Math.PI * 0.75)));
    pT.textContent = hr(p, 1) + ' bar';
    dovodT.style.display = st.komp ? '' : 'none'; dovodT.style.strokeDashoffset = f1(-st.t * 30);
    dovod2.style.display = p > 0.3 ? '' : 'none'; dovod2.style.strokeDashoffset = f1(-st.t * 30);
    kKr.style.opacity = st.komp ? '1' : '0.3';
    const F = p * 1e5 * A_y, Vs = A_y * hod * 1000 * (p + 1);
    o.p(hr(p, 1) + ' bar (' + hr(p / 10, 2) + ' MPa)', p < pMin ? 'opas' : p < pNom - 0.5 ? 'upoz' : 'ok');
    o.f(hr(F, 0) + ' N'); o.v(hr(Vs, 2) + ' l slobodnog zraka'); o.q(hr(Vs * 2 * 6, 1) + ' l/min');
    return true;
  });
  ui.seg('Stanica', [['asrs', 'ASRS32'], ['branch', 'BRANCH'], ['rass', 'RASS']], 'asrs', m => { st.mod = m; st.greska = ''; izgradi(); ctx.budi(); });
  const r1 = ui.red();
  ui.gumb('Svi ventili uključeno', () => { st.akt.forEach(a => { a.cilj = 1; a.tGr = 0; }); st.greska = ''; ctx.budi(); }, { tanki: true, u: r1 });
  ui.gumb('Svi ventili isključeno', () => { st.akt.forEach(a => { a.cilj = 0; a.tGr = 0; }); st.greska = ''; ctx.budi(); }, { tanki: true, u: r1 });
  ui.klizac('Tlak na regulatoru', 0, 8, 0.5, pNom, x => hr(x, 1) + ' bar', x => { st.p = x; st.greska = ''; ctx.budi(); });
  ui.kvacica('Kompresor uključen', true, v => { st.komp = v; st.greska = ''; ui.stanje(v ? 'Kompresor puni mrežu.' : 'Kompresor je isključen: tlak u mreži pada sa svakim pomakom i s propuštanjem.', v ? 'ok' : 'upoz'); ctx.budi(); });
  const o = ui.ocit([['p', 'Radni tlak'], ['f', 'Sila klipa osi Y: F = p · A'], ['v', 'Zrak po hodu osi Y'], ['q', 'Os Y, 1 dvostruki hod / 10 s']]);
  ui.sitno(`Potrebno po stanici: ${D.upr.zrak}. A = π · (18 mm)² / 4 ≈ ${hr(A_y * 1e6, 0)} mm², hod ${hr(hod * 1000, 0)} mm [izračun].`);
  izgradi(); ctx.budi();
  ui.stanje('Klikni ventil (pravokutnik lijevo od aktuatora) da ga prebaciš.');
}

/* =========================================================== 14. modul s kobotom */
function tKobotModul(ui, ctx) {
  const C = D.mjere.cobot, MO = D.moduli.cobot;
  const s = 340, ox = 96, oy = 30;
  const X = x => ox + x * s, Yp = y => oy + (C.dubina - y) * s;       // stol: x 0…širina, y 0 (sprijeda) … dubina
  const svg = ui.svg(620, 370, 'Tlocrt modula CP-COBOT-M: stol, robot UR3e, kutije BOX 1 i BOX 2 s RFID glavama, privjesak za učenje');
  S('rect', { x: 2, y: 2, width: 616, height: 366, rx: 10, class: 'tcf-graf' }, svg);
  S('rect', { x: X(0), y: Yp(C.dubina), width: C.sirina * s, height: C.dubina * s, rx: 6, class: 'tcf-modul' }, svg);
  T(svg, X(0), Yp(0) + 22, 'prednja strana (operater)', 'tcf-ls');
  const box = [{ x0: 0.03, naziv: 'BOX 1', rf: 'TF80' }, { x0: 0.45, naziv: 'BOX 2', rf: 'TF81' }].map((b, bi) => {
    const g = S('g', {}, svg);
    S('rect', { x: X(b.x0), y: Yp(0.34), width: 0.4 * s, height: 0.3 * s, rx: 5, class: 'tcf-kutija' }, g);
    T(g, X(b.x0 + 0.2), Yp(0.34) - 6, b.naziv, 'tcf-l', 'middle');
    const mj = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const x = b.x0 + 0.05 + c * 0.1, y = 0.11 + r * 0.12;
      const e = S('rect', { x: X(x) - 13, y: Yp(y) - 17, width: 26, height: 34, rx: 3, class: 'tcf-izradak' }, g);
      mj.push({ x, y, e, puno: bi === 0 });
    }
    const rf = S('rect', { x: X(b.x0 + 0.2) - 16, y: Yp(0.04), width: 32, height: 8, rx: 2, class: 'tcf-rfid' }, svg);
    T(svg, X(b.x0 + 0.2) + 20, Yp(0.04) + 9, b.rf, 'tcf-ls tcf-na-kutiji');
    return { ...b, g, mj, rf, ima: true };
  });
  const baza = { x: C.sirina / 2 + C.robot.x, y: C.dubina / 2 + C.robot.y };
  S('circle', { cx: X(baza.x), cy: Yp(baza.y), r: 20, class: 'tcf-robot-baza' }, svg);
  T(svg, X(baza.x) - 26, Yp(baza.y) - 14, 'UR3e', 'tcf-l', 'end');
  const r1l = S('line', { class: 'tcf-ruka1' }, svg), r2l = S('line', { class: 'tcf-ruka2' }, svg);
  const zg = S('circle', { r: 7, class: 'tcf-zglob' }, svg);
  const tcp = S('circle', { r: 10, class: 'tcf-tcp tcf-tcp-alat' }, svg);
  const nosi = S('rect', { width: 22, height: 30, rx: 3, class: 'tcf-izradak' }, svg);
  // privjesak
  S('rect', { x: X(C.sirina) + 14, y: Yp(0.62), width: 44, height: 64, rx: 6, class: 'tcf-hmi' }, svg);
  T(svg, X(C.sirina) + 36, Yp(0.62) + 82, 'privjesak', 'tcf-ls', 'middle');
  const nsPriv = S('circle', { cx: X(C.sirina) + 36, cy: Yp(0.62) + 12, r: 6, class: 'tcf-gljiva' }, svg);
  const bp22 = lampa(svg, X(C.sirina) + 22, Yp(0.24), 'BP22', 6);
  T(svg, X(C.sirina) + 14, Yp(0.24) + 26, 'dio usisan', 'tcf-ls');
  const stanjeT = T(svg, X(C.sirina) + 14, Yp(0.85), '', 'tcf-l');
  const st = { radi: false, smjer: 0, brz: 0.6, pos: { x: baza.x + 0.05, y: baza.y - 0.3 }, z: 1, faza: 'mir', u: 0, od: null, cilj: null, nosi: false, zastoj: '', nstop: false, kom: 0, t: 0 };
  const izv = () => box[st.smjer], odr = () => box[1 - st.smjer];
  function sljedeci() {
    const a = izv(), b = odr();
    if (!a.ima || !b.ima) return { ceka: (!a.ima ? a : b) };
    const m = a.mj.find(x => x.puno), n = b.mj.find(x => !x.puno);
    if (!m || !n) return null;
    return { m, n };
  }
  const T0 = { idi: 1.3, dolje: 0.45, vak: 0.3, gore: 0.45 };
  ctx.petlja(dt => {
    st.t += dt;
    if (st.radi && !st.zastoj && !st.nstop) {
      const d = dt * st.brz;
      if (st.faza === 'mir') {
        const z = sljedeci();
        if (!z) { st.radi = false; bR.osvjezi(); ui.stanje(`Svi poklopci su premješteni u ${odr().naziv}. Promijeni smjer i pokreni ponovno.`, 'ok'); }
        else if (z.ceka) { ui.stanje(`RFID glava ${z.ceka.rf} ne vidi ${z.ceka.naziv}: robot čeka da operater umetne kutiju.`, 'upoz'); }
        else { st.zad = z; st.faza = 'idiIzv'; st.u = 0; st.od = { ...st.pos }; st.cilj = { x: z.m.x, y: z.m.y }; ui.stanje(`Robot ide po poklopac u ${izv().naziv}.`, 'plavo'); }
      } else {
        const tr = st.faza.startsWith('idi') ? T0.idi : st.faza.startsWith('dolje') ? T0.dolje : st.faza.startsWith('gore') ? T0.gore : T0.vak;
        st.u = Math.min(1, st.u + d / tr);
        const g = glatko(st.u);
        if (st.faza.startsWith('idi')) st.pos = { x: st.od.x + (st.cilj.x - st.od.x) * g, y: st.od.y + (st.cilj.y - st.od.y) * g };
        if (st.faza.startsWith('dolje')) st.z = 1 - g; if (st.faza.startsWith('gore')) st.z = g;
        if (st.u >= 1) {
          const sl = { idiIzv: 'doljeIzv', doljeIzv: 'vakOn', vakOn: 'goreIzv', goreIzv: 'idiOdr', idiOdr: 'doljeOdr', doljeOdr: 'vakOff', vakOff: 'goreOdr', goreOdr: 'mir' }[st.faza];
          if (st.faza === 'vakOn') { st.nosi = true; st.zad.m.puno = false; }
          if (st.faza === 'vakOff') { st.nosi = false; st.zad.n.puno = true; st.kom++; }
          if (sl === 'idiOdr') { st.od = { ...st.pos }; st.cilj = { x: st.zad.n.x, y: st.zad.n.y }; ui.stanje(`Poklopac ide u ${odr().naziv}.`, 'plavo'); }
          st.faza = sl; st.u = 0;
        }
      }
    }
    // crtanje
    const bx = X(baza.x), by = Yp(baza.y), tx = X(st.pos.x), ty = Yp(st.pos.y);
    const ex = bx + (tx - bx) * 0.5 + (ty - by) * 0.12, ey = by + (ty - by) * 0.5 - (tx - bx) * 0.12;
    postavi(r1l, { x1: bx, y1: by, x2: ex, y2: ey }); postavi(r2l, { x1: ex, y1: ey, x2: tx, y2: ty });
    postavi(zg, { cx: ex, cy: ey }); postavi(tcp, { cx: tx, cy: ty }); tcp.setAttribute('r', f1(7 + 5 * st.z));
    nosi.style.display = st.nosi ? '' : 'none'; postavi(nosi, { x: tx - 11, y: ty - 15 });
    box.forEach(b => { b.mj.forEach(m => m.e.style.display = m.puno ? '' : 'none'); b.g.style.opacity = b.ima ? '1' : '0.15'; b.rf.classList.toggle('tcf-rfid-akt', b.ima); });
    bp22.upali(st.nosi);
    nsPriv.classList.toggle('tcf-gljiva-p', st.nstop);
    const stoji = st.zastoj || st.nstop;
    tcp.classList.toggle('tcf-tcp-stop', !!stoji);
    stanjeT.textContent = st.nstop ? 'nužni stop' : st.zastoj ? 'zaštitni stop' : st.radi ? 'radi' : 'miruje';
    o.b1(box[0].ima ? box[0].mj.filter(m => m.puno).length + ' / 8' : 'izvađena'); o.b2(box[1].ima ? box[1].mj.filter(m => m.puno).length + ' / 8' : 'izvađena');
    o.bp(st.nosi ? '1' : '0', st.nosi ? 'ok' : ''); o.k(String(st.kom));
    return st.radi;
  });
  const r = ui.red();
  const bR = ui.igraj(st, 'radi', 'Pokreni', null, r);
  ui.gumb('Dodir (sudar s rukom)', () => { if (!st.radi) return; st.zastoj = 'dodir'; ui.stanje('Robot je otkrio neočekivanu silu na zglobovima i odmah stao (zaštitni stop). Nastavlja tek kad operater potvrdi na privjesku.', 'opas'); ctx.budi(); }, { tanki: true, u: r, kl: 'tcf-g-stop' });
  ui.gumb('Potvrdi i nastavi', () => { if (st.nstop) { ui.stanje('Nužni stop je još pritisnut.', 'upoz'); return; } if (st.zastoj) { st.zastoj = ''; ui.stanje('Potvrđeno na privjesku: robot nastavlja program.', 'ok'); ctx.budi(); } }, { tanki: true, u: r });
  ui.seg('Smjer premještanja', [[0, 'BOX 1 → BOX 2'], [1, 'BOX 2 → BOX 1']], 0, v => { if (st.nosi) return; st.smjer = v; st.faza = 'mir'; ctx.budi(); });
  ui.klizac('Brzina programa', 10, 100, 10, 60, x => x + ' %', x => { st.brz = x / 100; });
  const r2 = ui.red();
  ui.kvacica('BOX 2 izvađena', false, v => { box[1].ima = !v; ctx.budi(); }, r2);
  ui.kvacica('Nužni stop na privjesku', false, v => { st.nstop = v; if (!v) st.zastoj = 'nužni stop otpušten'; ui.stanje(v ? 'Nužni stop: robot i aktuatori su bez energije (sigurnosni relej modula).' : 'Nužni stop je otpušten — potvrdi za nastavak.', v ? 'opas' : 'upoz'); ctx.budi(); }, r2);
  const o = ui.ocit([['b1', 'BOX 1 (poklopci)'], ['b2', 'BOX 2 (poklopci)'], ['bp', 'BP22 dio usisan'], ['k', 'Premješteno']]);
  ui.sitno(`${MO.oznaka}: ${MO.napajanje}, ${MO.masa} kg, gabarit ${hr(MO.mjere.visina * 1000, 0)} × ${hr(MO.mjere.sirina * 1000, 0)} × ${hr(MO.mjere.dubina * 1000, 0)} mm [IP-COBM]. Vidi i područje „Kobot UR3e”.`);
  ctx.budi();
  ui.stanje('Pritisni „Pokreni”: robot prenosi poklopce iz BOX 1 u BOX 2.');
}

/* =========================================================== popis graditelja */
const GRADITELJI = {
  tokMaterijala: tTokMaterijala, osnovniModul: tOsnovniModul, rfid: tRfid, zaustavljac: tZaustavljac,
  regalnoSkladiste: tRegalnoSkladiste, robotskaMontaza: tRobotskaMontaza, grananje: tGrananje, predajaRobotinu: tPredajaRobotinu,
  mesNalozi: tMesNalozi, plcHmi: tPlcHmi, sigurnosniKrug: tSigurnosniKrug, nacinRada: tNacinRada, pneumatika: tPneumatika, kobotModul: tKobotModul
};

/* =========================================================== izvoz */
export function prikazi(el, id) {
  if (!el) throw new Error('teme_cpf: nedostaje element');
  if (!GRADITELJI[id] || !TEME[id]) {
    el.replaceChildren(H('p', { class: 'tcf-stanje tcf-upoz', tekst: 'Tema „' + id + '” ne postoji.' }));
    return { unisti() { el.replaceChildren(); } };
  }
  const ctx = new Kontekst(el);
  let sek = null;
  try {
    const ui = okvir(el, id, ctx);
    sek = ui.sek;
    GRADITELJI[id](ui, ctx);
  } catch (e) {
    ctx.unisti();
    throw e;
  }
  let gotovo = false;
  return {
    unisti() {
      if (gotovo) return;
      gotovo = true;
      ctx.unisti();
      if (sek && sek.parentNode === el) el.removeChild(sek);
    }
  };
}
