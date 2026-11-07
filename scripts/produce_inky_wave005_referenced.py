#!/usr/bin/env python3
"""Produce reference-bound Inky wave-005 drafts, never approve them automatically.

This renderer imports the project's OWN approved character and NPC model sheets,
rather than constructing replacement faces/costumes from hand-written polygons.
The original environmental staging remains separate for each canonical panel.
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import produce_inky_wave005 as draft

# Gameplay sprite is the authoritative in-game design. The high-detail sheet
# supplies richer lighting, fabric, face and equipment without a new costume.
MODELS = {
    "inky": ROOT / "docs/story-art-600/references/inky.png",
    "neris": ROOT / "docs/story-art-600/references/npcs/neris.png",
    "blank_page": ROOT / "docs/story-art-600/references/npcs/blank_page.png",
}
SPRITE = ROOT / "assets/sprites/upgrade_v1/hero_inky.png"


def meaningful_alpha(image: Image.Image) -> bool:
    a = image.getchannel("A")
    lo, hi = a.getextrema()
    return lo < 230 and hi > 80


def extract_hero_view(image: Image.Image, back: bool = False) -> Image.Image:
    # Canonical sheets place three full-body views in the TOP row, with
    # face/equipment studies below. Never paste the entire reference sheet
    # as an actor: isolate exactly one full-body column before compositing.
    w, h = image.size
    column = 2 if back else 0
    x0 = round(w * column / 3)
    x1 = round(w * (column + 1) / 3)
    return tight_crop(image.crop((x0, 0, x1, round(h * .73))))

def tight_crop(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    # Ignore extremely faint antialias fringe, but preserve translucent edges.
    mask = alpha.point(lambda x: 255 if x > 12 else 0)
    bbox = mask.getbbox()
    return image.crop(bbox) if bbox else image


def load_reference(key: str, back: bool = False) -> Image.Image:
    src = MODELS[key]
    if not src.is_file():
        raise FileNotFoundError(f"Canonical reference is missing: {src}")
    image = Image.open(src).convert("RGBA")
    if not meaningful_alpha(image):
        raise ValueError(f"Canonical model reference has no transparent background: {src}")
    return extract_hero_view(image, back) if key == "inky" else tight_crop(image.crop((0, 0, round(image.width / 3), round(image.height * (.70 if key == "blank_page" else .77)))))


def palette_check() -> None:
    if not SPRITE.exists():
        raise FileNotFoundError(f"In-game hero sprite missing: {SPRITE}")
    with Image.open(SPRITE) as im:
        if im.size != (64, 64):
            raise ValueError("Inky identity reference must be the canonical 64x64 sprite")


def paste_actor(p, key: str, x: int, floor_y: int, height: int, *, back: bool = False):
    crop = load_reference(key, back)
    # Resize source art to low-resolution logical pixel canvas FIRST.
    width = max(1, round(crop.width * (height / crop.height)))
    actor = crop.resize((width, height), Image.Resampling.LANCZOS)
    # Controlled palette simplifies the clusters while keeping the same model.
    actor = actor.quantize(colors=64, method=Image.Quantize.FASTOCTREE,
                           dither=Image.Dither.NONE).convert("RGBA")
    px = round(x - width / 2)
    py = floor_y - height
    # Simple grounded shadow, not a smooth glow or new drawn-on clothing.
    shade = ImageDraw.Draw(p.img)
    shade.ellipse((x - width * .43, floor_y - 3, x + width * .43, floor_y + 2),
                  fill=(19, 23, 34))
    p.img.paste(actor, (px, py), actor)


def inky(p, x, y, s=1, pose="stand", back=False):
    # Front / back sheet angle chosen from the actual approved Inky model.
    # The original 64x64 sprite is validated, never reinterpreted into a new hat.
    paste_actor(p, "inky", x, y, int(127 * s), back=back)


def neris(p, x, y, s=1, gesture=False):
    paste_actor(p, "neris", x, y, int(132 * s))


def blank_page(p, x, y, s=1):
    paste_actor(p, "blank_page", x, y, int(115 * s))


def finalize_scene(scene):
    # Enforce cohesive pixel-cluster colors on 640x360 before the upstream
    # pipeline's exact 2x NEAREST upscale, preserving crisp hard edges.
    src = scene()
    return src.quantize(colors=128, method=Image.Quantize.MEDIANCUT,
                        dither=Image.Dither.NONE).convert("RGB")


def main():
    palette_check()
    for key in MODELS:
        a = load_reference(key)
        if min(a.size) < 50:
            raise ValueError(f"{key} reference crop is implausibly small: {a.size}")
        print(f"Using canonical reference for {key}: {MODELS[key]} ({a.size})")
    draft.inky = inky
    draft.neris = neris
    draft.blank_page = blank_page
    draft.SCENES = [
        (lambda f=f: finalize_scene(f)) for f in draft.SCENES
    ]
    draft.main()


if __name__ == "__main__":
    main()
