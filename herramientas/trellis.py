"""Imagen (de Flow, fondo blanco, cuerpo completo) → modelo 3D con TRELLIS (Hugging Face, gratis, sin cuenta).

    python herramientas/trellis.py fuentes/m_gatea.jpg gatea [semilla]

Deja fuentes/modelo3d/<nombre>_trellis_s<semilla>.glb (y el video de vista previa, si viene). Tarda ~30-90 s por
modelo según la cola del espacio. Después, herramientas/preparar_monstruos.py lo achica para el juego.
"""
import pathlib
import shutil
import sys
import time

from gradio_client import Client, handle_file

RAIZ = pathlib.Path(__file__).resolve().parent.parent
img = pathlib.Path(sys.argv[1])
nombre = sys.argv[2]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
dest = RAIZ / 'fuentes' / 'modelo3d'
dest.mkdir(parents=True, exist_ok=True)

c = Client('trellis-community/TRELLIS', verbose=False, httpx_kwargs={'timeout': 300})
t0 = time.time()
c.predict(api_name='/start_session')
pre = c.predict(image=handle_file(str(img)), api_name='/preprocess_image')
shutil.copy(pre, dest / f'{nombre}_entrada.png')
print('preparada', round(time.time() - t0), 's', flush=True)
video, glb, glb2 = c.predict(
    image=handle_file(pre), multiimages=[], seed=seed,
    ss_guidance_strength=7.5, ss_sampling_steps=12,
    slat_guidance_strength=3.0, slat_sampling_steps=12,
    multiimage_algo='stochastic', mesh_simplify=0.9, texture_size=1024,
    api_name='/generate_and_extract_glb')
shutil.copy(glb2 or glb, dest / f'{nombre}_trellis_s{seed}.glb')
if isinstance(video, dict) and video.get('video'):
    shutil.copy(video['video'], dest / f'{nombre}_trellis_s{seed}.mp4')
print('listo', nombre, round(time.time() - t0), 's', flush=True)
