// El canal: parte la ciudad en dos (al norte quedan el portón y la fábrica). Agua quieta y sucia dos metros abajo,
// muros de hormigón, barandas oxidadas y un solo puente, con un farol que falla. En el agua flota, boca abajo, un
// hombre de abrigo verde: tú. Se deja llevar despacio y, cuando pasas por el puente, se da vuelta.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { material, ps1Material } from './ps1.js';
import { CANAL, LADO } from './ciudad.js';
import { cuerpoListo, crearCuerpo3d } from './cuerpo.js';

const AGUA_Y = -1.35, FONDO = -2.0;

function texturaAgua() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1d2418'; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 900; k++) {
    const v = Math.random();
    g.fillStyle = v < 0.5 ? `rgba(60,72,44,${0.25 + Math.random() * 0.3})` : `rgba(10,12,8,${0.3 + Math.random() * 0.4})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 9, 1 + Math.random() * 2);
  }
  // espuma y aceite
  for (let k = 0; k < 40; k++) {
    g.fillStyle = `rgba(${150 + Math.random() * 60},${140 + Math.random() * 40},${100},0.18)`;
    g.beginPath(); g.ellipse(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 6, 1 + Math.random() * 2, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(LADO / 6, 1);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

export function crearCanal(escena, ciudad) {
  const grupo = new THREE.Group(); escena.add(grupo);
  const { z0, z1, puente } = CANAL;
  const ancho = z1 - z0, zc = (z0 + z1) / 2, largo = LADO + 2;
  const hormigon = material('t_concreto', [largo / 4, 0.6], { color: 0x7a7468 });
  const oxido = material('t_oxido', [1, 1]);

  // agua, fondo y muros
  const mapaAgua = texturaAgua();
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(largo, ancho), ps1Material(new THREE.MeshLambertMaterial({
    map: mapaAgua, emissive: 0x0c120a, color: 0x8a9a7a, transparent: true, opacity: 0.86, depthWrite: false })));   // se adivina lo que hay abajo
  agua.rotation.x = -Math.PI / 2; agua.position.set(0, AGUA_Y, zc);
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(largo, ancho), new THREE.MeshBasicMaterial({ color: 0x050604 }));
  fondo.rotation.x = -Math.PI / 2; fondo.position.set(0, FONDO, zc);
  grupo.add(agua, fondo);
  for (const z of [z0, z1]) {
    const muro = new THREE.Mesh(new THREE.BoxGeometry(largo, -FONDO, 0.3), hormigon);
    muro.position.set(0, FONDO / 2, z + (z === z0 ? -0.15 : 0.15));
    grupo.add(muro);
  }
  for (const x of [-LADO / 2 - 0.3, LADO / 2 + 0.3]) {
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, ancho + 0.6), hormigon);
    tapa.position.set(x, 5, zc); grupo.add(tapa);
  }
  // musgo y un hilo de agua que cae de un tubo
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8), oxido);
  tubo.rotation.x = Math.PI / 2; tubo.position.set(-20, -0.6, z1 + 0.1); grupo.add(tubo);
  const chorro = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.8), new THREE.MeshBasicMaterial({ color: 0x5a6a48, transparent: true, opacity: 0.6 }));
  chorro.position.set(-20, -1.0, z1 - 0.25); grupo.add(chorro);

  // barandas a ambos lados (con hueco en el puente) y sus choques (bajos: la cámara pasa por encima)
  const piezas = [];
  for (const z of [z0 - 0.1, z1 + 0.1]) {
    for (const [a, b] of [[-LADO / 2, puente.x0], [puente.x1, LADO / 2]]) {
      const l = b - a, cx = (a + b) / 2;
      const riel = new THREE.BoxGeometry(l, 0.06, 0.06); riel.translate(cx, 1.0, z); piezas.push(riel);
      const medio = new THREE.BoxGeometry(l, 0.04, 0.04); medio.translate(cx, 0.55, z); piezas.push(medio);
      for (let x = a + 0.2; x < b; x += 2) { const p = new THREE.BoxGeometry(0.06, 1.0, 0.06); p.translate(x, 0.5, z); piezas.push(p); }
    }
  }
  // el agua no se pisa: dos franjas, de cada muro hasta el puente
  ciudad.colisiones.push(
    { x0: -LADO / 2 - 2, x1: puente.x0, z0: z0 - 0.15, z1: z1 + 0.15, bajo: true },
    { x0: puente.x1, x1: LADO / 2 + 2, z0: z0 - 0.15, z1: z1 + 0.15, bajo: true });
  // el puente: losa, barandas propias y un farol que falla
  const losa = new THREE.Mesh(new THREE.BoxGeometry(puente.x1 - puente.x0 + 0.4, 0.35, ancho + 1.2), material('t_concreto', [1.5, 2], { color: 0x6e6a60 }));
  losa.position.set(puente.x, -0.02, zc); grupo.add(losa);
  const vientre = new THREE.Mesh(new THREE.BoxGeometry(puente.x1 - puente.x0 + 0.4, 0.9, ancho - 0.4), hormigon);
  vientre.position.set(puente.x, -0.6, zc); grupo.add(vientre);
  for (const x of [puente.x0, puente.x1]) {
    const riel = new THREE.BoxGeometry(0.08, 0.08, ancho + 1.2); riel.translate(x, 1.05, zc); piezas.push(riel);
    for (let z = z0 - 0.5; z <= z1 + 0.6; z += 1.4) { const p = new THREE.BoxGeometry(0.07, 1.05, 0.07); p.translate(x, 0.52, z); piezas.push(p); }
    ciudad.colisiones.push({ x0: x - 0.12, x1: x + 0.12, z0: z0 - 0.15, z1: z1 + 0.15, bajo: true });
  }
  grupo.add(new THREE.Mesh(mergeGeometries(piezas), oxido));
  const posteFarol = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), oxido);
  posteFarol.position.set(puente.x0 + 0.25, 2.1, zc); grupo.add(posteFarol);
  const ampolleta = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.25), new THREE.MeshBasicMaterial({ color: 0xffc070, fog: false }));
  ampolleta.position.set(puente.x0 + 0.6, 4.15, zc); grupo.add(ampolleta);
  // zapatos colgando del cable del farol (un par, atados por los cordones)
  const zapato = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.28), ps1Material(new THREE.MeshLambertMaterial({ color: 0x1a1612 })));
  const otro = zapato.clone();
  zapato.position.set(puente.x0 + 1.3, 3.2, zc - 0.1); otro.position.set(puente.x0 + 1.45, 3.05, zc + 0.12);
  grupo.add(zapato, otro);

  // tu cuerpo, boca abajo, a la deriva (se arma cuando el modelo 3D ya cargó)
  let ahogado = null;
  function armarAhogado() {
    const c = crearCuerpo3d();
    c.brasa.visible = false;
    const raiz = new THREE.Group(); raiz.add(c.malla);
    raiz.rotation.y = Math.PI / 2;
    grupo.add(raiz);
    ahogado = { c, raiz, x: puente.x - 9, dir: 1, vuelto: 0 };
  }

  function actualizar(dt, t, jugador) {
    mapaAgua.offset.x += dt * 0.012;
    ampolleta.visible = Math.sin(t * 7.3) > -0.6 || Math.random() < 0.2;
    zapato.rotation.y = Math.sin(t * 0.8) * 0.4; otro.rotation.y = Math.sin(t * 0.8 + 1) * 0.4;
    if (!ahogado && cuerpoListo()) armarAhogado();
    if (!ahogado) return;
    const pj = jugador.pos;
    const enPuente = Math.abs(pj.x - puente.x) < 2.6 && pj.z > z0 - 0.5 && pj.z < z1 + 0.5;
    // se deja llevar de un lado a otro del puente, sin alejarse mucho; al pasar tú, se da vuelta y te mira
    ahogado.x += ahogado.dir * dt * 0.22;
    if (ahogado.x > puente.x + 9) ahogado.dir = -1;
    if (ahogado.x < puente.x - 14) ahogado.dir = 1;
    ahogado.vuelto = Math.max(0, Math.min(1, ahogado.vuelto + (enPuente ? dt * 0.4 : -dt * 0.15)));
    ahogado.raiz.position.set(ahogado.x, AGUA_Y + 0.16 + Math.sin(t * 0.9) * 0.03, zc + 1.2);   // la espalda asoma
    ahogado.c.posar('cae', 0, t, 1);
    // boca abajo → boca arriba: rueda sobre su propio largo
    ahogado.c.malla.rotation.y = Math.PI * ahogado.vuelto;
  }

  return { actualizar, depurar: { agua, losa, get ahogado() { return ahogado; } } };
}
