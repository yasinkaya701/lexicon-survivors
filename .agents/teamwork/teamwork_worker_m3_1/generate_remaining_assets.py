import math
import os
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = "/Users/afurkanmac/Downloads/hackhaton/public/assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_wand():
    # 512x512 weapon_wand.png on black background
    size = 512
    img = Image.new("RGB", (size, size), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Diagonal wand from (140, 380) to (340, 160)
    # Staff handle: dark polished mahogany wood with gold rings
    p_start = (140, 380)
    p_end = (340, 160)
    
    # Outer glow layer
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Staff shaft
    draw.line([p_start, p_end], fill=(110, 60, 35), width=18)
    draw.line([p_start, p_end], fill=(180, 110, 60), width=10)
    draw.line([p_start, p_end], fill=(230, 180, 110), width=4)

    # Gold bands along shaft
    steps = 6
    for i in range(1, steps):
        t = i / steps
        bx = int(p_start[0] + (p_end[0] - p_start[0]) * t)
        by = int(p_start[1] + (p_end[1] - p_start[1]) * t)
        draw.ellipse([bx - 12, by - 12, bx + 12, by + 12], fill=(255, 215, 0), outline=(218, 165, 32), width=3)

    # Crystal mounting prongs at head
    cx, cy = p_end[0] + 25, p_end[1] - 25
    draw.polygon([(cx - 30, cy + 30), (cx + 10, cy + 40), (cx + 35, cy + 10), (cx - 10, cy - 20)], fill=(218, 165, 32))

    # Large faceted amethyst crystal
    crystal_points = [
        (cx, cy - 65),     # top
        (cx + 45, cy - 20),# right top
        (cx + 35, cy + 35),# right bot
        (cx, cy + 55),     # bot
        (cx - 35, cy + 35),# left bot
        (cx - 45, cy - 20) # left top
    ]
    draw.polygon(crystal_points, fill=(180, 40, 230), outline=(255, 200, 255), width=4)

    # Crystal facets
    draw.polygon([(cx, cy - 65), (cx + 45, cy - 20), (cx, cy)], fill=(210, 80, 255))
    draw.polygon([(cx + 45, cy - 20), (cx + 35, cy + 35), (cx, cy)], fill=(160, 30, 210))
    draw.polygon([(cx + 35, cy + 35), (cx, cy + 55), (cx, cy)], fill=(130, 20, 180))
    draw.polygon([(cx, cy + 55), (cx - 35, cy + 35), (cx, cy)], fill=(150, 25, 200))
    draw.polygon([(cx - 35, cy + 35), (cx - 45, cy - 20), (cx, cy)], fill=(190, 60, 240))
    draw.polygon([(cx - 45, cy - 20), (cx, cy - 65), (cx, cy)], fill=(230, 120, 255))

    # Specular highlight on crystal
    draw.polygon([(cx - 10, cy - 45), (cx + 15, cy - 25), (cx, cy - 10), (cx - 20, cy - 25)], fill=(255, 240, 255))

    # Orbiting magic spark runes
    glow_draw.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], outline=(200, 80, 255), width=6)
    glow_draw.ellipse([cx - 110, cy - 60, cx + 110, cy + 60], outline=(150, 50, 255), width=4)
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    
    img = Image.blend(img, glow, 0.4)
    # Sharpen outlines
    draw = ImageDraw.Draw(img)
    for angle in [0, 60, 120, 180, 240, 300]:
        rad = math.radians(angle)
        rx = int(cx + math.cos(rad) * 90)
        ry = int(cy + math.sin(rad) * 90)
        draw.ellipse([rx - 6, ry - 6, rx + 6, ry + 6], fill=(255, 220, 255), outline=(190, 70, 255), width=2)

    img.save(f"{OUTPUT_DIR}/weapon_wand.png")
    print("weapon_wand.png generated")

