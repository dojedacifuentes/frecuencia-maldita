import * as THREE from 'three';
import { azar } from './ciudad.js';

// Impresos y cercos se dibujan una sola vez, como las demás texturas del barrio.
function lamina(ancho, alto, dibujar) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  dibujar(c.getContext('2d'), ancho, alto);
  const mapa = new THREE.CanvasTexture(c);
  mapa.colorSpace = THREE.SRGBColorSpace;
  mapa.magFilter = THREE.NearestFilter;
  return new THREE.MeshLambertMaterial({ map: mapa, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
}

export function vestirBarrio(ciudad, poner, materiales) {
  const r = azar(1978);
  materiales.vidrio = new THREE.MeshLambertMaterial({color:0x35444a});
  materiales.ambar = new THREE.MeshBasicMaterial({color:0xba8650});

  const ventana = (encendida) => lamina(160,96,(g,w,h)=>{
    const vidrio=g.createLinearGradient(0,0,w,h);
    vidrio.addColorStop(0,encendida?'#ddbd82':'#536263');vidrio.addColorStop(.6,encendida?'#a3825b':'#283938');vidrio.addColorStop(1,encendida?'#785e48':'#465250');
    g.fillStyle=vidrio;g.fillRect(0,0,w,h);
    for(let lado=0;lado<2;lado++) {
      for(let a=0;a<20;a++){
        g.fillStyle=a%4<2?(encendida?'#a19477':'#777f72'):(encendida?'#c6b594':'#59665d');
        g.beginPath();g.moveTo(lado?w-a*2:a*2,0);g.lineTo(lado?w-a*1.28:a*1.28,74+Math.sin(a)*2);
        g.lineTo(lado?w-a*1.28-2:a*1.28+2,75);g.lineTo(lado?w-a*2-3:a*2+3,0);g.fill();
      }
    }
    g.fillStyle='#363b34';g.fillRect(77,0,5,h);g.fillRect(0,18,w,4);g.fillRect(0,h-5,w,5);
  });
  materiales.cortina=ventana(false);materiales.ventanaCalida=ventana(true);
  materiales.ventanaCalida.emissive.setHex(0xb28c56);
  materiales.ventanaCalida.emissiveMap=materiales.ventanaCalida.map;
  materiales.ventanaCalida.emissiveIntensity=.55;
  materiales.baldosin=new THREE.MeshLambertMaterial({color:0x63766c});
  materiales.persiana=lamina(192,128,(g,w,h)=>{
    g.fillStyle='#88877b';g.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=6){g.fillStyle='#60665c';g.fillRect(0,y,w,2);g.fillStyle='#a9a697';g.fillRect(0,y+2,w,1);}
    for(let i=0;i<420;i++){g.fillStyle='rgba(110,73,43,.25)';g.fillRect(r()*w,h*r(),1,2+10*r());}
  });
  materiales.almacen=lamina(480,96,(g,w,h)=>{
    g.fillStyle='#224e49';g.fillRect(0,0,w,h);g.strokeStyle='#b3ad87';g.lineWidth=3;g.strokeRect(5,5,w-10,h-10);
    g.fillStyle='#e5d6a6';g.textAlign='center';g.font='bold 45px Georgia';g.fillText('EL TRÉBOL',240,52);
    g.font='bold 17px monospace';g.fillText('ALMACÉN   ·   PAN   ·   ABARROTES',240,78);
    for(let i=0;i<700;i++){g.fillStyle='rgba(116,106,84,.45)';g.fillRect(r()*w,r()*h,1+3*r(),1);}
  });
  materiales.citofono=lamina(64,96,(g,w,h)=>{
    g.fillStyle='#797969';g.fillRect(0,0,w,h);
    for(let i=0;i<6;i++){g.fillStyle='#2c332b';g.fillRect(9,7+i*3,44,1);}
    for(let i=0;i<6;i++){g.fillStyle='#d9ccaa';g.fillRect(6,31+i*9,38,6);g.fillStyle='#45453a';g.fillRect(47,32+i*9,8,4);g.fillRect(9,33+i*9,9+i*2,1);}
  });

  materiales.chorreado = lamina(96, 128, (g,w,h) => {
    for(let k=0;k<220;k++) {
      const x = (r()+r()+r())/3*w, largo = h*(0.12+r()**2*.87);
      const tono = r() < .33 ? '95,47,24' : '45,47,36';
      const grad = g.createLinearGradient(0,0,0,largo);
      grad.addColorStop(0,'rgba('+tono+',0.46)'); grad.addColorStop(1,'rgba('+tono+',0)');
      g.fillStyle=grad; g.fillRect(x,0,1+r()*4,largo);
    }
  });
  for (const [i,f] of ciudad.fachadas.entries()) {
    const ry=Math.atan2(f.nx,f.nz);
    const caja=(key,a,y,o,w,h,d)=>poner(key,new THREE.BoxGeometry(w,h,d), f.x+a*f.nz+o*f.nx,y,f.z-a*f.nx+o*f.nz,ry);
    const placa=(key,a,y,o,w,h)=>poner(key,new THREE.PlaneGeometry(w,h),f.x+a*f.nz+o*f.nx,y,f.z-a*f.nx+o*f.nz,ry);
    // Una familia de bloques con galerías corridas; la planta baja queda libre para las interacciones.
    if (Math.floor(i/4)%3 !== 1 || (f.nz===1 && Math.abs(f.x)<1)) {
      for(let y=4.4; y < f.alto-0.4; y+=3.5) {
        caja('oscuro',0,y+.6,.10,12.2,1.5,.18);
        for (let a=-5;a<=5;a+=2) {
          const suerte=r();
          caja(suerte<.18?'ambar':'vidrio',a,y+.64,.22,1.72,1.05,.08);
          placa(suerte<.18?'ventanaCalida':'cortina',a,y+.64,.267,1.64,1.01);
          if (suerte>.68 && y<9){
            caja('concreto',a,y-.10,.65,1.73,.43,.72);
            caja('oxido',a,y+.51,.99,1.78,.045,.04);
            for (const dx of [-.73,0,.73]) caja('oscuro',a+dx,y+.23,.99,.035,.53,.035);
            if(suerte>.84){ caja('baldosin',a-.30,y+.04,.84,.35,.28,.27); caja('papel',a+.17,y+.29,1.02,.41,.44,.04);}
          }
          caja('concreto',a-.95,y+.65,.39,.19,1.85,.82);
        }
        caja('concreto',0,y-.27,.50,13.4,.53,1.12);
        if (r()<.48) placa('chorreado',r()*8-4,y-1.30,.09,1.6,1.8);
      }
    }
    // El frente del bloque 03 se reconoce desde la puerta del baño.
    if(Math.abs(f.x)<.1 && Math.abs(f.z-28.4)<.1 && f.nz===1) {
      placa('persiana',3.76,1.21,.11,4.28,2.16);
      caja('baldosin',3.76,2.66,.31,4.68,.28,.77);
      placa('almacen',3.76,2.83,.72,4.48,.88);
      for(const a of [1.53,5.99]) caja('baldosin',a,1.28,.22,.18,2.51,.40);
      caja('oscuro',-.56,1.22,.10,1.90,2.40,.17);
      caja('vidrio',-.56,1.50,.20,1.57,1.71,.075);
      caja('baldosin',-.56,.43,.22,1.57,.46,.09);
      caja('cromo',-.56,1.26,.26,.035,2.22,.03);
      caja('cromo',-.28,.97,.29,.04,.33,.045);
      placa('citofono',.56,1.43,.13,.225,.34);
      caja('ambar',-.56,2.49,.31,.63,.065,.20);
    }
    if (i%3===0) placa('chorreado',4.3,1.63,.065,1.2,2.9);
  }

  // Pasarelas altas: entre dos bloques, cruzando calles transitables.
  for(const [x,z] of [[-11,22],[11,-22]]) {
    poner('concreto',new THREE.BoxGeometry(10.7,.72,2.5),x,7.1,z);
    for(const dz of [-1.13,1.13]) {
      poner('concreto',new THREE.BoxGeometry(10.7,.85,.23),x,7.85,z+dz);
      poner('oxido',new THREE.BoxGeometry(10.7,.07,.09),x,8.56,z+dz);
      for(let dx=-5;dx<=5;dx+=1) poner('oxido',new THREE.BoxGeometry(.055,.48,.055),x+dx,8.36,z+dz);
    }
  }
  // Murales de orientación originales en el bloque frente al baño y en la plaza.
  for (const [x,z,num,nombre] of [[0,22,'03','UNIDAD VECINAL'],[0,-22,'09','PABELLÓN NORTE']]) {
    const clave='mural'+num;
    materiales[clave]=lamina(384,144,(g,w,h)=>{
      g.fillStyle='#aaa38b';g.fillRect(0,0,w,h);
      g.fillStyle='#984f34';g.fillRect(0,0,122,h);
      g.fillStyle='#e0d4ae';g.font='bold 88px Arial';g.fillText(num,9,102);
      g.fillStyle='#353d3a';g.font='bold 28px Arial';g.fillText(nombre,133,57);
      g.fillRect(134,69,226,3);g.font='17px monospace';g.fillText('HABITACIONES  /  1978',134,99);
      for(let i=0;i<4200;i++){g.fillStyle=r()<.5?'rgba(48,43,35,.24)':'rgba(214,207,186,.45)';g.fillRect(r()*w,r()*h,r()*4+1,1);}
    });
    poner('concreto',new THREE.BoxGeometry(8.8,2.35,1.18),x,5.47,z+6.99);
    poner(clave,new THREE.PlaneGeometry(8.55,2.20),x,5.47,z+7.60);
  }
}

