/* FORTRONIQ · CNC glodanje, SINUMERIK 840D — Upoznavanje stroja (3D).
   Izbornik od 48 stavki istim redom i ugniježđenošću kao tečaj SITRAIN 840D; tekst, model i sučelje su naši.
   © ForTroniQ d.o.o. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { napraviStroj, REF, HOD } from './stroj840.js?v=02';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ================================================================== */
/* 1. Izbornik: [broj, razina, naziv, engleski naziv, dijelovi, tekst, tema, pogled]  */
/* ================================================================== */
const MENI = [
  [1, 0, 'Upoznavanje glodalice', 'Familiarisation with milling machine', [],
    'Ovo je troosna vertikalna glodalica s križnim stolom i upravljanjem SINUMERIK 840D. Obradak se giba po X i Y zajedno sa stolom, a alat po Z zajedno s glavom vretena. U izborniku odaberi sklop: model se okrene prema njemu i istakne ga, a ovdje dobiješ objašnjenje. Stavke sa strelicom otvaraju podizbornik s dijelovima tog sklopa. Kad pogledaš stavku, uz nju se pojavi kvačica.', null, 'stroj'],
  [2, 1, 'Cijeli stroj', 'Complete machine', [],
    'Stroj se sastoji od nosive konstrukcije (postolje i stup), triju posmičnih osi s kugličnim navojnim vretenima i servomotorima, glave s glavnim vretenom te spremnika alata s izmjenjivačem. Radni prostor zatvara kabina s kliznim vratima, iza stroja je električni ormar s upravljanjem, a uz kabinu su pomoćni sustavi: pneumatika, centralno podmazivanje, rashladno sredstvo i posude za strugotinu. Gumbima „Pomakni X, Y, Z” pogledaj koji sklop nosi koju os. Mišem iznad dijela dobiješ njegov naziv, a klikom ga odabireš.', null, 'stroj'],
  [3, 1, 'Upravljačka ploča', 'Control panel', ['upravljanje'],
    'Upravljačka ploča je ormarić na zakretnom nosaču s desne prednje strane kabine, pa je korisnik može okrenuti prema sebi. Gore su zaslon i softkeyevi, ispod tipkovnica za unos programa, a dolje strojna upravljačka ploča s načinima rada, tipkama osi, korekcijama i gljivom za nužno zaustavljanje. Ispod 3D prikaza otvorila se ploča: prijeđi mišem ili dodirni bilo koji njezin dio i pročitaj čemu služi. Ovdje se ništa ne upravlja — rad na upravljanju vježbaš na stranici Postavljanje stroja.', null, 'ploca'],
  [4, 1, 'Postolje stroja', 'Machine bed', ['postolje'],
    'Postolje je najteži dio stroja: lijevana ili zavarena konstrukcija koja nosi stup, križne saonice i stol te prima sile rezanja. Što je postolje kruće i masivnije, manje su vibracije i bolja je točnost obrade. Na njegovoj gornjoj plohi su vodilice osi Y, a između njih kuglično navojno vreteno koje pokreće saonice. Postolje stoji na podesivim nožicama i nivelira se prije puštanja stroja u rad.', null, 'nisko'],
  [5, 2, 'Kuglično navojno vreteno, os Y', 'Ball screw drive, Y axis', ['vretenoY'],
    'Vreteno osi Y leži na postolju između vodilica, a matica je pričvršćena za donju stranu križnih saonica. Kad servomotor zakreće vreteno, matica se s saonicama i stolom giba naprijed i natrag. Jednim okretajem saonice se pomaknu za korak navoja vretena. Vreteno je ispod pokrovnih limova — u prikazu su zato ostali dijelovi poluprozirni. Klikni „Kako radi” i pogledaj kako kuglice kruže u matici.', 'kuglicno', 'nisko'],
  [6, 2, 'Vodilice, os Y', 'Guide, Y axis', ['vodiliceY'],
    'Na postolju su dvije profilne linearne vodilice po kojima se saonice gibaju u smjeru Y. Svaku vodilicu obuhvaćaju dvoja kotrljajna kolica s kuglicama, pa je trenje malo, a gibanje mirno i bez zračnosti. Vodilice određuju pravocrtnost gibanja i nose težinu saonica, stola i obratka. Štite ih teleskopski limovi ispred i iza saonica, jer strugotina i prljavština brzo oštećuju staze.', null, 'nisko'],
  [7, 2, 'Servomotor, os Y', 'Servo motor, Y axis', ['servoY'],
    'Os Y pokreće izmjenični servomotor na prednjoj strani postolja, spojen s vretenom elastičnom spojkom. Na stražnjem kraju motora je davač koji broji zakretanje osovine — to je neizravni mjerni sustav: položaj saonica računa se iz kuta zakreta vretena i koraka navoja. Upravljanje stalno uspoređuje zadani i izmjereni položaj i prema razlici regulira motor. Zračnost i toplinsko istezanje vretena ovakav sustav ne vidi, pa ih upravljanje kompenzira.', 'mjerni', 'sprijedaNisko'],
  [8, 1, 'Stup stroja', 'Machine column', ['stup'],
    'Stup je okomita nosiva konstrukcija na stražnjem dijelu postolja. Na njegovoj prednjoj strani su vodilice i kuglično vreteno osi Z, a po njima se gore-dolje giba glava vretena. U šupljem stupu giba se protuuteg koji preko lanca i lančanika uravnotežuje težinu glave, pa motor osi Z ne mora stalno držati cijelu težinu. Stup mora biti krut na savijanje, jer svaki njegov progib izravno pomiče alat.', null, 'stup'],
  [9, 2, 'Kuglično navojno vreteno, os Z', 'Ball screw drive, Z axis', ['vretenoZ'],
    'Vreteno osi Z stoji okomito na prednjoj strani stupa, između vodilica. Matica je spojena s nosačem glave, pa okretanje vretena diže ili spušta glavu i alat. Motor osi Z je na vrhu stupa. Kad je pogon isključen, kočnica motora drži glavu da ne bi pala pod vlastitom težinom.', 'kuglicno', 'stup'],
  [10, 2, 'Vodilice, os Z', 'Guide, Z axis', ['vodiliceZ'],
    'Dvije okomite vodilice na stupu vode glavu vretena u smjeru Z; na njima su četvera kotrljajna kolica pričvršćena za nosač glave. Vodilice moraju biti točno okomite na stol, jer o tome ovisi okomitost provrta i stijenki koje alat izradi. Zaštićene su okomitim teleskopskim limovima iznad i ispod glave.', null, 'stup'],
  [11, 2, 'Mjerni sustav, os Z', 'Measuring system, Z axis', ['mjerniZ'],
    'Os Z ima servomotor s neizravnim mjernim sustavom na vrhu stupa. Davač u motoru daje impulse pri zakretanju, a upravljanje iz njihova broja i koraka navoja računa visinu glave. Budući da je os okomita, motor ima kočnicu koja se zatvori čim nestane napajanja. Klikni „Kako radi” i pogledaj kako mjerni sustav pretvara svjetlosne impulse u broj.', 'mjerni', 'vrhStupa'],
  [12, 1, 'Križne saonice', 'Cross slide', ['saonice'],
    'Križne saonice su sklop između postolja i stola: donjim dijelom gibaju se po vodilicama Y, a odozgo nose vodilice X po kojima se giba stol. Tako stol dobiva dva međusobno okomita gibanja, a glava treće (Z). Pri programiranju uvijek zamišljaš da se giba alat; kad se zapravo giba stol, on ide u suprotnom smjeru od programiranog. Klikni „Kako radi” za usporedbu konzolne izvedbe i izvedbe s križnim stolom.', 'izvedbe', 'nisko'],
  [13, 2, 'Kuglično navojno vreteno, os X', 'Ball screw drive, X axis', ['vretenoX'],
    'Vreteno osi X leži u utoru na gornjoj strani križnih saonica, a matica je pričvršćena ispod stola. Servomotor na desnom kraju saonica pokreće vreteno preko zupčastog remena. Okretanje vretena giba stol lijevo i desno. Vreteno je na oba kraja uležišteno u ležajevima koji preuzimaju uzdužne sile.', 'kuglicno', 'nisko'],
  [14, 2, 'Vodilice, os X', 'Guide, X axis', ['vodiliceX'],
    'Dvije vodilice osi X pričvršćene su na donju stranu stola, a nose ih četvera kolica na gornjoj strani križnih saonica. Stol je dulji od saonica, pa u krajnjim položajima osi X jednim dijelom visi preko njih. Dio saonica koji pritom ostane otkriven pokrivaju teleskopski limovi.', null, 'nisko'],
  [15, 2, 'Mjerni sustav, os X', 'Measuring system, X axis', ['mjerniX'],
    'Servomotor osi X s neizravnim mjernim sustavom nalazi se na desnom kraju križnih saonica i giba se zajedno s njima po osi Y. Kao i kod ostalih osi, položaj stola računa se iz broja impulsa davača i koraka navoja. Na vrlo točnim strojevima dodaje se izravni mjerni sustav — staklena mjerna letva uz vodilicu — koji mjeri stvarni položaj stola.', 'mjerni', 'desnoNisko'],
  [16, 1, 'Glava vretena', 'Spindle head', ['glava', 'obloga', 'motor', 'cilindar', 'pinola'],
    'Glava vretena nosi glavno vreteno s ležajevima, glavni motor s remenskim prijenosom i stezni cilindar za otpuštanje alata. Pričvršćena je na nosač koji klizi po vodilicama Z na stupu. Na čelu vretena je konusni prihvat za držač alata SK40. Glava se tijekom rada najviše grije, pa se temperatura vretena prati, a pomak zbog topline kompenzira.', null, 'glava'],
  [17, 2, 'Glavni pogonski motor', 'Main drive motor', ['motor'],
    'Glavni motor daje snagu za rezanje i brzinu vrtnje vretena. U našem modelu stoji na glavi iza vretena i pokreće ga zupčastim remenom. Brzinu vrtnje u programu zadaje adresa S, smjer M3 (udesno) ili M4 (ulijevo), a M5 zaustavlja vreteno. Tijekom rada brzinu vrtnje možeš mijenjati korekcijom brzine vrtnje na ploči.', null, 'glava'],
  [18, 2, 'Stezni cilindar', 'Clamping cylinder', ['cilindar'],
    'Stezni cilindar na vrhu vretena služi za otpuštanje alata. Kad u njegov prostor uđe stlačeni zrak, klip potisne vlačnu šipku prema dolje, stisne paket tanjurastih opruga i oslobodi držač alata. Kad zrak izađe, opruge ponovno uvuku držač u konus. Alat dakle drži sila opruga, a zrak služi samo za otpuštanje.', null, 'glava'],
  [19, 2, 'Pinola', 'Centre sleeve', ['pinola'],
    'Pinola je donji dio vretena s jedinicom za stezanje alata: vlačnom šipkom, paketom tanjurastih opruga i hvataljkom koja zahvaća svornjak držača. Sila opruga uvlači držač SK40 u konus vretena i drži ga sigurno i kad nestane zraka. Alat se otpušta tek kad stezni cilindar nadjača opruge. Klikni „Kako radi” za animaciju stezanja i otpuštanja.', 'stezanje', 'glavaNisko'],
  [20, 1, 'Stezni stol', 'Clamping table', ['stol'],
    'Stezni stol je ploča s T-utorima na koju se pričvršćuju škripac, stezne pandže, naprave ili izravno obradak. T-utori su usporedni s osi X i služe za T-vijke i matice. Gornja ploha stola je brušena i ravna; u našem modelu ona je ujedno razina Z0 koordinatnog sustava stroja. Stol se giba po X na saonicama, a zajedno sa saonicama po Y.', null, 'radni'],
  [21, 2, 'Škripac', 'Vice', ['skripac'],
    'Strojni škripac drži obradak između nepomične i pomične čeljusti; pomična se primiče vretenom i ručicom. Obradak leži na podložnim letvama, da bude ravno i dovoljno visoko iznad čeljusti. Nepomična čeljust mora biti usporedna s osi X, pa se nakon postavljanja škripca provjerava mjernom urom. Prije obrade provjeri je li obradak čvrsto stegnut.', null, 'radni'],
  [22, 2, 'Stezne pandže', 'Clamping claws', ['pandze'],
    'Stezne pandže pritišću škripac ili obradak na stol. Pandža se jednim krajem oslanja na obradak, drugim na stepenastu podložnu kocku, a između je T-vijak s maticom. Sila vijka dijeli se na oba oslonca prema udaljenostima: što je vijak bliže obratku, veći dio sile ide na obradak. Zato vijak postavi što bliže obratku, a pandžu drži vodoravno. Klikni „Kako radi” i provjeri to na animaciji.', 'oslonac', 'radni'],
  [23, 2, 'Obradak', 'Workpiece', ['obradak'],
    'Obradak je pripremak koji se obrađuje — ovdje ploča 120 × 90 × 20 mm stegnuta u škripcu. Prije obrade mora biti poznat njegov položaj u radnom prostoru, zato se određuje nultočka obratka. Obradak se steže tako da alat ne udari u čeljusti škripca ni u pandže. Na stranici Postavljanje stroja iz ovog pripremka nastaju naši predmeti P01 … P21.', null, 'radni'],
  [24, 2, 'Nultočka obratka', 'Workpiece zero point', ['nulaW'],
    'Nultočka obratka W je ishodište koordinatnog sustava obratka (WKS) od kojega se programiraju sve mjere. Bira je programer — ovdje je u lijevom prednjem gornjem kutu ploče. Njezin položaj u odnosu na nultočku stroja upisuje se u upravljanje kao pomak nultočke, npr. G54. Ako je pomak kriv, i ispravan program vodi alat na krivo mjesto. Klikni „Kako radi”.', 'g54wks', 'radni'],
  [25, 2, 'Nultočka stroja', 'Machine zero point', ['nulaM'],
    'Nultočka stroja M je ishodište koordinatnog sustava stroja (MKS); određuje je proizvođač i korisnik je ne mijenja. U našem modelu nalazi se na gornjoj plohi stola, u točki X0 Y0 Z0. Upravljanje je „pronalazi” referenciranjem osi nakon uključivanja. Sve ostale točke — referentna točka, nultočka obratka i točka izmjene alata — zadane su u odnosu na nju. Klikni „Kako radi”.', 'g54mks', 'radni'],
  [26, 1, 'Spremnik alata', 'Tool magazine', ['spremnik', 'oblogaSpremnika', 'izmjenjivac', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    'Spremnik alata čuva alate spremne za automatsku izmjenu. Naš model ima okretni spremnik sa šest mjesta lijevo od stupa, a mjesto u spremniku odgovara broju alata T. Naredbom T odabire se alat i spremnik ga zakrene na mjesto izmjene, a naredbom M6 izmjenjivač ga stavi u vreteno. Duljina i polumjer svakog alata upisuju se u korekcije alata.', null, 'spremnik'],
  [27, 2, 'T1 čeono glodalo Ø63', 'T1 Face-milling cutter 63mm', ['T1'],
    'Čeono glodalo promjera 63 mm s izmjenjivim pločicama služi za poravnavanje velikih ravnih ploha. Reže čelom i obodom, uz velik posmak i malu dubinu rezanja. Zbog velikog promjera radi s manjom brzinom vrtnje od manjih glodala. Na rubu obratka ostavlja oštar brid koji poslije treba skositi.', null, 'spremnik'],
  [28, 2, 'T2 glodalo za utore Ø20', 'T2 Slot milling tool 20mm', ['T2'],
    'Glodalo za utore promjera 20 mm ima oštrice na obodu i na čelu sve do središta, pa smije uranjati okomito u materijal. Koristi se za utore, džepove i konture. Ima dvije do tri oštrice, pa strugotina lako izlazi iz utora. Promjer određuje širinu utora izrađenog u jednom prolazu.', null, 'spremnik'],
  [29, 2, 'T3 glodalo za utore Ø10', 'T3 Slot milling tool 10mm', ['T3'],
    'Manje glodalo za utore, promjera 10 mm, za uže utore, manje džepove i završnu obradu kontura s manjim polumjerima zaobljenja. Vitkije je od T2, pa mu dubina rezanja i posmak po zubu moraju biti manji. Polumjer alata (5 mm) upisuje se u korekcije, jer o njemu ovisi korekcija putanje G41/G42.', null, 'spremnik'],
  [30, 2, 'T4 spiralno svrdlo Ø8,5', 'T4 Spiral drilling tool 8.5mm', ['T4'],
    'Spiralno svrdlo promjera 8,5 mm buši provrte — upravo je to provrt za urezivanje navoja M10. Vrh svrdla ima kut 118°, pa dno provrta nije ravno, što se uračunava u dubinu bušenja. Za duboke provrte koristi se ciklus bušenja s povlačenjem svrdla radi izbacivanja strugotine. Mjesto provrta dobro je prije zabušiti.', null, 'spremnik'],
  [31, 2, 'T5 ureznik M10', 'T5 Thread drilling tool M10', ['T5'],
    'Strojni ureznik M10 urezuje unutarnji navoj u provrt Ø8,5 koji je izbušilo svrdlo T4. Posmak mora točno odgovarati koraku navoja (za M10 to je 1,5 mm po okretaju), zato se koristi ciklus urezivanja u kojemu upravljanje usklađuje vrtnju i posmak. Na dnu provrta vreteno promijeni smjer vrtnje i ureznik izađe. Pogrešan posmak lomi ureznik.', null, 'spremnik'],
  [32, 2, 'T6 mjerna sonda', 'T6 Remote measuring probe', ['T6'],
    '3D mjerna sonda nije alat za rezanje nego mjerni uređaj u držaču alata. Kad njezino ticalo dotakne obradak, sonda bežično javi upravljanju trenutak dodira, a upravljanje zapamti položaj osi. Mjernim ciklusima tako se samostalno određuju nultočka obratka, zakrenutost obratka ili središte provrta. Klikni „Kako radi”.', 'sonda', 'spremnik'],
  [33, 1, 'Električni ormar', 'Switch cabinet', ['ormar', 'ormarL', 'ormarD', 'rucka', 'napojni', 'ncu', 'plc'],
    'Električni ormar stoji iza stroja, a u njemu je sva upravljačka i pogonska elektronika: napojni modul, upravljanje s pogonskim modulima (NCU), PLC, sklopnici, zaštitne sklopke i transformator. Ormar je zatvoren i hlađen, jer elektronika ne podnosi prašinu, vlagu ni maglu rashladnog sredstva. U modelu se vrata ormara otvore kad odabereš ovu stavku ili neki njezin dio. Rad u ormaru pod naponom smije obavljati samo ovlašteni električar.', null, 'ormar'],
  [34, 2, 'Napojni modul', 'Supply module', ['napojni'],
    'Napojni modul pretvara izmjenični mrežni napon u istosmjerni napon međukruga iz kojega se napajaju pogonski moduli svih osi i vretena. Kad motori koče, energija se vraća u međukrug, a modul je vraća u mrežu ili je pretvara u toplinu na otporniku. Za elektroniku upravljanja napon se još transformira, ispravlja, filtrira i održava stalnim. Klikni „Kako radi” i prati napone na mjernim točkama.', 'napajanje', 'ormarBlizu'],
  [35, 2, 'Upravljanje s pogonskim modulom (NCU)', 'Control with drive module', ['ncu'],
    'NCU (numerička upravljačka jedinica) je računalo stroja: čita NC program blok po blok, računa putanju alata (interpolacija) i šalje zadane vrijednosti pogonskim modulima osi. Pogonski moduli napajaju servomotore, a davači vraćaju stvarni položaj i brzinu. Razlika između zadane i stvarne vrijednosti stalno se ispravlja — to je regulacijski krug. Klikni „Kako radi” i pokreni CYCLE START.', 'regulacija', 'ormarBlizu'],
  [36, 2, 'PLC', 'PLC', ['plc'],
    'PLC (programirljivi logički kontroler) upravlja logičkim funkcijama stroja: vratima, izmjenom alata, hlađenjem, podmazivanjem, statusnom svjetiljkom i sigurnosnim uvjetima. Stroj se smije pokrenuti tek kad su ispunjeni svi uvjeti — vrata zatvorena, gljiva otpuštena, osi nisu na graničnim sklopkama — što je logički spoj I. Sigurnosne sklopke na vratima nikad se ne premošćuju: to je opasno po život. Klikni „Kako radi”.', 'plc', 'ormarBlizu'],
  [37, 1, 'Ostali sklopovi', 'Components', ['kabina', 'sklopka', 'poklopacD', 'poklopacL', 'ship', 'klizno', 'strugotinaD', 'strugotinaL', 'lampa'],
    'U ovoj skupini su sklopovi koji ne sudjeluju izravno u rezanju, ali bez njih stroj ne može raditi sigurno i dugo: kabina, glavna sklopka, servisni poklopci s pneumatikom i centralnim podmazivanjem, posude za rashladno sredstvo, klizno ulje i strugotinu te statusna svjetiljka. Odaberi stavku u podizborniku i pogledaj gdje je koji dio.', null, 'stroj'],
  [38, 2, 'Kabina', 'Cabin', ['kabina', 'vrataL', 'vrataD'],
    'Kabina potpuno zatvara radni prostor i štiti korisnika od strugotine, rashladnog sredstva i dijelova koji bi se pri lomu alata mogli odbaciti. Prozori su od sigurnosnog stakla ili polikarbonata. Kroz klizna vrata pristupa se stolu pri stezanju obratka. Dno kabine je koso, pa strugotina i rashladno sredstvo klize prema posudama sa strane.', null, 'stroj'],
  [39, 2, 'Glavna sklopka', 'Main switch', ['sklopka'],
    'Glavnom sklopkom stroj se spaja na mrežu ili potpuno odvaja od nje. U našem modelu je na stražnjoj strani stroja, desno od električnog ormara. Kad je isključena, zaključava se lokotom, da nitko ne uključi stroj tijekom održavanja. Na stranici Postavljanje stroja njome počinje niz „Uključivanje”.', null, 'sklopka'],
  [40, 2, 'Desni servisni poklopac', 'RH maintenance flap', ['poklopacD', 'pneumatika', 'podmazivanje'],
    'Desni servisni poklopac u donjem dijelu desne stijenke kabine otvara pristup pneumatskoj jedinici i centralnom podmazivanju. Iza njega provjeravaš tlak zraka i razinu ulja za podmazivanje te ispuštaš kondenzat iz filtra. Kad odabereš ovu stavku, poklopac se u modelu otvori. Kontrola ovih dijelova dio je dnevnog pregleda stroja.', null, 'desniPoklopac'],
  [41, 3, 'Pneumatska jedinica', 'Pneumatic unit', ['pneumatika'],
    'Pneumatska jedinica priprema stlačeni zrak: filtar odvaja nečistoće i vodu, regulator drži stalan tlak (pokazuje ga manometar), a razvodni ventili vode zrak do potrošača. Najvažniji potrošač je stezni cilindar za otpuštanje alata; zrakom se ispuhuje i konus vretena. Tipka za izmjenu alata uključuje razvodni ventil 3/2. Klikni „Kako radi”.', 'pneumatika', 'desniPoklopac'],
  [42, 3, 'Centralno podmazivanje', 'Central lubrication', ['podmazivanje'],
    'Centralno podmazivanje u zadanim razmacima samo potiskuje malu količinu ulja kroz cjevčice do vodilica i matica kugličnih vretena. Bez ulja klizanje postaje trzajuće (stick-slip), točnost pada, a vodilice se mogu oštetiti. Razina ulja vidi se kroz prozirnu stijenku spremnika; kad padne ispod oznake, upravljanje javi poruku. Klikni „Kako radi”.', 'stickslip', 'desniPoklopac'],
  [43, 2, 'Lijevi servisni poklopac', 'LH maintenance flap', ['poklopacL', 'ship', 'klizno', 'temperatura'],
    'Lijevi servisni poklopac otvara pristup posudi rashladnog sredstva s crpkom i posudi kliznog ulja. Kroz njega se dolijeva i mijenja rashladno sredstvo, čisti filtar crpke i prazni staro ulje. Kad odabereš ovu stavku, poklopac se u modelu otvori.', null, 'lijeviPoklopac'],
  [44, 2, 'Posuda rashladnog sredstva (SHIP)', 'Coolant lubricant basin', ['ship', 'temperatura'],
    'U posudi je sredstvo za hlađenje, ispiranje i podmazivanje (SHIP), najčešće emulzija ulja u vodi. Crpka ga potiskuje do mlaznica uz vreteno, a sa strugotinom se preko kosih ploha kabine i sita vraća u posudu. Koncentraciju emulzije treba redovito mjeriti, a posudu čistiti, jer se u njoj razvijaju bakterije. Temperatura sredstva prikazana je na pokazivaču iznad poklopca.', null, 'lijeviPoklopac'],
  [45, 2, 'Posuda kliznog ulja', 'Sliding lubricant basin', ['klizno'],
    'Ulje kojim centralno podmazivanje maže vodilice ne vraća se u spremnik: kaplje s vodilica i skuplja se u posudi kliznog ulja. Tako ne onečišćuje rashladno sredstvo, u kojemu bi plutalo kao strano ulje. Posudu treba redovito prazniti, a staro ulje zbrinuti kao opasan otpad.', null, 'lijeviPoklopac'],
  [46, 2, 'Desna posuda za strugotinu', 'RH chip basin', ['strugotinaD'],
    'Strugotina iz radnog prostora klizi po kosim plohama dna kabine u posude s lijeve i desne strane. Desna posuda izvlači se sprijeda kao ladica i prazni. Prije izvlačenja vreteno mora stajati, a vrata kabine biti zatvorena. Strugotina je oštra i može biti vruća — prazni je u zaštitnim rukavicama.', null, 'posude'],
  [47, 2, 'Lijeva posuda za strugotinu', 'LH chip basin', ['strugotinaL'],
    'Lijeva posuda prima strugotinu s lijeve polovine radnog prostora; u krajnjim položajima osi X strugotina s kraja stola pada i izravno u nju. Kad su posude pune, strugotina se gomila na kosim plohama i može doći do vodilica, zato ih prazni redovito.', null, 'posude'],
  [48, 2, 'Statusna svjetiljka', 'Status light', ['lampa'],
    'Statusna svjetiljka na krovu kabine izdaleka pokazuje stanje stroja. U našem modelu znači: siva — stroj isključen, žuta — uključen i čeka, zelena — program se izvodi, crvena — alarm ili sudar. Boje i njihovo značenje određuje proizvođač u PLC-u, pa se na drugim strojevima mogu razlikovati. Dok je stavka odabrana, svjetiljka redom pokazuje sva stanja.', null, 'lampa']
].map(([n, razina, naziv, engl, ids, tekst, tema, pogled]) => ({ n, razina, naziv, engl, ids, tekst, tema, pogled }));

/* dijelovi koji nemaju svoju stavku izbornika (prelazak mišem i klik u 3D) */
const DODATNI = {
  limoviH: ['Vodoravni pokrovni limovi', 'Horizontal cover plates', 12, 'Teleskopski limovi ispred i iza saonica te na krajevima saonica pokrivaju vodilice i vretena osi X i Y. Sastoje se od više limova koji se uvlače jedan pod drugi kad se os giba. Pomakni os X ili Y i pogledaj kako se skraćuju i produljuju. Oštećen ili zaglavljen lim treba odmah zamijeniti, inače strugotina dođe do vodilica.'],
  limoviV: ['Okomiti pokrovni limovi', 'Vertical cover plates', 8, 'Okomiti teleskopski limovi iznad i ispod glave pokrivaju vodilice i vreteno osi Z na stupu. Kad se glava spušta, gornji se limovi izvlače, a donji uvlače, i obrnuto. Pomakni os Z i pogledaj.'],
  snop: ['Kabelski snop', 'Cable harness', 33, 'Kabelski snop vodi kabele za napajanje motora, davače, ventile i sklopke iz električnog ormara u stroj. Kabeli prema pokretnim sklopovima vode se u lančanim vodilicama, da se pri gibanju ne savijaju preoštro i ne taru. Signalni kabeli davača odvojeni su od energetskih i oklopljeni, jer bi smetnje kvarile mjerenje.'],
  lanac: ['Lanac protuutega', 'Chain for counterweight', 8, 'Lanac preko lančanika na vrhu stupa povezuje nosač glave s protuutegom u šupljem stupu. Kad se glava spušta, protuuteg se diže, i obrnuto, pa motor osi Z svladava samo trenje i ubrzanje, a ne cijelu težinu glave. Pomakni os Z i promatraj lanac i protuuteg.'],
  temperatura: ['Pokazivač temperature rashladnog sredstva', 'Coolant temperature display', 44, 'Pokazivač na lijevoj stijenci kabine prikazuje temperaturu SHIP-a. Pretoplo sredstvo grije obradak i stroj, pa se mjere mijenjaju, a emulzija brže propada. Veći strojevi zato imaju poseban hladnjak rashladnog sredstva.'],
  izmjenjivac: ['Izmjenjivač alata', 'Tool changer', 26, 'Izmjenjivač s dvostrukom hvataljkom stoji između spremnika i vretena. Na naredbu M6 zakrene se, istodobno uhvati alat u vretenu i novi alat u spremniku, izvuče ih, okrene za pola kruga i umetne — za nekoliko sekundi. Vreteno pritom stoji u točki izmjene alata, zaustavljeno u točnom kutnom položaju. U mirovanju je hvataljka izvan dosega glave.'],
  oblogaSpremnika: ['Obloga spremnika alata', 'Tool changer cladding', 26, 'Limena obloga zatvara spremnik alata odozgo i sa strane i štiti alate od strugotine i rashladnog sredstva. Prema izmjenjivaču je otvorena. Na vrhu je pogon za zakretanje spremnika.'],
  obloga: ['Obloga glave', 'Spindle head cladding', 16, 'Obloga na vrhu glave pokriva remenski prijenos između glavnog motora i vretena. Štiti remen od strugotine i rashladnog sredstva, a korisnika od remena koji se vrti velikom brzinom.'],
  rucka: ['Ručka vrata ormara', 'Switch cabinet door handle', 33, 'Ručka s bravom drži vrata električnog ormara zatvorena. Vrata otvara samo ovlašteni električar ključem; kod mnogih ormara otvaranje je moguće tek kad je glavna sklopka isključena.'],
  vrataL: ['Vrata stroja, lijeva', 'Machine door, LH', 38, 'Klizna vrata zatvaraju prednju stranu kabine. Sigurnosna sklopka javlja PLC-u jesu li zatvorena: dok su otvorena, program se ne može pokrenuti, a osi i vreteno rade samo smanjenom brzinom u posebnom načinu rada. Kroz prozor pratiš obradu.'],
  vrataD: ['Vrata stroja, desna', 'Machine door, RH', 38, 'Desno krilo kliznih vrata. Oba krila nadzire sigurnosna sklopka; vrata se za vrijeme obrade ne otvaraju, a kroz prozor pratiš obradu. Prozor mora biti čitav — oštećeno sigurnosno staklo ne zadržava odbačeni dio.'],
  ormarL: ['Električni ormar, lijevi dio', 'Switch cabinet, LH', 33, 'U lijevom dijelu ormara su transformator, glavni rastavljač i sklopnici za veće potrošače (crpka rashladnog sredstva, hlađenje ormara). Vrata se otvaraju prema natrag.'],
  ormarD: ['Električni ormar, desni dio', 'Switch cabinet, RH', 33, 'U desnom dijelu ormara su napojni modul, NCU s pogonskim modulima, PLC, zaštitne sklopke i redne stezaljke. Vrata se otvaraju prema natrag; znak upozorava na opasan napon.']
};
/* stavke izbornika prema id-u dijela */
const PO_DIJELU = {}; MENI.forEach((m) => { if (m.ids.length && !PO_DIJELU[m.ids[0]]) PO_DIJELU[m.ids[0]] = m.n; });
const ORMAR = new Set(['ormar', 'ormarL', 'ormarD', 'rucka', 'napojni', 'ncu', 'plc']), DESNI = new Set(['poklopacD', 'pneumatika', 'podmazivanje']), LIJEVI = new Set(['poklopacL', 'ship', 'klizno']);

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
  mda: ['MDA', 'Unos i izravno izvođenje pojedinačnih blokova, npr. T3 M6.'],
  auto: ['AUTO', 'Izvođenje programa.'],
  inc: ['INC (1 … 10000, VAR)', 'Korak za gibanje osi u JOG-u: 1, 10, 100, 1000 ili 10 000 µm po pritisku tipke smjera; VAR je slobodno zadan korak.'],
  korisnicke: ['Korisničke tipke', 'Tipke kojima proizvođač stroja dodjeljuje funkcije, npr. uključivanje rashladnog sredstva, otključavanje vrata ili ispuhivanje.'],
  osX: ['Odabir osi X', 'U načinu JOG odabire os X za ručno gibanje.'],
  osY: ['Odabir osi Y', 'U načinu JOG odabire os Y za ručno gibanje.'],
  osZ: ['Odabir osi Z', 'U načinu JOG odabire os Z za ručno gibanje.'],
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
  pod.rotation.x = -Math.PI / 2; pod.position.set(0, -822, -100); scene.add(pod);
}
const S = napraviStroj(THREE, scene);
S.postaviAlat({ vrsta: 'utorno', L: 120, R: 5 });   /* u vretenu je T3 */
const KORIJENI = [S.stroj, S.stol, S.sanonice, S.glava];

