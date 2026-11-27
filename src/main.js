// LA FRECUENCIA MUERTA · 03:17 — el juego. Todo empieza (y vuelve) en el baño a las 03:17.
// Zonas: la ciudad → (portón R9) → la fiesta → los pasillos que tragan → el baño otra vez.
import * as THREE from 'three';
import { equiparBano } from './ambiente.js';
import { crearRender, textura } from './ps1.js';
import { crearCiudad } from './ciudad.js';
import { crearJugador } from './jugador.js';
import { cargarCuerpo } from './cuerpo.js';
import { crearRatas } from './ratas.js';
import { crearSiniestro } from './siniestro.js';
import { crearFiesta, ORIGEN } from './fiesta.js';
import { crearDetalles } from './detalles.js';
import { crearAudio } from './audio.js';
import { crearHud } from './hud.js';
import { crearPlano } from './plano.js';
import { crearTutorial } from './tutorial.js';
import { pintarControles } from './controles.js';
import { crearPistas } from './pistas.js';
import { crearInteraccion } from './interaccion.js';
import { crearEmisoras, FRECUENCIAS } from './emisoras.js';
import { registrarCosas } from './examinar.js';
import { crearInventario, crearPuerta } from './objetos.js';
import { crearRarezas } from './rarezas.js';
import { crearTelefonos } from './telefonos.js';
import { crearCalles } from './calles.js';
import { crearBichos } from './bichos.js';

pintarControles();

const canvas = document.getElementById('lienzo');
const { renderer, dibujar, post } = crearRender(canvas);
const escena = new THREE.Scene();
const NIEBLAS = {
  ciudad: { color: new THREE.Color(0x46515a), densidad: 0.036 },
  fiesta: { color: new THREE.Color(0x2a0707), densidad: 0.045 },
  pasillos: { color: new THREE.Color(0x1a0303), densidad: 0.07 },
};
escena.background = NIEBLAS.ciudad.color.clone();
escena.fog = new THREE.FogExp2(NIEBLAS.ciudad.color.clone(), 0.05);
const camara = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 140);
const hemi = new THREE.HemisphereLight(0x9aa0aa, 0x4a4034, 1.4);
escena.add(hemi);
const ambiente = new THREE.AmbientLight(0x3a3a36, 0.8);
escena.add(ambiente);
const luzDeCalle = new THREE.DirectionalLight(0xffdfba, 1.5);
luzDeCalle.position.set(-22, 32, 21);
escena.add(luzDeCalle);

const audio = crearAudio();
const hud = crearHud(audio);
const ciudad = crearCiudad(escena);
ciudad.sitios.bano.radio = equiparBano(ciudad.grupo, ciudad.sitios.bano);
const detalles = crearDetalles(escena, ciudad);
// el protagonista en 3D; si el modelo no carga, queda el muñeco de cajas
await cargarCuerpo().catch((e) => console.warn('modelo 3D no disponible, uso el de cajas', e));
const jugador = crearJugador(escena);
const ratas = crearRatas(escena, ciudad, audio);
const siniestro = crearSiniestro(escena, ciudad, renderer, audio);
const fiesta = crearFiesta(escena, () => crearJugador(escena), audio);
const plano = crearPlano({ ciudad, siniestro, fiesta });
const tutorial = crearTutorial(audio);
const pistas = crearPistas({ ciudad, siniestro });
const interaccion = crearInteraccion(hud);
const emisoras = crearEmisoras(audio);
const inventario = crearInventario(audio, hud);
const puerta = crearPuerta(escena, ciudad);
plano.agregarLugar({ zona: 'ciudad', pos: puerta.pos, nota: 'puerta con candado' });
const rarezas = crearRarezas({ escena, ciudad, camara, audio, hud, interaccion, plano, pistas, leerJuego: () => juego });
const telefonos = crearTelefonos({ escena, ciudad, siniestro, audio, hud, interaccion, inventario, plano, pistas,
  estadoJuego: { susto: (v) => estadoJuego.susto(v) }, leerJuego: () => juego });
