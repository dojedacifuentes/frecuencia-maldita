// Lo que anda por las calles, además de las ratas:
//   · abrigos sin cabeza: tu mismo abrigo verde, caminando solo de un lado a otro. Si lo alumbras con la linterna, se
//     desploma vacío en el suelo (un rato). Si te toca, te asusta y se esfuma.
//   · el paradero de las 03:17: una fila de viejas de espaldas esperando una micro que nunca pasa; cuando te acercas,
//     se dan vuelta todas a la vez.
import * as THREE from 'three';
import { textura, ps1Material } from './ps1.js';
import { cuerpoListo, crearCuerpo3d } from './cuerpo.js';
import { centroCalle } from './ciudad.js';

function lienzoTexto(lineas, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d0b8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2a2420'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  g.fillStyle = '#1a1612'; g.textAlign = 'center'; g.font = 'bold 20px "Courier New", monospace';
  lineas.forEach((l, i) => { g.fillStyle = i === 1 ? '#7a1510' : '#1a1612'; g.fillText(l, w / 2, 28 + i * 24); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

export function crearCalles({ escena, ciudad, camara, audio, hud, interaccion, estadoJuego, inventario }) {
  // ---------------- abrigos sin cabeza (sólo si cargó el modelo 3D)
  // rutas: [x0, z0, x1, z1] por el medio de calles que cruza el camino a las manchas
  const RUTAS = [[-30, centroCalle(4), 30, centroCalle(4)], [centroCalle(3), -22, centroCalle(3), 24], [-30, centroCalle(0), 30, centroCalle(0)]];
  const abrigos = [];
  if (cuerpoListo()) {
    RUTAS.forEach(([x0, z0, x1, z1], k) => {
      const c = crearCuerpo3d();
      c.huesos.cabeza.scale.setScalar(0.001);   // sin cabeza: el cuello termina en nada
      c.brasa.visible = false;
      const raiz = new THREE.Group(); raiz.add(c.malla); escena.add(raiz);
      const a = { c, raiz, x0, z0, x1, z1, u: (k * 0.37) % 1, dir: 1, fase: k, caido: 0, ausente: 0, bolsillo: k === 1 };
      abrigos.push(a);
      interaccion.agregar({
        zona: 'ciudad', pos: raiz.position, radio: 2.4, activo: () => a.caido > 0 && a.ausente <= 0,
        etiqueta: 'revisar el abrigo',
        accion: () => {
          if (a.bolsillo) { a.bolsillo = false; return `Está vacío y tibio. Huele a tu cigarro.\nEn el bolsillo hay pilas.\n${inventario.dar('pilas')}`; }
          return 'Está vacío y tibio. Huele a tu cigarro.\nEn el bolsillo, un papel: «no me sigas».';
        },
      });
    });
  }

  // ---------------- el paradero de las 03:17
  const px = 7.4, pz0 = 2.5;   // vereda este de la plaza central, mirando a la calle
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), ps1Material(new THREE.MeshLambertMaterial({ color: 0x3a3a38 })));
  poste.position.set(px, 1.44, pz0 - 1.2);
  const letrero = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62),
    ps1Material(new THREE.MeshLambertMaterial({ map: lienzoTexto(['PARADERO', 'R9', '03:17'], 160, 96), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 })));
  letrero.material.emissiveMap = letrero.material.map; letrero.material.emissiveIntensity = 0.35;
  letrero.position.set(px, 2.55, pz0 - 1.2); letrero.rotation.y = Math.PI / 2;
  escena.add(poste, letrero);
  const espalda = textura('s_vieja_espalda'), frente = textura('s_vieja_frente');
  const fila = [];
  for (let k = 0; k < 5; k++) {
    const geo = new THREE.PlaneGeometry(0.95, 1.62); geo.translate(0, 0.81, 0);
    const mat = ps1Material(new THREE.MeshLambertMaterial({ map: espalda, alphaTest: 0.5, side: THREE.DoubleSide,
      emissive: 0xffffff, emissiveMap: espalda, emissiveIntensity: 0.3 }));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px + (k % 2) * 0.15, 0.14, pz0 + k * 1.05);
    escena.add(m);
    fila.push({ m, mat });
  }
  const parada = { vueltas: false };
  interaccion.agregar({
    zona: 'ciudad', pos: { x: px + 1.6, z: pz0 + 2 }, radio: 3.0, etiqueta: 'preguntar por la micro',
    accion: () => 'Nadie contesta. Todas miran tu abrigo.\nLa micro de las 03:17 no ha pasado nunca.',
  });

  const tmp = new THREE.Vector3();
  function actualizar(dt, t, jugador) {
    const pj = jugador.pos;
    // abrigos: caminan de un extremo al otro de su calle
    for (const a of abrigos) {
      if (a.ausente > 0) { a.ausente -= dt; a.raiz.visible = a.ausente <= 0; continue; }
      const d = Math.hypot(a.raiz.position.x - pj.x, a.raiz.position.z - pj.z);
      // la linterna los tumba: quedan vacíos en el suelo
      if (a.caido <= 0 && jugador.linternaOn && d < 14) {
        tmp.set(a.raiz.position.x - pj.x, 0, a.raiz.position.z - pj.z).normalize();
        if (tmp.x * Math.sin(jugador.rumbo) + tmp.z * Math.cos(jugador.rumbo) > 0.93) { a.caido = 9; audio.crujido(); }
      }
      if (a.caido > 0) {
        a.caido -= dt;
        const extra = a.caido > 1.2 ? Math.min(1, (9 - a.caido) / 0.8) : a.caido / 1.2;   // cae y, al final, se levanta
        a.c.posar('cae', 0, t, extra);
        continue;
      }
      if (d < 1.3) {
        estadoJuego.susto(0.9);
        a.ausente = 20; a.raiz.visible = false;
        hud.decir('Te atravesó. Por dentro\nno había nadie. Olía a ti.', 3);
        continue;
      }
      a.u += (a.dir * dt * 1.1) / Math.hypot(a.x1 - a.x0, a.z1 - a.z0);
      if (a.u > 1) { a.u = 1; a.dir = -1; }
      if (a.u < 0) { a.u = 0; a.dir = 1; }
      a.raiz.position.set(a.x0 + (a.x1 - a.x0) * a.u, 0.02, a.z0 + (a.z1 - a.z0) * a.u);
      a.raiz.rotation.y = Math.atan2((a.x1 - a.x0) * a.dir, (a.z1 - a.z0) * a.dir);
      a.fase += dt * 5.5;
      a.c.posar('camina', a.fase, t);
      if (d < 9 && Math.random() < dt * 0.6) audio.crujido();
    }
    // el paradero: de espaldas; cuando te acercas, todas se dan vuelta
    const dp = Math.hypot(px + 2 - pj.x, pz0 + 2 - pj.z);
    const giran = dp < 9 ? true : dp > 14 ? false : parada.vueltas;
    if (giran !== parada.vueltas) {
      parada.vueltas = giran;
      for (const v of fila) { v.mat.map = giran ? frente : espalda; v.mat.emissiveMap = v.mat.map; }
      if (giran) { audio.chirrido(); estadoJuego.susto(0.35); }
    }
    for (const v of fila) v.m.rotation.y = Math.atan2(camara.position.x - v.m.position.x, camara.position.z - v.m.position.z);
  }

  function reiniciar() { for (const a of abrigos) { a.caido = 0; a.ausente = 0; a.raiz.visible = true; } }

  return { actualizar, reiniciar, depurar: { abrigos, fila } };
}
