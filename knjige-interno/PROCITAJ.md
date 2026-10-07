# knjige-interno — šifrirane web inačice knjiga (doslovno)

- Osnove mobilnih robota (OMR) → `osnove-mobilnih-robota/index.html`
- Osnove programiranja industrijskih robotskih sustava (OPIRS) → `osnove-programiranja-industrijskih-robotskih-sustava/index.html`
- Industrijska robotika, priručnik (IR) → `industrijska-robotika-prirucnik/index.html`
- Pametno održavanje (PO) → `pametno-odrzavanje/index.html`
- SolidWorks (SW) → `solidworks/index.html`
- Upravljanje 3D printerom (U3D) → `upravljanje-3d-printerom/index.html`

Šifrirano StatiCryptom 3.5.4 (AES-256, PBKDF2), jedna šifra za sve knjige, zajednička sol
`d102f5e87f9fd46dfed416619730d1d5` — kad se šifrira nova knjiga, ista sol i ista šifra, pa „Zapamti me 30 dana"
otključava sve knjige odjednom. Svaka stranica ima `noindex, nofollow, noarchive`.

Objava: GitHub Desktop → Commit → Push (jedna mapa = jedan commit). NE dodavati u `sitemap.xml` i NE povezivati ni s jedne stranice DOS-a.
Adrese: https://dos.fortroniq.hr/knjige-interno/<mapa>/
Šifra NIJE u ovoj mapi (repozitorij je javan) — stoji u projektu, dokument `claude/stanje-knjige-doslovno.md`.
