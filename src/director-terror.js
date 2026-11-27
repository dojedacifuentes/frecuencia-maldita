// Director de terror R9. Sin servicios externos ni cambios en colisiones u objetivos.
import * as THREE from 'three';

const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const STORAGE = 'r9:ecos:v1';
export const EVENTOS = [
  {id:'pasos', w:5, dur:4, conducta:'corre'},
  {id:'respira', w:4, dur:7, conducta:'quieto'},
  {id:'curioso', w:4, dur:12, conducta:'quieto'},
  {id:'imitador', w:4, dur:16, conducta:'regresa'},
  {id:'ventana', w:3, dur:12, conducta:'regresa'},
  {id:'techo', w:3, dur:9, conducta:'quieto'},
  {id:'gigante', w:2, dur:14},
  {id:'apagón', w:3, dur:6, conducta:'corre'},
  {id:'silencio', w:3, dur:6},
  {id:'radio', w:5, dur:10, conducta:'radio'},
  {id:'cadaver', w:2, dur:15, conducta:'regresa'},
  {id:'puerta', w:2, dur:15, conducta:'regresa'},
  {id:'pared', w:3, dur:12, conducta:'quieto'},
  {id:'archivo', w:3, dur:10, conducta:'radio'},
  {id:'ojo', rare:.005, dur:10},
  {id:'congregacion', rare:.02, dur:14},
  {id:'transmision', rare:.01, dur:12},
  {id:'vacio', rare:.003, dur:8}
];

export function elegirRara(azar=Math.random){
  const r=azar();let acumulado=0;
  return EVENTOS.filter(e=>e.rare).find(e=>(acumulado+=e.rare)>r)||null;
}
export function resolverDesenlace(foto,pruebas){
  if(foto && pruebas.has('puerta') && (pruebas.has('archivo')||pruebas.has('transmision')||pruebas.has('cadaver'))) return 'RECHAZO DEL PROTOCOLO';
  return foto?'RECONOCIMIENTO':'RECONSTRUCCIÓN';
}
export function elegirEvento({conducta, usados, tension, azar=Math.random}) {
  // La probabilidad de rareza se aplica una sola vez al iniciar cada sesión.
  const candidatos=EVENTOS.filter(e=>!e.rare&&!usados.has(e.id));
  if(!candidatos.length) return null;
  const pesos=candidatos.map(e=>e.w*(e.conducta===conducta?3.5:1)*(tension>.72&&['apagón','gigante','cadaver'].includes(e.id)?0.6:1));
  let n=azar()*pesos.reduce((a,b)=>a+b,0);
  return candidatos.find((e,i)=>(n-=pesos[i])<0) || candidatos.at(-1);
}

function memoria() {
  try {
    const m=JSON.parse(localStorage.getItem(STORAGE)||'{}');
    return {sesiones:clamp(Number(m.sesiones)||0,0,999), muertes:clamp(Number(m.muertes)||0,0,999), finales:clamp(Number(m.finales)||0,0,999)};
  } catch { return {sesiones:0,muertes:0,finales:0}; }
}

