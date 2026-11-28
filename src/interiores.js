// Lugares donde se entra (cada uno es una zona aparte, como el metro: se entra y se sale con un fundido):
//   · tu departamento (puerta junto a la plaza sur): fotos con tu cara raspada, dibujos de niño, la mesa puesta para
//     tres con la comida podrida, una tele con estática; si curioseas, alguien golpea la puerta con voz de niño.
//   · la radio 31.7 (con antena y luz roja en el techo, se ve de lejos): el estudio vacío con «AL AIRE» encendido, cintas
//     que giran, alguien sentado de espaldas en la cabina; el micrófono te devuelve la voz y otra voz contesta.
//   · el cine Rex (marquesina con ampolletas): en la pantalla, tu vida filmada desde atrás; el público, de espaldas,
//     se da vuelta entero cuando llegas adelante.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { material, textura, ps1Material, videoTextura } from './ps1.js';
import { loMira } from './siniestro.js';

export const INTERIORES = {
  depto: { o: new THREE.Vector3(0, 0, 300), techo: 2.9, niebla: { color: 0x15110a, densidad: 0.04 } },
  radio: { o: new THREE.Vector3(-300, 0, 0), techo: 3.4, niebla: { color: 0x070a12, densidad: 0.045 } },
  cine: { o: new THREE.Vector3(300, 0, 300), techo: 6.5, niebla: { color: 0x060303, densidad: 0.03 } },
};

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); dibujar(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return Object.assign(t, { lienzo: c, g });
}
const cartel = (lineas, w, h, fondo, tinta, tam) => lienzo(w, h, (g) => {
  g.fillStyle = fondo; g.fillRect(0, 0, w, h); g.fillStyle = tinta; g.textAlign = 'center';
  g.font = `bold ${tam}px "Courier New", monospace`;
  lineas.forEach((l, i) => g.fillText(l, w / 2, (h / lineas.length) * (i + 0.5) + tam / 3));
});