def create_sword():
    # 512x512 weapon_sword.png - Architect's T-square greatsword with cyan laser blade
    size = 512
    img = Image.new("RGB", (size, size), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Blade along main diagonal from (120, 390) to (390, 120)
    p_hilt = (140, 370)
    p_tip = (380, 130)

    # Laser blade glow
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    g_draw.line([p_hilt, p_tip], fill=(0, 240, 255), width=36)
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    img = Image.blend(img, glow, 0.6)
    draw = ImageDraw.Draw(img)

    # Steel core
    draw.line([p_hilt, p_tip], fill=(220, 240, 255), width=18)
    draw.line([p_hilt, p_tip], fill=(255, 255, 255), width=8)

    # T-Square crossbar perpendicular at hilt
    cross_start = (p_hilt[0] - 60, p_hilt[1] - 60)
    cross_end = (p_hilt[0] + 60, p_hilt[1] + 60)
    draw.line([cross_start, cross_end], fill=(80, 90, 105), width=22)
    draw.line([cross_start, cross_end], fill=(148, 163, 184), width=12)

    # Etched millimeter markings along the crossbar
    for k in range(-50, 55, 10):
        mx = p_hilt[0] + k
        my = p_hilt[1] + k
        draw.line([(mx - 6, my + 6), (mx + 6, my - 6)], fill=(30, 41, 59), width=2)

    # Pommel and wrapped handle
    p_pommel = (p_hilt[0] - 50, p_hilt[1] + 50)
    draw.line([p_hilt, p_pommel], fill=(120, 53, 15), width=16) # Leather grip
    draw.ellipse([p_pommel[0] - 14, p_pommel[1] - 14, p_pommel[0] + 14, p_pommel[1] + 14], fill=(218, 165, 32), outline=(180, 130, 20), width=3)

    img.save(f"{OUTPUT_DIR}/weapon_sword.png")
    print("weapon_sword.png generated")

def create_wrench():
    # 512x512 weapon_wrench.png - Heavy chrome industrial pipe wrench with electric cyan arcs
    size = 512
    img = Image.new("RGB", (size, size), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Wrench body along diagonal
    p1 = (130, 380) # base handle
    p2 = (330, 180) # neck
    
    # Handle
    draw.line([p1, p2], fill=(180, 20, 20), width=36) # Red industrial casing
    draw.line([p1, p2], fill=(230, 40, 40), width=22)
    draw.line([p1, p2], fill=(255, 120, 120), width=8)

    # Heavy steel jaw head
    jx, jy = p2[0], p2[1]
    # Fixed jaw
    draw.polygon([(jx - 20, jy - 20), (jx + 40, jy - 80), (jx + 90, jy - 30), (jx + 30, jy + 30)], fill=(148, 163, 184), outline=(203, 213, 225), width=4)
    # Adjustable hook jaw
    draw.polygon([(jx + 30, jy - 90), (jx + 100, jy - 160), (jx + 140, jy - 120), (jx + 70, jy - 50)], fill=(100, 116, 139), outline=(226, 232, 240), width=4)

    # Serrated teeth on jaws
    for i in range(5):
        tx = jx + 35 + i * 12
        ty = jy - 75 + i * 12
        draw.polygon([(tx, ty), (tx + 8, ty - 8), (tx + 14, ty)], fill=(241, 245, 249))

    # Knurled thumb screw nut
    draw.ellipse([jx - 5, jy - 5, jx + 25, jy + 25], fill=(218, 165, 32), outline=(245, 158, 11), width=3)

    # Cyan electric sparks arcing around the teeth
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    arcs = [
        [(jx + 40, jy - 80), (jx + 70, jy - 100), (jx + 90, jy - 60)],
        [(jx + 80, jy - 130), (jx + 120, jy - 100), (jx + 100, jy - 50)],
        [(jx + 110, jy - 150), (jx + 150, jy - 120)]
    ]
    for arc in arcs:
        g_draw.line(arc, fill=(0, 240, 255), width=8)
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    img = Image.blend(img, glow, 0.5)

    draw = ImageDraw.Draw(img)
    for arc in arcs:
        draw.line(arc, fill=(255, 255, 255), width=3)

    img.save(f"{OUTPUT_DIR}/weapon_wrench.png")
    print("weapon_wrench.png generated")

def create_bullet():
    # 256x256 proj_bullet.png - Teardrop-shaped glowing cyan plasma bullet
    size = 256
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    # Outer glow
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    # Facing right: head at (190, 128), tail at (60, 128)
    g_draw.ellipse([120, 88, 200, 168], fill=(0, 200, 255))
    g_draw.polygon([(60, 128), (140, 95), (140, 161)], fill=(0, 160, 255))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    
    img = Image.blend(img, glow, 0.7)
    draw = ImageDraw.Draw(img)
    # Bright inner core
    draw.ellipse([140, 108, 190, 148], fill=(220, 250, 255))
    draw.polygon([(80, 128), (150, 112), (150, 144)], fill=(120, 230, 255))
    draw.ellipse([160, 116, 186, 140], fill=(255, 255, 255))

    img.save(f"{OUTPUT_DIR}/proj_bullet.png")
    print("proj_bullet.png generated")

def create_magic_orb():
    # 256x256 proj_magic_orb.png - Swirling violet/magenta arcane energy sphere
    size = 256
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = 128, 128
    g_draw.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], fill=(160, 30, 240))
    g_draw.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=(220, 60, 255))
    glow = glow.filter(ImageFilter.GaussianBlur(20))
    
    img = Image.blend(img, glow, 0.7)
    draw = ImageDraw.Draw(img)
    
    # Core sphere
    draw.ellipse([cx - 45, cy - 45, cx + 45, cy + 45], fill=(200, 50, 255), outline=(255, 180, 255), width=3)
    draw.ellipse([cx - 25, cy - 25, cx + 25, cy + 25], fill=(255, 200, 255))
    draw.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=(255, 255, 255))

    # Swirling tendrils
    for angle in [30, 120, 210, 300]:
        rad = math.radians(angle)
        x1 = cx + math.cos(rad) * 35
        y1 = cy + math.sin(rad) * 35
        x2 = cx + math.cos(rad + 0.8) * 65
        y2 = cy + math.sin(rad + 0.8) * 65
        draw.line([(x1, y1), (x2, y2)], fill=(255, 150, 255), width=4)

    img.save(f"{OUTPUT_DIR}/proj_magic_orb.png")
    print("proj_magic_orb.png generated")

