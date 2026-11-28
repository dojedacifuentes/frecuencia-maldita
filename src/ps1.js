// Render a 16:9. La geometría, las texturas y la luz construyen la estética del barrio.
import * as THREE from 'three';

const ANCHO_MAX = 1280;

export function crearRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const objetivo = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true,
  });
  const post = new THREE.ShaderMaterial({
    uniforms: {
      tEscena: { value: objetivo.texture }, uTiempo: { value: 0 }, uCroma: { value: 0 },
      uDestello: { value: 0 }, uRasgado: { value: 0 }, uRojo: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tEscena; uniform float uTiempo, uCroma, uDestello, uRasgado, uRojo;
      uniform vec2 uRes; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTiempo * 7.13) * 43758.5453); }

      void main(){
        vec2 uv = vUv; vec2 px = uv * uRes;
        float fila = floor(px.y / 3.0);
        if (uRasgado > 0.0 && rnd(vec2(fila, floor(uTiempo * 12.0))) < uRasgado) {
          uv.x += (rnd(vec2(fila, 3.0)) - 0.5) * 0.06;
        }
        float k = uCroma / uRes.x;
        vec3 c = vec3(texture2D(tEscena, uv + vec2(k, 0.)).r, texture2D(tEscena, uv).g, texture2D(tEscena, uv - vec2(k, 0.)).b);
        c = pow(max(c, 0.0), vec3(1.0 / 2.2));   // la escena viene en lineal: pasar a sRGB para la pantalla
        // Viñeta suave, sin grano ni tramado permanente.
        vec2 d = vUv - 0.5; c *= clamp(1.12 - dot(d, d) * 1.5, 0.45, 1.0);

        c = mix(c, vec3(1.0), uDestello);
        float g = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(c, vec3(g * 1.5, g * 0.25, g * 0.22), uRojo);


        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
    depthWrite: false, depthTest: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
  const escenaPost = new THREE.Scene();
  escenaPost.add(quad);
  const camPost = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function ajustarResolucion() {
    const ancho = Math.min(ANCHO_MAX, Math.max(16, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2))));
    const alto = Math.round(ancho * 9 / 16);
    renderer.setSize(ancho, alto, false);
    objetivo.setSize(ancho, alto);
    post.uniforms.uRes.value.set(ancho, alto);
  }
  ajustarResolucion();
  new ResizeObserver(ajustarResolucion).observe(canvas);

  function dibujar(escena, camara, t) {
    post.uniforms.uTiempo.value = t;
    renderer.setRenderTarget(objetivo);
    renderer.render(escena, camara);
    renderer.setRenderTarget(null);
    renderer.render(escenaPost, camPost);
  }
  return { renderer, dibujar, post: post.uniforms };
}

// Se conserva la interfaz de los materiales del juego, ahora con vértices estables.
export function ps1Material(mat) { return mat; }

const cargador = new THREE.TextureLoader();
const cache = new Map();
export function textura(nombre, repetir = [1, 1]) {
  const clave = nombre + repetir.join('x');
  if (cache.has(clave)) return cache.get(clave);
  const t = cargador.load(`/assets/${nombre}.png`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repetir[0], repetir[1]);
  cache.set(clave, t);
  return t;
}

export function material(nombre, repetir, extra = {}) {
  return ps1Material(new THREE.MeshLambertMaterial({ map: textura(nombre, repetir), ...extra }));
}

export function videoTextura(nombre) {
  const v = document.createElement('video');
  v.src = `/assets/${nombre}.mp4`;
  v.loop = true; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous';
  v.preload = 'auto';
  const t = new THREE.VideoTexture(v);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return { video: v, textura: t };
}
