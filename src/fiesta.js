// Detrás del portón R9: la fiesta y los pasillos que te tragan.
//  - La disco: pista roja que late con el bombo, bola de espejos, bailarines sin rostro que se congelan cuando los
//    miras y se te acercan cuando les das la espalda, y tu doble bailando al fondo. Cuando te acercas, tu doble deja de
//    bailar y se va por la puerta del norte.
//  - Los pasillos: azulejo que se vuelve carne, muros que se cierran mientras pasas, bocas que se abren en las paredes
//    y una garganta que te persigue por detrás. Si te alcanza, te traga. Al final hay una puerta con luz fría: el baño.
import * as THREE from 'three';
import { material, textura, ps1Material, videoTextura } from './ps1.js';

export const ORIGEN = new THREE.Vector3(0, 0, -320);
const D = 12;                     // media disco (24 x 24 m)
const H = 6;
const ANCHO = 2.4;                // pasillo
const SEG = 8;                    // largo de cada tramo
const TRAMOS = 8;
const LARGO = SEG * TRAMOS;

function caja(w, h, d, mats) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); }
function plano(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }

export function crearFiesta(escena, crearDoble, audio) {
  const g = new THREE.Group();
  const col = [];
  const O = ORIGEN;
  const zNorte = O.z - D, zSur = O.z + D;

  // ---------- la disco
  const pista = plano(2 * D, 2 * D, ps1Material(new THREE.MeshLambertMaterial({ map: textura('t_pista', [8, 8]),
    emissive: 0xff2a1a, emissiveMap: textura('t_pista', [8, 8]), emissiveIntensity: 0.4 })));
  pista.rotation.x = -Math.PI / 2; pista.position.set(O.x, 0.02, O.z);
  const techo = plano(2 * D, 2 * D, ps1Material(new THREE.MeshLambertMaterial({ color: 0x120808 })));
  techo.rotation.x = Math.PI / 2; techo.position.set(O.x, H, O.z);
  g.add(pista, techo);
  const terciopelo = material('t_terciopelo', [6, 2]);
  const muros = [
    [O.x, zSur, 2 * D, 0.4], [O.x - D, O.z, 0.4, 2 * D], [O.x + D, O.z, 0.4, 2 * D],
    [O.x - D / 2 - ANCHO / 4, zNorte, D - ANCHO / 2, 0.4], [O.x + D / 2 + ANCHO / 4, zNorte, D - ANCHO / 2, 0.4],
  ];
  for (const [x, z, w, d] of muros) {
    const m = caja(w, H, d, terciopelo); m.position.set(x, H / 2, z); g.add(m);
    col.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  }
  const dintel = caja(ANCHO + 0.4, H - 2.6, 0.4, terciopelo); dintel.position.set(O.x, 2.6 + (H - 2.6) / 2, zNorte); g.add(dintel);

  // bola de espejos y luces que giran
  const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1),
    ps1Material(new THREE.MeshLambertMaterial({ color: 0xcfcfcf, emissive: 0x553333, flatShading: true })));
  bola.position.set(O.x, H - 1.2, O.z);
  g.add(bola);
  const focos = [0xff1a1a, 0xff2a8a, 0xaa1010, 0xff3030].map((c) => { const l = new THREE.PointLight(c, 30, 16, 1.2); g.add(l); return l; });
  const estrobo = new THREE.PointLight(0xffffff, 0, 30, 1.0); estrobo.position.set(O.x, H - 0.5, O.z); g.add(estrobo);

  // bailarines
  const poses = ['s_baile1', 's_baile2', 's_baile3'].map((n) => textura(n));
  const bailarines = [];
  for (let k = 0; k < 24; k++) {
    const geo = new THREE.PlaneGeometry(1.15, 1.9); geo.translate(0, 0.95, 0);
    const mat = ps1Material(new THREE.MeshLambertMaterial({ map: poses[k % 3], alphaTest: 0.5, side: THREE.DoubleSide,
      emissive: 0xffffff, emissiveMap: poses[k % 3], emissiveIntensity: 0.15 }));
    const m = new THREE.Mesh(geo, mat);
    const fila = Math.floor(k / 6), colm = k % 6;
    const pos = new THREE.Vector3(O.x - 7.5 + colm * 3 + (Math.random() - 0.5) * 1.2, 0.02, O.z + 6 - fila * 3.2 + (Math.random() - 0.5) * 1.2);
    m.position.copy(pos);
    g.add(m);
    bailarines.push({ m, mat, base: pos.clone(), pose: k % 3, fase: Math.random() * 4, congelado: false, empujon: 0 });
  }

  // tu doble, al fondo
  const doble = crearDoble();
  doble.estado.raiz.position.set(O.x, 0.02, zNorte + 2.2);
  doble.estado.raiz.rotation.y = 0;  // mira hacia el sur (hacia ti)
  const dobleEstado = { fase: 'baila', t: 0 };

  // ---------- los pasillos
  const azulejo = material('t_azulejo', [2, 1.2], { color: 0xb8b2a2 });
  const carne = material('t_carne', [2, 1.2]);
  const pisoP = material('t_azulejo', [1, SEG / 2.4], { color: 0x6b5a50 });
  const tramos = [];
  for (let k = 0; k < TRAMOS; k++) {
    const z1 = zNorte - k * SEG, z0 = z1 - SEG;
    const zc = (z0 + z1) / 2;
    const mat = k < 2 ? azulejo : k < 4 ? (k % 2 ? carne : azulejo) : carne;
    const izq = caja(0.3, 3, SEG, mat), der = caja(0.3, 3, SEG, mat);
    izq.position.set(O.x - ANCHO / 2 - 0.15, 1.5, zc); der.position.set(O.x + ANCHO / 2 + 0.15, 1.5, zc);
    const suelo = plano(4, SEG, pisoP); suelo.rotation.x = -Math.PI / 2; suelo.position.set(O.x, 0.02, zc);
    const cielo = plano(4, SEG, ps1Material(new THREE.MeshLambertMaterial({ color: k < 4 ? 0x2a2622 : 0x3a0c0c })));
    cielo.rotation.x = Math.PI / 2; cielo.position.set(O.x, 3, zc);
    const foco = new THREE.PointLight(k < 4 ? 0xffd2a0 : 0xff3a2a, 6, 9, 1.3); foco.position.set(O.x, 2.7, zc);
    g.add(izq, der, suelo, cielo, foco);
    const ci = { x0: 0, x1: 0, z0, z1 }, cd = { x0: 0, x1: 0, z0, z1 };
    col.push(ci, cd);
    tramos.push({ izq, der, ci, cd, z0, z1, zc, ancho: ANCHO, cierra: k >= 2 && k % 2 === 0, foco, fase: Math.random() * 6 });
  }
  const zFin = zNorte - LARGO;
  const fondo = caja(ANCHO + 0.6, 3, 0.3, azulejo); fondo.position.set(O.x, 1.5, zFin - 0.15); g.add(fondo);
  col.push({ x0: O.x - 2, x1: O.x + 2, z0: zFin - 0.3, z1: zFin });
  // la puerta del baño al final: luz fría
  const puerta = plano(1.2, 2.2, new THREE.MeshBasicMaterial({ color: 0xdfe8ff }));
  puerta.position.set(O.x, 1.1, zFin + 0.02); g.add(puerta);
  const luzFin = new THREE.PointLight(0xdfe8ff, 8, 10, 1.2); luzFin.position.set(O.x, 2, zFin + 1); g.add(luzFin);

  // bocas en las paredes
  const vBoca = videoTextura('v_boca');
  const bocas = [3, 5, 6].map((k, i) => {
    const t = tramos[k];
    const lado = i % 2 ? 1 : -1;
    const m = plano(3.2, 1.8, new THREE.MeshBasicMaterial({ map: vBoca.textura, color: 0xc0a0a0 }));
    m.position.set(O.x + lado * (ANCHO / 2 - 0.02), 1.5, t.zc);
    m.rotation.y = lado > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(m);
    return { m, t, lado, abierta: false };
  });

  // la garganta que persigue
  const garganta = new THREE.Group();
  const vMandibula = videoTextura('v_mandibula');
  const dientes = plano(ANCHO + 1.2, 3.4, new THREE.MeshBasicMaterial({ map: vMandibula.textura, color: 0xffd0c8, fog: false }));
  const fauces = plano(ANCHO + 0.4, 3, new THREE.MeshBasicMaterial({ color: 0x120000 }));
  fauces.position.z = 0.6;
  const luzG = new THREE.PointLight(0xff1a00, 10, 7, 1.2); luzG.position.z = -1;
  garganta.add(fauces, dientes, luzG);
  dientes.rotation.y = Math.PI; fauces.rotation.y = Math.PI;
  g.add(garganta);
  const gargantaEstado = { activa: false, z: zNorte + 2, vel: 2.5 };

  escena.add(g);

  const zona = { col, entrada: new THREE.Vector3(O.x, 0.02, zSur - 2.5), zNorte, zFin };

  function ajustarPasillo(t, ancho) {
    t.ancho = ancho;
    t.izq.position.x = O.x - ancho / 2 - 0.15; t.der.position.x = O.x + ancho / 2 + 0.15;
    t.ci.x0 = O.x - ancho / 2 - 0.3; t.ci.x1 = O.x - ancho / 2;
    t.cd.x0 = O.x + ancho / 2; t.cd.x1 = O.x + ancho / 2 + 0.3;
  }
  tramos.forEach((t) => ajustarPasillo(t, ANCHO));

  const tmp = new THREE.Vector3();
  function mirado(camara, p, cono = 0.85) {
    const d = tmp.subVectors(p, camara.position); const dist = d.length();
    return new THREE.Vector3(0, 0, -1).applyQuaternion(camara.quaternion).dot(d.normalize()) > cono && dist < 22;
  }

  function actualizar(dt, t, jugador, camara, estadoJuego, beat) {
    const pj = jugador.pos;
    let peligro = 0;
    const enDisco = pj.z > zNorte;
    // pulso de la música (126 por minuto)
    const pulso = Math.pow(1 - beat, 6);
    pista.material.emissiveIntensity = 0.25 + pulso * 0.9;
    bola.rotation.y += dt * 0.9;
    focos.forEach((l, i) => {
      const a = t * (0.6 + i * 0.17) + i * 1.6;
      l.position.set(O.x + Math.cos(a) * 7, 2.5 + Math.sin(a * 1.3), O.z + Math.sin(a) * 7);
      l.intensity = enDisco ? 26 + pulso * 30 : 0;
    });
    estrobo.intensity = enDisco && Math.sin(t * 2.1) > 0.94 && (Math.floor(t * 16) % 2 === 0) ? 90 : 0;

    // bailarines: se congelan si los miras; si no, cambian de pose al ritmo y se acercan
    let cerca = 0;
    for (const b of bailarines) {
      b.m.rotation.y = Math.atan2(camara.position.x - b.m.position.x, camara.position.z - b.m.position.z);
      const visto = mirado(camara, b.m.position.clone().setY(1.2));
      b.congelado = visto;
      if (!visto && enDisco) {
        const nueva = (Math.floor(t * 2.1 + b.fase)) % 3;
        if (nueva !== b.pose) { b.pose = nueva; b.mat.map = poses[nueva]; b.mat.emissiveMap = poses[nueva]; }
        tmp.subVectors(pj, b.m.position).setY(0);
        const d = tmp.length();
        if (d > 1.0) b.m.position.addScaledVector(tmp.normalize(), Math.min(d - 1, dt * 0.55));
      }
      b.m.position.y = 0.02 + (b.congelado ? 0 : pulso * 0.08);
      const d = b.m.position.distanceTo(tmp.copy(pj).setY(0.02));
      if (d < 3) cerca++;
      if (d < 0.95) { estadoJuego.susto(0.9); b.m.position.copy(b.base); audio.silencioFiesta(1.2); }
    }
    peligro = Math.max(peligro, Math.min(1, cerca / 6));

    // el doble: baila; si te acercas, se detiene, te mira y se va por la puerta del norte
    const de = doble.estado;
    dobleEstado.t += dt;
    if (dobleEstado.fase === 'baila') {
      // al ritmo de la música: dos tiempos por ciclo
      doble.posar('baila', t * 6.6, t, 0, dt, camara);
      de.raiz.rotation.y = Math.sin(t * 1.1) * 0.6;
      if (de.raiz.position.distanceTo(pj) < 5.5) { dobleEstado.fase = 'mira'; dobleEstado.t = 0; audio.silencioFiesta(2.0); }
    } else if (dobleEstado.fase === 'mira') {
      doble.posar('mira', 0, t, 0, dt, camara);
      de.raiz.rotation.y = Math.atan2(pj.x - de.raiz.position.x, pj.z - de.raiz.position.z);
      if (dobleEstado.t > 1.6) { dobleEstado.fase = 'se_va'; dobleEstado.t = 0; }
    } else if (dobleEstado.fase === 'se_va') {
      de.raiz.rotation.y = Math.PI;
      de.raiz.position.z -= dt * 1.6;
      doble.posar('camina', dobleEstado.t * 6.5, t, 0, dt, camara);
      if (de.raiz.position.z < zNorte - 6) { de.raiz.visible = false; dobleEstado.fase = 'ido'; }
    }

    // los pasillos
    const enPasillo = pj.z < zNorte;
    if (enPasillo && !gargantaEstado.activa && pj.z < zNorte - 5) {
      gargantaEstado.activa = true; gargantaEstado.z = zNorte + 1; audio.rugido(); vMandibula.video.play().catch(() => {});
    }
    for (const tr of tramos) {
      tr.foco.intensity = Math.random() < 0.06 ? 0.5 : 6;
      if (tr.cierra) {
        const dentro = pj.z < tr.z1 + 2 && pj.z > tr.z0 - 2;
        const objetivo = dentro ? 1.15 + Math.max(0, Math.sin(t * 1.7 + tr.fase)) * 0.4 : ANCHO;
        const nuevo = tr.ancho + (objetivo - tr.ancho) * Math.min(1, dt * 1.4);
        if (Math.abs(nuevo - tr.ancho) > 0.002) { ajustarPasillo(tr, nuevo); if (dentro && Math.random() < dt * 3) audio.crujido(); }
      }
      // los muros de carne respiran
      if (tr.izq.material === carne) { const s = 1 + Math.sin(t * 3 + tr.fase) * 0.04; tr.izq.scale.x = s; tr.der.scale.x = s; }
    }
    for (const b of bocas) {
      const dz = Math.abs(pj.z - b.t.zc);
      if (dz < 5 && !b.abierta) { b.abierta = true; vBoca.video.currentTime = 0; vBoca.video.play().catch(() => {}); audio.rechinar(); }
      if (dz > 7) b.abierta = false;
      if (b.abierta && dz < 1.0 && Math.abs(pj.x - b.m.position.x) < 0.9) estadoJuego.susto(1);
    }
    if (gargantaEstado.activa) {
      if (vMandibula.video.paused) vMandibula.video.play().catch(() => {});
      gargantaEstado.vel = Math.min(3.4, gargantaEstado.vel + dt * 0.03);
      gargantaEstado.z -= gargantaEstado.vel * dt;
      garganta.position.set(O.x, 1.5, gargantaEstado.z);
      garganta.scale.setScalar(1 + Math.sin(t * 9) * 0.05);
      const d = gargantaEstado.z - pj.z;
      peligro = Math.max(peligro, Math.max(0, 1 - d / 10));
      if (d < 0.7) estadoJuego.capturado();
    }
    // la puerta del final
    if (pj.z < zFin + 1.4 && Math.abs(pj.x - O.x) < 1) estadoJuego.salida();
    return { peligro, enDisco, enPasillo };
  }

  function reiniciar() {
    bailarines.forEach((b) => b.m.position.copy(b.base));
    doble.estado.raiz.visible = true;
    doble.estado.raiz.position.set(O.x, 0.02, zNorte + 2.2);
    dobleEstado.fase = 'baila'; dobleEstado.t = 0;
    gargantaEstado.activa = false; gargantaEstado.vel = 2.5;
    garganta.position.set(O.x, 1.5, zNorte + 40);
    tramos.forEach((t) => ajustarPasillo(t, ANCHO));
  }
  reiniciar();

  return { zona, actualizar, reiniciar, depurar: { bailarines, doble, garganta: gargantaEstado, tramos } };
}