def create_enemy_spit():
    # 256x256 proj_enemy_spit.png - Toxic bubbling emerald-green acid globule
    size = 256
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = 128, 128
    g_draw.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=(16, 185, 129))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    
    img = Image.blend(img, glow, 0.7)
    draw = ImageDraw.Draw(img)
    
    # Acid globule body
    draw.ellipse([cx - 48, cy - 44, cx + 48, cy + 44], fill=(34, 197, 94), outline=(134, 239, 172), width=4)
    # Inner highlights and toxic bubbles
    draw.ellipse([cx - 30, cy - 30, cx - 10, cy - 10], fill=(187, 247, 208))
    draw.ellipse([cx + 5, cy - 20, cx + 25, cy], fill=(134, 239, 172))
    draw.ellipse([cx - 15, cy + 5, cx + 15, cy + 25], fill=(74, 222, 128))
    # Acid drip trail
    draw.ellipse([cx - 75, cy - 8, cx - 55, cy + 8], fill=(34, 197, 94))
    draw.ellipse([cx - 95, cy - 4, cx - 85, cy + 4], fill=(22, 163, 74))

    img.save(f"{OUTPUT_DIR}/proj_enemy_spit.png")
    print("proj_enemy_spit.png generated")

def create_slash_arc():
    # 512x512 vfx_slash_arc.png - Glowing high-contrast crescent wave for melee swings
    size = 512
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = 256, 256
    
    # Outer cyan arc
    g_draw.arc([60, 60, 452, 452], start=210, end=330, fill=(0, 220, 255), width=38)
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    
    img = Image.blend(img, glow, 0.7)
    draw = ImageDraw.Draw(img)
    
    # Bright inner core arc
    draw.arc([60, 60, 452, 452], start=215, end=325, fill=(180, 245, 255), width=18)
    draw.arc([60, 60, 452, 452], start=220, end=320, fill=(255, 255, 255), width=8)

    img.save(f"{OUTPUT_DIR}/vfx_slash_arc.png")
    print("vfx_slash_arc.png generated")

