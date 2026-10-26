/* =====================================================================
   RescueLine, tema 1 - isti algoritam kao u simulatoru (program_v02.lua),
   napisan za Microline RobotLine (MRMS-Arduino-Sketches, MRMS_ESP32).
   (c) ForTroniQ d.o.o. - dr.sc. Tomislav Pavlic, Krunoslav Kusec, Alen Britvic

   Kako ugraditi: u mrm-robot-line.cpp zamijeni tijelo funkcije
   RobotLine::lineFollow() ovim kodom (pokrece se naredbom "lnf", stop "x").
   Prije voznje: naredba "cal" (kalibracija letve), provjera "pri".
   Brojeve u POSTAVKAMA prepisi iz simulatora kad ih tamo podesis.
   ===================================================================== */

void RobotLine::lineFollow() {
	// ---------------- POSTAVKE (iste kao u simulatoru) ----------------
	const float BRZINA      = 60;    // od 127 (TOP_SPEED: 7,4 V 90, 11,1 V 60)
	const float KP          = 1.4;
	const float KD          = 5.0;
	const uint32_t RUPA_MS  = 1000;
	const float RUB         = 30;
	const uint16_t PREPREKA_MM = 90;
	const float KOSINA_ST   = 6;
	const float NIZBRDO_K   = 0.6;
	const float UZBRDO_K    = 1.4;
	const int OBILAZAK      = 1;     // 1 = slijeva, -1 = zdesna
	const float LUK_VANJSKI = 1.00, LUK_UNUTARNJI = 0.45;

	// ---------------- STANJE (pamti se izmedju poziva) ----------------
	enum Stanje { CRTA, RUPA, TRAZENJE, PREPREKA };
	static Stanje stanje = CRTA;
	static uint32_t t0 = 0;              // pocetak stanja
	static float zadnja = 0, prosla = 0; // zadnji i prosli lineCenter
	static int smjer = 1, korak = 0;
	static uint32_t kraj = 0, trajanje = 0, tk = 0;
	static float smjer0 = 0;

	uint32_t t = millis();
	if (setup()) { stanje = CRTA; t0 = t; zadnja = 0; prosla = 0; }

	auto promijeni = [&](Stanje novo) { stanje = novo; t0 = millis(); korak = 0; };
	auto kutRazlika = [](float a, float b) { float d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

	// 2) prepreka ispred, samo na ravnom
	if (stanje == CRTA && front() < PREPREKA_MM && fabs(pitch()) < KOSINA_ST)
		promijeni(PREPREKA);

	switch (stanje) {
	case CRTA: {                                   // 3) PD regulator
		if (!lineAny()) {
			promijeni(fabs(zadnja) > RUB ? TRAZENJE : RUPA);
			return;
		}
		float e = lineCenter();                    // negativno = crta desno
		float u = KP * e + KD * (e - prosla);
		prosla = e; zadnja = e;
		float b = BRZINA;
		float p = pitch();
		if (p > KOSINA_ST) b = BRZINA * UZBRDO_K;
		else if (p < -KOSINA_ST) b = BRZINA * NIZBRDO_K;
		go(b - u, b + u);
		break;
	}
	case RUPA:                                     // 4) ravno kroz rupu
		if (lineAny()) { prosla = lineCenter(); promijeni(CRTA); return; }
		if (t - t0 > RUPA_MS) { promijeni(TRAZENJE); return; }
		go(BRZINA, BRZINA);
		break;
	case TRAZENJE:                                 // 5) okret lijevo-desno, sve sire
		if (korak == 0) { smjer = zadnja < 0 ? 1 : -1; trajanje = 700; kraj = t + 700; korak = 1; }
		if (line(3) || line(4) || line(5)) { prosla = lineCenter(); promijeni(CRTA); return; }
		if (t > kraj) { smjer = -smjer; trajanje *= 2; kraj = t + trajanje; }
		go(smjer * 45, -smjer * 45);
		break;
	case PREPREKA: {                               // 6) obilazak
		const int s = OBILAZAK;
		if (korak == 0) { korak = 1; smjer0 = heading(); }
		if (korak == 1) {
			go(-s * 45, s * 45);
			if (s * kutRazlika(heading(), smjer0) <= -85) { korak = 2; tk = t; }
		}
		else if (korak == 2) {
			if (s == 1) go(BRZINA * LUK_VANJSKI, BRZINA * LUK_UNUTARNJI);
			else go(BRZINA * LUK_UNUTARNJI, BRZINA * LUK_VANJSKI);
			if (t - tk > 1500 && lineAny()) { korak = 3; tk = t; }
		}
		else if (korak == 3) {
			go(BRZINA, BRZINA);
			if (t - tk > 250) korak = 4;
		}
		else {
			go(-s * 45, s * 45);
			if (line(4)) { prosla = lineCenter(); zadnja = prosla; promijeni(CRTA); }
		}
		break;
	}
	}
}
