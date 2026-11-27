// El protagonista en 3D: la malla que TRELLIS sacó de su imagen (public/assets/protagonista.glb) con un esqueleto
// propio. Las articulaciones y los pesos de la piel los calcula herramientas/preparar_modelo.py y llegan en
// public/assets/protagonista.rig.json; aquí se arma el esqueleto y se hacen las poses en código: quieto (fuma),
// camina, corre, baila, mira y cae. Sin archivos de animación: todo se ajusta con números.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ps1Material } from './ps1.js';

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

let base = null;   // { geometria, material, rig }

export async function cargarCuerpo(url = '/assets/protagonista') {
  if (base) return base;
  const [gltf, rig] = await Promise.all([
    new GLTFLoader().loadAsync(`${url}.glb`),
    fetch(`${url}.rig.json`).then((r) => { if (!r.ok) throw new Error('sin rig'); return r.json(); }),
  ]);
  let malla = null;
  gltf.scene.traverse((o) => { if (o.isMesh && !malla) malla = o; });
  if (!malla) throw new Error('sin malla');
  malla.updateWorldMatrix(true, false);
  const geometria = malla.geometry.clone().applyMatrix4(malla.matrixWorld);
  const n = geometria.attributes.position.count;
  if (n !== rig.vertices) throw new Error(`el rig es de otra malla (${rig.vertices} ≠ ${n})`);
  const ind = bytes(rig.indices), pes = bytes(rig.pesos);
  geometria.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(ind), 4));
  geometria.setAttribute('skinWeight', new THREE.Float32BufferAttribute(Float32Array.from(pes, (v) => v / 255), 4));
  const mapa = malla.material.map;
  mapa.magFilter = THREE.LinearFilter;
  mapa.colorSpace = THREE.SRGBColorSpace;
  // Lambert como el resto del mundo, con un poco de luz propia para que no se pierda en la niebla. Doble cara: donde
  // se cortó la unión del brazo con el abrigo se ve el forro, no un agujero.
  const material = ps1Material(new THREE.MeshLambertMaterial({
    map: mapa, emissive: 0xffffff, emissiveMap: mapa, emissiveIntensity: 0.16, side: THREE.DoubleSide }));
  base = { geometria, material, rig };
  return base;
}

export function cuerpoListo() { return !!base; }

