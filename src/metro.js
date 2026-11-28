// El metro abandonado: un atajo bajo el canal. La boca está en la esquina de la plaza central; la salida, junto a la
// capilla (al norte). Abajo: el andén de la estación 317, un tren detenido lleno de pasajeros sin cara y un túnel con
// nichos de luz roja. Cuando vas por el túnel, el tren arranca detrás de ti: hay que meterse en un nicho (o llegar a la
// escalera del fondo) antes de que pase. Si te alcanza, despiertas en el baño.
// Es una zona aparte (como la fiesta): se entra y se sale con un fundido.
import * as THREE from 'three';
import { material, textura, ps1Material } from './ps1.js';

export const MO = new THREE.Vector3(300, 0, 0);   // origen de la estación
const X_ANDEN0 = MO.x - 16, X_ANDEN1 = MO.x + 15, X_FIN = MO.x + 62;
const Z_VIA0 = MO.z - 6, Z_VIA1 = MO.z - 2, Z_ANDEN1 = MO.z + 2.2;
const NICHOS = [MO.x + 24, MO.x + 35, MO.x + 46, MO.x + 56];

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
const letrero = (lineas, w = 256, h = 64, fondo = '#1a2a4a', tinta = '#e8e4d8') => lienzo(w, h, (g) => {
  g.fillStyle = fondo; g.fillRect(0, 0, w, h); g.fillStyle = tinta; g.textAlign = 'center';
  g.font = `bold ${Math.round(h / (lineas.length + 0.8))}px "Courier New", monospace`;
  lineas.forEach((l, i) => g.fillText(l, w / 2, (h / (lineas.length + 0.3)) * (i + 0.9)));
});

