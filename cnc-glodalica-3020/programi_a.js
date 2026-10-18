/* FORTRONIQ · Mala CNC glodalica 3020 — vlastiti primjeri za četvrtu os A (Mach3).
   Pripremak: valjak Ø40 × 100 mm (MDF ili aluminij), 15 mm u čeljustima, konjić na desnom kraju.
   Nultočka G54: X0 na čelu čeljusti, Y0 i Z0 na osi valjka, A0 po volji (Zero 4).  Alat T1: ravno glodalo Ø3, 2 oštrice.
   Prije svakog zakreta osi A alat je na sigurnoj visini iznad valjka (Z ≥ 25, polumjer valjka je 20).  © ForTroniQ d.o.o. */

const f = (v) => v.toFixed(3);
const ZAGLAVLJE = (ime, opis) => [
  '(' + ime + ' - ' + opis + ')',
  '(PRIPREMAK: VALJAK D40 X 100, 15 MM U CELJUSTIMA, KONJIC NA DESNOM KRAJU)',
  '(NULTOCKA G54: X0 CELO CELJUSTI, Y0 I Z0 NA OSI VALJKA, A0 ZERO 4)',
  '(ALAT T1: RAVNO GLODALO D3, 2 OSTRICE)',
  'G21 G90 G94 G54',
  'G17 G40 G49',
  'M6 T1',
  'M3 S18000',
  'G0 Z30.000'
];

/* A1 — obodni utor: X stoji, os A napravi puni okret (dva prolaza po 1 mm) */
const A1 = [...ZAGLAVLJE('A1', 'OBODNI UTOR SIRINE 3 I DUBINE 2 MM'),
  'G0 X40.000 Y0.000 A0.000',
  '(OP Obodni_utor)',
  'G0 Z21.000',
  'G1 Z19.000 F150.000',
  '(F VRIJEDI ZA KUT: 1800 STUPNJEVA/MIN, NA PROMJERU 38 TO JE OKO 600 MM/MIN)',
  'G1 A360.000 F1800.000',
  'G1 Z18.000 F150.000',
  'G1 A0.000 F1800.000',
  'G0 Z30.000',
  'M5',
  'M30'].join('\n');

/* A2 — zavojni utor: X i A gibaju se istodobno (dva okreta na 55 mm, uspon 27,5 mm) */
const A2 = [...ZAGLAVLJE('A2', 'ZAVOJNI UTOR, DVA OKRETA NA 55 MM'),
  'G0 X15.000 Y0.000 A0.000',
  '(OP Zavojni_utor)',
  'G0 Z21.000',
  'G1 Z18.500 F150.000',
  '(F VRIJEDI ZA ZAJEDNICKI PUT 55 MM I 720 STUPNJEVA: OKO 0,6 MIN)',
  'G1 X70.000 A720.000 F1200.000',
  'G0 Z30.000',
  'M5',
  'M30'].join('\n');

/* A3 — indeksiranje: četiri ravne plohe pod 90° (A0, A90, A180, A270), ploha na Z17, dva prolaza */
function a3() {
  const r = [...ZAGLAVLJE('A3', 'CETIRI RAVNE PLOHE, INDEKSIRANJE PO 90 STUPNJEVA')];
  [0, 90, 180, 270].forEach((kut) => {
    r.push('(OP Ploha_A' + kut + ')');
    r.push('G0 Z25.000', 'G0 X10.000 Y-12.000 A' + f(kut));
    [18.5, 17].forEach((z) => {
      r.push('G1 Z' + f(z) + ' F150.000');
      let x = 10;
      for (let i = 0, y = -12; y <= 12 + 1e-9; i++, y += 2) {
        if (i > 0) r.push('G1 Y' + f(y) + ' F600.000');
        x = x === 10 ? 60 : 10; r.push('G1 X' + f(x) + ' F600.000');
      }
      r.push('G0 Z25.000', 'G0 X10.000 Y-12.000');
    });
  });
  r.push('G0 Z30.000', 'M5', 'M30');
  return r.join('\n');
}

function operacije(G, opisi) {
  const ops = []; G.split('\n').forEach((l, i) => { const m = l.match(/^\(OP\s+([^)]*)\)/); if (m) ops.push({ naziv: m[1], vrsta: opisi[m[1]] ? opisi[m[1]][0] : 'Glodanje', red: i, opis: opisi[m[1]] ? opisi[m[1]][1] : '' }); });
  return ops;
}

const G3 = a3();
export const PRIMJERI_A = {
  A1: { naziv: 'Obodni utor', d: 40, L: 100, G: A1, materijal: 'MDF ili aluminij',
    opis: 'Utor širine 3 mm i dubine 2 mm po cijelom obodu, na X40. Alat stoji, a os A napravi puni okret — najprije na dubini 1 mm (A0 → A360), zatim na 2 mm natrag (A360 → A0).',
    ops: operacije(A1, { Obodni_utor: ['obodni utor (samo os A)', 'X stoji na 40 mm, os A okreće se 360°; posmak F1800 u °/min daje na promjeru 38 mm oko 600 mm/min.'] }) },
  A2: { naziv: 'Zavojni utor', d: 40, L: 100, G: A2, materijal: 'MDF ili aluminij',
    opis: 'Zavojni utor dubine 1,5 mm od X15 do X70 u dva okreta (uspon 27,5 mm). X i A gibaju se istodobno u istom bloku G1.',
    ops: operacije(A2, { Zavojni_utor: ['zavojni utor (istodobno X i A)', 'Blok G1 X70 A720 F1200: Mach3 zbraja put od 55 mm i 720° i vodi ga posmakom 1200.'] }) },
  A3: { naziv: 'Četiri plohe (indeksiranje)', d: 40, L: 100, G: G3, materijal: 'MDF ili aluminij',
    opis: 'Četiri ravne plohe duljine 50 mm, 3 mm ispod oboda (na Z17), u dva prolaza. Os A zakrene se za 90° dok je alat iznad valjka (Z25); za vrijeme glodanja A stoji.',
    ops: operacije(G3, Object.fromEntries([0, 90, 180, 270].map((k) => ['Ploha_A' + k, ['ravna ploha (indeksirano, A' + k + ')', 'Os A stoji na ' + k + '°; alat glođe redove po Y s korakom 2 mm, najprije na Z18,5, zatim na Z17.']]))) }
};
