// Los teléfonos del camino: tres cabinas que empiezan a sonar cuando pasas cerca. Hay 14 segundos para contestar
// (arriba aparece «¡CONTESTA EL TELÉFONO!» y el minimapa lo marca). Si contestas, la voz ayuda: dice dónde está la
// mancha que sigue, deja pilas o calma a la sombra. Si lo dejas sonar, algo se despierta: la sombra sale a buscarte.
import * as THREE from 'three';
import { ps1Material } from './ps1.js';

const PLAZO = 14;
// [x, z] en la vereda, sobre el camino baño → manchas → portón
const LUGARES = [[9.0, 11.0], [9.0, -25.5], [-3.5, -53.2]];   // el primero, a la salida del pasaje; el segundo, junto al puente

export function crearTelefonos({ escena, ciudad, siniestro, audio, hud, interaccion, inventario, plano, pistas, estadoJuego, leerJuego }) {
  const vidrio = ps1Material(new THREE.MeshLambertMaterial({ color: 0x4a1210, transparent: true, opacity: 0.85 }));
  const negro = ps1Material(new THREE.MeshLambertMaterial({ color: 0x111111 }));

  function revelarSiguiente() {
    const x = pistas.siguiente(plano.revelada);
    if (!x) return null;
    plano.revelar(x.i);
    return `La mancha ${x.i + 1} está ${pistas.describir(x.f.pos)}.`;
  }
  // lo que dice cada uno cuando contestas
  const VOCES = [
    () => `«¿Aló? Hay arañas en el baño. Siempre hubo.\n${revelarSiguiente() || 'Ya las despertaste todas.'}»\n(Quedó anotado en el plano)`,
    () => `«Soy yo, tu mamá. Te dejé pilas en la cabina.\nVuelve antes de las tres».\n${inventario.dar('pilas')}`,
    () => {
      const s = siniestro.sombra;
      s.activa = false; s.espera = 60; s.forzar = false; s.m.position.set(0, -50, 0);
      return '«En la fábrica no te des vuelta.\nTu doble te va a mirar. No le hables».\nLa sombra se fue, por ahora.';
    },
  ];

  const cabinas = LUGARES.map(([x, z], k) => {
    const g = new THREE.Group();
    const marco = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.3, 1.0), vidrio);
    marco.position.y = 1.15;
    const fono = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.12), negro);
    fono.position.set(0, 1.4, 0.45);
    const foco = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: 0x331010, fog: false }));
    foco.position.y = 2.36;
    g.add(marco, fono, foco);
    g.position.set(x, 0.14, z);
    // de cara a la calle más cercana
    g.rotation.y = Math.abs(x) > Math.abs(z) ? (x > 0 ? Math.PI / 2 : -Math.PI / 2) : (z > 0 ? 0 : Math.PI);
    escena.add(g);
    ciudad.colisiones.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5 });
    plano.agregarLugar({ zona: 'ciudad', pos: { x, z }, nota: 'teléfono', dx: 0, dy: -16 });
    const c = { pos: g.position, foco, estado: 'espera', plazo: 0, timbre: 0, k };
    interaccion.agregar({
      zona: 'ciudad', pos: g.position, radio: 2.6,
      etiqueta: () => (c.estado === 'suena' ? 'contestar el teléfono' : 'levantar el auricular'),
      accion: () => {
        if (c.estado !== 'suena') return 'Sólo se oye la estática.\nY alguien que respira igual que tú.';
        c.estado = 'contestado';
        audio.golpe(0.5);
        return VOCES[k]();
      },
    });
    return c;
  });

  function actualizar(dt, t, jugador) {
    const juego = leerJuego();
    for (const c of cabinas) {
      const d = Math.hypot(c.pos.x - jugador.pos.x, c.pos.z - jugador.pos.z);
      if (c.estado === 'espera' && juego.afuera && d < 20) { c.estado = 'suena'; c.plazo = PLAZO; c.timbre = 0; }
      if (c.estado !== 'suena') { c.foco.material.color.setHex(0x331010); continue; }
      c.plazo -= dt;
      c.timbre -= dt;
      c.foco.material.color.setHex(Math.sin(t * 12) > 0 ? 0xff3020 : 0x331010);
      if (c.timbre <= 0) { audio.timbre(Math.min(d, 12)); c.timbre = 2.2; }   // se oye fuerte aunque estés lejos
      if (c.plazo <= 0) {
        // no contestaste: algo se despierta
        c.estado = 'perdido';
        const s = siniestro.sombra;
        if (!s.activa) { s.forzar = true; s.espera = 0; }
        estadoJuego.susto(0.6);
        hud.limpiar();
        hud.decir('El teléfono dejó de sonar.\nAlgo se despertó. Viene por ti.\n(La linterna la frena)', 4);
      }
    }
  }

  // el que está sonando, para el objetivo de arriba
  function sonando() {
    const c = cabinas.find((x) => x.estado === 'suena');
    return c ? { pos: c.pos, quedan: Math.ceil(c.plazo) } : null;
  }

  function reiniciar() { for (const c of cabinas) { c.estado = 'espera'; } }

  return { actualizar, sonando, reiniciar, depurar: { cabinas } };
}
