// La ciudad, menos cuadrada y con más cosas que dan miedo (28-nov):
//   · la boca del muro este, al final de la calle central: de ahí sale la escalera al cerro (y se ve el cerro, con
//     sus ventanas y el sanatorio arriba, por encima del muro)
//   · techos distintos: estanques de agua, casetas, antenas y torres escalonadas sobre los edificios
//   · la población circular: casas en anillo alrededor de una cancha, todas con la puerta hacia el centro
//   · el edificio de las ventanas: sus luces dibujan a un hombre que gira la cabeza
//   · monstruos: la Procesión, el Paraguas y tres Testigos en las esquinas
import * as THREE from 'three';
import { material } from './ps1.js';
import { crearLote } from './lote.js';
import { azar, centroCalle, centroManzana } from './ciudad.js';
import { crearTestigo, crearProcesion, crearParaguas } from './monstruos.js';

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

export function crearBarrio(escena, ciudad) {
  const grupo = new THREE.Group(); escena.add(grupo);
  const r = azar(4413);
  const lote = crearLote();
  const concreto = material('t_concreto', [1, 1], { vertexColors: true });
  const oxido = material('t_oxido', [1, 1], { vertexColors: true });
  const calamina = material('t_calamina', [1, 1], { vertexColors: true });
  const luzMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const oscuro = new THREE.MeshBasicMaterial({ vertexColors: true });

  // ---------- techos: cada edificio recibe algo encima (así la ciudad no es una grilla de cubos)
  const edificios = new Map();
  for (const f of ciudad.fachadas) {
    if (f.cercada) continue;   // las manzanas cercadas (manzanas.js) no tienen techo
    const cx = Math.round(f.x - f.nx * f.largo / 2), cz = Math.round(f.z - f.nz * f.largo / 2);
    edificios.set(`${cx}:${cz}`, { cx, cz, alto: f.alto, lado: f.largo });
  }
  for (const e of edificios.values()) {
    const top = e.alto, tipo = r();
    if (tipo < 0.3) {   // torre escalonada
      const w = e.lado * (0.35 + r() * 0.25), h = 3.5 + r() * 7, ox = (r() - 0.5) * (e.lado - w) * 0.8, oz = (r() - 0.5) * (e.lado - w) * 0.8;
      lote.caja(concreto, w, h, w * (0.7 + r() * 0.5), e.cx + ox, top + h / 2, e.cz + oz, { tile: 3, color: 0x9a968c });
      if (r() < 0.5) lote.caja(oxido, 0.12, 5, 0.12, e.cx + ox, top + h + 2.5, e.cz + oz, { color: 0x555555 });
    } else if (tipo < 0.55) {   // estanque de agua sobre patas
      const x = e.cx + (r() - 0.5) * 6, z = e.cz + (r() - 0.5) * 6;
      for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) lote.caja(oxido, 0.15, 2.4, 0.15, x + dx, top + 1.2, z + dz, { color: 0x6a5a4a });
      lote.caja(oxido, 2.2, 2.0, 2.2, x, top + 3.4, z, { tile: 1.5, color: 0x8a7a6a });
    } else if (tipo < 0.8) {   // caseta de calamina con techo inclinado
      const x = e.cx + (r() - 0.5) * 5, z = e.cz + (r() - 0.5) * 5, w = 2.5 + r() * 2;
      lote.caja(calamina, w, 2.4, w * 0.8, x, top + 1.2, z, { tile: 2, color: [0xc8b878, 0x7a9ab8, 0xb86a5a][Math.floor(r() * 3)] });
      lote.caja(oxido, w + 0.4, 0.1, w * 0.8 + 0.4, x, top + 2.6, z, { color: 0x7a6a5a, rz: 0.25 });
    } else {   // bosque de antenas
      for (let k = 0; k < 4; k++) lote.caja(oxido, 0.08, 3 + r() * 5, 0.08, e.cx + (r() - 0.5) * 8, top + 3, e.cz + (r() - 0.5) * 8, { color: 0x4a4a4a });
    }
  }

  // ---------- la boca del cerro, en el muro este
  const boca = ciudad.sitios.bocaCerro, bz = boca.z;
  for (let k = 0; k < 8; k++) lote.caja(concreto, 1.0, 0.25 * (k + 1), 5.2, boca.x + 1.5 + k * 0.5, 0.125 * (k + 1), bz, { tile: 1.5, color: 0xa8a294 });
  lote.caja(concreto, 1, 12, 0.6, boca.x + 1, 6, bz - 2.9, { tile: 3, color: 0x8a8678 }); lote.caja(concreto, 1, 12, 0.6, boca.x + 1, 6, bz + 2.9, { tile: 3, color: 0x8a8678 });
  ciudad.colisiones.push({ x0: boca.x + 1.6, x1: boca.x + 6, z0: bz - 2.6, z1: bz + 2.6 });
  const letrero = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), new THREE.MeshBasicMaterial({ fog: false, map: lienzo(256, 84, (g, w, h) => {
    g.fillStyle = '#1e2a1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0dcc8'; g.textAlign = 'center';
    g.font = 'bold 17px "Courier New", monospace'; g.fillText('SANATORIO DE LA PENDIENTE', w / 2, 30);
    g.font = '15px "Courier New", monospace'; g.fillText('→ cerro · 137 peldaños · ascensor', w / 2, 58);
  }) }));
  letrero.position.set(boca.x - 0.2, 3.3, bz - 2.5); letrero.rotation.y = -Math.PI / 2; grupo.add(letrero);
  // el cerro detrás del muro: una silueta oscura con ventanas y el sanatorio arriba (siempre visible, sobre la niebla)
  const silueta = new THREE.MeshBasicMaterial({ color: 0x23282c, fog: false });
  const capas = [];
  for (let k = 0; k < 7; k++) {
    const x = 64 + k * 3.2, h = 14 + k * 4.2, largo = 90 - k * 8, zc = bz + (k % 2 ? 6 : -4);
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.3, h, largo), silueta); m.position.set(x, h / 2, zc); grupo.add(m);
    capas.push({ cara: x - 1.66, h, z0: zc - largo / 2, z1: zc + largo / 2 });
  }
  // ventanas en la cara oeste de cada escalón del cerro (la parte que asoma sobre el muro)
  for (let k = 0; k < 80; k++) {
    const c = capas[Math.floor(r() * capas.length)], prev = capas[capas.indexOf(c) - 1];
    const y = (prev ? prev.h : 0) + 0.8 + r() * (c.h - (prev ? prev.h : 0) - 1.6);
    lote.plano(luzMat, 0.6, 0.7, c.cara - 0.02, y, c.z0 + 2 + r() * (c.z1 - c.z0 - 4), { ry: -Math.PI / 2, color: [0xffc070, 0xffa850, 0xb0d0ff][Math.floor(r() * 3)] });
  }
  const sanatorioLejos = new THREE.Mesh(new THREE.BoxGeometry(5, 9, 16), silueta); sanatorioLejos.position.set(84, 44, bz); grupo.add(sanatorioLejos);
  for (let k = 0; k < 6; k++) lote.plano(luzMat, 0.8, 1.0, 81.45, 41 + (k % 2) * 3, bz - 5 + k * 2, { ry: -Math.PI / 2, color: k === 3 ? 0xff5040 : 0xd8e0a0 });
  const antenas = [];
  for (const dz of [-6, 6]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2010, fog: false }));
    a.position.set(84, 54, bz + dz); grupo.add(a); antenas.push(a);
  }

  // ---------- la población circular (manzana del este)
  const po = ciudad.sitios.poblacion;
  const cancha = new THREE.Mesh(new THREE.CircleGeometry(4.2, 20), new THREE.MeshLambertMaterial({ color: 0x5a4a38 }));
  cancha.rotation.x = -Math.PI / 2; cancha.position.set(po.x, 0.16, po.z); grupo.add(cancha);
  const puertas = [];
  const COLORES = [0xd8c27a, 0x7fa6c8, 0xc86a5a, 0x9ac08a, 0xd89a5a, 0xb08ac8, 0xe0e0d0, 0x6a8aa8];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2, x = po.x + Math.sin(a) * 5.4, z = po.z + Math.cos(a) * 5.4, ry = a + Math.PI;
    lote.caja(calamina, 2.6, 2.8, 2.2, x, 1.4, z, { tile: 2, color: COLORES[k], ry });
    lote.caja(oxido, 3.0, 0.1, 2.6, x, 3.0, z, { color: 0x7a6a5a, ry, rz: 0.2 });
    ciudad.colisiones.push({ x0: x - 1.25, x1: x + 1.25, z0: z - 1.25, z1: z + 1.25 });
    // la puerta, mirando al centro (con bisagra, para que se abra)
    const bis = new THREE.Group(); bis.position.set(x - Math.sin(a) * 1.11 + Math.cos(a) * 0.4, 0, z - Math.cos(a) * 1.11 - Math.sin(a) * 0.4);
    bis.rotation.y = ry; grupo.add(bis);
    const hoja = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.9), material('t_puerta', [1, 1], { color: 0x8a7a6a, side: THREE.DoubleSide }));
    hoja.position.set(-0.4, 0.95, 0.01); bis.add(hoja);
    const adentro = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.9), new THREE.MeshBasicMaterial({ color: 0xffb060 }));
    adentro.position.set(x - Math.sin(a) * 1.105, 0.95, z - Math.cos(a) * 1.105); adentro.rotation.y = ry; grupo.add(adentro);
    puertas.push({ bis, a, x, z });
  }
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.5, 0.15), material('t_cortina', [1, 3], { color: 0x444444 }));
  poste.position.set(po.x, 2.25, po.z); grupo.add(poste); ciudad.colisiones.push({ x0: po.x - 0.15, x1: po.x + 0.15, z0: po.z - 0.15, z1: po.z + 0.15 });
  const foco = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); foco.position.set(po.x, 4.5, po.z); grupo.add(foco);

  // ---------- el edificio de las ventanas
  const protegidos = [[0, 28.4], [15.6, 0], [0, -15.6], [-15.6, 46], [15.6, -20], [22, 28.4], [11, 22]];
  const libres = ciudad.fachadas.filter((f) => Math.abs(f.x) < 45 && Math.abs(f.z) < 45 && !protegidos.some(([x, z]) => Math.hypot(f.x - x, f.z - z) < 8))
    .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const cara = libres.find((f) => f.alto >= 17.4) ?? libres.find((f) => f.alto >= 14);
  const COLS = 6, FILAS = cara ? Math.min(7, Math.floor((cara.alto - 2) / 2.2)) : 0;
  const ventanas = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.3), new THREE.MeshBasicMaterial({ fog: false }), COLS * FILAS);
  const encendida = new THREE.Color(0xffc878), apagada = new THREE.Color(0x101214);
  if (cara) {
    const d = new THREE.Object3D(), ry = Math.atan2(cara.nx, cara.nz);
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
      const off = (c - (COLS - 1) / 2) * (cara.largo / COLS);
      d.position.set(cara.x + cara.nx * 0.08 + (cara.nz !== 0 ? off : 0), 2.4 + f * 2.2, cara.z + cara.nz * 0.08 + (cara.nx !== 0 ? off : 0));
      d.rotation.set(0, ry, 0); d.updateMatrix(); ventanas.setMatrixAt(f * COLS + c, d.matrix); ventanas.setColorAt(f * COLS + c, apagada);
    }
    grupo.add(ventanas);
  }
  // el hombre, en ventanas (de abajo hacia arriba): cabeza, hombros, cuerpo; luego gira la cabeza
  const HOMBRE = ['..##..', '..##..', '.####.', '######', '.####.', '.#..#.', '.#..#.'].reverse();
  const GIRA = ['..##..', '..##..', '.####.', '######', '.####.', '.#..#.', '.#..#.'].reverse().map((l, i) => (i >= 5 ? '...##.' : l));
  const vent = { estado: 'azar', t: 0, quieto: 0 };
  function pintarVentanas(patron) {
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
      const on = patron ? patron[f]?.[c] === '#' : r() < 0.22;
      ventanas.setColorAt(f * COLS + c, on ? encendida : apagada);
    }
    if (ventanas.instanceColor) ventanas.instanceColor.needsUpdate = true;
  }
  if (cara) pintarVentanas(null);

  lote.construir(grupo);

  // ---------- monstruos de la calle
  const procesion = crearProcesion(grupo, [{ x: centroCalle(1), z: -26 }, { x: centroCalle(1), z: 52 }], 9, 1.35);
  const paraguas = crearParaguas(grupo, centroManzana(4) - 7.5, centroManzana(0) - 7.5);
  const testigos = [[centroCalle(1) + 3.4, centroCalle(3) + 3.4], [centroCalle(4) - 3.4, centroCalle(2) + 3.4], [centroCalle(3) + 3.4, centroCalle(5) - 3.6]]
    .map(([x, z]) => { ciudad.colisiones.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 }); return crearTestigo(grupo, x, z, r() * 6); });
  const avisos = { procesion: false, paraguas: false, testigo: false };

  // devuelve { peligro }
  function actualizar(dt, t, jugador, camara, audio, ctx) {
    const pj = jugador.pos;
    let peligro = 0;
    antenas.forEach((a, i) => { a.visible = Math.sin(t * 2.2 + i * 1.7) > 0; });
    foco.material.color.setHex(Math.sin(t * 11) > -0.6 ? 0xfff0c0 : 0x332a1a);

    // la población: si te quedas en el centro, todas las puertas se abren a la vez
    const dPo = Math.hypot(pj.x - po.x, pj.z - po.z);
    if (dPo < 2.6 && jugador.velocidad === 0) vent.quietoPo = (vent.quietoPo || 0) + dt; else vent.quietoPo = Math.max(0, (vent.quietoPo || 0) - dt);
    const abre = Math.min(1, Math.max(0, (vent.quietoPo || 0) - 1.5) / 1.2);
    if (abre > 0 && !vent.crujio) { vent.crujio = true; audio.chirrido(); }
    if (abre === 0) vent.crujio = false;
    for (const p of puertas) p.bis.rotation.y = p.a + Math.PI + abre * 1.2;

    // las ventanas: si te detienes mirándolas, dibujan a un hombre que gira la cabeza
    if (cara) {
      const dx = cara.x - pj.x, dz = cara.z - pj.z, d = Math.hypot(dx, dz);
      const frente = (dx * Math.sin(jugador.yawCam) + dz * Math.cos(jugador.yawCam)) / Math.max(d, 0.1);
      const mirando = d < 26 && frente > 0.75 && jugador.velocidad === 0;
      vent.t += dt;
      if (vent.estado === 'azar') {
        vent.quieto = mirando ? vent.quieto + dt : 0;
        if (vent.t > 2.5) { vent.t = 0; pintarVentanas(null); }
        if (vent.quieto > 1.6) { vent.estado = 'hombre'; vent.t = 0; pintarVentanas(HOMBRE); audio.golpe(0.4); }
      } else if (vent.estado === 'hombre' && vent.t > 2.6) { vent.estado = 'gira'; vent.t = 0; pintarVentanas(GIRA); audio.tecla(); }
      else if (vent.estado === 'gira' && vent.t > 1.8) { vent.estado = 'nada'; vent.t = 0; pintarVentanas([]); audio.golpe(0.7); ctx.estadoJuego.susto(0.4); }
      else if (vent.estado === 'nada' && vent.t > 3) { vent.estado = 'azar'; vent.t = 0; vent.quieto = -20; pintarVentanas(null); }
    }

    if (ctx.tranquilo) return { peligro };
    // la Procesión: hay que esperar a que pase
    procesion.distancia = Math.hypot(pj.x - procesion.g.position.x, pj.z - procesion.g.position.z);
    procesion.actualizar(dt, audio);
    if (procesion.distancia < 15) {
      peligro = Math.max(peligro, 0.5 * (1 - procesion.distancia / 15));
      if (!avisos.procesion) { avisos.procesion = true; ctx.hud.limpiar(); ctx.hud.decir('Algo marcha por la calle, con muchas piernas.\nEspera a que pase. No la toques.', 4.5); }
    }
    if (procesion.toca(pj)) ctx.estadoJuego.capturado();
    // el Paraguas: oye el movimiento
    const dPa = paraguas.actualizar(dt, pj, jugador.velocidad > 0, ciudad.colisiones, audio);
    if (dPa < 12 && !avisos.paraguas) { avisos.paraguas = true; ctx.hud.limpiar(); ctx.hud.decir('Un paraguas camina solo.\nSi te mueves, te oye: QUÉDATE QUIETO hasta que pase.', 5); }
    if (paraguas.estado === 'caza') peligro = Math.max(peligro, 0.7);
    if (dPa < 0.8) ctx.estadoJuego.capturado();
    // los Testigos: si te miran mucho rato, la sombra sabe dónde estás
    for (const w of testigos) {
      if (w.actualizar(dt, pj, 13)) {
        audio.obturador(pj, 4); ctx.estadoJuego.susto(0.5);
        ctx.siniestro.sombra.forzar = true; ctx.siniestro.sombra.espera = 0;
        ctx.hud.limpiar(); ctx.hud.decir(avisos.testigo ? 'Clic.' : 'Clic. Te sacaron una foto.\nAhora la sombra sabe dónde estás. No te quedes frente a los que no tienen cara.', avisos.testigo ? 1.5 : 5);
        avisos.testigo = true;
      }
    }
    return { peligro };
  }
  function reiniciar() {
    avisos.procesion = avisos.paraguas = false;
    paraguas.g.position.set(centroManzana(4) - 7.5, 0, centroManzana(0) - 7.5); paraguas.estado = 'pasea';
  }

  function registrar(interaccion, ctx) {
    interaccion.agregar({ zona: 'ciudad', pos: { x: boca.x - 1.2, z: bz }, radio: 2.6, prioridad: 2, etiqueta: 'subir al cerro (el sanatorio)', accion: () => { ctx.irA('cerro', 'abajo'); return null; } });
    interaccion.agregar({ zona: 'ciudad', pos: { x: po.x, z: po.z + 2.8 }, radio: 2.4, etiqueta: 'golpear una puerta', accion: () => {
      for (const p of puertas) ctx.audio.golpes(new THREE.Vector3(p.x, 1.2, p.z), Math.hypot(ctx.jugador().x - p.x, ctx.jugador().z - p.z));
      return 'Golpeas una puerta.\nTe contestan las ocho al mismo tiempo.';
    } });
    interaccion.agregar({ zona: 'ciudad', pos: () => paraguas.g.position, radio: 1.6, etiqueta: 'mirar bajo el paraguas', activo: () => paraguas.estado === 'pasea',
      accion: () => 'No hay nadie bajo el paraguas.\nSólo dos piernas y una radio colgando, en 31.7.' });
  }

  return { actualizar, reiniciar, registrar, sitios: { boca, poblacion: po, ventanas: cara }, depurar: { procesion, paraguas, testigos, vent } };
}
