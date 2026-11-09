import math
import os
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = "/Users/afurkanmac/Downloads/hackhaton/public/assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_stitch_floor():
    size = 512
    img = Image.new("RGBA", (size, size), (24, 34, 38, 255))
    draw = ImageDraw.Draw(img)

    # 1. Dark stone tiles (4x4 grid of cobblestone/slabs)
    tile_size = size // 4
    for r in range(4):
        for c in range(4):
            x0 = c * tile_size
            y0 = r * tile_size
            x1 = x0 + tile_size
            y1 = y0 + tile_size
            # Stone variations
            tone = 28 + ((r * 3 + c * 7) % 12)
            draw.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=(tone, tone + 10, tone + 12, 255), outline=(15, 20, 24, 255), width=3)
            # Stone texture specks & moss
            moss_x = x0 + (r * 17 + c * 31) % (tile_size - 30) + 10
            moss_y = y0 + (r * 29 + c * 13) % (tile_size - 30) + 10
            draw.ellipse([moss_x, moss_y, moss_x + 22, moss_y + 14], fill=(35, 60, 42, 220))

    # 2. Glowing Emerald Arcane Energy Cracks
    cracks = [
        # Major crack traversing across tiles
        [(30, 80), (75, 120), (140, 110), (180, 190), (270, 210), (330, 290), (410, 310), (480, 420)],
        [(180, 190), (220, 140), (310, 130), (380, 70), (460, 60)],
        [(270, 210), (260, 320), (190, 390), (150, 470)],
        [(80, 350), (130, 370), (190, 390)],
    ]

    # Glow layer
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for path in cracks:
        glow_draw.line(path, fill=(16, 185, 129, 140), width=18, joint="curve")
        glow_draw.line(path, fill=(52, 211, 153, 200), width=10, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    img.alpha_composite(glow)

    # Sharp bright core
    draw = ImageDraw.Draw(img)
    for path in cracks:
        draw.line(path, fill=(110, 231, 183, 240), width=4, joint="curve")
        draw.line(path, fill=(209, 250, 229, 255), width=2, joint="curve")

    img.save(os.path.join(OUTPUT_DIR, "arena_tile_floor.png"))
    print("Saved arena_tile_floor.png")

def create_stitch_border_wall():
    size = 512
    img = Image.new("RGBA", (size, size), (18, 25, 28, 255))
    draw = ImageDraw.Draw(img)

    # Ancient stone pillar block with moss and cracks
    draw.rectangle([10, 10, size - 10, size - 10], fill=(30, 42, 45, 255), outline=(12, 16, 20, 255), width=8)

    # Large faceted Emerald Crystals emerging from wall
    crystals = [
        [(80, 380), (120, 180), (160, 220), (130, 410)],
        [(150, 420), (210, 120), (270, 190), (230, 440)],
        [(260, 440), (320, 210), (380, 260), (340, 450)],
        [(350, 430), (410, 270), (450, 310), (420, 440)],
    ]

    # Crystal glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for poly in crystals:
        glow_draw.polygon(poly, fill=(16, 185, 129, 160))
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    img.alpha_composite(glow)

    # Crystal facets
    draw = ImageDraw.Draw(img)
    for poly in crystals:
        draw.polygon(poly, fill=(5, 150, 105, 240), outline=(167, 243, 208, 255), width=4)
        # Highlight facet
        apex = poly[1]
        p_left = poly[0]
        p_mid = ((poly[0][0] + poly[2][0]) // 2, (poly[0][1] + poly[2][1]) // 2)
        draw.polygon([apex, p_left, p_mid], fill=(52, 211, 153, 230))
        draw.line([apex, p_mid], fill=(236, 253, 245, 255), width=3)

    img.save(os.path.join(OUTPUT_DIR, "arena_border_wall.png"))
    print("Saved arena_border_wall.png")

def create_stitch_potato_warrior():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Potato body center
    cx, cy = 240, 270
    rx, ry = 120, 135

    # Feet
    draw.ellipse([cx - 90, cy + 110, cx - 20, cy + 155], fill=(138, 92, 53, 255), outline=(35, 20, 12, 255), width=7)
    draw.ellipse([cx + 20, cy + 110, cx + 90, cy + 155], fill=(138, 92, 53, 255), outline=(35, 20, 12, 255), width=7)

    # Potato Body (warm golden russet with chunky black cartoon outline)
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(214, 152, 94, 255), outline=(32, 18, 10, 255), width=9)
    # Shading on bottom
    draw.chord([cx - rx + 6, cy - ry + 6, cx + rx - 6, cy + ry - 6], 20, 160, fill=(180, 115, 65, 255))
    # Cheek blush
    draw.ellipse([cx - 85, cy + 15, cx - 45, cy + 45], fill=(225, 120, 95, 120))
    draw.ellipse([cx + 45, cy + 15, cx + 85, cy + 45], fill=(225, 120, 95, 120))

    # Eyes (Big expressive dark eyes with white reflection highlights)
    eye_y = cy - 20
    draw.ellipse([cx - 55, eye_y - 25, cx - 15, eye_y + 25], fill=(25, 15, 10, 255))
    draw.ellipse([cx + 15, eye_y - 25, cx + 55, eye_y + 25], fill=(25, 15, 10, 255))
    # Eye highlights
    draw.ellipse([cx - 48, eye_y - 18, cx - 30, eye_y], fill=(255, 255, 255, 255))
    draw.ellipse([cx + 22, eye_y - 18, cx + 40, eye_y], fill=(255, 255, 255, 255))
    # Small pupil dots
    draw.ellipse([cx - 36, eye_y + 8, cx - 28, eye_y + 16], fill=(255, 255, 255, 200))
    draw.ellipse([cx + 34, eye_y + 8, cx + 42, eye_y + 16], fill=(255, 255, 255, 200))

    # Determined Mouth & Brow
    draw.line([(cx - 65, eye_y - 36), (cx - 20, eye_y - 28)], fill=(32, 18, 10, 255), width=7)
    draw.line([(cx + 20, eye_y - 28), (cx + 65, eye_y - 36)], fill=(32, 18, 10, 255), width=7)
    draw.line([(cx - 22, cy + 38), (cx + 22, cy + 38)], fill=(32, 18, 10, 255), width=6)

    # Leather Warrior Headband with Emerald Gem (Stitch style)
    hb_y = cy - 80
    draw.polygon([(cx - rx + 10, hb_y), (cx + rx - 10, hb_y), (cx + rx - 14, hb_y + 36), (cx - rx + 14, hb_y + 36)], fill=(120, 45, 30, 255), outline=(32, 18, 10, 255), width=6)
    # Emerald Gem on forehead
    draw.polygon([(cx, hb_y + 2), (cx + 18, hb_y + 18), (cx, hb_y + 34), (cx - 18, hb_y + 18)], fill=(16, 185, 129, 255), outline=(236, 253, 245, 255), width=3)

    # Hands holding weapon
    draw.ellipse([cx - 80, cy + 20, cx - 40, cy + 60], fill=(195, 130, 80, 255), outline=(32, 18, 10, 255), width=6)
    draw.ellipse([cx + 60, cy + 10, cx + 100, cy + 50], fill=(195, 130, 80, 255), outline=(32, 18, 10, 255), width=6)

    # Wooden War Hammer held by potato (diagonal across right hand)
    hx0, hy0 = cx + 80, cy + 30
    hx1, hy1 = cx + 185, cy - 75
    draw.line([(hx0 - 15, hy0 + 15), (hx1, hy1)], fill=(105, 60, 35, 255), width=18)
    draw.line([(hx0 - 15, hy0 + 15), (hx1, hy1)], fill=(160, 95, 55, 255), width=10)

    # Hammer Head (Heavy wooden mallet with iron bands, exactly matching Stitch reference)
    head_cx, head_cy = hx1 + 10, hy1 - 10
    draw.rectangle([head_cx - 45, head_cy - 40, head_cx + 45, head_cy + 40], fill=(145, 85, 50, 255), outline=(32, 18, 10, 255), width=7)
    # Iron bands on hammer edges
    draw.rectangle([head_cx - 45, head_cy - 40, head_cx - 30, head_cy + 40], fill=(148, 163, 184, 255), outline=(30, 41, 59, 255), width=4)
    draw.rectangle([head_cx + 30, head_cy - 40, head_cx + 45, head_cy + 40], fill=(148, 163, 184, 255), outline=(30, 41, 59, 255), width=4)

    img.save(os.path.join(OUTPUT_DIR, "player_potato_scholar.png"))
    print("Saved player_potato_scholar.png")

def create_stitch_slime():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = 256, 280
    # Cute green slime blob with shadow
    draw.ellipse([cx - 150, cy - 100, cx + 150, cy + 140], fill=(34, 197, 94, 255), outline=(20, 83, 45, 255), width=8)
    draw.chord([cx - 145, cy - 95, cx + 145, cy + 135], 180, 360, fill=(74, 222, 128, 255))

    # Gloss highlight on top left
    draw.ellipse([cx - 110, cy - 70, cx - 40, cy - 25], fill=(220, 252, 231, 230))

    # Eyes & Smile
    draw.ellipse([cx - 60, cy - 10, cx - 25, cy + 30], fill=(20, 83, 45, 255))
    draw.ellipse([cx + 25, cy - 10, cx + 60, cy + 30], fill=(20, 83, 45, 255))
    draw.ellipse([cx - 52, cy - 4, cx - 35, cy + 15], fill=(255, 255, 255, 255))
    draw.ellipse([cx + 33, cy - 4, cx + 50, cy + 15], fill=(255, 255, 255, 255))
    draw.arc([cx - 30, cy + 25, cx + 30, cy + 65], 0, 180, fill=(20, 83, 45, 255), width=7)

    img.save(os.path.join(OUTPUT_DIR, "enemy_swarmer.png"))
    print("Saved enemy_swarmer.png (Slime)")

def create_stitch_goblin():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = 256, 260
    # Goblin Head & Ears
    # Pointy ears
    draw.polygon([(cx - 70, cy - 30), (cx - 190, cy - 90), (cx - 80, cy + 40)], fill=(74, 222, 128, 255), outline=(22, 101, 52, 255), width=7)
    draw.polygon([(cx + 70, cy - 30), (cx + 190, cy - 90), (cx + 80, cy + 40)], fill=(74, 222, 128, 255), outline=(22, 101, 52, 255), width=7)
    draw.polygon([(cx - 80, cy - 20), (cx - 165, cy - 75), (cx - 85, cy + 25)], fill=(244, 114, 182, 180))
    draw.polygon([(cx + 80, cy - 20), (cx + 165, cy - 75), (cx + 85, cy + 25)], fill=(244, 114, 182, 180))

    # Body & Head
    draw.ellipse([cx - 95, cy - 90, cx + 95, cy + 90], fill=(74, 222, 128, 255), outline=(22, 101, 52, 255), width=8)

    # Angry eyes
    eye_y = cy - 20
    draw.ellipse([cx - 50, eye_y - 20, cx - 15, eye_y + 15], fill=(234, 179, 8, 255), outline=(22, 101, 52, 255), width=5)
    draw.ellipse([cx + 15, eye_y - 20, cx + 50, eye_y + 15], fill=(234, 179, 8, 255), outline=(22, 101, 52, 255), width=5)
    draw.ellipse([cx - 38, eye_y - 12, cx - 24, eye_y + 6], fill=(15, 23, 42, 255))
    draw.ellipse([cx + 24, eye_y - 12, cx + 38, eye_y + 6], fill=(15, 23, 42, 255))

    # Brow
    draw.line([(cx - 65, eye_y - 30), (cx - 10, eye_y - 15)], fill=(22, 101, 52, 255), width=7)
    draw.line([(cx + 10, eye_y - 15), (cx + 65, eye_y - 30)], fill=(22, 101, 52, 255), width=7)

    # Fang mouth
    draw.arc([cx - 40, cy + 15, cx + 40, cy + 55], 0, 180, fill=(22, 101, 52, 255), width=6)
    draw.polygon([(cx - 25, cy + 40), (cx - 15, cy + 40), (cx - 20, cy + 22)], fill=(255, 255, 255, 255))
    draw.polygon([(cx + 15, cy + 40), (cx + 25, cy + 40), (cx + 20, cy + 22)], fill=(255, 255, 255, 255))

    # Small Battle Axe in Hand
    ax0, ay0 = cx + 80, cy + 40
    ax1, ay1 = cx + 160, cy - 30
    draw.line([(ax0, ay0 + 60), (ax1, ay1)], fill=(120, 53, 15, 255), width=12)
    draw.polygon([(ax1 - 25, ay1 - 25), (ax1 + 40, ay1 - 40), (ax1 + 55, ay1 + 25), (ax1 - 10, ay1 + 10)], fill=(148, 163, 184, 255), outline=(30, 41, 59, 255), width=4)

    img.save(os.path.join(OUTPUT_DIR, "enemy_rusher.png"))
    print("Saved enemy_rusher.png (Goblin)")

def create_stitch_xp_gem():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)

    cx, cy = 256, 256
    # Emerald flame/spirit orb
    points = [
        (cx, cy - 140),
        (cx + 80, cy - 40),
        (cx + 105, cy + 60),
        (cx, cy + 140),
        (cx - 105, cy + 60),
        (cx - 80, cy - 40),
    ]
    glow_draw.polygon(points, fill=(16, 185, 129, 180))
    glow = glow.filter(ImageFilter.GaussianBlur(24))
    img.alpha_composite(glow)

    draw = ImageDraw.Draw(img)
    draw.polygon(points, fill=(52, 211, 153, 255), outline=(6, 78, 59, 255), width=8)
    inner_points = [
        (cx, cy - 90),
        (cx + 45, cy - 20),
        (cx + 60, cy + 40),
        (cx, cy + 90),
        (cx - 60, cy + 40),
        (cx - 45, cy - 20),
    ]
    draw.polygon(inner_points, fill=(209, 250, 229, 255))

    img.save(os.path.join(OUTPUT_DIR, "pickup_material_crystal.png"))
    print("Saved pickup_material_crystal.png (Stitch XP Gem)")

