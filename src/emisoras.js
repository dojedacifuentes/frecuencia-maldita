// Las emisoras: además de la estática y de 31.7 (la frecuencia muerta), en el dial hay voces. Una guía, otra lee
// noticias de ayer sobre el hombre del abrigo verde y otra dicta números: hacia dónde queda la mancha más cercana.
// Las frases salen escritas bajo el dial; el sonido es un murmullo de voz entre la estática.
export const FRECUENCIAS = [13.9, 31.7, 66.0, 77.3, 94.3, 101.7];

const GUIA = [
  'Si me oyes, despertaste otra vez en el baño.',
  'Las manchas sólo se oyen en 31.7. Ahí la señal te guía: mientras más fuerte, más cerca.',
  'Cuando estés frente a una mancha, tócala. Te va a contar algo.',
  'Tres manchas abren el portón de la fábrica R9, al norte.',
  'Las viejas que miran la pared saben dónde están las manchas. Tócales el hombro.',
  'El charco de la plaza central también sabe. Mírate en él.',
  'Si algo te sigue, alúmbralo con la linterna.',
  'En 66.0 alguien cuenta las cuadras. En 101.7 hablan de ti.',
];
const NOTICIAS = [
  'Noticias de ayer. Sigue desaparecido el hombre del abrigo verde.',
  'Fue visto por última vez entrando a los baños de la plaza sur, a las 03:17.',
  'La fábrica R9 cerró hace treinta años. Los vecinos dicen que la fiesta nunca terminó.',
  'Se recomienda no tocar a las mujeres que miran la pared.',
  'El servicio meteorológico anuncia niebla. Para siempre.',
  'Si usted es el hombre del abrigo verde: su familia ya no lo espera.',
];

export function crearEmisoras(audio) {
  const caja = document.getElementById('emisora');
  const nombre = caja.querySelector('.em-nombre'), linea = caja.querySelector('.em-linea');
  // numeros(): frases calculadas en el momento (hacia dónde queda la mancha más cercana)
  const ESTACIONES = [
    { f: 13.9, nombre: 'CANAL DE MANTENIMIENTO', lineas: (c) => [
      'R9. Protocolo de nacimiento. Sujeto 0317.',
      'Registro '+String((c.vueltas||0)+1).padStart(3,'0')+': memoria reconstruida.',
      'Las manchas son recuerdos, no llaves.',
      'Si encuentra una puerta sin edificio, crúcela. Anote la discontinuidad.',
    ] },
    { f: 77.3, nombre: 'ECO', lineas: (c) => [
      'El último registro contiene '+(c.pasos||0)+' pasos.',
      'Ha recuperado '+(c.halladas||0)+' de tres recuerdos.',
      'Si la voz de 94.3 le promete una salida, pregunte quién está hablando.',
      'La siguiente copia ya ha empezado a soñar.',
    ] },
    { f: 66.0, nombre: 'NÚMEROS', lineas: (c) => c.numeros() },
    { f: 94.3, nombre: 'LA VOZ', lineas: (c) => c.vueltas > 0 ? [...GUIA, 'No confíes en la voz de 77.3. No recuerda tu primera muerte.'] : GUIA },
    { f: 101.7, nombre: 'NOTICIAS DE AYER', lineas: () => NOTICIAS },
  ];
  let actual = null, k = 0, t = 0;

  function actualizar(dt, dial, contexto) {
    const est = ESTACIONES.find((e) => Math.abs(e.f - dial) < 0.45) || null;
    if (est !== actual) {
      actual = est; t = 99; k = 0;
      caja.hidden = !est;
      audio.voz(est ? 1 : 0);
      if (est) nombre.textContent = `FM ${est.f.toFixed(1)} · ${est.nombre}`;
    }
    if (!est) return null;
    t += dt;
    if (t > 5.5) {
      t = 0;
      const ls = est.lineas(contexto);
      linea.textContent = ls[k % ls.length];
      if(est.f===13.9 && k>=2) contexto.registrar?.('archivo');
      if(est.f===77.3 && k>=2) contexto.registrar?.('eco');
      k++;
    }
    return est;
  }

  function callar() { if (actual) { actual = null; caja.hidden = true; audio.voz(0); } }

  return { actualizar, callar };
}
