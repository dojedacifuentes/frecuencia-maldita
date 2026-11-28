// El Sanatorio de la Pendiente por dentro (28-nov): tres pisos unidos por una escalera de verdad (se sube y se baja
// caminando). Un pasillo largo de oeste a este en cada piso, salas a los dos lados y la escalera al fondo (sureste).
//   Planta baja · ADMISIÓN       recepción, archivo (tu ficha), guardarropía de abrigos verdes, sala de espera con
//                                Testigos, enfermería (pilas), oficina, la silla, baños; una silla de ruedas que viene sola.
//   Piso 1 · OBSERVACIÓN         dormitorio con todas las camas apuntando a un rincón vacío, el comedor de los ausentes,
//                                la maqueta de la ciudad, hidroterapia, la grabadora; pasos en el piso de arriba.
//   Piso 2 · AISLAMIENTO         celdas con mirilla (una salta a la cara), tú durmiendo en una celda abierta, la sala de
//                                radio (las cintas) y la que gatea al fondo del pasillo: se apagan las luces y viene.
// La ficha y las cintas son pruebas para el director R9 (cuentan para el final secreto).
import * as THREE from 'three';
import { material, textura } from './ps1.js';
import { crearLote } from './lote.js';
import { crearTestigo, crearGatea, GATEA_GIRO } from './monstruos.js';
import { cuerpoListo, crearCuerpo3d } from './cuerpo.js';

export const SO = new THREE.Vector3(-300, 0, 300);
const PISO = [0, 4, 8];
const NOMBRES = ['PLANTA BAJA · ADMISIÓN', 'PISO 1 · OBSERVACIÓN', 'PISO 2 · AISLAMIENTO'];

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
const rotulo = (texto, w = 256, h = 48, fondo = '#e8e4d4', tinta = '#2a2a2a', tam = 22) => lienzo(w, h, (g) => {
  g.fillStyle = fondo; g.fillRect(0, 0, w, h); g.fillStyle = tinta; g.textAlign = 'center'; g.font = `bold ${tam}px "Courier New", monospace`;
  g.fillText(texto, w / 2, h / 2 + tam * 0.35);
});

