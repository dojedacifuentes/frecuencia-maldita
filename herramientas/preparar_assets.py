"""Prepara los materiales del juego a partir de fuentes/ (imágenes de Flow), sprites/ (videos de Dreamina) y del
material de los capítulos. No toca ningún original: todo sale en public/assets/.

Uso:  python herramientas/preparar_assets.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

J = Path(__file__).resolve().parents[1]          # juego/
B = J.parent                                      # la-frecuencia-muerta/
SRC = J / "fuentes"
SPR = J / "sprites"
OUT = J / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)


def repetible(path, nombre, size=256):
    """Textura que se puede repetir sin costuras (mezcla con su copia corrida a la mitad)."""
    im = np.asarray(Image.open(path).convert("RGB").resize((size, size), Image.LANCZOS)).astype(np.float32)
    corrida = np.roll(im, (size // 2, size // 2), axis=(0, 1))
    yy, xx = np.mgrid[0:size, 0:size]
    borde = np.minimum.reduce([xx, size - 1 - xx, yy, size - 1 - yy]) / (size * 0.22)
    m = np.clip(borde, 0, 1)[..., None] ** 1.2
    out = im * m + corrida * (1 - m)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT / f"{nombre}.png")


def plana(path, nombre, size=256):
    Image.open(path).convert("RGB").resize((size, size), Image.LANCZOS).save(OUT / f"{nombre}.png")


def recorte(path, nombre, alto=256, tol=26, rgb=None):
    """Quita el fondo blanco conectado al borde y recorta a lo que queda."""
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.int16) if rgb is None else rgb.astype(np.int16)
    blanco = (im.min(axis=2) > 255 - tol) & ((im.max(axis=2) - im.min(axis=2)) < 30)
    lab, _ = ndimage.label(blanco)
    bordes = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fondo = np.isin(lab, list(bordes))
    tam = np.bincount(lab.ravel())                       # huecos blancos grandes encerrados (entre ganchos, brazos)
    grandes = [i for i in range(1, len(tam)) if tam[i] > im.shape[0] * im.shape[1] * 0.004]
    fondo |= np.isin(lab, grandes)
    alfa = (~fondo).astype(np.float32)
    alfa = ndimage.binary_erosion(alfa > 0.5, iterations=1).astype(np.float32)
    alfa = ndimage.gaussian_filter(alfa, 0.6)
    ys, xs = np.nonzero(alfa > 0.05)
    if len(ys) == 0:
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([im[y0:y1, x0:x1].clip(0, 255), (alfa[y0:y1, x0:x1] * 255)]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    w = max(1, round(img.width * alto / img.height))
    img = img.resize((w, alto), Image.LANCZOS)
    if nombre:
        img.save(OUT / f"{nombre}.png")
    return img


def calcomania(path, nombre, size=256):
    """Mancha oscura sobre blanco -> mancha con transparencia."""
    im = np.asarray(Image.open(path).convert("RGB").resize((size, size), Image.LANCZOS)).astype(np.float32)
    lum = im.mean(axis=2)
    alfa = np.clip((238 - lum) / 170, 0, 1) ** 0.85
    color = np.clip(im * 0.55, 0, 255)
    Image.fromarray(np.dstack([color, alfa * 255]).astype(np.uint8), "RGBA").save(OUT / f"{nombre}.png")


def protagonista():
    """Ropa y cara del protagonista, recortadas de su ficha (vista de frente, de lado y de espalda)."""
    ficha = Image.open(B / "frames" / "00_ficha_protagonista.jpg").convert("RGB")
    cortes = {
        "p_cara": (188, 40, 268, 122), "p_nuca": (1108, 40, 1188, 116), "p_perfil": (636, 40, 716, 128),
        "p_torso_f": (130, 130, 330, 360), "p_torso_e": (1030, 130, 1270, 360), "p_torso_l": (650, 140, 770, 360),
        "p_falda_f": (120, 340, 340, 565), "p_falda_e": (1040, 340, 1265, 555), "p_falda_l": (640, 340, 790, 555),
        "p_manga": (690, 180, 750, 420), "p_pantalon": (158, 565, 212, 690), "p_mano": (98, 405, 132, 460),
    }
    for n, box in cortes.items():
        ficha.crop(box).resize((64, 64) if n in ("p_cara", "p_nuca", "p_perfil", "p_mano") else (128, 128),
                               Image.LANCZOS).save(OUT / f"{n}.png")


def video(src, nombre, inp=0.0, dur=4.0, extra="", w=256, h=144, fps=15):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(inp), "-t", str(dur), "-i", str(B / src),
                    "-vf", f"{extra}scale={w}:{h}:flags=area,fps={fps},format=yuv420p", "-an", "-c:v", "libx264",
                    "-profile:v", "baseline", "-crf", "28", "-movflags", "+faststart", str(OUT / f"{nombre}.mp4")],
                   check=True)


def hoja_sprites(mp4, nombre, cuadros=10, alto=128, t0=0.6, t1=None):
    """Cuadros de un video de Dreamina (fondo blanco) -> tira de sprites con transparencia + datos."""
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp4)],
                               capture_output=True, text=True).stdout)
    t1 = t1 or dur - 0.3
    imgs = []
    for k in range(cuadros):
        t = t0 + (t1 - t0) * k / cuadros
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(mp4), "-frames:v", "1", "-f", "rawvideo",
                              "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        wv, hv = 854, 480
        info = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                               "-of", "csv=p=0", str(mp4)], capture_output=True, text=True).stdout.strip().split(",")
        wv, hv = int(info[0]), int(info[1])
        fr = np.frombuffer(raw, np.uint8).reshape(hv, wv, 3)
        img = recorte(None, None, alto=alto, tol=40, rgb=fr)
        if img is not None:
            imgs.append(img)
    if not imgs:
        return
    ancho = max(i.width for i in imgs)
    tira = Image.new("RGBA", (ancho * len(imgs), alto), (0, 0, 0, 0))
    for k, i in enumerate(imgs):
        tira.paste(i, (k * ancho + (ancho - i.width) // 2, 0))
    tira.save(OUT / f"{nombre}.png")
    return {"cuadros": len(imgs), "ancho": ancho, "alto": alto}


def main():
    for n in ("azulejo", "concreto", "ladrillo", "cortina", "asfalto", "vereda"):
        repetible(SRC / f"tex_{n}.jpg", f"t_{n}")
    repetible(SRC / "cielo.jpg", "t_cielo")
    for n in ("puerta", "ventana", "vitrina"):
        plana(SRC / f"tex_{n}.jpg", f"t_{n}")
    for n in ("hombre", "agachado", "perro"):
        calcomania(SRC / f"mancha_{n}.jpg", f"m_{n}")
    for n, alto in (("vieja_frente", 256), ("vieja_espalda", 256), ("sombra", 256), ("rata", 64), ("basura", 128),
                    ("abrigos", 256), ("farol", 256)):
        recorte(SRC / f"{n}.jpg", f"s_{n}", alto=alto)
    protagonista()
    # la fiesta y los pasillos
    for n in ("pista", "carne", "terciopelo", "bloque", "oxido"):
        repetible(SRC / f"tex_{n}.jpg", f"t_{n}")
    for n in ("local", "alcantarilla"):
        plana(SRC / f"tex_{n}.jpg", f"t_{n}")
    recorte(SRC / "afiche.jpg", "s_afiche", alto=256)
    for k in (1, 2, 3):
        recorte(SRC / f"baile{k}.jpg", f"s_baile{k}", alto=256)
    from PIL import Image as _I
    _I.open(B / "parte4" / "frames" / "S5.jpg").convert("RGB").resize((256, 144), _I.LANCZOS).save(OUT / "t_dientes.png")
    # pantallas, charcos y muros que se mueven (material de los capítulos)
    video("parte3/clips/originales/04b.mp4", "v_ojo", 0.5, 4.0)
    video("clips/originales/p05_v1.mp4", "v_fiesta", 0.5, 4.0)
    video("parte2/clips/originales/03.mp4", "v_mancha", 0.5, 4.0)
    video("parte4/clips/originales/11.mp4", "v_boca", 0.0, 3.0)
    video("parte3/clips/originales/12.mp4", "v_relojes", 0.5, 4.0, extra="reverse,")
    video("parte3/clips/originales/09alt.mp4", "v_monitores", 0.5, 4.0)
    video("parte2/clips/originales/B4.mp4", "v_vieja", 0.5, 4.0)
    video("parte4/clips/originales/12.mp4", "v_mandibula", 0.0, 2.5)
    datos = {}
    for n in ("rata", "sombra", "perro"):
        mp4 = SPR / f"{n}.mp4"
        if mp4.exists():
            d = hoja_sprites(mp4, f"a_{n}", cuadros=12 if n == "rata" else 10, alto=96 if n == "rata" else 192)
            if d:
                datos[n] = d
    (OUT / "sprites.json").write_text(json.dumps(datos, indent=1), encoding="utf-8")
    print("ok", len(list(OUT.iterdir())), "archivos en", OUT, datos)


if __name__ == "__main__":
    main()
