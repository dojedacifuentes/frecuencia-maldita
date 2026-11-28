// Capturas del juego con Chrome invisible y en silencio (sirve aunque el panel del navegador esté oculto).
// Requiere el servidor de desarrollo en http://127.0.0.1:5181.  Uso:  node herramientas/capturas.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'capturas');
mkdirSync(SALIDA, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PUERTO = 9333;
const perfil = mkdtempSync(join(tmpdir(), 'frecuencia-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`,
  '--window-size=1280,720', '--mute-audio', '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar() {
  for (let k = 0; k < 40; k++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
      const pag = lista.find((t) => t.type === 'page');
      if (pag) return pag.webSocketDebuggerUrl;
    } catch { /* todavía arrancando */ }
    await espera(250);
  }
  throw new Error('Chrome no respondió');
}

const ws = new WebSocket(await conectar());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pendientes = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pendientes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};
async function foto(nombre) {
  await espera(250);
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SALIDA, `${nombre}.png`), Buffer.from(r.result.data, 'base64'));
  console.log('foto', nombre);
}

await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: 'http://127.0.0.1:5181/?mudo=1' });
// espera a que el juego esté listo (el modelo 3D y las texturas tardan según la máquina)
for (let k = 0; k < 120; k++) {
  await espera(500);
  const listo = await cdp('Runtime.evaluate', { expression: '!!(window.__juego && document.getElementById("empezar"))', returnByValue: true });
  if (listo.result?.result?.value) break;
  if (k === 119) { console.log('el juego no cargó en 60 s'); }
}
await espera(800);
await foto('00_portada');
await js(`document.getElementById('empezar').click(); await new Promise(r=>setTimeout(r,600));
  window.__ir=(x,z,dx,dz)=>{const J=window.__juego; J.jugador.estado.pos.set(x,0.15,z); const y=Math.atan2(dx,dz); J.jugador.estado.yawCam=y; J.jugador.estado.rumbo=y;};
  window.__juego.avanzar(2.2);`);