export function crearMetro(escena, ciudad) {
  const grupo = new THREE.Group(); escena.add(grupo);
  const col = [];
  const azulejo = material('t_azulejo', [6, 1.2], { color: 0xa8b0a8 });
  const hormigon = material('t_concreto', [8, 1], { color: 0x6a665e });
  const caja = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); grupo.add(m); return m; };
  const bloquear = (x0, x1, z0, z1) => col.push({ x0, x1, z0, z1 });

  // ---------- la estación
  const largoE = X_ANDEN1 - X_ANDEN0, cxE = (X_ANDEN0 + X_ANDEN1) / 2;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(largoE, Z_ANDEN1 - Z_VIA0), material('t_azulejo', [10, 3], { color: 0x6a6a62 }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(cxE, 0.15, (Z_ANDEN1 + Z_VIA0) / 2); grupo.add(piso);
  caja(largoE, 0.02, 0.25, new THREE.MeshBasicMaterial({ color: 0xc8a020 }), cxE, 0.17, Z_VIA1 + 0.3);   // la línea amarilla
  caja(largoE, 4, 0.3, azulejo, cxE, 2, Z_ANDEN1 + 0.15); bloquear(X_ANDEN0, X_ANDEN1, Z_ANDEN1, Z_ANDEN1 + 0.3);
  caja(largoE, 4, 0.3, azulejo, cxE, 2, Z_VIA0 - 0.15); bloquear(X_ANDEN0, X_ANDEN1, Z_VIA0 - 0.3, Z_VIA0);
  caja(0.3, 4, Z_ANDEN1 - Z_VIA0, azulejo, X_ANDEN0 - 0.15, 2, (Z_ANDEN1 + Z_VIA0) / 2); bloquear(X_ANDEN0 - 0.3, X_ANDEN0, Z_VIA0, Z_ANDEN1);
  caja(0.3, 4, Z_ANDEN1 - Z_VIA1, azulejo, X_ANDEN1 + 0.15, 2, (Z_ANDEN1 + Z_VIA1) / 2); bloquear(X_ANDEN1, X_ANDEN1 + 0.3, Z_VIA1, Z_ANDEN1);
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(largoE + 50, 10), new THREE.MeshBasicMaterial({ color: 0x0c0c0a }));
  techo.rotation.x = Math.PI / 2; techo.position.set(cxE + 24, 4, MO.z - 2); grupo.add(techo);
  // rieles
  for (const z of [Z_VIA0 + 1.3, Z_VIA1 - 1.3]) caja(X_FIN - X_ANDEN0, 0.08, 0.08, material('t_oxido', [1, 1]), (X_FIN + X_ANDEN0) / 2, 0.2, z);
  // letreros de la estación y el reloj
  const texEst = letrero(['ESTACIÓN 317']);
  for (const x of [MO.x - 10, MO.x, MO.x + 10]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: texEst }));
    l.position.set(x, 2.6, Z_ANDEN1 - 0.01); l.rotation.y = Math.PI; grupo.add(l);
  }
  const reloj = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: letrero(['03:17'], 128, 48, '#0a0a0a', '#ff3a20') }));
  reloj.position.set(MO.x + 5, 3.2, Z_ANDEN1 - 0.01); reloj.rotation.y = Math.PI; grupo.add(reloj);
  // tubos fluorescentes (algunos fallan) y tres luces
  const tubos = [];
  for (let x = X_ANDEN0 + 3; x < X_ANDEN1; x += 5) {
    const t = caja(1.4, 0.06, 0.12, new THREE.MeshBasicMaterial({ color: 0xdfe8ff }), x, 3.9, MO.z);
    tubos.push({ t, fase: Math.random() * 10, falla: Math.random() < 0.4 });
  }
  const lucesE = [MO.x - 9, MO.x, MO.x + 9].map((x) => { const l = new THREE.PointLight(0xdfe8ff, 9, 14, 1.2); l.position.set(x, 3.5, MO.z); grupo.add(l); return l; });
  // bancas
  for (const x of [MO.x - 6, MO.x + 2, MO.x + 9]) { caja(2, 0.08, 0.5, material('t_oxido', [1, 1]), x, 0.6, Z_ANDEN1 - 0.5); bloquear(x - 1, x + 1, Z_ANDEN1 - 0.8, Z_ANDEN1); }

  // ---------- el tren (detenido en el andén; arranca cuando vas por el túnel)
  const tren = new THREE.Group();
  const LARGO_T = 17;
  const carro = new THREE.Mesh(new THREE.BoxGeometry(LARGO_T, 2.9, 3.0), material('t_oxido', [4, 1], { color: 0x8a8a80 }));
  carro.position.y = 1.6; tren.add(carro);
  const ventanaMat = new THREE.MeshBasicMaterial({ color: 0x4a4636 });
  const texPasajero = textura('s_vieja_frente');
  for (let k = 0; k < 6; k++) {
    const x = -LARGO_T / 2 + 1.6 + k * 2.75;
    const v = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), ventanaMat); v.position.set(x, 2.0, 1.51); tren.add(v);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.9), new THREE.MeshBasicMaterial({ map: texPasajero, transparent: true, alphaTest: 0.5, color: 0x8a8670 }));
    p.position.set(x + (k % 2 ? 0.3 : -0.3), 1.85, 1.53); tren.add(p);
  }
  const faro = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 2.0), new THREE.MeshBasicMaterial({ color: 0xfff4c0, fog: false }));
  faro.position.set(LARGO_T / 2 + 0.06, 1.4, 0); tren.add(faro);
  const luzTren = new THREE.SpotLight(0xfff0c0, 0, 40, 0.5, 0.4, 1); luzTren.position.set(LARGO_T / 2 + 0.2, 1.6, 0);
  const blancoTren = new THREE.Object3D(); blancoTren.position.set(LARGO_T / 2 + 10, 1, 0); tren.add(luzTren, blancoTren); luzTren.target = blancoTren;
  grupo.add(tren);
  const TREN_X0 = MO.x - 2;
  const trenEstado = { x: TREN_X0, corre: false, paso: false };
  const choqueTren = { x0: 0, x1: 0, z0: Z_VIA0, z1: Z_VIA1 - 0.1 };
  const camaraTren = { x0: -9999, x1: -9999, z0: Z_VIA0, z1: Z_VIA1 - 0.1, soloCamara: true };
  col.push(choqueTren, camaraTren);

  // ---------- el túnel
  const largoT = X_FIN - X_ANDEN1, cxT = (X_FIN + X_ANDEN1) / 2;
  const pisoT = new THREE.Mesh(new THREE.PlaneGeometry(largoT, Z_VIA1 - Z_VIA0 + 1.4), material('t_concreto', [8, 1], { color: 0x3a3832 }));
  pisoT.rotation.x = -Math.PI / 2; pisoT.position.set(cxT, 0.15, (Z_VIA0 + Z_VIA1) / 2 + 0.7); grupo.add(pisoT);
  caja(largoT, 4, 0.3, hormigon, cxT, 2, Z_VIA0 - 0.15); bloquear(X_ANDEN1, X_FIN, Z_VIA0 - 0.3, Z_VIA0);
  // muro sur con nichos (cada nicho, 1,6 m de ancho y 1,3 de hondo, con una luz roja)
  let x0 = X_ANDEN1;
  const nichos = [];
  for (const nx of [...NICHOS, X_FIN + 10]) {
    const a = x0, b = Math.min(nx - 0.8, X_FIN);
    if (b > a) { caja(b - a, 4, 0.3, hormigon, (a + b) / 2, 2, Z_VIA1 + 0.15); bloquear(a, b, Z_VIA1, Z_VIA1 + 0.3); }
    if (nx < X_FIN) {
      caja(1.6, 4, 0.3, hormigon, nx, 2, Z_VIA1 + 1.45); bloquear(nx - 0.8, nx + 0.8, Z_VIA1 + 1.3, Z_VIA1 + 1.6);
      const roja = caja(0.2, 0.2, 0.1, new THREE.MeshBasicMaterial({ color: 0xff2010, fog: false }), nx, 2.6, Z_VIA1 + 1.25);
      nichos.push({ x: nx, roja });
    }
    x0 = nx + 0.8;
  }
  caja(0.3, 4, 8, hormigon, X_FIN + 0.15, 2, MO.z - 3); bloquear(X_FIN, X_FIN + 0.3, Z_VIA0, Z_VIA1 + 2);
  const lucesT = NICHOS.filter((_, i) => i % 2 === 0).map((x) => { const l = new THREE.PointLight(0xff2a10, 3, 9, 1.4); l.position.set(x, 2.6, Z_VIA1 + 0.6); grupo.add(l); return l; });
  // la escalera del fondo, hacia la calle
  for (let k = 0; k < 6; k++) caja(1.8, 0.22, 0.5, hormigon, X_FIN - 1.6, 0.25 + k * 0.32, Z_VIA1 - 0.2 - k * 0.5);
  const salidaLuz = caja(1.8, 2.2, 0.05, new THREE.MeshBasicMaterial({ color: 0x9aa4b0, fog: false }), X_FIN - 1.6, 2.6, Z_VIA0 + 0.2);
  const salida = { x: X_FIN - 1.6, z: Z_VIA1 - 1.2 };

  // ---------- en la ciudad: la boca (plaza central) y la salida (junto a la capilla)
  const bocas = [];
  function bocaDeMetro(x, z, rot, texto) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const muro = material('t_azulejo', [1, 1], { color: 0x8a9488 });
    const m = (w, h, d, px, py, pz, mat = muro) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(px, py, pz); g.add(b); };
    m(0.2, 1.1, 3.0, -1.2, 0.55, 0); m(0.2, 1.1, 3.0, 1.2, 0.55, 0); m(2.6, 1.1, 0.2, 0, 0.55, -1.5);
    m(2.6, 0.12, 3.4, 0, 2.8, 0, material('t_oxido', [1, 1])); for (const px of [-1.2, 1.2]) m(0.08, 2.7, 0.08, px, 1.4, 1.5, material('t_oxido', [1, 1]));
    const hoyo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshBasicMaterial({ color: 0x020202 })); hoyo.rotation.x = -Math.PI / 2; hoyo.position.set(0, 0.17, 0); g.add(hoyo);
    for (let k = 0; k < 3; k++) m(2.2, 0.06, 0.4, 0, 0.17 - k * 0.001, 1.0 - k * 0.45, material('t_concreto', [1, 1], { color: 0x5a5a52 }));
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: letrero(texto, 256, 64), fog: false }));
    cartel.position.set(0, 3.15, 1.71); g.add(cartel);
    const cartelAtras = cartel.clone(); cartelAtras.rotation.y = Math.PI; cartelAtras.position.z = -1.71; g.add(cartelAtras);
    ciudad.grupo.add(g);
    // choques: la boca no se pisa, salvo por delante
    const pts = [[-1.3, -1.6], [1.3, 1.6]].map(([a, b]) => new THREE.Vector3(a, 0, b).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot));
    ciudad.colisiones.push({ x0: x + Math.min(pts[0].x, pts[1].x), x1: x + Math.max(pts[0].x, pts[1].x), z0: z + Math.min(pts[0].z, pts[1].z), z1: z + Math.max(pts[0].z, pts[1].z) });
    const frente = new THREE.Vector3(0, 0, 2.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    const b = { x, z, pos: { x: x + frente.x, z: z + frente.z }, rumbo: rot };
    bocas.push(b);
    return b;
  }
  const pc = ciudad.sitios.plazaCentro, capilla = ciudad.sitios.capilla;
  const bocaSur = bocaDeMetro(pc.x - 5.2, pc.z - 5.2, 0, ['METRO', '317 · AL NORTE']);   // mira al sur, hacia el baño
  const bocaNorte = bocaDeMetro(capilla.x - 6.3, capilla.z + 1, Math.PI, ['METRO', '317']);
  ciudad.sitios.metro = { sur: bocaSur, norte: bocaNorte };

  // ---------- estado y animación
  let horn = 0;
  function reiniciar() {
    trenEstado.x = TREN_X0; trenEstado.corre = false; trenEstado.paso = false; luzTren.intensity = 0;
    tren.position.set(trenEstado.x, 0, (Z_VIA0 + Z_VIA1) / 2);
    choqueTren.x0 = TREN_X0 - LARGO_T / 2; choqueTren.x1 = TREN_X0 + LARGO_T / 2; camaraTren.x0 = camaraTren.x1 = -9999;
  }
  reiniciar();

  function enNicho(p) { return p.z > Z_VIA1 + 0.15 && NICHOS.some((x) => Math.abs(p.x - x) < 0.8); }

  // devuelve { peligro }
  function actualizar(dt, t, jugador, estadoJuego, audio) {
    const pj = jugador.pos;
    for (const tb of tubos) tb.t.visible = !tb.falla || Math.sin(t * 11 + tb.fase) > -0.2 || Math.random() < 0.2;
    lucesE.forEach((l, i) => { l.intensity = tubos[i * 2]?.t.visible ? 9 : 2; });
    for (const n of nichos) n.roja.visible = Math.sin(t * 3 + n.x) > -0.5;
    lucesT.forEach((l) => { l.intensity = 2.5 + Math.sin(t * 3) * 0.8; });
    salidaLuz.material.color.setHex(Math.sin(t * 2) > 0 ? 0x9aa4b0 : 0x7a8490);
    // el tren arranca cuando ya vas por el túnel
    if (!trenEstado.corre && !trenEstado.paso && pj.x > MO.x + 20) {
      trenEstado.corre = true; luzTren.intensity = 60; horn = 0;
      if (audio) { audio.bocina(); audio.rugido(); }
    }
    let peligro = 0;
    if (trenEstado.corre) {
      trenEstado.x += dt * 10.5;
      horn -= dt; if (horn <= 0 && audio) { audio.bocina(); horn = 2.2; }
      const frente = trenEstado.x + LARGO_T / 2, cola = trenEstado.x - LARGO_T / 2;
      // te alcanza si estás en la vía (no en un nicho) cuando pasa
      if (pj.x < frente + 0.4 && pj.x > cola && pj.z < Z_VIA1 + 0.15 && pj.x > X_ANDEN1 - 1) { trenEstado.corre = false; trenEstado.paso = true; estadoJuego.capturado(); }
      peligro = Math.max(0, 1 - (pj.x - frente) / 25);
      if (cola > X_FIN + 2) { trenEstado.corre = false; trenEstado.paso = true; luzTren.intensity = 0; camaraTren.x0 = camaraTren.x1 = -9999; }
      tren.position.x = trenEstado.x;
      choqueTren.x0 = choqueTren.x1 = -9999;   // en marcha, el choque es el atropello
      camaraTren.x0 = trenEstado.x - LARGO_T / 2; camaraTren.x1 = trenEstado.x + LARGO_T / 2;
    }
    return { peligro: enNicho(pj) ? peligro * 0.4 : peligro };
  }

  // qué hacer abajo, para el objetivo de arriba
  function objetivo(pj) {
    if (trenEstado.corre) {
      const n = NICHOS.filter((x) => x > pj.x - 1).sort((a, b) => a - b)[0] ?? salida.x;
      return enNicho(pj) ? ['Quédate en el nicho hasta que pase el tren.', null]
        : ['¡VIENE EL TREN! Métete en un nicho de la pared (luz roja) o corre a la escalera.', { x: n, z: Z_VIA1 + 0.9 }];
    }
    if (pj.x < X_ANDEN1 - 2) return ['Estación 317. Baja a la vía y entra al túnel (al este): lleva al otro lado del canal.', { x: X_ANDEN1 + 2, z: (Z_VIA0 + Z_VIA1) / 2 }];
    return ['Sigue el túnel hasta la escalera del fondo y sube (E).', salida];
  }

  function registrar(interaccion, irA) {
    interaccion.agregar({ zona: 'ciudad', pos: bocaSur.pos, radio: 2.2, prioridad: 2, etiqueta: 'bajar al metro', accion: () => { irA('metro', 'sur'); return null; } });
    interaccion.agregar({ zona: 'ciudad', pos: bocaNorte.pos, radio: 2.2, prioridad: 2, etiqueta: 'bajar al metro', accion: () => { irA('metro', 'norte'); return null; } });
    interaccion.agregar({ zona: 'metro', pos: salida, radio: 2.6, prioridad: 2, etiqueta: 'subir a la calle', accion: () => { irA('ciudad', 'norte'); return null; } });
    interaccion.agregar({ zona: 'metro', pos: { x: X_ANDEN0 + 1.5, z: MO.z }, radio: 2.2, prioridad: 2, etiqueta: 'subir a la plaza', accion: () => { irA('ciudad', 'sur'); return null; } });
    interaccion.agregar({ zona: 'metro', pos: { x: MO.x - 4, z: Z_VIA1 + 0.6 }, radio: 2.4, activo: () => !trenEstado.corre && !trenEstado.paso, etiqueta: 'mirar el tren',
      accion: () => 'Los pasajeros no tienen cara.\nTodos llevan una radio en 31.7 sobre las piernas.\nEl tren tiene el motor encendido.' });
    interaccion.agregar({ zona: 'metro', pos: { x: MO.x + 5, z: Z_ANDEN1 - 1.2 }, radio: 2.2, etiqueta: 'mirar el reloj', accion: () => '03:17. Próximo tren: 03:17.' });
  }

  // dónde aparecer al bajar o al subir
  const llegadas = {
    metro: { sur: { x: X_ANDEN0 + 2.5, z: MO.z, rumbo: Math.PI / 2 }, norte: { x: X_FIN - 2.5, z: Z_VIA1 - 2, rumbo: -Math.PI / 2 } },
    ciudad: { sur: { x: bocaSur.pos.x, z: bocaSur.pos.z + 0.6, rumbo: 0 }, norte: { x: bocaNorte.pos.x, z: bocaNorte.pos.z - 0.6, rumbo: Math.PI } },
  };

  return { col, actualizar, objetivo, registrar, reiniciar, llegadas, depurar: { tren: trenEstado, nichos: NICHOS, salida } };
}
