// Rarezas de la ciudad, todas ligadas a la historia (el bucle de las 03:17, la radio, el hombre desaparecido, el niño
// que fue):
//   · el espejo del baño: tu reflejo se mueve tarde, a saltos; desde la segunda vuelta hay una mujer detrás de ti
//     que sólo existe en el espejo
//   · el niño de espaldas, con tu abrigo arrastrando: se desvanece cuando te acercas, deja un charco tibio y reaparece
//     más allá, camino a la mancha que falta (o al portón)
//   · relojes en los muros, todos en 03:17; uno anda hacia atrás, más rápido si lo miras
//   · ventanas encendidas con alguien que te sigue con la mirada y se agacha si lo miras de frente
//   · puertas a cinco metros del suelo, sin escalera, donde golpean desde adentro
//   · un carrito de supermercado que anda solo con una radio envuelta en una manta, como una guagua
//   · el kiosco de la plaza sur: todos los diarios dicen que sigues desaparecido
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { material, textura, ps1Material } from './ps1.js';
import { centroCalle, N, LADO, MANZANA, CALLE } from './ciudad.js';
import { loMira } from './siniestro.js';

// muros ya usados por manchas, frases, viejas, boca, televisores y la puerta con candado
const OCUPADAS = new Set([3, 10, 17, 24, 31, 38, 45, 52, 59, 66, 11, 46, 77, 5, 18, 44, 57, 70, 29]);

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); dibujar(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return { t, c, g };
}
function enMuro(f, a, y, sep) {
  const tx = f.nz !== 0 ? a : 0, tz = f.nx !== 0 ? a : 0;
  return { x: f.x + f.nx * sep + tx, y, z: f.z + f.nz * sep + tz, rot: Math.atan2(f.nx, f.nz), nx: f.nx, nz: f.nz };
}
// el punto de calle más cercano (las calles están libres de edificios)
function enCalle(x, z) {
  const paso = MANZANA + CALLE, mitad = LADO / 2;
  const ix = Math.max(0, Math.min(N, Math.round((x + mitad - CALLE / 2) / paso)));
  const iz = Math.max(0, Math.min(N, Math.round((z + mitad - CALLE / 2) / paso)));
  const cx = centroCalle(ix), cz = centroCalle(iz);
  return Math.abs(x - cx) < Math.abs(z - cz) ? { x: cx, z } : { x, z: cz };
}

function dibujarReloj(g, w, h, horas, minutos) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#d6cfbd'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1a1612'; g.lineWidth = 3; g.stroke();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * w * 0.36, h / 2 - Math.cos(a) * h * 0.36);
    g.lineTo(w / 2 + Math.sin(a) * w * 0.43, h / 2 - Math.cos(a) * h * 0.43); g.lineWidth = 2; g.stroke();
  }
  const aguja = (ang, largo, ancho) => {
    g.lineWidth = ancho; g.beginPath(); g.moveTo(w / 2, h / 2);
    g.lineTo(w / 2 + Math.sin(ang) * largo, h / 2 - Math.cos(ang) * largo); g.stroke();
  };
  aguja(((horas % 12) + minutos / 60) / 12 * Math.PI * 2, w * 0.22, 4);
  aguja((minutos / 60) * Math.PI * 2, w * 0.36, 2);
  g.fillStyle = '#7a1510'; g.font = 'bold 9px "Courier New", monospace'; g.textAlign = 'center'; g.fillText('R9', w / 2, h * 0.7);
}

