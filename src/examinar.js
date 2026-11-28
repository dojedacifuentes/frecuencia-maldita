// Todo lo que se puede examinar con E, con sus textos. Las viejas y el charco revelan dónde está una mancha (queda
// anotada en el plano); los televisores, el teléfono y los afiches mandan a las emisoras; la basura guarda hojas de un
// diario que cuentan quién es el hombre del abrigo verde. Además: pilas (basura y autos), el casete (auto de la radio),
// la llave (la boca), la puerta con candado y la foto que hay detrás.
const DIARIO = [
  'Otra vez desperté en el baño de la plaza.\nMi reloj marcaba 03:17. El de la pared también.',
  'La radio estaba en la repisa del baño.\nNo es mía. Alguien le grabó un 31.7 en la tapa.',
  'Las manchas tienen mi forma.\nCada una se acuerda de algo que yo olvidé.',
  'Las viejas no miran la pared.\nEscuchan algo que hay detrás.',
  'La vi bajar del muro con un hombro torcido.\nSiguió caminando hasta que le apunté la linterna.',
  'Dicen que en la fábrica R9 hay una fiesta\ndesde hace treinta años. Nadie ha salido.',
  'Hoy vi a un hombre igual a mí\nentrando a la fábrica. Iba bailando.',
];
const AUTOS = [
  'En el asiento hay un abrigo verde\nigual al tuyo. Está mojado.',
  'El reloj del tablero marca 03:17.\nEl auto no tiene motor.',
  'Alguien escribió en el vidrio empañado,\ndesde adentro: «no salgas».',
  'La radio del auto está encendida en 94.3.\nUna voz dice tu nombre y se corta.',
  'Hay ratas en la guantera.\nUna lleva un diente.',
  'Las llaves están puestas.\nEl llavero dice R9.',
];
const AFICHES = [
  'SE BUSCA\nHombre, abrigo verde, fuma.\nVisto por última vez a las 03:17.',
  'FIESTA EN LA FÁBRICA R9\nEntrada: tres manchas.',
  'RADIO 94.3\nLa voz que te acompaña de noche.',
  '¿PERDISTE TU CARA?\nPregunta en la plaza central.',
  'SE ARRIENDA\nBaño público con vista a la plaza.',
  'RADIO 101.7 · NOTICIAS DE AYER\nTodo lo que ya pasó, otra vez.',
];
const BAILARINES = [
  'No tiene cara.\nLleva tu reloj: 03:17.',
  'Baila con los ojos cerrados.\nNo tiene ojos.',
  'Te ofrece un cigarro.\nEs el tuyo.',
  'Te dice al oído: «llegaste tarde».\nNo tiene boca.',
];

