#!/usr/bin/env python3
"""Build the runtime (web) copy of the Grimoire art set.

The 1174 generated originals (~1 GB of PNG) live on the art branch
`codex/mobile-ipad-touch-layout` under `assets/art/grimoire/`. The game only
ships downscaled WebP copies plus `atlas.json`, which tells the runtime how to
slice every animation strip.

    python3 tools/art/build_web_art.py --src /path/to/originals/assets/art/grimoire [--force]

Re-running is incremental: an output is rebuilt only when its source is newer
(or the output is missing/empty). Pass --force after changing this script.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "docs/art-direction/asset-manifest.json"
FORCE = os.environ.get("GRIMOIRE_FORCE") == "1"
OUT = ROOT / "assets/art/grimoire"

# Groups that never ship inside the game build.
SKIP_GROUPS = ("01 ", "18 ", "30 ", "31 ")


def target_long_edge(entry: dict) -> int:
    """Longest edge (per cell for strips) the runtime copy should have."""
    path = entry["path"]
    cw, ch = entry["cell"]
    long_edge = max(cw, ch)
    if (entry.get("frames") or 1) > 1:
        if "/bosses/" in path:
            return min(long_edge, 320)
        if "/heroes/" in path or "/enemies/" in path or "/npcs/" in path:
            return min(long_edge, 192)
        return min(long_edge, 192)
    if any(k in path for k in ("/screens/", "/route/")) and long_edge >= 2000:
        return 1920
    if "/story/" in path or "/tutorial/" in path:
        return min(long_edge, 1600)
    if path.endswith(("/portrait.png", "/full.png")) or "/modes/" in path:
        return min(long_edge, 1200)
    if "/arena/" in path and path.endswith("/frame.png"):
        return min(long_edge, 2400)  # stretched over the 2800 px arena
    if "/arena/" in path and path.endswith("/light_overlay.png"):
        return min(long_edge, 1600)
    if "/materials/" in path or "/arena/" in path:
        return min(long_edge, 1024)
    if "/face_" in path or "/hub/lore/" in path or "/hub/stations/" in path:
        return min(long_edge, 512)
    return min(long_edge, 256)


# ---------------------------------------------------------------------------
# Character strip normalisation
#
# Generated strips are not always consistent: a few frames arrive on a
# rectangle of paper, some sheets draw the figure at half size, and limbs
# from a neighbouring cell can leak across the border. Character strips are
# therefore cleaned and re-seated so every action of one character shares a
# scale, a ground line and a horizontal anchor.
# ---------------------------------------------------------------------------
CHARACTER_PREFIXES = ("hero_", "enemy_", "boss_")
CHARACTER_SKIP_ACTIONS = ("face_", "portrait", "medallion", "card", "title", "full", "defeat")
BASELINE = 0.93  # ground line as a fraction of cell height
FREE_ACTIONS = ("death", "dash")  # keep their authored travel/fall


def character_key(entry: dict) -> tuple[str, str] | None:
    asset_id = entry["id"]
    if (entry.get("frames") or 1) < 2 or not asset_id.startswith(CHARACTER_PREFIXES):
        return None
    if asset_id.startswith("enemy_projectile"):
        return None
    char, action = asset_id.rsplit("_", 1)
    if any(action.startswith(s) for s in CHARACTER_SKIP_ACTIONS):
        return None
    return char, action


def _grow(seed: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Geodesic reconstruction: everything in `mask` 4-connected to `seed`."""
    region = seed & mask
    while True:
        grown = region.copy()
        grown[1:] |= region[:-1]
        grown[:-1] |= region[1:]
        grown[:, 1:] |= region[:, :-1]
        grown[:, :-1] |= region[:, 1:]
        grown &= mask
        if (grown == region).all():
            return region
        region = grown


def remove_box_lines(cell: np.ndarray) -> np.ndarray:
    """Erase long, hairline-thin straight rules (stray frame boxes) from a cell."""
    solid = cell[:, :, 3] > 10
    h, w = solid.shape
    hits = np.zeros_like(solid)
    for axis, length in ((1, w), (0, h)):
        grid = solid if axis == 1 else solid.T
        out = hits if axis == 1 else hits.T
        for i in np.nonzero(grid.sum(axis=1) > length * 0.4)[0]:
            # A rule is thin: the rows 3 px above and below are mostly empty along it.
            above = grid[max(0, i - 3)] if i >= 3 else np.zeros(grid.shape[1], bool)
            below = grid[i + 3] if i + 3 < grid.shape[0] else np.zeros(grid.shape[1], bool)
            line = grid[i] & ~above & ~below
            if line.sum() > length * 0.3:
                for j in range(max(0, i - 2), min(grid.shape[0], i + 3)):
                    out[j] |= grid[j] & line
    if hits.any():
        cell = cell.copy()
        cell[hits, 3] = 0
    return cell


