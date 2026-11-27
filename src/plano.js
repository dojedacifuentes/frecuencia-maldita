// El plano: un mapa municipal de papel, viejo y manchado (Tab o Q lo abre y pausa el juego), y un minimapa redondo en
// la esquina. Lo impreso son las calles, las plazas, el baño y el portón R9; lo que ya viste se anota a mano en rojo.
// Las tres manchas aparecen como círculos de lápiz («más o menos aquí») hasta que las despiertas: entonces, una X.
import { LADO, N, MANZANA, ACERA, centroManzana } from './ciudad.js';
import { ORIGEN } from './fiesta.js';

const S = 768;                       // lado del plano en píxeles
const TINTA = '#2b2620', ROJO = '#9e1b15', LAPIZ = 'rgba(60,52,44,.75)';
const LETRA = '"Courier New", Courier, monospace';
const VER = 14;                      // a cuántos metros un lugar queda anotado

function papel(g) {
  g.fillStyle = '#cdc2a2'; g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = (Math.random() - 0.5) * 22;
    d[i] += r; d[i + 1] += r; d[i + 2] += r * 0.8;
  }
  g.putImageData(img, 0, 0);
  // manchas de café y humedad
  for (let k = 0; k < 7; k++) {
    const x = Math.random() * S, y = Math.random() * S, r = 30 + Math.random() * 90;
    const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
    gr.addColorStop(0, 'rgba(120,88,40,0)'); gr.addColorStop(0.85, 'rgba(120,88,40,.10)'); gr.addColorStop(1, 'rgba(90,60,25,.22)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // dobleces
  g.strokeStyle = 'rgba(255,250,235,.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2 + 3, S); g.moveTo(0, S / 2); g.lineTo(S, S / 2 - 2); g.stroke();
  g.strokeStyle = 'rgba(60,45,25,.18)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(S / 2 + 2, 0); g.lineTo(S / 2 + 5, S); g.moveTo(0, S / 2 + 2); g.lineTo(S, S / 2); g.stroke();
  // bordes gastados
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.35, S / 2, S / 2, S * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(50,30,10,.45)');
  g.fillStyle = v; g.fillRect(0, 0, S, S);
}

function rayado(g, x, y, w, h, paso = 6) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = 'rgba(60,52,40,.35)'; g.lineWidth = 1;
  g.beginPath();
  for (let k = -h; k < w; k += paso) { g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); }
  g.stroke(); g.restore();
}

function texto(g, t, x, y, { tam = 13, color = TINTA, negrita = false, cursiva = false, giro = 0, centro = true } = {}) {
  g.save(); g.translate(x, y); g.rotate(giro);
  g.font = `${cursiva ? 'italic ' : ''}${negrita ? 'bold ' : ''}${tam}px ${LETRA}`;
  g.textAlign = centro ? 'center' : 'left'; g.textBaseline = 'middle';
  g.fillStyle = color; g.fillText(t, 0, 0); g.restore();
}

function lienzo() { const c = document.createElement('canvas'); c.width = S; c.height = S; return c; }

