// Lo siniestro de la ciudad: viejas sin rostro que miran la pared (y se dan vuelta si no las miras), el perro de
// mancha que sigue de lejos, la sombra que se acerca cuando no la ves, manchas con forma en los muros, las tres manchas
// que suenan en 317, la boca del muro, el charco que es un ojo, el teléfono que suena, la vitrina que te muestra de
// espaldas en vivo, abrigos colgando y frases escritas en las paredes.
import * as THREE from 'three';
import { material, textura, ps1Material, videoTextura } from './ps1.js';
import { azar, lienzoTexto, centroCalle, centroManzana, MANZANA, CALLE, ACERA } from './ciudad.js';
import { crearSombra } from './sombra.js';

export const FRASES_MURO = [
  'Llevo años meando en este muro.',
  'Las ratas siempre se enteran antes.',
  'Aquí hasta los muertos\npagan arriendo.',
  '¿Quién te dio permiso\npara nacer?',
  'La ciudad te mastica despacio\npara que no te des cuenta.',
  'Si te sigue, no corras.\nLe gusta que corras.',
  '¿Cuántas noches iguales\ncaben en una vida?',
  'Nadie vino a salvarte.\nVinieron a cobrarte.',
  'Dios, si existe, es un muro.',
  'Todos los relojes de esta calle\nmarcan 03:17.',
];

const FRAGMENTOS = [
  'La primera mancha suena a tu voz\ncuando eras niño.',
  'La segunda mancha tiene tu forma.\nFuma antes que tú.',
  'La tercera mancha respira.\nEl portón de la fábrica se abrió.',
];

function billboard(nombre, alto, ancho) {
  const tex = textura(nombre);
  const geo = new THREE.PlaneGeometry(ancho, alto);
  geo.translate(0, alto / 2, 0);
  const m = new THREE.Mesh(geo, ps1Material(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.32 })));
  return m;
}

function mirarCamara(m, camara) {
  m.rotation.y = Math.atan2(camara.position.x - m.position.x, camara.position.z - m.position.z);
}

export function loMira(camara, pos, maxDist = 24, cono = 0.8) {
  const d = new THREE.Vector3().subVectors(pos, camara.position);
  const dist = d.length();
  if (dist > maxDist) return false;
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
  return f.dot(d.normalize()) > cono;
}

function enFachada(f, a, y, sep = 0.05) {
  // punto sobre la cara f a distancia a del centro, altura y
  const tx = f.nz !== 0 ? a : 0, tz = f.nx !== 0 ? a : 0;
  return { pos: new THREE.Vector3(f.x + f.nx * sep + tx, y, f.z + f.nz * sep + tz), rot: Math.atan2(f.nx, f.nz) };
}