// el tutorial: el primer paso y cómo avanza al caminar
await foto('00b_tutorial_paso1');
await js(`const J=window.__juego; dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowDown'})); J.avanzar(1.6); dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowDown'})); J.avanzar(1.0);`);
await foto('00c_tutorial_paso2');
await js(`window.__juego.tutorial.terminar();`);
const fps = await js(`let n=0; const f=()=>{n++; requestAnimationFrame(f)}; requestAnimationFrame(f); await new Promise(r=>setTimeout(r,2000)); return n/2;`);
console.log('cuadros por segundo (Chrome invisible, sin tarjeta gráfica):', fps);
console.log('modelo 3D:', await js(`return window.__juego.jugador.estado.es3d`));
// los lugares nuevos del mapa (canal, puente…):  node herramientas/capturas.mjs mapa
if (process.argv[2] === 'mapa') {
  await js(`const J=window.__juego; J.tutorial.terminar(); J.juego.afuera=true; J.inventario.lleva.radio=true;
    window.__ver=(x,z,tx,tz,pitch=0.18,seg=0.4)=>{const e=J.jugador.estado; e.pos.set(x,0.15,z); const y=Math.atan2(tx-x,tz-z); e.rumbo=y; e.yawCam=y; e.pitchCam=pitch; J.avanzar(seg);};
    J.siniestro.sombra.espera=999; J.telefonos.depurar.cabinas.forEach(c=>c.estado='contestado');`);
  const tomas = (process.argv[3] || 'canal').split(',').flatMap((grupo) => ({
    canal: [
      ['m01_canal_orilla', `__ver(-2, -27.5, -2, -40, 0.25, 0.5);`],
      ['m02_canal_desde_puente', `const J=window.__juego; const c=J.ciudad.sitios.canal; __ver(c.puente.x+0.6, (c.z0+c.z1)/2, c.puente.x-20, (c.z0+c.z1)/2+1, 0.45, 3);`],
      ['m04_ahogado', `const J=window.__juego; J.avanzar(1); const a=J.canal.depurar.ahogado; J.juego.estado='pausa'; const p=a.raiz.position; J.tutorial.terminar(); const c=J.ciudad.sitios.canal; const cam=()=>{J.camara.position.set(c.puente.x0+0.3, 1.7, p.z-0.6); J.camara.lookAt(p.x, p.y+0.2, p.z);}; cam(); J.avanzar(0.05); cam();`],
      ['m03_llegando_al_puente', `window.__juego.juego.estado='jugando'; ` + `const J=window.__juego; const c=J.ciudad.sitios.canal; __ver(c.puente.x, -21, c.puente.x, -40, 0.1, 0.5);`],
    ],
    pasaje: [
      ['m05_pasaje_entrada', `const J=window.__juego; const p=J.ciudad.sitios.pasaje; __ver((p.x0+p.x1)/2, p.z1+5, (p.x0+p.x1)/2, p.z0, 0.15, 0.4);`],
      ['m06_pasaje_adentro', `const J=window.__juego; const p=J.ciudad.sitios.pasaje; __ver((p.x0+p.x1)/2, p.z0+12.5, (p.x0+p.x1)/2, p.z0, 0.1, 2.5);`],
      ['m07_eriazo', `const J=window.__juego; const e=J.ciudad.sitios.eriazo; __ver(e.x+11, e.z+3, e.x, e.z-1, 0.2, 0.6);`],
      ['m08_columpios', `const J=window.__juego; const c=J.lugares.depurar.columpio.position; J.juego.estado='pausa'; J.jugador.estado.pos.set(c.x+14,0.15,c.z); J.avanzar(0.6); const cam=()=>{J.camara.position.set(c.x+7.5,1.6,c.z+2.5); J.camara.lookAt(c.x,1.0,c.z);}; cam(); J.avanzar(0.05); cam();`],
    ],
    feria: [
      ['m10_feria', `const J=window.__juego; const f=J.ciudad.sitios.feria; J.juego.estado='pausa'; J.jugador.estado.pos.set(f.x1+8,0.15,(f.z0+f.z1)/2); J.avanzar(0.3); const cam=()=>{J.camara.position.set(f.x1+1.5, 2.1, (f.z0+f.z1)/2+0.6); J.camara.lookAt(f.x0+3, 1.0, (f.z0+f.z1)/2);}; cam(); J.avanzar(0.05); cam();`],
      ['m11_capilla_afuera', `const J=window.__juego; const c=J.lugares.depurar.capilla; const cam=()=>{J.camara.position.set(c.x+0.3, 1.8, c.zS+1.75); J.camara.lookAt(c.x, 3.4, c.zN);}; cam(); J.avanzar(0.05); cam();`],
      ['m12_capilla_adentro', `const J=window.__juego; const c=J.lugares.depurar.capilla; const cam=()=>{J.camara.position.set(c.x+1.2, 1.9, c.zS-1.0); J.camara.lookAt(c.x-0.5, 1.2, c.zN);}; cam(); J.avanzar(0.05); cam();`],
    ],
    metro: [
      ['m13_boca_metro', `const J=window.__juego; J.juego.estado='jugando'; const b=J.ciudad.sitios.metro.sur; __ver(b.pos.x+0.5, b.pos.z+3.5, b.x, b.z, 0.12, 0.5);`],
      ['m14_anden', `const J=window.__juego; const b=J.ciudad.sitios.metro.sur; __ver(b.pos.x, b.pos.z, b.x, b.z, 0.1, 0.2); J.irA('metro','sur'); J.avanzar(1.6); J.tutorial.terminar(); J.avanzar(0.6);`],
      ['m15_tren_detenido', `const J=window.__juego; const M=J.metro.depurar; __ver(J.metro.llegadas.metro.sur.x+9, 1.2, J.metro.llegadas.metro.sur.x+3, -3, 0.12, 0.5);`],
      ['m16_viene_el_tren', `const J=window.__juego; const n=J.metro.depurar.nichos[0]; __ver(n-1.5, -4, n+10, -4, 0.15, 0.3); const e=J.jugador.estado; e.pos.set(n, 0.15, -1.2); e.rumbo=e.yawCam=-Math.PI/2; J.avanzar(0.3);`],
      ['m17_en_el_nicho', `const J=window.__juego; const n=J.metro.depurar.nichos[0]; J.avanzar(1.2);`],
      ['m18_plano_metro', `const J=window.__juego; J.abrirPlano(true);`],
      ['m19_salida_norte', `const J=window.__juego; J.abrirPlano(false); J.juego.estado='jugando'; const s=J.metro.depurar.salida; __ver(s.x, s.z, s.x, s.z-3, 0.1, 0.2); J.irA('ciudad','norte'); J.avanzar(1.6); J.avanzar(0.4);`],
    ],
    interiores: [
      ['i01_puerta_depto', `const J=window.__juego; J.juego.estado='jugando'; const l=J.interiores.llegadas.ciudad.depto; __ver(l.x+Math.sin(l.rumbo)*4, l.z+Math.cos(l.rumbo)*4, l.x-Math.sin(l.rumbo), l.z-Math.cos(l.rumbo), 0.1, 0.4);`],
      ['i02_depto', `const J=window.__juego; const l=J.interiores.llegadas.ciudad.depto; __ver(l.x, l.z, l.x-Math.sin(l.rumbo), l.z-Math.cos(l.rumbo), 0.1, 0.2); J.irA('depto','entrada'); J.avanzar(1.6); J.tutorial.terminar(); J.avanzar(0.5);`],
      ['i03_depto_fotos_y_mesa', `const J=window.__juego; const o=J.INTERIORES?J.INTERIORES.depto.o:{x:0,z:300}; J.juego.estado='pausa'; const cam=()=>{J.camara.position.set(o.x-1.5, 1.7, o.z+1.0); J.camara.lookAt(o.x+0.6, 1.3, o.z-4);}; cam(); J.avanzar(0.05); cam();`],
      ['i04_radio_afuera', `const J=window.__juego; J.juego.estado='jugando'; J.irA('ciudad','depto'); J.avanzar(1.6); J.juego.estado='pausa'; const cam=()=>{J.camara.position.set(6.5, 1.8, -9); J.camara.lookAt(18, 7, -21);}; cam(); J.avanzar(0.05); cam();`],
      ['i05_radio_adentro', `const J=window.__juego; J.juego.estado='jugando'; const l=J.interiores.llegadas.ciudad.radio; __ver(l.x, l.z, l.x-Math.sin(l.rumbo), l.z-Math.cos(l.rumbo), 0.1, 0.2); J.irA('radio','entrada'); J.avanzar(1.6); J.avanzar(0.4);`],
      ['i06_cine_afuera', `const J=window.__juego; J.irA('ciudad','radio'); J.avanzar(1.6); J.juego.estado='pausa'; const cam=()=>{J.camara.position.set(20, 1.8, 36); J.camara.lookAt(22, 3.0, 28.4);}; cam(); J.avanzar(0.05); cam();`],
      ['i07_cine_adentro', `const J=window.__juego; J.juego.estado='jugando'; const l=J.interiores.llegadas.ciudad.cine; __ver(l.x, l.z, l.x-Math.sin(l.rumbo), l.z-Math.cos(l.rumbo), 0.1, 0.2); J.irA('cine','entrada'); J.avanzar(1.6); J.avanzar(1.0);`],
      ['i08_cine_se_dan_vuelta', `const J=window.__juego; const e=J.jugador.estado; e.pos.set(300, 0.15, 300-10+5); J.avanzar(0.5); J.juego.estado='pausa'; const cam=()=>{J.camara.position.set(300, 2.4, 300-10+3.5); J.camara.lookAt(300, 1.0, 300+3);}; cam(); J.avanzar(0.05); cam();`],
      ['i09_nichos', `const J=window.__juego; J.juego.estado='jugando'; J.irA('ciudad','cine'); J.avanzar(1.6); J.juego.estado='pausa'; const cam=()=>{J.camara.position.set(-54.5, 1.7, 17.5); J.camara.lookAt(-58, 1.3, 21.5);}; cam(); J.avanzar(0.05); cam();`],
    ],
  })[grupo] || []);
  for (const [nombre, expr] of tomas) {
    await js(expr + `; window.__juego.tutorial.terminar();`);
    console.log(nombre, '·', await js(`const J=window.__juego; return J.juego.zona + ' | ' + J.juego.estado + ' | ' + document.getElementById('obj-texto').textContent`));
    await foto(nombre);
  }
  await js(`window.__juego.abrirPlano(true);`); await foto('m09_plano');
  ws.close(); chrome.kill();
  process.exit(0);
}
// cómo se encuentran las manchas (columnas de luz, flecha, radio sola):  node herramientas/capturas.mjs faciles
if (process.argv[2] === 'faciles') {
  await js(`const J=window.__juego; J.tutorial.terminar();
    window.__ver=(x,z,tx,tz,pitch=0.18,seg=0.4)=>{const e=J.jugador.estado; e.pos.set(x,0.15,z); const y=Math.atan2(tx-x,tz-z); e.rumbo=y; e.yawCam=y; e.pitchCam=pitch; J.avanzar(seg);};
    J.siniestro.sombra.espera=999; J.telefonos.depurar.cabinas.forEach(c=>c.estado='contestado');`);
  const tomas = [
    ['f01_al_salir_del_bano', `const J=window.__juego; const p=J.ciudad.sitios.bano.puerta; J.juego.afuera=true; __ver(p.x, p.z-1.5, p.x, p.z-20, -0.05, 0.6);`],
    ['f02_de_lejos', `const J=window.__juego; const m=J.siniestro.frecuencias[1].pos; __ver(-11, 30, m.x, m.z, -0.1, 0.4);`],
    ['f03_al_llegar', `const J=window.__juego; const fr=J.siniestro.frecuencias[0]; const n=new J.THREE.Vector3(0,0,1).applyQuaternion(fr.fija.quaternion); J.juego.dial=87.9; __ver(fr.pos.x+n.x*6, fr.pos.z+n.z*6, fr.pos.x, fr.pos.z, 0.1, 2.0);`],
    ['f04_plano', `window.__juego.abrirPlano(true);`],
  ];
  for (const [nombre, expr] of tomas) {
    await js(expr);
    console.log(nombre, '·', await js(`return document.getElementById('obj-texto').textContent + ' | dial ' + window.__juego.juego.dial.toFixed(1) + ' | ' + (document.getElementById('accion').hidden ? '' : document.getElementById('accion').textContent)`));
    await foto(nombre);
  }
  ws.close(); chrome.kill();
  process.exit(0);
}
// lo nuevo de las calles (manchas cerca, teléfonos, abrigos, paradero, arañas):  node herramientas/capturas.mjs calles
if (process.argv[2] === 'calles') {
  await js(`const J=window.__juego; J.tutorial.terminar(); J.juego.afuera=true;
    window.__E=()=>{dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'})); dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'}));};
    window.__ver=(x,z,tx,tz,pitch=0.18,seg=0.4)=>{const e=J.jugador.estado; e.pos.set(x,0.15,z); const y=Math.atan2(tx-x,tz-z); e.rumbo=y; e.yawCam=y; e.pitchCam=pitch; J.avanzar(seg);};
    window.__calma=()=>{const s=J.siniestro.sombra; s.activa=false; s.espera=999; s.m.position.set(0,-50,0);};`);
  console.log('distancias:', await js(`const J=window.__juego; const d=(a,b)=>Math.round(Math.hypot(a.x-b.x,a.z-b.z)); const f=J.siniestro.frecuencias.map(x=>x.pos); const p=J.ciudad.sitios.bano.puerta, g=J.ciudad.sitios.porton.position;
    return 'puerta→m1 '+d(p,f[0])+' m · m1→m2 '+d(f[0],f[1])+' m · m2→m3 '+d(f[1],f[2])+' m · m3→portón '+d(f[2],g)+' m';`));
  const tomas = [
    ['c01_aranas_bano', `const J=window.__juego; const b=J.ciudad.sitios.bano; J.juego.afuera=false; __ver(b.centro.x-1, b.centro.z+1.2, b.centro.x, b.centro.z, 0.1, 0.2);
      const A=J.bichos.depurar.aranasBano; A[1].a=-0.35; A[1].b=1.75; A[2].a=0.7; A[2].b=2.2; A[0].a=1.6; A[0].b=2.4; J.juego.estado='pausa';
      J.camara.position.set(b.centro.x+0.7, 1.75, b.centro.z+0.4); J.camara.lookAt(b.centro.x+b.W/2, 1.9, b.centro.z-0.2); J.avanzar(0.05);`],
    ['c02_primera_mancha_cerca', `const J=window.__juego; J.juego.estado='jugando'; J.juego.afuera=true; __calma(); const p=J.ciudad.sitios.bano.puerta; const m=J.siniestro.frecuencias[0].pos; __ver(m.x+1.5, m.z+7, m.x, m.z, 0.1);`],
    ['c03_telefono_suena', `const J=window.__juego; __calma(); const c=J.telefonos.depurar.cabinas[0].pos; __ver(c.x+2, c.z+10, c.x, c.z, 0.15, 1.0);`],
    ['c04_telefono_contestado', `const J=window.__juego; const c=J.telefonos.depurar.cabinas[0].pos; __ver(c.x+1.6, c.z+0.4, c.x, c.z, 0.15, 0.2); __E(); J.avanzar(6);`],
    ['c05_telefono_perdido', `const J=window.__juego; const c=J.telefonos.depurar.cabinas[1].pos; J.siniestro.sombra.espera=999; __ver(c.x+2, c.z+16, c.x, c.z, 0.15, 15.2);`],
    ['c06_abrigo_sin_cabeza', `const J=window.__juego; __calma(); J.hud.limpiar(); const a=J.calles.depurar.abrigos[0]; const p=a.raiz.position; __ver(p.x+12, p.z+9, p.x, p.z, 0.1, 0.05);
      J.juego.estado='pausa'; J.avanzar(0.05); J.camara.position.set(p.x+2.2, 1.5, p.z+3.2); J.camara.lookAt(p.x, 1.0, p.z); J.avanzar(0.02); J.camara.position.set(p.x+2.2, 1.5, p.z+3.2); J.camara.lookAt(p.x, 1.0, p.z);`],
    ['c07_abrigo_alumbrado', `const J=window.__juego; const a=J.calles.depurar.abrigos[0]; a.caido=8.9; J.avanzar(1.2); const p=a.raiz.position; J.camara.position.set(p.x+2.4, 1.6, p.z+2.6); J.camara.lookAt(p.x, 0.3, p.z);`],
    ['c08_paradero', `const J=window.__juego; J.jugador.estado.pos.set(10.2, 0.15, 5); J.avanzar(0.3); J.camara.position.set(10.8, 1.55, 7.2); J.camara.lookAt(7.4, 1.0, 4.4);`],
    ['c09_arana_del_hilo', `const J=window.__juego; J.juego.estado='jugando'; __ver(-8,33,-20,33,0.1,0.2); J.bichos.depurar.caida.t=0; J.avanzar(1.9);`],
    ['c10_cucarachas', `const J=window.__juego; const b=J.ciudad.basuras[3]; __ver(b.x+7, b.z+7, b.x, b.z, 0.1, 0.4); J.juego.estado='pausa'; J.camara.position.set(b.x+1.3, 1.0, b.z+1.6); J.camara.lookAt(b.x, 0.1, b.z);`],
  ];
  for (const [nombre, expr] of tomas) {
    await js(expr);
    console.log(nombre, '·', await js(`return document.getElementById('obj-texto').textContent + ' | ' + document.getElementById('texto').textContent.replace(/\\n/g,' ')`));
    await foto(nombre);
  }
  ws.close(); chrome.kill();
  process.exit(0);
}
// evaluar una expresión en el juego y mostrar el resultado:  node herramientas/capturas.mjs eval "<código>"
if (process.argv[2] === 'eval') {
  console.log(JSON.stringify(await js(process.argv[3]), null, 1));
  ws.close(); chrome.kill();
  process.exit(0);
}
// las rarezas (espejo, niño, relojes, ventanas, puertas altas, carrito, kiosco):  node herramientas/capturas.mjs rarezas
if (process.argv[2] === 'rarezas') {
  await js(`const J=window.__juego; J.tutorial.terminar(); J.juego.afuera=true;
    window.__ver=(x,z,tx,tz,pitch=0.18)=>{const e=J.jugador.estado; e.pos.set(x,0.15,z); const y=Math.atan2(tx-x,tz-z); e.rumbo=y; e.yawCam=y; e.pitchCam=pitch; J.avanzar(0.4);};
    window.__frenteA=(p,d,pitch)=>__ver(p.x+p.nx*d, p.z+p.nz*d, p.x, p.z, pitch);`);
  const tomas = [
    ['r01_espejo', `const J=window.__juego; J.rarezas.reiniciar(1); const e=J.rarezas.depurar.espejo.position; __ver(e.x-1.5, e.z+0.15, e.x, e.z+0.15, 0.1);`],
    ['r02_nino', `const J=window.__juego; const n=J.rarezas.depurar.nino.position; const libre=(x,z)=>!J.ciudad.colisiones.some(c=>x>c.x0-0.4&&x<c.x1+0.4&&z>c.z0-0.4&&z<c.z1+0.4);
      const d=[[0,10],[0,-10],[10,0],[-10,0]].find(([dx,dz])=>[0.3,0.6,1].every(k=>libre(n.x+dx*k,n.z+dz*k)))||[0,10];
      __ver(n.x+d[0]+(d[1]?0.8:0), n.z+d[1]+(d[0]?0.8:0), n.x, n.z, 0.05);`],
    ['r03_reloj_al_reves', `const J=window.__juego; const r=J.rarezas.depurar.relojes[0]; __frenteA(r.p, 4.5, 0.42);`],
    ['r04_ventana', `const J=window.__juego; const v=J.rarezas.depurar.ventanas[0]; __frenteA({...v.p, x:v.p.x+(v.p.nz?2.5:0), z:v.p.z+(v.p.nx?2.5:0)}, 8, -0.12);`],
    ['r05_puerta_alta', `const J=window.__juego; const p=J.rarezas.depurar.puertasAltas[0]; __frenteA({...p.p, x:p.p.x+(p.p.nz?2:0), z:p.p.z+(p.p.nx?2:0)}, 8, -0.12);`],
    ['r09_puerta_alta_fija', `const J=window.__juego; J.juego.estado='pausa'; const p=J.rarezas.depurar.puertasAltas[0].p; J.camara.position.set(p.x+p.nx*9+(p.nz?3:0), 2.0, p.z+p.nz*9+(p.nx?3:0)); J.camara.lookAt(p.x, 4.6, p.z); J.avanzar(0.05);`],
    ['r10_ventana_de_reojo', `const J=window.__juego; const v=J.rarezas.depurar.ventanas[0].p; J.camara.position.set(v.x+v.nx*12+(v.nz?6:0), 2.0, v.z+v.nz*12+(v.nx?6:0)); J.camara.lookAt(v.x+(v.nz?7:0), 4.0, v.z+(v.nx?7:0)); J.avanzar(0.05); J.juego.estado='jugando';`],
    ['r06_carrito', `const J=window.__juego; const c=J.rarezas.depurar.carrito.position; __ver(c.x+2.5, c.z+4.5, c.x, c.z, 0.25);`],
    ['r07_kiosco', `const J=window.__juego; const k=J.rarezas.depurar.kiosco; __ver(k.x+5.5, k.z+1.2, k.x, k.z, 0.15);`],
    ['r08_lluvia_sube', `const J=window.__juego; J.juego.dial=31.7; __ver(-8,33,-9,33.05,0.3); J.avanzar(0.8);`],
  ];
  for (const [nombre, expr] of tomas) { await js(expr); await foto(nombre); }
  ws.close(); chrome.kill();
  process.exit(0);
}
// los objetos (casete, llave, puerta, foto, pilas):  node herramientas/capturas.mjs objetos
if (process.argv[2] === 'objetos') {
  await js(`const J=window.__juego; J.tutorial.terminar(); J.juego.afuera=true;
    window.__E=()=>{dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'})); dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'}));};
    window.__frente=(p,n,d)=>{J.jugador.estado.pos.set(p.x+n.x*d,0.15,p.z+n.z*d); const y=Math.atan2(-n.x,-n.z); J.jugador.estado.rumbo=y; J.jugador.estado.yawCam=y+0.3; J.avanzar(0.3);};
    window.__texto=()=>document.getElementById('texto').textContent.replace(/\\n/g,' ');`);
  const pasos = [
    ['o01_auto_casete', `const a=window.__juego.detalles.autos[3]; __frente(a,{x:0.7,z:0.7},2.0);`],
    ['o02_casete_recogido', `__E(); window.__juego.avanzar(5);`],
    ['o03_boca_llave', `const J=window.__juego; const b=J.siniestro.depurar.boca; const n=new J.THREE.Vector3(0,0,1).applyQuaternion(b.quaternion); __frente(b.position,n,2.6); __E(); J.avanzar(5);`],
    ['o04_puerta_candado', `const J=window.__juego; const p=J.puerta.pos; const c=J.ciudad.sitios.plazaCentro; const n=new J.THREE.Vector3(p.x-c.x,0,p.z-c.z); __frente(p,{x:0,z:0},0); const y=Math.atan2(c.x-p.x,c.z-p.z)+Math.PI; J.jugador.estado.rumbo=y; J.jugador.estado.yawCam=y; J.avanzar(0.3);`],
    ['o05_puerta_abierta', `__E(); window.__juego.avanzar(5);`],
    ['o06_televisores_casete', `const J=window.__juego; const tv=J.siniestro.depurar.tvs[0]; const n=new J.THREE.Vector3(0,0,1).applyQuaternion(tv.quaternion); __frente(tv.position,n,3.0); __E(); J.avanzar(6);`],
    ['o07_vieja_foto', `const J=window.__juego; const v=J.siniestro.depurar.viejas[1]; const f=v.f; __frente(v.pos,{x:f.nx,z:f.nz},1.6); __E(); J.avanzar(6);`],
    ['o08_plano_objetos', `window.__juego.abrirPlano(true);`],
  ];
  for (const [nombre, expr] of pasos) {
    await js(expr);
    console.log(nombre, '·', await js(`return document.getElementById('accion').hidden ? '' : document.getElementById('accion').textContent`), '·', await js(`return __texto()`));
    await foto(nombre);
  }
  console.log('lleva:', JSON.stringify(await js(`return window.__juego.inventario.lleva`)));
  // la linterna se gasta, se apaga sin pilas y vuelve con pilas nuevas
  console.log('linterna:', JSON.stringify(await js(`const J=window.__juego; J.abrirPlano(false); const e=J.jugador.estado; const bn=J.ciudad.sitios.bano; e.pos.copy(bn.inicio); J.juego.tiempoAfuera=0; J.siniestro.sombra.activa=false; e.linternaOn=true;
    J.avanzar(100); const a=Math.round(J.inventario.bateria*100); J.avanzar(60); const b={bateria:J.inventario.bateria, encendida:e.linternaOn};
    J.inventario.dar('pilas'); dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF'})); dispatchEvent(new KeyboardEvent('keyup',{code:'KeyF'})); J.avanzar(0.2);
    return {a100s:a, a160s:b, conPilasNuevas:{bateria:Math.round(J.inventario.bateria*100), encendida:e.linternaOn, pilas:J.inventario.lleva.pilas}};`)));
  ws.close(); chrome.kill();
  process.exit(0);
}
// la guía para el jugador (objetivo, examinar con E, emisoras, señal):  node herramientas/capturas.mjs guia
if (process.argv[2] === 'guia') {
  await js(`window.__juego.tutorial.terminar(); window.__juego.avanzar(0.3);`);
  await foto('g01_objetivo_salir');
  await js(`const J=window.__juego; const v=J.siniestro.depurar.viejas[0]; const f=v.f;
    J.jugador.estado.pos.set(v.pos.x+f.nx*1.7+(f.nz?0.5:0), 0.15, v.pos.z+f.nz*1.7+(f.nx?0.5:0)); const y=Math.atan2(-f.nx,-f.nz); J.jugador.estado.rumbo=y; J.jugador.estado.yawCam=y+0.35;
    J.juego.afuera=true; J.avanzar(0.4);`);
  await foto('g02_aviso_vieja');
  await js(`const J=window.__juego; dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'})); dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'})); J.avanzar(4.5);`);
  await foto('g03_pista_vieja');
  await js(`const J=window.__juego; J.juego.dial=94.3; J.avanzar(6.2);`);
  await foto('g04_emisora_voz');
  await js(`const J=window.__juego; J.juego.dial=31.7; J.avanzar(0.6);`);
  await foto('g05_senal_317');
  // frente a la mancha revelada, con la radio en 31.7
  await js(`const J=window.__juego; const i=[0,1,2].find(k=>J.plano.revelada(k)); const fr=J.siniestro.frecuencias[i]; const f=fr.fija;
    const n=new J.THREE.Vector3(0,0,1).applyQuaternion(f.quaternion); J.jugador.estado.pos.set(fr.pos.x+n.x*2.8, 0.15, fr.pos.z+n.z*2.8);
    const y=Math.atan2(-n.x,-n.z); J.jugador.estado.rumbo=y; J.jugador.estado.yawCam=y; J.avanzar(0.6);`);
  await foto('g06_escuchar_mancha');
  await js(`const J=window.__juego; dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'})); dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'})); J.avanzar(3.5);`);
  await foto('g07_mancha_despierta');
  await js(`const J=window.__juego; J.juego.dial=88; J.avanzar(0.3); J.abrirPlano(true);`);
  await foto('g08_plano_con_pista');
  ws.close(); chrome.kill();
  console.log('listo:', SALIDA);
  process.exit(0);
}
// sólo el protagonista:  node herramientas/capturas.mjs personaje
if (process.argv[2] === 'personaje') {
  // pausa el juego, pone una pose y deja la cámara fija mirándolo desde el ángulo pedido (0 = de frente)
  await js(`window.__pose=(modo,fase,tt,extra,ang,dist=2.4,alto=1.15)=>{const J=window.__juego; J.juego.estado='pausa'; const e=J.jugador.estado;
    J.jugador.posar(modo,fase,tt,extra); const p=e.pos, a=e.rumbo+ang; J.camara.position.set(p.x+Math.sin(a)*dist, alto, p.z+Math.cos(a)*dist); J.camara.lookAt(p.x,0.9,p.z);};
    __ir(-8,33,-1,0.05); window.__juego.avanzar(0.5);`);
  const tomas = [
    ['p01_frente', `__pose('quieto',0,1,0,0)`],
    ['p02_tres_cuartos', `__pose('quieto',0,2,0,0.7)`],
    ['p03_espalda', `__pose('quieto',0,3,0,Math.PI)`],
    ['p04_fuma', `__pose('quieto',0,6.6,0,0.5)`],
    ['p05_camina_lado', `__pose('camina',Math.PI/2,1,0,Math.PI/2)`],
    ['p06_camina_lado_b', `__pose('camina',-Math.PI/2,1,0,Math.PI/2)`],
    ['p07_corre_lado', `__pose('corre',Math.PI/2,1,0,Math.PI/2)`],
    ['p08_baila', `__pose('baila',0.9,1,0,0.3)`],
    ['p09_mira', `__pose('mira',0,1,0,0.2)`],
    ['p10_cae', `__pose('cae',0,1,1,Math.PI/2,3.2,1.6)`],
    ['p13_baila_cerca', `__pose('baila',0.9,1,0,0.2,1.5,1.45)`],
    ['p14_corre_cerca', `__pose('corre',Math.PI/2,1,0,1.2,1.6,1.2)`],
  ];
  for (const [nombre, expr] of tomas) { await js(expr); await foto(nombre); }
  // y jugando: caminar con la flecha, cámara normal
  await js(`const J=window.__juego; J.juego.estado='jugando'; __ir(-8,33,-1,0.05); dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp'})); J.avanzar(1.15);`);
  await foto('p11_caminando_juego');
  await js(`const J=window.__juego; dispatchEvent(new KeyboardEvent('keydown',{code:'ShiftLeft'})); J.avanzar(0.9);`);
  await foto('p12_corriendo_juego');
  await js(`dispatchEvent(new KeyboardEvent('keyup',{code:'ShiftLeft'})); dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp'})); window.__juego.avanzar(0.5);`);
  // atrapado: cae de espaldas (la cámara queda donde estaba)
  await js(`const J=window.__juego; J.juego.estado='captura'; J.juego.captura=0; J.avanzar(0.75); J.juego.estado='pausa'; document.getElementById('velo').style.opacity='0';`);
  await foto('p15_atrapado_cae');
  // el doble bailando en la fiesta, visto de cerca (el juego en pausa, la fiesta sigue)
  await js(`const J=window.__juego; J.avanzar(3); J.entrarFiesta(); J.fiesta.reiniciar(); J.juego.estado='pausa'; document.getElementById('velo').style.opacity='0';
    const zN=J.fiesta.zona.zNorte; J.jugador.estado.pos.set(0,0.02,zN+40); J.avanzar(0.6); J.camara.position.set(1.0,1.45,zN+5.4); J.camara.lookAt(0,1.0,zN+2.2); J.avanzar(0.05);`);
  await foto('p16_doble_baila');
  ws.close(); chrome.kill();
  console.log('listo:', SALIDA);
  process.exit(0);
}
await foto('01_bano');
// la calle
await js(`const J=window.__juego; __ir(-8,33,-1,0.05); J.juego.tiempoAfuera=5; J.avanzar(0.8);`);
await foto('02_calle');
// la vieja que mira la pared, con linterna
await js(`const J=window.__juego; const v=J.siniestro.depurar.viejas[0]; const f=v.f; const tx=f.nz?1:0, tz=f.nx?1:0;
  __ir(v.pos.x+f.nx*4 + tx*1.0, v.pos.z+f.nz*4 + tz*1.0, -f.nx - tx*0.25, -f.nz - tz*0.25); J.jugador.estado.linternaOn=true; J.avanzar(0.6);`);
