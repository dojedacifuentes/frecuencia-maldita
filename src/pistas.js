// Las pistas: dicen con palabras dónde está una mancha («a dos cuadras al noreste de la plaza central») o hacia dónde
// queda desde donde estás. Las usan las viejas, el charco, la emisora de números y el objetivo de arriba.
const RUMBOS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const NUMEROS = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];
const CUADRA = 22;   // manzana + calle, en metros

// norte = -z
export function rumbo(dx, dz) {
  const a = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return RUMBOS[Math.round(((a + 360) % 360) / 45) % 8];
}
export function cuadras(d) {
  const n = Math.max(1, Math.round(d / CUADRA));
  return n === 1 ? 'una cuadra' : `${NUMEROS[n] || n} cuadras`;
}

export function crearPistas({ ciudad, siniestro }) {
  const s = ciudad.sitios;
  const hitos = [
    { nombre: 'la plaza central', pos: s.plazaCentro },
    { nombre: 'el baño de la plaza sur', pos: s.bano.centro },
    { nombre: 'los televisores', pos: siniestro.depurar.tvs[0].position },
    { nombre: 'la boca del muro', pos: siniestro.depurar.boca.position },
    { nombre: 'el portón R9', pos: s.porton.position },
    { nombre: 'la cabina de teléfono', pos: siniestro.telefono.pos },
    { nombre: 'el puente del canal', pos: { x: s.canal.puente.x, z: (s.canal.z0 + s.canal.z1) / 2 } },
    { nombre: 'el sitio eriazo', pos: s.eriazo },
    { nombre: 'la capilla', pos: s.capilla },
  ];
  const frecuencias = siniestro.frecuencias;

  function describir(p) {
    let mejor = null;
    for (const h of hitos) {
      const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
      if (!mejor || d < mejor.d) mejor = { h, d };
    }
    if (mejor.d < 9) return `junto a ${mejor.h.nombre}`;
    const de = mejor.h.nombre.startsWith('el ') ? `del ${mejor.h.nombre.slice(3)}` : `de ${mejor.h.nombre}`;
    return `a ${cuadras(mejor.d)} al ${rumbo(p.x - mejor.h.pos.x, p.z - mejor.h.pos.z)} ${de}`;
  }

  const pendientes = () => frecuencias.map((f, i) => ({ f, i })).filter((x) => !x.f.hallada);
  function masCercana(pj) {
    let mejor = null;
    for (const x of pendientes()) {
      const d = Math.hypot(x.f.pos.x - pj.x, x.f.pos.z - pj.z);
      if (!mejor || d < mejor.d) mejor = { ...x, d };
    }
    return mejor;   // { f, i, d } o null si ya están todas
  }
  // la siguiente que conviene contar: la primera que falta y que nadie ha revelado todavía
  function siguiente(revelada) {
    const p = pendientes();
    return p.find((x) => !revelada(x.i)) || p[0] || null;
  }
  function desde(pj, p) {
    const d = Math.hypot(p.x - pj.x, p.z - pj.z);
    return { rumbo: rumbo(p.x - pj.x, p.z - pj.z), cuadras: cuadras(d), d };
  }
  return { describir, masCercana, siguiente, desde };
}
