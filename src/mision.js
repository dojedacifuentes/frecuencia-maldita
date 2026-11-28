// La segunda misión, rehecha el 28-nov (el propietario la encontró aburrida: «buscar tres manchas iguales»). Ahora son
// tres recuerdos en orden, cada uno en un lugar y con una forma distinta de pasarlo:
//   1 · TU SOMBRA EN EL MURO  frente a la plaza del baño, tu sombra está pegada al muro y te copia. Arriba, escrito con
//       sangre: 71.3. Hay que sintonizar la radio en esa frecuencia: la sombra se queda quieta, señala el cerro, el muro
//       sangra y tu propia voz dice dónde ir. Vomitas.
//   2 · EL SANATORIO          tu ficha (planta baja) dice «pieza 12, piso 2». En la pieza 12 duermes tú; al verte, las
//       paredes sangran. Al salir al pasillo se apagan las luces y viene la que gatea: hay que huir. Afuera, vomitas.
//   3 · EL BAÑO               vuelve a donde despertaste y orina en el muro. La mancha toma tu forma y sangra: «la ciudad
//       era la mancha del baño». Se abre el portón R9 (lo que sigue es como antes: la fiesta y los pasillos).
// Si te atrapan, despiertas en el baño pero no pierdes lo que ya recordaste.
import * as THREE from 'three';
import { lienzoTexto } from './ciudad.js';
import { cuerpoListo, crearCuerpo3d } from './cuerpo.js';
import { SO } from './sanatorio.js';

export const DIAL_SOMBRA = 71.3;

