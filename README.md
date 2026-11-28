# LA FRECUENCIA MUERTA · 03:17 — el juego

Juego de terror en el navegador (Vite + Three.js 0.187), con geometría de pocos polígonos, hormigón y niebla nocturna.
La resolución se adapta a la ventana hasta 1280 × 720. El protagonista de abrigo verde es un
modelo 3D sacado de su imagen del video y se ve desde atrás, por encima del hombro: camina, corre, fuma cuando se queda
quieto y cae de bruces si algo lo atrapa. Todo empieza (y vuelve) en el baño a las 03:17.

## Publicar en Vercel

Importa este repositorio y usa la raíz del proyecto. La configuración de Vite está en `vercel.json`.
La instalación usa `npm ci`, la compilación usa `npm run build` y la salida es `dist/`. El juego no necesita claves ni servicios externos. Las texturas, los clips y el modelo se incluyen en `public/assets/`.

## Jugar
```
npm ci             # Node 22.12 o superior dentro de las ramas compatibles con Vite
npm run dev        # http://localhost:5181   (?mudo=1 para probar sin sonido)
```
WASD o flechas para caminar en ocho direcciones · cámara automática · ratón o J/L para mirar alrededor si quieres · R para centrar la vista · Shift para correr · F para la linterna · Z/X o rueda para sintonizar la radio
· E: orinar en el muro, contestar el teléfono · Tab o Q: plano (pausa) · Enter: saltar el tutorial · M: silencio
(también se calla solo si la pestaña no está a la vista). La lista de controles con sus teclas dibujadas sale de
`src/controles.js` y aparece en la portada, junto al plano y en la barra de abajo.

Puedes jugar sólo con el teclado. Al pulsar una dirección, el personaje empieza a caminar hacia ese lado de la pantalla.
Mientras mantienes las mismas teclas sigue en línea recta y la cámara se acomoda detrás. Si quieres observar algo,
puedes mover el ratón o usar J/L. Al volver a caminar, la cámara retoma el seguimiento tras una breve pausa.

- **Tutorial** (`src/tutorial.js`): la primera vez de cada partida, siete pasos en el baño que esperan a que hagas cada
  cosa (caminar, mirar, linterna, radio, plano, correr y actuar, salir).
- **Plano** (`src/plano.js`): mapa municipal de papel. Lo impreso: calles, plazas, baño, portón R9. A mano y en rojo, lo
  que ya viste a menos de 14 m (charco, teléfono, televisores, boca), las manchas como círculos de lápiz «más o menos
  aquí» hasta despertarlas (entonces una X) y una cruz donde te atraparon. En la fiesta, un plano casi vacío. Además,
  un minimapa redondo abajo a la derecha.
- La imagen conserva el color del barrio al sintonizar 31.7. Los pitidos y la lluvia ascendente marcan la señal. Sólo los sobresaltos distorsionan la imagen un instante.

## Qué hacer (la guía para el jugador)
- **Objetivo** siempre arriba (`objetivoActual` en `main.js`): recoge la radio en la repisa con E → sal del baño → sintoniza 31.7 → sigue los pitidos
  hasta una mancha y pulsa E → ve al portón R9 → cruza la fiesta → corre hasta la luz. La marca roja del minimapa
  apunta hacia donde toca ir.
- **Señal**: en 31.7, «SEÑAL ▮▮▮▯▯» y pitidos en 951 Hz que se aceleran cerca de la mancha que falta.
- **Examinar con E** (`interaccion.js` + `examinar.js`): cuando algo se puede tocar, abajo aparece «E · …». Las manchas
  (sin 31.7 no suenan), las viejas y el charco (revelan dónde hay una mancha y la anotan en el plano), los televisores,
  la boca, el teléfono y los afiches (mandan a las emisoras), la basura (ratas y hojas de un diario: la historia), los
  autos, el portón cerrado (dice cuántas manchas faltan), el muro del baño y, en la fiesta, los que bailan sin cara.