export function crearRarezas({ escena, ciudad, camara, audio, hud, interaccion, plano, pistas, leerJuego }) {
  const grupo = new THREE.Group();
  escena.add(grupo);
  const libres = ciudad.fachadas.map((f, i) => ({ f, i })).filter((x) => !OCUPADAS.has(x.i) && !ciudad.ocupadas?.has(x.i));
  const elegir = (k, salto) => libres[(k * salto + 7) % libres.length].f;
  const b = ciudad.sitios.bano;
  const tmp = new THREE.Vector3();

  // ---------------- el espejo del baño
  const espejo = new Reflector(new THREE.PlaneGeometry(0.95, 1.2), { textureWidth: 96, textureHeight: 120, color: 0x8c968c, multisample: 0 });
  espejo.position.set(b.centro.x + b.W / 2 - 0.112, 1.6, b.centro.z - 0.4);
  espejo.rotation.y = -Math.PI / 2;
  const marco = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.34, 1.09), ps1Material(new THREE.MeshLambertMaterial({ color: 0x2a2520 })));
  marco.position.set(espejo.position.x + 0.03, 1.6, espejo.position.z);
  grupo.add(espejo, marco);
  // a saltos: el reflejo se renueva cuatro veces por segundo
  const reflejar = espejo.onBeforeRender;
  let ultimoReflejo = 0;
  espejo.onBeforeRender = function (...args) {
    const ahora = performance.now();
    if (ahora - ultimoReflejo < 250) return;
    ultimoReflejo = ahora;
    reflejar.apply(this, args);
  };
  // la mujer que sólo está en el espejo (capa 1: la cámara del juego no la ve; la del reflejo, sí)
  const texVieja = textura('s_vieja_espalda');
  const geoVieja = new THREE.PlaneGeometry(0.95, 1.62); geoVieja.translate(0, 0.81, 0);
  const mujer = new THREE.Mesh(geoVieja, ps1Material(new THREE.MeshLambertMaterial({ map: texVieja, alphaTest: 0.5, side: THREE.DoubleSide,
    emissive: 0xffffff, emissiveMap: texVieja, emissiveIntensity: 0.25 })));
  mujer.position.set(b.centro.x - b.W / 2 + 0.55, 0.16, b.centro.z + 0.9);
  mujer.rotation.y = Math.PI / 2;
  mujer.layers.set(1);
  grupo.add(mujer);
  espejo.getReflectionCamera(camara).layers.enable(1);
  interaccion.agregar({
    zona: 'ciudad', pos: { x: espejo.position.x - 1.1, z: espejo.position.z }, radio: 1.9, etiqueta: 'mirarte en el espejo',
    accion: () => {
      if (mujer.visible) { audio.latido(1); return 'Tu reflejo se mueve tarde.\nDetrás de ti, en el espejo, una mujer mira la pared.\nTe das vuelta. No hay nadie.'; }
      return 'Tu reflejo se mueve tarde, a saltos.\nAlgún día no te va a seguir.';
    },
  });

  // ---------------- el niño de espaldas
  const { t: texNino } = lienzo(64, 128, (g) => {
    g.fillStyle = '#060505';
    g.beginPath(); g.arc(32, 22, 10, 0, Math.PI * 2); g.fill();                  // cabeza
    g.beginPath(); g.moveTo(20, 34); g.lineTo(44, 34); g.lineTo(56, 124); g.lineTo(8, 124); g.closePath(); g.fill();   // abrigo grande
    g.fillRect(4, 118, 56, 8);                                                     // el abrigo arrastra
    g.fillRect(14, 40, 7, 40); g.fillRect(43, 40, 7, 40);                          // mangas largas
  });
  const geoNino = new THREE.PlaneGeometry(0.62, 1.24); geoNino.translate(0, 0.62, 0);
  const nino = new THREE.Mesh(geoNino, new THREE.MeshBasicMaterial({ map: texNino, transparent: true, alphaTest: 0.4 }));
  grupo.add(nino);
  const charcos = [];
  const matCharco = new THREE.MeshBasicMaterial({ color: 0x1c1a14, transparent: true, opacity: 0.7, depthWrite: false });
  const FRASES_NINO = [
    'Donde estaba el niño, un charco tibio.',
    'Tenía tu abrigo. Le arrastraba.',
    'Se rió con tu risa de antes.',
    'Te esperó. Siempre te espera.',
  ];
  const ninoEstado = { espera: 0, frase: 0, ultimo: false, fin: false };
  function ponerNino(x, z) {
    const p = enCalle(x, z);
    nino.position.set(p.x, 0.15, p.z); nino.visible = true;
  }
  function siguienteParada() {
    const x = pistas.masCercana(nino.position);
    const meta = x ? x.f.pos : ciudad.sitios.porton.position;
    const dx = meta.x - nino.position.x, dz = meta.z - nino.position.z, d = Math.hypot(dx, dz);
    if (d < 14) {
      // llegó: junto a la mancha (o al portón, y ahí termina su camino)
      ninoEstado.ultimo = true; ninoEstado.fin = !x;
      ponerNino(meta.x - Math.sign(dx || 1) * 2, meta.z - Math.sign(dz || 1) * 2);
      return;
    }
    ponerNino(nino.position.x + (dx / d) * 18, nino.position.z + (dz / d) * 18);
  }

  // ---------------- relojes en 03:17
  const relojes = [];
  for (let k = 0; k < 7; k++) {
    const f = elegir(k, 11), p = enMuro(f, -4, 3.3, 0.05);
    const lz = lienzo(64, 64, (g, w, h) => dibujarReloj(g, w, h, 3, 17));
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), ps1Material(new THREE.MeshLambertMaterial({ map: lz.t, emissive: 0xffffff, emissiveMap: lz.t, emissiveIntensity: 0.35 })));
    m.position.set(p.x, p.y, p.z); m.rotation.y = p.rot;
    grupo.add(m);
    const reloj = { m, lz, p, alReves: k === 0, minutos: 3 * 60 + 17, cuenta: 0 };
    relojes.push(reloj);
    interaccion.agregar({
      zona: 'ciudad', pos: { x: p.x + p.nx * 2.2, z: p.z + p.nz * 2.2 }, radio: 3.2, etiqueta: 'mirar el reloj',
      accion: () => (reloj.alReves
        ? 'Este anda hacia atrás.\nCuando lo miras, se apura.'
        : 'Marca las 03:17. El segundero tiembla\ny no avanza. Como todos.'),
    });
  }

  // ---------------- ventanas con alguien adentro
  const { t: texSilueta } = lienzo(64, 64, (g) => {
    g.fillStyle = '#080605';
    g.beginPath(); g.arc(32, 22, 11, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(10, 64); g.quadraticCurveTo(12, 36, 32, 36); g.quadraticCurveTo(52, 36, 54, 64); g.fill();
  });
  const ventanas = [];
  for (let k = 0; k < 9; k++) {
    const f = elegir(k, 7), p = enMuro(f, 3.5, 4.7, 0.1);
    const luz = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), new THREE.MeshBasicMaterial({ color: 0xffa040, fog: false }));
    luz.position.set(p.x, p.y, p.z); luz.rotation.y = p.rot;
    const silueta = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: texSilueta, transparent: true, alphaTest: 0.4 }));
    silueta.position.set(0, -0.3, 0.02);
    luz.add(silueta);
    grupo.add(luz);
    ventanas.push({ luz, silueta, p, agachada: 0 });
  }

  // ---------------- puertas en lo alto, sin escalera
  const puertasAltas = [];
  for (let k = 0; k < 4; k++) {
    const f = elegir(k + 20, 13), p = enMuro(f, 0.5, 5.6, 0.1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), material('t_puerta', [1, 1], { color: 0x8a8070 }));
    m.position.set(p.x, p.y, p.z); m.rotation.y = p.rot;
    const umbral = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.4), material('t_concreto', [1, 1]));
    umbral.position.set(p.x + p.nx * 0.18, p.y - 1.15, p.z + p.nz * 0.18); umbral.rotation.y = p.rot;
    // una ampolleta pelada encima, que parpadea
    const ampolleta = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd890, fog: false }));
    ampolleta.position.set(p.x + p.nx * 0.25, p.y + 1.35, p.z + p.nz * 0.25);
    grupo.add(m, umbral, ampolleta);
    const puerta = { pos: new THREE.Vector3(p.x, p.y, p.z), p, ampolleta, espera: 2 + k * 1.7 };
    puertasAltas.push(puerta);
    interaccion.agregar({
      zona: 'ciudad', pos: { x: p.x + p.nx * 2.2, z: p.z + p.nz * 2.2 }, radio: 3.4, etiqueta: 'mirar la puerta de arriba',
      accion: () => { audio.golpes(puerta.pos, 3); return 'Una puerta a cinco metros del suelo, sin escalera.\nAlguien golpea desde adentro.\nSabe que estás abajo.'; },
    });
  }

  // ---------------- el carrito con la radio-guagua
  const carrito = new THREE.Group();
  const metal = new THREE.LineBasicMaterial({ color: 0x9c9c96 });
  const canasto = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.45, 0.92)), metal);
  canasto.position.y = 0.78;
  const rejilla = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.45, 0.92, 3, 2, 5)), metal);
  rejilla.position.y = 0.78;
  const manilla = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x7a1510 }));
  manilla.position.set(0, 1.08, -0.52);
  const manta = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.5), ps1Material(new THREE.MeshLambertMaterial({ color: 0x6b5644 })));
  manta.position.set(0, 0.8, 0.05);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xff2a10 }));
  led.position.set(0.12, 0.95, 0.25);
  carrito.add(canasto, rejilla, manilla, manta, led);
  for (const [x, z] of [[-0.26, -0.38], [0.26, -0.38], [-0.26, 0.38], [0.26, 0.38]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0x151515 }));
    r.position.set(x, 0.22, z); carrito.add(r);
  }
  grupo.add(carrito);
  const via = { x: centroCalle(1) + 1.2, z0: centroCalle(1), z1: centroCalle(4) };
  const carro = { z: via.z0 + 6, dir: 1, sonido: 0 };
  interaccion.agregar({
    zona: 'ciudad', pos: carrito.position, radio: 2.8, etiqueta: 'mirar dentro del carro',
    accion: () => 'Adentro hay una radio envuelta en una manta,\ncomo una guagua. Sintonizada en 31.7.\nEstá tibia. Late.',
  });

  // ---------------- el kiosco de la plaza sur
  const ps = ciudad.sitios.plazaSur;
  const kx = ps.x - 5.0, kz = ps.z - 4.6;
  const { t: texDiarios } = lienzo(256, 128, (g, w, h) => {
    g.fillStyle = '#2a2420'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const x = 6 + k * 62;
      g.fillStyle = '#d9d2bf'; g.fillRect(x, 8, 56, 112);
      g.fillStyle = '#1a1612'; g.font = 'bold 9px "Courier New", monospace';
      g.fillText('LA NOCHE', x + 4, 20);
      g.fillStyle = '#7a1510'; g.font = 'bold 8px "Courier New", monospace';
      g.fillText('SIGUE', x + 4, 34); g.fillText('DESAPARE-', x + 4, 43); g.fillText('CIDO', x + 4, 52);
      // la foto: un hombre de abrigo verde, de espaldas
      g.fillStyle = '#4a4a3a'; g.fillRect(x + 6, 60, 44, 50);
      g.fillStyle = '#121010'; g.beginPath(); g.arc(x + 28, 72, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3d4526'; g.fillRect(x + 18, 79, 20, 31);
    }
  });
  const kiosco = new THREE.Group();
  const cuerpoK = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 1.6), material('t_cortina', [1, 1], { color: 0x5a5148 }));
  cuerpoK.position.y = 1.15;
  const techoK = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.0), material('t_oxido', [1, 1]));
  techoK.position.y = 2.36;
  const diarios = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), ps1Material(new THREE.MeshLambertMaterial({ map: texDiarios, emissive: 0xffffff, emissiveMap: texDiarios, emissiveIntensity: 0.3 })));
  diarios.position.set(1.01, 1.2, 0); diarios.rotation.y = Math.PI / 2;
  kiosco.add(cuerpoK, techoK, diarios);
  kiosco.position.set(kx, 0.14, kz);
  grupo.add(kiosco);
  ciudad.colisiones.push({ x0: kx - 1.0, x1: kx + 1.0, z0: kz - 0.8, z1: kz + 0.8 });
  plano.agregarLugar({ zona: 'ciudad', pos: { x: kx, z: kz }, nota: 'kiosco: salgo\nen los diarios', dx: -10, dy: -24 });
  interaccion.agregar({
    zona: 'ciudad', pos: { x: kx + 1.9, z: kz }, radio: 2.6, etiqueta: 'leer los diarios',
    accion: () => 'Todas las portadas son la misma:\n«SIGUE DESAPARECIDO EL HOMBRE DEL ABRIGO VERDE».\nLa foto es tuya, de espaldas. La sacaron hoy.',
  });

  // ---------------- cada vuelta
  function reiniciar(vueltas) {
    ponerNino(b.puerta.x + 2, b.puerta.z - 9);
    ninoEstado.espera = 0; ninoEstado.ultimo = false; ninoEstado.fin = false;
    for (const c of charcos) grupo.remove(c);
    charcos.length = 0;
    mujer.visible = vueltas >= 1;
    for (const r of relojes) r.minutos = 3 * 60 + 17;
  }

  function actualizar(dt, t, jugador) {
    const pj = jugador.pos;
    // el niño: se esfuma si te acercas y reaparece más allá, camino a la mancha
    if (nino.visible) {
      nino.rotation.y = Math.atan2(camara.position.x - nino.position.x, camara.position.z - nino.position.z);
      if (leerJuego().afuera && Math.hypot(nino.position.x - pj.x, nino.position.z - pj.z) < 6.5) {
        nino.visible = false;
        const c = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10), matCharco);
        c.rotation.x = -Math.PI / 2; c.position.set(nino.position.x, 0.16, nino.position.z);
        grupo.add(c); charcos.push(c);
        if (charcos.length > 8) grupo.remove(charcos.shift());
        audio.susurro(0.9);
        if (ninoEstado.frase < 6) hud.decir(FRASES_NINO[ninoEstado.frase++ % FRASES_NINO.length], 3);
        ninoEstado.espera = ninoEstado.ultimo ? -1 : 2.5;
      }
    } else if (ninoEstado.espera > 0) {
      ninoEstado.espera -= dt;
      if (ninoEstado.espera <= 0) siguienteParada();
    } else if (ninoEstado.ultimo && !ninoEstado.fin) {
      // te dejó junto a una mancha: cuando la despiertes, vuelve a aparecer para llevarte a la otra (o al portón)
      const x = pistas.masCercana(nino.position);
      if (!x || x.d > 16) { ninoEstado.ultimo = false; siguienteParada(); }
    }

    // relojes: uno anda hacia atrás (más rápido si lo miras)
    for (const r of relojes) {
      if (!r.alReves) continue;
      r.cuenta -= dt;
      if (r.cuenta > 0) continue;
      const mirado = loMira(camara, r.m.position, 30, 0.9);
      r.minutos -= mirado ? 7 : 1;
      r.cuenta = 0.5;
      const m = ((r.minutos % 720) + 720) % 720;
      dibujarReloj(r.lz.g, 64, 64, Math.floor(m / 60), m % 60);
      r.lz.t.needsUpdate = true;
    }

    // ventanas: te siguen con la mirada; si las miras de frente, se agachan
    for (const v of ventanas) {
      const d = Math.hypot(v.p.x - pj.x, v.p.z - pj.z);
      if (d > 45) continue;
      if (v.agachada > 0) v.agachada -= dt;
      else if (loMira(camara, v.luz.position, 45, 0.985)) { v.agachada = 3; }
      v.silueta.visible = v.agachada <= 0;
      v.luz.material.color.setHex(v.agachada > 2.4 ? 0x2a1a08 : 0xffa040);
      // se corre hacia tu lado de la ventana
      tmp.set(pj.x - v.p.x, 0, pj.z - v.p.z);
      const lado = v.p.nz !== 0 ? tmp.x * Math.sign(v.p.nz) : -tmp.z * Math.sign(v.p.nx);
      v.silueta.position.x += (Math.max(-0.3, Math.min(0.3, lado * 0.03)) - v.silueta.position.x) * Math.min(1, dt * 2);
    }

    // puertas en lo alto: golpean cuando pasas cerca
    for (const p of puertasAltas) {
      p.ampolleta.visible = Math.sin(t * 9 + p.pos.x) > -0.7 || Math.random() < 0.3;
      p.espera -= dt;
      const d = Math.hypot(p.pos.x - pj.x, p.pos.z - pj.z);
      if (d < 10 && p.espera <= 0) { audio.golpes(p.pos, d); p.espera = 6 + Math.random() * 4; }
    }

    // el carrito: anda solo por la calle; se detiene si lo miras o si estás cerca
    const dCarro = Math.hypot(carrito.position.x - pj.x, carrito.position.z - pj.z);
    const quieto = dCarro < 5 || loMira(camara, tmp.set(carrito.position.x, 0.8, carrito.position.z), 30, 0.9);
    if (!quieto) {
      carro.z += carro.dir * dt * 0.75;
      if (carro.z > via.z1) carro.dir = -1;
      if (carro.z < via.z0) carro.dir = 1;
    }
    carrito.position.set(via.x, 0.02, carro.z);
    carrito.rotation.y = carro.dir > 0 ? 0 : Math.PI;
    led.visible = Math.sin(t * 6) > 0;
    carro.sonido -= dt;
    if (dCarro < 24 && carro.sonido <= 0) { audio.radioLejana(carrito.position, dCarro); carro.sonido = 0.7 + Math.random() * 0.5; }
  }

  return { actualizar, reiniciar, depurar: { espejo, mujer, nino, relojes, ventanas, puertasAltas, carrito, kiosco: kiosco.position } };
}