await foto('03_vieja_de_espaldas');
await js(`const J=window.__juego; const v=J.siniestro.depurar.viejas[0]; const f=v.f; const tx=f.nz?1:0, tz=f.nx?1:0;
  __ir(v.pos.x+f.nx*6 + tx*1.0, v.pos.z+f.nz*6 + tz*1.0, -f.nx - tx*0.25, -f.nz - tz*0.25); J.avanzar(0.4);
  const e=J.jugador.estado; const y0=e.yawCam; e.yawCam=y0+Math.PI; e.rumbo=y0+Math.PI; J.avanzar(3.2); e.yawCam=y0; e.rumbo=y0; J.avanzar(0.3);`);
await foto('04_vieja_se_dio_vuelta');
// ratas en la basura
await js(`const J=window.__juego; const b=J.ciudad.basuras[3]; __ir(b.x-1.2, b.z-3.6, 0.55, 1); J.jugador.estado.linternaOn=true; J.jugador.estado.pitchCam=0.38;
  J.ratas.lista.slice(0,9).forEach((a,i)=>{a.m.position.set(b.x-1.6+i*0.45, 0.15, b.z-1.0-(i%3)*0.5); a.objetivo=null; a.espera=9; a.vel.set(i%2?1:-1,0,0); a.cuadro=i;}); J.avanzar(0.05);`);
