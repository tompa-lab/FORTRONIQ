/* =====================================================================
   RescueLine v06 - pokusna dionica: isti algoritam kao u simulatoru
   (program_v06.lua), za Microline RobotLine (MRMS-Arduino-Sketches, ESP32).
   Tomislavov robot: letva ref-can8 (8 senzora), bez senzora boje.
   (c) ForTroniQ d.o.o. - dr.sc. Tomislav Pavlic, Krunoslav Kusec, Alen Britvic

   NACRT, NIJE ISPROBANO NA ROBOTU (5. 11. 2026.).
   - Tvornicki firmver na ovom robotu krivo racuna polozaj crte (dgr: "c"
     skace 1000-9000). Zato ovdje polozaj crte racunamo SAMI iz line(i)
     (funkcija centar()), a ne iz knjiznicnog lineCenter().
   - Ako i line(i) iz knjiznice dolazi izmijesan (anr: stupci izmijesani),
     treba knjiznica MRMS s podrskom za ref-can8 - upit poslan Microlineu.

   Kako ugraditi: u mrm-robot-line.cpp zamijeni tijelo funkcije
   RobotLine::lineFollow() ovim kodom (pokrece se naredbom "lnf", stop "x").
   PRIJE snimanja: kopija tvornickog firmvera (firmver_kopija\kopiraj_firmver_COM6.bat).
   Prije voznje: "cal" (robot rukom preko crte), provjera "dgr".
   ===================================================================== */

