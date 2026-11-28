// Muchas cajas con el mismo material en una sola malla (el cerro tiene cerca de cien casas: así se dibujan de una vez).
// Las UV se escalan al tamaño de cada cara (tile = metros por cada repetición de la textura) y cada caja lleva su color
// en los vértices: el material debe tener vertexColors: true.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const eul = new THREE.Euler(), q = new THREE.Quaternion(), uno = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), m4 = new THREE.Matrix4();

function pintar(g, color) {
  const c = new THREE.Color(color ?? 0xffffff), n = g.attributes.position.count, cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}

export function crearLote() {
  const grupos = new Map();
  function poner(mat, g, x, y, z, rx, ry, rz) {
    g.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromEuler(eul.set(rx, ry, rz)), uno));
    if (!grupos.has(mat)) grupos.set(mat, []);
    grupos.get(mat).push(g);
  }
  function caja(mat, w, h, d, x, y, z, { tile = 2, color, rx = 0, ry = 0, rz = 0 } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // +x −x +y −y +z −z
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
    }
    pintar(g, color);
    poner(mat, g, x, y, z, rx, ry, rz);
  }
  // un plano vertical mirando hacia ry (0 = hacia +z)
  function plano(mat, w, h, x, y, z, { ry = 0, rx = 0, color, tile } = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); }
    pintar(g, color);
    poner(mat, g, x, y, z, rx, ry, 0);
  }
  function construir(padre) {
    const mallas = [];
    for (const [mat, gs] of grupos) {
      const malla = new THREE.Mesh(mergeGeometries(gs, false), mat);
      padre.add(malla); mallas.push(malla);
      gs.forEach((g) => g.dispose());
    }
    grupos.clear();
    return mallas;
  }
  return { caja, plano, construir };
}
