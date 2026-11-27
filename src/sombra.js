import * as THREE from 'three';

function figura() {
  const raiz = new THREE.Group(), cuerpo = new THREE.Group();
  raiz.add(cuerpo);
  const piel = new THREE.MeshLambertMaterial({color:0x282628, flatShading:true});
  const borde = new THREE.MeshLambertMaterial({color:0x635b53, flatShading:true});
  const hueso = new THREE.SphereGeometry(1, 6, 5);
  function parte(padre, x,y,z, w,h,d, mat=piel) {
    const m = new THREE.Mesh(hueso,mat);
    m.scale.set(w,h,d); m.position.set(x,y,z); padre.add(m); return m;
  }
  function articulacion(padre,x,y,z) {
    const pivote = new THREE.Group(); pivote.position.set(x,y,z); padre.add(pivote); return pivote;
  }
  parte(cuerpo,0,.33,0,.20,.49,.13);
  parte(cuerpo,.035,.66,.04,.29,.29,.16);
  const cuello=articulacion(cuerpo,.08,.82,.04);
  parte(cuello,0,.13,0,.054,.22,.06,borde);
  parte(cuello,.02,.36,.04,.13,.205,.145);
  // La cara pálida se reconoce de perfil entre las ventanas oscuras. Dos cavidades
  // profundas y una mandíbula separada siguen legibles con la linterna a distancia.
  const yeso = new THREE.MeshLambertMaterial({color:0xb8b09a, flatShading:true});
  const hueco = new THREE.MeshLambertMaterial({color:0x100e0f});
  const cara = articulacion(cuello,.018,.42,.075);
  parte(cara,0,0,.045,.152,.207,.106,yeso);
  for (const lado of [-1,1]) {
    parte(cara,lado*.065,.041+lado*.018,.139,.054,lado>0?.011:.029,.018,hueco).rotation.z=-.24;
  }
  parte(cara,.008,-.019,.16,.024,.063,.032,yeso);
  const quijada=articulacion(cara,0,-.083,.11);
  parte(quijada,0,-.053,.008,.082,.084,.052,hueco);
  parte(quijada,.031,-.12,.034,.052,.032,.029,yeso).rotation.z=-.38;
  // Un costado parece cubierto por los jirones de un abrigo, el otro deja los dedos al aire.
  for(let k=0;k<5;k++) {
    const trapo=parte(cuerpo,-.14+k*.062,.03,-.075,.066,.40+(k%3)*.08,.078);
    trapo.rotation.z=(k-2)*.075;
  }
  // Un costado está encogido. Las manos cuelgan casi a la altura de las rodillas.
  const miembros = [-1,1].map(lado=>{
    const cadera=articulacion(cuerpo,lado*.116,.02,0);
    parte(cadera,0,-.27,0,.095,.30,.085);
    const rodilla=articulacion(cadera,0,-.52,0);
    parte(rodilla,0,-.24,0,.064,.28,.068);
    parte(rodilla,0,-.48,.07,.08,.065,.15);
    const hombro=articulacion(cuerpo,lado*.235,.72-lado*.065,0);
    parte(hombro,0,-.25,0,.070,.28,.073);
    // El antebrazo derecho cuelga más abajo, rozando el suelo durante el tirón.
    hombro.scale.y = lado > 0 ? 1.38 : .92;
    const codo=articulacion(hombro,0,-.51,0);
    parte(codo,0,-.30,0,.05,.33,.055);
    parte(codo,0,-.63,.01,.064,.13,.04,borde);
    for (const dedo of [-1,0,1]) parte(codo,dedo*.035,-.78,.018,.013,.105,.018);
    return {lado,cadera,rodilla,hombro,codo};
  });
  function posar(fase,pared,repelida,cargando=false,embiste=false,giroCabeza=0) {
    const paso=Math.sin(fase), tiron=Math.pow(Math.max(0,Math.cos(fase)),8);
    cuerpo.position.y=1.00+.055*Math.abs(paso)-.11*tiron;
    cuerpo.rotation.set(.12+.17*tiron,0,pared?.22:-.10-.08*paso);
    if(cargando || embiste) { cuerpo.position.y-=cargando?.25:.14; cuerpo.rotation.x+=cargando?.50:.78; }
    cuello.rotation.set(-.26+.22*tiron-(cargando?.55:0),giroCabeza+.17*Math.sin(fase*.5),.35+.14*tiron);
    quijada.position.y=-.083-(cargando || embiste?.10:.028*Math.max(0,paso));
    for(const {lado,cadera,rodilla,hombro,codo} of miembros) {
      const vaiven=lado*paso;
      cadera.rotation.set(-.67*vaiven,0,lado*(pared?.52:.09));
      rodilla.rotation.x=.92*Math.max(0,vaiven);
      hombro.rotation.set(repelida?-.92:.72*vaiven-.20,0,lado*(pared?1.0:.20+.12*tiron));
      codo.rotation.set(-.35-.55*Math.max(0,-vaiven),0,lado*(pared?.45:.06));
    }
  }
  return {raiz,posar};
}

