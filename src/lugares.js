// Lugares del mapa:
//   · el pasaje: la calle que va de la primera mancha a la segunda se angosta entre dos muros de ladrillo, con techo
//     de calamina rota, ropa colgada (entre ella, un abrigo verde como el tuyo), un contenedor y una ampolleta. Arriba,
//     por sobre el muro, se asoma una cara que se esconde si la miras.
//   · el sitio eriazo: una manzana sin edificio, con tierra, maleza, una reja rota, un colchón y columpios que se mecen
//     solos; cuando te acercas, se detienen de golpe.
// Se arma antes que los detalles de la calle (así ningún auto queda metido en un muro); lo que se examina con E se
// registra después, con registrar().
import * as THREE from 'three';
import { juntarQuietas } from './lote.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { material, textura, ps1Material } from './ps1.js';
import { centroCalle, MANZANA, ACERA } from './ciudad.js';
import { loMira } from './siniestro.js';

function lienzo(w, h, dibujar, repetir = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repetir); }
  return t;
}
const prenda = (color, forma) => lienzo(64, 64, (g) => {
  g.fillStyle = color;
  if (forma === 'polera') { g.fillRect(14, 6, 36, 50); g.fillRect(2, 6, 14, 18); g.fillRect(48, 6, 14, 18); }
  else if (forma === 'vestido') { g.beginPath(); g.moveTo(24, 4); g.lineTo(40, 4); g.lineTo(54, 62); g.lineTo(10, 62); g.closePath(); g.fill(); }
  else if (forma === 'abrigo') { g.fillRect(12, 2, 40, 62); g.fillRect(2, 2, 12, 40); g.fillRect(50, 2, 12, 40); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(31, 10, 2, 54); }
  else { g.fillRect(0, 0, 64, 64); }
  g.fillStyle = 'rgba(30,20,10,.35)';   // manchas
  for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 5, 0, 7); g.fill(); }
});