export function crearDirector({escena,ciudad,camara,audio,hud,leerJuego,leerJugador,luces,lluvia,post,interaccion,volverAlBano}) {
  const m=memoria();
  const guardar=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(m));}catch{}};
  const grupo=new THREE.Group(); grupo.name='R9:presencias'; escena.add(grupo);
  const bano=new THREE.Group(); bano.name='R9:residuos'; escena.add(bano);
  const negro=new THREE.MeshLambertMaterial({color:0x151513});
  const piel=new THREE.MeshLambertMaterial({color:0x7e776a});
  const abrigo=new THREE.MeshLambertMaterial({color:0x303b2d});
  const rojo=new THREE.MeshBasicMaterial({color:0x421d17});
  const hueco=new THREE.MeshBasicMaterial({color:0x080808});
  const caja=new THREE.BoxGeometry(1,1,1);
  const esfera=new THREE.SphereGeometry(1,8,6);
  const v=new THREE.Vector3(), dir=new THREE.Vector3(), tmp=new THREE.Vector3();
  const matOjo=new THREE.MeshBasicMaterial({color:0x9c9984, fog:false});
  
  const historial=[]; let ultimo=null, activo=null, reloj=0, espera=21, muestreo=0, quieto=0, carrera=0, radio=0, retro=0, tension=.15, fuera=false, vuelta=0;
  let ultimoSector=null, ultimaRadio=0, rara=null, sesionesIniciadas=false, finalVisto=false;
  const usados=new Set(), visitados=new Map(), pruebas=new Set();
  const overlay=document.createElement('div');
  overlay.setAttribute('aria-hidden','true');
  Object.assign(overlay.style,{position:'absolute',left:'50%',top:'21%',transform:'translateX(-50%)',maxWidth:'78%',padding:'.55em .9em',background:'rgba(8,10,9,.86)',color:'#c9c2ae',font:'clamp(11px,1.4vw,17px) monospace',letterSpacing:'.08em',textAlign:'center',whiteSpace:'pre-line',pointerEvents:'none',zIndex:'4',display:'none',borderLeft:'2px solid #85443b'});
  document.getElementById('marco').append(overlay);
  let overlayHasta=0;
  function mensaje(s,d=6){overlay.textContent=s;overlay.style.display='block';overlayHasta=reloj+d;}
  function pieza(g,geo,mat,x,y,z,sx,sy,sz){const q=new THREE.Mesh(geo,mat);q.position.set(x,y,z);q.scale.set(sx,sy,sz);g.add(q);return q;}
  function figura(tipo='negro'){
    const g=new THREE.Group(), ma=tipo==='abrigo'?abrigo:negro;
    pieza(g,caja,ma,0,1.05,0,.43,.92,.25);
    pieza(g,esfera,piel,0,1.71,0,.17,.23,.16);
    for(const s of [-1,1]){
      pieza(g,caja,ma,s*.15,.38,0,.13,.76,.16);
      const brazo=pieza(g,caja,ma,s*.29,1.12,.02,.11,.86,.12);brazo.rotation.z=s*.09;
    }
    return g;
  }
  function limpiarGrupo(g){
    for(const h of [...g.children]){
      h.traverse(o=>{if(o.userData.ownedTexture)o.userData.ownedTexture.dispose();if(o.userData.ownedMaterial)o.material.dispose();});
      g.remove(h);
    }
  }
  function libre(p){
    return Math.abs(p.x)<55 && Math.abs(p.z)<55 && !ciudad.colisiones.some(c=>p.x>c.x0-.35&&p.x<c.x1+.35&&p.z>c.z0-.35&&p.z<c.z1+.35);
  }
  function cerca(p,dist=9,angulo=0){
    camara.getWorldDirection(dir);dir.y=0;dir.normalize();
    const a=Math.atan2(dir.x,dir.z)+angulo;
    for(let i=0;i<18;i++){
      const phi=a+(i===0?0:(i%2?1:-1)*Math.ceil(i/2)*.32);
      v.set(p.x+Math.sin(phi)*dist,0.13,p.z+Math.cos(phi)*dist);
      if(libre(v))return v.clone();
    }
    return null;
  }
  function visible(p){
    camara.getWorldDirection(dir);
    tmp.copy(p).add(new THREE.Vector3(0,1,0)).sub(camara.position).normalize();
    return dir.dot(tmp)>.72;
  }
  function poner(tipo,p,escala=1){
    if(!p)return null;const g=figura(tipo);g.position.copy(p);g.scale.setScalar(escala);grupo.add(g);return g;
  }
  function cartel(g,texto,pos,rot=0,w=1.5,h=.85){
    const c=document.createElement('canvas');c.width=256;c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle='#242822';ctx.fillRect(0,0,256,128);
    ctx.fillStyle='#b7b09b';ctx.font='bold 18px monospace';ctx.textAlign='center';
    texto.split('\n').forEach((s,i)=>ctx.fillText(s,128,31+i*23,248));
    const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
    const q=pieza(g,caja,mat,pos.x,pos.y,pos.z,w,h,.035);q.rotation.y=rot;q.userData.ownedTexture=t;q.userData.ownedMaterial=true;return q;
  }
  function terminar(){
    if(activo?.id==='vacio')lluvia.visible=leerJuego().zona==='ciudad';
    limpiarGrupo(grupo);activo=null;audio.silencioAnomalo?.(false);audio.lechoCiudad(leerJuego().zona==='ciudad'?1:.2);
  }
  function empezar(e,p){
    if(!e)return false;
    terminar();usados.add(e.id);activo={id:e.id,edad:0,dur:e.dur,objetos:[],ticks:0,ancla:p.clone()};
    const a=activo;
    const frente=(d,ang=0)=>cerca(p,d,ang);
    const agrega=(tipo,pos,s=1)=>{const g=poner(tipo,pos,s);if(g)a.objetos.push(g);return g;};
    switch(e.id){
      case 'pasos': break;
      case 'respira': audio.susurro(1.3);break;
      case 'curioso': {const g=agrega('negro',frente(7,.95));if(g)g.rotation.z=.12;break;}
      case 'imitador': {const h=historial[Math.max(0,historial.length-80)];agrega('abrigo',h?.p||frente(7,Math.PI));break;}
      case 'ventana': {
        const fs=ciudad.fachadas.filter(f=>f.alto>5&&Math.hypot(f.x-p.x,f.z-p.z)<25);
        const f=fs.sort((x,y)=>Math.hypot(x.x-p.x,x.z-p.z)-Math.hypot(y.x-p.x,y.z-p.z))[0];
        if(f){const g=agrega('negro',new THREE.Vector3(f.x+f.nx*.32,4.6,f.z+f.nz*.32),.67);if(g)g.rotation.y=Math.atan2(f.nx,f.nz);}
        break;
      }
      case 'techo': {const q=frente(5,.4);if(q){q.y=4.5;const g=agrega('negro',q);if(g){g.rotation.x=Math.PI/2;g.rotation.z=Math.PI;}}audio.golpes(p.clone().add(new THREE.Vector3(0,5,0)),5);break;}
      case 'gigante': {
        camara.getWorldDirection(dir);dir.y=0;dir.normalize();
        const q=p.clone().addScaledVector(dir,37);q.y=.1;agrega('negro',q,13);audio.arrastre(q,35);break;
      }
      case 'apagón': audio.crujido(); break;
      case 'silencio': audio.silencioAnomalo?.(true);break;
      case 'radio': mensaje('R9 / CANAL NO AUTORIZADO\nNo todos los que tienen tu cara son tú.',8);audio.susurro(1.2);break;
      case 'cadaver': {const g=agrega('abrigo',frente(6,.5));if(g){g.rotation.x=Math.PI/2;g.position.y=.29;}break;}
      case 'puerta': {
        const q=frente(8,.3);if(q){const g=new THREE.Group();g.position.copy(q);g.lookAt(p.x,g.position.y,p.z);pieza(g,caja,rojo,0,1.25,0,1.3,2.5,.2);pieza(g,caja,hueco,0,1.25,.12,1.02,2.23,.08);cartel(g,'03:17\nNO ES UNA SALIDA',new THREE.Vector3(0,1.65,.19),0,.82,.35);grupo.add(g);a.objetos.push(g);}break;
      }
      case 'pared': {
        const f=ciudad.fachadas.filter(x=>Math.hypot(x.x-p.x,x.z-p.z)<16).sort((x,y)=>Math.hypot(x.x-p.x,x.z-p.z)-Math.hypot(y.x-p.x,y.z-p.z))[0];
        if(f){const g=new THREE.Group();g.position.set(f.x+f.nx*.15,1.5,f.z+f.nz*.15);g.rotation.y=Math.atan2(f.nx,f.nz);pieza(g,esfera,rojo,0,0,0,1.5,1.1,.15);for(let i=0;i<7;i++)pieza(g,caja,negro,(i-3)*.31,0,.1,.055,1.9,.09).rotation.z=(i-3)*.16;grupo.add(g);a.objetos.push(g);}audio.arrastre(p,4);break;
      }
      case 'archivo': pruebas.add('archivo'); mensaje('R9 / REGISTRO DE RECONSTRUCCIÓN\nMuestra '+String(vuelta+1).padStart(3,'0')+' · memoria implantada.',8);break;
      case 'ojo': {
        camara.getWorldDirection(dir);dir.y=0;dir.normalize();
        const q=p.clone().addScaledVector(dir,42);q.y=23;
        const g=new THREE.Group();g.position.copy(q);g.lookAt(camara.position);
        pieza(g,esfera,matOjo,0,0,0,7,3.4,1.2);pieza(g,esfera,rojo,0,0,1.1,2.1,2.1,.4);pieza(g,esfera,hueco,0,0,1.48,.95,1.5,.3);
        grupo.add(g);a.objetos.push(g);break;
      }
      case 'congregacion': for(let i=0;i<13;i++){const g=agrega('negro',frente(7+i%3*2,(i-6)*.26),.95);if(g)g.lookAt(p.x,g.position.y,p.z);}break;
      case 'transmision': {
        const q=frente(6,.4);if(q){const g=new THREE.Group();g.position.copy(q);g.lookAt(p.x,g.position.y,p.z);pieza(g,caja,negro,0,1.3,0,1.15,.9,.55);cartel(g,'CÁMARA R9\nSUJETO 0317\nNO ESTÁ SOLO',new THREE.Vector3(0,1.3,.29),0,.93,.65);grupo.add(g);a.objetos.push(g);}audio.radioLejana(p,3);break;
      }
      case 'vacio': audio.silencioAnomalo?.(true);break;
    }
    // Un evento que no puede colocarse no deja al jugador atrapado esperando.
    if(['curioso','imitador','ventana','techo','cadaver','puerta','pared','congregacion','transmision'].includes(e.id)&&!a.objetos.length){terminar();return false;}
    tension=clamp(tension+.17,0,1);return true;
  }

  // Registrar una sola interacción móvil; no acumula listeners ni bloquea objetos originales.
  interaccion.agregar({
    zona:'ciudad', radio:2.3, prioridad:1,
    activo:()=>activo?.id==='puerta' && !!activo.objetos[0],
    pos:()=>activo?.objetos[0]?.position,
    etiqueta:'abrir la puerta que no estaba',
    accion:()=>{
      pruebas.add('puerta');terminar();volverAlBano();
      mensaje('R9 / ERROR DE CONTINUIDAD\nLa puerta no estaba conectada a este lugar.',7);
      return 'El baño. Otra vez.\nPero las manchas que recuerdas siguen despiertas.';
    }
  });
  interaccion.agregar({
    zona:'ciudad', radio:2.4,
    activo:()=>['transmision','cadaver','pared'].includes(activo?.id)&&!!activo.objetos[0],
    pos:()=>activo?.objetos[0]?.position,
    etiqueta:'examinar la anomalía',
    accion:()=>{
      const id=activo.id;pruebas.add(id);
      return id==='cadaver'?'El abrigo es tuyo. El reloj marca 03:17.\nEn el bolsillo: R9 / COPIA DESCARTADA.':id==='pared'?'No es un muro. Es una membrana.\nAlgo al otro lado intenta recordar cómo respirar.':'La pantalla muestra un registro de producción.\nSUJETO 0317 / RECONSTRUCCIÓN EN CURSO.';
    }
  });
  function registrarCanal(id){pruebas.add(id);}
  function desenlace(foto){
    return resolverDesenlace(foto,pruebas);
  }
  function decorarBano(n){
    limpiarGrupo(bano);const b=ciudad.sitios.bano;
    if(n<1)return;
    const x=b.centro.x-b.W/2+.15,z=b.centro.z;
    const frases=['EL MURO RECUERDA','R9 / LOTE 0317','NO ERES EL PRIMERO','EL BAÑO NO ES UN REFUGIO','SALA DE NACIMIENTO'];
    cartel(bano,frases[Math.min(n-1,4)],new THREE.Vector3(x,1.85,z-.5),Math.PI/2,1.25,.46);
    if(n>=2){for(let i=0;i<Math.min(14,n*3);i++){const r=pieza(bano,caja,rojo,x+.04,1.25+Math.sin(i*2.3)*.65,z+Math.cos(i*2.3)*.95,.07,.4+(i%3)*.13,.045);r.rotation.x=i*.7;}}
    if(n>=3){const g=figura('abrigo');g.position.set(x+.45,0,z+.65);g.rotation.y=-Math.PI/2;g.scale.setScalar(.82);bano.add(g);}
    if(n>=4){for(let i=0;i<8;i++){const g=pieza(bano,esfera,negro,x+.06,.35+i*.27,z+Math.sin(i*1.9)*.48,.15,.31,.18);g.rotation.x=i*.3;}}
    if(n>=5){cartel(bano,'SUJETO 0317\nACTIVO / COPIA '+String(n+1).padStart(3,'0'),new THREE.Vector3(b.centro.x,2.05,b.muroSur-.10),Math.PI,1.1,.55);}
  }
  function reiniciar(n){
    if(sesionesIniciadas&&n>vuelta&&!finalVisto)m.muertes=Math.min(999,m.muertes+1);
    if(!sesionesIniciadas){
      // Una oportunidad independiente por partida, nunca por fotograma.
      rara=elegirRara();
      sesionesIniciadas=true;m.sesiones=Math.min(999,m.sesiones+1);
    }
    guardar();finalVisto=false;vuelta=n;terminar();historial.length=0;visitados.clear();usados.clear();ultimo=null;ultimoSector=null;
    reloj=0;espera=18;muestreo=quieto=carrera=radio=retro=0;ultimaRadio=87.9;tension=.1;fuera=false;
    overlay.style.display='none';overlayHasta=0;decorarBano(n);
    if(n===0&&m.sesiones>1)mensaje('R9 / SESIÓN ANTERIOR DETECTADA\nEl barrio conserva tus ecos.',5);
  }
  function final(){
    if(finalVisto)return;finalVisto=true;m.finales=Math.min(999,m.finales+1);guardar();
    mensaje('R9 / PROTOCOLO DE NACIMIENTO\nLa siguiente copia está preparada.',5);
  }
  function pausa(abierta){
    // La pausa real siempre detiene la simulación; sólo cambia una inscripción ficticia.
    const p=document.querySelector('#plano > p');if(!p)return;
    if(abierta&&vuelta>=2){p.dataset.original=p.innerHTML;p.textContent='R9 / El plano no recuerda todas las calles. · Tab, Q o Esc: cerrar el plano';}
    else if(!abierta&&p.dataset.original){p.innerHTML=p.dataset.original;delete p.dataset.original;}
  }
  function actualizar(dt,t,{enBano,tieneRadio,tutorial,peligro}){
    const j=leerJuego(), pj=leerJugador(), p=pj.pos;
    if(j.estado!=='jugando'){if(activo)terminar();if(j.estado==='final'){reloj+=dt;if(reloj>=overlayHasta)overlay.style.display='none';}else overlay.style.display='none';return;}
    reloj+=dt;
    if(reloj>=overlayHasta)overlay.style.display='none';
    bano.visible=j.zona==='ciudad';
    if(j.zona!=='ciudad'||enBano||tutorial){if(activo)terminar();fuera=false;ultimo=null;return;}
    if(!fuera){fuera=true;espera=Math.max(espera,12);}
    const d=ultimo?p.distanceTo(ultimo):0;ultimo=p.clone();
    quieto=d<.015?quieto+dt:Math.max(0,quieto-dt*3);
    carrera=pj.corriendo?carrera+dt:Math.max(0,carrera-dt*2);
    radio=tieneRadio&&(j.modo317||Math.abs(j.dial-ultimaRadio)>.03)?radio+dt:Math.max(0,radio-dt*.5);ultimaRadio=j.dial;
    muestreo+=dt;if(muestreo>=.25){muestreo=0;historial.push({p:p.clone(),rumbo:pj.rumbo,t:reloj});if(historial.length>160)historial.shift();const k=Math.round(p.x/4)+':'+Math.round(p.z/4);if(k!==ultimoSector&&visitados.has(k)&&reloj-visitados.get(k)>12)retro=10;visitados.set(k,reloj);ultimoSector=k;}
    retro=Math.max(0,retro-dt);tension=clamp(tension-dt*.012+(peligro>.45?dt*.035:0),0,1);
    if(activo){
      const a=activo;a.edad+=dt;
      if(a.edad>=a.dur){terminar();espera=18+Math.random()*22+tension*12;return;}
      const g=a.objetos[0];
      if(a.id==='pasos'&&a.edad>a.ticks*.8+.3){a.ticks++;const q=cerca(p,2.5,Math.PI);if(q)audio.golpes(q,2.5);}
      if(a.id==='respira'&&a.edad>a.ticks*2+.1){a.ticks++;audio.susurro(1.1);}
      if(a.id==='curioso'&&g){g.visible=!visible(g.position);if(!g.visible&&a.edad>3){const q=cerca(p,5,1.3);if(q)g.position.lerp(q,dt*.5);}else g.lookAt(p.x,g.position.y,p.z);}
      if(a.id==='imitador'&&g){const h=historial.find(x=>x.t>=reloj-20)||historial[0];if(h){g.position.lerp(h.p,Math.min(1,dt*4));g.rotation.y=h.rumbo;}}
      if(a.id==='gigante'&&g)g.position.x+=dt*.8;
      if(a.id==='pared'&&g)g.scale.z=1+Math.sin(a.edad*2)*.55;
      if(a.id==='techo'&&g)g.position.x+=dt*.27;
      if(a.id==='apagón'){luces.forEach(l=>{l.intensity*=.12;});ciudad.sitios.bano.luz.intensity*=.15;}
      if(a.id==='vacio'){escena.fog.density=Math.max(escena.fog.density,.16);escena.background.setHex(0x090d11);lluvia.visible=false;}
      return;
    }
    espera-=dt;if(espera>0||peligro>.55||tension>.74)return;
    const conducta=quieto>5?'quieto':carrera>5?'corre':retro>0?'regresa':radio>10?'radio':'explora';
    const e=rara&&reloj>55?rara:(j.halladas>=1&&!pruebas.has('puerta')&&!usados.has('puerta')&&reloj>35 ? EVENTOS.find(x=>x.id==='puerta') : elegirEvento({conducta,usados,tension}));
    if(e===rara)rara=null;
    if(!e){espera=35;return;}
    if(!empezar(e,p)){usados.delete(e.id);espera=12;}
  }
  // Sólo para pruebas locales, a través del objeto de depuración existente.
  function probar(id){const e=EVENTOS.find(x=>x.id===id);return !!e&&empezar(e,leerJugador().pos);}
  return {actualizar,reiniciar,final,pausa,probar,registrarCanal,desenlace,estado:()=>({activo:activo?.id||null,tension,usados:[...usados],vuelta,pruebas:[...pruebas]})};
}