// Guía por celdas libres cuando un edificio corta el camino directo.
function callejero(ciudad) {
  const paso=1.5, n=79, borde=(n-1)*paso/2;
  const libres=new Uint8Array(n*n);
  const x=id=>id%n*paso-borde, z=id=>Math.floor(id/n)*paso-borde;
  const id=(px,pz)=>Math.round((pz+borde)/paso)*n+Math.round((px+borde)/paso);
  const cajas=ciudad.colisiones;
  const libre=(px,pz)=>!cajas.some(c=>px>c.x0-.18&&px<c.x1+.18&&pz>c.z0-.18&&pz<c.z1+.18);
  const recta=(ax,az,bx,bz)=>{
    const pasos=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.55));
    for(let k=1;k<=pasos;k++) if(!libre(ax+(bx-ax)*k/pasos,az+(bz-az)*k/pasos)) return false;
    return true;
  };
  for(let i=0;i<libres.length;i++) libres[i]=libre(x(i),z(i))?1:0;
  const vecino=(px,pz)=>{
    const centro=id(px,pz); let mejor=-1,dist=Infinity;
    for(let j=-1;j<=1;j++) for(let k=-1;k<=1;k++) {
      const v=centro+j*n+k, d=Math.hypot(x(v)-px,z(v)-pz);
      if(libres[v] && d<dist && recta(px,pz,x(v),z(v))) {mejor=v;dist=d;}
    }
    return mejor;
  };
  const anterior=new Int16Array(n*n), cola=new Int16Array(n*n);
  return {libre,recta, destino(p,j) {
    if(recta(p.x,p.z,j.x,j.z)) return new THREE.Vector2(j.x,j.z);
    const inicio=vecino(p.x,p.z), fin=vecino(j.x,j.z);
    if(inicio<0 || fin<0) return null;
    anterior.fill(-1); anterior[inicio]=inicio;cola[0]=inicio; let usados=1;
    for(let i=0;i<usados && anterior[fin]<0;i++){
      const v=cola[i];
      for(const sig of [v-1,v+1,v-n,v+n]) {
        if(!libres[sig] || anterior[sig]!==-1 || Math.abs(x(v)-x(sig))>paso+.01) continue;
        anterior[sig]=v;cola[usados++]=sig;
      }
    }
    if(anterior[fin]<0) return null;
    let v=fin;
    while(v!==inicio && !recta(p.x,p.z,x(v),z(v))) v=anterior[v];
    return new THREE.Vector2(x(v),z(v));
  }};
}

