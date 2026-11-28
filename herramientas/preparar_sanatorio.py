"""Texturas del cerro y del Sanatorio de la Pendiente, desde las imágenes de Flow en fuentes/ (28-nov).

    python herramientas/preparar_sanatorio.py

Las repetibles se mezclan con su copia corrida a la mitad (sin costuras), a 256 px como el resto del juego.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

J = Path(__file__).resolve().parents[1]
SRC = J / 'fuentes'
OUT = J / 'public' / 'assets'


def repetible(nombre, size=256, recorte=0.0):
    im = Image.open(SRC / f'{nombre}.jpg').convert('RGB')
    if recorte:
        w, h = im.size
        im = im.crop((int(w * recorte), int(h * recorte), int(w * (1 - recorte)), int(h * (1 - recorte))))
    a = np.asarray(im.resize((size, size), Image.LANCZOS)).astype(np.float32)
    corrida = np.roll(a, (size // 2, size // 2), axis=(0, 1))
    yy, xx = np.mgrid[0:size, 0:size]
    borde = np.minimum.reduce([xx, size - 1 - xx, yy, size - 1 - yy]) / (size * 0.22)
    m = np.clip(borde, 0, 1)[..., None] ** 1.2
    out = a * m + corrida * (1 - m)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT / f'{nombre}.png', optimize=True)


def plana(nombre, w, h, oscurecer=1.0):
    im = Image.open(SRC / f'{nombre}.jpg').convert('RGB').resize((w, h), Image.LANCZOS)
    if oscurecer != 1.0:
        im = ImageEnhance.Brightness(im).enhance(oscurecer)
    im.save(OUT / f'{nombre}.png', optimize=True)


for n in ['t_azulejo_hosp', 't_acolchado', 't_calamina', 't_damero']:
    repetible(n, recorte=0.02)
plana('t_puerta_celda', 128, 256)
plana('f_sanatorio', 512, 256, 0.85)
# el rostro del susto de la mirilla: jpg, se muestra encima de todo
Image.open(SRC / 's_grito.jpg').convert('RGB').resize((384, 384), Image.LANCZOS).save(OUT / 's_grito.jpg', quality=82)
for p in sorted(OUT.glob('*')):
    if p.stem in {'t_azulejo_hosp', 't_acolchado', 't_calamina', 't_damero', 't_puerta_celda', 'f_sanatorio', 's_grito'}:
        print(p.name, p.stat().st_size // 1024, 'KB')
