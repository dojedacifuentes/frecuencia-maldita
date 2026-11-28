// Todo el sonido se genera en vivo (Web Audio), sin archivos: viento y zumbido, lluvia, la radio con su estática y el
// tono de 317 Hz, pasos, ratas, el teléfono, la sirena, el corazón, las teclas de la máquina de escribir y los tres
// pulsos. Un analizador alimenta las barras de frecuencia de la pantalla.
import * as THREE from 'three';

export function crearAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const salida = ctx.createGain(); salida.gain.value = 0.9;
  const analizador = ctx.createAnalyser(); analizador.fftSize = 256; analizador.smoothingTimeConstant = 0.6;
  const limitador = ctx.createDynamicsCompressor();
  limitador.threshold.value = -10; limitador.ratio.value = 12;
  salida.connect(limitador).connect(analizador).connect(ctx.destination);

  const oyente = { pos: new THREE.Vector3(), der: new THREE.Vector3(1, 0, 0) };
  function setOyente(camara) {
    oyente.pos.copy(camara.position);
    oyente.der.set(1, 0, 0).applyQuaternion(camara.quaternion);
  }

  function ruido(seg) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seg), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  const RUIDO = ruido(3);
  function fuenteRuido(loop = true) {
    const s = ctx.createBufferSource(); s.buffer = RUIDO; s.loop = loop; return s;
  }
  function filtro(tipo, f, q = 0.7) { const x = ctx.createBiquadFilter(); x.type = tipo; x.frequency.value = f; x.Q.value = q; return x; }
  function ganancia(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function paneo(pos) {
    const p = ctx.createStereoPanner();
    if (pos) {
      const d = new THREE.Vector3().subVectors(pos, oyente.pos);
      const dist = d.length() || 1;
      p.pan.value = Math.max(-1, Math.min(1, d.dot(oyente.der) / dist));
    }
    return p;
  }
  function volDist(dist, ref = 3) { return Math.min(1, ref / Math.max(ref, dist)); }

  // ---- lechos continuos
  const lechos = {};
  let vozNivel = 0;
  function voz(n) { vozNivel = n; }
  // la bocina del tren: dos notas desafinadas, largas, que retumban
  function bocina() {
    const t = ctx.currentTime;
    for (const f of [196, 247, 251]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const fl = filtro('lowpass', 900); const g = ganancia(0);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
      g.gain.setValueAtTime(0.09, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(fl).connect(g).connect(salida); o.start(t); o.stop(t + 1.65);
    }
  }
  // patitas: tres golpecitos secos, muy bajos
  function patitas(dist) {
    const v = volDist(dist, 1) * 0.035;
    for (let k = 0; k < 3; k++) {
      const t = ctx.currentTime + k * 0.045 + Math.random() * 0.02;
      const s = fuenteRuido(false); const f = filtro('highpass', 3500); const g = ganancia(0);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      s.connect(f).connect(g).connect(salida); s.start(t); s.stop(t + 0.03);
    }
  }
  // el hilo de la araña que baja: un roce agudo que cae
  function hilo() {
    const t = ctx.currentTime, s = fuenteRuido(false); const f = filtro('bandpass', 5000, 3); const g = ganancia(0);
    f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(1800, t + 1.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    s.connect(f).connect(g).connect(salida); disparo(s, 1.4);
  }
  // un susurro corto (la voz de las emisoras, a media voz)
  function susurro(seg = 0.8) {
    const antes = vozNivel; vozNivel = Math.max(vozNivel, 0.5);
    setTimeout(() => { vozNivel = antes; }, seg * 1000);
  }
  // Uñas sobre cemento: un roce corto situado en la pared o en la calle.
  function arrastre(pos, dist) {
    const t=ctx.currentTime, pn=paneo(pos), ruido=fuenteRuido(false);
    const filtroRoce=filtro('bandpass',1350,3.5), volumen=ganancia(.0001);
    const nivel=.17*volDist(dist,4);
    filtroRoce.frequency.exponentialRampToValueAtTime(430,t+.48);
    volumen.gain.exponentialRampToValueAtTime(Math.max(.001,nivel),t+.05);
    volumen.gain.exponentialRampToValueAtTime(.0001,t+.55);
    ruido.connect(filtroRoce).connect(volumen).connect(pn).connect(salida);
    ruido.onended=()=>{pn.disconnect();volumen.disconnect();filtroRoce.disconnect();};
    ruido.start(t);ruido.stop(t+.57);
  }
  // golpes desde adentro de una puerta, con dirección
  function golpes(pos, dist) {
    const v = volDist(dist, 3) * 0.55, pn = paneo(pos); pn.connect(salida);
    for (let k = 0; k < 3; k++) {
      const t = ctx.currentTime + k * 0.3 + Math.random() * 0.05;
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      const g = ganancia(0); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(pn); o.start(t); o.stop(t + 0.2);
    }
  }
  // una radio lejana (el carrito): un chasquido de estática y el tono 317
  function radioLejana(pos, dist) {
    const v = volDist(dist, 4) * 0.13;
    if (v < 0.004) return;
    const t = ctx.currentTime, pn = paneo(pos); pn.connect(salida);
    const s = fuenteRuido(false); const f = filtro('bandpass', 1400 + Math.random() * 900, 1.2); const g = ganancia(0);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.connect(f).connect(g).connect(pn); disparo(s, 0.4);
    const o = ctx.createOscillator(); o.frequency.value = 317; const og = ganancia(0);
    og.gain.setValueAtTime(v * 0.6, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(og).connect(pn); o.start(t); o.stop(t + 0.32);
  }
  // un pitido en 951 Hz (tres veces 317): la señal de la mancha más cercana
  function bip(p) {
    const t = ctx.currentTime; const o = ctx.createOscillator(); o.frequency.value = 951;
    const g = ganancia(0); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04 + 0.08 * p, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(salida); o.start(t); o.stop(t + 0.1);
  }
  function iniciar() {
    if (lechos.ok) return;
    lechos.ok = true;
    // viento
    const v = fuenteRuido(); const vf = filtro('lowpass', 420); const vg = ganancia(0.07);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lfg = ganancia(160);
    lfo.connect(lfg).connect(vf.frequency); lfo.start();
    v.connect(vf).connect(vg).connect(salida); v.start();
    // zumbido grave (dos sierras desafinadas)
    const zg = ganancia(0.035); const zf = filtro('lowpass', 300);
    for (const f of [41.2, 41.9, 49.0]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(zf); o.start(); }
    zf.connect(zg).connect(salida);
    // lluvia
    const ll = fuenteRuido(); const llf = filtro('highpass', 2500); const llg = ganancia(0.022);
    ll.connect(llf).connect(llg).connect(salida); ll.start();
    // radio: estática + tono 317
    const est = fuenteRuido(); const ef = filtro('bandpass', 2200, 0.6); const eg = ganancia(0);
    est.connect(ef).connect(eg).connect(salida); est.start();
    const t317 = ctx.createOscillator(); t317.frequency.value = 317; const tg = ganancia(0);
    t317.connect(tg).connect(salida); t317.start();
    // tubo del baño
    const tubo = ctx.createOscillator(); tubo.type = 'square'; tubo.frequency.value = 100;
    const tf = filtro('lowpass', 900); const tbg = ganancia(0);
    tubo.connect(tf).connect(tbg).connect(salida); tubo.start();
    // voz de las emisoras: ruido por dos filtros que se mueven como vocales, cortado en sílabas
    const vz = fuenteRuido(); const vf1 = filtro('bandpass', 700, 3); const vf2 = filtro('bandpass', 1700, 4); const vzg = ganancia(0);
    vz.connect(vf1).connect(vzg); vz.connect(vf2).connect(vzg); vzg.connect(salida); vz.start();
    setInterval(() => {
      const t = ctx.currentTime;
      if (vozNivel > 0) {
        const amp = Math.random() < 0.78 ? (0.05 + Math.random() * 0.07) * vozNivel : 0;
        vzg.gain.setTargetAtTime(amp, t, 0.025);
        vf1.frequency.setTargetAtTime(450 + Math.random() * 600, t, 0.03);
        vf2.frequency.setTargetAtTime(1300 + Math.random() * 900, t, 0.03);
      } else vzg.gain.setTargetAtTime(0, t, 0.05);
    }, 110);
    Object.assign(lechos, { estatica: eg, filtroEstatica: ef, tono: tg, tubo: tbg, viento: vg, zumbido: zg });
    iniciarFiesta();
  }

  function radio(estatica, tono, fdial) {
    if (!lechos.ok) return;
    const t = ctx.currentTime;
    lechos.estatica.gain.setTargetAtTime(Math.min(0.5, estatica), t, 0.08);
    lechos.tono.gain.setTargetAtTime(tono * 0.16, t, 0.05);
    lechos.filtroEstatica.frequency.setTargetAtTime(900 + fdial * 30, t, 0.1);
  }
  function bano(v) { if (lechos.ok) lechos.tubo.gain.setTargetAtTime(v * 0.025, ctx.currentTime, 0.3); }

  // ---- eventos cortos
  function disparo(nodo, dur) { nodo.start(); nodo.stop(ctx.currentTime + dur); }

  function paso(corriendo) {
    const s = fuenteRuido(false); const f = filtro('bandpass', corriendo ? 700 : 450, 1.2); const g = ganancia(0);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(corriendo ? 0.22 : 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(f).connect(g).connect(salida); disparo(s, 0.16);
  }

  function chillido(pos, dist) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const t = ctx.currentTime; const f0 = 2600 + Math.random() * 1800;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.35, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.12);
    const bp = filtro('bandpass', 3200, 2); const g = ganancia(0);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * volDist(dist, 2), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(bp).connect(g).connect(paneo(pos)).connect(salida); disparo(o, 0.15);
  }
  function chillidos(pos, n) {
    for (let k = 0; k < n; k++) setTimeout(() => chillido(pos, 5 + Math.random() * 6), k * 60 + Math.random() * 300);
    // correteo: ruido entrecortado
    const s = fuenteRuido(false); const f = filtro('bandpass', 1800, 0.8); const g = ganancia(0.0);
    const t = ctx.currentTime;
    for (let k = 0; k < 40; k++) g.gain.setValueAtTime(k % 2 ? 0.0 : 0.05, t + k * 0.045);
    g.gain.setValueAtTime(0, t + 2);
    s.connect(f).connect(g).connect(salida); disparo(s, 2.1);
  }

  function timbre(dist) {
    const t = ctx.currentTime;
    for (const k of [0, 0.4]) {
      const o = ctx.createOscillator(); o.frequency.value = 425;
      const am = ctx.createOscillator(); am.frequency.value = 25; const amg = ganancia(0.5);
      const g = ganancia(0);
      am.connect(amg).connect(g.gain);
      g.gain.setValueAtTime(0.0, t + k); g.gain.linearRampToValueAtTime(0.12 * volDist(dist, 4), t + k + 0.02);
      g.gain.setValueAtTime(0.12 * volDist(dist, 4), t + k + 0.32); g.gain.linearRampToValueAtTime(0, t + k + 0.36);
      o.connect(g).connect(salida); o.start(t + k); am.start(t + k); o.stop(t + k + 0.4); am.stop(t + k + 0.4);
    }
  }

  function golpe(v = 1) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
    const g = ganancia(0); g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(salida); disparo(o, 1);
    const s = fuenteRuido(false); const f = filtro('highpass', 900); const g2 = ganancia(0);
    g2.gain.setValueAtTime(0.35 * v, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    s.connect(f).connect(g2).connect(salida); disparo(s, 0.3);
    const m = ctx.createOscillator(); m.frequency.value = 311; const g3 = ganancia(0);
    g3.gain.setValueAtTime(0.12 * v, t); g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    m.connect(g3).connect(salida); disparo(m, 0.7);
  }

  function chirrido() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(2400, t); o.frequency.linearRampToValueAtTime(2900, t + 0.3);
    const g = ganancia(0); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(filtro('bandpass', 2600, 3)).connect(g).connect(salida); disparo(o, 0.45);
  }

  function crujido() {
    const s = fuenteRuido(false); const f = filtro('lowpass', 1200); const g = ganancia(0);
    const t = ctx.currentTime;
    for (let k = 0; k < 6; k++) g.gain.setValueAtTime(Math.random() * 0.12, t + k * 0.06);
    g.gain.setValueAtTime(0, t + 0.4);
    s.connect(f).connect(g).connect(salida); disparo(s, 0.45);
  }

  function rechinar() {
    const t = ctx.currentTime;
    const s = fuenteRuido(false); const f = filtro('bandpass', 600, 2); const g = ganancia(0);
    for (let k = 0; k < 20; k++) g.gain.setValueAtTime(0.05 + Math.random() * 0.15, t + k * 0.08);
    g.gain.setValueAtTime(0, t + 1.8);
    s.connect(f).connect(g).connect(salida); disparo(s, 1.9);
  }

  function tecla() {
    const s = fuenteRuido(false); const f = filtro('bandpass', 2400, 1.5); const g = ganancia(0);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(salida); disparo(s, 0.06);
  }

  function pulsos3() {
    for (let k = 0; k < 3; k++) {
      const t = ctx.currentTime + k * 0.5;
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(49, t); o.frequency.linearRampToValueAtTime(46, t + 0.4);
      const g = ganancia(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g).connect(salida); o.start(t); o.stop(t + 0.45);
    }
  }

  function latido(v = 1) {
    for (const [d, a] of [[0, 1], [0.17, 0.6]]) {
      const t = ctx.currentTime + d;
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
      const g = ganancia(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45 * a * v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(salida); o.start(t); o.stop(t + 0.32);
    }
  }

  let sirenaOn = false;
  function sirena() {
    if (sirenaOn) return; sirenaOn = true;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(330, t);
    for (let k = 0; k < 3; k++) { o.frequency.linearRampToValueAtTime(760, t + k * 7 + 3.5); o.frequency.linearRampToValueAtTime(330, t + k * 7 + 7); }
    const g = ganancia(0); g.gain.linearRampToValueAtTime(0.05, t + 4); g.gain.linearRampToValueAtTime(0, t + 21);
    o.connect(filtro('bandpass', 800, 0.8)).connect(g).connect(salida); o.start(t); o.stop(t + 21.5);
    setTimeout(() => { sirenaOn = false; }, 22000);
  }

  // ---- el techno de la fiesta (126 por minuto), programado por adelantado con el reloj del audio
  const fiesta = { bus: null, filtro: null, prox: 0, paso: 0, silencioHasta: 0 };
  const PASO = 60 / 126 / 2;   // corcheas
  function iniciarFiesta() {
    fiesta.filtro = filtro('lowpass', 220, 0.8);
    fiesta.bus = ganancia(0);
    fiesta.bus.connect(fiesta.filtro).connect(salida);
    fiesta.prox = ctx.currentTime + 0.1;
    setInterval(() => {
      if (ctx.state !== 'running') { fiesta.prox = ctx.currentTime + 0.05; return; }
      while (fiesta.prox < ctx.currentTime + 0.12) {
        const t = fiesta.prox, k = fiesta.paso++;
        if (k % 2 === 0) {   // bombo
          const o = ctx.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
          const gk = ganancia(0); gk.gain.setValueAtTime(0.9, t); gk.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
          o.connect(gk).connect(fiesta.bus); o.start(t); o.stop(t + 0.32);
        } else {             // platillo
          const n = fuenteRuido(false); const f = filtro('highpass', 7000); const gh = ganancia(0);
          gh.gain.setValueAtTime(0.18, t); gh.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          n.connect(f).connect(gh).connect(fiesta.bus); n.start(t); n.stop(t + 0.06);
        }
        if (k % 4 === 3) {   // bajo
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = [55, 55, 49, 58.3][Math.floor(k / 16) % 4];
          const fb = filtro('lowpass', 380); const gb = ganancia(0); gb.gain.setValueAtTime(0.22, t); gb.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          o.connect(fb).connect(gb).connect(fiesta.bus); o.start(t); o.stop(t + 0.24);
        }
        fiesta.prox += PASO;
      }
    }, 30);
  }
  function setFiesta(vol, corte) {
    if (!fiesta.bus) return;
    const t = ctx.currentTime;
    const v = t < fiesta.silencioHasta ? 0 : vol;
    fiesta.bus.gain.setTargetAtTime(v, t, 0.15);
    fiesta.filtro.frequency.setTargetAtTime(corte, t, 0.2);
  }
  function silencioFiesta(seg) { fiesta.silencioHasta = ctx.currentTime + seg; if (fiesta.bus) fiesta.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.02); }

  function rugido() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(30, t + 2.5);
    const g = ganancia(0); g.gain.linearRampToValueAtTime(0.35, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 2.6);
    o.connect(filtro('lowpass', 500)).connect(g).connect(salida); disparo(o, 2.7);
    crujido();
  }

  function chorro() {
    const s = fuenteRuido(false); const f = filtro('bandpass', 2600, 0.9); const g = ganancia(0);
    const t = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.06, t + 0.3); g.gain.setValueAtTime(0.06, t + 2.2); g.gain.linearRampToValueAtTime(0, t + 2.8);
    s.connect(f).connect(g).connect(salida); disparo(s, 2.9);
  }

  const datos = new Uint8Array(analizador.frequencyBinCount);
  function espectro() { analizador.getByteFrequencyData(datos); return datos; }

  function silencioAnomalo(v) {
    // No suspende el contexto: el control M y el foco siguen funcionando.
    salida.gain.setTargetAtTime(v ? 0.001 : 0.9, ctx.currentTime, 0.18);
  }

  return { silencioAnomalo, ctx, iniciar, setOyente, radio, bano, paso, chillido, chillidos, timbre, golpe, chirrido, crujido, rechinar,
    tecla, pulsos3, latido, sirena, espectro, setFiesta, silencioFiesta, rugido, chorro, voz, bip, susurro, golpes, arrastre, radioLejana, patitas, hilo, bocina,
    lechoCiudad(v) { if (lechos.ok) { lechos.viento.gain.setTargetAtTime(0.07 * v, ctx.currentTime, 0.4); } } };
}
