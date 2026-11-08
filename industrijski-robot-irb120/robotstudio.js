/* FORTRONIQ · Industrijski robot IRB 120 — RobotStudio: vježba „složi korake redom”. © ForTroniQ d.o.o. */
const KORACI = [
  'Složi stanicu: robot, virtualni kontroler, alat i obradak iz CAD-a',
  'Zadaj tooldata (TCP alata) i wobjdata (sustav obratka)',
  'Postavi točke i putanje (ručno ili AutoPath iz rubova CAD-a)',
  'Iz putanja napravi program u RAPID-u',
  'Pokreni simulaciju: sudari, doseg, vrijeme ciklusa',
  'Prenesi program na stvarni kontroler IRC5',
  'Prvi prolaz smanjenom brzinom i dotjerivanje točaka privjeskom',
  'Pokreni proizvodnju u automatskom načinu'
];
const $ = (id) => document.getElementById(id);
const el = $('rs-vjezba');
if (el) {
  const ponuda = $('rs-ponuda'), odabrano = $('rs-odabrano'), poruka = $('rs-poruka');
  let dalje = 0, greske = 0;
  const mijesaj = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  function kreni() {
    dalje = 0; greske = 0; odabrano.replaceChildren(); poruka.textContent = '';
    let red = mijesaj(KORACI.map((t, i) => i));
    if (red.every((v, i) => v === i)) red = red.reverse();
    ponuda.replaceChildren(...red.map((i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'gumb tanki rs-korak'; b.textContent = KORACI[i]; b.dataset.i = i;
      b.addEventListener('click', () => odaberi(b));
      return b;
    }));
  }
  function odaberi(b) {
    const i = +b.dataset.i;
    if (i === dalje) {
      const li = document.createElement('li'); li.textContent = KORACI[i]; odabrano.append(li);
      b.remove(); dalje++;
      poruka.textContent = dalje === KORACI.length
        ? 'Točno! Svih ' + KORACI.length + ' koraka je na mjestu' + (greske ? ' (pogrešnih klikova: ' + greske + ').' : ', bez ijedne pogreške.')
        : 'Dobro — korak ' + dalje + ' od ' + KORACI.length + '.';
    } else {
      greske++; b.classList.add('rs-krivo');
      poruka.textContent = 'To nije korak ' + (dalje + 1) + '. Razmisli: što mora postojati prije njega?';
      setTimeout(() => b.classList.remove('rs-krivo'), 900);
    }
  }
  $('rs-ponovo').addEventListener('click', kreni);
  kreni();
}
