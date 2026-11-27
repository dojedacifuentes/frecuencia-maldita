// Examinar con E: cada cosa rara de la ciudad y de la fiesta se puede tocar, mirar o leer. Cuando hay una cerca y
// delante, abajo aparece «E · mirar el charco»; al pulsar E responde con un texto (a veces una pista, a veces un susto).
//   agregar({ zona, pos, radio, etiqueta, accion, activo })
//     pos: {x, z} o función que lo da (para lo que se mueve) · etiqueta: texto o función · accion(): devuelve el texto
//     que se escribe (o nada) · activo(): si hoy se puede usar
export function crearInteraccion(hud) {
  const aviso = document.getElementById('accion');
  const cosas = [];
  let elegida = null, mostrado = '';

  function agregar(c) { cosas.push({ radio: 2.4, activo: () => true, ...c }); }

  const valor = (v) => (typeof v === 'function' ? v() : v);

  function actualizar(jugador, zona, jugando) {
    elegida = null;
    if (jugando) {
      const z = zona === 'pasillos' ? 'fiesta' : zona;
      const p = jugador.pos, fx = Math.sin(jugador.rumbo), fz = Math.cos(jugador.rumbo);
      let mejor = Infinity, prioridad = -Infinity;
      for (const c of cosas) {
        if (c.zona !== z || !c.activo()) continue;
        const q = valor(c.pos);
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
        if (d > c.radio) continue;
        // si no está encima, tiene que quedar más o menos delante
        if (d > 1.1 && (dx * fx + dz * fz) / d < 0.15) continue;
        const nivel = c.prioridad ?? 0;
        if (nivel > prioridad || (nivel === prioridad && d < mejor)) { prioridad = nivel; mejor = d; elegida = c; }
      }
    }
    const texto = elegida ? valor(elegida.etiqueta) : '';
    if (texto !== mostrado) {
      mostrado = texto;
      aviso.hidden = !texto;
      if (texto) aviso.innerHTML = `<kbd>E</kbd> ${texto}`;
    }
  }

  // devuelve true si había algo que examinar
  function usar() {
    if (!elegida) return false;
    const r = elegida.accion();
    if (r) { hud.limpiar(); hud.decir(r, 4 + r.length / 40); }
    return true;
  }

  return { agregar, actualizar, usar, get hay() { return !!elegida; } };
}