export function crearMision({ escena, ciudad, siniestro, sangre, vomito, dano, audio, hud, juego, estadoJuego, jugador, sustos }) {
  const fr = siniestro.frecuencias;
  const m0 = fr[0];   // el muro de la sombra (frente a la plaza del baño)
  const ry0 = m0.fija.rotation.y, n0 = new THREE.Vector3(Math.sin(ry0), 0, Math.cos(ry0)), t0 = new THREE.Vector3(Math.cos(ry0), 0, -Math.sin(ry0));
  const bano = ciudad.sitios.bano;
  const m = { paso: 1, fase: 'ir', t: 0, vomitarEn: 0, lamina: null, avisoDial: false };

  // ---------- lo que se ve
  // la frecuencia, escrita con sangre sobre el muro
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4),
    new THREE.MeshBasicMaterial({ map: lienzoTexto(String(DIAL_SOMBRA), 256, 128, '#8e0c06', 84), transparent: true, depthWrite: false }));
  cartel.position.copy(m0.pos).addScaledVector(n0, 0.06); cartel.position.y = 3.0; cartel.rotation.y = ry0; cartel.renderOrder = 3;
  escena.add(cartel);
  // el muro sangra cuando la sombra habla; el del baño, al final
  const sangreMuro = sangre.agregar('sombra', m0.pos.x + n0.x * 0.09, 1.95, m0.pos.z + n0.z * 0.09, ry0, 5.2, 3.7);
  const sangreBano = sangre.agregar('bano', bano.centro.x, 1.55, bano.muroSur - 0.12, Math.PI, 5.6, 2.9);
  // la pieza 12 del sanatorio (piso 2, la celda del norte del centro): tres paredes
  const Y2 = 8;
  const sangrePieza = [
    sangre.agregar('pieza12a', SO.x + 0, Y2 + 1.75, SO.z - 11.86, 0, 7.4, 3.3),
    sangre.agregar('pieza12b', SO.x - 3.86, Y2 + 1.75, SO.z - 7, Math.PI / 2, 9.4, 3.3),
    sangre.agregar('pieza12c', SO.x + 3.86, Y2 + 1.75, SO.z - 7, -Math.PI / 2, 9.4, 3.3),
  ];
  // el número sobre la puerta de la pieza 12 (piso 2, al medio del pasillo, lado norte)
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5),
    new THREE.MeshBasicMaterial({ map: lienzoTexto('12', 128, 92, '#1a1410', 70), color: 0xd8d0b8 }));
  placa.position.set(SO.x, Y2 + 2.55, SO.z - 1.84); escena.add(placa);
  // columna de luz roja hacia donde toca ir (la boca del cerro, el baño)
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.19, 46, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff2a14, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  columna.visible = false; escena.add(columna);

  // tu sombra: el cuerpo del protagonista, negro y aplastado contra el muro; copia tus movimientos
  let sombra = null;
  const marco = new THREE.Group();   // girado como el muro y aplastado en su normal
  marco.rotation.y = ry0; marco.scale.set(1.3, 1.3, 0.025); marco.visible = false;
  escena.add(marco);
  const matSombra = new THREE.MeshBasicMaterial({ color: 0x030303, transparent: true, opacity: 0, depthWrite: false });
  function prepararSombra() {
    if (sombra || !cuerpoListo()) return;
    sombra = crearCuerpo3d();
    sombra.malla.material = matSombra; sombra.brasa.visible = false; sombra.malla.renderOrder = 3;
    marco.add(sombra.malla);
  }
  const angulo = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let along = 0;

  // ---------- reinicio (al despertar: si fue por una captura, lo recordado se queda)
  function ocultarOtras() {
    for (const k of [1, 2]) { const f = fr[k]; f.hallada = true; f.propia = true; f.oculta = true; f.fija.visible = false; f.viva.visible = false; }
    m0.propia = true; m0.dial = DIAL_SOMBRA;
  }
  function reiniciar(motivo) {
    const antes = m.paso;
    sangreMuro.apagar(); sangreBano.apagar(); sangrePieza.forEach((s) => s.apagar());
    m.t = 0; m.vomitarEn = 0; m.lamina = null; m.hallazgoEn = 0;
    if (motivo === 'captura' && antes > 1) {
      // lo ya recordado se queda: si te atraparon en el sanatorio después de la pieza 12, despiertas en el último paso
      m.paso = antes === 2 && m.pieza12 ? 3 : antes;
    } else { m.paso = 1; m.pieza12 = false; }
    m.fase = m.paso === 1 ? 'ir' : m.paso === 3 ? 'volver' : 'subir';
    ocultarOtras();
    m0.hallada = m.paso > 1; m0.fija.visible = m.paso > 1;
    if (m.paso > 1) { sangreMuro.activar(sangre.t - 120); }   // ya sangró
    juego.halladas = Math.min(3, m.paso - 1);
    if (sombra) { marco.visible = m.paso > 1; matSombra.opacity = m.paso > 1 ? 0.85 : 0; }
  }

  // ---------- qué hacer ahora (sólo en la ciudad; en el cerro y el sanatorio mandan ellos)
  function objetivo(pj, enBano) {
    if (juego.porton) return null;
    if (m.paso === 1) {
      const d = Math.hypot(pj.x - m0.pos.x, pj.z - m0.pos.z);
      if (m.fase === 'revela') return ['Escucha. No te muevas.', null];
      if (d > 11) return ['Ve a la columna de luz roja, frente a la plaza del baño: hay algo en el muro.', m0.pos];
      const dial = juego.dial.toFixed(1);
      return [`Es tu sombra, pegada al muro: te copia. Arriba dice ${DIAL_SOMBRA}. Sintoniza la radio en ${DIAL_SOMBRA} con Z / X o la rueda del ratón (ahora: ${dial}).`, m0.pos];
    }
    if (m.paso === 2) return ['Tu sombra señaló el cerro. Sube al Sanatorio de la Pendiente: sal por la boca del muro este, al final de la calle central (la luz roja).', ciudad.sitios.bocaCerro];
    if (m.paso === 3) {
      if (m.fase === 'revela') return ['No te muevas. Mira la mancha.', null];
      if (enBano) return ['Orina en el muro de los urinarios: acércate al fondo y pulsa E.', { x: bano.centro.x, z: bano.muroSur - 0.6 }];
      return ['Vuelve al baño donde despertaste (la luz roja, en la plaza del sur). Ahí está el último recuerdo.', bano.puerta];
    }
    return null;
  }
  // las frecuencias que también «enganchan» el dial
  const extras = () => (m.paso === 1 ? [DIAL_SOMBRA] : []);

  // ---------- eventos que llegan del sanatorio y del baño
  function evento(nombre) {
    if (nombre === 'pieza12' && m.paso === 2 && !m.pieza12) {
      m.pieza12 = true;
      sangrePieza.forEach((s) => s.activar(sangre.t));
      estadoJuego.susto(1); sustos.temblar(0.9); audio.golpe(1.1); audio.crujido();
      dano.subir();
      m.hallazgoEn = 0.9;
      return true;
    }
    if (nombre === 'salio' && m.paso === 2 && m.pieza12) { m.paso = 3; m.fase = 'volver'; m.vomitarEn = 1.1; return true; }
    return false;
  }
  // orinar: si es en el baño y toca el último recuerdo, esa mancha es la que despierta
  function orino(lamina) {
    if (m.paso !== 3 || m.fase !== 'volver') return false;
    const p = jugador.estado.pos;
    if (Math.abs(p.x - bano.centro.x) > bano.W / 2 || Math.abs(p.z - bano.centro.z) > bano.D / 2) return false;
    m.fase = 'revela'; m.t = 0; m.lamina = lamina;
    return true;
  }

  // ---------- cada cuadro
  const ojo = new THREE.Vector3();
  function actualizar(dt, t, camara, tieneRadio) {
    prepararSombra();
    const pj = jugador.estado.pos;
    // la columna de luz
    const destino = juego.zona === 'ciudad' && !juego.porton ? (m.paso === 2 ? ciudad.sitios.bocaCerro : m.paso === 3 && m.fase === 'volver' ? bano.centro : null) : null;
    columna.visible = !!destino;
    if (destino) { columna.position.set(destino.x, 23, destino.z); columna.material.opacity = 0.22 + Math.pow(Math.max(0, Math.sin(t * 2.4)), 4) * 0.25; }

    if (m.hallazgoEn > 0) { m.hallazgoEn -= dt; if (m.hallazgoEn <= 0) estadoJuego.hallazgo('Eres tú, en la pieza 12: abres los ojos al mismo tiempo.\nLas paredes empiezan a sangrar. Afuera, en el pasillo, algo se levanta.'); }
    // vomitar al salir del sanatorio (un segundo después de llegar al patio)
    if (m.vomitarEn > 0 && juego.zona === 'cerro' && juego.estado === 'jugando') {
      m.vomitarEn -= dt;
      if (m.vomitarEn <= 0) { vomito.empezar(jugador); dano.subir(); hud.limpiar(); hud.decir('Afuera. El aire frío.\nEl cuerpo no aguanta.', 3.2); }
    }

    if (juego.zona !== 'ciudad') return;
    // ---- paso 1: la sombra
    if (m.paso === 1) {
      const d = Math.hypot(pj.x - m0.pos.x, pj.z - m0.pos.z);
      const cerca = d < 12;
      if (!sombra) m0.fija.visible = true;   // sin el modelo 3D queda la mancha de siempre
      matSombra.opacity += ((cerca || m.fase === 'revela' ? 0.86 : 0) - matSombra.opacity) * Math.min(1, dt * 2);
      marco.visible = matSombra.opacity > 0.02;
      if (m.fase === 'ir' && d < 11) { m.fase = 'sombra'; hud.limpiar(); hud.decir(`Tu sombra está en el muro. Se mueve contigo.\nArriba, con sangre: ${DIAL_SOMBRA}.`, 4); audio.susurro(1.2); }
      if (m.fase !== 'revela') {
        // te copia: misma pose, tu posición proyectada en el muro (con un poco de retraso)
        const H = jugador.figura?.huesos, S = sombra?.huesos;
        if (H && S) for (const k in S) { S[k].quaternion.copy(H[k].quaternion); S[k].position.copy(H[k].position); }
        const objetivoA = THREE.MathUtils.clamp((pj.x - m0.pos.x) * t0.x + (pj.z - m0.pos.z) * t0.z + 1.9, -4.4, 4.4);   // corrida: un farol de lado
        along += (objetivoA - along) * Math.min(1, dt * 3);
        if (sombra) sombra.malla.rotation.y = angulo(jugador.estado.rumbo - ry0);
        marco.position.copy(m0.pos).addScaledVector(t0, along).addScaledVector(n0, 0.04); marco.position.y = 0.12;
        // ¿sintonizada?
        if (m.fase === 'sombra' && tieneRadio && Math.abs(juego.dial - DIAL_SOMBRA) < 0.25 && d < 12 && juego.estado === 'jugando') {
          m.fase = 'revela'; m.t = 0; juego.dial = DIAL_SOMBRA;
          audio.pulsos3(); estadoJuego.susto(0.6); hud.limpiar(); hud.decir('La sombra deja de copiarte.', 2.5);
        }
      } else {
        m.t += dt;
        // se queda de perfil y levanta el brazo: señala el este (el cerro)
        const giro = THREE.MathUtils.smoothstep(m.t, 0.8, 1.8);
        if (sombra) sombra.malla.rotation.y = angulo(Math.PI / 2 - ry0) * giro + sombra.malla.rotation.y * (1 - giro);
        if (sombra?.huesos && m.t > 0.8) {
          const S = sombra.huesos, e = THREE.MathUtils.smoothstep(m.t, 1.0, 2.2);
          S.hombroD.rotation.set(-1.55 * e, 0, 0); S.codoD.rotation.set(0, 0, 0); S.cabeza.rotation.set(0, -0.9 * e, 0);
          for (const k of ['musloI', 'musloD', 'rodillaI', 'rodillaD', 'hombroI', 'codoI']) S[k].rotation.set(0, 0, 0);
        }
        if (m.t > 1.2 && !sangreMuro.activa) { sangreMuro.activar(sangre.t); audio.crujido(); sustos.temblar(0.4); }
        if (m.t > 1.6 && m.t - dt <= 1.6) { hud.limpiar(); hud.decir(`La radio, en ${DIAL_SOMBRA}, habla con tu voz:\n«Pieza 12. Sanatorio de la Pendiente. Ahí te dejaste».`, 5); audio.voz(0.8); }
        if (m.t > 4.4 && m.t - dt <= 4.4) audio.voz(0);
        if (m.t > 5.0 && m.t - dt <= 5.0) { vomito.empezar(jugador); dano.subir(); }
        if (m.t > 8.6) {
          m.paso = 2; m.fase = 'subir';
          m0.hallada = true; m0.fija.visible = true;
          estadoJuego.hallazgo('Tu sombra se quedó en el muro, señalando el este: el cerro.\nSube al sanatorio. Pieza 12.');
        }
      }
    }
    // ---- paso 3: la mancha del baño
    if (m.paso === 3 && m.fase === 'revela') {
      m.t += dt;
      const l = m.lamina;
      if (l && m.t > 1.0 && !l.forma) { l.edad = 99; }   // toma tu forma ya (main.js la cambia a la silueta)
      if (m.t > 1.2 && !sangreBano.activa) { sangreBano.activar(sangre.t); audio.crujido(); }
      bano.luz.intensity = m.t < 5 ? (Math.random() < 0.3 ? 0.4 : 5) : 5;
      if (l) { const s = 1 + Math.sin(m.t * 3) * 0.04 * Math.min(1, m.t / 2); l.plano.scale.set(s, s, 1); }   // respira
      if (m.t > 2.4 && m.t - dt <= 2.4) { hud.limpiar(); hud.decir('La mancha respira. Tiene tu forma.\nLa radio, sola, en 31.7: «La ciudad era la mancha del baño».', 5); estadoJuego.susto(0.7); sustos.temblar(0.5); }
      if (m.t > 7.4) {
        m.paso = 4; m.fase = 'listo';
        estadoJuego.hallazgo('Recordaste las tres veces.');
      }
    }
  }

  ocultarOtras();
  return { reiniciar, objetivo, evento, orino, actualizar, extras, get paso() { return m.paso; }, get fase() { return m.fase; }, depurar: m, cartel };
}
