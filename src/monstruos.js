// Monstruos nuevos (28-nov, ideas de la lluvia de ideas con ChatGPT, imágenes de Flow):
//   Testigo    una copia tuya con uniforme de hospital y una placa blanca en vez de cara. No camina: gira hacia ti.
//              Si te mira mucho rato, se oye un obturador y la sombra sabe dónde estás.
//   Procesión  muchas piernas bajo una tela negra, marchando al unísono por una ruta fija. Hay que esperar a que pase.
//   Paraguas   un paraguas negro con dos piernas flacas y pasos rapidísimos. Oye el movimiento: quieto, pasa de largo.
//   Gatea      la paciente del sanatorio (modelo de TRELLIS sacado de una imagen de Flow): a cuatro patas, rápida.
// Todos dicen qué hacer la primera vez que aparecen (el aviso lo da quien los usa).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cuerpoListo, crearCuerpo3d } from './cuerpo.js';

const modelos = {};
export function cargarMonstruo(nombre) {
  modelos[nombre] ||= new GLTFLoader().loadAsync(`/assets/m_${nombre}.glb`).then((g) => {
    let malla = null;
    g.scene.traverse((o) => { if (o.isMesh && !malla) malla = o; });
    const mapa = malla.material.map;
    if (mapa) { mapa.colorSpace = THREE.SRGBColorSpace; mapa.magFilter = THREE.NearestFilter; }
    const mat = new THREE.MeshLambertMaterial({ map: mapa, emissive: 0xffffff, emissiveMap: mapa, emissiveIntensity: 0.1, side: THREE.DoubleSide });
    return { geometria: malla.geometry, mat };
  }).catch((e) => { console.warn('sin modelo', nombre, e); return null; });
  return modelos[nombre];
}

const negro = new THREE.MeshLambertMaterial({ color: 0x0c0c0e });
const piel = new THREE.MeshLambertMaterial({ color: 0x8a8478 });
const caja = new THREE.BoxGeometry(1, 1, 1);
function pieza(g, mat, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(caja, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; }
const angulo = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- el Testigo
const matTestigo = new THREE.MeshLambertMaterial({ color: 0x8c9a86 });
const placa = new THREE.MeshBasicMaterial({ color: 0xe8e6dc });
export function crearTestigo(padre, x, z, rot = 0, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; padre.add(g);
  if (cuerpoListo()) {
    // el cuerpo del protagonista, teñido de uniforme gris verdoso: es una de sus copias
    const c = crearCuerpo3d();
    const m = c.malla.material.clone(); m.color = new THREE.Color(0xa8b4a0); m.emissiveIntensity = 0.14;
    c.malla.material = m; c.brasa.visible = false;
    g.add(c.malla);
    const cara = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.25, 0.03), placa);
    cara.position.set(0, 0.1, 0.1); c.huesos.cabeza.add(cara);
  } else {
    pieza(g, matTestigo, 0, 1.0, 0, 0.42, 0.95, 0.24);
    pieza(g, matTestigo, -0.12, 0.38, 0, 0.13, 0.76, 0.15); pieza(g, matTestigo, 0.12, 0.38, 0, 0.13, 0.76, 0.15);
    pieza(g, piel, 0, 1.68, 0, 0.18, 0.24, 0.18); pieza(g, placa, 0, 1.68, 0.1, 0.2, 0.26, 0.02);
  }
  const t = { g, mira: 0, disparos: 0, giro: 0.55 };
  // gira (sin caminar) hacia el jugador; devuelve true en el instante en que «saca la foto»
  const mundo = new THREE.Vector3();
  t.actualizar = (dt, pj, alcance = 14) => {
    g.getWorldPosition(mundo);
    const dx = pj.x - mundo.x, dz = pj.z - mundo.z, d = Math.hypot(dx, dz);
    if (d > alcance) { t.mira = Math.max(0, t.mira - dt); return false; }
    const objetivo = Math.atan2(dx, dz), dif = angulo(objetivo - g.rotation.y);
    g.rotation.y += Math.sign(dif) * Math.min(Math.abs(dif), t.giro * dt);
    if (Math.abs(dif) < 0.25) t.mira += dt; else t.mira = Math.max(0, t.mira - dt * 0.5);
    if (t.mira > 3.2) { t.mira = -6; t.disparos++; return true; }
    return false;
  };
  return t;
}