- **Emisoras** (`emisoras.js`, rayitas rojas en el dial; al soltar Z/X el dial se acomoda solo): 94.3 una voz que
  guía, 101.7 noticias de ayer sobre el hombre del abrigo verde, 66.0 números (hacia dónde queda la mancha más cercana).
  `pistas.js` arma las frases («a dos cuadras al noreste de la plaza central»).
- `node herramientas/capturas.mjs guia` saca fotos de todo esto.

## Objetos (`objetos.js`; se guardan entre vueltas)
- **Linterna con batería**: 150 s encendida; parpadea cuando le queda poco y se apaga. Amanece llena en cada 03:17.
- **Pilas**: una de cada dos basuras y dos autos. Se cambian solas cuando la linterna se agota (o al pulsar F).
- **Casete**: en el auto de la radio encendida en 94.3. En los televisores de la vitrina muestra un recuerdo y revela
  una mancha.
- **Llave R9-B**: la escupe la boca del muro. Abre la **puerta con candado** frente a la plaza central (se anota en el
  plano), donde hay cientos de radios en 31.7 y una **foto**.
- **Foto**: mostrada a una vieja, marca en el plano todas las manchas que faltan. Si la llevas al final, la última
  frase cambia («Ya sé quién era. Igual vuelvo.»).
- En pantalla: «LINTERNA ▮▮▮▮▯» y «LLEVAS: …» bajo el reloj; en la pausa (Tab), qué hace cada cosa.
- `node herramientas/capturas.mjs objetos` recorre la cadena completa y prueba la batería.

## Rarezas (`rarezas.js`)
- **Espejo del baño**: el reflejo se renueva a saltos (cuatro veces por segundo). Desde la segunda vuelta hay una
  mujer detrás de ti que sólo existe en el espejo (capa 1: la ve la cámara del reflejo, no la del juego).
- **El niño de espaldas** con tu abrigo arrastrando: se esfuma si te acercas, deja un charco tibio y reaparece más
  allá, camino a la mancha que falta (cuando están todas, al portón).
- **Relojes** en los muros, todos en 03:17; uno anda hacia atrás y se apura si lo miras.
- **Ventanas** encendidas con alguien que se corre hacia tu lado; si la miras de frente, se agacha y la luz se apaga.
- **Puertas a cinco metros del suelo**, con una ampolleta pelada; golpean desde adentro cuando pasas.
- **Carrito de supermercado** que anda solo con una radio envuelta en una manta (en 31.7); se detiene si lo miras.
- **Kiosco** de la plaza sur: todos los diarios dicen que sigues desaparecido, con tu foto de espaldas.
- En 31.7 la lluvia sube.
- `node herramientas/capturas.mjs rarezas` las fotografía; `... eval "<código>"` evalúa algo en el juego.

## Encontrar las manchas (pensado para quien no juega)
- **Columnas de luz roja** (`columnaDeLuz` en `main.js`) en la vereda junto a cada mancha que falta: se ven desde
  cualquier parte, por encima de los edificios, y se apagan al despertarla. Una blanca sobre el portón cuando se abre.
- La **flecha roja del minimapa** apunta siempre a la mancha más cercana; el **plano** las marca desde el principio.
- A menos de 9 m de una mancha, **la radio se sintoniza sola en 31.7** y aparece «E · escuchar la mancha».
- El objetivo de arriba: «Ve a la columna de luz roja…» → «Ahí está: … Pulsa E» → «Ve al portón R9, al norte».
- `node herramientas/capturas.mjs faciles` lo fotografía.

## El camino y lo que hay en él
- **Manchas en fila** (`siniestro.js`, `LUGARES_MANCHA`): puerta del baño → mancha 1 (16 m, frente a la plaza sur)
  → mancha 2 (31 m, al este de la plaza central) → mancha 3 (23 m, frente a la plaza central) → portón (42 m).
