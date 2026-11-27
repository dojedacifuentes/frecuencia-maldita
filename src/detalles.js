// Detalle del escenario: volumen en las fachadas (cornisas, franjas, cañerías, balcones, aire acondicionado, escaleras
// de incendio), estanques y antenas en los techos, autos abandonados, alcantarillas que humean, postes con cables,
// semáforos muertos que parpadean, bancas rotas, papeles en el suelo y afiches rotos.
// Toda la geometría fija se junta por material (pocas llamadas de dibujo: sigue fluido).
import * as THREE from 'three';
import { vestirBarrio } from './ambiente.js';
import { montarAuto, prepararAutos } from './autos.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { material, textura, ps1Material } from './ps1.js';
import { azar, centroCalle, centroManzana, MANZANA, CALLE, N } from './ciudad.js';

export function crearDetalles(escena, ciudad) {
  const r = azar(9090);
  const M = {
    oxido: material('t_oxido', [1, 1]),
    concreto: material('t_concreto', [1, 1], { color: 0x8c8a84 }),
    oscuro: ps1Material(new THREE.MeshLambertMaterial({ color: 0x1b1b1a })),
    goma: ps1Material(new THREE.MeshLambertMaterial({ color: 0x0f0f0f })),
    papel: ps1Material(new THREE.MeshLambertMaterial({ color: 0x9a968a, side: THREE.DoubleSide })),
    alcantarilla: material('t_alcantarilla'),
    afiche: ps1Material(new THREE.MeshLambertMaterial({ map: textura('s_afiche'), alphaTest: 0.5, side: THREE.DoubleSide })),
  };
  const lotes = new Map();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), uno = new THREE.Vector3(1, 1, 1);
  function poner(clave, geo, x, y, z, ry = 0, rx = 0, rz = 0) {
    e.set(rx, ry, rz); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, y, z), q, uno);
    geo.applyMatrix4(m4);
    if (!lotes.has(clave)) lotes.set(clave, []);
    lotes.get(clave).push(geo);
  }
  const caja = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cil = (r1, r2, h, s = 7) => new THREE.CylinderGeometry(r1, r2, h, s);
  // punto sobre una fachada: a lo largo (a), altura (y), hacia afuera (o)
  const punto = (f, a, o) => ({ x: f.x + f.nx * o + (f.nz !== 0 ? a : 0), z: f.z + f.nz * o + (f.nx !== 0 ? a : 0), ry: Math.atan2(f.nx, f.nz) });

  // ---------- fachadas
  const vistos = new Set();
  const afiches = [];   // para leerlos con E
  const autos = [];     // para mirar dentro con E
  for (const f of ciudad.fachadas) {
    const L = f.largo;
    // cornisa y franja del primer piso
    let p = punto(f, 0, 0.2);
    poner('concreto', caja(L + 0.4, 0.35, 0.4), p.x, f.alto - 0.18, p.z, p.ry);
    if (r() < 0.6) { p = punto(f, 0, 0.08); poner('concreto', caja(L, 0.16, 0.16), p.x, 3.4, p.z, p.ry); }
    // bajada de agua oxidada en una esquina
    p = punto(f, (r() < 0.5 ? -1 : 1) * (L / 2 - 0.35), 0.14);
    poner('oxido', cil(0.07, 0.07, f.alto - 0.2), p.x, (f.alto - 0.2) / 2, p.z);
    // aire acondicionado y balcones
    for (let y = 4.4; y < f.alto - 2; y += 3.4) {
      for (let a = -L / 2 + 2; a < L / 2 - 1; a += 3.2) {
        const t = r();
        if (t < 0.07) { p = punto(f, a, 0.25); poner('concreto', caja(0.75, 0.5, 0.45), p.x, y - 0.6, p.z, p.ry); }
        else if (f.tipo === 't_bloque' && t < 0.16) {
          p = punto(f, a, 0.45); poner('concreto', caja(1.7, 0.12, 0.9), p.x, y - 1.0, p.z, p.ry);
          p = punto(f, a, 0.88); poner('oxido', caja(1.7, 0.55, 0.05), p.x, y - 0.68, p.z, p.ry);
        }
      }
    }
    // escalera de incendio en algunos edificios de ladrillo
    if (f.tipo === 't_ladrillo' && r() < 0.35) {
      const a = (r() - 0.5) * (L - 5);
      for (let y = 3.6; y < f.alto - 1; y += 3.5) {
        p = punto(f, a, 0.6); poner('oxido', caja(2.6, 0.08, 1.1), p.x, y, p.z, p.ry);
        p = punto(f, a, 1.12); poner('oxido', caja(2.6, 0.9, 0.04), p.x, y + 0.45, p.z, p.ry);
        p = punto(f, a + 0.4, 0.6); poner('oxido', caja(0.6, 0.06, 3.9), p.x, y - 1.75, p.z, p.ry, 0.9);
      }
    }
    // afiches rotos a la altura de los ojos
    if (r() < 0.45) { p = punto(f, (r() - 0.5) * (L - 3), 0.05); poner('afiche', new THREE.PlaneGeometry(0.75, 1.0), p.x, 1.55 + r() * 0.3, p.z, p.ry); afiches.push({ x: p.x + f.nx * 0.6, z: p.z + f.nz * 0.6 }); }
    // techo: estanque de agua y antena (una vez por edificio)
    const clave = `${Math.round(f.x - f.nx * L / 2)}_${Math.round(f.z - f.nz * L / 2)}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      const cx = f.x - f.nx * L / 2, cz = f.z - f.nz * L / 2;
      if (r() < 0.6) {
        const tx = cx + (r() - 0.5) * (L - 4), tz = cz + (r() - 0.5) * (L - 4);
        poner('oxido', cil(0.9, 0.9, 1.7, 9), tx, f.alto + 1.9, tz);
        for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) poner('oxido', caja(0.08, 1.1, 0.08), tx + dx, f.alto + 0.55, tz + dz);
      }
      if (r() < 0.5) poner('oxido', caja(0.05, 3.2, 0.05), cx + (r() - 0.5) * 6, f.alto + 1.6, cz + (r() - 0.5) * 6);
    }
  }

  // ---------- calles
  const enCalle = () => {
    // un punto sobre una calle (entre manzanas), lejos de los bordes
    const vertical = r() < 0.5;
    const i = Math.floor(r() * (N + 1)), j = Math.floor(r() * N);
    const largo = centroManzana(j) + (r() - 0.5) * (MANZANA - 4);
    const ancho = centroCalle(i);
    return vertical ? { x: ancho, z: largo, rot: 0 } : { x: largo, z: ancho, rot: Math.PI / 2 };
  };
  prepararAutos(M);
  // Autos estacionados junto a la solera. Uno enmarca la salida del baño.
  for (let k = 0; k < 11; k++) {
    const s = enCalle();
    const lado = r() < .5 ? -1 : 1;
    const off = lado * (CALLE/2 - 1.15);
    let x = k===0 ? 4.7 : s.x+(s.rot===0?off:0);
    let z = k===0 ? 34.7 : s.z+(s.rot===0?0:off);
    const desvio = (r()-.5)*.25;
    let ry = k===0 ? -1.38 : s.rot+desvio;
    // Prueba el siguiente tramo de solera si ya hay un poste o un coche estacionado.
    for (let intento=0; intento<2*N*N; intento++) {
      const hx=Math.abs(Math.sin(ry))*2.10+Math.abs(Math.cos(ry))*.99;
      const hz=Math.abs(Math.cos(ry))*2.10+Math.abs(Math.sin(ry))*.99;
      const ocupado=ciudad.colisiones.some(c=>x+hx+.30>c.x0 && x-hx-.30<c.x1 && z+hz+.30>c.z0 && z-hz-.30<c.z1);
      if(!ocupado) {
        montarAuto(poner,x,z,ry,k);
        autos.push({x,z});
        ciudad.colisiones.push({x0:x-hx,x1:x+hx,z0:z-hz,z1:z+hz});
        break;
      }
      const tramo=(k*7+intento)%(N*N);
      ry=0; x=centroCalle(1+tramo%N)+off; z=centroManzana(Math.floor(tramo/N));
    }

  }
  // alcantarillas (algunas humean)
  const vapores = [];
  for (let k = 0; k < 14; k++) {
    const s = enCalle();
    const g = new THREE.CircleGeometry(0.5, 12); g.rotateX(-Math.PI / 2);
    poner('alcantarilla', g, s.x, 0.015, s.z);
    if (k < 6) vapores.push(new THREE.Vector3(s.x, 0.05, s.z));
  }
  // papeles y basura chica por el suelo
  for (let k = 0; k < 160; k++) {
    const s = enCalle();
    const g = new THREE.PlaneGeometry(0.28 + r() * 0.2, 0.36 + r() * 0.2); g.rotateX(-Math.PI / 2);
    poner('papel', g, s.x + (r() - 0.5) * CALLE, 0.02 + r() * 0.01, s.z + (r() - 0.5) * 3, r() * 6);
  }
  // postes con cables a lo largo de dos avenidas
  const postes = [];
  for (const i of [1, 4]) {
    for (let j = 0; j <= N; j++) {
      const x = centroCalle(i) - CALLE / 2 + 0.4, z = centroCalle(j) - CALLE / 2 + 0.4 + (j === N ? -1 : 0);
      poner('oxido', cil(0.11, 0.14, 8.2, 6), x, 4.1, z);
      poner('oxido', caja(1.8, 0.1, 0.1), x, 7.6, z);
      postes.push(new THREE.Vector3(x, 7.6, z));
      ciudad.colisiones.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
    }
  }
  const puntosCable = [];
  for (let k = 0; k < postes.length - 1; k++) {
    const a = postes[k], b = postes[k + 1];
    if (Math.abs(a.x - b.x) > 1) continue;
    for (const off of [-0.8, 0, 0.8]) {
      for (let s = 0; s < 10; s++) {
        const t0 = s / 10, t1 = (s + 1) / 10;
        const y = (t) => 7.6 - Math.sin(Math.PI * t) * 1.1;
        puntosCable.push(new THREE.Vector3(a.x + off, y(t0), a.z + (b.z - a.z) * t0), new THREE.Vector3(a.x + off, y(t1), a.z + (b.z - a.z) * t1));
      }
    }
  }
  const cables = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(puntosCable), new THREE.LineBasicMaterial({ color: 0x0a0a0a }));
  escena.add(cables);
  // semáforos muertos que parpadean en amarillo
  const semaforos = [];
  for (const [i, j] of [[1, 1], [3, 2], [2, 4], [4, 3], [0, 3], [3, 0]]) {
    const x = centroCalle(i) + CALLE / 2 - 0.5, z = centroCalle(j) - CALLE / 2 + 0.5;
    poner('oxido', cil(0.08, 0.08, 3.4, 6), x, 1.7, z);
    poner('oscuro', caja(0.36, 0.95, 0.32), x, 3.6, z);
    const luz = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0x332200 }));
    luz.position.set(x, 3.6, z + 0.17);
    escena.add(luz);
    semaforos.push({ luz, fase: r() * 3 });
    ciudad.colisiones.push({ x0: x - 0.12, x1: x + 0.12, z0: z - 0.12, z1: z + 0.12 });
  }
  // bancas rotas en las plazas
  for (const c of [ciudad.sitios.plazaCentro, ciudad.sitios.plazaSur]) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.4, x = c.x + Math.cos(a) * 5.6, z = c.z + Math.sin(a) * 5.6 - (c === ciudad.sitios.plazaSur ? 4.5 : 0);
      const ry = -a + Math.PI / 2;
      poner('concreto', caja(1.8, 0.1, 0.5), x, 0.55, z, ry, 0, k === 1 ? 0.25 : 0);
      poner('oxido', caja(1.8, 0.5, 0.06), x - Math.cos(a) * 0.25, 0.85, z - Math.sin(a) * 0.25, ry);
      poner('oxido', caja(0.08, 0.5, 0.45), x, 0.28, z, ry);
    }
  }

  vestirBarrio(ciudad, poner, M);

  // ---------- juntar por material
  for (const [clave, geos] of lotes) {
    const g = mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(g, M[clave]);
    escena.add(mesh);
  }

  // vapor de las alcantarillas
  const humo = [];
  const matHumo = new THREE.MeshBasicMaterial({ color: 0x9a9a92, transparent: true, opacity: 0.25, depthWrite: false });
  for (const v of vapores) {
    for (let k = 0; k < 6; k++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), matHumo.clone());
      p.position.copy(v); p.userData = { base: v, vida: r() * 3 };
      escena.add(p); humo.push(p);
    }
  }

  function actualizar(dt, t, camara) {
    for (const s of semaforos) s.luz.material.color.setHex(Math.sin(t * 3.2 + s.fase) > 0 ? 0xffb000 : 0x241600);
    for (const p of humo) {
      const u = p.userData;
      u.vida += dt;
      if (u.vida > 3) u.vida = 0;
      const k = u.vida / 3;
      p.position.set(u.base.x + Math.sin(t + u.vida) * 0.2, 0.1 + k * 2.6, u.base.z);
      p.scale.setScalar(0.6 + k * 1.6);
      p.material.opacity = 0.28 * (1 - k);
      p.quaternion.copy(camara.quaternion);
    }
  }
  return { actualizar, afiches, autos };
}
