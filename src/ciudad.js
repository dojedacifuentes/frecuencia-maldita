// La ciudad: una grilla de manzanas con niebla, el baño público donde todo empieza, la plaza del ojo y el portón R9.
// Norte = -z. El baño queda al sur; el portón, al norte.
import * as THREE from 'three';
import { prepararHormigon } from './hormigon.js';
import { material, textura, ps1Material } from './ps1.js';
import { crearLote } from './lote.js';

export const N = 5;           // manzanas por lado
export const MANZANA = 16;
export const CALLE = 6;
export const ACERA = 1.6;
export const LADO = N * MANZANA + (N + 1) * CALLE;   // 116 m
const MITAD = LADO / 2;

export function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function centroManzana(i) { return -MITAD + CALLE + MANZANA / 2 + i * (MANZANA + CALLE); }
export function centroCalle(i) { return -MITAD + CALLE / 2 + i * (MANZANA + CALLE); }

// el canal: ocupa toda la calle entre la fila del portón y la siguiente, de muro a muro; un solo puente, en la calle
// por donde se va de la tercera mancha al portón (ver canal.js)
export const CANAL = {
  z0: centroCalle(1) - CALLE / 2, z1: centroCalle(1) + CALLE / 2,
  puente: { x: centroCalle(3), x0: centroCalle(3) - 2.2, x1: centroCalle(3) + 2.2 },
};
export function enCanal(x, z, margen = 0) { return z > CANAL.z0 - margen && z < CANAL.z1 + margen; }

function caja(w, h, d, mats) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  return m;
}

function plano(w, h, mat) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