- **Teléfonos del camino** (`telefonos.js`): tres cabinas suenan cuando pasas a menos de 20 m. Hay 14 s para
  contestar (arriba: «¡CONTESTA EL TELÉFONO!» con la cuenta; el minimapa lo marca). Contestar: la mancha que sigue
  (anotada en el plano), pilas, o la sombra se va. No contestar: la sombra sale a buscarte.
- **Abrigos sin cabeza** (`calles.js`): tu mismo abrigo caminando solo por tres calles del camino (el modelo 3D con
  el hueso de la cabeza en escala cero). La linterna los tumba un rato; tirados, se pueden revisar con E (uno tiene
  pilas). Si te tocan, te asustan y se esfuman.
- **El paradero de las 03:17**: cinco viejas de espaldas en la vereda este de la plaza central; al acercarte, se dan
  vuelta todas a la vez.
- **Bichos** (`bichos.js`): arañas en los muros cercanos (huyen de la linterna), en los azulejos y el techo del baño
  (una camina sobre el espejo), una que baja de su hilo delante de la cámara cada 40-85 s, cucarachas alrededor de la
  basura y polillas en los faroles.
- `node herramientas/capturas.mjs calles` fotografía todo esto y muestra las distancias.

## Lugares nuevos del mapa (28-nov)
- **Canal** (`canal.js`, `CANAL` en `ciudad.js`): ocupa la calle entre la fila del portón y la siguiente, de muro a
  muro, con agua sucia 1,4 m abajo, barandas y un solo puente (calle x = 11) con un farol que falla. En el agua flota
  tu cuerpo, boca abajo; cuando cruzas el puente, se da vuelta. El asfalto se cortó en dos paños; los detalles de la
  calle (autos, papeles, alcantarillas, postes, semáforos) se saltan esa franja. Sus choques son «bajos»: la cámara
  pasa por encima.
- **Pasaje R9** (`lugares.js`): la calle entre la primera y la segunda mancha se angosta a 2,2 m entre muros de
  ladrillo, con techo de calamina rota, ropa colgada (un abrigo verde mojado), un contenedor, una ampolleta y una cara
  que se asoma por sobre el muro y se esconde si la miras.
- **Sitio eriazo** (manzana [1,3]): tierra, maleza, reja rota, colchón, neumáticos y columpios que se mecen solos y se
  detienen de golpe cuando te acercas. La manzana se arma «tirando los mismos dados» que un edificio, así el resto de
  la ciudad conserva materiales y alturas (`vacias` en `ciudad.js`).
- **Feria libre** (calle z = 11, al oeste de la plaza central): puestos con toldo, pescados con moscas, carne colgando,
  cabezas de muñeca, seis radios en 31.7 (pilas debajo) y una vendedora sin cara.
- **Capilla** (manzana [2,0], al norte del canal): bancas, altar con velas que se prenden con E (el santo de cara
  tapada se vuelve hacia ti), vitrales y un confesionario donde una radio responde y calma a la sombra.
- **Metro** (`metro.js`, zona aparte en x = 300): boca en la esquina de la plaza central y salida junto a la capilla.
  Andén de la estación 317 con un tren detenido lleno de pasajeros sin cara; al entrar al túnel el tren arranca detrás
  de ti: hay que meterse en un nicho (luz roja) o llegar a la escalera. El tren en marcha aparta la cámara (choque
  `soloCamara`) pero el atropello lo decide `metro.actualizar`. Plano propio («bajo tierra el plano se acaba»).
- Cambio de zona general: `irA(zona, lado)` en `main.js` (fundido y `juego.destino`).
- `node herramientas/capturas.mjs mapa canal,pasaje,feria,metro` fotografía todo esto.