await foto('05_ratas_basura');
// la manada cruzando
await js(`const J=window.__juego; __ir(-8,33,-1,0.05); J.jugador.estado.linternaOn=false; J.jugador.estado.pitchCam=0.2; J.avanzar(0.2); J.ratas.manada(J.jugador.estado); J.avanzar(1.6);`);
await foto('06_manada_de_ratas');
// la vitrina en vivo
await js(`const J=window.__juego; const tv=J.siniestro.depurar.tvs[0]; const n=new J.THREE.Vector3(0,0,1).applyQuaternion(tv.quaternion); const t=new J.THREE.Vector3(n.z,0,-n.x);
  const p=tv.position.clone().addScaledVector(n,3.2).addScaledVector(t,-1.8); __ir(p.x,p.z,-n.x-t.x*0.55,-n.z-t.z*0.55); J.avanzar(0.6);`);
await foto('07_vitrina_en_vivo');
// la boca del muro
await js(`const J=window.__juego; const b=J.siniestro.depurar.boca; const n=new J.THREE.Vector3(0,0,1).applyQuaternion(b.quaternion); const t=new J.THREE.Vector3(n.z,0,-n.x);
  const p=b.position.clone().addScaledVector(n,5.0).addScaledVector(t,-1.6); __ir(p.x,p.z,-n.x-t.x*0.35,-n.z-t.z*0.35); J.avanzar(2.2);`);