// ---------------------------------------------------------------- la Procesión
const tela = new THREE.MeshLambertMaterial({ color: 0x08080a });
const pierna = new THREE.MeshLambertMaterial({ color: 0x6e665c });
const zapato = new THREE.MeshLambertMaterial({ color: 0x141210 });
// ruta: lista de puntos {x, z}; va y vuelve por ella
export function crearProcesion(padre, ruta, pares = 9, vel = 1.35) {
  const g = new THREE.Group(); padre.add(g);
  const LARGO = pares * 0.62;
  const cuerpo = pieza(g, tela, 0, 1.45, 0, 0.95, 0.85, LARGO + 0.5);
  // la tela cae en pliegues por los lados
  for (const s of [-1, 1]) { const f = pieza(g, tela, s * 0.5, 0.95, 0, 0.06, 0.55, LARGO + 0.4); f.rotation.z = s * 0.12; }
  pieza(g, tela, 0, 1.95, LARGO / 2 + 0.1, 0.5, 0.3, 0.4);   // algo como una cabeza, adelante, bajo la tela
  // piernas y zapatos: dos mallas de copias (antes, 36 mallas); cada pierna gira desde la cadera
  const piernas = [];
  const mPiernas = new THREE.InstancedMesh(caja, pierna, pares * 2), mZapatos = new THREE.InstancedMesh(caja, zapato, pares * 2);
  mPiernas.frustumCulled = mZapatos.frustumCulled = false; g.add(mPiernas, mZapatos);
  const hueso = (x, y, z, sx, sy, sz) => { const o = new THREE.Object3D(); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.updateMatrix(); return o; };
  const hPierna = hueso(0, -0.5, 0, 0.11, 1.0, 0.12), hZapato = hueso(0, -1.0, 0.06, 0.13, 0.08, 0.26), mm = new THREE.Matrix4();
  for (let k = 0; k < pares; k++) {
    for (const s of [-1, 1]) {
      const p = new THREE.Object3D(); p.position.set(s * 0.2, 1.05, -LARGO / 2 + 0.3 + k * 0.62);
      piernas.push({ p, s });
    }
  }
  const moverPiernas = () => {
    piernas.forEach(({ p }, i) => { p.updateMatrix(); mPiernas.setMatrixAt(i, mm.multiplyMatrices(p.matrix, hPierna.matrix)); mZapatos.setMatrixAt(i, mm.multiplyMatrices(p.matrix, hZapato.matrix)); });
    mPiernas.instanceMatrix.needsUpdate = true; mZapatos.instanceMatrix.needsUpdate = true;
  };
  moverPiernas();
  const pr = { g, ruta, tramo: 0, sentido: 1, t: 0, fase: 0, pasoPrevio: 0, vel, largo: LARGO };
  g.position.set(ruta[0].x, 0, ruta[0].z);
  pr.actualizar = (dt, audio) => {
    const a = ruta[pr.tramo], b = ruta[pr.tramo + pr.sentido];
    if (!b) { pr.sentido *= -1; return; }
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
    pr.t += (vel * dt) / L;
    if (pr.t >= 1) { pr.t = 0; pr.tramo += pr.sentido; if (!ruta[pr.tramo + pr.sentido]) pr.sentido *= -1; return; }
    g.position.set(a.x + dx * pr.t, 0, a.z + dz * pr.t);
    g.rotation.y += angulo(Math.atan2(dx, dz) - g.rotation.y) * Math.min(1, dt * 3);
    // todas las piernas al mismo tiempo: izquierdas, luego derechas
    pr.fase += dt * vel * 3.2;
    for (const { p, s } of piernas) p.rotation.x = Math.sin(pr.fase + (s > 0 ? Math.PI : 0)) * 0.42;
    moverPiernas();
    cuerpo.position.y = 1.45 + Math.abs(Math.sin(pr.fase)) * 0.05;
    const paso = Math.sign(Math.sin(pr.fase));
    if (paso !== pr.pasoPrevio) { pr.pasoPrevio = paso; if (audio) audio.golpes(g.position, pr.distancia ?? 10); }
  };
  // ¿toca al jugador? (una caja a lo largo de la marcha)
  pr.toca = (pj) => {
    const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
    const lx = (pj.x - g.position.x) * c - (pj.z - g.position.z) * s, lz = (pj.x - g.position.x) * s + (pj.z - g.position.z) * c;
    return Math.abs(lx) < 0.75 && Math.abs(lz) < LARGO / 2 + 0.6;
  };
  return pr;
}