export function equiparBano(grupo,b) {
  const r=azar(3173), x=b.centro.x, z=b.muroSur;
  const metal=new THREE.MeshLambertMaterial({color:0x535b51});
  const baquelita=new THREE.MeshLambertMaterial({color:0x47382d});
  const marfil=new THREE.MeshLambertMaterial({color:0xbcaa7e});
  const negro=new THREE.MeshLambertMaterial({color:0x262723});
  const luz=new THREE.MeshBasicMaterial({color:0xffaf47});
  function pieza(padre,mat,w,h,d,px,py,pz) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(px,py,pz);padre.add(m);return m;
  }
  pieza(grupo,metal,1,.075,.46,x-.82,1.24,z-.36);
  const radio=new THREE.Group();
  radio.position.set(x-.82,1.29,z-.39);
  radio.rotation.y=-.14;grupo.add(radio);
  pieza(radio,baquelita,.69,.38,.21,0,.19,0);
  for(let i=0;i<9;i++) pieza(radio,marfil,.29,.012,.017,.13,.09+i*.027,-.11);
  pieza(radio,negro,.25,.11,.02,-.18,.27,-.11);
  pieza(radio,luz,.19,.028,.015,-.18,.27,-.126);
  pieza(radio,marfil,.065,.065,.035,-.24,.11,-.12);
  pieza(radio,marfil,.065,.065,.035,-.11,.11,-.12);
  pieza(radio,metal,.018,.36,.018,-.24,.52,0).rotation.z=.18;
  const cerco=lamina(128,128,(g,w,h)=>{
    for(let i=0;i<2500;i++){
      const a=r()*Math.PI*2,rad=8+r()**1.6*49;
      g.fillStyle=r()<.6?'rgba(66,56,36,.15)':'rgba(37,43,32,.14)';
      g.fillRect(w/2+Math.cos(a)*rad,h/2+Math.sin(a)*rad,1+r()*5,1+r()*2);
    }
    // Pelos apelmazados junto a la rejilla.
    for(let i=0;i<21;i++){
      const px=56+r()*21,py=53+r()*24;g.strokeStyle='rgba(42,32,25,.85)'; g.lineWidth=.9+r()*.7;
      g.beginPath();g.moveTo(px,py);g.bezierCurveTo(px-28*r(),py-22*r(),px+34*r(),py+9,px+28*r(),py+18*r());g.stroke();
    }
  });
  const drenaje=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),cerco);
  drenaje.rotation.x=-Math.PI/2;drenaje.position.set(x+.85,.175,z-1.73);grupo.add(drenaje);
  pieza(grupo,negro,.22,.014,.23,drenaje.position.x,.172,drenaje.position.z);
  for(let i=-2;i<=2;i++) pieza(grupo,metal,.016,.014,.225,drenaje.position.x+i*.041,.181,drenaje.position.z);
  // La descarga dejó una aureola de sarro y una lengua de óxido bajo cada urinario.
  const sarro=lamina(80,120,(g,w,h)=>{
    for(let i=0;i<900;i++){
      const y=r()*h, ancho=(1-y/h)*19+3;
      g.fillStyle=r()<.45?'rgba(129,77,40,.21)':'rgba(103,99,65,.16)';
      g.fillRect(w/2+(r()+r()-1)*ancho,y,.7+r()*2,2+r()*6);
    }
  });
  for(const dx of [-1.6,0,1.6]) {
    const mancha=new THREE.Mesh(new THREE.PlaneGeometry(.85,1.5),sarro);
    mancha.rotation.y=Math.PI;mancha.position.set(x+dx,1.05,z-.113);grupo.add(mancha);
    pieza(grupo,metal,.062,.45,.065,x+dx,1.45,z-.21);
    pieza(grupo,marfil,.13,.085,.12,x+dx,1.66,z-.22);
  }
  return radio;
}
