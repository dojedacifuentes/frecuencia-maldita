"""Deja el modelo 3D del protagonista listo para el juego, con su esqueleto.

Entrada: fuentes/modelo3d/protagonista_trellis_s1.glb (TRELLIS, Hugging Face, a partir de fuentes/protagonista_apose.jpg).
Salidas:
  public/assets/protagonista.glb       malla con los pies en y=0, centrada en x, 1,78 m, mirando a +z, textura de 512 px
  public/assets/protagonista.rig.json  articulaciones, jerarquía y pesos de la piel (4 huesos por vértice), que lee
                                       src/cuerpo.js para armar el esqueleto
  fuentes/modelo3d/pesos_vistas.png    revisión: cada vértice pintado según el hueso que lo mueve

Los brazos del modelo van pegados al abrigo: a media altura son anillos separados del cuerpo, así que el brazo se
reconoce por crecimiento sobre la malla (desde dentro de la manga, sin cruzar al abrigo) y no sólo por distancia.

    python herramientas/preparar_modelo.py
"""
import base64
import json
import pathlib
from collections import deque

import numpy as np
import trimesh
from PIL import Image, ImageDraw

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / 'fuentes' / 'modelo3d' / 'protagonista_trellis_s1.glb'
SALIDA = RAIZ / 'public' / 'assets' / 'protagonista.glb'
RIG = RAIZ / 'public' / 'assets' / 'protagonista.rig.json'
REVISION = RAIZ / 'fuentes' / 'modelo3d' / 'pesos_vistas.png'
ALTO = 1.78
TEXTURA = 512

# articulaciones en fracciones del alto, medidas sobre la malla (x+ = izquierda del personaje, z+ = adelante)
J = {
    'cadera': [0, 0.52, 0], 'columna': [0, 0.63, 0], 'pecho': [0, 0.73, 0], 'cuello': [0, 0.835, 0],
    'cabeza': [0, 0.875, 0.01],
    'hombroI': [0.118, 0.785, -0.01], 'codoI': [0.157, 0.615, -0.015], 'munecaI': [0.152, 0.48, 0.02],
    'musloI': [0.068, 0.5, -0.01], 'rodillaI': [0.066, 0.27, -0.03], 'tobilloI': [0.07, 0.065, -0.04],
}
for n in ['hombro', 'codo', 'muneca', 'muslo', 'rodilla', 'tobillo']:
    x, y, z = J[n + 'I']
    J[n + 'D'] = [-x, y, z]
PADRE = {
    'cadera': None, 'columna': 'cadera', 'pecho': 'columna', 'cuello': 'pecho', 'cabeza': 'cuello',
    'hombroI': 'pecho', 'codoI': 'hombroI', 'munecaI': 'codoI', 'hombroD': 'pecho', 'codoD': 'hombroD',
    'munecaD': 'codoD', 'musloI': 'cadera', 'rodillaI': 'musloI', 'tobilloI': 'rodillaI', 'musloD': 'cadera',
    'rodillaD': 'musloD', 'tobilloD': 'rodillaD',
}
NOMBRES = list(PADRE)
IDX = {n: i for i, n in enumerate(NOMBRES)}
PUNTA_MANO = [0.14, 0.39, 0.045]
CIGARRO = [0.135, 0.416, 0.11]    # punta del cigarro de la mano izquierda (la brasa)


def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def al_segmento(P, a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    ab = b - a
    t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1), t


# ---------------------------------------------------------------- 1. la malla
escena = trimesh.load(ENTRADA)
malla = list(escena.geometry.values())[0]
V = np.asarray(malla.vertices, dtype=np.float64)
y0, y1 = V[:, 1].min(), V[:, 1].max()
x0, x1 = V[:, 0].min(), V[:, 0].max()
malla.apply_translation([-(x0 + x1) / 2, -y0, 0])
malla.apply_scale(ALTO / (y1 - y0))
tex = malla.visual.material.baseColorTexture.convert('RGB').resize((TEXTURA, TEXTURA), Image.LANCZOS)
malla.visual.material = trimesh.visual.material.PBRMaterial(
    name='protagonista', baseColorTexture=tex, metallicFactor=0.0, roughnessFactor=1.0)
SALIDA.parent.mkdir(parents=True, exist_ok=True)
trimesh.Scene(malla).export(SALIDA)

# se vuelve a leer tal cual (sin procesar) para que el orden de vértices sea el mismo que verá el navegador
final = list(trimesh.load(SALIDA, process=False).geometry.values())[0]
U = np.asarray(final.vertices) / ALTO
F = np.asarray(final.faces)
n = len(U)

