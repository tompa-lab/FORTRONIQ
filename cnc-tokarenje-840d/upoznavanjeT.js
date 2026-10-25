/* FORTRONIQ · CNC tokarenje, SINUMERIK 840D — Upoznavanje stroja (3D).
   Izbornik od 57 stavki istim redom i ugniježđenošću kao tečaj SITRAIN 840D (tokarenje); tekst, model i sučelje su naši.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviStroj, REF } from './strojTok.js?v=01';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ================================================================== */
/* 1. Izbornik: [broj, razina, naziv, engleski naziv, dijelovi, tekst, tema, pogled]  */
/* ================================================================== */
const MENI = [
  [1, 0, 'Upoznavanje tokarilice', 'Lathe familiarisation', [],
    'Ovo je CNC tokarilica s kosom posteljom, revolverskom glavom i upravljanjem SINUMERIK 840D. Obradak je stegnut u steznoj glavi i vrti se s glavnim vretenom, a alat se giba u dvije osi: X (prema osi vretena i od nje) i Z (usporedno s osi vretena). U izborniku odaberi sklop: model se okrene prema njemu i istakne ga, a ovdje dobiješ objašnjenje. Stavke sa strelicom otvaraju podizbornik. Kad pogledaš stavku, uz nju se pojavi kvačica.', null, 'stroj'],
  [2, 1, 'Cijeli stroj', 'Complete machine', [],
    'Stroj čine postelja s glavom glavnog vretena, uzdužne saonice (os Z) i poprečne saonice (os X) s revolverskom glavom te konjić. Radni prostor zatvara kabina s kliznim vratima. Iza stroja je električni ormar s upravljanjem, PLC-om, hidrauličkim agregatom i centralnim podmazivanjem, a desno transporter strugotine s posudom rashladnog sredstva. Gumbima ispod prikaza pomakni osi X i Z, zakreni revolver ili pokreni vreteno. Mišem iznad dijela dobiješ njegov naziv, a klikom ga odabireš.', null, 'stroj'],
  [3, 1, 'Upravljačka ploča', 'Control panel', ['upravljanje'],
    'Upravljačka ploča je ormarić na zakretnom nosaču s desne prednje strane kabine, pa je korisnik može okrenuti prema sebi. Gore su zaslon i softkeyevi, ispod tipkovnica za unos programa, a dolje strojna upravljačka ploča s načinima rada, tipkama osi X i Z, tipkama za revolver, korekcijama i gljivom za nužno zaustavljanje. Ispod 3D prikaza otvorila se ploča: prijeđi mišem ili dodirni bilo koji njezin dio i pročitaj čemu služi. Rad na upravljanju vježbaš na stranici Postavljanje stroja. (Na izvornom tečaju ova stavka izbornika za tokarilicu nema sadržaja; ploča je ista kao kod glodalice.)', null, 'ploca'],
  [4, 1, 'Postelja stroja', 'Machine bed', ['postelja'],
    'Postelja je nosivi temelj stroja: na njoj su glava glavnog vretena, vodilice uzdužnih saonica i vodilice konjića. Ovdje je izvedena kao kosa postelja — ploha s vodilicama nagnuta je za 45°, a revolver radi iza i iznad osi vretena. Tako strugotina slobodno pada u korito transportera, a ne na vodilice, korisnik lakše dohvati steznu glavu, a sile rezanja idu u masivno tijelo postelje. Klikni „Kako radi” za usporedbu ravne i kose postelje.', 'izvedbeT', 'postelja'],
  [5, 2, 'Kuglično navojno vreteno, os Z', 'Ball screw drive, Z axis', ['vretenoZ'],
    'Vreteno osi Z leži na kosoj plohi postelje između vodilica, a matica je pričvršćena ispod uzdužnih saonica. Kad servomotor zakreće vreteno, matica s uzdužnim saonicama, poprečnim saonicama i revolverom giba se usporedno s osi glavnog vretena. Jednim okretajem saonice se pomaknu za korak navoja. Vreteno je uležišteno na oba kraja; u prikazu su ostali dijelovi poluprozirni da se vidi ispod saonica. Klikni „Kako radi” i pogledaj kako kuglice kruže u matici.', 'kuglicno', 'saonice'],
  [6, 2, 'Vodilice, os Z', 'Guide, Z axis', ['vodiliceZ'],
    'Na kosoj plohi postelje su dvije profilne linearne vodilice po kojima se gibaju uzdužne saonice. Svaku vodilicu obuhvaćaju dvoja kotrljajna kolica, pa je trenje malo, a gibanje mirno i bez zračnosti. Vodilice određuju pravocrtnost gibanja u Z, a o tome izravno ovisi cilindričnost tokarenog promjera: ako vodilica nije usporedna s osi vretena, umjesto valjka nastaje stožac. Vodilice se maže centralnim podmazivanjem.', null, 'saonice'],
  [7, 2, 'Mjerni sustav, os Z', 'Measuring system, Z axis', ['mjerniZ'],
    'Os Z ima izravni mjerni sustav: staklena mjerna letva pričvršćena je uz prednji rub kosine postelje, a glava za očitavanje giba se s uzdužnim saonicama. Tako se mjeri stvarni položaj saonica, a ne kut zakreta motora — zračnost u vretenu i toplinsko istezanje vretena ne kvare mjerenje. Upravljanje stalno uspoređuje izmjereni i zadani položaj i prema razlici regulira motor. Klikni „Kako radi” i pogledaj kako letva pretvara svjetlosne impulse u broj.', 'mjerni', 'saonice'],
  [8, 2, 'Servomotor, os Z', 'Servo motor, Z axis', ['servoZ'],
    'Os Z pokreće izmjenični servomotor na desnom kraju postelje, spojen s kugličnim vretenom elastičnom spojkom. Motor na stražnjem kraju ima davač kojim upravljanje regulira brzinu vrtnje, dok položaj saonica javlja mjerna letva. Brzinu i ubrzanje motora zadaje upravljanje: brzi hod G0 najvećom brzinom osi, a rezanje G1 programiranim posmakom.', null, 'krajDesno'],
  [9, 2, 'Vodilice konjića', 'Tailstock guide', ['vodiliceKonjica'],
    'Konjić ima svoje vodilice na donjem dijelu kose plohe, ispod vodilica uzdužnih saonica. Po njima se konjić namješta uzduž postelje prema duljini obratka i ondje se steže. Odvojene vodilice znače da konjić i saonice ne dijele iste staze, pa se ne ometaju i ne troše jednako. Prije gibanja konjića provjeri da mu se revolver i alati ne nalaze na putu.', null, 'konjic'],
  [10, 1, 'Uzdužne saonice', 'Longitudinal slide', ['uzduzne'],
    'Uzdužne saonice gibaju se po vodilicama Z na postelji i nose vodilice osi X. Na njima su poprečne saonice s revolverskom glavom. Pomak u Z dakle giba cijeli sklop: uzdužne saonice, poprečne saonice, revolver i sve alate. Gumbom „Pomakni Z” pogledaj koji se dijelovi gibaju zajedno.', null, 'saonice'],
  [11, 2, 'Linearni motor, os X', 'Linear motor, X axis', ['linmotX'],
    'Os X pokreće linearni motor. Niz trajnih magneta (sekundarni dio) leži na uzdužnim saonicama između vodilica X, a primarni dio s namotima pričvršćen je ispod poprečnih saonica. Magnetsko polje izravno vuče poprečne saonice — nema vretena, matice ni spojke. Linearni motor postiže veće ubrzanje i brzinu od kugličnog vretena, a nema zračnosti ni trošenja u prijenosu. Klikni „Kako radi” za usporedbu.', 'linearni', 'saonice'],
  [12, 2, 'Vodilice, os X', 'Guide, X axis', ['vodiliceX'],
    'Dvije vodilice osi X pričvršćene su na uzdužne saonice i idu niz kosinu, okomito na os vretena. Po njima se na četvera kolica gibaju poprečne saonice s revolverom. Vodilice X moraju biti točno okomite na os vretena, jer o tome ovisi ravnost tokarenog čela: ako nisu, čelo izađe blago stožasto (udubljeno ili ispupčeno).', null, 'saonice'],
  [13, 2, 'Mjerni sustav, os X', 'Measuring system, X axis', ['mjerniX'],
    'I os X ima izravni mjerni sustav: staklena mjerna letva je na boku uzdužnih saonica, a glava za očitavanje na poprečnim saonicama. Kod linearnog motora izravno mjerenje je nužno, jer nema vretena iz čijeg bi se zakreta mogao izračunati položaj. Upravljanje položaj u X prikazuje kao promjer: pomak saonica za 1 mm mijenja X za 2 mm.', 'mjerni', 'saonice'],
  [14, 1, 'Poprečne saonice', 'Cross slide', ['poprecne'],
    'Poprečne saonice gibaju se po vodilicama X niz kosinu i nose revolversku glavu. Os X giba alat prema osi vretena (X−, manji promjer) ili od nje (X+). Pri programiranju X zadaješ kao promjer: X0 je os vretena. Gumbom „Pomakni X” pogledaj kako se poprečne saonice s revolverom gibaju koso, gore-natrag i dolje-naprijed.', null, 'saonice'],
  [15, 2, 'Revolverska glava', 'Tool turret', ['revolver', 'disk', 'drzaci', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
    'Revolverska glava nosi sve alate potrebne za obradu. Ploča revolvera ima 12 mjesta; na našem modelu zauzeto je osam. Kad se pozove alat (npr. T3), revolver se zakrene tako da taj alat dođe u radni položaj — na mjesto najbliže osi vretena. Zakretanje traje djelić sekunde i ne treba izmjenjivač kao kod glodalice. Prije zakretanja revolver se odmakne dovoljno daleko da alati ne udare u obradak ili steznu glavu. Gumbom „Zakreni revolver” pogledaj kako se ploča okreće.', null, 'revolver'],
  [16, 3, 'Ploča revolvera', 'Tool disc', ['disk'],
    'Ploča revolvera ima dvanaest mjesta s prihvatima za držače alata; mjesta su označena brojevima 1 … 12. Broj mjesta je broj alata u programu (T1 … T12). Ploča se zakreće i zatim mehanički blokira, da sile rezanja ne bi zakrenule alat. Prazna mjesta zatvorena su čepovima, da u prihvat ne uđe strugotina.', null, 'revolver'],
  [17, 3, 'Držač alata', 'Tool holder', ['drzaci'],
    'Držač povezuje alat s pločom revolvera. Za vanjske noževe to je držač s utorom za nož, za unutarnje noževe i svrdla čahura u koju se umetne držač ili svrdlo. Položaj vrha alata prema referentnoj točki revolvera mjeri se izvan stroja ili na stroju i upisuje u korekcije alata (Length1 u X, Length2 u Z, polumjer oštrice). Ako se alat pomakne u držaču, korekcija više ne vrijedi.', null, 'revolver'],
  [18, 3, 'T1 vanjski nož za grubo tokarenje 80°', 'T1 External roughing tool 80°', ['T1'],
    'Vanjski nož s rombnom pločicom kuta 80° za grubo uzdužno i poprečno tokarenje. Pločica je čvrsta i podnosi veliku dubinu rezanja i posmak. Polumjer vrha pločice je 0,8 mm — upisuje se u korekcije i potreban je za korekciju putanje G41/G42. Na simulatoru njime se poravnava čelo obratka.', null, 'revolver'],
  [19, 3, 'T2 svrdlo za puno bušenje Ø32', 'T2 Full drilling tool 32mm', ['T2'],
    'Svrdlo s izmjenjivim pločicama promjera 32 mm buši u puni materijal bez prethodnog zabušivanja. Na tokarilici svrdlo miruje u revolveru, a obradak se vrti; svrdlo se dovodi na os (X0) i giba po Z. Rashladno sredstvo dovodi se kroz svrdlo, pa ispire strugotinu iz provrta.', null, 'revolver'],
  [20, 3, 'T3 vanjski nož za fino tokarenje 35°', 'T3 External finishing tool 35°', ['T3'],
    'Vanjski nož s rombnom pločicom kuta 35° za završnu obradu i kopirno tokarenje. Uski vrh može ući u udubljenja i oblikovati složene konture, ali je osjetljiviji, pa se njime skida mala dubina. Polumjer vrha je 0,4 mm. Na stranici Postavljanje stroja upisuješ nove korekcije upravo za ovaj alat.', null, 'revolver'],
  [21, 3, 'T4 unutarnji nož za grubo tokarenje 80°', 'T4 Internal roughing tool 80°', ['T4'],
    'Unutarnji nož (nož za proširivanje) na dugom okruglom držaču služi za grubu obradu provrta. Može raditi tek kad u obratku već postoji provrt, npr. izbušen svrdlom T2. Što je držač dulji i tanji, to je skloniji vibracijama, pa se uzima najkraći koji dosegne potrebnu dubinu.', null, 'revolver'],
  [22, 3, 'T5 vanjski nož za usijecanje 1,8 mm', 'T5 External cut-off tool 1.8mm', ['T5'],
    'Nož za usijecanje i odrezivanje ima usku oštricu širine 1,8 mm. Njime se izrađuju utori i odrezuje gotov obradak od šipke. Oštrica je vitka, pa se radi malim posmakom i s obilnim hlađenjem. U programu VMDEMO ovaj alat izrađuje utor ciklusom CYCLE93 u više uboda, jer je utor širi od oštrice.', null, 'revolver'],
  [23, 3, 'T6 unutarnji nož za fino tokarenje 35°', 'T6 Internal finishing tool 35°', ['T6'],
    'Unutarnji nož s pločicom kuta 35° za završnu obradu provrta i unutarnjih kontura. Kao i T4, radi u već postojećem provrtu. Pri izlasku iz provrta alat se najprije odmakne od stijenke prema osi, pa tek onda izvlači, da ne ogrebe obrađenu površinu.', null, 'revolver'],
  [24, 3, 'T7 vanjski nož za navoj', 'T7 External thread-cutting tool', ['T7'],
    'Nož za navoj ima pločicu s profilom navoja (za metrički navoj 60°). Navoj se reže u više prolaza po istoj zavojnici, pa upravljanje mora točno uskladiti posmak s vrtnjom vretena: u jednom okretaju alat se pomakne za uspon navoja. Za to služi kutni davač na glavnom vretenu.', null, 'revolver'],
  [25, 3, 'T8 glodalo za utore Ø10', 'T8 Slot milling tool 10mm', ['T8'],
    'Glodalo promjera 10 mm u pogonjenom držaču vrti se vlastitim motorom u revolveru, a obradak tada miruje ili se zakreće kao os C. Tako se na tokarilici mogu glodati utori, plohe i bušiti provrti izvan osi bez prebacivanja obratka na glodalicu. U našem modelu duljina ovog alata je pretpostavka.', null, 'revolver'],
  [26, 1, 'Glava glavnog vretena', 'Spindle head', ['glava', 'motor', 'cilindar', 'davac', 'steznaGlava', 'celjusti', 'obradak'],
    'Glava nosi glavno vreteno u preciznim ležajevima. Na prednjem kraju vretena je stezna glava s obratkom, a na stražnjem šuplji stezni cilindar i remenica pogona. Glavni motor pokreće vreteno remenom, a kutni davač javlja upravljanju kut i brzinu vrtnje. Vreteno je šuplje, pa se dugačka šipka može provući kroz njega. Gumbom „Vrti vreteno” pogledaj što se vrti.', null, 'glava'],
  [27, 2, 'Glavni pogonski motor', 'Main drive motor', ['motor'],
    'Glavni motor daje snagu za rezanje i brzinu vrtnje vretena; u modelu je iza glave i pokreće vreteno remenom. U programu brzinu vrtnje zadaje adresa S, smjer M3 (desno) ili M4 (lijevo), a M5 zaustavlja vreteno. Uz G96 upravljanje stalno mijenja brzinu vrtnje tako da brzina rezanja ostane ista, a LIMS ograničava najveću brzinu vrtnje.', null, 'glavaStraga'],
  [28, 2, 'Šuplji stezni cilindar', 'Open centre clamping cylinder', ['cilindar'],
    'Hidraulički stezni cilindar na stražnjem kraju vretena vrti se s vretenom. Klip vuče ili gura vučnu cijev, a ona preko klinova u steznoj glavi zatvara ili otvara čeljusti. Cilindar je šupalj (otvoreno središte), pa kroz njega prolazi šipka. Osjetnici na klipnjači nadziru stezni put. Klikni „Kako radi”.', 'stezniPut', 'glavaStraga'],
  [29, 2, 'Kutni davač', 'Angle encoder', ['davac'],
    'Kutni davač spojen je s glavnim vretenom zupčastim remenom bez proklizavanja i javlja upravljanju kutni položaj i brzinu vrtnje vretena. Bez njega ne bi bilo moguće rezanje navoja (posmak vezan uz kut vretena), stalna brzina rezanja G96 ni zaustavljanje vretena u točnom kutnom položaju.', null, 'glavaStraga'],
  [30, 2, 'Stezna glava', 'Chuck', ['steznaGlava', 'celjusti', 'obradak'],
    'Stezna glava s tri čeljusti pričvršćena je na prirubnicu glavnog vretena i drži obradak. Čeljusti se gibaju istodobno i obradak sami centriraju. Pokreće ih stezni cilindar preko vučne cijevi, a uključuju se nožnom sklopkom. Sila stezanja mora biti dovoljna da obradak ne proklizne, ali ne smije deformirati tankostijeni obradak. Klikni „Kako radi”.', 'tlakStezanja', 'steznaGlava'],
  [31, 3, 'Stezne čeljusti', 'Clamping jaws', ['celjusti'],
    'Čeljusti dodiruju obradak i prenose silu stezanja. Tvrde čeljusti imaju nazubljenu površinu i drže sirovi materijal, a meke čeljusti tokare se na mjeru obratka i ne oštećuju već obrađenu površinu. Za tankostijene dijelove koriste se njihajuće čeljusti ili stezne čahure. Čeljusti moraju biti pritegnute na istom promjeru, inače obradak ne bude centriran.', null, 'steznaGlava'],
  [32, 3, 'Obradak', 'Workpiece', ['obradak'],
    'Obradak je pripremak koji se obrađuje — ovdje šipka Ø80 mm stegnuta u čeljustima. Iz čeljusti viri toliko koliko treba za obradu, ali ne više: predugačak prepust savija se i vibrira. Grubo pravilo: prepust bez konjića do oko tri promjera. Na stranici Postavljanje stroja na ovom pripremku izvodiš program VMDEMO.', null, 'steznaGlava'],
  [33, 2, 'Nultočka stroja', 'Machine zero point', ['nulaM'],
    'Nultočka stroja M je ishodište koordinatnog sustava stroja (MKS); određuje je proizvođač i korisnik je ne mijenja. Na tokarilici leži na osi vretena, najčešće na čelu prirubnice glavnog vretena — tako je i u našem modelu (ispod stezne glave). Upravljanje je „pronalazi” referenciranjem osi nakon uključivanja. Klikni „Kako radi”.', 'g54mksT', 'steznaGlava'],
  [34, 2, 'Nultočka obratka', 'Workpiece zero point', ['nulaW'],
    'Nultočka obratka W je ishodište koordinatnog sustava obratka (WKS) od kojega se programiraju mjere. Na tokarilici je uvijek na osi vretena, a uzduž osi je bira programer — obično na završnom čelu obratka, pa sve točke na obratku imaju negativan Z. Njezin položaj prema nultočki stroja upisuje se kao pomak nultočke G54; na stranici Postavljanje stroja određuješ ga zarezivanjem čela. Klikni „Kako radi”.', 'g54wksT', 'steznaGlava'],
  [35, 1, 'Konjić', 'Tailstock', ['konjic', 'siljak'],
    'Konjić stoji nasuprot glavi vretena i podupire dugačke obratke šiljkom u središnjem gnijezdu na čelu obratka. Tako se obradak manje savija pod silom rezanja. Konjić se namješta uzduž postelje po svojim vodilicama, a pinola sa šiljkom izvlači se hidraulički, nožnom sklopkom za šiljak. Kratki obradak, kao na simulatoru, radi se bez konjića.', null, 'konjic'],
  [36, 2, 'Šiljak', 'Centre point', ['siljak'],
    'Šiljak je stožac od 60° u pinoli konjića koji ulazi u središnje gnijezdo obratka. Rotirajući šiljak ima ležajeve i vrti se zajedno s obratkom, pa se ne grije od trenja. Sila pritiska šiljka mora biti primjerena: premala ne podupire, a prevelika savija tanak obradak.', null, 'konjic'],
  [37, 1, 'Električni ormar', 'Switch cabinet', ['ormar', 'ormarVrata', 'plc', 'napojni', 'ncu', 'podmazivanje', 'hidraulika'],
    'Električni ormar stoji iza stroja. U gornjem dijelu su napojni modul, upravljanje s pogonskim modulom (NCU), PLC, sklopnici i zaštitne sklopke, a u donjem hidraulički agregat i centralno podmazivanje. Ormar je zatvoren, jer elektronika ne podnosi prašinu, vlagu ni maglu rashladnog sredstva. U modelu se vrata otvore kad odabereš ovu stavku ili neki njezin dio. Rad u ormaru pod naponom smije obavljati samo ovlašteni električar.', null, 'ormar'],
  [38, 2, 'PLC', 'PLC', ['plc'],
    'PLC upravlja logičkim funkcijama stroja: vratima, revolverom, stezanjem, rashladnim sredstvom, podmazivanjem, transporterom strugotine i statusnom svjetiljkom. Stroj se smije pokrenuti tek kad su ispunjeni svi uvjeti — vrata zatvorena, gljiva otpuštena, osi nisu na graničnim sklopkama, obradak stegnut unutar steznog puta. Sigurnosne sklopke na vratima nikad se ne premošćuju. Klikni „Kako radi”.', 'plc', 'ormarBlizu'],
  [39, 2, 'Napojni modul', 'Supply module', ['napojni'],
    'Napojni modul pretvara izmjenični mrežni napon u istosmjerni napon međukruga iz kojega se napajaju pogonski moduli osi i glavnog vretena. Kad motori koče, energija se vraća u međukrug, a modul je vraća u mrežu ili pretvara u toplinu. Za elektroniku upravljanja napon se još transformira, ispravlja, filtrira i održava stalnim. Klikni „Kako radi” i prati napone na mjernim točkama.', 'napajanje', 'ormarBlizu'],
  [40, 2, 'Upravljanje s pogonskim modulom', 'Control with drive module', ['ncu'],
    'NCU (numerička upravljačka jedinica) je računalo stroja: čita NC program blok po blok, računa putanju alata i šalje zadane vrijednosti pogonskim modulima osi X i Z i glavnog vretena. Mjerni sustavi vraćaju stvarni položaj i brzinu, a razlika između zadane i stvarne vrijednosti stalno se ispravlja — to je regulacijski krug. Klikni „Kako radi” i pokreni CYCLE START.', 'regulacija', 'ormarBlizu'],
  [41, 2, 'Centralno podmazivanje', 'Central lubrication', ['podmazivanje'],
    'Centralno podmazivanje u zadanim razmacima potiskuje malu količinu ulja kroz cjevčice do vodilica, kolica i matice kugličnog vretena. Bez ulja klizanje postaje trzajuće, točnost pada, a staze se oštete. Razina ulja vidi se kroz prozirnu stijenku spremnika; kad padne ispod oznake, upravljanje javi poruku i nakon nekog vremena zaustavi stroj.', null, 'ormarDolje'],
  [42, 2, 'Hidraulički agregat', 'Hydraulic unit', ['hidraulika'],
    'Hidraulički agregat daje ulje pod tlakom za stezni cilindar stezne glave, pinolu konjića i blokiranje revolvera. Čine ga spremnik ulja, elektromotor s crpkom, ventili i manometar. Tlak stezanja podešava se na pokrovu steznog cilindra, a razina i temperatura ulja provjeravaju se pri dnevnom pregledu stroja.', null, 'ormarDolje'],
  [43, 1, 'Ostali sklopovi', 'Components', ['kabina', 'sklopka', 'pokrovCil', 'posudaStr', 'transporter', 'ship', 'crpka', 'razina', 'noznaGlava', 'noznaSiljak', 'lampa'],
    'U ovoj skupini su sklopovi koji ne sudjeluju izravno u rezanju, ali bez njih stroj ne može raditi sigurno i dugo: kabina, glavna sklopka, pokrov steznog cilindra s podešavanjem tlaka i steznog puta, transporter strugotine s posudom rashladnog sredstva, nožne sklopke i statusna svjetiljka. Odaberi stavku u podizborniku i pogledaj gdje je koji dio.', null, 'stroj'],
  [44, 2, 'Kabina', 'Cabin', ['kabina', 'vrata'],
    'Kabina potpuno zatvara radni prostor i štiti korisnika od strugotine, rashladnog sredstva i dijelova koji bi se mogli odbaciti — pri velikoj brzini vrtnje loše stegnut obradak ili čeljust izlijeću velikom energijom. Prozor je od sigurnosnog stakla ili polikarbonata. Kroz klizna vrata pristupa se steznoj glavi i revolveru; dok su otvorena, program se ne može pokrenuti.', null, 'stroj'],
  [45, 2, 'Glavna sklopka', 'Main switch', ['sklopka'],
    'Glavnom sklopkom stroj se spaja na mrežu ili potpuno odvaja od nje. U našem modelu je na vratima električnog ormara, iza stroja. Kad je isključena, zaključava se lokotom, da nitko ne uključi stroj tijekom održavanja. Na stranici Postavljanje stroja njome počinje niz „Uključivanje”.', null, 'sklopka'],
  [46, 2, 'Pokrov steznog cilindra', 'Clamping cylinder cover', ['pokrovCil', 'tlakPokaz', 'tlakPodes', 'putPodes'],
    'Pokrov na lijevom kraju glave zatvara stezni cilindar koji se vrti s vretenom. Na njemu su pokazivač tlaka stezanja i regulator tlaka, a ispod prozorčića osjetnici steznog puta. Pokrov se ne skida dok se vreteno vrti; sve postavke rade se pri mirovanju vretena.', null, 'pokrov'],
  [47, 3, 'Pokazivač tlaka stezanja', 'Clamping pressure display', ['tlakPokaz'],
    'Pokazivač prikazuje tlak u steznom cilindru, a time i silu kojom čeljusti drže obradak. Prije pokretanja programa provjeri odgovara li tlak obratku: puni čelični obradak steže se većim tlakom, a tankostijeni dijelovi manjim, uz prikladno stezno sredstvo.', null, 'pokrov'],
  [48, 3, 'Podešavanje tlaka stezanja', 'Clamping pressure setting', ['tlakPodes'],
    'Regulatorom tlaka (okretni gumb s manometrom) namješta se tlak stezanja. Tlačna sklopka nadzire da tlak ne padne ispod najmanje dopuštene vrijednosti — tada vreteno ne smije krenuti, a ako se vrti, stroj se zaustavlja. Klikni „Kako radi”.', 'tlakStezanja', 'pokrov'],
  [49, 3, 'Podešavanje steznog puta', 'Clamping path setting', ['putPodes'],
    'Dva osjetnika na letvi uz klipnjaču steznog cilindra omeđuju stezni put: obradak je ispravno stegnut samo ako klip stane između njih. Kad se mijenja promjer obratka ili čeljusti, osjetnici se pomaknu na novi stezni put. Klikni „Kako radi”.', 'stezniPut', 'pokrov'],
  [50, 2, 'Posuda za strugotinu', 'Chip basin', ['posudaStr', 'ship', 'crpka', 'razina', 'transporter'],
    'Strugotina iz radnog prostora pada u korito transportera, koji je izvlači na desnu stranu stroja i istresa u posudu na kotačima. Ispod transportera je posuda rashladnog sredstva s crpkom: sredstvo se cijedi kroz transporter i sito natrag u posudu. Posudu za strugotinu prazni redovito — strugotina je oštra i može biti vruća.', null, 'transporter'],
  [51, 3, 'Posuda rashladnog sredstva', 'Coolant lubricant basin', ['ship'],
    'U posudi je sredstvo za hlađenje, ispiranje i podmazivanje (SHIP), najčešće emulzija ulja u vodi. Koncentraciju emulzije treba redovito mjeriti, a posudu čistiti, jer se u njoj razvijaju bakterije. Ulje s vodilica ne smije dospjeti u emulziju, inače ona brže propada.', null, 'transporter'],
  [52, 3, 'Crpka rashladnog sredstva', 'Coolant lubricant pump', ['crpka'],
    'Crpka na posudi potiskuje rashladno sredstvo do mlaznica u radnom prostoru i kroz revolver do alata. Uključuje se u programu naredbom M8, a isključuje s M9. Bez dovoljno sredstva alat se pregrijava, a strugotina se lijepi za oštricu.', null, 'transporter'],
  [53, 3, 'Pokazivač razine', 'Filling level display', ['razina'],
    'Pokazivač razine na posudi pokazuje koliko je rashladnog sredstva u njoj. Razina pada zbog isparavanja i zbog sredstva koje odnese strugotina. Kad je preniska, crpka usisava zrak i dobava prestaje; nadolij sredstvo pripremljeno u ispravnoj koncentraciji.', null, 'transporter'],
  [54, 3, 'Transporter strugotine', 'Chip conveyor', ['transporter'],
    'Transporter je pokretna traka ili lanac s grabljama u koritu ispod radnog prostora. Strugotina pada niz kosu postelju u korito, a transporter je diže i istresa u posudu iza stroja. Uključuje se ručno ili programom; ne gura se ruka u korito dok transporter radi.', null, 'transporter'],
  [55, 2, 'Nožna sklopka za steznu glavu', 'Foot switch for chuck', ['noznaGlava'],
    'Nožnom sklopkom otvaraju se i zatvaraju čeljusti stezne glave, pa korisnik obje ruke ima slobodne za umetanje obratka. Radi samo dok vreteno miruje i dok su vrata otvorena. Zaštitni luk sprječava slučajno pritiskanje.', null, 'nozne'],
  [56, 2, 'Nožna sklopka za šiljak', 'Foot switch for centre point', ['noznaSiljak'],
    'Druga nožna sklopka izvlači i uvlači pinolu konjića sa šiljkom. Tako korisnik jednom rukom pridrži dugački obradak, a nogom ga šiljkom pritisne u steznu glavu. Kao i kod stezne glave, sklopka radi samo pri mirovanju vretena.', null, 'nozne'],
  [57, 2, 'Statusna svjetiljka', 'Status light', ['lampa'],
    'Statusna svjetiljka na krovu kabine izdaleka pokazuje stanje stroja. U našem modelu znači: siva — stroj isključen, žuta — uključen i čeka, zelena — program se izvodi, crvena — alarm ili sudar. Boje određuje proizvođač u PLC-u, pa se na drugim strojevima mogu razlikovati. Dok je stavka odabrana, svjetiljka redom pokazuje sva stanja.', null, 'lampa']
].map(([n, razina, naziv, engl, ids, tekst, tema, pogled]) => ({ n, razina, naziv, engl, ids, tekst, tema, pogled }));

/* dijelovi koji nemaju svoju stavku izbornika (prelazak mišem i klik u 3D) */
const DODATNI = {
  snop: ['Kabelski snop', 'Cable harness', 37, 'Kabelski snop vodi kabele za napajanje motora, davače, ventile i sklopke iz električnog ormara u stroj. Kabeli prema pokretnim saonicama vode se u lančanim vodilicama, da se pri gibanju ne savijaju preoštro i ne taru. Signalni kabeli mjernih sustava odvojeni su od energetskih i oklopljeni, jer bi smetnje kvarile mjerenje.'],
  vrata: ['Vrata stroja', 'Machine door', 44, 'Klizna vrata zatvaraju prednju stranu kabine. Sigurnosna sklopka javlja PLC-u jesu li zatvorena: dok su otvorena, program se ne može pokrenuti, a vreteno i osi rade samo u posebnom načinu rada sa smanjenom brzinom. Kroz prozor pratiš obradu; oštećen prozor odmah se mijenja.'],
  ormarVrata: ['Vrata električnog ormara', 'Switch cabinet doors', 37, 'Dvoja vrata zatvaraju električni ormar sa stražnje strane stroja. Na desnim vratima je glavna sklopka i znak upozorenja na opasan napon. Vrata otvara samo ovlašteni električar; kod mnogih ormara otvaranje je moguće tek kad je glavna sklopka isključena.']
};
/* stavke izbornika prema id-u dijela */
/* dio vodi na najužu stavku kojoj je prvi u popisu (npr. „kabina” na „Kabina”, a ne na „Ostali sklopovi”) */
const PO_DIJELU = {}; MENI.forEach((m) => { const id = m.ids[0]; if (!id) return; const st = PO_DIJELU[id] && MENI.find((x) => x.n === PO_DIJELU[id]); if (!st || m.ids.length < st.ids.length) PO_DIJELU[id] = m.n; });
const ORMAR = new Set(['ormar', 'ormarVrata', 'napojni', 'ncu', 'plc', 'podmazivanje', 'hidraulika']);

/* ================================================================== */
/* 2. Upravljačka ploča — opisi (prelazak mišem / dodir)               */
/* ================================================================== */
const OPIS = {
  ploca840: ['Upravljačka ploča 840D', 'Gornji dio ormarića: zaslon sa softkeyevima i puna tipkovnica za unos programa i podataka.'],
  zaslon: ['Zaslon', 'Prikazuje stanje upravljanja: gore područje rada, kanal, način rada i program, ispod stanje i poruke, a u sredini radni prozor. Uz rub su natpisi softkeyeva.'],
  podrucje: ['PODRUČJE RADA', 'Pokazuje otvoreno područje upravljanja: Machine (stroj), Parameter (parametri), Program, Services (usluge), Diagnosis (dijagnostika) ili Commissioning (puštanje u rad).'],
  kanal: ['KANAL', 'Naziv aktivnog kanala. Složenija upravljanja imaju više kanala koji istodobno izvode različite programe; naš stroj ima jedan.'],
  nacin: ['NAČIN RADA', 'Aktivni način rada: JOG (ručno gibanje), MDA (unos i izvođenje pojedinačnih blokova) ili AUTO (izvođenje programa).'],
  program: ['IME PROGRAMA', 'Program koji je odabran za izvođenje, s mapom u kojoj se nalazi.'],
  stKanala: ['STANJE KANALA', 'Channel reset — osnovno stanje; Channel interrupted — izvođenje prekinuto; Channel active — kanal radi.'],
  stPrograma: ['STANJE PROGRAMA', 'Program aborted — prekinut; Program running — izvodi se; Program stopped — zaustavljen (npr. tipkom CYCLE STOP).'],
  porKanala: ['PORUKE KANALA', 'Poruke o radu aktivnog kanala, npr. da upravljanje čeka dopuštenje posmaka ili potvrdu.'],
  utjecaj: ['UTJECAJ NA PROGRAM', 'Uključeni utjecaji na izvođenje programa, npr. SBL (blok po blok), DRY (probni posmak) ili ROV (korekcija djeluje i na brzi hod).'],
  poruke: ['PORUKE (alarmi)', 'Broj i tekst alarma ili poruke, npr. da je aktivno nužno zaustavljanje. Alarmi se brišu tipkom RESET ili ALARM CANCEL, ovisno o vrsti.'],
  prozor: ['RADNI PROZOR', 'Sadržaj ovisi o području rada: prikaz položaja osi i vretena, unos parametara i korekcija, editor programa i drugo.'],
  recallSim: ['Simbol RECALL (^)', 'Kad je prikazan, nalaziš se u nižoj razini izbornika; tipkom RECALL vraćaš se razinu više.'],
  etcSim: ['Simbol ETC (>)', 'Kad je prikazan, u ovoj razini ima još funkcija; tipkom ETC prikazuju se ostali softkeyevi.'],
  vsk: ['Okomiti softkeyevi', 'Tipke uz desni rub zaslona. Funkcija svake ispisana je na zaslonu uz nju i mijenja se ovisno o području i stanju.'],
  hsk: ['Vodoravni softkeyevi', 'Tipke ispod zaslona. Kao i okomite, mijenjaju funkciju s područjem i razinom izbornika; natpis je u dnu zaslona.'],
  recall: ['RECALL', 'Povratak u višu razinu izbornika.'],
  machine: ['MACHINE', 'Izravan prijelaz u područje rada Machine.'],
  area: ['AREA SWITCH', 'Otvara osnovni izbornik s područjima rada.'],
  etc: ['ETC', 'Proširuje traku softkeyeva — prikazuje ostale funkcije u istoj razini.'],
  progman: ['PROGRAM MANAGER', 'Izravan prijelaz u pregled programa.'],
  program: ['PROGRAM', 'Izravan prijelaz u otvoreni program; ako nijedan nije otvoren, u pregled programa.'],
  offset: ['OFFSET', 'Izravan prijelaz u područje Parameter (korekcije alata, pomaci nultočke).'],
  custom: ['CUSTOM', 'Izravan prijelaz u aplikaciju koju je posebno podesio proizvođač ili korisnik.'],
  alarmc: ['ALARM CANCEL', 'Briše alarme koji su označeni simbolom za brisanje tom tipkom.'],
  channel: ['CHANNEL', 'Odabir aktivnog kanala kod upravljanja s više kanala.'],
  slova: ['Slovne tipke', 'Unos teksta i NC naredbi (adrese G, X, Y, Z, F, S, T, M …).'],
  brojke: ['Brojčani blok', 'Unos brojeva, predznaka i decimalne točke.'],
  shift: ['SHIFT', 'Uključuje drugu oznaku tipaka s dvostrukom namjenom.'],
  ctrl: ['CTRL', 'Kontrolna tipka, u kombinaciji s drugim tipkama.'],
  alt: ['ALT', 'Tipka Alt, u kombinaciji s drugim tipkama.'],
  tab: ['TAB', 'Tabulator — skok na sljedeće polje.'],
  help: ['HELP', 'Prikazuje pomoć za trenutačni prozor ili alarm.'],
  next: ['NEXT WINDOW', 'Premješta fokus na sljedeći prozor na zaslonu.'],
  insert: ['INSERT', 'Tipka za uređivanje: otvara polje za izmjenu ili poništava započeti unos.'],
  pgup: ['PAGE UP', 'Listanje unatrag (stranica gore).'],
  pgdn: ['PAGE DOWN', 'Listanje unaprijed (stranica dolje).'],
  end: ['END', 'Skok na kraj retka.'],
  select: ['SELECT / TOGGLE', 'Odabir između više ponuđenih mogućnosti u polju.'],
  kursor: ['Tipke kursora', 'Pomicanje kursora gore, dolje, lijevo i desno.'],
  bs: ['BACKSPACE', 'Briše znak lijevo od kursora.'],
  del: ['DEL', 'Briše znak ispod kursora.'],
  input: ['INPUT', 'Preuzima unos u polje i završava redak programa.'],
  mcp: ['Strojna upravljačka ploča', 'Donji dio ormarića: načini rada, koraci, odabir osi i smjera, pokretanje i zaustavljanje programa, vretena i posmaka, korekcije i nužno zaustavljanje.'],
  jog: ['JOG', 'Ručni način rada: osi se gibaju tipkama smjera.'],
  repos: ['REPOS', 'U načinu JOG vraća alat na mjesto na kojemu je obrada prekinuta.'],
  ref: ['REF POINT', 'U načinu JOG dovodi osi u referentnu točku (referenciranje).'],
  teach: ['TEACH IN', 'U načinu MDA program se sastavlja tako da se osi dovedu u položaj, a položaj se preuzme u blok.'],
  mda: ['MDA', 'Unos i izravno izvođenje pojedinačnih blokova, npr. G97 S1000 M4.'],
  auto: ['AUTO', 'Izvođenje programa.'],
  inc: ['INC (1 … 10000, VAR)', 'Korak za gibanje osi u JOG-u: 1, 10, 100, 1000 ili 10 000 µm po pritisku tipke smjera; VAR je slobodno zadan korak.'],
  korisnicke: ['Korisničke tipke', 'Tipke kojima proizvođač stroja dodjeljuje funkcije, npr. uključivanje rashladnog sredstva, transportera strugotine ili otključavanje vrata.'],
  osX: ['Odabir osi X', 'U načinu JOG odabire os X (poprečne saonice, promjer) za ručno gibanje.'],
  osZ: ['Odabir osi Z', 'U načinu JOG odabire os Z (uzdužne saonice) za ručno gibanje.'],
  revT: ['−T / +T (revolver)', 'Korisničke tipke kojima je proizvođač dodijelio zakretanje revolvera: u načinu JOG svaki pritisak zakrene ploču za jedno mjesto unatrag ili naprijed. Prije zakretanja revolver mora biti dovoljno daleko od obratka i stezne glave.'],
  smjer: ['Tipke smjera + i −', 'Dok ih držiš, odabrana os giba se u smjeru + ili −; s odabranim korakom (INC) jedan pritisak daje jedan korak.'],
  rapid: ['RAPID', 'Držana uz tipku smjera, ručno gibanje ide brzim hodom.'],
  reset: ['RESET', 'Prekida obradu, briše poruke i vraća upravljanje u osnovno stanje.'],
  sbl: ['SINGLE BLOCK', 'Izvođenje programa blok po blok: nakon svakog bloka treba ponovno pritisnuti CYCLE START.'],
  cstop: ['CYCLE STOP', 'Zaustavlja izvođenje programa; nastavlja se tipkom CYCLE START.'],
  cstart: ['CYCLE START', 'Pokreće izvođenje programa ili upisanog bloka (MDA).'],
  sstop: ['SPINDLE STOP', 'Isključuje dopuštenje vrtnje vretena — vreteno se zaustavlja.'],
  sstart: ['SPINDLE START', 'Uključuje dopuštenje vrtnje vretena.'],
  fstop: ['FEED STOP', 'Isključuje dopuštenje posmaka — osi se zaustavljaju.'],
  fstart: ['FEED START', 'Uključuje dopuštenje posmaka.'],
  gljiva: ['EMERGENCY STOP (gljiva)', 'U opasnosti što brže zaustavlja sve pogone. Otpušta se zakretanjem, a zatim se upravljanje vraća u rad tipkom RESET.'],
  pogoni: ['( I ) uključivanje pogona', 'Uključuje pogone vretena i osi posmaka.'],
  sover: ['Korekcija brzine vrtnje', 'Lijevi okretni gumb: mijenja programiranu brzinu vrtnje vretena u postocima.'],
  fover: ['Korekcija posmaka', 'Desni okretni gumb: mijenja programirani posmak u postocima; na 0 % osi stoje. Prije prvog pokretanja programa smanji ga.']
};

/* ================================================================== */
/* 3. Scena                                                           */
/* ================================================================== */
const scenaEl = $('scena');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
scenaEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 10, 20000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.09; controls.maxDistance = 9000; controls.minDistance = 120;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(900, 2200, 1500); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.55); sun2.position.set(-1600, 900, -1200); scene.add(sun2);
const sun3 = new THREE.DirectionalLight(0xffffff, 0.35); sun3.position.set(-400, 300, 2200); scene.add(sun3);
/* pod */
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(120,140,150,0.42)'); gr.addColorStop(0.7, 'rgba(120,140,150,0.18)'); gr.addColorStop(1, 'rgba(120,140,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const pod = new THREE.Mesh(new THREE.CircleGeometry(2600, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  pod.rotation.x = -Math.PI / 2; pod.position.set(100, -1152, -150); scene.add(pod);
}
const S = napraviStroj(THREE, scene);
const KORIJENI = [S.stroj, S.uzduzne, S.vrtnja, S.nulaW, S.nulaM];

/* svi meshevi i njihovi dijelovi */
const SVI = [];
KORIJENI.forEach((k) => k.traverse((o) => { if (o.isMesh || o.isSprite) { o.userData.m0 = o.material; SVI.push(o); } }));
function dioOd(o) { let p = o; while (p) { if (p.userData && p.userData.dio) return p.userData.dio; p = p.parent; } return null; }
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
function meshevi(ids) { const s = new Set(); ids.forEach((id) => { const d = S.dijelovi.get(id); if (d) d.objekti.forEach((ob) => ob.traverse((o) => { if (o.isMesh || o.isSprite) s.add(o); })); }); return s; }
const kabinaSet = meshevi(['kabina', 'vrata']);
const naziv = (id) => (DODATNI[id] ? DODATNI[id][0] : (S.dijelovi.get(id) || {}).naziv || id);

/* materijali za isticanje i poluprozirnost (po izvornom materijalu) */
const hiMat = new Map(), duhMat = new Map(), pomMat = new Map();
function izvedeni(map, m0, fn) { let m = map.get(m0.uuid); if (!m) { m = m0.clone(); fn(m); map.set(m0.uuid, m); } return m; }
const HI = (m0) => izvedeni(hiMat, m0, (m) => { if (m.emissive) { m.emissive = new THREE.Color(0x2ecad4); m.emissiveIntensity = 0.2; } if (m.transparent) m.opacity = Math.min(1, (m.opacity || 1) + 0.2); });
const DUH = (m0) => izvedeni(duhMat, m0, (m) => { m.transparent = true; m.opacity = Math.min(m.opacity, 0.07); m.depthWrite = false; if (m.emissive) m.emissive.setHex(0); });
const POM = (m0) => izvedeni(pomMat, m0, (m) => { if (m.emissive) { m.emissive = new THREE.Color(0xf2a51a); m.emissiveIntensity = 0.38; } });
const rubMat = new THREE.LineBasicMaterial({ color: 0x17a8b4, transparent: true, opacity: 0.85 });
const rubovi = [];

/* ================================================================== */
/* 4. Stanje stranice                                                  */
/* ================================================================== */
const st = { akt: 1, dio: null, otvoreni: new Set(), sel: new Set(), prikaz: 'sve', prozirno: true, kabina: true, os: null, pom: new Set(), tema: null, lampaT: 0 };
let vidjeni = new Set();
try { JSON.parse(localStorage.getItem('ftq-cnc-tok-840d-upoznavanje') || '[]').forEach((x) => vidjeni.add(+x)); } catch (e) { /* bez spremanja */ }
function spremi() { try { localStorage.setItem('ftq-cnc-tok-840d-upoznavanje', JSON.stringify([...vidjeni])); } catch (e) { /* bez spremanja */ } }

function osvjeziIzgled() {
  crtati = true;
  rubovi.splice(0).forEach((l) => { l.parent && l.parent.remove(l); l.geometry.dispose(); });
  const ima = st.sel.size > 0;
  SVI.forEach((o) => {
    const m0 = o.userData.m0, u = st.sel.has(o), kab = kabinaSet.has(o);
    let vid = true, m = m0;
    if (kab && !st.kabina && !u) vid = false;
    if (u) { if (!o.userData.vlastitiMat && !o.isSprite) m = HI(m0); }
    else if (st.pom.has(o)) m = o.isSprite || o.userData.vlastitiMat ? m0 : POM(m0);
    else if (ima) { if (st.prikaz === 'odabrano') vid = false; else if (st.prozirno && !o.isSprite && !o.userData.vlastitiMat) m = DUH(m0); }
    o.visible = vid; o.material = m;
    if (u && o.isMesh && o.geometry && !(m0.transparent && m0.opacity < 0.4)) {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 32), rubMat); l.raycast = () => {}; o.add(l); rubovi.push(l);
    }
  });
}