export function crearInteriores(escena, ciudad) {
  const grupo = new THREE.Group(); escena.add(grupo);
  const col = { depto: [], radio: [], cine: [] };
  const cosas = [];      // [{zona, pos, radio, etiqueta, accion, prioridad, activo}]
  const ctx = {};        // audio, siniestro, plano, pistas, hud, estadoJuego (llegan con registrar)
  const estado = { depto: { curioseo: 0, golpes: false }, radio: { hablo: 0 }, cine: { vueltos: false } };

  function caja(w, h, d, mat, x, y, z, padre = grupo) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); padre.add(m); return m; }
  function plano(w, h, mat, x, y, z, rotY = 0, padre = grupo) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY; padre.add(m); return m; }
  // una pieza: cuatro muros (el sur con la puerta), piso y techo; choques en la zona
  function pieza(zona, o, w, d, h, muro, piso, techo) {
    const c = col[zona], E = 0.25;
    const muros = [[o.x, o.z - d / 2, w + E, E], [o.x - w / 2, o.z, E, d], [o.x + w / 2, o.z, E, d],
      [o.x - w / 4 - 0.45, o.z + d / 2, w / 2 - 0.9, E], [o.x + w / 4 + 0.45, o.z + d / 2, w / 2 - 0.9, E]];
    for (const [x, z, mw, md] of muros) { caja(mw, h, md, muro, x, h / 2, z); c.push({ x0: x - mw / 2, x1: x + mw / 2, z0: z - md / 2, z1: z + md / 2 }); }
    caja(1.8, 0.6, E, muro, o.x, h - 0.3, o.z + d / 2);
    c.push({ x0: o.x - 0.9, x1: o.x + 0.9, z0: o.z + d / 2 + 0.2, z1: o.z + d / 2 + 0.5 });   // la puerta, cerrada por fuera
    const p = plano(w, d, piso, o.x, 0.15, o.z); p.rotation.x = -Math.PI / 2;
    const t = plano(w, d, techo, o.x, h, o.z); t.rotation.x = Math.PI / 2;
    return { sur: o.z + d / 2, norte: o.z - d / 2, oeste: o.x - w / 2, este: o.x + w / 2 };
  }
  const bloquear = (zona, x0, x1, z0, z1) => col[zona].push({ x0, x1, z0, z1 });
  const agregar = (c) => cosas.push(c);

  // ======================= tu departamento
  {
    const o = INTERIORES.depto.o;
    const papel = material('t_concreto', [3, 1], { color: 0x8a7a5a });
    const L = pieza('depto', o, 10, 8, 2.8, papel, material('t_oxido', [4, 3], { color: 0x5a4632 }), new THREE.MeshBasicMaterial({ color: 0x15110c }));
    const madera = material('t_oxido', [1, 1], { color: 0x5a3e2a });
    // sofá y tele con estática
    caja(2.4, 0.5, 0.9, material('t_terciopelo', [1, 1], { color: 0x4a3a2a }), o.x - 2.6, 0.45, o.z + 2.2);
    caja(2.4, 0.7, 0.25, material('t_terciopelo', [1, 1], { color: 0x4a3a2a }), o.x - 2.6, 0.85, o.z + 2.6);
    bloquear('depto', o.x - 3.8, o.x - 1.4, o.z + 1.7, o.z + 2.8);
    caja(1.0, 0.7, 0.6, madera, o.x - 2.6, 0.5, o.z - 0.4);
    caja(0.9, 0.7, 0.6, material('t_oxido', [1, 1], { color: 0x2a2a2a }), o.x - 2.6, 1.2, o.z - 0.4);
    const estatica = lienzo(64, 48, () => {});
    const pantalla = plano(0.72, 0.52, new THREE.MeshBasicMaterial({ map: estatica, fog: false }), o.x - 2.6, 1.22, o.z - 0.09);
    bloquear('depto', o.x - 3.1, o.x - 2.1, o.z - 0.7, o.z - 0.1);
    // fotos familiares: tres personas; la cara del padre, raspada
    const foto = (raspada) => lienzo(64, 80, (g) => {
      g.fillStyle = '#c8b890'; g.fillRect(0, 0, 64, 80); g.fillStyle = '#6a5a40'; g.fillRect(4, 4, 56, 60);
      const gente = [[18, 30, 9], [36, 28, 9], [50, 40, 6]];
      for (const [x, y, r] of gente) { g.fillStyle = '#d8c0a0'; g.beginPath(); g.arc(x, y, r * 0.6, 0, 7); g.fill(); g.fillStyle = '#3a3020'; g.fillRect(x - r * 0.7, y + r * 0.6, r * 1.4, 64 - y - r * 0.6); }
      if (raspada) { g.strokeStyle = '#7a1510'; g.lineWidth = 2; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(10 + Math.random() * 16, 20 + Math.random() * 16); g.lineTo(10 + Math.random() * 16, 20 + Math.random() * 16); g.stroke(); } }
    });
    [[o.x - 1.4, 1.7], [o.x - 0.5, 1.9], [o.x + 0.4, 1.6]].forEach(([x, y], i) => plano(0.5, 0.62, new THREE.MeshLambertMaterial({ map: foto(i !== 1) }), x, y, L.norte + 0.14));
    // la mesa puesta para tres, con la comida podrida
    caja(1.8, 0.06, 1.1, madera, o.x + 2.4, 0.85, o.z - 1.6);
    for (const [dx, dz] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) caja(0.06, 0.8, 0.06, madera, o.x + 2.4 + dx, 0.45, o.z - 1.6 + dz);
    bloquear('depto', o.x + 1.45, o.x + 3.35, o.z - 2.2, o.z - 1.0);
    [[-0.5, -0.25], [0.5, -0.25], [0, 0.3]].forEach(([dx, dz]) => {
      const plato = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.03, 10), new THREE.MeshLambertMaterial({ color: 0xd8d4c8 }));
      plato.position.set(o.x + 2.4 + dx, 0.9, o.z - 1.6 + dz); grupo.add(plato);
      const comida = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 3), new THREE.MeshLambertMaterial({ color: 0x3a4a1a }));
      comida.scale.y = 0.5; comida.position.set(plato.position.x, 0.93, plato.position.z); grupo.add(comida);
    });
    const radioMesa = caja(0.3, 0.18, 0.12, material('t_oxido', [1, 1], { color: 0x3a2a22 }), o.x + 3.1, 0.97, o.z - 1.25);
    // el rincón del niño: cama chica, peluche y dibujos con crayón
    caja(0.9, 0.35, 1.7, material('t_terciopelo', [1, 1], { color: 0x6a5a7a }), o.x + 3.9, 0.35, o.z + 2.4);
    bloquear('depto', o.x + 3.4, o.x + 4.4, o.z + 1.5, o.z + 3.3);
    const peluche = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
    peluche.position.set(o.x + 3.9, 0.66, o.z + 1.8); grupo.add(peluche);
    const dibujo = (k) => lienzo(64, 48, (g) => {
      g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, 64, 48); g.lineWidth = 2;
      if (k === 0) { g.strokeStyle = '#3a5a20'; g.strokeRect(24, 14, 14, 24); g.beginPath(); g.arc(31, 9, 5, 0, 7); g.stroke(); g.fillStyle = '#c03020'; g.font = '8px sans-serif'; g.fillText('PAPÁ', 22, 46); }
      if (k === 1) { g.fillStyle = '#101010'; g.beginPath(); g.ellipse(32, 26, 14, 20, 0, 0, 7); g.fill(); g.fillStyle = '#c03020'; g.font = '7px sans-serif'; g.fillText('NO MIRES', 14, 46); }
      if (k === 2) { g.strokeStyle = '#2050a0'; g.beginPath(); g.moveTo(8, 40); g.lineTo(56, 40); g.stroke(); g.fillStyle = '#c03020'; g.font = 'bold 12px sans-serif'; g.fillText('3:17', 18, 28); }
    });
    for (let k = 0; k < 3; k++) plano(0.6, 0.45, new THREE.MeshLambertMaterial({ map: dibujo(k) }), L.este - 0.14, 1.4 + (k % 2) * 0.3, o.z + 1.3 + k * 0.8, -Math.PI / 2);
    // calendario con todo tachado menos hoy
    plano(0.5, 0.6, new THREE.MeshLambertMaterial({ map: lienzo(48, 60, (g) => {
      g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, 48, 60); g.strokeStyle = '#7a1510';
      for (let k = 0; k < 30; k++) { const x = 3 + (k % 6) * 7, y = 14 + Math.floor(k / 6) * 9; if (k !== 22) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 7); g.moveTo(x + 6, y); g.lineTo(x, y + 7); g.stroke(); } }
      g.fillStyle = '#1a1612'; g.font = 'bold 8px monospace'; g.fillText('NOVIEMBRE', 4, 9);
    }) }), L.oeste + 0.14, 1.6, o.z - 1.5, Math.PI / 2);
    const bombilla = caja(0.1, 0.14, 0.1, new THREE.MeshBasicMaterial({ color: 0xffd890, fog: false }), o.x, 2.5, o.z);
    const luz = new THREE.PointLight(0xffc880, 6, 12, 1.3); luz.position.set(o.x, 2.4, o.z); grupo.add(luz);
    estado.depto.luz = luz; estado.depto.bombilla = bombilla; estado.depto.estatica = estatica; estado.depto.pantalla = pantalla;
    const curiosear = (texto) => () => { estado.depto.curioseo++; return texto; };
    agregar({ zona: 'depto', pos: { x: o.x - 0.5, z: L.norte + 1.2 }, radio: 2.2, etiqueta: 'mirar las fotos', accion: curiosear('Tu familia. En dos de las tres fotos\ntu cara está raspada con algo rojo.\nEn la tercera no estás.') });
    agregar({ zona: 'depto', pos: { x: o.x + 2.4, z: o.z - 0.6 }, radio: 2.0, etiqueta: 'mirar la mesa', accion: curiosear('La mesa está puesta para tres.\nLa comida lleva años ahí. Tu plato está limpio.') });
    agregar({ zona: 'depto', pos: { x: L.este - 1.2, z: o.z + 2.1 }, radio: 2.0, etiqueta: 'mirar los dibujos', accion: curiosear('Dibujos con crayón: un hombre de abrigo verde,\nuna mancha negra que dice «no mires» y un reloj: 3:17.') });
    agregar({ zona: 'depto', pos: { x: L.oeste + 1.2, z: o.z - 1.5 }, radio: 1.8, etiqueta: 'mirar el calendario', accion: curiosear('Noviembre. Todos los días tachados,\nmenos uno. Hoy.') });
    agregar({ zona: 'depto', pos: { x: o.x - 2.6, z: o.z + 0.5 }, radio: 1.8, etiqueta: 'mirar la tele', accion: curiosear('Estática. Entre la estática,\nun segundo, una cara de niño que te mira.') });
    agregar({ zona: 'depto', pos: { x: radioMesa.position.x - 0.4, z: radioMesa.position.z + 0.6 }, radio: 1.6, etiqueta: 'escuchar la radio de la mesa', accion: curiosear('Está en 31.7. Una voz de mujer:\n«Vuelve antes de las tres. Ya va a ser la hora».') });
  }

  // ======================= la radio 31.7
  {
    const o = INTERIORES.radio.o;
    const acustico = lienzo(64, 64, (g) => { g.fillStyle = '#2a2622'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1a1714'; for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 * 4; x < 64; x += 8) g.fillRect(x, y, 4, 4); });
    acustico.wrapS = acustico.wrapT = THREE.RepeatWrapping; acustico.repeat.set(6, 2);
    const L = pieza('radio', o, 10, 9, 3.2, new THREE.MeshLambertMaterial({ map: acustico }), material('t_azulejo', [5, 4], { color: 0x3a3a40 }), new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
    // la consola, el micrófono y el letrero «AL AIRE»
    const consola = caja(3.2, 0.9, 1.0, material('t_oxido', [2, 1], { color: 0x3a3a3a }), o.x, 0.6, o.z - 1.0);
    bloquear('radio', o.x - 1.6, o.x + 1.6, o.z - 1.5, o.z - 0.5);
    const perillas = [];
    for (let k = 0; k < 16; k++) { const p = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6); p.translate(o.x - 1.3 + (k % 8) * 0.37, 1.08, o.z - 1.25 + Math.floor(k / 8) * 0.25); perillas.push(p); }
    grupo.add(new THREE.Mesh(mergeGeometries(perillas), new THREE.MeshBasicMaterial({ color: 0xc8b080 })));
    caja(0.03, 0.5, 0.03, material('t_oxido', [1, 1]), o.x + 0.3, 1.3, o.z - 0.5);
    caja(0.09, 0.14, 0.09, new THREE.MeshLambertMaterial({ color: 0x1a1a1a }), o.x + 0.3, 1.6, o.z - 0.42);
    const alAire = plano(1.4, 0.4, new THREE.MeshBasicMaterial({ map: cartel(['AL AIRE'], 128, 36, '#2a0402', '#ff3020', 24), fog: false }), o.x, 2.6, L.norte + 0.14);
    plano(2.2, 1.2, new THREE.MeshLambertMaterial({ map: cartel(['RADIO 31.7', 'LA FRECUENCIA', 'MUERTA'], 160, 90, '#c9bfa0', '#7a1510', 18) }), L.oeste + 0.14, 1.8, o.z + 1.5, Math.PI / 2);
    // cintas que giran
    const carretes = [];
    for (let k = 0; k < 2; k++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), new THREE.MeshLambertMaterial({ color: 0x8a8070 }));
      c.rotation.x = Math.PI / 2; c.position.set(o.x - 2.6 + k * 0.6, 1.55, L.norte + 0.35); grupo.add(c); carretes.push(c);
    }
    caja(1.2, 0.9, 0.4, material('t_oxido', [1, 1], { color: 0x2a2a2a }), o.x - 2.3, 1.05, L.norte + 0.3);
    // estanterías con cintas
    for (const z of [o.z + 0.2, o.z + 2.2]) {
      caja(0.4, 2.0, 1.6, material('t_oxido', [1, 1], { color: 0x4a3a2a }), L.este - 0.35, 1.15, z);
      bloquear('radio', L.este - 0.55, L.este, z - 0.8, z + 0.8);
    }
    // la cabina, tras un vidrio: alguien sentado de espaldas
    const vidrio = plano(3.0, 1.4, new THREE.MeshBasicMaterial({ color: 0x6a8a9a, transparent: true, opacity: 0.25, depthWrite: false }), o.x + 2.6, 1.6, L.norte + 1.6);
    caja(3.0, 0.9, 0.15, material('t_oxido', [1, 1], { color: 0x2a2a2a }), o.x + 2.6, 0.6, L.norte + 1.6);
    bloquear('radio', o.x + 1.1, o.x + 4.1, L.norte + 1.5, L.norte + 1.7);
    const texE = textura('s_vieja_espalda'), texF = textura('s_vieja_frente');
    const geoP = new THREE.PlaneGeometry(0.85, 1.4); geoP.translate(0, 0.7, 0);
    const locutor = new THREE.Mesh(geoP, ps1Material(new THREE.MeshLambertMaterial({ map: texE, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: texE, emissiveIntensity: 0.2 })));
    locutor.position.set(o.x + 2.6, 0.5, L.norte + 0.8); grupo.add(locutor);
    const luz = new THREE.PointLight(0xff3020, 3, 10, 1.3); luz.position.set(o.x, 2.4, L.norte + 0.8); grupo.add(luz);
    const luz2 = new THREE.PointLight(0x8aa0c0, 2.5, 9, 1.3); luz2.position.set(o.x, 2.6, o.z + 2); grupo.add(luz2);
    Object.assign(estado.radio, { alAire, carretes, locutor, texE, texF, vuelto: 0 });
    agregar({ zona: 'radio', pos: { x: o.x + 0.3, z: o.z + 0.2 }, radio: 1.8, prioridad: 1, etiqueta: 'hablar por el micrófono', accion: () => {
      estado.radio.hablo++;
      if (ctx.audio) ctx.audio.susurro(1.6);
      const x = ctx.pistas && ctx.pistas.siguiente(ctx.plano.revelada);
      if (x && ctx.plano) ctx.plano.revelar(x.i);
      return `Dices tu nombre. La radio lo repite, un segundo tarde.\nLuego otra voz, que también es la tuya:\n${x ? `«La mancha ${x.i + 1} está ${ctx.pistas.describir(x.f.pos)}». (En el plano)` : '«Ya despertaste todo. Anda al portón».'}`;
    } });
    agregar({ zona: 'radio', pos: { x: L.este - 1.2, z: o.z + 1.2 }, radio: 2.0, etiqueta: 'mirar las cintas', accion: () => 'Cientos de cintas, todas con la misma etiqueta:\n«03:17». Algunas con tu letra.' });
    agregar({ zona: 'radio', pos: { x: o.x + 2.6, z: L.norte + 2.4 }, radio: 1.8, etiqueta: 'golpear el vidrio', accion: () => {
      estado.radio.vuelto = 4; if (ctx.estadoJuego) ctx.estadoJuego.susto(0.8);
      return 'El de la cabina se da vuelta.\nNo tiene cara. Tiene audífonos y tu abrigo.';
    } });
  }

  // ======================= el cine Rex
  {
    const o = INTERIORES.cine.o;
    const terciopelo = material('t_terciopelo', [6, 2], { color: 0x5a1010 });
    const L = pieza('cine', o, 14, 20, 6.2, terciopelo, material('t_terciopelo', [6, 8], { color: 0x2a0808 }), new THREE.MeshBasicMaterial({ color: 0x080404 }));
    // la pantalla con la película (tu vida, filmada desde atrás)
    const pelicula = videoTextura('v_relojes');
    const pantalla = plano(10, 4.6, new THREE.MeshBasicMaterial({ map: pelicula.textura, fog: false, color: 0xc8c4b8 }), o.x, 3.4, L.norte + 0.2);
    caja(10.6, 5.2, 0.1, new THREE.MeshBasicMaterial({ color: 0x050505 }), o.x, 3.4, L.norte + 0.12);
    // butacas en filas, con pasillo al medio
    const butacas = [];
    for (let f = 0; f < 7; f++) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const x = o.x + s * (1.3 + k * 1.0), z = L.norte + 5 + f * 1.6;
      const a = new THREE.BoxGeometry(0.8, 0.45, 0.6); a.translate(x, 0.55, z); butacas.push(a);
      const b = new THREE.BoxGeometry(0.8, 0.8, 0.12); b.translate(x, 0.95, z + 0.3); butacas.push(b);
    }
    grupo.add(new THREE.Mesh(mergeGeometries(butacas), material('t_terciopelo', [1, 1], { color: 0x7a1818 })));
    for (const s of [-1, 1]) bloquear('cine', s < 0 ? o.x - 5.3 : o.x + 0.8, s < 0 ? o.x - 0.8 : o.x + 5.3, L.norte + 4.6, L.norte + 4.6 + 7 * 1.6);
    // el público: de espaldas, mirando la película; cuando llegas adelante, se dan vuelta todos
    const texE = textura('s_vieja_espalda'), texF = textura('s_vieja_frente');
    const publico = [];
    [[0, -1, 1], [1, 1, 0], [2, -1, 2], [3, 1, 2], [4, -1, 0], [5, 1, 3], [6, -1, 3], [2, 1, 1]].forEach(([f, s, k]) => {
      const geo = new THREE.PlaneGeometry(0.75, 1.2); geo.translate(0, 0.6, 0);
      const mat = ps1Material(new THREE.MeshLambertMaterial({ map: texE, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: texE, emissiveIntensity: 0.25 }));
      const m = new THREE.Mesh(geo, mat); m.position.set(o.x + s * (1.3 + k * 1.0), 0.5, L.norte + 5.1 + f * 1.6);
      grupo.add(m); publico.push({ m, mat });
    });
    // el haz del proyector y la luz que rebota de la pantalla
    const haz = new THREE.Mesh(new THREE.ConeGeometry(3.4, 19, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0x8a96a8, transparent: true, opacity: 0.022, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    haz.rotation.x = -Math.PI / 2; haz.rotation.y = Math.PI / 4; haz.position.set(o.x, 4.2, (L.norte + L.sur) / 2 - 0.3); grupo.add(haz);
    const luzPantalla = new THREE.PointLight(0xc8d0e0, 6, 18, 1.2); luzPantalla.position.set(o.x, 3.2, L.norte + 2.5); grupo.add(luzPantalla);
    Object.assign(estado.cine, { pelicula, publico, texE, texF, luzPantalla, norte: L.norte });
    agregar({ zona: 'cine', pos: { x: o.x, z: L.norte + 3.2 }, radio: 2.6, etiqueta: 'mirar la película', accion: () => 'Es tu vida, filmada desde atrás, en blanco y negro.\nTermina a las 03:17. Y empieza otra vez.' });
    agregar({ zona: 'cine', pos: { x: o.x, z: L.norte + 9 }, radio: 1.6, etiqueta: 'sentarte', accion: () => 'Te sientas. El de al lado te pasa una radio\nsin mirarte. Está tibia. Está en 31.7.' });
  }

  // ======================= las puertas en la ciudad
  const PUERTAS = {
    // [x, z, nx, nz, letrero, color del letrero]
    depto: [-15.6, 46, 1, 0, ['DEPTO 317'], '#c9bfa0'],
    radio: [15.6, -20, -1, 0, ['RADIO 31.7'], '#2a0402'],
    cine: [22, 28.4, 0, 1, ['CINE REX', 'HOY: 03:17'], '#1a1008'],
  };
  const llegadas = { ciudad: {} };
  const fachadaPuerta = {};
  for (const [zona, [x, z, nx, nz, texto, fondo]] of Object.entries(PUERTAS)) {
    const rot = Math.atan2(nx, nz);
    const g = new THREE.Group(); g.position.set(x + nx * 0.06, 0, z + nz * 0.06); g.rotation.y = rot; ciudad.grupo.add(g);
    plano(1.4, 2.4, material('t_puerta', [1, 1], { color: 0xb0a898 }), 0, 1.35, 0, 0, g);
    plano(1.7, 2.7, new THREE.MeshBasicMaterial({ color: 0x1a1612 }), 0, 1.35, -0.01, 0, g);
    const ancho = zona === 'cine' ? 4.2 : 2.0, alto = zona === 'cine' ? 1.1 : 0.5;
    const letrero = plano(ancho, alto, new THREE.MeshBasicMaterial({ map: cartel(texto, zona === 'cine' ? 256 : 160, zona === 'cine' ? 68 : 40, fondo, zona === 'radio' ? '#ff3020' : '#e8dcc0', zona === 'cine' ? 26 : 22), fog: false }), 0, zona === 'cine' ? 3.4 : 2.95, 0.02, 0, g);
    fachadaPuerta[zona] = { g, letrero };
    const frente = { x: x + nx * 1.3, z: z + nz * 1.3 };
    llegadas.ciudad[zona] = { x: frente.x, z: frente.z, rumbo: rot };
    agregar({ zona: 'ciudad', pos: frente, radio: 2.0, prioridad: 2, etiqueta: zona === 'depto' ? 'entrar al departamento' : zona === 'radio' ? 'entrar a la radio' : 'entrar al cine', accion: () => { ctx.irA(zona, 'entrada'); return null; } });
  }
  // la marquesina del cine: ampolletas que se apagan una a una
  const ampolletas = [];
  {
    const { g } = fachadaPuerta.cine;
    const marq = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.15, 1.4), material('t_oxido', [2, 1], { color: 0x4a3a2a })); marq.position.set(0, 4.15, 0.7); g.add(marq);
    for (let k = 0; k < 14; k++) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xffd080, fog: false }));
      a.position.set(-2.2 + k * 0.34, 4.0, 1.38); g.add(a); ampolletas.push(a);
    }
  }
  // la antena de la radio, en el techo del edificio, con su luz roja (se ve de lejos)
  let luzAntena = null;
  {
    const fx = PUERTAS.radio[0] + 6.4, fz = PUERTAS.radio[1] - 2;
    const f = ciudad.fachadas.find((c) => Math.abs(c.x - PUERTAS.radio[0]) < 0.5 && Math.abs(c.z - (-22)) < 1);
    const base = f ? f.alto : 10.5;
    const palos = [];
    for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const p = new THREE.BoxGeometry(0.08, 14, 0.08); p.translate(dx * (1 - 0), 7, dz); palos.push(p); }
    for (let y = 1; y < 14; y += 1.4) { const t = new THREE.BoxGeometry(1.3, 0.05, 0.05); t.translate(0, y, -0.6); palos.push(t); const u = t.clone(); u.translate(0, 0, 1.2); palos.push(u); }
    const torre = new THREE.Mesh(mergeGeometries(palos), material('t_oxido', [1, 1]));
    torre.position.set(fx, base, fz); ciudad.grupo.add(torre);
    luzAntena = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xff1a10, fog: false }));
    luzAntena.position.set(fx, base + 14.3, fz); ciudad.grupo.add(luzAntena);
  }
  // dónde se aparece adentro (junto a la puerta, mirando hacia el fondo)
  for (const [zona, d] of Object.entries({ depto: 8, radio: 9, cine: 20 })) {
    const o = INTERIORES[zona].o;
    llegadas[zona] = { entrada: { x: o.x, z: o.z + d / 2 - 1.0, rumbo: Math.PI } };
    agregar({ zona, pos: { x: o.x, z: o.z + d / 2 - 0.6 }, radio: 1.6, prioridad: 2, etiqueta: 'salir a la calle', accion: () => { ctx.irA('ciudad', zona); return null; } });
  }

  function tiene(zona) { return zona in INTERIORES; }

  const tmp = new THREE.Vector3();
  function actualizarCiudad(t) {
    ampolletas.forEach((a, k) => { a.visible = Math.sin(t * 2 + k * 0.7) > -0.3 || k % 5 === 0; });
    if (luzAntena) luzAntena.visible = Math.sin(t * 3.2) > 0;
    fachadaPuerta.radio.letrero.material.color.setHex(Math.sin(t * 5) > -0.6 ? 0xffffff : 0x553333);
  }

  // devuelve { peligro }
  function actualizar(zona, dt, t, jugador, camara, audio) {
    const pj = jugador.pos;
    if (zona === 'depto') {
      const e = estado.depto;
      e.bombilla.visible = Math.sin(t * 6.3) > -0.85 || Math.random() < 0.4;
      e.luz.intensity = e.bombilla.visible ? 6 : 0.6;
      // estática en la tele
      if (Math.random() < 0.5) {
        const g = e.estatica.g, img = g.createImageData(64, 48);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0); e.estatica.needsUpdate = true;
      }
      // si curioseas tres cosas, alguien golpea la puerta
      if (e.curioseo >= 3 && !e.golpes) {
        e.golpes = true;
        if (audio) audio.golpes(tmp.set(INTERIORES.depto.o.x, 1, INTERIORES.depto.o.z + 4), 3);
        if (ctx.hud) setTimeout(() => { ctx.hud.limpiar(); ctx.hud.decir('Golpean la puerta.\nUna voz de niño dice tu nombre.\n«Papá, abre. Ya es la hora».', 5); }, 900);
      }
    } else if (zona === 'radio') {
      const e = estado.radio;
      e.alAire.visible = Math.sin(t * 2.2) > -0.4;
      e.carretes.forEach((c, i) => { c.rotation.y += dt * (2 + i * 0.6); });
      if (e.vuelto > 0) e.vuelto -= dt;
      const m = e.locutor.material; const tex = e.vuelto > 0 ? e.texF : e.texE;
      if (m.map !== tex) { m.map = tex; m.emissiveMap = tex; m.needsUpdate = true; }
      if (Math.random() < dt * 0.4 && audio) audio.radioLejana(tmp.set(e.locutor.position.x, 1, e.locutor.position.z), 4);
    } else if (zona === 'cine') {
      const e = estado.cine;
      if (e.pelicula.video.paused) e.pelicula.video.play().catch(() => {});
      e.luzPantalla.intensity = 5 + Math.sin(t * 7) * 1.2 + Math.random();
      // al llegar adelante, se dan vuelta todos
      const adelante = pj.z < e.norte + 6;
      if (adelante && !e.vueltos) { e.vueltos = true; if (ctx.estadoJuego) ctx.estadoJuego.susto(0.7); if (audio) audio.chirrido(); }
      for (const p of e.publico) {
        const tex = e.vueltos ? e.texF : e.texE;
        if (p.mat.map !== tex) { p.mat.map = tex; p.mat.emissiveMap = tex; p.mat.needsUpdate = true; }
        p.m.rotation.y = e.vueltos ? Math.atan2(camara.position.x - p.m.position.x, camara.position.z - p.m.position.z) : 0;
      }
    }
    return { peligro: 0 };
  }

  function objetivo(zona) {
    if (zona === 'depto') return ['Tu departamento. Míralo todo (E) y sal por la puerta cuando quieras.', null];
    if (zona === 'radio') return ['La radio 31.7. Habla por el micrófono (E): te dirá dónde está la mancha que sigue.', { x: INTERIORES.radio.o.x + 0.3, z: INTERIORES.radio.o.z + 0.2 }];
    return ['El cine Rex. Camina hacia la pantalla. Sal por la puerta de atrás.', null];
  }

  function entrar(zona) {
    if (zona === 'cine') { estado.cine.vueltos = false; }
    if (zona === 'depto') { estado.depto.curioseo = 0; estado.depto.golpes = false; }
  }
  function salir() { const v = estado.cine.pelicula.video; if (!v.paused) v.pause(); }

  function registrar(interaccion, contexto) {
    Object.assign(ctx, contexto);
    for (const c of cosas) interaccion.agregar(c);
  }

  return { col, tiene, actualizar, actualizarCiudad, objetivo, entrar, salir, registrar, llegadas, depurar: { estado } };
}
