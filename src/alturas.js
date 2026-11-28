// Alturas: dónde se puede pisar en cada zona, para subir escaleras y cambiar de piso.
// La ciudad, la fiesta y el metro son planos (sin superficies registradas, el suelo está en 0).
//   piso:    { x0, x1, z0, z1, y }                    una losa horizontal
//   rampa:   { x0, x1, z0, z1, eje: 'x'|'z', y0, y1 } sube de y0 (en x0 o z0) a y1 (en x1 o z1): escaleras y cuestas
// Se pisa la superficie más alta que no quede más de un escalón por encima de los pies; si no hay ninguna, se cae.
const ESCALON = 0.55;

export function crearSuelo() {
  const zonas = {};

  function agregar(zona, s) { (zonas[zona] ||= []).push(s); return s; }

  function alturaEn(s, x, z) {
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) return null;
    if (s.y !== undefined) return s.y;
    const t = s.eje === 'x' ? (x - s.x0) / (s.x1 - s.x0) : (z - s.z0) / (s.z1 - s.z0);
    return s.y0 + (s.y1 - s.y0) * t;
  }

  // yPies: dónde están ahora los pies (para elegir entre pisos apilados)
  function altura(zona, x, z, yPies = 0) {
    const lista = zonas[zona];
    if (!lista) return 0;
    let mejor = null;
    for (const s of lista) {
      const h = alturaEn(s, x, z);
      if (h === null || h > yPies + ESCALON) continue;
      if (mejor === null || h > mejor) mejor = h;
    }
    return mejor ?? 0;
  }

  function tiene(zona) { return !!zonas[zona]; }

  return { agregar, altura, tiene, zonas };
}

// Una caja de choque sólo cuenta si se cruza con el cuerpo (de los pies a la cabeza). Sin y0/y1, cuenta siempre.
export function chocaEnAltura(c, yPies) {
  if (c.y0 === undefined) return true;
  return yPies + 1.7 > c.y0 && yPies + 0.25 < c.y1;
}