// un cuerpo con su propio esqueleto (la geometría y el material se comparten entre el jugador y su doble)
export function crearCuerpo3d() {
  const { rig } = base;
  const ALTO = rig.alto, J = rig.articulaciones, PADRE = rig.padres;
  const nombres = Object.keys(PADRE);   // en el mismo orden que los índices de los pesos
  const huesos = {};
  for (const nombre of nombres) {
    const h = new THREE.Bone(); h.name = nombre;
    const pj = J[nombre], pp = PADRE[nombre] ? J[PADRE[nombre]] : [0, 0, 0];
    h.position.set((pj[0] - pp[0]) * ALTO, (pj[1] - pp[1]) * ALTO, (pj[2] - pp[2]) * ALTO);
    if (PADRE[nombre]) huesos[PADRE[nombre]].add(h);
    huesos[nombre] = h;
  }
  const malla = new THREE.SkinnedMesh(base.geometria, base.material);
  malla.add(huesos.cadera);
  malla.updateMatrixWorld(true);
  malla.bind(new THREE.Skeleton(nombres.map((n) => huesos[n])));
  malla.frustumCulled = false;   // al caer o bailar sale de su caja original
  const alturaCadera = huesos.cadera.position.y;

  // la brasa del cigarro, en la mano izquierda
  const brasa = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), new THREE.MeshBasicMaterial({ color: 0xff5a1a }));
  const c = rig.cigarro, m = J.munecaI;
  brasa.position.set((c[0] - m[0]) * ALTO, (c[1] - m[1]) * ALTO, (c[2] - m[2]) * ALTO);
  huesos.munecaI.add(brasa);

  function reposo() {
    for (const n of nombres) huesos[n].rotation.set(0, 0, 0);
    huesos.cadera.position.y = alturaCadera;
    malla.rotation.set(0, 0, 0); malla.position.set(0, 0, 0);
  }

  // modo: 'quieto' | 'camina' | 'corre' | 'baila' | 'mira' | 'cae'; fase: ciclo del paso o del baile; t: reloj;
  // extra: 0..1 (en 'cae', cuánto ha caído).  Ejes: x+ dobla hacia atrás piernas y columna hacia adelante;
  // en brazos y muslos, x− lleva el miembro hacia adelante.
  function posar(modo, fase, t, extra = 0) {
    reposo();
    const H = huesos, s = Math.sin(fase), co = Math.cos(fase);
    H.pecho.rotation.x = Math.sin(t * 1.4) * 0.018;   // respira
    H.codoI.rotation.x = -0.1; H.codoD.rotation.x = -0.1;
    if (modo === 'camina' || modo === 'corre') {
      const corre = modo === 'corre';
      const A = corre ? 0.62 : 0.4;
      H.musloI.rotation.x = -s * A; H.musloD.rotation.x = s * A;
      H.rodillaI.rotation.x = 0.06 + Math.max(0, Math.sin(fase + 1.3)) * A * (corre ? 1.7 : 1.15);
      H.rodillaD.rotation.x = 0.06 + Math.max(0, Math.sin(fase + 1.3 + Math.PI)) * A * (corre ? 1.7 : 1.15);
      H.tobilloI.rotation.x = -Math.min(0, s) * 0.2; H.tobilloD.rotation.x = Math.max(0, s) * 0.2;
      const B = corre ? 0.5 : 0.24;
      H.hombroI.rotation.x = s * B; H.hombroD.rotation.x = -s * B;
      H.codoI.rotation.x = corre ? -1.1 : -0.18 - Math.max(0, -s) * 0.2;
      H.codoD.rotation.x = corre ? -1.1 : -0.18 - Math.max(0, s) * 0.2;
      H.cadera.position.y = alturaCadera - (corre ? 0.05 : 0.015) + Math.abs(co) * (corre ? 0.055 : 0.028);
      H.cadera.rotation.y = s * 0.08; H.columna.rotation.y = -s * 0.11;
      H.columna.rotation.x = corre ? 0.2 : 0.05;
      H.cabeza.rotation.x = corre ? -0.12 : 0.04;
      H.cuello.rotation.z = Math.sin(fase * 0.5) * 0.04;   // la cabeza se mece, cansada
    } else if (modo === 'quieto') {
      // mira alrededor despacio y, cada tanto, se lleva el cigarro a la boca
      H.cabeza.rotation.y = Math.sin(t * 0.37) * 0.28;
      H.cuello.rotation.x = 0.06 + Math.sin(t * 0.23) * 0.04;
      H.columna.rotation.z = Math.sin(t * 0.5) * 0.015;
      const ciclo = (t % 9) / 9;
      const fuma = suave(0.55, 0.65, ciclo) * (1 - suave(0.82, 0.92, ciclo));
      H.hombroI.rotation.x = -0.5 * fuma; H.hombroI.rotation.z = -0.3 * fuma;
      H.codoI.rotation.x = -0.1 - 1.95 * fuma;
      H.cabeza.rotation.y *= 1 - fuma; H.cabeza.rotation.x = -0.1 * fuma;
    } else if (modo === 'baila') {
      // codos arriba a la altura de la cara, rodillas al ritmo, la cadera gira
      H.hombroI.rotation.x = -0.9 + s * 0.25; H.hombroD.rotation.x = -0.9 - s * 0.25;
      H.hombroI.rotation.z = 0.25; H.hombroD.rotation.z = -0.25;
      H.codoI.rotation.x = -1.5 - Math.max(0, s) * 0.4; H.codoD.rotation.x = -1.5 - Math.max(0, -s) * 0.4;
      const rodilla = 0.2 + Math.abs(s) * 0.3;
      H.musloI.rotation.x = -rodilla * 0.6; H.musloD.rotation.x = -rodilla * 0.6;
      H.rodillaI.rotation.x = rodilla; H.rodillaD.rotation.x = rodilla;
      H.cadera.position.y = alturaCadera - Math.abs(s) * 0.06;
      H.cadera.rotation.y = Math.sin(fase * 0.5) * 0.3;
      H.columna.rotation.z = s * 0.1;
      H.cabeza.rotation.x = 0.15 + Math.abs(co) * 0.25;
    } else if (modo === 'mira') {
      // se detiene en seco, rígido, con la cabeza ladeada
      H.cabeza.rotation.z = 0.28; H.cabeza.rotation.x = 0.12;
    } else if (modo === 'cae') {
      // se le doblan las rodillas y cae de bruces, lejos de la cámara (que queda detrás); la cara de lado
      const e = suave(0, 0.4, extra), e2 = suave(0.3, 1, extra), dobla = e * (1 - e2);
      H.musloI.rotation.x = -1.0 * dobla; H.musloD.rotation.x = -0.8 * dobla;
      H.rodillaI.rotation.x = 1.5 * dobla + 0.25 * e2; H.rodillaD.rotation.x = 1.3 * dobla + 0.1 * e2;
      H.cadera.position.y = alturaCadera - 0.33 * dobla;
      H.columna.rotation.x = 0.4 * dobla;
      H.hombroI.rotation.z = 0.55 * e2; H.hombroD.rotation.z = -0.45 * e2;
      H.hombroI.rotation.x = -0.3 * e; H.hombroD.rotation.x = -0.4 * e;
      H.cabeza.rotation.y = 1.0 * e2;
      malla.rotation.x = 1.42 * e2;
      malla.position.set(0, 0.1 * e2, 0.2 * e2);
    }
  }

  return { malla, huesos, brasa, posar };
}
