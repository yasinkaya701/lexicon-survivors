#!/usr/bin/env python3
"""Build the complete Grimoire art request list.

Every image the game shows gets one entry: id, target path, size, frame
layout and a prompt. Run from the repository root:

    python3 tools/art/build_manifest.py

Writes docs/art-direction/asset-manifest.json and asset-manifest.md.
New art goes under assets/art/grimoire/; the game is wired to that tree
when the files land, and the older asset generations are then removed.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_JSON = ROOT / "docs/art-direction/asset-manifest.json"
OUT_MD = ROOT / "docs/art-direction/asset-manifest.md"
BASE = "assets/art/grimoire"

STYLE = "STYLE LOCK (docs/art-direction/README.md §2)"

# ----------------------------------------------------------------------------
# Subjects
# ----------------------------------------------------------------------------
HEROES = {
    "inky": ("Inky", "young adult archive scribe, slight build, wide-brimmed pointed hat in faded ink-navy with a tarnished brass band and a grey quill pinned to it, short navy capelet, ink-stained cuffs, satchel of rolled slips, wields a long quill like a rapier", "#2E3E66"),
    "quillmaster": ("Quillmaster", "lean duelist in his late twenties, short-brimmed hat with one dark feather, wine-red long coat with brass buttons, black gloves, thin quill-rapier with a steel nib point, scar through one eyebrow", "#7A2032"),
    "word_knight": ("Word Knight", "broad knight in dented blackened plate, visored helm with a short blood-red plume, tattered deep-teal cloak, heavy shield made from a dictionary cover with brass corners, broad blade", "#2F5E5E"),
    "rune_sorceress": ("Rune Sorceress", "adult woman mage, midnight-violet layered robes, hood with a crescent-shaped brim, cracked family seal on a chain, violet light painted as flat colour on her hands", "#5B3F7A"),
    "alchemist": ("Alchemist", "adult woman alchemist, moss-green hood and mantle, leather apron, belt of glass vials (one blood-red), brass lens on a strap over one eye, burn scars on her fingers", "#55652F"),
    "shadow_scribe": ("Shadow Scribe", "slim figure in a black hood and scarf covering the lower face, one pale cold-blue eye, dried-blood-red sash, narrow calligraphy katana with an ink-black blade, his shadow moves on its own", "#8E1F1A"),
}

HERO_ANIMS = [  # name, frames, fps, description
    ("idle", 4, 6, "breathing idle, weapon ready"),
    ("run", 8, 12, "full run cycle, cloak and hair trailing"),
    ("attack", 4, 14, "melee strike with the signature weapon, anticipation-impact-recovery"),
    ("ranged", 4, 12, "ranged cast or shot, recoil on frame 2"),
    ("dash", 4, 16, "evasive dash, body stretched, ink smear trailing"),
    ("hurt", 2, 10, "flinch from a hit, recoil away from the source"),
    ("death", 6, 10, "falls and is erased from the edges into blank white paper"),
    ("victory", 4, 6, "triumphant pose holding the weapon high"),
]

NPCS = {
    "neris": ("Neris", "archivist in her forties, dark wavy hair tied low with one silver forelock, green eyes, small ink mark on the left cheek, forest-green archivist coat with cream collar, antique brass key pendant; a few strokes of her outline fade to white paper"),
    "mira": ("Mira", "adult cartographer, short copper-brown curls, amber eyes, indigo scarf, ink-stained cuffs, small star-shaped pen charm"),
    "ada": ("Ada", "young adult letter-maker, auburn bob, red-brown work jacket, two-knot pale thread bracelet, alert posture"),
    "lale": ("Lale", "older woman, silver-lavender hair, violet mantle, weathered hands, cracked family seal"),
    "lio": ("Lio", "young man, unruly chestnut curls, freckles, faded sea-green lab coat, mismatched glove cuffs"),
    "shadow_double": ("Shadow Double", "exact build and hood of the Shadow Scribe with a wine-red rim instead of blue, his own posture"),
    "sera": ("Sera", "courier with a notched pair of scissors and an orange route satchel"),
    "mara": ("Mara", "former gate witness holding a repaired lantern of mismatched glass"),
    "yel": ("Yel", "map restorer with an inverted compass and two folded routes"),
    "tavi": ("Tavi", "former lab assistant with a cracked measuring cup and a distrustful look"),
    "lira": ("Lira", "stripped former guard with a short baton and worn slate-grey armour"),
    "ink_child": ("Ink Child", "young adult courier in a plain charcoal coat with a stitched note pouch"),
    "silent_mechanic": ("Silent Mechanic", "engineer with calipers and a signalling rod, never speaks, expressive hands"),
    "red_redactor": ("Red Redactor", "the former Red Inspector as an ally: torn crimson robes, red pen broken and re-forged into twin blades, half his face bandaged"),
    "blank_page": ("Blank Page", "tall faceless archivist of layered blank paper, bone-white with deep black negative space, a smooth folded page instead of a face, long paper sleeves ending in a single red editor's pen"),
}
EXPRESSIONS = ["neutral", "angry", "sad", "smile", "shock"]

ENEMIES = {
    "grammar_goblin": "hunched goblin wearing a torn book as armour, broken pen spear",
    "typo_slime": "a blot of living ink with misplaced letters drowning inside as dark shapes",
    "typo_splinter": "a jagged shard of a broken page skittering on paper legs",
    "spelling_spectre": "a pale hooded wisp of corrected ink",
    "punctuation_phantom": "a floating comma-shaped wraith",
    "palindrome_phantom": "a symmetrical ghost identical on both sides",
    "tautology_twin": "two small identical imps joined at the hand",
    "oxymoron_ogre": "a small ogre half bone-white and half black",
    "malapropism_mimic": "a book chest with a toothy mouth and wrong labels",
    "idiom_imp": "a grinning imp of living candle flame",
    "homophone_harpy": "a small two-voiced paper harpy",
    "double_negative_drake": "a small two-headed paper drake",
    "dangling_modifier": "a dangling puppet on loose threads",
    "vocabulary_void": "a small floating mouth sewn shut with thread",
    "run_on_reaper": "a lanky hooded reaper made of one endless scroll",
    "syntax_titan": "a hulking brute of stacked shelves",
}
ENEMY_ANIMS = [("move", 4, 8), ("attack", 4, 12), ("hurt", 2, 10), ("death", 6, 12)]

BOSSES = {  # id: (name, design, place, attack)
    "red_inspector": ("The Red Inspector", "gaunt magistrate in crimson robes stitched from crossed-out pages, face hidden by a tall red editor's cap, wields a giant red pen like a halberd", "Hall of Reversed Verdicts", "slams the pen to draw red lines across the floor"),
    "unfinished_giant": ("The Unfinished Giant", "colossus of stacked shelves and half-written sentences, chains of unfinished lines hanging from its arms, one side of its body missing", "Bridge of Suspended Sentences", "stomps causing quake rings"),
    "contradiction": ("Contradiction", "two-headed ogre whose heads argue, stitched together down the middle, one half bone-white and one half black", "Courtyard of Two Truths", "bursts in a ring of opposing shards"),
    "two_voiced_harpy": ("The Two-Voiced Harpy", "harpy whose two mouths whisper different names, paper feathers, quill talons", "Whispering Shaft", "fans of feathers in a cone"),
    "lexicon_dragon": ("The Lexicon Dragon", "serpentine dragon whose rings are bound book spines, lost words trapped inside its body as dark lines", "Dome of Lost Margins", "orbiting rings of pages"),
    "restless_reaper": ("The Restless Reaper", "hooded reaper made of one endless run-on scroll, scythe blade is a long ruler", "Corridor of Endless Stacks", "long dashing charges"),
    "borrowed_face": ("The Borrowed Face", "mimic wearing a gallery of mismatched portrait faces on its body like masks", "Gallery of Wrong Portraits", "mirrors the hero's attacks"),
    "wordless_mouth": ("The Wordless Mouth", "pit-creature that is mostly a vast mouth sewn shut with threads, names sinking into it", "Pit of the Nameless", "gravity pull towards its centre"),
    "final_stop": ("The Final Stop", "phantom in a theatre mask shaped like a full stop, cloak of closed curtains", "Theatre of Ended Sentences", "crossfire of black dots"),
    "double_negation": ("The Double Negation", "drake with two heads facing opposite directions, each devouring the other's tail", "Rift of Two Denials", "tears rifts in the floor"),
    "reversed_reflection": ("Reversed Reflection", "phantom that is its own mirror image on a staircase that returns to itself", "Returning Staircase", "projectiles that return"),
    "repeating_twin": ("The Repeating Twin", "identical twins moving in perfect echo, one slightly faded", "Room of Repetition", "echoed attacks a beat later"),
    "dangling_clause": ("Dangling Clause", "hanged figure of tangled conjunctions dangling from chains, limbs like loose ropes", "Hall of Unbound Conjunctions", "snares that tie the hero"),
    "pale_corrector": ("The Pale Corrector", "spectral scribe of bone-white ink who silently fixes letters, carries a scalpel-pen", "Court of the Single Letter", "shards of broken letters"),
    "literal_flame": ("The Literal Flame", "grinning imp of living candle flame juggling proverbs as fireballs", "Furnace of Idioms", "scattering embers"),
    "red_redactor": ("The Red Redactor", "the Red Inspector reborn as a rogue, robes torn, red pen re-forged into twin blades, half his face bandaged", "Archive of Severed Testimony", "severing slashes"),
    "twofold_truth": ("The Twofold Truth", "the Contradiction ogre split cleanly into two separate halves fighting side by side", "Two Halls Side by Side", "splits the arena"),
    "false_neris": ("The False Neris", "a perfect copy of Neris with a blank paper face and red ink tears", "Room of Copied Trust", "eclipse of darkness"),
    "unwritten": ("The Unwritten", "a blooming void flower of blank pages, a silent storm of white", "Hall Before Silence", "blooms of erasure"),
    "omega_blank_page": ("Omega, the Last Word", "Blank Page wearing the Lexicon Dragon's rings as a mantle, paper body crowned with every red pen of the archive", "Heart of the Counter-Catalogue", "three phases: paper body, dragon mantle, erasing the arena"),
}
BOSS_ANIMS = [("idle", 4, 6), ("move", 6, 10), ("attack", 6, 12), ("special", 6, 12), ("phase", 4, 8), ("death", 8, 10)]

WEAPONS = {
    "quill_blaster": ("İğne Ucu Kalem", "a needle-tipped steel pen pistol", "a needle of ink"),
    "syllable_shotgun": ("Hece Saçması", "a blunderbuss loaded with syllable pellets", "a spray of ink pellets"),
    "lexicon_beam": ("Prizma Işını", "a brass prism lantern-gun", "a flat bone-white beam"),
    "punctuation_bomb": ("Ünlem Mayını", "an exclamation-shaped iron mine", "an iron mine with a burning fuse"),
    "dictionary_blade": ("Sözlük Muhafızı", "a broad blade with a dictionary-cover guard", "a sweeping slash arc of ink"),
    "crossword_crossbow": ("Bulmaca Balistası", "a small crossbow with a crossword-grid stock", "a heavy bolt"),
    "hyphen_boomerang": ("Tire Yörüngesi", "a dash-shaped bronze boomerang", "a spinning dash"),
    "ink_flamethrower": ("Mürekkep Ocağı", "an ink brazier flamethrower", "a gout of black-red ink fire"),
    "thesaurus_rocket": ("Eşanlamlı Harcı", "a mortar with twin pestles", "a falling twin shell"),
    "quote_pistols": ("Tırnak Salvosu", "twin quotation-mark pistols", "paired quote-shaped bullets"),
    "calligraphy_katana": ("Kalem Hilali", "a crescent quill-blade katana", "a crescent slash"),
    "scroll_turret": ("Raf Bekçisi", "a tiny turret made from a bookshelf", "a page dart"),
    "rune_orb": ("Atıf Küresi", "a citation orb in a brass cage", "an orbiting citation orb"),
    "grammar_sniper": ("Zayıf Nokta Rayı", "a long sniper rail pen", "a thin piercing line"),
    "word_loom": ("Dipnot Tezgâhı", "a footnote loom", "a thread of footnotes"),
}
GADGETS = {
    "eraser_dash": ("Silgi Sıçrayışı", "a winged eraser", "a dash that leaves a scraped-white trail"),
    "ink_cataclysm": ("Son Nokta", "a black iron full-stop orb", "a full stop slamming down and erasing bullets in a ring"),
    "chrono_comma": ("Zaman Virgülü", "a comma-shaped hourglass", "a sepia time-slow dome"),
    "lexicon_aegis": ("Fihrist Kalkanı", "an index-tab shield", "three orbiting index tabs blocking hits"),
    "grammar_magnet": ("Arşiv Çekimi", "a magnet of bound pages", "ink drops spiralling to the hero"),
    "index_storm": ("Fiş Fırtınası", "a whirl of catalogue slips", "a storm of slips cutting nearby enemies"),
    "redact_field": ("Sansür Dalgası", "a black censor bar as a blade", "black bars sweeping across the screen"),
    "palimpsest_step": ("Palimpsest Adımı", "boots over a scraped page", "a step that leaves a ghost of the hero"),
}
RELICS = {
    "magnifying_glass": ("Kenar Düzeltisi Merceği", "a margin lens"),
    "golden_inkpot": ("Altın Mürekkep Kalbi", "a golden inkwell shaped like a heart"),
    "scholar_boots": ("Dipnot Çizmeleri", "footnote boots"),
    "grammar_guide": ("Kırmızı Çizgi El Kitabı", "a red-ruled handbook"),
    "quantum_eraser": ("Palimpsest Silgisi", "a worn eraser"),
    "diligence_coffee": ("Gece Hattatının Kahvesi", "a night calligrapher's coffee cup"),
    "slot_expansion": ("Arşiv Rafı", "a small shelf with an empty slot"),
    "marginalia_prism": ("İşaret Prizması", "a signal prism"),
    "mnemonic_thread": ("Hafıza İpliği", "a spool of memory thread"),
    "archivist_compass": ("Arşivcinin Pusulası", "an archivist's compass"),
}
INK_SHOP = {
    "field_medicinal_folio": ("Gezginin Sargısı", "a field bandage wrapped around a folio"),
    "waxed_edge": ("Mumlu Keskinlik", "a blade edge sealed with wax"),
    "silver_margin": ("Gümüş Kenar", "a silver-inlaid book corner"),
    "study_lamp_oil": ("Gece Çalışma Yağı", "a flask of study-lamp oil"),
    "magnifier_focus": ("Fihrist Merceği", "a magnifier on an index card"),
    "echo_hunters_ink": ("Yankı Avcısının Mürekkebi", "a vial of echo-hunter's ink"),
}
STAT_EMBLEMS = {
    "health": "a heart-shaped wax seal", "shield": "a small round shield", "speed": "a winged boot",
    "damage": "a crossed quill and blade", "crit": "a cracked eye", "pierce": "a nib piercing a page",
    "attack_speed": "an hourglass with a quill", "ink_range": "a magnet of ink drops", "armor": "a riveted plate",
    "luck": "a four-leaf bookmark",
}
WINGS = {
    "reading_hall": ("I · Reading Hall", "gothic reading hall: black-and-umber stone floor, worn rugs, torn catalogue slips, wax drips", "tall dark bookshelves, reading desks with candles, iron railings"),
    "word_corridor": ("II · Word Corridor", "cracked flagstones with rusted iron grates and pale moss in the seams", "arched niches with chained books, hanging lanterns, iron gates"),
    "observatory": ("III · Astral Observatory", "dark floor inlaid with brass star-map lines and moonlight pools", "brass orreries, telescopes, tall windows of cold moonlight"),
    "last_page": ("IV · Last Page", "stone being erased into blank white paper in crisp-edged patches", "shelves and walls half dissolved into white paper, floating torn pages"),
}
WING_PROPS = ["bookshelf", "reading_desk", "candelabra", "pillar", "rubble", "hanging_cage", "statue", "floor_decal"]
INTERACTABLES = {
    "ink_well": "a pedestal ink well that refills ink", "astral_astrolabe": "a brass astrolabe pedestal",
    "resonance_bell": "a hanging resonance bell on a wooden frame", "illuminated_lectern": "an illuminated lectern with an open book",
    "brazier": "an iron brazier with low flames", "memory_clue": "a glowing torn page pinned to a shelf (story clue)",
}

STORY_PANELS = [
    ("open_1", "the Library at midnight, a red line being drawn across the catalogue"),
    ("open_2", "names on shelves fading to white paper"),
    ("open_3", "Neris's faint outline in the margin holding a candle out to the hero"),
] + [(f"wing_{w}_{i}", f"{WINGS[w][0]}: {beat}") for w, beats in {
    "reading_hall": ["the doors opening on red-lined desks", "the first erased name on a shelf"],
    "word_corridor": ["chained books whispering behind iron gates", "a lantern swinging over a broken bridge"],
    "observatory": ["orreries frozen mid-turn under moonlight", "the star map going blank"],
    "last_page": ["the world erased to white at the edges", "the hero stepping onto blank paper"],
}.items() for i, beat in enumerate(beats, 1)] + [
    (f"boss_{b}", f"{BOSSES[b][0]} towering over the hero in the {BOSSES[b][2]}") for b in BOSSES
] + [
    ("win_1", "dawn light, Blank Page falling"), ("win_2", "the erasure begins again"),
    ("win_3", "Neris reading the first correction rule in her own handwriting"), ("win_4", "Neris turning away"),
    ("win_5", "the hero catching her sleeve"), ("win_6", "the hub's walls half white"),
] + [(f"{h}_relic_{i}", f"{HEROES[h][0]}: {beat}") for h, beats in {
    "inky": ["the star dot on a forged slip", "the true map", "an open door"],
    "quillmaster": ["the two-tap signal on a wall", "Ada's real address", "an unsealed letter left on a desk"],
    "word_knight": ["the erased crest", "the duplicate order", "the shared watch schedule"],
    "rune_sorceress": ["the ash seal", "two memories that do not match", "one light shared with Lale's echo"],
    "alchemist": ["the numbered record", "the crooked label", "the released bottle"],
    "shadow_scribe": ["the borrowed signature", "the shadow taking its own pose", "a book with two signatures"],
}.items() for i, beat in enumerate(beats, 1)] + [
    (f"{h}_final_{i}", f"{HEROES[h][0]} personal ending, {'the choice' if i == 1 else 'the aftermath'}") for h in HEROES for i in (1, 2)
] + [
    ("end_1", "the counter-catalogue: many hands writing in one open book"), ("end_2", "Neris writing her own name"),
    ("end_3", "Blank Page offered a pen and the page of objections"), ("end_4", "the outer door of the library open at dawn"),
    ("end_5", "the hub fully restored with all witnesses"), ("end_6", "a page of many different handwritings as abstract lines"),
]

SCREENS = {
    "title_bg": ("Title · background layer", 2560, 1440, "cinematic far background of the Library of Lost Margins at midnight: forty-metre gothic shelves, iron galleries, a great rose window of cold moonlight; Blank Page far away on a balcony, a wave of white erasure spreading behind it; left third dark and empty"),
    "title_mid": ("Title · midground layer (transparent)", 2560, 1440, "midground layer on transparency: iron gallery railings and hanging chains crossing the frame"),
    "title_fg": ("Title · foreground layer (transparent)", 2560, 1440, "foreground layer on transparency: out-of-focus shelf edge and a guttering candle at the lower right corner"),
    "title_hero": ("Title · hero layer (transparent)", 1400, 1440, "Inky small in the lower centre, lit by one candle, looking up at the erasure"),
    "character_select": ("Character select backdrop", 2560, 1440, "the archive's muster hall: six empty niches with candles, banners, quiet anticipation; centre dark for cards"),
    "preparation": ("Preparation backdrop", 2560, 1440, "a registrar's desk with an open ledger, quills and a lamp; right and left halves calm for two panels"),
    "scriptorium": ("Scriptorium (shop) backdrop", 2560, 1440, "an abandoned scriptorium between waves: long desks, guttering candles, chained books, a brass card-catalogue cabinet; centre calm for cards"),
    "quiz_altar": ("Quiz backdrop", 2560, 1440, "a single lectern on a dark altar under one shaft of candlelight, everything else black"),
    "codex": ("Word codex backdrop", 2560, 1440, "an enormous open dictionary on a reading table, pages blank lines"),
    "bestiary": ("Bestiary backdrop", 2560, 1440, "a hall of specimen cases holding paper monsters"),
    "settings": ("Settings backdrop", 2560, 1440, "a clockwork escritoire with brass dials"),
    "guide": ("Guide backdrop", 2560, 1440, "a map of the four wings pinned to a wall with string"),
    "leaderboard": ("Leaderboard backdrop", 2560, 1440, "a hall of honour with engraved plaques and candles"),
    "pause": ("Pause backdrop", 2560, 1440, "a red banner hanging in a dark archive"),
    "story_bg": ("Story intermission backdrop", 2560, 1440, "a reading nook with a single candle, very dark, for a framed plate"),
    "victory": ("Victory", 2560, 1440, "dawn light through the rose window, the hero standing among restored shelves"),
    "defeat": ("Defeat", 2560, 1440, "a desk being erased into pure white from the right edge, the hero's quill half blank"),
    "loading": ("Loading splash", 1920, 1080, "a single candle and an open book in darkness"),
    "hub": ("Hub · burned reading room", 2560, 1440, "the burned reading room that is home between runs: hearth, long table, seven NPC posts, a door to the archive"),
    "hub_erased_50": ("Hub · half erased", 2560, 1440, "the same hub with half the walls erased into white paper"),
    "hub_restored": ("Hub · restored", 2560, 1440, "the same hub fully restored and lit"),
}
for w, (name, _, _) in WINGS.items():
    SCREENS[f"chapter_{w}"] = (f"Chapter splash · {name}", 2560, 1440, f"establishing shot of the {name} wing")

MATERIALS = {
    "leather_tile": ("Tooled leather (seamless)", 1024, 1024, "seamless dark tooled leather book-binding texture, subtle blind-tooled lines"),
    "page_tile": ("Dark page (seamless)", 1024, 1024, "seamless aged dark paper texture with faint foxing"),
    "banner_cloth": ("Banner cloth (seamless)", 1024, 1024, "seamless heavy blood-red velvet banner cloth"),
    "brass_corner": ("Brass corner protector", 512, 512, "single brass book-corner protector with filigree and a rivet, top-left orientation, transparent"),
    "medallion_ring": ("Medallion ring", 1024, 1024, "ornate brass ring frame for a round portrait, transparent centre"),
    "wax_seal": ("Wax seal (blank)", 512, 512, "blank blood-red wax seal, transparent background"),
    "ribbon": ("Bookmark ribbon", 256, 1024, "a red silk bookmark ribbon with a V-notched end, transparent"),
    "divider": ("Divider ornament", 2048, 128, "a tooled brass divider ornament with a central lozenge, transparent"),
    "plate": ("Iron plate", 1024, 256, "a chamfered dark iron plate with brass rim, transparent"),
    "logotype": ("Logotype art", 2400, 1200, "hand-lettered blackletter logotype artwork 'Lexicon Survivors' with a red brush stroke through the o and 'The Last Errata' beneath, transparent (the only image allowed to contain text)"),
}
MARKETING = {
    "steam_header": (920, 430), "steam_small": (462, 174), "steam_main": (1232, 706), "steam_vertical": (748, 896),
    "steam_library_capsule": (600, 900), "steam_library_hero": (3840, 1240), "steam_library_logo": (1280, 720),
    "steam_page_bg": (1438, 810),
}
EFFECTS = {
    "hit": (6, "ink splash hit spark"), "crit_hit": (8, "large ink burst with a red ring"),
    "enemy_death": (8, "enemy dissolving into ink droplets and rising paper flakes"),
    "hero_hurt": (4, "red ink spatter from the hero"), "heal": (8, "warm brass motes rising in a spiral"),
    "level_up": (10, "brass ring expanding with a quill sigil"), "pickup_ink": (6, "ink drop absorbed with a ripple"),
    "pickup_health": (6, "red vial shattering into warm light"), "elite_spawn": (8, "red sigil opening on the floor"),
    "boss_spawn": (12, "huge red correction circle drawn on the floor"), "boss_phase": (10, "shockwave of torn pages"),
    "erase_wipe": (10, "Blank Page white erasure sweeping across"), "wave_sigil": (10, "brass floor sigil igniting at wave start"),
    "muzzle_flash": (4, "ink muzzle burst"), "dash_trail": (6, "scraped-white streak"),
}
TELEGRAPHS = {"line": "a red pen line across the floor", "circle": "a red correction circle", "cone": "a red cone of crossed-out marks", "ring": "a red ring with a gap"}
ENEMY_PROJECTILES = {"orb": "a dark red orb", "shard": "a sharp letter shard", "feather": "a paper feather", "ember": "a candle ember", "blot": "an ink blot", "dot": "a black full stop"}
PICKUPS = {"ink_small": "a small ink drop", "ink_large": "a large ink drop", "health": "a red healing vial", "page_fragment": "a torn page fragment (rare)", "relic_chest": "a small iron-bound chest"}
LEVEL_SEALS = ["A1", "A2", "B1", "B2", "C1", "C2"]
DIFFICULTY_SEALS = {"rahat": "a calm candle", "dengeli": "a balanced scale", "cetin": "a cracked skull"}


def skill_nodes():
    data = json.loads((ROOT / "assets/data/character_skill_trees.json").read_text(encoding="utf-8"))
    for hero, cv in data["characters"].items():
        for branch in cv["branches"]:
            yield hero, branch, None
            for node in branch.get("nodes", []):
                yield hero, branch, node


# ----------------------------------------------------------------------------
# Manifest
# ----------------------------------------------------------------------------
entries = []


def add(group, id_, path, w, h, prompt, *, frames=1, fps=None, transparent=False, ref=None, priority=3, note=None):
    entries.append({
        "group": group, "id": id_, "path": f"{BASE}/{path}", "size": [w, h],
        "frames": frames, "fps": fps, "layout": "horizontal strip, equal cells, no gutters" if frames > 1 else "single image",
        "cell": [w // frames, h] if frames > 1 else [w, h], "transparent": transparent,
        "reference": ref, "priority": priority, "prompt": prompt, "note": note,
    })


# 1 references
for k, (name, desc, colour) in HEROES.items():
    add("01 Referanslar", f"ref_{k}", f"ref/{k}.png", 2048, 1280, f"Character model sheet of {name}: {desc}. Front, three-quarter and back full figure, three expressions, close-up of the signature item. Signature colour {colour}. Flat umber background.", priority=1)
for k, (name, desc) in NPCS.items():
    add("01 Referanslar", f"ref_{k}", f"ref/{k}.png", 2048, 1280, f"Character model sheet of {name}: {desc}. Front, three-quarter and back full figure, three expressions. Flat umber background.", priority=1 if k in ("neris", "blank_page") else 2)

# 2 heroes
for k, (name, desc, _) in HEROES.items():
    add("02 Kahramanlar", f"hero_{k}_portrait", f"heroes/{k}/portrait.png", 1200, 1600, f"Half-length portrait of {name} ({desc}) in a candlelit archive aisle, facing left, lower third kept dark for UI text.", ref=f"ref_{k}", priority=1)
    add("02 Kahramanlar", f"hero_{k}_medallion", f"heroes/{k}/medallion.png", 512, 512, f"Head-and-shoulders bust of {name} centred for a circular frame, face fills the middle 70%, dark background.", ref=f"ref_{k}", priority=1)
    for e in EXPRESSIONS:
        add("02 Kahramanlar", f"hero_{k}_face_{e}", f"heroes/{k}/face_{e}.png", 1024, 1024, f"Bust of {name}, expression: {e}, three-quarter view facing right.", transparent=True, ref=f"ref_{k}", priority=2)
    for anim, n, fps, d in HERO_ANIMS:
        add("03 Savaş animasyonları · kahraman", f"hero_{k}_{anim}", f"heroes/{k}/{anim}.png", 256 * n, 256, f"In-game sprite sheet of {name}, top-down three-quarter view facing right, {d}. {n} frames in one horizontal strip, 256×256 cells, identical scale and ground line in every cell, feet at 85% height, bold silhouette readable at 96 px.", frames=n, fps=fps, transparent=True, ref=f"ref_{k}", priority=1)
    add("02 Kahramanlar", f"hero_{k}_defeat", f"heroes/{k}/defeat.png", 1600, 1200, f"{name} fallen on the archive floor as white erasure creeps in from the right edge.", ref=f"ref_{k}", priority=2)

# 4 npcs
for k, (name, desc) in NPCS.items():
    for e in EXPRESSIONS:
        add("04 NPC'ler", f"npc_{k}_face_{e}", f"npcs/{k}/face_{e}.png", 1024, 1024, f"Bust of {name} ({desc}), expression: {e}, three-quarter view facing left.", transparent=True, ref=f"ref_{k}", priority=2)
    add("04 NPC'ler", f"npc_{k}_hub_idle", f"npcs/{k}/hub_idle.png", 384 * 4, 384, f"Full-figure hub idle loop of {name} ({desc}), 4 frames, subtle breathing and one gesture.", frames=4, fps=5, transparent=True, ref=f"ref_{k}", priority=3)

# 5 enemies
for k, desc in ENEMIES.items():
    for anim, n, fps in ENEMY_ANIMS:
        add("05 Düşmanlar", f"enemy_{k}_{anim}", f"enemies/{k}/{anim}.png", 256 * n, 256, f"In-game enemy sprite sheet: {desc}. Animation: {anim}. Top-down three-quarter view facing left, {n} frames in a horizontal strip of 256×256 cells, same scale and ground line every cell, bold silhouette.", frames=n, fps=fps, transparent=True, priority=1)
    add("05 Düşmanlar", f"enemy_{k}_medallion", f"enemies/{k}/medallion.png", 512, 512, f"Bestiary medallion portrait of {desc}, centred for a round frame.", priority=2)

# 6 bosses
for k, (name, design, place, attack) in BOSSES.items():
    add("06 Boss'lar", f"boss_{k}_card", f"bosses/{k}/card.png", 1200, 1600, f"Full-figure boss illustration of {name}: {design}. Setting: {place}. Pose communicates: {attack}.", priority=1)
    add("06 Boss'lar", f"boss_{k}_portrait", f"bosses/{k}/portrait.png", 512, 512, f"Head portrait of {name} for a round HUD frame.", priority=2)
    add("06 Boss'lar", f"boss_{k}_title", f"bosses/{k}/title_card.png", 2560, 1080, f"Wide dramatic title-card shot of {name} looming out of darkness, right half empty for the name.", priority=2)
    for anim, n, fps in BOSS_ANIMS:
        add("07 Savaş animasyonları · boss", f"boss_{k}_{anim}", f"bosses/{k}/{anim}.png", 512 * n, 512, f"In-game boss sprite sheet of {name} ({design}). Animation: {anim}{' — ' + attack if anim in ('attack', 'special') else ''}. Top-down three-quarter view, {n} frames in a horizontal strip of 512×512 cells, same scale every cell.", frames=n, fps=fps, transparent=True, priority=1)

# 8 weapons, projectiles, effects
for k, (tr, obj, proj) in WEAPONS.items():
    add("08 Silahlar", f"weapon_{k}_icon", f"weapons/{k}/icon.png", 512, 512, f"Item icon for '{tr}': {obj}, centred, fills 70% of a circle.", transparent=True, priority=1)
    add("08 Silahlar", f"weapon_{k}_held", f"weapons/{k}/held.png", 512, 256, f"In-hand sprite of {obj}, side view pointing right, grip at lower left, muzzle or tip at right edge, top-down three-quarter lighting.", transparent=True, priority=1, note="Tutuş ve namlu noktaları weapon_visuals.json'da yeniden ölçülecek.")
    add("08 Silahlar", f"weapon_{k}_projectile", f"weapons/{k}/projectile.png", 128 * 4, 128, f"Projectile loop for '{tr}': {proj}, travelling right, 4 frames.", frames=4, fps=16, transparent=True, priority=1)
    add("08 Silahlar", f"weapon_{k}_impact", f"weapons/{k}/impact.png", 128 * 6, 128, f"Impact burst for '{tr}' ({proj}) hitting a target, 6 frames.", frames=6, fps=18, transparent=True, priority=2)
for k, desc in ENEMY_PROJECTILES.items():
    add("09 Efektler", f"enemy_projectile_{k}", f"effects/enemy_projectile_{k}.png", 128 * 4, 128, f"Enemy projectile loop: {desc}, 4 frames.", frames=4, fps=14, transparent=True, priority=2)
for k, (n, desc) in EFFECTS.items():
    add("09 Efektler", f"fx_{k}", f"effects/{k}.png", 256 * n, 256, f"Effect animation: {desc}, {n} frames, centred, additive-friendly dark edges.", frames=n, fps=18, transparent=True, priority=1 if k in ("hit", "crit_hit", "enemy_death") else 2)
for k, desc in TELEGRAPHS.items():
    add("09 Efektler", f"telegraph_{k}", f"effects/telegraph_{k}.png", 1024, 1024, f"Top-down boss attack telegraph decal: {desc}, hand-drawn red ink, transparent.", transparent=True, priority=2)
add("09 Efektler", "elite_crown", "effects/elite_crown.png", 256, 256, "A small tarnished brass crown with a red gem worn above elite enemies.", transparent=True, priority=2)
add("09 Efektler", "threat_seal", "effects/threat_seal.png", 256, 256, "A red warning seal that appears above enemies about to attack.", transparent=True, priority=2)

# 10 gadgets, relics, shop, skills, emblems
for k, (tr, obj, fx) in GADGETS.items():
    add("10 Gereçler", f"gadget_{k}_icon", f"gadgets/{k}/icon.png", 512, 512, f"Item icon for '{tr}': {obj}, centred.", transparent=True, priority=1)
    add("10 Gereçler", f"gadget_{k}_fx", f"gadgets/{k}/fx.png", 384 * 8, 384, f"Gadget activation effect for '{tr}': {fx}, 8 frames.", frames=8, fps=16, transparent=True, priority=2)
for k, (tr, obj) in RELICS.items():
    add("11 Yadigârlar", f"relic_{k}", f"relics/{k}.png", 512, 512, f"Item icon for '{tr}': {obj}, centred.", transparent=True, priority=2)
for k, (tr, obj) in INK_SHOP.items():
    add("11 Yadigârlar", f"inkshop_{k}", f"inkshop/{k}.png", 512, 512, f"Item icon for '{tr}': {obj}, centred.", transparent=True, priority=3)
for hero, branch, node in skill_nodes():
    if node is None:
        add("12 Yetenek ağacı", f"skill_{hero}_{branch['id']}", f"skills/{hero}/{branch['id']}.png", 512, 512, f"Emblem for the skill branch '{branch['name_tr']}' of {hero}: {branch.get('description_tr', '')}", transparent=True, priority=3)
    else:
        nid = node.get("id") or node.get("name_tr")
        add("12 Yetenek ağacı", f"skill_{hero}_{nid}", f"skills/{hero}/{nid}.png", 256, 256, f"Small skill icon '{node.get('name_tr', nid)}': {node.get('description_tr', '')}", transparent=True, priority=3)
for k, obj in STAT_EMBLEMS.items():
    add("12 Yetenek ağacı", f"emblem_{k}", f"emblems/{k}.png", 256, 256, f"Stat emblem for word cards: {obj}.", transparent=True, priority=2)
for lv in LEVEL_SEALS:
    add("13 Arayüz", f"seal_level_{lv}", f"ui/seal_{lv}.png", 256, 256, f"Wax seal for English level {lv}: a blank blood-red seal with a distinct pressed sigil (no letters).", transparent=True, priority=3, note="Seviye harfi kodla üstüne yazılır.")
for k, obj in DIFFICULTY_SEALS.items():
    add("13 Arayüz", f"seal_difficulty_{k}", f"ui/difficulty_{k}.png", 256, 256, f"Difficulty seal: {obj}.", transparent=True, priority=3)

# 14 world
for w, (name, floor, frame) in WINGS.items():
    for v in "abc":
        add("14 Arena", f"arena_{w}_floor_{v}", f"arena/{w}/floor_{v}.png", 1024, 1024, f"Seamless top-down floor tile, variant {v}: {floor}. Low contrast so characters read on top.", priority=1)
    add("14 Arena", f"arena_{w}_frame", f"arena/{w}/frame.png", 3200, 2400, f"Top-down arena border for {name}: {frame}; centre 2400×1800 left empty and dark.", priority=1)
    for p in WING_PROPS:
        add("14 Arena", f"arena_{w}_{p}", f"arena/{w}/props/{p}.png", 512, 512, f"Top-down arena prop for {name}: {p.replace('_', ' ')}.", transparent=True, priority=2)
    add("14 Arena", f"arena_{w}_light", f"arena/{w}/light_overlay.png", 1600, 1200, f"Soft light and shadow overlay for {name} (candle pools or moonlight), transparent.", transparent=True, priority=3)
for k, obj in INTERACTABLES.items():
    add("14 Arena", f"interact_{k}", f"arena/interactables/{k}.png", 512 * 4, 512, f"Arena interactable: {obj}, 4-frame idle loop.", frames=4, fps=6, transparent=True, priority=2)
for k, obj in PICKUPS.items():
    add("14 Arena", f"pickup_{k}", f"pickups/{k}.png", 256 * 4, 256, f"Pickup: {obj}, 4-frame bob loop.", frames=4, fps=8, transparent=True, priority=1)

# 15 screens and story
for k, (name, w, h, desc) in SCREENS.items():
    add("15 Ekranlar", f"screen_{k}", f"screens/{k}.png", w, h, desc, transparent=("transparent" in name), priority=1 if k.startswith("title") else 2)
for k, beat in STORY_PANELS:
    add("16 Hikâye panelleri", f"story_{k}", f"story/{k}.png", 1600, 900, f"Cinematic story panel: {beat}. Wide shot, single strong light source.", priority=2)

# 17 materials and marketing
for k, (name, w, h, desc) in MATERIALS.items():
    add("17 Malzemeler", f"mat_{k}", f"materials/{k}.png", w, h, desc, transparent=k not in ("leather_tile", "page_tile", "banner_cloth"), priority=3)
for k, (w, h) in MARKETING.items():
    add("18 Pazarlama", f"mk_{k}", f"marketing/{k}.png", w, h, f"Steam store art ({k.replace('_', ' ')}): Inky with the quill raised in the foreground, Blank Page looming behind erasing the library into white; leave room for the logo.", priority=3)

# ----------------------------------------------------------------------------
OUT_JSON.write_text(json.dumps({"base": BASE, "style": STYLE, "count": len(entries), "entries": entries}, ensure_ascii=False, indent=1), encoding="utf-8")

groups = {}
for e in entries:
    groups.setdefault(e["group"], []).append(e)
lines = [
    "# Asset manifest (tam liste)",
    "",
    f"Oyundaki **her görsel** için bir istek: toplam **{len(entries)}** dosya. Bu dosya `tools/art/build_manifest.py` ile üretilir; elle düzenlenmez. Makine okuyabilen hali: `asset-manifest.json`.",
    "",
    "**Kurallar:**",
    "- Her prompt'un sonuna `README.md` § 2'deki **STYLE LOCK** eklenir. `Referans` sütunu doluysa o ID'nin onaylı görseli GPT'ye verilir.",
    "- Animasyonlar tek PNG'de **yatay şerit**: hücreler eşit, aralarında boşluk yok, her hücrede aynı ölçek ve aynı zemin çizgisi. GPT bir şeridi tutarlı çıkaramazsa kareler tek tek üretilip aynı ölçekte birleştirilir.",
    "- `T` işaretli dosyalar şeffaf PNG'dir.",
    "- Öncelik: **1** önce (oyunun görünüşünü en çok değiştirenler), **3** en son.",
    "",
    "| Grup | Adet | Öncelik 1 |",
    "|---|---|---|",
]
for g, es in groups.items():
    lines.append(f"| {g} | {len(es)} | {sum(1 for e in es if e['priority'] == 1)} |")
for g, es in groups.items():
    lines += ["", f"## {g}", "", "| ID | Dosya | Boyut | Kare | T | Ö | Referans | Prompt |", "|---|---|---|---|---|---|---|---|"]
    for e in es:
        size = f"{e['size'][0]}×{e['size'][1]}"
        frames = f"{e['frames']} @ {e['fps']}fps" if e["frames"] > 1 else "—"
        prompt = e["prompt"].replace("|", "/") + (f" *({e['note']})*" if e.get("note") else "")
        lines.append(f"| `{e['id']}` | `{e['path']}` | {size} | {frames} | {'T' if e['transparent'] else ''} | {e['priority']} | {e['reference'] or ''} | {prompt} |")
OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"{len(entries)} entries → {OUT_JSON.relative_to(ROOT)}, {OUT_MD.relative_to(ROOT)}")
for g, es in groups.items():
    print(f"  {g}: {len(es)}")