def create_nova_ring():
    # 512x512 vfx_nova_ring.png - Expanding radial shockwave ring with neon pink and cyan particles
    size = 512
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = 256, 256
    
    # Double ring glow: cyan outer, pink inner
    g_draw.ellipse([cx - 190, cy - 190, cx + 190, cy + 190], outline=(0, 220, 255), width=30)
    g_draw.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], outline=(236, 72, 153), width=24)
    glow = glow.filter(ImageFilter.GaussianBlur(22))
    
    img = Image.blend(img, glow, 0.7)
    draw = ImageDraw.Draw(img)
    
    # Crisp high-contrast shockwave boundaries
    draw.ellipse([cx - 185, cy - 185, cx + 185, cy + 185], outline=(255, 255, 255), width=6)
    draw.ellipse([cx - 155, cy - 155, cx + 155, cy + 155], outline=(244, 114, 182), width=5)

    # Radial spark burst particles
    for angle in range(0, 360, 15):
        rad = math.radians(angle)
        r_inner = 135
        r_outer = 215 + (angle % 30) * 2
        x1 = cx + math.cos(rad) * r_inner
        y1 = cy + math.sin(rad) * r_inner
        x2 = cx + math.cos(rad) * r_outer
        y2 = cy + math.sin(rad) * r_outer
        color = (255, 255, 255) if angle % 30 == 0 else (0, 240, 255)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=3)

    img.save(f"{OUTPUT_DIR}/vfx_nova_ring.png")
    print("vfx_nova_ring.png generated")

def create_material_crystal():
    # 256x256 pickup_material_crystal.png - Faceted glowing emerald energy crystal gem
    size = 256
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = 128, 128
    g_draw.ellipse([cx - 65, cy - 75, cx + 65, cy + 75], fill=(16, 185, 129))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    
    img = Image.blend(img, glow, 0.6)
    draw = ImageDraw.Draw(img)

    # Diamond / emerald crystal shape
    top = (cx, cy - 65)
    bottom = (cx, cy + 65)
    left = (cx - 50, cy)
    right = (cx + 50, cy)
    mid_top_l = (cx - 25, cy - 35)
    mid_top_r = (cx + 25, cy - 35)
    mid_bot_l = (cx - 25, cy + 35)
    mid_bot_r = (cx + 25, cy + 35)

    # Facets with light angles
    draw.polygon([top, mid_top_l, left], fill=(52, 211, 153), outline=(167, 243, 208), width=2)
    draw.polygon([top, mid_top_r, right], fill=(16, 185, 129), outline=(167, 243, 208), width=2)
    draw.polygon([top, mid_top_l, mid_top_r], fill=(110, 231, 183), outline=(209, 250, 229), width=2) # Brightest top face
    draw.polygon([mid_top_l, mid_top_r, mid_bot_r, mid_bot_l], fill=(5, 150, 105), outline=(167, 243, 208), width=2)
    draw.polygon([left, mid_top_l, mid_bot_l], fill=(4, 120, 87), outline=(110, 231, 183), width=2)
    draw.polygon([right, mid_top_r, mid_bot_r], fill=(4, 120, 87), outline=(110, 231, 183), width=2)
    draw.polygon([bottom, mid_bot_l, left], fill=(6, 95, 70), outline=(52, 211, 153), width=2)
    draw.polygon([bottom, mid_bot_r, right], fill=(6, 78, 59), outline=(52, 211, 153), width=2)
    draw.polygon([bottom, mid_bot_l, mid_bot_r], fill=(4, 120, 87), outline=(110, 231, 183), width=2)

    # Glint highlight
    draw.ellipse([cx - 8, cy - 40, cx + 8, cy - 24], fill=(255, 255, 255))

    img.save(f"{OUTPUT_DIR}/pickup_material_crystal.png")
    print("pickup_material_crystal.png generated")