# vecinos: las costuras de la textura duplican vértices; se sueldan por posición para recorrer la superficie
_, suelda = np.unique(np.round(U * 4000).astype(np.int64), axis=0, return_inverse=True)
suelda = suelda.ravel()
ns = suelda.max() + 1
Us = np.zeros((ns, 3))
Us[suelda] = U
aristas = suelda[np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])]
aristas = aristas[aristas[:, 0] != aristas[:, 1]]
vecinos = [[] for _ in range(ns)]
for a, b in aristas:
    vecinos[a].append(b)
    vecinos[b].append(a)

# ---------------------------------------------------------------- 2. los brazos (crecimiento sobre la malla)
brazo = np.zeros(ns)
param_hombro = np.ones(ns)
for lado, s in (('I', 1), ('D', -1)):
    h, c, m = J['hombro' + lado], J['codo' + lado], J['muneca' + lado]
    p = [s * PUNTA_MANO[0], PUNTA_MANO[1], PUNTA_MANO[2]]
    d1, t1 = al_segmento(Us, h, c)
    d2, _ = al_segmento(Us, c, m)
    d3, _ = al_segmento(Us, m, p)
    d = np.minimum(np.minimum(d1, d2), d3)
    y = Us[:, 1]
    radio = np.where((y > 0.5) & (y < 0.7), 0.036, 0.05)
    permitido = (s * Us[:, 0] > 0.085) & (y > 0.36) & (y < 0.8) & (d < radio)
    semillas = np.where(permitido & (y > 0.56) & (y < 0.66) & (d < 0.026))[0]
    region = np.zeros(ns, bool)
    region[semillas] = True
    cola = deque(semillas)
    while cola:
        v = cola.popleft()
        for w in vecinos[v]:
            if permitido[w] and not region[w]:
                region[w] = True
                cola.append(w)
    brazo[region] = 1.0
    cerca = d1 <= d + 1e-9
    param_hombro[region & cerca] = t1[region & cerca]

# la manga y la mano tocan el abrigo: esos triángulos puente se estirarían como membranas al mover el brazo.
# Bajo la axila se quitan (quedan ocultos bajo el brazo en reposo); en el hombro se conservan para que doble suave.
en_brazo = brazo[suelda[F]] > 0.5
puente = en_brazo.any(1) & ~en_brazo.all(1) & (U[F][:, :, 1].mean(1) < 0.70)
F = F[~puente]
recortada = trimesh.Trimesh(vertices=final.vertices, faces=F, visual=final.visual, process=False)
trimesh.Scene(recortada).export(SALIDA)
comprobada = list(trimesh.load(SALIDA, process=False).geometry.values())[0]
assert np.allclose(np.asarray(comprobada.vertices), np.asarray(final.vertices)), 'cambió el orden de los vértices'
print(f'triángulos puente quitados: {puente.sum()}')
aristas = suelda[np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])]
aristas = aristas[aristas[:, 0] != aristas[:, 1]]
vecinos = [[] for _ in range(ns)]
for a, b in aristas:
    vecinos[a].append(b)
    vecinos[b].append(a)

# bordes suaves: dos pasadas de promedio con los vecinos (tras el corte sólo actúa en el hombro)
for _ in range(2):
    brazo = np.array([0.5 * brazo[v] + 0.5 * (np.mean(brazo[vecinos[v]]) if vecinos[v] else brazo[v]) for v in range(ns)])
# junto al hombro el brazo se funde con el pecho
brazo *= 0.35 + 0.65 * suave(0.0, 0.45, param_hombro)
brazo = np.clip(brazo, 0, 1)

