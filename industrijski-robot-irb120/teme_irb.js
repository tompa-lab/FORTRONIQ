// teme_irb.js — interaktivne 2D teme „Kako radi” za industrijski robot ABB IRB 120
// (DOS ForTroniQ, područje industrijski-robot-irb120). ES modul bez ovisnosti.
// Izvozi: TEME (naslovi, engleski nazivi, tekstovi) i prikazi(el, id) → { unisti() }.
// Okvir i pet općih tema (valni, motor, regulacija, zaustavljanje, tripoložajni) preuzeti su iz teme_ur.js i prilagođeni;
// ostale teme su nove. Tekst i grafika su vlastiti. Što ABB ne objavljuje, označeno je kao pretpostavka ili primjer.
// © ForTroniQ d.o.o.

/* =========================================================== tekstovi */
export const TEME = {
  valni: {
    naslov: 'Valni (harmonični) prijenosnik',
    engl: 'Strain wave gearing',
    uvod: [
      'Valni prijenosnik ima tri dijela: eliptični generator vala na ulaznom vratilu, tankostijeni fleksibilni zupčanik (flexspline) i kruti prsten s unutarnjim zubima (circular spline). Generator iznutra rasteže flexspline u elipsu, pa njegovi zubi zahvaćaju zube prstena samo na dva suprotna mjesta.',
      'Flexspline ima dva zuba manje od prstena. Za jedan okretaj generatora zaostane za dva zuba i okrene se suprotno od ulaza, pa je omjer i = z_f / (z_c − z_f), npr. 200 / 2 = 100. Zahvat je prednapregnut i istodobno zahvaća više zuba, zato prijenos praktički nema zračnosti.',
      'ABB u priručniku IRB 120 ne navodi tip prijenosnika. Sve osi podmazuju se mašću „Harmonic grease 4B No.2”, koja se rabi za valne prijenosnike — odatle zaključak da su prijenosnici valni. To je naš zaključak, ne podatak proizvođača.'
    ],
    kako: 'Pokreni vrtnju ili pritisni „Jedan okretaj ulaza”. Crveni zub flexsplinea i oznake 0, 1, 2 … na prstenu pokazuju da se izlaz za svaki okretaj generatora pomakne za točno dva zuba, suprotno od ulaza. Uvećani detalj prati veliku os, a usporedba s planetarnim prijenosnikom pokazuje razliku u zračnosti pri promjeni smjera.',
    napomena: 'Profil zuba je pojednostavljen, a deformacija flexsplinea crtana je u mjerilu zuba. Brojevi zubi, omjer 100 : 1 i stupanj djelovanja η ≈ 0,75 su primjer — ABB za IRB 120 ne objavljuje ni tip ni omjer prijenosnika.'
  },
  motor: {
    naslov: 'Izmjenični servomotor i komutacija',
    engl: 'AC servo motor, commutation',
    uvod: [
      'Svaku os IRB 120 pokreće izmjenični (AC) servomotor. Stator nosi trofazne namote, a rotor trajne magnete. Moment nastaje kad je magnetsko polje statora zakrenuto prema polju rotora — najveći je kad polje statora prednjači rotoru za 90° električnih.',
      'Zato pogon mora u svakom trenutku znati kut rotora. Na robotima ABB kut motora mjeri resolver, a pogonska jedinica u upravljačkom ormaru prema njemu raspoređuje struju na tri faze (komutacija).'
    ],
    kako: 'Klizačem zadaj struju i gledaj kako polje statora vuče rotor. Usporedi sinusnu i blok-komutaciju te pogledaj što se dogodi kad je izmjereni kut pogrešan za 90° ili 180°.',
    napomena: 'Prikazano je opće načelo motora s trajnim magnetima. ABB u dokumentaciji IRB 120 navodi samo „rotacijski izmjenični motor”; broj polova, snaga i podaci namota nisu objavljeni.'
  },
  regulacija: {
    naslov: 'Kaskadna regulacija osi: položaj – brzina – struja',
    engl: 'Cascade control: position, velocity, current',
    uvod: [
      'Upravljanje u stalnom taktu računa novu zadanu vrijednost za svaku os. Regulacija je kaskadna: vanjska petlja uspoređuje zadani i stvarni kut i daje zadanu brzinu, srednja uspoređuje brzine i daje zadanu struju, a unutarnja struja odgovara momentu motora.',
      'Svaka unutarnja petlja mora biti brža od vanjske. Na IRB 120 kut i brzinu daje resolver na motoru: kut osi dobiva se iz kuta motora podijeljenog prijenosnim omjerom.'
    ],
    kako: 'Pritisni „Pomakni zglob”: os ide s 0° na 90° po profilu brzine. Stvarni kut (puna crta) zaostaje za zadanim (crtkano) to manje što je pojačanje položaja Kp veće; preslaba petlja brzine daje nadvišenje. Uključi teret i gledaj kako integralni dio petlje brzine svlada dodatni moment.',
    napomena: 'Pojačanja, takt 2 ms, moment tromosti i najveći moment u crtežu su primjer. ABB ne objavljuje vrijeme takta, pojačanja ni raspodjelu petlji između osnog računala i pogonske jedinice. Oznake „enkoder” u shemi na IRB 120 odgovaraju resolveru motora.'
  },
  zaustavljanje: {
    naslov: 'Kategorije zaustavljanja 0, 1 i 2',
    engl: 'Stop categories 0, 1, 2',
    uvod: [
      'Norme razlikuju tri načina zaustavljanja. Kategorija 0: napajanje motora odmah se isključuje, a os zaustavljaju kočnice. Kategorija 1: robot se kontrolirano zaustavi, pa se tek tada isključi napajanje. Kategorija 2: kontrolirano zaustavljanje, a napajanje ostaje.',
      'Na upravljanju IRC5 gljiva za nužno zaustavljanje (ES) i zaštitni ulazi (AS, GS) djeluju kroz dva sigurnosna lanca. Konfiguracijom (SoftES, SoftAS, SoftGS) određuje se hoće li zaustavljanje biti kategorije 0 ili 1. Zaustavljanje programa tipkom Stop nije sigurnosna funkcija — motori ostaju pod napajanjem, kao u kategoriji 2.'
    ],
    kako: 'Odaberi način zaustavljanja i pritisni „Zaustavi”. Grafovi pokazuju brzinu TCP-a i napajanje motora u vremenu za sve tri kategorije, a istaknuta je ona koja pripada odabranom načinu. Kod kategorije 0 robot staje najbrže, ali skreće s programirane putanje.',
    napomena: 'Vremena i oblik krivulja su ilustracija (početna brzina 1 m/s). Stvarni put zaustavljanja ovisi o teretu, brzini i položaju. Koja je kategorija postavljena u tvojem upravljanju, provjeri u sigurnosnoj konfiguraciji.'
  },
  tripolozajni: {
    naslov: 'Uređaj za omogućavanje s tri položaja',
    engl: 'Three-position enabling device',
    uvod: [
      'Na stražnjoj strani FlexPendanta je tipka za omogućavanje s tri položaja. Puštena (1) i jako stisnuta (3) znače zaustavljanje; samo lagani pritisak u srednji položaj (2) dopušta gibanje u ručnom načinu.',
      'U ručnom načinu sa smanjenom brzinom TCP ne smije prijeći 250 mm/s. Uređaj koristi prirodnu reakciju: u opasnosti čovjek ili pusti ruku ili je grčevito stisne. Iz položaja 3 ne može se izravno natrag u gibanje — tipku treba pustiti pa ponovno lagano pritisnuti.'
    ],
    kako: 'Pomiči klizač pritiska ili odaberi položaj i gledaj smije li se robot gibati. U ručnom načinu stisni jako, pa se vrati na lagano — gibanje ne kreće dok tipku ne pustiš. Prebaci u automatski način: tada se uređaj ne koristi.',
    napomena: 'Pragovi na klizaču pritiska su ilustracija.'
  },
  remen: {
    naslov: 'Zupčasti remen osi 3 i 5',
    engl: 'Timing belt drive, axes 3 and 5',
    uvod: [
      'Motori osi 3 i 5 nisu na samoj osi. Motor sjedi pomaknut u članku i preko zupčastog remena tjera remenicu na ulazu prijenosnika te osi. Tako je masa motora bliže prethodnom zglobu, a ruka na kraju lakša.',
      'Zupčasti remen prenosi gibanje bez proklizavanja, ali mora biti dobro napet: preslab remen preskače zube, prenapet opterećuje ležajeve. ABB propisuje pregled remena svake 36 mjeseci i daje postupak namještanja napetosti za oba remena.'
    ],
    kako: 'Pokreni pogon i promatraj obje remenice. Odaberi os 3 ili os 5, pa klizačem mijenjaj napetost: kod premale napetosti pri ubrzanju remen preskače zub i os izgubi položaj, kod prevelike raste opterećenje ležajeva.',
    napomena: 'Brojevi zubi remenica, omjer remenskog prijenosa i granice napetosti u crtežu su naš primjer — ABB ih za IRB 120 ne objavljuje. Postupak i propisane vrijednosti napetosti nalaze se u priručniku proizvoda.'
  },
  mjerenje: {
    naslov: 'Mjerni sustav: resolver, mjerna pločica i brojači okretaja',
    engl: 'Measurement system: resolver, encoder interface board, revolution counters',
    uvod: [
      'Kut svakog motora mjeri resolver. Resolver javlja kut unutar jednog okretaja motora; koliko je okretaja motor napravio broje brojači okretaja na mjernoj pločici u robotu (encoder interface board, priključak XS2).',
      'Podaci idu signalnim kabelom robota do priključka R1.SMB na upravljačkom ormaru, a odatle do osnog računala. Kad je ormar isključen, baterija u robotu napaja brojače okretaja, pa robot nakon uključivanja zna gdje je. Kad je baterija pri kraju, upravljanje javlja poruku 38213 „Battery charge low”; bateriju treba mijenjati svake 36 mjeseci.'
    ],
    kako: 'Uključi i isključi napajanje ormara, isprazni bateriju i rukom pomakni os dok je ormar isključen. Ako baterija drži brojače, robot nakon uključivanja zna položaj. Ako ne drži, brojač okretaja se izgubi: os treba dovesti na sinkronizacijsku oznaku i ažurirati brojač okretaja.',
    napomena: 'Omjer prijenosa (100 : 1), prikaz signala i trajanje „pomaka rukom” su primjer. Kutovi pri kojima je os na oznaci navedeni su u priručniku robota.'
  },
  kalibracija: {
    naslov: 'Ažuriranje brojača okretaja i kalibracija',
    engl: 'Revolution counter update, fine calibration, Axis Calibration',
    uvod: [
      'Ažuriranje brojača okretaja ne mjeri ništa novo: kad se os dovede na sinkronizacijsku oznaku, upravljanje samo odredi u kojem je okretaju motora. Zato je dovoljno da je os na oznaci točno unutar polovine okretaja motora; precizan kut unutar okretaja daje resolver.',
      'Kalibracija određuje sam nulti položaj osi (kalibracijski pomak). Za IRB 120 priručnik navodi finu kalibraciju s kalibracijskim položajima osi (os 1 −170,2°, os 2 −115,1°, os 3 +75,8°, os 4 −174,7°, os 5 −90° uz os 6 +90°) i kalibracijskim alatom na osi 6, a od novijih izdanja priručnika standardna metoda je Axis Calibration. S FlexPendanta se osi kalibriraju u skupinama: osi 1–3 i osi 4–6.'
    ],
    kako: 'Odaberi postupak i os. Klizačem dovedi os na oznaku i pritisni gumb za ažuriranje: ako je os predaleko od oznake, upravljanje odabere pogrešan okretaj i robot je pomaknut za cijeli okretaj motora. Kod kalibracije pogledaj kalibracijske položaje svih šest osi.',
    napomena: 'Oznake za ažuriranje brojača okretaja u crtežu su na 0° — to je pojednostavljenje; položaj i izgled oznaka za svaku os navedeni su u priručniku robota. Omjer 100 : 1 je primjer. Kalibracijske položaje navodi priručnik proizvoda IRB 120.'
  },
  sigurnosniLanac: {
    naslov: 'Sigurnosni lanci upravljanja IRC5',
    engl: 'IRC5 safety chains',
    uvod: [
      'Motori robota smiju dobiti napajanje samo kad su zatvoreni svi sigurnosni krugovi. IRC5 ima dva jednaka lanca. U svakom su redom: nužno zaustavljanje (ES), automatsko zaustavljanje (AS, djeluje u automatskom načinu), opće zaustavljanje (GS, djeluje uvijek), uređaj za omogućavanje (ED, djeluje u ručnom načinu) i granični prekidač (LS).',
      'Lanac 1 drži sklopnik K42, lanac 2 sklopnik K43; kontakti obaju sklopnika vezani su u seriju u vodu prema motorima. Kočnice otpušta sklopnik K44 tek kad su motori pod napajanjem. Ako se dva lanca ne slažu (jedan otvoren, drugi zatvoren), upravljanje to prepozna kao kvar.'
    ],
    kako: 'Prebaci način rada i otvaraj pojedine ulaze. Pritisni „Motors On”: motori dobiju napajanje samo ako su oba lanca zatvorena. Uključi kvar u lancu 2 i pogledaj zašto dva neovisna lanca otkrivaju zaljepljeni ili prekinuti kontakt.',
    napomena: 'Shema je načelna i ne prikazuje stvarne stezaljke, releje ni kanale sigurnosne ploče. Nazivi ulaza i sklopnika su iz ABB-ova priručnika upravljanja IRC5 Compact.'
  },
  nacini: {
    naslov: 'Načini rada: automatski i ručni',
    engl: 'Operating modes: Auto, Manual reduced speed, Manual full speed',
    uvod: [
      'Način rada bira se preklopnikom s ključem na upravljačkom ormaru. U automatskom načinu program radi u proizvodnji, a zaštitu daju ograde, vrata i drugi zaštitni uređaji spojeni na automatsko zaustavljanje (AS).',
      'Ručni način sa smanjenom brzinom služi za učenje točaka i provjeru programa: TCP ne smije prijeći 250 mm/s, a gibanje je moguće samo uz lagano pritisnut uređaj za omogućavanje. Ručni način s punom brzinom je dodatna mogućnost, nije dopuštena u svim zemljama i traži i tipku hold-to-run i uređaj za omogućavanje.'
    ],
    kako: 'Okreni preklopnik, zadaj programiranu brzinu i uključi ili isključi uređaj za omogućavanje i tipku hold-to-run. Gledaj kojom se brzinom TCP stvarno giba i zašto u nekom načinu stoji.',
    napomena: 'Putanja i brzine su ilustracija. Ima li tvoj ormar preklopnik s dva ili s tri položaja (ručni s punom brzinom), ovisi o izvedbi i ugrađenim mogućnostima.'
  },
  kocnica: {
    naslov: 'Kočnice motora i otpuštanje kočnica',
    engl: 'Holding brakes, brake release',
    uvod: [
      'Motori osi imaju kočnice koje drže ruku kad motori nisu pod napajanjem — pri isključenju, nakon nužnog zaustavljanja ili nestanka struje. Kočnica nije za usporavanje robota u radu, nego za držanje u mirovanju.',
      'Za ručno pomicanje ruke bez napajanja motora na prednjoj strani ormara IRC5 Compact, ispod poklopca, je tipka za otpuštanje kočnica; ona otpušta kočnice svih osi istodobno. Druga je mogućnost vanjsko napajanje 24 V na priključku R1.MP na postolju robota. Pozor: kad se kočnice otpuste, ruka pada pod vlastitom težinom.'
    ],
    kako: 'Dok su motori isključeni, drži tipku za otpuštanje kočnica i gledaj kako ruka propada. Uključi motore (Motors On) i ponovi: sada ruku drže motori, a kočnice su otpuštene u normalnom radu.',
    napomena: 'Gibanje ruke pri otpuštenim kočnicama je pojednostavljena simulacija (dva članka, prigušenje, naslon na stol). Koje sve osi imaju kočnicu treba potvrditi u priručniku proizvoda; dokumentacija navodi kočnice na motorima osi.'
  },
  zapesce: {
    naslov: 'Sferno zapešće i singularnost',
    engl: 'Spherical wrist, wrist singularity',
    uvod: [
      'Osi 4, 5 i 6 sijeku se u jednoj točki — središtu zapešća. U nultom položaju to je točka 302 mm ispred osi 1 i 630 mm iznad podnožja. Doseg robota od 580 mm mjeri se upravo do središta zapešća, ne do prirubnice alata.',
      'Kad je kut osi 5 jednak 0°, osi 4 i 6 leže na istom pravcu. Tada obje rade isto gibanje: za neke orijentacije alata kutovi osi 4 i 6 nisu jednoznačni, a pri pravocrtnom gibanju kroz taj položaj osi 4 i 6 mogu se naglo zavrtjeti. To je singularnost zapešća.'
    ],
    kako: 'Pomiči osi 2, 3 i 5. Ruka je crtana sa strane, a crte pokazuju osi 4 i 6. Kad os 5 priđe 0°, crte se poklope i pojavi se upozorenje. Očitanja pokazuju položaj središta zapešća i prirubnice.',
    napomena: 'Bočni prikaz je ravninski: os 1 i osi 4 i 6 nisu zakrenute. Mjere su iz kinematike robota (os 2 na 290 mm, os 3 na 560 mm, odmak 70 mm, središte zapešća 302 mm, prirubnica 72 mm dalje); smjer pozitivnog kuta u crtežu je dogovor crteža. Prag upozorenja ±5° je primjer.'
  },
  ormarIRC5: {
    naslov: 'Upravljački ormar IRC5 Compact iznutra',
    engl: 'IRC5 Compact controller: energy and signal flow',
    uvod: [
      'IRC5 Compact spaja se na jednofaznu mrežu 220/230 V. Iza mrežnog filtra i glavne sklopke napajanje se dijeli: izvor napajanja daje 24 V za računala, ploče i ulaze i izlaze, a pogonska jedinica preko sklopnika K42 i K43 napaja motore robota.',
      'Glavno računalo izvodi RAPID program i planira gibanje, osno računalo računa regulaciju osi i prima mjerenja s robota (R1.SMB), a pogonska jedinica pretvara zadane struje u napon za motore. Sigurnosna ploča nadzire sigurnosne lance, I/O ploča ima 16 digitalnih ulaza i 16 izlaza, a FlexPendant je spojen na LAN1. Energiju koju motori vraćaju pri kočenju troši kočioni otpornik.'
    ],
    kako: 'Klikni blok za opis. Pritisni „Motors On” pa „Kočenje”: narančasti tokovi pokazuju energiju, plavi signale. Pri kočenju energija teče od motora natrag u pogonsku jedinicu i grije kočioni otpornik.',
    napomena: 'Raspored blokova je načelni i ne odgovara stvarnom smještaju u ormaru. Popis jedinica je iz ABB-ova priručnika i prezentacije IRC5 Compact.'
  },
  virtualniKontroler: {
    naslov: 'Virtualni kontroler: od RobotStudija do robota',
    engl: 'RobotStudio virtual controller',
    uvod: [
      'RobotStudio je ABB-ov program za programiranje i simulaciju robota na računalu. U njemu radi virtualni kontroler s istom upravljačkom programskom opremom (RobotWare) kao u stvarnom ormaru, pa RAPID program, putanje i vrijeme ciklusa u simulaciji vjerno odgovaraju stvarnom robotu.',
      'Naši simulatori u pregledniku računaju kinematiku i putanje vlastitim kodom: rade bez instalacije, i na mobitelu, ali nisu kopija upravljanja i razliku prema stvarnom robotu treba izmjeriti. RobotStudio HyperReality dodaje fotorealističnu, fizikalno točnu scenu iz NVIDIA Omniversea i sintetičke podatke za učenje modela strojnog vida.'
    ],
    kako: 'Prođi korake od CAD modela do robota tipkama ili pokreni slijed. Zatim usporedi tri alata — RobotStudio, naše simulatore u pregledniku i HyperReality — po tome što pokreću, gdje rade i koliko su vjerni.',
    napomena: 'Navod „do 99 % točnosti prijenosa iz simulacije u stvarnost” je ABB-ov podatak, ne neovisno mjerenje. Koraci su pojednostavljeni; stvarni tijek ovisi o projektu.'
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
  ui.sitno('Primjer: os 1 IRB 120 najviše 250 °/s. Uz omjer 100 : 1 (pretpostavka) to bi bilo oko 4200 o/min motora. Prikaz vrtnje je usporen 100 puta.');
  const zz = H('div', { class: 'tur-okviric' }, H('h4', { tekst: 'Zašto nema zračnosti' }),
    H('p', { tekst: 'Flexspline je u prsten utisnut s radijalnim prednaponom: zubi uz veliku os naliježu na oba boka i istodobno je u zahvatu velik broj zubi (kod stvarnih prijenosnika do oko 30 %). Pri promjeni smjera nema slobodnog hoda koji bi trebalo prijeći — ostaje samo mala elastična torzijska popustljivost. Kod planetarnog prijenosnika između bokova mora postojati zračnost da se zupčanici ne zaglave.' }));
  ui.ocitP.append(zz);
  geo(); osvjezi(); osvjeziUsp();
  ui.stanje('Pritisni „Jedan okretaj ulaza” ili „Pokreni”.');
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
    else if (st.pom === 90) ui.stanje('Mjerni sustav javlja kut pomaknut za 90°: elektronika postavlja polje u smjeru osi rotora (δ = 0). Struja teče, motor se grije, ali moment je nula.', 'opas');
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
  T(svg, 330, 220, 'resolver motora: ω', 'tur-ls', 'middle');
  T(svg, 110, 264, 'resolver: q = θ_m / i', 'tur-ls');
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
    ui.stanje('Upravljanje u stalnom taktu (ovdje primjer: 2 ms) daje novi zadani kut; petlje položaja, brzine i struje ga slijede.');
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
  ui.seg('Prikaz grafa', [['cijelo', 'Cijelo gibanje'], ['uv', 'Uvećano (primjer takta 2 ms)']], 'cijelo', v => { st.prikaz = v; osvjezi(); if (v === 'uv' && !st.hist.some(q => q[0] > 0.24)) ui.stanje('Za uvećani prikaz najprije pokreni gibanje.', 'upoz'); });
  const o = ui.ocit([['qz', 'Zadani kut q_zad'], ['q', 'Stvarni kut q (enkoder zgloba)'], ['e', 'Slijedna pogreška'], ['w', 'Brzina zgloba'], ['T', 'Moment motora na zglobu (najviše 54 Nm)']]);
  ui.sitno('Ustaljena pogreška pri stalnoj brzini približno je v / Kp: za 120 °/s i Kp = 20 1/s to je 6°. Zato stvarni regulatori dodaju i unaprijednu vezu (feedforward) brzine — ovdje je namjerno nema, da se pogreška vidi.');
  osvjezi();
  ui.stanje('Pritisni „Pomakni zglob na 90°”.');
}

/* =========================================================== 10. kategorije zaustavljanja */
function tZaustavljanje(ui, ctx) {
  const TS = 0.5, TK = 2.0;
  const KAT = [
    { k: 0, n: 'Kategorija 0', o: 'napajanje odmah isključeno, kočnice', tv: 0.12, tp: TS, put: 'skreće' },
    { k: 1, n: 'Kategorija 1', o: 'kontrolirano po putanji, zatim isključenje', tv: 0.28, tp: TS + 0.28, put: 'po putanji' },
    { k: 2, n: 'Kategorija 2', o: 'kontrolirano po putanji, napajanje ostaje', tv: 0.28, tp: 99, put: 'po putanji' }
  ];
  const FUN = { es: 0, es1: 1, stop: 2 };
  const st = { t: 0, radi: false, fn: 'es', gotovo: false };
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
    o.f({ es: 'ES / AS / GS, postavljeno kao kat. 0', es1: 'ES / AS / GS, postavljeno kao kat. 1 (SoftES, SoftAS, SoftGS)', stop: 'Stop programa (FlexPendant)' }[st.fn]);
    o.k(kat2.n);
    o.n(kat2.k === 2 ? 'ostaje uključeno' : kat2.k === 1 ? 'isključuje se nakon zaustavljanja' : 'isključuje se odmah');
    o.p(kat2.k === 2 ? 'nastavak programa' : 'otpuštanje gljive / zatvaranje zaštite, Motors On');
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
    ui.stanje(k === 0 ? 'Kategorija 0: sklopnici odmah isključuju motore, kočnice zaustavljaju osi neovisno jednu o drugoj — TCP staje najbrže, ali izvan putanje. Za nastavak: otpusti gljivu ili zatvori zaštitu, potvrdi i uključi motore (Motors On).'
      : k === 1 ? 'Kategorija 1: robot je kontrolirano zakočio po putanji, a zatim su motori isključeni i kočnice zatvorene. Za nastavak: otpusti gljivu ili zatvori zaštitu i uključi motore.'
        : 'Stop programa: robot stoji na putanji, motori ga drže pod napajanjem (ponašanje kao kategorija 2). Start nastavlja program. Ovo nije sigurnosna funkcija.', k === 2 ? 'ok' : k === 1 ? 'upoz' : 'opas');
  }
  const r = ui.red();
  const bZ = ui.gumb('Zaustavi', () => { st.t = 0; st.radi = true; bZ.disabled = true; ui.stanje('Robot ide 1 m/s; u trenutku STOP pokreće se zaustavljanje…'); ctx.budi(); }, { u: r });
  ui.gumb('Ispočetka', () => { st.t = 0; st.radi = false; bZ.disabled = false; osvjezi(); ui.stanje('Odaberi način zaustavljanja i pritisni „Zaustavi”.'); }, { tanki: true, u: r });
  ui.seg('Način zaustavljanja', [['es', 'ES/AS/GS, kat. 0'], ['es1', 'ES/AS/GS, kat. 1'], ['stop', 'Stop programa']], 'es', v => { st.fn = v; osvjezi(); if (st.t >= TK) zavrsi(); });
  const o = ui.ocit([['f', 'Odabrano'], ['k', 'Kategorija zaustavljanja'], ['n', 'Napajanje pogona'], ['p', 'Nakon zaustavljanja']]);
  osvjezi();
  ui.stanje('Odaberi način zaustavljanja i pritisni „Zaustavi”.');
}