export function crearCiudad(escena) {
  const r = azar(317);
  const hormigon = prepararHormigon(azar(1978));
  const grupo = new THREE.Group();
  const colisiones = [];
  const fachadas = [];   // {x, z, nx, nz, largo, alto} caras de edificios para poner manchas y textos
  const faroles = [];
  const basuras = [];
  const sitios = {};

  // suelo y cielo
  // el asfalto, en dos paños: al norte y al sur del canal
  const borde0 = -MITAD - 20, borde1 = MITAD + 20;
  for (const [z0, z1] of [[borde0, CANAL.z0], [CANAL.z1, borde1]]) {
    const largo = z1 - z0;
    const asfalto = plano(LADO + 40, largo, material('t_asfalto', [(LADO + 40) / 6, largo / 6]));
    asfalto.rotation.x = -Math.PI / 2;
    asfalto.position.z = (z0 + z1) / 2;
    grupo.add(asfalto);
  }
  sitios.canal = CANAL;
  const cielo = new THREE.Mesh(new THREE.BoxGeometry(LADO + 60, 60, LADO + 60),
    ps1Material(new THREE.MeshBasicMaterial({ map: textura('t_cielo', [10, 10]), side: THREE.BackSide, color: 0x8a8f99 })));
  cielo.position.y = 28;
  grupo.add(cielo);
  sitios.cielo = cielo;

  const materialesMuro = ['t_ladrillo', 't_concreto', 't_bloque', 't_ladrillo', 't_bloque', 't_azulejo', 't_bloque'];
  const planos = { plaza_sur: [2, N - 1], plaza_centro: [2, 2] };
  const vacias = { eriazo: [1, 3], capilla: [2, 0], poblacion: [4, 2] };   // manzanas sin edificio (lugares.js, barrio.js)
  // manzanas de relleno que pasaron a ser lugares (manzanas.js): un muro bajo alrededor y algo distinto adentro
  const cercadas = { juegos: [3, 4], obra: [0, 3], autos: [4, 0] };
  sitios.cercadas = {};
  // todo lo que se repite (veredas, ventanas, puertas, cortinas, postes) se junta: una malla por material
  const lote = crearLote();
  const M = {
    vereda: material('t_vereda'), puerta: material('t_puerta'), local: material('t_local'), cortina: material('t_cortina'),
    vitrina: material('t_vitrina'), ventana: material('t_ventana', [1, 1], { emissive: 0x2a1d08, emissiveIntensity: 0 }),
    ventanaLuz: material('t_ventana', [1, 1], { emissive: 0x2a1d08, emissiveIntensity: 1 }),
    poste: material('t_cortina', [1, 1], { color: 0x444444 }),
  };
  const nada = { plano() {}, caja() {} };   // para tirar los dados sin construir

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const cx = centroManzana(i), cz = centroManzana(j);
      // acera
      lote.caja(M.vereda, MANZANA, 0.14, MANZANA, cx, 0.07, cz, { tile: 3 });
      if (i === planos.plaza_sur[0] && j === planos.plaza_sur[1]) { sitios.plazaSur = new THREE.Vector3(cx, 0, cz); continue; }
      if (i === planos.plaza_centro[0] && j === planos.plaza_centro[1]) { sitios.plazaCentro = new THREE.Vector3(cx, 0, cz); continue; }
      const lado = MANZANA - 2 * ACERA;
      const vacia = Object.keys(vacias).find((k) => vacias[k][0] === i && vacias[k][1] === j);
      if (vacia) {
        // el sitio eriazo (lugares.js): sin edificio, pero se tiran los mismos dados que para uno, así el resto de la
        // ciudad conserva sus materiales y alturas
        const nomE = materialesMuro[Math.floor(r() * materialesMuro.length)];
        const altoE = nomE === 't_bloque' ? 14 + Math.floor(r() * 3) * 3.5 : 7 + Math.floor(r() * 4) * 3.5;
        if ((i + j) % 3 !== 1 || cx === 0) hormigon(lado, altoE);
        const tirar = new THREE.Group();
        for (const c of [{ nx: 0, nz: 1, x: cx, z: cz + lado / 2 }, { nx: 0, nz: -1, x: cx, z: cz - lado / 2 },
          { nx: 1, nz: 0, x: cx + lado / 2, z: cz }, { nx: -1, nz: 0, x: cx - lado / 2, z: cz }]) decorarFachada(nada, M, c, lado, altoE, r, nomE);
        if (r() < 0.75) { r(); r(); }
        sitios[vacia] = new THREE.Vector3(cx, 0, cz);
        continue;
      }
      const nom = materialesMuro[Math.floor(r() * materialesMuro.length)];
      const bloque = nom === 't_bloque';
      const alto = bloque ? 14 + Math.floor(r() * 3) * 3.5 : 7 + Math.floor(r() * 4) * 3.5;
      const revestimiento = nom === 't_bloque' ? nom : 't_concreto';
      const mat = (i+j)%3 !== 1 || cx === 0 ? hormigon(lado,alto)
        : material(revestimiento, bloque ? [lado / 12.8, alto / 12.8] : [lado / 5, alto / 5], {color: 0xd1c8b4});
      const cercada = Object.keys(cercadas).find((k) => cercadas[k][0] === i && cercadas[k][1] === j);
      if (!cercada) {
        const techo = material('t_concreto', [3, 3], { color: 0x555555 });
        const edificio = caja(lado, alto, lado, [mat, mat, techo, techo, mat, mat]);
        edificio.position.set(cx, alto / 2, cz);
        grupo.add(edificio);
        colisiones.push({ x0: cx - lado / 2, x1: cx + lado / 2, z0: cz - lado / 2, z1: cz + lado / 2 });
      } else sitios.cercadas[cercada] = { x: cx, z: cz, lado };
      // las cuatro caras
      const caras = [
        { nx: 0, nz: 1, x: cx, z: cz + lado / 2 }, { nx: 0, nz: -1, x: cx, z: cz - lado / 2 },
        { nx: 1, nz: 0, x: cx + lado / 2, z: cz }, { nx: -1, nz: 0, x: cx - lado / 2, z: cz },
      ];
      for (const c of caras) {
        // en las cercadas, la cara es el muro bajo (2,6 m): ahí se siguen pegando manchas, frases y viejas
        fachadas.push({ ...c, largo: lado, alto: cercada ? 2.6 : alto, tipo: nom, cercada });
        decorarFachada(cercada ? nada : lote, M, c, lado, alto, r, nom);
      }
      // basura contra la pared
      if (r() < 0.75) {
        const c = caras[Math.floor(r() * 4)];
        const off = (r() - 0.5) * (lado - 4);
        basuras.push(new THREE.Vector3(c.x + c.nx * 0.9 + (c.nz !== 0 ? off : 0), 0.14, c.z + c.nz * 0.9 + (c.nx !== 0 ? off : 0)));
      }
    }
  }

  // faroles en las esquinas de las manzanas (las cabezas, en una sola malla de copias con color propio)
  const cabezas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }), (N + 1) * (N + 1));
  const ubicar = new THREE.Object3D(), tono = new THREE.Color();
  let nCabezas = 0;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      if (r() < 0.25) continue;
      const x = centroCalle(i) + CALLE / 2 + 0.5, z = centroCalle(j) + CALLE / 2 + 0.5;
      lote.caja(M.poste, 0.14, 4.2, 0.14, x, 2.1, z, { tile: 1.4 });
      ubicar.position.set(x, 4.25, z); ubicar.updateMatrix(); cabezas.setMatrixAt(nCabezas, ubicar.matrix);
      cabezas.setColorAt(nCabezas, tono.setHex(0xffb566));
      faroles.push({ pos: new THREE.Vector3(x, 4.1, z), cabeza: nCabezas++, fase: r() * 10, falla: r() < 0.35 });
      colisiones.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
    }
  }

  cabezas.count = nCabezas; grupo.add(cabezas);
  // prender o apagar la cabeza de un farol (main.js, con la luz que le toca)
  function colorFarol(f, hex) { cabezas.setColorAt(f.cabeza, tono.setHex(hex)); cabezas.instanceColor.needsUpdate = true; }

  // muros del borde (la ciudad no tiene salida)
  const borde = material('t_concreto', [LADO / 4, 3]);
  // el muro este tiene una boca al final de la calle central: por ahí se sube al cerro (barrio.js, cerro.js)
  const BOCA = { z0: centroCalle(2) - 2.6, z1: centroCalle(2) + 2.6 };
  sitios.bocaCerro = new THREE.Vector3(MITAD - 0.5, 0, centroCalle(2));
  const largoS = BOCA.z0 + MITAD + 1, largoN = MITAD + 1 - BOCA.z1;
  for (const [x, z, w, d] of [[0, -MITAD - 0.5, LADO + 2, 1], [0, MITAD + 0.5, LADO + 2, 1], [-MITAD - 0.5, 0, 1, LADO + 2],
    [MITAD + 0.5, -MITAD - 1 + largoS / 2, 1, largoS], [MITAD + 0.5, BOCA.z1 + largoN / 2, 1, largoN]]) {
    const m = caja(w, 12, d, borde);
    m.position.set(x, 6, z);
    grupo.add(m);
    colisiones.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  }

  // el portón R9 al norte, en la calle central
  const porton = caja(5, 6, 0.4, material('t_cortina', [1.5, 2]));
  porton.position.set(centroCalle(2) + (MANZANA + CALLE) / 2, 3, -MITAD + 0.1);
  grupo.add(porton);
  sitios.porton = porton;
  const r9 = plano(2.2, 1.4, new THREE.MeshBasicMaterial({ map: lienzoTexto('R9', 128, 80, '#b3231c', 64), transparent: true }));
  r9.position.set(porton.position.x, 4.4, -MITAD + 0.32);
  grupo.add(r9);

  // el baño público en la plaza sur: aquí siempre se despierta
  sitios.bano = crearBano(grupo, colisiones, sitios.plazaSur);

  lote.construir(grupo);

  escena.add(grupo);
  return { grupo, colisiones, fachadas, faroles, basuras, sitios, enCanal, colorFarol };
}