const calles = crearCalles({ escena, ciudad, camara, audio, hud, interaccion, inventario, estadoJuego: { susto: (v) => estadoJuego.susto(v) } });
const bichos = crearBichos({ escena, ciudad, camara, audio });

// columnas de luz: rojas sobre cada mancha que falta (se ven desde cualquier parte, por encima de los edificios) y una
// blanca sobre el portón cuando se abre. Así siempre se sabe hacia dónde ir.
function columnaDeLuz(x, z, color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.19, 46, 8, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.position.set(x, 23, z);
  escena.add(m);
  return m;
}
const faros = siniestro.frecuencias.map((f) => {
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(f.fija.quaternion);
  // en la vereda, al costado de la mancha: se ve desde la calle y no la tapa
  return columnaDeLuz(f.pos.x + n.x * 0.7 + n.z * 1.9, f.pos.z + n.z * 0.7 - n.x * 1.9, 0xff2a14);
});
const faroPorton = columnaDeLuz(ciudad.sitios.porton.position.x, ciudad.sitios.porton.position.z + 2, 0xdfe8ff);
siniestro.frecuencias.forEach((f, i) => plano.revelar(i));
hud.marcasDial(FRECUENCIAS);
let tutorialVisto = false;   // una vez por partida

// faroles: sólo los 6 más cercanos tienen luz real (como hacían los juegos de la época)
const luces = Array.from({ length: 6 }, () => { const l = new THREE.PointLight(0xffa64d, 22, 14, 1.2); escena.add(l); return l; });

// lluvia: puntos que caen alrededor de la cámara
const gotas = new THREE.BufferGeometry();
const NG = 900;
const pg = new Float32Array(NG * 3);
for (let i = 0; i < NG; i++) { pg[i * 3] = (Math.random() - 0.5) * 30; pg[i * 3 + 1] = Math.random() * 12; pg[i * 3 + 2] = (Math.random() - 0.5) * 30; }
gotas.setAttribute('position', new THREE.BufferAttribute(pg, 3));
const lluvia = new THREE.Points(gotas, new THREE.PointsMaterial({ color: 0x9aa0a6, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.55 }));
escena.add(lluvia);

// ---- entrada
const entrada = { adelante: 0, lado: 0, giro: 0, correr: false, ratonX: 0, ratonY: 0 };
const teclas = new Set();
addEventListener('keydown', (e) => {
  teclas.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  // el plano: Tab o Q lo abren y lo cierran (Esc también lo cierra); mientras está abierto, el juego se detiene
  if ((e.code === 'Tab' || e.code === 'KeyQ') && !e.repeat && juego.estado === 'jugando') { abrirPlano(!plano.abierto); return; }
  if (e.code === 'Escape' && plano.abierto) { abrirPlano(false); return; }
  if (e.code === 'Enter' && tutorial.activo) { tutorial.terminar(); audio.tecla(); return; }
  if (plano.abierto) return;
  if (e.code === 'KeyF' && juego.estado === 'jugando') {
    // sin batería y sin pilas, no enciende
    if (!jugador.estado.linternaOn && inventario.bateria <= 0 && !inventario.cambiarPilas()) {
      hud.limpiar(); hud.decir('La linterna no enciende.\nBusca pilas en la basura o en los autos (E).', 4);
    } else jugador.estado.linternaOn = !jugador.estado.linternaOn;
    audio.tecla();
  }
  if (e.code === 'KeyE' && juego.estado === 'jugando') accion();
});
addEventListener('keyup', (e) => teclas.delete(e.code));
// silencio: la tecla M apaga el sonido, y se calla solo si la pestaña no está a la vista
let silencio = new URLSearchParams(location.search).has('mudo');   // ?mudo=1 para probar sin sonido
function aplicarSilencio() {
  if (silencio || document.hidden || !document.hasFocus()) audio.ctx.suspend(); else if (juego.estado !== 'portada') audio.ctx.resume();
}
addEventListener('keydown', (e) => { if (e.code === 'KeyM') { silencio = !silencio; aplicarSilencio(); } });
document.addEventListener('visibilitychange', aplicarSilencio);
addEventListener('blur', aplicarSilencio);
addEventListener('focus', aplicarSilencio);
addEventListener('pagehide', () => audio.ctx.close());
addEventListener('mousemove', (e) => {
  // con el ratón capturado (clic en la imagen) o arrastrando con el botón apretado
  if (document.pointerLockElement === canvas || (e.buttons & 1)) { entrada.ratonX += e.movementX; entrada.ratonY += e.movementY; }
});
addEventListener('wheel', (e) => { if (juego.estado === 'jugando' && inventario.lleva.radio && !plano.abierto) juego.dial = Math.max(0, Math.min(108, juego.dial - Math.sign(e.deltaY) * 0.4)); });
function capturarRaton() { try { const r = canvas.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* el navegador no lo permite aquí */ } }
canvas.addEventListener('click', () => { if (juego.estado === 'jugando') capturarRaton(); });