def clean_cell(cell: np.ndarray) -> np.ndarray:
    """Remove a paper backdrop and neighbour-cell leakage from one RGBA cell."""
    cell = remove_box_lines(cell)
    rgb = cell[:, :, :3].astype(np.int16)
    alpha = cell[:, :, 3]
    solid = alpha > 10
    if solid.any():
        ys, xs = np.nonzero(solid)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        lum = rgb.mean(axis=2)
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        paper = solid & (lum > 196) & (sat < 34)
        inset = 6  # look just inside the bounds so a thin card border does not hide the paper
        iy0, iy1, ix0, ix1 = y0 + inset, y1 - inset, x0 + inset, x1 - inset
        edge = np.concatenate([paper[iy0, ix0:ix1], paper[iy1, ix0:ix1], paper[iy0:iy1, ix0], paper[iy0:iy1, ix1]]) if iy1 > iy0 and ix1 > ix0 else np.zeros(1)
        if edge.mean() > 0.55:  # the opaque bounds are framed by paper: a backdrop, not a character
            # Flood from the transparent surround (and the card's border ring)
            # through paper-coloured pixels, then through the soft paper fringe.
            ring = np.zeros_like(solid)
            ring[y0:y1 + 1, x0:x1 + 1] = True
            ring[iy0:iy1 + 1, ix0:ix1 + 1] = False
            backdrop = _grow(~solid | ring, paper | ~solid | ring)
            fringe = solid & (lum > 170) & (sat < 40)
            backdrop = _grow(backdrop, backdrop | fringe)
            cell = cell.copy()
            cell[backdrop & solid, 3] = 0
            alpha = cell[:, :, 3]
    content = alpha > 40
    total = content.sum()
    if total:
        border = np.zeros_like(content)
        border[:, :2] = True
        border[:, -2:] = True
        leaked = _grow(content & border, content)
        if 0 < leaked.sum() < total * 0.12:
            cell = cell.copy()
            cell[_grow(leaked, alpha > 0), 3] = 0
    return cell


def frame_metrics(cell: np.ndarray) -> tuple[float, float, float] | None:
    """(height, bottom, anchor_x) of the figure, ignoring faint wisps."""
    content = cell[:, :, 3] > 60
    if content.sum() < 30:
        return None
    ys, xs = np.nonzero(content)
    top, bottom = np.percentile(ys, 1), np.percentile(ys, 99.5)
    lower = ys > top + (bottom - top) * 0.45  # body/legs, not an extended weapon
    anchor_x = xs[lower].mean() if lower.any() else xs.mean()
    return bottom - top, bottom, anchor_x


def load_cells(path: Path, frames: int, cw: int, ch: int) -> list[np.ndarray]:
    im = np.array(Image.open(path).convert("RGBA"))
    return [clean_cell(im[:ch, i * cw:(i + 1) * cw]) for i in range(frames)]


def measure_character_sheet(args: tuple[str, dict]) -> tuple[str, float | None]:
    src_root, entry = args
    src = Path(src_root) / Path(entry["path"]).relative_to("assets/art/grimoire")
    cw, ch = entry["cell"]
    heights = [m[0] / ch for c in load_cells(src, entry["frames"], cw, ch) if (m := frame_metrics(c))]
    return entry["id"], float(np.median(heights)) if heights else None


def seat_cells(cells: list[np.ndarray], target_h: float | None, action: str) -> list[np.ndarray]:
    """Scale the whole sheet to `target_h` (fraction of cell) and pin it to the ground line."""
    ch, cw = cells[0].shape[:2]
    metrics = [frame_metrics(c) for c in cells]
    measured = [m for m in metrics if m]
    if not measured:
        return cells
    # A fall or a lunge shrinks the figure on purpose; judge those sheets by
    # their first (standing) frame only.
    sheet_h = (measured[0][0] if action in FREE_ACTIONS else float(np.median([m[0] for m in measured]))) / ch
    scale = 1.0
    if target_h and sheet_h > 0:
        ratio = target_h / sheet_h
        if ratio < 0.8 or ratio > 1.25:  # only correct real outliers; poses vary naturally
            scale = ratio
    ref = measured[0]
    out = []
    for cell, m in zip(cells, metrics):
        img = Image.fromarray(cell)
        if scale != 1.0:
            img = img.resize((max(1, round(cw * scale)), max(1, round(ch * scale))), Image.LANCZOS)
        if m is None:
            out.append(np.array(Image.new("RGBA", (cw, ch))))
            continue
        basis = ref if action in FREE_ACTIONS else m
        # Free actions keep each frame's offset from the first frame.
        _, bottom, anchor = basis
        dx = cw * 0.5 - anchor * scale
        dy = ch * BASELINE - bottom * scale
        if action in FREE_ACTIONS:
            dx += (m[2] - ref[2]) * scale
            dy += (m[1] - ref[1]) * scale
        canvas = Image.new("RGBA", (cw, ch))
        canvas.paste(img, (round(dx), round(dy)))  # straight copy; clips negative offsets
        out.append(np.array(canvas))
    return out