export function registrarCosas({ interaccion, ciudad, siniestro, detalles, fiesta, plano, pistas, audio, juego, estadoJuego, orinar,
  inventario, puerta }) {
  const lleva = inventario.lleva;
  const agregar = interaccion.agregar;
  const sit = ciudad.sitios;
  const fr = siniestro.frecuencias;

  // revela una mancha: la que nadie ha contado todavía; queda anotada en el plano
  function revelarSiguiente() {
    const x = pistas.siguiente(plano.revelada);
    if (!x) return null;
    plano.revelar(x.i);
    return { n: x.i + 1, donde: pistas.describir(x.f.pos) };
  }

  // La repisa queda junto a los urinarios, al alcance de la mano al despertar.
  const radio = sit.bano.radio;
  agregar({zona: 'ciudad', pos: radio.position, radio: 2, prioridad: 1, activo: () => !lleva.radio,
    etiqueta: 'recoger la radio', accion: () => {
      if (lleva.radio) return null;
      radio.visible = false;
      return inventario.dar('radio');
    }});

  // las tres manchas: con la radio en 31.7 se escuchan (y cuentan); sin ella, no suenan
  fr.forEach((f) => agregar({
    zona: 'ciudad', pos: f.pos, radio: 3.6, activo: () => !f.hallada && !f.propia,
    etiqueta: () => (juego.modo317 ? 'escuchar la mancha' : 'tocar la mancha'),
    accion: () => {
      if (!lleva.radio) return 'La mancha vibra. Dejé la radio en la repisa del baño.';
      if (!juego.modo317) { audio.tecla(); return 'Está tibia. Tiene tu forma, pero no suena.\nPon la radio en 31.7 (Z / X) y vuelve a tocarla.'; }
      f.hallada = true;
      estadoJuego.hallazgo(f.texto);
      return null;
    },
  }));

  // las viejas que miran la pared
  let fotoMostrada = false;
  for (const v of siniestro.depurar.viejas) {
    agregar({
      zona: 'ciudad', pos: () => (v.girada ? v.frente.position : v.espalda.position), radio: 2.6,
      activo: () => v.espalda.visible || v.frente.visible,
      etiqueta: () => (v.girada ? 'mirarla a la cara' : lleva.foto && !fotoMostrada ? 'mostrarle la foto' : 'tocarle el hombro'),
      accion: () => {
        if (v.girada) { estadoJuego.susto(0.7); return 'No tiene cara.\nSigue murmurando tu nombre.'; }
        if (lleva.foto && !fotoMostrada) {
          fotoMostrada = true;
          fr.forEach((f, i) => { if (!f.hallada) plano.revelar(i); });
          audio.latido(0.8);
          return 'Mira la foto mucho rato, sin darse vuelta.\n«Ese eres tú. Antes de la fábrica».\nTe marca en el plano todas las manchas que faltan.';
        }
        const r = revelarSiguiente();
        audio.chirrido();
        if (!r) return 'Murmura contra la pared:\n«El portón ya te espera. Al norte».';
        return `Murmura contra la pared:\n«La mancha ${r.n} está ${r.donde}».\n(Quedó anotada en el plano: Tab)`;
      },
    });
  }

  // el charco que es un ojo
  agregar({
    zona: 'ciudad', pos: siniestro.ojo.position, radio: 4.2, etiqueta: 'mirarte en el charco',
    accion: () => {
      const r = revelarSiguiente();
      audio.latido(0.6);
      if (!r) return 'En el agua no sale tu cara.\nSale el portón R9, abierto.';
      return `En el agua no sale tu cara.\nSale un muro con una mancha, ${r.donde}.\n(Quedó anotada en el plano: Tab)`;
    },
  });

  // los televisores de la vitrina
  let casetePuesto = false;
  agregar({
    zona: 'ciudad', pos: siniestro.depurar.tvs[0].position, radio: 4.0,
    etiqueta: () => (lleva.casete && !casetePuesto ? 'poner el casete' : 'mirar los televisores'),
    accion: () => {
      if (lleva.casete && !casetePuesto) {
        casetePuesto = true; lleva.casete = false;   // queda en la vitrina
        const r = revelarSiguiente();
        audio.chirrido();
        return 'En todas las pantallas: un niño en este mismo baño,\nmeando en el muro. Eres tú.\n'
          + (r ? `Al final se ve un muro: la mancha ${r.n}, ${r.donde}. (En el plano)` : 'Al final se ve el portón R9, abierto.');
      }
      return 'Te ves de espaldas, en vivo.\nEn la vitrina hay una radio vieja\nsintonizada en 94.3.';
    },
  });

  // la boca del muro
  agregar({
    zona: 'ciudad', pos: siniestro.depurar.boca.position, radio: 3.4, etiqueta: 'meter la mano en la boca',
    accion: () => {
      estadoJuego.susto(0.8);
      if (!lleva.llave && !puerta.estado.abierta) {
        return `Muerde despacio. No duele.\nAl soltarte, escupe una llave oxidada.\n${inventario.dar('llave')}`;
      }
      return 'Muerde despacio. No duele.\nAl soltarte, escupe un papel:\n«tres manchas abren el R9».';
    },
  });

  // el teléfono que suena
  agregar({
    zona: 'ciudad', pos: siniestro.telefono.pos, radio: 2.6,
    etiqueta: () => (siniestro.telefono.sonando ? 'contestar el teléfono' : 'levantar el auricular'),
    accion: () => {
      if (siniestro.contestar(siniestro.telefono.pos)) {
        audio.golpe(0.6);
        return 'Contesté. Era mi propia voz.\nDijo «sesenta y seis punto cero»\ny colgó.';
      }
      return 'Sólo se oye la estática.\nY alguien que respira igual que tú.';
    },
  });

  // la puerta con candado, frente a la plaza central
  agregar({
    zona: 'ciudad', pos: puerta.pos, radio: 2.6,
    etiqueta: () => (puerta.estado.abierta ? 'mirar adentro' : lleva.llave ? 'abrir el candado con la llave' : 'revisar la puerta'),
    accion: () => {
      if (puerta.estado.abierta) return 'Radios encendidas en el suelo, todas en 31.7.\nYa no hay nada más.';
      if (!lleva.llave) { audio.golpe(0.3); return 'Tiene un candado nuevo,\nen una ciudad donde todo está podrido.\nNecesitas una llave.'; }
      lleva.llave = false;
      puerta.abrir();
      audio.rechinar();
      return `Adentro, cientos de radios encendidas, todas en 31.7.\nSobre una silla hay una foto.\n${inventario.dar('foto')}`;
    },
  });

  // el portón R9 cerrado
  agregar({
    zona: 'ciudad', pos: { x: sit.porton.position.x, z: sit.porton.position.z + 1.5 }, radio: 4.5,
    activo: () => !juego.porton, etiqueta: 'empujar el portón',
    accion: () => {
      audio.golpe(0.4);
      const faltan = 3 - juego.halladas;
      return `Cerrado con cadena. Detrás suena música.\nFaltan ${faltan} mancha${faltan === 1 ? '' : 's'} para que se abra.`;
    },
  });

  // orinar en el baño (en la calle también se puede, sin aviso)
  agregar({
    zona: 'ciudad', pos: { x: sit.bano.centro.x, z: sit.bano.muroSur - 0.6 }, radio: 1.8, etiqueta: 'orinar en el muro',
    accion: () => (orinar() ? (juego.vueltas === 0 ? 'Llevo años meando en este muro.\nEl muro se acuerda de mí.' : 'El muro ya sabe mi nombre.') : null),
  });

  // la basura: ratas y hojas del diario
  let hoja = 0, buscadas = 0;
  ciudad.basuras.forEach((b) => {
    let usada = false;
    agregar({
      zona: 'ciudad', pos: b, radio: 2.2, activo: () => !usada, etiqueta: 'revolver la basura',
      accion: () => {
        usada = true;
        audio.chillidos(b, 4);
        const pilas = buscadas++ % 2 === 0 ? `\n${inventario.dar('pilas')}` : '';
        if (hoja < DIARIO.length) return `Salen ratas. Abajo hay una hoja de diario:\n«${DIARIO[hoja++]}»${pilas}`;
        return `Salen ratas.${pilas || ' No queda nada más.'}`;
      },
    });
  });

  // autos abandonados
  detalles.autos.forEach((a, i) => {
    let lleno = i === 0 || i === 6 ? 'pilas' : i === 3 ? 'casete' : null;
    agregar({
      zona: 'ciudad', pos: a, radio: 3.0, etiqueta: 'mirar dentro del auto',
      accion: () => {
        const texto = AUTOS[i % AUTOS.length];
        if (!lleno) return texto;
        const id = lleno; lleno = null;
        const hallazgo = id === 'casete' ? 'Adentro de la radio hay un casete.' : 'En la guantera hay pilas.';
        return `${texto}\n${hallazgo}\n${inventario.dar(id)}`;
      },
    });
  });

  // afiches pegados en los muros
  detalles.afiches.forEach((a, i) => agregar({
    zona: 'ciudad', pos: a, radio: 1.8, etiqueta: 'leer el afiche', accion: () => AFICHES[i % AFICHES.length],
  }));

  // en la fiesta: los que bailan sin cara
  fiesta.depurar.bailarines.forEach((b, i) => agregar({
    zona: 'fiesta', pos: b.m.position, radio: 2.0, etiqueta: 'mirarle la cara',
    accion: () => { estadoJuego.susto(0.5); return BAILARINES[i % BAILARINES.length]; },
  }));
}