/* ================================================================== */
/* 5. Kamera: pogledi i let do dijela                                  */
/* ================================================================== */
const POGLEDI = {
  stroj: [[-2300, 1500, 3600], [100, 0, -100]], radni: [[-150, 450, 1500], [-150, 30, -60]], desno: [[4400, 900, 1200], [300, -100, -200]],
  lijevo: [[-4400, 900, 1200], [-300, -100, -200]], straga: [[1500, 1400, -4600], [-300, 100, -600]], odozgo: [[200, 5000, 900], [0, 0, -100]],
  postelja: [[1700, 700, 2300], [0, -300, -150]], krajDesno: [[2600, 400, 900], [400, -150, -200]], saonice: [[1100, 800, 1600], [200, -50, -250]],
  konjic: [[1500, 500, 1500], [700, -100, -100]], revolver: [[500, 600, 1300], [50, 60, -200]], glava: [[-500, 800, 1800], [-650, 50, -150]],
  glavaStraga: [[-2400, 700, 1300], [-950, 40, -50]], steznaGlava: [[100, 300, 800], [-220, 20, 0]], ormar: [[-500, 900, -3900], [-775, 0, -1000]],
  ormarBlizu: [[-600, 800, -2900], [-850, 550, -950]], ormarDolje: [[-500, -200, -3000], [-800, -950, -1000]], pokrov: [[-1700, 500, 1600], [-1080, 60, 50]],
  transporter: [[2900, 700, 2600], [1500, -500, 380]], nozne: [[-200, -400, 2500], [-450, -1100, 1060]], lampa: [[2000, 1800, 2400], [950, 1100, 600]],
  ploca: [[2000, 700, 2500], [1400, 380, 880]], sklopka: [[-200, 700, -3000], [-560, 250, -1230]]
};
let let_ = null;
function pogled(ime, glatko = true) {
  const p = POGLEDI[ime] || POGLEDI.stroj;
  leti(new THREE.Vector3(...p[0]), new THREE.Vector3(...p[1]), glatko);
}
function leti(poz, cilj, glatko = true) {
  if (!glatko) { let_ = null; camera.position.copy(poz); controls.target.copy(cilj); controls.update(); trazi(); return; }
  let_ = { t0: performance.now(), d: 900, p0: camera.position.clone(), c0: controls.target.clone(), p1: poz, c1: cilj };
}
function letiDoDijela(ids, ime) {
  const b = new THREE.Box3(); let ok = false;
  ids.forEach((id) => { const d = S.dijelovi.get(id); if (d) d.objekti.forEach((o) => { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); if (!bb.isEmpty()) { b.union(bb); ok = true; } }); });
  if (!ok || !POGLEDI[ime]) { pogled(ime || 'stroj'); return; }
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(60, b.getSize(new THREE.Vector3()).length() / 2);
  const p = POGLEDI[ime], smjer = new THREE.Vector3(...p[0]).sub(new THREE.Vector3(...p[1])).normalize();
  const fov = camera.fov * Math.PI / 180, dist = Math.max(ime === 'ormarDolje' ? 1500 : 520, r / Math.sin(fov / 2) * (camera.aspect < 1 ? 1.5 : 1.08));
  leti(c.clone().add(smjer.multiplyScalar(dist)), c);
}