export function crearLugares(escena, ciudad) {
  const grupo = new THREE.Group(); escena.add(grupo);
  const ladrillo = material('t_ladrillo', [4, 0.9], { color: 0x9a8a7a });
  const oxido = material('t_oxido', [1, 1]);
  const cosasE = [];   // para registrar(): [{pos, radio, etiqueta, accion, activo}]
  const ctx = {};       // audio, siniestro, inventario: llegan con registrar()

  // ================= el pasaje (calle x = centroCalle(3), entre z 14.5 y 29.5)
  const px = centroCalle(3), pz0 = 14.5, pz1 = 29.5, ancho = 2.2;
  const pasaje = { x0: px - ancho / 2, x1: px + ancho / 2, z0: pz0, z1: pz1 };
  ciudad.sitios.pasaje = pasaje;
  const largo = pz1 - pz0, zc = (pz0 + pz1) / 2;
  for (const x of [pasaje.x0 - 0.13, pasaje.x1 + 0.13]) {
    const muro = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.2, largo), ladrillo);
    muro.position.set(x, 1.6, zc); grupo.add(muro);
    ciudad.colisiones.push({ x0: x - 0.13, x1: x + 0.13, z0: pz0, z1: pz1 });
    // del muro hasta el edificio de al lado: se tapa la vereda, así sólo se pasa por el pasaje
    const lado = Math.sign(x - px), hasta = 3.4;
    const relleno = new THREE.Mesh(new THREE.BoxGeometry(hasta, 3.2, 0.26), ladrillo);
    for (const z of [pz0, pz1]) { const r = relleno.clone(); r.position.set(x + lado * hasta / 2, 1.6, z); grupo.add(r); }
    ciudad.colisiones.push({ x0: Math.min(x, x + lado * hasta), x1: Math.max(x, x + lado * hasta), z0: pz0 - 0.13, z1: pz1 + 0.13 });
  }
  // letrero a la entrada
  const letrero = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: lienzo(160, 40, (g, w, h) => {
    g.fillStyle = '#2a2420'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9bf9f'; g.font = 'bold 22px "Courier New", monospace';
    g.textAlign = 'center'; g.fillText('PASAJE R9', w / 2, 28);
  }) }));
  letrero.position.set(px, 3.35, pz1 + 0.02); grupo.add(letrero);
  // techo de calamina, con planchas que faltan
  const calamina = material('t_oxido', [1, 2], { color: 0x8a7a6a });
  for (let z = pz0 + 1; z < pz1 - 0.5; z += 2.2) {
    if (Math.abs(z - zc) < 1.2 || (z > pz0 + 8 && z < pz0 + 10.5)) continue;   // hoyos
    const plancha = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.7, 0.04, 2.0), calamina);
    plancha.position.set(px, 3.25 + Math.sin(z) * 0.06, z); plancha.rotation.z = 0.06; grupo.add(plancha);
  }
  // cordeles con ropa colgada
  const cordeles = [], ropa = [];
  const PRENDAS = [['#6a6a72', 'polera'], ['#7a2a2a', 'vestido'], ['#d8d0c0', 'sabana'], ['#4a5530', 'abrigo'], ['#2a3a5a', 'polera']];
  [pz0 + 2.5, pz0 + 6, pz0 + 11.5, pz1 - 2].forEach((z, k) => {
    cordeles.push(new THREE.Vector3(pasaje.x0, 2.9, z), new THREE.Vector3(pasaje.x1, 2.9, z));
    const [color, forma] = PRENDAS[k % PRENDAS.length];
    const alto = forma === 'sabana' ? 1.2 : forma === 'abrigo' ? 1.1 : 0.7;
    const geo = new THREE.PlaneGeometry(forma === 'sabana' ? 0.8 : 0.6, alto); geo.translate(0, -alto / 2, 0); geo.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(geo, ps1Material(new THREE.MeshLambertMaterial({ map: prenda(color, forma), alphaTest: 0.4, side: THREE.DoubleSide })));
    m.position.set(px + (k % 2 ? 0.72 : -0.72), 2.95, z);   // pegada a los muros: el centro queda libre para pasar (y mirar)
    grupo.add(m); ropa.push({ m, fase: k * 1.3 });
  });
  grupo.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cordeles), new THREE.LineBasicMaterial({ color: 0x1a1612 })));
  // contenedor que angosta el paso
  const contenedor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 1.7), material('t_oxido', [1, 1], { color: 0x3a5a3a }));
  contenedor.position.set(pasaje.x1 - 0.45, 0.8, pz0 + 8.8); grupo.add(contenedor);
  ciudad.colisiones.push({ x0: pasaje.x1 - 0.9, x1: pasaje.x1, z0: pz0 + 7.95, z1: pz0 + 9.65 });
  // la ampolleta y su luz corta
  const ampolleta = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd890, fog: false }));
  ampolleta.position.set(px, 2.7, zc + 1.5); grupo.add(ampolleta);
  const luz = new THREE.PointLight(0xffc880, 3.5, 7, 1.4); luz.position.copy(ampolleta.position); grupo.add(luz);
  // grafiti
  const grafiti = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ transparent: true, map: lienzo(256, 64, (g) => {
    g.fillStyle = '#6e0d08'; g.font = 'bold 30px "Courier New", monospace'; g.fillText('NO MIRES ARRIBA', 6, 42);
  }) }));
  grafiti.position.set(pasaje.x0 + 0.01, 1.7, pz0 + 4.5); grafiti.rotation.y = Math.PI / 2; grupo.add(grafiti);
  // la cara que se asoma por sobre el muro
  const texCara = textura('s_vieja_frente');
  const geoCara = new THREE.PlaneGeometry(0.9, 1.55); geoCara.translate(0, 0.78, 0);
  const cara = new THREE.Mesh(geoCara, ps1Material(new THREE.MeshLambertMaterial({ map: texCara, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: texCara, emissiveIntensity: 0.2 })));
  cara.position.set(pasaje.x1 + 0.3, 2.2, pz0 + 10.5);
  grupo.add(cara);
  const caraEstado = { asoma: 0, escondida: 0 };
  cosasE.push({
    pos: { x: px, z: zc }, radio: 2.0, etiqueta: 'mirar la ropa colgada',
    accion: () => 'Entre la ropa hay un abrigo verde como el tuyo.\nEstá mojado. Gotea agua del canal.',
  });

  // ================= el sitio eriazo
  const e = ciudad.sitios.eriazo;
  const interior = MANZANA - 2 * ACERA;
  const tierra = lienzo(128, 128, (g) => {
    g.fillStyle = '#4a3a2a'; g.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 1400; k++) { g.fillStyle = `rgba(${40 + Math.random() * 50},${30 + Math.random() * 40},${20 + Math.random() * 25},.6)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  }, [4, 4]);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(interior + 2, interior + 2), ps1Material(new THREE.MeshLambertMaterial({ map: tierra })));
  suelo.rotation.x = -Math.PI / 2; suelo.position.set(e.x, 0.15, e.z); grupo.add(suelo);
  // maleza: matas cruzadas
  const pasto = lienzo(64, 64, (g) => {
    for (let k = 0; k < 40; k++) {
      g.strokeStyle = `rgba(${70 + Math.random() * 40},${80 + Math.random() * 40},${30},.9)`; g.lineWidth = 2;
      const x = Math.random() * 64; g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + (Math.random() - 0.5) * 20, 30, x + (Math.random() - 0.5) * 24, 4 + Math.random() * 30); g.stroke();
    }
  });
  const matas = [];
  for (let k = 0; k < 26; k++) {
    const a = new THREE.PlaneGeometry(1.1, 0.9); a.translate(0, 0.45, 0);
    const b = a.clone(); b.rotateY(Math.PI / 2);
    const m = mergeGeometries([a, b]);
    m.translate(e.x + (Math.random() - 0.5) * (interior - 1), 0.15, e.z + (Math.random() - 0.5) * (interior - 1));
    matas.push(m);
  }
  grupo.add(new THREE.Mesh(mergeGeometries(matas), ps1Material(new THREE.MeshLambertMaterial({ map: pasto, alphaTest: 0.4, side: THREE.DoubleSide }))));
  // reja de alambre, rota del lado este (hacia la calle que va a las manchas)
  const malla = lienzo(64, 64, (g) => {
    g.strokeStyle = 'rgba(150,150,140,.9)'; g.lineWidth = 1.5;
    for (let k = -64; k < 128; k += 10) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
  }, [1, 1]);
  const matReja = new THREE.MeshLambertMaterial({ map: malla, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  const h = interior / 2 + 0.6;
  const tramos = [
    [e.x, e.z - h, interior + 1.2, 0], [e.x, e.z + h, interior + 1.2, 0], [e.x - h, e.z, interior + 1.2, Math.PI / 2],
    [e.x + h, e.z - h / 2 - 1.5, h - 3, Math.PI / 2], [e.x + h, e.z + h / 2 + 1.5, h - 3, Math.PI / 2],   // el hueco, al medio del lado este
  ];
  for (const [x, z, l, rot] of tramos) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(l, 2.0), matReja); r.position.set(x, 1.15, z); r.rotation.y = rot; grupo.add(r);
    const vertical = rot !== 0;
    ciudad.colisiones.push(vertical ? { x0: x - 0.08, x1: x + 0.08, z0: z - l / 2, z1: z + l / 2 } : { x0: x - l / 2, x1: x + l / 2, z0: z - 0.08, z1: z + 0.08 });
  }
  // un colchón manchado y neumáticos
  const colchon = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.9), ps1Material(new THREE.MeshLambertMaterial({ map: lienzo(64, 128, (g) => {
    g.fillStyle = '#b8ac90'; g.fillRect(0, 0, 64, 128); g.fillStyle = 'rgba(90,60,20,.6)';
    for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(Math.random() * 64, Math.random() * 128, 6 + Math.random() * 12, 5 + Math.random() * 14, 0, 0, 7); g.fill(); }
  }) })));
  colchon.position.set(e.x - 3.5, 0.25, e.z + 3); colchon.rotation.y = 0.5; grupo.add(colchon);
  for (const [dx, dz] of [[3.6, 4.2], [4.1, 3.4], [-4.5, -3.8]]) {
    const n = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 6, 10), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    n.rotation.x = Math.PI / 2; n.position.set(e.x + dx, 0.27, e.z + dz); grupo.add(n);
  }
  // los columpios
  const columpio = new THREE.Group();
  const caños = [];
  for (const s of [-1.6, 1.6]) {
    for (const t of [-1, 1]) { const c = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6); c.rotateX(t * 0.32); c.translate(s, 1.25, t * 0.4); caños.push(c); }
  }
  const viga = new THREE.CylinderGeometry(0.05, 0.05, 3.3, 6); viga.rotateZ(Math.PI / 2); viga.translate(0, 2.5, 0); caños.push(viga);
  columpio.add(new THREE.Mesh(mergeGeometries(caños), oxido));
  const asientos = [-0.75, 0.75].map((x, k) => {
    const pivote = new THREE.Group(); pivote.position.set(x, 2.48, 0);
    const cadenas = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(-0.22, -1.9, 0), new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0.22, -1.9, 0)]),
      new THREE.LineBasicMaterial({ color: 0x6a6a64 }));
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.22), material('t_oxido', [1, 1], { color: 0x5a3a2a }));
    tabla.position.y = -1.9;
    pivote.add(cadenas, tabla); columpio.add(pivote);
    return { pivote, fase: k * 2.1, amp: k === 0 ? 0.55 : 0.25, angulo: 0 };
  });
  columpio.position.set(e.x + 0.5, 0.15, e.z - 1.5);
  grupo.add(columpio);
  // un zapato de niño junto al columpio
  const zapato = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.2), ps1Material(new THREE.MeshLambertMaterial({ color: 0x8a2a2a })));
  zapato.position.set(e.x + 1.4, 0.2, e.z - 0.6); zapato.rotation.y = 0.8; grupo.add(zapato);
  const columpios = { quietos: false, chirrido: 0 };
  cosasE.push({
    pos: { x: columpio.position.x, z: columpio.position.z }, radio: 2.6, etiqueta: 'tocar el columpio',
    accion: () => 'El asiento está tibio.\nAlguien se acaba de bajar.\nAl lado, un zapato chico, rojo.',
  });

  // ================= la feria cerrada (calle al oeste de la plaza central, entre z 8 y 14)
  const fz = centroCalle(3), fx0 = -28, fx1 = -14.5;
  ciudad.sitios.feria = { x0: fx0, x1: fx1, z0: fz - 3, z1: fz + 3 };
  const rayas = (a, b) => lienzo(64, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(k * 8, 0, 8, 64); } g.fillStyle = 'rgba(30,20,10,.35)'; g.fillRect(0, 50, 64, 14); });
  const toldos = [rayas('#7a2a22', '#c9bfa0'), rayas('#2a4a6a', '#c9bfa0'), rayas('#4a6a2a', '#b8ae90')];
  const madera = material('t_oxido', [1, 1], { color: 0x6a4a32 });
  const puestos = [];
  const PUESTOS = ['pescado', 'radios', 'carne', 'munecas', 'pescado', 'verduras'];
  for (let k = 0; k < 6; k++) {
    const lado = k % 2 ? 1 : -1;
    const x = fx0 + 1.5 + Math.floor(k / 2) * 4.6, z = fz + lado * 1.9;
    const p = new THREE.Group(); p.position.set(x, 0, z);
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.0), madera); mesa.position.y = 0.9;
    const patas = [];
    for (const [dx, dz] of [[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]]) { const g = new THREE.BoxGeometry(0.06, 0.9, 0.06); g.translate(dx, 0.45, dz); patas.push(g); }
    for (const dx of [-1.15, 1.15]) { const g = new THREE.BoxGeometry(0.05, 2.3, 0.05); g.translate(dx, 1.15, lado * 0.5); patas.push(g); }
    const toldo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), ps1Material(new THREE.MeshLambertMaterial({ map: toldos[k % 3], side: THREE.DoubleSide })));
    toldo.position.set(0, 2.15, 0); toldo.rotation.x = -Math.PI / 2 + lado * 0.35;
    p.add(mesa, new THREE.Mesh(mergeGeometries(patas), madera), toldo);
    const tipo = PUESTOS[k];
    if (tipo === 'pescado') for (let n = 0; n < 7; n++) {
      const pez = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.11), ps1Material(new THREE.MeshLambertMaterial({ color: 0x8a9294, emissive: 0x111414 })));
      pez.position.set(-0.9 + n * 0.3, 0.97, (Math.random() - 0.5) * 0.6); pez.rotation.y = (Math.random() - 0.5) * 0.6; p.add(pez);
    }
    if (tipo === 'radios') for (let n = 0; n < 6; n++) {
      const radio = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.12), ps1Material(new THREE.MeshLambertMaterial({ color: [0x3a2a22, 0x5a5a52, 0x2a2a3a][n % 3] })));
      radio.position.set(-0.85 + n * 0.34, 1.04, (n % 2) * 0.2 - 0.1); p.add(radio);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xff2a10 }));
      led.position.set(radio.position.x + 0.1, 1.08, radio.position.z + 0.07); p.add(led);
    }
    if (tipo === 'carne') for (let n = 0; n < 4; n++) {
      const trozo = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 0.18), ps1Material(new THREE.MeshLambertMaterial({ color: 0x7a1c14, emissive: 0x1a0402 })));
      trozo.position.set(-0.8 + n * 0.55, 1.55, lado * 0.45); p.add(trozo);
      puestos.push({ colgante: trozo, fase: n });
    }
    if (tipo === 'munecas') for (let n = 0; n < 8; n++) {
      const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), ps1Material(new THREE.MeshLambertMaterial({ color: 0xd8c0a8 })));
      cabeza.position.set(-0.9 + n * 0.26, 1.02, (n % 2) * 0.25 - 0.1); p.add(cabeza);
    }
    if (tipo === 'verduras') for (let n = 0; n < 10; n++) {
      const v = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 3), ps1Material(new THREE.MeshLambertMaterial({ color: 0x3a3a1a })));
      v.position.set(-1 + n * 0.22, 0.99, (Math.random() - 0.5) * 0.5); p.add(v);
    }
    grupo.add(p);
    ciudad.colisiones.push({ x0: x - 1.25, x1: x + 1.25, z0: z - 0.55, z1: z + 0.55 });
    puestos.push({ tipo, x, z });
  }
  // la vendedora sin cara, detrás del puesto de radios
  const pRadios = puestos.find((p) => p.tipo === 'radios');
  const texVende = textura('s_vieja_frente');
  const geoV = new THREE.PlaneGeometry(0.9, 1.55); geoV.translate(0, 0.78, 0);
  const vendedora = new THREE.Mesh(geoV, ps1Material(new THREE.MeshLambertMaterial({ map: texVende, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: texVende, emissiveIntensity: 0.25 })));
  vendedora.position.set(pRadios.x, 0.15, pRadios.z + 1.0);
  grupo.add(vendedora);
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.6), new THREE.MeshBasicMaterial({ map: lienzo(256, 52, (g, w, h) => {
    g.fillStyle = '#c9bfa0'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a1510'; g.font = 'bold 20px "Courier New", monospace'; g.textAlign = 'center';
    g.fillText('FERIA LIBRE · SÁBADO 03:17', w / 2, 33);
  }) }));
  cartel.position.set(fx1 + 0.3, 2.7, fz); cartel.rotation.y = Math.PI / 2; grupo.add(cartel);
  // moscas sobre el pescado
  const NM = 30;
  const moscas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.012, 0.03), new THREE.MeshBasicMaterial({ color: 0x080808 }), NM);
  moscas.frustumCulled = false; grupo.add(moscas);
  const pescados = puestos.filter((p) => p.tipo === 'pescado');
  const radiosRegalo = { pilas: true };
  cosasE.push(
    { pos: { x: pescados[0].x, z: pescados[0].z }, radio: 2.2, etiqueta: 'mirar el pescado', accion: () => 'Los pescados tienen los ojos abiertos.\nCuando te mueves, te siguen.' },
    { pos: { x: pRadios.x, z: pRadios.z }, radio: 2.2, etiqueta: 'mirar las radios', accion: () => {
      if (radiosRegalo.pilas && ctx.inventario) { radiosRegalo.pilas = false; return `Seis radios, todas en 31.7. Una dice tu nombre.\nDebajo de la mesa hay pilas.\n${ctx.inventario.dar('pilas')}`; }
      return 'Seis radios, todas en 31.7.\nUna dice tu nombre. Las otras se ríen.';
    } },
    { pos: { x: vendedora.position.x, z: vendedora.position.z }, radio: 2.0, etiqueta: 'hablarle a la vendedora', accion: () => '«¿Qué va a llevar, joven? Todo está pagado.\nUsted ya pagó. Hace años».' },
    { pos: { x: puestos.find((p) => p.tipo === 'munecas').x, z: puestos.find((p) => p.tipo === 'munecas').z }, radio: 2.2, etiqueta: 'mirar las cabezas', accion: () => 'Cabezas de muñeca. Todas con tu peinado de niño.' },
  );

  // ================= la capilla (manzana al norte del canal, camino al portón)
  const cp = ciudad.sitios.capilla;
  const CW = 8, CL = 12, CH = 5.5, E = 0.3;
  const muroC = material('t_concreto', [3, 2], { color: 0xb0a898 });
  const adentroC = material('t_concreto', [3, 2], { color: 0x8a8070 });
  const zS = cp.z + CL / 2, zN = cp.z - CL / 2, xW = cp.x - CW / 2, xE = cp.x + CW / 2;
  const murosC = [
    [cp.x, zN, CW + E, E], [xW, cp.z, E, CL], [xE, cp.z, E, CL],
    [cp.x - (CW / 4 + 0.45), zS, CW / 2 - 0.9, E], [cp.x + (CW / 4 + 0.45), zS, CW / 2 - 0.9, E],   // la puerta, al sur
  ];
  for (const [x, z, w, d] of murosC) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, CH, d), [muroC, muroC, muroC, muroC, d < w ? (z === zS ? muroC : adentroC) : muroC, d < w ? (z === zS ? adentroC : muroC) : muroC]);
    m.position.set(x, CH / 2, z); grupo.add(m);
    ciudad.colisiones.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  }
  const dintelC = new THREE.Mesh(new THREE.BoxGeometry(1.8, CH - 2.6, E), muroC); dintelC.position.set(cp.x, 2.6 + (CH - 2.6) / 2, zS); grupo.add(dintelC);
  // techo a dos aguas (por dentro se ve oscuro) y una cruz torcida arriba de la puerta
  for (const s of [-1, 1]) {
    const agua = new THREE.Mesh(new THREE.BoxGeometry(CW / 2 + 0.8, 0.2, CL + 0.8), material('t_oxido', [2, 3], { color: 0x5a4a40 }));
    agua.position.set(cp.x + s * (CW / 4), CH + 0.9, cp.z); agua.rotation.z = -s * 0.42; grupo.add(agua);
  }
  const frontis = new THREE.Mesh(new THREE.ConeGeometry(CW / 2 + 0.2, 1.9, 3, 1), muroC);
  frontis.rotation.y = Math.PI / 2; frontis.scale.z = 0.06; frontis.position.set(cp.x, CH + 0.9, zS + 0.05); grupo.add(frontis);
  const cruz = new THREE.Group();
  const palo = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4, 0.14), oxido), brazo = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.14), oxido);
  brazo.position.y = 0.3; cruz.add(palo, brazo); cruz.position.set(cp.x, CH + 2.4, zS); cruz.rotation.z = 0.35; grupo.add(cruz);
  // piso, bancas, altar, velas, vitrales y el confesionario
  const pisoC = new THREE.Mesh(new THREE.PlaneGeometry(CW, CL), material('t_oxido', [3, 4], { color: 0x5a4030 }));
  pisoC.rotation.x = -Math.PI / 2; pisoC.position.set(cp.x, 0.16, cp.z); grupo.add(pisoC);
  const cielo = new THREE.Mesh(new THREE.PlaneGeometry(CW, CL), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
  cielo.rotation.x = Math.PI / 2; cielo.position.set(cp.x, CH - 0.05, cp.z); grupo.add(cielo);
  const bancas = [];
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
    const z = cp.z + 3.2 - k * 1.7, x = cp.x + s * 1.9;
    const a = new THREE.BoxGeometry(2.4, 0.08, 0.5); a.translate(x, 0.55, z);
    const b = new THREE.BoxGeometry(2.4, 0.6, 0.06); b.translate(x, 0.85, z + 0.25);
    bancas.push(a, b);
    ciudad.colisiones.push({ x0: x - 1.2, x1: x + 1.2, z0: z - 0.3, z1: z + 0.3 });
  }
  grupo.add(new THREE.Mesh(mergeGeometries(bancas), madera));
  const altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.9), material('t_concreto', [1, 1], { color: 0xd8d0c0 }));
  altar.position.set(cp.x, 0.65, zN + 1.4); grupo.add(altar);
  ciudad.colisiones.push({ x0: cp.x - 1.2, x1: cp.x + 1.2, z0: zN + 0.95, z1: zN + 1.85 });
  const velas = [];
  for (let k = 0; k < 7; k++) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 5), new THREE.MeshLambertMaterial({ color: 0xe8e0c8 }));
    v.position.set(cp.x - 0.9 + k * 0.3, 1.26, zN + 1.3);
    const llama = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0xffb040, fog: false }));
    llama.position.set(v.position.x, 1.42, v.position.z); llama.visible = k % 3 === 0;
    grupo.add(v, llama); velas.push(llama);
  }
  const luzVelas = new THREE.PointLight(0xffa040, 2.5, 11, 1.3); luzVelas.position.set(cp.x, 2.2, zN + 2); grupo.add(luzVelas);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const vitral = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.8), new THREE.MeshBasicMaterial({ color: [0x6a1a1a, 0x1a3a6a, 0x4a5a1a][k], transparent: true, opacity: 0.8 }));
    vitral.position.set(s > 0 ? xE - E / 2 - 0.01 : xW + E / 2 + 0.01, 3.2, cp.z - 3.5 + k * 3.5); vitral.rotation.y = -s * Math.PI / 2; grupo.add(vitral);
  }
  // la figura del santo, con la cara tapada por un paño
  const santo = new THREE.Mesh(geoV.clone(), ps1Material(new THREE.MeshLambertMaterial({ map: textura('s_vieja_espalda'), alphaTest: 0.5, side: THREE.DoubleSide, color: 0xb0a8a0 })));
  santo.position.set(cp.x + 2.6, 1.1, zN + 0.6); grupo.add(santo);
  const confesionario = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 1.2), madera);
  confesionario.position.set(xW + 0.9, 1.3, zN + 1.0); grupo.add(confesionario);
  const cortina = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshLambertMaterial({ color: 0x4a0e0a, side: THREE.DoubleSide }));
  cortina.position.set(xW + 0.9, 1.2, zN + 1.61); grupo.add(cortina);
  ciudad.colisiones.push({ x0: xW + 0.25, x1: xW + 1.55, z0: zN + 0.4, z1: zN + 1.6 });
  const capillaEstado = { confeso: false, velas: false };
  cosasE.push(
    { pos: { x: xW + 0.9, z: zN + 2.2 }, radio: 1.8, prioridad: 1, etiqueta: 'confesarte', accion: () => {
      if (ctx.audio) ctx.audio.susurro(2.4);
      if (!capillaEstado.confeso && ctx.siniestro) {
        capillaEstado.confeso = true;
        const s = ctx.siniestro.sombra; s.activa = false; s.espera = 90; s.m.position.set(0, -50, 0);
        return 'Detrás de la reja, una radio en 31.7:\n«Ya te confesaste ayer. Y antier. Siempre a las 03:17.\nLo que buscas está detrás del portón. No es una salida».\n(La sombra te deja en paz un rato)';
      }
      return 'La radio del confesionario sólo repite:\n«siempre a las 03:17».';
    } },
    { pos: { x: cp.x, z: zN + 2.4 }, radio: 1.9, etiqueta: () => (capillaEstado.velas ? 'mirar las velas' : 'prender las velas'), accion: () => {
      if (capillaEstado.velas) return 'Cada vela tiene tu nombre escrito.\nUna ya se apagó.';
      capillaEstado.velas = true; for (const v of velas) v.visible = true;
      return 'Prendes las velas una por una.\nAl fondo, el santo se mueve un poco. Tiene la cara tapada.';
    } },
  );

  // ================= los nichos del muro: la ciudad no tiene salida, y el muro del oeste está lleno de tumbas
  const NX = -58, NZ0 = -28, NZ1 = 30, ANCHO_N = 0.95, FILAS = 3;
  ciudad.sitios.nichos = { x: NX, z0: NZ0, z1: NZ1 };
  const columnasN = Math.floor((NZ1 - NZ0) / ANCHO_N);
  const totalN = columnasN * FILAS;
  const marcos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.82, ANCHO_N - 0.06), material('t_concreto', [1, 1], { color: 0xa09a8a }), totalN);
  const lapidas = new THREE.InstancedMesh(new THREE.PlaneGeometry(ANCHO_N - 0.22, 0.6), ps1Material(new THREE.MeshLambertMaterial({ map: lienzo(64, 40, (g) => {
    g.fillStyle = '#d8d2c2'; g.fillRect(0, 0, 64, 40); g.fillStyle = 'rgba(40,34,26,.55)';
    for (let k = 0; k < 3; k++) g.fillRect(10, 9 + k * 9, 30 + Math.random() * 14, 3);
    g.fillStyle = 'rgba(90,70,40,.35)'; g.fillRect(0, 30, 64, 10);
  }) })), totalN);
  const flores = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.2, 0.22), new THREE.MeshLambertMaterial({ color: 0xffffff }), totalN);
  const dummyN = new THREE.Object3D();
  const colores = [0xb02a2a, 0xd8b030, 0x8a3ab0, 0xe8e8e8, 0x2a8a4a];
  let nf = 0, idxN = 0;
  for (let c = 0; c < columnasN; c++) for (let f = 0; f < FILAS; f++) {
    const z = NZ0 + ANCHO_N / 2 + c * ANCHO_N, y = 0.55 + f * 0.86;
    dummyN.position.set(NX + 0.31, y, z); dummyN.rotation.set(0, 0, 0); dummyN.updateMatrix(); marcos.setMatrixAt(idxN, dummyN.matrix);
    dummyN.position.set(NX + 0.63, y, z); dummyN.rotation.set(0, Math.PI / 2, 0); dummyN.updateMatrix(); lapidas.setMatrixAt(idxN, dummyN.matrix);
    idxN++;
    if (Math.random() < 0.35) {
      dummyN.position.set(NX + 0.75, y - 0.3, z + (Math.random() - 0.5) * 0.4); dummyN.rotation.set(0, Math.random(), 0); dummyN.updateMatrix();
      flores.setMatrixAt(nf, dummyN.matrix); flores.setColorAt(nf, new THREE.Color(colores[nf % colores.length])); nf++;
    }
  }
  flores.count = nf;
  grupo.add(marcos, lapidas, flores);
  ciudad.colisiones.push({ x0: NX - 0.5, x1: NX + 0.85, z0: NZ0, z1: NZ1 });
  // velas encendidas en algunos nichos
  const velasN = [];
  for (let k = 0; k < 9; k++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0xffb040, fog: false }));
    v.position.set(NX + 0.78, 0.35 + (k % 3) * 0.86, NZ0 + 3 + k * 6.1); grupo.add(v); velasN.push(v);
  }
  // el tuyo: lápida legible, flores frescas, una vela
  const tuyoZ = 21.5, tuyoY = 1.41;
  const lapidaTuya = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_N - 0.2, 0.62), new THREE.MeshBasicMaterial({ map: lienzo(128, 84, (g, w, h) => {
    g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1612'; g.textAlign = 'center';
    g.font = 'bold 12px "Courier New", monospace'; g.fillText('Q.E.P.D.', w / 2, 16);
    g.font = '10px "Courier New", monospace'; g.fillText('EL DEL ABRIGO VERDE', w / 2, 34);
    g.fillText('nació 03:17 · murió 03:17', w / 2, 50);
    g.fillStyle = '#7a1510'; g.font = 'italic 9px "Courier New", monospace'; g.fillText('«te esperamos a cenar»', w / 2, 70);
  }) }));
  lapidaTuya.position.set(NX + 0.64, tuyoY, tuyoZ); lapidaTuya.rotation.y = Math.PI / 2; grupo.add(lapidaTuya);
  for (let k = 0; k < 5; k++) {
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), new THREE.MeshLambertMaterial({ color: 0xc01810, emissive: 0x300402 }));
    fl.position.set(NX + 0.78, tuyoY - 0.28, tuyoZ - 0.2 + k * 0.1); fl.rotation.z = (k - 2) * 0.15; grupo.add(fl);
  }
  cosasE.push({
    pos: { x: NX + 1.9, z: tuyoZ }, radio: 2.2, etiqueta: 'leer la lápida',
    accion: () => 'Q.E.P.D. «El del abrigo verde».\nNació a las 03:17. Murió a las 03:17.\nLas flores son de hoy. Todavía están mojadas.',
  });
  cosasE.push({
    pos: { x: NX + 1.9, z: 2 }, radio: 2.2, etiqueta: 'mirar los nichos',
    accion: () => 'Cientos de nichos en el muro que cerca la ciudad.\nTodos con la misma hora: 03:17.',
  });

  const tmp = new THREE.Vector3(), tmpObj = new THREE.Object3D(), radiosRuido = { t: 0 };
  function actualizar(dt, t, jugador, camara, audio) {
    const pj = jugador.pos;
    // pasaje
    ampolleta.visible = Math.sin(t * 5.1) > -0.8 || Math.random() < 0.3;
    luz.intensity = ampolleta.visible ? 3.5 : 0.2;
    for (const r of ropa) r.m.rotation.y = Math.sin(t * 0.9 + r.fase) * 0.25;
    const enPasaje = pj.x > pasaje.x0 - 0.5 && pj.x < pasaje.x1 + 0.5 && pj.z > pz0 && pj.z < pz1;
    if (caraEstado.escondida > 0) caraEstado.escondida -= dt;
    const mirada = loMira(camara, tmp.set(cara.position.x, 3.0, cara.position.z), 14, 0.93);
    if (mirada && caraEstado.asoma > 0.4) { caraEstado.escondida = 6; if (audio) audio.chirrido(); }
    const objetivo = enPasaje && caraEstado.escondida <= 0 ? 1 : 0;
    caraEstado.asoma += (objetivo - caraEstado.asoma) * Math.min(1, dt * (objetivo ? 0.8 : 6));
    cara.position.y = 1.55 + caraEstado.asoma * 1.35;   // sube por detrás del muro
    cara.rotation.y = Math.atan2(camara.position.x - cara.position.x, camara.position.z - cara.position.z);
    // columpios: se mecen solos; si te acercas (o los miras de cerca), se detienen de golpe
    const dC = Math.hypot(pj.x - columpio.position.x, pj.z - columpio.position.z);
    const quietos = dC < 6.5;
    if (quietos && !columpios.quietos && audio) audio.golpe(0.25);
    columpios.quietos = quietos;
    for (const a of asientos) {
      a.angulo = quietos ? a.angulo * Math.max(0, 1 - dt * 25) : Math.sin(t * 1.9 + a.fase) * a.amp;
      a.pivote.rotation.x = a.angulo;
    }
    columpios.chirrido -= dt;
    if (!quietos && dC < 18 && columpios.chirrido <= 0 && audio) { audio.chirrido(); columpios.chirrido = 1.65; }
    // feria: la carne se mece, las moscas zumban sobre el pescado, las radios chisporrotean
    for (const p of puestos) if (p.colgante) p.colgante.rotation.z = Math.sin(t * 1.3 + p.fase) * 0.12;
    const dummy = tmpObj;
    for (let i = 0; i < NM; i++) {
      const p = pescados[i % pescados.length], k = t * (3 + (i % 4)) + i * 7.1;
      dummy.position.set(p.x + Math.sin(k * 1.7) * 0.6, 1.15 + Math.sin(k * 2.3) * 0.25, p.z + Math.cos(k * 1.3) * 0.35);
      dummy.rotation.set(0, k, 0); dummy.updateMatrix(); moscas.setMatrixAt(i, dummy.matrix);
    }
    moscas.instanceMatrix.needsUpdate = true;
    const dR = Math.hypot(pj.x - pRadios.x, pj.z - pRadios.z);
    radiosRuido.t -= dt;
    if (audio && dR < 14 && radiosRuido.t <= 0) { audio.radioLejana(tmp.set(pRadios.x, 1, pRadios.z), dR); radiosRuido.t = 0.35 + Math.random() * 0.4; }
    vendedora.rotation.y = Math.atan2(camara.position.x - vendedora.position.x, camara.position.z - vendedora.position.z);
    for (const v of velasN) v.visible = Math.random() > 0.08;
    // capilla: las velas tiemblan; el santo, si las prendiste, se vuelve hacia ti
    luzVelas.intensity = (capillaEstado.velas ? 4.5 : 2.2) * (0.85 + Math.random() * 0.25);
    if (capillaEstado.velas) santo.rotation.y += (Math.atan2(pj.x - santo.position.x, pj.z - santo.position.z) - santo.rotation.y) * Math.min(1, dt * 0.3);
  }

  function registrar(interaccion, contexto = {}) {
    Object.assign(ctx, contexto);
    for (const c of cosasE) interaccion.agregar({ zona: 'ciudad', ...c });
  }

  // lo que no se mueve, junto (una malla por material); lo que se mueve o parpadea queda aparte
  juntarQuietas(grupo, [cara, columpio, vendedora, santo, ampolleta, ...ropa.map((r) => r.m), ...puestos.map((p) => p.colgante).filter(Boolean), ...velasN]);

  return { actualizar, registrar, depurar: { pasaje, cara, columpio, asientos, vendedora, puestos, capilla: { x: cp.x, z: cp.z, zS, zN, xW, xE } } };
}