function decorarFachada(lote, M, c, lado, alto, r, nom) {
  const rot = Math.atan2(c.nx, c.nz);
  const poner = (mat, w, h, a, y) => {
    // a: posición a lo largo de la cara (-lado/2..lado/2)
    const tx = c.nz !== 0 ? a * (c.nz > 0 ? 1 : -1) : 0;
    const tz = c.nx !== 0 ? -a * (c.nx > 0 ? 1 : -1) : 0;
    lote.plano(mat, w, h, c.x + c.nx * 0.03 + tx, y, c.z + c.nz * 0.03 + tz, { ry: rot });
  };
  const tramos = Math.floor(lado / 4);
  for (let k = 0; k < tramos; k++) {
    const a = -lado / 2 + 2 + k * 4;
    const tipo = r();
    if (tipo < 0.18) poner(M.puerta, 1.4, 2.4, a, 1.2);
    else if (tipo < 0.36) poner(M.local, 3.6, 3.4, a, 1.7);
    else if (tipo < 0.5) poner(M.cortina, 3.4, 2.8, a, 1.4);
    else if (tipo < 0.56) poner(M.vitrina, 3.2, 2.4, a, 1.5);
    if (nom === 't_bloque') continue;   // el bloque soviético ya trae sus ventanas en la textura
    for (let y = 4.2; y < alto - 1.5; y += 3.5) {
      if (r() < 0.55) poner(r() < 0.3 ? M.ventanaLuz : M.ventana, 1.5, 1.8, a, y);
    }
  }
}

