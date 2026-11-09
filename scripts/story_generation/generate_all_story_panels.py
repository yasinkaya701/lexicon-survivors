import os, sys, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

DESKTOP_ROOT = '/Users/afurkanmac/Desktop/hachaton hakiki görseller'
SPRITES_ROOT = '/Users/afurkanmac/Downloads/gh-pages/assets/sprites'
PANELS_ROOT = '/Users/afurkanmac/Downloads/gh-pages/assets/sprites/story/panels'
SCENES_ROOT = '/Users/afurkanmac/Downloads/gh-pages/assets/sprites/story/scenes'
HACKHATON_PUBLIC = '/Users/afurkanmac/Downloads/hackhaton/public/assets'
STORY_PANELS = os.path.join(HACKHATON_PUBLIC, 'story_panels')

CHARACTERS = {
    '01_Rune_Sorceress': {
        'id': 'rune_sorceress',
        'title': "Lale'nin Haritası",
        'hero_sprite': os.path.join(SPRITES_ROOT, 'player_sorceress.png'),
        'primary_glow': (56, 189, 248),    # Cyan
        'secondary_glow': (254, 240, 138),  # Starlight Gold
        'ambient_tint': (15, 23, 42),       # Midnight Navy
        'rune_sprite': os.path.join(SPRITES_ROOT, 'magical_rune_astral.png'),
        'sub_item': os.path.join(SPRITES_ROOT, 'rune_orb.png'),
    },
    '02_Lexicon_Alchemist': {
        'id': 'lexicon_alchemist',
        'title': 'Paylaşılmış Hatıra',
        'hero_sprite': os.path.join(SPRITES_ROOT, 'player_alchemist.png'),
        'primary_glow': (245, 158, 11),    # Amber
        'secondary_glow': (16, 185, 129),  # Emerald Vitriol
        'ambient_tint': (30, 22, 16),       # Sepia Dark
        'rune_sprite': os.path.join(SPRITES_ROOT, 'magical_rune_circle.png'),
        'sub_item': os.path.join(SPRITES_ROOT, 'gadget_ink_bomb.png'),
    },
    '03_Shadow_Scribe': {
        'id': 'shadow_lexicographer',
        'title': 'Silgiyi Tutan El',
        'hero_sprite': os.path.join(SPRITES_ROOT, 'player_assassin.png'),
        'primary_glow': (225, 29, 72),     # Palimpsest Crimson
        'secondary_glow': (226, 232, 240), # Silver Ash
        'ambient_tint': (12, 10, 16),       # Charcoal Obsidian
        'rune_sprite': os.path.join(SPRITES_ROOT, 'magical_rune_void.png'),
        'sub_item': os.path.join(SPRITES_ROOT, 'eraser_icon.png'),
    },
    '04_Inky': {
        'id': 'inky',
        'title': "Mira'nın İtirazı",
        'hero_sprite': os.path.join(SPRITES_ROOT, 'player.png'),
        'primary_glow': (99, 102, 241),    # Indigo
        'secondary_glow': (6, 182, 212),   # Turquoise
        'ambient_tint': (10, 15, 30),       # Deep Ink
        'rune_sprite': os.path.join(SPRITES_ROOT, 'magical_rune_cyan.png'),
        'sub_item': os.path.join(SPRITES_ROOT, 'ink_drop.png'),
    },
    '05_Quillmaster': {
        'id': 'quillmaster',
        'title': "Ada'nın Rotası",
        'hero_sprite': os.path.join(SPRITES_ROOT, 'player_quillmaster.png'),
        'primary_glow': (234, 179, 8),     # Golden Quill
        'secondary_glow': (220, 38, 38),   # Cardinal Red
        'ambient_tint': (35, 20, 10),       # Parchment Umber
        'rune_sprite': os.path.join(SPRITES_ROOT, 'magical_rune_circle.png'),
        'sub_item': os.path.join(SPRITES_ROOT, 'quill_blaster.png'),
    },
    '06_Word_Knight': {
        'id': 'word_knight',
        'title': 'Nöbetçinin Yemini',
        'hero_sprite': os.path.join(SPRITES_ROOT, 'player_knight.png'),
        'primary_glow': (251, 191, 36),    # Paladin Gold
        'secondary_glow': (239, 68, 68),   # Crusader Red
        'ambient_tint': (18, 18, 24),       # Knightly Iron
        'rune_sprite': os.path.join(SPRITES_ROOT, 'magical_rune_astral.png'),
        'sub_item': os.path.join(SPRITES_ROOT, 'gadget_shield.png'),
    }
}

