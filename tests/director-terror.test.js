import test from 'node:test';
import assert from 'node:assert/strict';
import {EVENTOS,elegirEvento,elegirRara,resolverDesenlace} from '../src/director-terror.js';

test('18 eventos únicos con duración y pesos válidos',()=>{
  assert.equal(EVENTOS.length,18);
  assert.equal(new Set(EVENTOS.map(e=>e.id)).size,18);
  assert.ok(EVENTOS.every(e=>e.dur>0 && (e.w>0 || e.rare>0)));
});
test('el director no repite eventos consumidos ni selecciona eventos raros por defecto',()=>{
  const usados=new Set();
  for(let i=0;i<14;i++){
    const e=elegirEvento({conducta:'radio',usados,tension:.2,azar:()=>.4});
    assert.ok(e && !e.rare && !usados.has(e.id));
    usados.add(e.id);
  }
  assert.equal(elegirEvento({conducta:'radio',usados,tension:.2}),null);
});
test('las rarezas conservan los intervalos de probabilidad de sesión',()=>{
  assert.equal(elegirRara(()=>0).id,'ojo');
  assert.equal(elegirRara(()=>.006).id,'congregacion');
  assert.equal(elegirRara(()=>.026).id,'transmision');
  assert.equal(elegirRara(()=>.036).id,'vacio');
  assert.equal(elegirRara(()=>.039),null);
});
test('los tres desenlaces dependen de las pruebas y de la fotografía',()=>{
  assert.equal(resolverDesenlace(false,new Set(['puerta','archivo'])),'RECONSTRUCCIÓN');
  assert.equal(resolverDesenlace(true,new Set()),'RECONOCIMIENTO');
  assert.equal(resolverDesenlace(true,new Set(['puerta'])),'RECONOCIMIENTO');
  for(const prueba of ['archivo','transmision','cadaver']){
    assert.equal(resolverDesenlace(true,new Set(['puerta',prueba])),'RECHAZO DEL PROTOCOLO');
  }
});
