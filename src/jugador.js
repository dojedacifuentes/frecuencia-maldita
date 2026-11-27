// El protagonista: el hombre de abrigo verde oliva en 3D (cuerpo.js), con cigarro, linterna, cámara en tercera
// persona que no atraviesa paredes y choques contra los edificios. Si el modelo 3D no carga, queda el muñeco de cajas
// de antes (texturas sacadas de su ficha).
import * as THREE from 'three';
import { material, ps1Material } from './ps1.js';
import { cuerpoListo, crearCuerpo3d } from './cuerpo.js';

const RADIO = 0.32;
const diferenciaAngular = (destino, actual) => Math.atan2(Math.sin(destino - actual), Math.cos(destino - actual));

function pieza(w, h, d, mats, pivoteArriba = false) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (pivoteArriba) g.translate(0, -h / 2, 0);
  return new THREE.Mesh(g, mats);
}

// el muñeco de cajas (reserva): misma interfaz que crearCuerpo3d → { malla, brasa, posar }
function cuerpoDeCajas() {
  const malla = new THREE.Group();
  const m = (n) => material(n);
  const pelo = ps1Material(new THREE.MeshLambertMaterial({ color: 0x14110f }));
  const oscuro = ps1Material(new THREE.MeshLambertMaterial({ color: 0x1b1a18 }));
  // orden de caras: +x, -x, +y, -y, +z (frente), -z (espalda)
  const torso = pieza(0.5, 0.62, 0.28, [m('p_torso_l'), m('p_torso_l'), m('p_torso_f'), oscuro, m('p_torso_f'), m('p_torso_e')]);
  torso.position.y = 1.18;
  const falda = pieza(0.54, 0.62, 0.32, [m('p_falda_l'), m('p_falda_l'), oscuro, oscuro, m('p_falda_f'), m('p_falda_e')], true);
  falda.position.y = 0.88;
  const cabeza = pieza(0.22, 0.27, 0.24, [m('p_perfil'), m('p_perfil'), pelo, oscuro, m('p_cara'), m('p_nuca')]);
  cabeza.position.y = 1.64;
  const cadera = new THREE.Group(); cadera.position.y = 0.86;
  const piernaI = pieza(0.17, 0.84, 0.19, m('p_pantalon'), true); piernaI.position.x = -0.12;
  const piernaD = pieza(0.17, 0.84, 0.19, m('p_pantalon'), true); piernaD.position.x = 0.12;
  cadera.add(piernaI, piernaD);
  const hombro = new THREE.Group(); hombro.position.y = 1.46;
  const brazoI = pieza(0.13, 0.62, 0.15, m('p_manga'), true); brazoI.position.x = -0.32;
  const brazoD = pieza(0.13, 0.62, 0.15, m('p_manga'), true); brazoD.position.x = 0.32;
  const manoI = pieza(0.1, 0.12, 0.1, m('p_mano')); manoI.position.y = -0.66; brazoI.add(manoI);
  const manoD = pieza(0.1, 0.12, 0.1, m('p_mano')); manoD.position.y = -0.66; brazoD.add(manoD);
  const cigarro = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.12), new THREE.MeshBasicMaterial({ color: 0xe8e2d0 }));
  cigarro.position.set(0, -0.72, 0.07);
  const brasa = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 0xff5a1a }));
  brasa.position.set(0, 0, 0.065);
  cigarro.add(brasa);
  brazoD.add(cigarro);
  hombro.add(brazoI, brazoD);
  malla.add(torso, falda, cabeza, cadera, hombro);

  function posar(modo, fase, t, extra = 0) {
    const s = Math.sin(fase);
    malla.rotation.x = 0; malla.position.y = 0;
    let piernas = 0, brazos = 0, brazoCigarro = null;
    if (modo === 'camina' || modo === 'corre') {
      const amp = modo === 'corre' ? 0.75 : 0.45;
      piernas = s * amp; brazos = -s * amp * 0.7; brazoCigarro = s * amp * 0.6;
      malla.position.y = Math.abs(Math.cos(fase)) * 0.04;
    } else if (modo === 'quieto') {
      brazoCigarro = -0.15 + Math.sin(t * 0.7) * 0.05;
      malla.position.y = Math.sin(t * 1.3) * 0.006;
    } else if (modo === 'baila') {
      piernas = s * 0.3; brazos = -2.4 + s * 0.4; brazoCigarro = -2.4 - s * 0.4;
      malla.position.y = Math.abs(s) * 0.08;
    } else if (modo === 'cae') {
      malla.rotation.x = -1.4 * Math.min(1, extra);
    }
    piernaI.rotation.x = piernas; piernaD.rotation.x = -piernas;
    brazoI.rotation.x = brazos; brazoD.rotation.x = brazoCigarro ?? 0;
    falda.rotation.x = Math.abs(piernas) * 0.25;
  }
  return { malla, brasa, posar };
}

