import * as THREE from 'three';
import { azar } from './ciudad.js';

function esmalte(color, semilla) {
  const r = azar(semilla);
  const c = document.createElement('canvas');
  c.width = 192; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  const mugre = g.createLinearGradient(0, 0, 0, 96);
  mugre.addColorStop(0, 'rgba(223,213,175,.17)'); mugre.addColorStop(.66, 'rgba(98,86,66,.09)'); mugre.addColorStop(1, 'rgba(51,38,29,.76)');
  g.fillStyle = mugre; g.fillRect(0, 0, 192, 96);
  for (let k=0; k<350; k++) {
    const x=r()*192, y=96*(1-r()**3);
    g.fillStyle=r()<.66?'rgba(94,52,30,.58)':'rgba(211,194,157,.43)';
    g.fillRect(x,y,1+4*r(),1+1.8*r());
  }
  const mapa=new THREE.CanvasTexture(c); mapa.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({map:mapa,side:THREE.DoubleSide});
}

export function prepararAutos(m) {
  ['#69867e','#bca986','#824e40','#6f8290'].forEach((c,i)=>m['chapa'+i]=esmalte(c,150+i));
  const tonos={cristalAuto:0x354441, cromo:0xaaa99b, faroAuto:0xb5ad83, pilotoAuto:0x793729, intermitente:0x946430};
  for (const [k,color] of Object.entries(tonos)) m[k]=new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide});
}

// Las coordenadas del modelo están en metros, con el capó hacia +z.
export function montarAuto(poner, x, z, rumbo, indice) {
  const chapa='chapa'+(indice%4);
  const familiar=indice%3===1;
  function pieza(mat,geo) { poner(mat,geo,x,0,z,rumbo); }
  function caja(mat,px,y,pz,w,h,d,rz=0) {
    pieza(mat,new THREE.BoxGeometry(w,h,d).rotateZ(rz).translate(px,y,pz));
  }
  function cara(mat,a,b,c,d) {
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...d],3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
    geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();pieza(mat,geo);
  }
  // Secciones de la chapa. Los extremos se estrechan y el capó cae hacia los faros.
  const secciones=[[-2.02,.75,.84],[-1.80,.86,.94],[-1.22,.89,.97],[.80,.89,.94],[1.82,.83,.85],[2.02,.73,.74]];
  for(let i=1;i<secciones.length;i++){
    const [a,wa,ha]=secciones[i-1], [b,wb,hb]=secciones[i];
    cara(chapa,[-wa,ha,a],[-wa,hb,b],[wb,hb,b],[wa,ha,a]);
    for(const s of [-1,1]) cara(chapa,[s*(wa-.07),.40,a],[s*(wb-.07),.40,b],[s*wb,hb,b],[s*wa,ha,a]);
  }
  const zCola=familiar?-1.77:-1.36, zTecho=familiar?-1.62:-.94;
  const h=familiar?1.57:1.49;
  // Luneta, parabrisas, ventanillas inscritas en el marco y parante central.
  cara('cristalAuto',[-.79,.95,.83],[.79,.95,.83],[.67,h,.28],[-.67,h,.28]);
  cara('cristalAuto',[.81,.97,zCola],[-.81,.97,zCola],[-.67,h,zTecho],[.67,h,zTecho]);
  caja(chapa,0,h+.025,(zTecho+.28)/2,1.40,.075,.28-zTecho+.09);
  for(const s of [-1,1]){
    const a=[s*.83,.95,zCola],b=[s*.83,.95,.83],c=[s*.67,h,.28],d=[s*.67,h,zTecho];
    cara('cristalAuto',a,b,c,d);
    const marco=(p,q,mat,ancho)=>{
      const v=new THREE.Vector3(...p), w=new THREE.Vector3(...q), delta=w.clone().sub(v);
      const geo=new THREE.CylinderGeometry(ancho,ancho,delta.length(),5);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
      pieza(mat,geo.translate(...v.add(w).multiplyScalar(.5).toArray()));
    };
    marco(a,d,chapa,.044); marco(b,c,chapa,.045); marco(a,b,'cromo',.018);
    marco([s*.83,.95,-.32],[s*.67,h,-.32],chapa,.041);
    for (const pz of [-.32,-1.0]) caja('cromo',s*.875,.82,pz,.036,.032,.13);
    caja('goma',s*.871,.58,-.06,.027,.035,3.44);
    caja(chapa,s*.93,1.04,.50,.19,.11,.12);
    for(const eje of [-1.26,1.26]){
      const rueda=(mat,radio,grosor,lateral)=>pieza(mat,new THREE.CylinderGeometry(radio,radio,grosor,14).rotateZ(Math.PI/2).translate(s*lateral,.32,eje));
      rueda('goma',.315,.20,.83); rueda('cromo',.181,.027,.936); rueda('oscuro',.085,.034,.950);
    }
  }
  for(const signo of [-1,1]){
    const zz=signo*2.025;
    caja(chapa,0,.61,zz,1.48,.35,.05);
    caja('cromo',0,.44,zz+signo*.042,1.61,.09,.09);
    caja('oscuro',0,.64,zz+signo*.034,.62,.17,.025);
    for(const lado of [-1,1]){
      caja(signo===1?'faroAuto':'pilotoAuto',lado*.55,.70,zz+signo*.037,.32,.146,.04);
      caja('intermitente',lado*.71,.70,zz+signo*.037,.07,.135,.045);
    }
    if(signo===1) for(let j=0;j<3;j++) caja('cromo',0,.60+j*.042,zz+.055,.56,.009,.014);
    caja('faroAuto',0,.49,zz+signo*.097,.28,.083,.012);
  }
  for(const dx of [-.36,.32]) caja('goma',dx,1.01,.775,.36,.019,.025,-.045);
}
