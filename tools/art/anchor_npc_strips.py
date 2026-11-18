"""Pin the feet of every NPC hub idle sheet to one spot.

The NPC sheets were not part of CHARACTER_PREFIXES in build_web_art.py, so
each frame kept the generator's own placement and the keeper slid 10-30 px
sideways every frame in the hub. This re-seats the already-built web copies
with the same seat_cells() the heroes/enemies use. Run once after a rebuild
that does not include npc_ in CHARACTER_PREFIXES (it now does).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from build_web_art import seat_cells  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
for path in sorted((ROOT / "assets/art/grimoire/npcs").glob("*/hub_idle.webp")):
    im = Image.open(path).convert("RGBA")
    ch = im.height
    frames = im.width // ch
    cells = [np.array(im.crop((i * ch, 0, (i + 1) * ch, ch))) for i in range(frames)]
    out = seat_cells(cells, None, "idle")
    sheet = Image.new("RGBA", im.size)
    for i, cell in enumerate(out):
        sheet.paste(Image.fromarray(cell), (i * ch, 0))
    sheet.save(path, "WEBP", quality=90, alpha_quality=92, method=6)
    print("anchored", path.parent.name, frames)