// ---------------------------------------------------------------- el Paraguas
const tela2 = new THREE.MeshLambertMaterial({ color: 0x050506, side: THREE.DoubleSide });
export function crearParaguas(padre, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); padre.add(g);
  const copa = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.55, 8, 1, true), tela2); copa.position.y = 1.62; g.add(copa);
  pieza(g, negro, 0, 1.2, 0, 0.03, 0.9, 0.03);
  const pies = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 0.1, 0.92, 0); g.add(p);
    pieza(p, piel, 0, -0.45, 0, 0.05, 0.9, 0.05); pieza(p, negro, 0, -0.9, 0.05, 0.08, 0.05, 0.16);
    pies.push({ p, s });
  }
  const pa = { g, estado: 'pasea', fase: 0, rumbo: Math.random() * 6.28, cambio: 0, pasoPrevio: 0 };
  // se mueve a pasos diminutos y rápidos; si oye que te mueves cerca, corre hacia ti
  pa.actualizar = (dt, pj, moviendose, colisiones, audio) => {
    const dx = pj.x - g.position.x, dz = pj.z - g.position.z, d = Math.hypot(dx, dz);
    if (pa.estado === 'pasea' && moviendose && d < 9) pa.estado = 'caza';
    if (pa.estado === 'caza' && (!moviendose && d > 2.5 || d > 16)) pa.estado = 'pasea';
    let vel = 1.6;
    if (pa.estado === 'caza') { pa.rumbo = Math.atan2(dx, dz); vel = 5.2; }
    else { pa.cambio -= dt; if (pa.cambio <= 0) { pa.cambio = 2 + Math.random() * 3; pa.rumbo += (Math.random() - 0.5) * 2.4; } }
    const nx = g.position.x + Math.sin(pa.rumbo) * vel * dt, nz = g.position.z + Math.cos(pa.rumbo) * vel * dt;
    const choca = colisiones.some((c) => !c.soloCamara && nx > c.x0 - 0.3 && nx < c.x1 + 0.3 && nz > c.z0 - 0.3 && nz < c.z1 + 0.3);
    if (choca) pa.rumbo += Math.PI * (0.5 + Math.random()); else g.position.set(nx, 0, nz);
    g.rotation.y = pa.rumbo;
    pa.fase += dt * vel * 7;
    for (const { p, s } of pies) p.rotation.x = Math.sin(pa.fase + (s > 0 ? Math.PI : 0)) * 0.5;
    copa.rotation.y += dt * (pa.estado === 'caza' ? 6 : 0.6);
    const paso = Math.sign(Math.sin(pa.fase));
    if (paso !== pa.pasoPrevio) { pa.pasoPrevio = paso; if (audio && d < 14) audio.patitas(d); }
    return d;
  };
  return pa;
}

// ---------------------------------------------------------------- la que gatea
export function crearGatea(padre) {
  const g = new THREE.Group(); padre.add(g);
  const cuerpo = new THREE.Group(); g.add(cuerpo);
  // mientras carga el modelo, una figura de cajas a cuatro patas
  const provisoria = new THREE.Group(); cuerpo.add(provisoria);
  const bata = new THREE.MeshLambertMaterial({ color: 0x6e6c66 });
  pieza(provisoria, bata, 0, 0.7, 0, 0.4, 0.3, 0.9);
  pieza(provisoria, negro, 0, 0.62, 0.55, 0.26, 0.3, 0.3);
  for (const [x, z] of [[-0.22, 0.4], [0.22, 0.4], [-0.22, -0.4], [0.22, -0.4]]) pieza(provisoria, piel, x, 0.35, z, 0.08, 0.7, 0.08);
  cargarMonstruo('gatea').then((m) => {
    if (!m) return;
    const malla = new THREE.Mesh(m.geometria, m.mat);
    malla.rotation.y = GATEA_GIRO;
    cuerpo.remove(provisoria); cuerpo.add(malla);
  });
  const ga = { g, fase: 0, sacudida: 0 };
  // animación de cuerpo rígido: cabeceo, balanceo y tirones (como un muñeco mal hecho)
  ga.animar = (dt, vel) => {
    ga.fase += dt * (1.5 + vel * 2.6);
    cuerpo.position.y = Math.abs(Math.sin(ga.fase)) * 0.07 * Math.min(1, vel);
    cuerpo.rotation.z = Math.sin(ga.fase) * 0.09 * Math.min(1, vel + 0.2);
    cuerpo.rotation.x = Math.sin(ga.fase * 2) * 0.04;
    ga.sacudida -= dt;
    if (ga.sacudida <= 0) { ga.sacudida = 0.4 + Math.random() * 1.6; cuerpo.rotation.y = (Math.random() - 0.5) * 0.5; }
    else cuerpo.rotation.y *= 1 - Math.min(1, dt * 6);
  };
  return ga;
}
// hacia dónde mira la malla de TRELLIS (se ajusta mirándola en una captura)
export const GATEA_GIRO = 0;
