"""Prépare les images du jeu à partir des packs CC0 téléchargés (voir CREDITS.md).

Usage : python scripts/build-assets.py assets/source
assets/source/ garde seulement les fichiers des packs lus ici (toon-characters/,
desert-platformer-pack/, boxes-crates/, platformer-pack-industrial/), avec la même
arborescence que les archives de CREDITS.md.
Sortie : assets/game/ (images réduites, décor recoloré dans la palette vinyle 70s).
"""

import sys
from pathlib import Path

from PIL import Image

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "assets" / "game"
OUT.mkdir(parents=True, exist_ok=True)

BG_SCALE = 0.4  # couches de 2880×1800 vers 1152×720


def hex_rgb(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


# Rampe de couleur du ciel, de la luminance la plus sombre à la plus claire.
SKY_RAMP = [(0.0, "#a8431f"), (0.5, "#e2582b"), (0.75, "#e9a93a"), (0.95, "#f1e2c4")]
# Couches 2 à 5, du plus loin au plus proche : du rouille clair au brun profond.
LAYER_COLORS = {2: "#c8622f", 3: "#9c4521", 4: "#6d3419", 5: "#452617"}


def ramp(lum):
    stops = [(p, hex_rgb(c)) for p, c in SKY_RAMP]
    if lum <= stops[0][0]:
        return stops[0][1]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if lum <= p1:
            t = (lum - p0) / (p1 - p0)
            return tuple(round(a + (b - a) * t) for a, b in zip(c0, c1))
    return stops[-1][1]


def recolor_sky(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (*ramp((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255), a)
    return im


def recolor_flat(im, color):
    rgb = Image.new("RGBA", im.size, (*hex_rgb(color), 255))
    rgb.putalpha(im.getchannel("A"))
    return rgb


def background():
    src = SRC / "desert-platformer-pack" / "desert platformer pack" / "background"
    for i in range(1, 6):
        im = Image.open(src / f"background{i}.png").convert("RGBA")
        im = im.resize((round(im.width * BG_SCALE), round(im.height * BG_SCALE)), Image.LANCZOS)
        im = recolor_sky(im) if i == 1 else recolor_flat(im, LAYER_COLORS[i])
        im.save(OUT / f"bg{i}.png", optimize=True)


def runner():
    src = SRC / "toon-characters" / "Male person" / "PNG" / "Poses HD"
    poses = ["run0", "run1", "run2", "jump", "fall", "slide", "hurt"]
    # Une planche horizontale de cases 96×128 ; les pieds sont en bas de chaque case.
    sheet = Image.new("RGBA", (96 * len(poses), 128))
    for i, name in enumerate(poses):
        im = Image.open(src / f"character_malePerson_{name}.png").convert("RGBA")
        sheet.alpha_composite(im.resize((96, 128), Image.LANCZOS), (96 * i, 0))
    sheet.save(OUT / "runner.png", optimize=True)


# Les consoles Kenney sont grises : on les passe en bois et tolex d'ampli 70s.
AMP_RAMP = [(0.0, "#1d110a"), (0.3, "#6d3419"), (0.55, "#e9a93a"), (1.0, "#f1e2c4")]


def recolor_ramp(im, stops_hex):
    stops = [(p, hex_rgb(c)) for p, c in stops_hex]
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
            for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
                if lum <= p1:
                    t = (lum - p0) / (p1 - p0)
                    px[x, y] = (*(round(u + (v - u) * t) for u, v in zip(c0, c1)), a)
                    break
    return im


def props():
    crates = SRC / "boxes-crates"
    for name in ["crate001", "crate002", "crate003"]:
        im = Image.open(crates / f"obj_{name}.png").convert("RGBA").resize((48, 48), Image.LANCZOS)
        im.save(OUT / f"{name}.png", optimize=True)

    industrial = SRC / "platformer-pack-industrial" / "PNG" / "Default size"
    for tile, name in [("046", "amp"), ("032", "amp-b")]:
        im = Image.open(industrial / f"platformIndustrial_{tile}.png").convert("RGBA")
        im = recolor_ramp(im.resize((48, 48), Image.LANCZOS), AMP_RAMP)
        im.save(OUT / f"{name}.png", optimize=True)
    # Barrière rayée orange et blanc, gardée dans ses couleurs, recadrée sur sa partie visible.
    bar = Image.open(industrial / "platformIndustrial_080.png").convert("RGBA")
    bar = bar.crop(bar.getbbox())
    bar.resize((48, round(bar.height * 48 / bar.width)), Image.LANCZOS).save(OUT / "barrier.png", optimize=True)


background()
runner()
props()
print("images écrites dans", OUT)