await foto('08_boca_del_muro');
// el charco que es un ojo
await js(`const J=window.__juego; const o=J.siniestro.ojo.position; __ir(o.x-2.2,o.z+5.5,0.3,-1); J.jugador.estado.pitchCam=0.6; J.avanzar(1.5);`);
await foto('09_charco_ojo');
// 317: el mundo en negativo y la mancha que despierta
await js(`const J=window.__juego; const fr=J.siniestro.frecuencias[1]; const n=new J.THREE.Vector3(0,0,1).applyQuaternion(fr.fija.quaternion); const t=new J.THREE.Vector3(n.z,0,-n.x);
  const p=fr.pos.clone().addScaledVector(n,4.6).addScaledVector(t,-1.4); __ir(p.x,p.z,-n.x-t.x*0.3,-n.z-t.z*0.3); J.jugador.estado.pitchCam=0.2; J.juego.dial=31.7; J.avanzar(1.4);`);
await foto('10_frecuencia_317');
// la sombra encima
await js(`const J=window.__juego; J.juego.dial=88; __ir(-8,33,-1,0.05); J.juego.tiempoAfuera=60; J.avanzar(0.5); const e=J.jugador.estado; const s=J.siniestro.sombra;
  const y=e.yawCam; s.m.position.set(e.pos.x+Math.sin(y)*7-Math.cos(y)*1.2, 0.1, e.pos.z+Math.cos(y)*7+Math.sin(y)*1.2); s.activa=true; J.avanzar(0.3);`);
