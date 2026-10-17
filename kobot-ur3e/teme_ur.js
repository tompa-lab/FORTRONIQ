// teme_ur.js — 14 interaktivnih 2D tema za kobot UR3e
// (DOS ForTroniQ, područje kobot-ur3e). ES modul bez ovisnosti.
// Izvozi: TEME (naslovi, engleski nazivi, tekstovi) i prikazi(el, id) → { unisti() }.
// Tekst i grafika su vlastiti. Što UR ne objavljuje, označeno je kao pretpostavka ili primjer.

/* =========================================================== tekstovi */
export const TEME = {
  valni: {
    naslov: 'Valni (harmonični) prijenosnik',
    engl: 'Strain wave gearing, Harmonic Drive',
    uvod: [
      'U svakom zglobu UR3e vrtnja motora prolazi kroz valni prijenosnik. Eliptični generator vala na vratilu motora iznutra rasteže tankostijeni fleksibilni zupčanik (flexspline), pa njegovi vanjski zubi zahvaćaju unutarnje zube krutog prstena (circular spline) samo na dva suprotna mjesta — uz veliku os elipse.',
      'Flexspline ima dva zuba manje od prstena. Dok generator napravi jedan okretaj, mjesto zahvata obiđe cijeli prsten, a flexspline zaostane za dva zuba i okrene se suprotno od ulaza. Zato je omjer i = z_f / (z_c − z_f): za 200 i 202 zuba to je 100 : 1 u jednom stupnju.',
      'Proizvođač Harmonic Drive objavio je da je za UR-ove robote isporučivao jednostupanjske prijenosnike serije HFUS-2SH, omjera 100 : 1 i bez zračnosti, na svih šest osi (izvorno za UR5). Za UR3e točna serija i omjer nisu objavljeni.'
    ],
    kako: 'Pokreni vrtnju ili pritisni „Jedan okretaj ulaza”. Crveni zub flexsplinea i oznake 0, 1, 2 … na prstenu pokazuju da se izlaz za svaki okretaj generatora pomakne za točno dva zuba, suprotno od ulaza. Uvećani detalj prati veliku os: ondje su zubi u punom zahvatu, na oba boka. Odaberi „Njihanje” i usporedi grafove: planetarni prijenosnik pri svakoj promjeni smjera najprije mora prijeći zračnost, a valni odmah slijedi ulaz.',
    napomena: 'Profil zuba je pojednostavljen (trapezni), a deformacija flexsplinea (u stvarnosti oko jednog modula, desetinke milimetra) crtana je u mjerilu zuba. Stupanj djelovanja η ≈ 0,75 je naša pretpostavka (ovisi o brzini, opterećenju i temperaturi). Vrtnja je usporena.'
  },
  kocnica: {
    naslov: 'Kočnica zgloba: krilce, zatik i tarna spojka',
    engl: 'Joint brake, brake pin',
    uvod: [
      'Kočnica zgloba nije kočnica s tarnim pločama kao na automobilu. Na vratilu motora je prsten s krilcima, a uz njega zatik koji pomiče elektromagnet. Dok kočnica ima napajanje, elektromagnet drži zatik povučen i vratilo se slobodno vrti.',
      'Kad napajanje nestane (gašenje, E-stop, nestanak struje), opruga izgura zatik i prvo krilce koje naiđe udari u njega — čuje se „klik”, a zglob se još malo pomakne. Prsten s krilcima vezan je za vratilo tarnom spojkom: pri vrlo velikom vanjskom momentu spojka prokliže, pa se zglob može prisilno pomaknuti i bez napajanja.'
    ],
    kako: 'Dok se vratilo vrti, isključi napajanje kočnice i promatraj udar krilca u zatik. Zatim klizačem zadaj vanjski moment na zglob: dok je manji od momenta proklizavanja, zglob se pomakne samo do naslona krilca na zatik; kad ga prijeđe, vratilo proklizava, a prsten s krilcima ostaje na zatiku. „Test kočnice” prikazuje provjeru koju upravljanje radi pri pokretanju robota.',
    napomena: 'Broj krilaca (6), moment proklizavanja (80 Nm na zglobu veličine 2) i tijek testa naše su pretpostavke — UR ih ne objavljuje. Prisilno pomicanje zgloba bez napajanja služi samo u nuždi (najviše 160°). Kutovi na prikazu su na strani motora; na zglobu su sto puta manji.'
  },
  enkoderi: {
    naslov: 'Dva enkodera: enkoder motora i enkoder zgloba',
    engl: 'Motor encoder and joint encoder',
    uvod: [
      'Svaki zglob mjeri kut dva puta. Enkoder motora sjedi na vratilu motora, prije prijenosnika: vrti se i puta brže od zgloba, a služi za komutaciju motora i mjerenje brzine.',
      'Enkoder zgloba je iza valnog prijenosnika i izravno mjeri stvarni kut izlazne prirubnice. Upravljanje stalno uspoređuje kut motora podijeljen s omjerom i kut zgloba; ako se razlikuju više nego što dopušta elastičnost prijenosnika, javlja grešku (npr. „Joint encoder error” ili „Sudden position change detected on the joint-encoder”).'
    ],
    kako: 'Pokreni gibanje zgloba. Disk enkodera motora vrti se sto puta brže od diska zgloba, a krivulje kut motora / i i kut zgloba se poklapaju. Odaberi kvar i pritisni „Izazovi kvar”: kod preskakanja zubi prijenosnika izlaz naglo zaostane, a kod kvara enkodera zgloba očitanje počne skakati. U oba slučaja razlika prijeđe prag i zglob se zaustavlja.',
    napomena: 'Omjer 100 : 1, prag razlike (0,5°) i oblik kvarova su primjer. UR ne objavljuje razlučivost enkodera ni pragove nadzora.'
  },
  motor: {
    naslov: 'Motor bez četkica i komutacija',
    engl: 'Brushless motor (BLDC / PMSM), commutation',
    uvod: [
      'Motor zgloba nema četkica: trajni magneti su na rotoru, a namoti na statoru. Elektronika zgloba napaja tri faze (U, V, W) tako da magnetsko polje statora prednjači polju rotora za četvrtinu okretaja (90° električno) — tada je moment najveći.',
      'Da bi to mogla, elektronika u svakom trenutku mora znati kut rotora; zato je na vratilu enkoder motora. Moment je razmjeran struji (M = k_M · I), pa regulacija momenta zapravo znači regulaciju struje.'
    ],
    kako: 'Zadaj struju klizačem i prati kako se narančasta strelica polja statora vrti ispred osi rotora (crvena). Kod sinusne komutacije polje se vrti jednoliko; kod blok-komutacije skače u šest koraka po 60°, pa moment pulsira. Odaberi pogrešan kut iz enkodera: uz pomak od 90° polje stoji u smjeru rotora i motor ne razvija moment iako teče puna struja, a uz 180° vrti se unatrag.',
    napomena: 'Prikazan je motor s jednim parom polova i šest utora. Stvarni broj polova, konstanta momenta (ovdje k_M = 0,1 Nm/A) i tip motora za UR3e nisu objavljeni. Vrtnja je usporena.'
  },
  regulacija: {
    naslov: 'Kaskadna regulacija zgloba: položaj – brzina – struja',
    engl: 'Cascade control: position, velocity, current',
    uvod: [
      'Upravljanje 500 puta u sekundi (takt 2 ms) računa nove zadane vrijednosti za svaki zglob. Regulacija je kaskadna: vanjska petlja uspoređuje zadani i stvarni kut i daje zadanu brzinu, srednja iz razlike brzina daje zadanu struju (moment), a unutarnja održava struju u namotima jednakom zadanoj.',
      'Svaka unutarnja petlja mora biti brža od vanjske. Kut zgloba daje enkoder zgloba, brzinu i kut za komutaciju enkoder motora, a struju mjeri elektronika zgloba.'
    ],
    kako: 'Pritisni „Pomakni zglob”: zglob ide s 0° na 90° po profilu brzine. Stvarni kut (puna crta) zaostaje za zadanim (crtkano) to manje što je pojačanje položaja Kp veće; premalo pojačanje brzine Kv daje njihanje. „Teret 3 kg” naglo doda moment težine — gledaj kako ga regulacija svlada. U prikazu „Uvećano” vidiš da se zadana vrijednost mijenja u koracima od 2 ms.',
    napomena: 'Takt 500 Hz podatak je iz priručnika. Raspodjelu petlji između ormara i zgloba, pojačanja, moment tromosti (0,4 kg·m²) i brzinu unutarnjih petlji UR ne objavljuje — ovdje su primjer.'
  },
  zglobSklop: {
    naslov: 'Zglob iznutra: od struje do kuta',
    engl: 'Joint drive unit, cross-section',
    uvod: [
      'Zglob UR-a zatvoren je pogonski sklop: u jednom kućištu su elektronika, motor, kočnica, dva enkodera i valni prijenosnik. Kroz šuplju sredinu prolaze kabeli prema sljedećim zglobovima.',
      'Energija i naredbe stižu kabelom; elektronika naredbu pretvara u struje faza, motor stvara moment, prijenosnik ga povećava oko sto puta, a izlazna prirubnica okreće sljedeći članak. Enkoderi vraćaju podatke elektronici.'
    ],
    kako: 'Pritisni „Pokreni tok” i prati energiju (narančasto) i povratne signale enkodera (plavo). Klikni dio presjeka, broj ili stavku popisa za opis; tipkama „Prethodni” i „Sljedeći” proći ćeš lanac redom.',
    napomena: 'Načelni presjek, poredan po toku energije. Stvarni raspored dijelova i unutarnje mjere zgloba UR ne objavljuje (poznat je npr. broj vijaka poklopca).'
  },
  ftsenzor: {
    naslov: 'Senzor sile i momenta na prirubnici',
    engl: 'Force/torque sensor',
    uvod: [
      'UR3e ima senzor sile i momenta ugrađen u prirubnicu alata. Mjeri šest komponenti — sile Fx, Fy, Fz i momente Mx, My, Mz u koordinatnom sustavu alata. Opseg je ±30 N (preciznost ±2,0 N, točnost ±3,5 N) i ±10 Nm (preciznost i točnost ±0,1 Nm).',
      'Iz tih podataka robot prepoznaje dodir, vodi alat zadanom silom (npr. pri umetanju ili brušenju) i provjerava teret. Sila koju robot javlja umanjena je za težinu tereta podešenog u instalaciji (Payload) — zato teret mora biti ispravno podešen.'
    ],
    kako: 'Odaberi slučaj. Pritisak prstom na vrh alata daje bočnu silu i moment koji raste s krakom (M = F · L). Teret od 3 kg teži 29,4 N: ako nije podešen, očitanje je gotovo na granici opsega, a ako težište nije u osi prirubnice, nastaje i moment. Donji crtež pokazuje opće načelo mjerenja: deformacijski element se elastično savije, a mjerne trake promijene otpor.',
    napomena: 'UR ne objavljuje izvedbu senzora; deformacijski element s mjernim trakama prikazan je kao uobičajeno načelo, ne kao stvarna konstrukcija. Duljina alata i položaj težišta su primjer.'
  },
  freedrive: {
    naslov: 'Slobodno vođenje i kompenzacija gravitacije',
    engl: 'Freedrive',
    uvod: [
      'U slobodnom vođenju (Freedrive) kočnice su otpuštene, a korisnik robota vodi rukom. Robot ne pada jer upravljanje u svakom zglobu stalno daje moment koji poništava težinu članaka i tereta.',
      'Za jedan članak taj je moment M = m · g · r · cos q: najveći je kad je članak vodoravan (q = 0), a nula kad je uspravan. Za rame se zbrajaju doprinosi nadlaktice, podlaktice, zapešća i tereta.'
    ],
    kako: 'Odaberi „Freedrive” i povuci vrh alata (ili koristi klizače). Načini ograničavaju gibanje alata: Free — svi zglobovi slobodni; Plane — vrh se giba samo u vodoravnoj ravnini; Translation — orijentacija alata ostaje ista; Rotation — vrh alata miruje, mijenja se samo orijentacija. „Bez kompenzacije” pokazuje što bi se dogodilo da motori ne drže težinu.',
    napomena: 'Bočni prikaz s tri zgloba (Shoulder, Elbow, Wrist 1). Mase članaka su iz UR-ovih dinamičkih parametara; položaji težišta i spajanje zapešća u jednu masu su pojednostavljenje. Način Plane prikazan je kao vodoravna ravnina.'
  },
  sigurnost: {
    naslov: 'Sigurnosne funkcije: brzina, sila, ravnine',
    engl: 'Safety functions',
    uvod: [
      'UR3e ima 23 podesive sigurnosne funkcije (PLd, kategorija 3). Sigurnosni sustav neprestano provjerava položaj, brzinu i silu TCP-a te snagu i količinu gibanja robota. Upravljanje gibanje usporava da ostane unutar granica; ako se granica ipak prekorači za više od tolerancije, sigurnosni sustav zaustavlja robota.',
      'Granice se podešavaju za normalni i smanjeni način (Normal / Reduced). U smanjeni način robot prelazi npr. kad TCP uđe u zonu uz sigurnosnu ravninu ili kad laserski skener javi čovjeka. U ručnom načinu TCP smije ići najviše 250 mm/s.'
    ],
    kako: 'Pokreni program i mijenjaj uvjete: približi čovjeka da ga skener vidi, uključi sigurnosnu ravninu ili prebaci u ručni način i prati granicu brzine. „Čovjek u putanji” prikazuje dodir: sila raste dok ne prijeđe granicu sile uvećanu za toleranciju 25 N, a tada robot staje.',
    napomena: 'Granice za Normal i Reduced (1500/750 mm/s, 150/120 N, 300/200 W, 25/10 kg·m/s) primjer su podešenja, ne obvezne vrijednosti. Tolerancije (sila 25 N, brzina 50 mm/s, ravnina 40 mm, količina gibanja 3 kg·m/s, snaga 10 W) iz UR-ove su tablice sigurnosnih funkcija. Model dodira i efektivna masa (8 kg) su pojednostavljenje.'
  },
  zaustavljanje: {
    naslov: 'Kategorije zaustavljanja 0, 1 i 2',
    engl: 'Stop categories 0, 1, 2',
    uvod: [
      'Norme razlikuju tri načina zaustavljanja. Kategorija 0: napajanje pogona odmah se isključuje, a robot zaustavljaju kočnice. Kategorija 1: robot se kontrolirano zaustavi po putanji, a tek tada se isključi napajanje i zatvore kočnice. Kategorija 2: robot se kontrolirano zaustavi, a napajanje ostaje — motori ga drže na mjestu.',
      'Na UR3e gljiva za nužno zaustavljanje (E-stop) radi kao kategorija 1, zaštitno zaustavljanje (npr. vrata ili skener) kao kategorija 2, a prekoračenje graničnog momenta zgloba izaziva kategoriju 0.'
    ],
    kako: 'Odaberi funkciju i pritisni „Zaustavi”. Grafovi pokazuju brzinu TCP-a i napajanje pogona u vremenu za sve tri kategorije, a istaknuta je ona koju koristi odabrana funkcija. Kod kategorije 0 robot staje najbrže, ali ne po putanji. Nakon kategorije 2 program se nastavlja bez ponovnog uključivanja pogona.',
    napomena: 'Vremena i oblik krivulja su ilustracija (početna brzina 1 m/s). Stvarni put i vrijeme zaustavljanja ovise o teretu, brzini i položaju; ograničavaju ih funkcije SF15 (vrijeme zaustavljanja) i SF16 (put zaustavljanja).'
  },
  tripolozajni: {
    naslov: 'Tripoložajni uređaj za omogućavanje (3PE)',
    engl: 'Three-position enabling device',
    uvod: [
      'Privjesak za učenje s 3PE-om ima tipke s tri položaja. Pušteno (1) i jako stisnuto (3) znače zaustavljanje; samo lagani pritisak u srednji položaj (2) omogućuje gibanje u ručnom načinu.',
      'Uređaj koristi prirodnu reakciju: u opasnosti čovjek ili pusti ruku ili je grčevito stisne. Iz položaja 3 ne može se izravno vratiti u gibanje — tipku treba pustiti do kraja pa ponovno lagano pritisnuti. U automatskom načinu 3PE se ne koristi; robota tada štite druge zaštitne mjere.'
    ],
    kako: 'Pomiči klizač pritiska ili odaberi položaj i gledaj smije li se robot gibati. U ručnom načinu stisni jako, pa se vrati na lagano — gibanje ne kreće dok tipku ne pustiš. Prebaci u automatski način: program radi neovisno o 3PE-u.',
    napomena: 'Pragovi na klizaču pritiska su ilustracija. Ponašanje odgovara funkcijama SF18–SF20 i uobičajenom radu uređaja za omogućavanje.'
  },
  alatniIO: {
    naslov: 'Alatni priključak (Tool I/O)',
    engl: 'Tool I/O, M8 8-pin connector',
    uvod: [
      'Na zapešću je ženski priključak M8 s osam polova, pa se hvataljka spaja kratkim kabelom, bez vođenja žica uz cijelog robota. Na raspolaganju su napajanje 12 V ili 24 V do 600 mA, dva digitalna ulaza, dva digitalna izlaza i dva analogna ulaza (0–10 V ili 4–20 mA).',
      'Digitalni izlazi rade kao sinking (NPN), sourcing (PNP) ili push-pull. U načinu Dual Pin Power izlazi služe kao dodatni vodiči napajanja. Kad se uključi sučelje RS-485 (Tool Communication Interface), ono zauzima vodiče analognih ulaza — tada AI nisu dostupni.'
    ],
    kako: 'Odaberi hvataljku i podesi priključak kao u Installation → Tool I/O. Pritisni „Zatvori” i „Otvori”: ako se napon, način izlaza ili struja ne slažu s hvataljkom, ona ne reagira ili se javlja preopterećenje. Kod hvataljke s RS-485 naredbe idu serijskom vezom, a analogni ulazi nestanu s popisa.',
    napomena: 'Raspored pinova i boje žica nisu provjereni, pa ih namjerno ne prikazujemo — prije spajanja pogledaj priručnik robota i hvataljke. Hvataljke i njihove struje su izmišljeni primjeri.'
  },
  ormar: {
    naslov: 'Upravljački ormar: tok energije i signala',
    engl: 'Control Box (e-Series)',
    uvod: [
      'Upravljački ormar (460 × 449 × 254 mm, 12 kg, IP44) priključuje se na 100–240 V AC, 47–440 Hz. Izvor napajanja daje istosmjerni napon za robota i 24 V za ulaze i izlaze; kabelom od 6 m energija i komunikacija idu do zglobova.',
      'Računalo s PolyScopeom (Linux) planira gibanje, upravljačka ploča 500 puta u sekundi razmjenjuje podatke sa zglobovima, a sigurnosna ploča u dva neovisna kanala (A i B) nadzire E-stop i sigurnosne ulaze. Na raspolaganju su 16 DI, 16 DO, 2 AI, 2 AO i 4 kvadraturna ulaza te Modbus TCP, EtherNet/IP, PROFINET, PROFIsafe i ROS/ROS2.'
    ],
    kako: 'Klikni blok za opis. Pod „Stanje robota” biraj miruje, ubrzava ili koči: pri kočenju motori rade kao generatori, energija se vraća prema ormaru, napon raste, a Energy Eater je pretvara u toplinu. Pritisni „E-stop”: oba kanala se otvore i sigurnosna ploča isključi napajanje robota. S kvarom jednog kanala ploča otkrije nesklad i javlja grešku.',
    napomena: 'Funkciju Energy Eatera UR ne opisuje; ovdje je naše tumačenje prema nazivu i uobičajenoj izvedbi (otpornik za kočenje). Iznos istosmjernog napona i vrstu sabirnice prema zglobovima ne navodimo jer ih nemamo iz provjerenog izvora. Tokovi su načelni.'
  },
  kinematikaDH: {
    naslov: 'DH okviri i izravna kinematika UR3e',
    engl: 'Denavit–Hartenberg parameters, forward kinematics',
    uvod: [
      'Položaj vrha alata računa se iz šest kutova zglobova lancem koordinatnih okvira po Denavitu i Hartenbergu. Svaki zglob opisuju četiri broja: kut zgloba θ, pomak d duž osi z, duljina a duž osi x i zakret α oko osi x.',
      'Za UR3e proizvođač objavljuje d1 = 151,85 mm, a2 = −243,55 mm, a3 = −213,2 mm, d4 = 131,05 mm, d5 = 85,35 mm i d6 = 92,1 mm. Umnožak šest matrica daje položaj i orijentaciju prirubnice u odnosu na podnožje.'
    ],
    kako: 'Pomiči klizače kutova i prati okvire (x crveno, y zeleno, z plavo; z je os vrtnje sljedećeg zgloba). Položaj prirubnice računa se izravnom kinematikom u ovom modulu i odgovara onome što PolyScope pokazuje za TCP bez pomaka alata. Pri svim kutovima 0 robot je ispružen vodoravno: x = −456,75 mm, y = −223,15 mm, z = 66,5 mm.',
    napomena: 'Kosi prikaz je ortografska projekcija koju možeš zakretati. Os z podnožja je okomita prema gore; rotacijski vektor (rx, ry, rz) računa se kao u PolyScopeu.'
  }
};

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
  return S('text', { x, y, class: kl || 'tur-l', 'text-anchor': anchor || null, tekst: txt }, g);
}
const ogr = (v, a, b) => Math.max(a, Math.min(b, v));
const lin = (a, b, t) => a + (b - a) * t;
const hr = (n, d = 1) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d).replace('.', ',').replace('-', '−');
const hrp = (n, d = 1) => (n > 0.5 * Math.pow(10, -d) ? '+' : '') + hr(n, d);
const f1 = v => v.toFixed(1);
const RAD = Math.PI / 180;
const frac = x => x - Math.floor(x);
function glatko(a, b, x) { const t = ogr((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const pts = arr => arr.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
const put = (arr, zat) => 'M' + arr.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + (zat ? 'Z' : '');

// strelica (linija + glava) koja se može naknadno pomicati: g.set(x1,y1,x2,y2)
function strel(g, x1, y1, x2, y2, o = {}) {
  const boja = o.boja || 'var(--ink)', w = o.w || 2.5, gl = o.gl || 11;
  const gr = S('g', { class: o.kl || null }, g);
  const ln = S('line', { 'stroke-width': w, 'stroke-linecap': 'round' }, gr);
  const pg = S('polygon', {}, gr);
  gr.boja = b => { ln.style.stroke = b; pg.style.fill = b; };
  gr.boja(boja);
  gr.set = (a, b, c, d) => {
    const dx = c - a, dy = d - b, L = Math.hypot(dx, dy);
    if (L < 1) { gr.style.display = 'none'; return; }
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
function opruga(x1, y1, x2, y2, n, a) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const p = [[x1, y1]];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, s = i % 2 ? -a : a;
    p.push([x1 + dx * t - uy * s, y1 + dy * t + ux * s]);
  }
  p.push([x2, y2]);
  return pts(p);
}
// kružni luk kao putanja
function luk(cx, cy, r, a0, a1) {
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  const vel = Math.abs(a1 - a0) > Math.PI ? 1 : 0, sm = a1 > a0 ? 1 : 0;
  return `M${f1(x0)},${f1(y0)} A${f1(r)},${f1(r)} 0 ${vel} ${sm} ${f1(x1)},${f1(y1)}`;
}
// graf: okvir, mreža i pretvorba vrijednost → koordinata
function graf(g, x, y, w, h, o) {
  S('rect', { x, y, width: w, height: h, class: 'tur-graf' }, g);
  const X = v => x + (v - o.x0) / (o.x1 - o.x0) * w;
  const Y = v => y + h - (v - o.y0) / (o.y1 - o.y0) * h;
  for (const v of o.yt || []) {
    const yy = Y(v);
    S('line', { x1: x, y1: f1(yy), x2: x + w, y2: f1(yy), class: v === 0 && o.y0 < 0 ? 'tur-mreza0' : 'tur-mreza' }, g);
    if (o.ylab !== false) T(g, x - 6, yy + 5, (o.yf || String)(v), 'tur-ls', 'end');
  }
  if (o.naslov) T(g, x, y - 9, o.naslov, 'tur-ls');
  return { X, Y, x, y, w, h };
}
// SVG element koji se ponaša kao gumb (klik, Enter, razmaknica)
function klikabilno(ctx, el, oznaka, fn) {
  el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', oznaka);
  el.classList.add('tur-klik');
  ctx.on(el, 'click', fn);
  ctx.on(el, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
}
function svgTocka(svg, e) {
  const m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}
function sporo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

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
    const dt = this.zadnje ? Math.min((t - this.zadnje) / 1000, this.rm ? 0.4 : 0.05) : (this.rm ? 0.25 : 1 / 60);
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
  const uid = 'tur' + (++brojac);
  let nk = 0;
  const sek = H('section', { class: 'tur', 'data-tema': id, 'aria-label': T0.naslov });
  const naslov = H('h3', { class: 'tur-naslov' }, T0.naslov + ' ', H('span', { class: 'tur-engl', tekst: '(' + T0.engl + ')' }));
  const uvod = H('div', { class: 'tur-uvod' });
  for (const p of T0.uvod) uvod.append(H('p', { tekst: p }));
  const scena = H('div', { class: 'tur-scena' });
  const upr = H('div', { class: 'tur-upr', role: 'group', 'aria-label': 'Upravljanje animacijom' });
  const ocitP = H('div', { class: 'tur-ocit' });
  const stanjeP = H('p', { class: 'tur-stanje', 'aria-live': 'polite' });
  const kako = H('div', { class: 'tur-kako' }, H('h4', { tekst: 'Kako radi' }), H('p', { tekst: T0.kako }));
  if (T0.napomena) kako.append(H('p', { class: 'tur-pretp' }, H('b', { tekst: 'Pojednostavljenja: ' }), T0.napomena));
  const desno = H('div', { class: 'tur-desno' }, upr, stanjeP, ocitP, kako);
  sek.append(naslov, uvod, H('div', { class: 'tur-tijelo' }, scena, desno));
  el.replaceChildren(sek);

  const ui = {
    uid, sek, scena, upr, ocitP, desno,
    svg(w, h, opis, kl) {
      const s = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': opis, class: 'tur-svg' + (kl ? ' ' + kl : ''), focusable: 'false' });
      const defs = S('defs', {}, s);
      const p = S('pattern', { id: uid + '-sr' + (++nk), width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      S('rect', { width: 7, height: 7, class: 'tur-srafura-p' }, p);
      S('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'tur-srafura-c' }, p);
      s.defs = defs; s.srafura = `url(#${p.id})`;
      scena.append(s);
      return s;
    },
    red(kl, u) { const r = H('div', { class: 'tur-red' + (kl ? ' ' + kl : '') }); (u || upr).append(r); return r; },
    // fn(true/false) kad scena postane uža/šira od praga (drugi raspored crteža na mobitelu)
    uski(fn, prag = 520) {
      let zadnje = null;
      const pr = () => { const w = scena.clientWidth; if (!w) return; const u = w < prag; if (u !== zadnje) { zadnje = u; fn(u); } };
      pr();
      if (zadnje === null) fn(false), zadnje = false;
      if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(pr); ro.observe(scena); ctx.ciscenje.push(() => ro.disconnect()); }
      return () => zadnje;
    },
    gumb(tekst, fn, o = {}) {
      const b = H('button', {
        type: 'button', class: 'gumb' + (o.tanki ? ' tanki' : '') + ' tur-g' + (o.kl ? ' ' + o.kl : ''),
        'aria-label': o.aria || null, 'aria-pressed': o.pritisak == null ? null : String(!!o.pritisak)
      });
      b.textContent = tekst;
      if (fn) ctx.on(b, 'click', e => fn(e, b));
      let cilj = o.u;
      if (!cilj) { cilj = upr.lastElementChild; if (!cilj || !cilj.classList.contains('tur-red')) cilj = ui.red(); }
      cilj.append(b);
      return b;
    },
    seg(oznaka, opcije, vr, fn, u) {
      const w = H('div', { class: 'tur-seg' });
      const lab = H('span', { class: 'tur-seg-o', tekst: oznaka, id: uid + '-s' + (++nk) });
      const box = H('div', { class: 'tur-seg-b', role: 'group', 'aria-labelledby': lab.id });
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
      const w = H('div', { class: 'tur-kl' });
      const l = H('label', { for: kid, tekst: oznaka });
      const o = H('output', { for: kid });
      const i = H('input', { type: 'range', id: kid, min, max, step: korak, value: vr });
      const upd = () => { o.textContent = fmt(+i.value); };
      ctx.on(i, 'input', () => { upd(); fn(+i.value); });
      upd();
      w.append(H('div', { class: 'tur-kl-g' }, l, o), i);
      (u || upr).append(w);
      w.ulaz = i; w.osvjezi = upd;
      w.postavi = v => { i.value = v; upd(); };
      return w;
    },
    kvacica(oznaka, vr, fn, u) {
      const kid = uid + '-c' + (++nk);
      const i = H('input', { type: 'checkbox', id: kid });
      i.checked = !!vr;
      const w = H('label', { class: 'tur-kv', for: kid }, i, H('span', { tekst: oznaka }));
      ctx.on(i, 'change', () => fn(i.checked));
      (u || upr).append(w);
      w.ulaz = i;
      return w;
    },
    ocit(redovi, u) {
      const dl = H('dl', { class: 'tur-oc' });
      const set = {};
      for (const [k, t] of redovi) {
        const dd = H('dd', { tekst: '—' });
        const dt = H('dt', { tekst: t });
        dl.append(H('div', {}, dt, dd));
        set[k] = (v, kl) => { if (dd.textContent !== v) dd.textContent = v; const c = kl ? 'tur-' + kl : ''; if (dd.className !== c) dd.className = c; };
        set[k].naziv = t2 => { if (dt.textContent !== t2) dt.textContent = t2; };
      }
      (u || ocitP).append(dl);
      return set;
    },
    sitno(txt, u) { const p = H('p', { class: 'tur-sitno', tekst: txt }); (u || ocitP).append(p); return p; },
    stanje(txt, vrsta) {
      if (stanjeP.textContent !== txt) stanjeP.textContent = txt;
      const c = 'tur-stanje' + (vrsta ? ' tur-' + vrsta : '');
      if (stanjeP.className !== c) stanjeP.className = c;
    }
  };
  return ui;
}

/* =========================================================== 1. valni prijenosnik */
function tValni(ui, ctx) {
  const PAR = { 30: [30, 32], 60: [60, 62], 200: [200, 202] };
  const ETA = 0.75;                              // stupanj djelovanja (pretpostavka)
  const st = { zf: 30, zc: 32, th: 0, n1: 1500, T1: 0.5, radi: false, nacin: 'vrt', cilj: null, t: 0, u: 0, yp: 0, yh: 0, tr: [[], []] };
  const cx = 250, cy = 292, Rc = 180, Ro = 222, F0 = -Math.PI / 2;
  const svg = ui.svg(600, 594, 'Presjek valnog prijenosnika: kruti prsten s unutarnjim zubima, fleksibilni zupčanik koji se elastično deformira i eliptični generator vala s kugličnim ležajem; desno gore uvećani detalj zahvata');
  let G = null;

  const gZ = S('g', { id: ui.uid + '-zup' }, svg);
  const pCS = S('path', { class: 'tur-cs', 'fill-rule': 'evenodd' }, gZ);
  const gZah = S('g', {}, gZ);
  for (const a of [0, 180]) {
    const p = S('path', { class: 'tur-zahvat' }, gZah);
    const r0 = Rc - 16, r1 = Rc + 16, d = 24 * RAD;
    const A = pol(cx, cy, r1, -d), Bq = pol(cx, cy, r1, d), C = pol(cx, cy, r0, d), D = pol(cx, cy, r0, -d);
    p.setAttribute('d', `M${f1(A[0])},${f1(A[1])} A${r1},${r1} 0 0 1 ${f1(Bq[0])},${f1(Bq[1])} L${f1(C[0])},${f1(C[1])} A${r0},${r0} 0 0 0 ${f1(D[0])},${f1(D[1])}Z`);
    p.dataset.a = a;
  }
  const gOzn = S('g', {}, gZ);
  const pFS = S('path', { class: 'tur-fs', 'fill-rule': 'evenodd' }, gZ);
  const pZub = S('path', { class: 'tur-fs-zub' }, gZ);
  const gKug = S('g', {}, gZ);
  const pCam = S('path', { class: 'tur-wg' }, gZ);
  const gGl = S('g', {}, gZ);
  S('circle', { cx, cy, r: 46, class: 'tur-wg-gl' }, gGl);
  S('circle', { cx, cy, r: 24, class: 'tur-tamno' }, gGl);
  S('rect', { x: cx - 5, y: cy - 30, width: 10, height: 10, class: 'tur-tamno' }, gGl);
  const crtaUlaza = S('line', { x1: cx, y1: cy - 46, x2: cx, y2: cy - 120, class: 'tur-oznaka-ulaz' }, gGl);
  S('circle', { cx, cy: cy - 120, r: 6, fill: B.crv }, gGl);
  const pomakLuk = S('path', { class: 'tur-pomak-luk' }, svg);

  // uvećani detalj (koristi isti crtež preko <use>)
  const IX = 522, IY = 96, IR = 70;
  const cl = S('clipPath', { id: ui.uid + '-ins' }, svg.defs);
  S('circle', { cx: IX, cy: IY, r: IR }, cl);
  S('circle', { cx: IX, cy: IY, r: IR, class: 'tur-ins-poz' }, svg);
  const gIns = S('g', { 'clip-path': `url(#${ui.uid}-ins)` }, svg);
  const uIns = S('use', { href: '#' + ui.uid + '-zup' }, gIns);
  S('circle', { cx: IX, cy: IY, r: IR, class: 'tur-ins-rub' }, svg);
  const tIns = T(svg, IX, IY + IR + 22, 'detalj', 'tur-ls', 'middle');
  T(svg, IX, IY + IR + 42, '(velika os)', 'tur-ls', 'middle');
  // brojila desno
  T(svg, 478, 262, 'ulaz', 'tur-ls');
  const tUl = T(svg, 478, 288, '', 'tur-lb');
  T(svg, 478, 326, 'izlaz', 'tur-ls');
  const tIz = T(svg, 478, 352, '', 'tur-lb');
  const tIzK = T(svg, 478, 378, '', 'tur-lb');
  T(svg, 478, 416, 'omjer', 'tur-ls');
  const tOm = T(svg, 478, 442, '', 'tur-lb');
  // legenda
  const leg = (x, y, kl, txt) => { S('rect', { x, y: y - 13, width: 20, height: 15, rx: 3, class: kl }, svg); T(svg, x + 28, y, txt, 'tur-ls'); };
  leg(18, 552, 'tur-cs', 'prsten (circular spline)');
  leg(308, 552, 'tur-fs', 'flexspline — izlaz');
  leg(18, 582, 'tur-wg', 'generator vala — ulaz');
  leg(308, 582, 'tur-zahvat-l', 'područje zahvata');

  const prof = d => d < 0.18 ? 1 : d < 0.32 ? (0.32 - d) / 0.14 : 0;
  function geo() {
    const zf = st.zf, zc = st.zc, m = 2 * Rc / zc;
    G = { zf, zc, m, w0: m, ht: 1.6 * m, Rf: Rc * zf / zc, wall: Math.max(6, 0.75 * m), b: 14 };
    // kruti prsten
    const N = zc * 14, unutra = [];
    for (let k = 0; k < N; k++) {
      const fi = 2 * Math.PI * k / N, v = frac(fi * zc / (2 * Math.PI));
      unutra.push(pol(cx, cy, Rc + G.ht / 2 - prof(Math.abs(v - 0.5)) * G.ht, F0 + fi));
    }
    pCS.setAttribute('d', `M${cx + Ro},${cy} A${Ro},${Ro} 0 1 1 ${cx - Ro},${cy} A${Ro},${Ro} 0 1 1 ${cx + Ro},${cy}Z ` + put(unutra, true));
    // oznake pomaka (u zubima flexsplinea), od vrha suprotno od kazaljke
    gOzn.replaceChildren();
    const K = zf <= 30 ? 6 : zf <= 60 ? 8 : 12, korak = zf > 60 ? 2 : 1;
    for (let k = 0; k <= K; k++) {
      const a = F0 - k * 2 * Math.PI / zf;
      const p1 = pol(cx, cy, Ro, a), p2 = pol(cx, cy, Ro + (k % korak ? 6 : 11), a);
      S('line', { x1: f1(p1[0]), y1: f1(p1[1]), x2: f1(p2[0]), y2: f1(p2[1]), class: 'tur-crtica' }, gOzn);
      if (k % korak === 0) { const p3 = pol(cx, cy, Ro + 24, a); T(gOzn, f1(p3[0]), f1(p3[1] + 6), String(k), 'tur-ls', 'middle'); }
    }
    T(gOzn, 16, 24, 'brojevi: pomak izlaza u zubima', 'tur-ls');
    // kuglice
    gKug.replaceChildren();
    G.kug = [];
    for (let k = 0; k < 18; k++) G.kug.push(S('circle', { r: G.b / 2 - 0.8, class: 'tur-kuglica' }, gKug));
    tOm.textContent = `${zf / (zc - zf)} : 1`;
    tIns.textContent = `detalj ×${hr(G.zf > 60 ? 4.5 : G.zf > 30 ? 3.2 : 2.6, 1)}`;
  }

  function osvjezi() {
    const { zf, w0, ht, Rf, wall, b } = G, th = st.th, psi = -2 * th / zf;
    const rn = fi => Rf + w0 * Math.cos(2 * (fi - th));             // fi mjeren od vrha, rad
    // flexspline: vanjski zubi (s tangencijalnim pomakom neistezljive srednje linije) i provrt
    const N = zf * 14, van = [], unu = [];
    let zub = [];
    for (let k = 0; k < N; k++) {
      const al = 2 * Math.PI * k / N;
      let x = al + psi - th;
      x = al + psi - th - (w0 / 2) * Math.sin(2 * x) / Rf;
      const fi = th + x, u = frac(al * zf / (2 * Math.PI)), d = Math.min(u, 1 - u);
      const p = pol(cx, cy, rn(fi) - ht / 2 + prof(d) * ht, F0 + fi);
      van.push(p);
      if (k < 7 || k > N - 7) zub.push([k < 7 ? k : k - N, p, pol(cx, cy, rn(fi) - ht / 2, F0 + fi)]);
    }
    for (let k = 0; k < 160; k++) { const fi = 2 * Math.PI * k / 160; unu.push(pol(cx, cy, rn(fi) - ht / 2 - wall, F0 + fi)); }
    pFS.setAttribute('d', put(van, true) + ' ' + put(unu, true));
    zub.sort((a, c) => a[0] - c[0]);
    pZub.setAttribute('d', put(zub.map(z => z[1]).concat(zub.map(z => z[2]).reverse()), true));
    // generator vala (eliptični kulisni dio) i kuglice ležaja
    const rc = fi => Rf - ht / 2 - wall - b + w0 * Math.cos(2 * (fi - th));
    const cam = [];
    for (let k = 0; k < 120; k++) { const fi = 2 * Math.PI * k / 120; cam.push(pol(cx, cy, rc(fi), F0 + fi)); }
    pCam.setAttribute('d', put(cam, true));
    G.kug.forEach((c, k) => { const fi = th / 2 + 2 * Math.PI * k / 18, p = pol(cx, cy, rc(fi) + b / 2, F0 + fi); c.setAttribute('cx', f1(p[0])); c.setAttribute('cy', f1(p[1])); });
    const thd = th / RAD;
    gGl.setAttribute('transform', `rotate(${thd.toFixed(2)} ${cx} ${cy})`);
    crtaUlaza.setAttribute('y2', f1(cy - rc(th) + 4));
    for (const p of gZah.children) p.setAttribute('transform', `rotate(${(thd + +p.dataset.a).toFixed(2)} ${cx} ${cy})`);
    // luk pomaka izlaza od oznake 0 do crvenog zuba
    const pomak = psi;
    if (Math.abs(pomak) > 0.002) pomakLuk.setAttribute('d', luk(cx, cy, Ro + 4, F0 + pomak, F0));
    else pomakLuk.setAttribute('d', '');
    // detalj prati veliku os: točka (th, Rc) u središte, radijalno prema gore
    const k = G.zf > 60 ? 4.5 : G.zf > 30 ? 3.2 : 2.6, P = pol(cx, cy, Rc, F0 + th);
    uIns.setAttribute('transform', `translate(${IX} ${IY + 8}) scale(${k}) rotate(${(-thd).toFixed(3)}) translate(${f1(-P[0])} ${f1(-P[1])})`);
    // brojila
    const okr = th / (2 * Math.PI), zubi = -2 * okr, kut = psi / RAD;
    tUl.textContent = hr(okr, 2) + ' okr.';
    tIz.textContent = hr(zubi, 2) + ' zuba';
    tIzK.textContent = hr(kut, 1) + '°';
    const i = zf / (G.zc - zf);
    o.z(`${zf} / ${G.zc}`); o.i(`${i} : 1`);
    o.n1(st.n1 + ' o/min');
    const n2 = st.n1 / i;
    o.n2(`${hr(n2, n2 < 10 ? 1 : 0)} o/min · ${hr(n2 * 6, 0)} °/s`);
    o.T2(hr(st.T1 * i * ETA, 1) + ' Nm');
    o.pom(`${hr(zubi, 2)} zuba · ${hr(kut, 1)}°`);
  }

  // usporedba zračnosti
  const svg2 = ui.svg(600, 300, 'Usporedba: planetarni prijenosnik sa zračnošću i valni prijenosnik bez zračnosti; zub ulaza u uvali izlaza i graf izlaza prema ulazu pri njihanju', 'tur-svg2');
  const PL = [{ x: 10, nas: 'Planetarni (zračnost)', zr: true }, { x: 305, nas: 'Valni (bez zračnosti)', zr: false }];
  for (const p of PL) {
    const g = S('g', {}, svg2);
    S('rect', { x: p.x, y: 4, width: 285, height: 292, rx: 10, class: 'tur-ploca' }, g);
    T(g, p.x + 14, 28, p.nas, 'tur-l');
    const xc = p.x + 142;
    // izlaz (uvala) i ulaz (zub)
    p.uvala = S('g', {}, g);
    const sir = p.zr ? 46 : 34;
    S('path', { d: `M${xc - 90},48 L${xc - sir / 2 - 6},48 L${xc - sir / 2},84 L${xc + sir / 2},84 L${xc + sir / 2 + 6},48 L${xc + 90},48 L${xc + 90},40 L${xc - 90},40Z`, class: 'tur-cs' }, p.uvala);
    p.zub = S('g', {}, g);
    S('path', { d: `M${xc - 17 - 6},96 L${xc - 17},60 L${xc + 17},60 L${xc + 17 + 6},96 L${xc + 60},96 L${xc + 60},106 L${xc - 60},106 L${xc - 60},96Z`, class: 'tur-fs' }, p.zub);
    p.dodir = [S('circle', { r: 4.5, fill: B.zel }, g), S('circle', { r: 4.5, fill: B.zel }, g)];
    T(g, p.x + 14, 128, p.zr ? 'zub ulaza prelazi zračnost' : 'zub naliježe na oba boka', 'tur-ls');
    p.gr = graf(g, p.x + 30, 146, 240, 132, { x0: -1.15, x1: 1.15, y0: -1.15, y1: 1.15, yt: [0], ylab: false });
    S('line', { x1: p.gr.X(0), y1: 146, x2: p.gr.X(0), y2: 278, class: 'tur-mreza' }, g);
    T(g, p.x + 268, 272, 'ulaz', 'tur-ls', 'end');
    T(g, p.x + 36, 166, 'izlaz', 'tur-ls');
    p.trag = S('polyline', { class: 'tur-krivulja' }, g);
    p.tocka = S('circle', { r: 6, class: 'tur-tocka' }, g);
    p.xc = xc;
    p.uputa = T(g, p.gr.X(0), 228, 'odaberi „Njihanje”', 'tur-ls', 'middle');
  }
  function osvjeziUsp() {
    const nj = st.nacin === 'nj';
    PL.forEach((p, j) => {
      const y = j === 0 ? st.yp : st.yh;
      p.zub.setAttribute('transform', `translate(${f1(st.u * 34)} 0)`);
      p.uvala.setAttribute('transform', `translate(${f1(y * 34)} 0)`);
      const tr = st.tr[j];
      p.trag.setAttribute('points', tr.map(q => f1(p.gr.X(q[0])) + ',' + f1(p.gr.Y(q[1]))).join(' '));
      p.tocka.setAttribute('cx', f1(p.gr.X(st.u))); p.tocka.setAttribute('cy', f1(p.gr.Y(y)));
      p.tocka.style.display = nj ? '' : 'none';
      p.uputa.style.display = nj ? 'none' : '';
      // točke dodira bokova
      const zx = p.xc + st.u * 34, ux = p.xc + y * 34;
      const lijevo = zx - 20.5, desno = zx + 20.5, ul = ux - (p.zr ? 23 : 17) - 3, ud = ux + (p.zr ? 23 : 17) + 3;
      const dl = !p.zr || Math.abs(lijevo - ul) < 1.5, dd = !p.zr || Math.abs(desno - ud) < 1.5;
      p.dodir[0].setAttribute('cx', f1(zx - 20)); p.dodir[0].setAttribute('cy', 72); p.dodir[0].style.display = dl ? '' : 'none';
      p.dodir[1].setAttribute('cx', f1(zx + 20)); p.dodir[1].setAttribute('cy', 72); p.dodir[1].style.display = dd ? '' : 'none';
    });
  }

  ctx.petlja(dt => {
    if (!st.radi && st.cilj == null) { osvjezi(); osvjeziUsp(); return false; }
    const vis = Math.max(st.n1, st.cilj != null ? 2400 : 0) / 6000 * 2 * Math.PI;   // rad/s generatora u prikazu (usporeno 100×)
    if (st.cilj != null) {
      st.th = Math.min(st.cilj, st.th + vis * dt);
      if (st.th >= st.cilj - 1e-9) { st.th = st.cilj; st.cilj = null; bJ.disabled = false; ui.stanje(`Generator je napravio jedan okretaj; flexspline (izlaz) zaostao je za 2 zuba = ${hr(720 / st.zf, 1)}°, suprotno od ulaza.`, 'ok'); }
    } else if (st.nacin === 'vrt') {
      st.th += vis * dt;
    } else {
      st.t += dt * Math.max(st.n1, 200) / 1500;
      st.u = Math.sin(2 * Math.PI * st.t / 6);
      st.th = st.u * 3 * Math.PI;
      const bz = 0.32;
      if (st.u - st.yp > bz / 2) st.yp = st.u - bz / 2; else if (st.u - st.yp < -bz / 2) st.yp = st.u + bz / 2;
      st.yh = st.u;
      for (const [j, y] of [[0, st.yp], [1, st.yh]]) { st.tr[j].push([st.u, y]); if (st.tr[j].length > 420) st.tr[j].shift(); }
      const promjena = Math.abs(st.u - st.yp) < bz / 2 - 0.005;
      ui.stanje(promjena ? 'Promjena smjera: planetarni izlaz stoji dok zub ulaza ne prijeđe zračnost; valni izlaz odmah slijedi ulaz.' : 'Njihanje ulaza: oba izlaza slijede ulaz — razlika se vidi tek pri promjeni smjera.', promjena ? 'upoz' : '');
    }
    osvjezi(); osvjeziUsp();
    return true;
  });

  const r1 = ui.red();
  const bP = ui.gumb('Pokreni', (e, b) => {
    st.radi = !st.radi; st.cilj = null; bJ.disabled = false;
    b.textContent = st.radi ? 'Zaustavi' : 'Pokreni'; b.setAttribute('aria-pressed', String(st.radi));
    if (st.radi && st.nacin === 'vrt') ui.stanje('Generator vala vrti se u smjeru kazaljke; mjesta zahvata putuju s njim, a flexspline se polako okreće suprotno.');
    ctx.budi();
  }, { pritisak: false, u: r1 });
  const bJ = ui.gumb('Jedan okretaj ulaza', () => {
    if (st.nacin !== 'vrt') { seg2.postavi('vrt'); postaviNacin('vrt'); }
    st.radi = false; bP.textContent = 'Pokreni'; bP.setAttribute('aria-pressed', 'false');
    st.th = Math.round(st.th / (2 * Math.PI)) * 2 * Math.PI; st.cilj = st.th + 2 * Math.PI; bJ.disabled = true;
    ui.stanje('Generator vala radi jedan puni okretaj…');
    ctx.budi();
  }, { tanki: true, u: r1 });
  ui.gumb('Na početak', () => {
    st.th = 0; st.cilj = null; st.t = 0; st.u = 0; st.yp = 0; st.yh = 0; st.tr = [[], []]; bJ.disabled = false;
    osvjezi(); osvjeziUsp(); ui.stanje('Crveni zub flexsplinea stoji na oznaci 0.');
  }, { tanki: true, u: r1 });
  ui.seg('Broj zubi (flexspline / prsten)', [[30, '30 / 32'], [60, '60 / 62'], [200, '200 / 202']], 30, v => {
    [st.zf, st.zc] = PAR[v]; geo(); osvjezi();
    ui.stanje(v === 200 ? 'Stvarni broj zubi za omjer 100 : 1: zubi i deformacija (±1 modul) u cijelom presjeku jedva se vide — pogledaj uvećani detalj.' : `Prikaz s ${v} zubi (omjer ${v / 2} : 1) — zubi su krupni da se zahvat dobro vidi.`);
  });
  const seg2 = ui.seg('Gibanje ulaza', [['vrt', 'Stalna vrtnja'], ['nj', 'Njihanje (usporedba zračnosti)']], 'vrt', v => postaviNacin(v));
  function postaviNacin(v) {
    st.nacin = v; st.t = 0; st.tr = [[], []]; st.u = 0; st.yp = 0; st.yh = 0; st.cilj = null; bJ.disabled = false;
    if (v === 'nj') { st.th = 0; st.radi = true; bP.textContent = 'Zaustavi'; bP.setAttribute('aria-pressed', 'true'); ui.stanje('Ulaz se njiše lijevo-desno (±1,5 okretaj generatora). Prati grafove ispod presjeka.'); }
    osvjezi(); osvjeziUsp(); ctx.budi();
  }
  ui.klizac('Brzina motora n₁', 0, 3000, 50, st.n1, v => v + ' o/min', v => { st.n1 = v; osvjezi(); ctx.budi(); });
  ui.klizac('Moment motora T₁', 0, 0.8, 0.05, st.T1, v => hr(v, 2) + ' Nm', v => { st.T1 = v; osvjezi(); });
  const o = ui.ocit([['z', 'Zubi flexspline / prsten'], ['i', 'Omjer i = z_f / (z_c − z_f)'], ['n1', 'Ulaz (motor) n₁'], ['n2', 'Izlaz n₂ = n₁ / i, suprotan smjer'], ['T2', 'Moment izlaza T₂ ≈ T₁ · i · η'], ['pom', 'Pomak izlaza od oznake 0']]);
  ui.sitno('Za UR3e: zglob Base najviše 180 °/s i 54 Nm. Uz omjer 100 : 1 to znači 3000 o/min motora i oko 0,72 Nm na motoru (uz η ≈ 0,75). Prikaz vrtnje je usporen 100 puta.');
  const zz = H('div', { class: 'tur-okviric' }, H('h4', { tekst: 'Zašto nema zračnosti' }),
    H('p', { tekst: 'Flexspline je u prsten utisnut s radijalnim prednaponom: zubi uz veliku os naliježu na oba boka i istodobno je u zahvatu velik broj zubi (kod stvarnih prijenosnika do oko 30 %). Pri promjeni smjera nema slobodnog hoda koji bi trebalo prijeći — ostaje samo mala elastična torzijska popustljivost. Kod planetarnog prijenosnika između bokova mora postojati zračnost da se zupčanici ne zaglave.' }));
  ui.ocitP.append(zz);
  geo(); osvjezi(); osvjeziUsp();
  ui.stanje('Pritisni „Jedan okretaj ulaza” ili „Pokreni”.');
}

/* =========================================================== 2. kočnica */
function tKocnica(ui, ctx) {
  const TSL = 80, I = 100, NK = 6, POLA = 14.6;            // moment proklizavanja [Nm na zglobu], omjer, broj krilaca, kut dodira [°]
  const st = { nap: true, motor: true, smjer: 1, fi: 0, lam: -60, p: 0, om: 90, Tv: 0, klik: 0, t: 0, hist: [], test: null, zaglavljen: false, prok: 0, blok: false };
  const svg = ui.svg(600, 430, 'Kočnica zgloba u pogledu sprijeda: vratilo motora, tarna spojka, prsten s krilcima i zatik s elektromagnetom; desno graf kuta vratila i prstena');
  const cx = 172, cy = 262;
  // prsten s krilcima
  const gPr = S('g', {}, svg);
  S('circle', { cx, cy, r: 74, class: 'tur-pomicni' }, gPr);
  for (let k = 0; k < NK; k++) {
    const a = k * 360 / NK, d = 8;
    const p = [pol(cx, cy, 72, (a - d - 3) * RAD), pol(cx, cy, 112, (a - d) * RAD), pol(cx, cy, 112, (a + d) * RAD), pol(cx, cy, 72, (a + d + 3) * RAD)];
    S('polygon', { points: pts(p), class: 'tur-pomicni' }, gPr);
  }
  S('circle', { cx, cy, r: 50, class: 'tur-utor' }, gPr);
  // tarna spojka i vratilo
  S('circle', { cx, cy, r: 49, fill: svg.srafura, class: 'tur-presjek' }, svg);
  const gVr = S('g', {}, svg);
  S('circle', { cx, cy, r: 34, class: 'tur-metal' }, gVr);
  S('line', { x1: cx, y1: cy, x2: cx, y2: cy - 32, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, gVr);
  S('circle', { cx, cy, r: 6, class: 'tur-tamno' }, gVr);
  // elektromagnet, opruga, zatik
  const gEm = S('g', {}, svg);
  const zav = S('rect', { x: cx - 36, y: cy - 222, width: 72, height: 50, rx: 4, class: 'tur-zavojnica' }, gEm);
  for (let k = 0; k < 7; k++) S('line', { x1: cx - 36 + 6 + k * 10, y1: cy - 222, x2: cx - 36 + 6 + k * 10, y2: cy - 172, class: 'tur-namot' }, gEm);
  S('rect', { x: cx - 14, y: cy - 222, width: 28, height: 50, class: 'tur-utor' }, gEm);
  const opr = S('polyline', { class: 'tur-opruga' }, svg);
  const zatik = S('rect', { x: cx - 11, width: 22, height: 64, rx: 3, class: 'tur-zatik' }, svg);
  const tKlik = T(svg, cx + 40, cy - 104, '', 'tur-klik-t');
  // oznake
  T(svg, cx + 46, cy - 204, 'elektromagnet', 'tur-ls');
  T(svg, cx + 46, cy - 184, 'i opruga', 'tur-ls');
  T(svg, cx + 46, cy - 140, 'zatik', 'tur-ls');
  T(svg, cx, cy + 140, 'prsten s krilcima', 'tur-ls', 'middle');
  T(svg, cx, cy + 162, 'tarna spojka · vratilo', 'tur-ls', 'middle');
  // graf
  const gG = S('g', {}, svg);
  const GR = { x: 346, y: 44, w: 240, h: 170 };
  const gr0 = graf(gG, GR.x, GR.y, GR.w, GR.h, { x0: 0, x1: 1, y0: 0, y1: 1, yt: [], naslov: 'kut, strana motora (6 s)' });
  const kV = S('polyline', { class: 'tur-krivulja' }, gG), kP = S('polyline', { class: 'tur-krivulja-z' }, gG);
  T(gG, GR.x + 8, GR.y + GR.h + 22, '— vratilo   - - prsten s krilcima', 'tur-ls');
  // traka momenta
  const MB = { x: 346, y: 300, w: 240 };
  T(svg, MB.x, MB.y - 14, 'vanjski moment na zglobu', 'tur-ls');
  S('rect', { x: MB.x, y: MB.y, width: MB.w, height: 18, rx: 4, class: 'tur-traka' }, svg);
  const mx = v => MB.x + (v + 120) / 240 * MB.w;
  for (const v of [-TSL, TSL]) { S('line', { x1: mx(v), y1: MB.y - 4, x2: mx(v), y2: MB.y + 22, stroke: B.crv, 'stroke-width': 2.5 }, svg); }
  T(svg, mx(TSL), MB.y + 42, '±80 Nm', 'tur-ls', 'middle');
  T(svg, mx(0), MB.y + 42, '0', 'tur-ls', 'middle');
  const mTr = S('rect', { y: MB.y + 2, height: 14, rx: 3, fill: 'var(--teal)' }, svg);
  const tPr = T(svg, MB.x, MB.y + 76, '', 'tur-l');

  const lugDist = lam => { // najmanji kutni razmak krilca do zatika (zatik na −90°), s predznakom
    let best = 1e9;
    for (let k = 0; k < NK; k++) { let d = ((lam + k * 360 / NK + 90) % 360 + 540) % 360 - 180; if (Math.abs(d) < Math.abs(best)) best = d; }
    return best;
  };
  // koliko se prsten smije zakrenuti u smjeru sm (±1) prije nego krilce udari u zatik
  const slobodno = (lam, sm) => {
    let fr = 1e9;
    for (let k = 0; k < NK; k++) {
      const d = ((lam + k * 360 / NK + 90) % 360 + 540) % 360 - 180;
      if (Math.sign(d) === -sm || d === 0) fr = Math.min(fr, Math.max(0, Math.abs(d) - POLA));
    }
    return fr;
  };
  function osvjezi() {
    gVr.setAttribute('transform', `rotate(${st.fi.toFixed(2)} ${cx} ${cy})`);
    gPr.setAttribute('transform', `rotate(${st.lam.toFixed(2)} ${cx} ${cy})`);
    const yb = lin(cy - 124, cy - 86, st.p);
    zatik.setAttribute('y', f1(yb - 64));
    opr.setAttribute('points', opruga(cx, cy - 222, cx, yb - 64, 9, 9));
    zav.classList.toggle('tur-pod-napajanjem', st.nap);
    tKlik.textContent = st.klik > 0 ? 'klik!' : '';
    // graf
    const h = st.hist;
    if (h.length > 1) {
      const t1 = h[h.length - 1][0], t0 = t1 - 6;
      let mn = 1e9, mxv = -1e9;
      for (const q of h) { mn = Math.min(mn, q[1], q[2]); mxv = Math.max(mxv, q[1], q[2]); }
      const sred = (mn + mxv) / 2, raspon = Math.max(60, (mxv - mn) * 1.2);
      const X = t => GR.x + (t - t0) / 6 * GR.w, Y = v => GR.y + GR.h / 2 - (v - sred) / raspon * GR.h;
      kV.setAttribute('points', h.map(q => f1(X(q[0])) + ',' + f1(Y(q[1]))).join(' '));
      kP.setAttribute('points', h.map(q => f1(X(q[0])) + ',' + f1(Y(q[2]))).join(' '));
    }
    const a = Math.min(mx(0), mx(st.Tv)), b2 = Math.max(mx(0), mx(st.Tv));
    mTr.setAttribute('x', f1(a)); mTr.setAttribute('width', f1(Math.max(1, b2 - a)));
    mTr.setAttribute('fill', Math.abs(st.Tv) > TSL ? B.crv : 'var(--teal)');
    tPr.textContent = st.prok > 0.01 ? `proklizalo: ${hr(st.prok / I, 2)}° na zglobu` : '';
    o.nap(st.nap ? 'uključeno' : 'isključeno', st.nap ? 'ok' : 'upoz');
    o.zat(st.p > 0.25 ? (st.p < 0.99 ? 'na krilcu / izlazi' : 'izvučen') : (st.p < 0.01 ? 'povučen' : 'kreće se'));
    o.tv(hr(st.Tv, 0) + ' Nm', Math.abs(st.Tv) > TSL ? 'opas' : '');
    o.q(hr(st.fi / I, 3) + '°');
    o.pr(hr(st.prok / I, 3) + '°', st.prok > 0.01 ? 'upoz' : '');
  }
  // jedan korak fizike; vrati true ako se nešto giba
  function korak(dt) {
    let giba = false;
    // zatik
    const cilj = st.nap || st.zaglavljen ? 0 : 1;
    const p0 = st.p;
    if (cilj < st.p) st.p = Math.max(0, st.p - dt / 0.12); else if (cilj > st.p) st.p = Math.min(1, st.p + dt / 0.08);
    if (st.p > 0.25 && p0 <= 0.25 && Math.abs(lugDist(st.lam)) < POLA) st.p = 0.25;       // zatik sjeda na krilce i čeka uvalu
    if (st.p !== p0) giba = true;
    // brzina vratila
    let w = 0, gura = false;
    if (st.test) w = st.test.w;
    else if (st.nap) w = st.motor ? 90 * st.smjer : 0;
    else if (Math.abs(st.Tv) >= 3) { w = Math.sign(st.Tv) * (Math.abs(st.Tv) > TSL ? 25 + (Math.abs(st.Tv) - TSL) * 1.2 : 40); gura = true; }
    else w = st.om * Math.exp(-3 * dt);                                                     // vratilo se samo zavrti do kraja
    if (Math.abs(w) < 0.5 && !gura && !st.test) w = 0;
    const dFi = w * dt;
    const zahvat = st.p > 0.25;
    let dLam = dFi;
    if (zahvat && dFi !== 0) {
      const sm = Math.sign(dFi), fr = slobodno(st.lam, sm);
      if (Math.abs(dFi) >= fr) {
        dLam = sm * fr;
        if (Math.abs(st.om) > 5 && !st.blok) { st.klik = 0.6; }
        st.blok = true;
      } else st.blok = false;
    } else if (!zahvat) st.blok = false;
    let dFiStv = dFi;
    if (st.blok) {
      const proklizava = Math.abs(st.Tv) > TSL && !st.nap && Math.sign(st.Tv) === Math.sign(dFi);
      if (proklizava) dFiStv = dFi;                                 // vratilo proklizava u tarnoj spojci
      else if (!gura && !st.test && Math.abs(st.om) > 5) { st.om *= Math.exp(-14 * dt); dFiStv = st.om * dt; }  // udar: kratko proklizavanje
      else dFiStv = dLam;
      st.prok += Math.abs(dFiStv - dLam);
    }
    st.fi += dFiStv; st.lam += dLam;
    st.om = dt > 0 ? dFiStv / dt : 0;
    if (Math.abs(dFiStv) > 1e-4 || Math.abs(dLam) > 1e-4) giba = true;
    if (st.klik > 0) { st.klik -= dt; giba = true; }
    return giba;
  }
  ctx.petlja(dt => {
    st.t += dt;
    if (st.test) testKorak(dt);
    const giba = korak(dt) || !!st.test;
    st.hist.push([st.t, st.fi, st.lam + 60]);
    while (st.hist.length > 2 && st.hist[0][0] < st.t - 6.2) st.hist.shift();
    if (!st.test && !st.tiho) {
      if (st.klik > 0.55) ui.stanje('Klik! Krilce je udarilo u zatik. Vratilo je u tarnoj spojci malo proklizalo — tako spojka prigušuje udar.', 'upoz');
      else if (st.blok && Math.abs(st.Tv) > TSL && !st.nap) ui.stanje('Vanjski moment veći je od momenta proklizavanja: prsten s krilcima stoji na zatiku, a vratilo i zglob proklizavaju u tarnoj spojci. Tako se zglob pomiče samo u nuždi.', 'opas');
      else if (st.blok && !st.nap && Math.abs(st.Tv) >= 3) ui.stanje('Krilce naliježe na zatik: kočnica drži zglob. Promijeni smjer momenta — zglob se pomakne samo dok drugo krilce ne udari u zatik.', 'ok');
      else if (!st.nap && Math.abs(st.Tv) >= 3) ui.stanje('Zglob se pod vanjskim momentom pomiče do naslona krilca na zatik (zračnost između krilaca).');
      else if (st.nap && st.motor) ui.stanje('Kočnica ima napajanje: elektromagnet drži zatik povučen, vratilo se slobodno vrti.');
      else if (st.nap) ui.stanje('Zatik je povučen, a motor drži zglob na mjestu — vanjski moment preuzima motor.');
    }
    osvjezi();
    return giba || st.klik > 0;
  });
  // test kočnice pri pokretanju (pojednostavljeno)
  function testKorak(dt) {
    const t = st.test; t.t += dt;
    if (t.f === 0 && t.t > 0.6) { t.f = 1; t.t = 0; t.fi0 = st.fi; t.w = 50; ui.stanje('Test 1/3: motor zakreće vratilo naprijed; očekuje se udar krilca u zatik unutar ≈ 46° na strani motora.'); }
    else if (t.f === 1) {
      if (st.blok && t.t > 0.1) { t.f = 2; t.t = 0; t.fi0 = st.fi; t.w = -50; ui.stanje('Test 2/3: krilce je naslonjeno. Motor sada zakreće natrag do drugog krilca.'); }
      else if (st.fi - t.fi0 > 48) neuspjeh();
    } else if (t.f === 2) {
      if (st.blok && t.t > 0.1) { t.f = 3; t.t = 0; t.w = 0; st.nap = true; segN.postavi(true); ui.stanje('Test 3/3: kočnice prošle provjeru. Brake release — zatik se povlači i zglob se oslobađa (vidljiv mali trzaj).'); }
      else if (t.fi0 - st.fi > 48) neuspjeh();
    } else if (t.f === 3) {
      t.w = t.t < 0.15 ? 25 : t.t < 0.3 ? -25 : 0;
      if (t.t > 0.6) { st.test = null; st.motor = false; bM.textContent = 'Motor vrti'; bM.setAttribute('aria-pressed', 'false'); bT.disabled = false; kl.ulaz.disabled = false; st.tiho = true; ui.stanje('Test kočnice je prošao, zglob je spreman za rad.', 'ok'); }
    }
  }
  function neuspjeh() {
    st.test = null; bT.disabled = false; kl.ulaz.disabled = false; st.tiho = true;
    ui.stanje('Brake test failed — check brakepin: vratilo se okrenulo dalje nego što krilca dopuštaju, zatik nije zahvatio. Robot se ne smije pustiti u rad.', 'opas');
  }
  const segN = ui.seg('Napajanje kočnice', [[true, 'Uključeno'], [false, 'Isključeno']], true, v => { st.nap = v; st.tiho = false; if (!v) st.om = st.motor ? 90 * st.smjer : 0; ctx.budi(); });
  const r = ui.red();
  const bM = ui.gumb('Zaustavi motor', (e, b) => { st.motor = !st.motor; st.tiho = false; b.textContent = st.motor ? 'Zaustavi motor' : 'Motor vrti'; b.setAttribute('aria-pressed', String(st.motor)); if (!st.nap && st.motor) ui.stanje('Motor ne može vrtjeti dok je kočnica bez napajanja — najprije uključi napajanje kočnice.', 'upoz'); ctx.budi(); }, { pritisak: true, u: r });
  ui.gumb('Promijeni smjer', () => { st.smjer *= -1; st.tiho = false; ctx.budi(); }, { tanki: true, u: r });
  const bT = ui.gumb('Test kočnice', () => {
    st.test = { f: 0, t: 0, w: 0 }; st.nap = false; segN.postavi(false); st.Tv = 0; kl.postavi(0); kl.ulaz.disabled = true; bT.disabled = true; st.motor = false; st.om = 0;
    ui.stanje('Pokretanje robota: kočnica je zatvorena (zatik izvučen), upravljanje počinje provjeru…');
    ctx.budi();
  }, { tanki: true, u: r });
  const kl = ui.klizac('Vanjski moment na zglobu (npr. guranje rukom)', -120, 120, 5, 0, v => hrp(v, 0) + ' Nm', v => { st.Tv = v; st.tiho = false; ctx.budi(); });
  ui.kvacica('Kvar: zatik zaglavljen u povučenom položaju', false, v => { st.zaglavljen = v; ctx.budi(); });
  const o = ui.ocit([['nap', 'Napajanje kočnice'], ['zat', 'Zatik'], ['tv', 'Vanjski moment (proklizavanje pri ±80 Nm)'], ['q', 'Kut zgloba (vratilo / 100)'], ['pr', 'Proklizavanje spojke (na zglobu)']]);
  osvjezi();
  ui.stanje('Kočnica ima napajanje, vratilo se vrti. Isključi napajanje kočnice.');
  ctx.budi();
}

/* =========================================================== 3. enkoderi */
function tEnkoderi(ui, ctx) {
  const I = 100, PRAG = 0.5;
  const st = { radi: false, t: 0, qz: 0, fm: 0, qs: 0, qm: 0, kvar: 'ok', izazvan: false, tk: 0, pomak: 0, sum: 0, stop: false, hist: [] };
  const svg = ui.svg(600, 474, 'Enkoder motora prije prijenosnika i enkoder zgloba iza prijenosnika; ispod grafovi kuta i razlike kutova');
  function disk(cx, cy, n, nas) {
    const g = S('g', {}, svg);
    T(svg, cx, 28, nas, 'tur-l', 'middle');
    const rot = S('g', {}, g);
    S('circle', { cx, cy, r: 72, class: 'tur-disk' }, rot);
    for (let k = 0; k < n; k++) {
      if (k % 2) continue;
      const a0 = 2 * Math.PI * k / n, a1 = 2 * Math.PI * (k + 1) / n;
      const p = [pol(cx, cy, 54, a0), pol(cx, cy, 70, a0), pol(cx, cy, 70, a1), pol(cx, cy, 54, a1)];
      S('polygon', { points: pts(p), class: 'tur-kod' }, rot);
    }
    S('circle', { cx, cy, r: 18, class: 'tur-tamno' }, rot);
    S('line', { x1: cx, y1: cy, x2: cx, y2: cy - 50, stroke: B.crv, 'stroke-width': 4, 'stroke-linecap': 'round' }, rot);
    S('rect', { x: cx - 12, y: cy - 84, width: 24, height: 22, rx: 3, class: 'tur-glava' }, g);
    const sv = S('circle', { cx, cy: cy - 73, r: 4, fill: B.zut }, g);
    return { rot, sv, cx, cy };
  }
  const dM = disk(100, 122, 36, 'enkoder motora');
  const dZ = disk(500, 122, 90, 'enkoder zgloba');
  // vratilo i prijenosnik
  S('line', { x1: 172, y1: 122, x2: 236, y2: 122, class: 'tur-vratilo' }, svg);
  S('line', { x1: 364, y1: 122, x2: 428, y2: 122, class: 'tur-vratilo-d' }, svg);
  const gPr = S('g', {}, svg);
  S('rect', { x: 236, y: 82, width: 128, height: 80, rx: 8, class: 'tur-blok' }, gPr);
  T(gPr, 300, 116, 'valni', 'tur-l', 'middle');
  T(gPr, 300, 138, 'i = 100', 'tur-l', 'middle');
  T(svg, 204, 108, 'brzo', 'tur-ls', 'middle');
  T(svg, 396, 108, 'sporo', 'tur-ls', 'middle');
  const tFm = T(svg, 100, 226, '', 'tur-l', 'middle');
  const tQ = T(svg, 500, 226, '', 'tur-l', 'middle');
  const tAlarm = T(svg, 300, 200, '', 'tur-alarm', 'middle');
  // grafovi
  const g1 = graf(svg, 52, 268, 532, 100, { x0: 0, x1: 10, y0: -16, y1: 16, yt: [-10, 0, 10], naslov: 'kut zgloba [°]: iz motora (φ_m / i) i izmjereni (q)' });
  const k1 = S('polyline', { class: 'tur-krivulja' }, svg), k2 = S('polyline', { class: 'tur-krivulja-z' }, svg);
  const g2 = graf(svg, 52, 404, 532, 60, { x0: 0, x1: 10, y0: -2, y1: 2, yt: [-1, 0, 1], naslov: 'razlika q − φ_m / i [°], prag ±0,5°' });
  for (const v of [-PRAG, PRAG]) S('line', { x1: 52, x2: 584, y1: f1(g2.Y(v)), y2: f1(g2.Y(v)), class: 'tur-prag' }, svg);
  const k3 = S('polyline', { class: 'tur-krivulja-r' }, svg);

  function osvjezi() {
    dM.rot.setAttribute('transform', `rotate(${(st.fm % 360).toFixed(2)} ${dM.cx} ${dM.cy})`);
    dZ.rot.setAttribute('transform', `rotate(${st.qm.toFixed(3)} ${dZ.cx} ${dZ.cy})`);
    tFm.textContent = 'φ_m = ' + hr(st.fm, 0) + '°';
    tQ.textContent = 'q = ' + hr(st.qm, 2) + '°';
    const h = st.hist, t1 = h.length ? h[h.length - 1][0] : 0, t0 = Math.max(0, t1 - 10);
    const X = t => 52 + (t - t0) / 10 * 532;
    k1.setAttribute('points', h.map(q => f1(X(q[0])) + ',' + f1(g1.Y(q[1]))).join(' '));
    k2.setAttribute('points', h.map(q => f1(X(q[0])) + ',' + f1(g1.Y(q[2]))).join(' '));
    k3.setAttribute('points', h.map(q => f1(X(q[0])) + ',' + f1(g2.Y(ogr(q[2] - q[1], -2, 2)))).join(' '));
    const e = st.qm - st.fm / I;
    tAlarm.textContent = st.stop ? 'ZAUSTAVLJENO' : '';
    o.fm(hr(st.fm, 1) + '°'); o.fmi(hr(st.fm / I, 3) + '°'); o.q(hr(st.qm, 3) + '°');
    o.e(hrp(e, 3) + '°', Math.abs(e) > PRAG ? 'opas' : Math.abs(e) > PRAG / 2 ? 'upoz' : 'ok');
    o.w(hr(st.w || 0, 1) + ' °/s · ' + hr((st.w || 0) * I / 6, 0) + ' o/min');
  }
  ctx.petlja(dt => {
    if (!st.radi || st.stop) { osvjezi(); return false; }
    st.t += dt;
    const qz = 12 * Math.sin(2 * Math.PI * st.t / 10);
    st.w = (qz - st.qz) / dt; st.qz = qz;
    const acc = -12 * Math.pow(2 * Math.PI / 10, 2) * Math.sin(2 * Math.PI * st.t / 10);
    st.fm = I * qz;
    st.qs = qz - 0.004 * acc + st.pomak;                        // mala elastična razlika + trajni pomak (preskakanje)
    st.qm = st.qs;
    if (st.izazvan) {
      st.tk += dt;
      if (st.kvar === 'zubi' && st.tk > 0.6) st.pomak = Math.max(-3.6, st.pomak - dt * 60);      // 2 zuba od 200 = 3,6°
      if (st.kvar === 'enk' && st.tk > 0.6) { st.sum = (Math.random() < 0.15 ? (Math.random() - 0.5) * 2.4 : st.sum * 0.7); st.qm = st.qs + st.sum + (Math.random() - 0.5) * 0.12; }
    }
    st.hist.push([st.t, st.fm / I, st.qm]);
    while (st.hist.length > 2 && st.hist[0][0] < st.t - 10.2) st.hist.shift();
    const e = st.qm - st.fm / I;
    if (Math.abs(e) > PRAG) {
      st.stop = true; bP.disabled = true;
      ui.stanje(st.kvar === 'zubi'
        ? `Sudden position change detected on the joint-encoder: izlaz je naglo zaostao (${hr(e, 2)}°) — prijenosnik je pod preopterećenjem preskočio zube. Zglob se zaustavlja; pritisni „Poništi”.`
        : `Joint encoder error: očitanje enkodera zgloba skače (${hrp(e, 2)}°), a motor se giba jednoliko — enkoder ili njegov signal su neispravni. Zglob se zaustavlja; pritisni „Poništi”.`, 'opas');
    } else if (st.izazvan && st.tk <= 0.6) ui.stanje('Kvar se upravo događa…', 'upoz');
    else ui.stanje('Enkoderi se slažu: kut motora podijeljen sa 100 jednak je kutu zgloba (razlika je samo elastična, stotinke stupnja).', 'ok');
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bP = ui.gumb('Pokreni', (e, b) => { st.radi = !st.radi; b.textContent = st.radi ? 'Zaustavi' : 'Pokreni'; b.setAttribute('aria-pressed', String(st.radi)); ctx.budi(); }, { pritisak: false, u: r });
  const bK = ui.gumb('Izazovi kvar', () => {
    if (st.kvar === 'ok') { ui.stanje('Najprije odaberi vrstu kvara.', 'upoz'); return; }
    st.izazvan = true; st.tk = 0;
    if (!st.radi) { st.radi = true; bP.textContent = 'Zaustavi'; bP.setAttribute('aria-pressed', 'true'); }
    ctx.budi();
  }, { tanki: true, u: r });
  ui.gumb('Poništi', () => {
    st.stop = false; st.izazvan = false; st.pomak = 0; st.sum = 0; st.tk = 0; st.hist = []; bP.disabled = false;
    st.fm = I * st.qz; st.qm = st.qz;
    ui.stanje('Greška je poništena. Pokreni ponovno.'); osvjezi(); ctx.budi();
  }, { tanki: true, u: r });
  ui.seg('Vrsta kvara', [['ok', 'Bez kvara'], ['zubi', 'Preskakanje zubi'], ['enk', 'Kvar enkodera zgloba']], 'ok', v => { st.kvar = v; st.izazvan = false; st.pomak = 0; st.sum = 0; });
  const o = ui.ocit([['fm', 'Kut motora φ_m (enkoder motora)'], ['fmi', 'Kut zgloba iz motora φ_m / i'], ['q', 'Kut zgloba q (enkoder zgloba)'], ['e', 'Razlika q − φ_m / i'], ['w', 'Brzina zgloba · brzina motora']]);
  ui.sitno('Jedan okretaj motora = 3,6° zgloba. Zato je enkoder motora, gledano na izlazu, sto puta finiji — ali ne vidi što se događa iza prijenosnika.');
  osvjezi();
  ui.stanje('Pritisni „Pokreni”.');
}

/* =========================================================== 4. motor */
function tMotor(ui, ctx) {
  const KM = 0.1, J = 0.06, BTR = 0.25;                       // k_M [Nm/A]; tromost i trenje u prikazu
  const FAZ = [{ n: 'U', a: 0, c: B.lj }, { n: 'V', a: 120, c: B.zel }, { n: 'W', a: 240, c: B.pl }];
  const st = { I: 6, kom: 'sin', pom: 0, th: 0, w: 0, iu: 0, iv: 0, iw: 0, M: 0, gam: 0, del: 90 };
  const svg = ui.svg(600, 420, 'Presjek motora bez četkica: stator sa šest zubi i namotima tri faze, rotor s trajnim magnetom; desno struje faza i moment');
  const cx = 188, cy = 214;
  // stator
  S('circle', { cx, cy, r: 168, class: 'tur-stator' }, svg);
  S('circle', { cx, cy, r: 132, class: 'tur-utor' }, svg);
  const zubi = [];
  const RASP = [[0, 1], [2, -1], [1, 1], [0, -1], [2, 1], [1, -1]];      // zub k: faza, predznak (U+, W−, V+, U−, W+, V−)
  for (let k = 0; k < 6; k++) {
    const a = k * 60 * RAD, [f, s] = RASP[k];
    const g = S('g', {}, svg);
    const p = [pol(cx, cy, 134, a - 0.2), pol(cx, cy, 104, a - 0.2), pol(cx, cy, 96, a - 0.32), pol(cx, cy, 96, a + 0.32), pol(cx, cy, 104, a + 0.2), pol(cx, cy, 134, a + 0.2)];
    S('polygon', { points: pts(p), class: 'tur-stator' }, g);
    const nam = [];
    for (const sg of [-1, 1]) {
      const q = [pol(cx, cy, 130, a + sg * 0.21), pol(cx, cy, 108, a + sg * 0.21), pol(cx, cy, 108, a + sg * 0.42), pol(cx, cy, 130, a + sg * 0.36)];
      nam.push(S('polygon', { points: pts(q), fill: FAZ[f].c, class: 'tur-namot-f' }, g));
    }
    const tip = S('path', { d: luk(cx, cy, 99, a - 0.3, a + 0.3), class: 'tur-pol' }, g);
    const lp = pol(cx, cy, 150, a);
    T(g, f1(lp[0]), f1(lp[1] + 6), FAZ[f].n + (s > 0 ? '+' : '−'), 'tur-lb tur-na-statoru', 'middle');
    zubi.push({ f, s, nam, tip });
  }
  // rotor
  const gR = S('g', {}, svg);
  S('path', { d: `M${cx},${cy - 86} A86,86 0 0 1 ${cx},${cy + 86}Z`, fill: B.crv, class: 'tur-magnet' }, gR);
  S('path', { d: `M${cx},${cy + 86} A86,86 0 0 1 ${cx},${cy - 86}Z`, class: 'tur-magnet tur-magnet-s' }, gR);
  T(gR, cx + 50, cy + 9, 'N', 'tur-lb tur-na-magnetu', 'middle');
  T(gR, cx - 50, cy + 9, 'S', 'tur-lb tur-na-magnetu', 'middle');
  S('circle', { cx, cy, r: 16, class: 'tur-tamno' }, gR);
  const sRot = strel(svg, cx, cy, cx + 70, cy, { boja: '#8f1d14', w: 5, gl: 16 });
  const sPol = strel(svg, cx, cy, cx, cy - 80, { boja: B.nar, w: 6, gl: 18 });
  const tDel = T(svg, cx, 412, '', 'tur-ls', 'middle');
  // struje faza
  const gS = graf(svg, 384, 50, 204, 140, { x0: 0, x1: 360, y0: -1.15, y1: 1.15, yt: [0], ylab: false, naslov: 'struje faza / kut rotora' });
  const kF = FAZ.map(f => S('polyline', { class: 'tur-faza', stroke: f.c }, svg));
  const kur = S('line', { y1: 50, y2: 190, class: 'tur-kursor' }, svg);
  T(svg, 384, 210, '0°', 'tur-ls'); T(svg, 588, 210, '360°', 'tur-ls', 'end');
  FAZ.forEach((f, j) => { S('rect', { x: 392 + j * 66, y: 226, width: 14, height: 14, rx: 3, fill: f.c }, svg); T(svg, 412 + j * 66, 239, 'i_' + f.n, 'tur-ls'); });
  // moment
  T(svg, 384, 286, 'moment M', 'tur-ls');
  S('rect', { x: 384, y: 298, width: 204, height: 22, rx: 4, class: 'tur-traka' }, svg);
  S('line', { x1: 486, y1: 294, x2: 486, y2: 324, class: 'tur-mreza0' }, svg);
  const mTr = S('rect', { y: 301, height: 16, rx: 3, fill: 'var(--teal)' }, svg);
  T(svg, 384, 342, '−1 Nm', 'tur-ls'); T(svg, 588, 342, '+1 Nm', 'tur-ls', 'end');
  const tM = T(svg, 486, 376, '', 'tur-lb', 'middle');

  function struje(thE) {           // kut rotora (°) → [iU,iV,iW], kut polja
    const thMj = thE - st.pom;     // kut koji javlja enkoder
    let g = thMj + 90;
    if (st.kom === 'blok') {
      const gq = Math.round((g - 30) / 60) * 60 + 30;
      return [FAZ.map(f => { const c = Math.cos((gq - f.a) * RAD); return Math.abs(c) > 0.6 ? st.I * Math.sign(c) : 0; }), gq];
    }
    return [FAZ.map(f => st.I * Math.cos((g - f.a) * RAD)), g];
  }
  function polje(i) { // vektor polja statora iz struja (u jedinicama struje)
    let x = 0, y = 0;
    FAZ.forEach((f, j) => { x += i[j] * Math.cos(f.a * RAD); y += i[j] * Math.sin(f.a * RAD); });
    return [x, y];
  }
  function krivulje() {
    FAZ.forEach((f, j) => {
      const p = [];
      for (let a = 0; a <= 360; a += 2) { const [i] = struje(a); p.push([gS.X(a), gS.Y(i[j] / 10)]); }
      kF[j].setAttribute('points', pts(p));
    });
  }
  function osvjezi() {
    const thd = ((st.th / RAD) % 360 + 360) % 360;
    const [i, g] = struje(thd);
    const [bx, by] = polje(i);
    const Bm = Math.hypot(bx, by), ga = Math.atan2(by, bx);
    st.del = ((ga / RAD - thd) % 360 + 540) % 360 - 180;
    st.M = KM * (2 / 3) * Bm * Math.sin(st.del * RAD);
    gR.setAttribute('transform', `rotate(${thd.toFixed(2)} ${cx} ${cy})`);
    sRot.set(cx, cy, cx + 74 * Math.cos(st.th), cy + 74 * Math.sin(st.th));
    const L = 34 + 7 * Bm;
    sPol.set(cx, cy, cx + L * Math.cos(ga), cy + L * Math.sin(ga));
    sPol.style.display = Bm > 0.05 ? '' : 'none';
    zubi.forEach(z => {
      const v = z.s * i[z.f] / 10;
      z.nam.forEach(n => n.style.opacity = (0.18 + 0.82 * Math.abs(i[z.f]) / 10).toFixed(2));
      z.tip.style.stroke = v > 0.02 ? '#5d7c90' : v < -0.02 ? B.crv : 'transparent';
      z.tip.style.strokeWidth = (3 + 6 * Math.abs(v)).toFixed(1);
    });
    kur.setAttribute('x1', f1(gS.X(thd))); kur.setAttribute('x2', f1(gS.X(thd)));
    const a = Math.min(486, 486 + st.M * 102), b = Math.max(486, 486 + st.M * 102);
    mTr.setAttribute('x', f1(a)); mTr.setAttribute('width', f1(Math.max(1, b - a)));
    mTr.setAttribute('fill', st.M < -0.01 ? B.crv : 'var(--teal)');
    tM.textContent = hr(st.M, 2) + ' Nm';
    tDel.textContent = Bm > 0.05 ? `δ = ${hr(st.del, 0)}° (polje statora prema osi rotora)` : 'nema struje — nema polja statora';
    o.I(hr(st.I, 1) + ' A'); o.M(hr(st.M, 2) + ' Nm', Math.abs(st.M) < 0.05 && st.I > 0.5 ? 'opas' : st.M < 0 ? 'upoz' : 'ok');
    o.d(Bm > 0.05 ? hr(st.del, 0) + '°' : '—');
    o.i(i.map((v, j) => FAZ[j].n + ' ' + hr(v, 1)).join(' · ') + ' A');
    o.w(hr(st.w / (2 * Math.PI), 2) + ' okr./s (prikaz)');
  }
  ctx.petlja(dt => {
    const n = Math.max(1, Math.round(dt / 0.004)), h = dt / n;
    for (let k = 0; k < n; k++) {
      const thd = st.th / RAD;
      const [i] = struje(thd);
      const [bx, by] = polje(i);
      const del = Math.atan2(by, bx) - st.th;
      const M = KM * (2 / 3) * Math.hypot(bx, by) * Math.sin(del);
      st.w += (M - BTR * st.w) / J * h;
      st.th += st.w * h;
    }
    osvjezi();
    if (st.I < 0.05 && Math.abs(st.w) < 0.01) { st.w = 0; return false; }
    if (st.pom === 90 && Math.abs(st.w) < 0.01) { st.w = 0; return false; }
    return true;
  });
  ui.klizac('Struja (amplituda) I', 0, 10, 0.5, st.I, v => hr(v, 1) + ' A', v => { st.I = v; krivulje(); poruka(); ctx.budi(); });
  ui.seg('Komutacija', [['sin', 'Sinusna'], ['blok', 'Blok (6 koraka)']], 'sin', v => { st.kom = v; krivulje(); poruka(); ctx.budi(); });
  ui.seg('Kut rotora iz enkodera motora', [[0, 'Ispravan'], [90, 'Pomaknut 90°'], [180, 'Pomaknut 180°']], 0, v => { st.pom = v; krivulje(); poruka(); ctx.budi(); });
  const o = ui.ocit([['I', 'Struja I'], ['M', 'Moment M'], ['d', 'Kut δ između polja'], ['i', 'Trenutne struje faza'], ['w', 'Brzina rotora']]);
  function poruka() {
    if (st.I < 0.05) ui.stanje('Bez struje nema polja statora i nema momenta — rotor se zaustavlja.');
    else if (st.pom === 90) ui.stanje('Enkoder javlja kut pomaknut za 90°: elektronika postavlja polje u smjeru osi rotora (δ = 0). Struja teče, motor se grije, ali moment je nula.', 'opas');
    else if (st.pom === 180) ui.stanje('Kut pomaknut za 180°: polje zaostaje za rotorom 90°, moment je negativan i motor se vrti unatrag.', 'upoz');
    else if (st.kom === 'blok') ui.stanje('Blok-komutacija: uvijek vode dvije faze, polje skače po 60°, a δ se mijenja od 60° do 120° — moment pulsira.', 'upoz');
    else ui.stanje('Sinusna komutacija: polje statora vrti se jednoliko i uvijek prednjači rotoru za 90° — moment je stalan i razmjeran struji.', 'ok');
  }
  krivulje(); osvjezi(); poruka(); ctx.budi();
}

/* =========================================================== 5. kaskadna regulacija */
function tRegulacija(ui, ctx) {
  const J = 0.4, TAU = 0.001, TS = 0.002, TMAX = 54, H = 0.0001, USP = 2;
  const st = { Kp: 20, Kv: 12, q: 0, w: 0, T: 0, Ii: 0, qz: 0, tn: 0, t: 0, radi: false, teret: false, start: 0, cilj: Math.PI / 2, hist: [], prikaz: 'cijelo', tok: 0, gotovo: false };
  const svg = ui.svg(600, 566, 'Blok-shema kaskadne regulacije zgloba (položaj, brzina, struja) s povratnim vezama iz enkodera zgloba, enkodera motora i mjerenja struje; ispod graf zadanog i stvarnog kuta');
  const blokovi = [];
  const blok = (x, y, w, h, t1, t2, kl) => {
    const g = S('g', { class: 'tur-rb' + (kl ? ' ' + kl : '') }, svg);
    S('rect', { x, y, width: w, height: h, rx: 8 }, g);
    T(g, x + w / 2, y + (t2 ? h / 2 - 3 : h / 2 + 6), t1, 'tur-l', 'middle');
    if (t2) T(g, x + w / 2, y + h / 2 + 18, t2, 'tur-ls', 'middle');
    blokovi.push(g);
    return g;
  };
  const vodovi = [];
  const vod = (pp, kl) => {
    const g = S('g', {}, svg);
    S('polyline', { points: pts(pp), class: 'tur-vod-r' }, g);
    const t = S('polyline', { points: pts(pp), class: 'tur-tok-r' + (kl ? ' ' + kl : '') }, g);
    const [a, b] = pp.slice(-2), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    S('polygon', { points: `${b[0]},${b[1]} ${f1(b[0] - ux * 10 - uy * 5)},${f1(b[1] - uy * 10 + ux * 5)} ${f1(b[0] - ux * 10 + uy * 5)},${f1(b[1] - uy * 10 - ux * 5)}`, class: 'tur-glava-v' }, g);
    vodovi.push(t);
    return g;
  };
  const sum = (x, y) => { const g = S('g', { class: 'tur-rb' }, svg); S('circle', { cx: x, cy: y, r: 15 }, g); T(g, x, y + 7, 'Σ', 'tur-lb', 'middle'); T(svg, x - 12, y + 34, '−', 'tur-lb', 'middle'); return g; };
  const Y1 = 66;
  T(svg, 8, 26, 'q_zad', 'tur-ls');
  vod([[10, Y1], [78, Y1]]);
  sum(95, Y1);
  vod([[110, Y1], [125, Y1]]);
  blok(125, Y1 - 30, 92, 60, 'Položaj', 'P, Kp');
  vod([[217, Y1], [228, Y1]]);
  sum(245, Y1);
  vod([[260, Y1], [275, Y1]]);
  blok(275, Y1 - 30, 92, 60, 'Brzina', 'PI, Kv');
  vod([[367, Y1], [378, Y1]]);
  sum(395, Y1);
  vod([[410, Y1], [425, Y1]]);
  blok(425, Y1 - 30, 92, 60, 'Struja', 'PI');
  vod([[517, Y1], [560, Y1], [560, 128]]);
  T(svg, 170, 22, 'ω_zad', 'tur-ls', 'middle'); T(svg, 322, 22, 'i_zad', 'tur-ls', 'middle'); T(svg, 538, 22, 'napon', 'tur-ls', 'middle');
  blok(420, 128, 170, 56, 'Motor', 'moment M');
  vod([[420, 156], [377, 156]]);
  blok(265, 128, 112, 56, 'Valni', 'i = 100');
  vod([[265, 156], [227, 156]]);
  blok(115, 128, 112, 56, 'Zglob', 'kut q');
  vod([[505, 184], [505, 206], [395, 206], [395, Y1 + 15]], 'tur-tok-pl');
  vod([[565, 184], [565, 226], [245, 226], [245, Y1 + 15]], 'tur-tok-pl');
  vod([[171, 184], [171, 246], [95, 246], [95, Y1 + 15]], 'tur-tok-pl');
  T(svg, 512, 200, 'struja i', 'tur-ls');
  T(svg, 330, 220, 'enkoder motora: ω', 'tur-ls', 'middle');
  T(svg, 110, 264, 'enkoder zgloba: q', 'tur-ls');
  // grafovi
  const gA = { x: 54, y: 306, w: 530, h: 140 };
  const okv1 = S('g', {}, svg);
  const gr = graf(okv1, gA.x, gA.y, gA.w, gA.h, { x0: 0, x1: 2, y0: -10, y1: 105, yt: [0, 45, 90], naslov: 'kut zgloba [°]: — stvarni   - - zadani' });
  const clG = S('clipPath', { id: ui.uid + '-gr' }, svg.defs);
  S('rect', { x: gA.x, y: gA.y, width: gA.w, height: gA.h }, clG);
  const kZ = S('polyline', { class: 'tur-krivulja-z', 'clip-path': `url(#${ui.uid}-gr)` }, svg), kS = S('polyline', { class: 'tur-krivulja', 'clip-path': `url(#${ui.uid}-gr)` }, svg);
  const tIspod = T(svg, gA.x + 10, gA.y + 22, '', 'tur-ls');
  const tX = T(svg, 584, 466, '', 'tur-ls', 'end');
  const gB = graf(svg, 54, 496, 530, 60, { x0: 0, x1: 2, y0: -8, y1: 8, yt: [-5, 0, 5], naslov: 'slijedna pogreška q_zad − q [°]' });
  const kE = S('polyline', { class: 'tur-krivulja-r' }, svg);
  const tY = [...okv1.querySelectorAll('text')].filter(t => t.getAttribute('text-anchor') === 'end');

  const V = 120 * RAD, A = 400 * RAD;
  function profil(t) {
    const D = st.cilj - st.start, s = Math.sign(D), Da = Math.abs(D), ta = V / A, da = 0.5 * A * ta * ta, tc = (Da - 2 * da) / V;
    let x;
    if (t < ta) x = 0.5 * A * t * t; else if (t < ta + tc) x = da + V * (t - ta); else if (t < 2 * ta + tc) { const u = 2 * ta + tc - t; x = Da - 0.5 * A * u * u; } else x = Da;
    return st.start + s * x;
  }
  function korak(dt) {
    const n = Math.round(dt / H);
    const Ki = st.Kv * 8;
    for (let k = 0; k < n; k++) {
      st.t += H;
      if (st.t >= st.tn - 1e-12) { st.qz = st.radi ? profil(st.t) : st.qz; st.tn += TS; }
      const wref = st.Kp * (st.qz - st.q);
      const e = wref - st.w;
      st.Ii += e * H;
      let Tc = st.Kv * e + Ki * st.Ii;
      if (Tc > TMAX || Tc < -TMAX) { Tc = ogr(Tc, -TMAX, TMAX); st.Ii -= e * H; }
      st.T += (Tc - st.T) / TAU * H;
      const Tl = st.teret ? 3 * 9.81 * 0.35 : 0;
      st.w += (st.T - Tl) / J * H; st.q += st.w * H;
      if (k % 5 === 0) st.hist.push([st.t, st.qz / RAD, st.q / RAD]);
    }
  }
  function osvjezi() {
    const h = st.hist;
    let t0 = 0, t1 = 2;
    if (st.prikaz === 'uv') { t0 = 0.2; t1 = 0.216; }
    else if (h.length && h[h.length - 1][0] > 2) { t1 = h[h.length - 1][0]; t0 = t1 - 2; }
    const X = t => gA.x + (t - t0) / (t1 - t0) * gA.w;
    let y0 = -10, y1 = 105;
    const vid = h.filter(q => q[0] >= t0 && q[0] <= t1);
    if (st.prikaz === 'uv' && vid.length > 2) {
      y0 = Math.min(...vid.map(q => q[1])); y1 = Math.max(...vid.map(q => q[1]));
      const m = (y1 - y0) * 0.12 + 0.05; y0 -= m; y1 += m;
    }
    const Y = v => gA.y + gA.h - (v - y0) / (y1 - y0) * gA.h;
    const vals = st.prikaz === 'uv' && vid.length > 2 ? [y0 + (y1 - y0) * 0.1, (y0 + y1) / 2, y1 - (y1 - y0) * 0.1] : [0, 45, 90];
    tY.forEach((t, j) => { t.setAttribute('y', f1(Y(vals[j]) + 5)); t.textContent = st.prikaz === 'uv' ? hr(vals[j], 1) : String(vals[j]); });
    okv1.querySelectorAll('.tur-mreza, .tur-mreza0').forEach((l, j) => { const yy = f1(Y(vals[j])); l.setAttribute('y1', yy); l.setAttribute('y2', yy); });
    // zadani: stepenice (zadrška 2 ms)
    const zad = [];
    let prev = null;
    for (const q of vid) { if (prev !== null && q[1] !== prev) zad.push([X(q[0]), Y(prev)]); zad.push([X(q[0]), Y(q[1])]); prev = q[1]; }
    kZ.setAttribute('points', pts(zad));
    kS.setAttribute('points', pts(vid.map(q => [X(q[0]), Y(q[2])])));
    kE.setAttribute('points', pts(vid.map(q => [X(q[0]), gB.Y(ogr(q[1] - q[2], -8, 8))])));
    kZ.setAttribute('class', st.prikaz === 'uv' ? 'tur-krivulja-zs' : 'tur-krivulja-z');
    tIspod.textContent = st.prikaz === 'uv' && vid.length > 2 ? `stvarni kut je ispod (zaostaje ${hr(vid[vid.length - 1][1] - vid[vid.length - 1][2], 1)}°)` : '';
    tX.textContent = st.prikaz === 'uv' ? 't = 200 … 216 ms (8 koraka po 2 ms)' : `t = ${hr(t0, 1)} … ${hr(t1, 1)} s (usporeno ${USP}×)`;
    const e = (st.qz - st.q) / RAD;
    o.qz(hr(st.qz / RAD, 2) + '°'); o.q(hr(st.q / RAD, 2) + '°');
    o.e(hr(e, 2) + '°', Math.abs(e) > 5 ? 'upoz' : '');
    o.w(hr(st.w / RAD, 0) + ' °/s');
    o.T(hr(st.T, 1) + ' Nm', Math.abs(st.T) > TMAX - 0.5 ? 'opas' : '');
    for (const v of vodovi) v.style.strokeDashoffset = f1(-st.tok);
    svg.classList.toggle('tur-tece', st.radi);
  }
  ctx.petlja(dt => {
    korak(dt / USP);
    st.tok += dt * 30;
    const kraj = st.radi && st.t > 1.3 && Math.abs(st.q - st.cilj) < 0.0005 && Math.abs(st.w) < 0.002;
    if (kraj) {
      st.radi = false; bP.disabled = false;
      const max = Math.max(...st.hist.map(q => Math.abs(q[1] - q[2])));
      const prebac = Math.max(...st.hist.map(q => (q[2] - st.cilj / RAD) * Math.sign(st.cilj - st.start)));
      ui.stanje(`Zglob je na ${hr(st.cilj / RAD, 0)}°. Najveća slijedna pogreška ${hr(max, 1)}°${prebac > 0.2 ? `, nadvišenje ${hr(prebac, 1)}° — petlja brzine je preslaba za ovaj Kp` : ', bez nadvišenja'}.`, prebac > 0.2 ? 'upoz' : 'ok');
      st.cilj = st.cilj > 0.1 ? 0 : Math.PI / 2; bP.textContent = st.cilj > 0.1 ? 'Pomakni zglob na 90°' : 'Vrati zglob na 0°';
    }
    const t1 = st.hist.length ? st.hist[st.hist.length - 1][0] : 0;
    while (st.hist.length > 2 && st.hist[0][0] < t1 - 2.1 && st.prikaz !== 'uv') st.hist.shift();
    osvjezi();
    const miruje = !st.radi && Math.abs(st.w) < 0.0005 && Math.abs(st.T - (st.teret ? 10.3 : 0)) < 0.05 && Math.abs(st.qz - st.q) < 0.0005;
    if (miruje && st.teret && !st.porTer) { st.porTer = true; ui.stanje('Teret je svladan: integralni dio petlje brzine trajno daje oko 10 Nm, a zglob se vratio na zadani kut.', 'ok'); }
    return !miruje;
  });
  const r = ui.red();
  const bP = ui.gumb('Pomakni zglob na 90°', () => {
    st.start = st.q; st.t = 0; st.tn = 0; st.hist = []; st.radi = true; bP.disabled = true; st.Ii = st.teret ? 10.3 / (st.Kv * 8) : 0;
    ui.stanje('Upravljanje svakih 2 ms daje novi zadani kut; petlje položaja, brzine i struje ga slijede.');
    ctx.budi();
  }, { u: r });
  const bT = ui.gumb('Teret 3 kg', (e, b) => {
    st.teret = !st.teret; st.porTer = false; b.setAttribute('aria-pressed', String(st.teret));
    if (!st.radi) { st.t = 0; st.tn = 0; st.hist = []; }
    ui.stanje(st.teret ? 'Teret 3 kg na kraku 0,35 m: moment ≈ 10,3 Nm djeluje naglo. Zglob malo propadne dok petlja brzine ne poveća struju.' : 'Teret je skinut — zglob se malo podigne pa vrati.', 'upoz');
    ctx.budi();
  }, { tanki: true, u: r, pritisak: false });
  ui.klizac('Pojačanje položaja Kp', 5, 60, 1, st.Kp, v => v + ' 1/s', v => { st.Kp = v; });
  ui.klizac('Pojačanje brzine Kv', 1, 20, 0.5, st.Kv, v => hr(v, 1) + ' Nm·s/rad', v => { st.Kv = v; });
  ui.seg('Prikaz grafa', [['cijelo', 'Cijelo gibanje'], ['uv', 'Uvećano (takt 2 ms)']], 'cijelo', v => { st.prikaz = v; osvjezi(); if (v === 'uv' && !st.hist.some(q => q[0] > 0.24)) ui.stanje('Za uvećani prikaz najprije pokreni gibanje.', 'upoz'); });
  const o = ui.ocit([['qz', 'Zadani kut q_zad'], ['q', 'Stvarni kut q (enkoder zgloba)'], ['e', 'Slijedna pogreška'], ['w', 'Brzina zgloba'], ['T', 'Moment motora na zglobu (najviše 54 Nm)']]);
  ui.sitno('Ustaljena pogreška pri stalnoj brzini približno je v / Kp: za 120 °/s i Kp = 20 1/s to je 6°. Zato stvarni regulatori dodaju i unaprijednu vezu (feedforward) brzine — ovdje je namjerno nema, da se pogreška vidi.');
  osvjezi();
  ui.stanje('Pritisni „Pomakni zglob na 90°”.');
}

/* =========================================================== 6. zglob iznutra */
function tZglobSklop(ui, ctx) {
  const DIJ = [
    ['Priključci', 'Napajanje i komunikacija ulaze kroz dva priključka (jedan je s bravicom). Isti kabeli kroz šuplju sredinu zgloba nastavljaju prema sljedećim zglobovima.'],
    ['Elektronika zgloba', 'Pločice s upravljačkim sklopom motora: primaju zadane vrijednosti iz ormara, mjere struje faza, čitaju oba enkodera i tranzistorskim mostom napajaju tri faze motora. Zatvara ih plavi poklopac pričvršćen s tri vijka (veličina 0: M2,5; veličine 1 i 2: M3).'],
    ['Motor bez četkica', 'Stator s namotima tri faze učvršćen je u kućištu, a rotor s trajnim magnetima sjedi na šupljem vratilu. Moment motora razmjeran je struji.'],
    ['Kočnica', 'Prsten s krilcima na vratilu motora i zatik s elektromagnetom. Bez napajanja zatik izlazi i zaustavlja vratilo; tarna spojka dopušta proklizavanje pri vrlo velikom momentu.'],
    ['Enkoder motora', 'Mjeri kut vratila motora; elektronici treba za komutaciju i za brzinu. Vrti se oko sto puta brže od izlaza.'],
    ['Valni prijenosnik', 'Generator vala na vratilu motora deformira flexspline, koji zahvaća kruti prsten učvršćen u kućištu. Izlaz (dno čaše flexsplinea) okreće se oko sto puta sporije, uz oko sto puta veći moment i bez zračnosti.'],
    ['Enkoder zgloba', 'Mjeri stvarni kut izlaza, iza prijenosnika. Usporedbom s enkoderom motora upravljanje otkriva kvarove.'],
    ['Izlazna prirubnica', 'Na nju se vijcima ili obujmicom spaja sljedeći članak, a na zadnjem zglobu alat. Kroz šuplju sredinu prolaze kabeli.']
  ];
  const st = { odabran: -1, radi: false, t: 0, fm: 0 };
  const svg = ui.svg(600, 372, 'Načelni uzdužni presjek zgloba: priključci, elektronika, motor, kočnica, enkoder motora, valni prijenosnik, enkoder zgloba i izlazna prirubnica');
  const Y = 214;                           // os zgloba
  const dio = [];
  const g0 = S('g', {}, svg);
  // kućište (presjek), gore i dolje
  for (const s of [-1, 1]) {
    const y0 = Y + s * 112, y1 = Y + s * 96;
    S('path', { d: `M18,${Y + s * 70} L18,${y0} L470,${y0} L470,${Y + s * 92} L456,${Y + s * 92} L456,${y1} L34,${y1} L34,${Y + s * 70}Z`, fill: svg.srafura, class: 'tur-presjek' }, g0);
  }
  S('rect', { x: 18, y: Y - 15, width: 566, height: 30, class: 'tur-supljina' }, g0);
  S('line', { x1: 10, y1: Y, x2: 592, y2: Y, class: 'tur-os-crta' }, g0);
  const kabeli = S('path', { d: `M14,${Y - 5} L590,${Y - 5} M14,${Y + 5} L590,${Y + 5}`, class: 'tur-kabel-u' }, g0);
  const sim = (fn) => { const g = S('g', {}, svg); for (const s of [-1, 1]) fn(g, s); return g; };
  // 1 priključci
  dio.push(sim((g, s) => { S('rect', { x: 4, y: s < 0 ? Y - 70 : Y + 40, width: 30, height: 30, rx: 4, class: 'tur-prikljucak' }, g); }));
  // 2 elektronika
  dio.push(sim((g, s) => {
    for (const x of [44, 70]) { S('rect', { x, y: s < 0 ? Y - 92 : Y + 22, width: 10, height: 70, class: 'tur-pcb' }, g); S('rect', { x: x + 10, y: s < 0 ? Y - 80 : Y + 34, width: 8, height: 20, class: 'tur-cip' }, g); }
  }));
  // 3 motor
  const gRot = S('g', {}, svg);
  dio.push(sim((g, s) => {
    S('rect', { x: 104, y: s < 0 ? Y - 94 : Y + 50, width: 112, height: 44, class: 'tur-stator' }, g);
    S('rect', { x: 112, y: s < 0 ? Y - 90 : Y + 54, width: 96, height: 36, class: 'tur-namot-h' }, g);
    S('rect', { x: 110, y: s < 0 ? Y - 46 : Y + 18, width: 100, height: 28, class: 'tur-magnet-h' }, g);
  }));
  const pruge = [];
  for (let k = 0; k < 8; k++) pruge.push(S('line', { x1: 110, x2: 210, class: 'tur-pruga' }, gRot));
  // vratilo motora (šuplje)
  for (const s of [-1, 1]) S('rect', { x: 100, y: s < 0 ? Y - 18 : Y + 15, width: 296, height: 3, class: 'tur-tamno' }, g0);
  // 4 kočnica
  dio.push(sim((g, s) => {
    S('rect', { x: 226, y: s < 0 ? Y - 66 : Y + 18, width: 12, height: 48, class: 'tur-pomicni' }, g);
    if (s < 0) { S('rect', { x: 246, y: Y - 96, width: 22, height: 26, class: 'tur-zavojnica' }, g); S('rect', { x: 236, y: Y - 74, width: 10, height: 10, class: 'tur-zatik' }, g); }
  }));
  // 5 enkoder motora
  dio.push(sim((g, s) => {
    S('rect', { x: 282, y: s < 0 ? Y - 60 : Y + 18, width: 4, height: 42, class: 'tur-disk-h' }, g);
    if (s < 0) S('rect', { x: 278, y: Y - 76, width: 14, height: 12, class: 'tur-glava' }, g);
  }));
  // 6 valni prijenosnik: kruti prsten u kućištu, flexspline čaša, generator vala
  dio.push(sim((g, s) => {
    S('rect', { x: 330, y: s < 0 ? Y - 94 : Y + 64, width: 44, height: 30, class: 'tur-cs' }, g);              // circular spline
    S('path', { d: s < 0 ? `M334,${Y - 64} L440,${Y - 64} L440,${Y - 20} L446,${Y - 20} L446,${Y - 70} L334,${Y - 70}Z` : `M334,${Y + 64} L440,${Y + 64} L440,${Y + 20} L446,${Y + 20} L446,${Y + 70} L334,${Y + 70}Z`, class: 'tur-fs' }, g);   // flexspline čaša
    S('rect', { x: 336, y: s < 0 ? Y - 62 : Y + 18, width: 34, height: 44, rx: 4, class: 'tur-wg' }, g);       // generator vala
  }));
  // 7 enkoder zgloba
  dio.push(sim((g, s) => {
    S('rect', { x: 456, y: s < 0 ? Y - 60 : Y + 18, width: 5, height: 42, class: 'tur-disk-h' }, g);
    if (s < 0) S('rect', { x: 452, y: Y - 88, width: 14, height: 12, class: 'tur-glava' }, g);
  }));
  // 8 izlazna prirubnica
  const gIzl = S('g', {}, svg);
  dio.push(sim((g, s) => {
    S('rect', { x: 446, y: s < 0 ? Y - 22 : Y + 15, width: 30, height: 7, class: 'tur-pomicni' }, g);
    S('rect', { x: 476, y: s < 0 ? Y - 104 : Y + 15, width: 24, height: 89, class: 'tur-pomicni' }, g);
    S('rect', { x: 500, y: s < 0 ? Y - 104 : Y + 70, width: 84, height: 34, class: 'tur-pomicni' }, g);
    S('circle', { cx: 488, cy: s < 0 ? Y - 84 : Y + 84, r: 5, class: 'tur-utor' }, g);
  }));
  const oznIzl = S('rect', { x: 504, width: 10, height: 10, fill: B.crv }, gIzl);
  // tokovi
  const tokE = S('path', { d: `M19,${Y - 55} L50,${Y - 55} M76,${Y - 55} L104,${Y - 55} L120,${Y - 70}`, class: 'tur-tok-e' }, svg);
  const tokS = S('path', { d: `M285,${Y - 76} L285,${Y - 104} L82,${Y - 104} L82,${Y - 92} M459,${Y - 88} L459,${Y - 106} L82,${Y - 106}`, class: 'tur-tok-s' }, svg);
  // brojevi
  const POZ = [[19, 30], [62, 30], [160, 30], [236, 30], [285, 30], [372, 30], [459, 30], [530, 30]];
  const DOK = [[19, Y - 70], [62, Y - 92], [160, Y - 94], [236, Y - 96], [285, Y - 76], [372, Y - 94], [459, Y - 88], [530, Y - 104]];
  const bro = [];
  POZ.forEach(([x, y], k) => {
    S('line', { x1: x, y1: y + 14, x2: DOK[k][0], y2: DOK[k][1], class: 'tur-vodilja' }, svg);
    const g = S('g', { class: 'tur-broj-k' }, svg);
    S('circle', { cx: x, cy: y, r: 15 }, g);
    T(g, x, y + 6, String(k + 1), 'tur-l', 'middle');
    bro.push(g);
    klikabilno(ctx, g, (k + 1) + '. ' + DIJ[k][0], () => odaberi(k));
    klikabilno(ctx, dio[k], DIJ[k][0], () => odaberi(k));
  });
  const tBr = T(svg, 300, 360, '', 'tur-ls', 'middle');
  const tM = T(svg, 160, Y + 128, '', 'tur-ls', 'middle'), tI = T(svg, 530, Y + 128, '', 'tur-ls', 'middle');
  // popis (legenda)
  const ol = H('ol', { class: 'tur-legenda' });
  const lb = DIJ.map(([n], k) => { const b = H('button', { type: 'button', 'aria-pressed': 'false' }, H('b', { tekst: (k + 1) + '' }), ' ' + n); ctx.on(b, 'click', () => odaberi(k)); ol.append(H('li', {}, b)); return b; });

  function odaberi(k) {
    st.odabran = k;
    dio.forEach((g, j) => g.classList.toggle('tur-odabran', j === k));
    bro.forEach((g, j) => g.classList.toggle('tur-akt', j === k));
    lb.forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
    ui.stanje(`${k + 1}. ${DIJ[k][0]} — ${DIJ[k][1]}`, 'plavo');
  }
  function osvjezi() {
    const off = (st.fm * 0.6) % 12;
    pruge.forEach((l, k) => { const y = Y - 44 + ((k * 12 + off) % 96); l.setAttribute('y1', f1(y < Y - 18 ? y : y + 36)); l.setAttribute('y2', f1(y < Y - 18 ? y : y + 36)); l.style.display = (y > Y - 46 && y < Y - 18) || (y + 36 > Y + 18 && y + 36 < Y + 46) ? '' : 'none'; });
    const yo = Y - 100 + ((st.fm / 100 * 0.6) % 60);
    oznIzl.setAttribute('y', f1(yo));
    tokE.style.strokeDashoffset = f1(-st.t * 40); tokS.style.strokeDashoffset = f1(st.t * 40);
    tokE.style.opacity = st.radi ? 1 : 0; tokS.style.opacity = st.radi ? 1 : 0;
    tM.textContent = st.radi ? 'motor: npr. 3000 o/min' : '';
    tI.textContent = st.radi ? 'izlaz: 30 o/min' : '';
    tBr.textContent = 'načelni presjek — klikni dio ili broj';
  }
  ctx.petlja(dt => { if (!st.radi) { osvjezi(); return false; } st.t += dt; st.fm += dt * 60; osvjezi(); return true; });
  const r = ui.red();
  const bP = ui.gumb('Pokreni tok', (e, b) => { st.radi = !st.radi; b.textContent = st.radi ? 'Zaustavi' : 'Pokreni tok'; b.setAttribute('aria-pressed', String(st.radi)); if (st.radi) ui.stanje('Energija (narančasto): priključak → elektronika → namoti motora. Signali (plavo): enkoder motora i enkoder zgloba → elektronika. Rotor se vrti brzo, prirubnica sto puta sporije.'); ctx.budi(); }, { pritisak: false, u: r });
  ui.gumb('Prethodni', () => odaberi((st.odabran + DIJ.length - 1) % DIJ.length), { tanki: true, u: r });
  ui.gumb('Sljedeći', () => odaberi((st.odabran + 1) % DIJ.length), { tanki: true, u: r });
  ui.upr.append(ol);
  const o = ui.ocit([['v0', 'Veličina 0 (Wrist 1–3)'], ['v1', 'Veličina 1 (Elbow)'], ['v2', 'Veličina 2 (Base, Shoulder)']]);
  o.v0('9 Nm · ±360 °/s'); o.v1('28 Nm · ±180 °/s'); o.v2('54 Nm · ±180 °/s');
  ui.sitno('Najveći moment zgloba prema UR-u; to je moment samog zgloba i nije sav na raspolaganju za teret.');
  osvjezi();
  ui.stanje('Klikni dio presjeka ili pritisni „Sljedeći”.');
}

/* =========================================================== 7. senzor sile i momenta */
function tFtSenzor(ui, ctx) {
  const OPS = [30, 30, 30, 10, 10, 10], PREC = [2, 2, 2, 0.1, 0.1, 0.1];
  const NAZ = ['Fx', 'Fy', 'Fz', 'Mx', 'My', 'Mz'];
  const st = { sl: 'prst', F: 15, L: 150, dx: 30, nag: 0, payload: false, cilj: [0, 0, 0, 0, 0, 0], v: [0, 0, 0, 0, 0, 0] };
  const svg = ui.svg(600, 400, 'Prirubnica s ugrađenim senzorom sile i momenta, alat i opterećenje; desno šest komponenti Fx, Fy, Fz, Mx, My, Mz');
  const fx = 190, fy = 92;                              // središte prirubnice
  const gAl = S('g', {}, svg);
  S('rect', { x: fx - 70, y: 6, width: 140, height: 62, rx: 10, class: 'tur-zglob-k' }, gAl);
  S('rect', { x: fx - 70, y: 6, width: 140, height: 14, rx: 6, class: 'tur-poklopac' }, gAl);
  S('rect', { x: fx - 58, y: 68, width: 116, height: 24, rx: 3, class: 'tur-ft' }, gAl);
  T(gAl, fx - 34, 86, 'F/T', 'tur-ls tur-na-ft', 'middle');
  const gAlat = S('g', {}, gAl);
  const alat = S('rect', { x: fx - 12, y: fy, width: 24, class: 'tur-metal' }, gAlat);
  const vrh = S('circle', { cx: fx, r: 7, class: 'tur-tamno' }, gAlat);
  const teret = S('g', {}, gAlat);
  const tr = S('rect', { width: 90, height: 56, rx: 6, class: 'tur-teret' }, teret);
  const trT = T(teret, 0, 0, '3 kg', 'tur-l', 'middle');
  const tez = S('circle', { r: 6, class: 'tur-tezisce' }, teret);
  // osi alata
  const gOs = S('g', {}, gAl);
  strel(gOs, fx, fy, fx + 58, fy, { boja: B.crv, w: 3, gl: 11 }); T(gOs, fx + 64, fy + 6, 'x', 'tur-lb tur-os-x');
  strel(gOs, fx, fy, fx, fy + 58, { boja: B.pl, w: 3, gl: 11 }); T(gOs, fx + 8, fy + 64, 'z', 'tur-lb tur-os-z');
  S('circle', { cx: fx, cy: fy, r: 7, fill: 'none', stroke: B.zel, 'stroke-width': 2.5 }, gOs);
  S('path', { d: `M${fx - 4},${fy - 4} L${fx + 4},${fy + 4} M${fx + 4},${fy - 4} L${fx - 4},${fy + 4}`, stroke: B.zel, 'stroke-width': 2.2 }, gOs);
  T(gOs, fx - 22, fy + 22, 'y', 'tur-lb tur-os-y');
  const sila = strel(svg, 0, 0, 0, 0, { boja: B.nar, w: 4, gl: 14 });
  const tSila = T(svg, 0, 0, '', 'tur-l');
  const prst = S('path', { class: 'tur-prst' }, svg);
  const tOp = T(svg, 14, 392, '', 'tur-ls');
  // trake šest komponenti
  const TX = 392, TW = 196, trake = [];
  T(svg, TX, 22, 'očitanje senzora', 'tur-ls');
  NAZ.forEach((n, k) => {
    const y = 44 + k * 56;
    T(svg, TX, y + 16, n, 'tur-lb');
    const x0 = TX + 40, w = TW - 40;
    S('rect', { x: x0, y: y, width: w, height: 22, rx: 4, class: 'tur-traka' }, svg);
    const pr = S('rect', { x: x0 + w / 2 - PREC[k] / OPS[k] * w / 2, y: y, width: PREC[k] / OPS[k] * w, height: 22, class: 'tur-preciznost' }, svg);
    S('line', { x1: x0 + w / 2, y1: y - 3, x2: x0 + w / 2, y2: y + 25, class: 'tur-mreza0' }, svg);
    const b = S('rect', { y: y + 3, height: 16, rx: 3, fill: 'var(--teal)' }, svg);
    const t = T(svg, x0 + w, y + 42, '', 'tur-ls', 'end');
    trake.push({ b, t, x0, w, pr });
  });
  // načelo mjerenja
  const svg2 = ui.svg(600, 262, 'Načelo mjerenja: elastični deformacijski element s mjernim trakama i Wheatstoneov most', 'tur-svg2');
  T(svg2, 14, 26, 'Opće načelo, nije izvedba UR-a', 'tur-ls');
  S('rect', { x: 20, y: 60, width: 26, height: 150, fill: svg2.srafura, class: 'tur-presjek' }, svg2);
  const greda = S('path', { class: 'tur-greda' }, svg2);
  const trG = S('rect', { width: 34, height: 9, rx: 2, class: 'tur-traka-mj' }, svg2), trD = S('rect', { width: 34, height: 9, rx: 2, class: 'tur-traka-mj' }, svg2);
  const sG = strel(svg2, 0, 0, 0, 0, { boja: B.nar, w: 3.5, gl: 12 });
  const tEps = T(svg2, 14, 252, '', 'tur-ls');
  // most
  const mx = 450, my = 130;
  const most = [[mx, my - 62], [mx + 62, my], [mx, my + 62], [mx - 62, my]];
  const otp = [];
  for (let k = 0; k < 4; k++) {
    const a = most[k], c = most[(k + 1) % 4];
    S('line', { x1: a[0], y1: a[1], x2: c[0], y2: c[1], class: 'tur-zica' }, svg2);
    const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], ang = Math.atan2(c[1] - a[1], c[0] - a[0]) / RAD;
    const g = S('g', { transform: `translate(${m[0]} ${m[1]}) rotate(${ang})` }, svg2);
    otp.push(S('rect', { x: -16, y: -6, width: 32, height: 12, rx: 2, class: k % 2 ? 'tur-otp' : 'tur-otp tur-otp-akt' }, g));
  }
  T(svg2, mx - 62 - 10, my + 5, 'U', 'tur-ls', 'end');
  S('circle', { cx: mx + 104, cy: my, r: 40, class: 'tur-blok' }, svg2);
  S('line', { x1: mx + 62, y1: my, x2: mx + 70, y2: my, class: 'tur-zica' }, svg2);
  S('path', { d: `M${mx},${my - 62} L${mx + 106},${my - 62} L${mx + 106},${my - 36}`, class: 'tur-zica' }, svg2);
  const tU = T(svg2, mx + 106, my + 6, '', 'tur-ls', 'middle');
  T(svg2, mx - 20, my - 76, 'Wheatstoneov most', 'tur-ls', 'middle');

  function izracun() {
    const W = 3 * 9.81, L = st.L / 1000, b = st.nag * RAD;
    let c = [0, 0, 0, 0, 0, 0];
    if (st.sl === 'prst') { c = [-st.F, 0, 0, 0, -st.F * L, 0]; }
    else if (st.sl === 'teret') {
      const dx = st.dx / 1000, Lc = L + 0.044;            // težište tereta ispod vrha alata
      const gx = W * Math.sin(b), gz = W * Math.cos(b);   // težina u KS alata
      c = [gx, 0, gz, 0, Lc * gx - dx * gz, 0];
      if (st.payload) c = [0, 0, 0, 0, 0, 0];
    }
    st.cilj = c;
  }
  function crtaj() {
    const Lp = st.L * 0.9;
    alat.setAttribute('height', f1(Lp)); vrh.setAttribute('cy', f1(fy + Lp));
    gAl.setAttribute('transform', `rotate(${(-st.nag).toFixed(1)} ${fx} ${fy})`);
    teret.style.display = st.sl === 'teret' ? '' : 'none';
    const dxp = st.dx * 0.9;
    tr.setAttribute('x', f1(fx - 45 + dxp)); tr.setAttribute('y', f1(fy + Lp));
    trT.setAttribute('x', f1(fx + dxp)); trT.setAttribute('y', f1(fy + Lp + 23));
    tez.setAttribute('cx', f1(fx + dxp)); tez.setAttribute('cy', f1(fy + Lp + 40));
    // sila u svjetskom KS
    if (st.sl === 'prst') {
      const b = -st.nag * RAD, tx = fx + Math.sin(-b) * Lp, ty = fy + Math.cos(b) * Lp;
      const ux = Math.cos(b), uy = Math.sin(b), len = 20 + st.F * 2.4;
      sila.set(tx + ux * (len + 14), ty + uy * (len + 14), tx + ux * 10, ty + uy * 10);
      prst.setAttribute('d', `M${f1(tx + ux * (len + 14))},${f1(ty + uy * (len + 14) - 9)} l${f1(ux * 60)},${f1(uy * 60)} l0,18 l${f1(-ux * 60)},${f1(-uy * 60)} Z`);
      tSila.setAttribute('x', f1(tx + ux * 26)); tSila.setAttribute('y', f1(ty + uy * 26 - 16)); tSila.textContent = hr(st.F, 0) + ' N';
      prst.style.display = ''; sila.style.display = '';
    } else if (st.sl === 'teret') {
      const r = -st.nag * RAD, c = Math.cos(r), s = Math.sin(r);
      const lx = st.dx * 0.9, ly = st.L * 0.9 + 40;
      const px = fx + lx * c - ly * s, py = fy + lx * s + ly * c;
      sila.set(px, py, px, py + 74);
      tSila.setAttribute('x', f1(px + 10)); tSila.setAttribute('y', f1(py + 80)); tSila.textContent = '29,4 N';
      prst.style.display = 'none'; sila.style.display = '';
    } else { sila.style.display = 'none'; prst.style.display = 'none'; tSila.textContent = ''; }
    // trake
    trake.forEach((t, k) => {
      const v = st.v[k], r = ogr(v / OPS[k], -1.08, 1.08), m = t.x0 + t.w / 2;
      const a = Math.min(m, m + r * t.w / 2), b2 = Math.max(m, m + r * t.w / 2);
      t.b.setAttribute('x', f1(a)); t.b.setAttribute('width', f1(Math.max(1.5, b2 - a)));
      const izvan = Math.abs(v) > OPS[k], blizu = Math.abs(v) > 0.85 * OPS[k];
      t.b.setAttribute('fill', izvan ? B.crv : blizu ? B.nar : 'var(--teal)');
      t.t.textContent = (k < 3 ? hrp(v, 1) + ' N' : hrp(v, 2) + ' Nm') + (izvan ? ' — izvan opsega' : '');
    });
    tOp.textContent = 'sivo polje na trakama = preciznost (±2 N, ±0,1 Nm)';
    // greda (načelo): progib prema najvećem omjeru opterećenja
    const opt = Math.max(...st.v.map((v, k) => Math.abs(v) / OPS[k])) * Math.sign(st.v[2] || st.v[0] || st.v[4] || 1);
    const sag = ogr(opt, -1.1, 1.1) * 34;
    const p = [];
    for (let i = 0; i <= 20; i++) { const x = i / 20; p.push([46 + x * 300, 135 + sag * x * x * (3 - x) / 2]); }
    const gor = p.map(q => [q[0], q[1] - 14]), dol = p.map(q => [q[0], q[1] + 14]).reverse();
    greda.setAttribute('d', put(gor.concat(dol), true));
    trG.setAttribute('x', 70); trG.setAttribute('y', f1(p[2][1] - 14 - 9)); trD.setAttribute('x', 70); trD.setAttribute('y', f1(p[2][1] + 14));
    const vlak = sag > 0;
    trG.style.fill = Math.abs(sag) < 1 ? '' : vlak ? B.crv : B.pl; trD.style.fill = Math.abs(sag) < 1 ? '' : vlak ? B.pl : B.crv;
    const kraj = p[20];
    sG.set(kraj[0], kraj[1] - Math.sign(sag || 1) * 60, kraj[0], kraj[1] - Math.sign(sag || 1) * 16);
    sG.style.display = Math.abs(sag) < 1 ? 'none' : '';
    const eps = Math.abs(opt) * 500;
    tEps.textContent = Math.abs(sag) < 1 ? 'bez opterećenja most je u ravnoteži' : `gore ${vlak ? 'vlak' : 'tlak'}, dolje ${vlak ? 'tlak' : 'vlak'}, ε ≈ ${hr(eps, 0)} µm/m (primjer)`;
    otp.forEach((r2, k) => r2.style.fill = Math.abs(sag) < 1 || k % 2 ? '' : (k === 0) === vlak ? B.crv : B.pl);
    tU.textContent = hr(eps * 0.002, 2) + ' mV';
    o.sl({ nista: 'bez opterećenja', prst: 'pritisak prstom', teret: 'teret 3 kg' }[st.sl]);
    o.F(hr(Math.hypot(st.v[0], st.v[1], st.v[2]), 1) + ' N');
    o.M(hr(Math.hypot(st.v[3], st.v[4], st.v[5]), 2) + ' Nm');
  }
  ctx.petlja(dt => {
    let giba = false;
    const k = 1 - Math.exp(-dt * 10);
    st.v = st.v.map((v, i) => { const n = v + (st.cilj[i] - v) * k; if (Math.abs(st.cilj[i] - n) > 0.005) giba = true; return giba ? n : n; });
    if (!giba) st.v = st.cilj.slice();
    crtaj();
    return giba;
  });
  function poruka() {
    izracun();
    const [Fx, , Fz, , My] = st.cilj;
    if (st.sl === 'nista') ui.stanje('Bez opterećenja: svih šest komponenti je nula (unutar preciznosti).');
    else if (st.sl === 'prst') ui.stanje(`Prst gura vrh alata: Fx = ${hr(Fx, 0)} N, a moment My = F · L = ${hr(My, 2)} Nm raste s duljinom alata${Math.abs(My) > 10 ? ' — prešao je opseg ±10 Nm' : ''}${Math.abs(Fx) > 30 ? '; sila je izvan opsega ±30 N' : ''}.`, Math.abs(My) > 10 || Math.abs(Fx) > 30 ? 'opas' : '');
    else if (st.payload) ui.stanje('Teret je ispravno podešen (masa i težište): robot od mjerenja oduzima očekivanu težinu, pa je očitanje nula. Tek dodatna sila, npr. dodir, pojavi se u očitanju.', 'ok');
    else ui.stanje(`Teret nije podešen: Fz = ${hr(Fz, 1)} N je ${Math.abs(Fz) > 25.5 ? 'gotovo na granici opsega ±30 N' : 'velik dio opsega'}, a težište izvan osi daje My = ${hr(My, 2)} Nm. Robot bi takvu silu mogao smatrati dodirom.`, 'upoz');
    ctx.budi();
  }
  ui.seg('Slučaj', [['nista', 'Bez opterećenja'], ['prst', 'Pritisak prstom'], ['teret', 'Teret 3 kg']], st.sl, v => { st.sl = v; vid(); poruka(); });
  const kF = ui.klizac('Sila prsta F', 0, 40, 1, st.F, v => v + ' N', v => { st.F = v; poruka(); });
  const kL = ui.klizac('Duljina alata L (krak)', 50, 200, 5, st.L, v => v + ' mm', v => { st.L = v; poruka(); });
  const kD = ui.klizac('Pomak težišta tereta od osi', 0, 60, 2, st.dx, v => v + ' mm', v => { st.dx = v; poruka(); });
  const kN = ui.klizac('Nagib alata', -60, 60, 5, st.nag, v => hrp(v, 0) + '°', v => { st.nag = v; poruka(); });
  const kP = ui.kvacica('Teret podešen u instalaciji (Payload)', false, v => { st.payload = v; poruka(); });
  function vid() {
    kF.style.display = st.sl === 'prst' ? '' : 'none';
    kD.style.display = kN.style.display = kP.style.display = st.sl === 'teret' ? '' : 'none';
    kL.style.display = st.sl === 'nista' ? 'none' : '';
  }
  const o = ui.ocit([['sl', 'Slučaj'], ['F', 'Ukupna sila |F|'], ['M', 'Ukupni moment |M|']]);
  ui.sitno('Opseg i točnost: sila ±30 N (preciznost ±2,0 N, točnost ±3,5 N), moment ±10 Nm (preciznost ±0,1 Nm, točnost ±0,1 Nm). Osi su osi alata: z iz prirubnice, x udesno, y u crtež.');
  vid(); poruka();
}

/* =========================================================== 8. slobodno vođenje */
function tFreedrive(ui, ctx) {
  const g = 9.81, SK = 680;                               // px po metru
  const L2 = 0.24355, L3 = 0.2132, LT = 0.1;             // nadlaktica, podlaktica, zapešće do prirubnice (pojednostavljeno)
  const M2 = 3.4445, M3 = 1.437, MZ = 0.871 + 0.805 + 0.261;
  const R2 = 0.1136, R3 = 0.1632;                         // težišta od zgloba (iz UR-ovih dinamičkih parametara)
  const MAXM = [54, 28, 9];
  const st = { q: [-1.0, 1.0, 1.5708], stanje: 'fd', nacin: 'free', mp: 1, vuce: false, cilj: null, pao: false };
  const svg = ui.svg(600, 480, 'Bočni prikaz kobota s tri zgloba (rame, lakat, zapešće); vrh alata se može povući mišem ili prstom');
  const SX = 200, SY = 460 - 0.15185 * SK;               // rame
  const POD = 460;
  S('line', { x1: 0, y1: POD, x2: 600, y2: POD, class: 'tur-pod' }, svg);
  S('rect', { x: SX - 40, y: POD - 0.15185 * SK + 4, width: 80, height: 0.15185 * SK - 4, rx: 10, class: 'tur-baza' }, svg);
  const ravnina = S('line', { x1: 20, x2: 590, class: 'tur-ravnina' }, svg);
  const gRuka = S('g', {}, svg);
  const cN = S('line', { class: 'tur-clanak' }, gRuka), cP = S('line', { class: 'tur-clanak' }, gRuka), cZ = S('line', { class: 'tur-clanak tur-clanak-t' }, gRuka);
  const zg = [0, 1, 2].map(() => S('circle', { r: 17, class: 'tur-zglob-c' }, gRuka));
  const alat = S('rect', { width: 16, height: 30, rx: 3, class: 'tur-tamno' }, gRuka);
  const tez = [0, 1, 2, 3].map(() => S('circle', { r: 5, class: 'tur-tezisce' }, gRuka));
  const gStr = S('g', {}, svg);
  const sGr = [0, 1, 2, 3].map(() => strel(gStr, 0, 0, 0, 1, { boja: B.nar, w: 2.5, gl: 9 }));
  const rucka = S('circle', { r: 20, class: 'tur-rucka' }, svg);
  rucka.setAttribute('tabindex', '0'); rucka.setAttribute('role', 'slider'); rucka.setAttribute('aria-label', 'Vrh alata — povuci ili pomiči strelicama');
  const tRuka = T(svg, 0, 0, '', 'tur-ls', 'middle');
  const tStanje = T(svg, 14, 28, '', 'tur-l');
  // graf M(q) za rame
  const svg2 = ui.svg(600, 210, 'Graf momenta težine na ramenu u ovisnosti o kutu ramena', 'tur-svg2');
  const gr = graf(svg2, 60, 34, 520, 140, { x0: -180, x1: 0, y0: -40, y1: 40, yt: [-40, -20, 0, 20, 40], naslov: 'moment težine na ramenu [Nm] prema kutu q₂' });
  T(svg2, 60, 198, '−180°', 'tur-ls', 'middle'); T(svg2, 320, 198, '−90° (uspravno)', 'tur-ls', 'middle'); T(svg2, 580, 198, '0°', 'tur-ls', 'end');
  const kG = S('polyline', { class: 'tur-krivulja' }, svg2);
  const tG = S('circle', { r: 7, class: 'tur-tocka' }, svg2);

  function tocke(q) {
    const a2 = q[0], a3 = q[0] + q[1], a4 = a3 + q[2];
    const Sh = [SX, SY], El = [SX + L2 * SK * Math.cos(a2), SY + L2 * SK * Math.sin(a2)];
    const Wr = [El[0] + L3 * SK * Math.cos(a3), El[1] + L3 * SK * Math.sin(a3)];
    const Tc = [Wr[0] + LT * SK * Math.cos(a4), Wr[1] + LT * SK * Math.sin(a4)];
    return { Sh, El, Wr, Tc, a2, a3, a4 };
  }
  function momenti(q) {
    const P = tocke(q);
    const c2 = [SX + R2 * SK * Math.cos(P.a2), 0], c3 = [P.El[0] + R3 * SK * Math.cos(P.a3), 0];
    const cz = [P.Wr[0] + 0.05 * SK * Math.cos(P.a4), 0], cp = [P.Tc[0], 0];
    const mase = [[M2, c2[0], 1], [M3, c3[0], 2], [MZ, cz[0], 3], [st.mp, cp[0], 3]];
    const tau = [0, 0, 0], osi = [P.Sh[0], P.El[0], P.Wr[0]];
    for (const [m, x, od] of mase) for (let j = 0; j < 3; j++) if (od > j) tau[j] += m * g * (x - osi[j]) / SK;
    return tau;     // pozitivno = težina okreće u smjeru kazaljke (prema dolje desno)
  }
  function ik(Tc, a4) { // položaj vrha i kut alata → q (lakat gore kao trenutno)
    const W = [Tc[0] - LT * SK * Math.cos(a4), Tc[1] - LT * SK * Math.sin(a4)];
    const dx = (W[0] - SX) / SK, dy = (W[1] - SY) / SK, d = Math.hypot(dx, dy);
    if (d > L2 + L3 - 0.002 || d < Math.abs(L2 - L3) + 0.01) return null;
    const c = (d * d - L2 * L2 - L3 * L3) / (2 * L2 * L3);
    const s3 = (st.q[1] >= 0 ? 1 : -1) * Math.sqrt(1 - c * c);
    const q3 = Math.atan2(s3, c);
    const q2 = Math.atan2(dy, dx) - Math.atan2(L3 * s3, L2 + L3 * c);
    return [q2, q3, a4 - q2 - q3];
  }
  function dobar(q) {
    const P = tocke(q), vrh = [P.Tc[0] + 32 * Math.cos(P.a4), P.Tc[1] + 32 * Math.sin(P.a4)];
    return [P.El, P.Wr, P.Tc, vrh].every(p => p[1] < POD - 12 && p[0] > 8 && p[0] < 592 && p[1] > 8);
  }
  function postavi(q) { if (q && dobar(q)) { st.q = q; return true; } return false; }
  function osvjezi() {
    const P = tocke(st.q);
    const ln = (l, a, b) => { l.setAttribute('x1', f1(a[0])); l.setAttribute('y1', f1(a[1])); l.setAttribute('x2', f1(b[0])); l.setAttribute('y2', f1(b[1])); };
    ln(cN, P.Sh, P.El); ln(cP, P.El, P.Wr); ln(cZ, P.Wr, P.Tc);
    [P.Sh, P.El, P.Wr].forEach((p, j) => { zg[j].setAttribute('cx', f1(p[0])); zg[j].setAttribute('cy', f1(p[1])); });
    alat.setAttribute('transform', `translate(${f1(P.Tc[0])} ${f1(P.Tc[1])}) rotate(${(P.a4 / RAD - 90).toFixed(1)}) translate(-8 0)`);
    const cs = [[SX + R2 * SK * Math.cos(P.a2), SY + R2 * SK * Math.sin(P.a2), M2], [P.El[0] + R3 * SK * Math.cos(P.a3), P.El[1] + R3 * SK * Math.sin(P.a3), M3],
      [P.Wr[0] + 0.05 * SK * Math.cos(P.a4), P.Wr[1] + 0.05 * SK * Math.sin(P.a4), MZ], [P.Tc[0] + 30 * Math.cos(P.a4), P.Tc[1] + 30 * Math.sin(P.a4), st.mp]];
    cs.forEach((c, j) => {
      tez[j].setAttribute('cx', f1(c[0])); tez[j].setAttribute('cy', f1(c[1])); tez[j].style.display = c[2] > 0 ? '' : 'none';
      sGr[j].set(c[0], c[1], c[0], c[1] + 10 + c[2] * 11); sGr[j].style.display = c[2] > 0 ? '' : 'none';
    });
    const hv = st.nacin === 'rot' ? P.Wr : P.Tc;
    rucka.setAttribute('cx', f1(hv[0])); rucka.setAttribute('cy', f1(hv[1]));
    rucka.style.display = st.stanje === 'fd' ? '' : 'none';
    ravnina.setAttribute('y1', f1(P.Tc[1])); ravnina.setAttribute('y2', f1(P.Tc[1]));
    ravnina.style.display = st.stanje === 'fd' && st.nacin === 'plane' ? '' : 'none';
    tRuka.setAttribute('x', f1(hv[0] + 26)); tRuka.setAttribute('y', f1(hv[1] + 6)); tRuka.setAttribute('text-anchor', 'start');
    tRuka.textContent = st.stanje === 'fd' ? (st.nacin === 'rot' ? 'povuci zapešće' : 'povuci') : '';
    tStanje.textContent = { koc: 'Kočnice zatvorene', fd: 'Freedrive · ' + { free: 'Free', plane: 'Plane', trans: 'Translation', rot: 'Rotation' }[st.nacin], bez: 'Bez kompenzacije (samo za objašnjenje)' }[st.stanje];
    const tau = momenti(st.q);
    const imena = ['Shoulder', 'Elbow', 'Wrist 1'];
    tau.forEach((t, j) => o['m' + j](`${hr(Math.abs(t), 1)} Nm (${hr(Math.abs(t) / MAXM[j] * 100, 0)} % od ${MAXM[j]} Nm)`, Math.abs(t) > MAXM[j] ? 'opas' : Math.abs(t) > 0.8 * MAXM[j] ? 'upoz' : ''));
    o.k(st.q.map((v, j) => imena[j] + ' ' + hr(v / RAD, 0) + '°').join(' · '));
    // graf
    const p = [];
    for (let a = -180; a <= 0; a += 3) p.push([gr.X(a), gr.Y(ogr(momenti([a * RAD, st.q[1], st.q[2]])[0], -40, 40))]);
    kG.setAttribute('points', pts(p));
    const qa = ((st.q[0] / RAD + 540) % 360) - 180;
    tG.style.display = qa >= -180 && qa <= 0 ? '' : 'none';
    tG.setAttribute('cx', f1(gr.X(ogr(qa, -180, 0)))); tG.setAttribute('cy', f1(gr.Y(ogr(tau[0], -40, 40))));
    kq.forEach((k, j) => k.postavi(Math.round(st.q[j] / RAD)));
  }
  // vuča
  let hvat = null;
  function vuci(p) {
    const P = tocke(st.q);
    if (st.nacin === 'free') {
      // q4 ostaje isti: kruti lanac lakat → vrh
      const rel = st.q[2];
      const ax = L3 + LT * Math.cos(rel), ay = LT * Math.sin(rel), Lc = Math.hypot(ax, ay), off = Math.atan2(ay, ax);
      const dx = (p[0] - SX) / SK, dy = (p[1] - SY) / SK, d = Math.min(Math.hypot(dx, dy), L2 + Lc - 0.002);
      if (d < Math.abs(L2 - Lc) + 0.01) return;
      const c = (d * d - L2 * L2 - Lc * Lc) / (2 * L2 * Lc);
      const s = (st.q[1] >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, 1 - c * c));
      const b = Math.atan2(s, c), q2 = Math.atan2(dy, dx) - Math.atan2(Lc * s, L2 + Lc * c);
      postavi([q2, b - off, rel]);
    } else if (st.nacin === 'trans') postavi(ik(p, P.a4));
    else if (st.nacin === 'plane') postavi(ik([p[0], P.Tc[1]], P.a4));
    else if (st.nacin === 'rot') { const a4 = Math.atan2(P.Tc[1] - p[1], P.Tc[0] - p[0]); postavi(ik(P.Tc, a4)); }
    osvjezi();
  }
  ctx.on(rucka, 'pointerdown', e => {
    if (st.stanje !== 'fd') return;
    e.preventDefault(); hvat = e.pointerId; try { rucka.setPointerCapture(e.pointerId); } catch (x) { /* */ }
    rucka.classList.add('tur-vuce');
  });
  ctx.on(rucka, 'pointermove', e => { if (hvat !== e.pointerId) return; vuci(svgTocka(svg, e)); poruka(); });
  const pusti = e => { if (hvat !== e.pointerId) return; hvat = null; rucka.classList.remove('tur-vuce'); };
  ctx.on(rucka, 'pointerup', pusti); ctx.on(rucka, 'pointercancel', pusti);
  ctx.on(rucka, 'keydown', e => {
    const d = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[e.key];
    if (!d || st.stanje !== 'fd') return;
    e.preventDefault();
    const P = tocke(st.q), h = st.nacin === 'rot' ? P.Wr : P.Tc;
    vuci([h[0] + d[0], h[1] + d[1]]); poruka();
  });
  ctx.on(svg, 'pointerdown', e => {
    if (e.target === rucka) return;
    if (st.stanje === 'koc') ui.stanje('Kočnice su zatvorene — robot se ne da pomaknuti rukom. Uključi Freedrive (na privjesku ili gumbom na zapešću).', 'upoz');
  });
  // pad bez kompenzacije: prigušeno gibanje prema najnižoj potencijalnoj energiji
  ctx.petlja(dt => {
    if (st.stanje !== 'bez' || st.pao) return false;
    const n = 6, h = dt / n;
    for (let k = 0; k < n; k++) {
      const tau = momenti(st.q);
      const nq = st.q.map((q, j) => q + tau[j] * 0.06 * h * (j === 2 ? 3 : 1));
      if (!dobar(nq)) { st.pao = true; break; }
      st.q = nq;
      if (Math.max(...tau.map(Math.abs)) < 0.05) { st.pao = true; break; }
    }
    osvjezi();
    if (st.pao) ui.stanje('Bez momenta motora ruka je pala pod vlastitom težinom. Zato upravljanje u slobodnom vođenju stalno daje moment M = m · g · r · cos q u svakom zglobu.', 'opas');
    return !st.pao;
  });
  function poruka() {
    const t = momenti(st.q);
    if (st.stanje === 'fd') ui.stanje(`Kočnice otpuštene, motori drže težinu: rame ${hr(Math.abs(t[0]), 1)} Nm, lakat ${hr(Math.abs(t[1]), 1)} Nm. Robot ostaje gdje ga pustiš.`, 'ok');
  }
  ui.seg('Stanje', [['koc', 'Kočnice zatvorene'], ['fd', 'Freedrive'], ['bez', 'Bez kompenzacije']], 'fd', v => {
    st.stanje = v; st.pao = false;
    if (v === 'koc') ui.stanje('Kočnice zatvorene: zatici drže zglobove, motori ne moraju davati moment.');
    if (v === 'fd') poruka();
    if (v === 'bez') ui.stanje('Kočnice su otpuštene, ali motori ne kompenziraju težinu…', 'upoz');
    osvjezi(); ctx.budi();
  });
  ui.seg('Način slobodnog vođenja', [['free', 'Free'], ['plane', 'Plane'], ['trans', 'Translation'], ['rot', 'Rotation']], 'free', v => { st.nacin = v; osvjezi(); });
  ui.klizac('Teret na prirubnici', 0, 3, 0.5, st.mp, v => hr(v, 1) + ' kg', v => { st.mp = v; osvjezi(); poruka(); });
  const kq = ['Shoulder q₂', 'Elbow q₃', 'Wrist 1 q₄'].map((n, j) => {
    const k = ui.klizac(n, -180, 180, 1, Math.round(st.q[j] / RAD), v => hrp(v, 0) + '°', v => {
      if (st.stanje !== 'fd') { k.postavi(Math.round(st.q[j] / RAD)); return; }
      const q = st.q.slice(); q[j] = v * RAD; if (postavi(q)) { osvjezi(); poruka(); } else k.postavi(Math.round(st.q[j] / RAD));
    });
    return k;
  });
  const o = ui.ocit([['m0', 'Moment težine — Shoulder'], ['m1', 'Moment težine — Elbow'], ['m2', 'Moment težine — Wrist 1'], ['k', 'Kutovi (0° = vodoravno)']]);
  ui.sitno('Mase: nadlaktica 3,44 kg, podlaktica 1,44 kg, zapešće (tri zgloba) 1,94 kg. Kut q mjeri se od vodoravnog, kao „zero position” UR-a.');
  osvjezi(); poruka();
}

/* =========================================================== 9. sigurnosne funkcije */
function tSigurnost(ui, ctx) {
  const SK = 0.22, BX = 196, BY = 236;                       // px/mm, podnožje robota
  const LIM = { N: { v: 1500, F: 150, P: 300, p: 25 }, R: { v: 750, F: 120, P: 200, p: 10 } };
  const TOL = { v: 50, F: 25, P: 10, p: 3, ravn: 40 };
  const MEF = 8, RAVN = 300, ZONA = 100;                     // efektivna masa [kg], ravnina x = 300 mm, zona prije ravnine
  const st = { radi: false, nacin: 'auto', vp: 1000, skener: true, ravnina: true, d: 1300, u: 0, smjer: 1, v: 0, F: 0, Fmax: 0, stop: null, ruka: false, pen: 0, mod: 'N' };
  const svg = ui.svg(600, 470, 'Tlocrt: kobot s dosegom 500 mm, putanja TCP-a, sigurnosna ravnina sa zonom smanjenog načina, zona laserskog skenera i čovjek');
  const X = mm => BX + mm * SK, Yp = mm => BY - mm * SK;
  // zona skenera
  const zonaSk = S('circle', { cx: BX, cy: BY, r: 1000 * SK, class: 'tur-zona-sk' }, svg);
  const tSk = T(svg, BX + 196, BY + 128, 'zona skenera 1 m', 'tur-ls');
  S('circle', { cx: BX, cy: BY, r: 500 * SK, class: 'tur-doseg' }, svg);
  T(svg, BX, BY + 500 * SK + 20, 'doseg 500 mm', 'tur-ls', 'middle');
  // sigurnosna ravnina
  const gRav = S('g', {}, svg);
  S('rect', { x: X(RAVN - ZONA), y: 40, width: ZONA * SK, height: 400, class: 'tur-zona-red' }, gRav);
  S('line', { x1: X(RAVN), y1: 40, x2: X(RAVN), y2: 440, class: 'tur-ravnina-s' }, gRav);
  T(gRav, X(RAVN) + 6, 58, 'sigurnosna ravnina', 'tur-ls');
  T(gRav, X(RAVN) + 6, 78, 'x = 300 mm', 'tur-ls');
  T(gRav, X(RAVN - ZONA / 2), 458, 'zona Reduced', 'tur-ls', 'middle');
  // putanja TCP-a
  const A0 = 200 * RAD, A1 = 380 * RAD, RP = 400;
  const tcpXY = u => { const a = lin(A0, A1, u); return [RP * Math.cos(a), -RP * Math.sin(a)]; };   // mm, y prema gore
  const pp = []; for (let i = 0; i <= 60; i++) { const [x, y] = tcpXY(i / 60); pp.push([X(x), Yp(y)]); }
  S('polyline', { points: pts(pp), class: 'tur-putanja' }, svg);
  // robot
  S('circle', { cx: BX, cy: BY, r: 20, class: 'tur-baza' }, svg);
  const ruka1 = S('line', { class: 'tur-clanak' }, svg), ruka2 = S('line', { class: 'tur-clanak' }, svg);
  const lakat = S('circle', { r: 11, class: 'tur-zglob-c' }, svg);
  const tcp = S('circle', { r: 9, class: 'tur-tcp' }, svg);
  const tV = T(svg, 0, 0, '', 'tur-ls', 'middle');
  // čovjek (tlocrt)
  const gC = S('g', {}, svg);
  S('ellipse', { cx: 0, cy: 0, rx: 18, ry: 44, class: 'tur-covjek' }, gC);
  S('circle', { cx: 4, cy: 0, r: 15, class: 'tur-covjek-g' }, gC);
  const ruCov = S('line', { x1: -4, y1: 30, x2: -60, y2: 40, class: 'tur-covjek-r' }, gC);
  const dlan = S('circle', { cx: -62, cy: 40, r: 9, class: 'tur-covjek-g' }, gC);
  const tSt = T(svg, 14, 26, '', 'tur-lb');
  const URUKA = 0.6;
  function polozajRuke() { return st.ruka ? tcpXY(URUKA) : null; }

  function granice() {
    const red = st.mod === 'R';
    const L = red ? LIM.R : LIM.N;
    let v = L.v;
    if (st.nacin === 'rucni') v = Math.min(v, 250);
    return { ...L, v };
  }
  function osvjezi() {
    const [x, y] = tcpXY(st.u);
    const px = X(x), py = Yp(y);
    const r = Math.hypot(x, y), ex = x * 0.5, ey = y * 0.5;
    ruka1.setAttribute('x1', BX); ruka1.setAttribute('y1', BY); ruka1.setAttribute('x2', f1(X(ex))); ruka1.setAttribute('y2', f1(Yp(ey)));
    ruka2.setAttribute('x1', f1(X(ex))); ruka2.setAttribute('y1', f1(Yp(ey))); ruka2.setAttribute('x2', f1(px)); ruka2.setAttribute('y2', f1(py));
    lakat.setAttribute('cx', f1(X(ex))); lakat.setAttribute('cy', f1(Yp(ey)));
    tcp.setAttribute('cx', f1(px)); tcp.setAttribute('cy', f1(py));
    tcp.classList.toggle('tur-tcp-stop', !!st.stop);
    tV.setAttribute('x', f1(px)); tV.setAttribute('y', f1(py - 18)); tV.textContent = st.radi || st.v > 1 ? hr(st.v, 0) + ' mm/s' : '';
    gC.setAttribute('transform', `translate(${f1(X(st.ruka ? 560 : st.d))} ${f1(BY)})`);
    const ruk = polozajRuke();
    if (ruk) { const hx = X(ruk[0]) - X(560), hy = Yp(ruk[1]) - BY; ruCov.setAttribute('x2', f1(hx)); ruCov.setAttribute('y2', f1(hy)); dlan.setAttribute('cx', f1(hx)); dlan.setAttribute('cy', f1(hy)); }
    else { ruCov.setAttribute('x2', -30); ruCov.setAttribute('y2', 34); dlan.setAttribute('cx', -32); dlan.setAttribute('cy', 34); }
    gRav.style.display = st.ravnina ? '' : 'none';
    zonaSk.style.display = tSk.style.display = st.skener ? '' : 'none';
    zonaSk.classList.toggle('tur-zona-akt', st.skener && st.d < 1000);
    const G = granice();
    tSt.textContent = st.stop ? 'ZAUSTAVLJENO' : (st.nacin === 'rucni' ? 'Ručni način' : st.mod === 'R' ? 'Reduced' : 'Normal');
    tSt.setAttribute('class', 'tur-lb ' + (st.stop ? 'tur-t-opas' : st.mod === 'R' || st.nacin === 'rucni' ? 'tur-t-upoz' : 'tur-t-ok'));
    o.mod(st.nacin === 'rucni' ? 'ručni (TCP ≤ 250 mm/s)' : st.mod === 'R' ? 'Reduced' : 'Normal', st.mod === 'R' || st.nacin === 'rucni' ? 'upoz' : 'ok');
    o.v(`${hr(st.v, 0)} / ${G.v} mm/s`);
    o.F(`${hr(st.F, 0)} / ${G.F} N (+25 N tol.)`, st.F > G.F + TOL.F ? 'opas' : st.F > G.F ? 'upoz' : '');
    o.p(`${hr(MEF * st.v / 1000, 1)} / ${G.p} kg·m/s`);
    o.P(`${hr(st.F * st.v / 1000, 0)} / ${G.P} W`);
    o.ish(st.stop || (st.radi ? 'gibanje unutar granica' : 'miruje'), st.stop ? 'opas' : '');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    const [x] = tcpXY(st.u);
    // način: skener ili zona uz ravninu → Reduced
    st.mod = (st.skener && st.d < 1000 && !st.ruka) || (st.skener && st.ruka) || (st.ravnina && x > RAVN - ZONA) ? 'R' : 'N';
    const G = granice();
    let vc = Math.min(st.vp, G.v);
    // usporavanje ispred ravnine: mora se moći zaustaviti prije nje (a = 2 m/s²)
    if (st.ravnina && st.smjer > 0) { const dist = Math.max(0, RAVN - x); vc = Math.min(vc, Math.sqrt(2 * 2000 * dist)); }
    // dodir s rukom čovjeka
    const ruk = polozajRuke();
    const L = RP * (A1 - A0);                         // duljina putanje [mm]
    const uRuka = URUKA - 14 / L;
    if (ruk && st.smjer > 0 && st.u >= uRuka) {
      // TCP je naišao na ruku: upravljanje još gura, sila raste s utiskivanjem (krutost 4 N/mm, pretpostavka)
      st.pen += st.v * dt; st.F = 4 * st.pen; st.Fmax = Math.max(st.Fmax, st.F);
      st.v = Math.max(0, st.v - 2500 * dt * 0.2);
      if (st.F > G.F + TOL.F) { st.stop = `zaustavljanje — sila ${hr(st.F, 0)} N premašila granicu ${G.F} N + 25 N`; st.v = 0; st.radi = false; zavrsi(); }
      osvjezi(); return true;
    }
    st.F = 0;
    // ubrzanje prema vc
    st.v += ogr(vc - st.v, -4000 * dt, 2500 * dt);
    st.u += st.smjer * st.v * dt / L;
    if (st.u >= 1) { st.u = 1; st.smjer = -1; st.v = 0; }
    if (st.u <= 0) { st.u = 0; st.smjer = 1; st.v = 0; }
    if (st.ravnina && st.smjer > 0 && tcpXY(st.u)[0] >= RAVN - 1 && st.v < 5) { st.smjer = -1; ui.stanje('TCP je stao na sigurnosnoj ravnini i program se vraća. Ravninu ne smije prijeći (tolerancija 40 mm).', 'upoz'); }
    else if (st.nacin === 'rucni') ui.stanje('Ručni način: brzina TCP-a ograničena je na 250 mm/s, bez obzira na program.', 'upoz');
    else if (st.mod === 'R') ui.stanje(`Smanjeni način (Reduced): granica brzine ${G.v} mm/s i sile ${G.F} N — ${st.skener && st.d < 1000 ? 'skener vidi čovjeka' : 'TCP je u zoni uz ravninu'}.`, 'upoz');
    else ui.stanje(`Normalni način: program ide ${hr(Math.min(st.vp, G.v), 0)} mm/s, sve granice su zadovoljene.`, 'ok');
    osvjezi();
    return true;
  });
  function zavrsi() {
    bP.textContent = 'Pokreni program'; bP.setAttribute('aria-pressed', 'false');
    ui.stanje(`Sigurnosni sustav zaustavio je robota: sila u dodiru porasla je na ${hr(st.Fmax, 0)} N, više od granice uvećane za toleranciju. Pritisni „Poništi”.`, 'opas');
  }
  const r = ui.red();
  const bP = ui.gumb('Pokreni program', (e, b) => {
    if (st.stop) return;
    st.radi = !st.radi; b.textContent = st.radi ? 'Zaustavi program' : 'Pokreni program'; b.setAttribute('aria-pressed', String(st.radi)); ctx.budi();
  }, { pritisak: false, u: r });
  const bR = ui.gumb('Čovjek u putanji', (e, b) => {
    st.ruka = !st.ruka; b.setAttribute('aria-pressed', String(st.ruka));
    if (st.ruka) ui.stanje('Čovjek je ispružio ruku u putanju TCP-a. Ako je skener uključen, robot je već u smanjenom načinu.', 'upoz');
    osvjezi(); ctx.budi();
  }, { tanki: true, u: r, pritisak: false });
  ui.gumb('Poništi', () => { st.stop = null; st.F = 0; st.Fmax = 0; st.pen = 0; st.u = 0; st.smjer = 1; st.v = 0; osvjezi(); ui.stanje('Zaustavljanje je poništeno.'); }, { tanki: true, u: r });
  ui.seg('Način rada', [['auto', 'Automatski'], ['rucni', 'Ručni (250 mm/s)']], 'auto', v => { st.nacin = v; osvjezi(); ctx.budi(); });
  ui.klizac('Programirana brzina TCP-a', 100, 1500, 50, st.vp, v => v + ' mm/s', v => { st.vp = v; ctx.budi(); });
  ui.klizac('Udaljenost čovjeka od podnožja', 600, 1500, 50, st.d, v => v + ' mm', v => { st.d = v; osvjezi(); ctx.budi(); });
  const rk = ui.red();
  ui.kvacica('Laserski skener (ulaz Reduced)', true, v => { st.skener = v; osvjezi(); ctx.budi(); }, rk);
  ui.kvacica('Sigurnosna ravnina', true, v => { st.ravnina = v; osvjezi(); ctx.budi(); }, rk);
  const o = ui.ocit([['mod', 'Način'], ['v', 'Brzina TCP-a / granica'], ['F', 'Sila TCP-a / granica'], ['p', 'Količina gibanja (8 kg) / granica'], ['P', 'Snaga u dodiru / granica'], ['ish', 'Ishod']]);
  osvjezi();
  ui.stanje('Pritisni „Pokreni program”.');
}

/* =========================================================== 10. kategorije zaustavljanja */
function tZaustavljanje(ui, ctx) {
  const TS = 0.5, TK = 2.0;
  const KAT = [
    { k: 0, n: 'Kategorija 0', o: 'napajanje odmah isključeno, kočnice', tv: 0.12, tp: TS, put: 'skreće' },
    { k: 1, n: 'Kategorija 1', o: 'kontrolirano po putanji, zatim isključenje', tv: 0.28, tp: TS + 0.28, put: 'po putanji' },
    { k: 2, n: 'Kategorija 2', o: 'kontrolirano po putanji, napajanje ostaje', tv: 0.28, tp: 99, put: 'po putanji' }
  ];
  const FUN = { estop: 1, zastitno: 2, moment: 0 };
  const st = { t: 0, radi: false, fn: 'estop', gotovo: false };
  const svg = ui.svg(600, 492, 'Tri grafa brzine TCP-a i napajanja pogona u vremenu za kategorije zaustavljanja 0, 1 i 2, s prikazom putanje zaustavljanja');
  const pruge = KAT.map((K, j) => {
    const y = 14 + j * 152;
    const g = S('g', {}, svg);
    const okv = S('rect', { x: 4, y, width: 592, height: 144, rx: 10, class: 'tur-ploca' }, g);
    T(g, 16, y + 24, K.n, 'tur-lb');
    T(g, 170, y + 24, K.o, 'tur-ls');
    const gr = graf(g, 54, y + 60, 360, 72, { x0: 0, x1: TK, y0: 0, y1: 1.15, yt: [0, 1], yf: v => v ? '1 m/s' : '0' });
    S('line', { x1: f1(gr.X(TS)), y1: y + 56, x2: f1(gr.X(TS)), y2: y + 136, class: 'tur-stop-l' }, g);
    T(g, gr.X(TS) + 4, y + 52, 'STOP', 'tur-ls tur-t-opas');
    const kv = S('polyline', { class: 'tur-krivulja' }, g);
    const kp = S('polyline', { class: 'tur-krivulja-n' }, g);
    // putanja
    const px = 436;
    S('path', { d: `M${px},${y + 120} Q${px + 60},${y + 40} ${px + 140},${y + 70}`, class: 'tur-putanja' }, g);
    const kput = S('path', { class: 'tur-put-st' }, g);
    const tock = S('circle', { r: 7, class: 'tur-tcp' }, g);
    const tPut = T(g, px + 76, y + 136, '', 'tur-ls', 'middle');
    return { K, g, okv, gr, kv, kp, kput, tock, tPut, px, y };
  });
  T(svg, 10, 484, 'brzina TCP-a (puna crta) · napajanje pogona (narančasto)', 'tur-ls');
  // put po Bézieru za prikaz položaja
  const bez = (px, y, s) => { const a = [px, y + 120], c = [px + 60, y + 40], b = [px + 140, y + 70]; const m = 1 - s; return [m * m * a[0] + 2 * m * s * c[0] + s * s * b[0], m * m * a[1] + 2 * m * s * c[1] + s * s * b[1]]; };
  function brzina(K, t) {
    if (t < TS) return 1;
    const u = (t - TS) / K.tv;
    if (u >= 1) return 0;
    return K.k === 0 ? Math.pow(1 - u, 1.7) : 1 - u;
  }
  function osvjezi() {
    const kat = FUN[st.fn];
    for (const P of pruge) {
      const K = P.K;
      P.okv.classList.toggle('tur-istaknuto', K.k === kat);
      const tk = Math.min(st.t, TK);
      const pv = [], pp = [];
      let s = 0, sAkt = 0, dev = 0;
      for (let t = 0; t <= tk + 1e-9; t += 0.01) {
        const vv = brzina(K, t);
        pv.push([P.gr.X(t), P.gr.Y(vv)]);
        const nap = t < K.tp ? 1.08 : 0.04;
        pp.push([P.gr.X(t), P.gr.Y(nap)]);
        s += vv * 0.01 * 0.32;
      }
      P.kv.setAttribute('points', pts(pv)); P.kp.setAttribute('points', pts(pp));
      sAkt = Math.min(0.92, s);
      // položaj; kod kat. 0 nakon STOP-a skreće s putanje
      const sStop = Math.min(0.92, TS * 0.32);
      let [x, y] = bez(P.px, P.y, sAkt);
      if (K.k === 0 && st.t > TS) { const u = Math.min(1, (st.t - TS) / K.tv); dev = 16 * u; y += dev; x -= dev * 0.3; }
      P.tock.setAttribute('cx', f1(x)); P.tock.setAttribute('cy', f1(y));
      if (st.t > TS) {
        const [x0, y0] = bez(P.px, P.y, sStop);
        P.kput.setAttribute('d', K.k === 0 ? `M${f1(x0)},${f1(y0)} Q${f1((x0 + x) / 2 + 6)},${f1((y0 + y) / 2 - 2)} ${f1(x)},${f1(y)}` : '');
      } else P.kput.setAttribute('d', '');
      P.tPut.textContent = st.t > TS + K.tv ? (K.k === 0 ? 'skreće s putanje' : 'na putanji') : '';
    }
    const kat2 = KAT[kat];
    o.f({ estop: 'E-stop (gljiva)', zastitno: 'Zaštitno zaustavljanje', moment: 'Granični moment zgloba' }[st.fn]);
    o.k(kat2.n);
    o.n(kat2.k === 2 ? 'ostaje uključeno' : kat2.k === 1 ? 'isključuje se nakon zaustavljanja' : 'isključuje se odmah');
    o.p(kat2.k === 2 ? 'nastavak programa' : 'ponovno uključivanje / otpuštanje gljive');
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    st.t += dt * 0.7;
    if (st.t >= TK) { st.t = TK; st.radi = false; bZ.disabled = false; zavrsi(); }
    osvjezi();
    return st.radi;
  });
  function zavrsi() {
    const k = FUN[st.fn];
    ui.stanje(k === 0 ? 'Kategorija 0: pogon je bez napajanja odmah, kočnice zaustavljaju zglobove neovisno jedan o drugome — TCP staje najbrže, ali izvan putanje.'
      : k === 1 ? 'Kategorija 1 (E-stop): robot je kontrolirano zakočio po putanji, a zatim je napajanje isključeno i kočnice su zatvorene. Za nastavak otpusti gljivu i ponovno uključi pogon.'
        : 'Kategorija 2 (zaštitno zaustavljanje): robot stoji na putanji, motori ga drže pod napajanjem. Kad zaštita dopusti (npr. zatvorena vrata), program se nastavlja.', k === 2 ? 'ok' : k === 1 ? 'upoz' : 'opas');
  }
  const r = ui.red();
  const bZ = ui.gumb('Zaustavi', () => { st.t = 0; st.radi = true; bZ.disabled = true; ui.stanje('Robot ide 1 m/s; u trenutku STOP pokreće se zaustavljanje…'); ctx.budi(); }, { u: r });
  ui.gumb('Ispočetka', () => { st.t = 0; st.radi = false; bZ.disabled = false; osvjezi(); ui.stanje('Odaberi funkciju i pritisni „Zaustavi”.'); }, { tanki: true, u: r });
  ui.seg('Sigurnosna funkcija', [['estop', 'E-stop'], ['zastitno', 'Zaštitno zaustavljanje'], ['moment', 'Granični moment zgloba']], 'estop', v => { st.fn = v; osvjezi(); if (st.t >= TK) zavrsi(); });
  const o = ui.ocit([['f', 'Odabrana funkcija'], ['k', 'Kategorija zaustavljanja'], ['n', 'Napajanje pogona'], ['p', 'Nakon zaustavljanja']]);
  osvjezi();
  ui.stanje('Odaberi funkciju i pritisni „Zaustavi”.');
}

/* =========================================================== 11. tripoložajni uređaj */
function tTripolozajni(ui, ctx) {
  const st = { p: 0, nacin: 'rucni', panika: false, kut: 0, sm: 1, log: [] , pol: 1 };
  const svg = ui.svg(600, 404, 'Tripoložajni uređaj za omogućavanje s tri položaja tipke i robot koji se giba samo kad je gibanje omogućeno');
  // uređaj (bočni presjek tipke)
  const ux = 40, uy = 70;
  S('rect', { x: ux, y: uy, width: 200, height: 230, rx: 26, class: 'tur-privjesak' }, svg);
  S('rect', { x: ux + 70, y: uy + 30, width: 112, height: 170, rx: 10, class: 'tur-utor' }, svg);
  const tipka = S('rect', { y: uy + 50, width: 70, height: 130, rx: 12, class: 'tur-tipka' }, svg);
  const opr = S('polyline', { class: 'tur-opruga' }, svg);
  const prsti = S('path', { class: 'tur-prst' }, svg);
  T(svg, ux, 396, 'tipka u presjeku: prst pritišće, opruga vraća', 'tur-ls');
  const ozn = [];
  [[1, 'pušteno'], [2, 'lagano'], [3, 'jako']].forEach(([n, t], j) => {
    const x = ux + 8 + j * 76;
    const g = S('g', { class: 'tur-poz' }, svg);
    S('rect', { x, y: uy + 248, width: 68, height: 50, rx: 8 }, g);
    T(g, x + 34, uy + 270, String(n), 'tur-lb', 'middle');
    T(g, x + 34, uy + 290, t, 'tur-ls', 'middle');
    ozn.push(g);
  });
  // robot
  const rx = 420, ry = 300;
  S('line', { x1: 290, y1: ry + 30, x2: 590, y2: ry + 30, class: 'tur-pod' }, svg);
  S('rect', { x: rx - 32, y: ry - 10, width: 64, height: 40, rx: 8, class: 'tur-baza' }, svg);
  const c1 = S('line', { class: 'tur-clanak' }, svg), c2 = S('line', { class: 'tur-clanak' }, svg);
  const j1 = S('circle', { r: 13, class: 'tur-zglob-c' }, svg), j2 = S('circle', { r: 11, class: 'tur-zglob-c' }, svg);
  const lamp = S('circle', { cx: 560, cy: 40, r: 16 }, svg);
  const tL = T(svg, 534, 46, '', 'tur-lb', 'end');
  const tNac = T(svg, 290, 84, '', 'tur-ls');
  function pol() { return st.p < 15 ? 1 : st.p <= 75 ? 2 : 3; }
  function smije() { return st.nacin === 'auto' || (pol() === 2 && !st.panika); }
  function osvjezi() {
    const p = pol();
    const pom = st.p / 100 * 100;
    tipka.setAttribute('x', f1(ux + 70 + 6 + Math.min(pom, 100) * 0.36));
    opr.setAttribute('points', opruga(ux + 70 + 76 + pom * 0.36, uy + 115, ux + 182, uy + 115, 8, 12));
    prsti.setAttribute('d', `M${f1(ux + 20 + pom * 0.36)},${uy + 70} q-40,10 -50,45 q10,35 50,45 l20,0 l0,-90 Z`);
    prsti.setAttribute('transform', 'translate(0 0)');
    ozn.forEach((g, j) => g.classList.toggle('tur-akt', j + 1 === p));
    const ok = smije();
    lamp.setAttribute('class', ok ? 'tur-lampa-z' : 'tur-lampa-c');
    tL.textContent = ok ? 'gibanje dopušteno' : 'zaustavljeno';
    tNac.textContent = st.nacin === 'auto' ? 'Automatski: 3PE se ne koristi' : st.panika && p !== 1 ? 'Ručni: najprije pusti tipku' : 'Ručni način: samo položaj 2';
    const a1 = -70 + st.kut, a2 = a1 + 60 - st.kut * 0.6;
    const J1 = [rx, ry - 10], J2 = [J1[0] + 110 * Math.cos(a1 * RAD), J1[1] + 110 * Math.sin(a1 * RAD)], J3 = [J2[0] + 90 * Math.cos(a2 * RAD), J2[1] + 90 * Math.sin(a2 * RAD)];
    c1.setAttribute('x1', J1[0]); c1.setAttribute('y1', J1[1]); c1.setAttribute('x2', f1(J2[0])); c1.setAttribute('y2', f1(J2[1]));
    c2.setAttribute('x1', f1(J2[0])); c2.setAttribute('y1', f1(J2[1])); c2.setAttribute('x2', f1(J3[0])); c2.setAttribute('y2', f1(J3[1]));
    j1.setAttribute('cx', J1[0]); j1.setAttribute('cy', J1[1]); j2.setAttribute('cx', f1(J2[0])); j2.setAttribute('cy', f1(J2[1]));
    o.p(p + ' — ' + ['pušteno', 'lagano pritisnuto', 'jako stisnuto'][p - 1]);
    o.n(st.nacin === 'auto' ? 'automatski' : 'ručni');
    o.s(ok ? 'gibanje dopušteno' : 'zaustavljeno', ok ? 'ok' : 'opas');
    o.z(st.panika ? 'da — potrebno puštanje' : 'ne');
  }
  function promjena() {
    const p = pol();
    if (p !== st.pol) {
      if (p === 3) st.panika = true;
      if (p === 1) st.panika = false;
      st.log.unshift(`${st.pol} → ${p}${p === 3 ? ' (zaustavljanje, zapamćeno)' : p === 2 && st.panika ? ' (ostaje zaustavljeno)' : ''}`);
      st.log = st.log.slice(0, 5);
      log.replaceChildren(...st.log.map(t => H('li', { tekst: t })));
      st.pol = p;
    }
    const ok = smije();
    if (st.nacin === 'auto') ui.stanje('Automatski način: program radi; zaštitu daju druge sigurnosne funkcije (npr. zaštitno zaustavljanje vratima ili skenerom).');
    else if (ok) ui.stanje('Položaj 2 — gibanje je omogućeno dok držiš tipku lagano pritisnutu.', 'ok');
    else if (st.panika && p === 2) ui.stanje('Iz položaja 3 vratio si se u 2, ali gibanje ostaje zaustavljeno: tipku treba pustiti do kraja (1) pa ponovno lagano pritisnuti.', 'opas');
    else if (p === 3) ui.stanje('Položaj 3 — grčevit stisak: robot se zaustavlja.', 'opas');
    else ui.stanje('Položaj 1 — tipka je puštena, robot stoji.', 'upoz');
    osvjezi(); ctx.budi();
  }
  ctx.petlja(dt => {
    if (!smije()) { osvjezi(); return false; }
    st.kut += st.sm * dt * 22;
    if (st.kut > 40) st.sm = -1; if (st.kut < 0) st.sm = 1;
    osvjezi();
    return true;
  });
  ui.seg('Način rada', [['rucni', 'Ručni'], ['auto', 'Automatski']], 'rucni', v => { st.nacin = v; promjena(); });
  const kp = ui.klizac('Pritisak na tipku', 0, 100, 1, 0, v => v + ' %', v => { st.p = v; promjena(); });
  const r = ui.red();
  [[0, '1 — pusti'], [45, '2 — lagano'], [95, '3 — jako']].forEach(([v, t]) => ui.gumb(t, () => { st.p = v; kp.postavi(v); promjena(); }, { tanki: true, u: r }));
  const o = ui.ocit([['p', 'Položaj tipke'], ['n', 'Način'], ['s', 'Gibanje'], ['z', 'Zapamćen položaj 3']]);
  ui.desno.insertBefore(H('h4', { class: 'tur-podnaslov', tekst: 'Zadnje promjene položaja' }), ui.desno.querySelector('.tur-kako'));
  const log = H('ol', { class: 'tur-log' });
  ui.desno.insertBefore(log, ui.desno.querySelector('.tur-kako'));
  osvjezi(); promjena();
}

/* =========================================================== 12. alatni priključak */
function tAlatniIO(ui, ctx) {
  const HV = {
    A: { n: 'Hvataljka A', o: '24 V · digitalni ulazi PNP · javlja „uhvaćeno”', U: 24, I: 0.4, ul: 'PNP', ai: null, rs: false },
    B: { n: 'Hvataljka B', o: '12 V · ulazi NPN · analogni senzor 0–10 V', U: 12, I: 0.3, ul: 'NPN', ai: 'V', rs: false },
    C: { n: 'Hvataljka C', o: '24 V · RS-485 (Modbus RTU) · do 1 A', U: 24, I: 1.0, ul: null, ai: null, rs: true }
  };
  const st = { hv: 'A', U: 24, dom: 'PNP', dual: false, aim: 'V', rs: false, zatv: false, cilj: 0, pol: 0 };
  const svg = ui.svg(600, 420, 'Alatni priključak M8 na zapešću, signali prema hvataljci i hvataljka s čeljustima');
  // zapešće s priključkom
  S('rect', { x: 10, y: 120, width: 110, height: 180, rx: 14, class: 'tur-zglob-k' }, svg);
  S('rect', { x: 10, y: 120, width: 110, height: 22, rx: 10, class: 'tur-poklopac' }, svg);
  S('circle', { cx: 92, cy: 210, r: 26, class: 'tur-m8' }, svg);
  for (let k = 0; k < 8; k++) { const [x, y] = k < 7 ? pol(92, 210, 15, k * 2 * Math.PI / 7) : [92, 210]; S('circle', { cx: f1(x), cy: f1(y), r: 2.8, class: 'tur-tamno' }, svg); }
  T(svg, 65, 322, 'M8, 8 polova', 'tur-ls', 'middle');
  T(svg, 65, 342, '(ženski)', 'tur-ls', 'middle');
  // signali
  const SIG = [['pwr', 'Napajanje'], ['do0', 'DO0'], ['do1', 'DO1'], ['di0', 'DI0'], ['di1', 'DI1'], ['ai2', 'AI2'], ['ai3', 'AI3'], ['gnd', 'GND']];
  const linije = {};
  SIG.forEach(([k, n], j) => {
    const y = 40 + j * 46;
    const ln = S('path', { d: `M118,210 C150,210 150,${y} 190,${y} L380,${y}`, class: 'tur-sig' }, svg);
    const t = T(svg, 196, y - 8, n, 'tur-ls');
    const v = T(svg, 378, y + 18, '', 'tur-ls', 'end');
    linije[k] = { ln, t, v, y };
  });
  T(svg, 196, 410, 'redoslijed je popis funkcija, ne raspored pinova', 'tur-ls');
  // hvataljka
  const hx = 470;
  S('rect', { x: 400, y: 150, width: 140, height: 110, rx: 10, class: 'tur-hvataljka' }, svg);
  const tHv = T(svg, 470, 182, '', 'tur-l', 'middle');
  const led = S('circle', { cx: 520, cy: 236, r: 8 }, svg);
  const celL = S('rect', { y: 260, width: 26, height: 90, rx: 4, class: 'tur-celjust' }, svg);
  const celD = S('rect', { y: 260, width: 26, height: 90, rx: 4, class: 'tur-celjust' }, svg);
  const predmet = S('rect', { x: hx - 22, y: 300, width: 44, height: 44, rx: 4, class: 'tur-predmet' }, svg);
  const tStatus = T(svg, 470, 386, '', 'tur-ls', 'middle');
  for (const k in linije) S('line', { x1: 380, y1: linije[k].y, x2: 400, y2: Math.max(160, Math.min(250, linije[k].y)), class: 'tur-sig-k' }, svg);

  function provjera() {
    const h = HV[st.hv], gr = [];
    let napaja = true;
    if (st.U === 0) { gr.push(['Napajanje alata je isključeno (0 V).', 'upoz']); napaja = false; }
    else if (st.U < h.U) { gr.push([`Prenizak napon: hvataljka treba ${h.U} V.`, 'upoz']); napaja = false; }
    else if (st.U > h.U) { gr.push([`Previsok napon: hvataljka je za ${h.U} V — opasnost od oštećenja!`, 'opas']); napaja = false; }
    const Imax = st.dual ? 2 : 0.6;
    if (napaja && h.I > 0.6 && !st.dual) { gr.push([`Hvataljka vuče do ${hr(h.I, 1)} A, a napajanje alata daje 600 mA — treba Dual Pin Power.`, 'opas']); napaja = false; }
    let upr = napaja;
    if (h.rs) { if (!st.rs) { gr.push(['Hvataljka C prima naredbe preko RS-485 — uključi Tool Communication Interface.', 'upoz']); upr = false; } }
    else {
      if (st.dual) { gr.push(['U načinu Dual Pin Power digitalni izlazi služe kao napajanje — ne mogu upravljati hvataljkom.', 'upoz']); upr = false; }
      else if (h.ul === 'PNP' && st.dom === 'NPN') { gr.push(['Ulazi hvataljke su PNP (čekaju +24 V), a izlaz je sinking (NPN) — signal ne prolazi.', 'upoz']); upr = false; }
      else if (h.ul === 'NPN' && st.dom === 'PNP') { gr.push(['Ulazi hvataljke su NPN (čekaju spoj na masu), a izlaz je sourcing (PNP) — signal ne prolazi.', 'upoz']); upr = false; }
    }
    if (h.ai && st.rs) gr.push(['Uključen je RS-485: analogni ulazi nisu dostupni, položaj čeljusti se ne može očitati.', 'upoz']);
    else if (h.ai && st.aim !== 'V') gr.push(['Senzor daje 0–10 V, a analogni ulaz je podešen na 4–20 mA — očitanje je krivo.', 'upoz']);
    return { gr, napaja, upr, Imax };
  }
  function osvjezi() {
    const h = HV[st.hv], p = provjera();
    tHv.textContent = h.n;
    const sir = 34 + (1 - st.pol) * 40;          // pol: 0 otvoreno, 1 zatvoreno
    const uhv = st.pol > 0.99;
    celL.setAttribute('x', f1(hx - sir - 26)); celD.setAttribute('x', f1(hx + sir));
    led.setAttribute('class', p.napaja ? (uhv ? 'tur-lampa-z' : 'tur-lampa-p') : 'tur-lampa-iskl');
    const ak = (k, on, tekst, kl) => { const L = linije[k]; L.ln.setAttribute('class', 'tur-sig' + (on ? ' tur-sig-on' : '') + (kl ? ' ' + kl : '')); L.v.textContent = tekst; L.t.style.opacity = kl === 'tur-sig-x' ? 0.45 : 1; };
    ak('pwr', st.U > 0, st.U ? `${st.U} V · ${hr(p.napaja ? h.I * 1000 : 0, 0)} mA` : '0 V', p.gr.some(g => g[1] === 'opas' && /napon|Dual/.test(g[0])) ? 'tur-sig-greska' : '');
    const doTxt = st.dual ? 'napajanje (Dual Pin)' : st.dom === 'NPN' ? 'sinking' : st.dom === 'PNP' ? 'sourcing' : 'push-pull';
    ak('do0', !st.dual ? st.zatv && !h.rs : st.U > 0, st.dual ? doTxt : `${doTxt} · ${st.zatv && !h.rs ? 1 : 0}`);
    ak('do1', !st.dual ? !st.zatv && !h.rs : st.U > 0, st.dual ? doTxt : `${doTxt} · ${!st.zatv && !h.rs ? 1 : 0}`);
    ak('di0', uhv && p.napaja && !h.rs, `uhvaćeno · ${uhv && p.napaja && !h.rs ? 1 : 0}`);
    ak('di1', false, '0');
    const aiTekst = st.rs ? (k => k === 'ai2' ? 'RS-485 A' : 'RS-485 B') : null;
    const vpol = h.ai && p.napaja ? 10 * (1 - st.pol) : 0;
    ak('ai2', st.rs || (h.ai && p.napaja), st.rs ? aiTekst('ai2') : `${st.aim === 'V' ? '0–10 V' : '4–20 mA'} · ${h.ai && st.aim === 'V' ? hr(vpol, 1) + ' V' : h.ai ? '?' : '—'}`, st.rs ? 'tur-sig-rs' : '');
    ak('ai3', st.rs, st.rs ? aiTekst('ai3') : `${st.aim === 'V' ? '0–10 V' : '4–20 mA'} · —`, st.rs ? 'tur-sig-rs' : '');
    linije.ai2.t.textContent = st.rs ? 'AI2 → RS-485' : 'AI2'; linije.ai3.t.textContent = st.rs ? 'AI3 → RS-485' : 'AI3';
    ak('gnd', st.U > 0, '0 V');
    tStatus.textContent = !p.napaja ? 'hvataljka bez napajanja' : !p.upr ? 'ne prima naredbe' : uhv ? 'predmet uhvaćen' : st.pol < 0.01 ? 'otvorena' : 'giba se';
    o.U(st.U ? st.U + ' V' : 'isključeno'); o.do(doTxt); o.ai(st.rs ? 'nedostupni (RS-485)' : st.aim === 'V' ? '0–10 V' : '4–20 mA');
    o.I(`${hr(p.napaja ? h.I * 1000 : 0, 0)} mA od ${st.dual ? 'više (Dual Pin Power)' : '600 mA'}`, p.gr.some(g => /600 mA/.test(g[0])) ? 'opas' : '');
  }
  ctx.petlja(dt => {
    const p = provjera();
    if (p.upr) st.cilj = st.zatv ? 1 : 0;
    const prije = st.pol;
    st.pol += ogr(st.cilj - st.pol, -dt * 1.6, dt * 1.6);
    osvjezi();
    return Math.abs(st.pol - prije) > 1e-4;
  });
  function poruka() {
    const p = provjera();
    if (p.gr.length) ui.stanje(p.gr.map(g => g[0]).join(' '), p.gr.some(g => g[1] === 'opas') ? 'opas' : 'upoz');
    else ui.stanje(st.hv === 'C' ? 'Ispravno: napajanje 24 V s Dual Pin Power, naredbe idu RS-485 vezom (Modbus RTU), digitalni izlazi nisu potrebni.' : `Priključak je ispravno podešen za hvataljku ${st.hv}: ${st.zatv ? 'DO0 = 1 zatvara' : 'DO1 = 1 otvara'} hvataljku.`, 'ok');
    osvjezi(); ctx.budi();
  }
  ui.seg('Hvataljka (primjer)', [['A', 'A: 24 V, PNP'], ['B', 'B: 12 V, NPN, AI'], ['C', 'C: RS-485']], 'A', v => { st.hv = v; poruka(); });
  const r = ui.red();
  ui.gumb('Zatvori', () => { st.zatv = true; poruka(); }, { u: r });
  ui.gumb('Otvori', () => { st.zatv = false; poruka(); }, { tanki: true, u: r });
  ui.seg('Napon alata', [[0, '0 V'], [12, '12 V'], [24, '24 V']], 24, v => { st.U = v; poruka(); });
  ui.seg('Digitalni izlazi', [['NPN', 'Sinking (NPN)'], ['PNP', 'Sourcing (PNP)'], ['PP', 'Push-pull']], 'PNP', v => { st.dom = v; poruka(); });
  ui.seg('Analogni ulazi', [['V', '0–10 V'], ['mA', '4–20 mA']], 'V', v => { st.aim = v; poruka(); });
  const rk = ui.red();
  ui.kvacica('Dual Pin Power', false, v => { st.dual = v; poruka(); }, rk);
  ui.kvacica('Tool Communication Interface (RS-485)', false, v => { st.rs = v; poruka(); }, rk);
  const o = ui.ocit([['U', 'Napon alata'], ['I', 'Struja hvataljke'], ['do', 'Digitalni izlazi'], ['ai', 'Analogni ulazi']]);
  poruka();
}

/* =========================================================== 13. upravljački ormar */
function tOrmar(ui, ctx) {
  const OPIS = {
    mreza: 'Mrežni priključak 100–240 V AC, 47–440 Hz. U ormaru je osigurač 10 A.',
    izvor: 'Izvor napajanja: iz mrežnog napona daje istosmjerni napon za zglobove robota i 24 V za ulaze i izlaze (unutarnje 2 A; s vanjskim izvorom 24 V do 6 A).',
    eater: 'Energy Eater: UR u servisnom priručniku ne opisuje njegovu funkciju. Prema nazivu i uobičajenoj izvedbi to je sklop s otpornikom koji u toplinu pretvara energiju koju motori vraćaju pri kočenju — naše tumačenje.',
    pc: 'Računalo s PolyScopeom (Linux): korisničko sučelje, programi, planiranje gibanja, izravna i inverzna kinematika; Ethernet 1 Gb/s, USB 2.0 i 3.0, Mini DisplayPort.',
    ploca: 'Upravljačka ploča (Control Board): 500 puta u sekundi razmjenjuje zadane i stvarne vrijednosti sa svih šest zglobova i poslužuje ulaze i izlaze.',
    sig: 'Sigurnosna ploča (Safety Control Board): dva neovisna kanala A i B nadziru E-stop, zaštitne ulaze i sigurnosne granice; na pločici su LED-ice Power, Safety A, Safety B i FPGA. Može isključiti napajanje robota.',
    priv: 'Privjesak za učenje: 12″ dodirni zaslon 1280 × 800, gljiva E-stop (dvokanalna), gumb za slobodno vođenje, po izboru 3PE uređaj. Kabel 4,5 m.',
    io: 'Ulazi i izlazi: 16 DI, 16 DO, 2 AI, 2 AO, 4 kvadraturna ulaza, napajanje 24 V. Sigurnosni ulazi i izlazi su u parovima (redundantno).',
    robot: 'Robot: kabelom od 6 m dobiva istosmjerno napajanje i komunikaciju. Svaki zglob ima svoju elektroniku, motor, kočnicu i dva enkodera.',
    van: 'Vanjski uređaji: PLC, računala i mreže — Modbus TCP, EtherNet/IP, PROFINET, PROFIsafe, ROS/ROS2.'
  };
  const st = { rez: 'miruje', t: 0, estop: false, kvarB: false, napRobot: true, U: 0, tE: 0, pre: null, fault: false };
  const svg = ui.svg(600, 500, 'Blok-shema upravljačkog ormara: mreža, izvor napajanja, Energy Eater, računalo, upravljačka ploča, sigurnosna ploča s kanalima A i B, ulazi i izlazi, privjesak, robot i vanjski uređaji');
  const bl = {};
  const blok = (k, x, y, w, h, l1, l2) => {
    const g = S('g', { class: 'tur-rb' }, svg);
    S('rect', { x, y, width: w, height: h, rx: 9 }, g);
    T(g, x + w / 2, y + (l2 ? h / 2 - 2 : h / 2 + 6), l1, 'tur-l', 'middle');
    if (l2) T(g, x + w / 2, y + h / 2 + 18, l2, 'tur-ls', 'middle');
    klikabilno(ctx, g, l1 + (l2 ? ' ' + l2 : ''), () => { for (const b in bl) bl[b].classList.toggle('tur-akt', b === k); ui.stanje(OPIS[k], 'plavo'); });
    bl[k] = g; g.c = [x + w / 2, y + h / 2]; g.r = { x, y, w, h };
    return g;
  };
  S('rect', { x: 150, y: 20, width: 302, height: 458, rx: 14, class: 'tur-okvir-crtkan' }, svg);
  T(svg, 300, 470, 'upravljački ormar', 'tur-ls', 'middle');
  blok('mreza', 8, 44, 126, 60, 'Mreža', '100–240 V AC');
  blok('izvor', 166, 44, 128, 60, 'Izvor', 'napajanja');
  blok('eater', 310, 44, 128, 60, 'Energy', 'Eater');
  blok('pc', 166, 150, 128, 60, 'Računalo', 'PolyScope');
  blok('ploca', 310, 150, 128, 60, 'Upravljačka', 'ploča');
  blok('sig', 310, 262, 128, 60, 'Sigurnosna', 'ploča A/B');
  blok('priv', 8, 262, 126, 60, 'Privjesak', 'za učenje');
  blok('io', 166, 380, 128, 60, 'I/O', '24 V');
  blok('robot', 466, 150, 126, 60, 'Robot', '6 zglobova');
  blok('van', 466, 380, 126, 60, 'Vanjski', 'uređaji, PLC');
  const vodovi = [];
  const vod = (pp, kl, k) => { const p = S('polyline', { points: pts(pp), class: kl }, svg); if (k) vodovi.push([p, k]); return p; };
  // energija (narančasto)
  vod([[134, 74], [166, 74]], 'tur-e', 'e');
  const eSab = vod([[294, 74], [302, 74], [302, 120], [530, 120], [530, 150]], 'tur-e', 'e');
  const eEat = vod([[374, 104], [374, 120]], 'tur-e', 'eat');
  vod([[200, 104], [200, 126], [158, 126], [158, 410], [166, 410]], 'tur-e', 'e');
  T(svg, 162, 372, '24 V', 'tur-ls');
  // sklopnik u vodu prema robotu
  const skl = S('g', {}, svg);
  S('circle', { cx: 466, cy: 120, r: 4, class: 'tur-tocka-s' }, skl);
  const sklN = S('line', { x1: 466, y1: 120, x2: 494, y2: 120, class: 'tur-sklopnik' }, skl);
  T(svg, 500, 106, 'sklopnik', 'tur-ls');
  // signali (plavo)
  vod([[294, 180], [310, 180]], 'tur-s', 's');
  vod([[438, 180], [466, 180]], 'tur-s', 's');
  vod([[374, 262], [374, 210]], 'tur-s', 's');
  vod([[71, 262], [71, 196], [166, 196]], 'tur-s', 's');
  vod([[230, 380], [230, 345], [302, 345], [302, 224], [330, 224], [330, 210]], 'tur-s', 's');
  vod([[466, 410], [452, 410], [452, 140], [230, 140], [230, 150]], 'tur-s', 's');
  T(svg, 529, 462, 'Ethernet', 'tur-ls', 'middle');
  // E-stop kanali A i B: privjesak → sigurnosna ploča
  const kA = vod([[134, 284], [310, 284]], 'tur-kanal', null);
  const kB = vod([[134, 302], [310, 302]], 'tur-kanal', null);
  T(svg, 172, 276, 'E-stop kanal A', 'tur-ls'); T(svg, 172, 322, 'kanal B', 'tur-ls');
  // upravljanje sklopnikom iz sigurnosne ploče
  vod([[438, 292], [480, 292], [480, 124]], 'tur-s-crt', null);
  // napon sabirnice
  T(svg, 310, 380, 'napon sabirnice', 'tur-ls');
  S('rect', { x: 310, y: 392, width: 128, height: 18, rx: 4, class: 'tur-traka' }, svg);
  const uTr = S('rect', { x: 312, y: 394, height: 14, rx: 3 }, svg);
  const tU = T(svg, 310, 432, '', 'tur-ls');
  const tToplo = T(svg, 374, 38, '', 'tur-ls', 'middle');
  const ledA = S('circle', { cx: 330, cy: 316, r: 5 }, svg), ledB = S('circle', { cx: 418, cy: 316, r: 5 }, svg);
  const tRobot = T(svg, 529, 232, '', 'tur-ls', 'middle');

  function osvjezi() {
    const smjer = st.rez === 'koci' ? -1 : 1;
    const jako = st.rez === 'ubrzava' ? 2.2 : st.rez === 'koci' ? 1.6 : 0.5;
    for (const [p, k] of vodovi) {
      const off = st.t * 40 * (k === 's' ? 1 : jako) * (k === 'e' && p === eSab ? smjer : 1);
      p.style.strokeDashoffset = f1(-off);
      if (p === eSab) p.classList.toggle('tur-e-iskl', !st.napRobot);
      if (p === eEat) continue;
    }
    eEat.style.opacity = st.U > 0.62 ? 1 : 0.15;
    bl.eater.classList.toggle('tur-vruce', st.U > 0.62);
    sklN.setAttribute('y2', st.napRobot ? 120 : 104);
    const w = ogr(st.U, 0, 1) * 124;
    uTr.setAttribute('width', f1(Math.max(1, w)));
    uTr.setAttribute('fill', st.U > 0.62 ? B.crv : 'var(--teal)');
    tU.textContent = st.U > 0.62 ? 'napon raste' : !st.napRobot ? 'robot isključen' : 'normalan';
    tToplo.textContent = st.U > 0.62 ? 'toplina' : '';
    const aOtv = st.estop, bOtv = st.estop && !st.kvarB;
    kA.setAttribute('class', 'tur-kanal' + (aOtv ? ' tur-kanal-otv' : ''));
    kB.setAttribute('class', 'tur-kanal' + (bOtv ? ' tur-kanal-otv' : ''));
    ledA.setAttribute('class', aOtv ? 'tur-lampa-c' : 'tur-lampa-z'); ledB.setAttribute('class', bOtv ? 'tur-lampa-c' : st.fault ? 'tur-lampa-p' : 'tur-lampa-z');
    tRobot.textContent = !st.napRobot ? 'bez napajanja' : st.rez === 'ubrzava' ? 'ubrzava' : st.rez === 'koci' ? 'koči' : 'miruje';
    o.st(tRobot.textContent); o.A(aOtv ? 'otvoren' : 'zatvoren', aOtv ? 'opas' : 'ok'); o.B(bOtv ? 'otvoren' : 'zatvoren', bOtv ? 'opas' : st.fault ? 'upoz' : 'ok');
    o.n(st.napRobot ? 'uključeno' : 'isključeno', st.napRobot ? 'ok' : 'opas');
  }
  ctx.petlja(dt => {
    st.t += dt;
    const ciljU = st.rez === 'koci' && st.napRobot ? 0.85 : 0.45;
    st.U += (ciljU - st.U) * (1 - Math.exp(-dt * 4));
    if (st.pre) {
      st.tE += dt;
      if (st.tE > 0.9) {
        st.pre = null; st.rez = 'miruje'; st.napRobot = false; seg.postavi('miruje');
        if (st.kvarB) { st.fault = true; ui.stanje('Kanal A se otvorio, a kanal B nije: sigurnosna ploča otkrila je nesklad kanala. Robot je ipak zaustavljen jer je dovoljan jedan kanal, ali sustav javlja grešku dok se kvar ne otkloni.', 'opas'); }
        else ui.stanje('E-stop (kategorija 1): robot je kontrolirano zakočio — energija kočenja otišla je u Energy Eater — pa je sigurnosna ploča otvorila sklopnik. Oba kanala su otvorena.', 'opas');
      }
    }
    osvjezi();
    return st.rez !== 'miruje' || !!st.pre || Math.abs(ciljU - st.U) > 0.003;
  });
  const seg = ui.seg('Stanje robota', [['miruje', 'Miruje'], ['ubrzava', 'Ubrzava'], ['koci', 'Koči']], 'miruje', v => {
    if (!st.napRobot) { seg.postavi('miruje'); ui.stanje('Robot nema napajanje — najprije poništi E-stop.', 'upoz'); return; }
    st.rez = v;
    ui.stanje(v === 'koci' ? 'Kočenje: motori rade kao generatori i vraćaju energiju na sabirnicu. Napon raste dok višak ne preuzme Energy Eater i pretvori ga u toplinu (tumačenje).' : v === 'ubrzava' ? 'Ubrzavanje: zglobovi uzimaju najviše energije (robot najviše 300 W).' : 'Robot miruje: zglobovi troše malo — elektronika i držanje položaja.');
    ctx.budi();
  });
  const r = ui.red();
  const bE = ui.gumb('E-stop', () => {
    if (st.estop) return;
    st.estop = true; st.pre = true; st.tE = 0; st.rez = 'koci'; seg.postavi('koci'); bE.disabled = true;
    ui.stanje('Gljiva je pritisnuta: oba kanala šalju zahtjev za zaustavljanje; robot najprije kontrolirano koči…', 'upoz');
    ctx.budi();
  }, { u: r, kl: 'tur-g-stop' });
  ui.gumb('Poništi E-stop', () => {
    st.estop = false; st.pre = null; st.napRobot = true; st.fault = false; bE.disabled = false; st.rez = 'miruje'; seg.postavi('miruje');
    ui.stanje('Gljiva otpuštena, napajanje robota ponovno uključeno.'); ctx.budi();
  }, { tanki: true, u: r });
  ui.kvacica('Kvar: kanal B ostaje zatvoren (zavaren kontakt)', false, v => { st.kvarB = v; });
  const o = ui.ocit([['st', 'Robot'], ['n', 'Napajanje robota'], ['A', 'Sigurnosni kanal A'], ['B', 'Sigurnosni kanal B']]);
  ui.sitno('Ormar: 460 × 449 × 254 mm, 12 kg, IP44, prašno lakirani čelik; frekvencija upravljanja 500 Hz. Klikni bilo koji blok za opis.');
  osvjezi();
  ui.stanje('Klikni blok za opis ili promijeni stanje robota.');
  ctx.budi();
}

/* =========================================================== 14. DH kinematika */
const DHP = { a: [0, -0.24355, -0.2132, 0, 0, 0], d: [0.15185, 0, 0, 0.13105, 0.08535, 0.0921], al: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0] };
function mm4(A, Bm) { const C = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += A[i * 4 + k] * Bm[k * 4 + j]; C[i * 4 + j] = s; } return C; }
function dhT(th, d, a, al) {
  const ct = Math.cos(th), s = Math.sin(th), ca = Math.cos(al), sa = Math.sin(al);
  return [ct, -s * ca, s * sa, a * ct, s, ct * ca, -ct * sa, a * s, 0, sa, ca, d, 0, 0, 0, 1];
}
// izravna kinematika UR3e: q (rad) → okviri 0..6 (matrice 4×4, redak po redak)
function fkUR(q) {
  const ok = [[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]];
  for (let i = 0; i < 6; i++) ok.push(mm4(ok[i], dhT(q[i], DHP.d[i], DHP.a[i], DHP.al[i])));
  return ok;
}
function rotVek(T6) {
  const r = (i, j) => T6[i * 4 + j];
  const c = ogr((r(0, 0) + r(1, 1) + r(2, 2) - 1) / 2, -1, 1), th = Math.acos(c);
  if (th < 1e-6) return [0, 0, 0];
  if (Math.PI - th < 1e-4) {
    const x = Math.sqrt(Math.max(0, (r(0, 0) + 1) / 2)), y = Math.sqrt(Math.max(0, (r(1, 1) + 1) / 2)) * (r(0, 1) >= 0 ? 1 : -1), z = Math.sqrt(Math.max(0, (r(2, 2) + 1) / 2)) * (r(0, 2) >= 0 ? 1 : -1);
    return [x * th, y * th, z * th];
  }
  const k = th / (2 * Math.sin(th));
  return [(r(2, 1) - r(1, 2)) * k, (r(0, 2) - r(2, 0)) * k, (r(1, 0) - r(0, 1)) * k];
}
function tKinematikaDH(ui, ctx) {
  const st = { q: [0, 0, 0, 0, 0, 0], az: 30, el: 22, akt: -1 };
  const svg = ui.svg(600, 470, 'Kosi prikaz kinematičkog lanca UR3e s koordinatnim okvirima po Denavitu i Hartenbergu');
  const CX = 300, CY = 350, SC = 520;
  const gPod = S('g', {}, svg), gLan = S('g', {}, svg), gOk = S('g', {}, svg);
  const tTcp = T(svg, 14, 28, '', 'tur-l');
  function proj(p) {
    const ps = st.az * RAD, e = st.el * RAD;
    const x1 = p[0] * Math.cos(ps) - p[1] * Math.sin(ps), y1 = p[0] * Math.sin(ps) + p[1] * Math.cos(ps);
    return [CX + SC * x1, CY - SC * (p[2] * Math.cos(e) + y1 * Math.sin(e))];
  }
  function crtaj() {
    const O = fkUR(st.q);
    gPod.replaceChildren(); gLan.replaceChildren(); gOk.replaceChildren();
    for (let i = -5; i <= 5; i++) {
      const a = proj([i * 0.1, -0.5, 0]), b = proj([i * 0.1, 0.5, 0]), c = proj([-0.5, i * 0.1, 0]), d = proj([0.5, i * 0.1, 0]);
      S('line', { x1: f1(a[0]), y1: f1(a[1]), x2: f1(b[0]), y2: f1(b[1]), class: 'tur-mreza' }, gPod);
      S('line', { x1: f1(c[0]), y1: f1(c[1]), x2: f1(d[0]), y2: f1(d[1]), class: 'tur-mreza' }, gPod);
    }
    const b0 = proj([0, 0, 0]);
    S('ellipse', { cx: f1(b0[0]), cy: f1(b0[1]), rx: 26, ry: 26 * Math.sin(st.el * RAD) + 3, class: 'tur-baza' }, gPod);
    // lanac: O(i-1) → O(i-1) + d_i·z(i-1) → O(i)
    const P = M => [M[3], M[7], M[11]];
    for (let i = 1; i <= 6; i++) {
      const A = O[i - 1], z = [A[2], A[6], A[10]], o0 = P(A), m = [o0[0] + z[0] * DHP.d[i - 1], o0[1] + z[1] * DHP.d[i - 1], o0[2] + z[2] * DHP.d[i - 1]], o1 = P(O[i]);
      const p0 = proj(o0), pm = proj(m), p1 = proj(o1);
      S('polyline', { points: pts([p0, pm, p1]), class: 'tur-lanac' + (st.akt === i - 1 ? ' tur-lanac-akt' : '') }, gLan);
    }
    for (let i = 0; i <= 6; i++) {
      const M = O[i], o = P(M), po = proj(o);
      const L = i === 6 ? 0.07 : 0.055;
      [[0, B.crv], [1, B.zel], [2, B.pl]].forEach(([c, boja]) => {
        const e = [o[0] + M[c] * L, o[1] + M[4 + c] * L, o[2] + M[8 + c] * L], pe = proj(e);
        strel(gOk, po[0], po[1], pe[0], pe[1], { boja, w: 2.6, gl: 8 });
      });
      S('circle', { cx: f1(po[0]), cy: f1(po[1]), r: i === 0 ? 5 : 6.5, class: 'tur-ishod' + (st.akt === i - 1 ? ' tur-ishod-akt' : '') }, gOk);
      T(gOk, f1(po[0] - 10), f1(po[1] + 18), String(i), 'tur-ls tur-okvir-br', 'end');
    }
    const T6 = O[6], rv = rotVek(T6);
    tTcp.textContent = `TCP: ${hr(T6[3] * 1000, 1)}, ${hr(T6[7] * 1000, 1)}, ${hr(T6[11] * 1000, 1)} mm`;
    o.x(hr(T6[3] * 1000, 1) + ' mm'); o.y(hr(T6[7] * 1000, 1) + ' mm'); o.z(hr(T6[11] * 1000, 1) + ' mm');
    o.rv(rv.map(v => hr(v, 3)).join(' · ') + ' rad');
    redovi.forEach((tr, i) => { tr.classList.toggle('tur-akt', st.akt === i); tr.children[1].textContent = hr(st.q[i] / RAD, 0) + '°'; });
  }
  const kl = ['Base q₁', 'Shoulder q₂', 'Elbow q₃', 'Wrist 1 q₄', 'Wrist 2 q₅', 'Wrist 3 q₆'].map((n, i) => ui.klizac(n, -180, 180, 1, 0, v => hrp(v, 0) + '°', v => { st.q[i] = v * RAD; st.akt = i; crtaj(); }));
  const r = ui.red();
  const post = q => { st.q = q.map(v => v * RAD); kl.forEach((k, i) => k.postavi(q[i])); st.akt = -1; crtaj(); };
  ui.gumb('Nulti položaj (sve 0°)', () => { post([0, 0, 0, 0, 0, 0]); ui.stanje('Svi kutovi 0°: ruka je ispružena vodoravno — TCP na x = −456,75 mm, y = −223,15 mm, z = 66,5 mm.', 'ok'); }, { tanki: true, u: r });
  ui.gumb('Početni (0, −90, 0, −90, 0, 0)', () => { post([0, -90, 0, -90, 0, 0]); ui.stanje('Uspravni položaj: nadlaktica i podlaktica okomito prema gore.'); }, { tanki: true, u: r });
  ui.klizac('Okret pogleda', -180, 180, 5, st.az, v => hrp(v, 0) + '°', v => { st.az = v; crtaj(); });
  const o = ui.ocit([['x', 'TCP x'], ['y', 'TCP y'], ['z', 'TCP z'], ['rv', 'Rotacijski vektor rx · ry · rz']]);
  const tab = H('table', { class: 'tur-tab' });
  tab.append(H('thead', {}, H('tr', {}, ...['i', 'θ', 'd [mm]', 'a [mm]', 'α'].map(t => H('th', { tekst: t })))));
  const tb = H('tbody');
  const AL = ['π/2', '0', '0', 'π/2', '−π/2', '0'];
  const redovi = DHP.a.map((a, i) => { const tr = H('tr', {}, H('td', { tekst: String(i + 1) }), H('td', { tekst: '0°' }), H('td', { tekst: hr(DHP.d[i] * 1000, 2) }), H('td', { tekst: hr(a * 1000, 2) }), H('td', { tekst: AL[i] })); tb.append(tr); return tr; });
  tab.append(tb);
  ui.ocitP.append(H('h4', { class: 'tur-podnaslov', tekst: 'DH parametri UR3e' }), tab);
  crtaj();
  ui.stanje('Pomiči klizače kutova; redak tablice zgloba koji mijenjaš bit će istaknut.');
}

/* =========================================================== izvoz */
const GRADITELJI = {
  valni: tValni, kocnica: tKocnica, enkoderi: tEnkoderi, motor: tMotor, regulacija: tRegulacija,
  zglobSklop: tZglobSklop, ftsenzor: tFtSenzor, freedrive: tFreedrive, sigurnost: tSigurnost,
  zaustavljanje: tZaustavljanje, tripolozajni: tTripolozajni, alatniIO: tAlatniIO, ormar: tOrmar, kinematikaDH: tKinematikaDH
};

export function prikazi(el, id) {
  if (!el) throw new Error('teme_ur: nedostaje element');
  if (!GRADITELJI[id]) {
    el.replaceChildren(H('p', { class: 'tur-stanje tur-upoz', tekst: 'Tema „' + id + '” ne postoji.' }));
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
