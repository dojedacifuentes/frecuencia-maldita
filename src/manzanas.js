// Tres manzanas que eran edificios de relleno (28-nov, «menos edificios de relleno»). Cada una queda rodeada por un muro
// bajo (ahí siguen pegadas las manchas, frases y viejas que ya estaban en sus caras) y tiene algo distinto adentro:
//   juegos  una plaza de juegos oxidada junto al baño: un columpio se mece solo y se detiene en el aire si entras;
//           el carrusel gira despacio sin nadie.
//   obra    una obra gruesa de cinco pisos (columnas, losas y fierros). Hay alguien parado en el borde de arriba:
//           si lo miras mucho rato, desaparece... y está detrás de ti.
//   autos   un sitio de autos quemados. Uno prende los focos y toca la bocina cuando te acercas: hay alguien al volante.
import * as THREE from 'three';
import { material } from './ps1.js';
import { crearLote } from './lote.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { montarAuto, prepararAutos } from './autos.js';
import { cuerpoListo, crearCuerpo3d } from './cuerpo.js';

const ALTO_MURO = 2.6, GROSOR = 0.3;

export function crearManzanas(escena, ciudad) {
  const C = ciudad.sitios.cercadas;
  const grupo = new THREE.Group(); escena.add(grupo);
  const lote = crearLote();
  const M = {
    ladrillo: material('t_ladrillo', [1, 1], { vertexColors: true }),
    calamina: material('t_calamina', [1, 1], { vertexColors: true }),
    concreto: material('t_concreto', [1, 1], { vertexColors: true }),
    oxido: material('t_oxido', [1, 1], { vertexColors: true }),
    oscuro: new THREE.MeshLambertMaterial({ vertexColors: true }),
  };
  const col = ciudad.colisiones;
  const choque = (x0, x1, z0, z1) => col.push({ x0, x1, z0, z1 });

  // el muro bajo alrededor de la manzana, con una entrada (lado: 'N' | 'S' | 'E' | 'O'; a: corrida del centro)
  function muro(s, mat, entrada, color = 0xffffff) {
    const h = s.lado / 2;
    const lados = {
      S: { eje: 'x', fijo: s.z + h - GROSOR / 2 }, N: { eje: 'x', fijo: s.z - h + GROSOR / 2 },
      E: { eje: 'z', fijo: s.x + h - GROSOR / 2 }, O: { eje: 'z', fijo: s.x - h + GROSOR / 2 },
    };
    for (const [k, l] of Object.entries(lados)) {
      const centro = l.eje === 'x' ? s.x : s.z;
      const tramos = [[centro - h, centro + h]];
      if (entrada.lado === k) {
        const a = centro + entrada.a, m = entrada.ancho / 2;
        tramos.splice(0, 1, [centro - h, a - m], [a + m, centro + h]);
        // pilares de la entrada
        for (const p of [a - m, a + m]) {
          const [px, pz] = l.eje === 'x' ? [p, l.fijo] : [l.fijo, p];
          lote.caja(M.concreto, 0.45, ALTO_MURO + 0.5, 0.45, px, (ALTO_MURO + 0.5) / 2, pz, { tile: 1.2, color: 0x8a867c });
        }
      }
      for (const [a0, a1] of tramos) {
        const largo = a1 - a0, mid = (a0 + a1) / 2;
        if (largo <= 0.05) continue;
        if (l.eje === 'x') { lote.caja(mat, largo, ALTO_MURO, GROSOR, mid, ALTO_MURO / 2, l.fijo, { tile: 2.2, color }); choque(a0, a1, l.fijo - GROSOR / 2, l.fijo + GROSOR / 2); }
        else { lote.caja(mat, GROSOR, ALTO_MURO, largo, l.fijo, ALTO_MURO / 2, mid, { tile: 2.2, color }); choque(l.fijo - GROSOR / 2, l.fijo + GROSOR / 2, a0, a1); }
      }
    }
  }
  const dentro = (s, p, m = 0) => Math.abs(p.x - s.x) < s.lado / 2 - m && Math.abs(p.z - s.z) < s.lado / 2 - m;

  // una silueta: el cuerpo del protagonista, negro y sin brillo
  const matSombra = new THREE.MeshLambertMaterial({ color: 0x050505 });
  function silueta() {
    if (!cuerpoListo()) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.75, 0.25), matSombra); m.position.y = 0.88; g.add(m);
      return { malla: g, huesos: null, posar: () => {} };
    }
    const c = crearCuerpo3d();
    c.malla.material = matSombra; c.brasa.visible = false;
    return c;
  }

  // =========================================================== la plaza de juegos
  const J = C.juegos;
  const juegos = {};
  if (J) {
    muro(J, M.ladrillo, { lado: 'O', a: 3.4, ancho: 2.6 }, 0xb8aa9a);
    const zc = J.z - 2.2;
    // armazón de los columpios: dos A y la barra de arriba
    for (const dx of [-3.4, 3.4]) {
      for (const s of [-1, 1]) lote.caja(M.oxido, 0.09, 3.0, 0.09, J.x + dx, 1.45, zc + s * 0.6, { rx: -s * 0.22, color: 0x9a6a4a });
      choque(J.x + dx - 0.15, J.x + dx + 0.15, zc - 0.9, zc + 0.9);
    }
    lote.caja(M.oxido, 7.0, 0.1, 0.1, J.x, 2.85, zc, { color: 0x9a6a4a });
    const columpios = [];
    const matAsiento = new THREE.MeshLambertMaterial({ color: 0x3a2a22 }), matCadena = new THREE.MeshLambertMaterial({ color: 0x55504a });
    for (const [k, dx] of [[0, -2.1], [1, 0], [2, 2.1]]) {
      const p = new THREE.Group(); p.position.set(J.x + dx, 2.8, zc); grupo.add(p);
      for (const s of [-0.24, 0.24]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.2, 0.02), matCadena); c.position.set(s, -1.1, 0); p.add(c); }
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.22), matAsiento); a.position.y = -2.2; p.add(a);
      columpios.push({ p, fase: k * 1.7, solo: k === 1 });
    }
    // resbalín
    const rx = J.x + 3.2, rz = J.z + 3.2;
    for (const s of [-0.35, 0.35]) lote.caja(M.oxido, 0.07, 2.1, 0.07, rx + s, 1.05, rz - 1.6, { color: 0x7a5a42 });
    for (let y = 0.4; y < 2; y += 0.4) lote.caja(M.oxido, 0.7, 0.04, 0.05, rx, y, rz - 1.6, { color: 0x7a5a42 });
    lote.caja(M.oxido, 0.75, 0.06, 1.0, rx, 2.05, rz - 1.25, { color: 0x7a5a42 });
    lote.caja(M.concreto, 0.7, 0.05, 3.2, rx, 1.05, rz + 0.1, { rx: -0.62, color: 0x8a8a7a });
    choque(rx - 0.45, rx + 0.45, rz - 1.8, rz + 1.4);
    // carrusel
    const carrusel = new THREE.Group(); carrusel.position.set(J.x - 3.2, 0.14, J.z + 2.6); grupo.add(carrusel);
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.12, 14), M.oxido); disco.position.y = 0.3; carrusel.add(disco);
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), matCadena);
      b.position.set(Math.cos(k * Math.PI / 2) * 1.1, 0.8, Math.sin(k * Math.PI / 2) * 1.1); carrusel.add(b);
    }
    choque(J.x - 4.7, J.x - 1.7, J.z + 1.1, J.z + 4.1);
    Object.assign(juegos, { columpios, carrusel, quieto: false, chirrido: 0 });
  }

  // =========================================================== la obra gruesa
  const O = C.obra;
  const obra = {};
  if (O) {
    muro(O, M.calamina, { lado: 'E', a: -2.2, ancho: 2.6 }, 0x8a8478);
    const PISOS = 5, ALTO_PISO = 3.2;
    for (const dx of [-4.6, 0, 4.6]) for (const dz of [-4.6, 0, 4.6]) {
      const alto = PISOS * ALTO_PISO - (dx === 4.6 && dz === -4.6 ? ALTO_PISO : 0);
      lote.caja(M.concreto, 0.42, alto, 0.42, O.x + dx, alto / 2, O.z + dz, { tile: 1.6, color: 0x9c988e });
      choque(O.x + dx - 0.25, O.x + dx + 0.25, O.z + dz - 0.25, O.z + dz + 0.25);
      for (const [fx, fz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) lote.caja(M.oscuro, 0.03, 1.3, 0.03, O.x + dx + fx, alto + 0.6, O.z + dz + fz, { color: 0x3a2a20, rz: fx * 0.6 });
    }
    for (let k = 1; k <= PISOS; k++) {
      const y = k * ALTO_PISO;
      if (k < PISOS) lote.caja(M.concreto, 10.4, 0.26, 10.4, O.x, y, O.z, { tile: 3, color: 0x8c887e });
      else lote.caja(M.concreto, 10.4, 0.26, 5.6, O.x, y, O.z + 2.4, { tile: 3, color: 0x8c887e });   // el último, a medio hacer
      if (k % 2 === 0) lote.caja(M.ladrillo, 10.4, 1.1, 0.2, O.x, y - 0.55 - 1.4, O.z - 5.1, { tile: 2, color: 0xa89888 });   // un muro empezado
    }
    // escombros
    for (let k = 0; k < 9; k++) lote.caja(M.concreto, 0.5 + (k % 3) * 0.3, 0.25 + (k % 2) * 0.2, 0.6, O.x - 3 + (k * 1.7) % 6, 0.25, O.z + 3 - (k * 2.3) % 6, { ry: k, color: 0x77746c });
    // un plástico que cuelga del segundo piso y se mueve con el viento
    const plastico = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6, 1, 4),
      new THREE.MeshLambertMaterial({ color: 0x8a9a8a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    plastico.geometry.translate(0, -1.3, 0);
    plastico.position.set(O.x + 1.5, 2 * ALTO_PISO, O.z + 5.25); grupo.add(plastico);
    // alguien parado en el borde del último piso, mirando a la calle
    const quien = silueta();
    quien.malla.position.set(O.x + 0.8, 3 * ALTO_PISO + 0.13, O.z + 5.0); quien.malla.rotation.y = 0;   // en el borde del tercer piso
    grupo.add(quien.malla);
    Object.assign(obra, { plastico, quien, estado: 'arriba', mira: 0, t: 0, arriba: quien.malla.position.clone() });
  }

  // =========================================================== los autos quemados
  const A = C.autos;
  const autos = {};
  if (A) {
    muro(A, M.concreto, { lado: 'O', a: 0, ancho: 3.4 }, 0x8a8478);
    const MA = {};
    prepararAutos(MA);
    MA.goma = new THREE.MeshLambertMaterial({ color: 0x0b0b0b });
    MA.oscuro = new THREE.MeshLambertMaterial({ color: 0x141210 });
    for (const [k, m] of Object.entries(MA)) { m.color = new THREE.Color(k.startsWith('chapa') ? 0x3a3029 : 0x2a2622); }
    MA.faroVivo = new THREE.MeshBasicMaterial({ color: 0x1a1a14 });   // los focos del que despierta
    const piezas = new Map();
    const ponerCon = (cambio) => (mat, geo, x, y, z, ry) => {
      const clave = cambio[mat] || mat;
      geo.rotateY(ry).translate(x, y, z);
      if (!piezas.has(clave)) piezas.set(clave, []);
      piezas.get(clave).push(geo);
    };
    const LUGARES = [[-3.4, -3.6, 0.3], [2.8, -3.2, 2.6], [-3.6, 2.4, 1.4], [3.2, 3.0, -0.4]];
    LUGARES.forEach(([dx, dz, ry], k) => {
      montarAuto(ponerCon({}), A.x + dx, A.z + dz, ry, k);
      const hx = Math.abs(Math.sin(ry)) * 2.1 + Math.abs(Math.cos(ry)) * 1.0, hz = Math.abs(Math.cos(ry)) * 2.1 + Math.abs(Math.sin(ry)) * 1.0;
      choque(A.x + dx - hx, A.x + dx + hx, A.z + dz - hz, A.z + dz + hz);
    });
    // el que despierta: frente a la entrada, con el capó hacia ella
    const VX = A.x + 0.4, VZ = A.z - 0.2, VR = -Math.PI / 2;
    montarAuto(ponerCon({ faroAuto: 'faroVivo' }), VX, VZ, VR, 1);
    choque(VX - 2.1, VX + 2.1, VZ - 1.0, VZ + 1.0);
    for (const [clave, gs] of piezas) {
      const malla = new THREE.Mesh(mergeGeometries(gs.map((g) => g.index ? g.toNonIndexed() : g), false), MA[clave]);
      grupo.add(malla);
    }
    // neumáticos apilados
    for (let k = 0; k < 6; k++) lote.caja(M.oscuro, 0.7, 0.24, 0.7, A.x + 4.6, 0.26 + k * 0.25, A.z - 5 + (k % 2) * 0.1, { color: 0x111111, ry: k * 0.4 });
    // los conos de luz de sus focos (se prenden de golpe)
    const conoMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });   // de una cara: desde adentro no tapa la pantalla
    const conos = [];
    for (const s of [-0.55, 0.55]) {
      const g = new THREE.ConeGeometry(1.4, 9, 10, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, -4.5);
      const c = new THREE.Mesh(g, conoMat);
      // capó hacia +z del auto, girado VR: los focos quedan hacia -x del mundo
      c.position.set(VX - 2.05, 0.7, VZ - s); c.rotation.y = -Math.PI / 2 + Math.PI; grupo.add(c); conos.push(c);
    }
    const chofer = silueta();
    chofer.malla.position.set(VX + 0.15, -0.28, VZ - 0.38); chofer.malla.rotation.y = VR; chofer.malla.visible = false;
    grupo.add(chofer.malla);
    Object.assign(autos, { conos, conoMat, chofer, estado: 'apagado', t: 0, espera: 0, faro: MA.faroVivo, pos: new THREE.Vector3(VX, 0, VZ) });
  }

  lote.construir(grupo);

  // ----------------------------------------------------------- vivo
  const tmp = new THREE.Vector3();
  function actualizar(dt, t, jugador, camara, audio, ctx) {
    const pj = jugador.pos;
    let peligro = 0;
    // columpios: dos con el viento; el del medio se mece alto, solo. Si entras, queda detenido en el aire.
    if (J) {
      const adentro = dentro(J, pj, 0.3);
      if (adentro && !juegos.quieto && ctx.hud) { juegos.quieto = true; if (!juegos.visto) { juegos.visto = true; ctx.hud.limpiar(); ctx.hud.decir('El columpio se detuvo en el aire.\nComo si alguien siguiera sentado.', 4); audio.crujido(); } }
      if (!adentro) juegos.quieto = false;
      for (const c of juegos.columpios) {
        if (c.solo && juegos.quieto) continue;   // queda donde estaba
        const amp = c.solo ? 0.75 : 0.06;
        c.p.rotation.x = Math.sin(t * (c.solo ? 1.9 : 1.1) + c.fase) * amp;
      }
      const dJ = Math.hypot(pj.x - J.x, pj.z - J.z);
      juegos.chirrido -= dt;
      if (!juegos.quieto && dJ < 20 && juegos.chirrido <= 0) { audio.rechinar(); juegos.chirrido = 1.65 + Math.random() * 0.3; }
      juegos.carrusel.rotation.y += dt * 0.32;
    }
    // la obra: el que está en el borde
    if (O) {
      obra.plastico.rotation.x = Math.sin(t * 1.3) * 0.25 + Math.sin(t * 3.1) * 0.06;
      const q = obra.quien, dO = Math.hypot(pj.x - O.x, pj.z - O.z);
      obra.t += dt;
      if (obra.estado === 'arriba') {
        q.posar?.('quieto', 0, t * 0.2);
        // ¿lo estás mirando? (está en el centro de la pantalla)
        tmp.copy(q.malla.position); tmp.y += 1.2; tmp.project(camara);
        const mirando = dO > 6 && dO < 42 && tmp.z < 1 && Math.abs(tmp.x) < 0.55 && Math.abs(tmp.y) < 0.85;
        obra.mira = mirando ? obra.mira + dt : Math.max(0, obra.mira - dt * 0.5);
        if (mirando && !obra.avisado && ctx.hud) { obra.avisado = true; ctx.hud.limpiar(); ctx.hud.decir('Hay alguien parado en el borde del tercer piso.\nNo se mueve. Te está mirando.', 3); }
        if (obra.mira > 2.2) {
          // desaparece y queda detrás de ti
          obra.estado = 'detras'; obra.t = 0;
          const yaw = jugador.yawCam;
          q.malla.position.set(pj.x - Math.sin(yaw) * 4.5, pj.y - 0.15, pj.z - Math.cos(yaw) * 4.5);   // más allá de la cámara: no se ve hasta darse vuelta
          q.malla.rotation.y = Math.atan2(pj.x - q.malla.position.x, pj.z - q.malla.position.z);
          audio.golpe(0.7);
          ctx.hud?.limpiar(); ctx.hud?.decir('Ya no está arriba.', 2.2);
        }
      } else if (obra.estado === 'detras') {
        q.posar?.('mira', 0, t);
        const dQ = Math.hypot(pj.x - q.malla.position.x, pj.z - q.malla.position.z);
        // si te das vuelta y lo ves: un parpadeo y se va
        camara.getWorldDirection(tmp);
        const dx = q.malla.position.x - camara.position.x, dz = q.malla.position.z - camara.position.z;
        const viendo = (tmp.x * dx + tmp.z * dz) / Math.hypot(dx, dz) > 0.8;
        if ((viendo && !obra.susto) || dQ < 1.0) { obra.susto = true; ctx.estadoJuego?.susto(0.9); ctx.sustos?.temblar(0.7); obra.t = Math.min(obra.t, 0.1); obra.vio = true; }
        if (obra.vio && obra.t > 0.9) { obra.estado = 'fuera'; q.malla.visible = false; obra.t = 0; }
        if (!obra.vio && obra.t > 9) { obra.estado = 'fuera'; q.malla.visible = false; obra.t = 0; }
        peligro = 0.7;
      } else if (obra.estado === 'fuera' && obra.t > 40 && dO > 40) {
        obra.estado = 'arriba'; obra.mira = 0; obra.susto = false; obra.vio = false; q.malla.visible = true; q.malla.position.copy(obra.arriba); q.malla.rotation.y = 0;
      }
    }
    // los autos: uno despierta cuando entras al sitio
    if (A) {
      const a = autos, dA = Math.hypot(pj.x - a.pos.x, pj.z - a.pos.z);
      a.t += dt; a.espera -= dt;
      if (a.estado === 'apagado' && a.espera <= 0 && dentro(A, pj, 0.5) && dA < 7.5) {
        a.estado = 'prendido'; a.t = 0;
        audio.claxon?.(); ctx.estadoJuego?.susto(0.8); ctx.sustos?.temblar(0.5);
        a.chofer.malla.visible = true;
        ctx.hud?.limpiar(); ctx.hud?.decir('Hay alguien al volante.\nNo tiene manos en el volante.', 3.5);
      }
      if (a.estado === 'prendido') {
        const parpadeo = a.t < 0.6 ? (Math.sin(a.t * 40) > 0 ? 1 : 0.2) : 1;
        a.conoMat.opacity = 0.07 * parpadeo; a.faro.color.setHex(parpadeo > 0.5 ? 0xfff6d0 : 0x3a3a30);
        if (a.chofer.huesos) { const H = a.chofer.huesos; a.chofer.posar('quieto', 0, 0); H.musloI.rotation.x = -1.5; H.musloD.rotation.x = -1.5; H.rodillaI.rotation.x = 1.5; H.rodillaD.rotation.x = 1.5; const rel = Math.atan2(pj.x - a.pos.x, pj.z - a.pos.z) - a.chofer.malla.rotation.y; H.cabeza.rotation.y = Math.max(-1.1, Math.min(1.1, Math.atan2(Math.sin(rel), Math.cos(rel)))); }
        peligro = 0.5;
        if (a.t > 4) { a.estado = 'apagado'; a.espera = 30; a.conoMat.opacity = 0; a.faro.color.setHex(0x1a1a14); a.chofer.malla.visible = false; }
      }
    }
    return { peligro };
  }

  function reiniciar() {
    if (O) { obra.estado = 'arriba'; obra.mira = 0; obra.susto = false; obra.vio = false; obra.quien.malla.visible = true; obra.quien.malla.position.copy(obra.arriba); obra.quien.malla.rotation.y = 0; }
    if (A) { autos.estado = 'apagado'; autos.espera = 0; autos.conoMat.opacity = 0; autos.chofer.malla.visible = false; autos.faro.color.setHex(0x1a1a14); }
    if (J) { juegos.quieto = false; }
  }

  function registrar(interaccion) {
    if (J) {
      const c = juegos.columpios[1];
      interaccion.agregar({ zona: 'ciudad', pos: { x: c.p.position.x, z: c.p.position.z }, radio: 2.2, etiqueta: 'tocar el columpio',
        accion: () => 'Está tibio.\nAlguien se acaba de bajar. O no se ha bajado.' });
    }
    if (A) interaccion.agregar({ zona: 'ciudad', pos: autos.pos, radio: 3.2, etiqueta: 'mirar dentro del auto',
      accion: () => (autos.estado === 'prendido' ? null : 'El asiento del chofer está tibio.\nEn la radio del auto: 31.7.') });
    if (O) interaccion.agregar({ zona: 'ciudad', pos: { x: O.x, z: O.z + 2 }, radio: 3, etiqueta: 'mirar hacia arriba',
      accion: () => (obra.estado === 'arriba' ? 'Cinco pisos de nada.\nEn el tercero, alguien no se mueve.' : 'Cinco pisos de nada.\nYa no hay nadie arriba.') });
  }

  return { actualizar, reiniciar, registrar, sitios: C, depurar: { juegos, obra, autos } };
}