await foto('11_la_sombra');
await js(`const J=window.__juego; J.avanzar(1.0);`);
await foto('12_captura');
await js(`const J=window.__juego; J.avanzar(3.5); document.getElementById('velo').style.opacity='0'; J.avanzar(2.0);`);
await foto('13_otra_vez_el_bano');
// ---------- la fiesta y los pasillos
await js(`const J=window.__juego; J.despertar(); J.avanzar(0.3); J.entrarFiesta(); J.avanzar(1.5);`);
await foto('14_fiesta');
await js(`const J=window.__juego; const e=J.jugador.estado; e.yawCam=0; J.avanzar(5); e.yawCam=Math.PI; J.avanzar(0.3);`);
await foto('15_bailarines_se_acercan');
await js(`const J=window.__juego; J.fiesta.reiniciar(); const zN=J.fiesta.zona.zNorte; __ir(0.6, zN+9.5, -0.05, -1); J.jugador.estado.pitchCam=0.1; J.avanzar(0.6);`);
await foto('16_tu_doble');
await js(`const J=window.__juego; const zN=J.fiesta.zona.zNorte; __ir(0.6, zN+7.0, -0.05, -1); J.avanzar(2.4);`);
await foto('17_tu_doble_se_va');
await js(`const J=window.__juego; const zN=J.fiesta.zona.zNorte; __ir(0, zN-6, 0, -1); J.avanzar(0.6);`);
await foto('18_pasillo');
await js(`const J=window.__juego; const tr=J.fiesta.depurar.tramos[4]; __ir(0, tr.z1-1.5, 0, -1); J.avanzar(2.0);`);
await foto('19_pasillo_se_cierra');
await js(`const J=window.__juego; const tr=J.fiesta.depurar.tramos[5]; __ir(-0.3, tr.zc+4.2, 0.12, -1); J.avanzar(1.8);`);
await foto('20_boca_en_el_pasillo');
await js(`const J=window.__juego; const tr=J.fiesta.depurar.tramos[3]; __ir(0, tr.zc, 0, -1); const g=J.fiesta.depurar.garganta; g.activa=true; g.z=tr.zc+6; J.jugador.estado.yawCam=0.42; J.avanzar(0.25);`);
await foto('21_la_garganta');
await js(`const J=window.__juego; J.avanzar(2.5);`);
await foto('22_tragado');
await js(`const J=window.__juego; J.avanzar(4); J.entrarFiesta(); J.avanzar(0.2); const zF=J.fiesta.zona.zFin; __ir(0, zF+5, 0, -1); J.fiesta.depurar.garganta.activa=false; J.avanzar(0.6);`);
await foto('23_puerta_final');
await js(`window.__juego.abrirPlano(true);`);
await foto('23b_plano_fiesta');
await js(`window.__juego.abrirPlano(false);`);
await js(`const J=window.__juego; const zF=J.fiesta.zona.zFin; __ir(0, zF+1.0, 0, -1); J.avanzar(3.0);`);
await foto('24_si_todo_vuelve');
// orinar en la ciudad: la mancha y, diez segundos después, su forma
await js(`const J=window.__juego; J.avanzar(5); document.getElementById('velo').style.opacity='0'; const f=J.ciudad.fachadas[1]; __ir(f.x+f.nx*1.0+(f.nz?0.6:0), f.z+f.nz*1.0+(f.nx?0.6:0), -f.nx, -f.nz); J.juego.zona='ciudad'; J.orinar(); const y=J.jugador.estado.yawCam; J.jugador.estado.yawCam=y+0.75; J.avanzar(0.5);`);
await foto('25_orinar');
await js(`const J=window.__juego; J.avanzar(10.5);`);
await foto('26_la_mancha_toma_forma');
// el plano de la ciudad, con lo que ya se anotó
await js(`const J=window.__juego; J.siniestro.frecuencias[0].hallada=true; J.abrirPlano(true);`);
await foto('27_plano');
await js(`window.__juego.abrirPlano(false);`);
ws.close();
chrome.kill();
console.log('listo:', SALIDA);
