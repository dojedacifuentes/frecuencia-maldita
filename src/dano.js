// El protagonista se ve dañado (28-nov): sobre la textura del modelo se pintan mugre, moretones, cortes y sangre, más
// a cada golpe de la historia. También vomita: se dobla dos veces y cae al suelo algo que no debería estar adentro.
import * as THREE from 'three';
import { azar } from './ciudad.js';

// nivel 0..4: de recién despierto a muy mal. Sólo toca el material del jugador (las copias guardan el suyo).
export function crearDano(material) {
  const original = material.map;
  let lienzo = null, tex = null, nivel = -1, pendiente = null;
  function poner(n) {
    n = Math.max(0, Math.min(4, Math.round(n)));
    if (n === nivel) return;
    const img = original?.image;
    if (!img || !img.width) { pendiente = n; return; }   // la textura todavía no llega
    nivel = n; pendiente = null;
    if (!lienzo) {
      lienzo = document.createElement('canvas');
      lienzo.width = Math.min(1024, img.width); lienzo.height = Math.min(1024, img.height);
      tex = new THREE.CanvasTexture(lienzo);
      tex.flipY = original.flipY; tex.colorSpace = original.colorSpace;
      tex.magFilter = original.magFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      tex.wrapS = original.wrapS; tex.wrapT = original.wrapT;
    }
    const g = lienzo.getContext('2d'), W = lienzo.width, H = lienzo.height, k = W / 512;
    const r = azar(4170);   // siempre las mismas heridas: cada nivel agrega, no cambia las de antes
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.drawImage(img, 0, 0, W, H);
    // mugre: todo más sucio y apagado
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${255 - n * 16},${255 - n * 22},${255 - n * 26})`; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30 * 4; i++) {
      const x = r() * W, y = r() * H, rx = (6 + r() * 30) * k, ry = (4 + r() * 20) * k, a = r();
      if (i >= 30 * n) continue;
      g.fillStyle = `rgba(${70 + a * 30},${55 + a * 20},${40},0.35)`;
      g.beginPath(); g.ellipse(x, y, rx, ry, a * 3, 0, Math.PI * 2); g.fill();
    }
    // moretones (morado verdoso)
    for (let i = 0; i < 4 * 4; i++) {
      const x = r() * W, y = r() * H, R = (8 + r() * 16) * k;
      if (i >= 4 * n) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(90,60,110,0.7)'); gr.addColorStop(0.6, 'rgba(110,120,70,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - R, y - R, 2 * R, 2 * R);
    }
    // sangre: manchas, salpicaduras y chorreos
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 7 * 4; i++) {
      const x = r() * W, y = r() * H, R = (3 + r() * 13) * k, rojo = 80 + r() * 60, gotas = Math.floor(r() * 7), largo = r() * 40 * k;
      const salp = Array.from({ length: gotas }, () => [r(), r(), r()]);
      if (i >= 7 * n) continue;
      // empapada: multiplica la tela (no es pintura encima); manchas hechas de varias gotas, no círculos
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = `rgba(${Math.round(rojo * 0.9)},${Math.round(rojo * 0.12)},${Math.round(rojo * 0.1)},0.9)`;
      for (let q = 0; q < 6; q++) { g.beginPath(); g.ellipse(x + (salp[q % Math.max(1, gotas)]?.[0] ?? 0.5) * R - R / 2, y + q * R * 0.15, R * (0.5 + q * 0.09), R * 0.42, q, 0, Math.PI * 2); g.fill(); }
      g.fillRect(x - R * 0.1, y, R * 0.2, largo);   // chorrea
      for (const [a, b, c] of salp) { g.beginPath(); g.arc(x + (a - 0.5) * R * 5, y + (b - 0.5) * R * 5, (0.5 + c * 1.5) * k, 0, Math.PI * 2); g.fill(); }
      g.globalCompositeOperation = 'source-over';
    }
    // cortes
    g.strokeStyle = 'rgba(60,0,0,0.9)'; g.lineCap = 'round';
    for (let i = 0; i < 3 * 4; i++) {
      const x = r() * W, y = r() * H, a = r() * Math.PI, l = (8 + r() * 26) * k;
      if (i >= 3 * n) continue;
      g.lineWidth = (1 + r() * 1.5) * k;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    tex.needsUpdate = true;
    material.map = tex; material.emissiveMap = tex; material.needsUpdate = true;
  }
  return { poner, reintentar() { if (pendiente !== null) poner(pendiente); }, get nivel() { return nivel; } };
}

// el vómito: dos arcadas; cada una lanza un chorro desde la boca que cae y deja un charco
export function crearVomito(escena, audio) {
  const N = 140;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3).fill(-999), vel = new Float32Array(N * 3), vivo = new Uint8Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const puntos = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7a7030, size: 0.07, sizeAttenuation: true }));
  puntos.frustumCulled = false; escena.add(puntos);
  const charcoMat = new THREE.MeshLambertMaterial({ color: 0x4a4420, emissive: 0x1a1606, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const charcos = [];
  let sig = 0, piso = 0;
  const v = { activo: false, t: 0, dur: 3.4, lanzado: [false, false], charco: null };
  const ARCADAS = [1.05, 2.15];

  function empezar(jugador) {
    if (v.activo) return false;
    Object.assign(v, { activo: true, t: 0, lanzado: [false, false], jugador });
    jugador.estado.accion = { tipo: 'vomita', t: 0, dur: v.dur };
    piso = jugador.estado.pos.y - 0.15;
    audio.arcada?.(0);
    return true;
  }
  const boca = new THREE.Vector3();
  function lanzar(j) {
    const H = j.figura?.huesos;
    const rumbo = j.estado.rumbo, fx = Math.sin(rumbo), fz = Math.cos(rumbo);
    if (H) { H.cabeza.getWorldPosition(boca); boca.x += fx * 0.12; boca.z += fz * 0.12; boca.y -= 0.06; }
    else boca.set(j.estado.pos.x + fx * 0.4, j.estado.pos.y + 1.2, j.estado.pos.z + fz * 0.4);
    for (let k = 0; k < 60; k++) {
      const i = sig; sig = (sig + 1) % N; vivo[i] = 1;
      pos[i * 3] = boca.x; pos[i * 3 + 1] = boca.y; pos[i * 3 + 2] = boca.z;
      const s = 0.8 + Math.random() * 1.6, lado = (Math.random() - 0.5) * 0.7;
      vel[i * 3] = fx * s + fz * lado; vel[i * 3 + 1] = -0.5 - Math.random() * 1.2; vel[i * 3 + 2] = fz * s - fx * lado;
      // cada gota sale un poco después (es un chorro, no una explosión)
      pos[i * 3 + 1] += k * 0.004;
    }
    // el charco, delante de los pies
    const c = new THREE.Mesh(new THREE.CircleGeometry(1, 10), charcoMat);
    c.rotation.x = -Math.PI / 2; c.position.set(j.estado.pos.x + fx * 0.75, piso + 0.025, j.estado.pos.z + fz * 0.75);
    c.scale.setScalar(0.01); c.userData.crece = 0;
    escena.add(c); charcos.push(c);
    if (charcos.length > 6) escena.remove(charcos.shift());
  }
  function actualizar(dt) {
    if (v.activo) {
      v.t += dt;
      ARCADAS.forEach((ta, k) => { if (!v.lanzado[k] && v.t >= ta) { v.lanzado[k] = true; lanzar(v.jugador); audio.arcada?.(1); } });
      if (v.t >= v.dur) v.activo = false;
    }
    let algo = false;
    for (let i = 0; i < N; i++) {
      if (!vivo[i]) continue;
      algo = true;
      vel[i * 3 + 1] -= 9.8 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] <= piso + 0.03) { pos[i * 3 + 1] = -999; vivo[i] = 0; }
    }
    if (algo) geo.attributes.position.needsUpdate = true;
    for (const c of charcos) if (c.userData.crece < 1) { c.userData.crece = Math.min(1, c.userData.crece + dt * 0.9); c.scale.set(0.55 * c.userData.crece, 0.42 * c.userData.crece, 1); }
  }
  function limpiar() { charcos.forEach((c) => escena.remove(c)); charcos.length = 0; vivo.fill(0); pos.fill(-999); geo.attributes.position.needsUpdate = true; v.activo = false; }
  return { empezar, actualizar, limpiar, get activo() { return v.activo; } };
}
