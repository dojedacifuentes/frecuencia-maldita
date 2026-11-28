// El cerro y el Sanatorio de la Pendiente por fuera (28-nov). Se llega por la boca del muro este de la ciudad.
// Abajo, una placita con el ascensor (un funicular sin operador). Arriba se sube por 137 peldaños, en cuatro tramos
// entre casas de calamina colgadas del cerro, o en el ascensor. En lo alto, el patio del sanatorio: garita, cancha
// con líneas equivocadas, antenas y la fachada (imagen de Flow). Es una zona aparte, como el metro.
// Sustos: pasos que suben detrás de ti al mismo ritmo, alguien que te mira desde abajo y el pasajero del ascensor.
import * as THREE from 'three';
import { material, textura } from './ps1.js';
import { crearLote } from './lote.js';
import { crearTestigo } from './monstruos.js';
import { azar } from './ciudad.js';

export const CO = new THREE.Vector3(-300, 0, -300);
export const ALTO_CERRO = 18;
// tramos (rampas) y descansos, relativos a CO; el norte (−z) es cuesta arriba. ya: altura en z0; yb: en z1
const TRAMOS = [
  { x0: -1.6, x1: 1.6, z0: 14, z1: 26, ya: 4.5, yb: 0 },
  { x0: -1.6, x1: 1.6, z0: -3, z1: 9, ya: 9, yb: 4.5 },
  { x0: 4.4, x1: 7.6, z0: -20, z1: -8, ya: 13.5, yb: 9 },
  { x0: -1.6, x1: 1.6, z0: -37, z1: -25, ya: 18, yb: 13.5 },
];
const DESCANSOS = [
  { x0: -1.6, x1: 6, z0: 9, z1: 14, y: 4.5 },
  { x0: -1.6, x1: 7.6, z0: -8, z1: -3, y: 9 },
  { x0: -1.6, x1: 7.6, z0: -25, z1: -20, y: 13.5 },
];
const PLAZA = { x0: -16, x1: 10, z0: 26, z1: 41, y: 0 };
const PATIO = { x0: -28, x1: 28, z0: -84, z1: -37, y: ALTO_CERRO };
const CORREDOR = { x0: -16, x1: -8.6, z0: -37, z1: 26 };   // las vías del ascensor
const FUN = { x: -11, zAbajo: 29.5, zArriba: -40, gemelo: -14 };
const FACHADA_Z = -64;
// los bordes de la escalera: muro de un lado y casas del otro. eje: qué coordenada es fija; n: hacia dónde quedan las casas
const BORDES = [
  { x: -1.6, a: 14, b: 26, n: -1 }, { x: 1.6, a: 14, b: 26, n: 1 },
  { x: -1.6, a: 9, b: 14, n: -1 }, { x: 6, a: 9, b: 14, n: 1, mirador: true }, { z: 9, a: 1.6, b: 6, n: -1 }, { z: 14, a: 1.6, b: 6, n: 1 },
  { x: -1.6, a: -3, b: 9, n: -1 }, { x: 1.6, a: -3, b: 9, n: 1 },
  { x: -1.6, a: -8, b: -3, n: -1 }, { x: 7.6, a: -8, b: -3, n: 1 }, { z: -3, a: 1.6, b: 7.6, n: 1 }, { z: -8, a: -1.6, b: 4.4, n: -1 },
  { x: 4.4, a: -20, b: -8, n: -1 }, { x: 7.6, a: -20, b: -8, n: 1 },
  { x: -1.6, a: -25, b: -20, n: -1 }, { x: 7.6, a: -25, b: -20, n: 1 }, { z: -20, a: -1.6, b: 4.4, n: 1 }, { z: -25, a: 1.6, b: 7.6, n: -1 },
  { x: -1.6, a: -37, b: -25, n: -1 }, { x: 1.6, a: -37, b: -25, n: 1 },
  { z: 26, a: -8.6, b: -1.6, n: -1 }, { z: 26, a: 1.6, b: 10, n: -1 },
];
// por dónde se sube (para la flecha)
const CAMINO = [[0, 26], [0, 14], [0, 9], [0, -3], [6, -5.5], [6, -8], [6, -20], [0, -22.5], [0, -25], [0, -37], [0, FACHADA_Z + 1.5]];

function terreno(z) {
  if (z >= 26) return 0;
  if (z >= 14) return (26 - z) / 12 * 4.5;
  if (z >= 9) return 4.5;
  if (z >= -3) return 4.5 + (9 - z) / 12 * 4.5;
  if (z >= -8) return 9;
  if (z >= -20) return 9 + (-8 - z) / 12 * 4.5;
  if (z >= -25) return 13.5;
  if (z >= -37) return 13.5 + (-25 - z) / 12 * 4.5;
  return ALTO_CERRO;
}
const yFun = (z) => (z >= 26 ? 0 : z <= -37 ? ALTO_CERRO : (26 - z) / 63 * ALTO_CERRO);

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
const cartel = (lineas, w, h, fondo, tinta, tam) => lienzo(w, h, (g) => {
  g.fillStyle = fondo; g.fillRect(0, 0, w, h); g.fillStyle = tinta; g.textAlign = 'center';
  g.font = `bold ${tam}px "Courier New", monospace`;
  lineas.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lineas.length - 1) / 2) * tam * 1.15 + tam * 0.35));
});