export function crearSanatorio(escena, suelo) {
  const Z = 'sanatorio';
  const grupo = new THREE.Group(); grupo.position.copy(SO); escena.add(grupo);
  const col = [];
  const A = (x, z) => ({ x: SO.x + x, z: SO.z + z });
  const bloquear = (x0, x1, z0, z1, y0, y1) => { const c = { x0: SO.x + Math.min(x0, x1), x1: SO.x + Math.max(x0, x1), z0: SO.z + Math.min(z0, z1), z1: SO.z + Math.max(z0, z1) }; if (y0 !== undefined) { c.y0 = y0; c.y1 = y1; } col.push(c); return c; };
  const sup = (x0, x1, z0, z1, y) => suelo.agregar(Z, { x0: SO.x + x0, x1: SO.x + x1, z0: SO.z + z0, z1: SO.z + z1, y });

  // ---------- dónde se pisa
  sup(-20, 20, -12, 12, 0);
  suelo.agregar(Z, { x0: SO.x + 12.3, x1: SO.x + 15.8, z0: SO.z + 3, z1: SO.z + 11, eje: 'z', y0: 4, y1: 0 });   // tramo A: baja hacia el sur
  sup(-20, 20, -12, 3, 4); sup(-20, 12, 3, 12, 4);
  suelo.agregar(Z, { x0: SO.x + 16.2, x1: SO.x + 19.7, z0: SO.z + 3, z1: SO.z + 11, eje: 'z', y0: 4, y1: 8 });   // tramo B: sube hacia el sur
  sup(12.3, 19.7, 11, 12, 8);
  sup(-20, 20, -12, 2, 8); sup(-20, 12, 2, 12, 8); sup(12.3, 15.8, 2, 11, 8);

  const lote = crearLote();
  const azulejo = material('t_azulejo_hosp', [1, 1], { vertexColors: true });
  const damero = material('t_damero', [1, 1], { vertexColors: true });
  const concreto = material('t_concreto', [1, 1], { vertexColors: true });
  const acolchado = material('t_acolchado', [1, 1], { vertexColors: true });
  const madera = material('t_puerta', [1, 1], { vertexColors: true });
  const metal = material('t_oxido', [1, 1], { vertexColors: true });
  const celdaPuerta = new THREE.MeshLambertMaterial({ map: textura('t_puerta_celda'), emissive: 0xffffff, emissiveMap: textura('t_puerta_celda'), emissiveIntensity: 0.08 });
  const TINTE = [0xd8dcd0, 0xc8d8c0, 0xd8d0b0];

  // muro de un piso (k = 0, 1, 2) o de todo el alto (k = null)
  function muro(x0, x1, z0, z1, k, { mat = azulejo, color, sinChoque = false } = {}) {
    const y0 = k === null ? 0 : PISO[k], alto = k === null ? 12 : 4;
    lote.caja(mat, x1 - x0, alto, z1 - z0, (x0 + x1) / 2, y0 + alto / 2, (z0 + z1) / 2, { tile: 1.6, color: color ?? (k === null ? 0xd0d4c8 : TINTE[k]) });
    if (!sinChoque) bloquear(x0, x1, z0, z1, k === null ? undefined : y0 - 0.3, k === null ? undefined : y0 + 3.85);
  }
  // pared del pasillo (z fija) con puertas: huecos de 1,4 m en las x dadas
  function paredPasillo(z, k, huecos, xIni = -20, xFin = 20) {
    const cortes = [...huecos].sort((a, b) => a[0] - b[0]);
    let x = xIni;
    for (const [c, ancho] of cortes) { if (c - ancho / 2 > x + 0.05) muro(x, c - ancho / 2, z - 0.12, z + 0.12, k); x = c + ancho / 2; }
    if (xFin > x + 0.05) muro(x, xFin, z - 0.12, z + 0.12, k);
    // dintel sobre cada puerta
    for (const [c, ancho] of cortes) lote.caja(azulejo, ancho, 1.3, 0.24, c, PISO[k] + 3.35, z, { tile: 1.6, color: TINTE[k] });
  }

  // ---------- muros de afuera (todo el alto), con la puerta de entrada al oeste en la planta baja
  muro(-20.3, -19.8, -12, -1, null); muro(-20.3, -19.8, 1, 12, null);
  lote.caja(azulejo, 0.5, 9.4, 2, -20.05, 2.6 + 4.7, 0, { tile: 1.6, color: 0xd0d4c8 });
  bloquear(-20.3, -19.8, -1, 1, 3.6, 12.5);
  muro(19.8, 20.3, -12, 12, null); muro(-20.3, 20.3, -12.3, -11.8, null); muro(-20.3, 20.3, 11.8, 12.3, null);
  // la escalera: muro oeste, muro del medio, el bloque bajo el tramo A (para no meterse debajo)
  muro(11.8, 12.3, 2, 12, null);
  lote.caja(azulejo, 0.4, 9.2, 8, 16, 4.6, 7, { tile: 1.6, color: 0xc8ccc0 }); bloquear(15.8, 16.2, 3, 11, -0.3, 9.2);
  bloquear(12.3, 15.8, 3, 9.6, -0.5, 0.45);

  // ---------- pisos: muros del pasillo y de las salas
  paredPasillo(-2, 0, [[-16, 1.4], [-8, 1.4], [0, 1.4], [8, 1.4], [16, 1.4]]);
  paredPasillo(2, 0, [[-16, 1.4], [-8, 1.4], [0, 1.4], [8, 1.4], [18, 3.4]], -20, 20);
  paredPasillo(-2, 1, [[-16, 1.4], [-8, 1.4], [0, 1.4], [8, 1.4], [16, 1.4]]);
  paredPasillo(2, 1, [[-16, 1.4], [-8, 1.4], [0, 1.4], [8, 1.4]], -20, 12);
  paredPasillo(-2, 2, [[-16, 1.4], [0, 1.4]]);
  paredPasillo(2, 2, [[14.05, 3.5]], -20, 20);
  for (const x of [-12, -4, 4, 12]) { muro(x - 0.12, x + 0.12, -12, -2, 0); muro(x - 0.12, x + 0.12, -12, -2, 2); }
  for (const x of [-12, -4, 4]) { muro(x - 0.12, x + 0.12, 2, 12, 0); muro(x - 0.12, x + 0.12, 2, 12, 2); }
  muro(-4.12, -3.88, -12, -2, 1); muro(11.88, 12.12, -12, -2, 1); muro(-4.12, -3.88, 2, 12, 1);

  // ---------- losas (piso de damero encima, cielo de concreto debajo) y techo
  function losa(x0, x1, z0, z1, y) {
    lote.caja(concreto, x1 - x0, 0.22, z1 - z0, (x0 + x1) / 2, y - 0.11, (z0 + z1) / 2, { tile: 3, color: 0x8a8a82 });
    lote.plano(damero, x1 - x0, z1 - z0, (x0 + x1) / 2, y + 0.006, (z0 + z1) / 2, { rx: -Math.PI / 2, tile: 1.6, color: 0xc8c4b8 });
  }
  losa(-20, 20, -12, 12, 0.01);
  losa(-20, 20, -12, 3, 4); losa(-20, 12, 3, 12, 4);
  losa(-20, 20, -12, 2, 8); losa(-20, 12, 2, 12, 8); losa(12.3, 15.8, 2, 11, 8); losa(12.3, 19.7, 11, 12, 8);
  lote.caja(concreto, 40.6, 0.3, 24.6, 0, 12.15, 0, { tile: 3, color: 0x6a6a64 });
  // los peldaños: 24 por tramo, con su losa inclinada por debajo
  const ang = Math.atan2(4, 8);
  for (let k = 0; k < 24; k++) {
    const yA = (k + 1) * 4 / 24, zA = 11 - (k + 0.5) * 8 / 24;
    lote.caja(concreto, 3.5, 0.3, 8 / 24 + 0.01, 14.05, yA - 0.15, zA, { tile: 1, color: 0xb8b4a8 });
    const yB = 4 + (k + 1) * 4 / 24, zB = 3 + (k + 0.5) * 8 / 24;
    lote.caja(concreto, 3.5, 0.3, 8 / 24 + 0.01, 17.95, yB - 0.15, zB, { tile: 1, color: 0xb8b4a8 });
  }
  lote.caja(concreto, 3.5, 0.25, Math.hypot(8, 4), 14.05, 2 - 0.35, 7, { tile: 2, color: 0x7a7a72, rx: ang });
  lote.caja(concreto, 3.5, 0.25, Math.hypot(8, 4), 17.95, 6 - 0.35, 7, { tile: 2, color: 0x7a7a72, rx: -ang });
  // baranda del rellano de arriba
  lote.caja(metal, 0.06, 1, 0.06, 15.9, 8.5, 2.2, { color: 0x5a5a5a });

  // ---------- letreros de piso (junto a la escalera)
  for (let k = 0; k < 3; k++) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), new THREE.MeshBasicMaterial({ map: rotulo(NOMBRES[k], 320, 52, '#1e3a2a', '#e8f0d8', 20) }));
    l.position.set(11.6, PISO[k] + 2.7, 0); l.rotation.y = -Math.PI / 2; grupo.add(l);
  }

  // ---------- mobiliario
  const camaMat = madera, sabana = material('t_cortina', [1, 1], { vertexColors: true });
  function cama(x, y, z, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    lote.caja(metal, 0.95, 0.5, 2.0, x, y + 0.25, z, { color: 0x8a8a8a, ry: rot });
    lote.caja(sabana, 0.9, 0.18, 1.95, x, y + 0.58, z, { tile: 1, color: 0xd8d4c8, ry: rot });
    lote.caja(metal, 0.95, 0.9, 0.06, x + s * 1.0, y + 0.45, z + c * 1.0, { color: 0x6a6a6a, ry: rot });
  }
  // PLANTA BAJA
  lote.caja(madera, 6, 1.1, 0.7, -16, 0.55, -5.5, { tile: 1, color: 0x8a6a4a }); bloquear(-19, -13, -5.85, -5.15);   // mesón de recepción
  lote.caja(metal, 0.2, 0.1, 0.2, -15, 1.16, -5.5, { color: 0xc8a030 });
  for (let k = 0; k < 4; k++) { lote.caja(metal, 0.5, 2.2, 6.5, -11 + k * 1.9, 1.1, -7.5, { color: 0x6a7068 }); bloquear(-11.25 + k * 1.9, -10.75 + k * 1.9, -10.75, -4.25, -0.3, 3); }   // archivo
  const abrigosVerdes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 1.05, 0.22), new THREE.MeshLambertMaterial({ color: 0x3a4a2e }), 60);
  { const d = new THREE.Object3D(); let i = 0;
    for (let f = 0; f < 4; f++) for (let k = 0; k < 15; k++) { d.position.set(-3.4 + k * 0.48, 1.45 + (k % 3) * 0.04, -10.6 + f * 2.2); d.rotation.set(0, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.12); d.updateMatrix(); abrigosVerdes.setMatrixAt(i++, d.matrix); }
    grupo.add(abrigosVerdes);
    for (let f = 0; f < 4; f++) lote.caja(metal, 7.6, 0.05, 0.05, 0, 2.05, -10.6 + f * 2.2, { color: 0x555555 }); }
  const gota = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0x7a9a7a })); grupo.add(gota);
  for (let f = 0; f < 3; f++) for (let k = 0; k < 5; k++) lote.caja(madera, 0.5, 0.5, 0.5, 5.5 + k * 1.3, 0.25, -5 - f * 1.6, { tile: 1, color: 0x6a5a4a });   // sillas de la espera
  const tele = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.1), new THREE.MeshBasicMaterial({ map: lienzo(64, 48, () => {}) })); tele.position.set(8, 1.7, -11.6); grupo.add(tele);
  const ruido = tele.material.map.image.getContext('2d');
  cama(14, 0, -9, 0); cama(17.5, 0, -9, 0); lote.caja(metal, 1.4, 1.8, 0.4, 18.8, 0.9, -3, { color: 0xb8c0b8 });
  lote.caja(madera, 2.4, 0.8, 1.2, -16, 0.4, 8, { tile: 1, color: 0x5a3a2a }); bloquear(-17.2, -14.8, 7.4, 8.6, -0.3, 3);   // escritorio del director
  lote.caja(metal, 0.5, 0.25, 0.4, -16, 0.92, 8, { color: 0x2a2a2a });
  lote.caja(madera, 0.6, 1.1, 0.6, -8, 0.55, 7, { tile: 1, color: 0x5a4a3a }); lote.caja(metal, 0.05, 1.6, 0.05, -8, 3.2, 7, { color: 0x222222 });   // la silla
  const ampolleta = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); ampolleta.position.set(-8, 2.35, 7); grupo.add(ampolleta);
  for (let k = 0; k < 3; k++) lote.caja(azulejo, 0.8, 0.9, 0.5, -2.5 + k * 2.2, 0.45, 11.5, { tile: 1, color: 0xe8e8e0 });   // lavamanos
  lote.plano(new THREE.MeshBasicMaterial({ vertexColors: true }), 5.5, 1.2, 0, 1.8, 11.69, { ry: Math.PI, color: 0x1a2228 });   // el espejo (no te refleja)
  for (let k = 0; k < 3; k++) lote.caja(metal, 1.6, 0.8, 0.9, 6 + k * 2.2, 0.4, 10.5, { color: 0x8a8a8a });   // lavandería
  // la silla de ruedas del pasillo
  const silla = new THREE.Group(); grupo.add(silla);
  { const m = new THREE.MeshLambertMaterial({ color: 0x5a5a5a }), cuero = new THREE.MeshLambertMaterial({ color: 0x2a201a });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0) => { const q = new THREE.Mesh(geo, mat); q.position.set(x, y, z); q.rotation.set(rx, ry, 0); silla.add(q); };
    add(new THREE.BoxGeometry(0.5, 0.08, 0.5), cuero, 0, 0.5, 0); add(new THREE.BoxGeometry(0.5, 0.55, 0.06), cuero, 0, 0.8, -0.25);
    for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.3, 0.03, 4, 12), m, s * 0.29, 0.32, -0.05, 0, Math.PI / 2); }
  // PISO 1
  for (let k = 0; k < 12; k++) {   // las camas apuntan todas al rincón vacío
    const x = -18.2 + (k % 4) * 3.4, z = -10.4 + Math.floor(k / 4) * 3.0;
    cama(x, 4, z, Math.atan2(-4.8 - x, -11.4 - z) + Math.PI);
  }
  lote.caja(madera, 12, 0.08, 1.4, 4, 4.8, -7, { tile: 1, color: 0x6a4a3a });   // la mesa del comedor
  for (const x of [-1, 9]) for (const z of [-7.5, -6.5]) lote.caja(metal, 0.08, 0.8, 0.08, x, 4.4, z, { color: 0x444444 });
  bloquear(-2, 10, -7.7, -6.3, 3.7, 7);
  const comensales = [];
  const gris = new THREE.MeshLambertMaterial({ color: 0x8a8a84 }), cabezaMat = new THREE.MeshLambertMaterial({ color: 0x9a948a });
  for (let k = 0; k < 10; k++) {
    const lado = k % 2 ? 1 : -1, x = -1 + Math.floor(k / 2) * 2.2 + (lado > 0 ? 0.6 : 0);
    const g = new THREE.Group(); g.position.set(x, 4, -7 + lado * 1.0); g.rotation.y = lado > 0 ? Math.PI : 0; grupo.add(g);
    const caja = (w, h, d, x2, y2, z2, m) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x2, y2, z2); g.add(q); return q; };
    caja(0.42, 0.5, 0.42, 0, 0.25, 0, gris); caja(0.44, 0.62, 0.26, 0, 0.82, 0, gris); caja(0.2, 0.24, 0.2, 0, 1.28, 0, cabezaMat);
    const brazo = new THREE.Group(); brazo.position.set(0.25, 1.05, 0.05); g.add(brazo);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.45, 0.09), gris); b.position.y = -0.2; brazo.add(b);
    comensales.push({ g, brazo, base: g.rotation.y });
  }
  const puestoVacio = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), new THREE.MeshBasicMaterial({ map: rotulo('0317', 64, 24, '#f0ece0', '#7a1510', 16) }));
  puestoVacio.rotation.x = -Math.PI / 2; puestoVacio.position.set(10, 4.85, -7); grupo.add(puestoVacio);
  lote.caja(madera, 0.42, 0.5, 0.42, 10.9, 4.25, -7, { tile: 1, color: 0x6a5a4a });
  // la maqueta de la ciudad
  lote.caja(madera, 3.2, 0.9, 2.4, -12, 4.45, 7, { tile: 1, color: 0x5a4a3a }); bloquear(-13.6, -10.4, 5.8, 8.2, 3.7, 7);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (!((i === 2 && j === 4) || (i === 2 && j === 2))) lote.caja(concreto, 0.3, 0.12 + ((i * 7 + j * 3) % 5) * 0.05, 0.3, -13.0 + i * 0.44, 4.98, 6.0 + j * 0.44, { tile: 0.5, color: 0xa8a49a });
  lote.caja(concreto, 2.4, 0.03, 0.12, -12.1, 4.91, 6.7, { color: 0x203a4a });
  lote.caja(concreto, 0.5, 0.4, 0.9, -10.7, 5.1, 6.2, { color: 0x6a7060 });
  const figurita = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.04), new THREE.MeshBasicMaterial({ color: 0x4a6a2a })); figurita.position.set(-10.7, 5.35, 6.0); grupo.add(figurita);
  // hidroterapia: dos tinas, una de agua negra
  for (const x of [14.5, 17.5]) lote.caja(azulejo, 1.0, 0.7, 2.0, x, 4.35, -8, { tile: 0.8, color: 0xe8e8e0 });
  const aguaNegra = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.8), new THREE.MeshBasicMaterial({ color: 0x050505 })); aguaNegra.rotation.x = -Math.PI / 2; aguaNegra.position.set(17.5, 4.66, -8); grupo.add(aguaNegra);
  const mano = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.06), new THREE.MeshLambertMaterial({ color: 0x8a8478 })); mano.position.set(17.5, 4.3, -7.6); grupo.add(mano);
  lote.caja(madera, 1.6, 0.8, 0.8, 4, 4.4, 9, { tile: 1, color: 0x5a3a2a }); lote.caja(metal, 0.5, 0.25, 0.35, 4, 4.92, 9, { color: 0x3a3a3a });   // la grabadora
  // PISO 2: puertas de celda con mirilla en las celdas cerradas, la celda abierta (acolchada) y la sala de radio
  const MIRILLAS = [];
  for (const [x, z] of [[-8, -2], [8, -2], [16, -2], [-16, 2], [-8, 2], [0, 2], [8, 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), celdaPuerta);
    p.position.set(x, 9.15, z + (z < 0 ? 0.13 : -0.13)); p.rotation.y = z < 0 ? 0 : Math.PI; grupo.add(p);
    MIRILLAS.push({ x, z: z + (z < 0 ? 0.9 : -0.9) });
  }
  for (const [x0, x1, z0, z1, ry] of [[-3.85, 3.85, -11.75, -11.75, 0], [-3.85, 3.85, -2.25, -2.25, Math.PI]]) lote.plano(acolchado, x1 - x0, 3.8, (x0 + x1) / 2, 10, z0, { ry, tile: 1.4, color: 0xd8d0b8 });
  for (const [x, ry] of [[-3.85, Math.PI / 2], [3.85, -Math.PI / 2]]) lote.plano(acolchado, 9.5, 3.8, x, 10, -7, { ry, tile: 1.4, color: 0xd8d0b8 });
  cama(1.8, 8, -9.5, 0);
  let doble = null;
  for (let k = 0; k < 5; k++) lote.caja(metal, 0.7, 2.6, 0.5, -19.4, 9.3, -10.8 + k * 1.6, { color: 0x3a3a3a });   // racks de la radio
  lote.caja(madera, 3, 0.8, 1, -15, 8.4, -10.8, { tile: 1, color: 0x4a3a2a });
  const leds = [];
  for (let k = 0; k < 14; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: k % 3 ? 0xff3020 : 0x30ff60, fog: false })); l.position.set(-19.04, 8.6 + (k % 5) * 0.4, -10.8 + Math.floor(k / 5) * 1.6); grupo.add(l); leds.push(l); }
  const carretes = [];
  for (const x of [-15.6, -14.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10), new THREE.MeshLambertMaterial({ color: 0x2a2a2a })); c.rotation.x = Math.PI / 2; c.position.set(x, 9.1, -11.25); grupo.add(c); carretes.push(c); }

  lote.construir(grupo);

  // ---------- luces: cuatro focos que siguen al piso donde estás, y una roja de emergencia
  const focos = [-15, -5, 5, 15].map((x) => { const l = new THREE.PointLight(0xdfe8d8, 0, 11, 1.3); grupo.add(l); return { l, x }; });
  const lamparas = [];
  for (let k = 0; k < 3; k++) for (const x of [-15, -5, 5, 15]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.25), new THREE.MeshBasicMaterial({ color: 0xe8f0e0 }));
    m.position.set(x, PISO[k] + 3.78, 0); grupo.add(m); lamparas.push({ m, k, x, apagada: false });
  }
  const roja = new THREE.PointLight(0xff2010, 0, 16, 1.2); grupo.add(roja);
  const escalera = new THREE.PointLight(0xc8d0c0, 0, 12, 1.3); escalera.position.set(16, 6, 7); grupo.add(escalera);

  // ---------- los que esperan y la que gatea
  const esperan = [crearTestigo(grupo, 6.2, -6.6, Math.PI), crearTestigo(grupo, 9.4, -8.2, Math.PI)];
  const gatea = crearGatea(grupo);
  const G0 = { x: -19, y: 8, z: 0 };   // al fondo del pasillo, pasada la puerta de la sala de radio

  const s = {
    ficha: false, cintas: false, mirillas: new Set(), caza: 'dormida', cazaT: 0, migas: [], migaT: 0, apagadas: 0,
    silla: 'quieta', comedor: false, tina: false, maqueta: false, ecoT: 0, ultimoPaso: 0, ecoQuieto: 0, eco: [], ruidoT: 0, gotaT: 0,
  };
  function ponerGatea() { gatea.g.position.set(G0.x, G0.y, G0.z); gatea.g.rotation.y = Math.PI / 2 + GATEA_GIRO; }
  ponerGatea();
  silla.position.set(18, 0, 0); silla.rotation.y = -Math.PI / 2;

  const rel = (pj) => ({ x: pj.x - SO.x, z: pj.z - SO.z, y: pj.y - 0.15 });
  const pisoDe = (y) => (y < 2 ? 0 : y < 6 ? 1 : 2);

  function actualizar(dt, t, jugador, camara, audio, ctx) {
    const pj = jugador.pos, p = rel(pj), k = pisoDe(p.y);
    let peligro = 0;
    // focos en el piso donde estás (en la escalera, el más cercano)
    for (const f of focos) {
      const lam = lamparas.find((l) => l.k === k && l.x === f.x);
      f.l.position.set(f.x, PISO[k] + 3.4, 0);
      const parpadeo = Math.sin(t * 9 + f.x) > -0.7 || Math.random() < 0.4 ? 1 : 0.1;
      f.l.intensity = lam.apagada ? 0 : 7 * parpadeo;
      lam.m.material.color.setHex(lam.apagada ? 0x101010 : parpadeo > 0.5 ? 0xe8f0e0 : 0x404840);
    }
    escalera.intensity = 5 * (Math.sin(t * 5) > -0.9 ? 1 : 0.2);
    // la tele de la sala de espera: estática
    s.ruidoT -= dt;
    if (s.ruidoT <= 0) { s.ruidoT = 0.08; const img = ruido.createImageData(64, 48); for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } ruido.putImageData(img, 0, 0); tele.material.map.needsUpdate = true; }
    // el último abrigo gotea
    s.gotaT += dt; gota.position.set(3.3, 1.0 - (s.gotaT % 0.9) * 1.1, -4.0); gota.visible = s.gotaT % 0.9 < 0.85;
    leds.forEach((l, i) => { l.visible = Math.sin(t * (3 + i) + i) > 0; });
    carretes.forEach((c) => { c.rotation.y += dt * 2; });

    // los Testigos de la sala de espera giran hacia ti (planta baja)
    for (const w of esperan) if (k === 0 && w.actualizar(dt, pj, 9)) { audio.obturador(pj, 3); ctx.estadoJuego.susto(0.5); ctx.hud.limpiar(); ctx.hud.decir('Clic.\nTe sacaron una foto.', 2.5); }

    // la silla de ruedas viene sola por el pasillo de la planta baja
    if (s.silla === 'quieta' && k === 0 && Math.abs(p.z) < 2 && p.x > -6) { s.silla = 'viene'; audio.rechinar(); }
    if (s.silla === 'viene') {
      const dx = p.x - silla.position.x, d = Math.abs(dx);
      if (d > 1.6 && k === 0) { silla.position.x += Math.sign(dx) * dt * 1.1; if (Math.random() < dt * 0.8) audio.rechinar(); }
      else s.silla = 'llego';
    }

    // el comedor: levantan las cucharas al mismo tiempo
    const fase = (t % 6) / 6;
    for (const c of comensales) {
      c.brazo.rotation.x = fase > 0.8 ? -Math.sin((fase - 0.8) / 0.2 * Math.PI) * 1.6 : 0;
      if (s.comedor) { const dx = pj.x - (SO.x + c.g.position.x), dz = pj.z - (SO.z + c.g.position.z); c.g.rotation.y = Math.atan2(dx, dz); }
    }
    if (k === 1 && fase > 0.8 && fase - dt / 6 <= 0.8 && Math.hypot(p.x - 4, p.z + 7) < 10) audio.tecla();
    if (s.tina) mano.position.y = Math.min(5.2, mano.position.y + dt * 0.6);
    figurita.visible = !s.maqueta;

    // pasos en el piso de arriba (en el pasillo del piso 1, siguiendo los tuyos)
    if (k === 1 && Math.abs(p.z) < 2.2 && jugador.pasos !== s.ultimoPaso) { s.ultimoPaso = jugador.pasos; s.ecoQuieto = 3; s.eco.push({ t: t + 0.12 }); }
    else if (k !== 1) s.ultimoPaso = jugador.pasos;
    if (k === 1 && jugador.velocidad === 0 && s.ecoQuieto > 0 && !s.eco.length && Math.random() < dt * 2) { s.ecoQuieto--; s.eco.push({ t: t + 0.5 }); }
    while (s.eco.length && s.eco[0].t <= t) { s.eco.shift(); audio.pasoEn(new THREE.Vector3(pj.x, pj.y + 4, pj.z), 4.2); }

    // ---- la que gatea
    const g = gatea.g;
    if (s.caza === 'dormida') {
      gatea.animar(dt, 0);
      // despierta al salir de la sala de radio con las cintas, si miras por cuatro mirillas o si corres cerca de ella
      const cerca = Math.hypot(p.x - G0.x, p.z - G0.z) < 9;
      if (k === 2 && Math.abs(p.z) < 2.2 && (s.cintas || s.mirillas.size >= 4 || (cerca && jugador.corriendo))) {
        s.caza = 'apagon'; s.cazaT = 0; s.apagadas = 0;
        ctx.hud.limpiar(); ctx.hud.decir('Las luces se apagan. Detrás de ti, algo se levanta.\n¡CORRE a la escalera del fondo! (Shift)', 4);
        audio.crujido(); audio.silencioAnomalo(true);
      }
    } else if (s.caza === 'apagon') {
      s.cazaT += dt;
      const n = Math.min(4, Math.floor(s.cazaT / 0.45));
      while (s.apagadas < n) { lamparas.find((l) => l.k === 2 && l.x === [-15, -5, 5, 15][s.apagadas]).apagada = true; s.apagadas++; audio.golpe(0.5); }
      roja.position.set(p.x, 10.5, 0); roja.intensity = 6 + Math.sin(t * 12) * 3;
      gatea.animar(dt, 0.2);
      if (s.cazaT > 2.4) {
        s.caza = 'caza'; audio.silencioAnomalo(false); audio.chillidos(pj, 4);
        s.migas = [{ x: pj.x - SO.x, y: p.y, z: pj.z - SO.z }];
        ctx.hud.limpiar(); ctx.hud.decir('¡Viene a cuatro patas!\nBaja la escalera y sal por la puerta del oeste.', 4);
      }
    } else if (s.caza === 'caza') {
      // te sigue por donde pasaste (así baja la misma escalera que tú)
      s.migaT -= dt;
      const ult = s.migas[s.migas.length - 1];
      if (s.migaT <= 0 && (!ult || Math.hypot(p.x - ult.x, p.z - ult.z) > 0.4)) { s.migaT = 0.1; s.migas.push({ x: p.x, y: p.y, z: p.z }); }
      let paso = 4.3 * dt;
      while (paso > 0 && s.migas.length) {
        const m = s.migas[0], dx = m.x - g.position.x, dz = m.z - g.position.z, d = Math.hypot(dx, dz);
        if (d <= paso) { g.position.x = m.x; g.position.z = m.z; g.position.y = m.y; paso -= d; s.migas.shift(); }
        else { g.position.x += dx / d * paso; g.position.z += dz / d * paso; g.position.y += (m.y - g.position.y) * Math.min(1, paso / Math.max(d, 0.01)); g.rotation.y = Math.atan2(dx, dz) + GATEA_GIRO; paso = 0; }
      }
      gatea.animar(dt, 1.3);
      roja.position.set(g.position.x, g.position.y + 2.5, g.position.z); roja.intensity = 5 + Math.sin(t * 14) * 2;
      if (Math.random() < dt * 1.5) audio.chillido(new THREE.Vector3(SO.x + g.position.x, g.position.y, SO.z + g.position.z), Math.hypot(p.x - g.position.x, p.z - g.position.z));
      const d = Math.hypot(p.x - g.position.x, p.z - g.position.z), dy = Math.abs(p.y - g.position.y);
      peligro = Math.max(0, 1 - d / 18);
      if (d < 0.95 && dy < 1.3) { s.caza = 'atrapo'; ctx.estadoJuego.capturado(); }
    }
    return { peligro };
  }

  function objetivo(pj) {
    const p = rel(pj), k = pisoDe(p.y);
    if (s.caza === 'caza' || s.caza === 'apagon') {
      if (k > 0) return ['¡CORRE! Baja por la escalera del fondo (este) y sal por la puerta del oeste.', A(k === 2 ? 14 : 18, k === 2 ? 4 : 10)];
      return ['¡CORRE! Sal por la puerta del oeste del pasillo (E).', A(-19, 0)];
    }
    if (!s.ficha) {
      if (k > 0) return ['Baja a la planta baja: tu ficha está en el archivo.', A(k === 2 ? 14 : 18, 9)];
      return ['Busca tu ficha en el ARCHIVO (planta baja, segunda puerta del norte) y pulsa E.', A(-8, -4)];
    }
    if (!s.cintas) {
      if (k < 2) return ['Sube al piso 2 por la escalera del fondo (este): ahí está la sala de radio.', A(k === 0 ? 18 : 14, k === 0 ? 4 : 9)];
      return ['Ve a la SALA DE RADIO (piso 2, al fondo del pasillo, primera puerta del norte) y escucha las cintas (E). Algo duerme ahí: camina, no corras.', A(-16, -4)];
    }
    if (k > 0) return ['Ya sabes qué es 31.7. Baja y sal del sanatorio: las manchas siguen esperando en la ciudad.', A(k === 2 ? 14 : 18, 9)];
    return ['Sal por la puerta del oeste del pasillo y baja a la ciudad: las manchas siguen esperando.', A(-19, 0)];
  }

  function registrar(interaccion, ctx) {
    const { irA, inventario, director, juego, sustos, audio, estadoJuego } = ctx;
    const en = (k, c) => interaccion.agregar({ zona: Z, ...c, activo: () => pisoDe(ultimo.y) === k && (c.activo ? c.activo() : true) });
    const ultimo = { y: 0 };
    en(0, { pos: A(-19.2, 0), radio: 2.2, prioridad: 2, etiqueta: 'salir al patio', accion: () => { irA('cerro', 'patio'); return null; } });
    en(0, { pos: A(-15, -4.6), radio: 2.2, etiqueta: 'tocar el timbre', accion: () => { audio.timbre(8); return 'Ding.\nArriba, alguien toca otro timbre. Dos veces.'; } });
    en(0, { pos: A(-8, -4.4), radio: 2.6, etiqueta: 'buscar tu ficha', accion: () => {
      s.ficha = true; director.registrarCanal('archivo');
      const v = juego.vueltas;
      return `FICHA 0317 · «EL DEL ABRIGO VERDE»\nIngresos: ${v + 1}. Muertes registradas: ${v}${v === 0 ? ' (a lápiz: «todavía»)' : ''}.\nDiagnóstico: insiste en que es la primera vez.`;
    } });
    en(0, { pos: A(0, -4.2), radio: 2.6, etiqueta: 'mirar los abrigos', accion: () => 'Cientos de abrigos verdes. Cada uno con una etiqueta: un número de muerte.\nEl último está mojado. Es el tuyo.' });
    en(0, { pos: A(8, -4.2), radio: 2.6, etiqueta: 'mirar la tele', accion: () => 'Estática. Si la miras rato, se ve una escalera.\nAlguien sube. Lleva tu abrigo.' });
    const botiquin = { dio: false };
    en(0, { pos: A(18.2, -4.2), radio: 2.2, etiqueta: 'abrir el botiquín', accion: () => { if (botiquin.dio) return 'Frascos vacíos. Todos con tu nombre.'; botiquin.dio = true; return `Frascos vacíos, todos con tu nombre.\n${inventario.dar('pilas')}`; } });
    en(0, { pos: A(-16, 6.6), radio: 2.4, etiqueta: 'leer la máquina de escribir', accion: () => 'La hoja dice: «El paciente 0317 volverá a subir la escalera.\nSiempre sube. Que no encuentre la sala de radio».' });
    en(0, { pos: A(-8, 6.1), radio: 1.8, etiqueta: 'sentarte en la silla', accion: () => { estadoJuego.susto(0.9); sustos.temblar(0.6); audio.chirrido(); return 'La corriente te recorre.\nPor un segundo recuerdas una calle que no existe.'; } });
    en(0, { pos: A(0, 10.6), radio: 2.4, etiqueta: 'mirarte al espejo', accion: () => 'El espejo está. Tú no.' });
    en(0, { pos: () => ({ x: SO.x + silla.position.x, z: SO.z + silla.position.z }), radio: 2.0, activo: () => s.silla !== 'quieta', etiqueta: 'mirar la silla de ruedas',
      accion: () => 'En el asiento hay una ficha doblada: 0317.\nALTA: NUNCA.' });
    // piso 1
    en(1, { pos: A(-12, -4.2), radio: 3, etiqueta: 'mirar las camas', accion: () => 'Todas las camas apuntan al mismo rincón.\nEn el rincón no hay nada. Las sábanas están tibias.' });
    en(1, { pos: A(10.6, -6.2), radio: 1.8, etiqueta: 'sentarte en tu puesto', accion: () => {
      if (s.comedor) return 'Siguen mirándote. Nadie mastica.';
      s.comedor = true; estadoJuego.susto(1); sustos.temblar(0.5); audio.golpe(1.2);
      return 'Todos dejan de masticar y te miran.\n«Llegas tarde», dice uno que no tiene boca.';
    } });
    en(1, { pos: A(-12, 5.3), radio: 2.2, etiqueta: 'mover la figurita', accion: () => {
      if (s.maqueta) return 'La figurita ya no está. Está en el baño de la maqueta.';
      s.maqueta = true; sustos.temblar(1.2); audio.rugido(); estadoJuego.susto(0.6);
      return 'Es la ciudad. Tiene un cerro y un sanatorio.\nMueves la figurita del abrigo verde: afuera, algo enorme se mueve con ella.';
    } });
    en(1, { pos: A(17.5, -6.4), radio: 2, etiqueta: 'mirar la tina', accion: () => { if (s.tina) return 'La mano sigue ahí, quieta, con la palma hacia ti.'; s.tina = true; estadoJuego.susto(0.8); audio.chorro(); return 'Agua negra. Algo sube.'; } });
    en(1, { pos: A(4, 7.7), radio: 2.2, etiqueta: 'escuchar la grabadora', accion: () => `Una voz de médico: «Paciente 0317. Hoy dio ${juego.pasos} pasos.\n¿Por qué volvió a subir? ¿Qué espera encontrar arriba?»` });
    // piso 2
    const VISTAS = [
      () => 'Vacía. El acolchado está arañado: 317, 317, 317.',
      () => 'Un hombre de pie, de cara a la pared. Tiene tu abrigo.',
      () => { sustos.rostro(0.7); return null; },
      () => 'Una mujer en el techo, a cuatro patas.\nTe mira al revés. Mira hacia el fondo del pasillo.',
      () => 'Una radio sobre el piso, en 31.7.\nAlguien la escucha con la oreja pegada al suelo.',
      () => 'Las paredes están llenas de dibujos de la misma escalera.\nCada dibujo tiene un peldaño más.',
      () => { audio.golpes(new THREE.Vector3(SO.x + 8, 9.5, SO.z + 2), 1); sustos.temblar(0.6); return 'Oscuro. Algo golpea la puerta desde adentro.\nA la altura de tu cara.'; },
    ];
    MIRILLAS.forEach((m, i) => en(2, { pos: A(m.x, m.z), radio: 1.7, etiqueta: 'mirar por la mirilla', accion: () => { s.mirillas.add(i); return VISTAS[i % VISTAS.length](); } }));
    en(2, { pos: A(1.8, -7.6), radio: 2.2, etiqueta: 'mirar al que duerme', accion: () => { estadoJuego.susto(0.6); return 'Eres tú. Duermes con el abrigo puesto.\nCuando te acercas, abres los ojos al mismo tiempo.'; } });
    en(2, { pos: A(-15, -9.6), radio: 2.4, etiqueta: 'escuchar las cintas', accion: () => {
      s.cintas = true; director.registrarCanal('transmision');
      return 'Cintas con fecha de hoy. En todas, tu voz:\n«Las manchas no son llaves. Son recuerdos. 31.7 transmite lo que vivieron las otras copias».';
    } });
    ctxUltimo = ultimo;
  }
  let ctxUltimo = { y: 0 };

  // al entrar: la que gatea vuelve a su rincón si no te atrapó
  function entrar() {
    if (s.caza !== 'dormida') { s.caza = 'dormida'; s.migas = []; }
    ponerGatea(); roja.intensity = 0; lamparas.forEach((l) => { l.apagada = false; });
  }
  function salir() { entrar(); }
  function reiniciar() {
    Object.assign(s, { ficha: false, cintas: false, caza: 'dormida', silla: 'quieta', comedor: false, tina: false, maqueta: false });
    s.mirillas.clear(); s.migas = []; entrar();
    silla.position.set(18, 0, 0); mano.position.y = 4.3;
  }

  // el doble que duerme (cuando el modelo está listo)
  function prepararDoble() {
    if (doble || !cuerpoListo()) return;
    const c = crearCuerpo3d(); c.brasa.visible = false;
    doble = new THREE.Group(); doble.add(c.malla); c.malla.rotation.x = -Math.PI / 2;
    doble.position.set(1.8, 8.78, -8.65); grupo.add(doble);
  }

  const llegadas = { sanatorio: { entrada: { x: SO.x - 18.4, z: SO.z, y: 0, rumbo: Math.PI / 2 } } };
  return {
    col, objetivo, registrar, reiniciar, entrar, salir, llegadas,
    actualizar: (dt, t, jugador, camara, audio, ctx) => { ctxUltimo.y = jugador.pos.y - 0.15; prepararDoble(); return actualizar(dt, t, jugador, camara, audio, ctx); },
    piso: (pj) => pisoDe(pj.y - 0.15), NOMBRES,
    depurar: { s, gatea, silla, esperan, MIRILLAS },
  };
}
