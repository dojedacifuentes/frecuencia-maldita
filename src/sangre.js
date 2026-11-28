// Paredes que sangran (28-nov): un plano pegado al muro con chorreras que bajan despacio desde una herida irregular.
// Todas comparten un solo material (el reloj es uno): cada plano lleva en sus vértices cuándo empezó a sangrar, su
// semilla y cuántas chorreras caben. Las de la ciudad ya venían sangrando; las de la misión empiezan cuando pasa algo.
import * as THREE from 'three';

const vertice = /* glsl */`
  attribute float aInicio; attribute float aSemilla; attribute float aCols; attribute float aAspecto;
  uniform float uTiempo;
  varying vec2 vUv; varying float vEdad; varying float vSem; varying float vCols; varying float vAsp;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv; vEdad = uTiempo - aInicio; vSem = aSemilla; vCols = aCols; vAsp = aAspecto;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const fragmento = /* glsl */`
  varying vec2 vUv; varying float vEdad; varying float vSem; varying float vCols; varying float vAsp;
  #include <fog_pars_fragment>
  float h(float n) { return fract(sin(n * 91.345 + vSem * 13.17) * 47453.21); }
  void main() {
    if (vEdad < 0.0) discard;
    float c = floor(vUv.x * vCols), fx = fract(vUv.x * vCols);
    float r1 = h(c), r2 = h(c + 31.0), r3 = h(c + 57.0);
    // la herida de arriba: borde irregular que se abre en el primer segundo
    float borde = 0.8 + 0.12 * h(floor(vUv.x * vCols * 2.3) + 7.0);
    float abre = clamp(vEdad * 0.8, 0.0, 1.0);
    float herida = step(borde + (1.0 - abre) * 0.2, vUv.y) * step(vUv.y, 0.97);
    // chorreras: no todas las columnas; cada una con su ancho, su largo y su velocidad
    float activa = step(0.3, r3);
    float ancho = 0.16 + 0.3 * r2;
    float enCol = step(abs(fx - 0.5), ancho * 0.5);
    float maximo = (0.25 + r2 * 0.7) * borde;
    float vel = (0.03 + r1 * 0.06);
    float ciclo = vEdad * vel / maximo + r1 * step(60.0, vEdad);
    float largo = fract(ciclo) * maximo;
    float punta = borde - largo;
    float chorro = activa * enCol * step(punta, vUv.y) * step(vUv.y, borde);
    // la gota de la punta, más gruesa y redonda
    float gota = activa * step(length(vec2(fx - 0.5, (vUv.y - punta) * vAsp)), ancho * 0.85);
    // lo que ya chorreó deja un rastro oscuro
    float rastro = activa * enCol * step(borde - maximo, vUv.y) * step(vUv.y, borde) * step(1.0, ciclo) * 0.55;
    float a = max(max(herida, chorro), max(gota, rastro));
    if (a < 0.05) discard;
    vec3 col = mix(vec3(0.055, 0.0, 0.0), vec3(0.15, 0.004, 0.003), h(c + 3.0));
    col *= mix(0.6, 1.0, max(herida, max(chorro, gota)));
    // brillo húmedo en el centro de cada chorrera
    col += vec3(0.09, 0.012, 0.01) * (1.0 - smoothstep(0.0, ancho * 0.35, abs(fx - 0.5))) * max(chorro, gota);
    gl_FragColor = vec4(col, a < 0.9 ? 0.6 : 0.96);
    #include <fog_fragment>
  }`;

export function crearSangre(escena) {
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTiempo: { value: 0 } }]),
    vertexShader: vertice, fragmentShader: fragmento, fog: true, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide,
  });
  const lista = {};
  let semilla = 1;
  // un plano de w × h (metros) centrado en (x, y, z), mirando hacia ry; inicio: cuándo empezó (Infinity = todavía no)
  function agregar(nombre, x, y, z, ry, w, h, inicio = Infinity, padre = escena) {
    const g = new THREE.PlaneGeometry(w, h);
    const n = g.attributes.position.count, cols = Math.max(3, Math.round(w * 5)), s = semilla++ * 1.618;
    const lleno = (v) => new THREE.BufferAttribute(new Float32Array(n).fill(v), 1);
    g.setAttribute('aInicio', lleno(inicio === Infinity ? 1e9 : inicio));
    g.setAttribute('aSemilla', lleno(s));
    g.setAttribute('aCols', lleno(cols));
    g.setAttribute('aAspecto', lleno((h / w) * cols));
    const m = new THREE.Mesh(g, material);
    m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 2;
    padre.add(m);
    const s2 = { m, activa: inicio !== Infinity };
    s2.activar = (t) => { if (s2.activa) return; s2.activa = true; g.attributes.aInicio.array.fill(t); g.attributes.aInicio.needsUpdate = true; };
    s2.apagar = () => { s2.activa = false; g.attributes.aInicio.array.fill(1e9); g.attributes.aInicio.needsUpdate = true; };
    if (nombre) lista[nombre] = s2;
    return s2;
  }
  function actualizar(t) { material.uniforms.uTiempo.value = t; }
  return { agregar, actualizar, lista, material, get t() { return material.uniforms.uTiempo.value; } };
}