function abrirPlano(v) {
  if (v) document.getElementById('inventario-pausa').innerHTML = inventario.listaPausa();
  plano.abrir(v, jugador.estado, juego.zona);
  plano.mostrarMini(!v);
  audio.tecla();
  entrada.ratonX = 0; entrada.ratonY = 0;   // que la cámara no salte al cerrarlo
  if (!v) tutorial.planoCerrado();
}

function leerTeclas(dt) {
  const k = (c) => teclas.has(c);
  // Las dos componentes indican hacia dónde caminar en la pantalla al pulsar la dirección.
  entrada.adelante = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  entrada.lado = (k('KeyA') || k('ArrowLeft') ? 1 : 0) - (k('KeyD') || k('ArrowRight') ? 1 : 0);
  entrada.giro = (k('KeyL') ? 1 : 0) - (k('KeyJ') ? 1 : 0);   // girar la cámara sin ratón
  entrada.correr = k('ShiftLeft') || k('ShiftRight');
  entrada.centrar = k('KeyR');
  if (!inventario.lleva.radio) return;
  if (k('KeyZ')) juego.dial = Math.max(0, juego.dial - dt * 9);
  if (k('KeyX')) juego.dial = Math.min(108, juego.dial + dt * 9);
  if (!k('KeyZ') && !k('KeyX')) {
    const f = FRECUENCIAS.find((x) => Math.abs(x - juego.dial) < 0.6);
    if (f !== undefined) juego.dial += (f - juego.dial) * Math.min(1, dt * 5);
  }
}

// ---- estado del juego
const juego = {
  estado: 'portada', zona: 'ciudad', vueltas: 0, tiempoAfuera: 0, dial: 87.9, modo317: false, halladas: 0, susto: 0,
  captura: 0, pasos: 0, afuera: false, latidoT: 0, porton: false, final: 0, transicion: 0, destino: null, bipT: 0,
};

const estadoJuego = {
  get tiempoAfuera() { return juego.tiempoAfuera; },
  get modo317() { return juego.modo317; },
  susto(v) { juego.susto = Math.max(juego.susto, v); audio.golpe(v); audio.chirrido(); },
  capturado() {
    if (juego.estado !== 'jugando') return;
    juego.estado = 'captura'; juego.captura = 0;
    plano.marcarCaida(jugador.estado.pos, juego.zona);
    audio.golpe(1.4);
    hud.limpiar();
  },
  hallazgo(texto) {
    juego.halladas++;
    audio.pulsos3();
    hud.limpiar();
    hud.decir(`${texto}\n(${juego.halladas}/3)`, 5);
    if (juego.halladas >= 3) { juego.porton = true; audio.sirena(); hud.decir('Se oyó un portón al norte.\nLa música viene de ahí.', 5); }
  },
  salida() {
    if (juego.estado !== 'jugando') return;
    juego.estado = 'final'; juego.final = 0; audio.golpe(1.0);
  },
};