# Floor opening of each arena border in the 2400x1800 web copy, checked by eye.
# The hole is flooded inside this box only: border shelves share the floor's dark tone.
ARENA_FLOOR_BOX = {
    "reading_hall": (150, 285, 2250, 1590),
    "word_corridor": (206, 264, 2194, 1514),
    "observatory": (114, 204, 2340, 1583),
    "last_page": (147, 153, 2256, 1632),
}


def is_arena_floor(entry: dict) -> bool:
    return "/arena/" in entry["path"] and "/floor_" in entry["path"] and not entry.get("transparent")


def seamless_floor(im: Image.Image, reference: Image.Image | None) -> Image.Image:
    """Make a floor tile wrap cleanly and match its biome's tone.

    The generated tiles are not truly seamless. Blend each tile with a copy
    rolled by half its size, but only in a band along the edges: at the
    border the pixels come from the rolled copy's (continuous) centre, while
    the middle keeps the original. Then match the mean brightness of the
    biome's reference variant so mixed variants do not read as patches.
    """
    a = np.array(im.convert("RGB")).astype(np.float32)
    h, w = a.shape[:2]
    rolled = np.roll(a, (h // 2, w // 2), axis=(0, 1))
    band = 0.2
    wx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w * band), 0, 1)
    wy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / (h * band), 0, 1)
    mask = np.minimum.outer(wy, wx)[..., None]
    out = a * mask + rolled * (1 - mask)
    if reference is not None:
        target = np.array(reference.convert("RGB")).astype(np.float32).mean(axis=(0, 1))
        out *= target / np.maximum(out.mean(axis=(0, 1)), 1)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def is_arena_frame(entry: dict) -> bool:
    return "/arena/" in entry["path"] and entry["path"].endswith("/frame.png")