export function crearSiniestro(escena, ciudad, renderer, audio) {
  const r = azar(1703);
  const fachadas = ciudad.fachadas;
  const elegir = () => fachadas[Math.floor(r() * fachadas.length)];

  // manchas con forma en los muros
  for (let k = 0; k < 26; k++) {
    const f = elegir();
    const nom = ['m_hombre', 'm_agachado', 'm_perro'][k % 3];
    const { pos, rot } = enFachada(f, (r() - 0.5) * (f.largo - 3), nom === 'm_perro' ? 0.9 : 1.3, 0.04 + k * 0.0005);
    const tam = nom === 'm_hombre' ? [1.4, 2.4] : [2.2, 1.8];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...tam),
      ps1Material(new THREE.MeshLambertMaterial({ map: textura(nom), transparent: true, depthWrite: false, opacity: 0.85 })));
    m.position.copy(pos); m.rotation.y = rot;
    escena.add(m);
  }

  // frases en los muros
  FRASES_MURO.forEach((frase, k) => {
    const f = fachadas[(k * 7 + 3) % fachadas.length];
    const { pos, rot } = enFachada(f, (r() - 0.5) * (f.largo - 5), 1.6 + r() * 0.6, 0.06);
    const tex = lienzoTexto(frase, 512, 160, k % 3 === 0 ? '#6e0d08' : '#120806', 30, 'bold {t}px "Courier New", monospace', (r() - 0.5) * 0.08);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), ps1Material(new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false })));
    m.position.copy(pos); m.rotation.y = rot;
    escena.add(m);
  });

  // las tres manchas que suenan en 317 (la mancha con forma de hombre, que se anima al sintonizarla)
  const frecuencias = [];
  const vMancha = videoTextura('v_mancha');
  // [x, z, nx, nz, corrida]: la primera frente a la plaza del baño, la segunda al este de la plaza central,
  // la tercera frente a la plaza central, de cara al norte (desde ahí, el portón)
  const LUGARES_MANCHA = [[0, 28.4, 0, 1, -3], [15.6, 0, -1, 0, 3], [0, -15.6, 0, 1, 2]];
  ciudad.ocupadas = ciudad.ocupadas || new Set();
  for (let k = 0; k < 3; k++) {
    const [lx, lz, lnx, lnz, corrida] = LUGARES_MANCHA[k];
    let f = null, mejor = Infinity;
    fachadas.forEach((c, i) => {
      if (c.nx !== lnx || c.nz !== lnz) return;
      const d = Math.hypot(c.x - lx, c.z - lz);
      if (d < mejor) { mejor = d; f = c; }
    });
    ciudad.ocupadas.add(fachadas.indexOf(f));
    const { pos, rot } = enFachada(f, corrida, 1.5, 0.07);
    const fija = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6),
      ps1Material(new THREE.MeshLambertMaterial({ map: textura('m_hombre'), transparent: true, depthWrite: false, color: 0x8a1810, emissive: 0x6a0c06 })));   // brilla un poco: se reconoce de lejos
    fija.position.copy(pos); fija.rotation.y = rot;
    const viva = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.46), new THREE.MeshBasicMaterial({ map: vMancha.textura }));
    viva.position.copy(pos).add(new THREE.Vector3(f.nx * 0.01, 0.1, f.nz * 0.01)); viva.rotation.y = rot; viva.visible = false;
    escena.add(fija, viva);
    frecuencias.push({ pos, fija, viva, hallada: false, texto: FRAGMENTOS[k] });
  }

  // viejas sin rostro de cara a la pared
  const viejas = [];
  for (let k = 0; k < 6; k++) {
    const f = fachadas[(k * 13 + 5) % fachadas.length];
    const { pos } = enFachada(f, (r() - 0.5) * (f.largo - 4), 0.14, 0.55);
    const espalda = billboard('s_vieja_espalda', 1.62, 0.95);
    const frente = billboard('s_vieja_frente', 1.62, 0.62);
    espalda.position.copy(pos); frente.position.copy(pos); frente.visible = false;
    escena.add(espalda, frente);
    viejas.push({ espalda, frente, pos, f, sinMirar: 0, girada: false, ausente: 0 });
  }

  // abrigos colgando sobre las calles
  for (let k = 0; k < 7; k++) {
    const m = billboard('s_abrigos', 2.4, 2.5);
    const i = Math.floor(r() * 6), j = Math.floor(r() * 5);
    m.position.set(centroCalle(i), 3.2, centroManzana(j) + (r() - 0.5) * 8);
    escena.add(m);
    viejas.length; // (los abrigos sólo miran a la cámara)
    m.userData.abrigo = true;
    escena.userData.abrigos = (escena.userData.abrigos || []).concat(m);
  }

  // basura
  const basuras = ciudad.basuras.map((p) => {
    const m = billboard('s_basura', 1.0, 1.25);
    m.position.copy(p); escena.add(m); return m;
  });

  // el perro de mancha: sigue de lejos, se detiene si lo miras
  const perro = billboard('m_perro', 1.0, 1.25);
  perro.material.color.setHex(0x1a1614);
  perro.material.fog = false;           // recortado contra la niebla
  perro.material.emissiveIntensity = 0;
  escena.add(perro);
  const perroEstado = { m: perro, activo: false };

  const perseguidora = crearSombra(escena, ciudad, audio);
  const sombraEstado = perseguidora.estado;

  // la boca del muro (se abre cuando te acercas)
  const vBoca = videoTextura('v_boca');
  const fBoca = fachadas[29 % fachadas.length];
  const pb = enFachada(fBoca, 2, 1.6, 0.06);
  const boca = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.36), new THREE.MeshBasicMaterial({ map: vBoca.textura, color: 0x9a9690 }));
  boca.position.copy(pb.pos); boca.rotation.y = pb.rot;
  escena.add(boca);
  const bocaEstado = { m: boca, video: vBoca.video, abierta: false, recarga: 0 };

  // el charco que es un ojo, en la plaza del centro
  const vOjo = videoTextura('v_ojo');
  const ojo = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshBasicMaterial({ map: vOjo.textura, color: 0xffffff }));
  ojo.rotation.x = -Math.PI / 2;
  ojo.position.copy(ciudad.sitios.plazaCentro).add(new THREE.Vector3(0, 0.16, 0));
  escena.add(ojo);
  const ojoEstado = { m: ojo, video: vOjo.video };

  // teléfono público en la plaza del centro
  const cabina = new THREE.Group();
  const marco = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.3, 1.0), ps1Material(new THREE.MeshLambertMaterial({ color: 0x4a1210, transparent: true, opacity: 0.85 })));
  marco.position.y = 1.15;
  const fono = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.12), ps1Material(new THREE.MeshLambertMaterial({ color: 0x111111 })));
  fono.position.set(0, 1.4, 0.45);
  cabina.add(marco, fono);
  cabina.position.copy(ciudad.sitios.plazaCentro).add(new THREE.Vector3(5.5, 0.14, -5));
  escena.add(cabina);
  ciudad.colisiones.push({ x0: cabina.position.x - 0.5, x1: cabina.position.x + 0.5, z0: cabina.position.z - 0.5, z1: cabina.position.z + 0.5 });
  const telefono = { pos: cabina.position, sonando: true, contestado: false, timbre: 0 };

  // la vitrina de televisores que te muestra de espaldas, en vivo
  const objetivoTV = new THREE.WebGLRenderTarget(96, 54, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const camTV = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 40);
  const fTV = fachadas[18 % fachadas.length];
  const tvs = [];
  // filtro de cámara de vigilancia: blanco y negro con contraste, líneas, ruido y un parpadeo
  const matCCTV = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: objetivoTV.texture }, t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D mapa; uniform float t; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)) + t * 9.0) * 43758.5); }
      void main(){
        vec3 c = texture2D(mapa, vUv).rgb;
        float g = dot(pow(max(c, 0.0), vec3(1.0/2.2)), vec3(0.3, 0.59, 0.11));
        g = clamp((g - 0.32) * 2.4 + 0.45, 0.0, 1.0);
        g *= 0.82 + 0.18 * sin(vUv.y * 160.0);
        g += (h(floor(vUv * vec2(96.0, 54.0))) - 0.5) * 0.18;
        g *= 0.9 + 0.1 * step(0.97, fract(t * 0.7));
        gl_FragColor = vec4(vec3(g * 0.92, g, g * 0.88), 1.0);
      }`,
  });
  for (let k = 0; k < 4; k++) {
    const { pos, rot } = enFachada(fTV, -3 + (k % 2) * 1.2, 1.2 + Math.floor(k / 2) * 0.75, 0.08);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.62), matCCTV);
    pant.position.copy(pos); pant.rotation.y = rot;
    escena.add(pant); tvs.push(pant);
  }
  const marcoTV = enFachada(fTV, -2.4, 1.6, 0.04);
  const vitrina = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), material('t_vitrina'));
  vitrina.position.copy(marcoTV.pos); vitrina.rotation.y = marcoTV.rot;
  escena.add(vitrina);

  // la figura gigante: a veces se ve sobre los techos, entre la niebla
  const gigante = billboard('s_sombra', 70, 32);
  gigante.material.color.setHex(0x0a0909);
  gigante.material.fog = false;
  gigante.material.emissiveIntensity = 0;
  gigante.material.transparent = true; gigante.material.opacity = 0.55;
  gigante.position.set(0, 0, -95);
  gigante.visible = false;
  escena.add(gigante);

  const tmp = new THREE.Vector3();
  let tvCuadro = 0;

  function actualizar(dt, t, jugador, camara, estadoJuego) {
    const pj = jugador.pos;
    for (const a of escena.userData.abrigos || []) mirarCamara(a, camara);
    for (const b of basuras) mirarCamara(b, camara);

    // viejas: si no las miras un rato y estás cerca, se dan vuelta y se acercan un paso
    for (const v of viejas) {
      if (v.ausente > 0) { v.ausente -= dt; if (v.ausente <= 0) { v.espalda.visible = true; } continue; }
      const dist = v.espalda.position.distanceTo(pj);
      const vista = loMira(camara, v.espalda.position.clone().setY(1.2), 26, 0.82);
      mirarCamara(v.frente, camara);
      v.espalda.rotation.y = Math.atan2(-v.f.nx, -v.f.nz);   // siempre de cara a la pared
      if (!vista && dist < 16) v.sinMirar += dt; else v.sinMirar = 0;
      if (v.sinMirar > 2.5 && !v.girada) {
        v.girada = true;
        v.espalda.visible = false; v.frente.visible = true;
        // cuando vuelvas a mirar hacia su muro, estará a tres pasos de ti, un poco a la derecha
        tmp.subVectors(v.pos, pj).setY(0).normalize();
        const avance = Math.min(3.3, Math.max(1.5, dist - 0.5));
        v.frente.position.set(pj.x + tmp.x * avance - tmp.z * 0.8, 0.14, pj.z + tmp.z * avance + tmp.x * 0.8);
        audio.crujido();
      }
      if (v.girada && dist < 1.8) {
        estadoJuego.susto(0.6);
        v.frente.visible = false; v.girada = false; v.ausente = 20;
        v.frente.position.copy(v.pos); v.espalda.position.copy(v.pos);
      }
    }

    // perro de mancha
    if (!perroEstado.activo && estadoJuego.tiempoAfuera > 15) {
      perroEstado.activo = true;
      perro.position.set(pj.x - Math.sin(jugador.rumbo) * 14, 0.14, pj.z - Math.cos(jugador.rumbo) * 14);
    }
    if (perroEstado.activo) {
      const d = perro.position.distanceTo(pj);
      const visto = loMira(camara, perro.position.clone().setY(0.5), 30, 0.85);
      if (!visto && d > 9) {
        tmp.subVectors(pj, perro.position).setY(0).normalize();
        perro.position.addScaledVector(tmp, dt * 2.4);
      }
      if (d < 3) perro.position.set(pj.x - Math.sin(jugador.rumbo) * 16, 0.14, pj.z - Math.cos(jugador.rumbo) * 16);
      mirarCamara(perro, camara);
      perro.position.y = 0.14 + Math.abs(Math.sin(t * 6)) * 0.03;
    }

    const peligro = perseguidora.actualizar(dt, jugador, camara, estadoJuego);

    // boca del muro
    const db = boca.position.distanceTo(pj);
    bocaEstado.recarga -= dt;
    if (db < 6 && !bocaEstado.abierta && bocaEstado.recarga <= 0) {
      bocaEstado.abierta = true; bocaEstado.video.currentTime = 0; bocaEstado.video.play().catch(() => {});
      audio.rechinar();
    }
    if (bocaEstado.abierta && db > 9) { bocaEstado.abierta = false; bocaEstado.recarga = 6; }
    if (bocaEstado.abierta && db < 2.2) { estadoJuego.susto(1); bocaEstado.abierta = false; bocaEstado.recarga = 10; }

    // el ojo
    const dOjo = ojo.position.distanceTo(pj);
    if (dOjo < 14 && ojoEstado.video.paused) ojoEstado.video.play().catch(() => {});
    if (dOjo >= 14 && !ojoEstado.video.paused) ojoEstado.video.pause();

    // teléfono
    const dTel = telefono.pos.distanceTo(pj);
    telefono.timbre -= dt;
    if (telefono.sonando && dTel < 22 && telefono.timbre <= 0) { audio.timbre(dTel); telefono.timbre = 3; }

    // vitrina en vivo: una cámara detrás del jugador (cada 3 cuadros)
    matCCTV.uniforms.t.value = t;
    if (++tvCuadro % 3 === 0 && tvs[0].position.distanceTo(pj) < 20) {
      camTV.position.set(pj.x - Math.sin(jugador.rumbo) * 3.2, 1.8, pj.z - Math.cos(jugador.rumbo) * 3.2);
      camTV.lookAt(pj.x, 1.3, pj.z);
      const tvVis = tvs.map((m) => m.visible);
      tvs.forEach((m) => { m.visible = false; });
      const dens = escena.fog.density; escena.fog.density = dens * 0.3;   // la cámara de la vitrina ve más claro
      renderer.setRenderTarget(objetivoTV);
      renderer.render(escena, camTV);
      escena.fog.density = dens;
      renderer.setRenderTarget(null);
      tvs.forEach((m, i) => { m.visible = tvVis[i]; });
    }

    // la figura gigante, de vez en cuando
    gigante.visible = estadoJuego.modo317 || (Math.sin(t * 0.07) > 0.97);
    gigante.position.x = pj.x * 0.3;
    mirarCamara(gigante, camara);

    // frecuencias: con el dial en 317 y cerca, la mancha se despierta
    for (const fr of frecuencias) {
      if (fr.propia) { fr.viva.visible = false; continue; }   // las lleva mision.js
      const d = fr.pos.distanceTo(pj);
      const activa = estadoJuego.modo317 && d < 7;
      fr.viva.visible = activa || fr.hallada;
      if (activa && fr.viva.material.map.image.paused) fr.viva.material.map.image.play().catch(() => {});
      if (activa && !fr.hallada && d < 1.8) {   // casi encima; lo normal es tocarla con E
        fr.hallada = true;
        estadoJuego.hallazgo(fr.texto);
      }
    }
    return { peligro };
  }

  function contestar(pj) {
    if (telefono.sonando && telefono.pos.distanceTo(pj) < 2.2) {
      telefono.sonando = false;
      return true;
    }
    return false;
  }

  function reiniciar(vueltas) {
    perseguidora.reiniciar(vueltas);
    perroEstado.activo = false; perro.position.set(0, -50, 0);

    telefono.sonando = true;
    for (const v of viejas) { v.girada = false; v.frente.visible = false; v.espalda.visible = true; v.ausente = 0; v.frente.position.copy(v.pos); v.espalda.position.copy(v.pos); }
  }

  return { actualizar, contestar, reiniciar, frecuencias, sombra: sombraEstado, telefono, ojo, gigante,
    depurar: { viejas, boca, tvs, perro: perroEstado } };
}