## Lugares donde se entra y los nichos (28-nov, `interiores.js`)
Cada uno es una zona aparte (como el metro), con fundido al entrar y salir; adentro «no hay plano».
- **Tu departamento** (puerta «DEPTO 317» junto a la plaza sur): fotos familiares con tu cara raspada, la mesa puesta
  para tres con la comida podrida, dibujos de niño («PAPÁ», «NO MIRES», «3:17»), calendario tachado menos hoy, tele con
  estática y la radio de la mesa. Si curioseas tres cosas, golpean la puerta con voz de niño.
- **Radio 31.7** (antena con luz roja en el techo, frente a la calle que va al puente): estudio con «AL AIRE», consola,
  cintas que giran y alguien de espaldas en la cabina (si golpeas el vidrio, se da vuelta). El micrófono revela en el
  plano la mancha que sigue.
- **Cine Rex** (marquesina con ampolletas, cerca de la primera mancha): la película es `v_relojes`; el público está de
  espaldas y se da vuelta entero cuando llegas adelante.
- **Nichos del muro** (`lugares.js`): el muro oeste de la ciudad, de z −28 a 30, lleno de nichos con flores y velas;
  uno es el tuyo («nació 03:17 · murió 03:17»).
- `node herramientas/capturas.mjs mapa interiores` los fotografía.

## Repositorio y Vercel
- GitHub (público): `dojedacifuentes/frecuencia-maldita`, rama `main`. Cada `git push` a `main` lo publica solo en
  Vercel: https://frecuencia-maldita.vercel.app (y la copia https://frecuenciamaldita.vercel.app).
  Las fotos de prueba (`capturas/`) y las hojas sueltas de la raíz no se suben (`.gitignore`).
- `vercel.json`: Vite, `npm ci`, `npm run build`, salida `dist`. Probado desde una copia limpia: compila igual.
- `npm test` prueba el director R9 (`tests/`); GitHub lo corre en cada propuesta de cambio a `main`.

## El director de terror R9 (`director-terror.js`, unido el 28-nov)
Sólo en la ciudad, fuera del baño y sin tutorial: mira cómo juegas (quieto, corriendo, volviendo sobre tus pasos,
moviendo la radio) y elige uno de 18 sustos sin repetir (figuras que te miran, la que te imita, una puerta roja
«que no estaba» que te devuelve al baño, un gigante en la niebla, apagón, silencio…), más cuatro rarísimos.
Emisoras nuevas: 13.9 «canal de mantenimiento» y 77.3 «eco». El final depende de lo que hayas visto y de la foto:
RECONSTRUCCIÓN, RECONOCIMIENTO o RECHAZO DEL PROTOCOLO (éste termina en la pantalla «03:18»). El baño se va llenando
de rastros vuelta a vuelta, y el juego recuerda tus partidas en el navegador (`r9:ecos:v1`).

## El cerro y el Sanatorio de la Pendiente (28-nov, `cerro.js`, `sanatorio.js`)
Ideas de una lluvia de ideas con ChatGPT (chat «Ideas para juego de terror»); imágenes con Flow (Nano Banana, 0 puntos).
- **La boca del cerro**: al final de la calle central, el muro este tiene una abertura con escalones y el letrero del
  sanatorio (E · subir al cerro). Desde toda la ciudad se ve el cerro por encima del muro, con ventanas y el sanatorio
  arriba con dos antenas rojas.
- **El cerro** (zona aparte): una placita, **137 peldaños** en cuatro tramos entre casas de calamina colgadas del cerro
  (con muros de contención, techos inclinados, ropa tendida y un mirador), y arriba el patio del sanatorio: garita,
  cancha con líneas equivocadas, antenas y la fachada (imagen de Flow). Al subir, **pasos que suben detrás de ti al mismo
  ritmo** (y dan dos más cuando te detienes) y alguien que te mira desde el pie del tercer tramo.
- **El ascensor** (funicular sin operador): 16 s de subida; se cruza con el carro gemelo lleno de abrigos verdes. En la
  primera subida de cada vuelta, **el pasajero** del fondo desaparece en un apagón y vuelve sentado a tu lado.