def create_health_fruit():
    # 256x256 pickup_health_fruit.png - Radiant golden-red apple with vitality aura
    size = 256
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = 128, 138
    g_draw.ellipse([cx - 65, cy - 65, cx + 65, cy + 65], fill=(239, 68, 68))
    g_draw.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=(245, 158, 11))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    
    img = Image.blend(img, glow, 0.6)
    draw = ImageDraw.Draw(img)

    # Apple body (two lobes)
    draw.ellipse([cx - 52, cy - 45, cx + 8, cy + 50], fill=(220, 38, 38), outline=(254, 202, 202), width=3)
    draw.ellipse([cx - 8, cy - 45, cx + 52, cy + 50], fill=(239, 68, 68), outline=(254, 202, 202), width=3)
    
    # Golden highlight
    draw.ellipse([cx - 35, cy - 30, cx + 15, cy + 25], fill=(245, 158, 11))
    draw.ellipse([cx - 25, cy - 22, cx + 5, cy + 12], fill=(251, 191, 36))
    draw.ellipse([cx - 18, cy - 16, cx - 2, cy], fill=(255, 255, 255))

    # Brown stem
    draw.line([(cx, cy - 40), (cx + 8, cy - 68)], fill=(120, 53, 15), width=6)
    
    # Emerald green leaf
    draw.polygon([(cx + 8, cy - 60), (cx + 38, cy - 75), (cx + 42, cy - 58), (cx + 15, cy - 52)], fill=(34, 197, 94), outline=(134, 239, 172), width=2)

    img.save(f"{OUTPUT_DIR}/pickup_health_fruit.png")
    print("pickup_health_fruit.png generated")

def create_mystery_chest():
    # 512x512 pickup_mystery_chest.png - High-tech golden academic chest with cyan holographic '?'
    size = 512
    img = Image.new("RGB", (size, size), (0, 0, 0))
    
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = 256, 300
    g_draw.rectangle([cx - 130, cy - 80, cx + 130, cy + 100], fill=(245, 158, 11))
    # Hologram glow above chest
    g_draw.ellipse([cx - 70, cy - 220, cx + 70, cy - 80], fill=(0, 220, 255))
    glow = glow.filter(ImageFilter.GaussianBlur(22))
    
    img = Image.blend(img, glow, 0.6)
    draw = ImageDraw.Draw(img)

    # Chest Base
    draw.rectangle([cx - 110, cy, cx + 110, cy + 90], fill=(180, 83, 9), outline=(245, 158, 11), width=5)
    # Chest Lid
    draw.polygon([(cx - 120, cy), (cx - 100, cy - 65), (cx + 100, cy - 65), (cx + 120, cy)], fill=(217, 119, 6), outline=(251, 191, 36), width=5)
    
    # Gold bands and corner reinforcements
    draw.rectangle([cx - 110, cy + 15, cx + 110, cy + 30], fill=(251, 191, 36))
    draw.line([(cx - 40, cy - 65), (cx - 40, cy + 90)], fill=(251, 191, 36), width=10)
    draw.line([(cx + 40, cy - 65), (cx + 40, cy + 90)], fill=(251, 191, 36), width=10)

    # Glowing cyan keyhole / latch
    draw.rectangle([cx - 20, cy - 10, cx + 20, cy + 25], fill=(30, 41, 59), outline=(0, 240, 255), width=3)
    draw.ellipse([cx - 6, cy - 4, cx + 6, cy + 8], fill=(0, 240, 255))
    draw.polygon([(cx - 4, cy + 6), (cx + 4, cy + 6), (cx, cy + 18)], fill=(0, 240, 255))

    # Cyan holographic question mark hovering above chest
    # Arc of ?
    draw.arc([cx - 40, cy - 200, cx + 40, cy - 130], start=180, end=380, fill=(0, 240, 255), width=14)
    draw.line([(cx + 25, cy - 150), (cx, cy - 120), (cx, cy - 105)], fill=(0, 240, 255), width=14)
    # Dot of ?
    draw.ellipse([cx - 8, cy - 90, cx + 8, cy - 74], fill=(0, 240, 255), outline=(255, 255, 255), width=3)

    img.save(f"{OUTPUT_DIR}/pickup_mystery_chest.png")
    print("pickup_mystery_chest.png generated")