export function crearPlano({ ciudad, siniestro, fiesta }) {
  const sit = ciudad.sitios;
  // ---------------- la ciudad
  const B = LADO / 2 + 6;
  const vistaCiudad = { aPx: (x, z) => [(x + B) / (2 * B) * S, (z + B) / (2 * B) * S], k: S / (2 * B) };
  const baseCiudad = lienzo();
  {
    const g = baseCiudad.getContext('2d'), { aPx, k } = vistaCiudad;
    papel(g);
    const lado = (MANZANA - 2 * ACERA) * k;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const [x, y] = aPx(centroManzana(i), centroManzana(j));
        const esPlaza = (sit.plazaSur && Math.abs(centroManzana(i) - sit.plazaSur.x) < 1 && Math.abs(centroManzana(j) - sit.plazaSur.z) < 1)
          || (sit.plazaCentro && Math.abs(centroManzana(i) - sit.plazaCentro.x) < 1 && Math.abs(centroManzana(j) - sit.plazaCentro.z) < 1);
        if (esPlaza) {
          g.setLineDash([5, 4]); g.strokeStyle = TINTA; g.lineWidth = 1.2;
          g.strokeRect(x - lado / 2, y - lado / 2, lado, lado); g.setLineDash([]);
          continue;
        }
        g.fillStyle = 'rgba(70,62,50,.16)'; g.fillRect(x - lado / 2, y - lado / 2, lado, lado);
        rayado(g, x - lado / 2, y - lado / 2, lado, lado);
        g.strokeStyle = 'rgba(40,34,26,.75)'; g.lineWidth = 1.5; g.strokeRect(x - lado / 2, y - lado / 2, lado, lado);
      }
    }
    // el muro del borde
    const [x0, y0] = aPx(-LADO / 2, -LADO / 2), [x1, y1] = aPx(LADO / 2, LADO / 2);
    g.strokeStyle = TINTA; g.lineWidth = 4; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // impreso
    const [ps, pys] = aPx(sit.plazaSur.x, sit.plazaSur.z), [pc, pyc] = aPx(sit.plazaCentro.x, sit.plazaCentro.z);
    texto(g, 'PLAZA SUR', ps, pys - lado * 0.36, { tam: 12 });
    texto(g, 'PLAZA CENTRAL', pc, pyc - lado * 0.36, { tam: 12 });
    const [bx, by] = aPx(sit.bano.centro.x, sit.bano.centro.z);
    g.fillStyle = 'rgba(40,34,26,.55)'; g.fillRect(bx - sit.bano.W * k / 2, by - sit.bano.D * k / 2, sit.bano.W * k, sit.bano.D * k);
    texto(g, 'BAÑOS PÚBLICOS', bx, by + sit.bano.D * k / 2 + 12, { tam: 11 });
    const [rx, ry] = aPx(sit.porton.position.x, sit.porton.position.z);
    g.fillStyle = TINTA; g.fillRect(rx - 2.5 * k, ry - 4, 5 * k, 8);
    texto(g, 'FÁBRICA R9', rx, ry + 14, { tam: 12, negrita: true });
    texto(g, 'PLANO DE LA CIUDAD · SECTOR 3', S / 2, S - 14, { tam: 14, negrita: true });
    texto(g, 'N', S - 30, 30, { tam: 18, negrita: true });
    g.strokeStyle = TINTA; g.lineWidth = 2;
    g.beginPath(); g.moveTo(S - 30, 66); g.lineTo(S - 30, 42); g.moveTo(S - 36, 50); g.lineTo(S - 30, 42); g.lineTo(S - 24, 50); g.stroke();
    // escala
    g.beginPath(); g.moveTo(24, S - 22); g.lineTo(24 + 20 * k, S - 22); g.stroke();
    texto(g, '20 m', 24 + 10 * k, S - 34, { tam: 11 });
  }

  // ---------------- la fiesta y los pasillos
  const { zNorte, zFin } = fiesta.zona;
  const cz = (ORIGEN.z + 12 + zFin) / 2, H = 47;
  const vistaFiesta = { aPx: (x, z) => [(x - ORIGEN.x + H) / (2 * H) * S, (z - cz + H) / (2 * H) * S], k: S / (2 * H) };
  const baseFiesta = lienzo();
  {
    const g = baseFiesta.getContext('2d'), { aPx, k } = vistaFiesta;
    papel(g);
    const [dx0, dy0] = aPx(ORIGEN.x - 12, ORIGEN.z - 12);
    g.strokeStyle = TINTA; g.lineWidth = 3; g.strokeRect(dx0, dy0, 24 * k, 24 * k);
    const [cx0, cy0] = aPx(ORIGEN.x - 1.2, zFin), [cx1, cy1] = aPx(ORIGEN.x + 1.2, zNorte);
    g.lineWidth = 2; g.strokeRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    texto(g, 'AQUÍ EL PLANO NO DICE NADA', S / 2, S - 14, { tam: 14, negrita: true });
    texto(g, 'N', S - 30, 30, { tam: 18, negrita: true });
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(S - 30, 66); g.lineTo(S - 30, 42); g.moveTo(S - 36, 50); g.lineTo(S - 30, 42); g.lineTo(S - 24, 50); g.stroke();
  }

  // ---------------- lo que se anota a mano
  const lugares = [
    { zona: 'ciudad', pos: siniestro.ojo.position, nota: 'el charco mira', dx: 0, dy: 26 },
    { zona: 'ciudad', pos: siniestro.telefono.pos, nota: 'teléfono: suena', dx: 84, dy: -2 },
    { zona: 'ciudad', pos: siniestro.depurar.tvs[0].position, nota: 'televisores:\nme veo de espaldas', dx: 0, dy: -20 },
    { zona: 'ciudad', pos: siniestro.depurar.boca.position, nota: 'boca en el muro', dx: 0, dy: -18 },
    { zona: 'fiesta', pos: ORIGEN, nota: 'nadie tiene cara', dx: 0, dy: 22 },
    { zona: 'fiesta', pos: { x: ORIGEN.x, z: zNorte + 2.2 }, nota: 'mi doble', dx: 56, dy: 0 },
    { zona: 'fiesta', pos: { x: ORIGEN.x, z: (zNorte + zFin) / 2 }, nota: 'los muros\nse cierran', dx: 70, dy: 0 },
    { zona: 'fiesta', pos: { x: ORIGEN.x, z: zFin }, nota: 'luz fría.\n¿el baño?', dx: -70, dy: 0 },
  ].map((l) => ({ ...l, visto: false }));
  // las manchas: un círculo de lápiz cerca, no encima (el plano no es tan preciso)
  const pistas = siniestro.frecuencias.map((f, i) => ({
    f, cx: f.pos.x + Math.cos(i * 2.1 + 0.6) * 4.5, cz: f.pos.z + Math.sin(i * 2.1 + 0.6) * 4.5, n: i + 1,
  }));
  let caida = null;   // dónde te atraparon la última vez

  function marcas(g, vista, zona, mini) {
    const { aPx, k } = vista;
    if (zona === 'ciudad') {
      const primera = pistas.find((p) => !p.f.hallada && !p.revelada);
      for (const p of pistas) {
        const [x, y] = p.f.hallada ? aPx(p.f.pos.x, p.f.pos.z) : aPx(p.cx, p.cz);
        if (p.f.hallada) {
          g.strokeStyle = ROJO; g.lineWidth = mini ? 5 : 3.5;
          const r = mini ? 9 : 7;
          g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke();
          if (!mini) texto(g, `mancha ${p.n}`, x, y + 18, { tam: 13, color: ROJO, negrita: true, cursiva: true });
        } else if (p.revelada) {
          const [ex, ey] = aPx(p.f.pos.x, p.f.pos.z);
          g.strokeStyle = ROJO; g.lineWidth = mini ? 5 : 2.5;
          g.beginPath(); g.arc(ex, ey, mini ? 12 : 9, 0, Math.PI * 2); g.stroke();
          g.fillStyle = ROJO; g.beginPath(); g.arc(ex, ey, mini ? 4 : 3, 0, Math.PI * 2); g.fill();
          if (!mini) texto(g, `mancha ${p.n}: aquí`, ex, ey - 18, { tam: 13, color: ROJO, negrita: true, cursiva: true });
        } else {
          g.strokeStyle = LAPIZ; g.lineWidth = mini ? 3 : 1.4; g.setLineDash(mini ? [] : [6, 5]);
          g.beginPath(); g.ellipse(x, y, 10 * k, 8.5 * k, 0.3 * p.n, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
          if (!mini) texto(g, '?', x, y, { tam: 26, color: LAPIZ, negrita: true });
          if (!mini && p === primera) texto(g, 'suena en 31.7', x, y - 8.5 * k - 12, { tam: 12, color: LAPIZ, cursiva: true });
        }
      }
      if (estadoPorton.abierto) {
        const [x, y] = aPx(sit.porton.position.x, sit.porton.position.z);
        g.strokeStyle = ROJO; g.lineWidth = mini ? 5 : 3;
        g.beginPath(); g.arc(x, y + 6, mini ? 16 : 22, 0, Math.PI * 2); g.stroke();
        if (!mini) texto(g, '¡ABIERTO!', x, y + 44, { tam: 15, color: ROJO, negrita: true, cursiva: true, giro: -0.06 });
      } else if (!mini) {
        const [x, y] = aPx(sit.porton.position.x, sit.porton.position.z);
        texto(g, '(cerrado: 3 manchas)', x, y + 30, { tam: 11, color: ROJO, cursiva: true });
      }
    }
    for (const l of lugares) {
      if (l.zona !== zona || !l.visto) continue;
      const [x, y] = aPx(l.pos.x, l.pos.z);
      g.fillStyle = ROJO; g.beginPath(); g.arc(x, y, mini ? 6 : 4, 0, Math.PI * 2); g.fill();
      if (!mini) l.nota.split('\n').forEach((linea, i, todas) => texto(g, linea, x + l.dx, y + l.dy + (i - (todas.length - 1) / 2) * 14,
        { tam: 13, color: ROJO, negrita: true, cursiva: true, giro: -0.04 }));
    }
    if (caida && caida.zona === (zona === 'pasillos' ? 'fiesta' : zona)) {
      const [x, y] = aPx(caida.x, caida.z);
      g.strokeStyle = TINTA; g.lineWidth = mini ? 4 : 2;
      g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.moveTo(x - 6, y - 3); g.lineTo(x + 6, y - 3); g.stroke();
      if (!mini) texto(g, 'aquí caí', x + 34, y, { tam: 12, color: TINTA, cursiva: true });
    }
  }

  function flecha(g, x, y, rumbo, tam) {
    // rumbo: hacia (sin, cos) en x/z; en el plano z crece hacia abajo
    const dx = Math.sin(rumbo), dy = Math.cos(rumbo);
    g.fillStyle = ROJO; g.strokeStyle = '#1a0806'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x + dx * tam, y + dy * tam);
    g.lineTo(x - dx * tam * 0.6 - dy * tam * 0.6, y - dy * tam * 0.6 + dx * tam * 0.6);
    g.lineTo(x - dx * tam * 0.25, y - dy * tam * 0.25);
    g.lineTo(x - dx * tam * 0.6 + dy * tam * 0.6, y - dy * tam * 0.6 - dx * tam * 0.6);
    g.closePath(); g.fill(); g.stroke();
  }

  const grande = document.getElementById('plano-lienzo').getContext('2d');
  const capa = document.getElementById('plano');
  const mini = document.getElementById('minimapa');
  const gm = mini.getContext('2d');
  const estadoPorton = { abierto: false };
  let abierto = false;

  function vistaDe(zona) { return zona === 'ciudad' ? [vistaCiudad, baseCiudad] : [vistaFiesta, baseFiesta]; }

  // anota lo que está cerca y dibuja el minimapa
  function actualizar(jugador, zona, porton, destino = null) {
    estadoPorton.abierto = porton;
    const p = jugador.pos, z = zona === 'pasillos' ? 'fiesta' : zona;
    for (const l of lugares) {
      if (!l.visto && l.zona === z && Math.hypot(l.pos.x - p.x, l.pos.z - p.z) < VER) l.visto = true;
    }
    const [vista, base] = vistaDe(z);
    const W = mini.width, R = W / 2, radio = 30;          // el minimapa muestra 30 m a la redonda
    const [px, py] = vista.aPx(p.x, p.z);
    const zoom = R / (radio * vista.k);
    gm.clearRect(0, 0, W, W);
    gm.save();
    gm.beginPath(); gm.arc(R, R, R - 2, 0, Math.PI * 2); gm.clip();
    gm.fillStyle = '#1a1714'; gm.fillRect(0, 0, W, W);
    gm.translate(R, R); gm.scale(zoom, zoom); gm.translate(-px, -py);
    gm.drawImage(base, 0, 0);
    marcas(gm, vista, z, true);
    gm.restore();
    flecha(gm, R, R, jugador.rumbo, 10);
    if (destino) {
      // muesca roja en el borde, hacia el objetivo (o un anillo encima si ya está a la vista)
      const [dx, dy] = vista.aPx(destino.x, destino.z);
      const vx = (dx - px) * zoom, vy = (dy - py) * zoom, l = Math.hypot(vx, vy);
      gm.fillStyle = ROJO; gm.strokeStyle = '#f0e0d0'; gm.lineWidth = 1.5;
      if (l < R - 14) {
        gm.beginPath(); gm.arc(R + vx, R + vy, 7 + Math.sin(performance.now() / 180) * 2, 0, Math.PI * 2); gm.stroke();
      } else {
        const ux = vx / l, uy = vy / l, bx = R + ux * (R - 9), by = R + uy * (R - 9);
        gm.beginPath();
        gm.moveTo(bx + ux * 8, by + uy * 8);
        gm.lineTo(bx - ux * 6 - uy * 7, by - uy * 6 + ux * 7);
        gm.lineTo(bx - ux * 6 + uy * 7, by - uy * 6 - ux * 7);
        gm.closePath(); gm.fill(); gm.stroke();
      }
    }
    gm.strokeStyle = 'rgba(236,232,220,.7)'; gm.lineWidth = 2; gm.beginPath(); gm.arc(R, R, R - 2, 0, Math.PI * 2); gm.stroke();
    gm.font = `bold 13px ${LETRA}`; gm.textAlign = 'center'; gm.fillStyle = 'rgba(236,232,220,.85)'; gm.fillText('N', R, 14);
  }

  function dibujarGrande(jugador, zona) {
    const z = zona === 'pasillos' ? 'fiesta' : zona;
    const [vista, base] = vistaDe(z);
    grande.drawImage(base, 0, 0);
    marcas(grande, vista, z, false);
    const [x, y] = vista.aPx(jugador.pos.x, jugador.pos.z);
    flecha(grande, x, y, jugador.rumbo, 12);
    texto(grande, 'yo', x + 20, y - 14, { tam: 14, color: ROJO, negrita: true, cursiva: true });
  }

  function abrir(v, jugador, zona) {
    abierto = v; capa.hidden = !v;
    if (v) dibujarGrande(jugador, zona);
  }

  function mostrarMini(v) { mini.hidden = !v; }
  function agregarLugar(l) { lugares.push({ dx: 0, dy: -18, ...l, visto: false }); }
  function revelar(i) { if (pistas[i]) pistas[i].revelada = true; }
  const revelada = (i) => !!pistas[i]?.revelada;
  function marcarCaida(pos, zona) { caida = { x: pos.x, z: pos.z, zona: zona === 'pasillos' ? 'fiesta' : zona }; }

  return { actualizar, abrir, mostrarMini, marcarCaida, revelar, revelada, agregarLugar, get abierto() { return abierto; } };
}