/* ================================================================== */
/* 6. Izbornik (stablo)                                               */
/* ================================================================== */
const roditelj = {}; { const stog = []; MENI.forEach((m) => { while (stog.length && stog[stog.length - 1].razina >= m.razina) stog.pop(); roditelj[m.n] = stog.length ? stog[stog.length - 1].n : null; stog.push(m); }); }
const djeca = (n) => MENI.filter((m) => roditelj[m.n] === n);
const imaDjecu = (n) => djeca(n).length > 0;
function vidljiva(m) { let r = roditelj[m.n]; while (r) { if (r !== 1 && !st.otvoreni.has(r)) return false; r = roditelj[r]; } return true; }
function crtajStablo() {
  const el = $('stablo');
  el.innerHTML = MENI.map((m) => {
    if (!vidljiva(m)) return '';
    const p = imaDjecu(m.n) && m.n !== 1, otv = st.otvoreni.has(m.n);
    return '<li class="r' + m.razina + '"><button type="button" class="um-st' + (st.akt === m.n ? ' akt' : '') + (m.n === 1 ? ' naslov' : '') + '" data-n="' + m.n + '"' + (p ? ' aria-expanded="' + otv + '"' : '') + (st.akt === m.n ? ' aria-current="true"' : '') + '>' +
      '<span class="kv" aria-hidden="true">' + (vidjeni.has(m.n) ? '✓' : '') + '</span>' + (p ? '<span class="str" aria-hidden="true">' + (otv ? '▾' : '▸') + '</span>' : '') + '<span class="t">' + esc(m.naziv) + '</span>' + (vidjeni.has(m.n) ? '<span class="vh">(pregledano)</span>' : '') + '</button></li>';
  }).join('');
  $('brojac').textContent = vidjeni.size + ' / ' + MENI.length;
}
$('stablo').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; const n = +b.dataset.n; if (st.akt === n && imaDjecu(n) && n !== 1) { if (st.otvoreni.has(n)) st.otvoreni.delete(n); else st.otvoreni.add(n); crtajStablo(); return; } odaberi(n); });

