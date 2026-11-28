// Ratas: corren pegadas a los muros, se juntan en la basura, huyen del jugador y de la linterna.
// Cada tanto, una manada cruza la calle entera chillando. Animación: la tira de 12 cuadros que salió de Dreamina.
import * as THREE from 'three';
import { textura, ps1Material } from './ps1.js';

import { MANZANA, CALLE, centroManzana } from './ciudad.js';

const CUADROS = 12;
const tramo = MANZANA + CALLE;
const origen = centroManzana(0);
const sobreManzana = coord => Math.abs(coord - origen - tramo * Math.round((coord - origen) / tramo)) <= MANZANA / 2;

export function crearRatas(escena, ciudad, audio, cantidad = 84) {
  const base = textura('a_rata');
  const lista = [];
  const r = Math.random;
  const geo = new THREE.PlaneGeometry(1.0, 0.36);
  geo.translate(0, 0.18, 0);
  // todas en una sola malla de copias (antes, una malla y una textura por rata): cada copia lleva su cuadro de la tira
  const cuadros = new Float32Array(cantidad);
  geo.setAttribute('aCuadro', new THREE.InstancedBufferAttribute(cuadros, 1));
  const mat = ps1Material(new THREE.MeshLambertMaterial({ map: base, alphaTest: 0.5, side: THREE.DoubleSide,
    emissive: 0xffffff, emissiveMap: base, emissiveIntensity: 0.6 }));
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCuadro;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x = (vMapUv.x + aCuadro) / ${CUADROS}.0;\n#endif\n#ifdef USE_EMISSIVEMAP\nvEmissiveMapUv.x = (vEmissiveMapUv.x + aCuadro) / ${CUADROS}.0;\n#endif`);
  };
  const malla = new THREE.InstancedMesh(geo, mat, cantidad);
  malla.frustumCulled = false;
  escena.add(malla);
  const cero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let k = 0; k < cantidad; k++) {
    const m = new THREE.Object3D();   // la rata k: posición, giro, escala y si se ve (la malla de copias la dibuja)
    const nido = ciudad.basuras[k % ciudad.basuras.length];
    m.position.set(nido.x + (r() - 0.5) * 2.2, 0.15, nido.z + (r() - 0.5) * 2.2);
    lista.push({ m, k, nido, vel: new THREE.Vector3(), objetivo: null, cuadro: r() * CUADROS, espera: r() * 3,
      escala: 0.95 + r() * 0.75, chillido: r() * 10, manada: false });
  }

  const tmp = new THREE.Vector3();
  let proximaManada = 25;

  function nuevoObjetivo(a) {
    const n = a.nido;
    a.objetivo = new THREE.Vector3(n.x + (r() - 0.5) * 4, 0.15, n.z + (r() - 0.5) * 4);
  }

  function manada(jugador) {
    // una corriente de ratas que cruza delante del jugador, de un lado de la calle al otro
    // cruza de lado a lado delante de la cámara, a unos cinco metros
    const p = jugador.pos, y = jugador.yawCam;
    const fx = Math.sin(y), fz = Math.cos(y);
    const sentido = r() < 0.5 ? 1 : -1;
    const ladoX = -Math.cos(y) * sentido, ladoZ = Math.sin(y) * sentido;
    const desde = new THREE.Vector3(p.x + fx * 5 - ladoX * 8, 0.15, p.z + fz * 5 - ladoZ * 8);
    const hasta = new THREE.Vector3(p.x + fx * 5 + ladoX * 14, 0.15, p.z + fz * 5 + ladoZ * 14);
    const elegidas = lista.slice().sort(() => r() - 0.5).slice(0, 26);
    elegidas.forEach((a, i) => {
      a.m.position.copy(desde).add(new THREE.Vector3((r() - 0.5) * 2, 0, (r() - 0.5) * 2)).addScaledVector(tmp.set(ladoX, 0, ladoZ), -i * 0.35);
      a.objetivo = hasta.clone().add(new THREE.Vector3((r() - 0.5) * 2, 0, (r() - 0.5) * 2));
      a.manada = true; a.espera = 0;
    });
    audio.chillidos(desde, 14);
  }

  function actualizar(dt, jugador, camara, colisiones, linternaOn, t) {
    proximaManada -= dt;
    if (proximaManada <= 0) { manada(jugador); proximaManada = 35 + r() * 30; }
    const pj = jugador.pos;
    for (const a of lista) {
      const pos = a.m.position;
      const dx = pos.x - pj.x, dz = pos.z - pj.z;
      const dist = Math.hypot(dx, dz);
      let rapida = a.manada;
      // huir del jugador y de la linterna
      const enLuz = linternaOn && dist < 9 && (Math.sin(jugador.rumbo) * -dx + Math.cos(jugador.rumbo) * -dz) / (dist || 1) < -0.85;
      if (dist < 3.2 || enLuz) {
        a.objetivo = new THREE.Vector3(pos.x + (dx / (dist || 1)) * 5 + (r() - 0.5) * 2, 0.15, pos.z + (dz / (dist || 1)) * 5 + (r() - 0.5) * 2);
        a.espera = 0;
        rapida = true;
        if (a.chillido <= 0) { audio.chillido(pos, dist); a.chillido = 2 + r() * 4; }
      }
      a.chillido -= dt;
      if (!a.objetivo) {
        a.espera -= dt;
        if (a.espera <= 0) nuevoObjetivo(a);
      }
      let moviendo = false;
      if (a.objetivo) {
        tmp.subVectors(a.objetivo, pos); tmp.y = 0;
        const d = tmp.length();
        if (d < 0.2) {
          a.objetivo = null; a.manada = false;
          a.espera = 0.4 + r() * 3;
        } else {
          const v = rapida ? 3.0 : 0.8 + r() * 0.3;
          tmp.multiplyScalar(Math.min(d, v * dt) / d);
          pos.add(tmp);
          a.vel.copy(tmp);
          moviendo = true;
        }
      }
      // no atravesar edificios
      for (const c of colisiones) {
        if (pos.x > c.x0 && pos.x < c.x1 && pos.z > c.z0 && pos.z < c.z1) {
          const op = [[pos.x - c.x0, 'x', c.x0 - 0.05], [c.x1 - pos.x, 'x', c.x1 + 0.05], [pos.z - c.z0, 'z', c.z0 - 0.05], [c.z1 - pos.z, 'z', c.z1 + 0.05]]
            .sort((p, q) => p[0] - q[0])[0];
          pos[op[1]] = op[2];
          a.objetivo = null;
        }
      }
      pos.y = sobreManzana(pos.x) && sobreManzana(pos.z) ? 0.15 : 0.012;
      // mirar a la cámara (sólo girando en vertical) y voltear según hacia dónde corre
      a.m.rotation.y = Math.atan2(camara.position.x - pos.x, camara.position.z - pos.z);
      const derechaCam = new THREE.Vector3(1, 0, 0).applyQuaternion(camara.quaternion);
      const haciaDerecha = a.vel.dot(derechaCam) > 0;
      a.m.scale.set((haciaDerecha ? 1 : -1) * a.escala, a.escala, 1);
      if (moviendo) a.cuadro = (a.cuadro + dt * (rapida ? 30 : 16)) % CUADROS;
      a.m.visible = dist < 30;
      cuadros[a.k] = Math.floor(a.cuadro);
      if (a.m.visible) { a.m.updateMatrix(); malla.setMatrixAt(a.k, a.m.matrix); } else malla.setMatrixAt(a.k, cero);
    }
    malla.instanceMatrix.needsUpdate = true; geo.attributes.aCuadro.needsUpdate = true;
  }

  return { lista, actualizar, manada, malla };
}
