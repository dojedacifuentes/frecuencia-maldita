// Los controles con sus teclas dibujadas. Una sola lista para la portada, la pausa (junto al plano) y la barra de abajo:
// cualquier elemento con data-controles="lista" o data-controles="fila" se llena con ella.
const CONTROLES = [
  { teclas: [['↑', '←', '↓', '→'], ['W', 'A', 'S', 'D']], que: 'caminar en la dirección que pulses. La cámara te sigue.', corto: 'caminar' },
  { teclas: [['ratón'], ['J', 'L']], que: 'mirar alrededor si quieres (clic en la imagen para usar el ratón)', corto: null },
  { teclas: [['R']], que: 'volver a mirar hacia donde apunta el personaje', corto: null },
  { teclas: [['Shift']], que: 'correr', corto: 'correr' },
  { teclas: [['F']], que: 'linterna (frena a la sombra; las pilas se gastan)', corto: 'linterna' },
  { teclas: [['Z', 'X'], ['rueda']], que: 'radio: busca 31.7', corto: 'radio' },
  { teclas: [['E']], que: 'examinar lo raro y recoger cosas (también orinar)', corto: 'examinar' },
  { teclas: [['Tab'], ['Q']], que: 'plano de la ciudad (pausa)', corto: 'plano' },
  { teclas: [['M']], que: 'silencio', corto: 'silencio' },
  { teclas: [['Enter']], que: 'saltar el tutorial', corto: null },
];

const kbd = (t) => `<kbd${t.length > 1 ? ' class="ancha"' : ''}>${t}</kbd>`;
const grupo = (g) => g.map(kbd).join('');

export function pintarControles() {
  for (const el of document.querySelectorAll('[data-controles]')) {
    if (el.dataset.controles === 'fila') {
      el.innerHTML = CONTROLES.filter((c) => c.corto)
        .map((c) => `<span>${grupo(c.teclas[0])} ${c.corto}</span>`).join('');
    } else {
      el.innerHTML = `<div class="ctl-titulo">CONTROLES</div>` + CONTROLES
        .map((c) => `<div class="ctl"><span class="ctl-teclas">${c.teclas.map(grupo).join('<i>o</i>')}</span><span class="ctl-que">${c.que}</span></div>`)
        .join('');
    }
  }
}
