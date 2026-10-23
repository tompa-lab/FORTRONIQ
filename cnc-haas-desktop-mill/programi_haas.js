/* FORTRONIQ · Haas Desktop Mill — programi vježbi u Haas zapisu (naši). Pripremci u mm; G54 = lijevi prednji gornji kut.
   O01001 je vježba iz područja SINUMERIK 840D (VMDEMO, ciklus POCKET4) prevedena na Haas: utor uz rub + kružni džep G13.  © ForTroniQ d.o.o. */
export const PROGRAMI_H = {
  O01001: { naslov: 'KRUZNI DZEP', L: 120, W: 90, H: 20, alat: 2, opis: 'Vježba VMDEMO s 840D prevedena na Haas: utor uz lijevi rub (G01) i kružni džep Ø60 dubine 10 mm u dva prolaza ciklusom G13 (umjesto POCKET4).', tekst: `%
O01001 (KRUZNI DZEP)
(PLOCA 120 X 90 X 20 MM, G54 LIJEVI PREDNJI GORNJI KUT)
(T2 = RAVNO GLODALO D6)
G00 G17 G21 G40 G49 G80 G90
T2 M06
S3000 M03
G54 G00 X3. Y-6.
G43 H02 Z25.
G00 Z2.
G01 Z-5. F300.
G01 Y96. F300.
G00 Z2.
G00 X60. Y45.
G01 Z0. F300.
G91 G13 Z-5. I3. K30. Q3. D02 L2 F150.
G90 G00 Z25.
M05
G28 G91 Z0.
G90
M30
%` },
  O01002: { naslov: 'PROVRTI', L: 100, W: 60, H: 10, alat: 3, opis: 'Četiri provrta Ø5 ciklusom G81 (prolaz kroz ploču 10 mm) i jedan duboki provrt ciklusom G83 s izvlačenjem Q3; povratak G99 na ravninu R, zadnji G98 na početnu ravninu.', tekst: `%
O01002 (PROVRTI)
(PLOCA 100 X 60 X 10 MM, T3 = SVRDLO D5)
G00 G17 G21 G40 G49 G80 G90
T3 M06
S4000 M03
G54 G00 X15. Y15.
G43 H03 Z25.
G81 G99 Z-12. R2. F120.
X85.
Y45.
X15.
G98 G83 X50. Y30. Z-12. Q3. R2. F120.
G80
G00 Z25.
M05
G28 G91 Z0.
G90
M30
%` },
  O01003: { naslov: 'UTORI M97', L: 100, W: 60, H: 10, alat: 2, opis: 'Tri paralelna utora dubine 3 mm; putanja jednog utora je lokalni potprogram (N100 … M99) pozvan tri puta s M97 uz inkrementalni pomak G91.', tekst: `%
O01003 (UTORI M97)
(PLOCA 100 X 60 X 10 MM, T2 = RAVNO GLODALO D6)
G00 G17 G21 G40 G49 G80 G90
T2 M06
S6000 M03
G54 G00 X10. Y10.
G43 H02 Z25.
M97 P100 L3
G90 G00 Z25.
M05
G28 G91 Z0.
G90
M30
(LOKALNI POTPROGRAM: JEDAN UTOR 60 MM, ZATIM POMAK Y+15)
N100 G90 G00 Z2.
G01 Z-3. F200.
G91 G01 X60. F400.
G90 G00 Z2.
G91 G00 X-60. Y15.
M99
%` }
};