def create_floor_tile():
    # 512x512 arena_tile_floor.png - Seamless dark slate sci-fi grid floor with subtle cyan circuit lines
    size = 512
    # Dark slate background #0b0f19
    img = Image.new("RGB", (size, size), (11, 15, 25))
    draw = ImageDraw.Draw(img)

    # 4 grid sub-panels (256x256 each)
    for px in [0, 256]:
        for py in [0, 256]:
            # Inner panel margin
            draw.rectangle([px + 4, py + 4, px + 252, py + 252], fill=(15, 23, 42), outline=(30, 41, 59), width=2)
            # Corner metal rivets
            for rx, ry in [(px + 14, py + 14), (px + 242, py + 14), (px + 14, py + 242), (px + 242, py + 242)]:
                draw.ellipse([rx - 3, ry - 3, rx + 3, ry + 3], fill=(71, 85, 105))

            # Subtle sci-fi circuit trace
            cx_mid = px + 128
            cy_mid = py + 128
            draw.line([(px + 40, cy_mid), (cx_mid - 20, cy_mid), (cx_mid, cy_mid - 20), (cx_mid, py + 40)], fill=(2, 132, 199), width=2)
            draw.ellipse([cx_mid - 5, py + 40 - 5, cx_mid + 5, py + 40 + 5], fill=(56, 189, 248))

    # Outer seamless grid borders
    draw.line([(0, 0), (size, 0)], fill=(51, 65, 85), width=4)
    draw.line([(0, 0), (0, size)], fill=(51, 65, 85), width=4)
    draw.line([(256, 0), (256, size)], fill=(51, 65, 85), width=3)
    draw.line([(0, 256), (size, 256)], fill=(51, 65, 85), width=3)

    img.save(f"{OUTPUT_DIR}/arena_tile_floor.png")
    print("arena_tile_floor.png generated")

def create_border_wall():
    # 256x256 arena_border_wall.png - Industrial hazard boundary wall with neon yellow/black warning chevrons
    size = 256
    img = Image.new("RGB", (size, size), (20, 24, 35))
    draw = ImageDraw.Draw(img)

    # Metallic plate background
    draw.rectangle([0, 0, size, size], fill=(30, 36, 50), outline=(71, 85, 105), width=4)

    # Diagonal hazard stripes (45 degrees)
    stripe_width = 32
    for offset in range(-size, size * 2, stripe_width * 2):
        points = [
            (offset, 0),
            (offset + stripe_width, 0),
            (offset + stripe_width + size, size),
            (offset + size, size)
        ]
        draw.polygon(points, fill=(234, 179, 8)) # Vivid warning yellow

    # Heavy steel frame overlay (top, bottom, and vertical struts)
    draw.rectangle([0, 0, size, 24], fill=(15, 23, 42), outline=(51, 65, 85), width=3)
    draw.rectangle([0, size - 24, size, size], fill=(15, 23, 42), outline=(51, 65, 85), width=3)
    draw.line([(0, 0), (0, size)], fill=(71, 85, 105), width=4)
    draw.line([(size - 1, 0), (size - 1, size)], fill=(71, 85, 105), width=4)

    # Glowing warning LEDs in the top/bottom frame
    for lx in [32, 96, 160, 224]:
        draw.ellipse([lx - 4, 8, lx + 4, 16], fill=(239, 68, 68), outline=(254, 202, 202), width=1)
        draw.ellipse([lx - 4, size - 16, lx + 4, size - 8], fill=(0, 240, 255), outline=(200, 250, 255), width=1)

    img.save(f"{OUTPUT_DIR}/arena_border_wall.png")
    print("arena_border_wall.png generated")

if __name__ == "__main__":
    create_wand()
    create_sword()
    create_wrench()
    create_bullet()
    create_magic_orb()
    create_enemy_spit()
    create_slash_arc()
    create_nova_ring()
    create_material_crystal()
    create_health_fruit()
    create_mystery_chest()
    create_floor_tile()
    create_border_wall()
    print("All 13 remaining visual assets generated successfully!")