// ---- orinar: deja una mancha de verdad en el muro, que con el tiempo toma su forma
const manchas = [];
function lienzoMancha() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  for (let k = 0; k < 9; k++) {
    g.fillStyle = `rgba(${70 + Math.random() * 35},${52 + Math.random() * 25},${12},${0.5 + Math.random() * 0.35})`;
    g.beginPath(); g.ellipse(32 + (Math.random() - 0.5) * 18, 86 + (Math.random() - 0.5) * 26, 8 + Math.random() * 14, 10 + Math.random() * 16, 0, 0, Math.PI * 2); g.fill();
  }
  for (let k = 0; k < 7; k++) { g.fillStyle = 'rgba(60,44,10,0.75)'; g.fillRect(20 + Math.random() * 24, 88, 2, 22 + Math.random() * 22); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
}
function muroDelante() {
  const p = jugador.estado.pos, fx = Math.sin(jugador.estado.rumbo), fz = Math.cos(jugador.estado.rumbo);
  const caras = juego.zona === 'ciudad' ? [...ciudad.fachadas, { x: ciudad.sitios.bano.centro.x, z: ciudad.sitios.bano.muroSur - 0.1, nx: 0, nz: -1, largo: ciudad.sitios.bano.W }] : [];
  let mejor = null;
  for (const f of caras) {
    const den = fx * f.nx + fz * f.nz;
    if (den > -0.4) continue;
    const t = ((f.x - p.x) * f.nx + (f.z - p.z) * f.nz) / den;
    if (t < 0 || t > 1.7) continue;
    const hx = p.x + fx * t, hz = p.z + fz * t;
    const lateral = f.nz !== 0 ? hx - f.x : hz - f.z;
    if (Math.abs(lateral) > f.largo / 2) continue;
    if (!mejor || t < mejor.t) mejor = { t, hx, hz, f };
  }
  return mejor;
}
function orinar() {
  const m = muroDelante();
  if (!m) return false;
  const tex = lienzoMancha();
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45 });
  const lamina = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.0), mat);
  lamina.position.set(m.hx + m.f.nx * (0.04 + manchas.length * 0.001), 0.95, m.hz + m.f.nz * (0.04 + manchas.length * 0.001));
  lamina.rotation.y = Math.atan2(m.f.nx, m.f.nz);
  escena.add(lamina);
  manchas.push({ plano: lamina, mat, edad: 0, forma: false });
  if (manchas.length > 12) { const v = manchas.shift(); escena.remove(v.plano); }
  audio.chorro();
  return true;
}

function accion() {
  tutorial.accion();
  if (interaccion.usar()) return;   // lo que está cerca y delante (examinar.js)
  if (juego.zona === 'ciudad' && orinar()) {
    hud.decir(juego.vueltas === 0 ? 'Llevo años meando en este muro.\nEl muro se acuerda de mí.' : 'El muro ya sabe mi nombre.', 3.5);
  } else if (juego.zona === 'fiesta') {
    hud.decir('Nadie tiene cara.\nBailo igual.', 3);
  }
}

registrarCosas({ interaccion, ciudad, siniestro, detalles, fiesta, plano, pistas, audio, juego, estadoJuego, orinar, inventario, puerta });

// ---- qué hacer ahora: el objetivo de arriba y hacia dónde apunta el minimapa
function objetivoActual(pj, enBano) {
  if (!inventario.lleva.radio) return ['Recoge la radio en la repisa del baño (E).', ciudad.sitios.bano.radio.position];
  const fono = juego.zona === 'ciudad' && telefonos.sonando();
  if (fono) return [`¡CONTESTA EL TELÉFONO! (E) Está sonando cerca: quedan ${fono.quedan} segundos.`, fono.pos];
  if (juego.zona === 'fiesta') return ['Cruza la pista hasta la puerta del norte, donde baila tu doble.', { x: ORIGEN.x, z: fiesta.zona.zNorte }];
  if (juego.zona === 'pasillos') return ['Corre por el pasillo hasta la luz del fondo. No te detengas.', { x: ORIGEN.x, z: fiesta.zona.zFin }];
  if (juego.porton) return ['El portón R9 se abrió: ve al norte (la marca roja del minimapa).', ciudad.sitios.porton.position];
  if (enBano && !juego.afuera) return ['Sal del baño: la puerta está a tu espalda.', ciudad.sitios.bano.puerta];
  const x = pistas.masCercana(pj);
  if (!x) return ['Ve al portón R9, al norte.', ciudad.sitios.porton.position];
  if (x.d < 9) return [`Ahí está: la mancha con forma de hombre en el muro. Pulsa E para escucharla. (${juego.halladas}/3)`, x.f.pos];
  return [`Ve a la columna de luz roja (la flecha roja del minimapa te lleva): ahí hay una mancha. (${juego.halladas}/3)`, x.f.pos];
}
// la emisora de números: hacia dónde queda la mancha más cercana, desde donde estás
function numeros() {
  if (juego.zona !== 'ciudad') return ['Norte. Norte.', 'No vuelvas.'];
  const x = pistas.masCercana(jugador.estado.pos);
  if (!x) return ['Norte. El portón.', 'Repito: norte.'];
  const d = pistas.desde(jugador.estado.pos, x.f.pos);
  const R = d.rumbo[0].toUpperCase() + d.rumbo.slice(1);
  return [`${R}. ${R}. ${d.cuadras[0].toUpperCase() + d.cuadras.slice(1)}.`, `La mancha más cercana: ${d.rumbo}, ${d.cuadras}.`];
}