def create_stitch_slash_swoosh():
    # Warm amber/peach curving slash swoosh (from Stitch reference)
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)

    # Wide sweeping arc
    arc_box = [60, 60, 452, 452]
    glow_draw.arc(arc_box, 180, 340, fill=(249, 115, 22, 180), width=42)
    glow_draw.arc(arc_box, 200, 330, fill=(251, 191, 36, 240), width=24)
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    img.alpha_composite(glow)

    draw = ImageDraw.Draw(img)
    draw.arc(arc_box, 210, 325, fill=(254, 243, 199, 255), width=10)

    # Impact spark / 4-point star burst at tip (cx, cy)
    sx, sy = 405, 140
    star_r = 35
    star_pts = [
        (sx, sy - star_r), (sx + 8, sy - 8),
        (sx + star_r, sy), (sx + 8, sy + 8),
        (sx, sy + star_r), (sx - 8, sy + 8),
        (sx - star_r, sy), (sx - 8, sy - 8)
    ]
    draw.polygon(star_pts, fill=(255, 255, 255, 255), outline=(249, 115, 22, 255), width=3)

    img.save(os.path.join(OUTPUT_DIR, "vfx_slash_arc.png"))
    print("Saved vfx_slash_arc.png (Stitch Swoosh)")

if __name__ == "__main__":
    create_stitch_floor()
    create_stitch_border_wall()
    create_stitch_potato_warrior()
    create_stitch_slime()
    create_stitch_goblin()
    create_stitch_xp_gem()
    create_stitch_slash_swoosh()
    print("All Stitch reference visual assets successfully regenerated!")