/* ================================================================== */
/* 7. Odabir stavke ili dijela                                        */
/* ================================================================== */
function otvoriPutanju(n) {
  const put = []; let r = n; while (r) { put.push(r); r = roditelj[r]; }
  [...st.otvoreni].forEach((o) => { if (!put.includes(o)) st.otvoreni.delete(o); });
  put.forEach((p) => { if (imaDjecu(p)) st.otvoreni.add(p); });
}
function odaberi(n, dioId = null, bezLeta = false) {
  const m = MENI.find((x) => x.n === n) || MENI[0];
  st.akt = m.n; st.dio = dioId; otvoriPutanju(m.n);
  vidjeni.add(m.n); spremi();
  const ids = dioId && !PO_DIJELU[dioId] ? [dioId] : (dioId ? MENI.find((x) => x.n === PO_DIJELU[dioId]).ids : m.ids);
  st.sel = meshevi(ids);
  zatvoriTemu();
  /* kartica */
  const d = dioId && DODATNI[dioId];
  $('k-naziv').textContent = d ? d[0] : m.naziv;
  $('k-engl').textContent = '(' + (d ? d[1] : m.engl) + ')';
  $('k-tekst').innerHTML = '<p>' + esc(d ? d[3] : m.tekst) + '</p>';
  const tema = d ? null : m.tema;
  $('k-tema-g').hidden = !tema; st.temaKljuc = tema;
  const dj = d ? [] : djeca(m.n);
  $('k-djeca').innerHTML = dj.length && m.n !== 1 ? '<p class="um-dj-n">Dijelovi u ovoj skupini:</p><ul class="um-dj">' + dj.map((x) => '<li><button type="button" class="cip" data-skok="' + x.n + '">' + esc(x.naziv) + '</button></li>').join('') + '</ul>' : '';
  $('k-prije').disabled = m.n === 1; $('k-dalje').disabled = m.n === MENI.length;
  $('naslov-3d').textContent = d ? d[0] : m.naziv;
  /* otvaranje vrata ormara i poklopaca */
  const sviIds = new Set(ids);
  st.ciljOtv = { ormar: [...sviIds].some((x) => ORMAR.has(x)) ? 1 : 0 };
  /* upravljačka ploča */
  const ploca = ids.includes('upravljanje');
  $('ploca-sekcija').hidden = !ploca;
  osvjeziIzgled(); crtajStablo();
  if (!bezLeta) { if (ids.length && m.n > 2) letiDoDijela(ids, m.pogled); else pogled(m.pogled || 'stroj'); }
  if (ploca && !bezLeta) setTimeout(() => { const el = $('ploca-sekcija'); if (el.getBoundingClientRect().top > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 950);
  st.lampaT = 0;
}
$('k-prije').addEventListener('click', () => { if (st.akt > 1) odaberi(st.akt - 1); });
$('k-dalje').addEventListener('click', () => { if (st.akt < MENI.length) odaberi(st.akt + 1); });
$('k-djeca').addEventListener('click', (e) => { const b = e.target.closest('[data-skok]'); if (b) odaberi(+b.dataset.skok); });
$('ploca-zatvori').addEventListener('click', () => { $('ploca-sekcija').hidden = true; });

/* „Kako radi” — 2D animacija iz modula teme2d.js (radi se zasebno) */
let tema = null;
function zatvoriTemu() { if (tema && tema.unisti) { try { tema.unisti(); } catch (e) { /* ništa */ } } tema = null; $('k-tema-el').hidden = true; $('k-tema-el').innerHTML = ''; $('k-tema').setAttribute('aria-expanded', 'false'); $('k-tema').textContent = 'Kako radi'; }
async function otvoriTemu() {
  const kljuc = st.temaKljuc; if (!kljuc) return;
  const el = $('k-tema-el'); el.hidden = false; el.innerHTML = '<p class="pom">Animacija se učitava…</p>';
  $('k-tema').setAttribute('aria-expanded', 'true'); $('k-tema').textContent = 'Zatvori animaciju';
  const T = await import('./teme2dT.js?v=01').catch(() => null);
  if (st.temaKljuc !== kljuc || el.hidden) return;
  if (!T || typeof T.prikazi !== 'function') { el.innerHTML = '<p class="pom">Animacija „Kako radi” trenutačno nije dostupna.</p>'; return; }
  el.innerHTML = '';
  const kut = document.createElement('div'); kut.className = 'um-tema-kut'; el.appendChild(kut);
  try { tema = T.prikazi(kut, kljuc) || null; } catch (e) { el.innerHTML = '<p class="pom">Animacija „Kako radi” trenutačno nije dostupna.</p>'; tema = null; }
}
$('k-tema').addEventListener('click', () => { if (tema || !$('k-tema-el').hidden) zatvoriTemu(); else otvoriTemu(); });

/* ================================================================== */
/* 8. Miš u 3D: oblačić i klik                                        */
/* ================================================================== */
const ray = new THREE.Raycaster(), mis = new THREE.Vector2();
const oblacic = $('oblacic');
function pogodak(e) {
  const r = renderer.domElement.getBoundingClientRect(); mis.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mis, camera);
  const vid = SVI.filter((o) => o.visible && o.userData.dioId && o.isMesh && (() => { let p = o.parent; while (p) { if (!p.visible) return false; p = p.parent; } return true; })());
  const h = ray.intersectObjects(vid, false); if (!h.length) return null;
  const prozirno = (o) => { const m = o.material; return m.transparent && m.opacity < 0.45; };
  const prvi = h.find((x) => !prozirno(x.object)) || h[0];
  return { id: prvi.object.userData.dioId, x: e.clientX - r.left, y: e.clientY - r.top };
}
let zadnjiHover = 0, dolje = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (dolje && Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y) > 4) { oblacic.hidden = true; return; }
  const t = performance.now(); if (t - zadnjiHover < 50) return; zadnjiHover = t;
  const p = pogodak(e);
  if (!p) { oblacic.hidden = true; renderer.domElement.style.cursor = ''; return; }
  oblacic.textContent = naziv(p.id); oblacic.hidden = false;
  const w = scenaEl.clientWidth; oblacic.style.left = Math.min(p.x + 14, w - oblacic.offsetWidth - 6) + 'px'; oblacic.style.top = Math.max(4, p.y - 34) + 'px';
  renderer.domElement.style.cursor = 'pointer';
});
renderer.domElement.addEventListener('pointerleave', () => { oblacic.hidden = true; });
renderer.domElement.addEventListener('pointerdown', (e) => { dolje = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!dolje) return; const pomak = Math.hypot(e.clientX - dolje.x, e.clientY - dolje.y); dolje = null;
  if (pomak > 5) return;
  const p = pogodak(e); if (!p) return;
  odaberiDio(p.id);
});
function odaberiDio(id) {
  if (PO_DIJELU[id]) odaberi(PO_DIJELU[id]);
  else if (DODATNI[id]) odaberi(DODATNI[id][2], id);
  else odaberi(2);
}

