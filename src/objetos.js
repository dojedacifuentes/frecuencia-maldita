// Los objetos: lo que llevas en los bolsillos del abrigo y la linterna que se gasta.
//   pilas  — en la basura y en algunos autos; cuando la linterna se agota, se cambian solas
//   casete — en el auto de la radio encendida; se pone en los televisores de la vitrina
//   llave  — la escupe la boca del muro; abre la puerta con candado junto a la plaza central
//   foto   — detrás de esa puerta; se le muestra a una vieja (y cambia el final)
// Los objetos se guardan entre vueltas; la linterna amanece llena en cada 03:17.
import * as THREE from 'three';
import { material, ps1Material } from './ps1.js';

export const OBJETOS = {
  radio: { nombre: 'radio portátil', uso: 'sintoniza las emisoras con Z/X o la rueda' },
  pilas: { nombre: 'pilas', uso: 'recargan la linterna: se cambian solas cuando se apaga' },
  casete: { nombre: 'casete', uso: 'ponlo en los televisores de la vitrina' },
  llave: { nombre: 'llave R9-B', uso: 'abre la puerta con candado junto a la plaza central' },
  foto: { nombre: 'foto', uso: 'muéstrasela a una de las viejas que miran la pared' },
};
const DURACION = 150;   // segundos de linterna encendida con pilas nuevas

export function crearInventario(audio, hud) {
  const caja = document.getElementById('inventario');
  const lleva = { pilas: 0, casete: false, llave: false, foto: false, radio: false };
  let bateria = 1, pintado = '';

  function pintar() {
    const n = Math.ceil(bateria * 5);
    const cosas = Object.keys(OBJETOS).filter((k) => lleva[k])
      .map((k) => (k === 'pilas' && lleva.pilas > 1 ? `pilas ×${lleva.pilas}` : OBJETOS[k].nombre));
    const html = `<div class="inv-linterna${bateria < 0.2 ? ' baja' : ''}">LINTERNA ${'▮'.repeat(n)}${'▯'.repeat(5 - n)}</div>`
      + `<div class="inv-lleva">LLEVAS: ${cosas.length ? cosas.join(' · ') : 'nada'}</div>`;
    if (html !== pintado) { pintado = html; caja.innerHTML = html; }
  }

  // recoge un objeto; devuelve la frase que lo cuenta
  function dar(id) {
    if (id === 'pilas') lleva.pilas++; else lleva[id] = true;
    audio.pulsos3();
    pintar();
    const uso = OBJETOS[id].uso;
    return `Encontraste: ${OBJETOS[id].nombre}.\n${uso[0].toUpperCase()}${uso.slice(1)}.`;
  }

  function cambiarPilas() {
    if (lleva.pilas <= 0) return false;
    lleva.pilas--; bateria = 1; audio.tecla(); pintar();
    hud.decir(`Cambiaste las pilas de la linterna.${lleva.pilas ? ` Te quedan ${lleva.pilas}.` : ' Ya no te quedan.'}`, 3);
    return true;
  }

  // gasta la linterna; devuelve cuánto alumbra (0..1), con parpadeo cuando le queda poco
  function actualizar(dt, encendida) {
    if (encendida) {
      bateria = Math.max(0, bateria - dt / DURACION);
      if (bateria <= 0 && !cambiarPilas()) {
        hud.decir('La linterna se apagó.\nBusca pilas en la basura o en los autos (E).', 4);
        pintar();
        return 0;
      }
    }
    pintar();
    if (!encendida) return 0;
    if (bateria < 0.15 && Math.random() < 0.12) return Math.random() * 0.3;
    return bateria < 0.15 ? 0.6 : 1;
  }

  function nuevaVuelta() { bateria = 1; pintar(); }

  // lista para la pausa (junto al plano)
  function listaPausa() {
    const cosas = Object.keys(OBJETOS).filter((k) => lleva[k]);
    return `<div class="ctl-titulo">LO QUE LLEVAS</div>` + (cosas.length
      ? cosas.map((k) => `<div class="ctl"><span class="ctl-teclas"><b>${k === 'pilas' && lleva.pilas > 1 ? `pilas ×${lleva.pilas}` : OBJETOS[k].nombre}</b></span><span class="ctl-que">${OBJETOS[k].uso}</span></div>`).join('')
      : '<div class="ctl"><span class="ctl-teclas"></span><span class="ctl-que">nada todavía: examina la basura, los autos y lo raro con E</span></div>');
  }

  pintar();
  return { lleva, dar, cambiarPilas, actualizar, nuevaVuelta, listaPausa, get bateria() { return bateria; } };
}

// la puerta con candado: en un muro libre frente a la plaza central
const OCUPADAS = new Set([3, 10, 17, 24, 31, 38, 45, 52, 59, 66, 11, 46, 77, 5, 18, 44, 57, 70, 29]);
export function crearPuerta(escena, ciudad) {
  const plaza = ciudad.sitios.plazaCentro;
  let f = null, mejor = Infinity;
  ciudad.fachadas.forEach((c, i) => {
    if (OCUPADAS.has(i) || ciudad.ocupadas?.has(i)) return;
    const dx = plaza.x - c.x, dz = plaza.z - c.z, d = Math.hypot(dx, dz);
    if ((dx * c.nx + dz * c.nz) / d < 0.7) return;   // que mire hacia la plaza
    if (d < mejor) { mejor = d; f = c; }
  });
  ciudad.ocupadas?.add(ciudad.fachadas.indexOf(f));
  const a = 3.2;                                     // corrida del centro del muro
  const tx = f.nz !== 0 ? a : 0, tz = f.nx !== 0 ? a : 0;
  const base = new THREE.Vector3(f.x + tx, 0, f.z + tz);
  const rot = Math.atan2(f.nx, f.nz);
  const grupo = new THREE.Group();
  grupo.position.copy(base); grupo.rotation.y = rot;
  // el hueco (rojo oscuro: adentro hay radios encendidas) y la hoja con bisagra
  const hueco = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshBasicMaterial({ color: 0x120302 }));
  hueco.position.set(0, 1.15, 0.03);
  const bisagra = new THREE.Group(); bisagra.position.set(-0.7, 0, 0.06);
  const hoja = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.06), material('t_puerta', [1, 1], { color: 0x9a8f80 }));
  hoja.position.set(0.7, 1.2, 0);
  const candado = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.08),
    ps1Material(new THREE.MeshLambertMaterial({ color: 0xb8b8b0, emissive: 0x302820 })));
  candado.position.set(1.25, 1.1, 0.07);
  hoja.add(candado);
  bisagra.add(hoja);
  grupo.add(hueco, bisagra);
  escena.add(grupo);
  const pos = { x: base.x + f.nx * 1.2, z: base.z + f.nz * 1.2 };
  const estado = { abierta: false, apertura: 0 };
  function actualizar(dt) {
    if (estado.abierta && estado.apertura < 1) {
      estado.apertura = Math.min(1, estado.apertura + dt * 0.7);
      bisagra.rotation.y = -1.45 * (1 - Math.pow(1 - estado.apertura, 3));
    }
  }
  function abrir() { estado.abierta = true; candado.visible = false; }
  return { pos, estado, actualizar, abrir };
}
