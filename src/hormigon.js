import * as THREE from 'three';

// Un paño de encofrado, de cuatro metros de lado. Comparte el mapa entre los bloques de una misma altura.
export function prepararHormigon(azar) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 256;
  const g = lienzo.getContext('2d');
  const imagen = g.createImageData(256,256);
  for(let y=0;y<256;y++) for(let x=0;x<256;x++){
    const i=(y*256+x)*4;
    const veta=2.3*Math.sin(y*.31+Math.sin(x*.024)) + 3*Math.cos(x*.07+y*.05);
    const tono=153+veta+12*(azar()-.5);
    imagen.data.set([tono+6,tono+3,tono-5,255],i);
  }
  g.putImageData(imagen,0,0);
  for(let k=0;k<8;k++) {
    const y=k*32;
    g.fillStyle='rgba(54,52,44,.29)';g.fillRect(0,y,256,k%4===0?2:1);
    g.fillStyle='rgba(224,214,184,.22)';g.fillRect(0,y+2,256,1);
  }
  for(const x of [18,127,238]) for(const y of [17,145]) {
    g.fillStyle='#736e62';g.beginPath();g.arc(x,y,2,0,Math.PI*2);g.fill();
    const grad=g.createLinearGradient(x,y,x,y+45);
    grad.addColorStop(0,'rgba(84,65,45,.55)');grad.addColorStop(1,'rgba(92,81,58,0)');
    g.fillStyle=grad;g.fillRect(x-1,y+1,2,45);
  }
  g.fillStyle='rgba(66,60,51,.38)';g.fillRect(0,0,2,256);
  // El agua baja a ritmos distintos por cada junta. Quedan bordes claros de salitre al secarse.
  for (let k=0;k<110;k++) {
    const x=azar()*256, inicio=azar()<.55?0:128, largo=10+azar()**2*105;
    const grad=g.createLinearGradient(0,inicio,0,inicio+largo);
    grad.addColorStop(0,'rgba(72,65,48,.16)');grad.addColorStop(1,'rgba(74,67,50,0)');
    g.fillStyle=grad;g.fillRect(x,inicio,1+azar()**2*7,largo);
  }
  for (let k=0;k<1200;k++) {
    const x=azar()*256, y=azar()*256;
    const borde=202+17*Math.sin(x*.035)+11*Math.cos(x*.083);
    if(y>borde) {
      g.fillStyle=y<borde+4?'rgba(222,211,181,.50)':'rgba(86,91,64,.22)';
      g.fillRect(x,y,1+azar()*3,1+azar()*2);
    }
  }
  const origen=new THREE.CanvasTexture(lienzo);
  origen.colorSpace=THREE.SRGBColorSpace;
  origen.wrapS=origen.wrapT=THREE.RepeatWrapping;
  const cache=new Map();
  return (ancho,alto)=>{
    const clave=ancho+'/'+alto;
    if(!cache.has(clave)){
      const mapa=origen.clone();mapa.repeat.set(ancho/4,alto/4);mapa.anisotropy=4;mapa.needsUpdate=true;
      cache.set(clave,new THREE.MeshLambertMaterial({map:mapa,color:0xc0baae}));
    }
    return cache.get(clave);
  };
}