/* ================================================================== */
/* 9. Gumbi: pogledi, prikaz, osi                                      */
/* ================================================================== */
document.querySelectorAll('[data-pogled]').forEach((b) => b.addEventListener('click', () => pogled(b.dataset.pogled)));
function prikaz(p) { st.prikaz = p; $('p-sve').setAttribute('aria-pressed', String(p === 'sve')); $('p-odabrano').setAttribute('aria-pressed', String(p === 'odabrano')); osvjeziIzgled(); }
$('p-sve').addEventListener('click', () => prikaz('sve')); $('p-odabrano').addEventListener('click', () => prikaz('odabrano'));
$('p-prozirno').addEventListener('change', () => { st.prozirno = $('p-prozirno').checked; osvjeziIzgled(); });
$('p-kabina').addEventListener('change', () => { st.kabina = $('p-kabina').checked; osvjeziIzgled(); });

const OS_OPIS = {
  X: 'Os X: poprečne saonice s revolverom gibaju se po kosini postelje prema osi vretena i od nje. X se zadaje kao promjer: pomak saonica za 1 mm mijenja X za 2 mm. X+ znači od osi vretena (gore-natrag).',
  Z: 'Os Z: uzdužne saonice zajedno s poprečnim saonicama i revolverom gibaju se usporedno s osi vretena. Z+ znači od stezne glave prema konjiću.',
  T: 'Revolver: ploča s 12 mjesta zakreće se mjesto po mjesto; alat na mjestu najbližem osi vretena je u radnom položaju (T1 … T12). Na kraju se vraća na T1.',
  S: 'Glavno vreteno: stezna glava, čeljusti i obradak vrte se zajedno (M3 desno, M4 lijevo). Saonice i revolver se pritom ne vrte.'
};
const ANIM = { X: [140, 320], Z: [200, 460] };
const os = { X: S.stanje.X, Z: S.stanje.Z, T: 1, S: 0 };
let anim = null;
function pokreniOs(o) {
  if (o === 'T') anim = { os: o, put: [1, 12, 13], i: 0, brz: 2.4 };
  else if (o === 'S') anim = { os: o, put: [os.S, os.S + Math.PI * 12], i: 0, brz: 6 };
  else anim = { os: o, put: [os[o], ANIM[o][0], ANIM[o][1], REF[o]], i: 0, brz: 220 };
  const tok = ['revolver', 'disk', 'drzaci', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
  st.pom = meshevi(o === 'X' ? ['poprecne', 'linmotX'].concat(tok) : o === 'Z' ? ['uzduzne', 'poprecne', 'linmotX', 'vodiliceX', 'mjerniX'].concat(tok) : o === 'T' ? ['disk', 'drzaci', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'] : ['steznaGlava', 'celjusti', 'obradak']);
  ['X', 'Z', 'T', 'S'].forEach((k) => document.querySelector('[data-os="' + k + '"]').setAttribute('aria-pressed', String(k === o)));
  $('os-stop').disabled = false; $('os-opis').textContent = OS_OPIS[o];
  osvjeziIzgled();
}
function staniOs() {
  anim = null; st.pom = new Set(); $('os-stop').disabled = true;
  ['X', 'Z', 'T', 'S'].forEach((k) => document.querySelector('[data-os="' + k + '"]').setAttribute('aria-pressed', 'false'));
  osvjeziIzgled();
}
document.querySelectorAll('[data-os]').forEach((b) => b.addEventListener('click', () => pokreniOs(b.dataset.os)));
$('os-stop').addEventListener('click', staniOs);
function korakOsi(dt) {
  if (!anim) return;
  const o = anim.os, cilj = anim.put[anim.i + 1];
  const d = cilj - os[o], s = Math.sign(d) * Math.min(Math.abs(d), anim.brz * dt);
  os[o] += s;
  if (Math.abs(cilj - os[o]) < 1e-6) { anim.i++; if (anim.i >= anim.put.length - 1) { const bio = o; staniOs(); if (bio === 'T') os.T = 1; $('os-opis').textContent = OS_OPIS[bio] + (bio === 'X' || bio === 'Z' ? ' Os je vraćena u referentnu točku.' : ''); } }
  S.postaviOsi(os.X, os.Z);
  S.postaviRevolver(((os.T - 1) % 12) + 1);
  S.postaviVrtnju(os.S);
}
function prikaziOsi() { $('osi').textContent = 'MKS  X ' + os.X.toFixed(3) + '   Z ' + os.Z.toFixed(3) + '   T' + (Math.round(((os.T - 1) % 12)) + 1); }

/* ================================================================== */
/* 10. Upravljačka ploča: opisi                                       */
/* ================================================================== */
function opisPloce(e) {
  const el = e.target.closest && e.target.closest('[data-o]'); if (!el || !$('op-ploca').contains(el)) return;
  const k = el.dataset.o, o = OPIS[k]; if (!o) return;
  document.querySelectorAll('#op-ploca .opis-akt').forEach((x) => x.classList.remove('opis-akt'));
  el.classList.add('opis-akt');
  $('op-opis').innerHTML = '<h4>' + esc(o[0]) + '</h4><p>' + esc(o[1]) + '</p>';
}
['pointerover', 'focusin', 'pointerdown'].forEach((ev) => $('op-ploca').addEventListener(ev, opisPloce));

/* ================================================================== */
/* 11. Petlja                                                          */
/* ================================================================== */
function velicina() { const w = scenaEl.clientWidth, h = scenaEl.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); trazi(); }
new ResizeObserver(velicina).observe(scenaEl);
const LAMPA = [[0x666666, 0], [0xf5c518, 0xc28b00], [0x2ecc71, 0x1d9e4b], [0xff3b30, 0xb00000]];
let zadnje = performance.now(), zadnjiPrikaz = 0, crtati = true;
const ease = (t) => t * t * (3 - 2 * t);
function trazi() { crtati = true; }
controls.addEventListener('change', trazi);
function petlja(t) {
  const dt = Math.min(0.1, (t - zadnje) / 1000); zadnje = t;
  let ide = !!let_ || !!anim;
  if (let_) { const u = Math.min(1, (t - let_.t0) / let_.d), k = ease(u); camera.position.lerpVectors(let_.p0, let_.p1, k); controls.target.lerpVectors(let_.c0, let_.c1, k); if (u >= 1) let_ = null; }
  korakOsi(dt);
  if (t - zadnjiPrikaz > 100) { zadnjiPrikaz = t; prikaziOsi(); }
  const c = st.ciljOtv || {};
  ['ormar'].forEach((k) => { const sad = S.otvaranje[k], cilj = c[k] || 0; if (Math.abs(sad - cilj) > 1e-3) { S.otvori(k, sad + Math.sign(cilj - sad) * Math.min(Math.abs(cilj - sad), dt * 1.4)); ide = true; } });
  /* statusna svjetiljka: kad je odabrana, redom pokazuje stanja; inače žuta (uključen, čeka) */
  let li = 1; if (st.akt === 57) { st.lampaT += dt; li = Math.floor(st.lampaT / 1.3) % 4; } else if (anim) li = 2;
  if (li !== st.lampaI) { st.lampaI = li; S.lampa.material.color.setHex(LAMPA[li][0]); S.lampa.material.emissive.setHex(LAMPA[li][1]); ide = true; }
  if (controls.update()) ide = true;
  if (ide || crtati) { crtati = false; renderer.render(scene, camera); }
  requestAnimationFrame(petlja);
}

crtajStablo();
odaberi(1, null, true);
pogled('stroj', false);
velicina();
const uc = $('ucitavanje'); if (uc) uc.remove();
window.__upoz = { S, MENI, odaberi, odaberiDio, pokreniOs, staniOs, os, st, get anim() { return anim; }, camera, controls, pogled, otvoriTemu, POGLEDI, render: () => renderer.render(scene, camera), trazi };
requestAnimationFrame(petlja);