/* =========================================================== 11. tripoložajni uređaj */
function tTripolozajni(ui, ctx) {
  const st = { p: 0, nacin: 'rucni', panika: false, kut: 0, sm: 1, log: [] , pol: 1 };
  const svg = ui.svg(600, 404, 'Uređaj za omogućavanje na FlexPendantu s tri položaja tipke i robot koji se giba samo kad je gibanje omogućeno');
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
    tNac.textContent = st.nacin === 'auto' ? 'Automatski: uređaj se ne koristi' : st.panika && p !== 1 ? 'Ručni: najprije pusti tipku' : 'Ručni način: samo položaj 2';
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


/* =========================================================== IRB · zajednički blokovi */
// blok-gumb (pravokutnik s dva retka teksta) koji se ističe klikom
function blokovi(ui, ctx, svg, opisi) {
  const bl = {};
  function blok(k, x, y, w, h, l1, l2) {
    const g = S('g', { class: 'tur-rb' }, svg);
    S('rect', { x, y, width: w, height: h, rx: 9 }, g);
    T(g, x + w / 2, y + (l2 ? h / 2 - 2 : h / 2 + 6), l1, 'tur-l', 'middle');
    if (l2) T(g, x + w / 2, y + h / 2 + 17, l2, 'tur-ls', 'middle');
    if (opisi && opisi[k]) klikabilno(ctx, g, l1 + (l2 ? ' ' + l2 : ''), () => {
      for (const b in bl) bl[b].classList.toggle('tur-akt', b === k);
      ui.stanje(opisi[k], 'plavo');
    });
    bl[k] = g; g.r = { x, y, w, h };
    return g;
  }
  return { bl, blok };
}
// tekući tok (crtkana crta s pomakom crtica)
function tok(svg, tocke, kl) { const p = S('polyline', { points: pts(tocke), class: kl }, svg); return p; }

/* =========================================================== IRB 1. zupčasti remen */
function tRemen(ui, ctx) {
  const OS = { 3: { z1: 18, z2: 36, n: 'osi 3' }, 5: { z1: 16, z2: 40, n: 'osi 5' } };
  const st = { os: 3, radi: false, a1: 0, nap: 55, preskok: 0, gub: 0, t: 0 };
  const svg = ui.svg(600, 380, 'Zupčasti remen: mala remenica na motoru, velika remenica na ulazu prijenosnika i remen među njima; ispod pokazivač napetosti remena');
  const c1 = [140, 170], c2 = [420, 170];
  const gRem = S('path', { class: 'tur-lanac' }, svg);
  const gZub = S('path', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-dasharray': '3 9' }, svg);
  const r1 = S('g', {}, svg), r2 = S('g', {}, svg);
  const d1 = S('circle', { r: 10, class: 'tur-metal' }, r1), d2 = S('circle', { r: 10, class: 'tur-metal' }, r2);
  const k1 = S('line', { class: 'tur-oznaka-ulaz', 'stroke-width': 4 }, svg), k2 = S('line', { class: 'tur-oznaka-ulaz', 'stroke-width': 4 }, svg);
  S('circle', { cx: c1[0], cy: c1[1], r: 9, class: 'tur-tamno' }, svg); S('circle', { cx: c2[0], cy: c2[1], r: 12, class: 'tur-tamno' }, svg);
  T(svg, c1[0], 300, 'remenica na motoru', 'tur-ls', 'middle');
  T(svg, c2[0], 318, 'remenica na ulazu prijenosnika', 'tur-ls', 'middle');
  const tOs = T(svg, c2[0], 342, '', 'tur-lb', 'middle');
  const tRad = T(svg, 300, 22, '', 'tur-ls', 'middle');
  // pokazivač napetosti
  const gx = 40, gy = 356, gw = 230;
  S('rect', { x: gx, y: gy - 10, width: gw, height: 12, rx: 6, class: 'tur-traka' }, svg);
  S('rect', { x: gx + gw * 0.3, y: gy - 10, width: gw * 0.4, height: 12, class: 'tur-zahvat' }, svg);
  const kaz = S('rect', { y: gy - 16, width: 6, height: 24, rx: 2, class: 'tur-traka-mj' }, svg);
  T(svg, gx, gy - 18, 'napetost remena', 'tur-ls');
  function R(z) { return 30 + z * 2; }
  function oblik() {
    const O = OS[st.os], ra = R(O.z1), rb = R(O.z2);
    const dx = c2[0] - c1[0], fi = Math.asin((rb - ra) / dx);
    // tangente (gornja i donja), remen kao zatvorena putanja
    const sag = st.nap < 30 ? (30 - st.nap) * 0.9 : 0;
    const a = Math.PI / 2 + fi;
    const t1g = pol(c1[0], c1[1], ra, -a), t2g = pol(c2[0], c2[1], rb, -a), t1d = pol(c1[0], c1[1], ra, a), t2d = pol(c2[0], c2[1], rb, a);
    const d = `M${f1(t1g[0])},${f1(t1g[1])} L${f1(t2g[0])},${f1(t2g[1])} A${rb},${rb} 0 1 1 ${f1(t2d[0])},${f1(t2d[1])} Q${f1((t1d[0] + t2d[0]) / 2)},${f1((t1d[1] + t2d[1]) / 2 + sag * 2)} ${f1(t1d[0])},${f1(t1d[1])} A${ra},${ra} 0 0 1 ${f1(t1g[0])},${f1(t1g[1])}Z`;
    gRem.setAttribute('d', d); gZub.setAttribute('d', d);
    d1.setAttribute('cx', c1[0]); d1.setAttribute('cy', c1[1]); d1.setAttribute('r', ra - 6);
    d2.setAttribute('cx', c2[0]); d2.setAttribute('cy', c2[1]); d2.setAttribute('r', rb - 6);
    tOs.textContent = O.n.replace('osi', 'os');
  }
  function osvjezi() {
    const O = OS[st.os], ra = R(O.z1), rb = R(O.z2), i = O.z2 / O.z1;
    const a2 = st.a1 / i - st.gub * 2 * Math.PI / O.z2;
    const e1 = pol(c1[0], c1[1], ra - 8, st.a1), e2 = pol(c2[0], c2[1], rb - 8, a2);
    k1.setAttribute('x1', c1[0]); k1.setAttribute('y1', c1[1]); k1.setAttribute('x2', f1(e1[0])); k1.setAttribute('y2', f1(e1[1]));
    k2.setAttribute('x1', c2[0]); k2.setAttribute('y1', c2[1]); k2.setAttribute('x2', f1(e2[0])); k2.setAttribute('y2', f1(e2[1]));
    gZub.style.strokeDashoffset = f1(-st.a1 * ra);
    kaz.setAttribute('x', f1(gx + gw * st.nap / 100 - 3));
    o.z(O.z1 + ' / ' + O.z2 + ' zuba');
    o.i(hr(i, 2) + ' : 1');
    o.n(st.radi ? '3000 → ' + hr(3000 / i, 0) + ' o/min' : 'miruje');
    o.s(st.nap < 30 ? 'premala — preskakanje zuba' : st.nap > 70 ? 'prevelika — opterećeni ležajevi' : 'u granicama', st.nap < 30 || st.nap > 70 ? 'opas' : 'ok');
    o.p(st.gub ? st.gub + ' zub(a) — os je izgubila položaj' : 'nema', st.gub ? 'opas' : 'ok');
    tRad.textContent = st.radi ? 'motor tjera remen; velika remenica vrti se ' + hr(i, 1) + ' puta sporije' : '';
  }
  ctx.petlja(dt => {
    if (!st.radi) { osvjezi(); return false; }
    st.t += dt;
    st.a1 += dt * 3.2;
    // pri naglom ubrzanju (svake ~3 s) premalo napet remen preskoči zub
    if (st.nap < 30 && Math.floor(st.t / 3) !== Math.floor((st.t - dt) / 3)) { st.gub++; ui.stanje('Pri ubrzanju je remen preskočio zub: izlaz prijenosnika zaostao je za jedan zub remenice, a upravljanje to ne vidi — resolver je na motoru, prije remena.', 'opas'); }
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bP = ui.gumb('Pokreni', () => { st.radi = !st.radi; bP.textContent = st.radi ? 'Zaustavi' : 'Pokreni'; bP.setAttribute('aria-pressed', String(st.radi)); if (st.radi) ctx.budi(); }, { u: r, pritisak: false });
  ui.gumb('Ispočetka', () => { st.a1 = 0; st.gub = 0; st.t = 0; osvjezi(); ui.stanje('Oznake na remenicama poravnate.'); }, { tanki: true, u: r });
  ui.seg('Pogon', [[3, 'Os 3'], [5, 'Os 5']], 3, v => { st.os = v; st.gub = 0; oblik(); osvjezi(); });
  ui.klizac('Napetost remena', 0, 100, 1, st.nap, v => v + ' %', v => {
    st.nap = v; oblik(); osvjezi();
    ui.stanje(v < 30 ? 'Remen je prelabav i provjesio se — pri ubrzanju može preskočiti zub.' : v > 70 ? 'Remen je prenapet: nema preskakanja, ali ležajevi motora i remenice su preopterećeni i brže se troše.' : 'Napetost je u granicama: remen ne preskače i ne preopterećuje ležajeve.', v < 30 || v > 70 ? 'upoz' : 'ok');
    ctx.budi();
  });
  const o = ui.ocit([['z', 'Remenice (primjer)'], ['i', 'Omjer remena'], ['n', 'Motor → remenica'], ['s', 'Napetost'], ['p', 'Preskočeno']]);
  ui.sitno('Iza velike remenice je prijenosnik osi, pa je ukupni omjer umnožak omjera remena i prijenosnika. Pregled remena: svake 36 mjeseci.');
  oblik(); osvjezi();
  ui.stanje('Pritisni „Pokreni”, zatim mijenjaj napetost remena.');
}

/* =========================================================== IRB 2. mjerni sustav */
function tMjerenje(ui, ctx) {
  const I = 100;
  const st = { nap: true, bat: true, ok: true, kutM: 0, okr: 0, radi: false, rucno: 0, t: 0 };
  const svg = ui.svg(600, 420, 'Mjerni lanac: resolver na motoru, mjerna pločica s brojačima okretaja i baterijom u robotu, signalni kabel do priključka R1.SMB i osno računalo u ormaru');
  const OPIS = {
    res: 'Resolver: rotacijski transformator na vratilu motora. Daje kut rotora unutar jednog okretaja motora — i nakon isključenja, jer je kut zapisan u položaju vratila.',
    plo: 'Mjerna pločica u robotu (encoder interface board, priključak XS2): pretvara signale resolvera u podatke i broji okretaje motora.',
    bat: 'Baterija u robotu: dok je ormar isključen, napaja brojače okretaja. Kad je pri kraju, upravljanje javlja poruku 38213 „Battery charge low”. Zamjena: svake 36 mjeseci ili nakon poruke.',
    kab: 'Signalni kabel robota: od mjerne pločice u robotu do priključka R1.SMB na ormaru.',
    osn: 'Osno računalo u ormaru: iz okretaja i kuta unutar okretaja računa kut motora, a dijeljenjem s prijenosnim omjerom kut osi.'
  };
  const { bl, blok } = blokovi(ui, ctx, svg, OPIS);
  S('rect', { x: 8, y: 30, width: 300, height: 290, rx: 14, class: 'tur-okvir-crtkan' }, svg); T(svg, 20, 52, 'robot', 'tur-ls');
  S('rect', { x: 400, y: 30, width: 192, height: 290, rx: 14, class: 'tur-okvir-crtkan' }, svg); T(svg, 412, 52, 'upravljački ormar', 'tur-ls');
  // resolver disk
  const RC = [90, 140];
  S('circle', { cx: RC[0], cy: RC[1], r: 54, class: 'tur-disk' }, svg);
  const kaz = S('line', { class: 'tur-oznaka-ulaz', 'stroke-width': 4 }, svg);
  S('circle', { cx: RC[0], cy: RC[1], r: 8, class: 'tur-tamno' }, svg);
  const gRes = S('g', { class: 'tur-rb' }, svg); S('rect', { x: 30, y: 206, width: 120, height: 40, rx: 8 }, gRes); T(gRes, 90, 232, 'resolver', 'tur-l', 'middle');
  klikabilno(ctx, gRes, 'Resolver', () => { for (const b in bl) bl[b].classList.remove('tur-akt'); gRes.classList.add('tur-akt'); ui.stanje(OPIS.res, 'plavo'); });
  bl.res = gRes;
  blok('plo', 170, 110, 126, 60, 'Mjerna', 'pločica (XS2)');
  blok('bat', 170, 224, 126, 60, 'Baterija', 'brojači okretaja');
  blok('osn', 420, 150, 160, 60, 'Osno računalo', 'kut osi');
  const gSmb = S('g', {}, svg); S('rect', { x: 396, y: 120, width: 26, height: 30, rx: 4, class: 'tur-prikljucak' }, gSmb); T(svg, 409, 112, 'R1.SMB', 'tur-ls', 'middle');
  const gKab = S('g', { class: 'tur-rb' }, svg); S('rect', { x: 312, y: 124, width: 80, height: 22, rx: 6 }, gKab); T(gKab, 352, 140, 'kabel', 'tur-ls', 'middle');
  klikabilno(ctx, gKab, 'Signalni kabel', () => { for (const b in bl) bl[b].classList.remove('tur-akt'); gKab.classList.add('tur-akt'); ui.stanje(OPIS.kab, 'plavo'); }); bl.kab = gKab;
  const sig = [tok(svg, [[150, 140], [170, 140]], 'tur-s'), tok(svg, [[296, 135], [396, 135]], 'tur-s'), tok(svg, [[422, 135], [440, 135], [440, 150]], 'tur-s')];
  const eBat = tok(svg, [[233, 224], [233, 170]], 'tur-e');
  const lamp = S('circle', { cx: 572, cy: 290, r: 12 }, svg); const tL = T(svg, 554, 296, '', 'tur-l', 'end');
  // brojilo
  T(svg, 20, 356, 'brojač okretaja motora', 'tur-ls'); const tB = T(svg, 20, 384, '', 'tur-lb');
  T(svg, 230, 356, 'kut motora u okretaju', 'tur-ls'); const tK = T(svg, 230, 384, '', 'tur-lb');
  T(svg, 430, 356, 'kut osi', 'tur-ls'); const tO = T(svg, 430, 384, '', 'tur-lb');
  let off = 0;
  function osvjezi() {
    const e = pol(RC[0], RC[1], 48, st.kutM * RAD - Math.PI / 2);
    kaz.setAttribute('x1', RC[0]); kaz.setAttribute('y1', RC[1]); kaz.setAttribute('x2', f1(e[0])); kaz.setAttribute('y2', f1(e[1]));
    for (const s of sig) { s.style.opacity = st.nap ? 1 : 0.15; s.style.strokeDashoffset = f1(-off); }
    eBat.style.opacity = !st.nap && st.bat ? 1 : 0.15; eBat.style.strokeDashoffset = f1(-off);
    bl.bat.classList.toggle('tur-vruce', !st.bat);
    const zna = st.ok;
    lamp.setAttribute('class', !st.nap ? 'tur-lampa-iskl' : zna ? 'tur-lampa-z' : 'tur-lampa-c');
    tL.textContent = !st.nap ? 'ormar isključen' : zna ? 'položaj poznat' : 'brojač nije ažuriran';
    tB.textContent = zna || !st.nap ? String(st.okr) : '?';
    tK.textContent = hr(((st.kutM % 360) + 360) % 360, 1) + '°';
    const kO = (st.okr * 360 + st.kutM) / I;
    tO.textContent = st.nap && !zna ? 'nepoznat' : hr(kO, 2) + '°';
    o.n(st.nap ? 'uključen' : 'isključen'); o.b(st.bat ? 'puna' : 'prazna — poruka 38213', st.bat ? 'ok' : 'opas');
    o.s(st.nap ? (zna ? 'robot zna gdje je' : 'treba ažurirati brojač okretaja') : (st.bat ? 'brojači broje na bateriju' : 'brojači bez napajanja'), zna ? 'ok' : 'opas');
  }
  ctx.petlja(dt => {
    let dalje = false;
    if (st.nap || (!st.nap && st.bat)) { off += dt * 40; dalje = true; }
    if (st.rucno > 0) {
      const d = Math.min(st.rucno, dt * 900); st.rucno -= d;
      const prije = Math.floor(st.kutM / 360); st.kutM += d;
      const poslije = Math.floor(st.kutM / 360);
      if (poslije !== prije) { if (st.bat) st.okr += poslije - prije; }
      if (st.kutM >= 360 || st.kutM < 0) { st.kutM = ((st.kutM % 360) + 360) % 360; if (!st.bat) st.ok = false; }
      dalje = true;
      if (st.rucno <= 0 && !st.nap) ui.stanje(st.bat ? 'Os je rukom zakrenuta za više okretaja motora; baterija je napajala brojače i oni su to izbrojali.' : 'Os je zakrenuta bez napajanja brojača: kut unutar okretaja resolver i dalje zna, ali broj okretaja je izgubljen.', st.bat ? 'ok' : 'opas');
    }
    osvjezi();
    return dalje;
  });
  const r = ui.red();
  const bN = ui.gumb('Isključi ormar', () => {
    st.nap = !st.nap; bN.textContent = st.nap ? 'Isključi ormar' : 'Uključi ormar';
    if (st.nap) ui.stanje(st.ok ? 'Ormar je uključen: brojači okretaja i resolver daju točan kut osi.' : 'Ormar je uključen, ali brojač okretaja nije siguran: upravljanje traži ažuriranje brojača okretaja (Update revolution counters).', st.ok ? 'ok' : 'opas');
    else ui.stanje(st.bat ? 'Ormar je isključen; baterija napaja brojače okretaja u robotu.' : 'Ormar je isključen, a baterija je prazna — brojači okretaja nemaju napajanje.', st.bat ? 'upoz' : 'opas');
    osvjezi(); ctx.budi();
  }, { u: r });
  const bR = ui.gumb('Pomakni os rukom', () => {
    if (st.nap) { ui.stanje('Dok je ormar uključen, os pomiče motor. Za ovaj pokus isključi ormar (ruka se tada pomiče uz otpuštene kočnice).', 'upoz'); return; }
    st.rucno = 900; ctx.budi();
  }, { tanki: true, u: r });
  const r2 = ui.red();
  const bB = ui.gumb('Isprazni bateriju', () => { st.bat = !st.bat; bB.textContent = st.bat ? 'Isprazni bateriju' : 'Zamijeni bateriju'; osvjezi(); ctx.budi(); ui.stanje(st.bat ? 'Nova baterija: brojači opet imaju napajanje kad je ormar isključen.' : 'Baterija je prazna. Upravljanje bi javilo poruku 38213 „Battery charge low” — dok je ormar uključen, robot i dalje radi.', st.bat ? 'ok' : 'upoz'); }, { tanki: true, u: r2 });
  ui.gumb('Ažuriraj brojač okretaja', () => {
    if (!st.nap) { ui.stanje('Brojač se ažurira s FlexPendanta, dok je ormar uključen.', 'upoz'); return; }
    if (st.ok) { ui.stanje('Brojač je već točan — ažuriranje nije potrebno.', 'ok'); return; }
    st.ok = true; st.okr = 0; st.kutM = 0; osvjezi(); ui.stanje('Os je dovedena na sinkronizacijsku oznaku i brojač okretaja je ažuriran: upravljanje opet zna u kojem je okretaju motor.', 'ok');
  }, { tanki: true, u: r2 });
  const o = ui.ocit([['n', 'Ormar'], ['b', 'Baterija'], ['s', 'Stanje']]);
  ui.sitno('Omjer motor : os u primjeru je 100 : 1 — jedan okretaj motora znači 3,6° osi. Zato izgubljen brojač pomakne os za višekratnik od 3,6°, a ne za mali kut.');
  osvjezi();
  ui.stanje('Klikni dio lanca za opis, ili isključi ormar i pomakni os rukom.');
}

/* =========================================================== IRB 3. kalibracija */
function tKalibracija(ui, ctx) {
  const KAL = [-170.2, -115.1, 75.8, -174.7, -90, 90];
  const I = 100, KORAK = 360 / I;                  // jedan okretaj motora = 3,6° osi (primjer)
  const st = { met: 'brojac', os: 0, kut: [6, -4, 2, 9, -7, 3], ok: [false, false, false, false, false, false], pom: 0 };
  const svg = ui.svg(600, 300, 'Šest osi kao kružni pokazivači s oznakom i trenutačnim kutom; odabrana os istaknuta');
  const kot = [];
  for (let j = 0; j < 6; j++) {
    const cx = 52 + (j % 3) * 200, cy = 80 + Math.floor(j / 3) * 150;
    const g = S('g', { class: 'tur-rb' }, svg);
    S('circle', { cx, cy, r: 42 }, g);
    const ozn = S('line', { class: 'tur-prag', 'stroke-width': 3 }, svg);
    const kaz = S('line', { class: 'tur-oznaka-ulaz', 'stroke-width': 5 }, svg);
    S('circle', { cx, cy, r: 6, class: 'tur-tamno' }, svg);
    T(svg, cx + 52, cy - 18, 'os ' + (j + 1), 'tur-lb');
    const t1 = T(svg, cx + 52, cy + 6, '', 'tur-ls');
    const t2 = T(svg, cx + 52, cy + 28, '', 'tur-ls');
    klikabilno(ctx, g, 'Os ' + (j + 1), () => { st.os = j; kl.postavi(st.kut[j]); osvjezi(); });
    kot.push({ g, ozn, kaz, t1, t2, cx, cy });
  }
  function cilj(j) { return st.met === 'brojac' ? 0 : KAL[j]; }
  function osvjezi() {
    kot.forEach((K, j) => {
      const c = cilj(j), a = (st.met === 'brojac' ? st.kut[j] : KAL[j] + st.kut[j]) ;
      const m = pol(K.cx, K.cy, 48, c * RAD - Math.PI / 2), m0 = pol(K.cx, K.cy, 30, c * RAD - Math.PI / 2);
      K.ozn.setAttribute('x1', f1(m0[0])); K.ozn.setAttribute('y1', f1(m0[1])); K.ozn.setAttribute('x2', f1(m[0])); K.ozn.setAttribute('y2', f1(m[1]));
      const e = pol(K.cx, K.cy, 36, a * RAD - Math.PI / 2);
      K.kaz.setAttribute('x1', K.cx); K.kaz.setAttribute('y1', K.cy); K.kaz.setAttribute('x2', f1(e[0])); K.kaz.setAttribute('y2', f1(e[1]));
      K.g.classList.toggle('tur-akt', j === st.os);
      K.t1.textContent = (st.met === 'brojac' ? 'oznaka 0°' : 'kal. ' + hr(c, 1) + '°');
      K.t2.textContent = st.ok[j] ? '✓ ažurirano' : 'odmak ' + hrp(st.kut[j], 1) + '°';
    });
    const d = st.kut[st.os];
    o.o('os ' + (st.os + 1)); o.d(hrp(d, 2) + '°', Math.abs(d) <= KORAK / 2 ? 'ok' : 'opas');
    o.g('± ' + hr(KORAK / 2, 1) + '° (pola okretaja motora)');
  }
  function azuriraj(osi) {
    const los = osi.filter(j => Math.abs(st.kut[j]) > KORAK / 2);
    for (const j of osi) {
      const n = Math.round(st.kut[j] / KORAK);
      st.ok[j] = true;
      if (n !== 0) st.pom = n;
      st.kut[j] = st.kut[j] - n * KORAK;            // ostatak unutar okretaja ostaje točan
    }
    osvjezi();
    if (los.length) ui.stanje('Os ' + los.map(j => j + 1).join(', ') + ' nije bila unutar pola okretaja motora od oznake: upravljanje je odabralo pogrešan okretaj, pa je kut te osi sada pogrešan za višekratnik od 3,6°. Robot bi išao na pogrešne točke — ponovi ažuriranje s osi na oznaci.', 'opas');
    else ui.stanje('Brojači okretaja za osi ' + osi.map(j => j + 1).join(', ') + ' ažurirani. Kalibracija (nulti položaj) pritom se ne mijenja.', 'ok');
  }
  ui.seg('Postupak', [['brojac', 'Ažuriranje brojača okretaja'], ['fina', 'Kalibracija']], 'brojac', v => {
    st.met = v; osvjezi();
    ui.stanje(v === 'brojac' ? 'Dovedi os na sinkronizacijsku oznaku (ovdje 0°) i ažuriraj brojač okretaja.' : 'Kalibracija: os ide u kalibracijski položaj, a kalibracijskim alatom ili metodom Axis Calibration određuje se nulti položaj. Crvena crta pokazuje kalibracijski položaj svake osi.', 'plavo');
  });
  const kl = ui.klizac('Kut odabrane osi od oznake', -10, 10, 0.1, st.kut[0], v => hrp(v, 1) + '°', v => { st.kut[st.os] = v; st.ok[st.os] = false; osvjezi(); });
  const r = ui.red();
  ui.gumb('Na oznaku', () => { st.kut[st.os] = 0.3; kl.postavi(0.3); osvjezi(); ui.stanje('Os ' + (st.os + 1) + ' je na oznaci (odmak 0,3°).', 'ok'); }, { tanki: true, u: r });
  ui.gumb('Ažuriraj osi 1–3', () => azuriraj([0, 1, 2]), { u: r });
  ui.gumb('Ažuriraj osi 4–6', () => azuriraj([3, 4, 5]), { u: r });
  const o = ui.ocit([['o', 'Odabrana os'], ['d', 'Odmak od oznake'], ['g', 'Dopušteni odmak']]);
  const tab = H('table', { class: 'tur-tab' });
  tab.append(H('caption', { class: 'tur-sitno', tekst: 'Kalibracijski položaji (priručnik IRB 120)' }));
  tab.append(H('tr', {}, H('th', { tekst: 'os' }), H('th', { tekst: 'položaj' })));
  KAL.forEach((v, j) => tab.append(H('tr', {}, H('td', { tekst: String(j + 1) }), H('td', { tekst: hrp(v, 1) + '°' }))));
  ui.ocitP.append(tab);
  osvjezi();
  ui.stanje('Klikni os, klizačem je pomakni i ažuriraj brojač okretaja.');
}

/* =========================================================== IRB 4. sigurnosni lanci */
function tSigurnosniLanac(ui, ctx) {
  const UL = ['ES', 'AS', 'GS', 'ED', 'LS'];
  const OPIS = { ES: 'nužno zaustavljanje', AS: 'automatsko zaustavljanje', GS: 'opće zaustavljanje', ED: 'uređaj za omogućavanje', LS: 'granični prekidač' };
  const st = { nacin: 'auto', otv: { ES: false, AS: false, GS: false, ED: true, LS: false }, kvar: false, mon: false };
  const svg = ui.svg(600, 400, 'Dva sigurnosna lanca sa sklopkama ES, AS, GS, ED i LS, sklopnici K42 i K43 u vodu prema motorima i sklopnik kočnica K44');
  const X0 = 30, XK = 470, Y = [70, 170];
  const linije = [], skl = [[], []];
  for (let l = 0; l < 2; l++) {
    T(svg, X0, Y[l] - 26, 'lanac ' + (l + 1), 'tur-ls');
    linije.push(S('polyline', { points: pts([[X0, Y[l]], [XK, Y[l]]]), class: 'tur-kanal' }, svg));
    UL.forEach((u, j) => {
      const x = 70 + j * 80;
      const g = S('g', {}, svg);
      S('rect', { x: x - 26, y: Y[l] - 14, width: 52, height: 28, rx: 6, class: 'tur-blok' }, g);
      const s = S('line', { x1: x - 18, y1: Y[l], x2: x + 18, y2: Y[l], class: 'tur-sklopnik' }, g);
      T(g, x, Y[l] + 34, u, 'tur-l', 'middle');
      skl[l].push({ g, s, x });
    });
  }
  const kont = [0, 1].map(l => {
    const g = S('g', { class: 'tur-rb' }, svg);
    S('rect', { x: XK, y: Y[l] - 20, width: 100, height: 40, rx: 8 }, g);
    T(g, XK + 50, Y[l] + 6, l ? 'K43' : 'K42', 'tur-lb', 'middle');
    return g;
  });
  // vod prema motorima
  const yv = 300;
  S('rect', { x: 20, y: yv - 26, width: 90, height: 52, rx: 8, class: 'tur-blok' }, svg); T(svg, 65, yv + 6, 'pogon', 'tur-l', 'middle');
  const e1 = tok(svg, [[110, yv], [470, yv]], 'tur-e');
  const kk = [S('line', { class: 'tur-sklopnik' }, svg), S('line', { class: 'tur-sklopnik' }, svg)];
  T(svg, 230, yv - 16, 'K42', 'tur-ls', 'middle'); T(svg, 350, yv - 16, 'K43', 'tur-ls', 'middle');
  S('rect', { x: 470, y: yv - 26, width: 110, height: 52, rx: 8, class: 'tur-blok' }, svg); T(svg, 525, yv - 2, 'motori', 'tur-l', 'middle'); T(svg, 525, yv + 16, 'robota', 'tur-ls', 'middle');
  const k44 = S('g', { class: 'tur-rb' }, svg); S('rect', { x: 470, y: 340, width: 110, height: 40, rx: 8 }, k44); T(k44, 525, 366, 'K44 kočnice', 'tur-ls', 'middle');
  const tStanje = T(svg, 20, 384, '', 'tur-lb');
  function aktivan(u) { return u === 'AS' ? st.nacin === 'auto' : u === 'ED' ? st.nacin !== 'auto' : true; }
  function zatvoren(l) { return UL.every((u, j) => !aktivan(u) || !st.otv[u]) && !(l === 1 && st.kvar); }
  function osvjezi() {
    const z = [zatvoren(0), zatvoren(1)];
    for (let l = 0; l < 2; l++) {
      UL.forEach((u, j) => {
        const S2 = skl[l][j], otv = aktivan(u) && (st.otv[u] || (l === 1 && st.kvar && u === 'LS'));
        S2.s.setAttribute('x2', S2.x + 18); S2.s.setAttribute('y2', otv ? Y[l] - 14 : Y[l]);
        S2.g.style.opacity = aktivan(u) ? 1 : 0.4;
      });
      linije[l].classList.toggle('tur-kanal-otv', !z[l]);
      kont[l].classList.toggle('tur-akt', st.mon && z[0] && z[1]);
    }
    const on = st.mon && z[0] && z[1];
    if (st.mon && !(z[0] && z[1])) st.mon = false;
    kk[0].setAttribute('x1', 210); kk[0].setAttribute('y1', yv); kk[0].setAttribute('x2', 250); kk[0].setAttribute('y2', on ? yv : yv - 16);
    kk[1].setAttribute('x1', 330); kk[1].setAttribute('y1', yv); kk[1].setAttribute('x2', 370); kk[1].setAttribute('y2', on ? yv : yv - 16);
    e1.classList.toggle('tur-e-iskl', !on);
    k44.classList.toggle('tur-akt', on);
    tStanje.textContent = on ? 'motori pod napajanjem · kočnice otpuštene' : 'motori bez napajanja · kočnice drže';
    o.l1(z[0] ? 'zatvoren' : 'otvoren', z[0] ? 'ok' : 'opas'); o.l2(z[1] ? 'zatvoren' : 'otvoren', z[1] ? 'ok' : 'opas');
    o.m(on ? 'Motors On' : 'Motors Off', on ? 'ok' : 'upoz');
    o.d(z[0] !== z[1] ? 'lanci se ne slažu — kvar' : 'lanci se slažu', z[0] !== z[1] ? 'opas' : 'ok');
    return z;
  }
  ui.seg('Način rada', [['auto', 'Automatski'], ['rucni', 'Ručni']], 'auto', v => { st.nacin = v; st.mon = false; osvjezi(); ui.stanje(v === 'auto' ? 'Automatski način: AS je aktivan (vrata, ograda), uređaj za omogućavanje se ne koristi.' : 'Ručni način: aktivan je uređaj za omogućavanje (ED); AS se u ručnom načinu ne koristi.', 'plavo'); });
  const red = ui.red();
  for (const u of UL) ui.kvacica(u + ' otvoren (' + OPIS[u] + ')', st.otv[u], v => { st.otv[u] = v; osvjezi(); }, red);
  const r = ui.red();
  ui.gumb('Motors On', () => {
    const z = osvjezi();
    if (z[0] && z[1]) { st.mon = true; osvjezi(); ui.stanje('Oba lanca zatvorena: K42 i K43 privuku, motori dobiju napajanje, K44 otpušta kočnice.', 'ok'); }
    else {
      const otv = UL.filter(u => aktivan(u) && st.otv[u]);
      ui.stanje(z[0] !== z[1] ? 'Lanci se ne slažu: jedan je zatvoren, drugi otvoren. Upravljanje to vidi kao kvar u sigurnosnom krugu i ne uključuje motore.' : 'Motori se ne mogu uključiti: otvoren je ' + otv.join(', ') + (st.nacin !== 'auto' && st.otv.ED ? ' — u ručnom načinu lagano pritisni uređaj za omogućavanje.' : '.'), 'opas');
    }
  }, { u: r });
  ui.kvacica('Kvar: prekid u lancu 2', false, v => { st.kvar = v; osvjezi(); if (v) ui.stanje('Lanac 2 je prekinut (npr. prekinuta žica), a lanac 1 je zatvoren. Jedan lanac ne bi primijetio kvar; dva lanca se uspoređuju.', 'upoz'); }, r);
  const o = ui.ocit([['l1', 'Lanac 1 (K42)'], ['l2', 'Lanac 2 (K43)'], ['m', 'Motori'], ['d', 'Usporedba lanaca']]);
  osvjezi();
  ui.stanje('Zatvori sve aktivne ulaze i pritisni „Motors On”. U ručnom načinu ED mora biti zatvoren (lagano pritisnut).');
}

/* =========================================================== IRB 5. načini rada */
function tNacini(ui, ctx) {
  const st = { nacin: 'auto', vp: 500, ed: false, htr: false, s: 0, v: 0 };
  const svg = ui.svg(600, 360, 'Preklopnik načina rada s ključem, putanja TCP-a i pokazivač stvarne brzine');
  const PC = [100, 150];
  S('circle', { cx: PC[0], cy: PC[1], r: 66, class: 'tur-blok' }, svg);
  const POZ = { auto: -50, rucni: 0, puna: 50 };
  const NAZ = { auto: 'Auto', rucni: 'Ručni', puna: 'Ručni 100 %' };
  for (const k in POZ) { const p = pol(PC[0], PC[1], 86, (POZ[k] - 90) * RAD); T(svg, p[0], p[1] + 4, NAZ[k], 'tur-ls', 'middle'); }
  const kljuc = S('rect', { x: PC[0] - 9, y: PC[1] - 58, width: 18, height: 70, rx: 6, class: 'tur-tamno' }, svg);
  S('circle', { cx: PC[0], cy: PC[1], r: 16, class: 'tur-metal' }, svg);
  T(svg, PC[0], 262, 'preklopnik na ormaru', 'tur-ls', 'middle');
  // putanja
  const put = S('path', { d: 'M260,280 C300,80 420,60 470,150 S560,290 580,120', class: 'tur-putanja' }, svg);
  const tcp = S('circle', { r: 9, class: 'tur-tcp' }, svg);
  const g = graf(svg, 260, 300, 320, 40, { x0: 0, x1: 1, y0: 0, y1: 1000, yt: [0, 250, 1000], yf: v => v + '', ylab: false });
  const bar = S('rect', { x: 260, y: 306, height: 28, class: 'tur-traka-mj' }, svg);
  S('line', { x1: g.X(0.25), y1: 296, x2: g.X(0.25), y2: 344, class: 'tur-prag' }, svg); T(svg, g.X(0.25) + 4, 292, '250 mm/s', 'tur-ls');
  const tV = T(svg, 580, 292, '', 'tur-lb', 'end');
  let duz = 0;
  function smije() {
    if (st.nacin === 'auto') return true;
    if (st.nacin === 'rucni') return st.ed;
    return st.ed && st.htr;
  }
  function brzina() { if (!smije()) return 0; return st.nacin === 'rucni' ? Math.min(st.vp, 250) : st.vp; }
  function osvjezi() {
    kljuc.setAttribute('transform', `rotate(${POZ[st.nacin]} ${PC[0]} ${PC[1]})`);
    if (!duz) duz = put.getTotalLength();
    const p = put.getPointAtLength(st.s % 1 * duz);
    tcp.setAttribute('cx', f1(p.x)); tcp.setAttribute('cy', f1(p.y));
    tcp.classList.toggle('tur-tcp-stop', st.v === 0);
    bar.setAttribute('width', f1(320 * st.v / 1000));
    tV.textContent = st.v + ' mm/s';
    o.n(NAZ[st.nacin] === 'Ručni' ? 'ručni, smanjena brzina' : NAZ[st.nacin] === 'Auto' ? 'automatski' : 'ručni, puna brzina (opcija)');
    o.g(st.nacin === 'auto' ? 'ne koristi se' : st.ed ? 'pritisnut (položaj 2)' : 'pušten', st.nacin === 'auto' ? '' : st.ed ? 'ok' : 'opas');
    o.h(st.nacin === 'puna' ? (st.htr ? 'držana' : 'puštena') : 'ne traži se', st.nacin === 'puna' ? (st.htr ? 'ok' : 'opas') : '');
    o.v(st.v + ' mm/s', st.v ? 'ok' : 'upoz');
    o.z(st.nacin === 'auto' ? 'ograde i vrata (AS)' : 'uređaj za omogućavanje' + (st.nacin === 'puna' ? ' i hold-to-run' : '') + (st.nacin === 'rucni' ? ', ≤ 250 mm/s' : ''));
  }
  function poruka() {
    const v = brzina();
    if (st.nacin === 'auto') ui.stanje('Automatski način: program radi programiranom brzinom; u ćeliji ne smije biti nikoga — štite je vrata i ograde spojeni na AS.', 'plavo');
    else if (!st.ed) ui.stanje('Ručni način: uređaj za omogućavanje je pušten — robot stoji.', 'opas');
    else if (st.nacin === 'puna' && !st.htr) ui.stanje('Ručni način s punom brzinom traži i držanje tipke hold-to-run — robot stoji.', 'opas');
    else if (st.nacin === 'rucni' && st.vp > 250) ui.stanje('Programirano je ' + st.vp + ' mm/s, ali u ručnom načinu sa smanjenom brzinom TCP ide najviše 250 mm/s.', 'upoz');
    else ui.stanje('Robot se giba ' + v + ' mm/s.', 'ok');
  }
  ctx.petlja(dt => {
    const v = brzina();
    st.v = Math.round(lin(st.v, v, Math.min(1, dt * 6)));
    if (Math.abs(st.v - v) < 3) st.v = v;
    st.s += st.v * dt / 1400;
    osvjezi();
    return true;
  });
  ui.seg('Preklopnik', [['auto', 'Auto'], ['rucni', 'Ručni (smanjena brzina)'], ['puna', 'Ručni 100 % (opcija)']], 'auto', v => { st.nacin = v; poruka(); ctx.budi(); });
  ui.klizac('Programirana brzina TCP-a', 50, 1000, 50, st.vp, v => v + ' mm/s', v => { st.vp = v; poruka(); ctx.budi(); });
  const r = ui.red();
  ui.kvacica('Uređaj za omogućavanje lagano pritisnut', false, v => { st.ed = v; poruka(); ctx.budi(); }, r);
  ui.kvacica('Tipka hold-to-run držana', false, v => { st.htr = v; poruka(); ctx.budi(); }, r);
  const o = ui.ocit([['n', 'Način'], ['g', 'Uređaj za omogućavanje'], ['h', 'Hold-to-run'], ['v', 'Stvarna brzina TCP-a'], ['z', 'Zaštita']]);
  osvjezi(); poruka(); ctx.budi();
}

/* =========================================================== IRB 6. kočnice */
function tKocnicaIRB(ui, ctx) {
  const st = { mon: false, rel: false, q2: -20, q3: 40, w2: 0, w3: 0, teret: true };
  const svg = ui.svg(600, 400, 'Bočni prikaz robota s dva članka; kad su kočnice otpuštene bez napajanja motora, ruka pada pod vlastitom težinom');
  const B0 = [220, 300], L2 = 130, L3 = 150;
  S('line', { x1: 40, y1: 340, x2: 580, y2: 340, class: 'tur-pod' }, svg);
  S('rect', { x: 330, y: 300, width: 240, height: 40, class: 'tur-ploca' }, svg); T(svg, 450, 326, 'stol', 'tur-ls', 'middle');
  S('rect', { x: B0[0] - 40, y: B0[1], width: 80, height: 40, rx: 6, class: 'tur-baza' }, svg);
  const c2 = S('line', { class: 'tur-clanak' }, svg), c3 = S('line', { class: 'tur-clanak tur-clanak-t' }, svg);
  const j2 = S('circle', { r: 14, class: 'tur-zglob-c' }, svg), j3 = S('circle', { r: 11, class: 'tur-zglob-c' }, svg);
  const kt = S('rect', { width: 26, height: 22, rx: 3, class: 'tur-teret' }, svg);
  const k2 = S('circle', { r: 5 }, svg), k3 = S('circle', { r: 5 }, svg);
  const tS = T(svg, 20, 30, '', 'tur-lb');
  // ormar s tipkom
  S('rect', { x: 20, y: 60, width: 160, height: 104, rx: 8, class: 'tur-blok' }, svg); T(svg, 100, 82, 'IRC5 Compact', 'tur-ls', 'middle');
  const tip = S('circle', { cx: 100, cy: 118, r: 16 }, svg); T(svg, 100, 154, 'otpuštanje kočnica', 'tur-ls', 'middle');
  function poz() {
    const a2 = (-90 + st.q2) * RAD, A = [B0[0], B0[1]];
    const P2 = [A[0] + L2 * Math.cos(a2), A[1] + L2 * Math.sin(a2)];
    const a3 = a2 + st.q3 * RAD;
    const P3 = [P2[0] + L3 * Math.cos(a3 + Math.PI / 2), P2[1] + L3 * Math.sin(a3 + Math.PI / 2)];
    return [A, P2, P3];
  }
  function osvjezi() {
    const [A, P2, P3] = poz();
    c2.setAttribute('x1', A[0]); c2.setAttribute('y1', A[1]); c2.setAttribute('x2', f1(P2[0])); c2.setAttribute('y2', f1(P2[1]));
    c3.setAttribute('x1', f1(P2[0])); c3.setAttribute('y1', f1(P2[1])); c3.setAttribute('x2', f1(P3[0])); c3.setAttribute('y2', f1(P3[1]));
    j2.setAttribute('cx', A[0]); j2.setAttribute('cy', A[1]); j3.setAttribute('cx', f1(P2[0])); j3.setAttribute('cy', f1(P2[1]));
    kt.setAttribute('x', f1(P3[0] - 13)); kt.setAttribute('y', f1(P3[1] - 4)); kt.style.display = st.teret ? '' : 'none';
    const drzi = !st.mon && !st.rel;
    for (const [k, P] of [[k2, A], [k3, P2]]) { k.setAttribute('cx', f1(P[0] + 16)); k.setAttribute('cy', f1(P[1] - 16)); k.setAttribute('class', drzi ? 'tur-lampa-c' : 'tur-lampa-z'); }
    tip.setAttribute('class', st.rel ? 'tur-lampa-p' : 'tur-lampa-iskl');
    tS.textContent = st.mon ? 'motori drže ruku · kočnice otpuštene' : st.rel ? 'kočnice otpuštene, motori bez napajanja!' : 'kočnice drže';
    o.m(st.mon ? 'pod napajanjem' : 'bez napajanja', st.mon ? 'ok' : '');
    o.k(drzi ? 'zatvorene (drže)' : 'otpuštene', drzi ? 'ok' : st.mon ? 'ok' : 'opas');
    o.q(hr(st.q2, 0) + '° · ' + hr(st.q3, 0) + '°');
  }
  ctx.petlja(dt => {
    if (st.mon || !st.rel) { st.w2 = st.w3 = 0; osvjezi(); return false; }
    // jednostavna gravitacija: momenti oko zglobova, prigušenje, naslon
    const m = st.teret ? 1.4 : 1;
    const [A, P2, P3] = poz();
    const g3 = (P3[0] - P2[0]) / L3 * m, g2 = ((P2[0] - A[0]) / L2) * 1.2 + ((P3[0] - A[0]) / (L2 + L3)) * m;
    st.w2 += (g2 * 160 - st.w2 * 2.2) * dt; st.w3 += (g3 * 160 - st.w3 * 2.2) * dt;
    st.q2 = ogr(st.q2 + st.w2 * dt, -110, 110); st.q3 = ogr(st.q3 + st.w3 * dt, -110, 70);
    const [, , P3n] = poz();
    if (P3n[1] > 296 && P3n[0] > 330) { st.w2 = st.w3 = 0; osvjezi(); ui.stanje('Ruka je pala na stol. U stvarnosti bi mogla nekoga udariti ili oštetiti alat — kočnice se otpuštaju samo uz podupiranje ruke i bez ljudi ispod nje.', 'opas'); return false; }
    if (Math.abs(st.q2) >= 110 || st.q3 <= -110 || st.q3 >= 70) { st.w2 = st.w3 = 0; osvjezi(); return false; }
    osvjezi();
    return true;
  });
  const r = ui.red();
  const bM = ui.gumb('Motors On', () => { st.mon = !st.mon; bM.textContent = st.mon ? 'Motors Off' : 'Motors On'; bM.setAttribute('aria-pressed', String(st.mon)); osvjezi(); ui.stanje(st.mon ? 'Motori su pod napajanjem i drže ruku u položaju; kočnice su otpuštene. Ovo je normalno stanje pri radu.' : 'Motori su bez napajanja; kočnice su se zatvorile i drže ruku.', st.mon ? 'ok' : 'plavo'); ctx.budi(); }, { u: r, pritisak: false });
  const bR = ui.gumb('Drži: otpuštanje kočnica', null, { u: r, tanki: true });
  const dolje = e => { e.preventDefault(); st.rel = true; osvjezi(); if (!st.mon) ui.stanje('Kočnice svih osi su otpuštene, a motori nemaju napajanje — ruka pada pod vlastitom težinom.', 'opas'); else ui.stanje('Motori su pod napajanjem; tipka za otpuštanje kočnica ovdje ništa ne mijenja.', 'plavo'); ctx.budi(); };
  const gore = () => { if (!st.rel) return; st.rel = false; osvjezi(); if (!st.mon) ui.stanje('Tipka je puštena: kočnice su se zatvorile i ruka stoji gdje je stala.', 'upoz'); };
  ctx.on(bR, 'pointerdown', dolje); ctx.on(bR, 'pointerup', gore); ctx.on(bR, 'pointerleave', gore); ctx.on(bR, 'pointercancel', gore);
  ctx.on(bR, 'keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) dolje(e); });
  ctx.on(bR, 'keyup', e => { if (e.key === ' ' || e.key === 'Enter') gore(); });
  const r2 = ui.red();
  ui.gumb('Ispočetka', () => { st.q2 = -20; st.q3 = 40; st.w2 = st.w3 = 0; st.rel = false; osvjezi(); ui.stanje('Ruka je vraćena u početni položaj.'); }, { tanki: true, u: r2 });
  ui.kvacica('Teret na prirubnici', true, v => { st.teret = v; osvjezi(); }, r2);
  const o = ui.ocit([['m', 'Motori'], ['k', 'Kočnice'], ['q', 'Kut osi 2 · osi 3']]);
  ui.sitno('Umjesto tipke na ormaru kočnice se mogu otpustiti i vanjskim napajanjem 24 V na priključku R1.MP na postolju robota — s istim oprezom.');
  osvjezi();
  ui.stanje('Drži tipku „otpuštanje kočnica” dok su motori isključeni.');
}

/* =========================================================== IRB 7. sferno zapešće */
function tZapesce(ui, ctx) {
  const Z2 = 290, A2L = 270, Z4 = 70, XW = 302, XF = 72;
  const st = { q2: 0, q3: 0, q5: 30 };
  const svg = ui.svg(600, 440, 'Bočni prikaz robota IRB 120 s osima 2, 3 i 5; crte pokazuju osi 4 i 6, koje se u singularnosti poklope');
  const K = 0.52, OX = 150, OY = 400;
  const P = (x, z) => [OX + x * K, OY - z * K];
  S('line', { x1: 20, y1: OY, x2: 590, y2: OY, class: 'tur-pod' }, svg);
  S('rect', { x: OX - 40, y: OY - Z2 * K * 0.55, width: 80, height: Z2 * K * 0.55, rx: 6, class: 'tur-baza' }, svg);
  const doseg = S('circle', { r: 580 * K, class: 'tur-doseg' }, svg);
  const os4 = S('line', { class: 'tur-os-crta', 'stroke-width': 2 }, svg), os6 = S('line', { class: 'tur-os-crta', 'stroke-width': 2 }, svg);
  const cA = S('polyline', { class: 'tur-clanak', fill: 'none' }, svg), cB = S('polyline', { class: 'tur-clanak tur-clanak-t', fill: 'none' }, svg);
  const cC = S('line', { class: 'tur-clanak tur-clanak-t' }, svg);
  const j2 = S('circle', { r: 12, class: 'tur-zglob-c' }, svg), j3 = S('circle', { r: 10, class: 'tur-zglob-c' }, svg), wc = S('circle', { r: 8, class: 'tur-tocka' }, svg);
  const fl = S('circle', { r: 6, class: 'tur-tcp' }, svg);
  const tW = T(svg, 0, 0, 'središte zapešća', 'tur-ls');
  const tA = T(svg, 20, 30, '', 'tur-alarm');
  const tO4 = T(svg, 0, 0, 'os 4', 'tur-ls'), tO6 = T(svg, 0, 0, 'os 6', 'tur-ls');
  function fk() {
    const a2 = st.q2 * RAD, a3 = (st.q2 + st.q3) * RAD;
    const J2 = [0, Z2];
    const J3 = [J2[0] + A2L * Math.sin(a2), J2[1] + A2L * Math.cos(a2)];
    const U = [Math.cos(a3), -Math.sin(a3)], N = [Math.sin(a3), Math.cos(a3)]; // smjer podlaktice i okomica (gore)
    const J4 = [J3[0] + N[0] * Z4, J3[1] + N[1] * Z4];
    const W = [J4[0] + U[0] * XW, J4[1] + U[1] * XW];
    const a5 = a3 + st.q5 * RAD;
    const D6 = [Math.cos(a5), -Math.sin(a5)];
    const F = [W[0] + D6[0] * XF, W[1] + D6[1] * XF];
    return { J2, J3, J4, W, F, U, D6 };
  }
  function osvjezi() {
    const R = fk();
    const p2 = P(...R.J2), p3 = P(...R.J3), p4 = P(...R.J4), pw = P(...R.W), pf = P(...R.F);
    cA.setAttribute('points', pts([P(0, Z2 * 0.55), p2, p3]));
    cB.setAttribute('points', pts([p3, p4, pw]));
    cC.setAttribute('x1', f1(pw[0])); cC.setAttribute('y1', f1(pw[1])); cC.setAttribute('x2', f1(pf[0])); cC.setAttribute('y2', f1(pf[1]));
    j2.setAttribute('cx', f1(p2[0])); j2.setAttribute('cy', f1(p2[1])); j3.setAttribute('cx', f1(p3[0])); j3.setAttribute('cy', f1(p3[1]));
    wc.setAttribute('cx', f1(pw[0])); wc.setAttribute('cy', f1(pw[1])); fl.setAttribute('cx', f1(pf[0])); fl.setAttribute('cy', f1(pf[1]));
    doseg.setAttribute('cx', f1(p2[0])); doseg.setAttribute('cy', f1(p2[1]));
    const Lo = 150;
    const e4a = [pw[0] - R.U[0] * Lo * 1.4, pw[1] + R.U[1] * Lo * 1.4], e4b = [pw[0] + R.U[0] * Lo, pw[1] - R.U[1] * Lo];
    const e6b = [pw[0] + R.D6[0] * Lo, pw[1] - R.D6[1] * Lo];
    os4.setAttribute('x1', f1(e4a[0])); os4.setAttribute('y1', f1(e4a[1])); os4.setAttribute('x2', f1(e4b[0])); os4.setAttribute('y2', f1(e4b[1]));
    os6.setAttribute('x1', f1(pw[0])); os6.setAttribute('y1', f1(pw[1])); os6.setAttribute('x2', f1(e6b[0])); os6.setAttribute('y2', f1(e6b[1]));
    tO4.setAttribute('x', f1(e4a[0])); tO4.setAttribute('y', f1(e4a[1] - 8)); tO6.setAttribute('x', f1(e6b[0] + 4)); tO6.setAttribute('y', f1(e6b[1] + 18));
    tW.setAttribute('x', f1(pw[0] + 10)); tW.setAttribute('y', f1(pw[1] - 12));
    const sing = Math.abs(st.q5) < 5;
    os4.style.stroke = sing ? B.crv : ''; os6.style.stroke = sing ? B.crv : '';
    tA.textContent = sing ? 'SINGULARNOST: osi 4 i 6 na istom pravcu' : '';
    const dW = Math.hypot(R.W[0] - R.J2[0], R.W[1] - R.J2[1]);
    o.w('x ' + hr(R.W[0], 0) + ' · z ' + hr(R.W[1], 0) + ' mm');
    o.f('x ' + hr(R.F[0], 0) + ' · z ' + hr(R.F[1], 0) + ' mm');
    o.d(hr(dW, 0) + ' mm');
    o.s(sing ? 'singularnost zapešća' : Math.abs(st.q5) < 15 ? 'blizu singularnosti' : 'izvan singularnosti', sing ? 'opas' : Math.abs(st.q5) < 15 ? 'upoz' : 'ok');
    if (sing) ui.stanje('Os 5 je na ' + hr(st.q5, 1) + '°: osi 4 i 6 su na istom pravcu. Zakret alata oko tog pravca može dati i os 4 i os 6 — kutovi nisu jednoznačni, a pravocrtno gibanje kroz ovaj položaj može naglo zavrtjeti osi 4 i 6.', 'opas');
    else ui.stanje('Os 5 na ' + hr(st.q5, 1) + '°: osi 4 i 6 nisu poravnate, orijentacija alata je jednoznačna.', Math.abs(st.q5) < 15 ? 'upoz' : 'ok');
  }
  ui.klizac('Os 2', -110, 110, 1, 0, v => hrp(v, 0) + '°', v => { st.q2 = v; osvjezi(); });
  ui.klizac('Os 3', -110, 70, 1, 0, v => hrp(v, 0) + '°', v => { st.q3 = v; osvjezi(); });
  const k5 = ui.klizac('Os 5', -120, 120, 0.5, st.q5, v => hrp(v, 1) + '°', v => { st.q5 = v; osvjezi(); });
  const r = ui.red();
  ui.gumb('Os 5 na 0°', () => { st.q5 = 0; k5.postavi(0); osvjezi(); }, { tanki: true, u: r });
  ui.gumb('Nulti položaj', () => { st.q2 = 0; st.q3 = 0; st.q5 = 0; ui.upr.querySelectorAll('input[type=range]').forEach(i => { i.value = 0; i.dispatchEvent(new Event('input')); }); }, { tanki: true, u: r });
  const o = ui.ocit([['w', 'Središte zapešća'], ['f', 'Prirubnica'], ['d', 'Udaljenost od osi 2'], ['s', 'Stanje']]);
  ui.sitno('U nultom položaju središte zapešća je na x = 302 mm, z = 630 mm. Krug pokazuje doseg 580 mm, nacrtan oko osi 2 samo kao mjerilo.');
  osvjezi();
}

/* =========================================================== IRB 8. ormar IRC5 Compact */
function tOrmarIRC5(ui, ctx) {
  const OPIS = {
    mreza: 'Mreža: jednofazni priključak 220/230 V, 50–60 Hz.',
    filtar: 'Mrežni filtar i glavna sklopka: filtar guši smetnje prema mreži i iz nje; glavnom sklopkom na prednjoj ploči uključuje se ormar.',
    izvor: 'Izvor napajanja 24 V: napaja računala, ploče, ventilatore i ulaze i izlaze.',
    pogon: 'Pogonska jedinica (drive unit): iz zadane struje stvara trofazni napon za šest motora robota. Pri kočenju motori rade kao generatori i vraćaju energiju u nju.',
    otp: 'Kočioni otpornik: energiju koju motori vraćaju pri kočenju pretvara u toplinu.',
    glavno: 'Glavno računalo: izvodi RobotWare i RAPID program, planira putanje, poslužuje FlexPendant (LAN1), mrežu i USB.',
    osno: 'Osno računalo: regulacija osi i obrada mjerenja s robota preko priključka R1.SMB.',
    sig: 'Sigurnosna ploča i sklopnici: nadzire dva sigurnosna lanca (ES, AS, GS, ED, LS); sklopnici K42 i K43 uključuju napajanje motora, K44 kočnice.',
    io: 'I/O ploča: 16 digitalnih ulaza i 16 izlaza (24 V), proširivo; tu se spajaju senzori, hvataljka i signali prema PLC-u.',
    fp: 'FlexPendant: privjesak za učenje spojen na LAN1 glavnog računala.',
    robot: 'Robot: motori preko priključka R1.MP, mjerenja preko signalnog kabela do R1.SMB.'
  };
  const st = { mon: false, koc: false, off: 0 };
  const svg = ui.svg(600, 484, 'Blok-shema upravljačkog ormara IRC5 Compact s tokovima energije i signala');
  const { bl, blok } = blokovi(ui, ctx, svg, OPIS);
  S('rect', { x: 140, y: 14, width: 316, height: 440, rx: 14, class: 'tur-okvir-crtkan' }, svg);
  T(svg, 298, 446, 'IRC5 Compact', 'tur-ls', 'middle');
  blok('mreza', 8, 30, 120, 56, 'Mreža', '220/230 V');
  blok('filtar', 156, 30, 130, 56, 'Filtar i', 'glavna sklopka');
  blok('izvor', 310, 30, 130, 56, 'Izvor', '24 V');
  blok('glavno', 156, 130, 130, 56, 'Glavno', 'računalo');
  blok('osno', 310, 130, 130, 56, 'Osno', 'računalo');
  blok('sig', 156, 230, 130, 56, 'Sigurnosna', 'ploča, K42/K43');
  blok('pogon', 310, 230, 130, 56, 'Pogonska', 'jedinica');
  blok('otp', 310, 330, 130, 50, 'Kočioni', 'otpornik');
  blok('io', 156, 330, 130, 50, 'I/O ploča', '16 / 16');
  blok('fp', 8, 130, 120, 56, 'FlexPendant', 'LAN1');
  blok('robot', 472, 180, 120, 70, 'Robot', '6 motora');
  const E = [
    tok(svg, [[128, 58], [156, 58]], 'tur-e'),
    tok(svg, [[286, 58], [310, 58]], 'tur-e'),
    tok(svg, [[296, 58], [296, 210], [375, 210], [375, 230]], 'tur-e')
  ];
  const eMot = tok(svg, [[440, 258], [472, 230]], 'tur-e');
  const eKoc = tok(svg, [[375, 286], [375, 330]], 'tur-e');
  const Sg = [
    tok(svg, [[128, 158], [156, 158]], 'tur-s'),
    tok(svg, [[286, 150], [310, 150]], 'tur-s'),
    tok(svg, [[375, 186], [375, 200], [420, 200], [420, 230]], 'tur-s'),
    tok(svg, [[221, 186], [221, 230]], 'tur-s'),
    tok(svg, [[221, 286], [221, 330]], 'tur-s'),
    tok(svg, [[472, 200], [440, 170]], 'tur-s'),
    tok(svg, [[286, 258], [310, 258]], 'tur-s')
  ];
  T(svg, 452, 168, 'R1.SMB', 'tur-ls'); T(svg, 446, 276, 'R1.MP', 'tur-ls');
  const tS = T(svg, 8, 478, '', 'tur-ls');
  function osvjezi() {
    for (const p of E) p.style.strokeDashoffset = f1(-st.off);
    eMot.style.opacity = st.mon ? 1 : 0.12; eMot.style.strokeDashoffset = f1(st.koc ? st.off : -st.off);
    eKoc.style.opacity = st.koc ? 1 : 0.12; eKoc.style.strokeDashoffset = f1(-st.off);
    for (const p of Sg) p.style.strokeDashoffset = f1(-st.off * 0.7);
    bl.otp.classList.toggle('tur-vruce', st.koc);
    bl.robot.classList.toggle('tur-akt', st.mon);
    tS.textContent = 'narančasto: energija · plavo: signali' + (st.koc ? ' · kočenje: energija teče od motora prema otporniku' : '');
    o.m(st.mon ? 'Motors On' : 'Motors Off', st.mon ? 'ok' : 'upoz');
    o.k(st.koc ? 'motori vraćaju energiju → otpornik' : '—', st.koc ? 'upoz' : '');
  }
  ctx.petlja(dt => { st.off += dt * 40; osvjezi(); return true; });
  const r = ui.red();
  const bM = ui.gumb('Motors On', () => { st.mon = !st.mon; if (!st.mon) st.koc = false; bM.textContent = st.mon ? 'Motors Off' : 'Motors On'; bM.setAttribute('aria-pressed', String(st.mon)); osvjezi(); ui.stanje(st.mon ? 'K42 i K43 su uključeni: pogonska jedinica napaja motore robota.' : 'Motori su bez napajanja; kočnice drže ruku.', st.mon ? 'ok' : 'plavo'); }, { u: r, pritisak: false });
  ui.gumb('Kočenje', () => {
    if (!st.mon) { ui.stanje('Najprije uključi motore (Motors On).', 'upoz'); return; }
    st.koc = true; osvjezi(); ui.stanje('Robot usporava: motori rade kao generatori, energija se vraća u pogonsku jedinicu i troši u kočionom otporniku.', 'upoz');
    ctx.odgodi(() => { st.koc = false; osvjezi(); }, 2600);
  }, { tanki: true, u: r });
  const o = ui.ocit([['m', 'Motori'], ['k', 'Kočenje']]);
  ui.sitno('Priključci računala: Service, LAN1 (FlexPendant), LAN2/LAN3, WAN i USB. Mrežne sabirnice (npr. PROFINET, EtherNet/IP, DeviceNet) dodaju se kao opcije.');
  osvjezi(); ctx.budi();
  ui.stanje('Klikni blok za opis ili pritisni „Motors On”.');
}

/* =========================================================== IRB 9. virtualni kontroler */
function tVirtualniKontroler(ui, ctx) {
  const KORACI = [
    ['CAD', 'CAD model ćelije, alata i predmeta uvozi se u RobotStudio.'],
    ['Stanica', 'Robot, alat, predmeti i radni stol slažu se u stanicu; zadaju se alat (tooldata) i radni objekt (wobjdata).'],
    ['RAPID', 'Točke i putanje (ručno ili iz rubova CAD modela) postaju RAPID program na virtualnom kontroleru.'],
    ['Simulacija', 'Virtualni kontroler izvodi program istim RobotWareom kao stvarni ormar: provjeravaju se doseg, sudari i vrijeme ciklusa.'],
    ['Prijenos', 'Program i konfiguracija prenose se na stvarni IRC5 (mreža ili USB).'],
    ['Korekcija', 'Na stvarnom robotu, u ručnom načinu sa smanjenom brzinom, dotjeraju se točke koje se razlikuju od modela (npr. stvarni položaj predmeta).']
  ];
  const USP = {
    rs: { n: 'RobotStudio', p: ['isti RobotWare kao stvarni ormar', 'Windows računalo, instalacija', 'putanje i vremena ciklusa vjerni stvarnom robotu', 'nije cilj', 'ne'] },
    dos: { n: 'Simulatori u pregledniku', p: ['vlastiti kod kinematike i putanja', 'preglednik, i mobitel, bez instalacije', 'približni — razliku prema robotu treba izmjeriti', 'ne', 'ne'] },
    hr: { n: 'RobotStudio HyperReality', p: ['isti RobotWare + scena iz NVIDIA Omniversea', 'RobotStudio i zahtjevna grafička kartica (RTX)', 'ABB navodi do 99 % pri prijenosu u stvarnost', 'da — svjetlo, refleksije, kamera', 'da — za učenje modela vida'] }
  };
  const st = { k: 0, radi: false, t: 0, usp: 'rs' };
  const svg = ui.svg(600, 330, 'Koraci od CAD modela do stvarnog robota; isti RobotWare u virtualnom i stvarnom kontroleru');
  const gk = KORACI.map((K, j) => {
    const x = 10 + j * 98, g = S('g', { class: 'tur-broj-k' }, svg);
    S('circle', { cx: x + 44, cy: 60, r: 26 }, g);
    T(g, x + 44, 67, String(j + 1), 'tur-lb', 'middle');
    T(svg, x + 44, 110, K[0], 'tur-l', 'middle');
    klikabilno(ctx, g, 'Korak ' + (j + 1) + ': ' + K[0], () => { st.k = j; osvjezi(); });
    if (j < 5) strel(svg, x + 72, 60, x + 114, 60, { w: 2, gl: 8, boja: 'var(--body)' });
    return g;
  });
  // dva kontrolera
  const vk = S('g', { class: 'tur-rb' }, svg); S('rect', { x: 20, y: 160, width: 250, height: 120, rx: 12 }, vk);
  T(vk, 145, 186, 'virtualni kontroler', 'tur-l', 'middle'); T(vk, 145, 206, '(RobotStudio na računalu)', 'tur-ls', 'middle');
  const sk = S('g', { class: 'tur-rb' }, svg); S('rect', { x: 330, y: 160, width: 250, height: 120, rx: 12 }, sk);
  T(sk, 455, 186, 'stvarni IRC5', 'tur-l', 'middle'); T(sk, 455, 206, '(ormar uz robota)', 'tur-ls', 'middle');
  for (const x of [45, 355]) { S('rect', { x, y: 220, width: 200, height: 44, rx: 8, class: 'tur-pomicni' }, svg); T(svg, x + 100, 248, 'RobotWare + RAPID', 'tur-l', 'middle'); }
  const pren = tok(svg, [[270, 242], [330, 242]], 'tur-s');
  const tOp = T(svg, 300, 316, '', 'tur-ls', 'middle');
  let off = 0;
  function osvjezi() {
    gk.forEach((g, j) => g.classList.toggle('tur-akt', j === st.k));
    vk.classList.toggle('tur-akt', st.k >= 2 && st.k <= 3);
    sk.classList.toggle('tur-akt', st.k >= 4);
    pren.style.opacity = st.k === 4 ? 1 : 0.15; pren.style.strokeDashoffset = f1(-off);
    tOp.textContent = KORACI[st.k][1].length > 90 ? '' : KORACI[st.k][1];
    ui.stanje('Korak ' + (st.k + 1) + ' — ' + KORACI[st.k][0] + ': ' + KORACI[st.k][1], 'plavo');
    const U = USP[st.usp];
    o.a(U.p[0]); o.b(U.p[1]); o.c(U.p[2], st.usp === 'hr' ? 'upoz' : ''); o.d(U.p[3]); o.e(U.p[4]);
  }
  ctx.petlja(dt => {
    off += dt * 40;
    if (st.radi) { st.t += dt; if (st.t > 2.6) { st.t = 0; if (st.k < 5) st.k++; else { st.radi = false; bP.textContent = 'Pokreni slijed'; } } }
    osvjezi();
    return st.radi || st.k === 4;
  });
  const r = ui.red();
  ui.gumb('← Prethodni', () => { st.k = Math.max(0, st.k - 1); osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  ui.gumb('Sljedeći →', () => { st.k = Math.min(5, st.k + 1); osvjezi(); ctx.budi(); }, { tanki: true, u: r });
  const bP = ui.gumb('Pokreni slijed', () => { st.radi = !st.radi; if (st.radi) { st.k = 0; st.t = 0; } bP.textContent = st.radi ? 'Zaustavi' : 'Pokreni slijed'; osvjezi(); ctx.budi(); }, { u: r });
  ui.seg('Usporedi', [['rs', 'RobotStudio'], ['dos', 'Naši simulatori'], ['hr', 'HyperReality']], 'rs', v => { st.usp = v; osvjezi(); });
  const o = ui.ocit([['a', 'Što izvodi program'], ['b', 'Gdje radi'], ['c', 'Vjernost'], ['d', 'Fotorealistična scena'], ['e', 'Sintetički podaci']]);
  osvjezi();
}

/* =========================================================== izvoz */
const GRADITELJI = {
  valni: tValni, motor: tMotor, regulacija: tRegulacija, zaustavljanje: tZaustavljanje, tripolozajni: tTripolozajni,
  remen: tRemen, mjerenje: tMjerenje, kalibracija: tKalibracija, sigurnosniLanac: tSigurnosniLanac, nacini: tNacini,
  kocnica: tKocnicaIRB, zapesce: tZapesce, ormarIRC5: tOrmarIRC5, virtualniKontroler: tVirtualniKontroler
};

export function prikazi(el, id) {
  if (!el) throw new Error('teme_irb: nedostaje element');
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