- **El sanatorio por dentro**: tres pisos de azulejo y damero unidos por una escalera de verdad (se sube caminando).
  Planta baja: recepción, **archivo con tu ficha** (cuántas veces moriste), guardarropía de abrigos verdes, sala de
  espera con dos Testigos frente a una tele con estática, enfermería (pilas), la silla eléctrica, el espejo que no te
  refleja y una silla de ruedas que viene sola. Piso 1: camas que apuntan todas a un rincón vacío, **el comedor de los
  ausentes** (levantan la cuchara al mismo tiempo; hay un puesto con tu número), la **maqueta de la ciudad** (mover la
  figurita mueve algo enorme afuera), la tina de agua negra, la grabadora, y **pasos en el piso de arriba** que siguen
  los tuyos. Piso 2: celdas con mirilla (una **te salta a la cara**: imagen de Flow), **tú durmiendo** en una celda
  abierta y la **sala de radio**. Al salir de escuchar las cintas (o si corres cerca de ella) se apagan las luces y
  **la que gatea** viene a cuatro patas por donde pasaste: corriendo se le gana; hay que bajar y salir por el oeste.
- La ficha y las cintas cuentan como pruebas para el final secreto de R9 («archivo» y «transmisión»).
- `src/alturas.js`: dónde se pisa (losas y rampas) y choques por piso; el jugador sube y baja escaleras y cae si no hay
  nada debajo. La ciudad sigue plana.

## La ciudad, menos cuadrada (28-nov, `barrio.js`)
- Techos distintos en cada edificio: torres escalonadas, estanques de agua sobre patas, casetas de calamina, antenas.
- **La población circular** (manzana del este, junto a la boca del cerro): ocho casas en anillo con la puerta hacia una
  cancha; si te quedas quieto en el centro, se abren todas a la vez. Al golpear una, contestan las ocho.
- **El edificio de las ventanas** (frente a la plaza central): si te detienes a mirarlo, sus luces dibujan a un hombre
  que gira la cabeza, y se apaga todo.

## Monstruos nuevos (`monstruos.js`)
- **El Testigo**: una copia tuya con uniforme de hospital y una placa blanca en vez de cara (el cuerpo del protagonista,
  teñido). No camina: gira hacia ti. Si te mira tres segundos, se oye un obturador y **la sombra sabe dónde estás**.
  Hay tres en esquinas de la ciudad, dos en la sala de espera y uno en el cerro.
- **La Procesión**: muchas piernas bajo una tela negra, marchando al unísono por la calle del oeste. Hay que esperar a
  que pase; si te toca, vuelves al baño.
- **El Paraguas**: un paraguas negro con dos piernas flacas, al noreste. Oye el movimiento: si te quedas quieto, pasa
  de largo; si te mueves cerca, corre hacia ti.
- **La que gatea**: la paciente del piso 2 del sanatorio. Modelo 3D de TRELLIS sacado de una imagen de Flow
  (`herramientas/trellis.py`, `preparar_monstruos.py`: 14 mil triángulos, 720 KB). El Testigo iba a ser otro modelo de
  TRELLIS, pero Hugging Face cortó la cuota gratuita del día; se hizo con el cuerpo del protagonista.
- Sustos de pantalla en `sustos.js` (el rostro, el temblor). Sonidos nuevos en `audio.js`: `pasoEn` (un paso en otro
  lugar) y `obturador`.

## Peso
Unos 7 MB en total (`npm run build` → `dist/`): código ~900 KB, protagonista 3D 633 KB, la que gatea 720 KB, imágenes y
texturas ~4 MB, trocitos de video 0,3 MB. El sonido no pesa: se genera en vivo.