export function crearCerro(escena, suelo) {
  const Z = 'cerro';
  const grupo = new THREE.Group(); grupo.position.copy(CO); escena.add(grupo);
  const col = [];
  const bloquear = (x0, x1, z0, z1, extra = {}) => { const c = { x0: CO.x + Math.min(x0, x1), x1: CO.x + Math.max(x0, x1), z0: CO.z + Math.min(z0, z1), z1: CO.z + Math.max(z0, z1), ...extra }; col.push(c); return c; };
  const A = (x, z) => ({ x: CO.x + x, z: CO.z + z });
  const r = azar(1370317);

  // ---------- dónde se pisa
  for (const t of TRAMOS) suelo.agregar(Z, { x0: CO.x + t.x0, x1: CO.x + t.x1, z0: CO.z + t.z0, z1: CO.z + t.z1, eje: 'z', y0: t.ya, y1: t.yb });
  for (const d of [...DESCANSOS, PLAZA, PATIO]) suelo.agregar(Z, { x0: CO.x + d.x0, x1: CO.x + d.x1, z0: CO.z + d.z0, z1: CO.z + d.z1, y: d.y });

  const lote = crearLote();
  const concreto = material('t_concreto', [1, 1], { vertexColors: true });
  const calamina = material('t_calamina', [1, 1], { vertexColors: true });
  const oxido = material('t_oxido', [1, 1], { vertexColors: true });
  const vereda = material('t_vereda', [1, 1], { vertexColors: true });
  const vidrioLuz = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const vidrioOscuro = new THREE.MeshBasicMaterial({ vertexColors: true });

  // ---------- los 137 peldaños (macizos hasta el suelo) y los descansos
  let peldanos = 0;
  for (const t of TRAMOS) {
    const n = t === TRAMOS[3] ? 35 : 34, largo = t.z1 - t.z0, ancho = t.x1 - t.x0, cx = (t.x0 + t.x1) / 2;
    for (let k = 0; k < n; k++) {
      const zc = t.z1 - (k + 0.5) * largo / n, alto = t.yb + (k + 1) * (t.ya - t.yb) / n;
      lote.caja(concreto, ancho, alto, largo / n + 0.01, cx, alto / 2, zc, { tile: 1.5, color: k % 9 === 4 ? 0x8a8478 : 0xa8a294 });
      peldanos++;
    }
  }
  for (const d of DESCANSOS) lote.caja(vereda, d.x1 - d.x0, d.y, d.z1 - d.z0, (d.x0 + d.x1) / 2, d.y / 2, (d.z0 + d.z1) / 2, { tile: 1.2, color: 0xb0aa9c });
  lote.caja(vereda, PLAZA.x1 - PLAZA.x0, 0.14, PLAZA.z1 - PLAZA.z0, (PLAZA.x0 + PLAZA.x1) / 2, 0.07, (PLAZA.z0 + PLAZA.z1) / 2, { tile: 1.6, color: 0xa09a8c });
  lote.caja(concreto, PATIO.x1 - PATIO.x0, ALTO_CERRO, PATIO.z1 - PATIO.z0, 0, ALTO_CERRO / 2, (PATIO.z0 + PATIO.z1) / 2, { tile: 3, color: 0x8a8678 });

  // ---------- casas de calamina a los lados de la escalera, apoyadas en muros de contención
  const COLORES = [0xd8c27a, 0x7fa6c8, 0xc86a5a, 0x9ac08a, 0xd89a5a, 0xb08ac8, 0xe0e0d0, 0x6a8aa8, 0xc8b0a0];
  const casas = [];
  function casa(x0, x1, z0, z1, frente) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const base = Math.min(terreno(z0), terreno(z1), terreno(cz));
    const alto = 2.8 + r() * 3.6, color = COLORES[Math.floor(r() * COLORES.length)];
    if (base > 0.05) lote.caja(concreto, w, base, d, cx, base / 2, cz, { tile: 2.5, color: 0x8c887c });
    lote.caja(calamina, w - 0.1, alto, d - 0.1, cx, base + alto / 2, cz, { tile: 2.2, color });
    // techo inclinado (de una o dos aguas): así el cerro no parece de cubos
    const agua = r() < 0.5;
    if (agua) lote.caja(oxido, w + 0.5, 0.12, d + 0.5, cx, base + alto + 0.35, cz, { tile: 2, color: 0x9a8a7a, rz: (r() - 0.5) * 0.5, rx: (r() - 0.5) * 0.3 });
    else for (const s of [-1, 1]) lote.caja(oxido, w / 2 + 0.35, 0.1, d + 0.4, cx + s * w / 4, base + alto + 0.45, cz, { tile: 2, color: 0x8a7a6a, rz: -s * 0.42 });
    // ventanas y puerta hacia la escalera
    if (frente) {
      const [fx, fz] = frente, ry = Math.atan2(fx, fz), largoFrente = fx ? d : w;
      const px = cx + fx * (w / 2 + 0.01), pz = cz + fz * (d / 2 + 0.01);
      const lado = (o) => [px + (fz ? o : 0), pz + (fx ? o : 0)];
      for (let k = 0; k < (largoFrente > 3 ? 2 : 1); k++) {
        const o = (k - (largoFrente > 3 ? 0.5 : 0)) * 1.3, [wx, wz] = lado(o), luz = r() < 0.35;
        lote.plano(luz ? vidrioLuz : vidrioOscuro, 0.7, 0.8, wx, base + alto * 0.62, wz, { ry, color: luz ? [0xffc070, 0xffa850, 0xb0d0ff][Math.floor(r() * 3)] : 0x14161a });
      }
      if (r() < 0.5) { const [dx, dz] = lado(-largoFrente / 2 + 0.7); lote.plano(vidrioOscuro, 0.8, 1.8, dx, base + 0.9, dz, { ry, color: 0x2a2018 }); }
    }
    bloquear(x0, x1, z0, z1);
    casas.push({ cx, cz, base, alto });
  }
  // una fila de casas pegada a cada borde (y un muro con baranda en el mirador)
  for (const b of BORDES) {
    if (b.x !== undefined) {
      bloquear(b.x, b.x + b.n * 0.3, b.a, b.b);
      if (b.mirador) {
        for (let z = b.a; z < b.b; z += 1.2) lote.caja(oxido, 0.06, 1.0, 0.06, b.x + 0.1, terreno(z) + 0.5, z, { color: 0x6a5a4a });
        lote.caja(oxido, 0.08, 0.08, b.b - b.a, b.x + 0.1, terreno(b.a) + 1.0, (b.a + b.b) / 2, { color: 0x6a5a4a });
        continue;
      }
      let z = b.a;
      while (z < b.b - 0.6) {
        const l = Math.min(b.b - z, 2.6 + r() * 1.6), prof = 3 + r() * 1.8;
        const x0 = b.n < 0 ? b.x - 0.15 - prof : b.x + 0.15, x1 = b.n < 0 ? b.x - 0.15 : b.x + 0.15 + prof;
        casa(x0, x1, z, z + l, [-b.n, 0]);
        z += l;
      }
    } else {
      bloquear(b.a, b.b, b.z, b.z + b.n * 0.3);
      let x = b.a;
      while (x < b.b - 0.6) {
        const l = Math.min(b.b - x, 2.6 + r() * 1.6), prof = 3 + r() * 1.8;
        const z0 = b.n < 0 ? b.z - 0.15 - prof : b.z + 0.15, z1 = b.n < 0 ? b.z - 0.15 : b.z + 0.15 + prof;
        casa(x, x + l, z0, z1, [0, -b.n]);
        x += l;
      }
    }
  }
  // más casas detrás (relleno del cerro, sin tocar la escalera ni las vías)
  const VISTA = { x0: 6, x1: 24, z0: 5, z1: 18 };   // delante del mirador no se construye
  const ocupado = [PLAZA, ...TRAMOS, ...DESCANSOS, PATIO, CORREDOR, VISTA];
  const cruza = (x0, x1, z0, z1) => ocupado.some((w) => x0 < w.x1 + 0.4 && x1 > w.x0 - 0.4 && z0 < w.z1 + 0.4 && z1 > w.z0 - 0.4);
  for (let x0 = -8.6; x0 < 22; x0 += 3.4) for (let z0 = -37; z0 < 26; z0 += 3.5) {
    const x1 = x0 + 3.2, z1 = z0 + 3.3;
    if ((Math.round(x0 / 3.4) + Math.round(z0 / 3.5)) % 2 !== 0) continue;   // menos relleno: una sí, una no
    if (cruza(x0, x1, z0, z1) || casas.some((c) => Math.abs(c.cx - (x0 + x1) / 2) < 2.2 && Math.abs(c.cz - (z0 + z1) / 2) < 2.2)) continue;
    casa(x0 + r() * 0.3, x1 - r() * 0.3, z0 + r() * 0.3, z1, null);
  }
  // el resto del cerro: bloques oscuros escalonados a los lados
  for (let z = -37; z < 26; z += 4) {
    const h = terreno(z + 2) + 7 + r() * 5;
    lote.caja(concreto, 20, h, 4.1, -27, h / 2, z + 2, { tile: 4, color: 0x3a4038 });
    lote.caja(concreto, 16, h * 0.8, 4.1, 32, h * 0.4, z + 2, { tile: 4, color: 0x3a4038 });
  }

  // ---------- ropa colgada cruzando la escalera
  const tela = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  for (const z of [20, 4, -14, -31]) {
    const y = terreno(z) + 3.4, x0 = z === -14 ? 4.2 : -1.8, x1 = z === -14 ? 7.8 : 1.8;
    lote.caja(oxido, x1 - x0, 0.02, 0.02, (x0 + x1) / 2, y, z, { color: 0x222222 });
    for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.5) lote.plano(tela, 0.35, 0.5 + r() * 0.3, x, y - 0.3, z, { color: COLORES[Math.floor(r() * COLORES.length)] });
  }

  // ---------- el letrero al pie de la escalera
  const letrero = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshBasicMaterial({
    map: cartel(['SANATORIO DE LA PENDIENTE', '↑ 137 PELDAÑOS', 'ASCENSOR ←'], 256, 96, '#1e2a1e', '#e0dcc8', 17) }));
  letrero.position.set(2.6, 2.4, 26.4); grupo.add(letrero);
  lote.caja(oxido, 0.1, 2.4, 0.1, 1.3, 1.2, 26.35, { color: 0x555555 }); lote.caja(oxido, 0.1, 2.4, 0.1, 3.9, 1.2, 26.35, { color: 0x555555 });

  // ---------- los muros de la placita y del patio
  bloquear(-17, -16, 26, 42); bloquear(10, 11, 26, 42); bloquear(-17, 11, 41, 42);
  for (const [x0, x1] of [[-17, -16], [10, 11]]) lote.caja(concreto, 1, 3, 16, (x0 + x1) / 2, 1.5, 34, { tile: 2.5, color: 0x7a766c });
  lote.caja(concreto, 28, 3, 1, -3, 1.5, 41.5, { tile: 2.5, color: 0x7a766c });
  const corredor = bloquear(CORREDOR.x0, CORREDOR.x1, CORREDOR.z0, CORREDOR.z1);
  bloquear(-29, -28, -85, -37); bloquear(28, 29, -85, -37); bloquear(-29, 29, -85, -84);
  bloquear(-28, -16, -37.3, -36.8); bloquear(14, 28, -37.3, -36.8);
  for (const [x0, x1] of [[-28, -16], [14, 28]]) {
    for (let x = x0; x <= x1; x += 1.3) lote.caja(oxido, 0.06, 1.0, 0.06, x, ALTO_CERRO + 0.5, -37.05, { color: 0x6a5a4a });
    lote.caja(oxido, x1 - x0, 0.08, 0.08, (x0 + x1) / 2, ALTO_CERRO + 1.0, -37.05, { color: 0x6a5a4a });
  }

  // ---------- el ascensor: rampa de vías, estaciones y dos carros (el tuyo y el gemelo que baja)
  const L = Math.hypot(63, ALTO_CERRO), ang = Math.atan2(ALTO_CERRO, 63);
  lote.caja(concreto, CORREDOR.x1 - CORREDOR.x0, 0.6, L, (CORREDOR.x0 + CORREDOR.x1) / 2, ALTO_CERRO / 2 - 0.3, -5.5, { tile: 3, color: 0x6a6658, rx: ang });
  for (let z = -37; z < 26; z += 3.5) { const h = yFun(z + 1.75) - 0.3; if (h > 0.2) lote.caja(concreto, 7.4, h, 3.6, (CORREDOR.x0 + CORREDOR.x1) / 2, h / 2, z + 1.75, { tile: 3, color: 0x5a5648 }); }
  for (const xv of [FUN.x - 0.6, FUN.x + 0.6, FUN.gemelo - 0.6, FUN.gemelo + 0.6]) lote.caja(oxido, 0.1, 0.12, L, xv, ALTO_CERRO / 2 + 0.06, -5.5, { color: 0x4a3a30, rx: ang });
  for (let z = -35; z < 25; z += 1.4) { const y = yFun(z) + 0.02; lote.caja(oxido, 4.4, 0.08, 0.25, (FUN.x + FUN.gemelo) / 2, y, z, { color: 0x3a2a20 }); }
  // estaciones: casetas abajo y arriba
  for (const [z, y, texto] of [[33.5, 0, 'ASCENSOR PENDIENTE'], [-43, ALTO_CERRO, 'ESTACIÓN ALTA']]) {
    lote.caja(calamina, 8, 3.4, 0.3, (FUN.x + FUN.gemelo) / 2, y + 1.7, z + (z > 0 ? 1.5 : -1.5), { tile: 2, color: 0xc8b878 });
    const c = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.6), new THREE.MeshBasicMaterial({ map: cartel([texto], 256, 40, '#2a1a10', '#ffd890', 22), fog: false }));
    c.position.set((FUN.x + FUN.gemelo) / 2, y + 3.0, z + (z > 0 ? 1.3 : -1.3)); c.rotation.y = z > 0 ? Math.PI : 0; grupo.add(c);
  }
  function carro(conAbrigos) {
    const g = new THREE.Group(); grupo.add(g);
    const madera = material('t_puerta', [1, 1], { color: 0xb09878 });
    const caja = (w, h, d, x, y, z, m = madera) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); g.add(q); return q; };
    caja(2.3, 0.2, 3.6, 0, 0.1, 0);
    caja(2.3, 0.2, 3.6, 0, 2.6, 0, material('t_oxido', [1, 1], { color: 0x8a5a3a }));
    for (const s of [-1, 1]) { caja(2.3, 0.9, 0.12, 0, 0.55, s * 1.75); caja(0.12, 0.9, 3.6, s * 1.1, 0.55, 0); caja(0.12, 1.8, 0.12, s * 1.1, 1.6, 1.75); caja(0.12, 1.8, 0.12, s * 1.1, 1.6, -1.75); }
    caja(0.5, 0.45, 3.0, -0.85, 0.42, 0); caja(0.5, 0.45, 3.0, 0.85, 0.42, 0);   // bancas
    const foco = caja(0.25, 0.1, 0.25, 0, 2.45, 0, new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
    if (conAbrigos) for (let k = 0; k < 6; k++) {
      const a = caja(0.42, 1.0, 0.22, (k % 2 ? 0.45 : -0.45), 1.85, -1.3 + k * 0.5, new THREE.MeshLambertMaterial({ color: 0x3a4a2e }));
      a.rotation.z = (Math.random() - 0.5) * 0.3;
    }
    return { g, foco };
  }
  const mio = carro(false), gemelo = carro(true);
  const luzCarro = new THREE.PointLight(0xffd8a0, 0, 6, 1.4); mio.g.add(luzCarro); luzCarro.position.set(0, 2.2, 0);
  const pasajero = crearTestigo(mio.g, 0, -1.2, 0, 0.2);
  pasajero.g.scale.setScalar(0.96);
  const pisoCarro = suelo.agregar(Z, { x0: 0, x1: 0, z0: 0, z1: 0, y: -99 });
  const asc = { estado: 'abajo', t: 0, z: FUN.zAbajo, dur: 16, viajes: 0, sustoHecho: false, pasajeroAlLado: false };
  function ponerCarros() {
    mio.g.position.set(FUN.x, yFun(asc.z), asc.z);
    // el gemelo baja mientras el tuyo sube (se cruzan a medio camino)
    const zg = FUN.zAbajo + FUN.zArriba - asc.z;
    gemelo.g.position.set(FUN.gemelo, yFun(zg), zg);
    Object.assign(pisoCarro, { x0: CO.x + FUN.x - 1.0, x1: CO.x + FUN.x + 1.0, z0: CO.z + asc.z - 1.6, z1: CO.z + asc.z + 1.6, y: yFun(asc.z) + 0.2 });
  }
  ponerCarros();

  // ---------- el patio del sanatorio
  const fachadaMat = [material('t_concreto', [4, 2], { color: 0x8a8a80 }), material('t_concreto', [4, 2], { color: 0x8a8a80 }),
    material('t_concreto', [4, 2], { color: 0x5a5a52 }), material('t_concreto', [4, 2], { color: 0x5a5a52 }),
    new THREE.MeshLambertMaterial({ map: textura('f_sanatorio'), emissive: 0xffffff, emissiveMap: textura('f_sanatorio'), emissiveIntensity: 0.18 }),
    material('t_concreto', [4, 2], { color: 0x8a8a80 })];
  const edificio = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 16), fachadaMat);
  edificio.position.set(0, ALTO_CERRO + 8, FACHADA_Z - 8); grupo.add(edificio);
  bloquear(-20, 20, FACHADA_Z - 16, FACHADA_Z);
  // torre central y antenas con luz roja
  lote.caja(concreto, 8, 8, 8, 0, ALTO_CERRO + 20, FACHADA_Z - 8, { tile: 3, color: 0x7a7a70 });
  const rojas = [];
  for (const x of [-14, 14]) {
    lote.caja(oxido, 0.25, 14, 0.25, x, ALTO_CERRO + 16 + 7, FACHADA_Z - 6, { color: 0x6a6a6a });
    const roja = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2010, fog: false }));
    roja.position.set(x, ALTO_CERRO + 30.3, FACHADA_Z - 6); grupo.add(roja); rojas.push(roja);
  }
  const letreroS = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.0), new THREE.MeshBasicMaterial({ map: cartel(['SANATORIO DE LA PENDIENTE'], 512, 56, '#1a1a16', '#d8d0b8', 34) }));
  letreroS.position.set(0, ALTO_CERRO + 5.2, FACHADA_Z + 0.05); grupo.add(letreroS);
  const puertaS = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
  puertaS.position.set(0, ALTO_CERRO + 1.6, FACHADA_Z + 0.06); grupo.add(puertaS);
  // garita, jardín seco, cancha con líneas equivocadas, bancas
  lote.caja(calamina, 2.6, 2.6, 2.6, -18, ALTO_CERRO + 1.3, -46, { tile: 2, color: 0x9a9a8a }); bloquear(-19.3, -16.7, -47.3, -44.7);
  lote.plano(vidrioLuz, 1.2, 0.7, -16.69, ALTO_CERRO + 1.6, -46, { ry: Math.PI / 2, color: 0xa0c8a0 });
  for (let k = 0; k < 16; k++) {
    const x = (k % 2 ? 1 : -1) * (3 + r() * 1.5), z = -40 - k * 1.4;
    lote.caja(oxido, 0.5 + r() * 0.5, 0.5 + r() * 0.8, 0.5 + r() * 0.5, x, ALTO_CERRO + 0.4, z, { color: 0x4a3a28, ry: r() * 3 });
  }
  const cancha = new THREE.Mesh(new THREE.PlaneGeometry(16, 13), new THREE.MeshLambertMaterial({ map: lienzo(256, 208, (g, w, h) => {
    g.fillStyle = '#5a5850'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8e2c8'; g.lineWidth = 3;
    // líneas que no son de ningún deporte: es el plano de un piso del sanatorio
    g.strokeRect(10, 10, w - 20, h - 20); g.beginPath(); g.moveTo(10, h / 2); g.lineTo(w - 10, h / 2); g.stroke();
    for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(10 + k * (w - 20) / 5, 10); g.lineTo(10 + k * (w - 20) / 5, h / 2 - 16); g.stroke(); g.beginPath(); g.moveTo(10 + k * (w - 20) / 5, h / 2 + 16); g.lineTo(10 + k * (w - 20) / 5, h - 10); g.stroke(); }
    g.beginPath(); g.arc(w * 0.77, h * 0.3, 22, 0, 6.28); g.stroke(); g.beginPath(); g.arc(w * 0.31, h * 0.74, 9, 0, 6.28); g.stroke();
    g.fillStyle = '#e8e2c8'; g.font = 'bold 14px monospace'; g.fillText('0317', w - 60, h - 18);
  }) }));
  cancha.rotation.x = -Math.PI / 2; cancha.position.set(16, ALTO_CERRO + 0.03, -49); grupo.add(cancha);
  lote.caja(oxido, 0.15, 3.2, 0.15, 16, ALTO_CERRO + 1.6, -42.6, { color: 0x5a4a3a });
  lote.caja(oxido, 1.4, 0.9, 0.08, 16, ALTO_CERRO + 3.2, -42.7, { color: 0x8a8a8a });
  bloquear(15.8, 16.2, -42.8, -42.4);

  // ---------- la ciudad allá abajo (luces en la niebla): desde los descansos y el patio
  const puntos = [], colores = [];
  for (let k = 0; k < 900; k++) {
    const x = (r() - 0.5) * 420, z = 40 + r() * 260;
    puntos.push(x, -36 + r() * 6, z);
    const c = new THREE.Color([0xffc070, 0xffa040, 0xd0e0ff, 0xff7050][Math.floor(r() * 4)]);
    colores.push(c.r, c.g, c.b);
  }
  const g3 = new THREE.BufferGeometry();
  g3.setAttribute('position', new THREE.Float32BufferAttribute(puntos, 3)); g3.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  const abajo = new THREE.Points(g3, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.8 }));
  grupo.add(abajo);

  // ---------- luces (pocas: una abajo, una a media escalera, una en la puerta)
  const faroles = [[2.5, 4.2, 30], [5.5, 13.4, -5.5], [3.5, ALTO_CERRO + 4.5, FACHADA_Z + 3]].map(([x, y, z], i) => {
    const l = new THREE.PointLight(i === 2 ? 0xc8d8ff : 0xffb060, 0, 16, 1.2); l.position.set(x, y, z); grupo.add(l);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: i === 2 ? 0xd0e0ff : 0xffb566 }));
    cab.position.set(x, y + 0.15, z); grupo.add(cab);
    lote.caja(oxido, 0.12, y - terreno(z), 0.12, x, (y + terreno(z)) / 2, z);
    return { l, cab, base: i === 2 ? 14 : 18 };
  });

  lote.construir(grupo);

  // ---------- sustos de la subida
  const testigoAbajo = crearTestigo(grupo, 6, -8.6, 0, 9); testigoAbajo.g.visible = false;
  const s = { eco: [], ultimoPaso: 0, ecoQuieto: 0, mirado: 0, sinMirar: 0, testigoListo: false, testigoFuera: false };
  const dirCam = new THREE.Vector3(), aTestigo = new THREE.Vector3();

  function enCarro() { return asc.estado === 'subiendo' || asc.estado === 'bajando'; }

  // ¿dónde va el jugador? (relativo a CO)
  function rel(pj) { return { x: pj.x - CO.x, z: pj.z - CO.z, y: pj.y - 0.15 }; }

  function actualizar(dt, t, jugador, camara, audio, ctx) {
    const pj = jugador.pos, p = rel(pj);
    let peligro = 0, niebla = 0;
    for (const f of faroles) f.l.intensity = f.base * (Math.sin(t * 7 + f.base) > -0.85 || Math.random() < 0.3 ? 1 : 0.15);
    rojas.forEach((m, i) => { m.visible = Math.sin(t * 2.2 + i * 1.7) > 0; });

    // --- el ascensor
    if (asc.estado === 'subiendo' || asc.estado === 'bajando' || asc.estado === 'llama') {
      asc.t += dt;
      const sube = asc.estado !== 'bajando' && asc.estado !== 'llama';
      const dur = asc.estado === 'llama' ? 7 : asc.dur;
      const u = Math.min(1, asc.t / dur), e = u * u * (3 - 2 * u);
      asc.z = asc.estado === 'llama' ? FUN.zArriba + (FUN.zAbajo - FUN.zArriba) * e
        : sube ? FUN.zAbajo + (FUN.zArriba - FUN.zAbajo) * e : FUN.zArriba + (FUN.zAbajo - FUN.zArriba) * e;
      ponerCarros();
      luzCarro.intensity = 3;
      if (asc.estado !== 'llama') {
        // el jugador va dentro, quieto, mirando hacia donde avanza el carro
        pj.x = CO.x + FUN.x; pj.z = CO.z + asc.z + (sube ? 0.9 : -0.9); pj.y = yFun(asc.z) + 0.35;
        jugador.rumbo = sube ? Math.PI : 0;
        // el pasajero (sólo la primera subida de cada vuelta)
        if (sube && !asc.sustoHecho) {
          const tt = asc.t;
          if (tt > 7.4 && tt < 9.6) luzCarro.intensity = Math.random() < 0.5 ? 0 : 3;
          if (tt > 8.2) niebla = 0.06;
          if (tt >= 9.6 && tt < 10.8) { luzCarro.intensity = 0; pasajero.g.visible = false; mio.foco.material.color.setHex(0x111111); }
          if (tt >= 10.8 && !asc.pasajeroAlLado) {
            asc.pasajeroAlLado = true; luzCarro.intensity = 3; mio.foco.material.color.setHex(0xffe0a0);
            pasajero.g.visible = true; pasajero.g.position.set(-0.5, 0.2, 0.3); pasajero.g.rotation.y = Math.atan2(0.5, 0.6);
            ctx.estadoJuego.susto(1); ctx.sustos.temblar(0.8); audio.golpe(1.3); audio.obturador(pj, 0.5);
            ctx.hud.limpiar(); ctx.hud.decir('Estaba sentado a tu lado.\nSiempre estuvo sentado a tu lado.', 4);
          }
          if (tt > 10.8 && tt < 13) peligro = 0.6;
          if (tt >= 13 && pasajero.g.visible) { pasajero.g.visible = false; luzCarro.intensity = 0.4; }
        }
      }
      if (u >= 1) {
        corredor.x0 = CO.x + CORREDOR.x0; corredor.x1 = CO.x + CORREDOR.x1;
        if (asc.estado === 'llama') { asc.estado = 'abajo'; ctx.hud.limpiar(); ctx.hud.decir('El ascensor llegó vacío.\nLas puertas se abren solas.', 3); }
        else if (sube) {
          asc.estado = 'arriba'; asc.sustoHecho = true; asc.viajes++;
          pj.set(CO.x + FUN.x + 2.6, ALTO_CERRO + 0.15, CO.z + FUN.zArriba - 1.2); jugador.rumbo = Math.PI / 2;
          ctx.hud.limpiar(); ctx.hud.decir('Arriba. Nadie se bajó contigo.', 3);
        } else {
          asc.estado = 'abajo';
          pj.set(CO.x + FUN.x + 2.6, 0.15, CO.z + FUN.zAbajo + 1.2); jugador.rumbo = Math.PI / 2;
        }
        pasajero.g.visible = true; pasajero.g.position.set(0, 0.2, -1.2); pasajero.g.rotation.y = 0;
        luzCarro.intensity = 0;
      }
    }

    // --- pasos que suben detrás de ti, al mismo ritmo (tramos 2 a 4)
    const enEscalera = !enCarro() && p.z < 9 && p.z > -37 && p.y > 4;
    if (enEscalera && jugador.pasos !== s.ultimoPaso) {
      s.ultimoPaso = jugador.pasos; s.ecoQuieto = 2;
      s.eco.push({ t: t + 0.32, corre: jugador.corriendo });
    } else if (!enEscalera) s.ultimoPaso = jugador.pasos;
    if (enEscalera && jugador.velocidad === 0 && s.ecoQuieto > 0 && (!s.eco.length) && Math.random() < dt * 2.2) {
      // te detuviste: los de atrás dan dos pasos más
      s.ecoQuieto--; s.eco.push({ t: t + 0.45, corre: false });
    }
    while (s.eco.length && s.eco[0].t <= t) {
      const e = s.eco.shift();
      audio.pasoEn(new THREE.Vector3(pj.x + (Math.random() - 0.5), pj.y - 2.5, pj.z + 7.5), 7.5, e.corre);
    }

    // --- alguien te mira desde el pie del tercer tramo
    if (!s.testigoListo && p.z < -20.5 && p.y > 12.5) { s.testigoListo = true; testigoAbajo.g.visible = true; }
    if (testigoAbajo.g.visible) {
      testigoAbajo.actualizar(dt, pj, 30);
      camara.getWorldDirection(dirCam);
      aTestigo.set(CO.x + 6, 9 + 1.5, CO.z - 8.6).sub(camara.position).normalize();
      const loVe = dirCam.dot(aTestigo) > 0.8;
      if (loVe) { s.mirado += dt; s.sinMirar = 0; } else s.sinMirar += dt;
      if ((s.mirado > 1.2 && s.sinMirar > 0.4) || p.y > ALTO_CERRO - 0.5) { testigoAbajo.g.visible = false; if (s.mirado > 1.2) audio.obturador(pj, 12); }
    }
    return { peligro, niebla };
  }

  function objetivo(pj, bajar = false) {
    const p = rel(pj);
    if (bajar && asc.estado !== 'subiendo' && asc.estado !== 'bajando') {
      if (p.y > ALTO_CERRO - 1) return ['Baja a la ciudad: los 137 peldaños (al sur) o el ascensor de la izquierda (E). Después, al baño.', A(0, -36)];
      if (p.z > 26) return ['Sal por el portón del sur (E) y vuelve al baño donde despertaste.', A(0, 39.8)];
      const sig = [...CAMINO].reverse().find(([, z]) => z > p.z + 0.8) ?? [0, 30];
      return ['Sigue bajando la escalera. No mires atrás.', A(sig[0], sig[1])];
    }
    if (asc.estado === 'subiendo') return ['El ascensor sube solo. No hay nadie manejando. Espera a llegar arriba.', null];
    if (asc.estado === 'bajando') return ['El ascensor baja. Espera.', null];
    if (p.y > ALTO_CERRO - 1) return ['Entra al Sanatorio de la Pendiente: la puerta del centro de la fachada (E).', A(0, FACHADA_Z + 1.2)];
    if (p.z > 26) return ['Sube al sanatorio: 137 peldaños (al norte) o el ascensor de la izquierda (E). Para volver a la ciudad: E en el portón del sur.', A(0, 25)];
    const sig = CAMINO.find(([, z]) => z < p.z - 0.8) ?? CAMINO[CAMINO.length - 1];
    return ['Sigue subiendo la escalera. Si oyes pasos detrás, no te detengas.', A(sig[0], sig[1])];
  }

  function registrar(interaccion, ctx) {
    const { irA, hud } = ctx;
    interaccion.agregar({ zona: Z, pos: A(0, 39.8), radio: 2.4, prioridad: 2, etiqueta: 'volver a la ciudad', accion: () => { irA('ciudad', 'cerro'); return null; } });
    interaccion.agregar({ zona: Z, pos: A(FUN.x + 2.2, FUN.zAbajo + 1.2), radio: 2.4, prioridad: 2,
      activo: () => (asc.estado === 'abajo' || asc.estado === 'arriba') && jugadorAbajo(),
      etiqueta: () => (asc.estado === 'abajo' ? 'subir en el ascensor' : 'llamar al ascensor'),
      accion: () => {
        if (asc.estado === 'arriba') { asc.estado = 'llama'; asc.t = 0; return 'El ascensor está arriba.\nLo oyes bajar, vacío, rechinando.'; }
        asc.estado = 'subiendo'; asc.t = 0; asc.pasajeroAlLado = false;
        corredor.x0 = corredor.x1 = -9999;
        pasajero.g.visible = !asc.sustoHecho;
        return asc.sustoHecho ? 'El ascensor arranca solo.' : 'El ascensor arranca solo. No hay operador.\nAl fondo del carro va sentado alguien.';
      } });
    interaccion.agregar({ zona: Z, pos: A(FUN.x + 2.2, FUN.zArriba - 1.2), radio: 2.4, prioridad: 2,
      activo: () => asc.estado === 'arriba' && !jugadorAbajo(), etiqueta: 'bajar en el ascensor',
      accion: () => { asc.estado = 'bajando'; asc.t = 0; corredor.x0 = corredor.x1 = -9999; pasajero.g.visible = false; return 'Bajas. El otro carro sube lleno de abrigos verdes.'; } });
    interaccion.agregar({ zona: Z, pos: A(0, FACHADA_Z + 1.3), radio: 2.4, prioridad: 2, etiqueta: 'entrar al sanatorio', accion: () => { irA('sanatorio', 'entrada'); return null; } });
    interaccion.agregar({ zona: Z, pos: A(2.6, 27.8), radio: 2.2, etiqueta: 'leer el letrero',
      accion: () => 'SANATORIO DE LA PENDIENTE. 137 peldaños.\nAlguien raspó el 137 y escribió 138.' });
    interaccion.agregar({ zona: Z, pos: A(-15.8, -46), radio: 2.2, etiqueta: 'mirar la garita',
      accion: () => 'El libro de visitas.\nTodas las firmas son tuyas. La última es de hoy, 03:17.' });
    interaccion.agregar({ zona: Z, pos: A(16, -44), radio: 3, etiqueta: 'mirar la cancha',
      accion: () => 'Las líneas no son de ningún deporte.\nEs el plano de un piso del sanatorio. En un cuadro dice 0317.' });
    interaccion.agregar({ zona: Z, pos: A(20, -38.2), radio: 3, etiqueta: 'mirar la ciudad',
      accion: () => 'Desde aquí arriba la ciudad no tiene calles.\nSólo piezas iluminadas, una al lado de otra.' });
    interaccion.agregar({ zona: Z, pos: A(5.4, 11.5), radio: 2.2, etiqueta: 'mirar desde el mirador',
      accion: () => 'Abajo, la ciudad. Una sola ventana se apaga y se prende.\nTres veces. Diecisiete.' });
  }
  let ultimoJugador = null;
  function jugadorAbajo() { return ultimoJugador ? ultimoJugador.y < ALTO_CERRO / 2 : true; }

  function reiniciar() {
    asc.estado = 'abajo'; asc.t = 0; asc.z = FUN.zAbajo; asc.sustoHecho = false; asc.pasajeroAlLado = false;
    ponerCarros(); corredor.x0 = CO.x + CORREDOR.x0; corredor.x1 = CO.x + CORREDOR.x1;
    pasajero.g.visible = true; pasajero.g.position.set(0, 0.2, -1.2); pasajero.g.rotation.y = 0;
    s.testigoListo = false; s.mirado = 0; s.sinMirar = 0; testigoAbajo.g.visible = false; s.eco.length = 0;
  }

  const llegadas = {
    cerro: { abajo: { x: CO.x, z: CO.z + 37.5, y: 0, rumbo: Math.PI }, patio: { x: CO.x, z: CO.z + FACHADA_Z + 2.6, y: ALTO_CERRO, rumbo: 0 } },
  };

  return { col, actualizar: (...a) => { ultimoJugador = a[2].pos; return actualizar(...a); }, objetivo, registrar, reiniciar, llegadas,
    depurar: { asc, peldanos, casas: casas.length, testigoAbajo, pasajero, terreno } };
}