def open_arena_frame(im: Image.Image, biome: str) -> tuple[Image.Image, list[int]]:
    """Make the dark, empty centre of an arena border transparent.

    The border art is opaque with a flat dark middle meant for the floor. Flood
    from the centre through that flat dark area so the floor tiles show through,
    feathering the edge so rounded corners blend. Returns the image and the
    bounding box of the hole (the playable floor) in image pixels.
    """
    from PIL import ImageFilter
    rgb = np.array(im.convert("RGB")).astype(np.int16)
    h, w = rgb.shape[:2]
    lum = rgb.mean(axis=2)
    ref = lum[h // 2 - 100:h // 2 + 100, w // 2 - 100:w // 2 + 100].mean()
    # Flood on a quarter-size mask (fast), then scale the hole back up.
    flat = Image.fromarray(((np.abs(lum - ref) < 14) * 255).astype(np.uint8)).resize((w // 4, h // 4), Image.NEAREST)
    flat_small = np.array(flat) > 0
    x0, y0, x1, y1 = (v // 4 for v in ARENA_FLOOR_BOX[biome])
    inside = np.zeros_like(flat_small)
    inside[y0:y1, x0:x1] = True
    flat_small &= inside
    seed = np.zeros_like(flat_small)
    seed[h // 8, w // 8] = True
    hole_small = _grow(seed, flat_small)
    hole = np.array(Image.fromarray((hole_small * 255).astype(np.uint8)).resize((w, h), Image.NEAREST)) > 0
    ys, xs = np.nonzero(hole)
    box = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    mask = Image.fromarray((~hole * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out, box


def build_one(args: tuple[str, dict, float | None]) -> tuple[str, dict | None, str | None]:
    src_root, entry, target_h = args
    src = Path(src_root) / Path(entry["path"]).relative_to("assets/art/grimoire")
    rel = Path(entry["path"]).relative_to("assets/art/grimoire").with_suffix(".webp")
    dst = OUT / rel
    if not src.exists():
        return entry["id"], None, f"missing {src}"
    frames = entry.get("frames") or 1
    cw, ch = entry["cell"]
    edge = target_long_edge(entry)
    scale = min(1.0, edge / max(cw, ch))
    ncw, nch = max(1, round(cw * scale)), max(1, round(ch * scale))
    key = character_key(entry)
    # An empty file is what an interrupted run leaves behind: always rebuild it.
    # Rebuild only when the source changed (WebP output is not byte-stable, so
    # re-encoding everything would churn the repo); use --force after pipeline changes.
    stale = FORCE or not dst.exists() or dst.stat().st_size == 0 or dst.stat().st_mtime < src.stat().st_mtime
    if stale and key:
        cells = seat_cells(load_cells(src, frames, cw, ch), target_h, key[1])
        sheet = Image.new("RGBA", (ncw * frames, nch))
        for i, cell in enumerate(cells):
            sheet.paste(Image.fromarray(cell).resize((ncw, nch), Image.LANCZOS), (i * ncw, 0))
        dst.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(dst, "WEBP", quality=82, alpha_quality=88, method=6)
    elif stale:
        im = Image.open(src)
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        im = im.convert("RGBA" if has_alpha else "RGB")
        if frames > 1:
            # Resize per cell so neighbouring frames never bleed into each other.
            sheet = Image.new(im.mode, (ncw * frames, nch), (0, 0, 0, 0) if has_alpha else (0, 0, 0))
            for i in range(frames):
                cell = im.crop((i * cw, 0, (i + 1) * cw, ch)).resize((ncw, nch), Image.LANCZOS)
                sheet.paste(cell, (i * ncw, 0))
            im = sheet
        elif scale < 1:
            im = im.resize((ncw, nch), Image.LANCZOS)
        if is_arena_floor(entry):
            ref_path = src.with_name("floor_a.png")
            im = seamless_floor(im, Image.open(ref_path) if ref_path.exists() and ref_path != src else None)
        if is_arena_frame(entry):
            im, _ = open_arena_frame(im, entry["path"].split("/")[-2])
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "WEBP", quality=82, alpha_quality=88, method=6)
    record = {"src": f"assets/art/grimoire/{rel.as_posix()}"}
    if is_arena_frame(entry):
        alpha = np.array(Image.open(dst))[:, :, 3]
        ys, xs = np.nonzero(alpha < 128)
        record["inner"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    if frames > 1:
        record.update(frames=frames, fps=entry.get("fps") or 8, cell=[ncw, nch])
    else:
        record["size"] = [ncw, nch]
    return entry["id"], record, None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True, help="folder holding the original assets/art/grimoire tree")
    parser.add_argument("--jobs", type=int, default=min(6, os.cpu_count() or 4))
    parser.add_argument("--force", action="store_true", help="re-encode everything (after pipeline changes)")
    ns = parser.parse_args()
    if ns.force:
        os.environ["GRIMOIRE_FORCE"] = "1"  # read by worker processes at import
        global FORCE
        FORCE = True
    manifest = json.loads(MANIFEST.read_text())
    entries = [e for e in manifest["entries"] if not e["group"].startswith(SKIP_GROUPS)]
    atlas: dict[str, dict] = {}
    errors = []
    with ProcessPoolExecutor(ns.jobs) as pool:
        # Pass 1: each character's typical figure height, used to re-scale outlier sheets.
        sheets = [e for e in entries if character_key(e)]
        heights: dict[str, list[float]] = {}
        for asset_id, h in pool.map(measure_character_sheet, [(ns.src, e) for e in sheets], chunksize=4):
            char, action = asset_id.rsplit("_", 1)
            if h and action not in FREE_ACTIONS:
                heights.setdefault(char, []).append(h)
        target = {char: float(np.median(hs)) for char, hs in heights.items()}
        jobs = []
        for e in entries:
            key = character_key(e)
            jobs.append((ns.src, e, target.get(key[0]) if key else None))
        for asset_id, record, err in pool.map(build_one, jobs, chunksize=8):
            if err:
                errors.append(err)
            else:
                atlas[asset_id] = record
    (OUT / "atlas.json").write_text(json.dumps({"version": 1, "assets": atlas}, separators=(",", ":"), sort_keys=True))
    # Same data as a classic script so UI markup built at boot can use it synchronously.
    (OUT / "atlas.js").write_text("window.GRIMOIRE_ATLAS=" + json.dumps({"version": 1, "assets": atlas}, separators=(",", ":"), sort_keys=True) + ";\n")
    # Every runtime file must decode; a broken one fails the build.
    for record in atlas.values():
        try:
            with Image.open(ROOT / record["src"]) as check:
                check.load()
        except Exception as exc:  # noqa: BLE001 - report any decode failure
            errors.append(f"unreadable {record['src']}: {exc}")
    total = sum(f.stat().st_size for f in OUT.rglob("*.webp"))
    print(f"built {len(atlas)} assets, {total / 1e6:.1f} MB")
    for err in errors:
        print("ERROR", err, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