export function crearJugador(escena) {
  const raiz = new THREE.Group();
  const cuerpo = new THREE.Group();
  const figura = cuerpoListo() ? crearCuerpo3d() : cuerpoDeCajas();
  cuerpo.add(figura.malla);
  raiz.add(cuerpo);
  const brasa = figura.brasa;

  // humo: unas pocas partículas cuadradas que suben
  const humo = [];
  const matHumo = new THREE.MeshBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.35, depthWrite: false });
  for (let k = 0; k < 10; k++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), matHumo.clone());
    p.visible = false; escena.add(p); humo.push({ m: p, vida: 0 });
  }

  // linterna
  const linterna = new THREE.SpotLight(0xfff2d6, 45, 18, Math.PI / 7.5, 0.55, 1.1);
  linterna.position.set(0.15, 1.35, 0.2);
  const blanco = new THREE.Object3D(); blanco.position.set(0, 0.1, 4);
  raiz.add(linterna, blanco);
  linterna.target = blanco;
  linterna.intensity = 0;   // siempre presente (cambiar luces recompila): se apaga con la intensidad

  escena.add(raiz);

  const estado = {
    raiz, cuerpo, linterna, brasa, techo: Infinity, es3d: cuerpoListo(),
    get linternaOn() { return linterna.intensity > 0; },
    set linternaOn(v) { linterna.intensity = v ? 45 : 0; },
    pos: raiz.position, rumbo: 0, yawCam: Math.PI, pitchCam: 0.18, fase: 0, velocidad: 0, corriendo: false,
    pasos: 0, quieto: true, esperaCamara: 0, distanciaCamara: 2.9,
  };

  function aplicarColisiones(p, colisiones) {
    for (const c of colisiones) {
      const qx = Math.max(c.x0, Math.min(p.x, c.x1));
      const qz = Math.max(c.z0, Math.min(p.z, c.z1));
      const dx = p.x - qx, dz = p.z - qz;
      const d2 = dx * dx + dz * dz;
      if (d2 < RADIO * RADIO) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          p.x = qx + (dx / d) * RADIO; p.z = qz + (dz / d) * RADIO;
        } else {
          // dentro de la caja: sacar por el lado más cercano
          const opciones = [[p.x - c.x0, -1, 0], [c.x1 - p.x, 1, 0], [p.z - c.z0, 0, -1], [c.z1 - p.z, 0, 1]].sort((a, b) => a[0] - b[0]);
          const [, sx, sz] = opciones[0];
          if (sx) p.x = sx < 0 ? c.x0 - RADIO : c.x1 + RADIO;
          if (sz) p.z = sz < 0 ? c.z0 - RADIO : c.z1 + RADIO;
        }
      }
    }
  }

  // cámara: distancia que no atraviesa edificios (prueba del segmento contra las cajas en planta)
  function distanciaLibre(o, dir, largo, colisiones) {
    let t = largo;
    for (const c of colisiones) {
      let tmin = 0, tmax = largo;
      for (const [oo, dd, a, b] of [[o.x, dir.x, c.x0 - 0.15, c.x1 + 0.15], [o.z, dir.z, c.z0 - 0.15, c.z1 + 0.15]]) {
        if (Math.abs(dd) < 1e-6) { if (oo < a || oo > b) { tmin = 1; tmax = 0; } continue; }
        let t1 = (a - oo) / dd, t2 = (b - oo) / dd;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      }
      if (tmax >= tmin && tmin > 0.05) t = Math.min(t, tmin);
    }
    return t;
  }

  function humear(dt, t, camara) {
    brasa.material.color.setHSL(0.04, 1, 0.45 + 0.15 * Math.sin(t * 3));
    if (Math.random() < dt * 6) {
      const libre = humo.find((h) => h.vida <= 0);
      if (libre) {
        brasa.getWorldPosition(libre.m.position);
        libre.vida = 1.6; libre.m.visible = true;
      }
    }
    for (const h of humo) {
      if (h.vida <= 0) continue;
      h.vida -= dt;
      h.m.position.y += dt * 0.35;
      h.m.position.x += Math.sin(t * 2 + h.vida * 5) * dt * 0.05;
      h.m.material.opacity = 0.32 * Math.max(0, h.vida / 1.6);
      if (camara) h.m.quaternion.copy(camara.quaternion);
      if (h.vida <= 0) h.m.visible = false;
    }
  }

  // pose suelta (la usan el doble de la fiesta y la caída al ser atrapado)
  function posar(modo, fase, t, extra = 0, dt = 0, camara = null) {
    figura.posar(modo, fase, t, extra);
    if (dt > 0) humear(dt, t, camara);
  }

  let anguloPulsado = null;
  let rumboElegido = null;
  let seguirRumbo = false;

  function reiniciarSeguimiento() {
    anguloPulsado = null;
    rumboElegido = null;
    seguirRumbo = false;
    estado.esperaCamara = 0;
  }

  function actualizar(dt, entrada, colisiones, camara, t) {
    // Mirar es opcional: el ratón/J/L suspenden brevemente el seguimiento.
    const mirando = entrada.giro !== 0 || entrada.ratonX !== 0 || entrada.ratonY !== 0;
    estado.esperaCamara = mirando ? 1.2 : Math.max(0, estado.esperaCamara - dt);
    estado.yawCam -= entrada.giro * dt * 2.2 + entrada.ratonX * 0.0028;
    estado.pitchCam = Math.min(0.6, Math.max(-0.15, estado.pitchCam + entrada.ratonY * 0.002));
    entrada.ratonX = 0; entrada.ratonY = 0;
    // Cada nueva dirección se interpreta desde la vista que tiene el jugador en ese instante.
    // Mantener la misma combinación conserva el rumbo en el mundo mientras la cámara se acomoda.
    const mag = Math.hypot(entrada.lado, entrada.adelante);
    const angulo = mag ? Math.atan2(entrada.lado, entrada.adelante) : null;
    if (angulo !== null && angulo !== anguloPulsado) rumboElegido = estado.yawCam + angulo;
    anguloPulsado = angulo;
    const vel = entrada.correr ? 6.2 : 2.0;
    estado.corriendo = entrada.correr && mag > 0;
    if (mag > 0.01) {
      estado.pos.x += Math.sin(rumboElegido) * vel * dt;
      estado.pos.z += Math.cos(rumboElegido) * vel * dt;
      estado.velocidad = vel;
      estado.quieto = false;
    } else {
      estado.velocidad = 0;
      estado.quieto = true;
    }
    aplicarColisiones(estado.pos, colisiones);
    if (rumboElegido !== null) {
      estado.rumbo += diferenciaAngular(rumboElegido, estado.rumbo) * (1 - Math.exp(-13 * dt));
    }
    raiz.rotation.y = estado.rumbo;
    if (mirando) seguirRumbo = false;
    else if (mag || entrada.centrar) seguirRumbo = true;
    if (entrada.centrar) estado.esperaCamara = 0;
    if (seguirRumbo && estado.esperaCamara === 0) {
      const diferencia = diferenciaAngular(estado.rumbo, estado.yawCam);
      const suavidad = 1 - Math.exp(-4 * dt);
      const giroMaximo = 2.8 * dt;
      estado.yawCam += THREE.MathUtils.clamp(diferencia * suavidad, -giroMaximo, giroMaximo);
      estado.pitchCam += (0.18 - estado.pitchCam) * suavidad;
    }
    // el paso: la fase avanza con la velocidad (un paso por medio ciclo)
    const pasoAntes = Math.sin(estado.fase);
    estado.fase += dt * (estado.velocidad > 0 ? (estado.corriendo ? 13 : 6.5) : 0);
    if (estado.velocidad > 0 && Math.sign(pasoAntes) !== Math.sign(Math.sin(estado.fase))) estado.pasos++;
    posar(estado.velocidad > 0 ? (estado.corriendo ? 'corre' : 'camina') : 'quieto', estado.fase, t, 0, dt, camara);
    // cámara detrás del hombro
    const dist = 3.1;
    const dir = new THREE.Vector3(-Math.sin(estado.yawCam) * Math.cos(estado.pitchCam), 0, -Math.cos(estado.yawCam) * Math.cos(estado.pitchCam));
    // por encima del hombro derecho: el personaje queda a un lado y se ve lo que viene
    const der = new THREE.Vector3(-Math.cos(estado.yawCam), 0, Math.sin(estado.yawCam));
    const cabezaPos = new THREE.Vector3(estado.pos.x, 1.55, estado.pos.z);
    const desvio = Math.min(0.62, Math.max(0, distanciaLibre(cabezaPos, der, 0.8, colisiones) - 0.18));
    const base = cabezaPos.clone().addScaledVector(der, desvio);
    const libre = distanciaLibre(base, dir, dist, colisiones);
    const limite = Math.max(0.05, libre - 0.2);
    // Acercarse de inmediato evita atravesar muros; alejarse suavemente evita saltos.
    estado.distanciaCamara = limite < estado.distanciaCamara ? limite
      : estado.distanciaCamara + (limite - estado.distanciaCamara) * (1 - Math.exp(-5 * dt));
    const d = estado.distanciaCamara;
    camara.position.set(base.x + dir.x * d, Math.min(estado.techo - 0.25, 1.55 + Math.sin(estado.pitchCam) * d + 0.2), base.z + dir.z * d);
    camara.lookAt(base.x - dir.x * 3, 1.3, base.z - dir.z * 3);
  }

  return { estado, actualizar, aplicarColisiones, posar, reiniciarSeguimiento };
}