// ---- zonas
function ponerZona(zona) {
  juego.zona = zona;
  const enCiudad = zona === 'ciudad';
  lluvia.visible = enCiudad;
  luzDeCalle.visible = enCiudad;
  luces.forEach((l) => { l.intensity = enCiudad ? l.intensity : 0; });
  hemi.intensity = enCiudad ? 1.4 : 0.35;
  ambiente.intensity = enCiudad ? 0.8 : 0.35;
  jugador.estado.techo = enCiudad ? Infinity : 5.6;
  audio.lechoCiudad(enCiudad ? 1 : 0.2);
}

function entrarFiesta() {
  ponerZona('fiesta');
  fiesta.reiniciar();
  jugador.estado.pos.copy(fiesta.zona.entrada);
  jugador.estado.rumbo = Math.PI; jugador.estado.yawCam = Math.PI; jugador.estado.pitchCam = 0.15;
  jugador.reiniciarSeguimiento();
  escena.fog.color.copy(NIEBLAS.fiesta.color); escena.background.copy(NIEBLAS.fiesta.color); escena.fog.density = NIEBLAS.fiesta.densidad;
  hud.limpiar();
  hud.decir('La fiesta seguía.\nNadie tenía cara.', 4);
}

function despertar() {
  const b = ciudad.sitios.bano;
  ponerZona('ciudad');
  fiesta.reiniciar();
  escena.fog.color.copy(NIEBLAS.ciudad.color); escena.background.copy(NIEBLAS.ciudad.color);
  jugador.estado.pos.copy(b.inicio);
  jugador.estado.rumbo = 0; jugador.estado.yawCam = 0; jugador.estado.pitchCam = 0.12;
  jugador.reiniciarSeguimiento();
  entrada.ratonX = 0; entrada.ratonY = 0;
  jugador.estado.linternaOn = false;
  inventario.nuevaVuelta();   // la linterna amanece llena
  rarezas.reiniciar(juego.vueltas);
  telefonos.reiniciar();
  calles.reiniciar();
  juego.tiempoAfuera = 0; juego.afuera = false; juego.modo317 = false; juego.dial = 87.9; juego.halladas = 0; juego.porton = false;
  ciudad.sitios.porton.position.y = 3;
  for (const f of siniestro.frecuencias) f.hallada = false;
  siniestro.reiniciar(juego.vueltas);
  // el baño se pudre con cada vuelta
  b.luz.color.setHex([0xdfe8ff, 0xffb27a, 0xff6a5a, 0x9cff9c][Math.min(3, juego.vueltas)]);
  hud.limpiar();
  hud.decir(juego.vueltas === 0 ? '03:17. Hay una luz ámbar en la repisa.' : `03:17. Otra vez el mismo baño.\n(${juego.vueltas + 1}ª vez)`, 3.5);
  audio.pulsos3();
  juego.estado = 'jugando';
  if (plano.abierto) abrirPlano(false);
  tutorial.terminar();
}

document.getElementById('empezar').addEventListener('click', () => {
  audio.ctx.resume();
  audio.iniciar();
  aplicarSilencio();
  document.getElementById('portada').hidden = true;
  hud.mostrar(true);
  despertar();
  // El teclado basta para jugar. El ratón sólo se captura si se pulsa la imagen.
});

