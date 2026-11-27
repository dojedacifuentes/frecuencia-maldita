// Bichos chicos: arañas en los muros de la calle (cerca tuyo, siempre unas cuantas) y en los azulejos y el techo del
// baño (una camina sobre el espejo); de vez en cuando una baja de su hilo justo delante de ti. Si las alumbras, huyen.
// Cucarachas alrededor de la basura, que se desbandan cuando llegas, y polillas dando vueltas en los faroles.
import * as THREE from 'three';
import { ps1Material } from './ps1.js';

// patas en dos poses (se alternan al caminar): 8 patas de dos tramos, en coordenadas de la araña
// (x a la derecha, y hacia afuera de la superficie, z hacia adelante)
function geoPatas(fase) {
  const p = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const phi = 1.0 - k * 0.65 + Math.sin(fase + k * 1.57 + (s > 0 ? Math.PI : 0)) * 0.22;
      const dx = s * Math.cos(phi), dz = Math.sin(phi);
      const cadera = [s * 0.012, 0.018, 0.0];
      const rodilla = [cadera[0] + dx * 0.055, 0.06, dz * 0.055];
      const pie = [cadera[0] + dx * 0.12, 0.0, dz * 0.12];
      p.push(...cadera, ...rodilla, ...rodilla, ...pie);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return g;
}

