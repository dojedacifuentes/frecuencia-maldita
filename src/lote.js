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

// ---------------------------------------------------------------------------------------------------------------
// Juntar lo quieto de un grupo ya armado (28-nov, «más rápido»): las mallas que nadie mueve, esconde ni recolorea se
// funden en una malla por material (materiales iguales aunque sean objetos distintos cuentan como uno). Las originales
// salen de la escena pero siguen existiendo: quien sólo lee su posición (los avisos «E · …») no nota la diferencia.
// Por seguridad no se tocan: las que están en «excepto» (y lo que cuelga de ellas), las de MeshBasicMaterial (letreros
// y luces, que a menudo parpadean), las transparentes, las escondidas, las que tienen hijos, las animadas con huesos y
// las de copias (InstancedMesh). Devuelve cuántas mallas juntó y en cuántas quedaron.
const firma = (m) => [m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.map?.uuid, m.emissiveMap?.uuid,
  m.alphaTest, m.side, m.vertexColors, m.fog, m.flatShading, m.wireframe, m.polygonOffset, m.polygonOffsetFactor].join('|');
export function juntarQuietas(grupo, excepto = []) {
  const fuera = new Set();
  for (const o of excepto) o?.traverse?.((x) => fuera.add(x));
  grupo.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(grupo.matrixWorld).invert();
  const mats = new Map(), geos = new Map(), quitar = [];
  const sirve = (m) => m && !m.isMeshBasicMaterial && !m.isShaderMaterial && !m.transparent && m.isMaterial;
  grupo.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || fuera.has(o) || o.children.length) return;
    let v = true; for (let p = o; p && p !== grupo; p = p.parent) v = v && p.visible;
    if (!v) return;
    const lista = Array.isArray(o.material) ? o.material : [o.material];
    if (!lista.every(sirve)) return;
    const base = o.geometry;
    if (!base.attributes.position || !base.attributes.normal || !base.attributes.uv) return;
    let g = base.index ? base.toNonIndexed() : base.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
    // con varios materiales, cada grupo de caras va con el suyo
    const trozos = Array.isArray(o.material) && base.groups.length
      ? base.groups.map((gr) => [lista[gr.materialIndex], gr.start, gr.count]) : [[lista[0], 0, g.attributes.position.count]];
    for (const [mat, ini, n] of trozos) {
      const parte = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(g.attributes)) parte.setAttribute(k, new THREE.BufferAttribute(a.array.slice(ini * a.itemSize, (ini + n) * a.itemSize), a.itemSize));
      const f = firma(mat) + (parte.attributes.color ? '|c' : '');
      if (!mats.has(f)) { mats.set(f, mat); geos.set(f, []); }
      geos.get(f).push(parte);
    }
    quitar.push(o);
  });
  for (const o of quitar) o.parent.remove(o);
  let n = 0;
  for (const [f, gs] of geos) {
    const malla = new THREE.Mesh(mergeGeometries(gs, false), mats.get(f));
    malla.name = 'quietas';
    grupo.add(malla); n++;
  }
  return { juntadas: quitar.length, quedan: n };
}
