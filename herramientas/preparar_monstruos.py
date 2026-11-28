"""Monstruos de TRELLIS → listos para el juego (28-nov).

Antes, con gltf-transform (npx, sin instalar nada en el proyecto) se suelda y simplifica la malla conservando la textura:
    npx --yes @gltf-transform/cli@4.1.1 weld   fuentes/modelo3d/gatea_trellis_s1.glb fuentes/modelo3d/g1.glb
    npx --yes @gltf-transform/cli@4.1.1 simplify fuentes/modelo3d/g1.glb fuentes/modelo3d/gatea_simple.glb --ratio 0.14 --error 0.002
Luego:
    python herramientas/preparar_monstruos.py
Deja public/assets/m_gatea.glb: apoyada en y=0, centrada, del alto pedido, con textura de 512 px.
"""
import pathlib

import numpy as np
import trimesh
from PIL import Image, ImageEnhance

RAIZ = pathlib.Path(__file__).resolve().parent.parent
M3D = RAIZ / 'fuentes' / 'modelo3d'
OUT = RAIZ / 'public' / 'assets'

MONSTRUOS = {
    # nombre: (entrada simplificada, alto en metros, brillo de la textura)
    'gatea': ('gatea_simple.glb', 1.05, 0.9),
}

for nombre, (archivo, alto, brillo) in MONSTRUOS.items():
    escena = trimesh.load(M3D / archivo)
    malla = list(escena.geometry.values())[0]
    v = malla.vertices.copy()
    lo, hi = v.min(axis=0), v.max(axis=0)
    v -= [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2]
    v *= alto / (hi[1] - lo[1])
    malla.vertices = v
    tex = malla.visual.material.baseColorTexture.convert('RGB').resize((512, 512), Image.LANCZOS)
    tex = ImageEnhance.Brightness(tex).enhance(brillo)
    malla.visual.material.baseColorTexture = tex
    malla.visual.material.metallicFactor = 0.0
    malla.visual.material.roughnessFactor = 1.0
    trimesh.Scene(malla).export(OUT / f'm_{nombre}.glb')
    tam = (OUT / f'm_{nombre}.glb').stat().st_size // 1024
    print(nombre, len(malla.faces), 'caras', tam, 'KB', 'medidas', np.round(malla.vertices.max(axis=0) - malla.vertices.min(axis=0), 2))
