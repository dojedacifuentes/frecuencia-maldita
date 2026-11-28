// Interfaz «transmisión»: reloj 03:17, dial de radio, barras de frecuencia en vivo y textos escritos a máquina.
export function crearHud(audio) {
  const $ = (id) => document.getElementById(id);
  const hud = $('hud'), reloj = $('reloj'), dial = $('dial'), dialValor = $('dial-valor'), texto = $('texto');
  const barras = $('barras'), g = barras.getContext('2d'), manchas = $('manchas');
  const objCaja = $('objetivo'), objTexto = $('obj-texto'), senal = $('senal'), senalBarras = senal.querySelector('.senal-barras');
  const marcas = $('dial-marcas');
  let objActual = null;
  let cola = [], actual = null;

  function decir(t, segundos = 4.5) {
    cola.push({ t, segundos });
  }

  function actualizar(dt, tiempo, frecuencia, muerta, halladas, tieneRadio) {
    dial.hidden = barras.hidden = !tieneRadio;
    reloj.textContent = tiempo % 1 < 0.6 ? '03:17' : '03 17';
    dialValor.textContent = muerta ? '317 Hz' : `FM ${frecuencia.toFixed(1).padStart(4, '0')}`;
    dial.classList.toggle('muerta', muerta);
    dial.style.setProperty('--p', `${Math.max(0, Math.min(100, (frecuencia / 108) * 100))}%`);
    manchas.textContent = `manchas ${halladas}/3`;
    // barras: lo que suena ahora
    const d = audio.espectro();
    g.clearRect(0, 0, barras.width, barras.height);
    g.fillStyle = muerta ? 'rgba(179,35,28,.9)' : 'rgba(236,232,220,.8)';
    for (let k = 0; k < 24; k++) {
      const v = d[2 + k * 2] / 255;
      const h = 3 + v * (barras.height - 4);
      g.fillRect(k * 8, barras.height - h, 5, h);
    }
    // máquina de escribir
    if (!actual && cola.length) actual = { ...cola.shift(), n: 0, vida: 0 };
    if (actual) {
      actual.vida += dt;
      const n = Math.min(actual.t.length, Math.floor(actual.vida * 22));
      if (n > actual.n) {
        if (actual.t[n - 1] !== ' ' && actual.t[n - 1] !== '\n') audio.tecla();
        actual.n = n;
        texto.innerHTML = actual.t.slice(0, n).split('\n').map((l) => `<span>${l}</span>`).join('\n');
      }
      if (actual.vida > actual.t.length / 22 + actual.segundos) { actual = null; texto.innerHTML = ''; }
    }
  }

  // marcas en el dial donde hay algo que oír
  function marcasDial(fs) { marcas.innerHTML = fs.map((f) => `<i style="left:${(f / 108) * 100}%"></i>`).join(''); }
  // el objetivo de arriba; cuando cambia, destella
  function objetivo(t) {
    if (t === objActual) return;
    objActual = t; objTexto.textContent = t;
    objCaja.classList.remove('nuevo'); void objCaja.offsetWidth; objCaja.classList.add('nuevo');
  }
  // la señal de la mancha más cercana (0..1), o null para esconderla
  function senalNivel(p) {
    senal.hidden = p == null;
    if (p != null) { const n = Math.round(p * 5); senalBarras.textContent = '▮'.repeat(n) + '▯'.repeat(5 - n); }
  }
  function mostrar(v) { hud.hidden = !v; }
  function limpiar() { cola = []; actual = null; texto.innerHTML = ''; }
  return { decir, actualizar, mostrar, limpiar, objetivo, senalNivel, marcasDial };
}
