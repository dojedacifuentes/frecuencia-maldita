// Sustos de pantalla: el rostro que salta (imagen de Flow, s_grito.jpg), el temblor de cámara y el golpe de sonido.
// Lo usan el sanatorio (la mirilla), el cerro (el pasajero del ascensor) y la ciudad.
export function crearSustos({ audio, estadoJuego }) {
  const marco = document.getElementById('marco');
  const cara = document.createElement('img');
  cara.src = '/assets/s_grito.jpg'; cara.alt = ''; cara.setAttribute('aria-hidden', 'true');
  Object.assign(cara.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', zIndex: '8',
    display: 'none', pointerEvents: 'none', filter: 'contrast(1.35) saturate(0.55)', imageRendering: 'pixelated' });
  marco.append(cara);
  let reloj = 0, hasta = 0, temblor = 0;

  // el rostro encima de todo, con grito y temblor
  function rostro(seg = 0.6) {
    hasta = reloj + seg; cara.style.display = 'block';
    cara.style.transform = `scale(${1.05 + Math.random() * 0.1}) rotate(${(Math.random() - 0.5) * 4}deg)`;
    estadoJuego.susto(1);
    audio.golpe(1.6); audio.rechinar(); audio.susurro(0.6);
    temblor = Math.max(temblor, 0.8);
  }
  function temblar(v = 0.5) { temblor = Math.max(temblor, v); }

  // después de mover la cámara (jugador.actualizar) y antes de dibujar
  function actualizar(dt, camara) {
    reloj += dt;
    if (cara.style.display === 'block' && reloj > hasta) cara.style.display = 'none';
    if (temblor > 0) {
      temblor = Math.max(0, temblor - dt * 1.4);
      camara.position.x += (Math.random() - 0.5) * temblor * 0.35;
      camara.position.y += (Math.random() - 0.5) * temblor * 0.35;
      camara.rotation.z += (Math.random() - 0.5) * temblor * 0.06;
    }
  }
  function limpiar() { cara.style.display = 'none'; temblor = 0; }
  return { rostro, temblar, actualizar, limpiar };
}