## Recorrido
1. **El baño** (03:17). Cada vez que vuelves está más podrido (la luz cambia de color).
2. **La ciudad**: niebla, lluvia, faroles que fallan, ratas que huyen de la linterna (y manadas que cruzan la calle),
   viejas sin rostro que miran la pared y se dan vuelta si no las miras, el perro de mancha, la sombra que avanza
   por las fachadas y baja a caminar a tirones (la linterna la hace retroceder en la calle), la boca del muro, el charco que es un ojo, el
   teléfono que suena, la vitrina que te muestra de espaldas en vivo y frases escritas en los muros.
   Con la radio en **31.7** la lluvia sube, la niebla se abre un poco y los pitidos guían a las **tres manchas** que abren el
   portón R9 (al norte). Orinar deja una mancha real que a los diez segundos toma forma de hombre.
3. **La fiesta** (detrás del portón): pista roja que late, bola de espejos, bailarines sin rostro que se congelan cuando
   los miras y se acercan cuando les das la espalda, y tu doble bailando al fondo; si te acercas, se detiene, te mira y
   se va por la puerta del norte.
4. **Los pasillos que tragan**: azulejo que se vuelve carne, muros que se cierran, bocas en las paredes y una garganta
   de dientes de azulejo que te persigue. Al final, una puerta de luz fría: «Si todo vuelve a empezar, ¿para qué
   terminar algo?» y otra vez el baño.

Si la sombra o la garganta te alcanzan: pantalla roja y despiertas en el baño.

## Archivos
- `src/` — `main.js` (zonas, estado, bucle), `ps1.js` (imagen), `ciudad.js`, `detalles.js` (cornisas, autos, cables…),
  `jugador.js` (control, cámara, linterna, humo), `cuerpo.js` (el protagonista 3D: esqueleto y poses), `ratas.js`,
  `siniestro.js`, `fiesta.js`, `audio.js` (todo el sonido se genera en vivo, sin archivos), `hud.js`.

## El protagonista en 3D
- La malla salió de `fuentes/protagonista_apose.jpg` con **TRELLIS** (Microsoft, licencia MIT), en el espacio público
  `trellis-community/TRELLIS` de Hugging Face (gratis, 30 s). Original en `fuentes/modelo3d/`.
- `python herramientas/preparar_modelo.py` la deja a 1,78 m con los pies en el suelo, reconoce los brazos recorriendo la
  malla desde dentro de la manga, corta las uniones mano-abrigo (si no, se estiran como membranas), calcula los pesos
  de la piel y escribe `public/assets/protagonista.glb` y `protagonista.rig.json`. La revisión de los pesos queda en
  `fuentes/modelo3d/pesos_vistas.png` (cada color, un hueso).
- Las poses (quieto y fuma, camina, corre, baila, mira, cae) son números en `src/cuerpo.js`: no hay archivos de
  animación. El doble de la fiesta usa el mismo cuerpo. Si el modelo no carga, vuelve el muñeco de cajas.
- Meshy hizo un modelo con esqueleto y animaciones, pero bajarlo exige suscripción: no se usó.
- `node herramientas/capturas.mjs personaje` saca sólo fotos del protagonista (frente, perfil, pasos, baile, caída).
- `fuentes/` — imágenes de Flow (Nano Banana, 0 puntos). `sprites/rata.mp4` — animación de Dreamina (Seedance 2.5
  Draft). La sombra y el perro animados quedaron en Dreamina sin descargar (Chrome bloqueó las descargas múltiples).
- `herramientas/preparar_assets.py` — arma `public/assets/` (texturas repetibles, recortes, calcomanías, clips de los
  capítulos). `herramientas/capturas.mjs` — recorre el juego con Chrome invisible y en silencio y guarda `capturas/`.

Al salir del baño, el bloque 03 da a un almacén con la persiana baja y a un portal con citófono.
Los sedanes y familiares tienen carrocerías de chapa gastada, cristales, parachoques y tapacubos. Shift aumenta la carrera a 6,2 m/s.
Cuando la sombra se recoge y deja oír un raspado, prepara una embestida que se puede interrumpir con la linterna.