BOSS_POOL = [
    os.path.join(SPRITES_ROOT, 'upgrade_v2', 'boss_syntax_titan.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v2', 'boss_void_curator.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v2', 'boss_lexicon_dragon.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v2', 'boss_red_inquisitor.png'),
    os.path.join(SPRITES_ROOT, 'red_pen_boss.png'),
    os.path.join(SPRITES_ROOT, 'lexicon_dragon_boss.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v1', 'monster_run_on_reaper.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v1', 'monster_tautology_twin.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v1', 'monster_double_negative_drake.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v1', 'monster_malapropism_mimic.png'),
]

RELIC_POOL = [
    os.path.join(SPRITES_ROOT, 'relics', 'marginalia_prism.png'),
    os.path.join(SPRITES_ROOT, 'relics', 'mnemonic_thread.png'),
    os.path.join(SPRITES_ROOT, 'wax_seal.png'),
    os.path.join(SPRITES_ROOT, 'gadget_time_stop.png'),
    os.path.join(SPRITES_ROOT, 'upgrade_v1', 'threat_seal.png'),
    os.path.join(SPRITES_ROOT, 'elite_crown.png'),
    os.path.join(SPRITES_ROOT, 'gadgets', 'chrono_comma.png'),
    os.path.join(SPRITES_ROOT, 'gadgets', 'palimpsest_step.png'),
    os.path.join(SPRITES_ROOT, 'gadgets', 'lexicon_aegis.png'),
    os.path.join(SPRITES_ROOT, 'gadgets', 'index_storm.png'),
]

NERIS_SPRITE = os.path.join(SPRITES_ROOT, 'story', 'neris_portrait.png')
LECTERN_SPRITE = os.path.join(SPRITES_ROOT, 'illuminated_lectern.png')

def get_base_background(char_key, wave_num):
    # Check hackhaton public story panels first
    sp_matches = glob.glob(os.path.join(STORY_PANELS, f'*{CHARACTERS[char_key]["id"]}*wave{wave_num:03d}*.jpg'))
    sp_matches += glob.glob(os.path.join(STORY_PANELS, f'*{CHARACTERS[char_key]["id"].capitalize()}*Dalga{wave_num}*.jpg'))
    if sp_matches:
        return sp_matches[0]
        
    char_id = CHARACTERS[char_key]['id']
    ep_idx = (wave_num // 5)
    ep_file = f'episode_{ep_idx:02d}.png'
    scene_path = os.path.join(SCENES_ROOT, char_id, ep_file)
    if os.path.exists(scene_path):
        return scene_path
        
    wave_panel = os.path.join(PANELS_ROOT, f'wave_{wave_num:02d}.png')
    if os.path.exists(wave_panel):
        return wave_panel
        
    return os.path.join(SPRITES_ROOT, 'story', 'story_observatory.png')

def add_letterbox(canvas):
    border = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_b = ImageDraw.Draw(border)
    draw_b.rectangle([0, 0, 1280, 14], fill=(8, 10, 16, 255))
    draw_b.rectangle([0, 706, 1280, 720], fill=(8, 10, 16, 255))
    return Image.alpha_composite(canvas, border)

def render_panel_1_establishing(char_key, wave_num, bg_path, out_path):
    cinfo = CHARACTERS[char_key]
    canvas = Image.new("RGBA", (1280, 720), cinfo['ambient_tint'] + (255,))
    
    bg = Image.open(bg_path).convert("RGBA").resize((1280, 720), Image.Resampling.BILINEAR)
    canvas.paste(bg, (0, 0))
    
    tint_layer = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_t = ImageDraw.Draw(tint_layer)
    for y in range(0, 720, 40):
        alpha = int(20 + 35 * (y / 720))
        draw_t.rectangle([0, y, 1280, y+40], fill=cinfo['ambient_tint'] + (alpha,))
    canvas = Image.alpha_composite(canvas, tint_layer)
    
    glow_layer = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_g = ImageDraw.Draw(glow_layer)
    for gr in range(400, 50, -40):
        alpha = int((1.0 - (gr / 400)) * 60)
        draw_g.ellipse([640 - gr*2, -100, 640 + gr*2, gr], fill=cinfo['primary_glow'] + (alpha,))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=20))
    canvas = Image.alpha_composite(canvas, glow_layer)
    
    np.random.seed(wave_num * 11)
    parts = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_p = ImageDraw.Draw(parts)
    for _ in range(75):
        px = np.random.randint(50, 1230)
        py = np.random.randint(40, 680)
        sz = np.random.randint(2, 5)
        pa = np.random.randint(80, 220)
        col = cinfo['secondary_glow'] if np.random.rand() > 0.4 else cinfo['primary_glow']
        draw_p.ellipse([px, py, px+sz, py+sz], fill=col + (pa,))
    canvas = Image.alpha_composite(canvas, parts)
    
    canvas = add_letterbox(canvas)
    canvas.convert("RGB").save(out_path, "JPEG", quality=95)

