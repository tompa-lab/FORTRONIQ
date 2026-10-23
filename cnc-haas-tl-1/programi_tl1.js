/* FORTRONIQ · Haas TL-1 — programi vježbi (naši; Haas dijalekt za tokarilicu). Pripremak: čelik/aluminij Ø40 ili Ø50, u steznoj glavi.
   Alati: T1 vanjski nož, T2 odrezivač 3 mm, T3 svrdlo Ø12, T4 nož za navoj, T5 unutarnji nož.  © ForTroniQ d.o.o. */
export const PROGRAMI_TL = {
  O03001: { naslov: 'CEPIC', D: 40, L: 130, drz: 30, alat: 1, opis: 'Čeono tokarenje, uzdužno tokarenje na Ø36 i Ø30 s skošenjem 1 × 45°, odrezivanje na duljinu 60 mm. Alati T1 i T2.', tekst: `%
O03001 (CEPIC)
(PRIPREMAK D40 X 100 IZVAN CELJUSTI)
(T1 VANJSKI NOZ, T2 ODREZIVAC 3 MM)
G18 G21 G40 G99
T0101
G50 S1500
G96 S150 M03
G00 X45. Z2. M08
(CELO)
G01 Z0. F0.15
X-1.
G00 Z2.
X42.
(GRUBO D36)
G01 X36. F0.25
Z-62.
X42.
G00 Z2.
(D30 NA 40 MM)
G01 X30.
Z-40.
X36.
G00 Z2.
(ZAVRSNO SA SKOSENJEM 1X45)
G00 X26.
G01 Z0. F0.12
X30. ,C1.
Z-40.
X36.
Z-62.
X42.
G00 X80. Z50. M09
(ODREZIVANJE)
T0202
G97 S600 M03
G00 X42. Z-63. M08
G01 X-1. F0.05
G00 X80. M09
Z50.
M30
%` },
  O03002: { naslov: 'G71 KONTURA', D: 50, L: 130, drz: 30, alat: 1, opis: 'Grubo tokarenje konture ciklusom G71 (profil N10 … N20: Ø20, Ø34, luk R5, Ø46) i završna obrada G70. Alat T1.', tekst: `%
O03002 (G71 KONTURA)
(PRIPREMAK D50 X 100 IZVAN CELJUSTI)
G18 G21 G40 G99
T0101
G50 S1500
G96 S160 M03
G00 X55. Z2. M08
G01 Z0. F0.15
X-1.
G00 Z2. X52.
G71 P10 Q20 U0.5 W0.1 D2. F0.3
N10 G00 X20.
G01 Z0.
Z-20. F0.15
X34.
Z-40.
G02 X44. Z-45. R5.
G01 X46.
N20 Z-65.
G70 P10 Q20
G00 X100. Z50. M09
M30
%` },
  O03003: { naslov: 'PROVRT I NAVOJ', D: 40, L: 130, drz: 30, alat: 1, opis: 'Čelo, Ø30 tokarenje, bušenje Ø12 ciklusom G74 (T3), navoj M30 × 2 ciklusom G76 (T4), utor 3 mm ciklusom G75 (T2).', tekst: `%
O03003 (PROVRT I NAVOJ)
(PRIPREMAK D40 X 100 IZVAN CELJUSTI)
G18 G21 G40 G99
T0101
G50 S1500
G96 S150 M03
G00 X45. Z2. M08
G01 Z0. F0.15
X-1.
G00 Z2. X42.
G01 X30. F0.25
Z-35.
X42.
G00 Z2.
X26.
G01 Z0. F0.12
X30. ,C2.
Z-35.
X42.
G00 X80. Z50. M09
(BUSENJE D12)
T0303
G97 S800 M03
G00 X0. Z3. M08
G74 Z-30. K6. F0.1
G00 X80. Z50. M09
(UTOR ZA IZLAZ NAVOJA)
T0202
G97 S600 M03
G00 X42. Z-33. M08
G75 X26. I1.5 F0.06
G00 X80. Z50. M09
(NAVOJ M30 X 2)
T0404
G97 S500 M03
G00 X34. Z5. M08
G76 X27.55 Z-30. K1.23 D0.4 F2.
G00 X80. Z50. M09
M30
%` },
  O03004: { naslov: 'SUBPROGRAM M97', D: 40, L: 130, drz: 30, alat: 1, opis: 'Tri jednaka utora širine 3 mm na razmaku 10 mm s lokalnim potprogramom M97 (inkrementalno W). Alati T1 i T2.', tekst: `%
O03004 (SUBPROGRAM M97)
(PRIPREMAK D40 X 100 IZVAN CELJUSTI)
G18 G21 G40 G99
T0101
G50 S1500
G96 S150 M03
G00 X45. Z2. M08
G01 Z0. F0.15
X-1.
G00 Z2. X42.
G01 X36. F0.25
Z-50.
X42.
G00 X80. Z50. M09
T0202
G97 S600 M03
G00 X40. Z-10. M08
M97 P100 L3
G00 X80. Z50. M09
M30
N100 G01 X30. F0.05
G00 X40.
W-10.
M99
%` }
};
/* program za robotsku stanicu (čelo + Ø30 + skošenje, bez odrezivanja) */
export const PROGRAM_ROBOT_TL = `%
O03010 (ROBOT CEPIC)
(PRIPREMAK D40 X 80, 25 U CELJUSTIMA)
G18 G21 G40 G99
T0101
G50 S1500
G96 S150 M03
G00 X45. Z2.
G01 Z0. F0.15
X-1.
G00 Z2. X42.
G01 X30. F0.25
Z-25.
X42.
G00 Z2.
X26.
G01 Z0. F0.12
X30. ,C2.
Z-25.
X42.
G00 X80. Z50.
M30
%`;