void RobotLine::lineFollow() {
	// ---------------- POSTAVKE (iste kao u simulatoru v06) ----------------
	const int   LINE_N      = 8;     // senzora na letvi (ref-can8)
	const float BRZINA      = 60;    // od 127
	const float KP          = 1.4;
	const float KD          = 5.0;
	const uint32_t RUPA_MS  = 1800;  // ms ravno bez crte
	const float RUB         = 25;    // |centar| iznad toga: crta je izasla u stranu
	const int   SIROKO      = LINE_N - 3;   // toliko crnih = raskrizje/kut
	const float KOSINA_ST   = 6;
	const float NIZBRDO_K   = 0.6, UZBRDO_K = 1.5;

	// ---------------- STANJE (pamti se izmedju poziva) ----------------
	enum Stanje { CRTA, RASKRIZJE, RAVNO, NATRAG_TRAZI, LIJEVO, DESNO, RUPA, TRAZENJE };
	static Stanje stanje = CRTA;
	static uint32_t t0 = 0, tf = 0, trazenje_kraj = 0;
	static float zadnja = 0, prosla = 0, h0 = 0, hOkret = 0;
	static int strana = 1, s = 1, ciklus = 0, faza = 1, korak = 0;
	static bool lijevoBilo = false, desnoBilo = false;

	uint32_t t = millis();
	if (setup()) { stanje = CRTA; t0 = t; zadnja = 0; prosla = 0; trazenje_kraj = 0; }

	auto promijeni = [&](Stanje novo) { stanje = novo; t0 = millis(); korak = 0; faza = 1; ciklus = 0; tf = t0; };
	auto kutRazlika = [](float a, float b) { float d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
	auto brojCrnih = [&]() { int n = 0; for (int i = 0; i < LINE_N; i++) if (line(i)) n++; return n; };
	auto crnoLijevo = [&]() { return line(LINE_N - 3) || line(LINE_N - 2) || line(LINE_N - 1); };
	auto crnoDesno  = [&]() { return line(0) || line(1) || line(2); };
	auto sredina    = [&]() { return line(LINE_N / 2 - 1) || line(LINE_N / 2); };
	auto nista      = [&]() { for (int i = 0; i < LINE_N; i++) if (line(i)) return false; return true; };
	// polozaj crte kao u simulatoru: ~mm, 0 = sredina letve, NEGATIVNO = crta desno (line(0) je desni rub)
	auto centar = [&]() {
		float z = 0; int n = 0;
		for (int i = 0; i < LINE_N; i++) if (line(i)) { z += i; n++; }
		if (n == 0) return 0.0f;
		return (z / n - (LINE_N - 1) / 2.0f) * 12.5f;
	};
	auto brzina = [&]() {
		float p = pitch();
		if (p > KOSINA_ST) return BRZINA * UZBRDO_K;
		if (p < -KOSINA_ST) return BRZINA * NIZBRDO_K;
		return BRZINA;
	};

	switch (stanje) {
	case CRTA: {                                            // 1) PD regulator
		int n = brojCrnih();
		if (n >= SIROKO || ((crnoLijevo() || crnoDesno()) && sredina() && n >= LINE_N - 4)) {
			lijevoBilo = crnoLijevo(); desnoBilo = crnoDesno();
			promijeni(RASKRIZJE); return;
		}
		if (nista()) {
			if (fabs(zadnja) > RUB || t - trazenje_kraj < 400) promijeni(TRAZENJE); else promijeni(RUPA);
			return;
		}
		float e = centar();
		float u = KP * e + KD * (e - prosla);
		prosla = e; zadnja = e;
		float b = brzina();
		go(b - u, b + u);
		break;
	}
	case RASKRIZJE:                                         // 2) kut ili raskrizje: polako ~5 cm naprijed
		if (t - t0 < 600) { go(BRZINA * 0.6, BRZINA * 0.6); return; }
		strana = lijevoBilo ? (desnoBilo ? 0 : -1) : 1;        // robot bez boje: nema oznaka -> uvijek "ravno"
		promijeni(RAVNO);
		break;
	case RAVNO:                                             // 3) ravno; ako ravno nema crte -> kut
		if (t - t0 < 150) { go(BRZINA * 0.8, BRZINA * 0.8); return; }
		if (sredina()) { prosla = centar(); promijeni(CRTA); return; }
		if (nista()) { hOkret = heading(); promijeni(strana == -1 ? LIJEVO : DESNO); korak = 2; return; }
		zadnja = (strana == 0 ? 1 : strana) * -40.0f;
		promijeni(NATRAG_TRAZI);
		break;
	case NATRAG_TRAZI:                                      // 4) malo natrag pa trazi na toj strani
		if (t - t0 < 500) { go(-BRZINA * 0.8, -BRZINA * 0.8); return; }
		promijeni(TRAZENJE);
		break;
	case LIJEVO: case DESNO: {                              // 5) okret na mjestu za kut od 90 st.
		int sm = (stanje == LIJEVO) ? -1 : 1;
		go(sm * 40, -sm * 40);
		float d = fabs(kutRazlika(heading(), hOkret));
		if (d > 65 && sredina()) { prosla = centar(); zadnja = prosla; promijeni(CRTA); return; }
		if (d > 130) { zadnja = -sm * 40.0f; promijeni(TRAZENJE); }
		break;
	}
	case RUPA:                                              // 6) ravno kroz rupu
		if (!nista()) { prosla = centar(); promijeni(CRTA); return; }
		if (t - t0 > RUPA_MS) { promijeni(TRAZENJE); return; }
		go(BRZINA, BRZINA);
		break;
	case TRAZENJE: {                                        // 7) +-60, pa +-110 st., izmedju 5 cm naprijed
		if (korak == 0) { h0 = heading(); s = zadnja < 0 ? 1 : -1; ciklus = 0; faza = 1; tf = t; korak = 1; }
		if (sredina()) { prosla = centar(); trazenje_kraj = t; promijeni(CRTA); return; }
		float A = (ciklus % 2 == 0) ? 60 : 110;
		if (faza == 4) {
			go(35, 35);
			if (t - tf > 650) { faza = 1; ciklus++; tf = t; h0 = heading(); }
			return;
		}
		float cilj = (faza == 1) ? s * A : (faza == 2 ? -s * A : 0);
		float h = h0 + cilj; while (h < 0) h += 360; while (h >= 360) h -= 360;
		float e = kutRazlika(h, heading());
		if (fabs(e) < 4 || t - tf > 4000) { faza++; tf = t; return; }
		if (e > 0) go(40, -40); else go(-40, 40);
		break;
	}
	}
}