# ---------------------------------------------------------------- 3. pesos por vértice
indices = np.zeros((n, 4), np.uint8)
pesos = np.zeros((n, 4), np.uint8)
dominante = np.zeros(n, int)
for i in range(n):
    px, py, pz = U[i]
    ax, lado = abs(px), ('I' if px >= 0 else 'D')
    w = {}

    def sumar(nombre, v):
        if v > 1e-4:
            w[nombre] = w.get(nombre, 0) + v

    b = brazo[suelda[i]]
    if b > 0:
        en_codo = suave(J['codoI'][1] + 0.03, J['codoI'][1] - 0.03, py)
        en_mano = suave(J['munecaI'][1] + 0.02, J['munecaI'][1] - 0.02, py)
        sumar('hombro' + lado, b * (1 - en_codo))
        sumar('codo' + lado, b * en_codo * (1 - en_mano))
        sumar('muneca' + lado, b * en_codo * en_mano)
    cuerpo = 1 - b
    if cuerpo > 0:
        if py >= J['cadera'][1]:
            cadena = ['cadera', 'columna', 'pecho', 'cuello', 'cabeza']
            resto = cuerpo
            for k in range(len(cadena) - 1, 0, -1):
                yj, ancho = J[cadena[k]][1], (0.018 if k >= 3 else 0.03)
                f = suave(yj - ancho, yj + ancho, py)
                sumar(cadena[k], resto * f)
                resto *= 1 - f
            sumar('cadera', resto)
        else:
            # el faldón del abrigo sigue a medias a los muslos; bajo el ruedo, piernas enteras
            pierna = 1.0 if py < 0.24 else 0.55 * (1 - suave(0.24, J['cadera'][1], py)) * suave(0.0, 0.07, ax)
            sumar('cadera', cuerpo * (1 - pierna))
            en_rodilla = suave(J['rodillaI'][1] + 0.03, J['rodillaI'][1] - 0.03, py)
            en_tobillo = suave(J['tobilloI'][1] + 0.025, J['tobilloI'][1] - 0.025, py)
            sumar('muslo' + lado, cuerpo * pierna * (1 - en_rodilla))
            sumar('rodilla' + lado, cuerpo * pierna * en_rodilla * (1 - en_tobillo))
            sumar('tobillo' + lado, cuerpo * pierna * en_rodilla * en_tobillo)
    lista = sorted(w.items(), key=lambda kv: -kv[1])[:4] or [('cadera', 1.0)]
    total = sum(v for _, v in lista)
    q = [int(round(v / total * 255)) for _, v in lista]
    q[0] += 255 - sum(q)
    for k, (nombre, _) in enumerate(lista):
        indices[i, k] = IDX[nombre]
        pesos[i, k] = q[k]
    dominante[i] = IDX[lista[0][0]]

RIG.write_text(json.dumps({
    'alto': ALTO, 'articulaciones': J, 'padres': PADRE, 'cigarro': CIGARRO, 'vertices': n,
    'indices': base64.b64encode(indices.tobytes()).decode(), 'pesos': base64.b64encode(pesos.tobytes()).decode(),
}))

# ---------------------------------------------------------------- 4. revisión: vértices pintados por hueso
COLORES = {
    'cadera': (90, 90, 90), 'columna': (140, 140, 140), 'pecho': (200, 200, 200), 'cuello': (255, 255, 255),
    'cabeza': (255, 230, 120), 'hombroI': (255, 60, 60), 'codoI': (255, 150, 40), 'munecaI': (255, 240, 0),
    'hombroD': (60, 120, 255), 'codoD': (40, 220, 255), 'munecaD': (160, 255, 255), 'musloI': (170, 40, 200),
    'rodillaI': (230, 120, 255), 'tobilloI': (255, 200, 255), 'musloD': (20, 160, 60), 'rodillaD': (80, 230, 110),
    'tobilloD': (190, 255, 190),
}
col = np.array([COLORES[NOMBRES[k]] for k in dominante])
S = 620
hojas = []
for titulo, eje, signo in [('frente (+z)', 0, 1), ('espalda', 0, -1), ('izquierda (+x)', 2, 1), ('derecha', 2, -1)]:
    im = Image.new('RGB', (int(S * 0.6), S + 20), (25, 25, 30))
    d = ImageDraw.Draw(im)
    prof = 2 if eje == 0 else 0
    hz = U[:, eje] * (signo if eje == 0 else -signo)
    orden = np.argsort(U[:, prof] * signo)
    for i in orden:
        x = (hz[i] + 0.3) / 0.6 * (S * 0.6)
        y = (1 - U[i, 1]) * S + 10
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=tuple(int(c) for c in col[i]))
    d.text((5, 5), titulo, fill=(255, 255, 255))
    hojas.append(im)
out = Image.new('RGB', (sum(h.width for h in hojas), hojas[0].height))
x = 0
for h in hojas:
    out.paste(h, (x, 0))
    x += h.width
out.save(REVISION)
print(f'{SALIDA.name}: {n} vértices, {len(F)} caras, {SALIDA.stat().st_size // 1024} KB; '
      f'{RIG.name}: {RIG.stat().st_size // 1024} KB; vértices de brazo: {(brazo[suelda] > 0.5).sum()}')