/* svi meshevi i njihovi dijelovi */
const SVI = [];
KORIJENI.forEach((k) => k.traverse((o) => { if (o.isMesh || o.isSprite) { o.userData.m0 = o.material; SVI.push(o); } }));
function dioOd(o) { let p = o; while (p) { if (p.userData && p.userData.dio) return p.userData.dio; p = p.parent; } return null; }
SVI.forEach((o) => { o.userData.dioId = dioOd(o); });
function meshevi(ids) { const s = new Set(); ids.forEach((id) => { const d = S.dijelovi.get(id); if (d) d.objekti.forEach((ob) => ob.traverse((o) => { if (o.isMesh || o.isSprite) s.add(o); })); }); return s; }
const kabinaSet = meshevi(['kabina', 'vrataL', 'vrataD']);
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
try { JSON.parse(localStorage.getItem('ftq-cnc-840d-upoznavanje') || '[]').forEach((x) => vidjeni.add(+x)); } catch (e) { /* bez spremanja */ }
function spremi() { try { localStorage.setItem('ftq-cnc-840d-upoznavanje', JSON.stringify([...vidjeni])); } catch (e) { /* bez spremanja */ } }

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
  stroj: [[-1900, 1500, 3300], [150, 120, -50]], radni: [[-420, 420, 760], [-120, 40, -40]], desno: [[3900, 900, 700], [150, 0, -150]],
  lijevo: [[-3900, 900, 900], [-150, 0, -150]], straga: [[1500, 1300, -3900], [-200, 250, -700]], odozgo: [[350, 4300, 1100], [0, 0, -50]],
  nisko: [[1500, 300, 1700], [0, -200, 0]], sprijedaNisko: [[700, 0, 1900], [0, -230, 600]], stup: [[1300, 900, 1500], [0, 600, -400]],
  vrhStupa: [[900, 1500, 900], [0, 1150, -400]], desnoNisko: [[1500, 100, 900], [450, -150, 0]], glava: [[900, 750, 1100], [0, 500, -100]],
  glavaNisko: [[600, 480, 700], [0, 420, 0]], spremnik: [[-200, 650, 1300], [-430, 300, -170]], ormar: [[-900, 900, -3000], [-350, 300, -800]],
  ormarBlizu: [[-500, 950, -2100], [-160, 650, -800]], sklopka: [[900, 800, -2000], [160, 420, -605]], desniPoklopac: [[2300, 250, -1500], [700, -650, -350]],
  lijeviPoklopac: [[-2300, 250, -1500], [-700, -650, -350]], posude: [[300, -200, 2600], [0, -680, 600]], lampa: [[1600, 1500, 1900], [560, 900, 420]],
  ploca: [[1700, 650, 2200], [1070, 400, 960]]
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
  const fov = camera.fov * Math.PI / 180, dist = Math.max(ime === 'desniPoklopac' || ime === 'lijeviPoklopac' ? 1500 : 560, r / Math.sin(fov / 2) * (camera.aspect < 1 ? 1.5 : 1.08));
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
  $('brojac').textContent = vidjeni.size + ' / 48';
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
  $('k-prije').disabled = m.n === 1; $('k-dalje').disabled = m.n === 48;
  $('naslov-3d').textContent = d ? d[0] : m.naziv;
  /* otvaranje vrata ormara i poklopaca */
  const sviIds = new Set(ids);
  st.ciljOtv = { ormar: [...sviIds].some((x) => ORMAR.has(x)) ? 1 : 0, poklopacD: [...sviIds].some((x) => DESNI.has(x)) ? 1 : 0, poklopacL: [...sviIds].some((x) => LIJEVI.has(x)) ? 1 : 0 };
  /* upravljačka ploča */
  const ploca = ids.includes('upravljanje');
  $('ploca-sekcija').hidden = !ploca;
  osvjeziIzgled(); crtajStablo();
  if (!bezLeta) { if (ids.length && m.n > 2) letiDoDijela(ids, m.pogled); else pogled(m.pogled || 'stroj'); }
  if (ploca && !bezLeta) setTimeout(() => { const el = $('ploca-sekcija'); if (el.getBoundingClientRect().top > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 950);
  st.lampaT = 0;
}
$('k-prije').addEventListener('click', () => { if (st.akt > 1) odaberi(st.akt - 1); });
$('k-dalje').addEventListener('click', () => { if (st.akt < 48) odaberi(st.akt + 1); });
$('k-djeca').addEventListener('click', (e) => { const b = e.target.closest('[data-skok]'); if (b) odaberi(+b.dataset.skok); });
$('ploca-zatvori').addEventListener('click', () => { $('ploca-sekcija').hidden = true; });

/* „Kako radi” — 2D animacija iz modula teme2d.js (radi se zasebno) */
let tema = null;
function zatvoriTemu() { if (tema && tema.unisti) { try { tema.unisti(); } catch (e) { /* ništa */ } } tema = null; $('k-tema-el').hidden = true; $('k-tema-el').innerHTML = ''; $('k-tema').setAttribute('aria-expanded', 'false'); $('k-tema').textContent = 'Kako radi'; }
async function otvoriTemu() {
  const kljuc = st.temaKljuc; if (!kljuc) return;
  const el = $('k-tema-el'); el.hidden = false; el.innerHTML = '<p class="pom">Animacija se učitava…</p>';
  $('k-tema').setAttribute('aria-expanded', 'true'); $('k-tema').textContent = 'Zatvori animaciju';
  const T = await import('./teme2d.js').catch(() => null);
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
  X: 'Os X: stol se giba lijevo–desno po vodilicama na križnim saonicama (X ' + HOD.X[0] + ' … ' + HOD.X[1] + ' mm). Kad stol ide ulijevo, alat se u odnosu na obradak giba udesno (X+).',
  Y: 'Os Y: križne saonice sa stolom gibaju se naprijed–natrag po vodilicama na postolju (Y ' + HOD.Y[0] + ' … ' + HOD.Y[1] + ' mm). Kad stol ide prema tebi, alat se u odnosu na obradak giba prema natrag (Y+).',
  Z: 'Os Z: glava vretena giba se gore–dolje po vodilicama na stupu (Z ' + HOD.Z[0] + ' … ' + HOD.Z[1] + ' mm), a protuuteg u stupu ide suprotno. Z+ znači od obratka.'
};
const os = { X: S.stanje.X, Y: S.stanje.Y, Z: S.stanje.Z };
let anim = null;
function pokreniOs(o) {
  const v = os[o], put = [v, HOD[o][0], HOD[o][1], REF[o]];
  anim = { os: o, put, i: 0, brz: 260 };
  st.pom = meshevi(o === 'X' ? ['stol', 'vodiliceX', 'skripac', 'pandze', 'obradak', 'nulaW', 'nulaM'] : o === 'Y' ? ['saonice', 'stol', 'skripac', 'pandze', 'obradak', 'nulaW', 'nulaM', 'mjerniX'] : ['glava', 'obloga', 'motor', 'cilindar', 'pinola']);
  ['X', 'Y', 'Z'].forEach((k) => document.querySelector('[data-os="' + k + '"]').setAttribute('aria-pressed', String(k === o)));
  $('os-stop').disabled = false; $('os-opis').textContent = OS_OPIS[o];
  osvjeziIzgled();
}
function staniOs() {
  anim = null; st.pom = new Set(); $('os-stop').disabled = true;
  ['X', 'Y', 'Z'].forEach((k) => document.querySelector('[data-os="' + k + '"]').setAttribute('aria-pressed', 'false'));
  osvjeziIzgled();
}
document.querySelectorAll('[data-os]').forEach((b) => b.addEventListener('click', () => pokreniOs(b.dataset.os)));
$('os-stop').addEventListener('click', staniOs);
function korakOsi(dt) {
  if (!anim) return;
  const o = anim.os, cilj = anim.put[anim.i + 1];
  const d = cilj - os[o], s = Math.sign(d) * Math.min(Math.abs(d), anim.brz * dt);
  os[o] += s;
  st.hodMin = Math.min(st.hodMin ?? 1e9, os[o]); st.hodMax = Math.max(st.hodMax ?? -1e9, os[o]);
  if (Math.abs(cilj - os[o]) < 1e-6) { anim.i++; if (anim.i >= anim.put.length - 1) { staniOs(); $('os-opis').textContent = OS_OPIS[o] + ' Os je vraćena u referentnu točku.'; } }
  S.postaviOsi(os.X, os.Y, os.Z);
}
function prikaziOsi() { $('osi').textContent = 'MKS  X ' + os.X.toFixed(3) + '   Y ' + os.Y.toFixed(3) + '   Z ' + os.Z.toFixed(3); }

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
  ['ormar', 'poklopacD', 'poklopacL'].forEach((k) => { const sad = S.otvaranje[k], cilj = c[k] || 0; if (Math.abs(sad - cilj) > 1e-3) { S.otvori(k, sad + Math.sign(cilj - sad) * Math.min(Math.abs(cilj - sad), dt * 1.4)); ide = true; } });
  /* statusna svjetiljka: kad je odabrana, redom pokazuje stanja; inače žuta (uključen, čeka) */
  let li = 1; if (st.akt === 48) { st.lampaT += dt; li = Math.floor(st.lampaT / 1.3) % 4; } else if (anim) li = 2;
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