function crearBano(grupo, colisiones, centro) {
  const W = 6, D = 4.6, H = 3.1, e = 0.2;
  const x = centro.x, z = centro.z + 2;
  const afuera = material('t_concreto', [2, 1]);
  const adentro = material('t_azulejo', [1.6, 0.8], { color: 0xb0ab9c });
  const piso = material('t_azulejo', [3, 2], { color: 0x9a9a8a });
  const muros = [
    // [x, z, w, d, cara interior]  sur (al fondo, con urinarios), este, oeste, norte con puerta (dos tramos)
    // caras de BoxGeometry: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z
    [x, z + D / 2, W, e, 5], [x + W / 2, z, e, D, 1], [x - W / 2, z, e, D, 0],
    [x - W / 4 - 0.6, z - D / 2, W / 2 - 1.2, e, 4], [x + W / 4 + 0.6, z - D / 2, W / 2 - 1.2, e, 4],
  ];
  for (const [mx, mz, w, d, cara] of muros) {
    const mats = [afuera, afuera, afuera, afuera, afuera, afuera];
    mats[cara] = adentro;
    const m = caja(w, H, d, mats);
    m.position.set(mx, H / 2, mz);
    grupo.add(m);
    colisiones.push({ x0: mx - w / 2, x1: mx + w / 2, z0: mz - d / 2, z1: mz + d / 2 });
  }
  const dintel = caja(2.4, 0.7, e, afuera);
  dintel.position.set(x, H - 0.35, z - D / 2);
  const techo = caja(W + 0.4, 0.2, D + 0.4, material('t_concreto', [2, 2], { color: 0x666666 }));
  techo.position.set(x, H + 0.1, z);
  const suelo = plano(W, D, piso);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.set(x, 0.16, z);
  grupo.add(dintel, techo, suelo);
  // urinarios contra el muro sur
  const loza = ps1Material(new THREE.MeshLambertMaterial({ color: 0xb4b2a4, side: THREE.DoubleSide }));
  const perfil = [[.03,0],[.17,.13],[.25,.38],[.31,.44],[.305,.47],[.263,.45],[.19,.32],[.04,.19]];
  const taza = new THREE.LatheGeometry(perfil.map(([r,y]) => new THREE.Vector2(r,y)), 14, Math.PI/2, Math.PI);
  for (const ux of [-1.6, 0, 1.6]) {
    const u = new THREE.Mesh(taza, loza);
    u.position.set(x+ux, .56, z+D/2-.18); u.scale.z=1.22;
    const respaldo = new THREE.Mesh(new THREE.SphereGeometry(1,12,8),loza);
    respaldo.position.set(u.position.x,1.03,u.position.z+.018); respaldo.scale.set(.29,.32,.065);
    grupo.add(u,respaldo);
  }
  // tubo fluorescente
  const tubo = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: 0xe8f0ff }));
  tubo.position.set(x, H - 0.1, z);
  grupo.add(tubo);
  const luz = new THREE.PointLight(0xdfe8ff, 5, 11, 1.0);
  luz.position.set(x, H - 0.4, z);
  grupo.add(luz);
  return { centro: new THREE.Vector3(x, 0, z), inicio: new THREE.Vector3(x, 0.15, z + 0.9), muroSur: z + D / 2, tubo, luz,
    puerta: new THREE.Vector3(x, 0, z - D / 2), W, D };
}

export function lienzoTexto(texto, w, h, color = '#1a0a08', tam = 28, fuente = 'bold {t}px "Courier New", monospace', angulo = 0) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.translate(w / 2, h / 2);
  g.rotate(angulo);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = fuente.replace('{t}', tam);
  const lineas = texto.split('\n');
  lineas.forEach((l, k) => {
    // trazo de spray: varias pasadas corridas
    for (let p = 0; p < 3; p++) {
      g.globalAlpha = p === 2 ? 0.95 : 0.25;
      g.fillText(l, (Math.random() - 0.5) * 2, (k - (lineas.length - 1) / 2) * tam * 1.15 + (Math.random() - 0.5) * 2);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