export function crearSombra(escena,ciudad,audio) {
  const {raiz:m,posar}=figura(); escena.add(m);
  const s={m,activa:false,espera:0,vel:1.25,forzar:false,modo:'suelo'};
  let calles=null, fase=0, pared=null, tiempo=0, recarga=0, ruta=null, calcularEn=0;
  let acecho=0, pausaAtaque=0;
  function reiniciar(vueltas) {
    acecho=0; pausaAtaque=0;
    m.visible=false; m.position.set(0,-50,0); m.rotation.set(0,0,0); m.scale.setScalar(1);
    Object.assign(s,{activa:false,espera:vueltas?9:4,vel:1.25+Math.min(4,vueltas)*.15,forzar:false,modo:'suelo'});
    pared=null; fase=0; ruta=null; calcularEn=0; recarga=0;
  }
  function elegirMuro(j,cam) {
    let mejor=null, coste=Infinity;
    for(const f of ciudad.fachadas){
      const dx=j.x-f.x,dz=j.z-f.z;
      if(dx*f.nx+dz*f.nz<1) continue;
      const a=THREE.MathUtils.clamp(dx*f.nz-dz*f.nx,-4.3,4.3);
      const x=f.x+f.nz*a+f.nx*.65,z=f.z-f.nx*a+f.nz*.65;
      const d=Math.hypot(x-j.x,z-j.z);
      if(d<4 || d>27 || !calles.libre(x,z)) continue;
      const frente=((x-j.x)*Math.sin(cam)+(z-j.z)*Math.cos(cam))/d;
      const valor=Math.abs(d-11)-5*frente;
      if(valor<coste && calles.recta(x,z,j.x,j.z)) {mejor={f,a,x,z};coste=valor;}
    }
    return mejor;
  }
  function trepar(muro,desdeSuelo) {
    pared=muro; tiempo=desdeSuelo?0:.85; s.modo='muro'; ruta=null; acecho=0;
  }
  function actualizar(dt,j,cam,estado) {
    const p=m.position;
    if(!s.activa) {
      m.visible=false;
      if(estado.tiempoAfuera<=0 && !s.forzar) return 0;
      s.espera-=dt;
      if(s.espera>0) return 0;
      calles ??= callejero(ciudad);
      const muro=elegirMuro(j.pos,j.yawCam);
      if(!muro) { s.espera=.5; return 0; }
      s.activa=true; s.forzar=false; m.visible=true; trepar(muro,false);
    }
    m.visible=true;
    const distancia=Math.hypot(p.x-j.pos.x,p.z-j.pos.z);
    if(s.modo==='muro') {
      tiempo+=dt;
      const f=pared.f;
      const a=pared.a+1.1*Math.sin(tiempo*1.1);
      const altura=2.35*Math.min(1,tiempo/1.0,Math.max(0,(4.2-tiempo)/1.0));
      // Las losas y marquesinas sobresalen del paño de hormigón. La figura trepa por su borde exterior.
      const saliente=.65+.72*Math.min(1,altura);
      p.set(f.x+f.nz*a+f.nx*saliente,.15+altura,f.z-f.nx*a+f.nz*saliente);
      m.rotation.set(0,Math.atan2(f.nx,f.nz),0,'YXZ');m.rotation.z=.85*Math.min(1,altura);
      m.scale.set(1,1,1-.70*Math.min(1,altura));
      const haciaJugador=Math.atan2(j.pos.x-p.x,j.pos.z-p.z)-m.rotation.y;
      const mirar=THREE.MathUtils.clamp(Math.atan2(Math.sin(haciaJugador),Math.cos(haciaJugador)),-1.0,1.0);
      fase+=dt*5.5;posar(fase,true,false,false,false,mirar);
      if(tiempo>=2.9 && tiempo-dt<2.9) audio.arrastre(p,Math.hypot(p.x-j.pos.x,p.z-j.pos.z));
      if(tiempo>=4.2) {s.modo='suelo';recarga=10;calcularEn=0;m.scale.setScalar(1);m.rotation.z=0;}
      return Math.max(0,1-Math.hypot(p.x-j.pos.x,p.z-j.pos.z)/22)*.55;
    }
    if(distancia>40){s.activa=false;s.espera=6;m.visible=false;return 0;}
    const dx=j.pos.x-p.x, dz=j.pos.z-p.z;
    const delante=(dx*Math.sin(j.rumbo)+dz*Math.cos(j.rumbo)) < -distancia*.8;
    const repelida=j.linternaOn && delante && distancia<14 && calles.recta(p.x,p.z,j.pos.x,j.pos.z);
    recarga-=dt;calcularEn-=dt;
    if(calcularEn<=0) {ruta=calles.destino(p,j.pos);calcularEn=.38;}
    const vista = new THREE.Vector3(p.x,1.36,p.z).sub(cam.position).normalize();
    const visto = vista.dot(cam.getWorldDirection(new THREE.Vector3()))>.78;
    pausaAtaque=Math.max(0,pausaAtaque-dt);
    if(repelida) {
      acecho=0; pausaAtaque=3;
    } else if(acecho<=0 && pausaAtaque<=0 && distancia>2.7 && distancia<7.5 && calles.recta(p.x,p.z,j.pos.x,j.pos.z)) {
      // Primero se pliega y enseña la cara. Después recorre unos pasos de golpe.
      acecho=1.65; pausaAtaque=7;
      audio.arrastre(p,distancia);
    }
    const cargando=acecho>.80, embiste=acecho>0 && !cargando;
    acecho=Math.max(0,acecho-dt);
    const velocidad=repelida?-.9:cargando?0:embiste?4.9:distancia<2.6?2.4:visto?s.vel*.78:s.vel;
    fase+=dt*(repelida?3.0:cargando?.9:embiste?12:6.1);
    if(ruta || repelida){
      const tx=repelida?dx:ruta.x-p.x,tz=repelida?dz:ruta.y-p.z,d=Math.hypot(tx,tz);
      if(d>.01){
        const avance=Math.min(d,Math.abs(velocidad)*dt*(.55+.85*Math.abs(Math.cos(fase))))*Math.sign(velocidad);
        const x=p.x+tx/d*avance,z=p.z+tz/d*avance;
        if(calles.libre(x,z)) {p.x=x;p.z=z;} else calcularEn=0;
        m.rotation.y=Math.atan2(tx,tz);
      }
    }
    p.y=.15; posar(fase,false,repelida,cargando,embiste);
    if(distancia<.85 && !repelida && calles.recta(p.x,p.z,j.pos.x,j.pos.z)) estado.capturado();
    if(recarga<=0 && distancia>4 && !repelida){
      for(const f of ciudad.fachadas){
        const dx=p.x-f.x,dz=p.z-f.z,a=dx*f.nz-dz*f.nx,sep=dx*f.nx+dz*f.nz;
        if(sep>.2 && sep<1.15 && Math.abs(a)<4.4) {trepar({f,a},true);break;}
      }
    }
    return Math.max(0,1-distancia/22);
  }
  reiniciar(0);
  return {estado:s,actualizar,reiniciar};
}
