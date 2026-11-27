// El tutorial: la primera vez que despiertas en el baño, siete pasos cortos que esperan a que hagas cada cosa
// (caminar, mirar, linterna, radio, plano, correr y actuar, salir). Enter lo salta. Sólo aparece en la primera vuelta
// de cada partida.
const PASOS = [
  { html: 'Camina con las <b>flechas</b> o con <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>. Cada tecla te lleva en esa dirección.',
    listo: (s) => s.camino > 1.5 },
  { html: 'Prueba caminar hacia un lado. La cámara se coloca sola detrás de ti.',
    listo: (s) => s.giro > 0.65 || s.t > 4 },
  { html: '<kbd>F</kbd> enciende la linterna. La luz frena a la sombra que te sigue, pero las pilas se gastan: hay más en la basura y en los autos.',
    listo: (s) => s.linterna },
  { html: 'La radio: <kbd>Z</kbd> y <kbd>X</kbd> (o la rueda) mueven el dial. Las rayitas rojas son emisoras: en <b>94.3</b> una voz te guía; en <b>31.7</b> se oyen las manchas.',
    listo: (s) => s.dial > 5 },
  { html: '<kbd>Tab</kbd> o <kbd>Q</kbd> abre el plano de la ciudad: ahí se anota lo que ves. Ábrelo y vuelve a cerrarlo.',
    listo: (s) => s.plano },
  { html: '<kbd>E</kbd> examina lo raro: cuando algo se puede tocar, abajo aparece <kbd>E</kbd> y lo que harías. Prueba en el muro de los urinarios. (<kbd>Shift</kbd> para correr.)',
    listo: (s) => s.accion || s.t > 12 },
  { html: 'Arriba está siempre tu <b>OBJETIVO</b>. Afuera verás <b>columnas de luz roja</b>: debajo de cada una hay una mancha. La flecha roja del minimapa te lleva. Sal del baño.',
    listo: (s) => s.afuera || s.t > 14 },
];

export function crearTutorial(audio) {
  const $ = (id) => document.getElementById(id);
  const caja = $('tutorial'), numero = $('tut-paso'), texto = $('tut-texto');
  let activo = false, k = 0, hecho = 0, s = null, antes = null;

  function mostrarPaso() {
    numero.textContent = `${k + 1}/${PASOS.length}`;
    texto.innerHTML = PASOS[k].html;
    caja.classList.remove('listo');
    s = { camino: 0, giro: 0, linterna: false, dial: 0, plano: false, accion: false, afuera: false, t: 0 };
  }

  function empezar() { activo = true; k = 0; hecho = 0; antes = null; caja.hidden = false; mostrarPaso(); }
  function terminar() { activo = false; caja.hidden = true; }
  function accion() { if (activo && s) s.accion = true; }
  function planoCerrado() { if (activo && s) s.plano = true; }   // lo abrió y lo cerró

  // d: { pos, yaw, linterna, dial, afuera }
  function actualizar(dt, d) {
    if (!activo) return;
    if (antes) {
      s.camino += Math.hypot(d.pos.x - antes.x, d.pos.z - antes.z);
      s.giro += Math.abs(d.yaw - antes.yaw);
      s.dial += Math.abs(d.dial - antes.dial);
    }
    antes = { x: d.pos.x, z: d.pos.z, yaw: d.yaw, dial: d.dial };
    s.t += dt;
    if (d.linterna) s.linterna = true;
    s.afuera = d.afuera;
    if (hecho > 0) {
      // marca de listo un momento y pasa al siguiente
      hecho -= dt;
      if (hecho <= 0) {
        k++;
        if (k >= PASOS.length) terminar(); else mostrarPaso();
      }
      return;
    }
    if (PASOS[k].listo(s)) { hecho = 0.8; caja.classList.add('listo'); audio.tecla(); }
  }

  return { empezar, terminar, actualizar, accion, planoCerrado, get activo() { return activo; } };
}