export function crearBichos({ escena, ciudad, camara, audio }) {
  const grupo = new THREE.Group(); escena.add(grupo);
  const POSES = [geoPatas(0), geoPatas(Math.PI)];
  const matCuerpo = ps1Material(new THREE.MeshLambertMaterial({ color: 0x2a2018, emissive: 0x120c08 }));
  const matPata = new THREE.LineBasicMaterial({ color: 0x1a140f });
  const geoAbdomen = new THREE.SphereGeometry(0.042, 6, 4); geoAbdomen.scale(1, 0.8, 1.35); geoAbdomen.translate(0, 0.03, -0.05);
  const geoCabeza = new THREE.SphereGeometry(0.026, 5, 3); geoCabeza.translate(0, 0.025, 0.02);

  function nuevaArana(escala) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geoAbdomen, matCuerpo), new THREE.Mesh(geoCabeza, matCuerpo));
    const patas = new THREE.LineSegments(POSES[0], matPata);
    g.add(patas);
    g.scale.setScalar(escala);
    grupo.add(g);
    return { g, patas, sup: null, a: 0, b: 0, rumbo: Math.random() * 6.28, vel: 0, pausa: Math.random() * 2, paso: 0, huye: 0 };
  }

  // una superficie: origen, normal (afuera), u (a lo ancho), v (hacia arriba o a lo largo), límites
  const sup = (o, n, u, v, a0, a1, b0, b1) => ({ o, n, u, v, a0, a1, b0, b1 });
  const up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4(), xr = new THREE.Vector3(), fw = new THREE.Vector3();
  function colocar(ar) {
    const s = ar.sup;
    ar.g.position.copy(s.o).addScaledVector(s.u, ar.a).addScaledVector(s.v, ar.b).addScaledVector(s.n, 0.015);
    fw.copy(s.u).multiplyScalar(Math.cos(ar.rumbo)).addScaledVector(s.v, Math.sin(ar.rumbo));
    xr.copy(s.n).cross(fw);
    m4.makeBasis(xr, s.n, fw);
    ar.g.quaternion.setFromRotationMatrix(m4);
  }
  // camina a ratos, se detiene, cambia de rumbo (como camina una araña)
  function caminar(ar, dt, rapida) {
    if (ar.pausa > 0 && !rapida) { ar.pausa -= dt; return; }
    ar.vel = rapida ? 1.4 : 0.18;
    ar.a += Math.cos(ar.rumbo) * ar.vel * dt / ar.g.scale.x * 0.6;
    ar.b += Math.sin(ar.rumbo) * ar.vel * dt / ar.g.scale.x * 0.6;
    const s = ar.sup;
    if (ar.a < s.a0 || ar.a > s.a1 || ar.b < s.b0 || ar.b > s.b1) {
      ar.a = Math.max(s.a0, Math.min(s.a1, ar.a)); ar.b = Math.max(s.b0, Math.min(s.b1, ar.b));
      ar.rumbo += Math.PI * (0.6 + Math.random() * 0.8);
    }
    if (Math.random() < dt * 0.8) ar.rumbo += (Math.random() - 0.5) * 2;
    if (!rapida && Math.random() < dt * 0.7) ar.pausa = 0.4 + Math.random() * 1.8;
    ar.paso += dt * (rapida ? 30 : 12);
    ar.patas.geometry = POSES[Math.floor(ar.paso) % 2];
  }

  // ---------------- el baño: muros de azulejo, techo y el espejo
  const b = ciudad.sitios.bano;
  const cx = b.centro.x, cz = b.centro.z, W = b.W, D = b.D;
  const supBano = [
    sup(new THREE.Vector3(cx, 0, cz + D / 2 - 0.1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), up, -2.8, 2.8, 1.3, 2.9),   // sur
    sup(new THREE.Vector3(cx + W / 2 - 0.1, 0, cz), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), up, -2.1, 2.1, 0.4, 2.9),  // este (espejo)
    sup(new THREE.Vector3(cx - W / 2 + 0.1, 0, cz), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), up, -2.1, 2.1, 0.4, 2.9),  // oeste
    sup(new THREE.Vector3(cx, 3.1 - 0.02, cz), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), -2.7, 2.7, -2.1, 2.1),   // techo
  ];
  const aranasBano = [];
  [[0, 1.2], [1, 1.0], [1, 0.9], [2, 1.3], [3, 1.6], [3, 1.1]].forEach(([i, esc]) => {
    const ar = nuevaArana(esc);
    ar.sup = supBano[i];
    ar.a = ar.sup.a0 + Math.random() * (ar.sup.a1 - ar.sup.a0); ar.b = ar.sup.b0 + Math.random() * (ar.sup.b1 - ar.sup.b0);
    colocar(ar); aranasBano.push(ar);
  });
  // la del espejo: sobre el vidrio
  aranasBano[1].a = -0.4; aranasBano[1].b = 1.6;

  // ---------------- la calle: siempre unas cuantas en los muros cercanos
  const aranasCalle = Array.from({ length: 14 }, () => nuevaArana(1.1 + Math.random() * 0.9));
  function supMuro(f) {
    const n = new THREE.Vector3(f.nx, 0, f.nz), u = new THREE.Vector3(f.nz, 0, -f.nx);
    return sup(new THREE.Vector3(f.x, 0, f.z), n, u, up, -f.largo / 2 + 0.3, f.largo / 2 - 0.3, 0.3, 2.8);
  }
  function mudar(ar, pj) {
    // un muro que mire hacia ti, a entre 3 y 14 m
    const cand = ciudad.fachadas.filter((f) => {
      const dx = pj.x - f.x, dz = pj.z - f.z, d = Math.hypot(dx, dz);
      return d < 16 && (dx * f.nx + dz * f.nz) > 1.5;
    });
    if (!cand.length) { ar.g.visible = false; return; }
    const f = cand[Math.floor(Math.random() * cand.length)];
    ar.sup = supMuro(f); ar.g.visible = true; ar.huye = 0;
    ar.a = ar.sup.a0 + Math.random() * (ar.sup.a1 - ar.sup.a0); ar.b = 0.4 + Math.random() * 2.2;
    colocar(ar);
  }

  // ---------------- la que baja de su hilo
  const colgante = nuevaArana(2.0);
  colgante.g.visible = false;
  const hilo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0xbcbcb4, transparent: true, opacity: 0.6 }));
  hilo.visible = false; grupo.add(hilo);
  const caida = { estado: 'espera', t: 25 + Math.random() * 20, arriba: new THREE.Vector3(), y: 0 };

  // ---------------- cucarachas alrededor de la basura
  const NC = 36;
  const cucas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.022, 0.085), ps1Material(new THREE.MeshLambertMaterial({ color: 0x4a2a14, emissive: 0x140a04 })), NC);
  cucas.frustumCulled = false;
  grupo.add(cucas);
  const cuca = Array.from({ length: NC }, () => ({ x: 0, z: 0, hx: 0, hz: 0, ang: Math.random() * 6.28, huye: 0, lista: false }));

  // ---------------- polillas en los faroles
  const NP = 24;
  const polillas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.045), new THREE.MeshBasicMaterial({ color: 0xd8d2c0, side: THREE.DoubleSide }), NP);
  polillas.frustumCulled = false;
  grupo.add(polillas);
  const fase = Array.from({ length: NP }, () => Math.random() * 100);

  const dummy = new THREE.Object3D(), tmp = new THREE.Vector3();
  let farolesCerca = [], recalculo = 0;

  function enHaz(jugador, p, max = 8) {
    if (!jugador.linternaOn) return false;
    tmp.set(p.x - jugador.pos.x, 0, p.z - jugador.pos.z);
    const d = tmp.length();
    return d < max && (tmp.x * Math.sin(jugador.rumbo) + tmp.z * Math.cos(jugador.rumbo)) / (d || 1) > 0.88;
  }

  function actualizar(dt, t, jugador, zona, enBano) {
    const pj = jugador.pos;
    const enCiudad = zona === 'ciudad';
    grupo.visible = enCiudad;
    if (!enCiudad) return;

    // el baño
    for (const ar of aranasBano) {
      caminar(ar, dt, enBano && enHaz(jugador, ar.g.position, 5));
      colocar(ar);
      if (enBano && ar.vel > 1 && Math.random() < dt * 3) audio.patitas(ar.g.position.distanceTo(pj));
    }

    // la calle
    for (const ar of aranasCalle) {
      if (!ar.sup || !ar.g.visible || ar.g.position.distanceTo(pj) > 22) { if (!enBano) mudar(ar, pj); continue; }
      if (enHaz(jugador, ar.g.position)) ar.huye = Math.max(ar.huye, 1.6);
      if (ar.huye > 0) { ar.huye -= dt; if (ar.huye <= 0) { ar.g.visible = false; continue; } }
      caminar(ar, dt, ar.huye > 0);
      colocar(ar);
      const d = ar.g.position.distanceTo(pj);
      if (d < 2.5 && Math.random() < dt * 2) audio.patitas(d);
    }

    // la que baja del hilo, delante de ti (sólo afuera)
    if (caida.estado === 'espera') {
      caida.t -= dt;
      if (caida.t <= 0 && !enBano) {
        // delante de la cámara (que va sobre el hombro derecho), no detrás del cuerpo
        const y = jugador.yawCam, fx = Math.sin(y), fz = Math.cos(y), dx = -Math.cos(y), dz = Math.sin(y);
        caida.arriba.set(pj.x + fx * 2.3 + dx * 0.55, 4.2, pj.z + fz * 2.3 + dz * 0.55);
        caida.estado = 'baja'; caida.y = 4.2;
        colgante.g.visible = true; hilo.visible = true;
        audio.hilo();
      }
    } else {
      if (caida.estado === 'baja') { caida.y -= dt * 1.6; if (caida.y <= 1.65) { caida.y = 1.65; caida.estado = 'cuelga'; caida.t = 2.6; } }
      else if (caida.estado === 'cuelga') {
        caida.t -= dt;
        if (enHaz(jugador, caida.arriba, 6)) caida.t = Math.min(caida.t, 0.2);   // la luz la espanta
        if (caida.t <= 0) caida.estado = 'sube';
      } else if (caida.estado === 'sube') {
        caida.y += dt * 2.4;
        if (caida.y >= 4.2) { caida.estado = 'espera'; caida.t = 40 + Math.random() * 45; colgante.g.visible = false; hilo.visible = false; }
      }
      const g = colgante.g;
      g.position.set(caida.arriba.x + Math.sin(t * 2.3) * 0.04, caida.y, caida.arriba.z);
      g.rotation.set(Math.PI / 2, t * 0.7, 0);   // cuelga cabeza abajo, girando despacio
      colgante.paso += dt * 8; colgante.patas.geometry = POSES[Math.floor(colgante.paso) % 2];
      hilo.geometry.attributes.position.setXYZ(0, g.position.x, 4.2, g.position.z);
      hilo.geometry.attributes.position.setXYZ(1, g.position.x, caida.y + 0.06, g.position.z);
      hilo.geometry.attributes.position.needsUpdate = true;
    }

    // cucarachas: viven junto a la basura más cercana; se desbandan si llegas o si las alumbras
    for (let i = 0; i < NC; i++) {
      const c = cuca[i];
      const dj = Math.hypot(c.x - pj.x, c.z - pj.z);
      if (!c.lista || dj > 30) {
        const cerca = ciudad.basuras.filter((bs) => Math.hypot(bs.x - pj.x, bs.z - pj.z) < 26);
        if (!cerca.length) { c.lista = false; dummy.position.set(0, -50, 0); dummy.updateMatrix(); cucas.setMatrixAt(i, dummy.matrix); continue; }
        const bs = cerca[i % cerca.length];
        c.hx = bs.x; c.hz = bs.z; c.x = bs.x + (Math.random() - 0.5) * 1.4; c.z = bs.z + (Math.random() - 0.5) * 1.4; c.lista = true;
      }
      if (dj < 2.6 || enHaz(jugador, { x: c.x, z: c.z }, 7)) { c.huye = 1.2; c.ang = Math.atan2(c.x - pj.x, c.z - pj.z) + (Math.random() - 0.5); }
      let v;
      if (c.huye > 0) { c.huye -= dt; v = 2.2; }
      else {
        v = Math.random() < 0.5 ? 0 : 0.35;
        if (Math.hypot(c.x - c.hx, c.z - c.hz) > 1.2) c.ang = Math.atan2(c.hx - c.x, c.hz - c.z);
        else if (Math.random() < dt * 3) c.ang += (Math.random() - 0.5) * 2.5;
      }
      c.x += Math.sin(c.ang) * v * dt; c.z += Math.cos(c.ang) * v * dt;
      dummy.position.set(c.x, 0.17, c.z); dummy.rotation.set(0, c.ang, 0); dummy.updateMatrix();
      cucas.setMatrixAt(i, dummy.matrix);
    }
    cucas.instanceMatrix.needsUpdate = true;

    // polillas: las cuatro luces encendidas más cercanas
    recalculo -= dt;
    if (recalculo <= 0) {
      recalculo = 1;
      farolesCerca = ciudad.faroles.map((f) => [f, f.pos.distanceToSquared(pj)]).sort((x, y) => x[1] - y[1]).slice(0, 4).map((x) => x[0]);
    }
    for (let i = 0; i < NP; i++) {
      const f = farolesCerca[i % Math.max(1, farolesCerca.length)];
      if (!f) continue;
      const k = fase[i] + t * (2 + (i % 3));
      dummy.position.set(f.pos.x + Math.sin(k * 1.3) * 0.5 + Math.sin(k * 3.1) * 0.15, f.pos.y - 0.1 + Math.sin(k * 2.2) * 0.3, f.pos.z + Math.cos(k * 1.7) * 0.5);
      dummy.rotation.set(Math.sin(k * 9) * 1.2, k, 0);
      dummy.updateMatrix(); polillas.setMatrixAt(i, dummy.matrix);
    }
    polillas.instanceMatrix.needsUpdate = true;
  }

  return { actualizar, depurar: { aranasBano, aranasCalle, colgante, caida, cucas } };
}