// ---- bucle
const reloj = new THREE.Clock();
let tiempoJuego = 0;
function cuadro() {
  requestAnimationFrame(cuadro);
  const dt = Math.min(0.05, reloj.getDelta());
  tiempoJuego += dt;
  if (!plano.abierto) actualizarTodo(dt, tiempoJuego);   // con el plano abierto, todo se detiene
  dibujar(escena, camara, tiempoJuego);
}

function colisionesActuales() { return juego.zona === 'ciudad' ? ciudad.colisiones : fiesta.zona.col; }

function actualizarTodo(dt, t) {
  if (juego.estado === 'jugando' || juego.estado === 'portada') {
    if (juego.estado === 'jugando') leerTeclas(dt);
    jugador.actualizar(dt, juego.estado === 'jugando' ? entrada : { adelante: 0, lado: 0, giro: 0.12, correr: false, ratonX: 0, ratonY: 0 },
      colisionesActuales(), camara, t);
  }
  const pj = jugador.estado.pos;
  const b = ciudad.sitios.bano;
  const enBano = juego.zona === 'ciudad' && Math.abs(pj.x - b.centro.x) < b.W / 2 && Math.abs(pj.z - b.centro.z) < b.D / 2;
  if (!enBano && juego.estado === 'jugando' && juego.zona === 'ciudad') { juego.afuera = true; juego.tiempoAfuera += dt; }

  const tieneRadio = inventario.lleva.radio;
  if (tieneRadio && !tutorialVisto && juego.estado === 'jugando') {
    tutorialVisto = true; tutorial.empezar();
  }
  if (tieneRadio && juego.zona === 'ciudad' && juego.estado === 'jugando') {
    const cerca = pistas.masCercana(pj);
    if (cerca && cerca.d < 9 && Math.abs(juego.dial - 31.7) > 0.05) {
      if (!juego.autoSintonia) { juego.autoSintonia = true; hud.limpiar(); hud.decir('La radio se sintoniza sola: 31.7.\nLa mancha te está llamando.', 3.5); }
      juego.dial += (31.7 - juego.dial) * Math.min(1, dt * 2.5);
      if (Math.abs(juego.dial - 31.7) < 0.3) juego.dial = 31.7;
    }
  }
  juego.modo317 = tieneRadio && Math.abs(juego.dial - 31.7) < 0.6;
  let peligro = 0;
  const beat = ((t * 126) / 60) % 1;
  if (juego.zona === 'ciudad') {
    peligro = siniestro.actualizar(dt, t, jugador.estado, camara, estadoJuego).peligro || 0;
    ratas.actualizar(dt, jugador.estado, camara, ciudad.colisiones, jugador.estado.linternaOn, t);
    detalles.actualizar(dt, t, camara);
    puerta.actualizar(dt);
    rarezas.actualizar(dt, t, jugador.estado);
    if (juego.estado === 'jugando') telefonos.actualizar(dt, t, jugador.estado);
    calles.actualizar(dt, t, jugador.estado);
    // faroles: las 6 luces van a los faroles más cercanos; algunos fallan
    const cerca = ciudad.faroles.map((f) => [f, f.pos.distanceToSquared(pj)]).sort((a, c) => a[1] - c[1]).slice(0, 6);
    cerca.forEach(([f], i) => {
      const l = luces[i];
      l.position.copy(f.pos);
      const parpadeo = f.falla ? (Math.sin(t * 13 + f.fase) > 0.2 || Math.random() < 0.05 ? 0.1 : 1) : 1;
      l.intensity = 22 * parpadeo;
      f.cabeza.material.color.setHex(parpadeo > 0.5 ? 0xffb566 : 0x2a1a0a);
    });
    b.luz.intensity = Math.random() < 0.04 ? 0.5 : 5;
    // el techno de la fiesta se oye apagado cerca del portón abierto
    const dP = juego.porton ? pj.distanceTo(ciudad.sitios.porton.position) : 99;
    audio.setFiesta(Math.max(0, 1 - dP / 30) * 0.5, 200);
  } else {
    const f = fiesta.actualizar(dt, t, jugador.estado, camara, estadoJuego, beat);
    peligro = f.peligro;
    if (f.enPasillo && juego.zona !== 'pasillos') { juego.zona = 'pasillos'; hud.limpiar(); hud.decir('Los pasillos respiran.\nCorre.', 3); }
    jugador.estado.techo = f.enPasillo ? 2.85 : 5.6;
    audio.setFiesta(f.enDisco ? 0.55 : 0.28, f.enDisco ? 2600 : 380);
  }
  bichos.actualizar(dt, t, jugador.estado, juego.zona, enBano);
  const latido = 0.22 + Math.pow(Math.max(0, Math.sin(t * 2.4)), 4) * 0.25;
  faros.forEach((m, i) => { m.visible = juego.zona === 'ciudad' && !siniestro.frecuencias[i].hallada; m.material.opacity = latido; });
  faroPorton.visible = juego.zona === 'ciudad' && juego.porton; faroPorton.material.opacity = latido;   // arañas, cucarachas, polillas (sólo en la ciudad)
  // manchas al orinar: a los 10 segundos toman la forma de un hombre
  for (const m of manchas) {
    m.edad += dt;
    if (!m.forma && m.edad > 10) { m.forma = true; m.mat.map = textura('m_hombre'); m.mat.emissiveMap = m.mat.map; m.mat.emissiveIntensity = 0.3; m.mat.needsUpdate = true; }
  }

  const cercaDe317 = Math.max(0, 1 - Math.abs(juego.dial - 31.7) / 6);
  const emisora = emisoras.actualizar(dt, tieneRadio ? juego.dial : -1, { numeros });
  let senal = null;
  if (juego.zona === 'ciudad' && juego.modo317 && juego.halladas < 3) {
    const x = pistas.masCercana(pj);
    if (x) {
      senal = Math.max(0.05, 1 - x.d / 45);
      juego.bipT -= dt;
      if (juego.bipT <= 0) { audio.bip(senal); juego.bipT = 1.3 - senal * 1.12; }
    }
  }
  hud.senalNivel(senal);
  // la linterna se gasta (y parpadea cuando le queda poco)
  const luz = inventario.actualizar(dt, jugador.estado.linternaOn && juego.estado === 'jugando');
  if (jugador.estado.linternaOn) {
    if (inventario.bateria <= 0) jugador.estado.linternaOn = false;
    else jugador.estado.linterna.intensity = 45 * Math.max(0.03, luz);
  }
  const [objTexto, destino] = objetivoActual(pj, enBano);
  hud.objetivo(objTexto);
  if (tieneRadio) audio.radio((emisora ? 0.4 : 1) * (0.016 + peligro * 0.32 + (1 - cercaDe317) * 0.016 + (juego.modo317 ? 0.035 : 0)),
    juego.modo317 ? 0.4 + 0.6 * (senal ?? 0.4) : cercaDe317 * 0.25, juego.dial);
  else audio.radio(0, 0, juego.dial);
  audio.bano(enBano ? 1 : 0);
  if (peligro > 0.35) {
    juego.latidoT -= dt;
    if (juego.latidoT <= 0) { audio.latido(peligro); juego.latidoT = 1.1 - peligro * 0.75; }
  }
  if (jugador.estado.pasos !== juego.pasos) { juego.pasos = jugador.estado.pasos; audio.paso(jugador.estado.corriendo); }

  // La señal despeja un poco la niebla y conserva el color del hormigón.
  const nz = NIEBLAS[juego.zona];
  const objetivoNiebla = juego.modo317 ? nz.densidad * 0.84 : nz.densidad + (juego.zona === 'ciudad' ? Math.min(0.02, juego.vueltas * 0.006) : 0);
  escena.fog.density += (objetivoNiebla - escena.fog.density) * Math.min(1, dt * 2);
  escena.fog.color.lerp(nz.color, Math.min(1, dt * 3)); escena.background.copy(escena.fog.color);

  post.uCroma.value = juego.susto * 1.6;
  post.uRasgado.value = juego.susto * 0.035;
  post.uDestello.value = juego.susto > 0.85 ? 0.6 : 0;

  juego.susto = Math.max(0, juego.susto - dt * 1.6);

  // lluvia sigue a la cámara
  if (lluvia.visible) {
    const pos = gotas.attributes.position;
    const caida = juego.modo317 ? -8 : 14;   // en 31.7 la lluvia sube
    for (let i = 0; i < NG; i++) { let y = pos.getY(i) - dt * caida; if (y < 0) y += 12; if (y > 12) y -= 12; pos.setY(i, y); }
    pos.needsUpdate = true;
    lluvia.position.set(camara.position.x, 0, camara.position.z);
  }

  // el portón: con las tres manchas se abre y lleva a la fiesta
  const velo = document.getElementById('velo');
  if (juego.porton && juego.estado === 'jugando' && juego.zona === 'ciudad') {
    const p = ciudad.sitios.porton;
    p.position.y = Math.min(9, p.position.y + dt * 0.8);
    if (Math.abs(pj.x - p.position.x) < 2.5 && pj.z < p.position.z + 3) { juego.estado = 'transicion'; juego.transicion = 0; audio.golpe(1.0); }
  }
  if (juego.estado === 'transicion') {
    juego.transicion += dt;
    velo.style.opacity = '1';
    if (juego.transicion > 1.2) { entrarFiesta(); velo.style.opacity = '0'; juego.estado = 'jugando'; }
  }

  // captura (la sombra o la garganta) → rojo → negro → el baño
  if (juego.estado === 'captura') {
    juego.captura += dt;
    jugador.posar('cae', 0, t, Math.min(1, juego.captura / 1.1), dt, camara);
    post.uRojo.value = Math.min(1, juego.captura * 1.3);   // sin tapar la caída
    velo.style.opacity = juego.captura > 0.8 ? '1' : '0';
    if (juego.captura > 3) { juego.vueltas++; post.uRojo.value = 0; velo.style.opacity = '0'; despertar(); }
  } else if (juego.estado === 'final') {
    // la puerta del final de los pasillos: luz blanca, la frase, y otra vez el baño
    juego.final += dt;
    post.uDestello.value = Math.min(1, juego.final / 2);
    if (juego.final > 2 && juego.final - dt <= 2) { hud.limpiar(); hud.decir(inventario.lleva.foto ? 'Miro la foto otra vez.\nYa sé quién era. Igual vuelvo.' : 'Si todo vuelve a empezar,\n¿para qué terminar algo?', 4); }
    if (juego.final > 7) { juego.vueltas++; post.uDestello.value = 0; despertar(); }
  } else {
    post.uRojo.value = 0;
  }

  audio.setOyente(camara);
  hud.actualizar(dt, t, juego.dial, juego.modo317, juego.halladas, tieneRadio);
  plano.actualizar(jugador.estado, juego.zona, juego.porton, destino);
  interaccion.actualizar(jugador.estado, juego.zona, juego.estado === 'jugando');
  tutorial.actualizar(dt, { pos: jugador.estado.pos, yaw: jugador.estado.yawCam, linterna: jugador.estado.linternaOn,
    dial: juego.dial, afuera: juego.afuera });
}

// la portada muestra el baño con la cámara girando despacio
jugador.estado.pos.copy(ciudad.sitios.bano.inicio);
jugador.estado.yawCam = 0.4;
cuadro();

// para pruebas: window.__juego
window.__juego = { juego, jugador, ciudad, siniestro, ratas, fiesta, hud, camara, THREE, escena, despertar, entrarFiesta, post, manchas, orinar,
  plano, tutorial, abrirPlano, pistas, interaccion, emisoras, inventario, puerta, detalles, rarezas, telefonos, calles, bichos,
  // adelanta la simulación (para probar aunque el navegador vaya lento) y dibuja una vez
  avanzar(seg, pasoDt = 1 / 30) { for (let k = 0; k < seg / pasoDt; k++) { tiempoJuego += pasoDt; actualizarTodo(pasoDt, tiempoJuego); } dibujar(escena, camara, tiempoJuego); } };