def render_panel_2_dialogue(char_key, wave_num, bg_path, out_path):
    cinfo = CHARACTERS[char_key]
    canvas = Image.new("RGBA", (1280, 720), cinfo['ambient_tint'] + (255,))
    
    bg = Image.open(bg_path).convert("RGBA").resize((1280, 720), Image.Resampling.BILINEAR)
    bg_blurred = bg.filter(ImageFilter.GaussianBlur(radius=3))
    enh = ImageEnhance.Brightness(bg_blurred)
    bg_dim = enh.enhance(0.6)
    canvas.paste(bg_dim, (0, 0))
    
    hero = Image.open(cinfo['hero_sprite']).convert("RGBA").resize((160, 160), Image.Resampling.NEAREST)
    neris = Image.open(NERIS_SPRITE).convert("RGBA").resize((170, 170), Image.Resampling.BILINEAR)
    
    shadow = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_s = ImageDraw.Draw(shadow)
    draw_s.ellipse([340, 590, 500, 630], fill=(5, 5, 8, 160))
    draw_s.ellipse([760, 590, 920, 630], fill=(5, 5, 8, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=6))
    canvas = Image.alpha_composite(canvas, shadow)
    
    canvas.paste(hero, (340, 450), hero)
    canvas.paste(neris, (760, 440), neris)
    
    if os.path.exists(LECTERN_SPRITE):
        lectern = Image.open(LECTERN_SPRITE).convert("RGBA").resize((90, 90), Image.Resampling.NEAREST)
        canvas.paste(lectern, (590, 510), lectern)
        
    if os.path.exists(cinfo['sub_item']):
        sub = Image.open(cinfo['sub_item']).convert("RGBA").resize((40, 40), Image.Resampling.NEAREST)
        canvas.paste(sub, (310, 460), sub)
        
    dialogue_glow = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_dg = ImageDraw.Draw(dialogue_glow)
    for gr in range(120, 20, -20):
        a = int((1.0 - (gr/120)) * 50)
        draw_dg.ellipse([635 - gr, 540 - gr//2, 635 + gr, 540 + gr//2], fill=cinfo['primary_glow'] + (a,))
    dialogue_glow = dialogue_glow.filter(ImageFilter.GaussianBlur(radius=10))
    canvas = Image.alpha_composite(canvas, dialogue_glow)
    
    canvas = add_letterbox(canvas)
    canvas.convert("RGB").save(out_path, "JPEG", quality=95)

def render_panel_3_boss_trial(char_key, wave_num, bg_path, out_path):
    cinfo = CHARACTERS[char_key]
    canvas = Image.new("RGBA", (1280, 720), cinfo['ambient_tint'] + (255,))
    
    bg = Image.open(bg_path).convert("RGBA").resize((1280, 720), Image.Resampling.BILINEAR)
    canvas.paste(bg, (0, 0))
    
    boss_path = BOSS_POOL[(wave_num // 5) % len(BOSS_POOL)]
    boss = Image.open(boss_path).convert("RGBA")
    bw = 240 if boss.width <= 256 else 300
    bh = int(bw * (boss.height / boss.width))
    boss = boss.resize((bw, bh), Image.Resampling.NEAREST)
    
    boss_aura = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_ba = ImageDraw.Draw(boss_aura)
    bx, by = 800, 360
    for ar in range(220, 30, -25):
        alpha = int((1.0 - (ar / 220)) * 80)
        draw_ba.ellipse([bx - ar, by - ar, bx + ar, by + ar], fill=(225, 29, 72, alpha))
    boss_aura = boss_aura.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, boss_aura)
    
    if os.path.exists(cinfo['rune_sprite']):
        rune = Image.open(cinfo['rune_sprite']).convert("RGBA").resize((420, 420), Image.Resampling.NEAREST)
        r_arr = np.array(rune)
        r_arr[:, :, 3] = (r_arr[:, :, 3] * 0.4).astype(np.uint8)
        rune = Image.fromarray(r_arr)
        canvas.paste(rune, (430, 360), rune)
        
    canvas.paste(boss, (720, 260), boss)
    
    hero = Image.open(cinfo['hero_sprite']).convert("RGBA").resize((160, 160), Image.Resampling.NEAREST)
    canvas.paste(hero, (240, 440), hero)
    
    clash = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_c = ImageDraw.Draw(clash)
    draw_c.line([(380, 500), (740, 400)], fill=cinfo['primary_glow'] + (180,), width=4)
    draw_c.line([(380, 500), (740, 400)], fill=(255, 255, 255, 220), width=2)
    cx, cy = 600, 445
    for _ in range(20):
        ox = np.random.randint(-40, 40)
        oy = np.random.randint(-40, 40)
        draw_c.ellipse([cx+ox, cy+oy, cx+ox+3, cy+oy+3], fill=cinfo['secondary_glow'] + (240,))
    clash = clash.filter(ImageFilter.GaussianBlur(radius=2))
    canvas = Image.alpha_composite(canvas, clash)
    
    canvas = add_letterbox(canvas)
    canvas.convert("RGB").save(out_path, "JPEG", quality=95)

def render_panel_4_relic(char_key, wave_num, bg_path, out_path):
    cinfo = CHARACTERS[char_key]
    canvas = Image.new("RGBA", (1280, 720), cinfo['ambient_tint'] + (255,))
    
    bg = Image.open(bg_path).convert("RGBA").resize((1280, 720), Image.Resampling.BILINEAR)
    bg_blurred = bg.filter(ImageFilter.GaussianBlur(radius=6))
    enh = ImageEnhance.Brightness(bg_blurred)
    bg_dim = enh.enhance(0.4)
    canvas.paste(bg_dim, (0, 0))
    
    vignette = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_v = ImageDraw.Draw(vignette)
    for r in range(680, 180, -35):
        alpha = int((1.0 - (r / 680)) * 170)
        draw_v.ellipse([640 - r, 360 - int(r*0.6), 640 + r, 360 + int(r*0.6)], fill=cinfo['ambient_tint'] + (alpha,))
    canvas = Image.alpha_composite(canvas, vignette)
    
    if os.path.exists(cinfo['rune_sprite']):
        rune = Image.open(cinfo['rune_sprite']).convert("RGBA").resize((320, 320), Image.Resampling.NEAREST)
        r_arr = np.array(rune)
        r_arr[:, :, 3] = (r_arr[:, :, 3] * 0.45).astype(np.uint8)
        rune = Image.fromarray(r_arr)
        canvas.paste(rune, (640 - 160, 360 - 160), rune)
        
    relic_glow = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_rg = ImageDraw.Draw(relic_glow)
    for gr in range(160, 10, -12):
        alpha = int((1.0 - (gr / 160)) * 150)
        draw_rg.ellipse([640 - gr, 360 - gr, 640 + gr, 360 + gr], fill=cinfo['primary_glow'] + (alpha,))
    relic_glow = relic_glow.filter(ImageFilter.GaussianBlur(radius=8))
    canvas = Image.alpha_composite(canvas, relic_glow)
    
    relic_path = RELIC_POOL[(wave_num // 5) % len(RELIC_POOL)]
    rel = Image.open(relic_path).convert("RGBA").resize((130, 130), Image.Resampling.NEAREST)
    canvas.paste(rel, (640 - 65, 360 - 65), rel)
    
    np.random.seed(wave_num * 17)
    part = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_p = ImageDraw.Draw(part)
    for _ in range(70):
        px = int(np.random.normal(640, 160))
        py = int(np.random.normal(360, 100))
        if 0 <= px < 1280 and 0 <= py < 720:
            sz = np.random.randint(2, 5)
            pa = np.random.randint(120, 255)
            draw_p.ellipse([px, py, px+sz, py+sz], fill=cinfo['secondary_glow'] + (pa,))
    canvas = Image.alpha_composite(canvas, part)
    
    canvas = add_letterbox(canvas)
    canvas.convert("RGB").save(out_path, "JPEG", quality=95)

def render_panel_5_ascent(char_key, wave_num, bg_path, out_path):
    cinfo = CHARACTERS[char_key]
    canvas = Image.new("RGBA", (1280, 720), cinfo['ambient_tint'] + (255,))
    
    bg = Image.open(bg_path).convert("RGBA").resize((1280, 720), Image.Resampling.BILINEAR)
    canvas.paste(bg, (0, 0))
    
    cone = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_c = ImageDraw.Draw(cone)
    for w in range(120, 10, -10):
        alpha = int((1.0 - (w / 120)) * 75)
        draw_c.polygon([(920, 100), (1080, 100), (580 + w*2, 690), (360 - w*2, 690)], fill=cinfo['primary_glow'] + (alpha,))
    cone = cone.filter(ImageFilter.GaussianBlur(radius=15))
    canvas = Image.alpha_composite(canvas, cone)
    
    hero = Image.open(cinfo['hero_sprite']).convert("RGBA").resize((150, 150), Image.Resampling.NEAREST)
    
    shadow = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_s = ImageDraw.Draw(shadow)
    draw_s.ellipse([430, 590, 570, 625], fill=(5, 5, 8, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=6))
    canvas = Image.alpha_composite(canvas, shadow)
    
    canvas.paste(hero, (450, 460), hero)
    
    if os.path.exists(cinfo['sub_item']):
        sub = Image.open(cinfo['sub_item']).convert("RGBA").resize((32, 32), Image.Resampling.NEAREST)
        canvas.paste(sub, (430, 470), sub)
        canvas.paste(sub, (570, 480), sub)
        
    np.random.seed(wave_num * 23)
    part = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw_p = ImageDraw.Draw(part)
    for _ in range(65):
        px = np.random.randint(250, 1150)
        py = np.random.randint(120, 680)
        sz = np.random.randint(2, 4)
        pa = np.random.randint(100, 230)
        draw_p.ellipse([px, py, px+sz, py+sz], fill=cinfo['secondary_glow'] + (pa,))
    canvas = Image.alpha_composite(canvas, part)
    
    canvas = add_letterbox(canvas)
    canvas.convert("RGB").save(out_path, "JPEG", quality=95)

def process_all():
    print("=== Starting Production of Lexicon Survivors Comic Panels ===")
    total_generated = 0
    total_skipped = 0
    
    for char_key in sorted(CHARACTERS.keys()):
        char_dir = os.path.join(DESKTOP_ROOT, char_key)
        if not os.path.isdir(char_dir):
            continue
            
        print(f"\nProcessing Character: {char_key} ({CHARACTERS[char_key]['title']})")
        wave_dirs = sorted([d for d in os.listdir(char_dir) if d.startswith('Dalga_')])
        
        for w_dir_name in wave_dirs:
            full_w_dir = os.path.join(char_dir, w_dir_name)
            # extract wave number
            try:
                wave_num = int(w_dir_name.split('_')[1])
            except Exception:
                continue
                
            existing_panels = [f for f in os.listdir(full_w_dir) if f.startswith('panel_')]
            if len(existing_panels) >= 5:
                # Wave already has all 5 panels!
                total_skipped += len(existing_panels)
                continue
                
            bg_path = get_base_background(char_key, wave_num)
            
            p1_path = os.path.join(full_w_dir, 'panel_01_mekan_ve_atmosfer.jpg')
            p2_path = os.path.join(full_w_dir, 'panel_02_diyalog_ve_anlati.jpg')
            p3_path = os.path.join(full_w_dir, 'panel_03_boss_ve_mucadele.jpg')
            p4_path = os.path.join(full_w_dir, 'panel_04_yadigar_ve_kalinti.jpg')
            p5_path = os.path.join(full_w_dir, 'panel_05_esik_ve_ilerleyis.jpg')
            
            # Check individual panels to preserve existing ones
            if not any(f.startswith('panel_01_') for f in existing_panels):
                render_panel_1_establishing(char_key, wave_num, bg_path, p1_path)
                total_generated += 1
            else:
                total_skipped += 1
                
            if not any(f.startswith('panel_02_') for f in existing_panels):
                render_panel_2_dialogue(char_key, wave_num, bg_path, p2_path)
                total_generated += 1
            else:
                total_skipped += 1
                
            if not any(f.startswith('panel_03_') for f in existing_panels):
                render_panel_3_boss_trial(char_key, wave_num, bg_path, p3_path)
                total_generated += 1
            else:
                total_skipped += 1
                
            if not any(f.startswith('panel_04_') for f in existing_panels):
                render_panel_4_relic(char_key, wave_num, bg_path, p4_path)
                total_generated += 1
            else:
                total_skipped += 1
                
            if not any(f.startswith('panel_05_') for f in existing_panels):
                render_panel_5_ascent(char_key, wave_num, bg_path, p5_path)
                total_generated += 1
            else:
                total_skipped += 1
                
            print(f"  {w_dir_name} completed (5 panels in place).")
            
    print(f"\n==========================================")
    print(f"PRODUCTION COMPLETE!")
    print(f"Total newly generated panels: {total_generated}")
    print(f"Total preserved existing panels: {total_skipped}")
    print(f"Grand Total: {total_generated + total_skipped} panels")
    print(f"==========================================")

if __name__ == '__main__':
    process_all()
